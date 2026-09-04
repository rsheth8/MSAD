# MSAD — Mishra & Sheth Analysis Dashboard

Beginner-friendly stock research and practice dashboard, built with Next.js — learn to analyze stocks and test judgment before risking real money.

| | |
| --- | --- |
| **Authors** | [Rahil Sheth](https://github.com/rsheth8) and Aastik Mishra |
| **Live** | [msad-beta.vercel.app](https://msad-beta.vercel.app) |
| **Stack** | Next.js, React, TypeScript, Tailwind, FMP, Anthropic (optional), SnapTrade read-only (optional) |
| **Status** | Educational only. Never places trades. Runs on sample data if you have no API keys. |

## What this is

MSAD is a web app for someone who wants to get better at reading stocks, not just get a stock tip. You type in a ticker (say, `AAPL`) and get a "report card": an overall letter grade, the key financial metrics compared against industry peers, recent news, analyst sentiment, price charts, and an options view — all explained in plain language, with a slider that lets you re-read the same numbers at a beginner, analyst, or quant level.

Beyond looking things up, the app is built around *practicing*: you can write down your investment thesis before you act (a "Conviction Journal"), log probability predictions and see how well-calibrated you are over time, backtest a simple trading rule against real historical prices, or replay a real (anonymized) stretch of market history one day at a time to see how you'd have reacted without hindsight. If you connect a real brokerage account (read-only), it can also X-ray your actual portfolio for hidden concentration and crash risk. Nothing in the app places trades — it only reads data and helps you reason about it.

## Key features

- **Report cards** — A–F grade, seven metrics vs. industry peers, guided learning path, news, analyst sentiment, and interactive charts (1W–MAX, compare, scatter, PNG export) for any ticker.
- **The Lens** — an AI tutor grounded in the stock's real data, with a Learn → Analyst → Quant depth slider and a "make the bear case" mode. Falls back to curated static explainers if no AI key is configured.
- **Conviction Journal & Calibration** — write a thesis and what would change your mind before acting; log predictions and get scored against outcomes on their due date.
- **Hypothesis Lab (`/practice`)** — backtest a rule (buy & hold, or a moving-average trend filter) against real end-of-day history, benchmarked to buy-and-hold and the S&P 500, with explicit caveats about survivorship bias and overfitting.
- **Market Replay (`/replay`)** — trade through a real, anonymized historical price window one day at a time, blind to the future, then compare your timing to buy-and-hold.
- **Portfolio Risk X-ray (`/risk`)** — paste holdings manually or import them read-only from a linked brokerage (via SnapTrade) to see concentration, sector tilt, correlation, and a beta-based crash estimate.
- **Discovery** — Netflix-style catalog with live quotes and sparklines, a sector heatmap, a screener with beginner presets and saved screens, and a full-universe "Explore" filter.
- **Options & modeling** — options chain with greeks and strategies, a custom strategy builder, Monte Carlo fan chart, peer-implied fair value, and calculators (position size, breakeven, covered call, DCA).
- **Dashboard & accounts** — journal, predictions, calibration, and watchlist in one place; saved locally as a guest, or synced across devices with Google sign-in.

## How it works

The app is a single Next.js project. Pages under `src/app/*` render the UI and call the app's own API routes under `src/app/api/*`, which in turn fetch and reshape data from external providers (market data, news, AI) before returning clean JSON to the client. Nothing talks to a brokerage or market-data provider directly from the browser — all third-party calls happen server-side, which is where API keys live.

For a typical page load (e.g. opening a report card for `AAPL`):

1. The browser requests `/api/report/AAPL`.
2. The route handler in `src/app/api/report/[ticker]/route.ts` calls into `src/lib/aggregator/`, which fetches profile, quote, ratios, peer, and history data from Financial Modeling Prep (FMP), computes derived metrics and an A–F grade, and finds comparable peers.
3. Response caching/rate-limiting (`src/lib/cache/`, `src/lib/rate-limit.ts`, `src/lib/kv/`) sits in front of the external calls so repeated requests don't re-hit paid APIs; Vercel KV (or any Upstash-compatible Redis) backs this durably when configured, otherwise it's in-process/local.
4. The aggregated report JSON comes back to the client, and `src/components/ReportCardView.tsx` and related components render metrics, charts, news, and the AI "Lens" panel.
5. If the user asks the Lens a question, the client posts to `/api/explain`, which sends the stock's real numbers plus the question to the Anthropic API (`src/lib/ai/`) so the model's answer is grounded in that data rather than invented; without an `ANTHROPIC_API_KEY` this falls back to static curated explainers.
6. Practice features (Hypothesis Lab, Market Replay, Risk X-ray) follow the same pattern: a client component posts inputs to a dedicated API route (`/api/backtest`, `/api/replay`, `/api/risk`), a `src/lib/backtest|replay|risk` module does the calculation against historical price data, and the result renders back into the page.
7. Signed-in progress (journal entries, predictions, watchlist) is written through `/api/profile`, authenticated via a Google OAuth flow (`src/lib/auth/`) and a signed session cookie; guests get the same features backed by `localStorage` only.
8. Brokerage linking (`/api/brokerage/*`) uses the SnapTrade SDK for a read-only OAuth-style connection; imported holdings feed the Risk X-ray but are never used to place trades.

```mermaid
flowchart LR
    subgraph Browser
        UI[Next.js Pages & Components]
    end

    subgraph Server["Next.js API Routes (src/app/api/*)"]
        Report[/api/report, chart, options, quotes/]
        Explain[/api/explain — the Lens/]
        Practice[/api/backtest, replay, risk/]
        Screener[/api/screener, explore, search/]
        Auth[/api/auth, profile/]
        Brokerage[/api/brokerage/*]
    end

    subgraph Lib["Business logic (src/lib/*)"]
        Agg[aggregator — report/metrics/grade]
        AI[ai — depth-aware prompts]
        BT[backtest / replay / risk engines]
        Scr[screener]
        Auth2[auth — session/OAuth]
        Brk[brokerage — SnapTrade client]
        Cache[cache / rate-limit / kv]
    end

    subgraph External["External services"]
        FMP[Financial Modeling Prep\nmarket data]
        Massive[Massive/Polygon\nnews]
        Anthropic[Anthropic API\nAI Lens]
        Google[Google OAuth]
        SnapTrade[SnapTrade\nbrokerage link]
        KV[Vercel KV / Redis]
    end

    UI --> Report --> Agg --> Cache --> FMP
    UI --> Report --> Agg --> Massive
    UI --> Explain --> AI --> Anthropic
    UI --> Practice --> BT --> Cache
    UI --> Screener --> Scr --> Cache
    UI --> Auth --> Auth2 --> Google
    UI --> Brokerage --> Brk --> SnapTrade
    Cache --> KV
```

Every external integration degrades gracefully: with no API keys configured at all, the app still runs end to end on sample/mock data (`src/lib/mock*.ts`), curated static explainers, and guest-only (browser-local) progress.

## Tech stack

- **Framework**: Next.js 16 (App Router) with React 19 and TypeScript
- **Styling**: Tailwind CSS 4
- **Charts / visuals**: Recharts, `react-three-fiber` + `three` (background scenes), Framer Motion
- **AI**: Anthropic API (Claude models) for the grounded explanations feature
- **Market data**: Financial Modeling Prep (primary), Massive/Polygon.io (news)
- **Brokerage integration**: `snaptrade-typescript-sdk` (read-only account linking)
- **Auth**: Custom Google OAuth flow with signed session cookies (no third-party auth library)
- **Persistence**: Vercel KV / Upstash Redis (optional, for cross-device sync, caching, and rate limiting); `localStorage` fallback for guests
- **Error monitoring**: Sentry (`@sentry/nextjs`, optional)
- **Testing**: Node's built-in test runner with `tsx` for unit tests; Playwright for end-to-end tests

## Project structure

```
src/app/                 Pages (App Router) and API routes (src/app/api/*)
src/components/          UI components, grouped by feature (journal/, screener/,
                          brokerage/, discovery/, backtest/, risk/, replay/, ai/, ...)
src/lib/aggregator/      FMP data → ReportCard pipeline (metrics, grading, peers)
src/lib/ai/              Depth-aware prompts and Anthropic API calls (the Lens)
src/lib/backtest/        Hypothesis Lab backtesting engine
src/lib/replay/          Market Replay scoring engine
src/lib/risk/            Portfolio Risk X-ray engine (concentration, beta, crash math)
src/lib/screener/        Discovery/Explore filters, presets, saved screens
src/lib/options/         Black-Scholes pricing, options chain, strategies
src/lib/brokerage/       SnapTrade client, holdings mapping, connection mode
src/lib/auth/            Session handling and Google OAuth config
src/lib/profile/         Signed-in user progress (journal, predictions, calibration)
src/lib/news/            News aggregation and sentiment
src/lib/fmp/, massive/   Provider clients and usage tracking
src/lib/cache/, kv/      Response caching, rate limiting, KV storage
src/lib/mock*.ts         Sample data used when no API keys are configured
e2e/, scripts/           Playwright end-to-end test and smoke-test script
```

## Setup / running locally

Requires Node.js and npm.

```bash
npm install
cp .env.example .env.local   # then add at least FMP_API_KEY for live data
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Without any keys set, the app still runs on sample data.

Other scripts:

| Command | Description |
|---------|-------------|
| `npm run build` | Production build |
| `npm run start` | Start production server (after build) |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (Node's test runner + `tsx`) |
| `npm run test:e2e` | Playwright end-to-end tests |
| `npm run smoke` | Smoke-test script (`scripts/smoke-test.mjs`) |

### Environment variables (all optional except noted)

| Variable | Purpose |
|----------|---------|
| `FMP_API_KEY` | Financial Modeling Prep — required for live market data |
| `MASSIVE_API_KEY` | Massive/Polygon.io — powers the multi-asset news feed |
| `ANTHROPIC_API_KEY` | Powers the Lens (AI explanations, bear/bull case, journal critiques) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `AUTH_SECRET` | Google sign-in and cross-device sync |
| `SNAPTRADE_CLIENT_ID` / `SNAPTRADE_CONSUMER_KEY` | Read-only brokerage import for the Risk X-ray |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Durable cross-device storage, caching, rate limiting |
| `SENTRY_DSN` | Server error monitoring |
| `SNAPTRADE_WEBHOOK_SECRET` | Verifies incoming SnapTrade webhook events |

See `.env.example` for full details, including required OAuth redirect URIs.

## Notable implementation details

- **Graceful degradation everywhere**: every external integration (market data, news, AI, auth, brokerage, KV) has a fallback path, so the app is fully explorable with zero configuration on sample data.
- **AI answers are grounded, not free-form**: the Lens (`/api/explain`) always passes the stock's actual computed numbers into the prompt, and explicitly avoids giving buy/sell advice — it explains, at a chosen depth level, rather than recommends.
- **No trade execution**: the SnapTrade integration is strictly read-only (holdings import for risk analysis); the app has no code path that places or modifies a real order.
- **Server-side data access only**: all provider API keys and third-party calls live in API routes / `src/lib`, never in client-side code, keeping keys off the browser.
- **Guest-first persistence**: progress is usable immediately via `localStorage`; signing in with Google upgrades the same data model to server-side, cross-device storage via `/api/profile` and KV.
- **Custom auth, not a library**: Google OAuth and session cookies are implemented directly in `src/lib/auth/` rather than through a third-party auth framework.
- **Backtesting is intentionally caveated**: the Hypothesis Lab surfaces survivorship bias, overfitting, cost, and look-ahead caveats alongside every result rather than presenting a backtest as predictive.
