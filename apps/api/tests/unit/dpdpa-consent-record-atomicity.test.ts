// DPDPA consent RECORD atomicity — DB-free unit test (Story 6.9 code review gap-closure).
//
// Verifies the property that no live-DB test can deterministically force: when a grant in the
// checked-boxes loop fails, the handler must (1) never reach the `claim.projectClaimState`
// identity-event emission (the event's own contract is "consent recorded" never means "nothing
// was granted" — a partial grant set must not look like a real grant set), and (2) close the
// scope-tx with `commit=false` so the real Postgres transaction rolls back any earlier grant too.
//
// ⚠⛔ RE-FIXTURED BY STORY 11b.9, AND ONE HALF OF THE ORIGINAL PROPERTY IS NOW UNREACHABLE — said
// plainly rather than papered over. The claim consent screen reduced to `claim_time_dpdpa` alone
// (`2026-08-28-162` cl.2), so `grantedTypesFromRequest` can yield AT MOST ONE type and "a LATER
// grant fails after an earlier one succeeded" can no longer be constructed THROUGH THE REQUEST.
// ⭐ What is still real, and still asserted: a failing grant must not emit the identity event and
// must close the scope-tx with commit=false. ⛔ The loop itself is unchanged — if a future story
// ever captures more than one type again, the multi-grant case becomes reachable and should be
// restored here rather than re-derived. `audit.withCompensatingAudit`'s own rollback/compensating-line protocol is already
// exhaustively unit-tested generically (packages/domain/tests/audit/compensating.test.ts) against
// a mocked DB writer — this test is scoped to THIS consumer's control flow, not that primitive.
//
// `audit.withCompensatingAudit` is replaced with a thin pass-through (call `mutate`, propagate any
// throw) rather than re-verified here — it doesn't touch a real DB, so no live connection needed.

import type { FastifyReply, FastifyRequest } from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import type { AppDeps } from '../../src/context.js';

const lockClaimCase = vi.fn();
const projectClaimState = vi.fn();
const recordConsent = vi.fn();
const consentExists = vi.fn();
const withCompensatingAudit = vi.fn(
  async (_pool: unknown, opts: { mutate: (arg: { auditId: string }) => Promise<unknown> }) =>
    opts.mutate({ auditId: 'fake-audit-id' }),
);

vi.mock('@twt/domain', async (importActual) => {
  const actual = await importActual<typeof import('@twt/domain')>();
  return {
    ...actual,
    claim: { ...actual.claim, lockClaimCase, projectClaimState },
    consent: { ...actual.consent, recordConsent, consentExists },
    audit: { ...actual.audit, withCompensatingAudit },
  };
});

const openScopeTx = vi.fn();
const closeScopeTx = vi.fn();
vi.mock('../../src/modules/multi-tenant/scope-tx.js', () => ({ openScopeTx, closeScopeTx }));

const emitAuthAudit = vi.fn();
vi.mock('../../src/modules/auth/shared/audit.js', () => ({ emitAuthAudit }));

const { createDpdpaConsentHandlers } = await import(
  '../../src/modules/claims/claims.dpdpa-consent.handlers.js'
);

const PARIWAR_ID = '11111111-1111-1111-1111-111111111111';
const CLAIM_CASE_ID = '22222222-2222-2222-2222-222222222222';
const DECEASED_MEMBER_ID = '33333333-3333-3333-3333-333333333333';

function fakeRequest(): FastifyRequest {
  return {
    requestContext: { traceId: 'trace-1', actorId: DECEASED_MEMBER_ID, pariwarId: PARIWAR_ID },
    params: { claimCaseId: CLAIM_CASE_ID },
    // ⭐ ONE box since 11b.9 — the three publication booleans were removed from the request, and
    // the contract is `.strict()`, so re-adding one here would be REJECTED, not ignored.
    body: {
      claimTimeDpdpa: true,
      locale: 'en',
    },
  } as unknown as FastifyRequest;
}

function fakeReply(): FastifyReply {
  return { status: vi.fn().mockReturnThis() } as unknown as FastifyReply;
}

describe('dpdpa-consent record() — atomicity when a grant fails', () => {
  it('stops at the failing grant, never emits the identity event, and rolls back the scope-tx', async () => {
    lockClaimCase.mockResolvedValue({
      deceasedMemberId: DECEASED_MEMBER_ID,
      currentState: 'documents_pending',
      intakeChannels: ['member_app'],
      claimantActorId: null,
    });
    // ⭐ ONE box checked (claim_time_dpdpa) → one recordConsent call, and it REJECTS (simulating a
    // real DB failure inside the grant loop).
    recordConsent
      .mockReset()
      .mockRejectedValueOnce(new Error('simulated mid-loop DB failure on grant 2'));
    openScopeTx.mockResolvedValue({ client: {}, tx: {}, pariwarId: PARIWAR_ID, scopeSet: true });
    closeScopeTx.mockResolvedValue(undefined);

    const deps = { servicePool: {} } as unknown as AppDeps;
    const handlers = createDpdpaConsentHandlers(deps);

    await expect(handlers.recordMember(fakeRequest(), fakeReply())).rejects.toThrow(
      'simulated mid-loop DB failure on grant 2',
    );

    // Exactly one attempt — stopped at the failing grant, and ⛔ nothing after it ran.
    expect(recordConsent).toHaveBeenCalledTimes(1);
    // The identity annotation must NEVER fire on a partial/failed grant set.
    expect(projectClaimState).not.toHaveBeenCalled();
    // consentExists (presenceView) is only reached after `ok = true` — never called either.
    expect(consentExists).not.toHaveBeenCalled();
    // The scope-tx closes with commit=false — the real Postgres ROLLBACK signal that undoes the
    // first (already-inserted) grant row too, since both ran on the SAME transaction.
    expect(closeScopeTx).toHaveBeenCalledWith(expect.anything(), false);
  });

  it('control case: all grants + the event succeed → commit=true, event fires exactly once', async () => {
    lockClaimCase.mockResolvedValue({
      deceasedMemberId: DECEASED_MEMBER_ID,
      currentState: 'documents_pending',
      intakeChannels: ['member_app'],
      claimantActorId: null,
    });
    recordConsent.mockReset().mockResolvedValue({ consentId: 'row-x' });
    projectClaimState.mockReset().mockResolvedValue(undefined);
    consentExists.mockReset().mockResolvedValue(false);
    openScopeTx.mockResolvedValue({ client: {}, tx: {}, pariwarId: PARIWAR_ID, scopeSet: true });
    closeScopeTx.mockReset().mockResolvedValue(undefined);

    const deps = { servicePool: {} } as unknown as AppDeps;
    const handlers = createDpdpaConsentHandlers(deps);

    await handlers.recordMember(fakeRequest(), fakeReply());

    expect(recordConsent).toHaveBeenCalledTimes(1);
    expect(projectClaimState).toHaveBeenCalledTimes(1);
    expect(closeScopeTx).toHaveBeenCalledWith(expect.anything(), true);
  });
});
