// Migration 0160 — the inspector's discrepancy showings and re-ask notes (Story 6.27d, Task 1.5; AC5, AC6, AC8).
// Live DB; per-test ROLLBACK. Every refusal runs under a SAVEPOINT so one test can assert several.
//   · the catalog: the inspection's ownership UNIQUE (0157's form), both tables' composite FKs `ON DELETE CASCADE`, the
//     CHECKs (lockstep with the compared keys), ⛔ no DEFERRABLE constraint, the indexes;
//   · grants: showings SELECT + INSERT only; notes SELECT + INSERT + a column UPDATE on `note_ciphertext` (the scrub) —
//     ⛔ no DELETE, ⛔ no table-wide UPDATE;
//   · the parent guard (a): a row whose inspection is ⛔ `completed` + `family_statement` is refused (scheduled,
//     superseded, the two refusals, a `certificate_check`, a pre-0147 completed row with a NULL source); a note whose key
//     is ⛔ in the showing, or with ⛔ no showing, is refused;
//   · the showings (b): UPDATE refused, DELETE only by cascade, TRUNCATE refused; the notes (c): the erasure arm admits a
//     ciphertext-only rewrite and refuses every other change (and a NULL), DELETE only by cascade, TRUNCATE refused —
//     TRUNCATE through the binding + a temp twin, ⛔ never a live TRUNCATE;
//   · RLS: ENABLED + FORCED, per-command policies, a cross-tenant reader sees nothing, the cross-tenant insert refused by
//     the TRIGGER (it cannot see the parent) before RLS's WITH CHECK, the unscoped probe sees nothing.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { INSPECTION_DISCREPANCY_COMPARED_KEYS } from '../../../src/claim/inspection-discrepancy.js';
import { INSPECTION_DISCREPANCY_QUESTION_KEYS } from '../../../src/schema/claim_ground_inspection_discrepancies.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { enterAppRoleNoScope, enterAppScope, PARIWAR_A, PARIWAR_B, seedClaim, seedDeathCertificate } from '../_helpers.js';
import { forceLegacyCompletedNullSource, shadowAsCompletedFullVisit } from '../claim/_inspection-discrepancy-fixtures.js';

type Client = ReturnType<typeof getTx>['client'];

const SHOWINGS = 'claim_ground_inspection_discrepancy_showings';
const NOTES = 'claim_ground_inspection_discrepancy_notes';
/** The derived identifiers' prefixes (a table-name prefix would pass Postgres's 63-byte identifier limit). */
const SP = 'claim_gi_discrepancy_showings';
const NP = 'claim_gi_discrepancy_notes';

/** Run `text` under a SAVEPOINT; return the SQLSTATE (or null on success) and roll the savepoint back on failure. */
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
}

/** As the superuser: a claim, its current certificate, and ONE inspection row in `status` / `stage` (raw — the writers'
 *  own rules are 6.26a's; this spec pins the DB's). A completed row carries its 0147 death facts. */
async function seedInspection(
  client: Client,
  pariwarId: string,
  opts: { status?: string; stage?: 'initial' | 'corroboration' | 'certificate_check'; claimCaseId?: string } = {},
): Promise<Seeded> {
  const { tx } = getTx();
  const claimCaseId = opts.claimCaseId ?? (await seedClaim(tx, pariwarId));
  const { uploadId } = await seedDeathCertificate(client, { pariwarId, claimCaseId });
  const status = opts.status ?? 'completed';
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
  return { pariwarId, claimCaseId, groundInspectionId };
}

const INSERT_SHOWING = `INSERT INTO ${SHOWINGS} (pariwar_id, claim_case_id, ground_inspection_id, question_keys) VALUES ($1, $2, $3, $4)`;
const INSERT_NOTE = `INSERT INTO ${NOTES} (pariwar_id, claim_case_id, ground_inspection_id, question_key, note_ciphertext, author_actor_id, author_display)
  VALUES ($1, $2, $3, $4, $5, $6, $7)`;

const showingParams = (s: Seeded, keys: string[]) => [s.pariwarId, s.claimCaseId, s.groundInspectionId, keys];
const noteParams = (s: Seeded, key: string, over: { cipher?: string | null; author?: string; display?: string } = {}) => [
  s.pariwarId,
  s.claimCaseId,
  s.groundInspectionId,
  key,
  over.cipher === undefined ? 'enc:v1:note' : over.cipher,
  over.author ?? 'inspector',
  over.display ?? 'Inspector One',
];

const NOT_A_FULL_VISIT = /the inspection is not a completed full visit in scope/;
const NOT_SHOWN = /the question was not shown as a difference/;

describe.skipIf(!hasDatabase)('0160 — the discrepancy showings and notes', { timeout: 20000 }, () => {
  setupLiveDb();

  describe('the catalog', () => {
    it('the ownership UNIQUE; both tables\' composite FKs cascade from the inspection AND the claim; ⛔ no DEFERRABLE constraint', async () => {
      const { client } = getTx();
      const { rows } = await client.query<{ conname: string; def: string; deferrable: boolean }>(
        `SELECT conname, pg_get_constraintdef(oid) AS def, condeferrable AS deferrable FROM pg_constraint
          WHERE conrelid IN ('claim_ground_inspections'::regclass, '${SHOWINGS}'::regclass, '${NOTES}'::regclass)`,
      );
      const def = (n: string) => rows.find((r) => r.conname === n)?.def ?? `<missing ${n}>`;
      expect(def('claim_ground_inspections_owner_uq')).toBe('UNIQUE (pariwar_id, ground_inspection_id, claim_case_id)');
      for (const t of [SP, NP]) {
        expect(def(`${t}_inspection_fk`)).toBe(
          'FOREIGN KEY (pariwar_id, ground_inspection_id, claim_case_id) REFERENCES claim_ground_inspections(pariwar_id, ground_inspection_id, claim_case_id) ON DELETE CASCADE',
        );
        expect(def(`${t}_claim_case_fk`)).toBe('FOREIGN KEY (pariwar_id, claim_case_id) REFERENCES claims(pariwar_id, claim_case_id) ON DELETE CASCADE');
      }
      expect(def(`${SHOWINGS}_pkey`)).toBe('PRIMARY KEY (ground_inspection_id)');
      expect(def(`${NP}_question_uq`)).toBe('UNIQUE (ground_inspection_id, question_key)');
      // ⭐ Story 6.32 (AC6 / AC11 — RED BY DESIGN): 0188 widened both CHECKs to the four compared keys (③ cause, ④ illness).
      expect(def(`${NP}_question_key_check`)).toMatch(/question_key = ANY \(ARRAY\['has_died'::text, 'death_date'::text, 'death_cause'::text, 'death_illness'::text\]\)/);
      expect(def(`${SP}_question_keys_check`)).toMatch(/question_keys <@ ARRAY\['has_died'::text, 'death_date'::text, 'death_cause'::text, 'death_illness'::text\]/);
      expect(rows.filter((r) => (r.conname.startsWith('claim_gi_discrepancy') || r.conname.startsWith('claim_ground_inspection_discrepancy')) && r.deferrable)).toEqual([]);
    });

    it('the CHECKs\' keys are LOCKSTEP with the schema constant and the comparison\'s compared keys', () => {
      expect([...INSPECTION_DISCREPANCY_QUESTION_KEYS]).toEqual(['has_died', 'death_date', 'death_cause', 'death_illness']); // Story 6.32 (AC6)
      expect([...INSPECTION_DISCREPANCY_COMPARED_KEYS]).toEqual([...INSPECTION_DISCREPANCY_QUESTION_KEYS]);
    });

    it('the claim indexes (the staff view and the scrub read per claim)', async () => {
      const { client } = getTx();
      const { rows } = await client.query<{ indexname: string; indexdef: string }>(
        `SELECT indexname, indexdef FROM pg_indexes WHERE tablename IN ($1, $2)`,
        [SHOWINGS, NOTES],
      );
      const def = (name: string) => rows.find((r) => r.indexname === name)?.indexdef ?? `<missing ${name}>`;
      expect(def(`${SP}_claim_idx`)).toMatch(/USING btree \(pariwar_id, claim_case_id\)$/);
      expect(def(`${NP}_claim_idx`)).toMatch(/USING btree \(pariwar_id, claim_case_id\)$/);
    });

    it('grants: showings SELECT + INSERT only; notes SELECT + INSERT + UPDATE(note_ciphertext) only; ⛔ DELETE anywhere', async () => {
      const { client } = getTx();
      const priv = async (t: string, p: string) =>
        (await client.query<{ ok: boolean }>(`SELECT has_table_privilege('twt_app', $1, $2) AS ok`, [t, p])).rows[0]!.ok;
      const colPriv = async (t: string, c: string) =>
        (await client.query<{ ok: boolean }>(`SELECT has_column_privilege('twt_app', $1, $2, 'UPDATE') AS ok`, [t, c])).rows[0]!.ok;
      for (const t of [SHOWINGS, NOTES]) {
        expect(await priv(t, 'SELECT')).toBe(true);
        expect(await priv(t, 'INSERT')).toBe(true);
        expect(await priv(t, 'UPDATE')).toBe(false);
        expect(await priv(t, 'DELETE')).toBe(false);
        expect(await priv(t, 'TRUNCATE')).toBe(false);
      }
      expect(await colPriv(SHOWINGS, 'question_keys')).toBe(false);
      expect(await colPriv(NOTES, 'note_ciphertext')).toBe(true);
      for (const c of ['question_key', 'author_actor_id', 'author_display', 'noted_at', 'ground_inspection_id']) {
        expect(await colPriv(NOTES, c), c).toBe(false);
      }
      // ⭐ R2-19 — the WHOLE column-UPDATE set, ⛔ a column list: exactly the scrub's one column on either table.
      const { rows } = await client.query<{ table_name: string; column_name: string }>(
        `SELECT table_name, column_name FROM information_schema.column_privileges
          WHERE grantee = 'twt_app' AND privilege_type = 'UPDATE' AND table_name IN ($1, $2) ORDER BY table_name, column_name`,
        [SHOWINGS, NOTES],
      );
      expect(rows).toEqual([{ table_name: NOTES, column_name: 'note_ciphertext' }]);
    });
  });

  describe('the parent guard (a) — a completed FULL visit (`family_statement`) only', () => {
    it('admits a showing (incl. an EMPTY one) and a note whose key the showing carried', async () => {
      const { client } = getTx();
      const s = await seedInspection(client, PARIWAR_A);
      const empty = await seedInspection(client, PARIWAR_A);
      await enterAppScope(client, PARIWAR_A);
      expect((await attempt(client, INSERT_SHOWING, showingParams(s, ['has_died', 'death_date']))).code).toBeNull();
      expect((await attempt(client, INSERT_SHOWING, showingParams(empty, []))).code).toBeNull();
      expect((await attempt(client, INSERT_NOTE, noteParams(s, 'has_died'))).code).toBeNull();
      expect((await attempt(client, INSERT_NOTE, noteParams(s, 'death_date'))).code).toBeNull();
      const { rows } = await client.query<{ shown_at: Date; question_keys: string[] }>(
        `SELECT shown_at, question_keys FROM ${SHOWINGS} WHERE ground_inspection_id = $1`,
        [empty.groundInspectionId],
      );
      expect(rows).toEqual([{ shown_at: expect.any(Date), question_keys: [] }]);
    });

    it('refuses a showing whose inspection is scheduled / superseded / refused / a certificate_check (23000)', async () => {
      const { client } = getTx();
      const cases = [
        await seedInspection(client, PARIWAR_A, { status: 'scheduled' }),
        await seedInspection(client, PARIWAR_A, { status: 'superseded' }),
        await seedInspection(client, PARIWAR_A, { status: 'photo_refused' }),
        await seedInspection(client, PARIWAR_A, { status: 'evidence_unavailable' }),
        await seedInspection(client, PARIWAR_A, { stage: 'certificate_check' }),
      ];
      await enterAppScope(client, PARIWAR_A);
      for (const s of cases) {
        const r = await attempt(client, INSERT_SHOWING, showingParams(s, []));
        expect(r.code, s.groundInspectionId).toBe('23000');
        expect(r.message).toMatch(NOT_A_FULL_VISIT);
        const n = await attempt(client, INSERT_NOTE, noteParams(s, 'has_died'));
        expect(n.code).toBe('23000');
        expect(n.message).toMatch(NOT_A_FULL_VISIT);
      }
    });

    it('refuses a showing AND a note whose inspection is a pre-0147 completed FULL row with a NULL source (R1 — keyed on the source, ⛔ the stage)', async () => {
      const { client } = getTx();
      const s = await seedInspection(client, PARIWAR_A, { status: 'scheduled' });
      await forceLegacyCompletedNullSource(client, s.pariwarId, s.groundInspectionId);
      const { rows } = await client.query(`SELECT status, inspection_stage, death_date_source FROM claim_ground_inspections WHERE ground_inspection_id = $1`, [
        s.groundInspectionId,
      ]);
      expect(rows).toEqual([{ status: 'completed', inspection_stage: 'initial', death_date_source: null }]);
      await enterAppScope(client, PARIWAR_A);
      const r = await attempt(client, INSERT_SHOWING, showingParams(s, ['has_died']));
      expect(r.code).toBe('23000');
      expect(r.message).toMatch(NOT_A_FULL_VISIT);
      const n = await attempt(client, INSERT_NOTE, noteParams(s, 'has_died'));
      expect(n.code).toBe('23000');
      expect(n.message).toMatch(NOT_A_FULL_VISIT);
      // ⭐ R2-5 positive control — the SAME shadow row, its source now `family_statement`: BOTH guards admit it, so the two
      // refusals above came from the NULL source, ⛔ from the public row (still `scheduled`).
      await client.query('RESET ROLE');
      await shadowAsCompletedFullVisit(client, s.pariwarId, s.groundInspectionId);
      await enterAppScope(client, PARIWAR_A);
      expect((await attempt(client, INSERT_SHOWING, showingParams(s, ['has_died']))).code).toBeNull();
      expect((await attempt(client, INSERT_NOTE, noteParams(s, 'has_died'))).code).toBeNull();
    });

    it('refuses a showing that names ANOTHER claim than its inspection\'s (same tenant)', async () => {
      const { client } = getTx();
      const s = await seedInspection(client, PARIWAR_A);
      const other = await seedInspection(client, PARIWAR_A);
      await enterAppScope(client, PARIWAR_A);
      const r = await attempt(client, INSERT_SHOWING, [s.pariwarId, other.claimCaseId, s.groundInspectionId, []]);
      expect(r.code).toBe('23000');
      expect(r.message).toMatch(NOT_A_FULL_VISIT);
    });

    it('refuses a note whose key is ⛔ in the showing, and a note with ⛔ no showing at all', async () => {
      const { client } = getTx();
      const s = await seedInspection(client, PARIWAR_A);
      const none = await seedInspection(client, PARIWAR_A);
      await enterAppScope(client, PARIWAR_A);
      await client.query(INSERT_SHOWING, showingParams(s, ['death_date']));
      const wrongKey = await attempt(client, INSERT_NOTE, noteParams(s, 'has_died'));
      expect(wrongKey.code).toBe('23000');
      expect(wrongKey.message).toMatch(NOT_SHOWN);
      const noShowing = await attempt(client, INSERT_NOTE, noteParams(none, 'death_date'));
      expect(noShowing.code).toBe('23000');
      expect(noShowing.message).toMatch(NOT_SHOWN);
    });
  });

  describe('the CHECKs and the uniques', () => {
    it('a showing key outside the compared set; a blank author or display; a NULL note; a second showing / note', async () => {
      const { client } = getTx();
      const s = await seedInspection(client, PARIWAR_A);
      await enterAppScope(client, PARIWAR_A);
      // ⭐ Story 6.32 (AC6): ③ / ④ are compared keys now (0188) — a key outside the FOUR is refused.
      expect((await attempt(client, INSERT_SHOWING, showingParams(s, ['how_known']))).code).toBe('23514');
      expect((await attempt(client, INSERT_SHOWING, showingParams(s, ['has_died']))).code).toBeNull();
      // ONE showing per assignment — the idempotent writer's `ON CONFLICT DO NOTHING` resolves to 0 rows.
      expect((await attempt(client, INSERT_SHOWING, showingParams(s, ['has_died']))).code).toBe('23505');
      expect((await attempt(client, `${INSERT_SHOWING} ON CONFLICT (ground_inspection_id) DO NOTHING`, showingParams(s, []))).rowCount).toBe(0);
      expect((await attempt(client, INSERT_NOTE, noteParams(s, 'has_died', { author: '  ' }))).code).toBe('23514');
      expect((await attempt(client, INSERT_NOTE, noteParams(s, 'has_died', { display: ' ' }))).code).toBe('23514');
      expect((await attempt(client, INSERT_NOTE, noteParams(s, 'has_died', { cipher: null }))).code).toBe('23502');
      expect((await attempt(client, INSERT_NOTE, noteParams(s, 'has_died'))).code).toBeNull();
      // ONCE per (assignment, question) — the 23505 backstop behind the writer's pre-check.
      expect((await attempt(client, INSERT_NOTE, noteParams(s, 'has_died', { author: 'someone-else' }))).code).toBe('23505');
    });
  });

  describe('the showings (b) — ⛔ never changed, deleted only by cascade', () => {
    it('UPDATE: twt_app has ⛔ no grant (42501); the superuser is refused by the trigger (23000)', async () => {
      const { client } = getTx();
      const s = await seedInspection(client, PARIWAR_A);
      await client.query(INSERT_SHOWING, showingParams(s, ['has_died']));
      const upd = `UPDATE ${SHOWINGS} SET question_keys = '{}' WHERE ground_inspection_id = $1`;
      expect((await attempt(client, upd, [s.groundInspectionId])).code).toBe('23000');
      await client.query('SAVEPOINT role');
      await enterAppScope(client, PARIWAR_A);
      expect((await attempt(client, upd, [s.groundInspectionId])).code).toBe('42501');
      await client.query('ROLLBACK TO SAVEPOINT role');
    });

    it('DELETE: refused directly (23000), admitted by the inspection\'s and the claim\'s cascade', async () => {
      const { client } = getTx();
      const s = await seedInspection(client, PARIWAR_A);
      const t = await seedInspection(client, PARIWAR_A);
      for (const x of [s, t]) {
        await client.query(INSERT_SHOWING, showingParams(x, ['has_died']));
        await client.query(INSERT_NOTE, noteParams(x, 'has_died'));
      }
      expect((await attempt(client, `DELETE FROM ${SHOWINGS} WHERE ground_inspection_id = $1`, [s.groundInspectionId])).code).toBe('23000');
      expect((await attempt(client, `DELETE FROM ${NOTES} WHERE ground_inspection_id = $1`, [s.groundInspectionId])).code).toBe('23000');
      expect((await attempt(client, `DELETE FROM claim_ground_inspections WHERE ground_inspection_id = $1`, [s.groundInspectionId])).code).toBeNull();
      expect((await attempt(client, `DELETE FROM claims WHERE claim_case_id = $1`, [t.claimCaseId])).code).toBeNull();
      for (const tbl of [SHOWINGS, NOTES]) {
        const { rows } = await client.query(`SELECT 1 FROM ${tbl} WHERE ground_inspection_id = ANY($1)`, [[s.groundInspectionId, t.groundInspectionId]]);
        expect(rows, tbl).toEqual([]);
      }
    });

    it('⛔ TRUNCATE — both bindings, and each function refuses on a temp twin', async () => {
      const { client } = getTx();
      const { rows } = await client.query(
        `SELECT c.relname AS tbl, t.tgname, t.tgenabled, t.tgtype, p.proname AS fn FROM pg_trigger t
           JOIN pg_proc p ON p.oid = t.tgfoid JOIN pg_class c ON c.oid = t.tgrelid
          WHERE c.relname IN ($1, $2) AND t.tgname LIKE '%_no_truncate' ORDER BY c.relname`,
        [SHOWINGS, NOTES],
      );
      expect(rows).toEqual([
        { tbl: NOTES, tgname: `${NP}_no_truncate`, tgenabled: 'O', tgtype: 34, fn: `${NP}_reject_mutation` },
        { tbl: SHOWINGS, tgname: `${SP}_no_truncate`, tgenabled: 'O', tgtype: 34, fn: `${SP}_reject_mutation` },
      ]);
      for (const fn of [`${SP}_reject_mutation`, `${NP}_reject_mutation`]) {
        const twin = `gid_truncate_twin_${fn.length}`;
        await client.query(`CREATE TEMP TABLE ${twin} (id int) ON COMMIT DROP`);
        await client.query(`CREATE TRIGGER ${twin}_no_truncate BEFORE TRUNCATE ON ${twin} EXECUTE FUNCTION ${fn}()`);
        const r = await attempt(client, `TRUNCATE ${twin}`);
        expect(r.code, fn).toBe('23000');
      }
    });

    it('the parent guard is bound BEFORE INSERT on both tables; the mutation guards BEFORE UPDATE / DELETE', async () => {
      const { client } = getTx();
      const { rows } = await client.query<{ tgname: string; fn: string; tgtype: number; tgenabled: string }>(
        `SELECT t.tgname, p.proname AS fn, t.tgtype, t.tgenabled FROM pg_trigger t JOIN pg_proc p ON p.oid = t.tgfoid JOIN pg_class c ON c.oid = t.tgrelid
          WHERE c.relname IN ($1, $2) AND NOT t.tgisinternal ORDER BY t.tgname`,
        [SHOWINGS, NOTES],
      );
      // ⭐ R2-19 — the timing and the event, ⛔ the name alone: `tgtype` = ROW 1 | BEFORE 2 | INSERT 4 | DELETE 8 | UPDATE 16 |
      // TRUNCATE 32 ⇒ BEFORE INSERT ROW 7, BEFORE DELETE ROW 11, BEFORE UPDATE ROW 19, BEFORE TRUNCATE (statement) 34.
      expect(rows.map((r) => `${r.tgname}→${r.fn}:${r.tgtype}:${r.tgenabled}`)).toEqual([
        `${NP}_no_delete→${NP}_reject_mutation:11:O`,
        `${NP}_no_truncate→${NP}_reject_mutation:34:O`,
        `${NP}_no_update→${NP}_reject_mutation:19:O`,
        `${NP}_parent_guard→${NP}_guard:7:O`,
        `${SP}_no_delete→${SP}_reject_mutation:11:O`,
        `${SP}_no_truncate→${SP}_reject_mutation:34:O`,
        `${SP}_no_update→${SP}_reject_mutation:19:O`,
        `${SP}_parent_guard→${SP}_guard:7:O`,
      ]);
    });
  });

  describe('the notes (c) — the erasure arm (0143\'s form)', () => {
    it('IN SCOPE, twt_app runs the scrub (the per-command UPDATE policy + the column grant): a sentinel rewrite is admitted', async () => {
      const { client } = getTx();
      const s = await seedInspection(client, PARIWAR_A);
      await enterAppScope(client, PARIWAR_A);
      await client.query(INSERT_SHOWING, showingParams(s, ['has_died']));
      await client.query(INSERT_NOTE, noteParams(s, 'has_died'));
      const scrub = await client.query(
        `UPDATE ${NOTES} SET note_ciphertext = 'enc:v1:sentinel' WHERE pariwar_id = $1 AND claim_case_id = $2 AND note_ciphertext IS NOT NULL`,
        [PARIWAR_A, s.claimCaseId],
      );
      expect(scrub.rowCount).toBe(1);
      // A non-erasure column: ⛔ no column grant for twt_app.
      expect((await attempt(client, `UPDATE ${NOTES} SET author_display = 'X' WHERE ground_inspection_id = $1`, [s.groundInspectionId])).code).toBe('42501');
    });

    it('the trigger refuses every other change (as the superuser) and a NULL ciphertext', async () => {
      const { client } = getTx();
      const s = await seedInspection(client, PARIWAR_A);
      await client.query(INSERT_SHOWING, showingParams(s, ['has_died', 'death_date']));
      await client.query(INSERT_NOTE, noteParams(s, 'has_died'));
      for (const set of [
        `author_display = 'Someone Else'`,
        `author_actor_id = 'someone-else'`,
        `noted_at = noted_at - interval '1 day'`,
        `question_key = 'death_date'`,
        `note_ciphertext = 'enc:v1:other', author_display = 'Someone Else'`,
      ]) {
        const r = await attempt(client, `UPDATE ${NOTES} SET ${set} WHERE ground_inspection_id = $1`, [s.groundInspectionId]);
        expect(r.code, set).toBe('23000');
      }
      const nul = await attempt(client, `UPDATE ${NOTES} SET note_ciphertext = NULL WHERE ground_inspection_id = $1`, [s.groundInspectionId]);
      expect(nul.code).toBe('23000');
      // ⚠ RECORDED (0149's limit): the trigger cannot tell the scrub from any other writer of the ciphertext alone.
      expect((await attempt(client, `UPDATE ${NOTES} SET note_ciphertext = 'enc:v1:other' WHERE ground_inspection_id = $1`, [s.groundInspectionId])).code).toBeNull();
    });
  });

  describe('RLS', () => {
    it('RLS is ENABLED + FORCED; per-command policies (⛔ DELETE, ⛔ FOR ALL)', async () => {
      const { client } = getTx();
      for (const [t, prefix, cmds] of [
        [SHOWINGS, SP, ['insert:a', 'select:r']],
        [NOTES, NP, ['insert:a', 'select:r', 'update:w']],
      ] as const) {
        const { rows } = await client.query(`SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = $1`, [t]);
        expect(rows[0]).toEqual({ relrowsecurity: true, relforcerowsecurity: true });
        const pol = await client.query(`SELECT polname, polcmd FROM pg_policy WHERE polrelid = $1::regclass ORDER BY polname`, [t]);
        expect(pol.rows.map((r) => `${r.polname}:${r.polcmd}`)).toEqual(
          cmds.map((c) => `${prefix}_tenant_isolation_${c.split(':')[0]}:${c.split(':')[1]}`),
        );
      }
    });

    it('every policy is PERMISSIVE, TO twt_app only, and carries the ONE house scope expression (USING / WITH CHECK)', async () => {
      const { client } = getTx();
      const { rows } = await client.query<{ tablename: string; cmd: string; permissive: string; roles: string; qual: string | null; with_check: string | null }>(
        `SELECT tablename, cmd, permissive, array_to_string(roles, ',') AS roles, qual, with_check
           FROM pg_policies WHERE tablename IN ($1, $2) ORDER BY tablename, cmd`,
        [SHOWINGS, NOTES],
      );
      expect(rows.map((r) => `${r.tablename}:${r.cmd}:${r.permissive}:${r.roles}`)).toEqual([
        `${NOTES}:INSERT:PERMISSIVE:twt_app`,
        `${NOTES}:SELECT:PERMISSIVE:twt_app`,
        `${NOTES}:UPDATE:PERMISSIVE:twt_app`,
        `${SHOWINGS}:INSERT:PERMISSIVE:twt_app`,
        `${SHOWINGS}:SELECT:PERMISSIVE:twt_app`,
      ]);
      // ⭐ R2-19 — ONE expression everywhere it applies: SELECT / UPDATE USING and INSERT / UPDATE WITH CHECK; ⛔ a missing
      // clause (an INSERT policy loosened to `WITH CHECK (true)` would differ from the SELECT policy's USING).
      const scope = rows.find((r) => r.tablename === SHOWINGS && r.cmd === 'SELECT')!.qual;
      expect(scope).toMatch(/pariwar_id = \(?NULLIF\(current_setting\('app\.pariwar_id'::text, true\), ''::text\)\)?::uuid/);
      for (const r of rows) {
        const clauses = { SELECT: [r.qual], INSERT: [r.with_check], UPDATE: [r.qual, r.with_check] }[r.cmd as 'SELECT' | 'INSERT' | 'UPDATE'];
        for (const c of clauses) expect(c, `${r.tablename}:${r.cmd}`).toBe(scope);
        if (r.cmd === 'SELECT') expect(r.with_check).toBeNull();
        if (r.cmd === 'INSERT') expect(r.qual).toBeNull();
      }
    });

    it('the INSERT policy\'s WITH CHECK is LIVE: a parent the guard CAN see in another tenant is refused by RLS (42501)', async () => {
      const { client } = getTx();
      // The guard reads the parent by name; a connection-local shadow of Pariwar B's row (⛔ RLS on a temp table) lets the
      // guard PASS from Pariwar A's scope — so only the INSERT policy's WITH CHECK can refuse the row.
      const b = await seedInspection(client, PARIWAR_B, { status: 'scheduled' });
      await forceLegacyCompletedNullSource(client, b.pariwarId, b.groundInspectionId);
      await shadowAsCompletedFullVisit(client, b.pariwarId, b.groundInspectionId);
      await enterAppScope(client, PARIWAR_A);
      const r = await attempt(client, INSERT_SHOWING, showingParams(b, ['has_died']));
      expect(r.code).toBe('42501');
      expect(r.message).toMatch(/row-level security/);
      // The positive control — the SAME row from Pariwar B's own scope is admitted (the guard saw the shadow both times).
      await client.query('RESET ROLE');
      await enterAppScope(client, PARIWAR_B);
      expect((await attempt(client, INSERT_SHOWING, showingParams(b, ['has_died']))).code).toBeNull();
    });

    it('a cross-tenant reader sees nothing; a cross-tenant insert is refused by the TRIGGER; the unscoped probe sees nothing', async () => {
      const { client } = getTx();
      const s = await seedInspection(client, PARIWAR_A);
      await client.query(INSERT_SHOWING, showingParams(s, ['has_died']));
      await client.query(INSERT_NOTE, noteParams(s, 'has_died'));
      const other = await seedInspection(client, PARIWAR_A);
      await client.query('SAVEPOINT scope');
      await enterAppScope(client, PARIWAR_B);
      for (const t of [SHOWINGS, NOTES]) {
        expect((await client.query(`SELECT 1 FROM ${t} WHERE ground_inspection_id = $1`, [s.groundInspectionId])).rows, t).toHaveLength(0);
      }
      // Refused — by the parent guard, which cannot see Pariwar A's inspection from B's scope, before RLS's WITH CHECK would.
      const ins = await attempt(client, INSERT_SHOWING, showingParams(other, []));
      expect(ins.code).toBe('23000');
      expect(ins.message).toMatch(NOT_A_FULL_VISIT);
      // B's scrub reaches ⛔ nothing of A's.
      expect((await client.query(`UPDATE ${NOTES} SET note_ciphertext = 'x' WHERE claim_case_id = $1`, [s.claimCaseId])).rowCount).toBe(0);
      await client.query('ROLLBACK TO SAVEPOINT scope');
      await enterAppRoleNoScope(client);
      for (const t of [SHOWINGS, NOTES]) {
        expect((await client.query(`SELECT 1 FROM ${t} WHERE ground_inspection_id = $1`, [s.groundInspectionId])).rows, t).toHaveLength(0);
      }
    });
  });
});
