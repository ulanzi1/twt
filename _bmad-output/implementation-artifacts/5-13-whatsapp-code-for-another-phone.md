---
baseline_commit: bac71abb
---

<!--
PINNED: bac71abb (`main` = `origin/main`, 2026-10-21 — Story 5.10 landed by fast-forward, PR #294; its ledger `2026-10-21q`).
Branch `story/5-13-whatsapp-code-for-another-phone`, cut from the pin in the MAIN checkout (ListAgents at creation: ⛔ other session
running — [[feedback_shared_tree_branch_switch]]; re-check before every commit — [[feedback_concurrent_review_agents_mutate_tree]]).
Two facts, kept apart (footgun #24): the pin is an ancestor of HEAD (durable); the CODE claims below were derived at bac71abb
(perishable). Re-check before Task 1: `git fetch origin && git diff --name-only bac71abb..origin/main -- packages apps scripts docs/adr docs/launch-gate-inventory`.

STATUS: in-progress (v1.5 — created 2026-10-21 by `bmad-create-story 5.13`, checklist pass applied (3 H / 9 M / 10 L); first
`bmad-create-story validate` 2026-10-21 (four fresh-context verifiers, 43 findings, ALL applied — Change Log v1.2; fresh-context re-validates of that rewrite, all applied — v1.3, v1.4, v1.5; the fourth found 0 HIGH); WC1–WC17 PROPOSED for
BigDev at Task 0.2). Code claims re-derived at bac71abb on 2026-10-21 (`git diff --name-only bac71abb..HEAD` = this file + the ledger).

START CONDITION — MET at the pin: Decision `2026-10-21-374` (Trustee-ratified) rules the code IN; row `5-10-signup-whatsapp-opt-in-checkbox`
is `done` and ON `main` (the signup step, its sent stage and `OtherPhoneHint` exist — this story replaces what the signup link shows);
row `5-12-whatsapp-yes-lasts-until-withdrawn` is `done` (the lock, the one-ACTIVE index, a yes with ⛔ clock). Nothing else is a precondition.

NUMBERS (footguns #19 / #42(e); `-366` decision 6 — a number belongs to the first COMMIT that takes it, on any branch): at the pin `main`
holds migrations to 0177, decisions to `-375`, roster Rows to 38. This file names NO number that is not yet TAKEN: the author-commit is
"the next free decision id at Task 0.3"; the migration is "the next free migration number at Task 1"; the roster row (WC13) is named by
its KEY `wa-opt-in-code-template-approved`. Re-grep `main`, every branch and every worktree at each commit.

§0 GATE (`trustee-panel-routing-note-TEMPLATE.md`). The governance question — may the Trust send a WhatsApp code to a member not yet
switched on, and switch WhatsApp on when it is typed back — was the PANEL's and is RULED: `-374`, option A, verbatim *"by DR and KB /
option A, one code per request and one retry."* The option as put: *"Allow the code. Only after the member ticks the box and taps
"WhatsApp on another phone?"; one code per request, to the registered number only; WhatsApp is switched on when the code is typed back in
the app."* `-374` supersedes IN PART ADR-0029's *"ACTIVE only by a matched inbound WhatsApp message"* and, for this ONE message, §3.4's
dual gate and *"Scope: Meta UTILITY templates only"*. Everything this story decides beyond that is the AUTHOR's — stripped of citations
each WC reads "the server/app should do X": how the code is made, stored, counted, checked, recorded and shown.
Seven readings this story acts on, stated, ⛔ hidden ([[feedback_panel_gate_read_ratified_verbatim]]):
  (1) "one retry" = at most TWO codes per request AND two entry attempts per code — BigDev's reading in session (*"Both"*), recorded in
      `-374` as ⛔ separately ratified; `-374` itself, verbatim: *"This widens the option as put (*"once, at their request"*; *"one code
      per request"*) to at most two codes per request"*. ⚠ *"once, at their request"* is the ACCEPTED COST line — the widening goes past
      the cost the Panel accepted, ⛔ only past the option. WIDENS the option as put; matches the Panel's added "one retry" only under
      BigDev's ⛔ separately ratified reading — WC11 (a) tells the Panel the reading as built (a told item — ⛔ a question).
  (2) "a request" = one PENDING opt-in (`-374` reading (i), the author's: *"one tick of the signup box and its "WhatsApp on another
      phone?" tap (one PENDING request)"*) — a later PENDING starts afresh. MATCHES (i)'s parenthetical; NARROWS its "one tick" wording
      (the mint RE-USES a PENDING for 48 h, F1 — a re-tick inside it is the same request, with the same two codes).
  (3) "to the registered number only" — the server sends ONLY to the member identity's decrypted mobile, never a number from the client
      (`-374` reading (ii)). MATCH.
  (4) "Only after the member ticks the box and taps "WhatsApp on another phone?"" — the code is offered ONLY on the SIGNUP step, after the
      tick's PENDING exists (WC6 (a)); the "WhatsApp notifications" screen keeps 5.10's phrase hint. `-374` reading (iii), verbatim:
      *"is row 5-13's create-story to decide — ⛔ assumed either way"* — so the choice is this story's, and WC6 (a) takes the narrower
      side. The grounds are the question as put (*"while signing up"*) and ADR-0029's unsuperseded re-opt-in sentence (reading (6)) — ⛔
      "that screen has no box" (`-375` d7: its enable control *"already makes the very request the box makes"*). NARROWS-OR-MATCHES.
      ⚠ Limit: the server cannot see WHICH screen asked. WC17 (a) gives it a stand-in it CAN see — the member's lifecycle state (a
      member at the signup step is `pending-kyc` / `pending-fee`; 5.10 F7) — so a member past signup is refused at the server too.
  (5) Architecture §2.2: *"WhatsApp is not an authentication channel in v1 — identity (SMS) and communication (WhatsApp) remain separated"*
      and *"fallback options (voice OTP only — no WhatsApp)"* (ratification ⛔ confirmed for either: `-374` "Not covered" names the "voice
      OTP" sentence; ⛔ ratification of the "not an authentication channel" sentence was found in `docs/adr` or the decision log). The code is ⛔ a login or
      identity check: the member is ALREADY signed in by SMS OTP; the code proves only that the registered number has WhatsApp, and it
      switches on ONLY WhatsApp messages — it never opens a session, never satisfies a step-up, and lives in its OWN store (I4). Read as
      MATCHING §2.2's separation; it uses Meta's AUTHENTICATION template category because Meta requires that category for any code
      (F21) — a Meta label, ⛔ a TWT authentication channel.
  (6) ADR-0029 Rationale (ratified, `-065` item 4) also reads *"Re-opt-in after revoke requires a NEW inbound message (a new PENDING +
      phrase) — no inferred re-consent."* `-374` superseded, in ADR-0029, ONLY *"ACTIVE only by a matched inbound WhatsApp message"* (and,
      outside it, §3.4's dual gate and UTILITY scope for this one message) and says *"The rest
      of ADR-0029, §3.4 and `-364` stands"* (its following list — switch, user-initiated opt-in, a lasting yes, STOP, the user-sent
      message — does ⛔ name the re-opt-in sentence; the inference rests on "The rest … stands") ⇒ a code for a member who has EVER had a yes ended (a REVOKED or BLOCKED_BY_META row) would
      WIDEN an unsuperseded ratified sentence. WC15 (a) refuses it (NARROWS — the author's); WC15 (b) is the Panel's.
  (7) `-364` condition 3, *"STOP always works"*, and Meta's policy quoted there (*"You must respect all requests (either on or off
      WhatsApp) by a person to block, discontinue, or otherwise opt out"* — a FOUND provider rule) speak of ending a YES. A STOP from a
      member with only a PENDING has no yes to end (the worker writes nothing, F6). The code is the first Trust message that can draw
      such a STOP. The ratified text is SILENT on it ⇒ WC12 chooses, and WC11 (a) tells the Panel what was chosen — ⛔ "MATCH".
NOT covered by `-374` and ⛔ decided here unless named: counsel's view (the cost line *"Counsel has not been asked"* was ACCEPTED — ⛔ a
go-live leg, ⛔ backfilled); Meta's approval and price (WC13 legs); the unbuilt *"surfaced for member confirmation"* half of §3.4's mismatch
rule (⛔ built here — its `deferred-work.md` trigger FIRED with this ruling; Task 0.4 annotates it). The consent record for a
code-confirmed yes IS this story's (`-374` "Not covered": *"what `recordConsent` stores — row 5-13's"*) — WC5.

GLYPH REGISTER: `⛔` negates the word it precedes; `⭐` emphasis / action / recommended; `⚠` a hazard. NO `file:NNN` into
`.decision-log.md`, `deferred-work.md` or `sprint-status.yaml` (newest-first files) — cite the decision id + clause, the item's phrase,
or the row key. Line numbers into CODE files are as of the pin; re-grep the symbol if a line moved.

LETTERS: F = found facts (at the pin) · WC = build decisions (PROPOSED; answered by BigDev at Task 0.2) · I = invariants · T = traps ·
S = Task 0.1 STOP conditions.
-->

# Story 5.13: A WhatsApp Code for a Member Whose WhatsApp Is on Another Phone — Sent Only When They Ask, at Most Twice, and Typed Back in the App to Switch WhatsApp On `[SURFACE]`

Status: in-progress

> **WHAT THIS STORY IS, IN ONE PARAGRAPH.** Story 5.10 built an unticked *"Send me WhatsApp messages from TWT"* box on its own signup
> step. A tick mints a PENDING request and opens WhatsApp with a short phrase to send to TWT; the member's own message, from their
> REGISTERED number, switches WhatsApp on. A member signing up on a phone that does not hold their WhatsApp (a relative's phone, a second
> phone) cannot do that — the message goes from the wrong number and matches nothing. Today the signup step's collapsed *"WhatsApp on
> another phone?"* link shows the Pariwar's number and the phrase to type from the other phone. The Trustee Panel ruled (`-374`) that the
> Trust may instead send ONE WhatsApp code to the registered number — and one more if asked — and switch WhatsApp on when it is typed back.
> This story builds that: on the signup step, the link opens *"Send me a code on WhatsApp"*; the server sends a 6-digit code (a Meta
> AUTHENTICATION template) to the member's registered number; the member reads it on the phone that holds their WhatsApp and types it in;
> a correct code writes the SAME consent row and ACTIVE row the worker's phrase match writes. Two codes per request, two tries per code.
> Whenever the code route is closed (not set up for the Pariwar, both codes spent, a send fails) the link falls back to 5.10's number +
> phrase. Signup never waits on any of it.
>
> **Day-one output: none** — every Pariwar's WhatsApp is off, no Pariwar has an authentication template, and nothing is in production
> ([[project_not_in_production_merge_is_not_golive]]). Until a Pariwar's code route is provisioned (complete config + a resolvable
> template name — WC13 (a)), the mint answers `codeAvailable: false` and the signup step renders exactly as today — the same link, on
> the same `sent` stage, showing 5.10's number + phrase (WC4, WC7, AC1) — ⛔ a code offer that always fails.
>
> **What already ships and this story REUSES (rebuild none of it):**
> - The mint, status and revoke routes (`apps/api/src/modules/wa-opt-in/handlers.ts`) and their member-session guard; the PENDING row
>   (`member_wa_opt_in`), `lockMemberWaYes`, the one-ACTIVE index (0177), `recordConsent`, `activateOptIn` (F1–F5).
> - The OTP primitives `generateOtp` / `hashOtp` / `timingSafeHashCompare` (`apps/api/src/modules/auth/shared/otp.ts:14,19,30`) and the
>   step-up SMS adapter's registered-mobile read (`sms-step-up-delivery.ts:177-184`: `waOptIn.getMemberMobileCiphertext` + `decryptMobile`) (F8, F9).
> - The Meta client `createWhatsappAppCache` / `WhatsappMessagingHandle` (`packages/channels/src/providers/whatsapp-app.ts`) and the
>   direct-send classifier `classifyDirectWaSendFailure` (`whatsapp-direct-send-outcome.ts`) (F11, F12).
> - The template-name key family `waTemplateConfigKey` (`apps/jobs/src/scheduler/wa-template-config-key.ts`) (F13).
> - The signup step `apps/mobile/app/(signup)/whatsapp.tsx`, `OtherPhoneHint`, `lib/with-timeout.ts`, the announce wrappers (F15–F17).
>
> **What it CHANGES:** a NEW hand-authored migration (the code table, its CHECKs, its guard trigger, a column-limited UPDATE grant); a
> NEW `packages/domain/src/wa-opt-in/code.ts`; `write.ts`'s `activateOptIn` input (`windowExpiresAt: Date | null` — WC5; its sha pin
> re-taken); `audit.ts` (one new originating-channel value); `whatsapp-app.ts` (an authentication-template message shape);
> `waTemplateConfigKey` + `TEMPLATE_NAME_FORM` moved to `packages/channels` (WC4); two NEW API routes + contracts + OpenAPI + api-client
> methods; the mint's response gains `codeAvailable` / `codesRemaining` / `liveCode` / `liveCodeDelivery` (WC4 — a `.strict()` contract change); a shared
> `WaOptInCodeErrorDetails` contract; the API deps (a WhatsApp code transport); the signup step's link (a NEW
> `OtherPhoneCodeHint`, a NEW `useWaCode` hook + `WaCodeEntry`, `OtherPhoneDetails` extracted from `OtherPhoneHint`); en + hi
> `common.json` (`waCode.*`); tests; the records.
>
> **What it READS and leaves alone:** the jobs worker (`apps/jobs/src/wa-webhook-processor.ts` — the phrase route, STOP, 131050, the
> expiry sweep, all unchanged under WC12 (a)), `resolveWaTarget`, the dispatcher and its ladder, `pariwar_wa_templates`, `member_auth_otps` and
> the auth OTP service, the "WhatsApp notifications" screen (`(settings)/notifications.tsx` — WC6 (a)), the payment lock-in gate.

## Story

As a **new member signing up on a phone that does not have my WhatsApp**,
I want **to ask TWT to send a code to my registered number on WhatsApp, read it on my own phone and type it in here**,
so that **I can switch WhatsApp messages on in the same sitting, the familiar way, without typing a message to a number from my other
phone — and still carry on with signup if it does not work**.

## The rulings and records this story builds on

| Source | Key (verbatim, abridged) | Status |
|---|---|---|
| `2026-10-21-374` | *"by DR and KB / option A, one code per request and one retry."* Option A as put: *"Allow the code. Only after the member ticks the box and taps "WhatsApp on another phone?"; one code per request, to the registered number only; WhatsApp is switched on when the code is typed back in the app."* Cost accepted: *"The Trust sends a WhatsApp message to someone not yet switched on (once, at their request). Meta charges for each code. A new message type needs Meta's approval. More to build (row 5-13). Counsel has not been asked."* BigDev's reading of the retry: *"Both"* (≤2 codes per request, 2 entry attempts per code) — ⛔ separately ratified. Readings (i)–(iv) the author's. Consequence 1: *"a Meta authentication template, a send outside the dispatcher to a not-yet-ACTIVE member, code storage with at most two sends per request and two entry attempts per code, a new route to ACTIVE that writes the same consent row and ACTIVE row as the worker's match (under 5.12's lock and one-ACTIVE index), and the swap of what Story 5.10's signup-step link shows."* | ⭐ TRUSTEE-RATIFIED (option A); the readings and Consequences are the entry's framing |
| ADR-0029 Rationale + changelog row 2026-10-21 *(ratified — amended)* | *"User-initiated ONLY (AR-16). A PENDING is minted only by the member tapping the toggle; ACTIVE only by a matched inbound WhatsApp message. Re-opt-in after revoke requires a NEW inbound message (a new PENDING + phrase) — no inferred re-consent."* — amended in ONE sentence only (`-374`'s supersession names that one sentence); its changelog row `2026-10-21 (ratified — amended)` reads *"a second route to ACTIVE beside the matched inbound message, and the one kind of message sent to a member not yet ACTIVE"*; `-374`: *"The rest of ADR-0029, §3.4 and `-364` stands"* ⇒ the re-opt-in sentence STANDS (§0 reading (6), WC15) | ⭐ TRUSTEE-RATIFIED (`-065` item 4), amended in part (`-374`) |
| `-364` condition 3 | *"STOP always works"*, with Meta's *"You must respect all requests (either on or off WhatsApp) by a person to block, discontinue, or otherwise opt out"* | ⭐ TRUSTEE-RATIFIED; silent on a STOP with no yes to end — §0 reading (7), WC12 |
| Architecture §3.4, channels | *"WhatsApp Business (Meta Cloud API) — dual-gated: fires only when both (a) per-Pariwar admin toggle ON (FR-72) and (b) per-member opt-in ACTIVE … Scope: Meta UTILITY templates only"* + the dated `-374` note: *"the one kind of message the dual gate admits to a member not yet ACTIVE"* | ⭐ TRUSTEE-RATIFIED — the instrument: `-065` item 4 itself names only ADR-0029; `-364` / `-374` record §3.4 as *"ratified … by `-065` (ADR-0029 and architecture §3.4)"*, and the routing note as *"ratified with ADR-0029 by `-065`"*; gate (a) still applies to the code (I1) |
| Architecture §3.4, origination | *"WA opt-in state may only transition to ACTIVE via a user-initiated interaction (the user-sent WhatsApp message above) or an explicit affirmative consent capture in-app (recorded with timestamp + the UI context). Passive defaults, pre-checked boxes, bundled consent, or inference from other settings are not valid opt-in origins."* | ⭐ TRUSTEE-RATIFIED (as above) — the code route records timestamp + UI context (WC5, WC17) |
| Architecture §2.2 | *"WhatsApp is not an authentication channel in v1 — identity (SMS) and communication (WhatsApp) remain separated."*; *"OTP-mechanism security floor. Regardless of delivery channel … per-channel rate limiting, per-OTP revocability, audit-log emission per send + per attempt + per consume, SIM-swap detection with helpdesk-mediated fallback (never silent re-issue), and distinct OTP pools per intent class"*; *"fallback options (voice OTP only — no WhatsApp)"*; Discipline: *"rate-limited per device, per member, and per IP — separate budgets for cost protection and abuse protection"* | architecture — `-374` "Not covered" names the "voice OTP" sentence; ⛔ ratification found for the other three. Read in §0 (5). The floor is APPLIED with stated exceptions: SIM-swap (⛔ an identity check here); audit — a refusal decided before the wrapper writes ⛔ line (`not_pending`, `already_active`, `channel_unavailable`, `code_limit_reached`, `code_resend_too_soon`, `code_unavailable`, WC15/WC17 refusals) and an `accepted` / `may_have_sent` / `refused` outcome is carried by the slot's `code_sent` line, ⛔ a line of its own (WC9); rate limits — per member + per IP + the DB caps, ⛔ per device, ⛔ global cost cap (WC10) |
| Architecture §2.11 | *"OTP send: per-phone-number max N attempts / 15-min window + global cap to detect bulk attacks"* | architecture (an auth-OTP section — read as guidance, ⛔ binding on a WhatsApp switch-on code); per-number is met (the registered number only, ≤ 2 codes per PENDING); the global cap is a stated residual (WC10) |
| `2026-10-21-375` d12 (5.10 SB12) | the signup link reveals the number + phrase now; *"The WhatsApp CODE is row 5-13's"* | author-commit (5.10) — BUILT |
| `2026-10-21-373` d1 | one ACTIVE row per member; *"the mint refuses while any ACTIVE row exists"* | author-commit (5.12) — BUILT (0177) |
| `-370` / `-371` / `-372` d1 | the claimant WhatsApp cap counts the sends Meta MAY have acted on; *"A `rate_limited:*` (429 …), `api_unavailable:000` … do ⛔ count"*; `-371` d2: *"A finished `accepted` / `may_have_sent` / `rejected_recipient` / `refused` row ends the follow-up's sends"* | author-commit (6.37d) — the precedent WC3 DEPARTS from in two ways, stated there (claim sends only; ⛔ binding here) |
| Meta, authentication templates + opt-in policy (fetched 2026-10-21) | *"If your mobile app offers users the option to receive one-time passwords or verification codes via WhatsApp… you must use an authentication template."*; preset body *"<code> is your verification code."*; copy-code button; *"URLs, media, and emojis are not supported"*; *"authentication messages are only delivered to a user's primary WhatsApp device"*; business policy: opt-in is the business's to determine | provider policy — FOUND ([[feedback_provider_policy_is_found_not_counsel]]) |
| Counsel's view | NOT RECORDED — and `-374` accepted *"Counsel has not been asked"* as a cost | accepted by the ruling — ⛔ a leg here, ⛔ backfilled ([[feedback_record_unattested_no_backfill]]) |

## ⭐ THE INVARIANTS

- **I1 — Only on the member's request, for an open request, at signup, for a first yes.** A code is sent ONLY by `POST
  /api/v1/member/wa-opt-in/code` from the signed-in member, ONLY while that member has a PENDING opt-in, their Pariwar's WhatsApp is
  enabled, they are still in a pre-payment signup state (WC17) and they have ⛔ REVOKED / BLOCKED_BY_META row (WC15); the app offers it ONLY
  behind the signup step's *"WhatsApp on another phone?"* link after the tick (WC6, WC7). Nothing sends a code on its own. *Proof:* AC2, AC1.
- **I2 — The registered number only.** The code goes to the member identity's decrypted mobile; ⛔ request field names a number. *Proof:* AC2.
- **I3 — At most two codes per request, two tries per code — the DATABASE's rule.** Counted sends per PENDING ≤ 2, attempts per code
  ≤ 2, a counted send never becoming uncounted, a used or spent code never usable, and a counter never going down are CHECK /
  partial-unique / guard-trigger constraints, ⛔ only application checks ([[feedback_mechanization_split_commitment]]). *Proof:* AC3, AC4.
- **I4 — A code switches on WhatsApp and nothing else.** Its own table, its own routes; it never creates a session, never satisfies a
  step-up, never touches `member_auth_otps` (§2.2's *"distinct OTP pools per intent class"*). *Proof:* AC6.
- **I5 — The same yes.** A correct code writes the same `whatsapp_opt_in` consent row and the same PENDING → ACTIVE transition as the
  worker's phrase match, in ONE transaction under `lockMemberWaYes`, audit-first — so STOP, the in-app withdraw, 131050, the 6.31
  reminder and the alert rung treat it exactly like any other yes. *Proof:* AC4, AC5.
- **I6 — Never a dead end, never a false offer.** A Pariwar whose code route is not provisioned shows 5.10's hint unchanged (no code
  offer) — unless the member already holds a live code (`liveCode`, e.g. the template or token stopped resolving after it was sent, or both codes are spent), when the field
  stays so that code can still be typed; every failure after an offer (send refused, both codes spent, a hang) still shows the 5.10 number + phrase and lets the member
  continue signup. *Proof:* AC1, AC8, AC9, AC13.
- **I7 — The code is never written down in clear.** Only its hash is stored; the code is in ⛔ log line, audit line, error detail or
  response. *Proof:* AC6.

## 📜 Policy meaning (AI-10-1)

**5.13 introduces NO predicate that gates a member's access to a benefit, and changes none.** Its new conditions decide whether TWT may
SEND a code (an open request, WhatsApp enabled, fewer than two codes, still signing up, ⛔ a yes ended before) and whether a typed code
switches on a convenience channel; nothing reads them to decide a payment, a pool, a claim, a warning or a member state, and a member who
never finishes still gets everything in the app. In the member's terms: *"while you are signing up, if your WhatsApp is on another phone,
you can ask TWT to send a code to your registered number on WhatsApp — at most twice — and typing it in here turns WhatsApp messages on;
if it does not work, or if you switched WhatsApp messages off before, you can send the message from that phone instead, or carry on
without WhatsApp."* Checked against the Niyamavali (2026-10-21, `docs/legal/niyamavali.md` — the private corpus copy in the main
checkout, gitignored): compatible — its only WhatsApp clause is R10(B), *"convenience mirrors only"*; ⛔ clause governs OTPs or how a
channel preference is confirmed.

## ⭐ FOUND FACTS (at bac71abb — re-run each at Task 0.1)

**The opt-in substrate**

- **F1 — The mint** (`apps/api/src/modules/wa-opt-in/handlers.ts:141-223`): `getWaConfig` → 409 `wa_opt_in.channel_unavailable` unless
  `enabled` + a display number; `lockMemberWaYes`; 409 `wa_opt_in.already_active`; a PENDING is RE-USED (no audit); else
  `getMemberMobileBlindIndex` (409 `wa_opt_in.no_mobile`) and `audit.withCompensatingAudit(deps.servicePool, { auditIntent:
  optInAuditIntent({ action: 'member.wa_opt_in_requested', originatingChannel: 'member_app', … }), mutate: createPendingOptIn })`.
  `optInAuditIntent` (`:111-137`) builds resourceLocator `pariwar/<p>/member/<m>/wa-opt-in` and the payload hash
  `waOptIn.waOptInAuditPayloadHash({originatingChannel, memberId, verificationPhrase, beforeState, afterState})`. Handler tx shape:
  `openScopeTx` / `let ok=false; try {…; ok=true} finally { closeScopeTx(scopeTx, ok) }` (`:146-222`).
- **F2 — Routes** (`routes.ts:36-59`): POST/GET/DELETE `/api/v1/member/wa-opt-in`, each `preHandler: [memberSession]` only, ⛔ body
  schema, ⛔ `config.rateLimit` (the global per-IP ceiling only — `plugins/rate-limit/index.ts:120-137`). Per-member route limit precedent:
  `contributions/personal-event-routes.ts:35-55` (`{ max: deps.config.writeRateMax, timeWindow: '1 minute', keyGenerator: perMemberKey,
  hook: 'preHandler' }` — `hook: 'preHandler'` so the actor id exists; [[project_rate_limit_prehandler_hook_order]]). ⛔ member-STATE guard
  on the mint (5.10 F7) ⇒ a `pending-fee` member at the signup step can mint and, here, ask for a code.
- **F3 — The PENDING row** (`packages/domain/src/schema/member_wa_opt_in.ts:55-103`): `opt_in_id` PK, `pariwar_id`, `member_id`, `state`
  (PENDING | ACTIVE | REVOKED | BLOCKED_BY_META | EXPIRED_24H_WINDOW, append-only enum), `verification_phrase`, `mobile_blind_index`,
  `window_expires_at` (nullable), `consent_id` (nullable), `matched_at`, timestamps. Partial uniques: one PENDING per member, one PENDING
  phrase per Pariwar, one ACTIVE per member (`member_wa_opt_in_active_member_uq`, 0177). RLS ENABLE+FORCE, tenant policies; `GRANT SELECT,
  INSERT, UPDATE … TO twt_app`. A PENDING lives 48 h, then the jobs sweep moves it to `EXPIRED_24H_WINDOW` (`DEFAULT_PENDING_TTL_SECONDS`,
  `apps/jobs/src/wa-webhook-processor.ts:54`; `runWaOptInExpirySweep` `:639-685` — ⚠ `revokeOptIn` takes ⛔ `lockMemberWaYes`, deferred-work
  5.12 W2/W3).
- **F4 — `activateOptIn`** (`packages/domain/src/wa-opt-in/write.ts:176-226`): takes `{pariwarId, optInId, windowExpiresAt: Date,
  consentId, matchedAt?}`; selects the owner, takes `lockMemberWaYes` (reentrant, `:61-64`), `UPDATE … SET state='ACTIVE', window_expires_at,
  consent_id, matched_at … WHERE … state='PENDING'`; 0 rows → 404 / `WaOptInStateError` (409). Its own JSDoc (`:180-183`): `windowExpiresAt`
  is *"Meta's 24h free-form (customer-service) window end … ⛔ the opt-in's end: since Story 5.12 … ⛔ thing gates on this column"*. The
  column is nullable; the INPUT type is not. A code confirm opens ⛔ customer-service window (no inbound message) ⇒ WC5.
- **F5 — The worker's activation** (`wa-webhook-processor.ts:403-452`), the shape the code route mirrors: `consentId = randomUUID()`; audit
  `member.wa_opt_in_activated` (`originatingChannel: 'meta_webhook_inbound'`, PENDING → ACTIVE) committed FIRST; then ONE tx:
  `lockMemberWaYes` → `consent.recordConsent(tx, {pariwarId, subjectId: memberId, consentType: 'whatsapp_opt_in', grantedViaActor:
  'member_self', consentPayload: {source: 'meta_webhook_inbound'}, auditId, consentId})` (`RecordConsentInput`,
  `packages/domain/src/consent/write.ts:41-68` — `pariwarId` and `subjectId` REQUIRED; `ConsentPayload` has an index signature, so extra
  payload keys are accepted) → `activateOptIn(tx, {…, windowExpiresAt: now()+24h, consentId})`; on failure
  `member.wa_opt_in_activated_rolled_back`. (The worker uses a local `writeAuditEntry` wrapper; apps/jobs is ⛔ in the access-wrapper
  invariants' roots — the API module IS, F18.)
- **F5b — Precedents for the code table's guards.** 0176 (`0176_claim-contact-wa-send-cap.sql`) is ⛔ a partial unique: it is `CHECK
  (send_count 0..2)` PLUS a replaced BEFORE UPDATE guard `claim_contact_wa_sends_guard()` (`:20-21`) that freezes a finished row and
  enforces "never decreases". 0172 grants a COLUMN-LIMITED `UPDATE (…)` to `twt_app` (`0172_claim-contact-whatsapp-step.sql:124-127`,
  *"⚠ LOCKSTEP with the trigger's `send_cols` / `status_cols`"*). Migrations are hand-authored (`migrations/meta` snapshots stop at 0020;
  0176's header: *"⛔ never regenerate … the migrator skips by the journal `when`"*); 0177's journal `when` is `1794800400021`.
- **F6 — What else reads a yes:** `isOptInActive` = `state='ACTIVE'` (`read.ts:145-158`); 6.31's reminder = `isOptInActive` AND
  `consentExists` (`read.ts:168-171`) ⇒ a code-confirmed yes MUST carry both rows (I5); `resolveWaTarget` (`packages/domain/src/notifications/
  delivery.ts:116-149`) = enabled AND `isOptInActive` ⇒ ⛔ usable for a PENDING member's code — read the mobile directly (F8). STOP →
  `endEveryWaYes` (ACTIVE → REVOKED + every open consent) regardless of route; 131050 → BLOCKED_BY_META on the ACTIVE row
  (`wa-webhook-processor.ts:145,510-523`). A STOP from a member with only a PENDING ends nothing and writes nothing (`endMemberWaYes` →
  `hasAnythingToEnd` false → `'nothing_to_end'`, `wa-webhook-processor.ts:570-574`; `read.ts:207-222`) — WC12. There is ⛔ member path that
  ends a PENDING: DELETE on a PENDING-only member answers 409 (`planWithdrawal` → `hasAnythingToEnd`), and the mint RE-USES it — so a
  PENDING's two codes cannot be reset by withdraw-and-re-ask; only the 48 h lapse starts a new request.
- **F7 — The mismatch rule is half built** (pre-existing): an inbound message matching no PENDING is only `console.warn`ed — ratified §3.4's
  *"surfaced for member confirmation"* is ⛔ built; `deferred-work.md` (section *"Deferred from: validate of 5-10-…"*) gives as its trigger
  *"row `5-13-whatsapp-code-for-another-phone`'s ruling, or the first production WhatsApp opt-in"* — the ruling has FIRED it. `-374` does
  ⛔ cover it and this story does ⛔ build it (Task 0.4 annotates the item, ⛔ closes it — [[feedback_closure_language_precision]]).
- **F8 — The registered mobile, server-side:** `waOptIn.getMemberMobileCiphertext(db, {pariwarId, memberId})` (`read.ts:122-137`) →
  `decryptMobile` (Tier-1 KMS envelope, `packages/domain/src/encryption/member-fields.ts:158-162`) → canonical `+91XXXXXXXXXX`. Precedent:
  the step-up SMS adapter (`apps/api/src/modules/auth/shared/sms-step-up-delivery.ts:177-184`, using the BYPASSRLS `serviceDb`; the
  read filters by Pariwar, so tenant RLS also works). Each decrypt fires ONE KMS audit line (`kms.auditHook('decryptDek')` →
  `createKmsAuditHook(servicePool)`, `apps/api/src/deps.ts:470`) — one per send ATTEMPT (a released retry decrypts again), bounded by the
  route limit; ⛔ a bulk path ([[project_kms_audit_per_hmac_global_lock]]). Decrypt OUTSIDE tx 1's lock window (KMS is a network call —
  T3). Meta's `to` = E.164 without `+`.

**One-time-code infrastructure (reused as PRIMITIVES, ⛔ as a table)**

- **F9 — Primitives** (`apps/api/src/modules/auth/shared/otp.ts`): `generateOtp()` = `randomInt(0, 10**6)` padded to 6 digits (`:14`);
  `hashOtp(code)` = SHA-256 of the trimmed code (`:19`, *"Only the HASH is ever persisted"*); `OTP_MAX_ATTEMPTS = 5` (`:24` — a constant;
  ⛔ 2); `timingSafeHashCompare(a, b)` (`:30`). ⚠ An unpeppered SHA-256 of a 6-digit code is reversible offline from a DB copy — the house
  posture for every OTP; acceptable here because a code is worth one WhatsApp switch-on, lives 10 minutes and gets 2 tries (stated, ⛔ fixed).
- **F10 — `member_auth_otps`** (`packages/domain/src/schema/member_auth_otps.ts:40-77`): intents `login | step_up | data_export_delivery`,
  keyed by mobile blind index, invalidate-on-next per (mobile, intent), attempts capped at the constant 5, ⛔ link to an opt-in request,
  ⛔ send counter, a GLOBAL `using true` RLS carve-out. Reusing it needs a new intent (enum `ADD VALUE`, the 0104 precedent), a per-call cap
  and a request link — and edits the auth module (WC2).

**WhatsApp sending**

- **F11 — The Meta client** (`packages/channels/src/providers/whatsapp-app.ts`): `WhatsappMessagingHandle.send(message, { timeoutMs })` →
  the wamid, or throws `WhatsappSendError(message, metaCode, httpStatus, transport?)` (`:114-131`; `transport: 'connect'` for a connection
  that never opened — `WHATSAPP_PRE_CONNECT_CODES` `:147`). `buildRequestBody` (`:197-214`) emits ONLY a body component —
  `WhatsappTemplateMessage` (`:61-71`) is `bodyParam` (dispatcher) | `bodyParams` (direct, 1–3) — ⛔ button. A Meta authentication template
  with a copy-code button needs `{type:'button', sub_type:'url', index:'0', parameters:[{type:'text', text: <code>}]}` beside the body
  parameter (F21) ⇒ a new message shape (WC1). `createWhatsappAppCache(fetchImpl = globalFetch, options: WhatsappAppCacheOptions = {})`
  (`:239`; `options.timeoutSignal?: (ms) => AbortSignal`, `:240`, `:328-329`) builds one client per Pariwar via `messagingFor(pariwarId,
  {phoneNumberId, accessToken, graphApiVersion})` (first build only — a rotation needs a restart, `:22-26`). ⚠ `messagingFor` →
  `assertClientConfig` throws a PLAIN `Error` on a blank token, phone-number id or `graph_api_version` (`:181-191`, `:247`) — which the classifier reads as
  `may_have_sent` (F12) ⇒ it must be called OUTSIDE the classified send (WC1). ⚠ A scripted fetch rejection is `transport: 'network'`; the
  `'timeout'` path needs the abort from `timeoutSignal` (the jobs precedent injects it, `claim-contact-ladder-whatsapp-live.test.ts:140`).
  `whatsapp-app.ts` is ⛔ sha-pinned; it IS under the access-wrapper invariants (`packages/channels/src` ∈ `CHANNEL_ROOTS`, F18).
- **F12 — Direct-send classification** (`packages/channels/src/providers/whatsapp-direct-send-outcome.ts:74-115`,
  `classifyDirectWaSendFailure`) — IN CODE ORDER (the first rule that matches wins — footgun #51): `WhatsappTemplateParamError` →
  `unknown_scope:param_invalid`; a non-`WhatsappSendError` throw → `may_have_sent`; `transport:'connect'` → `transient:'api_unavailable:000'`;
  status 0 → `may_have_sent`; `httpStatus < 0` → `may_have_sent:unknown` (`:94`); a 2xx without a wamid → `may_have_sent`; 502/504 →
  `may_have_sent:gateway_5xx`; scope codes `{131048, 131031, 131042, 131045, 131057, 133010, 368}` / 132xxx / 401/403 / an auth-class
  `metaCode` (`AUTH_CODES`, defined `whatsapp-errors.ts:30`, used `:46`; `:101-102`) → `scope`; `{131026, 131021}` → `recipient`; 429 / `{130429, 131056, 80007}` →
  `transient:rate_limited:<code>`; other 5xx → `transient:api_unavailable:<status>`; else `unknown_scope`. ⚠ So a 131048 arriving on a 429 is
  `scope`, ⛔ `rate_limited`. ⚠ The file is sha-PINNED (F14) — import it, ⛔ edit it. The 6.37d cap (`-371`) counts `api_unavailable:<5xx>`
  other than `:000`, and ⛔ `rate_limited:*` / `:000` — the WC3 precedent.
- **F13 — Template names for direct sends** live in Secret-Manager config keys, ⛔ `pariwar_wa_templates`: `waTemplateConfigKey(purpose,
  locale, pariwarId)` → `wa.template.<purpose>.<en|hi>.<pariwarid>` (`apps/jobs/src/scheduler/wa-template-config-key.ts:15-20`; its header:
  *"ONE builder for a KEY FAMILY"*, *"a direct sender's template lives here"*; ⚠ *"A dotted name is `INVALID_ARGUMENT` in GCP Secret Manager"*
  — UNVERIFIED, deferred-work). `pariwar_wa_templates` keys on ALERT categories with a CHECK, its schema file is sha-PINNED, and ⛔ column
  records Meta's category. The template-name form is ONE regex, `TEMPLATE_NAME_FORM = /^[a-z0-9_]{1,512}$/`
  (`apps/jobs/src/scheduler/claim-peer-mesh-wa-reminders.ts:166`, imported by 6.37d `claim-contact-ladder-whatsapp.ts:56` and by `apps/jobs/tests/claim-contact-wa-templates.test.ts:19`). The key
  builder's importers: `claim-contact-ladder-whatsapp.ts:58` (also `type WaTemplatePurpose`), `claim-peer-mesh-wa-reminders.ts:65`,
  `apps/jobs/tests/peer-mesh-wa-templates.test.ts:19`, `apps/jobs/tests/claim-contact-wa-templates.test.ts:20`. Both apps already depend on
  `@twt/channels` (which depends only on contracts + domain) ⇒ moving it makes ⛔ turbo cycle. In apps/api the resolver is
  `resolveChannelSecret` (already on AppDeps, `context.ts:710`; wired `deps.ts:474-478`, `:632` — Secret Manager in production, an env
  fallback from the name otherwise; dev/test THROWS when the env fallback is unset, `packages/domain/src/secrets.ts:116-131`); it THROWS
  on not-found AND on an outage alike (unlike jobs' `resolveSmsDltConfig`, which returns `null` for not-provisioned). ⚠ Each Secret
  Manager read builds a NEW client with a 10 s timeout (`secrets.ts:64,69`) — three sequential reads can take 30 s. ⚠ The integration
  `_setup.ts:467-468` DEFAULTS `resolveChannelSecret` to `` `test-secret::${name}` `` for ANY name: it never throws, and its value FAILS
  `TEMPLATE_NAME_FORM` ⇒ every spec that does ⛔ override it sees `codeAvailable: false` (WC1's test seam names the override).
- **F14 — The 6.37d fence** (`apps/jobs/tests/claim-contact-ladder-whatsapp.test.ts`): `PINS` (`:153-170`) sha256-pins, among others,
  `packages/domain/src/wa-opt-in/write.ts`, `read.ts`, `packages/channels/src/providers/whatsapp-direct-send-outcome.ts`,
  `dispatch.ts`, `cascade.ts`, `composition/provider-composition.ts`, `schema/pariwar_wa_templates.ts`. Editing a pinned file fails it until
  the pin is RE-TAKEN with a dated comment (5.12 re-took `write.ts` / `read.ts` the same way — `:162-165`). `apps/jobs/tests/
  claim-peer-mesh-wa-reminders.test.ts:130-134` requires exactly ONE `createWhatsappAppCache(` in `apps/jobs/src` — apps/api is ⛔ in its
  scope, so an API-side cache does ⛔ trip it. ⛔ CI gate routes WhatsApp sends through the dispatcher or fences WhatsApp in apps/api.
- **F15 — ⛔ WhatsApp send exists in apps/api today**; the two direct senders (6.31, 6.37d) run in apps/jobs as swept jobs, send 09:00–20:00
  IST only, and record each send in their own table (`claim_peer_mesh_wa_reminders`, `claim_contact_wa_sends` — the latter with `send_count`
  CHECK ≤ 2, migration 0176). The nearest IN-REQUEST precedent is 5.9's step-up SMS: a direct send, one attempt, a classified
  `StepUpDeliveryError` on any non-accept, the code never logged (`sms-step-up-delivery.ts`; wired `deps.ts:319-430`). Delivery-status
  webhooks write `whatsapp_send_status` by wamid (`wa-webhook-processor.ts:463-526`); only 6.37d correlates to its own rows. ⚠ "Not on
  WhatsApp" (131026) usually arrives LATER on that status webhook, ⛔ in the send response — the repo already treats it as a status code
  (`WA_BLOCK_ERROR_CODES`, `wa-webhook-processor.ts:135`; *"131026 (not reachable on WhatsApp)"*, `:141`), and Meta: errors are *"returned
  either synchronously … asynchronously via Webhook, or sometimes through both"*. So a synchronous `recipient` refusal is the RARE case.

**The app**

- **F16 — The signup step** (`apps/mobile/app/(signup)/whatsapp.tsx`, 346 lines): stages `loading | ask | sent`; `minted:
  CreateWaOptInResponse | null` holds the mint (`:62,123`); one mint per visit (`attempted` ref); `actionVersion` invalidates late results on
  blur (`:76,118-119`; `onReopen` also bumps it); `goNext` → `router.replace('/(signup)/payment')` (`:78-82`); a failed `Linking.openURL`
  sets `error='link'` and STAYS on `ask` with the PENDING already minted (`:126-131`); the `sent` stage renders `<OtherPhoneHint
  displayPhoneNumber={minted?.displayPhoneNumber ?? null} verificationPhrase={minted?.verificationPhrase ?? null} />` (`:275-278`);
  `OtherPhoneHint.tsx:9` names it as what 5.13 replaces. ⇒ When `openURL` REJECTS (rare — the deep link is `https://wa.me/…`,
  `handlers.ts:39`, which usually opens a browser and RESOLVES even with ⛔ WhatsApp, 5.10 F8c), the member stays on `ask` and today never
  sees the link (WC7).
- **F17 — `OtherPhoneHint`** (`apps/mobile/components/notifications/OtherPhoneHint.tsx`, 63 lines): `null` unless both values are non-null
  (`:25`); a chromeless `Button` (`wa-other-phone-link`, `accessibilityState={{ expanded }}`) toggling `wa-other-phone-details`: `desc`, the
  `Number:` label, the selectable number (`wa-other-phone-number`), the `Message:` label, the selectable phrase (`wa-other-phone-phrase`),
  `note`. Used by the signup `sent` stage AND `notifications.tsx:292` (PENDING). Settings' tests pin those testIDs.
- **F18 — Gates the API module trips** (`scripts/access-wrapper-invariants/check.ts:69-77`, `CHANNEL_ROOTS` ∋ `apps/api/src/modules/wa-opt-in`,
  `packages/channels/src`): invariant (f) scans ONLY functions that call `createHmac`, a name matching `/^resolve.*Secret/i`
  (receiver ignored — `lib.ts:204`, `:229-234`), an approved comparator INCLUDING `timingSafeHashCompare` (`lib.ts:188`), a `verify*Signature` helper,
  or hold a verify-header literal (`isVerificationContext`, `scripts/access-wrapper-invariants/lib.ts:256-273`); INSIDE such a function every `===` / `!==` / `==` /
  `!=` / `.includes` / `.startsWith` / `.localeCompare` between two runtime values FAILS (`unsafeCompareNode`, `lib.ts:~336-356`; exempt:
  literals, `null`/`undefined`, `.length`, const-literals — ⛔ an array-literal receiver such as `['hi','en'].includes(x)`) ⇒
  `resolveCodeDelivery` and the verify handler BOTH become verification contexts (T5). Conversely a `hashOtp(code) === row.codeHash` in a
  function that calls ⛔ comparator would be GREEN, and `packages/domain/src/wa-opt-in/` is ⛔ in `CHANNEL_ROOTS` at all ⇒ the
  constant-time compare needs its OWN source leg (AC4);
  invariant (g) — a bare `audit.writeAuditEntry` in the module FAILS ⇒ every audit line goes through `withCompensatingAudit` (or
  `writeRolledBackAudit`). `withCompensatingAudit` (`packages/domain/src/audit/compensating.ts`) writes the intent line FIRST and, if
  `mutate` THROWS, writes `<action>_rolled_back` and rethrows — so a refusal must be decided BEFORE the wrapper, or the wrapper's `mutate`
  must RETURN (⛔ throw) for a committed-then-refused outcome (WC5, WC9). The handlers throw the `http-errors.ts` classes with their own
  codes, so the API error mapping needs ⛔ change; it is
  `apps/api/src/middleware/error-mapping/index.ts` (wa-opt-in block `:597-612`; `WaOptInStateError` → 409 `wa_opt_in.invalid_state`);
  domain errors carry ⛔ `details` — a handler throws `ConflictError(message, code, details)` (`http-errors.ts:68-72`) for those that need it. OpenAPI paths are hand-registered in `packages/contracts/scripts/emit-openapi.ts`
  (wa-opt-in paths from `:1526`; the schema import at `:164` and the components map at `:426-431`) and a CI determinism gate requires the emitted `openapi/v1.yaml` byte-identical. Domain audit actions have
  ⛔ registry (regex `^[a-z0-9_]+(\.[a-z0-9_]+)+$`, `packages/domain/src/audit/write.ts:95-102`).
- **F19 — The app's code inputs** (`(auth)/otp.tsx:158-166`, `(claim)/handover-otp.tsx:50-58`): `keyboardType="number-pad"`, `maxLength`,
  `autoFocus`; ⛔ `textContentType="oneTimeCode"` / `autoComplete` anywhere in `apps/mobile`; ⛔ resend cooldown UI anywhere; errors split
  only 429 vs everything else plus specific `auth.*` codes, as plain un-announced `Text`. ⇒ The code form follows the 5.10 step's patterns
  (bounded calls, `ApiError` codes, `AnnouncedText`), ⛔ `otp.tsx`'s.
- **F20 — Tests and copy gates** (5.10's): `tests/unit/wa-signup-step-render.test.ts` (887 lines) mocks `lib/member-api` with ONLY
  `getWaOptInStatus` / `requestWaOptIn` (`:44-46`) and has ⛔ tamagui `Input` mock (tamagui `Input` is the app's standard text input); its tamagui `Button` records full props per testID;
  `tests/unit/wa-signup-copy-keys.test.ts` has `FILES` (`:15`), an EXACT sorted `EXPECTED` key list (`:18-40`), forbids `{token}` values
  (`:69`), pins the `waSignup.*` + `waOtherPhone.*` family at 19 keys (`:80-81`) and bans `/\bmiss|settings|सेटिंग/i`, `/also (get|receive|send)/i`
  (`:89-90`). `wa-notifications-copy-keys.test.ts` scans `OtherPhoneHint.tsx` too (`:13-18`). i18n keys are FLAT dotted strings; parity walks
  en keys; `microcopy.yaml` scans both `common.json` files.

**Meta (fetched 2026-10-21 — Latest tech information)**

- **F21 —** Authentication template: preset body *"<code> is your verification code."*, optional *"For your security, do not share this
  code."* (`add_security_recommendation`), optional expiry footer (`code_expiration_minutes`, 1–90), an OTP button (`COPY_CODE`; one-tap /
  zero-tap are Android-only with app signatures — ⛔ used here); code ≤ 15 characters; ⛔ URLs, media or emojis. Delivered ONLY to the
  recipient's PRIMARY WhatsApp device (linked devices see it masked) — exactly the "other phone". Default delivery TTL 10 minutes (dropped
  after). Created via `POST /<WABA_ID>/message_templates` with `category: "authentication"`. India rate: per delivered message;
  Meta's own card ⛔ read (third parties: ₹0.115 + GST — UNCONFIRMED); "authentication-international" does ⛔ apply to an India-based business
  messaging India. ⛔ Meta-published resend cooldown; 131056 = too many messages to the same recipient. Current Graph API v26.0; `v21.0`
  (the `pariwar_wa_config.graph_api_version` DEFAULT) is removed 2027-01-21; India-billed accounts must move to INR by 2026-12-31.

## ⚖️ Build decisions WC1–WC17 (⭐ = recommended) — PROPOSED for BigDev at Task 0.2

- **WC1 — Where the code is sent from, and in what order.** ⭐ **(a)** In the API request (`POST …/code`), synchronously — the 5.9 step-up
  precedent (F15) — in FIVE steps, so that every failure that is ⛔ Meta's happens BEFORE anything is counted:
  0. **Pre-check — every DATABASE read, in a short READ-ONLY `openScopeTx(deps, pariwarId)` → reads → `closeScopeTx(tx, true)`, ⛔ lock,
     ⛔ network call inside it:** the config (`getWaConfig`), the member state, the WC15 rows, `getCodeState`, and the mobile ciphertext
     (`getMemberMobileCiphertext` — `member_identities` is tenant-RLS too, and the mint already reads it in its scope tx). The send
     refusals are evaluated once, IN THE ORDER every site uses — **`channel_unavailable`** (`enabled: false` or ⛔ config) →
     **`not_pending` / `already_active`** → **`code_not_offered`** (WC17, then WC15) → **`code_limit_reached`** →
     **`code_resend_too_soon`** — so a refusal answers here with its own code and with ⛔ decrypt (⛔ KMS audit line). ⚠ These reads MUST
     run inside a scope tx (T19): the tables' RLS policies read `app.pariwar_id`; the scope tx sets `SET LOCAL ROLE twt_app`
     (`scope-tx.ts:25-33`) while CI's login is a superuser that bypasses RLS (`context.ts:509-515`). Advisory only; step 2 re-decides
     under the lock in the same order.
  1. **Resolve** (⛔ database READ — it takes step 0's config and ciphertext as INPUT; the decrypt's KMS audit line is still WRITTEN
     through `servicePool`, `deps.ts:470`, inside the 3 s race; a `null` ciphertext, `read.ts:120,135`, is `decrypt_failed`) — `resolveCodeDelivery(deps, { pariwarId,
     config, mobileCiphertext })` in `apps/api/src/modules/wa-opt-in/code-delivery.ts`: config completeness (a non-null `phoneNumberId`, `accessTokenSecretName`, `graph_api_version`; `enabled` was step 0's); the template name — `wa.template.wa_opt_in.code.hi.<p>`
     and `…en.<p>` read IN PARALLEL through `deps.resolveChannelSecret`, `hi` preferred, checked against `TEMPLATE_NAME_FORM` (F13 — the
     ONE regex); the access token (non-blank — `resolveSecretValue` blank-checks only the env fallback); the decrypt
     (`decryptMobile` on step 0's ciphertext, F8 — KMS, a network call) with `+` stripped; and `messagingFor(pariwarId, { phoneNumberId, accessToken,
     graphApiVersion })` BUILT here (its `assertClientConfig` throws a plain `Error`, F11 — ⛔ inside the classified send). All of step 1
     is bounded by ONE race, `CODE_RESOLVE_TIMEOUT_MS = 3_000`. Any failure or timeout ⇒ 503 `wa_opt_in.code_unavailable`, ⛔ row, ⛔ audit
     line, ⛔ fetch; the injectable `log` records a class (`config_incomplete` | `template_unresolved` | `token_unresolved` |
     `decrypt_failed` | `resolve_timeout`), ⛔ a secret name, ⛔ the mobile.
  2. **Claim (tx 1, committed):** `openScopeTx` → `lockMemberWaYes` → the authoritative refusals in step 0's ORDER, re-reading the config
     (`channel_unavailable` if WhatsApp was switched off since step 0) and the state (`getCurrentMemberState`) — all decided BEFORE any
     audit wrapper (WC5) → `withCompensatingAudit(member.wa_opt_in_code_sent, mutate: insertCodeSlot)` → `ok = true` → commit.
  3. **Send:** `plan.messaging.send(authMessage, { timeoutMs: 10_000 })` OUTSIDE any transaction or lock; ONLY this call sits inside the
     `try` whose `catch` runs `classifyDirectWaSendFailure` (F12).
  4. **Outcome (tx 2):** `openScopeTx` → `lockMemberWaYes` → `recordCodeSendOutcome` (`WHERE code_id = $1 AND send_outcome = 'sending'`);
     a `released` mark inside `withCompensatingAudit(member.wa_opt_in_code_released, …)`; every `mutate` RETURNS; `ok = true` ⇒ COMMIT;
     ONLY AFTER the `finally` throw the 502 / 503 (`BadGatewayError` / `ServiceUnavailableError`, `http-errors.ts:170,182`) — the WC5
     commit-then-throw rule, T14. A throw between step 2's commit and the `send` call (⛔ expected — step 1 built everything) is marked
     `released` the same way.
  ⛔ transaction is open during step 1 or step 3 (T3) — so a Secret Manager or KMS stall holds ⛔ pool connection. Step 1's 503 carries
  `WaOptInCodeErrorDetails` built from step 0's reads (`codesRemaining`, `liveCode`). Timing: 3 s + Meta's 10 s leaves ~2 s of the app's `CALL_TIMEOUT_MS`
  (15 s) for step 0, two lock waits, three audit writes (under the deployment-wide audit lock) and the network — ⛔ a bound; an overrun
  reaches the app as a non-`ApiError` failure, which AC9 treats as "may have been sent" (`sent_uncertain` + the field), the right reading
  once the claim committed. ⭐ **The test seam is the TRANSPORT**, plus the secret
  resolver every spec already overrides: `deps.waCodeTransport: { fetchImpl, timeoutSignal? }` — NEW on AppDeps (`apps/api/src/context.ts`,
  beside `stepUpDelivery` `:534`; the existing precedent is `buildMemberStepUpDelivery`'s `options.fetchImpl`, `deps.ts:291-292`) —
  handed to the module's OWN `createWhatsappAppCache(fetchImpl, { timeoutSignal })` (F11, F14 — apps/api is outside the one-cache rule);
  `deps.ts` wires the global `fetch` and the default signal in EVERY environment — ⛔ dev "reveal" or log adapter (unlike 5.9's
  `deps.ts:322-326`; I7): unprovisioned ⇒ 503 + fallback. `_setup.ts` supplies a RECORDING fetch (requests captured, responses scripted)
  and a test-controlled `timeoutSignal` (the jobs precedent, F11) for the real `'timeout'` path. `resolveChannelSecret` (already on AppDeps
  — F13) is overridden per spec through `TestDepsOverrides` (`_setup.ts:294`): a valid name for `wa.template.wa_opt_in.code.*`, a token for
  the access-token name, or a throw for the unprovisioned legs — ⚠ the default `test-secret::<name>` FAILS `TEMPLATE_NAME_FORM` (F13).
  Everything else (resolution, the request body, classification) runs for real. `whatsapp-app.ts` gains a third message shape
  `{ templateName, languageCode, authenticationCode }` emitting the body parameter AND the copy-code button parameter (F11).
  **(b)** Enqueue a pg-boss job in apps/jobs (the direct senders' home). *Cost (a):* the first WhatsApp send in apps/api, a second client
  cache (one per process), the request waits up to ~13 s; a refusal decided at step 2 after step 1 decrypted costs one KMS audit line
  (step 0 makes that rare). *Cost (b):* the member waits for a job pickup (up to a minute) with no way to tell them it failed; a queue, a
  job and a status read for one message; the 09:00–20:00 send window of the existing senders would not apply to a code the member is
  waiting for anyway. ⭐ (a): the member is looking at the screen, and a code that arrives late has expired.
- **WC2 — Where codes are stored, and what the DATABASE refuses.** ⭐ **(a)** A NEW table `member_wa_opt_in_codes` (the next free
  migration, HAND-AUTHORED with a journal `when` above 0177's `1794800400021` — F5b), one row per send that was claimed:
  `code_id` uuid PK; `pariwar_id`; `opt_in_id`; `member_id`; `send_seq smallint CHECK (send_seq IN (1,2))`; `code_hash text NOT NULL`;
  `expires_at timestamptz NOT NULL`; `attempts smallint NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 2)`; `consumed_at`,
  `invalidated_at` (nullable); `send_outcome text NOT NULL DEFAULT 'sending' CHECK IN ('sending','accepted','may_have_sent','refused',
  'released')`; `provider_message_id`, `detail` (a class token — ⛔ PII); `created_at`. The DATABASE's rules (I3):
  - **Partial unique `(opt_in_id, send_seq) WHERE send_outcome <> 'released'`** — with `send_seq ∈ {1,2}` a third counted code is refused.
  - `CHECK (attempts < 2 OR invalidated_at IS NOT NULL)` (a code with two wrong tries is dead) and `CHECK (consumed_at IS NULL OR
    (invalidated_at IS NULL AND attempts < 2))` (a dead code is never used).
  - A **BEFORE UPDATE guard trigger** on the 0176 pattern (F5b): `code_id`, `pariwar_id`, `opt_in_id`, `member_id`, `send_seq`,
    `code_hash`, `expires_at`, `created_at` frozen; `send_outcome` changes ONLY from `'sending'`, once (so a counted outcome can never
    become `released` and free a seq); `provider_message_id` / `detail` change only with it; `attempts` never decreases; `consumed_at` and
    `invalidated_at` go NULL → a value once, never back.
  - `GRANT SELECT, INSERT, UPDATE (send_outcome, provider_message_id, detail, attempts, consumed_at, invalidated_at)` to `twt_app` — a
    COLUMN-LIMITED update, ⚠ LOCKSTEP with the trigger (the 0172 pattern, F5b); ⛔ DELETE.
  - A composite OWNER FK `(pariwar_id, member_id, opt_in_id)` → `member_wa_opt_in`, with the UNIQUE it needs added to `member_wa_opt_in`
    in the same migration (the 0175 owner-FK precedent — a plain `opt_in_id` FK check bypasses RLS, so a buggy cross-Pariwar or
    cross-member reference would insert). `ON DELETE CASCADE`: production never DELETEs a `member_wa_opt_in` row (⛔ DELETE grant, F3),
    and three tests do (`apps/jobs/tests/wa-opt-in-lasting-yes.test.ts:90`, `apps/jobs/tests/wa-webhook-processor.test.ts:181`,
    `packages/domain/tests/integration/wa-opt-in/wa-opt-in-concurrency.spec.ts:60`) — confirm at Task 1 that ⛔ RTBF path deletes one.
  - RLS ENABLE+FORCE with PER-VERB select / insert / update tenant policies on the CURRENT precedent — migration 0172 +
    `packages/domain/src/policies/claim-contact-wa-rls.ts` + `packages/domain/tests/integration/rls/claim-contact-wa-policy-regression.spec.ts`
    (`policies/README.md` "Test discipline": a regression spec + the cross-Pariwar probe
    `packages/domain/tests/integration/multi-tenant/cross-pariwar-leak.spec.ts`) — ⛔ 0042's `FOR ALL`.
  The slot rule: under the lock, `send_seq` = the LOWEST of {1, 2} ⛔ held by a non-released row of the PENDING (⛔ "count + 1", which
  collides when a slow send is released after a later one took seq 2). Domain functions in a NEW `packages/domain/src/wa-opt-in/code.ts`
  (⛔ pinned `read.ts` / `write.ts`); they RETURN discriminated refusals (`{ ok: false, refusal: 'channel_unavailable' | 'not_pending' |
  'already_active' | 'limit' | 'too_soon' | 'yes_ended_before' | 'not_signing_up', … }`), ⛔ throw, so the handler decides refusals BEFORE any audit wrapper
  (WC5). `findLiveCodes` = the PENDING's rows with `send_outcome IN ('sending', 'accepted', 'may_have_sent')`, ⛔ consumed, ⛔ invalidated,
  ⛔ expired — at most two; it RETURNS `{ codeId, codeHash, attempts }[]`; the compare is the API's (domain cannot import
  `auth/shared/otp.ts`). **(b)** `member_auth_otps` with a new intent (F10). *Cost (a):* a migration, a trigger and a second code store.
  *Cost (b):* edits the auth OTP service (a per-call cap, a request link, a send counter), a GLOBAL-RLS table for a tenant record, and the
  code shares a table with login codes against §2.2's *"distinct OTP pools"* spirit (the pool is the intent — still separable, but one
  mistake from cross-burning). ⭐ (a).
- **WC3 — Counting and timing.** ⭐ A code is 6 digits (`generateOtp`), valid **10 minutes** by the DB clock (= Meta's default delivery TTL
  and the template's expiry footer — a code is ⛔ valid after WhatsApp would drop it); **at most 2 COUNTED sends per PENDING**; **2 entry
  attempts per code**; a second code does ⛔ invalidate the first (WC16 (a) — both stay usable until each expires, is used, or takes two
  wrong tries). **The wait:** 60 s before the next send, measured from the newest row that is `sending` / `accepted` / `may_have_sent`, or
  `released` with a `rate_limited:*` detail (Meta asked to wait — 131056 is a per-recipient limit); any other `released` row, and a
  `refused` row, starts ⛔ wait. Reported RELATIVELY, under ONE name in every response and error, `retryAfterSeconds` = `ceil(60 −
  (clock_timestamp() − that row's created_at))` clamped to [0, 60] (`clock_timestamp()`, ⛔ `now()` — a request that waited on the lock has
  an earlier `now()` than the winner's row); `null` when ⛔ further send is possible or ⛔ wait applies.
  **What counts:** a send COUNTS when it may have reached the member (`sending`, `accepted`, `may_have_sent`) OR when Meta refused it for
  this RECIPIENT or for an unclassified reason (`refused`); it is UNCOUNTED (`released`) when Meta provably did ⛔ deliver it AND the fault
  is ⛔ the recipient's: it never left (`:000`, `param_invalid`, a throw before `send`), Meta asked to wait (`rate_limited:*`), or — ⭐ WC3
  (a) — Meta refused it for the Trust's ACCOUNT (`scope`). ⚠ This DEPARTS from the `-371` precedent twice: it is STRICTER (a counted
  `refused` is a send Meta provably did ⛔ make; `-371` counts only what Meta MAY have acted on), and unlike 6.37d (`-371` d2) a counted
  refusal does ⛔ end the request — one more code may follow. The outcome table (F12's kinds, in its order):

  | `classifyDirectWaSendFailure` | `send_outcome` (`detail`) | Counted? | API answer | App |
  |---|---|---|---|---|
  | (⛔ throw — wamid) | `accepted` | yes | 200 `delivery: 'sent'` | code field |
  | `may_have_sent` (a non-`WhatsappSendError` from `send`, status 0 / timeout, `httpStatus < 0`, 2xx without wamid, 502/504) | `may_have_sent` | yes | 200 `delivery: 'uncertain'` | code field + `waCode.sent_uncertain` |
  | `transient:api_unavailable:000` | `released` | ⛔ | 502 `wa_opt_in.code_send_failed` | `send_failed` + send again (⛔ wait) |
  | `transient:rate_limited:*` | `released` (`rate_limited:<code>`) | ⛔ | 502 `wa_opt_in.code_send_failed` (`retryAfterSeconds` 60) | `send_failed` + send again after the wait |
  | `unknown_scope:param_invalid` (a code / name that never left) | `released` | ⛔ | 502 `wa_opt_in.code_send_failed` | as `:000` |
  | `transient:api_unavailable:<5xx ≠ 502/504>` | `may_have_sent` | yes | 200 `delivery: 'uncertain'` | code field + `sent_uncertain` |
  | `scope` (incl. 131048 on a 429; 401/403; 132xxx; an auth-class `metaCode`) — ⭐ WC3 (a) | `released` (`scope:<code>`) | ⛔ | 503 `wa_opt_in.code_unavailable` | `send_failed` + the closed route (⛔ send again — it would fail the same way) |
  | `recipient` (131026 / 131021 — synchronous only, RARE, F15), other `unknown_scope` | `refused` | yes | 502 `wa_opt_in.code_send_failed` | `send_failed` + send again if a code remains + `OtherPhoneDetails` |
  | a throw after the claim and before `send` (⛔ expected — WC1 step 1) | `released` | ⛔ | 502 `wa_opt_in.code_send_failed` | as `:000` |
  | a crash between tx 1 and tx 2, or tx 2 itself failing (its audit write, the lock, the COMMIT — `closeScopeTx` rethrows) | stays `sending` — ⛔ nothing rewrites it | yes (the partial unique holds it) | a 500 (or none) | it is live until it expires and holds the 60 s wait; the app reads the 500 as "may have been sent" (AC9) |

  **WC3 (a) vs (b) for `scope`:** ⭐ **(a)** uncounted + 503 + the closed route — one provisioning fault (a `hi` name set while Meta
  approved only `en`, an expired token) would otherwise spend a code of EVERY member who tries, and the second send is certain to fail
  too; the server logs `scope:<code>` so the fault is visible. **(b)** counted `refused` (stricter). *Cost (a):* in a mis-provisioned
  Pariwar a member can tap Send again and again (each a failed Meta call, each a `code_released` line), bounded by the per-member route
  limit (WC10). *Cost of WC3 overall:* a member whose first code is refused for their number still has only one more; a Meta outage spanning
  both sends spends the request (the 6.37d cost, `-372`); ⚠ a number NOT on WhatsApp usually gets 200 `sent` (131026 arrives later on the
  status webhook — F15): the member waits for a code that never comes, asks once more, and then has neither route (the phrase must come from
  that same number) — Continue is always there. Correlating `whatsapp_send_status` to code rows by `provider_message_id` is ⛔ built (a
  stated residual). After both codes the member's routes are the phrase (still open) or a new request once the PENDING lapses (48 h — F3).
  *Alternatives:* count every call (stricter, ⛔ needed — the ruling bounds codes that can reach the member); 5-minute validity (the login
  OTP's — tighter than WhatsApp's own delivery window).
- **WC4 — Which template, and what the mint tells the app.** ⭐ **(a)** Move `waTemplateConfigKey` (and its purpose union) AND
  `TEMPLATE_NAME_FORM` unchanged into `packages/channels/src/wa-template-config-key.ts`, re-exported from the package index; the two old
  homes keep a one-line RE-EXPORT (`apps/jobs/src/scheduler/wa-template-config-key.ts`; `TEMPLATE_NAME_FORM` from
  `claim-peer-mesh-wa-reminders.ts`) so the four importers (F13) and their tests stay byte-unchanged (⛔ pinned — F14); add purpose
  `'wa_opt_in.code'`. Language code `hi` / `en` exactly (the app is always Hindi — [[project_mobile_app_no_language_switch]]). ⛔ resolvable
  name, ⛔ complete config, a token that will not resolve, or a decrypt that fails ⇒ 503 `wa_opt_in.code_unavailable` — ⛔ a log stand-in
  that reports `accepted` (the 5.10 F7b class, I6). ⭐ **The mint tells the app beforehand:** `CreateWaOptInResponse` gains
  `codeAvailable: boolean`, `codesRemaining: 0 | 1 | 2`, `liveCode: boolean` and `liveCodeDelivery: 'sent' | 'uncertain' | null` (the
  newest live row `accepted` ⇒ `'sent'`, `sending` / `may_have_sent` ⇒ `'uncertain'`, ⛔ live code ⇒ `null`; it picks the line the form
  reopens with — WC7) (a `.strict()` contract change — OpenAPI regenerated).
  `codeAvailable` = config complete AND a template name resolves AND the token resolves (`resolveCodeAvailability` — WC1 step 1 ⛔ the
  decrypt, ⛔ `messagingFor`) AND
  `codesRemaining > 0` AND the WC15 / WC17 refusals do ⛔ apply; `liveCode` = `findLiveCodes` is non-empty (so a member back within 10
  minutes opens at the code field, ⛔ at "Send me a code"). Computed AFTER the mint's `finally` (the PENDING committed, the lock released —
  both PENDING paths assign a result instead of returning from inside the `try`, `handlers.ts:173,195`), its DATABASE reads (the config, WC17,
  WC15, `getCodeState`) in their own short READ-ONLY `openScopeTx`, CLOSED before any Secret Manager read (⛔ the bare app pool — T19;
  ⛔ a transaction held across a network call — T3), the cheap refusals deciding FIRST so a member they already rule out — every `active`
  member minting from Settings — costs ⛔ Secret Manager read, and
  bounded by `CODE_AVAILABILITY_TIMEOUT_MS = 2_000` (a race — a Secret Manager timeout or throw ⇒ `codeAvailable: false` with the
  database-derived `codesRemaining` / `liveCode` / `liveCodeDelivery` KEPT, so a live code stays typeable; only a failure of the database
  reads themselves ⇒ the whole fallback `{ codeAvailable: false, codesRemaining: 0, liveCode: false, liveCodeDelivery: null }` — all four
  being required in a parsed `.strict()` response), so a Secret Manager stall can ⛔ push
  the shared mint (5.10's phrase route, Settings too) past the app's 15 s. `codeAvailable` and `liveCode` both `false` ⇒ the app shows 5.10's
  `OtherPhoneHint` unchanged (I6, AC1). The status response is unchanged. **(b)** A `pariwar_wa_templates` row — its alert-category CHECK and pinned schema (F13, F14).
  **(c)** A new column on `pariwar_wa_config`. *Cost (a):* up to three parallel Secret Manager reads on a signup mint, capped at 2 s (the
  race does ⛔ cancel them); a rotated token is ⛔ picked up by the cached client until a restart (F11), so after a rotation
  `codeAvailable` can be true while every send answers `scope` → 503 + the fallback; a
  template removed between mint and send still yields the 503 + fallback; an outage of Secret Manager reads as "not provisioned" (both
  throw — F13) — the server LOGS which (a class, ⛔ the name), the member sees the fallback either way. ⭐ (a) keeps the house rule *"ONE
  builder for a KEY FAMILY"* with its second consumer ([[feedback_no_premature_package]]).
- **WC5 — What a correct code writes.** ⭐ ONE route `POST /api/v1/member/wa-opt-in/code/verify` `{ code }`, in THIS order (F18 — a
  refusal decided inside `withCompensatingAudit` would write an "activated" line + `_rolled_back` AND roll back the attempt count, making
  tries unlimited):
  1. `openScopeTx` → `lockMemberWaYes` → the PENDING / ACTIVE check (`already_active` / `not_pending`) → `findLiveCodes` → the compare in
     a SMALL helper of its own (`matchCode(code, live)`: `timingSafeHashCompare(hashOtp(code), row.codeHash)` against EACH live row,
     with ⛔ early exit — T5, F18 (f)) — all OUTSIDE any audit wrapper.
  2. **Correct:** `withCompensatingAudit` (`member.wa_opt_in_activated`, originating channel **`member_app_wa_code`** — a NEW value appended
     to `WA_OPT_IN_ORIGINATING_CHANNELS` (a TS const tuple — ⛔ DB enum, ⛔ migration), PENDING → ACTIVE), `mutate` = `consumeCode` (the
     matched row, `WHERE consumed_at IS NULL AND invalidated_at IS NULL AND attempts < 2 AND expires_at > now()`; 0 rows ⇒ throw) →
     `recordConsent(tx, { pariwarId, subjectId: memberId, consentType: 'whatsapp_opt_in', grantedViaActor: 'member_self', consentPayload:
     { source: 'member_app_wa_code', uiContext: 'signup', memberState, codeId }, auditId, consentId })` → `activateOptIn(tx, { …,
     windowExpiresAt: null, consentId })`; `ok = true` → 200.
  3. **Wrong, or no live code:** `withCompensatingAudit` (`member.wa_opt_in_code_rejected`), `mutate` = `recordWrongAttempt` (increments
     EVERY live row — a wrong guess is wrong for each code the member holds — and invalidates each that reaches 2; a no-op when there is
     ⛔ live code) which RETURNS `{ attemptsRemaining, codesRemaining, liveCode }` (`attemptsRemaining` = the most any live code still has);
     `ok = true` so `closeScopeTx` COMMITS; only AFTER the `finally`, throw `ConflictError('…', 'wa_opt_in.code_wrong' |
     'wa_opt_in.code_no_longer_valid', details)`.
  The send route follows the same rule (WC1 steps 2 and 4): refusals decided under the lock BEFORE `withCompensatingAudit`; every outcome
  committed, THEN the error thrown. `ActivateOptInInput.windowExpiresAt` widens to `Date | null` (null = ⛔ customer-service window opened —
  honest, F4); the worker still passes its Date; the `write.ts` sha pin is RE-TAKEN with a dated comment (F14). §3.4's *"recorded with
  timestamp + the UI context"*: the consent row's `granted_at` + the payload's `uiContext: 'signup'` — which the SERVER can stand behind
  for the SEND (WC17 (a) refuses a member past signup), while verify reads `getCurrentMemberState` under the lock and RECORDS it as
  `memberState` (⛔ a refusal — WC17) — + the mint's own
  audit line (the tick). *Alternatives:* a separate ACTIVE writer in `code.ts` (⛔ pinned edit — but a SECOND copy of the PENDING → ACTIVE
  guard to keep consistent); `windowExpiresAt = now()+24h` (records a window that never opened). *Cost:* a pinned-file edit, deliberately;
  ⚠ inherited, ⛔ new: if the scope tx's COMMIT itself fails after a `mutate` returned, the intent line stands with ⛔ `_rolled_back`
  (`withCompensatingAudit` compensates only a `mutate` throw — the 5.12 round-2 W1 class, already true of the mint).
- **WC6 — Where the code is offered.** ⭐ **(a)** The SIGNUP step only (`-374`'s option as put — *"Only after the member ticks the box"*,
  and the question as put — *"while signing up"*); the server stands behind it (WC17). The "WhatsApp notifications" screen keeps 5.10's
  phrase hint unchanged. **(b)** Also that screen's PENDING state — it would extend the option as put, and its main use is a member coming
  back after switching WhatsApp off, which WIDENS ADR-0029's unsuperseded *"Re-opt-in after revoke requires a NEW inbound message"* (§0
  reading (6), WC15) ⇒ a routing note to the Panel first (template §0) that NAMES that sentence, ⛔ built until ruled. *Cost (a):* a member
  who did ⛔ finish at signup and later opens "WhatsApp notifications" from another phone gets only the phrase. *Cost (b):* a Panel
  question and a wait. ⭐ (a); (b) only if BigDev wants the question asked.
- **WC7 — What the signup link shows.** ⭐ When the mint said `codeAvailable || liveCode`, the signup step's `<OtherPhoneHint …/>` on the
  `sent` stage is REPLACED by a NEW `OtherPhoneCodeHint` (same `waOtherPhone.link` label, its OWN testID `wa-code-link`, collapsed by
  default — or EXPANDED at the code field when the mint said `liveCode: true`, with `waCode.sent` if the live row is `accepted` and
  `waCode.sent_uncertain` if it is `sending` / `may_have_sent` — the mint's `liveCodeDelivery: 'sent' | 'uncertain' | null` says which —
  and, when the mint said `codeAvailable: false` — both codes spent, or the route stopped resolving — the closed route below the field
  with ⛔ send or resend button, whatever `codesRemaining` says); when BOTH are `false`, `OtherPhoneHint` renders exactly as today (its
  `wa-other-phone-link` legs unchanged). On the `ask` stage with `error === 'link'` AND a mint, `OtherPhoneCodeHint` renders ONLY under the
  same condition — a RARE path (the `https://wa.me/…` link usually resolves even with ⛔ WhatsApp, F16), kept because the PENDING exists
  and the tick happened; otherwise the `ask` stage renders exactly as 5.10 built it (⛔ hint — 5.10 placed it on `sent` only,
  `whatsapp.tsx:262-279`). **State:** the form's state lives in a `useWaCode()` hook owned by `OtherPhoneCodeHint` (mounted for
  as long as the stage body shows); collapsing the link hides the form's VIEW only, so a sent code, the counts, the countdown, the last line
  and an in-flight call all survive collapse → expand. The hook's `isCurrent` is its OWN action-version counter, bumped on blur and on
  unmount (the step's `actionVersion` pattern, F16 — ⛔ the step's counter, which `onReopen` also bumps; ⛔ bumped by a collapse).
  **Expanded** (`WaCodeEntry`, testIDs `wa-code-send` / `wa-code-input` / `wa-code-confirm` / `wa-code-resend`): `waCode.intro` + *"Send me
  a code on WhatsApp"* (`wa-code-send` — shown while the member has ⛔ been TOLD (a 200, a non-`ApiError` Send, an `ApiError` ≥ 500 with unparseable details — AC9 — or the mint's `liveCode: true`) that a code may have been sent: only
  `released` / `refused` sends so far) → (200 `sent`) `waCode.sent`, or
  (200 `uncertain`, or any non-`ApiError` failure on Send — a client timeout or a dropped connection) `waCode.sent_uncertain`, then a code
  field (`keyboardType="number-pad"`, `maxLength={6}`, `onChangeText` keeping DIGITS only — a pasted "123 456" becomes "123456"; ⛔
  `textContentType="oneTimeCode"` / `autoComplete` — iOS would offer the SMS LOGIN code this phone just received, and one tap spends half
  the tries), *"Confirm"* (enabled at 6 digits), *"Send another code"* (`wa-code-resend` — shown once the member was TOLD (as above) and `codesRemaining
  === 1` or the count is unknown, and ⛔ shown at all when the mint said `codeAvailable: false`; disabled with
  `waCode.resend_wait` for `retryAfterSeconds`, counted down from the response — ⛔ the device clock). A correct code → an `activated` flag
  in `whatsapp.tsx` replaces WHICHEVER stage body is showing (`ask` or `sent`) with `waCode.done` (testID `wa-code-done`), clears `error`,
  and is announced FROM `whatsapp.tsx` (the form has unmounted); the `sent` stage's return-to-app announcement (`whatsapp.tsx:176-202`) is
  gated on `!activated`; Continue → payment as before. **The code route is CLOSED** — `code_limit_reached`, `code_unavailable`,
  `code_not_offered`, a send failure with ⛔ code left, a wrong final attempt with ⛔ code left and ⛔ live code, any other `ApiError` —
  ⇒ the form shows its line and, below it, 5.10's number + phrase (`OtherPhoneDetails`, extracted UNCHANGED from `OtherPhoneHint`, which
  keeps rendering it — Settings untouched); the code FIELD stays while a live code exists (`liveCode` in the response or error details).
  *Cost:* the 5.10 phrase becomes a second-line route on signup for provisioned Pariwars; three new components and a hook; the step file
  grows. *Alternative:* keep the phrase first and the code second (more words for every member who opens the link — ⛔ recommended; `-374`
  Consequence 2 says the code REPLACES what the link shows).
- **WC8 — The words.** ⭐ A `waCode.*` family (en + DRAFT hi, 15 rows, table below), ⛔ `{token}`, ⛔ digits (a style choice for these
  strings — the microcopy `numerals` rule flags only Devanagari digits, and the copy test's digit ban covers `waOtherPhone.desc` only),
  pointing to the registered number, never threatening (R10(B)), never "Settings" (5.10 F14). BigDev reviews the en AND the hi at Task 0.2
  (5.10's v1.5/v1.6 precedent); WC13 (b) records whether that discharges Row 28's control. Re-used, ⛔ re-minted: `waOtherPhone.link`,
  `waOtherPhone.desc` / `number_label` / `message_label` / `note` (inside `OtherPhoneDetails`), `waSignup.continue`.
- **WC9 — What is audited (§2.2 floor: per send + per attempt + per consume).** ⭐ Every line via `withCompensatingAudit` (F18 (g)), resource
  `pariwar/<p>/member/<m>/wa-opt-in`, actor = the member, originating channel `member_app_wa_code` on EVERY code line, payload hash
  `waOptInAuditPayloadHash` with the PENDING's phrase: `member.wa_opt_in_code_sent` (PENDING → PENDING, around the slot claim — the
  per-send line; an `accepted` / `may_have_sent` / `refused` outcome is recorded on the ROW, ⛔ a line of its own),
  `member.wa_opt_in_code_released` (around the `released` mark — a provably unsent call, incl. `scope`), `member.wa_opt_in_code_rejected`
  (around each wrong / no-live-code attempt's committed increment — WC5 step 3), `member.wa_opt_in_activated` (WC5 step 2 — the consume).
  A refusal decided before the wrapper (WC1 step 2, WC5 step 1) writes ⛔ line — stated as the floor's exception (rulings table, §2.2).
  ⛔ line carries the code or its hash. *Cost:* ~8 audit lines for a typical request; `code_released` lines are bounded by the route limit
  (WC10).
- **WC10 — Abuse limits.** ⭐ Both routes get the per-member route limit (`writeRateMax` / 1 min, `perMemberKey`, `hook: 'preHandler'` — F2)
  ON TOP of the database caps; a malformed code (⛔ 6 digits) is a 400 from the contract and spends ⛔ attempt; a double tap on Send is safe
  (the second sees the 60 s rule under the lock → 409). §2.2's *"per device, per member, and per IP"* and §2.11's *"per-phone-number max N
  attempts / 15-min window + global cap"* are auth-OTP rules (⛔ binding on a WhatsApp switch-on code — read as guidance): per member (the
  route limit), per IP (the global ceiling) and per number (≤ 2 codes per PENDING, the registered number only) are met; per device and a
  GLOBAL cost cap are ⛔ built — a stated residual (`deferred-work.md`, WC14), since `-374` accepted *"Meta charges for each code"* and a
  Pariwar's codes are bounded by its members × 2 per 48 h. *Cost:* none beyond the 429 test.
- **WC11 — Tell the Panel the reading as built.** ⭐ **(a)** A short TOLD item (`trustee-panel-told-<date>-5-13-…`, ⛔ a question), in the
  member's terms: (1) *"one retry"* is built as one more code on request (at most two codes per request) and two tries per code — which
  goes past the option as put AND the accepted cost line *"once, at their request"* (§0 reading (1)); (2) a send Meta REFUSED for the member's
  number still counts (stricter than the claim sends); a call that never left, one Meta asked us to wait on, and one Meta refused for the
  TRUST's account do ⛔ count, so Meta can be CALLED more than twice although at most two codes can reach the member (WC3); (3) what a STOP sent in reply to a code does (WC12
  as answered — under ⭐ (a) it does ⛔ stop a second code the member then asks for, and a code typed after it switches WhatsApp on); (4) the code is offered
  only while signing up, and the server refuses a member past signup (WC17); (5) a member who switched WhatsApp off before is ⛔ offered a
  code (WC15). Written at Task 0.4; "told" only once BigDev sends it ([[feedback_shown_to_panel_means_sent]]). **(b)** Nothing. *Cost (a):*
  one more note. *Cost (b):* the Panel is never told — `-374`'s record of BigDev's reading is a log entry written after the ruling, ⛔ the
  Panel being told; and (2)–(5) appear nowhere. ⭐ (a): it is the exact number of WhatsApp messages the Trust sends to someone not yet
  switched on — the heart of what was ruled.
- **WC12 — A STOP before the code is typed.** The ratified text is silent on it (§0 reading (7)). ⭐ **(a)** Unchanged: a STOP from a member
  with only a PENDING ends nothing and writes nothing (F6) — the code, typed afterwards, is a later and explicit in-app yes, and the
  worker's STOP path (shared with 6.37d) is ⛔ touched. **(b)** A STOP also expires the member's open PENDING on that number (codes and phrase
  die with it). **(c)** A STOP from the registered number while a PENDING exists is RECORDED (a per-PENDING mark the worker writes on the
  `nothing_to_end` branch), and the send route then refuses further codes for that PENDING (`code_not_offered`); a code already sent can
  still be typed (an explicit in-app yes). *Cost (a):* a member who replies STOP to code #1 can still have code #2 sent to that number at
  their own later tap, and typing a code after a STOP switches them on (their last act wins) — the closest of the three to Meta's
  *"respect all requests … to opt out"* only in that every send follows the member's own tap. *Cost (b):* a worker change on the STOP
  path, sequenced against 6.37d; the phrase route changes too. *Cost (c):* a worker write on the STOP path (sequenced against 6.37d) and a
  new column or table for the mark; the phrase route is unchanged. ⭐ (a), told to the Panel (WC11 (a) (3)); (c) is the conservative
  choice if BigDev reads a STOP to a code as the member's "no".
- **WC13 — Go-live.** ⭐ A NEW roster row, KEY `wa-opt-in-code-template-approved` (the next free Row at Task 0.4; Row 38's shape),
  decision-authored, ⛔ a merge fence: **(a)** per live Pariwar, a Meta AUTHENTICATION copy-code template APPROVED (security recommendation
  on, `code_expiration_minutes: 10`), its name set under `wa.template.wa_opt_in.code.<hi|en>.<pariwarId>`, and the key PROVEN to resolve in
  production (the dotted-name caveat, F13; Row 35 (b)'s shape) — or "Meta refuses" recorded; until then the link shows 5.10's phrase (I6);
  **(b)** the 15 `waCode.*` Hindi strings human-reviewed (Row 28's control); **(c)** Meta's India authentication rate recorded from Meta's
  OWN rate card (F21 — the ruling accepted the charge; the figure is unrecorded). Counsel: ⛔ a leg of THIS row — `-374` accepted *"Counsel
  has not been asked"*; but the code route also sits behind Row 38 (b) (counsel's DPDP view on the box, incl. *"the privacy policy naming
  WhatsApp / Meta"* — `docs/legal/privacy-policy.md` — the private corpus copy, gitignored — names neither today) and Row 37 (b) (counsel on the opt-in wording), and behind Row
  38's switch-on legs (c) / (d-i) — the row cross-references them, ⛔ duplicates them. *Cost:* one more open row.
- **WC14 — Records.** ⭐ One author-commit decision (the next free id) carrying WC1–WC17 as answered, the §0 readings (1)–(7),
  "Supersessions: none" (`-374` superseded; this entry builds it), and what it does NOT cover (counsel; the mismatch confirmation; Settings
  if WC6 (a); a STOP's meaning beyond WC12 as answered); an `epics.md` `### Story 5.13` entry (post-hoc, 5.10's shape, after 5.12); a dated
  note under §3.4's opt-in bullets and an "annotated" ADR-0029 changelog row (*"the code route is built: …"*); the roster row; the friction
  row (WC: one `optional` row — Task 6); `deferred-work.md`: annotate the mismatch item (F7 — trigger fired, ⛔ built by 5.13) and the 5.12
  round-2 W2 item (the sweep takes ⛔ lock — a new consumer: a code sent near the PENDING's 48 h lapse can outlive it, and verify then
  answers `not_pending`; row-level safe, both updates are guarded `WHERE state='PENDING'`) — annotated, ⛔ closed — and ADD four items:
  two pre-existing, whole-WhatsApp, ⛔ 5.13's — `graph_api_version` DEFAULT `v21.0` is removed by Meta 2027-01-21, and Meta's INR billing
  deadline 2026-12-31 (F21) — and two 5.13 residuals — a later "not on WhatsApp" (131026) status for a code send is ⛔ correlated to its
  row (WC3), and ⛔ global cost cap / per-device limit on code sends (WC10); the WC11 told item; the ledger. ⛔ edit any ratified sentence.
- **WC15 — A member who switched WhatsApp off before.** ADR-0029's *"Re-opt-in after revoke requires a NEW inbound message"* stands (§0
  reading (6)). ⭐ **(a)** The send route (and `codeAvailable`) refuse a member who has ANY `member_wa_opt_in` row in `REVOKED` or
  `BLOCKED_BY_META` — 409 `wa_opt_in.code_not_offered`; such a member re-opts in by the phrase (the ratified route), shown by the closed
  route. Verify at Task 1 (`git grep` the writers of each state) that only an ENDED YES reaches those two states (a lapsed PENDING is
  `EXPIRED_24H_WINDOW`). NARROWS — the author's. **(b)** Allow it — it WIDENS a ratified sentence ⇒ a routing note to the Panel first
  (template §0), ⛔ built until ruled. *Cost (a):* almost none at signup (a new member has no ended yes); a returning member who withdrew
  types the phrase from the other phone. *Cost (b):* a Panel question and a wait. ⭐ (a).
- **WC16 — A first code that arrives after the second was asked for.** WhatsApp delay is the very reason a member asks again, so the slow
  first code arriving first is the LIKELY path. ⭐ **(a)** A second code does ⛔ invalidate the first: verify compares the typed code
  against EVERY live code of the PENDING (`findLiveCodes` — at most two; each compare `timingSafeHashCompare`, ⛔ early exit); a wrong
  guess is wrong for each code held, so it increments every live row (WC5 step 3); a code dies at its own expiry, use, or second wrong try.
  This also covers a code typed while the second send is still in flight (`sending` — it may already have arrived). **(b)** Keep the
  invalidation, and answer a match on a superseded row with `wa_opt_in.code_replaced` spending ⛔ attempt (a new line: *"Use the newest
  code"*). *Cost (a):* for ≤ 10 minutes two codes are valid at once — a guess has 2-in-a-million odds instead of 1, within the same ≤ 4
  wrong guesses per request (negligible); the compare loop is a helper of its own (F18 (f)). *Cost (b):* a sixteenth string, and a code
  typed during an in-flight resend still burns a try. ⭐ (a).
- **WC17 — The server stands behind "while signing up".** ⭐ **(a)** The send route (and `codeAvailable`) refuse unless
  `getCurrentMemberState(db, memberId)` (`packages/domain/src/member/read.ts:150`) is `pending-kyc` or `pending-fee` — the states a member
  holds at the signup step (5.10 F7: `pending-fee` under SB2 (d) as built, `pending-kyc` under SB2 (a)) — 409
  `wa_opt_in.code_not_offered`. Verify does ⛔ REFUSE on it (a code sent while signing up may be typed a moment after the state moves)
  but reads it under the lock and records it in the consent payload as `memberState` (WC5). NARROWS — the author's. **(b)** ⛔ server check; record `uiContext:
  'signup_step_offer'` (*"the only surface that offers it"*) and tell the Panel the residual. *Cost (a):* one state read per send (a member
  who left signup unfinished and returns still `pending-fee` can use it — still signing up). *Cost (b):* the consent row's UI context is
  the app's word only (§0 reading (4)). ⭐ (a).

**PQ — none, unless BigDev chooses WC6 (b) or WC15 (b)** — each a routing note first (template §0), ⛔ built until ruled. Every other WC is
the author's; WC11 (a) is a TOLD item, ⛔ a question.

### The words (WC8) — APPROVED by BigDev at Task 0.2 (2026-10-21; Debug Log (a))

| Key | en | hi |
|---|---|---|
| `waCode.intro` | TWT will send a code on your WhatsApp number. Open WhatsApp to get the code. | TWT आपके व्हाट्सएप नंबर पर एक कोड भेज रहा है। कोड प्राप्त करने के लिए व्हाट्सएप खोलें। |
| `waCode.send` | Send me a code on WhatsApp | मुझे व्हाट्सएप पर कोड भेजें |
| `waCode.sent` | We sent a code on your WhatsApp number. Valid for a few minutes. | हमने आपके व्हाट्सएप नंबर पर एक कोड भेजा है। यह कोड कुछ देर के लिए ही वैध है। |
| `waCode.sent_uncertain` | We may not have been able to send the code. If it arrives on WhatsApp, type it here. | हो सकता है कोड नहीं भेजा जा सका हो। अगर व्हाट्सएप पर कोड आए, तो उसे यहाँ लिखें। |
| `waCode.input_label` | Code from WhatsApp | व्हाट्सएप से मिला कोड |
| `waCode.confirm` | Confirm | पुष्टि करें |
| `waCode.resend` | Send another code | दूसरा कोड भेजें |
| `waCode.resend_wait` | You can ask for a code again in a minute. | आप एक मिनट बाद फिर से कोड माँग सकते हैं। |
| `waCode.wrong_retry` | That code is not right. Check it and try once more. | यह कोड सही नहीं है। जाँचकर एक बार फिर लिखें। |
| `waCode.wrong_final` | That code is not right, and it can't be used again. | यह कोड सही नहीं है, और अब इसका उपयोग नहीं हो सकता। |
| `waCode.no_longer_valid` | This code is no longer valid. | यह कोड अब मान्य नहीं है। |
| `waCode.send_failed` | We couldn't send a code just now. | अभी कोड नहीं भेजा जा सका। |
| `waCode.verify_failed` | We couldn't check the code just now. | अभी कोड की जाँच नहीं हो सकी। |
| `waCode.no_more` | No more codes can be sent. You can still send the message below. | अब और कोड नहीं भेजे जा सकते। आप फिर भी नीचे दिया गया संदेश भेज सकते हैं। |
| `waCode.done` | WhatsApp messages from TWT are on. | TWT के व्हाट्सएप संदेश चालू हो गए हैं। |

The closed-route lines (`send_failed`, `no_more`, `wrong_final` with no code left) are followed by `OtherPhoneDetails`, whose `waOtherPhone.desc`
already says *"From the phone that has your WhatsApp, send the message below to this number:"* — so ⛔ bridging string is minted.
`waCode.no_longer_valid` avoids "expired" (5.12's ban is on `waNotifications.*` only, but the meaning is "spent, tried twice or timed out" —
one line for all three). *"Valid for a few minutes"* — 10 minutes (WC3), ⛔ a digit (WC8's style choice). ⚠ BigDev's wording says *"your WhatsApp number"*
where the code goes to the REGISTERED number only (I2) — the stated residual in Debug Log (a); ⛔ change the words for it. `send_failed`'s *"just now"* is true for its causes once WC4's `codeAvailable` keeps unprovisioned
Pariwars off the form — the one exception, a member there who still holds a live code (`liveCode`), opens at the field with the closed
route and ⛔ send button, so ⛔ "couldn't send" is shown to them before they try. `verify_failed` is shown only after a bounded status re-read finds the request still PENDING (AC9).
`waCode.send` is shown while the member has ⛔ been told a code may have been sent (only `released` / `refused` sends so far);
`waCode.resend` (*"Send another code"*) only once they were TOLD (a 200, a non-`ApiError` Send, an `ApiError` ≥ 500 with unparseable details — AC9 — or the mint's `liveCode: true`) — so ⛔ string claims a code was sent when none was told. `code_not_offered` → `send_failed` + the closed route; `not_pending` (on Send OR Verify — the request lapsed) →
`no_longer_valid` alone (its phrase has lapsed too, so ⛔ closed route is shown). Task 2 runs the microcopy
gate on the committed JSON; fix wording, ⛔ the rule.

## Acceptance Criteria

**AC1 — The link on the signup step offers the code only where it can work (I1, I6; WC4, WC6, WC7, WC15, WC17).** Given a member on
the signup step's `sent` stage after a mint: when the mint said `codeAvailable: true`, a collapsed `waOtherPhone.link` control
(`OtherPhoneCodeHint`, `wa-code-link`) is shown; expanded, it shows `waCode.intro` and the send or resend button per AC9 — ⛔ the number + phrase;
when the mint said `liveCode: true` (with `codeAvailable` true OR false — two codes spent and one still live), it renders and opens
EXPANDED at the code field with `waCode.sent` or `waCode.sent_uncertain` per `liveCodeDelivery` (and, at `codesRemaining: 0`, the
closed route below). When `codeAvailable: false` AND
`liveCode: false`, `OtherPhoneHint` renders exactly as 5.10 built it (number + phrase behind `wa-other-phone-link`). On the `ask` stage with
`error === 'link'` after a mint: the link renders ONLY when `codeAvailable || liveCode`; otherwise the `ask` stage renders exactly as 5.10
built it (⛔
hint). Without a mint, or on any other stage, ⛔ link. `(settings)/notifications.tsx` and its PENDING hint are unchanged in behaviour (its
render tests pass unmodified). The mint's `codeAvailable` is `true` only for an enabled, complete config with a resolvable template name
(`hi` or `en`) AND a resolvable token, `codesRemaining > 0`, a `pending-kyc` / `pending-fee` member, and ⛔ REVOKED / BLOCKED_BY_META row,
on both the new and the re-used PENDING paths; any resolution throw or a resolution slower than `CODE_AVAILABILITY_TIMEOUT_MS` ⇒ `false`
(and the mint still answers). *Legs:* render tests — sent stage with `codeAvailable: true` (collapsed, then expanded: intro + send; ⛔
`wa-other-phone-number`), with `liveCode: true` (opens at the field; `sent` vs `sent_uncertain` by `liveCodeDelivery`), with
`codeAvailable: false` + `liveCode: true` (the form renders, opens at the field, the closed route below), and with both `false` (5.10's
hint); ask + link-failed with a mint and
`true` (link shown) and `false` (⛔ link — 5.10's render); ask with a request failure (⛔ link); a source assertion that
`notifications.tsx` still renders `OtherPhoneHint`; API legs for `codeAvailable` / `codesRemaining` / `liveCode` / `liveCodeDelivery` (the newest live row
`accepted` ⇒ `'sent'`; `may_have_sent` or a stranded `sending` ⇒ `'uncertain'`; none ⇒ `null`; two live rows ⇒ the newest decides; name
unresolvable; token
unresolvable; config incomplete; re-used PENDING with 0, 1 and 2 counted sends; an `active` member; a member with a REVOKED row; a
resolver that HANGS — the mint answers inside the bound with `codeAvailable: false` and the database-derived fields kept), each with a `resolveChannelSecret` override (F13).

**AC2 — A send (I1, I2, I7; WC1, WC3, WC4, WC15, WC17).** `POST /api/v1/member/wa-opt-in/code` (body `{}` — `.strict()`; the api-client
sends `{}` — [[project_fastify_empty_json_body_400]]), member session + per-member rate limit, in WC1's five steps. Unprovisioned (WC1
step 1 — config, name, token, decrypt, `messagingFor`, or the 3 s bound) → 503 `wa_opt_in.code_unavailable` with ⛔ row, ⛔ audit line, ⛔
fetch, its `details` from step 0's reads. Refusals decided at step 0 (advisory) and re-decided under `lockMemberWaYes` at step 2,
BEFORE any audit line, in WC1's ORDER: WhatsApp off → 409 `wa_opt_in.channel_unavailable`; ⛔ PENDING → 409 `wa_opt_in.not_pending`
(ACTIVE → `wa_opt_in.already_active`); a member past signup (WC17) or with an ended yes (WC15) → 409 `wa_opt_in.code_not_offered`; two counted sends → 409 `wa_opt_in.code_limit_reached`; inside the wait (WC3) → 409
`wa_opt_in.code_resend_too_soon`. Otherwise the server generates a 6-digit code, stores ONLY its hash with `expires_at = now() + 10 min`
(DB clock) in a `sending` row with `send_seq` = the lowest free of {1, 2} (WC2), calls Meta, and records the outcome per WC3's table
(`WHERE send_outcome = 'sending'`), COMMITTED before any error is thrown. 200 `SendWaOptInCodeResponse { delivery: 'sent' | 'uncertain',
codesRemaining: 0 | 1, retryAfterSeconds: number | null }`; `released` and `refused` → 502 `wa_opt_in.code_send_failed`; `scope` → 503
`wa_opt_in.code_unavailable`; every error's `details` is a `WaOptInCodeErrorDetails` (`codesRemaining: 0 | 1 | 2`, `liveCode`,
`retryAfterSeconds?`, `attemptsRemaining?`). *Legs (live DB, :5433, the recording transport — the ONLY fake beside the per-spec
`resolveChannelSecret` override):* happy path (the recorded request's `to` = the identity's decrypted mobile without `+`, computed by the
REAL resolution; the body + button parameters equal the code; the row holds a 64-hex hash ≠ the code; `expires_at − created_at` = 10
min); each step-0 refusal (⛔ fetch call, ⛔ audit line, ⛔ KMS audit line — ⛔ decrypt); the ORDER (unprovisioned + two codes spent ⇒ 409
`code_limit_reached`, ⛔ 503; ACTIVE + WhatsApp off ⇒ `channel_unavailable`); WhatsApp switched off between step 0 and tx 1 ⇒
`channel_unavailable`, ⛔ row, ⛔ fetch, exactly ONE KMS audit line (step 1 decrypted — WC1 cost (a)); each unprovisioned case incl. a name that resolved at the mint and fails at the send
(⛔ row, ⛔ audit line, ⛔ fetch); each row of WC3's table driven by the recorded transport — incl. 429 → `released` with a 60 s wait,
connection refused → `released` with ⛔ wait, 503 → counted `may_have_sent`, 131026 → counted `refused`, **131048 on a 429 → uncounted
`scope` + 503** (F12 order), a REAL `'timeout'` abort via the test `timeoutSignal` → counted `uncertain`; after a `released` first send
the details say `codesRemaining: 2` and a retry takes seq 1 again; a `released` row read on a SEPARATE connection after the 502 (the
commit-then-throw rule); an accepted send #2 leaves code #1 LIVE (WC16 (a)); another member's PENDING is never used; **a
comments-stripped source assertion that `code-handlers.ts`, `code-delivery.ts` and the mint's new reads in `handlers.ts` pass ⛔
`deps.db` / `deps.pool` to a domain read** (each read runs in a scope tx, or on `deps.serviceDb` Pariwar-filtered — ⛔ for the WC17 state read, which only a scope tx may do — T19: CI's superuser cannot see the
defect, so only a source leg can).

**AC3 — The database caps the codes, and the lock serializes them (I3; WC2).** The migration's constraints refuse what I3 names,
independent of the handler; RLS isolates Pariwars. *Legs (live DB, raw SQL as `twt_app`):* a third counted row for one PENDING fails
(23505 / 23514); `attempts = 3` fails; an UPDATE `accepted → released` fails (the guard); `attempts 1 → 0` fails; clearing `consumed_at` /
`invalidated_at` fails; consuming a row with `attempts = 2` fails (CHECK); an UPDATE of `code_hash` as `twt_app` fails on the GRANT (42501), and — run as the migration owner (full UPDATE) so the TRIGGER is what
refuses — updates of `code_hash`, `send_seq`, `expires_at` and `opt_in_id` fail; a
reference to another Pariwar's or another member's opt-in fails (the owner FK); **three CONCURRENT sends for one PENDING (separate
connections — [[project_db_clock_ordering_tests_tie]]) yield EXACTLY ONE counted row and two 409 `wa_opt_in.code_resend_too_soon`** (a
missing lock would let two through); **the seq ordering: seq 1 `sending`, seq 2 claimed and `accepted`, seq 1 then `released` ⇒ the next
claim takes seq 1, ⛔ a 23505**; an RLS regression spec at `packages/domain/tests/integration/rls/` on the 0172 pattern + the cross-Pariwar
probe (`packages/domain/tests/integration/multi-tenant/cross-pariwar-leak.spec.ts`) reads / writes ⛔ row. The migration is hand-authored
and forward-only; ⛔ regenerate an applied migration ([[project_live_db_test_gotchas]]).

**AC4 — A typed code (I3, I5; WC3, WC5, WC16).** `POST /api/v1/member/wa-opt-in/code/verify` `{ code }` (`/^\d{6}$/`; anything else 400
`request.validation`, ⛔ an attempt), in WC5's order. Correct (matching ANY live code of the PENDING) → in ONE tx under
`lockMemberWaYes`, audit-first (`member.wa_opt_in_activated`, `member_app_wa_code`): that code consumed, a `whatsapp_opt_in` consent row
(`member_self`, payload `{ source: 'member_app_wa_code', uiContext: 'signup', memberState, codeId }`), the PENDING → ACTIVE with
`window_expires_at` NULL and `consent_id` set; 200 `{ state: 'ACTIVE' }`. Wrong, first try → every live code's attempt COMMITTED, 409
`wa_opt_in.code_wrong` `details: { attemptsRemaining: 1, codesRemaining, liveCode: true }`; wrong, second try → each code at 2
invalidated (committed), 409 `wa_opt_in.code_wrong` `details: { attemptsRemaining: 0 or 1, codesRemaining, liveCode }`; ⛔ live code (spent,
expired, none sent) → 409 `wa_opt_in.code_no_longer_valid` `details: { codesRemaining, liveCode: false }`; the PENDING already ACTIVE (the
phrase won) → 409 `wa_opt_in.already_active`; ⛔ PENDING → 409 `wa_opt_in.not_pending`; `activateOptIn` 0 rows (the sweep won) → 409
`wa_opt_in.invalid_state`. A failure inside the correct-code `mutate` rolls the whole tx back (the code NOT consumed) and writes
`…_rolled_back`. *Legs (live DB):* each branch; **after a wrong code, `attempts = 1` is COMMITTED (read on a separate connection) and ⛔
`member.wa_opt_in_activated*` row exists**; **code #1 typed after an accepted send #2 → 200** (WC16); a wrong guess with two live codes
increments BOTH; the consent row + ACTIVE row written together (and NEITHER when `activateOptIn` fails — forced through a NAMED seam, a
test-only `activateOptIn` override on the verify handler's deps (Task 4.4), since the unlocked sweep race cannot be timed
deterministically; the `invalid_state` answer is proved through the same seam); two concurrent correct verifies →
one 200, one 409; expiry by setting `expires_at` in the past in a separate committed statement (⛔ waiting 10 minutes); **a
comments-stripped source assertion over the verify path: it contains `timingSafeHashCompare(` and ⛔ `===` / `!==` touches `codeHash`**
(F18 — invariant (f) cannot see it).

**AC5 — It is the same yes (I5; F6).** After a code-confirmed ACTIVE: `GET /api/v1/member/wa-opt-in` shows `state: 'ACTIVE'`;
`isOptInActive` and `consentExists(…, 'whatsapp_opt_in')` are both true (6.31's reminder reads both); the in-app revoke ends it (ACTIVE →
REVOKED, the consent row revoked); a later mint answers `wa_opt_in.already_active`; after that revoke, a new PENDING's `codeAvailable` is
`false` and a send answers `code_not_offered` (WC15). *Legs (live DB):* status; the two reads; revoke; the post-revoke refusal. (STOP and
131050 go through `endEveryWaYes` on the ACTIVE row whatever its route — unchanged; ⛔ new worker leg unless WC12 (b) / (c) is chosen.)

**AC6 — A code is a WhatsApp switch, nothing else (I4, I7).** The code store is `member_wa_opt_in_codes` only; ⛔ change to
`member_auth_otps`, `member-otp.service.ts` or any session / step-up path; a code never issues a token. The code appears in ⛔ log, audit
line, error envelope or response body. *Legs:* response bodies and the audit rows of a full send → wrong → correct run hold neither the code
nor its hash; a source assertion that `apps/api/src/modules/wa-opt-in/**` imports ⛔ `member-otp.service` or the auth repo (it MAY import
the `otp.ts` primitives); the injected `log` of `code-delivery.ts` is spied across every WC3 outcome and every WC1 step-1 failure class and
never receives the code, a secret name, or the mobile.

**AC7 — The WhatsApp request (WC1).** `whatsapp-app.ts`'s new shape builds `{messaging_product:'whatsapp', to, type:'template',
template:{name, language:{code}, components:[{type:'body', parameters:[{type:'text', text: code}]}, {type:'button', sub_type:'url',
index:'0', parameters:[{type:'text', text: code}]}]}}`; the code is 1–15 non-blank characters (else a `WhatsappTemplateParamError`); the
`bodyParam` / `bodyParams` bodies are byte-unchanged. *Legs:* unit tests on `buildRequestBody` (the auth body exactly; the two existing
shapes unchanged); AC2's recorded request (end to end); the access-wrapper invariants still pass over `packages/channels/src`.

**AC8 — No stand-in (I6; WC1, WC4).** With ⛔ template name resolvable (neither `hi` nor `en`), a token that will not resolve, or a config
missing `phoneNumberId` / `accessTokenSecretName`, the send answers 503 `wa_opt_in.code_unavailable`; with `enabled: false`, 409
`channel_unavailable`; either way it makes ⛔ call to Meta; `deps.ts` wires the real resolution and transport in every environment; ⛔ code path
selects `createFixtureWhatsappProvider` or any adapter that reports success without a call. The app, on `code_unavailable`, shows
`waCode.send_failed` + `OtherPhoneDetails` (number + phrase from the mint). *Legs:* API — the unprovisioned cases assert ZERO calls on the
recording transport (a seam that cannot be bypassed: the resolution under test is the production one) AND ⛔ row; a source assertion that
`code-delivery.ts` and `deps.ts`'s code wiring import ⛔ fixture; mobile — the fallback render.

**AC9 — The code form on the phone (I6; WC3, WC7, WC16).** `useWaCode` + `WaCodeEntry`. **Send** (`wa-code-send` while the member has ⛔ been told a code may have been sent; `wa-code-resend` once the member was TOLD (a 200, a non-`ApiError` Send, an `ApiError` ≥ 500 with unparseable details — AC9 — or the mint's `liveCode: true`), while `codesRemaining === 1` or the count is unknown — and neither button on a
mint-driven open with `codeAvailable: false`, which shows the closed route instead): 200 `sent` → `waCode.sent` + the field (`keyboardType="number-pad"`, `maxLength={6}`, digits-only
`onChangeText`, `accessibilityLabel={t('waCode.input_label')}`, ⛔ `textContentType` / `autoComplete`) + `waCode.confirm` (disabled under
6 digits); 200 `uncertain` OR any non-`ApiError` failure (a client timeout, a dropped connection) → `waCode.sent_uncertain` + the field (a
code may still arrive) and — the count now unknown — `wa-code-resend` offered after 60 s, the server's 409 deciding; the resend button
disabled with `waCode.resend_wait` for `retryAfterSeconds` (a countdown from the response, ⛔ the device clock), then enabled. **Send
errors** (read as `err instanceof ApiError && err.code`, details through `WaOptInCodeErrorDetails`): `code_resend_too_soon` → `resend_wait` for
`details.retryAfterSeconds`, the field only if `details.liveCode`; `rate_limit.exceeded` (429 — it carries ⛔ `WaOptInCodeErrorDetails`, and this arm wins over the unparseable-details catch-all below)
→ keep the form + `resend_wait` for 60 s; `code_send_failed` with `codesRemaining === 2` (a released FIRST send) → `send_failed` + the
send button (after any `retryAfterSeconds`), ⛔ `OtherPhoneDetails` yet; `code_send_failed` with `codesRemaining === 1` → `send_failed` +
the send / resend button (after any wait) + `OtherPhoneDetails`, the field kept if `liveCode`; `code_send_failed` with 0 left, `code_limit_reached` (`no_more`), `code_unavailable`,
`code_not_offered`, `channel_unavailable`, any other 4xx `ApiError` (401) → `send_failed` (or `no_more`) + the closed route, the field
kept if `liveCode`; `not_pending` → `no_longer_valid` alone; (the `wa_opt_in.*` code arms above match FIRST — e.g. step 1's 503 `code_unavailable` is
`send_failed` + the closed route, ⛔ `sent_uncertain`); an `ApiError` whose code is ⛔ a `wa_opt_in.*` code (`internal.error`,
`http.5xx`), with status ≥ 500 and `details` that do ⛔ parse as
`WaOptInCodeErrorDetails` (a 500 after the claim committed, a proxy 502 / 504 arriving as `http.50x`) → treated like a non-`ApiError`
(`sent_uncertain` + the field); details that do ⛔ parse on any other `wa_opt_in.*` code → treated as ⛔ details (the line, ⛔ field, ⛔ resend);
`already_active` → done. **Verify:** 200 → `onActivated` → the `activated` flag replaces the showing
stage body (`ask` or `sent`) with `waCode.done` and clears `error`; Continue → `/(signup)/payment`. `code_wrong` with `attemptsRemaining
>= 1` → `wrong_retry`, the field cleared; `code_wrong` with `attemptsRemaining === 0` → `wrong_final` + resend if `codesRemaining >= 1`,
else the closed route; `code_no_longer_valid` → `no_longer_valid` + resend if `codesRemaining >= 1`, else the closed route; `not_pending`
→ `no_longer_valid` alone (the request lapsed — its phrase too); `already_active` → done; a verify that times out or fails otherwise (incl.
`invalid_state`) → ONE bounded `getWaOptInStatus` re-read: `ACTIVE` → done; `PENDING` → `waCode.verify_failed` with the field kept; any
other state → `no_longer_valid` alone. Every call bounded (`withTimeout`, `CALL_TIMEOUT_MS`); ONE call in flight (a `useRef` busy
guard); late results after blur / unmount dropped (the hook's own version counter — ⛔ bumped by a collapse); errors as `AnnouncedText
kind="error"`; `waCode.sent` / `sent_uncertain` via `useAnnounceOnChange` keyed on a send counter (so a second `sent` is spoken),
`waCode.done` from `whatsapp.tsx`. *Legs:* one per mapping with REAL `ApiError` instances, incl. a released first send → `send_failed` +
`wa-code-send` enabled with ⛔ wait and ⛔ number + phrase yet; 429; 500; a transport rejection; the resend countdown under fake timers; ⭐
the double-tap legs fire BOTH presses inside ONE `act()` (5.10 AC6 — a state-only guard passes two separate clicks); **send → collapse →
expand ⇒ still at the field, countdown intact, ⛔ second request**; a paste of "123 456" ⇒ "123456"; the closed route shows
`wa-other-phone-number` / `wa-other-phone-phrase` with the mint's values; activation on the `ask` stage hides the box and `link_failed`;
the `sent` stage's return announcement ⛔ fires after activation; both `Platform.OS` values for the announcements.

**AC10 — The words (WC8).** All 15 `waCode.*` keys exist in en AND hi `common.json` (flat dotted keys); every key is used as a LITERAL
`t('waCode.…')` (⛔ a key-map indirection the scan cannot see) in `OtherPhoneCodeHint.tsx`, `WaCodeEntry.tsx`, `OtherPhoneDetails.tsx`,
`use-wa-code.ts` or `whatsapp.tsx`, and resolves through the REAL `t()` ([[feedback_stub_must_call_not_transcribe]]);
`wa-signup-copy-keys.test.ts`'s `FILES` gains those files and its `EXPECTED` list the `waCode.*` keys; the scanned `waCode.*` set EQUALS
the 15-key family in en, with hi equal; ⛔ `{token}`; the ban list applies to `waCode.*`; `wa-notifications-copy-keys.test.ts` still scans
`OtherPhoneHint.tsx` and GAINS `OtherPhoneDetails.tsx` (the `waOtherPhone.*` keys moved there — a copy-test edit, ⛔ a render-test edit);
i18n parity and the microcopy gate pass. *Legs:* the copy-key tests; parity and microcopy outputs in the Debug Log.

**AC11 — Audited per send, per attempt, per consume (WC9; F18).** Each claimed send writes `member.wa_opt_in_code_sent`; each release
(incl. `scope`) `member.wa_opt_in_code_released`; each wrong / no-live-code attempt `member.wa_opt_in_code_rejected` (committed although
the request answers 409); each success `member.wa_opt_in_activated` — all with `member_app_wa_code`, all through `withCompensatingAudit`;
a refusal decided before the wrapper, and a WC1 step-1 failure, write ⛔ line; the access-wrapper invariants pass (⛔ bare
`writeAuditEntry` in `apps/api/src/modules/wa-opt-in`; ⛔ variable-to-variable compare inside `resolveCodeDelivery` or the verify
helper). *Legs (live DB):* the audit rows per branch (action, resource locator, actor = the member, ⛔ `_rolled_back` on a wrong code or
a released send); the invariant gate output.

**AC12 — Records and gates (WC13, WC14).** The decision committed ALONE before any code; the records commit (epics.md entry, §3.4 dated
note, ADR-0029 annotated row, roster row `wa-opt-in-code-template-approved` legs (a)–(c) + its cross-references, the friction row +
disposition, the `deferred-work.md` annotations + four items, the told item if WC11 (a), the ledger) before code; the `write.ts` pin
re-taken in `claim-contact-ladder-whatsapp.test.ts` with a dated comment and ⛔ other pin changed; the `waTemplateConfigKey` /
`TEMPLATE_NAME_FORM` move keeps every apps/jobs test green with its imports unchanged (the re-exports); the OpenAPI emit regenerated and
its determinism check green; contracts vitest run ([[project_contracts_tests_outside_tsc]]); `pnpm friction:check` AFTER the code commit
reports basis `row`; `ci:local` green on :5433 at the final commit with `DATABASE_URL` set (⛔ `env -u`); mobile `tsc` with and without
typed routes.

**AC13 — Signup never waits on the code (I6).** Continue is available on every state of the code form and always routes to
`/(signup)/payment`; ⛔ code-form state blocks it; a hang in a code call never holds the step beyond `CALL_TIMEOUT_MS`; a Secret Manager
stall never holds the MINT beyond `CODE_AVAILABILITY_TIMEOUT_MS` + its own work (AC1). The step's existing legs (5.10 AC1–AC12) pass,
amended ONLY where the hint changed (the AC12-signup legs run with `codeAvailable: false, liveCode: false` to keep proving 5.10's hint, and new legs cover
`true` — annotated in the test, ⛔ deleted). *Legs:* Continue from each code-form state; the amended 5.10 legs.

## Tasks / Subtasks

- [x] **Task 0 — Preflight, decisions, governance (AC12)**
  - [x] 0.1 (DONE 2026-10-21 — Debug Log (e)) `git fetch origin`; if `main` moved past the pin, rebase and re-derive F1–F21 (`sed -n` every cite, read past the range). STOP
        and report to BigDev if:
        **S1** the mint gained a member-state guard, or `activateOptIn` / `lockMemberWaYes` / the one-ACTIVE index changed shape;
        **S2** another branch/worktree edits `apps/mobile/app/(signup)/whatsapp.tsx`, `OtherPhoneHint.tsx`, `wa-opt-in/write.ts`,
        `whatsapp-app.ts`, `wa-template-config-key.ts`, `claim-peer-mesh-wa-reminders.ts` or the wa-opt-in API module
        (`git for-each-ref` + `git diff`);
        **S3** — ⛔ a stop: if a migration after 0177 exists on any ref, RE-DERIVE the next free number (it is the first commit's);
        **S4** a `waCode.*` key is already taken in either locale;
        **S5** a routing note, told item or decision after the pin touches the WhatsApp code (`git log bac71abb..origin/main -- _bmad-output/planning-artifacts .decision-log.md`);
        **S6** the signup step's placement or the member state it sees changed (5.10 SB2 (d) ⇒ `pending-fee`; WC17 rests on it), or
        ADR-0029's re-opt-in sentence was superseded (WC15 rests on it).
  - [x] 0.2 (WC1–WC17 ANSWERED 2026-10-21, the WC8 words APPROVED with one residual — Debug Log (a)) Put WC1–WC17 to BigDev — incl. the en + hi words (WC8) — and record the answers VERBATIM in Debug Log (a), with what each
        resolves to. If WC6 (b) or WC15 (b): write the routing note from the template (§0 first; WC15 (b)'s names ADR-0029's re-opt-in
        sentence) and build the (a) option meanwhile. If WC12 (b) or (c): sequence the worker change against 6.37d before Task 4.
  - [x] 0.3 (DONE 2026-10-21 — Decision `2026-10-21-376`, committed ALONE `7bc9dbf8`) Author-commit decision (the next free id — re-grep `^### Decision` on `main`, every branch, every worktree), staged in the
        scratchpad first ([[project_decision_log_writes_user_inserted]]); carries WC1–WC17 as answered, the §0 readings (1)–(7),
        "Supersessions: none", what it does NOT cover. Committed ALONE (`governance:` prefix); its SHA written only after.
  - [x] 0.4 (DONE 2026-10-21 — the records commit after `7bc9dbf8`: epics `### Story 5.13`; the §3.4 note; the ADR-0029 annotated row;
        roster Row 39 `wa-opt-in-code-template-approved`; `deferred-work.md` four items + two annotations; the told item
        `trustee-panel-told-2026-10-21-5-13-whatsapp-code-as-built.md` WRITTEN, then TOLD 2026-10-21 (BigDev: *"note for panel has been
        sent"*); the friction row (`optional`) + disposition;
        ledger `2026-10-21v`; row → in-progress) Records commit: `epics.md` `### Story 5.13` (after 5.12, before `---`; 5.10's format); a §3.4 dated note under the opt-in bullets
        (the bullets unedited); an ADR-0029 changelog "annotated" row; roster row `wa-opt-in-code-template-approved` (next free Row; Row 38's
        shape; legs per WC13 as answered); `deferred-work.md` — a dated note on the mismatch item (*"trigger fired by `-374`; ⛔ built by 5.13
        — re-trigger: the first production WhatsApp opt-in"*) and the two new items (Graph `v21.0` removal 2027-01-21; INR billing by
        2026-12-31), the two 5.13 residuals (the uncorrelated later 131026; ⛔ global / per-device cap — WC14), and a dated note on 5.12
        round-2 W2 (a new consumer — WC14); the WC11 told item with its five points (WRITTEN — ⛔ "told" until sent); the
        friction row (Task 6); ledger entry (safe prepend — [[project_sprint_status_safe_prepend]]); row `5-13-…` `ready-for-dev →
        in-progress` (the create-story commit moved it `backlog → ready-for-dev`).
- [x] **Task 1 — The code table (WC2; AC3)** (DONE 2026-10-21 — migration 0178; Debug Log (b), (d), (f))
  - [x] 1.1 The next free migration `NNNN_member-wa-opt-in-codes.sql`, HAND-AUTHORED (F5b), + journal entry (`when` > `1794800400021`) +
        Drizzle schema `packages/domain/src/schema/member_wa_opt_in_codes.ts` (exported from the schema index): columns; the CHECKs, the
        partial unique, the BEFORE UPDATE guard trigger and the column-limited UPDATE grant of WC2 (the grant and the trigger in
        LOCKSTEP); the UNIQUE `(pariwar_id, member_id, opt_in_id)` on `member_wa_opt_in` and the composite owner FK to it, `ON DELETE
        CASCADE` (the 0175 precedent); RLS ENABLE+FORCE with PER-VERB tenant policies on the 0172 pattern + a `packages/domain/src/policies/`
        entry (the `claim-contact-wa-rls.ts` precedent). ⛔ edit an applied migration. `git grep` the writers of `REVOKED` and
        `BLOCKED_BY_META` and record in Debug Log (f) that only an ended yes reaches them (WC15).
  - [x] 1.2 `packages/domain/src/wa-opt-in/code.ts` (exported from `wa-opt-in/index.ts`), every function RETURNING a discriminated result
        (⛔ throwing for a refusal — WC2, WC5): `checkCodeSendAllowed(tx, { pariwarId, memberId, memberState, config })` (lock-free at WC1
        step 0 as an advisory check; under the caller's `lockMemberWaYes` at step 2), in WC1's ORDER: channel / ⛔ PENDING / already ACTIVE / `not_signing_up` (WC17 — the state passed in) / `yes_ended_before` (WC15) / limit /
        the WC3 wait → a refusal + `retryAfterSeconds` (`clock_timestamp()`, clamped)), `insertCodeSlot` (`sending`, `send_seq` = the
        lowest free of {1,2}, the hash, DB-clock expiry → `{codeId, sendSeq, codesRemaining}`), `recordCodeSendOutcome` (`WHERE code_id = $1
        AND send_outcome = 'sending'`; `accepted` + wamid / `may_have_sent` / `refused` / `released` + detail — ⛔ invalidation of the
        earlier code, WC16), `getCodeState` (`{ codesRemaining, liveCode, liveCodeDelivery }` for the mint and the error
        details — `liveCodeDelivery` by WC4's rule: the NEWEST live row `accepted` ⇒ `'sent'`, `sending` / `may_have_sent` ⇒ `'uncertain'`,
        ⛔ live row ⇒ `null`), `findLiveCodes` (WC2's
        definition; returns the hashes), `recordWrongAttempt` (ONE `UPDATE … SET attempts = attempts + 1, invalidated_at = CASE WHEN attempts +
        1 >= 2 THEN now() ELSE invalidated_at END` over EVERY live row — two statements would trip the CHECK; a no-op with ⛔ live code;
        returns `{attemptsRemaining, codesRemaining, liveCode}` — ⚠ a still-`sending` row is counted in `attemptsRemaining`; if it is
        later released the member was told of a try on a code that never left: accepted, stated), `consumeCode(codeId)` (atomic, `WHERE consumed_at IS NULL AND
        invalidated_at IS NULL AND attempts < 2 AND expires_at > now()`).
  - [x] 1.3 Live-DB tests (AC3 — every raw-SQL constraint and guard leg, the seq-ordering leg (the HTTP concurrency leg is Task 4.6's), the RLS
        regression spec in `packages/domain/tests/integration/rls/` + the cross-Pariwar probe).
- [x] **Task 2 — The words (WC8; AC10)** (DONE 2026-10-21 — Debug Log (c))
  - [x] 2.1 Add the 15 `waCode.*` keys (as answered at 0.2) to en + hi `common.json`; hand-format ([[project_prettier_not_enforced]]).
  - [x] 2.2 Parity + microcopy gates; fix wording (⛔ the rule) if they bite — and tell BigDev any reworded string.
- [x] **Task 3 — The WhatsApp message and the template key (WC1, WC4; AC7)** (DONE 2026-10-21)
  - [x] 3.1 `whatsapp-app.ts`: the `authenticationCode` message shape + `buildRequestBody` button component + the param check; unit tests.
  - [x] 3.2 Move `waTemplateConfigKey` (+ its purpose union) and `TEMPLATE_NAME_FORM` to `packages/channels/src/wa-template-config-key.ts`
        (re-exported from the package index); the old homes become one-line re-exports (`apps/jobs/src/scheduler/wa-template-config-key.ts`;
        `TEMPLATE_NAME_FORM` in `claim-peer-mesh-wa-reminders.ts`), so the four importers (F13) are unchanged (⛔ behaviour change); add
        `'wa_opt_in.code'`; the jobs suites green.
- [x] **Task 4 — The server (WC1, WC3–WC5, WC9, WC10, WC15–WC17; AC1, AC2, AC4–AC6, AC8, AC11)** (DONE 2026-10-21 — Debug Log (b))
  - [x] 4.1 `write.ts`: `windowExpiresAt: Date | null` (JSDoc says why); re-take ONLY its pin in `claim-contact-ladder-whatsapp.test.ts` with
        a dated comment (F14). `audit.ts`: append `'member_app_wa_code'` (a TS const tuple — confirm ⛔ exhaustive map over it). Amend the now-stale comments: `packages/contracts/src/wa-opt-in/
        opt-in.ts:55` (*"present (non-null) ONLY while ACTIVE"* — a code-confirmed ACTIVE has it NULL) and the `window_expires_at` column
        comment in `schema/member_wa_opt_in.ts` (a comment-only edit — ⛔ migration).
  - [x] 4.2 Contracts: `CreateWaOptInResponse` gains `codeAvailable: z.boolean()`, `codesRemaining: 0|1|2`, `liveCode: z.boolean()`,
        `liveCodeDelivery: z.enum(['sent','uncertain']).nullable()` (WC4);
        NEW `SendWaOptInCodeRequest` (`z.object({}).strict()`), `SendWaOptInCodeResponse` (`{ delivery: z.enum(['sent','uncertain']),
        codesRemaining: 0|1, retryAfterSeconds: number|null }`), `VerifyWaOptInCodeRequest` (`{ code: /^\d{6}$/ }`),
        `VerifyWaOptInCodeResponse` (`{ state: z.literal('ACTIVE') }`), `WaOptInCodeErrorDetails` (`{ codesRemaining: 0|1|2, liveCode:
        boolean, retryAfterSeconds?: number | null, attemptsRemaining?: 0|1 }` — the server builds every code error's `details` from it; the app
        parses `ApiError.details` (typed `unknown`, `api-client/src/index.ts:203`) with it), all `.strict()`, camelCase; add each to the
        EXPLICIT named-export list of `packages/contracts/src/wa-opt-in/index.ts`; in `emit-openapi.ts` the schema import (`:164`), the
        components map (`:426-431`) and both paths (from `:1526`), then regenerate `openapi/v1.yaml`; contracts vitest — the fixture that
        turns red is `packages/contracts/tests/wa-opt-in.test.ts:45-52` (a strict parse without the new fields); update the mobile `MINTED`
        fixture (`wa-signup-step-render.test.ts:132` — fed to a `vi.fn()`, so it never parses: update it for realism, ⛔ expect a red).
  - [x] 4.3 `apps/api/src/modules/wa-opt-in/code-delivery.ts` (WC1, WC4): `resolveCodeAvailability(deps, { pariwarId, config })` (config
        completeness — the config read by the caller's scope tx; the `hi` and `en` template names IN PARALLEL via `deps.resolveChannelSecret`, `TEMPLATE_NAME_FORM`-checked; the
        token, non-blank — ⛔ decrypt) for the mint, and `resolveCodeDelivery(deps, { pariwarId, config, mobileCiphertext })` (the
        same + the decrypt + `+` stripped + `messagingFor(…)` built; ⛔ database handle — both take step 0's reads as input) for the send — each `{ ok: false, reason }` | a plan, each raced against its bound
        (`CODE_AVAILABILITY_TIMEOUT_MS = 2_000` / `CODE_RESOLVE_TIMEOUT_MS = 3_000`); `sendCode(plan, code)` = ONLY `plan.messaging.send(…,
        { timeoutMs: 10_000 })` inside the `try` whose `catch` runs `classifyDirectWaSendFailure` into WC3's table; an injectable `log`
        (class tokens only). ⚠ Both resolvers call `resolveChannelSecret` ⇒ invariant (f) scans them (F18, T5): keep the secret reads in a
        small helper of their own and ⛔ variable-to-variable compare in its body. Add `waCodeTransport: { fetchImpl, timeoutSignal? }` to
        AppDeps in `apps/api/src/context.ts` (`resolveChannelSecret` is ALREADY there — F13); `deps.ts` wires the global `fetch` + the
        default signal in EVERY environment (⛔ reveal / log adapter); `_setup.ts` injects a RECORDING fetch (requests captured, responses
        scripted per test) and a test `timeoutSignal`, and specs pass a `resolveChannelSecret` override (F13).
  - [x] 4.4 `code-handlers.ts` + routes in `routes.ts`: the two routes (member session, the per-member rate limit with `hook: 'preHandler'`,
        body schemas); the send flow in WC1's five steps — step 0 the read-only scope-tx pre-check (every DB read, then closed);
        step 1 `resolveCodeDelivery` on step 0's config + ciphertext, ⛔ tx open (a failure → 503 with step 0's details, ⛔ row, ⛔ audit,
        ⛔ fetch); step 2 tx 1: lock → re-read the config + `getCurrentMemberState` → `checkCodeSendAllowed` (a refusal → commit nothing, ⛔ audit,
        then throw) → `withCompensatingAudit(code_sent, insertCodeSlot)` → commit; step 3 `sendCode` outside any tx; step 4 tx 2: lock →
        `recordCodeSendOutcome` (`released` inside `withCompensatingAudit(code_released, …)`) → `ok = true` → COMMIT → THEN throw the
        502 / 503 after the `finally`; the verify flow in WC5's three steps (commit, THEN throw; the compare in its own `matchCode` helper);
        refusals as `ConflictError(msg, code, details)` with `details` built from `WaOptInCodeErrorDetails`; map `wa_opt_in.invalid_state`
        where `activateOptIn` loses to the sweep; verify reads `getCurrentMemberState` under the lock for the consent payload (WC5); AC4's
        named seam is a NEW AppDeps field `waOptInActivate` (production default `waOptIn.activateOptIn`, wired in `deps.ts`, overridable via
        `TestDepsOverrides`) that the verify path calls. Step 0's reads in their own read-only scope tx (T19); ⛔ tx during step 1 or 3 (T3). The mint
        handler (`handlers.ts`): both PENDING paths assign a result instead of returning inside the `try` (`:173`, `:195`); AFTER the
        `finally`, in a short read-only scope tx, the config / WC17 / WC15 / `getCodeState` reads, the tx CLOSED, then (only if still
        possible) `resolveCodeAvailability`, compute `codeAvailable` / `codesRemaining` / `liveCode` / `liveCodeDelivery` within the 2 s bound —
        a Secret Manager failure or timeout ⇒ `codeAvailable: false` with the DATABASE-derived three kept; only a failure of the database
        reads themselves ⇒ the whole fallback `{ false, 0, false, null }` (WC4).
  - [x] 4.5 `packages/api-client/src/index.ts`: `sendWaOptInCode()` (`call(\`${WA_OPT_IN_BASE}/code\`, SendWaOptInCodeResponse, {}, true)`) and
        `verifyWaOptInCode(code)` (`…/code/verify`, `{ code }`); the new schemas in its contracts import block (`:69-79`). Mobile reaches them
        through `lib/member-api.ts` (`createMemberAuthClient`) with ⛔ edit there.
  - [x] 4.6 Live-DB integration tests (`apps/api/tests/integration/wa-opt-in/wa-opt-in-code.spec.ts`): AC1's API legs, AC2, AC3's HTTP
        concurrency leg (three concurrent sends ⇒ one counted, two 409 — it needs the route, so it lives here, ⛔ in Task 1.3), AC4, AC5, AC6,
        AC8, AC11, a 429 leg for the route limit; members seeded through the real signup path on a fresh random Pariwar (5.10 AC9's helpers
        / pattern).
- [x] **Task 5 — The app (WC7; AC1, AC9, AC13)** (DONE 2026-10-21 — Debug Log (b))
  - [x] 5.1 Extract `OtherPhoneDetails` (the details body `OtherPhoneHint.tsx:41-59`, testIDs unchanged) into
        `components/notifications/OtherPhoneDetails.tsx`; `OtherPhoneHint` renders it (⛔ behaviour change; Settings' RENDER tests
        unmodified); amend `OtherPhoneHint.tsx:9`'s header (row 5-13 now REPLACES it on the signup step only when the code is available).
  - [x] 5.2 NEW `components/notifications/use-wa-code.ts` (the `useWaCode` hook: the form's state, the single-flight guard, the countdown,
        its OWN action-version counter bumped on blur / unmount — ⛔ on collapse — WC7), `WaCodeEntry.tsx` (the view: props from the hook +
        `displayPhoneNumber`, `verificationPhrase`) and `OtherPhoneCodeHint.tsx` (owns the hook; the link `wa-code-link` collapses the VIEW
        only; opens expanded when `liveCode`) per AC9; the testIDs of WC7; ⚠ `t` in ⛔ effect's deps (T1).
  - [x] 5.3 `whatsapp.tsx`: the `sent` stage renders `OtherPhoneCodeHint` when `minted.codeAvailable || minted.liveCode`, else
        `OtherPhoneHint` (unchanged); the `ask` stage renders `OtherPhoneCodeHint` when `error === 'link'` and the same condition holds (⛔
        hint otherwise — 5.10's render); an
        `activated` flag replaces WHICHEVER stage body shows with `waCode.done`, clears `error`, announces `waCode.done` here
        (`useAnnounceOnChange`), and gates the `sent` stage's return announcement (`:176-202`) on `!activated`; header comment updated
        (Story 5.13, the decision id, WC letters).
  - [x] 5.4 Tests: extend `wa-signup-step-render.test.ts`'s mocks (`lib/member-api` + `sendWaOptInCode` / `verifyWaOptInCode` /
        the existing `getWaOptInStatus` for AC9's re-read; the `MINTED` fixture gains `codeAvailable` / `codesRemaining` / `liveCode` / `liveCodeDelivery`; a
        tamagui `Input` forwarding `value`, `onChangeText`, `keyboardType`, `maxLength`, `accessibilityLabel`, `testID`, and recording any
        `textContentType` / `autoComplete` so AC9 can assert their ABSENCE) — a mock change, ⛔ a change to any existing assertion except
        AC13's annotated ones; a NEW `wa-code-entry-render.test.ts` for AC9's branches (the hook driven through `OtherPhoneCodeHint`);
        `wa-signup-copy-keys.test.ts` per AC10; `wa-notifications-copy-keys.test.ts` gains `OtherPhoneDetails.tsx` in its scanned files
        (AC10). ⭐ Prove each new leg RED once (Debug Log (b)).
- [ ] **Task 6 — Friction ledger (AC12)** — ONE new row appended as the LAST line of the FIRST ledger table in `friction-budget.md` (⛔
      anywhere else — 5.10 F17): payer *"member signing up on a phone without their WhatsApp who opens "WhatsApp on another phone?" (asks for
      a WhatsApp code, reads it on their own phone, types it in) — Story 5.13"*; protects *"the registered number proven to have WhatsApp and
      the member's own act before WhatsApp is switched on (`-374`)"*; `event_type` `optional`. Plus a `**Story 5.13 disposition (…)**`
      paragraph naming the files. After COMMITTING, `pnpm friction:check` → AC-4 basis `row` (Debug Log (c)).
- [ ] **Task 7 — Close (AC12)** — `ci:local` on :5433 with `DATABASE_URL` set; `tsc` both ways; push only with BigDev's go-ahead and
      `DATABASE_URL` on :5433 ([[project_prepush_hook_inherits_5432]]); story STATUS, File List, Change Log; ledger; row → `review`.

## Dev Notes

### ⚠ TRAPS

- **T1 — `useT()` returns a fresh closure every render** — never `t` in an effect's deps; depend on `locale`
  ([[project_uset_fresh_closure_memo_trap]]).
- **T2 — The transport has no timeout** — bound both code calls with `withTimeout` (5.12 P1); a timeout is "failed" (AC9).
- **T3 — Never hold a transaction or the advisory lock across the Meta call** — claim (tx 1, committed) → call → outcome (tx 2). A held tx
  + its audit line can starve a small pool ([[project_jobs_pool_two_connection_starvation]] — the API pool is larger, the rule stands).
- **T4 — The sha pins (F14)** — `whatsapp-direct-send-outcome.ts`, `read.ts`, `dispatch.ts`, `pariwar_wa_templates.ts` (and the rest of
  `PINS`) must stay BYTE-unchanged; ONLY `write.ts`'s pin is re-taken (WC5). `claim-peer-mesh-wa-reminders.ts` and
  `wa-template-config-key.ts` are ⛔ pinned — their one-line re-exports (WC4) trip ⛔ pin. A failing pin test is a design signal, ⛔ a pin
  to refresh blindly.
- **T5 — The access-wrapper invariants (F18)** — ⛔ bare `writeAuditEntry`; and ANY function that calls `resolveChannelSecret` (or any
  `/^resolve.*Secret/i`) or `timingSafeHashCompare` may hold ⛔ variable-to-variable `===` / `!==` / `.includes` / `.startsWith` — incl.
  `['hi','en'].includes(x)` — so keep the secret reads and the hash compare in small helpers of their own; both fail `ci:local`.
- **T6 — DB-clock tests tie in one transaction** — expiry and ordering legs use separate committed statements
  ([[project_db_clock_ordering_tests_tie]]); never wait real minutes.
- **T7 — A new required contract field breaks fixtures silently** — contracts tests are outside `tsc`; run their vitest
  ([[project_contracts_tests_outside_tsc]]); the OpenAPI emit must be regenerated, ⛔ hand-edited.
- **T8 — A bodyless POST** — Fastify 400s an empty JSON body; the api-client sends `{}`; the contract is `z.object({}).strict()`
  ([[project_fastify_empty_json_body_400]]); `inject` hides it — the test sends `{}` with a JSON content-type.
- **T9 — A stand-in that reports success** — the 5.10 F7b class: ⛔ fixture, ⛔ log-only adapter in production wiring; "not provisioned" is a
  503 and a fallback (AC8).
- **T10 — Never log the code** — ⛔ `console.*` with the code, the message body, or the Meta request; classify, log the class (I7).
- **T11 — Markdown emphasis closes a JSDoc** (`**…**/`) — grep comments after editing ([[project_markdown_emphasis_closes_jsdoc]]).
- **T12 — Tests that pass vacuously** (5.10 T11): a tamagui mock that drops `Input` props; two separate clicks on a mock `<button disabled>`;
  a `useRouter` mock that returns a new object per call; a fake delivery that never asserts the `to`. Each AC names the form that bites.
- **T13 — WhatsApp is a fallback, ⛔ a mirror** — ⛔ words or comments saying a member "also" gets WhatsApp (5.10 T12).
- **T14 — A refusal inside `withCompensatingAudit` is a bug here** — it writes the intent line + `_rolled_back` and, with `closeScopeTx(…,
  false)`, rolls back a wrong attempt's increment (tries become unlimited). Decide refusals BEFORE the wrapper; for a committed-then-refused
  outcome let `mutate` RETURN, commit, then throw (WC5, F18). The SAME holds for the send's tx 2: a 502 thrown inside it rolls the
  `released` mark back and leaves a counted `sending` row (WC1 step 4).
- **T15 — The migration number belongs to the first COMMIT** — re-grep every ref before naming it; never regenerate an applied migration;
  edits reach :5432 AND :5433 ([[project_live_db_test_gotchas]]).
- **T16 — Nothing ⛔ Meta's may fail after the claim** — resolve, decrypt and build `messagingFor` BEFORE tx 1 (WC1 step 1); a counted
  `sending` row whose message was never sent is stranded for ever (⛔ writer moves it).
- **T17 — `now()` is the transaction's start** — a request that waited on the lock reads an earlier `now()` than the winner's
  `created_at`; the wait uses `clock_timestamp()` and is clamped (WC3). Expiry stays `now()`-based (one transaction, one instant).
- **T18 — The integration default `resolveChannelSecret` returns `test-secret::<name>`** — it never throws and fails
  `TEMPLATE_NAME_FORM`, so a spec that forgets the override sees `codeAvailable: false` and a 503, and a "no call" leg passes for the
  wrong reason (F13). Override it in every code spec.
- **T19 — Every pre-lock read needs the SCOPE, ⛔ the bare pool** — five of the tables read before the lock are tenant-RLS: the code
  table, `pariwar_wa_config`, `member_wa_opt_in`, `member_identities` and `events_log` (`0002_events-log-rls.sql:72`). Outside
  `openScopeTx` the app pool in production (`twt_app` — `scope-tx.ts:25-33`) reads ⛔ row, while CI's superuser reads everything
  (`context.ts:509-515`) — so a test goes green and the feature is dead or WRONG: `codesRemaining` always 2, `codeAvailable` always false,
  WC15 blind, and ⚠ WC17 FAILS OPEN (`getCurrentMemberState` with ⛔ visible event returns the initial `pending-kyc`, so every member
  passes). Use a short read-only `openScopeTx` for WC1 step 0 and the mint's WC4 reads — the ONLY allowed route for the WC17 read
  (`getCurrentMemberState(db, memberId)` filters by stream id, so a `serviceDb` read cannot be Pariwar-filtered). Close it before any
  network call (T3). ("Read-only" throughout means a scope tx that only READS — `openScopeTx` has ⛔ read-only mode,
  `scope-tx.ts:35-52`; a `SET TRANSACTION READ ONLY` after opening is allowed, ⛔ required.)

### Reuse map

| Need | Use | ⛔ Rebuild |
|---|---|---|
| Make / hash / compare a code | `generateOtp`, `hashOtp`, `timingSafeHashCompare` (`auth/shared/otp.ts`) | a new code generator; `===` |
| Check a template name | `TEMPLATE_NAME_FORM` (moved to channels — WC4) | a third regex |
| Is the member still signing up? | `getCurrentMemberState` (`packages/domain/src/member/read.ts:150`) | a new state read |
| Bound / abort the Meta call in tests | `createWhatsappAppCache(fetchImpl, { timeoutSignal })` (F11) | a real 10 s wait |
| Error details shape | `WaOptInCodeErrorDetails` (contracts, Task 4.2) | ad-hoc narrowing of `ApiError.details` |
| The registered mobile | `waOptIn.getMemberMobileCiphertext` + `decryptMobile` (the 5.9 adapter's read) | `resolveWaTarget` (PENDING ⇒ null); a client field |
| Send to Meta | `createWhatsappAppCache().messagingFor(…)` + the new auth shape | a raw `fetch`; the dispatcher; the fixture |
| Classify a failed send | `classifyDirectWaSendFailure` (import — PINNED) | a new classifier |
| Template name | `waTemplateConfigKey('wa_opt_in.code', …)` (moved to channels) + `resolveChannelSecret` (already on AppDeps) | `pariwar_wa_templates` |
| Serialize per member | `lockMemberWaYes` (reentrant) | a new lock |
| Activate | `activateOptIn` + `recordConsent` in one tx (the worker's order, F5) | a second ACTIVE writer |
| Audit | `withCompensatingAudit` + `waOptInAuditPayloadHash` (F1) | `writeAuditEntry` |
| Per-member limit | `perMemberKey` route config (`personal-event-routes.ts`) | a new limiter |
| Bound a call (app) | `lib/with-timeout.ts` | a local copy |
| Announce | `AnnouncedText` / `useAnnounceOnChange` (`components/peer-request/announce.tsx`) | an unconditional announce |
| The number + phrase | `OtherPhoneDetails` (extracted from `OtherPhoneHint`) | a third copy |
| API test seam | a recording `fetchImpl` + test `timeoutSignal` injected into the module's own `createWhatsappAppCache` (`_setup.ts`), with a per-spec `resolveChannelSecret` override | a fake of the whole delivery (it would hide the resolution under test); a live Meta call |

### Testing standards

API live-DB `*.spec.ts` on :5433 (skipped without `DATABASE_URL`), each test a fresh random Pariwar, members through the real signup path;
concurrency legs on separate connections. Domain/channel unit tests in their packages' vitest. Mobile: vitest `tests/unit/**/*.test.ts`,
`createElement` (⛔ JSX), jsdom opt-in, RTL `cleanup`, the real `LocaleProvider` ([[project_mobile_vitest_and_expo_install_traps]]). Prove
every new leg RED once. `ci:local` with `DATABASE_URL` on :5433 (`env -u DATABASE_URL` SKIPS integration-tests).

### Project structure notes

New: `packages/domain/migrations/NNNN_member-wa-opt-in-codes.sql` (+ journal), `packages/domain/src/schema/member_wa_opt_in_codes.ts`,
`packages/domain/src/wa-opt-in/code.ts`, `packages/channels/src/wa-template-config-key.ts`, `apps/api/src/modules/wa-opt-in/code-delivery.ts`,
`apps/api/src/modules/wa-opt-in/code-handlers.ts`, `apps/mobile/components/notifications/{OtherPhoneDetails,OtherPhoneCodeHint,WaCodeEntry}.tsx`,
`apps/mobile/components/notifications/use-wa-code.ts`, `packages/domain/tests/integration/rls/member-wa-opt-in-codes-policy-regression.spec.ts`,
tests. The migration also adds a UNIQUE on `member_wa_opt_in` (the owner-FK target). Changed: `packages/domain/src/wa-opt-in/{write,audit,index}.ts`, the schema index, `packages/channels/src/providers/whatsapp-app.ts`,
the channels index, `apps/api/src/context.ts` (AppDeps), `apps/api/src/modules/wa-opt-in/handlers.ts` (the mint's `codeAvailable`),
`packages/domain/src/policies/` (the new table's RLS entry),
`apps/jobs/src/scheduler/wa-template-config-key.ts` and `claim-peer-mesh-wa-reminders.ts` (→ one-line re-exports; their importers unchanged),
`packages/contracts/src/wa-opt-in/index.ts`, `packages/contracts/tests/wa-opt-in.test.ts`,
`apps/jobs/tests/claim-contact-ladder-whatsapp.test.ts` (one pin), `packages/contracts/src/wa-opt-in/opt-in.ts`,
`packages/contracts/scripts/emit-openapi.ts`, `openapi/v1.yaml`, `packages/api-client/src/index.ts`, `apps/api/src/modules/wa-opt-in/routes.ts`,
`apps/api/src/deps.ts`, `apps/api/tests/integration/_setup.ts`, `apps/mobile/components/notifications/OtherPhoneHint.tsx`,
`apps/mobile/app/(signup)/whatsapp.tsx`, `apps/mobile/tests/unit/{wa-signup-step-render,wa-signup-copy-keys,wa-notifications-copy-keys}.test.ts`,
`packages/i18n/locales/{en,hi}/common.json`, `friction-budget.md`, the records. Untouched: `(settings)/notifications.tsx`,
`apps/jobs/src/wa-webhook-processor.ts` (unless WC12 (b) / (c) is chosen), `components/banners/*`.

### Sequencing

Governance first ([[feedback_governance_commits_precede_implementation]]): 0.3 alone → 0.4 → Task 1 (schema) → 3 → 4 → 2 / 5 → 6 → 7. Row
5-11 (SMS fallback) is independent. ⛔ other open row edits the wa-opt-in module, `whatsapp.tsx` or `whatsapp-app.ts` at the pin (S2 re-checks).
If 6.37d's worker work reopens, WC12 (a) keeps this story off its STOP path.

### Previous story intelligence (5.10, 5.12, 5.9)

- 5.10 (the step this replaces part of): one mint per visit; bound every call; `actionVersion` drops late results; a rendered Modal, ⛔
  `Alert.alert`; the `sent` stage spoken on return; RED proofs by scripted mutation; typed routes do ⛔ guard a `/(group)/x` literal ⇒ a
  source leg (its AC1 PREV/NEXT guard stays green — no route literal changes here). Two review rounds found: late results after blur,
  the box locked while in flight, announcements doubled — design them in from the start (AC9).
- 5.12: `lockMemberWaYes` shared by mint / activation / withdrawal; one ACTIVE per member; every withdrawal ends every yes — a code-confirmed
  yes inherits all of it (AC5). Its review: per-source errors, fresh re-reads, `ci:local` at the FINAL commit.
- 5.9: the in-request direct send — one attempt, a classified error, the code never logged, `CapturingStepUpDelivery` as the test seam.

### Git intelligence

`origin/main` = `bac71abb` (5.10's ledger after landing); the 10 commits before it are Story 5.10 end to end (created → validated →
`-374` alone → `-375` alone → records → code `d336be8e` → two review rounds `f4678800`, `763289ee` → records). The pattern to follow: decision
alone, records, then code in order; fix commits prefixed `fix(wa-code):`.

### Latest tech information (fetched 2026-10-21)

Meta (developers.facebook.com, *Authentication templates*, *Copy code button*, *Template categorization*, *Pricing*, *Error codes*, *Send
messages*; whatsappbusiness.com/policy, updated 2026-09-23) — summarised in F21. Send payload: `POST https://graph.facebook.com/<ver>/
<PHONE_NUMBER_ID>/messages` with the body + `button` (`sub_type: "url"`, `index: "0"`) parameters both carrying the code. The synchronous
response returns the wamid and means ACCEPTED, ⛔ delivered. ⚠ Unconfirmed: whether Meta ships a Hindi preset body (WC4's `hi` → `en`
order covers either answer; WC13 (a) records which language Meta approved), the India rate from Meta's own card, approval speed. No library
version changes; Expo / expo-router / tamagui as pinned.

### References

- `.decision-log.md` — `-374` (the ruling, readings (i)–(iv), "Not covered", Consequences 1–2, BigDev's reading of "one retry"); `-375`
  d7 / d12; `-373` d1; `-370` / `-371` d1–d2 / `-372` d1 (counting precedent); `-364` condition 3 (STOP); `-065` item 4
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-21-5-10-whatsapp-code-for-another-phone.md` (the question as put)
- `_bmad-output/planning-artifacts/architecture.md` §3.4 (channels, Member WA opt-in flow + its dated notes), §2.2 (OTP discipline, security
  floor), §2.11 (OTP rate limiting)
- `docs/adr/ADR-0029-whatsapp-webhook-ingress-and-opt-in-lifecycle.md` (Rationale; changelog `-374` / `-375` rows)
- `_bmad-output/implementation-artifacts/5-10-signup-whatsapp-opt-in-checkbox.md` (F16, F19, AC6, AC12, T11), `5-12-…`, `5-9-…`
- `_bmad-output/implementation-artifacts/deferred-work.md` — sections *"Deferred from: validate of 5-10-…"* (the mismatch item, the
  stand-in item) and *"… code review of 5-12-…, round 2"* (W2/W3 — the sweep and revoke without the lock)
- `docs/launch-gate-inventory/inventory-roster.md` — Row 38 (shape), Row 35 (b) (template-key proof), Row 28 (Hindi-review control)
- `sprint-status.yaml` — row block `5-13-whatsapp-code-for-another-phone` (its 2026-10-21 comments)

## Dev Agent Record

### Agent Model Used

### Debug Log References

(a) Task 0.2 answers, verbatim · (b) RED proofs · (c) parity / microcopy / friction / access-wrapper / OpenAPI gate outputs · (d) dev-DB
side effects · (e) Task 0.1 preflight · (f) the REVOKED / BLOCKED_BY_META writers (Task 1.1) · (g) the told item sent

**(e) Task 0.1 preflight (2026-10-21, before Task 0.3):** `git fetch origin` ⇒ `origin/main` = `bac71abb` (the pin) ⇒ ⛔ rebase, ⛔ re-derive;
`git diff --name-only bac71abb..origin/main -- packages apps scripts docs/adr docs/launch-gate-inventory` empty. **S1** ⛔ code moved ⇒
held. **S2** ⛔ other local or remote branch, and the peer worktree `TWT-6-37e` (`story/6-37e-…`, clean), touches `whatsapp.tsx`,
`OtherPhoneHint.tsx`, `wa-opt-in/write.ts`, `whatsapp-app.ts`, `wa-template-config-key.ts`, `claim-peer-mesh-wa-reminders.ts` or the
wa-opt-in API module (`git diff --name-only bac71abb...<ref>` over every ref) ⇒ held. **S3** ⛔ migration after 0177 on any ref or the
worktree ⇒ the next free is 0178 (taken only at Task 1's commit). **S4** ⛔ `waCode.*` key in either locale. **S5** ⛔ routing note, told
item or decision after the pin on `origin/main`; ⛔ decision `-376` or later on any ref or the worktree ⇒ the next free id is `-376`.
**S6** ⛔ moved. ⚠ Found: the 6.37e branch had taken ledger letters `2026-10-21s` (`a85d712f`, 19:11) and `21t` (`b04409ed`, 20:05)
BEFORE this story's validate commit `33b8da9f` (20:06) also wrote `21s` ⇒ this story's entry re-lettered `21u` (`-366` decision 6 — a
number belongs to the first commit that takes it, on any branch); the 6.37e session was told by message which letters and numbers 5.13
takes next (`21u`+, `-376`, Row 39, 0178).

**(f) Task 1.1 — who writes `REVOKED` / `BLOCKED_BY_META` (2026-10-21, at the pin):** `git grep` over `apps/*/src` + `packages/*/src`:
`endEveryWaYes` (`write.ts`) moves ONLY a `state = 'ACTIVE'` row (to `REVOKED` — member DELETE, admin opt-out, STOP; to
`BLOCKED_BY_META` — Meta 131050); `revokeOptIn`'s `REVOKED` / `BLOCKED_BY_META` edges require ACTIVE (`legalFrom`), and its one
caller (`runWaOptInExpirySweep`) passes `EXPIRED_24H_WINDOW` from PENDING. ⇒ only an ENDED YES reaches those two states (WC15 holds);
a lapsed PENDING is `EXPIRED_24H_WINDOW`. ⛔ RTBF / erasure path deletes a `member_wa_opt_in` row (its only writers are
`handlers.ts`, `wa-webhook-processor.ts` and the domain module) — the 0178 `ON DELETE CASCADE` is reached by test cleanups only.

**(b) RED proofs (scripted mutation, restored, re-run green):** Task 1 — (i) on :5433 the guard function replaced by a no-op and
`member_wa_opt_in_codes_counted_seq_uq` dropped ⇒ 4 legs of the policy-regression spec FAILED (the third-counted-row leg and the
three trigger legs); both restored from the 0178 text (a scratchpad script splitting the migration on its breakpoints) ⇒ 29/29.
(ii) `code.ts` mutated three ways at once — `send_seq` = count + 1, the rate-limited release dropped from the wait, a wrong attempt
hitting seq 1 only ⇒ 3 legs FAILED (the seq rule, the WC3 wait, recordWrongAttempt); file restored from a copy ⇒ 7/7.

Task 3 — on the HEAD `whatsapp-app.ts` (the auth shape absent; two stub exports so the file compiled) the two authentication legs
FAILED and the byte-pin leg PASSED (so it pins the OLD bodies); restored ⇒ 4/4. Task 4 — five mutations at once (the verify's
wrong-attempt refusal thrown INSIDE the wrapper — T14; tx 1 without `lockMemberWaYes`; `scope` mapped as counted `refused`; the
hash compare as `===`; a bare `deps.db` read in the mint) ⇒ 8 legs FAILED (the 131048-on-429 and 401 rows, the three-concurrent-
sends leg, the three wrong-attempt legs, the two source legs); all three files restored from copies ⇒ 39/39.

Task 5 — the hook / view mutated five ways (⛔ digit filter; `textContentType="oneTimeCode"` added; ⛔ single-flight ref; a released
FIRST send shown as the closed route; the `sent` announcement dropped) ⇒ 6 legs FAILED; restored ⇒ 53/53. Then the hook moved INTO
the collapsible view (`OtherPhoneCodeHint` rendering an inner component that owns `useWaCode`) ⇒ the ⭐ send → collapse → expand leg
FAILED; restored ⇒ 53/53 (+ the 80 amended 5.10 legs).

**(d) Dev-DB side effects:** 0178 applied to :5433 (`pnpm db:migrate`, 2026-10-21) — ⛔ yet to :5432 (the pre-push hook will, if
pushed with the shell's URL — [[project_prepush_hook_inherits_5432]]). The RED proof (i) replaced the guard function and dropped the
index on :5433 for one run, then re-created both from the migration text (the spec's LOCKSTEP leg re-reads the function source).

**(g) WC11 (a) — the told item SENT (2026-10-21):** BigDev, verbatim: *"note for panel has been sent"* ⇒ `trustee-panel-told-2026-10-21-5-13-whatsapp-code-as-built.md` is TOLD (its Status line updated; the text is kept as sent). ⛔ a ruling was asked; ⛔ answer is awaited — if the Panel replies, that reply is recorded here and judged against `-376` (a reply that rules is a new decision, ⛔ an edit of this one).

**(a) Task 0.2 — BigDev's answer, verbatim (2026-10-21, in session, after the v1.5 validate):** *"all recommendation accepted for
WC1–WC17"*. Each WC resolves to its ⭐ option:

| WC | Resolves to |
|---|---|
| WC1 | (a) the code sent in the API request, in the five steps (resolve before the claim; ⛔ tx during network calls) |
| WC2 | (a) a NEW `member_wa_opt_in_codes` table — CHECKs, partial unique, guard trigger, column-limited grant, owner FK, per-verb RLS |
| WC3 | ⭐ 6 digits, 10 min, ≤ 2 counted sends, 2 tries per code, the 60 s wait; WC3 (a) — `scope` refusals UNCOUNTED + 503 + the closed route |
| WC4 | (a) `waTemplateConfigKey` + `TEMPLATE_NAME_FORM` moved to `packages/channels` (re-exports at the old homes); the mint gains `codeAvailable` / `codesRemaining` / `liveCode` / `liveCodeDelivery`, bounded at 2 s |
| WC5 | the verify route in WC5's three steps; `windowExpiresAt: Date \| null`; the `write.ts` pin re-taken |
| WC6 | (a) the SIGNUP step only — ⛔ routing note |
| WC7 | ⭐ `OtherPhoneCodeHint` replaces the hint when `codeAvailable \|\| liveCode`; the `useWaCode` hook; ⛔ `oneTimeCode` / `autoComplete` |
| WC8 | ⭐ the `waCode.*` family, 15 rows — ⚠ the en + hi WORDING itself: see the note below this table |
| WC9 | ⭐ the four audit actions via `withCompensatingAudit`, `member_app_wa_code` on every line |
| WC10 | ⭐ the per-member route limit on both routes + the DB caps; per-device / global cap a recorded residual |
| WC11 | (a) a TOLD item with its five points — written at Task 0.4; "told" only once BigDev sends it |
| WC12 | (a) a STOP from a PENDING-only member ends nothing; the code typed after it switches WhatsApp on — told to the Panel (WC11 (a) (3)) |
| WC13 | ⭐ NEW roster row `wa-opt-in-code-template-approved`, legs (a)–(c), cross-referencing Rows 38 (b) / 37 (b) / 38 (c)–(d-i) |
| WC14 | ⭐ the records as listed (one author-commit decision, epics entry, §3.4 note, ADR-0029 row, roster, friction, four `deferred-work.md` items + two annotations, the told item, the ledger) |
| WC15 | (a) ⛔ code for a member with any REVOKED / BLOCKED_BY_META row (409 `code_not_offered`) — ⛔ routing note |
| WC16 | (a) a second code does ⛔ invalidate the first; verify compares against every live code |
| WC17 | (a) the send refuses unless the member is `pending-kyc` / `pending-fee`; verify records `memberState` (⛔ a refusal) |

PQ — none (WC6 (a) and WC15 (a) chosen ⇒ ⛔ routing note).

**WC8's wording — asked separately (2026-10-21), BigDev's answers verbatim:** to *"Are they approved as written?"* — *"I just edited the
en+hi, used that."* BigDev had edited `waCode.intro` and `waCode.sent` in the table (en + hi); the other 13 are the drafts, unchanged.
Three points were then put to BigDev before recording: the Hindi *"वैद्य"* ("a doctor") for *"वैध"* ("valid"); *"your WhatsApp number"*
where the code goes to the REGISTERED number only (I2 — a member whose WhatsApp is on a DIFFERENT number is told a code went to it); and
`intro`'s *"will send"* / *"भेज रहा है"* shown BEFORE the member taps Send (I1). BigDev chose *"Your edits, typo only"*: the two strings as
edited, with only *"वैद्य"* → *"वैध"* and *"for few"* → *"for a few"*. ⇒ The table records the approved text. ⚠ **Residual, recorded (⛔
fixed):** both strings say "your WhatsApp number" ⛔ "registered number", and `intro` reads as if a code is already coming — words a
member whose WhatsApp is on another NUMBER can find untrue; carried to the decision entry and the told item's point (4). All 30 strings
(en + hi) pass the real microcopy rules (`checkTone` / `checkVocabulary` incl. member-only / `checkNumerals`) and the copy test's bans
(scratch run 2026-10-21; Task 2 re-runs the gates on the committed JSON). WC13 (b): BigDev's approval of the hi is a review by the
product owner — whether it discharges Row 28's human-review control is recorded at the roster row (Task 0.4), ⛔ assumed here.

### Completion Notes List

- Ultimate context engine analysis completed — comprehensive developer guide created (2026-10-21, `bmad-create-story 5.13`).

### File List

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-10-21 | 1.5 | Fourth fresh-context round (on v1.4) — **0 BLOCKER / 0 HIGH** / 5 M / 9 L; ALL applied; the rounds stop here (HIGH 1 → 1 → 1 → 0). **M** `liveCodeDelivery` reached the builders and tests (`getCodeState`, Task 4.4's fields + fallback, AC1's API legs, the `MINTED` fixture, the header); ONE definition of TOLD (a 200, a non-`ApiError` Send, a ≥ 500 with unparseable details, or the mint's `liveCode`) at WC7, AC9 and the words footer; a mint-driven open with `codeAvailable: false` shows the closed route and ⛔ send / resend button whatever `codesRemaining` says (WC7, AC1); `OtherPhoneDetails` after a failed send only once a counted send exists (AC9's arm now agrees with its leg and WC3); the 429 arm wins over the unparseable-details catch-all, which is now `wa_opt_in.*`-only. **L** step-0 vs between-steps KMS lines (AC2); WC4 / words / I6 stale lines under the new render rule; the mint keeps the database-derived fields when only Secret Manager fails; WC2's refusal union gains `channel_unavailable`; AC2's source leg names the WC17 exception; v1.4's "6 L" was 10; step 1 still WRITES a KMS audit line and maps a null ciphertext; "read-only" defined (⛔ a mode of `openScopeTx`); AC3's HTTP concurrency leg moved to Task 4.6. |
| 2026-10-21 | 1.4 | Third fresh-context round (on v1.3) — 1 H / 3 M / 6 L (10 L items listed below — the count is wrong, noted in v1.5), all v1.3's own; ALL applied. **H** WC7 still rendered on `codeAvailable` alone and labelled send / resend by COUNT while AC1 / AC9 / Task 5.3 used `codeAvailable || liveCode` and what the member was TOLD — and v1.3's row claimed WC7 was done (annotated there, ⛔ rewritten) ⇒ WC7 rewritten to both rules; the mint gains `liveCodeDelivery` (which line the form reopens with); I6 names the live-code exception. **M** the refusal ORDER differed in AC2 and step 2 never re-read the channel ⇒ one order everywhere, tx 1 re-reads the config, an order leg + a switched-off-between-steps leg; the "short" read-only scope tx was held across Secret Manager / KMS calls ⇒ step 0 does EVERY database read (incl. the ciphertext) and CLOSES, step 1 takes them as input with ⛔ tx open (WC1, WC4, Tasks 4.3 / 4.4); AC9's ≥500 arm could swallow step 1's 503 ⇒ the `wa_opt_in.*` arms match first, the 503 carries step 0's details. **L** T19 names all five tenant-RLS tables and that WC17 FAILS OPEN on the bare pool (scope tx the only route); AC1's `codeAvailable: false` + `liveCode: true` leg; the mint's `liveCode` counts as told; `checkCodeSendAllowed` lock-free at step 0; "plain" removed from Task 4.4; AC8's `enabled: false` out of the 503 list; step-0 refusals assert ⛔ KMS line; the "one sentence" scope credited to `-374`; `scope-tx.ts:25-33` cited beside `context.ts:509-515`; AC13's legs `codeAvailable: false, liveCode: false`. |
| 2026-10-21 | 1.3 | Fresh-context re-validate of v1.2 (two verifiers: design, cites) — 1 H / 6 M / ~25 L, nearly all v1.2's own; ALL applied. **H** v1.2's "plain read" outside a scope tx: the code table and `pariwar_wa_config` are tenant-RLS, so production (`twt_app`) would read ⛔ row while CI's superuser reads all ⇒ steps 0–1 and the mint's WC4 reads in a short read-only `openScopeTx` (or Pariwar-filtered `serviceDb`), T19, a source leg in AC2. **M** refusal ORDER stated (channel → PENDING → WC17 → WC15 → limit → wait → resolve; AC8's "(or …)" gone); a 5xx after the claim / tx 2 failing reads as "may have been sent" (WC3 row, AC9); `liveCode` renders the form even when `codeAvailable` is false (AC1, Task 5.3 — ⚠ WC7 was ⛔ updated in v1.3; done in v1.4); verify READS `memberState` for the payload (⛔ a refusal); a lapsed request is `no_longer_valid` alone on Send AND Verify; `retryAfterSeconds` nullable in details + an unparseable-details arm. **L** the mint's full fallback `{false,0,false}`; the cheap DB refusals before Secret Manager (Settings mints pay nothing); the counting principle and WC11 (2) name `rate_limited`; "tried twice"; send vs resend label by what the member was TOLD; AC1 button per AC9; AC3's trigger leg run as the owner; one-statement `recordWrongAttempt`; a named `waOptInActivate` seam; the timing sentence is ⛔ a bound; rotation cost (WC4); `too_soon` keeps the field only with `liveCode`; the error-mapping "Changed" entries dropped (⛔ change needed); a `sending` row in `attemptsRemaining` stated. Cites: §3.4's instrument split by source; "other three"; the ADR-0029 amendment quote credited to its changelog row; reading (6)'s inference rests on "The rest … stands"; "superseded, in ADR-0029, ONLY"; readings counted SEVEN and ordered (1)–(7); `TEMPLATE_NAME_FORM`'s test importer; `lib.ts:256-273`, `:229-234`; `AUTH_CODES` `:30`; `graph_api_version` in the config assert; `consent/write.ts:41-68`; the privacy policy is the gitignored private copy. |
| 2026-10-21 | 1.2 | First `bmad-create-story validate` — four fresh-context read-only verifiers (server code, app/contracts/copy, governance, design + Meta); 43 findings, BigDev: *"all"*. **Critical:** (1) the send claimed and counted a slot BEFORE resolving the name / token / decrypt ⇒ an unprovisioned or failing send stranded a counted `sending` row with ⛔ message ⇒ WC1 rewritten as five steps (resolve, bounded, BEFORE tx 1; only `send` classified; `messagingFor` built outside); (2) ADR-0029's *"Re-opt-in after revoke requires a NEW inbound message"* was dropped from the quote and stands (`-374`: *"The rest … stands"*) ⇒ §0 reading (6), NEW WC15; (3) `codesRemaining: 2` after a released first send had ⛔ app arm ⇒ `>= 1`, send vs resend buttons; (4) I3 was half-built in the DB ⇒ guard trigger + column-limited grant + CHECKs (the 0176 / 0172 pattern, F5b), owner FK (0175); (5) `send_seq` = count + 1 could 23505 ⇒ lowest free seq, outcome only from `sending`; (6) the send's tx 2 must commit then throw (T14). **Should-fix:** NEW WC16 (a first code arriving after the second — both stay valid), WC17 (the server refuses a member past signup; `memberState` in the consent payload), WC12 (c) + §0 reading (7) (`-364` cond. 3 quoted; a STOP before the code); WC3 counting restated as DEPARTING from `-371` twice, `scope` uncounted + 503 (WC3 (a)), 131026 asynchronous (F15), rate-limited releases wait, one name `retryAfterSeconds` with `clock_timestamp()`; WC4 mint gains `codesRemaining` / `liveCode`, the token in `codeAvailable`, a 2 s bound, parallel reads; the test seam names the `_setup.ts` secret default + `timeoutSignal` (F13, F11, T18); invariant (f)'s breadth (F18, T5); RLS spec path → `packages/domain/tests/integration/rls/`; the form's state in a `useWaCode` hook (survives collapse); AC9 Send-failure arms; the `ask`-stage link only when `codeAvailable` (5.10 unchanged when false); ⛔ `oneTimeCode` / `autoComplete`; post-sweep verify; WC11's told item gains five points and an honest (b) cost; §2.2 / §2.11 claims scoped. **Minor:** the stray tool markup at the file's end removed; F12's two arms; F20 / emit-openapi / error-mapping cites; Task 4.2's real red fixture + export lists; `recordConsent`'s required fields; hand-authored migration + journal `when` + ON DELETE; `TEMPLATE_NAME_FORM` moved, ⛔ re-declared; the four importers named (re-exports); the inherited COMMIT-failure gap (WC5); the Settings copy-test edit named; announcements; literal keys + set equality; digits-only input; `OtherPhoneHint.tsx:9` header; WC3's crash row; readings (2) / (4) relabelled; WC13 cross-references Rows 38 (b) / 37 (b) / 38 (c)–(d-i); the mint computes after its `finally`; `resend_wait` draft reworded (it now also follows a send that never left). WC1–WC14 → WC1–WC17; readings (1)–(5) → (1)–(7). Code claims re-derived at bac71abb. |
| 2026-10-21 | 1.1 | Create-story checklist pass (`checklist.md` step 6 — one fresh-context verifier; 3 H / 9 M / 10 L, ALL applied before commit). **H1** a refusal decided inside `withCompensatingAudit` would roll back a wrong attempt (unlimited tries) and write "activated" + `_rolled_back` ⇒ WC5 rewritten as three ordered steps (pre-checks outside the wrapper; correct → activate; wrong → a returning `mutate`, commit, THEN throw); `code.ts` returns discriminated refusals; T14; AC4's committed-attempt and source-compare legs. **H2** the "exactly as today" day-one claim was false (an always-failing offer) ⇒ the mint gains `codeAvailable` (WC4; contract change), `OtherPhoneHint` unchanged when false (AC1, I6). **H3** a fake of the whole delivery made AC8 vacuous ⇒ the only seam is a recording `fetchImpl` into the module's own client cache; `resolveCodeDelivery` runs for real (WC1, Task 4.3); every environment wires the real path (no reveal adapter). **M1** an uncertain send closed the route ⇒ 200 `delivery: 'uncertain'` + `sent_uncertain`; **M2** unmapped `resend_too_soon` / `invalid_state` / verify timeout ⇒ relative `resendAfterSeconds`, a status re-read, `verify_failed`; **M3** invalidate the earlier code only in tx 2 on accepted / may-have-sent; seq rule after `released`; **M4** F12 restated in code order + WC3's outcome table (131048 on a 429 counts); **M5** concurrency leg = EXACTLY one counted; **M6** invariant (f) cannot see a hash `===` ⇒ a source leg; **M7** activation replaces either stage; the `ask`-stage render is a rare path; **M8** wiring in every environment; **M9** RLS on the 0172 pattern + regression spec. L1–L10: F16 cites (`:126-131`; `OtherPhoneHint.tsx:9`); the digit rule is style, ⛔ a gate; the iOS autofill rationale struck; testIDs, `context.ts`, error-mapping path, `isCurrent`; S3 re-derives; row-status note; stale `window_expires_at` comments; WC9 channel; injectable `log`; template-name form check; KMS lines per attempt; §0 reading (1) relabelled WIDENS; `no_more` reworded; W2 annotated. 13 → 15 `waCode.*` strings (`sent_uncertain`, `verify_failed`). ⛔ validated by `validate` yet. |
| 2026-10-21 | 1.0 | Created by `bmad-create-story 5.13` (pinned `bac71abb`, branch `story/5-13-whatsapp-code-for-another-phone`, main checkout — ⛔ peer session). WC1–WC14 PROPOSED for BigDev at Task 0.2; ⭐ recommended: the code sent in the API request through a new `WaOptInCodeDelivery`; a new `member_wa_opt_in_codes` table whose constraints cap two counted codes per request and two tries per code; a correct code writes the worker's consent + ACTIVE rows (`windowExpiresAt` null; `write.ts` pin re-taken); signup step only; 5.10's number + phrase as the fallback whenever the code route is closed; 13 `waCode.*` strings (en + hi DRAFT). ⛔ validated yet. |
