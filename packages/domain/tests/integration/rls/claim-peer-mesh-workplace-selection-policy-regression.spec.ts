// Migration 0163 — the `workplace_named_v1` selection record and the ping's source (Story 6.36, Task 1; AC1, AC9).
// Live DB; per-test ROLLBACK. Every refusal runs under a SAVEPOINT so one test can assert several.
//   · the selection: the new columns; the two CHECKs SCOPED to `workplace_named_v1` (a legacy-id insert with NULL new
//     columns — `'m'` and `'district_cohort_v1'` — is accepted); the source vocabulary; the 500 cap; the prefix trigger on
//     INSERT and on an owner UPDATE (an empty selection is a valid prefix); the narrowed UPDATE grant (`twt_app` may
//     update the disposition, ⛔ `source` / `ranked_member_ids` / any 6.6 snapshot column — 42501);
//   · the ping: `source` must equal its selection's (a mismatch refused, NULL against a NULL-source selection accepted);
//     another Pariwar's selection still fails on the composite FK (23503), ⛔ the trigger; `source` is ⛔ in the column
//     grant (42501);
//   · `member_postings_pariwar_workplace_idx` asserted by definition.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { enterAppScope, PARIWAR_A, PARIWAR_B, seedClaim } from '../_helpers.js';

type Client = ReturnType<typeof getTx>['client'];

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

const INSERT_SELECTION = `INSERT INTO claim_peer_mesh_selections (selection_id, claim_case_id, pariwar_id, deceased_member_id,
    deceased_created_at, metric_id, metric_version, selected_member_ids, candidate_snapshot, response_window_expires_at,
    source, previous_workplace_counted, recent_change_before_filing, ranked_member_ids)
  VALUES ($1, $2, $3, gen_random_uuid(), now(), $4, 1, $5::uuid[], '[]'::jsonb, now() + interval '72 hours', $6, $7, $8, $9::uuid[])`;

interface SelectionOpts {
  metricId?: string;
  selected?: string[];
  source?: string | null;
  previousCounted?: boolean | null;
  recentChange?: boolean | null;
  ranked?: string[] | null;
}

/** As the superuser: a claim and ONE selection row. */
async function insertSelection(client: Client, pariwarId: string, o: SelectionOpts = {}) {
  const { tx } = getTx();
  const claimCaseId = await seedClaim(tx, pariwarId, { currentState: 'verification_in_progress' });
  const selectionId = randomUUID();
  const r = await attempt(client, INSERT_SELECTION, [
    selectionId,
    claimCaseId,
    pariwarId,
    o.metricId ?? 'workplace_named_v1',
    o.selected ?? [],
    o.source ?? null,
    o.previousCounted === undefined ? false : o.previousCounted,
    o.recentChange === undefined ? false : o.recentChange,
    o.ranked === undefined ? [] : o.ranked,
  ]);
  return { ...r, selectionId, claimCaseId };
}

const ids = (n: number) => Array.from({ length: n }, () => randomUUID());

describe.skipIf(!hasDatabase)('0163 — the workplace_named_v1 selection and the ping source', { timeout: 20000 }, () => {
  setupLiveDb();

  describe('the selection', () => {
    it('a legacy-id insert with NULL new columns is accepted (`m` and `district_cohort_v1`)', async () => {
      const { client } = getTx();
      for (const metricId of ['m', 'district_cohort_v1']) {
        const r = await insertSelection(client, PARIWAR_A, {
          metricId,
          selected: ids(2),
          source: null,
          previousCounted: null,
          recentChange: null,
          ranked: null,
        });
        expect(r.code, `${metricId}: ${r.message}`).toBeNull();
      }
    });

    it('a workplace_named_v1 row must carry the ranking and both booleans (23514)', async () => {
      const { client } = getTx();
      const sel = ids(2);
      expect((await insertSelection(client, PARIWAR_A, { selected: sel, source: 'workplace', ranked: null })).code).toBe('23514');
      expect((await insertSelection(client, PARIWAR_A, { selected: sel, source: 'workplace', ranked: sel, previousCounted: null })).code).toBe('23514');
      expect((await insertSelection(client, PARIWAR_A, { selected: sel, source: 'workplace', ranked: sel, recentChange: null })).code).toBe('23514');
      expect((await insertSelection(client, PARIWAR_A, { selected: sel, source: 'workplace', ranked: sel })).code).toBeNull();
    });

    it('a source ⇔ somebody chosen; the vocabulary; the 500 cap (23514)', async () => {
      const { client } = getTx();
      const sel = ids(2);
      expect((await insertSelection(client, PARIWAR_A, { selected: [], source: 'workplace', ranked: [] })).code).toBe('23514');
      expect((await insertSelection(client, PARIWAR_A, { selected: sel, source: null, ranked: sel })).code).toBe('23514');
      expect((await insertSelection(client, PARIWAR_A, { selected: sel, source: 'district', ranked: sel })).code).toBe('23514');
      expect((await insertSelection(client, PARIWAR_A, { selected: [], source: null, ranked: [] })).code).toBeNull();
      const big = ids(501);
      expect((await insertSelection(client, PARIWAR_A, { selected: big.slice(0, 5), source: 'workplace', ranked: big })).code).toBe('23514');
      expect((await insertSelection(client, PARIWAR_A, { selected: big.slice(0, 5), source: 'workplace', ranked: big.slice(0, 500) })).code).toBeNull();
      expect((await insertSelection(client, PARIWAR_A, { selected: sel, source: 'named_by_member', ranked: sel })).code).toBeNull();
    });

    it('the prefix trigger: the selected are the FIRST entries of the ranking', async () => {
      const { client } = getTx();
      const r = ids(7);
      const ok = await insertSelection(client, PARIWAR_A, { selected: r.slice(0, 5), source: 'workplace', ranked: r });
      expect(ok.code).toBeNull();
      const skipped = await insertSelection(client, PARIWAR_A, { selected: [r[0]!, r[2]!], source: 'workplace', ranked: r });
      expect(skipped.code).toBe('23000');
      expect(skipped.message).toMatch(/first entries of the ranking/);
      expect((await insertSelection(client, PARIWAR_A, { selected: [r[1]!, r[0]!], source: 'workplace', ranked: r })).code).toBe('23000');
      expect((await insertSelection(client, PARIWAR_A, { selected: [randomUUID()], source: 'workplace', ranked: r })).code).toBe('23000');
      expect((await insertSelection(client, PARIWAR_A, { selected: r.slice(0, 3), source: 'workplace', ranked: r.slice(0, 2) })).code).toBe('23000');
      // an empty selection is a valid prefix (of an empty or a non-empty ranking)
      expect((await insertSelection(client, PARIWAR_A, { selected: [], source: null, ranked: r })).code).toBeNull();
      // a legacy row is ⛔ checked (its selection is non-empty and its ranking NULL)
      expect((await insertSelection(client, PARIWAR_A, { metricId: 'district_cohort_v1', selected: r.slice(0, 2), ranked: null, source: null, previousCounted: null, recentChange: null })).code).toBeNull();
      // on UPDATE too (the owner / superuser can UPDATE; twt_app cannot — below)
      expect((await attempt(client, `UPDATE claim_peer_mesh_selections SET selected_member_ids = ARRAY[$1]::uuid[] WHERE selection_id = $2`, [r[6], ok.selectionId])).code).toBe('23000');
      expect((await attempt(client, `UPDATE claim_peer_mesh_selections SET ranked_member_ids = ARRAY[$1]::uuid[] WHERE selection_id = $2`, [r[6], ok.selectionId])).code).toBe('23000');
    });

    it('the narrowed UPDATE grant: twt_app may update the disposition, ⛔ source / ranked_member_ids / the snapshot (42501)', async () => {
      const { client } = getTx();
      const r = ids(3);
      const s = await insertSelection(client, PARIWAR_A, { selected: r, source: 'workplace', ranked: r });
      expect(s.code).toBeNull();
      await enterAppScope(client, PARIWAR_A);
      for (const set of [
        `source = 'named_by_member'`,
        `ranked_member_ids = ranked_member_ids`,
        `previous_workplace_counted = true`,
        `recent_change_before_filing = true`,
        `deceased_workplace_id = gen_random_uuid()`,
        `deceased_previous_workplace_id = gen_random_uuid()`,
        `selected_member_ids = selected_member_ids`,
        `candidate_snapshot = '[]'::jsonb`,
        `metric_id = 'district_cohort_v1'`,
      ]) {
        expect((await attempt(client, `UPDATE claim_peer_mesh_selections SET ${set} WHERE selection_id = $1`, [s.selectionId])).code, set).toBe('42501');
      }
      const upd = await client.query(
        `UPDATE claim_peer_mesh_selections SET outcome = 'skipped', skip_reason = 'x', response_window_expires_at = now() WHERE selection_id = $1`,
        [s.selectionId],
      );
      expect(upd.rowCount).toBe(1);
    });
  });

  describe('the ping', () => {
    const INSERT_PING = `INSERT INTO claim_peer_mesh_pings (ping_id, selection_id, pariwar_id, member_id, source) VALUES (gen_random_uuid(), $1, $2, $3, $4)`;

    it('a ping carries ITS selection\'s source — a mismatch refused; the match accepted', async () => {
      const { client } = getTx();
      const r = ids(3);
      const s = await insertSelection(client, PARIWAR_A, { selected: r, source: 'workplace', ranked: r });
      expect(s.code).toBeNull();
      await enterAppScope(client, PARIWAR_A);
      const bad = await attempt(client, INSERT_PING, [s.selectionId, PARIWAR_A, r[0], 'named_by_member']);
      expect(bad.code).toBe('23000');
      expect(bad.message).toMatch(/carries its selection's source/);
      expect((await attempt(client, INSERT_PING, [s.selectionId, PARIWAR_A, r[0], null])).code).toBe('23000');
      expect((await attempt(client, INSERT_PING, [s.selectionId, PARIWAR_A, r[0], 'workplace'])).code).toBeNull();
      // `source` is ⛔ in 0156's column grant
      expect((await attempt(client, `UPDATE claim_peer_mesh_pings SET source = 'named_by_member' WHERE selection_id = $1`, [s.selectionId])).code).toBe('42501');
    });

    it('a legacy selection\'s pings carry NULL (the shipped inserters pass); a source against it is refused', async () => {
      const { client } = getTx();
      const r = ids(2);
      const s = await insertSelection(client, PARIWAR_A, { metricId: 'district_cohort_v1', selected: r, ranked: null, source: null, previousCounted: null, recentChange: null });
      expect(s.code).toBeNull();
      await enterAppScope(client, PARIWAR_A);
      expect((await attempt(client, `INSERT INTO claim_peer_mesh_pings (selection_id, pariwar_id, member_id) VALUES ($1, $2, $3)`, [s.selectionId, PARIWAR_A, r[0]])).code).toBeNull();
      expect((await attempt(client, INSERT_PING, [s.selectionId, PARIWAR_A, r[1], 'workplace'])).code).toBe('23000');
    });

    it('another Pariwar\'s selection (RLS-invisible) still fails on the composite FK — 23503, ⛔ the trigger', async () => {
      const { client } = getTx();
      const r = ids(1);
      const foreign = await insertSelection(client, PARIWAR_B, { selected: r, source: 'workplace', ranked: r });
      expect(foreign.code).toBeNull();
      await enterAppScope(client, PARIWAR_A);
      expect((await attempt(client, INSERT_PING, [foreign.selectionId, PARIWAR_A, r[0], 'workplace'])).code).toBe('23503');
      expect((await attempt(client, INSERT_PING, [foreign.selectionId, PARIWAR_A, r[0], null])).code).toBe('23503');
    });
  });

  it('member_postings_pariwar_workplace_idx — (pariwar_id, workplace_id) WHERE workplace_id IS NOT NULL', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{ indexdef: string }>(
      `SELECT indexdef FROM pg_indexes WHERE tablename = 'member_postings' AND indexname = 'member_postings_pariwar_workplace_idx'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.indexdef).toMatch(/\(pariwar_id, workplace_id\) WHERE \(workplace_id IS NOT NULL\)/);
  });
});
