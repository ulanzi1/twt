// Story 11b.4 — the Send's commit safety and its idempotency, which lives ON the submission row (migration 0183; the Y-server
// round, BigDev 2026-10-24 "Key on the row").
//
// Review R3: the Send's catch must not undo a version that has ALREADY committed, and a `put` that stored the object and then
// threw must not leave it orphaned. Until the Y-server round the key was a 300 s claim in the shared keyed store, and T4 pinned
// what happened when `recordResult` failed after the COMMIT (a pending claim ⇒ `409 memorial.idempotency_in_progress`). That
// mechanism is gone — ⛔ claim, ⛔ `recordResult`, ⛔ TTL — so its legs are replaced by the row's: a retry with the same key
// replays the version at ANY age; a replay found after this request's `put` deletes that object (it is unreferenced); a failure
// before the COMMIT rolls the key back WITH the row (the same key then inserts, 201); and two concurrent same-key Sends write
// exactly one row (one 201 + one 200), the second waiting on the pool lock and then replaying with ⛔ an audit line.
//
// Live DB (`:5434`), explicit values, one Pariwar per world.

import { randomUUID } from 'node:crypto';

import { memorial } from '@twt/domain';
import type pg from 'pg';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { encryptMemorialField } from '../../../src/modules/memorial/memorial-crypto.js';
import { createTestApp, hasDatabase, teardown, type TestApp } from '../_setup.js';
import {
  CURRENT_VERSION,
  handover,
  holdPoolLock,
  jpegWithGps,
  memberInject,
  rows,
  seedMemorialWorld,
  send,
  sendFields,
  type MemorialWorld,
  type Part,
} from './_fixture.js';

describe.skipIf(!hasDatabase)('memorial — Send commit safety and the row-keyed replay (R3, 0183, live DB)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });

  afterAll(async () => {
    await teardown(t);
  });

  // Any spy a test left installed (a `put` that stores and throws, an insert that fails after it wrote) is restored.
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // The permission-text version is read from the domain (the Send must echo the CURRENT one), ⛔ not from the fixture's pin.
  const fields = (over: Parameters<typeof sendFields>[0] = {}): Part[] =>
    sendFields({ authorisationCopyVersion: memorial.MEMORIAL_SUBMISSION_AUTHORISATION_COPY_VERSION, ...over });

  const photoParts = (over: Parameters<typeof sendFields>[0] = {}): Part[] => [
    ...fields({ body: 'The original words.', altText: 'The photo.', ...over }),
    { kind: 'file', name: 'photo', filename: 'm.jpg', contentType: 'image/jpeg', bytes: jpegWithGps() },
  ];

  async function world(): Promise<MemorialWorld> {
    const w = await seedMemorialWorld(t);
    await handover(t, w);
    return w;
  }

  const submissions = (w: MemorialWorld) =>
    rows<{ submission_id: string; photo_object_key: string | null; idempotency_key: string | null }>(
      t,
      'SELECT submission_id, photo_object_key, idempotency_key FROM memorial_submissions WHERE pariwar_id = $1 ORDER BY created_at',
      [w.pariwarId],
    );

  /** The Send's audit lines for this world (the intent, and any compensating `_rolled_back` line). */
  const sendAudit = async (w: MemorialWorld): Promise<string[]> =>
    (
      await rows<{ action: string }>(
        t,
        `SELECT action FROM audit_log_entries WHERE pariwar_id = $1 AND action LIKE 'memorial.submission.create%' ORDER BY seq`,
        [w.pariwarId],
      )
    ).map((r) => r.action);

  /** The objects this world's Sends stored (the in-memory store is shared by every world in this file). */
  const storedFor = (w: MemorialWorld): string[] => [...t.memorialPhotoStorage.store.keys()].filter((k) => k.includes(w.pariwarId));

  // ── the replay, at any age ────────────────────────────────────────────────────────────────────────────────────────

  it('a version this key wrote LONG AGO (two years; no keyed-store claim, no audit line of its own) → the same key replays it: 200, the 201 body shape, ONE row — and nothing is uploaded or audited', async () => {
    const w = await world();
    const key = randomUUID();
    // The version is written directly (as an earlier Send would have), dated two years back — far past any claim TTL the
    // keyed store ever had. Only the ROW knows the key.
    const [old] = await rows<{ submission_id: string }>(
      t,
      `INSERT INTO memorial_submissions (pariwar_id, pool_id, claim_case_id, deceased_member_id, body_ciphertext, authorisation_copy_version,
         authorisation_locale, handover_recipient, handover_nominee_ref, idempotency_key, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'hi', 'latest', $7, $8, now() - interval '2 years') RETURNING submission_id`,
      [w.pariwarId, w.poolId, w.claimCaseId, w.memberId, await encryptMemorialField('words sent long ago', w.pariwarId, t.deps.encryption), CURRENT_VERSION, randomUUID(), key],
    );
    const put = vi.spyOn(t.memorialPhotoStorage, 'put');
    const replay = await send(t, w, photoParts(), { key });
    expect(replay.status, JSON.stringify(replay.body)).toBe(200);
    expect(replay.body).toEqual({ submissionId: old!.submission_id, memorialState: 'with_the_trust' });
    expect(await submissions(w)).toHaveLength(1);
    // The replay is found BEFORE the upload, the encryption and the audit intent.
    expect(put).not.toHaveBeenCalled();
    expect(storedFor(w)).toEqual([]);
    expect(await sendAudit(w)).toEqual([]);
  });

  it('a replay precedes the chain checks: after the family WITHDREW the version, the same key still replays it (200) instead of writing a second one; a NEW key is a new version (201)', async () => {
    const w = await world();
    const key = randomUUID();
    const first = await send(t, w, fields(), { key });
    expect(first.status).toBe(201);
    const id = first.body.submissionId as string;
    expect((await memberInject(t, 'POST', `/api/v1/member/memorial/submissions/${id}/withdraw`, { payload: {}, token: w.token })).status).toBe(200);
    const again = await send(t, w, fields(), { key });
    expect(again.status).toBe(200);
    expect(again.body).toEqual(first.body);
    expect(await submissions(w)).toHaveLength(1);
    // R6: changed words travel under a new key — a new version superseding the withdrawn one.
    const edited = await send(t, w, fields({ body: 'Edited words.' }));
    expect(edited.status).toBe(201);
    expect(await submissions(w)).toHaveLength(2);
  });

  it('the key rides the row: the committed version stores exactly the key it was sent with', async () => {
    const w = await world();
    const key = randomUUID();
    expect((await send(t, w, fields(), { key })).status).toBe(201);
    expect((await submissions(w)).map((s) => s.idempotency_key)).toEqual([key]);
  });

  it('the key must be of the storable shape: blank / over 128 characters / a space or other punctuation → 400 memorial.idempotency_key_required; 128 characters of [A-Za-z0-9_-] commit', async () => {
    const w = await world();
    for (const bad of ['', '   ', 'x'.repeat(129), 'has space', 'semi;colon', 'with.dot']) {
      const r = await send(t, w, fields(), { key: bad });
      expect(r.status, bad).toBe(400);
      expect(r.body, bad).toMatchObject({ error: { code: 'memorial.idempotency_key_required' } });
    }
    expect(await submissions(w)).toEqual([]);
    const longest = `${'A'.repeat(64)}${'z9_-'.repeat(16)}`;
    expect(longest).toHaveLength(128);
    expect((await send(t, w, fields(), { key: longest })).status).toBe(201);
  });

  // ── two Sends with the same key, concurrently ─────────────────────────────────────────────────────────────────────

  it('two concurrent same-key Sends (both past the pre-check, both uploaded a photo, both queued on the pool lock) → exactly ONE row, one 201 + one 200 with the same body; the replay deleted the photo IT uploaded and wrote ⛔ an audit line', async () => {
    const w = await world();
    const key = randomUUID();
    const lock = await holdPoolLock(t, w.poolId);
    let replies: Array<{ status: number; body: Record<string, unknown> }>;
    try {
      const a = send(t, w, photoParts(), { key });
      await lock.waitForWaiters(1);
      const b = send(t, w, photoParts(), { key });
      await lock.waitForWaiters(2);
      // Both requests have put their own object by now (the `put` comes before the lock).
      expect(storedFor(w)).toHaveLength(2);
      await lock.release();
      replies = await Promise.all([a, b]);
    } finally {
      await lock.abort();
    }
    expect(replies.map((r) => r.status)).toEqual([201, 200]);
    expect(replies[1]!.body).toEqual(replies[0]!.body);
    const committed = await submissions(w);
    expect(committed).toHaveLength(1);
    expect(committed[0]!.submission_id).toBe(replies[0]!.body.submissionId);
    // The replayed row keeps ITS object; the replaying request's own upload is gone (it was never referenced).
    expect(storedFor(w)).toEqual([committed[0]!.photo_object_key]);
    // The duplicate found the row UNDER THE LOCK, before its audit intent: one create line, ⛔ a compensating pair.
    expect(await sendAudit(w)).toEqual(['memorial.submission.create']);
  });

  // ── a failure before the COMMIT ───────────────────────────────────────────────────────────────────────────────────

  it('a failure AFTER the row (with its key) was written in the transaction, before the COMMIT → no row, the key rolled back with it — the SAME key then inserts a new version (201, ⛔ a 200 replay of nothing)', async () => {
    const w = await world();
    const key = randomUUID();
    const realInsert = memorial.insertMemorialSubmission;
    let keyInTx: string | null = null;
    const insert = vi.spyOn(memorial, 'insertMemorialSubmission').mockImplementation(async (db, values) => {
      const write = await realInsert(db, values);
      keyInTx = write.row.idempotencyKey;
      throw new Error('injected failure after the insert, before COMMIT');
    });
    try {
      expect((await send(t, w, photoParts(), { key })).status).toBe(500);
    } finally {
      insert.mockRestore();
    }
    expect(keyInTx).toBe(key); // the key WAS on the row inside the transaction …
    expect(await rows(t, `SELECT 1 FROM memorial_submissions WHERE pool_id = $1 AND idempotency_key = $2`, [w.poolId, key])).toEqual([]);
    expect(storedFor(w)).toEqual([]); // … and the rollback took it, and this request's photo was deleted
    const retry = await send(t, w, photoParts(), { key });
    expect(retry.status, JSON.stringify(retry.body)).toBe(201);
    expect((await submissions(w)).map((s) => s.idempotency_key)).toEqual([key]);
  });

  it('a put that STORED the object and then threw (a lost acknowledgement) leaves no object and no row; the same key then sends (201)', async () => {
    const w = await world();
    const key = randomUUID();
    const originalPut = t.memorialPhotoStorage.put.bind(t.memorialPhotoStorage);
    const spy = vi.spyOn(t.memorialPhotoStorage, 'put').mockImplementation(async (...args) => {
      await originalPut(...args);
      throw new Error('lost upload acknowledgement');
    });
    try {
      expect((await send(t, w, photoParts(), { key })).status).toBe(500);
    } finally {
      spy.mockRestore();
    }
    expect(await submissions(w)).toHaveLength(0);
    expect(storedFor(w)).toEqual([]); // the orphan was deleted best-effort
    const retry = await send(t, w, photoParts(), { key });
    expect(retry.status).toBe(201);
    expect(await submissions(w)).toHaveLength(1);
    expect(storedFor(w)).toHaveLength(1);
  });

  it('a put followed by a refusal under the lock (the permission text went stale) deletes the new object; nothing was written, so the same key with the current text commits (201)', async () => {
    const w = await world();
    const key = randomUUID();
    const stale = await send(t, w, photoParts({ authorisationCopyVersion: 'an-older-permission-text-version' }), { key });
    expect(stale.status).toBe(409);
    expect(stale.body).toMatchObject({ error: { code: 'memorial.authorisation_outdated' } });
    expect(await submissions(w)).toHaveLength(0);
    expect(storedFor(w)).toEqual([]);
    expect((await send(t, w, photoParts(), { key })).status).toBe(201);
    expect(await submissions(w)).toHaveLength(1);
  });

  // ── an AMBIGUOUS COMMIT (review Z1 — closes T14 / R31 (b)) ─────────────────────────────────────────────────────────

  /**
   * Make the Send's COMMIT throw. Every client checked out of the app's pool during the call has its `query` wrapped; once
   * the Send's INSERT has run (armed by the insert spy), the NEXT `COMMIT` is replaced by `mode` and then throws:
   * `ack_lost` — the real COMMIT runs (the row lands; the acknowledgement is what is lost); `failed` — a ROLLBACK runs
   * instead (nothing lands). Either way the transaction is closed, so the client goes back to the pool clean.
   */
  function injectCommitFailure(mode: 'ack_lost' | 'failed'): { fired: () => boolean; restore: () => void } {
    const realInsert = memorial.insertMemorialSubmission;
    let armed = false;
    let fired = false;
    vi.spyOn(memorial, 'insertMemorialSubmission').mockImplementation(async (db, values) => {
      const write = await realInsert(db, values);
      armed = true;
      return write;
    });
    const pool = t.deps.pool;
    const realConnect = pool.connect.bind(pool) as (...args: unknown[]) => Promise<pg.PoolClient> | undefined;
    const patched = new Set<pg.PoolClient>();
    vi.spyOn(pool, 'connect').mockImplementation(((...args: unknown[]) => {
      // `pool.query` checks a client out with the CALLBACK form — passed through untouched (only the Send's own
      // `openScopeTx`, which awaits the promise form, is wrapped).
      if (typeof args[0] === 'function') return realConnect(...args);
      return wrapped();
    }) as never);
    const wrapped = async (): Promise<pg.PoolClient> => {
      const client = (await realConnect())!;
      if (!patched.has(client)) {
        patched.add(client);
        const realQuery = client.query.bind(client) as (...args: unknown[]) => Promise<unknown>;
        (client as { query: unknown }).query = async (...args: unknown[]) => {
          if (armed && !fired && args[0] === 'COMMIT') {
            fired = true;
            await realQuery(mode === 'ack_lost' ? 'COMMIT' : 'ROLLBACK');
            throw new Error('Connection terminated unexpectedly');
          }
          return realQuery(...args);
        };
      }
      return client;
    };
    return {
      fired: () => fired,
      restore: () => {
        for (const c of patched) delete (c as { query?: unknown }).query; // back to the prototype's
        vi.restoreAllMocks();
      },
    };
  }

  /** The member GET's photo fields for this world (the replayed version's photo is PRESENT). */
  const viewPhoto = async (w: MemorialWorld) => {
    const r = await memberInject(t, 'GET', '/api/v1/member/memorial', { token: w.token });
    expect(r.status).toBe(200);
    const m = r.body.memorial as { submissionId: string; hasPhoto: boolean; photoUrl: string | null };
    return { submissionId: m.submissionId, hasPhoto: m.hasPhoto, photoUrl: m.photoUrl };
  };

  it('Z1: the COMMIT reached the DB and then the call threw (a lost acknowledgement) → read back by key: 201 with THAT row, the photo KEPT, ⛔ `_rolled_back` line; a same-key retry replays 200 with the photo present', async () => {
    const w = await world();
    const key = randomUUID();
    const inj = injectCommitFailure('ack_lost');
    let r: Awaited<ReturnType<typeof send>>;
    try {
      r = await send(t, w, photoParts(), { key });
    } finally {
      inj.restore();
    }
    expect(inj.fired()).toBe(true); // the injection really hit the Send's COMMIT
    expect(r.status, JSON.stringify(r.body)).toBe(201);
    const committed = await submissions(w);
    expect(committed).toHaveLength(1);
    expect(committed[0]!.idempotency_key).toBe(key);
    expect(r.body).toEqual({ submissionId: committed[0]!.submission_id, memorialState: 'with_the_trust' });
    const photoKey = committed[0]!.photo_object_key;
    expect(photoKey).not.toBeNull();
    expect(storedFor(w)).toEqual([photoKey]); // ⛔ deleted — the committed row references it
    expect(await sendAudit(w)).toEqual(['memorial.submission.create']); // ⛔ a compensating line for a row that exists

    const retry = await send(t, w, photoParts(), { key });
    expect(retry.status).toBe(200);
    expect(retry.body).toEqual(r.body);
    expect(await submissions(w)).toHaveLength(1);
    expect(storedFor(w)).toEqual([photoKey]);
    expect(await viewPhoto(w)).toMatchObject({ submissionId: committed[0]!.submission_id, hasPhoto: true, photoUrl: expect.any(String) });
  });

  it('Z1: the COMMIT threw and nothing landed → the read-back finds ⛔ row: the rollback path — 500, the photo deleted, the intent compensated; the same key then inserts (201)', async () => {
    const w = await world();
    const key = randomUUID();
    const inj = injectCommitFailure('failed');
    let r: Awaited<ReturnType<typeof send>>;
    try {
      r = await send(t, w, photoParts(), { key });
    } finally {
      inj.restore();
    }
    expect(inj.fired()).toBe(true);
    expect(r.status).toBe(500);
    expect(await submissions(w)).toEqual([]);
    expect(storedFor(w)).toEqual([]);
    expect(await sendAudit(w)).toEqual(['memorial.submission.create', 'memorial.submission.create_rolled_back']);
    const retry = await send(t, w, photoParts(), { key });
    expect(retry.status, JSON.stringify(retry.body)).toBe(201);
    expect((await submissions(w)).map((s) => s.idempotency_key)).toEqual([key]);
    expect(storedFor(w)).toHaveLength(1);
  });

  it('Z1: the COMMIT landed, its acknowledgement was lost AND the read-back failed → the outcome is unknown: 500, the photo KEPT, ⛔ `_rolled_back` line; a same-key retry replays 200 with the photo present', async () => {
    const w = await world();
    const key = randomUUID();
    const inj = injectCommitFailure('ack_lost');
    const realRead = memorial.readMemorialSubmissionByIdempotencyKey;
    vi.spyOn(memorial, 'readMemorialSubmissionByIdempotencyKey').mockImplementation(async (db, where) => {
      if (inj.fired()) throw new Error('injected read-back failure');
      return realRead(db, where);
    });
    let r: Awaited<ReturnType<typeof send>>;
    try {
      r = await send(t, w, photoParts(), { key });
    } finally {
      inj.restore();
    }
    expect(inj.fired()).toBe(true);
    expect(r.status).toBe(500);
    const committed = await submissions(w);
    expect(committed).toHaveLength(1); // it DID land
    const photoKey = committed[0]!.photo_object_key;
    expect(storedFor(w)).toEqual([photoKey]); // … so deleting the photo would have broken the row
    expect(await sendAudit(w)).toEqual(['memorial.submission.create']); // ⛔ a rollback the server cannot prove

    const retry = await send(t, w, photoParts(), { key });
    expect(retry.status).toBe(200);
    expect(retry.body).toEqual({ submissionId: committed[0]!.submission_id, memorialState: 'with_the_trust' });
    expect(await viewPhoto(w)).toMatchObject({ submissionId: committed[0]!.submission_id, hasPhoto: true, photoUrl: expect.any(String) });
  });

  it('R17: the audit payload hash carries no digest of the words — two different texts, same shape, ONE hash', async () => {
    const w = await world();
    expect((await send(t, w, fields({ body: 'First words, a formulaic sentence.' }))).status).toBe(201);
    expect((await send(t, w, fields({ body: 'A completely different second text.' }))).status).toBe(201);
    const hashes = await rows<{ request_payload_hash: string }>(
      t,
      `SELECT request_payload_hash FROM audit_log_entries WHERE pariwar_id = $1 AND action = 'memorial.submission.create'`,
      [w.pariwarId],
    );
    expect(hashes).toHaveLength(2);
    // Nothing in the payload depends on the words (a `body_sha256` would make these differ and make short text guessable).
    expect(new Set(hashes.map((h) => h.request_payload_hash)).size).toBe(1);
  });

  // ⚠ A GUARD for the kept object: a keepPreviousPhoto Send never `put`s, so `putKey` is null and the catch has no object of its
  // own to delete. What this pins is that no path of a keep Send — a refusal, a commit, a same-key replay — touches the earlier
  // version's object. The failure that comes AFTER the head's key was read and a keep decided (an unlocked writer winning the
  // unique index) is races.spec.ts "MA8 + Trap 12".
  it('keepPreviousPhoto (guard): a refused keep Send, a committed keep Send and its same-key replay all leave the earlier object in place; the replay writes no third version', async () => {
    const w = await world();
    expect((await send(t, w, photoParts())).status).toBe(201);
    const [v1] = await submissions(w);
    const keptKey = v1!.photo_object_key!;
    const failed = await send(t, w, fields({ body: 'Second words.', altText: 'Same photo.', keepPreviousPhoto: 'true', authorisationCopyVersion: 'stale' }));
    expect(failed.status).toBe(409);
    expect(t.memorialPhotoStorage.store.has(keptKey)).toBe(true);
    const key = randomUUID();
    const kept = await send(t, w, fields({ body: 'Third words.', altText: 'Same photo.', keepPreviousPhoto: 'true' }), { key });
    expect(kept.status).toBe(201);
    expect(await submissions(w)).toHaveLength(2);
    const retry = await send(t, w, fields({ body: 'Third words.', altText: 'Same photo.', keepPreviousPhoto: 'true' }), { key });
    expect(retry.status).toBe(200);
    expect(retry.body).toEqual(kept.body);
    const after = await submissions(w);
    expect(after).toHaveLength(2);
    expect(after.map((s) => s.photo_object_key)).toEqual([keptKey, keptKey]);
    expect(t.memorialPhotoStorage.store.has(keptKey)).toBe(true);
  });
});
