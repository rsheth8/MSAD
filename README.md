# AMSAD — Aastik Mishra's Stock Analysis Dashboard

A beginner-friendly stock analysis dashboard built with Next.js. Search any ticker to see price, fundamentals vs industry peers, an overall grade, charts, calculators, and an options education lab.

**Educational only — not financial advice.**

## Features

### Core
- Live stock data from [Financial Modeling Prep](https://site.financialmodelingprep.com/) (profile, quote, ratios, peers, history)
- Netflix-style home dashboard with auto-scrolling carousels
- Industry comparison on 7 key metrics with accordion “tap to learn” cards
- Learn / Pro modes with plain-English explainers
- **Guided learning path** on each stock report (step-by-step tour)
- Overall A–F grade with drill-down breakdown

### Charts & compare
- Interactive charts: time ranges (1W–MAX), sector benchmarks, custom compare, scatter plots, volume, PNG export
- **`/compare`** — side-by-side grades, metric matchups, verdict, and chart overlay
- Scatter chart highlights **“you are here”** vs peers

### Options lab
- Full strike chain, greeks, strategy explorer, what-if sliders, custom strategy builder
- **Model vs live chain badge** (Black-Scholes when FMP chain unavailable)

### Modeling
- Position size, breakeven, covered call, DCA calculators
- Monte Carlo scenario fan chart
- Peer-implied fair value scenarios

### Personalization
- **Watchlist** with live quote refresh, sparklines, sort by % change
- **Sector heatmap** on home
- Dark / light mode, accent color, optional UI sounds
- First-visit **onboarding** (accent, theme, star tickers)
- Keyboard shortcuts: `/` search, `1–7` metrics, `h` help

### Discover (`/discover`)
- Stock screener with **beginner presets** and **Pro filters** (cap, P/E, ROE, sector, industry)
- **Filter explainers** on every Pro field (Learn mode tooltips)
- **Save & load screens** in localStorage
- **Exclude tickers** (hide mega-caps you already know)
- **“New to AMSAD”** badge for names not in the home catalog
- **Add all to watchlist** from results
- **Reverse screens** — find stocks pricier or weaker ROE vs industry peers

### Export & share
- Full report PNG export
- **Story PNG** one-pager snapshot
- **Share link** (copies current URL with chart/options state)

### Other
- Earnings countdown strip (when FMP calendar available)
- Metric trend badges (peer direction indicator)
- Page transition animations
- Open Graph metadata per ticker

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
| `GET /api/earnings/{TICKER}` | Next earnings date |
| `POST /api/screener` | Stock discovery / screener (FMP + peer enrichment) |

## Deploy on Vercel

1. Push to GitHub
2. Import in [Vercel](https://vercel.com/new)
3. Set **`FMP_API_KEY`** in Environment Variables
4. Deploy

## Demo recording

To capture a GIF for your portfolio:

1. Run `npm run dev`
2. Open home → click a tile → follow the guided tour → expand a metric → open Options Lab
3. Use macOS Screenshot (Cmd+Shift+5) or [Kap](https://getkap.co/) to record a 15–30s clip
4. Export as GIF or MP4 for README / social

Suggested script: *“Browse carousels → open AAPL → grade + chart → tap ROE card → Options what-if slider.”*

## Project structure

```
src/app/                 Pages & API routes
src/components/          UI (dashboard, charts, options, onboarding)
src/lib/aggregator/      FMP → ReportCard pipeline
src/lib/screener/          Discovery filters, presets, saved screens
src/lib/options/         Black-Scholes chain & strategies
src/lib/settings.ts      Theme, sound, onboarding prefs
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
