// Contribution attestation WRITE primitive — Story 8.4 (Task 1; AC3).
//
// `attestContributionUtr` appends the member's `contribution.utr-attested` claim (yellow) on the ALERT's
// `events_log` stream (stream_id = alert_id). It is IDEMPOTENT on the deterministic `tr`
// (`deriveContributionReference({ memberId, alertId })`, Story 7.7): a re-paste / retry for the same
// (member, alert) records ONE attestation — never a second yellow claim (the FR-17 one-valid-contribution-
// per-(member,alert) guarantee). This is the ONLY writer of `contribution.utr-attested`.
//
// ── Why NOT projectAlertState (the alert projector) ─────────────────────────────────────────────────
// `contribution.utr-attested` is a member CLAIM annotation — it is NOT an alert lifecycle transition and
// must NOT touch `alerts.current_state` (that column is the projector's exclusive, trigger-guarded cache).
// The alert reducer is TOTAL (unknown event types → identity, alert/state.ts), so a contribution event
// coexisting on the alert stream is safely ignored by any future `replayAlertState`. So this appends
// DIRECTLY to events_log (domain owns the table; the alert/member projectors do the same) — it just does
// not write the state cache.
//
// ── Idempotency + concurrency (AC3) ─────────────────────────────────────────────────────────────────
// TWO guards, both keyed on `tr`:
//   (1) A pre-read: if an attestation for this `tr` already exists on the stream → idempotent no-op (the
//       common re-paste case, no exception raised).
//   (2) The DB backstop: a PARTIAL UNIQUE index on `(payload->>'tr')` WHERE
//       event_type = 'contribution.utr-attested' (migration 0079). A concurrent same-(member,alert) race
//       that slips past the pre-read raises 23505 on THAT constraint → treated as idempotent (re-read).
// Separately, because MANY members append to the SAME alert stream, two DIFFERENT members can race for the
// same `(stream_id, event_version)` slot → 23505 on the events_log version index → a transient conflict the
// loop RETRIES (re-read head, bump version). Both 23505s are told apart by constraint name. Guarded with a
// raw SAVEPOINT (these run inside the caller's scope tx; `db.transaction()` would commit it early —
// [[project_domain_limit_clamp_and_savepoint_retry]]).

import { and, asc, desc, eq, ne, sql } from 'drizzle-orm';
import type pg from 'pg';

import { bindScopedDb } from '../db.js';
import type { AlertId, MemberId, PariwarId, PoolId } from '../ids/index.js';
import { eventsLog } from '../schema/events_log.js';
import { isPoolStreamVersionConflict } from '../pool/errors.js';
import { deriveContributionReference } from '../pool/contribution-reference.js';
import {
  ContributionUtrAttestedPayloadSchema,
  type ContributionUtrAttestedPayload,
} from './events.js';

/** The `contribution.utr-attested` event type — the single yellow WRITE event (green is Epic 9's). */
export const CONTRIBUTION_UTR_ATTESTED_EVENT_TYPE = 'contribution.utr-attested' as const;

/** The partial-unique-index name backing the per-`tr` idempotency guard (migration 0079). Keep IN SYNC. */
const CONTRIBUTION_TR_CONSTRAINT = 'contribution_utr_attested_tr_uq';

/** Bounded retry budget for the transient (stream_id, event_version) race across concurrent attesters. */
const MAX_VERSION_RETRIES = 8;

export interface AttestContributionUtrInput {
  readonly pariwarId: PariwarId;
  /** The alert stream the claim is appended on (stream_id = alert_id; 1:1 with the cycle). */
  readonly alertId: AlertId;
  readonly poolId: PoolId;
  readonly memberId: MemberId;
  /** The DETERMINISTIC `deriveContributionReference({ memberId, alertId })` — the idempotency key. */
  readonly tr: string;
  /** The RAW member-pasted UTR (persisted in full — Epic 9's primary match reads it; AC3). */
  readonly utr: string;
  /** events_log.actor_id — the attesting member's uuid (a member self-attests; never null/system). */
  readonly actorId: string;
}

export interface AttestContributionUtrResult {
  /** The `contribution.utr-attested` event id (the freshly appended one, or the pre-existing on the
   *  idempotent path). */
  readonly eventId: string;
  /** `true` when this call found an existing attestation for the `tr` and appended nothing (a re-paste). */
  readonly idempotent: boolean;
  /** `true` when a DIFFERENT (member, alert) — a different `tr` — already self-attested this EXACT raw
   *  `utr` within this Pariwar. A same-tenant anomaly SIGNAL only: never rejects the write, never
   *  reconciles (Epic 9's matcher owns real verification against a bank statement). The caller decides
   *  what to do with it (e.g. an audit-trail flag) — review finding, non-blocking by design. */
  readonly duplicateUtrAcrossMembers: boolean;
}

/** Randomized backoff (ms) before a version-conflict retry — spreads out racing attesters on a hot alert
 *  stream instead of a tight immediate-retry loop (review finding). */
function versionRetryBackoffMs(attempt: number): number {
  return 10 * (attempt + 1) + Math.floor(Math.random() * 20);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Walk an error's `.cause` chain for a 23505 unique-violation and return the violated constraint name. */
function uniqueViolationConstraint(err: unknown): string | null {
  let cur: unknown = err;
  while (cur !== null && cur !== undefined) {
    const candidate = cur as { code?: unknown; constraint?: unknown };
    if (candidate.code === '23505') {
      return typeof candidate.constraint === 'string' ? candidate.constraint : null;
    }
    cur = (cur as { cause?: unknown }).cause;
  }
  return null;
}

/**
 * Read the existing `contribution.utr-attested` event id for this `tr` on the alert stream, or null. The
 * `tr` is globally unique per (member, alert) (a version-pinned hash of both), so a single stream-scoped
 * lookup is exact. Ordered by version for determinism (there is at most one by the unique guard). Filters
 * on `pariwarId` too (the sibling `hasAttestedContribution`, read.ts, convention — explicit defense-in-
 * depth alongside RLS, review finding), even though `streamId = alertId` already scopes to one tenant.
 */
async function findExistingAttestation(
  db: ReturnType<typeof bindScopedDb>,
  pariwarId: PariwarId,
  alertId: AlertId,
  tr: string,
): Promise<string | null> {
  const rows = await db
    .select({ eventId: eventsLog.eventId })
    .from(eventsLog)
    .where(
      and(
        eq(eventsLog.pariwarId, pariwarId),
        eq(eventsLog.streamId, alertId),
        eq(eventsLog.eventType, CONTRIBUTION_UTR_ATTESTED_EVENT_TYPE),
        sql`${eventsLog.payload} ->> 'tr' = ${tr}`,
      ),
    )
    .orderBy(asc(eventsLog.eventVersion))
    .limit(1);
  return rows[0]?.eventId ?? null;
}

/**
 * Whether a DIFFERENT (member, alert) already self-attested this exact raw `utr` within this Pariwar — a
 * same-tenant anomaly SIGNAL (review finding, resolved as non-blocking): detectable from `events_log`
 * alone, recorded on the result for the caller to flag in its audit trail. Never rejects, never
 * reconciles — semantic/existence verification against a real bank statement stays Epic 9's matcher.
 * Scoped to `pariwarId` (not `streamId` — a duplicate can land on a different alert/cycle entirely), so
 * this scans this tenant's `contribution.utr-attested` rows; acceptable at today's scale, worth an index
 * on `(pariwar_id, event_type, (payload->>'utr'))` if it becomes hot.
 */
async function findDuplicateUtrAcrossMembers(
  db: ReturnType<typeof bindScopedDb>,
  pariwarId: PariwarId,
  utr: string,
  ownTr: string,
): Promise<boolean> {
  const rows = await db
    .select({ eventId: eventsLog.eventId })
    .from(eventsLog)
    .where(
      and(
        eq(eventsLog.pariwarId, pariwarId),
        eq(eventsLog.eventType, CONTRIBUTION_UTR_ATTESTED_EVENT_TYPE),
        sql`${eventsLog.payload} ->> 'utr' = ${utr}`,
        ne(sql`${eventsLog.payload} ->> 'tr'`, ownTr),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

/** Build the result, attaching the duplicate-UTR anomaly signal — the ONE place all return paths compute it. */
async function buildResult(
  db: ReturnType<typeof bindScopedDb>,
  pariwarId: PariwarId,
  utr: string,
  tr: string,
  eventId: string,
  idempotent: boolean,
): Promise<AttestContributionUtrResult> {
  const duplicateUtrAcrossMembers = await findDuplicateUtrAcrossMembers(db, pariwarId, utr, tr);
  return { eventId, idempotent, duplicateUtrAcrossMembers };
}

/**
 * Append the member's `contribution.utr-attested` claim on the alert stream, idempotently on `tr` (AC3).
 * MUST be called inside the caller's already-open, pariwar-scoped transaction (the scope-tx contract — the
 * projectAlertState precedent); this does NOT open or commit its own transaction.
 *
 * @throws ZodError on a malformed payload (bad UTR shape / missing attestation_only).
 * @throws Error    if the version-conflict retry budget is exhausted (a pathological hot alert stream).
 */
export async function attestContributionUtr(
  client: pg.PoolClient,
  input: AttestContributionUtrInput,
): Promise<AttestContributionUtrResult> {
  const db = bindScopedDb(client);

  // R4 self-verification (defense-in-depth, review finding): this is a public @twt/domain export — the
  // handler layer already recomputes + compares `tr` before calling in, but this primitive must not trust
  // that discipline blindly. Re-derive and assert here too, so any future/alternate caller can't persist a
  // claim keyed by an arbitrary `tr`.
  const expectedTr = deriveContributionReference({ memberId: input.memberId, alertId: input.alertId });
  if (input.tr !== expectedTr) {
    throw new Error(
      '[attestContributionUtr] tr does not match deriveContributionReference(memberId, alertId) — refusing to persist an unverified claim',
    );
  }

  // Validate + freeze the payload (defense-in-depth alongside the JSONB column + the contract layer).
  const payload: ContributionUtrAttestedPayload = ContributionUtrAttestedPayloadSchema.parse({
    actor: 'member',
    trigger: 'contribution.utr_attested',
    poolId: input.poolId,
    memberId: input.memberId,
    tr: input.tr,
    utr: input.utr,
    attestation_only: true,
  });

  // (1) Pre-read idempotency — the common re-paste path (no exception).
  const preExisting = await findExistingAttestation(db, input.pariwarId, input.alertId, input.tr);
  if (preExisting !== null) {
    return buildResult(db, input.pariwarId, input.utr, input.tr, preExisting, true);
  }

  // (2) Append with a bounded (stream_id, event_version) retry (concurrent attesters share the stream).
  for (let attempt = 0; attempt < MAX_VERSION_RETRIES; attempt += 1) {
    const head = await db
      .select({ v: eventsLog.eventVersion })
      .from(eventsLog)
      .where(eq(eventsLog.streamId, input.alertId))
      .orderBy(desc(eventsLog.eventVersion))
      .limit(1);
    const nextVersion = (head[0]?.v ?? 0) + 1;

    await db.execute(sql`SAVEPOINT attest_contribution_utr`);
    try {
      const rows = await db
        .insert(eventsLog)
        .values({
          streamId: input.alertId,
          eventType: CONTRIBUTION_UTR_ATTESTED_EVENT_TYPE,
          payload,
          eventVersion: nextVersion,
          actorId: input.actorId,
          pariwarId: input.pariwarId,
        })
        .returning({ eventId: eventsLog.eventId });
      await db.execute(sql`RELEASE SAVEPOINT attest_contribution_utr`);
      const eventId = rows[0]?.eventId;
      if (eventId === undefined) throw new Error('[attestContributionUtr] insert returned no row');
      return buildResult(db, input.pariwarId, input.utr, input.tr, eventId, false);
    } catch (err) {
      await db.execute(sql`ROLLBACK TO SAVEPOINT attest_contribution_utr`);
      // (2a) A concurrent same-(member,alert) race that slipped past the pre-read → the tr backstop
      //      fired: idempotent no-op (re-read the winner's row).
      if (uniqueViolationConstraint(err) === CONTRIBUTION_TR_CONSTRAINT) {
        const raced = await findExistingAttestation(db, input.pariwarId, input.alertId, input.tr);
        if (raced !== null) return buildResult(db, input.pariwarId, input.utr, input.tr, raced, true);
        // Vanishingly unlikely (the constraint proved a row exists) — fall through to a retry.
      } else if (isPoolStreamVersionConflict(err)) {
        // (2b) A different member took the version slot — brief randomized backoff (review finding: the
        //      pre-fix tight loop had no backoff), then re-read head + retry.
        await sleep(versionRetryBackoffMs(attempt));
        continue;
      } else {
        throw err;
      }
    }
  }
  throw new Error(
    `[attestContributionUtr] exhausted ${String(MAX_VERSION_RETRIES)} version-conflict retries on alert stream ${input.alertId}`,
  );
}
