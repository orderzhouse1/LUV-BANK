import type { Dictionary } from "@/i18n/dictionaries/en";

export function PlaceholderPage({
  title,
  body,
  note,
}: {
  title: string;
  body: string;
  note?: string;
}) {
  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-brand-strong sm:text-3xl">
          {title}
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted">{body}</p>
      </div>
      {note ? (
        <p className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground">
          {note}
        </p>
      ) : null}
    </section>
  );
}

/** Deferred Phase 3+ surfaces — calm placeholders without scores. */
export function DashboardPlaceholders({ dictionary }: { dictionary: Dictionary }) {
  return (
    <PlaceholderPage
      title={dictionary.app.dashboardTitle}
      body={dictionary.app.dashboardBody}
      note={dictionary.app.foundationNote}
    />
  );
}
