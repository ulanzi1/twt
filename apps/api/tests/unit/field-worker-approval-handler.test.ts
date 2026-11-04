// Story 13.1a (Task 6.2 unit leg; AD3, AD7, TR6; I3) — the approval handler, driven directly with the domain commands, the audit
// wrapper, the keyed store, the scope tx and the display-name read stubbed. Pins what HTTP cannot read: BOTH commands receive the
// gate's STORED `field_worker.approve` result (`toBe` — ⛔ a recomputation from `request.scopeGrants`); the two intents are nested
// in event order with the verified role; the idempotency key carries the WORKER id; an in-flight key is a 409 that writes nothing;
// the display name is read BEFORE the scope transaction opens; a missing gate fails loud.

import { rbac } from '@twt/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';

const calls = vi.hoisted(() => ({
  order: [] as string[],
  kyc: [] as unknown[],
  activate: [] as unknown[],
  intents: [] as { action: string; actorRole: unknown; resourceLocator: string }[],
  store: {
    claim: vi.fn<(key: string, ttlSeconds: number) => Promise<'acquired' | 'already_claimed'>>(async () => 'acquired'),
    getResult: vi.fn<(key: string) => Promise<Record<string, unknown> | null>>(async () => null),
    recordResult: vi.fn<(key: string, result: Record<string, unknown>) => Promise<void>>(async () => undefined),
    release: vi.fn<(key: string) => Promise<void>>(async () => undefined),
  },
  worker: { currentState: 'pending_kyc', district: 'Patna' } as { currentState: string; district: string } | null,
}));

vi.mock('@twt/domain', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@twt/domain')>();
  return {
    ...actual,
    fieldWorker: {
      ...actual.fieldWorker,
      getFieldWorker: vi.fn(async () => calls.worker),
      recordFieldWorkerKycCompleted: vi.fn(async (_c: unknown, input: unknown) => {
        calls.order.push('kyc');
        calls.kyc.push(input);
        return { eventId: 'e1', eventVersion: 2, fromState: 'pending_kyc', state: 'pending_kyc', kycStatus: 'completed', district: 'Patna' };
      }),
      activateFieldWorker: vi.fn(async (_c: unknown, input: unknown) => {
        calls.order.push('activate');
        calls.activate.push(input);
        return { eventId: 'e2', eventVersion: 3, fromState: 'pending_kyc', state: 'active', kycStatus: 'completed', district: 'Patna' };
      }),
    },
    audit: {
      ...actual.audit,
      withCompensatingAudit: vi.fn(async (_pool: unknown, args: { auditIntent: { action: string; actorRole: unknown; resourceLocator: string }; mutate: (a: { auditId: string }) => Promise<unknown> }) => {
        calls.order.push(`intent:${args.auditIntent.action}`);
        calls.intents.push(args.auditIntent);
        return args.mutate({ auditId: `audit-${calls.intents.length}` });
      }),
    },
    idempotency: { ...actual.idempotency, createKeyedStore: () => calls.store },
  };
});
vi.mock('../../src/modules/multi-tenant/scope-tx.js', () => ({
  openScopeTx: vi.fn(async (_deps: unknown, pariwarId: string) => {
    calls.order.push('open');
    return { pariwarId, scopeSet: true, tx: {}, client: {} };
  }),
  closeScopeTx: vi.fn(async (_tx: unknown, commit: boolean) => {
    calls.order.push(commit ? 'commit' : 'close');
  }),
}));
vi.mock('../../src/modules/auth/admin/admin-auth.repo.js', () => ({
  getDisplayName: vi.fn(async () => {
    calls.order.push('display');
    return 'Meera Approver';
  }),
}));

const { createFieldWorkerApprovalHandlers } = await import('../../src/modules/field-worker/approval-handlers.js');
const { getDisplayName } = await import('../../src/modules/auth/admin/admin-auth.repo.js');

const P = '11111111-1111-4111-8111-111111111111';
const ACTOR = '22222222-2222-4222-8222-222222222222';
const FW = '6BA7B810-9DAD-41D1-80B4-00C04FD430C8'; // upper-case on purpose: the handler brands it lower-case
const KEY = 'field_worker.approve';

const stored = (): rbac.VerifiedAuthorization =>
  rbac.authorize({
    actorId: ACTOR,
    grants: [{ pariwarId: P, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: P }],
    key: KEY,
    resource: { dimension: 'district', value: 'Patna', pariwarId: P },
  })!;

function fakeRequest(authorizations: Record<string, rbac.VerifiedAuthorization> | undefined, key: string | null = 'k-1'): FastifyRequest {
  return {
    headers: key === null ? {} : { 'idempotency-key': key },
    params: { pariwarId: P, fieldWorkerId: FW },
    body: {},
    requestContext: { actorId: ACTOR, pariwarId: P, traceId: 't' },
    scopeTx: { pariwarId: P, scopeSet: false, tx: {}, client: {} },
    scopeGrants: [{ pariwarId: P, role: 'district_admin', scopeDimension: 'district', scopeValue: 'Patna' }],
    authorizations,
  } as unknown as FastifyRequest;
}

function fakeReply(): FastifyReply & { sent: unknown; status: number } {
  const reply = {
    sent: undefined as unknown,
    status: 0,
    code(s: number) {
      reply.status = s;
      return reply;
    },
    send(b: unknown) {
      reply.sent = b;
      return reply;
    },
  };
  return reply as unknown as FastifyReply & { sent: unknown; status: number };
}

const deps = { pool: {}, servicePool: {}, encryption: {} } as never;

afterEach(() => {
  calls.order.length = 0;
  calls.kyc.length = 0;
  calls.activate.length = 0;
  calls.intents.length = 0;
  calls.worker = { currentState: 'pending_kyc', district: 'Patna' };
  for (const fn of Object.values(calls.store)) fn.mockClear();
  calls.store.claim.mockImplementation(async () => 'acquired');
  calls.store.getResult.mockImplementation(async () => null);
  vi.mocked(getDisplayName).mockReset();
  vi.mocked(getDisplayName).mockImplementation(async () => {
    calls.order.push('display');
    return 'Meera Approver';
  });
});

describe('the approval handler (AD3, AD7)', () => {
  it('BOTH commands receive the gate’s stored result (toBe); the intents nest in event order with the verified role; the display name is read before the transaction opens; the 200 is the second command’s return', async () => {
    const authorization = stored();
    const reply = fakeReply();
    await createFieldWorkerApprovalHandlers(deps).approve(fakeRequest({ [KEY]: authorization }), reply);
    expect(reply.status).toBe(200);
    expect(reply.sent).toEqual({ field_worker_id: FW.toLowerCase(), district: 'Patna', current_state: 'active', kyc_status: 'completed' });
    expect((calls.kyc[0] as { authorization: unknown }).authorization).toBe(authorization);
    expect((calls.activate[0] as { authorization: unknown }).authorization).toBe(authorization);
    expect(calls.activate[0]).toMatchObject({ approvedByDisplay: 'Meera Approver', auditId: 'audit-2', fieldWorkerId: FW.toLowerCase() });
    expect(calls.kyc[0]).toMatchObject({ auditId: 'audit-1' });
    expect(calls.order).toEqual(['display', 'open', 'intent:field_worker.kyc_completed', 'kyc', 'intent:field_worker.activated', 'activate', 'commit', 'close']);
    expect(calls.intents.map((i) => [i.action, i.actorRole, i.resourceLocator])).toEqual([
      ['field_worker.kyc_completed', 'pariwar_admin', `field_worker/${FW.toLowerCase()}`],
      ['field_worker.activated', 'pariwar_admin', `field_worker/${FW.toLowerCase()}`],
    ]);
  });

  it('TR6 — the idempotency key carries the WORKER id (lower-cased) after the Pariwar and the actor', async () => {
    await createFieldWorkerApprovalHandlers(deps).approve(fakeRequest({ [KEY]: stored() }, 'my-key'), fakeReply());
    expect(calls.store.claim).toHaveBeenCalledWith(`field_worker.approve:${P}:${ACTOR}:${FW.toLowerCase()}:my-key`, 86_400);
  });

  it('a key still IN FLIGHT ⇒ 409 field_worker.idempotency_in_progress; nothing read, opened or written; the claim is not released', async () => {
    calls.store.claim.mockImplementation(async () => 'already_claimed');
    const err = await createFieldWorkerApprovalHandlers(deps).approve(fakeRequest({ [KEY]: stored() }), fakeReply()).catch((e: unknown) => e);
    expect(err).toMatchObject({ statusCode: 409, code: 'field_worker.idempotency_in_progress' });
    expect(calls.order).toEqual([]);
    expect(calls.store.release).not.toHaveBeenCalled();
  });

  it('a worker not awaiting approval ⇒ 409 illegal_transition with NO intent line; a missing one ⇒ 404 (a lost race)', async () => {
    calls.worker = { currentState: 'active', district: 'Patna' };
    const e1 = await createFieldWorkerApprovalHandlers(deps).approve(fakeRequest({ [KEY]: stored() }), fakeReply()).catch((e: unknown) => e);
    expect(e1).toMatchObject({ statusCode: 409, code: 'field_worker.illegal_transition' });
    expect(calls.intents).toEqual([]);
    calls.worker = null;
    const e2 = await createFieldWorkerApprovalHandlers(deps).approve(fakeRequest({ [KEY]: stored() }, 'k-2'), fakeReply()).catch((e: unknown) => e);
    expect(e2).toMatchObject({ statusCode: 404, code: 'field_worker.not_found' });
  });

  it('a missing display name ⇒ 409 admin.display_name_missing BEFORE any transaction or line', async () => {
    vi.mocked(getDisplayName).mockImplementation(async () => null);
    const err = await createFieldWorkerApprovalHandlers(deps).approve(fakeRequest({ [KEY]: stored() }), fakeReply()).catch((e: unknown) => e);
    expect(err).toMatchObject({ statusCode: 409, code: 'admin.display_name_missing' });
    expect(calls.order).toEqual([]);
  });

  it('no stored authorization (the route forgot its gate) ⇒ a loud Error; no command is called', async () => {
    await expect(createFieldWorkerApprovalHandlers(deps).approve(fakeRequest(undefined), fakeReply())).rejects.toThrow(/without the field_worker.approve gate/);
    expect(calls.kyc).toEqual([]);
  });
});
