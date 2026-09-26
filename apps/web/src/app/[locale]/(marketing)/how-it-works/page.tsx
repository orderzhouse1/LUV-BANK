import { notFound } from "next/navigation";
import { PlaceholderPage } from "@/components/layout/placeholder-page";
import { isAppLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

export default async function HowItWorksPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isAppLocale(raw)) {
    notFound();
  }
  const dictionary = getDictionary(raw);
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <PlaceholderPage title={dictionary.marketing.howTitle} body={dictionary.marketing.howBody} />
    </div>
  );
}
