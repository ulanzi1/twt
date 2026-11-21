// Story 12.5 (Task 1 / 9.1; AC1; QE4, QE10; I10) — migration 0215's `marketplace_lead_handoffs`, live. Per-test ROLLBACK (setupLiveDb).
// The DB ↔ TS lockstep (the status set, the detail grammar, the reference grammar — EXACT), the grants (column-narrowed INSERT and
// UPDATE, ⛔ DELETE), FORCE RLS + the three per-command policies and isolation from `PARIWAR_B`, the named CHECKs, and EVERY guard
// refusal by the guard's OWN message. The W rows' passing legs are in lead-handoff-commands.spec.ts (the real writers) and
// lead-handoff-erasure.spec.ts (W11).

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  LEAD_HANDOFF_DETAIL_PATTERN,
  LEAD_HANDOFF_PARTNER_REFERENCE_PATTERN,
  LEAD_HANDOFF_STATUSES,
} from '../../../src/schema/marketplace_lead_handoffs.js';
import { isLeadHandoffDetail } from '../../../src/marketplace/lead-handoff.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope } from '../_helpers.js';
import { expectRefused, handoffRow, insertHandoffRaw, seedHandoffWorld } from './_lead-handoff-fixtures.js';

const TABLE = 'marketplace_lead_handoffs';
const INTEGRITY = '23000';

describe.skipIf(!hasDatabase)('Story 12.5 — marketplace_lead_handoffs (0215)', () => {
  setupLiveDb();

  describe('lockstep (the DB ↔ TS copies, EXACT)', () => {
    it('the status CHECK holds exactly LEAD_HANDOFF_STATUSES', async () => {
      const { client } = getTx();
      const { rows } = await client.query<{ def: string }>(
        `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = 'marketplace_lead_handoffs_status_check'`,
      );
      const listed = [...rows[0]!.def.matchAll(/'([a-z_]+)'::text/g)].map((m) => m[1]);
      expect([...listed].sort()).toEqual([...LEAD_HANDOFF_STATUSES].sort());
    });

    it('the detail CHECK carries LEAD_HANDOFF_DETAIL_PATTERN byte for byte, and the reference CHECK its pattern', async () => {
      const { client } = getTx();
      const { rows } = await client.query<{ conname: string; def: string }>(
        `SELECT conname, pg_get_constraintdef(oid) AS def FROM pg_constraint
          WHERE conname IN ('marketplace_lead_handoffs_outcome_detail_check', 'marketplace_lead_handoffs_partner_reference_check')`,
      );
      const def = (n: string): string => rows.find((r) => r.conname === n)!.def;
      expect(def('marketplace_lead_handoffs_outcome_detail_check')).toContain(`'${LEAD_HANDOFF_DETAIL_PATTERN}'`);
      expect(def('marketplace_lead_handoffs_partner_reference_check')).toContain(`'${LEAD_HANDOFF_PARTNER_REFERENCE_PATTERN}'`);
    });

    it.each([
      'delivered:http_2xx:200',
      'released:http_5xx:503',
      'released:timeout',
      'released:address_refused',
      'held:signing_key_unavailable',
      'held:dns_unavailable',
      'lapsed:lease_expired',
      'requeued:manual',
      'failed_delivery:http_4xx:409',
      'failed_delivery:http_3xx:302',
      'failed_delivery:hold_expired:kms',
      'failed_delivery:outcome_unknown',
      'cancelled:death_reported',
      'cancelled:module_withdrawn',
    ])('the grammar admits %s (JS and PG agree)', async (detail) => {
      const { client } = getTx();
      expect(isLeadHandoffDetail(detail)).toBe(true);
      const { rows } = await client.query<{ ok: boolean }>(`SELECT $1 ~ $2 AS ok`, [detail, LEAD_HANDOFF_DETAIL_PATTERN]);
      expect(rows[0]!.ok).toBe(true);
    });

    it.each([
      'delivered:http_2xx:500',
      'released:http_5xx:404',
      'released:boom',
      'held:kms',
      'failed_delivery:http_4xx:4091',
      'failed_delivery:address_refused',
      'cancelled:member_suspended',
      'released:timeout x',
      'held:dns_unavailable:leads.partner.example',
    ])('the grammar refuses %s (JS and PG agree)', async (detail) => {
      const { client } = getTx();
      expect(isLeadHandoffDetail(detail)).toBe(false);
      const { rows } = await client.query<{ ok: boolean }>(`SELECT $1 ~ $2 AS ok`, [detail, LEAD_HANDOFF_DETAIL_PATTERN]);
      expect(rows[0]!.ok).toBe(false);
    });
  });

  describe('grants, FORCE RLS, policies', () => {
    it('twt_app: SELECT; INSERT on exactly the eight W1 columns; UPDATE on exactly the W11 + W13 columns; ⛔ DELETE', async () => {
      const { client } = getTx();
      const table = await client.query<{ privilege_type: string }>(
        `SELECT privilege_type FROM information_schema.role_table_grants WHERE grantee = 'twt_app' AND table_name = $1`,
        [TABLE],
      );
      expect(table.rows.map((r) => r.privilege_type).sort()).toEqual(['SELECT']);
      const cols = await client.query<{ privilege_type: string; column_name: string }>(
        `SELECT privilege_type, column_name FROM information_schema.column_privileges
          WHERE grantee = 'twt_app' AND table_name = $1 AND privilege_type IN ('INSERT', 'UPDATE')`,
        [TABLE],
      );
      const of = (p: string): string[] => cols.rows.filter((r) => r.privilege_type === p).map((r) => r.column_name).sort();
      expect(of('INSERT')).toEqual(
        ['audit_id', 'consent_id', 'envelope_version', 'lead_id', 'member_fields_ciphertext', 'member_id', 'module_id', 'pariwar_id'].sort(),
      );
      expect(of('UPDATE')).toEqual(
        ['attempt_count', 'held_since', 'member_fields_ciphertext', 'next_attempt_at', 'outcome_detail', 'status', 'updated_at'].sort(),
      );
    });

    it('FORCE RLS is on, with exactly the select / insert / update policies (⛔ FOR ALL, ⛔ DELETE)', async () => {
      const { client } = getTx();
      const rel = await client.query<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>(
        `SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = $1`,
        [TABLE],
      );
      expect(rel.rows[0]).toEqual({ relrowsecurity: true, relforcerowsecurity: true });
      const pol = await client.query<{ polname: string; polcmd: string }>(
        `SELECT polname, polcmd FROM pg_policy WHERE polrelid = $1::regclass ORDER BY polname`,
        [TABLE],
      );
      expect(pol.rows).toEqual([
        { polname: 'marketplace_lead_handoffs_tenant_isolation_insert', polcmd: 'a' },
        { polname: 'marketplace_lead_handoffs_tenant_isolation_select', polcmd: 'r' },
        { polname: 'marketplace_lead_handoffs_tenant_isolation_update', polcmd: 'w' },
      ]);
    });

    it('a Pariwar reads and updates only its OWN rows — the other Pariwar\'s row stays put (TR11)', async () => {
      const { client } = getTx();
      const a = await seedHandoffWorld(client, PARIWAR_A);
      const b = await seedHandoffWorld(client, PARIWAR_B);
      await insertHandoffRaw(client, a);
      await insertHandoffRaw(client, b);
      await enterAppScope(client, PARIWAR_A);
      const seen = await client.query<{ lead_id: string }>(`SELECT lead_id FROM ${TABLE} WHERE lead_id = ANY($1::uuid[])`, [[a.leadId, b.leadId]]);
      expect(seen.rows.map((r) => r.lead_id)).toEqual([a.leadId]);
      const moved = await client.query(`UPDATE ${TABLE} SET updated_at = now() WHERE lead_id = $1`, [b.leadId]);
      expect(moved.rowCount).toBe(0);
      await client.query('RESET ROLE');
      expect((await handoffRow(client, b.leadId))['status']).toBe('due');
    });

    it('a twt_app INSERT into another Pariwar is refused by WITH CHECK (42501), and ⛔ DELETE (42501)', async () => {
      const { client } = getTx();
      const b = await seedHandoffWorld(client, PARIWAR_B);
      const a = await seedHandoffWorld(client, PARIWAR_A);
      await insertHandoffRaw(client, a);
      await enterAppScope(client, PARIWAR_A);
      await expectRefused(
        client,
        `INSERT INTO ${TABLE} (lead_id, pariwar_id, module_id, member_id, consent_id, envelope_version, member_fields_ciphertext, audit_id)
         VALUES ($1, $2, $3, $4, $5, 1, 'x', $6)`,
        [b.leadId, b.pariwarId, b.moduleId, b.memberId, b.consentId, randomUUID()],
        '42501',
      );
      await expectRefused(client, `DELETE FROM ${TABLE} WHERE lead_id = $1`, [a.leadId], '42501');
    });

    it('twt_app cannot touch the claim columns or the reference (42501)', async () => {
      const { client } = getTx();
      const a = await seedHandoffWorld(client, PARIWAR_A);
      await insertHandoffRaw(client, a);
      await enterAppScope(client, PARIWAR_A);
      await expectRefused(client, `UPDATE ${TABLE} SET claim_token = 'x' WHERE lead_id = $1`, [a.leadId], '42501');
      await expectRefused(client, `UPDATE ${TABLE} SET partner_reference = 'x' WHERE lead_id = $1`, [a.leadId], '42501');
    });

    it('the composite module FK refuses a row naming ANOTHER Pariwar\'s module (23503)', async () => {
      const { client } = getTx();
      const a = await seedHandoffWorld(client, PARIWAR_A);
      const b = await seedHandoffWorld(client, PARIWAR_B);
      await client.query('SAVEPOINT fk');
      let code: string | undefined;
      try {
        await insertHandoffRaw(client, { ...a, moduleId: b.moduleId });
      } catch (e) {
        code = (e as { code?: string }).code;
      }
      await client.query('ROLLBACK TO SAVEPOINT fk');
      expect(code).toBe('23503');
    });
  });

  describe('the named CHECKs', () => {
    it.each([
      ['a final status without its own prefix', { status: 'delivered', outcomeDetail: 'released:timeout' }, 'marketplace_lead_handoffs_status_detail_check'],
      ['a final status with no detail', { status: 'cancelled', outcomeDetail: null }, 'marketplace_lead_handoffs_status_detail_check'],
      ['a final prefix on a due row', { status: 'due', outcomeDetail: 'cancelled:consent_revoked' }, 'marketplace_lead_handoffs_status_detail_check'],
      ['a detail outside the grammar', { status: 'due', outcomeDetail: 'released:boom' }, 'marketplace_lead_handoffs_outcome_detail_check'],
      ['an attempting row with no claim token', { status: 'attempting', claimToken: null as unknown as string }, 'marketplace_lead_handoffs_attempting_claim_check'],
      ['a negative attempt count', { attemptCount: -1 }, 'marketplace_lead_handoffs_attempt_count_check'],
      ['a cancelled row that still holds the fields', { status: 'cancelled', outcomeDetail: 'cancelled:consent_revoked', ciphertext: 'still-here' }, 'marketplace_lead_handoffs_cancelled_fields_check'],
    ])('refuses %s', async (_label, o, constraint) => {
      const { client } = getTx();
      const a = await seedHandoffWorld(client, PARIWAR_A);
      await client.query('SAVEPOINT chk');
      let caught: { code?: string; constraint?: string } | null = null;
      try {
        if ('claimToken' in o && o.claimToken === null) {
          await client.query(
            `INSERT INTO ${TABLE} (lead_id, pariwar_id, module_id, member_id, consent_id, envelope_version, member_fields_ciphertext, status,
               claimed_at, audit_id) VALUES ($1, $2, $3, $4, $5, 1, 'x', 'attempting', now(), $6)`,
            [a.leadId, a.pariwarId, a.moduleId, a.memberId, a.consentId, randomUUID()],
          );
        } else {
          await insertHandoffRaw(client, a, o as Parameters<typeof insertHandoffRaw>[2]);
        }
      } catch (e) {
        caught = e as { code?: string; constraint?: string };
      }
      await client.query('ROLLBACK TO SAVEPOINT chk');
      expect(caught?.code).toBe('23514');
      expect(caught?.constraint).toBe(constraint);
    });

    it.each(['has space', 'x'.repeat(65), '<script>', ''])('refuses a partner reference outside the advisory grammar: %j', async (ref) => {
      const { client } = getTx();
      const a = await seedHandoffWorld(client, PARIWAR_A);
      await client.query('SAVEPOINT ref');
      let caught: { code?: string; constraint?: string } | null = null;
      try {
        await insertHandoffRaw(client, a, { status: 'delivered', outcomeDetail: 'delivered:http_2xx:200', partnerReference: ref });
      } catch (e) {
        caught = e as { code?: string; constraint?: string };
      }
      await client.query('ROLLBACK TO SAVEPOINT ref');
      expect(caught?.code).toBe('23514');
      expect(caught?.constraint).toBe('marketplace_lead_handoffs_partner_reference_check');
    });
  });

  describe('the guard (AC1) — each refusal by its own message', () => {
    it('refuses a DELETE', async () => {
      const { client } = getTx();
      const a = await seedHandoffWorld(client, PARIWAR_A);
      await insertHandoffRaw(client, a);
      await expectRefused(client, `DELETE FROM ${TABLE} WHERE lead_id = $1`, [a.leadId], INTEGRITY, { message: 'a handoff row is never deleted' });
    });

    it.each(['module_id', 'member_id', 'consent_id', 'audit_id', 'pariwar_id', 'lead_id'])('refuses a change to %s', async (column) => {
      const { client } = getTx();
      const a = await seedHandoffWorld(client, PARIWAR_A);
      await insertHandoffRaw(client, a);
      await expectRefused(client, `UPDATE ${TABLE} SET ${column} = $2 WHERE lead_id = $1`, [a.leadId, randomUUID()], INTEGRITY, {
        message: 'an identity column is never changed',
      });
    });

    it('refuses a change to created_at and envelope_version', async () => {
      const { client } = getTx();
      const a = await seedHandoffWorld(client, PARIWAR_A);
      await insertHandoffRaw(client, a);
      await expectRefused(client, `UPDATE ${TABLE} SET created_at = now() - interval '1 day' WHERE lead_id = $1`, [a.leadId], INTEGRITY, {
        message: 'an identity column is never changed',
      });
      await expectRefused(client, `UPDATE ${TABLE} SET envelope_version = 2 WHERE lead_id = $1`, [a.leadId], INTEGRITY, {
        message: 'an identity column is never changed',
      });
    });

    it('refuses the fields changing to ANOTHER value, and coming BACK after NULL', async () => {
      const { client } = getTx();
      const a = await seedHandoffWorld(client, PARIWAR_A);
      await insertHandoffRaw(client, a, { status: 'attempting' });
      await expectRefused(client, `UPDATE ${TABLE} SET member_fields_ciphertext = 'enc:v1:other' WHERE lead_id = $1`, [a.leadId], INTEGRITY, {
        message: 'the member fields only ever go from present to absent',
      });
      const b = await seedHandoffWorld(client, PARIWAR_A);
      await insertHandoffRaw(client, b, { status: 'cancelled', outcomeDetail: 'cancelled:consent_revoked', ciphertext: null });
      await expectRefused(client, `UPDATE ${TABLE} SET member_fields_ciphertext = 'enc:v1:back' WHERE lead_id = $1`, [b.leadId], INTEGRITY, {
        message: 'the member fields only ever go from present to absent',
      });
    });

    it.each([
      ['due → due', { status: 'due' }, `SET status = 'due', outcome_detail = 'released:timeout'`, 'a due row moves only to attempting or cancelled'],
      ['due → failed_delivery', { status: 'due' }, `SET status = 'failed_delivery', outcome_detail = 'failed_delivery:retries_exhausted'`, 'a due row moves only to attempting or cancelled'],
      ['due → delivered', { status: 'due' }, `SET status = 'delivered', outcome_detail = 'delivered:http_2xx:200', delivered_at = now()`, 'a due row moves only to attempting or cancelled'],
      ['attempting → attempting (a re-claim)', { status: 'attempting' }, `SET claim_token = 'another', attempt_count = attempt_count + 1`, 'an attempting row is never re-claimed'],
      ['attempting → attempting (nothing but updated_at)', { status: 'attempting' }, `SET updated_at = now() + interval '1 second'`, 'an attempting row is never re-claimed'],
    ])('refuses %s', async (_label, seed, set, message) => {
      const { client } = getTx();
      const a = await seedHandoffWorld(client, PARIWAR_A);
      await insertHandoffRaw(client, a, seed);
      await expectRefused(client, `UPDATE ${TABLE} ${set} WHERE lead_id = $1`, [a.leadId], INTEGRITY, { message });
    });

    it.each([
      ['a delivered row\'s detail', { status: 'delivered', outcomeDetail: 'delivered:http_2xx:200' }, `SET outcome_detail = 'delivered:http_2xx:201'`],
      ['a delivered row back to due', { status: 'delivered', outcomeDetail: 'delivered:http_2xx:200' }, `SET status = 'due', outcome_detail = NULL, delivered_at = NULL`],
      ['a cancelled row back to due', { status: 'cancelled', outcomeDetail: 'cancelled:account_frozen', ciphertext: null }, `SET status = 'due', outcome_detail = 'requeued:manual'`],
      ['a failed row to attempting', { status: 'failed_delivery', outcomeDetail: 'failed_delivery:http_4xx:400' }, `SET status = 'attempting', claim_token = 'x', claimed_at = now()`],
      ['a final row\'s updated_at alone', { status: 'failed_delivery', outcomeDetail: 'failed_delivery:http_4xx:400' }, `SET updated_at = now() + interval '1 second'`],
    ])('refuses a change to a final row other than I10 admits: %s', async (_label, seed, set) => {
      const { client } = getTx();
      const a = await seedHandoffWorld(client, PARIWAR_A);
      await insertHandoffRaw(client, a, seed as Parameters<typeof insertHandoffRaw>[2]);
      await expectRefused(client, `UPDATE ${TABLE} ${set} WHERE lead_id = $1`, [a.leadId], INTEGRITY, {
        message: 'changes only by its member fields going absent, or a failed one by a requeue',
      });
    });

    it('refuses a requeue of a failed row whose fields are gone', async () => {
      const { client } = getTx();
      const a = await seedHandoffWorld(client, PARIWAR_A);
      await insertHandoffRaw(client, a, { status: 'failed_delivery', outcomeDetail: 'failed_delivery:http_4xx:400', ciphertext: null });
      await expectRefused(client, `UPDATE ${TABLE} SET status = 'due', outcome_detail = 'requeued:manual', attempt_count = 0 WHERE lead_id = $1`, [a.leadId], INTEGRITY, {
        message: 'a requeue needs the member fields',
      });
    });

    it('a cancel that does NOT drop the fields is refused by the CHECK — from due and from attempting (`-484` Q4 A; code review patch 2)', async () => {
      const { client } = getTx();
      const due = await seedHandoffWorld(client, PARIWAR_A);
      await insertHandoffRaw(client, due);
      const flying = await seedHandoffWorld(client, PARIWAR_A);
      await insertHandoffRaw(client, flying, { status: 'attempting' });
      for (const id of [due.leadId, flying.leadId]) {
        await expectRefused(
          client,
          `UPDATE ${TABLE} SET status = 'cancelled', outcome_detail = 'cancelled:consent_revoked', claim_token = NULL, claimed_at = NULL WHERE lead_id = $1`,
          [id],
          '23514',
          { constraint: 'marketplace_lead_handoffs_cancelled_fields_check' },
        );
      }
      // Control: the same statement WITH the fields dropped passes the guard and the CHECK.
      await client.query(
        `UPDATE ${TABLE} SET status = 'cancelled', outcome_detail = 'cancelled:consent_revoked', member_fields_ciphertext = NULL WHERE lead_id = $1`,
        [due.leadId],
      );
      expect(await handoffRow(client, due.leadId)).toMatchObject({ status: 'cancelled', member_fields_ciphertext: null });
    });

    it('ADMITS on a final row the fields going NULL ALONE — updated_at left as the time it became final (patch 10)', async () => {
      const { client } = getTx();
      const a = await seedHandoffWorld(client, PARIWAR_A);
      await insertHandoffRaw(client, a, { status: 'failed_delivery', outcomeDetail: 'failed_delivery:http_4xx:400', updatedAtSql: "now() - interval '31 days'" });
      const before = (await handoffRow(client, a.leadId))['updated_at'] as Date;
      await client.query(`UPDATE ${TABLE} SET member_fields_ciphertext = NULL WHERE lead_id = $1`, [a.leadId]);
      const row = await handoffRow(client, a.leadId);
      expect(row['member_fields_ciphertext']).toBeNull();
      expect((row['updated_at'] as Date).getTime()).toBe(before.getTime());
    });

    it('ADMITS on a final row exactly: the fields going NULL with updated_at (W11 / W12)', async () => {
      const { client } = getTx();
      const a = await seedHandoffWorld(client, PARIWAR_A);
      await insertHandoffRaw(client, a, { status: 'delivered', outcomeDetail: 'delivered:http_2xx:200' });
      await client.query(`UPDATE ${TABLE} SET member_fields_ciphertext = NULL, updated_at = now() + interval '1 second' WHERE lead_id = $1`, [a.leadId]);
      const row = await handoffRow(client, a.leadId);
      expect(row['member_fields_ciphertext']).toBeNull();
      expect(row['status']).toBe('delivered');
    });
  });
});
