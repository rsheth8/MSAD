/** Tiny, safe Markdown-ish renderer: paragraphs, **bold**, *italic*, `code`.
 *  Model output is rendered as React nodes (never dangerouslySetInnerHTML). */
import { Fragment } from "react";

function inline(text: string, keyBase: string) {
  // Split on **bold**, *italic*, `code` while keeping delimiters.
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((p, i) => {
    const key = `${keyBase}-${i}`;
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <strong key={key} className="font-semibold text-foreground">
          {p.slice(2, -2)}
        </strong>
      );
    }
    if (p.startsWith("`") && p.endsWith("`")) {
      return (
        <code key={key} className="rounded bg-foreground/8 px-1 font-mono text-[0.92em]">
          {p.slice(1, -1)}
        </code>
      );
    }
    if (p.startsWith("*") && p.endsWith("*")) {
      return (
        <em key={key} className="text-muted">
          {p.slice(1, -1)}
        </em>
      );
    }
    return <Fragment key={key}>{p}</Fragment>;
  });
}

export function Markish({ text, className = "" }: { text: string; className?: string }) {
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <div className={`space-y-2 ${className}`}>
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        const isList = lines.every((l) => /^\s*[-*]\s+/.test(l));
        if (isList) {
          return (
            <ul key={i} className="ml-4 list-disc space-y-1">
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*[-*]\s+/, ""), `${i}-${j}`)}</li>
              ))}
            </ul>
          );
        }
        return <p key={i}>{inline(block, String(i))}</p>;
      })}
    </div>
  );
}
