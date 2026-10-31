// Story 12.1 — the legs that need DB time to PASS between two transactions (TR4, TR11). Live DB.
//
// `now()` is the TRANSACTION START, so one transaction has ONE `now()`: a module cannot be "not yet open"
// and "open" inside one test transaction. So: transaction 1 authors with an edge 2 s away and COMMITS;
// sleep 2.5 s; transaction 2 runs the leg. Own pool, own commits; cleanup by the ids this suite created
// (`session_replication_role = 'replica'` sheds the events_log append-only trigger for the test purge).

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { bindScopedDb, setPariwarScope } from '../../../src/db.js';
import { pariwarId as toPariwarId, type ModuleId } from '../../../src/ids/index.js';
import {
  activateModule,
  archiveModule,
  authorModule,
  checkModuleLeadAllowed,
  scheduleModule,
  submitModuleLead,
} from '../../../src/marketplace/commands.js';
import { ModuleOutsideWindowError } from '../../../src/marketplace/errors.js';
import { DATABASE_URL, hasDatabase } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A } from '../_helpers.js';
import { HOUR_MS, expectRowMatchesStream, manifestInput, newLeadId, newMemberId, newModuleId, streamTypes, txNow } from './_fixtures.js';

const A = toPariwarId(PARIWAR_A);
const OPERATOR = randomUUID();
const EDGE_MS = 2_000;

describe.skipIf(!hasDatabase)('marketplace commands — across the clock (own-committing, TR4)', () => {
  let pool: pg.Pool;
  const created: ModuleId[] = [];

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 2, ssl: false });
    pool.on('error', (err) => console.error('[commands-clock pool]', err.message));
  });

  afterAll(async () => {
    if (!pool) return;
    const admin = await pool.connect();
    try {
      await admin.query('BEGIN');
      await admin.query("SET LOCAL session_replication_role = 'replica'");
      await admin.query('DELETE FROM marketplace_modules WHERE module_id = ANY($1)', [created]);
      await admin.query('DELETE FROM events_log WHERE stream_id = ANY($1)', [created]);
      await admin.query('COMMIT');
    } catch (e) {
      await admin.query('ROLLBACK').catch(() => undefined);
      console.error('[commands-clock.spec] cleanup:', (e as Error).message);
    } finally {
      admin.release();
      await pool.end();
    }
  });

  /** Run `fn` in its own committed app-scoped transaction. */
  async function inTx<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET LOCAL ROLE twt_app');
      await setPariwarScope(client, PARIWAR_A);
      const out = await fn(client);
      await client.query('COMMIT');
      return out;
    } catch (e) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw e;
    } finally {
      client.release();
    }
  }

  const base = (moduleId: ModuleId) => ({ pariwarId: A, moduleId, auditId: randomUUID(), actor: 'operator' as const, actorId: OPERATOR });

  it('scheduled → active once valid_from passes; a lead and an active module refused once valid_until passes, then archived', async () => {
    const opening = newModuleId();
    const closing = newModuleId();
    created.push(opening, closing);
    // RP3: a lead taken while the window is OPEN, redelivered after it has CLOSED — QE7 puts the replay before the refusal.
    const redelivered = { member: newMemberId(), leadId: newLeadId() };

    // Transaction 1: one module opens in 2 s (scheduled now), one closes in 2 s (active now).
    await inTx(async (client) => {
      const now = await txNow(client);
      await authorModule(client, {
        ...base(opening),
        manifest: manifestInput(now, {
          valid_from: new Date(now.getTime() + EDGE_MS).toISOString(),
          valid_until: new Date(now.getTime() + HOUR_MS).toISOString(),
        }),
      });
      await scheduleModule(client, base(opening));
      await authorModule(client, {
        ...base(closing),
        manifest: manifestInput(now, { valid_until: new Date(now.getTime() + EDGE_MS).toISOString() }),
      });
      await activateModule(client, base(closing));
      await submitModuleLead(client, {
        ...base(closing),
        actor: 'member',
        actorId: redelivered.member,
        memberId: redelivered.member,
        leadId: redelivered.leadId,
      });
    });

    await new Promise((r) => setTimeout(r, EDGE_MS + 500));

    // Transaction 2a: scheduled → active is now inside the window.
    await inTx(async (client) => {
      expect(await activateModule(client, base(opening))).toMatchObject({ fromState: 'scheduled', state: 'active' });
      await expectRowMatchesStream(client, opening);
    });

    // Transaction 2b: the closing module is still ACTIVE, but outside its window — a lead is refused, the
    // pre-check says so, and nothing is appended.
    await inTx(async (client) => {
      // RP3: the lead taken before the close is REPLAYED now (pre-check and submit), not refused as outside_window.
      expect(
        await checkModuleLeadAllowed(bindScopedDb(client), {
          pariwarId: A,
          moduleId: closing,
          memberId: redelivered.member,
          leadId: redelivered.leadId,
        }),
      ).toEqual({ ok: true, replayed: true });
      expect(
        await submitModuleLead(client, {
          ...base(closing),
          actor: 'member',
          actorId: redelivered.member,
          memberId: redelivered.member,
          leadId: redelivered.leadId,
        }),
      ).toMatchObject({ replayed: true, leadId: redelivered.leadId });

      const member = newMemberId();
      const leadId = newLeadId();
      expect(
        await checkModuleLeadAllowed(bindScopedDb(client), { pariwarId: A, moduleId: closing, memberId: member, leadId }),
      ).toEqual({ ok: false, refusal: 'outside_window' });
      await expect(
        submitModuleLead(client, { ...base(closing), actor: 'member', actorId: member, memberId: member, leadId }),
      ).rejects.toBeInstanceOf(ModuleOutsideWindowError);
      // The refusal rolled back its own savepoint — this transaction goes on to archive.
      expect(await streamTypes(client, closing)).toEqual(['module.authored', 'module.activated', 'module.lead_submitted']);
      const archived = await archiveModule(client, {
        ...base(closing),
        actor: 'system',
        actorId: null,
        reason: 'valid_until_reached',
      });
      expect(archived).toMatchObject({ fromState: 'active', state: 'archived', reason: 'valid_until_reached' });
      await expectRowMatchesStream(client, closing);
    });

    // And activating once the window has CLOSED is refused (a draft authored back when it was open).
    const late = newModuleId();
    created.push(late);
    await inTx(async (client) => {
      const now = await txNow(client);
      await authorModule(client, {
        ...base(late),
        manifest: manifestInput(now, { valid_until: new Date(now.getTime() + EDGE_MS).toISOString() }),
      });
    });
    await new Promise((r) => setTimeout(r, EDGE_MS + 500));
    await inTx(async (client) => {
      await expect(activateModule(client, base(late))).rejects.toBeInstanceOf(ModuleOutsideWindowError);
      expect(await streamTypes(client, late)).toEqual(['module.authored']);
    });
  }, 20_000);
});
