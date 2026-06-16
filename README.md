# MSAD — Mishra & Sheth Analysis Dashboard

A beginner-friendly stock analysis dashboard by **Aastik Mishra** and **Rahil Sheth**, built with Next.js. Browse live market pulse, open guided report cards for any ticker, and learn fundamentals, charts, news sentiment, options, and modeling — without buy/sell advice.

**Educational only — not financial advice.**

## Features

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

## Deploy on Vercel

1. Push to GitHub
2. Import in [Vercel](https://vercel.com/new)
3. Set **`FMP_API_KEY`** in Environment Variables
4. Deploy

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
