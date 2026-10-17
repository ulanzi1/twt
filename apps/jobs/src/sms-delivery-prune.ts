// MSG91's SMS delivery reports — the daily inbox PRUNE (Story 6.37b, Task 5; `2026-10-17-347` DR7; AC10).
//
// Deletes report-inbox rows SETTLED (any `match_state` ⛔ `pending`) more than 30 days ago, by `settled_at` — the clock
// every settle stamps. `pending` rows are ⛔ pruned (the correlator still owes them a decision), and `sms_send_deliveries`
// is ⛔ pruned at all (it is the record). One idempotent DELETE on the BYPASSRLS service pool (the inbox is global —
// roster Row 26 decides jobs' production role). The `device-token-cleanup.ts` registration shape.

import { smsDelivery } from '@twt/domain';
import { QUEUE_NAMES, type Job, type QueueClient } from '@twt/queue';
import type pg from 'pg';

import { errorClass } from './sms-delivery-correlator.js';

/** DR7 — how long a settled report is kept. */
export const SMS_DELIVERY_REPORT_RETENTION_DAYS = 30;

export const DEFAULT_SMS_DELIVERY_PRUNE_CRON = '25 3 * * *'; // 03:25 IST daily
export const SMS_DELIVERY_PRUNE_TZ = 'Asia/Kolkata';

export interface SmsDeliveryPruneDeps {
  readonly pool: pg.Pool;
  readonly now?: () => Date;
}

/** The worker body: one prune. Returns the number of rows deleted. */
export function runSmsDeliveryPrune(deps: SmsDeliveryPruneDeps): Promise<number> {
  return smsDelivery.pruneSettledSmsDeliveryReports(deps.pool, {
    olderThanDays: SMS_DELIVERY_REPORT_RETENTION_DAYS,
    now: (deps.now ?? (() => new Date()))(),
  });
}

export async function registerSmsDeliveryPruneCron(
  boss: QueueClient,
  deps: SmsDeliveryPruneDeps,
  opts: { cron?: string; tz?: string } = {},
): Promise<void> {
  await boss.createQueue(QUEUE_NAMES.SMS_DELIVERY_PRUNE);
  await boss.work(QUEUE_NAMES.SMS_DELIVERY_PRUNE, async (jobs: Job[]) => {
    try {
      const deleted = await runSmsDeliveryPrune(deps);
      console.info('[jobs] sms-delivery-prune', JSON.stringify({ jobs: jobs.length, deleted }));
      return { deleted };
    } catch (err) {
      console.error('[jobs] sms-delivery-prune failed', errorClass(err)); // ⛔ the message (it can quote a value)
      throw err;
    }
  });
  await boss.schedule(QUEUE_NAMES.SMS_DELIVERY_PRUNE, opts.cron ?? DEFAULT_SMS_DELIVERY_PRUNE_CRON, {}, {
    tz: opts.tz ?? SMS_DELIVERY_PRUNE_TZ,
  });
}
