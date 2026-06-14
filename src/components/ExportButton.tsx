"use client";

import { useState } from "react";
import { toPng } from "html-to-image";

export function ExportButton({
  targetId,
  ticker,
  disabled,
}: {
  targetId: string;
  ticker: string;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    const node = document.getElementById(targetId);
    if (!node) return;

    setBusy(true);
    setError(null);
    try {
      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue("--background").trim() || "#f4f5f7",
      });
      const link = document.createElement("a");
      link.download = `amsad-${ticker.toLowerCase()}-report.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      setError("Export failed — try again after the page finishes loading.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleExport}
        disabled={disabled || busy}
        className="surface rounded-full px-3 py-1.5 text-xs font-medium text-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Exporting…" : "Export PNG"}
      </button>
      {error && <span className="max-w-48 text-right text-[0.65rem] text-down">{error}</span>}
    </div>
  );
}
