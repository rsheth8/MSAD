# MSAD — Mishra & Sheth Analysis Dashboard

A beginner-friendly stock analysis dashboard by **Aastik Mishra** and **Rahil Sheth**, built with Next.js. Browse live market pulse, open guided report cards for any ticker, and learn fundamentals, charts, news sentiment, options, and modeling — without buy/sell advice.

**Educational only — not financial advice.**

## Features

### Learn, test, decide — the part no other market app has
MSAD is a **trading gym**, not a tip service. The goal is to make you a
*measurably* better investor, then let you carry that earned conviction to the
real market.
- **The Lens** — a grounded AI tutor on every stock. One **depth slider**
  (Learn → Analyst → Quant) re-explains the same real numbers at your level.
  Ask anything, or hit **"Make the bear case"** to fight your own bias. Never
  gives buy/sell advice; answers are anchored to the stock's actual data so it
  can't make figures up.
- **The Conviction Journal** — write a thesis (and *what would change your mind*)
  **before** you act. The AI coach critiques your *reasoning*, not the outcome.
- **Calibration score** — log probability predictions; we resurface each on its
  due date so you score yourself. Your readiness score is the honest "am I
  getting better?" signal that bridges practice to real money.
- **Hypothesis Lab** (`/practice`) — backtest a rule (buy & hold, or a moving-
  average trend filter) against real EOD history vs buy-and-hold and the S&P
  500. Every result ships with the honest caveats — survivorship bias,
  overfitting, costs, no look-ahead — so a backtest can't fool you.
- **Your dashboard** (`/dashboard`) — journal, predictions, calibration, and
  watchlist in one place. Saved locally as a guest; synced to your **Google
  account** across devices when signed in.

### Home & discovery
- Netflix-style catalog with live quotes, sparklines, and sector heatmap
- **Market news** feed and **Market Pulse** ticker strip
- **Discover** screener with beginner presets, Pro filters, saved screens, and exclusions
- **Explore** — filter the full universe by sector, exchange, cap, and fundamentals
- **Contour landscape** backdrop tinted by today's market mood

### Report cards
- Live data from [Financial Modeling Prep](https://site.financialmodelingprep.com/) (profile, quote, ratios, peers, history)
- Overall A–F grade with strengths / watch-outs
- Seven metrics vs industry peers with Learn / Pro explainers
- **Guided learning path** on each stock page
- News headlines, analyst sentiment, and fundamentals tension
- Interactive charts: 1W–MAX, compare, scatter, volume, PNG export
- **`/compare`** — side-by-side grades, metrics, verdict, chart overlay

### Options & modeling
- Options lab: chain, greeks, strategies, what-if sliders, custom builder
- Calculators: position size, breakeven, covered call, DCA
- Monte Carlo fan chart and peer-implied fair value

### Personalization
- Watchlist with live refresh and sort by % change
- Dark / light mode, accent color, optional UI sounds
- First-visit onboarding
- Keyboard shortcuts: `/` search, `1–7` metrics

### Export & share
- Report PNG, story snapshot, share links with chart state

## Local development

```bash
npm install
cp .env.example .env.local   # add FMP_API_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API routes

| Route | Description |
|-------|-------------|
| `GET /api/report/{TICKER}` | Full report card JSON |
| `GET /api/chart/{TICKER}` | Chart payload (compare / scatter) |
| `GET /api/options/{TICKER}` | Options chain payload |
| `GET /api/quotes` | Catalog quotes; `?symbols=AAPL,MSFT` for watchlist |
| `GET /api/sparklines?symbols=` | Mini sparkline arrays |
| `GET /api/news/market` | Market news feed |
| `GET /api/news/{TICKER}` | Ticker news |
| `GET /api/earnings/{TICKER}` | Next earnings date |
| `POST /api/screener` | Stock discovery / screener |
| `POST /api/explore` | Explore universe filters |
| `POST /api/explain` | The Lens — grounded AI explanation at a depth |
| `POST /api/backtest` | Hypothesis Lab — backtest a rule vs buy-hold & SPY |
| `GET/PUT /api/profile` | Signed-in user's cloud progress |
| `GET /api/auth/session` | Current user + whether auth is enabled |
| `GET /api/auth/google` | Start Google sign-in (when configured) |

## Deploy on Vercel

1. Push to GitHub
2. Import in [Vercel](https://vercel.com/new)
3. Set environment variables (see `.env.example`):
   - **`FMP_API_KEY`** — market data (required for live data)
   - **`ANTHROPIC_API_KEY`** — the AI Lens (optional; static fallback without it)
   - **`MASSIVE_API_KEY`** — news + sentiment (optional)
   - **`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `AUTH_SECRET`** — accounts (optional)
   - **`KV_REST_API_URL` / `KV_REST_API_TOKEN`** — durable cross-device sync (optional)
4. Deploy

> Every integration degrades gracefully: with no keys at all the app still runs
> on sample data, curated explainers, and local (guest) progress.

## Project structure

```
src/app/                 Pages & API routes
src/components/          UI (dashboard, charts, options, news)
src/lib/aggregator/      FMP → ReportCard pipeline
src/lib/screener/        Discovery filters, presets, saved screens
src/lib/news/            News aggregation and sentiment
src/lib/options/         Black-Scholes chain & strategies
src/lib/brand.ts         MSAD name, storage keys, events
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
