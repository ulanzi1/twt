// apps/jobs/src/boot.ts — pg-boss worker runtime entrypoint (Story 1.12, Task 5;
// AC-1 / AC-3 / AC-5; DD-3 / DD-4).
//
// The long-lived worker process for the @twt/jobs workspace. Unlike the one-shot
// CLIs (audit:mirror, audit:verify-integrity), this stays UP: it constructs the
// canonical pg-boss client, starts it (creating the `pgboss` schema on first run),
// registers the queues it serves + their workers, schedules crons, exposes a health
// endpoint, and drains gracefully on SIGTERM. It is the copy-me reference every
// downstream queue consumer follows (the runbook documents the pattern).
//
// ── Connection (DD-3, copied from integrity-cli.ts) ───────────────────────────
// SERVICE_DATABASE_URL (the BYPASSRLS service login) in prod; resolveConnectionString()
// locally. pg-boss manages its OWN pool from the connection string (via @twt/queue's
// createQueueClient); a SEPARATE small createDb pool handles domain-table work (the
// TTL vacuum's DELETE), since pg-boss does not expose our tables.
//
// ── This story's only consumer: the idempotency TTL vacuum (AC-5) ─────────────
// A real, self-contained pg-boss cron with no external dependencies — it proves the
// cron + worker-registration substrate end-to-end (architecture §1.4's named "TTL
// cleanup via pg-boss-scheduled vacuum job"). The mirror (D2-1.10) + integrity
// (D3-1.11a) cron graduations stay DEFERRED (DD-4) — they need a durable watermark
// table + prod creds this story does not build.
//
// ── NOT merged into src/index.ts ──────────────────────────────────────────────
// index.ts is the apps/api-facing barrel (verifyAuditChain + observability). boot.ts
// is a separate runtime entrypoint so importing the barrel never pulls pg-boss into
// apps/api. The Dockerfile CMD points at dist/src/boot.js.

import http from 'node:http';

import {
  createDb,
  idempotency,
  pool as poolDomain,
  resolveConnectionString,
  resolveSecretValue,
  validityCache,
} from '@twt/domain';
import {
  QUEUE_NAMES,
  createQueueClient,
  stopQueueClient,
  type Job,
  type JobEnvelope,
} from '@twt/queue';

import {
  CERT_REFRESH_TZ,
  DEFAULT_CERT_REFRESH_CRON,
  createEnvCertFetcher,
  registerDigiLockerCertRefreshCron,
} from './digilocker-cert-refresh.js';
import {
  DATA_EXPORT_VACUUM_TZ,
  DEFAULT_DATA_EXPORT_VACUUM_CRON,
  registerDataExportWorkers,
} from './data-export.js';
import { buildJobsEncryptionDeps } from './deps.js';
import {
  DEFAULT_RENEWAL_LIFECYCLE_CRON,
  RENEWAL_LIFECYCLE_TZ,
  registerMemberRenewalLifecycleCron,
} from './member-renewal-lifecycle.js';
import {
  DEFAULT_DEVICE_TOKEN_CLEANUP_CRON,
  DEVICE_TOKEN_CLEANUP_TZ,
  registerDeviceTokenCleanupCron,
} from './device-token-cleanup.js';
import {
  DEFAULT_WA_WEBHOOK_PROCESSOR_CRON,
  WA_WEBHOOK_PROCESSOR_TZ,
  registerWaWebhookProcessorCron,
} from './wa-webhook-processor.js';
import {
  DEFAULT_TELEGRAM_WEBHOOK_PROCESSOR_CRON,
  TELEGRAM_WEBHOOK_PROCESSOR_TZ,
  registerTelegramWebhookProcessorCron,
} from './tg-webhook-processor.js';
import { registerClaimOcrParityWorker } from './claim-ocr-parity.js';
import {
  DEFAULT_PEER_MESH_WINDOW_SECONDS,
  registerClaimPeerMeshWorkers,
  type ClaimPeerMeshSelectPayload,
} from './claim-peer-mesh.js';
import {
  registerClaimShepherdAssignWorker,
  type ClaimShepherdAssignPayload,
} from './claim-shepherd-assign.js';
import { createAssignableRosterResolver } from './assignable-roster.js';
import { DEFAULT_CHILD_LOCAL_CONCURRENCY, registerCycleSpawnWorkers } from './cycle-spawn.js';
import { enqueueCycleOpenAlert, registerCycleOpenAlertWorkers } from './scheduler/cycle-open-alert.js';
import {
  enqueueContributionNotifyCycleOpen,
  registerContributionNotifyWorkers,
} from './scheduler/contribution-notify-triggers.js';
import { buildContributionProviderResolver } from './scheduler/contribution-providers.js';
import { createConfigShepherdFallbackResolver } from './shepherd-fallback-resolver.js';
import { consoleShepherdAssignedNotificationHook } from './shepherd-notification-hook.js';
import { createDeterministicOcrProvider } from './ocr/index.js';
import {
  createGcsClaimDocumentStorage,
  createLocalFsClaimDocumentStorage,
} from '@twt/platform-adapters';
// Story 8.8 — the audit sink + the PII-safe rendered-message HMAC the live fan-out dispatches through.
import { createAuditPort, createRenderedMessageHash } from '@twt/channels';

// Health endpoint + drain knobs. Ports/timeouts are operations policy; these are
// sane placeholders overridable via env.
const HEALTH_PORT = Number(process.env['HEALTH_PORT'] ?? process.env['PORT'] ?? 8080);
const SHUTDOWN_TIMEOUT_MS = Number(process.env['JOBS_SHUTDOWN_TIMEOUT_MS'] ?? 30_000);
// Hourly TTL vacuum by default (IST). Cadence is operations policy — overridable.
const VACUUM_CRON = process.env['IDEMPOTENCY_VACUUM_CRON'] ?? '0 * * * *';
// IST timezone for the cron — do NOT repeat the UTC-cron foot-gun the
// nightly-integrity workflow documents (architecture §scheduling).
const VACUUM_TZ = 'Asia/Kolkata';
// Daily DigiLocker cert refresh (Story 3.3b, AC5.2). Cadence is operations policy (IST).
const CERT_REFRESH_CRON = process.env['DIGILOCKER_CERT_REFRESH_CRON'] ?? DEFAULT_CERT_REFRESH_CRON;
// Daily renewal-lifecycle tick (Story 3.8, AC1/AC3). Cadence is operations policy (IST).
const RENEWAL_LIFECYCLE_CRON =
  process.env['MEMBER_RENEWAL_LIFECYCLE_CRON'] ?? DEFAULT_RENEWAL_LIFECYCLE_CRON;
// Data-export hygiene vacuum (Story 3.11, AC5). Cadence is operations policy (IST).
const DATA_EXPORT_VACUUM_CRON =
  process.env['DATA_EXPORT_VACUUM_CRON'] ?? DEFAULT_DATA_EXPORT_VACUUM_CRON;
// Push device-token stale/invalid cleanup (Story 5.2, AC5). Cadence is operations policy (IST).
const DEVICE_TOKEN_CLEANUP_CRON =
  process.env['DEVICE_TOKEN_CLEANUP_CRON'] ?? DEFAULT_DEVICE_TOKEN_CLEANUP_CRON;
// WhatsApp inbound-webhook processing + opt-in expiry sweep (Story 5.4, AC3/AC4). Near-real-time (every
// minute by default) so opt-in confirmation is prompt. Cadence is operations policy (IST).
const WA_WEBHOOK_PROCESSOR_CRON =
  process.env['WA_WEBHOOK_PROCESSOR_CRON'] ?? DEFAULT_WA_WEBHOOK_PROCESSOR_CRON;
const TELEGRAM_WEBHOOK_PROCESSOR_CRON =
  process.env['TELEGRAM_WEBHOOK_PROCESSOR_CRON'] ?? DEFAULT_TELEGRAM_WEBHOOK_PROCESSOR_CRON;
// Validity-cache GC sweep (Story 4.8, Task 4). Every 15 min by default (IST). Storage hygiene ONLY.
const VALIDITY_CACHE_GC_CRON = process.env['VALIDITY_CACHE_GC_CRON'] ?? '*/15 * * * *';
// Rows older than this (default the 10× TTL constant) are reclaimed. Overridable like the cron cadences.
const VALIDITY_CACHE_GC_MAX_AGE_SECONDS = Number(
  process.env['VALIDITY_CACHE_GC_MAX_AGE_SECONDS'] ?? validityCache.VALIDITY_CACHE_GC_MAX_AGE_SECONDS,
);
// Peer-mesh response window (Story 6.6, FR-39 default 72h). Seconds; overridable. ONE named
// config value — never a hardcoded `72h` inline (the select job enqueues the window job with
// startAfter = this).
const PEER_MESH_WINDOW_SECONDS = Number(
  process.env['CLAIM_PEER_MESH_WINDOW_SECONDS'] ?? DEFAULT_PEER_MESH_WINDOW_SECONDS,
);
// Story 7.5 RETIRED the boot-time POOL_SPAWN_FIXED_AMOUNT_INR env constant from the live saga: the
// spawn planner now resolves the fixed amount from the per-Pariwar effective-dated schedule at the
// cycle-freeze `committed_at` (pool/fixed-amount.ts). The genesis amount is seeded at Pariwar
// provisioning (apps/api pariwar-provisioning), NOT threaded from this worker's env.
// CYCLE_SPAWN_CHILD worker count (Story 7.3, Task 5) — pg-boss `localConcurrency` for the child
// queue. The natural unit of work is one child job, so scaling is via worker count, not batch
// size. Named config value (never an inline magic number).
const POOL_SPAWN_CHILD_CONCURRENCY = Number(
  process.env['POOL_SPAWN_CHILD_CONCURRENCY'] ?? DEFAULT_CHILD_LOCAL_CONCURRENCY,
);

/** The single error helper — every fatal/uncaught path logs code + message only. */
function logError(scope: string, err: unknown): void {
  const e = err as Error & { code?: string };
  console.error(`[jobs:${scope}]`, e?.code ?? 'NO_CODE', e?.message ?? String(err));
}

async function main(): Promise<void> {
  // Validate numeric env overrides before any resource allocation (NaN from a
  // non-numeric string would reach listen() or stop() with undefined behaviour).
  if (!Number.isInteger(HEALTH_PORT) || HEALTH_PORT < 1 || HEALTH_PORT > 65535) {
    throw new RangeError(
      `[jobs] HEALTH_PORT / PORT must be an integer 1–65535 (got ${HEALTH_PORT})`,
    );
  }
  if (!Number.isFinite(SHUTDOWN_TIMEOUT_MS) || SHUTDOWN_TIMEOUT_MS < 0) {
    throw new RangeError(
      `[jobs] JOBS_SHUTDOWN_TIMEOUT_MS must be a non-negative number (got ${SHUTDOWN_TIMEOUT_MS})`,
    );
  }
  // Basic 5-field cron sanity check — reject obviously invalid values before
  // boss.start() so the failure surfaces before the worker is registered.
  if (!/^(\S+\s+){4}\S+$/.test(VACUUM_CRON.trim())) {
    throw new RangeError(
      `[jobs] IDEMPOTENCY_VACUUM_CRON must be a 5-field cron expression (got "${VACUUM_CRON}")`,
    );
  }
  if (!/^(\S+\s+){4}\S+$/.test(CERT_REFRESH_CRON.trim())) {
    throw new RangeError(
      `[jobs] DIGILOCKER_CERT_REFRESH_CRON must be a 5-field cron expression (got "${CERT_REFRESH_CRON}")`,
    );
  }
  if (!/^(\S+\s+){4}\S+$/.test(RENEWAL_LIFECYCLE_CRON.trim())) {
    throw new RangeError(
      `[jobs] MEMBER_RENEWAL_LIFECYCLE_CRON must be a 5-field cron expression (got "${RENEWAL_LIFECYCLE_CRON}")`,
    );
  }
  if (!/^(\S+\s+){4}\S+$/.test(VALIDITY_CACHE_GC_CRON.trim())) {
    throw new RangeError(
      `[jobs] VALIDITY_CACHE_GC_CRON must be a 5-field cron expression (got "${VALIDITY_CACHE_GC_CRON}")`,
    );
  }
  if (!Number.isFinite(VALIDITY_CACHE_GC_MAX_AGE_SECONDS) || VALIDITY_CACHE_GC_MAX_AGE_SECONDS <= 0) {
    throw new RangeError(
      `[jobs] VALIDITY_CACHE_GC_MAX_AGE_SECONDS must be a positive number (got ${VALIDITY_CACHE_GC_MAX_AGE_SECONDS})`,
    );
  }
  if (!Number.isFinite(PEER_MESH_WINDOW_SECONDS) || PEER_MESH_WINDOW_SECONDS <= 0) {
    throw new RangeError(
      `[jobs] CLAIM_PEER_MESH_WINDOW_SECONDS must be a positive number (got ${PEER_MESH_WINDOW_SECONDS})`,
    );
  }
  if (!Number.isInteger(POOL_SPAWN_CHILD_CONCURRENCY) || POOL_SPAWN_CHILD_CONCURRENCY <= 0) {
    throw new RangeError(
      `[jobs] POOL_SPAWN_CHILD_CONCURRENCY must be a positive integer (got ${POOL_SPAWN_CHILD_CONCURRENCY})`,
    );
  }
  if (!/^(\S+\s+){4}\S+$/.test(DATA_EXPORT_VACUUM_CRON.trim())) {
    throw new RangeError(
      `[jobs] DATA_EXPORT_VACUUM_CRON must be a 5-field cron expression (got "${DATA_EXPORT_VACUUM_CRON}")`,
    );
  }
  if (!/^(\S+\s+){4}\S+$/.test(DEVICE_TOKEN_CLEANUP_CRON.trim())) {
    throw new RangeError(
      `[jobs] DEVICE_TOKEN_CLEANUP_CRON must be a 5-field cron expression (got "${DEVICE_TOKEN_CLEANUP_CRON}")`,
    );
  }
  if (!/^(\S+\s+){4}\S+$/.test(WA_WEBHOOK_PROCESSOR_CRON.trim())) {
    throw new RangeError(
      `[jobs] WA_WEBHOOK_PROCESSOR_CRON must be a 5-field cron expression (got "${WA_WEBHOOK_PROCESSOR_CRON}")`,
    );
  }
  if (!/^(\S+\s+){4}\S+$/.test(TELEGRAM_WEBHOOK_PROCESSOR_CRON.trim())) {
    throw new RangeError(
      `[jobs] TELEGRAM_WEBHOOK_PROCESSOR_CRON must be a 5-field cron expression (got "${TELEGRAM_WEBHOOK_PROCESSOR_CRON}")`,
    );
  }

  const connectionString = process.env['SERVICE_DATABASE_URL'] ?? (await resolveConnectionString());

  // pg-boss client (manages its own pool from the connection string).
  const boss = createQueueClient(connectionString, { applicationName: 'twt-jobs' });

  // Separate light pool for domain-table maintenance (the vacuum DELETE + the data-export scope-txs).
  // max:2 — the integrity-cli.ts service-pool precedent.
  const { db, pool } = createDb(connectionString, { max: 2, logger: false });

  // ── Data-export KMS deps (Story 3.11) — the FIRST apps/jobs crypto wiring ──────
  // Resolve the Argon2id pepper (fake-KMS mode derives the KEK from it; live mode ignores it) via the
  // same Secret-Manager-name-with-env-fallback path apps/api uses, so the fake KEK is byte-identical to
  // the api's (required for the api↔jobs encrypt/decrypt round-trip). In live mode the pepper is unused.
  const pepperSecretName = process.env['ARGON2_PEPPER_SECRET_NAME'];
  const pepper = pepperSecretName
    ? await resolveSecretValue(pepperSecretName, {
        envFallback: process.env['ARGON2_PEPPER_ENV_FALLBACK'] ?? 'ARGON2_PEPPER',
      })
    : (process.env['ARGON2_PEPPER'] ?? '');
  const jobsEncryption = buildJobsEncryptionDeps(pepper);

  let shuttingDown = false;
  let ready = false;
  // AI-8-3 — the contribution-loop provider registry teardown (the per-Pariwar Firebase App cache holds the
  // only channel-client resources; the fetch-based WA/Telegram/SMS clients hold nothing). Assigned once the
  // wiring is built inside the startup try-block; drained on SIGTERM alongside pool.end().
  let contributionProvidersTeardown: (() => Promise<void>) | null = null;

  // Health-check endpoint (architecture §5.9): 200 once started and not draining,
  // 503 otherwise. A container restart key + load-balancer readiness probe.
  const healthServer = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/healthz') {
      const healthy = ready && !shuttingDown;
      res.writeHead(healthy ? 200 : 503, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ status: healthy ? 'ok' : 'unavailable' }));
      return;
    }
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ status: 'not_found' }));
  });

  // Graceful SIGTERM drain with a named timeout (architecture §5.9). Idempotent —
  // a second signal during drain is ignored.
  async function shutdown(signal: string): Promise<void> {
    if (shuttingDown) return;
    shuttingDown = true;
    console.info(
      `[jobs] received ${signal} — draining (graceful stop, ${SHUTDOWN_TIMEOUT_MS}ms) …`,
    );
    try {
      await stopQueueClient(boss, { timeoutMs: SHUTDOWN_TIMEOUT_MS });
    } catch (err) {
      logError('shutdown', err);
      process.exitCode = 1;
    }
    await new Promise<void>((resolve) => healthServer.close(() => resolve()));
    if (contributionProvidersTeardown) {
      await contributionProvidersTeardown().catch((err: unknown) => logError('channel-providers-teardown', err));
    }
    await pool.end().catch((err: unknown) => logError('pool-end', err));
    console.info('[jobs] shutdown complete');
    process.exit(process.exitCode ?? 0);
  }

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });

  // Wrap the startup sequence: if any step throws after pool + boss are created,
  // clean them up before re-throwing so the process exits without leaked handles.
  try {
    // Start the boss — creates the `pgboss` schema on first run (the connection role
    // needs CREATE on the DB; CI's superuser has it — see the runbook for prod).
    await boss.start();

    // ── TTL-vacuum queue + worker + cron (AC-5) ───────────────────────────────
    // createQueue() is required before work()/schedule() in v12.
    await boss.createQueue(QUEUE_NAMES.IDEMPOTENCY_VACUUM);

    // v12: the handler receives an ARRAY of jobs even at batchSize 1 — iterate. The
    // vacuum is a single idempotent DELETE regardless of how many trigger jobs
    // coalesced; returning a value stores it in the job `output`, an unhandled throw
    // auto-fails + retries.
    await boss.work(QUEUE_NAMES.IDEMPOTENCY_VACUUM, async (jobs: Job[]) => {
      const deleted = await idempotency.purgeExpiredKeys(pool);
      console.info('[jobs] idempotency-vacuum', JSON.stringify({ jobs: jobs.length, deleted }));
      return { deleted };
    });

    // Schedule the vacuum cron in IST.
    await boss.schedule(QUEUE_NAMES.IDEMPOTENCY_VACUUM, VACUUM_CRON, {}, { tz: VACUUM_TZ });

    // ── Validity-cache GC sweep queue + worker + cron (Story 4.8, Task 4) ──────
    // A single idempotent DELETE of member_validity_cache rows older than the GC threshold — storage
    // hygiene ONLY (expired rows are already unservable via the read-path TTL guard; this reclaims the
    // rows orphaned by amendment epoch bumps + member-state changes). Runs on the BYPASSRLS service `pool`
    // so it sweeps across all tenants (member_validity_cache is FORCE-RLS). Mirrors IDEMPOTENCY_VACUUM.
    await boss.createQueue(QUEUE_NAMES.VALIDITY_CACHE_GC);
    await boss.work(QUEUE_NAMES.VALIDITY_CACHE_GC, async (jobs: Job[]) => {
      const deleted = await validityCache.purgeExpiredValidityCache(pool, VALIDITY_CACHE_GC_MAX_AGE_SECONDS);
      console.info('[jobs] validity-cache-gc', JSON.stringify({ jobs: jobs.length, deleted }));
      return { deleted };
    });
    await boss.schedule(QUEUE_NAMES.VALIDITY_CACHE_GC, VALIDITY_CACHE_GC_CRON, {}, { tz: VACUUM_TZ });

    // ── DigiLocker daily cert-refresh cron (Story 3.3b, AC5.2 / ADR-0026 Category-5) ──
    // Reuses the @twt/domain `refreshDigiLockerCerts` primitive (R6) with a config-gated
    // fetcher; bumps `fetched_at`. Not fail-closed (§2.8) — a refresh failure alarms + leaves
    // the last-good cert in place within budget.
    await registerDigiLockerCertRefreshCron(
      boss,
      { db, fetcher: createEnvCertFetcher() },
      { cron: CERT_REFRESH_CRON, tz: CERT_REFRESH_TZ },
    );

    // ── Renewal-lifecycle daily cron (Story 3.8, AC1/AC3) ─────────────────────
    // The FIRST emitter of the member grace transitions (valid_through_reached / grace_entered /
    // grace_expired) over an indexed candidate scan + the renewal-reminder nudge producer. Uses the
    // domain-table `pool` directly (per-candidate scope txs). IST.
    await registerMemberRenewalLifecycleCron(
      boss,
      { pool },
      { cron: RENEWAL_LIFECYCLE_CRON, tz: RENEWAL_LIFECYCLE_TZ },
    );

    // ── Data-export build worker + hygiene vacuum (Story 3.11, AC1/AC5) ────────
    // The FIRST request-path-triggered worker (the API enqueues DATA_EXPORT_BUILD) + the FIRST apps/jobs
    // KMS consumer. The build worker opens per-request scope-txs on `pool`; the vacuum runs cross-tenant
    // on `pool` (BYPASSRLS service login). IST cron.
    await registerDataExportWorkers(
      boss,
      { pool, kms: jobsEncryption.kms, kekRef: jobsEncryption.kekRef },
      { vacuumCron: DATA_EXPORT_VACUUM_CRON, vacuumTz: DATA_EXPORT_VACUUM_TZ },
    );

    // ── Push device-token stale/invalid cleanup cron (Story 5.2, AC5) ──────────
    // Prunes member_device_tokens that are stale past 7d / invalid past 30d (provisional defaults) on
    // the BYPASSRLS service `pool` (cross-tenant). Mirrors DIGILOCKER_CERT_REFRESH's registration shape.
    await registerDeviceTokenCleanupCron(
      boss,
      { pool },
      { cron: DEVICE_TOKEN_CLEANUP_CRON, tz: DEVICE_TOKEN_CLEANUP_TZ },
    );

    // ── WhatsApp inbound-webhook processor + opt-in expiry sweep (Story 5.4, AC3/AC4) ──
    // Drains wa_inbound_webhook_events: inbound match → ACTIVE + consent + 24h window, STOP → REVOKED,
    // Meta block → BLOCKED_BY_META, status callbacks → 5.3's mapMetaStatus/upsertWaSendStatus; plus the
    // stale-PENDING / past-window sweep → EXPIRED_24H_WINDOW. Uses the member-family hmac key (same
    // by-value parallel as the api) for the mobile blind-index match. Cross-tenant on the service `pool`.
    await registerWaWebhookProcessorCron(
      boss,
      { pool, db, enc: { kms: jobsEncryption.kms, hmacKeyRef: jobsEncryption.hmacKeyRef } },
      { cron: WA_WEBHOOK_PROCESSOR_CRON, tz: WA_WEBHOOK_PROCESSOR_TZ },
    );

    // ── Telegram inbound-update processor + opt-in stale-PENDING sweep (Story 5.5, AC4/AC8/AC10) ──
    // Drains telegram_inbound_webhook_events: `/start <code>` → ACTIVE + consent (capturing chat_id),
    // `/stop` → REVOKED, my_chat_member block → BLOCKED; plus the stale-PENDING sweep → EXPIRED (no
    // past-window sweep). No blind index (Telegram never shares the phone — the code alone is the match key).
    // Cross-tenant on the service `pool`.
    await registerTelegramWebhookProcessorCron(
      boss,
      { pool, db },
      { cron: TELEGRAM_WEBHOOK_PROCESSOR_CRON, tz: TELEGRAM_WEBHOOK_PROCESSOR_TZ },
    );

    // ── Death-cert OCR + parity worker (Story 6.5, Task 4) — Class B (request-triggered) ──
    // The API enqueues CLAIM_OCR_PARITY on upload; this worker fetches the bytes by key,
    // runs the v1 deterministic OcrProvider (Decision D3 — no live vendor), evaluates parity
    // against the deceased's KYC record, upserts the claim_documents row + advances the claim
    // to documents_pending (idempotently). Storage is env-gated: the live GCS adapter when
    // CLAIM_DOCUMENT_BUCKET is set, else a shared local-disk fake (dev/CI — no live bucket) —
    // MUST be shared-filesystem, not an in-process Map: apps/api and apps/jobs are separate
    // processes, so a per-process in-memory store would be invisible to this worker (a real
    // local upload would 404 here). Reuses the same jobs KMS deps (data-export precedent) for
    // the Tier-1 decrypt/encrypt.
    const claimDocumentBucket = process.env['CLAIM_DOCUMENT_BUCKET'];
    const claimDocumentStorage = claimDocumentBucket
      ? createGcsClaimDocumentStorage({
          bucketName: claimDocumentBucket,
          ...(process.env['GOOGLE_CLOUD_PROJECT']
            ? { projectId: process.env['GOOGLE_CLOUD_PROJECT'] }
            : {}),
        })
      : createLocalFsClaimDocumentStorage();
    // ── Human shepherd assignment (Story 6.12, Task 4) — Class B (request-triggered) ──
    // Register BEFORE the peer-mesh workers so the SHEPHERD_ASSIGN queue exists when the SELECT worker's
    // injected callback enqueues onto it. Assigns the least-loaded contactable in-scope district_admin;
    // routes an empty/ineligible pool to the AR-61 fallback (config-backed resolver — the ledger is
    // documentation-only, so NO runtime .md resolution); fires the member-notification seam post-commit
    // (console placeholder; NEVER the first live dispatch() caller — R4).
    await registerClaimShepherdAssignWorker(boss, {
      pool,
      fallbackResolver: createConfigShepherdFallbackResolver(),
      notify: consoleShepherdAssignedNotificationHook,
    });

    // ── Peer-mesh deterministic selection + AR-61 window fallback (Story 6.6) ──────
    // Register BEFORE the OCR worker so the SELECT queue exists when OCR enqueues onto it.
    // The window's default (72h) is a named config value (CLAIM_PEER_MESH_WINDOW_SECONDS).
    await registerClaimPeerMeshWorkers(boss, {
      pool,
      windowSeconds: PEER_MESH_WINDOW_SECONDS,
      // Story 6.12 (R2) — enqueue the shepherd-assign job after the SELECT worker commits
      // claim.peer_mesh_pinged (→ verification_in_progress). singletonKey = claim_case_id so a re-run
      // does not double-enqueue (the worker is idempotent regardless).
      enqueueShepherdAssign: async (envelope, claimCaseId, deceasedMemberId) => {
        await boss.send(
          QUEUE_NAMES.CLAIM_SHEPHERD_ASSIGN,
          {
            requestId: envelope.requestId,
            pariwarId: envelope.pariwarId,
            actorId: envelope.actorId,
            traceId: envelope.traceId,
            payload: { claimCaseId, deceasedMemberId },
          } satisfies JobEnvelope<ClaimShepherdAssignPayload>,
          { singletonKey: claimCaseId },
        );
      },
    });

    await registerClaimOcrParityWorker(boss, {
      pool,
      storage: claimDocumentStorage,
      ocr: createDeterministicOcrProvider(),
      kms: jobsEncryption.kms,
      kekRef: jobsEncryption.kekRef,
      // Story 6.6 trigger seam — enqueue the peer-mesh SELECT job after documents_pending.
      // singletonKey = claim_case_id so an OCR re-run does not double-select.
      enqueuePeerMeshSelect: async (input) => {
        await boss.send(
          QUEUE_NAMES.CLAIM_PEER_MESH_SELECT,
          {
            requestId: input.traceId,
            pariwarId: input.pariwarId,
            actorId: input.actorId,
            traceId: input.traceId,
            payload: { claimCaseId: input.claimCaseId, deceasedMemberId: input.deceasedMemberId },
          } satisfies JobEnvelope<ClaimPeerMeshSelectPayload>,
          { singletonKey: input.claimCaseId },
        );
      },
    });

    // ── Pool spawn saga (Story 7.3, Task 5) — Class A (cycle-open burst) ──────────
    // The parent → N-child atomic spawn. Self-contained: registerCycleSpawnWorkers creates the
    // CHILD queue before the PARENT so the child queue exists when the parent fans out onto it. The
    // parent is enqueued by the apps/api post-commit PoolSpawnTrigger (Task 6). Story 7.4 injects the
    // REAL deterministic member-assignment seam (createPoolAssignmentSeam); AI-7-2 now also injects the
    // freeze-time assignable-roster resolver (createAssignableRosterResolver) — the roster SUPPLY the
    // 7.4 follow-up deferred. `pool` here is the BYPASSRLS service pool the resolver uses as its
    // withPariwarScope pool + keyed-store pool + validity servicePool. Story 7.5 retired the fixed-
    // amount dep: the planner resolves it from the per-Pariwar schedule at the cycle-freeze committed_at.
    await registerCycleSpawnWorkers(boss, {
      pool,
      childConcurrency: POOL_SPAWN_CHILD_CONCURRENCY,
      assignmentSeam: poolDomain.createPoolAssignmentSeam(),
      resolveAssignableRoster: createAssignableRosterResolver({ pool }),
      // Story 8.1 (Task 8; D4) — the PRIMARY cycle-open-alert enqueue seam: the child worker fires
      // this POST-COMMIT the instant it emits cycle.frozen. Best-effort (a failed enqueue never
      // fails the committed freeze); the recovery sweep below heals a dropped job.
      enqueueCycleOpenAlert: (input) => enqueueCycleOpenAlert(boss, input),
    });

    // ── Cycle-open alert trigger (Story 8.1, Task 8) — Class A (mint) + Class C (sweep) ──
    // The mint worker consumes CYCLE_OPEN_ALERT (enqueued by the spawn child above + the sweep)
    // and drives the cycle's alert draft → frozen → published → live (alert.openCycleAlert; AC3),
    // reading degraded-mode for the AR-18 time_critical signal (AC4). The recovery sweep cron
    // re-enqueues any cycle with a cycle.frozen but no minted alert (D4 — recovery only). `pool` is
    // the BYPASSRLS service pool (the withPariwarScope pool + the cross-tenant sweep scan).
    // ── Contribution-loop notification fan-out (Story 8.8) — THE FIRST LIVE dispatch() CALLER ─────
    // Register BEFORE the cycle-open alert workers so the CONTRIBUTION_NOTIFY_CYCLE_OPEN queue exists
    // when the alert worker's post-commit callback enqueues onto it (the OCR→SELECT ordering
    // precedent). `pool`/`db` are the BYPASSRLS service handles: `pool` is the withPariwarScope pool,
    // the keyed-store pool and the audit writer's own-committing pool; `db` backs ONLY the isolated
    // push-token invalidation write. The rendered-message hash is the PII-safe keyed HMAC
    // (AI-4-3(c)) — never a raw sha256 of member-facing content.
    //
    // PROVIDERS (AI-8-3 — H-1 CLOSED): `resolveProviders` is now WIRED. buildContributionProviderResolver
    // constructs the per-process app caches (Firebase / WhatsApp / Telegram) + the global SMS gateway client
    // (resolved once) + the per-(Pariwar,category) provider resolver — all env-gated (opt-in-real: an
    // unprovisioned channel degrades to its log-only fixture, so the worker still boots with ZERO channel
    // config in dev/CI). A deployed worker with the secrets/config provisioned now delivers REAL bytes: real
    // push (D1 global Firebase SA) as the cascade's first rung, real WA/SMS/Telegram per per-Pariwar config.
    // The composition now lives in @twt/channels (relocated from apps/api; §2) — apps/jobs never imports
    // apps/api, so the package graph gains no new edge. The 5-state honesty invariant (config-absent/disabled/
    // secret-missing ⇒ fixture; DB/Secret-Manager OUTAGE ⇒ reject → pg-boss retry) lives inside the resolver.
    const contributionProviders = await buildContributionProviderResolver({ pool });
    contributionProvidersTeardown = contributionProviders.teardown;
    const contributionNotifyDeps = {
      pool,
      serviceDb: db,
      encryption: jobsEncryption,
      audit: createAuditPort(pool),
      hashRendered: createRenderedMessageHash({
        kms: jobsEncryption.kms,
        hmacKeyRef: jobsEncryption.hmacKeyRef,
      }),
      resolveProviders: contributionProviders.resolveProviders,
    };
    await registerContributionNotifyWorkers(boss, contributionNotifyDeps);

    await registerCycleOpenAlertWorkers(boss, {
      pool,
      // Story 8.8 (Task 5) — the PRIMARY contribution-notify enqueue: fired POST-COMMIT the instant
      // the alert reaches `live`, threading the alert.published `time_critical` signal VERBATIM.
      enqueueContributionNotify: (input) =>
        enqueueContributionNotifyCycleOpen(
          boss,
          {
            pariwarId: input.pariwarId,
            requestId: input.requestId,
            actorId: input.actorId,
            traceId: input.traceId,
          },
          {
            alertId: input.alertId,
            cycleId: input.cycleId,
            timeCritical: input.timeCritical,
          },
        ),
    });

    await new Promise<void>((resolve, reject) => {
      healthServer.once('error', reject);
      healthServer.listen(HEALTH_PORT, () => {
        resolve();
      });
    });
  } catch (err) {
    await boss.stop({ graceful: false }).catch(() => undefined);
    await pool.end().catch(() => undefined);
    throw err;
  }

  ready = true;
  console.info(
    '[jobs] worker runtime ready',
    JSON.stringify({
      healthPort: HEALTH_PORT,
      vacuumCron: VACUUM_CRON,
      certRefreshCron: CERT_REFRESH_CRON,
      renewalLifecycleCron: RENEWAL_LIFECYCLE_CRON,
      dataExportVacuumCron: DATA_EXPORT_VACUUM_CRON,
      validityCacheGcCron: VALIDITY_CACHE_GC_CRON,
      deviceTokenCleanupCron: DEVICE_TOKEN_CLEANUP_CRON,
      tz: VACUUM_TZ,
    }),
  );
}

// Crash discipline (architecture §5.9): uncaught errors flow through the single
// helper and force a non-zero exit so the container restarts.
process.on('uncaughtException', (err) => {
  logError('uncaughtException', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  logError('unhandledRejection', reason);
  process.exit(1);
});

main().catch((err: unknown) => {
  logError('boot', err);
  process.exit(1);
});
