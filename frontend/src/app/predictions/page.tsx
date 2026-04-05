"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchPredictionStats, fetchRecentPredictions } from "../../lib/api";
import Link from "next/link";

function StatCard({
  label,
  value,
  subtext,
  color,
}: {
  label: string;
  value: string;
  subtext?: string;
  color?: string;
}) {
  return (
    <div className="bg-[#1a1d2e] rounded-lg border border-[#2a2d3e] p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-2xl font-bold font-mono mt-1 ${color || "text-white"}`}>
        {value}
      </div>
      {subtext && <div className="text-xs text-gray-500 mt-0.5">{subtext}</div>}
    </div>
  );
}

export default function PredictionsPage() {
  const { data: stats } = useQuery({
    queryKey: ["predictionStats"],
    queryFn: fetchPredictionStats,
    refetchInterval: 60000,
  });

  const { data: predictions, isLoading } = useQuery({
    queryKey: ["recentPredictions"],
    queryFn: () => fetchRecentPredictions(50),
    refetchInterval: 60000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Prediction Accuracy</h1>
        <p className="text-sm text-gray-400 mt-1">
          Track how accurate our AI predictions are over time
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard
          label="Total Predictions"
          value={String(stats?.total_predictions || 0)}
        />
        <StatCard
          label="EOD Direction Accuracy"
          value={`${stats?.today_direction_accuracy || 0}%`}
          color={
            (stats?.today_direction_accuracy || 0) >= 60
              ? "text-[#22c55e]"
              : (stats?.today_direction_accuracy || 0) >= 40
              ? "text-yellow-400"
              : "text-[#ef4444]"
          }
          subtext="Predicted up/down correctly"
        />
        <StatCard
          label="Next Day Direction"
          value={`${stats?.tomorrow_direction_accuracy || 0}%`}
          color={
            (stats?.tomorrow_direction_accuracy || 0) >= 60
              ? "text-[#22c55e]"
              : (stats?.tomorrow_direction_accuracy || 0) >= 40
              ? "text-yellow-400"
              : "text-[#ef4444]"
          }
          subtext="Predicted up/down correctly"
        />
        <StatCard
          label="Avg EOD Error"
          value={`${stats?.avg_today_error_pct || 0}%`}
          subtext="Price deviation from prediction"
        />
        <StatCard
          label="Avg Next Day Error"
          value={`${stats?.avg_tomorrow_error_pct || 0}%`}
          subtext="Price deviation from prediction"
        />
      </div>

      {/* Predictions Table */}
      <div className="bg-[#1a1d2e] rounded-lg border border-[#2a2d3e]">
        <div className="px-4 py-3 border-b border-[#2a2d3e]">
          <h3 className="text-sm font-semibold text-gray-400">
            Recent Predictions
          </h3>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading predictions...</div>
        ) : !predictions || predictions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-lg mb-2">No predictions yet</div>
            <div className="text-sm">
              View stocks on the{" "}
              <Link href="/" className="text-[#3b82f6] hover:underline">
                Dashboard
              </Link>{" "}
              to generate AI predictions.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-xs border-b border-[#2a2d3e]">
                  <th className="text-left px-4 py-2">Date</th>
                  <th className="text-left px-4 py-2">Symbol</th>
                  <th className="text-center px-3 py-2">Score</th>
                  <th className="text-right px-4 py-2">Price at Prediction</th>
                  <th className="text-right px-4 py-2">Predicted EOD</th>
                  <th className="text-right px-4 py-2">Actual EOD</th>
                  <th className="text-center px-3 py-2">EOD Result</th>
                  <th className="text-right px-4 py-2">Predicted Next Day</th>
                  <th className="text-right px-4 py-2">Actual Next Day</th>
                  <th className="text-center px-3 py-2">Next Day Result</th>
                </tr>
              </thead>
              <tbody>
                {predictions.map((p: any, i: number) => (
                  <tr
                    key={`${p.symbol}-${p.date}-${i}`}
                    className="border-b border-[#2a2d3e]/50 hover:bg-[#2a2d3e]/30 transition-colors"
                  >
                    <td className="px-4 py-2.5 text-gray-400 text-xs">
                      {p.date}
                    </td>
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/company/${p.symbol}`}
                        className="text-[#3b82f6] font-medium hover:underline"
                      >
                        {p.symbol}
                      </Link>
                    </td>
                    <td className="text-center px-3 py-2.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                          p.score >= 80
                            ? "bg-[#22c55e]/20 text-[#22c55e]"
                            : p.score >= 60
                            ? "bg-[#84cc16]/20 text-[#84cc16]"
                            : p.score >= 40
                            ? "bg-yellow-400/20 text-yellow-400"
                            : "bg-[#ef4444]/20 text-[#ef4444]"
                        }`}
                      >
                        {p.score}
                      </span>
                    </td>
                    <td className="text-right px-4 py-2.5 font-mono">
                      {p.current_price?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="text-right px-4 py-2.5 font-mono text-gray-400">
                      {p.predicted_close_today?.toLocaleString("en-IN", { minimumFractionDigits: 2 }) || "-"}
                    </td>
                    <td className="text-right px-4 py-2.5 font-mono">
                      {p.actual_close_today
                        ? p.actual_close_today.toLocaleString("en-IN", { minimumFractionDigits: 2 })
                        : <span className="text-gray-600">Pending</span>}
                    </td>
                    <td className="text-center px-3 py-2.5">
                      {p.today_direction_correct === true ? (
                        <span className="text-[#22c55e] font-bold text-xs">CORRECT</span>
                      ) : p.today_direction_correct === false ? (
                        <span className="text-[#ef4444] font-bold text-xs">WRONG</span>
                      ) : (
                        <span className="text-gray-600 text-xs">-</span>
                      )}
                      {p.today_error_pct != null && (
                        <div className="text-[10px] text-gray-500">{p.today_error_pct}% err</div>
                      )}
                    </td>
                    <td className="text-right px-4 py-2.5 font-mono text-gray-400">
                      {p.predicted_close_tomorrow?.toLocaleString("en-IN", { minimumFractionDigits: 2 }) || "-"}
                    </td>
                    <td className="text-right px-4 py-2.5 font-mono">
                      {p.actual_close_tomorrow
                        ? p.actual_close_tomorrow.toLocaleString("en-IN", { minimumFractionDigits: 2 })
                        : <span className="text-gray-600">Pending</span>}
                    </td>
                    <td className="text-center px-3 py-2.5">
                      {p.tomorrow_direction_correct === true ? (
                        <span className="text-[#22c55e] font-bold text-xs">CORRECT</span>
                      ) : p.tomorrow_direction_correct === false ? (
                        <span className="text-[#ef4444] font-bold text-xs">WRONG</span>
                      ) : (
                        <span className="text-gray-600 text-xs">-</span>
                      )}
                      {p.tomorrow_error_pct != null && (
                        <div className="text-[10px] text-gray-500">{p.tomorrow_error_pct}% err</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="text-xs text-gray-600 text-center">
        Predictions are auto-verified when actual EOD prices become available.
        Direction accuracy tracks whether the AI correctly predicted if the stock would go up or down.
      </div>
    </div>
  );
}
