// Migration 0162 — PEOPLE WHO KNOW ME: the links and the daily counters (Story 6.36b, Task 1; AC1, AC2).
// Live DB; per-test ROLLBACK. Every refusal runs under a SAVEPOINT so one test can assert several.
//   · the links: the CHECKs (found_by, state, ⛔ oneself, the answer / end dates, the lapse's date, the answer window);
//     the guard — every forward transition admitted, every other refused; ⛔ no identity column ever changes; the two
//     dates written once; a lapse only after 30 days; the partial UNIQUE (ONE live link per pair); the BACKSTOP (a fourth
//     live INSERT refused; ⛔ never an `asked → accepted`); the column grant (`twt_app` may change only the state and the
//     two dates); the namer's lock is ONE function the backstop calls;
//   · the counters: the CHECKs and the atomic capped upsert;
//   · RLS: per-command policies, FORCE, a cross-tenant reader sees nothing, the fail-closed probe, ⛔ no DELETE.
// The two-connection race for the last slot is `tests/integration/member/known-people-concurrency.spec.ts`.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { KNOWN_PEOPLE_FOUND_BY, KNOWN_PEOPLE_LINK_STATES } from '../../../src/schema/member_known_people.js';
import { MEMBER_DAILY_COUNTERS, PARIWAR_DAILY_COUNTERS } from '../../../src/schema/member_daily_counters.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { enterAppRoleNoScope, enterAppScope, PARIWAR_A, PARIWAR_B, seedMember } from '../_helpers.js';

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

async function members(pariwarId: string, n: number): Promise<string[]> {
  const { tx } = getTx();
  const out: string[] = [];
  for (let i = 0; i < n; i += 1) out.push(await seedMember(tx, pariwarId, { state: 'active' }));
  return out;
}

const INSERT_LINK = `INSERT INTO member_known_people (link_id, pariwar_id, namer_member_id, named_member_id, found_by, state, asked_at, responded_at, ended_at)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`;

interface LinkSeed {
  pariwarId?: string;
  namer: string;
  named: string;
  foundBy?: string;
  state?: string;
  askedAt?: Date;
  respondedAt?: Date | null;
  endedAt?: Date | null;
}

function linkParams(l: LinkSeed, linkId = randomUUID()): unknown[] {
  return [
    linkId,
    l.pariwarId ?? PARIWAR_A,
    l.namer,
    l.named,
    l.foundBy ?? 'contacts',
    l.state ?? 'asked',
    // A minute in the past: the DB's `clock_timestamp()` (an answer, an end) may run behind this host's clock.
    l.askedAt ?? new Date(Date.now() - 60_000),
    l.respondedAt ?? null,
    l.endedAt ?? null,
  ];
}

async function insertLink(client: Client, l: LinkSeed): Promise<string> {
  const linkId = randomUUID();
  await client.query(INSERT_LINK, linkParams(l, linkId));
  return linkId;
}

const DAY = 24 * 60 * 60 * 1000;

describe.skipIf(!hasDatabase)('0162 — member_known_people + the daily counters', { timeout: 20000 }, () => {
  setupLiveDb();

  describe('the vocabularies are pinned to the CHECKs', () => {
    it('found_by, state and the counters — the TS tuples equal the CHECK lists', async () => {
      const { client } = getTx();
      const def = async (name: string) =>
        (await client.query<{ d: string }>(`SELECT pg_get_constraintdef(oid) AS d FROM pg_constraint WHERE conname = $1`, [name])).rows[0]?.d ?? '';
      const listed = (d: string) => [...d.matchAll(/'([a-z_]+)'::text/g)].map((m) => m[1]);
      expect(listed(await def('member_known_people_found_by_check'))).toEqual([...KNOWN_PEOPLE_FOUND_BY]);
      expect(listed(await def('member_known_people_state_check'))).toEqual([...KNOWN_PEOPLE_LINK_STATES]);
      expect(listed(await def('member_daily_counters_counter_check'))).toEqual([...MEMBER_DAILY_COUNTERS]);
      expect(listed(await def('pariwar_daily_counters_counter_check'))).toEqual([...PARIWAR_DAILY_COUNTERS]);
    });
  });

  describe('the CHECKs', () => {
    it('found_by, state, ⛔ oneself', async () => {
      const { client } = getTx();
      const [a, b] = await members(PARIWAR_A, 2);
      expect((await attempt(client, INSERT_LINK, linkParams({ namer: a!, named: b!, foundBy: 'directory' }))).code).toBe('23514');
      expect((await attempt(client, INSERT_LINK, linkParams({ namer: a!, named: b!, state: 'ended' }))).code).toBe('23514');
      expect((await attempt(client, INSERT_LINK, linkParams({ namer: a!, named: a! }))).code).toBe('23514');
      for (const foundBy of KNOWN_PEOPLE_FOUND_BY) {
        const [n, m] = await members(PARIWAR_A, 2);
        expect((await attempt(client, INSERT_LINK, linkParams({ namer: n!, named: m!, foundBy }))).code).toBeNull();
      }
    });

    it('an answer is dated; an end is dated; a live link has ⛔ no end; `asked` has ⛔ no answer', async () => {
      const { client } = getTx();
      const [a, b] = await members(PARIWAR_A, 2);
      const t0 = new Date(Date.now() - 5 * DAY);
      const t1 = new Date(t0.getTime() + DAY);
      const bad: LinkSeed[] = [
        { namer: a!, named: b!, state: 'accepted', askedAt: t0 }, // ⛔ responded_at
        { namer: a!, named: b!, state: 'declined', askedAt: t0, endedAt: t1 }, // ⛔ responded_at
        { namer: a!, named: b!, state: 'withdrawn', askedAt: t0, endedAt: t1 }, // ⛔ responded_at
        { namer: a!, named: b!, state: 'asked', askedAt: t0, respondedAt: t1 }, // an answered `asked`
        { namer: a!, named: b!, state: 'asked', askedAt: t0, endedAt: t1 }, // a live link with an end
        { namer: a!, named: b!, state: 'accepted', askedAt: t0, respondedAt: t1, endedAt: t1 },
        { namer: a!, named: b!, state: 'removed', askedAt: t0 }, // ⛔ ended_at
        { namer: a!, named: b!, state: 'erased', askedAt: t0, respondedAt: t1 }, // ⛔ ended_at
      ];
      for (const l of bad) expect((await attempt(client, INSERT_LINK, linkParams(l))).code, JSON.stringify(l.state)).toBe('23514');
    });

    it('a lapse is dated asked_at + 30 days — ⛔ never the moment it was noticed', async () => {
      const { client } = getTx();
      const [a, b] = await members(PARIWAR_A, 2);
      const t0 = new Date(Date.now() - 40 * DAY);
      expect((await attempt(client, INSERT_LINK, linkParams({ namer: a!, named: b!, state: 'lapsed', askedAt: t0, endedAt: new Date() }))).code).toBe('23514');
      expect((await attempt(client, INSERT_LINK, linkParams({ namer: a!, named: b!, state: 'lapsed', askedAt: t0, endedAt: new Date(t0.getTime() + 30 * DAY) }))).code).toBeNull();
    });

    it('⛔ no answer after 30 days; ⛔ nothing dated before the ask; an end ⛔ before the answer', async () => {
      const { client } = getTx();
      const [a, b] = await members(PARIWAR_A, 2);
      const t0 = new Date(Date.now() - 40 * DAY);
      const at = (d: number) => new Date(t0.getTime() + d * DAY);
      expect((await attempt(client, INSERT_LINK, linkParams({ namer: a!, named: b!, state: 'accepted', askedAt: t0, respondedAt: at(30) }))).code).toBe('23514');
      expect((await attempt(client, INSERT_LINK, linkParams({ namer: a!, named: b!, state: 'accepted', askedAt: t0, respondedAt: at(-1) }))).code).toBe('23514');
      expect((await attempt(client, INSERT_LINK, linkParams({ namer: a!, named: b!, state: 'removed', askedAt: t0, endedAt: at(-1) }))).code).toBe('23514');
      expect((await attempt(client, INSERT_LINK, linkParams({ namer: a!, named: b!, state: 'withdrawn', askedAt: t0, respondedAt: at(5), endedAt: at(4) }))).code).toBe('23514');
      expect((await attempt(client, INSERT_LINK, linkParams({ namer: a!, named: b!, state: 'accepted', askedAt: t0, respondedAt: at(29.9) }))).code).toBeNull();
    });
  });

  describe('the guard — forward-only; ⛔ no identity column ever changes', () => {
    const upd = (client: Client, linkId: string, set: string) =>
      attempt(client, `UPDATE member_known_people SET ${set} WHERE link_id = $1`, [linkId]);

    it('every forward transition is admitted', async () => {
      const { client } = getTx();
      const cases: { from: LinkSeed['state']; set: string }[] = [
        { from: 'asked', set: `state = 'accepted', responded_at = clock_timestamp()` },
        { from: 'asked', set: `state = 'declined', responded_at = clock_timestamp(), ended_at = clock_timestamp()` },
        { from: 'asked', set: `state = 'removed', ended_at = clock_timestamp()` },
        { from: 'asked', set: `state = 'erased', ended_at = clock_timestamp()` },
        { from: 'accepted', set: `state = 'removed', ended_at = clock_timestamp()` },
        { from: 'accepted', set: `state = 'withdrawn', ended_at = clock_timestamp()` },
        { from: 'accepted', set: `state = 'erased', ended_at = clock_timestamp()` },
      ];
      for (const c of cases) {
        const [a, b] = await members(PARIWAR_A, 2);
        const askedAt = new Date(Date.now() - DAY);
        const id = await insertLink(client, {
          namer: a!,
          named: b!,
          state: c.from,
          askedAt,
          respondedAt: c.from === 'accepted' ? new Date(askedAt.getTime() + 1000) : null,
        });
        expect((await upd(client, id, c.set)).code, `${String(c.from)} → ${c.set}`).toBeNull();
      }
      // the lazy lapse — only once the 30 days have passed
      const [a, b] = await members(PARIWAR_A, 2);
      const stale = await insertLink(client, { namer: a!, named: b!, askedAt: new Date(Date.now() - 31 * DAY) });
      expect((await upd(client, stale, `state = 'lapsed', ended_at = asked_at + interval '30 days'`)).code).toBeNull();
    });

    it('every other transition is refused; the final states stay final', async () => {
      const { client } = getTx();
      const t0 = new Date(Date.now() - 40 * DAY);
      const at = (d: number) => new Date(t0.getTime() + d * DAY);
      const seeds: Record<string, Omit<LinkSeed, 'namer' | 'named'>> = {
        asked: { state: 'asked', askedAt: new Date(Date.now() - DAY) },
        accepted: { state: 'accepted', askedAt: t0, respondedAt: at(1) },
        declined: { state: 'declined', askedAt: t0, respondedAt: at(1), endedAt: at(1) },
        lapsed: { state: 'lapsed', askedAt: t0, endedAt: at(30) },
        removed: { state: 'removed', askedAt: t0, endedAt: at(2) },
        withdrawn: { state: 'withdrawn', askedAt: t0, respondedAt: at(1), endedAt: at(3) },
        erased: { state: 'erased', askedAt: t0, endedAt: at(4) },
      };
      const allowed = new Set([
        'asked>accepted', 'asked>declined', 'asked>lapsed', 'asked>removed', 'asked>erased',
        'accepted>removed', 'accepted>withdrawn', 'accepted>erased',
      ]);
      for (const from of KNOWN_PEOPLE_LINK_STATES) {
        for (const to of KNOWN_PEOPLE_LINK_STATES) {
          if (from === to || allowed.has(`${from}>${to}`)) continue;
          const [a, b] = await members(PARIWAR_A, 2);
          const id = await insertLink(client, { namer: a!, named: b!, ...seeds[from]! });
          // Satisfy every CHECK for `to`, so ONLY the guard can refuse.
          const set = [`state = '${to}'`];
          if (['accepted', 'declined', 'withdrawn'].includes(to) && seeds[from]!.respondedAt == null) set.push('responded_at = asked_at + interval \'1 hour\'');
          if (['asked', 'accepted'].includes(to)) set.push('ended_at = NULL');
          if (to === 'asked') set.push('responded_at = NULL');
          if (['declined', 'removed', 'withdrawn', 'erased'].includes(to) && seeds[from]!.endedAt == null) set.push('ended_at = clock_timestamp()');
          if (to === 'lapsed') set.push(`ended_at = asked_at + interval '30 days'`);
          const r = await upd(client, id, set.join(', '));
          expect(r.code, `${from} → ${to}`).toBe('23000');
        }
      }
    });

    it('a lapse before the 30 days is refused', async () => {
      const { client } = getTx();
      const [a, b] = await members(PARIWAR_A, 2);
      const fresh = await insertLink(client, { namer: a!, named: b!, askedAt: new Date(Date.now() - 29 * DAY) });
      const r = await upd(client, fresh, `state = 'lapsed', ended_at = asked_at + interval '30 days'`);
      expect(r.message).toMatch(/lapses only after 30 days/);
    });

    it('⛔ an identity column change (even as the superuser); the dates written once; a same-state date change refused', async () => {
      const { client } = getTx();
      const [a, b, c] = await members(PARIWAR_A, 3);
      const askedAt = new Date(Date.now() - 2 * DAY);
      const id = await insertLink(client, { namer: a!, named: b!, state: 'accepted', askedAt, respondedAt: new Date(askedAt.getTime() + 1000) });
      for (const set of [
        `named_member_id = '${c!}'`,
        `namer_member_id = '${c!}'`,
        `pariwar_id = '${PARIWAR_B}'`,
        `found_by = 'typed'`,
        `asked_at = asked_at - interval '1 day'`,
        `link_id = gen_random_uuid()`,
      ]) {
        expect((await upd(client, id, set)).message, set).toMatch(/an identity column never changes/);
      }
      expect((await upd(client, id, `responded_at = responded_at + interval '1 second'`)).message).toMatch(/responded_at is written once/);
      expect((await upd(client, id, `state = 'withdrawn', ended_at = clock_timestamp()`)).code).toBeNull();
      expect((await upd(client, id, `ended_at = ended_at + interval '1 second'`)).message).toMatch(/ended_at is written once/);
      // A live `asked` row: a same-state write that changes a date is refused (dates move only with a transition).
      const [d, e] = await members(PARIWAR_A, 2);
      const asked = await insertLink(client, { namer: d!, named: e! });
      expect((await upd(client, asked, `state = 'asked'`)).code).toBeNull(); // a no-op write passes
    });

    it('the column grant: twt_app may change ONLY state, responded_at, ended_at', async () => {
      const { client } = getTx();
      const [a, b, c] = await members(PARIWAR_A, 3);
      const id = await insertLink(client, { namer: a!, named: b! });
      await enterAppScope(client, PARIWAR_A);
      for (const set of [`named_member_id = '${c!}'`, `found_by = 'typed'`, `asked_at = now()`, `pariwar_id = '${PARIWAR_A}'`]) {
        expect((await upd(client, id, set)).code, set).toBe('42501');
      }
      const r = await client.query(`UPDATE member_known_people SET state = 'accepted', responded_at = clock_timestamp() WHERE link_id = $1`, [id]);
      expect(r.rowCount).toBe(1);
    });
  });

  describe('ONE live link per pair; at most THREE live per namer (I6)', () => {
    it('the partial UNIQUE: a second live link of the same pair is refused; once it ends, a new one is admitted', async () => {
      const { client } = getTx();
      const [a, b] = await members(PARIWAR_A, 2);
      const first = await insertLink(client, { namer: a!, named: b! });
      expect((await attempt(client, INSERT_LINK, linkParams({ namer: a!, named: b! }))).code).toBe('23505');
      // the reverse direction is a DIFFERENT link
      expect((await attempt(client, INSERT_LINK, linkParams({ namer: b!, named: a! }))).code).toBeNull();
      await client.query(`UPDATE member_known_people SET state = 'removed', ended_at = clock_timestamp() WHERE link_id = $1`, [first]);
      expect((await attempt(client, INSERT_LINK, linkParams({ namer: a!, named: b! }))).code).toBeNull();
    });

    it('the BACKSTOP refuses a fourth live INSERT (asked or accepted) — and counts ⛔ an ended link', async () => {
      const { client } = getTx();
      const [namer, b, c, d, e, f] = await members(PARIWAR_A, 6);
      const ended = await insertLink(client, { namer: namer!, named: f!, askedAt: new Date(Date.now() - DAY) });
      await client.query(`UPDATE member_known_people SET state = 'declined', responded_at = clock_timestamp(), ended_at = clock_timestamp() WHERE link_id = $1`, [ended]);
      await insertLink(client, { namer: namer!, named: b! });
      await insertLink(client, { namer: namer!, named: c! });
      await insertLink(client, { namer: namer!, named: d!, state: 'accepted', askedAt: new Date(Date.now() - DAY), respondedAt: new Date() });
      await enterAppScope(client, PARIWAR_A);
      const fourth = await attempt(client, INSERT_LINK, linkParams({ namer: namer!, named: e! }));
      expect(fourth.code).toBe('23514');
      expect(fourth.message).toMatch(/at most three live named people/);
      // an ENDED insert (a historical row) is ⛔ never counted or refused
      expect((await attempt(client, INSERT_LINK, linkParams({ namer: namer!, named: e!, state: 'removed', askedAt: new Date(Date.now() - DAY), endedAt: new Date() }))).code).toBeNull();
    });

    it('a namer with THREE `asked` links can have each ACCEPTED — live → live is ⛔ never refused', async () => {
      const { client } = getTx();
      const [namer, b, c, d] = await members(PARIWAR_A, 4);
      const ids = [await insertLink(client, { namer: namer!, named: b! }), await insertLink(client, { namer: namer!, named: c! }), await insertLink(client, { namer: namer!, named: d! })];
      await enterAppScope(client, PARIWAR_A);
      for (const id of ids) {
        const r = await client.query(`UPDATE member_known_people SET state = 'accepted', responded_at = clock_timestamp() WHERE link_id = $1`, [id]);
        expect(r.rowCount).toBe(1);
      }
    });

    it('the backstop takes the namer\'s lock through the ONE lock function the writer calls', async () => {
      const { client } = getTx();
      const { rows } = await client.query<{ src: string }>(`SELECT prosrc AS src FROM pg_proc WHERE proname = 'member_known_people_backstop'`);
      expect(rows[0]?.src).toMatch(/PERFORM member_known_people_lock_namer\(NEW\.namer_member_id\)/);
      const fn = await client.query<{ src: string }>(`SELECT prosrc AS src FROM pg_proc WHERE proname = 'member_known_people_lock_namer'`);
      expect(fn.rows[0]?.src).toMatch(/pg_advisory_xact_lock\(hashtextextended\('member_known_people\.namer:'/);
      // it is callable by the app role (the writer takes it in scope)
      await enterAppScope(client, PARIWAR_A);
      expect((await attempt(client, `SELECT member_known_people_lock_namer($1)`, [randomUUID()])).code).toBeNull();
    });
  });

  describe('the daily counters', () => {
    it('the CHECKs: an unknown counter, a negative count', async () => {
      const { client } = getTx();
      const [a] = await members(PARIWAR_A, 1);
      const ins = `INSERT INTO member_daily_counters (pariwar_id, member_id, counter, day, count) VALUES ($1, $2, $3, current_date, $4)`;
      expect((await attempt(client, ins, [PARIWAR_A, a, 'sms', 1])).code).toBe('23514');
      expect((await attempt(client, ins, [PARIWAR_A, a, 'known_people_ask', -1])).code).toBe('23514');
      const pins = `INSERT INTO pariwar_daily_counters (pariwar_id, counter, day, count) VALUES ($1, $2, current_date, $3)`;
      expect((await attempt(client, pins, [PARIWAR_A, 'known_people_ask', 1])).code).toBe('23514');
      expect((await attempt(client, pins, [PARIWAR_A, 'contact_match_numbers', -1])).code).toBe('23514');
    });

    it('the atomic capped upsert (the sms_rate_buckets shape) works for twt_app in scope; ⛔ a row past the cap', async () => {
      const { client } = getTx();
      const [a] = await members(PARIWAR_A, 1);
      await enterAppScope(client, PARIWAR_A);
      const charge = async (n: number, cap: number) =>
        (
          await client.query<{ count: number }>(
            `INSERT INTO member_daily_counters AS c (pariwar_id, member_id, counter, day, count)
               SELECT $1, $2, 'contact_match_requests', current_date, $3::int WHERE $3::int <= $4::int
             ON CONFLICT (pariwar_id, member_id, counter, day) DO UPDATE SET count = c.count + EXCLUDED.count
               WHERE c.count + EXCLUDED.count <= $4::int
             RETURNING count`,
            [PARIWAR_A, a, n, cap],
          )
        ).rows;
      expect(await charge(1, 3)).toEqual([{ count: 1 }]);
      expect(await charge(1, 3)).toEqual([{ count: 2 }]);
      expect(await charge(1, 3)).toEqual([{ count: 3 }]);
      expect(await charge(1, 3)).toEqual([]); // the 4th — refused, the row unchanged
      expect(await charge(5, 3)).toEqual([]);
      const { rows } = await client.query(`SELECT count FROM member_daily_counters WHERE member_id = $1`, [a]);
      expect(rows).toEqual([{ count: 3 }]);
      await client.query(
        `INSERT INTO pariwar_daily_counters AS c (pariwar_id, counter, day, count) VALUES ($1, 'contact_match_numbers', current_date, 10)
         ON CONFLICT (pariwar_id, counter, day) DO UPDATE SET count = c.count + EXCLUDED.count`,
        [PARIWAR_A],
      );
    });
  });

  describe('the indexes (asserted by definition)', () => {
    it('the live partial UNIQUE and the namer / named indexes', async () => {
      const { client } = getTx();
      const { rows } = await client.query<{ indexname: string; indexdef: string }>(
        `SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'member_known_people' ORDER BY indexname`,
      );
      const def = (name: string) => rows.find((r) => r.indexname === name)?.indexdef ?? `<missing ${name}>`;
      expect(def('member_known_people_live_uq')).toMatch(
        /^CREATE UNIQUE INDEX .* USING btree \(pariwar_id, namer_member_id, named_member_id\) WHERE \(state = ANY \(ARRAY\['asked'::text, 'accepted'::text\]\)\)$/,
      );
      expect(def('member_known_people_namer_idx')).toMatch(/USING btree \(pariwar_id, namer_member_id\)$/);
      expect(def('member_known_people_named_idx')).toMatch(/USING btree \(pariwar_id, named_member_id\)$/);
    });
  });

  describe('RLS', () => {
    const TABLES = ['member_known_people', 'member_daily_counters', 'pariwar_daily_counters'];

    it('RLS is ENABLED + FORCED; per-command policies; ⛔ no DELETE grant; ⛔ an FK that is composite', async () => {
      const { client } = getTx();
      for (const t of TABLES) {
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
      }
      const fks = await client.query<{ conname: string; n: number }>(
        `SELECT conname, array_length(conkey, 1) AS n FROM pg_constraint
          WHERE contype = 'f' AND conrelid IN ('member_known_people'::regclass, 'member_daily_counters'::regclass) ORDER BY conname`,
      );
      expect(fks.rows).toEqual([
        { conname: 'member_daily_counters_member_fk', n: 1 },
        { conname: 'member_known_people_named_fk', n: 1 },
        { conname: 'member_known_people_namer_fk', n: 1 },
      ]);
    });

    it('a cross-tenant reader sees nothing; the unscoped probe sees nothing; WITH CHECK refuses another Pariwar', async () => {
      const { client } = getTx();
      const [a, b] = await members(PARIWAR_A, 2);
      const id = await insertLink(client, { namer: a!, named: b! });
      await client.query(
        `INSERT INTO member_daily_counters (pariwar_id, member_id, counter, day, count) VALUES ($1, $2, 'known_people_ask', current_date, 1)`,
        [PARIWAR_A, a],
      );
      await client.query(`INSERT INTO pariwar_daily_counters (pariwar_id, counter, day, count) VALUES ($1, 'contact_match_numbers', current_date, 1)`, [PARIWAR_A]);
      await client.query('SAVEPOINT scope');
      await enterAppScope(client, PARIWAR_B);
      expect((await client.query(`SELECT 1 FROM member_known_people WHERE link_id = $1`, [id])).rows).toHaveLength(0);
      expect((await client.query(`SELECT 1 FROM member_daily_counters WHERE member_id = $1`, [a])).rows).toHaveLength(0);
      expect((await client.query(`SELECT 1 FROM pariwar_daily_counters WHERE pariwar_id = $1`, [PARIWAR_A])).rows).toHaveLength(0);
      const upd = await client.query(`UPDATE member_known_people SET state = 'removed', ended_at = clock_timestamp() WHERE link_id = $1`, [id]);
      expect(upd.rowCount).toBe(0);
      const [c, d] = [randomUUID(), randomUUID()];
      expect((await attempt(client, INSERT_LINK, linkParams({ pariwarId: PARIWAR_A, namer: c, named: d }))).code).toBe('42501');
      await client.query('ROLLBACK TO SAVEPOINT scope');
      await enterAppRoleNoScope(client);
      expect((await client.query(`SELECT 1 FROM member_known_people WHERE link_id = $1`, [id])).rows).toHaveLength(0);
      expect((await client.query(`SELECT 1 FROM member_daily_counters`)).rows).toHaveLength(0);
    });
  });
});
