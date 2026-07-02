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

import { createDb, idempotency, resolveConnectionString, resolveSecretValue } from '@twt/domain';
import { QUEUE_NAMES, createQueueClient, stopQueueClient, type Job } from '@twt/queue';

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
  if (!/^(\S+\s+){4}\S+$/.test(DATA_EXPORT_VACUUM_CRON.trim())) {
    throw new RangeError(
      `[jobs] DATA_EXPORT_VACUUM_CRON must be a 5-field cron expression (got "${DATA_EXPORT_VACUUM_CRON}")`,
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
