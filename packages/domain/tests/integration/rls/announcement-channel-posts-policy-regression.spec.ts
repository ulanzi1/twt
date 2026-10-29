// announcement_channel_posts — migration 0190 + RLS policy regression (Story 5.14, Task 1; AC1, AC6, AC7; `2026-10-29-417` FS2 (a),
// `-418` item 11 and §3). The `alert-sms-sends-policy-regression` shape: positive / negative RLS, the connection-level fail-closed
// probe, FORCE RLS, ⛔ DELETE for `twt_app`, per-command policies, cross-tenant WITH CHECK, the alert FK, the EXACT column-narrowed
// INSERT / UPDATE grants, ⭐ the once-per-(Pariwar, occasion, subject) UNIQUE, the DB ↔ TS CHECK lockstep, every `detail` value per
// state with an accept / reject pair, the finished-row trigger, and ⛔ a column that can hold a name or the text (AC7). Then the
// domain accessors' row life AS `twt_app`, and the explicit `pariwar_id` predicate as the superuser (the job's BYPASSRLS pool — I6).
// Live DB only; per-test ROLLBACK (setupLiveDb).

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  ANNOUNCEMENT_POST_LEASE_MS,
  beginAnnouncementPost,
  countPoolOpenPostGaps,
  finaliseAnnouncementPost,
  finaliseStaleAnnouncementPost,
  giveUpDeferredAnnouncementPost,
  isAnnouncementPostDetail,
  listCyclePoolsForAnnouncement,
  lookupAnnouncementPost,
  recordUnattemptedAnnouncementPost,
} from '../../../src/announcement-channels/index.js';
import {
  ANNOUNCEMENT_POST_DEFERRED_DETAILS,
  ANNOUNCEMENT_POST_OCCASIONS,
  ANNOUNCEMENT_POST_REFUSED_DETAILS,
  ANNOUNCEMENT_POST_SKIPPED_DETAILS,
  ANNOUNCEMENT_POST_STATES,
  ANNOUNCEMENT_POST_UNKNOWN_DETAILS,
} from '../../../src/schema/announcement_channel_posts.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppRoleNoScope, enterAppScope, seedAlert, seedPool } from '../_helpers.js';

type Client = ReturnType<typeof getTx>['client'];

const TABLE = 'announcement_channel_posts';

/** As the superuser: an alert and its IN-FLIGHT pool-open post (`attempting` — 0190 freezes a finished one). */
async function seedPost(client: Client, pariwarId: string) {
  const { tx } = getTx();
  const alertId = await seedAlert(tx, pariwarId);
  const poolId = randomUUID();
  const postId = randomUUID();
  await client.query(
    `INSERT INTO ${TABLE} (post_id, pariwar_id, occasion, subject_id, alert_id, pool_label, state, claim_token)
     VALUES ($1, $2, 'pool_open', $3, $4, 'A', 'attempting', 'job-seed:0')`,
    [postId, pariwarId, poolId, alertId],
  );
  return { alertId, poolId, postId };
}

type Seeded = Awaited<ReturnType<typeof seedPost>>;

/** A VALID row on top of the seed (the cycle's last day — another occasion and subject). Only INSERT-granted columns. */
const validRow = (s: Seeded, pariwarId: string = PARIWAR_A): Record<string, unknown> => ({
  pariwar_id: pariwarId,
  occasion: 'last_day',
  subject_id: s.alertId,
  alert_id: s.alertId,
  last_date: '13-11-2026',
  state: 'attempting',
  claim_token: 'job-1:0',
});

function insertRow(client: Client, v: Record<string, unknown>) {
  const cols = Object.keys(v);
  return client.query(
    `INSERT INTO ${TABLE} (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')})`,
    Object.values(v),
  );
}

async function expectPgError(
  client: Client,
  run: () => Promise<unknown>,
  expected: string | { readonly code: string; readonly constraint?: string; readonly message?: unknown },
): Promise<void> {
  await client.query('SAVEPOINT expect_pg_error');
  await expect(run()).rejects.toMatchObject(typeof expected === 'string' ? { code: expected } : expected);
  await client.query('ROLLBACK TO SAVEPOINT expect_pg_error');
}

async function expectAccepted(client: Client, run: () => Promise<{ rowCount: number | null }>): Promise<void> {
  await client.query('SAVEPOINT expect_ok');
  expect((await run()).rowCount).toBe(1);
  await client.query('ROLLBACK TO SAVEPOINT expect_ok');
}

const CHECK = (constraint: string) => ({ code: '23514', constraint });
const DENIED = { code: '42501', message: expect.stringMatching(/permission denied/) };
const FROZEN = { code: '23000', message: expect.stringMatching(/finished row/) };

async function grantedColumns(client: Client, privilege: 'INSERT' | 'UPDATE'): Promise<string[]> {
  const { rows } = await client.query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.column_privileges
      WHERE table_name = $1 AND grantee = 'twt_app' AND privilege_type = $2 ORDER BY column_name`,
    [TABLE, privilege],
  );
  return rows.map((r) => r.column_name);
}

async function checkValues(client: Client, conname: string): Promise<string[]> {
  const { rows } = await client.query<{ def: string }>(`SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = $1`, [conname]);
  expect(rows).toHaveLength(1);
  return [...rows[0]!.def.matchAll(/'([a-z_0-9]+)'::text/g)].map((m) => m[1]!).sort();
}

async function rowOf(client: Client, postId: string) {
  const { rows } = await client.query<{ state: string; detail: string | null; attempt_count: number; claim_token: string; telegram_message_id: string | null }>(
    `SELECT state, detail, attempt_count, claim_token, telegram_message_id FROM ${TABLE} WHERE post_id = $1`,
    [postId],
  );
  return rows[0];
}

describe.skipIf(!hasDatabase)('the Trust channel post record — migration 0190 + RLS policy regression', { timeout: 20000 }, () => {
  setupLiveDb();

  it('positive + negative: under scope A only A rows, and under scope B only B rows', async () => {
    const { client } = getTx();
    await seedPost(client, PARIWAR_A);
    await seedPost(client, PARIWAR_B);
    await enterAppScope(client, PARIWAR_A);
    const a = await client.query<{ pariwar_id: string }>(`SELECT pariwar_id FROM ${TABLE}`);
    expect(a.rows.length).toBeGreaterThan(0);
    expect(a.rows.every((r) => r.pariwar_id === PARIWAR_A)).toBe(true);
    await enterAppScope(client, PARIWAR_B);
    const b = await client.query<{ pariwar_id: string }>(`SELECT pariwar_id FROM ${TABLE}`);
    expect(b.rows.length).toBeGreaterThan(0);
    expect(b.rows.some((r) => r.pariwar_id === PARIWAR_A)).toBe(false);
  });

  it('connection-level fail-closed: the app role with no scope sees ⛔ row', async () => {
    const { client } = getTx();
    await seedPost(client, PARIWAR_A);
    await enterAppRoleNoScope(client);
    expect((await client.query(`SELECT 1 FROM ${TABLE}`)).rows).toHaveLength(0);
  });

  it('FORCE RLS; ⛔ DELETE for twt_app; per-command policies (⛔ FOR ALL, ⛔ DELETE policy)', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>(
      `SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = $1 AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = current_schema())`,
      [TABLE],
    );
    expect(rows[0]!.relrowsecurity && rows[0]!.relforcerowsecurity).toBe(true);
    const pol = await client.query<{ cmd: string }>(`SELECT cmd FROM pg_policies WHERE schemaname = current_schema() AND tablename = $1`, [TABLE]);
    expect(pol.rows.map((r) => r.cmd).sort()).toEqual(['INSERT', 'SELECT', 'UPDATE']);
    const s = await seedPost(client, PARIWAR_A);
    await enterAppScope(client, PARIWAR_A);
    await expectPgError(client, () => client.query(`DELETE FROM ${TABLE} WHERE post_id = $1`, [s.postId]), DENIED);
  });

  it('cross-tenant INSERT refused by WITH CHECK; B invisible to an A UPDATE; the identity and the record cannot be rewritten', async () => {
    const { client } = getTx();
    const a = await seedPost(client, PARIWAR_A);
    const b = await seedPost(client, PARIWAR_B);
    await enterAppScope(client, PARIWAR_A);
    await expectPgError(client, () => insertRow(client, validRow(a, PARIWAR_B)), { code: '42501', message: expect.stringMatching(/row-level security/) });
    await expectAccepted(client, () => insertRow(client, validRow(a, PARIWAR_A)));
    expect((await client.query(`UPDATE ${TABLE} SET updated_at = now() WHERE post_id = $1`, [b.postId])).rowCount).toBe(0);
    expect((await client.query(`UPDATE ${TABLE} SET updated_at = now() WHERE post_id = $1`, [a.postId])).rowCount).toBe(1);
    for (const set of [`pariwar_id = '${PARIWAR_B}'`, `occasion = 'pool_open'`, 'subject_id = subject_id', 'alert_id = alert_id', "pool_label = 'B'", 'last_date = NULL', 'created_at = now()', 'post_id = post_id']) {
      await expectPgError(client, () => client.query(`UPDATE ${TABLE} SET ${set} WHERE post_id = $1`, [a.postId]), DENIED);
    }
  });

  it('⭐ EXACT column grants (INSERT, UPDATE); table-level SELECT only', async () => {
    const { client } = getTx();
    expect(await grantedColumns(client, 'INSERT')).toEqual(['alert_id', 'claim_token', 'deadline_at', 'last_date', 'occasion', 'pariwar_id', 'pool_label', 'state', 'subject_id']);
    expect(await grantedColumns(client, 'UPDATE')).toEqual(['attempt_count', 'claim_token', 'detail', 'retry_not_before', 'state', 'telegram_message_id', 'updated_at']);
    const { rows } = await client.query<{ privilege_type: string }>(
      `SELECT privilege_type FROM information_schema.table_privileges WHERE table_name = $1 AND grantee = 'twt_app' ORDER BY privilege_type`,
      [TABLE],
    );
    expect(rows.map((r) => r.privilege_type)).toEqual(['SELECT']);
    const s = await seedPost(client, PARIWAR_A);
    await enterAppScope(client, PARIWAR_A);
    for (const over of [{ post_id: randomUUID() }, { attempt_count: 2 }, { detail: 'stale' }, { telegram_message_id: '1' }, { created_at: new Date() }]) {
      await expectPgError(client, () => insertRow(client, { ...validRow(s), ...over }), DENIED);
    }
  });

  it('⭐ AC7 / I4 — ⛔ a column that can hold a name or the post text: the columns are EXACTLY ids, states and the two short records', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND table_schema = current_schema() ORDER BY column_name`,
      [TABLE],
    );
    expect(rows.map((r) => r.column_name)).toEqual(
      ['alert_id', 'attempt_count', 'claim_token', 'created_at', 'deadline_at', 'detail', 'last_date', 'occasion', 'pariwar_id', 'pool_label', 'post_id', 'retry_not_before', 'state', 'subject_id', 'telegram_message_id', 'updated_at'],
    );
    // The two free-ish text columns are bounded so neither can carry a post (a bilingual post is ~300 characters — T11).
    const s = await seedPost(client, PARIWAR_A);
    await expectPgError(client, () => insertRow(client, { ...validRow(s), occasion: 'pool_open', subject_id: randomUUID(), last_date: null, pool_label: 'x'.repeat(101) }), CHECK('announcement_channel_posts_pool_label_check'));
    await expectPgError(client, () => insertRow(client, { ...validRow(s), last_date: 'Today, 13-11-2026' }), CHECK('announcement_channel_posts_last_date_check'));
  });

  it('review G1-3 — the alert FK also rejects another tenant alert as the BYPASSRLS role', async () => {
    const { client } = getTx();
    const a = await seedPost(client, PARIWAR_A);
    const b = await seedPost(client, PARIWAR_B);
    await expectPgError(client, () => insertRow(client, { ...validRow(a), alert_id: b.alertId, subject_id: b.alertId }), { code: '23503', constraint: 'announcement_channel_posts_alert_id_fk' });
  });

  it('the alert FK — an unknown alert is refused (23503)', async () => {
    const { client } = getTx();
    const s = await seedPost(client, PARIWAR_A);
    const ghost = randomUUID();
    await expectPgError(client, () => insertRow(client, { ...validRow(s), alert_id: ghost, subject_id: ghost }), { code: '23503', constraint: 'announcement_channel_posts_alert_id_fk' });
  });

  it('⭐ every named constraint and both indexes exist', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{ conname: string }>(
      `SELECT conname FROM pg_constraint WHERE conrelid = $1::regclass AND contype IN ('c', 'f', 'u', 'p') ORDER BY conname`,
      [TABLE],
    );
    expect(rows.map((r) => r.conname)).toEqual(
      [
        'announcement_channel_posts_alert_id_fk',
        'announcement_channel_posts_attempt_count_check',
        'announcement_channel_posts_claim_token_check',
        'announcement_channel_posts_detail_deferred_check',
        'announcement_channel_posts_detail_null_check',
        'announcement_channel_posts_detail_refused_check',
        'announcement_channel_posts_detail_skipped_check',
        'announcement_channel_posts_detail_unknown_check',
        'announcement_channel_posts_last_date_check',
        'announcement_channel_posts_last_day_subject_check',
        'announcement_channel_posts_message_id_check',
        'announcement_channel_posts_occasion_check',
        'announcement_channel_posts_occasion_fields_check',
        'announcement_channel_posts_pkey',
        'announcement_channel_posts_pool_label_check',
        'announcement_channel_posts_posted_message_id_check',
        'announcement_channel_posts_state_check',
      ].sort(),
    );
    const idx = await client.query<{ indexname: string; indexdef: string }>(`SELECT indexname, indexdef FROM pg_indexes WHERE tablename = $1`, [TABLE]);
    const def = (name: string) => idx.rows.find((r) => r.indexname === name)?.indexdef;
    expect(def('announcement_channel_posts_pariwar_occasion_subject_uq')).toMatch(/UNIQUE INDEX .* \(pariwar_id, occasion, subject_id\)$/);
    expect(def('announcement_channel_posts_pariwar_alert_idx')).toMatch(/\(pariwar_id, alert_id\)$/);
  });

  it('⭐ LOCKSTEP — every CHECK literal set equals the exported domain constants', async () => {
    const { client } = getTx();
    expect(await checkValues(client, 'announcement_channel_posts_occasion_check')).toEqual([...ANNOUNCEMENT_POST_OCCASIONS].sort());
    expect(await checkValues(client, 'announcement_channel_posts_state_check')).toEqual([...ANNOUNCEMENT_POST_STATES].sort());
    // Each per-state detail CHECK names its state first; the rest is the vocabulary.
    const minus = (vals: string[], state: string) => vals.filter((v) => v !== state);
    expect(minus(await checkValues(client, 'announcement_channel_posts_detail_deferred_check'), 'deferred')).toEqual([...ANNOUNCEMENT_POST_DEFERRED_DETAILS].sort());
    expect(minus(await checkValues(client, 'announcement_channel_posts_detail_skipped_check'), 'skipped')).toEqual([...ANNOUNCEMENT_POST_SKIPPED_DETAILS].sort());
    expect(minus(await checkValues(client, 'announcement_channel_posts_detail_refused_check'), 'refused')).toEqual([...ANNOUNCEMENT_POST_REFUSED_DETAILS].sort());
    expect(minus(await checkValues(client, 'announcement_channel_posts_detail_unknown_check'), 'unknown')).toEqual([...ANNOUNCEMENT_POST_UNKNOWN_DETAILS].sort());
    expect(await checkValues(client, 'announcement_channel_posts_detail_null_check')).toEqual(['attempting', 'posted']);
  });

  it('⭐ `-418` §3 — every `detail` per state has an accept / reject pair (the CHECK and `isAnnouncementPostDetail` agree)', async () => {
    const { client } = getTx();
    const s = await seedPost(client, PARIWAR_A);
    // Finished rows freeze, so each case moves the in-flight seed in a savepoint.
    const cases: Array<[state: string, detail: string | null, ok: boolean, constraint?: string]> = [
      ['attempting', null, true],
      ['attempting', 'stale', false, 'announcement_channel_posts_detail_null_check'],
      ['posted', 'stale', false, 'announcement_channel_posts_detail_null_check'],
      ['deferred', 'tg_429', true],
      ['deferred', null, false, 'announcement_channel_posts_detail_deferred_check'],
      ['deferred', 'tg_400', false, 'announcement_channel_posts_detail_deferred_check'],
      ...ANNOUNCEMENT_POST_SKIPPED_DETAILS.map((d) => ['skipped', d, true] as [string, string, boolean]),
      ['skipped', null, false, 'announcement_channel_posts_detail_skipped_check'],
      ['skipped', 'tg_429_expired', false, 'announcement_channel_posts_detail_skipped_check'],
      ['skipped', 'secret_unresolved', false, 'announcement_channel_posts_detail_skipped_check'],
      ...ANNOUNCEMENT_POST_REFUSED_DETAILS.map((d) => ['refused', d, true] as [string, string, boolean]),
      // ⭐ the `tg_<three digits>` pattern has no literal set — pinned by accept / reject cases.
      ['refused', 'tg_400', true],
      ['refused', 'tg_403', true],
      ['refused', 'tg_40', false, 'announcement_channel_posts_detail_refused_check'],
      ['refused', 'tg_4000', false, 'announcement_channel_posts_detail_refused_check'],
      ['refused', 'tg_abc', false, 'announcement_channel_posts_detail_refused_check'],
      ['refused', 'tg_400 Bad Request: chat not found', false, 'announcement_channel_posts_detail_refused_check'],
      ['refused', null, false, 'announcement_channel_posts_detail_refused_check'],
      ['refused', 'timeout_or_network', false, 'announcement_channel_posts_detail_refused_check'],
      ...ANNOUNCEMENT_POST_UNKNOWN_DETAILS.map((d) => ['unknown', d, true] as [string, string, boolean]),
      ['unknown', null, false, 'announcement_channel_posts_detail_unknown_check'],
      ['unknown', 'tg_500', false, 'announcement_channel_posts_detail_unknown_check'],
    ];
    for (const [state, detail, ok, constraint] of cases) {
      expect(isAnnouncementPostDetail(state as never, detail), `${state}:${String(detail)}`).toBe(ok);
      const extra = state === 'posted' ? ", telegram_message_id = '42'" : '';
      const run = () => client.query(`UPDATE ${TABLE} SET state = $2, detail = $3${extra} WHERE post_id = $1`, [s.postId, state, detail]);
      if (ok) await expectAccepted(client, run);
      else await expectPgError(client, run, CHECK(constraint!));
    }
  });

  it('the record shape: a pool opening its label and no date, a last day its date and its alert as subject; I3 posted ⇒ message_id', async () => {
    const { client } = getTx();
    const s = await seedPost(client, PARIWAR_A);
    const ins = (over: Record<string, unknown>) => () => insertRow(client, { ...validRow(s), ...over });
    await expectPgError(client, ins({ occasion: 'pool_open', subject_id: randomUUID() }), CHECK('announcement_channel_posts_occasion_fields_check'));
    await expectPgError(client, ins({ pool_label: 'A' }), CHECK('announcement_channel_posts_occasion_fields_check'));
    await expectPgError(client, ins({ last_date: null }), CHECK('announcement_channel_posts_occasion_fields_check'));
    await expectPgError(client, ins({ subject_id: randomUUID() }), CHECK('announcement_channel_posts_last_day_subject_check'));
    await expectPgError(client, ins({ occasion: 'cycle_open' }), CHECK('announcement_channel_posts_occasion_check'));
    await expectPgError(client, ins({ state: 'delivered' }), CHECK('announcement_channel_posts_state_check'));
    await expectPgError(client, ins({ claim_token: '' }), CHECK('announcement_channel_posts_claim_token_check'));
    await expectPgError(client, () => client.query(`UPDATE ${TABLE} SET state = 'posted' WHERE post_id = $1`, [s.postId]), CHECK('announcement_channel_posts_posted_message_id_check'));
    await expectPgError(client, () => client.query(`UPDATE ${TABLE} SET state = 'posted', telegram_message_id = '-1' WHERE post_id = $1`, [s.postId]), CHECK('announcement_channel_posts_message_id_check'));
  });

  it('⭐ I2 — ONE row per (Pariwar, occasion, subject): a second pool-open row for the pool is refused; another Pariwar may hold the same subject', async () => {
    const { client } = getTx();
    const s = await seedPost(client, PARIWAR_A);
    const dup = { ...validRow(s), occasion: 'pool_open', subject_id: s.poolId, last_date: null, pool_label: 'A' };
    await expectPgError(client, () => insertRow(client, dup), { code: '23505', constraint: 'announcement_channel_posts_pariwar_occasion_subject_uq' });
    const { tx } = getTx();
    const alertB = await seedAlert(tx, PARIWAR_B);
    await expectAccepted(client, () => insertRow(client, { ...dup, pariwar_id: PARIWAR_B, alert_id: alertB }));
  });

  it('⭐ the trigger — a FINISHED row is frozen (any column, even the superuser); `deferred` moves only to deferred / attempting / refused', async () => {
    const { client } = getTx();
    const s = await seedPost(client, PARIWAR_A);
    const upd = (set: string) => () => client.query(`UPDATE ${TABLE} SET ${set} WHERE post_id = $1`, [s.postId]);
    await client.query(`UPDATE ${TABLE} SET state = 'deferred', detail = 'tg_429' WHERE post_id = $1`, [s.postId]);
    for (const set of ["state = 'posted', detail = NULL, telegram_message_id = '5'", "state = 'unknown', detail = 'http_5xx'", "state = 'skipped', detail = 'stale'"]) {
      await expectPgError(client, upd(set), { code: '23000', message: expect.stringMatching(/deferred row/) });
    }
    await expectAccepted(client, upd("state = 'refused', detail = 'tg_429_expired'"));
    await expectAccepted(client, upd("state = 'deferred'"));
    await client.query(`UPDATE ${TABLE} SET state = 'attempting', detail = NULL WHERE post_id = $1`, [s.postId]);
    await client.query(`UPDATE ${TABLE} SET state = 'posted', telegram_message_id = '777' WHERE post_id = $1`, [s.postId]);
    for (const set of ["state = 'attempting'", "state = 'unknown', detail = 'http_5xx', telegram_message_id = NULL", 'updated_at = now()', "claim_token = 'j:1'"]) {
      await expectPgError(client, upd(set), FROZEN);
    }
    const trg = await client.query<{ tgenabled: string }>(`SELECT tgenabled FROM pg_trigger WHERE tgname = 'announcement_channel_posts_guard_update' AND tgrelid = $1::regclass`, [TABLE]);
    expect(trg.rows).toEqual([{ tgenabled: 'O' }]);
  });

  describe('the domain accessors — the row life, as `twt_app`', () => {
    async function freshRecord(client: Client) {
      const { tx } = getTx();
      const alertId = await seedAlert(tx, PARIWAR_A);
      await enterAppScope(client, PARIWAR_A);
      return { pariwarId: PARIWAR_A, occasion: 'pool_open' as const, subjectId: randomUUID(), alertId, poolLabel: 'A', lastDate: null };
    }

    it('⭐ attempting → deferred → attempting (a NEW token; a stale holder of the old one cannot finalise) → posted', async () => {
      const { client } = getTx();
      const rec = await freshRecord(client);
      expect(await lookupAnnouncementPost(client, rec)).toEqual({ kind: 'none' });
      const begun = await beginAnnouncementPost(client, { ...rec, claimToken: 'job:0' });
      expect(begun).toMatchObject({ kind: 'begun', attemptCount: 1 });
      if (begun.kind !== 'begun') throw new Error('unreachable');
      expect(await lookupAnnouncementPost(client, rec)).toEqual({ kind: 'in_flight', postId: begun.postId });
      expect(await beginAnnouncementPost(client, { ...rec, claimToken: 'other:0' })).toEqual({ kind: 'taken' });
      expect(await finaliseAnnouncementPost(client, { pariwarId: PARIWAR_A, postId: begun.postId, claimToken: 'other:0', state: 'refused', detail: 'tg_400' })).toBe(false);
      expect(await finaliseAnnouncementPost(client, { pariwarId: PARIWAR_A, postId: begun.postId, claimToken: 'job:0', state: 'deferred', detail: 'tg_429' })).toBe(true);
      expect(await lookupAnnouncementPost(client, rec)).toMatchObject({ kind: 'deferred', postId: begun.postId, retryAfterSeconds: expect.any(Number) });
      expect(await beginAnnouncementPost(client, { ...rec, claimToken: 'early:0' })).toEqual({ kind: 'taken' });
      await client.query(`UPDATE announcement_channel_posts SET retry_not_before = clock_timestamp() - interval '1 second' WHERE pariwar_id = $1 AND post_id = $2`, [PARIWAR_A, begun.postId]);
      const again = await beginAnnouncementPost(client, { ...rec, claimToken: 'job:1' });
      expect(again).toEqual({ kind: 'begun', postId: begun.postId, attemptCount: 2 });
      // T15 — the OLD token's holder (a pg-boss redelivery of the first attempt) cannot finalise the re-claimed row.
      expect(await finaliseAnnouncementPost(client, { pariwarId: PARIWAR_A, postId: begun.postId, claimToken: 'job:0', state: 'posted', detail: null, telegramMessageId: '9' })).toBe(false);
      await expect(finaliseAnnouncementPost(client, { pariwarId: PARIWAR_A, postId: begun.postId, claimToken: 'job:1', state: 'posted', detail: null })).rejects.toThrow(/message_id/);
      expect(await finaliseAnnouncementPost(client, { pariwarId: PARIWAR_A, postId: begun.postId, claimToken: 'job:1', state: 'posted', detail: null, telegramMessageId: '12345' })).toBe(true);
      expect(await lookupAnnouncementPost(client, rec)).toEqual({ kind: 'final', postId: begun.postId, state: 'posted', detail: null });
      expect(await rowOf(client, begun.postId)).toEqual({ state: 'posted', detail: null, attempt_count: 2, claim_token: 'job:1', telegram_message_id: '12345' });
      // ⛔ a re-claim of a finished row (a retry after `posted` posts nothing).
      expect(await beginAnnouncementPost(client, { ...rec, claimToken: 'job:2' })).toEqual({ kind: 'taken' });
    });

    it('a detail outside the state\'s vocabulary is refused BEFORE the statement', async () => {
      const { client } = getTx();
      const rec = await freshRecord(client);
      const begun = await beginAnnouncementPost(client, { ...rec, claimToken: 'job:0' });
      if (begun.kind !== 'begun') throw new Error('unreachable');
      await expect(finaliseAnnouncementPost(client, { pariwarId: PARIWAR_A, postId: begun.postId, claimToken: 'job:0', state: 'unknown', detail: 'chat not found' })).rejects.toThrow(/not a unknown detail/);
      await expect(finaliseAnnouncementPost(client, { pariwarId: PARIWAR_A, postId: begun.postId, claimToken: 'job:0', state: 'deferred', detail: 'tg_400' })).rejects.toThrow(/deferred detail/);
      expect(await finaliseAnnouncementPost(client, { pariwarId: PARIWAR_A, postId: begun.postId, claimToken: 'job:0', state: 'unknown', detail: 'timeout_or_network' })).toBe(true);
      expect(await lookupAnnouncementPost(client, rec)).toEqual({ kind: 'final', postId: begun.postId, state: 'unknown', detail: 'timeout_or_network' });
    });

    it('⭐ the stale lease: `attempting` past the lease ⇒ `stale` ⇒ `unknown:stale_lease` (⛔ inside the lease); the late finalise is a no-op', async () => {
      const { client } = getTx();
      const rec = await freshRecord(client);
      const begun = await beginAnnouncementPost(client, { ...rec, claimToken: 'job:0' });
      if (begun.kind !== 'begun') throw new Error('unreachable');
      expect(await finaliseStaleAnnouncementPost(client, { pariwarId: PARIWAR_A, postId: begun.postId })).toBe(false);
      await client.query(`UPDATE ${TABLE} SET updated_at = clock_timestamp() - ($2::int * interval '1 millisecond') - interval '1 second' WHERE post_id = $1`, [begun.postId, ANNOUNCEMENT_POST_LEASE_MS]);
      expect(await lookupAnnouncementPost(client, rec)).toEqual({ kind: 'stale', postId: begun.postId });
      expect(await finaliseStaleAnnouncementPost(client, { pariwarId: PARIWAR_A, postId: begun.postId })).toBe(true);
      expect(await rowOf(client, begun.postId)).toMatchObject({ state: 'unknown', detail: 'stale_lease' });
      expect(await finaliseAnnouncementPost(client, { pariwarId: PARIWAR_A, postId: begun.postId, claimToken: 'job:0', state: 'posted', detail: null, telegramMessageId: '1' })).toBe(false);
    });

    it('⭐ a `deferred` row is re-claimable only while YOUNG: 29 min ⇒ `deferred`, 31 min ⇒ `deferred_expired` (begin refuses it); the give-up freezes it `refused:tg_429_expired`', async () => {
      const { client } = getTx();
      const rec = await freshRecord(client);
      const begun = await beginAnnouncementPost(client, { ...rec, claimToken: 'job:0' });
      if (begun.kind !== 'begun') throw new Error('unreachable');
      await finaliseAnnouncementPost(client, { pariwarId: PARIWAR_A, postId: begun.postId, claimToken: 'job:0', state: 'deferred', detail: 'tg_429' });
      await client.query(`UPDATE ${TABLE} SET updated_at = clock_timestamp() - interval '29 minutes' WHERE post_id = $1`, [begun.postId]);
      expect(await lookupAnnouncementPost(client, rec)).toMatchObject({ kind: 'deferred', postId: begun.postId, retryAfterSeconds: expect.any(Number) });
      expect(await beginAnnouncementPost(client, { ...rec, claimToken: 'early:0' })).toEqual({ kind: 'taken' });
      await client.query(`UPDATE announcement_channel_posts SET retry_not_before = clock_timestamp() - interval '1 second' WHERE pariwar_id = $1 AND post_id = $2`, [PARIWAR_A, begun.postId]);
      await client.query(`UPDATE ${TABLE} SET updated_at = clock_timestamp() - interval '31 minutes' WHERE post_id = $1`, [begun.postId]);
      expect(await lookupAnnouncementPost(client, rec)).toEqual({ kind: 'deferred_expired', postId: begun.postId });
      expect(await beginAnnouncementPost(client, { ...rec, claimToken: 'job:1' })).toEqual({ kind: 'taken' });
      expect(await giveUpDeferredAnnouncementPost(client, { pariwarId: PARIWAR_A, postId: begun.postId, detail: 'tg_429_expired', onlyIfExpired: true })).toBe(true);
      expect(await giveUpDeferredAnnouncementPost(client, { pariwarId: PARIWAR_A, postId: begun.postId, detail: 'tg_429_expired', onlyIfExpired: true })).toBe(false);
      expect(await lookupAnnouncementPost(client, rec)).toEqual({ kind: 'final', postId: begun.postId, state: 'refused', detail: 'tg_429_expired' });
    });

    it('⭐ `-418` item 11 — a found `deferred` row is GIVEN UP to `refused:<reason>` (a YOUNG one too, without `onlyIfExpired`); ⛔ an attempting row', async () => {
      const { client } = getTx();
      const rec = await freshRecord(client);
      const begun = await beginAnnouncementPost(client, { ...rec, claimToken: 'job:0' });
      if (begun.kind !== 'begun') throw new Error('unreachable');
      expect(await giveUpDeferredAnnouncementPost(client, { pariwarId: PARIWAR_A, postId: begun.postId, detail: 'switch_off' })).toBe(false);
      await finaliseAnnouncementPost(client, { pariwarId: PARIWAR_A, postId: begun.postId, claimToken: 'job:0', state: 'deferred', detail: 'tg_429' });
      // a young row, given up with an onlyIfExpired guard: ⛔ (another attempt may still re-claim it)
      expect(await giveUpDeferredAnnouncementPost(client, { pariwarId: PARIWAR_A, postId: begun.postId, detail: 'tg_429_expired', onlyIfExpired: true })).toBe(false);
      await expect(giveUpDeferredAnnouncementPost(client, { pariwarId: PARIWAR_A, postId: begun.postId, detail: 'stale_lease' })).rejects.toThrow(/refused detail/);
      expect(await giveUpDeferredAnnouncementPost(client, { pariwarId: PARIWAR_A, postId: begun.postId, detail: 'switch_off' })).toBe(true);
      expect(await lookupAnnouncementPost(client, rec)).toEqual({ kind: 'final', postId: begun.postId, state: 'refused', detail: 'switch_off' });
    });

    it('⭐ `-418` item 11 — a never-attempted final row: INSERT `attempting` + the compare-and-set, as `twt_app`; a second write finds the row', async () => {
      const { client } = getTx();
      const rec = await freshRecord(client);
      expect(await recordUnattemptedAnnouncementPost(client, { ...rec, claimToken: 'job:0', state: 'skipped', detail: 'switch_off' })).toBe(true);
      expect(await lookupAnnouncementPost(client, rec)).toMatchObject({ kind: 'final', state: 'skipped', detail: 'switch_off' });
      expect(await recordUnattemptedAnnouncementPost(client, { ...rec, claimToken: 'job:1', state: 'refused', detail: 'secret_unresolved' })).toBe(false);
      await expect(recordUnattemptedAnnouncementPost(client, { ...rec, subjectId: randomUUID(), claimToken: 'job:2', state: 'skipped', detail: 'secret_unresolved' })).rejects.toThrow(/skipped detail/);
      // a last day records its date and has its alert as subject
      const lastDay = { ...rec, occasion: 'last_day' as const, subjectId: rec.alertId, poolLabel: null, lastDate: '13-11-2026' };
      expect(await recordUnattemptedAnnouncementPost(client, { ...lastDay, claimToken: 'job:3', state: 'refused', detail: 'identity_unavailable' })).toBe(true);
      await expect(recordUnattemptedAnnouncementPost(client, { ...lastDay, subjectId: randomUUID(), claimToken: 'job:4', state: 'skipped', detail: 'stale' })).rejects.toThrow(/last_day row/);
    });
  });

  describe('⭐ I6 — the accessors isolate by an EXPLICIT `pariwar_id` predicate (the job runs on the BYPASSRLS pool: here, the superuser)', () => {
    it("a lookup / begin / finalise for Pariwar A never sees or touches Pariwar B's row for the SAME subject", async () => {
      const { client, tx } = getTx();
      const alertA = await seedAlert(tx, PARIWAR_A);
      const alertB = await seedAlert(tx, PARIWAR_B);
      const subjectId = randomUUID();
      const recB = { pariwarId: PARIWAR_B, occasion: 'pool_open' as const, subjectId, alertId: alertB, poolLabel: 'A', lastDate: null };
      const begunB = await beginAnnouncementPost(client, { ...recB, claimToken: 'b:0' });
      if (begunB.kind !== 'begun') throw new Error('unreachable');
      const recA = { ...recB, pariwarId: PARIWAR_A, alertId: alertA };
      expect(await lookupAnnouncementPost(client, recA)).toEqual({ kind: 'none' });
      expect(await finaliseAnnouncementPost(client, { pariwarId: PARIWAR_A, postId: begunB.postId, claimToken: 'b:0', state: 'refused', detail: 'tg_400' })).toBe(false);
      expect(await finaliseStaleAnnouncementPost(client, { pariwarId: PARIWAR_A, postId: begunB.postId })).toBe(false);
      const begunA = await beginAnnouncementPost(client, { ...recA, claimToken: 'a:0' });
      expect(begunA).toMatchObject({ kind: 'begun' });
      expect(await rowOf(client, begunB.postId)).toMatchObject({ state: 'attempting', claim_token: 'b:0' });
    });

    it('the pools-only read and the gap count read only the given Pariwar', async () => {
      const { client, tx } = getTx();
      const cycleId = randomUUID();
      const p0 = await seedPool(tx, PARIWAR_A, { cycleId, poolIndex: 0 });
      const p1 = await seedPool(tx, PARIWAR_A, { cycleId, poolIndex: 1 });
      await seedPool(tx, PARIWAR_B, { cycleId, poolIndex: 0 });
      const pools = await listCyclePoolsForAnnouncement(client, { pariwarId: PARIWAR_A, cycleId });
      expect(pools.map((p) => p.poolId)).toEqual([p0, p1]);
      expect(Object.keys(pools[0]!).sort()).toEqual(['claimCaseId', 'fixedAmount', 'poolCanonicalIdentifier', 'poolId', 'poolIndex']);
      expect(await countPoolOpenPostGaps(client, { pariwarId: PARIWAR_A, cycleId })).toBe(2);
      const alertId = await seedAlert(tx, PARIWAR_A, { cycleId });
      await recordUnattemptedAnnouncementPost(client, { pariwarId: PARIWAR_A, occasion: 'pool_open', subjectId: p0, alertId, poolLabel: 'A', lastDate: null, claimToken: 'j:0', state: 'skipped', detail: 'switch_off' });
      expect(await countPoolOpenPostGaps(client, { pariwarId: PARIWAR_A, cycleId })).toBe(1);
      expect(await countPoolOpenPostGaps(client, { pariwarId: PARIWAR_B, cycleId })).toBe(1);
    });
  });
});
