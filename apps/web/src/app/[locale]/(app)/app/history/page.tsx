import { notFound } from "next/navigation";
import { HistoryClient } from "@/components/moments/history-client";
import { isAppLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

export const dynamic = "force-dynamic";

export default async function HistoryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isAppLocale(raw)) {
    notFound();
  }
  const dictionary = getDictionary(raw);

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-brand-strong sm:text-3xl">
          {dictionary.app.historyTitle}
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted">
          {dictionary.app.historyBody}
        </p>
      </div>
      <HistoryClient locale={raw} dictionary={dictionary} />
    </section>
  );
}
