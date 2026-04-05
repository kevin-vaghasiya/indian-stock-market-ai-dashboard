import axios from "axios";

const api = axios.create({
  baseURL: "",
  timeout: 15000,
});

export async function fetchGainers() {
  const { data } = await api.get("/api/market/gainers");
  return { stocks: data.data, source: data.source, trade_date: data.trade_date || "" };
}

export async function fetchLosers() {
  const { data } = await api.get("/api/market/losers");
  return { stocks: data.data, source: data.source, trade_date: data.trade_date || "" };
}

export async function fetchQuote(symbol: string) {
  const { data } = await api.get(`/api/market/quote/${symbol}`);
  return data;
}

export async function fetchCompanyInfo(symbol: string) {
  const { data } = await api.get(`/api/company/${symbol}`);
  return data;
}

export async function fetchPriceHistory(
  symbol: string,
  period = "6mo",
  interval = "1d"
) {
  const { data } = await api.get(
    `/api/company/${symbol}/history?period=${period}&interval=${interval}`
  );
  return data.data;
}

export async function fetchNews(symbol: string) {
  const { data } = await api.get(`/api/news/${symbol}`);
  return data.data;
}

export async function fetchWallet() {
  const { data } = await api.get("/api/trading/wallet");
  return data;
}

export async function fetchPositions() {
  const { data } = await api.get("/api/trading/positions");
  return { positions: data.data, summary: data.summary };
}

export async function fetchOrders(status?: string) {
  const url = status
    ? `/api/trading/orders?status=${status}`
    : "/api/trading/orders";
  const { data } = await api.get(url);
  return data.data;
}

export async function placeOrder(order: {
  symbol: string;
  company_name?: string;
  side: string;
  order_type?: string;
  quantity: number;
  limit_price?: number;
}) {
  const { data } = await api.post("/api/trading/order", order);
  return data;
}

export async function cancelOrder(orderId: number) {
  const { data } = await api.delete(`/api/trading/order/${orderId}`);
  return data;
}

export async function fetchAlerts() {
  const { data } = await api.get("/api/trading/alerts");
  return data.data;
}

export async function fetchWatchlist() {
  const { data } = await api.get("/api/trading/watchlist");
  return data.data;
}

export async function addToWatchlist(symbol: string) {
  const { data } = await api.post(`/api/trading/watchlist/${symbol}`);
  return data;
}

export async function removeFromWatchlist(symbol: string) {
  const { data } = await api.delete(`/api/trading/watchlist/${symbol}`);
  return data;
}

export async function fetchBuyScore(symbol: string) {
  const { data } = await api.get(`/api/buy-score/${symbol}`);
  return data;
}

export async function fetchBatchBuyScores() {
  const { data } = await api.get("/api/buy-score/batch/gainers");
  return data.data;
}

export async function fetchPredictionStats() {
  const { data } = await api.get("/api/predictions/stats");
  return data;
}

export async function fetchRecentPredictions(limit = 50) {
  const { data } = await api.get(`/api/predictions/recent?limit=${limit}`);
  return data.data;
}

export default api;
