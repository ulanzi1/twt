// The 5-minute partner-module ACTIVATION sweep — Story 12.2 (`2026-11-01-433` QE7 (A), QE19; AC9; 12.1 C2 (b), (e)).
//
// A module published with a FUTURE start date is `scheduled` (12.1's guard); this cron turns it `active` once its start
// time comes — the admin's OWN start date, executed (⛔ a new member-facing meaning — §0 edge 6). Nothing reaches a member
// yet: the shelf is Story 12.3's (I8). Cost: an offer goes live up to 5 minutes after its start time.
//
// ── The tick ────────────────────────────────────────────────────────────────────────────────────────
//   1. ⭐ The roster Row 26 guard FIRST (`jobs-db-role`, OPEN): under an RLS-bound (⛔ BYPASSRLS) login the UNSCOPED due scan
//      returns ⛔ row with ⛔ error — a quiet "nothing due" indistinguishable from a broken login (TR23). So
//      `smsDelivery.canReadAcrossPariwars(tickPool)` false ⇒ ONE `module_activation.rls_bound_role` alarm and the tick ends.
//   2. `marketplace.selectDueScheduledModules(tickPool)` — the domain's cross-tenant scan at DB `now()` (≤ 500).
//   3. Per candidate, `activateDueModule` — its OWN audit pairing and transaction:
//      `audit.withCompensatingAudit(auditPool, { intent: 'module.activated', actorId: null, … }, mutate)` where `mutate` is
//      `withPariwarScope(tickPool, pariwarId, (_db, client) => marketplace.activateModule(client, { actor: 'system', … }))` —
//      BEGIN (READ COMMITTED) + `setPariwarScope` (⛔ `SET LOCAL ROLE twt_app` — G13: nothing provisions that membership for
//      the jobs login), COMMITTED inside the callback, i.e. inside `mutate` (I2). ⛔ `closeScopeTx` (apps/api only).
//   A racing withdraw (`ModuleIllegalTransitionError`) or a window that closed between scan and lock
//   (`ModuleOutsideWindowError`) is `skipped` (`marketplace.classifyActivationOutcome`) — thrown inside `mutate`, so it leaves
//   the intent + `module.activated_rolled_back` lines (accepted: a skipped row is never re-selected). Anything else is
//   `failed` — logged, the next candidate runs, and the next tick retries it. Idempotent: one step per tick.
//
// ── Pools (G13) ─────────────────────────────────────────────────────────────────────────────────────
// ONE dedicated pool for the tick (`max: 3`, built in boot.ts) with worker `localConcurrency: 1` — ⛔ the shared `max: 2`
// jobs pool: a candidate's transaction holds one connection while its audit intent / compensating line commits on another
// ([[project_jobs_pool_two_connection_starvation]]). `auditPool` defaults to the tick pool.
//
// ⚠ The access-wrapper gate does ⛔ scan `apps/jobs` (its README says so); this file's audit pairing is pinned by its test.
// ⛔ PII in the audit line or a log: ids and counts only.

import { createHash } from 'node:crypto';

import { audit, canonicalJsonStringify, marketplace, smsDelivery, withPariwarScope, type Db } from '@twt/domain';
import { QUEUE_NAMES, type Job, type QueueClient } from '@twt/queue';
import type pg from 'pg';

/** Every 5 minutes (QE7 (A)). */
export const DEFAULT_MODULE_ACTIVATION_CRON = '*/5 * * * *';
export const MODULE_ACTIVATION_TZ = 'Asia/Kolkata';
/** The audit action — equals the event type (12.1 QE3). */
export const MODULE_ACTIVATED_ACTION = 'module.activated';

export interface ModuleActivationDeps {
  /** The tick's OWN pool (`max: 3`) — the cross-tenant scan and each candidate's scope transaction. */
  readonly pool: pg.Pool;
  /** Where the audit lines are written; defaults to `pool`. */
  readonly auditPool?: pg.Pool;
  /** The alarm sink (the `claim-contact-ladder.ts` shape); defaults to `console.warn`. */
  readonly onAlarm?: (message: string) => void;
}

export interface ModuleActivationTickResult {
  /** True when the Row 26 guard refused to sweep. */
  readonly refused: boolean;
  readonly selected: number;
  readonly activated: number;
  readonly skipped: number;
  readonly failed: number;
}

function alarmOf(deps: Pick<ModuleActivationDeps, 'onAlarm'>): (m: string) => void {
  return deps.onAlarm ?? ((m: string): void => console.warn(m));
}

/**
 * Activate ONE due module in its own audited transaction. EXPORTED so a test can withdraw a module BETWEEN selection and
 * activation (AC9). Never throws: `'activated' | 'skipped' | 'failed'`.
 */
export async function activateDueModule(
  deps: ModuleActivationDeps,
  candidate: marketplace.DueScheduledModule,
): Promise<'activated' | 'skipped' | 'failed'> {
  const { pariwarId, moduleId } = candidate;
  try {
    await audit.withCompensatingAudit(deps.auditPool ?? deps.pool, {
      auditIntent: {
        pariwarId,
        actorId: null,
        actorRole: null,
        action: MODULE_ACTIVATED_ACTION,
        resourceLocator: marketplace.moduleResourceLocator(moduleId),
        requestPayloadHash: createHash('sha256')
          .update(canonicalJsonStringify({ module_id: moduleId, trigger: 'module_activation_sweep' }), 'utf8')
          .digest('hex'),
        traceId: null,
      },
      mutate: ({ auditId }) =>
        withPariwarScope(deps.pool, pariwarId, (_db: Db, client: pg.PoolClient) =>
          marketplace.activateModule(client, { pariwarId, moduleId, auditId, actor: 'system', actorId: null }),
        ),
    });
    return 'activated';
  } catch (err) {
    const outcome = marketplace.classifyActivationOutcome(err);
    if (outcome === 'failed') {
      console.error(
        '[jobs] module-activation: activation failed — the next tick retries it',
        JSON.stringify({ moduleId, error: err instanceof Error ? err.name : 'unknown' }),
      );
    }
    return outcome;
  }
}

/** One sweep: the Row 26 guard, the due scan, then each candidate in turn. */
export async function runModuleActivationTick(deps: ModuleActivationDeps): Promise<ModuleActivationTickResult> {
  const alarm = alarmOf(deps);
  if (!(await smsDelivery.canReadAcrossPariwars(deps.pool))) {
    alarm(
      '[jobs] module-activation: module_activation.rls_bound_role — the pool role cannot read across Pariwars (roster Row 26); ' +
        '⛔ swept — a scheduled partner offer stays scheduled past its start time until it can',
    );
    return { refused: true, selected: 0, activated: 0, skipped: 0, failed: 0 };
  }
  const due = await marketplace.selectDueScheduledModules(deps.pool);
  let activated = 0;
  let skipped = 0;
  let failed = 0;
  for (const candidate of due) {
    const outcome = await activateDueModule(deps, candidate);
    if (outcome === 'activated') activated += 1;
    else if (outcome === 'skipped') skipped += 1;
    else failed += 1;
  }
  if (due.length > 0) {
    console.info('[jobs] module-activation tick', JSON.stringify({ selected: due.length, activated, skipped, failed }));
  }
  return { refused: false, selected: due.length, activated, skipped, failed };
}

/**
 * Register the activation queue + worker + 5-minute cron (IST). `localConcurrency: 1` — ONE tick at a time on the tick's own
 * pool (the `wa-webhook-processor.ts` statement of pg-boss's default; pg-boss `^12` hands the handler an ARRAY of jobs).
 */
export async function registerModuleActivationCron(
  boss: QueueClient,
  deps: ModuleActivationDeps,
  opts: { cron?: string; tz?: string } = {},
): Promise<void> {
  const cron = opts.cron ?? DEFAULT_MODULE_ACTIVATION_CRON;
  const tz = opts.tz ?? MODULE_ACTIVATION_TZ;
  await boss.createQueue(QUEUE_NAMES.MODULE_ACTIVATION);
  await boss.work(QUEUE_NAMES.MODULE_ACTIVATION, { localConcurrency: 1 }, async (jobs: Job[]) => {
    const result = await runModuleActivationTick(deps);
    return { jobs: jobs.length, ...result };
  });
  await boss.schedule(QUEUE_NAMES.MODULE_ACTIVATION, cron, {}, { tz });
}
