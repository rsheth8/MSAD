/** Personal keys (PERS-*) use OAuth; commercial/partner keys use registerUser + userSecret. */
export function isPersonalSnaptradeKey(): boolean {
  return process.env.SNAPTRADE_CLIENT_ID?.trim().startsWith("PERS-") ?? false;
}

export type SnaptradeMode = "personal" | "commercial";

export function snaptradeMode(): SnaptradeMode {
  return isPersonalSnaptradeKey() ? "personal" : "commercial";
}
