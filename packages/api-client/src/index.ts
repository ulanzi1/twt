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
  KycInitiateResponse,
  KycProfileSummaryResponse,
  ImaListResponse,
  KycStatusResponse,
  LifeEventsSummaryResponse,
  MemberValidityResponse,
  MedicalDisclosureStatusResponse,
  MemberFullSession,
  MemberLockInStatusResponse,
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
const LIFE_EVENTS_BASE = '/api/v1/member/life-events';
const WITHDRAWAL_BASE = '/api/v1/member/withdrawal';
const DATA_EXPORT_BASE = '/api/v1/member/data-export';
const WA_OPT_IN_BASE = '/api/v1/member/wa-opt-in';
const TELEGRAM_OPT_IN_BASE = '/api/v1/member/telegram-opt-in';
const RTBF_BASE = '/api/v1/member/rtbf';

export function createMemberAuthClient(opts: MemberAuthClientOptions) {
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
  };
}

export type MemberAuthClient = ReturnType<typeof createMemberAuthClient>;
