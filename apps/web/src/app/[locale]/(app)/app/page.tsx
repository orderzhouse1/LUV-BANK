import Link from "next/link";
import { notFound } from "next/navigation";
import { BalanceSummaryClient } from "@/components/balance/balance-summary-client";
import { HomeRecentClient } from "@/components/moments/history-client";
import { NudgeCardClient } from "@/components/nudges/nudge-card-client";
import { ReminderDueCardClient } from "@/components/reminders/reminder-due-card-client";
import { Button } from "@/components/ui/button";
import { isAppLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

export const dynamic = "force-dynamic";

export default async function AppHomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isAppLocale(raw)) {
    notFound();
  }
  const dictionary = getDictionary(raw);

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-brand-strong sm:text-3xl">
            {dictionary.app.welcomeTitle}
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-muted">
            {dictionary.app.dashboardBody}
          </p>
        </div>
        <p className="rounded-xl border border-border bg-surface px-4 py-3 text-sm leading-relaxed text-foreground">
          {dictionary.app.privacyReminder}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href={`/${raw}/app/log`}>{dictionary.app.recordMomentCta}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/${raw}/app/history`}>{dictionary.app.viewHistoryCta}</Link>
          </Button>
        </div>
      </section>
      <BalanceSummaryClient locale={raw} dictionary={dictionary} />
      <ReminderDueCardClient locale={raw} dictionary={dictionary} />
      <NudgeCardClient locale={raw} dictionary={dictionary} window="30d" />
      <HomeRecentClient locale={raw} dictionary={dictionary} />
      <p className="text-xs text-muted">{dictionary.app.foundationNote}</p>
    </div>
  );
}
