import feedparser
import logging
from cachetools import TTLCache
from urllib.parse import quote
from email.utils import parsedate_to_datetime

logger = logging.getLogger(__name__)

# Cache news for 15 minutes
_news_cache = TTLCache(maxsize=100, ttl=900)


def get_stock_news(symbol: str, max_items: int = 10) -> list[dict]:
    cache_key = f"news_{symbol}"
    if cache_key in _news_cache:
        return _news_cache[cache_key]

    try:
        query = quote(f"{symbol} stock NSE India")
        url = f"https://news.google.com/rss/search?q={query}&hl=en-IN&gl=IN&ceid=IN:en"
        feed = feedparser.parse(url)

        results = []
        for entry in feed.entries:
            source = ""
            if hasattr(entry, "source") and hasattr(entry.source, "title"):
                source = entry.source.title
            results.append({
                "title": entry.get("title", ""),
                "link": entry.get("link", ""),
                "published": entry.get("published", ""),
                "source": source,
            })

        # Sort by published date descending (latest first)
        def _parse_date(item):
            try:
                return parsedate_to_datetime(item["published"])
            except Exception:
                from datetime import datetime, timezone
                return datetime.min.replace(tzinfo=timezone.utc)

        results.sort(key=_parse_date, reverse=True)
        results = results[:max_items]

        _news_cache[cache_key] = results
        return results
    except Exception as e:
        logger.error(f"News fetch error for {symbol}: {e}")
        return []
