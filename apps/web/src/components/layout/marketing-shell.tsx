import Link from "next/link";
import type { AppLocale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { Button } from "@/components/ui/button";

export function MarketingShell({
  locale,
  dictionary,
  children,
}: {
  locale: AppLocale;
  dictionary: Dictionary;
  children: React.ReactNode;
}) {
  const base = `/${locale}`;

  return (
    <div className="min-h-dvh">
      <header className="border-b border-border/70 bg-surface/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href={base} className="min-h-11 inline-flex flex-col justify-center">
            <span className="text-lg font-semibold tracking-tight text-brand-strong">
              {dictionary.brand.name}
            </span>
            <span className="text-xs text-muted" lang="ar">
              {dictionary.brand.arabicName}
            </span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Marketing">
            <Button asChild variant="ghost" size="sm">
              <Link href={`${base}/how-it-works`}>{dictionary.nav.howItWorks}</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href={`${base}/science-and-safety`}>{dictionary.nav.scienceAndSafety}</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href={`${base}/privacy`}>{dictionary.nav.privacy}</Link>
            </Button>
          </nav>
          <div className="flex items-center gap-2">
            <LocaleSwitcher locale={locale} dictionary={dictionary} />
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
              <Link href={`${base}/login`}>{dictionary.nav.login}</Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`${base}/register`}>{dictionary.nav.register}</Link>
            </Button>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-border/70 py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 text-sm text-muted sm:px-6">
          <p>{dictionary.brand.name}</p>
          <div className="flex flex-wrap gap-3">
            <Link href={`${base}/terms`} className="min-h-11 inline-flex items-center">
              {dictionary.nav.terms}
            </Link>
            <Link href={`${base}/privacy`} className="min-h-11 inline-flex items-center">
              {dictionary.nav.privacy}
            </Link>
            <Link href={`${base}/app`} className="min-h-11 inline-flex items-center">
              {dictionary.nav.home}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
