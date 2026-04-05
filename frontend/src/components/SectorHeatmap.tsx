"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchSectors } from "../lib/api";

interface SectorData {
  name: string;
  percent_change: number;
  value: number;
}

function getHeatColor(pct: number): string {
  if (pct >= 2) return "bg-[#166534] text-[#22c55e]";
  if (pct >= 1) return "bg-[#14532d] text-[#4ade80]";
  if (pct >= 0.3) return "bg-[#1a3a2a] text-[#86efac]";
  if (pct >= -0.3) return "bg-[#2a2d3e] text-gray-400";
  if (pct >= -1) return "bg-[#3b1a1a] text-[#fca5a5]";
  if (pct >= -2) return "bg-[#4c1d1d] text-[#f87171]";
  return "bg-[#7f1d1d] text-[#ef4444]";
}

export default function SectorHeatmap() {
  const { data: sectors, isLoading } = useQuery({
    queryKey: ["sectors"],
    queryFn: fetchSectors,
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="bg-[#1a1d2e] rounded-lg border border-[#2a2d3e] p-3">
        <div className="text-xs font-semibold text-gray-400 mb-2">Sector Heatmap</div>
        <div className="grid grid-cols-2 gap-1">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-12 bg-[#2a2d3e] rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#1a1d2e] rounded-lg border border-[#2a2d3e] p-3">
      <div className="text-xs font-semibold text-gray-400 mb-2">Sector Heatmap</div>
      <div className="overflow-y-auto max-h-[300px] pr-1">
        <div className="grid grid-cols-2 gap-1">
          {(sectors || []).map((s: SectorData) => (
            <div
              key={s.name}
              className={`rounded px-2 py-2 text-center ${getHeatColor(s.percent_change)}`}
            >
              <div className="text-[10px] font-medium truncate">{s.name}</div>
              <div className="text-xs font-mono font-bold">
                {s.percent_change >= 0 ? "+" : ""}{s.percent_change.toFixed(2)}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
