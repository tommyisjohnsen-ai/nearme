import { test, expect } from "@playwright/test";

// Real end-to-end order flow against a seeded local Supabase.
//
// Pre-conditions:
//   1. supabase start && supabase db reset
//   2. Set TEST_CUSTOMER_EMAIL / TEST_VENDOR_EMAIL in env (default to seed users)
//   3. Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY so we can mint sessions
//      directly (bypasses the magic-link round trip).
//
// CI parks two browser contexts: one customer, one vendor. They walk through:
//   customer browses kart -> sends order -> vendor accepts -> vendor en_route
//   -> vendor delivered -> both see "Levert".
//
// This file is intentionally a SKELETON — real impl needs the Supabase admin
// SDK to inject sessions, which we add in CI step 3 (see DECISIONS.md).
test.skip("two-actor order flow (requires seeded Supabase)", async ({ browser }) => {
  const customerCtx = await browser.newContext();
  const vendorCtx = await browser.newContext();

  const customer = await customerCtx.newPage();
  const vendor = await vendorCtx.newPage();

  // TODO: inject Supabase session cookies here once helper utils are written.
  await customer.goto("/");
  await vendor.goto("/vendor/dashboard");

  // Customer creates order
  await customer.getByRole("button", { name: "Bestill" }).first().click();
  await customer.getByRole("button", { name: "Send bestilling" }).click();
  await expect(customer.getByText("Forespurt")).toBeVisible();

  // Vendor accepts
  await vendor.getByRole("link").first().click();
  await vendor.getByRole("button", { name: /Aksepter/ }).click();
  await expect(vendor.getByText("Akseptert")).toBeVisible();

  // Customer sees status updated via realtime
  await expect(customer.getByText("Akseptert")).toBeVisible();

  // Walk through to delivered
  await vendor.getByRole("button", { name: /På vei/ }).click();
  await vendor.getByRole("button", { name: /Marker levert/ }).click();
  await expect(customer.getByText("Levert")).toBeVisible();
});
