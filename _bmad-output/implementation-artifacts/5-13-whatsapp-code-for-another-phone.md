---
baseline_commit: bac71abb
---

<!--
PINNED: bac71abb (`main` = `origin/main`, 2026-10-21 — Story 5.10 landed by fast-forward, PR #294; its ledger `2026-10-21q`).
Branch `story/5-13-whatsapp-code-for-another-phone`, cut from the pin in the MAIN checkout (ListAgents at creation: ⛔ other session
running — [[feedback_shared_tree_branch_switch]]; re-check before every commit — [[feedback_concurrent_review_agents_mutate_tree]]).
Two facts, kept apart (footgun #24): the pin is an ancestor of HEAD (durable); the CODE claims below were derived at bac71abb
(perishable). Re-check before Task 1: `git fetch origin && git diff --name-only bac71abb..origin/main -- packages apps scripts docs/adr docs/launch-gate-inventory`.

STATUS: ready-for-dev (v1.1 — created 2026-10-21 by `bmad-create-story 5.13`, checklist pass applied (3 H / 9 M / 10 L); WC1–WC14 PROPOSED for
BigDev at Task 0.2; ⛔ validated by `bmad-create-story validate` yet).

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
Five readings this story acts on, stated, ⛔ hidden ([[feedback_panel_gate_read_ratified_verbatim]]):
  (1) "one retry" = at most TWO codes per request AND two entry attempts per code — BigDev's reading in session (*"Both"*), recorded in
      `-374` as ⛔ separately ratified; `-374` itself says it *"widens the option as put (… "one code per request") to at most two codes"*.
      WIDENS the option as put; matches the Panel's added "one retry" only under BigDev's ⛔ separately ratified reading — WC11 (a)
      tells the Panel the reading as built (a told item — ⛔ a question).
  (2) "a request" = one PENDING opt-in (`-374` reading (i), the author's) — a later PENDING starts afresh.
  (3) "to the registered number only" — the server sends ONLY to the member identity's decrypted mobile, never a number from the client
      (`-374` reading (ii)). MATCH.
  (4) "Only after the member ticks the box and taps "WhatsApp on another phone?"" — the code is offered ONLY on the SIGNUP step, after the
      tick's PENDING exists (WC6 (a)); the "WhatsApp notifications" screen keeps 5.10's phrase hint. Offering it there would EXTEND the
      option as put (that screen has no box) ⇒ the Panel's, ⛔ assumed (`-374` reading (iii) left it to this create-story). NARROW-OR-MATCH.
      ⚠ Honest limit (as 5.10 SB8): the server cannot tell the signup step from another screen — the placement is the APP's; the server
      enforces the PENDING, the registered number and the counts.
  (5) Architecture §2.2: *"WhatsApp is not an authentication channel in v1 — identity (SMS) and communication (WhatsApp) remain separated"*
      and *"fallback options (voice OTP only — no WhatsApp)"* (ratification ⛔ confirmed — `-374` "Not covered"). The code is ⛔ a login or
      identity check: the member is ALREADY signed in by SMS OTP; the code proves only that the registered number has WhatsApp, and it
      switches on ONLY WhatsApp messages — it never opens a session, never satisfies a step-up, and lives in its OWN store (I4). Read as
      MATCHING §2.2's separation; it uses Meta's AUTHENTICATION template category because Meta requires that category for any code
      (F21) — a Meta label, ⛔ a TWT authentication channel.
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

Status: ready-for-dev

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
> template name — WC13 (a)), the mint answers `codeAvailable: false` and the link shows 5.10's number + phrase exactly as today (WC4,
> AC1) — ⛔ a code offer that always fails.
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
> **What it CHANGES:** a NEW migration (the code table); a NEW `packages/domain/src/wa-opt-in/code.ts`; `write.ts`'s `activateOptIn`
> input (`windowExpiresAt: Date | null` — WC5; its sha pin re-taken); `audit.ts` (one new originating-channel value); `whatsapp-app.ts`
> (an authentication-template message shape); `waTemplateConfigKey` moved to `packages/channels` (WC4); two NEW API routes + contracts +
> OpenAPI + api-client methods; the mint's response gains `codeAvailable` (WC4 — a `.strict()` contract change); the API deps and
> `context.ts` (a WhatsApp code delivery); the API error mapping; the signup step's link (a NEW `OtherPhoneCodeHint`, a NEW
> `WaCodeEntry`, `OtherPhoneDetails` extracted from `OtherPhoneHint`); en + hi `common.json` (`waCode.*`); tests; the records.
>
> **What it READS and leaves alone:** the jobs worker (`apps/jobs/src/wa-webhook-processor.ts` — the phrase route, STOP, 131050, the
> expiry sweep, all unchanged — WC12), `resolveWaTarget`, the dispatcher and its ladder, `pariwar_wa_templates`, `member_auth_otps` and
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
| ADR-0029 Rationale + changelog row 2026-10-21 *(ratified — amended)* | *"User-initiated ONLY (AR-16). A PENDING is minted only by the member tapping the toggle; ACTIVE only by a matched inbound WhatsApp message."* — amended by `-374`: *"a second route to ACTIVE beside the matched inbound message, and the one kind of message sent to a member not yet ACTIVE"* | ⭐ TRUSTEE-RATIFIED (`-065`), amended (`-374`) |
| Architecture §3.4, channels | *"WhatsApp Business (Meta Cloud API) — dual-gated: fires only when both (a) per-Pariwar admin toggle ON (FR-72) and (b) per-member opt-in ACTIVE … Scope: Meta UTILITY templates only"* + the dated `-374` note: *"the one kind of message the dual gate admits to a member not yet ACTIVE"* | ⭐ TRUSTEE-RATIFIED; gate (a) still applies to the code (I1) |
| Architecture §3.4, origination | *"WA opt-in state may only transition to ACTIVE via a user-initiated interaction (the user-sent WhatsApp message above) or an explicit affirmative consent capture in-app (recorded with timestamp + the UI context). Passive defaults, pre-checked boxes, bundled consent, or inference from other settings are not valid opt-in origins."* | ⭐ TRUSTEE-RATIFIED — the code route records timestamp + UI context (WC5) |
| Architecture §2.2 | *"WhatsApp is not an authentication channel in v1 — identity (SMS) and communication (WhatsApp) remain separated."*; *"OTP-mechanism security floor. Regardless of delivery channel … per-channel rate limiting, per-OTP revocability, audit-log emission per send + per attempt + per consume, SIM-swap detection with helpdesk-mediated fallback (never silent re-issue), and distinct OTP pools per intent class"*; *"fallback options (voice OTP only — no WhatsApp)"* | architecture (ratification of these sentences ⛔ confirmed — `-374` "Not covered"); read in the §0 header (5); the floor is APPLIED (I4, WC9, WC10) except SIM-swap (⛔ an identity check here) |
| `2026-10-21-375` d12 (5.10 SB12) | the signup link reveals the number + phrase now; *"The WhatsApp CODE is row 5-13's"* | author-commit (5.10) — BUILT |
| `2026-10-21-373` d1 | one ACTIVE row per member; *"the mint refuses while any ACTIVE row exists"* | author-commit (5.12) — BUILT (0177) |
| `-370` / `-371` / `-372` d1 | the claimant WhatsApp cap counts the sends Meta MAY have acted on; *"A `rate_limited:*` (429 …), `api_unavailable:000` … do ⛔ count"* | author-commit (6.37d) — the PRECEDENT for WC3's counting (claim sends only; ⛔ binding here) |
| Meta, authentication templates + opt-in policy (fetched 2026-10-21) | *"If your mobile app offers users the option to receive one-time passwords or verification codes via WhatsApp… you must use an authentication template."*; preset body *"<code> is your verification code."*; copy-code button; *"URLs, media, and emojis are not supported"*; *"authentication messages are only delivered to a user's primary WhatsApp device"*; business policy: opt-in is the business's to determine | provider policy — FOUND ([[feedback_provider_policy_is_found_not_counsel]]) |
| Counsel's view | NOT RECORDED — and `-374` accepted *"Counsel has not been asked"* as a cost | accepted by the ruling — ⛔ a leg here, ⛔ backfilled ([[feedback_record_unattested_no_backfill]]) |

## ⭐ THE INVARIANTS

- **I1 — Only on the member's request, for an open request.** A code is sent ONLY by `POST /api/v1/member/wa-opt-in/code` from the
  signed-in member, ONLY while that member has a PENDING opt-in and their Pariwar's WhatsApp is enabled; the app offers it ONLY behind the
  signup step's *"WhatsApp on another phone?"* link after the tick (WC6, WC7). Nothing sends a code on its own. *Proof:* AC2, AC1.
- **I2 — The registered number only.** The code goes to the member identity's decrypted mobile; ⛔ request field names a number. *Proof:* AC2.
- **I3 — At most two codes per request, two tries per code — the DATABASE's rule.** Counted sends per PENDING ≤ 2 and attempts per code
  ≤ 2 are CHECK / partial-unique constraints, ⛔ only application checks ([[feedback_mechanization_split_commitment]]). *Proof:* AC3, AC4.
- **I4 — A code switches on WhatsApp and nothing else.** Its own table, its own routes; it never creates a session, never satisfies a
  step-up, never touches `member_auth_otps` (§2.2's *"distinct OTP pools per intent class"*). *Proof:* AC6.
- **I5 — The same yes.** A correct code writes the same `whatsapp_opt_in` consent row and the same PENDING → ACTIVE transition as the
  worker's phrase match, in ONE transaction under `lockMemberWaYes`, audit-first — so STOP, the in-app withdraw, 131050, the 6.31
  reminder and the alert rung treat it exactly like any other yes. *Proof:* AC4, AC5.
- **I6 — Never a dead end, never a false offer.** A Pariwar whose code route is not provisioned shows 5.10's hint unchanged (no code
  offer); every failure after an offer (send refused, both codes spent, a hang) still shows the 5.10 number + phrase and lets the member
  continue signup. *Proof:* AC1, AC8, AC9, AC13.
- **I7 — The code is never written down in clear.** Only its hash is stored; the code is in ⛔ log line, audit line, error detail or
  response. *Proof:* AC6.

## 📜 Policy meaning (AI-10-1)

**5.13 introduces NO predicate that gates a member's access to a benefit, and changes none.** Its new conditions decide whether TWT may
SEND a code (an open request, WhatsApp enabled, fewer than two codes) and whether a typed code switches on a convenience channel; nothing
reads them to decide a payment, a pool, a claim, a warning or a member state, and a member who never finishes still gets everything in the
app. In the member's terms: *"if your WhatsApp is on another phone, you can ask TWT to send a code to your registered number on WhatsApp —
at most twice — and typing it in here turns WhatsApp messages on; if it does not work, you can still send the message from that phone, or
carry on without WhatsApp."* Checked against the Niyamavali (2026-10-21, `docs/legal/niyamavali.md` — the private corpus copy in the main
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
  `lockMemberWaYes` → `consent.recordConsent(tx, {consentType: 'whatsapp_opt_in', grantedViaActor: 'member_self', consentPayload: {source:
  'meta_webhook_inbound'}, auditId, consentId})` → `activateOptIn(tx, {…, windowExpiresAt: now()+24h, consentId})`; on failure
  `member.wa_opt_in_activated_rolled_back`. (The worker uses a local `writeAuditEntry` wrapper; apps/jobs is ⛔ in the access-wrapper
  invariants' roots — the API module IS, F18.)
- **F6 — What else reads a yes:** `isOptInActive` = `state='ACTIVE'` (`read.ts:145-158`); 6.31's reminder = `isOptInActive` AND
  `consentExists` (`read.ts:168-171`) ⇒ a code-confirmed yes MUST carry both rows (I5); `resolveWaTarget` (`packages/domain/src/notifications/
  delivery.ts:116-149`) = enabled AND `isOptInActive` ⇒ ⛔ usable for a PENDING member's code — read the mobile directly (F8). STOP →
  `endEveryWaYes` (ACTIVE → REVOKED + every open consent) regardless of route; 131050 → BLOCKED_BY_META on the ACTIVE row
  (`wa-webhook-processor.ts:145,510-523`). A STOP from a member with only a PENDING ends nothing (F7 / WC12).
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
  parameter (F21) ⇒ a new message shape (WC1). `createWhatsappAppCache(fetchImpl?)` (`:239`) builds one client per Pariwar from
  `{phoneNumberId, accessToken, graphApiVersion}` (first build only — a rotation needs a restart, `:22-26`). `whatsapp-app.ts` is ⛔ sha-pinned;
  it IS under the access-wrapper invariants (`packages/channels/src` ∈ `CHANNEL_ROOTS`, F18).
- **F12 — Direct-send classification** (`packages/channels/src/providers/whatsapp-direct-send-outcome.ts:74-115`,
  `classifyDirectWaSendFailure`) — IN CODE ORDER (the first rule that matches wins — footgun #51): `WhatsappTemplateParamError` →
  `unknown_scope:param_invalid`; a non-`WhatsappSendError` throw → `may_have_sent`; `transport:'connect'` → `transient:'api_unavailable:000'`;
  status 0 → `may_have_sent`; a 2xx without a wamid → `may_have_sent`; 502/504 → `may_have_sent:gateway_5xx`; scope codes `{131048, 131031,
  131042, 131045, 131057, 133010, 368}` / 132xxx / 401/403 → `scope`; `{131026, 131021}` → `recipient`; 429 / `{130429, 131056, 80007}` →
  `transient:rate_limited:<code>`; other 5xx → `transient:api_unavailable:<status>`; else `unknown_scope`. ⚠ So a 131048 arriving on a 429 is
  `scope`, ⛔ `rate_limited`. ⚠ The file is sha-PINNED (F14) — import it, ⛔ edit it. The 6.37d cap (`-371`) counts `api_unavailable:<5xx>`
  other than `:000`, and ⛔ `rate_limited:*` / `:000` — the WC3 precedent.
- **F13 — Template names for direct sends** live in Secret-Manager config keys, ⛔ `pariwar_wa_templates`: `waTemplateConfigKey(purpose,
  locale, pariwarId)` → `wa.template.<purpose>.<en|hi>.<pariwarid>` (`apps/jobs/src/scheduler/wa-template-config-key.ts:15-20`; its header:
  *"ONE builder for a KEY FAMILY"*, *"a direct sender's template lives here"*; ⚠ *"A dotted name is `INVALID_ARGUMENT` in GCP Secret Manager"*
  — UNVERIFIED, deferred-work). `pariwar_wa_templates` keys on ALERT categories with a CHECK, its schema file is sha-PINNED, and ⛔ column
  records Meta's category. In apps/api the resolver is `resolveChannelSecret` (`deps.ts:474-478` — Secret Manager in production, an env
  fallback from the name otherwise); it THROWS on not-found AND on an outage alike (unlike jobs' `resolveSmsDltConfig`, which returns
  `null` for not-provisioned).
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
  webhooks write `whatsapp_send_status` by wamid (`wa-webhook-processor.ts:463-526`); only 6.37d correlates to its own rows.

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
  `packages/channels/src`): invariant (f) scans ONLY functions that call `createHmac`, a `resolve*Secret`, an approved comparator, or hold
  a verify-header literal (`scripts/access-wrapper-invariants/lib.ts:261-272`) — a verify doing `hashOtp(code) === row.codeHash` would be
  GREEN, and `packages/domain/src/wa-opt-in/` is ⛔ in `CHANNEL_ROOTS` at all ⇒ the constant-time compare needs its OWN source leg (AC4);
  invariant (g) — a bare `audit.writeAuditEntry` in the module FAILS ⇒ every audit line goes through `withCompensatingAudit` (or
  `writeRolledBackAudit`). `withCompensatingAudit` (`packages/domain/src/audit/compensating.ts`) writes the intent line FIRST and, if
  `mutate` THROWS, writes `<action>_rolled_back` and rethrows — so a refusal must be decided BEFORE the wrapper, or the wrapper's `mutate`
  must RETURN (⛔ throw) for a committed-then-refused outcome (WC5, WC9). The API error mapping is
  `apps/api/src/middleware/error-mapping/index.ts` (wa-opt-in block `:598-612`; `WaOptInStateError` → 409 `wa_opt_in.invalid_state`);
  domain errors carry ⛔ `details` — a handler throws `ConflictError(message, code, details)` (`http-errors.ts:68-72`) for those that need it. OpenAPI paths are hand-registered in `packages/contracts/scripts/emit-openapi.ts`
  (wa-opt-in at `:1527-1564`) and a CI determinism gate requires the emitted `openapi/v1.yaml` byte-identical. Domain audit actions have
  ⛔ registry (regex `^[a-z0-9_]+(\.[a-z0-9_]+)+$`, `packages/domain/src/audit/write.ts:95-102`).
- **F19 — The app's code inputs** (`(auth)/otp.tsx:158-166`, `(claim)/handover-otp.tsx:50-58`): `keyboardType="number-pad"`, `maxLength`,
  `autoFocus`; ⛔ `textContentType="oneTimeCode"` / `autoComplete` anywhere in `apps/mobile`; ⛔ resend cooldown UI anywhere; errors split
  only 429 vs everything else plus specific `auth.*` codes, as plain un-announced `Text`. ⇒ The code form follows the 5.10 step's patterns
  (bounded calls, `ApiError` codes, `AnnouncedText`), ⛔ `otp.tsx`'s.
- **F20 — Tests and copy gates** (5.10's): `tests/unit/wa-signup-step-render.test.ts` (887 lines) mocks `lib/member-api` with ONLY
  `getWaOptInStatus` / `requestWaOptIn` (`:45-47`) and has ⛔ tamagui `Input` mock; its tamagui `Button` records full props per testID;
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

## ⚖️ Build decisions WC1–WC14 (⭐ = recommended) — PROPOSED for BigDev at Task 0.2

- **WC1 — Where the code is sent from.** ⭐ **(a)** In the API request (`POST …/code`), synchronously — the 5.9 step-up precedent (F15):
  claim the slot (tx 1, committed), call Meta with `timeoutMs: 10_000` OUTSIDE any transaction or lock, record the outcome (tx 2).
  `apps/api/src/modules/wa-opt-in/code-delivery.ts` exports `resolveCodeDelivery(deps, {pariwarId, memberId})` — config completeness,
  the template name (`hi` then `en`, through an injected `resolveSecret`, checked against `/^[a-z0-9_]{1,512}$/` — the 6.31 form,
  `claim-peer-mesh-wa-reminders.ts:166`), the token, the decrypt, the `+` stripped — returning `{ ok: false, reason }` or a send plan,
  and `sendCode(plan, code)` over the module's OWN `createWhatsappAppCache(fetchImpl)` (F14 — apps/api is outside the one-cache rule).
  ⭐ **The ONLY test seam is the transport** — `fetchImpl` injected through `deps` (`apps/api/src/context.ts` AppDeps, beside
  `stepUpDelivery` `:534`; `_setup.ts` supplies a recording fetch) — so resolution, the request body and classification run for real in
  tests and the "no call" legs can fail (AC2, AC8). `deps.ts` wires the real resolution and transport in EVERY environment — ⛔ dev "reveal"
  or log adapter (unlike 5.9's `deps.ts:322-326`; I7): unprovisioned ⇒ 503 + fallback. An injectable `log` (class tokens only) lets AC6
  spy on it. `whatsapp-app.ts` gains a third message shape `{ templateName, languageCode, authenticationCode }` emitting the body parameter
  AND the copy-code button parameter (F11). **(b)** Enqueue a pg-boss job in apps/jobs (the
  direct senders' home). *Cost (a):* the first WhatsApp send in apps/api, a second client cache (one per process), the request waits up to
  10 s on Meta. *Cost (b):* the member waits for a job pickup (up to a minute) with no way to tell them it failed; a queue, a job and a
  status read for one message; the 09:00–20:00 send window of the existing senders would not apply to a code the member is waiting for
  anyway. ⭐ (a): the member is looking at the screen, and a code that arrives late has expired.
- **WC2 — Where codes are stored.** ⭐ **(a)** A NEW table `member_wa_opt_in_codes` (the next free migration), one row per counted send:
  `code_id` uuid PK; `pariwar_id`; `opt_in_id` (FK → `member_wa_opt_in`); `member_id`; `send_seq smallint CHECK (send_seq IN (1,2))`;
  `code_hash text NOT NULL`; `expires_at timestamptz NOT NULL`; `attempts smallint NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 2)`;
  `consumed_at`, `invalidated_at` (nullable); `send_outcome text NOT NULL DEFAULT 'sending' CHECK IN ('sending','accepted','may_have_sent',
  'refused','released')`; `provider_message_id`, `detail` (a class token — ⛔ PII); `created_at`. **Partial unique `(opt_in_id, send_seq)
  WHERE send_outcome <> 'released'`** — with `send_seq ∈ {1,2}` the DATABASE refuses a third counted code (I3; the 0176 precedent). A
  retry after a `released` row takes `send_seq` = (count of non-released rows for the PENDING) + 1 — so a released row never burns a seq.
  RLS ENABLE+FORCE with PER-VERB select / insert / update tenant policies on the CURRENT precedent — migration 0172 +
  `packages/domain/src/policies/claim-contact-wa-rls.ts` + `apps/api/tests/integration/rls/claim-contact-wa-policy-regression.spec.ts`
  (`policies/README.md` "Test discipline": a regression spec + a cross-Pariwar probe) — ⛔ 0042's `FOR ALL`; `GRANT SELECT, INSERT, UPDATE`
  to `twt_app` (⛔ DELETE). Domain functions in a NEW `packages/domain/src/wa-opt-in/code.ts` (⛔ pinned `read.ts` / `write.ts`); they RETURN
  discriminated refusals (`{ ok: false, refusal: 'not_pending' | 'already_active' | 'limit' | 'too_soon', … }`), ⛔ throw, so the handler
  decides refusals BEFORE any audit wrapper (WC5). `findLiveCode` = the newest row for the PENDING with `send_outcome IN ('sending',
  'accepted', 'may_have_sent')`, ⛔ consumed, ⛔ invalidated, ⛔ expired — it RETURNS the hash; the compare is the API's (domain cannot import
  `auth/shared/otp.ts`). **(b)** `member_auth_otps` with a new intent (F10). *Cost (a):*
  a migration and a second code store. *Cost (b):* edits the auth OTP service (a per-call cap, a request link, a send counter), a GLOBAL-RLS
  table for a tenant record, and the code shares a table with login codes against §2.2's *"distinct OTP pools"* spirit (the pool is the
  intent — still separable, but one mistake from cross-burning). ⭐ (a).
- **WC3 — Counting and timing.** ⭐ A code is 6 digits (`generateOtp`), valid **10 minutes** by the DB clock (= Meta's default delivery TTL
  and the template's expiry footer — a code is ⛔ valid after WhatsApp would drop it); **at most 2 COUNTED sends per PENDING**; send #2
  INVALIDATES send #1's code — in tx 2, and ONLY when send #2's outcome is `accepted` or `may_have_sent` (a released or refused send #2
  leaves the code the member already holds alive); **60 s** before the next send, measured from the last send that MAY have reached the
  member (`sending` / `accepted` / `may_have_sent`) — a `released` or `refused` row starts ⛔ wait (nothing reached the member) though a
  refused row still COUNTS — reported RELATIVELY (`resendAfterSeconds`, ⛔ an absolute time the device clock can misread); **2 entry attempts per code** (a wrong second attempt invalidates it).
  A send COUNTS unless Meta provably did not act on it (the `-371` rule). The outcome table (F12's kinds, in its order):

  | `classifyDirectWaSendFailure` | `send_outcome` | Counted? | API answer | App |
  |---|---|---|---|---|
  | (⛔ throw — wamid) | `accepted` | yes | 200 `delivery: 'sent'` | code field |
  | `may_have_sent` (non-`WhatsappSendError`, status 0 / timeout, 2xx without wamid, 502/504); a crash mid-send (row left `sending`) | `may_have_sent` | yes | 200 `delivery: 'uncertain'` | code field + `waCode.sent_uncertain` |
  | `transient:api_unavailable:000`, `transient:rate_limited:*` | `released` | ⛔ | 502 `wa_opt_in.code_send_failed` | `send_failed` + Send again (⛔ wait) |
  | `unknown_scope:param_invalid` (a code / name that never left) | `released` | ⛔ | 502 `wa_opt_in.code_send_failed` | as above |
  | `transient:api_unavailable:<5xx ≠ 502/504>` | `may_have_sent` | yes | 200 `delivery: 'uncertain'` | code field + `sent_uncertain` |
  | `recipient` (131026 / 131021), `scope` (incl. 131048 on a 429), other `unknown_scope` | `refused` | yes | 502 `wa_opt_in.code_send_failed` (`details.codesRemaining`) | `send_failed` + resend if one remains + `OtherPhoneDetails` |

  *Cost:* a member whose first code is refused as not-on-WhatsApp still has only one more; a Meta outage spanning both sends spends the
  request (the 6.37d cost, `-372`); after both codes the member's routes are the phrase (still open) or a new request once the PENDING
  lapses (48 h — F3). *Alternatives:* count every call (stricter, ⛔ needed — the ruling bounds codes that can reach the member); 5-minute
  validity (the login OTP's — tighter than WhatsApp's own delivery window).
- **WC4 — Which template.** ⭐ **(a)** Move `waTemplateConfigKey` (and its purpose union) unchanged into `packages/channels/src/
  wa-template-config-key.ts`, re-exported; apps/jobs imports it from there (its three purposes unchanged); add purpose `'wa_opt_in.code'`.
  The API adapter resolves `wa.template.wa_opt_in.code.hi.<pariwarId>` and, if that throws, `…code.en.<pariwarId>` (the app is always
  Hindi — [[project_mobile_app_no_language_switch]]); language code `hi` / `en` exactly. ⛔ resolvable name, ⛔ complete config (`enabled`,
  `phoneNumberId`, `accessTokenSecretName`), or a token that will not resolve ⇒ 503 `wa_opt_in.code_unavailable` — ⛔ a log stand-in that
  reports `accepted` (the 5.10 F7b class, I6). ⭐ **The mint tells the app beforehand:** `CreateWaOptInResponse` gains `codeAvailable:
  boolean` (a `.strict()` contract change — OpenAPI regenerated), computed by the mint (new AND re-used PENDING paths) as "config complete
  AND a template name resolves" (`resolveCodeDelivery`'s config + name steps, ⛔ the decrypt; any throw ⇒ `false`), OUTSIDE the mint's lock
  window; `false` ⇒ the app shows 5.10's `OtherPhoneHint` unchanged (I6, AC1). The status response is unchanged. *Cost:* up to two Secret
  Manager reads on every mint; a template removed between mint and send still yields the 503 + fallback. **(b)** A `pariwar_wa_templates` row — its alert-category CHECK and pinned schema (F13, F14).
  **(c)** A new column on `pariwar_wa_config`. *Cost (a):* touches a jobs import (behaviour unchanged; its tests must stay green); an outage
  of Secret Manager reads as "not provisioned" (both throw — F13) — the server LOGS which (a class, ⛔ the name), the member sees the
  fallback either way. ⭐ (a) keeps the house rule *"ONE builder for a KEY FAMILY"* with its second consumer ([[feedback_no_premature_package]]).
- **WC5 — What a correct code writes.** ⭐ ONE route `POST /api/v1/member/wa-opt-in/code/verify` `{ code }`, in THIS order (F18 — a
  refusal decided inside `withCompensatingAudit` would write an "activated" line + `_rolled_back` AND roll back the attempt count, making
  tries unlimited):
  1. `openScopeTx` → `lockMemberWaYes` → the PENDING / ACTIVE check (`already_active` / `not_pending`) → `findLiveCode` →
     `timingSafeHashCompare(hashOtp(code), live.codeHash)` in the API handler — all OUTSIDE any audit wrapper.
  2. **Correct:** `withCompensatingAudit` (`member.wa_opt_in_activated`, originating channel **`member_app_wa_code`** — a NEW value appended
     to `WA_OPT_IN_ORIGINATING_CHANNELS`, PENDING → ACTIVE), `mutate` = `consumeCode` (`WHERE consumed_at IS NULL AND invalidated_at IS NULL
     AND expires_at > now()`; 0 rows ⇒ throw) → `recordConsent(tx, {consentType: 'whatsapp_opt_in', grantedViaActor: 'member_self',
     consentPayload: { source: 'member_app_wa_code', uiContext: 'signup', codeId }, auditId, consentId})` → `activateOptIn(tx, { …,
     windowExpiresAt: null, consentId })`; `ok = true` → 200.
  3. **Wrong, or no live code:** `withCompensatingAudit` (`member.wa_opt_in_code_rejected`), `mutate` = `recordWrongAttempt` (a no-op when
     there is no live code) which RETURNS `{ attemptsRemaining, codesRemaining }`; `ok = true` so `closeScopeTx` COMMITS; only AFTER the
     `finally`, throw `ConflictError('…', 'wa_opt_in.code_wrong' | 'wa_opt_in.code_no_longer_valid', details)`.
  The send route follows the same rule: the refusals (`not_pending`, `already_active`, `channel_unavailable`, `limit`, `too_soon`) are
  decided under the lock BEFORE `withCompensatingAudit(member.wa_opt_in_code_sent, mutate: insert the slot)`. `ActivateOptInInput.windowExpiresAt`
  widens to `Date | null` (null = ⛔ customer-service window opened — honest, F4); the worker still passes its Date; the `write.ts` sha
  pin is RE-TAKEN with a dated comment (F14). §3.4's *"recorded with timestamp + the UI context"*: the consent row's `granted_at` + the
  payload's `uiContext` (the only surface — WC6) + the mint's own audit line (the tick). *Alternatives:* a separate ACTIVE writer in
  `code.ts` (⛔ pinned edit — but a SECOND copy of the PENDING → ACTIVE guard to keep consistent); `windowExpiresAt = now()+24h` (records a
  window that never opened). *Cost:* a pinned-file edit, deliberately.
- **WC6 — Where the code is offered.** ⭐ **(a)** The SIGNUP step only (`-374`'s option as put — *"Only after the member ticks the box"*).
  The "WhatsApp notifications" screen keeps 5.10's phrase hint unchanged. **(b)** Also that screen's PENDING state — it would extend the
  option as put (⛔ box there) ⇒ a routing note to the Panel first (template §0), ⛔ built until ruled. *Cost (a):* a member who did ⛔ finish at
  signup and later opens "WhatsApp notifications" from another phone gets only the phrase. *Cost (b):* a Panel question and a wait. ⭐ (a);
  (b) only if BigDev wants the question asked.
- **WC7 — What the signup link shows.** ⭐ When the mint said `codeAvailable: true`, the signup step's `<OtherPhoneHint …/>` is REPLACED
  by a NEW `OtherPhoneCodeHint` (same `waOtherPhone.link` label, its OWN testID `wa-code-link`, collapsed by default); when `false`,
  `OtherPhoneHint` renders exactly as today (its `wa-other-phone-link` legs unchanged). Expanded, `OtherPhoneCodeHint` shows the code form
  (`WaCodeEntry`, testIDs `wa-code-send` / `wa-code-input` / `wa-code-confirm` / `wa-code-resend`): `waCode.intro` + *"Send me a code on
  WhatsApp"* → (200 `sent`) `waCode.sent`, or (200 `uncertain`, or a client timeout on Send) `waCode.sent_uncertain`, then a code field
  (`keyboardType="number-pad"`, `maxLength={6}`, `textContentType="oneTimeCode"`, `autoComplete="one-time-code"` — first use in the app,
  harmless; the code arrives on ANOTHER phone, so ⛔ autofill is expected), *"Confirm"* (enabled at 6 digits), *"Send another code"* (only
  while a second code remains; disabled with `waCode.resend_wait` for `resendAfterSeconds`, counted down from the response — ⛔ the device
  clock). A correct code → an `activated` flag replaces WHICHEVER stage body is showing (`ask` or `sent`) with `waCode.done` (testID
  `wa-code-done`) and clears `error`; Continue → payment as before. **The code route is CLOSED** — `code_limit_reached`, a refused send
  with ⛔ code left, a wrong final attempt with ⛔ code left, `code_unavailable` (a template removed after the mint), a non-specific failure —
  ⇒ the form shows its line and, below it, 5.10's number + phrase (`OtherPhoneDetails`, extracted UNCHANGED from `OtherPhoneHint`, which
  keeps rendering it — Settings untouched). `WaCodeEntry`'s `isCurrent` is its OWN action-version counter, bumped on blur/unmount (the step's
  `actionVersion` pattern, F16 — ⛔ the step's counter, which `onReopen` also bumps). ⭐ Also render the link on the `ask` stage when `error ===
  'link'` AND a mint exists — a RARE path (the `https://wa.me/…` link usually resolves even with ⛔ WhatsApp, F16), kept because the PENDING
  exists and the tick happened. *Cost:* the 5.10 phrase becomes a second-line route on signup for provisioned Pariwars; three new
  components; the step file grows. *Alternative:* keep the phrase first and the code second (more words for every member who opens the
  link — ⛔ recommended; `-374` Consequence 2 says the code REPLACES what the link shows).
- **WC8 — The words.** ⭐ A `waCode.*` family (en + DRAFT hi, 15 rows, table below), ⛔ `{token}`, ⛔ digits (a style choice for these
  strings — the microcopy `numerals` rule flags only Devanagari digits, and the copy test's digit ban covers `waOtherPhone.desc` only),
  pointing to the registered number, never threatening (R10(B)), never "Settings" (5.10 F14). BigDev reviews the en AND the hi at Task 0.2
  (5.10's v1.5/v1.6 precedent); WC13 (b) records whether that discharges Row 28's control. Re-used, ⛔ re-minted: `waOtherPhone.link`,
  `waOtherPhone.desc` / `number_label` / `message_label` / `note` (inside `OtherPhoneDetails`), `waSignup.continue`.
- **WC9 — What is audited (§2.2 floor: per send + per attempt + per consume).** ⭐ Every line via `withCompensatingAudit` (F18 (g)), resource
  `pariwar/<p>/member/<m>/wa-opt-in`, actor = the member, originating channel `member_app_wa_code` on EVERY code line, payload hash
  `waOptInAuditPayloadHash` with the PENDING's phrase: `member.wa_opt_in_code_sent`
  (PENDING → PENDING, around the slot claim), `member.wa_opt_in_code_released` (around the `released` mark — a provably unsent call),
  `member.wa_opt_in_code_rejected` (around each wrong / no-live-code attempt's committed increment — WC5 step 3), `member.wa_opt_in_activated`
  (WC5 step 2 — the consume). A refusal decided before the wrapper (WC5) writes ⛔ line. ⛔ line carries the code or its hash. *Cost:* up to
  ~8 audit lines per request.
- **WC10 — Abuse limits.** ⭐ Both routes get the per-member route limit (`writeRateMax` / 1 min, `perMemberKey`, `hook: 'preHandler'` — F2)
  ON TOP of the database caps; a malformed code (⛔ 6 digits) is a 400 from the contract and spends ⛔ attempt; a double tap on Send is safe
  (the second sees the 60 s rule under the lock → 409). *Cost:* none beyond the 429 test.
- **WC11 — Tell the Panel the reading as built.** ⭐ **(a)** A short TOLD item (`trustee-panel-told-<date>-5-13-…`, ⛔ a question):
  *"one retry"* is built as one more code on request (at most two codes) and two tries per code; a send Meta provably never made does ⛔
  count. Written at Task 0.4; "told" only once BigDev sends it ([[feedback_shown_to_panel_means_sent]]). **(b)** Nothing — `-374` already
  records BigDev's reading. *Cost (a):* one more note. ⭐ (a): it is the exact number of WhatsApp messages the Trust sends to someone not yet
  switched on — the heart of what was ruled.
- **WC12 — A STOP before the code is typed.** ⭐ **(a)** Unchanged: a STOP from a member with only a PENDING ends nothing (F6) — the code,
  typed afterwards, is a later and explicit in-app yes, and the worker's STOP path (shared with 6.37d) is ⛔ touched. **(b)** A STOP also
  expires the members' open PENDING on that number (codes and phrase die with it). *Cost (a):* a member who replies STOP to the code message
  and then types the code is switched on (their last act wins). *Cost (b):* a worker change on the STOP path, sequenced against 6.37d; the
  phrase route changes too. ⭐ (a).
- **WC13 — Go-live.** ⭐ A NEW roster row, KEY `wa-opt-in-code-template-approved` (the next free Row at Task 0.4; Row 38's shape),
  decision-authored, ⛔ a merge fence: **(a)** per live Pariwar, a Meta AUTHENTICATION copy-code template APPROVED (security recommendation
  on, `code_expiration_minutes: 10`), its name set under `wa.template.wa_opt_in.code.<hi|en>.<pariwarId>`, and the key PROVEN to resolve in
  production (the dotted-name caveat, F13) — or "Meta refuses" recorded; until then the link shows 5.10's phrase (I6); **(b)** the 15 `waCode.*`
  Hindi strings human-reviewed (Row 28's control); **(c)** Meta's India authentication rate recorded from Meta's OWN rate card (F21 — the
  ruling accepted the charge; the figure is unrecorded). Counsel: ⛔ a leg — `-374` accepted *"Counsel has not been asked"*. *Cost:* one more
  open row.
- **WC14 — Records.** ⭐ One author-commit decision (the next free id) carrying WC1–WC13 as answered, the §0 readings (1)–(5), "Supersessions:
  none" (`-374` superseded; this entry builds it), and what it does NOT cover (counsel; the mismatch confirmation; Settings if WC6 (a)); an
  `epics.md` `### Story 5.13` entry (post-hoc, 5.10's shape, after 5.12); a dated note under §3.4's opt-in bullets and an "annotated"
  ADR-0029 changelog row (*"the code route is built: …"*); the roster row; the friction row (WC: one `optional` row — Task 6); `deferred-work.md`:
  annotate the mismatch item (F7 — trigger fired, ⛔ built by 5.13) and the 5.12 round-2 W2 item (the sweep takes ⛔ lock — a new consumer:
  a code sent near the PENDING's 48 h lapse can outlive it, and verify then answers `not_pending`; row-level safe, both updates are guarded
  `WHERE state='PENDING'`) — annotated, ⛔ closed — and ADD two pre-existing items found here — `graph_api_version` DEFAULT
  `v21.0` is removed by Meta 2027-01-21, and Meta's INR billing deadline 2026-12-31 (F21) — both whole-WhatsApp, ⛔ 5.13's; the WC11 told
  item; the ledger. ⛔ edit any ratified sentence.

**PQ — none.** Every WC is the author's; WC6 (b) and WC11 (a) are the only routes to the Panel, and both are optional.

### The words (WC8) — en and hi are DRAFTS for BigDev's review at Task 0.2

| Key | en (DRAFT) | hi (DRAFT) |
|---|---|---|
| `waCode.intro` | TWT can send a code on WhatsApp to your registered number. Open WhatsApp on the phone that has it, then type the code here. | TWT आपके पंजीकृत नंबर पर व्हाट्सएप से एक कोड भेज सकता है। जिस फ़ोन में वह व्हाट्सएप है, उसमें व्हाट्सएप खोलें और कोड यहाँ लिखें। |
| `waCode.send` | Send me a code on WhatsApp | मुझे व्हाट्सएप पर कोड भेजें |
| `waCode.sent` | We sent a code on WhatsApp to your registered number. It works for a short time only. | हमने आपके पंजीकृत नंबर पर व्हाट्सएप से कोड भेजा है। यह कोड थोड़ी देर ही चलेगा। |
| `waCode.sent_uncertain` | We may not have been able to send the code. If it arrives on WhatsApp, type it here. | हो सकता है कोड नहीं भेजा जा सका हो। अगर व्हाट्सएप पर कोड आए, तो उसे यहाँ लिखें। |
| `waCode.input_label` | Code from WhatsApp | व्हाट्सएप से मिला कोड |
| `waCode.confirm` | Confirm | पुष्टि करें |
| `waCode.resend` | Send another code | दूसरा कोड भेजें |
| `waCode.resend_wait` | You can ask for another code in a minute. | आप एक मिनट बाद दूसरा कोड माँग सकते हैं। |
| `waCode.wrong_retry` | That code is not right. Check it and try once more. | यह कोड सही नहीं है। जाँचकर एक बार फिर लिखें। |
| `waCode.wrong_final` | That code is not right, and it can't be used again. | यह कोड सही नहीं है, और अब इसका उपयोग नहीं हो सकता। |
| `waCode.no_longer_valid` | This code is no longer valid. | यह कोड अब मान्य नहीं है। |
| `waCode.send_failed` | We couldn't send a code just now. | अभी कोड नहीं भेजा जा सका। |
| `waCode.verify_failed` | We couldn't check the code just now. | अभी कोड की जाँच नहीं हो सकी। |
| `waCode.no_more` | No more codes can be sent. You can still send the message below. | अब और कोड नहीं भेजे जा सकते। आप फिर भी नीचे दिया गया संदेश भेज सकते हैं। |
| `waCode.done` | WhatsApp messages from TWT are on. | TWT के व्हाट्सएप संदेश चालू हो गए हैं। |

The closed-route lines (`send_failed`, `no_more`, `wrong_final` with no code left) are followed by `OtherPhoneDetails`, whose `waOtherPhone.desc`
already says *"From the phone that has your WhatsApp, send the message below to this number:"* — so ⛔ bridging string is minted.
`waCode.no_longer_valid` avoids "expired" (5.12's ban is on `waNotifications.*` only, but the meaning is "spent, replaced or timed out" —
one line for all three). *"It works for a short time only"* — 10 minutes (WC3); BigDev may prefer *"for 10 minutes"* (no gate forbids
the digit in `waCode.*` — WC8). `send_failed`'s *"just now"* is true for its causes once WC4's `codeAvailable` keeps unprovisioned
Pariwars off the form. `verify_failed` is shown only after a bounded status re-read finds the yes NOT on (AC9). Task 2 runs the microcopy
gate on the committed JSON; fix wording, ⛔ the rule.

## Acceptance Criteria

**AC1 — The link on the signup step offers the code only where it can work (I1, I6; WC4, WC6, WC7).** Given a member on the signup
step's `sent` stage, OR on its `ask` stage with `error === 'link'` after a successful mint: when the mint said `codeAvailable: true`, a
collapsed `waOtherPhone.link` control (`OtherPhoneCodeHint`, `wa-code-link`) is shown; expanded, it shows `waCode.intro` and a
`waCode.send` button — ⛔ the number + phrase; when `codeAvailable: false`, `OtherPhoneHint` renders exactly as 5.10 built it (number +
phrase behind `wa-other-phone-link`). Without a mint, or on any other stage, ⛔ link. `(settings)/notifications.tsx` and its PENDING hint
are unchanged in behaviour (its existing tests pass unmodified). The mint's `codeAvailable` is `true` only for an enabled, complete config
with a resolvable template name (`hi` or `en`), on both the new and the re-used PENDING paths; any resolution throw ⇒ `false`.
*Legs:* render tests — sent stage with `codeAvailable: true` (collapsed, then expanded: intro + send; ⛔ `wa-other-phone-number`) and with
`false` (5.10's hint); ask + link-failed with a mint (link shown); ask with a request failure (⛔ link); a source assertion that
`notifications.tsx` still renders `OtherPhoneHint`; API legs for `codeAvailable` true / false (name unresolvable; config incomplete; re-used
PENDING) through the recording-fetch seam.

**AC2 — A send (I1, I2, I7; WC1, WC3, WC4).** `POST /api/v1/member/wa-opt-in/code` (body `{}` — `.strict()`; the api-client sends `{}` —
[[project_fastify_empty_json_body_400]]), member session + per-member rate limit. Refusals decided under `lockMemberWaYes` BEFORE any
audit line (WC5): ⛔ PENDING → 409 `wa_opt_in.not_pending` (ACTIVE → `wa_opt_in.already_active`); WhatsApp off → 409
`wa_opt_in.channel_unavailable`; two counted sends → 409 `wa_opt_in.code_limit_reached`; inside 60 s of the last send that may have reached the member (WC3) → 409
`wa_opt_in.code_resend_too_soon` (`details.retryAfterSeconds`); unprovisioned → 503 `wa_opt_in.code_unavailable`. Otherwise the server
generates a 6-digit code, stores ONLY its hash with `expires_at = now() + 10 min` (DB clock) in a `sending` row with `send_seq` = (counted
rows) + 1, decrypts the REGISTERED mobile outside the lock, calls Meta, and records the outcome per WC3's table — invalidating the earlier
live code ONLY on `accepted` / `may_have_sent`. 200 `SendWaOptInCodeResponse { delivery: 'sent' | 'uncertain', codesRemaining: 0 | 1,
resendAfterSeconds: number | null }`; `released` and `refused` → 502 `wa_opt_in.code_send_failed` (`details.codesRemaining`).
*Legs (live DB, :5433, the recording `fetchImpl` — the ONLY fake):* happy path (the recorded request's `to` = the identity's decrypted mobile
without `+`, computed by the REAL resolution; the body + button parameters equal the code; the row holds a 64-hex hash ≠ the code;
`expires_at − created_at` = 10 min); each refusal (⛔ fetch call, ⛔ audit line); each row of WC3's table driven by the recorded fetch's
response — incl. 429 → `released`, connection refused → `released`, 503 → counted `may_have_sent`, 131026 → counted `refused`, **131048 on a
429 → counted `refused`** (F12 order), a timeout → counted `uncertain`; after a `released` retry the counted seq is still 1; a released
send #2 leaves code #1 live; an accepted send #2 invalidates code #1; another member's PENDING is never used.

**AC3 — The database caps the codes, and the lock serializes them (I3; WC2).** The migration's constraints refuse a third counted row for
one PENDING (`send_seq ∈ {1,2}` + partial unique `WHERE send_outcome <> 'released'`) and `attempts > 2`, independent of the handler; RLS
isolates Pariwars. *Legs (live DB):* a raw INSERT of a third counted row fails (23505 / 23514); an UPDATE to `attempts = 3` fails; **three
CONCURRENT sends for one PENDING (separate connections — [[project_db_clock_ordering_tests_tie]]) yield EXACTLY ONE counted row and two
409 `wa_opt_in.code_resend_too_soon`** (a missing lock would let two through); an RLS regression spec on the 0172 pattern (a cross-Pariwar
probe reads / writes ⛔ row). The migration is forward-only; ⛔ regenerate an applied migration ([[project_live_db_test_gotchas]]).

**AC4 — A typed code (I3, I5; WC3, WC5).** `POST /api/v1/member/wa-opt-in/code/verify` `{ code }` (`/^\d{6}$/`; anything else 400
`request.validation`, ⛔ an attempt), in WC5's order. Correct → in ONE tx under `lockMemberWaYes`, audit-first (`member.wa_opt_in_activated`,
`member_app_wa_code`): the code consumed, a `whatsapp_opt_in` consent row (`member_self`, payload `{ source: 'member_app_wa_code', uiContext:
'signup', codeId }`), the PENDING → ACTIVE with `window_expires_at` NULL and `consent_id` set; 200 `{ state: 'ACTIVE' }`. Wrong, first try →
the attempt COMMITTED, 409 `wa_opt_in.code_wrong` `details: { attemptsRemaining: 1, codesRemaining }`; wrong, second try → the code
invalidated (committed), 409 `wa_opt_in.code_wrong` `details: { attemptsRemaining: 0, codesRemaining }`; ⛔ live code (spent, replaced,
expired, none sent) → 409 `wa_opt_in.code_no_longer_valid` `details: { codesRemaining }`; the PENDING already ACTIVE (the phrase won) → 409
`wa_opt_in.already_active`; ⛔ PENDING → 409 `wa_opt_in.not_pending`; `activateOptIn` 0 rows (the sweep won) → 409 `wa_opt_in.invalid_state`.
A failure inside the correct-code `mutate` rolls the whole tx back (the code NOT consumed) and writes `…_rolled_back`. *Legs (live DB):* each
branch; **after a wrong code, `attempts = 1` is COMMITTED (read on a separate connection) and ⛔ `member.wa_opt_in_activated*` row exists**;
the consent row + ACTIVE row written together (and NEITHER when `activateOptIn` is forced to fail); two concurrent correct verifies → one
200, one 409; expiry by setting `expires_at` in the past in a separate committed statement (⛔ waiting 10 minutes); **a comments-stripped
source assertion over the verify handler: it contains `timingSafeHashCompare(` and ⛔ `===` / `!==` touches `codeHash`** (F18 — invariant (f)
cannot see it).

**AC5 — It is the same yes (I5; F6).** After a code-confirmed ACTIVE: `GET /api/v1/member/wa-opt-in` shows `state: 'ACTIVE'`;
`isOptInActive` and `consentExists(…, 'whatsapp_opt_in')` are both true (6.31's reminder reads both); the in-app revoke ends it (ACTIVE →
REVOKED, the consent row revoked); a later mint answers `wa_opt_in.already_active`. *Legs (live DB):* status; the two reads; revoke.
(STOP and 131050 go through `endEveryWaYes` on the ACTIVE row whatever its route — unchanged; ⛔ new worker leg.)

**AC6 — A code is a WhatsApp switch, nothing else (I4, I7).** The code store is `member_wa_opt_in_codes` only; ⛔ change to
`member_auth_otps`, `member-otp.service.ts` or any session / step-up path; a code never issues a token. The code appears in ⛔ log, audit
line, error envelope or response body. *Legs:* response bodies and the audit rows of a full send → wrong → correct run hold neither the code
nor its hash; a source assertion that `apps/api/src/modules/wa-opt-in/**` imports ⛔ `member-otp.service` or the auth repo (it MAY import
the `otp.ts` primitives); the injected `log` of `code-delivery.ts` is spied across every WC3 outcome and never receives the code.

**AC7 — The WhatsApp request (WC1).** `whatsapp-app.ts`'s new shape builds `{messaging_product:'whatsapp', to, type:'template',
template:{name, language:{code}, components:[{type:'body', parameters:[{type:'text', text: code}]}, {type:'button', sub_type:'url',
index:'0', parameters:[{type:'text', text: code}]}]}}`; the code is 1–15 non-blank characters (else a `WhatsappTemplateParamError`); the
`bodyParam` / `bodyParams` bodies are byte-unchanged. *Legs:* unit tests on `buildRequestBody` (the auth body exactly; the two existing
shapes unchanged); AC2's recorded request (end to end); the access-wrapper invariants still pass over `packages/channels/src`.

**AC8 — No stand-in (I6; WC1, WC4).** With ⛔ template name resolvable (neither `hi` nor `en`), or a config missing `phoneNumberId` /
`accessTokenSecretName`, or `enabled: false`, the send answers 503 `wa_opt_in.code_unavailable` (or 409 `channel_unavailable`) and makes ⛔
call to Meta; `deps.ts` wires the real resolution and transport in every environment; ⛔ code path selects `createFixtureWhatsappProvider` or
any adapter that reports success without a call. The app, on `code_unavailable`, shows `waCode.send_failed` + `OtherPhoneDetails` (number +
phrase from the mint). *Legs:* API — the unprovisioned cases assert ZERO calls on the recording `fetchImpl` (a seam that cannot be bypassed:
the resolution under test is the production one); a source assertion that `code-delivery.ts` and `deps.ts`'s code wiring import ⛔ fixture;
mobile — the fallback render.

**AC9 — The code form on the phone (I6; WC3, WC7).** `WaCodeEntry`: Send → 200 `sent` → `waCode.sent` + the field (`keyboardType="number-pad"`,
`maxLength={6}`, `textContentType="oneTimeCode"`, `autoComplete="one-time-code"`, `accessibilityLabel={t('waCode.input_label')}`) +
`waCode.confirm` (disabled under 6 digits); 200 `uncertain` OR a client timeout on Send → `waCode.sent_uncertain` + the field (a code may
still arrive); `waCode.resend` shown only when `codesRemaining === 1`, disabled with `waCode.resend_wait` for `resendAfterSeconds` (a
countdown from the response, ⛔ the device clock), then enabled. Verify 200 → `onActivated` → the `activated` flag replaces the showing stage
body (`ask` or `sent`) with `waCode.done` and clears `error`; Continue → `/(signup)/payment`. Mapping (codes read as `err instanceof ApiError
&& err.code`): `code_wrong` (1 left) → `wrong_retry`, the field cleared; `code_wrong` (0 left) → `wrong_final` + `waCode.resend` if
`codesRemaining === 1`, else the closed route; `code_no_longer_valid` → `no_longer_valid` + resend if a code remains, else the closed route;
`code_resend_too_soon` → keep the field + `resend_wait` for `details.retryAfterSeconds`; `already_active` → done; `code_limit_reached` →
`no_more` + the closed route; `code_send_failed` with `codesRemaining === 1` → `send_failed` + resend (after any wait) + `OtherPhoneDetails`;
`code_send_failed` with 0 left, `code_unavailable`, `not_pending`, `channel_unavailable` → `send_failed` + the closed route; a verify that
times out or fails otherwise (incl. `invalid_state`) → ONE bounded `getWaOptInStatus` re-read: `ACTIVE` → done, else `waCode.verify_failed`
with the field kept. Every call bounded (`withTimeout`, `CALL_TIMEOUT_MS`); ONE call in flight (a `useRef` busy guard); late results after
blur / unmount dropped (its own version counter); errors as `AnnouncedText kind="error"`; `waCode.sent` / `sent_uncertain` / `done` via
`useAnnounceOnChange`. *Legs:* one per mapping with REAL `ApiError` instances; the resend countdown under fake timers; ⭐ the double-tap legs
fire BOTH presses inside ONE `act()` (5.10 AC6 — a state-only guard passes two separate clicks); the closed route shows
`wa-other-phone-number` / `wa-other-phone-phrase` with the mint's values; activation on the `ask` stage hides the box and `link_failed`;
both `Platform.OS` values for the announcements.

**AC10 — The words (WC8).** All 15 `waCode.*` keys exist in en AND hi `common.json` (flat dotted keys); every `t('…')` key in
`OtherPhoneCodeHint.tsx`, `WaCodeEntry.tsx`, `OtherPhoneDetails.tsx` and `whatsapp.tsx` resolves through the REAL `t()`
([[feedback_stub_must_call_not_transcribe]]); `wa-signup-copy-keys.test.ts`'s `FILES` gains the three components and its `EXPECTED` list the
`waCode.*` keys used (the key-set equality kept); a `waCode.*` family count of 15 in en with hi equal; ⛔ `{token}`; the ban list applies to
`waCode.*`; `wa-notifications-copy-keys.test.ts` still scans `OtherPhoneHint.tsx` and gains `OtherPhoneDetails.tsx`; i18n parity and the
microcopy gate pass. *Legs:* the copy-key tests; parity and microcopy outputs in the Debug Log.

**AC11 — Audited per send, per attempt, per consume (WC9; F18).** Each counted-or-pending send writes `member.wa_opt_in_code_sent`; each
release `member.wa_opt_in_code_released`; each wrong / no-live-code attempt `member.wa_opt_in_code_rejected` (committed although the request
answers 409); each success `member.wa_opt_in_activated` — all with `member_app_wa_code`, all through `withCompensatingAudit`; a refusal
decided before the wrapper writes ⛔ line; the access-wrapper invariants pass (⛔ bare `writeAuditEntry` in `apps/api/src/modules/wa-opt-in`).
*Legs (live DB):* the audit rows per branch (action, resource locator, actor = the member, ⛔ `_rolled_back` on a wrong code); the invariant
gate output.

**AC12 — Records and gates (WC13, WC14).** The decision committed ALONE before any code; the records commit (epics.md entry, §3.4 dated note,
ADR-0029 annotated row, roster row `wa-opt-in-code-template-approved` legs (a)–(c), the friction row + disposition, the `deferred-work.md`
annotations + two items, the told item if WC11 (a), the ledger) before code; the `write.ts` pin re-taken in
`claim-contact-ladder-whatsapp.test.ts` with a dated comment and ⛔ other pin changed; `waTemplateConfigKey`'s move keeps every apps/jobs test
green; the OpenAPI emit regenerated and its determinism check green; contracts vitest run ([[project_contracts_tests_outside_tsc]]);
`pnpm friction:check` AFTER the code commit reports basis `row`; `ci:local` green on :5433 at the final commit with `DATABASE_URL` set (⛔
`env -u`); mobile `tsc` with and without typed routes.

**AC13 — Signup never waits on the code (I6).** Continue is available on every state of the code form and always routes to
`/(signup)/payment`; ⛔ code-form state blocks it; a hang in a code call never holds the step beyond `CALL_TIMEOUT_MS`. The step's existing
legs (5.10 AC1–AC12) pass, amended ONLY where the hint changed (the AC12-signup legs run with `codeAvailable: false` to keep proving 5.10's
hint, and new legs cover `true` — annotated in the test, ⛔ deleted). *Legs:* Continue from each code-form state; the amended 5.10 legs.

## Tasks / Subtasks

- [ ] **Task 0 — Preflight, decisions, governance (AC12)**
  - [ ] 0.1 `git fetch origin`; if `main` moved past the pin, rebase and re-derive F1–F21 (`sed -n` every cite, read past the range). STOP
        and report to BigDev if:
        **S1** the mint gained a member-state guard, or `activateOptIn` / `lockMemberWaYes` / the one-ACTIVE index changed shape;
        **S2** another branch/worktree edits `apps/mobile/app/(signup)/whatsapp.tsx`, `OtherPhoneHint.tsx`, `wa-opt-in/write.ts`,
        `whatsapp-app.ts`, `wa-template-config-key.ts` or the wa-opt-in API module (`git for-each-ref` + `git diff`);
        **S3** — ⛔ a stop: if a migration after 0177 exists on any ref, RE-DERIVE the next free number (it is the first commit's);
        **S4** a `waCode.*` key is already taken in either locale;
        **S5** a routing note, told item or decision after the pin touches the WhatsApp code (`git log bac71abb..origin/main -- _bmad-output/planning-artifacts .decision-log.md`).
  - [ ] 0.2 Put WC1–WC14 to BigDev — incl. the en + hi words (WC8) — and record the answers VERBATIM in Debug Log (a), with what each
        resolves to. If WC6 (b): write the routing note from the template (§0 first) and build WC6 (a) meanwhile.
  - [ ] 0.3 Author-commit decision (the next free id — re-grep `^### Decision` on `main`, every branch, every worktree), staged in the
        scratchpad first ([[project_decision_log_writes_user_inserted]]); carries WC1–WC13 as answered, the §0 readings (1)–(5),
        "Supersessions: none", what it does NOT cover. Committed ALONE (`governance:` prefix); its SHA written only after.
  - [ ] 0.4 Records commit: `epics.md` `### Story 5.13` (after 5.12, before `---`; 5.10's format); a §3.4 dated note under the opt-in bullets
        (the bullets unedited); an ADR-0029 changelog "annotated" row; roster row `wa-opt-in-code-template-approved` (next free Row; Row 38's
        shape; legs per WC13 as answered); `deferred-work.md` — a dated note on the mismatch item (*"trigger fired by `-374`; ⛔ built by 5.13
        — re-trigger: the first production WhatsApp opt-in"*) and the two new items (Graph `v21.0` removal 2027-01-21; INR billing by
        2026-12-31) and a dated note on 5.12 round-2 W2 (a new consumer — WC14); the WC11 told item (WRITTEN — ⛔ "told" until sent); the
        friction row (Task 6); ledger entry (safe prepend — [[project_sprint_status_safe_prepend]]); row `5-13-…` `ready-for-dev →
        in-progress` (the create-story commit moved it `backlog → ready-for-dev`).
- [ ] **Task 1 — The code table (WC2; AC3)**
  - [ ] 1.1 The next free migration `NNNN_member-wa-opt-in-codes.sql` + journal entry + Drizzle schema `packages/domain/src/schema/
        member_wa_opt_in_codes.ts` (exported from the schema index): columns, CHECKs, the partial unique, the FK, RLS ENABLE+FORCE with
        PER-VERB tenant policies on the 0172 pattern + a `packages/domain/src/policies/` entry (the `claim-contact-wa-rls.ts` precedent),
        grants. ⛔ edit an applied migration.
  - [ ] 1.2 `packages/domain/src/wa-opt-in/code.ts` (exported from `wa-opt-in/index.ts`), every function RETURNING a discriminated result
        (⛔ throwing for a refusal — WC2, WC5): `checkCodeSendAllowed` (under the caller's `lockMemberWaYes`: ⛔ PENDING / already ACTIVE /
        limit / 60 s since the last send that may have reached the member (WC3) → a refusal + `retryAfterSeconds`), `insertCodeSlot` (`sending`, `send_seq` = counted + 1,
        the hash, DB-clock expiry → `{codeId, sendSeq, codesRemaining}`), `recordCodeSendOutcome` (`accepted` + wamid / `may_have_sent` /
        `refused` / `released`; on `accepted` / `may_have_sent` ALSO invalidates the earlier live code — WC3), `findLiveCode` (WC2's
        definition; returns the hash), `recordWrongAttempt` (atomic increment, invalidates at 2; a no-op with ⛔ live code; returns
        `{attemptsRemaining, codesRemaining}`), `consumeCode` (atomic, `WHERE consumed_at IS NULL AND invalidated_at IS NULL AND expires_at >
        now()`).
  - [ ] 1.3 Live-DB tests (AC3: the constraint legs, the EXACTLY-ONE concurrency leg, the RLS regression spec on the 0172 pattern).
- [ ] **Task 2 — The words (WC8; AC10)**
  - [ ] 2.1 Add the 15 `waCode.*` keys (as answered at 0.2) to en + hi `common.json`; hand-format ([[project_prettier_not_enforced]]).
  - [ ] 2.2 Parity + microcopy gates; fix wording (⛔ the rule) if they bite — and tell BigDev any reworded string.
- [ ] **Task 3 — The WhatsApp message and the template key (WC1, WC4; AC7)**
  - [ ] 3.1 `whatsapp-app.ts`: the `authenticationCode` message shape + `buildRequestBody` button component + the param check; unit tests.
  - [ ] 3.2 Move `waTemplateConfigKey` to `packages/channels/src/wa-template-config-key.ts` (re-exported from the package index); apps/jobs
        imports it (⛔ behaviour change); add `'wa_opt_in.code'`; the jobs suites green.
- [ ] **Task 4 — The server (WC1, WC3, WC5, WC9, WC10; AC2, AC4–AC6, AC8, AC11)**
  - [ ] 4.1 `write.ts`: `windowExpiresAt: Date | null` (JSDoc says why); re-take ONLY its pin in `claim-contact-ladder-whatsapp.test.ts` with
        a dated comment (F14). `audit.ts`: append `'member_app_wa_code'`. Amend the now-stale comments: `packages/contracts/src/wa-opt-in/
        opt-in.ts:55` (*"present (non-null) ONLY while ACTIVE"* — a code-confirmed ACTIVE has it NULL) and the `window_expires_at` column
        comment in `schema/member_wa_opt_in.ts` (a comment-only edit — ⛔ migration).
  - [ ] 4.2 Contracts: `CreateWaOptInResponse` gains `codeAvailable: z.boolean()` (WC4); NEW `SendWaOptInCodeRequest`
        (`z.object({}).strict()`), `SendWaOptInCodeResponse` (`{ delivery: z.enum(['sent','uncertain']), codesRemaining: 0|1,
        resendAfterSeconds: number|null }`), `VerifyWaOptInCodeRequest` (`{ code: /^\d{6}$/ }`), `VerifyWaOptInCodeResponse` (`{ state:
        z.literal('ACTIVE') }`), all `.strict()`, camelCase; register both paths (and the changed mint response) in `emit-openapi.ts` and
        regenerate `openapi/v1.yaml`; contracts vitest; fix every `CreateWaOptInResponse` fixture (mobile `MINTED`, API specs).
  - [ ] 4.3 `apps/api/src/modules/wa-opt-in/code-delivery.ts` (WC1): `resolveCodeDelivery(deps, {pariwarId, memberId}, { decrypt })`
        (config completeness; template name `hi` then `en` via the injected `resolveSecret`, form-checked; token; when `decrypt`,
        `getMemberMobileCiphertext` + `decryptMobile`; `+` stripped → `{ok:false, reason}` | a plan) and `sendCode(plan, code)` over its OWN
        `createWhatsappAppCache(deps.waCodeFetch)` with `{ timeoutMs: 10_000 }`, failures classified by `classifyDirectWaSendFailure` into WC3's
        table; an injectable `log` (class tokens only). Add `waCodeFetch` (and `resolveChannelSecret` if not already on it) to AppDeps in
        `apps/api/src/context.ts`; `deps.ts` wires the global `fetch` in EVERY environment (⛔ reveal / log adapter); `_setup.ts` injects a
        RECORDING fetch (requests captured, responses scripted per test) — the only fake.
  - [ ] 4.4 `code-handlers.ts` + routes in `routes.ts`: the two routes (member session, the per-member rate limit with `hook: 'preHandler'`,
        body schemas); the send flow — tx 1: lock → `checkCodeSendAllowed` (a refusal → commit nothing, ⛔ audit, then throw) →
        `withCompensatingAudit(code_sent, insertCodeSlot)` → commit; then resolve + decrypt + `sendCode` outside any tx; tx 2: lock →
        `recordCodeSendOutcome` (`released` inside `withCompensatingAudit(code_released, …)`); the verify flow in WC5's three steps (commit,
        THEN throw); refusals as `ConflictError(msg, code, details)`; map `wa_opt_in.invalid_state` where `activateOptIn` loses to the sweep.
        The mint handler (`handlers.ts`) computes `codeAvailable` via `resolveCodeDelivery(…, { decrypt: false })` OUTSIDE its lock window on
        both PENDING paths (WC4).
  - [ ] 4.5 `packages/api-client/src/index.ts`: `sendWaOptInCode()` (`call(\`${WA_OPT_IN_BASE}/code\`, SendWaOptInCodeResponse, {}, true)`) and
        `verifyWaOptInCode(code)` (`…/code/verify`, `{ code }`).
  - [ ] 4.6 Live-DB integration tests (`apps/api/tests/integration/wa-opt-in/wa-opt-in-code.spec.ts`): AC2, AC4, AC5, AC6, AC8, AC11, a 429
        leg for the route limit; members seeded through the real signup path on a fresh random Pariwar (5.10 AC9's helpers / pattern).
- [ ] **Task 5 — The app (WC7; AC1, AC9, AC13)**
  - [ ] 5.1 Extract `OtherPhoneDetails` (the details body, testIDs unchanged) into `components/notifications/OtherPhoneDetails.tsx`;
        `OtherPhoneHint` renders it (⛔ behaviour change; Settings' tests unmodified).
  - [ ] 5.2 NEW `components/notifications/WaCodeEntry.tsx` (props `displayPhoneNumber`, `verificationPhrase`, `onActivated`; its OWN
        action-version counter bumped on blur / unmount — WC7) and `OtherPhoneCodeHint.tsx` (the link `wa-code-link` + the form) per AC9; the
        testIDs of WC7; ⚠ `t` in ⛔ effect's deps (T1).
  - [ ] 5.3 `whatsapp.tsx`: the `sent` stage renders `OtherPhoneCodeHint` when `minted.codeAvailable`, else `OtherPhoneHint` (unchanged); the
        `ask` stage renders the same choice when `error === 'link' && minted`; an `activated` flag replaces WHICHEVER stage body shows with
        `waCode.done` and clears `error`; header comment updated (Story 5.13, the decision id, WC letters).
  - [ ] 5.4 Tests: extend `wa-signup-step-render.test.ts`'s mocks (`lib/member-api` + `sendWaOptInCode` / `verifyWaOptInCode` /
        the existing `getWaOptInStatus` for AC9's re-read; the `MINTED` fixture gains `codeAvailable`; a tamagui
        `Input` forwarding `value`, `onChangeText`, `keyboardType`, `maxLength`, `textContentType`, `autoComplete`, `accessibilityLabel`,
        `testID`) — a mock change, ⛔ a change to any existing assertion except AC13's annotated ones; a NEW `wa-code-entry-render.test.ts` for
        AC9's branches; `wa-signup-copy-keys.test.ts` per AC10. ⭐ Prove each new leg RED once (Debug Log (b)).
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
- **T4 — The sha pins (F14)** — `whatsapp-direct-send-outcome.ts`, `read.ts`, `dispatch.ts`, `pariwar_wa_templates.ts` must stay
  BYTE-unchanged; ONLY `write.ts`'s pin is re-taken (WC5). A failing pin test is a design signal, ⛔ a pin to refresh blindly.
- **T5 — The access-wrapper invariants (F18)** — ⛔ bare `writeAuditEntry`, ⛔ `===` on a hash in the wa-opt-in module; both fail `ci:local`.
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
  outcome let `mutate` RETURN, commit, then throw (WC5, F18).
- **T15 — The migration number belongs to the first COMMIT** — re-grep every ref before naming it; never regenerate an applied migration;
  edits reach :5432 AND :5433 ([[project_live_db_test_gotchas]]).

### Reuse map

| Need | Use | ⛔ Rebuild |
|---|---|---|
| Make / hash / compare a code | `generateOtp`, `hashOtp`, `timingSafeHashCompare` (`auth/shared/otp.ts`) | a new code generator; `===` |
| The registered mobile | `waOptIn.getMemberMobileCiphertext` + `decryptMobile` (the 5.9 adapter's read) | `resolveWaTarget` (PENDING ⇒ null); a client field |
| Send to Meta | `createWhatsappAppCache().messagingFor(…)` + the new auth shape | a raw `fetch`; the dispatcher; the fixture |
| Classify a failed send | `classifyDirectWaSendFailure` (import — PINNED) | a new classifier |
| Template name | `waTemplateConfigKey('wa_opt_in.code', …)` (moved to channels) + `resolveChannelSecret` | `pariwar_wa_templates` |
| Serialize per member | `lockMemberWaYes` (reentrant) | a new lock |
| Activate | `activateOptIn` + `recordConsent` in one tx (the worker's order, F5) | a second ACTIVE writer |
| Audit | `withCompensatingAudit` + `waOptInAuditPayloadHash` (F1) | `writeAuditEntry` |
| Per-member limit | `perMemberKey` route config (`personal-event-routes.ts`) | a new limiter |
| Bound a call (app) | `lib/with-timeout.ts` | a local copy |
| Announce | `AnnouncedText` / `useAnnounceOnChange` (`components/peer-request/announce.tsx`) | an unconditional announce |
| The number + phrase | `OtherPhoneDetails` (extracted from `OtherPhoneHint`) | a third copy |
| API test seam | a recording `fetchImpl` injected into the module's own `createWhatsappAppCache` (`_setup.ts`) | a fake of the whole delivery (it would hide the resolution under test); a live Meta call |

### Testing standards

API live-DB `*.spec.ts` on :5433 (skipped without `DATABASE_URL`), each test a fresh random Pariwar, members through the real signup path;
concurrency legs on separate connections. Domain/channel unit tests in their packages' vitest. Mobile: vitest `tests/unit/**/*.test.ts`,
`createElement` (⛔ JSX), jsdom opt-in, RTL `cleanup`, the real `LocaleProvider` ([[project_mobile_vitest_and_expo_install_traps]]). Prove
every new leg RED once. `ci:local` with `DATABASE_URL` on :5433 (`env -u DATABASE_URL` SKIPS integration-tests).

### Project structure notes

New: `packages/domain/migrations/NNNN_member-wa-opt-in-codes.sql` (+ journal), `packages/domain/src/schema/member_wa_opt_in_codes.ts`,
`packages/domain/src/wa-opt-in/code.ts`, `packages/channels/src/wa-template-config-key.ts`, `apps/api/src/modules/wa-opt-in/code-delivery.ts`,
`apps/api/src/modules/wa-opt-in/code-handlers.ts`, `apps/mobile/components/notifications/{OtherPhoneDetails,OtherPhoneCodeHint,WaCodeEntry}.tsx`,
tests. Changed: `packages/domain/src/wa-opt-in/{write,audit,index}.ts`, the schema index, `packages/channels/src/providers/whatsapp-app.ts`,
the channels index, `apps/api/src/context.ts` (AppDeps), `apps/api/src/modules/wa-opt-in/handlers.ts` (the mint's `codeAvailable`),
`apps/api/src/middleware/error-mapping/index.ts`, `packages/domain/src/policies/` (the new table's RLS entry),
`apps/api/tests/integration/rls/` (its regression spec), `apps/jobs/src/scheduler/wa-template-config-key.ts` (→ re-export or removed with imports updated) and its importers,
`apps/jobs/tests/claim-contact-ladder-whatsapp.test.ts` (one pin), `packages/contracts/src/wa-opt-in/opt-in.ts`,
`packages/contracts/scripts/emit-openapi.ts`, `openapi/v1.yaml`, `packages/api-client/src/index.ts`, `apps/api/src/modules/wa-opt-in/routes.ts`,
the API error mapping, `apps/api/src/deps.ts`, `apps/api/tests/integration/_setup.ts`, `apps/mobile/components/notifications/OtherPhoneHint.tsx`,
`apps/mobile/app/(signup)/whatsapp.tsx`, `apps/mobile/tests/unit/{wa-signup-step-render,wa-signup-copy-keys}.test.ts`,
`packages/i18n/locales/{en,hi}/common.json`, `friction-budget.md`, the records. Untouched: `(settings)/notifications.tsx`,
`apps/jobs/src/wa-webhook-processor.ts`, `components/banners/*`.

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

- `.decision-log.md` — `2026-10-21-374` (the ruling, readings (i)–(iv), "Not covered", Consequences 1–2); `2026-10-21-375` d12;
  `2026-10-21-373` d1; `2026-10-20-370` / `-371` / `-372` d1 (counting precedent); `2026-07-08-065` item 4
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
side effects · (e) Task 0.1 preflight

### Completion Notes List

- Ultimate context engine analysis completed — comprehensive developer guide created (2026-10-21, `bmad-create-story 5.13`).

### File List

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-10-21 | 1.1 | Create-story checklist pass (`checklist.md` step 6 — one fresh-context verifier; 3 H / 9 M / 10 L, ALL applied before commit). **H1** a refusal decided inside `withCompensatingAudit` would roll back a wrong attempt (unlimited tries) and write "activated" + `_rolled_back` ⇒ WC5 rewritten as three ordered steps (pre-checks outside the wrapper; correct → activate; wrong → a returning `mutate`, commit, THEN throw); `code.ts` returns discriminated refusals; T14; AC4's committed-attempt and source-compare legs. **H2** the "exactly as today" day-one claim was false (an always-failing offer) ⇒ the mint gains `codeAvailable` (WC4; contract change), `OtherPhoneHint` unchanged when false (AC1, I6). **H3** a fake of the whole delivery made AC8 vacuous ⇒ the only seam is a recording `fetchImpl` into the module's own client cache; `resolveCodeDelivery` runs for real (WC1, Task 4.3); every environment wires the real path (no reveal adapter). **M1** an uncertain send closed the route ⇒ 200 `delivery: 'uncertain'` + `sent_uncertain`; **M2** unmapped `resend_too_soon` / `invalid_state` / verify timeout ⇒ relative `resendAfterSeconds`, a status re-read, `verify_failed`; **M3** invalidate the earlier code only in tx 2 on accepted / may-have-sent; seq rule after `released`; **M4** F12 restated in code order + WC3's outcome table (131048 on a 429 counts); **M5** concurrency leg = EXACTLY one counted; **M6** invariant (f) cannot see a hash `===` ⇒ a source leg; **M7** activation replaces either stage; the `ask`-stage render is a rare path; **M8** wiring in every environment; **M9** RLS on the 0172 pattern + regression spec. L1–L10: F16 cites (`:126-131`; `OtherPhoneHint.tsx:9`); the digit rule is style, ⛔ a gate; the iOS autofill rationale struck; testIDs, `context.ts`, error-mapping path, `isCurrent`; S3 re-derives; row-status note; stale `window_expires_at` comments; WC9 channel; injectable `log`; template-name form check; KMS lines per attempt; §0 reading (1) relabelled WIDENS; `no_more` reworded; W2 annotated. 13 → 15 `waCode.*` strings (`sent_uncertain`, `verify_failed`). ⛔ validated by `validate` yet. |
| 2026-10-21 | 1.0 | Created by `bmad-create-story 5.13` (pinned `bac71abb`, branch `story/5-13-whatsapp-code-for-another-phone`, main checkout — ⛔ peer session). WC1–WC14 PROPOSED for BigDev at Task 0.2; ⭐ recommended: the code sent in the API request through a new `WaOptInCodeDelivery`; a new `member_wa_opt_in_codes` table whose constraints cap two counted codes per request and two tries per code; a correct code writes the worker's consent + ACTIVE rows (`windowExpiresAt` null; `write.ts` pin re-taken); signup step only; 5.10's number + phrase as the fallback whenever the code route is closed; 13 `waCode.*` strings (en + hi DRAFT). ⛔ validated yet. |
</content>
</invoke>
