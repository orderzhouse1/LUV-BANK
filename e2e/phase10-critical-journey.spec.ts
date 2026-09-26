import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test.describe("Phase 10 critical journey", () => {
  test("register → onboard → log moment → insights; Arabic RTL; PWA privacy assets", async ({
    page,
    request,
  }) => {
    const email = `e2e-${randomUUID()}@example.com`;
    const password = "passphrase-twelve";

    await page.goto("/en/register");
    await page.locator("#displayName").fill("E2E User");
    await page.locator("#email").fill(email);
    await page.locator("#password").fill(password);
    await page.locator("#acceptedTerms").click();
    await page.getByRole("button", { name: "Create account" }).click();

    await page.waitForURL(/\/en\/app(\/onboarding)?/);

    if (page.url().includes("/onboarding")) {
      await page.getByRole("textbox", { name: /Private profile name/i }).fill("E2E Bond");
      await page.getByRole("button", { name: "Continue to your space" }).click();
      await page.waitForURL(/\/en\/app$/);
    }

    await page.goto("/en/app/log");
    await page.getByRole("radio", { name: "Positive moment" }).click();
    await page.getByRole("radio", { name: /Affection/i }).click();
    await page.getByRole("button", { name: "Save moment" }).click();
    await page.waitForURL(/\/en\/app$/);

    await page.goto("/en/app/insights");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");

    await page.goto("/ar");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

    const manifest = await request.get("/en/manifest.webmanifest");
    expect(manifest.ok()).toBeTruthy();
    const manifestJson = await manifest.json();
    expect(manifestJson.start_url).toBe("/en/app");
    expect(JSON.stringify(manifestJson)).not.toMatch(/passwordHash|refreshToken|tokenHash/i);

    const sw = await request.get("/sw.js");
    expect(sw.ok()).toBeTruthy();
    expect((sw.headers()["cache-control"] ?? "").toLowerCase()).toContain("no-cache");
    const swBody = await sw.text();
    expect(swBody).not.toMatch(/PushManager|BackgroundSync|api\/v1\/moments/i);

    const offlineEn = await request.get("/pwa/offline-en.html");
    expect(offlineEn.ok()).toBeTruthy();
    expect(await offlineEn.text()).toMatch(/not stored for offline access/i);

    const offlineAr = await request.get("/pwa/offline-ar.html");
    expect(offlineAr.ok()).toBeTruthy();
    expect(await offlineAr.text()).toContain("لا يتم تخزين");
  });
});
