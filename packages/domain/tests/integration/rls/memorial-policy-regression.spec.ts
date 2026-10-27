// Migration 0182 — the family memorial's three tables: `memorial_submissions`, `memorial_review_decisions`,
// `memorial_withdrawals` (Story 11b.4, review R4 / R18; AI-6-5 family 5 — AC5, MA9, MA15).
//
// Until this spec the tables were exercised only THROUGH the API (three integration specs) and a mocked RTBF test: a dropped
// FORCE, a typo in a policy, a lost column grant, a dropped CHECK or the missing UPDATE policy of `-279` A12 (the RTBF scrub
// silently updating 0 rows) would each have shipped green. Everything here is asserted against the DATABASE ITSELF.
//   · structure — ENABLE + FORCE on all three; exactly the SELECT / INSERT / UPDATE policy per table (no DELETE, no ALL);
//     the privilege matrix (SELECT + INSERT; no DELETE or TRUNCATE; UPDATE on exactly the four Tier-1 ciphertext columns);
//     the unique constraints and the indexes by name.
//   · RLS — the owning Pariwar reads / inserts its own rows; another Pariwar sees NOTHING and cannot insert (42501);
//     with no scope SELECT returns 0 rows and an INSERT is refused (fail-closed); the per-command UPDATE policy admits the
//     scrub in scope and reaches no other tenant's row.
//   · the foreign keys — the composite supersede FK (the chain stays inside ONE pool), `supersedes_uq` (linear), the pool's
//     single root, the pool / claim / deceased-member FKs, and the decisions' / withdrawals' composite FK to the submission.
//   · every CHECK (thirteen: five on the submissions — 0183 adds the Send key's shape — four on the decisions, four on the
//     withdrawals — 0187 adds the `helpline` pair, Story 11b.4a Trap 7), each with a violating row that names the ONE constraint it trips, and a legal row of the same shape
//     that still inserts — plus the JSON-null spans `memorial_omissions_valid` once passed (R18).
//   · the column grants — a sweep of EVERY column: UPDATE is admitted on the four ciphertext columns and refused (42501) on
//     all the others; ⛔ no DELETE.
//   · a LIVE scrub as `twt_app` under FORCE RLS — rows updated > 0 and the ciphertext really changed, for all four columns,
//     directly AND through the real `anonymizeMember`.
//   · migration 0183 — the Send's `idempotency_key` ON the row: the partial UNIQUE index per pool (the replay's lookup and the
//     backstop an unlocked writer reaches), its shape CHECK, and the column grant (INSERT via the table grant; ⛔ UPDATE).
//
// Live DB only — skips when DATABASE_URL is unset. Per-test BEGIN/ROLLBACK (setupLiveDb). Seeds run as the Docker superuser
// BEFORE entering app scope; enforcement assertions `SET LOCAL ROLE twt_app` (see _helpers.ts). Every refusal runs under a
// SAVEPOINT so one test can assert several.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { decryptTier1, encryptTier1, parseEnvelope, serializeEnvelope } from '../../../src/encryption/envelope.js';
import { createFakeKmsProvider } from '../../../src/encryption/index.js';
import { MEMORIAL_FIELD_CLASS } from '../../../src/encryption/field-classes.js';
import { memberId as toMemberId } from '../../../src/ids/index.js';
import { ANONYMIZED_SENTINEL, anonymizeMember } from '../../../src/member/anonymize.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppRoleNoScope, enterAppScope, seedClaim, seedMember, seedPool } from '../_helpers.js';

type Client = ReturnType<typeof getTx>['client'];

const SUBMISSIONS = 'memorial_submissions';
const DECISIONS = 'memorial_review_decisions';
const WITHDRAWALS = 'memorial_withdrawals';
const TABLES = [SUBMISSIONS, DECISIONS, WITHDRAWALS] as const;

/** The only columns the app role may UPDATE (MA15) — the four Tier-1 ciphertext columns. */
const SCRUBBABLE: Readonly<Record<string, readonly string[]>> = {
  [SUBMISSIONS]: ['alt_text_ciphertext', 'body_ciphertext'],
  [DECISIONS]: ['internal_note_ciphertext'],
  [WITHDRAWALS]: ['internal_note_ciphertext'],
};

const GOOD_SPAN = '[{"field":"body","start":0,"end":3,"reason":"against_the_law"}]';
const ALT_SPAN = '[{"field":"altText","start":1,"end":4,"reason":"identifies_a_child"}]';

interface Outcome {
  code: string | null;
  message: string;
  rowCount: number;
}

/** Run `text` under a SAVEPOINT; return the SQLSTATE (or null on success) and roll the savepoint back on failure. */
async function attempt(client: Client, text: string, params: unknown[] = []): Promise<Outcome> {
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

function insertSql(table: string, row: Record<string, unknown>): { text: string; params: unknown[] } {
  const keys = Object.keys(row);
  return {
    text: `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(', ')})`,
    params: keys.map((k) => row[k]),
  };
}

const ins = (client: Client, table: string, row: Record<string, unknown>): Promise<Outcome> => {
  const q = insertSql(table, row);
  return attempt(client, q.text, q.params);
};

interface World {
  readonly pariwarId: string;
  readonly memberId: string;
  readonly claimCaseId: string;
  readonly poolId: string;
  /** The chain of versions seeded for it, oldest first (each supersedes the one before). */
  readonly versions: string[];
}

function submissionRow(w: World, over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    submission_id: randomUUID(),
    pariwar_id: w.pariwarId,
    pool_id: w.poolId,
    claim_case_id: w.claimCaseId,
    deceased_member_id: w.memberId,
    supersedes_submission_id: null,
    body_ciphertext: 'enc:v1:body',
    alt_text_ciphertext: null,
    photo_object_key: null,
    photo_mime: null,
    authorisation_copy_version: '2026-10-23.v1-pending-hi-review',
    authorisation_locale: 'hi',
    handover_recipient: 'latest',
    handover_nominee_ref: randomUUID(),
    ...over,
  };
}

function decisionRow(pariwarId: string, submissionId: string, over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    submission_id: submissionId,
    pariwar_id: pariwarId,
    action: 'approved',
    omissions: '[]',
    photo_left_out_reason: null,
    reason_code: null,
    internal_note_ciphertext: 'enc:v1:decision-note',
    actor_id: randomUUID(),
    actor_display: 'Panel Member',
    ...over,
  };
}

function withdrawalRow(pariwarId: string, submissionId: string, over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    submission_id: submissionId,
    pariwar_id: pariwarId,
    withdrawn_by: 'family',
    reason_code: null,
    internal_note_ciphertext: null,
    actor_id: randomUUID(),
    actor_display: null,
    ...over,
  };
}

/** As the superuser (before scope): a deceased member, their approved claim, its pool, and `versions` chained submissions. */
async function seedWorld(pariwarId: string, versions = 0): Promise<World> {
  const { tx, client } = getTx();
  const memberId = await seedMember(tx, pariwarId, { state: 'active' });
  const claimCaseId = await seedClaim(tx, pariwarId, { deceasedMemberId: memberId });
  const poolId = randomUUID();
  await seedPool(tx, pariwarId, { poolId, claimCaseId, poolCanonicalIdentifier: `P-2026-10-${poolId.slice(0, 8)}` });
  const w: World = { pariwarId, memberId, claimCaseId, poolId, versions: [] };
  for (let i = 0; i < versions; i += 1) {
    const q = insertSql(SUBMISSIONS, submissionRow(w, { supersedes_submission_id: w.versions[i - 1] ?? null }));
    const r = await client.query<{ submission_id: string }>(`${q.text} RETURNING submission_id`, q.params);
    w.versions.push(r.rows[0]!.submission_id);
  }
  return w;
}

/**
 * One tenant's whole footprint, as the superuser: a pool with TWO versions (a root R and the head H superseding it), R carrying
 * its decision AND the Trust's withdrawal of that approval (MA16 — the real shape), both with an internal note, and R/H carrying
 * body + alt text ciphertexts.
 */
async function seedTenant(pariwarId: string) {
  const { client } = getTx();
  const w = await seedWorld(pariwarId);
  const root = randomUUID();
  const head = randomUUID();
  const sub = (q: ReturnType<typeof submissionRow>) => insertSql(SUBMISSIONS, q);
  for (const [id, supersedes, tag] of [
    [root, null, 'R'],
    [head, root, 'H'],
  ] as const) {
    const q = sub(submissionRow(w, { submission_id: id, supersedes_submission_id: supersedes, body_ciphertext: `enc:v1:BODY-${tag}`, alt_text_ciphertext: `enc:v1:ALT-${tag}` }));
    await client.query(q.text, q.params);
  }
  for (const q of [
    insertSql(DECISIONS, decisionRow(pariwarId, root, { internal_note_ciphertext: 'enc:v1:NOTE-DECISION' })),
    insertSql(
      WITHDRAWALS,
      withdrawalRow(pariwarId, root, { withdrawn_by: 'trust', reason_code: 'identifies_a_child', internal_note_ciphertext: 'enc:v1:NOTE-WITHDRAWAL', actor_display: 'Panel Member' }),
    ),
  ]) {
    await client.query(q.text, q.params);
  }
  return { ...w, root, head, versions: [root, head] };
}

async function columnsOf(client: Client, table: string): Promise<string[]> {
  const { rows } = await client.query<{ attname: string }>(
    `SELECT attname FROM pg_attribute WHERE attrelid = $1::regclass AND attnum > 0 AND NOT attisdropped ORDER BY attnum`,
    [table],
  );
  return rows.map((r) => r.attname);
}

/** The constraint name Postgres puts in a 23514 / 23505 / 23503 message. */
function expectConstraint(o: Outcome, constraint: string): void {
  expect(o.message, `expected "${constraint}" in: ${o.message}`).toContain(`"${constraint}"`);
}

function expectCheck(o: Outcome, constraint: string): void {
  expect(o.code, `${constraint}: ${o.message}`).toBe('23514');
  expectConstraint(o, constraint);
}

describe.skipIf(!hasDatabase)('0182 — the family memorial tables: RLS, FKs, CHECKs, grants, the live scrub', { timeout: 30000 }, () => {
  setupLiveDb();

  describe('structure', () => {
    it.each(TABLES)('(a) FORCE RLS: %s has relrowsecurity AND relforcerowsecurity', async (table) => {
      const { client } = getTx();
      const { rows } = await client.query<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>(
        `SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = $1 AND relkind = 'r'`,
        [table],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]?.relrowsecurity).toBe(true);
      expect(rows[0]?.relforcerowsecurity).toBe(true);
    });

    it.each(TABLES)('(b) policies: %s has exactly one SELECT, one INSERT and one UPDATE policy for twt_app, keyed on app.pariwar_id — no DELETE, no ALL', async (table) => {
      const { client } = getTx();
      const { rows } = await client.query<{ policyname: string; cmd: string; permissive: string; roles: string; qual: string | null; with_check: string | null }>(
        `SELECT policyname, cmd, permissive, array_to_string(roles, ',') AS roles, qual, with_check FROM pg_policies WHERE tablename = $1 ORDER BY cmd`,
        [table],
      );
      expect(rows.map((r) => r.cmd).sort()).toEqual(['INSERT', 'SELECT', 'UPDATE']);
      for (const r of rows) {
        expect(r.permissive).toBe('PERMISSIVE');
        expect(r.roles).toBe('twt_app');
        expect(r.policyname).toBe(`${table}_tenant_isolation_${r.cmd.toLowerCase()}`);
      }
      const by = Object.fromEntries(rows.map((r) => [r.cmd, r]));
      expect(by['SELECT']!.qual).toContain('app.pariwar_id');
      expect(by['INSERT']!.with_check).toContain('app.pariwar_id');
      // The UPDATE leg is load-bearing (-279 A12): both halves, so a scrub can neither miss its row nor move it.
      expect(by['UPDATE']!.qual).toContain('app.pariwar_id');
      expect(by['UPDATE']!.with_check).toContain('app.pariwar_id');
    });

    it.each(TABLES)('(c) privileges: %s grants twt_app SELECT + INSERT, no table-wide UPDATE, no DELETE, no TRUNCATE; UPDATE on exactly the Tier-1 ciphertext columns', async (table) => {
      const { client } = getTx();
      const priv = async (p: string) =>
        (await client.query<{ ok: boolean }>(`SELECT has_table_privilege('twt_app', $1, $2) AS ok`, [table, p])).rows[0]!.ok;
      expect(await priv('SELECT')).toBe(true);
      expect(await priv('INSERT')).toBe(true);
      expect(await priv('UPDATE')).toBe(false);
      expect(await priv('DELETE')).toBe(false);
      expect(await priv('TRUNCATE')).toBe(false);
      const { rows } = await client.query<{ attname: string }>(
        `SELECT attname FROM pg_attribute
          WHERE attrelid = $1::regclass AND attnum > 0 AND NOT attisdropped AND has_column_privilege('twt_app', attrelid, attnum, 'UPDATE')
          ORDER BY attname`,
        [table],
      );
      expect(rows.map((r) => r.attname)).toEqual(SCRUBBABLE[table]);
    });

    it('(c2) 0183 — the app role may INSERT and SELECT `idempotency_key` (the table grant covers the new column) but ⛔ UPDATE it: the key is immutable once written', async () => {
      const { client } = getTx();
      const col = async (p: string) =>
        (await client.query<{ ok: boolean }>(`SELECT has_column_privilege('twt_app', 'memorial_submissions', 'idempotency_key', $1) AS ok`, [p])).rows[0]!.ok;
      expect(await col('INSERT')).toBe(true);
      expect(await col('SELECT')).toBe(true);
      expect(await col('UPDATE')).toBe(false);
      const w = await seedWorld(PARIWAR_A, 1);
      const key = randomUUID();
      await client.query(`UPDATE memorial_submissions SET idempotency_key = $1 WHERE submission_id = $2`, [key, w.versions[0]]); // superuser seed
      await enterAppScope(client, PARIWAR_A);
      // A real write by the app role, on a row it can see, is refused (and so is a re-key to NULL).
      expect((await attempt(client, `UPDATE memorial_submissions SET idempotency_key = $1 WHERE submission_id = $2`, [randomUUID(), w.versions[0]])).code).toBe('42501');
      expect((await attempt(client, `UPDATE memorial_submissions SET idempotency_key = NULL WHERE submission_id = $1`, [w.versions[0]])).code).toBe('42501');
      // The INSERT path carries it.
      const row = submissionRow(w, { supersedes_submission_id: w.versions[0], idempotency_key: randomUUID() });
      expect((await ins(client, SUBMISSIONS, row)).code).toBeNull();
    });

    it('(d) the unique constraints and the indexes exist by name (the chain is linear, the root single, the queue tenant-scoped)', async () => {
      const { client } = getTx();
      const uniques = await client.query<{ conname: string }>(
        `SELECT conname FROM pg_constraint WHERE conrelid = 'memorial_submissions'::regclass AND contype = 'u' ORDER BY conname`,
      );
      expect(uniques.rows.map((r) => r.conname)).toEqual([
        'memorial_submissions_pariwar_submission_uq',
        'memorial_submissions_pool_submission_uq',
        'memorial_submissions_supersedes_uq',
      ]);
      const idx = await client.query<{ indexname: string; indexdef: string }>(`SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'memorial_submissions'`);
      const def = (n: string) => idx.rows.find((r) => r.indexname === n)?.indexdef ?? '';
      expect(def('memorial_submissions_pool_root_uq')).toMatch(/UNIQUE INDEX .*\(pool_id\) WHERE \(supersedes_submission_id IS NULL\)/);
      expect(def('memorial_submissions_pariwar_created_idx')).toContain('(pariwar_id, created_at)');
      expect(def('memorial_submissions_deceased_idx')).toContain('(deceased_member_id)');
      // 0183 — one version per (pool, Send key); partial, so the pre-0183 rows (NULL) never collide.
      expect(def('memorial_submissions_pool_idempotency_key_uq')).toMatch(
        /UNIQUE INDEX .*\(pool_id, idempotency_key\) WHERE \(idempotency_key IS NOT NULL\)/,
      );
      // The thirteen named CHECKs are all there (0187 — Story 11b.4a — adds the withdrawals' `helpline` pair) (a dropped one fails here before it fails in a probe below).
      const checks = await client.query<{ conname: string }>(
        `SELECT conname FROM pg_constraint WHERE contype = 'c' AND conrelid = ANY (ARRAY['memorial_submissions'::regclass, 'memorial_review_decisions'::regclass, 'memorial_withdrawals'::regclass]) ORDER BY conname`,
      );
      expect(checks.rows.map((r) => r.conname)).toEqual([
        'memorial_review_decisions_actor_display_check',
        'memorial_review_decisions_omissions_check',
        'memorial_review_decisions_omissions_iff_action',
        'memorial_review_decisions_reason_iff_not_approved',
        'memorial_submissions_copy_version_check',
        'memorial_submissions_handover_recipient_check',
        'memorial_submissions_idempotency_key_check',
        'memorial_submissions_photo_mime_check',
        'memorial_submissions_photo_pair_check',
        'memorial_withdrawals_actor_display_check',
        'memorial_withdrawals_helpline_no_note_check',
        'memorial_withdrawals_reason_iff_trust',
        'memorial_withdrawals_takedown_request_iff_helpline',
      ]);
    });
  });

  describe('RLS', () => {
    it('(e) positive: the owning Pariwar reads its OWN rows in all three tables, and only its own', async () => {
      const { client } = getTx();
      const a = await seedTenant(PARIWAR_A);
      await seedTenant(PARIWAR_B);
      await enterAppScope(client, PARIWAR_A);
      for (const [table, idColumn, expected] of [
        [SUBMISSIONS, 'submission_id', [a.root, a.head]],
        [DECISIONS, 'submission_id', [a.root]],
        [WITHDRAWALS, 'submission_id', [a.root]],
      ] as const) {
        const { rows } = await client.query<{ pariwar_id: string; id: string }>(`SELECT pariwar_id, ${idColumn} AS id FROM ${table}`);
        // Membership, not counts — the shared DB accumulates committed rows from other specs.
        expect(rows.every((r) => r.pariwar_id === PARIWAR_A), table).toBe(true);
        for (const id of expected) expect(rows.some((r) => r.id === id), `${table} ${id}`).toBe(true);
      }
    });

    it('(f) LEAK INVARIANT: Pariwar A scope sees ZERO of Pariwar B\'s rows — even with an explicit WHERE for B', async () => {
      const { client } = getTx();
      await seedTenant(PARIWAR_A);
      const b = await seedTenant(PARIWAR_B);
      await enterAppScope(client, PARIWAR_A);
      for (const table of TABLES) {
        const byPariwar = await client.query(`SELECT 1 FROM ${table} WHERE pariwar_id = $1`, [PARIWAR_B]);
        expect(byPariwar.rowCount, table).toBe(0);
        const byId = await client.query(`SELECT 1 FROM ${table} WHERE submission_id = $1`, [b.root]);
        expect(byId.rowCount, `${table} by id`).toBe(0);
      }
    });

    it('(g) write-isolation: an A session INSERT for Pariwar B is refused in every table (withCheck → 42501)', async () => {
      const { client } = getTx();
      await seedTenant(PARIWAR_A);
      const b = await seedTenant(PARIWAR_B);
      await enterAppScope(client, PARIWAR_A);
      const sub = await ins(client, SUBMISSIONS, submissionRow(b, { supersedes_submission_id: b.head }));
      expect(sub.code).toBe('42501');
      expect(sub.message).toMatch(/row-level security/i);
      const dec = await ins(client, DECISIONS, decisionRow(PARIWAR_B, b.head));
      expect(dec.code).toBe('42501');
      expect(dec.message).toMatch(/row-level security/i);
      const wd = await ins(client, WITHDRAWALS, withdrawalRow(PARIWAR_B, b.head));
      expect(wd.code).toBe('42501');
      expect(wd.message).toMatch(/row-level security/i);
    });

    it('(h) the owning Pariwar CAN write its own rows (so (g) is the policy, not a missing grant)', async () => {
      const { client } = getTx();
      const a = await seedTenant(PARIWAR_A);
      await enterAppScope(client, PARIWAR_A);
      expect((await ins(client, SUBMISSIONS, submissionRow(a, { supersedes_submission_id: a.head }))).code).toBeNull();
      expect((await ins(client, DECISIONS, decisionRow(PARIWAR_A, a.head))).code).toBeNull();
      expect((await ins(client, WITHDRAWALS, withdrawalRow(PARIWAR_A, a.head))).code).toBeNull();
    });

    it('(i) fail-closed: with NO scope SELECT returns 0 rows in every table AND every INSERT is refused', async () => {
      const { client } = getTx();
      const a = await seedTenant(PARIWAR_A);
      // Shed superuser, do NOT set scope: nullif('', '') → NULL → no match → 0 rows.
      await enterAppRoleNoScope(client);
      for (const table of TABLES) expect((await client.query(`SELECT 1 FROM ${table}`)).rowCount, table).toBe(0);
      expect((await ins(client, SUBMISSIONS, submissionRow(a, { supersedes_submission_id: a.head }))).code).toBe('42501');
      expect((await ins(client, DECISIONS, decisionRow(PARIWAR_A, a.head))).code).toBe('42501');
      expect((await ins(client, WITHDRAWALS, withdrawalRow(PARIWAR_A, a.head))).code).toBe('42501');
    });

    it('(j) the UPDATE policy: the scrub reaches the owning Pariwar\'s rows, not another tenant\'s, and no row at all with no scope', async () => {
      const { client } = getTx();
      const a = await seedTenant(PARIWAR_A);
      const b = await seedTenant(PARIWAR_B);
      const columnOf = { [SUBMISSIONS]: 'body_ciphertext', [DECISIONS]: 'internal_note_ciphertext', [WITHDRAWALS]: 'internal_note_ciphertext' } as const;
      // ⚠ A statement with a WHERE on a column also needs the SELECT policy to pass, so on its own it cannot tell a missing / permissive
      // UPDATE policy from a working one. The BARE form — a constant SET and no WHERE — reads no column, so only the UPDATE policy
      // decides which rows it touches: that is the leg that has teeth against a policy that is permissive or ignores the tenant.
      const where = (table: (typeof TABLES)[number]) => `UPDATE ${table} SET ${columnOf[table]} = 'enc:v1:scrubbed' WHERE submission_id = $1`;
      const bare = (table: (typeof TABLES)[number]) => `UPDATE ${table} SET ${columnOf[table]} = 'enc:v1:scrubbed'`;
      const rowsOf = async (table: string, pariwarId: string): Promise<number> =>
        Number((await client.query<{ n: string }>(`SELECT count(*)::text AS n FROM ${table} WHERE pariwar_id = $1`, [pariwarId])).rows[0]!.n);
      const ownRows = { [SUBMISSIONS]: await rowsOf(SUBMISSIONS, PARIWAR_A), [DECISIONS]: await rowsOf(DECISIONS, PARIWAR_A), [WITHDRAWALS]: await rowsOf(WITHDRAWALS, PARIWAR_A) };
      for (const table of TABLES) expect(ownRows[table], `seed: ${table}`).toBeGreaterThan(0);

      await enterAppScope(client, PARIWAR_A);
      for (const table of TABLES) {
        expect((await attempt(client, where(table), [b.root])).rowCount, `cross-tenant (WHERE): ${table}`).toBe(0);
        const own = await attempt(client, where(table), [a.root]);
        expect(own.code, table).toBeNull();
        expect(own.rowCount, `in scope (WHERE): ${table}`).toBe(1);
        // The bare UPDATE reaches EXACTLY the owning Pariwar's rows — a policy that ignored the tenant would touch B's as well.
        const all = await attempt(client, bare(table));
        expect(all.code, table).toBeNull();
        expect(all.rowCount, `in scope (bare): ${table}`).toBe(ownRows[table]);
      }
      // B's rows are untouched (read as the superuser).
      await client.query('RESET ROLE');
      const untouched = async (table: (typeof TABLES)[number]) =>
        (await client.query<{ c: string }>(`SELECT ${columnOf[table]} AS c FROM ${table} WHERE pariwar_id = $1 ORDER BY c`, [PARIWAR_B])).rows.map((r) => r.c);
      expect(await untouched(SUBMISSIONS)).toEqual(['enc:v1:BODY-H', 'enc:v1:BODY-R']);
      expect(await untouched(DECISIONS)).toEqual(['enc:v1:NOTE-DECISION']);
      expect(await untouched(WITHDRAWALS)).toEqual(['enc:v1:NOTE-WITHDRAWAL']);

      // No scope (RESET ROLE leaves the transaction-local GUC set, so clear it): no `app.pariwar_id` ⇒ the UPDATE policy admits NO row.
      // The WHERE form binds the SAME row the in-scope leg just updated (`a.root` carries a decision AND a withdrawal; `a.head` has
      // neither, so it would answer 0 whatever the policy said); the bare form is the one that isolates the UPDATE policy.
      await client.query(`SELECT set_config('app.pariwar_id', '', true)`);
      await enterAppRoleNoScope(client);
      for (const table of TABLES) {
        expect((await attempt(client, where(table), [a.root])).rowCount, `no scope (WHERE): ${table}`).toBe(0);
        const all = await attempt(client, bare(table));
        expect(all.code, table).toBeNull();
        expect(all.rowCount, `no scope (bare): ${table}`).toBe(0);
      }
    });
  });

  describe('the foreign keys and the unique backstops', () => {
    it('(k) the composite supersede FK keeps a chain inside ONE pool; a missing predecessor is refused', async () => {
      const { client } = getTx();
      const w1 = await seedWorld(PARIWAR_A, 1);
      const w2 = await seedWorld(PARIWAR_A, 1);
      await enterAppScope(client, PARIWAR_A);
      // Pool 1's next version "superseding" pool 2's root — same Pariwar, different pool.
      const cross = await ins(client, SUBMISSIONS, submissionRow(w1, { supersedes_submission_id: w2.versions[0] }));
      expect(cross.code).toBe('23503');
      expectConstraint(cross, 'memorial_submissions_supersedes_fk');
      const missing = await ins(client, SUBMISSIONS, submissionRow(w1, { supersedes_submission_id: randomUUID() }));
      expect(missing.code).toBe('23503');
      expectConstraint(missing, 'memorial_submissions_supersedes_fk');
      // …and the legal link still inserts.
      expect((await ins(client, SUBMISSIONS, submissionRow(w1, { supersedes_submission_id: w1.versions[0] }))).code).toBeNull();
    });

    it('(l) supersedes_uq: a version is superseded at most ONCE — the chain stays linear', async () => {
      const { client } = getTx();
      const w = await seedWorld(PARIWAR_A, 2);
      await enterAppScope(client, PARIWAR_A);
      const fork = await ins(client, SUBMISSIONS, submissionRow(w, { supersedes_submission_id: w.versions[0] }));
      expect(fork.code).toBe('23505');
      expectConstraint(fork, 'memorial_submissions_supersedes_uq');
      // The head can still be superseded exactly once.
      expect((await ins(client, SUBMISSIONS, submissionRow(w, { supersedes_submission_id: w.versions[1] }))).code).toBeNull();
    });

    it('(l2) 0183 pool_idempotency_key_uq: a Send key writes ONE version per pool — a second row with the same key is 23505 on the index; the same key in ANOTHER pool, and any number of NULL keys (the pre-0183 rows), still insert', async () => {
      const { client } = getTx();
      const w = await seedWorld(PARIWAR_A, 1);
      const other = await seedWorld(PARIWAR_A);
      await enterAppScope(client, PARIWAR_A);
      const key = randomUUID();
      const first = submissionRow(w, { supersedes_submission_id: w.versions[0], idempotency_key: key });
      expect((await ins(client, SUBMISSIONS, first)).code).toBeNull();
      // A version that is otherwise legal (it supersedes the new head) but reuses the key.
      const again = await ins(client, SUBMISSIONS, submissionRow(w, { supersedes_submission_id: first['submission_id'], idempotency_key: key }));
      expect(again.code).toBe('23505');
      expectConstraint(again, 'memorial_submissions_pool_idempotency_key_uq');
      // Unique PER POOL: another drive may carry the same key.
      expect((await ins(client, SUBMISSIONS, submissionRow(other, { idempotency_key: key }))).code).toBeNull();
      // Partial: NULL keys never collide (the head here and its successor both carry none).
      const nullA = submissionRow(w, { supersedes_submission_id: first['submission_id'], idempotency_key: null });
      expect((await ins(client, SUBMISSIONS, nullA)).code).toBeNull();
      expect((await ins(client, SUBMISSIONS, submissionRow(w, { supersedes_submission_id: nullA['submission_id'], idempotency_key: null }))).code).toBeNull();
    });

    it('(m) pool_root_uq: a pool has ONE root; another pool\'s root is unaffected', async () => {
      const { client } = getTx();
      const w = await seedWorld(PARIWAR_A, 1);
      const other = await seedWorld(PARIWAR_A);
      await enterAppScope(client, PARIWAR_A);
      const second = await ins(client, SUBMISSIONS, submissionRow(w));
      expect(second.code).toBe('23505');
      expectConstraint(second, 'memorial_submissions_pool_root_uq');
      expect((await ins(client, SUBMISSIONS, submissionRow(other))).code).toBeNull();
    });

    it('(n) the pool, claim and deceased-member FKs refuse an orphan or another tenant\'s claim', async () => {
      const { client } = getTx();
      const w = await seedWorld(PARIWAR_A);
      const foreign = await seedWorld(PARIWAR_B);
      await enterAppScope(client, PARIWAR_A);
      const pool = await ins(client, SUBMISSIONS, submissionRow(w, { pool_id: randomUUID() }));
      expect(pool.code).toBe('23503');
      expectConstraint(pool, 'memorial_submissions_pool_fk');
      const claim = await ins(client, SUBMISSIONS, submissionRow(w, { claim_case_id: randomUUID() }));
      expect(claim.code).toBe('23503');
      expectConstraint(claim, 'memorial_submissions_claim_case_fk');
      // The composite (pariwar_id, claim_case_id): another Pariwar's claim cannot be named under this one's tenant id.
      const borrowed = await ins(client, SUBMISSIONS, submissionRow(w, { claim_case_id: foreign.claimCaseId }));
      expect(borrowed.code).toBe('23503');
      expectConstraint(borrowed, 'memorial_submissions_claim_case_fk');
      const member = await ins(client, SUBMISSIONS, submissionRow(w, { deceased_member_id: randomUUID() }));
      expect(member.code).toBe('23503');
      expectConstraint(member, 'memorial_submissions_deceased_member_fk');
      expect((await ins(client, SUBMISSIONS, submissionRow(w))).code).toBeNull();
    });

    it('(o) a decision / a withdrawal needs a submission of the SAME Pariwar, and there is ONE of each per submission (the PK)', async () => {
      const { client } = getTx();
      const a = await seedTenant(PARIWAR_A);
      const b = await seedTenant(PARIWAR_B);
      await enterAppScope(client, PARIWAR_A);
      // An id that does not exist, and another Pariwar's id under this tenant — both orphan the composite FK.
      for (const [table, build] of [
        [DECISIONS, decisionRow],
        [WITHDRAWALS, withdrawalRow],
      ] as const) {
        const fk = `${table}_submission_fk`;
        const unknown = await ins(client, table, build(PARIWAR_A, randomUUID()));
        expect(unknown.code, table).toBe('23503');
        expectConstraint(unknown, fk);
        const foreign = await ins(client, table, build(PARIWAR_A, b.head));
        expect(foreign.code, table).toBe('23503');
        expectConstraint(foreign, fk);
      }
      // One decision / one withdrawal per submission (a second is a 23505 on the PK; R already carries both).
      const decisionTwice = await ins(client, DECISIONS, decisionRow(PARIWAR_A, a.root));
      expect(decisionTwice.code).toBe('23505');
      expectConstraint(decisionTwice, 'memorial_review_decisions_pkey');
      const withdrawalTwice = await ins(client, WITHDRAWALS, withdrawalRow(PARIWAR_A, a.root));
      expect(withdrawalTwice.code).toBe('23505');
      expectConstraint(withdrawalTwice, 'memorial_withdrawals_pkey');
    });
  });

  describe('the CHECK constraints (each violating row names the ONE constraint it trips)', () => {
    it('(p) memorial_submissions: photo mime, photo pair, handover recipient, copy version, the Send key\'s shape (0183)', async () => {
      const { client } = getTx();
      const w = await seedWorld(PARIWAR_A);
      await enterAppScope(client, PARIWAR_A);
      let head: string | null = null;
      const put = async (over: Record<string, unknown>): Promise<Outcome> => {
        const row = submissionRow(w, { supersedes_submission_id: head, ...over });
        const out = await ins(client, SUBMISSIONS, row);
        if (out.code === null) head = row['submission_id'] as string;
        return out;
      };
      expectCheck(await put({ photo_object_key: 'pariwar/x/memorial/y/z', photo_mime: 'image/gif' }), 'memorial_submissions_photo_mime_check');
      expectCheck(await put({ photo_object_key: 'pariwar/x/memorial/y/z', photo_mime: null }), 'memorial_submissions_photo_pair_check');
      expectCheck(await put({ photo_object_key: null, photo_mime: 'image/png' }), 'memorial_submissions_photo_pair_check');
      expectCheck(await put({ handover_recipient: 'someone' }), 'memorial_submissions_handover_recipient_check');
      expectCheck(await put({ authorisation_copy_version: '   ' }), 'memorial_submissions_copy_version_check');
      expectCheck(await put({ authorisation_copy_version: '' }), 'memorial_submissions_copy_version_check');
      // 0183 — the Send key's shape (LOCKSTEP with `MEMORIAL_SEND_IDEMPOTENCY_KEY_PATTERN`): non-empty, ≤ 128, [A-Za-z0-9_-].
      for (const bad of ['', ' ', 'x'.repeat(129), 'has space', 'with.dot', 'semi;colon', 'ü']) {
        expectCheck(await put({ idempotency_key: bad }), 'memorial_submissions_idempotency_key_check');
      }
      // The legal shapes still insert — the CHECKs are not merely rejecting everything.
      expect((await put({ photo_object_key: 'pariwar/x/memorial/y/z', photo_mime: 'image/jpeg' })).code).toBeNull();
      expect((await put({ photo_object_key: 'pariwar/x/memorial/y/w', photo_mime: 'image/png', handover_recipient: 'at_death' })).code).toBeNull();
      expect((await put({ idempotency_key: randomUUID() })).code).toBeNull();
      expect((await put({ idempotency_key: `${'A'.repeat(64)}${'z9_-'.repeat(16)}` })).code).toBeNull(); // exactly 128
      expect((await put({ idempotency_key: null })).code).toBeNull();
      expect((await put({})).code).toBeNull();
    });

    it('(q) memorial_review_decisions: the act, the reason and the omissions go together (MA6)', async () => {
      const { client } = getTx();
      const w = await seedWorld(PARIWAR_A, 8);
      const free = [...w.versions];
      await enterAppScope(client, PARIWAR_A);
      const put = (over: Record<string, unknown>): Promise<Outcome> => ins(client, DECISIONS, decisionRow(PARIWAR_A, free[0]!, over));
      const take = (over: Record<string, unknown>): Promise<Outcome> => {
        const id = free.shift()!;
        return ins(client, DECISIONS, decisionRow(PARIWAR_A, id, over));
      };
      // reason_iff_not_approved — a reason for `not_approved` and ONLY for it.
      expectCheck(await put({ action: 'not_approved', reason_code: null }), 'memorial_review_decisions_reason_iff_not_approved');
      expectCheck(await put({ action: 'approved', reason_code: 'against_the_law' }), 'memorial_review_decisions_reason_iff_not_approved');
      expectCheck(
        await put({ action: 'approved_with_omissions', omissions: GOOD_SPAN, reason_code: 'against_the_law' }),
        'memorial_review_decisions_reason_iff_not_approved',
      );
      // omissions_iff_action — `approved` / `not_approved` leave nothing out; `approved_with_omissions` leaves out something.
      expectCheck(await put({ action: 'approved_with_omissions', omissions: '[]', photo_left_out_reason: null }), 'memorial_review_decisions_omissions_iff_action');
      expectCheck(await put({ action: 'approved', omissions: GOOD_SPAN }), 'memorial_review_decisions_omissions_iff_action');
      expectCheck(await put({ action: 'approved', photo_left_out_reason: 'identifies_a_child' }), 'memorial_review_decisions_omissions_iff_action');
      expectCheck(
        await put({ action: 'not_approved', reason_code: 'against_the_law', omissions: GOOD_SPAN }),
        'memorial_review_decisions_omissions_iff_action',
      );
      expectCheck(
        await put({ action: 'not_approved', reason_code: 'against_the_law', photo_left_out_reason: 'identifies_a_child' }),
        'memorial_review_decisions_omissions_iff_action',
      );
      // actor_display_check — the reviewer's display snapshot is never blank.
      expectCheck(await put({ actor_display: '   ' }), 'memorial_review_decisions_actor_display_check');
      expectCheck(await put({ actor_display: '' }), 'memorial_review_decisions_actor_display_check');
      expect((await put({ actor_display: null })).code).toBe('23502'); // NOT NULL
      // Every legal shape still inserts (each on its own version — one decision per submission).
      expect((await take({ action: 'approved' })).code).toBeNull();
      expect((await take({ action: 'not_approved', reason_code: 'attacks_someone_named', internal_note_ciphertext: null })).code).toBeNull();
      expect((await take({ action: 'approved_with_omissions', omissions: GOOD_SPAN })).code).toBeNull();
      expect((await take({ action: 'approved_with_omissions', omissions: ALT_SPAN })).code).toBeNull();
      expect((await take({ action: 'approved_with_omissions', omissions: '[]', photo_left_out_reason: 'identifies_a_child' })).code).toBeNull();
      expect((await take({ action: 'approved_with_omissions', omissions: GOOD_SPAN, photo_left_out_reason: 'against_the_law' })).code).toBeNull();
    });

    it.each([
      ['⭐ R18: JSON-null `field` AND `reason`', '[{"field":null,"start":0,"end":1,"reason":null}]'],
      ['a JSON-null `reason`', '[{"field":"body","start":0,"end":1,"reason":null}]'],
      ['a JSON-null `field`', '[{"field":null,"start":0,"end":1,"reason":"against_the_law"}]'],
      ['a JSON-null `start`', '[{"field":"body","start":null,"end":1,"reason":"against_the_law"}]'],
      ['a missing key', '[{"field":"body","start":0,"end":1}]'],
      ['an extra key', '[{"field":"body","start":0,"end":1,"reason":"against_the_law","text":"x"}]'],
      ['a non-integer offset', '[{"field":"body","start":0,"end":1.5,"reason":"against_the_law"}]'],
      ['a string offset', '[{"field":"body","start":"0","end":1,"reason":"against_the_law"}]'],
      ['a negative offset', '[{"field":"body","start":-1,"end":1,"reason":"against_the_law"}]'],
      ['start >= end', '[{"field":"body","start":3,"end":3,"reason":"against_the_law"}]'],
      ['an unknown field', '[{"field":"title","start":0,"end":1,"reason":"against_the_law"}]'],
      ['an unknown reason', '[{"field":"body","start":0,"end":1,"reason":"disliked"}]'],
      // The cap (2147483647 = 2^31 - 1): just over, a 23-digit number, the bigint ceiling and 1e400 are all refused.
      ['an `end` just over the cap (2147483648)', '[{"field":"body","start":0,"end":2147483648,"reason":"against_the_law"}]'],
      ['a `start` and `end` both over the cap', '[{"field":"body","start":2147483647,"end":2147483648,"reason":"against_the_law"}]'],
      ['a 23-digit `end`', '[{"field":"body","start":0,"end":99999999999999999999999,"reason":"against_the_law"}]'],
      ['an `end` at the bigint ceiling (2^63 - 1)', '[{"field":"body","start":0,"end":9223372036854775807,"reason":"against_the_law"}]'],
      ['an `end` of 1e400', '[{"field":"body","start":0,"end":1e400,"reason":"against_the_law"}]'],
      ['a span over the cap AFTER a good one', '[{"field":"body","start":0,"end":3,"reason":"against_the_law"},{"field":"body","start":0,"end":2147483648,"reason":"against_the_law"}]'],
      ['an element that is not an object', '[1]'],
      ['a JSON-null element', '[null]'],
      ['an object, not an array', '{"field":"body","start":0,"end":1,"reason":"against_the_law"}'],
      ['a JSON null', 'null'],
    ])('(r) memorial_omissions_valid: %s is REFUSED by the omissions CHECK', async (_name, omissions) => {
      const { client } = getTx();
      const w = await seedWorld(PARIWAR_A, 1);
      await enterAppScope(client, PARIWAR_A);
      const out = await ins(client, DECISIONS, decisionRow(PARIWAR_A, w.versions[0]!, { action: 'approved_with_omissions', omissions }));
      expectCheck(out, 'memorial_review_decisions_omissions_check');
    });

    it('(s) memorial_omissions_valid: the function itself — the null cases return false (never NULL), a valid span and [] return true, offsets are capped at 2147483647 and never overflow', async () => {
      const { client } = getTx();
      const fn = async (v: string | null) =>
        (await client.query<{ ok: boolean | null }>(`SELECT memorial_omissions_valid($1::jsonb) AS ok`, [v])).rows[0]!.ok;
      expect(await fn('[{"field":null,"start":0,"end":1,"reason":null}]')).toBe(false);
      expect(await fn(null)).toBe(false);
      expect(await fn('[]')).toBe(true);
      expect(await fn(GOOD_SPAN)).toBe(true);
      expect(await fn(ALT_SPAN)).toBe(true);
      // The offsets are CAPPED at 2147483647 (2^31 - 1), judged on their value: just under / at the cap is admitted, just over is
      // refused, and no input — a 23-digit number, the bigint ceiling, 1e400 — raises a cast error (22003) out of the function.
      const span = (start: string, end: string) => `[{"field":"body","start":${start},"end":${end},"reason":"against_the_law"}]`;
      expect(await fn(span('0', '2147483647'))).toBe(true);
      expect(await fn(span('2147483646', '2147483647'))).toBe(true);
      expect(await fn(span('0', '2147483648'))).toBe(false);
      expect(await fn(span('2147483647', '2147483648'))).toBe(false);
      expect(await fn(span('0', '99999999999999999999999'))).toBe(false);
      expect(await fn(span('99999999999999999999998', '99999999999999999999999'))).toBe(false);
      expect(await fn(span('0', '9223372036854775807'))).toBe(false);
      expect(await fn(span('0', '1e400'))).toBe(false);
    });

    it('(s2) the cap at the table: an `end` of 2147483647 is stored, 2147483648 is refused by the omissions CHECK', async () => {
      const { client } = getTx();
      const w = await seedWorld(PARIWAR_A, 2);
      await enterAppScope(client, PARIWAR_A);
      const span = (end: number) => `[{"field":"body","start":0,"end":${end},"reason":"against_the_law"}]`;
      expectCheck(
        await ins(client, DECISIONS, decisionRow(PARIWAR_A, w.versions[0]!, { action: 'approved_with_omissions', omissions: span(2147483648) })),
        'memorial_review_decisions_omissions_check',
      );
      expect((await ins(client, DECISIONS, decisionRow(PARIWAR_A, w.versions[0]!, { action: 'approved_with_omissions', omissions: span(2147483647) }))).code).toBeNull();
    });

    it('(t) memorial_withdrawals: the Trust names a reason and a display name; a family withdrawal carries neither; a helpline one (0187) a display name and its request, ⛔ no reason, ⛔ no note', async () => {
      const { client } = getTx();
      const w = await seedWorld(PARIWAR_A, 8);
      const free = [...w.versions];
      // Story 11b.4a — a take-down request on the last version (as the superuser, before scope).
      const requestId = randomUUID();
      await client.query(
        `INSERT INTO memorial_takedown_requests (request_id, pariwar_id, pool_id, submission_id, handover_nominee_ref, verified_by, first_contact_at, due_at, actor_id, actor_display)
         VALUES ($1, $2, $3, $4, $5, 'called_back', now() - interval '1 day', now() - interval '1 day' + interval '168 hours', $6, 'Helpline Operator')`,
        [requestId, PARIWAR_A, w.poolId, w.versions[7], randomUUID(), randomUUID()],
      );
      const helpline = { withdrawn_by: 'helpline', reason_code: null, actor_display: 'Helpline Operator', takedown_request_id: requestId };
      await enterAppScope(client, PARIWAR_A);
      const put = (over: Record<string, unknown>): Promise<Outcome> => ins(client, WITHDRAWALS, withdrawalRow(PARIWAR_A, free[0]!, over));
      const take = (over: Record<string, unknown>): Promise<Outcome> => ins(client, WITHDRAWALS, withdrawalRow(PARIWAR_A, free.shift()!, over));
      // reason_iff_trust (MA16): a Trust withdrawal names one of the four reasons, a family withdrawal none.
      expectCheck(await put({ withdrawn_by: 'trust', reason_code: null, actor_display: 'Panel Member' }), 'memorial_withdrawals_reason_iff_trust');
      expectCheck(await put({ withdrawn_by: 'family', reason_code: 'against_the_law', actor_display: null }), 'memorial_withdrawals_reason_iff_trust');
      // actor_display_check: present for the Trust, absent for the family, never blank.
      expectCheck(await put({ withdrawn_by: 'trust', reason_code: 'against_the_law', actor_display: null }), 'memorial_withdrawals_actor_display_check');
      expectCheck(await put({ withdrawn_by: 'family', reason_code: null, actor_display: 'Someone' }), 'memorial_withdrawals_actor_display_check');
      expectCheck(await put({ withdrawn_by: 'trust', reason_code: 'against_the_law', actor_display: '   ' }), 'memorial_withdrawals_actor_display_check');
      // 0187 (Story 11b.4a): a `helpline` withdrawal carries the operator's display name, ⛔ no reason (Trap 7 — the reason enum is
      // the reviewer's), ⛔ no note, and points at its request — and ONLY a `helpline` one may.
      expectCheck(await put({ ...helpline, actor_display: null }), 'memorial_withdrawals_actor_display_check');
      expectCheck(await put({ ...helpline, reason_code: 'against_the_law' }), 'memorial_withdrawals_reason_iff_trust');
      expectCheck(await put({ ...helpline, takedown_request_id: null }), 'memorial_withdrawals_takedown_request_iff_helpline');
      expectCheck(await put({ withdrawn_by: 'family', takedown_request_id: requestId }), 'memorial_withdrawals_takedown_request_iff_helpline');
      expectCheck(
        await put({ withdrawn_by: 'trust', reason_code: 'against_the_law', actor_display: 'Panel Member', takedown_request_id: requestId }),
        'memorial_withdrawals_takedown_request_iff_helpline',
      );
      expectCheck(await put({ ...helpline, internal_note_ciphertext: 'enc:v1:n' }), 'memorial_withdrawals_helpline_no_note_check');
      // The request FK is composite on (pariwar, request): an unknown request is refused.
      const orphan = await put({ ...helpline, takedown_request_id: randomUUID() });
      expect(orphan.code).toBe('23503');
      expectConstraint(orphan, 'memorial_withdrawals_takedown_request_fk');
      expect((await take(helpline)).code).toBeNull();
      expect((await take({ withdrawn_by: 'family' })).code).toBeNull();
      expect((await take({ withdrawn_by: 'trust', reason_code: 'accuses_someone_of_wrongdoing', actor_display: 'Panel Member', internal_note_ciphertext: 'enc:v1:n' })).code).toBeNull();
    });
  });

  describe('the column grants', () => {
    it.each(TABLES)('(u) %s: UPDATE is admitted on the ciphertext column(s) and refused (42501) on EVERY other column; no DELETE', async (table) => {
      const { client } = getTx();
      const a = await seedTenant(PARIWAR_A);
      const columns = await columnsOf(client, table);
      await enterAppScope(client, PARIWAR_A);
      for (const column of columns) {
        // `SET c = c WHERE false` — the privilege is checked whether or not a row matches.
        const out = await attempt(client, `UPDATE ${table} SET "${column}" = "${column}" WHERE false`);
        if (SCRUBBABLE[table]!.includes(column)) expect(out.code, `${table}.${column} must be updatable`).toBeNull();
        else expect(out.code, `${table}.${column} must be immutable (${out.message})`).toBe('42501');
      }
      // A real write to a non-scrubbable column, on a row the scope can see.
      const real: Record<string, string> = {
        [SUBMISSIONS]: `UPDATE ${SUBMISSIONS} SET authorisation_locale = 'en' WHERE submission_id = $1`,
        [DECISIONS]: `UPDATE ${DECISIONS} SET actor_display = 'Someone Else' WHERE submission_id = $1`,
        [WITHDRAWALS]: `UPDATE ${WITHDRAWALS} SET reason_code = 'against_the_law' WHERE submission_id = $1`,
      };
      expect((await attempt(client, real[table]!, [a.root])).code).toBe('42501');
      // Append-only: no DELETE grant and no DELETE policy.
      expect((await attempt(client, `DELETE FROM ${table} WHERE submission_id = $1`, [a.root])).code).toBe('42501');
    });
  });

  describe('the LIVE scrub (-279 A12: without the UPDATE policy it silently updates 0 rows under FORCE)', () => {
    it('(v) as twt_app in scope: rows updated > 0 and the ciphertext CHANGED in all four columns; another tenant\'s rows untouched', async () => {
      const { client } = getTx();
      const a = await seedTenant(PARIWAR_A);
      const b = await seedTenant(PARIWAR_B);
      await enterAppScope(client, PARIWAR_A);

      const subs = await client.query(
        `UPDATE ${SUBMISSIONS} SET body_ciphertext = 'enc:v1:SCRUBBED', alt_text_ciphertext = CASE WHEN alt_text_ciphertext IS NULL THEN NULL ELSE 'enc:v1:SCRUBBED' END
          WHERE deceased_member_id = $1`,
        [a.memberId],
      );
      expect(subs.rowCount, 'memorial_submissions scrub must update the rows (not 0)').toBe(2);
      const decisions = await client.query(
        `UPDATE ${DECISIONS} SET internal_note_ciphertext = 'enc:v1:SCRUBBED' WHERE submission_id = ANY($1::uuid[]) AND internal_note_ciphertext IS NOT NULL`,
        [a.versions],
      );
      expect(decisions.rowCount, 'memorial_review_decisions scrub must update the row (not 0)').toBe(1);
      const withdrawals = await client.query(
        `UPDATE ${WITHDRAWALS} SET internal_note_ciphertext = 'enc:v1:SCRUBBED' WHERE submission_id = ANY($1::uuid[]) AND internal_note_ciphertext IS NOT NULL`,
        [a.versions],
      );
      expect(withdrawals.rowCount, 'memorial_withdrawals scrub must update the row (not 0)').toBe(1);

      // The ciphertext really changed (read back through the same FORCE-RLS session).
      const after = await client.query<{ body_ciphertext: string; alt_text_ciphertext: string }>(
        `SELECT body_ciphertext, alt_text_ciphertext FROM ${SUBMISSIONS} WHERE deceased_member_id = $1`,
        [a.memberId],
      );
      expect(after.rows.every((r) => r.body_ciphertext === 'enc:v1:SCRUBBED' && r.alt_text_ciphertext === 'enc:v1:SCRUBBED')).toBe(true);
      const notes = await client.query<{ internal_note_ciphertext: string }>(
        `SELECT internal_note_ciphertext FROM ${DECISIONS} WHERE submission_id = $1 UNION ALL SELECT internal_note_ciphertext FROM ${WITHDRAWALS} WHERE submission_id = $1`,
        [a.root],
      );
      expect(notes.rows.map((r) => r.internal_note_ciphertext)).toEqual(['enc:v1:SCRUBBED', 'enc:v1:SCRUBBED']);

      // …and the same scrub aimed at Pariwar B from A's scope reaches NOTHING.
      const crossed = await client.query(`UPDATE ${SUBMISSIONS} SET body_ciphertext = 'enc:v1:LEAK' WHERE deceased_member_id = $1`, [b.memberId]);
      expect(crossed.rowCount).toBe(0);
      await client.query('RESET ROLE');
      const untouched = await client.query<{ body_ciphertext: string }>(`SELECT body_ciphertext FROM ${SUBMISSIONS} WHERE deceased_member_id = $1 ORDER BY body_ciphertext`, [b.memberId]);
      expect(untouched.rows.map((r) => r.body_ciphertext)).toEqual(['enc:v1:BODY-H', 'enc:v1:BODY-R']);
    });

    it('(w) through the REAL anonymizeMember as twt_app: the words, the alt text, the decision note AND the Trust\'s withdrawal note become the sentinel', async () => {
      const { client, tx } = getTx();
      const kms = createFakeKmsProvider({ kekBytes: new Uint8Array(32).fill(7), hmacKeyBytes: new Uint8Array(32).fill(9) });
      const kekRef = { resourceName: 'fake:memorial-policy-regression-kek' };
      const ctx = { pariwarId: PARIWAR_A, fieldClass: MEMORIAL_FIELD_CLASS };
      const dec = async (serialized: string) => Buffer.from(await decryptTier1(parseEnvelope(serialized), ctx, kms, kekRef)).toString('utf-8');
      const enc = async (plain: string) => serializeEnvelope(await encryptTier1(Buffer.from(plain, 'utf-8'), ctx, kms, kekRef));

      const a = await seedTenant(PARIWAR_A);
      const b = await seedTenant(PARIWAR_B);
      // Real envelopes, so the sentinel is distinguishable from what was there.
      const original = await enc('the family\'s words and the reviewer\'s note');
      await client.query(`UPDATE ${SUBMISSIONS} SET body_ciphertext = $2, alt_text_ciphertext = $2 WHERE deceased_member_id = $1`, [a.memberId, original]);
      await client.query(`UPDATE ${DECISIONS} SET internal_note_ciphertext = $2 WHERE submission_id = $1`, [a.root, original]);
      await client.query(`UPDATE ${WITHDRAWALS} SET internal_note_ciphertext = $2 WHERE submission_id = $1`, [a.root, original]);

      await enterAppScope(client, PARIWAR_A);
      await anonymizeMember(tx, { kms, kekRef }, { memberId: toMemberId(a.memberId), pariwarId: PARIWAR_A });

      const subs = await client.query<{ body_ciphertext: string; alt_text_ciphertext: string }>(
        `SELECT body_ciphertext, alt_text_ciphertext FROM ${SUBMISSIONS} WHERE deceased_member_id = $1`,
        [a.memberId],
      );
      expect(subs.rows).toHaveLength(2);
      for (const r of subs.rows) {
        expect(r.body_ciphertext).not.toBe(original);
        expect(await dec(r.body_ciphertext)).toBe(ANONYMIZED_SENTINEL);
        expect(await dec(r.alt_text_ciphertext)).toBe(ANONYMIZED_SENTINEL);
      }
      const d = await client.query<{ internal_note_ciphertext: string }>(`SELECT internal_note_ciphertext FROM ${DECISIONS} WHERE submission_id = $1`, [a.root]);
      const wd = await client.query<{ internal_note_ciphertext: string }>(`SELECT internal_note_ciphertext FROM ${WITHDRAWALS} WHERE submission_id = $1`, [a.root]);
      expect(d.rows[0]!.internal_note_ciphertext).not.toBe(original);
      expect(await dec(d.rows[0]!.internal_note_ciphertext)).toBe(ANONYMIZED_SENTINEL);
      expect(wd.rows[0]!.internal_note_ciphertext).not.toBe(original);
      expect(await dec(wd.rows[0]!.internal_note_ciphertext)).toBe(ANONYMIZED_SENTINEL);

      // The governance record is kept: the act, the reason, the authorisation and the display snapshot are NOT scrubbed.
      const kept = await client.query<{ action: string; actor_display: string }>(`SELECT action, actor_display FROM ${DECISIONS} WHERE submission_id = $1`, [a.root]);
      expect(kept.rows[0]).toEqual({ action: 'approved', actor_display: 'Panel Member' });

      // Pariwar B's rows are not reachable from A's session — read as the superuser.
      await client.query('RESET ROLE');
      const other = await client.query<{ body_ciphertext: string }>(`SELECT body_ciphertext FROM ${SUBMISSIONS} WHERE deceased_member_id = $1 ORDER BY body_ciphertext`, [b.memberId]);
      expect(other.rows.map((r) => r.body_ciphertext)).toEqual(['enc:v1:BODY-H', 'enc:v1:BODY-R']);
    });
  });
});
