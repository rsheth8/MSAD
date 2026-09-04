# Contributing to MSAD

Educational only. Never add a code path that places trades.

## Prerequisites
- Node.js + npm

## Run
```bash
npm install
cp .env.example .env.local
npm run dev
```

Zero keys → sample data. Live market data needs `FMP_API_KEY`.

## Tests
```bash
npm test
npm run test:e2e
npm run smoke
```

Keys live in API routes only, never in client bundles.
