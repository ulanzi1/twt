// Story 13.1 (AC8 (g); QE18, TR13) — the registration handler passes the gate's STORED authorization to the domain command,
// IDENTICAL (`toBe`) to `request.authorizations['field_worker.register']` — ⛔ a recomputation from `request.scopeGrants`, which
// could disagree with the gate and write a false record into an append-only log. An `app.inject` test cannot read the
// request, so this drives the handler directly with the domain command, the audit wrapper, the store, the scope tx, the
// crypto and the door stubbed. Also pins the audit intent's `actorRole` (the same object's role) and that the handler FAILS
// LOUD when the route forgot the gate.
//
// Review R1 — the idempotency branches the HTTP specs cannot cheaply force (the in-flight claim, the over-200-character key),
// driven through a controllable store stub. Review R3 — the ORDER: the admin's display name is read BEFORE the scope
// transaction opens (it takes a connection from the same pool the transaction holds one of), and a refused body opens none.

import { rbac } from '@twt/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';

const calls = vi.hoisted(() => ({
  register: [] as unknown[],
  intent: [] as unknown[],
  // The idempotency store's four calls, controllable per leg (review R1); `afterEach` puts them back to "a fresh claim".
  store: {
    claim: vi.fn<(key: string, ttlSeconds: number) => Promise<'acquired' | 'already_claimed'>>(async () => 'acquired'),
    getResult: vi.fn<(key: string) => Promise<Record<string, unknown> | null>>(async () => null),
    recordResult: vi.fn<(key: string, result: Record<string, unknown>) => Promise<void>>(async () => undefined),
    release: vi.fn<(key: string) => Promise<void>>(async () => undefined),
  },
}));

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
      createKeyedStore: () => calls.store,
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
const { registrationDistrict } = await import('../../src/modules/field-worker/routes.js');
const { openScopeTx } = await import('../../src/modules/multi-tenant/scope-tx.js');
const { getDisplayName } = await import('../../src/modules/auth/admin/admin-auth.repo.js');
const { fieldWorker } = await import('@twt/domain');

const P = '11111111-1111-1111-1111-111111111111';
const ACTOR = '22222222-2222-4222-8222-222222222222';
const KEY = 'field_worker.register';

const storedAuthorization = (): rbac.VerifiedAuthorization =>
  rbac.authorize({
    actorId: ACTOR,
    grants: [{ pariwarId: P, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: P }],
    key: KEY,
    resource: { dimension: 'district', value: 'Patna', pariwarId: P },
  })!;

/** `key`: the Idempotency-Key header (`null` = absent); `body`: fields laid over the valid default body. */
function fakeRequest(
  authorizations: Record<string, rbac.VerifiedAuthorization> | undefined,
  opts: { key?: string | null; body?: Record<string, unknown> } = {},
): FastifyRequest {
  const key = opts.key === undefined ? 'k-1' : opts.key;
  return {
    headers: key === null ? {} : { 'idempotency-key': key },
    body: { name: 'Vikram Singh', mobile: '9876543210', district: 'Patna', ...opts.body },
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

/** The error the handler rejected with (or `null` if it resolved). */
async function rejection(request: FastifyRequest): Promise<unknown> {
  return createFieldWorkerHandlers(deps).register(request, fakeReply()).then(
    () => null,
    (e: unknown) => e,
  );
}

const deps = { pool: {}, servicePool: {}, encryption: {} } as never;

afterEach(() => {
  calls.register.length = 0;
  calls.intent.length = 0;
  for (const fn of Object.values(calls.store)) fn.mockClear();
  calls.store.claim.mockImplementation(async () => 'acquired');
  calls.store.getResult.mockImplementation(async () => null);
  vi.mocked(openScopeTx).mockClear();
  // Review R2-6 — `mockClear` does not drain a `…Once` queue: a value queued by a leg that failed early would become the NEXT leg's
  // display name. Reset it (a reset drops the implementation too in vitest 2, so the default is set again).
  vi.mocked(getDisplayName).mockReset();
  vi.mocked(getDisplayName).mockImplementation(async () => 'Asha Verma');
  vi.mocked(fieldWorker.findLiveFieldWorkerByMobileIndex).mockReset(); // the same once-queue trap (R2-6), for the R3-2 leg
  vi.mocked(fieldWorker.findLiveFieldWorkerByMobileIndex).mockImplementation(async () => null);
});

describe('the registration handler hands on the gate’s VERIFIED result (AC8 (g))', () => {
  it('the object passed to registerFieldWorker IS request.authorizations[\'field_worker.register\'] (toBe) — and the intent’s actorRole is its role', async () => {
    const stored = storedAuthorization();
    const reply = fakeReply();
    await createFieldWorkerHandlers(deps).register(fakeRequest({ [KEY]: stored }), reply);
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

describe('the Idempotency-Key (AC8 (j), QE9 — review R1)', () => {
  it('a key still IN FLIGHT (claimed elsewhere, no result recorded yet) ⇒ 409 field_worker.idempotency_in_progress, and nothing is written', async () => {
    calls.store.claim.mockImplementation(async () => 'already_claimed');
    const err = await rejection(fakeRequest({ [KEY]: storedAuthorization() }));
    expect(err).toMatchObject({ statusCode: 409, code: 'field_worker.idempotency_in_progress' });
    expect(calls.store.getResult).toHaveBeenCalledTimes(1); // the branch read the (absent) result before refusing
    expect(calls.register).toEqual([]);
    expect(vi.mocked(openScopeTx)).not.toHaveBeenCalled();
    expect(calls.store.recordResult).not.toHaveBeenCalled();
    // Review R2-4 — a request that did NOT win the claim must not release it: releasing would let a duplicate run while the first is in flight.
    expect(calls.store.release).not.toHaveBeenCalled();
  });

  it('CONTROL: the same claim WITH a recorded result replays it (201) and writes nothing — so the leg above is the no-result branch', async () => {
    const recorded = { field_worker_id: 'recorded-id', district: 'Patna', current_state: 'pending_kyc', kyc_status: 'pending' };
    calls.store.claim.mockImplementation(async () => 'already_claimed');
    calls.store.getResult.mockImplementation(async () => recorded);
    const reply = fakeReply();
    await createFieldWorkerHandlers(deps).register(fakeRequest({ [KEY]: storedAuthorization() }), reply);
    expect(reply.status).toBe(201);
    expect(reply.sent).toEqual(recorded);
    expect(calls.register).toEqual([]);
    expect(calls.store.release).not.toHaveBeenCalled(); // a replay owns nothing either (review R2-4)
    expect(vi.mocked(openScopeTx)).not.toHaveBeenCalled();
  });

  it.each([
    ['missing', null],
    ['empty', ''],
    ['blank', '   '],
    ['201 characters', 'k'.repeat(201)],
  ])('an Idempotency-Key that is %s ⇒ 400 field_worker.idempotency_key_required, before any claim', async (_label, key) => {
    const err = await rejection(fakeRequest({ [KEY]: storedAuthorization() }, { key }));
    expect(err).toMatchObject({ statusCode: 400, code: 'field_worker.idempotency_key_required' });
    expect(calls.store.claim).not.toHaveBeenCalled();
    expect(calls.register).toEqual([]);
  });

  it('a 200-character key is the LONGEST accepted (the boundary) — and it is the claim key’s suffix', async () => {
    const reply = fakeReply();
    await createFieldWorkerHandlers(deps).register(fakeRequest({ [KEY]: storedAuthorization() }, { key: 'k'.repeat(200) }), reply);
    expect(reply.status).toBe(201);
    expect(calls.store.claim).toHaveBeenCalledWith(expect.stringMatching(/^field_worker\.register:.+:k{200}$/), expect.any(Number));
  });

  // TR9 (review R3-2): a request that WON the claim and then failed RELEASES it — once, by the claim key — and records NOTHING, so a
  // retry runs again instead of replaying the failure. Both phases: `prepare` (no transaction yet) and `run` (inside it).
  it.each([
    ['in prepare: a name that is not valid ⇒ 422', () => undefined, { name: '   ' }, 422, 'field_worker.name_invalid'],
    [
      'in run: the duplicate-mobile pre-check ⇒ 409',
      () => vi.mocked(fieldWorker.findLiveFieldWorkerByMobileIndex).mockResolvedValueOnce({ fieldWorkerId: 'w' } as never),
      {},
      409,
      'field_worker.mobile_already_registered',
    ],
  ])('a failure %s RELEASES the claim and records no result', async (_label, arrange, body, statusCode, code) => {
    arrange();
    const err = await rejection(fakeRequest({ [KEY]: storedAuthorization() }, { body }));
    expect(err).toMatchObject({ statusCode, code });
    const claimKey = calls.store.claim.mock.calls[0]![0];
    expect(calls.store.release).toHaveBeenCalledTimes(1);
    expect(calls.store.release).toHaveBeenCalledWith(claimKey);
    expect(calls.store.recordResult).not.toHaveBeenCalled();
  });

  it('CONTROL: a success RECORDS the result under the claim key and releases nothing', async () => {
    await createFieldWorkerHandlers(deps).register(fakeRequest({ [KEY]: storedAuthorization() }), fakeReply());
    const claimKey = calls.store.claim.mock.calls[0]![0];
    expect(calls.store.recordResult).toHaveBeenCalledWith(claimKey, expect.objectContaining({ district: 'Patna' }));
    expect(calls.store.release).not.toHaveBeenCalled();
  });
});

// Review R3-7 — the gate's `resolveValue`: the body's district VERBATIM, `null` (the core denies a null target) for anything else.
// Over HTTP the DTO answers a non-string 400 before the hooks run, so only a unit test can reach the null branch.
describe('registrationDistrict (the gate’s target, TR12)', () => {
  it.each([
    ['a string, verbatim (not trimmed, not normalised)', { district: ' Patna ' }, ' Patna '],
    ['a number', { district: 5 }, null],
    ['no district', {}, null],
    ['no body', undefined, null],
  ])('%s', (_label, body, expected) => {
    expect(registrationDistrict({ body } as unknown as FastifyRequest)).toBe(expected);
  });
});

// Review R3, as narrowed by R2-2: what this pins is the ORDER — this handler's display-name read happens before the scope transaction
// opens, so it no longer takes a second connection from the pool while one is held. It does NOT prove pool starvation is gone: the 503 flag
// path (`flagAllocationExhaustedForRequest`) and, in dev / CI, `withCompensatingAudit` (servicePool IS pool) still do — deferred, D3.
describe('the display-name read happens BEFORE the scope transaction opens (review R3 — the 503 flag path is the deferred residual D3)', () => {
  it('the admin’s display name is read BEFORE the scope transaction opens', async () => {
    await createFieldWorkerHandlers(deps).register(fakeRequest({ [KEY]: storedAuthorization() }), fakeReply());
    const read = vi.mocked(getDisplayName).mock.invocationCallOrder[0];
    const opened = vi.mocked(openScopeTx).mock.invocationCallOrder[0];
    expect(read, 'the display name was read').toBeDefined(); // non-vacuity: both ran
    expect(opened, 'the scope transaction was opened').toBeDefined();
    expect(read!).toBeLessThan(opened!);
  });

  it.each([
    ['a name that is not valid', { name: '   ' }, 'field_worker.name_invalid'],
    ['a mobile that is not valid', { mobile: '12345' }, 'field_worker.mobile_invalid'],
  ])('%s ⇒ 422 and NO scope transaction is opened', async (_label, body, code) => {
    const err = await rejection(fakeRequest({ [KEY]: storedAuthorization() }, { body }));
    expect(err).toMatchObject({ statusCode: 422, code });
    expect(vi.mocked(openScopeTx)).not.toHaveBeenCalled();
    expect(calls.register).toEqual([]);
  });

  it('QE9’s order is kept: the content rules answer BEFORE the display name is read (a bad name never costs the read)', async () => {
    vi.mocked(getDisplayName).mockResolvedValueOnce(null); // would be a 409 if it were reached
    const err = await rejection(fakeRequest({ [KEY]: storedAuthorization() }, { body: { name: '   ' } }));
    expect(err).toMatchObject({ statusCode: 422, code: 'field_worker.name_invalid' });
    expect(vi.mocked(getDisplayName)).not.toHaveBeenCalled();
  });

  it('no display name ⇒ 409 admin.display_name_missing, no scope transaction, nothing written (BEFORE any write)', async () => {
    vi.mocked(getDisplayName).mockResolvedValueOnce(null);
    const err = await rejection(fakeRequest({ [KEY]: storedAuthorization() }));
    expect(err).toMatchObject({ statusCode: 409, code: 'admin.display_name_missing' });
    expect(vi.mocked(openScopeTx)).not.toHaveBeenCalled();
    expect(calls.register).toEqual([]);
  });
});
