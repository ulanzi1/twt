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
  /** Admin session idle timeout (§2.4 — 12h). */
  readonly sessionIdleMs: number;
  /** Admin session absolute timeout (§2.4 — 7d). */
  readonly sessionAbsoluteMs: number;
  /** Failed-password attempts before lockout (AC-1). */
  readonly lockoutThreshold: number;
  /** Lockout duration after threshold breached. */
  readonly lockoutMs: number;
  /** Step-up OTP TTL (§2.2 — 3 min). */
  readonly stepUpOtpTtlMs: number;
  /** Elevated-context window after a successful step-up (§2.2 — ~5 min). */
  readonly stepUpElevatedMs: number;
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
    sessionIdleMs: intEnv(env, 'SESSION_IDLE_MS', 12 * HOUR),
    sessionAbsoluteMs: intEnv(env, 'SESSION_ABSOLUTE_MS', 7 * DAY),
    lockoutThreshold: intEnv(env, 'LOCKOUT_THRESHOLD', 5),
    lockoutMs: intEnv(env, 'LOCKOUT_MS', 15 * MINUTE),
    stepUpOtpTtlMs: intEnv(env, 'STEP_UP_OTP_TTL_MS', 3 * MINUTE),
    stepUpElevatedMs: intEnv(env, 'STEP_UP_ELEVATED_MS', 5 * MINUTE),
    globalRateMax: intEnv(env, 'RATE_LIMIT_MAX', 300),
    loginRateMax: intEnv(env, 'LOGIN_RATE_MAX', 10),
    stepUpRateMax: intEnv(env, 'STEP_UP_RATE_MAX', 5),
    // Bootstrap ceilings: read generous, search per §A L3483, write stricter than read.
    readRateMax: intEnv(env, 'READ_RATE_MAX', 120),
    searchRateMax: intEnv(env, 'SEARCH_RATE_MAX', 60),
    writeRateMax: intEnv(env, 'WRITE_RATE_MAX', 30),
    deployTrigger: { mode: deployTriggerMode as 'fake' | 'live' },
  };
}
