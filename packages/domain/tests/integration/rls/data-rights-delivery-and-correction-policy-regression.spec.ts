// `data_export_delivery_grants` + `member_data_rights_corrections` RLS + constraint policy-regression
// — Story 10.21 (AC-R1 / AC-R2), authored in the ROUND-2 code review.
//
// ⚠ WHY THIS FILE DID NOT EXIST. Migration 0104 CREATED both tables with RLS + FORCE + tenant
// SELECT/ALL policies, three FKs, four CHECKs — including the ratified three-part gate — and a partial
// unique index, and NONE of it was asserted anywhere. The sibling spec authored in the same change set
// covered `data_exports`, which 0104 merely EXTENDS, while the two brand-new tables got nothing.
// ⛔ Worse, `apps/api/tests/integration/member-data-rights/delivery-and-correction.spec.ts` carried a
// header stating *"Migration 0104 enforces the three-part gate as a CHECK, and that is proven at the
// migration level in the policy-regression spec"* — naming a protection that did not exist. That is the
// same class of defect this story's own terminology mandate was written to prevent.
//
// ⭐ WHAT THIS ASSERTS THAT A ROUTE TEST CANNOT. A route test proves the handler does what the handler
// does. These run DIRECTLY against the migrations. If a later migration drops the three-part gate CHECK,
// widens the pending-uniqueness index, or loosens a policy, every route test still passes and THIS file
// is what fails.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppRoleNoScope, enterAppScope, seedMember } from '../_helpers.js';

type Q = { query: (q: string, v?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> };

/** A real helpdesk ticket — `member_data_rights_corrections.helpdesk_ticket_id` is NOT NULL + FK. */
async function seedTicket(client: Q, pariwarId: string): Promise<string> {
  await client.query('RESET ROLE');
  await client.query("SET LOCAL app.helpdesk_state_writer = 'on'");
  const { rows } = await client.query(
    `INSERT INTO helpdesk_tickets
       (pariwar_id, subject_member_id, subject_actor_id, category, body, current_state,
        state_event_version, routed_to_scope_dimension, routed_to_role, routing_policy_version,
        member_scope_context, assigned_at, sla_first_response_due, sla_resolution_due, audit_id,
        created_via)
     VALUES ($1::uuid, gen_random_uuid(), NULL, 'other', 'dpdpa', 'open', 1, 'pariwar',
             'helpline_operator', 1, '{}'::jsonb, now(), now(), now(), gen_random_uuid(), 'member_app')
     RETURNING ticket_id`,
    [pariwarId],
  );
  return rows[0]!['ticket_id'] as string;
}

async function seedExport(client: Q, pariwarId: string, memberId: string): Promise<string> {
  await client.query('RESET ROLE');
  const { rows } = await client.query(
    `INSERT INTO data_exports (member_id, pariwar_id, status, requested_at, requested_via)
     VALUES ($1, $2, 'ready', now(), 'off_portal_admin') RETURNING export_id`,
    [memberId, pariwarId],
  );
  return rows[0]!['export_id'] as string;
}

/** Insert a grant as SUPERUSER. `channel` drives which gate columns are populated. */
async function seedGrant(
  client: Q,
  opts: {
    pariwarId: string;
    memberId: string;
    exportId: string;
    channel: 'member_direct' | 'staff_mediated';
    status?: string;
  },
): Promise<string> {
  await client.query('RESET ROLE');
  const gate =
    opts.channel === 'staff_mediated'
      ? `now(), now(), 'ciphertext'`
      : `NULL, NULL, NULL`;
  const { rows } = await client.query(
    `INSERT INTO data_export_delivery_grants
       (export_id, member_id, pariwar_id, channel, status, expires_at,
        member_request_recorded_at, primary_delivery_not_completed_at, attestation_ciphertext)
     VALUES ($1, $2, $3, $4, $5, now() + interval '1 hour', ${gate})
     RETURNING grant_id`,
    [opts.exportId, opts.memberId, opts.pariwarId, opts.channel, opts.status ?? 'pending'],
  );
  return rows[0]!['grant_id'] as string;
}

const codeOf = (e: unknown): string | undefined =>
  (e as { code?: string }).code ?? (e as { cause?: { code?: string } }).cause?.code;
const constraintOf = (e: unknown): string | undefined =>
  (e as { constraint?: string }).constraint ?? (e as { cause?: { constraint?: string } }).cause?.constraint;

describe.skipIf(!hasDatabase)('data_export_delivery_grants RLS + constraint policy regression', () => {
  setupLiveDb();

  it('positive: SELECT under scope A returns only A grant rows', async () => {
    const { tx, client } = getTx();
    const aMember = await seedMember(tx, PARIWAR_A);
    const bMember = await seedMember(tx, PARIWAR_B);
    const aExport = await seedExport(client as never, PARIWAR_A, aMember as string);
    const bExport = await seedExport(client as never, PARIWAR_B, bMember as string);
    await seedGrant(client as never, {
      pariwarId: PARIWAR_A, memberId: aMember as string, exportId: aExport, channel: 'member_direct',
    });
    await seedGrant(client as never, {
      pariwarId: PARIWAR_B, memberId: bMember as string, exportId: bExport, channel: 'member_direct',
    });
    await enterAppScope(client, PARIWAR_A);

    const rows = await tx.select().from(schema.dataExportDeliveryGrants);
    // ⛔ Guard: an empty result would make `every()` pass vacuously.
    expect(rows).not.toHaveLength(0);
    expect(rows.every((r) => r.pariwarId === PARIWAR_A)).toBe(true);
    expect(rows.some((r) => r.pariwarId === PARIWAR_B)).toBe(false);
  });

  it('negative: scope B does NOT see A grant rows (symmetric)', async () => {
    const { tx, client } = getTx();
    const aMember = await seedMember(tx, PARIWAR_A);
    const bMember = await seedMember(tx, PARIWAR_B);
    const aExport = await seedExport(client as never, PARIWAR_A, aMember as string);
    const bExport = await seedExport(client as never, PARIWAR_B, bMember as string);
    await seedGrant(client as never, {
      pariwarId: PARIWAR_A, memberId: aMember as string, exportId: aExport, channel: 'member_direct',
    });
    await seedGrant(client as never, {
      pariwarId: PARIWAR_B, memberId: bMember as string, exportId: bExport, channel: 'member_direct',
    });
    await enterAppScope(client, PARIWAR_B);

    const rows = await tx.select().from(schema.dataExportDeliveryGrants);
    expect(rows).not.toHaveLength(0);
    expect(rows.every((r) => r.pariwarId === PARIWAR_B)).toBe(true);
  });

  it('⭐ an operator scoped to A cannot CREATE a grant for a member of B (42501)', async () => {
    // ⭐ THE ASSERTION A ROUTE TEST CANNOT WITNESS: the handler resolves the tenant from the session and
    // can never attempt this. The WITH CHECK write policy is what refuses it — proof the refusal comes
    // from the DATABASE, not from handler discipline. This grant path hands over a DECRYPTED Tier-1
    // dossier, so "the handler is careful" is not an acceptable sole control.
    const { tx, client } = getTx();
    const bMember = await seedMember(tx, PARIWAR_B);
    const bExport = await seedExport(client as never, PARIWAR_B, bMember as string);
    await enterAppScope(client, PARIWAR_A);

    const err = await (client as unknown as Q)
      .query(
        `INSERT INTO data_export_delivery_grants
           (export_id, member_id, pariwar_id, channel, status, expires_at)
         VALUES ($1, $2, $3, 'member_direct', 'pending', now() + interval '1 hour')`,
        [bExport, bMember, PARIWAR_B],
      )
      .catch((e: unknown) => e);
    expect(codeOf(err)).toBe('42501');
  });

  it('connection-level fail-closed: app role without scope returns empty', async () => {
    const { tx, client } = getTx();
    const aMember = await seedMember(tx, PARIWAR_A);
    const aExport = await seedExport(client as never, PARIWAR_A, aMember as string);
    await seedGrant(client as never, {
      pariwarId: PARIWAR_A, memberId: aMember as string, exportId: aExport, channel: 'member_direct',
    });
    await enterAppRoleNoScope(client);

    const rows = await tx.select().from(schema.dataExportDeliveryGrants);
    expect(rows).toHaveLength(0);
  });

  it('FORCE RLS: the table has rowsecurity AND forcerowsecurity', async () => {
    const { client } = getTx();
    await client.query('RESET ROLE');
    const { rows } = await client.query<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>(
      `SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = 'data_export_delivery_grants'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.relrowsecurity).toBe(true);
    // ⛔ Without FORCE the TABLE OWNER bypasses RLS entirely, and the owner is the role migrations run as.
    expect(rows[0]?.relforcerowsecurity).toBe(true);
  });

  it('⛔ THE RATIFIED THREE-PART GATE is a DB CHECK — a staff_mediated grant missing ANY element is refused', async () => {
    // ⭐ Decision `2026-08-14-113` clause 1: all three required, none substituting. This is the
    // migration-level proof that the ruling survives a caller-side bug. Each element is dropped in turn
    // so no single one can be quietly removed while the other two keep the test green.
    const { tx, client } = getTx();
    const aMember = await seedMember(tx, PARIWAR_A);
    const aExport = await seedExport(client as never, PARIWAR_A, aMember as string);
    await client.query('RESET ROLE');

    const elements = [
      ['member_request_recorded_at', `NULL, now(), 'ct'`],
      ['primary_delivery_not_completed_at', `now(), NULL, 'ct'`],
      ['attestation_ciphertext', `now(), now(), NULL`],
    ] as const;

    for (const [missing, values] of elements) {
      // ⛔ Each attempt gets its own SAVEPOINT: a failed CHECK aborts the tx, and without this the
      // second iteration would die on 25P02 rather than on the constraint it is testing.
      await client.query('SAVEPOINT gate_probe');
      const err = await (client as unknown as Q)
        .query(
          `INSERT INTO data_export_delivery_grants
             (export_id, member_id, pariwar_id, channel, status, expires_at,
              member_request_recorded_at, primary_delivery_not_completed_at, attestation_ciphertext)
           VALUES ($1, $2, $3, 'staff_mediated', 'pending', now() + interval '1 hour', ${values})`,
          [aExport, aMember, PARIWAR_A],
        )
        .catch((e: unknown) => e);
      expect(codeOf(err), `omitting ${missing} must be refused by the DB`).toBe('23514');
      expect(constraintOf(err)).toBe('data_export_delivery_grants_three_part_gate_check');
      await client.query('ROLLBACK TO SAVEPOINT gate_probe');
    }
  });

  it('⛔ the CONVERSE — a member_direct grant carrying any gate element is refused', async () => {
    // Recording the exception's evidence on the ordinary route would misrepresent every audit query
    // that filters on those columns.
    const { tx, client } = getTx();
    const aMember = await seedMember(tx, PARIWAR_A);
    const aExport = await seedExport(client as never, PARIWAR_A, aMember as string);
    await client.query('RESET ROLE');

    const err = await (client as unknown as Q)
      .query(
        `INSERT INTO data_export_delivery_grants
           (export_id, member_id, pariwar_id, channel, status, expires_at, member_request_recorded_at)
         VALUES ($1, $2, $3, 'member_direct', 'pending', now() + interval '1 hour', now())`,
        [aExport, aMember, PARIWAR_A],
      )
      .catch((e: unknown) => e);
    expect(codeOf(err)).toBe('23514');
    expect(constraintOf(err)).toBe('data_export_delivery_grants_member_direct_clean_check');
  });

  it('the channel CHECK refuses an unknown channel', async () => {
    const { tx, client } = getTx();
    const aMember = await seedMember(tx, PARIWAR_A);
    const aExport = await seedExport(client as never, PARIWAR_A, aMember as string);
    await client.query('RESET ROLE');

    const err = await (client as unknown as Q)
      .query(
        `INSERT INTO data_export_delivery_grants
           (export_id, member_id, pariwar_id, channel, status, expires_at)
         VALUES ($1, $2, $3, 'carrier_pigeon', 'pending', now() + interval '1 hour')`,
        [aExport, aMember, PARIWAR_A],
      )
      .catch((e: unknown) => e);
    expect(codeOf(err)).toBe('23514');
    expect(constraintOf(err)).toBe('data_export_delivery_grants_channel_check');
  });

  it('⭐ MIGRATION 0105 — the status CHECK refuses a mis-spelled status', async () => {
    // ⛔ WHY THIS MATTERS MORE THAN AN ORDINARY ENUM CHECK: the pending-uniqueness index below is
    // PREDICATED on `status = 'pending'`. A row stored as 'Pending' silently falls OUTSIDE the index
    // predicate, and two live grants coexist on one export — the invariant defeated by a typo rather
    // than by a bug, with no error anywhere. 0104 gave `channel` and `outcome` CHECKs and omitted this.
    const { tx, client } = getTx();
    const aMember = await seedMember(tx, PARIWAR_A);
    const aExport = await seedExport(client as never, PARIWAR_A, aMember as string);
    await client.query('RESET ROLE');

    const err = await (client as unknown as Q)
      .query(
        `INSERT INTO data_export_delivery_grants
           (export_id, member_id, pariwar_id, channel, status, expires_at)
         VALUES ($1, $2, $3, 'member_direct', 'Pending', now() + interval '1 hour')`,
        [aExport, aMember, PARIWAR_A],
      )
      .catch((e: unknown) => e);
    expect(codeOf(err)).toBe('23514');
    expect(constraintOf(err)).toBe('data_export_delivery_grants_status_check');
  });

  it('⭐ MIGRATION 0105 — a pending staff_mediated grant does NOT block the member’s own route', async () => {
    // ⛔ THE REGRESSION 0105 EXISTS FOR. 0104 predicated `one_pending_per_export` on `status` ALONE, so
    // an unconsumable `staff_mediated` row — redemption is restricted to `member_direct`, and nothing
    // anywhere consumes a staff-mediated grant — parked in the slot for its whole TTL and made the
    // export unreachable by EVERY party. The invariant worth protecting is one live REDEEMABLE grant.
    const { tx, client } = getTx();
    const aMember = await seedMember(tx, PARIWAR_A);
    const aExport = await seedExport(client as never, PARIWAR_A, aMember as string);

    await seedGrant(client as never, {
      pariwarId: PARIWAR_A, memberId: aMember as string, exportId: aExport, channel: 'staff_mediated',
    });
    // The member-direct grant must still be insertable on the SAME export.
    const memberDirectId = await seedGrant(client as never, {
      pariwarId: PARIWAR_A, memberId: aMember as string, exportId: aExport, channel: 'member_direct',
    });
    expect(memberDirectId).toBeTruthy();
  });

  it('⭐ the pending-uniqueness index still refuses a SECOND pending member_direct grant (23505)', async () => {
    // ⛔ Ends in a 23505, which aborts the tx — so this is its own `it()`, per the AC15 lesson.
    const { tx, client } = getTx();
    const aMember = await seedMember(tx, PARIWAR_A);
    const aExport = await seedExport(client as never, PARIWAR_A, aMember as string);
    await seedGrant(client as never, {
      pariwarId: PARIWAR_A, memberId: aMember as string, exportId: aExport, channel: 'member_direct',
    });

    await client.query('RESET ROLE');
    const err = await (client as unknown as Q)
      .query(
        `INSERT INTO data_export_delivery_grants
           (export_id, member_id, pariwar_id, channel, status, expires_at)
         VALUES ($1, $2, $3, 'member_direct', 'pending', now() + interval '1 hour')`,
        [aExport, aMember, PARIWAR_A],
      )
      .catch((e: unknown) => e);
    expect(codeOf(err)).toBe('23505');
    expect(constraintOf(err)).toBe('data_export_delivery_grants_one_pending_per_export');
  });
});

describe.skipIf(!hasDatabase)('member_data_rights_corrections RLS + constraint policy regression', () => {
  setupLiveDb();

  async function seedCorrection(client: Q, pariwarId: string, memberId: string): Promise<string> {
    const ticketId = await seedTicket(client, pariwarId);
    await client.query('RESET ROLE');
    const { rows } = await client.query(
      `INSERT INTO member_data_rights_corrections
         (member_id, pariwar_id, helpdesk_ticket_id, requested_change_ciphertext,
          action_taken_ciphertext, outcome, recorded_by_actor_id, recorded_by_display)
       VALUES ($1, $2, $3, 'ct-requested', 'ct-action', 'recorded', gen_random_uuid(), 'Test Operator')
       RETURNING correction_id`,
      [memberId, pariwarId, ticketId],
    );
    return rows[0]!['correction_id'] as string;
  }

  it('positive: SELECT under scope A returns only A correction rows', async () => {
    const { tx, client } = getTx();
    const aMember = await seedMember(tx, PARIWAR_A);
    const bMember = await seedMember(tx, PARIWAR_B);
    await seedCorrection(client as never, PARIWAR_A, aMember as string);
    await seedCorrection(client as never, PARIWAR_B, bMember as string);
    await enterAppScope(client, PARIWAR_A);

    const rows = await tx.select().from(schema.memberDataRightsCorrections);
    expect(rows).not.toHaveLength(0);
    expect(rows.every((r) => r.pariwarId === PARIWAR_A)).toBe(true);
    expect(rows.some((r) => r.pariwarId === PARIWAR_B)).toBe(false);
  });

  it('negative: scope B does NOT see A correction rows (symmetric)', async () => {
    const { tx, client } = getTx();
    const aMember = await seedMember(tx, PARIWAR_A);
    const bMember = await seedMember(tx, PARIWAR_B);
    await seedCorrection(client as never, PARIWAR_A, aMember as string);
    await seedCorrection(client as never, PARIWAR_B, bMember as string);
    await enterAppScope(client, PARIWAR_B);

    const rows = await tx.select().from(schema.memberDataRightsCorrections);
    expect(rows).not.toHaveLength(0);
    expect(rows.every((r) => r.pariwarId === PARIWAR_B)).toBe(true);
  });

  it('connection-level fail-closed: app role without scope returns empty', async () => {
    const { tx, client } = getTx();
    const aMember = await seedMember(tx, PARIWAR_A);
    await seedCorrection(client as never, PARIWAR_A, aMember as string);
    await enterAppRoleNoScope(client);

    const rows = await tx.select().from(schema.memberDataRightsCorrections);
    expect(rows).toHaveLength(0);
  });

  it('FORCE RLS: the table has rowsecurity AND forcerowsecurity', async () => {
    const { client } = getTx();
    await client.query('RESET ROLE');
    const { rows } = await client.query<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>(
      `SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = 'member_data_rights_corrections'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.relrowsecurity).toBe(true);
    expect(rows[0]?.relforcerowsecurity).toBe(true);
  });

  it('the outcome CHECK refuses an unknown outcome', async () => {
    const { tx, client } = getTx();
    const aMember = await seedMember(tx, PARIWAR_A);
    const ticketId = await seedTicket(client as never, PARIWAR_A);
    await client.query('RESET ROLE');

    const err = await (client as unknown as Q)
      .query(
        `INSERT INTO member_data_rights_corrections
           (member_id, pariwar_id, helpdesk_ticket_id, requested_change_ciphertext,
            action_taken_ciphertext, outcome, recorded_by_actor_id, recorded_by_display)
         VALUES ($1, $2, $3, 'ct', 'ct', 'maybe', gen_random_uuid(), 'Test Operator')`,
        [aMember, PARIWAR_A, ticketId],
      )
      .catch((e: unknown) => e);
    expect(codeOf(err)).toBe('23514');
    expect(constraintOf(err)).toBe('member_data_rights_corrections_outcome_check');
  });

  it('⛔ the helpdesk_ticket_id FK is REQUIRED — an unknown ticket is refused (23503)', async () => {
    // ⭐ `2026-08-14-109` cl.2 put this process ON the helpdesk substrate, so the linkage is not
    // optional provenance here (unlike elsewhere in this story) — a correction with no real ticket is
    // a record with no request behind it.
    const { tx, client } = getTx();
    const aMember = await seedMember(tx, PARIWAR_A);
    await client.query('RESET ROLE');

    const err = await (client as unknown as Q)
      .query(
        `INSERT INTO member_data_rights_corrections
           (member_id, pariwar_id, helpdesk_ticket_id, requested_change_ciphertext,
            action_taken_ciphertext, outcome, recorded_by_actor_id, recorded_by_display)
         VALUES ($1, $2, $3, 'ct', 'ct', 'recorded', gen_random_uuid(), 'Test Operator')`,
        [aMember, PARIWAR_A, randomUUID()],
      )
      .catch((e: unknown) => e);
    expect(codeOf(err)).toBe('23503');
    expect(constraintOf(err)).toBe('member_data_rights_corrections_ticket_id_fk');
  });
});
