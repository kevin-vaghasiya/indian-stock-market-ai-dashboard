import yfinance as yf
import logging
from cachetools import TTLCache
from typing import Optional

logger = logging.getLogger(__name__)

# Cache fundamentals for 1 hour, history for 6 hours
_fundamentals_cache = TTLCache(maxsize=200, ttl=3600)
_history_cache = TTLCache(maxsize=200, ttl=21600)
_last_day_cache = TTLCache(maxsize=10, ttl=3600)

# Nifty 50 constituents for fallback data
NIFTY50_SYMBOLS = [
    "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK",
    "HINDUNILVR", "ITC", "SBIN", "BHARTIARTL", "KOTAKBANK",
    "LT", "AXISBANK", "BAJFINANCE", "ASIANPAINT", "MARUTI",
    "HCLTECH", "TITAN", "SUNPHARMA", "WIPRO", "ULTRACEMCO",
    "NESTLEIND", "BAJAJFINSV", "TATAMOTORS", "NTPC", "POWERGRID",
    "M&M", "ONGC", "JSWSTEEL", "TATASTEEL", "ADANIENT",
    "ADANIPORTS", "COALINDIA", "TECHM", "INDUSINDBK", "HINDALCO",
    "DRREDDY", "DIVISLAB", "CIPLA", "EICHERMOT", "APOLLOHOSP",
    "BPCL", "GRASIM", "TATACONSUM", "HEROMOTOCO", "SBILIFE",
    "BRITANNIA", "BAJAJ-AUTO", "HDFCLIFE", "LTIM", "SHRIRAMFIN",
]


def _nse_ticker(symbol: str) -> str:
    if not symbol.endswith(".NS"):
        return f"{symbol}.NS"
    return symbol


def get_company_info(symbol: str) -> Optional[dict]:
    cache_key = f"info_{symbol}"
    if cache_key in _fundamentals_cache:
        return _fundamentals_cache[cache_key]

    try:
        ticker = yf.Ticker(_nse_ticker(symbol))
        info = ticker.info
        if not info or info.get("regularMarketPrice") is None:
            return None

        result = {
            "symbol": symbol,
            "company_name": info.get("longName", info.get("shortName", symbol)),
            "sector": info.get("sector", ""),
            "industry": info.get("industry", ""),
            "market_cap": info.get("marketCap", 0),
            "pe_ratio": info.get("trailingPE"),
            "pb_ratio": info.get("priceToBook"),
            "dividend_yield": info.get("dividendYield"),
            "eps": info.get("trailingEps"),
            "debt_to_equity": info.get("debtToEquity"),
            "roe": info.get("returnOnEquity"),
            "book_value": info.get("bookValue"),
            "face_value": info.get("faceValue"),
            "fifty_two_week_high": info.get("fiftyTwoWeekHigh", 0),
            "fifty_two_week_low": info.get("fiftyTwoWeekLow", 0),
            "description": info.get("longBusinessSummary", ""),
        }
        _fundamentals_cache[cache_key] = result
        return result
    except Exception as e:
        logger.error(f"yfinance error for {symbol}: {e}")
        return None


def get_price_history(symbol: str, period: str = "6mo", interval: str = "1d") -> list[dict]:
    cache_key = f"hist_{symbol}_{period}_{interval}"
    if cache_key in _history_cache:
        return _history_cache[cache_key]

    try:
        ticker = yf.Ticker(_nse_ticker(symbol))
        df = ticker.history(period=period, interval=interval)
        if df.empty:
            return []

        results = []
        for date, row in df.iterrows():
            results.append({
                "time": date.strftime("%Y-%m-%d"),
                "open": round(row["Open"], 2),
                "high": round(row["High"], 2),
                "low": round(row["Low"], 2),
                "close": round(row["Close"], 2),
                "volume": int(row["Volume"]),
            })
        _history_cache[cache_key] = results
        return results
    except Exception as e:
        logger.error(f"yfinance history error for {symbol}: {e}")
        return []


def get_last_trading_day_movers() -> dict:
    """Get top gainers and losers from the last trading day using yfinance."""
    cache_key = "last_day_movers"
    if cache_key in _last_day_cache:
        return _last_day_cache[cache_key]

    try:
        tickers_str = " ".join([f"{s}.NS" for s in NIFTY50_SYMBOLS])
        data = yf.download(tickers_str, period="5d", interval="1d", group_by="ticker", progress=False)

        stocks = []
        for symbol in NIFTY50_SYMBOLS:
            try:
                ticker_data = data[f"{symbol}.NS"] if f"{symbol}.NS" in data.columns.get_level_values(0) else None
                if ticker_data is None or ticker_data.empty:
                    continue

                # Get the last two rows for change calculation
                recent = ticker_data.dropna(subset=["Close"]).tail(2)
                if len(recent) < 2:
                    continue

                prev_close = float(recent.iloc[-2]["Close"])
                last_close = float(recent.iloc[-1]["Close"])
                last_open = float(recent.iloc[-1]["Open"])
                last_high = float(recent.iloc[-1]["High"])
                last_low = float(recent.iloc[-1]["Low"])
                last_volume = int(recent.iloc[-1]["Volume"])
                change = last_close - prev_close
                pct_change = (change / prev_close * 100) if prev_close > 0 else 0

                stocks.append({
                    "symbol": symbol,
                    "company_name": "",
                    "ltp": round(last_close, 2),
                    "change": round(change, 2),
                    "percent_change": round(pct_change, 2),
                    "open": round(last_open, 2),
                    "high": round(last_high, 2),
                    "low": round(last_low, 2),
                    "prev_close": round(prev_close, 2),
                    "volume": last_volume,
                })
            except Exception as e:
                logger.debug(f"Skipping {symbol}: {e}")
                continue

        # Sort by percent change
        gainers = sorted(stocks, key=lambda x: x["percent_change"], reverse=True)[:20]
        losers = sorted(stocks, key=lambda x: x["percent_change"])[:20]

        result = {"gainers": gainers, "losers": losers}
        _last_day_cache[cache_key] = result
        return result
    except Exception as e:
        logger.error(f"Failed to fetch last day movers: {e}")
        return {"gainers": [], "losers": []}
