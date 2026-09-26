import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = path.resolve(__dirname, "../..");
const swPath = path.join(webRoot, "public", "sw.js");

describe("Phase 9 service worker privacy policy", () => {
  it("ships an allowlisted sw.js without push or mutation replay", () => {
    expect(existsSync(swPath)).toBe(true);
    const source = readFileSync(swPath, "utf8");

    expect(source).toContain("phase-9-v1");
    expect(source).toContain("/_next/static/");
    expect(source).toContain("/pwa/");
    expect(source).toContain("offline-en.html");
    expect(source).toContain("offline-ar.html");
    expect(source).toContain("no-store");
    expect(source).toContain("_rsc");
    expect(source).not.toMatch(
      /PushManager|showNotification|BackgroundSync|periodicSync|IndexedDB/i,
    );
    expect(source).not.toMatch(/api\/v1\/account\/export|rawToken|passwordHash/i);
  });

  it("keeps offline documents and icons under the dedicated public brand path", () => {
    expect(existsSync(path.join(webRoot, "public/pwa/offline-en.html"))).toBe(true);
    expect(existsSync(path.join(webRoot, "public/pwa/offline-ar.html"))).toBe(true);
    expect(existsSync(path.join(webRoot, "public/pwa/mark.svg"))).toBe(true);
    expect(existsSync(path.join(webRoot, "public/pwa/icons/icon-192.png"))).toBe(true);
    expect(existsSync(path.join(webRoot, "public/pwa/icons/icon-512-maskable.png"))).toBe(true);
  });
});
