// Migration 0181 — the NOMINEE MEMBER LINK (Story 6.36e, Task 1; AC1; `2026-10-24-397` NE1, NE5).
// Live DB; per-test ROLLBACK. Every refusal runs under a SAVEPOINT so one test can assert several.
//   · the CHECKs (rank, found_by, state, answer, end_reason, ⛔ oneself, the answer / end coherence, `erased` ⇔ `erased`);
//   · the guard — `live → ended | erased` only; ⛔ an identity column ever changes; the answer and the end written once; an
//     answer only on a live link; the V1 legs: a `confirmed` and a `not_me` link EACH end and EACH erase, keeping the answer;
//   · the BEFORE INSERT version check (a vacated version, another rank, another member, another Pariwar ⇒ refused);
//   · the live UNIQUE per version; the FKs (single-column; the version NO ACTION, the members cascade reaches both);
//   · the column grant; RLS per command, FORCE, cross-tenant invisible, the unscoped probe, ⛔ DELETE;
//   · the counter: `nominee_link_resolve` admitted by `member_daily_counters_counter_check`.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { MEMBER_DAILY_COUNTERS } from '../../../src/schema/member_daily_counters.js';
import {
  NOMINEE_LINK_ANSWERS,
  NOMINEE_LINK_END_REASONS,
  NOMINEE_LINK_FOUND_BY,
  NOMINEE_LINK_STATES,
} from '../../../src/schema/member_nominee_links.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { enterAppRoleNoScope, enterAppScope, PARIWAR_A, PARIWAR_B, seedMember, seedNomineeDeclaration } from '../_helpers.js';

type Client = ReturnType<typeof getTx>['client'];

/** Run `text` under a SAVEPOINT; return the SQLSTATE (or null on success) and roll the savepoint back on failure. */
async function attempt(client: Client, text: string, params: unknown[] = []): Promise<{ code: string | null; message: string }> {
  await client.query('SAVEPOINT probe');
  try {
    await client.query(text, params);
    await client.query('RELEASE SAVEPOINT probe');
    return { code: null, message: '' };
  } catch (err) {
    await client.query('ROLLBACK TO SAVEPOINT probe');
    const e = err as { code?: string; message?: string };
    return { code: e.code ?? 'unknown', message: e.message ?? '' };
  }
}

/** A declarer with a one- or two-rank declaration, and a separate member to mark. Returns the version ids by rank. */
async function declaration(pariwarId: string, ranks: 1 | 2 = 2): Promise<{ declarer: string; nominee: string; v1: string; v2: string | null }> {
  const { tx } = getTx();
  const declarer = await seedMember(tx, pariwarId, { state: 'active' });
  const nominee = await seedMember(tx, pariwarId, { state: 'active' });
  const rows = await seedNomineeDeclaration(tx, pariwarId, declarer, { nominees: ranks === 2 ? [{}, {}] : [{}] });
  return {
    declarer,
    nominee,
    v1: rows.find((r) => r.rank === 1)!.versionId,
    v2: rows.find((r) => r.rank === 2)?.versionId ?? null,
  };
}

const INSERT_LINK = `INSERT INTO member_nominee_links
  (link_id, pariwar_id, declarer_member_id, version_id, rank, nominee_member_id, found_by, carried_from_link_id, state, answer, asked_at, responded_at, ended_at, end_reason)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`;

interface LinkSeed {
  pariwarId?: string;
  declarer: string;
  versionId: string;
  rank?: number;
  nominee: string;
  foundBy?: string;
  carriedFrom?: string | null;
  state?: string;
  answer?: string | null;
  askedAt?: Date;
  respondedAt?: Date | null;
  endedAt?: Date | null;
  endReason?: string | null;
}

function linkParams(l: LinkSeed, linkId = randomUUID()): unknown[] {
  return [
    linkId,
    l.pariwarId ?? PARIWAR_A,
    l.declarer,
    l.versionId,
    l.rank ?? 1,
    l.nominee,
    l.foundBy ?? 'contacts',
    l.carriedFrom ?? null,
    l.state ?? 'live',
    l.answer ?? null,
    l.askedAt ?? new Date(Date.now() - 60_000),
    l.respondedAt ?? null,
    l.endedAt ?? null,
    l.endReason ?? null,
  ];
}

async function insertLink(client: Client, l: LinkSeed): Promise<string> {
  const linkId = randomUUID();
  await client.query(INSERT_LINK, linkParams(l, linkId));
  return linkId;
}

const upd = (client: Client, linkId: string, set: string) =>
  attempt(client, `UPDATE member_nominee_links SET ${set} WHERE link_id = $1`, [linkId]);

describe.skipIf(!hasDatabase)('0181 — member_nominee_links', { timeout: 20000 }, () => {
  setupLiveDb();

  describe('the vocabularies are pinned to the CHECKs', () => {
    it('found_by, state, answer, end_reason and the member counters — the TS tuples equal the CHECK lists', async () => {
      const { client } = getTx();
      const def = async (name: string) =>
        (await client.query<{ d: string }>(`SELECT pg_get_constraintdef(oid) AS d FROM pg_constraint WHERE conname = $1`, [name])).rows[0]?.d ?? '';
      const listed = (d: string) => [...d.matchAll(/'([a-z_]+)'::text/g)].map((m) => m[1]);
      expect(listed(await def('member_nominee_links_found_by_check'))).toEqual([...NOMINEE_LINK_FOUND_BY]);
      expect(listed(await def('member_nominee_links_state_check'))).toEqual([...NOMINEE_LINK_STATES]);
      expect(listed(await def('member_nominee_links_answer_check'))).toEqual([...NOMINEE_LINK_ANSWERS]);
      expect(listed(await def('member_nominee_links_end_reason_check'))).toEqual([...NOMINEE_LINK_END_REASONS]);
      expect(listed(await def('member_daily_counters_counter_check'))).toEqual([...MEMBER_DAILY_COUNTERS]);
      expect(MEMBER_DAILY_COUNTERS).toContain('nominee_link_resolve');
    });

    it('every coherence CHECK, by definition', async () => {
      const { client } = getTx();
      const { rows } = await client.query<{ conname: string; d: string }>(
        `SELECT conname, pg_get_constraintdef(oid) AS d FROM pg_constraint
          WHERE conrelid = 'member_nominee_links'::regclass AND contype = 'c' ORDER BY conname`,
      );
      const def = Object.fromEntries(rows.map((r) => [r.conname, r.d]));
      expect(Object.keys(def)).toEqual([
        'member_nominee_links_answer_check',
        'member_nominee_links_answered_check',
        'member_nominee_links_end_reason_check',
        'member_nominee_links_end_reason_coherence_check',
        'member_nominee_links_ended_check',
        'member_nominee_links_erased_check',
        'member_nominee_links_found_by_check',
        'member_nominee_links_not_self_check',
        'member_nominee_links_rank_check',
        'member_nominee_links_state_check',
      ]);
      expect(def['member_nominee_links_not_self_check']).toBe('CHECK ((declarer_member_id <> nominee_member_id))');
      expect(def['member_nominee_links_answered_check']).toBe('CHECK (((answer IS NULL) = (responded_at IS NULL)))');
      expect(def['member_nominee_links_ended_check']).toBe("CHECK (((state = 'live'::text) = (ended_at IS NULL)))");
      expect(def['member_nominee_links_end_reason_coherence_check']).toBe("CHECK (((state = 'live'::text) = (end_reason IS NULL)))");
      expect(def['member_nominee_links_erased_check']).toBe(
        "CHECK (((state = 'erased'::text) = (NOT (end_reason IS DISTINCT FROM 'erased'::text))))",
      );
      expect(def['member_nominee_links_rank_check']).toBe('CHECK ((rank = ANY (ARRAY[1, 2])))');
      // `state` is NOT NULL (the three state CHECKs are sound only with it); `asked_at` has ⛔ default (set explicitly).
      const cols = await client.query<{ column_name: string; is_nullable: string; column_default: string | null }>(
        `SELECT column_name, is_nullable, column_default FROM information_schema.columns
          WHERE table_name = 'member_nominee_links' AND column_name IN ('state', 'asked_at') ORDER BY column_name`,
      );
      expect(cols.rows).toEqual([
        { column_name: 'asked_at', is_nullable: 'NO', column_default: null },
        { column_name: 'state', is_nullable: 'NO', column_default: "'live'::text" },
      ]);
    });
  });

  describe('the CHECKs', () => {
    it('rank, found_by, state, answer, end_reason, ⛔ oneself', async () => {
      const { client } = getTx();
      const d = await declaration(PARIWAR_A);
      const base = { declarer: d.declarer, versionId: d.v1, nominee: d.nominee };
      expect((await attempt(client, INSERT_LINK, linkParams({ ...base, rank: 3 }))).code).toBe('23514');
      expect((await attempt(client, INSERT_LINK, linkParams({ ...base, foundBy: 'directory' }))).code).toBe('23514');
      expect((await attempt(client, INSERT_LINK, linkParams({ ...base, state: 'asked' }))).code).toBe('23514');
      expect((await attempt(client, INSERT_LINK, linkParams({ ...base, answer: 'yes', respondedAt: new Date() }))).code).toBe('23514');
      expect(
        (await attempt(client, INSERT_LINK, linkParams({ ...base, state: 'ended', endedAt: new Date(), endReason: 'lapsed' }))).code,
      ).toBe('23514');
      expect((await attempt(client, INSERT_LINK, linkParams({ ...base, nominee: d.declarer }))).code).toBe('23514');
      for (const foundBy of NOMINEE_LINK_FOUND_BY) {
        const e = await declaration(PARIWAR_A, 1);
        expect((await attempt(client, INSERT_LINK, linkParams({ declarer: e.declarer, versionId: e.v1, nominee: e.nominee, foundBy }))).code).toBeNull();
      }
    });

    it('an answer is dated; a live link has ⛔ end; an end has a reason; only an erased link ends `erased`', async () => {
      const { client } = getTx();
      const d = await declaration(PARIWAR_A);
      const base = { declarer: d.declarer, versionId: d.v1, nominee: d.nominee };
      const now = new Date();
      const bad: Partial<LinkSeed>[] = [
        { answer: 'confirmed' }, // ⛔ responded_at
        { respondedAt: now }, // ⛔ answer
        { endedAt: now }, // a live link with an end
        { endReason: 'redeclared' }, // a live link with a reason
        { state: 'ended', endedAt: now }, // ⛔ reason
        { state: 'ended', endReason: 'redeclared' }, // ⛔ ended_at
        { state: 'ended', endedAt: now, endReason: 'erased' }, // `erased` only on an erased link
        { state: 'erased', endedAt: now, endReason: 'redeclared' }, // an erased link ends `erased`
        { state: 'erased', endedAt: now }, // ⛔ reason
      ];
      for (const l of bad) expect((await attempt(client, INSERT_LINK, linkParams({ ...base, ...l }))).code, JSON.stringify(l)).toBe('23514');
      const good: Partial<LinkSeed>[] = [
        { state: 'ended', endedAt: now, endReason: 'redeclared', answer: 'confirmed', respondedAt: now },
        { state: 'ended', endedAt: now, endReason: 'removed_by_declarer' },
        { state: 'erased', endedAt: now, endReason: 'erased', answer: 'not_me', respondedAt: now },
      ];
      for (const l of good) expect((await attempt(client, INSERT_LINK, linkParams({ ...base, ...l }))).code, JSON.stringify(l)).toBeNull();
    });
  });

  describe('the BEFORE INSERT version check (V21)', () => {
    it('a link hangs off a DECLARED version of its own rank, declarer and Pariwar — every other ⇒ 23514', async () => {
      const { client, tx } = getTx();
      const d = await declaration(PARIWAR_A);
      // Re-declare with ONE nominee ⇒ rank 2 gets a `vacated` tombstone.
      const re = await seedNomineeDeclaration(tx, PARIWAR_A, d.declarer, { nominees: [{}], ensureMember: false });
      const vacated = (
        await client.query<{ version_id: string }>(
          `SELECT version_id FROM member_nominee_versions WHERE member_id = $1 AND rank = 2 AND kind = 'vacated'`,
          [d.declarer],
        )
      ).rows[0]!.version_id;
      const other = await declaration(PARIWAR_A, 1);
      const cases: [string, Partial<LinkSeed>][] = [
        ['a vacated tombstone', { versionId: vacated, rank: 2 }],
        ['another rank', { versionId: d.v1, rank: 2 }],
        ['another member\'s version', { versionId: other.v1, rank: 1 }],
        ['a version that does not exist', { versionId: randomUUID(), rank: 1 }],
      ];
      for (const [what, l] of cases) {
        const r = await attempt(client, INSERT_LINK, linkParams({ declarer: d.declarer, nominee: d.nominee, versionId: d.v1, ...l }));
        expect(r.code, what).toBe('23514');
        expect(r.message, what).toMatch(/a link hangs off a declared version of its own rank, declarer and Pariwar/);
      }
      // A link stated under ANOTHER Pariwar is refused too (the superuser bypasses RLS — the check is the guard).
      const b = await seedMember(tx, PARIWAR_B, { state: 'active' });
      expect((await attempt(client, INSERT_LINK, linkParams({ pariwarId: PARIWAR_B, declarer: d.declarer, nominee: b, versionId: d.v1 }))).code).toBe('23514');
      // The re-declaration's own rank-1 version is admitted.
      const v1 = re.find((r) => r.rank === 1)!.versionId;
      expect((await attempt(client, INSERT_LINK, linkParams({ declarer: d.declarer, nominee: d.nominee, versionId: v1 }))).code).toBeNull();
    });
  });

  describe('the guard — `live → ended | erased` only; ⛔ an identity column ever changes', () => {
    it('live → ended and live → erased are admitted; an answer on a live link is admitted', async () => {
      const { client } = getTx();
      for (const set of [
        `state = 'ended', ended_at = clock_timestamp(), end_reason = 'redeclared'`,
        `state = 'ended', ended_at = clock_timestamp(), end_reason = 'removed_by_declarer'`,
        `state = 'erased', ended_at = clock_timestamp(), end_reason = 'erased'`,
        `answer = 'confirmed', responded_at = clock_timestamp()`,
        `answer = 'not_me', responded_at = clock_timestamp()`,
      ]) {
        const d = await declaration(PARIWAR_A, 1);
        const id = await insertLink(client, { declarer: d.declarer, versionId: d.v1, nominee: d.nominee });
        expect((await upd(client, id, set)).code, set).toBeNull();
      }
    });

    it('⭐ V1: a `confirmed` and a `not_me` link EACH end and EACH erase — keeping the answer', async () => {
      const { client } = getTx();
      for (const answer of NOMINEE_LINK_ANSWERS) {
        for (const set of [
          `state = 'ended', ended_at = clock_timestamp(), end_reason = 'redeclared'`,
          `state = 'erased', ended_at = clock_timestamp(), end_reason = 'erased'`,
        ]) {
          const d = await declaration(PARIWAR_A, 1);
          const respondedAt = new Date(Date.now() - 30_000);
          const id = await insertLink(client, { declarer: d.declarer, versionId: d.v1, nominee: d.nominee, answer, respondedAt });
          await enterAppScope(client, PARIWAR_A);
          await client.query('SAVEPOINT as_app');
          const r = await client.query(`UPDATE member_nominee_links SET ${set} WHERE link_id = $1`, [id]);
          expect(r.rowCount, `${answer}: ${set}`).toBe(1);
          const after = await client.query<{ answer: string; responded_at: Date }>(
            `SELECT answer, responded_at FROM member_nominee_links WHERE link_id = $1`,
            [id],
          );
          expect(after.rows[0]).toEqual({ answer, responded_at: respondedAt });
          await client.query('RELEASE SAVEPOINT as_app');
          await client.query('RESET ROLE');
        }
      }
    });

    it('every backward or sideways move is refused (23000)', async () => {
      const { client } = getTx();
      const now = new Date();
      const seeds: Record<string, Partial<LinkSeed>> = {
        ended: { state: 'ended', endedAt: now, endReason: 'redeclared' },
        erased: { state: 'erased', endedAt: now, endReason: 'erased' },
      };
      const moves: [string, string][] = [
        ['ended', `state = 'live', ended_at = NULL, end_reason = NULL`],
        ['erased', `state = 'live', ended_at = NULL, end_reason = NULL`],
        ['ended', `state = 'erased', end_reason = 'erased'`],
        ['erased', `state = 'ended', end_reason = 'redeclared'`],
      ];
      for (const [from, set] of moves) {
        const d = await declaration(PARIWAR_A, 1);
        const id = await insertLink(client, { declarer: d.declarer, versionId: d.v1, nominee: d.nominee, ...seeds[from] });
        expect((await upd(client, id, set)).code, `${from}: ${set}`).toBe('23000');
      }
    });

    it('a second answer, an answer on an ended or erased link, an answer in the write that ends it — refused', async () => {
      const { client } = getTx();
      const d = await declaration(PARIWAR_A, 1);
      const answered = await insertLink(client, {
        declarer: d.declarer, versionId: d.v1, nominee: d.nominee, answer: 'confirmed', respondedAt: new Date(Date.now() - 1000),
      });
      expect((await upd(client, answered, `answer = 'not_me'`)).message).toMatch(/the answer is written once/);
      expect((await upd(client, answered, `responded_at = responded_at + interval '1 second'`)).message).toMatch(/the answer is written once/);
      expect((await upd(client, answered, `answer = NULL, responded_at = NULL`)).message).toMatch(/the answer is written once/);
      for (const seed of [
        { state: 'ended', endedAt: new Date(), endReason: 'redeclared' },
        { state: 'erased', endedAt: new Date(), endReason: 'erased' },
      ]) {
        const e = await declaration(PARIWAR_A, 1);
        const id = await insertLink(client, { declarer: e.declarer, versionId: e.v1, nominee: e.nominee, ...seed });
        expect((await upd(client, id, `answer = 'confirmed', responded_at = clock_timestamp()`)).message).toMatch(
          /an answer is taken only on a live link/,
        );
      }
      const f = await declaration(PARIWAR_A, 1);
      const live = await insertLink(client, { declarer: f.declarer, versionId: f.v1, nominee: f.nominee });
      expect(
        (await upd(client, live, `answer = 'confirmed', responded_at = clock_timestamp(), state = 'ended', ended_at = clock_timestamp(), end_reason = 'redeclared'`)).message,
      ).toMatch(/an answer is taken only on a live link/);
    });

    it('⛔ an identity column change (even as the superuser); the end written once', async () => {
      const { client } = getTx();
      const d = await declaration(PARIWAR_A);
      const other = await seedMember(getTx().tx, PARIWAR_A, { state: 'active' });
      const carried = await insertLink(client, { declarer: d.declarer, versionId: d.v2!, rank: 2, nominee: d.nominee });
      const id = await insertLink(client, { declarer: d.declarer, versionId: d.v1, nominee: d.nominee });
      for (const set of [
        `link_id = gen_random_uuid()`,
        `pariwar_id = '${PARIWAR_B}'`,
        `declarer_member_id = '${other}'`,
        `version_id = '${d.v2!}'`,
        `rank = 2`,
        `nominee_member_id = '${other}'`,
        `found_by = 'typed'`,
        `carried_from_link_id = '${carried}'`,
        `asked_at = asked_at - interval '1 day'`,
      ]) {
        expect((await upd(client, id, set)).message, set).toMatch(/an identity column never changes/);
      }
      expect((await upd(client, id, `state = 'ended', ended_at = clock_timestamp(), end_reason = 'redeclared'`)).code).toBeNull();
      expect((await upd(client, id, `ended_at = ended_at + interval '1 second'`)).message).toMatch(/the end is written once/);
      expect((await upd(client, id, `end_reason = 'removed_by_declarer'`)).message).toMatch(/the end is written once/);
      // A same-state no-op write passes.
      expect((await upd(client, carried, `state = 'live'`)).code).toBeNull();
    });

    it('the column grant: twt_app may change ONLY state, answer, responded_at, ended_at, end_reason', async () => {
      const { client } = getTx();
      const d = await declaration(PARIWAR_A);
      const other = await seedMember(getTx().tx, PARIWAR_A, { state: 'active' });
      const id = await insertLink(client, { declarer: d.declarer, versionId: d.v1, nominee: d.nominee });
      await enterAppScope(client, PARIWAR_A);
      for (const set of [
        `nominee_member_id = '${other}'`,
        `declarer_member_id = '${other}'`,
        `version_id = '${d.v2!}'`,
        `rank = 2`,
        `found_by = 'typed'`,
        `asked_at = now()`,
        `carried_from_link_id = NULL`,
        `pariwar_id = '${PARIWAR_A}'`,
      ]) {
        expect((await upd(client, id, set)).code, set).toBe('42501');
      }
      const r = await client.query(`UPDATE member_nominee_links SET answer = 'confirmed', responded_at = clock_timestamp() WHERE link_id = $1`, [id]);
      expect(r.rowCount).toBe(1);
      const e = await client.query(
        `UPDATE member_nominee_links SET state = 'ended', ended_at = clock_timestamp(), end_reason = 'redeclared' WHERE link_id = $1`,
        [id],
      );
      expect(e.rowCount).toBe(1);
    });
  });

  describe('ONE live link per version; the FKs', () => {
    it('the partial UNIQUE: a second live link on a version is refused; once it ends, a new one (a carry) is admitted', async () => {
      const { client } = getTx();
      const d = await declaration(PARIWAR_A, 1);
      const first = await insertLink(client, { declarer: d.declarer, versionId: d.v1, nominee: d.nominee });
      expect((await attempt(client, INSERT_LINK, linkParams({ declarer: d.declarer, versionId: d.v1, nominee: d.nominee }))).code).toBe('23505');
      await client.query(`UPDATE member_nominee_links SET state = 'ended', ended_at = clock_timestamp(), end_reason = 'redeclared' WHERE link_id = $1`, [first]);
      expect(
        (await attempt(client, INSERT_LINK, linkParams({ declarer: d.declarer, versionId: d.v1, nominee: d.nominee, carriedFrom: first }))).code,
      ).toBeNull();
    });

    it('every FK is single-column; the version and the carry are NO ACTION, the members cascade', async () => {
      const { client } = getTx();
      const { rows } = await client.query<{ conname: string; n: number; del: string; ref: string }>(
        `SELECT conname, array_length(conkey, 1) AS n, confdeltype AS del, confrelid::regclass::text AS ref FROM pg_constraint
          WHERE contype = 'f' AND conrelid = 'member_nominee_links'::regclass ORDER BY conname`,
      );
      expect(rows).toEqual([
        { conname: 'member_nominee_links_carried_from_fk', n: 1, del: 'a', ref: 'member_nominee_links' },
        { conname: 'member_nominee_links_declarer_fk', n: 1, del: 'c', ref: 'members' },
        { conname: 'member_nominee_links_nominee_fk', n: 1, del: 'c', ref: 'members' },
        { conname: 'member_nominee_links_version_fk', n: 1, del: 'a', ref: 'member_nominee_versions' },
      ]);
    });

    it('TR3: hard-deleting the declarer cascades the versions AND the links (NO ACTION is checked at statement end)', async () => {
      const { client } = getTx();
      const d = await declaration(PARIWAR_A);
      const first = await insertLink(client, { declarer: d.declarer, versionId: d.v1, nominee: d.nominee });
      await client.query(`UPDATE member_nominee_links SET state = 'ended', ended_at = clock_timestamp(), end_reason = 'redeclared' WHERE link_id = $1`, [first]);
      await insertLink(client, { declarer: d.declarer, versionId: d.v1, nominee: d.nominee, carriedFrom: first });
      expect((await attempt(client, `DELETE FROM members WHERE member_id = $1`, [d.declarer])).code).toBeNull();
      expect((await client.query(`SELECT 1 FROM member_nominee_links WHERE declarer_member_id = $1`, [d.declarer])).rows).toHaveLength(0);
      expect((await client.query(`SELECT 1 FROM member_nominee_versions WHERE member_id = $1`, [d.declarer])).rows).toHaveLength(0);
    });
  });

  describe('the indexes (asserted by definition)', () => {
    it('the live partial UNIQUE and the declarer / nominee / version indexes', async () => {
      const { client } = getTx();
      const { rows } = await client.query<{ indexname: string; indexdef: string }>(
        `SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'member_nominee_links' ORDER BY indexname`,
      );
      const def = (name: string) => rows.find((r) => r.indexname === name)?.indexdef ?? `<missing ${name}>`;
      expect(def('member_nominee_links_live_uq')).toMatch(/^CREATE UNIQUE INDEX .* USING btree \(version_id\) WHERE \(state = 'live'::text\)$/);
      expect(def('member_nominee_links_declarer_idx')).toMatch(/USING btree \(pariwar_id, declarer_member_id\)$/);
      expect(def('member_nominee_links_nominee_idx')).toMatch(/USING btree \(pariwar_id, nominee_member_id\)$/);
      expect(def('member_nominee_links_version_idx')).toMatch(/USING btree \(version_id\)$/);
    });
  });

  describe('RLS', () => {
    it('RLS is ENABLED + FORCED; per-command policies; ⛔ DELETE or TRUNCATE grant', async () => {
      const { client } = getTx();
      const t = 'member_nominee_links';
      const { rows } = await client.query(`SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = $1`, [t]);
      expect(rows[0]).toEqual({ relrowsecurity: true, relforcerowsecurity: true });
      const pol = await client.query(`SELECT polname, polcmd FROM pg_policy WHERE polrelid = $1::regclass ORDER BY polname`, [t]);
      expect(pol.rows.map((r) => `${r.polname}:${r.polcmd}`)).toEqual([
        `${t}_tenant_isolation_insert:a`,
        `${t}_tenant_isolation_select:r`,
        `${t}_tenant_isolation_update:w`,
      ]);
      const del = await client.query(`SELECT has_table_privilege('twt_app', $1, 'DELETE') AS d, has_table_privilege('twt_app', $1, 'TRUNCATE') AS t`, [t]);
      expect(del.rows[0]).toEqual({ d: false, t: false });
    });

    it('a cross-tenant reader sees nothing; the unscoped probe sees nothing; another Pariwar cannot insert', async () => {
      const { client } = getTx();
      const d = await declaration(PARIWAR_A);
      const id = await insertLink(client, { declarer: d.declarer, versionId: d.v1, nominee: d.nominee });
      await client.query('SAVEPOINT scope');
      await enterAppScope(client, PARIWAR_B);
      expect((await client.query(`SELECT 1 FROM member_nominee_links WHERE link_id = $1`, [id])).rows).toHaveLength(0);
      const u = await client.query(`UPDATE member_nominee_links SET answer = 'confirmed', responded_at = clock_timestamp() WHERE link_id = $1`, [id]);
      expect(u.rowCount).toBe(0);
      // Refused BEFORE the WITH CHECK is reached: the BEFORE INSERT check reads under B's scope, where A's version is invisible.
      const cross = await attempt(client, INSERT_LINK, linkParams({ pariwarId: PARIWAR_A, declarer: d.declarer, versionId: d.v2!, rank: 2, nominee: d.nominee }));
      expect(cross.code).toBe('23514');
      expect(cross.message).toMatch(/a link hangs off a declared version/);
      await client.query('ROLLBACK TO SAVEPOINT scope');
      await enterAppRoleNoScope(client);
      expect((await client.query(`SELECT 1 FROM member_nominee_links WHERE link_id = $1`, [id])).rows).toHaveLength(0);
    });

    it('in scope, twt_app inserts a link on its own declaration (the BEFORE INSERT check reads under the inserter\'s scope)', async () => {
      const { client } = getTx();
      const d = await declaration(PARIWAR_A);
      await enterAppScope(client, PARIWAR_A);
      expect((await attempt(client, INSERT_LINK, linkParams({ declarer: d.declarer, versionId: d.v2!, rank: 2, nominee: d.nominee }))).code).toBeNull();
    });
  });

  describe('the counter (NE5)', () => {
    it('`nominee_link_resolve` is admitted; the atomic capped upsert works in scope', async () => {
      const { client, tx } = getTx();
      const a = await seedMember(tx, PARIWAR_A, { state: 'active' });
      await enterAppScope(client, PARIWAR_A);
      const charge = async () =>
        (
          await client.query<{ count: number }>(
            `INSERT INTO member_daily_counters AS c (pariwar_id, member_id, counter, day, count)
               VALUES ($1, $2, 'nominee_link_resolve', current_date, 1)
             ON CONFLICT (pariwar_id, member_id, counter, day) DO UPDATE SET count = c.count + EXCLUDED.count
               WHERE c.count + EXCLUDED.count <= 4
             RETURNING count`,
            [PARIWAR_A, a],
          )
        ).rows;
      for (let i = 1; i <= 4; i += 1) expect(await charge()).toEqual([{ count: i }]);
      expect(await charge()).toEqual([]);
    });
  });
});
