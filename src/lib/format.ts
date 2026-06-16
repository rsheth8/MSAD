/** Small formatting helpers shared across the UI. */

export function formatCurrency(value: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

/** e.g. 0.147 -> "14.7%" (input is a ratio). */
export function formatPercent(ratio: number, digits = 1): string {
  return `${(ratio * 100).toFixed(digits)}%`;
}

/** Signed percent for "vs industry" / price changes, already in percent units. */
export function formatSignedPercent(pct: number, digits = 1): string {
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(digits)}%`;
}

/** e.g. 32.4 -> "32.4×" */
export function formatMultiple(value: number, digits = 1): string {
  return `${value.toFixed(digits)}×`;
}

export function formatRatio(value: number, digits = 2): string {
  return value.toFixed(digits);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const ISO_DATE_PREFIX = /^(\d{4})-(\d{2})-(\d{2})/;

/** ISO date (or datetime) → "Jun 14". Falls back gracefully on bad input. */
export function formatShortDate(iso: string): string {
  const trimmed = iso.trim();
  const match = trimmed.match(ISO_DATE_PREFIX);
  if (match) {
    const mm = Number(match[2]);
    const dd = Number(match[3]);
    if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
      return `${MONTHS[mm - 1]} ${dd}`;
    }
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return `${MONTHS[parsed.getUTCMonth()]} ${parsed.getUTCDate()}`;
  }

  return trimmed.slice(0, 12) || "—";
}

/**
 * Format a metric value using the convention for its key. Shared by the mock
 * generator, the live aggregator, and the count-up animation (which needs to
 * format intermediate frame values, not just the final string).
 */
export function formatMetricDisplay(key: string, value: number | null): string {
  if (value === null) return "N/A";
  switch (key) {
    case "pe":
    case "evEbitda":
      return formatMultiple(value);
    case "assetLiability":
      return formatRatio(value);
    case "divYield":
      return formatPercent(value, 2);
    case "roe":
    case "opRevenue":
    case "cashFlowChange":
    default:
      return formatPercent(value);
  }
}
