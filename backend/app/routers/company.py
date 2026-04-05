import logging
from fastapi import APIRouter
from ..services.screener_service import get_screener_company_info
from ..services.yfinance_service import get_company_info, get_price_history

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/company", tags=["company"])


@router.get("/{symbol}")
async def company_info(symbol: str):
    sym = symbol.upper()

    # Try screener.in first (yfinance has SSL issues)
    info = await get_screener_company_info(sym)
    if info:
        return info

    # Fall back to yfinance
    logger.info(f"Screener failed for {sym}, falling back to yfinance")
    info = get_company_info(sym)
    if info:
        return info

    return {"error": f"Company info not found for {symbol}"}


@router.get("/{symbol}/history")
async def price_history(symbol: str, period: str = "6mo", interval: str = "1d"):
    data = get_price_history(symbol.upper(), period=period, interval=interval)
    return {"data": data, "count": len(data)}
