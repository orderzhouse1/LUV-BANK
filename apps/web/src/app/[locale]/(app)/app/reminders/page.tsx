import { notFound } from "next/navigation";
import { RemindersSettingsClient } from "@/components/reminders/reminders-settings-client";
import { isAppLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

export const dynamic = "force-dynamic";

export default async function RemindersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isAppLocale(raw)) {
    notFound();
  }
  const dictionary = getDictionary(raw);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-brand-strong">
          {dictionary.app.remindersTitle}
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted">
          {dictionary.app.remindersBody}
        </p>
      </div>
      <RemindersSettingsClient locale={raw} dictionary={dictionary} />
    </div>
  );
}
