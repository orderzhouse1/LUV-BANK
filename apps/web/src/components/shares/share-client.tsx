"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  CreateShareSnapshotRequest,
  PrivateShareSnapshotPayload,
  ShareExpirationDuration,
  ShareScopeCode,
  ShareSnapshotListResponse,
  ShareWindow,
} from "@luv-bank/validation";
import type { AppLocale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import {
  createShareSnapshot,
  listShareSnapshots,
  previewShareSnapshot,
  revokeShareSnapshot,
} from "@/lib/api-client";
import { SharePayloadView } from "@/components/shares/share-payload-view";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const SCOPES: ShareScopeCode[] = [
  "POSITIVE_ONLY",
  "SELECTED_PERIOD_SUMMARY",
  "EXTENDED_BALANCE_SUMMARY",
];
const WINDOWS: ShareWindow[] = ["7d", "30d", "90d"];
const EXPIRATIONS: ShareExpirationDuration[] = ["1d", "7d", "30d"];

function appBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function buildShareUrl(locale: AppLocale, token: string): string {
  return `${appBaseUrl()}/${locale}/shared#${token}`;
}

function statusLabel(dictionary: Dictionary, status: string): string {
  switch (status) {
    case "ACTIVE":
      return dictionary.app.shareStatusActive;
    case "EXPIRED":
      return dictionary.app.shareStatusExpired;
    case "REVOKED":
      return dictionary.app.shareStatusRevoked;
    default:
      return status;
  }
}

export function ShareClient({ locale, dictionary }: { locale: AppLocale; dictionary: Dictionary }) {
  const [scope, setScope] = useState<ShareScopeCode>("POSITIVE_ONLY");
  const [window, setWindow] = useState<ShareWindow>("30d");
  const [expiration, setExpiration] = useState<ShareExpirationDuration>("7d");
  const [preview, setPreview] = useState<PrivateShareSnapshotPayload | null>(null);
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [shares, setShares] = useState<ShareSnapshotListResponse["shares"]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listShareSnapshots();
      setShares(result.shares);
    } catch {
      setError(dictionary.app.shareError);
    } finally {
      setLoading(false);
    }
  }, [dictionary.app.shareError]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const requestBody = (): CreateShareSnapshotRequest => ({
    scope,
    window,
    expiration,
  });

  async function onPreview() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await previewShareSnapshot(requestBody());
      setPreview(result.payload);
    } catch {
      setError(dictionary.app.shareError);
    } finally {
      setBusy(false);
    }
  }

  async function onCreate() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await createShareSnapshot(requestBody());
      const url = buildShareUrl(locale, result.token);
      setCreatedLink(url);
      setPreview(result.payload);
      setShares((prev) => [result.share, ...prev]);
      setMessage(dictionary.app.shareTokenOnce);
    } catch {
      setError(dictionary.app.shareError);
    } finally {
      setBusy(false);
    }
  }

  async function onCopy() {
    if (!createdLink) return;
    try {
      await navigator.clipboard.writeText(createdLink);
      setMessage(dictionary.app.shareCopied);
    } catch {
      setError(dictionary.app.shareError);
    }
  }

  async function onRevoke(shareId: string) {
    setBusy(true);
    setError(null);
    try {
      const result = await revokeShareSnapshot(shareId);
      setShares((prev) => prev.map((item) => (item.id === shareId ? result.share : item)));
    } catch {
      setError(dictionary.app.shareError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <p className="rounded-xl border border-border bg-surface px-4 py-3 text-sm leading-relaxed">
        {dictionary.app.shareImmutableNote}
      </p>
      <p className="text-sm leading-relaxed text-muted">{dictionary.app.shareLinkWarning}</p>
      {scope === "EXTENDED_BALANCE_SUMMARY" ? (
        <p className="text-sm text-muted">{dictionary.app.shareExtendedNote}</p>
      ) : null}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-muted">{message}</p> : null}

      <section className="space-y-4 rounded-2xl border border-border bg-surface/90 p-5">
        <div className="space-y-2">
          <Label htmlFor="share-scope">{dictionary.app.shareScopeLabel}</Label>
          <select
            id="share-scope"
            className="flex h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm"
            value={scope}
            onChange={(event) => setScope(event.target.value as ShareScopeCode)}
          >
            {SCOPES.map((code) => (
              <option key={code} value={code}>
                {dictionary.shareScopes[code].label}
              </option>
            ))}
          </select>
          <p className="text-sm text-muted">{dictionary.shareScopes[scope].description}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="share-window">{dictionary.app.shareWindowLabel}</Label>
            <select
              id="share-window"
              className="flex h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm"
              value={window}
              onChange={(event) => setWindow(event.target.value as ShareWindow)}
            >
              {WINDOWS.map((key) => (
                <option key={key} value={key}>
                  {key === "7d"
                    ? dictionary.app.shareWindow7d
                    : key === "30d"
                      ? dictionary.app.shareWindow30d
                      : dictionary.app.shareWindow90d}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="share-expiration">{dictionary.app.shareExpirationLabel}</Label>
            <select
              id="share-expiration"
              className="flex h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm"
              value={expiration}
              onChange={(event) => setExpiration(event.target.value as ShareExpirationDuration)}
            >
              {EXPIRATIONS.map((key) => (
                <option key={key} value={key}>
                  {key === "1d"
                    ? dictionary.app.shareExpiration1d
                    : key === "7d"
                      ? dictionary.app.shareExpiration7d
                      : dictionary.app.shareExpiration30d}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={() => void onPreview()}>
            {busy ? dictionary.app.sharePreviewing : dictionary.app.sharePreview}
          </Button>
          <Button type="button" disabled={busy} onClick={() => void onCreate()}>
            {busy ? dictionary.app.shareCreating : dictionary.app.shareCreate}
          </Button>
        </div>
      </section>

      {createdLink ? (
        <section className="space-y-3 rounded-2xl border border-border bg-surface/90 p-5">
          <p className="text-sm text-muted">{dictionary.app.shareTokenOnce}</p>
          <code className="block break-all rounded-lg bg-background px-3 py-2 text-xs">
            {createdLink}
          </code>
          <Button type="button" variant="outline" onClick={() => void onCopy()}>
            {dictionary.app.shareCopyLink}
          </Button>
        </section>
      ) : null}

      {preview ? (
        <section className="space-y-3 rounded-2xl border border-border bg-surface/90 p-5">
          <h2 className="text-lg font-semibold text-brand-strong">
            {dictionary.app.sharePreviewTitle}
          </h2>
          <SharePayloadView payload={preview} locale={locale} dictionary={dictionary} />
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-brand-strong">{dictionary.app.shareListTitle}</h2>
        {loading ? <p className="text-sm text-muted">{dictionary.app.shareLoading}</p> : null}
        {!loading && shares.length === 0 ? (
          <p className="text-sm text-muted">{dictionary.app.shareListEmpty}</p>
        ) : null}
        <ul className="space-y-3">
          {shares.map((share) => (
            <li
              key={share.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm"
            >
              <div className="space-y-1">
                <p className="font-medium">{dictionary.shareScopes[share.scope].label}</p>
                <p className="text-muted">
                  {statusLabel(dictionary, share.status)} · {share.window} ·{" "}
                  {new Date(share.expiresAt).toLocaleString(locale === "ar" ? "ar" : "en")}
                </p>
              </div>
              {share.status === "ACTIVE" ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => void onRevoke(share.id)}
                >
                  {busy ? dictionary.app.shareRevoking : dictionary.app.shareRevoke}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
