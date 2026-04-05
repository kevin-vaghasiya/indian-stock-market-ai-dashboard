from bson import ObjectId
from datetime import datetime
from fastapi import APIRouter, HTTPException
from ..models.database import get_db
from ..models.schemas import OrderCreate, WalletResponse, AlertCreate
from ..services.paper_engine import place_order, get_wallet
from ..services.nse_fetcher import nse

router = APIRouter(prefix="/api/trading", tags=["paper-trading"])


@router.get("/wallet")
async def wallet_info():
    db = get_db()
    wallet = await get_wallet()
    positions = await db.positions.find().to_list(length=1000)

    invested = sum(p["avg_buy_price"] * p["quantity"] for p in positions)
    total = wallet["cash_balance"] + invested
    initial = wallet["initial_balance"]
    pnl = total - initial
    pnl_pct = (pnl / initial * 100) if initial > 0 else 0

    return WalletResponse(
        cash_balance=round(wallet["cash_balance"], 2),
        invested_value=round(invested, 2),
        total_value=round(total, 2),
        total_pnl=round(pnl, 2),
        total_pnl_percent=round(pnl_pct, 2),
    )


@router.post("/order")
async def create_order(order_req: OrderCreate):
    quote = await nse.get_quote(order_req.symbol.upper())
    if not quote:
        raise HTTPException(status_code=404, detail=f"Cannot fetch price for {order_req.symbol}")

    current_price = quote["ltp"]
    company_name = order_req.company_name or quote.get("company_name", "")

    try:
        order = await place_order(
            symbol=order_req.symbol.upper(),
            company_name=company_name,
            side=order_req.side.upper(),
            order_type=order_req.order_type.upper(),
            quantity=order_req.quantity,
            current_price=current_price,
            limit_price=order_req.limit_price,
        )
        return {
            "message": f"Order {'executed' if order['status'] == 'EXECUTED' else 'placed'}",
            "order_id": str(order["_id"]),
            "executed_price": order["executed_price"],
            "status": order["status"],
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/orders")
async def get_orders(status: str = None):
    db = get_db()
    query = {}
    if status:
        query["status"] = status.upper()
    orders = await db.orders.find(query).sort("created_at", -1).to_list(length=50)

    return {"data": [
        {
            "id": str(o["_id"]),
            "symbol": o["symbol"],
            "company_name": o.get("company_name", ""),
            "order_type": o["order_type"],
            "side": o["side"],
            "quantity": o["quantity"],
            "limit_price": o.get("limit_price"),
            "executed_price": o.get("executed_price"),
            "status": o["status"],
            "created_at": o["created_at"].isoformat() if o.get("created_at") else "",
            "executed_at": o["executed_at"].isoformat() if o.get("executed_at") else None,
        }
        for o in orders
    ]}


@router.delete("/order/{order_id}")
async def cancel_order(order_id: str):
    db = get_db()
    try:
        oid = ObjectId(order_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid order ID")

    order = await db.orders.find_one({"_id": oid})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order["status"] != "PENDING":
        raise HTTPException(status_code=400, detail="Only pending orders can be cancelled")

    await db.orders.update_one({"_id": oid}, {"$set": {"status": "CANCELLED"}})
    return {"message": "Order cancelled"}


@router.get("/positions")
async def get_positions():
    db = get_db()
    positions = await db.positions.find({"quantity": {"$gt": 0}}).to_list(length=1000)
    results = []
    total_invested = 0.0
    total_current = 0.0
    total_unrealized = 0.0
    total_realized = 0.0

    for p in positions:
        invested = p["avg_buy_price"] * p["quantity"]
        current_price = 0.0

        quote = await nse.get_quote(p["symbol"])
        if quote:
            current_price = quote["ltp"]

        current_value = current_price * p["quantity"]
        unrealized_pnl = current_value - invested if current_price > 0 else 0
        unrealized_pnl_pct = (unrealized_pnl / invested * 100) if invested > 0 and current_price > 0 else 0

        total_invested += invested
        total_current += current_value
        total_unrealized += unrealized_pnl
        total_realized += p.get("realized_pnl", 0)

        results.append({
            "id": str(p["_id"]),
            "symbol": p["symbol"],
            "company_name": p.get("company_name", ""),
            "quantity": p["quantity"],
            "avg_buy_price": round(p["avg_buy_price"], 2),
            "invested_value": round(invested, 2),
            "current_price": round(current_price, 2),
            "current_value": round(current_value, 2),
            "unrealized_pnl": round(unrealized_pnl, 2),
            "unrealized_pnl_percent": round(unrealized_pnl_pct, 2),
            "realized_pnl": round(p.get("realized_pnl", 0), 2),
        })

    return {
        "data": results,
        "summary": {
            "total_invested": round(total_invested, 2),
            "total_current": round(total_current, 2),
            "total_unrealized_pnl": round(total_unrealized, 2),
            "total_unrealized_pnl_percent": round((total_unrealized / total_invested * 100) if total_invested > 0 else 0, 2),
            "total_realized_pnl": round(total_realized, 2),
        },
    }


@router.get("/alerts")
async def get_alerts():
    db = get_db()
    alerts = await db.alerts.find({"is_triggered": False}).to_list(length=100)
    return {"data": [{
        "id": str(a["_id"]),
        "symbol": a["symbol"],
        "target_price": a["target_price"],
        "base_price": a["base_price"],
        "percent_target": a["percent_target"],
        "direction": a["direction"],
    } for a in alerts]}


@router.post("/alert")
async def create_alert(alert_req: AlertCreate):
    db = get_db()
    target = round(alert_req.base_price * (1 + alert_req.percent_target / 100), 2)
    await db.alerts.insert_one({
        "symbol": alert_req.symbol.upper(),
        "target_price": target,
        "direction": alert_req.direction,
        "percent_target": alert_req.percent_target,
        "base_price": alert_req.base_price,
        "is_triggered": False,
        "created_at": datetime.utcnow(),
        "triggered_at": None,
    })
    return {"message": f"Alert set for {alert_req.symbol} at Rs {target}"}


# Watchlist endpoints
@router.get("/watchlist")
async def get_watchlist():
    db = get_db()
    items = await db.watchlist.find().to_list(length=100)
    return {"data": [
        {"id": str(w["_id"]), "symbol": w["symbol"], "company_name": w.get("company_name", "")}
        for w in items
    ]}


@router.post("/watchlist/{symbol}")
async def add_to_watchlist(symbol: str):
    db = get_db()
    existing = await db.watchlist.find_one({"symbol": symbol.upper()})
    if existing:
        return {"message": f"{symbol} already in watchlist"}
    quote = await nse.get_quote(symbol.upper())
    name = quote.get("company_name", "") if quote else ""
    await db.watchlist.insert_one({
        "symbol": symbol.upper(),
        "company_name": name,
        "added_at": datetime.utcnow(),
    })
    return {"message": f"{symbol} added to watchlist"}


@router.delete("/watchlist/{symbol}")
async def remove_from_watchlist(symbol: str):
    db = get_db()
    result = await db.watchlist.delete_one({"symbol": symbol.upper()})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not in watchlist")
    return {"message": f"{symbol} removed from watchlist"}
