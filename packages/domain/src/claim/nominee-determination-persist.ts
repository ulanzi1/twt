// The District Admin's NOMINEE DETERMINATION writer (Story 6.20, Task 3; D4, D6, D15, D17; AC4).
// Transport-free.
//
// `2026-09-20-235` Y: *"District admin decides changed after death against death certificate date …
// A change done before a day of death will be assumed to be done by member, everything else will be
// discarded."* The District Admin enters the CERTIFICATE DATE and marks EVERY version `stands` or
// `discarded`, with a REQUIRED note. This writer then VALIDATES — it ⛔ never decides:
//   · every current version carries exactly one mark, and no mark names an unknown version (D5);
//   · each mark agrees with D6 (`versionStandsAt`): a `stands` version is dated before the IST start of
//     the certificate day, a `discarded` one is not. ⭐ A GUARD, ⛔ never a default: an inconsistent set
//     is REFUSED whole, ⛔ never corrected (invariant 1);
//   · the WATERMARK — each rank's highest `version_no` when the District Admin read the timeline — is
//     still current, so a correction that landed meanwhile is a 409, ⛔ never silently judged (D17);
//   · the resulting standing rank set is `{1}`, `{1,2}` or EMPTY. ⚠ Empty is RECORDABLE — "nobody the
//     member chose before the death" is a real human finding — but the effective accessor fails it
//     closed, so it can ⛔ never approve (D5). A lone `{2}` is refused: exactly ONE definition of a valid
//     declaration (D17(c) — only a disqualification FINDING may re-rank, ⛔ never a mark).
// Then it SUPERSEDES the live determination with the conditional `UPDATE … WHERE determination_id AND
// superseded_at IS NULL` (0 rows ⇒ 409), inserts the new row + items, and emits the
// `claim.nominee_determination_recorded` identity annotation — ALL in one transaction.
//
// ⭐ BE HONEST ABOUT WHAT THE DISTRICT ADMIN DECIDES (invariant 1): once the date is entered, every mark
// is mechanically determined by D6 — the writer refuses any other. What the District Admin genuinely
// decides is the CERTIFICATE'S DATE (and, through Story 6-21, whether the certificate is admissible).
// ⚠ Until 6-21 lands the entered date is TAKEN ON TRUST (D4) — a named go-live coupling.
//
// ⛔ A NEW TABLE, ⛔ not `claim_verifier_decisions` (T6): a row there would disqualify the District Admin
// from reviewing an appeal of this claim.
// ⛔ PII: the certificate date and the note arrive ALREADY ENCRYPTED (the handler encrypts under the
// Pariwar context); the plaintext date is used for validation only and ⛔ never persisted, logged or
// put in the event.

import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import type pg from 'pg';

import { bindScopedDb, type Db } from '../db.js';
import type { ClaimId, NomineeDeterminationId, NomineeVersionId, PariwarId } from '../ids/index.js';
import {
  getMemberNomineeProjectionRanks,
  listNomineeDeclarationVersions,
} from '../nominee/declaration-history.js';
import { claims } from '../schema/claims.js';
import {
  type NomineeDeterminationMark,
  nomineeDeterminationItems,
  nomineeDeterminations,
} from '../schema/nominee_determinations.js';
import { NomineeDeterminationRefusedError } from './errors.js';
import type { ClaimEventActor } from './events.js';
import { NOMINEE_NAME_CHECK_RECORDABLE_STATES } from './nominee-name-check.js';
import { getEffectiveNomineeDeclaration, versionStandsAt, type EffectiveNomineeDeclarationStatus } from './nominee-effective.js';
import { projectClaimState } from './project.js';

const CALENDAR_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** A real `YYYY-MM-DD` calendar date (⛔ `2026-02-30` rolls over in `Date.parse`, so round-trip it). */
export function isRealCalendarDate(value: string): boolean {
  if (!CALENDAR_DATE_RE.test(value)) return false;
  const ms = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === value;
}

/**
 * The states in which a determination may be recorded — ⭐ the SAME window as the 6.18 name check
 * (`NOMINEE_NAME_CHECK_RECORDABLE_STATES`, reused, ⛔ never copied). The determination feeds the name
 * check's token, so a determination is only useful where a fresh check can still follow it; and the
 * window already spans every state an approval gate can run in.
 */
export const NOMINEE_DETERMINATION_RECORDABLE_STATES = NOMINEE_NAME_CHECK_RECORDABLE_STATES;

export interface RecordNomineeDeterminationInput {
  readonly claimCaseId: ClaimId;
  readonly pariwarId: PariwarId;
  /** The PLAINTEXT certificate date (`YYYY-MM-DD`) — validation only; ⛔ never persisted as plaintext. */
  readonly certificateDate: string;
  /** The same date, Tier-1-encrypted by the handler. */
  readonly certificateDateCiphertext: string;
  /** The REQUIRED note, Tier-1-encrypted by the handler (the handler refuses an empty note first). */
  readonly noteCiphertext: string;
  /** One mark per version — EVERY version of the deceased's declaration. */
  readonly marks: readonly { readonly versionId: string; readonly mark: NomineeDeterminationMark }[];
  /** Each rank's highest `version_no` when the timeline was read (`null` for a rank with none). */
  readonly watermark: { readonly rank1: number | null; readonly rank2: number | null };
  /** The live determination the District Admin saw (`null` when there was none) — the supersession guard. */
  readonly expectedLiveDeterminationId: string | null;
  readonly actorId: string;
  /** Snapshotted server-side by the caller — ⛔ never email-derived, ⛔ never from the request. */
  readonly actorDisplay: string;
  readonly actor: ClaimEventActor;
  readonly auditId?: string;
}

export interface RecordNomineeDeterminationResult {
  readonly determinationId: NomineeDeterminationId;
  readonly supersededDeterminationId: NomineeDeterminationId | null;
  readonly standsCount: number;
  readonly discardedCount: number;
  readonly eventVersion: number;
  /** The claim's effective-declaration status AFTER this write, read in the SAME transaction (code review
   *  2026-09-24b): read after the commit, a failed read answered 500 for a committed determination, and a
   *  write landing in between could report a status that was not this determination's. */
  readonly declarationStatus: EffectiveNomineeDeclarationStatus;
}

/**
 * The most versions one determination can judge (BigDev 2026-09-24, option (a)). Every version must carry
 * a mark, and the history is unbounded, so the old 64-mark wire cap made a long history PERMANENTLY
 * undeterminable (⇒ never approvable). 1000 is far beyond any realistic history; past it the writer refuses
 * with a typed 409 instead of an unreachable `missing_item`. ⚠ LOCKSTEP with the contract's `marks.max`
 * (`packages/contracts/src/claims/nominee-declaration.ts`, `NOMINEE_DETERMINATION_MAX_MARKS`).
 */
export const NOMINEE_DETERMINATION_MAX_VERSIONS = 1000;

/**
 * Record the District Admin's determination. See the header for every guard.
 *
 * @throws NomineeDeterminationRefusedError  (→ 409; `not_found` → 404)
 */
export async function recordNomineeDetermination(
  client: pg.PoolClient,
  input: RecordNomineeDeterminationInput,
): Promise<RecordNomineeDeterminationResult> {
  const refuse = (reason: ConstructorParameters<typeof NomineeDeterminationRefusedError>[1], detail: string) =>
    new NomineeDeterminationRefusedError(input.claimCaseId, reason, detail);

  if (input.actorDisplay.trim() === '') {
    throw refuse('missing_display', 'a determination is attributed to a named District Admin or not recorded');
  }
  // Plaintext non-emptiness is the contract's `z.string().min(1)` at the HTTP boundary — this only
  // catches a caller that forgot to encrypt at all (ciphertext is never `''`).
  if (input.noteCiphertext.trim() === '') throw refuse('missing_note', 'a note is required');
  if (!isRealCalendarDate(input.certificateDate)) {
    throw refuse('invalid_certificate_date', 'the certificate date must be a real YYYY-MM-DD date');
  }

  const db = bindScopedDb(client);
  // Ids are lower-cased: the contract's `z.string().uuid()` is unbranded, and stored ids are lower-case.
  const marks = input.marks.map((m) => ({ versionId: m.versionId.toLowerCase(), mark: m.mark }));
  const expectedLiveId = input.expectedLiveDeterminationId?.toLowerCase() ?? null;

  // (1) The claim row lock — serializes this with every other claim write, the correction included.
  const [claimRow] = await db
    .select()
    .from(claims)
    .where(and(eq(claims.pariwarId, input.pariwarId), eq(claims.claimCaseId, input.claimCaseId)))
    .for('update');
  if (!claimRow) throw refuse('not_found', 'no such claim in this Pariwar');
  const state = claimRow.currentState as string;
  if (!(NOMINEE_DETERMINATION_RECORDABLE_STATES as readonly string[]).includes(state)) {
    throw refuse('not_recordable', `a determination cannot be recorded while the claim is '${state}'`);
  }

  // (2) The versions — and D1's fail-closed: a projection rank with ⛔ no version.
  const versions = await listNomineeDeclarationVersions(db, input.pariwarId, claimRow.deceasedMemberId);
  const projectionRanks = await getMemberNomineeProjectionRanks(db, input.pariwarId, claimRow.deceasedMemberId);
  if (projectionRanks.some((rank) => !versions.some((v) => v.rank === rank))) {
    throw refuse('unversioned', 'a current nominee row has no version — the declaration is fail-closed (⛔ no backfill)');
  }
  if (versions.length > NOMINEE_DETERMINATION_MAX_VERSIONS) {
    throw refuse(
      'too_many_versions',
      `the declaration has ${versions.length} versions — more than the ${NOMINEE_DETERMINATION_MAX_VERSIONS} one determination can judge`,
    );
  }

  // (3) The watermark (D17): each rank's head must be what the District Admin read.
  const headOf = (rank: 1 | 2) =>
    versions.filter((v) => v.rank === rank).reduce<number | null>((m, v) => Math.max(m ?? 0, v.versionNo), null);
  if (headOf(1) !== input.watermark.rank1 || headOf(2) !== input.watermark.rank2) {
    throw refuse('stale_watermark', 'the declaration changed after the timeline was read — read it again');
  }

  // (4) Exactly one mark per version.
  const byId = new Map(versions.map((v) => [v.versionId as string, v]));
  const seen = new Set<string>();
  for (const m of marks) {
    if (!byId.has(m.versionId)) throw refuse('unknown_version', `version ${m.versionId} is not part of this declaration`);
    if (seen.has(m.versionId)) throw refuse('duplicate_mark', `version ${m.versionId} is marked twice`);
    seen.add(m.versionId);
  }
  const unmarked = versions.filter((v) => !seen.has(v.versionId));
  if (unmarked.length > 0) {
    throw refuse('missing_item', `${unmarked.length} version(s) carry no mark — every version must be judged`);
  }

  // (5) D6 — the marks must agree with the certificate date. A guard, ⛔ never a default.
  for (const m of marks) {
    const v = byId.get(m.versionId)!;
    const stands = versionStandsAt(v.effectiveAt, input.certificateDate);
    if ((m.mark === 'stands') !== stands) {
      throw refuse(
        'inconsistent_mark',
        `rank ${v.rank} version ${v.versionNo} is marked '${m.mark}' but is dated ${stands ? 'before' : 'on or after'} the certificate day`,
      );
    }
  }

  // (6) D17 — the standing rank set is {1}, {1,2} or empty. ⛔ Never a lone {2}.
  const standingRanks = ([1, 2] as const).filter((rank) => {
    const standing = marks
      .filter((m) => m.mark === 'stands')
      .map((m) => byId.get(m.versionId)!)
      .filter((v) => v.rank === rank)
      .sort((a, b) => b.versionNo - a.versionNo)[0];
    return standing !== undefined && standing.kind === 'declared';
  });
  if (standingRanks.length === 1 && standingRanks[0] === 2) {
    throw refuse('incoherent_rank_set', 'only rank 2 would stand — a declaration is {1} or {1,2}');
  }

  // (7) Supersede the live determination — conditionally, against the one the District Admin saw.
  const [live] = await db
    .select({ determinationId: nomineeDeterminations.determinationId })
    .from(nomineeDeterminations)
    .where(
      and(
        eq(nomineeDeterminations.pariwarId, input.pariwarId),
        eq(nomineeDeterminations.claimCaseId, input.claimCaseId),
        isNull(nomineeDeterminations.supersededAt),
      ),
    );
  const liveId = (live?.determinationId as string | undefined) ?? null;
  if (liveId !== expectedLiveId) {
    throw refuse('stale_supersession', 'the live determination changed after the timeline was read');
  }
  if (liveId !== null) {
    const superseded = await db
      .update(nomineeDeterminations)
      .set({ supersededAt: sql`now()`, supersededReason: 'redetermined' })
      .where(
        and(
          eq(nomineeDeterminations.determinationId, liveId as NomineeDeterminationId),
          isNull(nomineeDeterminations.supersededAt),
        ),
      )
      .returning({ id: nomineeDeterminations.determinationId });
    if (superseded.length === 0) throw refuse('stale_supersession', 'the live determination was superseded concurrently');
  }

  // (8) The row + its items + the identity annotation — one transaction.
  const [row] = await db
    .insert(nomineeDeterminations)
    .values({
      claimCaseId: input.claimCaseId,
      pariwarId: input.pariwarId,
      deceasedMemberId: claimRow.deceasedMemberId,
      certificateDateCiphertext: input.certificateDateCiphertext,
      noteCiphertext: input.noteCiphertext,
      watermarkRank1VersionNo: input.watermark.rank1,
      watermarkRank2VersionNo: input.watermark.rank2,
      decidedByActorId: input.actorId,
      decidedByDisplay: input.actorDisplay,
      supersedesDeterminationId: liveId as NomineeDeterminationId | null,
    })
    .returning({ determinationId: nomineeDeterminations.determinationId });
  const determinationId = row!.determinationId;
  if (marks.length > 0) {
    await db.insert(nomineeDeterminationItems).values(
      marks.map((m) => ({
        determinationId,
        versionId: m.versionId as NomineeVersionId,
        pariwarId: input.pariwarId,
        mark: m.mark,
      })),
    );
  }

  const standsCount = marks.filter((m) => m.mark === 'stands').length;
  const discardedCount = marks.length - standsCount;
  const projected = await projectClaimState(client, {
    claimCaseId: input.claimCaseId,
    pariwarId: input.pariwarId,
    deceasedMemberId: claimRow.deceasedMemberId,
    intakeChannels: claimRow.intakeChannels,
    claimantActorId: claimRow.claimantActorId,
    eventType: 'claim.nominee_determination_recorded',
    payload: {
      from_state: state,
      to_state: state,
      trigger: 'district_admin_nominee_determination',
      actor: input.actor,
      determination_id: determinationId,
      supersedes_determination_id: liveId,
      stands_count: standsCount,
      discarded_count: discardedCount,
    },
    actorId: input.actorId,
    ...(input.auditId !== undefined ? { auditId: input.auditId } : {}),
  });

  const { status: declarationStatus } = await getEffectiveNomineeDeclaration(db, input.pariwarId, input.claimCaseId);
  return {
    determinationId,
    supersededDeterminationId: liveId as NomineeDeterminationId | null,
    standsCount,
    discardedCount,
    eventVersion: projected.eventVersion,
    declarationStatus,
  };
}

/** The LIVE determination of a claim with its marks, or `null`. Ciphertext AS STORED (the handler decrypts). */
export async function getLiveNomineeDetermination(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
) {
  const [row] = await db
    .select()
    .from(nomineeDeterminations)
    .where(
      and(
        eq(nomineeDeterminations.pariwarId, pariwarId),
        eq(nomineeDeterminations.claimCaseId, claimCaseId),
        isNull(nomineeDeterminations.supersededAt),
      ),
    );
  if (!row) return null;
  const items = await db
    .select({ versionId: nomineeDeterminationItems.versionId, mark: nomineeDeterminationItems.mark })
    .from(nomineeDeterminationItems)
    .where(
      and(
        eq(nomineeDeterminationItems.pariwarId, pariwarId),
        eq(nomineeDeterminationItems.determinationId, row.determinationId),
      ),
    );
  return { row, items };
}

/** One EARLIER claim's live determination, for D17's read-only display on a later claim. */
export interface EarlierClaimNomineeDetermination {
  readonly claimCaseId: ClaimId;
  readonly claimState: string;
  readonly determinationId: NomineeDeterminationId;
  readonly decidedAt: Date;
  readonly decidedByDisplay: string;
  readonly items: readonly { versionId: NomineeVersionId; mark: 'stands' | 'discarded' }[];
}

/**
 * D17 — with two claims for one death, each claim's determination is its OWN, and a later claim's form
 * pre-fills nothing but SHOWS the earlier claims' determinations READ-ONLY. This reads them: every OTHER
 * claim for the same deceased member created no later than this one, with its live determination (a claim
 * with none is omitted). Two statements, bounded (at most 20 earlier claims), RLS-scoped with the explicit
 * `pariwar_id` predicate. ⛔ No ciphertext: ids, marks, instants and the snapshotted display name only.
 */
export async function listEarlierClaimNomineeDeterminations(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<EarlierClaimNomineeDetermination[]> {
  const heads = await db.execute<{
    claim_case_id: string;
    current_state: string;
    determination_id: string;
    decided_at: string;
    decided_by_display: string;
  }>(sql`
    SELECT o.claim_case_id, o.current_state, d.determination_id, d.decided_at, d.decided_by_display
      FROM claims c
      JOIN claims o
        ON o.pariwar_id = c.pariwar_id
       AND o.deceased_member_id = c.deceased_member_id
       AND o.claim_case_id <> c.claim_case_id
       AND o.created_at <= c.created_at
      JOIN nominee_determinations d
        ON d.pariwar_id = o.pariwar_id
       AND d.claim_case_id = o.claim_case_id
       AND d.superseded_at IS NULL
     WHERE c.pariwar_id = ${pariwarId}
       AND c.claim_case_id = ${claimCaseId}
     ORDER BY o.created_at DESC, o.claim_case_id
     LIMIT 20
  `);
  const rows = heads.rows ?? [];
  if (rows.length === 0) return [];
  const items = await db
    .select({
      determinationId: nomineeDeterminationItems.determinationId,
      versionId: nomineeDeterminationItems.versionId,
      mark: nomineeDeterminationItems.mark,
    })
    .from(nomineeDeterminationItems)
    .where(
      and(
        eq(nomineeDeterminationItems.pariwarId, pariwarId),
        inArray(
          nomineeDeterminationItems.determinationId,
          rows.map((r) => r.determination_id as NomineeDeterminationId),
        ),
      ),
    );
  return rows.map((r) => ({
    claimCaseId: r.claim_case_id as ClaimId,
    claimState: r.current_state,
    determinationId: r.determination_id as NomineeDeterminationId,
    decidedAt: new Date(r.decided_at),
    decidedByDisplay: r.decided_by_display,
    items: items
      .filter((i) => i.determinationId === r.determination_id)
      .map((i) => ({ versionId: i.versionId, mark: i.mark as 'stands' | 'discarded' })),
  }));
}
