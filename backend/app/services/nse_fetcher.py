import httpx
import asyncio
import logging
from cachetools import TTLCache
from typing import Optional

logger = logging.getLogger(__name__)

BASE_URL = "https://www.nseindia.com"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate",
    "Referer": "https://www.nseindia.com/",
}

# Cache: 15 second TTL for live data
_price_cache = TTLCache(maxsize=500, ttl=15)
_gainers_cache = TTLCache(maxsize=10, ttl=30)
_losers_cache = TTLCache(maxsize=10, ttl=30)
_index_cache = TTLCache(maxsize=10, ttl=300)  # 5 min cache for index data


class NSEFetcher:
    def __init__(self):
        self._client: Optional[httpx.AsyncClient] = None
        self._cookies = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                headers=HEADERS,
                timeout=httpx.Timeout(15.0),
                follow_redirects=True,
            )
            await self._refresh_cookies()
        return self._client

    async def _refresh_cookies(self):
        try:
            client = self._client
            resp = await client.get(BASE_URL)
            self._cookies = resp.cookies
            logger.info("NSE cookies refreshed")
        except Exception as e:
            logger.error(f"Failed to refresh NSE cookies: {e}")

    async def _fetch(self, url: str, retries: int = 2) -> Optional[dict]:
        client = await self._get_client()
        for attempt in range(retries + 1):
            try:
                resp = await client.get(url, cookies=self._cookies)
                if resp.status_code == 401 or resp.status_code == 403:
                    await self._refresh_cookies()
                    await asyncio.sleep(1)
                    continue
                if resp.status_code == 200:
                    return resp.json()
                logger.warning(f"NSE returned {resp.status_code} for {url}")
            except Exception as e:
                logger.error(f"NSE fetch error (attempt {attempt+1}): {e}")
                if attempt < retries:
                    await self._refresh_cookies()
                    await asyncio.sleep(2)
        return None

    def _parse_volume(self, val) -> int:
        if isinstance(val, str):
            return int(val.replace(",", ""))
        return int(val or 0)

    async def get_gainers(self) -> list[dict]:
        cache_key = "gainers"
        if cache_key in _gainers_cache:
            return _gainers_cache[cache_key]

        data = await self._fetch(f"{BASE_URL}/api/live-analysis/gainers/allSec")
        if data and "data" in data and len(data["data"]) > 0:
            results = []
            for item in data["data"][:30]:
                results.append({
                    "symbol": item.get("symbol", ""),
                    "company_name": item.get("series", ""),
                    "ltp": float(item.get("ltp", 0)),
                    "change": float(item.get("netPrice", 0)),
                    "percent_change": float(item.get("perChange", 0)),
                    "open": float(item.get("openPrice", 0)),
                    "high": float(item.get("highPrice", 0)),
                    "low": float(item.get("lowPrice", 0)),
                    "prev_close": float(item.get("previousPrice", 0)),
                    "volume": self._parse_volume(item.get("tradedQuantity", 0)),
                })
            _gainers_cache[cache_key] = results
            return results

        return []

    async def get_losers(self) -> list[dict]:
        cache_key = "losers"
        if cache_key in _losers_cache:
            return _losers_cache[cache_key]

        data = await self._fetch(f"{BASE_URL}/api/live-analysis/losers/allSec")
        if data and "data" in data and len(data["data"]) > 0:
            results = []
            for item in data["data"][:30]:
                results.append({
                    "symbol": item.get("symbol", ""),
                    "company_name": item.get("series", ""),
                    "ltp": float(item.get("ltp", 0)),
                    "change": float(item.get("netPrice", 0)),
                    "percent_change": float(item.get("perChange", 0)),
                    "open": float(item.get("openPrice", 0)),
                    "high": float(item.get("highPrice", 0)),
                    "low": float(item.get("lowPrice", 0)),
                    "prev_close": float(item.get("previousPrice", 0)),
                    "volume": self._parse_volume(item.get("tradedQuantity", 0)),
                })
            _losers_cache[cache_key] = results
            return results

        return []

    async def get_nifty50_stocks(self) -> tuple[list[dict], str]:
        """Fetch Nifty 500 stock data - works even when market is closed.
        Returns (stocks, trade_date) where trade_date is like '02 Apr 2026' or empty string.
        """
        cache_key = "nifty500"
        if cache_key in _index_cache:
            return _index_cache[cache_key]

        data = await self._fetch(f"{BASE_URL}/api/equity-stockIndices?index=NIFTY%20500")
        if data and "data" in data:
            results = []
            # Extract trade date from metadata
            trade_date = ""
            try:
                metadata = data.get("metadata", {})
                equity_time = metadata.get("quotepreopenstatus", {}).get("equityTime", "")
                if not equity_time:
                    # Try top-level timestamp field
                    equity_time = data.get("timestamp", "")
                if equity_time:
                    # Parse "02-Apr-2026 16:00:00" or "02-Apr-2026" format
                    from datetime import datetime
                    date_str = equity_time.split(" ")[0]  # "02-Apr-2026"
                    dt = datetime.strptime(date_str, "%d-%b-%Y")
                    trade_date = dt.strftime("%d %b %Y")  # "02 Apr 2026"
            except Exception as e:
                logger.warning(f"Could not parse trade date: {e}")

            for item in data["data"]:
                # Skip the index row itself
                if item.get("symbol") in ("NIFTY 50", "NIFTY 500"):
                    continue
                meta = item.get("meta", {})
                results.append({
                    "symbol": item.get("symbol", ""),
                    "company_name": meta.get("companyName", ""),
                    "ltp": float(item.get("lastPrice", 0)),
                    "change": float(item.get("change", 0)),
                    "percent_change": float(item.get("pChange", 0)),
                    "open": float(item.get("open", 0)),
                    "high": float(item.get("dayHigh", 0)),
                    "low": float(item.get("dayLow", 0)),
                    "prev_close": float(item.get("previousClose", 0)),
                    "volume": int(item.get("totalTradedVolume", 0)),
                })
            result = (results, trade_date)
            _index_cache[cache_key] = result
            return result

        return ([], "")

    async def get_quote(self, symbol: str) -> Optional[dict]:
        cache_key = f"quote_{symbol}"
        if cache_key in _price_cache:
            return _price_cache[cache_key]

        data = await self._fetch(f"{BASE_URL}/api/quote-equity?symbol={symbol}")
        if data and "priceInfo" in data:
            price_info = data["priceInfo"]
            info = data.get("info", {})
            result = {
                "symbol": symbol,
                "company_name": info.get("companyName", ""),
                "ltp": float(price_info.get("lastPrice", 0)),
                "change": float(price_info.get("change", 0)),
                "percent_change": float(price_info.get("pChange", 0)),
                "open": float(price_info.get("open", 0)),
                "high": float(price_info.get("intraDayHighLow", {}).get("max", 0)),
                "low": float(price_info.get("intraDayHighLow", {}).get("min", 0)),
                "prev_close": float(price_info.get("previousClose", 0)),
                "volume": int(data.get("securityWiseDP", {}).get("quantityTraded", 0) or 0),
            }
            _price_cache[cache_key] = result
            return result

        return None

    async def get_index_data(self, index_name: str) -> Optional[dict]:
        """Fetch a specific index value (e.g., NIFTY 50, NIFTY BANK, NIFTY IT)."""
        cache_key = f"idx_{index_name}"
        if cache_key in _price_cache:
            return _price_cache[cache_key]

        encoded = index_name.replace(" ", "%20")
        data = await self._fetch(f"{BASE_URL}/api/equity-stockIndices?index={encoded}")
        if data and "data" in data:
            for item in data["data"]:
                if item.get("symbol") == index_name:
                    result = {
                        "name": index_name,
                        "value": float(item.get("lastPrice", 0)),
                        "change": float(item.get("change", 0)),
                        "percent_change": float(item.get("pChange", 0)),
                        "open": float(item.get("open", 0)),
                        "high": float(item.get("dayHigh", 0)),
                        "low": float(item.get("dayLow", 0)),
                        "prev_close": float(item.get("previousClose", 0)),
                    }
                    _price_cache[cache_key] = result
                    return result
        return None

    async def get_all_indices(self) -> list[dict]:
        """Fetch major index values."""
        indices = ["NIFTY 50", "NIFTY BANK", "NIFTY IT", "NIFTY FINANCIAL SERVICES",
                   "NIFTY PHARMA", "NIFTY AUTO", "NIFTY FMCG", "NIFTY METAL",
                   "NIFTY REALTY", "NIFTY ENERGY"]
        results = []
        for idx in indices:
            data = await self.get_index_data(idx)
            if data:
                results.append(data)
            await asyncio.sleep(0.5)  # Rate limit
        return results

    async def get_sector_performance(self) -> list[dict]:
        """Fetch sector-wise performance for heatmap."""
        sectors = [
            ("NIFTY IT", "IT"),
            ("NIFTY BANK", "Banking"),
            ("NIFTY PHARMA", "Pharma"),
            ("NIFTY AUTO", "Auto"),
            ("NIFTY FMCG", "FMCG"),
            ("NIFTY METAL", "Metal"),
            ("NIFTY REALTY", "Realty"),
            ("NIFTY ENERGY", "Energy"),
            ("NIFTY FINANCIAL SERVICES", "Financial"),
            ("NIFTY MEDIA", "Media"),
        ]
        cache_key = "sectors"
        if cache_key in _index_cache:
            return _index_cache[cache_key]

        results = []
        for index_name, display_name in sectors:
            data = await self.get_index_data(index_name)
            if data:
                results.append({
                    "name": display_name,
                    "index_name": index_name,
                    "value": data["value"],
                    "change": data["change"],
                    "percent_change": data["percent_change"],
                })
            await asyncio.sleep(0.3)

        _index_cache[cache_key] = results
        return results

    async def get_volume_spikes(self, threshold: float = 2.0) -> list[dict]:
        """Find stocks with volume significantly above average from Nifty 500 data."""
        cache_key = "vol_spikes"
        if cache_key in _price_cache:
            return _price_cache[cache_key]

        stocks, _ = await self.get_nifty50_stocks()
        # Sort by volume descending, pick top with high % change
        # Since we don't have historical avg volume, use top volume + high change as proxy
        active = [s for s in stocks if s["volume"] > 0 and abs(s["percent_change"]) > 1.5]
        active.sort(key=lambda x: x["volume"], reverse=True)
        results = active[:10]

        _price_cache[cache_key] = results
        return results

    async def get_fii_dii_data(self) -> Optional[dict]:
        """Fetch FII/DII trading data from NSE."""
        cache_key = "fii_dii"
        if cache_key in _index_cache:
            return _index_cache[cache_key]

        data = await self._fetch(f"{BASE_URL}/api/fiidiiTradeReact")
        if data:
            result = {"fii": {}, "dii": {}}
            for item in data:
                category = item.get("category", "")
                if "FII" in category or "FPI" in category:
                    result["fii"] = {
                        "buy_value": float(item.get("buyValue", 0)),
                        "sell_value": float(item.get("sellValue", 0)),
                        "net_value": float(item.get("netValue", 0)),
                        "date": item.get("date", ""),
                    }
                elif "DII" in category:
                    result["dii"] = {
                        "buy_value": float(item.get("buyValue", 0)),
                        "sell_value": float(item.get("sellValue", 0)),
                        "net_value": float(item.get("netValue", 0)),
                        "date": item.get("date", ""),
                    }
            _index_cache[cache_key] = result
            return result
        return None

    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()


nse = NSEFetcher()
