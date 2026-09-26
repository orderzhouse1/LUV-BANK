"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import type { AppLocale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { ApiClientError, loginAccount, registerAccount } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthForm({
  mode,
  locale,
  dictionary,
}: {
  mode: "login" | "register";
  locale: AppLocale;
  dictionary: Dictionary;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (mode === "register" && !acceptedTerms) {
      setError(dictionary.auth.acceptedTermsRequired);
      return;
    }

    setPending(true);
    try {
      if (mode === "login") {
        const result = await loginAccount({ email, password });
        router.replace(
          result.user.onboardingComplete ? `/${locale}/app` : `/${locale}/app/onboarding`,
        );
        router.refresh();
        return;
      }

      const result = await registerAccount({
        email,
        password,
        displayName,
        preferredLocale: locale,
        acceptedTerms: true,
      });
      router.replace(
        result.user.onboardingComplete ? `/${locale}/app` : `/${locale}/app/onboarding`,
      );
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.code === "INVALID_CREDENTIALS") {
          setError(dictionary.auth.invalidCredentials);
        } else if (err.code === "EMAIL_ALREADY_EXISTS") {
          setError(dictionary.auth.emailExists);
        } else if (err.code === "VALIDATION_ERROR") {
          setError(dictionary.auth.validationError);
        } else {
          setError(dictionary.auth.genericError);
        }
      } else {
        setError(dictionary.auth.genericError);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {mode === "register" ? (
        <div className="space-y-2">
          <Label htmlFor="displayName">{dictionary.auth.displayNameLabel}</Label>
          <Input
            id="displayName"
            name="displayName"
            autoComplete="name"
            required
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="email">{dictionary.auth.emailLabel}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">{dictionary.auth.passwordLabel}</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            minLength={mode === "register" ? 12 : 1}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="pe-12"
          />
          <button
            type="button"
            className="absolute inset-inline-end-1 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:text-foreground"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? dictionary.auth.hidePassword : dictionary.auth.showPassword}
          >
            {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        </div>
        {mode === "register" ? (
          <p className="text-sm text-muted">{dictionary.auth.passwordHint}</p>
        ) : null}
      </div>

      {mode === "register" ? (
        <div className="flex items-start gap-3">
          <Checkbox
            id="acceptedTerms"
            checked={acceptedTerms}
            onCheckedChange={(value) => setAcceptedTerms(value === true)}
            className="mt-0.5"
          />
          <Label htmlFor="acceptedTerms" className="leading-relaxed font-normal">
            {dictionary.auth.acceptedTermsLabel}
          </Label>
        </div>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-difficult/30 bg-difficult/10 px-3 py-2 text-sm text-difficult"
        >
          {error}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending
          ? dictionary.auth.submitting
          : mode === "login"
            ? dictionary.auth.submitLogin
            : dictionary.auth.submitRegister}
      </Button>

      <p className="text-sm text-muted">{dictionary.auth.privacyNote}</p>

      <p className="text-sm">
        {mode === "login" ? dictionary.auth.needAccount : dictionary.auth.haveAccount}{" "}
        <Link
          className="font-medium text-brand-strong underline-offset-4 hover:underline"
          href={mode === "login" ? `/${locale}/register` : `/${locale}/login`}
        >
          {mode === "login" ? dictionary.nav.register : dictionary.nav.login}
        </Link>
      </p>
    </form>
  );
}
