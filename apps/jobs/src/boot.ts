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

import { createDb, idempotency, resolveConnectionString } from '@twt/domain';
import { QUEUE_NAMES, createQueueClient, stopQueueClient, type Job } from '@twt/queue';

// Health endpoint + drain knobs. Ports/timeouts are operations policy; these are
// sane placeholders overridable via env.
const HEALTH_PORT = Number(process.env['HEALTH_PORT'] ?? process.env['PORT'] ?? 8080);
const SHUTDOWN_TIMEOUT_MS = Number(process.env['JOBS_SHUTDOWN_TIMEOUT_MS'] ?? 30_000);
// Hourly TTL vacuum by default (IST). Cadence is operations policy — overridable.
const VACUUM_CRON = process.env['IDEMPOTENCY_VACUUM_CRON'] ?? '0 * * * *';
// IST timezone for the cron — do NOT repeat the UTC-cron foot-gun the
// nightly-integrity workflow documents (architecture §scheduling).
const VACUUM_TZ = 'Asia/Kolkata';

/** The single error helper — every fatal/uncaught path logs code + message only. */
function logError(scope: string, err: unknown): void {
  const e = err as Error & { code?: string };
  console.error(`[jobs:${scope}]`, e?.code ?? 'NO_CODE', e?.message ?? String(err));
}

async function main(): Promise<void> {
  const connectionString = process.env['SERVICE_DATABASE_URL'] ?? (await resolveConnectionString());

  // pg-boss client (manages its own pool from the connection string).
  const boss = createQueueClient(connectionString, { applicationName: 'twt-jobs' });

  // Separate light pool for domain-table maintenance (the vacuum DELETE). max:2 —
  // the integrity-cli.ts service-pool precedent.
  const { pool } = createDb(connectionString, { max: 2, logger: false });

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

  // Start the boss — creates the `pgboss` schema on first run (the connection role
  // needs CREATE on the DB; CI's superuser has it — see the runbook for prod).
  await boss.start();

  // ── TTL-vacuum queue + worker + cron (AC-5) ─────────────────────────────────
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

  await new Promise<void>((resolve, reject) => {
    healthServer.once('error', reject);
    healthServer.listen(HEALTH_PORT, () => {
      resolve();
    });
  });

  ready = true;
  console.info(
    '[jobs] worker runtime ready',
    JSON.stringify({ healthPort: HEALTH_PORT, vacuumCron: VACUUM_CRON, tz: VACUUM_TZ }),
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
