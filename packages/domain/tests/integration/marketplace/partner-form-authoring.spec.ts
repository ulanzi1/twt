// Story 12.5b (Task 2; AC1, AC2; QE2) — authoring through the REAL command, live. Per-test ROLLBACK.
// A `partner_form` and a `trust_sends` manifest are authored by `authorModule`: the row and the genesis both carry v2 and the route,
// and the row equals the fold of its stream (I4). A STORED v1 stream (genesis built from the literal `1`, as 12.1 wrote it) still
// folds to its row and reads as `trust_sends` (AC2).

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { pariwarId as toPariwarId } from '../../../src/ids/index.js';
import { activateModule, authorModule } from '../../../src/marketplace/commands.js';
import { ModuleAuthoredPayloadSchema, moduleAuthoredLeadRoute } from '../../../src/marketplace/events.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { enterAppScope } from '../_helpers.js';
import {
  RAW_INSERT_SQL,
  SEEDED_PARTNER_FORM_URL,
  expectRowMatchesStream,
  manifestInput,
  newModuleId,
  partnerFormManifestInput,
  rawInsertParams,
  rowOf,
  seedPartner,
  txNow,
} from './_fixtures.js';

describe.skipIf(!hasDatabase)('Story 12.5b — authoring a v2 manifest (AC1, AC2)', () => {
  setupLiveDb();

  it('AC1: a partner_form manifest → the row and the genesis carry v2, the route and the page; ⛔ places; the row equals its fold', async () => {
    const { client } = getTx();
    const p = toPariwarId(randomUUID());
    const partnerId = await seedPartner(client, p);
    await enterAppScope(client, p);
    const id = newModuleId();
    const base = { pariwarId: p, moduleId: id, actor: 'operator' as const, actorId: randomUUID() };
    await authorModule(client, { ...base, auditId: randomUUID(), manifest: partnerFormManifestInput(await txNow(client), { partner_id: partnerId }) });
    expect(await rowOf(client, id)).toMatchObject({
      lead_route: 'partner_form',
      partner_form_url: SEEDED_PARTNER_FORM_URL,
      lead_handoff_url: null,
      lead_handoff_signing_key_secret_name: null,
      slot_capacity: null,
      slots_remaining: null,
      manifest_schema_version: 2,
    });
    const g = await client.query<{ payload: Record<string, unknown> }>(
      `SELECT payload FROM events_log WHERE stream_id = $1 AND event_type = 'module.authored'`,
      [id],
    );
    expect(g.rows[0]!.payload).toMatchObject({ manifest_schema_version: 2, lead_route: 'partner_form', partner_form_url: SEEDED_PARTNER_FORM_URL, slot_capacity: null });
    expect(g.rows[0]!.payload).not.toHaveProperty('lead_handoff_url');
    expect(g.rows[0]!.payload).not.toHaveProperty('lead_handoff_signing_key_secret_name');
    await activateModule(client, { ...base, auditId: randomUUID() });
    await expectRowMatchesStream(client, id);
  });

  it('AC1: a trust_sends manifest → v2 with lead_route trust_sends and ⛔ partner page; capacity as before', async () => {
    const { client } = getTx();
    const p = toPariwarId(randomUUID());
    const partnerId = await seedPartner(client, p);
    await enterAppScope(client, p);
    const id = newModuleId();
    await authorModule(client, {
      pariwarId: p, moduleId: id, auditId: randomUUID(), actor: 'operator', actorId: randomUUID(),
      manifest: manifestInput(await txNow(client), { partner_id: partnerId }),
    });
    expect(await rowOf(client, id)).toMatchObject({ lead_route: 'trust_sends', partner_form_url: null, slot_capacity: 5, slots_remaining: 5, manifest_schema_version: 2 });
    const g = await client.query<{ payload: Record<string, unknown> }>(`SELECT payload FROM events_log WHERE stream_id = $1`, [id]);
    expect(g.rows[0]!.payload).toMatchObject({ manifest_schema_version: 2, lead_route: 'trust_sends', slot_capacity: 5 });
    await expectRowMatchesStream(client, id);
  });

  it('AC2: a STORED v1 stream (genesis with the literal 1) folds to its row — slotsRemaining = the stored capacity — and reads as trust_sends', async () => {
    const { client } = getTx();
    const p = toPariwarId(randomUUID());
    const partnerId = await seedPartner(client, p);
    const id = randomUUID();
    // The row as 12.1 wrote it (v1, the route through 0216's DEFAULT — here named, the value every old row took).
    await client.query("SET LOCAL app.marketplace_module_state_writer = 'on'");
    await client.query(RAW_INSERT_SQL, rawInsertParams(id, p, { partnerId, capacity: 3 }));
    await client.query("SET LOCAL app.marketplace_module_state_writer = 'off'");
    const storedV1 = {
      from_state: null,
      to_state: 'draft',
      trigger: 'module.author',
      actor: 'operator',
      module_id: id,
      pariwar_id: p,
      manifest_schema_version: 1,
      partner_id: partnerId,
      name_en: 'n',
      name_hi: 'न',
      description_en: 'd',
      description_hi: 'द',
      eligibility_filter: { version: 1, clauses: [] },
      scope_filter: { version: 1, scope: 'members-all' },
      valid_from: '2026-11-01T00:00:00.000Z',
      valid_until: '2027-11-01T00:00:00.000Z',
      slot_capacity: 3,
      lead_handoff_url: 'https://leads.partner.example/x',
      lead_handoff_signing_key_secret_name: 'k',
      branding_bundle: { version: 1, logo_object_key: null, accent_color_hex: null },
    };
    await client.query(
      `INSERT INTO events_log (stream_id, event_type, payload, event_version, actor_id, pariwar_id) VALUES ($1, 'module.authored', $2, 1, $3, $4)`,
      [id, JSON.stringify(storedV1), randomUUID(), p],
    );
    const stored = await client.query<{ payload: unknown }>(`SELECT payload FROM events_log WHERE stream_id = $1`, [id]);
    const parsed = ModuleAuthoredPayloadSchema.safeParse(stored.rows[0]!.payload);
    expect(parsed.success).toBe(true);
    expect(moduleAuthoredLeadRoute(parsed.data!)).toBe('trust_sends');
    expect(await rowOf(client, id)).toMatchObject({ lead_route: 'trust_sends', manifest_schema_version: 1, slots_remaining: 3 });
    await expectRowMatchesStream(client, id);
  });
});
