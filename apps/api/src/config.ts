// apps/api environment configuration loader.
//
// Reads + validates the required env vars at boot so a missing var is a loud
// startup failure, not a silent runtime fault (Task 1.5 — "without these the app
// crashes on startup"). Argon2id parameters default to the OWASP-2026 baseline
// (§2.3, ADR-0009) and are overridable via env for ops tuning. The pepper VALUE
// is never read here — only the Secret Manager secret NAME — so the secret stays
// resolved through `resolveSecretValue` (packages/domain/src/secrets.ts), never an
// env literal in prod (AC-1).

const MIN_SESSION_SECRET_LEN = 32;

/**
 * RFC 2606 reserved "must not resolve" placeholder — the `SMS_GATEWAY_API_URL` default when unset. Exported
 * so `deps.ts`'s prod fail-startup check can detect "the operator never actually set the gateway URL" (Story
 * 5.9 review): the endpoint isn't a secret, so it isn't covered by the credential/template-id blank-check, but
 * a prod boot on this placeholder would only fail at the first real OTP send, not at startup.
 */
export const SMS_GATEWAY_API_URL_PLACEHOLDER = 'https://sms-gateway.invalid/send';

export interface Argon2Params {
  /** KiB of memory. OWASP-2026 baseline ≈ 64 MiB. */
  readonly memoryCost: number;
  /** Iterations. */
  readonly timeCost: number;
  /** Lanes. */
  readonly parallelism: number;
}

export interface ApiConfig {
  readonly nodeEnv: string;
  /** Listen port (boot guard only; tests use fastify.inject without a port). */
  readonly port: number;
  /** @fastify/session signing secret (≥32 chars). */
  readonly sessionSecret: string;
  /** HttpOnly+Secure+SameSite=Lax cookie — `secure` is off only in local dev. */
  readonly cookieSecure: boolean;
  readonly webauthn: {
    readonly rpId: string;
    readonly rpName: string;
    readonly expectedOrigin: string;
  };
  readonly argon2: {
    /** Secret Manager secret NAME for the pepper (never the value). */
    readonly pepperSecretName: string;
    /** Local-dev env fallback var name holding the pepper value. */
    readonly pepperEnvFallback: string;
    readonly params: Argon2Params;
  };
  /**
   * Cloudflare Turnstile (Story 1.13, AC-4). OPTIONAL — unlike argon2 (which uses
   * requireEnv and throws when absent), an absent `secretName` resolves the seam to
   * the no-op verifier in `deps.ts` so the stack boots with ZERO Cloudflare config
   * (local dev / CI / not-yet-provisioned). Setting `secretName` opts into real
   * siteverify.
   */
  readonly turnstile: {
    /** Secret Manager secret NAME for the Turnstile secret key (never the value). Absent ⇒ no-op. */
    readonly secretName?: string;
    /** Local-dev env fallback var NAME holding the Turnstile secret VALUE (mirrors argon2). */
    readonly secretEnvFallback: string;
    /** Fail OPEN on a siteverify transport failure. Default false — fail closed in prod (AC-4). */
    readonly failOpen: boolean;
  };
  /**
   * DigiLocker KYC provider (Story 3.3a, AC2/AC7). OPTIONAL — like Turnstile, an absent
   * `clientIdSecretName`/`clientSecretSecretName` resolves the active provider to the
   * `fixtureKycProvider` in `deps.ts` so the stack boots with ZERO live-govt config (local
   * dev / CI / not-yet-provisioned). The `client_id`/`client_secret` are Secret-Manager
   * NAMEs (never the values — §2.3/AC-1), resolved via `resolveSecretValue`. Endpoints +
   * the redirect_uri allowlist (§2.8) + the NFR-27 8s timeout + the 15-min PKCE TTL are
   * plain config.
   */
  readonly digilocker: {
    /** Secret-Manager NAME for the DigiLocker client_id (never the value). Absent ⇒ fixture. */
    readonly clientIdSecretName?: string;
    /** Secret-Manager NAME for the DigiLocker client_secret (never the value). Absent ⇒ fixture. */
    readonly clientSecretSecretName?: string;
    /** Local-dev env fallback var NAMEs holding the values (mirror argon2/turnstile). */
    readonly clientIdEnvFallback: string;
    readonly clientSecretEnvFallback: string;
    /** Meri Pehchaan OAuth endpoints (§2.8 / Latest Tech). */
    readonly authorizeUrl: string;
    readonly tokenUrl: string;
    readonly eaadhaarUrl: string;
    /** The canonical callback redirect_uri + the server-side allowlist (§2.8). */
    readonly redirectUri: string;
    readonly redirectUriAllowlist: readonly string[];
    /** HTTP timeout (NFR-27 — 8s p95 budget). */
    readonly httpTimeoutMs: number;
    /** Transaction (PKCE) TTL — 15 min. */
    readonly transactionTtlMs: number;
    /**
     * FR-58C documented seam (Story 3.3b, AC3) — whether the manual KYC fallback is
     * available. TODAY defaults TRUE (manual is ALWAYS available — the safe default).
     * The FR-58C hard-mandatory feature-flag infrastructure is NOT built; this single
     * config read is where a future flag flip would set it `false` to hide the manual
     * CTA + show the hard-mandatory copy block (mirrors the 3.3a provider-registry seam).
     */
    readonly manualFallbackEnabled: boolean;
  };
  /** Admin session idle timeout (§2.4 — 12h). */
  readonly sessionIdleMs: number;
  /** Admin session absolute timeout (§2.4 — 7d). */
  readonly sessionAbsoluteMs: number;
  /** Failed-password attempts before lockout (AC-1). */
  readonly lockoutThreshold: number;
  /** Lockout duration after threshold breached. */
  readonly lockoutMs: number;
  /** Step-up OTP TTL (§2.2 — 3 min). Reused by member step-up (Story 3.2, R4). */
  readonly stepUpOtpTtlMs: number;
  /** Elevated-context window after a successful step-up (§2.2 — ~5 min). Reused by member step-up. */
  readonly stepUpElevatedMs: number;
  /** Member LOGIN-OTP TTL (Story 3.2, §2.2 line 1370 — 5 min, distinct from the 3-min step-up TTL). */
  readonly loginOtpTtlMs: number;
  /** Member access-token (JWT) TTL (Story 3.2, §2.4 — ≤15 min). */
  readonly memberAccessTtlMs: number;
  /** Member refresh-token TTL (Story 3.2, §2.2/AR-23/R1 — 90 days, NOT the §2.4 generic 30d). */
  readonly memberRefreshTtlMs: number;
  /** Signup-continuation token TTL (Story 3.2, R5 — 30 min, spans the full signup wizard). */
  readonly signupContinuationTtlMs: number;
  /** Member OTP send ceiling per-phone (Story 3.2, §2.11 line 3484 — 5 per 15-min window). */
  readonly otpPerPhoneMax: number;
  /** Member OTP per-phone window (Story 3.2 — 15 min, NOT the 1-min named limits). */
  readonly otpPerPhoneWindowMs: number;
  /** Max trusted devices per member (Story 3.2, §2.2 line 1337 — 2; a 3rd drops the oldest). */
  readonly memberMaxTrustedDevices: number;
  /**
   * Member-JWT signing key (Story 3.2, §2.4). The private key NAME (never the value)
   * for Secret Manager + a local-dev env fallback var name (mirror the argon2 pepper).
   * Asymmetric algorithm pinned (ES256/RS256). When neither the secret nor the env
   * fallback resolves AND NODE_ENV != production, deps.ts generates an ephemeral
   * ES256 keypair (dev/test/CI run with ZERO key config).
   */
  readonly memberJwt: {
    readonly algorithm: 'ES256' | 'RS256';
    readonly privateKeySecretName: string;
    readonly privateKeyEnvFallback: string;
  };
  /**
   * HMAC-SHA256 key for the otp_hash field in audit events (P28 / D1). Plain SHA-256
   * of a 6-digit OTP is brute-forceable in <1 ms; keying with this server-side secret
   * makes audit-log otp_hash non-invertible by log readers who lack the key. Required
   * in production; in dev/test falls back to a placeholder so zero config is needed.
   */
  readonly auditOtpCorrelationKey: string;
  /** Pariwar-select token TTL (Story 3.2, R2 — default 5 min). */
  readonly pariwarSelectTtlMs: number;
  /** Absolute member refresh-token ceiling: revoke if token was issued more than N ms ago (P32 / D5 — default 180 days). */
  readonly memberRefreshAbsoluteMs: number;
  /**
   * Grace window for a concurrent refresh of the SAME valid token (PR-Patch-11 / D3).
   * On flaky rural connectivity a double-tap / retry sends the same refresh token
   * twice; the loser of the atomic-rotation race is treated as a BENIGN concurrent
   * rotation (no chain revoke) iff the token was rotated within this window. Older
   * rotated tokens are still genuine reuse → revoke. Default 10s.
   */
  readonly memberRefreshRaceGraceMs: number;
  /** Global per-IP rate-limit ceiling (requests/minute). */
  readonly globalRateMax: number;
  /** Tight per-route rate-limit ceiling for login + reset-request (requests/minute). */
  readonly loginRateMax: number;
  /** Step-up per-actor/per-IP rate-limit ceiling (requests/minute, §2.2). */
  readonly stepUpRateMax: number;
  /**
   * Named per-endpoint ceilings (Story 1.14, §2.11 Layer-2 — "write stricter than
   * read"). These are GENEROUS-BUT-FINITE bootstrap ceilings (§2.11 "default-deny
   * ceiling at bootstrap", not "unlimited until Category 5"); the values are policy
   * tuned in Category 5 Observability, so they are env-overridable. Keyed per-session
   * (session actor when present, else IP) via `perSessionKey`.
   */
  /** Read/list endpoints (requests/minute). */
  readonly readRateMax: number;
  /** Search endpoints (requests/minute, ~§A L3483). */
  readonly searchRateMax: number;
  /** Write/mutation endpoints (requests/minute, stricter than read). */
  readonly writeRateMax: number;
  /**
   * Deploy seam mode (Story 1.15, AC-3/AC-5). `fake` (default) = the in-memory
   * structured-log fake (dev/test/CI); `live` = the Dokploy-API client (staging/prod,
   * reads DOKPLOY_API_URL + DOKPLOY_API_TOKEN). Validated here so a bad value fails
   * at boot; the seam itself is built by `resolveDeployTriggerFromEnv` in deps.ts.
   */
  readonly deployTrigger: {
    readonly mode: 'fake' | 'live';
  };
  /**
   * The v1 default/launch Pariwar a first-time signup creates the member in (Story 3.6a, D1).
   * The `signup_continuation` token carries only the mobile blind index (no `pariwarId`), and v1
   * launches a SINGLE Pariwar — so the signup-create endpoint resolves the new member's tenant from
   * this one documented source. `null` when unset: the endpoint then returns a clean
   * `auth.signup_pariwar_unconfigured` 503 instead of minting a member with no tenant. Multi-Pariwar
   * signup selection is deferred (the architecture already supports one mobile → members in several
   * Pariwars via Pariwar-Passport; v1 signup creates exactly one).
   */
  readonly defaultSignupPariwarId: string | null;
  /**
   * The trust's UPI VPA the signup ₹110 Vyawastha Shulk is paid to (Story 3.6b, AC1). SERVER-
   * authoritative — baked into the UPI Intent URL server-side so the client never names the payee.
   * `null` when unset: the intent endpoint returns a clean `vyawastha_shulk.unconfigured` 503 instead
   * of building a URL with no payee. Set to the launch trust's VPA in prod.
   */
  readonly vyawasthaShulkVpa: string | null;
  /**
   * The mandatory signup-fee amount in whole INR (Story 3.6b, FR-1; v1 = 110). SERVER-authoritative —
   * baked into the UPI Intent `am=` and recorded on the receipt; the client never names the amount.
   */
  readonly vyawasthaShulkAmountInr: number;
  /**
   * Global SMS-DLT gateway (Story 5.9) — the FIRST live caller of the SMS gateway. Used to build the real
   * `createSmsDltStepUpDelivery` OTP adapter for the MEMBER call sites in prod. The credential + PE/OE sender
   * header are Secret-Manager NAME pointers (never the values — AI-4-3(c)), resolved via `resolveSecretValue`;
   * the per-intent OTP DLT template ids are separate NAME pointers (in the OTP template registry) resolved at
   * send time. In dev/CI the member adapter is the reveal stub, so ALL of these are OPTIONAL there; in prod a
   * blank/missing credential or template id FAILS STARTUP (BigDev 2026-07-07 — no silent reveal-stub fallback).
   */
  readonly sms: {
    /** Telephony-gateway send endpoint (plain config, not a secret). */
    readonly apiUrl: string;
    /** Secret-Manager NAME for the gateway API key (never the value). Absent in prod ⇒ FAIL STARTUP. */
    readonly apiKeySecretName?: string;
    /** Local-dev env fallback var NAME holding the gateway API-key VALUE (mirrors argon2). */
    readonly apiKeyEnvFallback: string;
    /** Secret-Manager/config NAME for the PE/OE-registered sender header (never the value). Absent in prod ⇒ FAIL STARTUP. */
    readonly senderIdSecretName?: string;
    /** Local-dev env fallback var NAME holding the sender-header VALUE. */
    readonly senderIdEnvFallback: string;
  };
}

const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;
const DAY = 24 * HOUR;

function requireEnv(env: NodeJS.ProcessEnv, key: string): string {
  const v = env[key];
  if (v === undefined || v.trim() === '') {
    throw new Error(
      `[config] required env var ${key} is missing — set it (see apps/api/.env.example)`,
    );
  }
  return v;
}

function intEnv(env: NodeJS.ProcessEnv, key: string, fallback: number): number {
  const v = env[key];
  if (v === undefined || v.trim() === '') return fallback;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`[config] env var ${key} must be a non-negative number, got ${JSON.stringify(v)}`);
  }
  return n;
}

/**
 * Build the validated config from the environment. Throws on any missing required
 * var so the process fails fast at boot rather than mid-request.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  const nodeEnv = (env['NODE_ENV'] ?? 'development').toLowerCase();
  const isProd = nodeEnv === 'production';

  const sessionSecret = requireEnv(env, 'SESSION_SECRET');
  if (sessionSecret.length < MIN_SESSION_SECRET_LEN) {
    throw new Error(
      `[config] SESSION_SECRET must be ≥${MIN_SESSION_SECRET_LEN} chars (got ${sessionSecret.length})`,
    );
  }

  const expectedOrigin = requireEnv(env, 'WEBAUTHN_EXPECTED_ORIGIN');
  try { new URL(expectedOrigin); } catch {
    throw new Error(`[config] WEBAUTHN_EXPECTED_ORIGIN must be a valid URL (got ${JSON.stringify(expectedOrigin)})`);
  }

  // Turnstile secret NAME is OPTIONAL (env[...] not requireEnv) — absent ⇒ no-op seam.
  const rawTurnstileSecretName = env['TURNSTILE_SECRET_NAME'];
  const turnstileSecretName =
    rawTurnstileSecretName && rawTurnstileSecretName.trim() !== '' ? rawTurnstileSecretName : undefined;

  // DigiLocker secret NAMEs are OPTIONAL — absent (either one) ⇒ fixture provider seam.
  const rawDigilockerClientId = env['DIGILOCKER_CLIENT_ID_SECRET_NAME'];
  const digilockerClientIdSecretName =
    rawDigilockerClientId && rawDigilockerClientId.trim() !== '' ? rawDigilockerClientId : undefined;
  const rawDigilockerClientSecret = env['DIGILOCKER_CLIENT_SECRET_SECRET_NAME'];
  const digilockerClientSecretSecretName =
    rawDigilockerClientSecret && rawDigilockerClientSecret.trim() !== ''
      ? rawDigilockerClientSecret
      : undefined;

  // Deploy seam mode (Story 1.15) — default `fake` so dev/test/CI run with ZERO
  // Dokploy config; `live` opts into the Dokploy-API client (staging/prod).
  const deployTriggerMode = (env['DEPLOY_TRIGGER_MODE'] ?? 'fake').toLowerCase();
  if (deployTriggerMode !== 'fake' && deployTriggerMode !== 'live') {
    throw new Error(
      `[config] DEPLOY_TRIGGER_MODE must be 'fake' or 'live', got ${JSON.stringify(deployTriggerMode)}`,
    );
  }

  return {
    nodeEnv,
    port: intEnv(env, 'PORT', 3000),
    sessionSecret,
    // Secure cookies are mandatory in production; relaxed for local http dev.
    cookieSecure: env['COOKIE_SECURE'] === '1' || isProd,
    webauthn: {
      rpId: requireEnv(env, 'WEBAUTHN_RP_ID'),
      rpName: env['WEBAUTHN_RP_NAME'] ?? 'TWT Admin',
      expectedOrigin,
    },
    argon2: {
      pepperSecretName: requireEnv(env, 'ARGON2_PEPPER_SECRET_NAME'),
      pepperEnvFallback: env['ARGON2_PEPPER_ENV_FALLBACK'] ?? 'ARGON2_PEPPER',
      params: {
        memoryCost: intEnv(env, 'ARGON2_MEMORY_COST', 65536), // 64 MiB
        timeCost: intEnv(env, 'ARGON2_TIME_COST', 3),
        parallelism: intEnv(env, 'ARGON2_PARALLELISM', 1),
      },
    },
    turnstile: {
      ...(turnstileSecretName ? { secretName: turnstileSecretName } : {}),
      secretEnvFallback: env['TURNSTILE_SECRET_ENV_FALLBACK'] ?? 'TURNSTILE_SECRET',
      failOpen: env['TURNSTILE_FAIL_OPEN'] === '1',
    },
    digilocker: {
      // OPTIONAL secret NAMEs — absent ⇒ fixture provider (deps.ts), like Turnstile.
      ...(digilockerClientIdSecretName ? { clientIdSecretName: digilockerClientIdSecretName } : {}),
      ...(digilockerClientSecretSecretName
        ? { clientSecretSecretName: digilockerClientSecretSecretName }
        : {}),
      clientIdEnvFallback: env['DIGILOCKER_CLIENT_ID_ENV_FALLBACK'] ?? 'DIGILOCKER_CLIENT_ID',
      clientSecretEnvFallback:
        env['DIGILOCKER_CLIENT_SECRET_ENV_FALLBACK'] ?? 'DIGILOCKER_CLIENT_SECRET',
      authorizeUrl:
        env['DIGILOCKER_AUTHORIZE_URL'] ?? 'https://api.digitallocker.gov.in/public/oauth2/1/authorize',
      tokenUrl: env['DIGILOCKER_TOKEN_URL'] ?? 'https://api.digitallocker.gov.in/public/oauth2/1/token',
      eaadhaarUrl:
        env['DIGILOCKER_EAADHAAR_URL'] ?? 'https://api.digitallocker.gov.in/public/oauth2/3/xml/eaadhaar',
      redirectUri: env['DIGILOCKER_REDIRECT_URI'] ?? 'http://localhost:3000/api/v1/kyc/callback',
      // Comma-separated server-side allowlist (§2.8); defaults to the single redirect_uri.
      redirectUriAllowlist: (env['DIGILOCKER_REDIRECT_URI_ALLOWLIST'] ??
        env['DIGILOCKER_REDIRECT_URI'] ??
        'http://localhost:3000/api/v1/kyc/callback')
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s !== ''),
      httpTimeoutMs: intEnv(env, 'DIGILOCKER_HTTP_TIMEOUT_MS', 8 * 1000),
      transactionTtlMs: intEnv(env, 'DIGILOCKER_TRANSACTION_TTL_MS', 15 * MINUTE),
      // FR-58C seam (AC3): manual fallback is available unless explicitly disabled
      // (env=='false'). Default TRUE — manual ALWAYS available today.
      manualFallbackEnabled: (env['KYC_MANUAL_FALLBACK_ENABLED'] ?? 'true').toLowerCase() !== 'false',
    },
    sessionIdleMs: intEnv(env, 'SESSION_IDLE_MS', 12 * HOUR),
    sessionAbsoluteMs: intEnv(env, 'SESSION_ABSOLUTE_MS', 7 * DAY),
    lockoutThreshold: intEnv(env, 'LOCKOUT_THRESHOLD', 5),
    lockoutMs: intEnv(env, 'LOCKOUT_MS', 15 * MINUTE),
    stepUpOtpTtlMs: intEnv(env, 'STEP_UP_OTP_TTL_MS', 3 * MINUTE),
    stepUpElevatedMs: intEnv(env, 'STEP_UP_ELEVATED_MS', 5 * MINUTE),
    loginOtpTtlMs: intEnv(env, 'LOGIN_OTP_TTL_MS', 5 * MINUTE),
    memberAccessTtlMs: intEnv(env, 'MEMBER_ACCESS_TTL_MS', 15 * MINUTE),
    memberRefreshTtlMs: intEnv(env, 'MEMBER_REFRESH_TTL_MS', 90 * DAY),
    signupContinuationTtlMs: intEnv(env, 'SIGNUP_CONTINUATION_TTL_MS', 30 * MINUTE),
    otpPerPhoneMax: intEnv(env, 'OTP_PER_PHONE_MAX', 5),
    otpPerPhoneWindowMs: intEnv(env, 'OTP_PER_PHONE_WINDOW_MS', 15 * MINUTE),
    memberMaxTrustedDevices: intEnv(env, 'MEMBER_MAX_TRUSTED_DEVICES', 2),
    memberJwt: {
      algorithm: 'ES256',
      privateKeySecretName: env['MEMBER_JWT_PRIVATE_KEY_SECRET_NAME'] ?? 'twt-dev-member-jwt-private-key',
      privateKeyEnvFallback: env['MEMBER_JWT_PRIVATE_KEY_ENV_FALLBACK'] ?? 'MEMBER_JWT_PRIVATE_KEY',
    },
    auditOtpCorrelationKey: isProd
      ? requireEnv(env, 'OTP_AUDIT_CORRELATION_KEY')
      : (env['OTP_AUDIT_CORRELATION_KEY'] ?? 'twt-dev-otp-audit-correlation-key-placeholder'),
    pariwarSelectTtlMs: intEnv(env, 'PARIWAR_SELECT_TTL_MS', 5 * MINUTE),
    memberRefreshAbsoluteMs: intEnv(env, 'MEMBER_REFRESH_ABSOLUTE_MS', 180 * DAY),
    memberRefreshRaceGraceMs: intEnv(env, 'MEMBER_REFRESH_RACE_GRACE_MS', 10 * 1000),
    globalRateMax: intEnv(env, 'RATE_LIMIT_MAX', 300),
    loginRateMax: intEnv(env, 'LOGIN_RATE_MAX', 10),
    stepUpRateMax: intEnv(env, 'STEP_UP_RATE_MAX', 5),
    // Bootstrap ceilings: read generous, search per §A L3483, write stricter than read.
    readRateMax: intEnv(env, 'READ_RATE_MAX', 120),
    searchRateMax: intEnv(env, 'SEARCH_RATE_MAX', 60),
    writeRateMax: intEnv(env, 'WRITE_RATE_MAX', 30),
    deployTrigger: { mode: deployTriggerMode as 'fake' | 'live' },
    // Story 3.6a (D1) — the v1 single-Pariwar launch tenant signup creates members in. Optional
    // (absent ⇒ null ⇒ signup-create 503s cleanly); set to the launch Pariwar's id in prod.
    defaultSignupPariwarId: env['DEFAULT_SIGNUP_PARIWAR_ID'] ?? null,
    // Story 3.6b (AC1) — the trust VPA the signup fee is paid to (server-authoritative; absent ⇒ null
    // ⇒ the intent endpoint 503s cleanly) + the mandatory ₹110 amount (FR-1; env-overridable default).
    vyawasthaShulkVpa: env['VYAWASTHA_SHULK_VPA'] ?? null,
    vyawasthaShulkAmountInr: intEnv(env, 'VYAWASTHA_SHULK_AMOUNT_INR', 110),
    // Story 5.9 — global SMS-DLT gateway for OTP delivery. Secret NAMEs are OPTIONAL at config-load time
    // (absent ⇒ reveal stub in dev/CI); deps.ts enforces the prod FAIL-STARTUP check when they resolve blank.
    sms: {
      apiUrl: env['SMS_GATEWAY_API_URL'] ?? SMS_GATEWAY_API_URL_PLACEHOLDER,
      ...(env['SMS_GATEWAY_API_KEY_SECRET_NAME'] && env['SMS_GATEWAY_API_KEY_SECRET_NAME'].trim() !== ''
        ? { apiKeySecretName: env['SMS_GATEWAY_API_KEY_SECRET_NAME'] }
        : {}),
      apiKeyEnvFallback: env['SMS_GATEWAY_API_KEY_ENV_FALLBACK'] ?? 'SMS_GATEWAY_API_KEY',
      ...(env['SMS_GATEWAY_SENDER_ID_SECRET_NAME'] && env['SMS_GATEWAY_SENDER_ID_SECRET_NAME'].trim() !== ''
        ? { senderIdSecretName: env['SMS_GATEWAY_SENDER_ID_SECRET_NAME'] }
        : {}),
      senderIdEnvFallback: env['SMS_GATEWAY_SENDER_ID_ENV_FALLBACK'] ?? 'SMS_GATEWAY_SENDER_ID',
    },
  };
}
