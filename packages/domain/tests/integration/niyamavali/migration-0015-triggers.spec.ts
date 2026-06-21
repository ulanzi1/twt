// Migration 0015 deferred-trigger enforcement — live-DB (Story 2.4, Task 8).
//
// AC7 — the clause_versions column-restricted immutability trigger: UPDATE of
// payload / clause_id / version is rejected; UPDATE of the legitimately-mutable
// columns (superseded_by_version, deprecated_at, audit_id) is allowed.
// AC8 De2 — the niyamavali_amendments cross-tenant guard: an amendment whose
// pariwar_id ≠ the pariwar_id of its from/to clause_versions is rejected; a
// same-tenant amendment is allowed (and a non-existent ref still falls through to
// the FK → 23503, preserving the 2.3 contract).
//
// Runs as the Docker superuser (RLS bypassed) so the TRIGGER — not RLS visibility —
// is what's under test.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { hasDatabase, getTx, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, seedClauseVersion } from '../_helpers.js';

describe.skipIf(!hasDatabase)('AC7 — clause_versions immutability trigger', () => {
  setupLiveDb();

  it('UPDATE of payload is rejected', async () => {
    const { tx, client } = getTx();
    const cvId = await seedClauseVersion(tx, PARIWAR_A, { clauseId: 'niy.imm.one' });
    await expect(
      client.query(`UPDATE clause_versions SET payload = '{"x":1}'::jsonb WHERE clause_version_id = $1`, [cvId]),
    ).rejects.toThrow(/immutable/);
  });

  it('UPDATE of clause_id is rejected', async () => {
    const { tx, client } = getTx();
    const cvId = await seedClauseVersion(tx, PARIWAR_A, { clauseId: 'niy.imm.two' });
    await expect(
      client.query(`UPDATE clause_versions SET clause_id = 'niy.imm.renamed' WHERE clause_version_id = $1`, [cvId]),
    ).rejects.toThrow(/immutable/);
  });

  it('UPDATE of version is rejected', async () => {
    const { tx, client } = getTx();
    const cvId = await seedClauseVersion(tx, PARIWAR_A, { clauseId: 'niy.imm.three' });
    await expect(
      client.query(`UPDATE clause_versions SET version = 99 WHERE clause_version_id = $1`, [cvId]),
    ).rejects.toThrow(/immutable/);
  });

  it('UPDATE of deprecated_at (a legitimately-mutable column) is ALLOWED', async () => {
    const { tx, client } = getTx();
    const cvId = await seedClauseVersion(tx, PARIWAR_A, { clauseId: 'niy.imm.four' });
    await expect(
      client.query(`UPDATE clause_versions SET deprecated_at = now() WHERE clause_version_id = $1`, [cvId]),
    ).resolves.toBeDefined();
  });

  it('UPDATE of superseded_by_version + audit_id (mutable columns) is ALLOWED', async () => {
    const { tx, client } = getTx();
    const cvId = await seedClauseVersion(tx, PARIWAR_A, { clauseId: 'niy.imm.five' });
    // audit_id → NULL is a no-op but exercises the non-immutable-column path; the
    // publish API path sets a real audit_id (covered by the apps/api integration test).
    await expect(
      client.query(`UPDATE clause_versions SET audit_id = NULL WHERE clause_version_id = $1`, [cvId]),
    ).resolves.toBeDefined();
  });
});

describe.skipIf(!hasDatabase)('AC8 De2 — niyamavali_amendments cross-tenant guard', () => {
  setupLiveDb();

  it('a same-tenant amendment insert is ALLOWED', async () => {
    const { tx, client } = getTx();
    const from = await seedClauseVersion(tx, PARIWAR_A, { clauseId: 'niy.de2.a', version: 1 });
    const to = await seedClauseVersion(tx, PARIWAR_A, { clauseId: 'niy.de2.a', version: 2 });
    await expect(
      client.query(
        `INSERT INTO niyamavali_amendments
           (pariwar_id, from_clause_version_id, to_clause_version_id, diff_document, affected_member_scope)
         VALUES ($1, $2, $3, '{"added":{},"removed":{},"changed":{}}'::jsonb, '{"kind":"all_members"}'::jsonb)`,
        [PARIWAR_A, from, to],
      ),
    ).resolves.toBeDefined();
  });

  it('a cross-tenant amendment insert is REJECTED (De2 trigger)', async () => {
    const { tx, client } = getTx();
    const fromA = await seedClauseVersion(tx, PARIWAR_A, { clauseId: 'niy.de2.x', version: 1 });
    const toB = await seedClauseVersion(tx, PARIWAR_B, { clauseId: 'niy.de2.y', version: 1 });
    // pariwar_id = A but to_clause_version belongs to B → cross-tenant.
    await expect(
      client.query(
        `INSERT INTO niyamavali_amendments
           (pariwar_id, from_clause_version_id, to_clause_version_id, diff_document, affected_member_scope)
         VALUES ($1, $2, $3, '{"added":{},"removed":{},"changed":{}}'::jsonb, '{"kind":"all_members"}'::jsonb)`,
        [PARIWAR_A, fromA, toB],
      ),
    ).rejects.toThrow(/cross-tenant/);
  });

  it('a non-existent reference still falls through to the FK (23503), not the De2 trigger', async () => {
    const { client } = getTx();
    await expect(
      client.query(
        `INSERT INTO niyamavali_amendments
           (pariwar_id, from_clause_version_id, to_clause_version_id, diff_document, affected_member_scope)
         VALUES ($1, $2, $3, '{}'::jsonb, '{"kind":"all_members"}'::jsonb)`,
        [PARIWAR_A, randomUUID(), randomUUID()],
      ),
    ).rejects.toMatchObject({ code: '23503' });
  });
});
