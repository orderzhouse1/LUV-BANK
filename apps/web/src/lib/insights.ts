import type {
  InsightObservation,
  InsightObservationCode,
  MomentCategoryCode,
} from "@luv-bank/validation";
import { ALL_CATEGORY_CODES } from "@luv-bank/validation";
import type { Dictionary } from "@/i18n/dictionaries/en";

function isCategoryCode(value: string): value is MomentCategoryCode {
  return (ALL_CATEGORY_CODES as readonly string[]).includes(value);
}

export function formatInsightObservation(
  observation: InsightObservation,
  dictionary: Dictionary,
): string {
  const template = dictionary.observations[observation.code as InsightObservationCode];
  const params: Record<string, string> = {};

  for (const [key, value] of Object.entries(observation.parameters)) {
    if (value === null || value === undefined) {
      params[key] = "";
      continue;
    }
    if (key === "categoryCode" && typeof value === "string" && isCategoryCode(value)) {
      params.categoryLabel = dictionary.categories[value].label;
      params.categoryCode = value;
      continue;
    }
    if (key === "categoryCodes" && typeof value === "string") {
      const labels = value
        .split(",")
        .map((code) => code.trim())
        .filter(isCategoryCode)
        .map((code) => dictionary.categories[code].label);
      params.categoryLabels = labels.join(", ");
      params.categoryCodes = value;
      continue;
    }
    params[key] = String(value);
  }

  return template.replace(/\{(\w+)\}/g, (_, name: string) => params[name] ?? "");
}
