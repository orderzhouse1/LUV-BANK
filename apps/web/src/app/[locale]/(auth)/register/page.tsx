import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { isAppLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { fetchMeServer } from "@/lib/api-client";

export const dynamic = "force-dynamic";

export default async function RegisterPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isAppLocale(raw)) {
    notFound();
  }
  const dictionary = getDictionary(raw);
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((item) => `${item.name}=${encodeURIComponent(item.value)}`)
    .join("; ");
  const session = await fetchMeServer(cookieHeader || undefined);

  if (session.status === "authenticated") {
    redirect(session.user.onboardingComplete ? `/${raw}/app` : `/${raw}/app/onboarding`);
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-center lg:py-20">
      <div className="hidden space-y-4 lg:block">
        <p className="text-sm font-medium text-romance-gold">{dictionary.brand.name}</p>
        <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-brand-strong">
          {dictionary.auth.registerTitle}
        </h1>
        <p className="max-w-md text-lg leading-relaxed text-muted">
          {dictionary.auth.registerBody}
        </p>
      </div>
      <div className="rounded-2xl border border-border bg-surface/95 p-6 shadow-sm sm:p-8">
        <div className="mb-6 space-y-2 lg:hidden">
          <h1 className="text-2xl font-semibold text-brand-strong">
            {dictionary.auth.registerTitle}
          </h1>
          <p className="text-sm leading-relaxed text-muted">{dictionary.auth.registerBody}</p>
        </div>
        <AuthForm mode="register" locale={raw} dictionary={dictionary} />
      </div>
    </div>
  );
}
