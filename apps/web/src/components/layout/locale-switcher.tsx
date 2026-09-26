"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { AppLocale } from "@/i18n/config";
import { locales } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { Button } from "@/components/ui/button";

function swapLocaleInPath(pathname: string, nextLocale: AppLocale): string {
  const segments = pathname.split("/");
  if (segments.length > 1 && locales.includes(segments[1] as AppLocale)) {
    segments[1] = nextLocale;
    return segments.join("/") || `/${nextLocale}`;
  }
  return `/${nextLocale}`;
}

export function LocaleSwitcher({
  locale,
  dictionary,
}: {
  locale: AppLocale;
  dictionary: Dictionary;
}) {
  const pathname = usePathname() || `/${locale}`;
  const [hash, setHash] = useState("");

  useEffect(() => {
    setHash(window.location.hash || "");
  }, [pathname]);

  return (
    <div
      className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface p-1"
      role="group"
      aria-label={dictionary.nav.language}
    >
      {locales.map((item) => {
        const active = item === locale;
        const label =
          item === "en" ? dictionary.nav.switchToEnglish : dictionary.nav.switchToArabic;
        const href = `${swapLocaleInPath(pathname, item)}${hash}`;
        return (
          <Button
            key={item}
            asChild
            variant={active ? "secondary" : "ghost"}
            size="sm"
            className={active ? "bg-brand-soft text-brand-strong" : undefined}
          >
            <Link href={href} hrefLang={item} lang={item}>
              {label}
            </Link>
          </Button>
        );
      })}
    </div>
  );
}
