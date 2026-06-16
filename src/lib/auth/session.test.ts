import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readCookie, SESSION_COOKIE, signSession, verifySession } from "./session.ts";

// session.ts reads AUTH_SECRET lazily via authSecret() (not at import time), so
// setting it here — before any test runs — is sufficient.
process.env.AUTH_SECRET = "test-secret-please-ignore-0123456789abcdef";

const user = { sub: "google-123", email: "a@b.com", name: "Ada", picture: "https://x/y.png" };

describe("session sign/verify", () => {
  it("round-trips a valid session", async () => {
    const token = await signSession(user);
    const out = await verifySession(token);
    assert.ok(out);
    assert.equal(out!.sub, "google-123");
    assert.equal(out!.email, "a@b.com");
    assert.equal(out!.name, "Ada");
  });

  it("rejects a tampered token", async () => {
    const token = await signSession(user);
    const parts = token.split(".");
    // flip the payload
    const tampered = `${parts[0]}.${parts[1]}x.${parts[2]}`;
    assert.equal(await verifySession(tampered), null);
  });

  it("rejects garbage and empty tokens", async () => {
    assert.equal(await verifySession(undefined), null);
    assert.equal(await verifySession(""), null);
    assert.equal(await verifySession("a.b"), null);
    assert.equal(await verifySession("not-a-jwt"), null);
  });
});

describe("readCookie", () => {
  it("extracts a named cookie from the header", () => {
    const req = new Request("https://x", {
      headers: { cookie: `foo=1; ${SESSION_COOKIE}=abc%20def; bar=2` },
    });
    assert.equal(readCookie(req, SESSION_COOKIE), "abc def");
    assert.equal(readCookie(req, "bar"), "2");
    assert.equal(readCookie(req, "missing"), undefined);
  });

  it("returns undefined with no cookie header", () => {
    assert.equal(readCookie(new Request("https://x"), "anything"), undefined);
  });
});
