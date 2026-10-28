// Migration 0188 — the inspector's questionnaire for the family, and the comparable form of the health answers (Story 6.32,
// Task 2; AC2, AC5, AC9). Live DB; per-test ROLLBACK. Every refusal runs under a SAVEPOINT so one test can assert several.
//   · the catalog: both tables' composite FKs cascade, the CHECKs (the Tier-1 keys LOCKSTEP with the domain constant; the
//     code-index shape the SAME on both answer tables), the partial UNIQUE, ⛔ no DEFERRABLE constraint;
//   · grants: header SELECT + INSERT only; answers SELECT + INSERT + UPDATE on exactly (superseded_at, value_ciphertext,
//     value_code_indexes) — ⛔ DELETE anywhere; the neighbours' erasure grant gains `value_code_indexes`;
//   · the guard: a header / answer is refused on a completed / superseded / refused / `certificate_check` assignment and outside
//     the answer window; ONE live answer per (assignment, key); append-only but for the supersede and the erasure arm;
//   · TR14 — the neighbours' REPLACED guard: the scrub of a row carrying code indexes succeeds; a non-NULL rewrite is refused;
//   · RLS: ENABLED + FORCED, per-command policies, a cross-tenant reader sees nothing, the unscoped probe sees nothing.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { GROUND_INSPECTION_SENSITIVE_QUESTION_KEYS, HEAD_LETTER_CODES } from '../../../src/questionnaires/keys.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { enterAppRoleNoScope, enterAppScope, PARIWAR_A, PARIWAR_B, seedClaim, seedDeathCertificate } from '../_helpers.js';

type Client = ReturnType<typeof getTx>['client'];

const HEADERS = 'claim_ground_inspection_questionnaires';
const ANSWERS = 'claim_ground_inspection_answers';
const NEIGHBOURS = 'claim_peer_mesh_reply_answers';

async function attempt(client: Client, text: string, params: unknown[] = []): Promise<{ code: string | null; message: string; rowCount: number }> {
  await client.query('SAVEPOINT probe');
  try {
    const r = await client.query(text, params);
    await client.query('RELEASE SAVEPOINT probe');
    return { code: null, message: '', rowCount: r.rowCount ?? 0 };
  } catch (err) {
    await client.query('ROLLBACK TO SAVEPOINT probe');
    const e = err as { code?: string; message?: string };
    return { code: e.code ?? 'unknown', message: e.message ?? '', rowCount: 0 };
  }
}

interface Seeded {
  readonly pariwarId: string;
  readonly claimCaseId: string;
  readonly groundInspectionId: string;
  readonly uploadId: string;
}

/** As the superuser: a claim in `claimState`, its certificate, and ONE assignment in `status` / `stage` (raw). */
async function seedInspection(
  client: Client,
  pariwarId: string,
  opts: { status?: string; stage?: 'initial' | 'corroboration' | 'certificate_check'; claimState?: string } = {},
): Promise<Seeded> {
  const { tx } = getTx();
  const claimCaseId = await seedClaim(tx, pariwarId, { currentState: (opts.claimState ?? 'verification_in_progress') as never });
  const { uploadId } = await seedDeathCertificate(client, { pariwarId, claimCaseId });
  const status = opts.status ?? 'scheduled';
  const stage = opts.stage ?? 'initial';
  const completed = status === 'completed';
  const groundInspectionId = randomUUID();
  await client.query(
    `INSERT INTO claim_ground_inspections (ground_inspection_id, claim_case_id, pariwar_id, district, inspection_stage, inspection_site_type,
       inspector_actor_id, scheduled_at, status, completed_at, original_certificate_verdict, compared_certificate_upload_id,
       death_date_ciphertext, death_date_source, death_date_index)
     VALUES ($1, $2, $3, 'Patna', $4, 'family_residence', 'inspector', now(), $5,
       CASE WHEN $6 THEN clock_timestamp() END, CASE WHEN $6 THEN 'matches'::ground_inspection_certificate_verdict END,
       CASE WHEN $6 THEN $7::uuid END, CASE WHEN $6 THEN 'enc:v1:d' END,
       CASE WHEN $6 THEN $8::ground_inspection_death_date_source END, CASE WHEN $6 THEN 'idx:d' END)`,
    [groundInspectionId, claimCaseId, pariwarId, stage, status, completed, uploadId, stage === 'certificate_check' ? 'original_certificate' : 'family_statement'],
  );
  return { pariwarId, claimCaseId, groundInspectionId, uploadId };
}

const INSERT_HEADER = `INSERT INTO ${HEADERS} (pariwar_id, claim_case_id, ground_inspection_id, questionnaire_version_id) VALUES ($1, $2, $3, $4)`;
const INSERT_ANSWER = `INSERT INTO ${ANSWERS} (answer_id, pariwar_id, claim_case_id, ground_inspection_id, question_key, value_codes, value_ciphertext,
    value_code_indexes, saved_by_actor_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'inspector')`;

const headerParams = (s: Seeded, version = 'ground_inspection.v1') => [s.pariwarId, s.claimCaseId, s.groundInspectionId, version];
function answerParams(s: Seeded, key: string, v: { codes?: string[] | null; cipher?: string | null; indexes?: string[] | null } = {}, answerId = randomUUID()) {
  return [answerId, s.pariwarId, s.claimCaseId, s.groundInspectionId, key, v.codes === undefined ? null : v.codes, v.cipher ?? null, v.indexes ?? null];
}
const LETTER = { codes: ['collected'] };
const CAUSE = { cipher: 'enc:v1:cause', indexes: ['idx:a'] };

/** As the superuser: the header (an open visit) — the answers' FK parent. */
async function seedHeader(client: Client, s: Seeded): Promise<void> {
  await client.query(INSERT_HEADER, headerParams(s));
}

const NOT_OPEN = /the inspection is not an open visit in scope, or the claim is outside the answer window/;
const APPEND_ONLY = /an answer row is append-only/;

describe.skipIf(!hasDatabase)('0188 — the inspector\'s questionnaire for the family', { timeout: 20000 }, () => {
  setupLiveDb();

  describe('the catalog', () => {
    it('both tables\' composite FKs cascade; the CHECKs; ⛔ no DEFERRABLE constraint', async () => {
      const { client } = getTx();
      const { rows } = await client.query<{ conname: string; def: string; deferrable: boolean }>(
        `SELECT conname, pg_get_constraintdef(oid) AS def, condeferrable AS deferrable FROM pg_constraint
          WHERE conrelid IN ('${HEADERS}'::regclass, '${ANSWERS}'::regclass, '${NEIGHBOURS}'::regclass)`,
      );
      const def = (n: string) => rows.find((r) => r.conname === n)?.def ?? `<missing ${n}>`;
      expect(def('claim_gi_questionnaires_owner_uq')).toBe('UNIQUE (pariwar_id, ground_inspection_id, claim_case_id)');
      expect(def('claim_gi_questionnaires_inspection_fk')).toBe(
        'FOREIGN KEY (pariwar_id, ground_inspection_id, claim_case_id) REFERENCES claim_ground_inspections(pariwar_id, ground_inspection_id, claim_case_id) ON DELETE CASCADE',
      );
      expect(def('claim_gi_answers_questionnaire_fk')).toBe(
        'FOREIGN KEY (pariwar_id, ground_inspection_id, claim_case_id) REFERENCES claim_ground_inspection_questionnaires(pariwar_id, ground_inspection_id, claim_case_id) ON DELETE CASCADE',
      );
      for (const p of ['claim_gi_questionnaires', 'claim_gi_answers']) {
        expect(def(`${p}_claim_case_fk`)).toBe('FOREIGN KEY (pariwar_id, claim_case_id) REFERENCES claims(pariwar_id, claim_case_id) ON DELETE CASCADE');
      }
      expect(def('claim_gi_questionnaires_version_check')).toMatch(/\^ground_inspection\\\.v\[0-9\]\+\$/);
      // ⭐ the code-index shape is the SAME on both answer tables (IQ4)
      const shape = (d: string) => d.replace(/\s+/g, ' ');
      expect(shape(def('claim_gi_answers_code_indexes_check'))).toBe(shape(def('claim_peer_mesh_reply_answers_code_indexes_check')));
      expect(def('claim_gi_answers_code_indexes_check')).toMatch(/'death_cause'::text, 'death_illness'::text.*value_ciphertext IS NOT NULL.*cardinality\(value_code_indexes\) >= 1/);
      expect(rows.filter((r) => r.conname.startsWith('claim_gi_') && r.deferrable)).toEqual([]);
    });

    it('⭐ LOCKSTEP — the Tier-1 CHECK names exactly GROUND_INSPECTION_SENSITIVE_QUESTION_KEYS', async () => {
      const { client } = getTx();
      const { rows } = await client.query<{ def: string }>(
        `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = 'claim_gi_answers_sensitive_encrypted_check'`,
      );
      const named = [...rows[0]!.def.matchAll(/'([a-z_]+)'::text/g)].map((m) => m[1]);
      expect(new Set(named)).toEqual(new Set(GROUND_INSPECTION_SENSITIVE_QUESTION_KEYS));
    });

    it('the indexes: ONE live answer per (assignment, key) — partial; the claim indexes', async () => {
      const { client } = getTx();
      const { rows } = await client.query<{ indexname: string; indexdef: string }>(
        `SELECT indexname, indexdef FROM pg_indexes WHERE tablename IN ($1, $2)`,
        [HEADERS, ANSWERS],
      );
      const def = (name: string) => rows.find((r) => r.indexname === name)?.indexdef ?? `<missing ${name}>`;
      expect(def('claim_gi_answers_live_uq')).toMatch(/UNIQUE INDEX .* USING btree \(pariwar_id, ground_inspection_id, question_key\) WHERE \(superseded_at IS NULL\)$/);
      expect(def('claim_gi_answers_claim_idx')).toMatch(/USING btree \(pariwar_id, claim_case_id\)$/);
      // second review S20 — the visit's rows, superseded included (the as-of recompute; `live_uq` is partial)
      expect(def('claim_gi_answers_visit_idx')).toMatch(/USING btree \(pariwar_id, ground_inspection_id\)$/);
      expect(def('claim_gi_questionnaires_claim_idx')).toMatch(/USING btree \(pariwar_id, claim_case_id\)$/);
    });

    it('grants: header SELECT + INSERT only; answers + UPDATE on exactly the supersede and the scrub; the neighbours\' scrub widens', async () => {
      const { client } = getTx();
      const priv = async (t: string, p: string) =>
        (await client.query<{ ok: boolean }>(`SELECT has_table_privilege('twt_app', $1, $2) AS ok`, [t, p])).rows[0]!.ok;
      for (const t of [HEADERS, ANSWERS]) {
        expect(await priv(t, 'SELECT')).toBe(true);
        expect(await priv(t, 'INSERT')).toBe(true);
        expect(await priv(t, 'UPDATE')).toBe(false);
        expect(await priv(t, 'DELETE')).toBe(false);
        expect(await priv(t, 'TRUNCATE')).toBe(false);
      }
      const { rows } = await client.query<{ table_name: string; column_name: string }>(
        `SELECT table_name, column_name FROM information_schema.column_privileges
          WHERE grantee = 'twt_app' AND privilege_type = 'UPDATE' AND table_name IN ($1, $2, $3) ORDER BY table_name, column_name`,
        [HEADERS, ANSWERS, NEIGHBOURS],
      );
      expect(rows).toEqual([
        { table_name: ANSWERS, column_name: 'superseded_at' },
        { table_name: ANSWERS, column_name: 'value_ciphertext' },
        { table_name: ANSWERS, column_name: 'value_code_indexes' },
        { table_name: NEIGHBOURS, column_name: 'death_date_window_indexes' },
        { table_name: NEIGHBOURS, column_name: 'superseded_at' },
        { table_name: NEIGHBOURS, column_name: 'value_ciphertext' },
        { table_name: NEIGHBOURS, column_name: 'value_code_indexes' },
      ]);
    });

    it('RLS is ENABLED + FORCED with per-command policies (⛔ DELETE, ⛔ FOR ALL)', async () => {
      const { client } = getTx();
      const { rows } = await client.query<{ relname: string; on: boolean; forced: boolean }>(
        `SELECT relname, relrowsecurity AS on, relforcerowsecurity AS forced FROM pg_class WHERE relname IN ($1, $2) ORDER BY relname`,
        [HEADERS, ANSWERS],
      );
      expect(rows).toEqual([
        { relname: ANSWERS, on: true, forced: true },
        { relname: HEADERS, on: true, forced: true },
      ]);
      const pol = await client.query<{ tablename: string; cmd: string }>(
        `SELECT tablename, cmd FROM pg_policies WHERE tablename IN ($1, $2) ORDER BY tablename, cmd`,
        [HEADERS, ANSWERS],
      );
      expect(pol.rows).toEqual([
        { tablename: ANSWERS, cmd: 'INSERT' },
        { tablename: ANSWERS, cmd: 'SELECT' },
        { tablename: ANSWERS, cmd: 'UPDATE' },
        { tablename: HEADERS, cmd: 'INSERT' },
        { tablename: HEADERS, cmd: 'SELECT' },
      ]);
    });
  });

  describe('the guard — an OPEN visit (scheduled, ⛔ a certificate_check) in the answer window', () => {
    it('admits a header and answers on a scheduled initial / corroboration visit in the window', async () => {
      const { client } = getTx();
      const a = await seedInspection(client, PARIWAR_A);
      const b = await seedInspection(client, PARIWAR_A, { stage: 'corroboration' });
      await enterAppScope(client, PARIWAR_A);
      for (const s of [a, b]) {
        expect((await attempt(client, INSERT_HEADER, headerParams(s))).code).toBeNull();
        expect((await attempt(client, INSERT_ANSWER, answerParams(s, 'head_letter', LETTER))).code).toBeNull();
        expect((await attempt(client, INSERT_ANSWER, answerParams(s, 'death_cause', CAUSE))).code).toBeNull();
      }
    });

    it('refuses a header on a completed / superseded / refused / certificate_check assignment, or outside the window (23000)', async () => {
      const { client } = getTx();
      const cases = [
        await seedInspection(client, PARIWAR_A, { status: 'completed' }),
        await seedInspection(client, PARIWAR_A, { status: 'superseded' }),
        await seedInspection(client, PARIWAR_A, { status: 'photo_refused' }),
        await seedInspection(client, PARIWAR_A, { status: 'evidence_unavailable' }),
        await seedInspection(client, PARIWAR_A, { stage: 'certificate_check' }),
        await seedInspection(client, PARIWAR_A, { claimState: 'closed' }),
        await seedInspection(client, PARIWAR_A, { claimState: 'intake_pending' }),
      ];
      await enterAppScope(client, PARIWAR_A);
      for (const s of cases) {
        const r = await attempt(client, INSERT_HEADER, headerParams(s));
        expect(r.code, s.groundInspectionId).toBe('23000');
        expect(r.message).toMatch(NOT_OPEN);
      }
    });

    it('refuses an ANSWER once the visit completes or the claim leaves the window (the header already exists)', async () => {
      const { client } = getTx();
      const s = await seedInspection(client, PARIWAR_A);
      await seedHeader(client, s);
      await client.query(`UPDATE claim_ground_inspections SET status = 'superseded' WHERE ground_inspection_id = $1`, [s.groundInspectionId]);
      await enterAppScope(client, PARIWAR_A);
      const r = await attempt(client, INSERT_ANSWER, answerParams(s, 'head_letter', LETTER));
      expect(r.code).toBe('23000');
      expect(r.message).toMatch(NOT_OPEN);
    });

    it('refuses a header naming a peer_mesh version; an answer with ⛔ header (FK)', async () => {
      const { client } = getTx();
      const s = await seedInspection(client, PARIWAR_A);
      await enterAppScope(client, PARIWAR_A);
      expect((await attempt(client, INSERT_HEADER, headerParams(s, 'peer_mesh.v4'))).message).toMatch(/claim_gi_questionnaires_version_check/);
      expect((await attempt(client, INSERT_ANSWER, answerParams(s, 'head_letter', LETTER))).code).toBe('23503');
    });
  });

  describe('the answers — CHECKs, ONE live row, append-only', () => {
    it('the CHECKs refuse a PLAINTEXT cause / illness, indexes on the letter, indexes without a ciphertext, empty indexes', async () => {
      const { client } = getTx();
      const s = await seedInspection(client, PARIWAR_A);
      await seedHeader(client, s);
      await enterAppScope(client, PARIWAR_A);
      expect((await attempt(client, INSERT_ANSWER, answerParams(s, 'death_cause', { codes: ['accident'] }))).message).toMatch(/sensitive_encrypted_check/);
      expect((await attempt(client, INSERT_ANSWER, answerParams(s, 'death_illness', { codes: ['tb'] }))).message).toMatch(/sensitive_encrypted_check/);
      expect((await attempt(client, INSERT_ANSWER, answerParams(s, 'head_letter', { cipher: 'enc:v1:x', indexes: ['i'] }))).message).toMatch(/code_indexes_check/);
      expect((await attempt(client, INSERT_ANSWER, answerParams(s, 'death_cause', { codes: ['x'], indexes: ['i'] }))).message).toMatch(/check/);
      expect((await attempt(client, INSERT_ANSWER, answerParams(s, 'death_cause', { cipher: 'enc:v1:x', indexes: [] }))).message).toMatch(/code_indexes_check/);
      expect((await attempt(client, INSERT_ANSWER, answerParams(s, 'head_letter', { codes: ['collected'], cipher: 'enc:v1:x' }))).message).toMatch(/one_value_check/);
      // "I don't know" ⇒ a ciphertext with NULL indexes is admitted
      expect((await attempt(client, INSERT_ANSWER, answerParams(s, 'death_cause', { cipher: 'enc:v1:dk', indexes: null }))).code).toBeNull();
    });

    it('⭐ second review S18 — the letter is ONE of its ruled codes (LOCKSTEP with HEAD_LETTER_CODES)', async () => {
      const { client } = getTx();
      const s = await seedInspection(client, PARIWAR_A);
      await seedHeader(client, s);
      await enterAppScope(client, PARIWAR_A);
      for (const codes of [['refused'], ['collected', 'not_collected'], ['collected', 'collected']]) {
        expect((await attempt(client, INSERT_ANSWER, answerParams(s, 'head_letter', { codes }))).message, codes.join(',')).toMatch(/head_letter_codes_check/);
      }
      expect((await attempt(client, INSERT_ANSWER, answerParams(s, 'head_letter', { cipher: 'enc:v1:x' }))).message).toMatch(/head_letter_codes_check/);
      expect((await attempt(client, INSERT_ANSWER, answerParams(s, 'head_letter', { codes: ['not_collected'] }))).code).toBeNull();
      const { rows } = await client.query<{ def: string }>(
        `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = 'claim_gi_answers_head_letter_codes_check'`,
      );
      const named = [...rows[0]!.def.matchAll(/'([a-z_]+)'::text/g)].map((m) => m[1]).filter((c) => c !== 'head_letter');
      expect(new Set(named)).toEqual(new Set(HEAD_LETTER_CODES));
    });

    it('⭐ second review S18 — a row is ⛔ INSERTED already superseded or saved in the future; ⛔ a supersede stamped in the future', async () => {
      const { client } = getTx();
      const s = await seedInspection(client, PARIWAR_A);
      await seedHeader(client, s);
      await enterAppScope(client, PARIWAR_A);
      const NOW_LIVE = /a new answer is live, saved now/;
      const insertWith = (col: 'superseded_at' | 'saved_at', at: string) =>
        attempt(
          client,
          `INSERT INTO ${ANSWERS} (pariwar_id, claim_case_id, ground_inspection_id, question_key, value_codes, saved_by_actor_id, ${col})
           VALUES ($1, $2, $3, 'head_letter', ARRAY['collected'], 'inspector', ${at})`,
          [s.pariwarId, s.claimCaseId, s.groundInspectionId],
        );
      expect((await insertWith('superseded_at', 'clock_timestamp()')).message).toMatch(NOW_LIVE);
      expect((await insertWith('saved_at', `clock_timestamp() + interval '1 hour'`)).message).toMatch(NOW_LIVE);
      // a stamp in the PAST is the DB clock's earlier reading — admitted (the column's default is `clock_timestamp()`)
      expect((await insertWith('saved_at', `clock_timestamp() - interval '1 minute'`)).rowCount).toBe(1);
      // (superseded at once — the next leg saves the letter live again; ONE live row per key)
      await client.query(`UPDATE ${ANSWERS} SET superseded_at = clock_timestamp() WHERE ground_inspection_id = $1 AND question_key = 'head_letter' AND superseded_at IS NULL`, [
        s.groundInspectionId,
      ]);
      const letter = randomUUID();
      await client.query(INSERT_ANSWER, answerParams(s, 'head_letter', LETTER, letter));
      const future = await attempt(client, `UPDATE ${ANSWERS} SET superseded_at = clock_timestamp() + interval '1 hour' WHERE answer_id = $1`, [letter]);
      expect(future.message).toMatch(/superseded now, ⛔ in the future/);
      expect((await attempt(client, `UPDATE ${ANSWERS} SET superseded_at = clock_timestamp() WHERE answer_id = $1`, [letter])).rowCount).toBe(1);
    });

    it('ONE live answer per (assignment, key); a superseded one does not count', async () => {
      const { client } = getTx();
      const s = await seedInspection(client, PARIWAR_A);
      await seedHeader(client, s);
      await enterAppScope(client, PARIWAR_A);
      const first = randomUUID();
      expect((await attempt(client, INSERT_ANSWER, answerParams(s, 'head_letter', LETTER, first))).code).toBeNull();
      expect((await attempt(client, INSERT_ANSWER, answerParams(s, 'head_letter', { codes: ['not_collected'] }))).code).toBe('23505');
      expect((await attempt(client, `UPDATE ${ANSWERS} SET superseded_at = clock_timestamp() WHERE answer_id = $1`, [first])).rowCount).toBe(1);
      expect((await attempt(client, INSERT_ANSWER, answerParams(s, 'head_letter', { codes: ['not_collected'] }))).code).toBeNull();
    });

    it('append-only: a superseded row is ⛔ un-superseded; ⛔ an UPDATE of the codes (the grant), ⛔ an indexes rewrite to a value', async () => {
      const { client } = getTx();
      const s = await seedInspection(client, PARIWAR_A);
      await seedHeader(client, s);
      await enterAppScope(client, PARIWAR_A);
      const letter = randomUUID();
      const cause = randomUUID();
      await client.query(INSERT_ANSWER, answerParams(s, 'head_letter', LETTER, letter));
      await client.query(INSERT_ANSWER, answerParams(s, 'death_cause', CAUSE, cause));
      expect((await attempt(client, `UPDATE ${ANSWERS} SET value_codes = ARRAY['not_collected'] WHERE answer_id = $1`, [letter])).code).toBe('42501');
      const rewrite = await attempt(client, `UPDATE ${ANSWERS} SET value_code_indexes = ARRAY['idx:other'] WHERE answer_id = $1`, [cause]);
      expect(rewrite.code).toBe('23000');
      expect(rewrite.message).toMatch(APPEND_ONLY);
      expect((await attempt(client, `UPDATE ${ANSWERS} SET value_ciphertext = NULL WHERE answer_id = $1`, [cause])).code).not.toBeNull();
      await client.query(`UPDATE ${ANSWERS} SET superseded_at = clock_timestamp() WHERE answer_id = $1`, [letter]);
      expect((await attempt(client, `UPDATE ${ANSWERS} SET superseded_at = NULL WHERE answer_id = $1`, [letter])).message).toMatch(APPEND_ONLY);
      expect((await attempt(client, `DELETE FROM ${ANSWERS} WHERE answer_id = $1`, [letter])).code).toBe('42501');
      expect((await attempt(client, `DELETE FROM ${HEADERS} WHERE ground_inspection_id = $1`, [s.groundInspectionId])).code).toBe('42501');
    });

    it('the ERASURE ARM admits the scrub (ciphertext → sentinel, indexes → NULL) — on a COMPLETED visit too (⛔ state condition, RECORDED)', async () => {
      const { client } = getTx();
      const s = await seedInspection(client, PARIWAR_A);
      await seedHeader(client, s);
      const cause = randomUUID();
      await client.query(INSERT_ANSWER, answerParams(s, 'death_cause', CAUSE, cause));
      await client.query(
        `UPDATE claim_ground_inspections SET status = 'completed', completed_at = clock_timestamp(), original_certificate_verdict = 'matches',
           compared_certificate_upload_id = $2, death_date_ciphertext = 'enc:v1:d', death_date_source = 'family_statement',
           death_date_index = 'idx:d'
         WHERE ground_inspection_id = $1`,
        [s.groundInspectionId, s.uploadId],
      );
      await enterAppScope(client, PARIWAR_A);
      const scrub = await attempt(client, `UPDATE ${ANSWERS} SET value_ciphertext = 'enc:v1:sentinel', value_code_indexes = NULL WHERE claim_case_id = $1 AND value_ciphertext IS NOT NULL`, [
        s.claimCaseId,
      ]);
      expect(scrub).toMatchObject({ code: null, rowCount: 1 });
      const { rows } = await client.query<{ c: string; i: string[] | null }>(`SELECT value_ciphertext AS c, value_code_indexes AS i FROM ${ANSWERS} WHERE answer_id = $1`, [cause]);
      expect(rows).toEqual([{ c: 'enc:v1:sentinel', i: null }]);
    });
  });

  describe('TR14 — the neighbours\' REPLACED guard admits the code-index scrub', () => {
    async function seedNeighbourCause(client: Client) {
      const { tx } = getTx();
      const claimCaseId = await seedClaim(tx, PARIWAR_A, { currentState: 'verification_in_progress' as never });
      const selectionId = randomUUID();
      const memberId = randomUUID();
      await client.query(
        `INSERT INTO claim_peer_mesh_selections (selection_id, claim_case_id, pariwar_id, deceased_member_id, deceased_created_at, metric_id,
           metric_version, selected_member_ids, candidate_snapshot, response_window_expires_at)
         VALUES ($1, $2, $3, $4, now(), 'm', 1, ARRAY[$5]::uuid[], '[]'::jsonb, now() + interval '72 hours')`,
        [selectionId, claimCaseId, PARIWAR_A, randomUUID(), memberId],
      );
      const pingId = randomUUID();
      await client.query(`INSERT INTO claim_peer_mesh_pings (ping_id, selection_id, pariwar_id, member_id) VALUES ($1, $2, $3, $4)`, [pingId, selectionId, PARIWAR_A, memberId]);
      const replyId = randomUUID();
      await client.query(
        `INSERT INTO claim_peer_mesh_replies (reply_id, pariwar_id, claim_case_id, selection_id, ping_id, responder_member_id, questionnaire_version_id)
         VALUES ($1, $2, $3, $4, $5, $6, 'peer_mesh.v4')`,
        [replyId, PARIWAR_A, claimCaseId, selectionId, pingId, memberId],
      );
      const answerId = randomUUID();
      await client.query(
        `INSERT INTO ${NEIGHBOURS} (answer_id, pariwar_id, claim_case_id, reply_id, question_key, value_ciphertext, value_code_indexes, saved_via, saved_by_actor_id)
         VALUES ($1, $2, $3, $4, 'death_cause', 'enc:v1:c', ARRAY['idx:a'], 'member_app', 'm')`,
        [answerId, PARIWAR_A, claimCaseId, replyId],
      );
      return { claimCaseId, answerId };
    }

    it('the RTBF scrub of a neighbour row CARRYING code indexes succeeds (all three erasure columns in ONE statement)', async () => {
      const { client } = getTx();
      const n = await seedNeighbourCause(client);
      await enterAppScope(client, PARIWAR_A);
      const scrub = await attempt(
        client,
        `UPDATE ${NEIGHBOURS} SET value_ciphertext = 'enc:v1:sentinel', death_date_window_indexes = NULL, value_code_indexes = NULL WHERE claim_case_id = $1 AND value_ciphertext IS NOT NULL`,
        [n.claimCaseId],
      );
      expect(scrub).toMatchObject({ code: null, rowCount: 1 });
    });

    it('a NON-NULL rewrite of the neighbours\' code indexes is refused; the CHECK refuses indexes on another key', async () => {
      const { client } = getTx();
      const n = await seedNeighbourCause(client);
      await enterAppScope(client, PARIWAR_A);
      const r = await attempt(client, `UPDATE ${NEIGHBOURS} SET value_code_indexes = ARRAY['idx:b'] WHERE answer_id = $1`, [n.answerId]);
      expect(r.code).toBe('23000');
      expect(r.message).toMatch(APPEND_ONLY);
      const { rows } = await client.query<{ def: string }>(
        `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = 'claim_peer_mesh_reply_answers_code_indexes_check'`,
      );
      expect(rows[0]!.def).toMatch(/'death_cause'::text, 'death_illness'::text/);
    });
  });

  describe('RLS', () => {
    it('a cross-tenant reader sees nothing; the unscoped probe sees nothing; a cross-tenant insert is refused', async () => {
      const { client } = getTx();
      const s = await seedInspection(client, PARIWAR_A);
      await seedHeader(client, s);
      await client.query(INSERT_ANSWER, answerParams(s, 'head_letter', LETTER));
      await enterAppScope(client, PARIWAR_B);
      expect((await client.query(`SELECT 1 FROM ${HEADERS} WHERE ground_inspection_id = $1`, [s.groundInspectionId])).rowCount).toBe(0);
      expect((await client.query(`SELECT 1 FROM ${ANSWERS} WHERE ground_inspection_id = $1`, [s.groundInspectionId])).rowCount).toBe(0);
      // the trigger cannot see the parent in B's scope ⇒ refused before RLS's WITH CHECK
      expect((await attempt(client, INSERT_ANSWER, answerParams(s, 'death_cause', CAUSE))).code).not.toBeNull();
      await client.query('RESET ROLE');
      await enterAppRoleNoScope(client);
      expect((await client.query(`SELECT 1 FROM ${ANSWERS} WHERE ground_inspection_id = $1`, [s.groundInspectionId])).rowCount).toBe(0);
    });
  });
});
