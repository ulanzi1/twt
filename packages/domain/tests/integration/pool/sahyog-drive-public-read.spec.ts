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
  seedClauseVersion,
  seedConsentRecord,
  seedEvent,
  seedMember,
  seedMemberPosting,
  seedPinnedClause,
  seedPool,
  seedTcVersion,
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
    /**
     * How many members were ASSIGNED to contribute to this drive.
     *
     * ⭐ DEFAULTS TO 0, WHICH IS WHAT EVERY DRIVE IN THIS SPEC ALREADY WAS — `seedDrive` has never
     * written `member_pool_assignments`. That is ⛔ not a fixture nicety: under the pre-2026-08-27
     * code every one of these drives had `expectedTotal === 0`, `0 >= 0` classified vacuously as
     * `fully_funded`, and the surface would have published *"The cycle closed with the support it
     * needed."* beside *"0 confirmed"*. ⚠ The one assertion covering it was
     * `toMatch(/^(fully_funded|under_funded|partial)$/)`, which passes for all three and asserts
     * nothing.
     */
    assignedMembers?: number;
    /**
     * ⭐ Story 11b.14 (AC7) — how many `claim_nominee_bank_accounts` rows the CLAIM carries.
     * ⚠ Two is the composite-PK ceiling and they are **EQUAL destinations for the SAME nominee** —
     * an RBI per-account-cap workaround, ⛔ not one row per declared nominee (6.8 D1). ⇒ the read
     * must return exactly ONE ciphertext however many rows exist.
     * ⭐ `0` (the default) is the 6.8 **AC3** ABSENCE SIGNAL: bank details were never collected.
     */
    nomineeAccounts?: number;
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
  // ⚠ The EXPECTED side of the funding outcome. Assignments are what make a drive's outcome
  // classifiable at all — with none, no expectation was ever set and `fundingOutcome` is `null`.
  const assignedMembers = opts.assignedMembers ?? 0;
  if (assignedMembers > 0) {
    const cycleId = randomUUID();
    for (let i = 0; i < assignedMembers; i += 1) {
      const memberId = await seedMember(tx, pariwarId);
      await tx.insert(schema.memberPoolAssignments).values({
        poolId: ids.poolId(poolId),
        memberId: ids.memberId(memberId),
        pariwarId: ids.pariwarId(pariwarId),
        cycleId: ids.cycleFreezeCommitId(cycleId),
        assignedAt: new Date('2026-08-01T00:00:00.000Z'),
      });
    }
  }
  // ⭐ Story 11b.14 (AC7) — the claim's nominee bank accounts. ⛔ CIPHERTEXT: the domain read never
  // decrypts, so the fixture stores a marker the assertions can identify by rank.
  const nomineeAccounts = opts.nomineeAccounts ?? 0;
  for (let rank = 1; rank <= nomineeAccounts; rank += 1) {
    await tx.insert(schema.claimNomineeBankAccounts).values({
      claimCaseId: ids.claimId(claimCaseId),
      pariwarId: ids.pariwarId(pariwarId),
      accountRank: rank,
      accountHolderNameCiphertext: `ct-nominee-rank-${String(rank)}-${poolId}`,
      accountNumberCiphertext: `ct-acct-${String(rank)}`,
      ifscCiphertext: `ct-ifsc-${String(rank)}`,
      bankName: 'Test Bank',
      branch: 'Test Branch',
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
      // ⚠ Story 11b.12 D1(b) — the ruled public tokens. ⭐ `closed` here is the PUBLIC word that
      // deliberately coincides with the internal `pools.current_state`; `settled` → `verified` is
      // the one pair that still differs, and it is what proves the map is ⛔ not a no-op.
      expect(byId.get(active.poolId)?.status).toBe('closed');
      expect(byId.get(archived.poolId)?.status).toBe('verified');
    });

    // ⚠⛔⛔ **NARROWED 2026-09-07 (Story 11b.14, AC1) — ⛔ NOT DELETED, ⭐ AND THE PRIOR PROPERTY IS
    // NAMED** ([[feedback_supersede_never_reinterpret]]). It read *"⛔ EXCLUDES a `spawned` **and a
    // `live`** pool — a drive still collecting is not a record"* and asserted BOTH were absent.
    // ⭐⭐ **THE `live` HALF IS REVERSED BY RULING.** `2026-09-04-189` **cl.2** (Trustee-ratified) —
    // *"(Q2) — YES: A COLLECTING DRIVE IS LISTED"* — restoring **FR-76**, a standing requirement
    // since the PRD that had been excluded on the strength of an AC parenthetical and a code
    // comment, ⛔ never a ruling (`2026-09-04-187`). ⇒ recorded at `2026-09-07-204`.
    // ⭐ **THE `spawned` HALF IS UNTOUCHED AND IS NOW THE WHOLE POINT:** the widening ADDS one
    // state; ⛔ it does ⛔ not relax the predicate, and `spawned` has ⛔ no public word at all.
    it('⭐ LISTS `live` (`-189` cl.2) — ⛔ while `spawned` stays a PURE DENY', async () => {
      const { client, tx } = getTx();
      const spawned = await seedDrive(tx, PARIWAR_A, { currentState: 'spawned' });
      const live = await seedDrive(tx, PARIWAR_A, { currentState: 'live' });
      const closed = await seedDrive(tx, PARIWAR_A, { currentState: 'closed' });

      await enterAppScope(client, PARIWAR_A);
      const rows = await poolDomain.listPublicSahyogDrivePools(tx, ids.pariwarId(PARIWAR_A), {
        limit: 50,
      });
      const ids_ = rows.map((r) => r.poolId as string);

      expect(ids_).toContain(closed.poolId);
      expect(ids_).toContain(live.poolId);
      expect(ids_).not.toContain(spawned.poolId);
      // ⭐ And the live row carries the ruled public WORD — ⛔ never the two-way partition's `else`
      // arm, which would have labelled a collecting drive as one whose window had shut.
      expect(rows.find((r) => (r.poolId as string) === live.poolId)?.status).toBe('live');
    });

    // ─────────────────────────────────────────────────────────────────────────────────────────
    // ⭐⭐ STORY 11b.14 (AC7) — THE NOMINEE'S NAME. Trustee-ratified 2026-09-05; `2026-09-07-205`.
    // ⚠⛔ IT IS A **READ-SHAPE CHANGE**, ⛔ NOT A FIELD ADDITION — this read joined ⛔ NO nominee
    // table before, so it is exercised against the LIVE DB rather than asserted in a unit.
    // ─────────────────────────────────────────────────────────────────────────────────────────
    it('⭐⭐ returns the nominee ciphertext — ⭐ EXACTLY ONE, from the LOWEST rank', async () => {
      const { client, tx } = getTx();
      // ⚠ TWO accounts — the composite-PK ceiling. ⭐ They are EQUAL destinations for the SAME
      // nominee (an RBI per-account-cap workaround, ⛔ not one row per declared nominee — 6.8 D1),
      // so there is ⛔ ONE name to publish and decrypting the second would be a Tier-1 decrypt with
      // ⛔ no authorising purpose.
      const drive = await seedDrive(tx, PARIWAR_A, { nomineeAccounts: 2 });

      await enterAppScope(client, PARIWAR_A);
      const row = (
        await poolDomain.listPublicSahyogDrivePools(tx, ids.pariwarId(PARIWAR_A), { limit: 50 })
      ).find((r) => r.poolId === drive.poolId);

      // ⭐ RANK 1, DETERMINISTICALLY — *"page N is the same page N on every request"* depends on it.
      expect(row?.nomineeAccountHolderNameCiphertext).toBe(`ct-nominee-rank-1-${drive.poolId}`);
      // ⛔⛔ AND THE JOIN DID ⛔ NOT FAN THE ROW OUT. Two account rows must yield ONE drive row —
      // a naive join would have duplicated the drive and silently doubled `total`.
      expect(
        (await poolDomain.listPublicSahyogDrivePools(tx, ids.pariwarId(PARIWAR_A), { limit: 50 }))
          .filter((r) => r.poolId === drive.poolId),
      ).toHaveLength(1);
    });

    it('⭐ `null` when the claim carried ⛔ NO bank details — the 6.8 AC3 absence signal', async () => {
      // ⚠⛔ DEFAULT-SHAPED, ⛔ not exotic — and it is HALF of the double-absence case that would
      // otherwise 500 the page (`2026-09-07-205` cl.6). ⛔ NULL NEVER OMITS THE ROW.
      const { client, tx } = getTx();
      const drive = await seedDrive(tx, PARIWAR_A, { nomineeAccounts: 0 });

      await enterAppScope(client, PARIWAR_A);
      const rows = await poolDomain.listPublicSahyogDrivePools(tx, ids.pariwarId(PARIWAR_A), {
        limit: 50,
      });
      const row = rows.find((r) => r.poolId === drive.poolId);
      expect(row).toBeDefined();
      expect(row?.nomineeAccountHolderNameCiphertext).toBeNull();
    });

    it('⛔⛔ it reads ⛔ ONLY the holder name — ⛔ no account number, ⛔ no IFSC, ⛔ no bank, ⛔ no branch', async () => {
      // ⭐ `2026-09-04-190` cl.1 + `-191` cl.1 withdrew every other nominee-bank value from the
      // public surface, and `-205` cl.9 authorises the NAME and ⛔ nothing else. ⚠ The fixture
      // seeds all of them, so this fails if a future edit widens the select.
      const { client, tx } = getTx();
      const drive = await seedDrive(tx, PARIWAR_A, { nomineeAccounts: 2 });

      await enterAppScope(client, PARIWAR_A);
      const row = (
        await poolDomain.listPublicSahyogDrivePools(tx, ids.pariwarId(PARIWAR_A), { limit: 50 })
      ).find((r) => r.poolId === drive.poolId);

      const serialized = JSON.stringify(row ?? {});
      for (const banned of ['ct-acct-', 'ct-ifsc-', 'Test Bank', 'Test Branch']) {
        expect(serialized).not.toContain(banned);
      }
      // ⛔ And ⛔ no key that could carry one exists on the shape, under any name.
      const bankish = /account_?number|ifsc|vpa|bank_?name|branch|last4/i;
      expect(Object.keys(row ?? {}).filter((k) => bankish.test(k))).toEqual([]);
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

  describe("the PUBLICATION BASIS — the member's own accepted T&C, and it gates the NAME, ⛔ never the ROW", () => {
    // ⭐⭐ STORY 11b.9 REPLACED THE AUTHORITY THESE CASES TEST, ⛔ AND DID NOT REMOVE ANY OF THEM.
    // 11b.1 gated on `sahyog_drive_publication` — a tick-box the FAMILY ticked at claim time.
    // `2026-08-28-160` cl.3-5 DE-AUTHORISED that and put the authority on the MEMBER'S OWN accepted
    // versioned T&C, pinning the post-death publication clause. Every property below is the SAME
    // property re-expressed against the new basis: name-not-row, missing == revoked, per-subject,
    // fail-closed. ⛔ The old gate is not ANDed or ORed in — see the de-authorisation proof.
    //
    // ⛔⛔ ⛔ NO TEST HERE MAY HARDCODE THE CLAUSE-ID LITERAL (story D3). Fixtures create their own
    // clause row from `poolDomain.SAHYOG_DRIVE_PUBLICATION_CLAUSE_ID`, so counsel's final value is a
    // ONE-LINE change in `public-read.ts` and ⛔ ZERO changes here.

    /**
     * Give a deceased member a VALID `tc_acceptance` whose accepted T&C version PINS the publication
     * clause — the full basis, exactly as `member-terms.handlers.ts` writes it
     * (`consent_artifact_ref` = the server-resolved `tc_version_id`).
     */
    async function seedPublicationBasis(
      tx: Db,
      pariwarId: string,
      deceasedMemberId: string,
      opts: {
        /** Pin the clause into the accepted version? `false` = accepted a version without it. */
        pinClause?: boolean;
        /** Tenant that owns the clause version + the pin row — for the cross-tenant case (T5). */
        clausePariwarId?: string;
        /** Overwrite what the consent row stores as its artifact ref (for the malformed case, T2). */
        artifactRefOverride?: string | null;
        revokedAt?: Date | null;
      } = {},
    ): Promise<{ tcVersionId: string }> {
      const tcVersionId = await seedTcVersion(tx, pariwarId, { version: 1 });
      if (opts.pinClause !== false) {
        const clausePariwar = opts.clausePariwarId ?? pariwarId;
        const clauseVersionId = await seedClauseVersion(tx, clausePariwar, {
          clauseId: poolDomain.SAHYOG_DRIVE_PUBLICATION_CLAUSE_ID,
        });
        await seedPinnedClause(tx, clausePariwar, tcVersionId, clauseVersionId);
      }
      await seedConsentRecord(tx, pariwarId, {
        subjectId: deceasedMemberId,
        consentType: 'tc_acceptance',
        consentArtifactRef:
          opts.artifactRefOverride === undefined ? tcVersionId : opts.artifactRefOverride,
        grantedAt: new Date(Date.now() - 120_000),
        revokedAt: opts.revokedAt ?? null,
      });
      return { tcVersionId };
    }

    /** Fetch one drive's row, in app scope. ⭐ Asserts the ROW exists — AC5's whole point. */
    async function readDriveRow(
      client: Parameters<typeof enterAppScope>[0],
      tx: Db,
      poolId: string,
    ) {
      await enterAppScope(client, PARIWAR_A);
      const rows = await poolDomain.listPublicSahyogDrivePools(tx, ids.pariwarId(PARIWAR_A), {
        limit: 50,
      });
      return rows.find((r) => r.poolId === poolId);
    }

    it('⭐ a drive with NO basis STILL APPEARS, in full, with the verdict false', async () => {
      const { client, tx } = getTx();
      const drive = await seedDrive(tx, PARIWAR_A, { district: 'Jaipur' });

      const row = await readDriveRow(client, tx, drive.poolId);

      // ⭐ The ROW exists in full — this is AC5 / "degrades per-pool, never per-page", and it is
      // asserted POSITIVELY: the row is PRESENT and the name is ABSENT, ⛔ not merely that the call
      // succeeded (the 11b.1 whole-union fixture trap).
      expect(row).toBeDefined();
      expect(row?.namePublicationAuthorised).toBe(false);
      expect(row?.district).toBe('Jaipur');
      expect(row?.poolCanonicalIdentifier).toBeTruthy();
      expect(row?.driveClosedAt).toBeDefined();
    });

    it('⭐ a valid `tc_acceptance` whose accepted version PINS the clause yields true', async () => {
      const { client, tx } = getTx();
      const drive = await seedDrive(tx, PARIWAR_A, {});
      await seedPublicationBasis(tx, PARIWAR_A, drive.deceasedMemberId);

      const row = await readDriveRow(client, tx, drive.poolId);

      expect(row?.namePublicationAuthorised).toBe(true);
    });

    it('⛔ NO `tc_acceptance` at all → unnamed, row still present', async () => {
      const { client, tx } = getTx();
      const drive = await seedDrive(tx, PARIWAR_A, {});
      // The clause is minted and pinned for the Pariwar — the member simply never accepted.
      const tcVersionId = await seedTcVersion(tx, PARIWAR_A, { version: 1 });
      const clauseVersionId = await seedClauseVersion(tx, PARIWAR_A, {
        clauseId: poolDomain.SAHYOG_DRIVE_PUBLICATION_CLAUSE_ID,
      });
      await seedPinnedClause(tx, PARIWAR_A, tcVersionId, clauseVersionId);

      const row = await readDriveRow(client, tx, drive.poolId);

      expect(row).toBeDefined();
      expect(row?.namePublicationAuthorised).toBe(false);
    });

    it('⭐ a REVOKED acceptance reads exactly like a MISSING one — same verdict, row still present', async () => {
      const { client, tx } = getTx();
      const drive = await seedDrive(tx, PARIWAR_A, {});
      await seedPublicationBasis(tx, PARIWAR_A, drive.deceasedMemberId, {
        revokedAt: new Date(Date.now() - 60_000),
      });

      const row = await readDriveRow(client, tx, drive.poolId);

      expect(row).toBeDefined(); // ⛔ revocation removes a NAME, never a DRIVE
      expect(row?.namePublicationAuthorised).toBe(false);
    });

    it('⛔ an accepted version that does NOT pin the clause → unnamed (AC7 fail-closed)', async () => {
      const { client, tx } = getTx();
      const drive = await seedDrive(tx, PARIWAR_A, {});
      await seedPublicationBasis(tx, PARIWAR_A, drive.deceasedMemberId, { pinClause: false });

      const row = await readDriveRow(client, tx, drive.poolId);

      expect(row).toBeDefined();
      expect(row?.namePublicationAuthorised).toBe(false);
    });

    it('⛔ a pin whose clause version belongs to ANOTHER Pariwar does NOT authorise (T5)', async () => {
      const { client, tx } = getTx();
      const drive = await seedDrive(tx, PARIWAR_A, {});
      // ⚠ The pin table's FK targets the GLOBAL clause_versions PK, so this row LINKS FINE. The
      // predicate must reject it on its own explicit tenant scoping — ⛔ not on the FK, and ⛔ not
      // on RLS alone inside a correlated subquery on an unauthenticated route.
      await seedPublicationBasis(tx, PARIWAR_A, drive.deceasedMemberId, {
        clausePariwarId: PARIWAR_B,
      });

      const row = await readDriveRow(client, tx, drive.poolId);

      expect(row).toBeDefined();
      expect(row?.namePublicationAuthorised).toBe(false);
    });

    it.each([
      ['a non-UUID string', 'not-a-uuid'],
      ['an empty string', ''],
      ['NULL', null],
    ])(
      '⛔ a malformed `consent_artifact_ref` (%s) EXCLUDES the member and ⛔ does NOT throw (T2)',
      async (_label, ref) => {
        const { client, tx } = getTx();
        const drive = await seedDrive(tx, PARIWAR_A, {});
        // ⭐ THE TRAP THIS PROVES SHUT: `consent_artifact_ref` is unconstrained NULLABLE text with no
        // FK. A naive `consent_artifact_ref::uuid` raises 22P02 and 500s the WHOLE public page for
        // the whole Pariwar. Casting the uuid side to text instead (`tc_version_id::text = ref`) is
        // TOTAL, so a bad row simply fails to match.
        await seedPublicationBasis(tx, PARIWAR_A, drive.deceasedMemberId, {
          artifactRefOverride: ref,
        });

        // ⛔ The assertion is that this RESOLVES, not that it rejects — a throw is the failure mode.
        const row = await readDriveRow(client, tx, drive.poolId);

        expect(row).toBeDefined();
        expect(row?.namePublicationAuthorised).toBe(false);
      },
    );

    it('⛔⛔ THE DE-AUTHORISATION, PROVED: a granted `sahyog_drive_publication` names NOTHING on its own', async () => {
      const { client, tx } = getTx();
      const drive = await seedDrive(tx, PARIWAR_A, {});
      // ⭐ This is the case 11b.1 shipped as the WHOLE basis, and `2026-08-28-160` cl.5 retired it.
      // ⛔ Not ANDed, ⛔ not ORed — the row is simply NOT CONSULTED (story D2). The type and every
      // existing row are PRESERVED by the same clause, which is exactly why this case must keep
      // being asserted rather than deleted along with the gate.
      await seedConsentRecord(tx, PARIWAR_A, {
        subjectId: drive.deceasedMemberId,
        consentType: 'sahyog_drive_publication',
        grantedAt: new Date(Date.now() - 60_000),
      });

      const row = await readDriveRow(client, tx, drive.poolId);

      expect(row).toBeDefined();
      expect(row?.namePublicationAuthorised).toBe(false);
    });

    it('⛔ a DIFFERENT publication consent does NOT authorise this surface either', async () => {
      const { client, tx } = getTx();
      const drive = await seedDrive(tx, PARIWAR_A, {});
      await seedConsentRecord(tx, PARIWAR_A, {
        subjectId: drive.deceasedMemberId,
        consentType: 'sahyog_vivran_publication',
        grantedAt: new Date(Date.now() - 60_000),
      });

      const row = await readDriveRow(client, tx, drive.poolId);

      expect(row?.namePublicationAuthorised).toBe(false);
    });

    it("⭐ the basis is per-SUBJECT — one member's acceptance does not name another member's drive", async () => {
      const { client, tx } = getTx();
      const authorised = await seedDrive(tx, PARIWAR_A, {});
      const notAuthorised = await seedDrive(tx, PARIWAR_A, {});
      await seedPublicationBasis(tx, PARIWAR_A, authorised.deceasedMemberId);

      await enterAppScope(client, PARIWAR_A);
      const rows = await poolDomain.listPublicSahyogDrivePools(tx, ids.pariwarId(PARIWAR_A), {
        limit: 50,
      });

      const authorisedRow = rows.find((r) => r.poolId === authorised.poolId);
      const notAuthorisedRow = rows.find((r) => r.poolId === notAuthorised.poolId);
      expect(authorisedRow?.namePublicationAuthorised).toBe(true);
      // ⭐ ROW PRESENT, NAME ABSENT — asserted on the same page as a named row, so a fixture that
      // silently returned nothing cannot make this pass.
      expect(notAuthorisedRow).toBeDefined();
      expect(notAuthorisedRow?.namePublicationAuthorised).toBe(false);
    });

    it('⭐⛔ the accepted version does NOT have to still be EFFECTIVE — a later version never un-publishes', async () => {
      const { client, tx } = getTx();
      const drive = await seedDrive(tx, PARIWAR_A, {});
      // ⚠ THE CONJUNCT THAT IS DELIBERATELY ABSENT (11b.9 §Policy meaning). The member consented to
      // WHAT THEY CONSENTED TO; the Pariwar rolling a newer T&C is ⛔ not a withdrawal of their own
      // authority, and "amend the T&C" is ⛔ NOT an un-publish lever. Adding `AND the version is
      // effective` here is the 10.10 `is_valid: false` shape — one conjunct, constitutional meaning,
      // every CI gate still green.
      const acceptedAt = new Date(Date.now() - 7_200_000);
      const supersededAt = new Date(Date.now() - 3_600_000);
      const acceptedVersionId = await seedTcVersion(tx, PARIWAR_A, {
        version: 1,
        effectiveFrom: new Date(Date.now() - 86_400_000),
        effectiveUntil: supersededAt, // ⛔ NO LONGER the effective version
      });
      const clauseVersionId = await seedClauseVersion(tx, PARIWAR_A, {
        clauseId: poolDomain.SAHYOG_DRIVE_PUBLICATION_CLAUSE_ID,
      });
      await seedPinnedClause(tx, PARIWAR_A, acceptedVersionId, clauseVersionId);
      // The Pariwar's CURRENT version pins nothing.
      await seedTcVersion(tx, PARIWAR_A, { version: 2, effectiveFrom: supersededAt });
      await seedConsentRecord(tx, PARIWAR_A, {
        subjectId: drive.deceasedMemberId,
        consentType: 'tc_acceptance',
        consentArtifactRef: acceptedVersionId,
        grantedAt: acceptedAt,
      });

      const row = await readDriveRow(client, tx, drive.poolId);

      expect(row?.namePublicationAuthorised).toBe(true);
    });

    it('⭐ ANY version of the clause satisfies the basis — the join is on `clause_id`, ⛔ not `clause_version_id` (T3)', async () => {
      const { client, tx } = getTx();
      const drive = await seedDrive(tx, PARIWAR_A, {});
      // ⚠ The disclosure clause is rulebook content and WILL be amended. Pinning the predicate to one
      // `clause_version_id` would make the FIRST amendment silently un-publish every name, with ⛔ no
      // error and ⛔ no failing test. Here the pinned row is version 3 of the same `clause_id`.
      const tcVersionId = await seedTcVersion(tx, PARIWAR_A, { version: 1 });
      const amendedClauseVersionId = await seedClauseVersion(tx, PARIWAR_A, {
        clauseId: poolDomain.SAHYOG_DRIVE_PUBLICATION_CLAUSE_ID,
        version: 3,
      });
      await seedPinnedClause(tx, PARIWAR_A, tcVersionId, amendedClauseVersionId);
      await seedConsentRecord(tx, PARIWAR_A, {
        subjectId: drive.deceasedMemberId,
        consentType: 'tc_acceptance',
        consentArtifactRef: tcVersionId,
        grantedAt: new Date(Date.now() - 60_000),
      });

      const row = await readDriveRow(client, tx, drive.poolId);

      expect(row?.namePublicationAuthorised).toBe(true);
    });
  });

  describe('the AC8 inert-state discriminator — ⛔ a diagnostic, ⛔ never a gate', () => {
    it('⛔ reports NOT PINNED when no effective T&C version in the Pariwar pins the clause', async () => {
      const { client, tx } = getTx();
      // ⭐ THE DAY-ONE STATE, and it is the whole reason AC8 exists: with no clause minted, every row
      // in the Pariwar renders unnamed. That is a PROVISIONING answer, ⛔ not a member-record one.
      await seedDrive(tx, PARIWAR_A, {});

      await enterAppScope(client, PARIWAR_A);
      const pinned = await poolDomain.isSahyogDrivePublicationClausePinned(
        tx,
        ids.pariwarId(PARIWAR_A),
      );

      expect(pinned).toBe(false);
    });

    it('⭐ reports PINNED once the clause is minted and pinned into the effective version', async () => {
      const { client, tx } = getTx();
      const tcVersionId = await seedTcVersion(tx, PARIWAR_A, { version: 1 });
      const clauseVersionId = await seedClauseVersion(tx, PARIWAR_A, {
        clauseId: poolDomain.SAHYOG_DRIVE_PUBLICATION_CLAUSE_ID,
      });
      await seedPinnedClause(tx, PARIWAR_A, tcVersionId, clauseVersionId);

      await enterAppScope(client, PARIWAR_A);
      const pinned = await poolDomain.isSahyogDrivePublicationClausePinned(
        tx,
        ids.pariwarId(PARIWAR_A),
      );

      expect(pinned).toBe(true);
    });

    it('⛔ a version that is NOT effective does not count — the two inert states stay separable', async () => {
      const { client, tx } = getTx();
      // ⚠ This is precisely the case that must read (i)-PROVISIONING-INERT rather than (ii)-per-member:
      // the clause exists, but nothing CURRENTLY EFFECTIVE pins it, so no member can be named.
      const staleVersionId = await seedTcVersion(tx, PARIWAR_A, {
        version: 1,
        effectiveFrom: new Date(Date.now() - 86_400_000),
        effectiveUntil: new Date(Date.now() - 3_600_000),
      });
      const clauseVersionId = await seedClauseVersion(tx, PARIWAR_A, {
        clauseId: poolDomain.SAHYOG_DRIVE_PUBLICATION_CLAUSE_ID,
      });
      await seedPinnedClause(tx, PARIWAR_A, staleVersionId, clauseVersionId);

      await enterAppScope(client, PARIWAR_A);
      const pinned = await poolDomain.isSahyogDrivePublicationClausePinned(
        tx,
        ids.pariwarId(PARIWAR_A),
      );

      expect(pinned).toBe(false);
    });

    it('⛔ an unapproved (pending legal review) version does not count either', async () => {
      const { client, tx } = getTx();
      const pendingVersionId = await seedTcVersion(tx, PARIWAR_A, {
        version: 1,
        legalReviewStatus: 'pending',
      });
      const clauseVersionId = await seedClauseVersion(tx, PARIWAR_A, {
        clauseId: poolDomain.SAHYOG_DRIVE_PUBLICATION_CLAUSE_ID,
      });
      await seedPinnedClause(tx, PARIWAR_A, pendingVersionId, clauseVersionId);

      await enterAppScope(client, PARIWAR_A);
      const pinned = await poolDomain.isSahyogDrivePublicationClausePinned(
        tx,
        ids.pariwarId(PARIWAR_A),
      );

      // ⭐ Same predicate as `getEffectiveTc` — "change one, check the other".
      expect(pinned).toBe(false);
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

  // ⭐⭐ TWO RULINGS FROM THE 2026-09-07 CODE REVIEW — `2026-09-07-206` cl.5, and the ORDERING
  // finding that had no ruling because it was never a question: a live drive that sorts behind the
  // archive is ⛔ not a policy choice, it is FR-76 defeated.
  describe('⭐⭐ live drives: ordering + the close-date exemption (`2026-09-07-206` cl.5)', () => {
    it('⛔⛔ a live drive sorts FIRST — ⛔ never behind the archive, which is what hid it on page 1', async () => {
      const { client, tx } = getTx();
      const now = new Date();
      // ⚠ The archive rows close in the RECENT past, so under the old single-key sort they outranked
      // a live row whose `closedAt` is structurally NULL and therefore sorted LAST.
      const older = await seedDrive(tx, PARIWAR_A, {
        closedAt: new Date(now.getTime() - 3 * 86_400_000),
      });
      const newer = await seedDrive(tx, PARIWAR_A, {
        closedAt: new Date(now.getTime() - 1 * 86_400_000),
      });
      const live = await seedDrive(tx, PARIWAR_A, { currentState: 'live' });

      await enterAppScope(client, PARIWAR_A);
      const ordered = (
        await poolDomain.listPublicSahyogDrivePools(tx, ids.pariwarId(PARIWAR_A), { limit: 50, now })
      ).map((r) => r.poolId as string);

      // ⭐ MEMBERSHIP + RELATIVE POSITION, ⛔ never a count over the shared fixture.
      expect(ordered).toContain(live.poolId);
      expect(ordered.indexOf(live.poolId)).toBeLessThan(ordered.indexOf(newer.poolId));
      expect(ordered.indexOf(live.poolId)).toBeLessThan(ordered.indexOf(older.poolId));
      // ⭐ AND THE ARCHIVE KEEPS ITS OWN RECENCY ORDER — the second sort key is undisturbed.
      expect(ordered.indexOf(newer.poolId)).toBeLessThan(ordered.indexOf(older.poolId));
    });

    it('⭐⭐ a close-date filter ⛔ NEVER hides a live drive, and still narrows the archive', async () => {
      const { client, tx } = getTx();
      const now = new Date();
      const old = await seedDrive(tx, PARIWAR_A, {
        closedAt: new Date(now.getTime() - 30 * 86_400_000),
      });
      const recent = await seedDrive(tx, PARIWAR_A, {
        closedAt: new Date(now.getTime() - 1 * 86_400_000),
      });
      const live = await seedDrive(tx, PARIWAR_A, { currentState: 'live' });

      await enterAppScope(client, PARIWAR_A);
      const filtered = (
        await poolDomain.listPublicSahyogDrivePools(tx, ids.pariwarId(PARIWAR_A), {
          limit: 50,
          now,
          closedFrom: new Date(now.getTime() - 2 * 86_400_000),
        })
      ).map((r) => r.poolId as string);

      // ⭐ THE RULING: the live drive survives a filter it can never satisfy.
      expect(filtered).toContain(live.poolId);
      // ⛔ AND THE FILTER STILL DOES ITS JOB on rows that DO carry a close date.
      expect(filtered).toContain(recent.poolId);
      expect(filtered).not.toContain(old.poolId);
    });

    it('⭐ the exemption holds on `closedTo` as well — ⛔ both conjuncts, ⛔ not just the one', async () => {
      const { client, tx } = getTx();
      const now = new Date();
      const recent = await seedDrive(tx, PARIWAR_A, {
        closedAt: new Date(now.getTime() - 1 * 86_400_000),
      });
      const live = await seedDrive(tx, PARIWAR_A, { currentState: 'live' });

      await enterAppScope(client, PARIWAR_A);
      const filtered = (
        await poolDomain.listPublicSahyogDrivePools(tx, ids.pariwarId(PARIWAR_A), {
          limit: 50,
          now,
          closedTo: new Date(now.getTime() - 10 * 86_400_000),
        })
      ).map((r) => r.poolId as string);

      expect(filtered).toContain(live.poolId);
      expect(filtered).not.toContain(recent.poolId);
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
      // ⚠⛔ **AMENDED 2026-09-07 (Story 11b.14, AC1) — ⭐ THE PROPERTY UNDER TEST IS UNCHANGED, ⛔ the
      // fixture's decoy is.** It read *"A `live` pool in the same window must be counted by
      // NEITHER"*, and `live` is now LISTED (`-189` cl.2) ⇒ that pool would be counted by BOTH and
      // the case would still pass — ⭐ vacuously, proving nothing about agreement.
      // ⇒ the decoy becomes `spawned`, which remains a **PURE DENY**. ⭐ What this asserts is that
      // the LIST and the COUNT share ONE predicate, and it needs a row **outside** that predicate
      // to mean anything.
      await seedDrive(tx, PARIWAR_A, { currentState: 'spawned', closedAt: instant });

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
      const drive = await seedDrive(tx, PARIWAR_A, { fixedAmount: 100, assignedMembers: 3 });

      await enterAppScope(client, PARIWAR_A);
      const row = (
        await poolDomain.listPublicSahyogDrivePools(tx, ids.pariwarId(PARIWAR_A), { limit: 50 })
      ).find((r) => r.poolId === drive.poolId);

      // ⚠ An EXACT membership assertion, ⛔ not the old `toMatch(/^(fully_funded|under_funded|
      // partial)$/)` — that regex passed for every member of the union AND would have passed for a
      // vacuous classification, so it asserted nothing at all (Review finding, 2026-08-27).
      // 3 assigned × 100 expected vs 0 confirmed ⇒ genuinely under-funded.
      expect(row?.fundingOutcome).toBe('under_funded');
      // ⚠⛔⛔ **NARROWED 2026-09-07 (Story 11b.14) — FROM A DENY-LIST TO AN ALLOW-LIST, ⛔ NOT
      // DELETED, ⭐ AND IT COMES OUT STRICTER** ([[feedback_supersede_never_reinterpret]]).
      // It was a BLANKET name ban with: *"⛔ Not 'no target is CURRENTLY set' — no key that could
      // carry one EXISTS on the shape. A future edit adding `expectedTotal`, `shortfall`,
      // `percentFunded` or a renamed cousin fails here … `classifyCycleOutcome` quarantines the
      // target by construction and this surface must not smuggle one past it."*
      //
      // ⭐⭐ **THREE SUCH KEYS NOW EXIST, EACH BY A TRUSTEE RULING** (`2026-09-07-204`), so a blanket
      // ban would forbid the ACs. ⇒ each exception NAMES its ruling, and a FOURTH — a shortfall, a
      // deficit, a `percentFunded`, a renamed cousin — still FAILS here and must come back to this
      // list with a decision id. ⭐ That is the property the original was protecting, kept intact.
      const RULED = new Set([
        // `-189` cl.2(b) — the ratified bar. ⚠ CONTRIBUTORS, ⛔ not rupees.
        'confirmedPercentage',
        // `-190` cl.6 — the ruled public money figure (`-189` cl.5: the boundary is newly crossed).
        'amountRaisedInr',
        // `-190` cl.7(b)/(c) — लक्ष्य, ⛔ `null` unless a `super_admin` revealed it for the Pariwar.
        'driveTargetInr',
      ]);
      const forbidden = /target|expected|shortfall|percent|ratio|remaining|deficit|goal/i;
      expect(
        Object.keys(row ?? {}).filter((k) => forbidden.test(k) && !RULED.has(k)),
      ).toEqual([]);
      // ⭐⭐ AND THE HALF THAT MATTERS MOST IS ASSERTED POSITIVELY: with ⛔ no visibility row for this
      // Pariwar — the ruled, fail-closed launch state — लक्ष्य is `null`. ⇒ ⛔ the quarantine still
      // holds for the figure it was actually protecting.
      expect(row?.driveTargetInr).toBeNull();
    });

    // ⭐⛔ THE ZERO-EXPECTATION DRIVE SAYS NOTHING (Review finding, 2026-08-27; ✅ RULED BigDev
    // 2026-08-27).
    //
    // ⚠ AND IT IS REACHABLE ON THE ORDINARY PATH, which is why the first review pass's deferral —
    // "unreachable; assignments are written at spawn, well before a pool can close" — did ⛔ not
    // hold. `pool/assign.ts:147` returns an empty assignment on an empty roster (its own comment:
    // *"the common (B)-scope case"*), and `capacity[i] = floor(m/n) + (i < m % n)` gives 0 to the
    // trailing `n − m` pools whenever approved claims outnumber the assignable roster. Pools spawn
    // one per approved claim, independently of roster size.
    it('⭐ a drive with ZERO assigned members yields a NULL outcome — ⛔ never a vacuous fully_funded', async () => {
      const { client, tx } = getTx();
      const drive = await seedDrive(tx, PARIWAR_A, { fixedAmount: 100, assignedMembers: 0 });

      await enterAppScope(client, PARIWAR_A);
      const row = (
        await poolDomain.listPublicSahyogDrivePools(tx, ids.pariwarId(PARIWAR_A), { limit: 50 })
      ).find((r) => r.poolId === drive.poolId);

      // ⛔ The row still EXISTS — no expectation is not a reason to hide a drive.
      expect(row).toBeDefined();
      expect(row?.confirmedContributionCount).toBe(0);
      // ⛔ NOT 'fully_funded'. `0 >= 0` is vacuously true, and publishing "the cycle closed with
      // the support it needed" for a drive that collected nothing is a false statement about money
      // on the one surface whose premise is that its statements can be checked.
      expect(row?.fundingOutcome).toBeNull();
    });
  });
});
