// The activation sweep's DOMAIN half — Story 12.2 (`2026-11-01-433` QE7 (A); 12.1 C2 (b), (d), (e); RVD5's activation leg).
//
// A `scheduled` module goes `active` when its start time comes — the admin's OWN start date, executed by a 5-minute
// pg-boss cron (`apps/jobs/src/scheduler/module-activation.ts`). This file holds ONLY the two pieces the job needs from
// the domain: the due SCAN and the outcome CLASSIFIER. ⛔ `withCompensatingAudit` here (I11 / `-427` QE15 / 12.1 AC5):
// the audit pairing — and the per-candidate `withPariwarScope` transaction that calls `activateModule` — are the job's.
//
// ── The scan ──────────────────────────────────────────────────────────────────────────────────────
// UNSCOPED and CROSS-TENANT, on the SERVICE pool: `twt_service` holds SELECT (+ UPDATE, for the command's row lock and
// re-projection) on `marketplace_modules` (migration 0195). Judged against DB `now()` (⛔ an app clock). Served by the
// partial index `marketplace_modules_scheduled_valid_from_idx (valid_from) WHERE current_state = 'scheduled'`.
// ⚠ Under an RLS-bound (⛔ BYPASSRLS) jobs login this scan returns ZERO rows with NO error — the job checks
// `smsDelivery.canReadAcrossPariwars` FIRST (roster Row 26 `jobs-db-role`; TR23).
// ⚠ A `scheduled` module whose `valid_until` already passed is ⛔ selected: it stays `scheduled` until Story 12.6 archives
// it (C2 (c), unchanged). Cost: an offer goes live up to 5 minutes after its start time.

import type pg from 'pg';

import { moduleId as toModuleId, pariwarId as toPariwarId, type ModuleId, type PariwarId } from '../ids/index.js';
import { clampLimit } from '../pagination.js';
import { ModuleIllegalTransitionError, ModuleOutsideWindowError } from './errors.js';

/** At most this many due modules per tick (default AND cap); the rest are picked up by the next tick. */
export const MODULE_ACTIVATION_SCAN_LIMIT = { default: 500, cap: 500 } as const;

/** One due module: what the job needs to open the right Pariwar's scope and activate it. */
export interface DueScheduledModule {
  readonly pariwarId: PariwarId;
  readonly moduleId: ModuleId;
  readonly validFrom: Date;
  readonly validUntil: Date;
}

/**
 * The `scheduled` modules whose window is OPEN at DB `now()` — `valid_from <= now() AND valid_until > now()` — oldest
 * start first (`valid_from, module_id`), at most 500. `asOf` is a TEST-ONLY override that replaces `now()`; ⚠ it serves
 * only "⛔ selected" legs — an `asOf` LATER than real time selects a module `activateModule` (real DB `now()`) then refuses
 * as outside its window.
 */
export async function selectDueScheduledModules(
  servicePool: pg.Pool,
  opts: { asOf?: Date; limit?: number } = {},
): Promise<DueScheduledModule[]> {
  const limit = clampLimit(opts.limit, MODULE_ACTIVATION_SCAN_LIMIT);
  const at = opts.asOf === undefined ? 'now()' : '$2::timestamptz';
  const params: unknown[] = opts.asOf === undefined ? [limit] : [limit, opts.asOf.toISOString()];
  const res = await servicePool.query<{ pariwar_id: string; module_id: string; valid_from: Date; valid_until: Date }>(
    `SELECT pariwar_id, module_id, valid_from, valid_until FROM marketplace_modules
      WHERE current_state = 'scheduled' AND valid_from <= ${at} AND valid_until > ${at}
      ORDER BY valid_from, module_id
      LIMIT $1`,
    params,
  );
  return res.rows.map((r) => ({
    pariwarId: toPariwarId(r.pariwar_id),
    moduleId: toModuleId(r.module_id),
    validFrom: r.valid_from,
    validUntil: r.valid_until,
  }));
}

/**
 * PURE. How the job counts a failed activation: a racing withdraw (`ModuleIllegalTransitionError` — the module is no
 * longer `scheduled`) or a window that closed between scan and lock (`ModuleOutsideWindowError`) is `skipped` — the row
 * will never be re-selected; anything else is `failed` (logged; the next tick retries it).
 */
export function classifyActivationOutcome(err: unknown): 'skipped' | 'failed' {
  return err instanceof ModuleIllegalTransitionError || err instanceof ModuleOutsideWindowError ? 'skipped' : 'failed';
}
