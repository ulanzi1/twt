// The partner LEAD HANDOFF record — the domain commands and reads (Story 12.5, Task 3; Decision `2026-11-21-483` QE2 (A), QE4, QE6 (A),
// QE7, QE13, QE18, QE21 (C), QE22 (A), QE24 (A); AC1's W legs, AC2, AC5–AC7's state half). Migration 0215's `marketplace_lead_handoffs`.
//
// ⭐ THE SEAM 12.3 CALLS (QE18 — NO production caller in 12.5, I1):
//   1. BEFORE its transaction: {@link sealLeadMemberFields} on what the member confirmed (no KMS round trip under the module lock).
//   2. In ONE READ COMMITTED transaction: `submitModuleLead` FIRST; on `{ replayed: true }` write NOTHING more;
//   3. otherwise `consent.recordConsent({ consentType: 'module_lead_handoff', consentArtifactRef: leadId, … })`, then
//      {@link recordLeadHandoff} with the `auditId` of a `module.lead_handoff_recorded` intent line (audit pairing is the CALLER's —
//      ⛔ function here calls the audit wrapper; G13).
// ⭐ THE ROW'S WRITES are QE6's W table, one function each (the sweep in `apps/jobs` drives the order S1–S10; this file holds only SQL):
//   W1 record · W2 claim · W3 delivered · W4 / W5 release-or-exhaust · W6 / W7 hold-or-expire · W8 fail · W9 cancel · W10 lapse ·
//   W11 erasure (in `member/anonymize.ts`) · W12 purge · W13 requeue · W14 cancel-while-waiting (`-487`).
//   "CAS" = `WHERE pariwar_id AND lead_id AND status = 'attempting' AND claim_token = $token` — zero rows means another claim owns the
//   row and the caller writes NOTHING (I11). ⛔ A compare on `claimed_at` (a JS `Date` drops microseconds). Every sweep write uses
//   `clock_timestamp()` (TR10). Every write that leaves `attempting` clears the token and `claimed_at`.
// ⚠ The sweep's pool BYPASSES RLS (roster Row 26): every per-row statement carries `pariwar_id`; the claim, the lapse and the purge are
// cross-tenant BY DESIGN (each DELIBERATE note says why).
// ⛔ A member field, the URL, an address, a header value, a body or a secret in any return value, error or `outcome_detail` (I8).

import type pg from 'pg';

import { isDeathReportStanding } from '../claim/death-report.js';
import { listConsentsForArtifact, resolveConsentById } from '../consent/read.js';
import { bindScopedDb, type Db } from '../db.js';
import { parseEnvelope } from '../encryption/envelope.js';
import type { ConsentId, MemberId, PariwarId } from '../ids/index.js';
import { getCurrentMemberModerationOverlay } from '../member/moderation/overlay.js';
import { listAccountFrozenMemberIds } from '../member/overlay.js';
import { getCurrentMemberState, memberExists } from '../member/read.js';
import { clampLimit } from '../pagination.js';
import {
  LEAD_ENVELOPE_VERSION,
  LEAD_HANDOFF_DETAIL_PATTERN,
  LEAD_HANDOFF_PARTNER_REFERENCE_PATTERN,
  type LeadHandoffStatus,
} from '../schema/marketplace_lead_handoffs.js';
import type { MarketplaceModuleArchiveReason, MarketplaceModuleState } from '../schema/marketplace_modules.js';
import {
  LeadHandoffAlreadyRecordedError,
  LeadHandoffConsentInvalidError,
  LeadHandoffFieldsGoneError,
  LeadHandoffFieldsInvalidError,
  LeadHandoffNotRequeueableError,
  uniqueViolationConstraint,
} from './errors.js';
import { sealLeadMemberFieldsV1, type LeadFieldsCryptoDeps } from './lead-member-fields.js';

type Queryable = Pick<pg.Pool, 'query'> | Pick<pg.PoolClient, 'query'>;

// ── QE6's constants — named, exported, ⛔ inline; each is also a sweep option (a test seam) ───────────────

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

/** The backoff after the Nth counted transient outcome (index N − 1). 6 waits for 7 attempts, ≈ 32.6 h end to end. */
export const LEAD_HANDOFF_RETRY_SCHEDULE_MS: readonly number[] = [MINUTE_MS, 5 * MINUTE_MS, 30 * MINUTE_MS, 2 * HOUR_MS, 6 * HOUR_MS, 24 * HOUR_MS];
/** The 7th counted transient outcome is final (`retries_exhausted`); a lapse on it is `outcome_unknown`. */
export const LEAD_HANDOFF_MAX_ATTEMPTS = 7;
/** A claim older than this is a crash: the lapse returns it (W10). Covers S4–S10's bounded terms. */
export const LEAD_HANDOFF_LEASE_MS = 5 * MINUTE_MS;
/** A hold (a fault that DEFINITELY sent nothing) comes back after this. */
export const LEAD_HANDOFF_HOLD_RETRY_MS = MINUTE_MS;
/** An unbroken run of holds this long is final (`hold_expired:<word>`, W7). */
export const LEAD_HANDOFF_MAX_HOLD_MS = 24 * HOUR_MS;
/** The pause between the attempted audit line's tries (S9). */
export const LEAD_HANDOFF_AUDIT_RETRY_PAUSE_MS = 200;
/** One tick claims rows until this much time has passed (S3) — a time budget, ⛔ a row count. */
export const LEAD_HANDOFF_TICK_BUDGET_MS = 45_000;
/** QE24 (A), RULED `-484` Q4 A ("removed 30 days after it is delivered or finally fails"); counsel may change the number. */
export const LEAD_FIELDS_RETENTION_DAYS = 30;
/** The purge's batch per tick (S2). */
export const LEAD_HANDOFF_PURGE_BATCH = 100;
/** The waiting pass's page (S2, `-487`): `due` rows whose next attempt is still ahead, read this many at a time. */
export const LEAD_HANDOFF_WAITING_PAGE = 50;
/** The waiting pass stops after this much time and resumes from its cursor on the next tick (`-487`) — a time budget, ⛔ a row count. */
export const LEAD_HANDOFF_WAITING_BUDGET_MS = 10_000;

/** The consent type that backs a handoff (QE2 (A); migration 0214). */
export const LEAD_HANDOFF_CONSENT_TYPE = 'module_lead_handoff' as const;

const DETAIL = new RegExp(LEAD_HANDOFF_DETAIL_PATTERN);
const PARTNER_REFERENCE = new RegExp(LEAD_HANDOFF_PARTNER_REFERENCE_PATTERN);

/** Every writer asserts the grammar BEFORE its statement (the CHECK is the backstop). */
export function isLeadHandoffDetail(detail: string): boolean {
  return DETAIL.test(detail);
}

function assertDetail(detail: string, prefix: string): void {
  if (!detail.startsWith(prefix) || !DETAIL.test(detail)) throw new Error(`marketplace_lead_handoffs: a ${prefix}* detail outside the grammar`);
}

/** The advisory reference (I3): kept only when it is a short safe token, else NULL. ⛔ A value outside the grammar is stored. */
export function sanitizePartnerReference(raw: string | null | undefined): string | null {
  return typeof raw === 'string' && PARTNER_REFERENCE.test(raw) ? raw : null;
}

// ── The seam (12.3) ─────────────────────────────────────────────────────────────────────────────────

/**
 * ⭐ QE18 step 1 — seal what the member confirmed, BEFORE 12.3 opens its transaction. Validates against `LeadMemberFieldsV1`
 * (`LeadHandoffFieldsInvalidError`, naming the fields), mints a FRESH nonce on every call, and encrypts under the lead's context
 * (`rowKey = leadId`). Returns the sealed string for {@link recordLeadHandoff}. NO production caller in 12.5 (I1).
 */
export async function sealLeadMemberFields(
  enc: LeadFieldsCryptoDeps,
  input: { readonly pariwarId: string; readonly leadId: string; readonly fields: unknown },
): Promise<string> {
  return sealLeadMemberFieldsV1(enc, input);
}

/** What {@link recordLeadHandoff} records. */
export interface RecordLeadHandoffInput {
  readonly pariwarId: string;
  readonly leadId: string;
  readonly moduleId: string;
  readonly memberId: string;
  /** The `module_lead_handoff` consent 12.3 recorded for THIS lead in the same transaction. */
  readonly consentId: string;
  /** {@link sealLeadMemberFields}'s output — stored as is; this function cannot read it. */
  readonly sealedFields: string;
  /** The caller's `module.lead_handoff_recorded` intent line. */
  readonly auditId: string;
}

const RECORD_SAVEPOINT = 'lead_handoff_record';
const PKEY_CONSTRAINT = 'marketplace_lead_handoffs_pkey';
const CONSENT_UNIQUE_CONSTRAINT = 'marketplace_lead_handoffs_consent_id_unique';

/**
 * ⭐ QE18 step 4 (W1) — record the lead as DUE, in 12.3's transaction (the same one as `module.lead_submitted`), as `twt_app` under
 * the Pariwar's scope. Refuses a consent that is not `module_lead_handoff`, is for another subject or Pariwar, is revoked, or whose
 * `consent_artifact_ref` is not this `lead_id` (`LeadHandoffConsentInvalidError`) — before any write. Writes ONLY the eight columns
 * 0215 grants; `due`, `attempt_count = 0`, `outcome_detail = NULL` and `next_attempt_at = now()` are the defaults.
 * Refuses a member who is not a member of THIS Pariwar (`member_not_in_pariwar`): the member FK is single-column and an FK check ignores
 * RLS, so without it a row could name another Pariwar's member — one the sweep can only hold and that member's erasure never reaches.
 * Under a SAVEPOINT (12.1 TR3): a 23505 on `lead_id` or `consent_id` is rolled back to it and mapped to
 * `LeadHandoffAlreadyRecordedError`, so the caller's transaction stays usable. NO production caller in 12.5 (I1).
 */
export async function recordLeadHandoff(client: pg.PoolClient, input: RecordLeadHandoffInput): Promise<void> {
  const leadId = input.leadId.toLowerCase();
  const pariwarId = input.pariwarId.toLowerCase();
  const memberId = input.memberId.toLowerCase();
  try {
    parseEnvelope(input.sealedFields);
  } catch {
    throw new LeadHandoffFieldsInvalidError(['sealedFields']);
  }
  await client.query(`SAVEPOINT ${RECORD_SAVEPOINT}`);
  try {
    const db: Db = bindScopedDb(client);
    const consent = await resolveConsentById(db, pariwarId as PariwarId, input.consentId.toLowerCase() as ConsentId);
    if (consent === null) throw new LeadHandoffConsentInvalidError(leadId, 'not_found');
    if (consent.consentType !== LEAD_HANDOFF_CONSENT_TYPE) throw new LeadHandoffConsentInvalidError(leadId, 'wrong_type');
    if (consent.subjectId.toLowerCase() !== memberId) throw new LeadHandoffConsentInvalidError(leadId, 'wrong_subject');
    if (!(await memberExists(db, pariwarId as PariwarId, memberId as MemberId))) throw new LeadHandoffConsentInvalidError(leadId, 'member_not_in_pariwar');
    if (consent.revokedAt !== null) throw new LeadHandoffConsentInvalidError(leadId, 'revoked');
    if ((consent.consentArtifactRef ?? '').toLowerCase() !== leadId) throw new LeadHandoffConsentInvalidError(leadId, 'wrong_artifact');
    await client.query(
      `INSERT INTO marketplace_lead_handoffs
         (lead_id, pariwar_id, module_id, member_id, consent_id, envelope_version, member_fields_ciphertext, audit_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [leadId, pariwarId, input.moduleId.toLowerCase(), memberId, consent.consentId, LEAD_ENVELOPE_VERSION, input.sealedFields, input.auditId],
    );
    await client.query(`RELEASE SAVEPOINT ${RECORD_SAVEPOINT}`);
  } catch (err) {
    await client.query(`ROLLBACK TO SAVEPOINT ${RECORD_SAVEPOINT}`).catch(() => undefined);
    await client.query(`RELEASE SAVEPOINT ${RECORD_SAVEPOINT}`).catch(() => undefined);
    const constraint = uniqueViolationConstraint(err);
    if (constraint === PKEY_CONSTRAINT) throw new LeadHandoffAlreadyRecordedError(leadId, 'lead_id');
    if (constraint === CONSENT_UNIQUE_CONSTRAINT) throw new LeadHandoffAlreadyRecordedError(leadId, 'consent_id');
    throw err;
  }
}

// ── S3 — the claim (W2) ────────────────────────────────────────────────────────────────────────────

/** One claimed row — ids, counters and clocks. The ciphertext is ⛔ on it: S6 reads it in its own transaction (P2). */
export interface ClaimedLeadHandoff {
  readonly leadId: string;
  readonly pariwarId: string;
  readonly moduleId: string;
  readonly memberId: string;
  readonly consentId: string;
  /** Rose with this claim: 1 on the first attempt. */
  readonly attemptCount: number;
  /** The start of the row's current run of holds, or null. */
  readonly heldSince: Date | null;
  /** The body's `submitted_at` (QE12). */
  readonly createdAt: Date;
  /** The module's URL authority (`split_part(url, '/', 3)` — exact: the stored URL is canonical). */
  readonly authority: string;
}

/**
 * ⭐ S3 (W2) — claim the next due row, or null. ONE row: a MATERIALIZED CTE with `FOR UPDATE OF h SKIP LOCKED LIMIT 1` (⛔ an
 * `IN (subquery LIMIT)` — [[project_in_subquery_limit_skip_locked_overclaim]]), joined to its module ⛔ locking it (`submitModuleLead`
 * holds that lock). Ordered `next_attempt_at, updated_at` (TR6). EXCLUDES the tick's `keyHeld` modules and `open` authorities — the
 * per-tick breaker: their rows are simply not claimed (no write, no budget spent). `attempt_count` rises HERE.
 *
 * DELIBERATE (checklist family 9): this reads and claims EVERY Pariwar's due rows on the sweep's own pool, which bypasses RLS. The sweep is
 * one platform-wide job with no request to take a Pariwar from, and the row it returns holds ids only. The caller checks
 * `smsDelivery.canReadAcrossPariwars` first (an RLS-bound login would claim nothing and say nothing). Re-examine if this is ever called
 * from a request path, or when the sweep moves to an RLS-bound login (roster Row 26; Row 54 (g)).
 */
export async function claimDueLeadHandoff(
  q: Queryable,
  input: { readonly claimToken: string; readonly excludeModuleIds?: readonly string[]; readonly excludeAuthorities?: readonly string[] },
): Promise<ClaimedLeadHandoff | null> {
  const { rows } = await q.query<{
    lead_id: string;
    pariwar_id: string;
    module_id: string;
    member_id: string;
    consent_id: string;
    attempt_count: number;
    held_since: Date | null;
    created_at: Date;
    authority: string;
  }>(
    `WITH next AS MATERIALIZED (
       SELECT h.lead_id, split_part(m.lead_handoff_url, '/', 3) AS authority
         FROM marketplace_lead_handoffs h
         JOIN marketplace_modules m ON m.pariwar_id = h.pariwar_id AND m.module_id = h.module_id
        WHERE h.status = 'due'
          AND h.next_attempt_at <= clock_timestamp()
          AND NOT (h.module_id = ANY($2::uuid[]))
          AND NOT (split_part(m.lead_handoff_url, '/', 3) = ANY($3::text[]))
        ORDER BY h.next_attempt_at, h.updated_at, h.lead_id
        FOR UPDATE OF h SKIP LOCKED
        LIMIT 1
     )
     UPDATE marketplace_lead_handoffs s
        SET status = 'attempting', claim_token = $1, claimed_at = clock_timestamp(), attempt_count = s.attempt_count + 1,
            updated_at = clock_timestamp()
       FROM next
      WHERE s.lead_id = next.lead_id
      RETURNING s.lead_id, s.pariwar_id, s.module_id, s.member_id, s.consent_id, s.attempt_count, s.held_since, s.created_at,
                next.authority`,
    [input.claimToken, [...(input.excludeModuleIds ?? [])], [...(input.excludeAuthorities ?? [])]],
  );
  const r = rows[0];
  if (r === undefined) return null;
  return {
    leadId: r.lead_id,
    pariwarId: r.pariwar_id,
    moduleId: r.module_id,
    memberId: r.member_id,
    consentId: r.consent_id,
    attemptCount: r.attempt_count,
    heldSince: r.held_since,
    createdAt: r.created_at,
    authority: r.authority,
  };
}

// ── S4 — the module, read with an explicit Pariwar predicate ──────────────────────────────────────────

/** What S4 reads. The URL and the secret NAME stay inside the sweep (⛔ logged, ⛔ alarmed, ⛔ stored — I8). */
export interface LeadHandoffModule {
  readonly moduleId: string;
  readonly partnerId: string;
  readonly leadHandoffUrl: string;
  readonly signingKeySecretName: string;
  readonly currentState: MarketplaceModuleState;
  readonly archiveReason: MarketplaceModuleArchiveReason | null;
}

/** S4 — the module row of a claimed handoff, or null (the composite FK makes null a broken read). */
export async function readLeadHandoffModule(
  q: Queryable,
  input: { readonly pariwarId: string; readonly moduleId: string },
): Promise<LeadHandoffModule | null> {
  const { rows } = await q.query<{
    module_id: string;
    partner_id: string;
    lead_handoff_url: string;
    lead_handoff_signing_key_secret_name: string;
    current_state: MarketplaceModuleState;
    archive_reason: MarketplaceModuleArchiveReason | null;
  }>(
    `SELECT module_id, partner_id, lead_handoff_url, lead_handoff_signing_key_secret_name, current_state, archive_reason
       FROM marketplace_modules
      WHERE pariwar_id = $1 AND module_id = $2`,
    [input.pariwarId, input.moduleId],
  );
  const r = rows[0];
  if (r === undefined) return null;
  return {
    moduleId: r.module_id,
    partnerId: r.partner_id,
    leadHandoffUrl: r.lead_handoff_url,
    signingKeySecretName: r.lead_handoff_signing_key_secret_name,
    currentState: r.current_state,
    archiveReason: r.archive_reason,
  };
}

// ── S6 — the member's side: P0–P5, IN THIS ORDER ─────────────────────────────────────────────────────

/** The cancel words P1–P5 write (W9), and QE22's. */
export const LEAD_HANDOFF_CANCEL_WORDS = [
  'consent_revoked',
  'member_erased',
  'member_withdrawn',
  'member_terminated',
  'account_frozen',
  'death_reported',
  'module_withdrawn',
] as const;
export type LeadHandoffCancelWord = (typeof LEAD_HANDOFF_CANCEL_WORDS)[number];

/** The P1 read's page. A FULL page is a fault (`unsound`), never an answer: "none revoked" must be judged over ALL rows. */
export const LEAD_HANDOFF_CONSENT_PAGE = 20;

/** What S6 found. `unsound` ⇒ W6 `held:db_unavailable` (the read is broken), ⛔ a send. */
export type LeadHandoffPredicateVerdict =
  | { readonly kind: 'unsound'; readonly why: 'member_not_visible' | 'consent_page_full' }
  | { readonly kind: 'cancel'; readonly word: Exclude<LeadHandoffCancelWord, 'module_withdrawn'> }
  | { readonly kind: 'ok'; readonly ciphertext: string };

/**
 * ⭐ S6 — QE7's P0–P5, IN THIS ORDER, stopping at the first failure, on the caller's scope transaction (the sweep's `withPariwarScope`,
 * which COMMITS before any partner-side write and before any request — I2). ⚠ On the jobs pool RLS hides nothing (G12): P0 ties the
 * member to the row's Pariwar FIRST, and after it the two readers that take no Pariwar are safe; every other read carries `pariwar_id`
 * or reads the scope GUC itself (`listAccountFrozenMemberIds`).
 *   · P0 — `memberExists(pariwar, member)`; false ⇒ `unsound` (the FK guarantees the row, so false means the read is broken — and it
 *          closes `getCurrentMemberState`'s permissive default).
 *   · P1 — every `module_lead_handoff` row the member recorded for THIS `lead_id`, revoked ones included: the row's own `consent_id`
 *          must be among them and NONE may be revoked (a revoke on a duplicate row still cancels) ⇒ else `consent_revoked`.
 *   · P2 — the row's ciphertext is NULL, or the lifecycle state is `anonymized` ⇒ `member_erased`.
 *   · P3 — `withdrawn` ⇒ `member_withdrawn`; the moderation overlay `terminated` ⇒ `member_terminated` (QE23 (A)). A SUSPENDED member
 *          is still a member.
 *   · P4 — the account-frozen overlay at the DB clock ⇒ `account_frozen` (READ only — I6).
 *   · P5 — a standing death report ⇒ `death_reported` (QE26 (A), RULED `-484` Q7 A): what still holds after the freeze lifts.
 * A query that THROWS propagates — the caller holds the row `db_unavailable` and ends the tick (QE13).
 */
export async function readLeadHandoffPredicates(
  db: Db,
  client: Pick<pg.PoolClient, 'query'>,
  input: { readonly pariwarId: string; readonly leadId: string; readonly memberId: string; readonly consentId: string },
): Promise<LeadHandoffPredicateVerdict> {
  const P = input.pariwarId.toLowerCase() as PariwarId;
  const M = input.memberId.toLowerCase() as MemberId;
  const leadId = input.leadId.toLowerCase();
  // P0
  if (!(await memberExists(db, P, M))) return { kind: 'unsound', why: 'member_not_visible' };
  // P1
  const consents = await listConsentsForArtifact(db, P, M, LEAD_HANDOFF_CONSENT_TYPE, leadId, { limit: LEAD_HANDOFF_CONSENT_PAGE });
  if (consents.length >= LEAD_HANDOFF_CONSENT_PAGE) return { kind: 'unsound', why: 'consent_page_full' };
  const own = input.consentId.toLowerCase();
  if (!consents.some((c) => c.consentId.toLowerCase() === own) || consents.some((c) => c.revokedAt !== null)) {
    return { kind: 'cancel', word: 'consent_revoked' };
  }
  // P2
  const { rows } = await client.query<{ member_fields_ciphertext: string | null }>(
    'SELECT member_fields_ciphertext FROM marketplace_lead_handoffs WHERE pariwar_id = $1 AND lead_id = $2',
    [P, leadId],
  );
  const ciphertext = rows[0]?.member_fields_ciphertext ?? null;
  const state = await getCurrentMemberState(db, M);
  if (ciphertext === null || state === 'anonymized') return { kind: 'cancel', word: 'member_erased' };
  // P3
  if (state === 'withdrawn') return { kind: 'cancel', word: 'member_withdrawn' };
  if ((await getCurrentMemberModerationOverlay(db, M)).status === 'terminated') return { kind: 'cancel', word: 'member_terminated' };
  // P4 — `at` from the database clock, in this transaction.
  const at = (await client.query<{ at: Date }>('SELECT clock_timestamp() AS at')).rows[0]?.at ?? new Date();
  if ((await listAccountFrozenMemberIds(db, [M], at)).has(M)) return { kind: 'cancel', word: 'account_frozen' };
  // P5
  if (await isDeathReportStanding(db, P, M)) return { kind: 'cancel', word: 'death_reported' };
  return { kind: 'ok', ciphertext };
}

// ── S10 / S6 — the compare-and-set writes (W3–W9) ────────────────────────────────────────────────────

/** The identity of a claim: every CAS write names it. */
export interface LeadHandoffClaimRef {
  readonly pariwarId: string;
  readonly leadId: string;
  readonly claimToken: string;
}

const CAS = `pariwar_id = $1 AND lead_id = $2 AND status = 'attempting' AND claim_token = $3`;
const LEAVE_ATTEMPTING = `claim_token = NULL, claimed_at = NULL, updated_at = clock_timestamp()`;

const casParams = (ref: LeadHandoffClaimRef): unknown[] => [ref.pariwarId.toLowerCase(), ref.leadId.toLowerCase(), ref.claimToken];

/**
 * W3 — `attempting → delivered`, `delivered:http_2xx:<code>`, with `delivered_at` and the sanitised advisory reference. `false` ⇒ the
 * row moved on (stale claim). A settle ALWAYS records the true outcome: a 2xx on a row erased mid-flight ends `delivered`.
 */
export async function settleLeadHandoffDelivered(
  q: Queryable,
  ref: LeadHandoffClaimRef & { readonly httpStatus: number; readonly partnerReference: string | null },
): Promise<boolean> {
  const detail = `delivered:http_2xx:${String(ref.httpStatus)}`;
  assertDetail(detail, 'delivered:');
  const { rowCount } = await q.query(
    `UPDATE marketplace_lead_handoffs
        SET status = 'delivered', outcome_detail = $4, delivered_at = clock_timestamp(), partner_reference = $5, held_since = NULL,
            ${LEAVE_ATTEMPTING}
      WHERE ${CAS}`,
    [...casParams(ref), detail, sanitizePartnerReference(ref.partnerReference)],
  );
  return (rowCount ?? 0) > 0;
}

/** What a release did: back to `due` (W4), final on the last attempt (W5), or nothing (stale claim). */
export type LeadHandoffReleaseResult = 'released' | 'exhausted' | 'stale';

/**
 * W4 / W5 — a TRANSIENT outcome (`released:*`), the attempt stays counted: `attempting → due` with `next_attempt_at = clock +
 * retryScheduleMs[attempt_count − 1]`, or — when `attempt_count ≥ maxAttempts` — `attempting → failed_delivery:retries_exhausted`. ONE
 * statement, so the choice and the write are atomic. `held_since` is cleared (an ordinary outcome ends a run of holds).
 */
export async function releaseLeadHandoff(
  q: Queryable,
  ref: LeadHandoffClaimRef & {
    readonly detail: string;
    readonly retryScheduleMs?: readonly number[];
    readonly maxAttempts?: number;
  },
): Promise<LeadHandoffReleaseResult> {
  assertDetail(ref.detail, 'released:');
  const schedule = ref.retryScheduleMs ?? LEAD_HANDOFF_RETRY_SCHEDULE_MS;
  if (schedule.length === 0) throw new RangeError('releaseLeadHandoff: an empty retry schedule');
  const { rows } = await q.query<{ status: LeadHandoffStatus }>(
    `UPDATE marketplace_lead_handoffs
        SET status = CASE WHEN attempt_count >= $6 THEN 'failed_delivery' ELSE 'due' END,
            outcome_detail = CASE WHEN attempt_count >= $6 THEN 'failed_delivery:retries_exhausted' ELSE $4 END,
            next_attempt_at = CASE WHEN attempt_count >= $6 THEN next_attempt_at
                                   ELSE clock_timestamp() + ($5::bigint[])[LEAST(GREATEST(attempt_count, 1), cardinality($5::bigint[]))] * interval '1 millisecond' END,
            held_since = NULL,
            ${LEAVE_ATTEMPTING}
      WHERE ${CAS}
      RETURNING status`,
    [...casParams(ref), ref.detail, [...schedule], ref.maxAttempts ?? LEAD_HANDOFF_MAX_ATTEMPTS],
  );
  const r = rows[0];
  if (r === undefined) return 'stale';
  return r.status === 'failed_delivery' ? 'exhausted' : 'released';
}

/** The words a hold carries: a fault that DEFINITELY sent nothing (QE6 W6). */
export const LEAD_HANDOFF_HOLD_WORDS = ['signing_key', 'kms', 'audit', 'db', 'dns'] as const;
export type LeadHandoffHoldWord = (typeof LEAD_HANDOFF_HOLD_WORDS)[number];

/** What a hold did: back to `due` (W6), final because the run of holds is too long (W7), or nothing (stale claim). */
export type LeadHandoffHoldResult = 'held' | 'expired' | 'stale';

/**
 * W6 / W7 — a fault that DEFINITELY sent nothing: the attempt is given back (`attempt_count − 1`, in the SAME statement — TR16). If the
 * row's run of holds began `maxHoldMs` ago or more ⇒ `failed_delivery:hold_expired:<word>` (the word of THIS attempt's fault), `held_since`
 * kept; else `due`, `held:<word>_unavailable`, `held_since = COALESCE(held_since, clock)`, `next_attempt_at = clock + holdRetryMs`.
 */
export async function holdLeadHandoff(
  q: Queryable,
  ref: LeadHandoffClaimRef & { readonly word: LeadHandoffHoldWord; readonly holdRetryMs?: number; readonly maxHoldMs?: number },
): Promise<LeadHandoffHoldResult> {
  const held = `held:${ref.word}_unavailable`;
  const expired = `failed_delivery:hold_expired:${ref.word}`;
  assertDetail(held, 'held:');
  assertDetail(expired, 'failed_delivery:');
  const { rows } = await q.query<{ status: LeadHandoffStatus }>(
    `UPDATE marketplace_lead_handoffs
        SET status = CASE WHEN expired THEN 'failed_delivery' ELSE 'due' END,
            outcome_detail = CASE WHEN expired THEN $5 ELSE $4 END,
            attempt_count = attempt_count - 1,
            held_since = CASE WHEN expired THEN held_since ELSE COALESCE(held_since, clock_timestamp()) END,
            next_attempt_at = CASE WHEN expired THEN next_attempt_at ELSE clock_timestamp() + $6::bigint * interval '1 millisecond' END,
            ${LEAVE_ATTEMPTING}
       FROM (SELECT held_since IS NOT NULL AND clock_timestamp() - held_since >= $7::bigint * interval '1 millisecond' AS expired
               FROM marketplace_lead_handoffs WHERE ${CAS}) AS judged
      WHERE ${CAS}
      RETURNING status`,
    [...casParams(ref), held, expired, ref.holdRetryMs ?? LEAD_HANDOFF_HOLD_RETRY_MS, ref.maxHoldMs ?? LEAD_HANDOFF_MAX_HOLD_MS],
  );
  const r = rows[0];
  if (r === undefined) return 'stale';
  return r.status === 'failed_delivery' ? 'expired' : 'held';
}

/**
 * W8 — a PERMANENT outcome: `attempting → failed_delivery:(http_4xx:<code> | http_3xx:<code> | port_refused | url_refused |
 * fields_unreadable)`. `false` ⇒ stale claim.
 */
export async function failLeadHandoff(q: Queryable, ref: LeadHandoffClaimRef & { readonly detail: string }): Promise<boolean> {
  assertDetail(ref.detail, 'failed_delivery:');
  const { rowCount } = await q.query(
    `UPDATE marketplace_lead_handoffs SET status = 'failed_delivery', outcome_detail = $4, held_since = NULL, ${LEAVE_ATTEMPTING}
      WHERE ${CAS}`,
    [...casParams(ref), ref.detail],
  );
  return (rowCount ?? 0) > 0;
}

/**
 * W9 — a CANCEL (P1–P5, QE22 (A)): `attempting → cancelled:<word>`, the fields dropped AT ONCE (QE24 (A), `-484` Q4 A). Final: a
 * cancelled row is never revived (I10). `false` ⇒ stale claim.
 */
export async function cancelLeadHandoff(q: Queryable, ref: LeadHandoffClaimRef & { readonly word: LeadHandoffCancelWord }): Promise<boolean> {
  const detail = `cancelled:${ref.word}`;
  assertDetail(detail, 'cancelled:');
  const { rowCount } = await q.query(
    `UPDATE marketplace_lead_handoffs
        SET status = 'cancelled', outcome_detail = $4, member_fields_ciphertext = NULL, held_since = NULL, ${LEAVE_ATTEMPTING}
      WHERE ${CAS}`,
    [...casParams(ref), detail],
  );
  return (rowCount ?? 0) > 0;
}

// ── S2 — the waiting pass (W14; Decision `2026-11-22-487`) ────────────────────────────────────────────

/** One `due` row whose next attempt is still ahead — ids, and whether its offer was withdrawn (QE22 (A)). */
export interface WaitingLeadHandoff {
  readonly leadId: string;
  readonly pariwarId: string;
  readonly moduleId: string;
  readonly memberId: string;
  readonly consentId: string;
  /** The module is `archived` for `trustee_archived` — the test S4 applies. */
  readonly moduleWithdrawn: boolean;
}

/**
 * ⭐ S2 (`-487`) — a page of `due` rows that are WAITING (`next_attempt_at` still ahead: a retry's backoff or a hold's minute), in
 * `lead_id` order after `afterLeadId`. The sweep re-reads the member's side for each so a stop is honoured within the tick's minute,
 * ⛔ at the next retry (`-484` Q4 A: "Removed at once if the send is stopped"). A READ: ⛔ lock, ⛔ write — the cancel is W14's
 * compare on `status = 'due'`.
 *
 * DELIBERATE (checklist family 9): every Pariwar's waiting rows in one statement on the sweep's pool (bypasses RLS) — the pass is the
 * same platform-wide job as the claim, and it returns ids and one boolean only. The caller checks `canReadAcrossPariwars` first. Re-examine
 * under the claim's triggers.
 */
export async function listWaitingLeadHandoffs(
  q: Queryable,
  opts: { readonly afterLeadId?: string | null; readonly limit?: number } = {},
): Promise<WaitingLeadHandoff[]> {
  const { rows } = await q.query<{
    lead_id: string;
    pariwar_id: string;
    module_id: string;
    member_id: string;
    consent_id: string;
    module_withdrawn: boolean;
  }>(
    `SELECT h.lead_id, h.pariwar_id, h.module_id, h.member_id, h.consent_id,
            (m.current_state = 'archived' AND m.archive_reason = 'trustee_archived') AS module_withdrawn
       FROM marketplace_lead_handoffs h
       JOIN marketplace_modules m ON m.pariwar_id = h.pariwar_id AND m.module_id = h.module_id
      WHERE h.status = 'due'
        AND h.next_attempt_at > clock_timestamp()
        AND ($1::uuid IS NULL OR h.lead_id > $1::uuid)
      ORDER BY h.lead_id
      LIMIT $2`,
    [opts.afterLeadId ?? null, clampLimit(opts.limit, { default: LEAD_HANDOFF_WAITING_PAGE, cap: 500 })],
  );
  return rows.map((r) => ({
    leadId: r.lead_id,
    pariwarId: r.pariwar_id,
    moduleId: r.module_id,
    memberId: r.member_id,
    consentId: r.consent_id,
    moduleWithdrawn: r.module_withdrawn,
  }));
}

/**
 * ⭐ W14 (`-487`) — a CANCEL of a row that is NOT in flight: `due → cancelled:<word>`, the fields dropped AT ONCE. ⛔ A claim token (the
 * row has none): the compare is `status = 'due'`, so `false` means the claim took the row first and that attempt's own S6 decides. Final,
 * as W9 is (I10). The 0215 guard admits the edge (`due` moves only to `attempting` or `cancelled`).
 */
export async function cancelWaitingLeadHandoff(
  q: Queryable,
  ref: { readonly pariwarId: string; readonly leadId: string; readonly word: LeadHandoffCancelWord },
): Promise<boolean> {
  const detail = `cancelled:${ref.word}`;
  assertDetail(detail, 'cancelled:');
  const { rowCount } = await q.query(
    `UPDATE marketplace_lead_handoffs
        SET status = 'cancelled', outcome_detail = $3, member_fields_ciphertext = NULL, held_since = NULL, updated_at = clock_timestamp()
      WHERE pariwar_id = $1 AND lead_id = $2 AND status = 'due'`,
    [ref.pariwarId.toLowerCase(), ref.leadId.toLowerCase(), detail],
  );
  return (rowCount ?? 0) > 0;
}

// ── S2 — the lapse (W10) and the purge (W12) ─────────────────────────────────────────────────────────

/** One row a lapse moved — enough to alarm by id. */
export interface LapsedLeadHandoff {
  readonly leadId: string;
  readonly pariwarId: string;
  readonly moduleId: string;
  readonly status: 'due' | 'failed_delivery';
}

/**
 * ⭐ W10 — every `attempting` row whose lease began `leaseMs` ago or more: back to `due` (`lapsed:lease_expired`, the attempt KEPT
 * counted — the request may have been sent — `next_attempt_at = clock + retryScheduleMs[attempt_count − 1]`), or on the last attempt
 * `failed_delivery:outcome_unknown`. Clears the token and `held_since` (a new run of holds starts a new clock). Judged on `claimed_at`.
 *
 * DELIBERATE (checklist family 9): one statement over EVERY Pariwar's rows on the sweep's pool (bypasses RLS) — a lease is a platform-wide
 * clock, ⛔ any tenant's act, and it returns ids only. The caller checks `canReadAcrossPariwars` first, as for the claim. Re-examine under
 * the same triggers.
 */
export async function lapseLeadHandoffs(
  q: Queryable,
  opts: { readonly leaseMs?: number; readonly maxAttempts?: number; readonly retryScheduleMs?: readonly number[] } = {},
): Promise<LapsedLeadHandoff[]> {
  const schedule = opts.retryScheduleMs ?? LEAD_HANDOFF_RETRY_SCHEDULE_MS;
  if (schedule.length === 0) throw new RangeError('lapseLeadHandoffs: an empty retry schedule');
  const { rows } = await q.query<{ lead_id: string; pariwar_id: string; module_id: string; status: 'due' | 'failed_delivery' }>(
    `UPDATE marketplace_lead_handoffs
        SET status = CASE WHEN attempt_count >= $2 THEN 'failed_delivery' ELSE 'due' END,
            outcome_detail = CASE WHEN attempt_count >= $2 THEN 'failed_delivery:outcome_unknown' ELSE 'lapsed:lease_expired' END,
            next_attempt_at = CASE WHEN attempt_count >= $2 THEN next_attempt_at
                                   ELSE clock_timestamp() + ($3::bigint[])[LEAST(GREATEST(attempt_count, 1), cardinality($3::bigint[]))] * interval '1 millisecond' END,
            held_since = NULL,
            claim_token = NULL, claimed_at = NULL, updated_at = clock_timestamp()
      WHERE status = 'attempting' AND claimed_at <= clock_timestamp() - $1::bigint * interval '1 millisecond'
      RETURNING lead_id, pariwar_id, module_id, status`,
    [opts.leaseMs ?? LEAD_HANDOFF_LEASE_MS, opts.maxAttempts ?? LEAD_HANDOFF_MAX_ATTEMPTS, [...schedule]],
  );
  return rows.map((r) => ({ leadId: r.lead_id, pariwarId: r.pariwar_id, moduleId: r.module_id, status: r.status }));
}

/**
 * ⭐ W12 (QE24 (A), RULED `-484` Q4 A) — drop the fields of up to `limit` `delivered` / `failed_delivery` rows that have been final for
 * `retentionDays` or more (judged by `updated_at`, so a requeued row that fails again starts its 30 days from that LATER failure — "finally
 * fails"; ⛔ "fix" it to the first). Status, detail AND `updated_at` unchanged: on a final row `updated_at` is the time it became final —
 * the only failure time the row has, and what {@link listFailedLeadHandoffs} sorts on and returns (code review 2026-11-22, patch 10; the
 * guard never needed the bump). Returns how many rows it purged.
 *
 * DELIBERATE (checklist family 9): every Pariwar's rows in one statement on the sweep's pool (bypasses RLS) — retention is a platform-wide
 * clock and the statement returns a count only. Re-examine under the claim's triggers.
 */
export async function purgeLeadHandoffFields(
  q: Queryable,
  opts: { readonly retentionDays?: number; readonly limit?: number } = {},
): Promise<number> {
  const { rowCount } = await q.query(
    `WITH old AS MATERIALIZED (
       SELECT lead_id FROM marketplace_lead_handoffs
        WHERE member_fields_ciphertext IS NOT NULL AND status IN ('delivered', 'failed_delivery')
          AND updated_at <= clock_timestamp() - $1::double precision * interval '1 day'
        ORDER BY updated_at, lead_id
        FOR UPDATE SKIP LOCKED
        LIMIT $2
     )
     UPDATE marketplace_lead_handoffs s SET member_fields_ciphertext = NULL
       FROM old WHERE s.lead_id = old.lead_id`,
    [opts.retentionDays ?? LEAD_FIELDS_RETENTION_DAYS, clampLimit(opts.limit, { default: LEAD_HANDOFF_PURGE_BATCH, cap: 1000 })],
  );
  return rowCount ?? 0;
}

// ── W13 — the staff requeue (QE21 (C)) ──────────────────────────────────────────────────────────────

/**
 * ⭐ W13 — `failed_delivery → due` (`requeued:manual`, `attempt_count 0`, `next_attempt_at = clock`, `held_since` NULL), as `twt_app`
 * under the Pariwar's scope. Refused when the fields are gone (`LeadHandoffFieldsGoneError` — cancelled, erased, or past the 30 days) or
 * the row is not a failed one of this Pariwar (`LeadHandoffNotRequeueableError`). Every predicate runs again at the next attempt.
 * A STAFF remedy, ⛔ something a member can ask for. NO production caller (K-3's admin view, which pairs its own audit line — I1).
 */
export async function requeueLeadHandoff(
  client: Pick<pg.PoolClient, 'query'>,
  input: { readonly pariwarId: string; readonly leadId: string },
): Promise<void> {
  const P = input.pariwarId.toLowerCase();
  const leadId = input.leadId.toLowerCase();
  const { rowCount } = await client.query(
    `UPDATE marketplace_lead_handoffs
        SET status = 'due', outcome_detail = 'requeued:manual', attempt_count = 0, next_attempt_at = clock_timestamp(),
            held_since = NULL, updated_at = clock_timestamp()
      WHERE pariwar_id = $1 AND lead_id = $2 AND status = 'failed_delivery' AND member_fields_ciphertext IS NOT NULL`,
    [P, leadId],
  );
  if ((rowCount ?? 0) > 0) return;
  const { rows } = await client.query<{ status: LeadHandoffStatus; gone: boolean }>(
    `SELECT status, member_fields_ciphertext IS NULL AS gone FROM marketplace_lead_handoffs WHERE pariwar_id = $1 AND lead_id = $2`,
    [P, leadId],
  );
  const r = rows[0];
  if (r !== undefined && r.status === 'failed_delivery' && r.gone) throw new LeadHandoffFieldsGoneError(leadId);
  throw new LeadHandoffNotRequeueableError(leadId);
}

// ── The reads ────────────────────────────────────────────────────────────────────────────────────────

/**
 * The member-facing status (architecture §3.7, derived for 12.3, ⛔ stored): `due` / `attempting` → `pending_retry`; `delivered`;
 * `failed_delivery`; `cancelled` → `cancelled`, which is ⛔ a DELIVERY status — 12.3 decides its words (K-1).
 */
export type LeadHandoffMemberStatus = 'pending_retry' | 'delivered' | 'failed_delivery' | 'cancelled';

const MEMBER_STATUS_OF = {
  due: 'pending_retry',
  attempting: 'pending_retry',
  delivered: 'delivered',
  failed_delivery: 'failed_delivery',
  cancelled: 'cancelled',
} as const satisfies Record<LeadHandoffStatus, LeadHandoffMemberStatus>;

/** PURE and TOTAL over the statuses (`satisfies`: a new status does not compile). */
export function deriveLeadHandoffMemberStatus(status: LeadHandoffStatus): LeadHandoffMemberStatus {
  return MEMBER_STATUS_OF[status];
}

/**
 * 12.3's status read — the derived word, or null (no handoff for this lead OF THIS MEMBER in this Pariwar). Keyed `(pariwar_id, lead_id)`
 * with ⛔ cast (TR18) AND `member_id`: a member-facing read never answers for another member's lead (checklist family 12 (b); code review
 * 2026-11-22, patch 5) — a wrong member reads as null, the same as no handoff. ⛔ `partner_reference`, ⛔ the detail (QE15 (b)).
 */
export async function getLeadHandoffStatus(
  q: Queryable,
  input: { readonly pariwarId: string; readonly memberId: string; readonly leadId: string },
): Promise<LeadHandoffMemberStatus | null> {
  const { rows } = await q.query<{ status: LeadHandoffStatus }>(
    'SELECT status FROM marketplace_lead_handoffs WHERE pariwar_id = $1 AND lead_id = $2 AND member_id = $3',
    [input.pariwarId.toLowerCase(), input.leadId.toLowerCase(), input.memberId.toLowerCase()],
  );
  const r = rows[0];
  return r === undefined ? null : deriveLeadHandoffMemberStatus(r.status);
}

/** One failed handoff, for the partner-relationship view (K-3). Ids, the closed detail and the advisory reference — ⛔ a member field. */
export interface FailedLeadHandoff {
  readonly leadId: string;
  readonly moduleId: string;
  readonly memberId: string;
  readonly outcomeDetail: string;
  readonly attemptCount: number;
  readonly updatedAt: Date;
  /** ADVISORY (I3). */
  readonly partnerReference: string | null;
  /** Whether a requeue is still possible (the fields are kept for 30 days — QE24). */
  readonly requeueable: boolean;
}

/** The admin read (K-3's future caller): the Pariwar's `failed_delivery` rows, newest first, capped. */
export async function listFailedLeadHandoffs(
  q: Queryable,
  pariwarId: string,
  opts: { readonly limit?: number } = {},
): Promise<FailedLeadHandoff[]> {
  const { rows } = await q.query<{
    lead_id: string;
    module_id: string;
    member_id: string;
    outcome_detail: string;
    attempt_count: number;
    updated_at: Date;
    partner_reference: string | null;
    requeueable: boolean;
  }>(
    `SELECT lead_id, module_id, member_id, outcome_detail, attempt_count, updated_at, partner_reference,
            member_fields_ciphertext IS NOT NULL AS requeueable
       FROM marketplace_lead_handoffs
      WHERE pariwar_id = $1 AND status = 'failed_delivery'
      ORDER BY updated_at DESC, lead_id
      LIMIT $2`,
    [pariwarId.toLowerCase(), clampLimit(opts.limit, { default: 50, cap: 200 })],
  );
  return rows.map((r) => ({
    leadId: r.lead_id,
    moduleId: r.module_id,
    memberId: r.member_id,
    outcomeDetail: r.outcome_detail,
    attemptCount: r.attempt_count,
    updatedAt: r.updated_at,
    partnerReference: r.partner_reference,
    requeueable: r.requeueable,
  }));
}
