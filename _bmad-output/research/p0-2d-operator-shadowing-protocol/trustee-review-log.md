# Trustee Review Log — P0-2d Operator Shadowing

> **Append-only log of trustee + host-helpline-institution review actions.**
>
> Three pre-staged row slots at Task 5 author-commit:
> - `pre-shadowing-001` — Host helpline institution approval (P0-2d-distinct precondition)
> - `pre-shadowing-002` — Trustee Panel pre-shadowing approval (inheriting Story 0.9 §2-tris + Story 0.10 §2-tris)
> - `post-synthesis-001` — Post-synthesis trustee review
>
> Substantive trustee/host-helpline identity is NDA territory stored out-of-band per ethics-protocol §4. Only pseudonyms + verdict + date + sign-off note enter this log.

## Schema columns

| Column | Meaning |
|---|---|
| `review_id` | Unique identifier for the review (`pre-shadowing-001`, `pre-shadowing-002`, `post-synthesis-001`, etc.) |
| `review_date` | Date of review |
| `reviewing_authority` | Pseudonym of reviewing party (host-helpline-institution-authority-pseudonym, named-trustees, named-trustee) |
| `review_scope` | Scope of review (e.g., `approval-for-shadowing-engagement`, `approval-for-shadowing-pre-shadowing`, `post-synthesis-review`) |
| `review_verdict` | One of the verdict enum values |
| `revision_list` | If applicable to `accepted-with-revisions` or `revision-list-pending-approval` verdict; co-signed via `.decision-log.md` Decision 2026-05-31-011 sub-entry per Story 0.9 P-10 precedent |
| `emergency_approval_expiry_date` | If quorum-unavailable fallback invoked; 30-day expiry per Story 0.9 D-02 |
| `second_trustee_re_review_required` | true/false per Story 0.9 D-02 |
| `rework_scope` | For `rejected-pending-rework` verdicts: `synthesis-only` vs `full-pre-shadowing-cycle` per Story 0.9 P-23 |
| `sign_off_note` | Explicit attestation or gating note |
| `cross_link_to_decision_log` | Cross-link to `.decision-log.md` sub-entry |
| `cross_link_to_synthesis` | Cross-link to synthesis file |
| `cross_link_to_host_helpline_engagement_log` | Cross-link to `host-helpline-engagement-log.md` row |

## Verdict enum

### Pre-shadowing host-helpline-institution-approval verdicts

| Value | Meaning |
|---|---|
| `approved-for-shadowing-engagement` | Host helpline institution approves the shadowing engagement |
| `revision-list-pending-approval` | Host helpline institution provides revisions; approval pending revision integration |
| `declined-substitute-host-helpline-engaged` | Host helpline declines; substitute engaged per ethics-protocol §3.0 |
| `pending-host-helpline-meeting` | Author-commit default; awaiting host helpline meeting |

### Pre-shadowing Trustee Panel approval verdicts

| Value | Meaning |
|---|---|
| `approved-for-shadowing` | Trustee Panel approves the shadowing |
| `revision-list-pending-approval` | Trustee Panel provides revisions; approval pending revision integration |
| `declined-pending-rework` | Trustee Panel declines; rework required |
| `pending-trustee-meeting` | Author-commit default; awaiting Trustee Panel meeting |

### Post-synthesis trustee review verdicts

| Value | Meaning |
|---|---|
| `accepted` | Synthesis accepted; Epic 10 + Story 6.3 + Story 6.10 design-freeze conversations may proceed |
| `accepted-with-revisions` | Synthesis accepted with revisions; revisions integrated before downstream design freezes |
| `rejected-pending-rework` | Synthesis rejected; rework required per `rework_scope` (`synthesis-only` re-engages Tasks 9-10; `full-pre-shadowing-cycle` re-engages Tasks 7-10) |
| `pending-synthesis-completion` | Author-commit default; awaiting Task 9 synthesis completion |

---

## Review rows (pre-staged + populated at Tasks 7-10)

### `pre-shadowing-001` — Host helpline institution approval (P0-2d-distinct PRECONDITION-1)

```yaml
review_id: pre-shadowing-001
review_date: <YYYY-MM-DD or pending-host-helpline-meeting>
reviewing_authority: <HostHelpline-1 operations lead>   # or HostHelpline-1A if substitute
review_scope: approval-for-shadowing-engagement
review_verdict: pending-host-helpline-meeting
revision_list: <if applicable>
emergency_approval_expiry_date: <if applicable>
second_trustee_re_review_required: <if applicable>
rework_scope: <not applicable>
sign_off_note: <scope-of-approval covering (a) operational-disruption-tolerance + (b) operator-participation-employer-consent + (c) member-caller-privacy-posture-acknowledgment + (d) shadowing-duration ≥4-hour-across-≥2-shifts + (e) host-institution-named-contact for revocation>
cross_link_to_decision_log: ".decision-log.md Decision 2026-05-31-011 sub-entry"
cross_link_to_synthesis: "_bmad-output/research/p0-2d-operator-shadowing.md"
cross_link_to_host_helpline_engagement_log: "host-helpline-engagement-log.md HostHelpline-1 row"
```

### `pre-shadowing-002` — Trustee Panel pre-shadowing approval (PRECONDITION-2)

```yaml
review_id: pre-shadowing-002
review_date: <YYYY-MM-DD or pending-trustee-meeting>
reviewing_authority: <named-trustees>
review_scope: approval-for-shadowing-pre-shadowing
review_verdict: pending-trustee-meeting
revision_list: <if applicable; co-signed via .decision-log.md Decision 2026-05-31-011 sub-entry per Story 0.9 P-10>
emergency_approval_expiry_date: <if quorum-unavailable fallback invoked>
second_trustee_re_review_required: <true/false per Story 0.9 D-02>
rework_scope: <not applicable for pre-shadowing>
sign_off_note: <scope-of-approval — covers framework + ethics-protocol + shadowing-protocol + caller-consent-spoken-script (all six required elements per §7 confirmed; or host-helpline-approved substitute phrasing confirmed equivalent — note `caller-consent-script-substitute-approved` if substitute used) + observation-question-bank + operator-workflow-call-pattern observation worksheet + travel-and-time-stipend budget>
cross_link_to_decision_log: ".decision-log.md Decision 2026-05-31-011 sub-entry"
cross_link_to_synthesis: "_bmad-output/research/p0-2d-operator-shadowing.md"
cross_link_to_host_helpline_engagement_log: "host-helpline-engagement-log.md HostHelpline-1 row"
```

### `post-synthesis-001` — Post-synthesis trustee review

```yaml
review_id: post-synthesis-001
review_date: <YYYY-MM-DD or pending-synthesis-completion>
reviewing_authority: <named-trustee>
review_scope: post-synthesis-review
review_verdict: pending-synthesis-completion
revision_list: <if applicable; co-signed via .decision-log.md Decision 2026-05-31-011 sub-entry per Story 0.9 P-10>
emergency_approval_expiry_date: <if applicable>
second_trustee_re_review_required: <if applicable>
rework_scope: <synthesis-only | full-pre-shadowing-cycle | not applicable>
sign_off_note: <explicit attestation: "Epic 10 + Story 6.3 + Story 6.10 design freeze may proceed per the affected-Story-by-divergence cross-reference" — or gating note>
cross_link_to_decision_log: ".decision-log.md Decision 2026-05-31-011 sub-entry"
cross_link_to_synthesis: "_bmad-output/research/p0-2d-operator-shadowing.md"
cross_link_to_host_helpline_engagement_log: "host-helpline-engagement-log.md HostHelpline-1 row"
```

---

## Append-only discipline

- Rows are append-only. Verdict changes (e.g., revision-list-pending-approval → approved-for-shadowing) are recorded as **supersession rows** with `supersedes: <original_review_id>` field, NOT in-place edits.
- Substantive trustee identity + host-helpline-institution identity remain NDA territory out-of-band per ethics-protocol §4.

## Decision-log integration

For each pre-shadowing approval row, append a sub-entry to `.decision-log.md` Decision 2026-05-31-011:

```markdown
### Decision 2026-05-31-011 [SUB-ENTRY] <pre-shadowing-001 or pre-shadowing-002 or post-synthesis-001>: <review_verdict>

- Review ID: <review_id>
- Review date: <date>
- Reviewing authority: <pseudonym>
- Review scope: <scope>
- Verdict: <verdict>
- Sign-off note: <note>
- Cross-link to trustee-review-log: <row>
```
