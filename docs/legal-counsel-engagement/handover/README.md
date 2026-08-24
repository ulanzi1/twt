# Counsel Handover Pack — 2026-08-24

Printable documents for handover to the **Trustee Panel** and **Adv. Mohit Agrawal**, plus the
scripts that generate them.

| File | For | What it is |
|---|---|---|
| `TWT-Counsel-Engagement-Framework-2026-08-24.docx` | Trustee + Counsel | The engagement framework as it stands: nature, verified qualifications, review scope, opinions given, custody of instruments, outstanding items. |
| `TWT-Terms-and-Conditions-DRAFT-v0.1-for-counsel-review.docx` | Counsel | ⭐ **The priority-1 review artefact** — `epic-2-tc-draft-v1`. 16 clauses + a 7-question annex. |

## ⛔ Status of the T&C draft — read before circulating

- ⛔ **UNREVIEWED. Not adopted, not published, not shown to any member.** Marked so on its face.
- ⛔ **NOT YET SUBMITTED.** Authoring and submitting are **different acts**;
  `review-artifact-roster.md` reserves submission to *"Solo Builder + Trustee Panel … outside the
  dev-story scope"*, so Row 1 stays `pending-submission` and `actual_submission_date` stays
  `<PENDING-TASK-10>`. ⚠ Flipping it is a **human act**, and the roster row records why.
- ⛔ **Nothing in it is originated legal drafting.** Every substantive clause is assembled from
  already-committed sources: PRD §FR-94's **seven verbatim phrasings** (which FR-94 requires survive
  *verbatim*), the posture FRs (FR-6 · FR-19 · FR-32 · FR-33 · FR-36 · FR-43A · FR-74), §4.14.1's
  regulatory-surface inventory, and the Niyamavali reference per Stories 2.3/2.4/2.5.
- ⚠ `[TO SUPPLY]` marks gaps **the trust** must fill (registration particulars, governing law).
  `[FOR COUNSEL]` marks questions **put to counsel**, collected in the closing annex.

## Why this draft exists now

The submission was **50 days overdue** (due 2026-07-05 = engagement signature 2026-06-21 + 14 days
per AC-1). ⭐ The root cause was ⛔ **not** a scheduling failure: **the artefact did not exist.**
Story 2.6 shipped the T&C *registry* — versions table, pinned clauses, `body_html_rendered`, RLS,
public render — but `body_markdown` is *"canonical T&C content authored by the trustee"* and ⛔ no
T&C prose was ever authored. ⇒ there was nothing to submit.

⭐ **It is also on a second critical path.** Counsel cited *"Member Consent of Term of service of
TWT"* as his basis for extending the 2026-08-24 clearance to the three Epic 11b surfaces
(`2026-08-24-157` cl.3) — **this** document. His held revisit should follow this submission,
⛔ not precede it.

## Regenerating

⛔ No pandoc, LibreOffice or `python-docx` in this environment — `docxgen.py` is a dependency-free
OOXML writer (stdlib `zipfile` + hand-written WordprocessingML).

```sh
python3 docs/legal-counsel-engagement/handover/build_framework.py docs/legal-counsel-engagement/handover
python3 docs/legal-counsel-engagement/handover/build_tc.py        docs/legal-counsel-engagement/handover
```

Run from the repo root; both write into this directory. The scripts are the editable source —
⛔ edit the `.py`, ⛔ never the `.docx`, or the next regeneration silently discards the change.
