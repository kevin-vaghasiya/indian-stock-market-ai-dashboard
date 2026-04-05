"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchMarketNews } from "../lib/api";

interface NewsItem {
  title: string;
  link: string;
  published: string;
  source: string;
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    return `${diffDays}d ago`;
  } catch {
    return "";
  }
}

export default function MarketNewsFeed() {
  const { data: news, isLoading } = useQuery({
    queryKey: ["marketNews"],
    queryFn: fetchMarketNews,
    refetchInterval: 600000, // 10 min
  });

  return (
    <div className="bg-[#1a1d2e] rounded-lg border border-[#2a2d3e] flex flex-col max-h-[calc(100vh-120px)] lg:sticky lg:top-4">
      <div className="px-3 py-2.5 border-b border-[#2a2d3e] shrink-0">
        <div className="text-xs font-semibold text-gray-400">Latest News</div>
      </div>
      <div className="overflow-y-auto flex-1 divide-y divide-[#2a2d3e]/40">
        {isLoading ? (
          <div className="p-3 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-1">
                <div className="h-3 bg-[#2a2d3e] rounded animate-pulse w-full" />
                <div className="h-3 bg-[#2a2d3e] rounded animate-pulse w-3/4" />
                <div className="h-2 bg-[#2a2d3e] rounded animate-pulse w-1/3" />
              </div>
            ))}
          </div>
        ) : !news || news.length === 0 ? (
          <div className="p-3 text-xs text-gray-500">No news available</div>
        ) : (
          news.map((item: NewsItem, i: number) => (
            <a
              key={`${item.link}-${i}`}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-3 py-2.5 hover:bg-[#2a2d3e]/20 transition-colors"
            >
              <div className="text-[11px] text-gray-200 leading-snug line-clamp-2">
                {item.title}
              </div>
              <div className="flex gap-2 mt-1 text-[10px] text-gray-500">
                {item.source && <span>{item.source}</span>}
                <span>{timeAgo(item.published)}</span>
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  );
}
