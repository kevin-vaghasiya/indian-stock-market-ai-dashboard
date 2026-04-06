# TradingDash - AI-Powered Indian Stock Market Dashboard

Real-time NSE trading dashboard built for momentum and swing traders. Uses Llama 3.3 70B to analyze fundamentals, news sentiment, and momentum — scoring stocks 0-100 with buy/sell verdicts. Includes an automated trading bot, paper trading, and prediction accuracy tracking.

## Strategy

The core idea: At 9:15 AM when NSE opens, look at the top gainers. Don't blindly buy. Instead, check the news behind each stock's rise and verify the company's fundamentals. If the catalyst is genuine (strong results, order wins, upgrades) and the company is fundamentally sound (decent market cap, good ROE, manageable debt), buy it. Set a 5% profit target. If it dips, hold confidently because you filtered for quality.

This dashboard automates the entire screening part of that strategy.

## What It Does

- **Live Market Data** - Top gainers/losers, indices, sector heatmap, FII/DII flows, volume spikes from NSE
- **AI Buy Scoring** - Scores stocks 0-100 using Llama 3.3 70B analyzing fundamentals, news, and momentum
- **Paper Trading** - Virtual portfolio with market/limit/stop-loss orders and automatic 5% profit targets
- **Momentum Trading Bot** - Scans top gainers, buys Strong Buy signals, sells at 5-7% profit with trailing stops
- **Prediction Tracking** - Logs AI price predictions and measures accuracy over time
- **Company Research** - Fundamentals, candlestick charts, pros/cons, news, all on one page

## Screenshots

> _Coming soon_

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Backend | FastAPI, Python, Motor (async MongoDB) |
| Database | MongoDB Atlas (free tier) |
| AI | Llama 3.3 70B via Cloudflare Workers AI (free tier) |
| Charts | TradingView Lightweight Charts |
| Data Sources | NSE India, Screener.in, Yahoo Finance, Google News RSS |

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.9+
- MongoDB (local or Atlas free tier)
- Cloudflare account (free, for AI scoring)

### 1. Clone the repo

```bash
git clone https://github.com/yourusername/indian-stock-dashboard.git
cd indian-stock-dashboard
```

### 2. Backend setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file in the `backend/` directory:

```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/
MONGODB_DB=trading_dashboard
CF_ACCOUNT_ID=your_cloudflare_account_id
CF_API_KEY=your_cloudflare_api_key
```

Start the backend:

```bash
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
indian-stock-dashboard/
├── frontend/
│   ├── src/
│   │   ├── app/                    # Pages (dashboard, holdings, trading, bot, predictions)
│   │   ├── components/             # React components
│   │   └── lib/                    # API client, signal computation
│   └── package.json
│
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI app entry point
│   │   ├── routers/                # API endpoints (market, company, trading, bot, etc.)
│   │   ├── services/               # Business logic (NSE fetcher, AI scoring, bot engine)
│   │   ├── models/                 # Database connection, schemas
│   │   └── lib/                    # Buy signal computation
│   └── requirements.txt
```

## Features

### Market Dashboard
- Live top gainers & losers from NSE (auto-refreshes every 30s during market hours)
- Major index cards (Nifty 50, Bank Nifty, Midcap, IT, Pharma, etc.)
- Sector heatmap with color-coded performance
- FII/DII institutional flow data
- Volume spike detector (stocks with 2x+ average volume)
- Market news feed

### AI Buy Score
- Scores each stock 0-100 based on fundamentals, news sentiment, and momentum
- Verdicts: Strong Buy (80+), Buy (60-79), Hold (40-59), Avoid (<40)
- Detailed analysis modal with news summary, pros/cons, and price predictions
- Powered by Llama 3.3 70B on Cloudflare Workers AI (free tier)

### Company Detail Page
- Key metrics: Market Cap, P/E, P/B, ROE, EPS, Debt/Equity, 52W High/Low
- 6-month interactive candlestick chart
- Company pros/cons from Screener.in
- Latest stock news from Google News
- Quick link to Screener.in for deeper research

### Paper Trading
- Rs 10,00,000 virtual wallet
- Market, limit, and stop-loss orders
- Automatic 5% profit target alerts on every buy
- Portfolio view with live P&L per holding
- Full order history with cancel support

### AI Trading Bot
- Scans top gainers for momentum + quality signals
- Buy filters: 3%+ daily gain, Strong Buy AI score (80+), max 5 positions
- Sell strategy: 5% target activates trailing stop, 7% hard sell, 2% trail from peak
- Dashboard with stats (win rate, P&L, open positions)
- Activity logs and completed trade history

### Prediction Accuracy
- Stores AI price predictions (EOD and next-day close)
- Collects actual closing prices for comparison
- Tracks direction accuracy and error percentage

## API Endpoints

| Group | Endpoint | Description |
|-------|----------|-------------|
| Market | `GET /api/market/gainers` | Top gainers |
| Market | `GET /api/market/losers` | Top losers |
| Market | `GET /api/market/indices` | Major indices |
| Market | `GET /api/market/sectors` | Sector performance |
| Market | `GET /api/market/fii-dii` | FII/DII flows |
| Market | `GET /api/market/volume-spikes` | Unusual volume stocks |
| Company | `GET /api/company/{symbol}` | Fundamentals & info |
| Company | `GET /api/company/{symbol}/history` | OHLCV price history |
| Score | `GET /api/buy-score/{symbol}` | AI analysis & score |
| Trading | `POST /api/trading/order` | Place order |
| Trading | `GET /api/trading/positions` | Current holdings |
| Trading | `GET /api/trading/wallet` | Portfolio summary |
| Bot | `POST /api/bot/run` | Trigger bot scan & buy |
| Bot | `POST /api/bot/check-sells` | Check sell targets |
| Bot | `GET /api/bot/stats` | Bot performance stats |

Full API docs available at [http://localhost:8000/docs](http://localhost:8000/docs) when running.

## Data Sources & Caching

| Data | Source | Cache TTL |
|------|--------|-----------|
| Live prices, gainers/losers | NSE India API | 30 seconds |
| Stock quotes | NSE India API | 15 seconds |
| Indices & sectors | NSE India API | 5 minutes |
| Company fundamentals | Screener.in | 1 hour |
| Price history (OHLCV) | Yahoo Finance | 6 hours |
| Stock news | Google News RSS | 15 minutes |
| AI buy scores | Cloudflare Workers AI | 2 hours |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `MONGODB_DB` | No | Database name (default: `trading_dashboard`) |
| `CF_ACCOUNT_ID` | Yes | Cloudflare account ID (for AI scoring) |
| `CF_API_KEY` | Yes | Cloudflare Workers AI API key |

## How the AI Scoring Works

1. **Data Collection** - For each stock, we gather fundamentals from Screener.in (market cap, P/E, ROE, ROCE, pros/cons), latest 8 news headlines from Google News RSS, and current price/movement from NSE.

2. **Prompt Engineering** - All data is sent to Llama 3.3 70B with instructions to evaluate if the news catalyst is genuine (not pump/manipulation), assess fundamental quality (worth holding if it dips), score strictly (most stocks should be 40-70, only great setups get 80+), and predict EOD and next-day closing prices.

3. **Response Parsing** - The LLM returns structured JSON with score, verdict, analysis, pros/cons, reasons, and price predictions.

4. **Caching & Storage** - Results are cached in-memory and saved to MongoDB for accuracy tracking.

5. **Verification** - After market close, actual prices are collected and compared against predictions to measure accuracy over time.

## Disclaimer

This is a paper trading tool for learning and research purposes only. It does not execute real trades or provide financial advice. Always do your own research before making investment decisions.

## License

MIT
