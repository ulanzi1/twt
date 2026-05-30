# Trustee Review Log — P0-2b Bereaved-Spouse Conversation

**Authority:** Story 0.9 AC-1 trustee-review-log discipline · ethics-protocol.md §2-tris trustee-approval-pre-recruitment (P0-2b-distinct precondition) · ethics-protocol.md §8 trustee review boundary · README.md §5 sign-off lifecycle · synthesis-schema.md §10 trustee approval and review log

**Scope:** Trustee review event log capturing TWO distinct trustee review events (P0-2b-distinct from Story 0.8 which has one):
1. **Pre-conversation trustee approval** (Task 7 per ethics-protocol §2-tris) — Trustee Panel approves the framework + recruitment paths BEFORE Solo Builder approaches any candidate.
2. **Post-synthesis trustee review** (Task 10) — ≥1 trustee reviews the synthesis + signs off Epic 6 / Epic 9 / Epic 11b substrate work may begin.

Both reviews are recorded as distinct rows with different `review_scope` values.

---

## Schema header

Each trustee-review row carries the following columns:

| Column | Type | Purpose | Allowed values / notes |
|---|---|---|---|
| `review_id` | slug | Unique row identifier | E.g., `pre-conversation-001`, `synthesis-review-001` |
| `review_date` | YYYY-MM-DD | Date of review event | Single date |
| `reviewing_trustee` | text | Named trustee(s) conducting the review | E.g., "Trustee A + Trustee B"; ≥1 required; ≥2 strongly preferred for sensitivity |
| `review_scope` | enum | Type of review | `approval-for-recruitment-pre-conversation` (Task 7 per ethics-protocol §2-tris) / `synthesis-as-a-unit` (Task 10 pack review) / `per-dimension` (Task 10 dimension-by-dimension review) / `divergence-log-focused` (Task 10 divergence-focused review) / `pattern-4-evaluation-focused` (Task 10 Pattern 4 evaluation focused review) |
| `review_verdict` | enum | Verdict | For pre-conversation: `approved-for-recruitment` / `revision-list-pending-approval`; for post-synthesis: `accepted` (Epic substrate work may begin per the sign-off note) / `accepted-with-revisions` (synthesis must be revised per revision_list before Epic substrate work begins) / `rejected-pending-rework` (Tasks 7-9 cycle re-engages with revised protocol per trustee feedback) |
| `revision_list` | text (optional) | If verdict ∈ {`revision-list-pending-approval`, `accepted-with-revisions`} | Itemized list of required revisions; empty otherwise |
| `sign-off_note` | text | Explicit attestation | For pre-conversation: "Recruitment may begin"; for post-synthesis: explicit attestation per the affected-Epic-by-divergence cross-reference: "Epic 6 / Epic 9 / Epic 11b substrate work may begin per [reconciliation rows X, Y, Z]" OR gating note explaining what must close before substrate work may begin |
| `cross-link_to_decision_log` | path | `.decision-log.md` entry recording the review | E.g., `.decision-log.md Decision 2026-06-15-009-trustee-approval-001` / `.decision-log.md Decision 2026-07-20-009-trustee-review-001` |

---

## Sign-off lifecycle (per README §5)

### Pre-conversation approval (review_scope = `approval-for-recruitment-pre-conversation`)

- Required BEFORE Solo Builder approaches any candidate per ethics-protocol §2-tris.
- Verdict ∈ {`approved-for-recruitment`, `revision-list-pending-approval`}.
- Quorum-unavailable fallback: emergency review by Trustee Panel chair alone is valid, time-bounded 30 days, recorded as a `.decision-log.md` `[CONTINUITY]` entry per [[feedback_closure_language_precision]] — mirrors the Story 0.5 + 0.6 + 0.7 + 0.8 emergency-single-trustee fallback path. The 30-day clock starts at chair sign-off date.

### Post-synthesis review (review_scope ∈ {`synthesis-as-a-unit`, `per-dimension`, `divergence-log-focused`, `pattern-4-evaluation-focused`})

- Required to mark synthesis `trustee-reviewed` per README §4 invariant 11.
- Verdict ∈ {`accepted`, `accepted-with-revisions`, `rejected-pending-rework`}.
- Per-dimension ratification OR pack-as-a-unit ratification is the trustee's choice; the `review_scope` column records which.
- Multi-trustee reviews recorded as separate rows; tie-breaking via Trustee Panel deliberative discussion if disagreement.
- Quorum-unavailable fallback per pre-conversation logic.

### Cycle re-engagement (verdict `accepted-with-revisions` or `rejected-pending-rework`)

- `accepted-with-revisions`: Solo Builder revises synthesis per revision_list; re-presents; trustee re-reviews; appended as a new row.
- `rejected-pending-rework`: Tasks 7-9 cycle re-engages with revised protocol per trustee feedback; framework-author-commit may need to re-engage at Task 1-6 if framework-level revisions are required.

---

## Pre-staged pre-conversation trustee-approval row slot (Task 5 scaffold)

**The first row is pre-staged at Task 5 author-commit per Story 0.9 file Task 5 instruction.** Solo Builder MUST populate this row at Task 7 BEFORE approaching any candidate.

| review_id | review_date | reviewing_trustee | review_scope | review_verdict | revision_list | sign-off_note | cross-link_to_decision_log |
|---|---|---|---|---|---|---|---|
| pre-conversation-001 | _PENDING_TRUSTEE_MEETING_ | _PENDING_TRUSTEE_NAMES_ | approval-for-recruitment-pre-conversation | _PENDING_TRUSTEE_VERDICT_ | _ | _PENDING_TRUSTEE_SIGN_OFF_ | _PENDING_DECISION_LOG_ENTRY_ |

---

## Trustee review rows (additional rows appended at Task 7 + Task 10)

(Empty additional rows at author-commit; appended as trustee review events occur.)

| review_id | review_date | reviewing_trustee | review_scope | review_verdict | revision_list | sign-off_note | cross-link_to_decision_log |
|---|---|---|---|---|---|---|---|
| (pre-staged above) | | | | | | | |
| (synthesis-review-001 populated at Task 10) | | | | | | | |

---

## Trustee review boundary (per ethics-protocol §8)

Trustee receives:
- Synthesis (`_bmad-output/research/p0-2b-bereaved-spouse.md`)
- Per-interview note (pseudonymized; verbatim quotes only re-confirmed ones with `[quote-re-confirmed YYYY-MM-DD]` marker)
- Divergence-log
- Pattern 4 evaluation worksheet
- Recruitment-log (by-pseudonym only, NOT substantive identity)

Trustee does NOT:
- Re-interview the spouse.
- Have access to substantive identity in recruitment-log (per ethics-protocol §4 NDA territory).
- Override the spouse's re-consent decisions (per ethics-protocol §2-bis).

Trustee review verifies (per ethics-protocol §8):
- Dimension coverage (all 5 AC-named dimensions substantively populated OR explicitly marked partial-coverage with rationale).
- Pattern 4 evaluation completeness (all 8 sample-copy rows + 7 cross-cutting grief-grammar rows have per-row verdict OR explicit `not-evaluated-due-to-spouse-non-engagement` marker).
- Divergence-log completeness (every refuted-or-nuanced assumption + every Pattern 4 verdict requiring revision produces a divergence-log row).
- Synthesis grounding in per-interview citation (every synthesis row carries `Bereaved-Spouse-1 §dimension-X` citation).
- Re-consent-for-quotation compliance (every verbatim quote in synthesis carries `[quote-re-confirmed YYYY-MM-DD]` marker).
- Closure-language precision (every AC leg labeled with `Closed by [edit]` | `Resolved via explicit deferral` | `Not addressed`).
