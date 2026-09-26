"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { AppLocale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { ApiClientError, createMoment } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  emptyMomentFormValues,
  MomentForm,
  type MomentFormSubmitPayload,
} from "@/components/moments/log-moment-form";

export function LogMomentClient({
  locale,
  dictionary,
}: {
  locale: AppLocale;
  dictionary: Dictionary;
}) {
  const router = useRouter();
  const mutationIdRef = useRef<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(payload: MomentFormSubmitPayload) {
    setError(null);
    setSuccess(null);
    if (!mutationIdRef.current) {
      mutationIdRef.current = crypto.randomUUID();
    }
    setPending(true);
    try {
      await createMoment({
        kind: payload.kind,
        categoryCode: payload.categoryCode,
        note: payload.note,
        occurredAt: payload.occurredAt,
        clientMutationId: mutationIdRef.current,
      });
      setSuccess(dictionary.app.logSuccess);
      mutationIdRef.current = null;
      setFormKey((key) => key + 1);
      router.push(`/${locale}/app`);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.code === "PROFILE_REQUIRED") {
          setError(dictionary.app.logProfileRequired);
        } else if (err.code === "VALIDATION_ERROR" || err.code === "CATEGORY_KIND_MISMATCH") {
          setError(dictionary.app.logValidationCategory);
        } else if (err.code === "INVALID_OCCURRED_AT") {
          setError(dictionary.app.logValidationOccurredAt);
        } else {
          setError(dictionary.auth.genericError);
        }
      } else {
        setError(dictionary.auth.genericError);
      }
    } finally {
      setPending(false);
    }
  }

  function onClear() {
    mutationIdRef.current = null;
    setError(null);
    setSuccess(null);
    setFormKey((key) => key + 1);
  }

  return (
    <div className="space-y-4">
      <div aria-live="polite" className="min-h-5 text-sm text-positive">
        {success}
      </div>
      <MomentForm
        key={formKey}
        dictionary={dictionary}
        locale={locale}
        mode="create"
        initial={emptyMomentFormValues()}
        pending={pending}
        error={error}
        onSubmit={onSubmit}
        submitLabel={dictionary.app.logSubmit}
        pendingLabel={dictionary.app.logSubmitting}
      />
      <Button type="button" variant="ghost" disabled={pending} onClick={onClear}>
        {dictionary.app.logCancel}
      </Button>
    </div>
  );
}
