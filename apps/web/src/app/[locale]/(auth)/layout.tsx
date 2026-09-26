import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { MarketingShell } from "@/components/layout/marketing-shell";
import { isAppLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

export default async function AuthLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isAppLocale(raw)) {
    notFound();
  }
  const dictionary = getDictionary(raw);

  return (
    <MarketingShell locale={raw} dictionary={dictionary}>
      {children}
    </MarketingShell>
  );
}
