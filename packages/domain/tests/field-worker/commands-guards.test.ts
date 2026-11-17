// Story 13.1 (AC5, AC6; QE5, QE13, QE18, QE20; I13) — the command guards, DB-free. A stub `pg.PoolClient` answers the
// handful of statements a command issues, in the shape drizzle's node-postgres driver reads back (`rowMode: 'array'` for a
// `RETURNING`), so the WHOLE success path runs. It pins what the live specs cannot cheaply force (the twin:
// `tests/marketplace/commands-guards.test.ts`, RP4):
//   - I13: SAVEPOINT → LOCK → HEAD → APPEND → (guard on) → UPDATE for every transition; `terminate`: SAVEPOINT → LOCK → NOW
//     → HEAD → APPEND (QE20's IST bounds read the clock under the lock);
//   - QE5's guard ORDER, case by case — and that guards (0) / (0b) run BEFORE ANY statement;
//   - QE20's UPPER bound at 00:30 IST (the NOW step returns an IST day one ahead of the UTC date);
//   - QE18: an unverified, foreign or wrong-key authorization is refused with NO statement sent — on `register`, `post` and
//     (Story 13.1a AD3) the approval's `kyc_completed` / `activated`, whose stale target (3d) is judged under the lock.

import { describe, expect, it } from 'vitest';
import type pg from 'pg';

import {
  activateFieldWorker,
  FIELD_WORKER_MOVE_PERMISSION_KEYS,
  postFieldWorker,
  reactivateFieldWorker,
  recordFieldWorkerKycCompleted,
  registerFieldWorker,
  suspendFieldWorker,
  terminateFieldWorker,
  allowFieldWorkerEndingAppeal,
  undoFieldWorkerEnding,
} from '../../src/field-worker/commands.js';
import {
  lodgeFieldWorkerEndingAppeal,
  refuseFieldWorkerEndingAppeal,
  withdrawFieldWorkerEndingAppeal,
} from '../../src/field-worker/ending-appeal-commands.js';
import {
  FieldWorkerAppealAlreadyDecidedError,
  FieldWorkerAppealDateInvalidError,
  FieldWorkerAppealDeciderIsEnderError,
  FieldWorkerAppealNotOpenError,
  FieldWorkerAppealOpenError,
  FieldWorkerAppealRefusedByPanelError,
  FieldWorkerAppealWrongHearerError,
  FieldWorkerEndingChangedError,
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
import { fieldWorkerEndingAppealId, fieldWorkerId, pariwarId } from '../../src/ids/index.js';
import { authorize, type EffectiveGrant, type VerifiedAuthorization } from '../../src/rbac/check.js';
import { SEED_PERMISSION_KEYS } from '../../src/rbac/permissions.js';
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
  if (t.startsWith('INSERT INTO field_worker_code_sms_sends')) return 'ENQUEUE';
  if (/^update "field_workers"/i.test(t)) return 'UPDATE';
  if (t.startsWith('SET LOCAL app.field_worker_state_writer')) return t.includes("'on'") ? 'GUARD ON' : 'GUARD OFF';
  // Story 13.1d (AD3, AD9) — the supersede after a direct move or an ending: the worker's open request (none in the stub), then the notices' recipients.
  if (t.includes('FROM field_worker_move_requests') && t.endsWith('FOR UPDATE')) return 'REQUEST LOCK';
  if (t.includes("g.role = 'district_admin'")) return 'DISTRICT ADMINS';
  // Story 13.1f (AD2, AD3, AD9; `-465` Q6 B) — the undo's and the appeal's statements.
  if (t.startsWith('SELECT event_type, payload, event_version FROM events_log')) return 'STREAM';
  if (t.startsWith("SELECT event_type, payload->>'from_state'")) return 'UNDONE EVENT';
  if (t.startsWith('SET LOCAL app.field_worker_undo_writer')) return t.includes("'on'") ? 'UNDO ON' : 'UNDO OFF';
  if (t.startsWith('SELECT 1 AS hit FROM field_worker_ending_appeals')) return 'PANEL REFUSED';
  if (t.startsWith('SELECT field_worker_id FROM field_worker_ending_appeals')) return 'APPEAL WORKER';
  if (t.includes('FROM field_worker_ending_appeals') && t.includes("state = 'open'") && t.endsWith('FOR UPDATE')) return 'OPEN APPEAL LOCK';
  if (t.includes('FROM field_worker_ending_appeals') && t.endsWith('FOR UPDATE')) return 'APPEAL LOCK';
  if (t.startsWith('SELECT count(*)::text AS n FROM field_worker_ending_appeals')) return 'REFUSED COUNT';
  if (t.startsWith('SELECT state_reason_code FROM field_workers')) return 'REASON READ';
  if (t.includes("COALESCE(e.payload->>'appeal_heard_by'")) return 'CURRENT ENDING';
  if (t.startsWith('INSERT INTO events_log')) return 'APPEAL APPEND';
  if (t.startsWith('INSERT INTO field_worker_ending_appeals')) return 'APPEAL INSERT';
  if (t.startsWith('UPDATE field_worker_ending_appeals')) return 'APPEAL UPDATE';
  if (t.startsWith('SET LOCAL app.field_worker_ending_appeal_writer')) return t.includes("'on'") ? 'APPEAL WRITER ON' : 'APPEAL WRITER OFF';
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

function staffBase() {
  return { pariwarId: P, fieldWorkerId: FW, auditId: AUDIT, actor: 'operator' as const, actorId: STAFF };
}
const staff = staffBase();
/** Story 13.1c AD3 / AD4 — a VERIFIED result for one of the act keys (pariwar_admin holds all four) at `district`. */
const moveAt = (district: string, over: { actorId?: string; pariwarId?: string } = {}) => authAt(district, { ...over, key: 'field_worker.move' });
const suspender = { ...staffBase(), authorization: authAt('Patna', { key: 'field_worker.suspend' }) };
const reactivator = { ...staffBase(), authorization: authAt('Patna', { key: 'field_worker.reactivate' }) };
const terminator = { ...staffBase(), authorization: authAt('Patna', { key: 'field_worker.terminate' }), appealHeardBy: 'pariwar_admin' as const };
/** A move from Patna (the stub row's district — what the admin saw) to `to`, authorized at `target`. */
const mover = (to: string, target = to) => ({ ...staffBase(), toDistrict: to, expectedFromDistrict: 'Patna', authorization: moveAt(target) });
/** Story 13.1a AD3 — a VERIFIED `field_worker.approve` result (pariwar_admin) at `district`. */
const approveAt = (district: string, over: { actorId?: string; pariwarId?: string } = {}) => authAt(district, { ...over, key: 'field_worker.approve' });
/** CR25 — the RIGHT key checked at the PARIWAR dimension (a Pariwar Admin holds both keys): isolates the dimension check, which
 *  `authAt('…', { key: 'module.manage' })` cannot (that leg has a wrong key AND a wrong dimension). */
const keyAtPariwar = (key: string): VerifiedAuthorization =>
  authorize({ actorId: STAFF, grants: [PARIWAR_ADMIN], key, resource: { dimension: 'pariwar', value: P, pariwarId: P } })!;
/** What both approval commands take: the authorization (the stub row is in Patna) and the approver's display name (`-447` item 2). */
const approver = { ...staff, authorization: approveAt('Patna'), approvedByDisplay: 'Meera Pariwar-Admin' };

describe('I13 — the row lock comes before any events_log read or append (RP4 shape)', () => {
  const ORDER = ['SAVEPOINT', 'LOCK', 'HEAD', 'APPEND', 'GUARD ON', 'UPDATE', 'GUARD OFF', 'RELEASE'];
  /** Story 13.1b (AD1) — `activated` alone records the code SMS, on the caller's client, AFTER the savepoint. The other four are `ORDER`: the proof they enqueue nothing. */
  const ACTIVATED_ORDER = [...ORDER, 'ENQUEUE'];
  /**
   * Story 13.1d (AD3, AD9) — a DIRECT move, AFTER the savepoint: the worker's open request (none here — nothing superseded), then the
   * District Admins of BOTH districts for the `moved_by_pariwar_admin` notice (none here — no row). The acceptance's move (the answer key)
   * is `ORDER` exactly: it supersedes and tells nothing.
   */
  const DIRECT_MOVE_ORDER = [...ORDER, 'REQUEST LOCK', 'DISTRICT ADMINS', 'DISTRICT ADMINS'];

  // The last column: QE6's COMPUTED trigger — asserted on the appended payload (review R3-16: a typo'd or dropped `:<reason>` was green).
  it.each([
    ['kyc_completed', () => recordFieldWorkerKycCompleted, { state: 'pending_kyc', kyc: 'pending' } as Partial<StubRow>, approver, 'field_worker.kyc_complete', ORDER],
    ['activated', () => activateFieldWorker, { state: 'pending_kyc', kyc: 'completed' } as Partial<StubRow>, approver, 'field_worker.activate', ACTIVATED_ORDER],
    ['suspended', () => suspendFieldWorker, {} as Partial<StubRow>, { ...suspender, reasonCode: 'under_review' }, 'field_worker.suspend:under_review', ORDER],
    ['reactivated', () => reactivateFieldWorker, { state: 'suspended', reason: 'under_review' } as Partial<StubRow>, reactivator, 'field_worker.reactivate', ORDER],
    ['posted', () => postFieldWorker, {} as Partial<StubRow>, { ...mover('Gaya'), reasonCode: 'reassigned' }, 'field_worker.post', DIRECT_MOVE_ORDER],
    [
      'posted (the acceptance — 13.1d AD4)',
      () => postFieldWorker,
      {} as Partial<StubRow>,
      {
        ...mover('Gaya'),
        // The answer key is a District Admin's (the counterpart's — Gaya); a Pariwar Admin does not hold it (AD5).
        authorization: authorize({
          actorId: STAFF,
          grants: [{ pariwarId: P, role: 'district_admin', scopeDimension: 'district', scopeValue: 'Gaya' }],
          key: 'field_worker.answer_move_request',
          resource: { dimension: 'district', value: 'Gaya', pariwarId: P },
        })!,
        reasonCode: 'at_worker_request',
      },
      'field_worker.post',
      ORDER,
    ],
  ])('%s: SAVEPOINT → LOCK → HEAD → APPEND → UPDATE, and the command’s computed trigger', async (_label, command, row, extra, trigger, order) => {
    const { client, calls, payloads } = stub(row);
    await (command() as (c: pg.PoolClient, i: unknown) => Promise<unknown>)(client, { ...staff, ...extra });
    expect(calls).toEqual(order);
    expect(JSON.parse(String(payloads[0]))).toMatchObject({ trigger });
  });

  it('terminate: SAVEPOINT → LOCK → NOW → HEAD → APPEND → UPDATE (QE20 reads the IST day under the lock), trigger field_worker.terminate:inactive', async () => {
    const { client, calls, payloads } = stub();
    await terminateFieldWorker(client, { ...terminator, reasonCode: 'inactive', endedOn: '2026-11-02' });
    // Story 13.1d (AD3) — then, after the savepoint, the worker's open move request (none here: nothing superseded, nobody told).
    expect(calls).toEqual(['SAVEPOINT', 'LOCK', 'NOW', 'HEAD', 'APPEND', 'GUARD ON', 'UPDATE', 'GUARD OFF', 'RELEASE', 'REQUEST LOCK']);
    expect(JSON.parse(String(payloads[0]))).toMatchObject({ trigger: 'field_worker.terminate:inactive', reason_code: 'inactive' });
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
    await expect(activateFieldWorker(client, approver)).rejects.toBeInstanceOf(FieldWorkerGenesisMissingError);
    await refused(calls);
  });

  it('(2) BEATS (3): kyc_completed on an ACTIVE worker ⇒ IllegalTransition, ⛔ KycAlreadyCompleted', async () => {
    const { client, calls } = stub({ state: 'active', kyc: 'completed' });
    await expect(recordFieldWorkerKycCompleted(client, approver)).rejects.toBeInstanceOf(FieldWorkerIllegalTransitionError);
    await refused(calls);
  });

  it('(2) BEATS (4): terminate with an INVALID reason on a TERMINATED worker ⇒ IllegalTransition, ⛔ ReasonInvalid', async () => {
    const { client, calls } = stub({ state: 'terminated', reason: 'inactive', endedOn: '2026-10-31' });
    await expect(terminateFieldWorker(client, { ...terminator, reasonCode: 'bogus', endedOn: '2026-11-01' })).rejects.toBeInstanceOf(
      FieldWorkerIllegalTransitionError,
    );
    await refused(calls);
  });

  it('(2): anything out of terminated — `posted` included', async () => {
    const { client, calls } = stub({ state: 'terminated', reason: 'inactive', endedOn: '2026-10-31' });
    await expect(postFieldWorker(client, { ...mover('Gaya'), reasonCode: 'reassigned' })).rejects.toBeInstanceOf(
      FieldWorkerIllegalTransitionError,
    );
    await refused(calls); // review R3-22 — its siblings asserted nothing appended; this one did not
  });

  it('(3): kyc twice ⇒ KycAlreadyCompleted; activate before KYC ⇒ KycNotCompleted', async () => {
    await expect(recordFieldWorkerKycCompleted(stub({ state: 'pending_kyc', kyc: 'completed' }).client, approver)).rejects.toBeInstanceOf(
      FieldWorkerKycAlreadyCompletedError,
    );
    await expect(activateFieldWorker(stub({ state: 'pending_kyc', kyc: 'pending' }).client, approver)).rejects.toBeInstanceOf(FieldWorkerKycNotCompletedError);
  });

  // Story 13.1a AD3 — (3d): the approval's target must be the LOCKED row's district; judged AFTER (2) and (3), under the lock.
  it('(3d) kyc_completed / activated: a target that is not the LOCKED district ⇒ AuthorizationStale, after the lock, nothing appended', async () => {
    const stale = { ...approver, authorization: approveAt('Gaya') };
    for (const [command, row] of [
      [recordFieldWorkerKycCompleted, { state: 'pending_kyc', kyc: 'pending' }],
      [activateFieldWorker, { state: 'pending_kyc', kyc: 'completed' }],
    ] as const) {
      const { client, calls } = stub(row as Partial<StubRow>);
      await expect((command as (c: pg.PoolClient, i: unknown) => Promise<unknown>)(client, stale)).rejects.toBeInstanceOf(FieldWorkerAuthorizationStaleError);
      expect(calls.slice(0, 2)).toEqual(['SAVEPOINT', 'LOCK']); // judged UNDER the lock — the gate read the district before it
      await refused(calls);
    }
  });

  it('(2) BEATS (3d) and (3) BEATS (3d): a stale target on an ACTIVE worker ⇒ IllegalTransition; on a KYC-done worker ⇒ KycAlreadyCompleted / KycNotCompleted', async () => {
    const stale = { ...approver, authorization: approveAt('Gaya') };
    await expect(recordFieldWorkerKycCompleted(stub({ state: 'active', kyc: 'completed' }).client, stale)).rejects.toBeInstanceOf(FieldWorkerIllegalTransitionError);
    await expect(recordFieldWorkerKycCompleted(stub({ state: 'pending_kyc', kyc: 'completed' }).client, stale)).rejects.toBeInstanceOf(FieldWorkerKycAlreadyCompletedError);
    await expect(activateFieldWorker(stub({ state: 'pending_kyc', kyc: 'pending' }).client, stale)).rejects.toBeInstanceOf(FieldWorkerKycNotCompletedError);
  });

  it('the approval pair writes the SAME authorization snapshot (key field_worker.approve, target = the locked district) on both events', async () => {
    const kyc = stub({ state: 'pending_kyc', kyc: 'pending' });
    await recordFieldWorkerKycCompleted(kyc.client, approver);
    const act = stub({ state: 'pending_kyc', kyc: 'completed' });
    await activateFieldWorker(act.client, approver);
    const expected = { permission_key: 'field_worker.approve', role: 'pariwar_admin', grant: { dimension: 'pariwar', value: P }, target: { dimension: 'district', value: 'Patna' } };
    const k = JSON.parse(String(kyc.payloads[0]));
    const a = JSON.parse(String(act.payloads[0]));
    expect(k.authorization).toMatchObject(expected);
    expect(a.authorization).toEqual(k.authorization);
    expect(a).not.toHaveProperty('approved_by_display'); // a ROW column (`-447` item 2) — ⛔ a payload key
    expect(JSON.stringify(a)).not.toContain('Meera');
  });

  it('(3b) BEATS (3c) BEATS (4) for a post', async () => {
    // Same district, a stale target and a bad reason ⇒ DistrictUnchanged.
    await expect(
      postFieldWorker(stub().client, { ...mover('Patna', 'Nalanda'), reasonCode: 'bogus' }),
    ).rejects.toBeInstanceOf(FieldWorkerDistrictUnchangedError);
    // A stale target and a bad reason ⇒ AuthorizationStale.
    await expect(
      postFieldWorker(stub().client, { ...mover('Gaya', 'Nalanda'), reasonCode: 'bogus' }),
    ).rejects.toBeInstanceOf(FieldWorkerAuthorizationStaleError);
    // Only the reason is wrong ⇒ ReasonInvalid; a missing reason too.
    for (const reasonCode of ['bogus', 'under_review', undefined]) {
      await expect(
        postFieldWorker(stub().client, { ...mover('Gaya'), reasonCode: reasonCode as string }),
      ).rejects.toBeInstanceOf(FieldWorkerReasonInvalidError);
    }
  });

  it('(3c): a target equal to EITHER end of the move is accepted — the destination or the LOCKED district', async () => {
    for (const target of ['Gaya', 'Patna']) {
      const { client, payloads } = stub({ district: 'Patna' });
      await postFieldWorker(client, { ...mover('Gaya', target), reasonCode: 'at_worker_request' });
      expect(JSON.parse(String(payloads[0]))).toMatchObject({ from_district: 'Patna', to_district: 'Gaya', authorization: { target: { value: target } } });
    }
  });

  it('(4) suspend / terminate reasons come from their OWN lists', async () => {
    await expect(suspendFieldWorker(stub().client, { ...suspender, reasonCode: 'reassigned' })).rejects.toBeInstanceOf(FieldWorkerReasonInvalidError);
    await expect(terminateFieldWorker(stub().client, { ...terminator, reasonCode: 'under_review', endedOn: '2026-11-01' })).rejects.toBeInstanceOf(
      FieldWorkerReasonInvalidError,
    );
  });

  it('(4) BEATS (5): a bad reason AND a future ended_on ⇒ ReasonInvalid', async () => {
    await expect(terminateFieldWorker(stub().client, { ...terminator, reasonCode: 'bogus', endedOn: '2026-12-31' })).rejects.toBeInstanceOf(
      FieldWorkerReasonInvalidError,
    );
  });

  // Review R3-20 — an INVALID reason is whatever the caller sent: it must reach neither the message nor a field, and a value that cannot be
  // stringified must still be the TYPED error (the trigger is built only after the reason is validated).
  it('(4) a free-text reason never appears in the error; a BigInt or a null-prototype object is still ReasonInvalid', async () => {
    const freeText = 'Ramesh Kumar 9876543210 asked to stop';
    const err = (await suspendFieldWorker(stub().client, { ...suspender, reasonCode: freeText }).catch((e: unknown) => e)) as FieldWorkerReasonInvalidError;
    expect(err).toBeInstanceOf(FieldWorkerReasonInvalidError);
    expect(err.received).toBe('not_in_the_list');
    expect(JSON.stringify({ ...err, message: err.message })).not.toMatch(/Ramesh|9876543210/);
    for (const odd of [10n, Object.create(null) as unknown]) {
      const e = await terminateFieldWorker(stub().client, { ...terminator, reasonCode: odd as string, endedOn: '2026-11-01' }).catch((x: unknown) => x);
      expect(e).toBeInstanceOf(FieldWorkerReasonInvalidError);
      expect((e as FieldWorkerReasonInvalidError).received).toBe('not_a_string');
    }
  });
});

describe('QE20 — ended_on: (0b) before ANY statement, and the IST bounds in SQL', () => {
  it('(0b) a missing or malformed ended_on is refused with NO statement sent (never FieldWorkerProjectorInputError)', async () => {
    for (const endedOn of [undefined, '', '2026-02-30', '01-11-2026', '2026-11-01T00:00:00Z', 20261101]) {
      const { client, calls } = stub();
      const err = await terminateFieldWorker(client, { ...terminator, reasonCode: 'inactive', endedOn: endedOn as string }).catch((e: unknown) => e);
      expect(err, String(endedOn)).toBeInstanceOf(FieldWorkerEndedOnInvalidError);
      expect(err).toMatchObject({ reason: 'missing_or_malformed' });
      expect(calls).toEqual([]);
    }
  });

  it('(5) after the IST today ⇒ in_future; before the IST registration day ⇒ before_registration; both ends inclusive', async () => {
    const t = (endedOn: string, row: Partial<StubRow> = {}) => terminateFieldWorker(stub(row, { istToday: '2026-11-03' }).client, { ...terminator, reasonCode: 'inactive', endedOn });
    await expect(t('2026-11-04')).rejects.toMatchObject({ reason: 'in_future' });
    await expect(t('2026-09-30')).rejects.toMatchObject({ reason: 'before_registration' });
    await expect(t('2026-11-03')).resolves.toMatchObject({ state: 'terminated' });
    await expect(t('2026-10-01')).resolves.toMatchObject({ state: 'terminated' });
  });

  it('⭐ the UPPER bound at 00:30 IST: the UTC date is still yesterday, but ended_on = the IST date is ACCEPTED', async () => {
    // 00:30 IST on 2026-11-04 is 19:00 UTC on 2026-11-03 — a UTC "today" would refuse a same-day termination here.
    const { client, payloads } = stub({}, { istToday: '2026-11-04' });
    await expect(terminateFieldWorker(client, { ...terminator, reasonCode: 'left_voluntarily', endedOn: '2026-11-04' })).resolves.toMatchObject({
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
      (c) => recordFieldWorkerKycCompleted(c, { ...approver, ...bad } as never),
      (c) => activateFieldWorker(c, { ...approver, ...bad } as never),
      (c) => suspendFieldWorker(c, { ...suspender, reasonCode: 'under_review', ...bad } as never),
      (c) => reactivateFieldWorker(c, { ...reactivator, ...bad } as never),
      (c) => terminateFieldWorker(c, { ...terminator, reasonCode: 'inactive', endedOn: '2026-11-01', ...bad } as never),
      (c) => postFieldWorker(c, { ...mover('Gaya'), reasonCode: 'reassigned', ...bad } as never),
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
    // `authAt` forces `module.manage` to the PARIWAR dimension, so this leg has a wrong key AND a wrong dimension; the next row isolates the dimension.
    ['a wrong key AND a wrong dimension (module.manage, pariwar-dimension)', authAt('Patna', { key: 'module.manage' })],
    ['the RIGHT key at the wrong DIMENSION (field_worker.register, pariwar-dimension)', keyAtPariwar('field_worker.register')],
    ['another district than the genesis', authAt('Gaya')],
  ])('register refuses an authorization that is %s — no statement sent', async (_label, authorization) => {
    const { client, calls } = stub();
    await expect(registerFieldWorker(client, { ...staff, ...registerInput, authorization: authorization as VerifiedAuthorization })).rejects.toBeInstanceOf(
      FieldWorkerProjectorInputError,
    );
    expect(calls).toEqual([]);
  });

  // Review R2 — the KEY check itself. A VERIFIED, district-dimension, same-Pariwar, same-actor, same-target authorization for a
  // key that is NOT `field_worker.register` passes every check before it, so only the key check can refuse it. (`claim.record_fraud_finding`
  // is a district-dimension key `district_admin` holds — permissions.ts / roles.ts.)
  it('register refuses a VERIFIED district-dimension authorization for ANOTHER key — the key check, not the dimension check; no statement sent', async () => {
    const otherKey = authorize({
      actorId: STAFF,
      grants: [{ pariwarId: P, role: 'district_admin', scopeDimension: 'district', scopeValue: 'Patna' }],
      key: 'claim.record_fraud_finding',
      resource: { dimension: 'district', value: 'Patna', pariwarId: P },
    });
    // Control: the result is a real verified one for the genesis's district — so it is the KEY that is wrong, nothing else.
    expect(otherKey).not.toBeNull();
    expect(otherKey).toMatchObject({ permissionKey: 'claim.record_fraud_finding', pariwarId: P, actorId: STAFF, target: { dimension: 'district', value: 'Patna' } });
    const { client, calls } = stub();
    await expect(registerFieldWorker(client, { ...staff, ...registerInput, authorization: otherKey! })).rejects.toThrow(
      /the authorization is for 'claim\.record_fraud_finding', not this act/,
    );
    expect(calls).toEqual([]);
  });

  it('post refuses an unverified / foreign / non-district authorization BEFORE the lock (its TARGET is judged only under the lock)', async () => {
    // `keyAtPariwar('field_worker.move')` isolates the DIMENSION check (the right key at the wrong dimension): `module.manage` alone is
    // refused by the key check first, whatever its dimension (review CR5).
    for (const authorization of [
      undefined,
      { ...moveAt('Gaya') },
      moveAt('Gaya', { pariwarId: OTHER_P }),
      authAt('Gaya', { key: 'module.manage' }),
      keyAtPariwar('field_worker.move'),
    ]) {
      const { client, calls } = stub();
      await expect(
        postFieldWorker(client, { ...mover('Gaya'), reasonCode: 'reassigned', authorization: authorization as VerifiedAuthorization }),
      ).rejects.toBeInstanceOf(FieldWorkerProjectorInputError);
      expect(calls).toEqual([]);
    }
  });

  // Story 13.1a AD3 — the approval's two commands accept ONLY a verified `field_worker.approve` result, judged with NO statement sent.
  it.each([
    ['missing', undefined],
    ['an object LITERAL with the same fields (⛔ verified)', { ...approveAt('Patna') }],
    ['another Pariwar’s result', approveAt('Patna', { pariwarId: OTHER_P })],
    ['another actor’s result', approveAt('Patna', { actorId: '99999999-9999-4999-8999-999999999999' })],
    ['a wrong key AND a wrong dimension (module.manage, pariwar-dimension)', authAt('Patna', { key: 'module.manage' })],
    ['the RIGHT key at the wrong DIMENSION (field_worker.approve, pariwar-dimension)', keyAtPariwar('field_worker.approve')],
    ['field_worker.register — the REGISTRAR’s key (a verified, district-dimension, same-target result)', authAt('Patna')],
  ])('kyc_completed and activated refuse an authorization that is %s — no statement sent', async (_label, authorization) => {
    for (const command of [recordFieldWorkerKycCompleted, activateFieldWorker]) {
      const { client, calls } = stub({ state: 'pending_kyc', kyc: 'pending' });
      await expect(command(client, { ...approver, authorization: authorization as VerifiedAuthorization })).rejects.toBeInstanceOf(FieldWorkerProjectorInputError);
      expect(calls).toEqual([]);
    }
  });

  it('kyc_completed and activated refuse a VERIFIED district-dimension result for ANOTHER key by the KEY check — no statement sent', async () => {
    const otherKey = authorize({
      actorId: STAFF,
      grants: [{ pariwarId: P, role: 'district_admin', scopeDimension: 'district', scopeValue: 'Patna' }],
      key: 'claim.record_fraud_finding',
      resource: { dimension: 'district', value: 'Patna', pariwarId: P },
    });
    expect(otherKey).toMatchObject({ permissionKey: 'claim.record_fraud_finding', pariwarId: P, actorId: STAFF, target: { dimension: 'district', value: 'Patna' } });
    for (const command of [recordFieldWorkerKycCompleted, activateFieldWorker]) {
      const { client, calls } = stub({ state: 'pending_kyc', kyc: 'pending' });
      await expect(command(client, { ...approver, authorization: otherKey! })).rejects.toThrow(/the authorization is for 'claim\.record_fraud_finding', not this act/);
      expect(calls).toEqual([]);
    }
  });

  it('activated refuses a missing or blank approver display name (6.11 R5 — no fallback) — no statement sent', async () => {
    for (const approvedByDisplay of [undefined, '', '   ']) {
      const { client, calls } = stub({ state: 'pending_kyc', kyc: 'completed' });
      await expect(activateFieldWorker(client, { ...approver, approvedByDisplay: approvedByDisplay as string })).rejects.toThrow(/display name is missing/);
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

// Story 13.1c AD3 — suspend, reactivate and terminate carry the VERIFIED result of THEIR key; its target is judged under the lock.
describe('Story 13.1c AD3 — the lifecycle acts carry their own key’s authorization (13.1 QE18; `-443` Q3 A)', () => {
  const ACTS = [
    ['suspend', 'field_worker.suspend', {} as Partial<StubRow>, (c: pg.PoolClient, a: unknown) => suspendFieldWorker(c, { ...staff, reasonCode: 'under_review', authorization: a as VerifiedAuthorization })],
    ['reactivate', 'field_worker.reactivate', { state: 'suspended', reason: 'under_review' } as Partial<StubRow>, (c: pg.PoolClient, a: unknown) => reactivateFieldWorker(c, { ...staff, authorization: a as VerifiedAuthorization })],
    ['terminate', 'field_worker.terminate', {} as Partial<StubRow>, (c: pg.PoolClient, a: unknown) => terminateFieldWorker(c, { appealHeardBy: 'pariwar_admin', ...staff, reasonCode: 'inactive', endedOn: '2026-11-02', authorization: a as VerifiedAuthorization })],
  ] as const;

  it.each(ACTS)('%s writes the snapshot of %s, target = the locked district', async (_label, key, row, run) => {
    const { client, payloads } = stub(row);
    await run(client, authAt('Patna', { key }));
    expect(JSON.parse(String(payloads[0])).authorization).toMatchObject({ permission_key: key, role: 'pariwar_admin', target: { dimension: 'district', value: 'Patna' } });
  });

  it.each(ACTS)('%s refuses — with NO statement sent — a missing, look-alike, foreign-Pariwar, foreign-actor, wrong-dimension or WRONG-KEY authorization', async (_label, key, row, run) => {
    const otherActKeys = ['field_worker.suspend', 'field_worker.reactivate', 'field_worker.terminate', 'field_worker.move', 'field_worker.register', 'field_worker.approve'].filter((k) => k !== key);
    for (const authorization of [
      undefined,
      { ...authAt('Patna', { key }) },
      authAt('Patna', { key, pariwarId: OTHER_P }),
      authAt('Patna', { key, actorId: '99999999-9999-4999-8999-999999999999' }),
      keyAtPariwar(key),
      ...otherActKeys.map((k) => authAt('Patna', { key: k })),
    ]) {
      const { client, calls } = stub(row);
      await expect(run(client, authorization)).rejects.toBeInstanceOf(FieldWorkerProjectorInputError);
      expect(calls).toEqual([]);
    }
  });

  it.each(ACTS)('(3d) %s: a target that is not the LOCKED district ⇒ AuthorizationStale, judged under the lock, nothing appended', async (_label, key, row, run) => {
    const { client, calls } = stub({ ...row, district: 'Gaya' });
    await expect(run(client, authAt('Patna', { key }))).rejects.toBeInstanceOf(FieldWorkerAuthorizationStaleError);
    expect(calls.slice(0, 2)).toEqual(['SAVEPOINT', 'LOCK']);
    expect(calls).not.toContain('APPEND');
    expect(calls.slice(-2)).toEqual(['ROLLBACK TO', 'RELEASE']);
  });

  it('(2) BEATS (3d): a stale target on a TERMINATED worker ⇒ IllegalTransition, for all three', async () => {
    for (const [, key, , run] of ACTS) {
      const { client } = stub({ state: 'terminated', reason: 'inactive', endedOn: '2026-10-31', district: 'Gaya' });
      await expect(run(client, authAt('Patna', { key }))).rejects.toBeInstanceOf(FieldWorkerIllegalTransitionError);
    }
  });

  it('(3d) BEATS (4) and (5): a stale target with a bad reason or a future ended_on ⇒ AuthorizationStale', async () => {
    await expect(suspendFieldWorker(stub({ district: 'Gaya' }).client, { ...suspender, reasonCode: 'bogus' })).rejects.toBeInstanceOf(FieldWorkerAuthorizationStaleError);
    await expect(terminateFieldWorker(stub({ district: 'Gaya' }).client, { ...terminator, reasonCode: 'bogus', endedOn: '2026-11-01' })).rejects.toBeInstanceOf(
      FieldWorkerAuthorizationStaleError,
    );
    await expect(
      terminateFieldWorker(stub({ district: 'Gaya' }, { istToday: '2026-11-03' }).client, { ...terminator, reasonCode: 'inactive', endedOn: '2026-12-31' }),
    ).rejects.toBeInstanceOf(FieldWorkerAuthorizationStaleError);
  });

  it('`died` (`-455`) is a termination reason, ⛔ a suspension one; its ended_on is judged by the same IST bounds', async () => {
    const { client, payloads } = stub({}, { istToday: '2026-11-03' });
    await terminateFieldWorker(client, { ...terminator, reasonCode: 'died', endedOn: '2026-11-03' });
    expect(JSON.parse(String(payloads[0]))).toMatchObject({ reason_code: 'died', ended_on: '2026-11-03', trigger: 'field_worker.terminate:died' });
    await expect(terminateFieldWorker(stub({}, { istToday: '2026-11-03' }).client, { ...terminator, reasonCode: 'died', endedOn: '2026-11-04' })).rejects.toMatchObject({
      reason: 'in_future',
    });
    await expect(suspendFieldWorker(stub().client, { ...suspender, reasonCode: 'died' })).rejects.toBeInstanceOf(FieldWorkerReasonInvalidError);
  });
});

// Story 13.1c AD4 (13.1 C5 / C10, D7) — the move accepts ONLY a move key, and names the district its admin saw.
describe('Story 13.1c AD4 — the move key list and the expected source', () => {
  it('the move-key list is exactly [field_worker.move, field_worker.answer_move_request] (13.1d AD4 appends) — ⛔ field_worker.register', () => {
    expect([...FIELD_WORKER_MOVE_PERMISSION_KEYS]).toEqual(['field_worker.move', 'field_worker.answer_move_request']);
  });

  it('I2: a VERIFIED field_worker.register result at the destination is refused by the KEY check, with NO statement sent', async () => {
    const { client, calls } = stub();
    await expect(postFieldWorker(client, { ...mover('Gaya'), authorization: authAt('Gaya'), reasonCode: 'reassigned' })).rejects.toThrow(
      /the authorization is for 'field_worker\.register', not this act/,
    );
    expect(calls).toEqual([]);
  });

  it('EVERY catalog key but the two move keys is refused — a super_admin grant issues each at the destination; no statement sent', async () => {
    const SUPER: EffectiveGrant = { pariwarId: P, role: 'super_admin', scopeDimension: 'global', scopeValue: null };
    const others = SEED_PERMISSION_KEYS.filter((k) => !(FIELD_WORKER_MOVE_PERMISSION_KEYS as readonly string[]).includes(k));
    expect(others.length).toBe(SEED_PERMISSION_KEYS.length - 2); // non-vacuity: the whole catalog but two
    for (const key of others) {
      const authorization = authorize({ actorId: STAFF, grants: [SUPER], key, resource: { dimension: 'district', value: 'Gaya', pariwarId: P } });
      expect(authorization, key).not.toBeNull();
      const { client, calls } = stub();
      await expect(postFieldWorker(client, { ...mover('Gaya'), authorization: authorization!, reasonCode: 'reassigned' }), key).rejects.toBeInstanceOf(
        FieldWorkerProjectorInputError,
      );
      expect(calls, key).toEqual([]);
    }
    // CONTROL — each move key from the same grant passes.
    for (const key of FIELD_WORKER_MOVE_PERMISSION_KEYS) {
      const move = authorize({ actorId: STAFF, grants: [SUPER], key, resource: { dimension: 'district', value: 'Gaya', pariwarId: P } })!;
      await expect(postFieldWorker(stub().client, { ...mover('Gaya'), authorization: move, reasonCode: 'reassigned' }), key).resolves.toMatchObject({ district: 'Gaya' });
    }
  });

  it('a missing or blank expected source is refused with NO statement sent', async () => {
    for (const expectedFromDistrict of [undefined, '', '  ']) {
      const { client, calls } = stub();
      await expect(postFieldWorker(client, { ...mover('Gaya'), expectedFromDistrict: expectedFromDistrict as string, reasonCode: 'reassigned' })).rejects.toThrow(
        /expected source district is missing/,
      );
      expect(calls).toEqual([]);
    }
  });

  it('(3a) a locked district other than the expected source ⇒ AuthorizationStale under the lock — and it BEATS (3b), (3c) and (4)', async () => {
    // The worker is in Gaya (moved meanwhile); the admin saw Patna.
    for (const [to, target, reasonCode] of [
      ['Nalanda', 'Nalanda', 'reassigned'], // (3c) alone would accept: the target is the destination
      ['Gaya', 'Gaya', 'reassigned'], // (3b) alone would say DistrictUnchanged
      ['Nalanda', 'Bhojpur', 'bogus'], // a stale target and a bad reason too
    ] as const) {
      const { client, calls } = stub({ district: 'Gaya' });
      await expect(postFieldWorker(client, { ...mover(to, target), reasonCode })).rejects.toBeInstanceOf(FieldWorkerAuthorizationStaleError);
      expect(calls.slice(0, 2)).toEqual(['SAVEPOINT', 'LOCK']);
      expect(calls).not.toContain('APPEND');
    }
  });

  it('(2) BEATS (3a): a terminated worker with a stale source ⇒ IllegalTransition', async () => {
    await expect(
      postFieldWorker(stub({ state: 'terminated', reason: 'inactive', endedOn: '2026-10-31', district: 'Gaya' }).client, { ...mover('Nalanda'), reasonCode: 'reassigned' }),
    ).rejects.toBeInstanceOf(FieldWorkerIllegalTransitionError);
  });
});

// ── Story 13.1f (AD2, AD9; `-465` Q6 B) — the undo's and the appeal's statement order and check order, DB-free ──────────────────────

/** The rejection of `fn` (a resolve is a test failure). */
async function caught(fn: () => Promise<unknown>): Promise<unknown> {
  try {
    await fn();
  } catch (e) {
    return e;
  }
  throw new Error('expected a rejection');
}

const ENDER = '3e2d1c0b-9a8f-4e7d-8c6b-5a4f3e2d1c0b';
const APPEAL = '4f3e2d1c-0b9a-4f8e-9d7c-6b5a4f3e2d1c';
const TRUSTEE = '5a4f3e2d-1c0b-4a9f-8e7d-6c5b4a3f2e1d';
interface AppealStub {
  panelRefused?: boolean;
  openAppeal?: boolean;
  heardBy?: 'pariwar_admin' | 'trustee_panel';
  refusedCount?: number;
  appealState?: string;
}
/** A stub for a TERMINATED worker (ended from pending_kyc at version 2) and, when asked, its appeal. */
function appealStub(o: AppealStub = {}): { client: pg.PoolClient; calls: string[] } {
  const calls: string[] = [];
  const appealRaw = {
    appeal_id: APPEAL,
    field_worker_id: FW,
    state: o.appealState ?? 'open',
    state_event_version: '1',
    ending_event_version: '2',
    heard_by: o.heardBy ?? 'trustee_panel',
    received_on: '2026-11-02',
    lodged_by_user_id: TRUSTEE,
    ended_by_user_id: ENDER,
  };
  const query = async (arg: unknown, params?: unknown[]): Promise<{ rows: unknown[]; rowCount: number; fields: unknown[] }> => {
    const cfg = typeof arg === 'string' ? { text: arg, values: params } : (arg as { text?: unknown; rowMode?: string });
    const kind = classify(String(cfg.text ?? ''));
    calls.push(kind);
    const out = (rows: unknown[]) => ({ rows, rowCount: rows.length, fields: [] });
    const returning = (value: string) => out((cfg as { rowMode?: string }).rowMode === 'array' ? [[value]] : [{ value }]);
    switch (kind) {
      case 'LOCK':
        return out([
          { current_state: 'terminated', state_event_version: '2', kyc_status: 'pending', state_reason_code: 'inactive', district: 'Patna', ended_on: '2026-11-02', registered_on: '2026-10-01' },
        ]);
      case 'STREAM':
        return out([
          { event_type: 'field_worker.registered', payload: { from_state: null, to_state: 'pending_kyc', district: 'Patna' }, event_version: '1' },
          { event_type: 'field_worker.terminated', payload: { from_state: 'pending_kyc', to_state: 'terminated', reason_code: 'inactive', ended_on: '2026-11-02' }, event_version: '2' },
        ]);
      case 'HEAD': {
        const values = (params ?? (cfg as { values?: unknown[] }).values ?? []) as unknown[];
        return out([{ max: values.includes(APPEAL) ? '1' : '2' }]); // the appeal's stream holds its `lodged` event
      }
      case 'UNDONE EVENT':
        return out([{ event_type: 'field_worker.terminated', from_state: 'pending_kyc' }]);
      case 'APPEND':
        return returning(EVENT_ID);
      case 'UPDATE':
        return returning(FW);
      case 'PANEL REFUSED':
        return out(o.panelRefused === true ? [{ hit: 1 }] : []);
      case 'OPEN APPEAL LOCK':
        return out(o.openAppeal === true ? [appealRaw] : []);
      case 'APPEAL WORKER':
        return out([{ field_worker_id: FW }]);
      case 'APPEAL LOCK':
        return out([appealRaw]);
      case 'NOW':
        return out([{ ist_today: '2026-11-03' }]);
      case 'REFUSED COUNT':
        return out([{ n: String(o.refusedCount ?? 0) }]);
      case 'CURRENT ENDING':
        return out([{ event_version: '2', heard_by: o.heardBy ?? 'trustee_panel', actor_id: ENDER, ended_on: '2026-11-02', reason_code: 'inactive', district: 'Patna' }]);
      case 'REASON READ':
        return out([{ state_reason_code: null }]);
      case 'APPEAL APPEND':
        return out([{ event_id: EVENT_ID }]);
      case 'APPEAL UPDATE':
        return out([{ appeal_id: APPEAL }]);
      default:
        return out([]);
    }
  };
  return { client: { query } as unknown as pg.PoolClient, calls };
}

const UNDO_KEY = 'field_worker.undo_ending';
const undoer = (expectedEndingVersion = 2) => ({ ...staffBase(), expectedEndingVersion, authorization: authAt('Patna', { key: UNDO_KEY }) });
const TRUSTEE_GRANT: EffectiveGrant = { pariwarId: P, role: 'trustee_panel', scopeDimension: 'pariwar', scopeValue: P };
const panelAuth = (actorId = TRUSTEE): VerifiedAuthorization =>
  authorize({ actorId, grants: [TRUSTEE_GRANT], key: 'field_worker.hear_ending_appeal_as_panel', resource: { dimension: 'district', value: 'Patna', pariwarId: P } })!;
const paHearAuth = (): VerifiedAuthorization => authAt('Patna', { key: 'field_worker.hear_ending_appeal' });

describe('Story 13.1f — the undo (AD2; `-465` Q6 B): statement order and check order', () => {
  it('a slip: SAVEPOINT → LOCK → PANEL REFUSED → STREAM → HEAD → UNDONE EVENT → APPEND → GUARD ON → UNDO ON → UPDATE → UNDO OFF → GUARD OFF → RELEASE → OPEN APPEAL LOCK → REASON READ', async () => {
    const { client, calls } = appealStub();
    const r = await undoFieldWorkerEnding(client, undoer());
    expect(r).toMatchObject({ state: 'pending_kyc', reasonCode: null, endedOn: null });
    expect(calls).toEqual([
      'SAVEPOINT', 'LOCK', 'PANEL REFUSED', 'STREAM', 'HEAD', 'UNDONE EVENT', 'APPEND',
      'GUARD ON', 'UNDO ON', 'UPDATE', 'UNDO OFF', 'GUARD OFF', 'RELEASE', 'OPEN APPEAL LOCK', 'REASON READ',
    ]);
  });

  it('a slip with an open appeal: after RELEASE the appeal is locked SECOND (TR5) and superseded — NOW → HEAD → APPEAL APPEND → APPEAL UPDATE', async () => {
    const { client, calls } = appealStub({ openAppeal: true });
    await undoFieldWorkerEnding(client, undoer());
    expect(calls.slice(calls.indexOf('RELEASE'))).toEqual([
      'RELEASE', 'OPEN APPEAL LOCK', 'NOW', 'HEAD', 'APPEAL APPEND', 'APPEAL WRITER ON', 'APPEAL UPDATE', 'APPEAL WRITER OFF', 'REASON READ',
    ]);
  });

  it('check order under the lock: (2′) terminated → (2a) the version → (2b) the Panel refusal (Q6 B) → (3d) the target; each refusal stops before STREAM', async () => {
    // (2a) BEATS (2b): a stale version on a Panel-refused ending ⇒ EndingChanged.
    let s = appealStub({ panelRefused: true });
    expect(await caught(() => undoFieldWorkerEnding(s.client, undoer(3)))).toBeInstanceOf(FieldWorkerEndingChangedError);
    expect(s.calls).toEqual(['SAVEPOINT', 'LOCK', 'ROLLBACK TO', 'RELEASE']);
    // (2b) BEATS (3d): a Panel refusal with a stale target ⇒ AppealRefusedByPanel.
    s = appealStub({ panelRefused: true });
    const stale = { ...undoer(), authorization: authAt('Gaya', { key: UNDO_KEY }) };
    expect(await caught(() => undoFieldWorkerEnding(s.client, stale))).toBeInstanceOf(FieldWorkerAppealRefusedByPanelError);
    expect(s.calls).toEqual(['SAVEPOINT', 'LOCK', 'PANEL REFUSED', 'ROLLBACK TO', 'RELEASE']);
    // (3d) without a refusal ⇒ AuthorizationStale, before STREAM.
    s = appealStub();
    expect(await caught(() => undoFieldWorkerEnding(s.client, stale))).toBeInstanceOf(FieldWorkerAuthorizationStaleError);
    expect(s.calls).not.toContain('STREAM');
  });

  it('guard (0) before ANY statement: a wrong key, the trustee actor kind, a malformed version', async () => {
    for (const bad of [
      { ...undoer(), authorization: authAt('Patna', { key: 'field_worker.terminate' }) },
      { ...undoer(), actor: 'trustee' as const },
      { ...undoer(), expectedEndingVersion: 1 },
      { ...undoer(), expectedEndingVersion: Number.NaN },
    ]) {
      const s = appealStub();
      expect(await caught(() => undoFieldWorkerEnding(s.client, bad))).toBeInstanceOf(FieldWorkerProjectorInputError);
      expect(s.calls).toEqual([]);
    }
  });
});

describe('Story 13.1f — the appeal (AD9): the lodge order, the decide lock order', () => {
  const lodger = (over: Partial<Parameters<typeof lodgeFieldWorkerEndingAppeal>[1]> = {}) => ({
    pariwarId: P,
    fieldWorkerId: FW,
    appealId: fieldWorkerEndingAppealId(APPEAL),
    auditId: AUDIT,
    actor: 'trustee' as const,
    actorId: TRUSTEE,
    authorization: panelAuth(),
    expectedEndingVersion: 2,
    receivedOn: '2026-11-02',
    receivedVia: 'phone',
    ...over,
  });

  it('lodge: LOCK → CURRENT ENDING → OPEN APPEAL LOCK → REFUSED COUNT → NOW → (the lodge projector) — the worker lock FIRST', async () => {
    const { client, calls } = appealStub();
    await lodgeFieldWorkerEndingAppeal(client, lodger());
    expect(calls.slice(0, 5)).toEqual(['LOCK', 'CURRENT ENDING', 'OPEN APPEAL LOCK', 'REFUSED COUNT', 'NOW']);
    expect(calls).toContain('APPEAL INSERT');
  });

  it('lodge check order (AC5 (i)): version BEATS the hearer; the hearer BEATS open; open BEATS already-decided; already-decided BEATS the dates', async () => {
    // version (2) before the hearer (3): a stale version AND the wrong key ⇒ EndingChanged.
    expect(await caught(() => lodgeFieldWorkerEndingAppeal(appealStub({ heardBy: 'pariwar_admin' }).client, lodger({ expectedEndingVersion: 3 })))).toBeInstanceOf(
      FieldWorkerEndingChangedError,
    );
    // hearer (3) before open (4).
    expect(await caught(() => lodgeFieldWorkerEndingAppeal(appealStub({ heardBy: 'pariwar_admin', openAppeal: true }).client, lodger()))).toBeInstanceOf(
      FieldWorkerAppealWrongHearerError,
    );
    // open (4) before already-decided (5).
    expect(await caught(() => lodgeFieldWorkerEndingAppeal(appealStub({ openAppeal: true, refusedCount: 1 }).client, lodger()))).toBeInstanceOf(FieldWorkerAppealOpenError);
    // already-decided (5) before the dates (6).
    expect(await caught(() => lodgeFieldWorkerEndingAppeal(appealStub({ refusedCount: 1 }).client, lodger({ receivedOn: '2026-12-31' })))).toBeInstanceOf(
      FieldWorkerAppealAlreadyDecidedError,
    );
    // the dates (6), last.
    expect(await caught(() => lodgeFieldWorkerEndingAppeal(appealStub().client, lodger({ receivedOn: '2026-12-31' })))).toBeInstanceOf(FieldWorkerAppealDateInvalidError);
  });

  const decider = (over: Partial<Parameters<typeof refuseFieldWorkerEndingAppeal>[1]> = {}) => ({
    pariwarId: P,
    appealId: fieldWorkerEndingAppealId(APPEAL),
    auditId: AUDIT,
    actor: 'trustee' as const,
    actorId: STAFF,
    authorization: panelAuth(STAFF),
    decidedOn: '2026-11-03',
    ...over,
  });

  it('decide / withdraw lock order (TR5, AC6 (i)): APPEAL WORKER (unlocked) → LOCK (the worker) → APPEAL LOCK → NOW — never the appeal first', async () => {
    for (const act of [refuseFieldWorkerEndingAppeal, withdrawFieldWorkerEndingAppeal, allowFieldWorkerEndingAppeal]) {
      const { client, calls } = appealStub();
      await act(client, decider());
      expect(calls.slice(0, 4), act.name).toEqual(['APPEAL WORKER', 'LOCK', 'APPEAL LOCK', 'NOW']);
    }
  });

  it('decide check order (AC6 (i)): the key vs heard_by → open → the ender → the dates', async () => {
    // hearer before open.
    expect(await caught(() => refuseFieldWorkerEndingAppeal(appealStub({ appealState: 'refused' }).client, decider({ actor: 'operator', authorization: paHearAuth() })))).toBeInstanceOf(
      FieldWorkerAppealWrongHearerError,
    );
    // open before the ender.
    expect(await caught(() => refuseFieldWorkerEndingAppeal(appealStub({ appealState: 'withdrawn' }).client, decider({ actorId: ENDER, authorization: panelAuth(ENDER) })))).toBeInstanceOf(
      FieldWorkerAppealNotOpenError,
    );
    // the ender before the dates.
    expect(await caught(() => refuseFieldWorkerEndingAppeal(appealStub().client, decider({ actorId: ENDER, authorization: panelAuth(ENDER), decidedOn: '2026-12-31' })))).toBeInstanceOf(
      FieldWorkerAppealDeciderIsEnderError,
    );
    expect(await caught(() => refuseFieldWorkerEndingAppeal(appealStub().client, decider({ decidedOn: '2026-12-31' })))).toBeInstanceOf(FieldWorkerAppealDateInvalidError);
  });
});
