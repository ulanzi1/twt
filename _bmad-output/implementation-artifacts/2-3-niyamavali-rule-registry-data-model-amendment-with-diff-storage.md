# Story 2.3: Niyamavali Rule Registry Data Model + Amendment-with-Diff Storage `[PRIMITIVE]`

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Solo Builder authoring the Niyamavali registry foundation,
I want a versioned per-Pariwar rule registry data model with **stable human-readable clause identifiers** and amendment-with-diff storage,
so that downstream rule references (Epic 4 engine, Epic 6 claim evaluation, member-facing surfaces, audit logs, regulator queries) resolve to stable clause IDs that survive amendment / version history cleanly.

> **Seam discipline (architectural-freeze row 14 — read first).** This story owns the **registry _shape_** only: `pariwar_id`, version, effective date, structured `payload`, the amendment + diff + lineage workflow, audit-logged. It does **NOT** own the rule-evaluation engine that interprets `payload` — that is **Epic 4** (FR-8..FR-12A Member Validity Service). The `payload` JSONB is **opaque** here: you store it, diff it structurally, and resolve it by id — you never interpret a rule. *Engine logic leaking into this registry, or the registry shape forking per evaluation path, is a freeze violation* (epics.md L531, L1389). [Source: epics.md#Epic-2 L1389-1395; architecture freeze-table row 14]

## Acceptance Criteria

> Verbatim from epics.md L1448-1472 (Story 2.3), re-numbered for traceability. AC8 is the **binding create-story obligation** from Decision 2026-06-20-055 (not in the epic body — added per the retro AI-7 gate; see Dev Notes §"Binding obligations").

**AC1 — Registry table column shape.**
Given FR-7 + AR-46 + freeze row 12 (`benefit_mechanism` enum required per Story 1.16d CI gate) + freeze row 14 (shape-vs-engine seam), when the Niyamavali registry data model is authored, then the **`clause_versions`** table carries: `clause_version_id` (UUID, primary key per row), `clause_id` (stable human-readable identifier — format in AC2), `pariwar_id`, `version` (monotonically increasing integer starting at 1 per `clause_id`), `effective_date`, `payload` (JSONB structured rule content), `benefit_mechanism` (enum `pool | reserve`, NOT NULL, enforced by Story 1.16d CI gate), `predecessor_clause_ids` (`text[]` — tracks splits / merges), `superseded_by_version` (nullable FK to the next version of the same `clause_id`), `deprecated_at` (nullable timestamp), `authored_by_actor`, `authored_at`, `audit_id` (FK to a Story 1.10 audit line).

> ⚠ **The table MUST be named `clause_versions`** — `benefit-mechanism.yaml` `rule_sources.tables: [clause_versions]` (set day-one at Story 1.16d) is what the repo-global gate's check (c) looks for by exact name. A different table name silently keeps check (c) a no-op and breaks AC8. [Source: benefit-mechanism.yaml L44; scripts/benefit-mechanism/lib.ts `scanRuleTableColumns` L345-362]

**AC2 — `clause_id` format.**
The `clause_id` format is `niy.<section-slug>.<clause-slug>[.<subclause-slug>]` — lowercase kebab-with-dots; e.g. `niy.contribution-discipline.r7-a` (R7(A) restoration rule), `niy.ninety-percent-rule.r8` (R8), `niy.special-death.r9-suicide-murder` (R9 + Mar 2025 rule).

**AC3 — `clause_id` allocation + immutability.**
`clause_id` is **allocated by the trustee at clause-create time** (not auto-generated); validated for format + uniqueness per Pariwar; **immutable once assigned — never changes through amendment, deprecation, or version increment**. Allocation conflicts (attempted reuse or collision) are rejected with a **409** (the domain layer raises a typed conflict error; the HTTP 409 mapping lands at the Story 2.4 route — see Dev Notes §"409 ownership").

**AC4 — Amendment inserts a new version + diff record.**
Given a clause is amended, when the amendment is persisted, then a new `clause_versions` row is inserted with the **same `clause_id`**, **incremented `version`**, new `payload`, fresh `clause_version_id`, populated `predecessor_clause_ids` (the prior version's id), and the prior row's `superseded_by_version` is updated to point at the new row. **And** the amendment diff (structured-payload diff between prior and new versions) is persisted as a separate **`niyamavali_amendments`** row linking `from_clause_version_id` → `to_clause_version_id` with a JSONB `diff_document`.

**AC5 — Split / merge lineage is bidirectionally queryable.**
Given a clause is split (one-to-many) or merged (many-to-one), when the new clause(s) are persisted, then `predecessor_clause_ids[]` carries one or more prior references; the lineage chain is queryable **forward** (which clauses descend from this one?) and **backward** (which clauses did this one originate from?) — the canonical "where did this rule come from?" query for audit + regulator review.

**AC6 — Deprecation preserves resolvability; `clause_id` never reused.**
Given a clause is deprecated (replaced by another `clause_id` or retired without successor), when deprecation is persisted, then `deprecated_at` is set on the latest version row; the `clause_id` is **NEVER reused** for a different clause; downstream references to the deprecated `clause_id` continue to resolve correctly (audit history preserved).

**AC7 — Dual resolution: by `clause_id` (current) and by `clause_version_id` (historical).**
Given a downstream consumer references a clause, when the reference is resolved, then the consumer must specify **EITHER** `clause_id` (resolves to the latest non-deprecated version **effective at resolution time** — "current rule") **OR** `clause_version_id` (resolves to that exact historical version, immutable — "rule as it was on date X"). Both query patterns are **first-class**.

**AC8 — Binding: confirm `benefit-mechanism` gate teeth flip (Decision 2026-06-20-055, item 2).**
The story must confirm that `benefit-mechanism` **check (a)** (rule-record tag scan) and **check (c)** (rule-table schema-column) flip from no-op to **enforcing**: real rule records exist → tag scan bites; the `clause_versions` table exists in the drizzle snapshot with a `benefit_mechanism` column → schema-column check bites. **Confirm a green re-run of `pnpm benefit:check` with real records** (every seeded/fixture record carries `benefit_mechanism: 'pool'`; `reserve` tags zero v1 rules). Then flip the `gate-inventory.md` Category C re-trigger rows for 2.3 out of the "forward-compat" column. [Source: .decision-log.md Decision 2026-06-20-055 item 2 + open follow-up; gate-inventory.md L47-48, L67-68; deferred-work.md L1306 CR-D0-AI39]

## Tasks / Subtasks

- [x] **Task 1 — Branded IDs for the registry (AC1, AC2, AC7).** `packages/domain/src/ids/index.ts`
  - [x] Add `ClauseVersionId = Brand<'ClauseVersionId'>` + `clauseVersionId` smart constructor via the existing `uuidBrand('ClauseVersionId')` (it IS a UUID).
  - [x] Add `ClauseId = Brand<'ClauseId'>` — **NOT a UUID**; it is the `niy.<section>.<clause>[.<subclause>]` slug. Write a **new format-validating** smart constructor `clauseId(value)` with the AC2 regex (do NOT reuse `uuidBrand`); throw a typed error (mirror `InvalidBrandedIdError`) on malformed input. Branding is mandatory on a new ID's first PR (architecture §Naming L3700-3708). [Source: packages/domain/src/ids/index.ts]
  - [x] Export both from the barrel; do not lowercase the slug beyond what the regex permits (it is already lowercase-only).

- [x] **Task 2 — `clause_versions` Drizzle schema (AC1, AC2, AC3, AC4, AC6).** `packages/domain/src/schema/clause_versions.ts`
  - [x] Table named exactly `clause_versions` (snake_case-plural; matches `benefit-mechanism.yaml`). Columns per AC1, snake_case DB / camelCase TS / snake_case JSONB keys (architecture L3663-3677).
  - [x] `clauseVersionId` `uuid('clause_version_id').defaultRandom().primaryKey()` `.$type<ClauseVersionId>()` (events_log/audit precedent).
  - [x] `clauseId` `text('clause_id').notNull()` `.$type<ClauseId>()` (slug, not uuid).
  - [x] `pariwarId` `uuid('pariwar_id').$type<PariwarId>().notNull()` (tenant key + RLS predicate column — Task 4).
  - [x] `version` `integer('version').notNull()` + `check('clause_versions_version_positive', sql\`version >= 1\`)`.
  - [x] `effectiveDate` — **`timestamp('effective_date', { withTimezone: true }).notNull()`** (DB-authoritative time §1.11). `date` is rejected: the AC7 comparison `effective_date <= resolution_timestamp` would require an implicit timezone cast, and a rule's effective instant is a business point-in-time, not a calendar date. Use `timestamptz`; document this choice in ADR-0020 (see Task 11). [Source: architecture §1.11 L1081-1099]
  - [x] `payload` `jsonb('payload').notNull()` (opaque structured content — do NOT type it as an evaluated rule; a permissive `$type` interface keyed snake_case is fine).
  - [x] `benefitMechanism` — model as `pgEnum('benefit_mechanism', ['pool','reserve'])` column, `.notNull()`. Keep the enum width in lockstep with the `@twt/contracts` `BenefitMechanism` z.enum (import the values or assert equality in a unit test so the two can't drift). [Source: packages/contracts/src/rules/benefit-mechanism.ts; architecture §1.13 Hook 1 L1133-1147]
  - [x] `predecessorClauseIds` `text('predecessor_clause_ids').array().notNull().default([])` (carries one→many / many→one lineage — AC5).
  - [x] `supersededByVersion` `uuid('superseded_by_version').$type<ClauseVersionId>()` nullable, self-FK `references(() => clauseVersions.clauseVersionId)`.
  - [x] `deprecatedAt` `timestamp('deprecated_at', { withTimezone: true })` nullable.
  - [x] `authoredByActor` `uuid('authored_by_actor')` nullable (NULL = system / SIE — events_log.actor_id precedent, architecture §1.14).
  - [x] `authoredAt` `timestamp('authored_at', { withTimezone: true }).notNull().defaultNow()` (DB-authoritative time §1.11).
  - [x] `auditId` `uuid('audit_id').references(() => auditLogEntries.auditId)` — FK to Story 1.10 audit line. **Nullable at 2.3** (BigDev-decided): domain-direct creates + the structurally-real seed land before the 2.4 audited route exists, so the column is nullable here. The **NOT-NULL invariant is enforced on the Story 2.4 write path** ("audit-or-throw": the 2.4 publish path always writes an audit line and sets `audit_id` — no published clause without an audit line). Document this 2.3-nullable → 2.4-enforced contract inline + in the ADR so 2.4 picks it up.
  - [x] Indexes: `unique (pariwar_id, clause_id, version)` (structural guard that a (clause_id, version) pair is allocated once per Pariwar); `index (pariwar_id, clause_id, version DESC)` for AC7 "latest version" resolution; `index (pariwar_id, effective_date)` for effective-date filtering.
  - [x] Export `$inferSelect` / `$inferInsert` row types (pariwar_passport precedent).

- [x] **Task 3 — `niyamavali_amendments` Drizzle schema (AC4, + architecture §1.10 scope — see Dev Notes).** `packages/domain/src/schema/niyamavali_amendments.ts`
  - [x] `amendmentId` uuid PK defaultRandom; `pariwarId` (tenant key for RLS); `fromClauseVersionId` + `toClauseVersionId` FKs → `clause_versions.clause_version_id`; `diffDocument` `jsonb('diff_document').notNull()`; `createdAt` timestamptz defaultNow; `auditId` FK → audit line.
  - [x] **REQUIRED — `affectedMemberScope` (NOT NULL)** per architecture §1.10 L1053-1056 — "Every Niyamavali amendment declares its affected-member scope as part of the amendment record … Amendments cannot be committed without a scope declaration." (BigDev-decided at create-story: include it now.) Model as `jsonb('affected_member_scope').notNull()` holding a **scope declaration** — a discriminated shape `{ kind: 'all_members' } | { kind: 'past_lockin' } | { kind: 'rule_subclause', clause_id, subclause } | { kind: 'named_cohort', definition }` (architecture's examples: `all_members | past_lockin | r7_subclause_C_active | <named cohort>`). 2.3 **stores the declaration only** — the *interpretation* (which member ids the scope resolves to + the cache-invalidation fan-out) is **Epic 4 / FR-12A** (seam-clean). Add a Zod schema for the declaration in `packages/contracts/src/rules/clause.ts` (Task 7) and validate on the amend/write path so an amendment cannot be persisted without a well-formed scope. [Source: architecture §1.10 L1053-1066]
  - [x] Amendment rows are **immutable** (append-only diff records) — install BEFORE UPDATE/DELETE/TRUNCATE triggers that RAISE (events_log migration 0001 precedent), hand-supplemented into the migration.

- [x] **Task 4 — RLS policies: tenant-isolated read + write (AC1; Story 1.6 leak invariant).** `packages/domain/src/policies/clause-versions-rls.ts` + `niyamavali-amendments-rls.ts`
  - [x] Mirror **`events-log-rls.ts`** (tenant-isolated SELECT + write), **NOT** `pariwar-passport-rls.ts` (cross-readable). Rationale + the public-render caveat in Dev Notes §"RLS posture". Use the exact fail-closed construct `pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`, `to appRole`. [Source: packages/domain/src/policies/events-log-rls.ts]
  - [x] Both policy globs are picked up by `drizzle.config.ts` `schema: ['./src/schema/*.ts', './src/policies/*-rls.ts']` — `db:generate` emits the CREATE POLICY DDL.

- [x] **Task 5 — Generate + hand-supplement the migration (AC1, AC3, AC4).** `packages/domain/migrations/`
  - [x] `pnpm db:generate` → emits the next migration (index `0014`) capturing CREATE TYPE (`benefit_mechanism`), CREATE TABLE ×2, CREATE POLICY ×N. Inspect the SQL before committing.
  - [x] Hand-supplement the `niyamavali_amendments` append-only triggers (Task 3) into the generated `.sql` (events_log 0001 precedent).
  - [x] ⚠ **Never regenerate an applied migration** — drizzle skips by journal `when`, not SQL hash → silent `42P07`. Generate ONCE; if the shape is wrong, edit the just-generated file before it is applied, or add a new forward migration. Commit `meta/_journal.json` + the `*_snapshot.json`. [Source: [[project_live_db_test_gotchas]]]
  - [x] `pnpm db:check` (drizzle-kit check — no DB needed) must be clean.

- [x] **Task 6 — Domain accessors (AC3, AC4, AC5, AC6, AC7).** `packages/domain/src/niyamavali/` (mirror the `pariwar-passport/` read.ts / write.ts / index.ts module shape)
  - [x] `createClause(db, …)` — validate `clause_id` format + per-Pariwar uniqueness; raise a typed `ClauseIdConflictError` (the 409 seam) if the `clause_id` already exists for the Pariwar; insert `version = 1`, empty `predecessor_clause_ids`. [Source: AC3]
  - [x] `amendClause(db, …)` — insert new version (same `clause_id`, `version + 1`, predecessor = prior `clause_version_id`), update prior `superseded_by_version`, insert the `niyamavali_amendments` diff row. Do this in a single transaction. [Source: AC4]
  - [x] `splitClause` / `mergeClauses` — populate `predecessor_clause_ids[]` one→many / many→one; expose `lineageForward(clauseId)` + `lineageBackward(clauseId)`. [Source: AC5]
  - [x] `deprecateClause(db, …)` — set `deprecated_at` on the latest version; never reuse `clause_id`. [Source: AC6]
  - [x] `resolveByClauseId(db, clauseId, asOf?)` — latest **non-deprecated** version with `effective_date <= asOf` (default now()) → "current rule". `resolveByClauseVersionId(db, id)` → exact immutable row. Both first-class. [Source: AC7]
  - [x] `computePayloadDiff(prev, next)` — structured (key-path) JSONB diff → the `diff_document` shape. Use `import { canonicalJsonStringify } from '@twt/domain'` (`packages/domain/src/canonical-json.ts:35`, re-exported from domain index — moved from `packages/events` per DD-1) for deterministic key ordering before diff. Pure + unit-tested.
  - [x] **Immutability guard (domain-level):** never UPDATE `payload` / `clause_id` / `version` on an existing row — only `superseded_by_version` + `deprecated_at` are mutable. Do NOT install a block-all-UPDATE trigger on `clause_versions` (unlike `events_log`, it has two legitimately-mutable columns). A column-restricted Postgres trigger guarding `payload`/`clause_id`/`version` against UPDATE is **deferred to Story 2.4** (when the audited write path is established and exercised under live conditions) — see Task 12 / deferred-work.md. Enforce at domain layer only for 2.3.

- [x] **Task 7 — Transport contracts (AC2, AC7; no OpenAPI perturbation).** `packages/contracts/src/rules/clause.ts` + barrel
  - [x] Zod schemas: `ClauseIdSchema` (the AC2 regex), the clause/version DTO, the amendment/diff DTO, resolution-query discriminated union (`{ clauseId }` XOR `{ clauseVersionId }` — AC7). Import `BenefitMechanism` from `./benefit-mechanism.js` (do NOT re-declare the enum). [Source: packages/contracts/src/rules/benefit-mechanism.ts]
  - [x] Keep them **plain `z.*`** (no `.openapi()`) — 2.3 adds no endpoint (that is 2.4). `openapi/v1.yaml` must stay byte-identical; run `pnpm contracts:check-openapi-determinism`. [Source: rules/benefit-mechanism.ts header; Story 1.16b precedent]
  - [x] Add the type-assignability defense (the contracts package is the source of truth; no hand-written `*.types.ts` shadowing the domain row — Top-10 anti-pattern #2). Export via `packages/contracts/src/rules/index.ts`.

- [x] **Task 8 — Seed real rule records + give `benefit-mechanism` check (a) teeth (AC8).**
  - [x] Seed a **small structurally-real** set (BigDev-decided: small, not the full canonical body) — ~2-3 canonical clauses (e.g. `niy.contribution-discipline.r7-a`, `niy.ninety-percent-rule.r8`, `niy.special-death.r9-suicide-murder`) as `clause_versions` rows tagged `benefit_mechanism: 'pool'`, with valid `clause_id`s (AC2). Enough to (i) exercise create/amend/diff/lineage end-to-end in tests and (ii) give check (a) teeth. The seeded **content is provisional/structural** — final legally-reviewed Niyamavali copy lands via Story 0.13 (external dependency; does **not** gate Epic 2). **Use `packages/domain/seed/niyamavali-v1-clauses.sql`** (SQL `INSERT` file, not a migration INSERT): the `.sql` extractor (`extractFromSqlInserts`) picks it up via a `seed_globs` entry with no code change, and the seed file stays separate from the schema migration for readability. [Source: AC8; deferred-work.md L78; benefit-mechanism.yaml `extractFromSqlInserts` extractor]
  - [x] **Populate `benefit-mechanism.yaml` `rule_sources.seed_globs` / `fixture_globs`** to point at the seed/fixtures so check (a) acquires teeth (no gate code change required — data-driven). [Source: benefit-mechanism.yaml L45-46; deferred-work.md L74]
  - [x] Wire Epic-2's seed-loader / registry tests to call the **importable** `validateRuleRecords()` from `scripts/benefit-mechanism/lib.ts` (the documented seam). [Source: scripts/benefit-mechanism/README.md L40-43]

- [x] **Task 9 — Tests (all ACs).**
  - [x] **Unit** (`packages/domain/tests/niyamavali/…`, no DB): `clause_id` format validation (valid + each malformed shape); `computePayloadDiff` determinism; version-increment + predecessor wiring; lineage forward/backward; resolution-by-clause-id (effective-date + non-deprecated) vs by-clause-version-id (exact); benefit_mechanism enum ↔ contracts equality.
  - [x] **Integration / live-DB** (`packages/domain/tests/integration/rls/clause-versions-policy-regression.spec.ts` + an amendments spec, mirror `events-log` / `role-grants` regression specs): RLS isolation (tenant A cannot read/write tenant B's clauses; unset scope → 0 rows); per-Pariwar `clause_id` uniqueness → conflict; `niyamavali_amendments` append-only triggers reject UPDATE/DELETE; FK integrity; amendment transaction (new version + diff row + prior `superseded_by_version`). Use `SET LOCAL ROLE twt_app` + `setPariwarScope` per the helper; afterEach ROLLBACK. [Source: packages/domain/tests/integration/_helpers.ts; [[project_live_db_test_gotchas]]]
  - [x] Extend the **cross-pariwar leak** suite so `clause_versions` + `niyamavali_amendments` are asserted to fail closed to 0 rows cross-tenant (every scoped table — the Story 1.6 leak invariant; the passport remains the only positive exception). [Source: tests/integration/multi-tenant/cross-pariwar-leak.spec.ts]

- [x] **Task 10 — Gate confirmation + ledger (AC8; Decision 055 follow-up).**
  - [x] `pnpm benefit:test` + `pnpm benefit:check` → green **with real records** (check (a) tag scan + check (c) schema-column both enforcing; every record `pool`; zero `reserve`). Capture the output in Completion Notes.
  - [x] `pnpm schema:check` / `pnpm schema:test` — confirm the new tables read as a **greenfield introduction**, not a v1-baseline column add (Hook 2 non-add only forbids `payout_destination*` artifacts; `clause_versions` is fine). [Source: architecture §1.13 Hook 2 L1149-1163]
  - [x] Flip the `gate-inventory.md` **Category B** rows for Story 2.3 (benefit-mechanism check (a) L47 + check (c) L48) from "no-op / forward-compat" → "enforcing". [Source: gate-inventory.md L47-48; Decision 055 follow-up]
  - [x] Flip `gate-inventory.md` **Category C** row L67 (`schema-diff` + `benefit-mechanism` full teeth at rule-registry) to "done/enforcing" — `clause_versions` table + real records now exist. [Source: gate-inventory.md L67]
  - [x] **Category C row L68** (TS-literal seed extractor): the seed lands as `.sql` (not `.ts`) — the SQL extractor already covers it. Update row L68 to "closed — seed is `.sql`; `extractFromSqlInserts` covers it; no TS-literal extractor needed at 2.3." [Source: gate-inventory.md L68; deferred-work.md L78]
  - [x] `pnpm ci:local` (mirrors all 14 ci.yml jobs) green as the merge gate; integration needs `DATABASE_URL` on `:5433`. [Source: [[project_ci_actions_suspension_local_mirror]]]
  - [x] Sprint-status ledger: flip `development_status[2-3-…]`; add the reverse-chron `last_updated` COMMENT entry; cite which AI-N items the story advances (AI-7). [Source: [[project_sprint_status_ledger]]; Decision 2026-06-20-053 item 3]

- [x] **Task 11 — Author ADR-0020 + update `adr-index.md` (architecture §1.11 compliance; governance).**
  - [x] Author `docs/adr/ADR-0020-niyamavali-registry-data-model.md` capturing the four decisions made at Story 2.3 that architecture §1.11 requires to be "committed in an ADR":
    1. **`effectiveDate` type** — `timestamptz` (not `date`); rationale: AC7 point-in-time comparison, §1.11 DB-authoritative time (see Task 2).
    2. **`audit_id` nullable-at-2.3 → NOT-NULL-at-2.4** — domain-direct creates + structural seed predate the 2.4 audited route; the 2.4 write path owns the "audit-or-throw" enforcement (see Task 2).
    3. **`affected_member_scope` NOT NULL on `niyamavali_amendments`** — architecture §1.10 L1053: "Amendments cannot be committed without a scope declaration"; 2.3 stores + validates the declaration; Epic 4 resolves to member ids + invalidation (seam-clean) (see Task 3).
    4. **RLS posture: tenant-isolated (events_log mirror), NOT cross-readable** — public render (2.5) reads with `app.pariwar_id` set; `pariwar_passport` cross-readable carve-out stays the single positive exception in the Story 1.6 leak invariant (see Task 4 / Dev Notes).
  - [x] Add slot to `docs/knowledge-transfer/adr-index.md` (append after ADR-0019 row; use `drafted` status; update counts: drafted N→N+1, Total N→N+1, Section A N→N+1). Mirror the ADR-0019 row format. [Source: docs/knowledge-transfer/adr-index.md ADR-0019 row]

- [x] **Task 12 — `deferred-work.md` Story 2.3 section + close re-triggered items.**
  - [x] **Close L78** (TS-literal seed extractor deferral): seed lands as `packages/domain/seed/niyamavali-v1-clauses.sql` — `extractFromSqlInserts` covers it. Close: "Closed by [edit] — seed is `.sql`; no TS-literal extractor needed at 2.3."
  - [x] **Address L96** (`collectMigrationSql` scans all migrations; performance): `clause_versions` migration now exists. Log a forward-deferred fix: "Carry forward — filter `collectMigrationSql` to table-name-mentioned files (post-Epic-2 O(N) scan). Re-trigger: end of Epic 2 or when CI scan time regresses. Not a correctness issue."
  - [x] **Address L98** (`extractFromJsonSeed` may extract non-rule sibling objects): seed is `.sql` not `.json` — the JSON extractor path is not exercised at 2.3. Log: "Carry forward — scoping fix needed if/when a JSON seed file is introduced. Re-trigger: first story landing a multi-type `.json` seed. Not triggered at 2.3."
  - [x] **Address L101** (SQL NULL misleading finding message): If none of the seed INSERTs use `NULL` for `benefit_mechanism`, this path is not triggered. Confirm and log: "Carry forward — fix needed when NULL is first encountered in a migration. Confirmed: 2.3 seed uses explicit `'pool'` literals; not triggered."
  - [x] **Add Story 2.3 deferred-work section** for new deferrals introduced here:
    - Column-restricted immutability trigger for `clause_versions` (`payload`/`clause_id`/`version` guard) — deferred to Story 2.4 when audited write path is established. Re-trigger: Story 2.4 task-list item.
    - `resolveByClauseId` `asOf` parameter is defaulted to DB `now()` at the domain layer — any app-server `now()` leakage at the API call site is a Story 2.4 concern (the first route that calls the resolver). Re-trigger: Story 2.4 write the resolver call.
  - [x] Follow `[[feedback_closure_language_precision]]` precision: "Closed by [edit]" only where this story produced the artifact; "Resolved via explicit deferral" where the gap is intentional + rationale + trigger recorded.

## Dev Notes

### Binding obligations (do not let the story close without these)
- **AC8 / Decision 2026-06-20-055 item 2** is a *create-story obligation that gates review*: the file must carry the benefit-mechanism teeth-confirmation AC, and code review verifies it is present and satisfied (real records → check (a) bites; `clause_versions` in snapshot → check (c) bites; `pnpm benefit:check` green). `deferred-work.md` L1306 (CR-D0-AI39): *"if missing, this is itself a code-review finding on that story."* [Source: .decision-log.md Decision 2026-06-20-055; deferred-work.md L1306]
- **Tone-review note:** publishing member-visible copy routes through Story 2.2's `requireToneReviewSignoff` gate — but that is mounted at the **Story 2.4** publish *route*, not here. 2.3 is data-model + domain only; no publish endpoint exists yet. The first durable `clause_version_id` sign-off persistence is **2.4's** job (Story 2.2 deferred it explicitly). [Source: deferred-work.md L19; gate-inventory.md L51]

### Architecture-mandated, beyond the literal AC (the dev agent owns end-to-end correctness)
- **Affected-member scope on the amendment record (architecture §1.10 L1053-1056) — REQUIRED at 2.3 (BigDev-decided).** Every Niyamavali amendment *must* declare its affected-member scope, and "Amendments cannot be committed without a scope declaration." The literal 2.3 AC4 only names `from/to/diff_document`; the scope field is **consumed** by FR-12A cache invalidation in **Epic 4**, but it is "part of the amendment record" — so the `affected_member_scope` (NOT NULL) column lives on this Epic-2 `niyamavali_amendments` table now (avoids a destructive migration when Epic 4 wires invalidation). 2.3 **stores + validates the declaration shape**; Epic 4 owns resolving it to member ids + the invalidation fan-out (seam-clean). Shape + Zod schema in Task 3 / Task 7. [Source: architecture §1.10 L1053-1066]
- **DB-authoritative time (§1.11).** `authored_at` and the `effective_date` comparison in AC7 resolution must use Postgres time, not app-server clocks. Document each timestamp's source in the schema/ADR.

### RLS posture (a real decision — recommended: tenant-isolated, like `events_log`)
The Niyamavali is *publicly rendered* (FR-79, Story 2.5), which might suggest the `pariwar_passport` cross-readable carve-out. **Recommended posture: tenant-isolated read + write** (mirror `events-log-rls.ts`), because:
1. Each Pariwar's public site is its own per-Pariwar build/domain — the public render (2.5) reads with `app.pariwar_id` set to that Pariwar, so a tenant-scoped SELECT already serves it.
2. The cross-readable carve-out is the single *named exception* to the Story 1.6 leak invariant; the adversarial leak suite asserts `pariwar_passport` as the **only** positive exception. Adding a second cross-readable table expands that exception surface and forces a leak-suite change — avoid unless 2.5 proves a concrete cross-tenant public-read need (it does not). [Source: packages/domain/src/policies/pariwar-passport-rls.ts header; events-log-rls.ts]

If 2.5 later needs an un-scoped public read path, that is a deliberate carve-out decision *there*, with the leak-suite update, not a default here.

### 409 ownership (AC3)
"Allocation conflicts rejected by the API layer with a **409**." The **API layer is Story 2.4** (admin route). At 2.3, deliver the *typed domain conflict* (`ClauseIdConflictError`) + the DB `unique (pariwar_id, clause_id, version)` guard; 2.4's route maps the typed error → HTTP 409. Don't build an HTTP handler in 2.3. [Source: epics.md Story 2.4 L1484; the `upsertPariwarPassport` "throw on silent block" precedent]

### `clause_versions` is NOT fully append-only
Unlike `events_log` / `audit_log_entries`, `clause_versions` has two legitimately-mutable columns: `superseded_by_version` (set when the next version lands) and `deprecated_at`. So **do not** install a block-all-UPDATE trigger on it. Enforce historical immutability of `payload` / `clause_id` / `version` at the domain layer (Task 6) for this story. A column-restricted Postgres trigger guarding those three columns against UPDATE is **deferred to Story 2.4** (Task 12 / deferred-work.md) — established when the audited write path is tested under live conditions. `niyamavali_amendments`, by contrast, **is** fully append-only (block UPDATE/DELETE/TRUNCATE — events_log 0001 precedent).

### Source tree / placement
- Schema: `packages/domain/src/schema/clause_versions.ts`, `…/niyamavali_amendments.ts`; export from `…/schema/index.ts`.
- RLS: `packages/domain/src/policies/clause-versions-rls.ts`, `…/niyamavali-amendments-rls.ts`.
- Domain accessors: `packages/domain/src/niyamavali/` (read.ts / write.ts / diff.ts / index.ts) — mirror `pariwar-passport/`.
- Branded IDs: `packages/domain/src/ids/index.ts`.
- Contracts: `packages/contracts/src/rules/clause.ts` (+ barrel) — co-located with `benefit-mechanism.ts`.
- Migration: `packages/domain/migrations/0014_*.sql` (+ `meta/_journal.json`, `meta/0014_snapshot.json`).
- Seed: `packages/domain/seed/niyamavali-v1-clauses.sql` (SQL INSERT file picked up by `extractFromSqlInserts` via `benefit-mechanism.yaml` `seed_globs`).
- ADR: `docs/adr/ADR-0020-niyamavali-registry-data-model.md` (Task 11).
- Config the story touches: `benefit-mechanism.yaml` (`seed_globs`/`fixture_globs`), `gate-inventory.md` (Category B L47-48 → enforcing; Category C L67 → done; L68 → closed), `deferred-work.md` (Story 2.3 section + close L78), `docs/knowledge-transfer/adr-index.md` (ADR-0020 row + counts).
- The API module `apps/api/src/modules/rules/` (architecture §4.2 L4517, source tree L4274) is the **2.4+** home — **not** built here. [Source: architecture L4274, L4517]

### Testing standards summary
- Live-DB integration runs against `twt-test-pg` Docker on **:5433**; `DATABASE_URL` must point at `:5433`. RLS-in-tests model: the test login role is a superuser and bypasses RLS — `SET LOCAL ROLE twt_app` then `setPariwarScope` to exercise policies; afterEach ROLLBACK. [Source: [[project_live_db_test_gotchas]]; _helpers.ts]
- Own-committing writers accumulate rows — assert membership, not absolute counts.
- ESLint runs per-package (`eslint .` per workspace); any rule carve-out `files` glob must be a cwd-relative role glob (`**/db.ts`), not a package-path glob. Verify with `pnpm --filter @twt/domain lint`. [Source: [[project_eslint_config_per_package_cwd]]]
- Merge gate: `pnpm ci:local` mirrors all 14 ci.yml jobs (GitHub Actions suspended). [Source: [[project_ci_actions_suspension_local_mirror]]]

### Project Structure Notes
- Naming discipline (architecture L3663-3677): DB columns snake_case, TS fields camelCase, JSONB keys snake_case. Tables snake_case-**plural** (`clause_versions`, `niyamavali_amendments`) — both are collections, so no singular exception (contrast `pariwar_passport`).
- Branded-ID discipline (architecture L3700-3708): branding mandatory on a new ID's first PR — this is that PR for `ClauseId` + `ClauseVersionId`.
- No detected conflicts with the unified structure. One **net-new** decision: `clause_id` is a *non-UUID branded slug*, the first branded ID that is not a UUID — hence the bespoke format constructor rather than `uuidBrand`.

### References
- [Source: epics.md#Story-2.3 L1442-1472] — AC verbatim + the user story.
- [Source: epics.md#Epic-2 L1385-1401] — Epic body, the shape-vs-engine seam note, demoable closure, dependencies.
- [Source: epics.md freeze-table rows 12 + 14 L527-531] — `benefit_mechanism` enum requirement + the seam.
- [Source: architecture.md §1.13 Hook 1 L1133-1147] — `benefit_mechanism` discriminator (the authoritative enum spec); §1.13 Hook 2 L1149-1163 (non-add, schema-diff sibling).
- [Source: architecture.md §1.10 L1040-1066] — caching + the mandatory amendment scope declaration.
- [Source: architecture.md §1.11 L1081-1099] — DB-authoritative time.
- [Source: architecture.md §1.2 + §Naming L3663-3708, source tree L4274/L4517] — RLS roles, naming, placement.
- [Source: benefit-mechanism.yaml L36-46] — `mechanisms`, `v1_only`, `v1_permitted`, `rule_sources.tables: [clause_versions]`, empty seed/fixture globs (this story fills them).
- [Source: scripts/benefit-mechanism/lib.ts + README.md] — the 3 checks; `scanRuleTableColumns` (check c) + `validateRuleRecords` (check a) seam.
- [Source: packages/contracts/src/rules/benefit-mechanism.ts] — the `BenefitMechanism` z.enum to import (do not re-declare).
- [Source: packages/domain/src/schema/{events_log,audit_log_entries,pariwar_passport}.ts] — schema patterns.
- [Source: packages/domain/src/policies/{events-log,pariwar-passport}-rls.ts + _roles.ts] — RLS posture choice.
- [Source: packages/domain/src/{ids/index.ts, pariwar-passport/{read,write}.ts}] — branded IDs + accessor module shape.
- [Source: packages/domain/src/canonical-json.ts:35] — `canonicalJsonStringify` for deterministic JSONB diff ordering (exported from `@twt/domain` index L21; moved from `packages/events` per DD-1 / Story 1.10; see ADR-0004).
- [Source: .decision-log.md Decision 2026-06-20-055 (+ 053, 054)] — AC8 binding obligation + the gate-inventory flip follow-up.
- [Source: gate-inventory.md L47-48, L67-68] — Category B rows to flip enforcing at 2.3 (L47-48); Category C L67 done; L68 close (seed is `.sql`, no TS-literal extractor needed).
- [Source: deferred-work.md L19, L74-101, L1306] — tone-review deferral, benefit-mechanism extractor deferrals re-triggered at 2.3, CR-D0-AI39.
- [Source: docs/knowledge-transfer/adr-index.md] — ADR-0020 row to append after ADR-0019; update drafted/Total/Section A counts.
- Memory: [[project_live_db_test_gotchas]], [[project_sprint_status_ledger]], [[project_eslint_config_per_package_cwd]], [[project_ci_actions_suspension_local_mirror]].

## Resolved decisions (BigDev, at create-story — these are settled, not open)
1. **Amendment scope column (Task 3):** ✅ **Include `affected_member_scope` (NOT NULL) now** on `niyamavali_amendments` per architecture §1.10. 2.3 stores + validates the declaration shape; Epic 4 owns resolving it to member ids + cache invalidation.
2. **Seed depth (Task 8):** ✅ **Small structurally-real set** (~2-3 canonical clauses tagged `pool`) in `packages/domain/seed/niyamavali-v1-clauses.sql` — enough to exercise create/amend/diff/lineage in tests and give check (a) teeth. Final legal copy is Story 0.13, not gating.
3. **`audit_id` nullability (Task 2):** ✅ **Nullable at 2.3**; the NOT-NULL "audit-or-throw" invariant is **enforced on the Story 2.4 write path** (every publish writes an audit line and sets `audit_id`). Document the 2.3-nullable → 2.4-enforced contract in ADR-0020.
4. **`effectiveDate` type (Task 2):** ✅ **`timestamptz`** — AC7 point-in-time comparison, §1.11 DB-authoritative time, avoids timezone-implicit cast. Committed in ADR-0020.
5. **RLS posture (Task 4):** ✅ **Tenant-isolated (events_log mirror)** — public render (2.5) reads with `app.pariwar_id` set; `pariwar_passport` cross-readable carve-out stays the single positive exception. Committed in ADR-0020.
6. **Column-restricted immutability trigger (Task 6):** ✅ **Deferred to Story 2.4** — domain-layer enforcement only at 2.3. Recorded in deferred-work.md (Task 12) with Story 2.4 re-trigger.

> **ADR-0020 scope** (Task 11): covers decisions 3–5 above (effectiveDate type, audit_id nullability contract, affected_member_scope requirement, RLS posture) plus the `ClauseId` non-UUID branded-slug precedent (first non-UUID brand in the codebase — architecture §Naming L3700-3708). This is also the mandatory §1.11 "committed in an ADR" artifact for the `effective_date` timestamptz choice.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Code, bmad-dev-story workflow)

### Debug Log References

- `pnpm benefit:check` — green WITH teeth: checks (a) + (c) flipped no-op→ENFORCING; 3 real records, every `pool`, zero `reserve` (see Completion Notes for output).
- `pnpm schema:check` / `pnpm schema:test` — green: new tables are a greenfield introduction (no forbidden payout-destination artifacts).
- `pnpm ci:local` (DATABASE_URL on :5433) — **16/16 jobs green** including `build` + `integration-tests`.

### Completion Notes List

**Story complete — all 12 tasks + all 8 ACs satisfied; Status → review.**

- **AC1-AC3 (registry shape + clause-id):** `clause_versions` carries the exact AC1 column set; `clause_id` is the first non-UUID branded id (`CLAUSE_ID_REGEX` slug constructor); allocation conflict → typed `ClauseIdConflictError` (the 409 seam; HTTP map deferred to 2.4) + the DB `unique (pariwar_id, clause_id, version)` guard.
- **AC4 (amend-with-diff):** `amendClause` inserts the new version (same `clause_id`, `version+1`, predecessor = prior `clause_version_id`), points the prior row's `superseded_by_version` forward, and writes a `niyamavali_amendments` diff row carrying the validated `affected_member_scope` — atomic in the caller's RLS-scoped transaction.
- **AC5 (lineage):** `splitClause`/`mergeClauses` wire `predecessor_clause_ids` (one→many / many→one); `lineageForward`/`lineageBackward` are bidirectionally queryable.
- **AC6 (deprecation):** `deprecateClause` sets `deprecated_at` on the latest version; `clause_id` never reused; deprecated rows still resolve by `clause_version_id`.
- **AC7 (dual resolution):** `resolveByClauseId(asOf default DB now())` = current rule; `resolveByClauseVersionId` = exact historical — both first-class, integration-proven.
- **AC8 (gate teeth — binding, Decision 2026-06-20-055):** the seed + `seed_globs` flip benefit-mechanism checks (a)+(c) to ENFORCING. `pnpm benefit:check` output: `Check (c) … clause_versions vs snapshot 0014_snapshot.json → 0 finding(s)`; `Check (a) … 15 migration .sql + 1 declared rule-source file(s) → 3 rule record(s)`; `✓ benefit-mechanism gate passed`. gate-inventory Category B L47-48 + Category C L67-68 flipped.

**Key decisions / deviations (recorded in ADR-0020):**
- `predecessor_clause_ids` stores predecessor **`clause_version_id`s**, not slugs — the only coherent reading of AC4 ("the prior version's id") for a same-clause amendment. Lineage maps version-nodes → distinct clause_ids.
- Accessors run on the **caller's** transaction (not `db.transaction()`): RLS scope (`SET LOCAL app.pariwar_id`) is tx-scoped, so a scoped caller is always in a transaction — this keeps multi-row atomicity AND the per-test rollback harness clean.
- `@twt/domain` cannot import `@twt/contracts` (turbo cycle) → the `benefit_mechanism` literal is duplicated in the domain pgEnum with a contracts drift-guard test. Symmetrically, a contracts **source** file cannot import `@twt/domain` (the root barrel pulls `encryption`/`node:async_hooks` → breaks the apps/admin vite browser build) → `CLAUSE_ID_PATTERN` is re-declared in contracts with a drift-guard test asserting `.source` equality with the domain authority.
- **Cross-story side-effect:** `clause_versions`/`niyamavali_amendments` are the first incoming FKs to `audit_log_entries`, so a plain `TRUNCATE audit_log_entries` is now blocked by the FK-reference guard before its append-only trigger; the pre-existing audit TRUNCATE test was widened to assert both guards (still non-truncatable).

### File List

**New — source:**
- `packages/domain/src/schema/clause_versions.ts`
- `packages/domain/src/schema/niyamavali_amendments.ts`
- `packages/domain/src/policies/clause-versions-rls.ts`
- `packages/domain/src/policies/niyamavali-amendments-rls.ts`
- `packages/domain/src/niyamavali/{read,write,diff,scope,errors,index}.ts`
- `packages/contracts/src/rules/clause.ts`
- `packages/domain/migrations/0014_wakeful_franklin_storm.sql` (+ `meta/0014_snapshot.json`)
- `packages/domain/seed/niyamavali-v1-clauses.sql`

**New — tests:**
- `packages/domain/tests/ids/clause-ids.test.ts`
- `packages/domain/tests/niyamavali/{diff,scope}.test.ts`
- `packages/domain/tests/integration/niyamavali/{clause-registry,niyamavali-amendments}.spec.ts`
- `packages/domain/tests/integration/rls/clause-versions-policy-regression.spec.ts`
- `packages/contracts/tests/rules.test.ts`
- `scripts/benefit-mechanism/seed-records.test.ts`

**New — governance:**
- `docs/adr/ADR-0020-niyamavali-registry-data-model.md`

**Modified — source/barrels:**
- `packages/domain/src/ids/index.ts` (ClauseVersionId + ClauseId + CLAUSE_ID_REGEX + InvalidClauseIdError)
- `packages/domain/src/index.ts` (niyamavali namespace + ClauseIdConflictError/ClauseNotFoundError top-level)
- `packages/domain/src/schema/index.ts`, `packages/domain/src/policies/index.ts` (barrels)
- `packages/contracts/src/rules/index.ts` (barrel)
- `packages/domain/migrations/meta/_journal.json`

**Modified — config/tests/governance:**
- `benefit-mechanism.yaml` (seed_globs → the seed)
- `packages/domain/tests/integration/_helpers.ts` (seedClauseVersion)
- `packages/domain/tests/integration/multi-tenant/cross-pariwar-leak.spec.ts` (clause_versions + amendments leak assertions)
- `packages/domain/tests/integration/audit-log/integrity-check.spec.ts` (TRUNCATE test widened for the new FK guard)
- `_bmad-output/implementation-artifacts/gate-inventory.md`, `_bmad-output/implementation-artifacts/deferred-work.md`, `docs/knowledge-transfer/adr-index.md`, `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Review Findings

> Code review 2026-06-21. 3 `decision-needed`, 10 `patch`, 6 `deferred`, 27 dismissed.

#### Decision-Needed (resolve before patching)

- [x] [Review][Decision] **D1 — `resolveByClauseVersionId` missing `pariwarId` parameter** — Every other read accessor in `read.ts` takes an explicit `pariwarId` and adds it to the WHERE clause as defense-in-depth alongside RLS. `resolveByClauseVersionId(db, clauseVersionId)` relies on RLS alone, which is inconsistent and creates a latent gap for superuser / non-scoped callers (e.g. background jobs, Story 2.4 route in unusual scope contexts). **Options:** (A) add `pariwarId: PariwarId` + `eq(clauseVersions.pariwarId, pariwarId)` to the WHERE — matches every other accessor; OR (B) leave as-is, document the RLS-only reliance, add a note to 2.4. [Auditor F-2; `read.ts:53`]

- [x] [Review][Decision] **D2 — `amendClause` silently amends a deprecated clause** — `latestVersionRow` returns the deprecated head without checking `deprecatedAt`. `amendClause` proceeds, inserting a new non-deprecated version — which then becomes current resolution. Clients may not intend to re-activate a deprecated clause this way. **Options:** (A) add `if (prior.deprecatedAt) throw new ClauseNotFoundError(...)` before the INSERT — prevents implicit re-activation; OR (B) allow it — amending a deprecated clause is a valid "un-retire" operation; document it. [Edge #1; `write.ts:158`]

- [x] [Review][Decision] **D3 — `deprecateClause` silently overwrites timestamp on double-deprecation** — Calling `deprecateClause` on an already-deprecated clause succeeds and updates `deprecated_at` to the new value (or DB `now()`). The original deprecation instant is lost. **Options:** (A) add `if (latest.deprecatedAt) throw new Error('already deprecated')` — preserves the first deprecation timestamp; OR (B) treat it as idempotent (updating the timestamp is an intentional backdate mechanism); document it. [Edge #7; `write.ts:286`]

#### Patch

- [x] [Review][Patch] **P1 — `niyamavali_amendments.fromClauseVersionId` / `.toClauseVersionId` missing `.$type<ClauseVersionId>()`** — Both FK columns are typed as bare `string` in the inferred `NiyamavaliAmendmentRow`, breaking the branded-id discipline every other UUID column follows. Fix: import `ClauseVersionId` in `niyamavali_amendments.ts` and add `.$type<ClauseVersionId>()` to both columns. [`niyamavali_amendments.ts:69-74`]

- [x] [Review][Patch] **P2 — `assertAffectedMemberScope` passes extra unknown keys through** — `all_members`/`past_lockin` return `{ kind }` cleanly, but `rule_subclause` and `named_cohort` branches return `value as AffectedMemberScope`, passing spurious unknown fields into the JSONB column. The contracts `AffectedMemberScopeSchema` uses `.strict()` and would reject the same payload at the transport boundary. Fix: return explicit object literals in both branches (same as the two simple-kind branches). [`scope.ts:59-75`]

- [x] [Review][Patch] **P3 — Seed `ON CONFLICT DO NOTHING` has no constraint target** — Without a target, Postgres will suppress ALL conflicts including FK and CHECK violations, making re-seeds silent on malformed data. Fix: `ON CONFLICT (clause_version_id) DO NOTHING`. [`niyamavali-v1-clauses.sql`]

- [x] [Review][Patch] **P4 — `splitClause` accepts empty `newClauses[]` silently** — Returns `[]` with no error; source clause unchanged; no forward lineage. Fix: throw `Error('splitClause requires at least one new clause')` if `input.newClauses.length === 0`. [`write.ts:224`]

- [x] [Review][Patch] **P5 — `mergeClauses` accepts empty `sourceClauseIds[]` silently** — Creates a clause indistinguishable from a plain `createClause`; lineage broken. Fix: throw `Error('mergeClauses requires at least one source clause')` if `input.sourceClauseIds.length === 0`. [`write.ts:256`]

- [x] [Review][Patch] **P6 — `mergeClauses` allows duplicate `sourceClauseIds[]`** — Duplicate UUIDs end up in `predecessorClauseIds`; audit trail is confusing (same predecessor appears twice). Fix: deduplicate `input.sourceClauseIds` or throw on duplicates before the loop. [`write.ts:258`]

- [x] [Review][Patch] **P7 — `amendClause` UPDATE of `superseded_by_version` result unchecked** — The UPDATE has no `.returning()` / result check. If it matches 0 rows (RLS scope lost mid-tx), the new version is orphaned and the prior row has no forward pointer, silently breaking the AC4 chain. Fix: add `.returning()` and throw if the result is empty. [`write.ts:186-189`]

- [x] [Review][Patch] **P8 — `splitClause` catch reports source clause_id instead of offending child's clause_id** — Any `23505` inside the loop is caught outer and re-thrown as `ClauseIdConflictError(pariwarId, input.sourceClauseId)`. The offending child's `clause_id` is what conflicted, not the source. Fix: move the try/catch inside the loop so `fields.clauseId` is in scope at the throw site. [`write.ts:234-240`]

- [x] [Review][Patch] **P9 — `computePayloadDiff` flatten collision: literal-dot key vs nested key** — A payload key containing a literal `.` (e.g. `{ "a.b": 1 }`) flattens to path `a.b`, colliding with a nested `{ a: { b: 1 } }`. The diff then silently reports spurious changes or no-change. Fix: escape dots in key segments (e.g. path separator `→` instead of `.`, or escape key dots as `\\.`). [`diff.ts:28-39`]

- [x] [Review][Patch] **P10 — `computePayloadDiff` object→null transition: spurious split diff** — When `prev = { a: { x: 1 } }` and `next = { a: null }`, flatten produces `prev: { "a.x": 1 }` vs `next: { "a": null }` → `removed: { "a.x": 1 }, added: { "a": null }`. The recipient cannot tell whether the author cleared `a` to null or removed `a.x`. Fix: detect the object→null (and null→object) transitions before flattening and represent them as top-level leaf changes. Add test. [`diff.ts:67-79`]

#### Deferred

- [x] [Review][Defer] **De1 — `lineageForward`/`lineageBackward` two sequential queries without transactional isolation** [`read.ts:103-154`] — deferred; pre-existing query pattern; spec does not require serializable reads; post-Epic-2 cleanup.
- [x] [Review][Defer] **De2 — `niyamavali_amendments.pariwar_id` not cross-validated against FK'd clause versions' pariwar_id** [`niyamavali_amendments.ts` + migration] — deferred; RLS enforces per-tenant at write time; a DB CHECK or trigger cross-validating the FK'd rows' pariwar_id is a post-Epic-2 hardening candidate.
- [x] [Review][Defer] **De3 — `isUniqueViolation` fragile against future Drizzle error-wrapping changes** [`write.ts:50-53`] — deferred; same pattern used across the codebase; re-trigger if Drizzle version upgrades or unique-conflict escapes the typed path in a test.
- [x] [Review][Defer] **De4 — No `(pariwar_id, created_at)` index on `niyamavali_amendments`** [migration 0014] — deferred; time-ordered listing query pattern does not exist yet; add an index via a forward migration once the Story 2.4/2.5 list-amendments route is built.
- [x] [Review][Defer] **De5 — `lineageForward`/`lineageBackward` unbounded array parameters at high version counts** [`read.ts:109, 141`] — deferred; not a correctness issue at current scale; add chunking when version counts grow (post-Epic-2).
- [x] [Review][Defer] **De6 — `ClauseResolutionQuery` z.union XOR future fragility** [`clause.ts:135`] — deferred; current behaviour is correct (z.union + .strict() rejects both-keys); refine to z.discriminatedUnion or z.refine if the shape changes.

### Change Log

| Date | Change |
|---|---|
| 2026-06-21 | Code review: 3 decision-needed, 10 patch, 6 deferred, 27 dismissed. Status → in-progress pending resolution. |
| 2026-06-21 | Code review resolved: D1-A (pariwarId added to resolveByClauseVersionId), D2-A (amendClause throws ClauseNotFoundError on deprecated), D3-A (deprecateClause throws on re-deprecation); all 10 patches applied; 6 deferred recorded in deferred-work.md. Status → done. |
| 2026-06-21 | Story 2.3 implemented (Tasks 1-12; all 8 ACs). Niyamavali rule registry: `clause_versions` + `niyamavali_amendments` schemas + tenant-isolation RLS + migration 0014 + domain accessors + transport contracts + structural seed. benefit-mechanism gate checks (a)+(c) flipped to ENFORCING (AC8). ADR-0020 authored. `pnpm ci:local` 16/16 green. Status → review. |
