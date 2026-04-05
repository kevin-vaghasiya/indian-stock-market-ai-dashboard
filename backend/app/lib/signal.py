"""Server-side buy signal computation — mirrors frontend/src/lib/signal.ts logic."""


def compute_buy_signal(stock: dict, all_stocks: list, ai_score: int = None) -> dict:
    reasons = []
    score = 0

    pct_change = stock.get("percent_change", 0)
    high = stock.get("high", 0)
    ltp = stock.get("ltp", 0)
    volume = stock.get("volume", 0)
    prev_close = stock.get("prev_close", 0)
    open_price = stock.get("open", 0)

    # RED FLAGS
    if pct_change > 15:
        return {"signal": "RED", "label": "Avoid", "reasons": ["Up >15% — too late, high reversal risk"]}

    if ai_score is not None and ai_score < 40:
        return {"signal": "RED", "label": "Avoid", "reasons": ["AI score below 40"]}

    pct_from_high = ((high - ltp) / high * 100) if high > 0 else 0
    if pct_from_high > 5:
        reasons.append("Price dropped >5% from day high")
        score -= 3

    # GREEN CRITERIA
    if 3 <= pct_change <= 12:
        reasons.append(f"Good day gain: +{pct_change:.1f}%")
        score += 2
    elif pct_change >= 2:
        reasons.append(f"Moderate gain: +{pct_change:.1f}%")
        score += 1
    elif pct_change > 0:
        reasons.append(f"Small gain: +{pct_change:.1f}%")

    if pct_from_high <= 2:
        reasons.append("Near day high — strong buying pressure")
        score += 2
    elif pct_from_high <= 4:
        reasons.append("Slightly off day high")
        score += 1

    if all_stocks:
        volumes = sorted([s.get("volume", 0) for s in all_stocks], reverse=True)
        top30_idx = max(0, int(len(volumes) * 0.3))
        if volume >= volumes[top30_idx] and volume > 0:
            reasons.append("High volume — top 30%")
            score += 2

    gap_pct = ((open_price - prev_close) / prev_close * 100) if prev_close > 0 else 0
    if gap_pct >= 2:
        reasons.append(f"Gap up opening: +{gap_pct:.1f}%")
        score += 1

    if ai_score is not None:
        if ai_score >= 75:
            reasons.append(f"Strong AI score: {ai_score}")
            score += 3
        elif ai_score >= 65:
            reasons.append(f"Good AI score: {ai_score}")
            score += 2
        elif ai_score >= 50:
            reasons.append(f"Moderate AI score: {ai_score}")
            score += 1
        else:
            reasons.append(f"Low AI score: {ai_score}")
            score -= 1

    if score >= 6:
        return {"signal": "GREEN", "label": "Strong Buy", "reasons": reasons}
    if score >= 4:
        return {"signal": "GREEN", "label": "Buy", "reasons": reasons}
    if score >= 2:
        return {"signal": "YELLOW", "label": "Watch", "reasons": reasons}
    if score >= 0:
        return {"signal": "GRAY", "label": "Neutral", "reasons": reasons}
    return {"signal": "RED", "label": "Avoid", "reasons": reasons}
