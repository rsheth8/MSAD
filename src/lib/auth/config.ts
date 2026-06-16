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
 * The app's public origin, used to build the OAuth redirect URI. Prefers an
 * explicit env (set this in prod), then Vercel's, then the request origin.
 */
export function appOrigin(req: Request): string {
  const explicit = process.env.AUTH_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return new URL(req.url).origin;
}

export function redirectUri(req: Request): string {
  return `${appOrigin(req)}/api/auth/google/callback`;
}
