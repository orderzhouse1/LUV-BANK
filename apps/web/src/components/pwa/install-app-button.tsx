"use client";

import { useEffect, useState } from "react";
import type { AppLocale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

/**
 * Restrained, user-initiated install control.
 * Never auto-prompts aggressively; never requests notification permission.
 */
export function InstallAppButton({ dictionary }: { locale: AppLocale; dictionary: Dictionary }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(display-mode: standalone)");
    const syncInstalled = () => {
      setInstalled(
        media.matches ||
          ("standalone" in navigator &&
            Boolean((navigator as { standalone?: boolean }).standalone)),
      );
    };
    syncInstalled();
    media.addEventListener("change", syncInstalled);

    function onBeforeInstall(event: Event) {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", () => {
      setInstalled(true);
      setDeferred(null);
    });

    return () => {
      media.removeEventListener("change", syncInstalled);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    };
  }, []);

  if (installed) {
    return <p className="text-sm text-muted">{dictionary.pwa.installInstalled}</p>;
  }

  if (!deferred) {
    return <p className="text-sm text-muted">{dictionary.pwa.installUnavailable}</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted">{dictionary.pwa.installBody}</p>
      <Button
        type="button"
        variant="secondary"
        disabled={busy}
        onClick={() => {
          void (async () => {
            setBusy(true);
            try {
              await deferred.prompt();
              await deferred.userChoice;
              setDeferred(null);
            } finally {
              setBusy(false);
            }
          })();
        }}
      >
        {busy ? dictionary.pwa.installing : dictionary.pwa.installAction}
      </Button>
    </div>
  );
}
