import { test, expect } from "@playwright/test";

test.describe("MSAD public pages", () => {
  test("home page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("dashboard loads for guests", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText(/journal|dashboard/i).first()).toBeVisible();
  });

  test("settings page loads", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  });

  test("session API returns guest state", async ({ request }) => {
    const res = await request.get("/api/auth/session");
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data).toHaveProperty("user");
    expect(data).toHaveProperty("authEnabled");
    expect(data).toHaveProperty("durableStore");
  });

  test("explain API rejects invalid ticker", async ({ request }) => {
    const res = await request.post("/api/explain", {
      data: { ticker: "!!!", kind: "overview", depth: 2 },
    });
    expect(res.status()).toBe(400);
  });

  test("profile API requires auth", async ({ request }) => {
    const res = await request.get("/api/profile");
    expect(res.status()).toBe(401);
  });
});
