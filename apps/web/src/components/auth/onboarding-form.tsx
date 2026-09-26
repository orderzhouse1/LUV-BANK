"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AppLocale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { ApiClientError, createRelationshipProfile } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function OnboardingForm({
  locale,
  dictionary,
}: {
  locale: AppLocale;
  dictionary: Dictionary;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [label, setLabel] = useState("");
  const [partnerDisplayName, setPartnerDisplayName] = useState("");
  const [startedAt, setStartedAt] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await createRelationshipProfile({
        title,
        label: label || null,
        partnerDisplayName: partnerDisplayName || null,
        startedAt: startedAt ? new Date(startedAt).toISOString() : null,
        preferredLocale: locale,
      });
      router.replace(`/${locale}/app`);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError && err.code === "VALIDATION_ERROR") {
        setError(dictionary.auth.validationError);
      } else {
        setError(dictionary.auth.genericError);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="rounded-xl border border-border bg-surface-muted/50 px-4 py-3 text-sm leading-relaxed text-muted">
        {dictionary.onboarding.body}
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">{dictionary.onboarding.titleLabel}</Label>
        <Input
          id="title"
          name="title"
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="label">{dictionary.onboarding.labelLabel}</Label>
        <Input
          id="label"
          name="label"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="partnerDisplayName">{dictionary.onboarding.partnerLabel}</Label>
        <Input
          id="partnerDisplayName"
          name="partnerDisplayName"
          value={partnerDisplayName}
          onChange={(event) => setPartnerDisplayName(event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="startedAt">{dictionary.onboarding.startedAtLabel}</Label>
        <Input
          id="startedAt"
          name="startedAt"
          type="date"
          value={startedAt}
          onChange={(event) => setStartedAt(event.target.value)}
        />
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-difficult/30 bg-difficult/10 px-3 py-2 text-sm text-difficult"
        >
          {error}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? dictionary.onboarding.submitting : dictionary.onboarding.submit}
      </Button>
    </form>
  );
}
