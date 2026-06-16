/**
 * Auth is entirely optional. With no env vars the app runs in guest mode
 * (localStorage only) — same graceful-degradation pattern as FMP/Massive. Set
 * the three vars below to turn on "Sign in with Google" + cross-device sync.
 */

export interface AuthUser {
  sub: string; // Google account id — the stable per-user key
  email: string;
  name: string;
  picture?: string;
}

export function hasGoogleAuth(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CLIENT_SECRET?.trim() &&
      process.env.AUTH_SECRET?.trim(),
  );
}

export function googleClientId(): string {
  return process.env.GOOGLE_CLIENT_ID!.trim();
}

export function googleClientSecret(): string {
  return process.env.GOOGLE_CLIENT_SECRET!.trim();
}

export function authSecret(): string {
  return process.env.AUTH_SECRET!.trim();
}

/**
 * The app's public origin, used to build OAuth + brokerage redirect URIs.
 * Prefers an explicit env (custom domain), then the request the user actually
 * hit (so msad-alpha.vercel.app stays msad-alpha, not a deployment hash URL),
 * then Vercel's internal hostname as a last resort.
 */
export function appOrigin(req: Request): string {
  const explicit = process.env.AUTH_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const fromRequest = new URL(req.url).origin;
  if (fromRequest && fromRequest !== "null") return fromRequest;
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return fromRequest;
}

export function redirectUri(req: Request): string {
  return `${appOrigin(req)}/api/auth/google/callback`;
}
