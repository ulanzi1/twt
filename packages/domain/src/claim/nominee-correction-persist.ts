// The GENUINE-MISTAKE CORRECTION of a locked nominee declaration — raise, District Admin step, Pariwar
// Admin step (Story 6.20, Task 5; D7; AC7). Transport-free.
//
// `2026-09-20-234` W: *"Allow geniune mistake … Only if we know the relation we can allow geniune
// mistake."* · `-236` Z: *"correction requires approval by both, first District Admin then Pariwar
// Admin."* · `-237` cl.2: *"if `other` is selected, we cannot really establish relationship and therefore
// no correction will be allowed."* · `-237` cl.3–4 (CC2/CC3): raised by the helpline operator or the
// family through the app — ⛔ never the District Admin alone — with a written note at EACH approval.
//
// ⚠⚠ NOT 6.18's "correction". That is a CLAIM returned for BANK-DETAIL correction (`-227` cl.10,
// `correction-queue-read.ts`). This is a NOMINEE-DECLARATION correction. Different subject, table and
// approval shape; the two ⛔ never merge.
//
// ── The rules, in the order they are checked ─────────────────────────────────────────────────────
// RAISE (`raiseNomineeCorrection`):
//   · the claim exists (a correction is ALWAYS tied to one claim — before any claim the change is free);
//   · ⭐ the claim is inside `NOMINEE_NAME_CHECK_RECORDABLE_STATES` (BigDev 2026-09-23, answering
//     `2026-09-23-242` consequence 2): outside it no fresh determination or name check can follow, so a
//     correction would lead nowhere. ⛔ The LOCK is not windowed — only the correction is;
//   · the target is the rank's CURRENTLY STANDING version under the live determination — a discarded or
//     superseded version is refused (and so is a raise with ⛔ no live determination at all);
//   · ⭐⭐ the target's relationship is KNOWN — `other` FORECLOSES the correction, refused HERE, before
//     either approval (`-237` cl.2; a REVERSAL of v0.1–v0.4's default). ⚠ The PROPOSED relationship may
//     not be `other` either — an ENGINEERING READING of cl.2's rationale ("we cannot establish
//     relationship"), ⛔ NOT a ratified extension of the Panel's ruling (which covers the TARGET only;
//     BigDev 2026-09-24). Re-examine it when the Panel takes up `-237`'s open in-law/grandparent item.
//     A DIFFERENCE between the two known relationships is SHOWN, ⛔ never blocked;
//   · ONE open correction per claim + rank (the partial unique index is the backstop).
// DISTRICT ADMIN (`decideNomineeCorrectionAsDistrictAdmin`): `da_pending` → `pa_pending` | `declined`.
//   ⭐ ⛔ never the person who RAISED it (CC2: "never the District Admin alone" — an actor holding both
//     the raise key and an approval key cannot raise and approve their own request).
// PARIWAR ADMIN (`decideNomineeCorrectionAsPariwarAdmin`): `pa_pending` → `applied` | `declined`;
//   ⭐ ⛔ never the same PERSON as the District Admin step (also a DB CHECK). An APPROVAL applies:
//     a new version, `source = 'correction'`, `effective_at` AND `split_pct` INHERITED from the target
//     (invariant 5, D17(b)); the `member_nominees` projection updated ONLY when the target was the rank's
//     HEAD (D16, amended — BigDev 2026-09-24b); `member.nominees_declared`
//     emitted with `source: 'correction'`; and ⭐ the live determination SUPERSEDED (`correction_applied`)
//     — so the AC5 409 fires again until the District Admin redetermines (a version with no item does ⛔
//     not stand). All in ONE transaction.
// Each step is a conditional `UPDATE … WHERE correction_id AND step = …` (0 rows ⇒ 409), under the
// claim row lock. An APPROVAL (either step) is refused outside the window too — a DECLINE never is.
//
// ⚠ T15 — A RESIDUAL RISK THIS CODE CANNOT REMOVE: a correction inherits the corrected version's
// position in time, so two approvals could back-date a DIFFERENT person into a pre-death slot. The only
// defence is the two human approvals, with the target's relationship shown beside the proposal. ⛔ The
// system compares no names (invariant 6).
//
// ⛔ PII: every name / mobile / address / note arrives ALREADY ENCRYPTED (the handler encrypts under the
// Pariwar context). Nothing here decrypts, compares or logs them.

import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';
import type pg from 'pg';

import { bindScopedDb, type Db } from '../db.js';
import { clampLimit } from '../pagination.js';
import type { ClaimId, MemberId, NomineeCorrectionId, NomineeVersionId, PariwarId } from '../ids/index.js';
import { getCurrentMemberState } from '../member/read.js';
import { projectMemberState } from '../member/project.js';
import {
  getMemberNomineeProjectionRanks,
  readDatabaseClock,
} from '../nominee/declaration-history.js';
import { applyCorrectionToProjection } from '../nominee/declaration-write.js';
import { isKnownNomineeRelationship } from '../nominee/relationship.js';
import { claims } from '../schema/claims.js';
import { memberNomineeVersions } from '../schema/member_nominee_versions.js';
import {
  type NomineeCorrectionChannel,
  type NomineeCorrectionRow,
  nomineeCorrections,
} from '../schema/nominee_corrections.js';
import { nomineeDeterminations } from '../schema/nominee_determinations.js';
import { NomineeCorrectionRefusedError } from './errors.js';
import { getEffectiveNomineeDeclaration } from './nominee-effective.js';
import { NOMINEE_NAME_CHECK_RECORDABLE_STATES } from './nominee-name-check.js';

/** The raise/approve window — the name check's (reused, ⛔ never copied; `-242` c.2). */
export const NOMINEE_CORRECTION_WINDOW_STATES = NOMINEE_NAME_CHECK_RECORDABLE_STATES;

type Reason = ConstructorParameters<typeof NomineeCorrectionRefusedError>[1];

function isUniqueViolation(err: unknown): boolean {
  const code = (err as { code?: string }).code ?? (err as { cause?: { code?: string } }).cause?.code;
  return code === '23505';
}

async function lockClaim(db: Db, pariwarId: PariwarId, claimCaseId: ClaimId) {
  const rows = await db
    .select()
    .from(claims)
    .where(and(eq(claims.pariwarId, pariwarId), eq(claims.claimCaseId, claimCaseId)))
    .for('update');
  return rows[0];
}

function inWindow(state: string): boolean {
  return (NOMINEE_CORRECTION_WINDOW_STATES as readonly string[]).includes(state);
}

/**
 * The rank's CURRENTLY STANDING version under the live determination — keyed by the rank it was
 * DECLARED at (⛔ never the effective rank after a disqualification re-rank). `null` when nothing stands
 * for that rank, or when ⛔ no determination is live.
 */
async function standingVersionOf(db: Db, pariwarId: PariwarId, claimCaseId: ClaimId, rank: 1 | 2) {
  const effective = await getEffectiveNomineeDeclaration(db, pariwarId, claimCaseId);
  if (effective.status !== 'effective') return null;
  const entry = effective.entries.find((e) => e.declaredRank === rank);
  if (!entry) return null;
  const [row] = await db
    .select()
    .from(memberNomineeVersions)
    .where(and(eq(memberNomineeVersions.pariwarId, pariwarId), eq(memberNomineeVersions.versionId, entry.versionId)));
  return row ?? null;
}

// ── RAISE ────────────────────────────────────────────────────────────────────────────────────────

export interface RaiseNomineeCorrectionInput {
  readonly claimCaseId: ClaimId;
  readonly pariwarId: PariwarId;
  readonly rank: 1 | 2;
  /** Optional: when given it must BE the rank's standing version. */
  readonly targetVersionId?: string;
  readonly proposedNameCiphertext: string;
  readonly proposedRelationship: string;
  readonly proposedMobileCiphertext: string;
  readonly proposedAddressCiphertext: string | null;
  readonly raiseNoteCiphertext: string;
  readonly raisedVia: NomineeCorrectionChannel;
  /** The helpline operator's admin id, or — in the app — the family member's session actor. */
  readonly raisedByActorId: string;
}

export async function raiseNomineeCorrection(
  client: pg.PoolClient,
  input: RaiseNomineeCorrectionInput,
): Promise<{ correctionId: NomineeCorrectionId; targetVersionId: NomineeVersionId }> {
  const refuse = (reason: Reason, detail: string) => new NomineeCorrectionRefusedError(input.claimCaseId, reason, detail);
  const db = bindScopedDb(client);

  const claimRow = await lockClaim(db, input.pariwarId, input.claimCaseId);
  if (!claimRow) throw refuse('claim_not_found', 'a correction is always tied to a claim');
  const state = claimRow.currentState as string;
  if (!inWindow(state)) {
    throw refuse('outside_state_window', `a correction cannot be raised while the claim is '${state}'`);
  }

  const target = await standingVersionOf(db, input.pariwarId, input.claimCaseId, input.rank);
  if (!target) {
    throw refuse(
      'no_standing_version',
      `rank ${input.rank} has no standing version — the District Admin determines the declaration first`,
    );
  }
  // Lower-cased: the contract's `z.string().uuid()` is unbranded, and the stored id is lower-case.
  if (input.targetVersionId !== undefined && input.targetVersionId.toLowerCase() !== target.versionId) {
    throw refuse('target_not_standing', 'only the rank\'s currently STANDING version can be corrected');
  }
  // ⭐⭐ `-237` cl.2 — refused HERE, before either approval.
  if (!isKnownNomineeRelationship(target.relationship)) {
    throw refuse('relationship_other', 'the nominee\'s relationship is `other` — no correction can be made (`-237` cl.2)');
  }
  // ⚠ ENGINEERING READING of `-237` cl.2, ⛔ NOT a ratified rule — see the header (BigDev 2026-09-24).
  if (!isKnownNomineeRelationship(input.proposedRelationship)) {
    throw refuse('relationship_other', 'a correction must name a known relationship (engineering reading of `-237` cl.2)');
  }
  if (input.raiseNoteCiphertext.trim() === '') throw refuse('missing_note', 'a note explaining the mistake is required');

  try {
    const [row] = await db
      .insert(nomineeCorrections)
      .values({
        claimCaseId: input.claimCaseId,
        pariwarId: input.pariwarId,
        memberId: claimRow.deceasedMemberId,
        rank: input.rank,
        targetVersionId: target.versionId,
        proposedNameCiphertext: input.proposedNameCiphertext,
        proposedRelationship: input.proposedRelationship,
        proposedMobileCiphertext: input.proposedMobileCiphertext,
        proposedAddressCiphertext: input.proposedAddressCiphertext,
        raisedVia: input.raisedVia,
        raisedByActorId: input.raisedByActorId,
        raiseNoteCiphertext: input.raiseNoteCiphertext,
        step: 'da_pending',
      })
      .returning({ correctionId: nomineeCorrections.correctionId });
    return { correctionId: row!.correctionId, targetVersionId: target.versionId };
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw refuse('open_correction_exists', `rank ${input.rank} already has a correction awaiting approval`);
    }
    throw err;
  }
}

// ── THE TWO STEPS ────────────────────────────────────────────────────────────────────────────────

export interface DecideNomineeCorrectionInput {
  readonly correctionId: NomineeCorrectionId;
  readonly claimCaseId: ClaimId;
  readonly pariwarId: PariwarId;
  readonly outcome: 'approve' | 'decline';
  /**
   * REQUIRED at each step (CC3), Tier-1-encrypted by the handler. Non-emptiness of the PLAINTEXT is
   * enforced by the contract at the HTTP boundary — the ciphertext-emptiness check below is only a
   * backstop against a caller that forgot to encrypt.
   */
  readonly noteCiphertext: string;
  readonly actorId: string;
  /** Snapshotted server-side — ⛔ never email-derived, ⛔ never from the request. */
  readonly actorDisplay: string;
}

async function loadForStep(db: Db, input: DecideNomineeCorrectionInput) {
  const refuse = (reason: Reason, detail: string) => new NomineeCorrectionRefusedError(input.correctionId, reason, detail);
  if (input.actorDisplay.trim() === '') throw refuse('missing_display', 'a step is attributed to a named human');
  // CC3 itself is enforced on the PLAINTEXT note by the contract's `z.string().min(1)` at the HTTP
  // boundary — this only catches a caller that forgot to encrypt at all (ciphertext is never `''`).
  if (input.noteCiphertext.trim() === '') throw refuse('missing_note', 'a note is required at each step (CC3)');
  const claimRow = await lockClaim(db, input.pariwarId, input.claimCaseId);
  if (!claimRow) throw refuse('claim_not_found', 'no such claim in this Pariwar');
  const [row] = await db
    .select()
    .from(nomineeCorrections)
    .where(
      and(
        eq(nomineeCorrections.pariwarId, input.pariwarId),
        eq(nomineeCorrections.claimCaseId, input.claimCaseId),
        eq(nomineeCorrections.correctionId, input.correctionId),
      ),
    );
  if (!row) throw refuse('not_found', 'no such correction on this claim');
  // CC2 — the raiser never decides their own request, at either step (a decline included: it would let
  // the raiser withdraw-and-refile around a colleague's pending review).
  if (row.raisedByActorId === input.actorId) {
    throw refuse('raiser_cannot_approve', 'the person who raised a correction cannot also decide it (CC2)');
  }
  if (input.outcome === 'approve' && !inWindow(claimRow.currentState as string)) {
    throw refuse('outside_state_window', `a correction cannot be approved while the claim is '${claimRow.currentState}'`);
  }
  return { claimRow, row, refuse };
}

/** STEP 1 — the District Admin approves (→ `pa_pending`) or declines (→ `declined`). */
export async function decideNomineeCorrectionAsDistrictAdmin(
  client: pg.PoolClient,
  input: DecideNomineeCorrectionInput,
): Promise<{ step: NomineeCorrectionRow['step'] }> {
  const db = bindScopedDb(client);
  const { refuse } = await loadForStep(db, input);
  const nextStep = input.outcome === 'approve' ? ('pa_pending' as const) : ('declined' as const);
  const updated = await db
    .update(nomineeCorrections)
    .set({
      step: nextStep,
      daActorId: input.actorId,
      daDisplay: input.actorDisplay,
      daNoteCiphertext: input.noteCiphertext,
      daDecidedAt: sql`now()`,
      declinedAtStep: input.outcome === 'decline' ? 'district_admin' : null,
    })
    .where(and(eq(nomineeCorrections.correctionId, input.correctionId), eq(nomineeCorrections.step, 'da_pending')))
    .returning({ step: nomineeCorrections.step });
  if (updated.length === 0) throw refuse('step_conflict', 'the correction is not awaiting the District Admin');
  return { step: updated[0]!.step };
}

/**
 * STEP 2 — the Pariwar Admin approves (and thereby APPLIES) or declines. ⛔ Never the District Admin's
 * own person. See the header for everything an approval writes.
 */
export async function decideNomineeCorrectionAsPariwarAdmin(
  client: pg.PoolClient,
  input: DecideNomineeCorrectionInput,
): Promise<{ step: NomineeCorrectionRow['step']; appliedVersionId: NomineeVersionId | null }> {
  const db = bindScopedDb(client);
  const { claimRow, row, refuse } = await loadForStep(db, input);
  if (row.step !== 'pa_pending') throw refuse('step_conflict', 'the correction is not awaiting the Pariwar Admin');
  if (row.daActorId === input.actorId) {
    throw refuse('same_approver', 'the two approvals must come from two DIFFERENT people (D7)');
  }

  if (input.outcome === 'decline') {
    const updated = await db
      .update(nomineeCorrections)
      .set({
        step: 'declined',
        paActorId: input.actorId,
        paDisplay: input.actorDisplay,
        paNoteCiphertext: input.noteCiphertext,
        paDecidedAt: sql`now()`,
        declinedAtStep: 'pariwar_admin',
      })
      .where(and(eq(nomineeCorrections.correctionId, input.correctionId), eq(nomineeCorrections.step, 'pa_pending')))
      .returning({ step: nomineeCorrections.step });
    if (updated.length === 0) throw refuse('step_conflict', 'the correction is not awaiting the Pariwar Admin');
    return { step: 'declined', appliedVersionId: null };
  }

  // ⭐ The target must STILL be the rank's standing version — a redetermination may have moved it.
  const rank = row.rank as 1 | 2;
  const standing = await standingVersionOf(db, input.pariwarId, input.claimCaseId, rank);
  if (!standing || standing.versionId !== row.targetVersionId) {
    throw refuse('target_not_standing', 'the corrected version no longer stands — the District Admin must redetermine first');
  }

  const memberId = claimRow.deceasedMemberId as MemberId;
  // (1) The next version number for this rank (the claim row lock serialises corrections on THIS claim;
  // the UNIQUE (member_id, rank, version_no) index is the backstop against another writer for the same
  // member — a second claim's correction, or a declare after an innocence release. Its 23505 is mapped
  // to a typed `version_conflict` below, ⛔ never a 500. ⚠ The D3 advisory lock cannot be taken here: it
  // must be a transaction's FIRST lock, and the claim row is already locked).
  const [head] = await db
    .select({ versionId: memberNomineeVersions.versionId, versionNo: memberNomineeVersions.versionNo })
    .from(memberNomineeVersions)
    .where(and(eq(memberNomineeVersions.memberId, memberId), eq(memberNomineeVersions.rank, rank)))
    .orderBy(desc(memberNomineeVersions.versionNo))
    .limit(1);
  const versionNo = (head?.versionNo ?? 0) + 1;
  const recordedAt = await readDatabaseClock(db);

  // (2) The projection — BEFORE the member-stream append, whose projector refreshes the admin search
  // projection's `nominee_summary` FROM `member_nominees` (code review 2026-09-24b: applied after it, the
  // summary kept the old relationship until the member's next event).
  // ⭐ The projection row is updated ONLY when it IS the corrected declaration — i.e. the target was this
  // rank's HEAD before the correction (BigDev 2026-09-24b, option (a); extends 2026-09-24 option (b)). When
  // the member declared again after the death, the rank's row holds THAT declaration (or, when vacated, no
  // row at all): overwriting it with the corrected pre-death person produced a row mixing two declarations
  // (one person, another declaration's split). The correction then lives in the version history and the
  // claim's effective set only, and `member_nominees` keeps the member's own last declaration (D16, amended).
  if (head?.versionId === standing.versionId) {
    await applyCorrectionToProjection(db, {
      memberId,
      pariwarId: input.pariwarId,
      rank,
      nameCiphertext: row.proposedNameCiphertext,
      relationship: row.proposedRelationship,
      mobileCiphertext: row.proposedMobileCiphertext,
      addressCiphertext: row.proposedAddressCiphertext,
    });
  }

  // (3) The member stream: `member.nominees_declared` with `source: 'correction'` (AC1). ⛔ No PII.
  // ⭐ The count / split describe the PROJECTION — and the apply NEVER adds a rank, so they are the
  // projection's own, unchanged. (In the vacated-rank case the listed version is a rank the projection does
  // not hold; the payload's count/split describe the projection, ⛔ not the versions listed.)
  const projectionRanks = await getMemberNomineeProjectionRanks(db, input.pariwarId, memberId);
  if (projectionRanks.length === 0) {
    // Unreachable: a declaration always carries at least one nominee. ⛔ Never fabricate a count.
    throw new Error(`[nominee-correction] member ${memberId} has no current nominee rows`);
  }
  const countAfter = projectionRanks.length as 1 | 2;
  const memberState = await getCurrentMemberState(db, memberId);
  const projected = await projectMemberState(client, {
    memberId,
    pariwarId: input.pariwarId,
    eventType: 'member.nominees_declared',
    payload: {
      from_state: memberState,
      to_state: memberState,
      trigger: 'nominee_correction_applied',
      // The Pariwar Admin's approval applies it — Trustee-Lite, the member stream's `trustee` actor.
      actor: 'trustee',
      nominee_count: countAfter,
      split: countAfter === 1 ? 'sole' : '75-25',
      source: 'correction',
      versions: [{ rank, version_no: versionNo, kind: 'declared' }],
    },
    actorId: input.actorId,
  });

  // The target is always a `declared`-kind standing version, so the DB CHECK already guarantees
  // `splitPct` is non-null here — the fallback exists only for the type.
  const splitPct = standing.splitPct ?? (rank === 1 ? 75 : 25);

  // (4) The correction VERSION — `effective_at` and `split_pct` INHERITED from the target.
  let applied: { versionId: NomineeVersionId } | undefined;
  try {
    [applied] = await db
    .insert(memberNomineeVersions)
    .values({
      memberId,
      pariwarId: input.pariwarId,
      rank,
      versionNo,
      declarationId: row.correctionId,
      kind: 'declared',
      source: 'correction',
      nameCiphertext: row.proposedNameCiphertext,
      relationship: row.proposedRelationship,
      mobileCiphertext: row.proposedMobileCiphertext,
      addressCiphertext: row.proposedAddressCiphertext,
      splitPct,
      recordedAt,
      effectiveAt: standing.effectiveAt,
      eventVersion: projected.eventVersion,
      correctsVersionId: standing.versionId,
    })
    .returning({ versionId: memberNomineeVersions.versionId });
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw refuse('version_conflict', 'another change to this nominee landed at the same moment — please try again');
    }
    throw err;
  }

  // (5) ⭐ The live determination is SUPERSEDED — the new version has no item, so it does ⛔ not stand
  // until the District Admin redetermines, and AC5's 409 fires again meanwhile.
  await db
    .update(nomineeDeterminations)
    .set({ supersededAt: sql`now()`, supersededReason: 'correction_applied' })
    .where(
      and(
        eq(nomineeDeterminations.pariwarId, input.pariwarId),
        eq(nomineeDeterminations.claimCaseId, input.claimCaseId),
        isNull(nomineeDeterminations.supersededAt),
      ),
    );

  // (6) The step itself — conditional on still being `pa_pending`.
  const updated = await db
    .update(nomineeCorrections)
    .set({
      step: 'applied',
      paActorId: input.actorId,
      paDisplay: input.actorDisplay,
      paNoteCiphertext: input.noteCiphertext,
      paDecidedAt: sql`now()`,
      appliedVersionId: applied!.versionId,
    })
    .where(and(eq(nomineeCorrections.correctionId, input.correctionId), eq(nomineeCorrections.step, 'pa_pending')))
    .returning({ step: nomineeCorrections.step });
  if (updated.length === 0) throw refuse('step_conflict', 'the correction is not awaiting the Pariwar Admin');
  return { step: 'applied', appliedVersionId: applied!.versionId };
}

/** Every correction on a claim, newest first — ciphertext AS STORED (the handler decrypts after authz). */
export async function listNomineeCorrections(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
  opts: { limit?: number } = {},
): Promise<NomineeCorrectionRow[]> {
  return db
    .select()
    .from(nomineeCorrections)
    .where(and(eq(nomineeCorrections.pariwarId, pariwarId), eq(nomineeCorrections.claimCaseId, claimCaseId)))
    .orderBy(desc(nomineeCorrections.raisedAt))
    .limit(clampLimit(opts.limit, { default: 50, cap: 200 }));
}

/**
 * How many corrections on ONE claim wait at each step — METADATA ONLY (code review 2026-09-24b). The
 * timeline carries it so a District Admin learns a request is waiting ⛔ without the decrypting reveal (D10).
 */
export async function countPendingNomineeCorrections(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<{ daPending: number; paPending: number }> {
  const rows = await db
    .select({ step: nomineeCorrections.step, n: sql<number>`count(*)::int` })
    .from(nomineeCorrections)
    .where(
      and(
        eq(nomineeCorrections.pariwarId, pariwarId),
        eq(nomineeCorrections.claimCaseId, claimCaseId),
        sql`${nomineeCorrections.step} IN ('da_pending', 'pa_pending')`,
      ),
    )
    .groupBy(nomineeCorrections.step);
  const of = (step: string) => rows.find((r) => r.step === step)?.n ?? 0;
  return { daPending: of('da_pending'), paPending: of('pa_pending') };
}

/**
 * The corrections waiting at ONE step, across the Pariwar, oldest first — the Pariwar Admin's queue
 * (they cannot open the verifier console, so without this they could never FIND a request awaiting
 * their approval). ⛔ No PII: ids, rank, channel and instants only. Bounded.
 */
export async function listPendingNomineeCorrections(
  db: Db,
  pariwarId: PariwarId,
  step: 'da_pending' | 'pa_pending',
  opts: { limit?: number } = {},
): Promise<Pick<NomineeCorrectionRow, 'correctionId' | 'claimCaseId' | 'rank' | 'step' | 'raisedVia' | 'raisedAt'>[]> {
  return db
    .select({
      correctionId: nomineeCorrections.correctionId,
      claimCaseId: nomineeCorrections.claimCaseId,
      rank: nomineeCorrections.rank,
      step: nomineeCorrections.step,
      raisedVia: nomineeCorrections.raisedVia,
      raisedAt: nomineeCorrections.raisedAt,
    })
    .from(nomineeCorrections)
    .where(and(eq(nomineeCorrections.pariwarId, pariwarId), eq(nomineeCorrections.step, step)))
    .orderBy(asc(nomineeCorrections.raisedAt))
    .limit(clampLimit(opts.limit, { default: 50, cap: 200 }));
}
