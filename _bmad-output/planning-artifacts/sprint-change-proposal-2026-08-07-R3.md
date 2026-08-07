# Sprint Change Proposal — Story 10.12 Escalation 4 (`[PRIMITIVE]` Label vs. Admin UI vs. One-Slice Discipline)

- **Date:** 2026-08-07
- **Author:** BigDev (via `bmad-correct-course`)
- **Input artifact:** Decision `2026-08-06-082` (Story 10.12 implementation record, ESCALATION 4) · `_bmad-output/implementation-artifacts/10-12-per-pariwar-custom-fields-jsonb.md:270`
- **Trigger:** Story 10.12 is labelled `[PRIMITIVE]` but ships an admin UI, apparently in tension with `epics.md:568`'s one-slice-one-surface discipline ("each story modifies API OR admin UI OR mobile UI"). The original escalation compared this against Story 10.6 (`[PRIMITIVE]`, no UI) and flagged a mismatch without resolving it.
- **Change scope classification:** **Minor** — a single cross-cutting-commitment bullet amendment in `epics.md`, confirmed NOT gated by the Trustee-Panel-ratification-required `## Architectural Freeze Boundaries` table.
- **Mode:** Incremental
- **Status:** **Approved 2026-08-07 by BigDev**

---

## Section 1 — Issue Summary

### 1.1 The apparent conflict

`epics.md:568` states the one-slice-one-surface discipline: *"each story modifies API OR admin UI OR mobile UI... this bounds story file-churn for solo-build dev-agent context windows."* Story 10.12 is labelled `[PRIMITIVE]` ("substrate building block consumed downstream" per the label legend) yet its AC8 builds a full admin page. The original escalation, recorded at Story 10.12's own closure, compared this against Story 10.6 (bulk-ops framework, also `[PRIMITIVE]`, shipped no UI at all) and flagged the pattern as a mismatch without resolving it.

### 1.2 New evidence: the wrong sibling was compared

Verified live during this proposal's research: **Story 10.8** (Feature Flags Per Cohort), also `[PRIMITIVE]`, also `done`, already ships a tenant-scoped admin authoring UI — `apps/admin/src/modules/feature-flags/FeatureFlagsPage.tsx` + `apps/admin/src/routes/FeatureFlagsRoute.tsx` at `/p/:pariwarId/feature-flags`. Story 10.12's own AC8 states its admin page *"follows the feature-flags template exactly"* — same prop pattern, same session-gate doctrine, same client-boundary discipline. **Story 10.12 is not an isolated deviation; it is the second deliberate instance of a pattern Story 10.8 established first.** The original escalation's comparator (10.6) was the wrong one — a code-consumed primitive with no tenant-facing authoring need, structurally different from a tenant-authored registry.

### 1.3 Why this recurs specifically for tenant-authored registries

A `[PRIMITIVE]` whose consumer is downstream *code* (10.6's `bulkExecute()`) needs no UI. A `[PRIMITIVE]` whose consumer is a *tenant admin* — a human who must author a feature-flag cohort rule, or a custom-field definition — has no way to do that without a form. The UI is not a separate surface bolted onto the primitive; it is the primitive's only viable population mechanism.

### 1.4 Governance weight, checked

`epics.md:568`'s bullet lives in the informal *"Cross-cutting commitments"* list under `## Epic List` — verified **not** one of the 15 numbered rows in the separate `## Architectural Freeze Boundaries` table (`epics.md:510-535`), which is the one requiring *"an ADR or trustee-ratified Sprint Change Proposal."* This escalation is engineering-process documentation, not a frozen architectural property — lower governance weight than Escalations 1-3.

---

## Section 2 — Impact Analysis

**Epic impact:** None — Stories 10.8 and 10.12 are both already `done`; this is a documentation correction, not reopened engineering.

**Story impact:** None. No story text, AC, or label is edited on either story — the historical record (including Decision `082`'s original escalation text) stays as-is, per this project's never-edit-history convention.

**Artifact conflicts:**
| Artifact | Conflict | Disposition |
|---|---|---|
| `epics.md:568` | One-slice discipline reads as an absolute rule with no named exception for the tenant-authored-registry pattern | **Edit proposed below** |
| `epics.md` label legend (repeated per-epic) | Generic wording, doesn't need to change — the exception belongs with the discipline it qualifies | Left untouched |
| `deferred-work.md` | Checked — no Escalation 4 entry exists there (same finding as Escalation 1); nothing to close | No edit |
| `docs/adr/ADR-0037-*.md` / `docs/knowledge-transfer/adr-index.md` | Checked — Escalation 4 was never one of ADR-0037's three escalations | No edit |
| `.decision-log.md` | — | New entry records the ruling |

**Technical impact:** None. No code, schema, or architecture surface touched.

---

## Section 3 — Recommended Approach

**Selected: Option A — codify the exception in `epics.md:568`.**

- **Option B (relabel 10.8/10.12 to `[SURFACE]`)** rejected: it would misstate what each story actually delivered. Story 10.12's admin page is one AC (AC8) out of eleven; the story's substantive weight is the registry schema, the three-layer governance fence, and the validation discipline. Relabeling to `[SURFACE]` overweights the smallest part of the story.
- **Option C (leave as-is)** rejected: this is now a twice-repeated pattern (10.8, then 10.12 deliberately modeled on it). Per this project's own discipline around naming a pattern once it has a genuine second instance — not before, not indefinitely after — this is the correct moment to codify it, not premature and not overdue.

**Effort:** Trivial (one bullet amendment). **Risk:** None (documentation only, evidence-based on two already-shipped, already-reviewed stories).

---

## Section 4 — Detailed Change Proposal

### 4.1 `epics.md:568` — Cross-cutting commitments, one-slice-one-surface discipline

```diff
 > - **One-slice-one-surface story discipline** — each story modifies API OR admin UI OR mobile UI
 >   (contract-first via `packages/contracts/`); the next story consumes the previous story's
 >   contract. This bounds story file-churn for solo-build dev-agent context windows.
+>   **Named exception (first established by Story 10.8 and independently confirmed by Story
+>   10.12):** A `[PRIMITIVE]` registry whose only viable population mechanism is
+>   administrator-authored data — not downstream code — may include the minimal administrator
+>   authoring surface that is intrinsic to the primitive's existence. The UI must exist solely to
+>   author or maintain that primitive and must not evolve into an independent product surface. The
+>   API and that authoring surface constitute one economic unit rather than two independent
+>   surfaces. This does not change the story's classification to `[SURFACE]`; the story's primary
+>   deliverable remains the primitive (schema, validation, governance, and enforcement).
```

**Rationale:** States the exception generally (not pinned to only ever apply to these two named stories), grounded in two independently-verified live instances, and explicitly preserves the classification boundary (why this isn't `[SURFACE]`) so a future reader doesn't read the exception as a license to attach arbitrary UI to any `[PRIMITIVE]`.

---

## Section 5 — Implementation Handoff

**Scope classification: Minor.** Direct text edit, no coordination needed beyond this approval.

- **Recipient:** BigDev (Developer role).
- **Deliverables:** `epics.md:568` edit (§4.1); new `.decision-log.md` entry recording the finding and the ruling.
- **Success criteria:** The one-slice discipline's text no longer reads as contradicted by two already-shipped, already-reviewed stories; a future tenant-authored-registry primitive has a named precedent to cite instead of re-litigating the question.

**Remaining open from the original nine escalations:** 10.12 Escalation 5 (UX grammar gap — needs `bmad-ux`) and 10.26 Escalation 5 (missed-cycle member surface — six recorded questions, two blocking).
