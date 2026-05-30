# Trustee Review Log — P0-2a Teacher Empathy Interviews

**Authority:** Story 0.8 AC-1 + README §5 sign-off lifecycle + ethics-protocol.md §8 trustee review boundary.

**Purpose:** One row per trustee review event. Append-only.

**Reviewing trustee:** ≥1 trustee reviews per AC-1; per-dimension OR pack-as-a-unit scope at trustee's choice.

**Status at author-commit (2026-05-30, Task 5):** Schema header committed. Empty rows — first trustee-review row appended at Task 10 (post-synthesis).

---

## Schema columns

| Column | Description |
|---|---|
| `review_id` | Sequential (e.g., `review-1`, `review-2` if rework triggered) |
| `review_date` | YYYY-MM-DD |
| `reviewing_trustee` | Trustee name (per Trustee Panel roster; substantive identity stored per operations policy if confidentiality applies) |
| `review_scope` | `synthesis-as-a-unit` \| `per-dimension` \| `divergence-log-focused` \| `withdrawal-driven-resynthesis` (per ethics-protocol §5) |
| `review_verdict` | `accepted` \| `accepted-with-revisions` \| `rejected-pending-rework` |
| `revision_list` | If verdict is `accepted-with-revisions`: numbered list of required revisions; otherwise `n/a` |
| `sign-off_note` | Explicit attestation: "Epic 3 substrate work may begin" — OR the gating note explaining what must close before Epic 3 may begin |
| `cross-link_to_decision_log` | `.decision-log.md` `[CONTINUITY]` entry recording the review (e.g., `Decision 2026-05-30-008-trustee-review-1`) |
| `notes` | Free-text annotations (e.g., review-mode rationale; trustee questions surfaced + answered; cross-trustee follow-up needed) |

---

## Verdict semantics

### `accepted`

- Trustee has reviewed synthesis (or per-dimension scope), divergence-log completeness, synthesis grounding in per-interview citations, pseudonymization compliance.
- Synthesis is approved as-is.
- Epic 3 substrate work may begin per sign-off note.
- AC-1 trustee-review-leg is **Closed by [edit]** per [[feedback_closure_language_precision]].

### `accepted-with-revisions`

- Trustee has identified specific revisions required (listed in revision_list column).
- Solo Builder executes revisions; re-engages trustee for re-review.
- Epic 3 substrate work MAY begin per sign-off note IF the revisions are minor + non-blocking; OR Epic 3 substrate work MUST wait for re-review IF the revisions are material per trustee's discretion.
- AC-1 trustee-review-leg is **Resolved via explicit deferral** pending re-review.

### `rejected-pending-rework`

- Trustee has identified substantive deficiencies (e.g., synthesis grounding insufficient; pseudonymization compliance breached; dimension coverage gaps).
- Solo Builder re-engages Tasks 7-9 with revised protocol per trustee feedback.
- Epic 3 substrate work CANNOT begin until subsequent trustee review verdict is `accepted`.
- AC-1 trustee-review-leg is **Resolved via explicit deferral** pending re-engagement.

---

## Quorum-unavailable fallback path (per README §5)

If the Trustee Panel cannot convene a full review within the launch window (e.g., trustee incapacitation; co-occurring sprint-change-proposal review consuming all panel bandwidth), emergency review by the Trustee Panel chair alone is valid, time-bounded 30 days, recorded as a `.decision-log.md` `[CONTINUITY]` entry with rationale per [[feedback_closure_language_precision]]. The chair review row carries:

- `review_scope = synthesis-as-a-unit-emergency-chair-review`
- `sign-off_note` includes "Emergency chair review per README §5 quorum-unavailable fallback; second-trustee re-review required within 30 days"
- `notes` cite the rationale + the 30-day re-review trigger

The chair review carries the same Epic-3-substrate-work-may-begin gating authority but the 30-day window forces re-review by a second trustee before lifting.

---

## Withdrawal-driven re-attestation (per ethics-protocol §5)

If a participant withdraws after synthesis-author-commit (per ethics-protocol §5 post-synthesis withdrawal), the synthesis is amended (per-row removal + supersession-schema marker) + trustee re-attestation is required:

- `review_scope = withdrawal-driven-resynthesis`
- `sign-off_note` confirms the synthesis re-attestation post-withdrawal
- `notes` cite the participant withdrawal (Shikshakamitra-N withdrew on YYYY-MM-DD) + the affected synthesis rows

---

## Tie-breaking (per README §5)

If multiple trustees review (independent verdicts), and verdicts disagree:

- Each trustee's verdict is recorded as a separate trustee-review-log row.
- Resolution path: Trustee Panel convenes for deliberative discussion + records consensus or majority outcome as a follow-up trustee-review-log row with `review_scope = deliberative-consensus-resolution`.
- Until the deliberative-consensus row is recorded, AC-1 trustee-review-leg is **Resolved via explicit deferral** pending consensus.

---

## Rows

### At Task 5 author-commit: empty

```
(No trustee-review rows committed at framework-author-commit. First row appended at Task 10 post-synthesis.)
```

---

## Forbidden states

- `review_verdict = accepted` without `sign-off_note` — sign-off note is the attestation substance, not optional.
- `review_verdict = accepted-with-revisions` without `revision_list` — revision_list is the actionable detail.
- Trustee-review-log row deletion — FORBIDDEN; supersession-schema is the only allowed lifecycle exit.
- Synthesis §1 `trustee-review-status` flipped to `accepted` without a corresponding trustee-review-log row — invalid; trustee-review-log is authoritative; synthesis reflects log state.
