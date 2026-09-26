import { isAppLocale, type AppLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

const APP_ID = "/";
const THEME_COLOR = "#9b2d6a";
const BACKGROUND_COLOR = "#f7f1f3";

const ICONS = [
  {
    src: "/pwa/icons/icon-192.png",
    sizes: "192x192",
    type: "image/png",
    purpose: "any",
  },
  {
    src: "/pwa/icons/icon-512.png",
    sizes: "512x512",
    type: "image/png",
    purpose: "any",
  },
  {
    src: "/pwa/icons/icon-512-maskable.png",
    sizes: "512x512",
    type: "image/png",
    purpose: "maskable",
  },
] as const;

function shortcutsFor(locale: AppLocale, dictionary: ReturnType<typeof getDictionary>) {
  const base = `/${locale}/app`;
  return [
    {
      name: dictionary.pwa.shortcutHome,
      short_name: dictionary.pwa.shortcutHomeShort,
      url: base,
      icons: [{ src: "/pwa/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    },
    {
      name: dictionary.pwa.shortcutLog,
      short_name: dictionary.pwa.shortcutLogShort,
      url: `${base}/log`,
      icons: [{ src: "/pwa/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    },
    {
      name: dictionary.pwa.shortcutHistory,
      short_name: dictionary.pwa.shortcutHistoryShort,
      url: `${base}/history`,
      icons: [{ src: "/pwa/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    },
    {
      name: dictionary.pwa.shortcutInsights,
      short_name: dictionary.pwa.shortcutInsightsShort,
      url: `${base}/insights`,
      icons: [{ src: "/pwa/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    },
  ];
}

export function buildWebManifest(locale: AppLocale) {
  const dictionary = getDictionary(locale);
  const isArabic = locale === "ar";

  return {
    id: APP_ID,
    name: isArabic ? dictionary.brand.arabicName : dictionary.brand.name,
    short_name: isArabic ? dictionary.brand.arabicName : dictionary.brand.name,
    description: dictionary.meta.description,
    lang: locale,
    dir: isArabic ? "rtl" : "ltr",
    start_url: `/${locale}/app`,
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    theme_color: THEME_COLOR,
    background_color: BACKGROUND_COLOR,
    icons: ICONS,
    shortcuts: shortcutsFor(locale, dictionary),
  };
}

export function assertLocaleOrNull(raw: string): AppLocale | null {
  return isAppLocale(raw) ? raw : null;
}
