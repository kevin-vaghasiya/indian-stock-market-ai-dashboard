from fastapi import APIRouter, HTTPException
from ..services.buy_score_service import compute_buy_score, compute_batch_scores
from ..services.screener_service import get_screener_company_info
from ..services.news_service import get_stock_news
from ..services.nse_fetcher import nse

router = APIRouter(prefix="/api/buy-score", tags=["buy-score"])


@router.get("/{symbol}")
async def get_buy_score(symbol: str):
    sym = symbol.upper()

    # Fetch all data needed for scoring
    fundamentals = await get_screener_company_info(sym)
    if not fundamentals:
        fundamentals = {"company_name": sym}

    news = get_stock_news(sym, max_items=8)

    quote = await nse.get_quote(sym)
    price_data = quote or {}

    score = await compute_buy_score(sym, fundamentals, news, price_data)
    if not score:
        raise HTTPException(status_code=500, detail="Failed to compute buy score")

    return score


@router.get("/batch/gainers")
async def get_batch_scores():
    """Score all current top gainers."""
    gainers = await nse.get_gainers()
    if not gainers:
        stocks, _ = await nse.get_nifty50_stocks()
        gainers = sorted(stocks, key=lambda x: x["percent_change"], reverse=True)[:10]
    else:
        gainers = gainers[:10]

    scores = await compute_batch_scores(gainers)
    return {"data": scores, "count": len(scores)}
