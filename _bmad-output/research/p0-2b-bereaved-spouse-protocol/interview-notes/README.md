# Interview Notes — P0-2b Bereaved-Spouse Conversation

**Authority:** ethics-protocol.md §3.5 + §4 + §6 + §2-bis re-consent-for-quotation · per-interview-note-schema.md (column-per-field schema) · interview-protocol.md §6 post-interview · README.md §7 synthesis-vs-per-interview-note reconciliation

**Scope:** This subdirectory houses the per-conversation pseudonymized note authored post-Task-8 (conversation conduct) by Solo Builder. At Task 5 author-commit (2026-05-31), this subdirectory exists with this README placeholder only; the per-interview note is authored at Task 8 post-conversation.

---

## Per-interview note file

| Filename | Pseudonym | Authored at | Schema |
|---|---|---|---|
| `bereaved-spouse-1.md` | Bereaved-Spouse-1 | Task 8 (post-conversation, within 24 hours per ethics-protocol §3.5) | per-interview-note-schema.md |

---

## Authoring discipline

- **Authored within 24 hours** of conversation per ethics-protocol §3.5 + interview-protocol.md §6.1. Timestamp `notes_authored_within_24h` recorded.
- **Pseudonymization verified** by researcher before commit — no village name, school name, named family member, named colleague, or identifying incident in the note (paraphrased to non-identifying granularity per ethics-protocol §4).
- **Re-consent-for-quotation discipline (per ethics-protocol §2-bis)** — no verbatim quotes in observation columns; candidate verbatim captured in `quotation_log` table with `re-consent-pending` status.
- **Dimension partial-coverage** is honest research outcome — `Engagement status` field records honestly if a dimension was not engaged.
- **Divergence-flags** inserted for any observation contradicting an assumption-inventory.md row.
- **Immutable after 24-hour window close** — corrections after are supersession entries per ethics-protocol §5 (withdrawal) + §2-bis (re-consent-for-quotation workflow).

---

## Withdrawal handling

If the spouse withdraws (per ethics-protocol §5):

- **Withdrawn before conversation:** no per-interview note exists; no destruction needed.
- **Withdrawn during conversation:** per-interview note (if any partial notes were captured) marked `withdrawn-during-conversation` + content destroyed.
- **Withdrawn before synthesis:** per-interview note marked `withdrawn` + content destroyed; substitute spouse triggers a new per-interview note authoring cycle per the same schema.
- **Withdrawn after synthesis:** per-interview note marked `withdrawn-after-synthesis` (retained as historical record but no longer cited); synthesis rows citing this note are removed per supersession-schema.
- **Granular quotation-withdrawal** (per ethics-protocol §2-bis): the `quotation_log` table row updated to `re-consent-confirmed-then-withdrawn-YYYY-MM-DD`; the synthesis row is amended to use paraphrase only.

---

## Archive lifecycle

Per ethics-protocol §6:
- Per-interview note retained for **6 months** post-synthesis-author-commit (bereavement-context shortened retention default vs Story 0.8's 12-month).
- At 6 months, note archived (NOT destroyed) to `interview-notes/archived/` subdirectory; archived note cited with `[archived-YYYY-MM-DD]` marker in future synthesis revision references.

---

## Cross-references

- per-interview-note-schema.md — column-per-field schema definition
- ethics-protocol.md §2-bis — re-consent-for-quotation discipline
- ethics-protocol.md §4 — identity protection
- ethics-protocol.md §5 — withdrawal procedure
- ethics-protocol.md §6 — post-synthesis data handling
- interview-protocol.md §6 — post-interview authoring discipline
- README.md §7 — synthesis-vs-per-interview-note reconciliation
- divergence-log.md — divergence-flag source data aggregation
