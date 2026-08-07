// `members.custom_fields` write path — live-DB integration (Story 10.12, Task 8; AC5/AC6).
//
// Covers: per-type validation, D6 STRICT unknown-key rejection, all four AC5 limit classes, the
// `definition_set_version` replay pin, the retired-field read/write asymmetry, and the absence of a
// projector guard (a custom-field write must NOT trip the migration-0018 state-writer trigger).
//
// Live DB only. Seed BEFORE entering app scope.

import { and, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import {
  CustomFieldPayloadTooLargeError,
  CustomFieldValuesInvalidError,
} from '../../../src/custom-fields/errors.js';
import {
  CUSTOM_FIELDS_MAX_PAYLOAD_BYTES,
  CUSTOM_FIELD_DEFINITIONS_MAX_PER_PARIWAR,
} from '../../../src/custom-fields/limits.js';
import { ginIndexBytes, readMemberCustomFields, setMemberCustomFields } from '../../../src/custom-fields/member-write.js';
import { definitionSetVersion, definitionsInForce, publishDefinitionVersion, retireDefinition } from '../../../src/custom-fields/registry.js';
import { memberId as toMemberId } from '../../../src/ids/index.js';
import { members } from '../../../src/schema/members.js';
import type { CustomFieldDefinitionJson } from '../../../src/schema/pariwar_custom_field_definitions.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, enterAppScope, seedMember } from '../_helpers.js';

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

describe.skipIf(!hasDatabase)('member custom-field values — the write path (AC6)', { timeout: 20000 }, () => {
  setupLiveDb();

  it('writes a validated value set and stamps the definition_set_version pin', async () => {
    const { client, tx } = getTx();
    const member = await seedMember(tx, PARIWAR_A);
    await enterAppScope(client, PARIWAR_A);
    await publish(tx, def());

    const envelope = await setMemberCustomFields(tx, {
      pariwarId: PARIWAR_A,
      memberId: toMemberId(member),
      values: { school_block_code: 'BLK-14' },
      auditId: null,
    });

    expect(envelope.values).toEqual({ school_block_code: 'BLK-14' });
    expect(envelope.definition_set_version).toBe(
      definitionSetVersion(await definitionsInForce(tx, PARIWAR_A, HOST, new Date())),
    );
    expect(envelope.written_at).not.toBeNull();

    const read = await readMemberCustomFields(tx, PARIWAR_A, toMemberId(member));
    expect(read?.values).toEqual({ school_block_code: 'BLK-14' });
  });

  it('a never-written member normalizes the bare `{}` DEFAULT into a full envelope', async () => {
    // The column default is the SMALLEST valid value (a hot-table `ADD COLUMN` concern), so readers
    // must tolerate it. Never dereference `.values` on the raw column.
    const { client, tx } = getTx();
    const member = await seedMember(tx, PARIWAR_A);
    await enterAppScope(client, PARIWAR_A);
    const read = await readMemberCustomFields(tx, PARIWAR_A, toMemberId(member));
    expect(read).toEqual({ definition_set_version: null, written_at: null, values: {} });
  });

  it('⭐ NO PROJECTOR GUARD IS NEEDED — the write leaves `state` untouched and the 0018 trigger stays silent', async () => {
    // AC6's structural claim, tested rather than asserted. The 0018 trigger RAISEs on a `state`
    // change without `app.member_state_writer`; a custom-fields write touches neither `state` nor
    // `state_event_version`, so it must sail through with no session variable at all.
    const { client, tx } = getTx();
    const member = await seedMember(tx, PARIWAR_A, { state: 'active', stateEventVersion: 5 });
    await enterAppScope(client, PARIWAR_A);
    await publish(tx, def());

    await setMemberCustomFields(tx, {
      pariwarId: PARIWAR_A,
      memberId: toMemberId(member),
      values: { school_block_code: 'BLK-14' },
      auditId: null,
    });

    const rows = await tx
      .select({ state: members.state, ver: members.stateEventVersion })
      .from(members)
      .where(and(eq(members.memberId, toMemberId(member)), eq(members.pariwarId, PARIWAR_A)));
    expect(rows[0]?.state).toBe('active');
    expect(rows[0]?.ver).toBe(5);
  });

  it('a member outside this Pariwar is not writable — the UPDATE matches no row', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await publish(tx, def());
    await expect(
      setMemberCustomFields(tx, {
        pariwarId: PARIWAR_A,
        memberId: toMemberId('99999999-9999-9999-9999-999999999999'),
        values: {},
        auditId: null,
      }),
    ).rejects.toThrow(/matched no row/i);
  });
});

describe.skipIf(!hasDatabase)('⚠ D6 — unknown keys FAIL, never silently drop', { timeout: 20000 }, () => {
  setupLiveDb();

  it('⚠ REVERT-SANITY: a key with no in-force definition is REFUSED', async () => {
    // Silently ignoring it would turn a client bug into invisible data loss. This is the JSONB
    // analogue of the `.strict()` rule the contracts layer applies everywhere.
    const { client, tx } = getTx();
    const member = await seedMember(tx, PARIWAR_A);
    await enterAppScope(client, PARIWAR_A);
    await publish(tx, def());

    await expect(
      setMemberCustomFields(tx, {
        pariwarId: PARIWAR_A,
        memberId: toMemberId(member),
        values: { school_block_code: 'BLK-14', not_a_field: 'x' },
        auditId: null,
      }),
    ).rejects.toThrow(CustomFieldValuesInvalidError);
  });

  it('the whole write is refused — the KNOWN key is not written either', async () => {
    // A partial write would be the worst outcome: the caller is told it failed while half the set
    // landed, so a retry with the corrected payload silently overwrites a different half.
    const { client, tx } = getTx();
    const member = await seedMember(tx, PARIWAR_A);
    await enterAppScope(client, PARIWAR_A);
    await publish(tx, def());
    await expect(
      setMemberCustomFields(tx, {
        pariwarId: PARIWAR_A,
        memberId: toMemberId(member),
        values: { school_block_code: 'BLK-14', not_a_field: 'x' },
        auditId: null,
      }),
    ).rejects.toThrow(CustomFieldValuesInvalidError);

    const read = await readMemberCustomFields(tx, PARIWAR_A, toMemberId(member));
    expect(read?.values).toEqual({});
  });

  it('a REQUIRED field must be supplied non-null', async () => {
    const { client, tx } = getTx();
    const member = await seedMember(tx, PARIWAR_A);
    await enterAppScope(client, PARIWAR_A);
    await publish(tx, def({ required: true }));
    await expect(
      setMemberCustomFields(tx, {
        pariwarId: PARIWAR_A,
        memberId: toMemberId(member),
        values: {},
        auditId: null,
      }),
    ).rejects.toThrow(/required/i);
  });
});

describe.skipIf(!hasDatabase)('⚠ retirement: stored values READ, new values REFUSED (§1.7)', { timeout: 20000 }, () => {
  setupLiveDb();

  it('a retired field keeps its stored value readable but accepts no new one', async () => {
    // The deprecation window, made concrete. Filtering retired values out on READ would make a
    // retirement retroactively erase data a member supplied in good faith.
    const { client, tx } = getTx();
    const member = await seedMember(tx, PARIWAR_A);
    await enterAppScope(client, PARIWAR_A);
    await publish(tx, def());
    await setMemberCustomFields(tx, {
      pariwarId: PARIWAR_A,
      memberId: toMemberId(member),
      values: { school_block_code: 'BLK-14' },
      auditId: null,
    });

    await retireDefinition(tx, {
      pariwarId: PARIWAR_A,
      hostEntity: HOST,
      fieldKey: 'school_block_code',
      authoredByActor: null,
      actorDisplay: 'Integration Seed',
      auditId: null,
    });

    // READ: still there.
    const read = await readMemberCustomFields(tx, PARIWAR_A, toMemberId(member));
    expect(read?.values.school_block_code).toBe('BLK-14');

    // WRITE: refused — and refused as an UNKNOWN key, because a retired field is out of the
    // in-force set entirely as of now.
    await expect(
      setMemberCustomFields(tx, {
        pariwarId: PARIWAR_A,
        memberId: toMemberId(member),
        values: { school_block_code: 'BLK-15' },
        auditId: null,
      }),
    ).rejects.toThrow(CustomFieldValuesInvalidError);
  });
});

describe.skipIf(!hasDatabase)('per-type validation (AC2/AC6)', { timeout: 20000 }, () => {
  setupLiveDb();

  async function withField(
    tx: Parameters<typeof publishDefinitionVersion>[0],
    definition: CustomFieldDefinitionJson,
  ): Promise<void> {
    await publish(tx, definition);
  }

  it('accepts each of the seven types with a conforming value', async () => {
    const { client, tx } = getTx();
    const member = await seedMember(tx, PARIWAR_A);
    await enterAppScope(client, PARIWAR_A);

    await withField(tx, def({ field_key: 'f_string', label_en: 'S', label_hi: 'एस' }));
    await withField(tx, def({ field_key: 'f_int', label_en: 'I', label_hi: 'आई', field_type: 'integer', max_length: undefined }));
    await withField(tx, def({ field_key: 'f_dec', label_en: 'D', label_hi: 'डी', field_type: 'decimal', max_length: undefined }));
    await withField(tx, def({ field_key: 'f_bool', label_en: 'B', label_hi: 'बी', field_type: 'boolean', max_length: undefined }));
    await withField(tx, def({ field_key: 'f_date', label_en: 'Dt', label_hi: 'डीटी', field_type: 'date', max_length: undefined }));
    await withField(
      tx,
      def({ field_key: 'f_enum', label_en: 'E', label_hi: 'ई', field_type: 'enum', enum_values: ['a', 'b'], max_length: undefined }),
    );
    await withField(
      tx,
      def({ field_key: 'f_arr', label_en: 'A', label_hi: 'एए', field_type: 'string_array', max_items: 4 }),
    );

    const envelope = await setMemberCustomFields(tx, {
      pariwarId: PARIWAR_A,
      memberId: toMemberId(member),
      values: {
        f_string: 'text',
        f_int: 7,
        f_dec: 1.5,
        f_bool: true,
        f_date: '2026-08-06',
        f_enum: 'a',
        f_arr: ['x', 'y'],
      },
      auditId: null,
    });
    expect(Object.keys(envelope.values).sort()).toEqual([
      'f_arr',
      'f_bool',
      'f_date',
      'f_dec',
      'f_enum',
      'f_int',
      'f_string',
    ]);
  });

  it('⚠ rejects a calendar-INVALID date that the regex alone would accept', async () => {
    // `2026-02-31` matches YYYY-MM-DD. Stored, it would be read back as a shifted real date —
    // silently wrong rather than loudly refused.
    const { client, tx } = getTx();
    const member = await seedMember(tx, PARIWAR_A);
    await enterAppScope(client, PARIWAR_A);
    await withField(tx, def({ field_key: 'f_date', label_en: 'Dt', label_hi: 'डीटी', field_type: 'date', max_length: undefined }));
    await expect(
      setMemberCustomFields(tx, {
        pariwarId: PARIWAR_A,
        memberId: toMemberId(member),
        values: { f_date: '2026-02-31' },
        auditId: null,
      }),
    ).rejects.toThrow(/not a real calendar date/i);
  });

  it('rejects a value outside a declared enum, and one over max_length', async () => {
    const { client, tx } = getTx();
    const member = await seedMember(tx, PARIWAR_A);
    await enterAppScope(client, PARIWAR_A);
    await withField(
      tx,
      def({ field_key: 'f_enum', label_en: 'E', label_hi: 'ई', field_type: 'enum', enum_values: ['a'], max_length: undefined }),
    );
    await withField(tx, def({ field_key: 'f_short', label_en: 'S', label_hi: 'एस', max_length: 4 }));

    await expect(
      setMemberCustomFields(tx, {
        pariwarId: PARIWAR_A,
        memberId: toMemberId(member),
        values: { f_enum: 'z', f_short: 'ok' },
        auditId: null,
      }),
    ).rejects.toThrow(/must be one of/i);

    await expect(
      setMemberCustomFields(tx, {
        pariwarId: PARIWAR_A,
        memberId: toMemberId(member),
        values: { f_enum: 'a', f_short: 'far too long' },
        auditId: null,
      }),
    ).rejects.toThrow(/at most 4 characters/i);
  });

  it('an explicit null CLEARS an optional field (distinct from omitting the key)', async () => {
    const { client, tx } = getTx();
    const member = await seedMember(tx, PARIWAR_A);
    await enterAppScope(client, PARIWAR_A);
    await publish(tx, def());
    const envelope = await setMemberCustomFields(tx, {
      pariwarId: PARIWAR_A,
      memberId: toMemberId(member),
      values: { school_block_code: null },
      auditId: null,
    });
    expect(envelope.values.school_block_code).toBeNull();
  });
});

describe.skipIf(!hasDatabase)('the AC5 limit classes, on this story\'s write path', { timeout: 20000 }, () => {
  setupLiveDb();

  it('⚠ class 1 — a payload over CUSTOM_FIELDS_MAX_PAYLOAD_BYTES is refused', async () => {
    const { client, tx } = getTx();
    const member = await seedMember(tx, PARIWAR_A);
    await enterAppScope(client, PARIWAR_A);
    // Enough 512-char fields that their combined payload clears the 8 KiB ceiling.
    const fieldCount = 24;
    for (let i = 0; i < fieldCount; i += 1) {
      await publish(
        tx,
        def({ field_key: `big_${String(i)}`, label_en: `B${String(i)}`, label_hi: `बी${String(i)}`, max_length: 512 }),
      );
    }
    const values: Record<string, unknown> = {};
    for (let i = 0; i < fieldCount; i += 1) values[`big_${String(i)}`] = 'x'.repeat(512);

    await expect(
      setMemberCustomFields(tx, {
        pariwarId: PARIWAR_A,
        memberId: toMemberId(member),
        values,
        auditId: null,
      }),
    ).rejects.toThrow(CustomFieldPayloadTooLargeError);
    // The ceiling is a real number, not a symbol — the test would be vacuous if it were huge.
    expect(CUSTOM_FIELDS_MAX_PAYLOAD_BYTES).toBe(8192);
  });

  it('⚠ class 2 — the flat vocabulary keeps depth within CUSTOM_FIELDS_MAX_NESTING_DEPTH', async () => {
    // A nested object cannot pass per-type validation at all, so the depth limit is reached only via
    // a value the vocabulary does not permit — which is the point: the depth bound and the flat
    // vocabulary enforce the same narrowing from two directions.
    const { client, tx } = getTx();
    const member = await seedMember(tx, PARIWAR_A);
    await enterAppScope(client, PARIWAR_A);
    await publish(tx, def());
    await expect(
      setMemberCustomFields(tx, {
        pariwarId: PARIWAR_A,
        memberId: toMemberId(member),
        values: { school_block_code: { nested: { deeper: 1 } } },
        auditId: null,
      }),
    ).rejects.toThrow(CustomFieldValuesInvalidError);
  });

  it('⚠ class 2 — the depth bound is a BACKSTOP that per-type validation currently SHADOWS', async () => {
    // Stated honestly rather than faked. With the v1 flat vocabulary, any payload deep enough to
    // trip `CUSTOM_FIELDS_MAX_NESTING_DEPTH` also fails its per-type check first — so the depth
    // THROW is not reachable through `validateCustomFieldValues` today, and a test that claimed
    // otherwise would be asserting a path that does not exist.
    //
    // The bound is still real and still worth keeping: it is what will catch the first payload the
    // vocabulary widens to permit (§1.7 allows "small bounded objects"; v1 narrows to flat). So the
    // MEASUREMENT is tested directly, and the legal depth-3 case is pinned so a future change to
    // `jsonDepth` or to the limit cannot silently make every string_array write illegal — which is
    // exactly the off-by-one the seven-types test above caught.
    const { jsonDepth, CUSTOM_FIELDS_MAX_NESTING_DEPTH } = await import(
      '../../../src/custom-fields/limits.js'
    );
    // envelope → values → array → element: the deepest LEGAL shape, at exactly the ceiling.
    expect(jsonDepth({ values: { f_arr: ['x'] } })).toBe(CUSTOM_FIELDS_MAX_NESTING_DEPTH);
    // One level more — the first shape a widened vocabulary would admit — is over it.
    expect(jsonDepth({ values: { f_obj: { a: 1 } , f_arr: [['x']] } })).toBeGreaterThan(
      CUSTOM_FIELDS_MAX_NESTING_DEPTH,
    );
  });

  it('⚠ class 4 — the cardinality ceiling is a real, small number', async () => {
    expect(CUSTOM_FIELD_DEFINITIONS_MAX_PER_PARIWAR).toBe(32);
  });

  it('⚠ class 3 — the GIN budget is an OBSERVED reading, not a write-time check', async () => {
    // §1.7's "write-rate limit when approached" is NOT built (ESCALATION 3). What ships is this
    // signal, so an operator can see the index growing before it becomes a problem.
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const reading = await ginIndexBytes(tx);
    expect(reading.indexName).toBe('members_custom_fields_gin_idx');
    // The index exists (migration 0096) — a zero here would mean `to_regclass` found nothing.
    expect(reading.bytes).toBeGreaterThan(0);
    expect(reading.overBudget).toBe(false);
  });
});
