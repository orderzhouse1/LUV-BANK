import { notFound } from "next/navigation";
import { PublicShareClient } from "@/components/shares/public-share-client";
import { isAppLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

/**
 * Public share landing page — no authentication.
 * Bearer token arrives only via URL fragment and is resolved client-side.
 */
export const dynamic = "force-dynamic";

export default async function PublicSharedPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isAppLocale(raw)) {
    notFound();
  }
  const dictionary = getDictionary(raw);

  return <PublicShareClient locale={raw} dictionary={dictionary} />;
}
