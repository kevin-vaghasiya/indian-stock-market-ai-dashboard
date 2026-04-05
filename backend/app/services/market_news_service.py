import feedparser
import logging
from cachetools import TTLCache
from urllib.parse import quote
from email.utils import parsedate_to_datetime

logger = logging.getLogger(__name__)

# Cache market news for 10 minutes
_market_news_cache = TTLCache(maxsize=5, ttl=600)


def get_market_news(max_items: int = 15) -> list[dict]:
    """Fetch broad Indian market and global finance news."""
    cache_key = "market_news"
    if cache_key in _market_news_cache:
        return _market_news_cache[cache_key]

    try:
        query = quote("Indian stock market OR Nifty OR Sensex OR RBI OR global markets OR economy India")
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

        # Sort by date descending
        def _parse_date(item):
            try:
                return parsedate_to_datetime(item["published"])
            except Exception:
                from datetime import datetime, timezone
                return datetime.min.replace(tzinfo=timezone.utc)

        results.sort(key=_parse_date, reverse=True)
        results = results[:max_items]

        _market_news_cache[cache_key] = results
        return results
    except Exception as e:
        logger.error(f"Market news fetch error: {e}")
        return []
