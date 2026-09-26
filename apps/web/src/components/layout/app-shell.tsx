"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Bell, History, Home, Menu, Plus, Settings, Share2 } from "lucide-react";
import type { AppLocale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string, options?: { exact?: boolean }) {
  if (options?.exact) {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

const desktopNav = [
  { key: "home", href: "", icon: Home },
  { key: "log", href: "/log", icon: Plus },
  { key: "insights", href: "/insights", icon: BarChart3 },
  { key: "history", href: "/history", icon: History },
  { key: "share", href: "/share", icon: Share2 },
  { key: "reminders", href: "/reminders", icon: Bell },
  { key: "settings", href: "/settings", icon: Settings },
] as const;

const secondaryMobileNav = [
  { key: "history", href: "/history", icon: History },
  { key: "share", href: "/share", icon: Share2 },
  { key: "reminders", href: "/reminders", icon: Bell },
  { key: "settings", href: "/settings", icon: Settings },
] as const;

export function AppShell({
  locale,
  dictionary,
  children,
  userDisplayName,
  relationshipTitle,
}: {
  locale: AppLocale;
  dictionary: Dictionary;
  children: React.ReactNode;
  userDisplayName?: string | null;
  relationshipTitle?: string | null;
}) {
  const pathname = usePathname() || `/${locale}/app`;
  const base = `/${locale}/app`;
  const onOnboarding = pathname.includes("/onboarding");

  const labelFor = (key: (typeof desktopNav)[number]["key"]) => {
    switch (key) {
      case "home":
        return dictionary.nav.home;
      case "log":
        return dictionary.nav.log;
      case "insights":
        return dictionary.nav.insights;
      case "history":
        return dictionary.nav.history;
      case "share":
        return dictionary.nav.share;
      case "reminders":
        return dictionary.nav.reminders;
      case "settings":
        return dictionary.nav.settings;
    }
  };

  return (
    <div className="min-h-dvh bg-background">
      {/* Desktop shell */}
      <div className="hidden min-h-dvh md:grid md:grid-cols-[4.5rem_minmax(0,1fr)] lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="border-e border-border bg-surface/90 px-2 py-4 pt-[max(1rem,env(safe-area-inset-top))] lg:px-3">
          <div className="mb-6 px-2">
            <p className="text-sm font-semibold text-brand-strong">{dictionary.brand.name}</p>
            <p className="hidden text-xs text-muted lg:block" lang="ar">
              {dictionary.brand.arabicName}
            </p>
          </div>
          <nav className="flex flex-col gap-1" aria-label="Desktop app">
            {!onOnboarding
              ? desktopNav.map((item) => {
                  const href = `${base}${item.href}`;
                  const Icon = item.icon;
                  const active = isActive(pathname, href, { exact: item.key === "home" });
                  return (
                    <Link
                      key={item.key}
                      href={href}
                      className={cn(
                        "inline-flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors",
                        active
                          ? "bg-brand-soft text-brand-strong"
                          : "text-muted hover:bg-surface-muted hover:text-foreground",
                      )}
                    >
                      <Icon className="size-5 shrink-0" aria-hidden />
                      <span className="hidden lg:inline">{labelFor(item.key)}</span>
                      <span className="sr-only lg:hidden">{labelFor(item.key)}</span>
                    </Link>
                  );
                })
              : null}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-col">
          <header className="flex items-center justify-between gap-4 border-b border-border bg-surface/80 px-6 py-4">
            <div className="flex min-w-0 flex-wrap items-center gap-4 text-sm">
              <div>
                <p className="text-xs text-muted">{dictionary.app.relationshipLabel}</p>
                <p className="truncate font-medium">
                  {relationshipTitle ?? dictionary.app.relationshipPlaceholder}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted">{dictionary.app.windowLabel}</p>
                <p className="font-medium">{dictionary.app.windowPlaceholder}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <LocaleSwitcher locale={locale} dictionary={dictionary} />
              <div className="text-end text-sm">
                <p className="text-xs text-muted">{dictionary.app.accountLabel}</p>
                <p className="font-medium">
                  {userDisplayName ?? dictionary.app.accountPlaceholder}
                </p>
              </div>
            </div>
          </header>
          <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
        </div>
      </div>

      {/* Mobile shell */}
      <div className="flex min-h-dvh flex-col md:hidden">
        <header className="flex items-center justify-between gap-2 border-b border-border bg-surface/90 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-brand-strong">
              {dictionary.brand.name}
            </p>
            <p className="truncate text-xs text-muted">
              {relationshipTitle ?? dictionary.app.relationshipPlaceholder}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <LocaleSwitcher locale={locale} dictionary={dictionary} />
            {!onOnboarding ? (
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label={dictionary.nav.openMenu}>
                    <Menu className="size-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom">
                  <SheetHeader>
                    <SheetTitle>{dictionary.nav.openMenu}</SheetTitle>
                  </SheetHeader>
                  <nav className="grid gap-2" aria-label="Secondary">
                    {secondaryMobileNav.map((item) => {
                      const href = `${base}${item.href}`;
                      const Icon = item.icon;
                      return (
                        <Button
                          key={item.key}
                          asChild
                          variant="secondary"
                          className="justify-start"
                        >
                          <Link href={href}>
                            <Icon className="size-5" aria-hidden />
                            {labelFor(item.key)}
                          </Link>
                        </Button>
                      );
                    })}
                  </nav>
                </SheetContent>
              </Sheet>
            ) : null}
          </div>
        </header>

        <main
          className={cn(
            "mx-auto w-full max-w-lg flex-1 px-4 py-5",
            !onOnboarding && "pb-[calc(5.5rem+env(safe-area-inset-bottom))]",
          )}
        >
          {children}
        </main>

        {!onOnboarding ? (
          <nav
            className="fixed inset-inline-0 bottom-0 z-40 grid grid-cols-3 border-t border-border bg-surface/95 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-sm"
            aria-label="Mobile app"
          >
            <Link
              href={base}
              className={cn(
                "inline-flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg text-xs",
                isActive(pathname, base, { exact: true }) ? "text-brand-strong" : "text-muted",
              )}
            >
              <Home className="size-5" aria-hidden />
              {dictionary.nav.home}
            </Link>
            <Link
              href={`${base}/log`}
              className="inline-flex min-h-11 -translate-y-3 flex-col items-center justify-center"
            >
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-md">
                <Plus className="size-6" aria-hidden />
              </span>
              <span className="sr-only">{dictionary.nav.log}</span>
            </Link>
            <Link
              href={`${base}/insights`}
              className={cn(
                "inline-flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg text-xs",
                isActive(pathname, `${base}/insights`) ? "text-brand-strong" : "text-muted",
              )}
            >
              <BarChart3 className="size-5" aria-hidden />
              {dictionary.nav.insights}
            </Link>
          </nav>
        ) : null}
      </div>
    </div>
  );
}
