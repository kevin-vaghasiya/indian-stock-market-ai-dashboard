from fastapi import APIRouter
from ..services.nse_fetcher import nse

router = APIRouter(prefix="/api/market", tags=["market"])


@router.get("/gainers")
async def get_gainers():
    data = await nse.get_gainers()
    if data:
        # Also fetch Nifty 50 to get the trade date for live data
        _, trade_date = await nse.get_nifty50_stocks()
        return {"data": data, "count": len(data), "source": "live", "trade_date": trade_date}

    # Fallback: Nifty 50 stocks sorted by % change (works when market is closed)
    stocks, trade_date = await nse.get_nifty50_stocks()
    gainers = sorted(stocks, key=lambda x: x["percent_change"], reverse=True)
    gainers = [s for s in gainers if s["percent_change"] > 0]
    return {"data": gainers[:20], "count": len(gainers[:20]), "source": "last_close", "trade_date": trade_date}


@router.get("/losers")
async def get_losers():
    data = await nse.get_losers()
    if data:
        _, trade_date = await nse.get_nifty50_stocks()
        return {"data": data, "count": len(data), "source": "live", "trade_date": trade_date}

    # Fallback: Nifty 50 stocks sorted by % change ascending
    stocks, trade_date = await nse.get_nifty50_stocks()
    losers = sorted(stocks, key=lambda x: x["percent_change"])
    losers = [s for s in losers if s["percent_change"] < 0]
    return {"data": losers[:20], "count": len(losers[:20]), "source": "last_close", "trade_date": trade_date}


@router.get("/quote/{symbol}")
async def get_quote(symbol: str):
    data = await nse.get_quote(symbol.upper())
    if data:
        return data
    return {"error": f"Quote not found for {symbol}"}
