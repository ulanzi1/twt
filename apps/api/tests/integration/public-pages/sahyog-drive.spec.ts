// The PUBLIC Sahyog Drive route — live-DB integration (Story 11b.1, Task 2 + Task 7; AC2, AC8, AC9).
//
// Drives `GET /api/v1/p/:pariwarId/public-pages/sahyog-drive` through `app.inject` against real
// Postgres, with REAL Tier-1 encrypted names so the decrypt runs for real — ⛔ not a pre-decrypted
// fixture: the decrypt IS the thing under test here, and a fake would prove nothing about it.
//
// Families:
//   · the response shape — ⛔ NOTHING on the wire but the classified fields.
//   · ⭐ the consent gate: it decides whether a row is NAMED, ⛔ never whether it EXISTS.
//   · the kill switch: a pulled Pariwar is INDISTINGUISHABLE from an empty one.
//   · the anti-enumeration bounds — over-cap limit, over-horizon page, unknown parameter.
//   · the name FORM is mode-resolved (D10 + `-136` cl.1), ⛔ never hard-coded.

import { randomUUID } from 'node:crypto';

import { PublicSahyogDriveResponse } from '@twt/contracts';
import { encryption, ids, kyc, member as memberDomain, pool, schema } from '@twt/domain';
import { beforeEach, describe, expect, it } from 'vitest';

import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { PUBLIC_DIRECTORY_PAGE_HORIZON } from '../../../src/modules/public-pages/handlers.js';
import { __resetDirectoryAbuseCounters } from '../../../src/modules/public-pages/index.js';
import { createTestApp, hasDatabase, teardown, type TestApp } from '../_setup.js';

const ROUTE = (pariwarId: string): string => `/api/v1/p/${pariwarId}/public-pages/sahyog-drive`;

interface SeedDriveSpec {
  legalName: string;
  district?: string;
  poolState?: 'closed' | 'settled' | 'live';
  /** Whether the family consented to `sahyog_drive_publication`. */
  consented?: boolean;
  /** Seed the consent as granted-then-REVOKED (which must read exactly like never-granted). */
  revoked?: boolean;
  canonicalIdentifier?: string;
}

/** Seed a Pariwar with drives, each with a real encrypted deceased-member name. */
async function seedDrives(
  t: TestApp,
  drives: SeedDriveSpec[],
): Promise<{ pariwarId: string; poolIds: string[] }> {
  const pariwarId = randomUUID();
  const scopeTx = await openScopeTx(t.deps, pariwarId);
  const poolIds: string[] = [];
  try {
    const pid = ids.pariwarId(pariwarId);
    for (const d of drives) {
      const memberId = randomUUID();
      const claimCaseId = randomUUID();
      const poolId = randomUUID();

      await scopeTx.client.query(
        `INSERT INTO members (member_id, pariwar_id, state, state_event_version)
         VALUES ($1, $2, 'active', 1)`,
        [memberId, pariwarId],
      );
      await scopeTx.tx.insert(schema.memberKycProfiles).values({
        memberId: ids.memberId(memberId),
        pariwarId: pid,
        nameCiphertext: await encryption.encryptKycField(d.legalName, pariwarId, t.deps.encryption),
        dobCiphertext: await encryption.encryptKycField('1970-01-15', pariwarId, t.deps.encryption),
        verificationStrength: 'aadhaar_kyc',
        source: 'digilocker',
      });
      if (d.district !== undefined) {
        await scopeTx.client.query(
          `INSERT INTO member_postings (posting_id, member_id, pariwar_id, district, is_retirement, created_at)
           VALUES ($1, $2, $3, $4, false, now())`,
          [randomUUID(), memberId, pariwarId, d.district],
        );
      }
      await scopeTx.client.query("SET LOCAL app.claim_state_writer = 'on'");
      await scopeTx.client.query(
        `INSERT INTO claims (claim_case_id, pariwar_id, deceased_member_id, intake_channels,
                             current_state, state_event_version)
         VALUES ($1, $2, $3, ARRAY['member_app']::claim_intake_channel[], 'approved', 1)`,
        [claimCaseId, pariwarId, memberId],
      );
      await scopeTx.client.query("SET LOCAL app.claim_state_writer = 'off'");

      await scopeTx.client.query("SET LOCAL app.pool_state_writer = 'on'");
      await scopeTx.client.query(
        `INSERT INTO pools (pool_id, pariwar_id, cycle_id, claim_case_id, pool_index,
                            pool_canonical_identifier, support_category, benefit_mechanism,
                            fixed_amount, current_state, state_event_version)
         VALUES ($1, $2, $3, $4, $5, $6, 'death_support', 'pool', 100, $7, 1)`,
        [
          poolId,
          pariwarId,
          randomUUID(),
          claimCaseId,
          poolIds.length,
          d.canonicalIdentifier ?? `P-2026-08-${randomUUID().slice(0, 6)}`,
          d.poolState ?? 'closed',
        ],
      );
      await scopeTx.client.query("SET LOCAL app.pool_state_writer = 'off'");

      if (d.consented === true || d.revoked === true) {
        await scopeTx.client.query(
          `INSERT INTO consent_records (pariwar_id, subject_id, consent_type, granted_via_actor,
                                        consent_payload, granted_at, revoked_at)
           VALUES ($1, $2, 'sahyog_drive_publication', 'member_self', '{}'::jsonb,
                   now() - interval '1 day', $3)`,
          [pariwarId, memberId, d.revoked === true ? new Date() : null],
        );
      }
      poolIds.push(poolId);
    }
    await closeScopeTx(scopeTx, true);
  } catch (err) {
    await closeScopeTx(scopeTx, false);
    throw err;
  }
  return { pariwarId, poolIds };
}

/** Set the Pariwar's public-name presentation mode through the GOVERNED write path. */
async function setMode(
  t: TestApp,
  pariwarId: string,
  mode: 'full_name' | 'shielded_name',
): Promise<void> {
  const scopeTx = await openScopeTx(t.deps, pariwarId);
  try {
    await kyc.setPublicNamePresentationMode(scopeTx.tx, {
      pariwarId: ids.pariwarId(pariwarId),
      mode,
      changedByActor: null,
      changedByDisplay: null,
      rationale: 'test fixture — the public name form must be changeable with NO code change',
      auditId: randomUUID(),
    });
    await closeScopeTx(scopeTx, true);
  } catch (err) {
    await closeScopeTx(scopeTx, false);
    throw err;
  }
}

/** Pull the Pariwar's public publication through the GOVERNED write path (D3(a): ONE switch). */
async function setPublicationEnabled(
  t: TestApp,
  pariwarId: string,
  enabled: boolean,
): Promise<void> {
  const scopeTx = await openScopeTx(t.deps, pariwarId);
  try {
    await memberDomain.setDirectoryPublicationEnabled(scopeTx.tx, {
      pariwarId: ids.pariwarId(pariwarId),
      enabled,
      changedByActor: null,
      changedByDisplay: null,
      rationale: 'test fixture — the per-Pariwar public-surface kill switch',
      auditId: randomUUID(),
    });
    await closeScopeTx(scopeTx, true);
  } catch (err) {
    await closeScopeTx(scopeTx, false);
    throw err;
  }
}

describe.skipIf(!hasDatabase)('public Sahyog Drive route (:5433)', { timeout: 30000 }, () => {
  beforeEach(() => {
    __resetDirectoryAbuseCounters();
  });

  it('renders ONLY the classified fields — ⛔ no member_id, no ciphertext, no claim id', async () => {
    const t = await createTestApp();
    try {
      const { pariwarId } = await seedDrives(t, [
        { legalName: 'Rajesh Kumar Sharma', district: 'Lucknow', consented: true },
      ]);

      const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId) });
      expect(res.statusCode).toBe(200);
      const body = res.json() as { items: Array<Record<string, unknown>>; total: number };

      expect(body.total).toBe(1);
      // ⭐ THE EXACT KEY SET, ⛔ not a sample. A public JSON route that over-returns is a leak the
      // HTML tier-leak gate structurally CANNOT see — it scans rendered HTML, not this payload.
      expect(Object.keys(body.items[0] ?? {}).sort()).toEqual([
        'closedAt',
        'confirmedContributionCount',
        'deceasedMemberName',
        'district',
        'fundingOutcome',
        'poolCanonicalIdentifier',
        'poolLetterCode',
        'status',
      ]);

      // ⭐ THE PROPERTY, not a restatement of the list above: parse the WHOLE wire response through
      // the real `.strict()` contract, which fails on ANY extra or renamed field anywhere in the
      // shape — including a leak arriving under a name this test did not think to enumerate.
      expect(() => PublicSahyogDriveResponse.parse(res.json())).not.toThrow();

      // ⛔ And the raw body must not contain the internal identifiers at all, under ANY key.
      const raw = res.body;
      expect(raw).not.toContain('member_id');
      expect(raw).not.toContain('memberId');
      expect(raw).not.toContain('claimCaseId');
      expect(raw).not.toContain('poolId');
      expect(raw).not.toContain('enc:v1:');
    } finally {
      await teardown(t);
    }
  });

  describe('⭐ the consent gate decides whether a row is NAMED, ⛔ never whether it EXISTS', () => {
    it('a CONSENTED drive carries the deceased member’s FULL NAME (D10)', async () => {
      const t = await createTestApp();
      try {
        const { pariwarId } = await seedDrives(t, [
          { legalName: 'Rajesh Kumar Sharma', district: 'Lucknow', consented: true },
        ]);
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId) });
        const body = res.json() as { items: Array<Record<string, unknown>> };
        // ⛔ NOT "Rajesh S." — D10 rejected the shielded form for this surface. If a future edit
        // reaches for `resolvePoolIdentity()` (which hard-codes the split), this is what fails.
        expect(body.items[0]?.['deceasedMemberName']).toBe('Rajesh Kumar Sharma');
      } finally {
        await teardown(t);
      }
    });

    it('⭐ an UNCONSENTED drive STILL RENDERS, with the NAME null and everything else intact', async () => {
      const t = await createTestApp();
      try {
        const { pariwarId } = await seedDrives(t, [
          { legalName: 'Sunita Devi', district: 'Kanpur', consented: false },
        ]);
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId) });
        const body = res.json() as { items: Array<Record<string, unknown>>; total: number };

        // ⭐ THE WHOLE OF AC2: consent removes a NAME, ⛔ never a DRIVE from the public record.
        expect(body.total).toBe(1);
        expect(body.items).toHaveLength(1);
        expect(body.items[0]?.['deceasedMemberName']).toBeNull();
        expect(body.items[0]?.['district']).toBe('Kanpur');
        expect(body.items[0]?.['poolCanonicalIdentifier']).toBeTruthy();
        expect(body.items[0]?.['status']).toBe('active');
        // ⛔ And the name must not leak in any other form — not the legal name, not a fragment.
        expect(res.body).not.toContain('Sunita');
      } finally {
        await teardown(t);
      }
    });

    it('a REVOKED consent reads EXACTLY like a missing one — same wire value, row still present', async () => {
      const t = await createTestApp();
      try {
        const { pariwarId } = await seedDrives(t, [
          { legalName: 'Mohan Lal', district: 'Agra', revoked: true },
        ]);
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId) });
        const body = res.json() as { items: Array<Record<string, unknown>>; total: number };

        expect(body.total).toBe(1);
        expect(body.items[0]?.['deceasedMemberName']).toBeNull();
        expect(res.body).not.toContain('Mohan');
      } finally {
        await teardown(t);
      }
    });

    it('⭐ the index degrades PER-POOL, ⛔ never per-page — a mixed page renders BOTH rows', async () => {
      const t = await createTestApp();
      try {
        const { pariwarId } = await seedDrives(t, [
          { legalName: 'Named Member', district: 'Lucknow', consented: true },
          { legalName: 'Unnamed Member', district: 'Kanpur', consented: false },
        ]);
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId) });
        const body = res.json() as { items: Array<Record<string, unknown>>; total: number };

        expect(body.total).toBe(2);
        expect(body.items).toHaveLength(2);
        const names = body.items.map((i) => i['deceasedMemberName']);
        expect(names).toContain('Named Member');
        expect(names).toContain(null);
        // ⛔ One family's declination must not shorten the page for anyone else.
        expect(res.body).not.toContain('Unnamed');
      } finally {
        await teardown(t);
      }
    });
  });

  describe('the name FORM is MODE-RESOLVED (D10 + `-136` cl.1), ⛔ never hard-coded', () => {
    it('⭐ the SAME fixture renders full under `full_name` and shielded under `shielded_name`', async () => {
      const t = await createTestApp();
      try {
        const { pariwarId } = await seedDrives(t, [
          { legalName: 'Rajesh Kumar Sharma', district: 'Lucknow', consented: true },
        ]);

        // Default (no row) is `full_name` — the DEFAULT, ⛔ not a constant.
        const asDefault = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId) });
        expect(
          (asDefault.json() as { items: Array<Record<string, unknown>> }).items[0]?.[
            'deceasedMemberName'
          ],
        ).toBe('Rajesh Kumar Sharma');

        // ⭐ A Pariwar that shields STILL SHIELDS, in both directions (`-136` cl.3). This is the
        // assertion that fails if anyone hard-codes the form: `2026-08-19-136` cl.1 says a build in
        // which the public name form cannot be changed WITHOUT A CODE CHANGE fails that clause.
        await setMode(t, pariwarId, 'shielded_name');
        __resetDirectoryAbuseCounters();
        const shielded = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId) });
        expect(
          (shielded.json() as { items: Array<Record<string, unknown>> }).items[0]?.[
            'deceasedMemberName'
          ],
        ).toBe('Rajesh S.');

        // …and back again.
        await setMode(t, pariwarId, 'full_name');
        __resetDirectoryAbuseCounters();
        const backAgain = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId) });
        expect(
          (backAgain.json() as { items: Array<Record<string, unknown>> }).items[0]?.[
            'deceasedMemberName'
          ],
        ).toBe('Rajesh Kumar Sharma');
      } finally {
        await teardown(t);
      }
    });

    it('⭐ a MONONYM resolves normally under `full_name` — one of D10’s three grounds', async () => {
      const t = await createTestApp();
      try {
        // `shielded_name` returns '' for EVERY single-token name (`2026-08-21-145` cl.3), so under
        // the shielded form an entire class of deceased members would appear UNNAMED with no
        // signal. Mononyms are common in India. This asserts the ground D10 rests on.
        const { pariwarId } = await seedDrives(t, [
          { legalName: 'Sushil', district: 'Jaipur', consented: true },
        ]);
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId) });
        expect(
          (res.json() as { items: Array<Record<string, unknown>> }).items[0]?.[
            'deceasedMemberName'
          ],
        ).toBe('Sushil');
      } finally {
        await teardown(t);
      }
    });
  });

  describe('⭐ the kill switch — a PULLED Pariwar is INDISTINGUISHABLE from an EMPTY one (AC9)', () => {
    it('returns the IDENTICAL SHAPE as a genuinely empty index — ⛔ never a 403 or 404', async () => {
      const t = await createTestApp();
      try {
        const { pariwarId: pulled } = await seedDrives(t, [
          { legalName: 'Rajesh Kumar Sharma', district: 'Lucknow', consented: true },
        ]);
        await setPublicationEnabled(t, pulled, false);

        // A Pariwar with no drives at all — the shape the pulled one must be indistinguishable from.
        const { pariwarId: empty } = await seedDrives(t, []);

        __resetDirectoryAbuseCounters();
        const pulledRes = await t.app.inject({ method: 'GET', url: ROUTE(pulled) });
        __resetDirectoryAbuseCounters();
        const emptyRes = await t.app.inject({ method: 'GET', url: ROUTE(empty) });

        // ⭐ Same status, same body, byte for byte. A differently-shaped response would ITSELF be a
        // new oracle — which is precisely what the kill switch exists to avoid creating.
        expect(pulledRes.statusCode).toBe(200);
        expect(emptyRes.statusCode).toBe(200);
        expect(pulledRes.body).toBe(emptyRes.body);
        expect(pulledRes.json()).toEqual({
          items: [],
          page: 1,
          limit: pool.SAHYOG_DRIVE_PAGE_SIZE_DEFAULT,
          total: 0,
        });
        // ⛔ And nothing about the suppressed drive may leak — not the name, not the reason.
        expect(pulledRes.body).not.toContain('Rajesh');
      } finally {
        await teardown(t);
      }
    });
  });

  describe('the listing predicate + the anti-enumeration bounds', () => {
    it('⛔ EXCLUDES a `live` pool — a drive still collecting is not a transparency record', async () => {
      const t = await createTestApp();
      try {
        const { pariwarId } = await seedDrives(t, [
          { legalName: 'Closed Drive', poolState: 'closed', consented: true },
          { legalName: 'Live Drive', poolState: 'live', consented: true },
        ]);
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId) });
        const body = res.json() as { items: Array<Record<string, unknown>>; total: number };
        expect(body.total).toBe(1);
        expect(body.items[0]?.['deceasedMemberName']).toBe('Closed Drive');
        expect(res.body).not.toContain('Live Drive');
      } finally {
        await teardown(t);
      }
    });

    it('maps `settled` to the PUBLIC token `archive` — ⛔ the internal word never crosses', async () => {
      const t = await createTestApp();
      try {
        const { pariwarId } = await seedDrives(t, [
          { legalName: 'Settled Drive', poolState: 'settled', consented: true },
        ]);
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId) });
        expect(
          (res.json() as { items: Array<Record<string, unknown>> }).items[0]?.['status'],
        ).toBe('archive');
        // ⛔ The internal lifecycle VOCABULARY must not appear as a VALUE anywhere on the wire.
        // ⚠ Asserted over the parsed values, ⛔ not as a raw-body substring: `closedAt` is a
        // legitimate FIELD NAME containing "closed", so a substring check here fails on a
        // correctly-behaving response. The rule is about the internal tokens crossing as DATA.
        const values = Object.values(
          (res.json() as { items: Array<Record<string, unknown>> }).items[0] ?? {},
        );
        for (const internal of ['spawned', 'live', 'closed', 'settled']) {
          expect(values).not.toContain(internal);
        }
      } finally {
        await teardown(t);
      }
    });

    it('REFUSES an over-cap limit — ⛔ no silent clamp', async () => {
      const t = await createTestApp();
      try {
        const { pariwarId } = await seedDrives(t, []);
        const res = await t.app.inject({ method: 'GET', url: `${ROUTE(pariwarId)}?limit=5000` });
        expect(res.statusCode).toBe(400);
      } finally {
        await teardown(t);
      }
    });

    it('REFUSES a page past the deep-pagination HORIZON', async () => {
      const t = await createTestApp();
      try {
        const { pariwarId } = await seedDrives(t, []);
        // ⭐ The horizon comes from the MODULE, ⛔ never a second hardcoded literal — the 11a.2
        // defect (a comment naming a constant while the test compared a literal) reproduced.
        const ok = await t.app.inject({
          method: 'GET',
          url: `${ROUTE(pariwarId)}?page=${String(PUBLIC_DIRECTORY_PAGE_HORIZON)}`,
        });
        expect(ok.statusCode).toBe(200);
        __resetDirectoryAbuseCounters();
        const past = await t.app.inject({
          method: 'GET',
          url: `${ROUTE(pariwarId)}?page=${String(PUBLIC_DIRECTORY_PAGE_HORIZON + 1)}`,
        });
        expect(past.statusCode).toBe(400);
      } finally {
        await teardown(t);
      }
    });

    it('⛔ REFUSES `?format=csv` — an unknown parameter is a 400, ⛔ not an ignored no-op', async () => {
      const t = await createTestApp();
      try {
        const { pariwarId } = await seedDrives(t, []);
        // FR-91 forbids bulk export from the public side. `.strict()` is what makes this a REFUSAL
        // rather than a silent success that quietly serves the default page.
        const csv = await t.app.inject({ method: 'GET', url: `${ROUTE(pariwarId)}?format=csv` });
        expect(csv.statusCode).toBe(400);
        __resetDirectoryAbuseCounters();
        const all = await t.app.inject({ method: 'GET', url: `${ROUTE(pariwarId)}?all=1` });
        expect(all.statusCode).toBe(400);
      } finally {
        await teardown(t);
      }
    });

    it('⛔⛔ REFUSES `?name=…` — there is NO name search, and the workaround is an attack', async () => {
      const t = await createTestApp();
      try {
        const { pariwarId } = await seedDrives(t, [
          { legalName: 'Rajesh Kumar Sharma', consented: true },
        ]);
        // ⭐ NOT a "feature not implemented yet" 200-with-everything. `member_kyc_profiles` has no
        // blind index and envelope encryption gives every name its own DEK, so the only way to
        // answer this is to decrypt the whole roster per request — the exact amplification
        // `DIRECTORY_DECRYPT_CONCURRENCY` exists to close. The refusal is the design (D2(a)).
        const res = await t.app.inject({
          method: 'GET',
          url: `${ROUTE(pariwarId)}?name=Rajesh`,
        });
        expect(res.statusCode).toBe(400);
      } finally {
        await teardown(t);
      }
    });

    it('filters by district and by pool code, EXACTLY — ⛔ never by prefix', async () => {
      const t = await createTestApp();
      try {
        const code = 'P-2026-08-EXACT1';
        const { pariwarId } = await seedDrives(t, [
          { legalName: 'A', district: 'Lucknow', canonicalIdentifier: code, consented: true },
          { legalName: 'B', district: 'Kanpur', consented: true },
        ]);

        const byDistrict = await t.app.inject({
          method: 'GET',
          url: `${ROUTE(pariwarId)}?district=Lucknow`,
        });
        expect((byDistrict.json() as { total: number }).total).toBe(1);

        __resetDirectoryAbuseCounters();
        const byCode = await t.app.inject({
          method: 'GET',
          url: `${ROUTE(pariwarId)}?poolCode=${code}`,
        });
        expect((byCode.json() as { total: number }).total).toBe(1);

        __resetDirectoryAbuseCounters();
        // ⛔ A prefix filter over a public index is an enumeration primitive wearing a search box.
        const byPrefix = await t.app.inject({
          method: 'GET',
          url: `${ROUTE(pariwarId)}?poolCode=P-2026`,
        });
        expect((byPrefix.json() as { total: number }).total).toBe(0);
      } finally {
        await teardown(t);
      }
    });

    it('stamps `X-Robots-Tag: noindex` — ⚠ VERIFIED from the existing global hook, ⛔ not rebuilt', async () => {
      const t = await createTestApp();
      try {
        const { pariwarId } = await seedDrives(t, []);
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId) });
        expect(String(res.headers['x-robots-tag'])).toContain('noindex');
      } finally {
        await teardown(t);
      }
    });
  });
});
