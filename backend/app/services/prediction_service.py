import logging
from datetime import datetime, date, timedelta
from typing import Optional
from ..models.database import get_db

logger = logging.getLogger(__name__)


async def save_prediction(score_data: dict):
    """Save an AI prediction to the predictions collection."""
    db = get_db()
    today = date.today().isoformat()

    doc = {
        "symbol": score_data["symbol"],
        "date": today,
        "predicted_at": datetime.utcnow(),
        "current_price": score_data.get("current_price", 0),
        "predicted_close_today": score_data.get("predicted_close_today"),
        "predicted_close_tomorrow": score_data.get("predicted_close_tomorrow"),
        "score": score_data.get("score", 0),
        "verdict": score_data.get("verdict", ""),
        "news_summary": score_data.get("news_summary", ""),
        "prediction_reasoning": score_data.get("prediction_reasoning", ""),
        # These get filled later when actual prices are available
        "actual_close_today": None,
        "actual_close_tomorrow": None,
        "today_error_pct": None,
        "tomorrow_error_pct": None,
        "today_direction_correct": None,
        "tomorrow_direction_correct": None,
        "verified": False,
    }

    # Upsert: one prediction per symbol per day
    await db.predictions.update_one(
        {"symbol": doc["symbol"], "date": today},
        {"$set": doc},
        upsert=True,
    )
    logger.info(f"Prediction saved for {doc['symbol']} on {today}")


async def save_price_snapshot(symbol: str, close_price: float, open_price: float = 0,
                                high: float = 0, low: float = 0, volume: int = 0):
    """Save actual EOD price for a stock."""
    db = get_db()
    today = date.today().isoformat()

    await db.price_snapshots.update_one(
        {"symbol": symbol, "date": today},
        {"$set": {
            "symbol": symbol,
            "date": today,
            "close_price": close_price,
            "open_price": open_price,
            "high": high,
            "low": low,
            "volume": volume,
            "recorded_at": datetime.utcnow(),
        }},
        upsert=True,
    )


async def collect_eod_snapshots():
    """Collect EOD prices for all stocks that have predictions. Call after market close."""
    from .nse_fetcher import nse

    db = get_db()
    today = date.today().isoformat()

    # Get all symbols with unverified predictions
    predictions = await db.predictions.find({"verified": False}).to_list(length=500)

    # Collect unique symbols needing snapshots
    symbols = set()
    for p in predictions:
        symbols.add(p["symbol"])

    logger.info(f"Collecting EOD snapshots for {len(symbols)} symbols")

    for symbol in symbols:
        try:
            quote = await nse.get_quote(symbol)
            if quote:
                await save_price_snapshot(
                    symbol=symbol,
                    close_price=quote["ltp"],
                    open_price=quote.get("open", 0),
                    high=quote.get("high", 0),
                    low=quote.get("low", 0),
                    volume=quote.get("volume", 0),
                )
        except Exception as e:
            logger.error(f"Failed to collect snapshot for {symbol}: {e}")


async def verify_predictions():
    """Compare predictions against actual prices and update accuracy fields."""
    db = get_db()
    today = date.today().isoformat()

    unverified = await db.predictions.find({"verified": False}).to_list(length=500)

    verified_count = 0
    for pred in unverified:
        symbol = pred["symbol"]
        pred_date = pred["date"]

        # Check if we have actual price for the prediction date (today's close)
        snapshot_today = await db.price_snapshots.find_one(
            {"symbol": symbol, "date": pred_date}
        )

        # Check if we have tomorrow's close (day after prediction)
        pred_date_obj = date.fromisoformat(pred_date)
        tomorrow_date = (pred_date_obj + timedelta(days=1)).isoformat()
        # Skip weekends
        if pred_date_obj.weekday() == 4:  # Friday
            tomorrow_date = (pred_date_obj + timedelta(days=3)).isoformat()

        snapshot_tomorrow = await db.price_snapshots.find_one(
            {"symbol": symbol, "date": tomorrow_date}
        )

        updates = {}

        # Verify today's prediction
        if snapshot_today and pred.get("predicted_close_today"):
            actual = snapshot_today["close_price"]
            predicted = pred["predicted_close_today"]
            current = pred["current_price"]

            error_pct = round(abs(predicted - actual) / actual * 100, 2) if actual > 0 else None
            # Direction: did the stock go up/down as predicted?
            predicted_direction = "up" if predicted > current else "down"
            actual_direction = "up" if actual > current else "down"
            direction_correct = predicted_direction == actual_direction

            updates["actual_close_today"] = actual
            updates["today_error_pct"] = error_pct
            updates["today_direction_correct"] = direction_correct

        # Verify tomorrow's prediction
        if snapshot_tomorrow and pred.get("predicted_close_tomorrow"):
            actual = snapshot_tomorrow["close_price"]
            predicted = pred["predicted_close_tomorrow"]
            current = pred["current_price"]

            error_pct = round(abs(predicted - actual) / actual * 100, 2) if actual > 0 else None
            predicted_direction = "up" if predicted > current else "down"
            actual_direction = "up" if actual > current else "down"
            direction_correct = predicted_direction == actual_direction

            updates["actual_close_tomorrow"] = actual
            updates["tomorrow_error_pct"] = error_pct
            updates["tomorrow_direction_correct"] = direction_correct

        # Mark as verified if both are filled, or if prediction is older than 3 days
        if updates.get("actual_close_today") and updates.get("actual_close_tomorrow"):
            updates["verified"] = True
        elif (date.today() - pred_date_obj).days > 4:
            updates["verified"] = True  # Too old, mark done

        if updates:
            await db.predictions.update_one({"_id": pred["_id"]}, {"$set": updates})
            verified_count += 1

    logger.info(f"Verified {verified_count} predictions")


async def get_prediction_stats() -> dict:
    """Get overall prediction accuracy stats."""
    db = get_db()

    all_preds = await db.predictions.find(
        {"actual_close_today": {"$ne": None}}
    ).to_list(length=1000)

    if not all_preds:
        return {
            "total_predictions": 0,
            "today_direction_accuracy": 0,
            "tomorrow_direction_accuracy": 0,
            "avg_today_error_pct": 0,
            "avg_tomorrow_error_pct": 0,
            "recent": [],
        }

    total = len(all_preds)
    today_correct = sum(1 for p in all_preds if p.get("today_direction_correct") is True)
    tomorrow_preds = [p for p in all_preds if p.get("actual_close_tomorrow") is not None]
    tomorrow_correct = sum(1 for p in tomorrow_preds if p.get("tomorrow_direction_correct") is True)

    today_errors = [p["today_error_pct"] for p in all_preds if p.get("today_error_pct") is not None]
    tomorrow_errors = [p["tomorrow_error_pct"] for p in tomorrow_preds if p.get("tomorrow_error_pct") is not None]

    return {
        "total_predictions": total,
        "today_direction_accuracy": round(today_correct / total * 100, 1) if total > 0 else 0,
        "tomorrow_direction_accuracy": round(tomorrow_correct / len(tomorrow_preds) * 100, 1) if tomorrow_preds else 0,
        "avg_today_error_pct": round(sum(today_errors) / len(today_errors), 2) if today_errors else 0,
        "avg_tomorrow_error_pct": round(sum(tomorrow_errors) / len(tomorrow_errors), 2) if tomorrow_errors else 0,
    }


async def get_recent_predictions(limit: int = 50) -> list[dict]:
    """Get recent predictions with actual results for the accuracy page."""
    db = get_db()

    preds = await db.predictions.find().sort("predicted_at", -1).to_list(length=limit)

    results = []
    for p in preds:
        results.append({
            "symbol": p["symbol"],
            "date": p["date"],
            "score": p.get("score", 0),
            "verdict": p.get("verdict", ""),
            "current_price": p.get("current_price", 0),
            "predicted_close_today": p.get("predicted_close_today"),
            "predicted_close_tomorrow": p.get("predicted_close_tomorrow"),
            "actual_close_today": p.get("actual_close_today"),
            "actual_close_tomorrow": p.get("actual_close_tomorrow"),
            "today_error_pct": p.get("today_error_pct"),
            "tomorrow_error_pct": p.get("tomorrow_error_pct"),
            "today_direction_correct": p.get("today_direction_correct"),
            "tomorrow_direction_correct": p.get("tomorrow_direction_correct"),
            "prediction_reasoning": p.get("prediction_reasoning", ""),
            "verified": p.get("verified", False),
        })

    return results
