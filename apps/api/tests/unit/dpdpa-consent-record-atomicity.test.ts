// DPDPA consent RECORD atomicity — DB-free unit test (Story 6.9 code review gap-closure).
//
// Verifies the property that no live-DB test can deterministically force: when a LATER grant in
// the checked-boxes loop fails, the handler must (1) never reach the `claim.projectClaimState`
// identity-event emission (the event's own contract is "consent recorded" never means "nothing
// was granted" — a partial grant set must not look like a real grant set), and (2) close the
// scope-tx with `commit=false` so the real Postgres transaction rolls back the earlier grant(s)
// too. `audit.withCompensatingAudit`'s own rollback/compensating-line protocol is already
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
    body: {
      claimTimeDpdpa: true,
      sahyogVivranPublication: true,
      inMemoriamListing: false,
      sahyogDrivePublication: false,
      locale: 'en',
    },
  } as unknown as FastifyRequest;
}

function fakeReply(): FastifyReply {
  return { status: vi.fn().mockReturnThis() } as unknown as FastifyReply;
}

describe('dpdpa-consent record() — atomicity when a later grant fails', () => {
  it('stops after the failing grant, never emits the identity event, and rolls back the scope-tx', async () => {
    lockClaimCase.mockResolvedValue({
      deceasedMemberId: DECEASED_MEMBER_ID,
      currentState: 'documents_pending',
      intakeChannels: ['member_app'],
      claimantActorId: null,
    });
    // Two boxes checked (claim_time_dpdpa + sahyog_vivran_publication) → two recordConsent calls.
    // The FIRST succeeds; the SECOND rejects (simulating a real mid-loop DB failure).
    recordConsent
      .mockResolvedValueOnce({ consentId: 'row-1' })
      .mockRejectedValueOnce(new Error('simulated mid-loop DB failure on grant 2'));
    openScopeTx.mockResolvedValue({ client: {}, tx: {}, pariwarId: PARIWAR_ID, scopeSet: true });
    closeScopeTx.mockResolvedValue(undefined);

    const deps = { servicePool: {} } as unknown as AppDeps;
    const handlers = createDpdpaConsentHandlers(deps);

    await expect(handlers.recordMember(fakeRequest(), fakeReply())).rejects.toThrow(
      'simulated mid-loop DB failure on grant 2',
    );

    // Exactly two attempts (stopped at the failing grant — never reached a hypothetical 3rd).
    expect(recordConsent).toHaveBeenCalledTimes(2);
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

    expect(recordConsent).toHaveBeenCalledTimes(2);
    expect(projectClaimState).toHaveBeenCalledTimes(1);
    expect(closeScopeTx).toHaveBeenCalledWith(expect.anything(), true);
  });
});
