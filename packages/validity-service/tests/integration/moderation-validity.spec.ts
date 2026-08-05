// Moderation → `is_valid` / `is_assignable` — live-DB integration (Story 10.10 Task 3 AC5; AMENDED by
// Story 10.17 AC7; :5433).
//
// ── ⚠ AMENDED BY STORY 10.17 — read this before trusting any comment below ────────────────────────
// Story 10.10's Decision 8 claimed the `deriveIsValid` conjunction was the ENTIRE enforcement surface
// for moderation, with pool assignability, claim eligibility and the rules engine all inheriting a
// suspension through `payload.isValid`. Only the FIRST of those three was ever true, and Story 10.17
// deliberately REVERSED it: a suspension must not remove a member from the DONOR ROSTER, because that
// made the Niyamavali's own restoration path (R7(A): three consecutive contributions) unreachable and
// turned every suspension into a de-facto permanent ban (Niyamavali §3.3).
//
// The two booleans now answer DIFFERENT questions and are free to diverge:
//   · `is_valid`      — COVERAGE: "covered for support if death today". Suspended ⇒ FALSE (unchanged).
//   · `is_assignable` — ROSTER:   "may be assigned to a contribution pool". Suspended ⇒ TRUE (NEW).
// `apps/jobs/src/assignable-roster.ts` reads `payload.isAssignable` and NOTHING else — still exactly
// ONE pre-derived field, so AI-7-2 is AMENDED, not violated.
//
// The catastrophic failure mode this spec was written to close still exists and still matters, but its
// statement changes with the predicate:
//
//   ⚠ A STALE VALIDITY CACHE WOULD MISREPORT A MEMBER'S STANDING TO EVERY DOWNSTREAM READER.
//
// If the Story 4.8 cache did not invalidate on a `member.moderation.*` append, a warm pre-suspension
// entry would keep answering `is_valid: true` for the whole TTL — telling a suspended member they are
// COVERED, which is precisely the falsehood Story 10.16's disclosure exists to prevent. (A stale entry
// would ALSO keep `is_assignable: true`, but that is now the correct answer for a suspension, so the
// roster is no longer the sharp edge here — coverage is.) So the cache test below is an AC, not a nicety.
//
// FINDING (recorded in the Dev Agent Record): NO new wiring was needed. Migration 0036's
// `member_validity_cache_invalidate_on_member_event` trigger fires
// `WHEN (NEW.event_type LIKE 'member.%')`, and `member.moderation.suspended` matches that prefix —
// so the three new event types were already covered by construction. This spec PROVES it rather
// than assuming it, and it is what would fail if someone ever narrowed that WHEN clause to an
// explicit event-type list.
//
// Own-committing (NOT setupLiveDb): the cache write + audit writer COMMIT their own tx; assertions
// key on our own rows, NEVER global counts ([[project_live_db_test_gotchas]]).

import { randomUUID } from 'node:crypto';

import { createDb, idempotency, ids, schema, type Db } from '@twt/domain';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { getValidity, getValidityCached, type ValidityServiceDeps } from '../../src/index.js';
import { R12_PAYLOAD } from '../fixtures/r12-clause.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);

describe.skipIf(!hasDatabase)('moderation folds into is_valid (live DB) (:5433)', () => {
  let db: Db;
  let pool: pg.Pool;
  let deps: ValidityServiceDeps;
  const pariwars: string[] = [];

  beforeAll(async () => {
    if (!hasDatabase) return;
    const created = createDb(DATABASE_URL as string);
    db = created.db;
    pool = created.pool;
    deps = { db, keyedStore: idempotency.createKeyedStore(pool), servicePool: pool };
  });

  afterAll(async () => {
    if (!hasDatabase) return;
    if (pariwars.length > 0) {
      // WARNING: `events_log` is APPEND-ONLY (AR-8 — a DELETE trips its own trigger), so seeded
      // events are deliberately left in place. Every test uses a fresh random pariwarId + memberId,
      // so the residue is unaddressable by any other test (assert membership, not counts).
      for (const t of ['member_validity_cache', 'cohort_invalidation_epochs', 'clause_versions', 'members']) {
        await pool.query(`DELETE FROM ${t} WHERE pariwar_id = ANY($1)`, [pariwars]);
      }
    }
    await pool.end();
  });

  async function seedEvent(
    pariwarId: ids.PariwarId,
    memberId: ids.MemberId,
    version: number,
    eventType: string,
    occurredAt: Date,
    payload: Record<string, unknown> = {},
  ): Promise<void> {
    await db.insert(schema.eventsLog).values({
      streamId: memberId,
      eventType,
      payload,
      eventVersion: version,
      actorId: null,
      pariwarId,
      occurredAt,
    });
  }

  /** A fresh tenant + an ACTIVE member (the chain that replays to `active`). */
  async function scenario(): Promise<{ pariwarId: ids.PariwarId; memberId: ids.MemberId; joinedAt: Date }> {
    const pariwarId = ids.pariwarId(randomUUID());
    const memberId = ids.memberId(randomUUID());
    pariwars.push(pariwarId);
    const joinedAt = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000);
    const at = (n: number): Date => new Date(joinedAt.getTime() + n * 1000);
    await seedEvent(pariwarId, memberId, 1, 'member.signup_initiated', joinedAt);
    await seedEvent(pariwarId, memberId, 2, 'member.kyc_completed', at(2));
    await seedEvent(pariwarId, memberId, 3, 'member.vyawastha_shulk_paid', at(3));
    await seedEvent(pariwarId, memberId, 4, 'member.lock_in_expired', at(4), { kyc_verified: true });
    return { pariwarId, memberId, joinedAt };
  }

  /**
   * Append a moderation event.
   *
   * WARNING: stamped in the recent PAST, not at `new Date()`. `getValidity` bounds the replay window
   * at the DB's `now()`, and the Node clock (in Docker, on macOS) can run a few ms AHEAD of
   * Postgres — an event stamped with the Node clock can land outside the window and be silently
   * skipped. The fold orders by `event_version` regardless, so back-dating changes nothing about the
   * outcome under test; it only removes the skew flake.
   */
  async function moderate(
    pariwarId: ids.PariwarId,
    memberId: ids.MemberId,
    version: number,
    eventType: string,
    reasonCode: string,
    from: string,
    to: string,
  ): Promise<void> {
    const occurredAt = new Date(Date.now() - 60_000 + version * 1000);
    await seedEvent(pariwarId, memberId, version, eventType, occurredAt, {
      from_state: 'active',
      to_state: 'active',
      trigger: 'test',
      actor: 'trustee',
      moderation_from: from,
      moderation_to: to,
      reason_code: reasonCode,
    });
  }

  async function cacheRowCount(memberId: ids.MemberId): Promise<number> {
    const res = await pool.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM member_validity_cache WHERE member_id = $1`,
      [memberId],
    );
    return res.rows[0]?.n ?? 0;
  }

  it('AC5: is_valid flips FALSE on suspend and TRUE again on restore', async () => {
    const { pariwarId, memberId } = await scenario();
    const ctx = { pariwarId, memberId };

    const before = await getValidity(deps, ctx, { internal: true });
    expect(before.isValid).toBe(true);
    expect(before.isActive).toBe(true);
    expect(before.specialFlags.some((f) => f.startsWith('suspended_per_'))).toBe(false);

    await moderate(pariwarId, memberId, 5, 'member.moderation.suspended', 'r14-forgery', 'none', 'suspended');
    const suspended = await getValidity(deps, ctx, { internal: true });
    expect(suspended.isValid).toBe(false);
    expect(suspended.isActive).toBe(false);
    // The `prd.md:411` flag form, MEMBER-VISIBLE so the member can be told why.
    expect(suspended.specialFlags).toContain('suspended_per_r14-forgery');

    await moderate(pariwarId, memberId, 6, 'member.moderation.restored', 'moderation-error', 'suspended', 'none');
    const restored = await getValidity(deps, ctx, { internal: true });
    expect(restored.isValid).toBe(true);
    expect(restored.isActive).toBe(true);
    expect(restored.specialFlags.some((f) => f.startsWith('suspended_per_'))).toBe(false);
  });

  it('AC5: a TERMINATION also flips is_valid false, with the terminated_per_ flag', async () => {
    const { pariwarId, memberId } = await scenario();
    await moderate(pariwarId, memberId, 5, 'member.moderation.suspended', 'r14-forgery', 'none', 'suspended');
    await moderate(pariwarId, memberId, 6, 'member.moderation.terminated', 'r14-forgery', 'suspended', 'terminated');

    const p = await getValidity(deps, { pariwarId, memberId }, { internal: true });
    expect(p.isValid).toBe(false);
    expect(p.specialFlags).toContain('terminated_per_r14-forgery');
  });

  it('AC5: is_valid falls ONLY because of the moderation conjunction — every lifecycle-derived field is byte-identical', async () => {
    // The orthogonality Decision 1 buys, asserted at the composition level: suspend a member, and
    // EVERY lifecycle-derived sub-object of the payload must come back unchanged. Only `isValid`,
    // `isActive` and the one added special flag may move. If a future edit ever routed moderation
    // through `members.state` instead of the overlay, the lock-in / renewal / retirement projections
    // would shift with it and this test would fail.
    //
    // The stronger end-to-end claim — that the `members.state` COLUMN never moves — is proven where
    // it can actually be observed: the apps/api integration spec drives the REAL projector and reads
    // the column back, and the domain unit test pins the reducer identity structurally. This spec
    // seeds raw events (no projector), so there is no `members` row here to inspect.
    const { pariwarId, memberId } = await scenario();
    const ctx = { pariwarId, memberId };

    const before = await getValidity(deps, ctx, { internal: true });
    await moderate(pariwarId, memberId, 5, 'member.moderation.suspended', 'r14-forgery', 'none', 'suspended');
    const after = await getValidity(deps, ctx, { internal: true });

    expect(before.isValid).toBe(true);
    expect(after.isValid).toBe(false);

    // Story 10.17 — `isAssignable` is in the MUST-NOT-MOVE set under a SUSPENSION. It is not merely
    // "lifecycle-derived and therefore untouched": it is the one field whose deliberate REFUSAL to
    // move here is the story. A diff that makes this line fail has re-broken the restoration path.
    expect(after.isAssignable).toBe(true);
    expect(after.isAssignable).toBe(before.isAssignable);

    // Everything lifecycle-derived is untouched.
    expect(after.lockInStatus).toEqual(before.lockInStatus);
    expect(after.vyawasthaShulkStatus).toEqual(before.vyawasthaShulkStatus);
    expect(after.retirementCoverage).toEqual(before.retirementCoverage);
    expect(after.medicalDisclosureFlags).toEqual(before.medicalDisclosureFlags);
    expect(after.applicableNiyamavaliClauses).toEqual(before.applicableNiyamavaliClauses);
    // The ONLY special-flag delta is the moderation entry.
    expect(after.specialFlags.filter((f) => !f.startsWith('suspended_per_'))).toEqual(before.specialFlags);
  });

  it('AC5/10.17-AC7: under TERMINATION, `isAssignable` IS explicitly allowed to move — the mirror of the suspension case', async () => {
    // The mirror of the test above, and the reason that one is a real assertion rather than a
    // tautology. `isAssignable` sits in the MUST-NOT-MOVE set for a suspension and in the
    // EXPLICITLY-ALLOWED-TO-MOVE set for a termination. Pinning both directions is what makes the
    // pair meaningful: a predicate hardcoded to `true` would pass the suspension test and fail here;
    // a predicate that still read `is_valid` would fail the suspension test and pass here.
    const { pariwarId, memberId } = await scenario();
    const ctx = { pariwarId, memberId };

    const before = await getValidity(deps, ctx, { internal: true });
    expect(before.isAssignable).toBe(true);

    await moderate(pariwarId, memberId, 5, 'member.moderation.suspended', 'r14-forgery', 'none', 'suspended');
    await moderate(pariwarId, memberId, 6, 'member.moderation.terminated', 'r14-forgery', 'suspended', 'terminated');
    const after = await getValidity(deps, ctx, { internal: true });

    // The allowed movers under termination.
    expect(after.isAssignable).toBe(false);
    expect(after.isValid).toBe(false);
    expect(after.isActive).toBe(false);
    expect(after.specialFlags).toContain('terminated_per_r14-forgery');

    // …and everything lifecycle-derived is STILL untouched (Decision 1 orthogonality holds for
    // termination exactly as it does for suspension — `members.state` never moves for either).
    expect(after.lockInStatus).toEqual(before.lockInStatus);
    expect(after.vyawasthaShulkStatus).toEqual(before.vyawasthaShulkStatus);
    expect(after.retirementCoverage).toEqual(before.retirementCoverage);
    expect(after.medicalDisclosureFlags).toEqual(before.medicalDisclosureFlags);
    expect(after.applicableNiyamavaliClauses).toEqual(before.applicableNiyamavaliClauses);
  });

  // ── ⚠ THE WORST FAILURE MODE — the stale-cache test (AC5) ────────────────────────────────────

  it('AC5: a WARM cache does NOT survive a suspension — a stale is_valid:true is impossible', async () => {
    const { pariwarId, memberId } = await scenario();
    const ctx = { pariwarId, memberId };

    // (1) Warm the cache with a pre-suspension read. This is the dangerous state: a live entry
    //     saying `is_valid: true`, well inside its TTL.
    const warm = await getValidityCached(deps, ctx, { internal: true });
    expect(warm.isValid).toBe(true);
    expect(await cacheRowCount(memberId)).toBeGreaterThan(0);

    // (2) Suspend. The migration-0036 AFTER-INSERT trigger on events_log fires
    //     `WHEN (NEW.event_type LIKE 'member.%')` — which `member.moderation.suspended` matches —
    //     and DELETEs this member's cache rows in the SAME tx as the append.
    await moderate(pariwarId, memberId, 5, 'member.moderation.suspended', 'r7-contribution-discipline', 'none', 'suspended');
    expect(await cacheRowCount(memberId)).toBe(0);

    // (3) The next CACHED read must recompute and answer FALSE on COVERAGE. If this ever returns
    //     true, a suspended member is told they are covered for support — the exact falsehood the
    //     Story 10.16 disclosure exists to prevent. (Pre-10.17 the stated harm was "the roster would
    //     hand them a pool slot"; that is now the CORRECT outcome, so the sharp edge moved to
    //     coverage. The recompute is what protects both.)
    const afterSuspend = await getValidityCached(deps, ctx, { internal: true });
    expect(afterSuspend.isValid).toBe(false);
    // Story 10.17 — the recompute must also carry the ROSTER answer, and for a suspension it is TRUE.
    // Extending the worst-failure-mode test to the new field means a cache-shape regression cannot
    // quietly drop it: an absent/false `isAssignable` here would silently un-do the unblock.
    expect(afterSuspend.isAssignable).toBe(true);
    expect(afterSuspend.specialFlags).toContain('suspended_per_r7-contribution-discipline');

    // (4) …and a restore invalidates again, so the member is not stuck invalid either.
    await moderate(pariwarId, memberId, 6, 'member.moderation.restored', 'rule-clearance', 'suspended', 'none');
    expect(await cacheRowCount(memberId)).toBe(0);
    expect((await getValidityCached(deps, ctx, { internal: true })).isValid).toBe(true);
  });

  it('AC5: the cached answer is IDENTICAL to a fresh recompute (hit ≡ recompute, under moderation)', async () => {
    const { pariwarId, memberId } = await scenario();
    const ctx = { pariwarId, memberId };
    await moderate(pariwarId, memberId, 5, 'member.moderation.suspended', 'regulator-action', 'none', 'suspended');

    const cached = await getValidityCached(deps, ctx, { internal: true });
    const fresh = await getValidity(deps, ctx, { internal: true });
    expect(cached.isValid).toBe(fresh.isValid);
    expect(cached.specialFlags).toEqual(fresh.specialFlags);
    expect(cached.validityPayloadHash).toBe(fresh.validityPayloadHash);
  });

  // ── AC5: the no-downstream-change property ───────────────────────────────────────────────────

  it('AC5/10.17-AC7: a suspended member STAYS assignable through `is_assignable`, while `is_valid` still drops', async () => {
    // ── THE AI-7-2 AMENDMENT, IN TEST FORM (Story 10.17 D2) ──────────────────────────────────────
    //
    // This test previously read: "a suspended member drops out of assignability through `is_valid`
    // ALONE". That was Story 10.10's deliberate behaviour, and it was WRONG — not as an
    // implementation bug, but as a constitutional one. `is_valid` was the sole assignability
    // predicate; pool assignment is the ONLY contribution path (fenced by Story 8.10); and six of the
    // seven R7 restoration clauses can only be cleared BY CONTRIBUTING. So a suspension silently
    // became a permanent ban, and the Niyamavali's own primary restoration path was unreachable.
    //
    // Story 10.17 reverses it: a suspension removes the entitlement to RECEIVE support, never the
    // obligation to CONTRIBUTE while completing an available restoration path (Niyamavali §3.3).
    // This test is REWRITTEN rather than deleted precisely because that history is the point — a
    // green suite reached by deletion is indistinguishable from one reached by correctness.
    //
    // `apps/jobs/src/assignable-roster.ts` computes assignability as EXACTLY `payload.isAssignable`
    // — never `is_valid`, never `is_active`, never a lock-in/grace/suspension subfield (AI-7-2 as
    // amended, [[project_assignability_predicate_is_isvalid_only]]). This test replicates that ONE
    // predicate here rather than importing apps/jobs (a package cannot depend on an app).
    const assignable = (p: { isAssignable: boolean }): boolean => p.isAssignable;

    const { pariwarId, memberId } = await scenario();
    const ctx = { pariwarId, memberId };

    // (1) Baseline: an unmoderated active member is both covered and on the roster.
    const before = await getValidity(deps, ctx, { internal: true });
    expect(assignable(before)).toBe(true);
    expect(before.isValid).toBe(true);

    // (2) SUSPEND — the divergence. Coverage drops; the roster does NOT. They contribute; they are
    //     not covered. That single line is the entire story.
    await moderate(pariwarId, memberId, 5, 'member.moderation.suspended', 'r14-forgery', 'none', 'suspended');
    const suspended = await getValidity(deps, ctx, { internal: true });
    expect(assignable(suspended)).toBe(true); // ← REVERSED from Story 10.10, deliberately
    expect(suspended.isValid).toBe(false); // ← UNCHANGED: coverage is still withdrawn

    // (3) TERMINATE — the mirror image, and why the predicate is not simply `true`. Termination is an
    //     exceptional governance act, not a stronger suspension: it DOES remove the roster.
    await moderate(pariwarId, memberId, 6, 'member.moderation.terminated', 'r14-forgery', 'suspended', 'terminated');
    const terminated = await getValidity(deps, ctx, { internal: true });
    expect(assignable(terminated)).toBe(false);
    expect(terminated.isValid).toBe(false);

    // (4) RESTORE — both come back together.
    await moderate(pariwarId, memberId, 7, 'member.moderation.restored', 'trustee-discretion', 'terminated', 'none');
    const restored = await getValidity(deps, ctx, { internal: true });
    expect(assignable(restored)).toBe(true);
    expect(restored.isValid).toBe(true);
  });

  void R12_PAYLOAD; // the R12 clause is not seeded here — validity resolves without it (clause_unavailable).
});
