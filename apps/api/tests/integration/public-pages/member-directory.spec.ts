// The PUBLIC Member Directory route — live-DB integration (Story 11a.3, Tasks 3+4; AC1, AC3, AC6).
//
// Drives `GET /api/v1/p/:pariwarId/public-pages/member-directory` through `app.inject` against real
// Postgres. Families:
//   · the tiered render itself — three fields, and ⛔ NOTHING else on the wire.
//   · ⭐ AC3's configurability PROOF: the same fixture renders "Rajesh S." under `shielded_name` and
//     the full legal name under `full_name` / no row, AND the stored `name_ciphertext` is
//     BYTE-IDENTICAL across the flip and the flip back (`2026-08-19-136` cl.2/cl.3).
//   · the anti-enumeration bounds — over-cap limit, over-horizon page, unknown parameter.
//   · `X-Robots-Tag` (⚠ VERIFIED from the existing global hook, ⛔ not rebuilt).
//
// ⚠ The rate-limit KEY property (Trap 2) lives in its own hermetic spec — `rate-limit-key.spec.ts` —
// because it must build apps with a low ceiling and no DB.

import { randomUUID } from 'node:crypto';

import { encryption, ids, kyc, schema } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { __resetDirectoryAbuseCounters } from '../../../src/modules/public-pages/index.js';
import { createTestApp, hasDatabase, teardown, type TestApp } from '../_setup.js';

const ROUTE = (pariwarId: string): string =>
  `/api/v1/p/${pariwarId}/public-pages/member-directory`;

interface SeededMember {
  memberId: string;
  legalName: string;
}

/**
 * Seed a Pariwar with directory-visible members, each carrying a REAL Tier-1 encrypted KYC name so
 * the route's decrypt runs for real. ⛔ Not a pre-decrypted fixture: the decrypt IS the thing under
 * test, and a fake would prove nothing about it.
 */
async function seedDirectory(
  t: TestApp,
  members: Array<{ legalName: string; district?: string; state?: string }>,
): Promise<{ pariwarId: string; seeded: SeededMember[] }> {
  const pariwarId = randomUUID();
  const scopeTx = await openScopeTx(t.deps, pariwarId);
  const seeded: SeededMember[] = [];
  try {
    const pid = ids.pariwarId(pariwarId);
    for (const m of members) {
      const memberId = randomUUID();
      await scopeTx.client.query(
        `INSERT INTO members (member_id, pariwar_id, state, state_event_version)
         VALUES ($1, $2, $3, 1)`,
        [memberId, pariwarId, m.state ?? 'active'],
      );
      await scopeTx.tx.insert(schema.memberKycProfiles).values({
        memberId: ids.memberId(memberId),
        pariwarId: pid,
        nameCiphertext: await encryption.encryptKycField(m.legalName, pariwarId, t.deps.encryption),
        dobCiphertext: await encryption.encryptKycField('1990-01-15', pariwarId, t.deps.encryption),
        photoCiphertext: await encryption.encryptKycField('x', pariwarId, t.deps.encryption),
        aadhaarMaskedId: 'XXXX1234',
        verificationStrength: 'aadhaar_kyc',
        source: 'digilocker',
      });
      if (m.district !== undefined) {
        await scopeTx.client.query(
          `INSERT INTO member_postings (posting_id, member_id, pariwar_id, district, is_retirement, created_at)
           VALUES ($1, $2, $3, $4, false, now())`,
          [randomUUID(), memberId, pariwarId, m.district],
        );
      }
      seeded.push({ memberId, legalName: m.legalName });
    }
    await closeScopeTx(scopeTx, true);
  } catch (err) {
    await closeScopeTx(scopeTx, false);
    throw err;
  }
  return { pariwarId, seeded };
}

/** Set the Pariwar's public-name presentation mode through the GOVERNED write path. */
async function setMode(t: TestApp, pariwarId: string, mode: 'full_name' | 'shielded_name'): Promise<void> {
  const scopeTx = await openScopeTx(t.deps, pariwarId);
  try {
    await kyc.setPublicNamePresentationMode(scopeTx.tx, {
      pariwarId: ids.pariwarId(pariwarId),
      mode,
      changedByActor: null,
      changedByDisplay: null,
      rationale: 'test fixture — exercising the ruled configurability in both directions',
      auditId: randomUUID(),
    });
    await closeScopeTx(scopeTx, true);
  } catch (err) {
    await closeScopeTx(scopeTx, false);
    throw err;
  }
}

/** Read the stored ciphertext back, to prove the flip never touched the KYC record. */
async function readCiphertext(t: TestApp, pariwarId: string, memberId: string): Promise<string> {
  const scopeTx = await openScopeTx(t.deps, pariwarId);
  try {
    const res = await scopeTx.client.query<{ name_ciphertext: string }>(
      'SELECT name_ciphertext FROM member_kyc_profiles WHERE member_id = $1',
      [memberId],
    );
    return res.rows[0]?.name_ciphertext ?? '';
  } finally {
    await closeScopeTx(scopeTx, true);
  }
}

describe.skipIf(!hasDatabase)('public Member Directory route (:5433)', { timeout: 30000 }, () => {
  it('renders the three classified fields — and ⛔ NOTHING else on the wire', async () => {
    const t = await createTestApp();
    try {
      const { pariwarId } = await seedDirectory(t, [
        { legalName: 'Rajesh Kumar Sharma', district: 'Lucknow' },
        { legalName: 'Sunita Devi', district: 'Kanpur', state: 'lock-in' },
      ]);

      const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId) });
      expect(res.statusCode).toBe(200);
      const body = res.json() as { items: Array<Record<string, unknown>>; total: number };

      expect(body.total).toBe(2);
      expect(body.items).toHaveLength(2);
      // ⭐ THE EXACT KEY SET. ⛔ A public JSON route that over-returns is a leak the HTML tier-leak
      // gate structurally cannot see, so the shape is asserted here, exactly, not sampled.
      for (const item of body.items) {
        expect(Object.keys(item).sort()).toEqual(['district', 'name', 'status']);
      }
      const names = body.items.map((i) => i['name']);
      expect(names).toContain('Rajesh Kumar Sharma');
      expect(names).toContain('Sunita Devi');
      // The ruled two-label pill.
      expect(body.items.map((i) => i['status']).sort()).toEqual(['active', 'lock-in']);

      // ⛔ No ciphertext, no member id, anywhere in the serialized payload.
      expect(res.body).not.toContain('enc:');
      for (const key of ['member_id', 'memberId', 'nameCiphertext', 'mobile', 'aadhaar']) {
        expect(res.body).not.toContain(key);
      }
    } finally {
      await teardown(t);
    }
  });

  it('⚠ `active-in-grace` presents as `active` — a billing state is NOT published', async () => {
    const t = await createTestApp();
    try {
      const { pariwarId } = await seedDirectory(t, [
        { legalName: 'Grace Member', district: 'Agra', state: 'active-in-grace' },
      ]);
      const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId) });
      const body = res.json() as { items: Array<{ status: string }> };
      expect(body.items[0]?.status).toBe('active');
      // ⛔ The raw state never reaches the wire.
      expect(res.body).not.toContain('active-in-grace');
    } finally {
      await teardown(t);
    }
  });

  // ── AC3 — the configurability PROOF ────────────────────────────────────────────────────────────

  it('⭐ PROVES configurability BOTH WAYS, and the stored ciphertext is byte-identical throughout', async () => {
    const t = await createTestApp();
    try {
      const { pariwarId, seeded } = await seedDirectory(t, [
        { legalName: 'Rajesh Kumar Sharma', district: 'Lucknow' },
      ]);
      const memberId = seeded[0]!.memberId;

      // (1) No row at all → the RULED default (`full_name`). ⛔ Not fail-closed, deliberately.
      const before = await readCiphertext(t, pariwarId, memberId);
      const first = (
        await t.app.inject({ method: 'GET', url: ROUTE(pariwarId) })
      ).json() as { items: Array<{ name: string }> };
      expect(first.items[0]?.name).toBe('Rajesh Kumar Sharma');

      // (2) Flip to shielded — the SAME fixture, NO code change.
      await setMode(t, pariwarId, 'shielded_name');
      const shielded = (
        await t.app.inject({ method: 'GET', url: ROUTE(pariwarId) })
      ).json() as { items: Array<{ name: string }> };
      expect(shielded.items[0]?.name).toBe('Rajesh S.');
      const afterShield = await readCiphertext(t, pariwarId, memberId);

      // (3) Flip BACK — `-136` cl.3: not a one-way ratchet.
      await setMode(t, pariwarId, 'full_name');
      const restored = (
        await t.app.inject({ method: 'GET', url: ROUTE(pariwarId) })
      ).json() as { items: Array<{ name: string }> };
      expect(restored.items[0]?.name).toBe('Rajesh Kumar Sharma');
      const afterUnshield = await readCiphertext(t, pariwarId, memberId);

      // ⭐ `-136` cl.2 — THE PATH WRITES A MODE, NEVER A NAME. No second identity system.
      expect(afterShield).toBe(before);
      expect(afterUnshield).toBe(before);
    } finally {
      await teardown(t);
    }
  });

  // ── AC6 — the anti-enumeration bounds ─────────────────────────────────────────────────────────

  it('refuses an over-cap limit, an over-horizon page, and an unknown parameter', async () => {
    const t = await createTestApp();
    try {
      const { pariwarId } = await seedDirectory(t, [{ legalName: 'Anyone At All' }]);

      // FR-91 page-size cap (50).
      expect((await t.app.inject({ method: 'GET', url: `${ROUTE(pariwarId)}?limit=51` })).statusCode).toBe(400);
      expect((await t.app.inject({ method: 'GET', url: `${ROUTE(pariwarId)}?limit=99999` })).statusCode).toBe(400);
      // The deep-pagination horizon (200).
      expect((await t.app.inject({ method: 'GET', url: `${ROUTE(pariwarId)}?page=201` })).statusCode).toBe(400);
      expect((await t.app.inject({ method: 'GET', url: `${ROUTE(pariwarId)}?page=999999999` })).statusCode).toBe(400);
      // ⛔ NO BULK EXPORT — `.strict()` makes these refusals, not ignored parameters.
      expect((await t.app.inject({ method: 'GET', url: `${ROUTE(pariwarId)}?format=csv` })).statusCode).toBe(400);
      expect((await t.app.inject({ method: 'GET', url: `${ROUTE(pariwarId)}?limit=all` })).statusCode).toBe(400);
      expect((await t.app.inject({ method: 'GET', url: `${ROUTE(pariwarId)}?fields=mobile` })).statusCode).toBe(400);

      // …and an in-range request still succeeds, so the bounds reject only what they should.
      expect((await t.app.inject({ method: 'GET', url: `${ROUTE(pariwarId)}?limit=10&page=1` })).statusCode).toBe(200);
      expect((await t.app.inject({ method: 'GET', url: `${ROUTE(pariwarId)}?page=200` })).statusCode).toBe(200);
    } finally {
      await teardown(t);
    }
  });

  it('⚠ VERIFIES (does not rebuild) the global X-Robots-Tag hook on this route', async () => {
    const t = await createTestApp();
    try {
      const { pariwarId } = await seedDirectory(t, [{ legalName: 'Anyone At All' }]);
      const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId) });
      expect(String(res.headers['x-robots-tag'])).toContain('noindex');
      expect(String(res.headers['x-robots-tag'])).toContain('nofollow');
    } finally {
      await teardown(t);
    }
  });

  it('pages deterministically and reports an honest total', async () => {
    const t = await createTestApp();
    try {
      const { pariwarId } = await seedDirectory(
        t,
        Array.from({ length: 5 }, (_, i) => ({ legalName: `Member Number${i}`, district: 'Lucknow' })),
      );

      const p1 = (await t.app.inject({ method: 'GET', url: `${ROUTE(pariwarId)}?page=1&limit=2` })).json() as {
        items: Array<{ name: string }>;
        total: number;
      };
      const p2 = (await t.app.inject({ method: 'GET', url: `${ROUTE(pariwarId)}?page=2&limit=2` })).json() as {
        items: Array<{ name: string }>;
        total: number;
      };

      expect(p1.total).toBe(5);
      expect(p2.total).toBe(5);
      expect(p1.items).toHaveLength(2);
      expect(p2.items).toHaveLength(2);
      // ⭐ Disjoint pages, and page 1 is page 1 again on a second request.
      expect(p1.items.filter((a) => p2.items.some((b) => b.name === a.name))).toEqual([]);
      const p1Again = (await t.app.inject({ method: 'GET', url: `${ROUTE(pariwarId)}?page=1&limit=2` })).json() as {
        items: Array<{ name: string }>;
      };
      expect(p1Again.items).toEqual(p1.items);
    } finally {
      await teardown(t);
    }
  });

  // ── AC6.4 — the abuse rules are WIRED to the LIVE route ───────────────────────────────────────

  it('⭐ the abuse rules RUN ON THE REAL ROUTE — a deep page emits directory.abuse_suspected', async () => {
    __resetDirectoryAbuseCounters();
    const t = await createTestApp();
    try {
      const { pariwarId } = await seedDirectory(t, [{ legalName: 'Anyone At All' }]);

      // An ordinary first read trips nothing.
      await t.app.inject({ method: 'GET', url: `${ROUTE(pariwarId)}?page=1`, headers: { 'x-forwarded-for': '203.0.113.77' } });
      expect(t.auditSink.ofType('directory.abuse_suspected')).toHaveLength(0);

      // A page past the rapid_pagination depth does. ⛔ It is a SIGNAL, not a block: still 200.
      const res = await t.app.inject({
        method: 'GET',
        url: `${ROUTE(pariwarId)}?page=90`,
        headers: { 'x-forwarded-for': '203.0.113.77' },
      });
      expect(res.statusCode).toBe(200);

      const lines = t.auditSink.ofType('directory.abuse_suspected');
      expect(lines.length).toBeGreaterThanOrEqual(1);
      // ⭐ The rule id survives in `resource_locator` — the ONLY triage field an unauthenticated
      // emitter has, since `context` is hashed and the default locator is a constant.
      expect(lines[0]?.resourceLocator).toMatch(/^directory:rapid_pagination:p90:l\d+$/);
      // ⛔ AND IT IS NOT THE HONEYPOT SIGNAL — reusing that type would corrupt it and break
      // security-headers.spec.ts's exact-count assertion.
      expect(t.auditSink.ofType('abuse.honeypot')).toHaveLength(0);
    } finally {
      await teardown(t);
    }
  });

  it('a member with no posting row renders a null district, not a missing member', async () => {
    const t = await createTestApp();
    try {
      const { pariwarId } = await seedDirectory(t, [{ legalName: 'No Posting' }]);
      const body = (await t.app.inject({ method: 'GET', url: ROUTE(pariwarId) })).json() as {
        items: Array<{ name: string; district: string | null }>;
      };
      expect(body.items).toHaveLength(1);
      expect(body.items[0]?.district).toBeNull();
    } finally {
      await teardown(t);
    }
  });
});
