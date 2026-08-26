// The PUBLIC Sahyog Drive pool index — live-DB integration (Story 11b.1, Task 7). twt-test-pg on :5433.
//
// ⭐ WHY THIS SUITE HAS TO BE LIVE-DB RATHER THAN DB-FREE: every load-bearing property of
// `pool/public-read.ts` lives in SQL that typecheck and lint cannot see. The reversal
// compensation, the consent validity window, the correlated qualifiers
// ([[project_epic6_drizzle_correlated_subquery_bug]] — where an interpolated outer Column
// collapses a correlation into an always-true tautology while every DB-free test stays green),
// and the ordering that makes offset paging stable are all invisible above the driver.
//
// ⚠ Seeds run BEFORE `enterAppScope` (Docker superuser, RLS bypassed) so both tenants' rows land;
// afterEach ROLLBACK reverts them. ⛔ Never regenerate an applied migration; ⛔ never DROP SCHEMA.
// ⚠ `PARIWAR_A` is SHARED with other suites, so these assert MEMBERSHIP, ⛔ never exact counts
// ([[project_live_db_test_gotchas]]) — except where the query is filtered to ids this test minted.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { ids, pool as poolDomain, schema } from '../../../src/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import {
  PARIWAR_A,
  PARIWAR_B,
  enterAppScope,
  seedClaim,
  seedConsentRecord,
  seedEvent,
  seedMember,
  seedMemberPosting,
  seedPool,
} from '../_helpers.js';
import type { Db } from '../../../src/db.js';

const CONFIRMED = 'contribution.confirmed';
const REVERSED = 'reconciliation.confirmation-reversed';

/** Seed a deceased member + their claim + a pool for that claim. Returns the ids the test needs. */
async function seedDrive(
  tx: Db,
  pariwarId: string,
  opts: {
    currentState?: schema.PoolLifecycleState;
    district?: string;
    canonicalIdentifier?: string;
    fixedAmount?: number;
    withKyc?: boolean;
    closedAt?: Date;
  } = {},
): Promise<{ poolId: string; claimCaseId: string; deceasedMemberId: string }> {
  const deceasedMemberId = await seedMember(tx, pariwarId);
  const claimCaseId = await seedClaim(tx, pariwarId, { deceasedMemberId });
  const poolId = await seedPool(tx, pariwarId, {
    claimCaseId,
    currentState: opts.currentState ?? 'closed',
    fixedAmount: opts.fixedAmount ?? 100,
    poolCanonicalIdentifier: opts.canonicalIdentifier ?? `P-2026-08-${randomUUID().slice(0, 3)}`,
  });
  if (opts.district !== undefined) {
    await seedMemberPosting(tx, pariwarId, deceasedMemberId, opts.district);
  }
  if (opts.withKyc !== false) {
    await tx.insert(schema.memberKycProfiles).values({
      memberId: ids.memberId(deceasedMemberId),
      pariwarId: ids.pariwarId(pariwarId),
      nameCiphertext: `enc:v1:ciphertext-for-${deceasedMemberId}`,
      dobCiphertext: 'enc:v1:dob',
      verificationStrength: 'self_declared',
      source: 'manual',
    });
  }
  if (opts.closedAt !== undefined) {
    await seedEvent(tx, pariwarId, {
      streamId: poolId,
      eventType: opts.currentState === 'settled' ? 'pool.settled' : 'pool.closed',
      eventVersion: 3,
      occurredAt: opts.closedAt,
      payload: {},
    });
  }
  return { poolId, claimCaseId, deceasedMemberId };
}

/**
 * Seed one confirmed contribution against a pool, with an EXPLICIT event id.
 *
 * ⚠ `seedEvent` returns the STREAM id, not the event id, and the reversal compensation keys on
 * `event_id` — so the id is minted here and inserted directly rather than read back. A test that
 * cannot name the confirmation it wants reversed cannot prove the compensation at all.
 */
async function seedConfirmed(
  tx: Db,
  pariwarId: string,
  poolId: string,
  occurredAt: Date,
): Promise<string> {
  const eventId = randomUUID();
  await tx.insert(schema.eventsLog).values({
    eventId,
    streamId: randomUUID(),
    eventType: CONFIRMED,
    eventVersion: 1,
    payload: { poolId, memberId: randomUUID() },
    actorId: null,
    pariwarId,
    occurredAt,
  });
  return eventId;
}

describe.skipIf(!hasDatabase)('Sahyog Drive public pool index (Story 11b.1)', () => {
  setupLiveDb();

  describe('the listing predicate — which drives appear at all', () => {
    it('lists a `closed` pool as ACTIVE and a `settled` pool as ARCHIVE', async () => {
      const { client, tx } = getTx();
      const active = await seedDrive(tx, PARIWAR_A, { currentState: 'closed' });
      const archived = await seedDrive(tx, PARIWAR_A, { currentState: 'settled' });

      await enterAppScope(client, PARIWAR_A);
      const rows = await poolDomain.listPublicSahyogDrivePools(tx, ids.pariwarId(PARIWAR_A), {
        limit: 50,
      });

      const byId = new Map(rows.map((r) => [r.poolId as string, r]));
      expect(byId.get(active.poolId)?.status).toBe('active');
      expect(byId.get(archived.poolId)?.status).toBe('archive');
    });

    it('⛔ EXCLUDES a `spawned` and a `live` pool — a drive still collecting is not a record', async () => {
      const { client, tx } = getTx();
      const spawned = await seedDrive(tx, PARIWAR_A, { currentState: 'spawned' });
      const live = await seedDrive(tx, PARIWAR_A, { currentState: 'live' });
      const closed = await seedDrive(tx, PARIWAR_A, { currentState: 'closed' });

      await enterAppScope(client, PARIWAR_A);
      const ids_ = (
        await poolDomain.listPublicSahyogDrivePools(tx, ids.pariwarId(PARIWAR_A), { limit: 50 })
      ).map((r) => r.poolId as string);

      expect(ids_).toContain(closed.poolId);
      expect(ids_).not.toContain(spawned.poolId);
      expect(ids_).not.toContain(live.poolId);
    });

    it('⛔ EXCLUDES another tenant’s drive (RLS + the explicit pariwar_id predicate)', async () => {
      const { client, tx } = getTx();
      const mine = await seedDrive(tx, PARIWAR_A, {});
      const theirs = await seedDrive(tx, PARIWAR_B, {});

      await enterAppScope(client, PARIWAR_A);
      const ids_ = (
        await poolDomain.listPublicSahyogDrivePools(tx, ids.pariwarId(PARIWAR_A), { limit: 50 })
      ).map((r) => r.poolId as string);

      expect(ids_).toContain(mine.poolId);
      expect(ids_).not.toContain(theirs.poolId);
    });
  });

  describe('the confirmed-contribution count — canonical financial truth only', () => {
    it('counts `contribution.confirmed` and ⛔ NOTHING else', async () => {
      const { client, tx } = getTx();
      const now = new Date();
      const past = new Date(now.getTime() - 60_000);
      const drive = await seedDrive(tx, PARIWAR_A, {});
      await seedConfirmed(tx, PARIWAR_A, drive.poolId, past);
      await seedConfirmed(tx, PARIWAR_A, drive.poolId, past);
      // ⚠ A yellow/attested event against the SAME pool must not be counted (Story 9.5).
      await seedEvent(tx, PARIWAR_A, {
        streamId: randomUUID(),
        eventType: 'contribution.utr-attested',
        eventVersion: 1,
        occurredAt: past,
        payload: { poolId: drive.poolId, memberId: randomUUID() },
      });

      await enterAppScope(client, PARIWAR_A);
      const rows = await poolDomain.listPublicSahyogDrivePools(tx, ids.pariwarId(PARIWAR_A), {
        limit: 50,
        now,
      });

      expect(rows.find((r) => r.poolId === drive.poolId)?.confirmedContributionCount).toBe(2);
    });

    it('⭐ APPLIES the reversal compensation — a reversed confirmation stops counting', async () => {
      const { client, tx } = getTx();
      const now = new Date();
      const past = new Date(now.getTime() - 60_000);
      const drive = await seedDrive(tx, PARIWAR_A, {});
      const keptId = await seedConfirmed(tx, PARIWAR_A, drive.poolId, past);
      const reversedId = await seedConfirmed(
        tx,
        PARIWAR_A,
        drive.poolId,
        new Date(past.getTime() + 1),
      );
      expect(keptId).not.toBe(reversedId);

      await seedEvent(tx, PARIWAR_A, {
        streamId: randomUUID(),
        eventType: REVERSED,
        eventVersion: 1,
        occurredAt: new Date(past.getTime() + 2),
        payload: { poolId: drive.poolId, reversedConfirmedEventId: reversedId },
      });

      await enterAppScope(client, PARIWAR_A);
      const rows = await poolDomain.listPublicSahyogDrivePools(tx, ids.pariwarId(PARIWAR_A), {
        limit: 50,
        now,
      });

      // Two confirmations, one walked back ⇒ ONE. ⛔ Not two, and ⛔ not zero: a reversal names
      // exactly one confirmation and must not take the others down with it.
      expect(rows.find((r) => r.poolId === drive.poolId)?.confirmedContributionCount).toBe(1);
    });

    it("⛔ a reversal naming ANOTHER pool’s confirmation does not reduce this pool’s count", async () => {
      const { client, tx } = getTx();
      const now = new Date();
      const past = new Date(now.getTime() - 60_000);
      const mine = await seedDrive(tx, PARIWAR_A, {});
      const other = await seedDrive(tx, PARIWAR_A, {});
      await seedConfirmed(tx, PARIWAR_A, mine.poolId, past);
      const otherConfirmedId = await seedConfirmed(tx, PARIWAR_A, other.poolId, past);
      await seedEvent(tx, PARIWAR_A, {
        streamId: randomUUID(),
        eventType: REVERSED,
        eventVersion: 1,
        occurredAt: new Date(past.getTime() + 2),
        payload: { poolId: other.poolId, reversedConfirmedEventId: otherConfirmedId },
      });

      await enterAppScope(client, PARIWAR_A);
      const rows = await poolDomain.listPublicSahyogDrivePools(tx, ids.pariwarId(PARIWAR_A), {
        limit: 50,
        now,
      });

      expect(rows.find((r) => r.poolId === mine.poolId)?.confirmedContributionCount).toBe(1);
      expect(rows.find((r) => r.poolId === other.poolId)?.confirmedContributionCount).toBe(0);
    });

    // ⭐ THE CONTROL THAT CATCHES THE CORRELATED-SUBQUERY TAUTOLOGY. If the per-pool correlation
    // collapsed, every row would report EVERY pool's confirmations. Two drives with different
    // counts is the cheapest shape that makes that failure visible.
    it("⭐ each drive counts ONLY its OWN confirmations (a collapsed correlation would fail here)", async () => {
      const { client, tx } = getTx();
      const now = new Date();
      const past = new Date(now.getTime() - 60_000);
      const one = await seedDrive(tx, PARIWAR_A, {});
      const three = await seedDrive(tx, PARIWAR_A, {});
      await seedConfirmed(tx, PARIWAR_A, one.poolId, past);
      for (let i = 0; i < 3; i += 1) {
        await seedConfirmed(tx, PARIWAR_A, three.poolId, new Date(past.getTime() + i));
      }

      await enterAppScope(client, PARIWAR_A);
      const rows = await poolDomain.listPublicSahyogDrivePools(tx, ids.pariwarId(PARIWAR_A), {
        limit: 50,
        now,
      });

      expect(rows.find((r) => r.poolId === one.poolId)?.confirmedContributionCount).toBe(1);
      expect(rows.find((r) => r.poolId === three.poolId)?.confirmedContributionCount).toBe(3);
    });
  });

  describe('the consent verdict — it gates the NAME, ⛔ never the ROW', () => {
    it('⭐ an UNCONSENTED drive STILL APPEARS, with its consent verdict false', async () => {
      const { client, tx } = getTx();
      const drive = await seedDrive(tx, PARIWAR_A, { district: 'Jaipur' });

      await enterAppScope(client, PARIWAR_A);
      const row = (
        await poolDomain.listPublicSahyogDrivePools(tx, ids.pariwarId(PARIWAR_A), { limit: 50 })
      ).find((r) => r.poolId === drive.poolId);

      // The row exists in full — this is the whole of AC2's "degrades per-pool, never per-page".
      expect(row).toBeDefined();
      expect(row?.nameConsentGranted).toBe(false);
      expect(row?.district).toBe('Jaipur');
      expect(row?.poolCanonicalIdentifier).toBeTruthy();
    });

    it('a granted `sahyog_drive_publication` consent for the DECEASED member yields true', async () => {
      const { client, tx } = getTx();
      const drive = await seedDrive(tx, PARIWAR_A, {});
      await seedConsentRecord(tx, PARIWAR_A, {
        subjectId: drive.deceasedMemberId,
        consentType: 'sahyog_drive_publication',
        grantedAt: new Date(Date.now() - 60_000),
      });

      await enterAppScope(client, PARIWAR_A);
      const row = (
        await poolDomain.listPublicSahyogDrivePools(tx, ids.pariwarId(PARIWAR_A), { limit: 50 })
      ).find((r) => r.poolId === drive.poolId);

      expect(row?.nameConsentGranted).toBe(true);
    });

    it('⭐ a REVOKED consent reads exactly like a MISSING one — same verdict, row still present', async () => {
      const { client, tx } = getTx();
      const drive = await seedDrive(tx, PARIWAR_A, {});
      await seedConsentRecord(tx, PARIWAR_A, {
        subjectId: drive.deceasedMemberId,
        consentType: 'sahyog_drive_publication',
        grantedAt: new Date(Date.now() - 120_000),
        revokedAt: new Date(Date.now() - 60_000),
      });

      await enterAppScope(client, PARIWAR_A);
      const row = (
        await poolDomain.listPublicSahyogDrivePools(tx, ids.pariwarId(PARIWAR_A), { limit: 50 })
      ).find((r) => r.poolId === drive.poolId);

      expect(row).toBeDefined(); // ⛔ revocation removes a NAME, never a DRIVE
      expect(row?.nameConsentGranted).toBe(false);
    });

    it('⛔ a DIFFERENT publication consent does NOT authorise this surface', async () => {
      const { client, tx } = getTx();
      const drive = await seedDrive(tx, PARIWAR_A, {});
      // The family consented to Sahyog Vivran. That is a DIFFERENT publication, and reusing it
      // would silently widen what they agreed to (D4(c), rejected on the record).
      await seedConsentRecord(tx, PARIWAR_A, {
        subjectId: drive.deceasedMemberId,
        consentType: 'sahyog_vivran_publication',
        grantedAt: new Date(Date.now() - 60_000),
      });

      await enterAppScope(client, PARIWAR_A);
      const row = (
        await poolDomain.listPublicSahyogDrivePools(tx, ids.pariwarId(PARIWAR_A), { limit: 50 })
      ).find((r) => r.poolId === drive.poolId);

      expect(row?.nameConsentGranted).toBe(false);
    });

    it("⭐ consent is per-SUBJECT — one family's grant does not name another family's drive", async () => {
      const { client, tx } = getTx();
      const consented = await seedDrive(tx, PARIWAR_A, {});
      const notConsented = await seedDrive(tx, PARIWAR_A, {});
      await seedConsentRecord(tx, PARIWAR_A, {
        subjectId: consented.deceasedMemberId,
        consentType: 'sahyog_drive_publication',
        grantedAt: new Date(Date.now() - 60_000),
      });

      await enterAppScope(client, PARIWAR_A);
      const rows = await poolDomain.listPublicSahyogDrivePools(tx, ids.pariwarId(PARIWAR_A), {
        limit: 50,
      });

      expect(rows.find((r) => r.poolId === consented.poolId)?.nameConsentGranted).toBe(true);
      expect(rows.find((r) => r.poolId === notConsented.poolId)?.nameConsentGranted).toBe(false);
    });
  });

  describe('the name ciphertext — returned AS STORED, ⛔ never decrypted here', () => {
    it('returns `name_ciphertext` verbatim, and ⛔ nothing that looks like a name', async () => {
      const { client, tx } = getTx();
      const drive = await seedDrive(tx, PARIWAR_A, {});

      await enterAppScope(client, PARIWAR_A);
      const row = (
        await poolDomain.listPublicSahyogDrivePools(tx, ids.pariwarId(PARIWAR_A), { limit: 50 })
      ).find((r) => r.poolId === drive.poolId);

      expect(row?.deceasedNameCiphertext).toBe(`enc:v1:ciphertext-for-${drive.deceasedMemberId}`);
    });

    it('⭐ a deceased member with NO KYC profile omits the NAME and KEEPS the ROW', async () => {
      const { client, tx } = getTx();
      // ⚠ THE DELIBERATE INVERSE OF /members, where a missing profile omits the ROW. There a row
      // with no name has no purpose; here it still carries the drive.
      const drive = await seedDrive(tx, PARIWAR_A, { withKyc: false, district: 'Kota' });

      await enterAppScope(client, PARIWAR_A);
      const row = (
        await poolDomain.listPublicSahyogDrivePools(tx, ids.pariwarId(PARIWAR_A), { limit: 50 })
      ).find((r) => r.poolId === drive.poolId);

      expect(row).toBeDefined();
      expect(row?.deceasedNameCiphertext).toBeNull();
      expect(row?.district).toBe('Kota');
    });
  });

  describe('the three ruled search dimensions (D2(a)) — ⭐ all without a decrypt', () => {
    it('filters by DISTRICT', async () => {
      const { client, tx } = getTx();
      const jaipur = await seedDrive(tx, PARIWAR_A, { district: 'Jaipur' });
      const kota = await seedDrive(tx, PARIWAR_A, { district: 'Kota' });

      await enterAppScope(client, PARIWAR_A);
      const ids_ = (
        await poolDomain.listPublicSahyogDrivePools(tx, ids.pariwarId(PARIWAR_A), {
          limit: 50,
          district: 'Jaipur',
        })
      ).map((r) => r.poolId as string);

      expect(ids_).toContain(jaipur.poolId);
      expect(ids_).not.toContain(kota.poolId);
    });

    it('filters by POOL CODE, exactly — ⛔ never by prefix', async () => {
      const { client, tx } = getTx();
      const code = `P-2026-08-${randomUUID().slice(0, 6)}`;
      const target = await seedDrive(tx, PARIWAR_A, { canonicalIdentifier: code });
      const other = await seedDrive(tx, PARIWAR_A, {});

      await enterAppScope(client, PARIWAR_A);
      const exact = await poolDomain.listPublicSahyogDrivePools(tx, ids.pariwarId(PARIWAR_A), {
        limit: 50,
        poolCode: code,
      });
      expect(exact.map((r) => r.poolId as string)).toEqual([target.poolId]);
      expect(exact.map((r) => r.poolId as string)).not.toContain(other.poolId);

      // ⛔ A prefix must NOT match: a prefix filter over a public index is an enumeration
      // primitive wearing a search box.
      const prefix = await poolDomain.listPublicSahyogDrivePools(tx, ids.pariwarId(PARIWAR_A), {
        limit: 50,
        poolCode: code.slice(0, 8),
      });
      expect(prefix).toEqual([]);
    });

    it('filters by DATE RANGE over the drive’s close/settle instant', async () => {
      const { client, tx } = getTx();
      const now = new Date();
      const old = new Date(now.getTime() - 10 * 86_400_000);
      const recent = new Date(now.getTime() - 86_400_000);
      const oldDrive = await seedDrive(tx, PARIWAR_A, { closedAt: old });
      const recentDrive = await seedDrive(tx, PARIWAR_A, { closedAt: recent });

      await enterAppScope(client, PARIWAR_A);
      const ids_ = (
        await poolDomain.listPublicSahyogDrivePools(tx, ids.pariwarId(PARIWAR_A), {
          limit: 50,
          now,
          closedFrom: new Date(now.getTime() - 2 * 86_400_000),
        })
      ).map((r) => r.poolId as string);

      expect(ids_).toContain(recentDrive.poolId);
      expect(ids_).not.toContain(oldDrive.poolId);
    });
  });

  describe('paging stability + the count accessor', () => {
    it('⭐ pages do not overlap or drop rows — the ORDER BY carries a PK tie-break', async () => {
      const { client, tx } = getTx();
      const now = new Date();
      // ⚠ ALL FOUR SHARE ONE close instant, on purpose: without the `pool_id` tie-break the sort
      // is non-deterministic among ties and offset paging silently duplicates and drops rows.
      const sharedInstant = new Date(now.getTime() - 3600_000);
      const code = `TIE-${randomUUID().slice(0, 8)}`;
      const minted: string[] = [];
      for (let i = 0; i < 4; i += 1) {
        const d = await seedDrive(tx, PARIWAR_A, {
          closedAt: sharedInstant,
          canonicalIdentifier: `${code}-${String(i)}`,
        });
        minted.push(d.poolId);
      }

      await enterAppScope(client, PARIWAR_A);
      const pageOf = async (offset: number): Promise<string[]> =>
        (
          await poolDomain.listPublicSahyogDrivePools(tx, ids.pariwarId(PARIWAR_A), {
            limit: 2,
            offset,
            now,
            closedFrom: sharedInstant,
            closedTo: sharedInstant,
          })
        ).map((r) => r.poolId as string);

      const first = await pageOf(0);
      const second = await pageOf(2);

      expect(first).toHaveLength(2);
      expect(second).toHaveLength(2);
      // ⛔ No id appears on both pages, and together they cover exactly what was minted.
      expect(first.filter((id) => second.includes(id))).toEqual([]);
      expect([...first, ...second].sort()).toEqual([...minted].sort());
      // Re-reading page 1 returns the SAME page — "page N is the same page N on every request".
      expect(await pageOf(0)).toEqual(first);
    });

    it('the count accessor shares the predicate — it agrees with an unpaged read', async () => {
      const { client, tx } = getTx();
      const now = new Date();
      const instant = new Date(now.getTime() - 7200_000);
      for (let i = 0; i < 3; i += 1) {
        await seedDrive(tx, PARIWAR_A, { closedAt: instant });
      }
      // A `live` pool in the same window must be counted by NEITHER.
      await seedDrive(tx, PARIWAR_A, { currentState: 'live', closedAt: instant });

      await enterAppScope(client, PARIWAR_A);
      const filters = { now, closedFrom: instant, closedTo: instant };
      const listed = await poolDomain.listPublicSahyogDrivePools(tx, ids.pariwarId(PARIWAR_A), {
        ...filters,
        limit: 50,
      });
      const total = await poolDomain.countPublicSahyogDrivePools(tx, ids.pariwarId(PARIWAR_A), filters);

      expect(total).toBe(listed.length);
      expect(total).toBe(3);
      // ⚠ `count(*)` is bigint ⇒ a STRING from the driver. If the coercion were dropped this
      // would be '3' and every arithmetic comparison downstream would go quietly wrong.
      expect(typeof total).toBe('number');
    });

    it('clamps an over-cap limit at the accessor (the SECOND of two independent bounds)', async () => {
      const { client, tx } = getTx();
      const now = new Date();
      const instant = new Date(now.getTime() - 10_800_000);
      for (let i = 0; i < 3; i += 1) {
        await seedDrive(tx, PARIWAR_A, { closedAt: instant });
      }

      await enterAppScope(client, PARIWAR_A);
      // `apps/public` REFUSES an over-cap request at the parse; this clamp is what keeps a caller
      // that skips the parse from pulling a table. ⛔ Neither bound is redundant.
      const rows = await poolDomain.listPublicSahyogDrivePools(tx, ids.pariwarId(PARIWAR_A), {
        limit: 10_000,
        now,
        closedFrom: instant,
        closedTo: instant,
      });
      expect(rows.length).toBeLessThanOrEqual(poolDomain.SAHYOG_DRIVE_PAGE_SIZE_CAP);
    });
  });

  describe('⛔ the target is quarantined (AC4)', () => {
    it('returns an opaque outcome enum and ⛔ NO total, percentage or shortfall field', async () => {
      const { client, tx } = getTx();
      const drive = await seedDrive(tx, PARIWAR_A, { fixedAmount: 100 });

      await enterAppScope(client, PARIWAR_A);
      const row = (
        await poolDomain.listPublicSahyogDrivePools(tx, ids.pariwarId(PARIWAR_A), { limit: 50 })
      ).find((r) => r.poolId === drive.poolId);

      expect(row?.fundingOutcome).toMatch(/^(fully_funded|under_funded|partial)$/);
      // ⛔ Not "no target is CURRENTLY set" — no key that could carry one EXISTS on the shape.
      // A future edit adding `expectedTotal`, `shortfall`, `percentFunded` or a renamed cousin
      // fails here, which is the point: `classifyCycleOutcome` quarantines the target by
      // construction and this surface must not smuggle one past it.
      const forbidden = /target|expected|shortfall|percent|ratio|remaining|deficit|goal/i;
      expect(Object.keys(row ?? {}).filter((k) => forbidden.test(k))).toEqual([]);
    });
  });
});
