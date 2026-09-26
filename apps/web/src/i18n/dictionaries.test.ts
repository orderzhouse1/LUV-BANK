import { describe, expect, it } from "vitest";
import {
  ALL_CATEGORY_CODES,
  DIFFICULT_CATEGORY_CODES,
  POSITIVE_CATEGORY_CODES,
} from "@luv-bank/validation";
import { ar } from "./dictionaries/ar";
import { en } from "./dictionaries/en";
import { getDirection } from "./config";

describe("Phase 1 dictionaries", () => {
  it("exposes login, register, and onboarding copy in English and Arabic", () => {
    expect(en.auth.loginTitle.length).toBeGreaterThan(0);
    expect(en.auth.registerTitle.length).toBeGreaterThan(0);
    expect(en.onboarding.title.length).toBeGreaterThan(0);
    expect(ar.auth.loginTitle.length).toBeGreaterThan(0);
    expect(ar.auth.registerTitle.length).toBeGreaterThan(0);
    expect(ar.onboarding.title.length).toBeGreaterThan(0);
  });

  it("maps locales to the correct document direction", () => {
    expect(getDirection("en")).toBe("ltr");
    expect(getDirection("ar")).toBe("rtl");
  });

  it("does not embed prototype sample data", () => {
    const blob = JSON.stringify({ en, ar });
    expect(blob).not.toMatch(/Sara|\+128|intimacy/i);
  });
});

describe("Phase 2 moment ledger copy", () => {
  it("provides English and Arabic labels for every category code", () => {
    for (const code of ALL_CATEGORY_CODES) {
      expect(en.categories[code].label.length).toBeGreaterThan(0);
      expect(en.categories[code].description.length).toBeGreaterThan(0);
      expect(ar.categories[code].label.length).toBeGreaterThan(0);
      expect(ar.categories[code].description.length).toBeGreaterThan(0);
    }
    expect(POSITIVE_CATEGORY_CODES).toHaveLength(6);
    expect(DIFFICULT_CATEGORY_CODES).toHaveLength(6);
  });

  it("does not use prototype weights or diagnostic ratio language in category copy", () => {
    const blob = JSON.stringify(en.categories);
    expect(blob).not.toMatch(/Gottman|\+128|\+8|\-7/i);
    expect(en.app).not.toHaveProperty("panelRatio");
    expect(en.app.balanceTitle.length).toBeGreaterThan(0);
    expect(ar.app.balanceTitle.length).toBeGreaterThan(0);
    expect(en.app.balanceDisclaimer.toLowerCase()).toContain("not clinical");
  });

  it("keeps log page titles bilingual and private", () => {
    expect(en.app.logTitle).toMatch(/moment/i);
    expect(ar.app.logTitle.length).toBeGreaterThan(0);
    expect(en.app.privacyReminder.toLowerCase()).toContain("private");
  });
});

describe("Phase 4 descriptive insight copy", () => {
  it("provides observation templates for every insight code in English and Arabic", () => {
    const codes = Object.keys(en.observations) as (keyof typeof en.observations)[];
    expect(codes.length).toBeGreaterThan(10);
    for (const code of codes) {
      expect(en.observations[code].length).toBeGreaterThan(0);
      expect(ar.observations[code].length).toBeGreaterThan(0);
    }
    const blob = JSON.stringify({ en: en.observations, ar: ar.observations });
    expect(blob).not.toMatch(/Thriving|Struggling|Gottman|toxic|healthy relationship/i);
  });
});

describe("Phase 5 gentle nudge copy", () => {
  it("provides nudge and action templates for every code in English and Arabic", () => {
    const nudgeCodes = Object.keys(en.nudges) as (keyof typeof en.nudges)[];
    const actionCodes = Object.keys(en.actions) as (keyof typeof en.actions)[];
    expect(nudgeCodes.length).toBe(6);
    expect(actionCodes.length).toBe(7);
    for (const code of nudgeCodes) {
      expect(en.nudges[code].length).toBeGreaterThan(0);
      expect(ar.nudges[code].length).toBeGreaterThan(0);
    }
    for (const code of actionCodes) {
      expect(en.actions[code].length).toBeGreaterThan(0);
      expect(ar.actions[code].length).toBeGreaterThan(0);
    }
    const blob = JSON.stringify({
      en: { nudges: en.nudges, actions: en.actions },
      ar: { nudges: ar.nudges, actions: ar.actions },
    });
    expect(blob).not.toMatch(/Thriving|Struggling|Gottman|toxic|must do|streak/i);
  });
});

describe("Phase 6 reminder copy", () => {
  it("provides purpose and weekday labels in English and Arabic", () => {
    for (const code of Object.keys(en.reminderPurposes) as (keyof typeof en.reminderPurposes)[]) {
      expect(en.reminderPurposes[code].title.length).toBeGreaterThan(0);
      expect(en.reminderPurposes[code].body.length).toBeGreaterThan(0);
      expect(ar.reminderPurposes[code].title.length).toBeGreaterThan(0);
      expect(ar.reminderPurposes[code].body.length).toBeGreaterThan(0);
    }
    for (const day of Object.keys(en.weekdays) as (keyof typeof en.weekdays)[]) {
      expect(en.weekdays[day].length).toBeGreaterThan(0);
      expect(ar.weekdays[day].length).toBeGreaterThan(0);
    }
    expect(en.app.remindersDeliveryNote.toLowerCase()).toContain("push");
    expect(ar.app.remindersDeliveryNote).toContain("إشعارات");
    const blob = JSON.stringify({
      en: en.reminderPurposes,
      ar: ar.reminderPurposes,
    });
    expect(blob).not.toMatch(/toxic|Gottman|must contact|low balance|counseling/i);
  });
});

describe("Phase 7 share copy", () => {
  it("explains immutability and excludes unsafe share language", () => {
    expect(en.app.shareImmutableNote.toLowerCase()).toContain("will not update");
    expect(ar.app.shareImmutableNote).toContain("نسخة");
    expect(en.app.shareExtendedNote.toLowerCase()).toContain("exclude");
    expect(en.app.shareLinkWarning.toLowerCase()).toContain("not end-to-end encrypted");
    for (const code of Object.keys(en.shareScopes) as (keyof typeof en.shareScopes)[]) {
      expect(en.shareScopes[code].label.length).toBeGreaterThan(0);
      expect(ar.shareScopes[code].label.length).toBeGreaterThan(0);
    }
    const blob = JSON.stringify({ en: en.shareScopes, ar: ar.shareScopes });
    expect(blob).not.toMatch(/Gottman|toxic|full ledger|partner account/i);
  });
});

describe("Phase 8 account security copy", () => {
  it("states immediate hard deletion and export privacy without clinical claims", () => {
    expect(en.app.settingsDeleteBody.toLowerCase()).toContain("immediate");
    expect(en.app.settingsDeleteBody.toLowerCase()).toContain("irreversible");
    expect(en.app.settingsDeleteBody.toLowerCase()).toContain("no soft-delete tombstone");
    expect(en.app.settingsExportWarning.toLowerCase()).toContain("private");
    expect(en.app.settingsDeleteNeonNote.toLowerCase()).toContain("neon");
    expect(ar.app.accountDeletedTitle.length).toBeGreaterThan(0);
    const blob = JSON.stringify({
      en: {
        delete: en.app.settingsDeleteBody,
        export: en.app.settingsExportBody,
        deleted: en.app.accountDeletedBody,
      },
      ar: {
        delete: ar.app.settingsDeleteBody,
        export: ar.app.settingsExportBody,
        deleted: ar.app.accountDeletedBody,
      },
    });
    expect(blob).not.toMatch(/Thriving|Struggling|Gottman|toxic|7-day|30-day queue/i);
  });
});

describe("Phase 9 PWA offline copy", () => {
  it("states that private data is not stored offline in English and Arabic", () => {
    expect(en.pwa.offlineBody.toLowerCase()).toContain("not stored for offline access");
    expect(ar.pwa.offlineBody).toContain("لا يتم تخزين");
    expect(en.pwa.offlineNotSignedOut.toLowerCase()).toContain("not a sign-out");
    expect(en.pwa.installBody.toLowerCase()).toContain("network");
    const blob = JSON.stringify({ en: en.pwa, ar: ar.pwa });
    expect(blob).not.toMatch(
      /push notification|firebase|background sync|full offline|Gottman|toxic/i,
    );
  });
});
