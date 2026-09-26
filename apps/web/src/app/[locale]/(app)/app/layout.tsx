import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PlaceholderPage } from "@/components/layout/placeholder-page";
import { isAppLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { fetchMeServer } from "@/lib/api-client";

export const dynamic = "force-dynamic";

export default async function PrivateAppLayout({
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
  const cookieStore = await cookies();
  const headerStore = await headers();
  const pathname = headerStore.get("x-pathname") ?? "";
  const cookieHeader = cookieStore
    .getAll()
    .map((item) => `${item.name}=${encodeURIComponent(item.value)}`)
    .join("; ");

  const session = await fetchMeServer(cookieHeader || undefined);

  if (session.status === "unavailable") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg items-center px-4 py-16">
        <PlaceholderPage
          title={dictionary.app.unavailableTitle}
          body={dictionary.app.unavailableBody}
          note={dictionary.app.retry}
        />
      </div>
    );
  }

  if (session.status === "unauthenticated") {
    redirect(`/${raw}/login`);
  }

  const onOnboarding = pathname.includes("/app/onboarding");
  if (!session.user.onboardingComplete && !onOnboarding) {
    redirect(`/${raw}/app/onboarding`);
  }
  if (session.user.onboardingComplete && onOnboarding) {
    redirect(`/${raw}/app`);
  }

  return (
    <AppShell
      locale={raw}
      dictionary={dictionary}
      userDisplayName={session.user.displayName}
      relationshipTitle={session.user.activeRelationshipProfile?.title ?? null}
    >
      {children}
    </AppShell>
  );
}
