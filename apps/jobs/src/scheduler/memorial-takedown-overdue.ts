// The memorial take-down WATCH — a daily IST tick (Story 11b.4a, Task 8.2; AC10; `2026-10-27-412` MP14 (b)).
//
// `-392` item 4 (Trustee-ratified, kept by `-395`): a take-down is done *"within 7 days of the family's request reaching the
// helpline"* — `due_at = first_contact_at + 7 days` (stored, 0187). ⭐ This tick COUNTS the open requests past `due_at`, per Pariwar,
// and writes ONE `warn` line `memorial.takedown.overdue` `{ pariwarId, count }` per Pariwar with ≥ 1 — ⛔ no names, ⛔ no ids beyond
// the Pariwar, ⛔ no email (⛔ no further identity read), silent at zero. It takes ⛔ nothing down: `-393` M4 — the nominee may
// choose to keep the memorial, so day 7 is a prompt to the operator, ⛔ never an automatic act.
// The read is CROSS-TENANT on the BYPASSRLS service pool — the domain's `countOverdueMemorialTakedownRequests` carries the written
// defence. The queue name lives in `@twt/queue`'s `QUEUE_NAMES` (the registry — DD-3); the constant below is a local alias for it.

import { memorial } from '@twt/domain';
import { QUEUE_NAMES, type Job, type QueueClient } from '@twt/queue';
import type pg from 'pg';

import { CLAIM_CORRECTION_TZ, CORRECTION_SWEEP_RETRY } from './claim-correction-reminders.js';

export const MEMORIAL_TAKEDOWN_OVERDUE_QUEUE = QUEUE_NAMES.MEMORIAL_TAKEDOWN_OVERDUE_WATCH;
/** Daily, 09:00 IST — a working-hours prompt to the helpline. */
export const MEMORIAL_TAKEDOWN_OVERDUE_CRON = '0 9 * * *';

export interface MemorialTakedownOverdueDeps {
  /** The BYPASSRLS service pool. */
  readonly pool: pg.Pool;
  readonly now?: () => Date;
  /** The `warn` line. Default `console.warn(event, JSON.stringify(fields))`. */
  readonly onWarn?: (event: 'memorial.takedown.overdue', fields: { readonly pariwarId: string; readonly count: number }) => void;
  /** ⚠ TESTS ONLY — restrict the cross-tenant count to these Pariwars. */
  readonly pariwarAllowlist?: readonly string[];
}

/** ⭐ ONE tick: one `warn` per Pariwar with ≥ 1 overdue open request; ⛔ no line at zero. Returns what it warned about. */
export async function runMemorialTakedownOverdueWatch(
  deps: MemorialTakedownOverdueDeps,
): Promise<readonly { readonly pariwarId: string; readonly count: number }[]> {
  const counts = await memorial.countOverdueMemorialTakedownRequests(deps.pool, {
    now: deps.now?.() ?? new Date(),
    allow: deps.pariwarAllowlist ? [...deps.pariwarAllowlist] : null,
  });
  const warn = deps.onWarn ?? ((event, fields): void => console.warn(event, JSON.stringify(fields)));
  for (const c of counts) warn('memorial.takedown.overdue', { pariwarId: c.pariwarId, count: c.count });
  return counts;
}

/** Register the queue, its worker and the daily IST schedule. */
export async function registerMemorialTakedownOverdueWorker(
  boss: QueueClient,
  deps: MemorialTakedownOverdueDeps,
  opts: { readonly cron?: string; readonly tz?: string } = {},
): Promise<void> {
  await boss.createQueue(MEMORIAL_TAKEDOWN_OVERDUE_QUEUE);
  await boss.work(MEMORIAL_TAKEDOWN_OVERDUE_QUEUE, async (jobs: Job[]) => {
    const warned = await runMemorialTakedownOverdueWatch(deps);
    return { jobs: jobs.length, pariwars: warned.length };
  });
  await boss.schedule(MEMORIAL_TAKEDOWN_OVERDUE_QUEUE, opts.cron ?? MEMORIAL_TAKEDOWN_OVERDUE_CRON, {}, {
    tz: opts.tz ?? CLAIM_CORRECTION_TZ,
    ...CORRECTION_SWEEP_RETRY,
  });
}
