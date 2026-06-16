"use client";

import { useState } from "react";
import { toPng } from "html-to-image";
import { overallGrade } from "@/lib/analysis";
import type { ReportCard } from "@/lib/types";
import type { OverallGrade } from "@/lib/analysis";
import { formatCurrency, formatSignedPercent } from "@/lib/format";
import { BRAND } from "@/lib/brand";

function readAccent(): string {
  if (typeof document === "undefined") return BRAND.accent;
  return (
    getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || BRAND.accent
  );
}

function styled(tag: string, css: string, text?: string): HTMLElement {
  const el = document.createElement(tag);
  el.style.cssText = css;
  if (text !== undefined) el.textContent = text;
  return el;
}

/** Build a capture-ready card with 100% inline styles (no Tailwind / hidden React tree). */
function buildStoryCard(data: ReportCard, grade: OverallGrade, accent: string): HTMLElement {
  const card = styled(
    "div",
    [
      "box-sizing:border-box",
      "width:640px",
      "padding:32px",
      "background:#ffffff",
      "border:1px solid #e6e8ec",
      "border-radius:16px",
      "font-family:system-ui,-apple-system,BlinkMacSystemFont,sans-serif",
      "color:#14161a",
    ].join(";"),
  );

  const header = styled("div", "display:flex;align-items:center;gap:8px");
  header.appendChild(
    styled(
      "span",
      `background:${accent};color:#fff;font-size:12px;font-weight:700;padding:2px 8px;border-radius:6px`,
      BRAND.id,
    ),
  );
  header.appendChild(
    styled("span", "font-size:14px;font-weight:600;color:#14161a", "Stock snapshot"),
  );
  card.appendChild(header);

  card.appendChild(styled("h2", "margin:16px 0 0;font-size:30px;font-weight:700", data.name));
  card.appendChild(
    styled(
      "p",
      "margin:4px 0 0;font-family:ui-monospace,monospace;font-size:14px;color:#6b7280",
      `${data.ticker} · ${data.industry}`,
    ),
  );

  const row = styled("div", "display:flex;align-items:flex-end;justify-content:space-between;margin-top:24px");
  const priceCol = styled("div", "");
  priceCol.appendChild(styled("div", "font-size:12px;text-transform:uppercase;color:#6b7280", "Price"));
  priceCol.appendChild(
    styled(
      "div",
      "font-family:ui-monospace,monospace;font-size:36px;font-weight:700",
      formatCurrency(data.price, data.currency),
    ),
  );
  row.appendChild(priceCol);
  row.appendChild(
    styled(
      "div",
      `width:64px;height:64px;display:flex;align-items:center;justify-content:center;border:2px solid ${accent};color:${accent};border-radius:16px;font-size:30px;font-weight:700`,
      grade.letter,
    ),
  );
  card.appendChild(row);

  card.appendChild(styled("p", "margin:8px 0 0;font-size:14px;color:#4b5563;line-height:1.5", grade.summary));

  const stats = styled("div", "display:flex;gap:16px;margin-top:16px;font-size:14px");
  stats.appendChild(styled("span", "", `1Y ${formatSignedPercent(data.changes.year)}`));
  stats.appendChild(styled("span", "", `β ${data.beta.toFixed(2)}`));
  card.appendChild(stats);

  const list = styled("ul", "margin:24px 0 0;padding:16px 0 0;border-top:1px solid #e6e8ec;list-style:none");
  for (const m of data.metrics.slice(0, 4)) {
    const li = styled("li", "display:flex;justify-content:space-between;margin-bottom:8px;font-size:14px");
    li.appendChild(styled("span", "color:#6b7280", m.label));
    li.appendChild(styled("span", "font-family:ui-monospace,monospace;font-weight:500", m.display));
    list.appendChild(li);
  }
  card.appendChild(list);

  card.appendChild(
    styled(
      "p",
      "margin:24px 0 0;text-align:center;font-size:11px;color:#9aa1ad",
      `Educational only — not financial advice · ${BRAND.authors}`,
    ),
  );

  return card;
}

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
  const [error, setError] = useState<string | null>(null);

  async function exportStory() {
    setBusy(true);
    setError(null);

    const grade = overallGrade(data);
    const accent = readAccent();
    const card = buildStoryCard(data, grade, accent);

    const host = document.createElement("div");
    host.style.cssText =
      "position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;opacity:1";
    host.appendChild(card);
    document.body.appendChild(host);

    try {
      // Let the browser lay out the new subtree before rasterizing.
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });

      if (card.offsetWidth === 0 || card.offsetHeight === 0) {
        throw new Error("Story card has zero dimensions");
      }

      const url = await toPng(card, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        width: card.offsetWidth,
        height: card.offsetHeight,
      });

      const link = document.createElement("a");
      link.download = `msad-${data.ticker.toLowerCase()}-story.png`;
      link.href = url;
      link.click();
    } catch {
      setError("Story export failed — try again after the page finishes loading.");
    } finally {
      document.body.removeChild(host);
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => void exportStory()}
        disabled={busy}
        className="btn-ghost interactive text-xs disabled:opacity-50"
      >
        {busy ? "Exporting…" : "Story PNG"}
      </button>
      {error && <span className="max-w-48 text-right text-[0.65rem] text-down">{error}</span>}
    </div>
  );
}
