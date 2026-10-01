// Boot-time construction of the contribution-loop provider registry resolver — AI-8-3 (Task 4).
//
// This is the jobs-side wiring that turns the (now @twt/channels-homed) provider composition into the ONE
// `resolveProviders` seam `fanOutAlert` injects (contribution-notify.ts). Story 8.8 shipped the first live
// dispatch() fan-out but left `resolveProviders` UNWIRED, so `dispatch` fell back to DEFAULT_PROVIDER_REGISTRY
// (the log-only fixtures) — a deployed worker composed + audited the full ladder but sent ZERO real bytes
// (the retro's headline H-1). This wires the real per-Pariwar providers so it sends real bytes.
//
// ── The push trap (§4 — the crux) ──────────────────────────────────────────────────────────────────────────
// The cascade is push → whatsapp → sms and the FIXTURE push ALWAYS accepts, so if push resolves to the fixture
// the ladder never advances. Wiring real WA/SMS while leaving push on the fixture delivers NOTHING real.
// Push (D1) uses ONE GLOBAL Firebase service-account secret (PUSH_FIREBASE_SA_SECRET_NAME) for every Pariwar's
// messagingFor call; ABSENT ⇒ fixture push. Mirrors SMS's global posture; no per-Pariwar push config table.
//
// ── The 5-state honesty invariant (§9a-i) is held INSIDE createContributionProviderResolver ─────────────────
// "not configured" (absent row / disabled / blank NAME / no template / gateway unconfigured) ⇒ fixture per
// channel; a DB or Secret-Manager OUTAGE ⇒ the resolver REJECTS (the pg-boss job fails → retries), never a
// silent fixture fallback. This module only supplies the boot-time clients + the secret/config resolvers.
//
// ── Env-gated, opt-in-real (boots with ZERO channel config in dev/CI) ────────────────────────────────────────
// The SMS gateway credential is resolved ONCE at boot; when its NAME env is unset the resolved value is blank
// ⇒ SmsAppClient.isConfigured() is false ⇒ fixture SMS. The WA/Telegram configs are per-Pariwar DB rows (absent
// ⇒ fixture). The global Firebase SA name unset ⇒ fixture push. So the stack boots and runs with no config,
// exactly as Epic 5 committed — and delivers real bytes the moment the secrets/config are provisioned.

import {
  createContributionProviderResolver,
  createFirebaseAppCache,
  createSmsAppClient,
  createTelegramAppCache,
  createWhatsappAppCache,
  type FirebaseAppCache,
  type SmsAppClient,
} from '@twt/channels';
import { resolveSecretValue, withPariwarScope, type Db } from '@twt/domain';
import type pg from 'pg';

import type { ContributionNotifyDeps } from './contribution-notify.js';

/** What boot supplies: the BYPASSRLS service pool the resolver's per-Pariwar config reads scope over. */
export interface ContributionProviderWiringDeps {
  readonly pool: pg.Pool;
}

/** The wired resolver + a teardown for the graceful-shutdown drain (only the Firebase App cache holds resources). */
export interface ContributionProviderWiring {
  readonly resolveProviders: NonNullable<ContributionNotifyDeps['resolveProviders']>;
  /**
   * ⭐ Story 6.19b (Task 4) — THE one global SMS gateway client, exposed (⛔ never a second client) so the claim-
   * correction family SMS (a DIRECT DLT send to an explicit number, the OTP precedent) uses the SAME credential.
   * ⚠ Its `isConfigured()` false must fail the correction send CLOSED — ⛔ never the fixture that reports `accepted`.
   */
  readonly smsAppClient: SmsAppClient;
  /** Tear down the per-Pariwar Firebase Apps (SIGTERM drain). The fetch-based WA/TG/SMS clients hold nothing. */
  readonly teardown: () => Promise<void>;
}

/**
 * Resolve a Secret-Manager NAME → the token VALUE — the jobs-side twin of apps/api's `resolveChannelSecret`
 * (Secret Manager in prod; a local env fallback derived from the NAME: non-alphanumerics → `_`, uppercased).
 * `apps/jobs` cannot import `apps/api`, so this is a deliberate by-value parallel (the deps.ts KMS precedent).
 * FAIL-LOUD by design: every caller of this variant (`resolveSecret` — the WA/Telegram access-token/bot-token
 * reads, both gated behind a DB config row that already asserts "this channel IS provisioned") must throw on
 * any resolution failure, never degrade silently — a config row saying `enabled` with an unresolvable credential
 * is a real misconfiguration, not a "not provisioned" state.
 */
function resolveChannelSecret(secretName: string): Promise<string> {
  return resolveSecretValue(secretName, {
    envFallback: secretName.replace(/[^A-Za-z0-9]/g, '_').toUpperCase(),
  });
}

/** Loose shape of a `@google-cloud/secret-manager` / `google-gax` `GoogleError` — duck-typed rather than
 *  imported so `apps/jobs` does not take on an undeclared transitive dependency (it only depends on
 *  `@twt/domain`'s `resolveSecretValue`, never on `@google-cloud/secret-manager` directly). */
interface PossibleGoogleError {
  readonly code?: unknown;
  readonly message?: unknown;
}

/** gRPC `Status.NOT_FOUND` (google-gax `src/status.ts`) — the code Secret Manager's `accessSecretVersion`
 *  rejects with when the named secret has never been created (as opposed to e.g. `UNAVAILABLE`/`DEADLINE_EXCEEDED`
 *  for a genuine outage, or `PERMISSION_DENIED` for an access-control misconfiguration — see
 *  `classifySecretManagerFault` for the claim-correction send's split of the two). */
const GRPC_NOT_FOUND = 5;

/** The exact local-dev "not configured" throw `resolveSecretValue` raises itself (packages/domain/src/secrets.ts)
 *  when NEITHER Secret Manager context NOR the env fallback is set — genuinely "this key was never provisioned"
 *  in dev/CI, not an outage (no network call was even attempted). Matched by message since `resolveSecretValue`
 *  does not export a typed error for it. */
const UNCONFIGURED_MESSAGE_MARKER = 'no local fallback';

/**
 * Resolve a config/Secret-Manager NAME → the value, or `null` for the explicit "not provisioned" state — the
 * `SmsCompositionDeps.resolveConfig` / `ContributionProviderResolverDeps.resolveConfig` contract
 * (`packages/channels/src/composition/provider-composition.ts`) requires this distinction: a per-category SMS
 * DLT template id that has not YET been registered with TRAI/the gateway is a normal, expected state (§9a-i
 * state 3, "secret missing by design") and must fixture-fall-back — it must NOT be indistinguishable from a
 * genuine Secret-Manager/network OUTAGE (§9a-i states 4-5), which must still REJECT (fail the job → pg-boss
 * retry). `resolveChannelSecret` above cannot serve this seam: `resolveSecretValue` always throws, whether the
 * cause is "not found" or "unavailable" (review finding, AI-8-3 — verified: no `.code` branching in
 * `resolveSecretValue`). So this wrapper classifies the failure itself: a Secret-Manager `NOT_FOUND` (the secret
 * was never created) or the local-dev "no context and no fallback" throw (the key was never given an env
 * fallback) both mean NOT PROVISIONED ⇒ `null`. Every other failure (timeout, permission-denied, unavailable, a
 * secret that resolved but came back with no payload, a missing `GOOGLE_CLOUD_PROJECT`) is a genuine
 * infrastructure/config fault and PROPAGATES (re-thrown), preserving the honesty invariant.
 */
export async function resolveSmsDltConfig(configKey: string): Promise<string | null> {
  try {
    return await resolveChannelSecret(configKey);
  } catch (err) {
    const e = err as PossibleGoogleError;
    const isSecretManagerNotFound = e.code === GRPC_NOT_FOUND;
    const isLocalDevUnconfigured =
      typeof e.message === 'string' && e.message.includes(UNCONFIGURED_MESSAGE_MARKER);
    if (isSecretManagerNotFound || isLocalDevUnconfigured) return null;
    throw err;
  }
}

/** The gRPC status names (google-gax `src/status.ts`) a Secret Manager fault can carry — for a classified detail. */
const GRPC_STATUS_NAMES: Readonly<Record<number, string>> = {
  1: 'cancelled',
  2: 'unknown',
  3: 'invalid_argument',
  4: 'deadline_exceeded',
  5: 'not_found',
  6: 'already_exists',
  7: 'permission_denied',
  8: 'resource_exhausted',
  9: 'failed_precondition',
  10: 'aborted',
  11: 'out_of_range',
  12: 'unimplemented',
  13: 'internal',
  14: 'unavailable',
  15: 'data_loss',
  16: 'unauthenticated',
};

/**
 * The ONLY Secret Manager codes that are FINAL — a CONFIG fault a retry cannot clear: `INVALID_ARGUMENT` (3),
 * `PERMISSION_DENIED` (7), `FAILED_PRECONDITION` (9, e.g. a disabled / destroyed version), `UNIMPLEMENTED` (12).
 * ⚠ An ALLOWLIST of finals, ⛔ never an allowlist of transients: a code nobody listed (`RESOURCE_EXHAUSTED` 8 — a
 * quota spike, `ABORTED` 10, `INTERNAL` 13, `CANCELLED` 1, `UNKNOWN` 2, a socket code, ⛔ no code) RETRIES — a
 * wrongly-final code would cancel the day's slot for every family at once, while a wrongly-transient one only
 * retries until the next morning's exhausted-row finaliser records `error` and alarms.
 * ⚠ `UNAUTHENTICATED` (16) is TRANSIENT on purpose (fifth-pass review): on Cloud Run it is most often a metadata-
 * server / token-refresh blip, and a FINAL 16 at 10:00 would end every in-flight family SMS for the day. A real
 * credential fault that never clears is still surfaced — by the next sweep's exhausted-row finaliser (`error` + alarm).
 */
const GRPC_CONFIG_FINAL: ReadonlySet<number> = new Set([3, 7, 9, 12]);

/** A code-ish label from an error, `undefined` when it carries none (a non-object, or no `code`). */
function faultCodeOf(err: unknown): number | string | undefined {
  if (typeof err !== 'object' || err === null) return undefined;
  const code = (err as PossibleGoogleError).code;
  return typeof code === 'number' || typeof code === 'string' ? code : undefined;
}

/**
 * ⭐ Story 6.19b — classify a failure that `resolveSmsDltConfig` RE-THREW (i.e. ⛔ not the "not provisioned"
 * `NOT_FOUND`, which already resolved to `null`). FINAL only for a known CONFIG fault (`GRPC_CONFIG_FINAL`) — the
 * caller records `error` and alarms; EVERYTHING else is `transient` (pg-boss retries; a fault that never clears is
 * finalised `error` + alarmed by the next sweep's exhausted-row finaliser). The code is read from the error, else
 * from a wrapping error's `cause` (a client that wraps the gRPC error). `code` is a lower-case, PII-free label (the
 * gRPC status name, `grpc_<n>`, a sanitised socket code, or `unknown`) for the record's `detail`.
 * ⚠ Used by the claim-correction send only — the contribution resolver keeps its own "re-throw ⇒ retry" posture.
 */
export function classifySecretManagerFault(err: unknown): { readonly transient: boolean; readonly code: string } {
  const code =
    faultCodeOf(err) ??
    faultCodeOf(typeof err === 'object' && err !== null ? (err as { readonly cause?: unknown }).cause : undefined);
  if (typeof code === 'number') {
    return { transient: !GRPC_CONFIG_FINAL.has(code), code: GRPC_STATUS_NAMES[code] ?? `grpc_${String(code)}` };
  }
  if (typeof code === 'string' && /^[A-Za-z0-9_]{1,32}$/.test(code)) return { transient: true, code: code.toLowerCase() };
  return { transient: true, code: 'unknown' };
}

/**
 * Wrap a `(secretName) => Promise<string>` resolver with a process-lifetime cache that intercepts ONLY calls
 * for `globalSecretName` (review finding, AI-8-3) — every other name is a per-Pariwar credential that
 * genuinely varies per call and passes through untouched. A rejection is never cached, so a transient
 * Secret-Manager outage on the global secret still retries cleanly on the next call.
 */
export function withGlobalSecretCache(
  resolve: (secretName: string) => Promise<string>,
  globalSecretName: string | undefined,
): (secretName: string) => Promise<string> {
  let cached: Promise<string> | null = null;
  return (secretName: string) => {
    if (!globalSecretName || secretName !== globalSecretName) return resolve(secretName);
    if (!cached) {
      cached = resolve(secretName).catch((err: unknown) => {
        cached = null;
        throw err;
      });
    }
    return cached;
  };
}

/**
 * Build the contribution-loop `resolveProviders`. Constructs the per-process app caches + the global SMS
 * gateway client (resolving its credential ONCE at boot) + the per-(Pariwar,category) provider resolver, all
 * env-gated so an unprovisioned channel degrades to its log-only fixture. Async because it resolves the SMS
 * gateway secrets at boot (mirrors apps/api buildMemberStepUpDelivery).
 */
export async function buildContributionProviderResolver(
  deps: ContributionProviderWiringDeps,
): Promise<ContributionProviderWiring> {
  const firebaseAppCache: FirebaseAppCache = createFirebaseAppCache();
  const whatsappAppCache = createWhatsappAppCache();
  const telegramAppCache = createTelegramAppCache();

  // ── The GLOBAL SMS gateway client (resolved ONCE at boot; restart-required-on-rotation) ──────────────────
  // Mirror apps/api's SMS env-var contract EXACTLY (SMS_GATEWAY_API_URL / _API_KEY_SECRET_NAME (+_ENV_FALLBACK)
  // / _SENDER_ID_SECRET_NAME (+_ENV_FALLBACK)). Unset NAME ⇒ blank value ⇒ isConfigured() false ⇒ fixture SMS
  // (never a boot failure for the un-provisioned case — that is the opt-in-real posture). A NAME that IS set but
  // whose secret cannot resolve throws here → boot fails, which is correct: a half-configured SMS must not pretend.
  const apiUrl = process.env['SMS_GATEWAY_API_URL'] ?? '';
  const apiKeySecretName = process.env['SMS_GATEWAY_API_KEY_SECRET_NAME'];
  const senderIdSecretName = process.env['SMS_GATEWAY_SENDER_ID_SECRET_NAME'];
  const apiKey = apiKeySecretName && apiKeySecretName.trim() !== ''
    ? await resolveSecretValue(apiKeySecretName, {
        envFallback: process.env['SMS_GATEWAY_API_KEY_ENV_FALLBACK'] ?? 'SMS_GATEWAY_API_KEY',
      })
    : '';
  const senderId = senderIdSecretName && senderIdSecretName.trim() !== ''
    ? await resolveSecretValue(senderIdSecretName, {
        envFallback: process.env['SMS_GATEWAY_SENDER_ID_ENV_FALLBACK'] ?? 'SMS_GATEWAY_SENDER_ID',
      })
    : '';
  const smsAppClient = createSmsAppClient({ apiUrl, apiKey, senderId });

  // The GLOBAL Firebase service-account secret NAME (D1). Unset ⇒ fixture push everywhere.
  const firebaseServiceAccountSecretName = process.env['PUSH_FIREBASE_SA_SECRET_NAME'];

  const resolveProviders = createContributionProviderResolver({
    // The resolver opens its OWN per-Pariwar RLS scope for the WA/Telegram config reads (§6): resolveProviders
    // is called with only {pariwarId, category}, never a pre-scoped db.
    withScope: <T>(pariwarId: string, fn: (db: Db) => Promise<T>): Promise<T> =>
      withPariwarScope(deps.pool, pariwarId, fn),
    firebaseAppCache,
    whatsappAppCache,
    telegramAppCache,
    smsAppClient,
    // withGlobalSecretCache: the registry resolver's own memo is keyed per (pariwarId, category) — since the
    // GLOBAL Firebase SA secret (D1) is the SAME value for every key, resolving it fresh on every distinct
    // memo miss re-hits Secret Manager once per (pariwarId, category) rather than once per process (review
    // finding, AI-8-3). This intercepts ONLY the SA secret name with a process-lifetime cache; every other
    // name (WA/Telegram tokens, which genuinely vary per Pariwar) passes through unchanged on every call.
    resolveSecret: withGlobalSecretCache(resolveChannelSecret, firebaseServiceAccountSecretName),
    // The SMS DLT template-id NAME is only ever reached when the gateway IS configured AND the category is
    // SMS-eligible. Unlike `resolveSecret`, this MUST distinguish "not yet registered for this category"
    // (⇒ null ⇒ fixture) from a genuine Secret-Manager/DB outage (⇒ throw ⇒ fail the job → retry) — see
    // `resolveSmsDltConfig`'s doc comment (review finding, AI-8-3: aliasing this to the fail-loud
    // `resolveChannelSecret` collapsed those two states and rejected the WHOLE registry on one missing template).
    resolveConfig: resolveSmsDltConfig,
    ...(firebaseServiceAccountSecretName ? { firebaseServiceAccountSecretName } : {}),
  });

  return {
    resolveProviders,
    smsAppClient,
    teardown: () => firebaseAppCache.close(),
  };
}
