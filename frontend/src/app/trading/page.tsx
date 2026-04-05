"use client";

import PortfolioTable from "../../components/PortfolioTable";
import OrderForm from "../../components/OrderForm";

export default function TradingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Paper Trading</h1>
        <p className="text-sm text-gray-400 mt-1">
          Virtual portfolio with Rs 10,00,000 starting balance
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <PortfolioTable />
        </div>
        <div>
          <OrderForm />
        </div>
      </div>
    </div>
  );
}
