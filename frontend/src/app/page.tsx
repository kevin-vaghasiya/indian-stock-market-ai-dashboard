import GainersLosersTable from "../components/GainersLosersTable";
import IndexCards from "../components/IndexCards";
import SectorHeatmap from "../components/SectorHeatmap";
import FiiDiiCard from "../components/FiiDiiCard";
import VolumeSpikes from "../components/VolumeSpikes";
import MarketNewsFeed from "../components/MarketNewsFeed";

export default function Home() {
  return (
    <div className="space-y-4 overflow-x-hidden">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Market Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">
            NSE Top Gainers & Losers - Auto-refreshes every 30s
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">Market Hours</div>
          <div className="text-sm text-gray-300">9:15 AM - 3:30 PM IST</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_300px] gap-4">
        {/* Left Sidebar */}
        <div className="space-y-3 order-2 lg:order-1">
          <IndexCards />
          <SectorHeatmap />
          <FiiDiiCard />
        </div>

        {/* Center - Main Table */}
        <div className="order-1 lg:order-2 min-w-0">
          <GainersLosersTable />
        </div>

        {/* Right Sidebar - Volume Spikes + News */}
        <div className="order-3 space-y-3">
          <VolumeSpikes />
          <MarketNewsFeed />
        </div>
      </div>
    </div>
  );
}
