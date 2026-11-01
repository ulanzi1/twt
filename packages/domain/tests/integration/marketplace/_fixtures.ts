// Shared fixtures for the Story 12.1 marketplace live-DB specs. Windows are built RELATIVE to the
// transaction's own `SELECT now()` (TR4), never to the app clock.

import { randomUUID } from 'node:crypto';

import type pg from 'pg';
import { expect } from 'vitest';

import { memberId, moduleId, moduleLeadId, type MemberId, type ModuleId, type ModuleLeadId } from '../../../src/ids/index.js';
import { MODULE_STATE_DIRECT_WRITE_MESSAGE_PREFIX } from '../../../src/marketplace/errors.js';
import { foldModuleProjection, toModuleEvent } from '../../../src/marketplace/state.js';

export const HOUR_MS = 3_600_000;

export const newModuleId = (): ModuleId => moduleId(randomUUID());
export const newMemberId = (): MemberId => memberId(randomUUID());
export const newLeadId = (): ModuleLeadId => moduleLeadId(randomUUID());

/** The transaction-start instant the commands judge against. */
export async function txNow(client: pg.PoolClient): Promise<Date> {
  const r = await client.query<{ now: Date }>('SELECT now() AS now');
  return r.rows[0]!.now;
}

/**
 * Insert a `marketplace_partners` row for `pariwarId` AS THE SESSION USER (the superuser — RLS-exempt), with a randomised
 * English name so the `(pariwar_id, lower(display_name_en))` unique never collides across own-committing specs, and return
 * its id. Story 12.2 (QE3 (A)): every module now names a SAME-Pariwar partner (`marketplace_modules_partner_fk`). Safe to
 * call after `enterAppScope`: it steps out of `twt_app` for the INSERT and back in (`RESET ROLE` is always permitted).
 * On a pool client outside a transaction the row COMMITS — the caller deletes it in cleanup, AFTER its modules.
 */
export async function seedPartner(client: pg.PoolClient, pariwarId: string): Promise<string> {
  const who = await client.query<{ u: string }>('SELECT current_user AS u');
  const wasApp = who.rows[0]!.u === 'twt_app';
  if (wasApp) await client.query('RESET ROLE');
  const id = randomUUID();
  await client.query(
    `INSERT INTO marketplace_partners (partner_id, pariwar_id, display_name_en, display_name_hi, created_by_actor_id, audit_id)
     VALUES ($1, $2, $3, 'एचडीएफसी', $4, $5)`,
    [id, pariwarId, `HDFC ${randomUUID()}`, randomUUID(), randomUUID()],
  );
  if (wasApp) await client.query('SET LOCAL ROLE twt_app');
  return id;
}

/**
 * A valid snake_case manifest input; `valid_*` default to `[now − 1h, now + 1h)` (offerable now). `partner_id` is
 * REQUIRED (Story 12.2): it must name a partner of the module's OWN Pariwar (`seedPartner`) — a missing seed fails loudly.
 */
export function manifestInput(
  now: Date,
  overrides: { partner_id: string } & Record<string, unknown>,
): Record<string, unknown> {
  return {
    name_en: 'HDFC home loan',
    name_hi: 'एचडीएफसी गृह ऋण',
    description_en: 'A home-loan offer for members.',
    description_hi: 'सदस्यों के लिए गृह ऋण प्रस्ताव।',
    eligibility_filter: { version: 1, clauses: [{ kind: 'member_state_in', states: ['active', 'active-in-grace'] }] },
    scope_filter: { version: 1, scope: 'district', values: ['Patna', 'Gaya'] },
    valid_from: new Date(now.getTime() - HOUR_MS).toISOString(),
    valid_until: new Date(now.getTime() + HOUR_MS).toISOString(),
    slot_capacity: 5,
    lead_handoff_url: 'https://leads.partner.example/hdfc/twt-bihar',
    lead_handoff_signing_key_secret_name: 'marketplace-hdfc-signing-key',
    branding_bundle: { version: 1, logo_object_key: 'partners/hdfc/logo.png', accent_color_hex: '#004c8f' },
    ...overrides,
  };
}

interface RawRow {
  current_state: string;
  state_event_version: string;
  slots_remaining: number | null;
  archive_reason: string | null;
}

/** I4 — the row equals `foldModuleProjection(loadEvents(module_id))` on the four projected values. */
export async function expectRowMatchesStream(client: pg.PoolClient, id: string): Promise<void> {
  const row = await client.query<RawRow>(
    'SELECT current_state, state_event_version, slots_remaining, archive_reason FROM marketplace_modules WHERE module_id = $1',
    [id],
  );
  const events = await client.query<{ event_type: string; payload: unknown; event_version: string }>(
    'SELECT event_type, payload, event_version FROM events_log WHERE stream_id = $1 ORDER BY event_version',
    [id],
  );
  const fold = foldModuleProjection(
    events.rows.map((e) => toModuleEvent({ eventType: e.event_type, payload: e.payload, eventVersion: Number(e.event_version) })),
  );
  const r = row.rows[0]!;
  expect({
    state: r.current_state,
    version: Number(r.state_event_version),
    slotsRemaining: r.slots_remaining,
    archiveReason: r.archive_reason,
  }).toEqual(fold);
}

/** The stream's event types, in order. */
export async function streamTypes(client: pg.PoolClient, id: string): Promise<string[]> {
  const r = await client.query<{ event_type: string }>(
    'SELECT event_type FROM events_log WHERE stream_id = $1 ORDER BY event_version',
    [id],
  );
  return r.rows.map((x) => x.event_type);
}

/** The row's projected values (raw), or undefined. */
export async function rowOf(client: pg.PoolClient, id: string): Promise<Record<string, unknown> | undefined> {
  const r = await client.query('SELECT * FROM marketplace_modules WHERE module_id = $1', [id]);
  return r.rows[0] as Record<string, unknown> | undefined;
}

/**
 * Run `sql` inside a savepoint and assert it fails with `code` (and, for P0001, the direct-write prefix);
 * the savepoint is rolled back so the test's transaction stays usable.
 */
export async function expectSqlRejected(
  client: pg.PoolClient,
  text: string,
  params: unknown[],
  code: string,
  /** For a 23514: the name of the CHECK that must have fired (RP2 — a CHECK is tripped BY NAME, not by code alone). */
  constraint?: string,
): Promise<void> {
  await client.query('SAVEPOINT expect_rejected');
  let caught: { code?: string; message?: string; constraint?: string } | null = null;
  try {
    await client.query(text, params);
  } catch (e) {
    caught = e as { code?: string; message?: string; constraint?: string };
  }
  await client.query('ROLLBACK TO SAVEPOINT expect_rejected');
  await client.query('RELEASE SAVEPOINT expect_rejected');
  expect(caught, `expected ${code} from: ${text}`).not.toBeNull();
  expect(caught!.code).toBe(code);
  if (code === 'P0001') expect(caught!.message!.startsWith(MODULE_STATE_DIRECT_WRITE_MESSAGE_PREFIX)).toBe(true);
  if (constraint !== undefined) expect(caught!.constraint).toBe(constraint);
}

/** A raw `marketplace_modules` INSERT (every column) — the trigger / RLS specs drive it directly. */
export const RAW_INSERT_SQL = `INSERT INTO marketplace_modules (
    module_id, pariwar_id, partner_id, name_en, name_hi, description_en, description_hi,
    eligibility_filter, scope_filter, valid_from, valid_until, slot_capacity,
    lead_handoff_url, lead_handoff_signing_key_secret_name, branding_bundle, manifest_schema_version,
    current_state, state_event_version, slots_remaining, archive_reason, audit_id
  ) VALUES (
    $1, $2, $3, 'n', 'n', 'd', 'd',
    '{"version":1,"clauses":[]}', '{"version":1,"scope":"members-all"}',
    now() - interval '1 hour', now() + interval '1 hour', $4,
    'https://leads.partner.example/x', 'k', '{"version":1,"logo_object_key":null,"accent_color_hex":null}', 1,
    $5, $6, $7, $8, $9
  )`;

/**
 * {@link RAW_INSERT_SQL} with ONE content value bent so exactly one CHECK can fire (RP2): an inverted window, or a
 * `manifest_schema_version`. The substitutions are asserted, so a change to the template fails loudly here.
 */
export function rawInsertSqlWith(o: { invertedWindow?: boolean; schemaVersion?: number }): string {
  let text = RAW_INSERT_SQL;
  const window = "now() - interval '1 hour', now() + interval '1 hour', $4,";
  const version = `'{"version":1,"logo_object_key":null,"accent_color_hex":null}', 1,`;
  if (o.invertedWindow) {
    expect(text).toContain(window);
    text = text.replace(window, "now() + interval '1 hour', now() - interval '1 hour', $4,");
  }
  if (o.schemaVersion !== undefined) {
    expect(text).toContain(version);
    text = text.replace(version, `'{"version":1,"logo_object_key":null,"accent_color_hex":null}', ${String(o.schemaVersion)},`);
  }
  return text;
}

/**
 * {@link RAW_INSERT_SQL} with `created_at` set EXPLICITLY to `$10` (a `timestamptz` text) — `authorModule` cannot set it
 * (`DEFAULT now()`), and the cursor spec needs two rows microseconds apart (Story 12.2 AC8). Guard it like any raw insert
 * (`SET LOCAL app.marketplace_module_state_writer = 'on'`); pass `[...rawInsertParams(…), createdAtText]`.
 */
export const RAW_INSERT_AT_SQL = (() => {
  const columns = 'current_state, state_event_version, slots_remaining, archive_reason, audit_id\n  ) VALUES (';
  const values = '$5, $6, $7, $8, $9\n  )';
  expect(RAW_INSERT_SQL).toContain(columns);
  expect(RAW_INSERT_SQL).toContain(values);
  return RAW_INSERT_SQL.replace(columns, 'current_state, state_event_version, slots_remaining, archive_reason, audit_id, created_at\n  ) VALUES (').replace(
    values,
    '$5, $6, $7, $8, $9, $10::timestamptz\n  )',
  );
})();

/**
 * Params for {@link RAW_INSERT_SQL}: the genesis shape by default. `partnerId` is REQUIRED (Story 12.2) — a partner of
 * `pariwarId` (`seedPartner`), or the INSERT fails 23503 on `marketplace_modules_partner_fk`.
 */
export function rawInsertParams(
  id: string,
  pariwarId: string,
  o: { partnerId: string } & Partial<{
    capacity: number | null;
    state: string;
    version: number;
    slots: number | null;
    reason: string | null;
  }>,
): unknown[] {
  const capacity = o.capacity === undefined ? 5 : o.capacity;
  return [
    id,
    pariwarId,
    o.partnerId,
    capacity,
    o.state ?? 'draft',
    o.version ?? 1,
    o.slots === undefined ? capacity : o.slots,
    o.reason ?? null,
    randomUUID(),
  ];
}
