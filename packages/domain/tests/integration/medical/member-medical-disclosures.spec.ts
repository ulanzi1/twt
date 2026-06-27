// member_medical_disclosures behaviour — live-DB integration (Story 3.5, Task 10).
//
// Drives the domain medical accessors against real Postgres inside the per-test BEGIN/ROLLBACK
// envelope. Four families:
//   · append-only history + ciphertext round-trip — append disclosure 1, then disclosure 2; BOTH
//     rows are preserved (NOT latest-wins — R2; Epic 4 walks the full history), the serialized
//     ciphertext round-trips AS-IS, and getLatest returns the newest. Assert MEMBERSHIP, not a
//     global count, per [[live-db gotchas]].
//   · cross-tenant RLS — a PARIWAR_B disclosure row is invisible under PARIWAR_A scope (raw AND
//     via the accessor). enterAppScope sheds the Docker superuser (which bypasses RLS).
//   · FK cascade (RTBF, Story 3.12) — deleting the member sweeps its disclosure rows.
//   · consent FK — a disclosure references the consent_records row created alongside it.

import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import {
  clauseVersionId as toClauseVersionId,
  consentId as toConsentId,
  memberId as toMemberId,
} from '../../../src/ids/index.js';
import {
  appendMedicalDisclosure,
  getLatestMedicalDisclosure,
  getMedicalDisclosures,
} from '../../../src/medical/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope, seedConsentRecord, seedMember } from '../_helpers.js';

describe.skipIf(!hasDatabase)(
  'member_medical_disclosures — append-only history + RLS + FK cascade (:5433)',
  () => {
    setupLiveDb();

    it('append-only history: a prior disclosure is preserved when a newer one is appended; ciphertext round-trips', async () => {
      const { tx, client } = getTx();
      const mid = randomUUID();
      await seedMember(tx, PARIWAR_A, { memberId: mid });
      // One consent per disclosure (append-only ⇒ a new consent row per submit — AC4).
      const consentOld = await seedConsentRecord(tx, PARIWAR_A, {
        consentType: 'medical_disclosure_ack',
      });
      const consentNew = await seedConsentRecord(tx, PARIWAR_A, {
        consentType: 'medical_disclosure_ack',
      });
      const memberId = toMemberId(mid);

      // An OLDER disclosure seeded directly with an explicit past timestamp. (In production each
      // submit is its OWN transaction, so created_at differs naturally; within this single test
      // tx `now()` would tie — transaction_timestamp — so we set the older instant explicitly to
      // keep newest-first ordering deterministic. [[live-db gotchas]].)
      await tx.insert(schema.memberMedicalDisclosures).values({
        memberId,
        pariwarId: PARIWAR_A,
        imaListVersion: 'ima-old',
        disclosedConditionsCiphertext: 'enc:v1:cond-old',
        additionalContextCiphertext: 'enc:v1:ctx-old',
        conditionCount: 2,
        acknowledgmentTextLocale: 'en',
        clauseVersionId: toClauseVersionId(randomUUID()),
        consentId: toConsentId(consentOld),
        acknowledgedAt: new Date('2025-01-01T00:00:00Z'),
        createdAt: new Date('2025-01-01T00:00:00Z'),
      });

      await enterAppScope(client, PARIWAR_A);

      // Append a NEWER disclosure via the accessor — zero conditions (still valid; encrypted '[]').
      const newer = await appendMedicalDisclosure(tx, {
        memberId,
        pariwarId: PARIWAR_A,
        imaListVersion: 'ima-new',
        disclosedConditionsCiphertext: 'enc:v1:empty',
        additionalContextCiphertext: null,
        conditionCount: 0,
        acknowledgmentTextLocale: 'hi',
        clauseVersionId: toClauseVersionId(randomUUID()),
        consentId: toConsentId(consentNew),
      });
      expect(newer.disclosedConditionsCiphertext).toBe('enc:v1:empty'); // serialized envelope round-trips
      expect(newer.conditionCount).toBe(0);

      // APPEND-ONLY: the prior row is NOT deleted (cf. nominees' latest-wins). Assert membership.
      const rows = await getMedicalDisclosures(tx, PARIWAR_A, memberId);
      expect(rows).toHaveLength(2);
      expect(rows.map((r) => r.imaListVersion).sort()).toEqual(['ima-new', 'ima-old']);

      // getLatest returns the newest (the appended zero-condition, hi-locale disclosure).
      const latest = await getLatestMedicalDisclosure(tx, PARIWAR_A, memberId);
      expect(latest?.imaListVersion).toBe('ima-new');
      expect(latest?.conditionCount).toBe(0);
      expect(latest?.additionalContextCiphertext).toBeNull();
      expect(latest?.acknowledgmentTextLocale).toBe('hi');
    });

    it('cross-tenant RLS: a PARIWAR_B disclosure row is invisible under PARIWAR_A scope', async () => {
      const { tx, client } = getTx();
      const midB = randomUUID();
      await seedMember(tx, PARIWAR_B, { memberId: midB });
      const consentB = await seedConsentRecord(tx, PARIWAR_B, {
        consentType: 'medical_disclosure_ack',
      });
      await tx.insert(schema.memberMedicalDisclosures).values({
        memberId: toMemberId(midB),
        pariwarId: PARIWAR_B,
        imaListVersion: 'ima-b',
        disclosedConditionsCiphertext: 'enc:v1:b-cond',
        additionalContextCiphertext: null,
        conditionCount: 1,
        acknowledgmentTextLocale: 'en',
        clauseVersionId: toClauseVersionId(randomUUID()),
        consentId: toConsentId(consentB),
      });

      // Enter PARIWAR_A scope (sheds superuser → RLS now enforced).
      await enterAppScope(client, PARIWAR_A);

      // A raw, tenant-predicate-free SELECT sees 0 of B's rows under A's scope.
      const raw = await client.query(
        'SELECT count(*)::int AS n FROM member_medical_disclosures WHERE member_id = $1',
        [midB],
      );
      expect(raw.rows[0].n).toBe(0);

      // And the accessor (tenant predicate = A) resolves nothing for B's member.
      expect(await getMedicalDisclosures(tx, PARIWAR_A, toMemberId(midB))).toEqual([]);
    });

    it('consent FK: a disclosure’s consent_id references a live consent_records row', async () => {
      const { tx, client } = getTx();
      const mid = randomUUID();
      await seedMember(tx, PARIWAR_A, { memberId: mid });
      const consentUuid = await seedConsentRecord(tx, PARIWAR_A, {
        consentType: 'medical_disclosure_ack',
      });
      await tx.insert(schema.memberMedicalDisclosures).values({
        memberId: toMemberId(mid),
        pariwarId: PARIWAR_A,
        imaListVersion: 'ima-v1',
        disclosedConditionsCiphertext: 'enc:v1:c1',
        additionalContextCiphertext: null,
        conditionCount: 1,
        acknowledgmentTextLocale: 'en',
        clauseVersionId: toClauseVersionId(randomUUID()),
        consentId: toConsentId(consentUuid),
      });
      // FK is navigable: the disclosure's consent_id joins to the live consent_records row.
      const joined = await client.query<{ consent_type: string }>(
        `SELECT cr.consent_type
           FROM member_medical_disclosures d
           JOIN consent_records cr ON cr.consent_id = d.consent_id
          WHERE d.member_id = $1`,
        [mid],
      );
      expect(joined.rows).toHaveLength(1);
      expect(joined.rows[0]?.consent_type).toBe('medical_disclosure_ack');
    });

    it('FK cascade (RTBF): deleting the member sweeps its disclosure rows', async () => {
      const { tx } = getTx();
      const mid = randomUUID();
      await seedMember(tx, PARIWAR_A, { memberId: mid });
      const consent = await seedConsentRecord(tx, PARIWAR_A, {
        consentType: 'medical_disclosure_ack',
      });
      await tx.insert(schema.memberMedicalDisclosures).values({
        memberId: toMemberId(mid),
        pariwarId: PARIWAR_A,
        imaListVersion: 'ima-v1',
        disclosedConditionsCiphertext: 'enc:v1:c1',
        additionalContextCiphertext: null,
        conditionCount: 1,
        acknowledgmentTextLocale: 'en',
        clauseVersionId: toClauseVersionId(randomUUID()),
        consentId: toConsentId(consent),
      });

      // Present before the delete.
      const before = await tx
        .select()
        .from(schema.memberMedicalDisclosures)
        .where(eq(schema.memberMedicalDisclosures.memberId, toMemberId(mid)));
      expect(before).toHaveLength(1);

      // Delete the member → ON DELETE CASCADE sweeps the disclosure rows (Story 3.12 RTBF).
      await tx.delete(schema.members).where(eq(schema.members.memberId, toMemberId(mid)));

      const after = await tx
        .select()
        .from(schema.memberMedicalDisclosures)
        .where(eq(schema.memberMedicalDisclosures.memberId, toMemberId(mid)));
      expect(after).toEqual([]);
    });
  },
);
