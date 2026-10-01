// The CLOSURE LETTER — Story 6.19c (Task 3; AC6; `2026-10-01-274` 2, Trustee-ratified: a family reached only by post is
// sent a POSTED LETTER when their claim is closed, saying it was closed for no response and how to file again through
// the helpline or the District Admin — *"one more letter for the District Admin to post and record, as for the
// correction letters"*).
//
// ⭐ WHO (our reading, `-274`): each person the closure owed a letter — recorded ON the closures row at the closure
// (`closure_letter_person_keys`: reached, their current number known dead — `-273` §5's complement). ⭐ THE RECORD: a
// correction letter's — the posting date and a Tier-1 tracking number; within 14 days the delivery date and a screenshot
// (the 14-day overdue flag SHOWN, ⛔ nothing else). ⭐ ONE per person per closure — ⛔ no second letter (the UNIQUE is the
// backstop). ⭐ D31's own precondition: THAT person's address (a nominee's through the correction chain, the claimant's
// from the block — `readCorrectionLetterAddress`) and a LIVE agreement (D30). The claim stays closed whatever happens to
// the letter. Key (1) — the same act as a correction letter, ⛔ no new key (`-274` 2).
// ⛔ Transport-free: ⛔ no HTTP, ⛔ no audit, ⛔ no decryption.

import { and, asc, eq, sql } from 'drizzle-orm';
import type pg from 'pg';

import { bindScopedDb, type Db } from '../db.js';
import type { ClaimId, PariwarId } from '../ids/index.js';
import {
  type ClaimClosureLetterRow,
  type ClaimCorrectionClosureRow,
  claimClosureLetters,
} from '../schema/claim_correction_closure.js';
import { readClaimContact, readClaimContactAgreementState } from './claim-contact-check.js';
import { acquireCorrectionChaseLock } from './correction-chase.js';
import { readClosedClosureRow } from './correction-closure.js';
import { CorrectionLetterRefusedError, readCorrectionLetterAddress, type CorrectionLetterAddress } from './correction-letter.js';
import { istDateOf } from './correction-schedule.js';

/** The closure letter's refusals — the route maps `409 closure_letter.<code>` (`not_found` → 404). */
export type ClosureLetterRefusal =
  | 'no_closure'
  | 'not_owed'
  | 'address_missing'
  | 'agreement_not_live'
  | 'already_recorded'
  | 'posted_before_closure'
  | 'not_found'
  | 'already_delivered'
  | 'delivered_before_posted';

export class ClosureLetterRefusedError extends Error {
  public readonly name = 'ClosureLetterRefusedError';
  public constructor(
    public readonly claimCaseId: string,
    public readonly refusal: ClosureLetterRefusal,
  ) {
    super(`[closure-letter] claim ${claimCaseId}: ${refusal}`);
  }
}

/**
 * ⭐ THE CLOSURE LETTER'S PRECONDITION: the claim was CLOSED (`no_closure`), the closure OWED this person a letter
 * (`not_owed`), the agreement is LIVE (`agreement_not_live`, D30) and THAT person's address resolves (`address_missing`,
 * D31). Returns the closure row and the address (the form's gated read uses the same answer).
 */
export async function assertClosureLetterAllowed(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
  personKey: string,
): Promise<{ readonly closure: ClaimCorrectionClosureRow; readonly address: CorrectionLetterAddress }> {
  const closure = await readClosedClosureRow(db, pariwarId, claimCaseId);
  if (closure === null) throw new ClosureLetterRefusedError(claimCaseId, 'no_closure');
  if (!closure.closureLetterPersonKeys.includes(personKey)) throw new ClosureLetterRefusedError(claimCaseId, 'not_owed');
  const snapshot = await readClaimContact(db, pariwarId, claimCaseId);
  if (snapshot.contact === null) throw new ClosureLetterRefusedError(claimCaseId, 'address_missing');
  if ((await readClaimContactAgreementState(db, pariwarId, snapshot.contact.agreementConsentId)) !== 'live') {
    throw new ClosureLetterRefusedError(claimCaseId, 'agreement_not_live');
  }
  try {
    const address = await readCorrectionLetterAddress(db, pariwarId, claimCaseId, personKey);
    return { closure, address };
  } catch (err) {
    if (err instanceof CorrectionLetterRefusedError) throw new ClosureLetterRefusedError(claimCaseId, 'address_missing');
    throw err;
  }
}

/** The closure letters of a claim, by person. Ciphertext AS STORED. */
export async function listClosureLetters(db: Db, pariwarId: PariwarId, claimCaseId: ClaimId): Promise<ClaimClosureLetterRow[]> {
  return db
    .select()
    .from(claimClosureLetters)
    .where(and(eq(claimClosureLetters.pariwarId, pariwarId), eq(claimClosureLetters.claimCaseId, claimCaseId)))
    .orderBy(asc(claimClosureLetters.createdAt));
}

/** One closure letter of a claim, or `null`. */
export async function readClosureLetter(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
  letterId: string,
): Promise<ClaimClosureLetterRow | null> {
  const [row] = await db
    .select()
    .from(claimClosureLetters)
    .where(
      and(
        eq(claimClosureLetters.pariwarId, pariwarId),
        eq(claimClosureLetters.claimCaseId, claimCaseId),
        eq(claimClosureLetters.letterId, letterId),
      ),
    )
    .limit(1);
  return row ?? null;
}

/**
 * ⭐ RECORD A POSTED CLOSURE LETTER (key (1), `-274` 2). Under the trustee lock: the precondition above; ⛔ a second
 * letter for the person (`already_recorded` — the UNIQUE `(closure_id, person_key)` is the backstop); a posting date ⛔
 * before the closure's IST date (`posted_before_closure`). ⚠ A date LATER than today is the route's 400.
 */
export async function recordClosureLetter(
  client: pg.PoolClient,
  input: {
    readonly pariwarId: PariwarId;
    readonly claimCaseId: ClaimId;
    readonly personKey: string;
    readonly postedOn: string;
    readonly trackingNumberCiphertext: string;
    readonly actorId: string;
    readonly actorDisplay: string;
  },
): Promise<ClaimClosureLetterRow> {
  await acquireCorrectionChaseLock(client, input.pariwarId, input.claimCaseId);
  const db = bindScopedDb(client);
  const { closure } = await assertClosureLetterAllowed(db, input.pariwarId, input.claimCaseId, input.personKey);
  const existing = await db
    .select({ id: claimClosureLetters.letterId })
    .from(claimClosureLetters)
    .where(and(eq(claimClosureLetters.closureId, closure.closureId), eq(claimClosureLetters.personKey, input.personKey)))
    .limit(1);
  if (existing.length > 0) throw new ClosureLetterRefusedError(input.claimCaseId, 'already_recorded');
  // `YYYY-MM-DD` strings compare as dates.
  if (input.postedOn < istDateOf(closure.closedAt!)) {
    throw new ClosureLetterRefusedError(input.claimCaseId, 'posted_before_closure');
  }
  try {
    const [row] = await db
      .insert(claimClosureLetters)
      .values({
        closureId: closure.closureId,
        claimCaseId: input.claimCaseId,
        pariwarId: input.pariwarId,
        personKey: input.personKey,
        postedOn: input.postedOn,
        trackingNumberCiphertext: input.trackingNumberCiphertext,
        recordedByActor: input.actorId,
        recordedByDisplay: input.actorDisplay,
      })
      .returning();
    return row!;
  } catch (err) {
    const code = (err as { code?: string }).code ?? (err as { cause?: { code?: string } }).cause?.code;
    if (code === '23505') throw new ClosureLetterRefusedError(input.claimCaseId, 'already_recorded');
    throw err;
  }
}

/**
 * RECORD A CLOSURE LETTER'S DELIVERY + SCREENSHOT (key (1)) — a late one ACCEPTED (flagged overdue by the read — ⛔
 * never refused, `-250` #3); ⛔ before the posting date; ⛔ twice. The screenshot is already stored under the port's own
 * key (`…/closure-letter/{letterId}`) — this records its key, type and size.
 */
export async function recordClosureLetterDelivery(
  client: pg.PoolClient,
  input: {
    readonly pariwarId: PariwarId;
    readonly claimCaseId: ClaimId;
    readonly letterId: string;
    readonly deliveredOn: string;
    readonly screenshotStorageKey: string;
    readonly screenshotContentType: string;
    readonly screenshotSizeBytes: number;
    readonly actorId: string;
    readonly actorDisplay: string;
  },
): Promise<ClaimClosureLetterRow> {
  await acquireCorrectionChaseLock(client, input.pariwarId, input.claimCaseId);
  const db = bindScopedDb(client);
  const letter = await readClosureLetter(db, input.pariwarId, input.claimCaseId, input.letterId);
  if (letter === null) throw new ClosureLetterRefusedError(input.claimCaseId, 'not_found');
  if (letter.deliveredOn !== null) throw new ClosureLetterRefusedError(input.claimCaseId, 'already_delivered');
  if (input.deliveredOn < letter.postedOn) throw new ClosureLetterRefusedError(input.claimCaseId, 'delivered_before_posted');
  const [row] = await db
    .update(claimClosureLetters)
    .set({
      deliveredOn: input.deliveredOn,
      screenshotStorageKey: input.screenshotStorageKey,
      screenshotContentType: input.screenshotContentType,
      screenshotSizeBytes: input.screenshotSizeBytes,
      deliveryRecordedByActor: input.actorId,
      deliveryRecordedByDisplay: input.actorDisplay,
      deliveryRecordedAt: sql`clock_timestamp()`,
      updatedAt: sql`clock_timestamp()`,
    })
    .where(and(eq(claimClosureLetters.letterId, input.letterId), sql`${claimClosureLetters.deliveredOn} IS NULL`))
    .returning();
  if (!row) throw new ClosureLetterRefusedError(input.claimCaseId, 'already_delivered');
  return row;
}
