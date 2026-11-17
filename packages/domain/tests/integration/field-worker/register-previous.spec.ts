// Story 13.1f — the READ halves of the shown number and the link (AC9, AC10; AD11, AD12) against the live DB: the ended-by-number read,
// the link's lock read, and the link chain. Per-test ROLLBACK, as twt_app under a FRESH Pariwar's scope (RLS live). The HTTP shape, the
// audit line and the 409 / 422 are the API's `undo-appeal.spec.ts`; the FOR SHARE race is `ending-appeal-race.spec.ts`.

import { randomUUID } from 'node:crypto';

import type pg from 'pg';
import { beforeEach, describe, expect, it } from 'vitest';

import { registerFieldWorker, terminateFieldWorker } from '../../../src/field-worker/commands.js';
import {
  FIELD_WORKER_LINK_CHAIN_MAX,
  PREVIOUS_ENDINGS_SHOWN_MAX,
  findEndedFieldWorkersByMobileIndex,
  listFieldWorkerLinkChain,
  lockFieldWorkerForLink,
} from '../../../src/field-worker/read.js';
import { bindScopedDb } from '../../../src/db.js';
import { fieldWorkerId as toFieldWorkerId, pariwarId as toPariwarId, type FieldWorkerId, type PariwarId } from '../../../src/ids/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { enterAppScope, seedRoleGrant } from '../_helpers.js';
import { GUARD_OFF, GUARD_ON, actAuthorization, registerAuthorization, registerReal } from './_fixtures.js';

describe.skipIf(!hasDatabase)('Story 13.1f — the shown number and the link: the reads (live DB)', () => {
  setupLiveDb();
  let c: pg.PoolClient;
  let P: PariwarId;
  let pa: string;

  beforeEach(async () => {
    const { tx, client } = getTx();
    c = client;
    P = toPariwarId(randomUUID());
    pa = await seedRoleGrant(tx, P, { role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: P });
    await enterAppScope(c, P);
  });

  const today = async () => (await c.query<{ d: string }>("SELECT ((now() AT TIME ZONE 'Asia/Kolkata')::date)::text AS d")).rows[0]!.d;
  async function end(id: FieldWorkerId, district = 'Patna', reason = 'inactive'): Promise<void> {
    await terminateFieldWorker(c, {
      pariwarId: P, fieldWorkerId: id, auditId: randomUUID(), actor: 'operator', actorId: pa, reasonCode: reason,
      endedOn: await today(), authorization: actAuthorization('field_worker.terminate', P, district, pa), appealHeardBy: 'trustee_panel',
    });
  }
  /** Register through the genesis command, linked to `previous` (the projector writes the column). */
  async function registerLinked(index: string, previous: FieldWorkerId): Promise<FieldWorkerId> {
    const id = toFieldWorkerId(randomUUID());
    await registerFieldWorker(c, {
      pariwarId: P, fieldWorkerId: id, auditId: randomUUID(), actor: 'operator', actorId: pa, nameCiphertext: 'enc:v1:n', mobileCiphertext: 'enc:v1:m',
      mobileBlindIndex: index, registeredByDisplay: 'Asha Verma', district: 'Patna', authorization: registerAuthorization(P, 'Patna', pa), previousFieldWorkerId: previous,
    });
    return id;
  }
  const db = () => bindScopedDb(c);

  it('AC9 — the ended-by-number read: this Pariwar’s TERMINATED rows of the number, EVERY district, `ended_on DESC, field_worker_id`, at most 5; ⛔ a live row; ⛔ another Pariwar’s', async () => {
    const index = `idx-${randomUUID()}`;
    const ended: FieldWorkerId[] = [];
    for (const district of ['Patna', 'Gaya', 'Patna', 'Gaya', 'Patna', 'Gaya']) {
      const id = await registerReal(c, P, { district, mobileBlindIndex: index });
      await end(id, district);
      ended.push(id);
    }
    const live = await registerReal(c, P, { mobileBlindIndex: index });
    // Another Pariwar: the same blind index, ended — never shown.
    const other = toPariwarId(randomUUID());
    await c.query('RESET ROLE');
    const otherPa = await seedRoleGrant(getTx().tx, other, { role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: other });
    await enterAppScope(c, other);
    const foreign = await registerReal(c, other, { mobileBlindIndex: index, actorId: otherPa });
    await enterAppScope(c, P);
    const shown = await findEndedFieldWorkersByMobileIndex(db(), P, index);
    expect(shown).toHaveLength(PREVIOUS_ENDINGS_SHOWN_MAX);
    // Six endings on ONE day: the tie is broken by the id, ascending (AD11).
    expect(shown.map((e) => e.fieldWorkerId)).toEqual([...ended].sort().slice(0, PREVIOUS_ENDINGS_SHOWN_MAX));
    expect(shown.every((e) => e.reasonCode === 'inactive' && e.endedOn === shown[0]!.endedOn)).toBe(true);
    expect(shown.map((e) => e.fieldWorkerId)).not.toContain(live);
    expect(shown.map((e) => e.fieldWorkerId)).not.toContain(foreign);
    expect(Object.keys(shown[0]!).sort()).toEqual(['endedOn', 'fieldWorkerId', 'reasonCode']); // ⛔ a name, district or officer (Q3 A)
    expect(await findEndedFieldWorkersByMobileIndex(db(), P, `idx-${randomUUID()}`)).toEqual([]); // CONTROL — another number
  });

  it('AC10 — the link lock read: the state and blind index, FOR SHARE; null for an unknown id and for another Pariwar’s', async () => {
    const index = `idx-${randomUUID()}`;
    const id = await registerReal(c, P, { mobileBlindIndex: index });
    await end(id);
    expect(await lockFieldWorkerForLink(db(), P, id)).toEqual({ currentState: 'terminated', mobileBlindIndex: index });
    expect(await lockFieldWorkerForLink(db(), P, toFieldWorkerId(randomUUID()))).toBeNull();
    expect(await lockFieldWorkerForLink(db(), toPariwarId(randomUUID()), id)).toBeNull();
  });

  it('AC10 (c) — the link chain: nearest first with each district; a two-hop chain is followed; an 11-hop chain stops at 10; the genesis payload and the column carry the link', async () => {
    const index = `idx-${randomUUID()}`;
    let prev = await registerReal(c, P, { mobileBlindIndex: index });
    await end(prev);
    const chain: FieldWorkerId[] = [prev];
    for (let n = 0; n < FIELD_WORKER_LINK_CHAIN_MAX + 1; n += 1) {
      const next = await registerLinked(index, prev);
      await end(next);
      chain.push(next);
      prev = next;
    }
    const newest = chain.at(-1)!;
    const followed = await listFieldWorkerLinkChain(db(), P, newest);
    expect(followed).toHaveLength(FIELD_WORKER_LINK_CHAIN_MAX); // 11 earlier records, capped at 10
    expect(followed.map((x) => x.fieldWorkerId)).toEqual(chain.slice(0, -1).reverse().slice(0, FIELD_WORKER_LINK_CHAIN_MAX));
    expect(followed[0]).toEqual({ fieldWorkerId: chain.at(-2), district: 'Patna' });
    const twoHop = await listFieldWorkerLinkChain(db(), P, chain[2]!);
    expect(twoHop.map((x) => x.fieldWorkerId)).toEqual([chain[1], chain[0]]);
    expect(await listFieldWorkerLinkChain(db(), P, chain[0]!)).toEqual([]); // CONTROL — the first record links to nothing
    const row = (await c.query<{ previous_field_worker_id: string }>('SELECT previous_field_worker_id FROM field_workers WHERE field_worker_id = $1', [chain[1]])).rows[0]!;
    expect(row.previous_field_worker_id).toBe(chain[0]);
    const genesis = (await c.query<{ payload: Record<string, unknown> }>("SELECT payload FROM events_log WHERE stream_id = $1 AND event_version = 1", [chain[1]])).rows[0]!.payload;
    expect(genesis['previous_field_worker_id']).toBe(chain[0]);
  });

  it('AC10 — the self-link CHECK and the composite FK hold below the command (owner, guarded)', async () => {
    const id = await registerReal(c, P);
    await c.query('RESET ROLE');
    await c.query(GUARD_ON);
    let code = '';
    await c.query('SAVEPOINT s');
    try {
      await c.query(
        `INSERT INTO field_workers (field_worker_id, pariwar_id, name_ciphertext, mobile_ciphertext, mobile_blind_index, registered_by_user_id, registered_by_display, current_state, state_event_version, kyc_status, district, audit_id, previous_field_worker_id)
         VALUES ($1, $2, 'enc:v1:n', 'enc:v1:m', $3, gen_random_uuid(), 'X', 'pending_kyc', 1, 'pending', 'Patna', gen_random_uuid(), $1)`,
        [randomUUID(), P, `idx-${randomUUID()}`],
      );
    } catch (e) {
      code = `${(e as { code?: string }).code}:${(e as { constraint?: string }).constraint}`;
    }
    await c.query('ROLLBACK TO SAVEPOINT s');
    // A self-link fails first on the FK (the row does not exist yet) — the CHECK is the backstop; either way it is refused.
    expect(['23503:field_workers_previous_fk', '23514:field_workers_previous_not_self']).toContain(code);
    await c.query(GUARD_OFF);
    expect(id).toBeTruthy(); // CONTROL — an unlinked registration stands
  });
});
