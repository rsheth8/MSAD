import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { isPersonalSnaptradeKey, snaptradeMode } from "./mode.ts";

describe("snaptrade mode", () => {
  const saved = process.env.SNAPTRADE_CLIENT_ID;

  afterEach(() => {
    if (saved === undefined) delete process.env.SNAPTRADE_CLIENT_ID;
    else process.env.SNAPTRADE_CLIENT_ID = saved;
  });

  it("detects personal keys by PERS- prefix", () => {
    process.env.SNAPTRADE_CLIENT_ID = "PERS-ZENSJ7VXBDNUPHI0X6PR";
    assert.equal(isPersonalSnaptradeKey(), true);
    assert.equal(snaptradeMode(), "personal");
  });

  it("treats partner keys as commercial", () => {
    process.env.SNAPTRADE_CLIENT_ID = "PARTNER-ABC123";
    assert.equal(isPersonalSnaptradeKey(), false);
    assert.equal(snaptradeMode(), "commercial");
  });
});
