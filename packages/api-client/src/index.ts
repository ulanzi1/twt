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
  KycStatusResponse,
  MemberFullSession,
  MemberOtpRequestResponse,
  MemberOtpVerifyResponse,
  MemberStepUpRequestResponse,
  MemberStepUpVerifyResponse,
  type KycInitiateResponse as KycInitiateResult,
  type KycManualSubmitRequest,
  type KycProfileSummaryResponse as KycProfileSummaryResult,
  type KycStatusResponse as KycStatusResult,
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

export function createMemberAuthClient(opts: MemberAuthClientOptions) {
  const doFetch = opts.fetchImpl ?? globalThis.fetch;
  const base = opts.baseUrl.replace(/\/$/, '');

  async function call<T>(
    path: string,
    schema: z.ZodType<T, z.ZodTypeDef, unknown>,
    body: unknown,
    auth = false,
    method: 'GET' | 'POST' = 'POST',
  ): Promise<T> {
    const headers: Record<string, string> = {};
    if (method !== 'GET') headers['content-type'] = 'application/json';
    if (auth && opts.getAccessToken) {
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
  };
}

export type MemberAuthClient = ReturnType<typeof createMemberAuthClient>;
