import type { AppLocale } from "@/i18n/config";
import type { MomentCategoryCode, MomentKind } from "@luv-bank/validation";
import type { Dictionary } from "@/i18n/dictionaries/en";

export function formatMomentOccurredAt(iso: string, locale: AppLocale): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function categoryLabel(dictionary: Dictionary, code: MomentCategoryCode): string {
  return dictionary.categories[code].label;
}

export function kindLabel(dictionary: Dictionary, kind: MomentKind): string {
  return kind === "POSITIVE" ? dictionary.app.kindPositive : dictionary.app.kindDifficult;
}

/** Convert a Date to local datetime-local input value. */
export function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDatetimeLocalValue(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}
