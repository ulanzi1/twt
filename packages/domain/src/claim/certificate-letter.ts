// The CERTIFICATE LETTER — Story 6.19d (Task 3; AC4; `2026-10-03-276` CR9; `-259` detail 1: ONE posted letter to the
// person whose phone is dead, at their own address, recorded like the correction letters).
//
// ⭐ ONE LETTER PER PERSON PER CLAIM, EVER — `-275` Q1 A (Trustee-ratified): a `-260` G5 restart, or a never-sent wait
// turning into a rejection, allows ⛔ no second letter (the UNIQUE `(claim_case_id, person_key)` is the backstop). ⭐ And
// one per NUMBER (CR6): a letter is refused when any person whose CURRENT number hash equals this person's already has
// one on the claim (a code check — ⛔ no index can express it).
// ⭐ THE RECORD (a correction letter's): the posting date and a Tier-1 tracking number; within 14 days the delivery date
// and a screenshot (the 14-day overdue flag SHOWN, ⛔ nothing else). ⛔ No second letter, ⛔ no `letter_second_due`.
// ⭐ THE PRECONDITION (in this order): the claim has a certificate run (`no_run`); the contact record exists
// (`address_missing`) and its agreement is `live` (`agreement_not_live`); the person is on the record and letter-eligible
// across the claim's runs — a dead / unreachable / no-target outcome of their CURRENT number (`not_letter_eligible`);
// THAT person's address resolves — a nominee's through the correction chain from their chain head (W4a), the claimant's
// from the block's own column (`-267` §5b) (`address_missing`). Letters stay recordable after a run ends (`-250` #4).
// ⭐ THE LOCK: the CLAIM-ROW lock (the child's delivered-letter check serialises with it) — every number hash is taken
// BEFORE it (CR7: ⛔ no KMS call while holding it); under it the people's versions are re-verified.
// Key (1) `claim.record_correction_letter` — the same act, the same holder (`-276` CR11; 6.19c's precedent).
// ⛔ Transport-free: ⛔ no HTTP, ⛔ no audit; ⛔ nothing decrypted here except the number hash, whose plaintext never leaves.

import { and, asc, eq, sql } from 'drizzle-orm';
import type pg from 'pg';

import { bindScopedDb, type Db } from '../db.js';
import type { FieldCryptoDeps } from '../encryption/field-classes.js';
import type { ClaimId, MemberId, PariwarId } from '../ids/index.js';
import {
  type ClaimCertificateReminderLetterRow,
  claimCertificateReminderLetters,
} from '../schema/claim_certificate_reminder.js';
import {
  type CertificateNumberHash,
  type CertificatePerson,
  type CertificatePersonState,
  type CertificateRecipients,
  evaluateCertificatePersonStates,
  hashCertificateRecipients,
  lockCertificateClaim,
  readCertificateRecipients,
  readClaimCertificateFamilyRows,
  readClaimCertificateLetters,
  readClaimCertificateRuns,
  samePersonSource,
} from './certificate-reminder.js';
import { readClaimContact, readVersionChainIndex, resolveContactRow } from './claim-contact-check.js';
import { CorrectionNumberUnverifiedError } from './correction-crypto.js';

/** The certificate letter's refusals — the route maps each to its own status and `certificate_letter.<code>`. */
export type CertificateLetterRefusal =
  | 'claim_not_found'
  | 'no_run'
  | 'not_letter_eligible'
  | 'address_missing'
  | 'agreement_not_live'
  | 'already_recorded'
  | 'not_found'
  | 'already_delivered'
  | 'delivered_before_posted';

export class CertificateLetterRefusedError extends Error {
  public readonly name = 'CertificateLetterRefusedError';
  public constructor(
    public readonly claimCaseId: string,
    public readonly refusal: CertificateLetterRefusal,
  ) {
    super(`[certificate-letter] claim ${claimCaseId}: ${refusal}`);
  }
}

/** THAT person's address, as stored (Tier-1 ciphertext). */
export interface CertificateLetterAddress {
  readonly addressCiphertext: string;
}

/**
 * The person's address — a nominee's through the correction chain from their chain HEAD (W4a); the claimant's block.
 * ⚠ All four "no usable address" exits below throw the SAME `address_missing` refusal, deliberately: no contact
 * record, a null claimant ciphertext, a null `versionId`, and a failed chain-row resolution are all, from the
 * District Admin's side, the identical actionable fact ("we have no address recorded for this person") — splitting
 * them into separate wire codes would add surface area with no behavior difference for the one caller that reads it.
 */
async function readCertificateLetterAddress(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
  person: CertificatePerson,
): Promise<CertificateLetterAddress> {
  const snapshot = await readClaimContact(db, pariwarId, claimCaseId);
  if (snapshot.contact === null) throw new CertificateLetterRefusedError(claimCaseId, 'address_missing');
  if (person.role === 'claimant') {
    const ct = snapshot.contact.claimantAddressCiphertext;
    if (ct === null || ct === undefined) throw new CertificateLetterRefusedError(claimCaseId, 'address_missing');
    return { addressCiphertext: ct };
  }
  if (person.versionId === null) throw new CertificateLetterRefusedError(claimCaseId, 'address_missing');
  const index = await readVersionChainIndex(db, pariwarId, snapshot.contact.deceasedMemberId as MemberId);
  const counted = resolveContactRow(person.versionId, snapshot.nominees, index);
  if (counted === null) throw new CertificateLetterRefusedError(claimCaseId, 'address_missing');
  return { addressCiphertext: counted.row.addressCiphertext };
}

/** The facts the precondition reads — the people, their CURRENT number hashes, and the claim's runs and letters. */
interface CertificateLetterFacts {
  readonly people: readonly CertificatePerson[];
  readonly states: readonly CertificatePersonState[];
  readonly hashes: ReadonlyMap<string, CertificateNumberHash>;
  readonly runId: string;
}

/**
 * ⭐ CR9's precondition, given hashes computed BEFORE any lock. Returns the run the letter belongs to (the open run, else
 * the latest), the person and their address.
 */
async function evaluateLetterPrecondition(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
  personKey: string,
  recipients: CertificateRecipients,
  hashes: ReadonlyMap<string, CertificateNumberHash>,
): Promise<{ readonly facts: CertificateLetterFacts; readonly person: CertificatePerson; readonly address: CertificateLetterAddress }> {
  const runs = await readClaimCertificateRuns(db, pariwarId, claimCaseId);
  if (runs.length === 0) throw new CertificateLetterRefusedError(claimCaseId, 'no_run');
  const run = runs.find((r) => r.endedAt === null) ?? runs[runs.length - 1]!;
  if (recipients.cannotRemind === 'no_contact_record') throw new CertificateLetterRefusedError(claimCaseId, 'address_missing');
  if (recipients.cannotRemind === 'agreement_not_live') throw new CertificateLetterRefusedError(claimCaseId, 'agreement_not_live');
  const person = recipients.people.find((p) => p.personKey === personKey);
  if (person === undefined) throw new CertificateLetterRefusedError(claimCaseId, 'not_letter_eligible');
  const mine = hashes.get(personKey);
  if (mine === undefined || 'failed' in mine) throw new CorrectionNumberUnverifiedError(claimCaseId, personKey);

  const rows = await readClaimCertificateFamilyRows(db, pariwarId, claimCaseId);
  const letters = await readClaimCertificateLetters(db, pariwarId, claimCaseId);
  const states = evaluateCertificatePersonStates(recipients.people, rows, letters, hashes);
  const state = states.find((s) => s.personKey === personKey)!;
  if (!state.letterEligible) throw new CertificateLetterRefusedError(claimCaseId, 'not_letter_eligible');
  const address = await readCertificateLetterAddress(db, pariwarId, claimCaseId, person);
  return { facts: { people: recipients.people, states, hashes, runId: run.runId }, person, address };
}

/**
 * ⭐ CR9 — may a certificate letter be recorded for `personKey`, and to which address? (The form's gated address read
 * uses the same answer.) Hashes EVERY person's current number (a 6.20 correction resets eligibility; one letter per
 * NUMBER). Read-only, ⛔ no lock.
 * @throws CertificateLetterRefusedError    a refusal (→ 409 `certificate_letter.<code>`)
 * @throws CorrectionNumberUnverifiedError  the person's number could not be hashed — fail CLOSED (→ 503)
 */
export async function assertCertificateLetterAllowed(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
  personKey: string,
  opts: { readonly crypto: FieldCryptoDeps },
): Promise<{ readonly runId: string; readonly person: CertificatePerson; readonly address: CertificateLetterAddress }> {
  const recipients = await readCertificateRecipients(db, pariwarId, claimCaseId);
  const hashes = await hashCertificateRecipients(recipients.people, pariwarId as string, opts.crypto);
  const { facts, person, address } = await evaluateLetterPrecondition(db, pariwarId, claimCaseId, personKey, recipients, hashes);
  return { runId: facts.runId, person, address };
}

/** The certificate letters of a claim (ciphertext AS STORED), oldest first. */
export async function listCertificateLetters(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<ClaimCertificateReminderLetterRow[]> {
  return db
    .select()
    .from(claimCertificateReminderLetters)
    .where(
      and(eq(claimCertificateReminderLetters.pariwarId, pariwarId), eq(claimCertificateReminderLetters.claimCaseId, claimCaseId)),
    )
    .orderBy(asc(claimCertificateReminderLetters.createdAt));
}

/** One certificate letter of a claim, or `null`. */
export async function readCertificateLetter(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
  letterId: string,
): Promise<ClaimCertificateReminderLetterRow | null> {
  const [row] = await db
    .select()
    .from(claimCertificateReminderLetters)
    .where(
      and(
        eq(claimCertificateReminderLetters.pariwarId, pariwarId),
        eq(claimCertificateReminderLetters.claimCaseId, claimCaseId),
        eq(claimCertificateReminderLetters.letterId, letterId),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** The lock wait a letter write tolerates before failing (`55P03`) — ⛔ never an unbounded wait behind a sweep. */
export const CERTIFICATE_LETTER_LOCK_TIMEOUT = '10s';

/**
 * ⭐ RECORD A POSTED CERTIFICATE LETTER (key (1), CR9). Every person's number is hashed FIRST (⛔ no KMS under the lock);
 * then, under the CLAIM-ROW lock: the people's versions are re-verified (a change ⇒ 503 `number_unverified`, retry), the
 * precondition, ⛔ a second letter for the person on the claim (`already_recorded`, also on a 23505), ⛔ a letter for a
 * person whose current number another person's letter already went to (`already_recorded` — one per NUMBER). ⚠ A date
 * LATER than today is the route's 400.
 */
export async function recordCertificateLetter(
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
  opts: { readonly crypto: FieldCryptoDeps },
): Promise<ClaimCertificateReminderLetterRow> {
  const db = bindScopedDb(client);
  const before = await readCertificateRecipients(db, input.pariwarId, input.claimCaseId);
  const hashes = await hashCertificateRecipients(before.people, input.pariwarId as string, opts.crypto);

  await client.query(`SET LOCAL lock_timeout = '${CERTIFICATE_LETTER_LOCK_TIMEOUT}'`);
  if ((await lockCertificateClaim(db, input.pariwarId, input.claimCaseId)) === null) {
    throw new CertificateLetterRefusedError(input.claimCaseId, 'claim_not_found');
  }
  const recipients = await readCertificateRecipients(db, input.pariwarId, input.claimCaseId);
  const { facts, person } = await evaluateLetterPrecondition(db, input.pariwarId, input.claimCaseId, input.personKey, recipients, hashes);
  const pre = new Map(before.people.map((p) => [p.personKey, p]));
  if (facts.people.length !== pre.size || facts.people.some((p) => !samePersonSource(p, pre.get(p.personKey)))) {
    throw new CorrectionNumberUnverifiedError(input.claimCaseId, input.personKey);
  }
  const mine = facts.states.find((s) => s.personKey === person.personKey)!;
  if (mine.letter !== null) throw new CertificateLetterRefusedError(input.claimCaseId, 'already_recorded');
  // ⭐ One letter per NUMBER (CR6): any OTHER person at the same current number with a letter on the claim.
  const myHash = mine.numberHash;
  if (myHash !== null && facts.states.some((s) => s.personKey !== person.personKey && s.letter !== null && s.numberHash === myHash)) {
    throw new CertificateLetterRefusedError(input.claimCaseId, 'already_recorded');
  }
  await client.query('SAVEPOINT certificate_letter_insert');
  try {
    const [row] = await db
      .insert(claimCertificateReminderLetters)
      .values({
        runId: facts.runId,
        claimCaseId: input.claimCaseId,
        pariwarId: input.pariwarId,
        personKey: input.personKey,
        postedOn: input.postedOn,
        trackingNumberCiphertext: input.trackingNumberCiphertext,
        recordedByActor: input.actorId,
        recordedByDisplay: input.actorDisplay,
      })
      .returning();
    await client.query('RELEASE SAVEPOINT certificate_letter_insert');
    return row!;
  } catch (err) {
    const code = (err as { code?: string }).code ?? (err as { cause?: { code?: string } }).cause?.code;
    if (code === '23505') {
      await client.query('ROLLBACK TO SAVEPOINT certificate_letter_insert');
      throw new CertificateLetterRefusedError(input.claimCaseId, 'already_recorded');
    }
    throw err;
  }
}

/**
 * RECORD A CERTIFICATE LETTER'S DELIVERY + SCREENSHOT (key (1)) — a late one ACCEPTED (flagged overdue by the read — ⛔
 * never refused, `-250` #3); ⛔ before the posting date (`delivered_before_posted` → 400); ⛔ twice (`already_delivered`).
 * The screenshot is already stored under the port's own key (`…/certificate-letter/{letterId}`) — this records its key,
 * type and size. Under the claim-row lock (the child's delivered-letter stop reads it).
 */
export async function recordCertificateLetterDelivery(
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
): Promise<ClaimCertificateReminderLetterRow> {
  const db = bindScopedDb(client);
  await client.query(`SET LOCAL lock_timeout = '${CERTIFICATE_LETTER_LOCK_TIMEOUT}'`);
  if ((await lockCertificateClaim(db, input.pariwarId, input.claimCaseId)) === null) {
    throw new CertificateLetterRefusedError(input.claimCaseId, 'claim_not_found');
  }
  const letter = await readCertificateLetter(db, input.pariwarId, input.claimCaseId, input.letterId);
  if (letter === null) throw new CertificateLetterRefusedError(input.claimCaseId, 'not_found');
  if (letter.deliveredOn !== null) throw new CertificateLetterRefusedError(input.claimCaseId, 'already_delivered');
  if (input.deliveredOn < letter.postedOn) {
    throw new CertificateLetterRefusedError(input.claimCaseId, 'delivered_before_posted');
  }
  const [row] = await db
    .update(claimCertificateReminderLetters)
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
        eq(claimCertificateReminderLetters.letterId, input.letterId),
        sql`${claimCertificateReminderLetters.deliveredOn} IS NULL`,
      ),
    )
    .returning();
  if (!row) throw new CertificateLetterRefusedError(input.claimCaseId, 'already_delivered');
  return row;
}
