import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, IBM_Plex_Sans_Arabic } from "next/font/google";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { OfflineBanner } from "@/components/pwa/offline-banner";
import { PwaRegister } from "@/components/pwa/pwa-register";
import { getDirection, isAppLocale, type AppLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans-latin",
  display: "swap",
});

const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans-arabic",
  display: "swap",
});

export async function generateStaticParams() {
  return [{ locale: "en" }, { locale: "ar" }];
}

export const viewport: Viewport = {
  themeColor: "#9b2d6a",
  colorScheme: "light",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  if (!isAppLocale(raw)) {
    return {};
  }
  const dictionary = getDictionary(raw);
  return {
    title: dictionary.meta.title,
    description: dictionary.meta.description,
    applicationName: dictionary.brand.name,
    manifest: `/${raw}/manifest.webmanifest`,
    icons: {
      icon: [
        { url: "/pwa/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
        { url: "/pwa/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      ],
      apple: [{ url: "/pwa/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    },
    appleWebApp: {
      capable: true,
      title: raw === "ar" ? dictionary.brand.arabicName : dictionary.brand.name,
      statusBarStyle: "default",
    },
    other: {
      "mobile-web-app-capable": "yes",
    },
  };
}

export default async function LocaleLayout({
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
  const locale: AppLocale = raw;
  const direction = getDirection(locale);
  const dictionary = getDictionary(locale);

  return (
    <html
      lang={locale}
      dir={direction}
      className={`${ibmPlexSans.variable} ${ibmPlexSansArabic.variable}`}
    >
      <body className="font-sans">
        <OfflineBanner locale={locale} dictionary={dictionary} />
        {children}
        <PwaRegister locale={locale} dictionary={dictionary} />
      </body>
    </html>
  );
}
