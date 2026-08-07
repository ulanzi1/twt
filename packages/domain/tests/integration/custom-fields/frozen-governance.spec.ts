// ⭐ THE GOVERNANCE FENCE — live-DB revert-sanity (Story 10.12, Task 8; AC3/AC4).
//
// ⚠ THIS IS THE STORY'S LOAD-BEARING TEST FILE. A fence that is asserted but not tested is not a
// fence, and a green scan proves nothing on its own [[feedback_gate_scope_semantic_coverage]]. AC3
// commits THREE independent layers; this file proves that two of them actually REFUSE, against a
// real database:
//
//   LEG 1 (runtime) — `publishDefinitionVersion` throws on a frozen-governance key.
//   LEG 2 (DB mirror) — a direct INSERT that BYPASSES the writer entirely is rejected by the
//                       `pariwar_custom_field_definitions_frozen_key_ck` CHECK constraint.
//
// (Leg 3, the CI source scan, has its own revert-sanity fixtures in
// `scripts/custom-field-governance/lib.test.ts` — it cannot be exercised against a database, and the
// gate's README says so in plain words rather than overclaiming.)
//
// LEG 2 IS THE ONE THAT MATTERS MOST HERE. Migration 0088's doctrine: "an app-layer rule with no DB
// mirror is a rule that holds only for the callers who happen to go through the app layer." If the
// CHECK were silently dropped, every test that went through the writer would still pass — which is
// exactly why the bypass is tested explicitly.
//
// ⚠ The epic (epics.md:3605) says a `payout_destinations` custom field "is rejected by Story 1.16c CI
// gate". It is not and cannot be: Story 1.16c is `schema-diff`, an invariant scan of committed
// migrations, route literals and Zod exports — a runtime-authored JSONB key is none of those. The
// tests below are the enforcement that citation assumed already existed.

import { describe, expect, it } from 'vitest';

import {
  CustomFieldFrozenGovernanceKeyError,
  CustomFieldNakedPiiKeyError,
  CustomFieldPiiTierUnsupportedError,
} from '../../../src/custom-fields/errors.js';
import { publishDefinitionVersion } from '../../../src/custom-fields/registry.js';
import type { CustomFieldDefinitionJson } from '../../../src/schema/pariwar_custom_field_definitions.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, enterAppScope } from '../_helpers.js';

const HOST = 'member' as const;

function def(over: Partial<CustomFieldDefinitionJson> = {}): CustomFieldDefinitionJson {
  return {
    field_key: 'school_block_code',
    label_en: 'School block code',
    label_hi: 'विद्यालय प्रखंड कोड',
    field_type: 'string',
    max_length: 32,
    pii_tier: 3,
    required: false,
    indexed: false,
    ...over,
  };
}

async function publish(
  tx: Parameters<typeof publishDefinitionVersion>[0],
  definition: CustomFieldDefinitionJson,
) {
  return publishDefinitionVersion(tx, {
    pariwarId: PARIWAR_A,
    hostEntity: HOST,
    definition,
    authoredByActor: null,
    actorDisplay: 'Integration Seed',
    auditId: null,
  });
}

describe.skipIf(!hasDatabase)(
  '⭐ LEG 1 (runtime) — the writer refuses a frozen-governance key (AC3)',
  { timeout: 20000 },
  () => {
    setupLiveDb();

    it('⚠ REVERT-SANITY: `payout_destinations` is REFUSED, naming the control', async () => {
      // THE canonical case — the artifact FR-100 Hook 2 exists to keep out of v1, and the one the
      // epic names by example.
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      await expect(
        publish(tx, def({ field_key: 'payout_destinations', label_en: 'Payout', label_hi: 'भुगतान' })),
      ).rejects.toThrow(CustomFieldFrozenGovernanceKeyError);
    });

    it.each([
      'benefit_mechanism',
      'is_valid',
      'is_assignable',
      'moderation_status',
      'state',
      'pariwar_id',
      'member_id',
      'lock_in_days',
      'audit_id',
      'consent_type',
    ])('refuses the frozen control `%s`', async (key) => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      await expect(
        publish(tx, def({ field_key: key, label_en: 'X', label_hi: 'एक्स' })),
      ).rejects.toThrow(CustomFieldFrozenGovernanceKeyError);
    });

    it('⚠ nothing is written when the fence fires — the refusal is BEFORE the insert', async () => {
      // If the fence ran after the write, a forbidden definition would exist in the table for the
      // life of the transaction and could be committed by any caller that swallowed the error.
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      await expect(
        publish(tx, def({ field_key: 'payout_destination_upi', label_en: 'X', label_hi: 'एक्स' })),
      ).rejects.toThrow(CustomFieldFrozenGovernanceKeyError);

      const rows = await client.query(
        `SELECT 1 FROM pariwar_custom_field_definitions WHERE pariwar_id = $1`,
        [PARIWAR_A],
      );
      expect(rows.rowCount).toBe(0);
    });

    it('a legitimate tenant field is NOT refused — the fence is not a blanket denial', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const row = await publish(tx, def({ field_key: 'panchayat_ward', label_en: 'Ward', label_hi: 'वार्ड' }));
      expect(row.fieldKey).toBe('panchayat_ward');
    });
  },
);

describe.skipIf(!hasDatabase)(
  '⭐ LEG 2 (DB mirror) — a direct INSERT bypassing the writer is refused by the CHECK (AC3)',
  { timeout: 20000 },
  () => {
    setupLiveDb();

    it('⚠ REVERT-SANITY: a raw INSERT of `payout_destinations` is rejected by the constraint', async () => {
      // THE test that justifies the DB mirror existing at all. Every other test in this story goes
      // through the writer, so if the CHECK were dropped they would all still pass — and a writer
      // that never runs (a seed script, a migration, psql) would face nothing.
      const { client } = getTx();
      await enterAppScope(client, PARIWAR_A);
      await expect(
        client.query(
          `INSERT INTO pariwar_custom_field_definitions
             (pariwar_id, host_entity, field_key, version, definition, effective_at)
           VALUES ($1, 'member', 'payout_destinations', 1, $2, now())`,
          [
            PARIWAR_A,
            JSON.stringify(
              def({ field_key: 'payout_destinations', label_en: 'Payout', label_hi: 'भुगतान' }),
            ),
          ],
        ),
      ).rejects.toThrow(/pariwar_custom_field_definitions_frozen_key_ck/);
    });

    it('⚠ the CHECK normalizes too — `Payout-Destinations` cannot launder past the DB', async () => {
      // A DB mirror that only matched the canonical spelling would be walked around by a hyphen, and
      // the app-layer normalization would be the only real control — i.e. no mirror at all.
      const { client } = getTx();
      await enterAppScope(client, PARIWAR_A);
      await expect(
        client.query(
          `INSERT INTO pariwar_custom_field_definitions
             (pariwar_id, host_entity, field_key, version, definition, effective_at)
           VALUES ($1, 'member', 'Payout-Destinations', 1, $2, now())`,
          [
            PARIWAR_A,
            JSON.stringify(
              def({ field_key: 'Payout-Destinations', label_en: 'Payout', label_hi: 'भुगतान' }),
            ),
          ],
        ),
      ).rejects.toThrow(/pariwar_custom_field_definitions_frozen_key_ck/);
    });

    it('the CHECK also reads the key INSIDE the definition body, not only the column', async () => {
      // The two must agree (the `…_definition_shape_ck`), but the frozen-key check reads both anyway:
      // a writer that set a clean column and a forbidden body would otherwise store the forbidden
      // name in the place every reader actually dereferences.
      const { client } = getTx();
      await enterAppScope(client, PARIWAR_A);
      await expect(
        client.query(
          `INSERT INTO pariwar_custom_field_definitions
             (pariwar_id, host_entity, field_key, version, definition, effective_at)
           VALUES ($1, 'member', 'payout_destinations', 1, $2, now())`,
          [PARIWAR_A, JSON.stringify(def({ field_key: 'payout_destinations' }))],
        ),
      ).rejects.toThrow(/frozen_key_ck|definition_shape_ck/);
    });

    it('⚠ the DB also mirrors the v1 Tier-3-only rule (AC4)', async () => {
      const { client } = getTx();
      await enterAppScope(client, PARIWAR_A);
      await expect(
        client.query(
          `INSERT INTO pariwar_custom_field_definitions
             (pariwar_id, host_entity, field_key, version, definition, effective_at)
           VALUES ($1, 'member', 'alternate_id', 1, $2, now())`,
          [
            PARIWAR_A,
            JSON.stringify(
              def({ field_key: 'alternate_id', label_en: 'Alt id', label_hi: 'वैकल्पिक', pii_tier: 2 }),
            ),
          ],
        ),
      ).rejects.toThrow(/pariwar_custom_field_definitions_pii_tier_ck/);
    });

    // ⭐ [Review][Patch] REVERT-SANITY for the pii_tier_ck CASE guard. `..._definition_shape_ck`
    // already proves `pii_tier` is a JSON NUMBER (so a STRING/bool/array value is caught by THAT
    // constraint, not this one) — the residual gap this guard exists for is a JSON number that is not
    // a clean INTEGER, like `3.5`. Before switching the cast target from `::int` to `::numeric`, this
    // exact payload raised an opaque `invalid input syntax for type integer: "3.5"` instead of a clean,
    // named constraint violation.
    it('⚠ a NON-INTEGER numeric pii_tier fails the CHECK cleanly, not with an opaque cast error', async () => {
      const { client } = getTx();
      await enterAppScope(client, PARIWAR_A);
      await expect(
        client.query(
          `INSERT INTO pariwar_custom_field_definitions
             (pariwar_id, host_entity, field_key, version, definition, effective_at)
           VALUES ($1, 'member', 'alternate_id', 1, $2, now())`,
          [
            PARIWAR_A,
            JSON.stringify(
              def({
                field_key: 'alternate_id',
                label_en: 'Alt id',
                label_hi: 'वैकल्पिक',
                // @ts-expect-error — deliberately malformed to prove the DB-level guard, not the app validator
                pii_tier: 3.5,
              }),
            ),
          ],
        ),
      ).rejects.toThrow(/pariwar_custom_field_definitions_pii_tier_ck/);
    });

    it('the host_entity CHECK holds the v1 narrowing to members (story D7)', async () => {
      const { client } = getTx();
      await enterAppScope(client, PARIWAR_A);
      await expect(
        client.query(
          `INSERT INTO pariwar_custom_field_definitions
             (pariwar_id, host_entity, field_key, version, definition, effective_at)
           VALUES ($1, 'claim', 'some_field', 1, $2, now())`,
          [PARIWAR_A, JSON.stringify(def({ field_key: 'some_field' }))],
        ),
      ).rejects.toThrow(/pariwar_custom_field_definitions_host_entity_ck/);
    });
  },
);

describe.skipIf(!hasDatabase)('AC4 — the PII guards, at the writer', { timeout: 20000 }, () => {
  setupLiveDb();

  it('⚠ tier 2 is a DEFERRAL, and the message says so rather than calling the field illegitimate', async () => {
    // The epic's own worked example — "alternate ID number" — is Tier-2 by analogy to §2.7's eHRMS
    // classification, so it does NOT pass. That is ESCALATION 2, raised rather than resolved by
    // relaxing the guard: widening it would put an un-blind-indexed government-adjacent identifier
    // in plaintext JSONB on the certified PII-free members table.
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    try {
      await publish(tx, def({ field_key: 'alternate_id', label_en: 'Alt id', label_hi: 'वैकल्पिक', pii_tier: 2 }));
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(CustomFieldPiiTierUnsupportedError);
      expect((err as Error).message).toMatch(/not yet support/i);
      expect((err as Error).message).toMatch(/blind-index/i);
    }
  });

  it('⚠ a Tier-3 declaration on an Aadhaar-shaped field is still refused', async () => {
    // The mis-declaration case: a tenant declaring tier 3 on an identifier is precisely the "buggy
    // or malicious tenant" §1.7 exists to defend against.
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await expect(
      publish(tx, def({ field_key: 'aadhaar_number', label_en: 'Aadhaar number', label_hi: 'आधार संख्या' })),
    ).rejects.toThrow(CustomFieldNakedPiiKeyError);
  });
});

describe.skipIf(!hasDatabase)('AC9 — Hindi parity is enforced at the writer', { timeout: 20000 }, () => {
  setupLiveDb();

  it('refuses a definition with no Hindi label', async () => {
    // Required NOW, while no member surface renders it: a label authored English-only today becomes
    // an un-backfillable parity violation the moment a renderer lands
    // ([[feedback_record_unattested_no_backfill]]).
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await expect(publish(tx, def({ label_hi: '' }))).rejects.toThrow(/label_hi/);
  });

  it('⚠ the DB mirrors it too — a raw INSERT with a blank Hindi label is refused', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await expect(
      client.query(
        `INSERT INTO pariwar_custom_field_definitions
           (pariwar_id, host_entity, field_key, version, definition, effective_at)
         VALUES ($1, 'member', 'ward_number', 1, $2, now())`,
        [PARIWAR_A, JSON.stringify(def({ field_key: 'ward_number', label_hi: '  ' }))],
      ),
    ).rejects.toThrow(/pariwar_custom_field_definitions_definition_shape_ck/);
  });
});
