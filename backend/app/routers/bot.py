from fastapi import APIRouter
from ..models.database import get_db
from ..services.bot_engine import (
    bot_scan_and_buy,
    bot_check_sell_targets,
    bot_get_stats,
    bot_reset,
)
from ..services.nse_fetcher import nse

router = APIRouter(prefix="/api/bot", tags=["ai-bot"])


@router.get("/stats")
async def stats():
    return await bot_get_stats()


@router.get("/positions")
async def positions():
    db = get_db()
    pos = await db.bot_positions.find({"quantity": {"$gt": 0}}).to_list(length=50)
    results = []
    for p in pos:
        current_price = 0
        quote = await nse.get_quote(p["symbol"])
        if quote:
            current_price = quote["ltp"]
        invested = p["buy_price"] * p["quantity"]
        current_val = current_price * p["quantity"]
        pnl = current_val - invested
        pnl_pct = (pnl / invested * 100) if invested > 0 else 0
        results.append({
            "symbol": p["symbol"],
            "company_name": p.get("company_name", ""),
            "quantity": p["quantity"],
            "buy_price": round(p["buy_price"], 2),
            "current_price": round(current_price, 2),
            "invested": round(invested, 2),
            "current_value": round(current_val, 2),
            "pnl": round(pnl, 2),
            "pnl_pct": round(pnl_pct, 2),
            "target_min": p.get("target_min", 0),
            "target_max": p.get("target_max", 0),
            "trailing_active": p.get("trailing_active", False),
            "ai_score": p.get("ai_score", 0),
            "signal": p.get("signal", ""),
            "buy_date": p.get("buy_date", ""),
        })
    return {"data": results}


@router.get("/orders")
async def orders(limit: int = 50):
    db = get_db()
    items = await db.bot_orders.find().sort("timestamp", -1).to_list(length=limit)
    return {"data": [{
        "symbol": o["symbol"],
        "side": o["side"],
        "quantity": o["quantity"],
        "price": o["price"],
        "total": o.get("total", 0),
        "profit": o.get("profit"),
        "profit_pct": o.get("profit_pct"),
        "ai_score": o.get("ai_score"),
        "reason": o.get("reason", ""),
        "timestamp": o.get("timestamp", ""),
    } for o in items]}


@router.get("/logs")
async def logs(limit: int = 100):
    db = get_db()
    items = await db.bot_logs.find().sort("timestamp", -1).to_list(length=limit)
    return {"data": [{
        "action": l["action"],
        "symbol": l.get("symbol", ""),
        "details": l.get("details", ""),
        "timestamp": l.get("timestamp", ""),
    } for l in items]}


@router.get("/completed-trades")
async def completed_trades(limit: int = 50):
    db = get_db()
    items = await db.bot_positions.find(
        {"quantity": 0, "profit": {"$exists": True}}
    ).sort("sell_date", -1).to_list(length=limit)
    return {"data": [{
        "symbol": t["symbol"],
        "quantity": t.get("quantity", 0),
        "buy_price": round(t.get("buy_price", 0), 2),
        "sell_price": round(t.get("sell_price", 0), 2),
        "profit": round(t.get("profit", 0), 2),
        "profit_pct": round(t.get("profit_pct", 0), 2),
        "ai_score": t.get("ai_score", 0),
        "buy_date": t.get("buy_date", ""),
        "sell_date": t.get("sell_date", ""),
    } for t in items]}


@router.post("/run")
async def run_bot():
    """Manually trigger bot scan and buy."""
    return await bot_scan_and_buy()


@router.post("/check-sells")
async def check_sells():
    """Manually trigger sell check."""
    return await bot_check_sell_targets()


@router.post("/reset")
async def reset():
    """Reset bot to initial state."""
    await bot_reset()
    return {"message": "Bot reset to Rs 10,00,000"}
