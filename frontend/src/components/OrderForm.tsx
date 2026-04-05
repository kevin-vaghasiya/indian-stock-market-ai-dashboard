"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { placeOrder } from "../lib/api";

interface Props {
  symbol?: string;
  companyName?: string;
  currentPrice?: number;
}

export default function OrderForm({ symbol: defaultSymbol, companyName, currentPrice }: Props) {
  const [symbol, setSymbol] = useState(defaultSymbol || "");
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [orderType, setOrderType] = useState("MARKET");
  const [quantity, setQuantity] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: placeOrder,
    onSuccess: (data) => {
      setMessage(
        `${side} order ${data.status?.toLowerCase()}! ${
          data.executed_price
            ? `Price: Rs ${data.executed_price.toFixed(2)}`
            : ""
        }`
      );
      setError("");
      setQuantity("");
      setLimitPrice("");
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["positions"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || "Order failed");
      setMessage("");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !quantity) return;
    setMessage("");
    setError("");
    mutation.mutate({
      symbol: symbol.toUpperCase(),
      company_name: companyName || "",
      side,
      order_type: orderType,
      quantity: parseInt(quantity),
      limit_price: limitPrice ? parseFloat(limitPrice) : undefined,
    });
  };

  const estimatedCost =
    currentPrice && quantity ? currentPrice * parseInt(quantity || "0") : null;

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[#1a1d2e] rounded-lg border border-[#2a2d3e] p-4"
    >
      <h3 className="text-sm font-semibold text-gray-400 mb-3">
        Place Paper Order
      </h3>

      <div className="flex gap-1 mb-3">
        <button
          type="button"
          onClick={() => setSide("BUY")}
          className={`flex-1 py-2 rounded text-sm font-semibold transition-colors ${
            side === "BUY"
              ? "bg-[#22c55e] text-white"
              : "bg-[#2a2d3e] text-gray-400"
          }`}
        >
          BUY
        </button>
        <button
          type="button"
          onClick={() => setSide("SELL")}
          className={`flex-1 py-2 rounded text-sm font-semibold transition-colors ${
            side === "SELL"
              ? "bg-[#ef4444] text-white"
              : "bg-[#2a2d3e] text-gray-400"
          }`}
        >
          SELL
        </button>
      </div>

      {!defaultSymbol && (
        <input
          type="text"
          placeholder="Symbol (e.g., RELIANCE)"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          className="w-full mb-2 px-3 py-2 bg-[#0f1117] border border-[#2a2d3e] rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#3b82f6]"
        />
      )}

      <select
        value={orderType}
        onChange={(e) => setOrderType(e.target.value)}
        className="w-full mb-2 px-3 py-2 bg-[#0f1117] border border-[#2a2d3e] rounded text-sm text-white focus:outline-none focus:border-[#3b82f6]"
      >
        <option value="MARKET">Market Order</option>
        <option value="LIMIT">Limit Order</option>
        <option value="STOP_LOSS">Stop Loss</option>
      </select>

      <input
        type="number"
        placeholder="Quantity"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        min="1"
        className="w-full mb-2 px-3 py-2 bg-[#0f1117] border border-[#2a2d3e] rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#3b82f6]"
      />

      {orderType !== "MARKET" && (
        <input
          type="number"
          placeholder="Limit / Trigger Price"
          value={limitPrice}
          onChange={(e) => setLimitPrice(e.target.value)}
          step="0.05"
          className="w-full mb-2 px-3 py-2 bg-[#0f1117] border border-[#2a2d3e] rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#3b82f6]"
        />
      )}

      {estimatedCost && orderType === "MARKET" && (
        <div className="text-xs text-gray-500 mb-2">
          Est. cost: Rs {estimatedCost.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </div>
      )}

      <button
        type="submit"
        disabled={mutation.isPending || !symbol || !quantity}
        className={`w-full py-2.5 rounded text-sm font-semibold transition-colors disabled:opacity-50 ${
          side === "BUY"
            ? "bg-[#22c55e] hover:bg-[#16a34a] text-white"
            : "bg-[#ef4444] hover:bg-[#dc2626] text-white"
        }`}
      >
        {mutation.isPending ? "Placing..." : `${side} ${symbol || "STOCK"}`}
      </button>

      {message && (
        <div className="mt-2 text-xs text-[#22c55e] bg-[#22c55e]/10 rounded p-2">
          {message}
        </div>
      )}
      {error && (
        <div className="mt-2 text-xs text-[#ef4444] bg-[#ef4444]/10 rounded p-2">
          {error}
        </div>
      )}
    </form>
  );
}
