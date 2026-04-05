"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchGainers, fetchLosers, fetchBuyScore } from "../lib/api";
import { useState, useCallback, useMemo } from "react";
import ScoreModal from "./ScoreModal";
import { computeBuySignal, type BuySignal } from "../lib/signal";

interface Stock {
  symbol: string;
  company_name: string;
  ltp: number;
  change: number;
  percent_change: number;
  open: number;
  high: number;
  low: number;
  prev_close: number;
  volume: number;
}

const SIGNAL_STYLES = {
  GREEN: { dot: "bg-[#22c55e]", text: "text-[#22c55e]", bg: "bg-[#22c55e]/10" },
  YELLOW: { dot: "bg-yellow-400", text: "text-yellow-400", bg: "bg-yellow-400/10" },
  RED: { dot: "bg-[#ef4444]", text: "text-[#ef4444]", bg: "bg-[#ef4444]/10" },
  GRAY: { dot: "bg-gray-500", text: "text-gray-500", bg: "bg-gray-500/10" },
};

function SignalBadge({ signal }: { signal: BuySignal }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const style = SIGNAL_STYLES[signal.signal];

  return (
    <div className="relative">
      <button
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${style.bg} ${style.text}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
        {signal.label}
      </button>
      {showTooltip && signal.reasons.length > 0 && (
        <div className="absolute z-50 bottom-full left-0 mb-1 w-56 p-2 bg-[#0f1117] border border-[#2a2d3e] rounded-lg shadow-xl text-[10px] text-gray-300">
          {signal.reasons.map((r, i) => (
            <div key={i} className="flex gap-1 mb-0.5">
              <span className={style.text}>-</span>
              <span>{r}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ScoreBadge({
  symbol,
  rank,
  onClick,
}: {
  symbol: string;
  rank: number;
  onClick: (symbol: string) => void;
}) {
  const autoLoad = rank <= 10;
  const [manualFetch, setManualFetch] = useState(false);
  const enabled = autoLoad || manualFetch;

  const { data: score, isLoading } = useQuery({
    queryKey: ["buyScore", symbol],
    queryFn: () => fetchBuyScore(symbol),
    enabled,
    refetchInterval: false,
    retry: 1,
    staleTime: 7200000,
  });

  if (!enabled) {
    return (
      <button
        onClick={(e) => {
          e.preventDefault();
          setManualFetch(true);
        }}
        className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium cursor-pointer bg-[#2a2d3e] text-gray-400 hover:text-white hover:bg-[#3b82f6]/30 transition-colors"
      >
        Score
      </button>
    );
  }

  if (isLoading) {
    return (
      <span className="inline-block w-8 h-5 bg-[#2a2d3e] rounded animate-pulse" />
    );
  }

  if (!score) {
    return <span className="text-gray-600 text-xs">-</span>;
  }

  const s = score.score;
  let color = "bg-[#ef4444]/20 text-[#ef4444]";
  if (s >= 80) color = "bg-[#22c55e]/20 text-[#22c55e]";
  else if (s >= 60) color = "bg-[#84cc16]/20 text-[#84cc16]";
  else if (s >= 40) color = "bg-yellow-400/20 text-yellow-400";

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        onClick(symbol);
      }}
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold cursor-pointer hover:opacity-80 transition-opacity ${color}`}
    >
      {s}
    </button>
  );
}

export default function GainersLosersTable() {
  const [tab, setTab] = useState<"gainers" | "losers">("gainers");
  const [modalSymbol, setModalSymbol] = useState<string | null>(null);
  const [modalData, setModalData] = useState<any>(null);

  const { data: gainersData, isLoading: gLoading } = useQuery({
    queryKey: ["gainers"],
    queryFn: fetchGainers,
  });

  const { data: losersData, isLoading: lLoading } = useQuery({
    queryKey: ["losers"],
    queryFn: fetchLosers,
  });

  const stocks: Stock[] =
    tab === "gainers"
      ? gainersData?.stocks || []
      : losersData?.stocks || [];
  const source =
    tab === "gainers" ? gainersData?.source : losersData?.source;
  const tradeDate =
    tab === "gainers" ? gainersData?.trade_date : losersData?.trade_date;
  const isLoading = tab === "gainers" ? gLoading : lLoading;

  // Pre-compute signals for all stocks
  const signals = useMemo(() => {
    return stocks.map((stock) => computeBuySignal(stock, stocks));
  }, [stocks]);

  const handleScoreClick = useCallback(async (symbol: string) => {
    setModalSymbol(symbol);
    try {
      const data = await fetchBuyScore(symbol);
      setModalData(data);
    } catch {
      setModalData(null);
    }
  }, []);

  const closeModal = useCallback(() => {
    setModalSymbol(null);
    setModalData(null);
  }, []);

  return (
    <>
      <div className="bg-[#1a1d2e] rounded-lg border border-[#2a2d3e]">
        <div className="flex border-b border-[#2a2d3e]">
          <button
            onClick={() => setTab("gainers")}
            className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
              tab === "gainers"
                ? "text-[#22c55e] border-b-2 border-[#22c55e] bg-[#22c55e]/5"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Top Gainers
          </button>
          <button
            onClick={() => setTab("losers")}
            className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
              tab === "losers"
                ? "text-[#ef4444] border-b-2 border-[#ef4444] bg-[#ef4444]/5"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Top Losers
          </button>
        </div>

        {source === "last_close" && (
          <div className="px-4 py-2 bg-yellow-500/10 text-yellow-400 text-xs border-b border-[#2a2d3e]">
            {tradeDate
              ? `Market is closed. Showing data from ${tradeDate} (Nifty 500).`
              : "Market is closed. Showing last trading day data (Nifty 500)."}
          </div>
        )}
        {source === "live" && tradeDate && (
          <div className="px-4 py-2 bg-green-500/10 text-green-400 text-xs border-b border-[#2a2d3e]">
            {`Live data \u2013 ${tradeDate}`}
          </div>
        )}

        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading market data...</div>
        ) : stocks.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No data available. Market may be closed.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-xs border-b border-[#2a2d3e]">
                  <th className="text-left px-3 py-2">#</th>
                  <th className="text-left px-3 py-2">Symbol</th>
                  <th className="text-center px-2 py-2">Signal</th>
                  <th className="text-center px-2 py-2">AI Score</th>
                  <th className="text-right px-3 py-2">LTP</th>
                  <th className="text-right px-3 py-2">Change</th>
                  <th className="text-right px-3 py-2">% Change</th>
                  <th className="text-right px-3 py-2">Open</th>
                  <th className="text-right px-3 py-2">High</th>
                  <th className="text-right px-3 py-2">Low</th>
                  <th className="text-right px-3 py-2">Volume</th>
                </tr>
              </thead>
              <tbody>
                {stocks.map((stock, i) => (
                  <tr
                    key={stock.symbol}
                    className="border-b border-[#2a2d3e]/50 hover:bg-[#2a2d3e]/30 transition-colors"
                  >
                    <td className="px-3 py-2.5 text-gray-500">{i + 1}</td>
                    <td className="px-3 py-2.5">
                      <a
                        href={`/company/${stock.symbol}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#3b82f6] font-medium hover:underline"
                      >
                        {stock.symbol}
                      </a>
                    </td>
                    <td className="text-center px-2 py-2.5">
                      <SignalBadge signal={signals[i]} />
                    </td>
                    <td className="text-center px-2 py-2.5">
                      <ScoreBadge
                        symbol={stock.symbol}
                        rank={i + 1}
                        onClick={handleScoreClick}
                      />
                    </td>
                    <td className="text-right px-3 py-2.5 font-mono">
                      {stock.ltp.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td
                      className={`text-right px-3 py-2.5 font-mono ${
                        stock.change >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"
                      }`}
                    >
                      {stock.change >= 0 ? "+" : ""}
                      {stock.change.toFixed(2)}
                    </td>
                    <td
                      className={`text-right px-3 py-2.5 font-mono font-semibold ${
                        stock.percent_change >= 0
                          ? "text-[#22c55e]"
                          : "text-[#ef4444]"
                      }`}
                    >
                      {stock.percent_change >= 0 ? "+" : ""}
                      {stock.percent_change.toFixed(2)}%
                    </td>
                    <td className="text-right px-3 py-2.5 font-mono text-gray-400">
                      {stock.open.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="text-right px-3 py-2.5 font-mono text-gray-400">
                      {stock.high.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="text-right px-3 py-2.5 font-mono text-gray-400">
                      {stock.low.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="text-right px-3 py-2.5 font-mono text-gray-400">
                      {stock.volume.toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Score Detail Modal */}
      {modalSymbol && (
        modalData ? (
          <ScoreModal data={modalData} onClose={closeModal} />
        ) : (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={closeModal}
          >
            <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-xl p-8 flex items-center gap-3 text-gray-400">
              <div className="animate-spin h-5 w-5 border-2 border-gray-500 border-t-transparent rounded-full" />
              Analyzing {modalSymbol} with AI...
            </div>
          </div>
        )
      )}
    </>
  );
}
