// Story 5.14 (Task 4; AC4–AC7; I1–I6) — the Trust's announcement channel poster, END TO END against a live database: a fresh Pariwar,
// the deceased member (a REAL KYC name envelope, the local KMS) and their claim through the projector, a live alert, pools, the
// channels config and the Pariwar's bot row. Telegram is a FAKE server behind an injected `fetchImpl` (never the network). The job
// runs on the superuser pool (the BYPASSRLS jobs posture — I6: only the explicit `pariwar_id` predicate isolates it).

import { randomUUID } from 'node:crypto';

import { createTelegramAppCache } from '@twt/channels';
import { buildAnnouncementPost } from '@twt/contracts';
import { announcementChannels, bindScopedDb, claim, contribution, encryption, ids, pool as poolDomain, schema } from '@twt/domain';
import { t } from '@twt/i18n';
import type { JobEnvelope, QueueClient } from '@twt/queue';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { buildJobsEncryptionDeps } from '../src/deps.js';
import {
  ANNOUNCEMENT_DEFAULT_RETRY_AFTER_SECONDS,
  ANNOUNCEMENT_POOL_PACING_SECONDS,
  ANNOUNCEMENT_POST_MAX_ATTEMPTS,
  ANNOUNCEMENT_POST_RETRY,
  createAnnouncementPoster,
  createAnnouncementPostTrigger,
  type AnnouncementPosterDeps,
  type AnnouncementPostPayload,
} from '../src/scheduler/announcement-channel-post.js';
import { runContributionNotifyRecoverySweep } from '../src/scheduler/contribution-notify-triggers.js';
import { onOwnTx } from './_claim-correction-seed.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const enc = buildJobsEncryptionDeps('announcement-channel-post-live-pepper');
const NAME = 'Ramesh Kumar Sharma';
const CHAT = '@twt_bihar_notices';
const FINAL = { retryCount: 4, retryLimit: 4 } as const;
const FIRST = { retryCount: 0, retryLimit: 4 } as const;

type Reply = { readonly ok: boolean; readonly status: number; readonly body: unknown } | 'hang' | 'reject';

describe.skipIf(!hasDatabase)('Story 5.14 — the announcement channel poster, live (AC4–AC7)', { timeout: 60_000 }, () => {
  let pool: pg.Pool;
  const pariwars: string[] = [];

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 6, ssl: false, connectionTimeoutMillis: 5000 });
  });
  afterAll(async () => {
    try {
      if (pariwars.length === 0) return;
      const c = await pool.connect();
      try {
        await c.query('BEGIN');
        await c.query("SET LOCAL session_replication_role = 'replica'");
        const { rows } = await c.query<{ table_name: string }>(
          `SELECT c.table_name FROM information_schema.columns c
             JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name
            WHERE c.table_schema = 'public' AND c.column_name = 'pariwar_id' AND t.table_type = 'BASE TABLE'`,
        );
        for (const { table_name } of rows) await c.query(`DELETE FROM "${table_name}" WHERE pariwar_id::text = ANY($1)`, [pariwars]);
        await c.query('COMMIT');
      } catch (e) {
        await c.query('ROLLBACK').catch(() => undefined);
        throw e;
      } finally {
        c.release();
      }
    } finally {
      await pool.end();
    }
  });

  /** A fresh Pariwar: the deceased (a real KYC envelope) + claim, a live alert, `pools` pools, the channels ON and the bot row. */
  async function world(o: { readonly pools?: number; readonly shielded?: boolean; readonly name?: string; readonly kyc?: boolean; readonly enabled?: boolean; readonly botName?: string | null; readonly chatId?: string; readonly firstPoolIndex?: number; readonly curatedHi?: string } = {}) {
    const pid = randomUUID();
    pariwars.push(pid);
    await pool.query(
      `INSERT INTO pariwar_passport (pariwar_id, display_name_en, display_name_hi, legal_name, branding_bundle, locale_default)
       VALUES ($1, 'Test Pariwar EN', 'परीक्षण परिवार', 'Test Welfare Trust', $2, 'hi')`,
      [pid, JSON.stringify({ logo_url: 'https://x/l.png', primary_color: '#0A3D62', secondary_color: '#FFFFFF' })],
    );
    if (o.shielded) await pool.query(`INSERT INTO pariwar_public_name_presentation (pariwar_id, mode) VALUES ($1, 'shielded_name')`, [pid]);
    const deceased = randomUUID();
    const claimCaseId = randomUUID();
    await onOwnTx(pool, pid, async (client) => {
      const db = bindScopedDb(client);
      const p = ids.pariwarId(pid);
      await db.insert(schema.members).values({ memberId: ids.memberId(deceased), pariwarId: p, state: 'active', stateEventVersion: 1 });
      if (o.kyc !== false) {
        await db.insert(schema.memberKycProfiles).values({
          memberId: ids.memberId(deceased),
          pariwarId: p,
          nameCiphertext: await encryption.encryptKycField(o.name ?? NAME, pid, enc),
          dobCiphertext: await encryption.encryptKycField('1950-01-01', pid, enc),
          verificationStrength: 'self_declared',
          source: 'manual',
        });
      }
      await claim.projectClaimState(client, {
        claimCaseId: ids.claimId(claimCaseId),
        pariwarId: p,
        deceasedMemberId: ids.memberId(deceased),
        intakeChannels: ['member_app'],
        claimantActorId: null,
        eventType: 'claim.intake_initiated' as never,
        payload: { from_state: null, to_state: 'intake_pending', trigger: 'test', actor: 'system', deceased_member_id: deceased, intake_channel: 'member_app', claimant_actor_id: null } as never,
        actorId: null,
      });
    });
    const alertId = randomUUID();
    const cycleId = randomUUID();
    const poolIds: string[] = [];
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query("SET LOCAL app.alert_state_writer = 'on'");
      await c.query(
        `INSERT INTO alerts (alert_id, cycle_id, pariwar_id, pool_count, current_state, state_event_version, created_by_actor)
         VALUES ($1, $2, $3, $4, 'live', 3, 'system')`,
        [alertId, cycleId, pid, o.pools ?? 1],
      );
      await c.query("SET LOCAL app.pool_state_writer = 'on'");
      for (let i = 0; i < (o.pools ?? 1); i += 1) {
        const poolId = randomUUID();
        poolIds.push(poolId);
        await c.query(
          `INSERT INTO pools (pool_id, pariwar_id, cycle_id, claim_case_id, pool_index, pool_canonical_identifier, support_category,
                              benefit_mechanism, fixed_amount, current_state, state_event_version, public_token)
           VALUES ($1, $2, $3, $4, $5, $6, 'death_support', 'pool', 500, 'spawned', 1, $7)`,
          [poolId, pid, cycleId, claimCaseId, i + (o.firstPoolIndex ?? 0), `P-2026-10-${poolId.slice(0, 3)}`, poolDomain.mintPoolPublicToken()],
        );
      }
      await c.query('COMMIT');
    } finally {
      c.release();
    }
    if (o.enabled !== false || o.chatId) {
      await pool.query(
        `INSERT INTO pariwar_announcement_channels (pariwar_id, enabled, telegram_channel_chat_id, telegram_invite_url, whatsapp_channel_url)
         VALUES ($1, $2, $3, 'https://t.me/twt_bihar_notices', 'https://whatsapp.com/channel/0029Va')`,
        [pid, o.enabled !== false, o.chatId ?? CHAT],
      );
    }
    if (o.botName !== null) {
      await pool.query(`INSERT INTO pariwar_telegram_config (pariwar_id, enabled, bot_username, bot_token_secret_name) VALUES ($1, false, 'twt_bot', $2)`, [
        pid,
        o.botName ?? 'projects/twt/secrets/tg-bot',
      ]);
    }
    if (o.curatedHi !== undefined) {
      // review FD-P6 — one APPROVED curated pool name (position 0): the poster reads it through `resolveCuratedPoolName`.
      await pool.query(
        `INSERT INTO pool_names (pariwar_id, position_in_ordered_list, display_name_en, display_name_hi, approval_status) VALUES ($1, 0, 'Curated', $2, 'approved')`,
        [pid, o.curatedHi],
      );
    }
    return { pid, alertId, cycleId, poolIds };
  }

  /** A fake Telegram server: replies in order (the last one repeats); records every request. */
  function harness(replies: Reply[] = [{ ok: true, status: 200, body: { ok: true, result: { message_id: 4242 } } }], over: Partial<AnnouncementPosterDeps> = {}) {
    const requests: { chatId: string; text: string }[] = [];
    const alarms: string[] = [];
    const sends: { name: string; data: JobEnvelope<AnnouncementPostPayload>; options: Record<string, unknown> }[] = [];
    let i = 0;
    const fetchImpl = (_url: string, init: { body: string; signal?: AbortSignal }) => {
      const body = JSON.parse(init.body) as { chat_id: string; text: string };
      requests.push({ chatId: body.chat_id, text: body.text });
      const reply = replies[Math.min(i, replies.length - 1)]!;
      i += 1;
      if (reply === 'reject') return Promise.reject(new Error('ECONNRESET'));
      if (reply === 'hang') {
        return new Promise<never>((_res, rej) => {
          if (init.signal?.aborted) rej(new DOMException('aborted', 'TimeoutError'));
          init.signal?.addEventListener('abort', () => rej(new DOMException('aborted', 'TimeoutError')));
        });
      }
      return Promise.resolve({ ok: reply.ok, status: reply.status, json: () => Promise.resolve(reply.body) });
    };
    const poster = createAnnouncementPoster({
      pool,
      encryption: enc,
      resolveSecret: () => Promise.resolve('123456:TEST-TOKEN'),
      // the hung case aborts at once (an already-aborted signal) — the real bound is 9 s
      telegram: createTelegramAppCache(fetchImpl as never, { timeoutSignal: (ms) => (replies.includes('hang') ? AbortSignal.abort() : AbortSignal.timeout(ms)) }),
      onAlarm: (m) => alarms.push(m),
      ...over,
    });
    const boss = {
      send: vi.fn((name: string, data: unknown, options: unknown) => {
        sends.push({ name, data: data as JobEnvelope<AnnouncementPostPayload>, options: options as Record<string, unknown> });
        return Promise.resolve(randomUUID());
      }),
    } as unknown as Pick<QueueClient, 'send'>;
    return { poster, boss, requests, alarms, sends };
  }

  const env = (pariwarId: string, payload: AnnouncementPostPayload): JobEnvelope<AnnouncementPostPayload> => ({
    requestId: 'req-1',
    pariwarId,
    actorId: null,
    traceId: 'trace-1',
    payload,
  });
  const poolJob = (w: Awaited<ReturnType<typeof world>>, i = 0) => env(w.pid, { alertId: w.alertId, cycleId: w.cycleId, poolId: w.poolIds[i]!, occasion: 'pool_open' });
  const rowOf = async (pariwarId: string, subjectId: string) =>
    (await pool.query<{ state: string; detail: string | null; telegram_message_id: string | null; claim_token: string; attempt_count: number; pool_label: string | null; last_date: string | null }>(
      `SELECT state, detail, telegram_message_id, claim_token, attempt_count, pool_label, last_date FROM announcement_channel_posts WHERE pariwar_id = $1 AND subject_id = $2`,
      [pariwarId, subjectId],
    )).rows;

  it('⭐ the CYCLE job fans out ONE pool child per pool, the i-th `startAfter` i × 3 s, ids only, with the explicit retry policy', async () => {
    const w = await world({ pools: 3 });
    const h = harness();
    expect(await h.poster.run(h.boss, env(w.pid, { alertId: w.alertId, cycleId: w.cycleId, occasion: 'pool_open' }), FIRST)).toEqual({ kind: 'fanned_out', pools: 3 });
    expect(h.sends.map((s) => s.data.payload)).toEqual(w.poolIds.map((poolId) => ({ alertId: w.alertId, cycleId: w.cycleId, poolId, occasion: 'pool_open' })));
    expect(h.sends.map((s) => s.options['startAfter'])).toEqual([undefined, ANNOUNCEMENT_POOL_PACING_SECONDS, 2 * ANNOUNCEMENT_POOL_PACING_SECONDS]);
    for (const s of h.sends) {
      expect(s.name).toBe('announcement.channel.post');
      expect(s.options).toMatchObject(ANNOUNCEMENT_POST_RETRY);
      expect(s.data.pariwarId).toBe(w.pid);
    }
    expect(h.requests).toHaveLength(0); // the cycle job posts nothing itself
  });

  it('⭐ AC7 / I4 / I5 — the pool child posts EXACTLY the builder\'s text (the full name, the letter code), records posted + the message id; ⛔ a name in the row', async () => {
    const w = await world();
    const sentinels: string[] = [];
    await onOwnTx(pool, w.pid, async (client) => {
      const db = bindScopedDb(client);
      for (const [i, status] of ['yellow', 'green', 'red'].entries()) {
        const mid = ids.memberId(randomUUID());
        const name = `ContributorPrivacySentinel${String(i)}`;
        const mobile = `+91987654000${String(i)}`;
        sentinels.push(name, mobile, status, '987654', '500');
        await db.insert(schema.members).values({ memberId: mid, pariwarId: ids.pariwarId(w.pid), state: 'active', stateEventVersion: 1 });
        await db.insert(schema.memberKycProfiles).values({ memberId: mid, pariwarId: ids.pariwarId(w.pid), nameCiphertext: await encryption.encryptKycField(name, w.pid, enc), dobCiphertext: await encryption.encryptKycField('1980-01-01', w.pid, enc), verificationStrength: 'self_declared', source: 'manual' });
        // Login identities use the fixed identity namespace and member_mobile AAD, as the real signup writer does.
        const mobileCiphertext = encryption.serializeEnvelope(await encryption.encryptTier1(Buffer.from(mobile, 'utf8'), { pariwarId: '00000000-0000-0000-0000-000000000001', fieldClass: 'member_mobile' }, enc.kms, enc.kekRef));
        await db.insert(schema.memberIdentities).values({ memberId: mid, pariwarId: ids.pariwarId(w.pid), mobileCiphertext, mobileBlindIndex: randomUUID() });
        await db.insert(schema.memberPoolAssignments).values({ memberId: mid, pariwarId: ids.pariwarId(w.pid), poolId: ids.poolId(w.poolIds[0]!), cycleId: ids.cycleFreezeCommitId(w.cycleId), assignedAt: new Date() });
        await contribution.attestContributionUtr(client, { pariwarId: ids.pariwarId(w.pid), alertId: ids.alertId(w.alertId), poolId: ids.poolId(w.poolIds[0]!), memberId: mid, tr: poolDomain.deriveContributionReference({ memberId: mid, alertId: ids.alertId(w.alertId) }), utr: `98765432100${String(i)}`, actorId: mid });
        if (status !== 'yellow') {
          await db.insert(schema.eventsLog).values({ streamId: randomUUID(), pariwarId: ids.pariwarId(w.pid), eventType: status === 'green' ? 'contribution.confirmed' : 'contribution.reconciliation-mismatch', eventVersion: 1, payload: { poolId: w.poolIds[0], memberId: mid, amount: 987654 } });
        }
        const history = await contribution.listMemberContributionHistory(db, { pariwarId: ids.pariwarId(w.pid), memberId: mid });
        expect(history.some((row) => row.status === status)).toBe(true);
      }
    });
    const h = harness();
    expect(await h.poster.run(h.boss, poolJob(w), FIRST)).toEqual({ kind: 'done', state: 'posted', detail: null });
    for (const sentinel of sentinels) expect(h.requests[0]!.text).not.toContain(sentinel);
    expect(h.requests).toEqual([{ chatId: CHAT, text: buildAnnouncementPost(t, { occasion: 'pool_open', poolLabel: 'A', deceasedName: NAME }) }]);
    const rows = await rowOf(w.pid, w.poolIds[0]!);
    expect(rows).toEqual([{ state: 'posted', detail: null, telegram_message_id: '4242', claim_token: expect.any(String), attempt_count: 1, pool_label: 'A', last_date: null }]);
    expect(JSON.stringify(rows)).not.toContain('Ramesh');
  });

  it('⭐ I5 / `-416` — a Pariwar stored as `shielded_name` still posts the FULL name; a one-word name posts in full', async () => {
    const shielded = await world({ shielded: true });
    const h = harness();
    await h.poster.run(h.boss, poolJob(shielded), FIRST);
    expect(h.requests[0]!.text).toContain(`in support of ${NAME}'s family`);
    const mononym = await world({ name: 'Sunita' });
    const h2 = harness();
    await h2.poster.run(h2.boss, poolJob(mononym), FIRST);
    expect(h2.requests[0]!.text).toContain("in support of Sunita's family");
  });

  it('⭐ I2 — a second job for the same subject, and a retry after `posted`, post NOTHING', async () => {
    const w = await world();
    const h = harness();
    await h.poster.run(h.boss, poolJob(w), FIRST);
    expect(await h.poster.run(h.boss, poolJob(w), FIRST)).toEqual({ kind: 'done', state: 'posted', detail: null });
    expect(await h.poster.run(h.boss, poolJob(w), FINAL)).toEqual({ kind: 'done', state: 'posted', detail: null });
    expect(h.requests).toHaveLength(1);
  });

  it('⭐ a 429 with retry_after 7 ⇒ `deferred` + the job re-sent with startAfter 7 (ids only — ⛔ a token); the re-claim ROTATES the token', async () => {
    const w = await world();
    const h = harness([
      { ok: false, status: 429, body: { ok: false, error_code: 429, description: 'Too Many Requests: retry after 7', parameters: { retry_after: 7 } } },
      { ok: true, status: 200, body: { ok: true, result: { message_id: 77 } } },
    ]);
    expect(await h.poster.run(h.boss, poolJob(w), FIRST)).toEqual({ kind: 'done', state: 'deferred', detail: 'tg_429' });
    const [first] = await rowOf(w.pid, w.poolIds[0]!);
    expect(first).toMatchObject({ state: 'deferred', detail: 'tg_429', attempt_count: 1 });
    expect(h.sends).toHaveLength(1);
    expect(h.sends[0]!.options).toMatchObject({ ...ANNOUNCEMENT_POST_RETRY, startAfter: 7 });
    expect(h.sends[0]!.data.payload).toEqual(poolJob(w).payload);
    expect(JSON.stringify(h.sends[0]!.data)).not.toContain(first!.claim_token);
    // An early duplicate cannot bypass Telegram's delay.
    expect(await h.poster.run(h.boss, poolJob(w), FIRST)).toEqual({ kind: 'done', state: 'deferred', detail: 'tg_429' });
    expect(h.requests).toHaveLength(1);
    await pool.query(`UPDATE announcement_channel_posts SET retry_not_before = clock_timestamp() - interval '1 second' WHERE pariwar_id = $1`, [w.pid]);
    // the re-sent job re-claims with a NEW token and posts
    expect(await h.poster.run(h.boss, h.sends[0]!.data, FIRST)).toEqual({ kind: 'done', state: 'posted', detail: null });
    const [second] = await rowOf(w.pid, w.poolIds[0]!);
    expect(second).toMatchObject({ state: 'posted', attempt_count: 2, telegram_message_id: '77' });
    expect(second!.claim_token).not.toBe(first!.claim_token);
    // a stale holder of the OLD token cannot finalise
    const postId = (await pool.query<{ post_id: string }>(`SELECT post_id FROM announcement_channel_posts WHERE pariwar_id = $1 AND subject_id = $2`, [w.pid, w.poolIds[0]])).rows[0]!.post_id;
    expect(await announcementChannels.finaliseAnnouncementPost(pool, { pariwarId: w.pid, postId, claimToken: first!.claim_token, state: 'unknown', detail: 'unclassified' })).toBe(false);
  });

  it('review FD-P1 — a 429 whose body carries NO Telegram error_code (an intermediary\'s throttle) is DEFERRED and re-sent, ⛔ ended `unknown:unclassified`', async () => {
    const w = await world();
    const h = harness([
      { ok: false, status: 429, body: null },
      { ok: true, status: 200, body: { ok: true, result: { message_id: 78 } } },
    ]);
    expect(await h.poster.run(h.boss, poolJob(w), FIRST)).toEqual({ kind: 'done', state: 'deferred', detail: 'tg_429' });
    expect((await rowOf(w.pid, w.poolIds[0]!))[0]).toMatchObject({ state: 'deferred', detail: 'tg_429', attempt_count: 1 });
    // no `retry_after` in the body ⇒ the default delay; and nobody is told "check the channel by hand"
    expect(h.sends).toHaveLength(1);
    expect(h.sends[0]!.options).toMatchObject({ ...ANNOUNCEMENT_POST_RETRY, startAfter: ANNOUNCEMENT_DEFAULT_RETRY_AFTER_SECONDS });
    expect(h.alarms.join('\n')).not.toContain('MAY have gone out');
    await pool.query(`UPDATE announcement_channel_posts SET retry_not_before = clock_timestamp() - interval '1 second' WHERE pariwar_id = $1`, [w.pid]);
    expect(await h.poster.run(h.boss, h.sends[0]!.data, FIRST)).toEqual({ kind: 'done', state: 'posted', detail: null });
  });

  it('review FD2-R4 — a 429 that NEVER clears (no body, no retry_after) is re-sent only up to the attempt cap, then given up `refused:tg_429_expired` with ONE alarm — ⛔ re-sent (and the name decrypted) for ever', async () => {
    const w = await world();
    const h = harness([{ ok: false, status: 429, body: null }]);
    for (let attempt = 1; attempt < ANNOUNCEMENT_POST_MAX_ATTEMPTS; attempt += 1) {
      expect(await h.poster.run(h.boss, poolJob(w), FIRST), `attempt ${String(attempt)}`).toEqual({ kind: 'done', state: 'deferred', detail: 'tg_429' });
      await pool.query(`UPDATE announcement_channel_posts SET retry_not_before = clock_timestamp() - interval '1 second' WHERE pariwar_id = $1`, [w.pid]);
    }
    expect((await rowOf(w.pid, w.poolIds[0]!))[0]).toMatchObject({ state: 'deferred', attempt_count: ANNOUNCEMENT_POST_MAX_ATTEMPTS - 1 });
    expect(h.sends).toHaveLength(ANNOUNCEMENT_POST_MAX_ATTEMPTS - 1);
    expect(await h.poster.run(h.boss, poolJob(w), FIRST)).toEqual({ kind: 'done', state: 'refused', detail: 'tg_429_expired' });
    expect((await rowOf(w.pid, w.poolIds[0]!))[0]).toMatchObject({ state: 'refused', detail: 'tg_429_expired', attempt_count: ANNOUNCEMENT_POST_MAX_ATTEMPTS });
    expect(h.sends).toHaveLength(ANNOUNCEMENT_POST_MAX_ATTEMPTS - 1); // no further re-send
    expect(h.alarms.filter((a) => a.includes('given up after'))).toHaveLength(1);
    // finished: another job for the same post is a no-op
    expect(await h.poster.run(h.boss, poolJob(w), FIRST)).toEqual({ kind: 'done', state: 'refused', detail: 'tg_429_expired' });
    expect(h.requests).toHaveLength(ANNOUNCEMENT_POST_MAX_ATTEMPTS);
  });

  it('review FD-P6 — a curated name over the row\'s 100-character bound falls back to the letter code (the post goes out); at exactly 100 it is used', async () => {
    const long = 'क'.repeat(101);
    const over = await world({ curatedHi: long });
    const hOver = harness();
    expect(await hOver.poster.run(hOver.boss, poolJob(over), FIRST)).toEqual({ kind: 'done', state: 'posted', detail: null });
    expect((await rowOf(over.pid, over.poolIds[0]!))[0]).toMatchObject({ state: 'posted', pool_label: 'A' });
    expect(hOver.requests[0]!.text).not.toContain(long);

    const exactName = 'क'.repeat(100);
    const exact = await world({ curatedHi: exactName });
    const hExact = harness();
    expect(await hExact.poster.run(hExact.boss, poolJob(exact), FIRST)).toEqual({ kind: 'done', state: 'posted', detail: null });
    expect((await rowOf(exact.pid, exact.poolIds[0]!))[0]).toMatchObject({ state: 'posted', pool_label: exactName });
  });

  it('review FD-P6 — an index the letter code cannot encode writes no row, raises a defect alarm and does ⛔ throw (no retry storm, no post)', async () => {
    const w = await world({ firstPoolIndex: -1 });
    const h = harness();
    expect(await h.poster.run(h.boss, poolJob(w), FIRST)).toEqual({ kind: 'not_found', what: 'pool' });
    expect(await h.poster.run(h.boss, poolJob(w), FINAL)).toEqual({ kind: 'not_found', what: 'pool' });
    expect(await rowOf(w.pid, w.poolIds[0]!)).toHaveLength(0);
    expect(h.requests).toHaveLength(0);
    expect(h.alarms.join('\n')).toContain('cannot be turned into a label');
  });

  it('a `deferred` row past its max age ends `refused:tg_429_expired` (⛔ posted)', async () => {
    const w = await world();
    const h = harness([{ ok: false, status: 429, body: { ok: false, error_code: 429, parameters: { retry_after: 1 } } }]);
    await h.poster.run(h.boss, poolJob(w), FIRST);
    await pool.query(`UPDATE announcement_channel_posts SET updated_at = clock_timestamp() - interval '31 minutes' WHERE pariwar_id = $1`, [w.pid]);
    expect(await h.poster.run(h.boss, poolJob(w), FIRST)).toEqual({ kind: 'done', state: 'refused', detail: 'tg_429_expired' });
    expect(h.requests).toHaveLength(1);
  });

  it('⭐ a HUNG server ends `unknown:timeout_or_network` and is NEVER re-posted; a 5xx and a 2xx without message_id each end `unknown`', async () => {
    for (const [reply, detail] of [
      ['hang', 'timeout_or_network'],
      ['reject', 'timeout_or_network'],
      [{ ok: false, status: 502, body: null }, 'http_5xx'],
      [{ ok: true, status: 200, body: { ok: true, result: {} } }, 'no_message_id'],
    ] as const) {
      const w = await world();
      const h = harness([reply as Reply]);
      expect(await h.poster.run(h.boss, poolJob(w), FIRST)).toEqual({ kind: 'done', state: 'unknown', detail });
      expect(await h.poster.run(h.boss, poolJob(w), FIRST)).toEqual({ kind: 'done', state: 'unknown', detail });
      expect(h.requests, detail).toHaveLength(1);
      expect(h.alarms.some((a) => a.includes(`unknown:${detail}`))).toBe(true);
    }
  });

  it('a Telegram 4xx with a code ⇒ `refused:tg_<code>`; two identical refusals within 5 minutes alarm ONCE (per Pariwar + class)', async () => {
    const w = await world({ pools: 2 });
    const h = harness([{ ok: false, status: 403, body: { ok: false, error_code: 403, description: 'Forbidden: bot is not a member of the channel chat' } }]);
    expect(await h.poster.run(h.boss, poolJob(w, 0), FIRST)).toEqual({ kind: 'done', state: 'refused', detail: 'tg_403' });
    expect(await h.poster.run(h.boss, poolJob(w, 1), FIRST)).toEqual({ kind: 'done', state: 'refused', detail: 'tg_403' });
    expect(h.alarms.filter((a) => a.includes('refused:tg_403'))).toHaveLength(1);
  });

  it('a crash-left `attempting` row past the lease ends `unknown:stale_lease`, ⛔ re-posted', async () => {
    const w = await world();
    await pool.query(
      `INSERT INTO announcement_channel_posts (pariwar_id, occasion, subject_id, alert_id, pool_label, state, claim_token, updated_at)
       VALUES ($1, 'pool_open', $2, $3, 'A', 'attempting', 'crashed:0', clock_timestamp() - interval '3 minutes')`,
      [w.pid, w.poolIds[0], w.alertId],
    );
    const h = harness();
    expect(await h.poster.run(h.boss, poolJob(w), FIRST)).toEqual({ kind: 'done', state: 'unknown', detail: 'stale_lease' });
    expect(h.requests).toHaveLength(0);
  });

  it('an in-flight `attempting` row (inside the lease) ⇒ the job THROWS (retried), ⛔ touched', async () => {
    const w = await world();
    await pool.query(
      `INSERT INTO announcement_channel_posts (pariwar_id, occasion, subject_id, alert_id, pool_label, state, claim_token) VALUES ($1, 'pool_open', $2, $3, 'A', 'attempting', 'other:0')`,
      [w.pid, w.poolIds[0], w.alertId],
    );
    const h = harness();
    await expect(h.poster.run(h.boss, poolJob(w), FIRST)).rejects.toThrow(/in flight/);
    expect((await rowOf(w.pid, w.poolIds[0]!))[0]).toMatchObject({ state: 'attempting', claim_token: 'other:0' });
  });

  it('one pool\'s 429 neither delays nor fails another pool\'s child', async () => {
    const w = await world({ pools: 2 });
    const h = harness([
      { ok: false, status: 429, body: { ok: false, error_code: 429, parameters: { retry_after: 9 } } },
      { ok: true, status: 200, body: { ok: true, result: { message_id: 8 } } },
    ]);
    expect((await h.poster.run(h.boss, poolJob(w, 0), FIRST)).kind).toBe('done');
    expect(await h.poster.run(h.boss, poolJob(w, 1), FIRST)).toEqual({ kind: 'done', state: 'posted', detail: null });
    expect(h.sends.map((s) => (s.data.payload as { poolId: string }).poolId)).toEqual([w.poolIds[0]]);
  });

  it('⭐ I1 / I3 / T1 — the skips: switch OFF, no chat id, no bot token NAME (⛔ the fixture — nothing posted), each a `skipped` row', async () => {
    const off = await world({ enabled: false, chatId: CHAT });
    const noBot = await world({ botName: null });
    const blankBot = await world({ botName: '   ' });
    for (const [w, detail] of [
      [off, 'switch_off'],
      [noBot, 'bot_not_configured'],
      [blankBot, 'bot_not_configured'],
    ] as const) {
      const h = harness();
      expect(await h.poster.run(h.boss, poolJob(w), FIRST)).toEqual({ kind: 'done', state: 'skipped', detail });
      expect(h.requests).toHaveLength(0);
      expect((await rowOf(w.pid, w.poolIds[0]!))[0]).toMatchObject({ state: 'skipped', detail, pool_label: 'A' });
    }
    // no chat id: the config CHECK pairs it with the link, so a row with neither
    const noChat = await world({ enabled: false });
    await pool.query(`INSERT INTO pariwar_announcement_channels (pariwar_id, enabled) VALUES ($1, true)`, [noChat.pid]);
    const h = harness();
    expect(await h.poster.run(h.boss, poolJob(noChat), FIRST)).toEqual({ kind: 'done', state: 'skipped', detail: 'no_chat_id' });
  });

  it('⭐ `-418` item 4 — a Secret Manager throw on a non-final attempt, and with metadata ABSENT, writes NO row and rethrows; the final attempt refuses once', async () => {
    const w = await world();
    const failing = harness(undefined, { resolveSecret: () => Promise.reject(new Error('secret manager outage')) });
    await expect(failing.poster.run(failing.boss, poolJob(w), FIRST)).rejects.toThrow(/outage/);
    await expect(failing.poster.run(failing.boss, poolJob(w), undefined)).rejects.toThrow(/outage/);
    expect(await rowOf(w.pid, w.poolIds[0]!)).toEqual([]);
    expect(await failing.poster.run(failing.boss, poolJob(w), FINAL)).toEqual({ kind: 'done', state: 'refused', detail: 'secret_unresolved' });
    expect(failing.alarms.filter((a) => a.includes('secret_unresolved'))).toHaveLength(1);
    expect(failing.requests).toHaveLength(0);
  });

  it('⭐ `-418` item 3 — a THROWING identity read retries (no row) until the final attempt; a `null` name (no KYC profile) refuses at once — ⛔ an unnamed post', async () => {
    const w = await world();
    const throwing = harness(undefined, { resolveDeceasedName: () => Promise.reject(new Error('db blip')) });
    await expect(throwing.poster.run(throwing.boss, poolJob(w), FIRST)).rejects.toThrow(/db blip/);
    expect(await rowOf(w.pid, w.poolIds[0]!)).toEqual([]);
    expect(await throwing.poster.run(throwing.boss, poolJob(w), FINAL)).toEqual({ kind: 'done', state: 'refused', detail: 'identity_unavailable' });
    expect(throwing.alarms).toHaveLength(1);
    const noProfile = await world({ kyc: false });
    const h = harness();
    expect(await h.poster.run(h.boss, poolJob(noProfile), FIRST)).toEqual({ kind: 'done', state: 'refused', detail: 'identity_unavailable' });
    expect(h.requests).toHaveLength(0);
  });

  it('⭐ I5 — `none` mode reads and decrypts NOTHING (⛔ the name read, ⛔ KMS) and posts the unnamed words', async () => {
    const w = await world();
    const resolveDeceasedName = vi.fn();
    const h = harness(undefined, { nameMode: 'none', resolveDeceasedName, encryption: {} as never });
    expect(await h.poster.run(h.boss, poolJob(w), FIRST)).toEqual({ kind: 'done', state: 'posted', detail: null });
    expect(resolveDeceasedName).not.toHaveBeenCalled();
    expect(h.requests[0]!.text).toBe(buildAnnouncementPost(t, { occasion: 'pool_open', poolLabel: 'A', deceasedName: null }, 'none'));
  });

  it('⭐ `-418` item 11 — a re-sent 429 job that now finds the switch OFF gives the `deferred` row up to `refused:switch_off`', async () => {
    const w = await world();
    const h = harness([{ ok: false, status: 429, body: { ok: false, error_code: 429, parameters: { retry_after: 3 } } }]);
    await h.poster.run(h.boss, poolJob(w), FIRST);
    await pool.query(`UPDATE pariwar_announcement_channels SET enabled = false WHERE pariwar_id = $1`, [w.pid]);
    expect(await h.poster.run(h.boss, h.sends[0]!.data, FIRST)).toEqual({ kind: 'done', state: 'refused', detail: 'switch_off' });
    expect((await rowOf(w.pid, w.poolIds[0]!))[0]).toMatchObject({ state: 'refused', detail: 'switch_off' });
    expect(h.requests).toHaveLength(1);
  });

  it('a pool-open child whose alert is no longer live ⇒ `skipped:stale`', async () => {
    const w = await world();
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query("SET LOCAL app.alert_state_writer = 'on'");
      await c.query(`UPDATE alerts SET current_state = 'closed' WHERE alert_id = $1`, [w.alertId]);
      await c.query('COMMIT');
    } finally {
      c.release();
    }
    const h = harness();
    expect(await h.poster.run(h.boss, poolJob(w), FIRST)).toEqual({ kind: 'done', state: 'skipped', detail: 'stale' });
  });

  it('⭐ FS5 / AC4 — the LAST DAY posts the one cycle post with the deadline\'s date; at or after the deadline it is `skipped:stale` (`-418` item 2)', async () => {
    const w = await world({ pools: 2 });
    const deadlineAt = new Date(Date.now() + 6 * 3_600_000);
    const job = env(w.pid, { alertId: w.alertId, cycleId: w.cycleId, occasion: 'last_day', deadlineAtIso: deadlineAt.toISOString() });
    const h = harness();
    expect(await h.poster.run(h.boss, job, FIRST)).toEqual({ kind: 'done', state: 'posted', detail: null });
    const y = deadlineAt.getUTCFullYear();
    const date = `${String(deadlineAt.getUTCDate()).padStart(2, '0')}-${String(deadlineAt.getUTCMonth() + 1).padStart(2, '0')}-${String(y)}`;
    expect(h.requests).toEqual([{ chatId: CHAT, text: buildAnnouncementPost(t, { occasion: 'last_day', lastDate: date }) }]);
    expect((await rowOf(w.pid, w.alertId))[0]).toMatchObject({ state: 'posted', last_date: date, pool_label: null });
    // one post per CYCLE: the same alert's job again posts nothing
    await h.poster.run(h.boss, job, FIRST);
    expect(h.requests).toHaveLength(1);
    const late = await world();
    const h2 = harness();
    const past = env(late.pid, { alertId: late.alertId, cycleId: late.cycleId, occasion: 'last_day', deadlineAtIso: new Date(Date.now() - 1000).toISOString() });
    expect(await h2.poster.run(h2.boss, past, FIRST)).toEqual({ kind: 'done', state: 'skipped', detail: 'stale' });
    expect(h2.requests).toHaveLength(0);
  });

  it('⭐ I6 / T14 — a job for Pariwar A reads and writes ONLY A: A is OFF while B is ON ⇒ A skipped; B\'s config and rows untouched; posts go to the job\'s OWN chat', async () => {
    const a = await world({ enabled: false, chatId: '@pariwar_a_chan' });
    const b = await world({ chatId: '@pariwar_b_chan' });
    const h = harness();
    // B posts first, to B's chat
    await h.poster.run(h.boss, poolJob(b), FIRST);
    // A's job, naming A, must never see B's ON switch
    expect(await h.poster.run(h.boss, poolJob(a), FIRST)).toEqual({ kind: 'done', state: 'skipped', detail: 'switch_off' });
    expect(h.requests.map((r) => r.chatId)).toEqual(['@pariwar_b_chan']);
    expect((await rowOf(b.pid, b.poolIds[0]!))[0]).toMatchObject({ state: 'posted' });
    // a job naming A with B's pool id: ⛔ such a pool in A ⇒ nothing posted, nothing written in either Pariwar
    const crossed = env(a.pid, { alertId: a.alertId, cycleId: a.cycleId, poolId: b.poolIds[0]!, occasion: 'pool_open' });
    expect(await h.poster.run(h.boss, crossed, FIRST)).toEqual({ kind: 'not_found', what: 'pool' });
    expect(await rowOf(a.pid, b.poolIds[0]!)).toEqual([]);
  });

  it('⭐ AC5 (iv) — the heal re-sends the cycle job only while the cycle\'s pools LACK a pool_open row', async () => {
    const w = await world({ pools: 2 });
    const h = harness();
    const heal = createAnnouncementPostTrigger(h.boss, pool);
    await heal({ kind: 'pool_open_heal', pariwarId: w.pid, alertId: w.alertId, cycleId: w.cycleId });
    expect(h.sends).toHaveLength(1);
    expect(h.sends[0]!.data.payload).toEqual({ alertId: w.alertId, cycleId: w.cycleId, occasion: 'pool_open' });
    await h.poster.run(h.boss, poolJob(w, 0), FIRST);
    await h.poster.run(h.boss, poolJob(w, 1), FIRST);
    await heal({ kind: 'pool_open_heal', pariwarId: w.pid, alertId: w.alertId, cycleId: w.cycleId });
    expect(h.sends).toHaveLength(1);
    // the last-day trigger sends the last-day job with the deadline
    const deadlineAt = new Date('2026-11-13T01:30:00.000Z');
    await heal({ kind: 'last_day', pariwarId: w.pid, alertId: w.alertId, cycleId: w.cycleId, deadlineAt });
    expect(h.sends[1]!.data.payload).toEqual({ alertId: w.alertId, cycleId: w.cycleId, occasion: 'last_day', deadlineAtIso: deadlineAt.toISOString() });
    expect(h.sends[1]!.options).toMatchObject(ANNOUNCEMENT_POST_RETRY);
  });

  it('review G1-1 — a failed 429 enqueue throws; recovery heals an existing deferred row', async () => {
    const w = await world();
    const h = harness([{ ok: false, status: 429, body: { ok: false, error_code: 429, parameters: { retry_after: 600 } } }, { ok: true, status: 200, body: { ok: true, result: { message_id: 77 } } }]);
    const broken = { send: vi.fn().mockRejectedValue(new Error('queue unavailable')) } as unknown as Pick<QueueClient, 'send'>;
    await expect(h.poster.run(broken, poolJob(w), FIRST)).rejects.toThrow('queue unavailable');
    expect((await rowOf(w.pid, w.poolIds[0]!))[0]!.state).toBe('deferred');
    expect(await announcementChannels.countPoolOpenPostGaps(pool, { pariwarId: w.pid, cycleId: w.cycleId })).toBe(0);
    const heal = createAnnouncementPostTrigger(h.boss, pool);
    await heal({ kind: 'pool_open_heal', pariwarId: w.pid, alertId: w.alertId, cycleId: w.cycleId });
    expect(h.sends).toHaveLength(1);
    await h.poster.run(h.boss, h.sends[0]!.data, FIRST);
    expect(h.requests).toHaveLength(1); // still inside retry_after
    await pool.query(`UPDATE announcement_channel_posts SET retry_not_before = clock_timestamp() - interval '1 second' WHERE pariwar_id = $1`, [w.pid]);
    expect(await h.poster.run(h.boss, h.sends[0]!.data, FIRST)).toMatchObject({ state: 'posted' });
  });

  it('⭐ review FS-4 (`-419` item 3 (b)) — on a CLOSED alert the heal re-sends ONLY the recoverable row; a never-rowed pool stays row-less (⛔ the gap fan-out)', async () => {
    const w = await world({ pools: 2 });
    const h = harness([{ ok: false, status: 429, body: { ok: false, error_code: 429, parameters: { retry_after: 600 } } }]);
    await h.poster.run(h.boss, poolJob(w, 0), FIRST);
    expect((await rowOf(w.pid, w.poolIds[0]!))[0]!.state).toBe('deferred');
    expect(await rowOf(w.pid, w.poolIds[1]!)).toEqual([]);
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query("SET LOCAL app.alert_state_writer = 'on'");
      await c.query(`UPDATE alerts SET current_state = 'closed', state_event_version = 4 WHERE pariwar_id = $1 AND alert_id = $2`, [w.pid, w.alertId]);
      await c.query('COMMIT');
    } finally {
      c.release();
    }
    h.sends.length = 0; // the 429 re-send above — the heal's sends only
    const heal = createAnnouncementPostTrigger(h.boss, pool);
    await heal({ kind: 'pool_open_heal', pariwarId: w.pid, alertId: w.alertId, cycleId: w.cycleId });
    expect(h.sends.map((s) => s.data.payload)).toEqual([{ occasion: 'pool_open', alertId: w.alertId, cycleId: w.cycleId, poolId: w.poolIds[0] }]);
    // ⛔ a cycle job: the pool that never had a row keeps none (the admin list still says `not_attempted`)
    expect(await rowOf(w.pid, w.poolIds[1]!)).toEqual([]);
  });

  it('⭐ review FD-P4 — the recovery sweep\'s widened query EXECUTES on Postgres: a closed alert with a recoverable row (`deferred`, or `attempting` past the lease) is healed; a young attempt or a finished post is not; the seam unset ⇒ none', async () => {
    type W = Awaited<ReturnType<typeof world>>;
    const close = async (w: W) => {
      const c = await pool.connect();
      try {
        await c.query('BEGIN');
        await c.query("SET LOCAL app.alert_state_writer = 'on'");
        await c.query(`UPDATE alerts SET current_state = 'closed', state_event_version = 4 WHERE pariwar_id = $1 AND alert_id = $2`, [w.pid, w.alertId]);
        await c.query('COMMIT');
      } finally {
        c.release();
      }
    };
    const begin = async (w: W) => {
      const c = await pool.connect();
      try {
        await c.query('BEGIN');
        await announcementChannels.beginAnnouncementPost(c, { pariwarId: w.pid, occasion: 'pool_open', subjectId: w.poolIds[0]!, alertId: w.alertId, poolLabel: 'A', lastDate: null, claimToken: randomUUID() });
        await c.query('COMMIT');
      } finally {
        c.release();
      }
    };
    const deferred = await world();
    const hd = harness([{ ok: false, status: 429, body: { ok: false, error_code: 429, parameters: { retry_after: 600 } } }]);
    await hd.poster.run(hd.boss, poolJob(deferred), FIRST);
    const young = await world();
    await begin(young);
    const lapsed = await world();
    await begin(lapsed);
    await pool.query(`UPDATE announcement_channel_posts SET updated_at = clock_timestamp() - interval '3 minutes' WHERE pariwar_id = $1`, [lapsed.pid]);
    const finished = await world();
    const hf = harness();
    await hf.poster.run(hf.boss, poolJob(finished), FIRST);
    const all = [deferred, young, lapsed, finished];
    for (const w of all) await close(w);

    // The REAL query on the REAL pool — only the returned ROWS are narrowed to this test's alerts (the shared database holds other suites' alerts).
    const mine = new Set<string>(all.map((w) => w.alertId));
    const scoped = {
      query: async (text: string, params?: unknown[]) => {
        const r = await pool.query(text, params);
        // every row of the sweep's query names its alert; ⛔ keyed on the SQL text, which an alias or a whitespace change would silently disarm
        return { ...r, rows: r.rows.filter((row: { alert_id?: string }) => row.alert_id === undefined || mine.has(row.alert_id)) };
      },
    };
    const sweep = async (withSeam: boolean): Promise<string[]> => {
      const seam = vi.fn().mockResolvedValue(undefined);
      const send = vi.fn();
      const deps = { pool: scoped, recoverySweepAlertLimit: 100_000, onAlarm: vi.fn(), ...(withSeam ? { enqueueAnnouncementPost: seam } : {}) } as never;
      expect(await runContributionNotifyRecoverySweep(deps, { send })).toBe(0);
      expect(send).not.toHaveBeenCalled(); // a closed alert never restarts the member fan-out
      return seam.mock.calls.map((call) => (call[0] as { alertId: string }).alertId);
    };
    expect((await sweep(true)).sort()).toEqual([deferred.alertId, lapsed.alertId].sort());
    expect(await sweep(false)).toEqual([]);
  });

  it('review G1-1 — recovery retains a lost last-day retry payload and settles it after the deadline', async () => {
    const w = await world();
    const deadline = new Date(Date.now() + 600_000);
    const h = harness([{ ok: false, status: 429, body: { ok: false, error_code: 429, parameters: { retry_after: 7 } } }]);
    const payload = { occasion: 'last_day', alertId: w.alertId, cycleId: w.cycleId, deadlineAtIso: deadline.toISOString() } as const;
    await h.poster.run(h.boss, env(w.pid, payload), FIRST);
    h.sends.length = 0; // simulate a lost queue job after the deferral was committed
    const heal = createAnnouncementPostTrigger(h.boss, pool);
    await heal({ kind: 'pool_open_heal', pariwarId: w.pid, alertId: w.alertId, cycleId: w.cycleId });
    const retry = h.sends.find((s) => s.data.payload.occasion === 'last_day')!;
    expect(retry.data.payload).toEqual(payload);
    const afterDeadline = harness(undefined, { nowMs: () => deadline.getTime() });
    expect(await afterDeadline.poster.run(afterDeadline.boss, retry.data, FIRST)).toMatchObject({ state: 'refused', detail: 'stale' });
    expect(afterDeadline.requests).toHaveLength(0);
    // review FS-5 — the give-up clears the retry delay (a finished row carries no `retry_not_before`)
    const settled = await pool.query<{ state: string; retry_not_before: Date | null }>(
      `SELECT state, retry_not_before FROM announcement_channel_posts WHERE pariwar_id = $1 AND subject_id = $2`,
      [w.pid, w.alertId],
    );
    expect(settled.rows).toEqual([{ state: 'refused', retry_not_before: null }]);
  });

  it('review G1-3 — rejects another tenant alert and unrelated pool/alert/cycle IDs before decrypt', async () => {
    const a = await world(); const b = await world();
    const resolveName = vi.fn().mockResolvedValue(NAME);
    const h = harness(undefined, { resolveDeceasedName: resolveName });
    const deadlineAtIso = new Date(Date.now() + 600_000).toISOString();
    expect(await h.poster.run(h.boss, env(a.pid, { occasion: 'last_day', alertId: b.alertId, cycleId: b.cycleId, deadlineAtIso }), FIRST)).toEqual({ kind: 'not_found', what: 'alert' });
    expect(await h.poster.run(h.boss, env(a.pid, { occasion: 'last_day', alertId: a.alertId, cycleId: b.cycleId, deadlineAtIso }), FIRST)).toEqual({ kind: 'not_found', what: 'alert' });
    expect(await h.poster.run(h.boss, env(a.pid, { occasion: 'pool_open', alertId: b.alertId, cycleId: a.cycleId }), FIRST)).toEqual({ kind: 'not_found', what: 'alert' });
    const otherAlert = randomUUID(); const otherCycle = randomUUID();
    const c = await pool.connect();
    try {
      await c.query('BEGIN'); await c.query("SET LOCAL app.alert_state_writer = 'on'");
      await c.query(`INSERT INTO alerts (alert_id, cycle_id, pariwar_id, pool_count, current_state, state_event_version, created_by_actor) VALUES ($1, $2, $3, 1, 'live', 3, 'system')`, [otherAlert, otherCycle, a.pid]);
      await c.query('COMMIT');
    } finally { c.release(); }
    expect(await h.poster.run(h.boss, env(a.pid, { occasion: 'pool_open', alertId: otherAlert, cycleId: otherCycle, poolId: a.poolIds[0]! }), FIRST)).toEqual({ kind: 'not_found', what: 'pool' });
    expect(h.requests).toHaveLength(0); expect(resolveName).not.toHaveBeenCalled();
    expect(await rowOf(a.pid, a.poolIds[0]!)).toHaveLength(0);
    expect(await rowOf(a.pid, b.alertId)).toHaveLength(0);
  });

  it('review G1-4 — HTTP 200 without explicit ok:true is unknown, never posted or retried', async () => {
    const w = await world(); const h = harness([{ ok: true, status: 200, body: { result: { message_id: 42 } } }]);
    expect(await h.poster.run(h.boss, poolJob(w), FIRST)).toMatchObject({ state: 'unknown' });
    expect(await h.poster.run(h.boss, poolJob(w), FINAL)).toMatchObject({ state: 'unknown' });
    expect(h.requests).toHaveLength(1);
  });

  it('review G1-5 — two live connections race initial claims and deferred reclaims: one send, fresh token, stale holder denied', async () => {
    const w = await world();
    const record = { pariwarId: w.pid, occasion: 'pool_open', subjectId: w.poolIds[0]!, alertId: w.alertId, poolLabel: 'A', lastDate: null } as const;
    const send = vi.fn().mockResolvedValue('99');
    async function race(state: 'deferred' | 'posted') {
      const clients = await Promise.all([pool.connect(), pool.connect()]);
      try {
        const pids = await Promise.all(clients.map((c) => c.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')));
        expect(pids[0]!.rows[0]!.pid).not.toBe(pids[1]!.rows[0]!.pid);
        await Promise.all(clients.map((c) => c.query('BEGIN')));
        const results = await Promise.all(clients.map(async (c) => {
          const claimToken = randomUUID();
          const result = await announcementChannels.beginAnnouncementPost(c, { ...record, claimToken });
          await c.query('COMMIT'); // publish winner while the other connection waits on the unique/row lock
          if (result.kind === 'begun') {
            await send();
            await announcementChannels.finaliseAnnouncementPost(pool, { pariwarId: w.pid, postId: result.postId, claimToken, state, detail: state === 'deferred' ? 'tg_429' : null, ...(state === 'posted' ? { telegramMessageId: '99' } : { retryAfterSeconds: 600 }) });
          }
          return { result, claimToken };
        }));
        expect(results.filter((r) => r.result.kind === 'begun')).toHaveLength(1);
        expect(results.filter((r) => r.result.kind === 'taken')).toHaveLength(1);
        return results.find((r) => r.result.kind === 'begun')!;
      } finally {
        for (const c of clients) { await c.query('ROLLBACK'); c.release(); }
      }
    }
    const first = await race('deferred');
    expect(send).toHaveBeenCalledTimes(1);
    const early = await pool.connect();
    try {
      await early.query('BEGIN');
      expect(await announcementChannels.beginAnnouncementPost(early, { ...record, claimToken: randomUUID() })).toEqual({ kind: 'taken' });
      await early.query('COMMIT');
    } finally { early.release(); }
    await pool.query(`UPDATE announcement_channel_posts SET retry_not_before = clock_timestamp() - interval '1 second' WHERE pariwar_id = $1`, [w.pid]);
    const second = await race('posted');
    expect(send).toHaveBeenCalledTimes(2); expect(second.claimToken).not.toBe(first.claimToken);
    if (first.result.kind !== 'begun') throw new Error('missing winner');
    expect(await announcementChannels.finaliseAnnouncementPost(pool, { pariwarId: w.pid, postId: first.result.postId, claimToken: first.claimToken, state: 'unknown', detail: 'unclassified' })).toBe(false);
    expect(await rowOf(w.pid, w.poolIds[0]!)).toEqual([expect.objectContaining({ state: 'posted', attempt_count: 2, claim_token: second.claimToken })]);
  });

});
