# DLT Template Registration Requests — every SMS template (first opened for Story 6.19)

**Status:** ⛔ **NOT STARTED** (recorded 2026-09-28, [Decision 2026-09-28-265](../../.decision-log.md#decision-2026-09-28-265) §4). BigDev in session:
*"Record as not started."* ⛔ Only BigDev can submit these on the TRAI DLT portal.

**What it gates:** the **real** sends of Stories 6.19b, 6.19c and 6.19d — ⛔ never a build. A missing template id fails **closed and loud**
(the send is recorded `error`, an alarm fires), ⛔ never falling back to a fixture that reports `accepted` (shared spec T13).
Go-live is additionally gated on counsel's M and S (`inventory-roster.md` rows 18, 19).
⭐ **Templates 7–12** (Story 6.24b — the three texts of a refusal on suspicion of a post-death nominee change) gate the **real** sends of
Story 6.24b's suspicion notices, and are gated on **`inventory-roster.md` rows 22 and 23** (counsel's basis for the three texts, the
privacy-policy purpose, the Panel's answer to `2026-10-08-295` §8 Confirm 2 and — `2026-10-09-297` §1 — the sweep's alarm reaching a
named owner; and the Hindi human review) — ⛔ **not** on rows 18 / 19,
whose closure must ⛔ never be read as clearing 7–12. ⛔ **Do not provision the ids of 7–12 until Row 22 closes.**

⭐ **Templates 15–16** (the login and step-up OTP — Story 5.9's, typed by Story 6.34) gate EVERY login: an OTP template the operator
refuses means ⛔ nobody can log in. They are tracked by **`inventory-roster.md` Row 30** (`sms-dlt-templates-typed-and-registered`),
which also waits for row `6-37-msg91-sms-gateway-adapter` (`2026-10-10-314`).
⭐ **Templates 13–14** (Story 6.27c — the once-ever text to each of the five neighbours chosen for a reported death, `2026-10-10-303` Q1 A
as amended by `2026-10-10-304` Q6 A) gate the **real** sends of Story 6.27c, and are gated on **`inventory-roster.md` Row 27** (ALL EIGHT
conditions, incl. counsel's basis and Row 31) **and Row 28** (the Hindi human review). ⛔ **Do not provision the ids of 13–14 until Row 27
closes — and ⛔ the Hindi 13 until Row 28 does too** (a reviewed change re-registers it) — unset, the 6.27c sweep HOLDS every Pariwar
whose language's id is unset (`config:dlt_template_id_missing:<locale>`) and ⛔ no neighbour's slot is used up.

📌 *Dated note, 2026-10-23 (Story 6.35 Task 0.4; [`-387`](../../.decision-log.md#decision-2026-10-23-387)):* once row 6-35 is `done` on `main` the hold above becomes per
RECIPIENT (`-387` LS10 (b)): an unset id (or a failed pre-flight) for ONE locale makes only the neighbours whose language it is WAIT —
⛔ texted in the other language, ⛔ the Pariwar held; both locales unusable still holds the Pariwar. Kept as written.

**Why it is started early:** DLT content-template registration has an external lead time, per template, per locale. Hindi is Unicode — a
shorter per-segment length.

## Where and how we register (Story 6.34, `2026-10-10-313` TV1 / TV8)

- **The portal:** the PE registers on **STPL's SmartPing** DLT portal (`smartping.live` — Satzilio Telecom Pvt Ltd, ex-V-Con / Videocon;
  BigDev, 2026-10-10). **The gateway** that sends: **MSG91**, *"for now"* (`2026-10-10-314`).
- **The text keeps its untyped variable marker**, exactly as each template's *Registered text* below shows it. On SmartPing a variable's
  TYPE is ⛔ written into the text: after entering the text, click *Add variable* and, for each variable IN ORDER, pick its type from the
  portal's options and enter a sample value (STPL's own manual). The column *"Variable types"* in *The templates owed* below is what to pick, in order.
- ⛔ **Never type a typed tag into the text** — e.g. the numeric tag with braces around it (the Jio / Vi in-text form). On SmartPing it
  would be registered as literal text, and ⛔ a single send would ever match it. (This sheet spells every type WITHOUT braces, by house
  rule — copy the text cells, never this prose.)
- ⚠ The exact LABELS in SmartPing's tagging section are only in the manual's images (and STPL's manual predates the 18 Nov 2025 list) —
  record a screenshot and match this sheet's type words to them before the first submission (`inventory-roster.md` Row 30 (a)).
- **The MSG91 template** is the same text with `##<name>##` in place of each variable, in order (the *"MSG91 template"* column in *The templates owed* below); MSG91's template must
  equal the DLT-approved content, and row 6-37's adapter sends `{ <name>: value }` from these names.
- **Setting up each template in MSG91** (Story 6.37, `2026-10-17-345`; ADR-0041; roster Row 32 (d)) — only AFTER the operator approved
  it on SmartPing: (1) create the template in MSG91 from its *"MSG91 template"* cell, copied exactly; (2) enter its DLT template id (the
  19-digit TE id SmartPing issued) and the sender id mapped to the PE; (3) choose the SMS type — **Unicode for every Hindi template
  AND for template 14**, Normal for the other English ones. ⚠ Template 14's fixed English is GSM-7 since Story 6.37e's rework (its em dash
  became a comma — `2026-10-22-379` Q2 A), but its NAME values may be Devanagari (a KYC name; row 3-3c is independent) and ⛔ written
  MSG91 rule or device proof shows a Unicode value delivered intact on a Normal template — so 14 stays Unicode (Story 6.37e code review
  R1; the pre-flight passes a GSM-7 text on a UNICODE template with the logged note `sms_type_unicode_for_gsm7`). Templates 8, 10 and 12
  carry the same name variables and stay Normal as before — an OPEN question (roster Row 32 (d); `deferred-work.md`); (4) mark the version
  **default**; (5) leave MSG91's URL shortener OFF and put the app-link domain on its *"Skip URL"* list (the adapter also sends
  `short_url` "0"); (6) put MSG91's OWN template id (24 characters, ⛔ the DLT TE id) into the template's config key — ⚠ for the
  two OTP templates (15, 16) only, until row 6-37b (delivery reports) is `done`: ⛔ a claim-text id (1–14) is set before then, even
  with its MSG91 template created (roster Row 32 (i)). The platform reads
  every template back from MSG91 before using it (the pre-flight) — a template whose text, type or DLT id differs is held or alarmed.
  ⚠ Before (7): choose the pre-flight key per roster Row 32 note (6.1) — a SEPARATE template-read key (a different value, its
  secret name in `SMS_GATEWAY_PREFLIGHT_KEY_SECRET_NAME`) until MSG91 confirms in writing that an SMS-only key may read templates (S3).
  (7) Once the two OTP templates (15, 16) are set, prove the pre-flight from the DEPLOYED jobs process (roster Row 32 (e)): inside the
  jobs container run `node apps/jobs/dist/src/sms-otp-preflight-cli.js`. ⚠ Only that run is the evidence — a run from a checkout
  (`pnpm --filter @twt/jobs sms:preflight`) leaves from another IP (IP security is on) and, off production, reads a local key, so it
  proves neither the jobs key nor its egress (roster Row 32 note (6.3)). It only READS the two templates from MSG91 — ⛔ a text is sent —
  prints ONE JSON line for both (⛔ the key, ⛔ a template id, ⛔ a text; it carries each version's sender id) and exits 0 only when both
  pass; keep that line as Row 32 (e)'s jobs evidence. The api proves the same two templates at boot. ⛔ Set a claim-text id (1–14) to get a jobs proof — Row 32 (i).

## The variable types (TRAI Direction of 18 Nov 2025, Annexure-I)

| Type | Holds | Ceiling | Source of the ceiling |
|---|---|---|---|
| numeric | digits only (a leading zero — e.g. an OTP `048213` — is ⛔ addressed by any primary source; Row 30 (d) asks) | 40 | Vi's manual |
| alphanumeric | letters and digits; special characters *"allowed in scrubbing"* (TRAI; Jio permits; Vi's example value has spaces; only MSG91's paraphrase says *"no special characters"*); ⛔ source addresses Devanagari | 40 | TRAI (regulation (k) says 30 — a conflict, Row 30 (d)) |
| url | a URL validated against a whitelisted CTA | 120 | Vi's manual |
| urlott | an OTT / app URL validated against a whitelisted CTA | 120 | Vi's manual |
| cbn | a callback number validated against a whitelisted CTA — digits only, ⛔ `+`, ⛔ spaces | 3–14 | Vi's manual (Jio: *"Not Applicable"*) |
| email | an email address (regex) | 40 | Vi's manual |

⛔ There is no date type: a date is alphanumeric (numeric refuses the hyphen). Every ceiling lives as ONE constant in
`packages/channels/src/dlt-variables.ts` — a portal answer moves one number.

## Shape rules (TCCCPR 2nd Amendment, 12 Feb 2025; the Feb 2023 and Nov 2025 Directions)

- **At most three variables**; a third only *"in case of exigency"* — with a justification line. Since Story 6.37e's rework **every one
  of templates 7–14 carries three, because the name needs two boxes** (`2026-10-22-379` Q1 A — one 30-letter box would cost a long-named
  member's family the text). **Templates 7–10**: *"the helpline number is the only action the text asks for — `2026-09-28-262` FQ7 B,
  `2026-10-07-291` Q2 B"*. **Templates 11–12**: *"the last date to appeal is the substance of the notice — `2026-10-07-293` item 1 B"*.
  **Templates 13–14**: *"the link IS the request — without it the neighbour cannot reach the questions — `2026-10-10-303` Q1 A"*. The
  helpline number left 11–14 to make room for the second box (`-379` Q2 A).
- **⛔ Two variables side by side** — separated only by a space, a comma or other punctuation — unless both are alphanumeric. Templates
  7–14 put the two name boxes side by side with NOTHING between them — both alphanumeric, so allowed (`checkDltTemplateShape` agrees); whether
  the operator's scrubber and MSG91 accept it (and a value that begins or ends with a space) is roster Row 30 (d) — ⛔ insert a separator:
  it would change the Panel's words.
- **≥ 30 % of the template fixed**, counted against every variable at its ceiling — formally a condition of the more-than-three-variables
  clause, applied here to EVERY template (the conservative reading). Every template 1–16 passes (lowest: 13–14 — 14 (en) at 34.7 %, 13 (hi) at 40.0 %; then 7–12 at 44–60 %; 1–6 and 15–16 at 87–91 % —
  re-derived 2026-10-22 with the checker's own arithmetic for Story 6.37e's two 30-letter boxes).
- **⛔ Another type for `{member}` / `{date}`** — the claim texts' words are ratified; a type that needs a different text (a date type, a
  shorter name) is a text change and goes back through the §0 gate.
  ⚠ *Dated note, 2026-10-22 (row 6-37e, [`2026-10-22-377`](../../.decision-log.md#decision-2026-10-22-377)):* the shorter name form for an over-long name (`-359` / `-362` B —
  "Ramesh S." only when the full name does not fit) WENT through the §0 gate (the Panel ruled it) and needs ⛔ type or text change —
  it is a VALUE of the same alphanumeric `{member}` variable. Its full stop is asked at Row 30 (d) with the date's hyphen.
  ⚠ *Dated note, 2026-10-22 ([`2026-10-22-380`](../../.decision-log.md#decision-2026-10-22-380)) — ⛔ a word above edited:* the `-377` note above is SUPERSEDED by [`2026-10-22-379`](../../.decision-log.md#decision-2026-10-22-379) Q1 A — ⛔ "Ramesh S."; the name travels in two 30-letter alphanumeric variables side by side, whole whenever it fits 60, shortened above 60 by the Panel's rule (titles dropped, then initials from the front, ⛔ never the last word); only a name that still does not fit is refused / `no_target:name_too_long`. The rows and rules change with the code.
- ⚠ *"A variable cannot be the last word"* (MSG91's FAQ — secondary, undated): templates 8 and 10 end `… helpline <variable>.` (a
  final full stop) — asked at Row 30 (d). Since Story 6.37e's rework 12 and 14 end in words (`-379` Q2 A).
- Each registry's unit test runs `checkDltTemplateShape` over every entry; the CI gate `dlt-typed-variables` keeps every variable typed.

## ⛔ Not registrable — the five alert categories (Story 6.34 TV6)

`deadline_reminder`, `contribution_confirmed`, `contribution_mismatch`, `claim_status_change`, `helpdesk_reply`
(`packages/channels/src/sms-dlt-registry.ts`): each was ONE whole-body variable — 0 % fixed and unbounded, ⛔ registrable. They are kept
listed and DARK. ⚠ **Provisioning their ids (`sms.dlt.template_id.<category>`) does NOTHING** — the per-member SMS fallback stays off until
a later story writes fixed wording (en + hi) for each, with its own §0.

## The templates owed (1–6: Story 6.19; 7–12: Story 6.24b; 13–14: Story 6.27c; 15–16: the OTP, Story 5.9 — typed by Story 6.34)

| # | Message | Locale | Owning story | Config key (D7) | Variable types — select in SmartPing's tagging section, in order | MSG91 template (`##name##` per variable — TV13) |
|---|---|---|---|---|---|---|
| 1 | Correction-return reminder | hi | 6.19b | `sms.dlt.template_id.claim_correction.reminder.hi` | 1 alphanumeric (claim reference, ≤ 8) · 2 cbn (helpline number, ≤ 14) | दावा ##reference##: आपके परिवार के दावे के बैंक विवरण ठीक किए जाने हैं। कृपया हेल्पलाइन ##helpline## पर कॉल करें, या ज़िला प्रशासक आपसे संपर्क करेंगे। आपका दावा अब भी खुला है। |
| 2 | Correction-return reminder | en | 6.19b | `sms.dlt.template_id.claim_correction.reminder.en` | 1 alphanumeric (claim reference, ≤ 8) · 2 cbn (helpline number, ≤ 14) | Claim ##reference##: the bank details on your family's claim need correcting. Please call the helpline on ##helpline##, or the District Admin will contact you. Your claim is still open. |
| 3 | Closure notice | hi | 6.19b builds (D32, `2026-09-29-266` §5); 6.19c sends | `sms.dlt.template_id.claim_correction.closure_notice.hi` | 1 alphanumeric (claim reference, ≤ 8) · 2 cbn (helpline number, ≤ 14) | दावा ##reference##: बैंक विवरण में सुधार प्राप्त न होने के कारण यह दावा बंद कर दिया गया है। इस बंद किए जाने के विरुद्ध अपील नहीं की जा सकती। नया दावा हेल्पलाइन ##helpline## या ज़िला प्रशासक के माध्यम से दर्ज किया जा सकता है। |
| 4 | Closure notice | en | 6.19b builds (D32); 6.19c sends | `sms.dlt.template_id.claim_correction.closure_notice.en` | 1 alphanumeric (claim reference, ≤ 8) · 2 cbn (helpline number, ≤ 14) | Claim ##reference##: this claim was closed because no correction of the bank details was received. This closure cannot be appealed. A new claim may be filed through the helpline on ##helpline## or the District Admin. |
| 5 | Replacement-certificate reminder | hi | 6.19d | `sms.dlt.template_id.claim_correction.certificate_reminder.hi` | 1 alphanumeric (claim reference, ≤ 8) · 2 cbn (helpline number, ≤ 14) | दावा ##reference##: आपके परिवार के दावे के लिए ऐसा मृत्यु प्रमाणपत्र चाहिए जिसमें मृत्यु की तिथि स्पष्ट हो। कृपया ऐप से भेजें या हेल्पलाइन ##helpline## पर कॉल करें। आपका दावा अब भी खुला है। |
| 6 | Replacement-certificate reminder | en | 6.19d | `sms.dlt.template_id.claim_correction.certificate_reminder.en` | 1 alphanumeric (claim reference, ≤ 8) · 2 cbn (helpline number, ≤ 14) | Claim ##reference##: your family's claim still needs a death certificate that clearly shows the date of death. Please send it in the app, or call the helpline on ##helpline##. Your claim is still open. |
| 7 | Suspicion refusal notice (`-262` FQ7 B) | hi | 6.24b | `sms.dlt.template_id.suspicion_notice.refusal_notice.hi` | 1 alphanumeric (deceased member name — first part, ≤ 30) · 2 alphanumeric (deceased member name — second part, ≤ 30) · 3 cbn (helpline number, ≤ 14) | ##member1####member2## के लिए किया गया एक दावा आगे नहीं बढ़ सका। कृपया हेल्पलाइन ##helpline## पर कॉल करें। |
| 8 | Suspicion refusal notice (`-262` FQ7 B) | en | 6.24b | `sms.dlt.template_id.suspicion_notice.refusal_notice.en` | 1 alphanumeric (deceased member name — first part, ≤ 30) · 2 alphanumeric (deceased member name — second part, ≤ 30) · 3 cbn (helpline number, ≤ 14) | A claim for ##member1####member2## could not go ahead. Please call the helpline ##helpline##. |
| 9 | Closure after an allowed appeal (`-291` Q2 B) | hi | 6.24b | `sms.dlt.template_id.suspicion_notice.closed_notice.hi` | 1 alphanumeric (deceased member name — first part, ≤ 30) · 2 alphanumeric (deceased member name — second part, ≤ 30) · 3 cbn (helpline number, ≤ 14) | ##member1####member2## के लिए आपका दावा बंद कर दिया गया है। कृपया हेल्पलाइन ##helpline## पर कॉल करें। |
| 10 | Closure after an allowed appeal (`-291` Q2 B) | en | 6.24b | `sms.dlt.template_id.suspicion_notice.closed_notice.en` | 1 alphanumeric (deceased member name — first part, ≤ 30) · 2 alphanumeric (deceased member name — second part, ≤ 30) · 3 cbn (helpline number, ≤ 14) | Your claim for ##member1####member2## has been closed. Please call the helpline ##helpline##. |
| 11 | The refused person's appeal date (`-293` item 1 B, `-379` Q2 A) | hi | 6.24b | `sms.dlt.template_id.suspicion_notice.appeal_notice.hi` | 1 alphanumeric (deceased member name — first part, ≤ 30) · 2 alphanumeric (deceased member name — second part, ≤ 30) · 3 alphanumeric (last date to appeal, `DD-MM-YYYY`, ≤ 10) | ##member1####member2## के लिए किया गया दावा आगे नहीं बढ़ सका। इसके विरुद्ध ##date## तक अपील की जा सकती है। कृपया हेल्पलाइन पर कॉल करें। |
| 12 | The refused person's appeal date (`-293` item 1 B, `-379` Q2 A) | en | 6.24b | `sms.dlt.template_id.suspicion_notice.appeal_notice.en` | 1 alphanumeric (deceased member name — first part, ≤ 30) · 2 alphanumeric (deceased member name — second part, ≤ 30) · 3 alphanumeric (last date to appeal, `DD-MM-YYYY`, ≤ 10) | The claim for ##member1####member2## could not go ahead. It can be appealed until ##date##. Please call the helpline. |
| 13 | Request to each of the five neighbours (`-303` Q1 A, `-304` Q6 A, `-379` Q2 A) | hi | 6.27c | `sms.dlt.template_id.peer_mesh.request.hi` | 1 alphanumeric (deceased member name — first part, ≤ 30) · 2 alphanumeric (deceased member name — second part, ≤ 30) · 3 url (app link to the questions, ≤ 120) | हमें बताया गया है कि ##member1####member2## का निधन हो गया है। यदि आप उन्हें जानते थे, तो कृपया कुछ प्रश्नों के उत्तर दें: ##link##, या हमें कॉल करें। |
| 14 | Request to each of the five neighbours (`-303` Q1 A, `-304` Q6 A, `-379` Q2 A) | en | 6.27c | `sms.dlt.template_id.peer_mesh.request.en` | 1 alphanumeric (deceased member name — first part, ≤ 30) · 2 alphanumeric (deceased member name — second part, ≤ 30) · 3 url (app link to the questions, ≤ 120) | We have been told that ##member1####member2## has died. If you knew them, please answer a few questions: ##link##, or call us. |
| 15 | OTP — login (5 min) | en | 5.9; typed by 6.34 | `sms.dlt.template_id.otp_login` | 1 numeric (OTP code, ≤ 6) | ##otp## is your TWT login code. Valid 5 min. Do not share. |
| 16 | OTP — step-up (3 min) | en | 5.9; typed by 6.34 | `sms.dlt.template_id.otp_step_up` | 1 numeric (OTP code, ≤ 6) | ##otp## is your TWT verification code. Valid 3 min. Do not share. |

⚠ A template registered before the wording is final must be re-registered if a word changes: the send must match the registered text
exactly. ⭐ **Templates 1–4's wording is now written (Story 6.19b, 2026-09-30)** — below; ⭐ **5–6's too (Story 6.19d, 2026-10-03)** — below them;
⭐ **and 7–12's (Story 6.24b, 2026-10-08)** — below those; ⭐ **and 13–14's (Story 6.27c, 2026-10-16)** — below those.

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

## The wording of templates 7–12 (Story 6.24b — the text to register)

⛔ **Do not provision the ids of 7–12 until Row 22 closes** (`inventory-roster.md`, `suspicion-notice-counsel-basis`): every deploy before
then is a dev / staging deploy, where these ids stay unset and every send fails closed. ⭐ **Set each id only after the operator confirms
that template's approval** — a provider-side template fault after the sweep's config check (`dlt_template_not_approved`, `auth`) is a FINAL
`error`, and for a once-ever notice that uses up its only slot (`2026-10-08-295` RB12, edge ii).

The en words are the Trustee Panel's, verbatim (`-262` FQ7 B, `-291` Q2 B, `-293` item 1 B — its *"Please call the helpline."* returned to
by `2026-10-22-379` Q2 A), with ONE addition in 7–10: the Pariwar's helpline number after *"Please call the helpline"* — 6.19's
per-Pariwar key (`claimCorrectionHelplineConfigKey`), the number the Panel told the family to call; 11–12 carry ⛔ number (`-379` Q2 A).
The variables, in order: **(1)–(2) the member's name** in the Pariwar's mode-resolved form (`-181`), across TWO alphanumeric boxes side by
side, ≤ 30 each — whole whenever it fits 60, shortened above 60 by the Panel's rule (titles dropped, then initials from the front, ⛔ never
the last word), and a name that still does not fit refused (`value_too_long` + alarm), ⛔ truncated (`-379` Q1 A;
`apps/jobs/src/scheduler/sms-member-name.ts`); then **(3)** for 7–10 **the helpline number**, for 11–12 **the last date to appeal**,
`DD-MM-YYYY`, Latin digits in BOTH locales (RB6).
⭐ **Two carve-outs from 1–6's rules, recorded in `2026-10-08-295`:** (a) **D33** — 7–12 **name the member**, because the Panel's ratified
texts do; 1–6 stay name-free (D33 is ⛔ not weakened). (b) **S4 / T6** — ⛔ no deadline threat in 7–12 EXCEPT 11–12's date slot (the Panel's
*"until [date]"*, RB16). ⛔ No other person is named; ⛔ nobody is accused. The copy is `suspicion_sms.*` in
`packages/i18n/locales/{en,hi}/claim.json`; the registry is `apps/jobs/src/scheduler/suspicion-notice-sms-templates.ts`, and
`apps/jobs/tests/suspicion-notice-sms-templates.test.ts` proves the real `t()` renders EXACTLY the text below and that this sheet carries
it. ⚠ The **Hindi** is agent-authored and ⛔ not yet human-reviewed — go-live gate **row 23** (`suspicion-notice-hindi-human-review`); a
reviewed change means re-registering.
⚠ *Dated note, 2026-10-22 (row 6-37e, [`2026-10-22-377`](../../.decision-log.md#decision-2026-10-22-377)):* **(1) the member's name** above is the mode-resolved form WHEN IT FITS the
40-code-point slot; a name that does not fit is sent in the shorter form — first name and the surname's initial ("Ramesh S.", the
Pariwar's existing shielded form) — per [`2026-10-18-359`](../../.decision-log.md#decision-2026-10-18-359) B. Only a name that still
does not fit is refused (`value_too_long` + alarm), ⛔ never truncated. ⛔ Text or type change.

⚠ *Dated note, 2026-10-22 ([`2026-10-22-380`](../../.decision-log.md#decision-2026-10-22-380)) — ⛔ a word above edited:* the `-377` note above is SUPERSEDED by [`2026-10-22-379`](../../.decision-log.md#decision-2026-10-22-379) Q1 A — ⛔ "Ramesh S."; the name travels in two 30-letter alphanumeric variables side by side, whole whenever it fits 60, shortened above 60 by the Panel's rule (titles dropped, then initials from the front, ⛔ never the last word); only a name that still does not fit is refused / `no_target:name_too_long`. The rows and rules change with the code.

| # | Registered text |
|---|---|
| 7 | {#var#}{#var#} के लिए किया गया एक दावा आगे नहीं बढ़ सका। कृपया हेल्पलाइन {#var#} पर कॉल करें। |
| 8 | A claim for {#var#}{#var#} could not go ahead. Please call the helpline {#var#}. |
| 9 | {#var#}{#var#} के लिए आपका दावा बंद कर दिया गया है। कृपया हेल्पलाइन {#var#} पर कॉल करें। |
| 10 | Your claim for {#var#}{#var#} has been closed. Please call the helpline {#var#}. |
| 11 | {#var#}{#var#} के लिए किया गया दावा आगे नहीं बढ़ सका। इसके विरुद्ध {#var#} तक अपील की जा सकती है। कृपया हेल्पलाइन पर कॉल करें। |
| 12 | The claim for {#var#}{#var#} could not go ahead. It can be appealed until {#var#}. Please call the helpline. |

## The wording of templates 13–14 (Story 6.27c — the text to register)

⛔ **Do not provision the ids of 13–14 until Row 27 closes** (`inventory-roster.md`, `peer-mesh-request-counsel-basis` — ALL EIGHT
conditions) **— and ⛔ the Hindi 13 until Row 28 closes too** (`peer-mesh-request-hindi-human-review`). ⭐ **Set each id only after the operator confirms that template's approval** — a provider-side template fault after the
child's config check is a FINAL `error`, and for a once-ever request that uses up that neighbour's only slot (`2026-10-10-311` PM16).

The en words are the Trustee Panel's (`-303` Q1 A, *"two"* amended to *"a few"* by `-304` Q6 A, the ending narrowed to *"…[link], or call
us."* by `2026-10-22-379` Q2 A — ⛔ helpline number, the dash a comma), with *"a few questions"* for the earlier *"a few short
questions"* (BigDev's words, ratified by `2026-10-22-381` PQ1 A — the TEXT only; the WhatsApp reminder keeps "short"). The routing note's *"TWT:"*
prefix is dropped — the DLT header names the sender (`-311` PM3's author reading). The variables, in order: **(1)–(2) the member's name**
in the Pariwar's mode-resolved form (`-181`), across TWO alphanumeric boxes side by side, ≤ 30 each — whole whenever it fits 60, shortened
above 60 by the Panel's rule; a name that still does not fit is ⛔ texted (`no_target:name_too_long`), ⛔ never truncated (`-379` Q1 A);
**(3) the app link** `https://<domain>/peer-request?c=<code>` (Story 6.30 — the URL-whitelisting section below). ⭐ The **D33** carve-out applies as for 7–12 (the ruled text names the member); ⛔ no deadline word, ⛔ no claim, money, family,
nominee, claimant or reporter. The copy is `peer_mesh_sms.request` in `packages/i18n/locales/{en,hi}/claim.json`; the registry is
`apps/jobs/src/scheduler/peer-mesh-sms-templates.ts`, and `apps/jobs/tests/peer-mesh-sms-templates.test.ts` proves the real `t()` renders
EXACTLY the text below and that this sheet carries it. The LANGUAGE is the Pariwar's default until row 6-35 lets members choose
(`-310` CF1 A). ⚠ The **Hindi** is the `-303` routing block's Hindi draft with "दो" (two) replaced by "कुछ" (a few) — word for word otherwise, ⛔ an
independent translation (corrected 2026-10-17, 6.27c review round 2; PM3's "never copied" clause superseded by `2026-10-17-344`) — and ⛔
not yet human-reviewed —
go-live gate **Row 28** (`peer-mesh-request-hindi-human-review`); a reviewed change means re-registering.
⚠ *Dated note, 2026-10-22 (row 6-37e, [`2026-10-22-377`](../../.decision-log.md#decision-2026-10-22-377)):* *"a name longer than 40 characters is ⛔ texted"* above is SUPERSEDED in part by
[`2026-10-18-362`](../../.decision-log.md#decision-2026-10-18-362) B — such a name is sent in the shorter form ("Ramesh S."), and
`no_target:name_too_long` remains only for a name that still does not fit; ⛔ never truncated. ⛔ Text or type change.

📌 *Dated note, 2026-10-23 (Story 6.35 Task 0.4; [`-387`](../../.decision-log.md#decision-2026-10-23-387)):* row 6-35 lets members choose — the language becomes the
RECIPIENT's choice, else the Pariwar's default, once it is `done` on `main`. Kept as written.

⚠ *Dated note, 2026-10-22 ([`2026-10-22-380`](../../.decision-log.md#decision-2026-10-22-380)) — ⛔ a word above edited:* the `-377` note above is SUPERSEDED by [`2026-10-22-379`](../../.decision-log.md#decision-2026-10-22-379) Q1 A — ⛔ "Ramesh S."; the name travels in two 30-letter alphanumeric variables side by side, whole whenever it fits 60, shortened above 60 by the Panel's rule (titles dropped, then initials from the front, ⛔ never the last word); only a name that still does not fit is refused / `no_target:name_too_long`. The rows and rules change with the code.

| # | Registered text |
|---|---|
| 13 | हमें बताया गया है कि {#var#}{#var#} का निधन हो गया है। यदि आप उन्हें जानते थे, तो कृपया कुछ प्रश्नों के उत्तर दें: {#var#}, या हमें कॉल करें। |
| 14 | We have been told that {#var#}{#var#} has died. If you knew them, please answer a few questions: {#var#}, or call us. |

## The wording of templates 15–16 (Story 5.9 — the OTP; typed by Story 6.34)

Category **Transactional** (the 2025 regulation: *"OTP from … apps login"*). ONE variable: the 6-digit code, typed numeric, named `otp`.
The TTL wording is the code's real life (login 5 min, step-up 3 min); since Story 6.34 the claim-handover code (a 3-minute step-up code)
is sent with template 16. ⚠ The brand *"TWT"* is the working title and the texts are English-only — a re-registration when the Trust's
name is fixed or a Hindi OTP is added. The registry is `packages/channels/src/otp-sms-template.ts`; prod refuses to start with either id
blank.

| # | Registered text |
|---|---|
| 15 | {#var#} is your TWT login code. Valid 5 min. Do not share. |
| 16 | {#var#} is your TWT verification code. Valid 3 min. Do not share. |

## The per-Pariwar helpline number (D33(b), `-269` §5)

| Config key | Holds | Unset ⇒ |
|---|---|---|
| `sms.claim_correction.helpline_number.<pariwarId>` (the Pariwar's id, lower-case) | that Pariwar's helpline number, as printed in the SMS | **that Pariwar's** sends fail closed (`error` + alarm) — ⛔ never another Pariwar's number, ⛔ never a default |

⚠ *Dated note, 2026-10-22 (Story 6.37e code review round 2, P4; [`-379`](../../.decision-log.md#decision-2026-10-22-379) Q2 A, `-380` decision 6):* "as printed in the SMS" is true of templates 1–10 ONLY — templates 11–14 no longer print the number (the appeal-date text says *"Please call the helpline."*; the neighbours' text *"…, or call us."*). The key is STILL required for their sends (`-380` decision 6): a missing key fails CLOSED in the shared send core — the sweep and the child check the config first, so no once-ever slot is spent — although no number would be printed. Provision it for every Pariwar, as for 1–10.

⭐ **The helpline is a callback-number variable (cbn) — write it DIGITS ONLY** (Story 6.34, `2026-10-12-322` C1): toll-free `1800` /
`1860` + digits (8–13 in all); a landline `0` + STD code + number; a mobile `91` + 10 digits — ⛔ `+`, ⛔ spaces, ⛔ dashes (a country code
belongs in fixed text, and these texts' words are ratified). The SAME number must be whitelisted as a CBN CTA with the operator.
⚠ A value that is set but ⛔ in that form is still SENT exactly as written — ⛔ held, ⛔ refused — and the job logs a warning naming the
Pariwar and the purpose; once operators enforce tags, the operator rejects those texts until staff fix the number. ⇒ the control is
provisioning: `inventory-roster.md` Row 30 (c) — every Pariwar's number checked and whitelisted before any template id is set.

⛔ No server-side helpline number exists today (`deferred-work.md`, the 8.11 helpline-number item) — each Pariwar's key must be provisioned
before its first real send. Status: ⛔ **none provisioned** (2026-09-30).

## The cost per message (`-255` consequence 2)

Each reminder is ONE transactional DLT SMS per person per slot — at most **22** slots per 90-day run (the Panel's days, `-250` #5), per
person reached (each effective nominee, plus the claimant when they are none of them); a mark switch back to the family opens a new run.
Rendered with an 8-character reference and a 10-digit helpline number (re-derived 2026-10-12 for a digits-only number — Story 6.34; a
13-character `+91…` number added 3 characters and ⛔ no segment): the English reminder is 178 characters (**2 GSM segments**),
the Hindi reminder 168 characters of Unicode (**3 segments** at 67 per concatenated part); the closure notice is 209 (en, 2 segments) and
217 (hi, 4 segments), sent at most once per person. ⇒ a Hindi reminder costs about **1.5×** an English one (3 segments against 2). ⚠ The per-segment price is the
gateway's and is ⛔ not recorded here (⛔ no contract exists yet).

⭐ **The certificate reminder (templates 5–6, Story 6.19d):** ONE transactional DLT SMS per **contact-record person** per slot (CR6 — each
nominee person on the contact record, plus the claimant block; one text per NUMBER per slot) — at most **25** slots per rejected
certificate (the 22 correction days to day 84, then days 120, 150 and 180 — `-259` cl.1, `-260` G6); a second rejected certificate
(`-260` G5) starts a new 25. Rendered with an 8-character reference and a 10-digit helpline number: the English reminder is 194
characters (**2 GSM segments**), the Hindi 182 characters of Unicode (**3 segments**).

⭐ **The suspicion notices (templates 7–12, Story 6.24b):** ONE transactional DLT SMS per claim per purpose, **EVER** (the notice table's
UNIQUE) — a refused claim's notice (7–8) and its refused person's appeal date (11–12), and a closed claim's notice (9–10); refusals are
rare. ⚠ Delivery is at-least-once (a timeout or crash after a gateway accept may send a second — recorded, ⛔ never hidden). Rendered with
a 19-character name, a 10-digit helpline number and a 10-character date (re-derived 2026-10-22 for Story 6.37e's rework — the name in two
boxes, ⛔ number in 11–12): 8 and 10 are 88 characters (**1 GSM segment**), 12 is 116 (**1**); 7 is 101, 9 is 96 and 11 is 134 characters
of Unicode (**2 segments** each). With a 60-character name (the longest sent whole): 8 and 10 are 129 and 12 is 157 (**1** each); 7 is
142, 9 is 137 and 11 is 175 (**3** each).

⭐ **The request to the five neighbours (templates 13–14, Story 6.27c):** ONE transactional DLT SMS per neighbour, **EVER** (a ping's
send is begun once — the CAS from ⛔ begun), at most five TEXTS per reported death (a neighbour skipped at send time is replaced by the next eligible one — a
replacement skipped in turn is replaced again — so the TEXTS never exceed the original selection; the ping ROWS may exceed five). Rendered with a 19-character name and a 55-character
link (`https://` + a 19-character domain + `/peer-request?c=` + the 12-character code) — re-derived 2026-10-22 for Story 6.37e's rework
(two name boxes; ⛔ helpline; the dash a comma; *"a few questions"*): 14 (en) is now **GSM-7** — the em dash was its only non-GSM-7
character — 170 characters (**2 segments** at 153 per part); 13 (hi) is 194 characters of Unicode (**3 segments** at 67 per part). With a
60-character name: en 211 (**2**), hi 235 (**4**); at the registered ceilings (a 60-character name, a 120-character link) en 276 (**2**)
and hi 300 (**5**) — so per text **en 2, hi 3–5 segments**. ⚠ **Qualified by the code review (R1), 2026-10-22:** the en figures are
GSM-7 sizes, true ONLY if a text whose characters are all GSM-7 is sent as GSM-7. Template 14 is PROVISIONED Unicode (step (3) above), and
whether MSG91 sends an all-GSM-7 text on a UNICODE template as GSM-7 is ⛔ known — sent as Unicode, en is 170 (**3**), 211 (**4**), 276
(**5**) at 67 per part, so per text **en 2–5**; a Devanagari name value makes the text Unicode whatever the type. ⚠ Before the rework the English was Unicode too (198 characters, **3
segments** — `-303` Q1 A's em dash), and the Panel was told only the Hindi's *"likely THREE segments"* (`-311` PM3) — the words were
ruled, so it was recorded, ⛔ "fixed" by editing the text; the FYI is written into the 6.37e PQ1 routing note (`deferred-work.md`, BF24).
A shorter domain or name can drop a segment.

## URL whitelisting (Story 6.30, -312 AL3)

⭐ Since 1 Oct 2024 (TRAI) an SMS carrying a URL that is ⛔ not whitelisted against the sender's header is REJECTED. Only the FIXED part of
a URL is whitelisted; a dynamic part is allowed only AFTER the `?` (*"dynamic paths before the query string are currently not supported"*
— the providers' docs) ⇒ Story 6.30's link is `https://<domain>/peer-request?c=<code>` (the code in the query, ⛔ never a path segment).

| Whitelist entry | Used by | Status |
|---|---|---|
| `https://<domain>/peer-request?` (the Trust's domain, once registered — `inventory-roster.md` Row 29 (b)) | Story 6.27c's text to the five neighbours (`2026-10-10-303` Q1 A); row 6-31's WhatsApp reminder carries the same link | ⛔ **not submitted** — the domain is ⛔ not yet set |

- **Subdomains are whitelisted separately** — `www.<domain>` is ⛔ not covered by `<domain>`; whitelist exactly the host the link uses.
- ⚠ **The DLT category** for a URL entry (and whether it rides the content template or a separate URL registration) is ⛔ not yet confirmed
  with the provider — confirm before submitting.
- ⛔ No shortener (AL3) — the URL is whitelisted as the Trust's own domain; a redirect hop would also break the app link.
- The template that carries the link has a `{#var#}` slot typed url (`2026-10-10-311` PM3), validated against the whitelisted
  `https://<domain>/peer-request?` — row 6-34 (`2026-10-12-322` C3). (A fixed URL with a code variable would change PM3's slots — its own
  author-commit.)
- Closing this is Row 29 (f).

## If DLT rejects a template, or approves it only with different words (`2026-10-17-349`)

**Until a template is approved, its id stays unset — and no claim flow that sends it runs in production** (roster Row 30 note (8)).
An unset id is not a safe idle state: on the correction, closure and certificate paths every send then ends as an error and spends its
slot, the family is neither reached nor offered a letter, and a suspicion appeal text can be lost after 90 days (`deferred-work.md`,
*"A template DLT has not approved"*).

When STPL / SmartPing rejects a template or asks for different words:

| Template | Whose words | What happens |
|---|---|---|
| 7–14, English | the Trustee Panel's, verbatim | The proposed new words go back to the Panel through a routing note BEFORE the template's id is set. Nothing is sent with words the Panel has not seen. (A standing delegation — registering the nearest accepted wording and reporting afterwards — is not in place; it is raised with the first such case, `-349` decision 4.) |
| 1–6, 15–16, English | the author's | The author re-words it to DLT's requirement and re-registers it. |
| every Hindi text | the author's, under a review row | The author re-words it; the new Hindi goes back through its review row (Rows 20, 21, 23, 28) before it is re-registered. |

In every case: record the rejection, the new words and the approval in the Record below, update the wording section above and the
copy in `packages/i18n/locales/{en,hi}/` to the approved words, and set the id only after the operator confirms the approval.

## Record

| Date | Template(s) | Action | By | Reference |
|---|---|---|---|---|
| 2026-09-28 | 1–6 | ⛔ Not started — recorded as owed | BigDev | — |
| 2026-09-30 | 1–4 | ⭐ Wording and `{#var#}` slots written (Story 6.19b, D32); 3–4 now BUILT by 6.19b (6.19c sends); the per-Pariwar helpline keys added (`-269` §5). ⛔ Still not submitted | Story 6.19b | `claim-correction-sms-templates.ts` |
| 2026-10-03 | 5–6 | ⭐ Wording, `{#var#}` slots and config keys written (Story 6.19d, `2026-10-03-276` CR7, CR13); its cost line added. ⛔ Still not submitted | Story 6.19d | `claim-correction-sms-templates.ts` |
| 2026-10-08 | 7–12 | ⭐ Wording, `{#var#}` slots and config keys written (Story 6.24b, `2026-10-08-295` RB1, RB4, RB11); its cost line added. ⛔ Still not submitted. ⛔ **Do not provision the ids of 7–12 until Row 22 closes**; set each id only after the operator confirms that template's approval | Story 6.24b | `suspicion-notice-sms-templates.ts` |
| 2026-10-10 | URL `https://<domain>/peer-request?` | ⭐ The URL-whitelisting section written (Story 6.30, `2026-10-10-312` AL3). ⛔ Not submitted — the domain is ⛔ not yet set (Row 29 (b)); the DLT category to be confirmed with the provider | Story 6.30 | § URL whitelisting |
| 2026-10-12 | 1–12, 15, 16 | ⭐ Variable TYPES declared for every template (the column to select in SmartPing's tagging section) and the MSG91 `##name##` form (Story 6.34, `2026-10-10-313` TV8, `-314` TV13, `-322` C1 / C3); OTP templates 15–16 added (Transactional, numeric `otp`); where-and-how, types, shape-rules and helpline sections; the five alert categories listed as ⛔ registrable; the cost lines re-derived for a digits-only helpline; the URL bullet answered. ⛔ Still not submitted — Row 30 | Story 6.34 | `dlt-variables.ts`; the three registries |
| 2026-10-16 | 13–14 | ⭐ Wording, typed `{#var#}` slots (alphanumeric · url · cbn), config keys and the MSG91 form written (Story 6.27c, `2026-10-10-303` Q1 A, `-304` Q6 A, `-311` PM3 / PM16); their three-variable justification, the *"lowest"* line and a cost line (BOTH locales Unicode) added. ⛔ Still not submitted. ⛔ **Do not provision the ids of 13–14 until Row 27 closes**; set each id only after the operator confirms that template's approval | Story 6.27c | `peer-mesh-sms-templates.ts` |
| 2026-10-17 | 1–16 | ⭐ The rejection procedure written (*"If DLT rejects a template …"*, `2026-10-17-349`): ids stay unset until approved; no claim flow live in production with its template unapproved (Row 30 note (8)); Panel wording (7–14 English) back to the Panel before its id is set. ⛔ Still nothing submitted | BigDev | `2026-10-17-349` |
| 2026-10-22 | 7–14 | ⭐ Story 6.37e rework (`2026-10-22-379` Q1 A / Q2 A; `2026-10-22-380`): the member's name in TWO alphanumeric variables side by side (`{#var#}{#var#}`, ≤ 30 each; MSG91 `##member1####member2##`); 11–14 lose the helpline variable (11–12 *"Please call the helpline."*, 13–14 *"…, or call us."*); 13–14 *"a few questions"* (BigDev's words — routed as `-380` PQ1, ratified by `-381` PQ1 A); 14 (en) is Normal (GSM-7). The three-variable justifications, the side-by-side, lowest-share and last-word lines, the MSG91 SMS-type step and the cost lines re-derived. ⛔ Still not submitted — nothing to re-register | Story 6.37e | `sms-member-boxes.ts`; `sms-member-name.ts`; the two registries |
| 2026-10-22 | 14 (and 8, 10, 12) | ⭐ Story 6.37e code review R1 (BigDev: *"14 back to Unicode"*): the row above's *"14 (en) is Normal (GSM-7)"* is true of the fixed TEXT only — template 14 is PROVISIONED **Unicode** (MSG91 setup step (3)), because a name value may be Devanagari and ⛔ rule or proof shows a Unicode value delivered intact on a Normal template; the 13–14 cost lines qualified (en 2–5). 8, 10 and 12 stay Normal as before — an OPEN question, recorded in roster Row 32 (d) and `deferred-work.md`, ⛔ decided. No text, slot or code change | Story 6.37e | `sms-preflight.ts` (unchanged — a GSM-7 text on a UNICODE template passes with a note) |
