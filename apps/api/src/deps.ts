// AppDeps construction (production + local-dev).
//
// Resolves the database pool, the Argon2id pepper (Secret Manager in prod; env
// fallback locally), and the KMS provider for the admin-identity Tier-1 envelope +
// blind index. KMS follows the established `KMS_TEST_MODE` convention
// (packages/domain/src/encryption/fake-kms-provider.ts): default `fake` for
// local/CI; `live` switches to Cloud KMS. Tests build deps directly with the
// fake provider + a frozen clock + a capturing audit sink (see
// tests/integration/_setup.ts) — this factory is the production/dev path.

import { createHash } from 'node:crypto';

import { createDb, resolveConnectionString, resolveSecretValue, type Db } from '@twt/domain';
import { encryption } from '@twt/domain';
import {
  checkMsg91Template,
  createMsg91PreflightMemo,
  createSmsAppClient,
  isMsg91TemplateId,
  MSG91_PREFLIGHT_FAULT_TTL_MS,
  MSG91_PREFLIGHT_TRANSIENT_TTL_MS,
  MSG91_PREFLIGHT_PASS_TTL_MS,
  resolveOtpTemplate,
  type Msg91PreflightObservation,
  type Msg91PreflightResult,
  type SmsFetchLike,
} from '@twt/channels';
import { consoleHelpdeskReplyNotifier } from '@twt/jobs';
import { createCloudflareTurnstileVerifier } from '@twt/edge';

import { createAuditLogSink, createKmsAuditHook } from './audit/audit-log-sink.js';
import type { ApiConfig } from './config.js';
import type { AppDeps, EncryptionDeps } from './context.js';
import { resolveMemberJwtKeys } from './modules/auth/member/jwt-keys.js';
import { createSmsDltStepUpDelivery } from './modules/auth/shared/sms-step-up-delivery.js';
import {
  createLogStepUpDelivery,
  type StepUpOtpDeliveryPort,
} from './modules/auth/shared/step-up-delivery.js';
import { noopTurnstileVerifier, type TurnstileVerifier } from './modules/auth/shared/turnstile.js';
import { createSimpleWebAuthnProvider } from './modules/auth/shared/webauthn.js';
import {
  SMS_REPORT_WEBHOOK_DISABLED,
  type SmsReportWebhookAuth,
} from './modules/channel-webhooks/msg91-sms-reports.js';
import {
  createDigiLockerProvider,
  createHttpDigiLockerTransport,
  createKycProviderRegistry,
  fixtureKycProvider,
  DIGILOCKER_PROVIDER_KEY,
  type DigiLockerProviderConfig,
  type KycProviderRegistry,
} from './modules/kyc/index.js';
import { createPgBossDataExportEnqueuer } from './modules/data-export/index.js';
import { createPgBossReportExportEnqueuer } from './modules/reports/index.js';
import { createPgBossReconciliationMatchEnqueuer } from './modules/reconciliation/index.js';
import { createPgBossNewsPublishEnqueuer } from './modules/news-blog/queue.js';
import { createPgBossSurveyPublishEnqueuer } from './modules/surveys/queue.js';
import { createPgBossModerationNotifyEnqueuer } from './modules/member-moderation/queue.js';
import { createPgBossClaimOcrParityEnqueuer } from './modules/claims/ocr-parity-queue.js';
import { createPgBossCycleSpawnEnqueuer } from './modules/claims/cycle-spawn-queue.js';
import {
  createGcsClaimDocumentStorage,
  createInMemoryBankIfscLookup,
  createLocalFsClaimDocumentStorage,
  createChromiumContributionNotePdfRenderer,
  createGcsBankStatementStorage,
  createLocalFsBankStatementStorage,
  createNoOpStatementScanner,
  createGcsSelfVerifyScreenshotStorage,
  createLocalFsSelfVerifyScreenshotStorage,
  createGcsHelpdeskAttachmentStorage,
  createLocalFsHelpdeskAttachmentStorage,
} from '@twt/platform-adapters';
import { resolveDeployTriggerFromEnv } from './modules/pariwar-provisioning/deploy-trigger.js';
import { consoleNiyamavaliAmendedHook } from './modules/rules/notification-hook.js';
import { consolePoolFixedAmountChangedHook } from './modules/pool-fixed-amount/notification-hook.js';
import { createToneReviewAuditSink } from './modules/tone-review/index.js';

/** Derive a deterministic 32-byte fake key from a label + the pepper (local/CI only). */
function deriveFakeKey(label: string, pepper: string): Uint8Array {
  return new Uint8Array(createHash('sha256').update(`${label}|${pepper}`).digest());
}

/**
 * Build the admin-identity encryption deps. Default `fake` provider (local/CI) is
 * keyed deterministically off the pepper so blind indexes are stable across a dev
 * session; `live` wires Cloud KMS with the configured key resource names.
 */
export function buildEncryptionDeps(pepper: string): EncryptionDeps {
  const mode = process.env['KMS_TEST_MODE'] ?? 'fake';
  if (mode === 'live') {
    const kekResource = process.env['ADMIN_KEK_RESOURCE_NAME'];
    const hmacResource = process.env['ADMIN_HMAC_RESOURCE_NAME'];
    const projectId = process.env['GOOGLE_CLOUD_PROJECT'];
    const location = process.env['ADMIN_KMS_LOCATION'];
    if (!kekResource || !hmacResource || !projectId || !location) {
      throw new Error(
        '[deps] KMS_TEST_MODE=live requires ADMIN_KEK_RESOURCE_NAME, ADMIN_HMAC_RESOURCE_NAME, ' +
          'GOOGLE_CLOUD_PROJECT, ADMIN_KMS_LOCATION',
      );
    }
    const kekRef = { resourceName: kekResource };
    const hmacKeyRef = { resourceName: hmacResource };
    return {
      kms: encryption.createCloudKmsProvider({ kekRef, hmacKeyRef, projectId, location }),
      kekRef,
      hmacKeyRef,
    };
  }
  if (mode !== 'fake') {
    throw new Error(`[deps] KMS_TEST_MODE must be 'fake' or 'live', got ${JSON.stringify(mode)}`);
  }
  return {
    kms: encryption.createFakeKmsProvider({
      kekBytes: deriveFakeKey('twt-admin-kek', pepper),
      hmacKeyBytes: deriveFakeKey('twt-admin-hmac', pepper),
    }),
    kekRef: { resourceName: 'fake:admin-kek' },
    hmacKeyRef: { resourceName: 'fake:admin-hmac' },
  };
}

/**
 * Select the Turnstile verifier from config (AC-2/AC-4). When a secret NAME is
 * configured, resolve the secret VALUE (Secret Manager in prod; env fallback locally
 * — the SAME `resolveSecretValue` path the argon2 pepper uses) and build the real
 * Cloudflare siteverify verifier; otherwise keep the no-op default so the stack runs
 * with ZERO Cloudflare config (local/CI/not-yet-provisioned). Fail-closed is the
 * verifier's default; `config.turnstile.failOpen` opts into degraded-mode pass-through.
 */
async function buildTurnstileVerifier(config: ApiConfig): Promise<TurnstileVerifier> {
  const secretName = config.turnstile.secretName;
  if (!secretName) return noopTurnstileVerifier;

  const secret = await resolveSecretValue(secretName, {
    envFallback: config.turnstile.secretEnvFallback,
  });
  if (!secret || secret.trim() === '') {
    throw new Error(
      `[deps] Turnstile secret resolved to an empty value — check Secret Manager secret ` +
        `'${secretName}' (or unset TURNSTILE_SECRET_NAME to use the no-op verifier)`,
    );
  }
  return createCloudflareTurnstileVerifier({ secret, failOpen: config.turnstile.failOpen });
}

/** The boot-log seam of {@link buildSmsReportWebhookAuth} (a test records it; default `console`). */
export interface SmsReportWebhookBootLog {
  warn(line: string): void;
  error(line: string): void;
}

/** A webhook token is usable when, trimmed, it is at least this long (DR1 — a 32-byte random token). */
export const SMS_REPORT_WEBHOOK_TOKEN_MIN_LENGTH = 32;

/**
 * Story 6.37b (DR1; `2026-10-17-347`; ADR-0042) — resolve MSG91's delivery-report webhook token(s) ONCE at boot. ⭐ The api
 * ALWAYS starts (refusing would restart-loop every route — 6.37 T13); only the webhook's state changes, per DR1's table:
 * - the current NAME unset ⇒ disabled (403 to everything); in production ONE warning (+ `next ignored` when a next NAME
 *   is set), elsewhere ⛔ line;
 * - the current NAME set but unreadable / blank / under 32 characters ⇒ disabled; ONE error naming the secret and the
 *   class (`unavailable` / `empty` / `too_short`), in every environment;
 * - the current usable ⇒ enabled on it; a next NAME set and usable ⇒ enabled on both; a next that fails as above ⇒
 *   the current only (a broken rotation half ⛔ disables a working token) + ONE error naming the next secret.
 * Lines carry secret NAMES only, ⛔ a value. Each state holds until the next restart (⛔ re-read at runtime).
 */
export async function buildSmsReportWebhookAuth(input: {
  readonly config: Pick<ApiConfig, 'nodeEnv' | 'smsReportWebhook'>;
  readonly resolveSecret: (secretName: string, opts: { envFallback: string }) => Promise<string>;
  readonly log?: SmsReportWebhookBootLog;
}): Promise<SmsReportWebhookAuth> {
  const { config, resolveSecret } = input;
  const log = input.log ?? { warn: (l: string) => console.warn(l), error: (l: string) => console.error(l) };
  const c = config.smsReportWebhook;
  const read = async (name: string, envFallback: string): Promise<{ token: string } | { failure: 'unavailable' | 'empty' | 'too_short' }> => {
    let value: string;
    try {
      value = await resolveSecret(name, { envFallback });
    } catch {
      return { failure: 'unavailable' };
    }
    const token = typeof value === 'string' ? value.trim() : '';
    if (token === '') return { failure: 'empty' };
    if (token.length < SMS_REPORT_WEBHOOK_TOKEN_MIN_LENGTH) return { failure: 'too_short' };
    return { token };
  };

  if (c.tokenSecretName === undefined) {
    if (config.nodeEnv === 'production') {
      log.warn(
        `[deps] sms report webhook disabled: SMS_REPORT_WEBHOOK_TOKEN_SECRET_NAME unset` +
          (c.nextTokenSecretName !== undefined ? ' (next ignored)' : ''),
      );
    }
    return SMS_REPORT_WEBHOOK_DISABLED;
  }
  const current = await read(c.tokenSecretName, c.tokenEnvFallback);
  if ('failure' in current) {
    log.error(`[deps] sms report webhook disabled: secret '${c.tokenSecretName}' ${current.failure}`);
    return SMS_REPORT_WEBHOOK_DISABLED;
  }
  if (c.nextTokenSecretName === undefined) return { current: current.token, next: null };
  const next = await read(c.nextTokenSecretName, c.nextTokenEnvFallback);
  if ('failure' in next) {
    log.error(`[deps] sms report webhook next token ignored: secret '${c.nextTokenSecretName}' ${next.failure}`);
    return { current: current.token, next: null };
  }
  return { current: current.token, next: next.token };
}

/**
 * Select the KYC provider registry from config (Story 3.3a, AC2/AC6). When the DigiLocker
 * secret NAMEs are configured, resolve the secret VALUES (Secret Manager in prod; env
 * fallback locally — the same `resolveSecretValue` path) and register the real DigiLocker
 * provider as active (with the fixture also registered, ready for an FR-58C swap);
 * otherwise the `fixtureKycProvider` is the sole + active provider so the stack boots with
 * ZERO live-govt config and CI never calls the real DigiLocker API. Mirrors
 * `buildTurnstileVerifier` (the optional-seam pattern).
 */
async function buildKycProviderRegistry(config: ApiConfig): Promise<KycProviderRegistry> {
  const dl = config.digilocker;
  if (!dl.clientIdSecretName || !dl.clientSecretSecretName) {
    return createKycProviderRegistry({
      activeProviderKey: 'fixture',
      builders: { fixture: () => fixtureKycProvider },
    });
  }

  const clientId = await resolveSecretValue(dl.clientIdSecretName, {
    envFallback: dl.clientIdEnvFallback,
  });
  const clientSecret = await resolveSecretValue(dl.clientSecretSecretName, {
    envFallback: dl.clientSecretEnvFallback,
  });
  if (!clientId.trim() || !clientSecret.trim()) {
    throw new Error(
      '[deps] DigiLocker client_id/client_secret resolved to an empty value — check Secret ' +
        'Manager (or unset DIGILOCKER_CLIENT_ID_SECRET_NAME to use the fixture provider)',
    );
  }

  const providerConfig: DigiLockerProviderConfig = {
    clientId,
    clientSecret,
    authorizeUrl: dl.authorizeUrl,
    tokenUrl: dl.tokenUrl,
    eaadhaarUrl: dl.eaadhaarUrl,
    redirectUri: dl.redirectUri,
    redirectUriAllowlist: dl.redirectUriAllowlist,
    httpTimeoutMs: dl.httpTimeoutMs,
    transactionTtlMs: dl.transactionTtlMs,
  };
  const transport = createHttpDigiLockerTransport(providerConfig);

  return createKycProviderRegistry({
    activeProviderKey: DIGILOCKER_PROVIDER_KEY,
    builders: {
      [DIGILOCKER_PROVIDER_KEY]: (ctx) =>
        createDigiLockerProvider(ctx, {
          config: providerConfig,
          transport,
          now: () => new Date(),
          onStalenessAlarm: (alarm) =>
            console.warn(
              `[kyc] DigiLocker cert staleness alarm: key=${alarm.keyId} age=${alarm.ageDays}d ` +
                '(within budget; refresh job degraded — see ADR-0026)',
            ),
        }),
      // The fixture stays registered as the second builder. ⚠ It is NOT flag-selectable today:
      // `alternateProviderKey` is unset, so `kyc_provider_selection` has nothing to switch to and
      // the flag read never executes (Review Pass 4 corrected this comment, which used to claim a
      // flip could select it "without a code change"). Deliberate — pointing a production provider
      // flip at a test double would be worse than an inert seam. See provider-registry.ts's header.
      fixture: () => fixtureKycProvider,
    },
  });
}

/** What `buildMemberStepUpDelivery` lets a test inject — so ⛔ test ever reaches MSG91 (Story 6.37 AC11, I7). */
export interface MemberStepUpDeliveryOptions {
  /** The MSG91 client's fetch (default: the global `fetch`). */
  readonly fetchImpl?: SmsFetchLike;
  /** Epoch milliseconds for the pre-flight memo (default `Date.now`). */
  readonly clock?: () => number;
  /** Where a boot / runtime pre-flight line goes (default `console.error` / `console.info`) — ⛔ the id, key or code. */
  readonly log?: { readonly error: (line: string) => void; readonly info: (line: string) => void };
}

/**
 * Build the MEMBER step-up / login OTP delivery port (Story 5.9, Task 5). Env-gated: the reveal/log stub in
 * dev/CI (local + tests complete the OTP flow without SMS — mirror the WA/push fixture-in-dev seam); the REAL
 * SMS adapter in prod. Prod FAILS STARTUP (BigDev 2026-07-07) when the MSG91 authkey or either OTP template id
 * resolves blank — a prod system that cannot deliver OTPs must not boot and pretend it can (do NOT reuse
 * `SmsAppClient.isConfigured()`, whose silent-fallback is the wrong posture here).
 * ⭐ Story 6.37 (MSG91 — `2026-10-17-345` MG4 / MG5 / MG10 / MG17; ADR-0041): the client is MSG91's (the sender id
 * and the old URL placeholder retired — the sender lives ON each template); a template id that is ⛔ MSG91's 24 hex
 * also REFUSES; and the BOOT PRE-FLIGHT reads both templates from MSG91 — `auth` / `auth_or_not_found` from the SEND
 * key (MG17 (a)) REFUSES TO START (⚠ under `restart: unless-stopped` a restart loop of EVERY route — T13 — so only a
 * fault that proves ⛔ code can be sent refuses); everything else (`content_mismatch`, `sms_type_needs_unicode`,
 * `dlt_id_missing`, a read-key refusal under MG17 (b), a transport failure) STARTS with an error log — alarm-only IN
 * THIS STORY (S1 — the canonicalisation is UNVERIFIED against MSG91's stored text; a later change may make it blocking
 * once roster Row 32 (e) records a real response). At runtime the memo is ADVISORY (the adapter triggers the re-check
 * off the request path; the memo's `check` reports a non-pass once per read — review round 2 P11). `options` lets a test inject the fetch (⛔ MSG91 from a test — I7).
 */
export async function buildMemberStepUpDelivery(
  config: ApiConfig,
  encryptionDeps: EncryptionDeps,
  serviceDb: Db,
  resolveChannelSecret: (secretName: string) => Promise<string>,
  options: MemberStepUpDeliveryOptions = {},
): Promise<StepUpOtpDeliveryPort> {
  const isProd = config.nodeEnv === 'production';
  if (!isProd) {
    // Dev/CI: no gateway credential required; reveal the code so local/tests complete the flow.
    return createLogStepUpDelivery({ revealForDev: true });
  }
  const log = options.log ?? { error: (line: string) => console.error(line), info: (line: string) => console.info(line) };

  // Prod: resolve the MSG91 authkey + both OTP template ids, then FAIL-FAST if any is blank or malformed (never a
  // silent reveal-stub fallback in prod).
  const authkey = config.sms.apiKeySecretName
    ? await resolveSecretValue(config.sms.apiKeySecretName, { envFallback: config.sms.apiKeyEnvFallback })
    : '';
  const loginTemplateId = (await resolveChannelSecret(resolveOtpTemplate('login').dltTemplateIdConfigKey)).trim();
  const stepUpTemplateId = (await resolveChannelSecret(resolveOtpTemplate('step_up').dltTemplateIdConfigKey)).trim();
  if (!authkey.trim() || !loginTemplateId || !stepUpTemplateId) {
    throw new Error(
      '[deps] production SMS OTP delivery requires the MSG91 authkey (SMS_GATEWAY_API_KEY_SECRET_NAME) and both OTP ' +
        'template ids (sms.dlt.template_id.otp_login / .otp_step_up) — one or more resolved to an empty value',
    );
  }
  if (!isMsg91TemplateId(loginTemplateId) || !isMsg91TemplateId(stepUpTemplateId)) {
    throw new Error(
      '[deps] production SMS OTP delivery: an OTP template id (sms.dlt.template_id.otp_login / .otp_step_up) is not a ' +
        "MSG91 template id (24 hex characters) — a DLT TE id pasted by mistake? (roster Row 32 (d))",
    );
  }
  // Round 2 P10 — one id under BOTH keys is provable here, with ⛔ read: one of the two texts is then wrong (the login text,
  // "Valid 5 min", for a 3-minute step-up code, or the reverse). `-345` MG5's refusal list does ⛔ name it ⇒ it STARTS with an
  // error log, as every other unproven template fault does (making it a refusal would need its own decision entry).
  if (loginTemplateId.toLowerCase() === stepUpTemplateId.toLowerCase()) {
    log.error(
      '[deps] msg91-preflight: sms.dlt.template_id.otp_login and .otp_step_up hold the SAME MSG91 template id — STARTING anyway ' +
        '(alarm-only: one of the two OTP texts is wrong; each has its own template — roster Row 32 (d))',
    );
  }
  // MG17 — an OPTIONAL template-read-only key; when its NAME is set it must resolve (a blank one REFUSES).
  const readKey = config.sms.preflightKeySecretName
    ? await resolveSecretValue(config.sms.preflightKeySecretName, { envFallback: config.sms.preflightKeyEnvFallback })
    : null;
  if (readKey !== null && !readKey.trim()) {
    throw new Error('[deps] SMS_GATEWAY_PREFLIGHT_KEY_SECRET_NAME is set but resolved to an empty value');
  }
  // A read key EQUAL to the send key IS the send key (round 2 P10) — its refusal then proves ⛔ code can be sent.
  const readsWithSendKey = readKey === null || readKey.trim() === authkey.trim();

  const client = createSmsAppClient({ apiOrigin: config.sms.apiOrigin, authkey }, options.fetchImpl);
  const reader = readsWithSendKey || readKey === null ? client : createSmsAppClient({ apiOrigin: config.sms.apiOrigin, authkey: readKey }, options.fetchImpl);
  const describe = (verdict: Exclude<Msg91PreflightResult, { ok: true }>): string =>
    verdict.transient && verdict.cause !== undefined ? `${verdict.reason}: ${verdict.cause}` : verdict.reason;
  // Named by the TEMPLATE the entry is (⛔ by the boot-time id — the adapter re-resolves the id at every send, so a rotated id
  // would be mis-named).
  const configKeyOf = (entry: { readonly text: string }): string =>
    resolveOtpTemplate(entry.text === resolveOtpTemplate('login').contentTemplate ? 'login' : 'step_up').dltTemplateIdConfigKey;
  // MG5 — at RUNTIME a non-pass is reported where it is COMPUTED (round 2 P11): once per fresh read — ⛔ on every OTP served
  // from the cache — and a transient that falls back to a stale pass is reported too (the memo then answers that pass).
  let booted = false;
  const memo = createMsg91PreflightMemo({
    check: async (entry, templateId) => {
      const runtimeReport = (what: string): void =>
        log.error(
          `[deps] msg91-preflight: ${configKeyOf(entry)} did not pass a runtime re-check (${what}) — ` +
            'advisory: OTP codes keep being sent (roster Row 32 (d) / (e))',
        );
      let verdict: Msg91PreflightResult;
      try {
        verdict = await checkMsg91Template(reader, entry, templateId, {
          log: (o: Msg91PreflightObservation) => log.info(`[deps] msg91-preflight ${JSON.stringify(o)}`),
        });
      } catch (err) {
        // The memo turns a throw into a `check_threw` transient — report it here, where it is still seen (⛔ silent).
        if (booted) runtimeReport('transient: check_threw');
        throw err;
      }
      if (booted && !verdict.ok) runtimeReport(describe(verdict));
      return verdict;
    },
    clock: options.clock ?? (() => Date.now()),
    passTtlMs: MSG91_PREFLIGHT_PASS_TTL_MS,
    faultTtlMs: MSG91_PREFLIGHT_FAULT_TTL_MS,
    transientTtlMs: MSG91_PREFLIGHT_TRANSIENT_TTL_MS,
  });

  // The BOOT pre-flight (MG5) — both templates, awaited.
  for (const intent of ['login', 'step_up'] as const) {
    const template = resolveOtpTemplate(intent);
    const id = intent === 'login' ? loginTemplateId : stepUpTemplateId;
    const verdict = await memo.get({ text: template.contentTemplate, slots: template.slots }, id);
    if (verdict.ok) continue;
    const key = template.dltTemplateIdConfigKey;
    if (!verdict.transient && (verdict.reason === 'auth' || verdict.reason === 'auth_or_not_found') && readsWithSendKey) {
      throw new Error(
        `[deps] production SMS OTP delivery: MSG91 refused the authkey or the template ${key} (${verdict.reason}) — ` +
          'no OTP could be sent (roster Row 32 (b) / (d))',
      );
    }
    log.error(
      `[deps] msg91-preflight: ${key} did not pass at boot (${describe(verdict)}) — STARTING anyway (alarm-only: ` +
        'the code is still sent; check the template in MSG91 — roster Row 32 (d) / (e))',
    );
  }
  booted = true;

  return createSmsDltStepUpDelivery({
    messaging: client.messaging(),
    // serviceDb (BYPASSRLS) — the step_up decrypt read is keyed by (pariwarId, memberId), the R2 pre-scope pattern.
    db: serviceDb,
    encryption: encryptionDeps,
    // Resolve the per-intent OTP template id NAME → value (send-time indirection; never hardcoded/logged).
    resolveConfig: (configKey: string) => resolveChannelSecret(configKey),
    // MG5 — ADVISORY at runtime: the adapter only triggers the re-check (off the request path); the memo's `check` above
    // reports a non-pass when it is computed; the code is still sent.
    preflight: { memo },
  });
}

/**
 * Production / local-dev deps. Builds its own pool (§1.1 per-workspace isolation)
 * and resolves the pepper. The caller owns the pool lifecycle via `deps.pool.end()`.
 */
export async function createDeps(config: ApiConfig): Promise<AppDeps> {
  const connectionString = await resolveConnectionString();
  const { db, pool } = createDb(connectionString);

  // Service pool for the audit-log writer (DD-3 / Story 1.10). In production a
  // distinct BYPASSRLS `twt_service`-login pool (SERVICE_DATABASE_URL); in dev/CI
  // it reuses the app pool (the superuser login already bypasses RLS). The live
  // SERVICE_DATABASE_URL credential is Terraform/Secret-Manager, apply-deferrable
  // (Story 1.5 D1-1.5 precedent). The caller ends `servicePool` only when it is a
  // distinct pool (see apps/api/src/index.ts).
  const serviceConnectionString = process.env['SERVICE_DATABASE_URL'];
  const serviceCreated = serviceConnectionString ? createDb(serviceConnectionString) : { db, pool };
  const servicePool = serviceCreated.pool;
  const serviceDb = serviceCreated.db;

  const pepper = await resolveSecretValue(config.argon2.pepperSecretName, {
    envFallback: config.argon2.pepperEnvFallback,
  });
  if (!pepper || pepper.trim() === '') {
    throw new Error(`[deps] Argon2id pepper resolved to an empty value — check Secret Manager secret '${config.argon2.pepperSecretName}'`);
  }

  const isProd = config.nodeEnv === 'production';

  // Build the encryption deps, then populate the KMS audit hook (D10-1.5) so KEK
  // wrap/unwrap + blind-index HMAC emit tamper-evident audit lines. Mutating the
  // provider's optional `auditHook` keeps buildEncryptionDeps (+ the test path
  // that reuses it) sink-free.
  const encryptionDeps = buildEncryptionDeps(pepper);
  encryptionDeps.kms.auditHook = createKmsAuditHook(servicePool);

  // Channel Secret-Manager resolver (Story 5.4) — resolves a NAME → value (Secret Manager in prod; a local
  // env fallback derived from the NAME). Hoisted so the Story 5.9 member OTP-delivery builder reuses it.
  const resolveChannelSecret = (secretName: string): Promise<string> =>
    resolveSecretValue(secretName, {
      envFallback: secretName.replace(/[^A-Za-z0-9]/g, '_').toUpperCase(),
    });

  return {
    config,
    db,
    pool,
    servicePool,
    serviceDb,
    encryption: encryptionDeps,
    pepper: Buffer.from(pepper, 'utf-8'),
    // The real FR-47 hash-chain sink (Story 1.10) replaces consoleAuthAuditSink.
    auditSink: createAuditLogSink(servicePool),
    // Tone-review sign-off / publish-blocked audit seam (Story 2.2) — same hash-chain
    // writer + service pool as auditSink, but the dedicated tone-review taxonomy.
    toneReviewAuditSink: createToneReviewAuditSink(servicePool),
    // MEMBER OTP delivery (Story 5.9) — real SMS-DLT adapter in prod (FAIL-STARTUP on missing credential),
    // reveal stub in dev/CI. Split from the admin key so the prod env-gate never routes admin through SMS.
    stepUpDelivery: await buildMemberStepUpDelivery(config, encryptionDeps, serviceDb, resolveChannelSecret),
    // ADMIN OTP delivery (Story 5.9, R4) — ALWAYS the reveal/log stub (admin OTP-over-SMS deferred; admins
    // carry email only, no mobile column). No env branch: reveal only outside prod.
    adminStepUpDelivery: createLogStepUpDelivery({ revealForDev: !isProd }),
    // Member access-token + signup-continuation JWT keypair (Story 3.2, §2.4) —
    // Secret Manager in prod; an ephemeral ES256 keypair in dev/CI.
    memberJwt: await resolveMemberJwtKeys(config),
    turnstile: await buildTurnstileVerifier(config),
    // Story 6.37b (DR1) — MSG91's delivery-report webhook token(s), boot-resolved; the api starts in every case.
    smsReportWebhook: await buildSmsReportWebhookAuth({ config, resolveSecret: resolveSecretValue }),
    webauthn: createSimpleWebAuthnProvider({
      rpId: config.webauthn.rpId,
      rpName: config.webauthn.rpName,
      expectedOrigin: config.webauthn.expectedOrigin,
    }),
    // Deploy seam (Story 1.15) — fake in dev/CI, Dokploy-API client in staging/prod.
    deployTrigger: resolveDeployTriggerFromEnv(config.deployTrigger.mode),
    // Member-notification scaffolding hook (Story 2.4, AC3) — console placeholder
    // until Epic 5 wires the real niyamavali.amended push fan-out.
    niyamavaliAmendedHook: consoleNiyamavaliAmendedHook,
    // Member-notification scaffolding hook (Story 7.5) — console placeholder until Epic 5
    // wires the real fixed-amount-changed push fan-out.
    poolFixedAmountChangedHook: consolePoolFixedAmountChangedHook,
    // Helpdesk reply member-notification seam (Story 10.4, AC3) — the log-only fixture default (builds
    // the helpdesk_reply Alert + resolves the deep-link + logs it). The member-targeting fan-out
    // (createHelpdeskReplyFanOutNotifier) needs MEMBER field crypto, which this admin-request path lacks
    // — that upgrade is the documented forward seam.
    helpdeskReplyNotifier: consoleHelpdeskReplyNotifier,
    // KYC provider registry + FR-58C swap seam (Story 3.3a) — DigiLocker when configured,
    // else the fixture provider (boots with zero live-govt config).
    kycProviders: await buildKycProviderRegistry(config),
    // Data-export build-job producer (Story 3.11) — the FIRST api-side queue producer (send-only). Uses
    // the same DB connection string as the app pool (pgboss schema; apps/jobs already created it).
    dataExportQueue: await createPgBossDataExportEnqueuer(connectionString),
    // Reports-&-exports library build-job producer (Story 10.7) — send-only. The POST …/admin/reports
    // route enqueues a REPORT_EXPORT_BUILD job after inserting the pending row. Same connection string
    // as the app pool (pgboss schema; apps/jobs already created it).
    reportExportQueue: await createPgBossReportExportEnqueuer(connectionString),
    // Reconciliation UTR-matcher job producer (Story 9.4, Decision D7 — the enqueue-primary latency
    // optimizer). Send-only; the reconciliation upload route enqueues a RECONCILIATION_MATCH job for the
    // pool's cycle POST-COMMIT (best-effort). Same connection string as the app pool (pgboss schema).
    reconciliationMatchQueue: await createPgBossReconciliationMatchEnqueuer(connectionString),
    // News/Blog publish job producer (Story 10.5, Task 5) — send-only. The schedule route enqueues a
    // DELAYED NEWS_PUBLISH job; the immediate publish route enqueues a zero-delay one. The apps/jobs
    // worker owns the audience fan-out (crypto boundary). Same connection string as the app pool.
    newsPublishQueue: await createPgBossNewsPublishEnqueuer(connectionString),
    // Survey publish fan-out producer (Story 10.15, Task 6 / AC8) — send-only. The publish route
    // enqueues a zero-delay SURVEY_PUBLISH job AFTER the transition; the apps/jobs worker owns the
    // member fan-out (crypto boundary). ⚠ No delayed form and no `mode`, unlike news: a survey has no
    // scheduled-publish TRANSITION — a future `valid_from` just reads as `scheduled` off a published
    // row, because the window is a pure read-time derivation with no sweep.
    surveyPublishQueue: await createPgBossSurveyPublishEnqueuer(connectionString),
    // Story 10.10 (AC8) — the moderation-notice producer. Send-only; apps/jobs owns the fan-out.
    moderationNotifyQueue: await createPgBossModerationNotifyEnqueuer(connectionString),
    // Claim-document object store (Story 6.5, Decision D1) — the live GCS adapter when
    // CLAIM_DOCUMENT_BUCKET is set (private bucket, asia-south1), else a shared local-disk
    // fake (dev/CI — no live bucket). The bytes never touch Postgres; only the object key +
    // Tier-1 metadata persist (the OCR job writes that row). MUST be a shared filesystem
    // fake, not an in-process Map: apps/api and apps/jobs are separate processes, so a
    // per-process in-memory store is invisible to the other (a real local upload would 404
    // in the OCR job). The local-fs fake resolves to the same fixed temp directory in both
    // processes with no extra config.
    claimDocumentStorage: process.env['CLAIM_DOCUMENT_BUCKET']
      ? createGcsClaimDocumentStorage({
          bucketName: process.env['CLAIM_DOCUMENT_BUCKET'],
          ...(process.env['GOOGLE_CLOUD_PROJECT']
            ? { projectId: process.env['GOOGLE_CLOUD_PROJECT'] }
            : {}),
        })
      : createLocalFsClaimDocumentStorage(),
    // Bank-statement object store (Story 9.3, Decision D3) — a NEW port instance (the 6.5 PATTERN, not a
    // claim-document reuse): the live GCS adapter when BANK_STATEMENT_BUCKET is set (private bucket,
    // asia-south1, Tier-1 encrypted at rest — ADR-0034), else a shared local-disk fake (dev/CI). The raw
    // statement bytes live in the blob store; only the object key + provenance metadata persist (as the
    // reconciliation.statement-uploaded event — no PII rows, Decision D2). Same shared-filesystem-fake
    // reasoning as claimDocumentStorage (a future apps/jobs matcher re-reads the blob by key, D2).
    bankStatementStorage: process.env['BANK_STATEMENT_BUCKET']
      ? createGcsBankStatementStorage({
          bucketName: process.env['BANK_STATEMENT_BUCKET'],
          ...(process.env['GOOGLE_CLOUD_PROJECT']
            ? { projectId: process.env['GOOGLE_CLOUD_PROJECT'] }
            : {}),
        })
      : createLocalFsBankStatementStorage(),
    // Self-verify screenshot object store (Story 9.7, Decision D1) — a NEW port instance (the 6.5/9.3
    // PATTERN, not a reuse): the live GCS adapter when SELF_VERIFY_SCREENSHOT_BUCKET is set (private
    // bucket, asia-south1, Tier-1 encrypted at rest), else a shared local-disk fake (dev/CI). Only the
    // object key + the mismatch reference persist (as the reconciliation.self-verify-screenshot-uploaded
    // event — no PII rows, Decision D2). Same shared-filesystem-fake reasoning as bankStatementStorage.
    selfVerifyScreenshotStorage: process.env['SELF_VERIFY_SCREENSHOT_BUCKET']
      ? createGcsSelfVerifyScreenshotStorage({
          bucketName: process.env['SELF_VERIFY_SCREENSHOT_BUCKET'],
          ...(process.env['GOOGLE_CLOUD_PROJECT']
            ? { projectId: process.env['GOOGLE_CLOUD_PROJECT'] }
            : {}),
        })
      : createLocalFsSelfVerifyScreenshotStorage(),
    // Helpdesk-attachment object store (Story 10.2, AC6) — a NEW port instance (the 6.5/9.3 PATTERN,
    // not a reuse): the live GCS adapter when HELPDESK_ATTACHMENT_BUCKET is set (private bucket,
    // asia-south1), else a shared local-disk fake (dev/CI). The bytes never touch Postgres; only the
    // object key + PII-safe metadata (filename/content_type/size) persist on the ticket's JSONB
    // attachments[]. Same shared-filesystem-fake reasoning as the sibling stores.
    helpdeskAttachmentStorage: process.env['HELPDESK_ATTACHMENT_BUCKET']
      ? createGcsHelpdeskAttachmentStorage({
          bucketName: process.env['HELPDESK_ATTACHMENT_BUCKET'],
          ...(process.env['GOOGLE_CLOUD_PROJECT']
            ? { projectId: process.env['GOOGLE_CLOUD_PROJECT'] }
            : {}),
        })
      : createLocalFsHelpdeskAttachmentStorage(),
    // Bank-statement virus-scan seam (Story 9.3, Task 4 / architecture §3.6 "quarantine") — abstraction-
    // first: a no-op/allow-all fake in v1 (no real ClamAV vendor exists yet — the 6.5 `OcrProvider`
    // "no boundary gate until a real vendor" posture). The scan runs BEFORE store+parse in the upload core.
    // Story 9.7 reuses this SAME scanner for the self-verify screenshot upload (no new scanner port).
    statementScanner: createNoOpStatementScanner(),
    // Contribution-Note PDF renderer (Story 8.7, D1) — headless Chromium behind the
    // `ContributionNotePdfRenderer` port. `puppeteer-core` brings NO bundled binary: the deployable
    // image installs the distro `chromium` package, and CHROMIUM_EXECUTABLE_PATH points at it (a local
    // Chrome/Chromium in dev). The browser is created LAZILY on the first Note render, so an instance
    // that never serves one never pays for it.
    contributionNotePdfRenderer: createChromiumContributionNotePdfRenderer(
      process.env['CHROMIUM_EXECUTABLE_PATH']
        ? { executablePath: process.env['CHROMIUM_EXECUTABLE_PATH'] }
        : {},
    ),
    // Claim OCR + parity job producer (Story 6.5) — send-only, same DB connection string as the
    // app pool (pgboss schema; apps/jobs already created it).
    claimOcrParityQueue: await createPgBossClaimOcrParityEnqueuer(connectionString),
    // Pool-spawn parent-job producer (Story 7.3) — the real post-commit trigger, send-only, same DB
    // connection string as the app pool (pgboss schema; apps/jobs already created it). Replaces the
    // Story 6.13 console stub at the composition root.
    poolSpawnQueue: await createPgBossCycleSpawnEnqueuer(connectionString),
    // IFSC bank-lookup port (Story 6.8, D4) — the in-memory stub (fixture + cache). A real-vendor
    // adapter (a bundled IFSC dataset / public IFSC API) is a future seam; no live config booted here.
    bankIfscLookup: createInMemoryBankIfscLookup(),
    // Channel Secret-Manager resolver (Story 5.4) — resolves a per-Pariwar WA webhook credential NAME →
    // value. Local dev falls back to an env var derived from the NAME (non-alphanumerics → `_`, uppercased),
    // the SAME resolveSecretValue path the argon2 pepper / DigiLocker secrets use; prod uses Secret Manager.
    resolveChannelSecret,
    clock: () => new Date(),
  };
}
