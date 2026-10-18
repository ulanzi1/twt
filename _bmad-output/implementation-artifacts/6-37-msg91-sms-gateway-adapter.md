---
baseline_commit: 466e9b0e
---

<!--
PINNED: `466e9b0e` (2026-10-17 — `main` == `origin/main` after a fresh `git fetch`). Every `file:NNN` below is AS OF that sha; Task 0.1
re-checks what moved. Built in its OWN worktree `.claude/worktrees/6-37`, branch `story/6-37-msg91-sms-gateway-adapter`
([[feedback_commit_on_story_branch]], [[feedback_shared_tree_branch_switch]]).

STATUS (2026-10-17, after code review round 2): Tasks 0–7 built; review rounds 1 (F1–F4) and 2 (D1 / D2, P1–P18) resolved; `-346`
narrows `-345` MG3 / MG5 / MG7 (committed ALONE, `da27b82d`). ⚠ The line below is the Task 0 status as first written, kept:
(was) STATUS: `in-progress` — ⭐ TASK 0 DONE, AC0 MET: MG1–MG17 ANSWERED (BigDev, 2026-10-17: *"accept all recommended"*), author-commit
`2026-10-17-345` committed ALONE (`48017867`), and Task 0.4's records committed in one commit after it
([[feedback_governance_commits_precede_implementation]]). Next: Task 1 (the code).
Start condition met: row 6-34 is `done` and on `main` (`-314` decision 2 — "6.34 builds FIRST"; 6.34 Sequencing: "if 6-37 is started
first it STOPS and asks").

§0 GATE (the routing template's): every MG below is the AUTHOR's — which vendor API carries the texts, how a template id is stored, how a
response is classified, when a misconfigured account holds a run (`-314` §0: "which vendor carries the texts and how a template is
configured with it. ⛔ No word of any text, ⛔ who is texted, ⛔ when"). ⚠ FOUR places it would become the Panel's, all kept OUT:
(1) a delivery report that changes what counts as "reached" — `-252` cl.1 (Trustee-ratified) — ⇒ MG1 moves delivery reports to a NEW
row 6-37b, whose create-story owns that question; (2) a provider's refusal of Devanagari or spaces in a name — already Row 30 (d) /
`-322` C7; (3) a HOLD — or a fail-CLOSED refusal of a deliverable text — on the correction / closure / certificate paths (`-322` §0:
that *"would have changed WHO is texted or WHEN on the correction, closure and certificate paths … and so would have been the
Panel's"*) ⇒ MG5 adds ⛔ hold there and FAILS OPEN on a transient AND on every reason it cannot prove stops delivery (only a malformed id, or the
send key's own refusal under MG17 (a), ends a row) — whether a PROVEN content mismatch should refuse there is left the Panel's, ⛔ routed; (4) MG15 reads `-252` cl.1 VERBATIM and says MATCHES for every PROVEN
fault (on 6.19b/c/d — D22's input — only those; on the holding sweeps every fault the pre-flight sees); its residual (send-side account faults — WIDER than `-323` R2's DLT causes) stays the author's ONLY while Row 32 (i)
keeps claim-text template ids unprovisioned until 6-37b — if that leg is declined, or MG5 is, the question is the Panel's
([[feedback_panel_gate_read_ratified_verbatim]]).

GLYPH REGISTER: `⛔` negates the word it precedes; `⭐` emphasis / action; `⚠` a hazard. ⛔ No `file:NNN` into `.decision-log.md`,
`deferred-work.md` or `sprint-status.yaml` (newest-first files) — cite the decision id, the item's phrase, or the row key.

LETTERS: F = found facts (F1–F25); MG = build decisions (MG1–MG17 — PROPOSED at v1.1, ANSWERED at 1.2; MG3 / MG5 / MG7 narrowed by `-346` — this clause amended at review round 2, (was) "MG1–MG17, PROPOSED"); I = invariants; T = traps (T1–T14); S = Task 0.1 STOP
conditions (S1–S4). Decision-entry letters stay the entry's own (`-322` C1–C9, `-323` R1–R2, `-252` cl.1–cl.3).

VALIDATED v1.1 (2026-10-17, `bmad-create-story validate 6.37`, at `466e9b0e` == `origin/main` — ⛔ code moved since the pin). Four
fresh-context verifiers (code claims; governance + records + id allocation; end-to-end design; MSG91's docs — docs pages ONLY, ⛔ API
call). Applied: MG5 rebuilt (the memo cannot be "per run" — every send is a pg-boss CHILD; `sms_type` from the TEXT, ⛔ the locale —
template 14 (en) is Unicode; 6.19b/c/d fail OPEN on a transient; `beforeSend` closes MG16 (i)); I4 and the Policy meaning corrected
(false on three paths); MG15 split; the RN4 / RB12 / `-314` supersessions named; MG17 + S1–S4 added (the authkey's scope; the 40-char
value cap vs the 55-char link); the tests every edit turns red named. ⚠ (At v1.1) every MG was still PROPOSED — answered at 1.2 (this
sentence amended at review round 2; (was) "⚠ Every MG is still PROPOSED — ⛔ answered.").
-->

# Story 6.37: The texts and login codes are actually sent — a MSG91 adapter behind the SMS seam, sending each template's NAMED values, with a pre-flight that proves the account and every template before a single text is spent `[PRIMITIVE]`

Status: done

> ⭐⭐ **WHAT THIS STORY IS, IN ONE PARAGRAPH.** Today ⛔ no SMS can reach a real gateway: `sms-app.ts` posts a generic
> `{sender, to, template_id, message}` with `Authorization: Bearer` and expects `messageId` — a contract that matches ⛔ MSG91, the gateway
> BigDev chose "for now" (`-314`). MSG91's Flow v5 takes an `authkey` header, MSG91's OWN template id, and the template's NAMED variable
> values — ⛔ the finished text. This story replaces the client with a MSG91 client behind the SAME `SmsMessagingHandle` seam, carries each
> template's named slot values (6.34 TV13) from the five callers down to it, sends the two OTPs through the same Flow call, and — because
> ⭐ MSG91 answers HTTP 200 `"type":"success"` even for a FAKE authkey (F9) — adds a **pre-flight** that reads every template the process
> will use from MSG91 (auth, existence, content, unicode) at api boot and, in jobs, through ONE process-level memo with a TTL, so a
> misconfigured template HOLDS the run where a hold exists and, where none does, ends the row only on a fault it can PROVE (MG5). ⚠ It reads TEMPLATES: a
> send-side account fault (zero balance, SMS not enabled for the key, an unwhitelisted IP) is ⛔ visible to it (MG15). It also lands the owed SMS-provider ADR (ADR-0041, `drafted`), the owed `epics.md` entry,
> a provisioning row on the go-live roster, and a NEW row `6-37b` for delivery reports. ⛔ No text's wording changes; ⛔ no template is
> registered; ⛔ no id is provisioned; ⛔ no migration.

> **What already ships and this story READS — rebuild ⛔ none of it:**
> - `packages/channels/src/dlt-variables.ts` — `DLT_VAR`, `DltSlot {name,type,maxLength,label}` (`:69-78`), `SLOT_NAME` (`:59-60` — "the
>   MSG91 `##name##` variable (TV13)"), `checkDltTemplateShape` (`:102-173`), `isDltCallbackNumber`.
> - The SIX registry files (`scripts/dlt-typed-variables/lib.ts:56-63` `REGISTRY_FILES`): `dlt-variables.ts` itself, `otp-sms-template.ts` (templates 15/16),
>   `sms-dlt-registry.ts` (the five DARK alert categories — TV6), `claim-correction-sms-templates.ts` (1–6),
>   `suspicion-notice-sms-templates.ts` (7–12), `peer-mesh-sms-templates.ts` (13/14).
> - The DLT sheet `docs/launch-gate-inventory/dlt-template-requests-6-19.md` — its *"MSG91 template"* column IS the MSG91 template text;
>   pinned by `apps/jobs/tests/_dlt-template-sheet.ts` `msg91Form` (`:34`).
> - The send core `apps/jobs/src/scheduler/claim-dlt-sms-send.ts` `sendClaimDltSms` (`:100-167`) and its class → outcome mapping.
> - 6.27c's P1 `isScopeWideSendFault` (`claim-peer-mesh-requests.ts:228-231`) — `config:` / `auth:` / `dlt_template_not_approved:` STOP the child.
> - ADR-0040's staff-email pre-flight — run ONCE in the SWEEP, children never re-check (`claim-suspicion-staff-emails.ts:137-146`,
>   `staffEmail.preflight`) — the house shape for a provider pre-flight (MG5).
> - `sanitizeSmsGatewayCode` (`packages/domain/src/claim/suspicion-notice.ts:159`) — the existing scrub for a gateway-supplied code.
> - The OTP adapter `apps/api/src/modules/auth/shared/sms-step-up-delivery.ts` and the prod boot check `apps/api/src/deps.ts:209-251`.
> - `normalizeMobile` (`packages/domain/src/encryption/member-fields.ts:92-100`; `@twt/channels` already depends on `@twt/domain`).

## Story

As **the Trust**,
I want **every SMS the platform already composes — the login and step-up codes, the correction / closure / certificate texts, the
suspicion notices and the neighbours' request — to be sent through MSG91 with each template's named values, and a misconfigured MSG91
template to hold the send where a hold exists — and a provably broken one to stop it — before anyone is recorded as reached**,
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
| `2026-10-10-302` RN4 | (in full) *"Provider-side config faults (`dlt_template_not_approved`, `auth`, `unknown`) stay FINAL `error` + alarm (RB12 edge (ii)) — ⛔ a held class like 6.25's RE6; the SMS gateway gives ⛔ pre-flight to tell a paused account from a bad request. Recorded as a known difference from 6.25."* Also `-302` FOUND (c): *"⛔ provider pre-flight exists"*. ⚠ MG5 makes a pre-flight-seen template fault a HELD class on the suspicion sweep ⇒ the author-commit SUPERSEDES that clause (Task 0.3). | author-commit |
| `2026-10-08-295` RB12 | a missing config never uses up a slot; the sweep checks before enqueueing (ruled for 6.24b's suspicion sweep; 6.27c R11 MATCHES it). Accepted edge: *"a provider-side config fault (`dlt_template_not_approved`, `auth`, `unknown`) ⇒ `error`, that one slot used"* — MG5 NARROWS it. | author-commit |
| `2026-10-09-299` RE7 / `-301` FOUND (a) (6.25) | the staff-email precedent: RE7 HOLDS a run on *"a gap, a failing pre-flight …"*; `-301` FOUND (a) restates it — *"ANY failing provider pre-flight HOLDS a run (a timed-out or throttled `GetAccount` included)"*, and a parked row's give-up credits only parked time. ⇒ a pre-flight hold on the suspicion / peer-mesh sweeps interacts with their park / give-up exactly as 6.29 RN2's park and 6.27c F5 already cover — ⛔ new mechanism. | author-commit |
| `2026-10-16-343` / `2026-10-17-344` | 6.27c's re-claim "may have sent" residual; the Hindi lineage (Row 28 the control). | author-commit |
| Roster Row 30 | (b) *"a real login OTP AND a step-up OTP received on a device — ⚠ ALSO waits for row 6-37's MSG91 adapter"*; (d) the providers' written answers; note (3) *"row 6-37's create-story owes an SMS-provider ADR"*. | go-live gate — ⛔ a merge fence |
| deferred-work | *"⛔ DLT send consumes a delivery report — a rejection seen only there is recorded `accepted` …"* — *"Likely closer: row `6-37-msg91-sms-gateway-adapter`"*. | open — MG1 hands it to 6-37b |

## ⭐ THE INVARIANTS

1. **I1 — The words never change.** For every template, the values sent, substituted into the REGISTERED text in slot order, equal
   byte-for-byte the body the caller renders through the real i18n `t()` today. The existing lockstep tests stay green UNCHANGED;
   ⛔ a `claim.json` / `common.json` / registry text edit ([[feedback_stub_must_call_not_transcribe]]).
2. **I2 — One seam.** Every SMS still leaves through `SmsMessagingHandle.send` (`sms-app.ts:30-37`); `ChannelProvider`, `RenderedMessage`,
   `dispatch`, `cascade`, `render` are ⛔ edited — proven by an EMPTY `git diff --stat main -- packages/channels/src/{provider,dispatch,
   cascade,render}.ts` (⚠ `channels-determinism` hashes RENDER output only — `determinism.test.ts:8-9` "the gate never calls `send`" — so
   it can ⛔ see an edit to the port; it is run, but it is ⛔ the proof).
3. **I3 — `accepted` needs `"type":"success"` AND a request id.** HTTP 200 alone is ⛔ an acceptance (F9). ⛔ Never a fabricated id.
4. **I4 — A template fault the pre-flight sees never spends a slot ON THE SWEEPS THAT HOLD** (suspicion, peer mesh — a HOLD, RB12 /
   6.27c R11). A fault first seen AT SEND spends at most one slot per child there (P1 stops the peer-mesh child; a suspicion notice is
   once per claim, ⛔ P1). ⚠ **On the correction / closure / certificate sweeps there is ⛔ hold** (T6): a PROVEN pre-flight fault
   (MG5 — `template_id_malformed`; `auth` / `auth_or_not_found` under MG17 (a)) ends the row `error` exactly as a missing template id does
   today ⇒ it SPENDS that day's reminder / certificate slot (a recorded day is never caught up — `claim-correction-reminders.ts:1155-1176`,
   CR8 `claim-certificate-reminders.ts:590-591`) and LOSES that closure notice for good (`claim-correction-closure.ts:389` calls `complete()` ⇒ `completeClosureNoticeIfDone`, `packages/domain/src/claim/correction-closure-jobs.ts:317`). That is ⛔ new behaviour (a missing id does
   it today) and it is TRUE: under F9 the same text would otherwise be recorded `accepted` and never arrive. ⭐ A transient pre-flight
   or an UNPROVEN reason there fails OPEN (MG5) — a text that might be delivered is never refused there. BigDev accepts the closure-notice cost at 0.2.
5. **I5 — The stored detail grammar is untouched.** Every new detail fits the existing classes and `[A-Za-z0-9_.-]{1,64}` without a run of
   7 digits (0155 / 0166 CHECKs, `SUSPICION_NOTICE_SMS_ERROR_CLASSES`, `PEER_MESH_REQUEST_DETAIL_PATTERN`) ⇒ ⛔ migration. Pre-flight
   codes are ALARM codes only, ⛔ stored (the 6.27c R11 precedent).
6. **I6 — No secret, number or text in a log, alarm, detail or error message** (the authkey, the recipient, a value, the body). Alarms
   name the template's config key and the class only. ⚠ The 6.19b/c/d paths store `result.detail` RAW into unchecked `text` columns
   (`claim-correction-reminders.ts:428-432`, `claim-correction-closure.ts:384-389`, `claim-certificate-reminders.ts:675-683`) ⇒ the
   client passes any gateway-supplied `code` through `sanitizeSmsGatewayCode` before it enters a detail.
7. **I7 — Tests never touch MSG91.** Every test injects `fetch`; ⛔ a network call, ⛔ a "smoke test" against `control.msg91.com` (T1).

## 📜 Policy meaning (AI-10-1)

**This story introduces ⛔ predicate and changes ⛔ predicate's DEFINITION — but it changes the TRUTH of one INPUT of a predicate that
gates a family's benefit**: 6.19c D22's `reachedBySms`, the input of the Trustee-ratified `-252` closure-for-silence, counts `accepted`
sends. Under F9 a text through a broken MSG91 template would be recorded `accepted` and never arrive; with MG5 a PROVEN fault (a malformed
template id; the send key refused, MG17 (a)) is recorded `error`.
In the family's terms: ⭐ *"a text the Trust's SMS account could not have delivered is no longer counted as having reached you — so your
claim can ⛔ be closed for your silence on the strength of a text you never got."* That MATCHES `-252` cl.1 (*"accepted by the network"*)
— it removes false positives, it adds none (MG15 states the residual it does NOT remove). ⚠ It is ⛔ "your text waits" on every path:
on the suspicion and neighbours' sweeps a broken template HOLDS the run (the text waits for a later run); on the correction, closure and
certificate sweeps there is ⛔ hold, so a PROVEN broken template id or key ends that day's reminder — or the closure notice, for good —
as ⛔ sent (I4). Anything the Trust cannot prove undeliverable there (a template-API outage, a content or DLT-id doubt) refuses ⛔ text:
it is alarmed and sent (fails open). The login and texts' WORDS are unchanged (I1).
Niyamavali check: ⛔ not applicable (the Niyamavali does not speak to SMS vendors or to how a reminder is proven sent) — and it is
⛔ ratified ([[feedback_niyamavali_rulebook_not_spec]]).

## ⭐ FOUND FACTS (at `466e9b0e`; MSG91's docs fetched 2026-10-17 — re-check at Task 0.1)

**The code today**
- **F1** — `SmsGatewayMessage {to, dltTemplateId, body}` (`sms-app.ts:40-47`); `buildRequestBody` → `{sender, to, template_id, message}`
  (`:136-145`); `Authorization: Bearer` (`:201-208`); `extractMessageId` wants `messageId` (`:166-180`). ⇒ against MSG91 every success
  would throw "no messageId" and be classified `unknown`. ⛔ No timeout anywhere in `packages/channels/src` (no `AbortSignal`).
- **F2** — `sms-errors.ts:27-46` code sets are placeholders: *"⚠ CODES ARE INDICATIVE, VERIFY AT IMPLEMENT TIME"* (`:9-13`).
- **F3** — `createSmsDltProvider({messaging, dltTemplateId})` (`sms-dlt.ts:53`) maps `rendered.body` into the message (`buildGatewayMessage`, `:41-49`); the frozen
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
  <name>: value}]}`. The id field is `template_id` (the legacy doc / SDK say `flow_id`; 6.34 Debug Log (c) only RAISED it — this story's docs read,
  2026-10-17, answers `template_id`). `short_url` is a STRING (`"0"` / `"1"`); `mobiles` *"with country code"*, ⛔ `+`. Success body
  (module.json): `{"message":"5e1e93cad6fc054d8e759a5b","type":"success"}`; every documented request id is 24 lower-case hex, ⛔ stated
  as a rule ⇒ I3's ≤ 64 `[A-Za-z0-9]` cap stays (⛔ tighten it to 24).
- **F11** — Variable names are case-sensitive and equal the `##name##` in the MSG91 template; values are limited to 40 characters by DLT
  ("for English and Unicode both" — the DLT FAQ, stated for variables generally). ⚠ The peer-mesh `link` slot is `url`, ceiling 120
  (`DLT_TYPE_MAX_LENGTH.url`), and the sheet's typical link is **55** characters (`https://` + domain + `/peer-request?c=` + 12) — whether
  MSG91 / DLT caps a `#url#` value at 40 is ⛔ documented (S2). Every other slot fits 40 (member ≤ 40, date 10, reference 8, helpline ≤ 14,
  otp 6). ⚠ Review round 2 (Debug Log (o)): "member ≤ 40" is the SLOT's ceiling, ⛔ a property of every name — a `full_name` can exceed it. Unicode is a property of the TEMPLATE (`smsType` NORMAL / UNICODE at creation), ⛔ a Flow field — and of the TEXT, ⛔ the
  locale: template 14 (en) holds an em dash (U+2014, `peer-mesh-sms-templates.ts:96`) and the sheet already records *"⚠ BOTH are
  Unicode"* (`dlt-template-requests-6-19.md:240-241`). ⚠ The same DLT FAQ says *"1-2 variables are allowed in one Content Template"* —
  templates 11–14 carry three; probably stale and ⛔ ours to rule — a Row 30 (d) annotation (Task 0.4).
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
  `{"message":"The provided flow ID or template ID is invalid.","type":"error"}` — ⚠ both are documented as **SendOTP** samples
  (`otp/module.json`); for Flow they rest on this story's T1 probe. Sibling v5 endpoints carry `code` as a **STRING** (`"code":"201"`);
  whether a Flow send EVER returns a `code` synchronously is ⛔ documented (F9: only with `realTimeResponse`, on a second call). Codes the
  first pass omitted: 101 (missing mobile), 209 / 210 (route ⛔ found / ⛔ determined), 407 (international blocked), 602 (route
  disabled); 429 is documented (panel-only today — *"API integrations remain unaffected"*).
- **F16** — ⭐ A read-only template endpoint EXISTS: `POST https://control.msg91.com/api/v5/sms/getTemplateVersions` `{template_id}` →
  the body's `data[]` of versions with `template_data`, `DLT_ID`, `sender_id`, `status`, `active_status`, `sms_type`, `dlt_verified`,
  `dlt_reason`, `reject_reason`; HTTP 401 `{"status":"fail","hasError":true,"errors":"Unauthorized","code":"401"}` with no authkey; HTTP
  200 `{"status":"error","hasError":true,"errors":"Template content type could not be fetched"}` for *"Authkey invalid/template ID
  invalid"* (⛔ distinguishable ⇒ ONE reason, `auth_or_not_found`). The sample version reads `"status":"1"`, `"active_status":"1"`,
  `"sms_type":"NORMAL"`, `"dlt_verified":"10"` — STRINGS, while `addTemplateVersion` returns `dlt_verified: 0` (a number) ⇒ compare
  type-tolerantly. `sender_id` / `DLT_ID` can differ PER VERSION. The panel's *"mark the latest version active by the Mark default
  option"* + a `markActive` endpoint ⇒ `active_status` very likely marks the default (INFERENCE). *"Failed by DLT and Approved by MSG91 …
  sent on international numbers and not on Indian numbers"* ⇒ `dlt_verified` is the likely DLT signal. ⛔ Documented: whether an authkey
  whose rule allows SMS only may call this endpoint, and whether IP security applies to it (S3). ⚠ The MEANING of `status` / `active_status` / `dlt_verified` values and which version is the default
  is ⛔ documented (UNVERIFIED — Task 0.1).
- **F17** — SendOTP v5 (`/api/v5/otp?template_id=&mobile=&otp=`) accepts our own code; the template must hold `##OTP##` (upper case);
  MSG91 recommends it (voice backup, "processed … in less than half a second"); its retry endpoint defaults to VOICE. ⚠ It too answered
  `type:"success"` to a fake authkey (F9).
- **F18** — Delivery reports: a panel-configured webhook only (⛔ a per-request callback), JSON, one payload per recipient, keyed by
  `requestId` (= Flow's `message`) + `telNum`; ⛔ signature — static custom headers only; up to 5 retries (30 s … 30 min — the auto-pause page); DLT
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
  secret_manager_…`). A new class or `config:` word ⇒ a migration + two TS mirrors. 0128 (reminders + closure notices) / 0138
  (certificates) have ⛔ such CHECK — their details are stored RAW (I6); 0151's table carries 0155's.
- **F23** — ⛔ ADR covers SMS; next free number ADR-0041. `docs/knowledge-transfer/adr-index.md` holds reserved slots
  `ADR-NNNN-otp-channel-primary` (`:169`) and `ADR-NNNN-channel-provider-selection` (`:170`); the push / WA slots were never flipped when
  ADR-0027 / -0028 landed. ADR-0040 (staff email, `drafted`) is the closest shape; the index's breakdown is reconciled in the SAME commit.
- **F24** — epics.md: Epic 6 ends at the `---` before `## Epic 7` (`:3511`); the last entry is 6.36 (`:3485`). Roster: next free row 32;
  Row 24 `staff-email-transport` is the transport-row precedent — owner *"Trustee Panel (gate — (a), (f))"*; its (c) counsel leg and (e)
  *"an alarm of the sweep reaches a NAMED person through a real transport"* (MG14).
- **F25 — the deployment.** Dokploy compose (`infra/dokploy/compose.yaml`), ⛔ Cloud Run: `restart: unless-stopped` on every service (`:15`,
  `:35`, `:41`, `:55`) ⇒ an api that refuses to start is a RESTART LOOP (each restart re-runs the boot pre-flight against MSG91). The same
  file is imported into BOTH the staging and prod projects with `NODE_ENV: production` for api and jobs (`:17`, `:45`) ⇒ staging runs the
  production SMS path. It carries ⛔ `SMS_GATEWAY_*` line at all (6.30's `APP_LINKS_BASE_URL: ${APP_LINKS_BASE_URL}` `:51` is the
  dev-wires / operator-applies precedent). Jobs wires ⛔ `onAlarm` to a person (deferred: *"The helpline warning reaches the logs only"*)
  ⇒ a HELD run is silent but for the logs.

## ⚖️ Build decisions MG1–MG17 (✅ ANSWERED 2026-10-17 — *"accept all recommended"*: every ⭐ option, MG5's TTLs 1 h / 5 min, X1 and X2 accepted; recorded as `2026-10-17-345`)

- **MG1 — Split delivery reports into a NEW row `6-37b-msg91-delivery-reports`.** (a) ⭐ **Recommended:** 6.37 = the adapter, the named
  values, the pre-flight, the boot checks, the ADR; 6-37b = MSG91's webhook (persist-then-ack, static-header auth — F18 has ⛔ signature),
  an inbound table, correlation by request id + recipient, delivery state on the five send tables (⚠ 0166's finished-row trigger freezes
  peer-mesh delivery columns; `delivered_at` exists on 0128 / 0138 but is ⛔ granted), the OTP's gateway id in its audit, and the
  `-252` question (does a reported FAILURE stop a send counting as reached? — the Panel's). Cost: `-314` decision 2's "delivery-report
  correlation" moves to another row — a PARTIAL SUPERSESSION of `-314` decision 2, named as such in the author-commit (Task 0.3); the
  deferred delivery-report item's trigger ("before any claim-text template id is provisioned") now names 6-37b, and so do the two
  at-least-once items whose trigger is *"a gateway idempotency key or a delivery-receipt (DLR) seam"* (*"At-least-once SMS (inherited
  from 6.19b)"*, *"⚠ At-least-once family SMS"*) — ⛔ closed. (b) All in 6.37 — a webhook route, a migration and a Panel question inside
  the adapter; the OTP device proof (Row 30 (b)) would wait on all of it.
- **MG2 — The OTPs go through Flow, ⛔ SendOTP.** (a) ⭐ **Recommended:** Flow v5 with templates 15 / 16 and the variable `otp` — one code
  path, one classifier, TV13's lower-case name kept, our code generated and verified by us (architecture §2.2's security floor unchanged),
  ⛔ voice retry (voice OTP is its own ADR — architecture §2.2). Cost: MSG91's OTP-route speed claim forgone (UNVERIFIED for Flow — the
  Row 30 (b) device proof measures it). (b) SendOTP v5 with `otp=<ours>` — a second client and response shape (its success field is
  `request_id`, ⛔ `message`); the template must say `##OTP##`, breaking TV13's `^[a-z]…` and the sheet's `##otp##`; F17's false positive
  is the same, and SendOTP recognises only templates made in its own OTP section.
- **MG3 — Named values travel down the seam; the body stays as the oracle.** `SmsGatewayMessage` becomes `{to, templateId, values, body}`
  — `values: ReadonlyArray<{name, value}>` in slot order, `body` the caller's rendered text (⛔ sent, ⛔ logged — kept so every existing
  fake and live assertion keeps its oracle). `SmsProviderDeps` gains `values` (bound per send — F4). `sendClaimDltSms` gains
  `template: {text, slots}` and `values: (helpline) => Record<name, string>` beside `render`; each caller's builder closes over the SAME
  locals its `render` uses (`member`, `link`, `date` = `formatAppealUntil(...)`, `reference` — all computed before `render` today; ⛔ a
  second formatting). BEFORE the network the core checks, synchronously: (i) the value names equal the slot names exactly; (ii) every
  value's length ≤ its slot's `maxLength` AND ≤ the vendor's per-variable cap once S2 settles it; (iii) `substituteDltValues(text, slots,
  values) === render(helpline)`. A failure is final `error` `dlt_template_not_approved:values_mismatch` (or `:value_too_long`) + alarm
  (scope-wide ⇒ P1 stops the peer-mesh child; on the other four paths a per-row final). I1 as a runtime guard, because F9 means a mismatch
  would otherwise be recorded `accepted`. `substituteDltValues` (FUNCTION-form replacement, left-to-right, never re-scanned — a value
  holding `$&` / `$'` / `{#var#}` / `##x##` is inserted literally) and `toGatewayTemplate(text, slots, (n) => '##'+n+'##')` live in
  `dlt-variables.ts` (a registry file — F21). ⭐ Recommended. Alternative: drop `body` — touches every fake for ⛔ gain.
- **MG4 — Template ids: the EXISTING keys hold MSG91's id.** (a) ⭐ **Recommended:** `sms.dlt.template_id.<…>` (all 16) holds MSG91's 24-hex
  template id; the DLT TE id lives on MSG91's template (F12) and is recorded in the panel and on Row 32. ⛔ key, registry, gate or Row 30
  wording changes (Row 30 gains dated annotations only — Task 0.4). Cost: the key's name says "dlt" for a gateway id — stated in each
  registry header and the ADR; and ⚠ EVERY test fixture id changes (`'TPL-1'`, `'TPL-123'`, `'TPL-CERT'`, `'TPL-SUSPICION'`, `'TPL-PEER'`,
  the api's `'TRAI::sms.dlt.template_id.otp_login'` echo) to a 24-hex string — the api tests keep their NAME→value proof through a per-key
  map of distinct hex ids (Tasks 4 / 5). (b) A sibling `sms.msg91.template_id.<…>` per template — 16 new keys, a gate extension, the DLT
  keys unused by code.
  A value that is ⛔ `^[0-9a-fA-F]{24}$` (e.g. a 19-digit DLT TE id pasted by mistake) is caught by the pre-flight / boot check, and at send
  is final `dlt_template_not_approved:template_id_malformed` (I5 — ⛔ a new `config:` word).
- **MG5 — ⭐⭐ The pre-flight (the answer to F9).** **What it checks.** `checkMsg91Template(client, {text, slots}, templateId)` calls
  `getTemplateVersions` and passes iff: an authorised response; the version with `active_status` `"1"` (type-tolerant; UNVERIFIED meaning —
  S1) has `template_data` equal to `toGatewayTemplate(text, slots)` after canonicalisation (NFC, CRLF → LF, trailing whitespace trimmed);
  its `sms_type` is `UNICODE` iff the TEXT holds any character outside GSM-7 (⛔ the locale — template 14 (en) is Unicode, F11), else
  `NORMAL`; its `DLT_ID` is non-empty. Other versions, `sender_id`, `status`, `dlt_verified`, `dlt_reason`, `reject_reason` are LOGGED, ⛔
  gating, until Row 32 (d) records their meaning (⚠ if S1 finds ⛔ active marker, fall back to "ANY version matching" and say so in the
  ADR). Reasons: `auth_or_not_found` (the indistinguishable 200 `status:error` shape — F16), `auth` (HTTP 401), `content_mismatch`,
  `sms_type_needs_unicode` (the text needs UNICODE, the template is NORMAL — a fault), `dlt_id_missing`, `template_id_malformed` (⛔ call
  made); a 5xx / network / timeout (MG9's bound) ⇒ `transient`. `sms_type_unicode_for_gsm7` (a GSM-7 text on a UNICODE template — it
  still delivers) is a LOGGED observation on a PASS, ⛔ a fault on any path.
  **Where it is held (the memo).** ⚠ Every jobs send runs in a pg-boss CHILD (the five `boss.send` enqueues) with the boot-time
  `claimCorrectionDeps` (`boot.ts:602-612`) ⇒ a "per-sweep-run" memo cannot reach the core. ⇒ ONE process-level `Msg91PreflightMemo`,
  built in `apps/jobs/src/boot.ts` and placed on `ClaimDltSmsDeps` (OPTIONAL — every existing fake stays valid): keyed by template id;
  concurrent misses share ONE in-flight call; a PASS is cached for a TTL (⭐ recommended 1 h — BigDev at 0.2); a definite FAULT for a
  short TTL (⭐ 5 min — so a fixed template is seen by the next run; on the daily suspicion / peer-mesh sweeps that is the next day's run, so the
  fault TTL matters within one run and on 6.19b/c/d); a TRANSIENT is ⛔ cached (⚠ read with `-346` decision 3: cached 60 s) — on the re-check of an
  EXPIRED pass it returns that stale PASS for at most ONE more TTL (then it is a transient: held / fail-open as below). The api builds its own memo for 15 / 16.
  **jobs — the sweeps that ALREADY hold (suspicion, peer mesh).** The pre-flight joins the EXISTING gap checks as ONE more config fault
  (RB12 / 6.27c R11): 6.29's `purposeConfigGap` (`claim-suspicion-notices.ts:123`, each locale `LOCALES_OF[purpose]` lists — one or two, `:93-97`; its `configSet` `:111-120` likewise returns only set / missing / fault today ⇒ it too gains the resolved id) and 6.27c's
  `pariwarConfig` (`claim-peer-mesh-requests.ts:198-216` — AFTER the template id resolves; `configSet` returns only set / missing / fault
  today ⇒ it gains the resolved id; ⛔ `globalConfigGap`, which would make a broken `en` template hold Hindi Pariwars). A fault HOLDS the run
  before any row is claimed (⛔ slot used) with an alarm `config:sms_preflight_<reason>:<configKey>` (alarm-only, ⛔ stored — the R11
  precedent); the child repeats it as its race guard (a memo hit). A TRANSIENT with ⛔ cached pass also HOLDS here (the held class, as
  6.25's `-299` RE7 holds a timed-out `GetAccount` — restated in `-301` FOUND (a)) — the park / give-up covers it unchanged (6.29 RN2, 6.27c F5).
  ⚠ These sweeps also HOLD on the UNPROVEN reasons (`content_mismatch`, `dlt_id_missing`, `sms_type_needs_unicode`) — the safe direction
  (it delays, never records reached), and the author's: `-322` §0's Panel reservation names only the correction, closure and
  certificate paths. Accepted cost (BigDev at 0.2): a false positive delays a once-ever suspicion notice while its appeal date runs;
  Row 32 (h) is the control. Suspicion's two-locale purpose (`refusal_appeal_notice`) inherits RB12's existing shape — a broken `en`
  template holds Hindi appeal notices too, as a missing `en` id already does.
  **jobs — inside the core, for EVERY caller.** MG4's local malformed-id check runs FIRST (before the memo) ⇒
  `dlt_template_not_approved:template_id_malformed` (⛔ `preflight_`). Then, after the id resolves, the core reads the memo: a PROVEN fault
  (`auth` / `auth_or_not_found` under MG17 (a)) is the same kind of final today's missing id is (`error` + alarm) on EVERY caller —
  `auth:preflight`; an UNPROVEN one (`content_mismatch`, `dlt_id_missing`, `sms_type_needs_unicode` ⇒
  `dlt_template_not_approved:preflight_<reason>`) is a final on the suspicion / peer-mesh children (their race guard already held — this
  is the in-flight race) and ALARMED-and-sent on 6.19b/c/d. Under MG17 (b), `auth` / `auth_or_not_found` (from the read key) join the
  UNPROVEN list (detail `dlt_template_not_approved:preflight_<reason>`). A TRANSIENT with ⛔ usable pass in the core: sent with a warning
  ONLY when `preflightFailOpen`; on the holding children it returns `{kind:'transient', detail:'api_unavailable:preflight'}` (pg-boss
  retries — the in-flight race, mirroring the sweep's hold). ⚠ The core never alarms or logs (`claim-dlt-sms-send.ts:9`) ⇒ a fail-open send returns
  `accepted` with an optional `preflightWarning: '<class>:<reason>'` (the `helplineNotCallbackNumber` precedent) and each 6.19b/c/d
  caller alarms it through its existing sink beside its `helplineNotCallbackNumberWarning` line — ⛔ an `onAlarm` in the core. The core
  takes `preflightFailOpen: boolean`; `sendClaimCorrectionSms`
  (`claim-correction-reminders.ts:210-231`, the wrapper the three 6.19b/c/d paths call) sets it `true` and its deps `Pick<…>` gains the
  memo field (I5 — existing classes, ⛔ `config:` word). ⚠⚠ On the 6.19b / 6.19c / 6.19d paths (correction reminder, closure notice,
  certificate reminder) there is ⛔ hold (T6): a PROVEN fault ends the row — that day's slot, or the closure notice for good (I4). Giving them a hold would change WHEN those families are texted —
  the input of D22 / the Trustee-ratified `-252` — which `-322` §0 calls the Panel's ⇒ ⛔ hold is added. ⭐ And a TRANSIENT there FAILS
  OPEN: the send proceeds (the caller alarms `preflightWarning` `api_unavailable:preflight`, ⛔ an outcome change) — refusing a deliverable text for a
  template-API blip would be exactly the "fail closed" `-322` §0 (option (a)) says is the Panel's. ⭐ The same test governs every REASON
  there: **only a reason MG5 can PROVE stops delivery ends a row** — `template_id_malformed` always; `auth` / `auth_or_not_found` only
  under MG17 (a) (the pre-flight used the SEND key itself; under MG17 (b) a read-key refusal proves nothing about the send key). Every
  other reason (`content_mismatch`, `dlt_id_missing`, `sms_type_needs_unicode`) is ALARMED and the send PROCEEDS there — its meaning rests
  on S1 (MSG91's stored `template_data` form, the status fields) and on Row 32 (e)'s first real response, both unsettled; and even a REAL
  content mismatch means MSG91 would deliver OTHER words (an I1 breach), ⛔ that nothing is delivered. Whether a PROVEN content mismatch
  should then refuse on these paths is `-322` §0's option (a) ⇒ the Panel's: recorded as a residual (MG15), ⛔ routed by this story. `sms_type_unicode_for_gsm7` (a GSM-7 text on a UNICODE template — it still delivers) is LOGGED on EVERY
  path, ⛔ a fault and ⛔ a hold anywhere.
  **api.** At prod boot for templates 15 / 16 (with `buildMemberStepUpDelivery`, async and awaited in `createDeps` — `deps.ts:309`):
  `auth` / `auth_or_not_found` (under MG17 (a) — from the send key; under MG17 (b) a read-key refusal STARTS with an error log and only
  a blank read-key secret name refuses) / `template_id_malformed` ⇒ REFUSES TO START (the same class as a blank id today — ⚠ under F25 a restart
  loop, and ⛔ only login: every api route); `content_mismatch` / `sms_type_needs_unicode` / `dlt_id_missing` ⇒ STARTS with an error log — alarm-only IN
  THIS STORY (the canonicalisation is UNVERIFIED against MSG91's stored `template_data` — S1); Task 7's deferred item makes it blocking
  in a LATER change once Row 32 (e) AND S1 are settled, re-weighing T13 (⛔ code reads a roster row); a transport
  failure / 5xx / timeout ⇒ starts with an error log (⛔ couple login availability to MSG91's template API). ⭐ At RUNTIME the api memo
  is ADVISORY: a fault or transient on an expired / re-checked entry is logged (alarm) and the code is STILL sent — ⛔ a login is ever
  refused by the pre-flight after boot; the re-check runs OFF the request path (fire-and-forget, ⛔ awaited by `deliver`), so it adds
  ⛔ latency to the 10 s bound. `buildMemberStepUpDelivery` takes an injectable fetch / client so ⛔ test reaches MSG91 (AC11).
  Cost: one MSG91 call per template per TTL per process (two processes in a deploy overlap ⇒ two); a broken template stops EVERY text
  of that template until fixed — the point. Supersessions (Task 0.3, ⛔ edits — [[feedback_supersede_never_reinterpret]]): it SUPERSEDES
  `-302` RN4's *"⛔ a held class like 6.25's RE6; the SMS gateway gives ⛔ pre-flight"* and `-302` FOUND (c)'s *"⛔ provider pre-flight
  exists"* for faults the pre-flight sees (RN4's at-send finals stand); it NARROWS `-295` RB12's accepted edge *"a provider-side config
  fault ⇒ `error`, that one slot used"* on the sweeps that hold. ⚠ It reads TEMPLATES, ⛔ the account's ability to SEND (MG15, S3).
- **MG6 — Classify on `type`, ⛔ HTTP status alone.** `accepted` ⇔ HTTP 2xx AND `type === "success"` AND `message` a non-empty string ≤ 64
  of `[A-Za-z0-9]` (I3). `type === "error"` ⇒ by `code` (MG7) when present — a STRING or a number, compared as a string; else by HTTP
  status (401 / 403 → `auth`, 429 → `rate_limited`, 5xx → `api_unavailable`); else by the two documented sync messages (F15 — SendOTP
  samples, observed for Flow in T1: "Auth Key missing" → `auth:authkey_missing`; "flow ID or template ID is invalid" →
  `dlt_template_not_approved:template_invalid`); else `unknown:msg91_error`. A 2xx with neither type ⇒ `unknown:no_type`. Every code that
  enters a detail passes `sanitizeSmsGatewayCode` (I6). ⛔ `realTimeResponse` (F9 — the error only on a second identical send).
  ⭐ Recommended.
- **MG7 — The code table (data-driven, replaces F2's placeholders).** `auth`: 201, 204, 207, 208, 209, 210, 301, 302, 303, 418, 421, 602
  (⚠ `auth` now means "the gateway ACCOUNT refuses" — balance, IP and route included, so P1 stops on them — stated in `sms-errors.ts` and
  the ADR); `dlt_template_not_approved`: 203, 211, 310, 400, 401, 402, 403, 603; `invalid_number`: 101, 202, 604; `api_unavailable`: 306,
  506, 601; `unknown`: 311 (⚠ "the first SMS will be delivered" — a may-have-sent final + alarm), 407 and every unlisted code. Detail =
  `<class>:<code>` (I5). ⚠ `carrier_reject` gets ⛔ code: DND / operator blocks arrive only in a delivery report (6-37b) ⇒ the core's
  `carrier_reject → rejected_unreachable` arm is unreachable through MSG91 (kept — ⛔ a class removed, I5). ⚠ Under F9 / F15 the table is
  MOSTLY UNREACHABLE at send (a synchronous `code` on a Flow send is ⛔ documented) — it is the defensive mapping for when one arrives;
  its test rows are SYNTHETIC fixtures, labelled so (Testing standards). On 6.19b/c/d an `auth` final is per row (⛔ sweep-level stop
  there — I4). ⭐ Recommended.
- **MG8 — The number: strip the `+`, validate by CALLING `normalizeMobile`.** The client sends `normalizeMobile(to).slice(1)`
  (`91XXXXXXXXXX`); a `to` that `normalizeMobile` rejects, or that it changes (⛔ already canonical), is a local `invalid_number:format`
  with ⛔ request ([[feedback_stub_must_call_not_transcribe]] — ⛔ a second regex). Effectively unreachable today: every jobs caller
  passes `normalizeMobile` output (`packages/domain/src/claim/correction-crypto.ts:54`, peer mesh `claim-peer-mesh-requests.ts:628`) and the only member-mobile
  writer normalises before storing (`signup.handlers.ts:71`); the step-up path passes `decryptMobile` output un-normalised (`sms-step-up-delivery.ts:148`) — a
  non-canonical stored mobile there would now be refused (accepted consequence; ⛔ reachable through the one writer). ⭐ Recommended.
  Deferred *"`resolveSmsTarget` trusts `decryptMobile`'s output uncritically"* ⇒ **partly addressed** (the SMS client refuses a
  non-canonical number); the decrypt try/catch and push / WA are ⛔ addressed and `resolveSmsTarget` sits on the dark dispatch path
  (MG12) ⇒ the item stays OPEN ([[feedback_closure_language_precision]] — ⛔ "Closed by").
- **MG9 — The request.** One recipient per call; `short_url: "0"` ALWAYS (F13); ⛔ `realTimeResponse`; ⛔ `CRQID` (6-37b decides
  correlation); a 9 s abort signal in the client (abort ⇒ `api_unavailable:timeout`), created SYNCHRONOUSLY at `send` entry (before any `await`)
  from an injectable `timeoutSignal(ms)` (default `AbortSignal.timeout`; tests pass a controllable one) — 9 s, ⛔ 10, so it fires before
  the OTP path's own 10 s `withSendTimeout` (started just after `send` is called — `sms-step-up-delivery.ts:78, :170-173`) and the OTP
  class is deterministic (`StepUpDeliveryError('api_unavailable')`); the callers' own bounds unchanged;
  the same signal bounds `readTemplateVersions`. Retries: unchanged (transient ⇒ pg-boss) — ⚠ MSG91 has ⛔ idempotency key (F19), so the
  deferred *"At-least-once SMS"* items stay open with this finding added and their closer named 6-37b (MG1) (⛔ closed). ⭐ Recommended.
- **MG10 — Config: one gateway, ⛔ provider switch.** `createSmsAppClient` builds the MSG91 client; the generic Bearer contract is REMOVED
  (it matches ⛔ gateway — keeping it selectable is a footgun; a later vendor is another adapter, `-314` decision 1). `SMS_GATEWAY_API_URL`
  becomes the API ORIGIN, default `https://control.msg91.com` in BOTH apps (F7's divergence closed; the placeholder constant and its boot
  arm retire) and is VALIDATED as a bare origin (`new URL(v).origin === v` after a trailing-`/` trim — an old-style send URL would
  otherwise yield `…/send/api/v5/flow`); `SMS_GATEWAY_API_KEY_SECRET_NAME` holds the MSG91 authkey; `SMS_GATEWAY_SENDER_ID*` RETIRE from
  the required set (the sender is on the template — F12; the pre-flight LOGS each template's `sender_id`) — grep-clean: ⛔ terraform /
  compose / docs consumer is orphaned. `isConfigured()` = a non-blank authkey and origin. The compose file gains the
  `SMS_GATEWAY_API_KEY_SECRET_NAME` line on api AND jobs (F25 — the 6.30 `APP_LINKS_BASE_URL` precedent: dev wires, operator applies).
  ⭐ Recommended. Alternative: keep `SMS_GATEWAY_SENDER_ID` as an EXPECTED value the pre-flight compares — one more secret for a check
  Row 32 (d) already makes by eye.
- **MG11 — jobs boot.** ⛔ fail-fast (jobs runs many non-SMS duties; the sweeps HOLD — MG5); in production, one boot log line when the
  gateway is unconfigured (AC8 (c) pins it). ⭐ Recommended.
- **MG12 — The dispatch path stays dark.** A message with ⛔ `values` (the alert composition — `resolveSmsProviderDeps` has none) is
  refused locally `dlt_template_not_approved:no_named_values`; every alert category stays DARK (TV6); ⛔ composition change. ⚠ This
  INVERTS two existing legs that accept a value-less real provider — `packages/channels/tests/sms.test.ts:51-70` and
  `apps/api/tests/unit/sms-composition.test.ts:96-104` (`providerMessageId 'gw-id'`) — to the `no_named_values` refusal (Tasks 2 / 5).
  ⭐ Recommended.
- **MG13 — ADR-0041 `sms-gateway-msg91`, `drafted`, a NEW index row.** Context (F1, F9, `-314`); Decision (MSG91 Flow v5 behind
  `SmsMessagingHandle`, native fetch); Alternatives (SendOTP, legacy `sendhttp` + `DLT_TE_ID`, the npm SDK, a second gateway now);
  Consequences (async errors and the pre-flight — and what it cannot see (MG15); `accepted` is ⛔ delivery; ⛔ idempotency; static-header
  webhooks for 6-37b; IP whitelisting vs the production AND staging egress; restart-required-on-rotation kept; the processor's data
  handling — member names and mobiles pass through MSG91, "an India-region processor" is OUR reading, ⛔ a ratified constraint — the
  ADR-0040 precedent); the pivot path. The provider choice in production is the Panel's to ratify (as ADR-0027 / -0028 / -0040). The
  index row + breakdown reconciliation in the SAME commit; slots `:169` (`otp-channel-primary` — MG2 settles the OTP route) and `:170`
  (`channel-provider-selection`) each gain a one-line annotation naming the partial fills (0041; 0027 / 0028 / 0041) — ⛔ flipped.
  ⭐ Recommended.
- **MG14 — Roster Row 32 `sms-gateway-msg91-provisioned`.** Owners, in Row 24's shape: Trustee Panel (gate — (a)); BigDev (provisioning — (b)–(f), (i)); counsel (Story 0.13) — (g); for
  (h), the alarm owner is ⛔ yet NAMED (Row 24 (e)'s same gap). Closure (ALL): (a) ADR-0041
  ratified; (b) an authkey whose rule allows what the jobs AND api need (S3 / MG17), IP security ON with the production egress IP(s) —
  and staging's, or a separate staging key (F25) — whitelisted; (c) MSG91's TM id bound in the PE-TM chain on SmartPing and the sender id
  mapped to the PE id; (d) each template created in MSG91 from the sheet's MSG91 column with its DLT TE id, `smsType` from the TEXT
  (UNICODE for every Hindi template AND template 14), marked default; the meaning of `status` / `active_status` / `dlt_verified` recorded
  from MSG91 in writing; the panel's URL shortener OFF and the app-link domain on its "Skip URL" list (a second guard behind MG9's
  `short_url: "0"` — F13); (e) the pre-flight green on the deployed api AND jobs, and ONE real response recorded (one of the two
  triggers of Task 7's deferred item — ⛔ an automatic switch); (f) MSG91's data-processing terms on record; (g) counsel (Story 0.13) clears MSG91 as a processor of
  member names and mobiles, or the row names the clearance that already covers it (Row 24 (c)'s leg); (h) a pre-flight HOLD alarm
  reaches a NAMED person through a real transport (Row 24 (e)'s bar — F25: today jobs alarms reach the logs only); (i) ⭐ row 6-37b is
  `done` before ANY claim-text template id (1–14) is provisioned (the deferred delivery-report item's own trigger, made a roster
  condition — this is what fences MG15's residual from a real family). Row 30 (b) gains an annotation pointing here. ⛔ A merge fence.
  ⭐ Recommended.
- **MG15 — The reading on `-252` cl.1 and `-323` R2 (record it; the split is the reading).** After this story, `accepted` means *"MSG91
  answered success for a request whose template passed a pre-flight within its TTL (or, after a transient re-check, its one-TTL stale extension) — or, on 6.19b/c/d, whose pre-flight was transient
  or gave an unproven reason (fail open, MG5)"*. `-252` cl.1 asks that a reminder was *"accepted by
  the network"*: ⭐ **MATCHES for every fault the pre-flight SEES on the sweeps that hold** (template missing / archived / wrong text /
  wrong type / no DLT id; an unauthorised key); **on 6.19b/c/d — D22's own input — only for the PROVEN ones** (a malformed id; the send
  key's refusal under MG17 (a)), which are no longer recorded `accepted`; wrong text / type / DLT id there stay in the residual below
  (fail open) (the Panel chose option A knowing "accepted is not received" — `-252`'s own
  reading). ⚠ It does ⛔ see send-side ACCOUNT faults — zero balance (301), SMS not enabled for the key (204), an unwhitelisted IP for
  sends (418), a blacklisted sender (603) — whether present BEFORE the run or arising mid-run, nor a DLT scrubbing failure, nor — on 6.19b/c/d —
  a template fault behind a transient pre-flight or an unproven reason (fail open), nor a template that breaks INSIDE a cached PASS's
  TTL or its stale extension: each still answers `success` ⇒ `accepted` ⇒ D22 counts the family reached. (And the Panel's open question MG5 records: whether
  a PROVEN content mismatch should refuse on 6.19b/c/d.) That residual is the class `-323` R2 accepted (*"PRE-EXISTING for EVERY
  DLT rejection cause"*), here WIDENED from DLT causes to account causes. ⭐ Recommended reading: it stays the author's because Row 32 (i)
  keeps every claim-text template id UNPROVISIONED until 6-37b reports delivery — so the residual can reach ⛔ real family before its
  closer exists; BigDev accepts it as R2 was. ⚠ If BigDev declines Row 32 (i), the widened residual reaches families under a
  Trustee-ratified rule ⇒ THAT is the Panel's ([[feedback_panel_gate_read_ratified_verbatim]]). Without MG5 at all it WIDENS for
  template faults too — likewise the Panel's.
- **MG16 — Dispositions of the items this story's change re-triggers** ([[feedback_closure_language_precision]]): (i) 6.27c's
  *"send hours are re-checked just BEFORE the send core, ⛔ inside it"* — its trigger ("the next change to `sendClaimDltSms`") FIRES, and
  MG5 puts a memo read (a network call on a miss) inside the core after peer mesh's window / lease checks (`claim-peer-mesh-requests.ts:
  659-668`) ⇒ ⭐ **Recommended ADDRESSED as the item prescribes**: the core gains `beforeSend?: () => 'go' | 'defer_window' | 'defer_lease'`,
  called synchronously IMMEDIATELY before `provider.send`; peer mesh passes its window + lease-margin check; a defer returns a new
  `{kind:'deferred', reason}` result the child routes to `deferToMorning` (window) or its counted lease branch (lease — alarm, `counts.transient += 1`, ⛔ the note-writing `transient()` helper). ⚠ The result
  union is `final | transient` today (`claim-dlt-sms-send.ts:43-58`) and the other four callers (three via `sendClaimCorrectionSms`, whose return type stays `ClaimCorrectionSmsResult`) narrow on `kind === 'transient'` then read
  `outcome` (`claim-correction-reminders.ts:423`, `claim-correction-closure.ts:377`, `claim-certificate-reminders.ts:664`,
  `claim-suspicion-notices.ts:445`) ⇒ type the core so the result EXCLUDES `deferred` when `beforeSend` is absent (an overload), ⛔ a
  third member leaking into callers that can never receive it. P6's margin comment
  (`:116-121`, `PEER_REQUEST_HANDOFF_LEASE_MARGIN_MS`) is re-derived to name the pre-flight. (ii) *"Dotted Secret Manager names
  (UNVERIFIED)"* — ⛔ addressed; the api boot already surfaces it (an `INVALID_ARGUMENT` throws at boot). (iii) *"`resolveSmsProviderDeps`
  doesn't trim"* — ⛔ addressed (the path is dark, MG12). (iv) the delivery-report item and the two at-least-once items — handed to 6-37b
  (MG1). (v) MG8's partial address. (vi) 6.27c **W10** (the sweep can't see `auth` / template faults ⇒ each child spends ONE slot) —
  **narrowed** by MG5 (template faults seen before enqueue); residual = a send-side account fault (MG15) ⇒ ⛔ closed.
- **MG17 — Which key the pre-flight uses (settled by S3).** (a) ⭐ **Recommended, IF S3 finds an SMS-scoped authkey may read templates:**
  ONE authkey for send + pre-flight. (b) If it may ⛔: a SECOND, template-read-only authkey under a new `SMS_GATEWAY_PREFLIGHT_KEY_SECRET_NAME`
  (api + jobs), Row 32 (b) naming both — ⛔ widening the send key's rule to make the pre-flight pass. Cost (b): one more secret and its
  rotation. Neither may leave MG14 (b) and MG5 both unmeetable.

## Acceptance Criteria

1. **AC0 — Governance before code (Task 0).** S1–S4 settled or their STOP raised; MG1–MG17 answered by BigDev and committed ALONE as one
   author-commit naming every supersession (MG5: `-302` RN4 / FOUND (c), `-295` RB12's edge; MG1: `-314` decision 2 in part); ADR-0041
   (`drafted`) + its index row; the `epics.md` `### Story 6.37` entry; roster Row 32 + the Row 30 annotations; the 6-37b sprint row
   (if MG1 (a)); the sprint ledger line — all committed BEFORE any code.
2. **AC1 — The Flow request (MG9, MG10, F10).** **Given** a message `{to:'+919876543210', templateId:<24-hex>, values:[{name:'otp',
   value:'048213'}]}` **then** the client POSTs `<origin>/api/v5/flow` with headers `authkey: <key>` (⛔ `Authorization`),
   `content-type: application/json`, `accept: application/json`, a `signal`, and a body whose PARSED JSON deep-equals
   `{"template_id":"<id>","short_url":"0","recipients":[{"mobiles":"919876543210","otp":"048213"}]}` — ⛔ `sender`, ⛔ `message`,
   ⛔ `realTimeResponse`, ⛔ `CRQID`, ⛔ the body text. An origin that is ⛔ bare (`https://control.msg91.com/send`) is refused at
   config time (MG10).
3. **AC2 — Acceptance needs `type` (MG6, I3).** `{"type":"success","message":"5e1e93cad6fc054d8e759a5b"}` ⇒ accepted with that id;
   HTTP 200 `{"type":"error","message":"…"}` ⇒ rejected; HTTP 200 with ⛔ `type`, or `success` with a blank / non-string / 65-char /
   non-alphanumeric `message` ⇒ rejected `unknown:…`; ⛔ a fabricated id in any case.
4. **AC3 — The code table (MG7).** One test row per code in MG7 → its class and detail `<class>:<code>` — each fixture labelled
   SYNTHETIC (a Flow sync `code` is ⛔ documented), with `code` given once as a string and once as a number; the two documented sync
   messages → their tokens (fixtures cite the SendOTP doc URL); HTTP 401 / 429 / 503 with ⛔ code → `auth` / `rate_limited` /
   `api_unavailable`; a network throw → `api_unavailable`; an abort → `api_unavailable:timeout`; a `code` carrying a 10-digit run →
   `<class>:unknown` (`sanitizeSmsGatewayCode`). Every detail matches the 0166 gateway-arm regex (assert it against
   `schema.PEER_MESH_REQUEST_DETAIL_PATTERN` from `@twt/domain` — imported, ⛔ copied).
5. **AC4 — The number (MG8).** `+91…` → `91…`; a `to` that `normalizeMobile` rejects or rewrites ⇒ `invalid_number:format` and
   `fetch` ⛔ called.
6. **AC5 — Named values from every caller (MG3, I1).** For EACH of templates 1–16, a test drives the REAL caller (the five children's send
   paths and `createSmsDltStepUpDelivery`) with a fake handle and asserts (i) `values` names = the registry's slot names, in order,
   (ii) `substituteDltValues(text, slots, values) === body`, (iii) `body` is byte-identical to today's render (the existing lockstep
   expectations, ⛔ edited). A caller whose `values` disagree with `render`, or a value longer than its slot's `maxLength`, ⇒
   `dlt_template_not_approved:values_mismatch` / `:value_too_long`, ⛔ `fetch`, an alarm — and on the peer-mesh child P1 STOPS the run.
   ⚠ Read with `2026-10-17-346` decision 1 (⛔ an edit of this AC): the HELPLINE slot is exempt from `:value_too_long` — a helpline over
   14 characters is SENT with the `helplineNotCallbackNumber` warning (`-322` C1; Debug Log (l)).
   `substituteDltValues` inserts `$&`, `$'`, `{#var#}` and `##x##` literally (unit legs).
7. **AC6 — The gateway form equals the sheet.** `toGatewayTemplate(text, slots)` equals the sheet's MSG91 column for every row 1–16
   (via the existing `sheetRowByConfigKey` — the sheet test's `msg91Form` stays an independent oracle and the two are asserted equal).
8. **AC7 — The pre-flight (MG5).** With a fake `getTemplateVersions` (the body's `data[]`): the ACTIVE version matching content (after
   canonicalisation — a CRLF / trailing-space / NFD variant still passes) + the text-derived `sms_type` + `DLT_ID` ⇒ pass; template 14
   (en) expects `UNICODE` and a GSM-7 English text expects `NORMAL` (pinned); each of {HTTP 401 ⇒ `auth`; HTTP 200 `status:"error"` ⇒
   `auth_or_not_found`; ⛔ ACTIVE version matching (a matching INACTIVE one included) ⇒ `content_mismatch`; a Unicode text on a NORMAL
   template ⇒ `sms_type_needs_unicode`; blank `DLT_ID`; a malformed id (⛔ call made)} ⇒ its reason; a 5xx / network / timeout ⇒ `transient`. `status` / `dlt_verified` /
   `dlt_reason` values ⛔ change the result (logged only — a test pins that, with `dlt_verified` as `"10"` AND `0`). The MEMO: a PASS is
   reused within its TTL, a FAULT within its short TTL, a TRANSIENT is ⛔ cached (⚠ read with `-346` decision 3: cached 60 s) and, on an expired PASS's re-check, returns that stale PASS for one more TTL only (then transient); N concurrent misses ⇒
   ONE call (counted). A GSM-7 text on a UNICODE template ⇒ PASS with `sms_type_unicode_for_gsm7` logged (pinned).
9. **AC8 — api boot (MG5, MG10, MG11).** ⚠ Review round 2 P10 (⛔ an edit of this AC): a read key whose VALUE equals the send key IS the send
   key (its refusal then refuses — MG17 (a)); one MSG91 id under both OTP keys STARTS with an error log. (a) In production `buildMemberStepUpDelivery` throws on a blank authkey, a blank or malformed OTP
   id, or an `auth` / `auth_or_not_found` pre-flight on either template (under MG17 (b): from the read key ⇒ STARTS with an error log;
   only a blank read-key secret name refuses); it STARTS with an error log (⛔ throw) on `content_mismatch` /
   `sms_type_needs_unicode` / `dlt_id_missing` and on a transport failure. At runtime the memo is advisory: an expired entry's re-check
   runs off the request path and a fault / transient there is logged while the code is STILL sent (pinned: `deliver` resolves without
   awaiting the re-check); ⛔ longer requires the sender id or a non-placeholder URL. If MG17 (b): the read key's secret name is required
   in production too. Dev / CI unchanged (the reveal stub).
   `member-step-up-delivery-wiring.test.ts` updated, each arm covered. (b) The OTP client creates its abort signal SYNCHRONOUSLY at `send`
   entry from an injectable `timeoutSignal(ms)` (9 s) — a test drives it with a controllable signal (`vi.useFakeTimers()` does ⛔ drive
   `AbortSignal.timeout`) and gets `StepUpDeliveryError('api_unavailable')`, ⛔ the outer bound's class. (c) jobs in production logs ONE line at boot when the gateway is unconfigured (MG11).
10. **AC9 — jobs: one memo, the hold where a hold exists, fail-open where none does (MG5, I4).** (a) The suspicion and peer-mesh sweeps:
    a pre-flight fault (⛔ `sms_type_unicode_for_gsm7`) — or a transient with ⛔ cached pass — on a template the run needs ⇒ the run HOLDS, ⛔ row claimed, ⛔ slot used,
    one alarm naming the config key and reason (⛔ id, ⛔ number); the peer-mesh check sits in `pariwarConfig` (a broken `en` template
    holds ⛔ Hindi Pariwar — pinned); the child's race guard is a memo hit (counted). (b) The correction / closure / certificate children:
    a PROVEN fault (`template_id_malformed`; `auth` / `auth_or_not_found` under MG17 (a)) ⇒ the row ends `error` + alarm with
    `dlt_template_not_approved:template_id_malformed` / `auth:preflight` — the SAME outcome a missing template id gives today (assert both
    side by side), ⛔ a hold; a TRANSIENT, `content_mismatch`, `dlt_id_missing` or `sms_type_needs_unicode` ⇒ ALARMED and the send PROCEEDS
    (fail open — one leg per reason); under MG17 (b) `auth` / `auth_or_not_found` from the read key ⇒ proceeds too; a GSM-7 text on a UNICODE template ⇒ proceeds. (a2) A memo fault first seen in the CORE on a holding child (the in-flight race) ⇒ final
    `dlt_template_not_approved:preflight_<reason>` (peer mesh: P1 stops); a transient with ⛔ usable pass there ⇒ `transient`
    (⛔ sent). (b2) A fail-open send returns `accepted` + `preflightWarning` and the caller alarms it (pinned). (c) A pass ⇒ the run proceeds. (d) Across one jobs
    process, at most ONE MSG91 pre-flight call per template per TTL window, whatever the row or child count, concurrent misses shared
    (counted). (e) Peer mesh: a `beforeSend` that answers `defer_window` / `defer_lease` (the window closed, or the lease margin gone, after
    the pre-flight) ⇒ ⛔ `fetch`, the row deferred to the morning / left for the re-claim exactly as today's pre-core branches leave it
    (one leg each; MG16 (i)).
11. **AC10 — Nothing else moves.** ⛔ migration; ⛔ i18n / registry text / sheet table edits (the sheet's *"Where and how we register"*
    MSG91 bullet gains the setup steps — prose only); ⛔ `ChannelProvider` / `RenderedMessage` / dispatch / cascade / render change —
    proven by an EMPTY `git diff --stat main -- packages/channels/src/{provider,dispatch,cascade,render}.ts` (`channels-determinism` also
    green, but it hashes render output only — I2); the alert categories stay dark (MG12 test); gate `dlt-typed-variables` green.
12. **AC11 — The proof.** `pnpm ci:local` green (or each red explained — the known 35/36 jsdom-under-load case re-run alone), every live
    suite run with `DATABASE_URL` at :5433 explicitly; ⛔ network call in any test (I7 — a test stubs global `fetch` with a RECORDER and asserts
    ZERO calls; ⚠ a throwing stub would be swallowed — a transport failure STARTS the api and fails OPEN on 6.19b/c/d — so it proves
    nothing; `member-step-up-delivery-wiring.test.ts` passes a counting fake through `buildMemberStepUpDelivery`'s injectable fetch).

## Tasks / Subtasks

- [x] **Task 0 — governance FIRST (AC0). ⛔ No code.**
  - [x] 0.1 `git fetch origin`; `git diff --name-only 466e9b0e..origin/main -- packages/channels apps/jobs/src apps/api/src/deps.ts
        apps/api/src/config.ts apps/api/src/modules/auth scripts/dlt-typed-variables docs/launch-gate-inventory infra/dokploy`; re-read any
        cited file that moved. Re-fetch F9–F19 from `docs.msg91.com/sms/send-sms.md`, `sms/module.json`, `otp/module.json` and the help
        articles (record the date) — docs pages ONLY (T1). Then settle S1–S4 from the docs or from MSG91 support IN WRITING:
        - **S1** — which `getTemplateVersions` field marks the DEFAULT version (MG5 assumes `active_status` `"1"`), what `status` /
          `dlt_verified` mean, and the exact form MSG91 stores `template_data` in (`##name##`; quotes / whitespace / entity-encoding).
          Settled or not, MG5's api content check stays alarm-only IN THIS STORY (blocking only via Task 7's deferred item); if
          unsettled, the ADR says so — ⛔ a STOP.
        - **S2** — MSG91's per-variable value cap for a `#url#` variable. ⭐ STOP if it is < the sheet's 55-character link: templates
          13 / 14 cannot be sent as registered — put the remedy to BigDev (a shorter link domain — Row 29, provisioning; or a slot change —
          its own author-commit over PM3 / `-311`, ⛔ a word of the text changed) before 0.2.
        - **S3** — whether an authkey whose RULE allows SMS only may call `getTemplateVersions`, and whether IP security (418) applies to
          it. Feeds MG17; ⭐ STOP if neither MG17 (a) nor (b) is possible.
        - **S4** — whether MSG91 offers a READ-ONLY balance / key-status endpoint. If yes, propose adding it to the pre-flight (it would
          close part of MG15's residual) as an MG at 0.2; if no, MG15 stands.
  - [x] 0.2 Put MG1–MG17 to BigDev, each with its recommendation and cost — incl. MG5's TTLs, I4's closure-notice cost and MG15's
        reading (which stands only with MG14 (i)). Record the answers verbatim. ⭐ **Answered 2026-10-17: *"accept all recommended"*** —
        MG1 (a), MG2 (a), MG3, MG4 (a), MG5 (pass TTL 1 h, fault TTL 5 min), MG6–MG16 as recommended, MG17 (a) per S3, **X1** (the
        closure-notice cost, I4) ACCEPTED, **X2** (Row 32 (i)) ACCEPTED.
        ⭐ **0.1 record (2026-10-17):** `origin/main` == `466e9b0e` (⛔ moved); MSG91's docs read the same day by the validate pass (docs
        pages only). S1–S4 are ⛔ settled by the docs ⇒ the author's dispositions (in `-345`, ⛔ put to BigDev): **S1** — the api content
        check stays alarm-only; `active_status` `"1"` = default (INFERENCE, in the ADR); Row 32 (d) records the meanings. **S2** — ⛔ a
        STOP (it fires only on a cap KNOWN below the link); Row 32 (d) gains *"MSG91's URL-variable cap confirmed in writing ≥ the
        provisioned link length, before templates 13 / 14 are provisioned"*; the code enforces the slot's `maxLength`. **S3** — both
        MG17 arms built: `SMS_GATEWAY_PREFLIGHT_KEY_SECRET_NAME` is OPTIONAL (unset ⇒ the send key, MG17 (a)); Row 32 (b) records which
        arm production uses. **S4** — ⛔ endpoint documented ⇒ MG15 stands.
  - [x] 0.3 Write the author-commit (`.decision-log.md`, prepended; the -344 entry's shape: Decision type / Status / Author / Ratifying
        trustees: None / §0 gate / Occasion / FOUND / The decisions / Consequences / References). It ADDS to `-314`, SUPERSEDES by a new
        entry `-302` RN4's *"⛔ a held class like 6.25's RE6; the SMS gateway gives ⛔ pre-flight"* clause and FOUND (c)'s *"⛔ provider
        pre-flight exists"* for faults the pre-flight sees, NARROWS `-295` RB12's accepted edge, moves `-314` decision 2's *"delivery-report
        correlation"* to row 6-37b (MG1), and records MG15's split reading — ⛔ edits any of them
        ([[feedback_supersede_never_reinterpret]]). Id: re-grep every branch's `.decision-log.md` for the next free number right before
        inserting (`-345` was free at validate). Stage in scratchpad, try the insert ([[project_decision_log_writes_user_inserted]]).
        Commit ALONE on the story branch; write its SHA after the commit, ⛔ before. ⭐ **Done:** `2026-10-17-345`, committed ALONE as
        `48017867` (the insert was accepted; additive only — 54 lines).
  - [x] 0.4 The records (one commit, after 0.3): `docs/adr/ADR-0041-sms-gateway-msg91.md` from `_adr-template.md` (MG13) +
        `docs/knowledge-transfer/adr-index.md` row + breakdown reconciliation + the `:169` and `:170` annotations; `epics.md` `### Story
        6.37: … \`[PRIMITIVE]\`` before the `---` that precedes `## Epic 7` (the 6.34 entry's blockquote shape); roster Row 32 (MG14 — the
        Row 29–31 block format, eleven fields, legs (a)–(i)) + dated annotations on Row 30 (a) (`apiUrl` → `apiOrigin`), (b) (the id keys
        now hold MSG91's id; ⚠ also waits for Row 32), (d) (F18: DLT scrubbing failures arrive only in a delivery report; the DLT FAQ's
        "1-2 variables" line vs templates 11–14) — ⛔ a word of Row 30 rewritten; if MG1 (a): the sprint row `6-37b-msg91-delivery-reports:
        backlog` under 6-37 with its comment, and the deferred delivery-report item AND the two at-least-once items annotated "closer: row
        6-37b"; the sprint ledger line ([[project_sprint_status_safe_prepend]] — guard the size, verify the YAML). Row
        `6-37-msg91-sms-gateway-adapter` → `in-progress`. ⭐ **Done 2026-10-17:** `docs/adr/ADR-0041-sms-gateway-msg91.md` (`drafted`);
        adr-index row + reconciliation note (`drafted` 1→2, Total 151→152) + the two slot annotations (⛔ flipped); `epics.md`
        `### Story 6.37` before Epic 7; roster Row 32 (legs (a)–(i), S1 / S2 / S3 folded into (b) / (d)) + Row 30 note (6) (dated, ⛔ a
        word rewritten); the deferred delivery-report item and both at-least-once items annotated "closer: row 6-37b" (⛔ closed); sprint
        row `6-37b-msg91-delivery-reports: backlog`; row 6-37 → `in-progress`; the ledger line.

- [x] **Task 1 — the vocabulary helpers (AC5, AC6).** In `packages/channels/src/dlt-variables.ts`: `substituteDltValues(text, slots,
      values)` (throws on a name / count mismatch; FUNCTION-form replacement) and `toGatewayTemplate(text, slots, wrap)`; a
      `needsUnicode(text)` (any character outside the GSM-7 default + extension tables) for MG5; unit tests incl. values containing
      `{#var#}`, `##x##`, `$&`, `$'` (substituted ONCE, left-to-right, never re-scanned, inserted literally). The jobs sheet test asserts
      `toGatewayTemplate` === `msg91Form` for rows 1–16, and `needsUnicode` agrees with the sheet's Unicode notes (14 en and every hi).

- [x] **Task 2 — the MSG91 client (AC1–AC4).** Rewrite `packages/channels/src/providers/sms-app.ts` (keep the file, `SmsAppClient`,
      `SmsMessagingHandle`, `SmsSendError`, `SmsFetchLike` names — 23 files reference them at the pin, incl. `fixture-sms.ts`):
      `SmsClientConfig {apiOrigin, authkey}`; `SmsGatewayMessage {to, templateId, values, body}`; `send` per MG6 / MG8 / MG9;
      `readTemplateVersions(templateId)` for MG5 (same 9 s signal). `SmsFetchInit` gains `signal`. Rewrite `sms-errors.ts`'s sets per MG7
      (keep `SmsErrorClass` EXACTLY — I5; update the header's "INDICATIVE" warning to cite the MSG91 source + date; state that
      `carrier_reject` has ⛔ synchronous MSG91 code). `sms-dlt.ts`: `SmsProviderDeps.values?` bound per send; ⛔ values ⇒ MG12.
      `getStatus` stays `unknown` (comment: delivery reports are row 6-37b). Tests that turn red and are rewritten here:
      `packages/channels/tests/sms.test.ts` — the client block `:167-250`, the placeholder-code legs `:81-135`, the value-less provider leg
      `:51-70` (inverts to `no_named_values` — MG12); `packages/channels/tests/provider-composition.test.ts` and
      `contribution-provider-resolver.test.ts` (`dltTemplateId` / `isConfigured`) — ⚠ review round 2: that one stayed GREEN
      unchanged (its fakes never touched a removed field), so it is ⛔ in the File List.

- [x] **Task 3 — the pre-flight (AC7).** `packages/channels/src/providers/sms-preflight.ts`: `checkMsg91Template(client, entry, id)` →
      `{ok:true} | {ok:false, transient:boolean, reason}` (reasons: `auth`, `auth_or_not_found`, `content_mismatch`, `sms_type_needs_unicode`,
      `dlt_id_missing`, `template_id_malformed`; a PASS may carry the logged `sms_type_unicode_for_gsm7` note), plus `createMsg91PreflightMemo({check, clock, passTtlMs, faultTtlMs})` (MG5's memo —
      shared in-flight, ⛔ transient cached — ⚠ `-346` decision 3: 60 s, the memo's `transientTtlMs`); logs the informational fields (⛔ the authkey, ⛔ `template_data`). ⚠ This file must ⛔ name
      the `sms.dlt.template_id.` prefix, `DLT_VAR` or the `{#var#}` literal, even in a comment (F21, T4) — it takes `{text, slots}` and an
      id. Export via `packages/channels/src/index.ts`.

- [x] **Task 4 — the send core and the five callers (AC5, AC8 (c), AC9).** `claim-dlt-sms-send.ts`: the `template` + `values` inputs and MG3's
      synchronous checks (before `smsAppClient.messaging()`); the malformed-id final (MG4, before the memo); the memo read after the id
      resolves (MG5): a PROVEN fault (`auth` / `auth_or_not_found` under MG17 (a)) ⇒ final on every caller; `content_mismatch` /
      `dlt_id_missing` / `sms_type_needs_unicode` ⇒ final on the suspicion / peer-mesh children, ALARMED and sent on 6.19b/c/d — the core
      takes `preflightFailOpen: boolean`, which `sendClaimCorrectionSms` sets `true` (its deps `Pick<…>` gains the memo field; its return
      type stays `ClaimCorrectionSmsResult`); TRANSIENT with ⛔ usable pass ⇒ proceed with `preflightWarning` ONLY when
      `preflightFailOpen`, else `{kind:'transient', detail:'api_unavailable:preflight'}`; under MG17 (b) `auth*` is unproven; the
      `accepted` arm gains optional `preflightWarning`, alarmed by each 6.19b/c/d caller beside its helpline warning; `beforeSend?` called synchronously immediately before `provider.send`, `defer_window` /
      `defer_lease` ⇒ `{kind:'deferred'}` (MG16 (i) — the overload keeps it out of the other four callers' result type). Each caller passes its registry entry and a `values` builder closing over the SAME locals its `render`
      uses (⛔ a second formatting). `apps/jobs/src/boot.ts`: build ONE `Msg91PreflightMemo` and put it on `claimCorrectionDeps` (MG5) — the OPTIONAL field
      declared on `ClaimDltSmsDeps` AND `ClaimCorrectionReminderDeps` (the wrapper's `Pick` selects from the latter).
      Suspicion: `purposeConfigGap` (sweep + child race guard) consults the memo and HOLDS. Peer mesh: `configSet` returns the resolved
      value; `pariwarConfig` consults the memo after the template id resolves and HOLDS (⛔ `globalConfigGap`); the child passes
      `beforeSend` = its window + lease-margin check; re-derive `PEER_REQUEST_HANDOFF_LEASE_MARGIN_MS`'s comment. The correction / closure /
      certificate sweeps get ⛔ hold (MG5 ⚠⚠; T6). jobs config: `SMS_GATEWAY_API_URL` default `https://control.msg91.com`, bare-origin
      check; drop the sender resolution; MG11's boot line; suspicion's `configSet` returns the resolved value too. `infra/dokploy/compose.yaml`:
      `SMS_GATEWAY_API_KEY_SECRET_NAME` on jobs (MG10 — operator applies); if MG17 (b), `SMS_GATEWAY_PREFLIGHT_KEY_SECRET_NAME` beside it and
      the memo built with the read key. Tests that turn red and are updated here: every fixture template id → 24-hex (`'TPL-1'`
      `claim-correction-reminders-live.test.ts:127`, `claim-correction-closure-live.test.ts:81`; `'TPL-123'`
      `claim-correction-send.test.ts:43`; `'TPL-CERT'` `claim-certificate-reminders-live.test.ts:235, :317`; `'TPL-SUSPICION'`
      `claim-suspicion-notices-live.test.ts:290, :843`; `'TPL-PEER'` `claim-peer-mesh-requests-live.test.ts:229, :569`); the
      placeholder-code pins (`claim-correction-send.test.ts:159-217`, `claim-correction-reminders-live` ×5, `claim-suspicion-notices-live`
      ×6, `claim-certificate-reminders-live` ×2 — ⚠ the `CARRIER_REJECT → rejected_unreachable` rows become a synthetic-code row, MG7);
      `apps/jobs/tests/contribution-providers.test.ts:46-47, :148-191` (`{apiUrl, apiKey, senderId}`, the sender secret, the `''` URL
      default); the `SmsAppClient` fakes `claim-certificate-reminders.test.ts:22`, `claim-correction-control-paths.test.ts:141` (stay valid
      while `preflight` is optional). Every fake records `values` and asserts AC5 (ii).

- [x] **Task 5 — the OTP path (AC5, AC8).** `sms-step-up-delivery.ts`: send `values: [{name:'otp', value: code}]` + `body:
      renderOtpBody(...)` + `templateId`. `deps.ts` `buildMemberStepUpDelivery`: MG10's config, the malformed-id check, the boot pre-flight
      for 15 / 16 with MG5's api outcomes and the advisory runtime re-check (off the request path); an injectable fetch / client (AC11); if
      MG17 (b), the read key's secret name (required in production); keep the error string's literal keys (the
      `TEMPLATE_ID_ALLOWLIST` entry is for it). `config.ts`: the origin default + bare-origin check; retire `SMS_GATEWAY_API_URL_PLACEHOLDER`
      and the sender fields (grep every use). `infra/dokploy/compose.yaml`: the same secret-name line on api. Tests:
      `tests/unit/sms-step-up-delivery.test.ts` (incl. the code pins `:186-207`; the `'TRAI::sms.dlt.template_id.otp_login'` echo
      `:102, :130, :163` → a per-key hex map), `tests/integration/sms-step-up-delivery.spec.ts` (`:132, :168` and its code pin),
      `tests/unit/member-step-up-delivery-wiring.test.ts`, `tests/unit/sms-composition.test.ts` (`:96-104` inverts — MG12).

- [x] **Task 6 — the dark path and the gates (AC10).** MG12's test (a dark category's provider, if forced, refuses with
      `no_named_values` and ⛔ `fetch`); `git diff --stat main -- packages/channels/src/{provider,dispatch,cascade,render}.ts` EMPTY;
      `pnpm --filter @twt/channels test:determinism`; `pnpm dlt-typed-variables:test && pnpm dlt-typed-variables:check` (⚠ a new file
      must be `git add`-ed first); the sheet's *"Where and how we register"* MSG91 bullet gains the setup steps (create from the MSG91
      column; DLT TE id; sender; `smsType` UNICODE for every Hindi template AND template 14; mark default; ⛔ short URLs — panel shortener
      off, app-link domain on "Skip URL") — PROSE, ⛔ a table cell (rule (i) scans table rows; the 7-cell parse).

- [x] **Task 7 — records and close (AC11).** Write AC11's recorder test (the jobs core, a 6.19b/c/d fail-open leg, and
      `buildMemberStepUpDelivery` with ⛔ injected fetch); `pnpm ci:local` with `DATABASE_URL` at :5433; a NEW deferred-work item *"MG5's content /
      DLT-id / `sms_type_needs_unicode` checks are alarm-only on the api and fail-open on 6.19b/c/d"* — trigger: Row 32 (e) records a real
      green response and S1 is settled (then a later change may make the api check blocking, re-weighing T13; the 6.19b/c/d question is the Panel's, MG5); the deferred-work
      dispositions (MG16 (i)–(vi), MG8, MG9, MG1's three hand-offs — each "Closed by" / "partly addressed" / "⛔ addressed" / "handed to", ⛔ collapsed); the Change
      Log; the File List; the sprint row → `review`; the ledger line. ⛔ Fast-forward to `main` — BigDev's call
      ([[feedback_land_prs_by_fast_forward]]).

### Review Findings

Full `bmad-code-review`, 2026-10-17: `466e9b0e..4c03aed1` (44 files, +4,460 / −579), against this story, MG1–MG17,
I1–I7 and the load-bearing-invariant checklist. Blind Hunter, Edge Case Hunter and Acceptance Auditor ALL returned.
The helpline exception in `4c03aed1` / Debug Log (l) is included. **0 decision-needed, 4 patch, 1 defer; 2 additional
candidates dismissed** (raw provider-reason logging: no demonstrated recipient/secret-bearing input from the template API;
duplicate-id/text memo: intentional defensive checking over the fixed registry, already pinned by a test).
**Disposition (BigDev, 2026-10-17): option 2 — leave as action items.** F1–F4 remain unchecked; W1 remains explicitly deferred.
⚠ (As of that review — F1–F4 were resolved in `b90a319c`; see the disposition after W1.)
No application code changed during the review. Story and sprint row return to `in-progress` while the four patches remain unresolved.

- [x] [Review][Patch][HIGH] **F1 — Preserve the client's timeout classification during response-body consumption**
  [`packages/channels/src/providers/sms-app.ts:327`]. A response can deliver HTTP 200 headers before the 9-second bound, then stall
  in `res.json()`. Its abort is swallowed by the JSON catch; `payload = null` becomes `unknown:no_type`. The jobs core finalises
  `unknown` as `error`, consuming that reminder/certificate slot or losing the once-ever closure notice; OTP delivery also reports
  `unknown` instead of the promised `api_unavailable`. **AC3 / AC8 (b), MG9; invariant family 2.** Injected-fetch reproduction:
  an aborted JSON read yielded `{code:'no_type', errorClass:'unknown'}` and a real `sendClaimCorrectionSms` call returned
  `{kind:'final', outcome:'error', detail:'unknown:no_type'}`. Preserve `api_unavailable:timeout` when the signal aborts while
  consuming the body; distinguish a body transport failure from invalid JSON. Add the missing after-headers timeout regression
  through the real client and caller. Sources: blind + edge + auditor.
  ✅ **Resolved 2026-10-17 (`b90a319c`):** `readBody` in `sms-app.ts` — an abort while the body streams ⇒ `api_unavailable:timeout`
  (any status); a 2xx body that breaks otherwise ⇒ `api_unavailable:body_read` (a non-2xx keeps its status); a `SyntaxError` (invalid
  JSON) ⇒ `null`, unchanged (`unknown:no_type` on a 2xx). The template read's body abort ⇒ `unavailable` (`timeout`). Regressions
  through the real client: `sms.test.ts` (4), `sms-preflight.test.ts` (1), `msg91-real-client-caller.test.ts` (the real
  `sendClaimCorrectionSms` ⇒ `transient` — 2), `sms-step-up-delivery.test.ts` (OTP ⇒ `StepUpDeliveryError('api_unavailable')`) — each
  red on the unfixed client.

- [x] [Review][Patch][HIGH] **F2 — Do not promote an unexplained template-read HTTP error to a proven send refusal**
  [`packages/channels/src/providers/sms-app.ts:386`]. Every remaining non-2xx response, including HTTP 404 / 405 / 408 from the
  template endpoint or a proxy, becomes `refused` → `auth_or_not_found`. With the default send-key reader, this prevents API startup
  and ends correction/closure/certificate rows as `auth:preflight`, even though it proves nothing about Flow delivery. **AC8 (a),
  AC9 (b), MG5 / I4; invariant families 9 and 11.** The existing HTTP-404 test and Debug Log (g) pin the overbroad classification;
  recording it does not establish the required proof. Injected-fetch reproduction: template read HTTP 404 produced a definite
  `auth_or_not_found`, the real correction wrapper returned final `auth:preflight`, and Flow was never called. Restrict definitive
  refusal to the documented auth/template refusal evidence; treat unexplained read-endpoint failures as unavailable (fail open on
  6.19b/c/d and advisory at API boot; still hold the holding sweeps). Add caller and boot regressions; correct Debug Log (g) after
  the patch without rewriting the governance decision. Sources: blind + auditor.
  ✅ **Resolved 2026-10-17 (`b90a319c`):** `readTemplateVersions` keeps exactly MSG91's documented refusals — HTTP 401 ⇒ `unauthorised`
  (`auth`); HTTP 200 `status:"error"` / `hasError` ⇒ `refused` (`auth_or_not_found`) — and returns `unavailable`
  (`unexpected_status`) for EVERY other non-2xx, **HTTP 403 included** (Debug Log (m)). Caller regressions (the real correction wrapper
  FAILS OPEN — sent with `api_unavailable:preflight`; a holding child is `transient`, ⛔ sent; HTTP 401 still ends the row `auth:preflight`
  — the positive control) and boot regressions (404 / 405 / 403 ⇒ STARTS with an error log), all red on the unfixed client; the
  table's HTTP-404 row flipped (with 403 / 405 / 408 / 400 rows added). Debug Log (g) corrected below; `-345` ⛔ edited.

- [x] [Review][Patch][MEDIUM] **F3 — Retain retryable HTTP status precedence when matching a code-less error message**
  [`packages/channels/src/providers/sms-app.ts:349`]. `tokenForMessage` runs before the HTTP fallback. An HTTP 429 or 503 with the
  recognised invalid-template message becomes final `dlt_template_not_approved:template_invalid`, rather than `rate_limited` or
  `api_unavailable`; the jobs caller consumes its slot instead of retrying. **MG6, ADR-0041's acceptance order.** Both statuses
  reproduced with injected fetch. Debug Log (b)'s intended `auth:authkey_missing` token on HTTP 401 does not require overriding
  throttling/server statuses. Keep that 401 token and the listed-code mappings while ensuring code-less 429 / 5xx remain transient;
  add table-driven mixed-status/message cases. Source: edge.
  ✅ **Resolved 2026-10-17 (`b90a319c`):** a code-less 429 / 5xx now classifies by its status BEFORE the message tokens; the 401
  `"Auth Key missing"` ⇒ `auth:authkey_missing` and the 200 / 400 `template_invalid` tokens are kept; listed codes keep their class on a
  429 / 5xx (Debug Log (a)). Table-driven legs in `sms.test.ts` (7 + 1) and the real caller (429 / 503 ⇒ `transient`), red before.

- [x] [Review][Patch][MEDIUM] **F4 — Supply an OTP-only way to prove the deployed jobs pre-flight before OTP go-live**
  [`docs/launch-gate-inventory/inventory-roster.md:576`]. Row 32 (e) requires a green pre-flight on deployed API AND jobs before OTP
  go-live, but jobs only creates a lazy memo (`apps/jobs/src/boot.ts:612`) used by claim-text callers. With templates 1–14 deliberately
  unprovisioned under Row 32 (i), the shipped jobs paths cannot produce that green result. This leaves the evidence dependent on
  6-37b despite Row 32 note (1) / MG1 explicitly keeping OTPs independent. **AC0 / MG14, MG1's rollout intent.** Provide a documented,
  read-only deployment procedure or command using OTP templates 15/16 and the jobs process's configured reader/key/egress; record
  that as the initial jobs proof, and retain claim-text verification when its own provisioning becomes permitted. Do not weaken
  Row 32 (i) or provision claim ids to obtain the proof. Source: blind; parent verified the lazy wiring and both gate deadlines.
  ✅ **Resolved 2026-10-17 (`b90a319c`):** `apps/jobs/src/sms-otp-preflight.ts` (`runSmsOtpPreflight`) + the CLI
  `sms-otp-preflight-cli.ts` (`pnpm --filter @twt/jobs sms:preflight`; in the image `node apps/jobs/dist/src/sms-otp-preflight-cli.js`):
  reads templates 15 / 16 through the jobs process's OWN reader — `buildSmsGatewayClients`, extracted from
  `buildContributionProviderResolver` so boot and the command share one builder — and the same `checkMsg91Template` the memo wraps;
  ⛔ Flow; one JSON line (⛔ the key, ⛔ an id, ⛔ a text); exit 0 only when both pass. Recorded as the INITIAL jobs proof on roster Row 32
  note (5) (dated; ⛔ a word rewritten; (i) ⛔ weakened) and the sheet's MSG91 step (7) (prose). `sms-otp-preflight.test.ts` (9 legs — five `it` + a four-row `it.each`; review round 2 corrected "7",
  a global-fetch recorder at ZERO calls).

- [x] [Review][Defer][MEDIUM] **W1 — A configured HTTP gateway origin can transmit the authkey, mobile and OTP without TLS**
  [`packages/channels/src/providers/sms-app.ts:183`] — deferred, pre-existing. `parseSmsGatewayOrigin('http://control.msg91.com')`
  succeeds; both send and read then use it. The baseline client also accepted arbitrary HTTP `apiUrl`, so this is not a new
  transport regression. The default remains HTTPS. Follow-up: require HTTPS for production gateway configuration and add a
  negative config test; re-trigger before provisioning production SMS credentials. Also recorded in `deferred-work.md`. Source: blind.

**Disposition after the fixes (2026-10-17):** F1–F4 resolved in `b90a319c`; W1 stays deferred. Story and sprint row → `review`.

**Verification in this review:** 415/415 focused unit tests (channels 213, jobs 153, API 49); five jobs live suites 165/165 on
`DATABASE_URL` at `:5433` (initial sandbox connections were denied; the approved rerun passed). All reproductions inject fetch;
no MSG91 API call was made. `git diff --check` passed. AC10's diff over the channel port/dispatch/cascade/render, i18n and domain
schema/migrations is empty. The build's recorded 36/36 `ci:local` was not re-run during this review.

**Touched invariant families:** (1) covered by construction — overloads exclude `deferred` from callers without a hook; peer mesh
handles both reasons. (2) REAL GAP F1; memo sharing is otherwise pinned by “N concurrent misses ⇒ ONE call” and both live AC9 (e)
window/lease cases. (5) covered by construction/tests — no schema/class change; the code-table test imports the domain's 0166 grammar
and live tests persist the new details. (6) covered by construction — explicit observation field picks exclude template text; error
messages omit transport text and gateway codes are scrubbed (raw reason fields are the dismissed, conditional concern above).
(9) REAL GAP F2 — the documented exception exceeds proven refusal. (10) covered by construction — deferred delivery reports and
other residuals remain open; governance precedes code; the helpline override is recorded. Real-caller English coverage of Hindi-only
refusal/closed suspicion purposes is not constructible through current routing; no such proof is claimed. (11) REAL GAP F2 — a read
endpoint failure can refuse a text the policy explanation promises to send. Untouched families skipped.

### Review Findings — round 2

Full `bmad-code-review`, 2026-10-17: the whole branch `466e9b0e..171e2040` (49 files, +5,164 / −589), in four chunks — (a) `packages/channels`,
(b) `apps/jobs`, (c) `apps/api`, (d) the records — × Blind Hunter, Edge Case Hunter and Acceptance Auditor (12 layers, ALL returned), against this
story, MG1–MG17, `-345` / `-322` / `-252` verbatim and the load-bearing-invariant checklist. **2 decision-needed (both resolved ⇒ patches), 18 patch, 0 defer; 29 candidates
dismissed** (among them: the 2xx body-abort retry — F1's prescribed resolution, carried by the at-least-once items (Debug Log (n)); the holding
child's in-flight final — MG5 *"is a final on the suspicion / peer-mesh children … this is the in-flight race"*; Unicode in a VALUE — Row 30 (d);
a listed code echoing its HTTP status — MG7's letter, same scope-wide final; the raw provider reasons — dismissed in round 1). Round 1's F1, F3 and
F4 are MET on every path traced; F2 is MET for every non-2xx and NOT for 2xx error bodies (P1). Panel gate (§0): every finding below is the
author's EXCEPT one question P2 surfaced and does ⛔ settle (Debug Log (o) — ROUTED to the Panel by BigDev's *"b"*, ⛔ blocking) — none other changes what
the Trust discloses or owes, or a basis; P1 is fixed precisely so it does ⛔ reach `-322` §0's Panel-reserved
fail-closed option. No application code changed during the review.

- [x] [Review][Decision] **D1 — Record the build's two departures from `-345`'s letter, and choose whether MG7's unlisted-code fallback stays** —
  Debug Log (l) (BigDev's helpline exemption from MG3's `value_too_long`, built in `4c03aed1`) and Debug Log (a) (an UNLISTED code on a 401·403 /
  429 / 5xx classifies by status — MG7 reads *"`unknown`: … every unlisted code"*) both change behaviour `-345` decided, and neither has a decision
  entry; AC5 still reads *"a value longer than its slot's `maxLength` ⇒ … `:value_too_long`"*. ([[feedback_supersede_never_reinterpret]];
  [[feedback_governance_commits_precede_implementation]].) Options: **(a)** keep both and record them in ONE author-commit narrowing `-345` MG3 (the
  helpline slot, restoring `-322` C1) and MG7 (unlisted code ⇒ status class on 401·403 / 429 / 5xx), with an AC5 annotation — it may also note that
  `-345`'s evidence line says *"docs pages only — ⛔ API call"* while F9 rests on T1's three live probes; **(b)** record (l) only and revert (a) to
  MG7's letter (an unlisted code on a 429 / 5xx becomes a FINAL `unknown` — a spent slot on 6.19b/c/d). Sources: auditor (d) + edge (d).
  ✅ **Resolved 2026-10-17 — BigDev: (a)** ⇒ a patch: ONE author-commit `2026-10-17-346` (decisions 1–2, Consequence 2), committed ALONE
  (`da27b82d`) before the round-2 changes; then AC5 annotated and Debug Log (a) / (l) cite it.
  ⚠ **Correction (dated, review round 2's fix-diff review — `-346` is ⛔ edited):** `-346`'s Status reads *"decisions 2 and 3 precede
  their code"* and attaches `fe3dc2c4` / `88e1ec97` to decision 1 — both wrong. Decisions 1 AND 2 record what was ALREADY built
  (decision 1: `4c03aed1`; decision 2: `88e1ec97` — `fe3dc2c4` still followed MG7's letter); only decision 3 precedes its code. The next
  decision entry that touches this story carries the same correction (as `-346` Consequence 2 corrected `-345`) — together with the two
  dated corrections to `-346` §0 at Debug Log (a) and (p).

- [x] [Review][Decision] **D2 — A pre-flight TRANSIENT is never cached (`-345` MG5) — keep, or add a short back-off** — with no usable pass, every
  check re-reads MSG91 (≤ 9 s each): every jobs send during a template-API outage waits on its own read before the send; every api OTP fires a
  fresh read and writes an error line; a 429 throttle is re-hit; a permanent misconfiguration (wrong host ⇒ 404) is re-read forever. Outcomes are
  unchanged either way (holding paths hold, 6.19b/c/d fail open, OTP is sent). Options: **(a)** keep MG5 as decided; **(b)** cache a transient for a
  short TTL (e.g. 60 s), recorded as an author-commit narrowing MG5's *"a TRANSIENT is ⛔ cached"*. [`packages/channels/src/providers/sms-preflight.ts:211`]
  Sources: edge (a, b, c).
  ✅ **Resolved 2026-10-17 — BigDev: (b)** ⇒ a patch: a transient cached for **60 s** in both memos (`-346` decision 3 — the same entry
  as D1, committed first); an expired pass's stale fallback is ⛔ shadowed by it; legs for the cached transient and its expiry.

- [x] [Review][Patch][MEDIUM] **P1 — Only MSG91's DOCUMENTED 200 `status:"error"` body is a definite refusal** [`packages/channels/src/providers/sms-app.ts:432`]
  — `hasError === true || hasError === 'true' || status === 'error' || status === 'fail'` ⇒ `refused` ⇒ `auth_or_not_found`. F16 documents
  `status:"fail"` only on the HTTP 401 body; a 200 `status:"fail"` or a `hasError`-only body is undocumented, yet under MG17 (a) it refuses api boot
  and ends 6.19b/c/d rows `auth:preflight` (the closure notice for good) — the F2 class moved into the 2xx path; Debug Log (g)'s correction claims
  the narrower rule. Fix: `refused` only on `status === 'error'`; any other error-looking 2xx ⇒ `unavailable`; legs for 200 `status:"fail"` and
  `hasError`-only (client, the real correction wrapper, api boot). Families 9 / 10 / 11 — REAL GAP. Sources: auditor (a, b) + edge (b) + blind (b, c).
  ✅ **Resolved 2026-10-17:** `readTemplateVersions` refuses only on `status === 'error'`; `status:"fail"` / a bare `hasError` ⇒ `unavailable` (`unexpected_body`). Legs: `sms-preflight.test.ts` (4 table rows + the pre-flight leg), `msg91-real-client-caller.test.ts` (the real 6.19b wrapper FAILS OPEN on both; the documented body still ends the row), the api wiring test (both START).
- [x] [Review][Patch][MEDIUM] **P2 — A suspicion notice whose deceased name exceeds 40 code points now ends `value_too_long` — unrecorded, untested**
  [`apps/jobs/src/scheduler/claim-suspicion-notices.ts:430`] — `resolveMemberFacingDeceasedName` in `full_name` mode has no length guard; the core
  (`claim-dlt-sms-send.ts:182`) refuses after the slot is claimed, spending the once-ever notice (sent before 6.37; peer mesh guards the same slot
  pre-claim, `claim-peer-mesh-requests.ts:505`). MG3 prescribes the final and F11's 40-character cap means it could not be delivered either way —
  record it (Debug Log entry) and pin it with a live leg. Family 10. Sources: edge (b) + auditor (b).
  ✅ **Resolved 2026-10-17 (the record and the pin; the POLICY question is OPEN):** Debug Log (o) records it — and that it narrows the
  Trustee-ratified `-293` item 1 B / `-262` FQ7 B / `-291` Q2 B texts for a name over 40 code points, ROUTED to the Panel (`_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-17-6-37-name-too-long-for-the-text.md`,
  written, ⛔ yet sent);
  `claim-suspicion-notices-live.test.ts` "round 2 P2" pins today's behaviour (final `value_too_long` + alarm, ⛔ sent, ⛔ the name in an alarm).
- [x] [Review][Patch][LOW] **P3 — Classification: a blank `code` counts as a code; a code-less 401 / 403 is read by message before status**
  [`packages/channels/src/providers/sms-app.ts:216`, `:366`, `:382-388`] — `stringOrNull('')` is non-null (the baseline's `extractGatewayCode`
  trimmed), so `code:""` skips the message tokens; and a code-less 401 / 403 carrying *"flow ID or template ID is invalid"* becomes
  `dlt_template_not_approved:template_invalid` where MG6's order gives `auth`. Fix: a blank / whitespace code is null; a code-less 401 / 403 is
  `auth` (detail `authkey_missing` when that message is present, keeping Debug Log (b)); legs. Sources: blind (a) + edge (a) + auditor (a) + edge (d).
  ✅ **Resolved 2026-10-17:** `gatewayCodeOf` (a blank code is ⛔ code); a code-less 401 / 403 ⇒ `auth` (`authkey_missing` named when that message is present). Seven table legs in `sms.test.ts`; Debug Log (b) annotated.
- [x] [Review][Patch][LOW] **P4 — The pre-flight passes when ANY active version matches, and logs only the matched one** [`packages/channels/src/providers/sms-preflight.ts:126-127`, `:146`]
  — MG5 checks *"the version with `active_status` `"1"`"* and LOGS the other versions; `active.filter(isOne).find(match)` passes on a matching
  non-default active version, and `report(…, [match])` makes `versions` read 1. Fix: more than one active version with any mismatch ⇒
  `content_mismatch`; the observation carries every version (field-picked) and the true count. Sources: edge (a) + auditor (a).
  ✅ **Resolved 2026-10-17:** EVERY active version must pass (the build's reading of MG5's singular *"the version with `active_status`
  `"1"`"* for a case MG5 does ⛔ name — stricter, so it can only HOLD / alarm more); every version is logged with the true count. One leg (two active, one mismatching ⇒ `content_mismatch`; one missing a DLT id ⇒ `dlt_id_missing`; both matching ⇒ pass; the pass log carries the inactive version).
- [x] [Review][Patch][LOW] **P5 — Diagnostics name the wrong cause** [`packages/channels/src/providers/sms-preflight.ts:115-117`; `sms-app.ts:403-407`; `apps/jobs/src/scheduler/contribution-providers.ts:249-257`]
  — (i) `unavailable.cause` is dropped, so a wrong host (404 on both reads) logs only `(transient)`, indistinguishable from a blip; (ii) an
  unconfigured reader returns `unauthorised` ⇒ `auth` with ⛔ call made (the CLI then reports `auth`); (iii) jobs resolves the read-key secret even
  when the send key is unset, so an unresolvable read-key name fails jobs boot with SMS off (MG11). Fix: carry the cause into the transient
  result and its log; a config fault ⇒ `unavailable` (`config`); resolve the read key only when the send key is configured. Sources: edge (a, b, c) + auditor (a) + blind (a, b).
  ✅ **Resolved 2026-10-17:** (i) a transient carries `cause` (result and log; the api line reads `transient: <cause>`); (ii) an unusable reader config ⇒ `unavailable` (`config`); (iii) jobs resolves the read key only when the gateway is configured (the send key AND an accepted origin), and a blank one is logged once. Legs in `sms-preflight.test.ts`, `contribution-providers.test.ts`, the api wiring table.
- [x] [Review][Patch][LOW] **P6 — The `authkey` header follows a cross-origin redirect** [`packages/channels/src/providers/sms-app.ts:339`, `:410`] — the
  baseline's `Authorization: Bearer` is stripped by fetch on a cross-origin redirect; a custom `authkey` header is ⛔. Fix: `redirect: 'error'` on
  both requests (a redirect ⇒ the transport-failure / `unavailable` path); a leg. Source: edge (a).
  ✅ **Resolved 2026-10-17:** `redirect: 'error'` on both requests (`SmsFetchInit.redirect`); legs on send and read.
- [x] [Review][Patch][LOW] **P7 — The memo key omits the slot names** [`packages/channels/src/providers/sms-preflight.ts:186`] — the verdict depends on
  `toGatewayTemplate(text, slots)`; two entries with the same id and text but different slot names share one verdict. Fix: key on the gateway
  form. Sources: blind (a) + edge (a).
  ✅ **Resolved 2026-10-17:** the memo key carries the slot names; one leg.
- [x] [Review][Patch][LOW] **P8 — The NFC leg proves nothing** [`packages/channels/tests/sms-preflight.test.ts` "passes an NFD variant of a Hindi text"]
  — no code point in the fixture decomposes, so `.normalize('NFD')` returns the same string; deleting `canonical()`'s NFC stays green. Fix: a
  decomposable input (e.g. U+0958 vs U+0915 U+093C). Source: blind (a).
  ✅ **Resolved 2026-10-17:** the leg uses क़ (U+0958) against क + ़ and asserts the raw strings differ.
- [x] [Review][Patch][LOW] **P9 — `parseSmsGatewayOrigin` refuses equivalent origins; a blank value is ⛔ unset** [`packages/channels/src/providers/sms-app.ts:189-200`; `apps/api/src/config.ts:426`; `apps/jobs/src/scheduler/contribution-providers.ts:237`]
  — `https://control.msg91.com:443` and an upper-case host fail the string equality; `SMS_GATEWAY_API_URL=` reaches the parser (`??`) and throws
  — in the api in EVERY environment. Fix: compare structurally (path `/`, no query / hash) and return the normalised origin; blank ⇒ the default.
  (W1's `http:` stays deferred.) Sources: blind (a, c) + edge (c) + auditor (c).
  ✅ **Resolved 2026-10-17:** `parseSmsGatewayOrigin` judges structurally and returns `url.origin`; blank ⇒ the default. Legs (`:443`, upper case, blank, `?`, `#`, userinfo, `ftp:`). ⚠ One tightening beyond the finding: a double trailing slash (`…//`) is now refused (a path of `//`).
- [x] [Review][Patch][LOW] **P10 — Locally provable OTP misconfigurations are ⛔ refused** [`apps/api/src/deps.ts:253-278`] — the same 24-hex id under
  both OTP keys only logs `content_mismatch` and sends the login text for a step-up code; a read-key secret equal to the send key is treated as a
  separate key, so its 401 STARTS instead of refusing. Fix: refuse identical OTP ids at boot (zero reads); `readsWithSendKey` when the values are
  equal (api and jobs). Sources: blind (c) + edge (c).
  ✅ **Resolved 2026-10-17 — the read-key half as prescribed; the identical-id half NARROWED to an error log:** a read key equal to the send key is the send key (api + jobs — its refusal then refuses, MG17 (a)); one id
  under both OTP keys is an error log at boot (STARTS — `-345` MG5's refusal list does ⛔ name it, so a refusal would need its own entry;
  the fix-diff review caught the first draft refusing). Legs in both apps.
- [x] [Review][Patch][LOW] **P11 — The api's runtime re-check reports inaccurately** [`apps/api/src/modules/auth/shared/sms-step-up-delivery.ts:191-199`; `apps/api/src/deps.ts:319-323`]
  — a cached boot fault is reported on EVERY OTP (MG5: on an expired / re-checked entry); a transient on an expired pass returns the stale pass and
  is never alarmed (MG5: *"a fault or transient … is logged"*); the line says *"the code was still sent"* before the send; `.catch(() => undefined)`
  drops a rejection silently. Fix: report only a freshly computed verdict (including a stale-pass fallback); reword; log the catch by class. Sources: auditor (c) + edge (c) + blind (c).
  ✅ **Resolved 2026-10-17:** the report moved into the memo's `check` (after boot): once per read, a stale-pass transient included, a
  throwing check reported as `transient: check_threw` (the memo never rejects, so the adapter's catch is defensive only); the line names
  the template by its entry, ⛔ by the boot-time id. A leg pins once-per-read and the cached fault's silence.
- [x] [Review][Patch][LOW] **P12 — Alarm and comment text misdirect the operator** [`apps/jobs/src/scheduler/claim-suspicion-notices.ts:~651`; `claim-peer-mesh-requests.ts:744-750`]
  — the suspicion hold alarm says *"the MSG91 template failed its pre-flight"* for `config:sms_preflight_transient` too; peer mesh's P1 comment and
  alarm still say the sweep does ⛔ see template faults (MG5 now lets it). Fix the texts. Sources: blind (b) + auditor (b).
  ✅ **Resolved 2026-10-17:** the suspicion hold alarm names a transient as one (⛔ a leg pins the new wording); peer mesh's P1 comment / alarm say what the sweep now sees and what it still does ⛔ (send-side account faults, a send-time `auth` under a separate read key, a send-time DLT code the pre-flight passed — W10 NARROWED by MG5).
- [x] [Review][Patch][LOW] **P13 — A peer-mesh child keeps pinging after a scope-wide pre-flight transient** [`apps/jobs/src/scheduler/claim-peer-mesh-requests.ts:712-716`]
  — P1 stops only on finals; after `api_unavailable:preflight` every remaining due ping is begun (attempt counted) and re-reads MSG91. Fix: stop
  the loop on it as on a scope-wide final; a leg. Source: edge (b).
  ✅ **Resolved 2026-10-17:** a pre-flight transient in the core STOPS the child's loop (an alarm; the transient count throws for the retry). Live leg "round 2 P13".
- [x] [Review][Patch][LOW] **P14 — AC5 (ii)'s "values rebuild the body" oracle sits inside the fake `send`** [`apps/jobs/tests/claim-correction-send.test.ts:57`, `:452`;
  the peer-mesh / suspicion harnesses] — the core catches a throw from `provider.send`, so on every leg expecting an error a mismatch is swallowed as
  an ordinary provider error. Fix: record mismatches and assert after the call. Source: blind (b).
  ✅ **Resolved 2026-10-17:** the oracle RECORDS a miss inside the fake `send`; an `afterEach` asserts none — in `claim-correction-send.test.ts` and both live harnesses.
- [x] [Review][Patch][MEDIUM] **P15 — Roster Row 32 (b): the PROVEN refusal under MG17 (a) rests on S3, which is unsettled** [`docs/launch-gate-inventory/inventory-roster.md:576`]
  — Debug Log (m)'s own reasoning (an SMS-only key refused a template read proves nothing about its sends) covers a 401 / 200 `status:"error"` too,
  which still refuse api boot and end 6.19b/c/d rows under arm (a); Row 32 (b) also says *"both secret names set"* against an OPTIONAL read key, and
  does ⛔ name W1 (HTTPS) though W1's trigger is credential provisioning. Fix (records): (b) states that arm (a) is used only once S3 is answered in
  writing (else arm (b)), names the secret(s) per arm, and carries W1. Sources: auditor (d) + blind (d).
  ✅ **Resolved 2026-10-17:** roster Row 32 note (6) — (6.1)–(6.3) — dated, ⛔ a word above rewritten (the author's records, ⛔ a decision entry).
- [x] [Review][Patch][MEDIUM] **P16 — ADR-0041 says less than `-345` claims and the code does** [`docs/adr/ADR-0041-sms-gateway-msg91.md:50-65`]
  — `-345` S1 says the default-version marker is *"marked INFERENCE in the ADR"* — the ADR states *"the ACTIVE version's text must equal ours"* as
  fact (AC0 "MET" leans on it); the classification order it states is not the code's (Debug Log (a) / (b), F3); its api "refuses ONLY on" list omits
  the origin refusal and the blank read-key name; its compose line is singular; 6.19b/c/d's fail-open is ⛔ stated. Fix the ADR (proposed, ⛔
  ratified). Families 10. Sources: auditor (d) + edge (d) + blind (d).
  ✅ **Resolved 2026-10-17:** ADR-0041 amended (still `drafted`) with a Changelog row.
- [x] [Review][Patch][MEDIUM] **P17 — The sheet's MSG91 steps would provision what Row 32 (i) forbids, and offer evidence that is ⛔ evidence**
  [`docs/launch-gate-inventory/dlt-template-requests-6-19.md:44-51`; roster Row 32 note (5)] — step (6) reads as every template (Row 32 (i): ⛔
  claim-text id 1–14 until 6-37b is `done`); step (7) offers a CHECKOUT run as Row 32 (e)'s jobs proof — another egress (IP security is on) and,
  off production, the env-fallback key, against T1; *"prints one line per template"* — the CLI prints ONE JSON line, carrying `senderId`. Fix the
  prose. Sources: blind (d) + edge (d) + auditor (d).
  ✅ **Resolved 2026-10-17:** the sheet's steps (6) / (7) (+ the key-arm line before (7)) and Row 32 note (6.3).
- [x] [Review][Patch][LOW] **P18 — Stale or inaccurate records** [this story; `sprint-status.yaml`; `epics.md`] — the story's pinned header still
  reads `in-progress … Next: Task 1` and *"MG1–MG17, PROPOSED"*; round 1's preamble still says *"F1–F4 remain unchecked"*; Debug Log (b) is ⛔
  annotated after F3; Debug Log (c) says *"every claim sweep then HOLDS"* — 6.19b/c/d fail closed per row (T6); F4's *"7 legs"* (9); the AC11 proof
  line's tree; Debug Log (f)'s OTP `values_mismatch` leg is not constructible through the registry — say so; Task 2 names
  `contribution-provider-resolver.test.ts`, unchanged; the 6-37 sprint row comment and the `last_updated` scalar lack the review round trip;
  `epics.md`'s *"⛔ Never a merge fence"* double negation; the routed-nowhere Panel question (*does a PROVEN content mismatch refuse on 6.19b/c/d*)
  gets a carrier on the 6-37b row / Row 32 (i). Sources: blind (d) + edge (d) + auditor (d, c).
  ✅ **Resolved 2026-10-17:** each item corrected in place with a dated / marked note (header, round 1's preamble, Debug Log (b) / (c) / (f), F4's count, AC11's line, Task 2's resolver test) the 6-37 / 6-37b sprint row comments and both ledgers, written with the final status after round 2's ci:local (36/36). `epics.md`'s 6.37 entry now reads *"⛔ A merge fence."* (the roster's form; under the glyph register *"⛔ Never"* is a double negation — the 6.28 / 6.29 / 6.30 / 6.34 entries carry the same phrase and are ⛔ this story's to edit). The Panel question's second carrier is Row 32 note (6.4) — advisory, ⛔ a closure condition.

**Disposition (BigDev, 2026-10-17):** D1 (a), D2 (b) ⇒ `2026-10-17-346` committed ALONE (`da27b82d`); then *"apply every patch"* — P1–P18
applied; the fix diff adversarially reviewed TWICE (fresh context, code + records each): pass 1 — code 5 LOW, records 2 HIGH / 3 MED / 9 LOW;
pass 2 (on BigDev's *"adversarially review the patches applied"*) — code 5 LOW, records 2 HIGH / 5 MED / 5 LOW; every one applied except the
redirect diagnostic (W1's, deferred). The pass-1 HIGH that changed code: P10's identical-OTP-id REFUSAL was a boot refusal `-345` MG5 does ⛔
list ⇒ narrowed to an error log. The pass-2 HIGH that changed scope: P2 narrows three Trustee-ratified texts ⇒ ROUTED to the Panel
(BigDev *"b"*; the note written, ⛔ yet sent; ⛔ blocking — A ships as built). ⭐ **Verification:** channels 408 (the two SMS files 199), jobs
DB-free SMS 139, jobs five live SMS suites 167/167 on `:5433`, api SMS unit 51 (wiring + adapter); `pnpm ci:local` on `:5433` — **36/36 green** on the
final code (twice; the second after pass 2's code fixes). ⛔ Red-on-unfixed was ⛔ re-run for every leg — pass 1's reviewer reasoned it per
leg (P2 / P12 are pins, green on the old code by design). Story and sprint row → `done`.

**Touched invariant families:** (1) covered by construction/test — overloads keep `deferred` from callers without a hook; peer mesh handles both
reasons. (2) covered by test — the memo's shared in-flight read ("N concurrent misses ⇒ ONE call"; AC9 (d) counted live), window / lease
`beforeSend` (AC9 (e)); redelivery idempotency is not constructible (MSG91 has ⛔ idempotency key, F19 — the open at-least-once items). (3) covered
by test — the memo carries ⛔ Pariwar data; a broken `en` template holds ⛔ Hindi Pariwar. (5) covered — no schema change; details persist through the
0155 / 0166 checks; `config:sms_preflight_*` never stored. (6) covered by construction/test — explicit field picks, I6 legs. (9) REAL GAP — P1;
D1's undocumented departures. (10) REAL GAP — P1, P2, P16, P18. (11) REAL GAP — P1 (an undocumented 2xx body refuses a text the policy meaning
promises to send on 6.19b/c/d); every other path matches the one-sentence meaning. (4), (7), (8), (12), (13) untouched.

## Dev Notes

### ⚠ TRAPS

1. **T1 — ⛔ Never call MSG91 from a test, a script or dev.** This story's research sent three Flow / OTP requests to
   `control.msg91.com` with a FAKE authkey (2026-10-17) to establish F9 — a one-off, recorded here so it is ⛔ repeated. ⛔ sandbox exists
   (F19); a real key sends a real, billed text to a real number. AC11's zero-call global-fetch RECORDER enforces it.
2. **T2 — HTTP 200 is ⛔ success** (F9, F15, F16). Every branch reads `type` (Flow / OTP) or `status` / `hasError` (template API).
3. **T3 — `short_url` must be `"0"`** (F13) — MSG91 would otherwise rewrite 6.30's whitelisted link.
4. **T4 — Gate rules (ii) and (iii) read comments** (F21; `scripts/dlt-typed-variables/lib.ts:117-124`). `sms-preflight.ts`, `sms-app.ts`
   and every non-registry `src` file must ⛔ spell the template-id prefix, `DLT_VAR`, or the `{#var#}` marker literal itself. Put the
   substitution helpers in `dlt-variables.ts` (a registry file). (The gate scans `apps/*/src/**` and `packages/*/src/**` only — tests are
   ⛔ scanned.)
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
11. **T11 — `smsType` follows the TEXT, ⛔ the locale** (F11) — every Hindi template AND template 14 (en, the em dash) is UNICODE; the
    pre-flight derives the expected type with `needsUnicode(text)`. A locale rule would HOLD every English peer-mesh run for ever (a
    correct UNICODE template 14 fails it) — or garble the dash (a NORMAL one passes it).
12. **T12 — `311` is a may-have-sent** (F15) — ⛔ map it to `accepted` (no id) or to a transient (a retry inside 10 s is refused; after
    10 s it double-sends). ⚠ 311 is ⛔ on F9's real-time list ⇒ it is very likely unreachable at send; the mapping is defensive.
13. **T13 — A boot refusal is a RESTART LOOP, and staging is production** (F25). `restart: unless-stopped` re-runs the api's boot
    pre-flight on every restart, and a refusal takes down EVERY api route (⛔ only login) ⇒ only a blank authkey, a blank or
    malformed OTP id, or `auth` / `auth_or_not_found` from the SEND key (MG17 (a)) refuse — under MG17 (b) a read-key refusal starts (MG5). Staging boots with `NODE_ENV: production` ⇒ it needs its own authkey / whitelisted egress (MG14 (b)) or it
    will not start once the authkey is set.
14. **T14 — Every fixture template id must become 24-hex** (MG4) — `'TPL-…'` and the api's NAME-echo ids fail the malformed-id check;
    keep the api's NAME→value proof with a per-key map of distinct hex ids. And the placeholder gateway codes (`'INVALID_NUMBER'`,
    `'CARRIER_REJECT'`, `'AUTH_FAILED'`, `'DLT_TEMPLATE_NOT_APPROVED'`, `'RATE_LIMIT'`) are pinned in 38 legs outside `src` (channels 11, jobs 22, api 5)
    (Tasks 2 / 4 / 5 list them) — `git grep` them before declaring the rewrite done ([[feedback_story_validate_footguns]] #31).

### Reuse map

| Need | Reuse | ⛔ Rebuild |
|---|---|---|
| Slot names / types | `DltSlot`, the six registries | a second slot list |
| MSG91 template text | `toGatewayTemplate` (new, in `dlt-variables.ts`) checked against the sheet's column | a hand-written template |
| Number | `normalizeMobile` (`@twt/domain`) | a regex |
| Value formatting | the SAME locals each caller's `render` closes over (`member`, `link`, `date` = `formatAppealUntil(...)` — `suspicion-notice-sms-templates.ts:132`, `reference`) | a second formatter |
| Holds | each sweep's existing gap check + RB12 | a new hold mechanism |
| Scope-wide stop | 6.27c's `isScopeWideSendFault` (unchanged — MG7's classes feed it) | a new stop rule |
| Timeout shape | ADR-0040's `AbortSignal.timeout(STAFF_EMAIL_SEND_TIMEOUT_MS)` (`apps/jobs/src/scheduler/staff-email-client.ts:33, :198`) | a custom timer |
| Provider pre-flight shape | ADR-0040's staff-email pre-flight, once in the sweep (`claim-suspicion-staff-emails.ts:137-146`) — here a process memo, because every send runs in a child and three callers have ⛔ sweep-level hold | a per-row network check |
| Gateway-code scrub | `sanitizeSmsGatewayCode` (`packages/domain/src/claim/suspicion-notice.ts:159`) | a new regex |
| Detail-grammar oracle | `schema.PEER_MESH_REQUEST_DETAIL_PATTERN` (`packages/domain/src/schema/claim_peer_mesh_pings.ts:90`) | a copied regex |
| ADR shape | ADR-0040 + `_adr-template.md` | a new shape |

### Testing standards

Vitest; inject `fetch` (`vi.fn<SmsFetchLike>()`) — ⛔ msw / MockAgent (house pattern, `packages/channels/tests/sms.test.ts:167-250`).
Response fixtures are the DOCUMENTED shapes (cite the URL in a comment); where ⛔ documented shape exists (MG7's numeric codes on a Flow
send), the fixture is labelled SYNTHETIC in a comment. Lockstep tests call the real `t()` and the real registry —
⛔ transcribe a text. Live suites: :5433.

### Project structure notes

- **NEW:** `packages/channels/src/providers/sms-preflight.ts` (+ test); `docs/adr/ADR-0041-sms-gateway-msg91.md`.
- **UPDATE:** `packages/channels/src/providers/sms-app.ts`, `sms-errors.ts`, `sms-dlt.ts`, `packages/channels/src/dlt-variables.ts`,
  `packages/channels/src/index.ts`; `apps/jobs/src/scheduler/claim-dlt-sms-send.ts`, `claim-correction-reminders.ts`,
  `claim-correction-closure.ts`, `claim-certificate-reminders.ts`, `claim-suspicion-notices.ts`, `claim-peer-mesh-requests.ts`,
  `contribution-providers.ts`, `apps/jobs/src/boot.ts` (the memo + MG11 line); `infra/dokploy/compose.yaml` (MG10's secret-name lines); `apps/api/src/deps.ts`, `apps/api/src/config.ts`,
  `apps/api/src/modules/auth/shared/sms-step-up-delivery.ts`; their tests; the sheet's prose; the records (Task 0.4).
- **⛔ Touched:** `provider.ts`, `dispatch.ts`, `cascade.ts`, `render.ts`, `composition/provider-composition.ts` (MG12), any i18n file, any
  registry TEXT, any migration, `apps/mobile`, `apps/admin`.

### Sequencing

6.34 (done) → **6.37** → 6-37b (if MG1 (a)) before any CLAIM-text template id is provisioned (the deferred delivery-report item's
trigger — made roster Row 32 (i), which is what keeps MG15's residual from a real family). Row 30 (b)'s OTP device proof needs 6.37 + Row 32 — ⛔ 6-37b (OTPs feed ⛔ D22). 6-31 (WhatsApp reminder) is independent.

### Previous story intelligence (6.34, 6.27c)

- 6.34 gave every slot its MSG91 name (TV13) and the sheet its MSG91 column — this story CONSUMES them; ⛔ re-derive.
- 6.34's gate went red at birth twice (rule (i) on a sheet line, rule (ii) via `${DLT_VAR}`) — run the gate early (T4).
- 6.27c: P1 stops the child on `config:` / `auth:` / `dlt_template_not_approved:` — MG7 decides whether MSG91's faults land there.
  Its W10 (the sweep can't see `auth` / template faults ⇒ each child spends ONE slot) is NARROWED by MG5 — MG16 (vi) records it
  (residual = a send-side account fault, MG15).
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
- Validate pass (2026-10-17) re-read the same pages: F10 / F11 / F12 / F13 / F17 / F19 / F20 CONFIRMED; F15 / F16 / F18 corrected in
  place. Also: template creation `https://msg91.com/help/template/how-to-create-flow-id-to-send-sms-via-api` ("Mark default"; the DLT /
  MSG91 status pairs); 429 `https://msg91.com/help/all-about-the-429-rate-limit-error`; short URL
  `https://msg91.com/help/url-shortener/how-to-use-and-check-report-of-short-url`.
- **UNVERIFIED:** Flow's unicode auto-detection; max recipients per call; per-code HTTP statuses; whether a Flow send EVER returns a
  synchronous `code`; webhook signing / source IPs; numeric DLR codes for DLT failures; Devanagari / spaces in `#alphanumeric#` (Row 30
  (d)); the DLT FAQ's "1-2 variables" line; any rate limit / timeout guidance; S1 (the default-version marker, the status fields'
  meaning, `template_data`'s stored form); S2 (the `#url#` value cap); S3 (an SMS-only key's template-API access; IP security on it);
  S4 (a read-only balance / key endpoint); whether the panel's shortener toggle overrides `short_url:"0"`.

### References

- `.decision-log.md` — `2026-10-10-314`, `-313`, `2026-10-12-322`, `-323`, `2026-09-27-252`, `2026-10-10-302` RN4, `2026-10-08-295` RB12.
- `_bmad-output/implementation-artifacts/6-34-sms-templates-typed-variables.md` (TV13, F21, TV10, Sequencing);
  `6-27c-peer-mesh-sending-texts-and-links.md` (P1, W10, BF20–BF23); `6-30-app-links-open-the-app-from-a-text.md` (AL15).
- `.decision-log.md` (also) — `2026-10-09-299` RE7, `-301` FOUND (a) (the 6.25 pre-flight hold precedent).
- `infra/dokploy/compose.yaml` (F25); `apps/jobs/src/scheduler/claim-suspicion-staff-emails.ts` (the pre-flight precedent).
- `docs/launch-gate-inventory/inventory-roster.md` Rows 24, 29, 30; `docs/launch-gate-inventory/dlt-template-requests-6-19.md`.
- `docs/adr/ADR-0027…`, `ADR-0028…`, `ADR-0040-staff-email-transport.md`, `_adr-template.md`; `docs/knowledge-transfer/adr-index.md`.
- architecture.md §2.2 (OTP), §3.4 (channels), §3.11 (webhooks — 6-37b), §3.12 (timeouts), §5.9 (secrets).

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (1M context) — `bmad-dev-story 6.37`, 2026-10-17, in the worktree `.claude/worktrees/6-37` (branch
`story/6-37-msg91-sms-gateway-adapter`).

### Debug Log References

Where the build took a reading the MGs did not spell out, or departed from their letter (each tested; none moves an MG's purpose):

- **(a) MG7 — an UNLISTED code falls back to the HTTP status.** MG7 reads *"`unknown`: 311, 407 and every unlisted code"*; taken
  literally, an unknown code on a 429 / 5xx would be a FINAL `unknown` (a spent slot on 6.19b/c/d) where today it is a transient. Built:
  the LISTED codes keep their class whatever the status, 311 / 407 are `unknown` always (`UNKNOWN_CODES`), and an unlisted code is
  `unknown` on a 2xx / other 4xx but `auth` / `rate_limited` / `api_unavailable` on a 401·403 / 429 / 5xx (`sms-errors.ts`; `sms.test.ts`
  "an UNLISTED code …"). The suspicion live RN5 legs that pinned a code-bearing 429 / 503 as transient stay green unchanged.
  ⭐ **Recorded as `2026-10-17-346` decision 2** (review round 2 D1 (a)) — it narrows `-345` MG7, ⛔ an edit of it. ⚠ **Correction
  (dated) to `-346` §0 — `-346` ⛔ edited; the next entry carries it (D1's list):** its effect is TWO-way, ⛔ only "a final becomes a retry": on a 429 / 5xx an unlisted code becomes a transient; on a 401 / 403 it becomes a final
  `auth` (⛔ `unknown`) — which `isScopeWideSendFault` counts, so peer mesh's P1 STOPS the child there (fewer pings — the safe direction).
- **(b) MG6 — the two documented sync messages are read BEFORE the status fallback**, so MSG91's documented HTTP 401 `"Auth Key missing"`
  sample yields `auth:authkey_missing` (AC3), ⛔ `auth:http_401` (same class either way).
  ⚠ **NARROWED by review F3 (`b90a319c`) and round 2 P3:** a code-less 429 / 5xx is classified by its STATUS before the messages (F3),
  and a code-less 401 / 403 is `auth` whatever its message — "Auth Key missing" only names the code (`auth:authkey_missing`), a
  "flow ID … invalid" message on a 401 / 403 is `auth:http_40x` (P3). The messages decide only a 2xx `type:"error"` / other 4xx.
- **(c) MG10 in jobs — a non-bare `SMS_GATEWAY_API_URL` is REFUSED by logging it and leaving the client unconfigured**, ⛔ by failing jobs
  boot (MG11: jobs runs many non-SMS duties; every claim sweep then HOLDS on `config:sms_gateway_unconfigured`). The api refuses at config
  load (`parseSmsGatewayOrigin` in `config.ts`) — its prod boot fails loud, as the old placeholder arm did.
  ⚠ **CORRECTED by review round 2 (P18):** only the suspicion and peer-mesh sweeps HOLD on it; the 6.19b/c/d paths have ⛔ pre-enqueue
  config check (T6), so each of their rows ends `error` (fail closed — the day's slot, or the closure notice for good), as the boot line
  itself says. Round 2 P9 also accepts the same origin written differently (`:443`, an upper-case host) and treats a BLANK value as unset.
- **(d) `preflightWarning` rides EVERY provider-handed final of a fail-open send** (as the helpline flag does), ⛔ only `accepted` — so a
  fail-open send that MSG91 then rejects still alarms the template doubt. ⛔ An outcome change.
- **(e) The memo is keyed by template id AND registered text** — one MSG91 id wrongly held under two keys is judged against each text
  (⛔ a pass for one masking a mismatch for the other). Still at most one read per template per TTL (AC9 (d) counted). ⚠ Review round 2
  P7: the key now also carries the slot NAMES (the `##name##` form depends on them).
- **(f) The OTP adapter runs MG3's check too** (the `otp` value, from the registry slot's name, must rebuild the rendered body) — a
  mismatch throws `StepUpDeliveryError('dlt_template_not_approved')`, ⛔ a send. ⚠ Review round 2: that refusal leg is ⛔ constructible
  through the real registry — the value and the body come from the SAME code and the same registry text, so it can fail only if the
  registry disagreed with itself (which the 6.34 lockstep tests pin) — ⛔ claimed as tested.
- **(g) `readTemplateVersions`** maps HTTP 401 / 403 ⇒ `auth`; any other 4xx (⛔ documented) ⇒ `refused` (⇒ `auth_or_not_found`, a
  definite fault); 429 / 5xx / network / timeout / an unparseable or `data`-less 200 ⇒ `transient`.
  ⚠ **CORRECTED 2026-10-17 by review F2 (`b90a319c`) — the reading above was overbroad:** an undocumented 4xx proves nothing about a
  Flow send, yet it refused api boot and ended 6.19b/c/d rows `auth:preflight`. Now: HTTP 401 ⇒ `auth`; MSG91's 200 `status:"error"` ⇒
  `auth_or_not_found`; every OTHER non-2xx (403 included — (m)) ⇒ `transient` (`unexpected_status`). `-345` MG5's reasons are
  unchanged — it named `auth` for HTTP 401 only; this corrects the build's reading, ⛔ the decision.
- **(h) `SmsLocalRefusal`** (a client-classified failure on `SmsSendError`) also admits `carrier_reject`, so tests can build the SYNTHETIC
  `carrier_reject` MSG91 never answers synchronously (MG7) — the `CARRIER_REJECT → rejected_unreachable` rows became such fixtures.
- **(i) MG17 (b) on the api** — a read-key NAME that resolves blank refuses to start; `resolveSecretValue` already throws on a blank env
  fallback, so the builder's own message is the backstop.
- **(j) The suspicion sweep alarms each pre-flight-held purpose ONCE** (`… notices are HELD this run — config:sms_preflight_<reason>:<key>`)
  beside RB12's end-of-run held alarm, so the reason and key are named (AC9 (a)); peer mesh's held alarm already carries the gap.
- **(l) ⚠ FOUND in self-review — MG3's `value_too_long` meets `-322` C1 on the helpline.** The helpline is a `cbn` slot (maxLength
  14). C1 rules a set-but-malformed helpline SENT and ALARMED; MG3 (as accepted) makes ANY value over its slot's `maxLength` a final
  `dlt_template_not_approved:value_too_long`. A malformed helpline of ≤ 14 characters (`+911800123456`, `1800 123456` — every existing
  leg) is still sent and flagged, unchanged; one of 15+ characters (e.g. `+91 1800 123 456`) is now REFUSED — on 6.19b/c/d that spends
  the day's slot / loses the closure notice, which MG5's own test calls a fail-closed refusal of a possibly deliverable text. Built as
  MG3 says; ⛔ silently narrowed. **Put to BigDev at the review** (keep, or exempt the helpline from the length check so C1 holds).
  ✅ **RESOLVED 2026-10-17 — BigDev: *"14 characters fine, can we just display the warning if entered more than 14 character that max
  14 characters"*.** The 14-character ceiling stays; the HELPLINE slot is exempt from the `value_too_long` refusal (every other slot
  keeps it), so a 15+-character helpline is SENT as set and the existing `helplineNotCallbackNumber` warning fires — its text now says
  *"digits only, at least 3 and at most 14 characters — no '+' or spaces"*. `-322` C1 holds unchanged (`claim-dlt-sms-send.ts`
  `checkedValues`; three legs in `claim-correction-send.test.ts`, red before the fix). ⭐ **Recorded as `2026-10-17-346` decision 1**
  (review round 2 D1 (a)) — it narrows `-345` MG3, ⛔ an edit of it; AC5 is annotated.
- **(m) Review F2 — HTTP 403 on the template read is ⛔ a definite refusal either.** F2 named 404 / 405 / 408; its rule (*"restrict
  definitive refusal to the documented auth/template refusal evidence"*) also covers 403, which MSG91 does ⛔ document for
  `getTemplateVersions` (F16 documents 401) — and S3 is unsettled: an SMS-only key REFUSED template reads (a plausible 403) proves
  nothing about its sends. So 403 ⇒ `transient` too: the api STARTS with an error log, 6.19b/c/d fail open, the holding sweeps hold.
  The SEND path's 401 / 403 ⇒ `auth` (MG6) is unchanged.
- **(n) Review F1 — a timeout after the headers is a may-have-sent retry.** MSG91 may have taken a request whose body never arrived;
  `api_unavailable:timeout` is a transient, so pg-boss retries — the same may-have-sent class an abort BEFORE the headers already was
  (MG9), carried by the open *"At-least-once SMS"* items (closer: row 6-37b). ⛔ A new risk; ⛔ closed.
- **(o) Review round 2 P2 — a suspicion notice whose deceased name exceeds 40 code points ends `value_too_long`.** In `full_name` mode
  `resolveMemberFacingDeceasedName` returns the whole stored name with ⛔ length guard, and MG3 refuses a `member` value over its slot's 40
  after the row is claimed: the once-ever notice is a final `error` `dlt_template_not_approved:value_too_long` + alarm, ⛔ sent. Before
  6.37 the text went out as is — but per F11 (MSG91's docs — ⛔ observed; it counts characters, MG3 counts code points) the DLT cap is
  40 per variable, so it most likely could ⛔ have been delivered either way: this turns a likely-false `accepted` into a true `error`. Built as MG3 says; peer mesh guards the same
  slot BEFORE claiming (`no_target:name_too_long`). Pinned: `claim-suspicion-notices-live.test.ts` "round 2 P2".
  ⚠⚠ **⛔ settled by this story — the Panel gate, read verbatim (review round 2's records review):** the suspicion texts are
  Trustee-ratified promises — `-293` item 1 B, *"ONE TEXT TO THE REFUSED PERSON … 'The claim for [member] could not go ahead. It can be
  appealed until [date]. Please call the helpline.'"*, and `-262` FQ7 B, *"THE SYSTEM TEXTS THE NOMINEE ON RECORD AT THE DEATH … 'A claim
  for [member] could not go ahead. Please call the helpline.'"*. A refusal for a long name NARROWS both (the person is ⛔ texted) — this
  entry's first draft used the wrong test (*"suspicion is ⛔ one of `-322` §0's reserved paths"* — `-322` is an author-commit). Whether
  the refusal changes anything in fact turns on the OPEN question `-322` C7 (d) / Row 30 (d) already asks (the unit DLT's 40 counts — a
  Devanagari name of 41+ code points may be ≤ 40 characters), and a fallback (e.g. the shielded form, `-181`) would change what is
  DISCLOSED. ⇒ recorded and carried, ⛔ decided here. ⭐ **ROUTED (BigDev, 2026-10-17: *"b"*):** `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-17-6-37-name-too-long-for-the-text.md` — options A (no text, as
  built) / B (the shielded form only when the full name does ⛔ fit — our reading) / C (cut) / D (staff phone); its E4 commands run, ⛔
  empty. ⚠ WRITTEN, ⛔ yet SENT — ⛔ "shown to the Panel" until it goes out. Blocks ⛔ nothing: A ships as built.
- **(p) Review round 2 D2 — the 60 s transient cache can mask a recovery for up to 60 s.** ⚠ **Correction (dated) to `-346` §0 — `-346`
  ⛔ edited; the next entry carries it (D1's list):** `-346`'s §0 says decision 3 *"changes ⛔ outcome on any path"*; strictly, inside the
  window it can: an outage ends and MSG91 now answers a PROVEN `auth*` with the send key ⇒ for up to
  60 s 6.19b/c/d still SEND with `api_unavailable:preflight` (recorded `accepted` under F9) where the row would have ended `auth:preflight`;
  and a holding sweep may hold on a transient cached up to 60 s after MSG91 recovered. The 6.19b/c/d case sits inside MG15's accepted
  residual (*"a fault behind a fail-open send"*) — the same masking the 1 h pass cache already does; the holding case is a DELAY of up
  to 60 s (the safe direction MG5 already accepts for holds) — so ⛔ a code change; recorded, ⛔ hidden.
  (pg-boss's first child retry lands at 60–120 s, so a retried child does ⛔ meet its own cached transient, clock skew aside.)
- **(k)** `@twt/channels` imports `claim.sanitizeSmsGatewayCode` and `encryption.normalizeMobile` from `@twt/domain` (already a dependency;
  `audit.ts` imports the same namespaces) — ⛔ a second regex (MG8, I6).

### Completion Notes List

- Ultimate context engine analysis completed — comprehensive developer guide created (`bmad-create-story 6.37`, 2026-10-17; four
  parallel research passes: the SMS seam, the governance records, MSG91's live docs, the house format + 6.34 / 6.27c learnings).
- **Task 1** — `substituteDltValues` (function-form `replaceAll`, ⛔ re-scan; throws on a name / count mismatch), `toGatewayTemplate`
  (`##name##` by default) and `needsUnicode` (GSM 03.38 default + extension) in `dlt-variables.ts`; the sheet test proves
  `toGatewayTemplate` = the sheet's MSG91 column = `msg91Form` for all sixteen rows, and `needsUnicode` = the sheet's notes (every `hi`
  and 14 `en`).
- **Task 2** — `sms-app.ts` is the MSG91 Flow client: `{apiOrigin, authkey}`, `POST /api/v5/flow` with `authkey`, ONE recipient
  `{mobiles: 91…, <name>: value}`, `short_url: "0"`, ⛔ text / sender / `realTimeResponse` / `CRQID`; acceptance needs `type:"success"` and a
  ≤ 64-alphanumeric request id; local refusals (`template_id_malformed`, `no_named_values`, `values_mismatch`, `invalid_number:format`
  via `normalizeMobile`); a 9 s abort created synchronously from an injectable `timeoutSignal`; `readTemplateVersions`. `sms-errors.ts`
  carries MG7's table (classes frozen — I5) and scrubs every code with `sanitizeSmsGatewayCode`. A value-less provider refuses
  `no_named_values` (MG12; two legs inverted).
- **Task 3** — `sms-preflight.ts`: `checkMsg91Template` (the active version; canonical content; the TEXT's `sms_type`; `DLT_ID`;
  `auth` / `auth_or_not_found` / malformed / transient; `sms_type_unicode_for_gsm7` a logged note) and `createMsg91PreflightMemo` (pass
  1 h, fault 5 min, transient uncached (⚠ since review round 2 / `-346`: 60 s), a stale pass for ONE more TTL on an expired re-check, concurrent misses share one read).
- **Task 4** — the jobs core sends NAMED values after MG3's synchronous check, refuses a malformed id before the memo, and reads ONE
  process memo built in `boot.ts`: proven (`auth*` from the send key) ⇒ `auth:preflight` final on every caller; unproven / transient ⇒
  final / transient on the holding children, SENT with an alarmed `preflightWarning` on 6.19b/c/d; `beforeSend` (MG16 (i)) with
  overloads. Suspicion's `purposeConfigGap` and peer mesh's `pariwarConfig` HOLD on any pre-flight non-pass (⛔ `globalConfigGap`).
  Jobs config: MSG91 origin default, authkey, optional read key (MG17), the MG11 boot line. `compose.yaml` gains the two secret-name
  lines on api and jobs. Every fixture id is 24 hex; the placeholder codes are MSG91's (SYNTHETIC); new live legs for AC9 (a) / (a2) /
  (b) / (b2) / (c) / (d) / (e) — the peer-mesh ones mutation-checked red without the hold / `beforeSend`.
- **Task 5** — the OTP adapter sends the code as the named value `otp` (MG3 check), `templateId`; the api config is MSG91's (origin
  validated; `SMS_GATEWAY_API_URL_PLACEHOLDER` and the sender settings retired); `buildMemberStepUpDelivery` refuses on a blank / malformed
  id or authkey and on `auth*` from the send key, STARTS with an error log on everything else, re-checks advisorily off the request path,
  and takes an injectable fetch.
- **Task 6** — the I2 diff is EMPTY (`provider` / `dispatch` / `cascade` / `render` / `provider-composition`); `channels-determinism`
  3/3; `dlt-typed-variables` test 25/25 and check green; the sheet gains the MSG91 setup steps (prose).
- **Task 7** — the AC11 recorder test (`apps/jobs/tests/msg91-no-network.test.ts`: the real client + memo through the core, and a 6.19b
  fail-open leg whose pre-flight transport fails — the global fetch saw ZERO calls; the api wiring test runs every arm under the same
  recorder); the deferred-work dispositions (MG16 (i) ✅ Closed by — as prescribed; (ii) / (iii) ⛔ addressed; MG8 PARTLY addressed;
  W10 NARROWED; the three 6-37b hand-offs annotated at Task 0.4) and the NEW alarm-only / fail-open item.
- **The proof (AC11):** `pnpm ci:local` with `DATABASE_URL` at :5433 — **36/36 green** (2026-10-17, on the Task 7 tree; 1.7's run is in
  its row; review round 1 (1.6) ran none; round 2's run is in 1.8's row); every live
  suite also run alone on :5433 during the build (jobs five SMS suites 144 → with the new legs; api SMS 49 unit + 3 integration).
- ✅ Resolved review finding [HIGH]: **F1** — an abort while the response body is read keeps `api_unavailable:timeout` (jobs ⇒ a
  transient retry, ⛔ a spent slot; OTP ⇒ `api_unavailable`); a broken 2xx body ⇒ `api_unavailable:body_read`; invalid JSON unchanged.
- ✅ Resolved review finding [HIGH]: **F2** — an unexplained template-read non-2xx (404 / 405 / 408 / 403 …) is a transient, ⛔
  `auth_or_not_found`: 6.19b/c/d fail open, the holding sweeps hold, the api starts; only HTTP 401 and MSG91's 200 `status:"error"` are
  definite. Debug Log (g) corrected, (m) added.
- ✅ Resolved review finding [MEDIUM]: **F3** — a code-less 429 / 5xx keeps its transient status over a recognised message; the 401
  `"Auth Key missing"` token kept.
- ✅ Resolved review finding [MEDIUM]: **F4** — the read-only jobs OTP pre-flight proof (`sms:preflight` over `buildSmsGatewayClients`),
  recorded as Row 32 (e)'s initial jobs evidence (Row 32 note (5); the sheet's MSG91 step (7)); Row 32 (i) untouched.
- ⚠ Owed outside the code (⛔ a merge fence): roster Row 32 (a)–(i) — ADR-0041's ratification, the authkey / IP whitelisting (staging
  too — T13), each template in MSG91 per the sheet's new steps, S1 / S2 in writing, counsel, an alarm to a named person, and 6-37b before
  any claim-text id. Row 30 (b)'s device proof now also waits on Row 32.

### File List

- `.decision-log.md` (Task 0.3 — `2026-10-17-345`; code review round 2 — `2026-10-17-346`, `da27b82d`)
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-17-6-37-name-too-long-for-the-text.md` (NEW — code review round 2, P2)
- `_bmad-output/implementation-artifacts/6-37-msg91-sms-gateway-adapter.md`
- `_bmad-output/implementation-artifacts/deferred-work.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/planning-artifacts/epics.md`
- `apps/api/src/config.ts`
- `apps/api/src/deps.ts`
- `apps/api/src/modules/auth/shared/sms-step-up-delivery.ts`
- `apps/api/tests/integration/sms-step-up-delivery.spec.ts`
- `apps/api/tests/unit/member-step-up-delivery-wiring.test.ts`
- `apps/api/tests/unit/sms-composition.test.ts`
- `apps/api/tests/unit/sms-step-up-delivery.test.ts`
- `apps/jobs/package.json` (review F4 — the `sms:preflight` script)
- `apps/jobs/src/boot.ts`
- `apps/jobs/src/scheduler/claim-certificate-reminders.ts`
- `apps/jobs/src/scheduler/claim-correction-closure.ts`
- `apps/jobs/src/scheduler/claim-correction-reminders.ts`
- `apps/jobs/src/scheduler/claim-dlt-sms-send.ts`
- `apps/jobs/src/scheduler/claim-peer-mesh-requests.ts`
- `apps/jobs/src/scheduler/claim-suspicion-notices.ts`
- `apps/jobs/src/scheduler/contribution-providers.ts`
- `apps/jobs/src/sms-otp-preflight.ts` (NEW — review F4)
- `apps/jobs/src/sms-otp-preflight-cli.ts` (NEW — review F4)
- `apps/jobs/tests/claim-certificate-reminders-live.test.ts`
- `apps/jobs/tests/claim-correction-closure-live.test.ts`
- `apps/jobs/tests/claim-correction-reminders-live.test.ts`
- `apps/jobs/tests/claim-correction-send.test.ts`
- `apps/jobs/tests/claim-peer-mesh-requests-live.test.ts`
- `apps/jobs/tests/claim-suspicion-notices-live.test.ts`
- `apps/jobs/tests/contribution-providers.test.ts`
- `apps/jobs/tests/dlt-template-sheet.test.ts`
- `apps/jobs/tests/msg91-no-network.test.ts` (NEW)
- `apps/jobs/tests/msg91-real-client-caller.test.ts` (NEW — review F1–F3)
- `apps/jobs/tests/sms-otp-preflight.test.ts` (NEW — review F4)
- `docs/adr/ADR-0041-sms-gateway-msg91.md` (NEW — Task 0.4)
- `docs/knowledge-transfer/adr-index.md`
- `docs/launch-gate-inventory/dlt-template-requests-6-19.md`
- `docs/launch-gate-inventory/inventory-roster.md`
- `infra/dokploy/compose.yaml`
- `packages/channels/src/dlt-variables.ts`
- `packages/channels/src/index.ts`
- `packages/channels/src/providers/sms-app.ts`
- `packages/channels/src/providers/sms-dlt.ts`
- `packages/channels/src/providers/sms-errors.ts`
- `packages/channels/src/providers/sms-preflight.ts` (NEW)
- `packages/channels/tests/dlt-variables.test.ts`
- `packages/channels/tests/provider-composition.test.ts`
- `packages/channels/tests/sms-preflight.test.ts` (NEW)
- `packages/channels/tests/sms.test.ts`

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-10-17 | 1.0 | Created by `bmad-create-story 6.37` at `466e9b0e` (worktree `.claude/worktrees/6-37`). F1–F24 found; MG1–MG16 PROPOSED (⏳ Task 0.2); ⭐ F9 — MSG91 answers `success` to a fake authkey — drives MG5's pre-flight and MG15's reading of `-252` cl.1. Status `ready-for-dev`, buildable after Task 0. |
| 2026-10-17 | 1.1 | `bmad-create-story validate 6.37` at `466e9b0e` (== `origin/main`; ⛔ code moved since the pin). Four fresh-context read-only verifiers (code claims; governance / records / ids; end-to-end design; MSG91 docs — docs pages ONLY). ⭐ Applied: **MG5 rebuilt** — the "per-run memo" could ⛔ reach the core (every send is a pg-boss child; AC9 (d) was unsatisfiable) ⇒ one process memo with pass / fault TTLs, ⛔ transient cached; `sms_type` from the TEXT (template 14 en is Unicode — a locale rule held every English peer-mesh run for ever); the peer-mesh check moved to `pariwarConfig`; 6.19b/c/d FAIL OPEN on a transient (a fail-closed refusal is `-322` §0's Panel option); the api refuses to start only on auth / malformed (F25: a refusal is a restart loop of EVERY route). **I4 and the Policy meaning were false** on three paths (a pre-flight fault spends that day's slot / the closure notice for good) — rewritten; the Policy meaning now names the D22 input it makes truthful. **MG16 (i) was false** (the pre-flight is an await inside the core after peer mesh's window / lease checks) ⇒ ADDRESSED by the item's own prescription, `beforeSend`. **MG15 split** — MATCHES for faults the pre-flight sees; the pre-flight reads TEMPLATES, ⛔ the account's ability to send ⇒ residual WIDER than `-323` R2, fenced by the new Row 32 (i) (6-37b before any claim-text id). **Supersessions named** (`-302` RN4 + FOUND (c), `-295` RB12's edge, `-314` decision 2 in part) — Task 0.3 had called them additions. **New:** MG17 (which key the pre-flight uses); S1–S4 Task 0.1 STOPs (default-version marker / `template_data` form; the `#url#` value cap vs the 55-char link; an SMS-only key's template access; a balance endpoint); F25 (Dokploy restart loop, staging = production, ⛔ SMS lines in compose, alarms reach logs only); Row 32 legs (g) counsel, (h) alarm to a named person, (i), owner = Panel; T13 / T14; every test the edits turn red named in Tasks 2 / 4 / 5 (24-hex fixture ids; 38 placeholder-code pins; two inverted value-less legs; `contribution-providers.test.ts`). **Corrected:** MG8 "Closed by" → partly addressed (item stays open); F10 (6.34 Debug Log (c) only RAISED `template_id`); F15 (the sync messages are SendOTP samples; `code` is a string; 101 / 209 / 210 / 407 / 602 / 429 added to MG7); F16 (the body's `data[]`; type-tolerant fields; per-version sender / DLT id); F18 (5 retries); F22 (0151); F3's cite; I2's proof (`channels-determinism` hashes render only ⇒ an empty `git diff`); T4 (rule (ii)); MG9 9 s client bound (deterministic under the OTP's 10 s); `$&` substitution legs; `sanitizeSmsGatewayCode` on the raw-detail tables; the reuse map's non-existent "peer-mesh name rule" formatter. Every MG still PROPOSED. |
| 2026-10-17 | 1.1 (round 2) | Fresh-context re-validate of the v1.1 edits — 1 HIGH, all the pass's own: v1.1 ended 6.19b/c/d rows on reasons it called "proof of non-delivery" while its own api section called them UNVERIFIED (S1) — `-322` §0's fail-closed option (a) ⇒ now only a malformed id, or the send key's own refusal under MG17 (a), ends a row there; `content_mismatch` / `dlt_id_missing` / `sms_type_needs_unicode` are alarmed and sent until S1 + Row 32 (e) (a new deferred item), and whether a PROVEN content mismatch should refuse there is recorded as the Panel's, ⛔ routed. Also: MG15's `accepted` definition + residual cover fail-open and within-TTL faults; `sms_type` split into a fault (`_needs_unicode`) and a logged note (`_unicode_for_gsm7`); `beforeSend` → `defer_window` / `defer_lease` + an overload keeping `deferred` out of the four other callers (the union is `final \| transient`); AC11's no-network proof is a zero-call RECORDER (a throwing stub is swallowed by the fail-open / start-on-transport rules) and the api builder takes an injectable fetch; the api memo is advisory at runtime, off the request path; the 9 s signal created synchronously from an injectable `timeoutSignal`; three new STOP / MG17 lines that `⛔` had inverted, and one this pass caught in I4 (`⛔ PERMANENTLY loses` ⇒ "loses for good"); cites — `sanitizeSmsGatewayCode` `:159`, CR8 `:590-591`, the closure `complete()` call `:389` / `correction-closure-jobs.ts:317`, the hold precedent `-299` RE7 / `-301` FOUND (a) (⛔ `-300`); `LOCALES_OF` (one or two locales) and suspicion's `configSet`; Task 4's AC8 (c) tag; MG17 (b)'s secret wired in Tasks 4 / 5 / AC8; T14's count 38; Row 32's owners in Row 24's shape. |
| 2026-10-17 | 1.1 (round 3) | Fresh-context re-validate of round 2 — 2 HIGH, both round 2's own (an edit applied to the ACs but ⛔ swept to Task 4 / MG5's core paragraph / MG15): Task 4 still said every pre-flight FAULT ends the row (AC9 (b) said fail open) ⇒ the core takes `preflightFailOpen`, set by `sendClaimCorrectionSms`, and the summary line follows; MG15 claimed MATCH on 6.19b/c/d for faults that now fail open there ⇒ split by path (D22's input: PROVEN faults only), mirrored in the §0 header and the Policy meaning. Also: an MG17 (b) read-key refusal STARTS the api (AC8 (a), AC9 (b)); "becomes blocking" is a LATER change via Task 7's deferred item, ⛔ an automatic switch; the memo's transient fallback was unreachable (a call happens only on a miss) ⇒ a stale PASS for one more TTL on an expired re-check; the holding sweeps' hold on UNPROVEN reasons stated with its cost (`-322` §0 reserves only 6.19b/c/d); T1 cites AC11's recorder; Task 7 writes the recorder test; detail codes disambiguated (malformed ⇒ `template_id_malformed`, `auth*` ⇒ `auth:preflight`); `beforeSend`'s lease defer uses the counted branch; Row 32 (f) is BigDev's. Glyph scan: 140 added `⛔`, ⛔ inversion. |
| 2026-10-17 | 1.1 (round 4) | Fresh-context consistency sweep — ⛔ HIGH (4 MED, 7 LOW), all applied: the fail-open warning had ⛔ sink (the core never alarms — `claim-dlt-sms-send.ts:9`) ⇒ `preflightWarning` on `accepted`, alarmed by each 6.19b/c/d caller; Task 4's unscoped "TRANSIENT ⇒ proceed" would send on the holding children ⇒ proceed only when `preflightFailOpen`, else `transient`; MG15's `accepted` definition + residual name the stale-pass extension; T13 carries MG17 (a) and the blank-secret arms; MG17 (b) `auth*` is unproven in the core; S1 no longer implies settling it makes the api check blocking; "BigDev may route it" removed (⛔ routed, everywhere); the Story statement no longer claims an ACCOUNT fault is stopped; the Policy meaning's MG17 (a) qualifier; AC9 (a2) / (b2) legs; the memo field declared on `ClaimCorrectionReminderDeps` too. Rounds: 1 HIGH → 2 HIGH → 0 HIGH (all HIGHs the pass's own). |
| 2026-10-17 | 1.2 | Task 0.1–0.3: BigDev answered MG1–MG17 *"accept all recommended"* (incl. MG5's TTLs 1 h / 5 min, X1, X2); S1–S4 dispositions recorded (the author's — ⛔ settled by the docs: S1 alarm-only api content check, S2 a Row 32 (d) leg ⛔ a STOP, S3 both MG17 arms built with an OPTIONAL read key, S4 MG15 stands); author-commit `2026-10-17-345` committed ALONE as `48017867`. Next: Task 0.4 (the records), then code. |
| 2026-10-17 | 1.3 | Task 0.4 — the records: ADR-0041 (`drafted`) + adr-index; `epics.md` Story 6.37; roster Row 32 + Row 30 note (6); deferred-work annotations (three items → row 6-37b); sprint row 6-37b `backlog`; row 6-37 → `in-progress`. AC0 met. Status `in-progress`. |
| 2026-10-17 | 1.4 | `bmad-dev-story 6.37` — Tasks 1–7 built on the story branch (commits `c7591218` → Task 7): the vocabulary helpers, the MSG91 Flow client + MG7 code table, the pre-flight + process memo, the send core's named values / malformed id / memo / `beforeSend` and the holds (suspicion, peer mesh) vs fail-open (6.19b/c/d), the OTP path and api boot pre-flight, the sheet's MSG91 steps, the AC11 recorder test, the deferred-work dispositions + one new item. Debug Log (a)–(l) records the readings; (l) — MG3's `value_too_long` vs `-322` C1 on a 15+-character helpline — was put to BigDev. `ci:local` 36/36 on :5433. Status `review`. |
| 2026-10-17 | 1.5 | Debug Log (l) resolved by BigDev (*"14 characters fine … just display the warning"*): the helpline is exempt from MG3's `value_too_long` refusal — a 15+-character one is SENT with the helpline warning, which now names the 14-character limit; `-322` C1 holds. Tests red → green; jobs unit 674 + the five SMS live suites 165 on :5433; gate green. Status stays `review`. |
| 2026-10-17 | 1.6 | Full `bmad-code-review` of `466e9b0e..4c03aed1`, all three layers returned: F1–F4 (2 HIGH, 2 MEDIUM) recorded as unchecked patches; W1 pre-existing HTTP-origin risk deferred; 2 additional candidates dismissed. BigDev chose option 2 — leave as action items. No application code changed. Review verification: 415 focused unit tests and 165 live jobs tests on :5433 passed; injected-fetch reproductions; full `ci:local` not re-run. Story and sprint row → `in-progress`. |
| 2026-10-17 | 1.7 | Addressed code review findings — 4 items resolved (F1, F2 HIGH; F3, F4 MEDIUM) in `b90a319c`: F1 a body-read abort ⇒ `api_unavailable:timeout` (a broken 2xx body ⇒ `body_read`); F2 only MSG91's documented template-read refusals are definite — every other non-2xx, 403 included, is a transient (Debug Log (g) corrected, (m)); F3 a code-less 429 / 5xx keeps its status over a recognised message; F4 the read-only jobs OTP pre-flight proof `sms:preflight` (Row 32 note (5), the sheet's MSG91 step (7)). Each new leg red on the unfixed client. W1 stays deferred. `ci:local` 36/36 on :5433. Status `review`. |
| 2026-10-17 | 1.8 | Code review ROUND 2 — the whole branch (`466e9b0e..171e2040`), 4 chunks × 3 layers (12 reviewers, all returned): 2 decisions + 18 patches, 29 dismissed. BigDev: D1 (a), D2 (b) ⇒ `2026-10-17-346` (alone, `da27b82d`; narrows `-345` MG3 / MG5 / MG7; its Status's "decisions 2 and 3 precede their code" corrected in the story, ⛔ edited); *"apply every patch"*: P1 only MSG91's documented 200 `status:"error"` refuses; P2 the long-name suspicion refusal recorded (Debug Log (o)) and — after the second fix-diff pass found it narrows Trustee-ratified texts — ROUTED (BigDev *"b"*; the routing note written, ⛔ yet sent); P3 blank code / 401·403 before messages; P4 every active version; P5 the transient's cause, a config fault ⛔ `auth`, the jobs read key gated on a configured gateway; P6 ⛔ redirects; P7 the memo key's slot names; P8 a real NFC leg; P9 structural origin (blank ⇒ default); P10 an equal read key is the send key, one id under both OTP keys an error log (⛔ a refusal — MG5's list); P11 the api reports once per read; P12 alarm / comment text; P13 peer mesh stops on a pre-flight transient; P14 the oracle recorded + asserted; P15–P18 records (Row 32 note (6.1)–(6.4), ADR-0041 amended, the sheet, stale records; Debug Log (o), (p) added); a 60 s transient TTL (`-346` decision 3). Fix diff adversarially reviewed twice (fresh context). `ci:local` 36/36 on `:5433` (on the final code). Story and sprint row → done (ledger 2026-10-17i). |
| 2026-10-18 | 1.8a | Annotation only: the name-too-long routing note this story's review wrote was RULED by the Panel — option B (`2026-10-18-359`): the shorter name form when the full name does not fit; built by the NEW row `6-37e-suspicion-text-short-name-fallback` (this story's option A stands until then). ADR-0041 RATIFIED (`2026-10-18-358`; roster Row 32 (a) met). Nothing else changed. |
