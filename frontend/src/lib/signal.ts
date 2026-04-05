export type SignalType = "GREEN" | "YELLOW" | "RED" | "GRAY";

export interface BuySignal {
  signal: SignalType;
  label: string;
  reasons: string[];
}

interface StockData {
  symbol: string;
  ltp: number;
  change: number;
  percent_change: number;
  open: number;
  high: number;
  low: number;
  prev_close: number;
  volume: number;
}

export function computeBuySignal(
  stock: StockData,
  allStocks: StockData[],
  aiScore?: number
): BuySignal {
  const reasons: string[] = [];
  let score = 0; // internal points system

  const pctChange = stock.percent_change;
  const high = stock.high;
  const ltp = stock.ltp;
  const volume = stock.volume;

  // --- RED FLAGS (instant avoid) ---

  if (pctChange > 15) {
    return {
      signal: "RED",
      label: "Avoid",
      reasons: ["Up >15% — too late, high reversal risk"],
    };
  }

  if (aiScore !== undefined && aiScore < 40) {
    return {
      signal: "RED",
      label: "Avoid",
      reasons: ["AI score below 40 — weak fundamentals or suspicious catalyst"],
    };
  }

  // Price fading from day high (momentum dying)
  const pctFromHigh = high > 0 ? ((high - ltp) / high) * 100 : 0;
  if (pctFromHigh > 5) {
    reasons.push("Price dropped >5% from day high — momentum fading");
    score -= 3;
  }

  // --- GREEN CRITERIA ---

  // 1. Meaningful gain (3-12%)
  if (pctChange >= 3 && pctChange <= 12) {
    reasons.push(`Good day gain: +${pctChange.toFixed(1)}%`);
    score += 2;
  } else if (pctChange >= 2) {
    reasons.push(`Moderate gain: +${pctChange.toFixed(1)}%`);
    score += 1;
  } else if (pctChange > 0) {
    reasons.push(`Small gain: +${pctChange.toFixed(1)}%`);
  }

  // 2. Price near day high (buying pressure intact)
  if (pctFromHigh <= 2) {
    reasons.push("Near day high — strong buying pressure");
    score += 2;
  } else if (pctFromHigh <= 4) {
    reasons.push("Slightly off day high");
    score += 1;
  }

  // 3. Volume in top 30% of all stocks
  if (allStocks.length > 0) {
    const volumes = allStocks.map((s) => s.volume).sort((a, b) => b - a);
    const top30Index = Math.floor(volumes.length * 0.3);
    const top30Threshold = volumes[top30Index] || 0;
    if (volume >= top30Threshold && volume > 0) {
      reasons.push("High volume — top 30% of market");
      score += 2;
    }
  }

  // 4. Gap up opening (opened above prev close)
  const gapPct =
    stock.prev_close > 0
      ? ((stock.open - stock.prev_close) / stock.prev_close) * 100
      : 0;
  if (gapPct >= 2) {
    reasons.push(`Gap up opening: +${gapPct.toFixed(1)}%`);
    score += 1;
  }

  // 5. AI score (if available)
  if (aiScore !== undefined) {
    if (aiScore >= 75) {
      reasons.push(`Strong AI score: ${aiScore}`);
      score += 3;
    } else if (aiScore >= 65) {
      reasons.push(`Good AI score: ${aiScore}`);
      score += 2;
    } else if (aiScore >= 50) {
      reasons.push(`Moderate AI score: ${aiScore}`);
      score += 1;
    } else {
      reasons.push(`Low AI score: ${aiScore}`);
      score -= 1;
    }
  }

  // --- DETERMINE SIGNAL ---

  if (score >= 6) {
    return { signal: "GREEN", label: "Strong Buy", reasons };
  }
  if (score >= 4) {
    return { signal: "GREEN", label: "Buy", reasons };
  }
  if (score >= 2) {
    return { signal: "YELLOW", label: "Watch", reasons };
  }
  if (score >= 0) {
    return { signal: "GRAY", label: "Neutral", reasons };
  }
  return { signal: "RED", label: "Avoid", reasons };
}
