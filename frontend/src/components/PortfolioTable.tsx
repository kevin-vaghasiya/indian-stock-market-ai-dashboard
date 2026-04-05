"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchPositions, fetchWallet, fetchOrders } from "../lib/api";
import Link from "next/link";

export default function PortfolioTable() {
  const { data: wallet } = useQuery({
    queryKey: ["wallet"],
    queryFn: fetchWallet,
  });

  const { data: posData } = useQuery({
    queryKey: ["positions"],
    queryFn: fetchPositions,
  });
  const positions = posData?.positions;

  const { data: orders } = useQuery({
    queryKey: ["orders"],
    queryFn: () => fetchOrders(),
  });

  return (
    <div className="space-y-4">
      {/* Wallet Summary */}
      {wallet && (
        <div className="bg-[#1a1d2e] rounded-lg border border-[#2a2d3e] p-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">
            Portfolio Summary
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div>
              <div className="text-xs text-gray-500">Cash</div>
              <div className="font-mono font-medium">
                Rs {wallet.cash_balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Invested</div>
              <div className="font-mono font-medium">
                Rs {wallet.invested_value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Total Value</div>
              <div className="font-mono font-medium">
                Rs {wallet.total_value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">P&L</div>
              <div
                className={`font-mono font-semibold ${
                  wallet.total_pnl >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"
                }`}
              >
                {wallet.total_pnl >= 0 ? "+" : ""}Rs{" "}
                {wallet.total_pnl.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">P&L %</div>
              <div
                className={`font-mono font-semibold ${
                  wallet.total_pnl_percent >= 0
                    ? "text-[#22c55e]"
                    : "text-[#ef4444]"
                }`}
              >
                {wallet.total_pnl_percent >= 0 ? "+" : ""}
                {wallet.total_pnl_percent.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Positions */}
      <div className="bg-[#1a1d2e] rounded-lg border border-[#2a2d3e]">
        <div className="px-4 py-3 border-b border-[#2a2d3e]">
          <h3 className="text-sm font-semibold text-gray-400">
            Open Positions
          </h3>
        </div>
        {!positions || positions.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">No open positions</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-xs border-b border-[#2a2d3e]">
                  <th className="text-left px-4 py-2">Symbol</th>
                  <th className="text-right px-4 py-2">Qty</th>
                  <th className="text-right px-4 py-2">Avg Buy</th>
                  <th className="text-right px-4 py-2">Invested</th>
                  <th className="text-right px-4 py-2">Realized P&L</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p: any) => (
                  <tr
                    key={p.symbol}
                    className="border-b border-[#2a2d3e]/50 hover:bg-[#2a2d3e]/30"
                  >
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/company/${p.symbol}`}
                        className="text-[#3b82f6] font-medium hover:underline"
                      >
                        {p.symbol}
                      </Link>
                      {p.company_name && (
                        <div className="text-xs text-gray-500">
                          {p.company_name}
                        </div>
                      )}
                    </td>
                    <td className="text-right px-4 py-2.5 font-mono">
                      {p.quantity}
                    </td>
                    <td className="text-right px-4 py-2.5 font-mono">
                      Rs {p.avg_buy_price.toFixed(2)}
                    </td>
                    <td className="text-right px-4 py-2.5 font-mono">
                      Rs {p.invested_value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td
                      className={`text-right px-4 py-2.5 font-mono ${
                        p.realized_pnl >= 0
                          ? "text-[#22c55e]"
                          : "text-[#ef4444]"
                      }`}
                    >
                      {p.realized_pnl >= 0 ? "+" : ""}Rs{" "}
                      {p.realized_pnl.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Orders */}
      <div className="bg-[#1a1d2e] rounded-lg border border-[#2a2d3e]">
        <div className="px-4 py-3 border-b border-[#2a2d3e]">
          <h3 className="text-sm font-semibold text-gray-400">
            Recent Orders
          </h3>
        </div>
        {!orders || orders.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">No orders yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-xs border-b border-[#2a2d3e]">
                  <th className="text-left px-4 py-2">Time</th>
                  <th className="text-left px-4 py-2">Symbol</th>
                  <th className="text-left px-4 py-2">Side</th>
                  <th className="text-left px-4 py-2">Type</th>
                  <th className="text-right px-4 py-2">Qty</th>
                  <th className="text-right px-4 py-2">Price</th>
                  <th className="text-right px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 20).map((o: any) => (
                  <tr
                    key={o.id}
                    className="border-b border-[#2a2d3e]/50 hover:bg-[#2a2d3e]/30"
                  >
                    <td className="px-4 py-2.5 text-gray-400 text-xs">
                      {new Date(o.created_at).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-2.5 font-medium">{o.symbol}</td>
                    <td
                      className={`px-4 py-2.5 font-semibold ${
                        o.side === "BUY"
                          ? "text-[#22c55e]"
                          : "text-[#ef4444]"
                      }`}
                    >
                      {o.side}
                    </td>
                    <td className="px-4 py-2.5 text-gray-400">
                      {o.order_type}
                    </td>
                    <td className="text-right px-4 py-2.5 font-mono">
                      {o.quantity}
                    </td>
                    <td className="text-right px-4 py-2.5 font-mono">
                      {o.executed_price
                        ? `Rs ${o.executed_price.toFixed(2)}`
                        : o.limit_price
                        ? `Rs ${o.limit_price.toFixed(2)}`
                        : "-"}
                    </td>
                    <td className="text-right px-4 py-2.5">
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          o.status === "EXECUTED"
                            ? "bg-[#22c55e]/10 text-[#22c55e]"
                            : o.status === "PENDING"
                            ? "bg-yellow-500/10 text-yellow-400"
                            : "bg-gray-500/10 text-gray-400"
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
