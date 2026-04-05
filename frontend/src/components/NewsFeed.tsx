"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchNews } from "../lib/api";

interface NewsItem {
  title: string;
  link: string;
  published: string;
  source: string;
}

export default function NewsFeed({ symbol }: { symbol: string }) {
  const { data: news, isLoading } = useQuery({
    queryKey: ["news", symbol],
    queryFn: () => fetchNews(symbol),
    refetchInterval: 900000, // 15 minutes
  });

  return (
    <div className="bg-[#1a1d2e] rounded-lg border border-[#2a2d3e]">
      <div className="px-4 py-3 border-b border-[#2a2d3e]">
        <h3 className="text-sm font-semibold text-gray-400">
          News - {symbol}
        </h3>
      </div>
      <div className="divide-y divide-[#2a2d3e]/50">
        {isLoading ? (
          <div className="p-4 text-gray-500 text-sm">Loading news...</div>
        ) : !news || news.length === 0 ? (
          <div className="p-4 text-gray-500 text-sm">No news found</div>
        ) : (
          news.map((item: NewsItem, i: number) => (
            <a
              key={i}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-3 hover:bg-[#2a2d3e]/30 transition-colors"
            >
              <div className="text-sm text-gray-200 leading-snug">
                {item.title}
              </div>
              <div className="flex gap-3 mt-1 text-xs text-gray-500">
                {item.source && <span>{item.source}</span>}
                {item.published && <span>{item.published}</span>}
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  );
}
