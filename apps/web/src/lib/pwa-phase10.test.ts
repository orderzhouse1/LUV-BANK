import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = path.resolve(__dirname, "../..");

describe("Phase 10 PWA privacy regression", () => {
  it("keeps the service worker free of private-data and push/sync handlers", () => {
    const swPath = path.join(webRoot, "public", "sw.js");
    expect(existsSync(swPath)).toBe(true);
    const source = readFileSync(swPath, "utf8");
    expect(source).toContain("/_next/static/");
    expect(source).toContain("offline-en.html");
    expect(source).not.toMatch(/PushManager|showNotification|BackgroundSync|periodicSync/i);
    expect(source).not.toMatch(/api\/v1\/|account\/export|passwordHash|tokenHash/i);
  });
});
