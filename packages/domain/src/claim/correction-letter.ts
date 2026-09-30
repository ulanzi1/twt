// The POSTED LETTER — Story 6.19b (Task 7; AC5; the shared spec's D6 / D20, ⭐ D31 = `2026-09-29-266` §2, the
// claimant's address per `2026-09-29-267` §5b; `2026-09-27-250` #3/#4).
//
// ⭐ D31 — THE LETTER'S OWN PRECONDITION (supersedes `-265` §5's letter check): the person is LETTER-ELIGIBLE in the
// run (D20: a first `rejected_invalid_number`, `rejected_unreachable` or `no_target` of their CURRENT number), THAT
// PERSON's address resolves (a nominee's: the contact row resolved through the correction chain — 6.19a's
// `resolveContactRow`, ⛔ never `member_nominee_versions.address_ciphertext`; the claimant's: the block's own
// `claimant_address_ciphertext`), and the claim's agreement is `live`. `assertClaimContactRecorded` is ⛔ NOT called
// (it stays approval-only — an all-or-nothing check would refuse a letter to nominee 1 over nominee 2's row).
// ⭐ The letter targets the resolver's latest `family` / `direction` run, OPEN OR ENDED: a letter stays recordable after
// its run ends (day 90, a mark change) — ⛔ no reminders then (`-250` #4). At most TWO per person per run.
// ⭐ STAFF-ENTERED EVIDENCE: a delivery recorded LATER than 14 days is accepted and flagged overdue by the read — ⛔ never
// refused (`-250` #3: *"nothing else"*). The tracking number is Tier-1 ciphertext (the handler encrypts); the
// screenshot is ⛔ never here — only its storage key (the `claimDocumentStorage` port, D6).
// ⛔ Transport-free: ⛔ no HTTP, ⛔ no audit, ⛔ no decryption.

import { and, asc, eq, sql } from 'drizzle-orm';
import type pg from 'pg';

import { bindScopedDb, type Db } from '../db.js';
import type { FieldCryptoDeps } from '../encryption/field-classes.js';
import type { ClaimId, PariwarId } from '../ids/index.js';
import { type ClaimCorrectionLetterRow, claimCorrectionLetters } from '../schema/claim_correction_chase.js';
import {
  readClaimContact,
  readClaimContactAgreementState,
  readVersionChainIndex,
  resolveContactRow,
} from './claim-contact-check.js';
import {
  type CorrectionRunView,
  acquireCorrectionChaseLock,
  readCorrectionRecipients,
  resolveCorrectionChase,
} from './correction-chase.js';
import { readRunPersonStates } from './correction-reminder-record.js';
import { getEffectiveNomineeDeclaration } from './nominee-effective.js';

/** D31 + D20 — the stable refusal codes (the route maps each to `409 correction_letter.<code>`). */
export type CorrectionLetterRefusal =
  | 'no_family_run'
  | 'not_letter_eligible'
  | 'address_missing'
  | 'agreement_not_live'
  | 'limit_reached'
  | 'not_found'
  | 'already_delivered'
  | 'delivered_before_posted';

export class CorrectionLetterRefusedError extends Error {
  public readonly name = 'CorrectionLetterRefusedError';
  public constructor(
    public readonly claimCaseId: string,
    public readonly refusal: CorrectionLetterRefusal,
  ) {
    super(`[correction-letter] claim ${claimCaseId}: ${refusal}`);
  }
}

/** A letter row as the routes see it (ciphertext AS STORED). */
export type ClaimCorrectionLetterView = ClaimCorrectionLetterRow;

/** The address a letter goes to — ⛔ ciphertext AS STORED (both sides are the `claim_contact` field class). */
export interface CorrectionLetterAddress {
  readonly addressCiphertext: string;
}

/** The letter's target run: the live return's latest `family` / `direction` run, open or ended. */
async function letterRun(db: Db, pariwarId: PariwarId, claimCaseId: ClaimId): Promise<CorrectionRunView> {
  const chase = await resolveCorrectionChase(db, pariwarId, claimCaseId);
  if (chase.familyRun === null) throw new CorrectionLetterRefusedError(claimCaseId, 'no_family_run');
  return chase.familyRun;
}

/**
 * THAT person's address (D31(b)), or a refusal: a nominee's through the correction chain from their EFFECTIVE
 * version; the claimant's from the block's own column (`-267` §5b).
 */
export async function readCorrectionLetterAddress(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
  personKey: string,
): Promise<CorrectionLetterAddress> {
  const snapshot = await readClaimContact(db, pariwarId, claimCaseId);
  if (snapshot.contact === null) throw new CorrectionLetterRefusedError(claimCaseId, 'address_missing');
  if (personKey === 'claimant') {
    const ct = snapshot.contact.claimantAddressCiphertext;
    if (ct === null || ct === undefined) throw new CorrectionLetterRefusedError(claimCaseId, 'address_missing');
    return { addressCiphertext: ct };
  }
  const recipients = await readCorrectionRecipients(db, pariwarId, claimCaseId);
  const person = recipients.people.find((p) => p.personKey === personKey && p.role === 'nominee');
  if (person === undefined || person.versionId === null) {
    throw new CorrectionLetterRefusedError(claimCaseId, 'address_missing');
  }
  const effective = await getEffectiveNomineeDeclaration(db, pariwarId, claimCaseId);
  const index = await readVersionChainIndex(db, pariwarId, effective.deceasedMemberId);
  const counted = resolveContactRow(person.versionId, snapshot.nominees, index);
  if (counted === null) throw new CorrectionLetterRefusedError(claimCaseId, 'address_missing');
  return { addressCiphertext: counted.row.addressCiphertext };
}

/**
 * ⭐ D31 — the letter's precondition, in the precedence the 409 codes are listed: letter-eligible in the run, that
 * person's address, a live agreement. Returns the run and the address (the form's gated read uses the same answer).
 * `crypto`: hashes the person's CURRENT number so a 6.20 correction resets their found-dead state (AC3) before
 * eligibility is judged — ⛔ the plaintext never leaves (same seam `resolveCorrectionChase` uses).
 */
export async function assertCorrectionLetterAllowed(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
  personKey: string,
  opts: { readonly crypto?: FieldCryptoDeps } = {},
): Promise<{ readonly run: CorrectionRunView; readonly address: CorrectionLetterAddress }> {
  const run = await letterRun(db, pariwarId, claimCaseId);
  const recipients = await readCorrectionRecipients(db, pariwarId, claimCaseId);
  const person = recipients.people.find((p) => p.personKey === personKey);
  if (person === undefined) throw new CorrectionLetterRefusedError(claimCaseId, 'not_letter_eligible');
  const [state] = await readRunPersonStates(db, pariwarId, run, [person], { crypto: opts.crypto });
  if (state === undefined || state.state.foundDeadOn === null) {
    throw new CorrectionLetterRefusedError(claimCaseId, 'not_letter_eligible');
  }
  const address = await readCorrectionLetterAddress(db, pariwarId, claimCaseId, personKey);
  const snapshot = await readClaimContact(db, pariwarId, claimCaseId);
  const agreement =
    snapshot.contact === null
      ? 'missing'
      : await readClaimContactAgreementState(db, pariwarId, snapshot.contact.agreementConsentId);
  if (agreement !== 'live') throw new CorrectionLetterRefusedError(claimCaseId, 'agreement_not_live');
  return { run, address };
}

/** The letters of a claim (every run), ordered by person and sequence. Ciphertext AS STORED. */
export async function listCorrectionLetters(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<ClaimCorrectionLetterRow[]> {
  return db
    .select()
    .from(claimCorrectionLetters)
    .where(and(eq(claimCorrectionLetters.pariwarId, pariwarId), eq(claimCorrectionLetters.claimCaseId, claimCaseId)))
    .orderBy(asc(claimCorrectionLetters.createdAt), asc(claimCorrectionLetters.sequence));
}

/** One letter of a claim, or `null`. */
export async function readCorrectionLetter(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
  letterId: string,
): Promise<ClaimCorrectionLetterRow | null> {
  const [row] = await db
    .select()
    .from(claimCorrectionLetters)
    .where(
      and(
        eq(claimCorrectionLetters.pariwarId, pariwarId),
        eq(claimCorrectionLetters.claimCaseId, claimCaseId),
        eq(claimCorrectionLetters.letterId, letterId),
      ),
    )
    .limit(1);
  return row ?? null;
}

/**
 * ⭐ RECORD A POSTED LETTER (key (1)). Under the trustee lock: D31's precondition, then ≤ 2 per person per run (a
 * third is `limit_reached`; the UNIQUE `(run_id, person_key, sequence)` is the backstop).
 * @throws CorrectionLetterRefusedError
 */
export async function recordCorrectionLetter(
  client: pg.PoolClient,
  input: {
    readonly pariwarId: PariwarId;
    readonly claimCaseId: ClaimId;
    readonly personKey: string;
    readonly postedOn: string;
    readonly trackingNumberCiphertext: string;
    readonly actorId: string;
    readonly actorDisplay: string;
    readonly crypto?: FieldCryptoDeps;
  },
): Promise<ClaimCorrectionLetterRow> {
  await acquireCorrectionChaseLock(client, input.pariwarId, input.claimCaseId);
  const db = bindScopedDb(client);
  const { run } = await assertCorrectionLetterAllowed(db, input.pariwarId, input.claimCaseId, input.personKey, {
    crypto: input.crypto,
  });
  const existing = await db
    .select({ sequence: claimCorrectionLetters.sequence })
    .from(claimCorrectionLetters)
    .where(
      and(
        eq(claimCorrectionLetters.pariwarId, input.pariwarId),
        eq(claimCorrectionLetters.runId, run.runId),
        eq(claimCorrectionLetters.personKey, input.personKey),
      ),
    );
  if (existing.length >= 2) throw new CorrectionLetterRefusedError(input.claimCaseId, 'limit_reached');
  try {
    const [row] = await db
      .insert(claimCorrectionLetters)
      .values({
        runId: run.runId,
        claimCaseId: input.claimCaseId,
        pariwarId: input.pariwarId,
        personKey: input.personKey,
        sequence: existing.length + 1,
        postedOn: input.postedOn,
        trackingNumberCiphertext: input.trackingNumberCiphertext,
        recordedByActor: input.actorId,
        recordedByDisplay: input.actorDisplay,
      })
      .returning();
    return row!;
  } catch (err) {
    const code = (err as { code?: string; cause?: { code?: string } }).code ?? (err as { cause?: { code?: string } }).cause?.code;
    if (code === '23505') throw new CorrectionLetterRefusedError(input.claimCaseId, 'limit_reached');
    throw err;
  }
}

/**
 * ⭐ RECORD A LETTER'S DELIVERY + SCREENSHOT (key (1)). A delivery later than 14 days after posting is ACCEPTED (the
 * read flags it overdue — ⛔ never refused, `-250` #3); one before the posting date is refused; a letter already
 * delivered is refused (evidence is ⛔ overwritten by nobody). Allowed after the run ended (`-250` #4).
 * The screenshot must already be stored under the port's own key (`…/correction-letter/{letterId}`) — this records
 * only its key, content type and size.
 * @throws CorrectionLetterRefusedError  `not_found` / `already_delivered` / `delivered_before_posted`
 */
export async function recordCorrectionLetterDelivery(
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
): Promise<ClaimCorrectionLetterRow> {
  await acquireCorrectionChaseLock(client, input.pariwarId, input.claimCaseId);
  const db = bindScopedDb(client);
  const letter = await readCorrectionLetter(db, input.pariwarId, input.claimCaseId, input.letterId);
  if (letter === null) throw new CorrectionLetterRefusedError(input.claimCaseId, 'not_found');
  if (letter.deliveredOn !== null) throw new CorrectionLetterRefusedError(input.claimCaseId, 'already_delivered');
  if (input.deliveredOn < letter.postedOn) {
    throw new CorrectionLetterRefusedError(input.claimCaseId, 'delivered_before_posted');
  }
  const [row] = await db
    .update(claimCorrectionLetters)
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
    .where(
      and(
        eq(claimCorrectionLetters.pariwarId, input.pariwarId),
        eq(claimCorrectionLetters.letterId, input.letterId),
        sql`${claimCorrectionLetters.deliveredOn} IS NULL`,
      ),
    )
    .returning();
  if (!row) throw new CorrectionLetterRefusedError(input.claimCaseId, 'already_delivered');
  return row;
}
