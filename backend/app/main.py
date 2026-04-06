import asyncio
import json
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone, timedelta

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from .models.database import init_db, close_db
from .routers import market, company, news, paper_trading, buy_score, predictions, bot
from .services.nse_fetcher import nse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

IST = timezone(timedelta(hours=5, minutes=30))


async def _eod_scheduler():
    """Background task: collect EOD prices and verify predictions after market close."""
    from .services.prediction_service import collect_eod_snapshots, verify_predictions

    collected_today = False

    while True:
        now = datetime.now(IST)
        hour, minute = now.hour, now.minute
        is_weekday = now.weekday() < 5

        # Run once between 3:45 PM and 4:30 PM IST on weekdays
        after_close = (hour == 15 and minute >= 45) or (hour == 16 and minute <= 30)

        if is_weekday and after_close and not collected_today:
            try:
                logger.info("EOD Scheduler: Collecting EOD prices...")
                result = await collect_eod_snapshots()
                logger.info(f"EOD Scheduler: Collected {result.get('collected', 0)} snapshots")

                logger.info("EOD Scheduler: Verifying predictions...")
                verified = await verify_predictions()
                logger.info(f"EOD Scheduler: Verified {verified.get('verified', 0)} predictions")

                collected_today = True
            except Exception as e:
                logger.error(f"EOD Scheduler error: {e}")

        # Reset flag after midnight
        if hour == 0 and minute < 5:
            collected_today = False

        await asyncio.sleep(300)  # Check every 5 minutes


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    from .services.bot_engine import init_bot_wallet
    await init_bot_wallet()
    logger.info("MongoDB initialized")

    # Start EOD scheduler
    eod_task = asyncio.create_task(_eod_scheduler())
    logger.info("EOD price scheduler started")

    yield

    eod_task.cancel()
    await close_db()
    await nse.close()
    logger.info("Connections closed")


app = FastAPI(title="Trading Dashboard API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(market.router)
app.include_router(company.router)
app.include_router(news.router)
app.include_router(paper_trading.router)
app.include_router(buy_score.router)
app.include_router(predictions.router)
app.include_router(bot.router)


@app.get("/")
async def root():
    return {"status": "ok", "message": "Trading Dashboard API"}


@app.get("/api/stream/market")
async def market_stream(request: Request):
    async def event_generator():
        while True:
            if await request.is_disconnected():
                break
            try:
                gainers = await nse.get_gainers()
                losers = await nse.get_losers()
                data = {
                    "gainers": gainers[:20],
                    "losers": losers[:20],
                }
                yield f"data: {json.dumps(data)}\n\n"
            except Exception as e:
                logger.error(f"SSE error: {e}")
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
            await asyncio.sleep(30)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )
