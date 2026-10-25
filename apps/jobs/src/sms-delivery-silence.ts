// MSG91's SMS delivery reports — the daily SILENCE alarm and the login-code line (Story 6.37b, Task 5; `2026-10-17-347`
// DR11, DR12; AC9).
//
// ── Silence (DR12) ─────────────────────────────────────────────────────────────────────────────────────────────
// Counts the ACCEPTED SMS sends finalised between 7 days and 48 h ago that have ⛔ delivery record AND ⛔ inbox row
// carrying their CRQID — per send kind (a correction reminder or closure notice — ⛔ a staff push, an FCM id; a
// certificate reminder; a suspicion notice; a peer-mesh ping by `send_outcome` / `send_updated_at`; Story 5.11b — an alert SMS
// send, kind `as`). Any ⇒ ONE alarm
// `sms_report.silence:<total>` with the per-kind counts: a PAUSED webhook (MSG91 auto-pauses one that fails — F6), an
// account fault MSG91 never reports (F8), or a dropped CRQID (DR3). ⚠ A phone off for two days can still read as silence
// — the alarm is a POINTER for a person, ⛔ a state, ⛔ an input to a send. The pull API fallback is OUT (DR12 (b)).
// ⭐ Story 5.11b (FS22): + the STALE alert sends — `attempting` rows last touched MORE than 1 h ago, at ANY age (a crash on the
// job's FINAL attempt leaves a row ⛔ attempt finalises; the correlator gives up at 72 h and the silence count sees only
// `accepted`). Any ⇒ ONE alarm `sms_report.stale_attempting:<n>`, repeated on every daily run until a person clears the rows
// (code-review decision C1-D2 (a), 2026-10-25 — an upper bound would let a stuck row go silent; the runbook is roster Row 40's).
//
// ── The login-code line (DR11) ─────────────────────────────────────────────────────────────────────────────────
// ONE information line counting the `otp:*` reports settled in the last 24 h by result — ⛔ an id, ⛔ a member. Until
// roster Row 33 (e0) it is ⛔ evidence that codes were delivered and feeds ⛔ alarm (the OTP production gates).

import { smsDelivery } from '@twt/domain';
import { QUEUE_NAMES, type Job, type QueueClient } from '@twt/queue';
import type pg from 'pg';

import { errorClass } from './sms-delivery-correlator.js';

export const DEFAULT_SMS_DELIVERY_SILENCE_CRON = '40 3 * * *'; // 03:40 IST daily
export const SMS_DELIVERY_SILENCE_TZ = 'Asia/Kolkata';

const DAY_MS = 24 * 3_600_000;

export interface SmsDeliverySilenceDeps {
  readonly pool: pg.Pool;
  readonly now?: () => Date;
  /** The silence alarm (default `console.warn`; ⛔ wired in boot — roster Row 32 (h)). */
  readonly onAlarm?: (message: string) => void;
  /** The information line (default `console.info`). */
  readonly log?: (message: string) => void;
}

export interface SmsDeliverySilenceSummary {
  readonly silent: Readonly<Record<smsDelivery.SmsSendRowKind, number>>;
  readonly silentTotal: number;
  /** Story 5.11b — `as` rows left `attempting` MORE than 1 h ago (any age — decision C1-D2 (a)). */
  readonly staleAlertSends: number;
  readonly otp: smsDelivery.OtpDeliveryCounts;
}

/** The worker body — the silence count (alarmed when > 0) and the login-code line. */
export async function runSmsDeliverySilenceCheck(deps: SmsDeliverySilenceDeps): Promise<SmsDeliverySilenceSummary> {
  const now = (deps.now ?? (() => new Date()))();
  const alarm = deps.onAlarm ?? ((m: string): void => console.warn(m));
  const log = deps.log ?? ((m: string): void => console.info(m));
  // Code review round 2 — under an RLS-bound role (roster Row 26) every silence count is a silent 0: refuse it loudly instead.
  // (The login-code count reads only the GLOBAL inbox, so it is still read under such a role.)
  const crossTenant = await smsDelivery.canReadAcrossPariwars(deps.pool);
  // BOTH counts before any line (code review round 2): a failed second query after the alarm would make pg-boss's retry
  // raise the same alarm twice.
  const silent = crossTenant ? await smsDelivery.countSilentSmsSends(deps.pool, { now }) : { cr: 0, ce: 0, sn: 0, pm: 0, as: 0 };
  const staleAlertSends = crossTenant ? await smsDelivery.countStaleAlertSmsSends(deps.pool, { now }) : 0;
  const otp = await smsDelivery.countOtpDeliveryReports(deps.pool, { from: new Date(now.getTime() - DAY_MS), to: now });
  const silentTotal = silent.cr + silent.ce + silent.sn + silent.pm + silent.as;
  if (!crossTenant) alarm('[jobs] sms-delivery-silence: sms_report.rls_bound_role — ⛔ silence counted');
  if (silentTotal > 0) {
    alarm(
      `[jobs] sms-delivery-silence: sms_report.silence:${silentTotal} — accepted texts 48 h–7 days old with ⛔ delivery report ` +
        `(cr ${silent.cr}, ce ${silent.ce}, sn ${silent.sn}, pm ${silent.pm}, as ${silent.as}); check MSG91's webhook (paused?), ` +
        `the account balance and the CRQID (roster Row 33)`,
    );
  }
  if (staleAlertSends > 0) {
    alarm(
      `[jobs] sms-delivery-silence: sms_report.stale_attempting:${staleAlertSends} — alert texts begun more than 1 h ago and ⛔ ` +
        `finalised (a crash on a job's final attempt: the gateway may or may not have taken them — ⛔ re-sent; ` +
        `clear each with an owner-role UPDATE to error / exhausted:outcome_unknown — roster Row 40)`,
    );
  }
  log(
    `[jobs] sms-delivery: otp delivery: delivered ${otp.delivered}, undelivered ${otp.undelivered}, ` +
      `intermediate ${otp.intermediate}, unknown ${otp.unknown}`,
  );
  return { silent, silentTotal, staleAlertSends, otp };
}

export async function registerSmsDeliverySilenceCron(
  boss: QueueClient,
  deps: SmsDeliverySilenceDeps,
  opts: { cron?: string; tz?: string } = {},
): Promise<void> {
  await boss.createQueue(QUEUE_NAMES.SMS_DELIVERY_SILENCE);
  await boss.work(QUEUE_NAMES.SMS_DELIVERY_SILENCE, async (jobs: Job[]) => {
    try {
      const summary = await runSmsDeliverySilenceCheck(deps);
      return { jobs: jobs.length, silentTotal: summary.silentTotal };
    } catch (err) {
      console.error('[jobs] sms-delivery-silence failed', errorClass(err)); // ⛔ the message (it can quote a value)
      throw err;
    }
  });
  await boss.schedule(QUEUE_NAMES.SMS_DELIVERY_SILENCE, opts.cron ?? DEFAULT_SMS_DELIVERY_SILENCE_CRON, {}, {
    tz: opts.tz ?? SMS_DELIVERY_SILENCE_TZ,
  });
}
