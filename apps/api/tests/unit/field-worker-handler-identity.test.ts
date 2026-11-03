// Story 13.1 (AC8 (g); QE18, TR13) — the registration handler passes the gate's STORED authorization to the domain command,
// IDENTICAL (`toBe`) to `request.authorizations['field_worker.register']` — ⛔ a recomputation from `request.scopeGrants`, which
// could disagree with the gate and write a false record into an append-only log. An `app.inject` test cannot read the
// request, so this drives the handler directly with the domain command, the audit wrapper, the store, the scope tx, the
// crypto and the door stubbed. Also pins the audit intent's `actorRole` (the same object's role) and that the handler FAILS
// LOUD when the route forgot the gate.

import { rbac } from '@twt/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';

const calls = vi.hoisted(() => ({ register: [] as unknown[], intent: [] as unknown[] }));

vi.mock('@twt/domain', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@twt/domain')>();
  return {
    ...actual,
    fieldWorker: {
      ...actual.fieldWorker,
      assertDistrictRecorded: vi.fn(async () => undefined),
      findLiveFieldWorkerByMobileIndex: vi.fn(async () => null),
      registerFieldWorker: vi.fn(async (_client: unknown, input: unknown) => {
        calls.register.push(input);
        return { eventId: 'e', eventVersion: 1, state: 'pending_kyc', kycStatus: 'pending' };
      }),
    },
    audit: {
      ...actual.audit,
      withCompensatingAudit: vi.fn(async (_pool: unknown, args: { auditIntent: unknown; mutate: (a: { auditId: string }) => Promise<unknown> }) => {
        calls.intent.push(args.auditIntent);
        return args.mutate({ auditId: '0d4b8e2a-1c3f-4a5b-9c6d-7e8f9a0b1c2d' });
      }),
    },
    idempotency: {
      ...actual.idempotency,
      createKeyedStore: () => ({
        claim: async () => 'claimed',
        getResult: async () => null,
        recordResult: async () => undefined,
        release: async () => undefined,
      }),
    },
  };
});
vi.mock('../../src/modules/multi-tenant/scope-tx.js', () => ({
  openScopeTx: vi.fn(async (_deps: unknown, pariwarId: string) => ({
    pariwarId,
    scopeSet: true,
    tx: {},
    client: { query: vi.fn(async () => ({ rows: [{ now: new Date('2026-11-03T06:00:00Z') }] })) },
  })),
  closeScopeTx: vi.fn(async () => undefined),
}));
vi.mock('../../src/modules/auth/admin/admin-auth.repo.js', () => ({ getDisplayName: vi.fn(async () => 'Asha Verma') }));
vi.mock('../../src/modules/field-worker/field-worker-crypto.js', () => ({
  sealFieldWorkerIdentity: vi.fn(async () => ({ nameCiphertext: 'enc:v1:n', mobileCiphertext: 'enc:v1:m', mobileBlindIndex: 'idx' })),
}));
vi.mock('../../src/modules/field-worker/attribution-code-access.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/modules/field-worker/attribution-code-access.js')>();
  return { ...actual, allocateAttributionCodeForRequest: vi.fn(async () => ({ attributionCodeId: 'a', code: '482913', allocatedAt: new Date(), attempts: 1 })) };
});

const { createFieldWorkerHandlers } = await import('../../src/modules/field-worker/handlers.js');

const P = '11111111-1111-1111-1111-111111111111';
const ACTOR = '22222222-2222-4222-8222-222222222222';

function fakeRequest(authorizations: Record<string, rbac.VerifiedAuthorization> | undefined): FastifyRequest {
  return {
    headers: { 'idempotency-key': 'k-1' },
    body: { name: 'Vikram Singh', mobile: '9876543210', district: 'Patna' },
    requestContext: { actorId: ACTOR, pariwarId: P, traceId: 't' },
    scopeTx: { pariwarId: P, scopeSet: false, tx: {}, client: {} },
    // A DIFFERENT grant set on purpose: a recomputation from it would yield another role (district_admin).
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
  calls.register.length = 0;
  calls.intent.length = 0;
});

describe('the registration handler hands on the gate’s VERIFIED result (AC8 (g))', () => {
  it('the object passed to registerFieldWorker IS request.authorizations[\'field_worker.register\'] (toBe) — and the intent’s actorRole is its role', async () => {
    const stored = rbac.authorize({
      actorId: ACTOR,
      grants: [{ pariwarId: P, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: P }],
      key: 'field_worker.register',
      resource: { dimension: 'district', value: 'Patna', pariwarId: P },
    })!;
    const reply = fakeReply();
    await createFieldWorkerHandlers(deps).register(fakeRequest({ 'field_worker.register': stored }), reply);
    expect(reply.status).toBe(201);
    expect(calls.register).toHaveLength(1);
    expect((calls.register[0] as { authorization: unknown }).authorization).toBe(stored);
    expect((calls.intent[0] as { actorRole: unknown }).actorRole).toBe('pariwar_admin');
    expect(reply.sent).toEqual({ field_worker_id: expect.any(String), district: 'Patna', current_state: 'pending_kyc', kyc_status: 'pending' });
  });

  it('no stored authorization (the route forgot its gate) ⇒ a loud 500-class Error, and the command is never called', async () => {
    await expect(createFieldWorkerHandlers(deps).register(fakeRequest(undefined), fakeReply())).rejects.toThrow(/without the field_worker.register gate/);
    expect(calls.register).toEqual([]);
  });
});
