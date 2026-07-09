// Typed API client seam (Story 1.11b, DD-7).
//
// A thin hand-written fetch layer that parses every response with the SAME
// `@twt/contracts` Zod schemas the server validates against — single source of
// transport types, no hand-written shadow types (arch Naming L3719-3723). The full
// OpenAPI→client codegen is deferred (DD-7). Every call rides the HttpOnly +
// SameSite=Lax session cookie via `credentials: 'include'`; a 401 surfaces as an
// `ApiError` the router/Query layer redirects to /login on.

import {
  AuditIntegrityAcknowledgement,
  AuditIntegrityCheckList,
  AuditIntegrityCheckResult,
  ClauseDraftResponse,
  ClauseVersionResponse,
  DeployTriggerResponse,
  DiffPreviewResponse,
  ConvergenceMergeResponse,
  ConvergenceOverrideResponse,
  HelplineClaimIntakeResponse,
  HelplineOperatorEventResponse,
  LoginResponse,
  PendingIntakeAttemptsResponse,
  MemberSearchResponse,
  MemberValidityResponse,
  StepUpRequestResponse,
  StepUpVerifyResponse,
  ProvisionedPariwar,
  ProvisioningStatusList,
  PublishClauseResponse,
  RecoveryConsumeResponse,
  SessionResponse,
  DegradedModeActiveResponse,
  DegradedModeDeclarationResponse,
  WaConfigResponse,
  WaTemplateDto,
  WaTemplatesResponse,
  TelegramConfigResponse,
  type DegradedModeActiveResponse as DegradedModeActive,
  type DegradedModeDeclarationResponse as DegradedModeDeclaration,
  type DegradedModeDeclareRequest,
  type WaConfigResponse as WaConfig,
  type WaConfigUpsertRequest,
  type WaTemplateDto as WaTemplate,
  type WaTemplateUpsertRequest,
  type WaTemplatesResponse as WaTemplates,
  type TelegramConfigResponse as TelegramConfig,
  type TelegramConfigUpsertRequest,
  type ConvergenceMergeRequest,
  type ConvergenceMergeResponse as ConvergenceMergeResult,
  type ConvergenceOverrideRequest,
  type ConvergenceOverrideResponse as ConvergenceOverrideResult,
  type HelplineClaimIntakeRequest,
  type HelplineClaimIntakeResponse as HelplineClaimIntakeResult,
  type HelplineOperatorEventRequest,
  type HelplineOperatorEventResponse as HelplineOperatorEventResult,
  type PendingIntakeAttemptsResponse as PendingConvergence,
  type MemberSearchRequest,
  type MemberSearchResponse as MemberSearchResult,
  type MemberValidityResponse as MemberValidityResult,
  type StepUpRequestResponse as StepUpRequestResult,
  type StepUpVerifyResponse as StepUpVerifyResult,
  type AddPariwarRequest as AddPariwarPayload,
  type AuditIntegrityAcknowledgement as Acknowledgement,
  type AuditIntegrityCheckList as CheckList,
  type AuditIntegrityCheckResult as CheckResult,
  type ClauseDraftResponse as ClauseDraft,
  type ClauseVersionResponse as ClauseVersion,
  type CreateDraftBody,
  type DeployTriggerResponse as DeployResult,
  type DiffPreviewResponse as DiffPreview,
  type LoginResponse as LoginResult,
  type ProvisionedPariwar as Provisioned,
  type ProvisioningStatusList as StatusList,
  type PublishClauseResponse as Published,
  type SessionResponse as Session,
  type UpdateClauseDraftRequest,
} from '@twt/contracts';
import { z } from 'zod';

/** A typed transport error — carries the HTTP status + the server's error code. */
export class ApiError extends Error {
  public constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
  public get isUnauthorized(): boolean {
    return this.status === 401;
  }
}

interface ErrorEnvelope {
  error?: { code?: string; message?: string };
}

/**
 * Core fetch: same-origin, cookie-bearing, schema-validated. The schema's INPUT
 * type is left `unknown` so `T` infers purely from the schema OUTPUT — branded
 * contracts (e.g. `PariwarIdSchema = z.string().uuid().brand()`) have a plain-string
 * input but a branded output, which would otherwise collapse the inference.
 */
async function apiFetch<T>(
  path: string,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });

  if (!res.ok) {
    let code = `http.${res.status}`;
    let message = res.statusText || 'Request failed';
    try {
      const body = (await res.json()) as ErrorEnvelope;
      if (body.error?.code) code = body.error.code;
      if (body.error?.message) message = body.error.message;
    } catch {
      // Non-JSON error body — keep the status-derived defaults.
    }
    throw new ApiError(res.status, code, message);
  }

  // 204 (logout) has no body to parse.
  if (res.status === 204) return undefined as T;
  return schema.parse(await res.json());
}

// ── Audit-integrity surface (Story 1.11b) ─────────────────────────────────────

/** GET the recent integrity-check history (default 30, most-recent first). */
export function listIntegrityChecks(limit = 30): Promise<CheckList> {
  return apiFetch(`/api/v1/audit/integrity-checks?limit=${limit}`, AuditIntegrityCheckList);
}

/** POST an on-demand verification of the whole global chain (the 1.11a endpoint). */
export function runVerification(): Promise<CheckResult> {
  return apiFetch('/api/v1/audit/verify-integrity', AuditIntegrityCheckResult, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

/** POST an acknowledgement of a (failed) check with an investigation-ticket ref. */
export function acknowledgeCheck(
  checkId: string,
  ticketRef: string,
): Promise<Acknowledgement> {
  return apiFetch(
    `/api/v1/audit/integrity-checks/${encodeURIComponent(checkId)}/acknowledge`,
    AuditIntegrityAcknowledgement,
    { method: 'POST', body: JSON.stringify({ ticketRef }) },
  );
}

// ── Multi-Pariwar provisioning surface (Story 1.15) ───────────────────────────

/** GET the provisioning-status view: provisioned Pariwars + latest deploy status. */
export function listProvisionedPariwars(limit = 100): Promise<StatusList> {
  return apiFetch(`/api/v1/provisioning/pariwars?limit=${limit}`, ProvisioningStatusList);
}

/** POST the Add-Pariwar form → provisions a new Pariwar (mints id + persists passport). */
export function addPariwar(payload: AddPariwarPayload): Promise<Provisioned> {
  return apiFetch('/api/v1/provisioning/pariwars', ProvisionedPariwar, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** POST to trigger a Dokploy build for an existing Pariwar via the deploy seam. */
export function triggerDeploy(pariwarId: string): Promise<DeployResult> {
  return apiFetch(
    `/api/v1/provisioning/pariwars/${encodeURIComponent(pariwarId)}/deploy`,
    DeployTriggerResponse,
    { method: 'POST', body: JSON.stringify({}) },
  );
}

// ── Niyamavali amendment-workflow surface (Story 2.4) ─────────────────────────
// Tenant-scoped under /p/:pariwarId/. Each call parses the response with the
// `@twt/contracts` schema the server validates against (DD-7 — no shadow types).

const niyBase = (pariwarId: string): string =>
  `/api/v1/p/${encodeURIComponent(pariwarId)}/niyamavali`;

/** GET the registry (latest version per clause), newest-first. */
export function listClauses(pariwarId: string, limit = 50): Promise<ClauseVersion[]> {
  return apiFetch(`${niyBase(pariwarId)}/clauses?limit=${limit}`, z.array(ClauseVersionResponse));
}

/** GET clause drafts, optionally filtered by lifecycle state. */
export function listDrafts(pariwarId: string, status?: string, limit = 50): Promise<ClauseDraft[]> {
  const q = status ? `&status=${encodeURIComponent(status)}` : '';
  return apiFetch(`${niyBase(pariwarId)}/clauses/drafts?limit=${limit}${q}`, z.array(ClauseDraftResponse));
}

/** GET a single draft (the reviewer loads the exact pending content — AC1d). */
export function getDraft(pariwarId: string, draftId: string): Promise<ClauseDraft> {
  return apiFetch(`${niyBase(pariwarId)}/clauses/drafts/${encodeURIComponent(draftId)}`, ClauseDraftResponse);
}

/** POST a new draft (create | amend). */
export function createDraft(pariwarId: string, body: CreateDraftBody): Promise<ClauseDraft> {
  return apiFetch(`${niyBase(pariwarId)}/clauses/drafts`, ClauseDraftResponse, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** PUT an edit to a draft (resets the sign-off — content-bound, AC1d). */
export function updateDraft(
  pariwarId: string,
  draftId: string,
  patch: UpdateClauseDraftRequest,
): Promise<ClauseDraft> {
  return apiFetch(`${niyBase(pariwarId)}/clauses/drafts/${encodeURIComponent(draftId)}`, ClauseDraftResponse, {
    method: 'PUT',
    body: JSON.stringify(patch),
  });
}

/** GET the structured + rendered diff preview (AC1c). */
export function getDraftDiff(pariwarId: string, draftId: string): Promise<DiffPreview> {
  return apiFetch(
    `${niyBase(pariwarId)}/clauses/drafts/${encodeURIComponent(draftId)}/diff`,
    DiffPreviewResponse,
  );
}

/** POST submit-for-review (draft → in_review). */
export function submitForReview(pariwarId: string, draftId: string): Promise<ClauseDraft> {
  return apiFetch(
    `${niyBase(pariwarId)}/clauses/drafts/${encodeURIComponent(draftId)}/submit-for-review`,
    ClauseDraftResponse,
    { method: 'POST', body: JSON.stringify({}) },
  );
}

/** POST a non-author tone-review sign-off. */
export function signoffDraft(pariwarId: string, draftId: string): Promise<ClauseDraft> {
  return apiFetch(
    `${niyBase(pariwarId)}/clauses/drafts/${encodeURIComponent(draftId)}/tone-review`,
    ClauseDraftResponse,
    { method: 'POST', body: JSON.stringify({ confirm: true }) },
  );
}

/** POST publish (audit-logged, tone-review-gated). Throws ApiError(409) when ungated. */
export function publishDraft(pariwarId: string, draftId: string): Promise<Published> {
  return apiFetch(
    `${niyBase(pariwarId)}/clauses/drafts/${encodeURIComponent(draftId)}/publish`,
    PublishClauseResponse,
    { method: 'POST', body: JSON.stringify({}) },
  );
}

// ── Member-status surface (Story 4.7) ─────────────────────────────────────────
// Tenant-scoped under /p/:pariwarId/admin/members. The AR-65 compound-read-model
// search + the FR-12A validity read the `<MemberStatusPanel>` renders. Each call
// parses with the `@twt/contracts` schema the server validates against (DD-7).

const adminMemberBase = (pariwarId: string): string =>
  `/api/v1/p/${encodeURIComponent(pariwarId)}/admin/members`;

/** POST the AR-65 compound-read-model member search (exact-match: memberId | mobile | pariwar browse). */
export function searchMembers(
  pariwarId: string,
  body: MemberSearchRequest,
): Promise<MemberSearchResult> {
  return apiFetch(`${adminMemberBase(pariwarId)}/search`, MemberSearchResponse, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** GET a member's FR-12A validity payload (scope-gated, audited server-side). */
export function getMemberValidity(
  pariwarId: string,
  memberId: string,
): Promise<MemberValidityResult> {
  return apiFetch(
    `${adminMemberBase(pariwarId)}/${encodeURIComponent(memberId)}/validity`,
    MemberValidityResponse,
  );
}

// ── Helpline claim-filing surface (Story 6.3) ─────────────────────────────────
// Tenant-scoped under /p/:pariwarId/admin/claims. The operator (Priya-path) files a claim on
// a bereaved caller's behalf. The route is gated server-side by [adminSession, scope,
// requirePermissionHook(claim.file), requireStepUp('claim_file')] — the step-up is the
// operator's OWN admin step-up (driven via the step-up request/verify endpoints below). A
// StepUpRequiredError (403, code 'auth.step_up_required') is the signal to run that elevation,
// NOT a hard error. The response carries `created` — false on a cross-channel convergence hit
// ("a claim already exists for this member"), true on a fresh filing.

const adminClaimsBase = (pariwarId: string): string =>
  `/api/v1/p/${encodeURIComponent(pariwarId)}/admin/claims`;

/** POST the helpline intake → emit claim.intake_initiated (→ freeze), idempotently + convergently. */
export function initiateHelplineClaim(
  pariwarId: string,
  body: HelplineClaimIntakeRequest,
): Promise<HelplineClaimIntakeResult> {
  return apiFetch(`${adminClaimsBase(pariwarId)}/intake`, HelplineClaimIntakeResponse, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** POST a non-freezing operator-action audit line (read-back confirm / AR-61 escalation —
 * Review Finding, AC4/AC5). No step-up: neither action mutates claim/member state. */
export function recordHelplineOperatorEvent(
  pariwarId: string,
  body: HelplineOperatorEventRequest,
): Promise<HelplineOperatorEventResult> {
  return apiFetch(`${adminClaimsBase(pariwarId)}/operator-event`, HelplineOperatorEventResponse, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// ── ICP convergence-resolution surface (Story 6.4) ────────────────────────────
// Tenant-scoped under /p/:pariwarId/admin/claims/convergence. The operator/trustee
// <ConvergenceDecisionStrip> back end: list the pending cross-channel attempts + resolve each by
// MERGE (confirm convergence) or OVERRIDE (treat as separate — mints a distinct claim). Gated
// server-side by [adminSession, scope, requirePermissionHook(claim.file)] (+ step-up on override).

const adminConvergenceBase = (pariwarId: string): string =>
  `${adminClaimsBase(pariwarId)}/convergence`;

/** GET the pending intake attempts + their candidate canonical claims (the strip feed; AC2/AC3). */
export function listPendingConvergence(pariwarId: string): Promise<PendingConvergence> {
  return apiFetch(`${adminConvergenceBase(pariwarId)}/pending`, PendingIntakeAttemptsResponse);
}

/** POST confirm-convergence (union the channel into the canonical claim + flip the attempt). */
export function confirmConvergenceMerge(
  pariwarId: string,
  body: ConvergenceMergeRequest,
): Promise<ConvergenceMergeResult> {
  return apiFetch(`${adminConvergenceBase(pariwarId)}/merge`, ConvergenceMergeResponse, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** POST override (treat the attempt as separate → mint a distinct claim + the override ledger row). */
export function overrideConvergence(
  pariwarId: string,
  body: ConvergenceOverrideRequest,
): Promise<ConvergenceOverrideResult> {
  return apiFetch(`${adminConvergenceBase(pariwarId)}/override`, ConvergenceOverrideResponse, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// ── Admin step-up surface (Story 1.9) — driven by the helpline console for §2.2 claim-filing.
// The operator elevates for actionContext 'claim_file' before the freeze-firing intake POST.

/** POST to request a step-up OTP for the named action context (delivery is seamed, Story 5.6/5.9). */
export function requestStepUp(actionContext: string): Promise<StepUpRequestResult> {
  return apiFetch('/api/v1/auth/step-up/request', StepUpRequestResponse, {
    method: 'POST',
    body: JSON.stringify({ actionContext }),
  });
}

/** POST the OTP to verify the step-up → the session gains a fresh elevated context (~5 min). */
export function verifyStepUp(otp: string): Promise<StepUpVerifyResult> {
  return apiFetch('/api/v1/auth/step-up/verify', StepUpVerifyResponse, {
    method: 'POST',
    body: JSON.stringify({ otp }),
  });
}

// ── Channel-config surface (Story 5.3) ────────────────────────────────────────
// Tenant-scoped under /p/:pariwarId/admin/channel-config/whatsapp. The trustee WA
// config singleton + per-category UTILITY template mapping. The access-token field is
// a Secret-Manager NAME (a pointer), never a token value.

const waConfigBase = (pariwarId: string): string =>
  `/api/v1/p/${encodeURIComponent(pariwarId)}/admin/channel-config/whatsapp`;

/** GET the WA config singleton (zero-config defaults when unprovisioned). */
export function getWaConfig(pariwarId: string): Promise<WaConfig> {
  return apiFetch(waConfigBase(pariwarId), WaConfigResponse);
}

/** PUT (upsert) the WA config singleton. */
export function putWaConfig(pariwarId: string, body: WaConfigUpsertRequest): Promise<WaConfig> {
  return apiFetch(waConfigBase(pariwarId), WaConfigResponse, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

/** GET the per-category UTILITY template mapping. */
export function getWaTemplates(pariwarId: string): Promise<WaTemplates> {
  return apiFetch(`${waConfigBase(pariwarId)}/templates`, WaTemplatesResponse);
}

/** PUT (upsert) one category's template mapping. */
export function putWaTemplate(pariwarId: string, body: WaTemplateUpsertRequest): Promise<WaTemplate> {
  return apiFetch(`${waConfigBase(pariwarId)}/templates`, WaTemplateDto, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

// ── Telegram config (Story 5.5) — the per-Pariwar Telegram Bot config singleton. The bot-token +
// webhook-secret-token fields are Secret-Manager NAMEs (pointers), never the values.

const telegramConfigBase = (pariwarId: string): string =>
  `/api/v1/p/${encodeURIComponent(pariwarId)}/admin/channel-config/telegram`;

/** GET the Telegram config singleton (zero-config defaults when unprovisioned). */
export function getTelegramConfig(pariwarId: string): Promise<TelegramConfig> {
  return apiFetch(telegramConfigBase(pariwarId), TelegramConfigResponse);
}

/** PUT (upsert) the Telegram config singleton. */
export function putTelegramConfig(pariwarId: string, body: TelegramConfigUpsertRequest): Promise<TelegramConfig> {
  return apiFetch(telegramConfigBase(pariwarId), TelegramConfigResponse, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

// ── Degraded-mode surface (Story 5.8) ─────────────────────────────────────────
// Tenant-scoped under /p/:pariwarId/admin/degraded-mode. The trustee declare/revoke/read-active surface for
// the AR-20 cycle-open SMS bridge. Gated server-side by pariwar.declare_degraded_mode (a pariwar-scoped grant
// not in the session's global-grant set — the server's requirePermissionHook is the real boundary).

const degradedModeBase = (pariwarId: string): string =>
  `/api/v1/p/${encodeURIComponent(pariwarId)}/admin/degraded-mode`;

/** GET the currently-active degraded-mode declaration (or null). */
export function getActiveDegradedMode(pariwarId: string): Promise<DegradedModeActive> {
  return apiFetch(`${degradedModeBase(pariwarId)}/active`, DegradedModeActiveResponse);
}

/** POST declare degraded mode. */
export function declareDegradedMode(
  pariwarId: string,
  body: DegradedModeDeclareRequest,
): Promise<DegradedModeDeclaration> {
  return apiFetch(`${degradedModeBase(pariwarId)}/declarations`, DegradedModeDeclarationResponse, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** POST manual revocation of a declaration; returns the now-active declaration (or null). */
export function revokeDegradedMode(pariwarId: string, id: string): Promise<DegradedModeActive> {
  return apiFetch(
    `${degradedModeBase(pariwarId)}/declarations/${encodeURIComponent(id)}/revoke`,
    DegradedModeActiveResponse,
    { method: 'POST', body: JSON.stringify({}) },
  );
}

// ── Auth surface (Story 1.9 endpoints, driven by the login page) ──────────────

/** GET the current session's userId + global-scope grants (DD-6). */
export function getSession(): Promise<Session> {
  return apiFetch('/api/v1/auth/session', SessionResponse);
}

/**
 * POST the first factor (email + password) → mfa_required. The optional Turnstile
 * token is forwarded ONLY when present (the `LoginRequest` contract already carries
 * `turnstileToken?`); absent ⇒ the server's no-op verifier passes (dev default).
 * Story 1.13 — only `login` carries the token (recovery/consume is the MFA second
 * factor, which the server does NOT Turnstile-gate).
 */
export function login(
  email: string,
  password: string,
  turnstileToken?: string,
): Promise<LoginResult> {
  return apiFetch('/api/v1/auth/login', LoginResponse, {
    method: 'POST',
    body: JSON.stringify({ email, password, ...(turnstileToken ? { turnstileToken } : {}) }),
  });
}

/** POST to fetch the WebAuthn authentication options (provider-controlled JSON). */
export async function passkeyAuthOptions(): Promise<unknown> {
  const res = await fetch('/api/v1/auth/passkey/authenticate/options', {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new ApiError(res.status, `http.${res.status}`, 'Passkey options failed');
  return res.json();
}

/** POST the WebAuthn assertion to complete the second factor. */
export async function passkeyAuthVerify(response: unknown): Promise<{ authenticated: boolean }> {
  const res = await fetch('/api/v1/auth/passkey/authenticate/verify', {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ response }),
  });
  if (!res.ok) throw new ApiError(res.status, `http.${res.status}`, 'Passkey verification failed');
  return res.json() as Promise<{ authenticated: boolean }>;
}

/** POST a recovery code as the second factor (single-use). */
export function consumeRecovery(code: string): Promise<{ authenticated: boolean }> {
  return apiFetch('/api/v1/auth/recovery/consume', RecoveryConsumeResponse, {
    method: 'POST',
    body: JSON.stringify({ code }),
  }) as Promise<{ authenticated: boolean }>;
}

/** GET a CSRF double-submit token (required by the logout mutation, ADR-0009). */
async function fetchCsrfToken(): Promise<string> {
  const res = await fetch('/api/v1/auth/csrf', { credentials: 'include' });
  if (!res.ok) throw new ApiError(res.status, `http.${res.status}`, 'CSRF token fetch failed');
  const body = (await res.json()) as { csrfToken: string };
  return body.csrfToken;
}

/** POST logout with the double-submit CSRF token; destroys the session. */
export async function logout(): Promise<void> {
  const csrfToken = await fetchCsrfToken();
  const res = await fetch('/api/v1/auth/logout', {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json', 'csrf-token': csrfToken },
    body: JSON.stringify({}),
  });
  if (!res.ok && res.status !== 401) {
    throw new ApiError(res.status, `http.${res.status}`, 'Logout failed');
  }
}
