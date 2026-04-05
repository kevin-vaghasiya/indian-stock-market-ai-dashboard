from datetime import datetime
from typing import Optional
from ..models.database import get_db


async def get_wallet():
    db = get_db()
    return await db.wallet.find_one()


async def place_order(
    symbol: str,
    company_name: str,
    side: str,
    order_type: str,
    quantity: int,
    current_price: float,
    limit_price: Optional[float] = None,
) -> dict:
    db = get_db()
    wallet = await db.wallet.find_one()

    if order_type == "MARKET":
        executed_price = current_price

        if side == "BUY":
            total_cost = executed_price * quantity
            if total_cost > wallet["cash_balance"]:
                raise ValueError(
                    f"Insufficient balance. Need Rs {total_cost:.2f}, have Rs {wallet['cash_balance']:.2f}"
                )
            await db.wallet.update_one(
                {"_id": wallet["_id"]},
                {"$inc": {"cash_balance": -total_cost}},
            )
            await _update_position_buy(db, symbol, company_name, quantity, executed_price)
        else:
            position = await db.positions.find_one({"symbol": symbol})
            if not position or position["quantity"] < quantity:
                available = position["quantity"] if position else 0
                raise ValueError(
                    f"Insufficient holdings. Have {available}, trying to sell {quantity}"
                )
            total_value = executed_price * quantity
            await db.wallet.update_one(
                {"_id": wallet["_id"]},
                {"$inc": {"cash_balance": total_value}},
            )
            await _update_position_sell(db, symbol, quantity, executed_price)

        order = {
            "symbol": symbol,
            "company_name": company_name,
            "order_type": "MARKET",
            "side": side,
            "quantity": quantity,
            "limit_price": None,
            "executed_price": executed_price,
            "status": "EXECUTED",
            "created_at": datetime.utcnow(),
            "executed_at": datetime.utcnow(),
        }

        # Auto-create 5% target alert on buy
        if side == "BUY":
            target_price = round(executed_price * 1.05, 2)
            await db.alerts.insert_one({
                "symbol": symbol,
                "target_price": target_price,
                "direction": "ABOVE",
                "percent_target": 5.0,
                "base_price": executed_price,
                "is_triggered": False,
                "created_at": datetime.utcnow(),
                "triggered_at": None,
            })

    else:
        # LIMIT or STOP_LOSS - save as pending
        if side == "BUY" and limit_price:
            total_cost = limit_price * quantity
            if total_cost > wallet["cash_balance"]:
                raise ValueError("Insufficient balance for limit order")

        order = {
            "symbol": symbol,
            "company_name": company_name,
            "order_type": order_type,
            "side": side,
            "quantity": quantity,
            "limit_price": limit_price,
            "executed_price": None,
            "status": "PENDING",
            "created_at": datetime.utcnow(),
            "executed_at": None,
        }

    result = await db.orders.insert_one(order)
    order["_id"] = result.inserted_id
    return order


async def _update_position_buy(db, symbol: str, company_name: str, quantity: int, price: float):
    position = await db.positions.find_one({"symbol": symbol})
    if position:
        total_cost = (position["avg_buy_price"] * position["quantity"]) + (price * quantity)
        new_qty = position["quantity"] + quantity
        new_avg = total_cost / new_qty
        await db.positions.update_one(
            {"symbol": symbol},
            {"$set": {"quantity": new_qty, "avg_buy_price": new_avg, "updated_at": datetime.utcnow()}},
        )
    else:
        await db.positions.insert_one({
            "symbol": symbol,
            "company_name": company_name,
            "quantity": quantity,
            "avg_buy_price": price,
            "realized_pnl": 0.0,
            "updated_at": datetime.utcnow(),
        })


async def _update_position_sell(db, symbol: str, quantity: int, price: float):
    position = await db.positions.find_one({"symbol": symbol})
    if position:
        realized = (price - position["avg_buy_price"]) * quantity
        new_qty = position["quantity"] - quantity
        if new_qty == 0:
            await db.positions.delete_one({"symbol": symbol})
        else:
            await db.positions.update_one(
                {"symbol": symbol},
                {
                    "$set": {"quantity": new_qty, "updated_at": datetime.utcnow()},
                    "$inc": {"realized_pnl": realized},
                },
            )
