"use client";

import { useEffect, useState } from "react";
import type { PrivateShareSnapshotPayload } from "@luv-bank/validation";
import type { AppLocale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { resolveShareSnapshot } from "@/lib/api-client";
import { SharePayloadView } from "@/components/shares/share-payload-view";

export function PublicShareClient({
  locale,
  dictionary,
}: {
  locale: AppLocale;
  dictionary: Dictionary;
}) {
  const [payload, setPayload] = useState<PrivateShareSnapshotPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<"missing" | "unavailable" | null>(null);

  useEffect(() => {
    let cancelled = false;
    const token = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";

    async function run() {
      if (!token || token.length < 32) {
        if (!cancelled) {
          setError("missing");
          setLoading(false);
        }
        return;
      }
      try {
        const result = await resolveShareSnapshot(token);
        if (!cancelled) {
          setPayload(result.payload);
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setError("unavailable");
          setPayload(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-12">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-brand-strong">
          {dictionary.app.publicShareTitle}
        </h1>
        <p className="text-sm leading-relaxed text-muted">{dictionary.app.publicShareDisclaimer}</p>
      </div>

      {loading ? <p className="text-sm text-muted">{dictionary.app.publicShareLoading}</p> : null}
      {error === "missing" ? (
        <p className="text-sm text-muted">{dictionary.app.publicShareMissing}</p>
      ) : null}
      {error === "unavailable" ? (
        <p className="text-sm text-destructive" role="alert">
          {dictionary.app.publicShareUnavailable}
        </p>
      ) : null}
      {payload ? (
        <div className="rounded-2xl border border-border bg-surface/90 p-5">
          <SharePayloadView payload={payload} locale={locale} dictionary={dictionary} />
        </div>
      ) : null}
    </div>
  );
}
