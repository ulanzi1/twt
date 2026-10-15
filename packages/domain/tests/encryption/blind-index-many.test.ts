// Story 6.36b — the BATCH blind-index path (6.36a SW12 / SF9): one KMS HMAC per value, at most 8 in flight per process,
// and ONE audit line for the whole request (`{ count, purpose }`) — ⛔ one per value (the per-call hook would serialise up
// to 1,000 audit writes on the lock login shares). No DB.

import { randomBytes } from 'node:crypto';

import { beforeAll, describe, expect, it } from 'vitest';

import {
  BATCH_HMAC_MAX_IN_FLIGHT,
  blindIndex,
  blindIndexMany,
  createConcurrencyLimiter,
  createFakeKmsProvider,
  type KmsAuditContext,
  type KmsKeyRef,
  type KmsProvider,
} from '../../src/encryption/index.js';

const HMAC_REF: KmsKeyRef = { resourceName: 'projects/twt-dev/locations/asia-south1/keyRings/r/cryptoKeys/pii-tier-2-hmac' };
const NS = '00000000-0000-0000-0000-000000000001';

let base: KmsProvider;
beforeAll(() => {
  base = createFakeKmsProvider({ kekBytes: randomBytes(32), hmacKeyBytes: randomBytes(32) });
});

/** A provider that records audit calls and the peak number of HMACs in flight. */
function instrumented(delayMs = 2) {
  const audits: { op: string; ctx: KmsAuditContext }[] = [];
  let inFlight = 0;
  let peak = 0;
  const kms: KmsProvider = {
    encryptDek: base.encryptDek.bind(base),
    decryptDek: base.decryptDek.bind(base),
    async computeHmac(ref, input, ctx) {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      try {
        await new Promise((r) => setTimeout(r, delayMs));
        return await base.computeHmac(ref, input, ctx);
      } finally {
        inFlight -= 1;
      }
    },
    auditHook: (op, _ref, ctx) => {
      audits.push({ op, ctx });
    },
  };
  return { kms, audits, peak: () => peak };
}

const numbers = (n: number) => Array.from({ length: n }, (_, i) => `+9198${String(i).padStart(8, '0')}`);

describe('blindIndexMany', () => {
  it('returns, in order, exactly what blindIndex returns for each value', async () => {
    const values = numbers(25);
    const many = await blindIndexMany('member_mobile', values, { pariwarId: NS }, base, HMAC_REF, { pariwarId: 'p-1', purpose: 'contact_match' });
    const one = await Promise.all(values.map((v) => blindIndex('member_mobile', v, { pariwarId: NS }, base, HMAC_REF)));
    expect(many).toEqual(one);
  });

  it('a 1,000-number match writes ONE audit line carrying the count and purpose — ⛔ one per number', async () => {
    const { kms, audits } = instrumented(0);
    await blindIndexMany('member_mobile', numbers(1000), { pariwarId: NS }, kms, HMAC_REF, { pariwarId: 'p-1', purpose: 'contact_match' });
    expect(audits).toHaveLength(1);
    expect(audits[0]).toEqual({ op: 'computeHmac', ctx: { pariwarId: 'p-1', fieldClass: 'member_mobile', count: 1000, purpose: 'contact_match' } });
  });

  it('an empty batch computes nothing and audits nothing', async () => {
    const { kms, audits } = instrumented(0);
    expect(await blindIndexMany('member_mobile', [], { pariwarId: NS }, kms, HMAC_REF, { pariwarId: 'p-1', purpose: 'contact_match' })).toEqual([]);
    expect(audits).toHaveLength(0);
  });

  it('at most 8 HMACs in flight per process — across TWO concurrent batches sharing the process limiter', async () => {
    expect(BATCH_HMAC_MAX_IN_FLIGHT).toBe(8);
    const { kms, peak } = instrumented(3);
    await Promise.all([
      blindIndexMany('member_mobile', numbers(60), { pariwarId: NS }, kms, HMAC_REF, { pariwarId: 'p-1', purpose: 'contact_match' }),
      blindIndexMany('member_mobile', numbers(60), { pariwarId: NS }, kms, HMAC_REF, { pariwarId: 'p-2', purpose: 'contact_match' }),
    ]);
    expect(peak()).toBeLessThanOrEqual(8);
    expect(peak()).toBeGreaterThan(1); // positive control — it does run concurrently
  });

  it('a failed HMAC fails the batch and audits nothing (the hook fires on the success path only)', async () => {
    const { kms, audits } = instrumented(0);
    let calls = 0;
    const failing: KmsProvider = {
      ...kms,
      async computeHmac(ref, input, ctx) {
        calls += 1;
        if (calls === 5) throw new Error('kms down');
        return kms.computeHmac(ref, input, ctx);
      },
    };
    await expect(blindIndexMany('member_mobile', numbers(10), { pariwarId: NS }, failing, HMAC_REF, { pariwarId: 'p-1', purpose: 'contact_match' })).rejects.toThrow('kms down');
    expect(audits).toHaveLength(0);
  });

  it('refuses the inputs blindIndex refuses, and a purpose that is not a plain key', async () => {
    const audit = { pariwarId: 'p-1', purpose: 'contact_match' };
    await expect(blindIndexMany('', ['x'], { pariwarId: NS }, base, HMAC_REF, audit)).rejects.toThrow(/fieldClass/);
    await expect(blindIndexMany('a:b', ['x'], { pariwarId: NS }, base, HMAC_REF, audit)).rejects.toThrow(/fieldClass/);
    await expect(blindIndexMany('member_mobile', [''], { pariwarId: NS }, base, HMAC_REF, audit)).rejects.toThrow(/plaintext/);
    await expect(blindIndexMany('member_mobile', ['x'], { pariwarId: 'a|b' }, base, HMAC_REF, audit)).rejects.toThrow(/pariwarId/);
    await expect(blindIndexMany('member_mobile', ['x'], { pariwarId: NS }, base, HMAC_REF, { pariwarId: 'p', purpose: 'contact match/x' })).rejects.toThrow(/purpose/);
  });
});

describe('createConcurrencyLimiter', () => {
  it('never runs more than `max` at once and runs every task', async () => {
    const limit = createConcurrencyLimiter(3);
    let inFlight = 0;
    let peak = 0;
    const out = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        limit.run(async () => {
          inFlight += 1;
          peak = Math.max(peak, inFlight);
          await new Promise((r) => setTimeout(r, 1));
          inFlight -= 1;
          return i;
        }),
      ),
    );
    expect(out).toEqual(Array.from({ length: 20 }, (_, i) => i));
    expect(peak).toBe(3);
  });

  it('a rejected task releases its slot', async () => {
    const limit = createConcurrencyLimiter(1);
    await expect(limit.run(() => Promise.reject(new Error('x')))).rejects.toThrow('x');
    expect(await limit.run(() => Promise.resolve(7))).toBe(7);
  });
});
