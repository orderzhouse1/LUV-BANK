import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { isAppLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

export const dynamic = "force-dynamic";

export default async function AccountDeletedPage({
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
    <section className="mx-auto max-w-2xl space-y-6 px-4 py-20 sm:px-6">
      <p className="text-sm font-medium tracking-wide text-romance-gold">
        {dictionary.brand.name}
        <span className="mx-2 text-border">·</span>
        <span lang="ar">{dictionary.brand.arabicName}</span>
      </p>
      <h1 className="text-4xl font-semibold tracking-tight text-brand-strong">
        {dictionary.app.accountDeletedTitle}
      </h1>
      <p className="text-lg leading-relaxed text-muted">{dictionary.app.accountDeletedBody}</p>
      <Button asChild>
        <Link href={base}>{dictionary.app.accountDeletedCta}</Link>
      </Button>
    </section>
  );
}
