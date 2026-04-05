import asyncio
import json
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from .models.database import init_db, close_db
from .routers import market, company, news, paper_trading, buy_score, predictions
from .services.nse_fetcher import nse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    logger.info("MongoDB initialized")
    yield
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
