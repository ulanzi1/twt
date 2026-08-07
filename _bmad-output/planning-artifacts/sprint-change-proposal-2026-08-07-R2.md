# Sprint Change Proposal — Story 10.12 Escalations 2 & 3 (Tier-2 Worked Example / JSONB-Limit Repo-Wide Coverage)

- **Date:** 2026-08-07
- **Author:** BigDev (via `bmad-correct-course`)
- **Input artifact:** Decision `2026-08-06-082` (Story 10.12 implementation record, ESCALATIONS 2 & 3) · `docs/adr/ADR-0037-per-tenant-custom-fields-jsonb.md` · `deferred-work.md:2950-3003`
- **Trigger:** With ESCALATION 1 closed (Decision `2026-08-07-083`), two further Trustee-Panel-owned rulings from Decision `082` remain open: (2) the epic's own worked example for custom fields is Tier-2 and fails the shipped Tier-3-only guard; (3) the three §1.7 JSONB hard-limit classes are architecturally frozen to bind every JSONB write path but currently bind only Story 10.12's own.
- **Change scope classification:** **Minor** — one epic-text edit + a deferred-work re-trigger clarification. No architecture, PRD, code, or new-story impact from either ruling as decided.
- **Mode:** Incremental
- **Status:** **Approved 2026-08-07 by the Trustee Panel** — Escalation 2: Option A (rewrite the epic example). Escalation 3: Option B (accept as a named, gated deferral with concrete re-triggers).

---

## Section 1 — Issue Summary

### 1.1 Escalation 2 — the epic's own worked example is unbuildable

`epics.md:3603` gives *"alternate ID number"* as custom-fields' canonical use case. Architecture §2.7 (`architecture.md:1520-1524`, verified live) classifies the analogous eHRMS ID as **Tier-2** (blind index), but Story 10.12 v1 accepts `pii_tier: 3` only, plus a naked-PII key/label detector — because `members` is a certified PII-free table (Story 3.1) and ADR-0037 already rejected widening the guard, with a stated rationale: doing so would put an un-blind-indexed, government-adjacent identifier in plaintext JSONB on the PII-free table. The epic's own example fails the guard the same ADR justified. This is not a documentation slip; it is a real, if narrow, design tension between FR-54's illustrative example and §2.7's classification discipline — raised, not resolved, at Story 10.12 close.

### 1.2 Escalation 3 — the frozen limit classes bind one write path, not "every" one

Architecture §1.7 states, verbatim: *"The existence of these three limit classes is architecturally frozen — every JSONB write path is subject to all three; no code path bypasses them."* Verified live: **21 files** under `packages/domain/src/schema/` declare `jsonb(`-typed columns (`events_log.payload`, `clause_versions.payload`, `cohort_definition`, `policy_document`, `member_scope_context`, and others); exactly **one** — `pariwar_custom_field_definitions` / the Story 10.12 member-write path — imports and enforces `packages/domain/src/custom-fields/limits.ts`. The module's own header (read directly) states this as an "honest coverage admission" rather than claiming repo-wide coverage. §1.7's GIN write-rate throttle ("write-rate limit when approached") is also unbuilt — only an observed `pg_relation_size` signal ships.

### 1.3 Why these are Trustee-Panel scope rulings, not engineering defects

Neither escalation reflects a bug in what shipped. Both are places where Story 10.12 correctly declared a boundary rather than silently overclaiming or silently overreaching — the same discipline that produced ESCALATION 1. What's open is a **scope choice** (2: which artifact is wrong) and a **coverage-gap ruling** (3: commission remediation now, or accept and name the gap).

---

## Section 2 — Impact Analysis

**Epic impact:**
- **Escalation 2:** A single-line AC edit to Story 10.12 in `epics.md` (already `done` — this is a text correction, not a reopened story). A Tier-3-safe replacement example was found already present in this repo's own `ADR-0037` Context section (*"an alternate ID number, a school block code, a cadre grade"*) — "cadre grade" and "school block code" are Tier-3 by direct analogy to §2.7's own `school`/`district`/`designation` classification. No epic besides 10.12 references this example.
- **Escalation 3:** No epic text change under the selected option (Option B). Had Option A been chosen, precedent exists for where it would land: **Epic 14** already hosts exactly this class of late-arriving `[GOVERNANCE]` closure story (14.4 FR-100 schema-diff continuous gate, 14.7 ADR backlog ratification) — noted for the record in case this is revisited.

**Story impact:** One AC line in Story 10.12 (already-shipped story, text-only). No other story touched.

**Artifact conflicts:** No PRD conflict (FR-54 doesn't specify a tier). No architecture.md conflict for either escalation — §1.7's text is already accurate about what's frozen (the *existence* of the limit classes); the gap is implementation coverage, correctly tracked in `deferred-work.md`, not a disagreement with ratified architecture text. No UX conflict.

**Technical impact:** None from the Trustee Panel's ruling itself. Only if the ruling commissions a new story (Tier-2 host support or repository-wide JSONB limit coverage) does engineering work begin, and that work must receive its own story, acceptance criteria, technical analysis, and implementation review. Neither condition is triggered by the rulings recorded here.

---

## Section 3 — Recommended Approach

**Escalation 2 — Option A selected (rewrite the epic's example).** Rollback is inapplicable (Story 10.12's guard is correct, not defective). MVP review is inapplicable (FR-54 scope unaffected). Between the two direct-adjustment options, Option A is effort-trivial and risk-free — the replacement example is already textually present in this project's own ADR, so nothing is invented. Option B (commission a Tier-2 host) remains available on request but is not justified by an example-wording problem alone.

**Escalation 3 — Option B selected (accept as a named, gated deferral).** The coverage gap is real and stays real — this ruling does not mechanize anything. Repository-wide mechanization is not rejected; it is deferred until there is evidence that another JSONB write path requires the same architectural guarantees §1.7 freezes. At that point the work should be commissioned as its own governance story — Epic 14's `[GOVERNANCE]` closure pattern is the precedented home — rather than inferred from Story 10.12 alone. The existing `deferred-work.md` entries already state the gap honestly; what they lacked was a concrete, non-circular re-trigger, which this ruling supplies.

**Effort:** Low for both (one text edit; one deferred-work clarification). **Risk:** Low — no code, schema, or architecture surface touched by either ruling as decided.

---

## Section 4 — Detailed Change Proposals

### 4.1 Escalation 2 — `epics.md:3603` (Story 10.12 AC)

```diff
 **Then** the `pariwar_custom_field_definitions` registry stores per-Pariwar JSONB schemas
-(e.g., a Pariwar can add an "alternate ID number" field to members); admin UI authors
-these per Pariwar
+(e.g., a Pariwar can add a "cadre grade" field to members — Tier-3 by direct analogy to
+the existing `designation` field, §2.7); admin UI authors these per Pariwar
```

**Rationale:** Closes the gap between the epic's canonical example and the shipped Tier-3-only guard, using an example this project's own `ADR-0037` already named as a valid alternative — no new precedent invented.

### 4.2 Escalation 3 — `deferred-work.md` re-trigger clarification (`:2950-2969`)

```diff
 - **The three §1.7 hard-limit classes bind ONLY Story 10.12's own write paths (ESCALATION 3).**
   …
-  **Re-trigger:** ESCALATION 3's disposition. Flag at that point whether this warrants its
-  own gate story (a `jsonb-limits` invariant scan asserting every `jsonb(` column's writer
-  imports the constants) rather than a per-column sweep.
+  **RULED 2026-08-07 (Decision 2026-08-07-084): accepted as a named, gated deferral — not
+  commissioned as a story now.** **Re-trigger:** the first JSONB write path outside
+  `custom-fields/` that is shown (through implementation, incident, or code review) to
+  require architectural payload or nesting limits equivalent to §1.7 but lacks a
+  mechanized enforcement. If a `jsonb-limits` invariant gate is commissioned later, Epic
+  14's `[GOVERNANCE]` closure stories (14.4, 14.7) are the precedented home.

 - **§1.7's "write-rate limit when approached" on the GIN growth ceiling is NOT built
   (ESCALATION 3).** …
-  **Re-trigger:** the first Pariwar whose observed reading approaches the budget.
+  **RULED 2026-08-07 (Decision 2026-08-07-084): accepted as a named, gated deferral.**
+  **Re-trigger:** the first Pariwar whose observed `ginIndexBytes()` reading approaches
+  the 256 MiB alarm threshold. (Unchanged — already concrete.)
```

**Rationale:** The prior re-trigger ("ESCALATION 3's disposition") was circular — this ruling *is* that disposition, so it needed replacing with a condition that can actually fire in the future, not one already satisfied by the text containing it.

---

## Section 5 — Implementation Handoff

**Scope classification: Minor.** Both changes are direct-adjustment text edits with no code, schema, or architecture impact.

- **Recipient:** BigDev (Developer role) — no PO/Architect coordination needed, no backlog reorganization.
- **Deliverables:** `epics.md:3603` edit (§4.1); `deferred-work.md` re-trigger edit (§4.2); a new `.decision-log.md` entry recording both rulings (pattern: Decision `083`); pointer updates to `docs/knowledge-transfer/adr-index.md` and `ADR-0037`'s Changelog closing ESCALATIONS 2 and 3.
- **Success criteria:** `epics.md`'s custom-fields example passes the shipped Tier-3-only guard; `deferred-work.md`'s JSONB-limit entries carry concrete, non-circular re-triggers instead of a self-referential one; both escalations show CLOSED in `.decision-log.md` with the ruling type recorded (scope choice vs. accepted gap) so a future reader doesn't conflate them with ESCALATION 1's architecture-text amendment.
- **Not commissioned by this proposal:** Story 10.27 (Tier-2 blind-index host) and Story 14.8 (`jsonb-limits` gate) — both drafted as stubs during this proposal's review, neither selected. Recorded here so the stubs aren't lost if either re-trigger fires later.

**Remaining open from Decision `082`'s original batch:** Escalation 4 (`[PRIMITIVE]` label vs. one-slice discipline — low-stakes, likely a prose fix) and Escalation 5 (UX grammar gap — needs a `bmad-ux` pass, not `bmad-correct-course`).
