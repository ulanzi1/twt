// Fixed-amount schedule — live-DB integration (Story 7.5, Task 7; AC2/AC3/AC4/AC5/AC6).
//
// The DB shell of the effective-dated fixed-amount schedule, against real Postgres under PARIWAR_A
// inside the per-test BEGIN/ROLLBACK envelope. The load-bearing proofs (the ACs' teeth):
//   · (a) snapshot-at-committed_at — planCycleSpawn resolves + snapshots the amount effective at the
//        cycle-freeze `committed_at`, retiring the env constant (AC2).
//   · (b) NON-RETROACTIVITY — a future-dated change does NOT alter an already-spawned pool's snapshot
//        (AC4). Structural (a new schedule row is only ever read by a FUTURE spawn); this is its teeth.
//   · (c) emergency atomicity — applyEmergencyOverride writes the schedule row AND its immutable
//        Emergency Adjustment Record together; the record references the schedule version; a
//        change_type='emergency' row without its attestation is impossible (AC3).
//   · (d) the 90-day notice floor — rejected for a short-notice standard change, bypassed for emergency
//        (AC4). ⚠ Its accepted case is deliberately one the SUPERSEDED 365-day floor would have
//        REJECTED, so the suite proves the floor MOVED, not merely that a floor exists (Story 7.11 AC10).
//   · (h) the emergency BACKDATING bound — measured against the amount IN FORCE, never the open head
//        (Decisions `2026-08-16-124` clause 6 / `2026-08-16-125`).
//   · (f) fail-loud — getEffectiveFixedAmount throws when no entry is effective (never a silent default).
//
// Heeds [[project_live_db_test_gotchas]]: asserts MEMBERSHIP / explicit values, never regenerates an
// applied migration, seeds under superuser (RLS bypassed) then reads back under app scope.

import { randomUUID } from 'node:crypto';

import { and, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import type { Db } from '../../../src/db.js';
import { cycleFreezeCommitId as toCycleId, poolId as toPoolId, userId as toUserId } from '../../../src/ids/index.js';
import {
  applyEmergencyOverride,
  assertFixedAmountPanelAuthorized,
  getEffectiveFixedAmount,
  getEmergencyAttestation,
  planCycleSpawn,
  PoolFixedAmountEmergencyBackdatedBeforeHeadError,
  PoolFixedAmountNoticeTooShortError,
  PoolFixedAmountNotConfiguredError,
  PoolFixedAmountPanelMemberUnauthorizedError,
  resolveEligibleFixedAmountAttestors,
  scheduleStandardChange,
  spawnChildPool,
} from '../../../src/pool/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope, seedRoleGrant } from '../_helpers.js';

const COMMITTED_AT = new Date('2026-07-15T06:00:00Z');
const DAY_MS = 24 * 60 * 60 * 1000;

async function seedSchedule(tx: Db, amount: number, effectiveFrom: Date): Promise<void> {
  await tx.insert(schema.poolFixedAmountSchedule).values({
    pariwarId: PARIWAR_A,
    version: 1,
    fixedAmount: amount,
    effectiveFrom,
    effectiveUntil: null,
    changeType: 'standard',
    createdByActor: 'system:test-seed',
  });
}

async function seedCommit(tx: Db, cycleId: string, claimIds: string[]): Promise<void> {
  await tx.insert(schema.cycleFreezeCommits).values({
    commitId: toCycleId(cycleId),
    pariwarId: PARIWAR_A,
    actorId: 'trustee-actor-1',
    actorDisplay: 'Trustee One',
    committedClaimIds: claimIds,
    committedAt: COMMITTED_AT,
  });
}

describe.skipIf(!hasDatabase)('fixed-amount schedule (PARIWAR_A scope)', () => {
  setupLiveDb();

  it('(a) planCycleSpawn snapshots the amount effective at committed_at', async () => {
    const { client, tx } = getTx();
    const cycleId = randomUUID();
    const claimIds = [randomUUID()];
    // Effective 2026-01-01 → in force at the 2026-07-15 committed_at.
    await seedSchedule(tx, 777, new Date('2026-01-01T00:00:00Z'));
    await seedCommit(tx, cycleId, claimIds);
    await enterAppScope(client, PARIWAR_A);

    const plan = await planCycleSpawn(tx, {
      pariwarId: PARIWAR_A,
      cycleId: toCycleId(cycleId),
      frozenClaims: claimIds.map((c) => ({ claimCaseId: c })),
    });
    expect(plan.children[0]!.fixedAmount).toBe(777);

    await spawnChildPool(client, plan.children[0]!);
    const [pool] = await tx
      .select({ fixedAmount: schema.pools.fixedAmount })
      .from(schema.pools)
      .where(eq(schema.pools.poolId, toPoolId(plan.children[0]!.poolId)));
    expect(pool!.fixedAmount).toBe(777);
  });

  it('(b) a future-dated change does NOT alter an already-spawned pool snapshot (non-retroactivity)', async () => {
    const { client, tx } = getTx();
    const cycleId = randomUUID();
    const claimIds = [randomUUID()];
    await seedSchedule(tx, 500, new Date('2026-01-01T00:00:00Z'));
    await seedCommit(tx, cycleId, claimIds);
    await enterAppScope(client, PARIWAR_A);

    // Spawn a pool → it snapshots 500 (effective at committed_at).
    const plan = await planCycleSpawn(tx, {
      pariwarId: PARIWAR_A,
      cycleId: toCycleId(cycleId),
      frozenClaims: claimIds.map((c) => ({ claimCaseId: c })),
    });
    const spec = plan.children[0]!;
    await spawnChildPool(client, spec);

    // Schedule a FUTURE change to 900 (well beyond the notice floor → passes).
    const now = new Date();
    await scheduleStandardChange(tx, {
      pariwarId: PARIWAR_A,
      fixedAmount: 900,
      effectiveFrom: new Date(now.getTime() + 400 * DAY_MS),
      actorId: 'trustee-actor-1',
    });

    // The already-spawned pool's amount is UNCHANGED (the change only affects future spawns).
    const [pool] = await tx
      .select({ fixedAmount: schema.pools.fixedAmount })
      .from(schema.pools)
      .where(eq(schema.pools.poolId, toPoolId(spec.poolId)));
    expect(pool!.fixedAmount).toBe(500);
    // And the amount effective AT the (past) committed_at is still 500.
    expect(await getEffectiveFixedAmount(tx, PARIWAR_A, COMMITTED_AT)).toBe(500);
  });

  it('(c) applyEmergencyOverride writes the schedule row AND its immutable attestation atomically', async () => {
    const { client, tx } = getTx();
    await seedSchedule(tx, 500, new Date('2026-01-01T00:00:00Z')); // genesis head to supersede
    await enterAppScope(client, PARIWAR_A);

    const { schedule: entry, attestation } = await applyEmergencyOverride(tx, {
      pariwarId: PARIWAR_A,
      fixedAmount: 650,
      effectiveFrom: new Date(),
      documentedReason: 'reserve adequacy — actuarial review',
      panel: [
        { actor_id: 'trustee-a', actor_display: 'Trustee A' },
        { actor_id: 'trustee-b', actor_display: 'Trustee B' },
      ],
      attestedByActor: 'trustee-a',
      attestedDisplay: 'Trustee A',
    });

    // The schedule row is the emergency head (v2 — superseded the seeded v1).
    expect(entry.changeType).toBe('emergency');
    expect(entry.version).toBe(2);
    expect(entry.fixedAmount).toBe(650);
    // The immutable record references THIS schedule version + denormalizes the amount + panel.
    expect(attestation.scheduleVersion).toBe(entry.version);
    expect(attestation.fixedAmount).toBe(650);
    expect(attestation.panel).toHaveLength(2);
    expect(attestation.documentedReason).toContain('reserve adequacy');

    // Both rows are durably present + linked — no emergency schedule row without its attestation.
    const emergencyRows = await tx
      .select({ version: schema.poolFixedAmountSchedule.version })
      .from(schema.poolFixedAmountSchedule)
      .where(
        and(
          eq(schema.poolFixedAmountSchedule.pariwarId, PARIWAR_A),
          eq(schema.poolFixedAmountSchedule.changeType, 'emergency'),
        ),
      );
    expect(emergencyRows.map((r) => r.version)).toContain(entry.version);
    const fetched = await getEmergencyAttestation(tx, PARIWAR_A, entry.version);
    expect(fetched).not.toBeNull();
    expect(fetched!.fixedAmount).toBe(650);
  });

  it('(d) the 90-day floor rejects a short-notice standard change but an emergency bypasses it', async () => {
    const { client, tx } = getTx();
    await seedSchedule(tx, 500, new Date('2026-01-01T00:00:00Z'));
    await enterAppScope(client, PARIWAR_A);
    const now = new Date();

    // Standard change only 10 days out → rejected (the 90-day notice floor, DB-authoritative).
    await expect(
      scheduleStandardChange(tx, {
        pariwarId: PARIWAR_A,
        fixedAmount: 600,
        effectiveFrom: new Date(now.getTime() + 10 * DAY_MS),
        actorId: 'trustee-actor-1',
      }),
    ).rejects.toBeInstanceOf(PoolFixedAmountNoticeTooShortError);

    // Standard change 120 days out → accepted.
    // ⛔ AC10 REVERT-SANITY: 120 days is deliberately INSIDE the superseded 365-day floor. Restore
    // FIXED_AMOUNT_NOTICE_DAYS to 365 and this write is REJECTED, so this case goes red. A case at
    // 400 days would have passed at BOTH floors and proved nothing about the change.
    const ok = await scheduleStandardChange(tx, {
      pariwarId: PARIWAR_A,
      fixedAmount: 600,
      effectiveFrom: new Date(now.getTime() + 120 * DAY_MS),
      actorId: 'trustee-actor-1',
    });
    expect(ok.changeType).toBe('standard');

    // Emergency effective immediately → accepted (no floor).
    const emg = await applyEmergencyOverride(tx, {
      pariwarId: PARIWAR_A,
      fixedAmount: 700,
      effectiveFrom: now,
      documentedReason: 'regulatory change',
      panel: [
        { actor_id: 'trustee-a', actor_display: 'Trustee A' },
        { actor_id: 'trustee-b', actor_display: 'Trustee B' },
      ],
      attestedByActor: 'trustee-a',
      attestedDisplay: 'Trustee A',
    });
    expect(emg.schedule.changeType).toBe('emergency');
  });

  it('(h) the emergency BACKDATING bound rejects an effective_from behind the amount IN FORCE', async () => {
    // Decision `2026-08-16-124` clause 6, as clarified by `2026-08-16-125`. ⚠ A backdating bound, NOT
    // a notice floor — an emergency taking effect NOW is still accepted (proved by (d) above).
    const { client, tx } = getTx();
    const inForceFrom = new Date('2026-01-01T00:00:00Z');
    await seedSchedule(tx, 500, inForceFrom);
    await enterAppScope(client, PARIWAR_A);

    const panel = [
      { actor_id: 'trustee-a', actor_display: 'Trustee A' },
      { actor_id: 'trustee-b', actor_display: 'Trustee B' },
    ];

    // A day BEHIND the in-force amount → rejected.
    await expect(
      applyEmergencyOverride(tx, {
        pariwarId: PARIWAR_A,
        fixedAmount: 700,
        effectiveFrom: new Date(inForceFrom.getTime() - DAY_MS),
        documentedReason: 'reserve adequacy',
        panel,
        attestedByActor: 'trustee-a',
        attestedDisplay: 'Trustee A',
      }),
    ).rejects.toBeInstanceOf(PoolFixedAmountEmergencyBackdatedBeforeHeadError);

    // EXACTLY at the in-force effective_from → accepted (the bound is inclusive).
    const ok = await applyEmergencyOverride(tx, {
      pariwarId: PARIWAR_A,
      fixedAmount: 700,
      effectiveFrom: inForceFrom,
      documentedReason: 'reserve adequacy',
      panel,
      attestedByActor: 'trustee-a',
      attestedDisplay: 'Trustee A',
    });
    expect(ok.schedule.changeType).toBe('emergency');
  });

  it('(g) an emergency effective_from preceding a pending FUTURE standard change closes that change at its OWN effective_from — never inverted', async () => {
    // Review-hardening regression: closeOpenHead used to set the row it was closing's
    // effective_until to the NEW row's effective_from unconditionally. When the new write's
    // effective_from precedes the open head it is closing (exactly this scenario — an immediate
    // emergency superseding an already-scheduled future standard change), that produced an
    // INVERTED window (effective_from > effective_until) on the closed row. The fix closes at
    // max(newEffectiveFrom, openHead.effectiveFrom) instead — a zero-width, well-formed, moot
    // window on the row being superseded before it ever took effect.
    const { client, tx } = getTx();
    await seedSchedule(tx, 500, new Date('2026-01-01T00:00:00Z'));
    await enterAppScope(client, PARIWAR_A);
    const now = new Date();

    // Schedule a FUTURE standard change (400 days out) — becomes the open head (v2).
    // ⚠ Story 7.11: this is ALSO the case Decision `2026-08-16-125` settles — the emergency below
    // precedes the OPEN HEAD but not the amount IN FORCE, so the backdating bound must ACCEPT it.
    const future = await scheduleStandardChange(tx, {
      pariwarId: PARIWAR_A,
      fixedAmount: 900,
      effectiveFrom: new Date(now.getTime() + 400 * DAY_MS),
      actorId: 'trustee-actor-1',
    });
    expect(future.effectiveUntil).toBeNull();

    // An emergency fires NOW — its effective_from precedes v2's effective_from.
    const emg = await applyEmergencyOverride(tx, {
      pariwarId: PARIWAR_A,
      fixedAmount: 750,
      effectiveFrom: now,
      documentedReason: 'reserve adequacy',
      panel: [
        { actor_id: 'trustee-a', actor_display: 'Trustee A' },
        { actor_id: 'trustee-b', actor_display: 'Trustee B' },
      ],
      attestedByActor: 'trustee-a',
      attestedDisplay: 'Trustee A',
    });
    expect(emg.schedule.changeType).toBe('emergency');
    expect(emg.schedule.effectiveUntil).toBeNull(); // the emergency is the new open head

    // v2 (the pending standard change) is closed at ITS OWN effective_from — zero-width, NOT
    // inverted (effective_from === effective_until, never effective_from > effective_until).
    const [supersededRow] = await tx
      .select({
        effectiveFrom: schema.poolFixedAmountSchedule.effectiveFrom,
        effectiveUntil: schema.poolFixedAmountSchedule.effectiveUntil,
      })
      .from(schema.poolFixedAmountSchedule)
      .where(
        and(
          eq(schema.poolFixedAmountSchedule.pariwarId, PARIWAR_A),
          eq(schema.poolFixedAmountSchedule.version, future.version),
        ),
      );
    expect(supersededRow!.effectiveUntil).not.toBeNull();
    expect(supersededRow!.effectiveUntil!.getTime()).toBe(supersededRow!.effectiveFrom.getTime());

    // Story 7.11 review D3: v1 (genesis — the amount actually IN FORCE at `now`, distinct from v2 the
    // open head) must ALSO be re-clamped, to the EMERGENCY's effective_from, not left pointing at v2's
    // now-moot effective_from. Before the fix, v1.effective_until stayed at v2.effectiveFrom (400 days
    // out), overlapping the new emergency row's [now, ∞) window for the entire gap.
    const [genesisRow] = await tx
      .select({
        effectiveFrom: schema.poolFixedAmountSchedule.effectiveFrom,
        effectiveUntil: schema.poolFixedAmountSchedule.effectiveUntil,
      })
      .from(schema.poolFixedAmountSchedule)
      .where(and(eq(schema.poolFixedAmountSchedule.pariwarId, PARIWAR_A), eq(schema.poolFixedAmountSchedule.version, 1)));
    expect(genesisRow!.effectiveUntil).not.toBeNull();
    expect(genesisRow!.effectiveUntil!.getTime()).toBe(now.getTime());
    expect(genesisRow!.effectiveUntil!.getTime()).not.toBe(future.effectiveFrom.getTime());

    // The now-moot v2 window can never resolve — asOf === its effective_from does NOT match it
    // (the window predicate is `from <= asOf < until`, and here `until === from`).
    expect(await getEffectiveFixedAmount(tx, PARIWAR_A, future.effectiveFrom)).toBe(750); // the emergency wins

    // No overlap: at any instant strictly between `now` and v2's (moot) effective_from, ONLY the
    // emergency resolves — v1's window no longer reaches that far. Point-in-time resolution was
    // already correct via the effective_from DESC tie-break; this proves the STORED windows agree.
    expect(await getEffectiveFixedAmount(tx, PARIWAR_A, new Date(now.getTime() + DAY_MS))).toBe(750);
  });

  it('(f) getEffectiveFixedAmount throws when no entry is effective (fail loud, never a silent default)', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await expect(getEffectiveFixedAmount(tx, PARIWAR_A, COMMITTED_AT)).rejects.toBeInstanceOf(
      PoolFixedAmountNotConfiguredError,
    );
  });
});

// ── Story 10.13 — the emergency attesting panel's ELIGIBILITY (AC2/AC3) ─────────────────────────
//
// ⚠ THE LOAD-BEARING PROOF IS THE CROSS-TENANT ONE. Before this story the emergency path's only
// identity check was `SELECT display_name FROM users WHERE id = $1` on the UNSCOPED pool against a
// GLOBAL table, so an admin of ANOTHER Pariwar sailed onto this Pariwar's IMMUTABLE attestation
// record. A same-tenant-only test would have passed against that broken behaviour too
// ([[feedback_gate_scope_semantic_coverage]] — a green scan proves nothing).
//
// Seeds run BEFORE `enterAppScope` (as the Docker superuser, RLS bypassed) so BOTH tenants' grants
// land; the reads then happen under app scope so RLS is genuinely exercised. Membership is asserted,
// never counts ([[project_live_db_test_gotchas]]).

/** Seed a users row WITH a display name (the base helper leaves it null). */
async function seedNamedUser(tx: Db, id: string, displayName: string | null): Promise<string> {
  await tx
    .insert(schema.users)
    .values({ id: toUserId(id), identityType: 'admin', status: 'active', displayName })
    .onConflictDoNothing();
  return id;
}

/** Seed an eligible attestor at `pariwarId`: a users row with a display name + a key-carrying grant. */
async function seedAttestor(
  tx: Db,
  pariwarId: string,
  opts: { displayName?: string | null; role?: string; scopeDimension?: 'pariwar' | 'state'; scopeValue?: string } = {},
): Promise<string> {
  const uid = randomUUID();
  await seedNamedUser(tx, uid, opts.displayName === undefined ? `Trustee ${uid.slice(0, 4)}` : opts.displayName);
  await seedRoleGrant(tx, pariwarId, {
    userId: uid,
    role: opts.role ?? 'trustee_panel',
    scopeDimension: opts.scopeDimension ?? 'pariwar',
    scopeValue: opts.scopeValue ?? pariwarId,
  });
  return uid;
}

describe.skipIf(!hasDatabase)('Story 10.13 — emergency attesting-panel eligibility (PARIWAR_A scope)', () => {
  setupLiveDb();

  it('ACCEPTS a panel whose every member holds the emergency key at this Pariwar', async () => {
    const { client, tx } = getTx();
    const a = await seedAttestor(tx, PARIWAR_A);
    const b = await seedAttestor(tx, PARIWAR_A, { role: 'pariwar_admin' });
    await enterAppScope(client, PARIWAR_A);

    await expect(assertFixedAmountPanelAuthorized(client, PARIWAR_A, [a, b])).resolves.toBeUndefined();
  });

  it('REFUSES a member whose grant does not carry the emergency key', async () => {
    const { client, tx } = getTx();
    const a = await seedAttestor(tx, PARIWAR_A);
    // `verifier` is a real seeded role and deliberately holds neither fixed-amount key.
    const b = await seedAttestor(tx, PARIWAR_A, { role: 'verifier' });
    await enterAppScope(client, PARIWAR_A);

    await expect(assertFixedAmountPanelAuthorized(client, PARIWAR_A, [a, b])).rejects.toMatchObject({
      name: 'PoolFixedAmountPanelMemberUnauthorizedError',
      actorId: b,
    });
  });

  it('⭐ REFUSES a CROSS-TENANT holder — the exact case the pre-10.13 code let through', async () => {
    const { client, tx } = getTx();
    const a = await seedAttestor(tx, PARIWAR_A);
    // A FULL, valid trustee_panel grant — but in PARIWAR_B. Under PARIWAR_A's scope, RLS makes it
    // invisible, so it folds to "no grants" and the pure predicate refuses.
    const outsider = await seedAttestor(tx, PARIWAR_B);
    await enterAppScope(client, PARIWAR_A);

    await expect(
      assertFixedAmountPanelAuthorized(client, PARIWAR_A, [a, outsider]),
    ).rejects.toBeInstanceOf(PoolFixedAmountPanelMemberUnauthorizedError);
  });

  it('⛔ a refused override writes NO schedule row and NO attestation row', async () => {
    const { client, tx } = getTx();
    const a = await seedAttestor(tx, PARIWAR_A);
    const outsider = await seedAttestor(tx, PARIWAR_B);
    await enterAppScope(client, PARIWAR_A);

    // The route asserts eligibility BEFORE calling applyEmergencyOverride, so the write never starts.
    await expect(
      assertFixedAmountPanelAuthorized(client, PARIWAR_A, [a, outsider]),
    ).rejects.toBeInstanceOf(PoolFixedAmountPanelMemberUnauthorizedError);

    const schedules = await tx
      .select({ version: schema.poolFixedAmountSchedule.version })
      .from(schema.poolFixedAmountSchedule)
      .where(eq(schema.poolFixedAmountSchedule.pariwarId, PARIWAR_A));
    const attestations = await tx
      .select({ version: schema.poolFixedAmountEmergencyAttestations.scheduleVersion })
      .from(schema.poolFixedAmountEmergencyAttestations)
      .where(eq(schema.poolFixedAmountEmergencyAttestations.pariwarId, PARIWAR_A));
    expect(schedules).toEqual([]);
    expect(attestations).toEqual([]);
  });

  it('an eligible panel still writes the schedule row AND its immutable record together', async () => {
    // The eligibility guard must not have broken the happy path it now fronts.
    const { client, tx } = getTx();
    const a = await seedAttestor(tx, PARIWAR_A);
    const b = await seedAttestor(tx, PARIWAR_A, { role: 'pariwar_admin' });
    await enterAppScope(client, PARIWAR_A);

    await assertFixedAmountPanelAuthorized(client, PARIWAR_A, [a, b]);
    const { schedule, attestation } = await applyEmergencyOverride(tx, {
      pariwarId: PARIWAR_A,
      fixedAmount: 720,
      effectiveFrom: COMMITTED_AT,
      documentedReason: 'Reserve adequacy review',
      panel: [
        { actor_id: a, actor_display: 'Trustee A' },
        { actor_id: b, actor_display: 'Trustee B' },
      ],
      attestedByActor: 'trustee-actor-1',
      attestedDisplay: 'Trustee One',
    });
    expect(schedule.changeType).toBe('emergency');
    expect(attestation.scheduleVersion).toBe(schedule.version);
    expect(attestation.panel.map((m) => m.actor_id).sort()).toEqual([a, b].sort());
  });
});

describe.skipIf(!hasDatabase)('Story 10.13 — the eligible-attestor directory (PARIWAR_A scope)', () => {
  setupLiveDb();

  it('returns key-holding actors with their display names, ordered deterministically', async () => {
    const { client, tx } = getTx();
    const a = await seedAttestor(tx, PARIWAR_A, { displayName: 'Alice Trustee' });
    const b = await seedAttestor(tx, PARIWAR_A, { displayName: 'Bharat Admin', role: 'pariwar_admin' });
    await enterAppScope(client, PARIWAR_A);

    const eligible = await resolveEligibleFixedAmountAttestors(tx, PARIWAR_A);
    // Membership, not counts — other suites may seed grants of their own.
    const ids = eligible.map((e) => e.actorId);
    expect(ids).toContain(a);
    expect(ids).toContain(b);
    expect(eligible.find((e) => e.actorId === a)?.displayName).toBe('Alice Trustee');
    // Deterministic, replayable order.
    expect([...ids]).toEqual([...ids].sort());
  });

  it('EXCLUDES an actor with no display name, even though they hold the key', async () => {
    // Not cosmetic: the write path resolves displays fail-closed, so offering such an actor in the
    // picker would offer a choice guaranteed to 409.
    const { client, tx } = getTx();
    const nameless = await seedAttestor(tx, PARIWAR_A, { displayName: null });
    await enterAppScope(client, PARIWAR_A);

    const eligible = await resolveEligibleFixedAmountAttestors(tx, PARIWAR_A);
    expect(eligible.map((e) => e.actorId)).not.toContain(nameless);
  });

  it('EXCLUDES an actor whose display name is whitespace-only', async () => {
    const { client, tx } = getTx();
    const blank = await seedAttestor(tx, PARIWAR_A, { displayName: '   ' });
    await enterAppScope(client, PARIWAR_A);

    const eligible = await resolveEligibleFixedAmountAttestors(tx, PARIWAR_A);
    expect(eligible.map((e) => e.actorId)).not.toContain(blank);
  });

  it('EXCLUDES a holder whose role does not carry the emergency key', async () => {
    const { client, tx } = getTx();
    const verifier = await seedAttestor(tx, PARIWAR_A, { role: 'verifier', displayName: 'V Erifier' });
    await enterAppScope(client, PARIWAR_A);

    const eligible = await resolveEligibleFixedAmountAttestors(tx, PARIWAR_A);
    expect(eligible.map((e) => e.actorId)).not.toContain(verifier);
  });

  it('⭐ EXCLUDES a CROSS-TENANT holder — the directory never leaks another Pariwar’s trustees', async () => {
    const { client, tx } = getTx();
    const outsider = await seedAttestor(tx, PARIWAR_B, { displayName: 'Other Pariwar Trustee' });
    await enterAppScope(client, PARIWAR_A);

    const eligible = await resolveEligibleFixedAmountAttestors(tx, PARIWAR_A);
    expect(eligible.map((e) => e.actorId)).not.toContain(outsider);
  });

  it('the directory and the assertion AGREE on a seeded eligible actor', async () => {
    // The picker is convenience and the assertion is the boundary, but a name the picker offers must
    // never be one the boundary refuses — that would be a surface that lies to the trustee.
    const { client, tx } = getTx();
    const a = await seedAttestor(tx, PARIWAR_A, { displayName: 'Alice Trustee' });
    const b = await seedAttestor(tx, PARIWAR_A, { displayName: 'Bharat Trustee' });
    await enterAppScope(client, PARIWAR_A);

    const eligible = await resolveEligibleFixedAmountAttestors(tx, PARIWAR_A);
    const offered = eligible.map((e) => e.actorId).filter((id) => id === a || id === b);
    expect(offered.sort()).toEqual([a, b].sort());
    await expect(assertFixedAmountPanelAuthorized(client, PARIWAR_A, offered)).resolves.toBeUndefined();
  });
});
