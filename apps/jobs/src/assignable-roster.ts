// Freeze-time assignable-roster resolver — AI-7-2 (discharges the Story 7.4 D2→B deferral).
//
// THE roster SUPPLY that Story 7.4 deferred. It builds the set of members a spawning cycle assigns to
// pools by enumerating the Pariwar's membership and keeping those the Story 4.6 Validity Service deems
// assignable AT the cycle-freeze `committed_at`. Injected into the spawn saga (`CycleSpawnDeps`) and
// resolved per-child in `runCycleSpawnChild`, its output threads into `spawnChildPool` as the real
// `memberSet`, so spawned pools finally carry non-empty `member_assignments` (closing the 7.4→7.6 loop).
//
// ── WHY this lives in apps/jobs, not @twt/domain ──────────────────────────────
// `@twt/domain` CANNOT import `@twt/validity-service` (the layering is validity-service → domain; the
// reverse is a turbo cycle). apps/jobs is a leaf app that MAY depend on both, so the verdict-filtered
// query lives here and hands `@twt/domain`'s validity-service-free `spawnChildPool` an already-resolved
// roster. This story is the FIRST apps/jobs import of `@twt/validity-service`.
//
// ── Determinism / re-derivability (the whole point; §1.11, Story 7.4 D1) ──────
// Validity is evaluated at the durable cycle-freeze `committed_at`, NEVER `now()`. A re-spawn of the same
// frozen cycle re-reads the identical instant → identical verdicts → identical roster → byte-identical
// assignments. Enumeration is ordered by `member_id`; the assignment engine re-canonicalises anyway, but
// the stable order keeps the roster itself replay-diffable.
//
// ── D2: cache-warmed O(N·M), via the ENGINE memo — NOT getValidityCached ──────
// The roster is resolved per-child (D2, bounded pg-boss payloads), so N children each re-evaluate the M
// members. The warming comes from the niyamavali-engine's per-clause keyedStore memo (Story 4.1), which
// `getValidityAt` uses natively: identical `(member_id, rule_registry_version, member_state_hash, at)` →
// a memo hit after the first child. We DELIBERATELY do NOT use `getValidityCached` (the Story 4.8
// cache-aside): it is a LIVE-`now()`-only path that takes no `at` and explicitly never caches historical
// reads (cache.ts) — using it would evaluate at `now()`, violating the frozen "NEVER now()" invariant.
// Story 7.9 owns the <60s p95 validation of this O(N·M) shape either way.
//
// ── Fail-loud on any per-member read failure ──────────────────────────────────
// Unlike a UI validity read, a SILENTLY-dropped member here misroutes real money — the member would
// resolve to `{ assigned: false }` and be told they have no pool. So a validity error for ANY member
// fails the WHOLE cycle (the error propagates, the child job retries/DLQs), never a partial roster.

import { ids, idempotency, member, pool as poolDomain, withPariwarScope } from '@twt/domain';
import { getValidityAt, type MemberValidityPayload, type ValidityServiceDeps } from '@twt/validity-service';
import type pg from 'pg';

type MemberId = ids.MemberId;

/**
 * D1 (ratified 2026-07-19): a member is ASSIGNABLE iff their Validity Service verdict at the cycle-freeze
 * instant has `is_valid === true` — INCLUDING active-in-grace members (grace does not clear `is_valid`).
 *
 * This is a THIN read of ONE payload field, sourced from the Story 4.6 verdict — never a reimplementation
 * of the eligibility logic behind it, and never an inspection of `is_active` / lock-in / grace /
 * suspension / renewal or any other subfield (the frozen assignability invariant; every one of those is
 * already folded into `is_valid`). A reviewer seeing any other subfield read on this path treats it as a
 * finding. [[project_assignability_predicate_is_isvalid_only]] / [[project_engine_never_infers_contribution_facts]].
 */
export function isMemberAssignable(payload: MemberValidityPayload): boolean {
  return payload.isValid;
}

/** The injected roster supplier — resolves the freeze-time assignable member-id set for a cycle. Async +
 *  DB-bound (contrast the pure `PoolAssignmentSeam`), so it is a dependency, not a payload field. Returns
 *  branded `MemberId`s (not bare `string`) — consistent with the branded-ID discipline used throughout
 *  this resolver (`ids.pariwarId`/`ids.memberId`/`ids.cycleFreezeCommitId`). */
export type AssignableRosterResolver = (input: {
  readonly pariwarId: string;
  readonly cycleId: string;
}) => Promise<readonly MemberId[]>;

/** Dependencies for {@link createAssignableRosterResolver}: the BYPASSRLS service pool boot.ts already
 *  threads into `CycleSpawnDeps.pool`. It doubles as `withPariwarScope`'s pool, the keyed-store's pool,
 *  and `ValidityServiceDeps.servicePool`. */
export interface AssignableRosterResolverDeps {
  readonly pool: pg.Pool;
}

/**
 * Build the freeze-time assignable-roster resolver (the factory mirrors `createPoolAssignmentSeam`). The
 * returned resolver, for a `(pariwarId, cycleId)`:
 *   1. opens a SHORT Pariwar-scoped read tx (`withPariwarScope` → RLS-set `db`) to read the cycle-freeze
 *      `committed_at` (fails loud if the commit row is absent) and enumerate every member id in the
 *      Pariwar (`member.listMemberIdsForPariwar`, ordered) — the connection is released immediately after,
 *   2. evaluates each member via ITS OWN short-lived scoped connection + `getValidityAt(...,
 *      committedAt, { internal: true })` — a system actor with no caller/RBAC context needs
 *      `internal: true`; it also returns the FULL unredacted payload the D1 predicate reads (`caller`
 *      could route through `redactForCaller` and strip `is_valid`),
 *   3. keeps the `is_valid` members (D1), returning them in the enumerated (member_id-ascending) order.
 *
 * Deliberately NOT one long-held connection across the whole loop: `getValidityAt`'s engine internally
 * issues its own `pool.connect()` calls (the per-clause keyed-store memo), so a single connection held for
 * every member would starve the small apps/jobs pool as soon as ≥2 children resolve concurrently.
 *
 * Any per-member validity error propagates (fail-loud — no silently-dropped member).
 */
export function createAssignableRosterResolver(deps: AssignableRosterResolverDeps): AssignableRosterResolver {
  return async ({ pariwarId, cycleId }) => {
    const brandedPariwarId = ids.pariwarId(pariwarId);

    // (1) Short-lived scoped read: the freeze instant + the full membership. The connection is
    // released immediately after (withPariwarScope commits + releases at the end of this callback)
    // — it must NOT be held across the per-member validity loop below. `getValidityAt`'s engine
    // internally issues its OWN `pool.connect()` calls for the per-clause keyed-store memo, and
    // holding this connection for the whole loop starves the (deliberately small) apps/jobs pool
    // the moment ≥2 children resolve concurrently (a verified deadlock — AI-7-2 review finding).
    const { committedAt, memberIds } = await withPariwarScope(deps.pool, pariwarId, async (db) => {
      const committedAt = await poolDomain.getCycleFreezeCommittedAt(db, cycleId);
      if (!committedAt) {
        // A cycle spawning MUST have a durable freeze commit — its absence is a corrupt/mis-scoped spawn,
        // not an empty roster. Fail loud (do not degrade to an empty roster, which would spawn empty pools).
        throw new Error(
          `[assignable-roster] cycle_freeze_commits.committed_at not found for cycle ${cycleId} ` +
            `(pariwar ${pariwarId}) — cannot resolve the assignable roster at the freeze instant`,
        );
      }
      return { committedAt, memberIds: await member.listMemberIdsForPariwar(db, brandedPariwarId) };
    });

    // (2) Evaluate each member's validity via its OWN short-lived scoped connection — never held
    // across the loop (see (1)). Serial (not Promise.all): the per-clause keyed-store memo warms
    // across members within the call, and a fail-loud posture wants the first error to stop the
    // cycle. Any throw here propagates.
    const assignable: MemberId[] = [];
    for (const memberId of memberIds) {
      const isAssignable = await withPariwarScope(deps.pool, pariwarId, async (db) => {
        // The engine DI: RLS-scoped `db` for THIS member's reads, an own-committing keyed store for
        // the per-clause memo (the D2 warming), and `deps.pool` as the BYPASSRLS service pool (unused
        // under internal:true, which skips the access audit, but required by the type).
        const validityDeps: ValidityServiceDeps = {
          db,
          keyedStore: idempotency.createKeyedStore(deps.pool),
          servicePool: deps.pool,
        };
        const payload = await getValidityAt(
          validityDeps,
          { pariwarId: brandedPariwarId, memberId },
          committedAt,
          { internal: true },
        );
        return isMemberAssignable(payload);
      });
      if (isAssignable) assignable.push(memberId);
    }
    return assignable;
  };
}
