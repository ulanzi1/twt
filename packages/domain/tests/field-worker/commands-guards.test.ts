// Story 13.1 (AC5, AC6; QE5, QE13, QE18, QE20; I13) — the command guards, DB-free. A stub `pg.PoolClient` answers the
// handful of statements a command issues, in the shape drizzle's node-postgres driver reads back (`rowMode: 'array'` for a
// `RETURNING`), so the WHOLE success path runs. It pins what the live specs cannot cheaply force (the twin:
// `tests/marketplace/commands-guards.test.ts`, RP4):
//   - I13: SAVEPOINT → LOCK → HEAD → APPEND → (guard on) → UPDATE for every transition; `terminate`: SAVEPOINT → LOCK → NOW
//     → HEAD → APPEND (QE20's IST bounds read the clock under the lock);
//   - QE5's guard ORDER, case by case — and that guards (0) / (0b) run BEFORE ANY statement;
//   - QE20's UPPER bound at 00:30 IST (the NOW step returns an IST day one ahead of the UTC date);
//   - QE18: an unverified, foreign or wrong-key authorization is refused with NO statement sent.

import { describe, expect, it } from 'vitest';
import type pg from 'pg';

import {
  activateFieldWorker,
  postFieldWorker,
  reactivateFieldWorker,
  recordFieldWorkerKycCompleted,
  registerFieldWorker,
  suspendFieldWorker,
  terminateFieldWorker,
} from '../../src/field-worker/commands.js';
import {
  FieldWorkerAuthorizationStaleError,
  FieldWorkerDistrictUnchangedError,
  FieldWorkerEndedOnInvalidError,
  FieldWorkerGenesisMissingError,
  FieldWorkerIllegalTransitionError,
  FieldWorkerKycAlreadyCompletedError,
  FieldWorkerKycNotCompletedError,
  FieldWorkerProjectorInputError,
  FieldWorkerReasonInvalidError,
} from '../../src/field-worker/errors.js';
import { fieldWorkerId, pariwarId } from '../../src/ids/index.js';
import { authorize, type EffectiveGrant, type VerifiedAuthorization } from '../../src/rbac/check.js';
import type { FieldWorkerKycStatus, FieldWorkerReasonCode, FieldWorkerState } from '../../src/schema/field_workers.js';

const P = pariwarId('11111111-1111-1111-1111-111111111111');
const OTHER_P = '22222222-2222-2222-2222-222222222222';
const FW = fieldWorkerId('6ba7b810-9dad-41d1-80b4-00c04fd430c8');
const STAFF = '2c1f0a9e-8b7d-4c6e-9f5a-3b2c1d0e9f8a';
const AUDIT = '0d4b8e2a-1c3f-4a5b-9c6d-7e8f9a0b1c2d';
const EVENT_ID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

const PARIWAR_ADMIN: EffectiveGrant = { pariwarId: P, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: P };
const authAt = (district: string, over: { actorId?: string; pariwarId?: string; key?: string } = {}): VerifiedAuthorization =>
  authorize({
    actorId: over.actorId ?? STAFF,
    grants: [{ ...PARIWAR_ADMIN, pariwarId: over.pariwarId ?? P, scopeValue: over.pariwarId ?? P }],
    key: over.key ?? 'field_worker.register',
    resource: { dimension: over.key === 'module.manage' ? 'pariwar' : 'district', value: over.key === 'module.manage' ? (over.pariwarId ?? P) : district, pariwarId: over.pariwarId ?? P },
  })!;

interface StubRow {
  state: FieldWorkerState;
  version: number;
  kyc: FieldWorkerKycStatus;
  reason: FieldWorkerReasonCode | null;
  district: string;
  endedOn: string | null;
  registeredOn: string;
}
const ROW: StubRow = { state: 'active', version: 3, kyc: 'completed', reason: null, district: 'Patna', endedOn: null, registeredOn: '2026-10-01' };

function classify(text: string): string {
  const t = text.trim().replace(/\s+/g, ' ');
  if (t.startsWith('SAVEPOINT')) return 'SAVEPOINT';
  if (t.startsWith('ROLLBACK TO SAVEPOINT')) return 'ROLLBACK TO';
  if (t.startsWith('RELEASE SAVEPOINT')) return 'RELEASE';
  if (t.includes('FROM field_workers') && t.endsWith('FOR UPDATE')) return 'LOCK';
  if (t.startsWith("SELECT (now() AT TIME ZONE 'Asia/Kolkata')")) return 'NOW';
  if (t.startsWith('SELECT 1 FROM events_log WHERE stream_id')) return 'EXISTING';
  if (t.startsWith('SELECT max(event_version)')) return 'HEAD';
  if (/^insert into "events_log"/i.test(t)) return 'APPEND';
  if (/^insert into "field_workers"/i.test(t)) return 'INSERT ROW';
  if (/^update "field_workers"/i.test(t)) return 'UPDATE';
  if (t.startsWith('SET LOCAL app.field_worker_state_writer')) return t.includes("'on'") ? 'GUARD ON' : 'GUARD OFF';
  return `OTHER: ${t.slice(0, 40)}`;
}

function stub(over: Partial<StubRow> | null = {}, opts: { istToday?: string } = {}): { client: pg.PoolClient; calls: string[]; payloads: unknown[] } {
  const row = over === null ? null : { ...ROW, ...over };
  const calls: string[] = [];
  const payloads: unknown[] = [];
  const query = async (arg: unknown, params?: unknown[]): Promise<{ rows: unknown[]; rowCount: number; fields: unknown[] }> => {
    const cfg = typeof arg === 'string' ? { text: arg, values: params } : (arg as { text?: unknown; rowMode?: string; values?: unknown[] });
    const kind = classify(String(cfg.text ?? ''));
    calls.push(kind);
    const out = (rows: unknown[]) => ({ rows, rowCount: rows.length, fields: [] });
    const returning = (value: string) => out((cfg as { rowMode?: string }).rowMode === 'array' ? [[value]] : [{ value }]);
    switch (kind) {
      case 'LOCK':
        return out(
          row === null
            ? []
            : [
                {
                  current_state: row.state,
                  state_event_version: String(row.version),
                  kyc_status: row.kyc,
                  state_reason_code: row.reason,
                  district: row.district,
                  ended_on: row.endedOn,
                  registered_on: row.registeredOn,
                },
              ],
        );
      case 'NOW':
        return out([{ ist_today: opts.istToday ?? '2026-11-03' }]);
      case 'EXISTING':
        return out([]);
      case 'HEAD':
        return out([{ max: String(row?.version ?? 0) }]);
      case 'APPEND':
        // drizzle's node-postgres driver passes the parameters as the SECOND argument (`query(config, params)`).
        payloads.push((params ?? cfg.values ?? []).find((v) => typeof v === 'string' && v.startsWith('{')));
        return returning(EVENT_ID);
      case 'INSERT ROW':
      case 'UPDATE':
        return returning(FW);
      default:
        return out([]);
    }
  };
  return { client: { query } as unknown as pg.PoolClient, calls, payloads };
}

const staff = { pariwarId: P, fieldWorkerId: FW, auditId: AUDIT, actor: 'operator' as const, actorId: STAFF };

describe('I13 — the row lock comes before any events_log read or append (RP4 shape)', () => {
  const ORDER = ['SAVEPOINT', 'LOCK', 'HEAD', 'APPEND', 'GUARD ON', 'UPDATE', 'GUARD OFF', 'RELEASE'];

  it.each([
    ['kyc_completed', () => recordFieldWorkerKycCompleted, { state: 'pending_kyc', kyc: 'pending' } as Partial<StubRow>, {}],
    ['activated', () => activateFieldWorker, { state: 'pending_kyc', kyc: 'completed' } as Partial<StubRow>, {}],
    ['suspended', () => suspendFieldWorker, {} as Partial<StubRow>, { reasonCode: 'under_review' }],
    ['reactivated', () => reactivateFieldWorker, { state: 'suspended', reason: 'under_review' } as Partial<StubRow>, {}],
    ['posted', () => postFieldWorker, {} as Partial<StubRow>, { toDistrict: 'Gaya', reasonCode: 'reassigned', authorization: authAt('Gaya') }],
  ])('%s: SAVEPOINT → LOCK → HEAD → APPEND → UPDATE', async (_label, command, row, extra) => {
    const { client, calls } = stub(row);
    await (command() as (c: pg.PoolClient, i: unknown) => Promise<unknown>)(client, { ...staff, ...extra });
    expect(calls).toEqual(ORDER);
  });

  it('terminate: SAVEPOINT → LOCK → NOW → HEAD → APPEND → UPDATE (QE20 reads the IST day under the lock)', async () => {
    const { client, calls } = stub();
    await terminateFieldWorker(client, { ...staff, reasonCode: 'inactive', endedOn: '2026-11-02' });
    expect(calls).toEqual(['SAVEPOINT', 'LOCK', 'NOW', 'HEAD', 'APPEND', 'GUARD ON', 'UPDATE', 'GUARD OFF', 'RELEASE']);
  });

  it('register: SAVEPOINT → EXISTING → APPEND → INSERT ROW (no lock — the race is the 23505)', async () => {
    const { client, calls, payloads } = stub();
    const r = await registerFieldWorker(client, {
      ...staff,
      nameCiphertext: 'enc:v1:n',
      mobileCiphertext: 'enc:v1:m',
      mobileBlindIndex: 'idx',
      registeredByDisplay: 'Asha Verma',
      district: 'Patna',
      authorization: authAt('Patna'),
    });
    expect(r).toEqual({ eventId: EVENT_ID, eventVersion: 1, state: 'pending_kyc', kycStatus: 'pending' });
    expect(calls).toEqual(['SAVEPOINT', 'EXISTING', 'APPEND', 'GUARD ON', 'INSERT ROW', 'GUARD OFF', 'RELEASE']);
    expect(JSON.parse(String(payloads[0]))).toMatchObject({
      from_state: null,
      to_state: 'pending_kyc',
      trigger: 'field_worker.register',
      district: 'Patna',
      authorization: { permission_key: 'field_worker.register', role: 'pariwar_admin', target: { dimension: 'district', value: 'Patna' } },
    });
  });
});

describe('QE5 — the guard ORDER, case by case (AC5)', () => {
  const refused = async (calls: string[]): Promise<void> => {
    expect(calls).not.toContain('APPEND');
    expect(calls.slice(-2)).toEqual(['ROLLBACK TO', 'RELEASE']); // the caller's transaction stays usable
  };

  it('(1) no row in this Pariwar ⇒ FieldWorkerGenesisMissingError', async () => {
    const { client, calls } = stub(null);
    await expect(activateFieldWorker(client, staff)).rejects.toBeInstanceOf(FieldWorkerGenesisMissingError);
    await refused(calls);
  });

  it('(2) BEATS (3): kyc_completed on an ACTIVE worker ⇒ IllegalTransition, ⛔ KycAlreadyCompleted', async () => {
    const { client, calls } = stub({ state: 'active', kyc: 'completed' });
    await expect(recordFieldWorkerKycCompleted(client, staff)).rejects.toBeInstanceOf(FieldWorkerIllegalTransitionError);
    await refused(calls);
  });

  it('(2) BEATS (4): terminate with an INVALID reason on a TERMINATED worker ⇒ IllegalTransition, ⛔ ReasonInvalid', async () => {
    const { client, calls } = stub({ state: 'terminated', reason: 'inactive', endedOn: '2026-10-31' });
    await expect(terminateFieldWorker(client, { ...staff, reasonCode: 'bogus', endedOn: '2026-11-01' })).rejects.toBeInstanceOf(
      FieldWorkerIllegalTransitionError,
    );
    await refused(calls);
  });

  it('(2): anything out of terminated — `posted` included', async () => {
    const { client } = stub({ state: 'terminated', reason: 'inactive', endedOn: '2026-10-31' });
    await expect(postFieldWorker(client, { ...staff, toDistrict: 'Gaya', reasonCode: 'reassigned', authorization: authAt('Gaya') })).rejects.toBeInstanceOf(
      FieldWorkerIllegalTransitionError,
    );
  });

  it('(3): kyc twice ⇒ KycAlreadyCompleted; activate before KYC ⇒ KycNotCompleted', async () => {
    await expect(recordFieldWorkerKycCompleted(stub({ state: 'pending_kyc', kyc: 'completed' }).client, staff)).rejects.toBeInstanceOf(
      FieldWorkerKycAlreadyCompletedError,
    );
    await expect(activateFieldWorker(stub({ state: 'pending_kyc', kyc: 'pending' }).client, staff)).rejects.toBeInstanceOf(FieldWorkerKycNotCompletedError);
  });

  it('(3b) BEATS (3c) BEATS (4) for a post', async () => {
    // Same district, a stale target and a bad reason ⇒ DistrictUnchanged.
    await expect(
      postFieldWorker(stub().client, { ...staff, toDistrict: 'Patna', reasonCode: 'bogus', authorization: authAt('Nalanda') }),
    ).rejects.toBeInstanceOf(FieldWorkerDistrictUnchangedError);
    // A stale target and a bad reason ⇒ AuthorizationStale.
    await expect(
      postFieldWorker(stub().client, { ...staff, toDistrict: 'Gaya', reasonCode: 'bogus', authorization: authAt('Nalanda') }),
    ).rejects.toBeInstanceOf(FieldWorkerAuthorizationStaleError);
    // Only the reason is wrong ⇒ ReasonInvalid; a missing reason too.
    for (const reasonCode of ['bogus', 'under_review', undefined]) {
      await expect(
        postFieldWorker(stub().client, { ...staff, toDistrict: 'Gaya', reasonCode: reasonCode as string, authorization: authAt('Gaya') }),
      ).rejects.toBeInstanceOf(FieldWorkerReasonInvalidError);
    }
  });

  it('(3c): a target equal to EITHER end of the move is accepted — the destination or the LOCKED district', async () => {
    for (const target of ['Gaya', 'Patna']) {
      const { client, payloads } = stub({ district: 'Patna' });
      await postFieldWorker(client, { ...staff, toDistrict: 'Gaya', reasonCode: 'at_worker_request', authorization: authAt(target) });
      expect(JSON.parse(String(payloads[0]))).toMatchObject({ from_district: 'Patna', to_district: 'Gaya', authorization: { target: { value: target } } });
    }
  });

  it('(4) suspend / terminate reasons come from their OWN lists', async () => {
    await expect(suspendFieldWorker(stub().client, { ...staff, reasonCode: 'reassigned' })).rejects.toBeInstanceOf(FieldWorkerReasonInvalidError);
    await expect(terminateFieldWorker(stub().client, { ...staff, reasonCode: 'under_review', endedOn: '2026-11-01' })).rejects.toBeInstanceOf(
      FieldWorkerReasonInvalidError,
    );
  });

  it('(4) BEATS (5): a bad reason AND a future ended_on ⇒ ReasonInvalid', async () => {
    await expect(terminateFieldWorker(stub().client, { ...staff, reasonCode: 'bogus', endedOn: '2026-12-31' })).rejects.toBeInstanceOf(
      FieldWorkerReasonInvalidError,
    );
  });
});

describe('QE20 — ended_on: (0b) before ANY statement, and the IST bounds in SQL', () => {
  it('(0b) a missing or malformed ended_on is refused with NO statement sent (never FieldWorkerProjectorInputError)', async () => {
    for (const endedOn of [undefined, '', '2026-02-30', '01-11-2026', '2026-11-01T00:00:00Z', 20261101]) {
      const { client, calls } = stub();
      const err = await terminateFieldWorker(client, { ...staff, reasonCode: 'inactive', endedOn: endedOn as string }).catch((e: unknown) => e);
      expect(err, String(endedOn)).toBeInstanceOf(FieldWorkerEndedOnInvalidError);
      expect(err).toMatchObject({ reason: 'missing_or_malformed' });
      expect(calls).toEqual([]);
    }
  });

  it('(5) after the IST today ⇒ in_future; before the IST registration day ⇒ before_registration; both ends inclusive', async () => {
    const t = (endedOn: string, row: Partial<StubRow> = {}) => terminateFieldWorker(stub(row, { istToday: '2026-11-03' }).client, { ...staff, reasonCode: 'inactive', endedOn });
    await expect(t('2026-11-04')).rejects.toMatchObject({ reason: 'in_future' });
    await expect(t('2026-09-30')).rejects.toMatchObject({ reason: 'before_registration' });
    await expect(t('2026-11-03')).resolves.toMatchObject({ state: 'terminated' });
    await expect(t('2026-10-01')).resolves.toMatchObject({ state: 'terminated' });
  });

  it('⭐ the UPPER bound at 00:30 IST: the UTC date is still yesterday, but ended_on = the IST date is ACCEPTED', async () => {
    // 00:30 IST on 2026-11-04 is 19:00 UTC on 2026-11-03 — a UTC "today" would refuse a same-day termination here.
    const { client, payloads } = stub({}, { istToday: '2026-11-04' });
    await expect(terminateFieldWorker(client, { ...staff, reasonCode: 'left_voluntarily', endedOn: '2026-11-04' })).resolves.toMatchObject({
      state: 'terminated',
    });
    expect(JSON.parse(String(payloads[0]))).toMatchObject({ ended_on: '2026-11-04', reason_code: 'left_voluntarily' });
  });
});

describe('QE7 / QE18 — guard (0) runs BEFORE any statement', () => {
  const registerInput = { nameCiphertext: 'n', mobileCiphertext: 'm', mobileBlindIndex: 'i', registeredByDisplay: 'Asha', district: 'Patna' };

  it.each([
    ['actor system', { actor: 'system' }],
    ['actor member', { actor: 'member' }],
    ['a null actorId', { actorId: null }],
    ['an empty actorId', { actorId: '' }],
  ])('QE7: %s ⇒ FieldWorkerProjectorInputError on EVERY command, nothing sent', async (_label, bad) => {
    const commands: ((c: pg.PoolClient) => Promise<unknown>)[] = [
      (c) => registerFieldWorker(c, { ...staff, ...registerInput, authorization: authAt('Patna'), ...bad } as never),
      (c) => recordFieldWorkerKycCompleted(c, { ...staff, ...bad } as never),
      (c) => activateFieldWorker(c, { ...staff, ...bad } as never),
      (c) => suspendFieldWorker(c, { ...staff, reasonCode: 'under_review', ...bad } as never),
      (c) => reactivateFieldWorker(c, { ...staff, ...bad } as never),
      (c) => terminateFieldWorker(c, { ...staff, reasonCode: 'inactive', endedOn: '2026-11-01', ...bad } as never),
      (c) => postFieldWorker(c, { ...staff, toDistrict: 'Gaya', reasonCode: 'reassigned', authorization: authAt('Gaya'), ...bad } as never),
    ];
    for (const run of commands) {
      const { client, calls } = stub();
      await expect(run(client)).rejects.toBeInstanceOf(FieldWorkerProjectorInputError);
      expect(calls).toEqual([]);
    }
  });

  it.each([
    ['missing', undefined],
    ['an object LITERAL with the same fields (⛔ verified)', { ...authAt('Patna') }],
    ['another Pariwar’s result', authAt('Patna', { pariwarId: OTHER_P })],
    ['another actor’s result', authAt('Patna', { actorId: '99999999-9999-4999-8999-999999999999' })],
    ['the wrong key (module.manage, pariwar-dimension)', authAt('Patna', { key: 'module.manage' })],
    ['another district than the genesis', authAt('Gaya')],
  ])('register refuses an authorization that is %s — no statement sent', async (_label, authorization) => {
    const { client, calls } = stub();
    await expect(registerFieldWorker(client, { ...staff, ...registerInput, authorization: authorization as VerifiedAuthorization })).rejects.toBeInstanceOf(
      FieldWorkerProjectorInputError,
    );
    expect(calls).toEqual([]);
  });

  it('post refuses an unverified / foreign / non-district authorization BEFORE the lock (its TARGET is judged only under the lock)', async () => {
    for (const authorization of [undefined, { ...authAt('Gaya') }, authAt('Gaya', { pariwarId: OTHER_P }), authAt('Gaya', { key: 'module.manage' })]) {
      const { client, calls } = stub();
      await expect(
        postFieldWorker(client, { ...staff, toDistrict: 'Gaya', reasonCode: 'reassigned', authorization: authorization as VerifiedAuthorization }),
      ).rejects.toBeInstanceOf(FieldWorkerProjectorInputError);
      expect(calls).toEqual([]);
    }
  });

  it('a verified result is frozen — assigning to it throws in strict mode, so it cannot be re-aimed after the check', () => {
    const a = authAt('Patna') as unknown as { target: { value: string } };
    expect(() => {
      a.target.value = 'Gaya';
    }).toThrow(TypeError);
  });
});
