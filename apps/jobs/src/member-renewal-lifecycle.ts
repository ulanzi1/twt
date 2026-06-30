// Daily renewal-lifecycle cron — Story 3.8 (Task 5; AC1/AC3).
//
// The FIRST scheduler/emitter of the member renewal-grace lifecycle. Registers a daily pg-boss cron
// (IST) that runs `member.runRenewalLifecycleTick` (the @twt/domain core — the indexed candidate scan +
// the monotonic, idempotent emit of valid_through_reached/grace_entered/grace_expired via
// projectMemberState(actorId=null SIE)) and PUBLISHES the renewal-reminder nudges due this tick to the
// reserved RENEWAL_REMINDER queue. Mirrors the digilocker-cert-refresh cron (createQueue → work →
// schedule in IST) + the boot.ts registration.
//
// ── Thin runtime ────────────────────────────────────────────────────────────────────────────────────
// The DB/event logic lives in @twt/domain (apps/jobs already depends on it); this file is glue: it owns
// the cron cadence/tz, the reminder publish (the only pg-boss-touching step — domain stays queue-free),
// and the no-op reminder SINK that drains the queue until Epic 5's dispatcher subscribes (Decision 5).
//
// ── Reminder idempotency (Decision 4) ───────────────────────────────────────────────────────────────
// Each reminder is published with a pg-boss `singletonKey` of `{memberId}-{validThrough-date}-{offset}`
// so a same-day double-run (or a retried tick) cannot enqueue the same nudge twice. The tick itself only
// surfaces an offset on the exact day `floor(daysSince) === offset`, so across the daily cadence each of
// the four reminders fires at most once per renewal cycle.

import type { RenewalReminderNudge } from '@twt/contracts';
import { member } from '@twt/domain';
import { QUEUE_NAMES, type QueueClient, type Job } from '@twt/queue';
import type pg from 'pg';

/** Default daily cadence (IST) — operations policy, overridable via env (like VACUUM_CRON). */
export const DEFAULT_RENEWAL_LIFECYCLE_CRON = '0 3 * * *'; // 03:00 IST daily
export const RENEWAL_LIFECYCLE_TZ = 'Asia/Kolkata';

export interface RenewalLifecycleDeps {
  /** The domain-table pool (the candidate scan + per-candidate scope txs run on it). */
  readonly pool: pg.Pool;
  /** Injectable clock (deterministic tests). */
  readonly now?: () => Date;
  /** Failure alarm sink — a console stub by default (later-epic observability transport). */
  readonly onAlarm?: (message: string) => void;
}

/** Map a domain RenewalReminder to the canonical FR-23 nudge contract (snake_case, NON-PII). */
function toNudge(r: member.RenewalReminder): RenewalReminderNudge {
  return {
    member_id: r.memberId,
    pariwar_id: r.pariwarId,
    reminder_offset_days: r.reminderOffsetDays as RenewalReminderNudge['reminder_offset_days'],
    valid_through: r.validThrough.toISOString(),
    grace_remaining_days: r.graceRemainingDays,
  };
}

/** The per-cycle singleton key — one nudge per (member, renewal cycle, offset). */
function reminderSingletonKey(r: member.RenewalReminder): string {
  return `${r.memberId}-${r.validThrough.toISOString().slice(0, 10)}-${r.reminderOffsetDays}`;
}

/**
 * The worker body: run one tick + publish the reminders due. Testable in isolation (drive it with a
 * controlled `now`). Returns the tick result (also stored in the pg-boss job `output`). NOT fail-closed
 * on a publish failure — a single nudge that fails to enqueue alarms but does not abort the lifecycle
 * emits already committed by the tick (those are the load-bearing transitions).
 */
export async function runMemberRenewalLifecycleTick(
  boss: QueueClient,
  deps: RenewalLifecycleDeps,
): Promise<member.RenewalTickResult> {
  const alarm = deps.onAlarm ?? ((m: string): void => console.warn(m));
  const now = deps.now ? deps.now() : new Date();
  const result = await member.runRenewalLifecycleTick(deps.pool, now);

  for (const reminder of result.remindersDue) {
    try {
      await boss.send(QUEUE_NAMES.RENEWAL_REMINDER, toNudge(reminder), {
        singletonKey: reminderSingletonKey(reminder),
      });
    } catch (err) {
      const e = err as Error & { code?: string };
      alarm(
        `[jobs] member-renewal-lifecycle: failed to publish reminder ` +
          `${reminderSingletonKey(reminder)} — ${e?.code ?? 'NO_CODE'} ${e?.message ?? String(err)}`,
      );
    }
  }

  console.info(
    '[jobs] member-renewal-lifecycle',
    JSON.stringify({
      candidates: result.candidates,
      validThroughReached: result.validThroughReached,
      graceEntered: result.graceEntered,
      graceExpired: result.graceExpired,
      remindersDue: result.remindersDue.length,
    }),
  );
  return result;
}

/**
 * Register the daily renewal-lifecycle queue + worker + cron, plus the reserved renewal-reminder queue
 * with its no-op/log SINK (Decision 5 — drains the nudges until Epic 5's dispatcher subscribes). Mirrors
 * registerDigiLockerCertRefreshCron. The tick uses `deps.pool` directly (it opens its own per-candidate
 * scope txs), so — unlike the digilocker registrar — no bound Drizzle `Db` handle is needed here.
 */
export async function registerMemberRenewalLifecycleCron(
  boss: QueueClient,
  deps: RenewalLifecycleDeps,
  opts: { cron?: string; tz?: string } = {},
): Promise<void> {
  const cron = opts.cron ?? DEFAULT_RENEWAL_LIFECYCLE_CRON;
  const tz = opts.tz ?? RENEWAL_LIFECYCLE_TZ;

  // The reserved reminder queue + its no-op/log sink (Epic 5 replaces the sink with real delivery).
  await boss.createQueue(QUEUE_NAMES.RENEWAL_REMINDER);
  await boss.work(QUEUE_NAMES.RENEWAL_REMINDER, async (jobs: Job[]) => {
    // Forward-compat no-op: log the nudge intents (NON-PII) so the seam is observable until Epic 5's
    // central dispatcher subscribes. Do NOT throw — a sink failure must not retry-storm.
    console.info(
      '[jobs] renewal-reminder (no-op sink — Epic 5 delivers)',
      JSON.stringify({ nudges: jobs.length }),
    );
    return { drained: jobs.length };
  });

  // The lifecycle tick queue + worker + daily cron (IST).
  await boss.createQueue(QUEUE_NAMES.MEMBER_RENEWAL_LIFECYCLE);
  await boss.work(QUEUE_NAMES.MEMBER_RENEWAL_LIFECYCLE, async (jobs: Job[]) => {
    const result = await runMemberRenewalLifecycleTick(boss, deps);
    return { jobs: jobs.length, ...result, remindersDue: result.remindersDue.length };
  });
  await boss.schedule(QUEUE_NAMES.MEMBER_RENEWAL_LIFECYCLE, cron, {}, { tz });
}
