"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  DeletionSummaryResponse,
  SessionListResponse,
  ShareSnapshotListResponse,
} from "@luv-bank/validation";
import type { AppLocale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import {
  ApiClientError,
  changeAccountPassword,
  deleteAccountPermanently,
  exportPersonalData,
  fetchDeletionSummary,
  hardDeleteAccountShare,
  listAccountSessions,
  listShareSnapshots,
  revokeAccountSession,
  revokeAllAccountShares,
} from "@/lib/api-client";
import { InstallAppButton } from "@/components/pwa/install-app-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogoutButton } from "@/components/auth/logout-button";

function formatWhen(iso: string | null, locale: AppLocale): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function mapAccountError(error: unknown, dictionary: Dictionary): string {
  if (error instanceof ApiClientError && error.code === "CURRENT_PASSWORD_INVALID") {
    return dictionary.app.settingsInvalidPassword;
  }
  return dictionary.app.settingsError;
}

export function AccountSettingsClient({
  locale,
  dictionary,
}: {
  locale: AppLocale;
  dictionary: Dictionary;
}) {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionListResponse["sessions"]>([]);
  const [shares, setShares] = useState<ShareSnapshotListResponse["shares"]>([]);
  const [summary, setSummary] = useState<DeletionSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [currentPasswordForChange, setCurrentPasswordForChange] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [exportPassword, setExportPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deletePhrase, setDeletePhrase] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sessionResult, shareResult] = await Promise.all([
        listAccountSessions(),
        listShareSnapshots(),
      ]);
      setSessions(sessionResult.sessions);
      setShares(shareResult.shares);
    } catch {
      setError(dictionary.app.settingsError);
    } finally {
      setLoading(false);
    }
  }, [dictionary.app.settingsError]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onRevokeSession(sessionId: string, isCurrent: boolean) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await revokeAccountSession(sessionId);
      if (isCurrent) {
        router.replace(`/${locale}/login`);
        router.refresh();
        return;
      }
      await load();
    } catch (err) {
      setError(mapAccountError(err, dictionary));
    } finally {
      setBusy(false);
    }
  }

  async function onChangePassword() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await changeAccountPassword({
        currentPassword: currentPasswordForChange,
        newPassword,
      });
      setCurrentPasswordForChange("");
      setNewPassword("");
      setMessage(dictionary.app.settingsPasswordChanged);
    } catch (err) {
      setError(mapAccountError(err, dictionary));
    } finally {
      setBusy(false);
    }
  }

  async function onExport() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const payload = await exportPersonalData(exportPassword);
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "luv-bank-data-export-v1.json";
      anchor.click();
      URL.revokeObjectURL(url);
      setExportPassword("");
      setMessage(dictionary.app.settingsExportReady);
    } catch (err) {
      setError(mapAccountError(err, dictionary));
    } finally {
      setBusy(false);
    }
  }

  async function onRevokeAllShares() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await revokeAllAccountShares();
      await load();
      setMessage(dictionary.app.settingsSharesRevoked);
    } catch (err) {
      setError(mapAccountError(err, dictionary));
    } finally {
      setBusy(false);
    }
  }

  async function onHardDeleteShare(shareId: string) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await hardDeleteAccountShare(shareId);
      await load();
      setMessage(dictionary.app.settingsShareDeleted);
    } catch (err) {
      setError(mapAccountError(err, dictionary));
    } finally {
      setBusy(false);
    }
  }

  async function onLoadSummary() {
    setBusy(true);
    setError(null);
    try {
      const result = await fetchDeletionSummary();
      setSummary(result);
    } catch (err) {
      setError(mapAccountError(err, dictionary));
    } finally {
      setBusy(false);
    }
  }

  async function onDeleteAccount() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await deleteAccountPermanently({
        currentPassword: deletePassword,
        confirmationPhrase: deletePhrase,
      });
      router.replace(`/${locale}/account-deleted`);
      router.refresh();
    } catch (err) {
      setError(mapAccountError(err, dictionary));
      setBusy(false);
    }
  }

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-brand-strong">
          {dictionary.app.settingsTitle}
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted">
          {dictionary.app.settingsBody}
        </p>
        <p className="max-w-2xl text-sm leading-relaxed text-muted">
          {dictionary.app.settingsIndependenceNote}
        </p>
      </header>

      {error ? (
        <p className="rounded-xl border border-difficult/40 bg-difficult/10 px-4 py-3 text-sm text-difficult">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-xl border border-border bg-surface px-4 py-3 text-sm">{message}</p>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">
          {dictionary.app.settingsSessionsTitle}
        </h2>
        <p className="text-sm leading-relaxed text-muted">{dictionary.app.settingsSessionsBody}</p>
        {loading ? (
          <p className="text-sm text-muted">{dictionary.app.retry}</p>
        ) : (
          <ul className="space-y-3">
            {sessions.map((session) => (
              <li
                key={session.id}
                className="flex flex-col gap-3 border-b border-border py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1 text-sm">
                  <p className="font-medium">
                    {session.current
                      ? dictionary.app.settingsSessionCurrent
                      : dictionary.app.settingsSessionOther}
                    {session.clientKind ? ` · ${session.clientKind}` : ""}
                  </p>
                  <p className="text-muted">
                    {dictionary.app.settingsSessionCreated}: {formatWhen(session.createdAt, locale)}
                  </p>
                  <p className="text-muted">
                    {dictionary.app.settingsSessionLastUsed}:{" "}
                    {formatWhen(session.lastUsedAt, locale)}
                  </p>
                  <p className="text-muted">
                    {dictionary.app.settingsSessionExpires}: {formatWhen(session.expiresAt, locale)}
                  </p>
                  {session.revokedAt ? (
                    <p className="text-muted">
                      {dictionary.app.settingsSessionRevoked}:{" "}
                      {formatWhen(session.revokedAt, locale)}
                    </p>
                  ) : null}
                </div>
                {!session.revokedAt ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void onRevokeSession(session.id, session.current)}
                  >
                    {busy
                      ? dictionary.app.settingsRevokingSession
                      : dictionary.app.settingsRevokeSession}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">
          {dictionary.app.settingsInstallTitle}
        </h2>
        <p className="text-sm leading-relaxed text-muted">{dictionary.pwa.interimIconNote}</p>
        <InstallAppButton locale={locale} dictionary={dictionary} />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">
          {dictionary.app.settingsPasswordTitle}
        </h2>
        <p className="text-sm leading-relaxed text-muted">{dictionary.app.settingsPasswordBody}</p>
        <div className="grid max-w-md gap-3">
          <div className="space-y-2">
            <Label htmlFor="current-password">{dictionary.app.settingsCurrentPassword}</Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPasswordForChange}
              onChange={(event) => setCurrentPasswordForChange(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">{dictionary.app.settingsNewPassword}</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </div>
          <Button type="button" disabled={busy} onClick={() => void onChangePassword()}>
            {busy ? dictionary.app.settingsChangingPassword : dictionary.app.settingsChangePassword}
          </Button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">
          {dictionary.app.settingsExportTitle}
        </h2>
        <p className="text-sm leading-relaxed text-muted">{dictionary.app.settingsExportBody}</p>
        <p className="text-sm leading-relaxed text-muted">{dictionary.app.settingsExportWarning}</p>
        <div className="grid max-w-md gap-3">
          <div className="space-y-2">
            <Label htmlFor="export-password">{dictionary.app.settingsExportPassword}</Label>
            <Input
              id="export-password"
              type="password"
              autoComplete="current-password"
              value={exportPassword}
              onChange={(event) => setExportPassword(event.target.value)}
            />
          </div>
          <Button type="button" variant="secondary" disabled={busy} onClick={() => void onExport()}>
            {busy ? dictionary.app.settingsExporting : dictionary.app.settingsExportDownload}
          </Button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">
          {dictionary.app.settingsSharesTitle}
        </h2>
        <p className="text-sm leading-relaxed text-muted">{dictionary.app.settingsSharesBody}</p>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => void onRevokeAllShares()}
        >
          {busy ? dictionary.app.settingsRevokingShares : dictionary.app.settingsRevokeAllShares}
        </Button>
        {shares.length === 0 ? (
          <p className="text-sm text-muted">{dictionary.app.settingsNoShares}</p>
        ) : (
          <ul className="space-y-3">
            {shares.map((share) => (
              <li
                key={share.id}
                className="flex flex-col gap-3 border-b border-border py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1 text-sm">
                  <p className="font-medium">
                    {share.scope} · {share.window} · {share.status}
                  </p>
                  <p className="text-muted">
                    {dictionary.app.settingsSessionExpires}: {formatWhen(share.expiresAt, locale)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={busy}
                  onClick={() => void onHardDeleteShare(share.id)}
                >
                  {busy
                    ? dictionary.app.settingsDeletingShare
                    : dictionary.app.settingsHardDeleteShare}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">
          {dictionary.app.settingsDeleteTitle}
        </h2>
        <p className="text-sm leading-relaxed text-muted">{dictionary.app.settingsDeleteBody}</p>
        <p className="text-sm leading-relaxed text-muted">
          {dictionary.app.settingsDeleteNeonNote}
        </p>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => void onLoadSummary()}
        >
          {busy
            ? dictionary.app.settingsDeleteLoadingSummary
            : dictionary.app.settingsDeleteLoadSummary}
        </Button>
        {summary ? (
          <div className="space-y-2 text-sm">
            <h3 className="font-medium">{dictionary.app.settingsDeleteSummaryTitle}</h3>
            <ul className="list-disc space-y-1 ps-5 text-muted">
              <li>
                {dictionary.app.settingsDeleteProfiles}: {summary.relationshipProfileCount}
              </li>
              <li>
                {dictionary.app.settingsDeleteMoments}: {summary.momentCount}
              </li>
              <li>
                {dictionary.app.settingsDeleteNotes}: {summary.noteCount}
              </li>
              <li>
                {dictionary.app.settingsDeleteNudges}: {summary.nudgeSuppressionCount}
              </li>
              <li>
                {dictionary.app.settingsDeleteReminders}: {summary.reminderPreferenceCount}
              </li>
              <li>
                {dictionary.app.settingsDeleteShares}: {summary.shareSnapshotCount}
              </li>
              <li>
                {dictionary.app.settingsDeleteActiveShares}: {summary.activeShareCount}
              </li>
              <li>
                {dictionary.app.settingsDeleteSessions}: {summary.sessionCount}
              </li>
            </ul>
            <ul className="list-disc space-y-1 ps-5 text-muted">
              {summary.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="grid max-w-md gap-3">
          <div className="space-y-2">
            <Label htmlFor="delete-password">{dictionary.app.settingsDeletePassword}</Label>
            <Input
              id="delete-password"
              type="password"
              autoComplete="current-password"
              value={deletePassword}
              onChange={(event) => setDeletePassword(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="delete-phrase">{dictionary.app.settingsDeletePhrase}</Label>
            <Input
              id="delete-phrase"
              type="text"
              autoComplete="off"
              value={deletePhrase}
              onChange={(event) => setDeletePhrase(event.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="destructive"
            disabled={busy || deletePhrase !== "DELETE_MY_ACCOUNT"}
            onClick={() => void onDeleteAccount()}
          >
            {busy ? dictionary.app.settingsDeletingAccount : dictionary.app.settingsDeleteConfirm}
          </Button>
        </div>
      </section>

      <LogoutButton locale={locale} dictionary={dictionary} />
    </div>
  );
}
