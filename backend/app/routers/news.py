from fastapi import APIRouter
from ..services.news_service import get_stock_news

router = APIRouter(prefix="/api/news", tags=["news"])


@router.get("/{symbol}")
async def stock_news(symbol: str, limit: int = 10):
    news = get_stock_news(symbol.upper(), max_items=limit)
    return {"data": news, "count": len(news)}
