import GainersLosersTable from "../components/GainersLosersTable";

export default function Home() {
  return (
    <div className="space-y-6">
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
      <GainersLosersTable />
    </div>
  );
}
