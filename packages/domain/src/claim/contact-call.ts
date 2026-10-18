// The District Admin's CALL RECORD — Story 6.37c (Task 6; AC7; LD10, LD11; `2026-10-17-351` 5 A). Transport-free: ⛔ no
// HTTP, ⛔ no audit; the only crypto is the number REVEAL's decrypt (the reminders' own resolver).
//
// ⭐ WHAT A CALL IS. A record — the date, WHO answered (a ROLE: the person, a family member, someone else, nobody — ⛔ a
// name) and whether it REACHED the family — made by a human District Admin from either chase's surface. A call
// recorded `reached` is the ONE new source of reach (I1 — ⛔ a provider input): D22 counts it (`reachedByCall`), it ENDS
// the person's running delivery ladders of BOTH chases (it reached the PERSON — LD10, disclosed in PQ2), and it stops a
// CONCLUDED person's staff asks (LD9). ⛔ It changes letter-eligibility or the scheduled reminders.
// ⭐ LD11 — a call to a NOMINEE waits for counsel's written basis (G1; `2026-10-18-354` decision 5): the caller passes
// `nomineeCallsCleared` (ONE env var read at boot by the api — ⛔ read here); uncleared ⇒ `nominee_calls_not_cleared`
// on the record AND the number reveal. The claimant's calls are live (`-351`'s reading — ⛔ the filing agreement, F21).
// ⭐ THE LOCKS: the trustee ADVISORY lock (the correction chase's) THEN the claim ROW lock (`lockCertificateClaim` — the
// certificate chase's), in that order (`correction-closure.ts` S-T2) — a reached call may end ladders of BOTH chases,
// and ⛔ certificate writer takes the advisory key, so ⛔ deadlock.
// ⛔⛔ Nothing here decides anything about a claim (⛔ a decision writer, ⛔ a claim event).

import { and, eq } from 'drizzle-orm';
import type pg from 'pg';

import { bindScopedDb, type Db } from '../db.js';
import type { FieldCryptoDeps } from '../encryption/field-classes.js';
import type { ClaimId, PariwarId } from '../ids/index.js';
import {
  claimContactCalls,
  type ClaimContactCallRow,
  type ContactCallAnsweredBy,
  type ContactCallOutcome,
} from '../schema/claim_contact_calls.js';
import type { ContactLadderChase } from '../schema/claim_contact_ladders.js';
import { claims } from '../schema/claims.js';
import { lockCertificateClaim, readCertificateRecipients } from './certificate-reminder.js';
import { readClaimContactCalls, readClaimLadders } from './contact-ladder-read.js';
import { endContactLadder } from './contact-ladder-record.js';
import { acquireCorrectionChaseLock, readCorrectionRecipients } from './correction-chase.js';
import { type CorrectionMobileSource, resolveCorrectionMobile } from './correction-crypto.js';
import { istDateOf } from './correction-schedule.js';

/** Every refusal of a call record / number reveal, as a stable code (the API maps each to `contact_call.<code>`). */
export type ContactCallRefusal =
  | 'claim_not_found'
  /** The nominee declaration is ⛔ determined yet (correction chase — D30). */
  | 'undetermined'
  | 'no_contact_record'
  | 'agreement_not_live'
  /** The person is ⛔ on this chase's recipient set. */
  | 'not_a_recipient'
  /** LD11 / `-354` decision 5 — a call to a NOMINEE waits for counsel (G1). */
  | 'nominee_calls_not_cleared'
  | 'called_on_in_future'
  | 'called_on_before_filing'
  /** `-351` 5 A — a call REACHES the family only when the person or a family member answered. */
  | 'reached_needs_answer';

export class ContactCallRefusedError extends Error {
  public readonly name = 'ContactCallRefusedError';
  public constructor(
    public readonly claimCaseId: string,
    public readonly refusal: ContactCallRefusal,
  ) {
    super(`[contact-call] claim ${claimCaseId}: ${refusal}`);
  }
}

/** The person a call is to — ⛔ name; ciphertext AS STORED. */
export interface ContactCallPerson {
  readonly personKey: string;
  readonly role: 'nominee' | 'claimant';
  readonly mobileCiphertext: string | null;
  readonly mobileSource: CorrectionMobileSource;
}

/**
 * The person on the chase's recipient set — the correction chase's EFFECTIVE nominees + the claimant block
 * (`readCorrectionRecipients`), or the certificate chase's CONTACT RECORD (`readCertificateRecipients`, CR6) — with D30
 * first (⛔ contact record, an agreement ⛔ live, an undetermined declaration ⇒ refused, as letters are).
 */
async function readChasePerson(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
  chase: ContactLadderChase,
  personKey: string,
): Promise<ContactCallPerson> {
  const recipients =
    chase === 'correction'
      ? await readCorrectionRecipients(db, pariwarId, claimCaseId)
      : await readCertificateRecipients(db, pariwarId, claimCaseId);
  if (recipients.cannotRemind !== null) throw new ContactCallRefusedError(claimCaseId, recipients.cannotRemind);
  const person = recipients.people.find((p) => p.personKey === personKey);
  if (person === undefined) throw new ContactCallRefusedError(claimCaseId, 'not_a_recipient');
  return { personKey: person.personKey, role: person.role, mobileCiphertext: person.mobileCiphertext, mobileSource: person.mobileSource };
}

/**
 * ⭐ May the District Admin call THIS person on this chase now? The claim exists; D30 (a contact record and a live
 * agreement); the person on the chase's recipient set; LD11 — a NOMINEE only once nominee calls are cleared. Reads
 * only (the writer re-runs it under its locks; the reveal runs it before any decrypt).
 * @throws ContactCallRefusedError
 */
export async function assertContactCallAllowed(
  db: Db,
  input: {
    readonly pariwarId: PariwarId;
    readonly claimCaseId: ClaimId;
    readonly chase: ContactLadderChase;
    readonly personKey: string;
    readonly nomineeCallsCleared: boolean;
  },
): Promise<ContactCallPerson> {
  const [claimRow] = await db
    .select({ claimCaseId: claims.claimCaseId })
    .from(claims)
    .where(and(eq(claims.pariwarId, input.pariwarId), eq(claims.claimCaseId, input.claimCaseId)))
    .limit(1);
  if (!claimRow) throw new ContactCallRefusedError(input.claimCaseId, 'claim_not_found');
  const person = await readChasePerson(db, input.pariwarId, input.claimCaseId, input.chase, input.personKey);
  if (person.role === 'nominee' && !input.nomineeCallsCleared) {
    throw new ContactCallRefusedError(input.claimCaseId, 'nominee_calls_not_cleared');
  }
  return person;
}

/**
 * The call's own facts, PURE: `called_on` ⛔ later than `today` (IST) and ⛔ before the claim was filed (`filedOn`, IST);
 * `reached` only when the person or a family member answered.
 * @throws ContactCallRefusedError
 */
export function assertContactCallFacts(
  claimCaseId: string,
  input: {
    readonly calledOn: string;
    readonly today: string;
    readonly filedOn: string;
    readonly answeredBy: ContactCallAnsweredBy;
    readonly outcome: ContactCallOutcome;
  },
): void {
  if (input.calledOn > input.today) throw new ContactCallRefusedError(claimCaseId, 'called_on_in_future');
  if (input.calledOn < input.filedOn) throw new ContactCallRefusedError(claimCaseId, 'called_on_before_filing');
  if (input.outcome === 'reached' && input.answeredBy !== 'the_person' && input.answeredBy !== 'family_member') {
    throw new ContactCallRefusedError(claimCaseId, 'reached_needs_answer');
  }
}

export interface RecordContactCallResult {
  readonly call: ClaimContactCallRow;
  /** The running ladders (either chase) this `reached` call ENDED `ended_call` — empty for a `not_reached` call. */
  readonly endedLadderIds: readonly string[];
}

/**
 * ⭐ RECORD A CALL (LD10), in the caller's transaction, under the trustee lock THEN the claim-row lock: re-runs
 * `assertContactCallAllowed` and the facts (`called_on` against today and the claim's filing date); inserts the row —
 * `ladder_id` the person's RUNNING ladder of this chase, else their latest CONCLUDED one, else null; then, for a
 * `reached` call, ENDS every RUNNING ladder of the person in BOTH chases whose origin was sent on or before the call
 * (`ended_call` — `-351` 4 A / 5 A; an earlier call ends ⛔ a later ladder). Append-only.
 * @throws ContactCallRefusedError
 */
export async function recordContactCall(
  client: pg.PoolClient,
  input: {
    readonly pariwarId: PariwarId;
    readonly claimCaseId: ClaimId;
    readonly chase: ContactLadderChase;
    readonly personKey: string;
    readonly calledOn: string;
    readonly answeredBy: ContactCallAnsweredBy;
    readonly outcome: ContactCallOutcome;
    readonly actorId: string;
    /** The admin's display name (the api's `getDisplayName` — ⛔ a fallback). */
    readonly actorDisplay: string;
    readonly nomineeCallsCleared: boolean;
    readonly now: Date;
  },
): Promise<RecordContactCallResult> {
  await acquireCorrectionChaseLock(client, input.pariwarId, input.claimCaseId);
  const db = bindScopedDb(client);
  if ((await lockCertificateClaim(db, input.pariwarId, input.claimCaseId)) === null) {
    throw new ContactCallRefusedError(input.claimCaseId, 'claim_not_found');
  }
  await assertContactCallAllowed(db, input);
  const [claimRow] = await db
    .select({ createdAt: claims.createdAt })
    .from(claims)
    .where(and(eq(claims.pariwarId, input.pariwarId), eq(claims.claimCaseId, input.claimCaseId)))
    .limit(1);
  assertContactCallFacts(input.claimCaseId, {
    calledOn: input.calledOn,
    today: istDateOf(input.now),
    filedOn: istDateOf(claimRow!.createdAt),
    answeredBy: input.answeredBy,
    outcome: input.outcome,
  });

  const mine = (await readClaimLadders(db, input.pariwarId, input.claimCaseId, input.chase)).filter(
    (l) => l.personKey === input.personKey,
  );
  const ladder =
    mine.find((l) => l.state === 'running') ?? [...mine].reverse().find((l) => l.state === 'concluded_undelivered') ?? null;
  const [call] = await db
    .insert(claimContactCalls)
    .values({
      pariwarId: input.pariwarId,
      claimCaseId: input.claimCaseId,
      personKey: input.personKey,
      chase: input.chase,
      ladderId: ladder?.ladderId ?? null,
      calledOn: input.calledOn,
      answeredBy: input.answeredBy,
      outcome: input.outcome,
      recordedByActor: input.actorId,
      recordedByDisplay: input.actorDisplay,
    })
    .returning();

  const endedLadderIds: string[] = [];
  if (input.outcome === 'reached') {
    for (const chase of ['correction', 'certificate'] as const) {
      for (const l of await readClaimLadders(db, input.pariwarId, input.claimCaseId, chase)) {
        if (l.personKey !== input.personKey || l.state !== 'running' || l.originSentOn > input.calledOn) continue;
        if (await endContactLadder(db, { pariwarId: input.pariwarId, ladderId: l.ladderId, state: 'ended_call', detail: 'call_reached' })) {
          endedLadderIds.push(l.ladderId);
        }
      }
    }
  }
  return { call: call!, endedLadderIds };
}

/** Every call of a claim (both surfaces), oldest first — a reached call counts whichever surface recorded it. */
export async function listContactCalls(db: Db, pariwarId: PariwarId, claimCaseId: ClaimId): Promise<ClaimContactCallRow[]> {
  return readClaimContactCalls(db, pariwarId, claimCaseId);
}

/**
 * ⭐ THE NUMBER REVEAL's read — the person's CURRENT number (after a 6.20 correction: the NEW one), decrypted through
 * the reminders' own resolver (`resolveCorrectionMobile` — ⛔ a second decrypt path), AFTER `assertContactCallAllowed`
 * (LD11's gate included). `null` when the person has ⛔ sendable number. ⛔ The plaintext never logged.
 * @throws ContactCallRefusedError
 */
export async function readContactCallNumber(
  db: Db,
  input: {
    readonly pariwarId: PariwarId;
    readonly claimCaseId: ClaimId;
    readonly chase: ContactLadderChase;
    readonly personKey: string;
    readonly nomineeCallsCleared: boolean;
    readonly crypto: FieldCryptoDeps;
  },
): Promise<{ readonly e164: string | null }> {
  const person = await assertContactCallAllowed(db, input);
  const e164 = await resolveCorrectionMobile(person.mobileCiphertext, person.mobileSource, input.pariwarId, input.crypto);
  return { e164 };
}
