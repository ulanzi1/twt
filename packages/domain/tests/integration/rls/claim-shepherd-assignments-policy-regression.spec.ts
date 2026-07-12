// claim_shepherd_assignments migration/RLS policy-regression — Story 6.12 (Review Finding). Mirrors
// claims-policy-regression: positive/negative RLS assertions, the connection-level fail-closed probe, the
// FORCE-RLS catalog regression guard, PLUS the migration-0060-specific integrity this story's own review
// found untested at the DB layer — both FKs, the partial-unique one-live-per-claim invariant, the
// tenant-scoped indexes, and (migration 0061) the E.164 CHECK constraints on the contact-snapshot columns.
// Live DB only.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppRoleNoScope, enterAppScope, seedClaim } from '../_helpers.js';

describe.skipIf(!hasDatabase)('claim_shepherd_assignments migration + RLS policy regression', () => {
  setupLiveDb();

  async function seedAssignment(
    tx: ReturnType<typeof getTx>['tx'],
    claimCaseId: string,
    pariwarId: string,
    overrides: Partial<{ shepherdActorId: string; supersededAt: Date | null }> = {},
  ): Promise<void> {
    await tx.insert(schema.claimShepherdAssignments).values({
      claimCaseId: claimCaseId as never,
      pariwarId: pariwarId as never,
      shepherdActorId: overrides.shepherdActorId ?? randomUUID(),
      shepherdDisplay: 'Test Shepherd',
      shepherdContactPhone: '+919000000001',
      assignmentReason: 'initial',
      ...(overrides.supersededAt !== undefined ? { supersededAt: overrides.supersededAt } : {}),
    });
  }

  it('positive: SELECT under scope A returns only A assignment rows', async () => {
    const { tx, client } = getTx();
    const claimA = await seedClaim(tx, PARIWAR_A);
    const claimB = await seedClaim(tx, PARIWAR_B);
    await seedAssignment(tx, claimA, PARIWAR_A);
    await seedAssignment(tx, claimB, PARIWAR_B);
    await enterAppScope(client, PARIWAR_A);

    const rows = await tx.select().from(schema.claimShepherdAssignments);
    expect(rows).not.toHaveLength(0);
    expect(rows.every((r) => r.pariwarId === PARIWAR_A)).toBe(true);
    expect(rows.some((r) => r.pariwarId === PARIWAR_B)).toBe(false);
  });

  it('negative: scope B does NOT see A assignment rows (symmetric: B sees its own)', async () => {
    const { tx, client } = getTx();
    const claimA = await seedClaim(tx, PARIWAR_A);
    const claimB = await seedClaim(tx, PARIWAR_B);
    await seedAssignment(tx, claimA, PARIWAR_A);
    await seedAssignment(tx, claimB, PARIWAR_B);
    await enterAppScope(client, PARIWAR_B);

    const rows = await tx.select().from(schema.claimShepherdAssignments);
    expect(rows).not.toHaveLength(0);
    expect(rows.every((r) => r.pariwarId === PARIWAR_B)).toBe(true);
    expect(rows.some((r) => r.pariwarId === PARIWAR_A)).toBe(false);
  });

  it('negative: INSERT with a mismatched pariwarId is rejected by withCheck (42501)', async () => {
    const { tx, client } = getTx();
    const claimA = await seedClaim(tx, PARIWAR_A);
    await enterAppScope(client, PARIWAR_A);

    const err = await tx
      .insert(schema.claimShepherdAssignments)
      .values({
        claimCaseId: claimA as never,
        pariwarId: PARIWAR_B as never, // ← MISMATCH under scope A
        shepherdActorId: randomUUID(),
        shepherdDisplay: 'Test Shepherd',
        shepherdContactPhone: '+919000000001',
        assignmentReason: 'initial',
      })
      .catch((e: unknown) => e);
    const cause = (err as { cause?: { code?: string; message?: string } }).cause;
    expect(cause?.code).toBe('42501');
    expect(cause?.message ?? '').toMatch(/row-level security/i);
  });

  it('connection-level fail-closed: app role without scope returns empty', async () => {
    const { tx, client } = getTx();
    const claimA = await seedClaim(tx, PARIWAR_A);
    await seedAssignment(tx, claimA, PARIWAR_A);
    await enterAppRoleNoScope(client);

    const rows = await tx.select().from(schema.claimShepherdAssignments);
    expect(rows).toHaveLength(0);
  });

  it('FORCE RLS: claim_shepherd_assignments has rowsecurity AND forcerowsecurity', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{
      relname: string;
      relrowsecurity: boolean;
      relforcerowsecurity: boolean;
    }>(`SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = 'claim_shepherd_assignments'`);
    expect(rows).toHaveLength(1);
    expect(rows.every((r) => r.relrowsecurity && r.relforcerowsecurity)).toBe(true);
  });

  it('FK integrity: claim_case_id referencing a non-existent claim is rejected (23503)', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await expect(
      client.query(
        `INSERT INTO claim_shepherd_assignments
           (claim_case_id, pariwar_id, shepherd_actor_id, shepherd_display, assignment_reason)
         VALUES ($1, $2, $3, 'Nobody', 'initial')`,
        [randomUUID(), PARIWAR_A, randomUUID()],
      ),
    ).rejects.toMatchObject({ code: '23503' });
  });

  it('FK integrity: supersedes_assignment_id referencing a non-existent assignment is rejected (23503)', async () => {
    const { tx, client } = getTx();
    const claimA = await seedClaim(tx, PARIWAR_A);
    await enterAppScope(client, PARIWAR_A);
    await expect(
      client.query(
        `INSERT INTO claim_shepherd_assignments
           (claim_case_id, pariwar_id, shepherd_actor_id, shepherd_display, assignment_reason, supersedes_assignment_id)
         VALUES ($1, $2, $3, 'Nobody', 'reassignment', $4)`,
        [claimA, PARIWAR_A, randomUUID(), randomUUID()],
      ),
    ).rejects.toMatchObject({ code: '23503' });
  });

  it('partial-unique: a SECOND live (superseded_at IS NULL) row for the same claim is rejected (23505)', async () => {
    const { tx, client } = getTx();
    const claimA = await seedClaim(tx, PARIWAR_A);
    await enterAppScope(client, PARIWAR_A);
    await seedAssignment(tx, claimA, PARIWAR_A);

    await expect(
      client.query(
        `INSERT INTO claim_shepherd_assignments
           (claim_case_id, pariwar_id, shepherd_actor_id, shepherd_display, assignment_reason)
         VALUES ($1, $2, $3, 'Second Live Shepherd', 'reassignment')`,
        [claimA, PARIWAR_A, randomUUID()],
      ),
    ).rejects.toMatchObject({ code: '23505' });
  });

  it('partial-unique: a SUPERSEDED row for the same claim does NOT conflict (superseded_at IS NOT NULL is outside the index)', async () => {
    const { tx, client } = getTx();
    const claimA = await seedClaim(tx, PARIWAR_A);
    await enterAppScope(client, PARIWAR_A);
    await seedAssignment(tx, claimA, PARIWAR_A, { supersededAt: new Date() });

    // A second row for the SAME claim is fine as long as the first is already superseded.
    await expect(seedAssignment(tx, claimA, PARIWAR_A)).resolves.toBeUndefined();
  });

  it('tenant-scoped indexes exist: pariwar_id, claim_case_id, shepherd_actor_id, one-live-per-claim partial-unique', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{ indexname: string }>(
      `SELECT indexname FROM pg_indexes WHERE tablename = 'claim_shepherd_assignments'`,
    );
    const names = rows.map((r) => r.indexname);
    expect(names).toContain('claim_shepherd_assignments_pariwar_id_idx');
    expect(names).toContain('claim_shepherd_assignments_claim_case_id_idx');
    expect(names).toContain('claim_shepherd_assignments_shepherd_actor_id_idx');
    expect(names).toContain('claim_shepherd_assignments_one_live_per_claim_uq');
  });

  it('migration 0061: E.164 CHECK constraints exist on both users + claim_shepherd_assignments contact columns', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{ conname: string }>(
      `SELECT conname FROM pg_constraint WHERE conname LIKE '%_e164_check'`,
    );
    const names = rows.map((r) => r.conname);
    expect(names).toContain('users_contact_phone_e164_check');
    expect(names).toContain('users_contact_whatsapp_e164_check');
    expect(names).toContain('claim_shepherd_assignments_contact_phone_e164_check');
    expect(names).toContain('claim_shepherd_assignments_contact_whatsapp_e164_check');
  });

  it('migration 0061: a malformed (non-E.164) claim_shepherd_assignments contact phone is rejected (23514)', async () => {
    const { tx, client } = getTx();
    const claimA = await seedClaim(tx, PARIWAR_A);
    await enterAppScope(client, PARIWAR_A);
    await expect(
      client.query(
        `INSERT INTO claim_shepherd_assignments
           (claim_case_id, pariwar_id, shepherd_actor_id, shepherd_display, shepherd_contact_phone, assignment_reason)
         VALUES ($1, $2, $3, 'Bad Phone', 'not-a-phone-number', 'initial')`,
        [claimA, PARIWAR_A, randomUUID()],
      ),
    ).rejects.toMatchObject({ code: '23514' });
  });

  it('migration 0061: a malformed (non-E.164) users.contact_phone is rejected (23514)', async () => {
    const { client } = getTx();
    await expect(
      client.query(
        `INSERT INTO users (id, identity_type, status, contact_phone) VALUES ($1, 'admin', 'active', 'not-a-phone-number')`,
        [randomUUID()],
      ),
    ).rejects.toMatchObject({ code: '23514' });
  });
});
