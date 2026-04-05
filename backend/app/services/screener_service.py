import httpx
import re
import logging
from cachetools import TTLCache
from typing import Optional

logger = logging.getLogger(__name__)

SCREENER_BASE = "https://www.screener.in/company"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) "
                  "Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

# Cache company fundamentals for 1 hour
_screener_cache = TTLCache(maxsize=200, ttl=3600)


def _parse_indian_number(val: str) -> Optional[float]:
    """Parse Indian-format numbers like '18,27,560' or '1,612 / 1,115'."""
    if not val or not val.strip():
        return None
    try:
        cleaned = val.strip().replace(",", "")
        return float(cleaned)
    except (ValueError, TypeError):
        return None


def _parse_ratio_section(html: str) -> dict:
    """Extract ratios from the top-ratios section of the screener page."""
    ratios = {}

    # Find the top-ratios section
    match = re.search(r'<ul\s+id=["\']top-ratios["\'][^>]*>(.*?)</ul>', html, re.DOTALL)
    if not match:
        return ratios

    section = match.group(1)

    pairs = re.findall(
        r'<li[^>]*>.*?<span class="name">\s*([^<]+?)\s*</span>'
        r'.*?<span class="(?:number|nowrap value)">\s*([^<]*?)\s*</span>',
        section,
        re.DOTALL,
    )

    for name, value in pairs:
        name = name.strip()
        value = value.strip()
        ratios[name] = value

    return ratios


def _parse_company_name(html: str) -> str:
    """Extract company name from the h1 tag."""
    match = re.search(r'<h1[^>]*>\s*(.*?)\s*</h1>', html, re.DOTALL)
    if match:
        # Strip any inner HTML tags
        name = re.sub(r'<[^>]+>', '', match.group(1)).strip()
        return name
    return ""


def _parse_sector_industry(html: str) -> tuple[str, str]:
    """Try to extract sector and industry from the page if available."""
    sector = ""
    industry = ""

    # Screener sometimes has sector info in the company-ratios or sub-heading area
    sector_match = re.search(
        r'<a[^>]*href="/company/[^"]*/"[^>]*class="[^"]*"[^>]*>\s*([^<]+?)\s*</a>',
        html,
    )
    if sector_match:
        # This is a rough heuristic; screener doesn't always expose sector cleanly
        pass

    return sector, industry


def _parse_description(html: str) -> str:
    """Try to extract company description / about section."""
    match = re.search(
        r'<div[^>]*class="[^"]*about[^"]*"[^>]*>\s*<p>(.*?)</p>',
        html,
        re.DOTALL,
    )
    if match:
        text = re.sub(r'<[^>]+>', '', match.group(1)).strip()
        return text
    return ""


def _parse_pros_cons(html: str) -> tuple[list[str], list[str]]:
    """Extract pros and cons lists from the screener page."""
    pros = []
    cons = []

    pros_start = html.find('<p class="title">Pros</p>')
    cons_start = html.find('<p class="title">Cons</p>')

    if pros_start > 0 and cons_start > 0:
        pros_section = html[pros_start:cons_start]
        raw_pros = re.findall(r'<li[^>]*>(.*?)</li>', pros_section, re.DOTALL)
        for p in raw_pros:
            clean = re.sub(r'<[^>]+>', '', p).strip()
            clean = clean.replace("&#x27;", "'").replace("&amp;", "&")
            if clean:
                pros.append(clean)

    if cons_start > 0:
        cons_section = html[cons_start:cons_start + 3000]
        raw_cons = re.findall(r'<li[^>]*>(.*?)</li>', cons_section, re.DOTALL)
        for c in raw_cons:
            clean = re.sub(r'<[^>]+>', '', c).strip()
            clean = clean.replace("&#x27;", "'").replace("&amp;", "&")
            if clean:
                cons.append(clean)

    return pros, cons


async def get_screener_company_info(symbol: str) -> Optional[dict]:
    """Fetch company fundamentals from screener.in for the given NSE symbol."""
    cache_key = f"screener_{symbol}"
    if cache_key in _screener_cache:
        return _screener_cache[cache_key]

    url = f"{SCREENER_BASE}/{symbol}/"
    try:
        async with httpx.AsyncClient(
            headers=HEADERS,
            timeout=httpx.Timeout(15.0),
            follow_redirects=True,
        ) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                logger.warning(f"Screener returned {resp.status_code} for {symbol}")
                return None

            html = resp.text

        company_name = _parse_company_name(html)
        if not company_name:
            logger.warning(f"Could not parse company name for {symbol}")
            return None

        ratios = _parse_ratio_section(html)
        sector, industry = _parse_sector_industry(html)
        description = _parse_description(html)
        pros, cons = _parse_pros_cons(html)

        # Parse individual ratio values
        market_cap = _parse_indian_number(ratios.get("Market Cap", ""))
        current_price = _parse_indian_number(ratios.get("Current Price", ""))
        stock_pe = _parse_indian_number(ratios.get("Stock P/E", ""))
        book_value = _parse_indian_number(ratios.get("Book Value", ""))
        dividend_yield = _parse_indian_number(ratios.get("Dividend Yield", ""))
        roce_pct = _parse_indian_number(ratios.get("ROCE", ""))
        roe_pct = _parse_indian_number(ratios.get("ROE", ""))
        face_value = _parse_indian_number(ratios.get("Face Value", ""))

        # Parse High / Low (52 week)
        # In HTML it's: <span class="number">1,612</span> / <span class="number">1,115</span>
        # The regex only captures first number, so parse directly from HTML
        fifty_two_week_high = 0.0
        fifty_two_week_low = 0.0
        hl_match = re.search(
            r'High / Low.*?<span class="number">([\d,\.]+)</span>\s*/\s*<span class="number">([\d,\.]+)</span>',
            html, re.DOTALL
        )
        if hl_match:
            fifty_two_week_high = _parse_indian_number(hl_match.group(1)) or 0.0
            fifty_two_week_low = _parse_indian_number(hl_match.group(2)) or 0.0

        # Convert percentage values to decimals
        roe = (roe_pct / 100.0) if roe_pct is not None else None
        roce = (roce_pct / 100.0) if roce_pct is not None else None

        # Derive P/B ratio from current price and book value
        pb_ratio = None
        if current_price and book_value and book_value > 0:
            pb_ratio = round(current_price / book_value, 2)

        # Derive EPS from current price and P/E
        eps = None
        if current_price and stock_pe and stock_pe > 0:
            eps = round(current_price / stock_pe, 2)

        result = {
            "symbol": symbol,
            "company_name": company_name,
            "sector": sector,
            "industry": industry,
            "market_cap": market_cap or 0,
            "pe_ratio": stock_pe,
            "pb_ratio": pb_ratio,
            "dividend_yield": dividend_yield,
            "eps": eps,
            "debt_to_equity": None,  # Not directly on the top-ratios section
            "roe": roe,
            "roce": roce,
            "book_value": book_value,
            "face_value": face_value,
            "fifty_two_week_high": fifty_two_week_high,
            "fifty_two_week_low": fifty_two_week_low,
            "current_price": current_price or 0,
            "description": description,
            "pros": pros,
            "cons": cons,
        }

        _screener_cache[cache_key] = result
        return result

    except httpx.TimeoutException:
        logger.error(f"Timeout fetching screener data for {symbol}")
        return None
    except Exception as e:
        logger.error(f"Screener fetch error for {symbol}: {e}")
        return None
