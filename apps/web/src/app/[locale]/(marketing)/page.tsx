import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { isAppLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

export default async function MarketingHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isAppLocale(raw)) {
    notFound();
  }
  const dictionary = getDictionary(raw);
  const base = `/${raw}`;

  return (
    <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center lg:py-24">
      <div className="space-y-6">
        <p className="text-sm font-medium tracking-wide text-romance-gold">
          {dictionary.brand.name}
          <span className="mx-2 text-border">·</span>
          <span lang="ar">{dictionary.brand.arabicName}</span>
        </p>
        <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-brand-strong sm:text-5xl">
          {dictionary.marketing.heroTitle}
        </h1>
        <p className="max-w-xl text-lg leading-relaxed text-muted">
          {dictionary.marketing.heroBody}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href={`${base}/register`}>{dictionary.marketing.ctaPrimary}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`${base}/how-it-works`}>{dictionary.marketing.ctaSecondary}</Link>
          </Button>
        </div>
      </div>
      <div className="rounded-[1.75rem] border border-border bg-surface/90 p-6 shadow-sm">
        <div className="space-y-4 rounded-2xl bg-surface-muted/60 p-5">
          <p className="text-sm font-medium text-brand-strong">{dictionary.nav.home}</p>
          <div className="h-24 rounded-xl border border-dashed border-border bg-surface" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-16 rounded-xl border border-dashed border-border bg-surface" />
            <div className="h-16 rounded-xl border border-dashed border-border bg-surface" />
          </div>
          <p className="text-sm leading-relaxed text-muted">{dictionary.marketing.previewNote}</p>
        </div>
      </div>
    </section>
  );
}
