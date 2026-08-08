// Close-of-cycle emitter — Story 8.14 (Task 3; AC2, AC3, AC5, AC7). The `alert.closed` PRODUCER.
//
// ⭐ THIS SWEEP IS THE PRIMARY MECHANISM, NOT A RECOVERY NET. Read that before copying anything from
// its sibling `cycle-open-alert.ts`.
//
// Story 8.1's D4 made the cycle-open sweep SECONDARY to a post-commit enqueue, because a cycle
// FREEZE is an event you can hook: the instant `finalizeCycleIfComplete` returns `frozen: true`,
// something concrete happened and a job can be enqueued from it. A Day-15 close is a **time**
// boundary — nothing happens, no code runs, no transaction commits. There is nothing to hook. So the
// periodic sweep IS the mechanism by which a cycle closes, and its cadence is a member-facing
// property, not a self-healing convenience. Do not re-label it "recovery" and do not under-schedule
// it.
//
// ── Why this file exists at all (the defect it corrects) ────────────────────────────────────────────
// `alert.closed` was fully specified by Story 8.1 — reducer arm (`alert/state.ts`), `.strict()`
// payload schema (`alert/events.ts`), registry entry (`packages/events/src/registry.ts`) — and its
// EMITTER was assigned forward to Story 8.9. Story 8.9's scope table then asserted that 8.1 had
// already shipped the `live → closed` transition, and on that false premise ratified "do not touch
// `live → closed` timing". Neither story built the producer. For four subsequent stories, five
// consumers read a fact no code could produce. Nothing detected it: 8.9's regression fence asserted
// the transition was *byte-unchanged*, which code that never runs satisfies perfectly.
//
// ── What closes, and when ───────────────────────────────────────────────────────────────────────────
// The close instant is computed HERE, in `apps/jobs`, and passed into the domain explicitly (AC3):
// `@twt/domain` must not import `@twt/contracts` (turbo cycle — `packages/domain/src/errors.ts:41`)
// and `CYCLE_WINDOW_DAYS` lives in `@twt/contracts`. The domain function therefore never re-derives
// the boundary, never reads a wall clock, and never hardcodes 15.
//
// ── D3 — the anchor is the EVENT PAYLOAD, not the table column ──────────────────────────────────────
// The authoritative anchor is `cycle.frozen`'s `attestation.committed_at` — the exact value
// `openCycleAlert` reads and the exact value the member's own countdown is computed from
// (`computeDaysRemaining(committedAt)`). `cycle_freeze_commits.committed_at` is a `defaultNow()`
// column; it is used here ONLY as an indexed prefilter to bound the scan. Every candidate's close
// instant is then recomputed from the payload and re-checked, so a row the prefilter admitted but the
// payload says is not yet due is skipped. Using the column as the authority would risk a member's
// deadline disagreeing with the countdown they were shown.
//
// ── AC5 — this story adds a transition AT the existing boundary; it does not move it ────────────────
// `CYCLE_WINDOW_DAYS`, `computeDaysRemaining`, the My Pool card window and the deadline-reminder
// sweep window are behaviourally untouched. In particular the Story 8.9 holiday calendar governs the
// post-close RECONCILIATION TAIL only — `reconciliationTailDeadline` must NEVER be applied to the
// close instant. FR-22's Day-15 is hard, and 8.9 re-ratified it.

import { CYCLE_WINDOW_DAYS } from '@twt/contracts';
import { alert as alertDomain, pool as poolDomain, withPariwarScope } from '@twt/domain';
import { QUEUE_NAMES, type Job, type QueueClient } from '@twt/queue';
import type pg from 'pg';

/** UTC-safe day arithmetic. NEVER `setDate`/`getDate` — those read the process's LOCAL timezone and
 *  would silently disagree with `computeDaysRemaining`, which is fixed-ms UTC. */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Sweep cadence (IST). HOURLY, and that is a deliberate floor rather than an arbitrary pick: this is
 * the producer, so the cadence bounds how long a cycle stays `live` past its own Day-15 deadline.
 * Offset from the sibling crons (`cycle-open` :20, `contribution-notify` recovery :40, `pending-match`
 * :50) so they don't all fire on the same minute. Operations policy, overridable via env in boot.ts.
 */
export const DEFAULT_CLOSE_CYCLE_ALERT_SWEEP_CRON = '10 * * * *'; // hourly at :10 IST
/** IST — the established `CYCLE_OPEN_ALERT_SWEEP_TZ` convention; never a UTC cron. */
export const CLOSE_CYCLE_ALERT_SWEEP_TZ = 'Asia/Kolkata';

/** The max due alerts one sweep run closes. Bounds the cross-tenant scan; a full batch is ALARMED
 *  (never a silent cap — the next tick picks up the remainder). Mirrors
 *  `DEFAULT_CYCLE_OPEN_ALERT_SWEEP_LIMIT`'s shape, tuned independently. */
export const DEFAULT_CLOSE_CYCLE_ALERT_SWEEP_LIMIT = 500;

export interface CloseCycleAlertDeps {
  /** BYPASSRLS service pool. Used for the cross-tenant due-alert scan, and as the `withPariwarScope`
   *  pool for each tenant-scoped write. The one deliberate cross-tenant exception Story 8.1 models. */
  readonly pool: pg.Pool;
  /** Per-run batch bound. Defaults to {@link DEFAULT_CLOSE_CYCLE_ALERT_SWEEP_LIMIT}. */
  readonly sweepLimit?: number;
  /** Injected clock — the deadline-reminder sweep's `deps.now` precedent. No bare `Date.now()` on a
   *  path that decides whether a member's contribution window has ended. */
  readonly now?: () => Date;
  /** Failure alarm sink — a console stub by default. */
  readonly onAlarm?: (message: string) => void;
}

/** What one sweep run did. Reported for telemetry and stored in the pg-boss job `output`. NON-PII. */
export interface CloseCycleAlertSweepResult {
  /** Candidates the prefiltered scan returned. */
  readonly scanned: number;
  /** Alerts this run transitioned `live → closed`. */
  readonly closed: number;
  /** Candidates the AUTHORITATIVE payload anchor says are not due yet (the prefilter is looser). */
  readonly notDue: number;
  /** Candidates another worker had already closed (the benign concurrency + redelivery outcomes). */
  readonly alreadyClosed: number;
  /** Candidates whose close failed and was isolated. They are retried on the next tick. */
  readonly failed: number;
}

interface DueAlertRow {
  readonly alert_id: string;
  readonly cycle_id: string;
  readonly pariwar_id: string;
  /** `cycle.frozen`'s `attestation.committed_at`, ISO-8601 — the AUTHORITATIVE anchor (D3), read
   *  straight off the durable event payload, never reconstructed and never the table column. */
  readonly committed_at: string | null;
}

/**
 * The close-of-cycle sweep (AC2/AC3/AC7) — one tick.
 *
 * ⛔ THE EMITTER IS UNCONDITIONAL: no floor instant, no backfill switch. It closes ANY `live` alert
 * whose Day-15 boundary has elapsed. That is deliberate, and the reasoning is stated here because its
 * absence would otherwise read as an oversight:
 *
 *   The system has never run in production (the launch-gate inventory is framed throughout around
 *   pre-launch measurement; the 4L measurement is still un-executed). There is no historical member
 *   data. No real member has ever been assigned to a cycle, so no member can be retroactively
 *   assigned a consequence for a period when this emitter did not exist. When the system launches,
 *   the emitter exists from day one and every cycle closes on time. **"Backfill" has no referent
 *   here** — a forward-only floor would be guarding against a population that does not exist.
 *
 *   ⚠ The only real residue is a TEST-FIXTURE one: dev/CI databases accumulate `live` alerts seeded
 *   by fixtures, so a sweep run against a shared dev DB will close whichever of them are past due.
 *   That is a test-isolation concern, handled in test setup — never by adding a production floor to
 *   compensate for it.
 *
 * Isolation: candidates are grouped by tenant so one connection serves a tenant's whole batch, and
 * each candidate's close runs under its own `SAVEPOINT` (the 10.23 batch-writer convention). One
 * alert failing — a data defect, or a concurrent worker winning the stream-version race — can never
 * cost its siblings this tick's close.
 */
export async function runCloseCycleAlertSweep(
  deps: CloseCycleAlertDeps,
): Promise<CloseCycleAlertSweepResult> {
  const alarm = deps.onAlarm ?? ((m: string): void => console.warn(m));
  const now = deps.now?.() ?? new Date();
  // Guard a misconfigured 0/negative limit (the cycle-open sweep's review finding): 0 would alarm
  // "cap hit" on every tick and a negative value would malform the SQL LIMIT.
  const limit = Math.max(1, deps.sweepLimit ?? DEFAULT_CLOSE_CYCLE_ALERT_SWEEP_LIMIT);

  // The PREFILTER instant — `now − CYCLE_WINDOW_DAYS`. Bound as a parameter, so the window length
  // stays the ONE `@twt/contracts` constant and never becomes a second hardcoded 15 in SQL. The
  // authoritative per-candidate check happens below, off the event payload (D3).
  const prefilterBefore = new Date(now.getTime() - CYCLE_WINDOW_DAYS * MS_PER_DAY);

  // Ordered oldest-first for deterministic, repeatable progress through a backlog (the 8.1 sweep's
  // ordered-scan finding); `alert_id` breaks ties so the slice is total. The bound is a fixed
  // integer from config — no caller influences it.
  const { rows } = await deps.pool.query<DueAlertRow>(
    `SELECT a.alert_id,
            a.cycle_id,
            a.pariwar_id,
            e.payload->'attestation'->>'committed_at' AS committed_at
       FROM alerts a
       JOIN cycle_freeze_commits c ON c.commit_id = a.cycle_id
       JOIN events_log e ON e.stream_id = a.cycle_id AND e.event_type = 'cycle.frozen'
      WHERE a.current_state = 'live'
        AND c.committed_at <= $1
      ORDER BY c.committed_at ASC, a.alert_id ASC
      LIMIT $2`,
    [prefilterBefore, limit],
  );

  let closed = 0;
  let notDue = 0;
  let alreadyClosed = 0;
  let failed = 0;

  // ── (1) Resolve due-ness BEFORE any transaction opens ────────────────────────────────────────────
  // The close instant is decided here, in `apps/jobs`, from the AUTHORITATIVE `cycle.frozen` payload
  // anchor (D3) and the ONE `@twt/contracts` window constant (AC3). Doing it before the tenant loop
  // keeps two properties: a tenant whose candidates all turn out to be not-yet-due never opens a
  // connection at all, and the due-ness decision is provable without a database.
  const due: { row: DueAlertRow; closeAt: Date }[] = [];
  for (const row of rows) {
    const committedAt = row.committed_at === null ? null : new Date(row.committed_at);
    if (committedAt === null || Number.isNaN(committedAt.getTime())) {
      failed += 1;
      alarm(
        `[jobs] close-cycle-alert-sweep: cycle ${row.cycle_id} has no readable cycle.frozen ` +
          `attestation.committed_at — refusing to close on an unresolvable anchor`,
      );
      continue;
    }
    // Fixed-ms UTC, matching `computeDaysRemaining` exactly, so the transition lands on the SAME
    // instant the member's own countdown reached zero on. Never `setDate`/`getDate`.
    const closeAt = new Date(committedAt.getTime() + CYCLE_WINDOW_DAYS * MS_PER_DAY);
    if (closeAt.getTime() > now.getTime()) {
      // The column prefilter admitted it; the payload — the authority — says it is not due.
      notDue += 1;
      continue;
    }
    due.push({ row, closeAt });
  }

  // ── (2) Group the DUE candidates by tenant ───────────────────────────────────────────────────────
  // One scoped transaction per Pariwar rather than one per alert, so a 500-alert batch spanning three
  // tenants opens three connections, not five hundred.
  const byPariwar = new Map<string, { row: DueAlertRow; closeAt: Date }[]>();
  for (const entry of due) {
    const bucket = byPariwar.get(entry.row.pariwar_id);
    if (bucket) bucket.push(entry);
    else byPariwar.set(entry.row.pariwar_id, [entry]);
  }

  for (const [pariwarId, candidates] of byPariwar) {
    try {
      await withPariwarScope(deps.pool, pariwarId, async (_db, client) => {
        for (const { row, closeAt } of candidates) {
          // ── Per-candidate isolation (the 10.23 batch-writer convention) ─────────────────────────
          // Without this, ONE alert's failure — a data defect, or a concurrent tick winning the
          // `(stream_id, event_version)` slot — would abort the whole tenant transaction and roll
          // back every OTHER alert this run legitimately closed.
          await client.query('SAVEPOINT close_cycle_alert');
          try {
            const result = await alertDomain.closeCycleAlert(client, {
              cycleId: row.cycle_id,
              closeAt,
            });
            await client.query('RELEASE SAVEPOINT close_cycle_alert');
            if (result.closed) closed += 1;
            else alreadyClosed += 1;
          } catch (err) {
            await client.query('ROLLBACK TO SAVEPOINT close_cycle_alert');
            await client.query('RELEASE SAVEPOINT close_cycle_alert');
            // AC4 — a concurrent close won the version slot. Benign: the alert IS closed, by the
            // other worker. Counted, never alarmed, and never retried into a second event.
            if (err instanceof poolDomain.PoolStreamConcurrencyError) {
              alreadyClosed += 1;
              continue;
            }
            failed += 1;
            alarm(
              `[jobs] close-cycle-alert-sweep: failed to close alert ${row.alert_id} (cycle ` +
                `${row.cycle_id}) — isolated to this candidate, run continues: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        }
      });
    } catch (err) {
      // The tenant's transaction itself failed (connection/scope level). Its candidates are simply
      // not closed this tick; the next tick re-scans them — the close is idempotent by construction.
      failed += candidates.length;
      alarm(
        `[jobs] close-cycle-alert-sweep: tenant ${pariwarId} batch failed (${String(candidates.length)} ` +
          `candidate(s) deferred to the next tick): ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  if (rows.length >= limit) {
    alarm(
      `[jobs] close-cycle-alert-sweep: hit the ${String(limit)}-alert batch cap — more due alerts ` +
        `remain; the next tick will pick them up (raise sweepLimit if this recurs)`,
    );
  }
  console.info(
    '[jobs] close-cycle-alert-sweep',
    JSON.stringify({ scanned: rows.length, closed, notDue, alreadyClosed, failed, limit }),
  );
  return { scanned: rows.length, closed, notDue, alreadyClosed, failed };
}

/**
 * Register the close-of-cycle queue + cron.
 *
 * ⛔ This function MUST be called from `apps/jobs/src/boot.ts` — that is the single process-boot call
 * site that wires a sweep into the live `pg-boss` instance. A registration function nobody calls is
 * byte-for-byte the defect class this story exists to correct: code that exists and never runs.
 *
 * There is deliberately no second "close one alert" worker queue to fan out onto. Cycle-open needs
 * one because its primary path is a post-commit enqueue that must survive the committing
 * transaction; a close has no such producer, and closing is a single guarded write, so the sweep does
 * the work inline. One queue, one place to look.
 */
export async function registerCloseCycleAlertWorkers(
  boss: QueueClient,
  deps: CloseCycleAlertDeps,
  opts: { sweepCron?: string; sweepTz?: string } = {},
): Promise<void> {
  const sweepCron = opts.sweepCron ?? DEFAULT_CLOSE_CYCLE_ALERT_SWEEP_CRON;
  const sweepTz = opts.sweepTz ?? CLOSE_CYCLE_ALERT_SWEEP_TZ;
  await boss.createQueue(QUEUE_NAMES.CLOSE_CYCLE_ALERT_SWEEP);
  await boss.work(QUEUE_NAMES.CLOSE_CYCLE_ALERT_SWEEP, async (jobs: Job[]) => {
    try {
      const result = await runCloseCycleAlertSweep(deps);
      console.info('[jobs] close-cycle-alert-sweep tick', JSON.stringify({ jobs: jobs.length, ...result }));
      return result;
    } catch (err) {
      console.error('[jobs] close-cycle-alert-sweep failed', err);
      throw err;
    }
  });
  await boss.schedule(QUEUE_NAMES.CLOSE_CYCLE_ALERT_SWEEP, sweepCron, {}, { tz: sweepTz });
}
