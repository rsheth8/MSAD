#!/usr/bin/env node
const BASE = process.env.BASE_URL || "http://localhost:3000";

const pages = [
  "/",
  "/discover",
  "/compare",
  "/compare?a=AAPL&b=MSFT",
  "/explore",
  "/news",
  "/lab",
  "/stock/AAPL",
  "/stock/MSFT",
];

const apis = [
  "/api/quotes",
  "/api/sparklines?symbols=AAPL,MSFT,GOOGL",
  "/api/news/market",
  "/api/news/feed",
  "/api/news/AAPL",
  "/api/news/INVALID!!!",
  "/api/report/AAPL",
  "/api/chart/AAPL",
  "/api/earnings/AAPL",
  "/api/options/AAPL",
];

const postApis = [
  { path: "/api/screener", body: { presetId: "large-cap-value" } },
  { path: "/api/explore", body: { filters: {}, sortKey: "marketCap", sortDir: "desc" } },
];

async function test(path, opts = {}) {
  const url = `${BASE}${path}`;
  try {
    const res = await fetch(url, {
      redirect: "follow",
      method: opts.method || "GET",
      headers: opts.body ? { "Content-Type": "application/json" } : undefined,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const ct = res.headers.get("content-type") || "";
    let body = null;
    let parseError = null;
    if (path.startsWith("/api/")) {
      try {
        body = await res.json();
      } catch (e) {
        parseError = e.message;
      }
    } else {
      body = await res.text();
    }
    const ok = res.ok && !parseError;
    const expectFail = path.includes("INVALID");
    const passed = expectFail ? res.status === 400 : ok;
    return { path, status: res.status, ok: passed, ct, parseError, bodyPreview: preview(body) };
  } catch (e) {
    return { path, status: 0, ok: false, error: e.message };
  }
}

function preview(body) {
  if (body == null) return null;
  if (typeof body === "string") {
    const hasError = /ReferenceError|TypeError|Error:/i.test(body);
    return { type: "html", length: body.length, hasError };
  }
  if (typeof body === "object") {
    const keys = Object.keys(body);
    const err = body.error || body.message;
    return { type: "json", keys: keys.slice(0, 8), error: err };
  }
  return null;
}

async function main() {
  console.log(`Smoke testing ${BASE}\n`);
  const results = [];
  for (const p of pages) {
    const r = await test(p);
    results.push(r);
    const icon = r.ok ? "✓" : "✗";
    const extra = r.parseError ? ` parse: ${r.parseError}` : r.error ? ` ${r.error}` : "";
    console.log(`${icon} ${r.status} ${p}${extra}`);
    if (!r.ok && r.bodyPreview) console.log("   ", JSON.stringify(r.bodyPreview));
  }
  for (const p of apis) {
    const r = await test(p);
    results.push(r);
    const icon = r.ok ? "✓" : "✗";
    const extra = r.parseError ? ` parse: ${r.parseError}` : r.error ? ` ${r.error}` : "";
    console.log(`${icon} ${r.status} ${p}${extra}`);
    if (!r.ok && r.bodyPreview) console.log("   ", JSON.stringify(r.bodyPreview));
  }
  for (const { path, body } of postApis) {
    const r = await test(path, { method: "POST", body });
    results.push(r);
    const icon = r.ok ? "✓" : "✗";
    const extra = r.parseError ? ` parse: ${r.parseError}` : r.error ? ` ${r.error}` : "";
    console.log(`${icon} ${r.status} POST ${path}${extra}`);
    if (!r.ok && r.bodyPreview) console.log("   ", JSON.stringify(r.bodyPreview));
  }
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    console.log("\nFailed:");
    for (const f of failed) console.log(`  ${f.path}: ${f.status} ${f.error || f.parseError || ""}`);
    process.exit(1);
  }
}

main();
