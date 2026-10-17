---
baseline_commit: 466e9b0e
---

<!--
PINNED: `466e9b0e` (2026-10-17 — `main` == `origin/main` after a fresh `git fetch`). Every `file:NNN` below is AS OF that sha; Task 0.1
re-checks what moved. Built in its OWN worktree `.claude/worktrees/6-37`, branch `story/6-37-msg91-sms-gateway-adapter`
([[feedback_commit_on_story_branch]], [[feedback_shared_tree_branch_switch]]).

STATUS: `ready-for-dev` — ⚠ BUILDABLE ONLY AFTER TASK 0: MG1–MG16 below are the author's build decisions, PROPOSED with a
recommendation each; BigDev answers them and they are committed ALONE as one author-commit (the next free id — `2026-10-17-345` if
written today) BEFORE any code ([[feedback_governance_commits_precede_implementation]]). ⛔ No code before AC0 is met.
Start condition met: row 6-34 is `done` and on `main` (`-314` decision 2 — "6.34 builds FIRST"; 6.34 Sequencing: "if 6-37 is started
first it STOPS and asks").

§0 GATE (the routing template's): every MG below is the AUTHOR's — which vendor API carries the texts, how a template id is stored, how a
response is classified, when a misconfigured account holds a run (`-314` §0: "which vendor carries the texts and how a template is
configured with it. ⛔ No word of any text, ⛔ who is texted, ⛔ when"). ⚠ TWO places it would become the Panel's, both kept OUT:
(1) a delivery report that changes what counts as "reached" — `-252` cl.1 (Trustee-ratified) — ⇒ MG1 moves delivery reports to a NEW
row 6-37b, whose create-story owns that question; (2) a provider's refusal of Devanagari or spaces in a name — already Row 30 (d) /
`-322` C7. MG15 reads `-252` cl.1 VERBATIM and says MATCHES — but ONLY with MG5's pre-flight; if MG5 is declined, MG15 WIDENS and the
question is the Panel's ([[feedback_panel_gate_read_ratified_verbatim]]).

GLYPH REGISTER: `⛔` negates the word it precedes; `⭐` emphasis / action; `⚠` a hazard. ⛔ No `file:NNN` into `.decision-log.md`,
`deferred-work.md` or `sprint-status.yaml` (newest-first files) — cite the decision id, the item's phrase, or the row key.

LETTERS: F = found facts (F1–F24); MG = build decisions (MG1–MG16, PROPOSED); I = invariants; T = traps. Decision-entry letters stay the
entry's own (`-322` C1–C9, `-323` R1–R2, `-252` cl.1–cl.3).
-->

# Story 6.37: The texts and login codes are actually sent — a MSG91 adapter behind the SMS seam, sending each template's NAMED values, with a pre-flight that proves the account and every template before a single text is spent `[PRIMITIVE]`

Status: ready-for-dev

> ⭐⭐ **WHAT THIS STORY IS, IN ONE PARAGRAPH.** Today ⛔ no SMS can reach a real gateway: `sms-app.ts` posts a generic
> `{sender, to, template_id, message}` with `Authorization: Bearer` and expects `messageId` — a contract that matches ⛔ MSG91, the gateway
> BigDev chose "for now" (`-314`). MSG91's Flow v5 takes an `authkey` header, MSG91's OWN template id, and the template's NAMED variable
> values — ⛔ the finished text. This story replaces the client with a MSG91 client behind the SAME `SmsMessagingHandle` seam, carries each
> template's named slot values (6.34 TV13) from the five callers down to it, sends the two OTPs through the same Flow call, and — because
> ⭐ MSG91 answers HTTP 200 `"type":"success"` even for a FAKE authkey (F9) — adds a **pre-flight** that reads every template the process
> will use from MSG91 (auth, existence, content, unicode) at api boot and at each jobs sweep, so a misconfigured account HOLDS the run
> instead of recording every family as reached. It also lands the owed SMS-provider ADR (ADR-0041, `drafted`), the owed `epics.md` entry,
> a provisioning row on the go-live roster, and a NEW row `6-37b` for delivery reports. ⛔ No text's wording changes; ⛔ no template is
> registered; ⛔ no id is provisioned; ⛔ no migration.

> **What already ships and this story READS — rebuild ⛔ none of it:**
> - `packages/channels/src/dlt-variables.ts` — `DLT_VAR`, `DltSlot {name,type,maxLength,label}` (`:69-78`), `SLOT_NAME` (`:59-60` — "the
>   MSG91 `##name##` variable (TV13)"), `checkDltTemplateShape` (`:102-173`), `isDltCallbackNumber`.
> - The SIX registry files (`scripts/dlt-typed-variables/lib.ts:56-63` `REGISTRY_FILES`): `otp-sms-template.ts` (templates 15/16),
>   `sms-dlt-registry.ts` (the five DARK alert categories — TV6), `claim-correction-sms-templates.ts` (1–6),
>   `suspicion-notice-sms-templates.ts` (7–12), `peer-mesh-sms-templates.ts` (13/14).
> - The DLT sheet `docs/launch-gate-inventory/dlt-template-requests-6-19.md` — its *"MSG91 template"* column IS the MSG91 template text;
>   pinned by `apps/jobs/tests/_dlt-template-sheet.ts` `msg91Form` (`:34`).
> - The send core `apps/jobs/src/scheduler/claim-dlt-sms-send.ts` `sendClaimDltSms` (`:100-167`) and its class → outcome mapping.
> - 6.27c's P1 `isScopeWideSendFault` (`claim-peer-mesh-requests.ts:228-231`) — `config:` / `auth:` / `dlt_template_not_approved:` STOP the child.
> - The OTP adapter `apps/api/src/modules/auth/shared/sms-step-up-delivery.ts` and the prod boot check `apps/api/src/deps.ts:209-251`.
> - `normalizeMobile` (`packages/domain/src/encryption/member-fields.ts:92-100`; `@twt/channels` already depends on `@twt/domain`).

## Story

As **the Trust**,
I want **every SMS the platform already composes — the login and step-up codes, the correction / closure / certificate texts, the
suspicion notices and the neighbours' request — to be sent through MSG91 with each template's named values, and a misconfigured MSG91
account or template to stop the send before anyone is recorded as reached**,
so that **a member actually receives their login code and a family's texts reach them, and the record never says "sent" for a text MSG91
silently refused**.

## The rulings and records this story builds on

| Source | Key (verbatim, abridged) | Status |
|---|---|---|
| **`2026-10-10-314`** | Decision 1: *"MSG91 is the SMS gateway "for now" — behind the existing SMS seam, so a later vendor is another adapter (⛔ a rewrite)."* Decision 2: *"a MSG91 client behind the SMS seam (Flow v5 for texts; OTP v5 or Flow for the codes — its own create-story decides), a stored MSG91 template id per template, sending NAMED variable values (TV13), `91…` number format, error classification on `type`, delivery-report correlation, the prod boot check and tests across `apps/api` and `apps/jobs` … ⛔ no `epics.md` entry yet (owed at its create-story)."* | author-commit — THIS ROW's charter |
| `2026-10-10-313` | TV1–TV12 (6.34): SmartPing keeps `{#var#}` in the text; types tagged separately; TV12 records the "TWT" brand / English-only OTPs / dotted secret names. | author-commit |
| `2026-10-12-322` | C1: a malformed helpline is SENT and ALARMED. C2 (iii): `DLT_VAR` / `sms.dlt.template_id.` only in `REGISTRY_FILES` (+ `apps/api/src/deps.ts`). C7: a refusal of Devanagari / spaces goes back to the Panel. *"Recorded: row 6-37's create-story owes an SMS-provider ADR (ADR-0027 / -0028 / -0040 precedent)."* | author-commit |
| `2026-10-12-323` | R2: *"if it arrives only in an asynchronous delivery report (this repo consumes ⛔ delivery report), the send is recorded `accepted` and 6.19c's D22 `reachedBySms` counts the family REACHED … PRE-EXISTING for EVERY DLT rejection cause."* | author-commit (accepted cost) |
| **`2026-09-27-252`** | cl.1 *"A closure may be **requested** only when, for **each** person who must be reached, ≥ 1 reminder was **accepted** by the network (or shown **delivered**, where a report exists) — **or** a posted letter has a **recorded delivery date**."* cl.3 *"PROVEN DELIVERY (option B) MAY BE BUILT IN A FUTURE VERSION. ⛔ Not now."* Consequence 3: a DLR integration *"would need its own row"*. | ⭐ **TRUSTEE-RATIFIED** |
| `2026-10-10-302` RN4 | *"Provider-side config faults (`dlt_template_not_approved`, `auth`, `unknown`) stay FINAL `error` + alarm … the SMS gateway gives ⛔ pre-flight to tell a paused account from a bad request."* ⚠ MG5 GIVES a pre-flight — read MG5's note. | author-commit |
| `2026-10-08-295` RB12 | a missing config never uses up a slot; the sweep checks before enqueueing. | author-commit |
| `2026-10-16-343` / `2026-10-17-344` | 6.27c's re-claim "may have sent" residual; the Hindi lineage (Row 28 the control). | author-commit |
| Roster Row 30 | (b) *"a real login OTP AND a step-up OTP received on a device — ⚠ ALSO waits for row 6-37's MSG91 adapter"*; (d) the providers' written answers; note (3) *"row 6-37's create-story owes an SMS-provider ADR"*. | go-live gate — ⛔ a merge fence |
| deferred-work | *"⛔ DLT send consumes a delivery report — a rejection seen only there is recorded `accepted` …"* — *"Likely closer: row `6-37-msg91-sms-gateway-adapter`"*. | open — MG1 hands it to 6-37b |

## ⭐ THE INVARIANTS

1. **I1 — The words never change.** For every template, the values sent, substituted into the REGISTERED text in slot order, equal
   byte-for-byte the body the caller renders through the real i18n `t()` today. The existing lockstep tests stay green UNCHANGED;
   ⛔ a `claim.json` / `common.json` / registry text edit ([[feedback_stub_must_call_not_transcribe]]).
2. **I2 — One seam.** Every SMS still leaves through `SmsMessagingHandle.send` (`sms-app.ts:30-37`); `ChannelProvider`, `RenderedMessage`,
   `dispatch`, `cascade`, `render` are ⛔ edited (frozen — `channels-determinism`).
3. **I3 — `accepted` needs `"type":"success"` AND a request id.** HTTP 200 alone is ⛔ an acceptance (F9). ⛔ Never a fabricated id.
4. **I4 — An account / template fault never spends a once-ever slot.** It is caught by the pre-flight (a HOLD, RB12) or, if it surfaces
   at send, classified `auth` / `dlt_template_not_approved` so 6.27c's P1 stops the child.
5. **I5 — The stored detail grammar is untouched.** Every new detail fits the existing classes and `[A-Za-z0-9_.-]{1,64}` without a run of
   7 digits (0155 / 0166 CHECKs, `SUSPICION_NOTICE_SMS_ERROR_CLASSES`, `PEER_MESH_REQUEST_DETAIL_PATTERN`) ⇒ ⛔ migration. Pre-flight
   codes are ALARM codes only, ⛔ stored (the 6.27c R11 precedent).
6. **I6 — No secret, number or text in a log, alarm, detail or error message** (the authkey, the recipient, a value, the body). Alarms
   name the template's config key and the class only.
7. **I7 — Tests never touch MSG91.** Every test injects `fetch`; ⛔ a network call, ⛔ a "smoke test" against `control.msg91.com` (T1).

## 📜 Policy meaning (AI-10-1)

**This story introduces ⛔ no predicate and changes ⛔ none that gates a member's access to a benefit.** It changes which vendor API
carries texts the platform already composes, and adds a configuration check that HOLDS a send while the SMS account or a template is
broken. In the member's terms: *"the login codes and texts the Trust sends you say exactly what they said before; they now actually reach
your phone through MSG91; and if the Trust's SMS account is broken, your text waits for the next run instead of being marked as sent."*
⚠ Where a sweep already holds (the suspicion notices, the neighbours' request), the hold delays a text; it ⛔ changes who is texted or
which text — RB12's existing hold, applied to one more config fault. On the correction, closure and certificate paths ⛔ hold is added:
a broken template ends that reminder exactly as a missing template id does today (MG5 ⚠⚠).
Niyamavali check: ⛔ not applicable (the Niyamavali does not speak to SMS vendors) — and it is ⛔ not ratified
([[feedback_niyamavali_rulebook_not_spec]]).

## ⭐ FOUND FACTS (at `466e9b0e`; MSG91's docs fetched 2026-10-17 — re-check at Task 0.1)

**The code today**
- **F1** — `SmsGatewayMessage {to, dltTemplateId, body}` (`sms-app.ts:40-47`); `buildRequestBody` → `{sender, to, template_id, message}`
  (`:136-145`); `Authorization: Bearer` (`:201-208`); `extractMessageId` wants `messageId` (`:166-180`). ⇒ against MSG91 every success
  would throw "no messageId" and be classified `unknown`. ⛔ No timeout anywhere in `packages/channels/src` (no `AbortSignal`).
- **F2** — `sms-errors.ts:27-46` code sets are placeholders: *"⚠ CODES ARE INDICATIVE, VERIFY AT IMPLEMENT TIME"* (`:9-13`).
- **F3** — `createSmsDltProvider({messaging, dltTemplateId})` (`sms-dlt.ts:53`) maps `rendered.body` into the message (`:46-53`); the frozen
  `RenderedMessage` carries only title / body / deepLink (`provider.ts:31-48`) ⇒ ⛔ room for variables in the port.
- **F4** — `sendClaimDltSms` takes `render: (helpline) => string` (`claim-dlt-sms-send.ts:100-110`) — the values are closed over at the
  callers and ⛔ reach the transport. It builds the provider PER SEND (`:142`) ⇒ values can be bound in `SmsProviderDeps` per send without
  touching the port. Class map `:150-162`: `invalid_number` → `rejected_invalid_number`; `carrier_reject` → `rejected_unreachable`;
  `rate_limited` / `api_unavailable` / timeout → transient; everything else → final `error` + alarm.
- **F5** — The five callers of the core: correction reminder (`claim-correction-reminders.ts:210-231, :416`), closure notice
  (`claim-correction-closure.ts:370-386`), certificate reminder (`claim-certificate-reminders.ts:657-685`), suspicion notices
  (`claim-suspicion-notices.ts:437-460`, pre-send `purposeConfigGap` `:123-131`), peer-mesh request (`claim-peer-mesh-requests.ts:673-715`,
  `globalConfigGap` / `pariwarConfig` `:168-220`).
- **F6** — OTP: `createSmsDltStepUpDelivery` calls `messaging.send({to, dltTemplateId, body: renderOtpBody(...)})` directly
  (`sms-step-up-delivery.ts:167-173`), its own 10 s bound (`:78`, abandoned ⛔ aborted). Callers: login + step-up
  (`member-auth.handlers.ts:244, :533`), the claim handover (`claims.service.ts:180-188`, `template:'step_up'`), the data-export OTP
  (`member-data-rights/handlers.ts:673-689`). The admin step-up is ALWAYS the stub (`deps.ts:310-312`) — ⛔ route it here. The gateway id
  is ⛔ persisted (the audit has `delivery_channel` / `delivery_status` only).
- **F7** — Config: api `config.ts:427-439` (`SMS_GATEWAY_API_URL` default placeholder `https://sms-gateway.invalid/send` `:21`;
  `SMS_GATEWAY_API_KEY_SECRET_NAME` / `_SENDER_ID_SECRET_NAME` + `_ENV_FALLBACK`); jobs mirrors it (`contribution-providers.ts:218-235`) but
  the URL defaults to `''`. ⚠ Two clients, two defaults. ⛔ `SMS_PROVIDER` switch exists. ⛔ SMS vars in any `.env.example` / infra file.
- **F8** — Prod boot check: api ONLY (`deps.ts:231-239` — key, sender, both OTP ids, a real URL). jobs has ⛔ fail-fast (unset ⇒ fixture
  for dispatch, a per-send `config:sms_gateway_unconfigured` final for the claim texts — but the sweeps' gap checks HOLD first).

**MSG91 (sources in Latest tech information)**
- **F9 — ⭐⭐ the deciding fact.** MSG91 reports most errors ASYNCHRONOUSLY. A Flow call with a FAKE authkey returned **HTTP 200
  `{"type":"success","message":"<id>"}`** (probed 2026-10-17 — see T1). `realTimeResponse: "1"` returns the error only on the SECOND
  identical call (*"a cache of this call is temporarily stored"*), and only for codes 201, 203, 301, 306, 308, 400, 401, 403, 418.
  Failures otherwise surface in the panel's Failed Logs, by email, or a webhook's "API Failed" event. ⇒ a `success` is ⛔ an acceptance
  of the account or the template.
- **F10** — Flow v5: `POST https://control.msg91.com/api/v5/flow`; headers `authkey`, `content-type: application/json`,
  `accept: application/json`; body `{template_id, short_url, short_url_expiry?, realTimeResponse?, recipients:[{mobiles:"91XXXXXXXXXX",
  <name>: value}]}`. The id field is `template_id` (the legacy doc / SDK say `flow_id` — 6.34 Debug Log (c) ANSWERED: `template_id`).
- **F11** — Variable names are case-sensitive and equal the `##name##` in the MSG91 template; values are limited to 40 characters by DLT
  ("for English and Unicode both"). Unicode is a property of the TEMPLATE (`smsType` NORMAL / UNICODE at creation), ⛔ a Flow field.
- **F12** — Sender id and DLT TE id live ON the MSG91 template (`addTemplate` takes `sender_id`, `dlt_template_id`); ⛔ in the request.
- **F13** — `short_url: "1"` makes MSG91 rewrite URLs in the text to its own short domain ⇒ 6.30's whitelisted
  `https://<domain>/peer-request?` would ⛔ be what the operator sees (Row 29 (f)) and the app link would ⛔ open the app.
- **F14** — Number format: *"Number is not in proper format (91XXXXXXXXXX)"* is MSG91's Invalid Number. Our callers pass E.164 `+91…`.
- **F15** — Error codes (MSG91 help, "API failed" reasons): 201 bad credentials · 202 invalid mobile · 203 invalid sender / DLT entity
  missing · 204 SMS not enabled for the authkey · 207 invalid authkey · 208 IP blacklisted · 211 DLT template id missing · 301
  insufficient balance · 302/303 expired / banned account · 306 route unavailable · 310 SMS too long · 311 same content to the same number
  within 10 s (*"The first SMS will be delivered and the second will be rejected"*) · 400 template id missing / incorrect / archived · 401
  flow not approved · 402 hard-block keywords · 403 flow disabled · 418 IP not whitelisted · 421 service terminated · 506 / 601 internal ·
  603 sender blacklisted · 604 no valid number. Other shapes: HTTP 401 `{"message":"Auth Key missing","type":"error"}`; HTTP 200
  `{"message":"The provided flow ID or template ID is invalid.","type":"error"}`.
- **F16** — ⭐ A read-only template endpoint EXISTS: `POST https://control.msg91.com/api/v5/sms/getTemplateVersions` `{template_id}` →
  `data.data[]` of versions with `template_data`, `DLT_ID`, `sender_id`, `status`, `active_status`, `sms_type`, `dlt_verified`,
  `dlt_reason`, `reject_reason`; HTTP 401 `{"status":"fail","hasError":true,"errors":"Unauthorized","code":"401"}` with no authkey; HTTP
  200 `{"status":"error","hasError":true,"errors":"Template content type could not be fetched"}` for *"Authkey invalid/template ID
  invalid"* (⛔ distinguishable). ⚠ The MEANING of `status` / `active_status` / `dlt_verified` values and which version is the default
  is ⛔ documented (UNVERIFIED — Task 0.1).
- **F17** — SendOTP v5 (`/api/v5/otp?template_id=&mobile=&otp=`) accepts our own code; the template must hold `##OTP##` (upper case);
  MSG91 recommends it (voice backup, "processed … in less than half a second"); its retry endpoint defaults to VOICE. ⚠ It too answered
  `type:"success"` to a fake authkey (F9).
- **F18** — Delivery reports: a panel-configured webhook only (⛔ a per-request callback), JSON, one payload per recipient, keyed by
  `requestId` (= Flow's `message`) + `telNum`; ⛔ signature — static custom headers only; retries 4 or 5 (the docs disagree); DLT
  scrubbing failures arrive ONLY here (`failureReason` "DLT Scrubbing Failed", "Template not matched on DLT", …). ⇒ 6-37b's territory.
- **F19** — ⛔ idempotency key (`CRQID` / `UUID` are echo-back metadata); the only dedupe is 311's 10 s window. ⛔ sandbox (a DEMO account
  REPLACES the content). Authkeys can be multiple, each with a service RULE and IP security (ON by default; 418 when the IP is not
  whitelisted — reported async, F9). ⛔ published API rate limit.
- **F20** — The official npm `msg91` (2.2.8) calls the legacy `api.msg91.com` with `flow_id`, depends on axios ^0.27, and its source repo
  404s ⇒ native `fetch` (the ADR-0028 / -0040 precedent — zero new deps).

**The records and the gate**
- **F21** — Gate `dlt-typed-variables` rule (iii): the identifier `DLT_VAR` and the literal `sms.dlt.template_id.` may appear ONLY in
  `REGISTRY_FILES` + `TEMPLATE_ID_ALLOWLIST` (`['apps/api/src/deps.ts']`) — ⚠ comments included (6.34 Trap 10).
- **F22** — The stored detail CHECKs (0155 suspicion, 0166 peer mesh) allow the gateway arm
  `(invalid_number|carrier_reject|rate_limited|api_unavailable|dlt_template_not_approved|auth|unknown):[A-Za-z0-9_.-]{1,64}` and an
  ENUMERATED `config:` arm (`dlt_template_id_missing|helpline_number_missing|sms_gateway_unconfigured|sms_messaging_unavailable|
  secret_manager_…`). A new class or `config:` word ⇒ a migration + two TS mirrors. 0128 / 0138 / 0151 have ⛔ such CHECK.
- **F23** — ⛔ ADR covers SMS; next free number ADR-0041. `docs/knowledge-transfer/adr-index.md` holds reserved slots
  `ADR-NNNN-otp-channel-primary` (`:169`) and `ADR-NNNN-channel-provider-selection` (`:170`); the push / WA slots were never flipped when
  ADR-0027 / -0028 landed. ADR-0040 (staff email, `drafted`) is the closest shape; the index's breakdown is reconciled in the SAME commit.
- **F24** — epics.md: Epic 6 ends at the `---` before `## Epic 7` (`:3511`); the last entry is 6.36 (`:3485`). Roster: next free row 32;
  Row 24 `staff-email-transport` is the transport-row precedent.

## ⚖️ Build decisions MG1–MG16 (⏳ PROPOSED — BigDev answers at Task 0.2; committed ALONE at Task 0.3)

- **MG1 — Split delivery reports into a NEW row `6-37b-msg91-delivery-reports`.** (a) ⭐ **Recommended:** 6.37 = the adapter, the named
  values, the pre-flight, the boot checks, the ADR; 6-37b = MSG91's webhook (persist-then-ack, static-header auth — F18 has ⛔ signature),
  an inbound table, correlation by request id + recipient, delivery state on the five send tables (⚠ 0166's finished-row trigger freezes
  peer-mesh delivery columns; `delivered_at` exists on 0128 / 0138 but is ⛔ granted), the OTP's gateway id in its audit, and the
  `-252` question (does a reported FAILURE stop a send counting as reached? — the Panel's). Cost: `-314` decision 2's "delivery-report
  correlation" moves to another row; the deferred delivery-report item's trigger ("before any claim-text template id is provisioned")
  now names 6-37b. (b) All in 6.37 — a webhook route, a migration and a Panel question inside the adapter; the OTP device proof
  (Row 30 (b)) would wait on all of it.
- **MG2 — The OTPs go through Flow, ⛔ SendOTP.** (a) ⭐ **Recommended:** Flow v5 with templates 15 / 16 and the variable `otp` — one code
  path, one classifier, TV13's lower-case name kept, our code generated and verified by us (architecture §2.2's security floor unchanged),
  ⛔ voice retry (voice OTP is its own ADR — architecture §2.2). Cost: MSG91's OTP-route speed claim forgone (UNVERIFIED for Flow — the
  Row 30 (b) device proof measures it). (b) SendOTP v5 with `otp=<ours>` — a second client and response shape; the template must say
  `##OTP##`, breaking TV13's `^[a-z]…` and the sheet's `##otp##`; F17's false positive is the same.
- **MG3 — Named values travel down the seam; the body stays as the oracle.** `SmsGatewayMessage` becomes `{to, templateId, values, body}`
  — `values: ReadonlyArray<{name, value}>` in slot order, `body` the caller's rendered text (⛔ sent, ⛔ logged — kept so every existing
  fake and live assertion keeps its oracle). `SmsProviderDeps` gains `values` (bound per send — F4). `sendClaimDltSms` gains
  `template: {text, slots}` and `values: (helpline) => Record<name, string>` beside `render`, and BEFORE the network checks (i) the value
  names equal the slot names exactly and (ii) `substituteDltValues(text, slots, values) === render(helpline)` — a failure is final
  `error` `dlt_template_not_approved:values_mismatch` + alarm (scope-wide ⇒ P1 stops; I1 as a runtime guard, because F9 means a mismatch
  would otherwise be recorded `accepted`). `substituteDltValues` and `toGatewayTemplate(text, slots, (n) => '##'+n+'##')` live in
  `dlt-variables.ts` (a registry file — F21). ⭐ Recommended. Alternative: drop `body` — touches every fake for ⛔ gain.
- **MG4 — Template ids: the EXISTING keys hold MSG91's id.** (a) ⭐ **Recommended:** `sms.dlt.template_id.<…>` (all 16) holds MSG91's 24-hex
  template id; the DLT TE id lives on MSG91's template (F12) and is recorded in the panel and on Row 32. ⛔ key, registry, gate or Row 30
  wording changes. Cost: the key's name says "dlt" for a gateway id — stated in each registry header and the ADR. (b) A sibling
  `sms.msg91.template_id.<…>` per template — 16 new keys, a gate extension, the DLT keys unused by code.
  A value that is ⛔ `^[0-9a-fA-F]{24}$` (e.g. a 19-digit DLT TE id pasted by mistake) is caught by the pre-flight / boot check, and at send
  is final `dlt_template_not_approved:template_id_malformed` (I5 — ⛔ a new `config:` word).
- **MG5 — ⭐⭐ The pre-flight (the answer to F9).** `checkMsg91Template(client, {text, slots, locale}, templateId)` calls
  `getTemplateVersions` and requires: an authorised response; a version whose `template_data` equals `toGatewayTemplate(text, slots)`
  (byte-for-byte after CRLF → LF; ⚠ which version is the DEFAULT is UNVERIFIED — Task 0.1 settles it; until then ANY version matching
  and ⛔ one marked inactive); `sms_type` = `UNICODE` for `hi`, `NORMAL` for `en`; `DLT_ID` non-empty. `status` / `active_status` /
  `dlt_verified` / `dlt_reason` / `reject_reason` are LOGGED (⛔ values gating) until their meaning is confirmed (Row 32 (d)).
  Where: **api** — at prod boot for templates 15 / 16 (with `buildMemberStepUpDelivery`). **jobs** — ONE memo per run
  (`ClaimDltSmsDeps.preflight(templateId, entry)`, built by each sweep, one MSG91 call per template per run), consulted in TWO places:
  (1) **inside the send core** after the id resolves, for EVERY caller — a fault is the SAME kind of final today's missing id is
  (`error` + alarm): `auth:preflight` or `dlt_template_not_approved:preflight_<reason>`; a transport fault is transient
  `api_unavailable:preflight` (I5 — existing classes, ⛔ `config:` word); (2) **in the sweeps that ALREADY hold** — 6.29's
  `purposeConfigGap` (`claim-suspicion-notices.ts:123`) and 6.27c's `globalConfigGap` / `pariwarConfig` (`claim-peer-mesh-requests.ts:168`;
  ⚠ `globalConfigGap` is synchronous today — it becomes async) — a fault HOLDS the run before any row is claimed (⛔ slot used, RB12) with
  an alarm `config:sms_preflight_<reason>:<configKey>` (alarm-only, ⛔ stored — the R11 precedent).
  ⚠⚠ The 6.19b / 6.19c / 6.19d sweeps (correction reminder, closure notice, certificate reminder) have ⛔ hold path — a config fault there
  is a per-row final `error` + alarm TODAY (`config:dlt_template_id_missing`). Giving them a hold would change WHEN those families are
  texted — the input of D22 / the Trustee-ratified `-252` — which `-322` §0 calls the Panel's. ⇒ they get (1) ONLY: a broken template
  ends each row exactly as a missing template id does today (⛔ new behaviour, only a new cause). ⭐ Recommended.
  api outcome: an auth / not-found / content / unicode / malformed-id fault ⇒ REFUSES TO START (the same class as a blank id today); a
  transport failure / 5xx / timeout ⇒ starts with an error log (⛔ couple login availability to MSG91's template API).
  Cost: one extra MSG91 call per template per run; a broken template stops EVERY text of that template until fixed — the point. ⚠ RN4 (`-302`) said "the SMS gateway gives ⛔ pre-flight" — this ADDS one;
  RN4's finals are ⛔ changed (a fault at send is still final + alarm); the decision entry says so ([[feedback_supersede_never_reinterpret]]).
  Residual (MG15): a fault arising AFTER the pre-flight (a key disabled, balance exhausted mid-run) ⇒ `success` ⇒ `accepted` — 6-37b's.
- **MG6 — Classify on `type`, ⛔ HTTP status alone.** `accepted` ⇔ HTTP 2xx AND `type === "success"` AND `message` a non-empty string ≤ 64
  of `[A-Za-z0-9]` (I3). `type === "error"` ⇒ by `code` (MG7) when present; else by HTTP status (401 / 403 → `auth`, 429 →
  `rate_limited`, 5xx → `api_unavailable`); else by the two documented sync messages (F15: "Auth Key missing" → `auth:authkey_missing`;
  "flow ID or template ID is invalid" → `dlt_template_not_approved:template_invalid`); else `unknown:msg91_error`. A 2xx with neither
  type ⇒ `unknown:no_type`. ⛔ `realTimeResponse` (F9 — the error only on a second identical send). ⭐ Recommended.
- **MG7 — The code table (data-driven, replaces F2's placeholders).** `auth`: 201, 204, 207, 208, 301, 302, 303, 418, 421 (⚠ `auth` now
  means "the gateway ACCOUNT refuses" — balance and IP included, so P1 stops on them — stated in `sms-errors.ts` and the ADR);
  `dlt_template_not_approved`: 203, 211, 310, 400, 401, 402, 403, 603; `invalid_number`: 202, 604; `api_unavailable`: 306, 506, 601;
  `unknown`: 311 (⚠ "the first SMS will be delivered" — a may-have-sent final + alarm) and every unlisted code. Detail = `<class>:<code>`
  (I5). ⭐ Recommended.
- **MG8 — The number: strip the `+`, validate by CALLING `normalizeMobile`.** The client sends `normalizeMobile(to).slice(1)`
  (`91XXXXXXXXXX`); a `to` that `normalizeMobile` rejects, or that it changes (⛔ already canonical), is a local `invalid_number:format`
  with ⛔ request ([[feedback_stub_must_call_not_transcribe]] — ⛔ a second regex). ⭐ Recommended. Partly closes deferred-work
  *"`resolveSmsTarget` trusts `decryptMobile`'s output uncritically"* for the SMS path (record "Closed by 6.37 for SMS; push / WA ⛔
  addressed").
- **MG9 — The request.** One recipient per call; `short_url: "0"` ALWAYS (F13); ⛔ `realTimeResponse`; ⛔ `CRQID` (6-37b decides
  correlation); `AbortSignal.timeout(10_000)` in the client (abort ⇒ `api_unavailable:timeout`); the callers' own bounds unchanged.
  Retries: unchanged (transient ⇒ pg-boss) — ⚠ MSG91 has ⛔ idempotency key (F19), so the deferred *"At-least-once SMS"* items stay
  open with this finding added (⛔ closed). ⭐ Recommended.
- **MG10 — Config: one gateway, ⛔ provider switch.** `createSmsAppClient` builds the MSG91 client; the generic Bearer contract is REMOVED
  (it matches ⛔ gateway — keeping it selectable is a footgun; a later vendor is another adapter, `-314` decision 1). `SMS_GATEWAY_API_URL`
  becomes the API ORIGIN, default `https://control.msg91.com` in BOTH apps (F7's divergence closed; the placeholder constant and its boot
  arm retire); `SMS_GATEWAY_API_KEY_SECRET_NAME` holds the MSG91 authkey; `SMS_GATEWAY_SENDER_ID*` RETIRE from the required set (the
  sender is on the template — F12; the pre-flight LOGS each template's `sender_id`). `isConfigured()` = a non-blank authkey and origin.
  ⭐ Recommended. Alternative: keep `SMS_GATEWAY_SENDER_ID` as an EXPECTED value the pre-flight compares — one more secret for a check
  Row 32 (d) already makes by eye.
- **MG11 — jobs boot.** ⛔ fail-fast (jobs runs many non-SMS duties; the sweeps HOLD per run — MG5); in production, one boot log line
  when the gateway is unconfigured. ⭐ Recommended.
- **MG12 — The dispatch path stays dark.** A message with ⛔ `values` (the alert composition — `resolveSmsProviderDeps` has none) is
  refused locally `dlt_template_not_approved:no_named_values`; every alert category stays DARK (TV6); ⛔ composition change. ⭐ Recommended.
- **MG13 — ADR-0041 `sms-gateway-msg91`, `drafted`, a NEW index row.** Context (F1, F9, `-314`); Decision (MSG91 Flow v5 behind
  `SmsMessagingHandle`, native fetch); Alternatives (SendOTP, legacy `sendhttp` + `DLT_TE_ID`, the npm SDK, a second gateway now);
  Consequences (async errors and the pre-flight; `accepted` is ⛔ delivery; ⛔ idempotency; static-header webhooks for 6-37b; IP
  whitelisting vs the production egress; restart-required-on-rotation kept; the processor's data handling — member names and mobiles
  pass through MSG91, "an India-region processor" is OUR reading, ⛔ a ratified constraint — the ADR-0040 precedent); the pivot path.
  The index row + breakdown reconciliation in the SAME commit; slot `:170` gains a one-line annotation naming 0027 / 0028 / 0041 as
  partial fills (⛔ flipped). ⭐ Recommended.
- **MG14 — Roster Row 32 `sms-gateway-msg91-provisioned`.** Closure (ALL): (a) ADR-0041 ratified; (b) an authkey whose rule allows SMS
  only, IP security ON with the production egress IP(s) whitelisted; (c) MSG91's TM id bound in the PE-TM chain on SmartPing and the
  sender id mapped to the PE id; (d) each template created in MSG91 from the sheet's MSG91 column with its DLT TE id, `smsType` per
  locale, marked default; the meaning of `status` / `active_status` / `dlt_verified` recorded from MSG91 in writing; (e) the pre-flight
  green on the deployed api AND jobs; (f) MSG91's data-processing terms on record. Row 30 (b) gains an annotation pointing here.
  ⛔ A merge fence. ⭐ Recommended.
- **MG15 — The reading on `-252` cl.1 and `-323` R2 (record it).** After this story, `accepted` means *"MSG91 answered success for a
  request whose authkey and template passed this run's pre-flight"*. `-252` cl.1 asks that a reminder was *"accepted by the network"*:
  ⭐ **MATCHES** with MG5 (the Panel chose option A knowing "accepted is not received" — `-252`'s own reading). ⚠ Without MG5 it WIDENS
  (a request MSG91 refused for its key would count as reached) — and THAT would be the Panel's. The residual (a fault arising between
  the pre-flight and the send; a DLT scrubbing failure) is the class `-323` R2 accepted, now WIDENED to account faults arising mid-run;
  its closer is 6-37b. ⭐ Recommended: record as part of the author-commit.
- **MG16 — Dispositions of the items this story's change re-triggers** ([[feedback_closure_language_precision]]): (i) 6.27c's
  *"send hours are re-checked just BEFORE the send core, ⛔ inside it"* — its trigger ("the next change to `sendClaimDltSms`") FIRES:
  ⭐ **Recommended NOT ADDRESSED**, re-armed: 6.37 adds ⛔ await between the caller's check and the network call except the existing
  config resolution (MG3's checks are synchronous); new trigger "a change that adds an await before the network call inside the core".
  (ii) *"Dotted Secret Manager names (UNVERIFIED)"* — ⛔ addressed; the api boot already surfaces it (an `INVALID_ARGUMENT` throws at
  boot). (iii) *"`resolveSmsProviderDeps` doesn't trim"* — ⛔ addressed (the path is dark, MG12). (iv) the delivery-report item — handed
  to 6-37b (MG1). (v) MG8's partial close.

## Acceptance Criteria

1. **AC0 — Governance before code (Task 0).** MG1–MG16 answered by BigDev and committed ALONE as one author-commit; ADR-0041 (`drafted`)
   + its index row; the `epics.md` `### Story 6.37` entry; roster Row 32 + the Row 30 (b) annotation; the 6-37b sprint row (if MG1 (a));
   the sprint ledger line — all committed BEFORE any code.
2. **AC1 — The Flow request (MG9, MG10, F10).** **Given** a message `{to:'+919876543210', templateId:<24-hex>, values:[{name:'otp',
   value:'048213'}]}` **then** the client POSTs `<origin>/api/v5/flow` with headers `authkey: <key>` (⛔ `Authorization`),
   `content-type: application/json`, `accept: application/json`, a `signal`, and a body whose PARSED JSON deep-equals
   `{"template_id":"<id>","short_url":"0","recipients":[{"mobiles":"919876543210","otp":"048213"}]}` — ⛔ `sender`, ⛔ `message`,
   ⛔ `realTimeResponse`, ⛔ `CRQID`, ⛔ the body text.
3. **AC2 — Acceptance needs `type` (MG6, I3).** `{"type":"success","message":"5e1e93cad6fc054d8e759a5b"}` ⇒ accepted with that id;
   HTTP 200 `{"type":"error","message":"…"}` ⇒ rejected; HTTP 200 with ⛔ `type`, or `success` with a blank / non-string / 65-char /
   non-alphanumeric `message` ⇒ rejected `unknown:…`; ⛔ a fabricated id in any case.
4. **AC3 — The code table (MG7).** One test row per code in MG7 → its class and detail `<class>:<code>`; the two sync messages → their
   tokens; HTTP 401 / 429 / 503 with ⛔ code → `auth` / `rate_limited` / `api_unavailable`; a network throw → `api_unavailable`; an abort →
   `api_unavailable:timeout`. Every detail matches the 0166 gateway-arm regex (assert it against `PEER_MESH_REQUEST_DETAIL_PATTERN` —
   imported, ⛔ copied).
5. **AC4 — The number (MG8).** `+91…` → `91…`; a `to` that `normalizeMobile` rejects or rewrites ⇒ `invalid_number:format` and
   `fetch` ⛔ called.
6. **AC5 — Named values from every caller (MG3, I1).** For EACH of templates 1–16, a test drives the REAL caller (the five sweeps' send
   paths and `createSmsDltStepUpDelivery`) with a fake handle and asserts (i) `values` names = the registry's slot names, in order,
   (ii) `substituteDltValues(text, slots, values) === body`, (iii) `body` is byte-identical to today's render (the existing lockstep
   expectations, ⛔ edited). A caller whose `values` disagree with `render` ⇒ `dlt_template_not_approved:values_mismatch`, ⛔ `fetch`, an
   alarm — and on the peer-mesh child P1 STOPS the run.
7. **AC6 — The gateway form equals the sheet.** `toGatewayTemplate(text, slots)` equals the sheet's MSG91 column for every row 1–16
   (via the existing `sheetRowByConfigKey` — the sheet test's `msg91Form` stays an independent oracle and the two are asserted equal).
8. **AC7 — The pre-flight (MG5).** With a fake `getTemplateVersions`: matching content + right `sms_type` + `DLT_ID` ⇒ pass; each of
   {HTTP 401; HTTP 200 `status:"error"`; ⛔ version matching; `sms_type` wrong for the locale; blank `DLT_ID`; a malformed id (⛔ call
   made)} ⇒ its reason; a 5xx / network / timeout ⇒ `transient`. ⛔ `status` / `active_status` / `dlt_verified` value changes the result
   (logged only — a test pins that).
9. **AC8 — api boot (MG5, MG10).** In production `buildMemberStepUpDelivery` throws on a blank authkey, a blank or malformed OTP id, or a
   pre-flight fault on either template; it STARTS (error log, ⛔ throw) on a pre-flight transport failure; ⛔ longer requires the sender id
   or a non-placeholder URL. Dev / CI unchanged (the reveal stub). `member-step-up-delivery-wiring.test.ts` updated, each arm covered.
10. **AC9 — jobs: the pre-flight in the core, the hold where a hold exists (MG5, I4).** (a) The suspicion and peer-mesh sweeps: a
    pre-flight fault on a template the run needs ⇒ the run HOLDS, ⛔ row claimed, ⛔ slot used, one alarm naming the config key and reason
    (⛔ id, ⛔ number); a transient pre-flight ⇒ held, retried next run. (b) The correction / closure / certificate sweeps: each row ends
    `error` + alarm with `auth:preflight` / `dlt_template_not_approved:preflight_<reason>` — the SAME outcome a missing template id gives
    today (assert both side by side), ⛔ a hold; a transient ⇒ the row's existing transient path. (c) A pass ⇒ the run proceeds. (d) The
    pre-flight runs ONCE per template per run, whatever the row count (counted).
11. **AC10 — Nothing else moves.** ⛔ migration; ⛔ i18n / registry text / sheet table edits (the sheet's *"Where and how we register"*
    MSG91 bullet gains the setup steps — prose only); ⛔ `ChannelProvider` / `RenderedMessage` / dispatch / cascade / render change
    (`channels-determinism` green); the alert categories stay dark (MG12 test); gate `dlt-typed-variables` green.
12. **AC11 — The proof.** `pnpm ci:local` green (or each red explained — the known 35/36 jsdom-under-load case re-run alone), every live
    suite run with `DATABASE_URL` at :5433 explicitly; ⛔ network call in any test (I7 — a test stubs global `fetch` to throw and the suites
    stay green).

## Tasks / Subtasks

- [ ] **Task 0 — governance FIRST (AC0). ⛔ No code.**
  - [ ] 0.1 `git fetch origin`; `git diff --name-only 466e9b0e..origin/main -- packages/channels apps/jobs/src/scheduler apps/api/src/deps.ts
        apps/api/src/config.ts apps/api/src/modules/auth scripts/dlt-typed-variables docs/launch-gate-inventory`; re-read any cited file that
        moved. Re-fetch F9–F19 from `docs.msg91.com/sms/send-sms.md`, `sms/module.json`, `otp/module.json` and the help articles (record the
        date). ⭐ Settle F16's UNVERIFIED points if the docs now say (which version is the default; what `status` / `active_status` /
        `dlt_verified` mean) — if they still don't, MG5's "any version matching, ⛔ inactive" stands. ⛔ Probe MSG91 (T1).
  - [ ] 0.2 Put MG1–MG16 to BigDev, each with its recommendation and cost. Record the answers verbatim.
  - [ ] 0.3 Write the author-commit (`.decision-log.md`, prepended; the -344 entry's shape: Decision type / Status / Author / Ratifying
        trustees ⛔ None / §0 gate / Occasion / FOUND / The decisions / Consequences / References). It ADDS to `-314` and to `-302` RN4
        (MG5) and records MG15's reading — ⛔ edits either. Stage in scratchpad, try the insert ([[project_decision_log_writes_user_inserted]]).
        Commit ALONE on the story branch.
  - [ ] 0.4 The records (one commit, after 0.3): `docs/adr/ADR-0041-sms-gateway-msg91.md` from `_adr-template.md` (MG13) +
        `docs/knowledge-transfer/adr-index.md` row + breakdown reconciliation + the `:170` annotation; `epics.md` `### Story 6.37: …
        \`[PRIMITIVE]\`` before the `---` that precedes `## Epic 7` (the 6.34 entry's blockquote shape); roster Row 32 (MG14 — the Row 29–31
        block format, eleven fields) + the Row 30 (b) annotation (⛔ a word of Row 30 rewritten); if MG1 (a): the sprint row
        `6-37b-msg91-delivery-reports: backlog` under 6-37 with its comment, and the deferred delivery-report item annotated
        "closer: row 6-37b"; the sprint ledger line ([[project_sprint_status_safe_prepend]] — guard the size, verify the YAML). Row
        `6-37-msg91-sms-gateway-adapter` → `in-progress`.

- [ ] **Task 1 — the vocabulary helpers (AC5, AC6).** In `packages/channels/src/dlt-variables.ts`: `substituteDltValues(text, slots,
      values)` (throws on a name / count mismatch) and `toGatewayTemplate(text, slots, wrap)`; unit tests incl. a value containing
      `{#var#}` or `##x##` (substituted ONCE, left-to-right, never re-scanned). The jobs sheet test asserts `toGatewayTemplate` ===
      `msg91Form` for rows 1–16.

- [ ] **Task 2 — the MSG91 client (AC1–AC4).** Rewrite `packages/channels/src/providers/sms-app.ts` (keep the file, `SmsAppClient`,
      `SmsMessagingHandle`, `SmsSendError`, `SmsFetchLike` names — 23 files reference them at the pin): `SmsClientConfig {apiOrigin, authkey}`;
      `SmsGatewayMessage {to, templateId, values, body}`; `send` per MG6 / MG8 / MG9; add `readTemplateVersions(templateId)` for MG5.
      `SmsFetchInit` gains `signal`. Rewrite `sms-errors.ts`'s sets per MG7 (keep `SmsErrorClass` EXACTLY — I5; update the header's
      "INDICATIVE" warning to cite the MSG91 source + date). `sms-dlt.ts`: `SmsProviderDeps.values?` bound per send; ⛔ values ⇒ MG12.
      `getStatus` stays `unknown` (comment: delivery reports are row 6-37b). Tests in `packages/channels/tests/sms.test.ts` (the client
      block `:167-250` rewritten).

- [ ] **Task 3 — the pre-flight (AC7).** `packages/channels/src/providers/sms-preflight.ts`: `checkMsg91Template(client, entry, id)` →
      `{ok:true} | {ok:false, transient:boolean, reason}` (reasons: `auth`, `not_found`, `content_mismatch`, `sms_type`, `dlt_id_missing`,
      `template_id_malformed`); logs the informational fields (⛔ the authkey, ⛔ `template_data`). ⚠ This file must ⛔ name the
      `sms.dlt.template_id.` prefix or `DLT_VAR`, even in a comment (F21) — it takes `{text, slots, locale}` and an id. Export via
      `packages/channels/src/index.ts`.

- [ ] **Task 4 — the send core and the five callers (AC5, AC9).** `claim-dlt-sms-send.ts`: the `template` + `values` inputs and MG3's
      synchronous checks (before `smsAppClient.messaging()`); the malformed-id final (MG4). Each caller passes its registry entry and a
      `values` builder that uses the SAME inputs as its `render` (⛔ a second formatting of a date / name — call the existing formatter,
      e.g. `formatAppealUntil`). `ClaimDltSmsDeps.preflight` (a per-run memo each sweep builds) is consulted in the core for EVERY
      caller (MG5 (1)); the peer-mesh `globalConfigGap` / `pariwarConfig` and the suspicion `purposeConfigGap` also call it and HOLD
      (MG5 (2)); the correction / closure / certificate sweeps get ⛔ hold (MG5 ⚠⚠; T6). jobs config: `SMS_GATEWAY_API_URL` default
      `https://control.msg91.com`; drop the sender resolution; MG11's boot line. Update the fakes in `apps/jobs/tests/claim-correction-send
      .test.ts` and the `claim-*-live.test.ts` suites to record `values` and assert AC5 (ii).

- [ ] **Task 5 — the OTP path (AC5, AC8).** `sms-step-up-delivery.ts`: send `values: [{name:'otp', value: code}]` + `body:
      renderOtpBody(...)` + `templateId`. `deps.ts` `buildMemberStepUpDelivery`: MG10's config, the malformed-id check, the boot pre-flight
      for 15 / 16 (MG5 outcomes); keep the error string's literal keys (the `TEMPLATE_ID_ALLOWLIST` entry is for it). `config.ts`: the
      origin default; retire `SMS_GATEWAY_API_URL_PLACEHOLDER` and the sender fields (grep every use). Tests:
      `tests/unit/sms-step-up-delivery.test.ts`, `tests/integration/sms-step-up-delivery.spec.ts`,
      `tests/unit/member-step-up-delivery-wiring.test.ts`, `tests/unit/sms-composition.test.ts`.

- [ ] **Task 6 — the dark path and the gates (AC10).** MG12's test (a dark category's provider, if forced, refuses with
      `no_named_values` and ⛔ `fetch`); `pnpm --filter @twt/channels test:determinism`; `pnpm dlt-typed-variables:test &&
      pnpm dlt-typed-variables:check` (⚠ a new file must be `git add`-ed first); the sheet's *"Where and how we register"* MSG91 bullet
      gains the setup steps (create from the MSG91 column; DLT TE id; sender; `smsType` UNICODE for Hindi; mark default; ⛔ short URLs) —
      PROSE, ⛔ a table cell (rule (i) scans table rows; the 7-cell parse).

- [ ] **Task 7 — records and close (AC11).** `pnpm ci:local` with `DATABASE_URL` at :5433; the deferred-work dispositions (MG16, MG8,
      MG9 — each "Closed by" / "⛔ addressed" / "handed to", ⛔ collapsed); the Change Log; the File List; the sprint row → `review`; the
      ledger line. ⛔ Fast-forward to `main` — BigDev's call ([[feedback_land_prs_by_fast_forward]]).

## Dev Notes

### ⚠ TRAPS

1. **T1 — ⛔ Never call MSG91 from a test, a script or dev.** This story's research sent three Flow / OTP requests to
   `control.msg91.com` with a FAKE authkey (2026-10-17) to establish F9 — a one-off, recorded here so it is ⛔ repeated. ⛔ sandbox exists
   (F19); a real key sends a real, billed text to a real number. I7's global-fetch-throws test enforces it.
2. **T2 — HTTP 200 is ⛔ success** (F9, F15, F16). Every branch reads `type` (Flow / OTP) or `status` / `hasError` (template API).
3. **T3 — `short_url` must be `"0"`** (F13) — MSG91 would otherwise rewrite 6.30's whitelisted link.
4. **T4 — Gate rule (iii) reads comments** (F21). `sms-preflight.ts`, `sms-app.ts` and every test-adjacent `src` file must ⛔ spell the
   template-id prefix or `DLT_VAR`. Put the substitution helpers in `dlt-variables.ts` (a registry file).
5. **T5 — The detail CHECKs** (F22). Use ONLY the existing classes; MG's tokens (`values_mismatch`, `template_id_malformed`,
   `no_named_values`, `format`, `timeout`, `msg91_error`, `no_type`, `authkey_missing`, `template_invalid`, 3-digit codes) all fit
   `[A-Za-z0-9_.-]{1,64}`. ⛔ A `config:` word (enumerated). The pre-flight's `config:sms_preflight_*` codes are ALARM codes, ⛔ stored.
6. **T6 — Only two sweeps HAVE a hold.** 6.27c's peer-mesh (`globalConfigGap` / `pariwarConfig` + P1) and 6.29's suspicion
   (`purposeConfigGap`). The 6.19b/c/d sweeps have ⛔ pre-enqueue config check (verified at the pin: ⛔ `ConfigGap` in
   `claim-correction-reminders.ts`, `claim-correction-closure.ts`, `claim-certificate-reminders.ts`) — ⛔ add one
   ([[feedback_story_validate_footguns]] #43: a "reuse the sibling's hold" decision covers only the paths that HAVE the hold; MG5 ⚠⚠).
7. **T7 — The fixture and the real provider share `id: 'sms-dlt'`** — assert `providerMessageId`, never the provider id (6.34).
   `provider-composition.ts` imports the registry relatively — in apps/api mock the FILE path (6.34's TS6059 lesson).
8. **T8 — Live DB.** Every live suite with `DATABASE_URL=…:5433` EXPLICITLY (the worktree has no `apps/api/.env`); push with :5433
   ([[project_prepush_hook_inherits_5432]]). ⛔ migration is expected — if one seems needed, STOP: it means I5 broke.
9. **T9 — Contracts / jobs tests sit partly outside tsc** — run vitest per package ([[project_contracts_tests_outside_tsc]]).
10. **T10 — Prettier is ⛔ enforced** — hand-format; ⛔ `--write` ([[project_prettier_not_enforced]]).
11. **T11 — A Hindi template's MSG91 `smsType` is UNICODE** (F11) — the pre-flight checks it; a NORMAL Hindi template would be sent as
    garbage or refused.
12. **T12 — `311` is a may-have-sent** (F15) — ⛔ map it to `accepted` (no id) or to a transient (a retry inside 10 s is refused; after
    10 s it double-sends).

### Reuse map

| Need | Reuse | ⛔ Rebuild |
|---|---|---|
| Slot names / types | `DltSlot`, the six registries | a second slot list |
| MSG91 template text | `toGatewayTemplate` (new, in `dlt-variables.ts`) checked against the sheet's column | a hand-written template |
| Number | `normalizeMobile` (`@twt/domain`) | a regex |
| Value formatting | each registry's existing formatter (`formatAppealUntil`, the peer-mesh name rule) | a second formatter |
| Holds | each sweep's existing gap check + RB12 | a new hold mechanism |
| Scope-wide stop | 6.27c's `isScopeWideSendFault` (unchanged — MG7's classes feed it) | a new stop rule |
| Timeout shape | ADR-0040's `AbortSignal.timeout(STAFF_EMAIL_SEND_TIMEOUT_MS)` (`apps/jobs/src/scheduler/staff-email-client.ts:33, :198`) | a custom timer |
| ADR shape | ADR-0040 + `_adr-template.md` | a new shape |

### Testing standards

Vitest; inject `fetch` (`vi.fn<SmsFetchLike>()`) — ⛔ msw / MockAgent (house pattern, `packages/channels/tests/sms.test.ts:167-250`).
Response fixtures are the DOCUMENTED shapes (cite the URL in a comment). Lockstep tests call the real `t()` and the real registry —
⛔ transcribe a text. Live suites: :5433.

### Project structure notes

- **NEW:** `packages/channels/src/providers/sms-preflight.ts` (+ test); `docs/adr/ADR-0041-sms-gateway-msg91.md`.
- **UPDATE:** `packages/channels/src/providers/sms-app.ts`, `sms-errors.ts`, `sms-dlt.ts`, `packages/channels/src/dlt-variables.ts`,
  `packages/channels/src/index.ts`; `apps/jobs/src/scheduler/claim-dlt-sms-send.ts`, `claim-correction-reminders.ts`,
  `claim-correction-closure.ts`, `claim-certificate-reminders.ts`, `claim-suspicion-notices.ts`, `claim-peer-mesh-requests.ts`,
  `contribution-providers.ts`, `apps/jobs/src/boot.ts` (MG11 line); `apps/api/src/deps.ts`, `apps/api/src/config.ts`,
  `apps/api/src/modules/auth/shared/sms-step-up-delivery.ts`; their tests; the sheet's prose; the records (Task 0.4).
- **⛔ Touched:** `provider.ts`, `dispatch.ts`, `cascade.ts`, `render.ts`, `composition/provider-composition.ts` (MG12), any i18n file, any
  registry TEXT, any migration, `apps/mobile`, `apps/admin`.

### Sequencing

6.34 (done) → **6.37** → 6-37b (if MG1 (a)) before any CLAIM-text template id is provisioned (the deferred delivery-report item's
trigger). Row 30 (b)'s OTP device proof needs 6.37 + Row 32 — ⛔ 6-37b (OTPs feed ⛔ D22). 6-31 (WhatsApp reminder) is independent.

### Previous story intelligence (6.34, 6.27c)

- 6.34 gave every slot its MSG91 name (TV13) and the sheet its MSG91 column — this story CONSUMES them; ⛔ re-derive.
- 6.34's gate went red at birth twice (rule (i) on a sheet line, rule (ii) via `${DLT_VAR}`) — run the gate early (T4).
- 6.27c: P1 stops the child on `config:` / `auth:` / `dlt_template_not_approved:` — MG7 decides whether MSG91's faults land there.
  Its W10 (the sweep can't see `auth` / template faults ⇒ each child spends ONE slot) is NARROWED by MG5 — record "W10: narrowed by 6.37's
  pre-flight (auth / template / content seen before enqueue); the residual = a fault arising mid-run".
- 6.27c ci:local ended 35/36 on an admin jsdom timeout under load (alone 75/75) — re-run alone, record both.
- 6.27c's first live run hit :5432 because the worktree had no `.env` (T8).

### Git intelligence

The last five commits are 6.27c's review rounds and records (`f3c19b62` → `466e9b0e`) — they touched `claim-peer-mesh-requests.ts` and
`claim-dlt-sms-send.ts`'s neighbours; re-read both at Task 0.1. 6.34 (`548c5a1d`) is the template / gate change this story builds on.

### Latest tech information (fetched 2026-10-17 — re-check at Task 0.1)

- Flow v5: `https://docs.msg91.com/sms/send-sms.md` (updated 2025-10-09); contracts `https://docs.msg91.com/sms/module.json`
  (incl. `getTemplateVersions`, `report/logs/p/sms`); SendOTP `https://docs.msg91.com/otp/sendotp.md` (updated 2026-09-23),
  `https://docs.msg91.com/otp/module.json`.
- Real-time response: `https://msg91.com/help/api/what-is-a-real-time-response-and-how-does-it-work-`.
- Error codes: `https://msg91.com/help/api/what-are-the-reason-for-error-codes-received-under-the-api-failed`.
- Variables: `https://msg91.com/help/dlt-registration-in-india/dlt-debugging-checklist`,
  `https://msg91.com/help/dlt-registration-in-india/dlt-content-template-faqs`,
  `https://msg91.com/help/dlt-registration-in-india/variable-tagging-on-dlt-sms-templates` (updated 2026-06-11).
- Webhooks (6-37b): `https://msg91.com/help/webhook-new/how-to-receive-sms-delivery-reports-via-webhook-new`,
  `https://msg91.com/help/webhooks/webhook-auto-pause-simple-explanation`, `https://msg91.com/help/delivery-report/dlt-related-failure-reasons`.
- Security: `https://msg91.com/help/api/what-do-you-mean-by-api-security`; metadata (CRQID):
  `https://msg91.com/help/text-sms/custom-metadata-parameters-for-tracking-api-requests`.
- PE-TM chain: `https://msg91.com/help/dlt-registration-in-india/pe-tm-chain-binding-on-dlt` (MSG91's TM id 1302157225275643280).
- SDK: npm `msg91` 2.2.8 (2025-06-13), legacy endpoint + `flow_id`, repo 404 ⇒ ⛔ used (F20).
- **UNVERIFIED:** Flow's unicode auto-detection; max recipients per call; per-code HTTP statuses; webhook signing / source IPs; numeric
  DLR codes for DLT failures; Devanagari / spaces in `#alphanumeric#` (Row 30 (d)); any rate limit / timeout guidance; which template
  version is the default and what `status` / `active_status` / `dlt_verified` mean (MG5, Row 32 (d)); the current webhook retry count.

### References

- `.decision-log.md` — `2026-10-10-314`, `-313`, `2026-10-12-322`, `-323`, `2026-09-27-252`, `2026-10-10-302` RN4, `2026-10-08-295` RB12.
- `_bmad-output/implementation-artifacts/6-34-sms-templates-typed-variables.md` (TV13, F21, TV10, Sequencing);
  `6-27c-peer-mesh-sending-texts-and-links.md` (P1, W10, BF20–BF23); `6-30-app-links-open-the-app-from-a-text.md` (AL15).
- `docs/launch-gate-inventory/inventory-roster.md` Rows 24, 29, 30; `docs/launch-gate-inventory/dlt-template-requests-6-19.md`.
- `docs/adr/ADR-0027…`, `ADR-0028…`, `ADR-0040-staff-email-transport.md`, `_adr-template.md`; `docs/knowledge-transfer/adr-index.md`.
- architecture.md §2.2 (OTP), §3.4 (channels), §3.11 (webhooks — 6-37b), §3.12 (timeouts), §5.9 (secrets).

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed — comprehensive developer guide created (`bmad-create-story 6.37`, 2026-10-17; four
  parallel research passes: the SMS seam, the governance records, MSG91's live docs, the house format + 6.34 / 6.27c learnings).

### File List

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-10-17 | 1.0 | Created by `bmad-create-story 6.37` at `466e9b0e` (worktree `.claude/worktrees/6-37`). F1–F24 found; MG1–MG16 PROPOSED (⏳ Task 0.2); ⭐ F9 — MSG91 answers `success` to a fake authkey — drives MG5's pre-flight and MG15's reading of `-252` cl.1. Status `ready-for-dev`, buildable after Task 0. |
