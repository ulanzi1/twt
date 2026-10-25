// The ALERT SMS send record — the domain accessors (Story 5.11b, Task 1; `2026-10-25-404` FS6 (a), FS8 (d), FS22; AC1, AC3).
// Migration 0184's `alert_sms_sends`, read and written in RAW SQL on a caller-supplied `pg` handle: the jobs seam's
// `withPariwarScope` client (⛔ a second connection — the jobs pool is `max: 2`), or the service pool for the cross-tenant count.
//
// ⭐ THE ROW'S LIFE (FS6 — the one order; the seam in `apps/jobs` drives it, this file holds only the SQL):
//   1. {@link lookupAlertSmsSend} — READ-ONLY, before any send: `accepted` ⇒ the text went (⛔ send); a final non-accept ⇒
//      terminal; `attempting` inside the lease ⇒ IN FLIGHT (retry later, ⛔ touch it); `attempting` past the lease ⇒ a crash
//      between begin and finalise — the gateway MAY have taken it ⇒ {@link finaliseStaleAlertSmsSend} (⛔ re-send); `deferred` ⇒
//      proceed (begin re-claims it) — but only while it is YOUNG ({@link ALERT_SMS_DEFERRED_MAX_AGE_MS}); an OLDER one is
//      `deferred_expired` ⇒ the seam gives it up ({@link giveUpDeferredAlertSmsSend}), ⛔ sends a stale text.
//   2. {@link beginAlertSmsSend} — `INSERT … ON CONFLICT DO NOTHING`, else the compare-and-set `deferred → attempting`; the
//      caller COMMITS before the gateway call. Lost ⇒ `taken` (the caller re-reads: step 1).
//   3. the gateway call (no connection held).
//   4. {@link finaliseAlertSmsSend} — the compare-and-set `attempting → <outcome>` on the attempt's own claim token.
//   On the final job attempt a `deferred` row is given up ({@link giveUpDeferredAlertSmsSend}) — ⛔ left `deferred`, or a later
//   re-enqueue would send a stale text.
// ⛔ A DB error is caught here — the caller's scope transaction aborts on one, and the seam maps it (`sms_send_state_unavailable`).

import type pg from 'pg';

import {
  ALERT_SMS_SEND_DETAIL_PATTERN,
  type AlertSmsSendLocale,
  type AlertSmsSendMessage,
  type AlertSmsSendOccasion,
  type AlertSmsSendOutcome,
} from '../schema/alert_sms_sends.js';

type Queryable = Pick<pg.Pool, 'query'> | Pick<pg.PoolClient, 'query'>;

/**
 * FS6 — a found `attempting` row younger than this is IN FLIGHT (another attempt is between begin and finalise): the 10 s send
 * timeout + three finalise tries × the 10 s connection timeout ≈ 40–50 s, with margin. Older ⇒ a crash (the stale finalise).
 */
export const ALERT_SMS_SEND_LEASE_MS = 2 * 60_000;

/** FS22 — an `attempting` row older than this is counted STALE by the daily silence check (code-review decision C1-D2 (a): ⛔ an upper bound). */
export const ALERT_SMS_SEND_STALE_AFTER_MS = 3_600_000;

/**
 * Code-review decision C1-D1 (b), 2026-10-25 — a `deferred` row (the gateway answered `rate_limited`: DEFINITELY not taken) is
 * re-sendable only while it is YOUNG. Older than this, a later job — a sweep re-enqueue, a lost job's redelivery — would send a STALE
 * text (FS9: "⛔ left `deferred`, or a later re-enqueue would send a stale text"), and seven final-attempt exits leave such a row behind.
 * The lookup reports it `deferred_expired` and the seam gives it up. The longest LEGITIMATE gap between a `rate_limited` answer and the
 * job's next attempt is the last pg-boss retry delay at full jitter — pg-boss 12 waits `delay × (2^(n+1)/2 + 2^(n+1)/2 × random())`, so
 * 60 s × 2^3 × 2 = 16 min at the last of four retries — plus up to one chunk of members' send time on either side (≤ 8 min at the
 * worst case per member). `alert-sms-send.test.ts` pins this constant at ≥ their sum (24 min): a worst case, ⛔ a typical gap.
 */
export const ALERT_SMS_DEFERRED_MAX_AGE_MS = 30 * 60_000;

/** The send a (alert, member, occasion) names — the row's identity. */
export interface AlertSmsSendKey {
  readonly pariwarId: string;
  readonly alertId: string;
  readonly memberId: string;
  readonly occasion: AlertSmsSendOccasion;
}

/** What the read-only lookup found (step 1). */
export type AlertSmsSendLookup =
  | { readonly kind: 'none' }
  | { readonly kind: 'accepted'; readonly sendId: string }
  | {
      readonly kind: 'final';
      readonly sendId: string;
      readonly outcome: Exclude<AlertSmsSendOutcome, 'attempting' | 'deferred' | 'accepted'>;
      readonly detail: string | null;
    }
  | { readonly kind: 'in_flight'; readonly sendId: string }
  | { readonly kind: 'stale'; readonly sendId: string }
  | { readonly kind: 'deferred'; readonly sendId: string; readonly detail: string | null }
  /** A `deferred` row older than {@link ALERT_SMS_DEFERRED_MAX_AGE_MS}: ⛔ re-sent — the seam gives it up (decision C1-D1 (b)). */
  | { readonly kind: 'deferred_expired'; readonly sendId: string; readonly detail: string | null };

const DETAIL = new RegExp(ALERT_SMS_SEND_DETAIL_PATTERN);
/** A `deferred` (re-sendable) row's detail is a `rate_limited:<code>` — the gateway DEFINITELY did not take it (FS9). */
const DEFERRED_DETAIL = /^rate_limited:/;

/** Every writer asserts the grammar BEFORE its statement (the CHECK is the backstop). */
export function isAlertSmsSendDetail(detail: string): boolean {
  return DETAIL.test(detail);
}

function assertDetail(detail: string | null): void {
  if (detail !== null && !DETAIL.test(detail)) throw new Error('alert_sms_sends: a detail outside the grammar');
}

/** Step 1 — READ-ONLY. The lease is judged on the DATABASE clock (`clock_timestamp()`), the clock that wrote `updated_at`. */
export async function lookupAlertSmsSend(q: Queryable, key: AlertSmsSendKey): Promise<AlertSmsSendLookup> {
  const { rows } = await q.query<{
    send_id: string;
    outcome: AlertSmsSendOutcome;
    detail: string | null;
    inside_lease: boolean;
    deferred_fresh: boolean;
  }>(
    `SELECT send_id, outcome, detail,
            updated_at >= clock_timestamp() - ($5::int * interval '1 millisecond') AS inside_lease,
            updated_at >= clock_timestamp() - ($6::int * interval '1 millisecond') AS deferred_fresh
       FROM alert_sms_sends
      WHERE pariwar_id = $1 AND alert_id = $2 AND member_id = $3 AND occasion = $4`,
    [key.pariwarId, key.alertId, key.memberId, key.occasion, ALERT_SMS_SEND_LEASE_MS, ALERT_SMS_DEFERRED_MAX_AGE_MS],
  );
  const r = rows[0];
  if (r === undefined) return { kind: 'none' };
  switch (r.outcome) {
    case 'accepted':
      return { kind: 'accepted', sendId: r.send_id };
    case 'deferred':
      return r.deferred_fresh
        ? { kind: 'deferred', sendId: r.send_id, detail: r.detail }
        : { kind: 'deferred_expired', sendId: r.send_id, detail: r.detail };
    case 'attempting':
      return r.inside_lease ? { kind: 'in_flight', sendId: r.send_id } : { kind: 'stale', sendId: r.send_id };
    default:
      return { kind: 'final', sendId: r.send_id, outcome: r.outcome, detail: r.detail };
  }
}

/**
 * A crash-left `attempting` row past the lease ⇒ FINAL `error` / `exhausted:outcome_unknown` (the gateway MAY have accepted —
 * ⛔ re-sent; G14). The lease is re-checked by the UPDATE itself. `false` ⇒ the row moved on (its own attempt finalised it).
 */
export async function finaliseStaleAlertSmsSend(q: Queryable, input: { readonly pariwarId: string; readonly sendId: string }): Promise<boolean> {
  const { rowCount } = await q.query(
    `UPDATE alert_sms_sends
        SET outcome = 'error', detail = 'exhausted:outcome_unknown', updated_at = clock_timestamp()
      WHERE pariwar_id = $1 AND send_id = $2 AND outcome = 'attempting'
        AND updated_at < clock_timestamp() - ($3::int * interval '1 millisecond')`,
    [input.pariwarId, input.sendId, ALERT_SMS_SEND_LEASE_MS],
  );
  return (rowCount ?? 0) > 0;
}

/** Step 2's result: the row is this attempt's to send, or another attempt holds / finished it. */
export type BeginAlertSmsSendResult =
  | { readonly kind: 'begun'; readonly sendId: string; readonly attemptCount: number }
  | { readonly kind: 'taken' };

/**
 * ⭐ Step 2 — BEGIN, on the caller's scope transaction (the caller COMMITS before the gateway call): INSERT `attempting`, or
 * re-claim a `deferred` row (`attempt_count + 1`, the new claim token). Two concurrent begins of one key serialise on the
 * unique index: the second waits for the first's COMMIT, then inserts nothing and finds the row ⛔ `deferred` ⇒ `taken`. A re-claim
 * also re-sets `message` and `locale` to THIS attempt's (the row records what was sent).
 */
export async function beginAlertSmsSend(
  q: Queryable,
  input: AlertSmsSendKey & {
    readonly message: AlertSmsSendMessage;
    readonly locale: AlertSmsSendLocale;
    readonly claimToken: string;
  },
): Promise<BeginAlertSmsSendResult> {
  const inserted = await q.query<{ send_id: string; attempt_count: number }>(
    `INSERT INTO alert_sms_sends (pariwar_id, alert_id, member_id, occasion, message, locale, outcome, claim_token)
     VALUES ($1, $2, $3, $4, $5, $6, 'attempting', $7)
     ON CONFLICT (alert_id, member_id, occasion) DO NOTHING
     RETURNING send_id, attempt_count`,
    [input.pariwarId, input.alertId, input.memberId, input.occasion, input.message, input.locale, input.claimToken],
  );
  const fresh = inserted.rows[0];
  if (fresh !== undefined) return { kind: 'begun', sendId: fresh.send_id, attemptCount: fresh.attempt_count };
  const reclaimed = await q.query<{ send_id: string; attempt_count: number }>(
    // `message` / `locale` are re-set here (review 2026-10-25, C1-P1): the member may have changed language since the `rate_limited`
    // attempt, and this row is the ONLY record of the language the text was sent in.
    `UPDATE alert_sms_sends
        SET outcome = 'attempting', claim_token = $5, attempt_count = attempt_count + 1,
            message = $6, locale = $7, updated_at = clock_timestamp()
      WHERE pariwar_id = $1 AND alert_id = $2 AND member_id = $3 AND occasion = $4 AND outcome = 'deferred'
      RETURNING send_id, attempt_count`,
    [input.pariwarId, input.alertId, input.memberId, input.occasion, input.claimToken, input.message, input.locale],
  );
  const again = reclaimed.rows[0];
  return again === undefined ? { kind: 'taken' } : { kind: 'begun', sendId: again.send_id, attemptCount: again.attempt_count };
}

/** Step 4's outcomes — `deferred` ONLY for a `rate_limited` answer (FS9). */
export type AlertSmsSendFinalOutcome = Exclude<AlertSmsSendOutcome, 'attempting'>;

/**
 * ⭐ Step 4 — the COMPARE-AND-SET `attempting → <outcome>`, only by the attempt holding the row (its claim token). `false` ⇒ the
 * row moved on (a stale finalise by another attempt). `accepted` REQUIRES the provider's request id (the CHECK backs it).
 */
export async function finaliseAlertSmsSend(
  q: Queryable,
  input: {
    readonly pariwarId: string;
    readonly sendId: string;
    readonly claimToken: string;
    readonly outcome: AlertSmsSendFinalOutcome;
    readonly detail: string | null;
    readonly providerMessageId?: string | null;
  },
): Promise<boolean> {
  assertDetail(input.detail);
  if (input.outcome === 'accepted' && !input.providerMessageId) {
    throw new Error('finaliseAlertSmsSend: accepted needs the provider request id');
  }
  // `deferred` is the ONE state a later attempt may re-send from: only a `rate_limited` answer may put a row there (FS9, review C1-P2).
  if (input.outcome === 'deferred' && (input.detail === null || !DEFERRED_DETAIL.test(input.detail))) {
    throw new Error('finaliseAlertSmsSend: deferred needs a rate_limited:<code> detail');
  }
  const { rowCount } = await q.query(
    `UPDATE alert_sms_sends
        SET outcome = $4, detail = $5, provider_message_id = $6, updated_at = clock_timestamp()
      WHERE pariwar_id = $1 AND send_id = $2 AND outcome = 'attempting' AND claim_token = $3`,
    [input.pariwarId, input.sendId, input.claimToken, input.outcome, input.detail, input.providerMessageId ?? null],
  );
  return (rowCount ?? 0) > 0;
}

/**
 * FS9 — the FINAL job attempt gives a `deferred` row up: `error` / `exhausted:<detail>` (frozen). `false` ⇒ ⛔ deferred row
 * (re-claimed or finished meanwhile).
 */
export async function giveUpDeferredAlertSmsSend(
  q: Queryable,
  input: { readonly pariwarId: string; readonly sendId: string; readonly detail: string },
): Promise<boolean> {
  assertDetail(input.detail);
  // A give-up is FINAL: its detail is an `exhausted:<…>` one (FS9, review C1-P2) — ⛔ a bare class that reads as a live answer.
  if (!input.detail.startsWith('exhausted:')) throw new Error('giveUpDeferredAlertSmsSend: the detail must be an exhausted:<…> one');
  const { rowCount } = await q.query(
    `UPDATE alert_sms_sends SET outcome = 'error', detail = $3, updated_at = clock_timestamp()
      WHERE pariwar_id = $1 AND send_id = $2 AND outcome = 'deferred'`,
    [input.pariwarId, input.sendId, input.detail],
  );
  return (rowCount ?? 0) > 0;
}

/**
 * FS22 — the `attempting` rows ⛔ attempt will finalise: last touched MORE than 1 h before `now` (a crash on the FINAL attempt; the
 * correlator gives up at 72 h and the silence count sees only `accepted`). ⭐ NO upper bound (code-review decision C1-D2 (a),
 * 2026-10-25 — FS22 / AC1 say "older than 1 h"): a stuck row alarms on every daily run until a person clears it (roster Row 40's
 * runbook: an owner-role `UPDATE … SET outcome = 'error', detail = 'exhausted:outcome_unknown'` — the freeze trigger admits it, the
 * row is not finished). CROSS-TENANT — the caller checks `canReadAcrossPariwars` first (as for `countSilentSmsSends`).
 *
 * DELIBERATE (checklist family 9): this reads EVERY Pariwar's rows on a handle the caller supplies — the daily silence check runs it
 * on the service pool, which bypasses RLS. Rationale: a stuck row is an operations signal, not a tenant's data, and the result is
 * a bare count. Re-examine if the count is ever returned with ids, or called from a request path.
 */
export async function countStaleAlertSmsSends(q: Queryable, opts: { readonly now: Date }): Promise<number> {
  const { rows } = await q.query<{ n: string }>(
    `SELECT count(*) AS n FROM alert_sms_sends
      WHERE outcome = 'attempting'
        AND updated_at <= $1::timestamptz - ($2::int * interval '1 millisecond')`,
    [opts.now, ALERT_SMS_SEND_STALE_AFTER_MS],
  );
  return Number(rows[0]?.n ?? 0);
}
