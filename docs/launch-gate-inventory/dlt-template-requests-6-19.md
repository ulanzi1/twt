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
| 3 | Closure notice | hi | 6.19b builds (D32, `2026-09-29-266` §5); 6.19c sends | `sms.dlt.template_id.claim_correction.closure_notice.hi` | a non-name claim reference; the helpline number |
| 4 | Closure notice | en | 6.19b builds (D32); 6.19c sends | `sms.dlt.template_id.claim_correction.closure_notice.en` | as #3 |
| 5 | Replacement-certificate reminder | hi | 6.19d | `sms.dlt.template_id.claim_correction.certificate_reminder.hi` | a non-name claim reference; the helpline number |
| 6 | Replacement-certificate reminder | en | 6.19d | `sms.dlt.template_id.claim_correction.certificate_reminder.en` | as #5 |

⚠ A template registered before the wording is final must be re-registered if a word changes: the send must match the registered text
exactly. ⭐ **Templates 1–4's wording is now written (Story 6.19b, 2026-09-30)** — below; ⭐ **5–6's too (Story 6.19d, 2026-10-03)** — below them.

## The wording of templates 1–4 (Story 6.19b — the text to register)

The two variables, in order: **(1) the claim's short reference** — the first 8 hex characters of the claim id, upper-cased, the same
string the District Admin's correction queue shows (D33(a)); **(2) the Pariwar's helpline number** (D33(b), per Pariwar — `-269` §5).
⛔ No name, ⛔ no bank detail, ⛔ no reason, ⛔ no deadline. The copy lives in `packages/i18n/locales/{en,hi}/claim.json`
(`correction_sms.reminder`, `correction_sms.closure_notice`); the registry is `apps/jobs/src/scheduler/claim-correction-sms-templates.ts`,
and `apps/jobs/tests/claim-correction-sms-templates.test.ts` proves the real `t()` renders EXACTLY the text below and that this sheet
carries it. ⚠ The **Hindi** is agent-authored and ⛔ not yet human-reviewed — its review is a go-live gate (`-267` §6,
`inventory-roster.md`); a reviewed change means re-registering.

| # | Registered text |
|---|---|
| 1 | दावा {#var#}: आपके परिवार के दावे के बैंक विवरण ठीक किए जाने हैं। कृपया हेल्पलाइन {#var#} पर कॉल करें, या ज़िला प्रशासक आपसे संपर्क करेंगे। आपका दावा अब भी खुला है। |
| 2 | Claim {#var#}: the bank details on your family's claim need correcting. Please call the helpline on {#var#}, or the District Admin will contact you. Your claim is still open. |
| 3 | दावा {#var#}: बैंक विवरण में सुधार प्राप्त न होने के कारण यह दावा बंद कर दिया गया है। इस बंद किए जाने के विरुद्ध अपील नहीं की जा सकती। नया दावा हेल्पलाइन {#var#} या ज़िला प्रशासक के माध्यम से दर्ज किया जा सकता है। |
| 4 | Claim {#var#}: this claim was closed because no correction of the bank details was received. This closure cannot be appealed. A new claim may be filed through the helpline on {#var#} or the District Admin. |

## The wording of templates 5–6 (Story 6.19d — the text to register)

The same two variables in the same order — the claim's short reference, then the Pariwar's helpline number (`claimCorrectionHelplineConfigKey`,
per Pariwar). ⭐ **One wording for both causes** (a certificate the District Admin could not accept, or ⛔ none received once the claim is
being checked — `-259` detail 3): it states the requirement every certificate must meet (a clear date of death, `-236` BB) and ⛔ never why
one was refused. ⛔ No name, ⛔ no deadline. The copy is `certificate_sms.reminder` in `packages/i18n/locales/{en,hi}/claim.json`; the
registry entry is `certificate_reminder` (`2026-10-03-276` CR7). ⚠ The **Hindi** is agent-authored and ⛔ not yet human-reviewed — go-live
gate **row 21** (`inventory-roster.md`, `certificate-reminder-hindi-human-review`); a reviewed change means re-registering.

| # | Registered text |
|---|---|
| 5 | दावा {#var#}: आपके परिवार के दावे के लिए ऐसा मृत्यु प्रमाणपत्र चाहिए जिसमें मृत्यु की तिथि स्पष्ट हो। कृपया ऐप से भेजें या हेल्पलाइन {#var#} पर कॉल करें। आपका दावा अब भी खुला है। |
| 6 | Claim {#var#}: your family's claim still needs a death certificate that clearly shows the date of death. Please send it in the app, or call the helpline on {#var#}. Your claim is still open. |

## The per-Pariwar helpline number (D33(b), `-269` §5)

| Config key | Holds | Unset ⇒ |
|---|---|---|
| `sms.claim_correction.helpline_number.<pariwarId>` (the Pariwar's id, lower-case) | that Pariwar's helpline number, as printed in the SMS | **that Pariwar's** sends fail closed (`error` + alarm) — ⛔ never another Pariwar's number, ⛔ never a default |

⛔ No server-side helpline number exists today (`deferred-work.md`, the 8.11 helpline-number item) — each Pariwar's key must be provisioned
before its first real send. Status: ⛔ **none provisioned** (2026-09-30).

## The cost per message (`-255` consequence 2)

Each reminder is ONE transactional DLT SMS per person per slot — at most **22** slots per 90-day run (the Panel's days, `-250` #5), per
person reached (each effective nominee, plus the claimant when they are none of them); a mark switch back to the family opens a new run.
Rendered with an 8-character reference and a 13-character helpline number: the English reminder is 181 characters (**2 GSM segments**),
the Hindi reminder 171 characters of Unicode (**3 segments** at 67 per concatenated part); the closure notice is 212 (en, 2 segments) and
220 (hi, 4 segments), sent at most once per person. ⇒ a Hindi reminder costs about **1.5×** an English one (3 segments against 2). ⚠ The per-segment price is the
gateway's and is ⛔ not recorded here (⛔ no contract exists yet).

⭐ **The certificate reminder (templates 5–6, Story 6.19d):** ONE transactional DLT SMS per **contact-record person** per slot (CR6 — each
nominee person on the contact record, plus the claimant block; one text per NUMBER per slot) — at most **25** slots per rejected
certificate (the 22 correction days to day 84, then days 120, 150 and 180 — `-259` cl.1, `-260` G6); a second rejected certificate
(`-260` G5) starts a new 25. Rendered with an 8-character reference and a 13-character helpline number: the English reminder is 197
characters (**2 GSM segments**), the Hindi 185 characters of Unicode (**3 segments**).

## Record

| Date | Template(s) | Action | By | Reference |
|---|---|---|---|---|
| 2026-09-28 | 1–6 | ⛔ Not started — recorded as owed | BigDev | — |
| 2026-09-30 | 1–4 | ⭐ Wording and `{#var#}` slots written (Story 6.19b, D32); 3–4 now BUILT by 6.19b (6.19c sends); the per-Pariwar helpline keys added (`-269` §5). ⛔ Still not submitted | Story 6.19b | `claim-correction-sms-templates.ts` |
| 2026-10-03 | 5–6 | ⭐ Wording, `{#var#}` slots and config keys written (Story 6.19d, `2026-10-03-276` CR7, CR13); its cost line added. ⛔ Still not submitted | Story 6.19d | `claim-correction-sms-templates.ts` |
