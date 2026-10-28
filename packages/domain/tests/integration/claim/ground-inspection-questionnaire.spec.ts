// Story 6.32 (Tasks 3–4; AC3 domain half, AC4 (b), AC5, AC6) — the family's answers at the inspection, at the domain, live DB.
//   · the writer: lock assignment → claim; the version PINNED at the first save; supersede + dependants; idempotent by value;
//     the typed refusals (⛔ active, certificate check, outside the window, ⛔ the inspector, ⛔ version, stale, invalid);
//   · AC4 (b) — `complete` succeeds with ZERO answers on a visit whose pinned version HAS a recorded basis (I1);
//   · AC6 — ③ / ④ compared inside the completion by keyed code index overlap (the REAL helper on BOTH sides, a fake KMS),
//     and the as-of recompute EQUALS the in-transaction result; `dont_know` ⛔ compared; a certificate check ⛔ compared.
// Injected registry (TR7): v1 with a RECORDED counsel basis — the shipped v1 stays `'pending'`.

import { randomBytes, randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  answerCodeBlindIndexes,
  GroundInspectionInspectorMismatchError,
  GroundInspectionQuestionnaireCertificateCheckError,
  GroundInspectionQuestionnaireInvalidAnswerError,
  GroundInspectionQuestionnaireStaleError,
  GroundInspectionQuestionnaireUnavailableError,
  readClaimFamilyAccount,
  readGroundInspectionQuestionnaireHeader,
  readLiveGroundInspectionAnswers,
  readOrRecomputeInspectionDiscrepancy,
  saveGroundInspectionAnswer,
  type DecryptedLiveAnswer,
  type PreparedGroundInspectionAnswer,
} from '../../../src/claim/index.js';
import { GroundInspectionClaimNotInVerificationError, GroundInspectionNotActiveError } from '../../../src/claim/errors.js';
import { bindScopedDb } from '../../../src/db.js';
import { createFakeKmsProvider, type KmsKeyRef } from '../../../src/encryption/index.js';
import { claimId as toClaimId, pariwarId as toPariwarId, type ClaimId, type GroundInspectionId, type PariwarId } from '../../../src/ids/index.js';
import {
  GROUND_INSPECTION_QUESTIONNAIRE_V1,
  type QuestionnaireDefinition,
} from '../../../src/questionnaires/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { driveClaimTo, enterAppScope, seedDeathCertificate } from '../_helpers.js';
import { completeWithDate, FAMILY_DATE, scheduleWithOriginalPhoto } from './_inspection-discrepancy-fixtures.js';
import { attachTextedPings, savePeerFixtureAnswer, type TextedPing } from './_peer-reply-fixtures.js';

const INSPECTOR = 'a1a1a1a1-0000-4000-8000-000000000001';
const STRANGER = 'c3c3c3c3-0000-4000-8000-000000000003';
const TODAY = '2026-10-28';
const HMAC_REF: KmsKeyRef = { resourceName: 'projects/twt-dev/locations/asia-south1/keyRings/twt-dev-keyring/cryptoKeys/pii-tier-2-hmac' };
const kms = createFakeKmsProvider({ kekBytes: randomBytes(32), hmacKeyBytes: randomBytes(32) });

/** v1 with counsel's basis RECORDED (an injected copy — TR7). */
const RECORDED: QuestionnaireDefinition = {
  ...GROUND_INSPECTION_QUESTIONNAIRE_V1,
  pages: GROUND_INSPECTION_QUESTIONNAIRE_V1.pages.map((p) => ({
    questions: p.questions.map((q) => (q.health ? { ...q, counselBasis: '2026-11-01-400' } : q)),
  })),
};
const REGISTRY = [RECORDED];

type Client = ReturnType<typeof getTx>['client'];
interface Ctx {
  readonly client: Client;
  readonly pid: PariwarId;
  readonly cid: ClaimId;
  readonly pings: TextedPing[];
}

async function claim(pings = 0): Promise<Ctx> {
  const { client } = getTx();
  const pid = toPariwarId(randomUUID());
  const cid = toClaimId(randomUUID());
  const mid = randomUUID();
  await enterAppScope(client, pid);
  await driveClaimTo(client, pid, cid, mid, 'verification_in_progress');
  await seedDeathCertificate(client, { pariwarId: pid, claimCaseId: cid });
  await client.query('RESET ROLE');
  const texted = pings > 0 ? await attachTextedPings(client, pid, cid, mid, pings) : [];
  await enterAppScope(client, pid);
  return { client, pid, cid, pings: texted };
}

const schedule = (ctx: Ctx, stage?: 'certificate_check') =>
  scheduleWithOriginalPhoto(ctx.client, ctx.pid, ctx.cid, { inspector: INSPECTOR, ...(stage ? { stage } : {}) });

/** The handler's job, faked: the storage form — a TEST ciphertext carrying its codes, and the REAL code indexes. */
async function prepared(ctx: Ctx, key: string, codes: string[]): Promise<PreparedGroundInspectionAnswer> {
  if (key === 'head_letter') return { form: 'codes', codes };
  return {
    form: 'encrypted',
    ciphertext: `enc:test:${JSON.stringify(codes)}`,
    codeIndexes: await answerCodeBlindIndexes({ claimCaseId: ctx.cid, questionKey: key, codes }, { pariwarId: ctx.pid }, kms, HMAC_REF),
  };
}

/** The handler's pre-lock decrypt, faked from the test ciphertext (each WITH the ciphertext it came from — S10). */
async function decryptedLiveOf(ctx: Ctx, gid: GroundInspectionId): Promise<Map<string, DecryptedLiveAnswer>> {
  const rows = await readLiveGroundInspectionAnswers(bindScopedDb(ctx.client), ctx.pid, gid);
  return new Map(
    rows
      .filter((r) => r.valueCiphertext?.startsWith('enc:test:') === true)
      .map((r) => [r.answerId, { ciphertext: r.valueCiphertext!, codes: JSON.parse(r.valueCiphertext!.slice('enc:test:'.length)) as string[] }]),
  );
}

/** The handler's KNOWN-UNREADABLE map, faked: every live ciphertext that is ⛔ a test ciphertext (erased — the sentinel). */
async function unreadableLiveOf(ctx: Ctx, gid: GroundInspectionId): Promise<Map<string, string>> {
  const rows = await readLiveGroundInspectionAnswers(bindScopedDb(ctx.client), ctx.pid, gid);
  return new Map(
    rows.filter((r) => r.valueCiphertext !== null && !r.valueCiphertext.startsWith('enc:test:')).map((r) => [r.answerId, r.valueCiphertext!]),
  );
}

async function save(
  ctx: Ctx,
  gid: GroundInspectionId,
  key: string,
  codes: string[],
  over: { actor?: string; registry?: readonly QuestionnaireDefinition[]; decrypted?: Map<string, DecryptedLiveAnswer>; unreadable?: Map<string, string> } = {},
) {
  return saveGroundInspectionAnswer(ctx.client, {
    pariwarId: ctx.pid,
    groundInspectionId: gid,
    actingActorId: over.actor ?? INSPECTOR,
    questionKey: key,
    codes,
    prepared: await prepared(ctx, key, codes),
    decryptedLive: over.decrypted ?? (await decryptedLiveOf(ctx, gid)),
    unreadableLive: over.unreadable ?? (await unreadableLiveOf(ctx, gid)),
    todayIst: TODAY,
    registry: over.registry ?? REGISTRY,
  });
}

async function underSavepoint<T>(client: Client, fn: () => Promise<T>): Promise<T> {
  await client.query('SAVEPOINT probe');
  try {
    const out = await fn();
    await client.query('RELEASE SAVEPOINT probe');
    return out;
  } catch (err) {
    await client.query('ROLLBACK TO SAVEPOINT probe');
    throw err;
  }
}

async function setClaimState(ctx: Ctx, state: string) {
  await ctx.client.query('RESET ROLE');
  await ctx.client.query(`SET LOCAL app.claim_state_writer = 'on'`);
  await ctx.client.query(`UPDATE claims SET current_state = $3 WHERE pariwar_id = $1 AND claim_case_id = $2`, [ctx.pid, ctx.cid, state]);
  await ctx.client.query(`SET LOCAL app.claim_state_writer = 'off'`);
  await enterAppScope(ctx.client, ctx.pid);
}

/** As the superuser: a neighbour's cause / illness answer WITH code indexes (v4 serves ⛔ health question until counsel). */
async function neighbourSaid(ctx: Ctx, ping: number, key: 'death_cause' | 'death_illness', codes: string[]) {
  await savePeerFixtureAnswer(ctx.client, ctx.pid, ctx.pings[ping]!, 'has_died', { codes: ['died'] });
  const indexes = await answerCodeBlindIndexes({ claimCaseId: ctx.cid, questionKey: key, codes }, { pariwarId: ctx.pid }, kms, HMAC_REF);
  await ctx.client.query('RESET ROLE');
  await ctx.client.query(
    `INSERT INTO claim_peer_mesh_reply_answers (pariwar_id, claim_case_id, reply_id, question_key, value_ciphertext, value_code_indexes, saved_via, saved_by_actor_id)
     SELECT r.pariwar_id, r.claim_case_id, r.reply_id, $3, $5, $4, 'member_app', 'm' FROM claim_peer_mesh_replies r WHERE r.pariwar_id = $1 AND r.ping_id = $2`,
    [ctx.pid, ctx.pings[ping]!.pingId, key, indexes, `enc:test:${JSON.stringify(codes)}`],
  );
  await enterAppScope(ctx.client, ctx.pid);
}

describe.skipIf(!hasDatabase)('Story 6.32 — the family\'s answers at the inspection (domain, live DB)', { timeout: 30000 }, () => {
  setupLiveDb();

  describe('the writer (IQ10)', () => {
    it('saves the letter as codes, the cause as ciphertext + indexes; PINS the version at the first save', async () => {
      const ctx = await claim();
      const gid = await schedule(ctx);
      expect(await readGroundInspectionQuestionnaireHeader(bindScopedDb(ctx.client), ctx.pid, gid)).toBeNull();
      const r = await save(ctx, gid, 'head_letter', ['collected']);
      expect(r).toMatchObject({ written: true, questionnaireVersionId: 'ground_inspection.v1', supersededDependants: [] });
      await save(ctx, gid, 'death_cause', ['accident']);
      const rows = await readLiveGroundInspectionAnswers(bindScopedDb(ctx.client), ctx.pid, gid);
      const byKey = new Map(rows.map((x) => [x.questionKey, x]));
      expect(byKey.get('head_letter')).toMatchObject({ valueCodes: ['collected'], valueCiphertext: null, valueCodeIndexes: null, savedByActorId: INSPECTOR });
      expect(byKey.get('death_cause')).toMatchObject({ valueCodes: null, valueCiphertext: 'enc:test:["accident"]' });
      expect(byKey.get('death_cause')!.valueCodeIndexes).toHaveLength(1);
      expect(await readGroundInspectionQuestionnaireHeader(bindScopedDb(ctx.client), ctx.pid, gid)).toMatchObject({ questionnaireVersionId: 'ground_inspection.v1' });
    });

    it('an UNCHANGED value writes ⛔ nothing; a change supersedes; the cause off an illness supersedes the illness (dependants)', async () => {
      const ctx = await claim();
      const gid = await schedule(ctx);
      await save(ctx, gid, 'death_cause', ['illness_long']);
      await save(ctx, gid, 'death_illness', ['cancer', 'tb']);
      expect((await save(ctx, gid, 'death_illness', ['tb', 'cancer'])).written).toBe(false); // normalised ⇒ the same
      const r = await save(ctx, gid, 'death_cause', ['accident']);
      expect(r).toMatchObject({ written: true, supersededDependants: ['death_illness'] });
      const live = await readLiveGroundInspectionAnswers(bindScopedDb(ctx.client), ctx.pid, gid);
      expect(live.map((x) => x.questionKey)).toEqual(['death_cause']);
      const all = await ctx.client.query(`SELECT count(*)::int AS n FROM claim_ground_inspection_answers WHERE ground_inspection_id = $1`, [gid]);
      expect(all.rows[0].n).toBe(3); // the cause twice (illness_long, accident) + the illness once — the no-op wrote ⛔ row
    });

    it("\"I don't know\" is stored with NULL code indexes (⛔ ever compared)", async () => {
      const ctx = await claim();
      const gid = await schedule(ctx);
      await save(ctx, gid, 'death_cause', ['dont_know']);
      const [row] = await readLiveGroundInspectionAnswers(bindScopedDb(ctx.client), ctx.pid, gid);
      expect(row).toMatchObject({ questionKey: 'death_cause', valueCodeIndexes: null });
    });

    it('the SHIPPED v1 (cause / illness pending): the cause is `unknown_question`; the letter saves', async () => {
      const ctx = await claim();
      const gid = await schedule(ctx);
      const shipped = { registry: [GROUND_INSPECTION_QUESTIONNAIRE_V1] };
      await expect(underSavepoint(ctx.client, () => save(ctx, gid, 'death_cause', ['accident'], shipped))).rejects.toMatchObject({
        name: 'GroundInspectionQuestionnaireInvalidAnswerError',
        reason: 'unknown_question',
      });
      expect((await save(ctx, gid, 'head_letter', ['not_collected'], shipped)).written).toBe(true);
    });

    it('a later live version applies to NEW visits only — a pinned visit keeps v1 (IQ12)', async () => {
      const ctx = await claim();
      const gid = await schedule(ctx);
      await save(ctx, gid, 'head_letter', ['collected']);
      const v2: QuestionnaireDefinition = { ...RECORDED, versionId: 'ground_inspection.v2', version: 2 };
      const swapped = [{ ...RECORDED, status: 'historical' as const }, v2];
      expect((await save(ctx, gid, 'head_letter', ['not_collected'], { registry: swapped })).questionnaireVersionId).toBe('ground_inspection.v1');
    });

    it('the typed refusals: ⛔ version, a certificate check, ⛔ the inspector, invalid, stale, a closed visit, outside the window', async () => {
      const ctx = await claim();
      const gid = await schedule(ctx);
      await expect(underSavepoint(ctx.client, () => save(ctx, gid, 'head_letter', ['collected'], { registry: [] }))).rejects.toBeInstanceOf(GroundInspectionQuestionnaireUnavailableError);
      const cc = await schedule(ctx, 'certificate_check');
      await expect(underSavepoint(ctx.client, () => save(ctx, cc, 'head_letter', ['collected']))).rejects.toBeInstanceOf(GroundInspectionQuestionnaireCertificateCheckError);
      await expect(underSavepoint(ctx.client, () => save(ctx, gid, 'head_letter', ['collected'], { actor: STRANGER }))).rejects.toBeInstanceOf(GroundInspectionInspectorMismatchError);
      await expect(underSavepoint(ctx.client, () => save(ctx, gid, 'head_letter', ['maybe']))).rejects.toBeInstanceOf(GroundInspectionQuestionnaireInvalidAnswerError);
      await save(ctx, gid, 'death_cause', ['illness_long']);
      // the illness's showIf parent is a CIPHERTEXT — a handler that could ⛔ decrypt it is STALE, ⛔ a guess
      await expect(underSavepoint(ctx.client, () => save(ctx, gid, 'death_illness', ['tb'], { decrypted: new Map() }))).rejects.toBeInstanceOf(GroundInspectionQuestionnaireStaleError);
      await setClaimState(ctx, 'closed');
      await expect(underSavepoint(ctx.client, () => save(ctx, gid, 'head_letter', ['collected']))).rejects.toBeInstanceOf(GroundInspectionClaimNotInVerificationError);
      await setClaimState(ctx, 'verification_in_progress');
      await completeWithDate(ctx.client, ctx.pid, ctx.cid, gid, { actor: INSPECTOR });
      await expect(underSavepoint(ctx.client, () => save(ctx, gid, 'head_letter', ['collected']))).rejects.toBeInstanceOf(GroundInspectionNotActiveError);
    });
  });

  describe('review R2 — a KNOWN-UNREADABLE saved answer (erased, malformed, undecryptable) is ⛔ a stale read', () => {
    /** As the superuser: the RTBF scrub's form (0188's erasure arm) — the sentinel, the indexes NULL. */
    async function scrub(ctx: Ctx, gid: GroundInspectionId, key: string) {
      await ctx.client.query('RESET ROLE');
      await ctx.client.query(
        `UPDATE claim_ground_inspection_answers SET value_ciphertext = '[anonymized]', value_code_indexes = NULL
          WHERE pariwar_id = $1 AND ground_inspection_id = $2 AND question_key = $3 AND superseded_at IS NULL`,
        [ctx.pid, gid, key],
      );
      await enterAppScope(ctx.client, ctx.pid);
    }

    it('an unreadable CAUSE: the letter saves, the cause is REPLACED (its illness superseded); the illness stays refused (fail-closed)', async () => {
      const ctx = await claim();
      const gid = await schedule(ctx);
      await save(ctx, gid, 'death_cause', ['illness_long']);
      await save(ctx, gid, 'death_illness', ['tb']);
      await scrub(ctx, gid, 'death_cause');
      expect((await save(ctx, gid, 'head_letter', ['collected'])).written).toBe(true);
      // the dependency check stays FAIL-CLOSED: an unknown parent never meets a condition
      await expect(underSavepoint(ctx.client, () => save(ctx, gid, 'death_illness', ['cancer']))).rejects.toMatchObject({
        name: 'GroundInspectionQuestionnaireInvalidAnswerError',
        reason: 'condition_not_met',
      });
      const replaced = await save(ctx, gid, 'death_cause', ['accident']);
      expect(replaced).toMatchObject({ written: true, supersededDependants: ['death_illness'] });
      const live = await readLiveGroundInspectionAnswers(bindScopedDb(ctx.client), ctx.pid, gid);
      expect(live.map((r) => [r.questionKey, r.valueCiphertext])).toEqual([
        ['head_letter', null],
        ['death_cause', 'enc:test:["accident"]'],
      ]);
    });

    it('an unreadable ILLNESS under a readable cause is REPLACED', async () => {
      const ctx = await claim();
      const gid = await schedule(ctx);
      await save(ctx, gid, 'death_cause', ['illness_sudden']);
      await save(ctx, gid, 'death_illness', ['tb']);
      await scrub(ctx, gid, 'death_illness');
      expect((await save(ctx, gid, 'death_illness', ['cancer'])).written).toBe(true);
    });

    it('a GENUINE stale read is still refused — a live row in NEITHER map was written after the handler read', async () => {
      const ctx = await claim();
      const gid = await schedule(ctx);
      await save(ctx, gid, 'death_cause', ['old_age']);
      await expect(
        underSavepoint(ctx.client, () => save(ctx, gid, 'head_letter', ['collected'], { decrypted: new Map(), unreadable: new Map() })),
      ).rejects.toBeInstanceOf(GroundInspectionQuestionnaireStaleError);
    });

    it('⭐ second review S10 — an ERASURE between the handler\'s read and the locks is STALE: the row keeps its id, ⛔ its ciphertext', async () => {
      const ctx = await claim();
      const gid = await schedule(ctx);
      await save(ctx, gid, 'death_cause', ['illness_long']);
      // the handler's pre-lock read: the cause decrypts (illness_long) …
      const decrypted = await decryptedLiveOf(ctx, gid);
      const unreadable = await unreadableLiveOf(ctx, gid);
      expect([...decrypted.values()].map((d) => d.codes)).toEqual([['illness_long']]);
      // … then the RTBF scrub rewrites that very row IN PLACE (the same answer_id) before the write takes its locks
      await scrub(ctx, gid, 'death_cause');
      await expect(underSavepoint(ctx.client, () => save(ctx, gid, 'death_illness', ['cancer'], { decrypted, unreadable }))).rejects.toBeInstanceOf(
        GroundInspectionQuestionnaireStaleError,
      );
      // and ⛔ illness was written under the erased cause
      const live = await readLiveGroundInspectionAnswers(bindScopedDb(ctx.client), ctx.pid, gid);
      expect(live.map((r) => r.questionKey)).toEqual(['death_cause']);
    });
  });

  describe('AC4 (b) — completion is unchanged (I1)', () => {
    // ⭐ Second review S20 — "pinned AND zero answers" is ⛔ constructible: the version is pinned BY the first save, and an answer
    // is never deleted. So the legs are: (1) the version pinned by ONE answer (the letter) and ⛔ cause / illness answer;
    // (2) ZERO answers on an UNPINNED visit.
    it('`complete` succeeds with ⛔ cause / illness answer on a visit whose pinned version HAS a recorded basis (ONE answer — the letter — pins it), and with ZERO answers unpinned', async () => {
      const ctx = await claim();
      const gid = await schedule(ctx);
      // pin the recorded version through the letter, then supersede nothing — the visit has ⛔ cause / illness answers
      await save(ctx, gid, 'head_letter', ['not_collected']);
      const r = await completeWithDate(ctx.client, ctx.pid, ctx.cid, gid, { actor: INSPECTOR });
      expect(r.groundInspection.status).toBe('completed');
      const fresh = await schedule(ctx);
      expect((await completeWithDate(ctx.client, ctx.pid, ctx.cid, fresh, { actor: INSPECTOR })).groundInspection.status).toBe('completed');
    });
  });

  describe('AC6 — ③ / ④ compared inside the completion (keyed code index overlap; the REAL helper on both sides)', () => {
    it('⭐ FIRST — the SAME cause on both sides ⇒ ⛔ no difference (TR3)', async () => {
      const ctx = await claim(1);
      await neighbourSaid(ctx, 0, 'death_cause', ['accident']);
      const gid = await schedule(ctx);
      await save(ctx, gid, 'death_cause', ['accident']);
      expect((await completeWithDate(ctx.client, ctx.pid, ctx.cid, gid, { actor: INSPECTOR })).discrepancy).toEqual({ questionKeys: [] });
    });

    it('a different cause ⇒ `death_cause`; disjoint illnesses ⇒ `death_illness`; the as-of recompute EQUALS the in-tx keys', async () => {
      const ctx = await claim(2);
      await neighbourSaid(ctx, 0, 'death_cause', ['illness_sudden']);
      await neighbourSaid(ctx, 1, 'death_illness', ['heart_disease']);
      const gid = await schedule(ctx);
      await save(ctx, gid, 'death_cause', ['illness_long']);
      await save(ctx, gid, 'death_illness', ['cancer', 'tb']);
      const inTx = (await completeWithDate(ctx.client, ctx.pid, ctx.cid, gid, { actor: INSPECTOR })).discrepancy;
      expect(inTx).toEqual({ questionKeys: ['death_cause', 'death_illness'] });
      // ⛔ showing recorded yet ⇒ the re-read RECOMPUTES as of `completed_at`
      const recomputed = await readOrRecomputeInspectionDiscrepancy(bindScopedDb(ctx.client), ctx.pid, gid);
      expect(recomputed.questionKeys).toEqual(inTx!.questionKeys);
    });

    it("a partial illness overlap is a MATCH; the family's \"I don't know\" is ⛔ compared; ⛔ family answer ⇒ ⛔ compared", async () => {
      const ctx = await claim(2);
      await neighbourSaid(ctx, 0, 'death_illness', ['cancer', 'diabetes']);
      await neighbourSaid(ctx, 1, 'death_cause', ['suicide']);
      const gid = await schedule(ctx);
      await save(ctx, gid, 'death_cause', ['illness_long']);
      await save(ctx, gid, 'death_illness', ['cancer']);
      await save(ctx, gid, 'death_cause', ['illness_sudden']); // keeps the illness (both are illness causes)
      expect((await completeWithDate(ctx.client, ctx.pid, ctx.cid, gid, { actor: INSPECTOR })).discrepancy).toEqual({ questionKeys: ['death_cause'] });

      const dk = await claim(1);
      await neighbourSaid(dk, 0, 'death_cause', ['accident']);
      const g2 = await schedule(dk);
      await save(dk, g2, 'death_cause', ['dont_know']);
      expect((await completeWithDate(dk.client, dk.pid, dk.cid, g2, { actor: INSPECTOR })).discrepancy).toEqual({ questionKeys: [] });

      const none = await claim(1);
      await neighbourSaid(none, 0, 'death_cause', ['accident']);
      const g3 = await schedule(none);
      expect((await completeWithDate(none.client, none.pid, none.cid, g3, { actor: INSPECTOR })).discrepancy).toEqual({ questionKeys: [] });
    });

    it('① / ② are byte-for-byte unchanged beside ③ (a `not_died` and a far date still show, in rule order)', async () => {
      const ctx = await claim(2);
      await savePeerFixtureAnswer(ctx.client, ctx.pid, ctx.pings[0]!, 'has_died', { codes: ['not_died'] });
      await neighbourSaid(ctx, 1, 'death_cause', ['killed']);
      await savePeerFixtureAnswer(ctx.client, ctx.pid, ctx.pings[1]!, 'death_date', { date: '2020-01-01' });
      const gid = await schedule(ctx);
      await save(ctx, gid, 'death_cause', ['old_age']);
      expect((await completeWithDate(ctx.client, ctx.pid, ctx.cid, gid, { actor: INSPECTOR, date: FAMILY_DATE })).discrepancy).toEqual({
        questionKeys: ['has_died', 'death_date', 'death_cause'],
      });
    });
  });

  describe('IQ7 — the claim\'s family account (the read the ONE assembler calls)', () => {
    it('only COMPLETED FULL visits, live answers AS STORED; an open visit\'s answers are ⛔ in it', async () => {
      const ctx = await claim();
      const open = await schedule(ctx);
      await save(ctx, open, 'head_letter', ['collected']);
      expect(await readClaimFamilyAccount(bindScopedDb(ctx.client), ctx.pid, ctx.cid)).toEqual([]);
      const done = await schedule(ctx);
      await save(ctx, done, 'head_letter', ['not_collected']);
      await save(ctx, done, 'death_cause', ['accident']);
      await completeWithDate(ctx.client, ctx.pid, ctx.cid, done, { actor: INSPECTOR });
      const account = await readClaimFamilyAccount(bindScopedDb(ctx.client), ctx.pid, ctx.cid);
      expect(account).toHaveLength(1);
      expect(account[0]).toMatchObject({ groundInspectionId: done, questionnaireVersionId: 'ground_inspection.v1', completedAt: expect.any(Date) });
      expect(account[0]!.answers.map((a) => [a.questionKey, a.valueCodes, a.valueCiphertext])).toEqual([
        ['head_letter', ['not_collected'], null],
        ['death_cause', null, 'enc:test:["accident"]'],
      ]);
    });

    it('⭐ review R3 — a completed full visit that saved ⛔ answer is IN the account (empty answers — the approver reads "Letter: not recorded")', async () => {
      const ctx = await claim();
      const zero = await schedule(ctx);
      await completeWithDate(ctx.client, ctx.pid, ctx.cid, zero, { actor: INSPECTOR });
      expect(await readClaimFamilyAccount(bindScopedDb(ctx.client), ctx.pid, ctx.cid)).toEqual([
        { groundInspectionId: zero, questionnaireVersionId: null, completedAt: expect.any(Date), answers: [] },
      ]);
    });
  });
});
