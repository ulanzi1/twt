# Sprint Change Proposal — §1.7 Architecture Amendment (Story 10.12 Escalation 1)

- **Date:** 2026-08-07
- **Author:** BigDev (via `bmad-correct-course`)
- **Input artifact:** Decision `2026-08-06-082` (Story 10.12 implementation record, D1) · `docs/adr/ADR-0037-per-tenant-custom-fields-jsonb.md` (`drafted`)
- **Trigger:** Story 10.12 (Per-Pariwar Custom Fields JSONB) shipped its field-definition registry as an append-only TABLE, a declared deviation from architecture §1.7's ratified text, which names a versioned code file (`packages/domain/per-pariwar/<id>/schema-v<n>.ts`) as the medium. The deviation was correctly declared rather than smuggled at ship time (Decision `082`), but the amendment itself was never raised — this proposal raises it.
- **Change scope classification:** **Minor edit, Major gate** — the diff is a single-section documentation correction; landing it requires Trustee Panel sign-off because it edits ratified architecture text (see §3 Recommended Approach).
- **Mode:** Incremental
- **Status:** **Approved 2026-08-07 by the Trustee Panel, subject to one condition — applied below**

### Condition of approval (Trustee Panel, 2026-08-07)

| # | Condition | Applied at |
|---|---|---|
| 1 | Incorporate a sentence clarifying that only tenant-authored field definitions live in the registry, while all governance constraints remain code-owned | §4.1 — new lead bullet |

---

## Section 1 — Issue Summary

### 1.1 The conflict

Architecture **§1.7** (`architecture.md:966-971`, "Custom-field evolution") commits the definition medium as a **code file**:

> *"Versioned per-Pariwar JSON Schema in `packages/domain/per-pariwar/<id>/schema-v<n>.ts`."*

`epics.md:3603` independently specifies a **registry table** with tenant self-service admin authoring:

> *"the `pariwar_custom_field_definitions` registry stores per-Pariwar JSONB schemas … admin UI authors these per Pariwar."*

These are two different mechanisms for the same concern, and PRD **FR-54**'s stated purpose — *"variation without schema migrations"* — only one of them can serve: a code-file edit is a release. Story 10.12 built the registry table and declared the deviation in its own ADR (`ADR-0037` D1) and in Decision `2026-08-06-082`, raising it as **ESCALATION 1** rather than editing §1.7 unilaterally, per this project's own standing rule: *"Architecture is amended by proposal, never by a story's convenience."*

### 1.2 Why this is not a re-litigation

The design choice itself is not in question here — it already shipped, is tested, and is recorded as justified in ADR-0037 D1 (table mapping each §1.7 concern — field definitions, the fence, index DDL, index inventory — to its correct medium, with all four of §1.7's substantive properties preserved: versioned, no silent renames, deprecation window, migration-gated DDL). What's open is narrower: **§1.7's text still describes a mechanism the codebase does not implement**, and the ratified statement and the shipped system now disagree. This proposal closes that gap.

### 1.3 Evidence

- `architecture.md:967-968` — the code-file medium clause.
- `epics.md:3603` — the registry-table clause it conflicts with.
- `docs/adr/ADR-0037-per-tenant-custom-fields-jsonb.md` D1 — the shipped design + the property-preservation argument.
- `.decision-log.md` Decision `2026-08-06-082` — the author-commit record naming this as Escalation 1, owner Trustee Panel / architecture.
- Verified against the live repo: `packages/domain/src/per-pariwar/bihar/` contains `index-inventory.ts` + `README.md` only — `schema-v<n>.ts` was never created, confirming the deviation is real, not theoretical.

---

## Section 2 — Impact Analysis

**Epic impact:** None. Story 10.12 (Epic 10) is already shipped and `done` in `sprint-status.yaml`; this is a documentation reconciliation after the fact, not new engineering. No other epic or story was found to depend on the code-file medium. The one adjacent coverage gap — claims/pools not yet hosting custom fields (ADR-0037 D7) — is a separate, already-gated deferral with its own future story and is **out of scope** for this proposal.

**Story impact:** None. No story text changes.

**Artifact conflicts:**
| Artifact | Conflict | Disposition |
|---|---|---|
| `architecture.md` §1.7 (`:966-971`) | Names code-file medium; shipped system uses a registry table | **Edit proposed below** |
| `architecture.md` directory tree (`:4386`) | Shows `schema-v<n>.ts`, which was never created | **Edit proposed below** |
| `architecture.md` §1.7 opening line (`:945-946`) | Reads "JSON Schema definitions in `packages/domain/`" — medium-agnostic | Reviewed, **left untouched** — not literally false under either medium |
| `architecture.md` §1.7 JSONB hard-limits paragraph (`:973-991`) | Belongs to the separate, still-open Escalation 3 | **Out of scope**, not touched |
| PRD | FR-54's stated intent ("variation without schema migrations") is served *better* by the table medium | No conflict, no PRD change |
| UX spec | Not touched by this amendment (UX-grammar gap is Escalation 5, separately gated) | No change |
| `docs/adr/ADR-0037-*.md` | Its Alternatives-Considered note flags the amendment as pending | One-line pointer note once landed — not rewritten |
| `.decision-log.md` | Decision `082` stays as-is (never edited in place) | New entry records the amendment |
| `docs/knowledge-transfer/adr-index.md` | ESCALATION 1 note references the amendment as open | Pointer update once landed |
| `deferred-work.md` | Checked — the Story 10.12 deferred-work batch (2026-08-06) gates Escalations 2/3/5 only; Escalation 1 was never tracked there (it lived in `.decision-log.md` / ADR-0037) | No entry to close — correction noted, not a new edit |

**Technical impact:** None — no code, schema, migration, or test is touched. This is a documentation-only change.

---

## Section 3 — Recommended Approach

**Selected: Option 1 (Direct Adjustment) — edit §1.7's text to match the shipped, already-justified design — gated on Trustee Panel sign-off before landing.**

- **Rollback (Option 2)** is not viable: there is nothing defective to roll back. The shipped design is correct; reverting Story 10.12 would remove the three-layer governance fence for no benefit.
- **MVP review (Option 3)** is not viable: FR-54's scope is unaffected.
- **Direct adjustment** is right, but the mechanical simplicity of the edit does not change its governance weight. Per this project's own precedent — Decision `2026-08-06-080`, where the Trustee Panel ratified the R7(F)/(G) text amendment to `docs/legal/niyamavali.md` §3.1 before the ratified text was edited — a ratified architecture clause is not self-amending, even when the author of the original deviation is also the one proposing the fix. **The diff is drafted now (Section 4); landing it is gated on Trustee Panel review**, recorded as a new `.decision-log.md` entry using the same pattern as Decision `080`.

**Effort:** Low (single-section text edit, ~15 lines, no code). **Risk:** Low (no code/schema/test surface touched; the design being documented has already shipped and passed its own test suite).

---

## Section 4 — Detailed Change Proposals

### 4.1 `architecture.md` §1.7 "Custom-field evolution" (lines 966-971)

```diff
 **Custom-field evolution:**
-- **Versioned per-Pariwar JSON Schema** in
-  `packages/domain/per-pariwar/<id>/schema-v<n>.ts`.
-- **Custom-field migrations** are first-class drizzle-kit migrations, scoped to a single
-  `pariwar_id`; no silent renames.
-- Old fields supported in readers until a deprecation window closes.
+- **Only tenant-authored field definitions — key, type, labels, tier, bounds — live in
+  the registry; every governance constraint on what a definition may declare is
+  code-owned, never tenant-authored.**
+- Field definitions live in an append-only, versioned, RLS-scoped registry table
+  (`pariwar_custom_field_definitions`). The immutable identity of a definition is
+  `(pariwar_id, host_entity, field_key, version)`; changing `field_key` therefore
+  creates a new definition rather than modifying an existing one.
+- The type allowlist, forbidden-key patterns, and system-level hard limits remain CODE in
+  `packages/domain/`; a tenant must never author the fence that governs its own writes.
+- **Functional B-tree indexes** on specific JSON paths remain first-class drizzle-kit
+  migrations, scoped to a single `pariwar_id`; the index inventory + per-Pariwar policy
+  remain in `packages/domain/per-pariwar/<id>/index-inventory.ts`.
+- Old fields supported in readers until a deprecation window closes (`retired_at`).
```

**Rationale:** Reconciles §1.7 with the shipped design (ADR-0037 D1 / Decision `2026-08-06-082`). All four of §1.7's substantive commitments — versioned, no silent renames, deprecation window, migration-gated DDL — are restated explicitly under the new medium, not dropped. The composite-identity framing (`pariwar_id, host_entity, field_key, version`) states *why* renames are impossible rather than merely asserting that they are, and separating "system-level hard limits" from the type/key fence keeps this edit's boundary from blurring into Escalation 3's still-open scope. The lead bullet is the Trustee Panel's approval condition, stated as the section's framing invariant rather than buried in a sub-clause.

### 4.2 `architecture.md` directory-tree illustration (line 4386)

```diff
     │   │   ├── per-pariwar/
     │   │   │   └── bihar/
     │   │   │       ├── manifest.ts     # Pariwar identity envelope (RE6-2)
-    │   │   │       └── schema-v<n>.ts
+    │   │   │       └── index-inventory.ts  # Functional B-tree index inventory (§1.7 D1)
```

**Rationale:** Matches actual repo state — `schema-v<n>.ts` was never created.

### 4.3 Downstream pointers (applied only after §4.1/§4.2 land, each a pointer note, not a rewrite)

| Artifact | Change |
|---|---|
| `docs/adr/ADR-0037-per-tenant-custom-fields-jsonb.md` | One-line note in the Alternatives-Considered entry: amendment landed, pointing at the new decision entry |
| `.decision-log.md` | New entry: "§1.7 amended per this proposal" (+ ratification outcome) |
| `docs/knowledge-transfer/adr-index.md` | ESCALATION 1 note flips from open to closed, pointing at the new decision entry |
| `deferred-work.md` | None — verified the Story 10.12 batch never gated Escalation 1 there |

---

## Section 5 — Implementation Handoff

**Scope classification: Minor edit, Major gate.**

- **Drafting (§4.1, §4.2):** Complete in this proposal — no further Developer work needed to produce the diff.
- **Landing:** Gated on **Trustee Panel review and sign-off**. Recipient: Trustee Panel (or whoever holds that authority for this project). Responsibility: rule on whether the §1.7 text amendment is ratified as drafted, amended further, or rejected.
- **On approval:** BigDev applies the `architecture.md` diffs verbatim, records a new `.decision-log.md` entry (pattern: Decision `080`), and applies the downstream pointer updates in §4.3 (`deferred-work.md` needs none — verified it never gated this escalation).
- **On rejection or requested changes:** Return to this proposal's Section 4 for revision; no code or shipped behavior is affected either way, since the underlying design is unchanged regardless of the ruling.
- **Success criteria:** `architecture.md` §1.7 and the shipped Story 10.12 design agree; Escalation 1 is closed with a `.decision-log.md` provenance trail; ADR-0037 no longer carries an open pointer to an unraised amendment.

**Not addressed by this proposal (separate, already-gated escalations, unaffected):** Escalation 2 (Tier-2 worked example), Escalation 3 (JSONB limit classes' repo-wide binding), Escalation 4 (`[PRIMITIVE]` label), Escalation 5 (UX grammar).
