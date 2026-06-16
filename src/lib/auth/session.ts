/**
 * Stateless sessions — a compact HMAC-SHA256 (JWT-style) token in an httpOnly
 * cookie, signed with AUTH_SECRET via Web Crypto. No database needed for auth.
 * Server-only.
 */
import { authSecret } from "./config";
import type { AuthUser } from "./config";

export const SESSION_COOKIE = "msad_session";
export const STATE_COOKIE = "msad_oauth_state";
const MAX_AGE_S = 60 * 60 * 24 * 30; // 30 days

interface SessionPayload extends AuthUser {
  iat: number;
  exp: number;
}

function b64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(str: string): Uint8Array<ArrayBuffer> {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const bin = atob(str.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(authSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signSession(user: AuthUser): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = { ...user, iat: now, exp: now + MAX_AGE_S };
  const enc = new TextEncoder();
  const header = b64urlEncode(enc.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = b64urlEncode(enc.encode(JSON.stringify(payload)));
  const data = `${header}.${body}`;
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(), enc.encode(data));
  return `${data}.${b64urlEncode(new Uint8Array(sig))}`;
}

export async function verifySession(token: string | undefined): Promise<AuthUser | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const data = `${header}.${body}`;
  try {
    const ok = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(),
      b64urlDecode(sig),
      new TextEncoder().encode(data),
    );
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(body))) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (!payload.sub) return null;
    return { sub: payload.sub, email: payload.email, name: payload.name, picture: payload.picture };
  } catch {
    return null;
  }
}

/** Parse a single cookie value out of a Request's Cookie header (runtime-agnostic). */
export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return undefined;
}

export async function getSession(req: Request): Promise<AuthUser | null> {
  return verifySession(readCookie(req, SESSION_COOKIE));
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE_S,
};
