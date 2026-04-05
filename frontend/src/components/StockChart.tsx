"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { createChart, ColorType, CandlestickSeries } from "lightweight-charts";
import { fetchPriceHistory } from "../lib/api";

export default function StockChart({ symbol }: { symbol: string }) {
  const chartRef = useRef<HTMLDivElement>(null);

  const { data: history } = useQuery({
    queryKey: ["history", symbol],
    queryFn: () => fetchPriceHistory(symbol),
    refetchInterval: false,
  });

  useEffect(() => {
    if (!chartRef.current || !history || history.length === 0) return;

    const chart = createChart(chartRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#1a1d2e" },
        textColor: "#9ca3af",
      },
      grid: {
        vertLines: { color: "#2a2d3e" },
        horzLines: { color: "#2a2d3e" },
      },
      width: chartRef.current.clientWidth,
      height: 400,
      crosshair: {
        mode: 0,
      },
      timeScale: {
        borderColor: "#2a2d3e",
      },
      rightPriceScale: {
        borderColor: "#2a2d3e",
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    candleSeries.setData(history);
    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartRef.current) {
        chart.applyOptions({ width: chartRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [history]);

  return (
    <div className="bg-[#1a1d2e] rounded-lg border border-[#2a2d3e] p-4">
      <h3 className="text-sm font-semibold text-gray-400 mb-3">
        Price Chart - {symbol}
      </h3>
      <div ref={chartRef} />
      {(!history || history.length === 0) && (
        <div className="h-[400px] flex items-center justify-center text-gray-500">
          Loading chart...
        </div>
      )}
    </div>
  );
}
