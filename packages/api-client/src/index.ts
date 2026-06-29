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
  VyawasthaShulkStatusResponse,
  type ImaListResponse as ImaListResult,
  type KycInitiateResponse as KycInitiateResult,
  type KycManualSubmitRequest,
  type KycProfileSummaryResponse as KycProfileSummaryResult,
  type KycStatusResponse as KycStatusResult,
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
  type VyawasthaShulkStatusResponse as VyawasthaShulkStatusResult,
  type MemberFullSession as FullSession,
  type MemberOtpRequestResponse as OtpRequestResult,
  type MemberOtpVerifyRequest,
  type MemberOtpVerifyResponse as OtpVerifyResult,
  type MemberStepUpRequestResponse as StepUpRequestResult,
  type MemberStepUpVerifyResponse as StepUpVerifyResult,
} from '@twt/contracts';
import type { z } from 'zod';

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

export function createMemberAuthClient(opts: MemberAuthClientOptions) {
  const doFetch = opts.fetchImpl ?? globalThis.fetch;
  const base = opts.baseUrl.replace(/\/$/, '');

  async function call<T>(
    path: string,
    schema: z.ZodType<T, z.ZodTypeDef, unknown>,
    body: unknown,
    auth = false,
    method: 'GET' | 'POST' = 'POST',
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
      try {
        const env = (await res.json()) as ErrorEnvelope;
        if (env.error?.code) code = env.error.code;
        if (env.error?.message) message = env.error.message;
      } catch {
        // Non-JSON body — keep the status-derived defaults.
      }
      throw new ApiError(res.status, code, message);
    }
    if (res.status === 204) return undefined as T;
    return schema.parse(await res.json());
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
  };
}

export type MemberAuthClient = ReturnType<typeof createMemberAuthClient>;
