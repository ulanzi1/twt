// Custom-field definitions registry — live-DB integration (Story 10.12, Task 8; AC1/AC2/AC5).
//
// Covers: the append-only trigger, the `(pariwar_id, host_entity, field_key, version)` version pin,
// in-force resolution BY INSTANT (not "latest row"), retirement-as-a-version, the no-silent-rename
// rule, and the §1.7 cardinality bound.
//
// Live DB only. Own-committing writers accumulate rows → assert membership/shape, NEVER global counts
// ([[project_live_db_test_gotchas]]). Seed BEFORE entering app scope.

import { describe, expect, it } from 'vitest';

import {
  CustomFieldCardinalityExceededError,
  CustomFieldDefinitionNotFoundError,
  CustomFieldEffectiveAtOutOfOrderError,
  CustomFieldIncompatibleRedefinitionError,
} from '../../../src/custom-fields/errors.js';
import { CUSTOM_FIELD_DEFINITIONS_MAX_PER_PARIWAR } from '../../../src/custom-fields/limits.js';
import {
  countDefinitions,
  definitionSetVersion,
  definitionVersion,
  definitionsInForce,
  publishDefinitionVersion,
  retireDefinition,
} from '../../../src/custom-fields/registry.js';
import type { CustomFieldDefinitionJson } from '../../../src/schema/pariwar_custom_field_definitions.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope } from '../_helpers.js';

const HOST = 'member' as const;
const AT = new Date('2026-08-10T00:00:00.000Z');

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

/** Publish with the required-explicit attribution fields filled in. */
async function publish(
  tx: Parameters<typeof publishDefinitionVersion>[0],
  definition: CustomFieldDefinitionJson,
  over: Partial<Parameters<typeof publishDefinitionVersion>[1]> = {},
) {
  return publishDefinitionVersion(tx, {
    pariwarId: PARIWAR_A,
    hostEntity: HOST,
    definition,
    authoredByActor: null,
    actorDisplay: 'Integration Seed',
    auditId: null,
    ...over,
  });
}

describe.skipIf(!hasDatabase)('custom-field registry — versioning (AC1)', { timeout: 20000 }, () => {
  setupLiveDb();

  it('⚠ versions start at 1 — there is NO code-resident default owning version 1 (story D2)', async () => {
    // The ONE deviation from both the 10.1 and 10.8 registry precedents. A Pariwar with no rows has
    // NO custom fields, which is a good state with no document to represent — so nothing owns v1.
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const row = await publish(tx, def());
    expect(row.version).toBe(1);
  });

  it('a Pariwar with no rows resolves to an EMPTY frozen set', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const inForce = await definitionsInForce(tx, PARIWAR_A, HOST, AT);
    expect(inForce).toEqual([]);
    expect(Object.isFrozen(inForce)).toBe(true);
  });

  it('publishing again appends v2 and points the PRIOR row forward', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const v1 = await publish(tx, def());
    const v2 = await publish(tx, def({ label_en: 'School block' }));
    expect(v2.version).toBe(2);

    const prior = await definitionVersion(tx, PARIWAR_A, HOST, 'school_block_code', 1);
    expect(prior?.supersededByVersion).toBe(2);
    // The prior row's BODY is untouched — immutability by construction, not by discipline.
    expect(prior?.definition.label_en).toBe(v1.definition.label_en);
  });

  it('⚠ REVERT-SANITY: the append-only trigger REJECTS a mutation of any column but the pointer', async () => {
    // The DB-level backstop. A comment alone does not stop a buggy or malicious UPDATE from
    // rewriting a supposedly-immutable historical version.
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await publish(tx, def());

    // ⚠ Asserted through the RAW pg client, not through drizzle. Drizzle wraps a driver error in a
    // `Failed query: …` Error and hangs the original on `.cause`, so `rejects.toThrow(/…/)` against
    // a drizzle call matches the WRAPPER's text and can never see the trigger's message — the
    // assertion would pass on any failure at all, including a syntax error. The raw client surfaces
    // Postgres's own message (the audit-log append-only spec's convention).
    await expect(
      client.query(
        `UPDATE pariwar_custom_field_definitions SET definition = $1 WHERE pariwar_id = $2 AND field_key = $3`,
        [JSON.stringify(def({ label_en: 'Rewritten' })), PARIWAR_A, 'school_block_code'],
      ),
    ).rejects.toThrow(/immutable-column write rejected/i);
  });

  // ⭐ [Review][Patch] Migration 0095's other three DB-level constraints had NO direct regression test
  // — unlike the frozen-key/PII/shape CHECKs (`frozen-governance.spec.ts`), which each have one. They
  // were protected only by the writer's own logic (which never produces an out-of-range value), so a
  // raw/manual mutation violating them went unverified by any test.

  it('⚠ REVERT-SANITY: the superseded_by_fk REJECTS a forward-pointer with no matching row', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await publish(tx, def({ field_key: 'fk_probe' }));

    // version=1 (the row just published) pointing at superseded_by_version=2 — no version-2 row for
    // this key exists, so the composite self-FK has nothing to reference.
    await expect(
      client.query(
        `UPDATE pariwar_custom_field_definitions
           SET superseded_by_version = 2
         WHERE pariwar_id = $1 AND field_key = $2 AND version = 1`,
        [PARIWAR_A, 'fk_probe'],
      ),
    ).rejects.toThrow(/pariwar_custom_field_definitions_superseded_by_fk/);
  });

  it('⚠ REVERT-SANITY: the version_min_ck REJECTS version 0', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await expect(
      client.query(
        `INSERT INTO pariwar_custom_field_definitions
           (pariwar_id, host_entity, field_key, version, definition, effective_at)
         VALUES ($1, 'member', 'version_min_probe', 0, $2, now())`,
        [PARIWAR_A, JSON.stringify(def({ field_key: 'version_min_probe' }))],
      ),
    ).rejects.toThrow(/pariwar_custom_field_definitions_version_min_ck/);
  });

  it('⚠ REVERT-SANITY: the superseded_forward_ck REJECTS a backward or self pointer', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    // A real version 1 row, so the FK target exists and the FK itself does not mask this CHECK.
    await client.query(
      `INSERT INTO pariwar_custom_field_definitions
         (pariwar_id, host_entity, field_key, version, definition, effective_at)
       VALUES ($1, 'member', 'forward_probe', 1, $2, now())`,
      [PARIWAR_A, JSON.stringify(def({ field_key: 'forward_probe' }))],
    );
    await expect(
      client.query(
        `INSERT INTO pariwar_custom_field_definitions
           (pariwar_id, host_entity, field_key, version, definition, effective_at, superseded_by_version)
         VALUES ($1, 'member', 'forward_probe', 2, $2, now(), 1)`,
        [PARIWAR_A, JSON.stringify(def({ field_key: 'forward_probe' }))],
      ),
    ).rejects.toThrow(/pariwar_custom_field_definitions_superseded_forward_ck/);
  });

  it('the version pin is the TUPLE — the same field_key in another Pariwar is independent', async () => {
    const { client, tx } = getTx();
    // Seeded as superuser BEFORE app scope, so B's row lands regardless of the withCheck policy.
    await publishDefinitionVersion(tx, {
      pariwarId: PARIWAR_B,
      hostEntity: HOST,
      definition: def(),
      authoredByActor: null,
      actorDisplay: 'Integration Seed',
      auditId: null,
    });
    await enterAppScope(client, PARIWAR_A);
    const row = await publish(tx, def());
    // A's first version is still 1 — B's row does not advance A's counter.
    expect(row.version).toBe(1);
  });
});

describe.skipIf(!hasDatabase)('custom-field registry — in force BY INSTANT (AC1)', { timeout: 20000 }, () => {
  setupLiveDb();

  it('resolves the greatest effective_at <= at, NOT simply the latest row', async () => {
    // Resolving by "latest row" would make a point-in-time replay return a definition that had not
    // been published when the value was written.
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await publish(tx, def({ max_length: 16 }), { effectiveAt: new Date('2026-01-01T00:00:00.000Z') });
    await publish(tx, def({ max_length: 32 }), { effectiveAt: new Date('2026-06-01T00:00:00.000Z') });

    const early = await definitionsInForce(tx, PARIWAR_A, HOST, new Date('2026-03-01T00:00:00.000Z'));
    expect(early[0]?.definition.max_length).toBe(16);
    expect(early[0]?.version).toBe(1);

    const late = await definitionsInForce(tx, PARIWAR_A, HOST, new Date('2026-09-01T00:00:00.000Z'));
    expect(late[0]?.definition.max_length).toBe(32);
    expect(late[0]?.version).toBe(2);
  });

  it('rejects a publish whose effective_at precedes the latest version', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await publish(tx, def(), { effectiveAt: new Date('2026-06-01T00:00:00.000Z') });
    await expect(
      publish(tx, def({ label_en: 'Backdated' }), { effectiveAt: new Date('2026-01-01T00:00:00.000Z') }),
    ).rejects.toThrow(CustomFieldEffectiveAtOutOfOrderError);
  });

  it('the definition_set_version hash is DETERMINISTIC and changes when the set changes', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await publish(tx, def());
    const a = definitionSetVersion(await definitionsInForce(tx, PARIWAR_A, HOST, AT));
    const b = definitionSetVersion(await definitionsInForce(tx, PARIWAR_A, HOST, AT));
    expect(a).toBe(b);

    await publish(tx, def({ field_key: 'cadre_grade', label_en: 'Cadre grade', label_hi: 'श्रेणी' }));
    const c = definitionSetVersion(await definitionsInForce(tx, PARIWAR_A, HOST, AT));
    expect(c).not.toBe(a);
  });

  it('the hash does not depend on the ORDER the set was assembled in', async () => {
    // Canonical-JSON + sort, not insertion order — otherwise the same set could pin two ways.
    const one = definitionSetVersion([
      { fieldKey: 'b', version: 1 },
      { fieldKey: 'a', version: 2 },
    ]);
    const two = definitionSetVersion([
      { fieldKey: 'a', version: 2 },
      { fieldKey: 'b', version: 1 },
    ]);
    expect(one).toBe(two);
  });
});

describe.skipIf(!hasDatabase)('custom-field registry — retirement is a VERSION (AC1)', { timeout: 20000 }, () => {
  setupLiveDb();

  it('retiring publishes a new version with retired_at, and does NOT delete the old one', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await publish(tx, def(), { effectiveAt: new Date('2026-01-01T00:00:00.000Z') });
    const retired = await retireDefinition(tx, {
      pariwarId: PARIWAR_A,
      hostEntity: HOST,
      fieldKey: 'school_block_code',
      retiredAt: new Date('2026-06-01T00:00:00.000Z'),
      authoredByActor: null,
      actorDisplay: 'Integration Seed',
      auditId: null,
    });
    expect(retired.version).toBe(2);
    expect(retired.retiredAt).not.toBeNull();

    // v1 is still there — a deleted definition would make its stored values uninterpretable.
    expect(await definitionVersion(tx, PARIWAR_A, HOST, 'school_block_code', 1)).not.toBeNull();
  });

  it('⚠ the retired version republishes the CURRENT body BYTE-FOR-BYTE', async () => {
    // This is what keeps a retired field's shape identical to the shape its stored values were
    // written under — a retirement that also edited the shape would break the history it closes.
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const v1 = await publish(tx, def({ max_length: 24 }), {
      effectiveAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    const retired = await retireDefinition(tx, {
      pariwarId: PARIWAR_A,
      hostEntity: HOST,
      fieldKey: 'school_block_code',
      retiredAt: new Date('2026-06-01T00:00:00.000Z'),
      authoredByActor: null,
      actorDisplay: 'Integration Seed',
      auditId: null,
    });
    expect(retired.definition).toEqual(v1.definition);
  });

  it('a retired field leaves the IN-FORCE set as of the retirement instant', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await publish(tx, def(), { effectiveAt: new Date('2026-01-01T00:00:00.000Z') });
    await retireDefinition(tx, {
      pariwarId: PARIWAR_A,
      hostEntity: HOST,
      fieldKey: 'school_block_code',
      retiredAt: new Date('2026-06-01T00:00:00.000Z'),
      authoredByActor: null,
      actorDisplay: 'Integration Seed',
      auditId: null,
    });

    // BEFORE the retirement it was still governing — retirement is evaluated AS OF `at`.
    const before = await definitionsInForce(tx, PARIWAR_A, HOST, new Date('2026-03-01T00:00:00.000Z'));
    expect(before.map((d) => d.fieldKey)).toContain('school_block_code');

    const after = await definitionsInForce(tx, PARIWAR_A, HOST, new Date('2026-09-01T00:00:00.000Z'));
    expect(after.map((d) => d.fieldKey)).not.toContain('school_block_code');
  });

  it('retiring a field with no in-force definition is a typed NOT-FOUND, not a silent no-op', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await expect(
      retireDefinition(tx, {
        pariwarId: PARIWAR_A,
        hostEntity: HOST,
        fieldKey: 'never_published',
        authoredByActor: null,
        actorDisplay: 'Integration Seed',
        auditId: null,
      }),
    ).rejects.toThrow(CustomFieldDefinitionNotFoundError);
  });

  it('⚠ the table grants NO DELETE — a definition row can never be removed', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await publish(tx, def());
    // Raw client — see the note on the append-only assertion above.
    await expect(
      client.query(`DELETE FROM pariwar_custom_field_definitions WHERE field_key = $1`, [
        'school_block_code',
      ]),
    ).rejects.toThrow(/permission denied/i);
  });
});

describe.skipIf(!hasDatabase)('custom-field registry — no silent renames (AC2)', { timeout: 20000 }, () => {
  setupLiveDb();

  it('⚠ a second version CANNOT change field_type', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await publish(tx, def({ field_type: 'string' }));
    await expect(
      publish(tx, def({ field_type: 'integer', max_length: undefined })),
    ).rejects.toThrow(CustomFieldIncompatibleRedefinitionError);
  });

  it('⚠ a second version CANNOT narrow enum_values — but MAY widen them', async () => {
    // The asymmetry is the rule: every value already stored must stay valid under the new
    // definition. A removed enum member silently invalidates rows nobody will be told about.
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const enumDef = (values: string[]): CustomFieldDefinitionJson =>
      def({
        field_key: 'cadre_grade',
        label_en: 'Cadre grade',
        label_hi: 'श्रेणी',
        field_type: 'enum',
        enum_values: values,
        max_length: undefined,
      });

    await publish(tx, enumDef(['a', 'b']));
    // Widening: fine.
    const widened = await publish(tx, enumDef(['a', 'b', 'c']));
    expect(widened.version).toBe(2);
    // Narrowing: refused.
    await expect(publish(tx, enumDef(['a']))).rejects.toThrow(CustomFieldIncompatibleRedefinitionError);
  });

  it('renaming is impossible BY CONSTRUCTION — a different key is a different field', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await publish(tx, def());
    const other = await publish(tx, def({ field_key: 'school_block', label_en: 'School block' }));
    // Not "version 2 of the renamed field" — a brand-new field at version 1.
    expect(other.version).toBe(1);
    const inForce = await definitionsInForce(tx, PARIWAR_A, HOST, AT);
    expect(inForce.map((d) => d.fieldKey).sort()).toEqual(['school_block', 'school_block_code']);
  });
});

describe.skipIf(!hasDatabase)('custom-field registry — the §1.7 cardinality bound (AC5)', { timeout: 20000 }, () => {
  setupLiveDb();

  it('⚠ refuses a NEW key past the ceiling, but still allows republishing an EXISTING one', async () => {
    // Republishing does not grow the set, and refusing it at the ceiling would deadlock a Pariwar
    // out of correcting a label on a field it already has.
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);

    for (let i = 0; i < CUSTOM_FIELD_DEFINITIONS_MAX_PER_PARIWAR; i += 1) {
      await publish(
        tx,
        def({ field_key: `field_${String(i)}`, label_en: `Field ${String(i)}`, label_hi: `क्षेत्र ${String(i)}` }),
      );
    }
    expect(await countDefinitions(tx, PARIWAR_A, HOST, AT)).toBe(CUSTOM_FIELD_DEFINITIONS_MAX_PER_PARIWAR);

    await expect(
      publish(tx, def({ field_key: 'one_too_many', label_en: 'Too many', label_hi: 'अधिक' })),
    ).rejects.toThrow(CustomFieldCardinalityExceededError);

    // The existing key still republishes.
    const republished = await publish(tx, def({ field_key: 'field_0', label_en: 'Field zero', label_hi: 'क्षेत्र ०' }));
    expect(republished.version).toBe(2);
  });
});
