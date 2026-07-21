// UPI Failure Coach anonymous failure-report handler wiring — DB-free unit test (Story 8.5, Task 2/6; AC3).
//
// Proves the endpoint wiring without a live DB: (1) each of the five self-classified modes maps to the
// correct `member_contribution.failure_<mode>` audit action via `emitAuthAudit`; (2) the audit line carries
// NO context payload (the mode lives in the action name — no free-text, no UTR/tr/amount/VPA — the AC3/D2
// PII discipline); (3) the handler returns 204 (fire-and-forget shape); (4) it requires a member session
// (a missing actorId/pariwarId is the typed 401 — defense-in-depth behind requireMemberSession). Mirrors
// the `payment-contribution.test.ts` mocked-`@twt/domain` pattern (the module imports the domain barrel at
// top even though this handler never touches it).

import type { FastifyReply, FastifyRequest } from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import type { AppDeps } from '../../src/context.js';

vi.mock('@twt/domain', async (importActual) => {
  const actual = await importActual<typeof import('@twt/domain')>();
  return { ...actual };
});

const openScopeTx = vi.fn();
const closeScopeTx = vi.fn();
vi.mock('../../src/modules/multi-tenant/scope-tx.js', () => ({ openScopeTx, closeScopeTx }));

const { createPaymentHandlers } = await import('../../src/modules/payment/handlers.js');

const PARIWAR_ID = '11111111-1111-1111-1111-111111111111';
const MEMBER_ID = '22222222-2222-2222-2222-222222222222';

function fakeRequest(body: unknown, ctx?: Partial<FastifyRequest['requestContext']>): FastifyRequest {
  return {
    body,
    requestContext: { actorId: MEMBER_ID, pariwarId: PARIWAR_ID, traceId: 't', ...ctx },
    log: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
  } as unknown as FastifyRequest;
}

function fakeReply(): { reply: FastifyReply; status: ReturnType<typeof vi.fn>; send: ReturnType<typeof vi.fn> } {
  const send = vi.fn();
  const status = vi.fn(() => ({ send }));
  return { reply: { status } as unknown as FastifyReply, status, send };
}

function deps(emit = vi.fn()): { deps: AppDeps; emit: ReturnType<typeof vi.fn> } {
  return {
    deps: {
      clock: () => new Date('2026-07-21T00:00:00Z'),
      auditSink: { emit },
      encryption: {},
    } as unknown as AppDeps,
    emit,
  };
}

describe('payment reportFailure — the mode → audit-action mapping (AC3/D2)', () => {
  const CASES: ReadonlyArray<readonly [string, string]> = [
    ['insufficient_balance', 'member_contribution.failure_insufficient_balance'],
    ['wrong_pin', 'member_contribution.failure_wrong_pin'],
    ['app_issue', 'member_contribution.failure_app_issue'],
    ['network_issue', 'member_contribution.failure_network_issue'],
    ['other', 'member_contribution.failure_other'],
  ];

  for (const [mode, action] of CASES) {
    it(`mode '${mode}' → emits '${action}' (member-attributed, NO context payload) + returns 204`, async () => {
      vi.clearAllMocks();
      const { deps: d, emit } = deps();
      const { reply, status, send } = fakeReply();

      const h = createPaymentHandlers(d);
      await h.reportFailure(fakeRequest({ mode }), reply);

      // The mode lives ENTIRELY in the action name — the audit line is member-attributed (actorId=memberId,
      // pariwarId) but carries NO context (no free-text, no UTR/tr/amount/VPA — the anonymity teeth).
      expect(emit).toHaveBeenCalledTimes(1);
      const event = emit.mock.calls[0]![0] as Record<string, unknown>;
      expect(event.type).toBe(action);
      expect(event.actorId).toBe(MEMBER_ID);
      expect(event.pariwarId).toBe(PARIWAR_ID);
      expect(event.context).toBeUndefined();

      // Fire-and-forget 204 (no body).
      expect(status).toHaveBeenCalledWith(204);
      expect(send).toHaveBeenCalledTimes(1);
    });
  }
});

describe('payment reportFailure — requires a member session (AC3 / login-wall defense-in-depth)', () => {
  it('throws the typed 401 when the request has no member actor (never records anonymously-unattributed)', async () => {
    vi.clearAllMocks();
    const { deps: d, emit } = deps();
    const { reply } = fakeReply();

    const h = createPaymentHandlers(d);
    await expect(
      h.reportFailure(fakeRequest({ mode: 'network_issue' }, { actorId: undefined }), reply),
    ).rejects.toMatchObject({ code: 'auth.session_required' });
    // No audit line is emitted for an unauthenticated caller.
    expect(emit).not.toHaveBeenCalled();
  });
});
