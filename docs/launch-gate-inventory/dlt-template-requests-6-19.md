# DLT Template Registration Requests — the Story 6.19 set

**Status:** ⛔ **NOT STARTED** (recorded 2026-09-28, [Decision 2026-09-28-265](../../.decision-log.md#decision-2026-09-28-265) §4). BigDev in session:
*"Record as not started."* ⛔ Only BigDev can submit these on the TRAI DLT portal.

**What it gates:** the **real** sends of Stories 6.19b, 6.19c and 6.19d — ⛔ never a build. A missing template id fails **closed and loud**
(the send is recorded `error`, an alarm fires), ⛔ never falling back to a fixture that reports `accepted` (shared spec T13).
Go-live is additionally gated on counsel's M and S (`inventory-roster.md` rows 18, 19).

**Why it is started early:** DLT content-template registration has an external lead time, per template, per locale. Hindi is Unicode — a
shorter per-segment length.

## The six templates owed

| # | Message | Locale | Owning story | Config key (D7) | Variable slots (`{#var#}`) — to confirm with the wording |
|---|---|---|---|---|---|
| 1 | Correction-return reminder | hi | 6.19b | `sms.dlt.template_id.claim_correction.reminder.hi` | a **non-name** claim reference; the helpline number |
| 2 | Correction-return reminder | en | 6.19b | `sms.dlt.template_id.claim_correction.reminder.en` | as #1 |
| 3 | Closure notice | hi | 6.19c | `sms.dlt.template_id.claim_correction.closure_notice.hi` | a non-name claim reference; the helpline number |
| 4 | Closure notice | en | 6.19c | `sms.dlt.template_id.claim_correction.closure_notice.en` | as #3 |
| 5 | Replacement-certificate reminder | hi | 6.19d | *(6.19d's to name)* | a non-name claim reference; the helpline number |
| 6 | Replacement-certificate reminder | en | 6.19d | *(6.19d's to name)* | as #5 |

⚠ **The wording is ⛔ not written yet** — it is 6.19b's and 6.19d's (name-free, warm-formal, microcopy-clean; shared spec T6). A template
registered before the wording is final must be re-registered if a word changes: the send must match the registered text exactly.

## Record

| Date | Template(s) | Action | By | Reference |
|---|---|---|---|---|
| 2026-09-28 | 1–6 | ⛔ Not started — recorded as owed | BigDev | — |
