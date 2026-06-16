import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { appOrigin, redirectUri } from "./config.ts";

const req = (url: string) => new Request(url);

describe("appOrigin", () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of ["AUTH_URL", "NEXT_PUBLIC_SITE_URL", "VERCEL_URL"]) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("prefers AUTH_URL when set", () => {
    process.env.AUTH_URL = "https://msad.app/";
    assert.equal(appOrigin(req("https://msad-alpha.vercel.app/api/auth/google")), "https://msad.app");
  });

  it("uses the request origin over VERCEL_URL", () => {
    process.env.VERCEL_URL = "msad-39elc9y6d-rsheth8s-projects.vercel.app";
    assert.equal(
      appOrigin(req("https://msad-alpha.vercel.app/api/auth/google")),
      "https://msad-alpha.vercel.app",
    );
  });

  it("falls back to VERCEL_URL when the request has no origin", () => {
    process.env.VERCEL_URL = "msad-39elc9y6d-rsheth8s-projects.vercel.app";
    assert.equal(appOrigin(req("http://localhost/api/auth/google")), "http://localhost");
  });

  it("builds the Google callback redirect URI", () => {
    assert.equal(
      redirectUri(req("https://msad-alpha.vercel.app/api/auth/google")),
      "https://msad-alpha.vercel.app/api/auth/google/callback",
    );
  });
});
