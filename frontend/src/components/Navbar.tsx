"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/holdings", label: "Holdings" },
  { href: "/trading", label: "Paper Trading" },
  { href: "/predictions", label: "Predictions" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-[#2a2d3e] bg-[#1a1d2e]">
      <div className="max-w-7xl mx-auto px-4 flex items-center h-14 gap-8">
        <Link href="/" className="text-lg font-bold text-white tracking-tight">
          TradingDash
        </Link>
        <div className="flex gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                pathname === link.href
                  ? "bg-[#3b82f6] text-white"
                  : "text-gray-400 hover:text-white hover:bg-[#2a2d3e]"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="ml-auto text-xs text-gray-500">
          Paper Trading Mode
        </div>
      </div>
    </nav>
  );
}
