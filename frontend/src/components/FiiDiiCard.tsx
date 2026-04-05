"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchFiiDii } from "../lib/api";

function formatCr(val: number): string {
  if (Math.abs(val) >= 100) return `${(val / 100).toFixed(0)}K Cr`;
  return `${val.toFixed(0)} Cr`;
}

function NetBar({ label, buy, sell, net }: { label: string; buy: number; sell: number; net: number }) {
  const total = buy + sell;
  const buyPct = total > 0 ? (buy / total) * 100 : 50;

  return (
    <div className="mb-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-300">{label}</span>
        <span
          className={`text-xs font-mono font-bold ${
            net >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"
          }`}
        >
          {net >= 0 ? "+" : ""}{formatCr(net)}
        </span>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden bg-[#2a2d3e]">
        <div
          className="bg-[#22c55e] transition-all"
          style={{ width: `${buyPct}%` }}
        />
        <div
          className="bg-[#ef4444] transition-all"
          style={{ width: `${100 - buyPct}%` }}
        />
      </div>
      <div className="flex justify-between mt-0.5">
        <span className="text-[10px] text-[#22c55e]">Buy: {formatCr(buy)}</span>
        <span className="text-[10px] text-[#ef4444]">Sell: {formatCr(sell)}</span>
      </div>
    </div>
  );
}

export default function FiiDiiCard() {
  const { data, isLoading } = useQuery({
    queryKey: ["fiiDii"],
    queryFn: fetchFiiDii,
    refetchInterval: 300000, // 5 min
  });

  if (isLoading) {
    return (
      <div className="bg-[#1a1d2e] rounded-lg border border-[#2a2d3e] p-3">
        <div className="text-xs font-semibold text-gray-400 mb-2">FII / DII Activity</div>
        <div className="space-y-3">
          <div className="h-12 bg-[#2a2d3e] rounded animate-pulse" />
          <div className="h-12 bg-[#2a2d3e] rounded animate-pulse" />
        </div>
      </div>
    );
  }

  const fii = data?.fii || {};
  const dii = data?.dii || {};

  if (!fii.buy_value && !dii.buy_value) {
    return (
      <div className="bg-[#1a1d2e] rounded-lg border border-[#2a2d3e] p-3">
        <div className="text-xs font-semibold text-gray-400 mb-2">FII / DII Activity</div>
        <div className="text-xs text-gray-500">Data unavailable</div>
      </div>
    );
  }

  return (
    <div className="bg-[#1a1d2e] rounded-lg border border-[#2a2d3e] p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold text-gray-400">FII / DII Activity</div>
        {fii.date && <div className="text-[10px] text-gray-600">{fii.date}</div>}
      </div>
      <NetBar
        label="FII/FPI"
        buy={fii.buy_value || 0}
        sell={fii.sell_value || 0}
        net={fii.net_value || 0}
      />
      <NetBar
        label="DII"
        buy={dii.buy_value || 0}
        sell={dii.sell_value || 0}
        net={dii.net_value || 0}
      />
    </div>
  );
}
