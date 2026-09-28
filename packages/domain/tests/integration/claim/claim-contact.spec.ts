// The claim CONTACT RECORD — the writer (W1–W9), the correction chain (W4a) and the approval check (D14)
// (Story 6.19a, Task 4; AC11a). Live DB (:5433), per-test ROLLBACK — nothing here commits, so the fixed PARIWAR_A is
// safe. The crypto port is a transparent fake (`enc:test:<value>`): the REAL envelope crypto is the API's, proven by
// the API specs; here the subject is the writer's rules.

import { randomUUID } from 'node:crypto';

import { and, eq, sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import {
  ClaimContactRequiredError,
  ClaimContactWriteRefusedError,
  assertClaimContactRecorded,
  getEffectiveNomineeDeclaration,
  readClaimContact,
  readVersionChainIndex,
  resolveContactRow,
  writeClaimContact,
  type ClaimantBlockInput,
  type HelplineClaimContactInput,
  type MemberClaimContactInput,
} from '../../../src/claim/index.js';
import { recordConsent, revokeConsent } from '../../../src/consent/index.js';
import { claimId as toClaimId, memberId as toMemberId, type ClaimId, type MemberId } from '../../../src/ids/index.js';
import { projectMemberState } from '../../../src/member/project.js';
import { getProjectedNomineeVersions, listNomineeDeclarationVersions } from '../../../src/nominee/declaration-history.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, driveClaimTo, enterAppScope, seedNomineeDeclaration, seedNomineeDetermination } from '../_helpers.js';

type Tx = ReturnType<typeof getTx>['tx'];
type Client = ReturnType<typeof getTx>['client'];

const T1 = new Date('2026-01-05T06:00:00.000Z');
const T2 = new Date('2026-03-01T06:00:00.000Z');
/** A certificate date BETWEEN T1 and T2: a T1 version stands, a T2 version is a post-death change (discarded). */
const DEATH_BETWEEN = '2026-02-01';

const crypto = {
  encrypt: async (v: string) => `enc:test:${v}`,
  decrypt: async (c: string) => c.replace(/^enc:test:/, ''),
};
const BLOCK: ClaimantBlockInput = { name: 'सुनीता देवी', mobile: '9876543210', address: '12 Station Road, Kanpur' };

async function setup(
  opts: {
    state?: 'verification_in_progress' | 'verifier_review' | 'verifier_approved';
    nominees?: number;
    /** A post-death re-declaration of rank 1 at T2 (the member's list then shows THAT person). */
    postDeathChange?: boolean;
    determine?: 'no_discards' | 'post_death' | 'none';
  } = {},
) {
  const { client, tx } = getTx();
  await enterAppScope(client, PARIWAR_A);
  const cid = toClaimId(randomUUID());
  const mid = toMemberId(randomUUID());
  await projectMemberState(client, {
    memberId: mid,
    pariwarId: PARIWAR_A,
    eventType: 'member.signup_initiated',
    payload: { from_state: null, to_state: 'pending-kyc', trigger: 'signup', actor: 'member' },
    actorId: mid,
  });
  const n = opts.nominees ?? 1;
  await seedNomineeDeclaration(tx, PARIWAR_A, mid, {
    nominees: n === 2 ? [{ relationship: 'spouse' }, { relationship: 'son' }] : [{ relationship: 'spouse' }],
    declaredAt: T1,
    ensureMember: false,
  });
  if (opts.postDeathChange) {
    await seedNomineeDeclaration(tx, PARIWAR_A, mid, {
      nominees: n === 2 ? [{ relationship: 'daughter' }, { relationship: 'son' }] : [{ relationship: 'daughter' }],
      declaredAt: T2,
      ensureMember: false,
    });
  }
  const target = opts.state ?? 'verification_in_progress';
  await driveClaimTo(client, PARIWAR_A, cid, mid, target === 'verifier_approved' ? 'verifier_approved' : target);
  const determine = opts.determine ?? 'no_discards';
  if (determine === 'no_discards') await seedNomineeDetermination(client, PARIWAR_A, cid);
  if (determine === 'post_death') await determinePostDeath(client, tx, cid, mid);
  return { client, tx, cid, mid };
}

/** A determination against DEATH_BETWEEN: every T1-era version stands, every T2 version is discarded. */
async function determinePostDeath(client: Client, tx: Tx, cid: ClaimId, mid: MemberId) {
  const versions = await listNomineeDeclarationVersions(tx, PARIWAR_A, mid);
  await seedNomineeDetermination(client, PARIWAR_A, cid, {
    certificateDate: DEATH_BETWEEN,
    marks: versions.map((v) => ({
      versionId: v.versionId,
      mark: v.effectiveAt.getTime() < new Date(`${DEATH_BETWEEN}T00:00:00+05:30`).getTime() ? ('stands' as const) : ('discarded' as const),
    })),
  });
}

/** Set a claim's state directly (the projector is the only writer — this is a fixture). */
async function forceState(tx: Tx, cid: ClaimId, state: string) {
  await tx.execute(sql.raw("SET LOCAL app.claim_state_writer = 'on'"));
  await tx.execute(sql`UPDATE claims SET current_state = ${state} WHERE claim_case_id = ${cid}`);
  await tx.execute(sql.raw("SET LOCAL app.claim_state_writer = 'off'"));
}

/**
 * Apply a 6.20 CORRECTION of `targetVersionId` the way the real Pariwar Admin step leaves it: a new `correction`
 * version (head + 1, inheriting the target's `effective_at`) and the live determination SUPERSEDED. Returns the new
 * version id. (The real raise/approve chain is 6.20's, proven there; here the subject is what it leaves behind.)
 */
async function applyCorrection(tx: Tx, cid: ClaimId, mid: MemberId, targetVersionId: string): Promise<string> {
  const versions = await listNomineeDeclarationVersions(tx, PARIWAR_A, mid);
  const target = versions.find((v) => v.versionId === targetVersionId)!;
  const head = Math.max(...versions.filter((v) => v.rank === target.rank).map((v) => v.versionNo));
  const [row] = await tx
    .insert(schema.memberNomineeVersions)
    .values({
      memberId: mid,
      pariwarId: PARIWAR_A,
      rank: target.rank,
      versionNo: head + 1,
      declarationId: randomUUID(),
      kind: 'declared',
      source: 'correction',
      nameCiphertext: 'enc:v1:corrected-name',
      relationship: target.relationship,
      mobileCiphertext: 'enc:v1:corrected-mobile',
      addressCiphertext: null,
      splitPct: target.splitPct,
      recordedAt: new Date(),
      effectiveAt: target.effectiveAt,
      correctsVersionId: target.versionId,
    })
    .returning();
  await tx
    .update(schema.nomineeDeterminations)
    .set({ supersededAt: sql`now()`, supersededReason: 'correction_applied' })
    .where(and(eq(schema.nomineeDeterminations.claimCaseId, cid), sql`superseded_at IS NULL`));
  return row!.versionId as string;
}

function agreement(tx: Tx, cid: ClaimId) {
  return async (deceased: MemberId) =>
    (
      await recordConsent(tx, {
        pariwarId: PARIWAR_A,
        subjectId: deceased,
        consentType: 'claim_contact_agreement',
        consentArtifactRef: cid,
        grantedViaActor: 'member_self',
        consentPayload: { checkboxTextShown: 'test', locale: 'hi' },
      })
    ).consentId as string;
}

function member(tx: Tx, cid: ClaimId, mid: MemberId, over: Partial<MemberClaimContactInput> = {}): MemberClaimContactInput {
  return {
    surface: 'member_app',
    pariwarId: PARIWAR_A,
    claimCaseId: cid,
    actorId: mid,
    requireDeceasedMemberId: mid,
    locale: 'hi',
    ranks: [{ rank: 1, address: 'Rank one address' }],
    claimantNomineeRank: 1,
    agreed: true,
    crypto,
    recordAgreement: agreement(tx, cid),
    ...over,
  };
}

function helpline(tx: Tx, cid: ClaimId, over: Partial<HelplineClaimContactInput> = {}): HelplineClaimContactInput {
  return {
    surface: 'helpline',
    pariwarId: PARIWAR_A,
    claimCaseId: cid,
    actorId: randomUUID(),
    locale: 'en',
    rows: [],
    crypto,
    recordAgreement: agreement(tx, cid),
    ...over,
  };
}

const refused = (code: string) => (err: unknown) => err instanceof ClaimContactWriteRefusedError && err.code === code;
const contactRequired = (reason: string) => (err: unknown) => err instanceof ClaimContactRequiredError && err.reason === reason;

async function effectiveIds(tx: Tx, cid: ClaimId): Promise<string[]> {
  return (await getEffectiveNomineeDeclaration(tx, PARIWAR_A, cid)).entries.map((e) => e.versionId as string);
}

describe.skipIf(!hasDatabase)('the claim contact record — writer, chain and check (Story 6.19a)', { timeout: 20000 }, () => {
  setupLiveDb();

  // ── W1 — the member binds to what the family SEES ────────────────────────────────────────────────────────
  describe('W1 — the member binds each rank to its PROJECTED version', () => {
    it('⭐ binds, records the agreement in the same transaction, and D14 then passes', async () => {
      const { tx, cid, mid } = await setup({ determine: 'none' });
      const res = await writeClaimContact(tx, member(tx, cid, mid));
      expect(res).toMatchObject({ created: true, agreementRecorded: true, claimantSide: 'nominee' });
      const snap = await readClaimContact(tx, PARIWAR_A, cid);
      const [projected] = await getProjectedNomineeVersions(tx, PARIWAR_A, mid);
      expect(snap.nominees.map((n) => n.nomineeVersionId)).toEqual([projected!.versionId]);
      expect(snap.contact).toMatchObject({ claimantNomineeVersionId: projected!.versionId, recordedVia: 'member_app' });
      // ⭐ Encrypt-before-insert: the stored value is the port's ciphertext, ⛔ never the plaintext.
      expect(snap.nominees[0]!.addressCiphertext).toBe('enc:test:Rank one address');
      const consentRow = await tx.select().from(schema.consentRecords).where(eq(schema.consentRecords.consentId, snap.contact!.agreementConsentId));
      expect(consentRow[0]).toMatchObject({ consentType: 'claim_contact_agreement', subjectId: mid });
      await seedNomineeDetermination(getTx().client, PARIWAR_A, cid);
      await expect(assertClaimContactRecorded(tx, PARIWAR_A, cid)).resolves.toBeUndefined();
    });

    it('⭐ a correction of an OLDER version takes the highest version_no — the member STILL binds to the projected one', async () => {
      const { tx, cid, mid } = await setup({ postDeathChange: true, determine: 'none' });
      const versions = await listNomineeDeclarationVersions(tx, PARIWAR_A, mid);
      const v1 = versions.find((v) => v.versionNo === 1)!;
      const v2 = versions.find((v) => v.versionNo === 2)!;
      const v3 = await applyCorrection(tx, cid, mid, v1.versionId);
      // V3 is the rank's highest version_no, but the family's list still shows V2 (the correction was of V1).
      expect((await getProjectedNomineeVersions(tx, PARIWAR_A, mid))[0]!.versionId).toBe(v2.versionId);
      await writeClaimContact(tx, member(tx, cid, mid));
      const snap = await readClaimContact(tx, PARIWAR_A, cid);
      expect(snap.nominees.map((n) => n.nomineeVersionId)).toEqual([v2.versionId]);
      expect(snap.nominees.map((n) => n.nomineeVersionId)).not.toContain(v3);
    });

    it('refuses ranks that are not exactly the projected ones (400), another member’s claim (404) and a closed window (409)', async () => {
      const { tx, cid, mid } = await setup({ determine: 'none' });
      await expect(writeClaimContact(tx, member(tx, cid, mid, { ranks: [{ rank: 1, address: 'a' }, { rank: 2, address: 'b' }] }))).rejects.toSatisfy(
        refused('nominee_set_mismatch'),
      );
      await expect(writeClaimContact(tx, member(tx, cid, mid, { requireDeceasedMemberId: toMemberId(randomUUID()) }))).rejects.toSatisfy(refused('not_found'));
      const approved = await setup({ state: 'verifier_approved' });
      await expect(writeClaimContact(approved.tx, member(approved.tx, approved.cid, approved.mid))).rejects.toSatisfy(refused('not_writable'));
    });

    it('⭐ W9 — `contact_locale` follows every write in the member’s window, ⛔ not a later one in the extra states', async () => {
      const { tx, cid, mid } = await setup();
      await writeClaimContact(tx, member(tx, cid, mid, { locale: 'hi' }));
      await writeClaimContact(tx, member(tx, cid, mid, { locale: 'en' }));
      expect((await readClaimContact(tx, PARIWAR_A, cid)).contact!.contactLocale).toBe('en');
      await forceState(tx, cid, 'verifier_approved');
      await writeClaimContact(tx, helpline(tx, cid, { locale: 'hi', agreed: true }));
      expect((await readClaimContact(tx, PARIWAR_A, cid)).contact!.contactLocale).toBe('en');
    });
  });

  // ── The post-death change (W1 + W2 + D14) ───────────────────────────────────────────────────────────────
  describe('the post-death change — the effective nominee is an EARLIER version', () => {
    it('⭐ P1 waits on `nominee_address_missing`; the helpline adds it BY VERSION ID; a member re-POST never deletes it; then it passes', async () => {
      const { tx, cid, mid } = await setup({ postDeathChange: true, determine: 'post_death', state: 'verifier_review' });
      const [effective] = await effectiveIds(tx, cid);
      await writeClaimContact(tx, member(tx, cid, mid)); // binds to the PROJECTED (post-death) version
      await expect(assertClaimContactRecorded(tx, PARIWAR_A, cid)).rejects.toSatisfy(contactRequired('nominee_address_missing'));
      // ⭐ A relationship-only row on a version with ⛔ no row is 400 address_required.
      await expect(
        writeClaimContact(tx, helpline(tx, cid, { rows: [{ nomineeVersionId: effective!, relationship: 'son' }] })),
      ).rejects.toSatisfy(refused('address_required'));
      await writeClaimContact(tx, helpline(tx, cid, { rows: [{ nomineeVersionId: effective!, address: 'The effective nominee’s address' }] }));
      // The claimant link still points at the post-death version — outside every effective chain.
      await expect(assertClaimContactRecorded(tx, PARIWAR_A, cid)).rejects.toSatisfy(contactRequired('claimant_details_missing'));
      await writeClaimContact(tx, helpline(tx, cid, { claimantNomineeVersionId: effective! }));
      await expect(assertClaimContactRecorded(tx, PARIWAR_A, cid)).resolves.toBeUndefined();
      // W4 — the family re-POSTs its full record: the helpline-added row SURVIVES (the claimant link moves
      // back to the projected version, which is the member's own full write — full upsert in their window).
      await writeClaimContact(tx, member(tx, cid, mid));
      const rows = (await readClaimContact(tx, PARIWAR_A, cid)).nominees.map((n) => n.nomineeVersionId);
      expect(rows).toContain(effective!);
    });

    it('⭐ W2 — the helpline cannot name a version outside the allowed set (400)', async () => {
      const { tx, cid, mid } = await setup({ postDeathChange: true, determine: 'post_death', state: 'verifier_review' });
      const [projected] = await getProjectedNomineeVersions(tx, PARIWAR_A, mid);
      await expect(
        writeClaimContact(tx, helpline(tx, cid, { rows: [{ nomineeVersionId: projected!.versionId, address: 'x' }], claimantBlock: BLOCK, agreed: true })),
      ).rejects.toSatisfy(refused('nominee_set_mismatch'));
    });
  });

  // ── W7 — the creating write ─────────────────────────────────────────────────────────────────────────────
  describe('W7 — the creating write', () => {
    it('needs the agreement, the complete allowed set, one claimant side and every address (each a 400, ⛔ nothing written)', async () => {
      const { tx, cid } = await setup({ nominees: 2, state: 'verifier_review' });
      const [a, b] = await effectiveIds(tx, cid);
      const rows = [
        { nomineeVersionId: a!, address: 'A' },
        { nomineeVersionId: b!, address: 'B' },
      ];
      await expect(writeClaimContact(tx, helpline(tx, cid, { rows, claimantNomineeVersionId: a! }))).rejects.toSatisfy(refused('agreement_required'));
      await expect(writeClaimContact(tx, helpline(tx, cid, { rows: rows.slice(0, 1), claimantNomineeVersionId: a!, agreed: true }))).rejects.toSatisfy(
        refused('nominee_set_mismatch'),
      );
      // ⭐ ⛔ never a 500: the parent CHECK would refuse this, so the writer answers first.
      await expect(writeClaimContact(tx, helpline(tx, cid, { rows, agreed: true }))).rejects.toSatisfy(refused('claimant_required'));
      await expect(
        writeClaimContact(tx, helpline(tx, cid, { rows: [rows[0]!, { nomineeVersionId: b!, relationship: 'son' }], claimantBlock: BLOCK, agreed: true })),
      ).rejects.toSatisfy(refused('address_required'));
      expect((await readClaimContact(tx, PARIWAR_A, cid)).contact).toBeNull();
      expect(await tx.select().from(schema.consentRecords).where(eq(schema.consentRecords.consentArtifactRef, cid))).toHaveLength(0);
    });

    it('⭐ (a) a claim with ⛔ no record that reaches `reversed` (denied at P1, reversed on appeal) gets its FIRST write there — and P3’s check then passes', async () => {
      const { tx, cid } = await setup({ state: 'verifier_approved' });
      await forceState(tx, cid, 'reversed');
      const [v] = await effectiveIds(tx, cid);
      await writeClaimContact(tx, helpline(tx, cid, { rows: [{ nomineeVersionId: v!, address: 'A' }], claimantNomineeVersionId: v!, agreed: true }));
      await expect(assertClaimContactRecorded(tx, PARIWAR_A, cid)).resolves.toBeUndefined();
    });

    it('⭐ no declared nominee: zero ranks + the claimant block reaches a record (the family can finish filing)', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const cid = toClaimId(randomUUID());
      const mid = toMemberId(randomUUID());
      await projectMemberState(client, {
        memberId: mid,
        pariwarId: PARIWAR_A,
        eventType: 'member.signup_initiated',
        payload: { from_state: null, to_state: 'pending-kyc', trigger: 'signup', actor: 'member' },
        actorId: mid,
      });
      await driveClaimTo(client, PARIWAR_A, cid, mid, 'verification_in_progress');
      const res = await writeClaimContact(tx, member(tx, cid, mid, { ranks: [], claimantNomineeRank: undefined, claimantBlock: BLOCK }));
      expect(res).toMatchObject({ created: true, claimantSide: 'claimant', rowsWritten: 0 });
    });
  });

  // ── W4/W5 — rows, and add-only in the extra states ──────────────────────────────────────────────────────
  describe('W5 — add-only in the helpline’s extra states', () => {
    async function recorded(state: 'verifier_review' | 'verifier_approved') {
      const s = await setup();
      await writeClaimContact(s.tx, member(s.tx, s.cid, s.mid, { claimantNomineeRank: undefined, claimantBlock: BLOCK, ranks: [{ rank: 1, address: 'Old address' }] }));
      // The member's full write required a relationship with the block — clear it so a FILL can be tested.
      await s.tx.update(schema.claimContactNominees).set({ relationship: null }).where(eq(schema.claimContactNominees.claimCaseId, s.cid));
      if (state === 'verifier_approved') await forceState(s.tx, s.cid, 'verifier_approved');
      const [v] = await effectiveIds(s.tx, s.cid);
      return { ...s, v: v! };
    }

    it('⭐ a DIFFERENT value is refused whole (409 add_only) with the row unchanged; an IDENTICAL retry succeeds (a decrypted comparison)', async () => {
      const { tx, cid, v } = await recorded('verifier_approved');
      const before = (await readClaimContact(tx, PARIWAR_A, cid)).nominees[0]!;
      await expect(writeClaimContact(tx, helpline(tx, cid, { rows: [{ nomineeVersionId: v, address: 'New address' }] }))).rejects.toSatisfy(refused('add_only'));
      expect((await readClaimContact(tx, PARIWAR_A, cid)).nominees[0]!.addressCiphertext).toBe(before.addressCiphertext);
      const retry = await writeClaimContact(tx, helpline(tx, cid, { rows: [{ nomineeVersionId: v, address: 'Old address' }] }));
      expect(retry).toMatchObject({ rowsWritten: 0, compareDecrypts: 1, mode: 'add_only' });
      expect((await readClaimContact(tx, PARIWAR_A, cid)).nominees[0]!.addressCiphertext).toBe(before.addressCiphertext);
    });

    it('a relationship FILLS a null; a different one over a set value is 409 add_only', async () => {
      const { tx, cid, v } = await recorded('verifier_approved');
      await writeClaimContact(tx, helpline(tx, cid, { rows: [{ nomineeVersionId: v, relationship: 'son' }] }));
      expect((await readClaimContact(tx, PARIWAR_A, cid)).nominees[0]!.relationship).toBe('son');
      await expect(writeClaimContact(tx, helpline(tx, cid, { rows: [{ nomineeVersionId: v, relationship: 'grandchild' }] }))).rejects.toSatisfy(
        refused('add_only'),
      );
    });

    it('⭐ the SAME writes inside the member’s window overwrite (full upsert)', async () => {
      const { tx, cid, v } = await recorded('verifier_review');
      const res = await writeClaimContact(tx, helpline(tx, cid, { rows: [{ nomineeVersionId: v, address: 'New address', relationship: 'grandchild' }] }));
      expect(res).toMatchObject({ mode: 'full', rowsWritten: 1, compareDecrypts: 0 });
      const row = (await readClaimContact(tx, PARIWAR_A, cid)).nominees[0]!;
      expect(row.addressCiphertext).toBe('enc:test:New address');
      expect(row.relationship).toBe('grandchild');
    });
  });

  // ── W6 — the claimant side ──────────────────────────────────────────────────────────────────────────────
  describe('W6 — the claimant side', () => {
    it('⭐ a member switching rank ⇄ block keeps the parent CHECK each time (the other side is cleared in one statement)', async () => {
      const { tx, cid, mid } = await setup();
      await writeClaimContact(tx, member(tx, cid, mid));
      await writeClaimContact(tx, member(tx, cid, mid, { claimantNomineeRank: undefined, claimantBlock: BLOCK, ranks: [{ rank: 1, address: 'A', relationship: 'son' }] }));
      let c = (await readClaimContact(tx, PARIWAR_A, cid)).contact!;
      expect(c.claimantNomineeVersionId).toBeNull();
      expect(c.claimantNameCiphertext).toBe(`enc:test:${BLOCK.name}`);
      await writeClaimContact(tx, member(tx, cid, mid));
      c = (await readClaimContact(tx, PARIWAR_A, cid)).contact!;
      expect(c.claimantNomineeVersionId).not.toBeNull();
      expect([c.claimantNameCiphertext, c.claimantMobileCiphertext, c.claimantAddressCiphertext]).toEqual([null, null, null]);
    });

    it('in the extra states: over an EFFECTIVE claimant version, either side is 409 add_only; over a stored block, a different block is too — an identical one passes', async () => {
      const { tx, cid, mid } = await setup();
      await writeClaimContact(tx, member(tx, cid, mid));
      await forceState(tx, cid, 'verifier_approved');
      const [v] = await effectiveIds(tx, cid);
      await expect(writeClaimContact(tx, helpline(tx, cid, { claimantBlock: BLOCK }))).rejects.toSatisfy(refused('add_only'));
      await writeClaimContact(tx, helpline(tx, cid, { claimantNomineeVersionId: v! })); // identical — ⛔ not an overwrite

      const b = await setup();
      await writeClaimContact(b.tx, member(b.tx, b.cid, b.mid, { claimantNomineeRank: undefined, claimantBlock: BLOCK, ranks: [{ rank: 1, address: 'A', relationship: 'son' }] }));
      await forceState(b.tx, b.cid, 'verifier_approved');
      const [bv] = await effectiveIds(b.tx, b.cid);
      await expect(writeClaimContact(b.tx, helpline(b.tx, b.cid, { claimantBlock: { ...BLOCK, mobile: '9999999999' } }))).rejects.toSatisfy(refused('add_only'));
      await expect(writeClaimContact(b.tx, helpline(b.tx, b.cid, { claimantNomineeVersionId: bv! }))).rejects.toSatisfy(refused('add_only'));
      const same = await writeClaimContact(b.tx, helpline(b.tx, b.cid, { claimantBlock: BLOCK }));
      expect(same.compareDecrypts).toBe(3);
    });

    it('⭐ while a correction has superseded the determination, a claimant-side write is 409 awaiting_determination — then, after the new one, the (b) FILL succeeds', async () => {
      const { client, tx, cid, mid } = await setup({ postDeathChange: true, determine: 'post_death', state: 'verifier_review' });
      const [effective] = await effectiveIds(tx, cid);
      await writeClaimContact(tx, member(tx, cid, mid)); // claimant = the post-death (projected) version
      await writeClaimContact(tx, helpline(tx, cid, { rows: [{ nomineeVersionId: effective!, address: 'Effective address' }] }));
      await forceState(tx, cid, 'verifier_approved');
      const corrected = await applyCorrection(tx, cid, mid, effective!);
      const [projected] = await getProjectedNomineeVersions(tx, PARIWAR_A, mid);
      await expect(writeClaimContact(tx, helpline(tx, cid, { claimantNomineeVersionId: projected!.versionId }))).rejects.toSatisfy(
        refused('awaiting_determination'),
      );
      await determinePostDeath(client, tx, cid, mid);
      expect(await effectiveIds(tx, cid)).toEqual([corrected]);
      // ⭐ W4a — V1's address counts for V1′ with ⛔ no helpline action; only the claimant is still missing.
      await expect(assertClaimContactRecorded(tx, PARIWAR_A, cid)).rejects.toSatisfy(contactRequired('claimant_details_missing'));
      await writeClaimContact(tx, helpline(tx, cid, { claimantNomineeVersionId: corrected }));
      await expect(assertClaimContactRecorded(tx, PARIWAR_A, cid)).resolves.toBeUndefined();
    });

    it('the same state with the claimant as NONE of the nominees: the block + a relationship on the counted row (chain-carried) passes', async () => {
      const { client, tx, cid, mid } = await setup({ postDeathChange: true, determine: 'post_death', state: 'verifier_review' });
      const [effective] = await effectiveIds(tx, cid);
      await writeClaimContact(tx, member(tx, cid, mid));
      await writeClaimContact(tx, helpline(tx, cid, { rows: [{ nomineeVersionId: effective!, address: 'Effective address' }] }));
      await forceState(tx, cid, 'verifier_approved');
      const corrected = await applyCorrection(tx, cid, mid, effective!);
      await determinePostDeath(client, tx, cid, mid);
      await writeClaimContact(tx, helpline(tx, cid, { claimantBlock: BLOCK, rows: [{ nomineeVersionId: corrected, relationship: 'son' }] }));
      // The relationship landed on the CHAIN-CARRIED row (V1's), ⛔ not a new one.
      const snap = await readClaimContact(tx, PARIWAR_A, cid);
      expect(snap.nominees.find((n) => n.nomineeVersionId === effective)!.relationship).toBe('son');
      await expect(assertClaimContactRecorded(tx, PARIWAR_A, cid)).resolves.toBeUndefined();
    });
  });

  // ── W4a — the correction chain ──────────────────────────────────────────────────────────────────────────
  describe('W4a — the correction chain', () => {
    it('⭐ (b) the claimant is nominee V1 with V1’s address; a correction + a new determination make V1′ effective ⇒ P3’s check passes with ⛔ no helpline action; a two-step chain too; a row for V1″ then wins (nearest)', async () => {
      const { client, tx, cid, mid } = await setup({ state: 'verifier_review' });
      const [v1] = await effectiveIds(tx, cid);
      await writeClaimContact(tx, member(tx, cid, mid));
      await forceState(tx, cid, 'verifier_approved');
      const v1p = await applyCorrection(tx, cid, mid, v1!);
      await seedNomineeDetermination(client, PARIWAR_A, cid);
      expect(await effectiveIds(tx, cid)).toEqual([v1p]);
      await expect(assertClaimContactRecorded(tx, PARIWAR_A, cid)).resolves.toBeUndefined();
      const v1pp = await applyCorrection(tx, cid, mid, v1p);
      await seedNomineeDetermination(client, PARIWAR_A, cid);
      expect(await effectiveIds(tx, cid)).toEqual([v1pp]);
      await expect(assertClaimContactRecorded(tx, PARIWAR_A, cid)).resolves.toBeUndefined();
      // An insert is allowed in add-only; the V1″ row is now the NEAREST and wins.
      await writeClaimContact(tx, helpline(tx, cid, { rows: [{ nomineeVersionId: v1pp, address: 'The newer address' }] }));
      const snap = await readClaimContact(tx, PARIWAR_A, cid);
      const index = await readVersionChainIndex(tx, PARIWAR_A, mid);
      expect(resolveContactRow(v1pp, snap.nominees, index)).toMatchObject({ source: 'own', row: { addressCiphertext: 'enc:test:The newer address' } });
    });
  });

  // ── W8 — the agreement ──────────────────────────────────────────────────────────────────────────────────
  describe('W8 — the agreement', () => {
    it('⭐ a member re-POST repoints to a FRESH consent; a helpline `agreed` over a live one after verification is ignored (and says so)', async () => {
      const { tx, cid, mid } = await setup();
      await writeClaimContact(tx, member(tx, cid, mid));
      const first = (await readClaimContact(tx, PARIWAR_A, cid)).contact!.agreementConsentId;
      await writeClaimContact(tx, member(tx, cid, mid));
      const second = (await readClaimContact(tx, PARIWAR_A, cid)).contact!.agreementConsentId;
      expect(second).not.toBe(first);
      await forceState(tx, cid, 'verifier_approved');
      const res = await writeClaimContact(tx, helpline(tx, cid, { agreed: true }));
      expect(res).toMatchObject({ agreementIgnored: true, agreementRecorded: false });
      expect((await readClaimContact(tx, PARIWAR_A, cid)).contact!.agreementConsentId).toBe(second);
    });

    it('⭐ over a REVOKED agreement, `agreed: true` alone records a fresh consent, repoints, and `agreement_withdrawn` clears — in the extra states too', async () => {
      const { tx, cid, mid } = await setup();
      await writeClaimContact(tx, member(tx, cid, mid));
      await forceState(tx, cid, 'verifier_approved');
      const contact = (await readClaimContact(tx, PARIWAR_A, cid)).contact!;
      await revokeConsent(tx, { pariwarId: PARIWAR_A, consentId: contact.agreementConsentId, reason: 'test' });
      await expect(assertClaimContactRecorded(tx, PARIWAR_A, cid)).rejects.toSatisfy(contactRequired('agreement_withdrawn'));
      const res = await writeClaimContact(tx, helpline(tx, cid, { agreed: true }));
      expect(res).toMatchObject({ agreementRecorded: true, agreementIgnored: false });
      await expect(assertClaimContactRecorded(tx, PARIWAR_A, cid)).resolves.toBeUndefined();
    });

    it('⭐ a refiled claim for the SAME death is ⛔ not satisfied by the first claim’s record or agreement (per claim, `-261` C3)', async () => {
      const { client, tx, cid, mid } = await setup();
      await writeClaimContact(tx, member(tx, cid, mid));
      const refiled = toClaimId(randomUUID());
      await driveClaimTo(client, PARIWAR_A, refiled, mid, 'verification_in_progress');
      await expect(assertClaimContactRecorded(tx, PARIWAR_A, refiled)).rejects.toSatisfy(contactRequired('no_record'));
    });
  });

  // ── D14 — the reasons, in their pinned precedence ───────────────────────────────────────────────────────
  describe('D14 — one test per reason, each satisfying every EARLIER condition', () => {
    it('no_record', async () => {
      const { tx, cid } = await setup();
      await expect(assertClaimContactRecorded(tx, PARIWAR_A, cid)).rejects.toSatisfy(contactRequired('no_record'));
    });

    it('agreement_withdrawn — reported even when an address is ALSO missing (it comes first)', async () => {
      const { tx, cid, mid } = await setup({ postDeathChange: true, determine: 'post_death' });
      await writeClaimContact(tx, member(tx, cid, mid)); // the effective version has ⛔ no row
      const contact = (await readClaimContact(tx, PARIWAR_A, cid)).contact!;
      await revokeConsent(tx, { pariwarId: PARIWAR_A, consentId: contact.agreementConsentId, reason: 'test' });
      await expect(assertClaimContactRecorded(tx, PARIWAR_A, cid)).rejects.toSatisfy(contactRequired('agreement_withdrawn'));
    });

    it('nominee_address_missing — a row bound to a projected version that is ⛔ not effective does ⛔ not satisfy it (rows by effective versionId, ⛔ never a count)', async () => {
      const { tx, cid, mid } = await setup({ postDeathChange: true, determine: 'post_death' });
      await writeClaimContact(tx, member(tx, cid, mid));
      expect((await readClaimContact(tx, PARIWAR_A, cid)).nominees).toHaveLength(1);
      await expect(assertClaimContactRecorded(tx, PARIWAR_A, cid)).rejects.toSatisfy(contactRequired('nominee_address_missing'));
    });

    it('claimant_details_missing — the block is present but a relationship is missing', async () => {
      const { tx, cid, mid } = await setup();
      await writeClaimContact(tx, member(tx, cid, mid, { claimantNomineeRank: undefined, claimantBlock: BLOCK, ranks: [{ rank: 1, address: 'A', relationship: 'son' }] }));
      await tx.update(schema.claimContactNominees).set({ relationship: null }).where(eq(schema.claimContactNominees.claimCaseId, cid));
      await expect(assertClaimContactRecorded(tx, PARIWAR_A, cid)).rejects.toSatisfy(contactRequired('claimant_details_missing'));
    });
  });
});
