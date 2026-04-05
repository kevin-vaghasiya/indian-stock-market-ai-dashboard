from fastapi import APIRouter
from ..services.nse_fetcher import nse
from ..services.market_news_service import get_market_news

router = APIRouter(prefix="/api/market", tags=["market"])


@router.get("/gainers")
async def get_gainers():
    data = await nse.get_gainers()
    if data:
        _, trade_date = await nse.get_nifty50_stocks()
        return {"data": data, "count": len(data), "source": "live", "trade_date": trade_date}

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


@router.get("/indices")
async def get_indices():
    """Get major index values (Nifty 50, Bank Nifty, IT, etc.)."""
    data = await nse.get_all_indices()
    return {"data": data}


@router.get("/sectors")
async def get_sectors():
    """Get sector-wise performance for heatmap."""
    data = await nse.get_sector_performance()
    return {"data": data}


@router.get("/fii-dii")
async def get_fii_dii():
    """Get FII/DII trading data."""
    data = await nse.get_fii_dii_data()
    if data:
        return data
    return {"fii": {}, "dii": {}}


@router.get("/volume-spikes")
async def get_volume_spikes():
    """Get stocks with unusual volume activity."""
    data = await nse.get_volume_spikes()
    return {"data": data}


@router.get("/news")
async def market_news():
    """Get broad market and finance news."""
    data = get_market_news()
    return {"data": data}
