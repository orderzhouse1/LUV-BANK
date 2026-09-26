import { describe, expect, it } from "vitest";
import {
  ALL_CATEGORY_CODES,
  DIFFICULT_CATEGORY_CODES,
  MVP_EQUAL_WEIGHT_V1,
  MVP_EQUAL_WEIGHT_V1_IMPACTS,
  POSITIVE_CATEGORY_CODES,
  assertMvpEqualWeightPolicyComplete,
  evaluateWithActiveScoringPolicy,
} from "@luv-bank/validation";

describe("MVP_EQUAL_WEIGHT_V1 scoring policy", () => {
  it("lists every Phase 2 category code exactly once with equal magnitudes", () => {
    expect(() => assertMvpEqualWeightPolicyComplete()).not.toThrow();
    expect(Object.keys(MVP_EQUAL_WEIGHT_V1_IMPACTS)).toHaveLength(ALL_CATEGORY_CODES.length);
    for (const code of POSITIVE_CATEGORY_CODES) {
      expect(MVP_EQUAL_WEIGHT_V1_IMPACTS[code]).toBe(1);
    }
    for (const code of DIFFICULT_CATEGORY_CODES) {
      expect(MVP_EQUAL_WEIGHT_V1_IMPACTS[code]).toBe(-1);
    }
  });

  it("evaluates positive and difficult categories through the active policy", () => {
    const positive = evaluateWithActiveScoringPolicy("POSITIVE", "SUPPORT");
    expect(positive).toEqual({ scoreImpact: 1, scoringVersion: MVP_EQUAL_WEIGHT_V1 });
    const difficult = evaluateWithActiveScoringPolicy("DIFFICULT", "TENSION");
    expect(difficult).toEqual({ scoreImpact: -1, scoringVersion: MVP_EQUAL_WEIGHT_V1 });
  });
});
