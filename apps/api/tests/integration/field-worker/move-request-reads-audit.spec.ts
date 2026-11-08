// Story 13.1d (AC7; AD10 as amended by `-460`) — the two move-request reads release NOTHING before their audit line exists: the REAL
// `withCompensatingAudit`, handed a pool that cannot connect for ONE action, cannot write the intent line, so the name is never
// decrypted (no key-service call), the answer is a 5xx and the body carries no name. CONTROL: with the pool up the same read decrypts,
// and the decrypt comes AFTER the line (the order recorded). A file-wide mock of `@twt/domain` (the 13.1a `reads.spec.ts` shape), so it
// lives apart. Live DB, OWN-COMMITTING; a fresh Pariwar per test.

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const hooks = vi.hoisted(() => ({ order: [] as string[], breakAudit: null as null | string }));

vi.mock('@twt/domain', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@twt/domain')>();
  return {
    ...actual,
    audit: {
      ...actual.audit,
      withCompensatingAudit: vi.fn(async (pool: Parameters<typeof actual.audit.withCompensatingAudit>[0], args: Parameters<typeof actual.audit.withCompensatingAudit>[1]) => {
        const downPool = { connect: async () => { throw new Error('forced: the audit pool is down'); } } as unknown as typeof pool;
        return actual.audit.withCompensatingAudit(hooks.breakAudit === args.auditIntent.action ? downPool : pool, {
          ...args,
          mutate: async (ctx) => {
            hooks.order.push(`mutate:${args.auditIntent.action}`);
            return args.mutate(ctx);
          },
        });
      }),
    },
  };
});

const { hasDatabase } = await import('../_setup.js');
const { createHarness, json } = await import('./_registration-harness.js');
type Harness = Awaited<ReturnType<typeof createHarness>>;

const NAME = 'Unaudited Requestworker';

describe.skipIf(!hasDatabase)('Story 13.1d — the move-request reads are audit-first (AC7)', { timeout: 90_000 }, () => {
  let h: Harness;
  beforeAll(async () => {
    h = await createHarness();
  });
  afterAll(async () => {
    await h.cleanup();
  });

  async function setup() {
    const p = h.freshPariwar();
    await h.listDistrict(p, 'Patna', 'Gaya');
    const pa = await h.actor(p, 'pariwar_admin', 'pariwar', p, 'Meera Pariwar-Admin');
    const daP = await h.actor(p, 'district_admin', 'district', 'Patna', 'Ravi Patna');
    const daG = await h.actor(p, 'district_admin', 'district', 'Gaya', 'Sita Gaya');
    const worker = await h.registered(pa.client, p, { name: NAME, mobile: '+919876556789', district: 'Patna' });
    const opened = await h.openRequest(daP.client, p, worker, { from_district: 'Patna', to_district: 'Gaya' });
    expect(opened.statusCode, opened.body).toBe(201);
    return { p, daG, id: json(opened)['move_request_id'] as string };
  }

  for (const [label, action, read] of [
    ['the list', 'field_worker.move_requests_viewed', (s: Awaited<ReturnType<typeof setup>>) => h.requests(s.daG.client, s.p, { state: 'open', district: 'Gaya' })],
    ['the detail', 'field_worker.move_request_worker_viewed', (s: Awaited<ReturnType<typeof setup>>) => h.request(s.daG.client, s.p, s.id)],
  ] as const) {
    it(`${label}: a FAILED audit write releases nothing (5xx, no name, no key-service call); CONTROL — with the pool up it decrypts after the line`, async () => {
      const s = await setup();
      const decrypt = vi.spyOn(h.deps.encryption.kms, 'decryptDek');
      hooks.breakAudit = action;
      try {
        const r = await read(s);
        expect(r.statusCode, r.body).toBeGreaterThanOrEqual(500);
        expect(r.body).not.toContain('Unaudited');
        expect(decrypt).not.toHaveBeenCalled();
      } finally {
        hooks.breakAudit = null;
      }
      // CONTROL — the pool up: the line is written, THEN the name is decrypted (a pass-through spy records the order).
      decrypt.mockRestore();
      const kms = h.deps.encryption.kms;
      const original = kms.decryptDek.bind(kms);
      const spy = vi.spyOn(kms, 'decryptDek').mockImplementation(async (...a: Parameters<typeof original>) => {
        hooks.order.push('decrypt');
        return original(...a);
      });
      hooks.order.length = 0;
      try {
        const r = await read(s);
        expect(r.statusCode, r.body).toBe(200);
        expect(r.body).toContain(NAME);
      } finally {
        spy.mockRestore();
      }
      const at = hooks.order.indexOf(`mutate:${action}`);
      expect(at).toBeGreaterThanOrEqual(0);
      expect(hooks.order.indexOf('decrypt')).toBeGreaterThan(at);
    });
  }
});
