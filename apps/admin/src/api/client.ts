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
  VerifierConsoleResponse,
  type VerifierConsoleResponse as VerifierConsole,
  VerifierDecisionResponse,
  type VerifierDecisionResponse as VerifierDecision,
  type VerifierDecisionRequest as VerifierDecisionPayload,
  type VerifierDecisionReviseRequest as VerifierDecisionRevisePayload,
  // Story 6.15 — the verifier concealment-linkage assessment surface (record/revise).
  ConcealmentAssessmentResponse,
  type ConcealmentAssessmentResponse as ConcealmentAssessment,
  type ConcealmentAssessmentRequest as ConcealmentAssessmentPayload,
  // Story 6.13 — the State-Trustee cycle-freeze surface (pending list + decision + commit).
  CycleFreezePendingResponse,
  CycleFreezeDecisionResponse,
  CycleFreezeCommitResponse,
  type CycleFreezePendingResponse as CycleFreezePending,
  type CycleFreezeDecisionResponse as CycleFreezeDecision,
  type CycleFreezeCommitResponse as CycleFreezeCommit,
  type CycleFreezeDecisionRequest as CycleFreezeDecisionPayload,
  type CycleFreezeCommitRequest as CycleFreezeCommitPayload,
  // Story 6.14 — the R9 special-case voting surface DTOs.
  R9QueueResponse,
  R9PanelResponse,
  R9SessionResponse,
  R9VoteResponse,
  R9FinalizeResponse,
  R9VotesByTrusteeResponse,
  type R9QueueResponse as R9Queue,
  type R9PanelResponse as R9Panel,
  type R9SessionResponse as R9Session,
  type R9VoteResponse as R9VoteResult,
  type R9FinalizeResponse as R9Finalize,
  type R9VotesByTrusteeResponse as R9VotesByTrustee,
  type R9OpenSessionRequest as R9OpenPayload,
  type R9VoteRequest as R9VotePayload,
  type R9CancelRequest as R9CancelPayload,
  // Story 6.16 — the internal 3-stage appeal surface DTOs.
  AdminAppealCaseResponse,
  AppealDecisionResponse,
  AppealPanelSessionResponse,
  AppealPanelVoteResponse,
  AppealPanelFinalizeResponse,
  AppealDecisionsByReviewerResponse,
  type AdminAppealCaseResponse as AppealCase,
  type AppealDecisionResponse as AppealDecision,
  type AppealPanelSessionResponse as AppealPanelSession,
  type AppealPanelVoteResponse as AppealPanelVoteResult,
  type AppealPanelFinalizeResponse as AppealFinalize,
  type AppealDecisionsByReviewerResponse as AppealDecisionsByReviewer,
  type AppealStage1ReviewRequest as AppealStage1Payload,
  type AppealStage2OpenRequest as AppealOpenPayload,
  type AppealStage2VoteRequest as AppealVotePayload,
  type AppealStage2FinalizeRequest as AppealFinalizePayload,
  type AppealStage2CancelRequest as AppealCancelPayload,
  type AppealStage3DecideRequest as AppealStage3Payload,
  // Story 7.5 — the fixed-amount schedule surface DTOs (view + standard/emergency writes).
  PoolFixedAmountView,
  PoolFixedAmountScheduleResponse,
  PoolFixedAmountEmergencyResponse,
  type PoolFixedAmountView as FixedAmountView,
  type PoolFixedAmountScheduleResponse as FixedAmountScheduleResult,
  type PoolFixedAmountEmergencyResponse as FixedAmountEmergencyResult,
  type PoolFixedAmountScheduleRequest as FixedAmountSchedulePayload,
  type PoolFixedAmountEmergencyRequest as FixedAmountEmergencyPayload,
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
  ReconciliationActionResponse,
  ReconciliationCaseDetail,
  ReconciliationQueueResponse,
  type ReconciliationConfirmRequest,
  type ReconciliationRecoverRequest,
  type ReconciliationRejectRequest,
  type ReconciliationReverseRequest,
  // Story 10.3 — the helpdesk operator call-to-ticket surface (create + registry-driven categories).
  CreateTicketResponse,
  HelpdeskCategoryListResponse,
  type CreateTicketRequest,
  type CreateTicketResponse as HelpdeskTicket,
  type HelpdeskCategoryListResponse as HelpdeskCategoryList,
  // Story 10.4 — the helpdesk responder console (queue + detail + transitions).
  HelpdeskQueueResponse,
  HelpdeskAdminTicketDetailResponse,
  type HelpdeskQueueResponse as HelpdeskQueue,
  type HelpdeskAdminTicketDetailResponse as HelpdeskAdminTicketDetail,
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
  public get isForbidden(): boolean {
    return this.status === 403;
  }
}

/** Render a caught error (typically from a React Query mutation/query) as a short user-facing string. */
export function errorMessage(error: unknown): string | undefined {
  if (!error) return undefined;
  if (error instanceof ApiError) return `${error.code}: ${error.message}`;
  return error instanceof Error ? error.message : 'Something went wrong.';
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

// ── Ground-inspection admin surface (Story 6.7) ───────────────────────────────
// Tenant-scoped under /p/:pariwarId/admin/claims/:claimCaseId/ground-inspection. The console is
// English-facing; these are internal admin calls (no @twt/contracts mirror — the shapes are defined
// here). PII typed by the caller travels plaintext over the same-origin TLS channel + is encrypted
// server-side before insert; the read returns decrypted values + short-lived signed photo URLs.

const giBase = (pariwarId: string, claimCaseId: string): string =>
  `/api/v1/p/${encodeURIComponent(pariwarId)}/admin/claims/${encodeURIComponent(claimCaseId)}/ground-inspection`;

export const GroundInspectionPhoto = z.object({
  photoId: z.string(),
  contentType: z.string(),
  byteSize: z.number(),
  caption: z.string().nullable(),
  signedUrl: z.string(),
});
export const GroundInspectionAssignment = z.object({
  groundInspectionId: z.string(),
  district: z.string(),
  inspectionStage: z.string(),
  inspectionSiteType: z.string(),
  inspectorActorId: z.string(),
  scheduledAt: z.string(),
  status: z.string(),
  refusalReason: z.string().nullable(),
  supersedesGroundInspectionId: z.string().nullable(),
  completedAt: z.string().nullable(),
  structuredFindings: z.unknown().nullable(),
  locationDetail: z.string().nullable(),
  familyContact: z.string().nullable(),
  notes: z.string().nullable(),
  photos: z.array(GroundInspectionPhoto),
});
const GroundInspectionReadResponse = z.object({ assignments: z.array(GroundInspectionAssignment) });
const GroundInspectionWriteResponse = z.object({
  groundInspectionId: z.string(),
  status: z.string(),
  created: z.boolean().optional(),
});

export type GroundInspectionAssignmentT = z.infer<typeof GroundInspectionAssignment>;

export interface ScheduleGroundInspectionBody {
  district: string;
  inspectionStage: string;
  inspectionSiteType: string;
  inspectorActorId: string;
  scheduledAt: string;
  locationDetail?: string | null;
  familyContact?: string | null;
  notes?: string | null;
  structuredFindings?: Record<string, unknown>;
}

/** GET the claim's ground-inspection assignments in ONE district (the AC5 absence-is-a-signal read). */
export function listGroundInspection(
  pariwarId: string,
  claimCaseId: string,
  district: string,
): Promise<{ assignments: GroundInspectionAssignmentT[] }> {
  return apiFetch(
    `${giBase(pariwarId, claimCaseId)}?district=${encodeURIComponent(district)}`,
    GroundInspectionReadResponse,
  );
}

/** POST a new ground-inspection assignment (schedule). Idempotency-Key dedups a retry. */
export function scheduleGroundInspection(
  pariwarId: string,
  claimCaseId: string,
  body: ScheduleGroundInspectionBody,
  idempotencyKey: string,
): Promise<{ groundInspectionId: string; status: string; created?: boolean }> {
  return apiFetch(giBase(pariwarId, claimCaseId), GroundInspectionWriteResponse, {
    method: 'POST',
    headers: { 'idempotency-key': idempotencyKey },
    body: JSON.stringify(body),
  });
}

/** PATCH structured findings + free-text notes onto an assignment. */
export function recordGroundInspectionFindings(
  pariwarId: string,
  claimCaseId: string,
  groundInspectionId: string,
  body: { structuredFindings?: Record<string, unknown>; notes?: string | null },
): Promise<{ groundInspectionId: string; status: string }> {
  return apiFetch(
    `${giBase(pariwarId, claimCaseId)}/${encodeURIComponent(groundInspectionId)}`,
    GroundInspectionWriteResponse,
    { method: 'PATCH', body: JSON.stringify(body) },
  );
}

/** POST completion (requires ≥1 photo — the server enforces it). */
export function completeGroundInspection(
  pariwarId: string,
  claimCaseId: string,
  groundInspectionId: string,
  body: { structuredFindings?: Record<string, unknown>; notes?: string | null } = {},
): Promise<{ groundInspectionId: string; status: string }> {
  return apiFetch(
    `${giBase(pariwarId, claimCaseId)}/${encodeURIComponent(groundInspectionId)}/complete`,
    GroundInspectionWriteResponse,
    { method: 'POST', body: JSON.stringify(body) },
  );
}

/** POST the AC4a refusal disposition (photo_refused | evidence_unavailable + mandatory note). */
export function refuseGroundInspection(
  pariwarId: string,
  claimCaseId: string,
  groundInspectionId: string,
  body: { disposition: string; refusalReason: string; reasonNote: string },
): Promise<{ groundInspectionId: string; status: string }> {
  return apiFetch(
    `${giBase(pariwarId, claimCaseId)}/${encodeURIComponent(groundInspectionId)}/refusal`,
    GroundInspectionWriteResponse,
    { method: 'POST', body: JSON.stringify(body) },
  );
}

/** POST one photo (multipart). The caption (optional PII) rides a field before the file part. */
export async function uploadGroundInspectionPhoto(
  pariwarId: string,
  claimCaseId: string,
  groundInspectionId: string,
  file: File,
  caption?: string,
): Promise<{ photoId: string }> {
  const form = new FormData();
  if (caption) form.append('caption', caption);
  form.append('file', file);
  const res = await fetch(
    `${giBase(pariwarId, claimCaseId)}/${encodeURIComponent(groundInspectionId)}/photos`,
    { method: 'POST', credentials: 'include', body: form },
  );
  if (!res.ok) {
    let code = `http.${res.status}`;
    let message = res.statusText || 'Upload failed';
    try {
      const b = (await res.json()) as ErrorEnvelope;
      if (b.error?.code) code = b.error.code;
      if (b.error?.message) message = b.error.message;
    } catch {
      // keep defaults
    }
    throw new ApiError(res.status, code, message);
  }
  return (await res.json()) as { photoId: string };
}

// ── Verifier-console read surface (Story 6.10) ────────────────────────────────
// The READ-ONLY bounded compound signals view for one claim. Tenant-scoped under
// /p/:pariwarId/admin/claims/:claimCaseId/verifier-console. `claim.verify` is a per-Pariwar
// district-scoped grant, so the CLIENT gate is only "is there a live session"; the REAL boundary is
// the server permission hook (deriving the district server-side). Parsed with the shared @twt/contracts
// schema — no hand-written shadow type.

/** GET the bounded compound verifier-console packet for one claim (one request; no N+1 server-side). */
export function getVerifierConsole(pariwarId: string, claimCaseId: string): Promise<VerifierConsole> {
  return apiFetch(
    `/api/v1/p/${encodeURIComponent(pariwarId)}/admin/claims/${encodeURIComponent(claimCaseId)}/verifier-console`,
    VerifierConsoleResponse,
  );
}

// ── Verifier adjudication WRITE surface (Story 6.11) ──────────────────────────
// The FIRST verifier WRITE. Tenant-scoped under /p/:pariwarId/admin/claims/:claimCaseId/verifier-decision.
// The client gate is only "is there a live session"; the REAL boundary is the server's human-actor chain
// (claim.approve at the deceased's server-derived district). The request carries NO actor identity — the
// server resolves + snapshots users.display_name (R5). A StepUpRequiredError (403, 'auth.step_up_required')
// on the revise call is the signal to run the operator's elevation (requestStepUp/verifyStepUp), NOT a
// hard error. On success the caller invalidates verifierConsoleKey so (e)/(f)/the audit trail refetch.

const decisionBase = (pariwarId: string, claimCaseId: string): string =>
  `/api/v1/p/${encodeURIComponent(pariwarId)}/admin/claims/${encodeURIComponent(claimCaseId)}/verifier-decision`;

/** POST an approve / deny / escalate decision (outcome in the body). */
export function postVerifierDecision(
  pariwarId: string,
  claimCaseId: string,
  body: VerifierDecisionPayload,
): Promise<VerifierDecision> {
  return apiFetch(decisionBase(pariwarId, claimCaseId), VerifierDecisionResponse, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** POST a same-outcome revision (reason/rationale correction; step-up-gated server-side). */
export function reviseVerifierDecision(
  pariwarId: string,
  claimCaseId: string,
  body: VerifierDecisionRevisePayload,
): Promise<VerifierDecision> {
  return apiFetch(`${decisionBase(pariwarId, claimCaseId)}/revise`, VerifierDecisionResponse, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// ── Verifier concealment-linkage assessment WRITE surface (Story 6.15) ────────
// Tenant-scoped under /p/:pariwarId/admin/claims/:claimCaseId/concealment-assessment. A review annotation
// (kind + optional Tier-1 note) — it flags/routes, never decides (the State Trustee decides). The client
// gate is only "is there a live session"; the REAL boundary is the server's human-actor chain (claim.verify
// at the deceased's server-derived district). The request carries NO actor identity (R5 server-resolved).

/** POST a record/revise concealment-linkage assessment (kind + optional note). */
export function postConcealmentAssessment(
  pariwarId: string,
  claimCaseId: string,
  body: ConcealmentAssessmentPayload,
): Promise<ConcealmentAssessment> {
  return apiFetch(
    `/api/v1/p/${encodeURIComponent(pariwarId)}/admin/claims/${encodeURIComponent(claimCaseId)}/concealment-assessment`,
    ConcealmentAssessmentResponse,
    { method: 'POST', body: JSON.stringify(body) },
  );
}

// ── State-Trustee cycle-freeze surface (Story 6.13) ───────────────────────────
// Tenant-scoped under /p/:pariwarId/admin/cycle-freeze/*. cycle.freeze is a per-Pariwar grant, so the
// CLIENT gate is only "is there a live session"; the REAL boundary is the server permission hook. The
// commit is step-up-gated server-side — a StepUpRequiredError (403, 'auth.step_up_required') is the signal
// to run the trustee's elevation (requestStepUp/verifyStepUp with 'cycle_freeze_commit'), NOT a hard error.

const cycleFreezeBase = (pariwarId: string): string =>
  `/api/v1/p/${encodeURIComponent(pariwarId)}/admin/cycle-freeze`;

/** GET the two-bucket pending list (ready-to-freeze + escalated). */
export function getCycleFreezePending(pariwarId: string): Promise<CycleFreezePending> {
  return apiFetch(`${cycleFreezeBase(pariwarId)}/pending`, CycleFreezePendingResponse);
}

/** POST a per-claim decision (approve | deny | route_to_r9 | resolve_escalation; claim_case_id in body). */
export function postCycleFreezeDecision(
  pariwarId: string,
  body: CycleFreezeDecisionPayload,
): Promise<CycleFreezeDecision> {
  return apiFetch(`${cycleFreezeBase(pariwarId)}/decision`, CycleFreezeDecisionResponse, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** POST the step-up-gated bulk commit (client-generated commit_id idempotency key). */
export function commitCycleFreeze(
  pariwarId: string,
  body: CycleFreezeCommitPayload,
): Promise<CycleFreezeCommit> {
  return apiFetch(`${cycleFreezeBase(pariwarId)}/commit`, CycleFreezeCommitResponse, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// ── R9 special-case voting surface (Story 6.14) ───────────────────────────────
// Tenant-scoped under /p/:pariwarId/admin/r9-voting/*. claim.r9_vote is a per-Pariwar grant, so the REAL
// boundary is the server permission hook; the FINALIZE call is step-up-gated ('r9_finalize') — a 403
// 'auth.step_up_required' is the signal to elevate, NOT a hard error (the cycle-freeze commit precedent).

const r9Base = (pariwarId: string): string => `/api/v1/p/${encodeURIComponent(pariwarId)}/admin/r9-voting`;

/** GET the R9 voting queue (claims routed to R9 awaiting/undergoing panel voting). */
export function getR9Queue(pariwarId: string): Promise<R9Queue> {
  return apiFetch(`${r9Base(pariwarId)}/queue`, R9QueueResponse);
}

/** GET the per-claim panel model (session + immutable roster + live votes + tally). */
export function getR9Panel(pariwarId: string, claimCaseId: string): Promise<R9Panel> {
  return apiFetch(`${r9Base(pariwarId)}/${encodeURIComponent(claimCaseId)}`, R9PanelResponse);
}

/** POST open an R9 voting session (clause selection + immutable panel roster). */
export function openR9Session(pariwarId: string, claimCaseId: string, body: R9OpenPayload): Promise<R9Session> {
  return apiFetch(`${r9Base(pariwarId)}/${encodeURIComponent(claimCaseId)}/open`, R9SessionResponse, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** POST cast/revise a vote (rationale required ≤500 chars). */
export function castR9Vote(pariwarId: string, claimCaseId: string, body: R9VotePayload): Promise<R9VoteResult> {
  return apiFetch(`${r9Base(pariwarId)}/${encodeURIComponent(claimCaseId)}/vote`, R9VoteResponse, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** POST finalize the panel outcome (step-up-gated 'r9_finalize'). */
export function finalizeR9(pariwarId: string, claimCaseId: string): Promise<R9Finalize> {
  return apiFetch(`${r9Base(pariwarId)}/${encodeURIComponent(claimCaseId)}/finalize`, R9FinalizeResponse, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

/** POST cancel/correct a session (reason-code + rationale required). */
export function cancelR9Session(pariwarId: string, claimCaseId: string, body: R9CancelPayload): Promise<R9Session> {
  return apiFetch(`${r9Base(pariwarId)}/${encodeURIComponent(claimCaseId)}/cancel`, R9SessionResponse, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** GET the votes-by-trustee transcript (LIVE + superseded votes bound to session/panel/rule identity). */
export function getR9VotesByTrustee(
  pariwarId: string,
  actorId: string,
  sinceDays?: number,
): Promise<R9VotesByTrustee> {
  const qs = new URLSearchParams({ actorId });
  if (sinceDays !== undefined) qs.set('sinceDays', String(sinceDays));
  return apiFetch(`${r9Base(pariwarId)}/votes-by-trustee?${qs.toString()}`, R9VotesByTrusteeResponse);
}

// ── Story 6.16 — the internal 3-stage appeal admin surface ──

const appealBase = (pariwarId: string, claimCaseId: string): string =>
  `/api/v1/p/${encodeURIComponent(pariwarId)}/admin/claims/${encodeURIComponent(claimCaseId)}/appeal`;

/** GET the per-claim admin appeal case model (state + journey + panel + tally + current-stage SLA). */
export function getAppealCase(pariwarId: string, claimCaseId: string): Promise<AppealCase> {
  return apiFetch(appealBase(pariwarId, claimCaseId), AdminAppealCaseResponse);
}

/** POST the Stage-1 District-Admin review (reverse | advance; disposition required iff reverse). */
export function reviewAppealStage1(pariwarId: string, claimCaseId: string, body: AppealStage1Payload): Promise<AppealDecision> {
  return apiFetch(`${appealBase(pariwarId, claimCaseId)}/stage1`, AppealDecisionResponse, { method: 'POST', body: JSON.stringify(body) });
}

/** POST open a Stage-2 panel (immutable roster ≥2). */
export function openAppealPanel(pariwarId: string, claimCaseId: string, body: AppealOpenPayload): Promise<AppealPanelSession> {
  return apiFetch(`${appealBase(pariwarId, claimCaseId)}/stage2/open`, AppealPanelSessionResponse, { method: 'POST', body: JSON.stringify(body) });
}

/** POST cast/revise a Stage-2 vote (rationale required ≤500 chars). */
export function castAppealVote(pariwarId: string, claimCaseId: string, body: AppealVotePayload): Promise<AppealPanelVoteResult> {
  return apiFetch(`${appealBase(pariwarId, claimCaseId)}/stage2/vote`, AppealPanelVoteResponse, { method: 'POST', body: JSON.stringify(body) });
}

/** POST finalize the Stage-2 panel (step-up-gated 'appeal_stage2_finalize'; disposition required iff reverse). */
export function finalizeAppealPanel(pariwarId: string, claimCaseId: string, body: AppealFinalizePayload): Promise<AppealFinalize> {
  return apiFetch(`${appealBase(pariwarId, claimCaseId)}/stage2/finalize`, AppealPanelFinalizeResponse, { method: 'POST', body: JSON.stringify(body) });
}

/** POST cancel/correct a Stage-2 panel (reason-code + rationale required). */
export function cancelAppealPanel(pariwarId: string, claimCaseId: string, body: AppealCancelPayload): Promise<AppealPanelSession> {
  return apiFetch(`${appealBase(pariwarId, claimCaseId)}/stage2/cancel`, AppealPanelSessionResponse, { method: 'POST', body: JSON.stringify(body) });
}

/** POST the Stage-3 Trustee discretion decision (step-up-gated 'appeal_stage3_decide'; reverse | uphold). */
export function decideAppealStage3(pariwarId: string, claimCaseId: string, body: AppealStage3Payload): Promise<AppealDecision> {
  return apiFetch(`${appealBase(pariwarId, claimCaseId)}/stage3`, AppealDecisionResponse, { method: 'POST', body: JSON.stringify(body) });
}

/** GET the decisions-by-reviewer audit transcript (+ the D-H sla_breached/elapsed_days fields). */
export function getAppealDecisionsByReviewer(
  pariwarId: string,
  reviewerActorId: string,
  opts?: { stage?: '1' | '2' | '3'; sinceDays?: number; limit?: number },
): Promise<AppealDecisionsByReviewer> {
  const qs = new URLSearchParams({ reviewerActorId });
  if (opts?.stage) qs.set('stage', opts.stage);
  if (opts?.sinceDays !== undefined) qs.set('sinceDays', String(opts.sinceDays));
  if (opts?.limit !== undefined) qs.set('limit', String(opts.limit));
  return apiFetch(
    `/api/v1/p/${encodeURIComponent(pariwarId)}/admin/claims/appeal/decisions-by-reviewer?${qs.toString()}`,
    AppealDecisionsByReviewerResponse,
  );
}

// ── Story 7.5 — the fixed-amount schedule admin surface ──
// Tenant-scoped under /p/:pariwarId/admin/pool-fixed-amount. Both keys are per-Pariwar grants, so the REAL
// boundary is the server permission hook; the EMERGENCY call is step-up-gated ('pool_fixed_amount_emergency')
// — a 403 'auth.step_up_required' is the signal to elevate, NOT a hard error (the cycle-freeze precedent).

const fixedAmountBase = (pariwarId: string): string =>
  `/api/v1/p/${encodeURIComponent(pariwarId)}/admin/pool-fixed-amount`;

/** GET the current fixed-amount schedule + the amount effective now (+ embedded emergency records). */
export function getFixedAmountView(pariwarId: string): Promise<FixedAmountView> {
  return apiFetch(fixedAmountBase(pariwarId), PoolFixedAmountView);
}

/** POST a STANDARD (12-month-notice) fixed-amount change (server enforces the +365d floor). */
export function scheduleFixedAmountChange(
  pariwarId: string,
  body: FixedAmountSchedulePayload,
): Promise<FixedAmountScheduleResult> {
  return apiFetch(`${fixedAmountBase(pariwarId)}/schedule`, PoolFixedAmountScheduleResponse, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** POST an EMERGENCY adjustment override (no notice floor; attestation required; step-up-gated). */
export function applyFixedAmountEmergency(
  pariwarId: string,
  body: FixedAmountEmergencyPayload,
): Promise<FixedAmountEmergencyResult> {
  return apiFetch(`${fixedAmountBase(pariwarId)}/emergency`, PoolFixedAmountEmergencyResponse, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// ── Reconciliation review-queue surface (Story 9.8) ───────────────────────────
// The trustee adjudication surface. The reads are cache-disabled (strong consistency);
// each action is step-up-gated server-side (a 403 auth.step_up_required drives the elevation loop).

const reconReviewBase = (pariwarId: string): string =>
  `/api/v1/p/${encodeURIComponent(pariwarId)}/admin/reconciliation-review`;

/** GET the deadline-ordered open-case queue. */
export function getReconciliationQueue(
  pariwarId: string,
  limit?: number,
): Promise<ReconciliationQueueResponse> {
  const q = limit !== undefined ? `?limit=${limit}` : '';
  return apiFetch(`${reconReviewBase(pariwarId)}/queue${q}`, ReconciliationQueueResponse);
}

/** GET one case's full review context (identity decrypted + screenshot URL minted server-side). */
export function getReconciliationCase(pariwarId: string, caseKey: string): Promise<ReconciliationCaseDetail> {
  return apiFetch(`${reconReviewBase(pariwarId)}/cases/${encodeURIComponent(caseKey)}`, ReconciliationCaseDetail);
}

/** POST confirm — the ONLY manual confirm path (names the reconciled deposit). Step-up-gated. */
export function reconciliationConfirm(
  pariwarId: string,
  caseKey: string,
  body: ReconciliationConfirmRequest,
): Promise<ReconciliationActionResponse> {
  return apiFetch(`${reconReviewBase(pariwarId)}/cases/${encodeURIComponent(caseKey)}/confirm`, ReconciliationActionResponse, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** POST reject — a reconciliation.* verdict; member stays red, case closes. Step-up-gated. */
export function reconciliationReject(
  pariwarId: string,
  caseKey: string,
  body: ReconciliationRejectRequest,
): Promise<ReconciliationActionResponse> {
  return apiFetch(`${reconReviewBase(pariwarId)}/cases/${encodeURIComponent(caseKey)}/reject`, ReconciliationActionResponse, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** POST facilitate-recovery — audited action only, NO outcome event; case stays OPEN. Step-up-gated. */
export function reconciliationRecover(
  pariwarId: string,
  caseKey: string,
  body: ReconciliationRecoverRequest,
): Promise<ReconciliationActionResponse> {
  return apiFetch(`${reconReviewBase(pariwarId)}/cases/${encodeURIComponent(caseKey)}/recover`, ReconciliationActionResponse, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** POST review-and-reverse — walk a confirmed contribution back to held. Step-up-gated. */
export function reconciliationReverse(
  pariwarId: string,
  caseKey: string,
  body: ReconciliationReverseRequest,
): Promise<ReconciliationActionResponse> {
  return apiFetch(`${reconReviewBase(pariwarId)}/cases/${encodeURIComponent(caseKey)}/reverse`, ReconciliationActionResponse, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// ── Helpdesk operator call-to-ticket surface (Story 10.3) ─────────────────────
// Tenant-scoped under /p/:pariwarId/helpdesk. The operator (SM-1 C3 path) files a helpdesk ticket on
// a caller's behalf via the EXISTING 10.1 create route, now gated server-side by [adminSession, scope,
// requirePermissionHook(helpdesk.create @ dimension:'pariwar')]. Unlike the 6.3 claim intake this is
// NOT step-up-gated (helpdesk create is not freeze-firing / not in AR-24). The category picker reads
// the in-force routing policy so the UI is registry-driven (never hardcodes the v1 category set).

const helpdeskBase = (pariwarId: string): string =>
  `/api/v1/p/${encodeURIComponent(pariwarId)}/helpdesk`;

/** POST the operator call-to-ticket create → the routed ticket (201). `created_via: 'helpline_call'`
 *  is forced by the TYPE (not just the caller's convention); `operator_attribution` is server-resolved
 *  (never sent). */
export function createHelplineTicket(
  pariwarId: string,
  body: Omit<CreateTicketRequest, 'created_via'> & { created_via: 'helpline_call' },
): Promise<HelpdeskTicket> {
  return apiFetch(`${helpdeskBase(pariwarId)}/tickets`, CreateTicketResponse, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** GET the in-force routing-policy category set for the operator picker (registry-driven, AC5). */
export function getHelpdeskCategories(pariwarId: string): Promise<HelpdeskCategoryList> {
  return apiFetch(`${helpdeskBase(pariwarId)}/categories`, HelpdeskCategoryListResponse);
}

// ── Helpdesk responder console (Story 10.4) — the queue + detail + transitions ─────────────────────
// Gated server-side by [adminSession, scope, requirePermissionHook(helpdesk.respond @ pariwar)].

/** The responder queue filters (all optional). */
export interface HelpdeskQueueFilters {
  state?: string;
  routedToRole?: string;
  limit?: number;
  offset?: number;
}

/** GET the paginated responder queue (scope-respecting; derived SLA + severity). */
export function getHelpdeskQueue(pariwarId: string, filters: HelpdeskQueueFilters = {}): Promise<HelpdeskQueue> {
  const q = new URLSearchParams();
  if (filters.state) q.set('state', filters.state);
  if (filters.routedToRole) q.set('routed_to_role', filters.routedToRole);
  if (filters.limit !== undefined) q.set('limit', String(filters.limit));
  if (filters.offset !== undefined) q.set('offset', String(filters.offset));
  const qs = q.toString();
  return apiFetch(`${helpdeskBase(pariwarId)}/queue${qs ? `?${qs}` : ''}`, HelpdeskQueueResponse);
}

/** GET one ticket's admin detail (full row + thread + SLA/severity + cross-links). */
export function getHelpdeskTicket(pariwarId: string, ticketId: string): Promise<HelpdeskAdminTicketDetail> {
  return apiFetch(`${helpdeskBase(pariwarId)}/tickets/${encodeURIComponent(ticketId)}`, HelpdeskAdminTicketDetailResponse);
}

/** POST pick-up (open/reopened → in_progress). */
export function pickUpHelpdeskTicket(pariwarId: string, ticketId: string): Promise<HelpdeskAdminTicketDetail> {
  return apiFetch(`${helpdeskBase(pariwarId)}/tickets/${encodeURIComponent(ticketId)}/pick-up`, HelpdeskAdminTicketDetailResponse, {
    method: 'POST',
  });
}

/** POST a staff reply asking the member for info (→ awaiting_member; notifies the member). */
export function replyHelpdeskTicket(pariwarId: string, ticketId: string, message: string): Promise<HelpdeskAdminTicketDetail> {
  return apiFetch(`${helpdeskBase(pariwarId)}/tickets/${encodeURIComponent(ticketId)}/reply`, HelpdeskAdminTicketDetailResponse, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

/** POST a closing reply (→ resolved; notifies the member). */
export function resolveHelpdeskTicket(pariwarId: string, ticketId: string, message: string): Promise<HelpdeskAdminTicketDetail> {
  return apiFetch(`${helpdeskBase(pariwarId)}/tickets/${encodeURIComponent(ticketId)}/resolve`, HelpdeskAdminTicketDetailResponse, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}
