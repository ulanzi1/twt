---
baseline_commit: fe21dd6fa8f35eba1de64a8a2be72f3bb34ce9e3
---

# Story 10.12: Per-Pariwar Custom Fields JSONB `[PRIMITIVE]`

Status: done

Epic: 10 · Story: 12 · Key: `10-12-per-pariwar-custom-fields-jsonb`
Authored: 2026-08-06 · Branch: `feat/10-12-per-pariwar-custom-fields-jsonb`

---

## Story

As Solo Builder authoring extensibility for Pariwar-specific data needs,
I want a per-Pariwar custom-fields JSONB substrate — a versioned, append-only definition registry plus a validated `members.custom_fields` write path,
So that a Pariwar can collect Pariwar-specific data without an engine change, and cannot use that freedom to reach around frozen governance.

---

## What this story is, in one paragraph

A Pariwar wants to record something TWT's schema does not model — an alternate ID number, a school block code, a cadre grade. Today that requires a migration and a release. This story ships the substrate that removes both: a per-Pariwar, per-host-entity, **append-only versioned registry** of field definitions (`pariwar_custom_field_definitions`), a `custom_fields` JSONB column on `members` validated against the in-force definition set at write time, and the repo's **first GIN index**. The registry is a data structure with a bounded vocabulary — a fixed type allowlist, a declared PII tier, hard size/depth/cardinality limits — never an expression language and never a schema-authoring escape hatch. The load-bearing half of the story is not the flexibility; it is the **fence around the flexibility**.

---

## ⚠ Read this before planning: the epic's third AC cites a gate that cannot enforce it

`epics.md:3605` says:

> **And** custom fields are NOT permitted to violate frozen governance (e.g., adding a `payout_destinations` field is rejected by Story 1.16c CI gate)

**That is factually wrong against the shipped gate, and you must not build to it as written.**

Story 1.16c is the `schema-diff` gate (`scripts/schema-diff/check.ts`, `pnpm schema:check`, config `fr-100-non-add.yaml`). It is an **invariant scan of committed repo state** across exactly four roots — `packages/domain/migrations` (+ `meta/`), `apps/api/src` route literals, `packages/contracts/src` Zod exports. Verified: `fr-100-non-add.yaml` declares `forbidden_table` / `forbidden_column` / `forbidden_endpoint` / `forbidden_zod` and `allow: []`.

A custom field is **a key inside a JSONB payload, authored at runtime, into a database row**. It is not a table, not a column, not a route literal, not a Zod export. `pnpm schema:check` would pass, green and useless, while a Pariwar admin created a field literally named `payout_destinations`.

**This story supplies the enforcement the epic's citation assumed already existed.** See AC3. Do not "wire up 1.16c" — there is nothing to wire. Do not widen `schema-diff`'s scan roots to read the database; a CI gate that needs a live tenant database is not a CI gate.

---

## Boundary — read this before anything else

### In scope

- The `pariwar_custom_field_definitions` registry: table, RLS, append-only trigger, versioning, audit.
- The bounded definition vocabulary: fixed type allowlist, cardinality/size envelope, declared PII tier, Hindi+English labels.
- **The frozen-governance fence** (AC3) — runtime rejection + DB mirror + revert-sanity.
- `members.custom_fields` JSONB column + GIN index + the validated write path.
- The three architecturally-frozen JSONB hard-limit classes as named constants, applied on this story's write paths.
- Contracts + API routes + two minted permission keys.
- A **minimal admin definition-authoring surface** (list + publish-version form). Nothing more.
- Governance records: ADR-0037 (`drafted`), adr-index flip, D2-1.7 closure, deferred-work entries, runbook step.

### Out of scope — explicitly, with the deferral recorded

| Not built | Why | Recorded where |
|---|---|---|
| `claims.custom_fields`, `pools.custom_fields` | FR-54 and architecture §1.7 name all three hosts; the epic AC names only members. `claims` is additionally guarded by §1.9/§1.13 against exactly this vector. Narrowing to one host is a real FR-54 coverage gap. | `deferred-work.md`, gated (Task 9) |
| A **member-facing dynamic form renderer** | The UX spec has **no** form-builder, field-definition, or per-Pariwar settings grammar. §11 restricts per-Pariwar variation to token / surface-label / copy layers and calls component grammar "tenant-invariant" (`ux-design-specification.md:2254-2262,2465`). Building a member renderer here means inventing UX. | `deferred-work.md`, gated |
| **Tier-1 / Tier-2 custom fields** | Tier-1 needs per-value envelope encryption; Tier-2 needs a blind-index host column. Neither exists for a JSONB key. See D4 — and note this makes the epic's own worked example unbuildable. | ESCALATION 2 |
| Nested object custom fields | §1.7 permits "small bounded objects"; v1 ships flat scalars + bounded string arrays. A deliberate narrowing. | `deferred-work.md` |
| Retro-fitting the three hard limits to the repo's ~20 **other** JSONB columns | §1.7 says "every JSONB write path is subject to all three; no code path bypasses them." None are today. That is a pre-existing, repo-wide gap far larger than this story. | ESCALATION 3 |
| Runtime index creation | A tenant admin must never issue DDL. `indexed: true` on a definition is a **recorded request**; the functional B-tree index is a drizzle-kit migration. See D5. | AC2 |

---

## Acceptance Criteria

### AC1 — The definitions registry: append-only, versioned, tenant-scoped

**Given** the Story 10.1 routing-policy registry (`packages/domain/src/schema/helpdesk_routing_policy_versions.ts`) and the Story 10.8 feature-flag registry (`.../feature_flag_versions.ts`) as the two established precedents
**When** `pariwar_custom_field_definitions` is authored
**Then** the table carries: `id` (uuid PK, `defaultRandom`, `$type<PariwarCustomFieldDefinitionId>`), `pariwar_id` (uuid NOT NULL, `$type<PariwarId>`), `host_entity` (text NOT NULL), `field_key` (text NOT NULL), `version` (integer NOT NULL), `definition` (jsonb NOT NULL, `$type<CustomFieldDefinitionJson>`), `effective_at` (timestamptz NOT NULL), `retired_at` (timestamptz, nullable), `authored_by_actor` (uuid), `actor_display` (text), `audit_id` (uuid), `superseded_by_version` (integer), `created_at` (timestamptz NOT NULL `defaultNow`)
**And** `field_key` is the **stable identity across versions** (the 10.8 `flag_key` precedent) — the version pin is the composite `UNIQUE (pariwar_id, host_entity, field_key, version)`; there is no separate versions table and no FK column on consumers
**And** unlike Story 10.1 there is **no code-resident default document and no `DEFAULT_*_VERSION` constant** — a Pariwar with no rows simply has no custom fields, so versions start at **1**. State this deviation in the schema-file header
**And** publishing is **append-only**: a new version INSERTs a row and sets `superseded_by_version` on the prior latest row **in the same transaction**; every other column on a prior row is immutable, enforced by a `BEFORE UPDATE` trigger that `RAISE`s (migration 0084's hand-supplement #4 is the template)
**And** **retirement is a version, not a DELETE** — retiring a field publishes a new version with `retired_at` set. Readers keep accepting a retired field's stored values until the deprecation window closes (§1.7 "old fields supported in readers until a deprecation window closes"); writers reject new values for it immediately. `GRANT SELECT, INSERT, UPDATE` — **never DELETE**. Retirement is **not** a separate route or writer path — `retireDefinition()` is a thin wrapper over `publishDefinitionVersion()` that republishes the current in-force `definition` body with `retired_at` populated, through the **same** publish endpoint (AC7)
**And** RLS ships in `packages/domain/src/policies/pariwar-custom-field-definitions-rls.ts` with the fail-closed idiom verbatim — `pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid` — as three policies (`_select`, `_insert`, `_update`), plus `ENABLE` **and** `FORCE ROW LEVEL SECURITY`, and a positive/negative policy-regression spec

**Given** the in-force resolution must be by instant, not by "latest row"
**When** `definitionsInForce(db, pariwarId, hostEntity, at)` runs
**Then** it selects per `field_key` the row with the greatest `effective_at <= at` (tie-break `desc(version)`), excludes rows whose `retired_at <= at`, and returns a frozen set
**And** the write path stamps the resolved **`definition_set_version`** — a deterministic hash over the in-force `(field_key, version)` pairs — onto the member row's payload envelope, so a value written under one definition set can be replayed against exactly that set

### AC2 — A bounded vocabulary, never an expression language

**Given** `feature_flag_versions.ts`'s stated doctrine — *"A FIXED enum, deliberately: it is what keeps the predicate a BOUNDED declarative form rather than an expression language"* and *"NEVER an expression language: no JSONLogic, no eval, no mini-DSL"*
**When** the definition shape is authored
**Then** `CUSTOM_FIELD_TYPES` is a fixed `as const` tuple — `['string', 'integer', 'decimal', 'boolean', 'date', 'enum', 'string_array']` — declared once in `packages/domain/src/custom-fields/types.ts`, mirrored in `packages/contracts/src/custom-fields/`, and pinned equal by a contracts sync-guard test
**And** the `definition` JSONB body uses **snake_case inner keys** (the `clause_versions` convention — it must match the `@twt/contracts` wire shape byte-for-byte): `field_key`, `label_en`, `label_hi`, `field_type`, `enum_values?`, `max_length?`, `max_items?`, `pii_tier`, `required`, `indexed`
**And** validation is a **hand-written imperative validator that accumulates `reasons: string[]` and throws one aggregate typed error** — `validateCustomFieldDefinition()`, modelled exactly on `validateRoutingPolicyRules` in `packages/domain/src/helpdesk/registry.ts`. **Do NOT build a Zod schema from a database row.** There is no precedent for it in this repo, and `zod-to-json-schema` / `ajv` are **not dependencies of any package** — introducing one needs its own ADR
**And** `indexed: true` **records a request and creates nothing**. The functional B-tree index on the JSON path is a drizzle-kit migration authored by a human (§1.7: "Functional B-tree indexes on specific JSON paths declared per-Pariwar when a query pattern is identified"; "Custom-field migrations are first-class drizzle-kit migrations, scoped to a single `pariwar_id`"). A tenant admin issues **no DDL, ever**
**And** the index inventory lives at `packages/domain/src/per-pariwar/<id>/index-inventory.ts` per §1.7 ("Index inventory + per-Pariwar policy lives in `packages/domain/`")

**Given** the "no silent renames" rule (§1.7)
**When** a published `field_key` is edited
**Then** it is impossible by construction — `field_key` is part of the version-pin key. Changing a field's meaning means retiring one key and publishing another. A test asserts a second version for the same `field_key` cannot change `field_type` or narrow `enum_values` (widening is permitted; narrowing would silently invalidate stored values)

### AC3 — ⭐ THE GOVERNANCE FENCE: a custom field can never reach around a frozen control

**This is the story's load-bearing commitment. Build it FIRST, before the thing it fences.**

**Given** the epic's citation of Story 1.16c is unenforceable (see the ⚠ section above) and Story 10.8's capability bar (`governance_boundary.yaml` + `packages/domain/src/feature-flags/capability-bar.ts`) is the working precedent for *runtime* rejection backed by a *source-scannable* config
**When** a definition is published
**Then** **three independent layers** reject a frozen-governance key, and all three must exist:

1. **Runtime, in the domain writer.** `packages/domain/src/custom-fields/frozen-governance.ts` loads `fr-100-non-add.yaml` (reuse `capability-bar.ts`'s YAML-loading shape — YAML parsing from `packages/domain` already works) and rejects any `field_key` matching `patterns.forbidden_column` as a **prefix** (`payout_destination*`), plus an explicit `CUSTOM_FIELD_FORBIDDEN_KEY_PATTERNS` set covering the `epics.md:513` freeze table and the load-bearing derived columns: `payout_destination*`, `benefit_mechanism`, `is_valid`, `is_assignable`, `moderation_status`, `state`, `state_event_version`, `pariwar_id`, `member_id`, `lock_in*`, `fixed_amount*`, `audit_*`, `consent_*`. Matching is case-insensitive and normalizes `-`/`.`/whitespace to `_` so `Payout-Destinations` and `payout.destination` are caught. Typed error → wire code `custom_field.frozen_governance_key`
2. **DB mirror.** A `CHECK` constraint on the definitions table rejecting the same prefix family, per migration 0088's doctrine — *"an app-layer rule with no DB mirror is a rule that holds only for the callers who happen to go through the app layer."* The CHECK need not be as rich as the app rule; it must cover `payout_destination*` at minimum. Name it `pariwar_custom_field_definitions_frozen_key_ck`
3. **CI, honestly scoped.** A new gate `scripts/custom-field-governance/{check,lib}.ts` (+ `README.md`, `lib.test.ts`), script `pnpm custom-field:check`, wired into **both** `.github/workflows/ci.yml` **and** `scripts/ci-local.sh`. Because definitions are database rows, the gate cannot scan them. It asserts what CI *can* prove: (a) the denylist file's pattern set is a superset of `fr-100-non-add.yaml`'s `forbidden_column`; (b) `insert(pariwarCustomFieldDefinitions)` appears **only** inside the sanctioned writer module — a source scan in the `member-state-invariant` / `access-wrapper` house style. State this scope limit in the gate's README in plain words. Do not overclaim.

**And** ⭐ **revert-sanity**: for each of the three layers, a test proves the layer **fails when the invariant is broken** — a live-DB spec asserting the writer throws on `payout_destinations`, a live-DB spec asserting a direct `INSERT` bypassing the writer is rejected by the CHECK, and a `lib.test.ts` fixture asserting the source scan reports a violation for a planted out-of-module insert. A green scan proves nothing on its own [[feedback_gate_scope_semantic_coverage]]
**And** the gate is recorded in `_bmad-output/implementation-artifacts/gate-inventory.md` with its scope limit stated

### AC4 — PII tier is declared at definition time, and v1 accepts Tier-3 only

**Given** architecture §2.7 (`architecture.md:1529-1531`) — *"new PII fields declare their tier **at schema definition**"* — and the fact that `members` is a **certified PII-free table** (`member_identities.ts` header: *"The `members` table stays PII-FREE (Story 3.1 — it is the lifecycle anchor)"*)
**When** a definition is published
**Then** `pii_tier` is a **required** field on every definition, restoring §2.7's declaration moment for a runtime-authored field
**And** **v1 accepts `pii_tier: 3` only.** A definition declaring tier 1 or 2 is rejected with wire code `custom_field.pii_tier_unsupported`, whose message names the deferral rather than implying the field is illegitimate. Rationale: Tier-1 requires per-value envelope encryption (a per-row DEK has no home inside a shared JSONB column) and Tier-2 requires a blind-index host column; both are real substrate with no host today
**And** a **key/label naked-PII detector** rejects obviously-PII-shaped declarations regardless of the declared tier — `aadhaar`, `adhaar`, `pan`, `mobile`, `phone`, `email`, `dob`, `birth`, `account_no`, `ifsc`, `upi`, `vpa`, `bank` — because a tenant declaring Tier-3 on an Aadhaar-shaped field is precisely the "buggy or malicious tenant" §1.7 exists to defend against. Implement this locally in `frozen-governance.ts`; do **not** reach into Story 1.16b's scanner (`packages/contracts/scripts/check-pii-scrape.ts`) — that engine scans rendered surfaces, it is not a key-name classifier, and importing contracts into domain inverts the dependency
**And** ⚠ **the epic's own worked example fails this rule.** "Alternate ID number" (`epics.md:3603`) is Tier-2 by direct analogy to §2.7's classification of eHRMS ID. The story ships the guard as specified and raises **ESCALATION 2**; it does not quietly widen the guard to make the example pass

### AC5 — The three frozen hard-limit classes, as constants, with the Trustee-Panel path stated

**Given** architecture §1.7 (`architecture.md:973-991`): *"**The existence of these three limit classes is architecturally frozen**"* while *"**The specific numeric values** … are **operational policy under Trustee-Panel review**"*, and the implementation-readiness recommendation (`implementation-readiness-report-2026-05-28.md:702`) — *"Story 10.12 should reference this policy review mechanism in its AC"* — which was applied to §1.7 but **never applied to the epic**
**When** the limits substrate is authored
**Then** `packages/domain/src/custom-fields/limits.ts` declares the single source of truth as named constants with a header stating each is **Trustee-Panel-revisable operational policy, not an architectural commitment**, and naming the review path (the FR-15 fixed-amount / FR-8 lock-in precedent):
- `CUSTOM_FIELDS_MAX_PAYLOAD_BYTES` — max JSON payload per column write
- `CUSTOM_FIELDS_MAX_NESTING_DEPTH` — max nesting depth
- `CUSTOM_FIELDS_GIN_INDEX_BUDGET_BYTES` — per-Pariwar GIN growth ceiling
- `CUSTOM_FIELD_DEFINITIONS_MAX_PER_PARIWAR` — the §1.7 cardinality bound

**And** all four are enforced on **this story's** write paths (definition publish + member custom-fields write), each with its own typed error and its own test
**And** the GIN budget is an **observed signal**, not a write-time check on every row: a read helper `ginIndexBytes(db)` over `pg_relation_size` plus an alarm threshold, surfaced for AR-31 observability. §1.7's "write-rate limit when approached" is **not** built — record it (ESCALATION 3)
**And** the values are chosen conservatively and justified in one line each in the module header. Suggested v1: `8192` bytes, depth `3`, `256 * 1024 * 1024` bytes, `32` definitions
**And** ⚠ §1.7 says these limits bind *"every JSONB write path … no code path bypasses them."* **They currently bind none of the repo's ~20 other JSONB columns.** This story does not retro-fit them; it lands the constants module as the destination and raises ESCALATION 3. Say so in the module header rather than letting a future reader assume coverage

### AC6 — `members.custom_fields` + the repo's first GIN index + the validated write path

**Given** `members` today is exactly `member_id`, `pariwar_id`, `state`, `state_event_version`, `lock_in_days_at_join`, `created_at`, `updated_at`, with one index `members_pariwar_id_idx`
**When** the column lands
**Then** `customFields: jsonb('custom_fields').notNull().$type<MemberCustomFieldsJson>().default(sql\`'{}'::jsonb\`)`
**And** ⭐ **no projector guard is needed and none is added** — the migration-0018 `app.member_state_writer` trigger fires only on `state` changes. `lock_in_days_at_join` (`packages/domain/src/member/lock-in.ts:82`) is the exact precedent for a plain scoped non-`state` UPDATE; copy its shape, and copy its schema-header comment explaining why the guard is absent
**And** a `CHECK (jsonb_typeof("custom_fields") = 'object')` mirrors the app-layer shape rule (0088 doctrine)
**And** ⚠ **a GIN index lands — the first in this repo.** `grep 'USING gin'` across all migrations and schema files currently returns nothing. Use default `jsonb_ops`, not `jsonb_path_ops`: §1.7 asks for "arbitrary path queries" and `jsonb_path_ops` supports only containment. Name it `members_custom_fields_gin_idx`. Note the size/選択 tradeoff in the migration header
**And** the write path is a new `packages/domain/src/custom-fields/member-write.ts` exposing `setMemberCustomFields(db, { pariwarId, memberId, values, auditId, at })` which: resolves the in-force definition set → validates every supplied key exists, is not retired, and conforms to its `field_type`/`max_length`/`max_items`/`enum_values` → enforces all four AC5 limits → rejects unknown keys (**strict, never silently dropped**) → writes with a `definition_set_version` envelope. Unknown-key rejection is the JSONB analogue of `.strict()` and is not negotiable
**And** the writer is the **sole** `update(members).set({ customFields })` call site in the repo, asserted by AC3's source-scan leg

### AC7 — Contracts, API, and two minted permission keys

**Given** the `packages/contracts` conventions — snake_case wire, `.strict()` on every object, `.js` ESM barrel exports, `export const X` + `export type X = z.output<typeof X>`, `_common/primitives.ts` reuse, **no `@twt/domain` import from a contracts source file** (the RN Metro `pg` bundle rule), and **no `ZodCatch`** (the OpenAPI emitter throws on it)
**When** `packages/contracts/src/custom-fields/` is authored
**Then** it ships `README.md` + `index.ts` + `definition.ts` + `member-values.ts`, is barrelled from `packages/contracts/src/index.ts` with a preceding comment naming Story 10.12 and whether it registers OpenAPI paths, and a `packages/contracts/tests/custom-fields.test.ts` sync-guard pins `CUSTOM_FIELD_TYPES` and the PII-tier tuple equal to `@twt/domain`'s
**And** `definition.ts`'s publish-version request schema is `{ definition: CustomFieldDefinition, effective_at?: string, retired_at?: string }` — `retired_at` is a **sibling of** `definition`, never a key inside it (AC1: it is a row column, not part of the JSONB body); its presence is what routes the same POST to `retireDefinition()` instead of `publishDefinitionVersion()` (AC7)

**Given** the RBAC catalog is at `PERMISSION_CATALOG_VERSION = 28` (`packages/domain/src/rbac/permissions.ts:337`) with an existing `pariwar.*` family (`pariwar.configure_channels`, `pariwar.declare_degraded_mode`, `pariwar.amend_rule`, `pariwar.provision`)
**When** the keys are minted
**Then** **two** keys land — `pariwar.view_custom_fields` and `pariwar.manage_custom_fields` — both `dimension: 'pariwar'` (value = `scopeTx.pariwarId`; the `helpdesk.create` / `news.manage` / `feature_flag.*` pariwar-wide precedent), granted to `pariwar_admin` (+ `super_admin` auto); `view` additionally to `auditor`
**And** the read/write split is deliberate, per 10.8's stated doctrine — *"⚠ THE READ/WRITE KEY SPLIT IS THE POINT … If these ever collapse to one key, the transparency property goes with it"*
**And** ⚠ **`district_admin` is NOT granted.** A district-ceiling grant cannot satisfy a pariwar-dimension check — that is the inert-capability finding from Story 10.3, and re-learning it here would be a regression. If district authoring is ever wanted, the gate moves to `dimension: 'district'`; it is never fixed by widening a pariwar gate
**And** `PERMISSION_CATALOG_VERSION` bumps **28 → 29** in one bump covering both keys, with `packages/domain/tests/rbac/permissions.test.ts`'s inline bump ledger extended

**Given** the `apps/api/src/modules/feature-flags/` module layout (`index.ts` / `routes.ts` / `handlers.ts`, no `repo.ts`)
**When** `apps/api/src/modules/custom-fields/` is authored
**Then** routes register under `/api/v1/p/:pariwarId/custom-fields` with `preHandler` chains `[requireAdminSession(deps), scopeResolutionHook(deps), requirePermissionHook(deps, KEY)]`, handlers read `request.scopeTx!.tx`, and `ctxOf(request)` is copied verbatim from the feature-flags handler
**And** the routes are: `GET /definitions` (in-force + history), `POST /definitions/:hostEntity/:fieldKey/versions` (publish **or** retire — the request body carries the `definition` object plus a top-level optional `retired_at`; when `retired_at` is present the handler calls `retireDefinition()` instead of `publishDefinitionVersion()` and the audit action is `custom_field.definition_retired` instead of `custom_field.definition_published`), `GET /members/:memberId/values`, `PUT /members/:memberId/values`
**And** both write routes carry **opt-in `Idempotency-Key`** via `withIdempotency`, namespaced by route + scope + subject (`custom_field.publish:${pariwarId}:${hostEntity}:${fieldKey}` and `custom_field.set_values:${pariwarId}:${memberId}`), backed by `idempotency.createKeyedStore(deps.pool)` with a 300s TTL
**And** every mutation pairs with audit via **`audit.withCompensatingAudit(deps.servicePool, …)`** — ADR-0030 makes this the *sole* sanctioned mutation+audit pairing and a direct `writeAuditEntry` here is gate-caught. Actions: `custom_field.definition_published`, `custom_field.definition_retired`, `custom_field.values_set`. Hash the payload with `canonicalJsonStringify` (RFC 8785), **never bare `JSON.stringify`**
**And** the module registers in `apps/api/src/server.ts` with the house-style comment naming the Story and what the module does *and does not* own

### AC8 — A minimal admin authoring surface, and an explicit refusal to invent UX

**Given** the UX spec contains **no** form-builder, field-definition, or per-Pariwar settings grammar, and §11 confines per-Pariwar variation to the token / surface-label / copy layers
**When** the admin surface is built
**Then** it is exactly one page — `apps/admin/src/modules/custom-fields/CustomFieldsPage.tsx` + `apps/admin/src/routes/CustomFieldsRoute.tsx` at path `/p/$pariwarId/custom-fields` — listing in-force definitions with version + history, a publish-version form over the **fixed** type allowlist, and a per-definition **Retire** action (confirm-and-submit; calls the same publish endpoint with `retired_at` set to now — AC7). Retired definitions show in the history list with their retirement date, not in the in-force list
**And** it follows the feature-flags template exactly: `pariwarId` as a **prop** (so the page is testable without a router), `useQuery`/`useMutation` direct from `@tanstack/react-query`, fetchers + `ApiError` from `../../api/client.js` in a `// ── Custom fields (Story 10.12) ──` section, a pure exported `CustomFieldsGateView` for the session gate, and a `describePublishError(err)` mapping wire codes to operator-actionable copy
**And** **no client-side capability hiding** — the real boundary is the server guard chain (the 10.8 doctrine); the client gate is only "is there a live session"
**And** ⛔ **no member-facing dynamic form renderer is built.** Custom-field *values* are written through the API only in v1

### AC9 — Hindi parity on every label, because a member-visible string without it breaks a frozen row

**Given** freeze-table row 10 (`epics.md:526`) — *"every member-visible string carries Hindi parity; English never primary on member surfaces"* — while admin surfaces are English-primary (`ux-design-specification.md:2379`), and `packages/i18n/per-pariwar/` is a **build-time** strings directory that a runtime-authored label can never reach
**When** a definition is published
**Then** **both `label_en` and `label_hi` are required and non-empty**, rejected with `custom_field.label_parity_required` otherwise
**And** requiring both **now** — while no member surface renders them — is deliberate: a label authored English-only today becomes an un-backfillable parity violation the moment a renderer lands [[feedback_record_unattested_no_backfill]]
**And** the admin form states plainly why Hindi is required, in the tone-guide register — not as a validation scold

### AC10 — Governance records

**Given** the reserved ADR slot at `docs/knowledge-transfer/adr-index.md:136` — `ADR-NNNN-per-tenant-custom-fields-jsonb`, status `slot-reserved-pre-write`, closure explicitly bound to *"Story 10.12 (per-Pariwar custom fields jsonb) closure"*
**When** the story lands
**Then** `docs/adr/ADR-0037-per-tenant-custom-fields-jsonb.md` is authored from `docs/adr/_adr-template.md` with `Status: drafted`, covering the four things the slot names — indexing, validation, query patterns, type-safety — plus **D1's registry-medium decision and its deviation from §1.7**
**And** the adr-index row flips `slot-reserved-pre-write` → `drafted`, **and** the reconciliation prose + the status-summary breakdown are both updated (`slot-reserved-pre-write` 113→112, `drafted` 0→1). ⚠ Story 10.8 flipped the row and left the reconciliation stale — the index README §7 exists to prevent exactly that; do not repeat it
**And** ADR-0037 is **`drafted`, not ratified** — trustee ratification is a named forward obligation, not something this story may assert [[feedback_verify_before_committing_governance_claims]]
**And** `packages/domain/src/per-pariwar/bihar/README.md` is rewritten: **D2-1.7 is Closed by this story's edit** (its trigger — "the first custom-field host table" — fired at Epic 3), and the corresponding `deferred-work.md:1855` entry is closed with that exact language [[feedback_closure_language_precision]]
**And** `docs/runbooks/multi-pariwar-provisioning.md:48` gains the concrete step now that the mechanism exists
**And** `.decision-log.md` gains the author-commit decision entry; `_bmad-output/implementation-artifacts/sprint-status.yaml` gains one combined ledger comment at completion

### AC11 — Validation

**Given** the project's validation discipline
**When** the story is called done
**Then** `pnpm ci:local` is green — and it is run **after** recreating the test DB, single-pass, never with a global `DATABASE_URL` that double-runs the integration specs [[project_ci_local_double_run_pollution]]
**And** `pnpm custom-field:check`, `pnpm schema:check`, `pnpm pii:check`, `pnpm governance-boundary:check`, `pnpm member-state:check`, `pnpm i18n:check` are all green
**And** live-DB specs land at `packages/domain/tests/integration/custom-fields/*.spec.ts` using `setupLiveDb()` + `getTx()` + `enterAppScope(client, PARIWAR_A)` + `describe.skipIf(!hasDatabase)(…, { timeout: 20000 }, …)`; seed **before** entering app scope; assert **membership, not global counts**
**And** the friction-budget disposition is declared in `friction-budget.md` (AC-4 diffs **committed** history, so it passes vacuously until you commit — declare deliberately, do not read the vacuous pass as a result) [[project_friction_budget_baseline_ratchet]]

---

## Load-Bearing Decisions

### D1 — ⭐ RECOMMENDED. The registry is a TABLE, the vocabulary is CODE. This deviates from §1.7 and the deviation is declared, not smuggled.

Architecture §1.7 (`architecture.md:966-971`) says: *"**Versioned per-Pariwar JSON Schema** in `packages/domain/per-pariwar/<id>/schema-v<n>.ts`"* and *"**Custom-field migrations** are first-class drizzle-kit migrations."* The epic (`epics.md:3603`) says a `pariwar_custom_field_definitions` registry stores the schemas and *"admin UI authors these per Pariwar."* These are different mechanisms, and PRD FR-54's stated point — *"Variation without schema migrations"* — sides with the epic.

**Decision: split by what actually needs a migration.**

| Concern | Medium | Why |
|---|---|---|
| Field definitions (key, type, labels, tier, bounds) | **Append-only registry table**, versioned | FR-54's whole purpose; a code-file edit is a release |
| Type allowlist, forbidden-key patterns, hard limits | **Code**, in `packages/domain/` | These are the fence. A tenant must never author the fence |
| Functional B-tree indexes on JSON paths | **drizzle-kit migration** | DDL. §1.7's migration clause binds *here*, and correctly |
| Index inventory + per-Pariwar policy | **Code**, `per-pariwar/<id>/index-inventory.ts` | §1.7 says so verbatim |

§1.7's substantive properties all survive: versioned ✓, no silent renames ✓ (key is part of the version pin), deprecation window ✓ (`retired_at`), migration-gated where DDL is involved ✓. What changes is the **storage medium for the definitions**, from a TS file to an append-only, RLS-scoped, audit-chained, trigger-protected table — arguably a stronger record than a file.

This is nonetheless an **architectural deviation, and it is not mine to absorb silently** [[feedback_supersede_never_reinterpret]]. ADR-0037 is the correct vehicle — the slot was reserved for precisely "indexing, validation, query patterns, type-safety" — and it ships `drafted` with the deviation stated in its own section. **ESCALATION 1** raises the §1.7 amendment.

### D2 — ⭐ RECOMMENDED. No code-resident default. Versions start at 1.

Story 10.1 keeps its v1 policy as a code constant so the table needs no sentinel row. That solves a problem custom fields do not have: a Pariwar with no definitions has *no custom fields*, which is a perfectly good state with no document to represent. Adding a `DEFAULT_CUSTOM_FIELD_SET` would be inventing an empty thing to be the default of. Versions start at 1; a Pariwar with zero rows resolves to an empty frozen set.

### D3 — ⭐ RECOMMENDED. A hand-written validator, not runtime Zod construction.

The obvious move is to compile each definition into a Zod schema at request time. Resist it. There is **no precedent in this repo** for building a Zod schema from data (the closest, `requireIdentityTransition` in `claim/events.ts:74`, is a compile-time factory over a `ZodRawShape`), **no JSON-Schema library is a dependency of any package**, and the two nearest analogues — `validateRoutingPolicyRules` and `validateFlagVersionInput` — are both hand-written imperative validators accumulating a `reasons: string[]`. With seven scalar types and four bounds, a hand-written validator is ~120 lines, produces better error messages, and adds no dependency. A runtime-Zod or AJV approach needs its own ADR and a capability-bar-style attestation.

### D4 — ⚖ **ESCALATED, NOT SETTLED.** Tier-3 only in v1 — which makes the epic's own example unbuildable.

`members` is a certified PII-free table. Hanging tenant-authored data on it is the single most likely review objection to this story, and the mitigation must be structural rather than a promise: every definition declares `pii_tier` (restoring §2.7's declaration moment), v1 accepts only `3`, and a naked-PII key detector catches mis-declaration.

The cost is real and I will not paper over it: **"alternate ID number" — the epic's own worked example — is Tier-2** by direct analogy to §2.7's classification of eHRMS ID as a blind-indexed identifier. So the canonical use case in `epics.md:3603` does not pass the guard this story ships.

I am shipping the guard as specified rather than widening it, because widening it means putting an un-blind-indexed government-adjacent identifier in plaintext JSONB on the PII-free table — a worse outcome than an unbuilt example. **ESCALATION 2** is where this gets decided; if BigDev rules the other way, the fix is a Tier-2 blind-index host, not a relaxed detector.

### D5 — ⭐ RECOMMENDED. `indexed: true` is a request, never an action.

The most dangerous shape this story could take is one where a tenant admin's form submission causes DDL. It would hand a tenant a lock on a hot table, an unbounded index-growth vector, and a migration-history bypass in one move. `indexed: true` records that a query pattern was identified; a human authors the functional B-tree index as a migration scoped to one `pariwar_id`, and adds it to the per-Pariwar index inventory. §1.7's migration clause is satisfied exactly here.

### D6 — ⭐ RECOMMENDED. Unknown keys are rejected, never dropped.

A member write carrying a key with no in-force definition **fails**. The tempting alternative — silently ignore unknown keys — turns a client bug into invisible data loss, and turns a retired field into a value that vanishes without anyone being told. This is the JSONB analogue of the `.strict()` rule the contracts layer already applies everywhere. A retired field's *stored* values remain readable (the §1.7 deprecation window); only new writes are refused.

### D7 — Members only. The narrowing is recorded and gated, not assumed.

FR-54, `epics.md:108`, and §1.7 all name **member, claim, pool**. The epic AC names members. Claims are additionally guarded by §1.9/§1.13 — *"The v1 `claim` schema does not absorb accident-assistance fields, payout-destination columns…"* — and a tenant-authored claim custom field is precisely that vector, so claims deserve their own story with its own fence review rather than a free ride on this one. The `host_entity` column exists from day one so the extension is additive. **The gap is real and is recorded as a gated deferral, not silently absorbed** — an un-gated re-commitment decays.

---

## Escalations owed (raise them; do not silently absorb)

**ESCALATION 1 → architecture §1.7.** D1 replaces `schema-v<n>.ts` with an append-only registry table as the medium for field definitions. §1.7's substantive properties survive, but the text says "schema-v<n>.ts" and is currently the ratified statement. Raise a §1.7 amendment alongside ADR-0037. **Do not edit §1.7 as part of this story** — architecture is amended by proposal, not by a story's convenience.

**ESCALATION 2 → the epic's worked example (D4/AC4).** "Alternate ID number" is Tier-2. Either (a) the example is wrong and the epic should carry a Tier-3 example, or (b) v1 needs a Tier-2 blind-index host for custom fields, which is its own story. Route to BigDev; do not resolve by relaxing the detector.

**ESCALATION 3 → the repo-wide JSONB limit gap (AC5).** §1.7 freezes that all three limit classes bind **every** JSONB write path with no bypass. They currently bind **none** of the repo's ~20 other JSONB columns; this story covers only its own. Also un-built: §1.7's "write-rate limit when approached" on the GIN ceiling. Record both in `deferred-work.md` with a trigger, and flag whether this warrants its own gate story.

**ESCALATION 4 → the `[PRIMITIVE]` label vs one-slice discipline.** The story is labelled `[PRIMITIVE]` ("substrate consumed downstream") but its AC names an admin UI, and `epics.md:568` says a story touches API **or** admin UI. The sibling 10.6 `[PRIMITIVE]` shipped no UI at all. AC8 keeps the surface deliberately minimal, but flag the label mismatch rather than pretending it away.

**ESCALATION 5 → UX has no grammar for this (AC8).** There is no form-builder or per-Pariwar settings pattern anywhere in the UX spec, and §11 calls component grammar tenant-invariant. The admin page is built to the feature-flags template as the nearest precedent. If a member-facing renderer is ever wanted, it needs a UX pass first.

---

## Tasks / Subtasks

### Task 0 — Orient; confirm nothing moved under you (AC: all)

- [x] `git fetch origin` and branch `feat/10-12-per-pariwar-custom-fields-jsonb` off `main` [[feedback_git_fetch_before_remote_reasoning]]
- [x] Confirm still true, and stop if not: highest migration is `0094`; `_journal.json` last `idx` is `94` with `when: 1788838800000`; `PERMISSION_CATALOG_VERSION = 28`; `grep -rn "USING gin"` over `packages/domain/migrations/*.sql` and `src/schema/*.ts` returns **nothing**; `fr-100-non-add.yaml` has `allow: []`
- [x] Read, in this order: `packages/domain/src/schema/helpdesk_routing_policy_versions.ts`, `packages/domain/src/helpdesk/registry.ts`, `packages/domain/src/schema/feature_flag_versions.ts`, `packages/domain/src/feature-flags/{registry,capability-bar}.ts`, `packages/domain/src/schema/members.ts`, `packages/domain/src/member/lock-in.ts`, `packages/domain/migrations/0084_*.sql` and `0088_*.sql` (their headers are the migration checklist)

### Task 1 — ⭐ FIRST: the fence, before the thing it fences (AC: 3, 4; D4)

- [x] `packages/domain/src/custom-fields/frozen-governance.ts` — YAML load of `fr-100-non-add.yaml` (mirror `capability-bar.ts`'s loader shape), `CUSTOM_FIELD_FORBIDDEN_KEY_PATTERNS`, the naked-PII key/label detector, key normalization (case-fold; `-`/`.`/whitespace → `_`)
- [x] `packages/domain/src/custom-fields/errors.ts` — typed errors, house style (`public readonly name = 'XError'`)
- [x] Unit tests including the normalization variants (`Payout-Destinations`, `payout.destination`, `PAYOUT_DESTINATIONS`)
- [x] `scripts/custom-field-governance/{check.ts,lib.ts,lib.test.ts,README.md}` — the two CI legs of AC3(3), with the scope limit stated plainly in the README
- [x] Root `package.json`: `custom-field:check` + `custom-field:test`; wire into `.github/workflows/ci.yml` **and** `scripts/ci-local.sh`
- [x] ⭐ Revert-sanity fixture in `lib.test.ts`: a planted out-of-module insert **must** be reported

### Task 2 — The registry table (AC: 1, 3)

- [x] `packages/domain/src/schema/pariwar_custom_field_definitions.ts` — table + `CustomFieldDefinitionJson` interface + `…Row`/`…Insert` types; long house-style header naming Story/ACs, the D2 no-default deviation, and the snake_case-inner-keys rule
- [x] `packages/domain/src/ids/` — `PariwarCustomFieldDefinitionId` branded id
- [x] `packages/domain/src/policies/pariwar-custom-field-definitions-rls.ts` — three policies, fail-closed idiom verbatim
- [x] `packages/domain/migrations/0095_per-pariwar-custom-fields.sql` — **hand-authored, never `db:generate`** (the snapshot baseline is frozen at 0020; a regenerate emits a catch-up migration and can raise 42P07). Include: table DDL · `GRANT SELECT, INSERT, UPDATE` to `twt_app` (no DELETE) · `ENABLE` + `FORCE RLS` · unique index `…_pariwar_host_key_version_uq` · `…_pariwar_host_effective_idx` · composite self-FK `FOREIGN KEY (pariwar_id, host_entity, field_key, superseded_by_version) REFERENCES pariwar_custom_field_definitions(pariwar_id, host_entity, field_key, version)` (`version` alone is not unique — only the AC1 `UNIQUE (pariwar_id, host_entity, field_key, version)` is, so the FK must reference the full tuple, never a bare `version`-to-`version` reference) · three policies · append-only `BEFORE UPDATE` trigger · CHECKs (`…_frozen_key_ck`, `…_version_min_ck`, `…_superseded_forward_ck`, `…_host_entity_ck` restricting to `'member'` in v1, `…_definition_shape_ck` asserting `jsonb_typeof(definition) = 'object'`). `--> statement-breakpoint` after every statement
- [x] `_journal.json`: append `{ "idx": 95, "version": "7", "when": 1788925200000, "tag": "0095_per-pariwar-custom-fields", "breakpoints": true }`

### Task 3 — The vocabulary + the limits (AC: 2, 5; D3, D5)

- [x] `packages/domain/src/custom-fields/types.ts` — `CUSTOM_FIELD_TYPES` fixed tuple, `PII_TIERS`, the definition interface
- [x] `packages/domain/src/custom-fields/limits.ts` — four constants; header states Trustee-Panel-revisable policy + the review path + **the honest §1.7 coverage admission** (AC5)
- [x] `packages/domain/src/custom-fields/validate.ts` — `validateCustomFieldDefinition()` and `validateCustomFieldValues()`, both accumulating `reasons: string[]` → one aggregate typed error (the `validateRoutingPolicyRules` shape)
- [x] `packages/domain/src/per-pariwar/bihar/index-inventory.ts` — the §1.7 index inventory (empty at v1, with the authoring procedure in its header)
- [x] Confirm `zod` need not be added to `packages/domain/package.json` for this story (D3 means no new Zod usage in domain); if any is introduced, declare the dependency explicitly rather than relying on hoisting

### Task 4 — The registry writer + reader (AC: 1, 2, 3)

- [x] `packages/domain/src/custom-fields/registry.ts` — `publishDefinitionVersion()`, `retireDefinition()`, `definitionsInForce()`, `definitionVersion()`, `countDefinitions()`, `definitionSetVersion()`
- [x] Writer body must: validate → run the frozen-governance fence → check cardinality → read prior latest → `nextVersion` → **DB-authoritative clock** (`select now()`, never `new Date()`) → reject out-of-order `effective_at` → INSERT `.returning()` → `isUniqueViolation(err)` checking **both `err.code` and `err.cause?.code`** → the RLS-silent-filter guard (`if (!inserted) throw …'check the tx has app.pariwar_id scope set'`) → UPDATE prior `superseded_by_version`
- [x] Narrow-write audit posture: take a **pre-generated `auditId`**; the writer does **not** write the audit line
- [x] Barrel from `packages/domain/src/index.ts` as `export * as customFields from './custom-fields/index.js';`

### Task 5 — `members.custom_fields` + GIN + the value write path (AC: 6)

- [x] Add `customFields` to `packages/domain/src/schema/members.ts` with the header comment explaining **why no projector guard is needed** (0018 fires only on `state`; `lock_in_days_at_join` is the precedent)
- [x] `packages/domain/migrations/0096_members-custom-fields.sql` — `ADD COLUMN` with default · `CHECK (jsonb_typeof(...) = 'object')` · `CREATE INDEX members_custom_fields_gin_idx ON members USING gin (custom_fields);` with the `jsonb_ops` vs `jsonb_path_ops` rationale in the header · journal entry `idx: 96`, `when: 1789011600000`
- [x] Per §1.8's online-migration rule for hot tables (`members` is named there): add-nullable-or-defaulted first; no blocking backfill
- [x] `packages/domain/src/custom-fields/member-write.ts` — `setMemberCustomFields()` + `readMemberCustomFields()`; strict unknown-key rejection; all four limits; `definition_set_version` envelope; the plain scoped `update(members)` shape from `lock-in.ts:82`

### Task 6 — Contracts + API + permissions (AC: 7, 9)

- [x] `packages/contracts/src/custom-fields/{README.md,index.ts,definition.ts,member-values.ts}` — snake_case wire, `.strict()` everywhere, no `@twt/domain` import, no `ZodCatch`; barrel from the root `index.ts` with the Story-naming comment
- [x] `packages/contracts/tests/custom-fields.test.ts` — the sync-guard (this file **may** import `@twt/domain`)
- [x] `packages/domain/src/rbac/permissions.ts` — mint both keys with the full house-style comment block (route, dimension, grants, and the explicit *why-not-district_admin* note); bump `PERMISSION_CATALOG_VERSION` 28 → 29
- [x] `packages/domain/tests/rbac/permissions.test.ts` — update the pin + extend the inline bump ledger
- [x] `apps/api/src/modules/custom-fields/{index.ts,routes.ts,handlers.ts}` — four routes, guard chains, `ctxOf`, `withIdempotency`, `withCompensatingAudit`, `canonicalJsonStringify` payload hashing, `mapPublishError`/`mapSetValuesError` (the publish handler branches on request-body `retired_at` to call `retireDefinition()` + audit action `custom_field.definition_retired` — no separate route; `mapPublishError` covers both outcomes)
- [x] Register in `apps/api/src/server.ts` (import + call) with the house-style comment
- [x] `packages/api-client/src/index.ts` — the client methods, matching the existing section style

### Task 7 — Admin surface (AC: 8, 9)

- [x] `apps/admin/src/api/client.ts` — a `// ── Custom fields (Story 10.12) ──` section + re-exported row types
- [x] `apps/admin/src/modules/custom-fields/CustomFieldsPage.tsx` (+ `i18n-en.ts` if copy grows) and `apps/admin/src/routes/CustomFieldsRoute.tsx` with the exported pure `CustomFieldsGateView`
- [x] `apps/admin/src/router.tsx` — `createRoute` at `/p/$pariwarId/custom-fields` with the Story-naming comment
- [x] Render tests, not only view-model tests — Story 10.10's second review pass found AC prose that reached nobody because tests asserted the view-model and never the render
- [x] `packages/i18n/locales/{en,hi}/…` — the admin-surface strings; `pnpm i18n:check` green

### Task 8 — Tests (AC: 11)

- [x] `packages/domain/tests/integration/custom-fields/registry.spec.ts` — append-only trigger, version pin, in-force-by-instant, retirement, no-silent-rename, cardinality
- [x] `packages/domain/tests/integration/custom-fields/frozen-governance.spec.ts` — ⭐ **the two revert-sanity legs**: the writer rejects `payout_destinations`; a direct `INSERT` bypassing the writer is rejected by the CHECK
- [x] `packages/domain/tests/integration/custom-fields/member-values.spec.ts` — validation, unknown-key rejection, all four limits, `definition_set_version` stability
- [x] `packages/domain/tests/integration/rls/…` — positive/negative policy regression for the new table
- [x] `apps/api/tests/integration/custom-fields/…` — guard chain (401/403), idempotency replay, audit line shape
- [x] Suite-level `{ timeout: 20000 }` on live-DB describes; seed before `enterAppScope`; assert membership not counts

### Task 9 — Governance records (AC: 10)

- [x] `docs/adr/ADR-0037-per-tenant-custom-fields-jsonb.md`, `Status: drafted`, from `_adr-template.md`; include a "Deviation from architecture §1.7" section (D1) and an "Accepted risk" section (D4/AC4)
- [x] `docs/knowledge-transfer/adr-index.md:136` — flip the row **and** update the reconciliation prose **and** the status-summary breakdown (113→112 / 0→1)
- [x] `packages/domain/src/per-pariwar/bihar/README.md` — rewrite; **D2-1.7 Closed by this edit**
- [x] `_bmad-output/implementation-artifacts/deferred-work.md` — close D2-1.7; open gated entries for claims/pools hosts, the member-facing renderer, nested objects, the repo-wide JSONB limit gap, and the GIN write-rate limit
- [x] `_bmad-output/implementation-artifacts/gate-inventory.md` — add `custom-field-governance` with its scope limit stated
- [x] `docs/runbooks/multi-pariwar-provisioning.md:48` — make the step concrete
- [x] `friction-budget.md` — declare the disposition
- [x] `.decision-log.md` + `sprint-status.yaml` ledger entry at completion
- [x] Raise ESCALATIONS 1–5 in the completion notes; do not resolve 1, 2 or 3 yourself

---

### Review Findings

Reviewed via `bmad-code-review` (2026-08-07): Blind Hunter + Edge Case Hunter + Acceptance Auditor (with the AI-6-5 load-bearing-invariant checklist lens), full diff (~8,682 lines) against this spec. 22 findings survived triage: 14 patch (1 resolved from decision-needed — BigDev call: patch with a curated Devanagari list), 6 defer, 2 dismissed as noise.

**All 14 patches applied and verified** (2026-08-07): `definitionsInForce()` rewritten as a `DISTINCT ON` (closing the silent-drop bug at its root, in the function every write path resolves in-force definitions through — not just `listDefinitions`); the retire-then-republish compatibility bypass closed by checking the most recent row regardless of status; `pii_tier` added to the redefinition-compatibility guard; the length/item-count narrowing guard now compares effective (default-resolved) bounds; a new `definitionRowsByIds` reader replaces the history-window lookup in `listDefinitions`, bounded by cardinality instead of a page size; the CI gate gained alias resolution (leg b) AND a new leg (c) asserting the `update(members)` sole-writer claim AC6 made but never mechanized; the `pii_tier_ck` CHECK gained a CASE guard and switched `::int`→`::numeric`; the admin retire-mutation's idempotency key is no longer cleared on error; three previously-untested DB constraints got revert-sanity tests; the ADR's decision-log citation, the `422`-vs-`400` doc comment, and the `gin-budget.ts` path reference were all corrected; and the naked-PII detector gained a curated Devanagari marker set. Verified: `pnpm custom-field:check` (now 3 legs, all green), `pnpm custom-field:test` (24 tests), `pnpm {schema,governance-boundary,pii,member-state,domain-invariants}:check` all green, typecheck + lint clean on `@twt/domain`/`@twt/api`/`@twt/admin`, and live-DB integration (`registry.spec.ts` 21, `frozen-governance.spec.ts` 23, `member-values.spec.ts` 17, RLS policy-regression 9, API E2E 13, admin render 17, contracts sync-guard 18 — all passing against a freshly recreated `twt_dev`).

- [x] [Review][Patch] Naked-PII detector is blind to Devanagari-script terms in the mandatory `label_hi` field — only English markers are checked, so a Hindi-only PII-shaped label (e.g. "आधार संख्या") passes undetected regardless of declared tier. **Resolved (decision-needed → patch):** BigDev call — add a curated Devanagari marker set (आधार, पैन, मोबाइल, फोन, ईमेल, जन्म, बैंक, खाता, आईएफएससी, यूपीआई, वीपीए, etc.) to `matchNakedPii`'s label branch, mirroring the existing English list. [packages/domain/src/custom-fields/frozen-governance.ts]
- [x] [Review][Patch] `definitionsInForce()` orders by `field_key ASC` then applies a global `LIMIT 1000` BEFORE folding per-key winners, so alphabetically-late field_keys can be silently excluded from the in-force set once a Pariwar's total historical row count (unbounded — retire+republish churn is never capped) exceeds 1000; affects both member-write validation and admin display, not just display. [packages/domain/src/custom-fields/registry.ts:111-126]
- [x] [Review][Patch] `listDefinitions` reconstructs the wire `in_force` list via a lookup into the `HISTORY_LIMIT`(500)-capped `history` array and `.filter(r => r !== undefined)`s misses, so in-force definitions silently vanish from the API/admin response once a Pariwar's version history exceeds 500 rows — violates AC7's "in-force set AND full history" contract. [apps/api/src/modules/custom-fields/handlers.ts:327]
- [x] [Review][Patch] `publishDefinitionVersion`'s AC2 "no silent renames/narrowing" compatibility check only runs against the currently in-force row (`inForce.find(...)`), which excludes retired rows — retiring a field_key then republishing it under the same key skips the check entirely, letting `field_type`/`enum_values` change silently against historically-stored values written under the old shape. [packages/domain/src/custom-fields/registry.ts:298-303]
- [x] [Review][Patch] `assertCompatibleRedefinition` never checks `pii_tier` compatibility across versions — currently masked by the tier-3-only rule (D4) but becomes a live gap the moment ESCALATION 2 resolves and tiers 1/2 become writable. [packages/domain/src/custom-fields/validate.ts]
- [x] [Review][Patch] `assertCompatibleRedefinition`'s length/item-count narrowing guard only fires when the prior version explicitly declared `max_length`/`max_items` — narrowing from an implicit default bound to an explicit smaller one goes unchecked. [packages/domain/src/custom-fields/validate.ts:266]
- [x] [Review][Patch] CI gate leg (b) (`scanDefinitionWrites`, billed as the fence's load-bearing sole-writer scan, AC3) matches only a literal identifier `pariwarCustomFieldDefinitions`; an import alias (`import {pariwarCustomFieldDefinitions as cf}`) defeats it. The sibling `governance-boundary` gate already has a precedented alias-resolution route in this repo (`gate-inventory.md:37`). [scripts/custom-field-governance/lib.ts:93-126]
- [x] [Review][Patch] `pariwar_custom_field_definitions_pii_tier_ck`'s CHECK casts `(definition->>'pii_tier')::int = 3` directly — a bypassing INSERT (exactly layer 2's threat model) with a non-numeric `pii_tier` risks an opaque Postgres cast error instead of the intended constraint-violation message. [packages/domain/migrations/0095_per-pariwar-custom-fields.sql:148-149]
- [x] [Review][Patch] Admin console idempotency-key handling is asymmetric: `publish`'s `onError` preserves `publishKeyRef.current` (so a retry reuses the key, per the surrounding comment's stated intent), but `retire`'s `onError` clears `retireKeyRef.current` — so a retry after a lost response on a retire mints a NEW key, breaking that same stated guarantee for the destructive action. [apps/admin/src/modules/custom-fields/CustomFieldsPage.tsx:224-231]
- [x] [Review][Patch] Three DB-level constraints (`..._superseded_by_fk`, `..._version_min_ck`, `..._superseded_forward_ck`) have no direct revert-sanity/regression test, unlike the frozen-key/PII/shape CHECKs which each have one. [packages/domain/migrations/0095_per-pariwar-custom-fields.sql:68-114]
- [x] [Review][Patch] AC6's claim "the writer is the sole `update(members).set({ customFields })` call site... asserted by AC3's source-scan leg" is not true — the CI gate only scans for `insert(pariwarCustomFieldDefinitions)`, never for a second `update(members)` call site, so a second write site elsewhere would go undetected despite the AC's claim of mechanical enforcement. [scripts/custom-field-governance/lib.ts]
- [x] [Review][Patch] ADR-0037 cites the wrong Decision Log entry for its own author-commit record (`2026-08-06-081`, the pre-existing, unrelated Story 10.26 entry) — should be `2026-08-06-082`. [docs/adr/ADR-0037-per-tenant-custom-fields-jsonb.md:149]
- [x] [Review][Patch] `mapPublishError`'s doc comment claims frozen-governance/naked-PII rejections return "422, not 400", but the code throws `BadRequestError` (400) for all of them and the E2E spec itself asserts 400 — the comment contradicts the shipped, tested behavior. [apps/api/src/modules/custom-fields/handlers.ts:136-138]
- [x] [Review][Patch] Migration 0096's header cites a `custom-fields/gin-budget.ts` file for the GIN-budget reader that doesn't exist — `ginIndexBytes()` actually lives in `member-write.ts`. [packages/domain/migrations/0096_members-custom-fields.sql:58]
- [x] [Review][Defer] `withIdempotency`'s replay path returns the stored response without verifying the retried request body matches the original claim [apps/api/src/modules/custom-fields/handlers.ts:207-217] — deferred, pre-existing (inherited verbatim from the `feature-flags` handler pattern, not introduced by this story)
- [x] [Review][Defer] Idempotency replay can hand back a recorded "success" for a write whose commit later fails, since the result is recorded on a separate connection outside the caller's scope transaction [apps/api/src/modules/custom-fields/handlers.ts:229-234] — deferred, pre-existing (same inherited pattern, explicitly disclosed in the copied comment)
- [x] [Review][Defer] A failed `idempotencyStore.release()` call after a genuine write failure is silently swallowed, leaving the claim locked for the full TTL [apps/api/src/modules/custom-fields/handlers.ts:238] — deferred, pre-existing (same inherited pattern from feature-flags)
- [x] [Review][Defer] `CustomFieldValue`'s numeric type has no magnitude/precision ceiling beyond the blanket 8KiB payload-byte budget [packages/contracts/src/custom-fields/member-values.ts] — deferred, pre-existing (bounded by the byte ceiling already; not a stated AC requirement)
- [x] [Review][Defer] `CustomFieldsPage`'s retire-confirmation dialog state is keyed by `field_key` alone, not `(host_entity, field_key)` [apps/admin/src/modules/custom-fields/CustomFieldsPage.tsx] — deferred, pre-existing (harmless while `HOST_ENTITY` is hardcoded to `'member'`; owned by D7's own gated future story)
- [x] [Review][Defer] No test constructs an admin with a null `display_name` and asserts the publish/retire route blocks with `admin.display_name_missing` [apps/api/src/modules/custom-fields/handlers.ts] — deferred, pre-existing (mechanism reused verbatim from elsewhere in the codebase)

---

## Dev Notes

### Things that will bite

- **Never run `db:generate`.** The drizzle snapshot baseline is frozen at `0020_snapshot.json`; migrations 0021+ are hand-authored and snapshot-absent. A regenerate emits a bloated catch-up migration and can raise `42P07`. Every recent migration header says so.
- **Never edit an applied migration.** drizzle-kit skips by journal `when`, so an in-place edit silently never runs.
- **Never `DROP SCHEMA`** in a test (`42P01`). The test DB is `twt-test-pg` on `:5433`.
- **`23505` hides on `err.cause.code`** with this pg/drizzle pairing — check both.
- **Domain cannot import `@twt/events`** (turbo cycle). If this story ever wants an event, it reads `events_log` directly — but D-nothing here needs one: the registry row *is* the record.
- **Contracts must never import a pg-touching `@twt/domain` namespace** — it drags `pg` into the RN Metro bundle. Test-only cross-package imports are safe; that is how the sync-guard works.
- **camelCase domain vs snake_case contracts** is this project's most repeated bug class. The JSONB *inner* keys are snake_case **on purpose**, to match the wire byte-for-byte. Write the adapter and a round-trip test rather than trusting the eye.
- The friction-budget AC-4 leg diffs **committed** history, so it passes vacuously until you commit. `git push` runs full `ci:local` via a pre-push hook — that is the "hang", not a failure.
- Run `ci:local` against a freshly recreated DB, single-pass. A globally-set `DATABASE_URL` double-runs the integration specs and poisons count assertions.

### Why this story is worth doing carefully

Every other extensibility mechanism in this system is authored by a human through code review: rule clauses, routing policies, feature flags, permission keys. This is the first one where a **tenant** authors a shape that the engine then honours. The registry is the easy half. The reason this story has eleven ACs is that the fence is the hard half, and a fence that is asserted but not tested is not a fence.

### Project Structure Notes

New: `packages/domain/src/custom-fields/` · `packages/domain/src/schema/pariwar_custom_field_definitions.ts` · `packages/domain/src/policies/pariwar-custom-field-definitions-rls.ts` · `packages/domain/migrations/0095_*.sql`, `0096_*.sql` · `packages/contracts/src/custom-fields/` · `apps/api/src/modules/custom-fields/` · `apps/admin/src/modules/custom-fields/` · `apps/admin/src/routes/CustomFieldsRoute.tsx` · `scripts/custom-field-governance/` · `docs/adr/ADR-0037-*.md`

Updated: `packages/domain/src/schema/members.ts` · `packages/domain/src/rbac/permissions.ts` · `packages/domain/src/index.ts` · `packages/domain/src/ids/index.ts` · `packages/domain/src/per-pariwar/bihar/README.md` (+ `index-inventory.ts`) · `packages/contracts/src/index.ts` · `apps/api/src/server.ts` · `apps/admin/src/{router.tsx,api/client.ts}` · `packages/api-client/src/index.ts` · `packages/i18n/locales/{en,hi}/` · root `package.json` · `.github/workflows/ci.yml` · `scripts/ci-local.sh` · `docs/knowledge-transfer/adr-index.md` · `docs/runbooks/multi-pariwar-provisioning.md` · `friction-budget.md` · `gate-inventory.md` · `deferred-work.md` · `.decision-log.md` · `sprint-status.yaml`

Every schema/registry/handler file in this repo opens with a long block comment naming the Story, task and ACs, the decisions taken, and the deliberate deviations with `⚠` markers. A new file without one reads as out of place.

### References

- Story text — [Source: `_bmad-output/planning-artifacts/epics.md:3593-3605`]; Epic 10 frame — [`epics.md:3355-3373`]; freeze table — [`epics.md:513-529`]; one-slice discipline — [`epics.md:568`]; label legend — [`epics.md:984`]; Story 1.16c — [`epics.md:1328-1345`]
- FR-54 — [`_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md:843-845`]; v1 in-scope — [`prd.md:1325`]; scope tags — [`prd.md:207-210`]; FR-59 tenancy — [`prd.md:928-931`]
- Architecture §1.7 — [`architecture.md:943-991`]; §1.8 migrations — [`architecture.md:995-1023`]; §1.2 RLS — [`architecture.md:722-761`]; §1.3 Zod — [`architecture.md:778-799`]; §1.9 claim aggregate — [`architecture.md:1041-1045`]; §1.13 Hook 2 — [`architecture.md:1157-1168`]; §2.7 PII tiers — [`architecture.md:1507-1531`]; naming — [`architecture.md:3691-3712`]; per-pariwar tree — [`architecture.md:4383-4386`]
- IR Item-16 (the recommendation never applied to the epic) — [`implementation-readiness-report-2026-05-28.md:680-704`]; the §1.7 edit that did land — [`sprint-change-proposal-addendum-2026-05-29.md:82-130`]
- UX §11 per-Pariwar configurability — [`ux-design-specification.md:2254-2262`, `:2465`, `:2268`]; admin English-primary — [`:2379`]
- ADR slot — [`docs/knowledge-transfer/adr-index.md:136`]; index conventions — [`adr-index.md:1-20`]
- D2-1.7 deferral — [`deferred-work.md:1855`]; 1.16c as built — [`deferred-work.md:816-831`]; gate inventory — [`gate-inventory.md:34`, `:107`]
- Registry precedents — `packages/domain/src/schema/helpdesk_routing_policy_versions.ts`, `packages/domain/src/helpdesk/registry.ts`, `packages/domain/src/schema/feature_flag_versions.ts`, `packages/domain/src/feature-flags/{registry,capability-bar}.ts`
- Members + write precedent — `packages/domain/src/schema/members.ts`, `packages/domain/src/member/lock-in.ts:82`, `packages/domain/src/member/project.ts:121`, `packages/domain/src/policies/members-rls.ts`
- Migration checklists — `packages/domain/migrations/0084_helpdesk-tickets-and-routing-policy.sql`, `0088_feature-flag-version-checks.sql`
- Audit — `packages/domain/src/audit/{write,compensating}.ts` (ADR-0030); example call site `apps/api/src/modules/feature-flags/handlers.ts:443`
- Gates — `scripts/schema-diff/`, `fr-100-non-add.yaml`, `scripts/governance-boundary/`, `governance_boundary.yaml`, `scripts/member-state-invariant/check.ts`
- Test substrate — `packages/domain/src/test-utils/integration-setup.ts`, `packages/domain/tests/integration/_helpers.ts`, `docs/runbooks/test-runbook.md` Rule 7

---

## Dev Agent Record

### Agent Model Used

Claude Opus 5 (`claude-opus-5`) via `bmad-dev-story`.

### Debug Log References

Two defects were surfaced by the RED phase / by tests rather than by review. Both are recorded because
both would otherwise have shipped silently.

1. **The prefix matcher rejected `stateless_note` (Task 1, caught by the fence unit tests).** A bare
   `normalized.startsWith('state')` refuses ordinary tenant field names — `stateless_note`,
   `statement_ref`, `estate_size`. A fence that refuses reasonable names is one authors route around,
   so this was a real design flaw, not a test to relax. **Fix:** each denylist entry now declares an
   explicit match `mode`. `payout_destination` is `'prefix'` (the FR-100 registry declares it as a
   prefix, and the artifact it forbids is the PLURAL `payout_destinations`); `state` is `'segment'`
   (whole first `_`-delimited segment). The two cases are structurally identical — the pattern plus
   more letters — so no universal predicate separates them; the author of an entry knows which kind
   theirs is, and the code asks rather than guesses.

2. **A depth off-by-one that would have rejected EVERY write containing a `string_array` (Task 5,
   caught by the seven-types integration test).** `jsonDepth({ values }) + 1` double-counted the
   envelope: `jsonDepth({ values })` already measures it, because the envelope's other members are
   scalars at depth 1 and cannot raise the maximum. The effective ceiling was 2 against a documented
   limit of 3, so the legal `envelope → values → array → element` shape was refused. **Fix:** the
   `+ 1` is removed, with a `⚠ NO +1` note at the site. No unit test would have caught this — it
   needed a real payload of every type at once.

3. **`schema:check` failed on this story's own migration, twice.** Migration 0095's
   `…_frozen_key_ck` CHECK *forbids* a `payout_destination*` custom field, and its comment explains
   why — and the FR-100 gate's raw-DDL scan flagged both as payout-destination columns. See the
   Completion Notes item on `scannableDdl`.

4. **API E2E: `403 for an admin with no grant` actually answers `404`.** Correct, and now asserted as
   such with the reason written out: `scopeResolutionHook` runs before `requirePermissionHook` and
   cannot resolve a tenant the actor has no relationship with, so the request never reaches the RBAC
   gate. A 403 there would confirm the tenant exists.

5. **The FIRST `ci:local` run reported 3 failures; all three were known-cause, none a regression — and
   they are recorded rather than quietly re-run into green** [[project_ci_local_double_run_pollution]].
   (a) **`lint`** — one genuinely unused import left in `member-values.spec.ts` after the depth test was
   rewritten; fixed. (b) **`test (unit)` — `tests/db.test.ts`**, a pg-MOCKED unit test with no
   relationship to this story: it passes standalone and passes in the full `@twt/domain` suite, and
   failed only under unbounded `turbo run test`. That is the documented oversubscription flake
   [[project_ci_local_concurrency_oversubscription]]; ci:local's own job uses `--concurrency=4` and it
   is green there. Innocence confirmed by isolation before moving on, per the runbook. (c)
   **`integration-tests`** — that first run was invoked with a **global `DATABASE_URL`**, which makes
   the unit job run every integration spec and the integration job run them AGAIN: the exact double-run
   AC11 names. Re-run correctly — `ci:local` with no global `DATABASE_URL` (30/30 green) plus ONE
   integration pass against a freshly recreated `twt_dev` — everything is green (23/23 turbo tasks).

### Completion Notes List

**⭐ The fence was built first, and its teeth were proven empirically rather than asserted.**
AC3 says "Build it FIRST, before the thing it fences", and Task 1 shipped before the registry it
guards. All three layers exist:

- **Layer 1 (runtime)** — `packages/domain/src/custom-fields/frozen-governance.ts`. Thirteen forbidden
  families covering the `epics.md:513` freeze table plus the load-bearing derived columns, the FR-100
  `forbidden_column` prefix read from `fr-100-non-add.yaml` at load time, and a naked-PII key/label
  detector. Keys are normalized (case-fold; `-`/`.`/whitespace → `_`, repeats collapsed) before
  matching, so `Payout-Destinations` and `payout.destination` cannot launder past it.
- **Layer 2 (DB mirror)** — `pariwar_custom_field_definitions_frozen_key_ck` in migration 0095,
  applying the same normalization in SQL. Per 0088's doctrine: *"an app-layer rule with no DB mirror is
  a rule that holds only for the callers who happen to go through the app layer."*
- **Layer 3 (CI, honestly scoped)** — `scripts/custom-field-governance/`, `pnpm custom-field:check`,
  wired into **both** `.github/workflows/ci.yml` and `scripts/ci-local.sh`. Its README states plainly
  that definitions are database rows and the gate proves nothing about their content in any tenant DB.

⭐ **Revert-sanity was PROVEN, not claimed** [[feedback_gate_scope_semantic_coverage]]: the 0095 CHECK
was dropped from the live test DB, the frozen-governance spec was re-run, **3 named DB-mirror tests
failed**, and the constraint was restored and re-verified green. Layer 1's teeth follow from the tests
asserting typed error classes (removing the fence makes the publish succeed); layer 3's from the
planted-violation fixtures in `lib.test.ts`.

**⚠ ONE SHIPPED GOVERNANCE ARTIFACT WAS MODIFIED — flagged, not buried.** `scripts/schema-diff/lib.ts`
(a Story 1.16c artifact) gained `scannableDdl`: SQL comments and single-quoted literals are not
identifiers. The false positive had an absurd shape — the FR-100 gate flagged migration 0095's CHECK
that *forbids* `payout_destination*`, **reporting this story's enforcement as a violation of itself**.
The rejected fixes are recorded in the function header: an `allow` entry would DECLARE a
payout-destination artifact permitted (the opposite of the truth, and it would need a trustee-attested
ADR for a thing that does not exist); renaming the constraint does not help; dropping the mirror
removes the layer 0088 requires. The narrowing matches the repo's existing doctrine
(`member-state-invariant` is AST-based precisely so a substring in a comment never matches) and is
guarded by **four new revert-sanity fixtures**, including one proving dynamic DDL inside a literal
(`EXECUTE 'ALTER TABLE … ADD COLUMN payout_destination_id …'`) is **still** scanned. Recorded in
`deferred-work.md` and Decision 2026-08-06-082.

**TWO DELIBERATE DEVIATIONS FROM THE TASK LIST**, both because the subtask's premise did not hold:

1. **No `packages/api-client/src/index.ts` methods (Task 6).** That package is the **mobile member
   SDK** — token-bearer, consumed only by `apps/mobile` — and this story ships **no member surface**
   (AC8's ⛔). Adding methods there would create a member-app entry point for a surface AC8 explicitly
   refuses to build. Story 10.8, also admin-only, added nothing there either. The client methods went
   to `apps/admin/src/api/client.ts` (Task 7's first subtask), where the real consumer is.
2. **No `packages/i18n/locales/{en,hi}/` entries (Task 7).** That catalog is the **member-facing
   bilingual** one, and its parity gate would force Hindi on English-primary admin chrome — which
   `ux-design-specification.md:2379` says admin surfaces do not need. The repo's convention for admin
   copy is inline or a per-module `i18n-en.ts` (the subtask itself allows "if copy grows"); the page
   follows `FeatureFlagsPage`, the template AC8 names. `pnpm i18n:check` is green.

**Architecture / substrate decisions as shipped** (full rationale in ADR-0037 and Decision
2026-08-06-082):

- **D1** — definitions in an append-only registry TABLE; the vocabulary, fence and limits in CODE; DDL
  in drizzle-kit migrations; the index inventory in `per-pariwar/<id>/`. ⚠ A **declared deviation**
  from §1.7's `schema-v<n>.ts` medium — ESCALATION 1, stated in the ADR, the schema header and the
  bihar README, and **not** resolved by editing §1.7 [[feedback_supersede_never_reinterpret]].
- **D2** — no code-resident default; versions start at 1. The one deviation from both registry
  precedents.
- **D3** — a hand-written imperative validator. No runtime Zod, no new dependency. Confirmed `zod` did
  not need adding to `packages/domain/package.json` (no new Zod usage was introduced).
- **D4** — `pii_tier` required, v1 accepts **3 only**, plus the naked-PII detector. ⚠ The epic's own
  worked example ("alternate ID number", Tier-2) therefore **does not build** — ESCALATION 2, shipped
  as specified rather than widened.
- **D5** — `indexed: true` records a REQUEST and creates nothing. The admin form says so in plain
  words, and a render test pins that copy.
- **D6** — unknown keys rejected, never dropped.
- **D7** — members-only host; claims/pools a gated deferral with their own fence review owed.
- **The read/write key split** (`pariwar.view_custom_fields` / `pariwar.manage_custom_fields`, catalog
  28 → 29 in one bump). `district_admin` NOT granted — a district-ceiling grant cannot satisfy a
  pariwar-dimension check, so it would be an inert capability
  ([[project_rbac_geo_scope_containment]], the Story 10.3 finding re-encoded, not re-learned).
- **The GIN index uses `jsonb_ops`, not `jsonb_path_ops`** — §1.7 asks for arbitrary path queries and
  `jsonb_path_ops` is containment-only, so the planner would ignore it and seq-scan `members`.

**ESCALATIONS 1–5 are all RAISED and NONE are resolved in-story**, as instructed:

1. **§1.7 amendment** for D1's registry-medium change. Owner: Trustee Panel / architecture.
2. **The epic's Tier-2 worked example.** Owner: Trustee Panel. If ruled the other way, the fix is a
   Tier-2 blind-index host, **not** a relaxed detector.
3. **The repo-wide JSONB limit gap** — §1.7 freezes that all three classes bind every JSONB write
   path; they bind none of the ~20 other JSONB columns. `limits.ts` lands as the destination and its
   header says so. §1.7's "write-rate limit when approached" is likewise unbuilt (an observed signal
   ships instead). Flag whether this warrants its own gate story.
4. **`[PRIMITIVE]` label vs one-slice discipline** — the label says substrate, the AC names an admin
   UI, and `epics.md:568` says API **or** admin UI (sibling 10.6 `[PRIMITIVE]` shipped no UI). AC8
   keeps the surface minimal; the mismatch is flagged rather than pretended away.
5. **UX has no grammar for this** — no form-builder or per-Pariwar settings pattern exists anywhere in
   the spec, and §11 calls component grammar tenant-invariant. The admin page follows the
   feature-flags template as the nearest precedent; a member-facing renderer needs a UX pass first.

**Governance records (Task 9):** ADR-0037 `drafted` (⚠ **not ratified** — a named forward obligation
[[feedback_verify_before_committing_governance_claims]]); the adr-index **row AND reconciliation prose
AND status breakdown** all updated (`slot-reserved-pre-write` 113→112, `drafted` 0→1, Total 148
unchanged — the Story 10.8 stale-reconciliation miss deliberately not repeated); **D2-1.7 Closed by
edit** (its trigger, "the first custom-field host table", fired at Epic 3 and sat unnoticed for seven
epics — this repo's own worked example of an un-gated re-commitment decaying); 12 gated deferrals;
`gate-inventory.md`; a concrete provisioning-runbook step (correcting the stale "seed any per-Pariwar
custom-field schema" bullet — there is nothing to seed); the friction-budget disposition, declared
deliberately rather than read off AC-4's vacuous pass; and Decision 2026-08-06-082.

**Validation:** `pnpm custom-field:check`, `schema:check`, `pii:check`, `governance-boundary:check`,
`member-state:check`, `i18n:check`, `friction:check` — all green. **`pnpm ci:local`: 30/30 jobs green**
(run with NO global `DATABASE_URL`, so the integration specs are not double-run), plus a SEPARATE
single integration pass against a **freshly dropped and recreated** `twt_dev` — 23/23 turbo tasks
green, `@twt/domain` 2471 passed, `@twt/api` 871 passed. See Debug Log item 5 for the three
known-cause failures on the first (incorrectly-invoked) run. Typecheck + lint green across
domain, contracts, api, admin. Tests: 44 fence unit · 13 gate-fixture · 18 contracts sync-guard ·
57 domain live-DB integration · 9 RLS policy-regression · 13 API E2E · 17 admin **render** tests
(not view-model — the Story 10.10 lesson). Migrations 0095 + 0096 applied to `twt-test-pg`:5433 and
verified by `\d+` (table shape, 6 CHECKs, composite self-FK, 3 policies + FORCE RLS, the GIN index).

### File List

**New — domain**
- `packages/domain/src/custom-fields/errors.ts`
- `packages/domain/src/custom-fields/frozen-governance.ts`
- `packages/domain/src/custom-fields/index.ts`
- `packages/domain/src/custom-fields/limits.ts`
- `packages/domain/src/custom-fields/member-write.ts`
- `packages/domain/src/custom-fields/registry.ts`
- `packages/domain/src/custom-fields/types.ts`
- `packages/domain/src/custom-fields/validate.ts`
- `packages/domain/src/schema/pariwar_custom_field_definitions.ts`
- `packages/domain/src/policies/pariwar-custom-field-definitions-rls.ts`
- `packages/domain/src/per-pariwar/bihar/index-inventory.ts`
- `packages/domain/migrations/0095_per-pariwar-custom-fields.sql`
- `packages/domain/migrations/0096_members-custom-fields.sql`

**New — contracts / API / admin**
- `packages/contracts/src/custom-fields/README.md`
- `packages/contracts/src/custom-fields/index.ts`
- `packages/contracts/src/custom-fields/definition.ts`
- `packages/contracts/src/custom-fields/member-values.ts`
- `apps/api/src/modules/custom-fields/index.ts`
- `apps/api/src/modules/custom-fields/routes.ts`
- `apps/api/src/modules/custom-fields/handlers.ts`
- `apps/admin/src/modules/custom-fields/CustomFieldsPage.tsx`
- `apps/admin/src/routes/CustomFieldsRoute.tsx`

**New — gate**
- `scripts/custom-field-governance/check.ts`
- `scripts/custom-field-governance/lib.ts`
- `scripts/custom-field-governance/lib.test.ts`
- `scripts/custom-field-governance/README.md`

**New — tests**
- `packages/domain/tests/custom-fields/frozen-governance.test.ts`
- `packages/domain/tests/integration/custom-fields/registry.spec.ts`
- `packages/domain/tests/integration/custom-fields/frozen-governance.spec.ts`
- `packages/domain/tests/integration/custom-fields/member-values.spec.ts`
- `packages/domain/tests/integration/rls/pariwar-custom-field-definitions-policy-regression.spec.ts`
- `packages/contracts/tests/custom-fields.test.ts`
- `apps/api/tests/integration/custom-fields/custom-fields.spec.ts`
- `apps/admin/tests/custom-fields-page.test.tsx`

**New — governance**
- `docs/adr/ADR-0037-per-tenant-custom-fields-jsonb.md`

**Modified**
- `packages/domain/src/schema/members.ts` (the `customFields` column + the GIN index declaration)
- `packages/domain/src/schema/index.ts`, `packages/domain/src/policies/index.ts`,
  `packages/domain/src/index.ts` (barrels)
- `packages/domain/src/ids/index.ts` (`PariwarCustomFieldDefinitionId`)
- `packages/domain/src/rbac/permissions.ts` (two keys; catalog 28 → 29)
- `packages/domain/src/rbac/roles.ts` (grants to `pariwar_admin` + `auditor`)
- `packages/domain/src/per-pariwar/bihar/README.md` (rewritten; D2-1.7 Closed by edit)
- `packages/domain/migrations/meta/_journal.json` (idx 95, 96)
- `packages/domain/tests/rbac/permissions.test.ts` (pin + bump ledger)
- `packages/contracts/src/index.ts` (barrel)
- `apps/api/src/server.ts` (module registration)
- `apps/admin/src/api/client.ts` (the `// ── Custom fields (Story 10.12) ──` section)
- `apps/admin/src/router.tsx` (`/p/$pariwarId/custom-fields`)
- ⚠ `scripts/schema-diff/lib.ts` + `scripts/schema-diff/lib.test.ts` (the `scannableDdl` narrowing —
  see the Completion Notes)
- `package.json` (`custom-field:check`, `custom-field:test`)
- `.github/workflows/ci.yml`, `scripts/ci-local.sh` (the new gate job)
- `docs/knowledge-transfer/adr-index.md` (row + reconciliation + breakdown)
- `docs/runbooks/multi-pariwar-provisioning.md`
- `friction-budget.md`, `.decision-log.md`
- `_bmad-output/implementation-artifacts/{deferred-work,gate-inventory,sprint-status}.*`
- `_bmad-output/implementation-artifacts/10-12-per-pariwar-custom-fields-jsonb.md`

---

## Change Log

| Date | Change |
|---|---|
| 2026-08-06 | Story created via `bmad-create-story`; status `backlog` → `ready-for-dev`. |
| 2026-08-06 | Implemented via `bmad-dev-story`; status `ready-for-dev` → `in-progress` → `review`. The fence built first (three layers, DB mirror revert-sanity proven by dropping the CHECK); registry + `members.custom_fields` + the repo's first GIN index; two keys minted (catalog 28 → 29); ADR-0037 `drafted`; D2-1.7 Closed by edit; ESCALATIONS 1–5 raised, none resolved. Two defects caught by tests (the `stateless_note` prefix flaw; the `string_array` depth off-by-one) and one shipped governance artifact touched and flagged (`scripts/schema-diff/lib.ts`). |
| 2026-08-07 | Reviewed via `bmad-code-review`; status `review` → `done`. 22 findings triaged (1 decision-needed → resolved as patch, 14 patch, 6 defer, 2 dismissed); all 14 patches applied — the `definitionsInForce()` truncation-before-fold bug (the review's most severe finding, affecting write-path validation not just display), the retire-then-republish AC2 compatibility bypass, the CI gate's alias blind spot plus a new leg (c) for AC6's un-mechanized `update(members)` claim, the `pii_tier_ck` opaque-cast risk, the admin retire idempotency-key asymmetry, three untested DB constraints, and four documentation/citation corrections. All gates and the full custom-fields test surface re-verified green against a freshly recreated `twt_dev`. |
