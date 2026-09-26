import { describe, expect, it } from "vitest";
import { buildWebManifest } from "@/lib/pwa-manifest";

describe("Phase 9 web manifests", () => {
  it("shares a stable app id across locales with localized start URLs", () => {
    const en = buildWebManifest("en");
    const ar = buildWebManifest("ar");

    expect(en.id).toBe("/");
    expect(ar.id).toBe("/");
    expect(en.id).toBe(ar.id);
    expect(en.start_url).toBe("/en/app");
    expect(ar.start_url).toBe("/ar/app");
    expect(en.display).toBe("standalone");
    expect(ar.dir).toBe("rtl");
    expect(en.dir).toBe("ltr");
    expect(en.lang).toBe("en");
    expect(ar.lang).toBe("ar");
  });

  it("includes safe shortcuts without personal or share data", () => {
    const en = buildWebManifest("en");
    const blob = JSON.stringify(en);
    expect(en.shortcuts?.length).toBe(4);
    expect(blob).not.toMatch(/token|balance|partner|email|DELETE_MY_ACCOUNT|shared#/i);
    expect(en.icons.some((icon) => icon.purpose === "maskable")).toBe(true);
  });
});
