// @twt/api-client — member-auth SDK (Story 3.2, Task 10).
//
// A thin, hand-written fetch layer for the MEMBER (mobile) auth surface, typed +
// response-validated against the SAME `@twt/contracts` Zod schemas the server
// validates against (single source of transport types — no shadow types, arch
// Naming L3719-3723). Mirrors the admin `apps/admin/src/api/client.ts` ApiError /
// apiFetch convention, but TOKEN-BEARER (Authorization header) rather than cookie:
// the caller injects `getAccessToken` (the mobile app reads it from expo-secure-store).
// The full OpenAPI→client codegen stays deferred (DD-7).

import {
  HelpdeskAttachmentUrlResponse,
  HelpdeskCategoryListResponse,
  MemberTicketDetailResponse,
  MemberTicketListResponse,
  KycInitiateResponse,
  KycProfileSummaryResponse,
  ImaListResponse,
  KycStatusResponse,
  LifeEventsSummaryResponse,
  MemberValidityResponse,
  MedicalDisclosureStatusResponse,
  MemberFullSession,
  MemberLockInStatusResponse,
  ActiveContributionCardResponse,
  PoolContributorListResponse,
  NomineeConsoleResponse,
  BankStatementUploadResponse,
  SelfVerifyStateResponse,
  SelfVerifyScreenshotUploadResponse,
  ContributionIntentResponse,
  ContributionAttestResponse,
  NomineeAccountsResponse,
  ContributionFailureReportRequest,
  MemberOtpRequestResponse,
  MemberOtpVerifyResponse,
  MemberStepUpRequestResponse,
  MemberStepUpVerifyResponse,
  MemberTermsResponse,
  MemberTermsAcceptResponse,
  NomineeStatusResponse,
  VyawasthaShulkConfirmResponse,
  VyawasthaShulkIntentResponse,
  VyawasthaShulkRenewalConfirmResponse,
  VyawasthaShulkRenewalStatusResponse,
  VyawasthaShulkStatusResponse,
  WithdrawalStatusResponse,
  DataExportRequestResponse,
  DataExportStatusResponse,
  RtbfStatusResponse,
  CreateWaOptInResponse,
  WaOptInStatusResponse,
  RevokeWaOptInResponse,
  TelegramOptInRequestResponse,
  TelegramOptInStatusResponse,
  RevokeTelegramOptInResponse,
  PoolOnboardingOutcomeRequest,
  type PoolOnboardingOutcomeSchema as PoolOnboardingOutcome,
  type CreateWaOptInResponse as CreateWaOptInResult,
  type WaOptInStatusResponse as WaOptInStatusResult,
  type RevokeWaOptInResponse as RevokeWaOptInResult,
  type TelegramOptInRequestResponse as TelegramOptInRequestResult,
  type TelegramOptInStatusResponse as TelegramOptInStatusResult,
  type RevokeTelegramOptInResponse as RevokeTelegramOptInResult,
  type ImaListResponse as ImaListResult,
  type KycInitiateResponse as KycInitiateResult,
  type KycManualSubmitRequest,
  type KycProfileSummaryResponse as KycProfileSummaryResult,
  type KycStatusResponse as KycStatusResult,
  type AddressUpdateRequest,
  type LifeEventsSummaryResult,
  type MemberValidityResponse as MemberValidityResult,
  type PostingUpdateRequest,
  type MedicalDiscloseRequest,
  type MedicalDisclosureStatusResponse as MedicalStatusResult,
  type MemberLockInStatusResponse as MemberLockInStatusResult,
  type ActiveContributionCardResponse as ActiveContributionCardResult,
  type PoolContributorListResponse as PoolContributorListResult,
  type NomineeConsoleResponse as NomineeConsoleResult,
  type BankStatementUploadResponse as BankStatementUploadResult,
  type SelfVerifyStateResponse as SelfVerifyStateResult,
  type SelfVerifyScreenshotUploadResponse as SelfVerifyScreenshotUploadResult,
  ContributionHistoryResponse,
  type ContributionHistoryResponse as ContributionHistoryResult,
  type ContributionIntentRequest,
  type ContributionIntentResponse as ContributionIntentResult,
  type ContributionAttestRequest,
  type ContributionAttestResponse as ContributionAttestResult,
  type NomineeAccountsResponse as NomineeAccountsResult,
  type UpiFailureModeSchema as UpiFailureMode,
  type MemberSignupCreateRequest,
  type MemberTermsResponse as MemberTermsResult,
  type MemberTermsAcceptRequest,
  type MemberTermsAcceptResponse as MemberTermsAcceptResult,
  type MemberTermsLocale,
  type NomineeDeclareRequest,
  type NomineeStatusResponse as NomineeStatusResult,
  type VyawasthaShulkConfirmRequest,
  type VyawasthaShulkConfirmResponse as VyawasthaShulkConfirmResult,
  type VyawasthaShulkIntentResponse as VyawasthaShulkIntentResult,
  type VyawasthaShulkRenewalConfirmResponse as VyawasthaShulkRenewalConfirmResult,
  type VyawasthaShulkRenewalStatusResponse as VyawasthaShulkRenewalStatusResult,
  type VyawasthaShulkStatusResponse as VyawasthaShulkStatusResult,
  type MemberFullSession as FullSession,
  type MemberOtpRequestResponse as OtpRequestResult,
  type MemberOtpVerifyRequest,
  type MemberOtpVerifyResponse as OtpVerifyResult,
  type MemberStepUpRequestResponse as StepUpRequestResult,
  type MemberStepUpVerifyResponse as StepUpVerifyResult,
  type WithdrawalConfirmRequest,
  type WithdrawalStatusResponse as WithdrawalStatusResult,
  type DataExportRequestResponse as DataExportRequestResult,
  type DataExportStatusResponse as DataExportStatusResult,
  type RtbfConfirmRequest,
  type RtbfStatusResponse as RtbfStatusResult,
  HandoverOtpResponse,
  HandoverOtpVerifyResponse,
  ClaimIntakeInitiateResponse,
  ClaimDocumentUploadResponse,
  type HandoverOtpResponse as HandoverOtpResult,
  type HandoverOtpVerifyResponse as HandoverOtpVerifyResult,
  type ClaimIntakeInitiateRequest,
  type ClaimIntakeInitiateResponse as ClaimIntakeInitiateResult,
  type ClaimDocumentUploadResponse as ClaimDocumentUploadResult,
  IfscLookupResponse,
  RecordNomineeBankResponse,
  NomineeBankStatusResponse,
  type IfscLookupResponse as IfscLookupResult,
  type RecordNomineeBankRequest,
  type RecordNomineeBankResponse as RecordNomineeBankResult,
  type NomineeBankStatusResponse as NomineeBankStatusResult,
  RecordDpdpaConsentResponse,
  DpdpaConsentStatusResponse,
  RevokeDpdpaConsentResponse,
  type RecordDpdpaConsentRequest,
  type RevokeDpdpaConsentRequest,
  type RecordDpdpaConsentResponse as RecordDpdpaConsentResult,
  type DpdpaConsentStatusResponse as DpdpaConsentStatusResult,
  type RevokeDpdpaConsentResponse as RevokeDpdpaConsentResult,
  MemberShepherdResponse,
  type MemberShepherdResponse as MemberShepherdResult,
  type OcrDocumentType,
} from '@twt/contracts';
import type { z } from 'zod';

/** A typed transport error — carries the HTTP status + the server's error code. */
export class ApiError extends Error {
  public constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    /**
     * The server's structured `error.details` (Story 3.10) — e.g. the `auth.rejoin_locked` 403 carries
     * `{ withdrawn_at, rejoin_permitted_at }` so the mobile rejoin-block screen can render the dignified
     * date copy. `unknown` (the caller narrows); undefined when the response carried none.
     */
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
  public get isUnauthorized(): boolean {
    return this.status === 401;
  }
}

interface ErrorEnvelope {
  error?: { code?: string; message?: string; details?: unknown };
}

export interface MemberAuthClientOptions {
  /** API origin, e.g. `https://api.twt.app` (no trailing slash). */
  baseUrl: string;
  /** Supplies the current access token for authenticated calls (step-up, logout). */
  getAccessToken?: () => string | null | Promise<string | null>;
  /** Override fetch (tests / non-browser runtimes). Defaults to the global `fetch`. */
  fetchImpl?: typeof fetch;
}

const MEMBER_BASE = '/api/v1/member/auth';
const KYC_BASE = '/api/v1/member/kyc';
const NOMINEE_BASE = '/api/v1/member/nominees';
const MEDICAL_BASE = '/api/v1/member/medical-disclosure';
const TERMS_BASE = '/api/v1/member/terms';
const VYAWASTHA_SHULK_BASE = '/api/v1/member/vyawastha-shulk';
const MEMBER_HOME_BASE = '/api/v1/member';
const CONTRIBUTION_BASE = '/api/v1/member/contribution';
const LIFE_EVENTS_BASE = '/api/v1/member/life-events';
const WITHDRAWAL_BASE = '/api/v1/member/withdrawal';
const DATA_EXPORT_BASE = '/api/v1/member/data-export';
const WA_OPT_IN_BASE = '/api/v1/member/wa-opt-in';
const TELEGRAM_OPT_IN_BASE = '/api/v1/member/telegram-opt-in';
const POOL_ONBOARDING_BASE = '/api/v1/member/pool-onboarding-tutorial';
const RTBF_BASE = '/api/v1/member/rtbf';
const CLAIMS_BASE = '/api/v1/member/claims';

/**
 * The shared fetch/error-envelope/response-validation machinery, factored out so a focused
 * client (e.g. `createMemberClaimClient`) can reuse it WITHOUT instantiating the full
 * `createMemberAuthClient` surface (kyc/nominee/medical/terms/data-export/…) just to reach
 * a handful of methods.
 */
function createApiCallers(opts: MemberAuthClientOptions) {
  const doFetch = opts.fetchImpl ?? globalThis.fetch;
  const base = opts.baseUrl.replace(/\/$/, '');

  async function call<T>(
    path: string,
    schema: z.ZodType<T, z.ZodTypeDef, unknown>,
    body: unknown,
    auth = false,
    method: 'GET' | 'POST' | 'DELETE' = 'POST',
    bearerOverride?: string,
  ): Promise<T> {
    const headers: Record<string, string> = {};
    if (method !== 'GET') headers['content-type'] = 'application/json';
    // An explicit bearer (e.g. the one-shot signup_continuation token) wins over the
    // stored access token — signup-create runs BEFORE a member session exists.
    if (bearerOverride) {
      headers['authorization'] = `Bearer ${bearerOverride}`;
    } else if (auth && opts.getAccessToken) {
      const token = await opts.getAccessToken();
      if (token) headers['authorization'] = `Bearer ${token}`;
    }
    const res = await doFetch(`${base}${path}`, {
      method,
      headers,
      ...(method === 'GET' ? {} : { body: JSON.stringify(body ?? {}) }),
    });
    if (!res.ok) {
      let code = `http.${res.status}`;
      let message = res.statusText || 'Request failed';
      let details: unknown;
      try {
        const env = (await res.json()) as ErrorEnvelope;
        if (env.error?.code) code = env.error.code;
        if (env.error?.message) message = env.error.message;
        if (env.error?.details !== undefined) details = env.error.details;
      } catch {
        // Non-JSON body — keep the status-derived defaults.
      }
      throw new ApiError(res.status, code, message, details);
    }
    if (res.status === 204) return undefined as T;
    return schema.parse(await res.json());
  }

  /**
   * Binary variant of `call` for the data-export ZIP download (Story 3.11) — the response body is an
   * `application/zip` stream, NOT JSON, so it must NOT be `.json()`-parsed. Preserves the SAME
   * error-envelope handling (an error response IS JSON), so a missing step-up elevation still surfaces
   * as `ApiError` with `error.code === 'auth.step_up_required'` (the client keys on the CODE, not the
   * bare 403 — the 3.9/3.10 step-up lesson). Returns the raw `ArrayBuffer`.
   */
  async function callBinary(path: string): Promise<ArrayBuffer> {
    const headers: Record<string, string> = {};
    if (opts.getAccessToken) {
      const token = await opts.getAccessToken();
      if (token) headers['authorization'] = `Bearer ${token}`;
    }
    const res = await doFetch(`${base}${path}`, { method: 'GET', headers });
    if (!res.ok) {
      let code = `http.${res.status}`;
      let message = res.statusText || 'Request failed';
      let details: unknown;
      try {
        const env = (await res.json()) as ErrorEnvelope;
        if (env.error?.code) code = env.error.code;
        if (env.error?.message) message = env.error.message;
        if (env.error?.details !== undefined) details = env.error.details;
      } catch {
        // Non-JSON error body — keep the status-derived defaults.
      }
      throw new ApiError(res.status, code, message, details);
    }
    return res.arrayBuffer();
  }

  /**
   * Multipart variant of `call` (Story 6.5) — POSTs a `FormData` body (a file upload). Does NOT set
   * `content-type` (the fetch impl derives the multipart boundary from the FormData). Same
   * auth-bearer + error-envelope handling as `call`, so a 409/415/413 surfaces as an `ApiError` the
   * caller keys on by `error.code`. Parses a JSON response against `schema`. `extraHeaders` (Story
   * 10.2 review-hardening) merges additional request headers — e.g. `x-turnstile-token` /
   * `idempotency-key`, sent as headers rather than form fields so the server can gate on them
   * before it ever parses the multipart body.
   */
  async function callMultipart<T>(
    path: string,
    schema: z.ZodType<T, z.ZodTypeDef, unknown>,
    form: FormData,
    extraHeaders?: Record<string, string>,
  ): Promise<T> {
    const headers: Record<string, string> = { ...extraHeaders };
    if (opts.getAccessToken) {
      const token = await opts.getAccessToken();
      if (token) headers['authorization'] = `Bearer ${token}`;
    }
    const res = await doFetch(`${base}${path}`, { method: 'POST', headers, body: form });
    if (!res.ok) {
      let code = `http.${res.status}`;
      let message = res.statusText || 'Request failed';
      let details: unknown;
      try {
        const env = (await res.json()) as ErrorEnvelope;
        if (env.error?.code) code = env.error.code;
        if (env.error?.message) message = env.error.message;
        if (env.error?.details !== undefined) details = env.error.details;
      } catch {
        // Non-JSON error body — keep the status-derived defaults.
      }
      throw new ApiError(res.status, code, message, details);
    }
    return schema.parse(await res.json());
  }

  return { call, callBinary, callMultipart };
}

export function createMemberAuthClient(opts: MemberAuthClientOptions) {
  const { call, callBinary, callMultipart } = createApiCallers(opts);

  return {
    /** Request a login OTP for a mobile (enumeration-safe — always resolves). */
    requestOtp(mobile: string): Promise<OtpRequestResult> {
      return call(`${MEMBER_BASE}/otp/request`, MemberOtpRequestResponse, { mobile });
    },

    /** Verify the OTP → full session / pariwar-select / signup-continuation. */
    verifyOtp(args: MemberOtpVerifyRequest): Promise<OtpVerifyResult> {
      return call(`${MEMBER_BASE}/otp/verify`, MemberOtpVerifyResponse, args);
    },

    /** Pick a Pariwar scope (multi-membership) → full session. */
    selectPariwar(selectToken: string, pariwarId: string): Promise<FullSession> {
      return call(`${MEMBER_BASE}/otp/select-pariwar`, MemberFullSession, { selectToken, pariwarId });
    },

    /** Rotate the refresh token → a fresh full session. */
    refresh(refreshToken: string): Promise<FullSession> {
      return call(`${MEMBER_BASE}/token/refresh`, MemberFullSession, { refreshToken });
    },

    /** Revoke the current device's session (requires an access token). */
    async logout(): Promise<void> {
      await call(`${MEMBER_BASE}/logout`, MemberFullSession.optional(), {}, true);
    },

    /** Request a step-up OTP for a gated action (requires an access token). */
    stepUpRequest(actionContext: string): Promise<StepUpRequestResult> {
      return call(`${MEMBER_BASE}/step-up/request`, MemberStepUpRequestResponse, { actionContext }, true);
    },

    /** Verify a step-up OTP → elevate for its action_context (requires an access token). */
    stepUpVerify(otp: string): Promise<StepUpVerifyResult> {
      return call(`${MEMBER_BASE}/step-up/verify`, MemberStepUpVerifyResponse, { otp }, true);
    },

    // ── Signup KYC step (Story 3.3b) ────────────────────────────────────────────
    /** Begin a DigiLocker KYC pull → the authorization redirect (requires an access token). */
    kycInitiate(): Promise<KycInitiateResult> {
      return call(`${KYC_BASE}/initiate`, KycInitiateResponse, {}, true);
    },

    /** Confirm the verified DigiLocker profile → emits member.kyc_completed (auth). */
    kycConfirm(transactionId: string): Promise<KycStatusResult> {
      return call(`${KYC_BASE}/confirm`, KycStatusResponse, { transactionId }, true);
    },

    /** Submit the manual fallback (name/dob/optional photo) → member.kyc_manual_fallback (auth). */
    kycManualSubmit(input: KycManualSubmitRequest): Promise<KycStatusResult> {
      return call(`${KYC_BASE}/manual`, KycStatusResponse, input, true);
    },

    /** Poll the KYC step status (transaction + member KYC standing + manual-enabled seam) (auth). */
    kycStatus(): Promise<KycStatusResult> {
      return call(`${KYC_BASE}/status`, KycStatusResponse, undefined, true, 'GET');
    },

    /** Fetch the stored KYC profile for the confirm screen (decrypted name/dob; auth). */
    kycProfileSummary(): Promise<KycProfileSummaryResult> {
      return call(`${KYC_BASE}/profile-summary`, KycProfileSummaryResponse, undefined, true, 'GET');
    },

    /**
     * Declare 1–2 nominees (Story 3.4). The 75/25 split is server-derived from the count —
     * the client sends only name/relationship/mobile/optional-address (no percentage). Emits
     * member.nominees_declared. Returns the current NON-PII declaration summary (auth).
     */
    nomineesDeclare(input: NomineeDeclareRequest): Promise<NomineeStatusResult> {
      return call(NOMINEE_BASE, NomineeStatusResponse, input, true);
    },

    /** Read the current effective nominee declaration (NON-PII summaries; auth). */
    nomineesStatus(): Promise<NomineeStatusResult> {
      return call(NOMINEE_BASE, NomineeStatusResponse, undefined, true, 'GET');
    },

    /**
     * Submit a medical disclosure (Story 3.5). Sends the selected IMA condition codes (0..N — zero
     * is valid), the optional free-text additional context, the rendered imaListVersion, and the
     * MANDATORY concealment-denial ack. Records a consent + emits member.medical_disclosed.
     * Returns the NON-PII status (latest summary + history count; auth).
     */
    medicalDisclose(input: MedicalDiscloseRequest): Promise<MedicalStatusResult> {
      return call(MEDICAL_BASE, MedicalDisclosureStatusResponse, input, true);
    },

    /** Read the member's latest medical disclosure status (NON-PII summary + history count; auth). */
    medicalStatus(): Promise<MedicalStatusResult> {
      return call(MEDICAL_BASE, MedicalDisclosureStatusResponse, undefined, true, 'GET');
    },

    /** Read the IMA catalog + concealment-ack copy the screen renders (auth). 503 if unprovisioned. */
    medicalImaList(): Promise<ImaListResult> {
      return call(`${MEDICAL_BASE}/ima-list`, ImaListResponse, undefined, true, 'GET');
    },

    // ── First-signup member creation (Story 3.6a) ───────────────────────────────
    /**
     * Create the member from a first-signup `signup_continuation` token (Story 3.6a). The token is
     * sent as the Authorization bearer (NOT a member session — none exists yet); the body re-sends
     * the `mobile` (the server binds it to the token's blind index) + the device. Emits
     * member.signup_initiated → pending-kyc and returns a FULL session the wizard proceeds with.
     */
    signupCreate(continuationToken: string, input: MemberSignupCreateRequest): Promise<FullSession> {
      return call(`${MEMBER_BASE}/signup/create`, MemberFullSession, input, false, 'POST', continuationToken);
    },

    // ── Member-facing Terms & Conditions (Story 3.6a) ───────────────────────────
    /** Fetch the current effective T&C for the member's Pariwar (auth). 503 if unprovisioned. */
    memberTerms(locale: MemberTermsLocale): Promise<MemberTermsResult> {
      return call(`${TERMS_BASE}?locale=${locale}`, MemberTermsResponse, undefined, true, 'GET');
    },

    /** Accept the current effective T&C → records a tc_acceptance consent (auth). */
    memberTermsAccept(input: MemberTermsAcceptRequest): Promise<MemberTermsAcceptResult> {
      return call(`${TERMS_BASE}/accept`, MemberTermsAcceptResponse, input, true);
    },

    // ── Signup ₹110 Vyawastha Shulk (Story 3.6b) ────────────────────────────────
    /**
     * Build the server-constructed UPI Intent for the ₹110 signup fee (Story 3.6b). The VPA + amount
     * are resolved server-side (never client-named); returns the upi:// URL to hand off to the OS UPI
     * app + the `tr` idempotency nonce for the confirm step (auth). 503 if the trust VPA is unconfigured.
     */
    vyawasthaShulkIntent(): Promise<VyawasthaShulkIntentResult> {
      return call(`${VYAWASTHA_SHULK_BASE}/intent`, VyawasthaShulkIntentResponse, undefined, true);
    },

    /**
     * Self-attest the UTR after returning from the UPI app (Story 3.6b). ALWAYS persists the AR-67
     * receipt; emits member.vyawastha_shulk_paid + member.lock_in_entered ONLY when the 5-condition
     * lock-in gate passes (else `outstanding` names the incomplete steps). Optionally captures the
     * 6-digit Reference Code (D2 port seam). Idempotent on `tr` (auth).
     */
    vyawasthaShulkConfirm(input: VyawasthaShulkConfirmRequest): Promise<VyawasthaShulkConfirmResult> {
      return call(`${VYAWASTHA_SHULK_BASE}/confirm`, VyawasthaShulkConfirmResponse, input, true);
    },

    /** Read the member's signup-fee paid / lock-in status (auth). */
    vyawasthaShulkStatus(): Promise<VyawasthaShulkStatusResult> {
      return call(`${VYAWASTHA_SHULK_BASE}/status`, VyawasthaShulkStatusResponse, undefined, true, 'GET');
    },

    // ── Annual renewal (Story 3.8) ──────────────────────────────────────────────
    /**
     * Read the member's canonical renewal status — the FR-12A `vyawastha_shulk_status` payload
     * (`paid_through`, `days_until_lapse`, `in_renewal_grace`, `grace_remaining_days`). Computed live
     * server-side (≤60s fresh). Backs the home-screen renewal widget; self-suppresses when not paid (auth).
     */
    vyawasthaShulkRenewalStatus(): Promise<VyawasthaShulkRenewalStatusResult> {
      return call(
        `${VYAWASTHA_SHULK_BASE}/renewal-status`,
        VyawasthaShulkRenewalStatusResponse,
        undefined,
        true,
        'GET',
      );
    },

    /**
     * Build the server-constructed UPI Intent for the annual renewal fee (Story 3.8) — mirrors the
     * signup intent (server-authoritative VPA + amount) with the renewal `tn` grammar. 503 if the trust
     * VPA is unconfigured (auth).
     */
    vyawasthaShulkRenewIntent(): Promise<VyawasthaShulkIntentResult> {
      return call(`${VYAWASTHA_SHULK_BASE}/renew/intent`, VyawasthaShulkIntentResponse, undefined, true);
    },

    /**
     * Self-attest the UTR after returning from the UPI app to complete a renewal (Story 3.8). Persists a
     * renewal receipt + emits member.vyawastha_shulk_paid (kind: renewal) — NO lock-in gate, NO re-lock-in.
     * Idempotent on `tr` (`renewed` is false on a re-confirm). 409 if the member is not renewable (auth).
     */
    vyawasthaShulkRenewConfirm(
      input: VyawasthaShulkConfirmRequest,
    ): Promise<VyawasthaShulkRenewalConfirmResult> {
      return call(
        `${VYAWASTHA_SHULK_BASE}/renew/confirm`,
        VyawasthaShulkRenewalConfirmResponse,
        input,
        true,
      );
    },

    // ── Home-screen lock-in clock widget (Story 3.7) ────────────────────────────
    /**
     * Read the member's lock-in clock for the topmost home-screen widget (Story 3.7). Returns the
     * current lifecycle `state` always, plus the `lockIn` clock figures (countdown + clause ref +
     * unlock date) when `state === 'lock-in'` (else `lockIn` is null and the widget self-suppresses).
     * Server-authoritative (`daysRemaining` / `unlockDate` computed server-side) (auth).
     */
    memberLockInStatus(): Promise<MemberLockInStatusResult> {
      return call(`${MEMBER_HOME_BASE}/lock-in-status`, MemberLockInStatusResponse, undefined, true, 'GET');
    },

    // ── My Pool card (Story 8.2 — the first Epic-8 SURFACE) ──────────────────────
    /**
     * Read the server-authoritative My Pool home-card model — the topmost `<ActiveContributionCard>`.
     * Returns the fully-resolved card (pool shortform + deceased-member family + snapshotted amount +
     * days-remaining + confirmed-only progress + optional upcoming-amount line) ONLY for an `active`
     * member assigned to a pool whose cycle alert is `live`; `{ assigned: false }` for every other case
     * (the widget self-suppresses). Server-authoritative — the client resolves nothing (auth).
     */
    memberActiveContribution(): Promise<ActiveContributionCardResult> {
      return call(
        `${MEMBER_HOME_BASE}/active-contribution`,
        ActiveContributionCardResponse,
        undefined,
        true,
        'GET',
      );
    },

    // ── Live Contributor List (Story 8.3 — the confirmed-contributor rows + aggregate pending) ─────────
    /**
     * Read the server-authoritative Live Contributor List — the `<PoolContributorList>` view the My Pool
     * card links to. Returns the pool identity + the RECONCILIATION-CONFIRMED contributor rows (first-name
     * + last-initial, PII-shielded; legitimately empty until Epic 9's producer lands) + the AGGREGATE
     * pending signal (count + percentage, NO member identity — D3) ONLY for an `active` member assigned to
     * a pool whose cycle alert is `live`; `{ assigned: false }` for every other case (the view
     * self-suppresses). Server-authoritative — the client resolves nothing about confirmation status (auth).
     */
    memberPoolContributors(): Promise<PoolContributorListResult> {
      return call(
        `${MEMBER_HOME_BASE}/pool-contributors`,
        PoolContributorListResponse,
        undefined,
        true,
        'GET',
      );
    },

    // ── Nominee Console (Story 9.1 — the FIRST Epic-9 surface: the gate + pool identity + takeover verdict) ─
    /**
     * Read the server-authoritative Nominee Console model — Sunita's `<NomineeConsole>` surface. Returns the
     * fully-resolved console (pool identity + the staff-takeover-by-day-N verdict + poolOpen/lastUpdated
     * timestamps) ONLY for a validated nominee with an ACTIVE (`live`) pool; `{ isNominee: false }` for every
     * other case (the console self-suppresses to null). Server-authoritative — the client resolves nothing
     * about nominee-hood or takeover eligibility. The confirmed-contributor rows are read SEPARATELY via
     * `memberPoolContributors` (the composed 8.3 surface), never duplicated here (auth).
     */
    memberNomineeConsole(): Promise<NomineeConsoleResult> {
      return call(
        `${MEMBER_HOME_BASE}/nominee-console`,
        NomineeConsoleResponse,
        undefined,
        true,
        'GET',
      );
    },

    /**
     * Upload a bank statement for reconciliation (Story 9.3; session + `claim_handover` step-up). The
     * nominee's Ravi-mode session resolves the pool server-side. The caller builds the `FormData` with the
     * picked file (RN: `{ uri, name, type }` appended as `file`); `bankCode` rides the querystring. Returns
     * the discriminated `{ outcome: 'parsed', summary }` (an allowlisted-bank CSV normalized inline) OR
     * `{ outcome: 'fallback', fallback }` (a PDF/image/unparseable file routed to "Hum aapke liye padh
     * lenge" — the human path is engaged, NOT an error). A 413/400/503 surfaces as `ApiError` (key on
     * `error.code` for Pattern-4 copy). No OCR path in v1 (Decision D1).
     */
    memberUploadBankStatement(
      form: FormData,
      bankCode: 'sbi' | 'pnb' | 'bob' | 'boi' | 'cooperative',
    ): Promise<BankStatementUploadResult> {
      const qs = `?bank_code=${encodeURIComponent(bankCode)}`;
      return callMultipart(
        `${MEMBER_HOME_BASE}/reconciliation/statements${qs}`,
        BankStatementUploadResponse,
        form,
      );
    },

    // ── Self-verify recovery (Story 9.7 — the FR-32 screenshot upload + the <SelfVerifySurface> read) ────
    /**
     * Read the member's OWN self-verify recovery state for a pool (Story 9.7). Returns `{ mismatch, reason,
     * screenshotUploaded, status }` (default / uploaded / resolved) — the state the `<SelfVerifySurface>`
     * renders. Member-scoped (FR-12A). Fail-soft to the neutral default server-side (never a 500). The 5th
     * `'GET'` arg is REQUIRED (`call` defaults to POST) (auth).
     */
    memberSelfVerifyState(poolId: string): Promise<SelfVerifyStateResult> {
      return call(
        `${MEMBER_HOME_BASE}/self-verify/${encodeURIComponent(poolId)}`,
        SelfVerifyStateResponse,
        undefined,
        true,
        'GET',
      );
    },
    /**
     * Upload a self-verify payment screenshot (Story 9.7; FR-32 — the ONE budgeted friction surface).
     * Accepted ONLY for a pool where the member has an unresolved mismatch, OR the explicit "Trouble with
     * UTR?" fallback (`fallback: true`). The caller builds the `FormData` with the picked file (RN:
     * `{ uri, name, type }` appended as `file`); `poolId` (+ optional `fallback`) ride the querystring.
     * Returns `{ status: 'uploaded' }` on success (PURE EVIDENCE INTAKE — a screenshot NEVER confirms/remaps,
     * AC4). A 413/400/503 surfaces as `ApiError` (key on `error.code` for Pattern-4 copy) (auth).
     */
    memberUploadSelfVerifyScreenshot(
      form: FormData,
      poolId: string,
      opts: { fallback?: boolean } = {},
    ): Promise<SelfVerifyScreenshotUploadResult> {
      const qs = `?pool_id=${encodeURIComponent(poolId)}${opts.fallback ? '&fallback=true' : ''}`;
      return callMultipart(
        `${MEMBER_HOME_BASE}/self-verify/screenshot${qs}`,
        SelfVerifyScreenshotUploadResponse,
        form,
      );
    },

    // ── Yogdaan Bahi contribution history (Story 8.6 — the member's OWN contribution passbook) ───────────
    /**
     * Read the server-authoritative Yogdaan Bahi — the member's OWN contribution history (FR-12A
     * self-view). Returns `{ rows, totalInr }`: one row per the member's attested contribution (date,
     * deceased-family first-name + last-initial, pool letter/name, canonical id, cycle ref, snapshotted
     * amount, the honestly-derived four-state `status`, and the Contribution-Note availability flag),
     * newest-first; legitimately `{ rows: [], totalInr: 0 }` for a member who has attested nothing.
     * Member-scoped + PII-shielded — the client resolves nothing. The 5th `'GET'` arg is REQUIRED (`call`
     * defaults to POST, which would misfire against the `r.get(...)`-registered route) (auth).
     */
    memberContributionHistory(): Promise<ContributionHistoryResult> {
      return call(
        `${MEMBER_HOME_BASE}/contribution-history`,
        ContributionHistoryResponse,
        undefined,
        true,
        'GET',
      );
    },

    /**
     * Download the Yogdaan Pratigya (Contribution Note) PDF for ONE of the member's OWN contributions
     * (Story 8.7). Returns the raw `ArrayBuffer` — the body is `application/pdf` bytes, NOT JSON, so it
     * must not be `.json()`-parsed (the Story 3.11 data-export `callBinary` precedent; the caller writes
     * it to a cache file and hands it to the OS share sheet).
     *
     * Generated on demand, server-side, and persisted nowhere — the same contribution regenerates an
     * equivalent Note whenever it is opened. Hard-scoped to the caller's own contributions: another
     * member's `contributionId` throws `ApiError` with `error.code === 'contribution_note.not_found'`
     * (a 404), which is also what an unknown id gives — the two are deliberately indistinguishable.
     * Rate-limited per member (a PDF render is far more expensive than any other member read), so a
     * burst surfaces as `rate_limit.exceeded` (auth).
     */
    memberContributionNote(contributionId: string): Promise<ArrayBuffer> {
      return callBinary(`${MEMBER_HOME_BASE}/contribution-note/${encodeURIComponent(contributionId)}`);
    },

    // ── UPI Intent + UTR self-attestation (Story 8.4 — the FIRST Epic-8 WRITE) ──────────────────────────
    /**
     * Build the server-authoritative UPI Intent for a pool contribution (Story 8.4). Resolves the member's
     * assigned live pool → the nominee VPA (server-side) → the amount-locked `upi://pay` URL with the
     * DETERMINISTIC `tr`. Returns `{ available: true, upiUrl, tr, amountInr, vpa, account }` to hand off to
     * the OS UPI app — OR the first-class `{ available: false, reason }` fail-soft (no VPA collected yet /
     * unassigned; the calm "not available yet — Get help" path, D1). `account` optionally switches to
     * nominee #2 (FR-27). The client names NOTHING about the payment (R4) (auth).
     */
    memberContributionIntent(input?: ContributionIntentRequest): Promise<ContributionIntentResult> {
      return call(`${CONTRIBUTION_BASE}/intent`, ContributionIntentResponse, input ?? {}, true);
    },

    /**
     * Read the donor-facing nominee payment destinations for the member's assigned live pool (Story 9.9).
     * Returns `{ available: true, accounts, myContribution }` — up to two EQUAL bank accounts (bank-name
     * label + nominee name + full account#/IFSC + `vpaPresent`), stable order by `rank` (identity, NOT a
     * priority; the donor chooses) — OR the first-class `{ available: false, reason }` absence (unassigned /
     * accounts_not_collected). Member-scoped; the client resolves nothing. The 5th `'GET'` arg is REQUIRED
     * (`call` defaults to POST, which would misfire against the `r.get(...)`-registered route) (auth).
     */
    memberNomineeAccounts(): Promise<NomineeAccountsResult> {
      return call(`${CONTRIBUTION_BASE}/nominee-accounts`, NomineeAccountsResponse, undefined, true, 'GET');
    },

    /**
     * Self-attest the UTR after returning from the UPI app (Story 8.4) — records a member CLAIM (the yellow
     * pill), NOT a confirmed payment. The server recomputes `tr` from (memberId, alertId) and appends an
     * idempotent `contribution.utr-attested` event; a re-paste for the same (member, alert) records ONE
     * attestation (`idempotent: true`). Returns the member's OWN `myContribution: 'attested'` state — NO
     * aggregate/confirmed count. Never flips green (that is Epic 9's exclusive reconciliation) (auth).
     */
    memberContributionAttest(input: ContributionAttestRequest): Promise<ContributionAttestResult> {
      return call(`${CONTRIBUTION_BASE}/attest`, ContributionAttestResponse, input, true);
    },

    /**
     * Record the member's self-classified UPI failure mode for analytics tuning (Story 8.5 — the UPI Failure
     * Coach). Best-effort / FIRE-AND-FORGET: the call site does NOT await/block on it (the coach must never
     * be gated on telemetry). "Anonymous" is enforced by the contract — the request carries the `mode` enum
     * and NOTHING ELSE (no free-text, no UTR/tr/amount/VPA), and the server keys the audit action on the mode
     * alone. The route returns 204 (no body), so `call` short-circuits before the throwaway schema is ever
     * parsed (the `logout` / pool-onboarding idiom) (session; auth).
     */
    async reportUpiFailure(mode: UpiFailureMode): Promise<void> {
      await call(`${CONTRIBUTION_BASE}/failure`, ContributionFailureReportRequest.optional(), { mode }, true);
    },

    // ── Life Events panel (Story 3.9) ───────────────────────────────────────────
    // Self-service updates to the four life-change sub-types. The nominee + medical routes are
    // STEP-UP-gated server-side: a 403 with `error.code === 'auth.step_up_required'` drives the
    // caller through stepUpRequest('nominee_change'|'medical_change') → stepUpVerify → retry (the
    // caller keys on the error CODE, not the bare 403). Address + posting need NO step-up.
    /** Life Events nominee update — re-runs the declare service behind a step-up gate (auth). */
    lifeEventsUpdateNominees(input: NomineeDeclareRequest): Promise<NomineeStatusResult> {
      return call(`${LIFE_EVENTS_BASE}/nominees`, NomineeStatusResponse, input, true);
    },

    /** Life Events medical update — re-runs the submit service (append-only) behind a step-up gate (auth). */
    lifeEventsUpdateMedical(input: MedicalDiscloseRequest): Promise<MedicalStatusResult> {
      return call(`${LIFE_EVENTS_BASE}/medical`, MedicalDisclosureStatusResponse, input, true);
    },

    /** Life Events address update — append-only Tier-1 write; NO step-up. Returns the refreshed summary (auth). */
    lifeEventsUpdateAddress(input: AddressUpdateRequest): Promise<LifeEventsSummaryResult> {
      return call(`${LIFE_EVENTS_BASE}/address`, LifeEventsSummaryResponse, input, true);
    },

    /** Life Events posting / transfer update — append-only write; NO step-up. Returns the refreshed summary (auth). */
    lifeEventsUpdatePosting(input: PostingUpdateRequest): Promise<LifeEventsSummaryResult> {
      return call(`${LIFE_EVENTS_BASE}/posting`, LifeEventsSummaryResponse, input, true);
    },

    /** Read the Life Events panel summary (presence flags + counts across all four sub-types; auth). */
    lifeEventsSummary(): Promise<LifeEventsSummaryResult> {
      return call(LIFE_EVENTS_BASE, LifeEventsSummaryResponse, undefined, true, 'GET');
    },

    /**
     * Read the member's OWN FR-12A validity payload (Story 4.7; auth). The server returns the redacted
     * self-payload (State-Trustee-only fields stripped) and does NOT audit the self-call (PRD FR-12A).
     * Drives the member-facing `<MemberStatusPanel>` (Hindi-first, identity-suppressed).
     */
    memberValidity(): Promise<MemberValidityResult> {
      return call(`${MEMBER_HOME_BASE}/validity`, MemberValidityResponse, undefined, true, 'GET');
    },

    /**
     * Voluntary withdrawal confirm (Story 3.10) — step-up gated (context 'withdrawal'; auth). Emits
     * member.withdrawal_completed → `withdrawn`; returns the terminal state + the 12-month rejoin-lock
     * window. A missing/expired elevation surfaces as ApiError `auth.step_up_required` (drive the
     * step-up request/verify then retry the SAME call — the 3.9 useStepUpGate precedent). The signup
     * rejoin-lock 403 surfaces on the SEPARATE signupCreate path as ApiError `auth.rejoin_locked`
     * (keyed on `error.code`, with `error.details.{withdrawn_at,rejoin_permitted_at}` for the copy).
     */
    withdrawMember(input: WithdrawalConfirmRequest): Promise<WithdrawalStatusResult> {
      return call(WITHDRAWAL_BASE, WithdrawalStatusResponse, input, true);
    },

    // ── RTBF anonymization (Story 3.12) ───────────────────────────────────────
    /**
     * Confirm RTBF anonymization (FR-96) — step-up gated ('rtbf' context; the confirm requires a FRESH
     * elevation, RTBF being irreversible). Legal ONLY from `withdrawn` (Story 3.10): a not-yet-withdrawn
     * or already-anonymized member surfaces as ApiError `rtbf.already_anonymized` (409). Takes NO input (there
     * is no reason to collect). Returns the terminal `anonymized` state + the anonymization instant; NO
     * cleared PII is echoed (R1). A missing/expired elevation surfaces as ApiError `auth.step_up_required`
     * (drive the step-up request/verify then retry the SAME call — the 3.9/3.10 useStepUpGate precedent).
     */
    anonymizeMember(input: RtbfConfirmRequest = {}): Promise<RtbfStatusResult> {
      return call(RTBF_BASE, RtbfStatusResponse, input, true);
    },

    // ── DPDPA data export (Story 3.11) ────────────────────────────────────────
    // request (session) → poll status → step-up-gated one-time download. The download's
    // `auth.step_up_required` surfaces as a distinguishable ApiError `error.code` (the caller drives
    // stepUpRequest('data_export') → stepUpVerify → retry `downloadDataExport` — the 3.9/3.10 lesson).

    /** Request a data export (session; auth). Idempotent — returns an in-flight export if one exists. */
    requestDataExport(): Promise<DataExportRequestResult> {
      return call(DATA_EXPORT_BASE, DataExportRequestResponse, {}, true);
    },

    /** Poll a data-export's status (session only, NO step-up; auth). */
    getDataExportStatus(id: string): Promise<DataExportStatusResult> {
      return call(`${DATA_EXPORT_BASE}/${id}`, DataExportStatusResponse, undefined, true, 'GET');
    },

    /**
     * Download the export ZIP (Story 3.11) — the one-time, 24h, step-up-gated ('data_export' context)
     * binary stream. Returns the raw `ArrayBuffer` (NOT JSON-parsed — the caller writes it to a file /
     * hands it to the OS share sheet). A missing/expired elevation throws ApiError
     * `auth.step_up_required`; an already-consumed / expired export throws `data_export.consumed` /
     * `data_export.expired` (keyed on `error.code`).
     */
    downloadDataExport(id: string): Promise<ArrayBuffer> {
      return callBinary(`${DATA_EXPORT_BASE}/${id}/download`);
    },

    // ── WhatsApp opt-in (Story 5.4) ───────────────────────────────────────────
    // POST mints (or re-uses) a PENDING opt-in → Send-Hello deep-link + verification phrase; GET reads the
    // current state (drives the settings toggle + copy); DELETE revokes an ACTIVE opt-in (independently
    // revocable). The inbound-webhook worker advances PENDING → ACTIVE out-of-band.

    /** Mint (or re-use) a PENDING WhatsApp opt-in → deep-link + verification phrase (session; auth). */
    requestWaOptIn(): Promise<CreateWaOptInResult> {
      return call(WA_OPT_IN_BASE, CreateWaOptInResponse, {}, true);
    },

    /** Read the member's current WhatsApp opt-in status (session; auth). */
    getWaOptInStatus(): Promise<WaOptInStatusResult> {
      return call(WA_OPT_IN_BASE, WaOptInStatusResponse, undefined, true, 'GET');
    },

    /** Revoke the member's active WhatsApp opt-in (session; auth). */
    revokeWaOptIn(): Promise<RevokeWaOptInResult> {
      return call(WA_OPT_IN_BASE, RevokeWaOptInResponse, {}, true, 'DELETE');
    },

    // ── Telegram opt-in (Story 5.5) ───────────────────────────────────────────
    // POST mints (or re-uses) a PENDING opt-in → t.me `/start` deep-link; GET reads the current state
    // (drives the settings toggle + copy); POST …/revoke revokes an ACTIVE opt-in (independently revocable).
    // The tg-webhook-processor worker advances PENDING → ACTIVE out-of-band on the bot `/start`.

    /** Mint (or re-use) a PENDING Telegram opt-in → t.me `/start` deep-link (session; auth). */
    requestTelegramOptIn(): Promise<TelegramOptInRequestResult> {
      return call(TELEGRAM_OPT_IN_BASE, TelegramOptInRequestResponse, {}, true);
    },

    /** Read the member's current Telegram opt-in status (session; auth). */
    getTelegramOptInStatus(): Promise<TelegramOptInStatusResult> {
      return call(TELEGRAM_OPT_IN_BASE, TelegramOptInStatusResponse, undefined, true, 'GET');
    },

    /** Revoke the member's active Telegram opt-in (session; auth). */
    revokeTelegramOptIn(): Promise<RevokeTelegramOptInResult> {
      return call(`${TELEGRAM_OPT_IN_BASE}/revoke`, RevokeTelegramOptInResponse, {}, true);
    },

    // ── Pool-engine onboarding tutorial (Story 7.10) ──────────────────────────
    // Record the member-level completion/skip outcome for analytics (server-side audit line). The app
    // calls this FIRE-AND-FORGET — the MMKV flag is the authoritative first-entry suppressor, so a
    // failed POST must never block the tutorial's dismissal nor re-show it. The route returns 204 (no
    // body), so `call` short-circuits before the throwaway schema is ever parsed (the `logout` idiom).

    /** Record the pool-onboarding tutorial outcome (completed | skipped) — best-effort (session; auth). */
    async recordPoolOnboardingOutcome(outcome: PoolOnboardingOutcome): Promise<void> {
      await call(POOL_ONBOARDING_BASE, PoolOnboardingOutcomeRequest.optional(), { outcome }, true);
    },
  };
}

export type MemberAuthClient = ReturnType<typeof createMemberAuthClient>;

/**
 * The member-app claim-filing client (Story 6.2, Ravi-mode) — a focused, STANDALONE client
 * over the three claim endpoints, sharing only the `call` fetch/error/validation machinery
 * with `createMemberAuthClient` (via `createApiCallers`), not the full auth-client surface.
 * The mobile app wires one instance in `lib/claim-api.ts`.
 *
 * The FIRST live caller of the claim primitive. Send the handover-trust OTP to the nominee's
 * mobile, verify it (establishing the elevation the intake requires), then relationship-confirm
 * → intake (mints claim_case_id + freezes the deceased's account). A 403 on initiateIntake
 * carries `error.code === 'auth.step_up_required'` — the app routes back to the handover-OTP
 * step (the 3.9/3.10 step-up lesson: key on the CODE).
 */
export function createMemberClaimClient(opts: MemberAuthClientOptions) {
  const { call, callMultipart } = createApiCallers(opts);

  return {
    /** Send the handover-trust OTP to the deceased's nominee's mobile (session; auth). */
    requestHandoverOtp(): Promise<HandoverOtpResult> {
      return call(`${CLAIMS_BASE}/handover-otp`, HandoverOtpResponse, {}, true);
    },

    /** Verify the submitted handover-trust OTP → establish handover-trust (session; auth). */
    verifyHandoverOtp(code: string): Promise<HandoverOtpVerifyResult> {
      return call(`${CLAIMS_BASE}/handover-otp/verify`, HandoverOtpVerifyResponse, { code }, true);
    },

    /** Relationship-confirm → mint claim_case_id + emit claim.intake_initiated (session; auth). */
    initiateIntake(input: ClaimIntakeInitiateRequest): Promise<ClaimIntakeInitiateResult> {
      return call(`${CLAIMS_BASE}/intake`, ClaimIntakeInitiateResponse, input, true);
    },

    /**
     * Upload a death certificate (or other doc type) against a claim (Story 6.5; session; auth). The
     * caller builds the `FormData` with the picked file (RN: `{ uri, name, type }` appended as `file`).
     * Returns `{ documentId, status: 'processing' }` (HTTP 202 — OCR + parity run asynchronously). A
     * 409 `claim_document.upload_not_allowed` / 415 / 413 surfaces as `ApiError` (key on `error.code`).
     */
    uploadClaimDocument(
      claimCaseId: string,
      form: FormData,
      documentType: OcrDocumentType = 'death_certificate',
    ): Promise<ClaimDocumentUploadResult> {
      const qs = `?documentType=${encodeURIComponent(documentType)}`;
      return callMultipart(
        `${CLAIMS_BASE}/${encodeURIComponent(claimCaseId)}/documents${qs}`,
        ClaimDocumentUploadResponse,
        form,
      );
    },

    /**
     * Resolve an IFSC to its public bank/branch (Story 6.8; session; auth) — backs the
     * <NomineeDetailEditor> bank-name autocomplete on IFSC blur. A malformed/unknown IFSC surfaces
     * as `ApiError` (404 `nominee_bank.ifsc_unrecognized` — key on `error.code` for Pattern-4 copy).
     */
    ifscLookup(ifsc: string): Promise<IfscLookupResult> {
      return call(`${CLAIMS_BASE}/ifsc/${encodeURIComponent(ifsc)}`, IfscLookupResponse, undefined, true, 'GET');
    },

    /**
     * Record BOTH nominee bank accounts (#1 primary / #2 secondary) for a claim (Story 6.8; session;
     * auth). Exactly two complete accounts in one atomic request (latest-wins replace). Requires
     * handover-trust step-up (a `auth.step_up_required` code routes back to the handover-OTP step).
     * Returns the NON-PII presence view (rank + bank name + validated flag + holder-name-present).
     */
    recordNomineeBank(claimCaseId: string, input: RecordNomineeBankRequest): Promise<RecordNomineeBankResult> {
      return call(
        `${CLAIMS_BASE}/${encodeURIComponent(claimCaseId)}/nominee-bank`,
        RecordNomineeBankResponse,
        input,
        true,
      );
    },

    /**
     * The presence view of whatever nominee-bank accounts are currently on file (review finding,
     * 2026-07-11; session; auth) — `[]` when nothing has been recorded yet. Lets `<NomineeDetailEditor>`
     * show what's on file before a re-edit instead of always rendering blank.
     */
    nomineeBankStatus(claimCaseId: string): Promise<NomineeBankStatusResult> {
      return call(
        `${CLAIMS_BASE}/${encodeURIComponent(claimCaseId)}/nominee-bank`,
        NomineeBankStatusResponse,
        undefined,
        true,
        'GET',
      );
    },

    /**
     * Record the three granular claim-time DPDPA consents (Story 6.9; session; auth). The request
     * carries ONLY the box selections + the `locale` — the server resolves the canonical consent
     * copy (consent-copy integrity). NO step-up (consent capture is not a financial action, unlike
     * the nominee-bank route). Returns the NON-PII presence view (which types are now granted).
     */
    recordDpdpaConsent(
      claimCaseId: string,
      input: RecordDpdpaConsentRequest,
    ): Promise<RecordDpdpaConsentResult> {
      return call(
        `${CLAIMS_BASE}/${encodeURIComponent(claimCaseId)}/dpdpa-consent`,
        RecordDpdpaConsentResponse,
        input,
        true,
      );
    },

    /**
     * The presence view of which claim-time DPDPA consents are currently granted (Story 6.9; session;
     * auth) — lets the consent step render current state on re-entry (the save-and-resume thread).
     */
    dpdpaConsentStatus(claimCaseId: string): Promise<DpdpaConsentStatusResult> {
      return call(
        `${CLAIMS_BASE}/${encodeURIComponent(claimCaseId)}/dpdpa-consent`,
        DpdpaConsentStatusResponse,
        undefined,
        true,
        'GET',
      );
    },

    /**
     * Withdraw one PUBLICATION consent (Sahyog Vivran / In Memoriam) for a claim (Story 6.9; session;
     * auth) — the AC3 revoke MECHANISM (Epic 11b performs the actual page takedown on the next render
     * check). The `reason` is required. Returns the remaining granted subset.
     */
    revokeDpdpaConsent(
      claimCaseId: string,
      input: RevokeDpdpaConsentRequest,
    ): Promise<RevokeDpdpaConsentResult> {
      return call(
        `${CLAIMS_BASE}/${encodeURIComponent(claimCaseId)}/dpdpa-consent/revoke`,
        RevokeDpdpaConsentResponse,
        input,
        true,
      );
    },

    /**
     * The live shepherd assigned to a claim (Story 6.12; session; auth) — backs the <ShepherdContactCard>.
     * Returns `{ status: 'assigned', display_name, role_label, contact: { phone, whatsapp } }` for a claim
     * that has entered verification (a named human contact), or `{ status: 'not_assigned' }` before then.
     * Own claim only (a non-owner surfaces as `ApiError` 404 `claim.not_found`).
     */
    getShepherd(claimCaseId: string): Promise<MemberShepherdResult> {
      return call(
        `${CLAIMS_BASE}/${encodeURIComponent(claimCaseId)}/shepherd`,
        MemberShepherdResponse,
        undefined,
        true,
        'GET',
      );
    },
  };
}

export type MemberClaimClient = ReturnType<typeof createMemberClaimClient>;

/**
 * The member-app helpdesk client (Story 10.2) — a focused, STANDALONE client over the member
 * helpdesk surface, sharing only the `call`/`callMultipart` fetch/error/validation machinery with
 * `createMemberAuthClient` (via `createApiCallers`). The mobile app wires one instance in
 * `lib/helpdesk-api.ts`.
 *
 * The routes are Pariwar-scoped in the PATH (`/api/v1/p/:pariwarId/member/helpdesk/...`), even though
 * the member JWT is the tenancy authority — so every method takes `pariwarId` (the app reads it from
 * the stored session). A 403 `helpdesk.turnstile_failed` on create surfaces as `ApiError` (key on
 * `error.code`); a 413/415/400 attachment error likewise (key on the code for dignified copy).
 */
export function createMemberHelpdeskClient(opts: MemberAuthClientOptions) {
  const { call, callMultipart } = createApiCallers(opts);

  const base = (pariwarId: string): string => `/api/v1/p/${encodeURIComponent(pariwarId)}/member/helpdesk`;

  return {
    /** The in-force routing-policy category set for the picker (session; auth). */
    categories(pariwarId: string): Promise<HelpdeskCategoryListResponse> {
      return call(`${base(pariwarId)}/categories`, HelpdeskCategoryListResponse, undefined, true, 'GET');
    },

    /** The member's OWN tickets, newest-first (session; auth). */
    listTickets(pariwarId: string): Promise<MemberTicketListResponse> {
      return call(`${base(pariwarId)}/tickets`, MemberTicketListResponse, undefined, true, 'GET');
    },

    /** One owned ticket (status + routing + SLA + read-only thread), or `ApiError` 404 (session; auth). */
    getTicket(pariwarId: string, ticketId: string): Promise<MemberTicketDetailResponse> {
      return call(`${base(pariwarId)}/tickets/${encodeURIComponent(ticketId)}`, MemberTicketDetailResponse, undefined, true, 'GET');
    },

    /**
     * File a ticket (session; auth) — single-shot multipart. The caller builds the `FormData` with the
     * fields (category, sub_category?, subject, body) + up to 5 `attachment` files (RN:
     * `{ uri, name, type }`). `turnstileToken` and `idempotencyKey` ride HEADERS, not form fields
     * (review-hardening) — `x-turnstile-token` and `Idempotency-Key` respectively, so the server can
     * gate on them before parsing the multipart body. Returns the created ticket detail (201), or
     * the ORIGINAL detail (200) if `idempotencyKey` replays a request already completed.
     */
    createTicket(
      pariwarId: string,
      form: FormData,
      opts: { turnstileToken: string; idempotencyKey: string },
    ): Promise<MemberTicketDetailResponse> {
      return callMultipart(`${base(pariwarId)}/tickets`, MemberTicketDetailResponse, form, {
        'x-turnstile-token': opts.turnstileToken,
        'idempotency-key': opts.idempotencyKey,
      });
    },

    /** A short-lived signed URL for one of the member's OWN attachments, by array index (session; auth). */
    attachmentUrl(pariwarId: string, ticketId: string, attachmentIndex: number): Promise<HelpdeskAttachmentUrlResponse> {
      return call(
        `${base(pariwarId)}/tickets/${encodeURIComponent(ticketId)}/attachments/${attachmentIndex}/url`,
        HelpdeskAttachmentUrlResponse,
        undefined,
        true,
        'GET',
      );
    },
  };
}

export type MemberHelpdeskClient = ReturnType<typeof createMemberHelpdeskClient>;
