"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchPositions, fetchWallet } from "../../lib/api";
import Link from "next/link";

export default function HoldingsPage() {
  const { data: posData, isLoading } = useQuery({
    queryKey: ["positions"],
    queryFn: fetchPositions,
  });

  const { data: wallet } = useQuery({
    queryKey: ["wallet"],
    queryFn: fetchWallet,
  });

  const positions = posData?.positions || [];
  const summary = posData?.summary;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Holdings</h1>
        <p className="text-sm text-gray-400 mt-1">
          Your paper trading portfolio with live P&L
        </p>
      </div>

      {/* Portfolio Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#1a1d2e] rounded-lg border border-[#2a2d3e] p-4">
          <div className="text-xs text-gray-500">Total Invested</div>
          <div className="text-lg font-mono font-semibold mt-1">
            Rs {(summary?.total_invested || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-[#1a1d2e] rounded-lg border border-[#2a2d3e] p-4">
          <div className="text-xs text-gray-500">Current Value</div>
          <div className="text-lg font-mono font-semibold mt-1">
            Rs {(summary?.total_current || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-[#1a1d2e] rounded-lg border border-[#2a2d3e] p-4">
          <div className="text-xs text-gray-500">Unrealized P&L</div>
          <div
            className={`text-lg font-mono font-semibold mt-1 ${
              (summary?.total_unrealized_pnl || 0) >= 0
                ? "text-[#22c55e]"
                : "text-[#ef4444]"
            }`}
          >
            {(summary?.total_unrealized_pnl || 0) >= 0 ? "+" : ""}Rs{" "}
            {(summary?.total_unrealized_pnl || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            <span className="text-sm ml-1">
              ({(summary?.total_unrealized_pnl_percent || 0) >= 0 ? "+" : ""}
              {(summary?.total_unrealized_pnl_percent || 0).toFixed(2)}%)
            </span>
          </div>
        </div>
        <div className="bg-[#1a1d2e] rounded-lg border border-[#2a2d3e] p-4">
          <div className="text-xs text-gray-500">Cash Balance</div>
          <div className="text-lg font-mono font-semibold mt-1">
            Rs {(wallet?.cash_balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="bg-[#1a1d2e] rounded-lg border border-[#2a2d3e]">
        <div className="px-4 py-3 border-b border-[#2a2d3e] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-400">
            Current Holdings ({positions.length})
          </h3>
          {summary && summary.total_realized_pnl !== 0 && (
            <div className="text-xs text-gray-500">
              Realized P&L:{" "}
              <span
                className={
                  summary.total_realized_pnl >= 0
                    ? "text-[#22c55e]"
                    : "text-[#ef4444]"
                }
              >
                {summary.total_realized_pnl >= 0 ? "+" : ""}Rs{" "}
                {summary.total_realized_pnl.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500">
            Loading holdings...
          </div>
        ) : positions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-lg mb-2">No holdings yet</div>
            <div className="text-sm">
              Go to the{" "}
              <Link href="/" className="text-[#3b82f6] hover:underline">
                Dashboard
              </Link>{" "}
              and buy some stocks to get started.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-xs border-b border-[#2a2d3e]">
                  <th className="text-left px-4 py-2">Stock</th>
                  <th className="text-right px-4 py-2">Qty</th>
                  <th className="text-right px-4 py-2">Avg Buy</th>
                  <th className="text-right px-4 py-2">LTP</th>
                  <th className="text-right px-4 py-2">Invested</th>
                  <th className="text-right px-4 py-2">Current</th>
                  <th className="text-right px-4 py-2">P&L</th>
                  <th className="text-right px-4 py-2">P&L %</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p: any) => (
                  <tr
                    key={p.symbol}
                    className="border-b border-[#2a2d3e]/50 hover:bg-[#2a2d3e]/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/company/${p.symbol}`}
                        className="text-[#3b82f6] font-medium hover:underline"
                      >
                        {p.symbol}
                      </Link>
                      {p.company_name && (
                        <div className="text-xs text-gray-500 mt-0.5">
                          {p.company_name}
                        </div>
                      )}
                    </td>
                    <td className="text-right px-4 py-3 font-mono">
                      {p.quantity}
                    </td>
                    <td className="text-right px-4 py-3 font-mono">
                      {p.avg_buy_price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="text-right px-4 py-3 font-mono">
                      {p.current_price > 0
                        ? p.current_price.toLocaleString("en-IN", { minimumFractionDigits: 2 })
                        : "-"}
                    </td>
                    <td className="text-right px-4 py-3 font-mono text-gray-400">
                      {p.invested_value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="text-right px-4 py-3 font-mono text-gray-400">
                      {p.current_value > 0
                        ? p.current_value.toLocaleString("en-IN", { minimumFractionDigits: 2 })
                        : "-"}
                    </td>
                    <td
                      className={`text-right px-4 py-3 font-mono font-semibold ${
                        p.unrealized_pnl >= 0
                          ? "text-[#22c55e]"
                          : "text-[#ef4444]"
                      }`}
                    >
                      {p.unrealized_pnl >= 0 ? "+" : ""}
                      {p.unrealized_pnl.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td
                      className={`text-right px-4 py-3 font-mono font-semibold ${
                        p.unrealized_pnl_percent >= 0
                          ? "text-[#22c55e]"
                          : "text-[#ef4444]"
                      }`}
                    >
                      {p.unrealized_pnl_percent >= 0 ? "+" : ""}
                      {p.unrealized_pnl_percent.toFixed(2)}%
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
