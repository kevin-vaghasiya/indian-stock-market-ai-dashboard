"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchBuyScore } from "../lib/api";

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

export default function BuyScoreCard({ symbol }: { symbol: string }) {
  const { data: score, isLoading, error } = useQuery({
    queryKey: ["buyScore", symbol],
    queryFn: () => fetchBuyScore(symbol),
    refetchInterval: false,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="bg-[#1a1d2e] rounded-lg border border-[#2a2d3e] p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">
          AI Buy Score
        </h3>
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <div className="animate-spin h-4 w-4 border-2 border-gray-500 border-t-transparent rounded-full" />
          Analyzing with AI...
        </div>
      </div>
    );
  }

  if (error || !score) {
    return (
      <div className="bg-[#1a1d2e] rounded-lg border border-[#2a2d3e] p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-2">
          AI Buy Score
        </h3>
        <div className="text-sm text-gray-500">Score unavailable</div>
      </div>
    );
  }

  return (
    <div className="bg-[#1a1d2e] rounded-lg border border-[#2a2d3e] p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-400">AI Buy Score</h3>
        <div className="text-xs text-gray-500">Powered by Llama 3.3 70B</div>
      </div>

      {/* Score and Verdict */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative w-16 h-16">
          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
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
              strokeDasharray={`${score.score}, 100`}
              className={getScoreColor(score.score)}
            />
          </svg>
          <div
            className={`absolute inset-0 flex items-center justify-center text-lg font-bold ${getScoreColor(
              score.score
            )}`}
          >
            {score.score}
          </div>
        </div>
        <div>
          <div
            className={`inline-block px-3 py-1 rounded-full text-sm font-semibold border ${getVerdictBg(
              score.verdict
            )}`}
          >
            {score.verdict}
          </div>
          <div className="mt-1">
            <div className="w-32 h-1.5 bg-[#2a2d3e] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${getScoreBg(score.score)}`}
                style={{ width: `${score.score}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* News Summary */}
      {score.news_summary && (
        <div className="mb-3 p-3 bg-[#0f1117] rounded border border-[#2a2d3e]">
          <div className="text-xs font-semibold text-gray-400 mb-1">
            News Summary
          </div>
          <p className="text-sm text-gray-300">{score.news_summary}</p>
        </div>
      )}

      {/* Fundamental Analysis */}
      {score.fundamental_analysis && (
        <div className="mb-3 p-3 bg-[#0f1117] rounded border border-[#2a2d3e]">
          <div className="text-xs font-semibold text-gray-400 mb-1">
            Fundamental Analysis
          </div>
          <p className="text-sm text-gray-300">{score.fundamental_analysis}</p>
        </div>
      )}

      {/* Pros and Cons */}
      {(score.pros?.length > 0 || score.cons?.length > 0) && (
        <div className="grid grid-cols-2 gap-3 mb-3">
          {score.pros?.length > 0 && (
            <div className="p-2 bg-[#22c55e]/5 rounded border border-[#22c55e]/20">
              <div className="text-xs font-semibold text-[#22c55e] mb-1">
                Pros
              </div>
              {score.pros.map((p: string, i: number) => (
                <div
                  key={i}
                  className="text-xs text-gray-300 flex gap-1 mb-0.5"
                >
                  <span className="text-[#22c55e] shrink-0">+</span>
                  <span>{p}</span>
                </div>
              ))}
            </div>
          )}
          {score.cons?.length > 0 && (
            <div className="p-2 bg-[#ef4444]/5 rounded border border-[#ef4444]/20">
              <div className="text-xs font-semibold text-[#ef4444] mb-1">
                Cons
              </div>
              {score.cons.map((c: string, i: number) => (
                <div
                  key={i}
                  className="text-xs text-gray-300 flex gap-1 mb-0.5"
                >
                  <span className="text-[#ef4444] shrink-0">-</span>
                  <span>{c}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Price Predictions */}
      {score.predicted_close_today && (
        <div className="p-3 bg-[#3b82f6]/5 rounded border border-[#3b82f6]/20">
          <div className="text-xs font-semibold text-[#3b82f6] mb-2">
            Price Predictions
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-[10px] text-gray-500">Current</div>
              <div className="text-xs font-mono font-semibold">
                {score.current_price?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500">EOD</div>
              <div className={`text-xs font-mono font-semibold ${(score.predicted_close_today || 0) >= (score.current_price || 0) ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                {score.predicted_close_today?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500">Tomorrow</div>
              <div className={`text-xs font-mono font-semibold ${(score.predicted_close_tomorrow || 0) >= (score.current_price || 0) ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                {score.predicted_close_tomorrow?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
          {score.prediction_reasoning && (
            <p className="text-[10px] text-gray-400 mt-1.5">{score.prediction_reasoning}</p>
          )}
        </div>
      )}

      {/* Key Reasons */}
      {score.reasons?.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-gray-400 mb-1">
            Key Reasons
          </div>
          <ul className="space-y-1">
            {score.reasons.map((r: string, i: number) => (
              <li key={i} className="text-xs text-gray-400 flex gap-2">
                <span className="text-gray-500">{i + 1}.</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
