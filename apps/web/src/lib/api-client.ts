import type {
  AuthSessionResponse,
  AuthUser,
  BalanceSummaryResponse,
  BalanceWindow,
  ChangePasswordRequest,
  CreateMomentRequest,
  CsrfResponse,
  DataExportV1,
  DeletionSummaryResponse,
  InsightSummaryResponse,
  InsightWindow,
  Locale,
  MomentListQuery,
  MomentResponse,
  MomentSingleResponse,
  NudgeCurrentResponse,
  NudgeWindow,
  ReminderPreferenceResponse,
  ReminderSnoozeDuration,
  UpsertReminderPreferenceRequest,
  CreateShareSnapshotRequest,
  ShareSnapshotCreateResponse,
  ShareSnapshotListResponse,
  ShareSnapshotPreviewResponse,
  ShareSnapshotResolveResponse,
  PrivateShareSnapshotPayload,
  PaginatedMomentsResponse,
  RelationshipProfileResponse,
  SessionListResponse,
  SuppressNudgeRequest,
  UpdateMomentRequest,
} from "@luv-bank/validation";

export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
  }
}

function assertOnlineForMutation(): void {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new ApiClientError(
      0,
      "OFFLINE",
      "You are offline. Private changes are not queued — reconnect and retry explicitly.",
    );
  }
}

function apiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
}

function readBrowserCsrfCookie(): string | null {
  if (typeof document === "undefined") {
    return null;
  }
  const match = document.cookie.match(/(?:^|;\s*)luv_csrf=([^;]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

async function parseError(response: Response): Promise<ApiClientError> {
  try {
    const body = (await response.json()) as {
      error?: { code?: string; message?: string };
    };
    return new ApiClientError(
      response.status,
      body.error?.code ?? "INTERNAL_ERROR",
      body.error?.message ?? "Request failed.",
    );
  } catch {
    return new ApiClientError(response.status, "INTERNAL_ERROR", "Request failed.");
  }
}

export async function fetchCsrfToken(): Promise<string> {
  const response = await fetch(`${apiBaseUrl()}/api/v1/auth/csrf`, {
    method: "GET",
    credentials: "include",
  });
  if (!response.ok) {
    throw await parseError(response);
  }
  const body = (await response.json()) as CsrfResponse;
  return body.csrfToken;
}

async function withCsrf(init: RequestInit = {}): Promise<RequestInit> {
  const token = readBrowserCsrfCookie() ?? (await fetchCsrfToken());
  const headers = new Headers(init.headers);
  headers.set("X-CSRF-Token", token);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return {
    ...init,
    credentials: "include",
    headers,
  };
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    ...init,
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) {
    throw await parseError(response);
  }
  return (await response.json()) as T;
}

export async function apiMutate<T>(
  path: string,
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  body?: unknown,
): Promise<T | null> {
  assertOnlineForMutation();
  const init = await withCsrf({
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const response = await fetch(`${apiBaseUrl()}${path}`, init);
  if (!response.ok) {
    throw await parseError(response);
  }
  if (response.status === 204) {
    return null;
  }
  return (await response.json()) as T;
}

export async function registerAccount(input: {
  email: string;
  password: string;
  displayName: string;
  preferredLocale?: Locale;
  acceptedTerms: true;
}): Promise<AuthSessionResponse> {
  return (await apiMutate<AuthSessionResponse>("/api/v1/auth/register", "POST", input))!;
}

export async function loginAccount(input: {
  email: string;
  password: string;
}): Promise<AuthSessionResponse> {
  return (await apiMutate<AuthSessionResponse>("/api/v1/auth/login", "POST", input))!;
}

export async function logoutAccount(): Promise<void> {
  await apiMutate("/api/v1/auth/logout", "POST");
}

export async function fetchMeClient(): Promise<AuthUser> {
  const body = await apiGet<AuthSessionResponse>("/api/v1/auth/me");
  return body.user;
}

export async function createRelationshipProfile(input: {
  title: string;
  label?: string | null;
  partnerDisplayName?: string | null;
  startedAt?: string | null;
  preferredLocale?: Locale;
}): Promise<RelationshipProfileResponse> {
  return (await apiMutate<RelationshipProfileResponse>(
    "/api/v1/relationship-profiles",
    "POST",
    input,
  ))!;
}

/** Server-side session check: forwards request cookies to the API. */
export async function fetchMeServer(
  cookieHeader: string | undefined,
): Promise<
  | { status: "authenticated"; user: AuthUser }
  | { status: "unauthenticated" }
  | { status: "unavailable" }
> {
  try {
    const response = await fetch(`${apiBaseUrl()}/api/v1/auth/me`, {
      method: "GET",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      cache: "no-store",
    });
    if (response.status === 401) {
      return { status: "unauthenticated" };
    }
    if (!response.ok) {
      return { status: "unavailable" };
    }
    const body = (await response.json()) as AuthSessionResponse;
    return { status: "authenticated", user: body.user };
  } catch {
    return { status: "unavailable" };
  }
}

export async function createMoment(input: CreateMomentRequest): Promise<MomentSingleResponse> {
  return (await apiMutate<MomentSingleResponse>("/api/v1/moments", "POST", input))!;
}

export async function listMoments(
  query: Partial<MomentListQuery> = {},
): Promise<PaginatedMomentsResponse> {
  const params = new URLSearchParams();
  if (query.kind) params.set("kind", query.kind);
  if (query.categoryCode) params.set("categoryCode", query.categoryCode);
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  if (query.cursor) params.set("cursor", query.cursor);
  if (query.limit !== undefined) params.set("limit", String(query.limit));
  const qs = params.toString();
  return apiGet<PaginatedMomentsResponse>(`/api/v1/moments${qs ? `?${qs}` : ""}`);
}

export async function updateMoment(
  momentId: string,
  input: UpdateMomentRequest,
): Promise<MomentSingleResponse> {
  return (await apiMutate<MomentSingleResponse>(`/api/v1/moments/${momentId}`, "PATCH", input))!;
}

export async function deleteMoment(momentId: string): Promise<void> {
  await apiMutate(`/api/v1/moments/${momentId}`, "DELETE");
}

export async function fetchBalanceSummary(
  window: BalanceWindow = "30d",
): Promise<BalanceSummaryResponse> {
  return apiGet<BalanceSummaryResponse>(`/api/v1/balance/summary?window=${window}`);
}

export async function fetchInsightSummary(
  window: InsightWindow = "30d",
): Promise<InsightSummaryResponse> {
  return apiGet<InsightSummaryResponse>(`/api/v1/insights/summary?window=${window}`);
}

export async function fetchNudgeCurrent(
  window: NudgeWindow = "30d",
): Promise<NudgeCurrentResponse> {
  return apiGet<NudgeCurrentResponse>(`/api/v1/nudges/current?window=${window}`);
}

export async function suppressNudge(input: SuppressNudgeRequest): Promise<{ ok: true }> {
  return (await apiMutate<{ ok: true }>("/api/v1/nudges/suppress", "POST", input))!;
}

export async function fetchReminderPreference(): Promise<ReminderPreferenceResponse> {
  return apiGet<ReminderPreferenceResponse>("/api/v1/reminders/preference");
}

export async function upsertReminderPreference(
  input: UpsertReminderPreferenceRequest,
): Promise<ReminderPreferenceResponse> {
  return (await apiMutate<ReminderPreferenceResponse>(
    "/api/v1/reminders/preference",
    "PUT",
    input,
  ))!;
}

export async function dismissReminder(): Promise<ReminderPreferenceResponse> {
  return (await apiMutate<ReminderPreferenceResponse>("/api/v1/reminders/dismiss", "POST", {}))!;
}

export async function snoozeReminder(
  duration: ReminderSnoozeDuration,
): Promise<ReminderPreferenceResponse> {
  return (await apiMutate<ReminderPreferenceResponse>("/api/v1/reminders/snooze", "POST", {
    duration,
  }))!;
}

export async function previewShareSnapshot(
  input: CreateShareSnapshotRequest,
): Promise<ShareSnapshotPreviewResponse> {
  return (await apiMutate<ShareSnapshotPreviewResponse>(
    "/api/v1/share-snapshots/preview",
    "POST",
    input,
  ))!;
}

export async function createShareSnapshot(
  input: CreateShareSnapshotRequest,
): Promise<ShareSnapshotCreateResponse> {
  return (await apiMutate<ShareSnapshotCreateResponse>("/api/v1/share-snapshots", "POST", input))!;
}

export async function listShareSnapshots(): Promise<ShareSnapshotListResponse> {
  return apiGet<ShareSnapshotListResponse>("/api/v1/share-snapshots");
}

export async function revokeShareSnapshot(
  shareId: string,
): Promise<{ share: ShareSnapshotListResponse["shares"][number] }> {
  return (await apiMutate<{ share: ShareSnapshotListResponse["shares"][number] }>(
    `/api/v1/share-snapshots/${shareId}/revoke`,
    "POST",
    {},
  ))!;
}

export async function resolveShareSnapshot(token: string): Promise<ShareSnapshotResolveResponse> {
  const response = await fetch(`${apiBaseUrl()}/api/v1/public/share-snapshots/resolve`, {
    method: "POST",
    credentials: "omit",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  if (!response.ok) {
    throw await parseError(response);
  }
  return (await response.json()) as ShareSnapshotResolveResponse;
}

export async function listAccountSessions(): Promise<SessionListResponse> {
  return apiGet<SessionListResponse>("/api/v1/account/sessions");
}

export async function revokeAccountSession(sessionId: string): Promise<{ ok: true } | null> {
  return apiMutate<{ ok: true }>(`/api/v1/account/sessions/${sessionId}/revoke`, "POST", {});
}

export async function changeAccountPassword(input: ChangePasswordRequest): Promise<{ ok: true }> {
  return (await apiMutate<{ ok: true }>("/api/v1/account/password", "POST", input))!;
}

export async function exportPersonalData(currentPassword: string): Promise<DataExportV1> {
  return (await apiMutate<DataExportV1>("/api/v1/account/export", "POST", {
    currentPassword,
  }))!;
}

export async function fetchDeletionSummary(): Promise<DeletionSummaryResponse> {
  return apiGet<DeletionSummaryResponse>("/api/v1/account/deletion-summary");
}

export async function revokeAllAccountShares(): Promise<{ revokedCount: number }> {
  return (await apiMutate<{ revokedCount: number }>(
    "/api/v1/account/shares/revoke-all",
    "POST",
    {},
  ))!;
}

export async function hardDeleteAccountShare(shareId: string): Promise<{ ok: true }> {
  return (await apiMutate<{ ok: true }>(`/api/v1/account/shares/${shareId}`, "DELETE"))!;
}

export async function deleteAccountPermanently(input: {
  currentPassword: string;
  confirmationPhrase: string;
}): Promise<void> {
  await apiMutate("/api/v1/account/delete", "POST", input);
}

export type {
  MomentResponse,
  BalanceSummaryResponse,
  BalanceWindow,
  InsightSummaryResponse,
  InsightWindow,
  NudgeCurrentResponse,
  NudgeWindow,
  ReminderPreferenceResponse,
  ShareSnapshotCreateResponse,
  ShareSnapshotPreviewResponse,
  PrivateShareSnapshotPayload,
  DataExportV1,
  DeletionSummaryResponse,
  SessionListResponse,
};
