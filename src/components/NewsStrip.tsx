"use client";

import { useEffect, useState } from "react";
import type { NewsDigest } from "@/lib/news/types";

export function NewsStrip({ ticker }: { ticker: string }) {
  const [digest, setDigest] = useState<NewsDigest | null>(null);

  useEffect(() => {
    fetch(`/api/news/${encodeURIComponent(ticker)}`)
      .then((r) => r.json())
      .then((d: NewsDigest) => setDigest(d))
      .catch(() => setDigest(null));
  }, [ticker]);

  if (!digest) return null;
  if (digest.articles.length === 0 && !digest.analyst && !digest.social) return null;

  return (
    <div className="surface mb-4 flex flex-wrap items-center gap-2 rounded-xl px-4 py-2.5 text-xs">
      <span className="rounded-full bg-accent/10 px-2 py-0.5 font-semibold text-accent">Context</span>
      <span className="text-foreground">{digest.summary}</span>
      {digest.isMock && <span className="text-[0.6rem] text-muted">Sample news data</span>}
      <span className="text-[0.6rem] text-muted">Headlines are not buy/sell signals</span>
    </div>
  );
}
