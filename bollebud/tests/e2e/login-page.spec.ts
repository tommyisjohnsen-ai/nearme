import { test, expect } from "@playwright/test";

// Smoke test: unauthenticated visit redirects to /login and the form renders.
// Full flow tests (request order -> chat -> deliver) require a seeded Supabase
// instance + magic-link email capture, which we set up in CI separately.
test("anonymous user lands on login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Bollebud" })).toBeVisible();
  await expect(page.getByLabel("E-postadresse")).toBeVisible();
});

test("login form requires email", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /Send innloggingslenke/ }).click();
  // HTML5 validation kicks in — no network call should fire.
  await expect(page).toHaveURL(/\/login/);
});

test("health endpoint returns ok", async ({ page }) => {
  const res = await page.request.get("/api/health");
  expect(res.ok()).toBe(true);
  const body = await res.json();
  expect(body.ok).toBe(true);
});
