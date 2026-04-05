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

function formatVolume(v: number): string {
  if (v >= 10000000) return `${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
  return String(v);
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
        <div className="space-y-1">
          {spikes.slice(0, 6).map((s: SpikeStock) => (
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
                  {formatVolume(s.volume)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
