"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchBotStats,
  fetchBotPositions,
  fetchBotOrders,
  fetchBotLogs,
  fetchBotCompletedTrades,
  runBot,
  checkBotSells,
  resetBot,
} from "../../lib/api";
import Link from "next/link";
import { useState } from "react";

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="bg-[#1a1d2e] rounded-lg border border-[#2a2d3e] p-3">
      <div className="text-[10px] text-gray-500">{label}</div>
      <div className={`text-lg font-bold font-mono ${color || "text-white"}`}>
        {value}
      </div>
    </div>
  );
}

export default function BotPage() {
  const queryClient = useQueryClient();
  const [actionMsg, setActionMsg] = useState("");

  const { data: stats } = useQuery({
    queryKey: ["botStats"],
    queryFn: fetchBotStats,
    refetchInterval: 30000,
  });

  const { data: positions } = useQuery({
    queryKey: ["botPositions"],
    queryFn: fetchBotPositions,
    refetchInterval: 30000,
  });

  const { data: orders } = useQuery({
    queryKey: ["botOrders"],
    queryFn: () => fetchBotOrders(30),
  });

  const { data: completedTrades } = useQuery({
    queryKey: ["botCompleted"],
    queryFn: () => fetchBotCompletedTrades(20),
  });

  const { data: logs } = useQuery({
    queryKey: ["botLogs"],
    queryFn: () => fetchBotLogs(50),
    refetchInterval: 10000,
  });

  const runMutation = useMutation({
    mutationFn: runBot,
    onSuccess: (data) => {
      setActionMsg(data.message || "Bot scan complete");
      queryClient.invalidateQueries({ queryKey: ["botStats"] });
      queryClient.invalidateQueries({ queryKey: ["botPositions"] });
      queryClient.invalidateQueries({ queryKey: ["botOrders"] });
      queryClient.invalidateQueries({ queryKey: ["botLogs"] });
    },
    onError: () => setActionMsg("Bot run failed"),
  });

  const sellMutation = useMutation({
    mutationFn: checkBotSells,
    onSuccess: (data) => {
      setActionMsg(data.message || "Sell check complete");
      queryClient.invalidateQueries({ queryKey: ["botStats"] });
      queryClient.invalidateQueries({ queryKey: ["botPositions"] });
      queryClient.invalidateQueries({ queryKey: ["botOrders"] });
      queryClient.invalidateQueries({ queryKey: ["botLogs"] });
    },
    onError: () => setActionMsg("Sell check failed"),
  });

  const resetMutation = useMutation({
    mutationFn: resetBot,
    onSuccess: () => {
      setActionMsg("Bot reset to Rs 10,00,000");
      queryClient.invalidateQueries();
    },
    onError: () => setActionMsg("Bot reset failed"),
  });

  const pnl = (stats?.total_value || 0) - (stats?.initial_balance || 1000000);
  const pnlPct = stats?.initial_balance
    ? ((pnl / stats.initial_balance) * 100).toFixed(2)
    : "0";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Trading Bot</h1>
          <p className="text-sm text-gray-400 mt-1">
            Autonomous paper trading — buys Strong Buy signals, sells at 5-7%
            profit
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => runMutation.mutate()}
            disabled={runMutation.isPending}
            className="px-4 py-2 bg-[#22c55e] hover:bg-[#16a34a] text-white text-sm font-semibold rounded disabled:opacity-50 transition-colors"
          >
            {runMutation.isPending ? "Scanning..." : "Run Bot"}
          </button>
          <button
            onClick={() => sellMutation.mutate()}
            disabled={sellMutation.isPending}
            className="px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-sm font-semibold rounded disabled:opacity-50 transition-colors"
          >
            {sellMutation.isPending ? "Checking..." : "Check Sells"}
          </button>
          <button
            onClick={() => {
              if (confirm("Reset bot? This clears all trades and resets to Rs 10L.")) {
                resetMutation.mutate();
              }
            }}
            className="px-3 py-2 bg-[#2a2d3e] hover:bg-[#ef4444]/20 text-gray-400 hover:text-[#ef4444] text-sm rounded transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className="bg-[#3b82f6]/10 text-[#3b82f6] text-sm px-4 py-2 rounded border border-[#3b82f6]/20">
          {actionMsg}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
        <StatCard label="Cash" value={`Rs ${(stats?.cash_balance || 0).toLocaleString("en-IN")}`} />
        <StatCard label="Invested (Cost)" value={`Rs ${(stats?.invested || 0).toLocaleString("en-IN")}`} />
        <StatCard label="Current Value" value={`Rs ${(stats?.current_value || 0).toLocaleString("en-IN")}`} />
        <StatCard label="Total Value" value={`Rs ${(stats?.total_value || 0).toLocaleString("en-IN")}`} />
        <StatCard
          label="Unrealized P&L"
          value={`${(stats?.unrealized_pnl || 0) >= 0 ? "+" : ""}Rs ${(stats?.unrealized_pnl || 0).toLocaleString("en-IN")}`}
          color={(stats?.unrealized_pnl || 0) >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}
        />
        <StatCard
          label="Realized P&L"
          value={`${(stats?.realized_pnl || 0) >= 0 ? "+" : ""}Rs ${(stats?.realized_pnl || 0).toLocaleString("en-IN")}`}
          color={(stats?.realized_pnl || 0) >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}
        />
        <StatCard
          label="Total P&L"
          value={`${pnl >= 0 ? "+" : ""}Rs ${pnl.toLocaleString("en-IN")}`}
          color={pnl >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}
        />
        <StatCard
          label="Win Rate"
          value={`${stats?.win_rate || 0}%`}
          color={(stats?.win_rate || 0) >= 60 ? "text-[#22c55e]" : (stats?.win_rate || 0) >= 40 ? "text-yellow-400" : "text-[#ef4444]"}
        />
        <StatCard label="Trades (W/L)" value={`${stats?.wins || 0} / ${stats?.losses || 0}`} />
        <StatCard label="Open Positions" value={String(stats?.open_positions || 0)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Open Positions */}
        <div className="lg:col-span-2 bg-[#1a1d2e] rounded-lg border border-[#2a2d3e]">
          <div className="px-4 py-3 border-b border-[#2a2d3e]">
            <h3 className="text-sm font-semibold text-gray-400">Open Positions</h3>
          </div>
          {!positions || positions.length === 0 ? (
            <div className="p-4 text-sm text-gray-500">No open positions. Click "Run Bot" to start.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 text-xs border-b border-[#2a2d3e]">
                    <th className="text-left px-3 py-2">Symbol</th>
                    <th className="text-right px-3 py-2">Qty</th>
                    <th className="text-right px-3 py-2">Buy</th>
                    <th className="text-right px-3 py-2">LTP</th>
                    <th className="text-right px-3 py-2">P&L</th>
                    <th className="text-right px-3 py-2">Target</th>
                    <th className="text-center px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((p: any) => (
                    <tr key={p.symbol} className="border-b border-[#2a2d3e]/50 hover:bg-[#2a2d3e]/30">
                      <td className="px-3 py-2">
                        <Link href={`/company/${p.symbol}`} className="text-[#3b82f6] font-medium hover:underline text-xs">
                          {p.symbol}
                        </Link>
                        <div className="text-[10px] text-gray-500">AI: {p.ai_score}</div>
                      </td>
                      <td className="text-right px-3 py-2 font-mono text-xs">{p.quantity}</td>
                      <td className="text-right px-3 py-2 font-mono text-xs">{p.buy_price}</td>
                      <td className="text-right px-3 py-2 font-mono text-xs">{p.current_price}</td>
                      <td className={`text-right px-3 py-2 font-mono text-xs font-semibold ${p.pnl >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                        {p.pnl >= 0 ? "+" : ""}Rs {p.pnl.toLocaleString("en-IN")}
                        <div className="text-[10px]">{p.pnl_pct >= 0 ? "+" : ""}{p.pnl_pct.toFixed(1)}%</div>
                      </td>
                      <td className="text-right px-3 py-2 font-mono text-[10px] text-gray-400">
                        {p.target_min} - {p.target_max}
                      </td>
                      <td className="text-center px-3 py-2">
                        {p.trailing_active ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-400/15 text-yellow-400">Trailing</span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#3b82f6]/15 text-[#3b82f6]">Holding</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Activity Log */}
        <div className="bg-[#1a1d2e] rounded-lg border border-[#2a2d3e] flex flex-col max-h-[500px]">
          <div className="px-4 py-3 border-b border-[#2a2d3e] shrink-0">
            <h3 className="text-sm font-semibold text-gray-400">Activity Log</h3>
          </div>
          <div className="overflow-y-auto flex-1 divide-y divide-[#2a2d3e]/30">
            {!logs || logs.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">No activity yet</div>
            ) : (
              logs.map((l: any, i: number) => {
                const actionColor =
                  l.action === "BUY" ? "text-[#22c55e]" :
                  l.action === "SELL" ? "text-[#ef4444]" :
                  l.action === "TRAILING" ? "text-yellow-400" :
                  "text-gray-400";
                return (
                  <div key={`${l.timestamp}-${i}`} className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold ${actionColor}`}>{l.action}</span>
                      {l.symbol && <span className="text-[10px] text-[#3b82f6]">{l.symbol}</span>}
                    </div>
                    <div className="text-[10px] text-gray-500">{l.details}</div>
                    <div className="text-[9px] text-gray-600">
                      {l.timestamp ? new Date(l.timestamp).toLocaleString("en-IN") : ""}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Trade History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Orders */}
        <div className="bg-[#1a1d2e] rounded-lg border border-[#2a2d3e]">
          <div className="px-4 py-3 border-b border-[#2a2d3e]">
            <h3 className="text-sm font-semibold text-gray-400">Recent Orders</h3>
          </div>
          {!orders || orders.length === 0 ? (
            <div className="p-4 text-sm text-gray-500">No orders yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 text-[10px] border-b border-[#2a2d3e]">
                    <th className="text-left px-3 py-2">Time</th>
                    <th className="text-left px-3 py-2">Symbol</th>
                    <th className="text-left px-3 py-2">Side</th>
                    <th className="text-right px-3 py-2">Qty</th>
                    <th className="text-right px-3 py-2">Price</th>
                    <th className="text-right px-3 py-2">P&L</th>
                    <th className="text-left px-3 py-2">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o: any, i: number) => (
                    <tr key={`${o.timestamp}-${i}`} className="border-b border-[#2a2d3e]/50">
                      <td className="px-3 py-1.5 text-gray-500">
                        {o.timestamp ? new Date(o.timestamp).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
                      </td>
                      <td className="px-3 py-1.5 font-medium">{o.symbol}</td>
                      <td className={`px-3 py-1.5 font-bold ${o.side === "BUY" ? "text-[#22c55e]" : "text-[#ef4444]"}`}>{o.side}</td>
                      <td className="text-right px-3 py-1.5 font-mono">{o.quantity}</td>
                      <td className="text-right px-3 py-1.5 font-mono">Rs {o.price?.toFixed(2)}</td>
                      <td className={`text-right px-3 py-1.5 font-mono ${(o.profit || 0) >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                        {o.profit != null ? `${o.profit >= 0 ? "+" : ""}Rs ${o.profit.toFixed(0)}` : "-"}
                      </td>
                      <td className="px-3 py-1.5 text-gray-500 max-w-[150px] truncate">{o.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Completed Trades */}
        <div className="bg-[#1a1d2e] rounded-lg border border-[#2a2d3e]">
          <div className="px-4 py-3 border-b border-[#2a2d3e]">
            <h3 className="text-sm font-semibold text-gray-400">Completed Trades</h3>
          </div>
          {!completedTrades || completedTrades.length === 0 ? (
            <div className="p-4 text-sm text-gray-500">No completed trades yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 text-[10px] border-b border-[#2a2d3e]">
                    <th className="text-left px-3 py-2">Symbol</th>
                    <th className="text-right px-3 py-2">Buy</th>
                    <th className="text-right px-3 py-2">Sell</th>
                    <th className="text-right px-3 py-2">Profit</th>
                    <th className="text-right px-3 py-2">%</th>
                    <th className="text-center px-3 py-2">AI</th>
                  </tr>
                </thead>
                <tbody>
                  {completedTrades.map((t: any, i: number) => (
                    <tr key={`${t.symbol}-${i}`} className="border-b border-[#2a2d3e]/50">
                      <td className="px-3 py-1.5 font-medium">{t.symbol}</td>
                      <td className="text-right px-3 py-1.5 font-mono">Rs {t.buy_price}</td>
                      <td className="text-right px-3 py-1.5 font-mono">Rs {t.sell_price}</td>
                      <td className={`text-right px-3 py-1.5 font-mono font-semibold ${t.profit >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                        {t.profit >= 0 ? "+" : ""}Rs {t.profit}
                      </td>
                      <td className={`text-right px-3 py-1.5 font-mono ${t.profit_pct >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                        {t.profit_pct >= 0 ? "+" : ""}{t.profit_pct}%
                      </td>
                      <td className="text-center px-3 py-1.5">{t.ai_score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
