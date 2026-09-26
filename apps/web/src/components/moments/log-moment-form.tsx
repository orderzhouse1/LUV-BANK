"use client";

import {
  DIFFICULT_CATEGORY_CODES,
  POSITIVE_CATEGORY_CODES,
  type MomentCategoryCode,
  type MomentKind,
  type MomentResponse,
} from "@luv-bank/validation";
import {
  Frown,
  HandHeart,
  Heart,
  HeartHandshake,
  MessageCircleWarning,
  Sparkles,
  ThumbsUp,
  Users,
  VolumeX,
  EarOff,
  EyeOff,
  CloudRain,
} from "lucide-react";
import { useId, useState } from "react";
import type { AppLocale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { fromDatetimeLocalValue, toDatetimeLocalValue } from "@/lib/moments";

const POSITIVE_ICONS: Record<(typeof POSITIVE_CATEGORY_CODES)[number], typeof Heart> = {
  AFFECTION: Heart,
  APPRECIATION: ThumbsUp,
  QUALITY_TIME: Users,
  SUPPORT: HandHeart,
  SHARED_JOY: Sparkles,
  THOUGHTFUL_GESTURE: HeartHandshake,
};

const DIFFICULT_ICONS: Record<(typeof DIFFICULT_CATEGORY_CODES)[number], typeof Frown> = {
  TENSION: CloudRain,
  FELT_UNHEARD: EarOff,
  FELT_OVERLOOKED: EyeOff,
  ARGUMENT: MessageCircleWarning,
  EMOTIONAL_DISTANCE: VolumeX,
  HARSH_EXCHANGE: Frown,
};

export type MomentFormValues = {
  kind: MomentKind | null;
  categoryCode: MomentCategoryCode | null;
  note: string;
  whenMode: "now" | "custom";
  occurredLocal: string;
};

export function emptyMomentFormValues(): MomentFormValues {
  return {
    kind: null,
    categoryCode: null,
    note: "",
    whenMode: "now",
    occurredLocal: toDatetimeLocalValue(new Date()),
  };
}

export function valuesFromMoment(moment: MomentResponse): MomentFormValues {
  return {
    kind: moment.kind,
    categoryCode: moment.categoryCode,
    note: moment.note ?? "",
    whenMode: "custom",
    occurredLocal: toDatetimeLocalValue(new Date(moment.occurredAt)),
  };
}

export type MomentFormSubmitPayload = {
  kind: MomentKind;
  categoryCode: MomentCategoryCode;
  note?: string;
  occurredAt?: string;
};

export function MomentForm({
  dictionary,
  locale,
  mode,
  initial,
  pending,
  error,
  onSubmit,
  onCancel,
  submitLabel,
  pendingLabel,
}: {
  dictionary: Dictionary;
  locale: AppLocale;
  mode: "create" | "edit";
  initial: MomentFormValues;
  pending: boolean;
  error: string | null;
  onSubmit: (payload: MomentFormSubmitPayload) => void | Promise<void>;
  onCancel?: () => void;
  submitLabel: string;
  pendingLabel: string;
}) {
  const baseId = useId();
  const [values, setValues] = useState<MomentFormValues>(initial);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const categories =
    values.kind === "POSITIVE"
      ? POSITIVE_CATEGORY_CODES
      : values.kind === "DIFFICULT"
        ? DIFFICULT_CATEGORY_CODES
        : [];

  function validate(): MomentFormSubmitPayload | null {
    const next: Record<string, string> = {};
    if (!values.kind) {
      next.kind = dictionary.app.logValidationKind;
    }
    if (!values.categoryCode) {
      next.categoryCode = dictionary.app.logValidationCategory;
    }
    if ([...values.note].length > 500) {
      next.note = dictionary.app.logValidationNote;
    }
    let occurredAt: string | undefined;
    if (mode === "edit" || values.whenMode === "custom") {
      const iso = fromDatetimeLocalValue(values.occurredLocal);
      if (!iso || new Date(iso).getTime() > Date.now() + 5 * 60 * 1000) {
        next.occurredAt = dictionary.app.logValidationOccurredAt;
      } else {
        occurredAt = iso;
      }
    }
    setFieldErrors(next);
    if (Object.keys(next).length > 0 || !values.kind || !values.categoryCode) {
      return null;
    }
    return {
      kind: values.kind,
      categoryCode: values.categoryCode,
      note: values.note.length === 0 ? undefined : values.note,
      occurredAt: mode === "create" && values.whenMode === "now" ? undefined : occurredAt,
    };
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    const payload = validate();
    if (!payload) return;
    await onSubmit(payload);
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
      <fieldset className="space-y-3" disabled={pending}>
        <legend className="text-sm font-medium text-foreground" id={`${baseId}-kind`}>
          {dictionary.app.logKindLabel}
        </legend>
        <div
          role="radiogroup"
          aria-labelledby={`${baseId}-kind`}
          className="grid gap-3 sm:grid-cols-2"
        >
          {(
            [
              ["POSITIVE", dictionary.app.logKindPositive, "positive"],
              ["DIFFICULT", dictionary.app.logKindDifficult, "difficult"],
            ] as const
          ).map(([kind, label, tone]) => {
            const selected = values.kind === kind;
            return (
              <button
                key={kind}
                type="button"
                role="radio"
                aria-checked={selected}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-xl border px-4 py-3 text-start transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring",
                  selected
                    ? tone === "positive"
                      ? "border-positive bg-positive/10 text-foreground"
                      : "border-difficult bg-difficult/10 text-foreground"
                    : "border-border bg-surface hover:bg-surface-muted",
                )}
                onClick={() =>
                  setValues((prev) => ({
                    ...prev,
                    kind,
                    categoryCode: null,
                  }))
                }
              >
                <span
                  className={cn(
                    "inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold",
                    tone === "positive"
                      ? "bg-positive/20 text-positive"
                      : "bg-difficult/20 text-difficult",
                  )}
                  aria-hidden
                >
                  {kind === "POSITIVE" ? "+" : "–"}
                </span>
                <span className="font-medium">{label}</span>
              </button>
            );
          })}
        </div>
        {fieldErrors.kind ? (
          <p className="text-sm text-difficult" role="alert" id={`${baseId}-kind-error`}>
            {fieldErrors.kind}
          </p>
        ) : null}
      </fieldset>

      <fieldset className="space-y-3" disabled={pending || !values.kind}>
        <legend className="text-sm font-medium text-foreground" id={`${baseId}-category`}>
          {dictionary.app.logCategoryLabel}
        </legend>
        <p className="text-sm text-muted">{dictionary.app.logCategoryHint}</p>
        <div
          role="radiogroup"
          aria-labelledby={`${baseId}-category`}
          className="grid gap-3 sm:grid-cols-2"
        >
          {categories.map((code) => {
            const selected = values.categoryCode === code;
            const Icon =
              values.kind === "POSITIVE"
                ? POSITIVE_ICONS[code as (typeof POSITIVE_CATEGORY_CODES)[number]]
                : DIFFICULT_ICONS[code as (typeof DIFFICULT_CATEGORY_CODES)[number]];
            const copy = dictionary.categories[code];
            return (
              <button
                key={code}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={copy.label}
                className={cn(
                  "flex min-h-11 items-start gap-3 rounded-xl border px-4 py-3 text-start transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring",
                  selected
                    ? "border-brand bg-brand-soft/60"
                    : "border-border bg-surface hover:bg-surface-muted",
                )}
                onClick={() => setValues((prev) => ({ ...prev, categoryCode: code }))}
              >
                <Icon className="mt-0.5 size-5 shrink-0 text-brand-strong" aria-hidden />
                <span>
                  <span className="block font-medium text-foreground">{copy.label}</span>
                  <span className="mt-1 block text-sm text-muted">{copy.description}</span>
                </span>
              </button>
            );
          })}
        </div>
        {fieldErrors.categoryCode ? (
          <p className="text-sm text-difficult" role="alert">
            {fieldErrors.categoryCode}
          </p>
        ) : null}
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor={`${baseId}-note`}>{dictionary.app.logNoteLabel}</Label>
        <p className="text-sm text-muted" id={`${baseId}-note-hint`}>
          {dictionary.app.logNoteHint}
        </p>
        <textarea
          id={`${baseId}-note`}
          name="note"
          rows={4}
          maxLength={500}
          value={values.note}
          disabled={pending}
          aria-describedby={`${baseId}-note-hint`}
          className="w-full rounded-lg border border-border bg-surface px-3 py-3 text-base text-foreground outline-none focus-visible:border-brand"
          onChange={(event) => setValues((prev) => ({ ...prev, note: event.target.value }))}
        />
        {fieldErrors.note ? (
          <p className="text-sm text-difficult" role="alert">
            {fieldErrors.note}
          </p>
        ) : null}
      </div>

      <fieldset className="space-y-3" disabled={pending}>
        <legend className="text-sm font-medium text-foreground">
          {dictionary.app.logWhenLabel}
        </legend>
        {mode === "create" ? (
          <div
            className="flex flex-wrap gap-3"
            role="radiogroup"
            aria-label={dictionary.app.logWhenLabel}
          >
            <button
              type="button"
              role="radio"
              aria-checked={values.whenMode === "now"}
              className={cn(
                "min-h-11 rounded-xl border px-4 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring",
                values.whenMode === "now"
                  ? "border-brand bg-brand-soft"
                  : "border-border bg-surface",
              )}
              onClick={() => setValues((prev) => ({ ...prev, whenMode: "now" }))}
            >
              {dictionary.app.logWhenNow}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={values.whenMode === "custom"}
              className={cn(
                "min-h-11 rounded-xl border px-4 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring",
                values.whenMode === "custom"
                  ? "border-brand bg-brand-soft"
                  : "border-border bg-surface",
              )}
              onClick={() => setValues((prev) => ({ ...prev, whenMode: "custom" }))}
            >
              {dictionary.app.logWhenCustom}
            </button>
          </div>
        ) : null}
        {mode === "edit" || values.whenMode === "custom" ? (
          <div className="space-y-2">
            <Label htmlFor={`${baseId}-occurred`}>{dictionary.app.logOccurredAtLabel}</Label>
            <input
              id={`${baseId}-occurred`}
              type="datetime-local"
              lang={locale}
              value={values.occurredLocal}
              className="flex h-11 w-full max-w-sm rounded-lg border border-border bg-surface px-3 text-base outline-none focus-visible:border-brand"
              onChange={(event) =>
                setValues((prev) => ({ ...prev, occurredLocal: event.target.value }))
              }
            />
          </div>
        ) : null}
        {fieldErrors.occurredAt ? (
          <p className="text-sm text-difficult" role="alert">
            {fieldErrors.occurredAt}
          </p>
        ) : null}
      </fieldset>

      <div aria-live="polite" className="min-h-5 text-sm text-difficult">
        {error}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? pendingLabel : submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>
            {dictionary.app.editCancel}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
