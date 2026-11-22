// Story 12.5b (Task 3; AC4; QE4 (a)–(d); I2; TR22, TR27, TR28) — the SEND GUARD, live.
//
// A `partner_form` offer never passes a member on. Each line refuses with `ModuleLeadRouteRefusedError` and writes NOTHING, and the
// caller's transaction stays usable (a control write after each refusal lands — TR22): the pre-check (refusal `partner_form_route`),
// `submitModuleLead` (BEFORE the replay — a planted lead event is NOT replayed, TR27), the projector (`lockedRow.leadRoute`),
// `recordLeadHandoff`. The seal: a `partner_form` module refuses BEFORE any KMS call (the fake records zero), and a `trust_sends` one
// seals with its route read COMMITTED first — at the KMS call every client of the test's own pool is idle (TR28). The DB trigger
// (QE4 (e)) is partner-form-schema.spec.ts's.

import { randomBytes, randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { bindScopedDb } from '../../../src/db.js';
import { createFakeKmsProvider } from '../../../src/encryption/fake-kms-provider.js';
import type { KmsProvider } from '../../../src/encryption/kms-provider.js';
import { memberId as toMemberId, moduleId as toModuleId, moduleLeadId, pariwarId as toPariwarId } from '../../../src/ids/index.js';
import { activateModule, authorModule, checkModuleLeadAllowed, submitModuleLead } from '../../../src/marketplace/commands.js';
import { ModuleGenesisMissingError, ModuleLeadRouteRefusedError } from '../../../src/marketplace/errors.js';
import { recordLeadHandoff, sealLeadMemberFields } from '../../../src/marketplace/lead-handoff.js';
import { projectModuleTransition } from '../../../src/marketplace/project.js';
import { DATABASE_URL, getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, enterAppScope } from '../_helpers.js';
import { RAW_INSERT_SQL, manifestInput, rawInsertParams, rawInsertSqlWith, seedPartner, txNow } from './_fixtures.js';
import { SEALED_PLACEHOLDER, seedLeadConsent, seedMemberRow, seedModule } from './_lead-handoff-fixtures.js';

const FIELDS = { full_name: 'Sunita Devi', mobile: '9876543210', district: 'Gaya', preferred_language: 'hi' };

async function leadEvents(client: pg.PoolClient, moduleId: string): Promise<number> {
  const { rows } = await client.query<{ n: string }>(
    `SELECT count(*) AS n FROM events_log WHERE stream_id = $1 AND event_type = 'module.lead_submitted'`,
    [moduleId],
  );
  return Number(rows[0]!.n);
}

describe.skipIf(!hasDatabase)('Story 12.5b — the send guard (AC4)', () => {
  setupLiveDb();

  async function world(client: pg.PoolClient) {
    const partnerId = await seedPartner(client, PARIWAR_A);
    const pf = await seedModule(client, PARIWAR_A, partnerId, { route: 'partner_form' });
    const ts = await seedModule(client, PARIWAR_A, partnerId);
    const memberId = await seedMemberRow(client, PARIWAR_A);
    return { partnerId, pf, ts, memberId };
  }

  it('(a) checkModuleLeadAllowed → { ok: false, refusal: partner_form_route }; a trust_sends offer is allowed (control)', async () => {
    const { client } = getTx();
    const w = await world(client);
    await enterAppScope(client, PARIWAR_A);
    const db = bindScopedDb(client);
    const args = { pariwarId: PARIWAR_A, memberId: toMemberId(w.memberId), leadId: moduleLeadId(randomUUID()) };
    expect(await checkModuleLeadAllowed(db, { ...args, moduleId: toModuleId(w.pf) })).toEqual({ ok: false, refusal: 'partner_form_route' });
    expect(await checkModuleLeadAllowed(db, { ...args, moduleId: toModuleId(w.ts) })).toEqual({ ok: true, replayed: false });
  });

  it('(a) submitModuleLead refuses with ModuleLeadRouteRefusedError, writes ⛔ event and ⛔ place; the transaction stays usable', async () => {
    const { client } = getTx();
    const w = await world(client);
    await enterAppScope(client, PARIWAR_A);
    const base = { pariwarId: PARIWAR_A, memberId: toMemberId(w.memberId), actor: 'member' as const, actorId: w.memberId, auditId: randomUUID() };
    const err = await submitModuleLead(client, { ...base, moduleId: toModuleId(w.pf), leadId: moduleLeadId(randomUUID()) }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ModuleLeadRouteRefusedError);
    expect(err).toMatchObject({ moduleId: w.pf, operation: 'lead', code: 'module.lead_route_partner_form' });
    expect(await leadEvents(client, w.pf)).toBe(0);
    // Control: the same transaction records a lead on a REAL (authored + activated) trust_sends offer.
    const real = toModuleId(randomUUID());
    const staff = { pariwarId: PARIWAR_A, moduleId: real, actor: 'operator' as const, actorId: randomUUID() };
    await authorModule(client, { ...staff, auditId: randomUUID(), manifest: manifestInput(await txNow(client), { partner_id: w.partnerId }) });
    await activateModule(client, { ...staff, auditId: randomUUID() });
    const ok = await submitModuleLead(client, { ...base, moduleId: real, leadId: moduleLeadId(randomUUID()) });
    expect(ok.replayed).toBe(false);
    expect(await leadEvents(client, real)).toBe(1);
  });

  it('TR27: the route refusal is BEFORE the replay — a planted lead event for the same lead + member is NOT replayed', async () => {
    const { client } = getTx();
    const w = await world(client);
    const leadId = randomUUID();
    // A lead that can never legitimately exist, planted as the superuser (version 3 — the seeded stream has no events; head check is
    // not reached because the route refuses first).
    await client.query(
      `INSERT INTO events_log (stream_id, event_type, payload, event_version, actor_id, pariwar_id)
       VALUES ($1, 'module.lead_submitted', $2, 1, $3, $4)`,
      [
        w.pf,
        JSON.stringify({ lead_id: leadId, member_id: w.memberId, slots_remaining_after: null, from_state: 'active', to_state: 'active', trigger: 't', actor: 'member' }),
        w.memberId,
        PARIWAR_A,
      ],
    );
    await enterAppScope(client, PARIWAR_A);
    const args = { pariwarId: PARIWAR_A, moduleId: toModuleId(w.pf), memberId: toMemberId(w.memberId), leadId: moduleLeadId(leadId) };
    expect(await checkModuleLeadAllowed(bindScopedDb(client), args)).toEqual({ ok: false, refusal: 'partner_form_route' });
    await expect(submitModuleLead(client, { ...args, actor: 'member', actorId: w.memberId, auditId: randomUUID() })).rejects.toBeInstanceOf(
      ModuleLeadRouteRefusedError,
    );
  });

  it('(b) projectModuleTransition refuses module.lead_submitted on a partner_form locked row, before any statement', async () => {
    const { client } = getTx();
    const w = await world(client);
    await enterAppScope(client, PARIWAR_A);
    const err = await projectModuleTransition(client, {
      pariwarId: PARIWAR_A,
      moduleId: toModuleId(w.pf),
      eventType: 'module.lead_submitted',
      payload: { lead_id: randomUUID(), member_id: w.memberId, slots_remaining_after: null, from_state: 'active', to_state: 'active', trigger: 't', actor: 'member' },
      auditId: randomUUID(),
      actor: 'member',
      actorId: w.memberId,
      lockedRow: { currentState: 'active', stateEventVersion: 2, slotsRemaining: null, slotCapacity: null, leadRoute: 'partner_form' },
    }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ModuleLeadRouteRefusedError);
    expect((err as ModuleLeadRouteRefusedError).operation).toBe('projector');
    expect(await leadEvents(client, w.pf)).toBe(0);
    // The transaction is usable (no statement ran).
    expect((await client.query('SELECT 1 AS one')).rows).toEqual([{ one: 1 }]);
  });

  it('(d) recordLeadHandoff refuses a partner_form module, writes ⛔ row; the transaction stays usable (a trust_sends control lands)', async () => {
    const { client } = getTx();
    const w = await world(client);
    const leadId = randomUUID();
    const consentId = await seedLeadConsent(client, PARIWAR_A, { subjectId: w.memberId, artifactRef: leadId });
    await enterAppScope(client, PARIWAR_A);
    const input = { pariwarId: PARIWAR_A, leadId, memberId: w.memberId, consentId, sealedFields: SEALED_PLACEHOLDER, auditId: randomUUID() };
    const err = await recordLeadHandoff(client, { ...input, moduleId: w.pf }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ModuleLeadRouteRefusedError);
    expect((err as ModuleLeadRouteRefusedError).operation).toBe('record');
    expect((await client.query('SELECT 1 FROM marketplace_lead_handoffs WHERE lead_id = $1', [leadId])).rows).toHaveLength(0);
    await recordLeadHandoff(client, { ...input, moduleId: w.ts });
    expect((await client.query('SELECT module_id FROM marketplace_lead_handoffs WHERE lead_id = $1', [leadId])).rows).toEqual([{ module_id: w.ts }]);
  });
});

describe.skipIf(!hasDatabase)('Story 12.5b — the seal reads the route in its OWN short scope before KMS (AC4 (c), TR28)', () => {
  let pool: pg.Pool;
  const pariwar = toPariwarId(randomUUID());
  let partnerId: string;
  const pf = randomUUID();
  const ts = randomUUID();

  /** A fake KMS that records, at each encryptDek, whether every client of `pool` was idle (⛔ transaction held open). */
  function recordingKms(): { kms: KmsProvider; idleAtCall: boolean[] } {
    const real = createFakeKmsProvider({ kekBytes: randomBytes(32), hmacKeyBytes: randomBytes(32) });
    const idleAtCall: boolean[] = [];
    const kms: KmsProvider = {
      ...real,
      encryptDek: async (dek, kekRef, aad) => {
        idleAtCall.push(pool.totalCount === pool.idleCount);
        return real.encryptDek(dek, kekRef, aad);
      },
    };
    return { kms, idleAtCall };
  }
  const kekRef = { resourceName: 'projects/p/locations/l/keyRings/r/cryptoKeys/k' };

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 2, ssl: false });
    // COMMITTED seeds: the seal's own connection cannot see an uncommitted test transaction.
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      partnerId = await seedPartner(c, pariwar);
      await c.query("SET LOCAL app.marketplace_module_state_writer = 'on'");
      await c.query(rawInsertSqlWith({ route: 'partner_form' }), rawInsertParams(pf, pariwar, { partnerId, capacity: null }));
      await c.query(RAW_INSERT_SQL, rawInsertParams(ts, pariwar, { partnerId }));
      await c.query('COMMIT');
    } finally {
      c.release();
    }
  });

  afterAll(async () => {
    // Review R2P15: the pool is ALWAYS ended, and a refused DELETE does not leave the committed rows behind unreported.
    try {
      await pool.query('DELETE FROM marketplace_modules WHERE module_id = ANY($1::uuid[])', [[pf, ts]]);
      await pool.query('DELETE FROM marketplace_partners WHERE partner_id = $1', [partnerId]);
    } finally {
      await pool.end();
    }
  });

  it('a partner_form module refuses with ModuleLeadRouteRefusedError BEFORE any KMS call (the fake records zero)', async () => {
    const { kms, idleAtCall } = recordingKms();
    const err = await sealLeadMemberFields(pool, { kms, kekRef }, { pariwarId: pariwar, moduleId: pf, leadId: randomUUID(), fields: FIELDS }).catch(
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(ModuleLeadRouteRefusedError);
    expect((err as ModuleLeadRouteRefusedError).operation).toBe('seal');
    expect(idleAtCall).toEqual([]);
  });

  it('an unknown module throws ModuleGenesisMissingError, also before KMS', async () => {
    const { kms, idleAtCall } = recordingKms();
    await expect(sealLeadMemberFields(pool, { kms, kekRef }, { pariwarId: pariwar, moduleId: randomUUID(), leadId: randomUUID(), fields: FIELDS })).rejects.toBeInstanceOf(
      ModuleGenesisMissingError,
    );
    expect(idleAtCall).toEqual([]);
  });

  it('a trust_sends module seals, called with NO transaction open (as 12.3 will) — at the KMS call every pool client is idle', async () => {
    const { kms, idleAtCall } = recordingKms();
    const sealed = await sealLeadMemberFields(pool, { kms, kekRef }, { pariwarId: pariwar, moduleId: ts, leadId: randomUUID(), fields: FIELDS });
    expect(typeof sealed).toBe('string');
    expect(sealed.length).toBeGreaterThan(0);
    expect(idleAtCall.length).toBeGreaterThan(0);
    expect(idleAtCall.every(Boolean)).toBe(true);
  });
});
