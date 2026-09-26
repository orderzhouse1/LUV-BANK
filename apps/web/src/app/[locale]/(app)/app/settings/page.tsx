import { notFound } from "next/navigation";
import { AccountSettingsClient } from "@/components/account/account-settings-client";
import { isAppLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isAppLocale(raw)) {
    notFound();
  }
  const dictionary = getDictionary(raw);
  return <AccountSettingsClient locale={raw} dictionary={dictionary} />;
}
