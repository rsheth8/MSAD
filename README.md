# AMSAD — Aastik Mishra's Stock Analysis Dashboard

A beginner-friendly stock analysis dashboard built with Next.js. Search any ticker to see price, fundamentals vs industry peers, an overall grade, and an options education section.

**Educational only — not financial advice.**

## Features

- Live stock data from [Financial Modeling Prep](https://site.financialmodelingprep.com/) (profile, quote, ratios, peers, history)
- Industry comparison on 7 key metrics (ROE, P/E, EV/EBITDA, and more)
- Learn / Pro modes with plain-English explainers
- Collapsible **Options Lab**: full strike chain, greeks (Δ Γ Θ ν), IV vs historical vol, strategy analyzer, payoff diagrams
- Export report card as PNG
- Customizable accent color (saved in browser)
- Interactive charts: time ranges (1W–MAX), sector-default benchmarks, custom compare pairs, scatter plots, volume overlay, chart PNG export

## Local development

1. Install dependencies:

```bash
npm install
```

2. Copy the environment template and add your FMP API key:

```bash
cp .env.example .env.local
```

Edit `.env.local` and set `FMP_API_KEY`. Without a key, the API falls back to deterministic mock data.

3. Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the home dashboard — Netflix-style carousels of stocks and ETFs. Click any tile (or search a ticker) to open the full report at `/stock/AAPL`.

## API

```
GET /api/report/{TICKER}
```

Returns a `ReportCard` JSON object. Responses are cached in memory for 30 minutes and include CDN-friendly cache headers.

Example:

```bash
curl http://localhost:3000/api/report/AAPL
```

## Deploy on Vercel

1. Push this repo to GitHub.
2. Import the project in [Vercel](https://vercel.com/new).
3. Add the environment variable **`FMP_API_KEY`** in Project Settings → Environment Variables (Production, Preview, Development).
4. Deploy.

No extra config is required — Next.js 16 works out of the box on Vercel.

## Export PNG

Click **Export PNG** in the header to download the report card + options section as an image. The WebGL background is excluded from the capture.

## Project structure

```
src/lib/fmp/           FMP HTTP client
src/lib/aggregator/    FMP → ReportCard pipeline (metrics, peers, series)
src/lib/cache/         In-memory report cache
src/app/api/report/    Cached API route
src/components/        UI
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Run production build locally |
| `npm run lint` | ESLint |
