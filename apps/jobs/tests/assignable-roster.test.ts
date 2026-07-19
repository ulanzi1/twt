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
  return { isValid: false, ...overrides } as MemberValidityPayload;
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

describe('isMemberAssignable — the D1 predicate (is_valid ONLY)', () => {
  it('is TRUE for is_valid (regardless of active-in-grace — D1 includes grace members)', () => {
    expect(isMemberAssignable(payload({ isValid: true }))).toBe(true);
    // active-in-grace: is_valid stays true, so the member IS assignable (the ratified D1 boundary).
    expect(
      isMemberAssignable(
        payload({
          isValid: true,
          isActive: false, // in grace a member can be valid-but-not-narrowly-active
          vyawasthaShulkStatus: { paidThrough: null, daysUntilLapse: -3, inRenewalGrace: true, graceRemainingDays: 5 },
        }),
      ),
    ).toBe(true);
  });

  it('is FALSE when is_valid is false, and never inspects is_active/grace subfields to override that', () => {
    // is_active TRUE but is_valid FALSE → still not assignable (predicate reads is_valid ONLY).
    expect(isMemberAssignable(payload({ isValid: false, isActive: true }))).toBe(false);
  });
});

describe('createAssignableRosterResolver — enumerate → evaluate@committed_at → filter', () => {
  it('keeps only is_valid members, evaluated at the freeze committed_at with { internal: true }', async () => {
    const pariwarId = randomUUID();
    const cycleId = randomUUID();
    const mValid1 = randomUUID();
    const mInvalid = randomUUID();
    const mValid2 = randomUUID();
    getCycleFreezeCommittedAtMock.mockResolvedValue(COMMITTED_AT);
    listMemberIdsForPariwarMock.mockResolvedValue([mValid1, mInvalid, mValid2]);
    getValidityAtMock.mockImplementation(async (_deps, ctx: { memberId: string }) =>
      payload({ isValid: ctx.memberId !== mInvalid }),
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
      return payload({ isValid: true });
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
