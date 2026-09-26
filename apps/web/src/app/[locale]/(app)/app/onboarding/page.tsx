import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { OnboardingForm } from "@/components/auth/onboarding-form";
import { isAppLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isAppLocale(raw)) {
    notFound();
  }
  const dictionary = getDictionary(raw);
  // Auth + onboarding gate handled by parent layout.
  void cookies;

  return (
    <div className="mx-auto max-w-lg space-y-6 px-1 py-2">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-brand-strong sm:text-3xl">
          {dictionary.onboarding.title}
        </h1>
      </div>
      <OnboardingForm locale={raw} dictionary={dictionary} />
    </div>
  );
}
