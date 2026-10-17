// MSG91's SMS delivery reports — the jobs CORRELATOR (Story 6.37b, Task 5; `2026-10-17-347` DR4, DR6, DR8; I1, I2, I6;
// ADR-0042).
//
// Every minute (IST) it claims ≤ 200 due `pending` rows of the report inbox under a LEASE (⛔ a `processed_at` stamped in
// the claim — the Telegram / WA drain's at-most-once trap, T2) and settles each one by DR6's ordered table, first match
// wins. A row is decided, recorded and settled in ONE transaction on the service pool; the settle is a compare-and-set,
// so a settle replayed after its lease lapsed rolls the whole row back (⛔ a report counted twice — AC7). A crash on one
// row is isolated: its lease lapses and it is claimed again.
//
// ── What a report may change (I1, I2) ───────────────────────────────────────────────────────────────────────────
// ONLY `sms_send_deliveries` (DR6 row 8) and the inbox row itself. The four send tables are READ by one primary-key
// lookup and ⛔ ever written (their freezes — 0155, 0166 — stay untouched). ⛔ A predicate that decides a send, a closure,
// reach or letter-eligibility reads `sms_send_deliveries` in this story (the Panel-ruled use is row 6-37c).
//
// ── DR4 — the status table (data, ⛔ branches) ─────────────────────────────────────────────────────────────────
// `1` ⇒ delivered; `2` / `9` / `16` / `17` / `20` / `25` ⇒ undelivered (final — MSG91's help page, 2026-09-10); `0` ⇒
// intermediate (recorded, ⛔ state); NULL / any other ⇒ unknown_status + an alarm (an unknown code ⛔ un-counts a send).
// `event_name` / `failure_reason` are RECORDED and ⛔ decide anything (their strings are ⛔ documented).
//
// ── Alarms (DR8) ───────────────────────────────────────────────────────────────────────────────────────────────
// Through `onAlarm` (default `console.warn`; ⛔ wired in boot — logs only until roster Row 32 (h)): ONE line per alarm
// kind per tick, with its count — the KIND and COUNTS only, ⛔ an id, ⛔ a request id, ⛔ a number.

import { smsDelivery } from '@twt/domain';
import { QUEUE_NAMES, type Job, type QueueClient } from '@twt/queue';
import type pg from 'pg';

type SendRowKind = smsDelivery.SmsSendRowKind;

/** DR4 — what a report's status code means. */
export type SmsReportResult = 'delivered' | 'undelivered' | 'intermediate' | 'unknown_status';

/** ⭐ DR4 — the ONE status table. A code not here is `unknown_status`. */
export const SMS_REPORT_STATUS_TABLE: Readonly<Record<string, Exclude<SmsReportResult, 'unknown_status'>>> = Object.freeze({
  '0': 'intermediate',
  '1': 'delivered',
  '2': 'undelivered',
  '9': 'undelivered',
  '16': 'undelivered',
  '17': 'undelivered',
  '20': 'undelivered',
  '25': 'undelivered',
});

/** DR4 — map a stored status code (NULL ⇒ unknown). */
export function mapSmsReportStatus(statusCode: string | null): SmsReportResult {
  if (statusCode === null) return 'unknown_status';
  return Object.hasOwn(SMS_REPORT_STATUS_TABLE, statusCode) ? SMS_REPORT_STATUS_TABLE[statusCode]! : 'unknown_status';
}

/** DR6 — a retry's backoff by the claimed attempt count (1 min, 5 min, 30 min, 2 h, then every 6 h). */
const BACKOFF_MS = [60_000, 5 * 60_000, 30 * 60_000, 2 * 3_600_000] as const;
const BACKOFF_LATER_MS = 6 * 3_600_000;
export function smsReportRetryDelayMs(attempts: number): number {
  return BACKOFF_MS[attempts - 1] ?? BACKOFF_LATER_MS;
}

/** DR6 — a retried row settles as its "after 72 h" result once this long after it was received. */
export const SMS_REPORT_RETRY_WINDOW_MS = 72 * 3_600_000;

/** The SMS purposes of a `claim_correction_reminders` row (a `staff_push` holds an FCM id — DR6 row 4). */
const CORRECTION_SMS_PURPOSES: ReadonlySet<string> = new Set(['family_sms', 'closure_notice']);

/** DR6 — one row's decision. */
export type SmsReportDecision =
  | {
      readonly kind: 'settle';
      readonly matchState: 'matched' | 'other_attempt' | 'unmatched' | 'ignored' | 'otp';
      readonly matchDetail: string;
      readonly alarm?: string;
      /** DR6 row 8 — the `sms_send_deliveries` write that commits WITH the settle. */
      readonly delivery?: smsDelivery.SmsSendDeliveryReport;
    }
  | { readonly kind: 'retry'; readonly nextAttemptAt: Date };

function unknownStatusAlarm(statusCode: string | null): string {
  return `sms_report.unknown_status:${statusCode !== null && /^[0-9]{1,3}$/.test(statusCode) ? statusCode : 'none'}`;
}

/** DR6's "retry" — or, once 72 h after `received_at`, the row's "after 72 h" settle. */
function retryOr72h(
  report: smsDelivery.ClaimedSmsDeliveryReport,
  now: Date,
  after72h: { readonly matchDetail: string; readonly alarm: string },
): SmsReportDecision {
  const deadline = report.receivedAt.getTime() + SMS_REPORT_RETRY_WINDOW_MS;
  if (now.getTime() >= deadline) return { kind: 'settle', matchState: 'unmatched', ...after72h };
  // ⛔ past the window: the last retry is due AT it, so the row settles there (⛔ up to 6 h late).
  return { kind: 'retry', nextAttemptAt: new Date(Math.min(now.getTime() + smsReportRetryDelayMs(report.attempts), deadline)) };
}

/**
 * ⭐ DR6 — the matching rule, row by row (first match wins). `lookup` is the ONE primary-key read of the send the CRQID
 * names (⛔ called for rows 1–2).
 */
export async function decideSmsReport(
  report: smsDelivery.ClaimedSmsDeliveryReport,
  now: Date,
  lookup: (kind: SendRowKind, rowId: string) => Promise<smsDelivery.SmsSendRowFacts | null>,
): Promise<SmsReportDecision> {
  // Row 1 — ⛔ CRQID (never sent, `""` / `"0"`, a panel test send, a foreign send): the LOUD sign MSG91 dropped it (DR3).
  const correlation = report.crqid === null ? null : smsDelivery.parseSmsCorrelationId(report.crqid);
  if (correlation === null) return { kind: 'settle', matchState: 'unmatched', matchDetail: 'no_crqid', alarm: 'sms_report.no_crqid' };
  const result = mapSmsReportStatus(report.statusCode);

  // Row 2 — a login / step-up code: counted, ⛔ looked up (⛔ member, ⛔ row — DR11).
  if (correlation.kind === 'ot') {
    return {
      kind: 'settle',
      matchState: 'otp',
      matchDetail: result,
      ...(result === 'unknown_status' ? { alarm: unknownStatusAlarm(report.statusCode) } : {}),
    };
  }
  const kind = correlation.kind;
  const send = await lookup(kind, correlation.rowId);

  // Row 3 — ⛔ such row (yet).
  if (send === null) return retryOr72h(report, now, { matchDetail: 'no_row', alarm: `sms_report.unmatched:${kind}` });
  // Row 4 — a correction-table row that is ⛔ an SMS (a staff push: unreachable — a push carries ⛔ CRQID).
  if (kind === 'cr' && (send.purpose === null || !CORRECTION_SMS_PURPOSES.has(send.purpose))) {
    return { kind: 'settle', matchState: 'unmatched', matchDetail: 'not_sms', alarm: 'sms_report.not_sms' };
  }
  // Row 5 — a ping never begun.
  if (kind === 'pm' && send.outcome === null) {
    return retryOr72h(report, now, { matchDetail: 'not_begun', alarm: 'sms_report.unmatched:pm' });
  }
  // Row 6 — the report beat the finaliser's COMMIT.
  if (send.outcome === 'attempting' || send.outcome === null) {
    return retryOr72h(report, now, { matchDetail: 'still_attempting', alarm: `sms_report.unmatched:${kind}` });
  }
  // Row 7 — finished, but NOT this request's acceptance: another attempt of the row, or a row recorded ⛔ sent whose
  // request MSG91 nevertheless took (I6 — ⛔ a state change; a double text, or a text the row says was ⛔ sent).
  if (send.outcome !== 'accepted' || send.providerMessageId === null || send.providerMessageId !== report.requestId) {
    return {
      kind: 'settle',
      matchState: 'other_attempt',
      matchDetail: kind,
      alarm: `sms_report.second_request_for_one_send:${kind}`,
    };
  }
  // Row 8 — this request's acceptance, a final status: recorded (DR6's counting contract).
  if (result === 'delivered' || result === 'undelivered') {
    return {
      kind: 'settle',
      matchState: 'matched',
      matchDetail: result,
      delivery: {
        pariwarId: send.pariwarId,
        kind,
        rowId: correlation.rowId,
        requestId: report.requestId,
        state: result,
        statusCode: report.statusCode!,
        failureReason: report.failureReason,
        receivedAt: report.receivedAt,
      },
    };
  }
  // Row 9 — an intermediate or unknown status: ⛔ state.
  return {
    kind: 'settle',
    matchState: 'ignored',
    matchDetail: result,
    ...(result === 'unknown_status' ? { alarm: unknownStatusAlarm(report.statusCode) } : {}),
  };
}

/** The correlator's deps. */
export interface SmsDeliveryCorrelatorDeps {
  /** The BYPASSRLS service pool (the inbox is global; the send tables are read cross-tenant — F21, roster Row 26). */
  readonly pool: pg.Pool;
  readonly now?: () => Date;
  /** Alarm sink — the kind and counts only (default `console.warn`). */
  readonly onAlarm?: (message: string) => void;
  /** The claim's page size (clamped: default 200, cap 500). */
  readonly limit?: number;
  readonly leaseMs?: number;
}

/** One tick's tally — settles by `match_state:match_detail`, retries, CAS losses and crashed rows. */
export interface SmsDeliveryCorrelatorSummary {
  readonly claimed: number;
  readonly settled: Readonly<Record<string, number>>;
  readonly retried: number;
  readonly lostRace: number;
  readonly failed: number;
}

/** Decide, record and settle ONE claimed row in ONE transaction. `'lost'` ⇒ the CAS lost (rolled back). */
async function correlateOne(
  pool: pg.Pool,
  report: smsDelivery.ClaimedSmsDeliveryReport,
  now: Date,
): Promise<{ readonly decision: SmsReportDecision; readonly moved: boolean }> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const decision = await decideSmsReport(report, now, (kind, rowId) => smsDelivery.lookupSendForCorrelation(client, kind, rowId));
    if (decision.kind === 'settle' && decision.delivery !== undefined) await smsDelivery.upsertSmsSendDelivery(client, decision.delivery);
    const moved = await smsDelivery.settleSmsDeliveryReport(client, {
      reportId: report.reportId,
      claimedAttempts: report.attempts,
      settlement:
        decision.kind === 'settle'
          ? { kind: 'settle', matchState: decision.matchState, matchDetail: decision.matchDetail }
          : { kind: 'retry', nextAttemptAt: decision.nextAttemptAt },
      now,
    });
    // The CAS lost — a lapsed lease let another drain take the row: ⛔ this attempt's write (AC7).
    await client.query(moved ? 'COMMIT' : 'ROLLBACK');
    return { decision, moved };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

/** ⭐ One drain tick (DR8). Never throws for a single row's failure (its lease lapses ⇒ re-claimed). */
export async function runSmsDeliveryCorrelatorTick(deps: SmsDeliveryCorrelatorDeps): Promise<SmsDeliveryCorrelatorSummary> {
  const now = (deps.now ?? (() => new Date()))();
  const alarm = deps.onAlarm ?? ((m: string): void => console.warn(m));
  const claimed = await smsDelivery.claimDueSmsDeliveryReports(deps.pool, {
    now,
    ...(deps.limit !== undefined ? { limit: deps.limit } : {}),
    ...(deps.leaseMs !== undefined ? { leaseMs: deps.leaseMs } : {}),
  });
  const settled: Record<string, number> = {};
  const alarms = new Map<string, number>();
  let retried = 0;
  let lostRace = 0;
  let failed = 0;
  for (const report of claimed) {
    try {
      const { decision, moved } = await correlateOne(deps.pool, report, now);
      if (!moved) {
        lostRace += 1;
        continue;
      }
      if (decision.kind === 'retry') {
        retried += 1;
        continue;
      }
      const key = `${decision.matchState}:${decision.matchDetail}`;
      settled[key] = (settled[key] ?? 0) + 1;
      if (decision.alarm !== undefined) alarms.set(decision.alarm, (alarms.get(decision.alarm) ?? 0) + 1);
    } catch {
      // ⛔ the error — a pg error can quote a value; the row's lease lapses and it is claimed again.
      failed += 1;
    }
  }
  for (const [kind, count] of [...alarms].sort(([a], [b]) => a.localeCompare(b))) {
    alarm(`[jobs] sms-delivery-correlator: ${kind} (count ${count})`);
  }
  if (failed > 0) alarm(`[jobs] sms-delivery-correlator: sms_report.row_failed (count ${failed}) — left to the lease`);
  return { claimed: claimed.length, settled, retried, lostRace, failed };
}

export const DEFAULT_SMS_DELIVERY_CORRELATOR_CRON = '* * * * *';
export const SMS_DELIVERY_CORRELATOR_TZ = 'Asia/Kolkata';

/** Register the correlator queue + worker + cron (the `tg-webhook-processor` registration shape — ⛔ its claim, T2). */
export async function registerSmsDeliveryCorrelatorCron(
  boss: QueueClient,
  deps: SmsDeliveryCorrelatorDeps,
  opts: { cron?: string; tz?: string } = {},
): Promise<void> {
  await boss.createQueue(QUEUE_NAMES.SMS_DELIVERY_CORRELATOR);
  await boss.work(QUEUE_NAMES.SMS_DELIVERY_CORRELATOR, async (jobs: Job[]) => {
    try {
      const summary = await runSmsDeliveryCorrelatorTick(deps);
      if (summary.claimed > 0) console.info('[jobs] sms-delivery-correlator', JSON.stringify(summary));
      return { jobs: jobs.length, ...summary };
    } catch (err) {
      console.error('[jobs] sms-delivery-correlator failed', err);
      throw err;
    }
  });
  await boss.schedule(QUEUE_NAMES.SMS_DELIVERY_CORRELATOR, opts.cron ?? DEFAULT_SMS_DELIVERY_CORRELATOR_CRON, {}, {
    tz: opts.tz ?? SMS_DELIVERY_CORRELATOR_TZ,
  });
}
