// Story 13.1d code review CR12 (I1; checklist family 3) — the five request commands' guard (0) runs BEFORE any statement, DB-free. The
// twin of `commands-guards.test.ts`'s QE7 / QE18 legs for the seven 13.1 commands, which list none of these. A stub client records every
// statement and answers each with a thrown sentinel, so "nothing sent" is an assertion and "the guard let a correct call through" is a
// CONTROL: a correct call reaches its first statement.
//   - HUMAN only: `system`, `member`, a null or an empty actorId (`assertHumanActor`);
//   - the authorization is a VERIFIED result of the RBAC check, for THIS Pariwar and actor, at the DISTRICT dimension, and for THIS act's key
//     (`verifiedSnapshot`) — an accept carrying a `field_worker.move` snapshot is refused, else `postFieldWorker`'s own key list would admit
//     it and the direct move's supersede would end the very request being accepted.

import { describe, expect, it } from 'vitest';
import type pg from 'pg';

import { FieldWorkerProjectorInputError } from '../../src/field-worker/errors.js';
import {
  acceptFieldWorkerMoveRequest,
  closeFieldWorkerMoveRequest,
  openFieldWorkerMoveRequest,
  refuseFieldWorkerMoveRequest,
  withdrawFieldWorkerMoveRequest,
} from '../../src/field-worker/move-request-commands.js';
import { fieldWorkerId, fieldWorkerMoveRequestId, pariwarId } from '../../src/ids/index.js';
import { authorize, type EffectiveGrant, type VerifiedAuthorization } from '../../src/rbac/check.js';

const P = '11111111-1111-1111-1111-111111111111';
const OTHER_P = '22222222-2222-2222-2222-222222222222';
const ACTOR = '2c1f0a9e-8b7d-4c6e-9f5a-3b2c1d0e9f8a';
const OTHER_ACTOR = '99999999-9999-4999-8999-999999999999';
const AUDIT = '0d4b8e2a-1c3f-4a5b-9c6d-7e8f9a0b1c2d';
const FW = fieldWorkerId('6ba7b810-9dad-41d1-80b4-00c04fd430c8');
const REQ = fieldWorkerMoveRequestId('7c9e6679-7425-40de-944b-e07fc1f90ae7');

const districtAdmin = (pariwar: string): EffectiveGrant => ({ pariwarId: pariwar, role: 'district_admin', scopeDimension: 'district', scopeValue: 'Gaya' }) as EffectiveGrant;
const pariwarAdmin = (pariwar: string): EffectiveGrant => ({ pariwarId: pariwar, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: pariwar }) as EffectiveGrant;

interface Over {
  actorId?: string;
  pariwar?: string;
  /** The dimension the check ran at — `district` (what every request act needs) or `pariwar`. */
  dimension?: 'district' | 'pariwar';
}
/** A genuine `authorize` result: the district admin's grant is at Gaya, the pariwar admin's at the Pariwar (it covers any district). */
function verified(key: string, holder: 'district_admin' | 'pariwar_admin', o: Over = {}): VerifiedAuthorization {
  const pariwar = o.pariwar ?? P;
  const dimension = o.dimension ?? 'district';
  return authorize({
    actorId: o.actorId ?? ACTOR,
    grants: [holder === 'district_admin' ? districtAdmin(pariwar) : pariwarAdmin(pariwar)],
    key,
    resource: { dimension, value: dimension === 'district' ? 'Gaya' : pariwar, pariwarId: pariwar },
  } as never)!;
}

const base = { pariwarId: pariwarId(P), auditId: AUDIT, actor: 'operator' as const, actorId: ACTOR };

interface Command {
  label: string;
  /** The key the act needs, and who holds it. */
  key: string;
  holder: 'district_admin' | 'pariwar_admin';
  /** Another real key the SAME grant holds — the wrong-key case. */
  wrongKey: string;
  run: (c: pg.PoolClient, authorization: unknown, over?: Record<string, unknown>) => Promise<unknown>;
}
const COMMANDS: Command[] = [
  {
    label: 'open',
    key: 'field_worker.request_move',
    holder: 'district_admin',
    wrongKey: 'field_worker.answer_move_request',
    run: (c, authorization, over) =>
      openFieldWorkerMoveRequest(c, { ...base, moveRequestId: REQ, fieldWorkerId: FW, fromDistrict: 'Patna', toDistrict: 'Gaya', authorization, ...over } as never),
  },
  {
    label: 'accept',
    key: 'field_worker.answer_move_request',
    holder: 'district_admin',
    wrongKey: 'field_worker.request_move',
    run: (c, authorization, over) => acceptFieldWorkerMoveRequest(c, { ...base, moveRequestId: REQ, authorization, ...over } as never),
  },
  {
    label: 'refuse',
    key: 'field_worker.answer_move_request',
    holder: 'district_admin',
    wrongKey: 'field_worker.request_move',
    run: (c, authorization, over) => refuseFieldWorkerMoveRequest(c, { ...base, moveRequestId: REQ, refusalReason: 'other', authorization, ...over } as never),
  },
  {
    label: 'withdraw',
    key: 'field_worker.request_move',
    holder: 'district_admin',
    wrongKey: 'field_worker.answer_move_request',
    run: (c, authorization, over) => withdrawFieldWorkerMoveRequest(c, { ...base, moveRequestId: REQ, authorization, ...over } as never),
  },
  {
    label: 'close',
    key: 'field_worker.settle_move_request',
    holder: 'pariwar_admin',
    wrongKey: 'field_worker.read_move_requests',
    run: (c, authorization, over) => closeFieldWorkerMoveRequest(c, { ...base, moveRequestId: REQ, authorization, ...over } as never),
  },
];

/** Records every statement and answers each with a thrown sentinel — a guard that lets a call through shows as a different error. */
function sendingStub(): { client: pg.PoolClient; calls: string[] } {
  const calls: string[] = [];
  const query = async (text: unknown): Promise<never> => {
    calls.push(typeof text === 'string' ? text : String((text as { text?: unknown }).text));
    throw new Error('stub: a statement was sent');
  };
  return { client: { query } as unknown as pg.PoolClient, calls };
}

describe.each(COMMANDS)('Story 13.1d CR12 — `$label`: guard (0) runs before any statement', (cmd) => {
  const good = () => verified(cmd.key, cmd.holder);

  it('CONTROL: a human actor with a verified authorization for its own key reaches its first statement', async () => {
    const { client, calls } = sendingStub();
    await expect(cmd.run(client, good())).rejects.toThrow('stub: a statement was sent');
    expect(calls.length).toBeGreaterThan(0);
  });

  // RP-17 — the "another ACT's key" leg below is only a test of the KEY if that key is really HELD by this holder: `verified()` ends in
  // `authorize(...)!`, which is NULL at runtime when the grant does not hold the key, and the guard refuses a null authorization too — so the
  // leg would pass for the wrong reason if the catalogue ever moved a key.
  it('CONTROL: the wrong-key result is a REAL authorization for the OTHER key (the same grant holds it), so its refusal is the key’s and not a null’s', () => {
    const wrong = verified(cmd.wrongKey, cmd.holder);
    expect(wrong).not.toBeNull();
    expect(wrong.permissionKey).toBe(cmd.wrongKey);
    expect(wrong.permissionKey).not.toBe(cmd.key);
  });

  it.each([
    ['actor system', { actor: 'system' }],
    ['actor member', { actor: 'member' }],
    ['a null actorId', { actorId: null }],
    ['an empty actorId', { actorId: '' }],
  ])('%s ⇒ FieldWorkerProjectorInputError, nothing sent', async (_label, bad) => {
    const { client, calls } = sendingStub();
    await expect(cmd.run(client, good(), bad)).rejects.toBeInstanceOf(FieldWorkerProjectorInputError);
    expect(calls).toEqual([]);
  });

  it.each([
    ['missing', () => undefined],
    ['an object LITERAL with the same fields (⛔ verified)', () => ({ ...good() })],
    ['another Pariwar’s result', () => verified(cmd.key, cmd.holder, { pariwar: OTHER_P })],
    ['another actor’s result', () => verified(cmd.key, cmd.holder, { actorId: OTHER_ACTOR })],
    ['another ACT’s key (the same grant holds it)', () => verified(cmd.wrongKey, cmd.holder)],
  ])('an authorization that is %s ⇒ FieldWorkerProjectorInputError, nothing sent', async (_label, make) => {
    const { client, calls } = sendingStub();
    await expect(cmd.run(client, make())).rejects.toBeInstanceOf(FieldWorkerProjectorInputError);
    expect(calls).toEqual([]);
  });
});

describe('Story 13.1d CR12 — the two keys that matter most', () => {
  it('an ACCEPT carrying a `field_worker.move` snapshot (the Pariwar Admin’s direct-move key) is refused before any statement', async () => {
    const move = verified('field_worker.move', 'pariwar_admin');
    expect(move.permissionKey).toBe('field_worker.move'); // CONTROL: it IS a verified result, for this Pariwar and actor, at a district
    const { client, calls } = sendingStub();
    await expect(acceptFieldWorkerMoveRequest(client, { ...base, moveRequestId: REQ, authorization: move } as never)).rejects.toBeInstanceOf(FieldWorkerProjectorInputError);
    expect(calls).toEqual([]);
  });

  it('a close checked at the PARIWAR dimension is refused (the right key at the wrong dimension), nothing sent', async () => {
    const wide = verified('field_worker.settle_move_request', 'pariwar_admin', { dimension: 'pariwar' });
    expect(wide.target.dimension).toBe('pariwar'); // CONTROL: the check passed — at the wrong dimension
    const { client, calls } = sendingStub();
    await expect(closeFieldWorkerMoveRequest(client, { ...base, moveRequestId: REQ, authorization: wide } as never)).rejects.toBeInstanceOf(FieldWorkerProjectorInputError);
    expect(calls).toEqual([]);
  });
});
