"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { MomentCategoryCode, MomentKind, MomentResponse } from "@luv-bank/validation";
import {
  ALL_CATEGORY_CODES,
  DIFFICULT_CATEGORY_CODES,
  POSITIVE_CATEGORY_CODES,
} from "@luv-bank/validation";
import type { AppLocale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import {
  ApiClientError,
  deleteMoment,
  listMoments,
  updateMoment,
  type MomentResponse as ClientMoment,
} from "@/lib/api-client";
import { categoryLabel, formatMomentOccurredAt, kindLabel } from "@/lib/moments";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  MomentForm,
  valuesFromMoment,
  type MomentFormSubmitPayload,
} from "@/components/moments/log-moment-form";
import { cn } from "@/lib/utils";

type Filters = {
  kind: MomentKind | "";
  categoryCode: MomentCategoryCode | "";
  from: string;
  to: string;
};

const emptyFilters: Filters = { kind: "", categoryCode: "", from: "", to: "" };

function toIsoStart(dateLocal: string): string | undefined {
  if (!dateLocal) return undefined;
  return new Date(`${dateLocal}T00:00:00`).toISOString();
}

function toIsoEnd(dateLocal: string): string | undefined {
  if (!dateLocal) return undefined;
  return new Date(`${dateLocal}T23:59:59.999`).toISOString();
}

export function HistoryClient({
  locale,
  dictionary,
  initialLimit = 20,
}: {
  locale: AppLocale;
  dictionary: Dictionary;
  initialLimit?: number;
}) {
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [applied, setApplied] = useState<Filters>(emptyFilters);
  const [items, setItems] = useState<MomentResponse[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<MomentResponse | null>(null);
  const [deleting, setDeleting] = useState<MomentResponse | null>(null);
  const [editPending, setEditPending] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const loadPage = useCallback(
    async (cursor: string | null, replace: boolean) => {
      if (replace) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);
      try {
        const result = await listMoments({
          kind: applied.kind || undefined,
          categoryCode: applied.categoryCode || undefined,
          from: toIsoStart(applied.from),
          to: toIsoEnd(applied.to),
          cursor: cursor ?? undefined,
          limit: initialLimit,
        });
        setItems((prev) => (replace ? result.items : [...prev, ...result.items]));
        setNextCursor(result.nextCursor);
      } catch {
        setError(dictionary.app.historyError);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [applied, dictionary.app.historyError, initialLimit],
  );

  useEffect(() => {
    void loadPage(null, true);
  }, [loadPage]);

  const categoryOptions: MomentCategoryCode[] =
    filters.kind === "POSITIVE"
      ? [...POSITIVE_CATEGORY_CODES]
      : filters.kind === "DIFFICULT"
        ? [...DIFFICULT_CATEGORY_CODES]
        : [...ALL_CATEGORY_CODES];

  async function onEditSubmit(payload: MomentFormSubmitPayload) {
    if (!editing) return;
    setEditPending(true);
    setEditError(null);
    try {
      const result = await updateMoment(editing.id, {
        kind: payload.kind,
        categoryCode: payload.categoryCode,
        note: payload.note == null || payload.note === "" ? null : payload.note,
        occurredAt: payload.occurredAt,
      });
      setItems((prev) => prev.map((item) => (item.id === editing.id ? result.moment : item)));
      setEditing(null);
      setNotice(dictionary.app.editSuccess);
    } catch (err) {
      if (err instanceof ApiClientError && err.code === "CATEGORY_KIND_MISMATCH") {
        setEditError(dictionary.app.logValidationCategory);
      } else {
        setEditError(dictionary.auth.genericError);
      }
    } finally {
      setEditPending(false);
    }
  }

  async function onConfirmDelete() {
    if (!deleting) return;
    setDeletePending(true);
    try {
      await deleteMoment(deleting.id);
      setItems((prev) => prev.filter((item) => item.id !== deleting.id));
      setDeleting(null);
      setNotice(dictionary.app.deleteSuccess);
    } catch {
      setError(dictionary.auth.genericError);
    } finally {
      setDeletePending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div aria-live="polite" className="min-h-5 text-sm text-positive">
        {notice}
      </div>

      <form
        className="grid gap-4 rounded-2xl border border-border bg-surface/80 p-4 sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={(event) => {
          event.preventDefault();
          setApplied(filters);
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="filter-kind">{dictionary.app.historyFilterKind}</Label>
          <select
            id="filter-kind"
            className="flex h-11 w-full rounded-lg border border-border bg-surface px-3"
            value={filters.kind}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                kind: event.target.value as MomentKind | "",
                categoryCode: "",
              }))
            }
          >
            <option value="">{dictionary.app.historyFilterAll}</option>
            <option value="POSITIVE">{dictionary.app.kindPositive}</option>
            <option value="DIFFICULT">{dictionary.app.kindDifficult}</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="filter-category">{dictionary.app.historyFilterCategory}</Label>
          <select
            id="filter-category"
            className="flex h-11 w-full rounded-lg border border-border bg-surface px-3"
            value={filters.categoryCode}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                categoryCode: event.target.value as MomentCategoryCode | "",
              }))
            }
          >
            <option value="">{dictionary.app.historyFilterAll}</option>
            {categoryOptions.map((code) => (
              <option key={code} value={code}>
                {dictionary.categories[code].label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="filter-from">{dictionary.app.historyFilterFrom}</Label>
          <input
            id="filter-from"
            type="date"
            className="flex h-11 w-full rounded-lg border border-border bg-surface px-3"
            value={filters.from}
            onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="filter-to">{dictionary.app.historyFilterTo}</Label>
          <input
            id="filter-to"
            type="date"
            className="flex h-11 w-full rounded-lg border border-border bg-surface px-3"
            value={filters.to}
            onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value }))}
          />
        </div>
        <div className="flex flex-wrap gap-3 sm:col-span-2 lg:col-span-4">
          <Button type="submit">{dictionary.app.historyApplyFilters}</Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setFilters(emptyFilters);
              setApplied(emptyFilters);
            }}
          >
            {dictionary.app.historyClearFilters}
          </Button>
        </div>
      </form>

      {loading ? (
        <p className="text-sm text-muted">{dictionary.app.historyLoading}</p>
      ) : error ? (
        <div className="space-y-3">
          <p className="text-sm text-difficult" role="alert">
            {error}
          </p>
          <Button type="button" variant="outline" onClick={() => void loadPage(null, true)}>
            {dictionary.app.historyRetry}
          </Button>
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-surface px-4 py-8 text-center text-muted">
          {dictionary.app.historyEmpty}
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((moment) => (
            <MomentListItem
              key={moment.id}
              moment={moment}
              locale={locale}
              dictionary={dictionary}
              onEdit={() => {
                setEditError(null);
                setEditing(moment);
              }}
              onDelete={() => setDeleting(moment)}
            />
          ))}
        </ul>
      )}

      {nextCursor ? (
        <Button
          type="button"
          variant="secondary"
          disabled={loadingMore}
          onClick={() => void loadPage(nextCursor, false)}
        >
          {loadingMore ? dictionary.app.historyLoadingMore : dictionary.app.historyLoadMore}
        </Button>
      ) : null}

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dictionary.app.editTitle}</DialogTitle>
            <DialogDescription>{dictionary.app.logBody}</DialogDescription>
          </DialogHeader>
          {editing ? (
            <MomentForm
              key={editing.id}
              dictionary={dictionary}
              locale={locale}
              mode="edit"
              initial={valuesFromMoment(editing)}
              pending={editPending}
              error={editError}
              onSubmit={onEditSubmit}
              onCancel={() => setEditing(null)}
              submitLabel={dictionary.app.editSave}
              pendingLabel={dictionary.app.editSaving}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dictionary.app.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{dictionary.app.deleteBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePending}>
              {dictionary.app.deleteCancel}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deletePending}
              onClick={(event) => {
                event.preventDefault();
                void onConfirmDelete();
              }}
            >
              {dictionary.app.deleteConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MomentListItem({
  moment,
  locale,
  dictionary,
  onEdit,
  onDelete,
}: {
  moment: ClientMoment;
  locale: AppLocale;
  dictionary: Dictionary;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const positive = moment.kind === "POSITIVE";
  return (
    <li
      className={cn(
        "rounded-2xl border bg-surface p-4",
        positive ? "border-positive/30" : "border-difficult/30",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
            <span
              className={cn(
                "inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold",
                positive ? "bg-positive/15 text-positive" : "bg-difficult/15 text-difficult",
              )}
            >
              {kindLabel(dictionary, moment.kind)}
            </span>
            <span>{categoryLabel(dictionary, moment.categoryCode)}</span>
            <span className="text-muted" title={dictionary.app.scoreImpactLabel}>
              {moment.scoreImpact > 0 ? `+${moment.scoreImpact}` : String(moment.scoreImpact)}
            </span>
          </p>
          <p className="text-sm text-muted">{formatMomentOccurredAt(moment.occurredAt, locale)}</p>
          {moment.note ? (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {moment.note}
            </p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onEdit}>
            {dictionary.app.historyEdit}
          </Button>
          <Button type="button" variant="destructive" size="sm" onClick={onDelete}>
            {dictionary.app.historyDelete}
          </Button>
        </div>
      </div>
    </li>
  );
}

export function HomeRecentClient({
  locale,
  dictionary,
}: {
  locale: AppLocale;
  dictionary: Dictionary;
}) {
  const [items, setItems] = useState<MomentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await listMoments({ limit: 5 });
        if (!cancelled) {
          setItems(result.items);
        }
      } catch {
        if (!cancelled) {
          setError(dictionary.app.historyError);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dictionary.app.historyError]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-brand-strong">{dictionary.app.recentTitle}</h2>
        </div>
        <Button asChild variant="outline">
          <Link href={`/${locale}/app/history`}>{dictionary.app.viewHistoryCta}</Link>
        </Button>
      </div>
      {loading ? (
        <p className="text-sm text-muted">{dictionary.app.historyLoading}</p>
      ) : error ? (
        <p className="text-sm text-difficult" role="alert">
          {error}
        </p>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-surface px-4 py-8 text-center text-muted">
          {dictionary.app.recentEmpty}
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((moment) => (
            <li
              key={moment.id}
              className="rounded-2xl border border-border bg-surface/90 px-4 py-3"
            >
              <p className="text-sm font-medium text-foreground">
                {kindLabel(dictionary, moment.kind)} ·{" "}
                {categoryLabel(dictionary, moment.categoryCode)}
              </p>
              <p className="text-sm text-muted">
                {formatMomentOccurredAt(moment.occurredAt, locale)}
              </p>
              {moment.note ? (
                <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{moment.note}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
