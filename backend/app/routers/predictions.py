from fastapi import APIRouter
from ..services.prediction_service import (
    get_prediction_stats,
    get_recent_predictions,
    collect_eod_snapshots,
    verify_predictions,
)

router = APIRouter(prefix="/api/predictions", tags=["predictions"])


@router.get("/stats")
async def prediction_stats():
    stats = await get_prediction_stats()
    return stats


@router.get("/recent")
async def recent_predictions(limit: int = 50):
    preds = await get_recent_predictions(limit=limit)
    return {"data": preds, "count": len(preds)}


@router.post("/collect-eod")
async def trigger_eod_collection():
    """Manually trigger EOD price collection. Can also be automated via cron."""
    await collect_eod_snapshots()
    return {"message": "EOD snapshots collected"}


@router.post("/verify")
async def trigger_verification():
    """Manually trigger prediction verification. Can also be automated."""
    await verify_predictions()
    return {"message": "Predictions verified"}
