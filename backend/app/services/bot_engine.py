import logging
from datetime import datetime
from typing import Optional
from ..models.database import get_db
from .nse_fetcher import nse
from .buy_score_service import compute_buy_score
from .screener_service import get_screener_company_info
from .news_service import get_stock_news
from ..lib.signal import compute_buy_signal

logger = logging.getLogger(__name__)

MAX_INVESTMENT_PER_STOCK = 200000  # Rs 2 lakh per stock
MAX_OPEN_POSITIONS = 5
SELL_TARGET_MIN = 0.05  # 5%
SELL_TARGET_MAX = 0.07  # 7%
TRAILING_DROP = 0.02  # Sell if drops 2% from peak after hitting 5%


async def init_bot_wallet():
    db = get_db()
    wallet = await db.bot_wallet.find_one()
    if not wallet:
        await db.bot_wallet.insert_one({
            "initial_balance": 1000000.0,
            "cash_balance": 1000000.0,
        })
        logger.info("Bot wallet created with Rs 10,00,000")


async def _log(action: str, symbol: str = "", details: str = ""):
    db = get_db()
    await db.bot_logs.insert_one({
        "timestamp": datetime.utcnow(),
        "action": action,
        "symbol": symbol,
        "details": details,
    })


async def bot_scan_and_buy() -> dict:
    """Scan top gainers, buy Strong Buy signals."""
    db = get_db()
    wallet = await db.bot_wallet.find_one()
    if not wallet:
        return {"error": "Bot wallet not found"}

    # Check open positions count
    open_positions = await db.bot_positions.count_documents({"quantity": {"$gt": 0}})
    if open_positions >= MAX_OPEN_POSITIONS:
        await _log("SKIP_SCAN", details=f"Already {open_positions} open positions (max {MAX_OPEN_POSITIONS})")
        return {"message": f"Already at max {MAX_OPEN_POSITIONS} positions", "bought": []}

    # Get top gainers
    gainers = await nse.get_gainers()
    if not gainers:
        stocks, _ = await nse.get_nifty50_stocks()
        gainers = sorted(stocks, key=lambda x: x["percent_change"], reverse=True)[:15]
    else:
        gainers = gainers[:15]

    await _log("SCAN", details=f"Scanning {len(gainers)} top gainers")

    bought = []
    for stock in gainers:
        if open_positions >= MAX_OPEN_POSITIONS:
            break
        if wallet["cash_balance"] < MAX_INVESTMENT_PER_STOCK:
            await _log("SKIP_BUY", stock["symbol"], "Insufficient cash")
            break

        symbol = stock["symbol"]

        # Skip if already holding
        existing = await db.bot_positions.find_one({"symbol": symbol, "quantity": {"$gt": 0}})
        if existing:
            continue

        # Compute signal
        signal = compute_buy_signal(stock, gainers)
        if signal["signal"] != "GREEN" or signal["label"] not in ("Strong Buy", "Buy"):
            await _log("SKIP_BUY", symbol, f"Signal: {signal['label']} ({signal['signal']})")
            continue

        # Get AI score for confirmation
        fundamentals = await get_screener_company_info(symbol)
        if not fundamentals:
            fundamentals = {"company_name": stock.get("company_name", symbol)}
        news = get_stock_news(symbol, max_items=5)
        ai_result = await compute_buy_score(symbol, fundamentals, news, stock)

        ai_score = ai_result.get("score", 0) if ai_result else 0
        if ai_score < 65:
            await _log("SKIP_BUY", symbol, f"AI score too low: {ai_score}")
            continue

        # Buy!
        ltp = stock["ltp"]
        quantity = int(MAX_INVESTMENT_PER_STOCK / ltp)
        if quantity < 1:
            continue

        total_cost = ltp * quantity

        # Execute buy
        await db.bot_wallet.update_one(
            {"_id": wallet["_id"]},
            {"$inc": {"cash_balance": -total_cost}},
        )
        wallet["cash_balance"] -= total_cost

        await db.bot_positions.insert_one({
            "symbol": symbol,
            "company_name": stock.get("company_name", ""),
            "quantity": quantity,
            "buy_price": ltp,
            "buy_date": datetime.utcnow(),
            "target_min": round(ltp * (1 + SELL_TARGET_MIN), 2),
            "target_max": round(ltp * (1 + SELL_TARGET_MAX), 2),
            "peak_price": ltp,
            "trailing_active": False,
            "ai_score": ai_score,
            "signal": signal["label"],
            "signal_reasons": signal["reasons"],
        })

        await db.bot_orders.insert_one({
            "symbol": symbol,
            "company_name": stock.get("company_name", ""),
            "side": "BUY",
            "quantity": quantity,
            "price": ltp,
            "total": round(total_cost, 2),
            "ai_score": ai_score,
            "signal": signal["label"],
            "reason": f"Strong signal + AI score {ai_score}",
            "timestamp": datetime.utcnow(),
        })

        await _log("BUY", symbol, f"Qty: {quantity}, Price: {ltp}, AI: {ai_score}, Signal: {signal['label']}")
        bought.append({"symbol": symbol, "quantity": quantity, "price": ltp, "ai_score": ai_score})
        open_positions += 1

    return {"message": f"Bot bought {len(bought)} stocks", "bought": bought}


async def bot_check_sell_targets() -> dict:
    """Check all bot positions and sell if targets hit."""
    db = get_db()
    positions = await db.bot_positions.find({"quantity": {"$gt": 0}}).to_list(length=50)

    sold = []
    for pos in positions:
        symbol = pos["symbol"]
        quote = await nse.get_quote(symbol)
        if not quote:
            continue

        current_price = quote["ltp"]
        buy_price = pos["buy_price"]
        peak_price = pos.get("peak_price", buy_price)
        trailing_active = pos.get("trailing_active", False)

        pct_from_buy = (current_price - buy_price) / buy_price

        # Update peak price
        if current_price > peak_price:
            peak_price = current_price
            await db.bot_positions.update_one(
                {"_id": pos["_id"]},
                {"$set": {"peak_price": peak_price}},
            )

        should_sell = False
        sell_reason = ""

        # Hit max target (7%) — sell immediately
        if pct_from_buy >= SELL_TARGET_MAX:
            should_sell = True
            sell_reason = f"Hit max target {SELL_TARGET_MAX*100}%: +{pct_from_buy*100:.1f}%"

        # In trailing mode: sell if dropped 2% from peak
        elif trailing_active:
            drop_from_peak = (peak_price - current_price) / peak_price
            if drop_from_peak >= TRAILING_DROP or pct_from_buy < SELL_TARGET_MIN:
                should_sell = True
                sell_reason = f"Trailing stop: dropped {drop_from_peak*100:.1f}% from peak Rs {peak_price:.2f}"

        # Hit min target (5%) — activate trailing
        elif pct_from_buy >= SELL_TARGET_MIN:
            await db.bot_positions.update_one(
                {"_id": pos["_id"]},
                {"$set": {"trailing_active": True, "peak_price": current_price}},
            )
            await _log("TRAILING", symbol, f"Trailing activated at +{pct_from_buy*100:.1f}%")

        if should_sell:
            quantity = pos["quantity"]
            total_value = current_price * quantity
            profit = (current_price - buy_price) * quantity
            profit_pct = pct_from_buy * 100

            # Execute sell
            wallet = await db.bot_wallet.find_one()
            if not wallet:
                continue
            await db.bot_wallet.update_one(
                {"_id": wallet["_id"]},
                {"$inc": {"cash_balance": total_value}},
            )

            await db.bot_positions.update_one(
                {"_id": pos["_id"]},
                {"$set": {
                    "quantity": 0,
                    "sell_price": current_price,
                    "sell_date": datetime.utcnow(),
                    "profit": round(profit, 2),
                    "profit_pct": round(profit_pct, 2),
                }},
            )

            await db.bot_orders.insert_one({
                "symbol": symbol,
                "company_name": pos.get("company_name", ""),
                "side": "SELL",
                "quantity": quantity,
                "price": current_price,
                "total": round(total_value, 2),
                "profit": round(profit, 2),
                "profit_pct": round(profit_pct, 2),
                "reason": sell_reason,
                "timestamp": datetime.utcnow(),
            })

            await _log("SELL", symbol, f"Qty: {quantity}, Price: {current_price}, Profit: Rs {profit:.0f} ({profit_pct:.1f}%)")
            sold.append({"symbol": symbol, "profit": round(profit, 2), "profit_pct": round(profit_pct, 2)})

    return {"message": f"Bot sold {len(sold)} stocks", "sold": sold}


async def bot_get_stats() -> dict:
    """Get bot performance stats."""
    db = get_db()
    wallet = await db.bot_wallet.find_one()

    # All completed trades (sold positions)
    completed = await db.bot_positions.find({"quantity": 0, "profit": {"$exists": True}}).to_list(length=500)
    total_trades = len(completed)
    wins = sum(1 for t in completed if t.get("profit", 0) > 0)
    total_profit = sum(t.get("profit", 0) for t in completed)
    win_rate = round(wins / total_trades * 100, 1) if total_trades > 0 else 0

    # Open positions - fetch live prices for unrealized P&L
    open_pos = await db.bot_positions.find({"quantity": {"$gt": 0}}).to_list(length=50)
    invested = 0.0
    current_value = 0.0
    unrealized_pnl = 0.0

    for p in open_pos:
        cost = p["buy_price"] * p["quantity"]
        invested += cost
        quote = await nse.get_quote(p["symbol"])
        if quote:
            live_val = quote["ltp"] * p["quantity"]
            current_value += live_val
            unrealized_pnl += (live_val - cost)
        else:
            current_value += cost  # fallback to cost if no quote

    cash = wallet["cash_balance"] if wallet else 0

    return {
        "cash_balance": round(cash, 2),
        "invested": round(invested, 2),
        "current_value": round(current_value, 2),
        "total_value": round(cash + current_value, 2),
        "initial_balance": wallet.get("initial_balance", 1000000) if wallet else 1000000,
        "unrealized_pnl": round(unrealized_pnl, 2),
        "realized_pnl": round(total_profit, 2),
        "total_trades": total_trades,
        "wins": wins,
        "losses": total_trades - wins,
        "win_rate": win_rate,
        "total_profit": round(total_profit, 2),
        "open_positions": len(open_pos),
    }


async def bot_reset():
    """Reset bot — clear everything, restart with 10L."""
    db = get_db()
    await db.bot_wallet.drop()
    await db.bot_positions.drop()
    await db.bot_orders.drop()
    await db.bot_logs.drop()
    await init_bot_wallet()
    await _log("RESET", details="Bot reset to Rs 10,00,000")
