"use client";

interface ScoreData {
  symbol: string;
  score: number;
  verdict: string;
  news_summary?: string;
  fundamental_analysis?: string;
  pros?: string[];
  cons?: string[];
  reasons?: string[];
  current_price?: number;
  predicted_close_today?: number;
  predicted_close_tomorrow?: number;
  prediction_reasoning?: string;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-[#22c55e]";
  if (score >= 60) return "text-[#84cc16]";
  if (score >= 40) return "text-yellow-400";
  return "text-[#ef4444]";
}

function getScoreBg(score: number): string {
  if (score >= 80) return "bg-[#22c55e]";
  if (score >= 60) return "bg-[#84cc16]";
  if (score >= 40) return "bg-yellow-400";
  return "bg-[#ef4444]";
}

function getVerdictBg(verdict: string): string {
  switch (verdict) {
    case "Strong Buy":
      return "bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/30";
    case "Buy":
      return "bg-[#84cc16]/15 text-[#84cc16] border-[#84cc16]/30";
    case "Hold":
      return "bg-yellow-400/15 text-yellow-400 border-yellow-400/30";
    case "Avoid":
      return "bg-[#ef4444]/15 text-[#ef4444] border-[#ef4444]/30";
    default:
      return "bg-gray-500/15 text-gray-400 border-gray-500/30";
  }
}

export default function ScoreModal({
  data,
  onClose,
}: {
  data: ScoreData;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-xl w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2d3e]">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12">
              <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#2a2d3e"
                  strokeWidth="3"
                />
                <path
                  d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray={`${data.score}, 100`}
                  className={getScoreColor(data.score)}
                />
              </svg>
              <div
                className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${getScoreColor(
                  data.score
                )}`}
              >
                {data.score}
              </div>
            </div>
            <div>
              <div className="text-white font-bold text-lg">{data.symbol}</div>
              <div
                className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold border ${getVerdictBg(
                  data.verdict
                )}`}
              >
                {data.verdict}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white text-xl px-2"
          >
            x
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Score Bar */}
          <div className="w-full h-2 bg-[#2a2d3e] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${getScoreBg(data.score)}`}
              style={{ width: `${data.score}%` }}
            />
          </div>

          {/* News Summary */}
          {data.news_summary && (
            <div className="p-3 bg-[#0f1117] rounded-lg border border-[#2a2d3e]">
              <div className="text-xs font-semibold text-[#3b82f6] mb-1.5">
                News Summary
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">
                {data.news_summary}
              </p>
            </div>
          )}

          {/* Fundamental Analysis */}
          {data.fundamental_analysis && (
            <div className="p-3 bg-[#0f1117] rounded-lg border border-[#2a2d3e]">
              <div className="text-xs font-semibold text-[#3b82f6] mb-1.5">
                Fundamental Analysis
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">
                {data.fundamental_analysis}
              </p>
            </div>
          )}

          {/* Pros and Cons */}
          {(data.pros?.length || data.cons?.length) ? (
            <div className="grid grid-cols-2 gap-3">
              {data.pros && data.pros.length > 0 && (
                <div className="p-3 bg-[#22c55e]/5 rounded-lg border border-[#22c55e]/20">
                  <div className="text-xs font-semibold text-[#22c55e] mb-2">
                    Pros
                  </div>
                  {data.pros.map((p, i) => (
                    <div key={i} className="text-xs text-gray-300 flex gap-1.5 mb-1">
                      <span className="text-[#22c55e] shrink-0">+</span>
                      <span>{p}</span>
                    </div>
                  ))}
                </div>
              )}
              {data.cons && data.cons.length > 0 && (
                <div className="p-3 bg-[#ef4444]/5 rounded-lg border border-[#ef4444]/20">
                  <div className="text-xs font-semibold text-[#ef4444] mb-2">
                    Cons
                  </div>
                  {data.cons.map((c, i) => (
                    <div key={i} className="text-xs text-gray-300 flex gap-1.5 mb-1">
                      <span className="text-[#ef4444] shrink-0">-</span>
                      <span>{c}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {/* Price Predictions */}
          {data.predicted_close_today && (
            <div className="p-3 bg-[#3b82f6]/5 rounded-lg border border-[#3b82f6]/20">
              <div className="text-xs font-semibold text-[#3b82f6] mb-2">
                Price Predictions
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-xs text-gray-500">Current</div>
                  <div className="text-sm font-mono font-semibold text-white">
                    {data.current_price?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">EOD Predicted</div>
                  <div
                    className={`text-sm font-mono font-semibold ${
                      (data.predicted_close_today || 0) >= (data.current_price || 0)
                        ? "text-[#22c55e]"
                        : "text-[#ef4444]"
                    }`}
                  >
                    {data.predicted_close_today?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Tomorrow</div>
                  <div
                    className={`text-sm font-mono font-semibold ${
                      (data.predicted_close_tomorrow || 0) >= (data.current_price || 0)
                        ? "text-[#22c55e]"
                        : "text-[#ef4444]"
                    }`}
                  >
                    {data.predicted_close_tomorrow?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
              {data.prediction_reasoning && (
                <p className="text-xs text-gray-400 mt-2">
                  {data.prediction_reasoning}
                </p>
              )}
            </div>
          )}

          {/* Key Reasons */}
          {data.reasons && data.reasons.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-400 mb-2">
                Key Reasons
              </div>
              <ul className="space-y-1.5">
                {data.reasons.map((r, i) => (
                  <li key={i} className="text-sm text-gray-300 flex gap-2">
                    <span className="text-gray-500 shrink-0">{i + 1}.</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="text-xs text-gray-600 text-center pt-2">
            Powered by Llama 3.3 70B via Cloudflare Workers AI
          </div>
        </div>
      </div>
    </div>
  );
}
