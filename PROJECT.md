# TradingDash - Indian Stock Market Dashboard

A real-time Indian stock market dashboard with AI-powered buy scoring and paper trading. Built for traders who follow a momentum + quality screening strategy on NSE.

---

## Strategy

The core idea: At 9:15 AM when NSE opens, look at the top gainers. Don't blindly buy. Instead, check the news behind each stock's rise and verify the company's fundamentals. If the catalyst is genuine (strong results, order wins, upgrades) and the company is fundamentally sound (decent market cap, good ROE, manageable debt), buy it. Set a 5% profit target. If it dips, hold confidently because you filtered for quality.

This dashboard automates the screening part of that strategy.

---

## Features

### 1. Market Dashboard
- Live top gainers and losers from NSE (Nifty 500 universe)
- Auto-refreshes every 30 seconds during market hours
- Falls back to last trading day data when market is closed
- Shows trade date and market status (live/closed)

### 2. AI Buy Score
- Every stock gets an AI score from 0-100 powered by **Llama 3.3 70B** (via Cloudflare Workers AI - free tier)
- Score visible as a colored badge directly in the gainers/losers table
- Click the badge to open a detailed modal with:
  - **News Summary** - Why is the stock moving today?
  - **Fundamental Analysis** - Is the company worth holding?
  - **Pros / Cons** - Quick overview
  - **Price Predictions** - Predicted EOD close and next day close
  - **Key Reasons** - Top 3 reasons for the verdict
- Verdicts: Strong Buy (80+), Buy (60-79), Hold (40-59), Avoid (<40)

### 3. Company Detail Page
- Click any stock symbol to see full details
- **Fundamentals from Screener.in**: Market cap, P/E, P/B, ROE, ROCE, EPS, debt/equity, 52W high/low, book value
- **Pros and Cons** parsed from Screener.in
- **Company description**
- **Candlestick price chart** (6-month history via TradingView Lightweight Charts)
- **News feed** from Google News RSS (latest first)
- **AI Buy Score card** with full analysis
- **Quick order form** to paper trade directly from the page

### 4. Paper Trading
- Virtual wallet starting with Rs 10,00,000
- **Order types**: Market (instant), Limit, Stop-Loss
- Market orders execute immediately at current NSE price
- Limit/Stop-Loss orders saved as pending
- Every buy automatically creates a **5% profit target alert**
- Full order history with status tracking

### 5. Holdings Page
- Portfolio summary: Total Invested, Current Value, Unrealized P&L, Cash Balance
- Holdings table with live P&L per stock (fetches current price from NSE)
- Color-coded P&L (green for profit, red for loss)

### 6. Prediction Accuracy Tracking
- Every AI prediction is automatically saved to MongoDB
- Tracks: predicted EOD price, predicted next day price, actual prices
- **Accuracy metrics**: Direction accuracy %, average error %
- Table shows per-prediction results: CORRECT (green) or WRONG (red)
- Helps evaluate whether the AI is actually useful over time

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | Next.js 16 + React 19 + TypeScript | Modern React with App Router |
| **Styling** | Tailwind CSS 4 | Dark theme, rapid UI development |
| **Charts** | TradingView Lightweight Charts 5 | Purpose-built for financial candlestick charts, 45KB |
| **State** | TanStack Query (React Query) | Data fetching, caching, auto-refresh |
| **Backend** | Python FastAPI | Async, best free Indian market data libraries are Python |
| **Database** | MongoDB Atlas (free tier) | Cloud-hosted, no server setup |
| **AI** | Llama 3.3 70B via Cloudflare Workers AI | Free tier, good financial analysis quality |
| **Real-time** | Server-Sent Events (SSE) | One-directional data push, auto-reconnects |

---

## Data Sources (All Free)

| Data | Source | Refresh Rate |
|------|--------|-------------|
| Live stock prices, top gainers/losers | NSE India API (direct endpoints with cookie auth) | 30 seconds |
| Company fundamentals (P/E, ROE, market cap) | Screener.in (HTML scraping) | 1 hour cache |
| Pros/cons analysis | Screener.in | 1 hour cache |
| Company fundamentals (fallback) | yfinance Python library | 1 hour cache |
| Historical OHLCV (charts) | yfinance | 6 hour cache |
| Stock news | Google News RSS | 15 minute cache |
| AI analysis & predictions | Cloudflare Workers AI (Llama 3.3 70B) | 30 minute cache |

---

## Project Structure

```
TradingDashboard/
  backend/
    .env                              # MongoDB URI, Cloudflare API keys
    requirements.txt                  # Python dependencies
    app/
      main.py                         # FastAPI app, SSE streaming, CORS
      models/
        database.py                   # MongoDB connection, init, indexes
        schemas.py                    # Pydantic request/response models
      routers/
        market.py                     # GET /api/market/gainers, /losers, /quote
        company.py                    # GET /api/company/{symbol}, /history
        news.py                       # GET /api/news/{symbol}
        paper_trading.py              # Trading: orders, positions, wallet, alerts, watchlist
        buy_score.py                  # GET /api/buy-score/{symbol}, /batch/gainers
        predictions.py                # GET /api/predictions/stats, /recent
      services/
        nse_fetcher.py                # NSE live data (session/cookie handling)
        screener_service.py           # Screener.in web scraping for fundamentals
        yfinance_service.py           # Yahoo Finance fallback
        news_service.py               # Google News RSS parsing
        paper_engine.py               # Order execution, position management, P&L
        buy_score_service.py          # Cloudflare AI scoring + prompt engineering
        prediction_service.py         # Prediction storage, EOD collection, verification

  frontend/
    package.json                      # Node.js dependencies
    next.config.ts                    # Next.js configuration
    src/
      app/
        layout.tsx                    # Root layout with Navbar + Providers
        page.tsx                      # Dashboard (gainers/losers table)
        holdings/page.tsx             # Portfolio holdings with live P&L
        trading/page.tsx              # Paper trading page
        company/[symbol]/page.tsx     # Company detail (fundamentals, chart, news, score)
        predictions/page.tsx          # Prediction accuracy tracking
        globals.css                   # Dark theme CSS variables
      components/
        Providers.tsx                 # React Query client setup
        Navbar.tsx                    # Navigation bar
        GainersLosersTable.tsx        # Main market table + score badges + modal
        CompanyCard.tsx               # Company fundamentals display
        StockChart.tsx                # TradingView candlestick chart
        BuyScoreCard.tsx              # AI score card (company page)
        ScoreModal.tsx                # AI score detail modal (dashboard)
        NewsFeed.tsx                  # Stock news feed
        OrderForm.tsx                 # Buy/sell order form
        PortfolioTable.tsx            # Holdings + orders table
      lib/
        api.ts                        # Axios API client (all endpoint functions)
```

---

## API Endpoints

### Market Data
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/market/gainers` | Top gainers (live or last close) |
| GET | `/api/market/losers` | Top losers (live or last close) |
| GET | `/api/market/quote/{symbol}` | Real-time quote for a stock |

### Company Info
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/company/{symbol}` | Fundamentals, pros/cons, description |
| GET | `/api/company/{symbol}/history` | OHLCV price history |

### News
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/news/{symbol}` | Latest news for a stock |

### Paper Trading
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/trading/wallet` | Portfolio summary (cash, invested, P&L) |
| POST | `/api/trading/order` | Place buy/sell order |
| GET | `/api/trading/orders` | Order history |
| DELETE | `/api/trading/order/{id}` | Cancel pending order |
| GET | `/api/trading/positions` | Current holdings with live P&L |
| GET | `/api/trading/alerts` | Active price alerts |
| POST | `/api/trading/alert` | Create price alert |
| GET | `/api/trading/watchlist` | Watchlist |
| POST | `/api/trading/watchlist/{symbol}` | Add to watchlist |
| DELETE | `/api/trading/watchlist/{symbol}` | Remove from watchlist |

### AI Buy Score
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/buy-score/{symbol}` | AI score with analysis and price predictions |
| GET | `/api/buy-score/batch/gainers` | Score top 10 gainers at once |

### Prediction Tracking
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/predictions/stats` | Overall accuracy metrics |
| GET | `/api/predictions/recent` | Recent predictions with results |
| POST | `/api/predictions/collect-eod` | Collect actual EOD prices |
| POST | `/api/predictions/verify` | Verify predictions vs actuals |

---

## MongoDB Collections

| Collection | Purpose | Key Fields |
|-----------|---------|------------|
| `wallet` | Virtual trading balance | initial_balance, cash_balance |
| `orders` | All paper trade orders | symbol, side, quantity, executed_price, status |
| `positions` | Current holdings | symbol, quantity, avg_buy_price, realized_pnl |
| `alerts` | Price target alerts | symbol, target_price, is_triggered |
| `watchlist` | Saved stocks | symbol, company_name |
| `predictions` | AI predictions | symbol, date, predicted/actual prices, accuracy |
| `price_snapshots` | Actual EOD prices | symbol, date, close_price |

---

## Setup & Running

### Prerequisites
- Python 3.9+
- Node.js 20+
- MongoDB Atlas account (free tier)
- Cloudflare account (free tier, for AI)

### Backend Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env`:
```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/
MONGODB_DB=trading_dashboard
CF_ACCOUNT_ID=your_cloudflare_account_id
CF_API_KEY=your_cloudflare_api_key
```

Start backend:
```bash
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

---

## How the AI Scoring Works

1. **Data Collection**: For each stock, we gather:
   - Fundamentals from Screener.in (market cap, P/E, ROE, ROCE, pros/cons)
   - Latest 8 news headlines from Google News RSS
   - Current price and day's movement from NSE

2. **Prompt Engineering**: All data is formatted into a structured prompt sent to Llama 3.3 70B with instructions to:
   - Evaluate if the news catalyst is genuine (not pump/manipulation)
   - Assess fundamental quality (worth holding if it dips)
   - Score strictly (most stocks should be 40-70, only great setups get 80+)
   - Predict EOD and next day closing prices

3. **Response Parsing**: The LLM returns structured JSON with score, verdict, analysis, pros/cons, reasons, and price predictions

4. **Caching & Storage**: Results are cached for 30 minutes and saved to MongoDB for accuracy tracking

5. **Verification**: After market close, actual prices are collected and compared against predictions to measure accuracy over time

---

## Caching Strategy

| Data | Cache Duration | Location |
|------|---------------|----------|
| Top gainers/losers | 30 seconds | In-memory (TTLCache) |
| Stock quotes | 15 seconds | In-memory |
| Nifty 500 index data | 5 minutes | In-memory |
| Company fundamentals | 1 hour | In-memory |
| Price history | 6 hours | In-memory |
| News | 15 minutes | In-memory |
| AI buy scores | 30 minutes | In-memory |

---

## Future Feature Ideas

- Pre-market scanner (9:00 AM NSE pre-open data)
- Sector heatmap visualization
- GTT order calculator (auto-calculate 5% target for Zerodha)
- FII/DII buy/sell data from NSE
- Volume spike detector (2x+ average volume alerts)
- 52-week high/low breakout scanner
- Trade journal with AI score at time of trade
- Equity curve chart for paper trading portfolio
- Mobile responsive layout
- Export trades to CSV
- Zerodha Kite deep links (open stock directly in Kite)

---

## License

Private project. Not for distribution.
