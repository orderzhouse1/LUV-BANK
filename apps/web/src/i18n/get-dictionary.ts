import type { AppLocale } from "./config";
import type { Dictionary } from "./dictionaries/en";
import { en } from "./dictionaries/en";
import { ar } from "./dictionaries/ar";

const dictionaries: Record<AppLocale, Dictionary> = {
  en,
  ar,
};

export function getDictionary(locale: AppLocale): Dictionary {
  return dictionaries[locale];
}
