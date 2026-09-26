"use client";

import { useEffect, useState } from "react";
import type { AppLocale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { Button } from "@/components/ui/button";

function pwaEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (process.env.NODE_ENV === "production") return true;
  return process.env.NEXT_PUBLIC_PWA_ENABLE === "true";
}

/**
 * Registers the privacy-safe service worker in production (or explicit enable).
 * Does not request notification permission or set up push.
 */
export function PwaRegister({ locale, dictionary }: { locale: AppLocale; dictionary: Dictionary }) {
  const [updateReady, setUpdateReady] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!pwaEnabled()) return;
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;

    void navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        if (cancelled) return;

        const onUpdateFound = () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              setWaitingWorker(worker);
              setUpdateReady(true);
            }
          });
        };

        registration.addEventListener("updatefound", onUpdateFound);
        if (registration.waiting && navigator.serviceWorker.controller) {
          setWaitingWorker(registration.waiting);
          setUpdateReady(true);
        }
      })
      .catch(() => {
        // Registration failure must not break the app shell.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!updateReady) return null;

  return (
    <div
      role="status"
      className="fixed inset-inline-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 mx-auto w-[min(28rem,calc(100%-1.5rem))] rounded-xl border border-border bg-surface px-4 py-3 shadow-md md:bottom-6"
    >
      <p className="text-sm text-foreground">{dictionary.pwa.updateAvailable}</p>
      <p className="mt-1 text-xs text-muted">{dictionary.pwa.updateBody}</p>
      <div className="mt-3 flex gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => {
            waitingWorker?.postMessage({ type: "SKIP_WAITING" });
            setUpdateReady(false);
            window.location.reload();
          }}
        >
          {dictionary.pwa.updateAction}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setUpdateReady(false)}>
          {dictionary.pwa.updateDismiss}
        </Button>
      </div>
      <span className="sr-only">{locale}</span>
    </div>
  );
}
