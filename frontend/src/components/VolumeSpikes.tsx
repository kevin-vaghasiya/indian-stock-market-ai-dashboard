"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchVolumeSpikes } from "../lib/api";
import Link from "next/link";

interface SpikeStock {
  symbol: string;
  ltp: number;
  percent_change: number;
  volume: number;
}

function formatTurnover(volume: number, price: number): string {
  const turnover = volume * price; // in rupees
  if (turnover >= 1e9) return `Rs ${(turnover / 1e9).toFixed(0)}B`;  // billions (arab)
  if (turnover >= 1e7) return `Rs ${(turnover / 1e7).toFixed(0)}Cr`;
  if (turnover >= 1e5) return `Rs ${(turnover / 1e5).toFixed(0)}L`;
  return `Rs ${(turnover / 1000).toFixed(0)}K`;
}

export default function VolumeSpikes() {
  const { data: spikes, isLoading } = useQuery({
    queryKey: ["volumeSpikes"],
    queryFn: fetchVolumeSpikes,
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="bg-[#1a1d2e] rounded-lg border border-[#2a2d3e] p-3">
        <div className="text-xs font-semibold text-gray-400 mb-2">Volume Spikes</div>
        <div className="space-y-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-6 bg-[#2a2d3e] rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#1a1d2e] rounded-lg border border-[#2a2d3e] p-3">
      <div className="text-xs font-semibold text-gray-400 mb-2">Volume Spikes</div>
      {!spikes || spikes.length === 0 ? (
        <div className="text-xs text-gray-500">No volume spikes detected</div>
      ) : (
        <div className="space-y-1 max-h-[280px] overflow-y-auto">
          {spikes.map((s: SpikeStock) => (
            <div
              key={s.symbol}
              className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-[#2a2d3e]/30"
            >
              <Link
                href={`/company/${s.symbol}`}
                className="text-[11px] text-[#3b82f6] font-medium hover:underline truncate max-w-[80px]"
              >
                {s.symbol}
              </Link>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-mono ${
                    s.percent_change >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"
                  }`}
                >
                  {s.percent_change >= 0 ? "+" : ""}{s.percent_change.toFixed(1)}%
                </span>
                <span className="text-[10px] font-mono text-yellow-400">
                  {formatTurnover(s.volume, s.ltp)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
