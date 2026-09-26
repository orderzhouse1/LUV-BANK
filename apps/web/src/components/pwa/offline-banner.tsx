"use client";

import { useEffect, useState } from "react";
import type { AppLocale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";

/**
 * Lightweight online/offline banner. Does not persist private data.
 * Distinguishes network loss from authentication failure in copy.
 */
export function OfflineBanner({ dictionary }: { locale: AppLocale; dictionary: Dictionary }) {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    function sync() {
      setOffline(!navigator.onLine);
    }
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="border-b border-border bg-surface-muted px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-sm text-foreground"
    >
      <p className="font-medium">{dictionary.pwa.offlineTitle}</p>
      <p className="mt-1 text-muted">{dictionary.pwa.offlineBody}</p>
      <p className="mt-1 text-xs text-muted">{dictionary.pwa.offlineNotSignedOut}</p>
    </div>
  );
}
