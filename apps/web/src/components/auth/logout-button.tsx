"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AppLocale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { logoutAccount } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

export function LogoutButton({
  locale,
  dictionary,
}: {
  locale: AppLocale;
  dictionary: Dictionary;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    try {
      await logoutAccount();
    } catch {
      // Still clear local navigation; cookies may already be cleared.
    } finally {
      router.replace(`/${locale}/login`);
      router.refresh();
      setPending(false);
    }
  }

  return (
    <Button type="button" variant="outline" onClick={onClick} disabled={pending}>
      {pending ? dictionary.app.loggingOut : dictionary.app.logout}
    </Button>
  );
}
