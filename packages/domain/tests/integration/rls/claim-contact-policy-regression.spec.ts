// claim_contacts + claim_contact_nominees — migration 0125 + RLS policy regression (Story 6.19a, Task 1; AC11a
// "Schema"). Mirrors claim-death-certificate-policy-regression: positive / negative RLS, the connection-level
// fail-closed probe, the FORCE-RLS catalog guard, PLUS this migration's own integrity — every FK (incl.
// `agreement_consent_id` and the two version FKs), the UNIQUE `(contact_id, nominee_version_id)`, one contact per
// claim, the CHECKs (incl. the parent's "claimant fields present ⇔ the claimant version is null"), and ⛔ no DELETE
// for `twt_app` (W4). Live DB only; per-test ROLLBACK (setupLiveDb), so the fixed PARIWAR_A/B are safe here.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import {
  PARIWAR_A,
  PARIWAR_B,
  enterAppRoleNoScope,
  enterAppScope,
  seedClaim,
  seedConsentRecord,
  seedNomineeDeclaration,
} from '../_helpers.js';

type Tx = ReturnType<typeof getTx>['tx'];

describe.skipIf(!hasDatabase)('claim_contacts + claim_contact_nominees — migration 0125 + RLS policy regression', { timeout: 20000 }, () => {
  setupLiveDb();

  /** A claim, its deceased member's one-nominee declaration, and an agreement consent — as the superuser. */
  async function seedBase(tx: Tx, pariwarId: string) {
    const deceased = randomUUID();
    const claimCaseId = await seedClaim(tx, pariwarId, { deceasedMemberId: deceased });
    const [version] = await seedNomineeDeclaration(tx, pariwarId, deceased);
    const consentId = await seedConsentRecord(tx, pariwarId, {
      subjectId: deceased,
      consentType: 'claim_contact_agreement',
    });
    return { claimCaseId, deceased, versionId: version!.versionId as string, consentId };
  }

  /** A complete contact (the claimant IS the nominee) + its one child row — as the superuser. */
  async function seedContact(tx: Tx, pariwarId: string) {
    const base = await seedBase(tx, pariwarId);
    const [contact] = await tx
      .insert(schema.claimContacts)
      .values({
        claimCaseId: base.claimCaseId as never,
        pariwarId: pariwarId as never,
        deceasedMemberId: base.deceased as never,
        claimantNomineeVersionId: base.versionId as never,
        agreementConsentId: base.consentId as never,
        recordedByActor: 'member:fixture',
        recordedVia: 'member_app',
      })
      .returning();
    await tx.insert(schema.claimContactNominees).values({
      contactId: contact!.contactId,
      claimCaseId: base.claimCaseId as never,
      pariwarId: pariwarId as never,
      nomineeVersionId: base.versionId as never,
      addressCiphertext: 'enc:v1:address',
    });
    return { ...base, contactId: contact!.contactId };
  }

  /** Raw INSERT of a parent row, so a CHECK / FK violation reaches Postgres un-typed. */
  function insertParent(client: ReturnType<typeof getTx>['client'], v: Record<string, unknown>) {
    const cols = Object.keys(v);
    return client.query(
      `INSERT INTO claim_contacts (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')})`,
      Object.values(v),
    );
  }

  for (const table of ['claim_contacts', 'claim_contact_nominees'] as const) {
    const drizzleTable = table === 'claim_contacts' ? schema.claimContacts : schema.claimContactNominees;

    it(`positive + negative: ${table} under scope A shows only A rows, and scope B only B rows`, async () => {
      const { tx, client } = getTx();
      await seedContact(tx, PARIWAR_A);
      await seedContact(tx, PARIWAR_B);
      await enterAppScope(client, PARIWAR_A);
      const a = await tx.select().from(drizzleTable);
      expect(a).not.toHaveLength(0);
      expect(a.every((r) => r.pariwarId === PARIWAR_A)).toBe(true);
      await enterAppScope(client, PARIWAR_B);
      const b = await tx.select().from(drizzleTable);
      expect(b).not.toHaveLength(0);
      expect(b.some((r) => r.pariwarId === PARIWAR_A)).toBe(false);
    });

    it(`connection-level fail-closed: the app role with no scope sees ⛔ no ${table} row`, async () => {
      const { tx, client } = getTx();
      await seedContact(tx, PARIWAR_A);
      await enterAppRoleNoScope(client);
      expect(await tx.select().from(drizzleTable)).toHaveLength(0);
    });

    it(`FORCE RLS: ${table} has rowsecurity AND forcerowsecurity`, async () => {
      const { client } = getTx();
      const { rows } = await client.query<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>(
        `SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = $1`,
        [table],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]!.relrowsecurity && rows[0]!.relforcerowsecurity).toBe(true);
    });

    it(`⛔ no DELETE for twt_app on ${table} (W4 — a write never deletes a row it does not carry)`, async () => {
      const { tx, client } = getTx();
      const seeded = await seedContact(tx, PARIWAR_A);
      await enterAppScope(client, PARIWAR_A);
      await expect(client.query(`DELETE FROM ${table} WHERE claim_case_id = $1`, [seeded.claimCaseId])).rejects.toMatchObject({
        code: '42501',
      });
    });

    it(`the policies are per-command — ⛔ no FOR ALL and ⛔ no DELETE policy on ${table}`, async () => {
      const { client } = getTx();
      const { rows } = await client.query<{ cmd: string }>(`SELECT cmd FROM pg_policies WHERE tablename = $1`, [table]);
      expect(rows.map((r) => r.cmd).sort()).toEqual(['INSERT', 'SELECT', 'UPDATE']);
    });
  }

  it('negative: an INSERT whose pariwar_id is not the scope is refused by WITH CHECK (42501)', async () => {
    const { tx, client } = getTx();
    const base = await seedBase(tx, PARIWAR_A);
    await enterAppScope(client, PARIWAR_A);
    const err = await tx
      .insert(schema.claimContacts)
      .values({
        claimCaseId: base.claimCaseId as never,
        pariwarId: PARIWAR_B as never,
        deceasedMemberId: base.deceased as never,
        claimantNomineeVersionId: base.versionId as never,
        agreementConsentId: base.consentId as never,
        recordedByActor: 'member:fixture',
        recordedVia: 'member_app',
      })
      .catch((e: unknown) => e);
    expect((err as { cause?: { code?: string } }).cause?.code).toBe('42501');
  });

  describe('FKs (23503)', () => {
    const valid = (b: Awaited<ReturnType<typeof seedBase>>) => ({
      claim_case_id: b.claimCaseId,
      pariwar_id: PARIWAR_A,
      deceased_member_id: b.deceased,
      claimant_nominee_version_id: b.versionId,
      agreement_consent_id: b.consentId,
      recorded_by_actor: 'member:fixture',
      recorded_via: 'member_app',
    });

    it('claim_case_id → claims', async () => {
      const { tx, client } = getTx();
      const b = await seedBase(tx, PARIWAR_A);
      await expect(insertParent(client, { ...valid(b), claim_case_id: randomUUID() })).rejects.toMatchObject({ code: '23503' });
    });

    it('⭐ agreement_consent_id → consent_records (the per-claim agreement, D15)', async () => {
      const { tx, client } = getTx();
      const b = await seedBase(tx, PARIWAR_A);
      await expect(insertParent(client, { ...valid(b), agreement_consent_id: randomUUID() })).rejects.toMatchObject({
        code: '23503',
      });
    });

    it('claimant_nominee_version_id → member_nominee_versions', async () => {
      const { tx, client } = getTx();
      const b = await seedBase(tx, PARIWAR_A);
      await expect(insertParent(client, { ...valid(b), claimant_nominee_version_id: randomUUID() })).rejects.toMatchObject({
        code: '23503',
      });
    });

    // One violation per test — a failed statement aborts the per-test transaction (25P02).
    for (const col of ['nominee_version_id', 'contact_id'] as const) {
      it(`the child: ${col} is a foreign key`, async () => {
        const { tx, client } = getTx();
        const s = await seedContact(tx, PARIWAR_A);
        const over: Record<string, unknown> = { [col]: randomUUID() };
        await expect(
          client.query(
            `INSERT INTO claim_contact_nominees (contact_id, claim_case_id, pariwar_id, nominee_version_id, address_ciphertext)
             VALUES ($1, $2, $3, $4, 'enc:v1:x')`,
            [over['contact_id'] ?? s.contactId, s.claimCaseId, PARIWAR_A, over['nominee_version_id'] ?? s.versionId],
          ),
        ).rejects.toMatchObject({ code: '23503' });
      });
    }
  });

  describe('uniqueness (23505)', () => {
    it('⭐ UNIQUE (contact_id, nominee_version_id) — one row per nominee version (W4)', async () => {
      const { tx, client } = getTx();
      const s = await seedContact(tx, PARIWAR_A);
      await expect(
        client.query(
          `INSERT INTO claim_contact_nominees (contact_id, claim_case_id, pariwar_id, nominee_version_id, address_ciphertext)
           VALUES ($1, $2, $3, $4, 'enc:v1:again')`,
          [s.contactId, s.claimCaseId, PARIWAR_A, s.versionId],
        ),
      ).rejects.toMatchObject({ code: '23505' });
    });

    it('one contact record per claim', async () => {
      const { tx, client } = getTx();
      const s = await seedContact(tx, PARIWAR_A);
      await expect(
        insertParent(client, {
          claim_case_id: s.claimCaseId,
          pariwar_id: PARIWAR_A,
          deceased_member_id: s.deceased,
          claimant_nominee_version_id: s.versionId,
          agreement_consent_id: s.consentId,
          recorded_by_actor: 'member:fixture',
          recorded_via: 'member_app',
        }),
      ).rejects.toMatchObject({ code: '23505' });
    });
  });

  describe('CHECKs (23514)', () => {
    async function attempt(over: Record<string, unknown>) {
      const { tx, client } = getTx();
      const b = await seedBase(tx, PARIWAR_A);
      return insertParent(client, {
        claim_case_id: b.claimCaseId,
        pariwar_id: PARIWAR_A,
        deceased_member_id: b.deceased,
        agreement_consent_id: b.consentId,
        recorded_by_actor: 'member:fixture',
        recorded_via: 'member_app',
        claimant_nominee_version_id: b.versionId,
        ...over,
      });
    }
    const block = {
      claimant_nominee_version_id: null,
      claimant_name_ciphertext: 'enc:v1:n',
      claimant_mobile_ciphertext: 'enc:v1:m',
      claimant_address_ciphertext: 'enc:v1:a',
    };

    it('⭐ W6 — BOTH claimant sides is refused', async () => {
      const { tx } = getTx();
      const b = await seedBase(tx, PARIWAR_A);
      await expect(attempt({ ...block, claimant_nominee_version_id: b.versionId })).rejects.toMatchObject({ code: '23514' });
    });

    it('⭐ W6 — NEITHER claimant side is refused (the writer answers 400 claimant_required before this)', async () => {
      await expect(attempt({ claimant_nominee_version_id: null })).rejects.toMatchObject({ code: '23514' });
    });

    it('⭐ W6 — a PARTIAL claimant block is refused (all three or none)', async () => {
      await expect(attempt({ ...block, claimant_address_ciphertext: null })).rejects.toMatchObject({ code: '23514' });
    });

    it('✅ the claimant block alone is accepted; so is the claimant version alone', async () => {
      await expect(attempt(block)).resolves.toBeDefined();
    });

    it('contact_locale ∈ {hi, en}', async () => {
      await expect(attempt({ contact_locale: 'fr' })).rejects.toMatchObject({ code: '23514' });
    });

    it('recorded_via is checked', async () => {
      await expect(attempt({ recorded_via: 'email' })).rejects.toMatchObject({ code: '23514' });
    });

    it('recorded_by_actor is non-blank', async () => {
      await expect(attempt({ recorded_by_actor: '  ' })).rejects.toMatchObject({ code: '23514' });
    });

    it('a child relationship may be null, but ⛔ never blank', async () => {
      const { tx, client } = getTx();
      const s = await seedContact(tx, PARIWAR_A);
      await expect(
        client.query(`UPDATE claim_contact_nominees SET relationship = ' ' WHERE contact_id = $1`, [s.contactId]),
      ).rejects.toMatchObject({ code: '23514' });
    });

    it('a child address is required (NOT NULL, 23502)', async () => {
      const { tx, client } = getTx();
      const s = await seedContact(tx, PARIWAR_A);
      await expect(
        client.query(`UPDATE claim_contact_nominees SET address_ciphertext = NULL WHERE contact_id = $1`, [s.contactId]),
      ).rejects.toMatchObject({ code: '23502' });
    });
  });

  it('the only deletion is the ON DELETE cascade from claims — both tables follow the claim', async () => {
    const { tx, client } = getTx();
    const s = await seedContact(tx, PARIWAR_A);
    // As the superuser (the fixture owner) — a spec cleanup / a hard delete of the claim itself.
    await client.query(`DELETE FROM claims WHERE claim_case_id = $1`, [s.claimCaseId]);
    const left = await client.query(
      `SELECT (SELECT count(*) FROM claim_contacts WHERE claim_case_id = $1)::int AS p,
              (SELECT count(*) FROM claim_contact_nominees WHERE claim_case_id = $1)::int AS c`,
      [s.claimCaseId],
    );
    expect(left.rows[0]).toEqual({ p: 0, c: 0 });
  });
});
