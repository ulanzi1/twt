// The PUBLIC Sahyog Drive route — live-DB integration (Story 11b.1, Task 2 + Task 7; AC2, AC8, AC9).
//
// Drives `GET /api/v1/p/:pariwarId/public-pages/sahyog-drive` through `app.inject` against real
// Postgres, with REAL Tier-1 encrypted names so the decrypt runs for real — ⛔ not a pre-decrypted
// fixture: the decrypt IS the thing under test here, and a fake would prove nothing about it.
//
// Families:
//   · the response shape — ⛔ NOTHING on the wire but the classified fields.
//   · ⭐ the publication-basis gate: it decides whether a row is NAMED, ⛔ never whether it EXISTS.
//   · the kill switch: a pulled Pariwar is INDISTINGUISHABLE from an empty one.
//   · the anti-enumeration bounds — over-cap limit, over-horizon page, unknown parameter.
//   · the name FORM is mode-resolved (D10 + `-136` cl.1), ⛔ never hard-coded.

import { randomUUID } from 'node:crypto';

import { PublicSahyogDriveResponse } from '@twt/contracts';
import { encryption, ids, kyc, member as memberDomain, pool, schema } from '@twt/domain';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { PUBLIC_DIRECTORY_PAGE_HORIZON } from '../../../src/modules/public-pages/handlers.js';
import { __resetDirectoryAbuseCounters } from '../../../src/modules/public-pages/index.js';
import { createTestApp, hasDatabase, teardown, type TestApp } from '../_setup.js';

const ROUTE = (pariwarId: string): string => `/api/v1/p/${pariwarId}/public-pages/sahyog-drive`;

// ⭐⭐ MIGRATED BY STORY 11b.9 — the fixtures now seed the basis the surface ACTUALLY reads.
// 11b.1 made a name render by inserting a `sahyog_drive_publication` consent row (the family's
// claim-time tick-box). `2026-08-28-160` cl.3-5 DE-AUTHORISED that: the authority is the DECEASED
// MEMBER'S OWN valid `tc_acceptance` whose accepted T&C version PINS the post-death publication
// clause. ⇒ these fixtures seed a T&C version + the clause + the pin + the acceptance.
// ⛔ NO TEST HERE HARDCODES THE CLAUSE-ID LITERAL — it comes from
// `pool.SAHYOG_DRIVE_PUBLICATION_CLAUSE_ID`, so counsel's final value (story D3) is a one-line
// change in the domain and ⛔ zero changes here.

interface SeedDriveSpec {
  legalName: string;
  district?: string;
  poolState?: 'closed' | 'settled' | 'live';
  /** Give the deceased member the full publication basis (acceptance + pinned clause). */
  authorised?: boolean;
  /** Seed the acceptance as granted-then-REVOKED (which must read exactly like never-granted). */
  revoked?: boolean;
  /**
   * ⛔ Seed the RETIRED `sahyog_drive_publication` consent, granted and valid — and ⛔ nothing else.
   * ⭐ The de-authorisation proof: this must name NOTHING on its own (story D2).
   */
  retiredConsentOnly?: boolean;
  canonicalIdentifier?: string;
  /** Story 11b.10 — pin the drive's PUBLIC ADDRESS token (default: a fresh unique one). */
  publicToken?: string;
}

/** Seed a Pariwar with drives, each with a real encrypted deceased-member name. */
async function seedDrives(
  t: TestApp,
  drives: SeedDriveSpec[],
): Promise<{ pariwarId: string; poolIds: string[] }> {
  const pariwarId = randomUUID();
  const scopeTx = await openScopeTx(t.deps, pariwarId);
  const poolIds: string[] = [];
  /** The Pariwar's single effective, clause-pinning T&C version — minted on first need. */
  let pinnedTcVersionId: string | null = null;
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
          // ⚠ BACK-DATED at Story 11b.3, ⛔ and this is not cosmetic. `DECEASED_DISTRICT` is FROZEN
          // AS OF THE DRIVE'S CLOSE INSTANT ("the Archive section is a permanent record", the
          // 2026-08-26 review finding), so a posting created AFTER the close is correctly EXCLUDED.
          // Once the fixture began seeding a real close event (see above), a `now()` posting fell on
          // the wrong side of that boundary and every district assertion went null.
          // ⭐ The freeze is the PRODUCT behaviour working; the fixture is what was wrong.
          `INSERT INTO member_postings (posting_id, member_id, pariwar_id, district, is_retirement, created_at)
           VALUES ($1, $2, $3, $4, false, now() - interval '10 days')`,
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
        // ⚠ `public_token` (Story 11b.10) is NOT NULL with a GLOBAL unique index. The seed derives
        // it from a fresh UUID purely for suite-wide collision-freedom; ⛔ the PRODUCTION mint is
        // CSPRNG-random and is ⛔ never derived from any pool fact (D2).
        `INSERT INTO pools (pool_id, pariwar_id, cycle_id, claim_case_id, pool_index,
                            pool_canonical_identifier, support_category, benefit_mechanism,
                            fixed_amount, current_state, state_event_version, public_token)
         VALUES ($1, $2, $3, $4, $5, $6, 'death_support', 'pool', 100, $7, 1, $8)`,
        [
          poolId,
          pariwarId,
          randomUUID(),
          claimCaseId,
          poolIds.length,
          d.canonicalIdentifier ?? `P-2026-08-${randomUUID().slice(0, 6)}`,
          d.poolState ?? 'closed',
          d.publicToken ?? `tok-${randomUUID()}`,
        ],
      );
      await scopeTx.client.query("SET LOCAL app.pool_state_writer = 'off'");

      // ⭐⭐ THE CLOSE/SETTLE EVENT — ADDED AT STORY 11b.3, AND ITS ABSENCE WAS A REAL DEFECT.
      // ⚠⛔ These fixtures previously seeded pools with ⛔ NO `pool.closed` / `pool.settled` event at
      // all, so `driveClosedAt` was `null` on EVERY row and the handler's
      // `row.driveClosedAt.toISOString()` branch was ⛔ NEVER EXECUTED. ⇒ the suite was green over a
      // branch it could not reach, while `GET /sahyog` returned **HTTP 500 for every real closed
      // drive in production** — the raw `sql` fragment hands back an ISO STRING, not the `Date` its
      // declared type claims (`pool/public-read.ts` `coerceDriveInstant`).
      // ⛔ Do NOT remove this insert to "simplify a fixture": it is what makes the whole suite
      // exercise the shipped code path rather than a null-only sub-path of it.
      const closeEventType = (d.poolState ?? 'closed') === 'settled' ? 'pool.settled' : 'pool.closed';
      if ((d.poolState ?? 'closed') !== 'live') {
        await scopeTx.client.query(
          `INSERT INTO events_log (stream_id, event_type, payload, event_version, pariwar_id, occurred_at)
           VALUES ($1, $2, '{}'::jsonb, 1, $3, now() - interval '2 days')`,
          [poolId, closeEventType, pariwarId],
        );
      }

      if (d.authorised === true || d.revoked === true) {
        // ⭐ ONE effective T&C version PER PARIWAR, minted lazily — ⛔ not one per member.
        // `terms_and_conditions_versions_pariwar_current_uq` is a PARTIAL UNIQUE index allowing at
        // most ONE open-ended (currently-in-force) version per Pariwar, so a per-member version
        // would 23505 the moment two members in one Pariwar were authorised. ⚠ It is also what
        // production looks like: a Pariwar has one effective T&C and MANY members accept it.
        // ⇒ what varies per member is the ACCEPTANCE row, which is exactly where the basis lives.
        if (pinnedTcVersionId === null) {
          pinnedTcVersionId = randomUUID();
          const clauseVersionId = randomUUID();
          await scopeTx.client.query(
            `INSERT INTO terms_and_conditions_versions
               (tc_version_id, pariwar_id, version, body_markdown, body_html_rendered,
                effective_from, legal_review_status)
             VALUES ($1, $2, 1, '# Terms', '<h1>Terms</h1>', now() - interval '1 day', 'approved')`,
            [pinnedTcVersionId, pariwarId],
          );
          await scopeTx.client.query(
            `INSERT INTO clause_versions
               (clause_version_id, clause_id, pariwar_id, version, effective_date, payload,
                benefit_mechanism)
             VALUES ($1, $2, $3, 1, now() - interval '1 day', '{}'::jsonb, 'pool')`,
            [clauseVersionId, pool.SAHYOG_DRIVE_PUBLICATION_CLAUSE_ID, pariwarId],
          );
          await scopeTx.client.query(
            `INSERT INTO terms_and_conditions_pinned_clauses
               (tc_version_id, clause_version_id, pariwar_id)
             VALUES ($1, $2, $3)`,
            [pinnedTcVersionId, clauseVersionId, pariwarId],
          );
        }
        // The acceptance, exactly as `member-terms.handlers.ts` writes it: the SERVER-resolved
        // `tc_version_id` goes in `consent_artifact_ref`. ⛔ If that writer ever stores anything
        // else there, the predicate returns false for every member — silently.
        await scopeTx.client.query(
          `INSERT INTO consent_records (pariwar_id, subject_id, consent_type, consent_artifact_ref,
                                        granted_via_actor, consent_payload, granted_at, revoked_at)
           VALUES ($1, $2, 'tc_acceptance', $3, 'member_self', '{}'::jsonb,
                   now() - interval '1 day', $4)`,
          [pariwarId, memberId, pinnedTcVersionId, d.revoked === true ? new Date() : null],
        );
      }

      if (d.retiredConsentOnly === true) {
        // ⛔ The 11b.1 gate, granted and valid — and DE-AUTHORISED. It must name nothing.
        await scopeTx.client.query(
          `INSERT INTO consent_records (pariwar_id, subject_id, consent_type, granted_via_actor,
                                        consent_payload, granted_at, revoked_at)
           VALUES ($1, $2, 'sahyog_drive_publication', 'member_self', '{}'::jsonb,
                   now() - interval '1 day', NULL)`,
          [pariwarId, memberId],
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
        { legalName: 'Rajesh Kumar Sharma', district: 'Lucknow', authorised: true },
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
        // ⭐ Story 11b.10 (AC3) — the drive's OPAQUE PUBLIC ADDRESS. On the wire because the index's
        // per-row link is built from it and from ⛔ nothing else; `poolCanonicalIdentifier` above is
        // RETAINED and RENDERED but ⛔ no longer addressable.
        // ⛔ It is ⛔ NOT an internal identifier: ⛔ not `pools.pool_id`, ⛔ not a member, claim or
        // cycle id, and ⛔ not derived from any of them (D2) — the raw-body assertions below still
        // hold unchanged.
        'publicToken',
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

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // ⭐⭐ REGRESSION — Story 11b.3. `GET /sahyog` RETURNED **HTTP 500** FOR EVERY REAL CLOSED DRIVE.
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // ⚠⛔ A LIVE, USER-VISIBLE DEFECT ON A PUBLIC TRANSPARENCY SURFACE, and it shipped GREEN.
  // `pool/public-read.ts`'s `DRIVE_CLOSED_AT` is a RAW `sql` fragment, ⛔ not a mapped Drizzle
  // column, so its declared `sql<Date | null>` is a CLAIM the runtime does not honour: the value
  // arrives as an ISO **STRING**. This handler then calls `row.driveClosedAt.toISOString()` ⇒
  // `TypeError: … is not a function` ⇒ 500, for ANY Pariwar whose pools carry a real `pool.closed`
  // or `pool.settled` event — i.e. every closed drive in production.
  //
  // ⛔⛔ WHY NOTHING CAUGHT IT: this spec's own fixtures seeded pools but ⛔ NEVER a close/settle
  // EVENT, so `driveClosedAt` was `null` on every row and the `.toISOString()` branch was ⛔ never
  // executed. ⭐ The suite was green over a branch it could not reach — the vacuous-leg defect,
  // arriving in a SPEC rather than in a gate. The fixture now seeds the event, so the whole file
  // exercises the shipped path; this case names the property so it cannot be lost in a refactor.
  //
  // ⭐ FIXED AT THE SOURCE (`coerceDriveInstant`), ⛔ not per call site — the fragment is shared with
  // the Sahyog Vivran read, which would otherwise have inherited the identical break.
  it('⭐⭐ REGRESSION — a drive with a REAL close event serves 200 with a valid ISO `closedAt`', async () => {
    const t = await createTestApp();
    try {
      const { pariwarId } = await seedDrives(t, [
        { legalName: 'Rajesh Kumar Sharma', district: 'Lucknow', authorised: true },
      ]);
      const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId) });
      // ⛔ 200, ⛔ not 500. This single assertion is the whole regression.
      expect(res.statusCode).toBe(200);
      const body = res.json() as { items: Array<Record<string, unknown>> };
      const closedAt = body.items[0]?.['closedAt'];
      expect(typeof closedAt).toBe('string');
      // ⭐ A REAL instant, ⛔ not `null` and ⛔ not an `Invalid Date` serialised through.
      expect(Number.isNaN(new Date(String(closedAt)).getTime())).toBe(false);
      expect(() => PublicSahyogDriveResponse.parse(res.json())).not.toThrow();
    } finally {
      await teardown(t);
    }
  });

  describe('⭐ the publication basis decides whether a row is NAMED, ⛔ never whether it EXISTS', () => {
    it('an AUTHORISED drive carries the deceased member’s FULL NAME (D10)', async () => {
      const t = await createTestApp();
      try {
        const { pariwarId } = await seedDrives(t, [
          { legalName: 'Rajesh Kumar Sharma', district: 'Lucknow', authorised: true },
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

    it('⭐ a drive with NO BASIS STILL RENDERS, with the NAME null and everything else intact', async () => {
      const t = await createTestApp();
      try {
        const { pariwarId } = await seedDrives(t, [
          { legalName: 'Sunita Devi', district: 'Kanpur', authorised: false },
        ]);
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId) });
        const body = res.json() as { items: Array<Record<string, unknown>>; total: number };

        // ⭐ THE WHOLE OF AC5: an absent basis removes a NAME, ⛔ never a DRIVE from the record.
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

    it('a REVOKED acceptance reads EXACTLY like a missing one — same wire value, row still present', async () => {
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

    it('⛔⛔ THE DE-AUTHORISATION, PROVED ON THE WIRE: a granted `sahyog_drive_publication` names NOTHING', async () => {
      const t = await createTestApp();
      try {
        // ⭐ This fixture is EXACTLY what made a name render under Story 11b.1 — a valid, granted,
        // un-revoked family tick-box. `2026-08-28-160` cl.5 retired it as the authority, and the
        // predicate simply does ⛔ NOT CONSULT it: ⛔ not ANDed, ⛔ not ORed (story D2).
        // ⚠ The row and its consent type are PRESERVED by the same clause — which is precisely why
        // this case must keep being asserted rather than deleted along with the gate.
        const { pariwarId } = await seedDrives(t, [
          { legalName: 'Kamla Devi', district: 'Patna', retiredConsentOnly: true },
        ]);
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId) });
        const body = res.json() as { items: Array<Record<string, unknown>>; total: number };

        // ⭐ ROW PRESENT, NAME ABSENT — asserted positively, ⛔ not merely "the call succeeded".
        expect(body.total).toBe(1);
        expect(body.items).toHaveLength(1);
        expect(body.items[0]?.['district']).toBe('Patna');
        expect(body.items[0]?.['deceasedMemberName']).toBeNull();
        expect(res.body).not.toContain('Kamla');
      } finally {
        await teardown(t);
      }
    });

    it('⛔ the Tier-1 DECRYPT is NOT CALLED when the basis is false (AC6 — zero KMS calls)', async () => {
      const t = await createTestApp();
      try {
        // ⭐⛔ THE HALF THAT MATTERS IS ⛔ NOT THE WASTED ROUND-TRIP — it is that an unauthenticated
        // route must ⛔ never decrypt a name it has no authorising basis to read. Asserted by
        // counting real calls into the KMS-backed decrypt, ⛔ not by inspecting the response.
        const decryptSpy = vi.spyOn(encryption, 'decryptKycField');
        const { pariwarId } = await seedDrives(t, [
          { legalName: 'No Basis', district: 'Kanpur', authorised: false },
          { legalName: 'Retired Only', district: 'Patna', retiredConsentOnly: true },
          { legalName: 'Revoked One', district: 'Agra', revoked: true },
        ]);
        decryptSpy.mockClear();

        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId) });
        const body = res.json() as { items: Array<Record<string, unknown>>; total: number };

        expect(body.total).toBe(3);
        expect(decryptSpy).not.toHaveBeenCalled();
        expect(body.items.every((i) => i['deceasedMemberName'] === null)).toBe(true);
        decryptSpy.mockRestore();
      } finally {
        await teardown(t);
      }
    });

    it('⭐ the index degrades PER-POOL, ⛔ never per-page — a mixed page renders BOTH rows', async () => {
      const t = await createTestApp();
      try {
        const { pariwarId } = await seedDrives(t, [
          { legalName: 'Named Member', district: 'Lucknow', authorised: true },
          { legalName: 'Unnamed Member', district: 'Kanpur', authorised: false },
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
          { legalName: 'Rajesh Kumar Sharma', district: 'Lucknow', authorised: true },
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
          { legalName: 'Sushil', district: 'Jaipur', authorised: true },
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
          { legalName: 'Rajesh Kumar Sharma', district: 'Lucknow', authorised: true },
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
          { legalName: 'Closed Drive', poolState: 'closed', authorised: true },
          { legalName: 'Live Drive', poolState: 'live', authorised: true },
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
          { legalName: 'Settled Drive', poolState: 'settled', authorised: true },
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
          { legalName: 'Rajesh Kumar Sharma', authorised: true },
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
          { legalName: 'A', district: 'Lucknow', canonicalIdentifier: code, authorised: true },
          { legalName: 'B', district: 'Kanpur', authorised: true },
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
