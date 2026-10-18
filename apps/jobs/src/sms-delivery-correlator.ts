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
// reach or letter-eligibility reads `sms_send_deliveries` in this story — the Panel-ruled reader is Story 6.37c's
// delivery ladder (`claim-contact-ladder.ts`; the chase readers' B1 mapping, `applyConcludedLadderMapping`).
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

/** DR4 — map a stored status code (NULL ⇒ unknown). A zero-padded code (`01`, `016`) is its number (code review round 2). */
export function mapSmsReportStatus(statusCode: string | null): SmsReportResult {
  if (statusCode === null) return 'unknown_status';
  const code = /^[0-9]{1,3}$/.test(statusCode) ? String(Number(statusCode)) : statusCode;
  return Object.hasOwn(SMS_REPORT_STATUS_TABLE, code) ? SMS_REPORT_STATUS_TABLE[code]! : 'unknown_status';
}

/** DR6 — a retry's backoff by the claimed attempt count (1 min, 5 min, 30 min, 2 h, then every 6 h). */
const BACKOFF_MS = [60_000, 5 * 60_000, 30 * 60_000, 2 * 3_600_000] as const;
const BACKOFF_LATER_MS = 6 * 3_600_000;
export function smsReportRetryDelayMs(attempts: number): number {
  return BACKOFF_MS[attempts - 1] ?? BACKOFF_LATER_MS;
}

/** DR6 — a retried row settles as its "after 72 h" result once this long after it was received. */
export const SMS_REPORT_RETRY_WINDOW_MS = 72 * 3_600_000;

/**
 * The SMS purposes of a `claim_correction_reminders` row (a `staff_push` holds an FCM id — DR6 row 4). Story 6.37c (F4,
 * T8): + `ladder_sms` — a delivery ladder's SMS 2 / 3 carries the `cr` CRQID, and its report must reach the ladder (else
 * ⛔ correction ladder ever ends `delivered`). ⛔ `ladder_escalation` (a staff record — ⛔ CRQID).
 */
const CORRECTION_SMS_PURPOSES: ReadonlySet<string> = new Set(['family_sms', 'closure_notice', 'ladder_sms']);
/**
 * The SMS purposes of a `claim_certificate_reminders` row (`letter_chase` / `letter_escalation` / `ladder_escalation` are
 * STAFF rows — DR6 row 4). Story 6.37c (F4, T8): + `ladder_sms` (the `ce` CRQID).
 */
const CERTIFICATE_SMS_PURPOSES: ReadonlySet<string> = new Set(['family_sms', 'ladder_sms']);

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
  // Row 4 — a correction- or certificate-table row that is ⛔ an SMS (a staff push / letter chase: unreachable — it carries
  // ⛔ CRQID). `ce` joined in code review round 2 (its staff rows were reaching row 7 as a "second request").
  const smsPurposes = kind === 'cr' ? CORRECTION_SMS_PURPOSES : kind === 'ce' ? CERTIFICATE_SMS_PURPOSES : null;
  if (smsPurposes !== null && (send.purpose === null || !smsPurposes.has(send.purpose))) {
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
  // The ids are compared case-INSENSITIVELY (code review round 2): MSG91's request id is hex, and whether the report echoes
  // the send response's case is ⛔ verified (roster Row 33 (g)) — a case change must ⛔ turn every report into a "double text".
  if (
    send.outcome !== 'accepted' ||
    send.providerMessageId === null ||
    send.providerMessageId.toLowerCase() !== report.requestId.toLowerCase()
  ) {
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

/**
 * One tick's tally — settles by `match_state:match_detail` (a given-up row as `unmatched:row_failed`), retries, CAS losses,
 * crashed rows LEFT to the lease, and claimed rows ⛔ reached before the lease's end (`leftToLease` — claimed again once that lease
 * lapses; the claim has already counted the attempt).
 */
export interface SmsDeliveryCorrelatorSummary {
  readonly claimed: number;
  readonly settled: Readonly<Record<string, number>>;
  readonly retried: number;
  readonly lostRace: number;
  readonly failed: number;
  readonly leftToLease: number;
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

/**
 * An error's CLASS for a log line — a pg SQLSTATE (`23514`), a Node system code (`ECONNREFUSED`) or the error's name
 * (`TypeError`); ⛔ its message or detail, which can quote a request id or CRQID. Shared by the three jobs' logs. ⚠ A residual:
 * the error a worker RETHROWS is serialised by pg-boss into the job's `output` row (message and pg detail included).
 */
export function errorClass(err: unknown): string {
  const e = err as { code?: unknown; name?: unknown } | null;
  if (typeof e?.code === 'string' && (/^[0-9A-Z]{5}$/.test(e.code) || /^E[A-Z0-9_]{2,40}$/.test(e.code))) return e.code;
  if (typeof e?.name === 'string' && /^[A-Za-z]{1,40}$/.test(e.name)) return e.name;
  return 'unknown';
}

/** A failing row is given up only after this many attempts AND 72 h (⛔ the first failure after an outage). */
export const SMS_REPORT_GIVE_UP_ATTEMPTS = 5;

/** ⭐ One drain tick (DR8). Never throws for a single row's failure (its lease lapses ⇒ re-claimed). */
export async function runSmsDeliveryCorrelatorTick(deps: SmsDeliveryCorrelatorDeps): Promise<SmsDeliveryCorrelatorSummary> {
  const clock = deps.now ?? (() => new Date());
  const now = clock();
  const alarm = deps.onAlarm ?? ((m: string): void => console.warn(m));
  // Code review round 2 — the lookup and the silence count read ACROSS Pariwars: under an RLS-bound role (roster Row 26) they
  // see ⛔ row and every report would settle `unmatched:no_row` after 72 h with ⛔ error. Refuse loudly instead (⛔ claim).
  if (!(await smsDelivery.canReadAcrossPariwars(deps.pool))) {
    alarm('[jobs] sms-delivery-correlator: sms_report.rls_bound_role (count 1) — ⛔ claimed');
    return { claimed: 0, settled: {}, retried: 0, lostRace: 0, failed: 0, leftToLease: 0 };
  }
  const leaseMs = deps.leaseMs ?? smsDelivery.SMS_REPORT_LEASE_MS;
  const claimed = await smsDelivery.claimDueSmsDeliveryReports(deps.pool, {
    now,
    ...(deps.limit !== undefined ? { limit: deps.limit } : {}),
    leaseMs,
  });
  // Stop before the claim's lease lapses: a row decided after it would only lose its compare-and-set (the rest are claimed
  // again once that lease lapses). Each row reads the clock afresh — its settle time, retry time and 72 h test (code review round 2).
  const stopAt = now.getTime() + leaseMs - Math.min(30_000, leaseMs / 10);
  const settled: Record<string, number> = {};
  const alarms = new Map<string, number>();
  const failedCodes = new Map<string, number>();
  let retried = 0;
  let lostRace = 0;
  let failed = 0;
  let leftToLease = 0;
  for (const [index, report] of claimed.entries()) {
    const rowNow = clock();
    if (rowNow.getTime() >= stopAt) {
      leftToLease = claimed.length - index;
      break;
    }
    try {
      const { decision, moved } = await correlateOne(deps.pool, report, rowNow);
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
    } catch (err) {
      // ⛔ the error's message — a pg error can quote a value; its CLASS only.
      const code = errorClass(err);
      // Code review round 2 — a row that fails every time would be re-claimed forever (the prune keeps `pending` rows): after
      // SMS_REPORT_GIVE_UP_ATTEMPTS attempts AND 72 h from receipt it is settled `unmatched:row_failed` by a bare compare-and-set.
      // ⛔ On the first failure after an outage: a transient on a backlog row must ⛔ lose a real report.
      const due = report.attempts >= SMS_REPORT_GIVE_UP_ATTEMPTS && rowNow.getTime() >= report.receivedAt.getTime() + SMS_REPORT_RETRY_WINDOW_MS;
      const gaveUp =
        due &&
        (await smsDelivery
          .settleSmsDeliveryReport(deps.pool, {
            reportId: report.reportId,
            claimedAttempts: report.attempts,
            settlement: { kind: 'settle', matchState: 'unmatched', matchDetail: 'row_failed' },
            now: rowNow,
          })
          .catch(() => false));
      if (gaveUp) {
        settled['unmatched:row_failed'] = (settled['unmatched:row_failed'] ?? 0) + 1;
        alarms.set(`sms_report.row_failed_final:${code}`, (alarms.get(`sms_report.row_failed_final:${code}`) ?? 0) + 1);
      } else {
        failed += 1; // left to the lease — claimed again once it lapses
        failedCodes.set(code, (failedCodes.get(code) ?? 0) + 1);
      }
    }
  }
  for (const [kind, count] of [...alarms].sort(([a], [b]) => a.localeCompare(b))) {
    alarm(`[jobs] sms-delivery-correlator: ${kind} (count ${count})`);
  }
  if (failed > 0) {
    const codes = [...failedCodes].sort(([a], [b]) => a.localeCompare(b)).map(([c, n]) => `${c}×${n}`).join(' ');
    alarm(`[jobs] sms-delivery-correlator: sms_report.row_failed (count ${failed}; ${codes}) — left to the lease`);
  }
  return { claimed: claimed.length, settled, retried, lostRace, failed, leftToLease };
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
      // The SQLSTATE only — a claim error's detail can quote a request id or CRQID (DR8's ⛔-id rule; code review round 2).
      console.error('[jobs] sms-delivery-correlator failed', errorClass(err));
      throw err;
    }
  });
  await boss.schedule(QUEUE_NAMES.SMS_DELIVERY_CORRELATOR, opts.cron ?? DEFAULT_SMS_DELIVERY_CORRELATOR_CRON, {}, {
    tz: opts.tz ?? SMS_DELIVERY_CORRELATOR_TZ,
  });
}
