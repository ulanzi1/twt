// The claim CONTACT RECORD — the WRITER (Story 6.19a, Task 2; AC1 W1–W9; the 6.19 shared spec's D5 / D15 /
// D16, committed in `2026-09-28-265`). Transport-free: ⛔ no HTTP, ⛔ no audit line. The caller (the API) owns
// the audit unit (W10), the encryption keys and the agreement's copy; it hands this writer two PORTS —
// `crypto` (encrypt-before-insert, and the W5 identical-value decrypt) and `recordAgreement` (one
// `claim_contact_agreement` consent row, in the SAME transaction).
//
// ⭐ VALIDATE EVERYTHING, THEN WRITE. Every refusal (`ClaimContactWriteRefusedError`) is thrown BEFORE the
// first INSERT / UPDATE and before any encryption, so a refused write leaves ⛔ nothing behind — W5's "refused
// whole" is structural, ⛔ not a rollback someone has to remember.
//
// The rules are 6.19a AC1's W1–W10 — ⛔ restated here only as far as the code needs a pointer:
//   W1  the member binds each rank to its PROJECTED version (`getProjectedNomineeVersions`), ⛔ never the
//       highest `version_no` and ⛔ never the effective set;
//   W2  the helpline binds by explicit `nomineeVersionId` from the ALLOWED set — the effective versions once
//       the determination is `effective`, else the projected ones;
//   W3  windows: member = `NOMINEE_BANK_COLLECTABLE_STATES`; helpline = that ∪ `TRUSTEE_ROUTABLE_STATES`;
//   W4  rows are upserted, ⛔ never deleted; W4a a relationship-only fill lands on the row that COUNTS
//       (own, else chain-carried);
//   W5  in the helpline's EXTRA states a write only COMPLETES the filing: insert, or fill a null — a different
//       value is 409 `add_only`, an identical one is ⛔ not an overwrite (the stored value is DECRYPTED to
//       compare, only for the fields the write carries);
//   W6  exactly one claimant side, the other cleared in the same statement; in the extra states the side
//       changes only as a FILL; `awaiting_determination` while a correction has superseded it;
//   W7  the creating write needs the agreement, the complete allowed set and one claimant side;
//   W8  the agreement is repointed on every member write, and on a helpline `agreed` inside the member's
//       window or over a REVOKED/missing agreement — otherwise ignored, and the result says so;
//   W9  `locale` follows every write inside the member's window; provenance is the creating write's.

import { and, eq, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { ClaimId, MemberId, PariwarId } from '../ids/index.js';
import { getProjectedNomineeVersions } from '../nominee/declaration-history.js';
import {
  type ClaimContactLocale,
  type ClaimContactNomineeRow,
  claimContactNominees,
  claimContacts,
} from '../schema/claim_contacts.js';
import {
  claimantLinkCountsFor,
  evaluateClaimContact,
  readClaimContact,
  readClaimContactAgreementState,
  readVersionChainIndex,
  resolveContactRow,
} from './claim-contact-check.js';
import { ClaimContactWriteRefusedError, NOMINEE_BANK_COLLECTABLE_STATES } from './errors.js';
import { getEffectiveNomineeDeclaration } from './nominee-effective.js';
import { getClaimCase, lockClaimCase } from './read.js';
import { TRUSTEE_ROUTABLE_STATES } from './state-trustee-decision-persist.js';

// ── W3 — the windows (spread from the two tuples, ⛔ never hand-typed) ───────────────────────────────────────

/** The member's window — the filing window of the nominee-bank form (W3). */
export const CLAIM_CONTACT_MEMBER_WRITABLE_STATES: readonly string[] = [...NOMINEE_BANK_COLLECTABLE_STATES];

/** The helpline's window — every state from which P1, P3 or P4 can 409 on D14 (W3). */
export const CLAIM_CONTACT_HELPLINE_WRITABLE_STATES: readonly string[] = [
  ...new Set<string>([...NOMINEE_BANK_COLLECTABLE_STATES, ...TRUSTEE_ROUTABLE_STATES]),
];

/** The helpline's EXTRA states — add-only there (W5): `verifier_approved`, `reversed`, `state_trustee_freeze`,
 *  `state_trustee_approved`. */
export const CLAIM_CONTACT_ADD_ONLY_STATES: readonly string[] = TRUSTEE_ROUTABLE_STATES.filter(
  (s) => !(NOMINEE_BANK_COLLECTABLE_STATES as readonly string[]).includes(s),
);

/** How the helpline may write in `state` (W3/W5) — the admin presence read reports it to the operator. */
export function claimContactHelplineWriteMode(state: string): 'full' | 'add_only' | 'not_writable' {
  if (CLAIM_CONTACT_ADD_ONLY_STATES.includes(state)) return 'add_only';
  if (CLAIM_CONTACT_MEMBER_WRITABLE_STATES.includes(state)) return 'full';
  return 'not_writable';
}

// ── Input / output ──────────────────────────────────────────────────────────────────────────────────────────

/** The two ports the API supplies. `decrypt` is called ONLY for W5's identical-value comparison. */
export interface ClaimContactCrypto {
  encrypt(plaintext: string): Promise<string>;
  decrypt(ciphertext: string): Promise<string>;
}

export interface ClaimantBlockInput {
  readonly name: string;
  readonly mobile: string;
  readonly address: string;
}

interface CommonInput {
  readonly pariwarId: PariwarId;
  readonly claimCaseId: ClaimId;
  readonly actorId: string;
  readonly locale: ClaimContactLocale;
  readonly claimantBlock?: ClaimantBlockInput;
  readonly crypto: ClaimContactCrypto;
  /** Record ONE `claim_contact_agreement` consent (subject = the deceased member) in the caller's tx and return
   *  its id. Called only when W7/W8 say a fresh agreement is recorded. */
  readonly recordAgreement: (deceasedMemberId: MemberId) => Promise<string>;
}

/** The member's FULL record (W1): an address for exactly the projected ranks (possibly none). */
export interface MemberClaimContactInput extends CommonInput {
  readonly surface: 'member_app';
  /** The member may write only onto their OWN claim (mismatch ⇒ 404). */
  readonly requireDeceasedMemberId: MemberId;
  readonly ranks: readonly { readonly rank: 1 | 2; readonly address: string; readonly relationship?: string }[];
  readonly claimantNomineeRank?: 1 | 2;
  readonly agreed: true;
}

/** The helpline's possibly PARTIAL write (W2). */
export interface HelplineClaimContactInput extends CommonInput {
  readonly surface: 'helpline';
  readonly rows: readonly {
    readonly nomineeVersionId: string;
    readonly address?: string;
    readonly relationship?: string;
  }[];
  readonly claimantNomineeVersionId?: string;
  readonly agreed?: boolean;
}

export type WriteClaimContactInput = MemberClaimContactInput | HelplineClaimContactInput;

export interface WriteClaimContactResult {
  readonly contactId: string;
  readonly deceasedMemberId: MemberId;
  readonly state: string;
  readonly created: boolean;
  /** A fresh `claim_contact_agreement` was recorded and the row repointed at it (W7/W8). */
  readonly agreementRecorded: boolean;
  /** A helpline `agreed` over a live agreement outside the member's window — a confirmation, ⛔ not data (W8). */
  readonly agreementIgnored: boolean;
  /** W6 — the claimant side was set, switched or filled by this write. */
  readonly claimantSideWritten: boolean;
  readonly claimantSide: 'nominee' | 'claimant';
  /** Child rows inserted or changed. */
  readonly rowsWritten: number;
  /** W5 — how many stored fields were DECRYPTED to compare (each an audited KMS decrypt). */
  readonly compareDecrypts: number;
  readonly mode: 'full' | 'add_only';
}

// ── The writer ──────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Write a claim's contact record (W1–W9) in the CALLER's transaction. Locks the claim row first — every
 * window and ownership decision comes from THAT row (the 6.9 enforcement-point discipline).
 *
 * @throws ClaimContactWriteRefusedError  refused whole — ⛔ nothing written (see `ClaimContactWriteRefusal`).
 */
export async function writeClaimContact(db: Db, input: WriteClaimContactInput): Promise<WriteClaimContactResult> {
  const refuse = (code: ConstructorParameters<typeof ClaimContactWriteRefusedError>[1], detail: string, details = {}) =>
    new ClaimContactWriteRefusedError(input.claimCaseId, code, detail, details);

  // (1) The lock, ownership and the window (W3) — before ANY other read and before any encryption.
  const claimRow = await lockClaimCase(db, input.pariwarId, input.claimCaseId);
  if (!claimRow) throw refuse('not_found', 'no such claim in this Pariwar');
  if (input.surface === 'member_app' && claimRow.deceasedMemberId !== input.requireDeceasedMemberId) {
    throw refuse('not_found', 'not the member’s own claim');
  }
  const state = claimRow.currentState;
  const window = input.surface === 'member_app' ? CLAIM_CONTACT_MEMBER_WRITABLE_STATES : CLAIM_CONTACT_HELPLINE_WRITABLE_STATES;
  if (!window.includes(state)) {
    throw refuse('not_writable', `the contact record cannot be written in '${state}'`, { state });
  }
  const addOnly = input.surface === 'helpline' && CLAIM_CONTACT_ADD_ONLY_STATES.includes(state);
  const deceased = claimRow.deceasedMemberId as MemberId;

  // (2) What the write may bind to (W1 / W2) and what is stored.
  const effective = await getEffectiveNomineeDeclaration(db, input.pariwarId, input.claimCaseId);
  const isEffective = effective.status === 'effective';
  const effectiveIds = effective.entries.map((e) => e.versionId as string);
  const projected = await getProjectedNomineeVersions(db, input.pariwarId, deceased);
  const index = await readVersionChainIndex(db, input.pariwarId, deceased);
  const snapshot = await readClaimContact(db, input.pariwarId, input.claimCaseId);
  const stored = snapshot.contact;

  // (3) Normalise both shapes to explicit version ids, checked against the ALLOWED set (400).
  let rows: { versionId: string; address?: string; relationship?: string | null }[];
  let claimantVersion: string | undefined;
  let allowed: string[];
  if (input.surface === 'member_app') {
    allowed = projected.map((p) => p.versionId as string);
    const submitted = input.ranks.map((r) => r.rank).sort();
    const expected = projected.map((p) => p.rank).sort();
    if (submitted.length !== expected.length || submitted.some((r, i) => r !== expected[i])) {
      throw refuse('nominee_set_mismatch', 'the ranks must be exactly the nominees the family sees', {
        expected_count: expected.length,
      });
    }
    // The member's record is FULL: a rank's relationship absent means none (a claimant who IS a nominee).
    rows = input.ranks.map((r) => ({
      versionId: projected.find((p) => p.rank === r.rank)!.versionId as string,
      address: r.address,
      relationship: r.relationship ?? null,
    }));
    if (input.claimantNomineeRank !== undefined) {
      const hit = projected.find((p) => p.rank === input.claimantNomineeRank);
      if (!hit) throw refuse('nominee_set_mismatch', 'the claimant’s rank is not a declared nominee');
      claimantVersion = hit.versionId as string;
    }
  } else {
    allowed = isEffective ? effectiveIds : projected.map((p) => p.versionId as string);
    const seen = new Set<string>();
    for (const r of input.rows) {
      if (!allowed.includes(r.nomineeVersionId) || seen.has(r.nomineeVersionId)) {
        throw refuse('nominee_set_mismatch', 'a row names a version outside the allowed set (or twice)');
      }
      seen.add(r.nomineeVersionId);
    }
    rows = input.rows.map((r) => ({
      versionId: r.nomineeVersionId,
      ...(r.address !== undefined ? { address: r.address } : {}),
      ...(r.relationship !== undefined ? { relationship: r.relationship } : {}),
    }));
    if (input.claimantNomineeVersionId !== undefined) {
      if (!allowed.includes(input.claimantNomineeVersionId)) {
        throw refuse('nominee_set_mismatch', 'the claimant version is outside the allowed set');
      }
      claimantVersion = input.claimantNomineeVersionId;
    }
  }
  const block = input.claimantBlock;
  if (claimantVersion !== undefined && block !== undefined) {
    throw refuse('claimant_required', 'exactly one claimant side — never both');
  }

  let compareDecrypts = 0;
  const sameAs = async (ciphertext: string, plaintext: string): Promise<boolean> => {
    compareDecrypts += 1;
    return (await input.crypto.decrypt(ciphertext)) === plaintext;
  };

  // ── (4a) THE CREATING WRITE (W7) ──────────────────────────────────────────────────────────────────────────
  if (stored === null) {
    if (input.agreed !== true) throw refuse('agreement_required', 'the first write must carry the agreement');
    const carried = new Set(rows.map((r) => r.versionId));
    if (allowed.some((v) => !carried.has(v))) {
      throw refuse('nominee_set_mismatch', 'the first write must give an address for every allowed nominee', {
        expected_count: allowed.length,
      });
    }
    if (claimantVersion === undefined && block === undefined) {
      throw refuse('claimant_required', 'the first write must say who the claimant is');
    }
    if (rows.some((r) => r.address === undefined)) throw refuse('address_required', 'a new row needs its address');

    // ⭐ Validation is complete — only now encrypt and write.
    const agreementConsentId = await input.recordAgreement(deceased);
    const side = await claimantColumns(input.crypto, claimantVersion, block);
    const [contact] = await db
      .insert(claimContacts)
      .values({
        claimCaseId: input.claimCaseId,
        pariwarId: input.pariwarId,
        deceasedMemberId: deceased,
        ...side,
        agreementConsentId: agreementConsentId as never,
        contactLocale: input.locale,
        recordedByActor: input.actorId,
        recordedVia: input.surface,
      })
      .returning({ contactId: claimContacts.contactId });
    if (!contact) throw new Error('[claim-contact] insert returned no row — check session scope');
    for (const r of rows) {
      await db.insert(claimContactNominees).values({
        contactId: contact.contactId,
        claimCaseId: input.claimCaseId,
        pariwarId: input.pariwarId,
        nomineeVersionId: r.versionId as never,
        addressCiphertext: await input.crypto.encrypt(r.address!),
        relationship: r.relationship ?? null,
      });
    }
    return {
      contactId: contact.contactId,
      deceasedMemberId: deceased,
      state,
      created: true,
      agreementRecorded: true,
      agreementIgnored: false,
      claimantSideWritten: true,
      claimantSide: claimantVersion !== undefined ? 'nominee' : 'claimant',
      rowsWritten: rows.length,
      compareDecrypts,
      mode: addOnly ? 'add_only' : 'full',
    };
  }

  // ── (4b) A LATER WRITE — plan every change first (W4 / W4a / W5 / W6) ─────────────────────────────────────
  type RowPlan =
    | { kind: 'insert'; versionId: string; address: string; relationship: string | null }
    | { kind: 'update'; target: ClaimContactNomineeRow; address?: string; relationship?: string | null };
  const plans: RowPlan[] = [];
  for (const r of rows) {
    const own = snapshot.nominees.find((n) => n.nomineeVersionId === r.versionId);
    if (!own) {
      if (r.address !== undefined) {
        // A new row for this version — insert (add-only allows an insert; with W4a, it is now the NEAREST row).
        plans.push({ kind: 'insert', versionId: r.versionId, address: r.address, relationship: r.relationship ?? null });
        continue;
      }
      // W4a — a relationship-only fill lands on the row that COUNTS for this version (chain-carried).
      const counted = resolveContactRow(r.versionId, snapshot.nominees, index);
      if (!counted) throw refuse('address_required', 'a new row needs its address');
      const plan = await planRowUpdate(counted.row, undefined, r.relationship);
      if (plan) plans.push(plan);
      continue;
    }
    const plan = await planRowUpdate(own, r.address, r.relationship);
    if (plan) plans.push(plan);
  }

  async function planRowUpdate(
    target: ClaimContactNomineeRow,
    address: string | undefined,
    relationship: string | null | undefined,
  ): Promise<RowPlan | null> {
    let nextAddress: string | undefined;
    let nextRelationship: string | null | undefined;
    if (address !== undefined) {
      if (addOnly) {
        // ⚠ Tier-1 ciphertext differs on every encryption — DECRYPT to compare (W5).
        if (!(await sameAs(target.addressCiphertext, address))) {
          throw refuse('add_only', 'the address is already set; after verification the helpline may only complete the record');
        }
      } else {
        nextAddress = address;
      }
    }
    if (relationship !== undefined && relationship !== target.relationship) {
      if (addOnly && target.relationship !== null) {
        throw refuse('add_only', 'the relationship is already set; after verification the helpline may only complete the record');
      }
      nextRelationship = relationship;
    }
    if (nextAddress === undefined && nextRelationship === undefined) return null;
    return {
      kind: 'update',
      target,
      ...(nextAddress !== undefined ? { address: nextAddress } : {}),
      ...(nextRelationship !== undefined ? { relationship: nextRelationship } : {}),
    };
  }

  // W6 — the claimant side.
  let writeSide = false;
  const sideCarried = claimantVersion !== undefined || block !== undefined;
  if (sideCarried && !addOnly) {
    writeSide = true;
  } else if (sideCarried) {
    if (!isEffective) {
      throw refuse('awaiting_determination', 'a correction superseded the determination — the claim waits for a new one');
    }
    const storedVersion = stored.claimantNomineeVersionId as string | null;
    if (storedVersion !== null) {
      const storedCounts = effectiveIds.some((v) => claimantLinkCountsFor(storedVersion, v, index));
      if (storedCounts) {
        // An effective claimant version: only an identical re-send passes; anything else is a correction.
        if (claimantVersion !== storedVersion) {
          throw refuse('add_only', 'the claimant is already recorded; after verification the helpline may only complete the record');
        }
      } else {
        // (b) — the stored claimant version is ⛔ not effective: an effective version or the block FILLS it.
        writeSide = true;
      }
    } else if (claimantVersion !== undefined) {
      throw refuse('add_only', 'the claimant’s details are already recorded; after verification the helpline may only complete the record');
    } else {
      const same =
        (await sameAs(stored.claimantNameCiphertext!, block!.name)) &&
        (await sameAs(stored.claimantMobileCiphertext!, block!.mobile)) &&
        (await sameAs(stored.claimantAddressCiphertext!, block!.address));
      if (!same) {
        throw refuse('add_only', 'the claimant’s details are already recorded; after verification the helpline may only complete the record');
      }
    }
  }

  // W8 — the agreement.
  let recordFresh = false;
  let agreementIgnored = false;
  if (input.surface === 'member_app') {
    recordFresh = true;
  } else if (input.agreed === true) {
    if (!addOnly) {
      recordFresh = true;
    } else {
      const agreement = await readClaimContactAgreementState(db, input.pariwarId, stored.agreementConsentId);
      if (agreement === 'live') agreementIgnored = true;
      else recordFresh = true;
    }
  }

  // ⭐ Validation is complete — only now encrypt and write.
  const set: Partial<typeof claimContacts.$inferInsert> = {};
  if (writeSide) Object.assign(set, await claimantColumns(input.crypto, claimantVersion, block));
  if (recordFresh) set.agreementConsentId = (await input.recordAgreement(deceased)) as never;
  if (!addOnly) set.contactLocale = input.locale; // W9
  let rowsWritten = 0;
  for (const p of plans) {
    if (p.kind === 'insert') {
      await db.insert(claimContactNominees).values({
        contactId: stored.contactId,
        claimCaseId: input.claimCaseId,
        pariwarId: input.pariwarId,
        nomineeVersionId: p.versionId as never,
        addressCiphertext: await input.crypto.encrypt(p.address),
        relationship: p.relationship,
      });
    } else {
      await db
        .update(claimContactNominees)
        .set({
          ...(p.address !== undefined ? { addressCiphertext: await input.crypto.encrypt(p.address) } : {}),
          ...(p.relationship !== undefined ? { relationship: p.relationship } : {}),
          updatedAt: sql`now()`,
        })
        .where(
          and(
            eq(claimContactNominees.pariwarId, input.pariwarId),
            eq(claimContactNominees.contactNomineeId, p.target.contactNomineeId),
          ),
        );
    }
    rowsWritten += 1;
  }
  if (Object.keys(set).length > 0 || rowsWritten > 0) {
    await db
      .update(claimContacts)
      .set({ ...set, updatedAt: sql`now()` })
      .where(and(eq(claimContacts.pariwarId, input.pariwarId), eq(claimContacts.contactId, stored.contactId)));
  }

  const nowNominee = writeSide ? claimantVersion !== undefined : stored.claimantNomineeVersionId !== null;
  return {
    contactId: stored.contactId,
    deceasedMemberId: deceased,
    state,
    created: false,
    agreementRecorded: recordFresh,
    agreementIgnored,
    claimantSideWritten: writeSide,
    claimantSide: nowNominee ? 'nominee' : 'claimant',
    rowsWritten,
    compareDecrypts,
    mode: addOnly ? 'add_only' : 'full',
  };
}

/** W6 — the parent's claimant columns with the OTHER side cleared, in one statement. */
async function claimantColumns(
  crypto: ClaimContactCrypto,
  claimantVersion: string | undefined,
  block: ClaimantBlockInput | undefined,
): Promise<{
  claimantNomineeVersionId: never | null;
  claimantNameCiphertext: string | null;
  claimantMobileCiphertext: string | null;
  claimantAddressCiphertext: string | null;
}> {
  if (claimantVersion !== undefined) {
    return {
      claimantNomineeVersionId: claimantVersion as never,
      claimantNameCiphertext: null,
      claimantMobileCiphertext: null,
      claimantAddressCiphertext: null,
    };
  }
  return {
    claimantNomineeVersionId: null,
    claimantNameCiphertext: await crypto.encrypt(block!.name),
    claimantMobileCiphertext: await crypto.encrypt(block!.mobile),
    claimantAddressCiphertext: await crypto.encrypt(block!.address),
  };
}

// ── The admin READ (AC8a) ───────────────────────────────────────────────────────────────────────────────────

/** One ALLOWED version and the row that counts for it — ciphertext AS STORED (the API decrypts, or strips). */
export interface ClaimContactPresenceNominee {
  readonly rank: 1 | 2;
  readonly nomineeVersionId: string;
  readonly row: 'own' | 'chain' | 'none';
  readonly addressCiphertext: string | null;
  readonly relationship: string | null;
}

export interface ClaimContactPresence {
  readonly claimCaseId: ClaimId;
  readonly deceasedMemberId: MemberId;
  readonly state: string;
  readonly recorded: boolean;
  readonly determination: 'effective' | 'not_effective';
  readonly writeMode: 'full' | 'add_only' | 'not_writable';
  readonly nominees: readonly ClaimContactPresenceNominee[];
  readonly claimantSide: 'nominee' | 'claimant' | 'none';
  readonly claimantNomineeVersionId: string | null;
  readonly claimantIsAnAllowedNominee: boolean;
  readonly claimantBlockNeeded: boolean;
  readonly claimantBlockCiphertext: { readonly name: string; readonly mobile: string; readonly address: string } | null;
  readonly agreement: 'live' | 'revoked' | 'none';
  readonly contactLocale: ClaimContactLocale | null;
  /** D14 evaluated now against the ALLOWED versions (`null` ⇒ complete). */
  readonly missing: ReturnType<typeof evaluateClaimContact>;
}

/**
 * The contact record as the helpline sees it (AC8a): the ALLOWED versions (W2 — the effective ones once
 * determined, else the projected ones), the row that counts for each (own / chain-carried, W4a), the claimant
 * side, the agreement's state and what D14 would say now. Ciphertext AS STORED — the presence route strips it,
 * the plaintext route decrypts it. `null` when the claim is not in this Pariwar.
 */
export async function readClaimContactPresence(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<ClaimContactPresence | null> {
  const claimRow = await getClaimCase(db, pariwarId, claimCaseId);
  if (!claimRow) return null;
  const deceased = claimRow.deceasedMemberId as MemberId;
  const effective = await getEffectiveNomineeDeclaration(db, pariwarId, claimCaseId);
  const isEffective = effective.status === 'effective';
  const allowed: { rank: 1 | 2; versionId: string }[] = isEffective
    ? effective.entries.map((e) => ({ rank: e.rank, versionId: e.versionId as string }))
    : (await getProjectedNomineeVersions(db, pariwarId, deceased)).map((p) => ({ rank: p.rank, versionId: p.versionId as string }));
  const index = await readVersionChainIndex(db, pariwarId, deceased);
  const snapshot = await readClaimContact(db, pariwarId, claimCaseId);
  const contact = snapshot.contact;
  const agreement: ClaimContactPresence['agreement'] =
    contact === null
      ? 'none'
      : ((s) => (s === 'live' ? 'live' : s === 'revoked' ? 'revoked' : 'none'))(
          await readClaimContactAgreementState(db, pariwarId, contact.agreementConsentId),
        );
  const nominees = allowed.map((a) => {
    const counted = resolveContactRow(a.versionId, snapshot.nominees, index);
    return {
      rank: a.rank,
      nomineeVersionId: a.versionId,
      row: counted === null ? ('none' as const) : counted.source,
      addressCiphertext: counted?.row.addressCiphertext ?? null,
      relationship: counted?.row.relationship ?? null,
    };
  });
  const claimantVersion = (contact?.claimantNomineeVersionId as string | null | undefined) ?? null;
  const claimantIsAnAllowedNominee =
    claimantVersion !== null && allowed.some((a) => claimantLinkCountsFor(claimantVersion, a.versionId, index));
  const block =
    contact !== null &&
    contact.claimantNameCiphertext !== null &&
    contact.claimantMobileCiphertext !== null &&
    contact.claimantAddressCiphertext !== null
      ? { name: contact.claimantNameCiphertext, mobile: contact.claimantMobileCiphertext, address: contact.claimantAddressCiphertext }
      : null;
  return {
    claimCaseId,
    deceasedMemberId: deceased,
    state: claimRow.currentState,
    recorded: contact !== null,
    determination: isEffective ? 'effective' : 'not_effective',
    writeMode: claimContactHelplineWriteMode(claimRow.currentState),
    nominees,
    claimantSide: contact === null ? 'none' : claimantVersion !== null ? 'nominee' : 'claimant',
    claimantNomineeVersionId: claimantVersion,
    claimantIsAnAllowedNominee,
    claimantBlockNeeded: contact !== null && !claimantIsAnAllowedNominee,
    claimantBlockCiphertext: block,
    agreement,
    contactLocale: contact?.contactLocale ?? null,
    missing: evaluateClaimContact({
      snapshot,
      agreement: agreement === 'none' ? 'missing' : agreement,
      effectiveVersionIds: allowed.map((a) => a.versionId),
      index,
    }),
  };
}
