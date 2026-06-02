# Trustee Review Log — P0-2c VI/Low-Vision Member Accessibility Validation

> **Append-only.** Carries:
> - One row per **pre-session trustee approval event** (inheriting Story 0.9 §2-tris pattern — `review_scope = approval-for-recruitment-pre-session`)
> - One row per **trustee synthesis review event** (Task 10)
>
> Per Story 0.9 P-10 review-patch precedent: any `revision_list` on `accepted-with-revisions` or `revision-list-pending-approval` verdicts is **countersigned by the reviewing trustee via a `.decision-log.md` sub-entry** to make the revision-list scope auditable.
>
> Per Story 0.9 P-23 review-patch precedent: `rejected-pending-rework` carries a `rework_scope` field — `synthesis-only` (re-engage Tasks 9-10) vs `full-pre-session-cycle` (re-engage Tasks 7-10 because rejection identifies fundamental ethics/interview-protocol defect).

## Schema columns

| Column | Type / Allowed Values |
|---|---|
| `review_id` | slug (e.g., `pre-session-001`, `synthesis-review-001`, `synthesis-review-002`) |
| `review_date` | YYYY-MM-DD |
| `reviewing_trustee` | named trustee(s); pseudonymization NOT required for trustees per Story 0.9 schema |
| `review_scope` | enum — see below |
| `review_verdict` | enum — see below |
| `revision_list` | if applicable; countersigned by trustee via `.decision-log.md` sub-entry per Story 0.9 P-10 |
| `sign_off_note` | explicit attestation: "Recruitment may begin" for pre-session; "Epic 3 / Epic 8 / Story 7.10 substrate work may begin" for post-synthesis; or gating note explaining what must close |
| `emergency_approval_expiry_date` | per Story 0.9 D-02 + P-10 — when quorum-unavailable emergency approval is used, the 30-day expiry date |
| `second_trustee_re_review_required` | boolean per Story 0.9 D-02 — true if emergency approval used; second trustee must re-review within expiry window |
| `rework_scope` | per Story 0.9 P-23 — `synthesis-only` vs `full-pre-session-cycle` (applies only to `rejected-pending-rework` verdicts) |
| `cross_link_to_decision_log` | `.decision-log.md` `[CONTINUITY]` entry recording the review |

## Review scope enum

| Value | Meaning |
|---|---|
| `approval-for-recruitment-pre-session` | Pre-session Trustee Panel approval gating recruitment per ethics-protocol §2-tris |
| `synthesis-as-a-unit` | Trustee reviews the synthesis as a whole; verdict applies to entire synthesis |
| `per-surface` | Trustee reviews per-surface synthesis sub-sections (signup / my-pool / yogdaan-bahi); verdict applies per surface |
| `divergence-log-focused` | Trustee focuses on divergence-log + reconciliation routing per AC-2 |
| `ux-dr-clause-evaluation-focused` | Trustee focuses on UX-DR clause-evaluation worksheet + accessibility-debt classification application |
| `accessibility-debt-classification-focused` | Trustee focuses specifically on `wcag-aa-defect-must-fix` vs `accessibility-debt-tracked-and-fix` boundary application (P-15 review-patch: this scope is distinct from `ux-dr-clause-evaluation-focused` in that the trustee is NOT reviewing the per-clause UX-DR verdicts themselves, but verifying that the accessibility-debt classification taxonomy has been applied correctly to each finding — i.e., that `wcag-aa-defect-must-fix` is not being mis-applied as `accessibility-debt-tracked-and-fix` to avoid an NFR-20 launch-blocker, and vice versa) |

## Review verdict enum

| Value | Meaning | Applies to |
|---|---|---|
| `pending-trustee-meeting` | Author-commit default for pre-session row; **NEVER `_PENDING_TRUSTEE_VERDICT_`** per Story 0.9 P-12 review-patch precedent | pre-session row at Task 5 commit |
| `approved-for-recruitment` | Trustee Panel grants approval; recruitment may begin | pre-session |
| `revision-list-pending-approval` | Trustee Panel provides revisions before approval; revision_list co-signed via `.decision-log.md` sub-entry | pre-session |
| `accepted` | Synthesis accepted as authoritative; substrate work may begin per sign-off note | post-synthesis |
| `accepted-with-revisions` | Synthesis accepted with required revisions; revision_list co-signed via `.decision-log.md` sub-entry | post-synthesis |
| `rejected-pending-rework` | Synthesis rejected; rework_scope ∈ {`synthesis-only`, `full-pre-session-cycle`} | post-synthesis |
| `superseded-by-pre-session-002` | Pre-session approval row superseded by a new §2-tris cycle following `full-pre-session-cycle` rework; row is audit-trail only (P-31 review-patch) | pre-session |

## Rework scope enum (per Story 0.9 P-23)

| Value | Re-engagement |
|---|---|
| `synthesis-only` | Re-engage Tasks 9-10; pre-session approval + recruitment + session conduct remain valid |
| `full-pre-session-cycle` | Re-engage Tasks 7-10; rejection identifies fundamental ethics/interview-protocol defect; new §2-tris pre-session approval cycle required |

---

## Review rows

| review_id | review_date | reviewing_trustee | review_scope | review_verdict | revision_list | sign_off_note | emergency_approval_expiry_date | second_trustee_re_review_required | rework_scope | cross_link_to_decision_log |
|---|---|---|---|---|---|---|---|---|---|---|
| `pre-session-001` | _pending_ | _pending_ | `approval-for-recruitment-pre-session` | **`pending-trustee-meeting`** | — | _pending Trustee Panel decision; sign-off note will attest "Recruitment may begin per disability-network paths enumerated in interview-protocol §0; AT-pre-flight per ethics-protocol §3.8 P0-2c-distinct precondition acknowledged; travel-reimbursement budget approved at: <amount>; time-stipend [approved at <amount> / not approved]"_ | — | false | — | _pending Decision 2026-05-31-010 sub-entry_ |

*(`synthesis-review-001` row will be appended at Task 10 trustee synthesis review.)*

---

## Notes

- **Pre-session-001 row is pre-staged at Task 5 author-commit** with `review_verdict = pending-trustee-meeting` per Story 0.9 P-12 precedent. NEVER `_PENDING_TRUSTEE_VERDICT_`.
- **Trustee Panel pre-session approval covers all four enumerated recruitment paths broadly** per Story 0.9 D-06 precedent — no re-approval for path-change between approval and recruitment as long as path stays within the enumerated set.
- **Emergency single-trustee approval** under documented trustee incapacitation is time-bounded **30 days** + carries `second_trustee_re_review_required = true` per Story 0.9 D-02 precedent.
- **`rework_scope = full-pre-session-cycle` produces a second pre-session approval row (P-31 review-patch):** new §2-tris cycle creates `pre-session-002`; the original `pre-session-001` row must be updated with `review_verdict = superseded-by-pre-session-002` and a `cross_link_to_decision_log` entry recording the supersession. Auditors can then distinguish the valid approval (`pre-session-002`) from the superseded one (`pre-session-001`).
- **Trustee does NOT have access to substantive identity** in recruitment-log per ethics-protocol §4 + §8 — only pseudonym-to-recruitment-path mapping + dates + outcome-fields are in the framework-directory log; substantive identity is out-of-band per operations policy.
