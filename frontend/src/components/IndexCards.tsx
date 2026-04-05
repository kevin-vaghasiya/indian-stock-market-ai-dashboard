"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchIndices } from "../lib/api";

interface IndexData {
  name: string;
  display_name: string;
  value: number;
  change: number;
  percent_change: number;
}

export default function IndexCards() {
  const { data: indices, isLoading } = useQuery({
    queryKey: ["indices"],
    queryFn: fetchIndices,
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="bg-[#1a1d2e] rounded-lg border border-[#2a2d3e] p-3">
        <div className="text-xs font-semibold text-gray-400 mb-2">Market Indices</div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-[#2a2d3e] rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#1a1d2e] rounded-lg border border-[#2a2d3e] p-3">
      <div className="text-xs font-semibold text-gray-400 mb-2">Market Indices</div>
      <div className="overflow-y-auto max-h-[280px] space-y-1.5 pr-1">
        {(indices || []).map((idx: IndexData) => {
          const isUp = idx.percent_change >= 0;
          const label = idx.display_name || idx.name.replace("NIFTY ", "");
          return (
            <div
              key={idx.name}
              className="flex items-center justify-between py-1.5 px-2 rounded bg-[#0f1117] hover:bg-[#2a2d3e]/30 transition-colors"
            >
              <div className="text-xs font-medium text-gray-300 truncate max-w-[110px]">
                {label}
              </div>
              <div className="text-right">
                <div className="text-xs font-mono font-medium">
                  {idx.value.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
                <div
                  className={`text-[10px] font-mono ${
                    isUp ? "text-[#22c55e]" : "text-[#ef4444]"
                  }`}
                >
                  {isUp ? "+" : ""}{idx.percent_change.toFixed(2)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
