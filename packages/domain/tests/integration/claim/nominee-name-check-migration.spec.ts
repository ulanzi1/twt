// Migrations 0116–0118 (Story 6.18) — the SCHEMA assertions, made DIRECTLY against the catalog.
//
// ⚠⚠ WHY THIS FILE EXISTS. Story 6.18 adds ⛔ no new table, so the family-5 shapes (RLS, FK,
// partial-unique) are unchanged and there is nothing new to assert there. What it DOES add is a
// column and two enum labels — and ⛔ nothing asserted either. They were exercised ⛔ only
// IMPLICITLY, by return-loop inserts that happen to use them: a migration that had ⛔ never run
// would fail those specs with a confusing runtime error about a column, ⛔ not with "the migration
// is missing".
//
// ⭐ FAMILY 5's RULE IN ONE LINE: assert the CONSTRAINT DIRECTLY, ⛔ never only inferred through a
// higher-level accessor. An inference tells you a code path worked today; the catalog tells you the
// SHAPE the data is held in, which is what survives every later story.
//
// ⚠ AND THE PARTICULAR RISK HERE IS ENUM LABELS. Postgres enum values ⛔ cannot be removed, and a
// label added in the WRONG migration — or added to the wrong type — produces a database that looks
// fine until the one code path that writes it runs. `correction_return` and
// `returned_for_correction` are written ⛔ only on the Pariwar Admin's return, which is the least
// travelled path in the story and the one a bereaved family is waiting on.
//
// Live DB only.

import { describe, expect, it } from 'vitest';

import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';

describe.skipIf(!hasDatabase)('Story 6.18 — migrations 0116–0118, asserted against the catalog', () => {
  setupLiveDb();

  it('⭐ 0116 — `claim_nominee_bank_accounts.name_difference_note_ciphertext` exists, TEXT and NULLABLE', async () => {
    const { client } = getTx();
    const r = await client.query<{ data_type: string; is_nullable: string }>(
      `SELECT data_type, is_nullable
         FROM information_schema.columns
        WHERE table_name = 'claim_nominee_bank_accounts'
          AND column_name = 'name_difference_note_ciphertext'`,
    );
    expect(r.rows, 'the 0116 column is missing — the migration did not run').toHaveLength(1);
    expect(r.rows[0]!.data_type).toBe('text');
    // ⭐ NULLABLE IS THE RULING, ⛔ not an oversight: `-226` cl.2 PERMITS a note, it does ⛔ not
    // oblige one. A NOT NULL column here would have forced every filer to explain a difference
    // they may not have — turning an optional courtesy into a required field on a death claim.
    expect(r.rows[0]!.is_nullable, 'the note column is NOT NULL — `-226` cl.2 makes it optional').toBe('YES');
  });

  it('⭐ 0117/0118 — both enum labels exist, on the RIGHT enum types', async () => {
    const { client } = getTx();
    const r = await client.query<{ typname: string; enumlabel: string }>(
      `SELECT t.typname, e.enumlabel
         FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
        WHERE e.enumlabel IN ('correction_return', 'returned_for_correction')
        ORDER BY e.enumlabel`,
    );
    const labels = r.rows.map((x) => x.enumlabel);
    // ⚠ BOTH, and they are DIFFERENT concepts on DIFFERENT types: `correction_return` is the
    // decision PHASE (which kind of row this is) and `returned_for_correction` is the OUTCOME
    // (what was decided). Adding one without the other leaves the return half-writable — the row
    // is created and its verdict ⛔ cannot be recorded, or the reverse.
    expect(labels, 'a 6.18 enum label is missing — 0117/0118 did not run').toEqual([
      'correction_return',
      'returned_for_correction',
    ]);
    // ⭐ Named types, ⛔ not just "some enum somewhere": a label on the wrong type is a database
    // that passes a label-existence check and fails at the one write that uses it.
    // ⚠ EXACT type names, ⛔ not `.toContain('phase')`/`.toContain('outcome')` (code review
    // 2026-09-22) — a substring match would also pass for a future, unrelated type that merely
    // CONTAINS "phase" or "outcome" in its name, which is precisely the "label on the wrong type"
    // bug this assertion exists to catch.
    const byLabel = new Map(r.rows.map((x) => [x.enumlabel, x.typname]));
    expect(byLabel.get('correction_return')).toBe('state_trustee_decision_phase');
    expect(byLabel.get('returned_for_correction')).toBe('state_trustee_decision_outcome');
  });

  it('⛔ NON-VACUITY — the catalog queries really do discriminate', async () => {
    // ⚠ Both assertions above are "this row exists". If the queries were malformed — a typo'd
    // table name, a filter that matches everything — they could pass for reasons unrelated to the
    // migrations. ⭐ So: a column that does ⛔ NOT exist must come back empty, and an enum label
    // that does ⛔ not exist must too.
    const { client } = getTx();
    const noColumn = await client.query(
      `SELECT 1 FROM information_schema.columns
        WHERE table_name = 'claim_nominee_bank_accounts' AND column_name = 'not_a_real_column_6_18'`,
    );
    expect(noColumn.rows).toHaveLength(0);

    const noLabel = await client.query(
      `SELECT 1 FROM pg_enum WHERE enumlabel = 'not_a_real_label_6_18'`,
    );
    expect(noLabel.rows).toHaveLength(0);
  });
});
