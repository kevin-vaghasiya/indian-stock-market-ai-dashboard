"use client";

import { useParams } from "next/navigation";
import CompanyCard from "../../../components/CompanyCard";
import StockChart from "../../../components/StockChart";
import NewsFeed from "../../../components/NewsFeed";
import OrderForm from "../../../components/OrderForm";
import BuyScoreCard from "../../../components/BuyScoreCard";
import { useQuery } from "@tanstack/react-query";
import { fetchQuote } from "../../../lib/api";
import Link from "next/link";

export default function CompanyPage() {
  const { symbol } = useParams<{ symbol: string }>();
  const decodedSymbol = decodeURIComponent(symbol).toUpperCase();

  const { data: quote } = useQuery({
    queryKey: ["quote", decodedSymbol],
    queryFn: () => fetchQuote(decodedSymbol),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link href="/" className="hover:text-white">
          Dashboard
        </Link>
        <span>/</span>
        <span className="text-white font-medium">{decodedSymbol}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <CompanyCard symbol={decodedSymbol} />
          <StockChart symbol={decodedSymbol} />
        </div>
        <div className="space-y-4">
          <BuyScoreCard symbol={decodedSymbol} />
          <OrderForm
            symbol={decodedSymbol}
            companyName={quote?.company_name}
            currentPrice={quote?.ltp}
          />
          <NewsFeed symbol={decodedSymbol} />
        </div>
      </div>
    </div>
  );
}
