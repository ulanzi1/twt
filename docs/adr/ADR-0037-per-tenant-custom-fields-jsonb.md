# ADR-0037: Per-tenant custom fields are an append-only registry TABLE with a code-resident vocabulary and a three-layer governance fence

> **Status:** drafted
> **Date:** 2026-08-06
> **Author:** Solo Builder (authored at Story 10.12 closure)
> **Ratifying trustees:** _(not yet ratified — see the Changelog; trustee ratification is a named forward obligation, not something Story 10.12 may assert)_

## Context

PRD **FR-54** commits per-Pariwar extensibility whose stated point is *"variation without schema migrations"*: a Pariwar must be able to record something the shared schema does not model — an alternate ID number, a school block code, a cadre grade — without a migration and without a release.

Architecture **§1.7** (`architecture.md:943-991`) is the property this ADR is the control mechanism for. It commits, as properties:

- per-Pariwar custom fields are **versioned**, with **no silent renames** and a **deprecation window** for retired fields;
- **three hard-limit classes** exist and are architecturally frozen — max payload bytes, max nesting depth, a GIN-index growth ceiling — with a per-Pariwar **cardinality bound**;
- **functional B-tree indexes** on specific JSON paths are declared per-Pariwar when a query pattern is identified, as first-class drizzle-kit migrations scoped to a single `pariwar_id`;
- the **index inventory + per-Pariwar policy** live in `packages/domain/`.

The `docs/knowledge-transfer/adr-index.md` slot reserved for this decision names four concerns: **indexing, validation, query patterns, type-safety**. This ADR covers those four, plus the registry-medium deviation and the accepted PII risk.

### The forcing conditions

1. **§1.7 and the epic name different mechanisms.** §1.7 says the medium for field definitions is *"versioned per-Pariwar JSON Schema in `packages/domain/per-pariwar/<id>/schema-v<n>.ts`"* — a **code file**. `epics.md:3603` says a `pariwar_custom_field_definitions` **registry table** stores the schemas and *"admin UI authors these per Pariwar."* A code-file edit is a release, which is exactly what FR-54 exists to avoid. One of the two had to give, and the choice is an architectural deviation either way.

2. **This is the first tenant-authored shape the engine honours.** Every other extensibility mechanism in the system — rule clauses, routing policies, feature flags, permission keys — is authored by a human through code review. Custom fields are not. The registry is the easy half; the **fence** around it is the hard half, and it had no owner.

3. **The epic's cited enforcement does not exist.** `epics.md:3605` says custom fields *"are NOT permitted to violate frozen governance (e.g., adding a `payout_destinations` field is rejected by Story 1.16c CI gate)."* Story 1.16c is `schema-diff`: an invariant scan of **committed repo state** across four roots (drizzle migrations, API route literals, contracts Zod exports). A custom field is **a key inside a JSONB payload, authored at runtime, into a database row** — none of those four. `pnpm schema:check` would pass, green and useless, while a Pariwar admin created a field literally named `payout_destinations`.

4. **`members` is a certified PII-free table** (`member_identities.ts`: *"The `members` table stays PII-FREE (Story 3.1 — it is the lifecycle anchor)"*). Hanging tenant-authored data on it is the single most likely objection to this design, and a promise is not a mitigation.

### Risks if undecided, or decided wrongly

- **Undecided:** FR-54 stays unbuilt, and each Pariwar-specific field becomes a migration and a release — the cost FR-54 exists to remove.
- **Wrongly, in the permissive direction:** a tenant authors a field named `payout_destinations`, `is_valid` or `benefit_mechanism`, and downstream code or a human reads it as authoritative. That is a forward-compat breach (FR-100) or a governance bypass, created by a form submission.
- **Wrongly, in the DDL direction:** a design in which `indexed: true` creates an index hands a tenant a lock on a hot table, an unbounded index-growth vector, and a migration-history bypass in one click.

## Decision

**Per-Pariwar custom fields ship as an append-only, RLS-scoped, trigger-protected registry TABLE for the definitions; a CODE-resident vocabulary and fence; drizzle-kit migrations for any DDL; and a three-layer runtime/DB/CI control that refuses any field naming a frozen governance concern.**

The load-bearing details:

### D1 — Split by what actually needs a migration (the §1.7 deviation)

| Concern | Medium | Why |
|---|---|---|
| Field definitions (key, type, labels, tier, bounds) | **Append-only registry table**, versioned | FR-54's whole purpose; a code-file edit is a release |
| Type allowlist, forbidden-key patterns, hard limits | **Code**, in `packages/domain/` | These are the fence. A tenant must never author the fence |
| Functional B-tree indexes on JSON paths | **drizzle-kit migration** | DDL. §1.7's migration clause binds *here*, and correctly |
| Index inventory + per-Pariwar policy | **Code**, `per-pariwar/<id>/index-inventory.ts` | §1.7 says so verbatim |

**§1.7's substantive properties all survive:** versioned ✓; no silent renames ✓ (the key is part of the version pin, so a rename is impossible *by construction* rather than by discipline); deprecation window ✓ (`retired_at`); migration-gated where DDL is involved ✓. What changes is the **storage medium for the definitions**, from a TS file to an append-only, RLS-scoped, audit-anchored, trigger-protected table — arguably a stronger record than a file.

> ⚠ **This is nonetheless a deviation from a ratified statement, and it is declared, not smuggled.** §1.7's text says `schema-v<n>.ts`. **ESCALATION 1** raises the §1.7 amendment alongside this ADR. Architecture is amended by proposal, never by a story's convenience. Until that amendment lands, §1.7's text and the shipped code disagree, and this ADR is the record of why.

### D2 — No code-resident default; versions start at 1

Story 10.1 (routing policy) and Story 10.8 (feature flags) both keep a v1 default as a code constant that owns version 1, because those registries must always resolve to *something*. Custom fields do not have that problem: **a Pariwar with no definitions has no custom fields**, which is a perfectly good state with no document to represent. A `DEFAULT_CUSTOM_FIELD_SET` would be inventing an empty thing to be the default of. Versions start at **1**; zero rows resolves to an empty frozen set.

### D3 — Validation is a hand-written imperative validator, never a runtime-constructed Zod schema

The obvious move is to compile each definition into a Zod schema at request time. Rejected — see *Alternatives*.

### D4 — v1 accepts `pii_tier: 3` only, plus a naked-PII key/label detector

Every definition **declares** `pii_tier`, restoring architecture §2.7's *"new PII fields declare their tier at schema definition"* moment for a runtime-authored field. v1 accepts only tier 3. A key or label shaped like an identifier (`aadhaar`, `pan`, `mobile`, `ifsc`, `upi`, …) is refused **regardless of the declared tier**, because a tenant declaring Tier-3 on an Aadhaar-shaped field is precisely the buggy-or-malicious tenant §1.7 exists to defend against.

### D5 — `indexed: true` is a recorded REQUEST, never an action

A tenant admin issues **no DDL, ever**. `indexed: true` records that a query pattern was identified; a human authors the functional B-tree index as a drizzle-kit migration scoped to one `pariwar_id` and adds it to `per-pariwar/<id>/index-inventory.ts`.

### D6 — Unknown keys are rejected, never dropped

A member write carrying a key with no in-force definition **fails**. Silently ignoring it turns a client bug into invisible data loss and turns a retired field into a value that vanishes without anyone being told. This is the JSONB analogue of the `.strict()` rule the contracts layer already applies everywhere.

### D7 — Members only, with the narrowing gated

FR-54, `epics.md:108` and §1.7 all name **member, claim, pool**. v1 hosts on members only. Claims are additionally guarded by §1.9/§1.13 against exactly this vector — a tenant-authored claim custom field *is* the payout-destination absorption those sections forbid — so they deserve their own story with their own fence review. The `host_entity` column exists from day one so the extension is purely additive. **The gap is real and is recorded as a gated deferral, not silently absorbed.**

### Indexing (the slot's first named concern)

- **One GIN index**, `members_custom_fields_gin_idx` — the **first GIN index in this repository**.
- **Default `jsonb_ops`, not `jsonb_path_ops`.** §1.7 asks for *"arbitrary path queries"*; `jsonb_path_ops` supports only containment (`@>`) and cannot serve the key-existence operators (`?`, `?|`, `?&`) an admin filter needs. With `jsonb_path_ops` the planner would simply ignore the index and seq-scan `members` — index write cost paid, no read benefit, and nothing in the schema saying why.
- **Size is bounded by the limit classes, and that is why they exist.** `jsonb_ops` indexes every key and value separately, so index size scales with distinct key/value pairs. The 8 KiB payload ceiling and the 32-definition cardinality bound are what make that growth predictable.
- **Per-path functional indexes are partial**, `WHERE pariwar_id = '<uuid>'`, so one tenant's index is not paid for by every tenant — §1.7's *"scoped to a single `pariwar_id`"* is a real scoping clause, not a naming convention.

### Query patterns (the slot's third named concern)

- **In force is resolved BY INSTANT**, not by "latest row": per `field_key`, the greatest `effective_at <= at`, tie-broken by `desc(version)`, excluding rows retired at or before `at`. Resolving by latest row would make a point-in-time replay return a definition that had not been published when the value was written.
- **The replay pin is `definition_set_version`** — a deterministic SHA-256 over the in-force `(field_key, version)` pairs, canonicalized with RFC 8785 — stamped onto the member row's envelope. Without it, a retirement or a widened enum silently rewrites the meaning of history.
- **The version pin is the tuple** `(pariwar_id, host_entity, field_key, version)`, not the row uuid. The uuid addresses one *row*; the tuple addresses one *meaning*.

### Type-safety (the slot's fourth named concern)

- `CUSTOM_FIELD_TYPES` is a **fixed `as const` tuple** of seven scalar-ish types, declared once in `packages/domain/src/custom-fields/types.ts`, mirrored in `@twt/contracts`, and **pinned equal by a sync-guard test** (contracts source may not import the domain — the RN Metro bundle rule — so the guard is a test, which never ships).
- The stored JSONB body and the wire body are **the same shape, byte-for-byte**, with snake_case inner keys. There is deliberately no adapter, because an adapter is exactly where camelCase/snake_case drift — this project's most repeated bug class — would live.
- `PariwarCustomFieldDefinitionId` is branded on its first PR, per the naming discipline.

## Alternatives considered

- **Definitions as versioned TS files (`per-pariwar/<id>/schema-v<n>.ts`), i.e. §1.7 as literally written.** Rejected because it makes every field a release, defeating FR-54's stated purpose (*"variation without schema migrations"*), and because the epic's admin-authoring AC cannot be built on it at all. Residual risk: the deviation is real and needs the §1.7 amendment (ESCALATION 1). **Re-consider if** trustees rule that tenant self-service authoring is undesirable — in which case the registry table becomes a build-time seed source and the admin surface is withdrawn.

- **Compile a Zod schema from each definition row at request time.** Rejected for three independent reasons: there is **no precedent in this repo** for building a Zod schema from data (the closest, `requireIdentityTransition`, is a compile-time factory over a `ZodRawShape`); **no JSON-Schema library is a dependency of any package** (`zod-to-json-schema` / `ajv` would each need their own ADR); and the two nearest analogues in the codebase — `validateRoutingPolicyRules` and `validateFlagVersionInput` — are both hand-written imperative validators accumulating a `reasons: string[]`. With seven types and four bounds the hand-written version is short, gives better error messages, and puts no interpreter over tenant-authored input on the request path. **Re-consider if** the vocabulary grows past roughly a dozen types, at which point the hand-written validator stops being obviously simpler.

- **Widen the guard so the epic's own worked example passes.** `epics.md:3603` gives "alternate ID number" as the canonical use case; it is **Tier-2** by direct analogy to §2.7's classification of the eHRMS ID. Rejected: widening means putting an un-blind-indexed, government-adjacent identifier in plaintext JSONB on the certified PII-free `members` table — a worse outcome than an unbuilt example. **ESCALATION 2** routes this to the Trustee Panel. If they rule the other way, the fix is a Tier-2 blind-index host, not a relaxed detector.

- **Extend `schema-diff` (Story 1.16c) to enforce the frozen-governance rule, as the epic's AC assumes.** Rejected as impossible in kind: definitions are database rows, and a CI gate that needs a live tenant database is not a CI gate. What shipped instead is the three-layer control, with the CI leg **honestly scoped** to what committed source can prove.

- **`jsonb_path_ops` for the GIN index.** Rejected: smaller and faster, but containment-only, so the key-existence queries §1.7's "arbitrary path queries" implies would not use it.

- **Merge semantics (PATCH) for the member value write.** Rejected: "clear this field" becomes unexpressible without a sentinel, a client holding a stale definition set could leave a retired field's value in place indefinitely, and the `definition_set_version` pin would describe only a fragment rather than the whole stored set.

- **Claims and pools as hosts in v1.** Deferred, not rejected — see D7 and the gated `deferred-work.md` entry.

## Consequences

**Operational.** `docs/runbooks/multi-pariwar-provisioning.md` gains a concrete custom-fields step. A new CI job, `custom-field-governance`, runs on every PR (`pnpm custom-field:check`, wired into both `.github/workflows/ci.yml` and `scripts/ci-local.sh`) and is recorded in `gate-inventory.md` **with its scope limit stated**. The per-Pariwar index inventory (`per-pariwar/bihar/index-inventory.ts`) is a standing artifact a human maintains; an entry with no migration behind it is a claim that an index exists when it does not.

**Security.** This is the first tenant-authored shape the engine honours, so the threat model gains a **tenant-as-author** actor. The controls: three-layer frozen-key refusal (runtime fence, DB CHECK, CI scan); Tier-3-only with a naked-PII detector; RLS tenant isolation with `FORCE`, three policies and **no DELETE grant**; an append-only immutability trigger; and a §1.5 hash-chain audit line on every publish, retire and value write. A definition authored into a neighbouring Pariwar would *govern that Pariwar's member writes*, so the RLS `withCheck` leg is load-bearing rather than routine, and is tested in both directions.

**Performance.** One GIN index on `members`, a hot table. Write amplification on every member write that touches `custom_fields`; reads gain arbitrary-path query support. `ginIndexBytes()` surfaces `pg_relation_size` against a 256 MiB alarm threshold for AR-31 observability. Definition resolution is a bounded scan (cardinality × version depth) folded in TS, not a `DISTINCT ON`.

**Cost.** Index storage per Pariwar, bounded by the payload and cardinality limits. No new vendor, no new dependency — the hand-written validator was chosen partly for this.

**Failure modes accepted, stated plainly:**

1. **The epic's own worked example does not build.** "Alternate ID number" is Tier-2 and is refused. ESCALATION 2 owns it.
2. **The three §1.7 limit classes bind only this story's write paths.** §1.7 says they bind *"every JSONB write path … no code path bypasses them"* — they currently bind **none** of the repo's ~20 other JSONB columns. This story lands `limits.ts` as the destination and says so in that module's header rather than letting a future reader assume coverage. **ESCALATION 3.**
3. **§1.7's "write-rate limit when approached" on the GIN ceiling is not built.** What ships is the observed signal. ESCALATION 3.
4. **Claims and pools are unhosted.** A real FR-54 coverage gap, gated (D7).
5. **No member-facing renderer.** Values are written through the API only. The UX spec has no form-builder grammar and §11 calls component grammar tenant-invariant, so building one would mean inventing UX. **ESCALATION 5.**
6. **The CI leg proves nothing about definition CONTENT in any tenant database.** It cannot; layers 1 and 2 do that. The gate's README says this in plain words rather than overclaiming.

**Migration / pivot path.** Reversing this decision means: stop accepting publishes (revoke `pariwar.manage_custom_fields`), export the definition rows to `per-pariwar/<id>/schema-v<n>.ts`, and keep the table read-only for the deprecation window so stored values stay interpretable. The table is append-only with no DELETE grant, so nothing is lost by pivoting. **Trigger conditions:** trustees reject the §1.7 amendment (ESCALATION 1); or a tenant-authored field is found to have reached around a control despite all three layers.

## References

- [Source: architecture.md §1.7, lines 943-991] — the versioned per-Pariwar custom-field property + the three frozen limit classes (the property this ADR controls)
- [Source: architecture.md §1.8, lines 995-1023] — the online-migration rule for hot tables (`members` is named)
- [Source: architecture.md §1.2, lines 722-761] — RLS multi-tenant isolation
- [Source: architecture.md §1.9 line 1041-1045 + §1.13 Hook 2 lines 1157-1168] — the claim-aggregate and FR-100 non-add guards behind D7
- [Source: architecture.md §2.7, lines 1507-1531] — PII tiers declared at schema definition
- [Source: PRD FR-54, `prd.md:843-845`] — "variation without schema migrations"
- [Source: epics.md, Story 10.12, lines 3593-3605] — owning Story; line 3603 the worked example, line 3605 the unenforceable 1.16c citation
- [Source: epics.md, lines 513-529] — the architectural freeze table the denylist covers
- [Source: `implementation-readiness-report-2026-05-28.md:680-704`] — IR Item-16: "Story 10.12 should reference this policy review mechanism in its AC" (applied to §1.7, never applied to the epic; landed in `limits.ts`)
- [Source: `ux-design-specification.md:2254-2262`, `:2465`, `:2379`] — §11 per-Pariwar configurability limits; admin surfaces English-primary
- [Source: `docs/knowledge-transfer/adr-index.md`] — the live index row for this ADR
- [Source: `.decision-log.md`, Decision 2026-08-06-082] — the author-commit entry
- ADR-0030 — `withCompensatingAudit` as the sole sanctioned mutation+audit pairing
- Memory: [[feedback_architecture_vs_adr_boundary]] — the ADR records the control; the architecture records the property
- Memory: [[feedback_supersede_never_reinterpret]] — why the §1.7 deviation is escalated rather than read into the existing text
- Memory: [[feedback_gate_scope_semantic_coverage]] — why every fence layer carries a revert-sanity test
- Memory: [[feedback_verify_before_committing_governance_claims]] — why this ships `drafted`, not `ratified`

---

## Changelog

| Date | Status flip | Author | Notes |
|---|---|---|---|
| 2026-08-06 | (initial draft) | Solo Builder | Authored under Story 10.12 (per-Pariwar custom fields JSONB). Status `drafted` — **trustee ratification is a named forward obligation and is NOT asserted here**. Ships alongside ESCALATION 1 (the §1.7 amendment proposal), ESCALATION 2 (the Tier-2 worked example), ESCALATION 3 (the repo-wide JSONB limit gap). |
