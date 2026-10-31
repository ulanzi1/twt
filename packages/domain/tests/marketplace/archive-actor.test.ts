// Story 12.1 review RV8 — attribution on `archiveModule`, DB-free. `trustee_archived` is a person's decision,
// so it cannot be recorded under the `system` actor (the sweep): the event and `archive_reason` would blame
// the sweep for a trustee's act (checklist family 8). The check runs BEFORE any statement. The two AUTOMATIC
// reasons are not actor-gated — their own guards prove the reason TRUE whoever calls — so for them (and for a
// staff actor) the command goes on to the database, which this stub refuses.

import { describe, expect, it } from 'vitest';
import type pg from 'pg';

import { moduleId, pariwarId } from '../../src/ids/index.js';
import { archiveModule } from '../../src/marketplace/commands.js';
import { ModuleProjectorInputError } from '../../src/marketplace/errors.js';

const PARIWAR = pariwarId('11111111-1111-1111-1111-111111111111');
const MODULE = moduleId('6ba7b810-9dad-41d1-80b4-00c04fd430c8');
const STAFF = '9b2f6c6e-3f4a-4d5b-8c7d-1e2f3a4b5c6d';
const AUDIT = 'c56a4180-65aa-42ec-a945-5fd21dec0538';

/** A client that records the SQL it is sent and then refuses it — so "reached the database" is observable. */
function refusingClient(): { client: pg.PoolClient; sent: string[] } {
  const sent: string[] = [];
  const client = {
    query: async (arg: unknown): Promise<never> => {
      sent.push(typeof arg === 'string' ? arg : String((arg as { text?: unknown }).text ?? ''));
      throw new Error('DB touched');
    },
  } as unknown as pg.PoolClient;
  return { client, sent };
}

const base = { pariwarId: PARIWAR, moduleId: MODULE, auditId: AUDIT };

describe('archiveModule — a trustee’s decision is not the sweep’s (RV8)', () => {
  it('refuses trustee_archived under the system actor, with no statement sent', async () => {
    const { client, sent } = refusingClient();
    await expect(
      archiveModule(client, { ...base, actor: 'system', actorId: null, reason: 'trustee_archived' }),
    ).rejects.toBeInstanceOf(ModuleProjectorInputError);
    expect(sent).toEqual([]);
  });

  it.each(['operator', 'trustee'] as const)('trustee_archived from %s passes the rule and reaches the database', async (actor) => {
    const { client, sent } = refusingClient();
    await expect(archiveModule(client, { ...base, actor, actorId: STAFF, reason: 'trustee_archived' })).rejects.toThrow(
      'DB touched',
    );
    expect(sent[0]).toMatch(/^SAVEPOINT/);
  });

  it.each(['valid_until_reached', 'slot_capacity_exhausted'] as const)(
    'the automatic reason %s is NOT actor-gated: the system actor reaches the database',
    async (reason) => {
      const { client, sent } = refusingClient();
      await expect(archiveModule(client, { ...base, actor: 'system', actorId: null, reason })).rejects.toThrow('DB touched');
      expect(sent[0]).toMatch(/^SAVEPOINT/);
    },
  );

  it('a system actor WITH an actorId is still the actor-shape error, whatever the reason', async () => {
    const { client, sent } = refusingClient();
    await expect(
      archiveModule(client, { ...base, actor: 'system', actorId: STAFF, reason: 'valid_until_reached' }),
    ).rejects.toBeInstanceOf(ModuleProjectorInputError);
    expect(sent).toEqual([]);
  });
});
