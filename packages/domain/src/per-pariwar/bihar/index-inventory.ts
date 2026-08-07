// Bihar per-Pariwar custom-field INDEX INVENTORY — Story 10.12 (Task 3; AC2, story D5).
//
// Architecture §1.7 places this here verbatim: "Index inventory + per-Pariwar policy lives in
// `packages/domain/`", and "Functional B-tree indexes on specific JSON paths declared per-Pariwar
// when a query pattern is identified" / "Custom-field migrations are first-class drizzle-kit
// migrations, scoped to a single `pariwar_id`".
//
// ── ⭐ WHY THIS FILE EXISTS AT ALL: `indexed: true` IS A REQUEST, NEVER AN ACTION (story D5) ────────
// The most dangerous shape this story could have taken is one where a tenant admin's form submission
// causes DDL. It would hand a tenant, in a single click:
//   · a lock on `members`, one of the hottest tables in the system;
//   · an unbounded index-growth vector on a shared database;
//   · a bypass of migration history — an index that exists in production and in no migration file.
//
// So `indexed: true` on a definition RECORDS that a query pattern was identified. A human then reads
// this inventory, authors a functional B-tree index as a drizzle-kit migration scoped to the one
// `pariwar_id`, and adds the entry below. A tenant admin issues no DDL, ever.
//
// ── THE AUTHORING PROCEDURE ────────────────────────────────────────────────────────────────────────
//   1. A definition is published with `indexed: true` (or an operator reports a slow query).
//   2. Confirm the access pattern is real — a repeated equality/range read on ONE JSON path, not an
//      exploratory filter. The `members_custom_fields_gin_idx` (migration 0096) already serves
//      arbitrary containment and existence queries; a functional B-tree is for a path hot enough to
//      justify its own write cost, and adding one that duplicates the GIN's coverage is pure loss.
//   3. Author a migration:
//        CREATE INDEX CONCURRENTLY "members_cf_<pariwar>_<field_key>_idx"
//          ON members ((custom_fields -> 'values' ->> '<field_key>'))
//          WHERE pariwar_id = '<uuid>'::uuid;
//      ⚠ The partial `WHERE pariwar_id = …` is what makes it per-Pariwar rather than a global index
//      paid for by every tenant — §1.7's "scoped to a single pariwar_id" is a real scoping clause,
//      not a naming convention. `members` is named in §1.8's online-migration rule, so CONCURRENTLY.
//   4. Add the entry below, naming the migration and the query that justified it.
//
// ── EMPTY AT v1, AND THAT IS THE CORRECT STATE ─────────────────────────────────────────────────────
// No Bihar custom field exists yet, so no access pattern has been observed. An inventory pre-populated
// with speculative indexes would be worse than an empty one: every index is a write-time cost paid
// forever against a read that may never happen. The list grows from evidence.

/** One human-authored functional index on a custom-field JSON path, scoped to one Pariwar. */
export interface CustomFieldIndexEntry {
  /** The Pariwar the index is partial on. */
  pariwarId: string;
  /** The host entity whose table carries the index. `'member'` in v1. */
  hostEntity: string;
  /** The `field_key` whose JSON path is indexed. */
  fieldKey: string;
  /** The index name as created. */
  indexName: string;
  /** The migration that created it — the provenance link §1.8 requires. */
  migration: string;
  /** The observed query pattern that justified paying for it. Not "it seemed useful". */
  justification: string;
}

/**
 * Bihar's functional custom-field indexes. EMPTY at v1 — see the header.
 *
 * ⚠ Adding an entry here does NOT create an index. The migration does. This list is the record of
 * what exists, and its value is entirely in staying true: an entry with no migration behind it is a
 * claim that an index exists when it does not, which is how a query plan regression becomes a mystery.
 */
export const BIHAR_CUSTOM_FIELD_INDEXES: readonly CustomFieldIndexEntry[] = Object.freeze([]);
