import type { OptionContract } from "@/lib/types";
import type { OptionLegQuote } from "./types";

export function toOptionContract(
  type: "call" | "put",
  strike: number,
  quote: OptionLegQuote,
  expiry: string,
): OptionContract {
  return {
    type,
    strike,
    premium: quote.premium,
    expiry,
    delta: quote.delta,
  };
}
