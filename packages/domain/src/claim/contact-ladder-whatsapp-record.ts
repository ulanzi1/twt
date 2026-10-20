// The claimant's WHATSAPP STEP — its RECORD (Story 6.37d, Task 5; AC4–AC7; WS6–WS12; I1–I4, I7–I10; `2026-10-17-350`
// ruling 2 (1), `-351` 1 A / 4 A, `-357`, `2026-10-20-367`, `2026-10-20-368`). The send row (`claim_contact_wa_sends`, 0172) on
// 6.31's crash-safe shape (`peer-mesh-wa-reminder.ts` — the MODEL; ⛔ edited), the stops (`claim_contact_wa_stops`), the
// webhook worker's status writes and the 10:00 end check's delivery read. Transport-free: ⛔ HTTP, ⛔ a send, ⛔ an audit line;
// the only crypto is the CORRECTION chase's current-number HMAC under its trustee lock (`correctionFamilyStopReason` — the
// `beginCorrectionLadderSend` precedent); the certificate chase's hashes come in from BEFORE its claim-row lock (CR7).
//
// ⭐ THE BEGIN (AC5 (2)) — under the CHASE lock, in ONE transaction:
//   · the step `pending` (a first visit): the ladder still runs; the chase's stop predicate and `ladderEndReason` (an end or a
//     stop ENDS the ladder and records nothing for the step); then `ladderWhatsappGate` (stop ≻ basis ≻ horizon / pause ≻
//     overtaken ≻ not due ≻ window ≻ config) — a skip is a CAS on the STEP (`pending → skipped:<reason>`, ⛔ a send row); a
//     send CLAIMS the ONE send row (`UNIQUE (ladder_id)`) and CASes the step `pending → sent` (6.37c Debug Log (b) 2 — a
//     refusal at send still counts as sent; the ladder runs on).
//   · the step `sent` (a pg-boss retry, or a re-take of a lapsed UNMARKED row — WS8 (iii)): FIRST the row's state, which ⛔
//     writes when it fails — ⛔ row / ⛔ `attempting` ⇒ `already_final`; the marker SET ⇒ `in_flight` (the lapsed finisher owns
//     it — a sent message must keep its marker so it ends `may_have_sent:lease_lapsed`); held by ANOTHER job whose lease is
//     live ⇒ `held_by_other`; else RE-CLAIMED by this job. THEN the verdicts — a false one FINISHES the ROW `skipped:<reason>`
//     (CAS'd on this job, ⛔ marker) — ⛔ a write to the step (0172's trigger refuses it), ⛔ a send.
// ⭐ THE MARKER — `markContactLadderWhatsappInFlight`: its OWN committed CAS immediately before Meta, on THIS job's
// `attempting` row with `leaseMarginMs` of `CONTACT_LADDER_WA_LEASE_MS` left (judged on the child's clock — `-366` d4 (a)):
// `marked | lost` ONLY (⛔ `late` — this story has ⛔ 72-hour bound; `lost` ⇒ a transient, a retry re-judges). The lease is a
// LIVENESS bound; the SAFETY control is the CAS (`claimed_by_job` = this job AND `send_started_at IS NULL`): a re-take makes
// the old attempt's CAS answer `lost`, and a same-job-id pg-boss twin is serialised by `send_started_at IS NULL`.
// ⚠ ⛔ Never a Drizzle correlated subquery — raw SQL with explicit aliases ([[project_epic6_drizzle_correlated_subquery_bug]]).

import { and, eq, sql } from 'drizzle-orm';
import type pg from 'pg';

import { getWaConfig } from '../channel-config/wa-config.js';
import { istDateOf } from '../cycle-calendar/holiday-resolver.js';
import { bindScopedDb, type Db } from '../db.js';
import type { FieldCryptoDeps } from '../encryption/field-classes.js';
import type { ClaimId, PariwarId } from '../ids/index.js';
import { clampLimit } from '../pagination.js';
import type { ClaimContactLadderRow, ContactLadderChase } from '../schema/claim_contact_ladders.js';
import {
  CONTACT_LADDER_WA_DETAIL_PATTERN,
  claimContactWaSends,
  claimContactWaStops,
  type ContactLadderWaLocale,
} from '../schema/claim_contact_wa_sends.js';
import { readClaimantWhatsappBasis } from './claim-contact-whatsapp-basis.js';
import { settleContactLadderWhatsappDeliveries } from './contact-ladder-whatsapp-delivery.js';
import {
  type CertificateNumberHash,
  type CertificatePerson,
  lockCertificateClaim,
  readCertificateRecipients,
  readClaimCertificateFamilyRows,
  samePersonSource,
} from './certificate-reminder.js';
import { CertificateRecipientsMovedError, certificateLadderStopReason } from './certificate-reminder-record.js';
import {
  type LadderWhatsappConfigVerdict,
  ladderEndReason,
  ladderWhatsappGate,
} from './contact-ladder.js';
import {
  readClaimCertificateLadderSmsRows,
  readClaimContactCalls,
  readLadderOriginCreatedAt,
  readReturnLadderSmsRows,
} from './contact-ladder-read.js';
import { endContactLadder, readContactLadder } from './contact-ladder-record.js';
import { type CorrectionPerson, acquireCorrectionChaseLock } from './correction-chase.js';
import {
  CorrectionNumberHashUnavailableError,
  correctionFamilyStopReason,
  readReturnFamilyRows,
} from './correction-reminder-record.js';
import { correctionRunDay } from './correction-schedule.js';

// ── The numbers (WS8 (ii)) ─────────────────────────────────────────────────────────────────────────────────────

/**
 * ⭐ THE ONE LEASE — above the ≈ 30-minute worst-case pg-boss backoff of retries that fail BEFORE the re-claim
 * (`retry_delay × 2^n × (1 + random)`, 4 retries from 60 s) plus their runtimes: every attempt that reaches the re-claim
 * re-stamps `claimed_at`. Used by the marker CAS, the re-check, the sweep's lapsed selection and the lapsed finisher.
 * ⛔ 6.31's `CORRECTION_SEND_LEASE_MS` (10 min). A LIVENESS bound — the marker CAS is the safety control.
 */
export const CONTACT_LADDER_WA_LEASE_MS = 45 * 60 * 1000;
/** The marker's handoff margin: the send (≤ its 10 s timeout) + the bounded finalise fit well inside it. */
export const CONTACT_LADDER_WA_HANDOFF_MARGIN_MS = 5 * 60 * 1000;
/** The marker's bound (`lock_timeout` AND `statement_timeout`). */
export const CONTACT_LADDER_WA_MARKER_TIMEOUT_MS = 5_000;
/** The finalise's bounds (`SET LOCAL` inside its own transaction). */
export const CONTACT_LADDER_WA_FINALISE_TIMEOUT_MS = 30_000;
/** `claimed_by_job` of a row the sweep finished as LAPSED mid-flight. */
export const CONTACT_LADDER_WA_LAPSED_BY = 'sweep:lapsed';
/** The sweep's page / batch caps (raw SQL — clamped BY HAND, AC12). */
export const CONTACT_LADDER_WA_PAGE_CAP = 1000;
export const CONTACT_LADDER_WA_MAINTENANCE_BATCH = 200;
/** WS11 (2) — a block-coded failed status is matched to the Pariwar's claim sends of the last this-many days. */
export const CONTACT_LADDER_WA_ISOLATION_DAYS = 7;
/**
 * Decisions 2026-10-20-370 / -371 — at most this many sends Meta MAY have acted on (a post-send 5xx after the connection opened) per
 * send row, EVER: so at most this many copies can reach the claimant. ⚠ LOCKSTEP with 0176's CHECK.
 */
export const CONTACT_LADDER_WA_MAX_SENDS = 2;

/**
 * `-371` — a post-send transient Meta MAY have acted on: `api_unavailable:<5xx>` other than `api_unavailable:000` (a connection that
 * never opened — `-366` d1). A `rate_limited:*` (429 / a rate-limit code) is a refusal, ⛔ a send.
 */
export function isContactLadderWaAmbiguousTransient(detail: string): boolean {
  return detail.startsWith('api_unavailable:') && detail !== 'api_unavailable:000';
}

type Queryable = Pick<pg.Pool, 'query'> | Pick<pg.PoolClient, 'query'>;

function toDate(v: Date | string): Date {
  return v instanceof Date ? v : new Date(v);
}

// ── The `detail` grammar — ONE builder; ⛔ free text, ⛔ a raw Meta message, ⛔ a phone number ─────────────────────

export type ContactLadderWaDetailPrefix =
  | 'rate_limited'
  | 'api_unavailable'
  | 'decrypt_failed'
  | 'hash_failed'
  | 'marker_lost'
  | 'may_have_sent'
  | 'rejected_recipient'
  | 'refused'
  | 'skipped'
  | 'no_target';

const DETAIL_PATTERN = new RegExp(CONTACT_LADDER_WA_DETAIL_PATTERN);

/** Does `detail` match the grammar (0172's CHECK — the SAME pattern)? */
export function isContactLadderWaDetail(detail: string): boolean {
  return DETAIL_PATTERN.test(detail);
}

/** ⭐ THE ONLY way a send row's `detail` is built — validated BEFORE any statement (⛔ value echoed). */
export function contactLadderWaDetail(prefix: ContactLadderWaDetailPrefix, token: string): string {
  const detail = `${prefix}:${token}`;
  assertDetail(detail);
  return detail;
}

/**
 * A classifier's TRANSIENT token (`rate_limited:<code|none>` / `api_unavailable:<status>` — `classifyDirectWaSendFailure`)
 * as a stored note. ⛔ Outside the grammar ⇒ a throw before any statement.
 */
export function contactLadderWaTransientDetail(note: string): string {
  assertDetail(note);
  return note;
}

function assertDetail(detail: string | null): void {
  if (detail !== null && !isContactLadderWaDetail(detail)) {
    throw new Error('[contact-ladder-whatsapp] a detail outside the fixed grammar — build it with contactLadderWaDetail');
  }
}

// ── Reads ──────────────────────────────────────────────────────────────────────────────────────────────────────

interface LockedSend {
  send_id: string;
  send_outcome: string;
  claimed_at: Date | string;
  claimed_by_job: string;
  send_started_at: Date | string | null;
  attempt_count: number;
}

async function lockSendRow(client: pg.PoolClient, pariwarId: PariwarId, ladderId: string): Promise<LockedSend | null> {
  const { rows } = await client.query<LockedSend>(
    `SELECT send_id, send_outcome, claimed_at, claimed_by_job, send_started_at, attempt_count
       FROM claim_contact_wa_sends WHERE pariwar_id = $1 AND ladder_id = $2 FOR UPDATE`,
    [pariwarId, ladderId],
  );
  return rows[0] ?? null;
}

/** WS10 — has this number (the ladder's claim-space hash) sent STOP to this Pariwar's WhatsApp number? */
export async function isClaimContactNumberStopped(db: Db, pariwarId: PariwarId, recipientNumberHash: string): Promise<boolean> {
  const rows = await db
    .select({ stopId: claimContactWaStops.stopId })
    .from(claimContactWaStops)
    .where(and(eq(claimContactWaStops.pariwarId, pariwarId), eq(claimContactWaStops.recipientNumberHash, recipientNumberHash)))
    .limit(1);
  return rows.length > 0;
}

// ── The claiming transaction ───────────────────────────────────────────────────────────────────────────────────

/** The child's config, read OUTSIDE any lock (AC5 (1)) — judged HERE, after the ends / stops. */
export interface ContactLadderWhatsappConfigInput {
  /** The template / helpline / secret verdict from (1) (`ok` or why ⛔). The switch is RE-READ under the lock. */
  readonly verdict: LadderWhatsappConfigVerdict;
  /** The approved template NAME for the claim's locale — required when `verdict` is `ok`. */
  readonly templateName: string | null;
  readonly locale: ContactLadderWaLocale;
}

export type BeginContactLadderWhatsappResult =
  /** ⛔ Write: the ladder is gone / another chase / ⛔ running on a first visit; the row is final / in flight / held. */
  | { readonly kind: 'noop'; readonly reason: 'ladder_missing' | 'ladder_not_running' | 'already_final' | 'in_flight' | 'held_by_other' }
  /** The ladder ENDED in the re-check (a delivered message, a reached call, a number change, a stop). */
  | { readonly kind: 'ended'; readonly state: string; readonly detail: string; readonly finishedRow: boolean }
  /** The step (a first visit) or the ROW (a re-take) was recorded `skipped:<reason>` — ⛔ sent. */
  | { readonly kind: 'skipped'; readonly reason: string; readonly where: 'step' | 'row' }
  /** ⛔ Due yet (before origin + 4 h on the DB clock) — ⛔ write. */
  | { readonly kind: 'wait'; readonly until: Date }
  /** Outside 09:00–20:00 IST — ⛔ write; the child re-enqueues itself for `until`. */
  | { readonly kind: 'defer'; readonly until: Date }
  /** A PRE-SEND transient under the lock (the correction HMAC) — the caller throws for a retry (the note is written here). */
  | { readonly kind: 'transient'; readonly detail: string }
  | {
      readonly kind: 'begun';
      readonly sendId: string;
      readonly attemptCount: number;
      /** The claim time this begin stamped — the marker's lease counts from it. */
      readonly claimedAt: Date;
      /** The person whose number the ladder holds — ⛔ AS STORED (decrypted by the caller AFTER the commit). */
      readonly person: Pick<CorrectionPerson | CertificatePerson, 'personKey' | 'mobileCiphertext' | 'mobileSource'>;
      /** The ladder's own number hash (the number whose text failed) — the caller's recomputed hash must equal it. */
      readonly recipientNumberHash: string;
      readonly templateName: string;
      readonly locale: ContactLadderWaLocale;
    };

/**
 * ⭐ THE CLAIMING TRANSACTION — on the ONE client of the caller's scope transaction (the caller set `lock_timeout`). See the module
 * header. `finalAttempt` — pg-boss's last try: a pre-send hash failure then RECORDS `skipped:hash_unavailable` (the step, or the
 * re-taken row) instead of asking for a retry. ⛔ Never catch a DB error inside this transaction.
 * @throws CertificateRecipientsMovedError  the certificate record moved between the caller's hashes and the lock (a transient)
 */
export async function beginContactLadderWhatsapp(
  client: pg.PoolClient,
  input: {
    readonly pariwarId: PariwarId;
    readonly claimCaseId: ClaimId;
    readonly ladderId: string;
    readonly chase: ContactLadderChase;
    readonly jobId: string;
    /** The CHILD's clock — stamped as `claimed_at`; the lease is judged on it (`-366` d4 (a)). */
    readonly now: Date;
    /** `isInPeerRequestSendWindow` / `nextPeerRequestSendWindowStart` — computed by the jobs (T12). */
    readonly inWindow: boolean;
    readonly nextWindowStart: Date;
    readonly config: ContactLadderWhatsappConfigInput;
    readonly finalAttempt: boolean;
    /** Correction — the trustee-lock HMAC's KMS deps (`correctionFamilyStopReason`). */
    readonly crypto: FieldCryptoDeps;
    /** Certificate — every person's current-number hash, taken BEFORE the claim-row lock (CR7). */
    readonly certificatePrelock?: {
      readonly people: readonly CertificatePerson[];
      readonly hashes: ReadonlyMap<string, CertificateNumberHash>;
    };
  },
): Promise<BeginContactLadderWhatsappResult> {
  const db = bindScopedDb(client);
  const { pariwarId, jobId, now } = input;
  const claimCaseId = String(input.claimCaseId).toLowerCase() as ClaimId;
  if (input.chase === 'correction') await acquireCorrectionChaseLock(client, pariwarId, claimCaseId);
  else if ((await lockCertificateClaim(db, pariwarId, claimCaseId)) === null) return { kind: 'noop', reason: 'ladder_missing' };

  const l = await readContactLadder(db, pariwarId, input.ladderId);
  if (l === null || l.claimCaseId !== claimCaseId || l.chase !== input.chase) return { kind: 'noop', reason: 'ladder_missing' };
  const send = await lockSendRow(client, pariwarId, l.ladderId);
  const firstVisit = l.whatsappStep === 'pending';
  if (!firstVisit && l.whatsappStep !== 'sent') return { kind: 'noop', reason: 'already_final' };

  // ── A re-take / retry: FIRST the row's own state (⛔ write when it fails) ──
  let attemptCount = 1;
  if (!firstVisit) {
    if (send === null || send.send_outcome !== 'attempting') return { kind: 'noop', reason: 'already_final' };
    if (send.send_started_at !== null) return { kind: 'noop', reason: 'in_flight' };
    const ownRetry = send.claimed_by_job === jobId;
    const leaseLapsed = toDate(send.claimed_at).getTime() < now.getTime() - CONTACT_LADDER_WA_LEASE_MS;
    if (!ownRetry && !leaseLapsed) return { kind: 'noop', reason: 'held_by_other' };
    const reclaimed = (
      await client.query<{ attempt_count: number }>(
        `UPDATE claim_contact_wa_sends
            SET claimed_at = $2, claimed_by_job = $3, attempt_count = attempt_count + 1,
                first_detail = COALESCE(first_detail, detail), updated_at = clock_timestamp()
          WHERE send_id = $1 AND send_outcome = 'attempting' AND send_started_at IS NULL
          RETURNING attempt_count`,
        [send.send_id, now, jobId],
      )
    ).rows[0];
    if (!reclaimed) return { kind: 'noop', reason: 'already_final' };
    attemptCount = reclaimed.attempt_count;
  } else if (l.state !== 'running') {
    return { kind: 'noop', reason: 'ladder_not_running' };
  }

  /** A false verdict on a re-take FINISHES the row (CAS'd on THIS job, ⛔ marker); on a first visit it CASes the STEP. */
  const recordSkip = async (reason: string): Promise<BeginContactLadderWhatsappResult> => {
    if (firstVisit) {
      await client.query(
        `UPDATE claim_contact_ladders SET whatsapp_step = $3, updated_at = clock_timestamp()
          WHERE pariwar_id = $1 AND ladder_id = $2 AND whatsapp_step = 'pending'`,
        [pariwarId, l.ladderId, `skipped:${reason}`],
      );
      return { kind: 'skipped', reason, where: 'step' };
    }
    await finishRowSkippedLocked(client, { pariwarId, sendId: send!.send_id, jobId, reason });
    return { kind: 'skipped', reason, where: 'row' };
  };
  /** A pre-send transient: a retry (the re-taken row noted), or — on the FINAL attempt — `skipped:hash_unavailable`. */
  const preSendTransient = async (detail: string): Promise<BeginContactLadderWhatsappResult> => {
    if (input.finalAttempt) return recordSkip('hash_unavailable');
    if (!firstVisit) {
      await client.query(
        `UPDATE claim_contact_wa_sends SET detail = $3, updated_at = clock_timestamp()
          WHERE pariwar_id = $1 AND send_id = $2 AND send_outcome = 'attempting' AND claimed_by_job = $4 AND send_started_at IS NULL`,
        [pariwarId, send!.send_id, detail, jobId],
      );
    }
    return { kind: 'transient', detail };
  };

  // A ladder that ended while this re-taken row waited: the row still owes a finish.
  if (!firstVisit && l.state !== 'running') return recordSkip('ended');

  // ── The stops (I6) and the ends (LD5 — with the WhatsApp input, WS12) — exactly as `begin*LadderSend` reads them ──
  const facts = await chaseFacts(db, input, l);
  if (facts.kind === 'transient') return preSendTransient(facts.detail);
  const delivered = (await settleContactLadderWhatsappDeliveries(db, pariwarId, [l.ladderId])).has(l.ladderId);
  const end = ladderEndReason({
    ladder: l,
    originCreatedAt: facts.originCreatedAt ?? l.createdAt,
    rows: facts.mine,
    satisfyingRows: facts.satisfying,
    calls: facts.calls,
    currentNumberHash: facts.currentNumberHash,
    stop: facts.stop,
    whatsappDelivered: delivered,
  });
  if (end !== null) {
    await endContactLadder(db, { pariwarId, ladderId: l.ladderId, state: end.state, detail: end.detail });
    if (!firstVisit) await finishRowSkippedLocked(client, { pariwarId, sendId: send!.send_id, jobId, reason: 'ended' });
    return { kind: 'ended', state: end.state, detail: end.detail, finishedRow: !firstVisit };
  }
  // An end and ⛔ a stop ⇒ the passing check. (A stop is always an end — the shape the SMS begins share.)
  if (facts.person === null) return recordSkip('ended');
  // Review R2 (2026-10-20, I1/AC3/AC5/WS5) — WhatsApp goes to the CLAIMANT only; `isClaimant` was true at ORIGIN (it gated
  // the step to `pending`) but is never guaranteed true NOW: a later full write can swap the claim's claimant onto a
  // different nominee or block without touching this ladder. `facts.person.isClaimant` is the LIVE verdict (read under this
  // same lock, above) — re-checked on every visit, a first visit and every re-take alike.
  if (!facts.person.isClaimant) return recordSkip('no_longer_claimant');

  // ── The gate (WS6, WS7, WS9, WS10; I2) — the switch RE-READ under the lock (a DB read — 6.31's begin does too) ──
  const dbNow = toDate(((await client.query<{ now: Date }>('SELECT clock_timestamp() AS now')).rows[0]!).now);
  const wa = await getWaConfig(db, pariwarId);
  const switchOn = wa !== null && wa.enabled && (wa.phoneNumberId?.trim() ?? '') !== '';
  const configVerdict: LadderWhatsappConfigVerdict = !switchOn ? 'whatsapp_not_configured' : input.config.verdict;
  const verdict = ladderWhatsappGate({
    originCreatedAt: facts.originCreatedAt,
    now: dbNow,
    inWindow: input.inWindow,
    nextWindowStart: input.nextWindowStart,
    sms2State: l.sms2State,
    horizon: { chase: l.chase, runDay: facts.runDay, paused: facts.paused },
    stopped: await isClaimContactNumberStopped(db, pariwarId, l.recipientNumberHash),
    basis: await readClaimantWhatsappBasis(db, pariwarId, claimCaseId),
    config: configVerdict,
  });
  if (verdict.kind === 'skip') return recordSkip(verdict.reason);
  if (verdict.kind === 'wait') return { kind: 'wait', until: verdict.until };
  if (verdict.kind === 'defer') return { kind: 'defer', until: verdict.until };
  const templateName = input.config.templateName;
  if (templateName === null) throw new Error('[contact-ladder-whatsapp] a send verdict with ⛔ template name — the caller must pass it when verdict is ok');

  // ── Claim ONE send row (UNIQUE `ladder_id` — a second claim refused by the DB) and set the step `sent` ──
  let sendId: string;
  if (firstVisit) {
    const inserted = (
      await client.query<{ send_id: string }>(
        `INSERT INTO claim_contact_wa_sends
           (ladder_id, pariwar_id, claim_case_id, chase, recipient_number_hash, template_name, locale, send_outcome, attempt_count,
            claimed_at, claimed_by_job, aging_since)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'attempting', 1, $8, $9, clock_timestamp())
         ON CONFLICT (ladder_id) DO NOTHING
         RETURNING send_id`,
        [l.ladderId, pariwarId, claimCaseId, l.chase, l.recipientNumberHash, templateName, input.config.locale, now, jobId],
      )
    ).rows[0];
    // ⛔ Reachable while this transaction holds the chase lock (every claim takes it first) — defensive.
    if (!inserted) return { kind: 'noop', reason: 'held_by_other' };
    sendId = inserted.send_id;
    const stepped = await client.query(
      `UPDATE claim_contact_ladders SET whatsapp_step = 'sent', updated_at = clock_timestamp()
        WHERE pariwar_id = $1 AND ladder_id = $2 AND whatsapp_step = 'pending'`,
      [pariwarId, l.ladderId],
    );
    if ((stepped.rowCount ?? 0) === 0) throw new Error(`[contact-ladder-whatsapp] the step of ladder ${l.ladderId} moved under the chase lock`);
  } else {
    sendId = send!.send_id;
    await client.query(
      `UPDATE claim_contact_wa_sends SET template_name = $3, locale = $4, updated_at = clock_timestamp()
        WHERE pariwar_id = $1 AND send_id = $2 AND send_outcome = 'attempting' AND claimed_by_job = $5 AND send_started_at IS NULL`,
      [pariwarId, sendId, templateName, input.config.locale, jobId],
    );
  }
  return {
    kind: 'begun',
    sendId,
    attemptCount,
    claimedAt: now,
    person: facts.person,
    recipientNumberHash: l.recipientNumberHash,
    templateName,
    locale: input.config.locale,
  };
}

type ChaseFacts =
  | { readonly kind: 'transient'; readonly detail: string }
  | {
      readonly kind: 'facts';
      readonly stop: string | null;
      // Review R2 (2026-10-20) — `isClaimant` joins the picked shape: `check.person` (from a LIVE `readCorrectionRecipients` /
      // `readCertificateRecipients` read, taken under this same lock) already carries it fresh; the narrower Pick below used
      // to drop it before `beginContactLadderWhatsapp` could look at it.
      readonly person: Pick<CorrectionPerson | CertificatePerson, 'personKey' | 'mobileCiphertext' | 'mobileSource' | 'isClaimant'> | null;
      readonly currentNumberHash: string | null | undefined;
      readonly runDay: number;
      readonly paused: boolean;
      readonly originCreatedAt: Date | null;
      readonly mine: { recipientNumberHash: string | null; createdAt: Date; deliveryState?: 'delivered' | 'undelivered' | null }[];
      readonly satisfying: { deliveryState?: 'delivered' | 'undelivered' | null }[];
      readonly calls: Awaited<ReturnType<typeof readClaimContactCalls>>;
    };

/**
 * The chase's stops, its rows and calls (the ends' inputs), the run day and the pause — the reads `begin*LadderSend` makes,
 * for the WhatsApp step. Correction: the trustee-lock HMAC (`correctionFamilyStopReason` — a hash failure is a PRE-SEND
 * transient, ⛔ `beginCorrectionLadderSend`'s immediate `skipped:hash_unavailable`, which would spend the once-only step on one
 * KMS blip). Certificate: the hashes the caller took BEFORE the lock, verified unmoved (`samePersonSource`).
 */
async function chaseFacts(
  db: Db,
  input: Parameters<typeof beginContactLadderWhatsapp>[1],
  l: ClaimContactLadderRow,
): Promise<ChaseFacts> {
  const today = istDateOf(input.now);
  const calls = await readClaimContactCalls(db, input.pariwarId, l.claimCaseId, [l.personKey]);
  const originCreatedAt = (await readLadderOriginCreatedAt(db, input.pariwarId, l.chase, [l.originRowId])).get(l.originRowId) ?? null;
  const bySatisfying = (r: { reminderId?: string }) => r.reminderId !== undefined && (r.reminderId === l.sms2RowId || r.reminderId === l.sms3RowId);
  if (l.chase === 'correction') {
    let check: Awaited<ReturnType<typeof correctionFamilyStopReason>>;
    try {
      check = await correctionFamilyStopReason(db, {
        pariwarId: input.pariwarId,
        claimCaseId: l.claimCaseId,
        runId: l.runId,
        personKey: l.personKey,
        crypto: input.crypto,
        forLadder: true,
      });
    } catch (err) {
      if (err instanceof CorrectionNumberHashUnavailableError) return { kind: 'transient', detail: contactLadderWaDetail('hash_failed', 'tier1') };
      throw err;
    }
    if (check.stop === null && check.personState.hashFailed === true) return { kind: 'transient', detail: contactLadderWaDetail('hash_failed', 'tier1') };
    const rows = await readReturnFamilyRows(db, input.pariwarId, l.claimCaseId, l.returnDecisionId!);
    const ladderRows = await readReturnLadderSmsRows(db, input.pariwarId, l.claimCaseId, l.returnDecisionId!);
    const all = [...rows, ...ladderRows];
    if (check.stop !== null) {
      return { kind: 'facts', stop: String(check.stop), person: null, currentNumberHash: undefined, runDay: 0, paused: false, originCreatedAt, mine: all.filter((r) => r.recipientKey === l.personKey), satisfying: all.filter(bySatisfying), calls };
    }
    const st = check.personState;
    const current = st.currentNumberHash !== undefined ? st.currentNumberHash : (st.track.epochRows.at(-1)?.recipientNumberHash ?? undefined);
    return {
      kind: 'facts',
      stop: null,
      person: check.person,
      currentNumberHash: current,
      runDay: correctionRunDay(check.run.day0, today),
      paused: false,
      originCreatedAt,
      mine: all.filter((r) => r.recipientKey === l.personKey),
      satisfying: all.filter(bySatisfying),
      calls,
    };
  }
  const prelock = input.certificatePrelock;
  if (prelock === undefined) throw new Error('[contact-ladder-whatsapp] a certificate begin needs the pre-lock hashes (CR7)');
  const recipients = await readCertificateRecipients(db, input.pariwarId, l.claimCaseId);
  const pre = new Map(prelock.people.map((p) => [p.personKey, p]));
  if (recipients.cannotRemind === null && (recipients.people.length !== pre.size || recipients.people.some((p) => !samePersonSource(p, pre.get(p.personKey))))) {
    throw new CertificateRecipientsMovedError(l.claimCaseId);
  }
  const h = prelock.hashes.get(l.personKey);
  const check = await certificateLadderStopReason(db, {
    pariwarId: input.pariwarId,
    claimCaseId: l.claimCaseId,
    runId: l.runId,
    personKey: l.personKey,
    today,
    hashes: prelock.hashes,
  });
  const rows = await readClaimCertificateFamilyRows(db, input.pariwarId, l.claimCaseId);
  const ladderRows = await readClaimCertificateLadderSmsRows(db, input.pariwarId, l.claimCaseId);
  const all = [...rows, ...ladderRows];
  if (check.stop === null && (h === undefined || 'failed' in h)) return { kind: 'transient', detail: contactLadderWaDetail('hash_failed', 'tier1') };
  const current = h === undefined || 'failed' in h ? undefined : h.hash;
  return {
    kind: 'facts',
    stop: check.stop,
    person: check.stop === null ? check.person : null,
    currentNumberHash: current,
    runDay: check.stop === null ? check.runDay : 0,
    paused: check.stop === null ? check.paused : false,
    originCreatedAt,
    mine: all.filter((r) => r.recipientKey === l.personKey),
    satisfying: all.filter(bySatisfying),
    calls,
  };
}

/** Finish an un-marked `attempting` row this job holds as `skipped:<reason>` (the first transient kept in `first_detail`). */
async function finishRowSkippedLocked(
  q: Queryable,
  input: { readonly pariwarId: PariwarId; readonly sendId: string; readonly jobId: string; readonly reason: string },
): Promise<boolean> {
  const detail = contactLadderWaDetail('skipped', input.reason);
  const r = await q.query(
    `UPDATE claim_contact_wa_sends
        SET send_outcome = 'skipped', first_detail = COALESCE(first_detail, detail), detail = $4, updated_at = clock_timestamp()
      WHERE pariwar_id = $1 AND send_id = $2 AND send_outcome = 'attempting' AND claimed_by_job = $3 AND send_started_at IS NULL`,
    [input.pariwarId, input.sendId, input.jobId, detail],
  );
  return (r.rowCount ?? 0) > 0;
}

// ── The child's writes after the commit — each ONE row, only by the job holding it ───────────────────────────────

export interface ContactLadderWaRowRef {
  readonly pariwarId: PariwarId;
  readonly sendId: string;
  readonly jobId: string;
}

/**
 * ⭐ THE IN-FLIGHT MARKER: `send_started_at = clock_timestamp()` in its OWN committed UPDATE, as a CAS — only on this job's
 * `attempting` row, ⛔ already marked, whose claim still has `leaseMarginMs` of `CONTACT_LADDER_WA_LEASE_MS` left. ⛔ `marked` ⇒
 * ⛔ send (`lost` — a re-take, a same-job-id twin that marked first, or the row moved on). `now` is the CHILD's clock (the clock
 * `claimed_at` was stamped from). Bounded (`lock_timeout` / `statement_timeout`).
 */
export async function markContactLadderWhatsappInFlight(
  db: Db,
  input: ContactLadderWaRowRef & { readonly leaseMarginMs: number; readonly now: Date },
): Promise<'marked' | 'lost' | 'capped'> {
  if (!(input.leaseMarginMs > 0 && input.leaseMarginMs < CONTACT_LADDER_WA_LEASE_MS)) {
    throw new Error(`[contact-ladder-whatsapp] leaseMarginMs must be inside (0, ${String(CONTACT_LADDER_WA_LEASE_MS)})`);
  }
  const notBefore = new Date(input.now.getTime() - (CONTACT_LADDER_WA_LEASE_MS - input.leaseMarginMs));
  await db.execute(sql.raw(`SET LOCAL lock_timeout = '${String(CONTACT_LADDER_WA_MARKER_TIMEOUT_MS)}ms'`));
  await db.execute(sql.raw(`SET LOCAL statement_timeout = '${String(CONTACT_LADDER_WA_MARKER_TIMEOUT_MS)}ms'`));
  const result = await db.execute<{ send_id: string }>(sql`
    UPDATE claim_contact_wa_sends
       SET send_started_at = clock_timestamp(), updated_at = clock_timestamp()
     WHERE pariwar_id = ${input.pariwarId}
       AND send_id = ${input.sendId}::uuid
       AND send_outcome = 'attempting'
       AND claimed_by_job = ${input.jobId}
       AND send_started_at IS NULL
       AND claimed_at > ${notBefore}
       AND send_count < ${CONTACT_LADDER_WA_MAX_SENDS}
    RETURNING send_id`);
  // `-370` / `-371` — the marker refuses a row whose ambiguous sends are spent (the post-send path finishes such a row before it can
  // come back; this conjunct is the backstop, 0176's CHECK the last one). The COUNT is taken at the post-send note (`-371`).
  if ((result.rows?.length ?? 0) > 0) return 'marked';
  // `capped` ≠ `lost`: THIS job still holds the unmarked row but its ambiguous sends are spent (a backstop — the post-send path
  // finishes such a row first) — the caller finishes it at once instead of burning retries on a lease it never lost.
  const held = await db.execute<{ capped: boolean }>(sql`
    SELECT send_count >= ${CONTACT_LADDER_WA_MAX_SENDS} AS capped FROM claim_contact_wa_sends
     WHERE pariwar_id = ${input.pariwarId} AND send_id = ${input.sendId}::uuid AND send_outcome = 'attempting'
       AND claimed_by_job = ${input.jobId} AND send_started_at IS NULL`);
  return held.rows?.[0]?.capped === true ? 'capped' : 'lost';
}

/**
 * RELEASE the marker WITHOUT a send: 20:00 IST arrived between the marker's commit and the Meta call. Meta was ⛔ called (⛔ a
 * transient), so the row is left `attempting`, un-noted, owned by this job; the CHILD re-enqueues itself for the next 09:00.
 */
export async function releaseContactLadderWhatsappInFlight(db: Db, input: ContactLadderWaRowRef): Promise<boolean> {
  const result = await db.execute<{ send_id: string }>(sql`
    UPDATE claim_contact_wa_sends
       SET send_started_at = NULL, updated_at = clock_timestamp()
     WHERE pariwar_id = ${input.pariwarId}
       AND send_id = ${input.sendId}::uuid
       AND send_outcome = 'attempting'
       AND claimed_by_job = ${input.jobId}
       AND send_started_at IS NOT NULL
    RETURNING send_id`);
  return (result.rows?.length ?? 0) > 0;
}

/**
 * A TRANSIENT note (a classified transient, a pre-send decrypt / hash fault): the row stays `attempting` under this job, the note
 * recorded and the marker CLEARED. `phase` is CAS'd on the marker (6.31 round-2 P2): `pre_send` requires it UNSET, `post_send`
 * requires it SET — a same-job-id twin can ⛔ clear the marker of a send the other run began.
 */
export async function noteContactLadderWhatsappTransient(
  db: Db,
  input: ContactLadderWaRowRef & { readonly detail: string; readonly phase: 'pre_send' | 'post_send' },
): Promise<boolean> {
  assertDetail(input.detail);
  const marker = input.phase === 'pre_send' ? sql`send_started_at IS NULL` : sql`send_started_at IS NOT NULL`;
  // `-371` — a post-send transient Meta MAY have acted on is COUNTED here (⛔ a 429, ⛔ a connection that never opened).
  const counted = input.phase === 'post_send' && isContactLadderWaAmbiguousTransient(input.detail) ? 1 : 0;
  const result = await db.execute<{ send_id: string }>(sql`
    UPDATE claim_contact_wa_sends
       SET detail = ${input.detail}, send_started_at = NULL, send_count = send_count + ${counted}, updated_at = clock_timestamp()
     WHERE pariwar_id = ${input.pariwarId}
       AND send_id = ${input.sendId}::uuid
       AND send_outcome = 'attempting'
       AND claimed_by_job = ${input.jobId}
       AND ${marker}
    RETURNING send_id`);
  return (result.rows?.length ?? 0) > 0;
}

/**
 * ⭐ THE FINAL ATTEMPT's transient (WS8 (iv)): FINISH the row `skipped:transient_exhausted` (pg-boss's final failure only `fail()`s
 * the job — nothing else would write the row). `first_detail` keeps the FIRST noted transient. After a POST-send transient the note
 * and the finish are ONE statement (the marker cleared in it — the CHECK holds at statement end; a crash cannot leave an unmarked
 * row owned by a finally-failed job). `phase` is CAS'd on the marker as the note is.
 */
export async function finishContactLadderWhatsappExhausted(
  db: Db,
  input: ContactLadderWaRowRef & { readonly transient: string; readonly phase: 'pre_send' | 'post_send' },
): Promise<boolean> {
  assertDetail(input.transient);
  const detail = contactLadderWaDetail('skipped', 'transient_exhausted');
  const marker = input.phase === 'pre_send' ? sql`send_started_at IS NULL` : sql`send_started_at IS NOT NULL`;
  const result = await db.execute<{ send_id: string }>(sql`
    UPDATE claim_contact_wa_sends
       SET send_outcome = 'skipped', send_started_at = NULL, first_detail = COALESCE(first_detail, detail, ${input.transient}),
           detail = ${detail}, updated_at = clock_timestamp()
     WHERE pariwar_id = ${input.pariwarId}
       AND send_id = ${input.sendId}::uuid
       AND send_outcome = 'attempting'
       AND claimed_by_job = ${input.jobId}
       AND ${marker}
    RETURNING send_id`);
  return (result.rows?.length ?? 0) > 0;
}

/**
 * ⭐ Decisions 2026-10-20-370 / -371 — the SEND CAP. `post_send` (the default): a post-send transient Meta MAY have acted on, on a
 * row that already counts `MAX - 1` such sends ⇒ FINISH it `may_have_sent:send_cap`, counting this one (⛔ a further call, whichever
 * job or day); the marker STAYS set (0172's CHECK — a `may_have_sent` row carries it). ⛔ Matches a non-ambiguous transient or a row
 * below the cap — the caller then notes it (or finishes it exhausted) as before. `at_marker`: the marker answered `capped` (a
 * backstop) — the finish SETS the marker field, ⛔ a call. `first_detail` keeps the transient noted before the finish (the first
 * ambiguous send's, on the post-send path).
 */
export async function finishContactLadderWhatsappSendCapped(
  db: Db,
  input: ContactLadderWaRowRef & { readonly transient: string; readonly phase?: 'post_send' | 'at_marker' },
): Promise<boolean> {
  assertDetail(input.transient);
  const atMarker = input.phase === 'at_marker';
  if (!atMarker && !isContactLadderWaAmbiguousTransient(input.transient)) return false;
  const detail = contactLadderWaDetail('may_have_sent', 'send_cap');
  const marker = atMarker ? sql`send_started_at IS NULL` : sql`send_started_at IS NOT NULL`;
  const reached = atMarker ? sql`send_count >= ${CONTACT_LADDER_WA_MAX_SENDS}` : sql`send_count >= ${CONTACT_LADDER_WA_MAX_SENDS - 1}`;
  const result = await db.execute<{ send_id: string }>(sql`
    UPDATE claim_contact_wa_sends
       SET send_outcome = 'may_have_sent', send_started_at = COALESCE(send_started_at, clock_timestamp()),
           send_count = ${atMarker ? sql`send_count` : sql`send_count + 1`},
           first_detail = COALESCE(first_detail, detail, ${input.transient}), detail = ${detail}, updated_at = clock_timestamp()
     WHERE pariwar_id = ${input.pariwarId}
       AND send_id = ${input.sendId}::uuid
       AND send_outcome = 'attempting'
       AND claimed_by_job = ${input.jobId}
       AND ${marker}
       AND ${reached}
    RETURNING send_id`);
  return (result.rows?.length ?? 0) > 0;
}

/** Finish this job's un-marked row `skipped:<reason>` (a bound value Meta would refuse — `helpline_unreadable`, …). */
export async function finishContactLadderWhatsappSkipped(
  db: Db,
  input: ContactLadderWaRowRef & { readonly reason: string },
): Promise<boolean> {
  const detail = contactLadderWaDetail('skipped', input.reason);
  const result = await db.execute<{ send_id: string }>(sql`
    UPDATE claim_contact_wa_sends
       SET send_outcome = 'skipped', first_detail = COALESCE(first_detail, detail), detail = ${detail}, updated_at = clock_timestamp()
     WHERE pariwar_id = ${input.pariwarId}
       AND send_id = ${input.sendId}::uuid
       AND send_outcome = 'attempting'
       AND claimed_by_job = ${input.jobId}
       AND send_started_at IS NULL
    RETURNING send_id`);
  return (result.rows?.length ?? 0) > 0;
}

/**
 * The number is UNUSABLE, found AFTER the claim and BEFORE any send: ⛔ number (`no_sendable_number`), or its recomputed hash ≠
 * the ladder's (`hash_mismatch` — a 6.20 correction since the ladder started; the ladder's own end rule follows at 10:00).
 * Finished `no_target`, the marker unset (6.37c round 2's stranded-`attempting` class).
 */
export async function finishContactLadderWhatsappNoTarget(
  db: Db,
  input: ContactLadderWaRowRef & { readonly reason: 'no_sendable_number' | 'hash_mismatch' },
): Promise<boolean> {
  const detail = contactLadderWaDetail('no_target', input.reason);
  const result = await db.execute<{ send_id: string }>(sql`
    UPDATE claim_contact_wa_sends
       SET send_outcome = 'no_target', first_detail = COALESCE(first_detail, detail), detail = ${detail}, updated_at = clock_timestamp()
     WHERE pariwar_id = ${input.pariwarId}
       AND send_id = ${input.sendId}::uuid
       AND send_outcome = 'attempting'
       AND claimed_by_job = ${input.jobId}
       AND send_started_at IS NULL
    RETURNING send_id`);
  return (result.rows?.length ?? 0) > 0;
}

/**
 * ⭐ THE COMPARE-AND-SET after the Meta call, only by the job holding the row WITH the marker: `accepted` (the wamid — and, in the
 * SAME statement's transaction, a `delivered` the status store already holds for it is copied into `delivered_at` — WS11 (1), a
 * status drained before this finalise), `rejected_recipient:<token>`, `may_have_sent:<how>` (⛔ resent — I4), `refused:<token>`
 * (a scope-wide or unknown-scope refusal — recorded, ⛔ parked: WS8 (v)). The marker stays SET (it means "a call was made" —
 * 0172's mapping). Bounded inside the caller's transaction. Returns `false` when the row moved on.
 */
export async function finaliseContactLadderWhatsapp(
  client: pg.PoolClient,
  input: ContactLadderWaRowRef & {
    readonly outcome: 'accepted' | 'rejected_recipient' | 'may_have_sent' | 'refused';
    readonly providerMessageId?: string | null;
    readonly detail?: string | null;
  },
): Promise<boolean> {
  assertDetail(input.detail ?? null);
  if (input.outcome === 'accepted' && !input.providerMessageId) throw new Error('[contact-ladder-whatsapp] an accepted finalise carries the wamid');
  if (input.outcome !== 'accepted' && !(input.detail ?? '').startsWith(`${input.outcome}:`)) {
    throw new Error(`[contact-ladder-whatsapp] a ${input.outcome} finalise carries a ${input.outcome}:* detail`);
  }
  await client.query(`SET LOCAL lock_timeout = '${String(CONTACT_LADDER_WA_FINALISE_TIMEOUT_MS)}ms'`);
  await client.query(`SET LOCAL statement_timeout = '${String(CONTACT_LADDER_WA_FINALISE_TIMEOUT_MS)}ms'`);
  const r = await client.query(
    `UPDATE claim_contact_wa_sends
        SET send_outcome = $4, provider_message_id = $5, first_detail = COALESCE(first_detail, detail), detail = $6,
            updated_at = clock_timestamp()
      WHERE pariwar_id = $1 AND send_id = $2::uuid AND send_outcome = 'attempting' AND claimed_by_job = $3
        AND send_started_at IS NOT NULL`,
    [input.pariwarId, input.sendId, input.jobId, input.outcome, input.providerMessageId ?? null, input.detail ?? null],
  );
  const moved = (r.rowCount ?? 0) > 0;
  if (moved && input.outcome === 'accepted') {
    await client.query(
      `UPDATE claim_contact_wa_sends s SET delivered_at = w.updated_at, updated_at = clock_timestamp()
         FROM whatsapp_send_status w
        WHERE s.pariwar_id = $1 AND s.send_id = $2::uuid AND s.delivered_at IS NULL
          AND w.pariwar_id = s.pariwar_id AND w.wamid = s.provider_message_id AND w.state = 'delivered'`,
      [input.pariwarId, input.sendId],
    );
  }
  return moved;
}

// ── The sweep's reads and writes — cross-tenant, BYPASSRLS pool ─────────────────────────────────────────────────

/** One WhatsApp step to judge (ids only). */
export interface DueContactLadderWhatsapp {
  readonly pariwarId: PariwarId;
  readonly claimCaseId: ClaimId;
  readonly ladderId: string;
  readonly chase: ContactLadderChase;
}

/**
 * ⭐ AC4 / WS8 (iii) (1) — the steps the quarter-hourly sweep hands to a child, SQL ONLY (⛔ HMAC, ⛔ decrypt), keyset on
 * `ladder_id`: (a) every RUNNING ladder whose step is `pending` and whose ORIGIN row is 4 hours old on the DB clock — or whose
 * origin row cannot be found (the child records `skipped:anchor_unknown`, I10); and (b) every ladder whose send row is
 * `attempting` with ⛔ marker and a LAPSED lease — WHATEVER the ladder's state (a ladder that ended mid-backoff still owes its row
 * a finish; a crash before the marker, a lost pg-boss job, a deferral that never ran are all re-taken here — a claimed step is no
 * longer `pending`, so nothing else finds it). ⛔ A row is written here. The child judges every conjunct again under the lock.
 *
 * ── DELIBERATE: a CROSS-TENANT READ on the BYPASSRLS pool (family 9) ── 6.31's `listDuePeerMeshWaReminderPings` reasoning: ids
 * only; every write follows in the child's own `withPariwarScope` transaction after a locked re-check. The caller checks
 * `canReadAcrossPariwars` FIRST. `allow` (tests) narrows it. RE-EXAMINE when: the result carries more than ids, the read
 * projects PII, a write is added on this pool, the pool loses BYPASSRLS, or a per-tenant scheduler exists.
 */
export async function listDueContactLadderWhatsapp(
  q: Queryable,
  input: { readonly now: Date; readonly after: string | null; readonly limit?: number; readonly allow: readonly string[] | null },
): Promise<DueContactLadderWhatsapp[]> {
  const n = clampLimit(input.limit, { default: CONTACT_LADDER_WA_PAGE_CAP, cap: CONTACT_LADDER_WA_PAGE_CAP });
  const lapsedBefore = new Date(input.now.getTime() - CONTACT_LADDER_WA_LEASE_MS);
  const { rows } = await q.query<{ pariwar_id: string; claim_case_id: string; ladder_id: string; chase: ContactLadderChase }>(
    `WITH due AS MATERIALIZED (
       SELECT l.pariwar_id, l.claim_case_id, l.ladder_id, l.chase
         FROM claim_contact_ladders l
         LEFT JOIN claim_correction_reminders oc ON l.chase = 'correction' AND oc.pariwar_id = l.pariwar_id AND oc.reminder_id = l.origin_row_id
         LEFT JOIN claim_certificate_reminders oe ON l.chase = 'certificate' AND oe.pariwar_id = l.pariwar_id AND oe.reminder_id = l.origin_row_id
        WHERE l.state = 'running' AND l.whatsapp_step = 'pending'
          AND (COALESCE(oc.created_at, oe.created_at) IS NULL
               OR COALESCE(oc.created_at, oe.created_at) + interval '4 hours' <= clock_timestamp())
       UNION
       SELECT l.pariwar_id, l.claim_case_id, l.ladder_id, l.chase
         FROM claim_contact_wa_sends s
         JOIN claim_contact_ladders l ON l.pariwar_id = s.pariwar_id AND l.ladder_id = s.ladder_id
        WHERE s.send_outcome = 'attempting' AND s.send_started_at IS NULL AND s.claimed_at < $1
     )
     SELECT pariwar_id, claim_case_id, ladder_id, chase FROM due
      WHERE ($2::uuid IS NULL OR ladder_id > $2::uuid)
        AND ($3::uuid[] IS NULL OR pariwar_id = ANY($3::uuid[]))
      ORDER BY ladder_id
      LIMIT $4`,
    [lapsedBefore, input.after, input.allow === null ? null : [...input.allow], n],
  );
  return rows.map((r) => ({ pariwarId: r.pariwar_id as PariwarId, claimCaseId: r.claim_case_id as ClaimId, ladderId: r.ladder_id, chase: r.chase }));
}

/**
 * ⭐ THE LAPSED IN-FLIGHT FINISHER (the sweep runs it FIRST): every `attempting` row WITH the marker whose claim is older than the
 * lease died mid-flight — it MAY have reached Meta ⇒ `may_have_sent:lease_lapsed` (the previous note kept in `first_detail`),
 * ⛔ ever re-claimed. ONE bounded `SKIP LOCKED` batch per call (oldest first) over a `MATERIALIZED` CTE
 * ([[project_in_subquery_limit_skip_locked_overclaim]]). ── DELIBERATE: a CROSS-TENANT WRITE on the BYPASSRLS pool ── a time bound
 * over every tenant's rows; predicate and effect read and write ⛔ nothing tenant-derived. RE-EXAMINE as above.
 */
export async function finishLapsedInFlightContactLadderWhatsapp(
  q: Queryable,
  input: { readonly now: Date; readonly allow: readonly string[] | null; readonly limit?: number },
): Promise<{ readonly sendId: string; readonly claimCaseId: ClaimId; readonly pariwarId: PariwarId }[]> {
  const detail = contactLadderWaDetail('may_have_sent', 'lease_lapsed');
  const limit = clampLimit(input.limit, { default: CONTACT_LADDER_WA_MAINTENANCE_BATCH, cap: CONTACT_LADDER_WA_MAINTENANCE_BATCH });
  const { rows } = await q.query<{ send_id: string; claim_case_id: string; pariwar_id: string }>(
    `WITH due AS MATERIALIZED (
       SELECT send_id FROM claim_contact_wa_sends
        WHERE send_outcome = 'attempting' AND send_started_at IS NOT NULL AND claimed_at < $3
          AND ($4::uuid[] IS NULL OR pariwar_id = ANY($4::uuid[]))
        ORDER BY claimed_at
        LIMIT $5
        FOR UPDATE SKIP LOCKED)
     UPDATE claim_contact_wa_sends s
        SET send_outcome = 'may_have_sent', first_detail = COALESCE(s.first_detail, s.detail), detail = $1, claimed_by_job = $2,
            updated_at = clock_timestamp()
       FROM due
      WHERE s.send_id = due.send_id
      RETURNING s.send_id, s.claim_case_id, s.pariwar_id`,
    [detail, CONTACT_LADDER_WA_LAPSED_BY, new Date(input.now.getTime() - CONTACT_LADDER_WA_LEASE_MS), input.allow === null ? null : [...input.allow], limit],
  );
  return rows.map((r) => ({ sendId: r.send_id, claimCaseId: r.claim_case_id as ClaimId, pariwarId: r.pariwar_id as PariwarId }));
}

// ── The webhook worker's writes (WS10, WS11) — inside `withPariwarScope(event.pariwarId)` ───────────────────────

/**
 * WS10 — record a STOP from a number (its claim-space hash) to this Pariwar's WhatsApp number. Idempotent on the inbound event
 * (a replay records ⛔ a second stop). Returns whether a row was written. The CALLER audits (`audit.withCompensatingAudit`).
 */
export async function insertClaimContactWaStop(
  db: Db,
  input: { readonly pariwarId: PariwarId; readonly recipientNumberHash: string; readonly inboundEventId: string; readonly stopId: string },
): Promise<boolean> {
  const rows = await db
    .insert(claimContactWaStops)
    .values({
      stopId: input.stopId,
      pariwarId: input.pariwarId,
      recipientNumberHash: input.recipientNumberHash,
      inboundEventId: input.inboundEventId,
    })
    .onConflictDoNothing()
    .returning({ stopId: claimContactWaStops.stopId });
  return rows.length > 0;
}

/**
 * WS11 — a status callback for a wamid that is a CLAIM send of this Pariwar: `delivered` / `read` ⇒ `delivered_at` (once —
 * Meta sends `read` WITHOUT `delivered` when both happen at once); `failed` ⇒ `failed_at` + the code (once). `null` ⇒ the wamid is
 * ⛔ a claim send (the member path runs as today); otherwise whether this call wrote. Set-once writes make Meta's retries safe.
 */
export async function recordClaimContactWaStatus(
  db: Db,
  input: { readonly pariwarId: PariwarId; readonly wamid: string; readonly status: string; readonly errorCode: number | null },
): Promise<{ readonly matched: false } | { readonly matched: true; readonly wrote: boolean }> {
  const [row] = await db
    .select({ sendId: claimContactWaSends.sendId, outcome: claimContactWaSends.sendOutcome })
    .from(claimContactWaSends)
    .where(and(eq(claimContactWaSends.pariwarId, input.pariwarId), eq(claimContactWaSends.providerMessageId, input.wamid)))
    .limit(1);
  if (!row) return { matched: false };
  if (row.outcome !== 'accepted') return { matched: true, wrote: false };
  if (input.status === 'delivered' || input.status === 'read') {
    const r = await db.execute<{ send_id: string }>(sql`
      UPDATE claim_contact_wa_sends SET delivered_at = clock_timestamp(), updated_at = clock_timestamp()
       WHERE pariwar_id = ${input.pariwarId} AND send_id = ${row.sendId}::uuid AND delivered_at IS NULL
      RETURNING send_id`);
    return { matched: true, wrote: (r.rows?.length ?? 0) > 0 };
  }
  if (input.status === 'failed') {
    const code =
      input.errorCode !== null && Number.isInteger(input.errorCode) && input.errorCode >= 0 && input.errorCode <= 999_999
        ? String(input.errorCode)
        : null;
    const r = await db.execute<{ send_id: string }>(sql`
      UPDATE claim_contact_wa_sends SET failed_at = clock_timestamp(), failure_code = ${code}, updated_at = clock_timestamp()
       WHERE pariwar_id = ${input.pariwarId} AND send_id = ${row.sendId}::uuid AND failed_at IS NULL
      RETURNING send_id`);
    return { matched: true, wrote: (r.rows?.length ?? 0) > 0 };
  }
  return { matched: true, wrote: false };
}

/**
 * ⭐ WS11 (2) — is there a CLAIM send of this Pariwar to this recipient (its CLAIM-space hash) that is in flight, `may_have_sent`
 * or `accepted`, in the last `CONTACT_LADDER_WA_ISOLATION_DAYS`? A block-coded `failed` status with ⛔ wamid match is then treated
 * as the claim send's — the member revoke is SKIPPED (I7). Stored hashes only (⛔ the member blind index — T21).
 * Review R5 (2026-10-20) — aged by `updated_at`, ⛔ the immutable `created_at`: this story has ⛔ 72-hour bound, so an
 * `attempting` row can be RECLAIMED well past 7 days old (its `created_at`) while every reclaim re-stamps `updated_at`
 * fresh. `created_at` let a crashed row's isolation lapse before its wamid was finalised; `updated_at` tracks the row's
 * last claim / reclaim / finalise / status write, so a send made (or still attempting) NOW is never excluded.
 */
export async function hasRecentClaimContactWaSendTo(
  db: Db,
  input: { readonly pariwarId: PariwarId; readonly recipientNumberHash: string },
): Promise<boolean> {
  const result = await db.execute<{ send_id: string }>(sql`
    SELECT send_id FROM claim_contact_wa_sends
     WHERE pariwar_id = ${input.pariwarId}
       AND recipient_number_hash = ${input.recipientNumberHash}
       AND send_outcome IN ('attempting', 'may_have_sent', 'accepted')
       AND updated_at >= clock_timestamp() - make_interval(days => ${CONTACT_LADDER_WA_ISOLATION_DAYS})
     LIMIT 1`);
  return (result.rows?.length ?? 0) > 0;
}
