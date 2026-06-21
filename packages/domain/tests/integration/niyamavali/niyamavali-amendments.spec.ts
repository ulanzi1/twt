// niyamavali_amendments append-only + integrity — live-DB (Story 2.3, Task 9, AC4).
//
// The amendment ledger is fully append-only (the migration installs BEFORE
// UPDATE/DELETE/TRUNCATE reject triggers — the events_log precedent). These run
// as the Docker superuser (no app scope) so the TRIGGER — not a missing privilege
// — is what blocks the mutation (twt_app has no UPDATE/DELETE grant anyway). Also
// covers FK integrity + the NOT-NULL affected_member_scope (§1.10) guard.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { clauseId as toClauseId } from '../../../src/ids/index.js';
import { amendClause, createClause } from '../../../src/niyamavali/index.js';
import type { NiyamavaliAmendmentRow } from '../../../src/schema/niyamavali_amendments.js';
import { hasDatabase, getTx, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A } from '../_helpers.js';

const R = toClauseId('niy.amend.test');
const D1 = new Date('2025-01-01T00:00:00Z');
const D2 = new Date('2025-06-01T00:00:00Z');

describe.skipIf(!hasDatabase)('niyamavali_amendments append-only + integrity', () => {
  setupLiveDb();

  // Create a clause + one amendment (as superuser — RLS bypassed). Returns the row.
  async function makeAmendment(): Promise<NiyamavaliAmendmentRow> {
    const { tx } = getTx();
    await createClause(tx, {
      pariwarId: PARIWAR_A,
      clauseId: R,
      effectiveDate: D1,
      payload: { v: 1 },
      benefitMechanism: 'pool',
    });
    const { amendment } = await amendClause(tx, {
      pariwarId: PARIWAR_A,
      clauseId: R,
      payload: { v: 2 },
      effectiveDate: D2,
      affectedMemberScope: { kind: 'past_lockin' },
    });
    return amendment;
  }

  it('amendClause writes a well-formed ledger row (diff + scope + from/to)', async () => {
    const amendment = await makeAmendment();
    expect(amendment.diffDocument.changed).toEqual({ v: { from: 1, to: 2 } });
    expect(amendment.affectedMemberScope).toEqual({ kind: 'past_lockin' });
    expect(amendment.fromClauseVersionId).not.toBe(amendment.toClauseVersionId);
  });

  it('UPDATE on an amendment row is rejected (append-only trigger)', async () => {
    const amendment = await makeAmendment();
    const { client } = getTx();
    await expect(
      client.query(`UPDATE niyamavali_amendments SET diff_document = '{}'::jsonb WHERE amendment_id = $1`, [
        amendment.amendmentId,
      ]),
    ).rejects.toThrow(/append-only/);
  });

  it('DELETE on an amendment row is rejected (append-only trigger)', async () => {
    const amendment = await makeAmendment();
    const { client } = getTx();
    await expect(
      client.query(`DELETE FROM niyamavali_amendments WHERE amendment_id = $1`, [amendment.amendmentId]),
    ).rejects.toThrow(/append-only/);
  });

  it('TRUNCATE niyamavali_amendments is rejected (statement-level trigger)', async () => {
    const { client } = getTx();
    await expect(client.query('TRUNCATE niyamavali_amendments')).rejects.toThrow(/append-only/);
  });

  it('FK integrity: an amendment referencing a non-existent clause_version is rejected (23503)', async () => {
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

  it('NOT NULL: an amendment without affected_member_scope is rejected (23502)', async () => {
    const { client } = getTx();
    await expect(
      client.query(
        `INSERT INTO niyamavali_amendments
           (pariwar_id, from_clause_version_id, to_clause_version_id, diff_document)
         VALUES ($1, $2, $3, '{}'::jsonb)`,
        [PARIWAR_A, randomUUID(), randomUUID()],
      ),
    ).rejects.toMatchObject({ code: expect.stringMatching(/^23(502|503)$/) });
  });
});
