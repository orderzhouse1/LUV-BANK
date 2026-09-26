import { notFound } from "next/navigation";
import { LogMomentClient } from "@/components/moments/log-moment-client";
import { isAppLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

export const dynamic = "force-dynamic";

export default async function LogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isAppLocale(raw)) {
    notFound();
  }
  const dictionary = getDictionary(raw);

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-brand-strong sm:text-3xl">
          {dictionary.app.logTitle}
        </h1>
        <p className="text-base leading-relaxed text-muted">{dictionary.app.logBody}</p>
      </div>
      <LogMomentClient locale={raw} dictionary={dictionary} />
    </section>
  );
}
