"use client";

import { useEffect, useState } from "react";
import { toPng } from "html-to-image";
import { overallGrade } from "@/lib/analysis";
import type { ReportCard } from "@/lib/types";
import { formatCurrency, formatSignedPercent } from "@/lib/format";

export function ShareButton() {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <button type="button" onClick={copyLink} className="btn-ghost interactive text-xs">
      {copied ? "Link copied!" : "Share link"}
    </button>
  );
}

export function StoryExportButton({ data }: { data: ReportCard }) {
  const [busy, setBusy] = useState(false);
  const grade = overallGrade(data);

  async function exportStory() {
    const node = document.getElementById("amsad-story-export");
    if (!node) return;
    setBusy(true);
    try {
      const url = await toPng(node, { cacheBust: true, pixelRatio: 2, backgroundColor: "#ffffff" });
      const link = document.createElement("a");
      link.download = `amsad-${data.ticker.toLowerCase()}-story.png`;
      link.href = url;
      link.click();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={exportStory}
        disabled={busy}
        className="btn-ghost interactive text-xs disabled:opacity-50"
      >
        {busy ? "Exporting…" : "Story PNG"}
      </button>

      {/* Off-screen one-pager layout for capture */}
      <div
        id="amsad-story-export"
        className="pointer-events-none fixed left-[-9999px] top-0 w-[640px] rounded-2xl border border-border bg-white p-8"
        aria-hidden
      >
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-green-600 px-2 py-0.5 text-xs font-bold text-white">AMSAD</span>
          <span className="font-display text-sm font-semibold text-gray-900">Stock snapshot</span>
        </div>
        <h2 className="mt-4 font-display text-3xl font-bold text-gray-900">{data.name}</h2>
        <p className="font-mono text-sm text-gray-500">
          {data.ticker} · {data.industry}
        </p>
        <div className="mt-6 flex items-end justify-between">
          <div>
            <div className="text-xs uppercase text-gray-500">Price</div>
            <div className="font-mono text-4xl font-bold text-gray-900">
              {formatCurrency(data.price, data.currency)}
            </div>
          </div>
          <div
            className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 text-3xl font-bold"
            style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
          >
            {grade.letter}
          </div>
        </div>
        <p className="mt-2 text-sm text-gray-600">{grade.summary}</p>
        <div className="mt-4 flex gap-4 text-sm">
          <span>1Y {formatSignedPercent(data.changes.year)}</span>
          <span>β {data.beta.toFixed(2)}</span>
        </div>
        <ul className="mt-6 space-y-2 border-t border-gray-200 pt-4 text-sm">
          {data.metrics.slice(0, 4).map((m) => (
            <li key={m.key} className="flex justify-between">
              <span className="text-gray-500">{m.label}</span>
              <span className="font-mono font-medium">{m.display}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-center text-[0.65rem] text-gray-400">
          Educational only — not financial advice · amsad.app
        </p>
      </div>
    </>
  );
}
