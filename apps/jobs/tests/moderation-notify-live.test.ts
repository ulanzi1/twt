// Story 5.11 R3 — the real member-target reads and keyed store, on :5433; no transport or KMS network.
import { randomUUID } from 'node:crypto';

import { createDb, encryption, idempotency, ids, schema, withPariwarScope, type CreatedDb } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { deriveModerationAlertId, runModerationNotify } from '../src/scheduler/moderation-notify.js';
import type { ContributionNotifyDeps } from '../src/scheduler/contribution-notify.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);

describe.skipIf(!hasDatabase)('R3 — moderation outcome persistence (live DB :5433)', () => {
  let created: CreatedDb;
  const kms = encryption.createFakeKmsProvider({ kekBytes: new Uint8Array(32).fill(7), hmacKeyBytes: new Uint8Array(32).fill(9) });
  const keyRef = { resourceName: 'fake/moderation-outcome-test' };
  const enc = { kms, kekRef: keyRef, hmacKeyRef: keyRef };

  beforeAll(() => { created = createDb(DATABASE_URL!, { ssl: false }); });
  afterAll(async () => { await created.pool.end(); });

  async function fixture(withMobile: boolean) {
    const pariwarId = randomUUID();
    const memberId = randomUUID();
    const moderationActionId = randomUUID();
    await withPariwarScope(created.pool, pariwarId, async (db) => {
      await db.insert(schema.members).values({ memberId: ids.memberId(memberId), pariwarId: ids.pariwarId(pariwarId), state: 'active', stateEventVersion: 1 });
      if (withMobile) {
        await db.insert(schema.memberIdentities).values({
          memberId: ids.memberId(memberId), pariwarId: ids.pariwarId(pariwarId),
          mobileCiphertext: await encryption.encryptMobile('+919999999999', enc), mobileBlindIndex: 'a'.repeat(64),
        });
      }
    });
    const resolveProviders = vi.fn().mockResolvedValue({ push: [], whatsapp: [], sms: [], telegram: [] });
    const notify: ContributionNotifyDeps = {
      pool: created.pool, serviceDb: created.db, encryption: enc, audit: async () => undefined,
      hashRendered: async () => 'a'.repeat(64), resolveProviders,
    };
    return {
      pariwarId, resolveProviders, deps: { notify, onAlarm: vi.fn() },
      payload: { memberId, moderationActionId, action: 'suspend' as const, reasonCode: 'r14-forgery' },
      key: `moderation.notify:${pariwarId}:${deriveModerationAlertId(moderationActionId)}:${memberId}`,
    };
  }

  it('records an honest terminal trail and skips the fan-out entirely on redelivery', async () => {
    const f = await fixture(true);
    const store = idempotency.createKeyedStore(created.pool);
    expect(await runModerationNotify(f.deps, f.payload, f.pariwarId)).toMatchObject({ delivered: false, alreadySent: false });
    const recorded = await store.getResult(f.key);
    expect(recorded).toMatchObject({ delivered: false, outcome: 'in_app_only', trail: [
      'push:0:skipped_no_target', 'whatsapp:0:skipped_no_target', 'sms:0:skipped_no_target:sms_message_not_lit',
    ] });
    expect(JSON.stringify(recorded)).not.toContain('+919999999999');
    expect(await runModerationNotify(f.deps, f.payload, f.pariwarId)).toMatchObject({ delivered: false, alreadySent: true });
    expect(f.resolveProviders).toHaveBeenCalledTimes(1);
    expect(await store.getResult(f.key)).toEqual(recorded);
  });

  it('E1 (a) — a claim still in flight throws; once that attempt records, a redelivery reports it alreadySent', async () => {
    const f = await fixture(true);
    const store = idempotency.createKeyedStore(created.pool);
    expect(await store.claim(f.key, 3600)).toBe('acquired'); // the other attempt, just now
    try {
      await expect(runModerationNotify(f.deps, f.payload, f.pariwarId)).rejects.toThrow(/still in flight/);
      expect(f.resolveProviders).not.toHaveBeenCalled();
      await store.recordResult(f.key, { delivered: true, outcome: 'delivered' }); // the other attempt finishes
      expect(await runModerationNotify(f.deps, f.payload, f.pariwarId)).toMatchObject({ delivered: true, alreadySent: true });
      expect(f.resolveProviders).not.toHaveBeenCalled();
    } finally {
      await store.release(f.key);
    }
  });

  it('E1 (a) — a claim ABANDONED past the 15-min expiry is taken over: sent once, recorded', async () => {
    const f = await fixture(true);
    const deadWorker = idempotency.createKeyedStore(created.pool, { clock: () => new Date(Date.now() - 20 * 60 * 1000) });
    expect(await deadWorker.claim(f.key, 3600)).toBe('acquired'); // claimed 20 min ago, never recorded
    const store = idempotency.createKeyedStore(created.pool);
    try {
      expect(await runModerationNotify(f.deps, f.payload, f.pariwarId)).toMatchObject({ delivered: false, alreadySent: false });
      expect(f.resolveProviders).toHaveBeenCalledTimes(1);
      expect(await store.getResult(f.key)).toMatchObject({ outcome: 'in_app_only' });
    } finally {
      await store.release(f.key);
    }
  });

  it('R1 — no SMS target keeps the prior retry and releases the durable claim', async () => {
    const f = await fixture(false);
    await expect(runModerationNotify(f.deps, f.payload, f.pariwarId)).rejects.toThrow(/fan-out failed/);
    const store = idempotency.createKeyedStore(created.pool);
    expect(await store.getResult(f.key)).toBeNull();
    expect(await store.claim(f.key, 3600)).toBe('acquired');
    await store.release(f.key);
  });
});
