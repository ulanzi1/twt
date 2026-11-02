// Story 6.22 DL9 (b) / (e) — the convergence handlers answer the fraud register's new refusals as 409s, ⛔ 500s (code review 2026-11-02, RB5).
//
// Three arms were added to `claims.convergence.handlers.ts` and only one had an HTTP test:
//   · `confirmMerge`: the candidate re-read UNDER the intake lock (`IntakeMergeTargetNotCandidateError`) ⇒ 409 `convergence.invalid_candidate`
//     — a race the handler's own earlier candidate check cannot produce, so no HTTP request can reach it deterministically;
//   · `overrideConvergence`: the claim door's refusal (`ClaimIntakeRefusedError`) ⇒ 409 `claim.intake_refused` WITH its reason;
//   · `overrideConvergence`: a `closed` against-claim (`IntakeOverrideAgainstClosedClaimError`) ⇒ 409 `convergence.against_claim_closed`
//     (also asserted over HTTP in `fraud-investigation-routes.spec.ts`).
// The domain calls are stubbed (precedent: `vi.mock('@twt/domain')` in this folder), each arm has a CONTROL where the same stubbed call
// succeeds, and an error that is NOT one of these is rethrown untouched (the handler must not swallow a real failure into a 409).

import { claim } from '@twt/domain';
import type { FastifyRequest } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppDeps } from '../../src/context.js';
import { createConvergenceHandlers } from '../../src/modules/claims/claims.convergence.handlers.js';

vi.mock('@twt/domain', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@twt/domain')>();
  return {
    ...actual,
    claim: {
      ...actual.claim,
      getIntakeAttempt: vi.fn(),
      getConvergenceCandidate: vi.fn(),
      getClaimCase: vi.fn(),
      convergeIntakeAttempt: vi.fn(),
      overrideIntakeAttempt: vi.fn(),
    },
  };
});

const PID = '11111111-1111-4111-8111-111111111111';
const MEMBER = '22222222-2222-4222-8222-222222222222';
const ATTEMPT = '33333333-3333-4333-8333-333333333333';
const CLAIM = '44444444-4444-4444-8444-444444444444';
const OPERATOR = '55555555-5555-4555-8555-555555555555';

const audited: unknown[] = [];
const deps = { auditSink: { emit: (e: unknown) => audited.push(e) }, clock: () => new Date('2026-11-02T00:00:00Z') } as unknown as AppDeps;
const handlers = createConvergenceHandlers(deps);

function req(body: Record<string, unknown>): FastifyRequest {
  return {
    body,
    scopeTx: { pariwarId: PID, tx: {}, client: {} },
    requestContext: { actorId: OPERATOR, pariwarId: PID, traceId: 'trace' },
  } as unknown as FastifyRequest;
}

const pendingAttempt = { attemptStatus: 'pending', deceasedMemberId: MEMBER, intakeChannel: 'helpline', claimantActorId: null };

async function refusal(p: Promise<unknown>): Promise<{ statusCode: number; code: string; details?: unknown } | 'resolved'> {
  return p.then(
    () => 'resolved' as const,
    (e: { statusCode?: number; code?: string; details?: unknown }) => {
      if (typeof e.statusCode !== 'number') throw e; // not an HTTP error: the test must see it as itself
      return { statusCode: e.statusCode, code: e.code as string, ...(e.details !== undefined ? { details: e.details } : {}) };
    },
  );
}

describe('Story 6.22 — confirmMerge: the candidate re-read under the intake lock (DL9 (e))', () => {
  const merge = () => handlers.confirmMerge(req({ intakeAttemptId: ATTEMPT, claimCaseId: CLAIM }));

  beforeEach(() => {
    vi.mocked(claim.getIntakeAttempt).mockResolvedValue(pendingAttempt as never);
    // The handler's OWN earlier check passes (the claim IS the candidate when it reads) …
    vi.mocked(claim.getConvergenceCandidate).mockResolvedValue({ claimCaseId: CLAIM } as never);
  });

  it('⭐ … and a finding that closed it before the lock ⇒ 409 `convergence.invalid_candidate`, ⛔ a 500', async () => {
    vi.mocked(claim.convergeIntakeAttempt).mockRejectedValue(new claim.IntakeMergeTargetNotCandidateError(CLAIM));
    expect(await refusal(merge())).toMatchObject({ statusCode: 409, code: 'convergence.invalid_candidate' });
  });

  it('the CONTROL — the same stubbed call succeeding is a normal merge result', async () => {
    vi.mocked(claim.convergeIntakeAttempt).mockResolvedValue({ merged: false, intakeChannels: ['helpline'] } as never);
    expect(await merge()).toEqual({ merged: false, claimCaseId: CLAIM, intakeChannels: ['helpline'] });
  });

  it('any OTHER failure is rethrown untouched (⛔ swallowed into a 409)', async () => {
    const boom = new Error('boom');
    vi.mocked(claim.convergeIntakeAttempt).mockRejectedValue(boom);
    await expect(merge()).rejects.toBe(boom);
  });
});

describe('Story 6.22 — overrideConvergence: the door and a closed against-claim (DL9 (b))', () => {
  const override = () => handlers.overrideConvergence(req({ intakeAttemptId: ATTEMPT, againstClaimCaseId: CLAIM, reason: 'a separate case' }));

  beforeEach(() => {
    audited.length = 0;
    vi.mocked(claim.getIntakeAttempt).mockResolvedValue(pendingAttempt as never);
    vi.mocked(claim.getClaimCase).mockResolvedValue({ deceasedMemberId: MEMBER } as never);
  });

  it('⭐ the claim door refusing ⇒ 409 `claim.intake_refused` carrying the REASON (staff see it), ⛔ a 500', async () => {
    vi.mocked(claim.overrideIntakeAttempt).mockRejectedValue(new claim.ClaimIntakeRefusedError(MEMBER, 'erased'));
    expect(await refusal(override())).toMatchObject({ statusCode: 409, code: 'claim.intake_refused', details: { reason: 'erased' } });
  });

  it('⭐ a CLOSED against-claim ⇒ 409 `convergence.against_claim_closed`, ⛔ a 500', async () => {
    vi.mocked(claim.overrideIntakeAttempt).mockRejectedValue(new claim.IntakeOverrideAgainstClosedClaimError(CLAIM));
    expect(await refusal(override())).toMatchObject({ statusCode: 409, code: 'convergence.against_claim_closed' });
  });

  it('the CONTROL — the same stubbed call succeeding overrides and audits', async () => {
    vi.mocked(claim.overrideIntakeAttempt).mockResolvedValue({ newClaimCaseId: CLAIM, state: 'intake_pending' } as never);
    expect(await override()).toEqual({ overridden: true, newClaimCaseId: CLAIM, state: 'intake_pending' });
    expect(audited).toHaveLength(1);
  });

  it('any OTHER failure is rethrown untouched (⛔ swallowed into a 409)', async () => {
    const boom = new Error('boom');
    vi.mocked(claim.overrideIntakeAttempt).mockRejectedValue(boom);
    await expect(override()).rejects.toBe(boom);
  });
});
