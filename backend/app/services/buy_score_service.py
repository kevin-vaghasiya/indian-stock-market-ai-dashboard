import httpx
import json
import logging
import os
from cachetools import TTLCache
from typing import Optional
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

CF_ACCOUNT_ID = os.getenv("CF_ACCOUNT_ID", "")
CF_API_KEY = os.getenv("CF_API_KEY", "")
CF_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast"

# Cache buy scores for 2 hours
_score_cache = TTLCache(maxsize=200, ttl=7200)

SYSTEM_PROMPT = """You are an expert Indian stock market analyst. You analyze stocks that are among today's top gainers on NSE.

The user's strategy: Buy top gainers ONLY if:
1. The news driving the price up is genuine (strong quarterly results, big order wins, brokerage upgrades, sector tailwinds - NOT operator-driven pumps or penny stock manipulation)
2. The company is fundamentally sound (decent market cap, reasonable valuation, good management, manageable debt)
3. The stock is worth holding for a few days even if it dips after buying

Also predict the stock's closing price for today and tomorrow based on the news sentiment, fundamentals, and current momentum. These are rough estimates to help the trader plan.

You must return ONLY valid JSON with this exact structure:
{"score": <0-100>, "verdict": "<Strong Buy|Buy|Hold|Avoid>", "news_summary": "<2-3 sentence summary of why the stock is moving today based on the news>", "fundamental_analysis": "<2-3 sentence analysis of the company's fundamentals>", "pros": ["pro1", "pro2"], "cons": ["con1", "con2"], "reasons": ["key reason 1", "key reason 2", "key reason 3"], "predicted_close_today": <number>, "predicted_close_tomorrow": <number>, "prediction_reasoning": "<1-2 sentence explanation of price prediction>"}

Scoring guide:
- 80-100: Strong Buy - Genuine catalyst + excellent fundamentals + safe to hold
- 60-79: Buy - Good catalyst + acceptable fundamentals
- 40-59: Hold - Mixed signals, needs more research
- 0-39: Avoid - Weak fundamentals, suspicious pump, or high risk

Be strict. Most momentum plays should score 40-70. Only truly quality setups score 80+.
Do NOT include any text outside the JSON object."""


def _build_prompt(symbol: str, fundamentals: dict, news: list, price_data: dict) -> str:
    # Format fundamentals
    fund_str = f"""Company: {fundamentals.get('company_name', symbol)}
Symbol: {symbol}
Market Cap: Rs {fundamentals.get('market_cap', 'N/A')} Cr
P/E Ratio: {fundamentals.get('pe_ratio', 'N/A')}
P/B Ratio: {fundamentals.get('pb_ratio', 'N/A')}
ROE: {_fmt_pct(fundamentals.get('roe'))}
ROCE: {_fmt_pct(fundamentals.get('roce'))}
EPS: {fundamentals.get('eps', 'N/A')}
Debt/Equity: {fundamentals.get('debt_to_equity', 'N/A')}
Book Value: {fundamentals.get('book_value', 'N/A')}
52W High: {fundamentals.get('fifty_two_week_high', 'N/A')}
52W Low: {fundamentals.get('fifty_two_week_low', 'N/A')}
Dividend Yield: {fundamentals.get('dividend_yield', 'N/A')}%"""

    # Pros and cons
    pros = fundamentals.get("pros", [])
    cons = fundamentals.get("cons", [])
    if pros:
        fund_str += "\nPros: " + "; ".join(pros[:5])
    if cons:
        fund_str += "\nCons: " + "; ".join(cons[:5])

    # Price data
    price_str = ""
    if price_data:
        price_str = f"""
Current Price: Rs {price_data.get('ltp', 'N/A')}
Today's Change: {price_data.get('percent_change', 0):.2f}%
Open: {price_data.get('open', 'N/A')} | High: {price_data.get('high', 'N/A')} | Low: {price_data.get('low', 'N/A')}
Volume: {price_data.get('volume', 'N/A')}"""

    # News headlines
    news_str = "Recent News:\n"
    if news:
        for n in news[:8]:
            source = f" ({n.get('source', '')})" if n.get('source') else ""
            news_str += f"- {n.get('title', '')}{source}\n"
    else:
        news_str += "- No recent news found\n"

    return f"""Analyze this stock from today's NSE top gainers list and give a buy score:

{fund_str}
{price_str}

{news_str}
Return ONLY the JSON score object."""


def _fmt_pct(val) -> str:
    if val is None:
        return "N/A"
    if isinstance(val, (int, float)):
        if val < 1:  # Already decimal form like 0.15
            return f"{val * 100:.2f}%"
        return f"{val:.2f}%"
    return str(val)


async def compute_buy_score(
    symbol: str,
    fundamentals: dict,
    news: list,
    price_data: dict,
) -> Optional[dict]:
    """Compute buy score using Cloudflare Llama 3.3 70B."""
    cache_key = f"score_{symbol}"
    if cache_key in _score_cache:
        return _score_cache[cache_key]

    if not CF_ACCOUNT_ID or not CF_API_KEY:
        logger.error("Cloudflare credentials not configured")
        return None

    prompt = _build_prompt(symbol, fundamentals, news, price_data)

    url = f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT_ID}/ai/run/{CF_MODEL}"
    headers = {
        "Authorization": f"Bearer {CF_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        "max_tokens": 400,
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(url, headers=headers, json=payload)

        if resp.status_code != 200:
            logger.error(f"Cloudflare API error {resp.status_code}: {resp.text[:200]}")
            return None

        data = resp.json()
        if not data.get("success"):
            logger.error(f"Cloudflare API failed: {data.get('errors')}")
            return None

        response_text = data["result"]["response"]

        # Parse JSON from response (handle both dict and string)
        if isinstance(response_text, dict):
            score_data = response_text
        else:
            # Try to extract JSON from text
            text = response_text.strip()
            # Find JSON object in response
            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0 and end > start:
                text = text[start:end]
            score_data = json.loads(text)

        result = {
            "symbol": symbol,
            "score": int(score_data.get("score", 50)),
            "verdict": score_data.get("verdict", "Hold"),
            "news_summary": score_data.get("news_summary", ""),
            "fundamental_analysis": score_data.get("fundamental_analysis", ""),
            "pros": score_data.get("pros", []),
            "cons": score_data.get("cons", []),
            "reasons": score_data.get("reasons", []),
            "predicted_close_today": score_data.get("predicted_close_today"),
            "predicted_close_tomorrow": score_data.get("predicted_close_tomorrow"),
            "prediction_reasoning": score_data.get("prediction_reasoning", ""),
            "current_price": price_data.get("ltp", 0),
        }

        _score_cache[cache_key] = result

        # Save prediction to database for accuracy tracking
        try:
            from .prediction_service import save_prediction
            await save_prediction(result)
        except Exception as e:
            logger.warning(f"Failed to save prediction for {symbol}: {e}")

        return result

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse LLM response for {symbol}: {e}")
        return None
    except Exception as e:
        logger.error(f"Buy score error for {symbol}: {e}")
        return None


async def compute_batch_scores(stocks: list[dict]) -> list[dict]:
    """Compute buy scores for multiple stocks concurrently."""
    import asyncio

    async def score_one(stock: dict) -> Optional[dict]:
        from .screener_service import get_screener_company_info
        from .news_service import get_stock_news

        symbol = stock["symbol"]
        fundamentals = await get_screener_company_info(symbol)
        if not fundamentals:
            fundamentals = {"company_name": stock.get("company_name", symbol)}

        news = get_stock_news(symbol, max_items=8)

        return await compute_buy_score(symbol, fundamentals, news, stock)

    # Run up to 5 concurrently to avoid rate limits
    results = []
    batch_size = 5
    for i in range(0, len(stocks), batch_size):
        batch = stocks[i:i + batch_size]
        batch_results = await asyncio.gather(*[score_one(s) for s in batch])
        results.extend(batch_results)

    return [r for r in results if r is not None]
