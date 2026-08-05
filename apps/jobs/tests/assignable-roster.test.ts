// Freeze-time assignable-roster resolver — orchestration unit tests (AI-7-2).
//
// WHY fakes (mirrors cycle-spawn.test.ts): this suite verifies the resolver's CONTROL FLOW ONLY —
// enumerate → evaluate-at-committed_at → filter-by-is_valid → fail-loud — with `@twt/validity-service`
// and the `@twt/domain` reads mocked. The genuine end-to-end behaviour (real members + real validity +
// spawn + resolve) is proven by the live-DB `assignable-roster.spec.ts`. No DATABASE_URL needed here.

import { randomUUID } from 'node:crypto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getValidityAtMock, listMemberIdsForPariwarMock, getCycleFreezeCommittedAtMock, withPariwarScopeMock } =
  vi.hoisted(() => ({
    getValidityAtMock: vi.fn(),
    listMemberIdsForPariwarMock: vi.fn(),
    getCycleFreezeCommittedAtMock: vi.fn(),
    withPariwarScopeMock: vi.fn(),
  }));

vi.mock('@twt/validity-service', () => ({
  getValidityAt: getValidityAtMock,
}));

vi.mock('@twt/domain', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@twt/domain')>();
  return {
    ...actual,
    withPariwarScope: withPariwarScopeMock,
    member: { ...actual.member, listMemberIdsForPariwar: listMemberIdsForPariwarMock },
    pool: { ...actual.pool, getCycleFreezeCommittedAt: getCycleFreezeCommittedAtMock },
  };
});

// Imported AFTER vi.mock so the module wires against the mocked surface above.
import {
  createAssignableRosterResolver,
  isMemberAssignable,
  type AssignableRosterResolverDeps,
} from '../src/assignable-roster.js';
import type { MemberValidityPayload } from '@twt/validity-service';

/** A minimal validity payload for the predicate/filter — only the fields the resolver reads matter. */
function payload(overrides: Partial<MemberValidityPayload>): MemberValidityPayload {
  return { isValid: false, isAssignable: false, ...overrides } as MemberValidityPayload;
}

const COMMITTED_AT = new Date('2026-05-01T00:00:00.000Z');

function makeDeps(): AssignableRosterResolverDeps {
  // withPariwarScope is mocked to invoke its callback with a placeholder db, so no real pool is touched.
  return { pool: {} as AssignableRosterResolverDeps['pool'] };
}

beforeEach(() => {
  vi.resetAllMocks();
  withPariwarScopeMock.mockImplementation(
    async (_pool: unknown, _pariwarId: unknown, fn: (db: unknown) => unknown) => fn({}),
  );
});

describe('isMemberAssignable — the AI-7-2 predicate, as AMENDED by Story 10.17 (is_assignable ONLY)', () => {
  it('is TRUE for is_assignable (regardless of active-in-grace — grace members stay on the roster)', () => {
    expect(isMemberAssignable(payload({ isAssignable: true }))).toBe(true);
    // active-in-grace: is_assignable stays true, so the member IS assignable (the ratified boundary).
    expect(
      isMemberAssignable(
        payload({
          isValid: true,
          isAssignable: true,
          isActive: false, // in grace a member can be valid-but-not-narrowly-active
          vyawasthaShulkStatus: { paidThrough: null, daysUntilLapse: -3, inRenewalGrace: true, graceRemainingDays: 5 },
        }),
      ),
    ).toBe(true);
  });

  it('is FALSE when is_assignable is false, and never inspects is_active/grace subfields to override that', () => {
    // is_active TRUE but is_assignable FALSE → still not assignable (the predicate reads ONE field).
    expect(isMemberAssignable(payload({ isAssignable: false, isActive: true }))).toBe(false);
  });

  // ── THE STORY 10.17 CASES — the two booleans DIVERGING ────────────────────────────────────────
  //
  // These two cases are the whole amendment. Before 10.17 they could not be written: `is_valid` was
  // the roster predicate, so `isValid` and assignability were the same fact and neither payload below
  // was constructible. A reviewer should read them as the executable form of the AI-7-2 amendment.

  it('a SUSPENDED member — is_valid FALSE, is_assignable TRUE — IS assignable', () => {
    // The constitutional correction. A suspension removes the entitlement to RECEIVE support
    // (`is_valid: false`, coverage), never the obligation to CONTRIBUTE toward the Pariwar while
    // completing an available restoration path (Niyamavali §3.3). If this ever returns `false`
    // again, the Niyamavali's own primary restoration path (R7(A): three CONSECUTIVE contributions)
    // becomes unreachable and every suspension is a de-facto permanent ban.
    expect(isMemberAssignable(payload({ isValid: false, isAssignable: true }))).toBe(true);
  });

  it('a TERMINATED member — is_assignable FALSE — is NOT assignable, even on an otherwise-valid payload', () => {
    // The mirror image, and the reason the predicate is not simply `true`. A contradictory
    // `isValid: true` payload cannot occur in production (termination clears both), but pinning it
    // here proves the read is `is_assignable` ALONE and never falls back to `is_valid`.
    expect(isMemberAssignable(payload({ isValid: true, isAssignable: false }))).toBe(false);
  });
});

describe('createAssignableRosterResolver — enumerate → evaluate@committed_at → filter', () => {
  it('keeps only is_assignable members, evaluated at the freeze committed_at with { internal: true }', async () => {
    const pariwarId = randomUUID();
    const cycleId = randomUUID();
    const mValid1 = randomUUID();
    const mInvalid = randomUUID();
    const mValid2 = randomUUID();
    getCycleFreezeCommittedAtMock.mockResolvedValue(COMMITTED_AT);
    listMemberIdsForPariwarMock.mockResolvedValue([mValid1, mInvalid, mValid2]);
    getValidityAtMock.mockImplementation(async (_deps, ctx: { memberId: string }) =>
      // `isValid` is deliberately the INVERSE of `isAssignable` here: if the resolver ever regressed
      // to reading `is_valid`, this filter would return exactly the wrong member and fail loudly.
      payload({ isAssignable: ctx.memberId !== mInvalid, isValid: ctx.memberId === mInvalid }),
    );

    const resolver = createAssignableRosterResolver(makeDeps());
    const roster = await resolver({ pariwarId, cycleId });

    // Only the two valid members, in enumerated order; the invalid one filtered out.
    expect(roster).toEqual([mValid1, mValid2]);
    // Evaluated at the FROZEN instant (not now()), as a trusted internal system call.
    expect(getCycleFreezeCommittedAtMock).toHaveBeenCalledWith(expect.anything(), cycleId);
    expect(getValidityAtMock).toHaveBeenCalledTimes(3);
    for (const call of getValidityAtMock.mock.calls) {
      expect(call[2]).toBe(COMMITTED_AT); // the `at` argument
      expect(call[3]).toEqual({ internal: true }); // system actor, full unredacted payload
    }
  });

  it('returns [] for an empty membership (no members to evaluate)', async () => {
    getCycleFreezeCommittedAtMock.mockResolvedValue(COMMITTED_AT);
    listMemberIdsForPariwarMock.mockResolvedValue([]);

    const resolver = createAssignableRosterResolver(makeDeps());
    await expect(resolver({ pariwarId: randomUUID(), cycleId: randomUUID() })).resolves.toEqual([]);
    expect(getValidityAtMock).not.toHaveBeenCalled();
  });

  it('FAILS LOUD (rethrows) on a single per-member validity error — never a silently-dropped member', async () => {
    const cycleId = randomUUID();
    const mOk = randomUUID();
    const mBoom = randomUUID();
    getCycleFreezeCommittedAtMock.mockResolvedValue(COMMITTED_AT);
    listMemberIdsForPariwarMock.mockResolvedValue([mOk, mBoom]);
    const validityErr = new Error('validity read failed for member');
    getValidityAtMock.mockImplementation(async (_deps, ctx: { memberId: string }) => {
      if (ctx.memberId === mBoom) throw validityErr;
      return payload({ isAssignable: true });
    });

    const resolver = createAssignableRosterResolver(makeDeps());
    await expect(resolver({ pariwarId: randomUUID(), cycleId })).rejects.toBe(validityErr);
  });

  it('fails loud when the cycle-freeze commit row is missing (no committed_at) — never an empty roster', async () => {
    getCycleFreezeCommittedAtMock.mockResolvedValue(null);
    listMemberIdsForPariwarMock.mockResolvedValue([randomUUID()]);

    const resolver = createAssignableRosterResolver(makeDeps());
    await expect(resolver({ pariwarId: randomUUID(), cycleId: randomUUID() })).rejects.toThrow(
      /committed_at not found/,
    );
    // Never proceeded to evaluate any member.
    expect(getValidityAtMock).not.toHaveBeenCalled();
    expect(listMemberIdsForPariwarMock).not.toHaveBeenCalled();
  });
});
