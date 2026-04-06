"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchCompanyInfo, fetchQuote } from "../lib/api";

function formatMarketCap(val: number): string {
  if (val >= 1e12) return `${(val / 1e12).toFixed(2)}T`;
  if (val >= 1e9) return `${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e7) return `${(val / 1e7).toFixed(2)}Cr`;
  if (val >= 1e5) return `${(val / 1e5).toFixed(2)}L`;
  return val.toLocaleString("en-IN");
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

export default function CompanyCard({ symbol }: { symbol: string }) {
  const { data: info, isLoading } = useQuery({
    queryKey: ["company", symbol],
    queryFn: () => fetchCompanyInfo(symbol),
    refetchInterval: false,
  });

  const { data: quote } = useQuery({
    queryKey: ["quote", symbol],
    queryFn: () => fetchQuote(symbol),
  });

  if (isLoading) {
    return (
      <div className="bg-[#1a1d2e] rounded-lg border border-[#2a2d3e] p-6 text-gray-500">
        Loading company info...
      </div>
    );
  }

  if (!info || info.error) {
    return (
      <div className="bg-[#1a1d2e] rounded-lg border border-[#2a2d3e] p-6 text-gray-500">
        Company info not available
      </div>
    );
  }

  const priceColor =
    quote && (quote.change ?? 0) >= 0 ? "text-[#22c55e]" : "text-[#ef4444]";

  return (
    <div className="bg-[#1a1d2e] rounded-lg border border-[#2a2d3e] p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">{info.company_name || symbol}</h2>
            <a
              href={`https://www.screener.in/company/${symbol}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-[#2a2d3e] hover:bg-[#3a3d4e] text-blue-400 rounded transition-colors"
            >
              Screener
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                <path d="M6.22 8.72a.75.75 0 0 0 1.06 1.06l5.22-5.22v1.69a.75.75 0 0 0 1.5 0v-3.5a.75.75 0 0 0-.75-.75h-3.5a.75.75 0 0 0 0 1.5h1.69L6.22 8.72Z" />
                <path d="M3.5 6.75c0-.69.56-1.25 1.25-1.25H7A.75.75 0 0 0 7 4H4.75A2.75 2.75 0 0 0 2 6.75v4.5A2.75 2.75 0 0 0 4.75 14h4.5A2.75 2.75 0 0 0 12 11.25V9a.75.75 0 0 0-1.5 0v2.25c0 .69-.56 1.25-1.25 1.25h-4.5c-.69 0-1.25-.56-1.25-1.25v-4.5Z" />
              </svg>
            </a>
          </div>
          <div className="text-sm text-gray-400 mt-0.5">
            {info.sector}
            {info.industry ? ` - ${info.industry}` : ""}
          </div>
        </div>
        {quote && (
          <div className="text-right">
            <div className="text-2xl font-bold font-mono">
              Rs {quote.ltp?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <div className={`text-sm font-mono ${priceColor}`}>
              {(quote.change ?? 0) >= 0 ? "+" : ""}
              {(quote.change ?? 0).toFixed(2)} ({(quote.percent_change ?? 0) >= 0 ? "+" : ""}
              {(quote.percent_change ?? 0).toFixed(2)}%)
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-[#2a2d3e]">
        <StatItem
          label="Market Cap"
          value={info.market_cap ? `Rs ${formatMarketCap(info.market_cap)}` : "N/A"}
        />
        <StatItem
          label="P/E Ratio"
          value={info.pe_ratio ? info.pe_ratio.toFixed(2) : "N/A"}
        />
        <StatItem
          label="P/B Ratio"
          value={info.pb_ratio ? info.pb_ratio.toFixed(2) : "N/A"}
        />
        <StatItem
          label="EPS"
          value={info.eps ? `Rs ${info.eps.toFixed(2)}` : "N/A"}
        />
        <StatItem
          label="Debt/Equity"
          value={info.debt_to_equity ? info.debt_to_equity.toFixed(2) : "N/A"}
        />
        <StatItem
          label="ROE"
          value={
            info.roe ? `${(info.roe * 100).toFixed(2)}%` : "N/A"
          }
        />
        <StatItem
          label="52W High"
          value={
            info.fifty_two_week_high
              ? `Rs ${info.fifty_two_week_high.toLocaleString("en-IN")}`
              : "N/A"
          }
        />
        <StatItem
          label="52W Low"
          value={
            info.fifty_two_week_low
              ? `Rs ${info.fifty_two_week_low.toLocaleString("en-IN")}`
              : "N/A"
          }
        />
      </div>

      {info.description && (
        <div className="mt-4 pt-4 border-t border-[#2a2d3e]">
          <div className="text-xs text-gray-500 mb-1">About</div>
          <p className="text-sm text-gray-300 line-clamp-3">
            {info.description}
          </p>
        </div>
      )}

      {(info.pros?.length > 0 || info.cons?.length > 0) && (
        <div className="mt-4 pt-4 border-t border-[#2a2d3e] grid grid-cols-1 sm:grid-cols-2 gap-4">
          {info.pros?.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-[#22c55e] mb-2">Pros</div>
              <ul className="space-y-1">
                {info.pros.map((pro: string, i: number) => (
                  <li key={i} className="text-sm text-gray-300 flex gap-2">
                    <span className="text-[#22c55e] shrink-0">+</span>
                    <span>{pro}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {info.cons?.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-[#ef4444] mb-2">Cons</div>
              <ul className="space-y-1">
                {info.cons.map((con: string, i: number) => (
                  <li key={i} className="text-sm text-gray-300 flex gap-2">
                    <span className="text-[#ef4444] shrink-0">-</span>
                    <span>{con}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
