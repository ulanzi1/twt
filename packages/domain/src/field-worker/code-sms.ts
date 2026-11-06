// The field-worker CODE SMS send record — the domain accessors (Story 13.1b, Task 2; decision `2026-11-06-450` AD1, AD3, AD8, AD12;
// AC1, AC3, AC4, AC10). Migration 0202's `field_worker_code_sms_sends`, read and written in RAW SQL on a caller-supplied `pg` handle:
// the approval's own client, the sweep's pool, or the hook transaction's client for the list read.
//
// ⭐ THE ROW'S LIFE (AD3 — the one order; the sweep in `apps/jobs` drives it, this file holds only the SQL):
//   1. {@link enqueueFieldWorkerCodeSms} — `activateFieldWorker`, in the approval's transaction: `due`.
//   2. {@link claimNextFieldWorkerCodeSms} — ONE row at a time, `due → attempting`, committed BEFORE the gateway call. The lease starts
//      here. A row a release sent back waits out its backoff: `2^(attempt_count - 1)` minutes after `updated_at`.
//   3. the read, the prepare, the audit line, the decrypt, the gateway call (no connection held across the last two).
//   4. {@link settleFieldWorkerCodeSms} — the compare-and-set `attempting → <final>` on the claim's own token; or
//      {@link releaseFieldWorkerCodeSms} — `attempting → due`, ONLY for what DEFINITELY did not reach the gateway.
//   Every tick, first: {@link lapseFieldWorkerCodeSms} — `attempting` past the lease ⇒ `error` / `exhausted:outcome_unknown` (the gateway
//   MAY have taken it, ⛔ re-sent); `due` past the max age ⇒ `error` / `exhausted:expired`.
// ⭐ TWO CLOCKS, both the database's: the lease and the backoff read `updated_at`, the max age reads `created_at`, which a release ⛔
// moves, so a row released every tick still expires.
// PII: ⛔ here at all. The row holds ids; `detail` is a closed grammar that bars a six-digit run; `detail` is read for the status and
// ⛔ leaves this file.

import type pg from 'pg';

import {
  FIELD_WORKER_CODE_SMS_DETAIL_PATTERN,
  type FieldWorkerCodeSmsLocale,
  type FieldWorkerCodeSmsOutcome,
  type FieldWorkerCodeSmsStatus,
} from '../schema/field_worker_code_sms_sends.js';
import type { SmsDeliveryState } from '../schema/sms_send_deliveries.js';

type Queryable = Pick<pg.Pool, 'query'> | Pick<pg.PoolClient, 'query'>;

/**
 * AD3 — the lease starts at the claim and covers the read, prepare, audit, KMS, send and settle: their bounded terms total about 80 s
 * (`field-worker-code-sms.test.ts` pins this above that sum). A row past it is a crash, ⛔ re-claimed.
 */
export const FIELD_WORKER_CODE_SMS_LEASE_MS = 5 * 60_000;

/** AD3 — a `due` row older than this ends `exhausted:expired`: a long jobs outage ends in the by-hand path, ⛔ a burst of day-old texts. */
export const FIELD_WORKER_CODE_SMS_MAX_AGE_MS = 24 * 3_600_000;

/**
 * AD3 — `attempt_count` rises at each claim; a release on this attempt is FINAL instead (`exhausted:attempts`). With the backoff the ten
 * attempts span about 8.5 hours, inside the max age. It bounds a stuck row's decrypts and audit lines.
 */
export const FIELD_WORKER_CODE_SMS_MAX_ATTEMPTS = 10;

/** `exhausted:outcome_unknown…`: the gateway MAY have taken it. AD12's ONE rule: every send-side unknown is written under this prefix. */
export const FIELD_WORKER_CODE_SMS_OUTCOME_UNKNOWN_PREFIX = 'exhausted:outcome_unknown';

const DETAIL = new RegExp(FIELD_WORKER_CODE_SMS_DETAIL_PATTERN);
/** What may go back to `due`: only what DEFINITELY did not reach the gateway (AD3). ⛔ `api_unavailable:<gateway word>`, ⛔ `unknown:*`. */
const RELEASE_DETAIL = /^(config_unavailable:secret_manager|api_unavailable:(kms|audit|db)|rate_limited:[A-Za-z0-9_.-]{1,64})$/;

/** Every writer asserts the grammar BEFORE its statement (the CHECK is the backstop). */
export function isFieldWorkerCodeSmsDetail(detail: string): boolean {
  return DETAIL.test(detail);
}

function assertDetail(detail: string | null): void {
  if (detail !== null && !DETAIL.test(detail)) throw new Error('field_worker_code_sms_sends: a detail outside the grammar');
}

/**
 * ⭐ Step 1 (AD1) — record the text as DUE, on the approval's client. A plain INSERT of the three columns 0202 grants `twt_app`:
 * `UNIQUE (pariwar_id, field_worker_id)` cannot fire because `pending_kyc → active` happens once; if it ever does, the approval fails.
 */
export async function enqueueFieldWorkerCodeSms(
  q: Queryable,
  input: { readonly pariwarId: string; readonly fieldWorkerId: string; readonly activatedAuditId: string },
): Promise<void> {
  await q.query(`INSERT INTO field_worker_code_sms_sends (pariwar_id, field_worker_id, activated_audit_id) VALUES ($1, $2, $3)`, [
    input.pariwarId,
    input.fieldWorkerId,
    input.activatedAuditId,
  ]);
}

/** One claimed row — what the attempt needs. The code and the number are ⛔ on it (AD7). */
export interface ClaimedFieldWorkerCodeSms {
  readonly sendId: string;
  readonly pariwarId: string;
  readonly fieldWorkerId: string;
  /** Rose with this claim: 1 on the first attempt. */
  readonly attemptCount: number;
}

/**
 * ⭐ Step 2 — claim the next row, or null. ONE row (TR6: a batch's tail would wait out its lease behind earlier sends). Ordered by
 * `updated_at`, then `send_id`, so a released row goes behind every waiting row (TR11: oldest-first would keep it at the head for a day),
 * and a released row is not claimable until its backoff has passed. The MATERIALIZED CTE keeps `SKIP LOCKED LIMIT 1` honest
 * ([[project_in_subquery_limit_skip_locked_overclaim]]): one statement, so the claim commits on its own on a pool.
 *
 * DELIBERATE (checklist family 9): this reads and claims EVERY Pariwar's `due` rows on a handle the caller supplies - the sweep's own pool,
 * which bypasses RLS. Rationale: the sweep is one platform-wide job with no request to take a Pariwar from, and the row it returns holds ids
 * only. The caller checks `smsDelivery.canReadAcrossPariwars` first (an RLS-bound login would claim nothing and say nothing). Re-examine if
 * this is ever called from a request path, or when the sweep moves to an RLS-bound login (roster Row 26; Row 49 (f)).
 */
export async function claimNextFieldWorkerCodeSms(q: Queryable, input: { readonly claimToken: string }): Promise<ClaimedFieldWorkerCodeSms | null> {
  const { rows } = await q.query<{ send_id: string; pariwar_id: string; field_worker_id: string; attempt_count: number }>(
    `WITH next AS MATERIALIZED (
       SELECT send_id FROM field_worker_code_sms_sends
        WHERE outcome = 'due'
          AND (attempt_count = 0 OR updated_at <= clock_timestamp() - (2 ^ (attempt_count - 1)) * interval '1 minute')
        ORDER BY updated_at, send_id
        FOR UPDATE SKIP LOCKED
        LIMIT 1
     )
     UPDATE field_worker_code_sms_sends s
        SET outcome = 'attempting', claim_token = $1, attempt_count = s.attempt_count + 1, updated_at = clock_timestamp()
       FROM next
      WHERE s.send_id = next.send_id
      RETURNING s.send_id, s.pariwar_id, s.field_worker_id, s.attempt_count`,
    [input.claimToken],
  );
  const r = rows[0];
  return r === undefined ? null : { sendId: r.send_id, pariwarId: r.pariwar_id, fieldWorkerId: r.field_worker_id, attemptCount: r.attempt_count };
}

/** The finals (AD8): ⛔ `due`, ⛔ `attempting`. */
export type FieldWorkerCodeSmsFinalOutcome = Exclude<FieldWorkerCodeSmsOutcome, 'due' | 'attempting'>;

/**
 * ⭐ Step 4 — the COMPARE-AND-SET `attempting → <final>`, only by the claim holding the row. `false` ⇒ the row moved on (the lease took it).
 * It ALWAYS writes `detail` (null on `accepted`), so a released attempt's word does not linger. `accepted` REQUIRES the provider's
 * request id (the CHECK backs it).
 */
export async function settleFieldWorkerCodeSms(
  q: Queryable,
  input: {
    readonly pariwarId: string;
    readonly sendId: string;
    readonly claimToken: string;
    readonly outcome: FieldWorkerCodeSmsFinalOutcome;
    readonly detail: string | null;
    readonly providerMessageId?: string | null;
    readonly locale?: FieldWorkerCodeSmsLocale | null;
  },
): Promise<boolean> {
  assertDetail(input.detail);
  if (input.outcome === 'accepted' && !input.providerMessageId) {
    throw new Error('settleFieldWorkerCodeSms: accepted needs the provider request id');
  }
  const { rowCount } = await q.query(
    `UPDATE field_worker_code_sms_sends
        SET outcome = $4, detail = $5, provider_message_id = $6, locale = $7, updated_at = clock_timestamp()
      WHERE pariwar_id = $1 AND send_id = $2 AND outcome = 'attempting' AND claim_token = $3`,
    [input.pariwarId, input.sendId, input.claimToken, input.outcome, input.detail, input.providerMessageId ?? null, input.locale ?? null],
  );
  return (rowCount ?? 0) > 0;
}

/**
 * ⭐ Step 4, the other way — the COMPARE-AND-SET `attempting → due`, only for a detail that says the gateway DEFINITELY did not take it
 * (AD3): at-most-once is ⛔ traded for a retry. `updated_at` moves, so the row goes to the back of the queue and starts its backoff.
 * `false` ⇒ the row moved on. The sweep settles instead on attempt {@link FIELD_WORKER_CODE_SMS_MAX_ATTEMPTS}.
 */
export async function releaseFieldWorkerCodeSms(
  q: Queryable,
  input: { readonly pariwarId: string; readonly sendId: string; readonly claimToken: string; readonly detail: string },
): Promise<boolean> {
  assertDetail(input.detail);
  if (!RELEASE_DETAIL.test(input.detail)) throw new Error('releaseFieldWorkerCodeSms: the detail does not prove the gateway was not reached');
  const { rowCount } = await q.query(
    `UPDATE field_worker_code_sms_sends
        SET outcome = 'due', detail = $4, updated_at = clock_timestamp()
      WHERE pariwar_id = $1 AND send_id = $2 AND outcome = 'attempting' AND claim_token = $3`,
    [input.pariwarId, input.sendId, input.claimToken, input.detail],
  );
  return (rowCount ?? 0) > 0;
}

/** One row a lapse ended — enough to alarm by id. */
export interface LapsedFieldWorkerCodeSms {
  readonly sendId: string;
  readonly pariwarId: string;
  readonly detail: 'exhausted:outcome_unknown' | 'exhausted:expired';
}

/**
 * ⭐ Every tick, first — ONE statement over every Pariwar, both clocks on `clock_timestamp()`: `attempting` past the lease (judged on
 * `updated_at`) and `due` past the max age (judged on `created_at`, ⛔ `updated_at`). The options exist for tests only, because the DB clock
 * cannot be backdated by an update.
 *
 * DELIBERATE (checklist family 9): one statement over EVERY Pariwar's rows on a handle the caller supplies (the sweep's own pool, which
 * bypasses RLS). Rationale: a lapse is a platform-wide clock, not any tenant's act, and it returns ids and a closed word only. The caller
 * checks `canReadAcrossPariwars` first, as for the claim. Re-examine under the same triggers: a request-path caller, or an RLS-bound login.
 */
export async function lapseFieldWorkerCodeSms(
  q: Queryable,
  opts: { readonly leaseMs?: number; readonly maxAgeMs?: number } = {},
): Promise<LapsedFieldWorkerCodeSms[]> {
  const { rows } = await q.query<{ send_id: string; pariwar_id: string; detail: LapsedFieldWorkerCodeSms['detail'] }>(
    `UPDATE field_worker_code_sms_sends
        SET outcome = 'error',
            detail = CASE outcome WHEN 'attempting' THEN 'exhausted:outcome_unknown' ELSE 'exhausted:expired' END,
            updated_at = clock_timestamp()
      WHERE (outcome = 'attempting' AND updated_at < clock_timestamp() - ($1::bigint * interval '1 millisecond'))
         OR (outcome = 'due' AND created_at < clock_timestamp() - ($2::bigint * interval '1 millisecond'))
      RETURNING send_id, pariwar_id, detail`,
    [opts.leaseMs ?? FIELD_WORKER_CODE_SMS_LEASE_MS, opts.maxAgeMs ?? FIELD_WORKER_CODE_SMS_MAX_AGE_MS],
  );
  return rows.map((r) => ({ sendId: r.send_id, pariwarId: r.pariwar_id, detail: r.detail }));
}

/** What the status is derived from: the row's outcome and detail, and the delivery report's state. */
export interface FieldWorkerCodeSmsFacts {
  readonly outcome: FieldWorkerCodeSmsOutcome;
  readonly detail: string | null;
  readonly report: SmsDeliveryState | null;
}

/** A definite failure, or an unknown outcome (AD12): reading the two as one would state as fact something nobody knows. */
const ofError = ({ detail }: FieldWorkerCodeSmsFacts): FieldWorkerCodeSmsStatus =>
  detail?.startsWith(FIELD_WORKER_CODE_SMS_OUTCOME_UNKNOWN_PREFIX) ? 'not_confirmed' : 'not_delivered';

const STATUS_OF = {
  due: () => 'sending',
  attempting: () => 'sending',
  accepted: ({ report }) => (report === null ? 'sent' : report === 'delivered' ? 'delivered' : 'not_delivered'),
  rejected_invalid_number: () => 'not_delivered',
  rejected_unreachable: () => 'not_delivered',
  skipped_not_active: () => 'not_delivered',
  error: ofError,
} satisfies Record<FieldWorkerCodeSmsOutcome, (facts: FieldWorkerCodeSmsFacts) => FieldWorkerCodeSmsStatus>;

/**
 * ⭐ AD12 — the signal: five words and a null. PURE and TOTAL over the outcomes (`satisfies`: a new outcome does not compile). `null` ⇒ no
 * row: a worker not yet approved, or approved before this story. ⚠ A report on a row that is not `accepted` records nothing (G18), so
 * `report` is read for `accepted` alone.
 */
export function deriveFieldWorkerCodeSmsStatus(facts: FieldWorkerCodeSmsFacts | null): FieldWorkerCodeSmsStatus | null {
  return facts === null ? null : STATUS_OF[facts.outcome](facts);
}

/**
 * AD12 — the status of each worker on a page, in ONE statement keyed on the page's ids, run on the caller's transaction: `twt_app` reads
 * both tables under their tenant policies, and the `pariwar_id` predicates are explicit. A worker with no row is ABSENT from the map.
 * Empty input answers without SQL. ⛔ `detail` in the map.
 */
export async function getFieldWorkerCodeSmsStatuses(
  q: Queryable,
  pariwarId: string,
  fieldWorkerIds: readonly string[],
): Promise<Map<string, FieldWorkerCodeSmsStatus>> {
  const out = new Map<string, FieldWorkerCodeSmsStatus>();
  if (fieldWorkerIds.length === 0) return out;
  const { rows } = await q.query<{ field_worker_id: string; outcome: FieldWorkerCodeSmsOutcome; detail: string | null; delivery_state: SmsDeliveryState | null }>(
    `SELECT s.field_worker_id, s.outcome, s.detail, d.delivery_state
       FROM field_worker_code_sms_sends s
       LEFT JOIN sms_send_deliveries d ON d.send_kind = 'fw' AND d.send_row_id = s.send_id AND d.pariwar_id = s.pariwar_id
      WHERE s.pariwar_id = $1 AND s.field_worker_id = ANY($2::uuid[])`,
    [pariwarId, [...fieldWorkerIds]],
  );
  for (const r of rows) {
    const status = deriveFieldWorkerCodeSmsStatus({ outcome: r.outcome, detail: r.detail, report: r.delivery_state });
    if (status !== null) out.set(r.field_worker_id, status);
  }
  return out;
}
