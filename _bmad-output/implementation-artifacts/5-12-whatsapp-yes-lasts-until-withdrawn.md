---
baseline_commit: ec6d826e
---

<!--
PINNED: ec6d826e (`main`, 2026-10-20 — Story 6.37d landed, PR #292 merged). Branch `story/5-12-whatsapp-yes-lasts-until-withdrawn`,
cut from the pin in the main checkout (no peer session was running — ListAgents empty at creation).
Two facts, kept apart (footgun #24): the pin is an ancestor of HEAD (durable); the CODE claims below were derived at ec6d826e
(perishable). Re-check before Task 1: `git fetch origin && git diff --name-only ec6d826e..origin/main -- packages apps scripts docs/adr docs/launch-gate-inventory`.

STATUS: done — code review closed 2026-10-21 (F1–F5 fixed; ci:local 36/36 green on :5433; final mobile gate 1096 tests). Was: review — Tasks 0–7 DONE 2026-10-21 (`bmad-dev-story 5.12`). Was: in-progress — Task 0 DONE 2026-10-21 (Decision `2026-10-21-373`, `97e1e7ad`, alone; records next). Was: ready-for-dev (created 2026-10-20 via `bmad-create-story 5-12`; validated 2026-10-20 — v1.1, four fresh-context verifiers,
every code claim re-derived at ec6d826e = `origin/main`).

START CONDITION — MET at the pin: row 6-37d is `done` and ON `main` (its worker edit — the claim half of the STOP / block branches —
landed first; `-367` d1: *"sits before, and independent of, the member lookup, so 5-12's later widening of the member STOP / block path
cannot change it; 5-12 rebases over it"*). Row 6-31 is `done` on `main`. Nothing else is a precondition.

NUMBERS (footguns #19 / #42(e); `-366` decision 6 — a number belongs to the first COMMIT that takes it, on any branch): at the pin
`main` holds migrations to 0176, decisions to `-372`, roster Rows to 36, ledger `2026-10-20i`. This file names ⛔ number that is not yet
TAKEN: the author-commit is "the next free decision id at Task 0.3", the migration is named by its SLUG `member-wa-opt-in-lasting-yes`,
the roster row (LY11) by its KEY `wa-opt-in-lasting-yes-hindi-reviewed`. Re-grep `main`, every branch and every worktree at each commit.

§0 GATE (`trustee-panel-routing-note-TEMPLATE.md`): the substance is RULED — `2026-10-19-364` (Trustee-ratified, *"by DR and KB / option
A"*): a member's yes lasts until the member takes it back, for every WhatsApp message from the Trust, after four conditions. Every
RECOMMENDED build decision LY1–LY13 below is the AUTHOR's — stripped of citations each reads "the code should do X". Where the line sits:
- Four narrow option A at an edge — LY6 (a STOP from a number on a member's opt-in rows ends that member's yes, whoever sent it), LY8
  (a)'s 131050 arm (a marketing opt-out ends the whole yes — F12) or, if chosen, LY8 (b) (all four codes end a yes), LY9 (a) — each the author's only on the narrowing precedent (`-367` §0: *"each is
  stricter than the ratified text (fewer messages)"*).
- LY9 and LY10 change what a member SEES, each realising condition 1 / option A's *"The app shows them as still opted in"*.
- LY9 (b) MATCHES option A's *"The app shows them as still opted in"* (and is reading (iv)'s default, ⛔ ratified); LY9 (a) NARROWS it
  for that population — the author's under (iv)'s *"it is the author's only if it narrows who is messaged"*; F15 shows the population is
  EMPTY in production.
- Two residuals the ratified cost did ⛔ put to the Panel: a member STOP that faults and is lost (LY6, **PQ1**) and a yes that follows a
  NUMBER, ⛔ a person (LY13, **PQ2**). Whether each is TOLD (as `-372` told the claim STOP's) is BigDev's at Task 0.2 — ⛔ recorded as
  shown until the note goes out ([[feedback_shown_to_panel_means_sent]]).
Kept OUT, each a Panel question if ever wanted: a proactive message telling members their yes stands
(⛔ sent by anything here); any change to who may opt in or how (§3.4's origination rule — untouched); the claimant's or a nominee's
WhatsApp (`-357` / `-356` — `-364` reading (i)).

GLYPH REGISTER: `⛔` negates the word it precedes — before a word that is ALREADY negative it is emphasis only, ⛔ a double negative;
`⭐` emphasis / action / recommended; `⚠` a hazard. ⛔ No `file:NNN` into `.decision-log.md`, `deferred-work.md` or `sprint-status.yaml`
(newest-first files) — cite the decision id + clause, the item's phrase, or the row key. Line numbers into CODE files are as of the pin;
re-grep the symbol if a line moved.

LETTERS: F = found facts (at the pin) · LY = build decisions (PROPOSED; answered by BigDev at Task 0.2) · I = invariants · T = traps ·
S = Task 0.1 STOP conditions · PQ = a question for BigDev at Task 0.2 (whether a Panel told item is owed). Decision-entry letters (WR, WS, PM …) keep their own stories' meaning.
-->

# Story 5.12: A Member's WhatsApp "Yes" Lasts Until the Member Takes It Back — the App Stops Saying "Expired", the Withdraw Control Always Shows, STOP Always Works, and a Withdrawal Ends Every Earlier Yes `[SURFACE]`

Status: done

> **WHAT THIS STORY IS, IN ONE PARAGRAPH.** As built (Story 5.4) a member's WhatsApp opt-in counts for 24 hours: the webhook worker
> stamps `window_expires_at = now() + 24 h` on the match, `isOptInActive` stops counting it after that, and a sweep moves it to
> `EXPIRED_24H_WINDOW`. The app then tells the member *"Your WhatsApp opt-in window closed"*, the withdraw button disappears, a STOP is
> ignored, and the API refuses a withdrawal with 409. Meanwhile the consent record stays *granted*, and every later opt-in adds another
> consent record, of which a withdrawal revokes only the newest. The Trustee Panel ruled (`-364`, option A) that a yes lasts until the
> member takes it back, but only after four fixes ship: (1) the "expired" wording goes, (2) the withdraw control shows for every standing
> yes, (3) STOP always works, (4) a withdrawal ends every earlier yes. 5.12 builds the four fixes first and then the read change: no yes
> ever expires, and the alert system's WhatsApp rung, Story 6.31's reminder and row 5-10's future signup box all follow, unedited.
>
> **Day-one output: none, by design of the gates it does not touch.** Nothing is in production
> ([[project_not_in_production_merge_is_not_golive]]), `pariwar_wa_config.enabled` defaults `false`, and every member WhatsApp is
> behind the per-Pariwar switch. 5.12 changes who COUNTS as opted in, and ⛔ whether any Pariwar sends.
>
> **What already ships and this story CHANGES (rebuild ⛔ none of it):**
> - the one opt-in read `waOptIn.isOptInActive` — `packages/domain/src/wa-opt-in/read.ts:141-163`;
> - the state machine's edges — `revokeOptIn` — `packages/domain/src/wa-opt-in/write.ts:206-253`;
> - the expiry sweep — `runWaOptInExpirySweep` / `expireOptIn` — `apps/jobs/src/wa-webhook-processor.ts:524-588`;
> - the member half of the STOP and block branches, and `revokeActiveOptIn` — `wa-webhook-processor.ts:340-351`, `:460-471`, `:479-522`;
> - the API's member DELETE and admin opt-out — `apps/api/src/modules/wa-opt-in/handlers.ts:204-254`, `:256-315`;
> - the settings screen — `apps/mobile/app/(settings)/notifications.tsx` and the `waNotifications.*` copy (`packages/i18n/locales/{en,hi}/common.json:329-346`).
>
> **What it READS and leaves alone:** `isPeerMeshWaReminderOptedIn` (6.31 — its composition is unchanged, LY1), `resolveWaTarget`
> (`packages/domain/src/notifications/delivery.ts:116-148` — its gate is unchanged, only what the read returns), the claim half of the
> worker (6.37d — `:314-333`, `:430-459`), `consent.recordConsent` / `consentExists`, the data export.

## Story

As **a member who told the Trust "yes, you may message me on WhatsApp"**,
I want **that yes to stand until I take it back, with a withdraw button that is always there while it stands, a STOP that always works,
and a withdrawal that ends every yes I ever gave**,
so that **I get the Trust's WhatsApp messages for as long as I chose them, and can stop them easily at any time, and ⛔ nothing tells me
my yes ended when it did not.**

## The rulings and records this story builds on

| Source | Key (verbatim, abridged) | Status |
|---|---|---|
| `2026-10-19-364` (option A) | *"A yes lasts until the member takes it back (in the app, or by replying STOP), for every WhatsApp message from the Trust."* What changes for a person, as put: *"Members who said yes get the reminder, and later the Trust's other WhatsApp messages. The app shows them as still opted in, with a way to withdraw that always works."* Cost accepted with its conditions: *"More WhatsApp messages reach members than the system sends today."* … *"Before anything is sent on a yes older than a day: the app's "expired" wording must change, its withdraw control must show, STOP must always work, and taking a yes back must end every earlier yes, not only the newest."* | ⭐ TRUSTEE-RATIFIED |
| `-364` "What the ruling therefore requires" 1–4 | (1) *"a member whose yes still stands must ⛔ be told it ended"*; (2) *"The withdraw control shows for every member whose yes stands (today it shows for ACTIVE only)"*; (3) *"STOP always works — today a STOP from a member past the 24 hours is ignored … and the API revoke returns 409"*; (4) *"Taking a yes back ends EVERY earlier yes — today each opt-in records a new `whatsapp_opt_in` consent row, expiry revokes none, and a withdrawal revokes only the current one."* | ⭐ the four conditions are the RATIFIED cost's; the "today …" detail in each is the transcriber's |
| `-364` "Our reading — NOT RATIFIED" (i)–(iv) | (i) member opt-in sends only — ⛔ the claimant (`-357`), ⛔ a nominee (`-356`); (ii) Meta's 24-hour window is a fact about free-form messages, it no longer ends the yes; (iii) until 1–4 ship ⛔ message goes on a yes older than a day; (iv) a pre-ruling "expired" yes counts as standing only once 1–4 ship; *"whether such members are told their yes stands (or asked again) is decided by the build row's create-story — it is the author's only if it narrows who is messaged"* | ⚠ NOT RATIFIED — readings; this story applies (i)–(iii) and decides (iv) at LY9 |
| `-364` Consequence 1 | *"A build row owns conditions 1–4 and the opt-in read change (the expiry no longer ends the yes; `isOptInActive` / the expiry sweep / the `EXPIRED_24H_WINDOW` state)"* | ⭐ (consequence text inside the ratified entry) |
| ADR-0029 (ratified by `2026-07-08-065`; the quotes are the ADR's own text — `-065` names the ADR, ⛔ quotes it) | the five-state lifecycle, *"the 24h-window expiry"*, *"stale PENDINGs / past-window ACTIVEs → EXPIRED_24H_WINDOW"*, *"The AC6 dual gate reads BOTH (`isOptInActive` AND the admin toggle)"*, *"Re-opt-in after revoke requires a NEW inbound message … — no inferred re-consent"* | ⭐ TRUSTEE-RATIFIED — superseded IN PART by `-364` (the 24-hour life only); the rest STANDS |
| Architecture §3.4 "Member WA opt-in flow" (+ its dated `-364` note) | *"Opt-in withdrawal: member disables from app settings (audit-logged) or sends STOP message"*; origination: *"user-initiated interaction … or an explicit affirmative consent capture in-app … Passive defaults, pre-checked boxes, bundled consent, or inference from other settings are not valid opt-in origins."* | ⭐ TRUSTEE-RATIFIED (via `-065` per `-364`'s preamble; `-065`'s own text names ADR-0029 only) — UNCHANGED here |
| `2026-10-18-357` (§3.4 claim-contact exception) | *"The exception does not change any member's opt-in state"*; a claimant's STOP ends WhatsApp for that claim | ⭐ TRUSTEE-RATIFIED — the claim half is ⛔ touched (I5) |
| `2026-10-19-365` WR3 | `isPeerMeshWaReminderOptedIn` = `isOptInActive` AND `consentExists(…, 'whatsapp_opt_in')` (defensive); *"Under `-364` its reach widens when row 5-12 changes the shared read; 6.31 edits ⛔ it."* | author-commit |
| `2026-10-20-367` d1 (deciding 6.37d WS1 (a)) | 6.37d goes first; *"sits before, and independent of, the member lookup, so 5-12's later widening of the member STOP / block path cannot change it; 5-12 rebases over it."* (6.37d WS1 (a) costed the same: *"5-12 rebases over this story's worker edit"*) | author-commit — MET (6.37d on `main`) |
| Meta, *Get opt-in for WhatsApp* (fetched 2026-10-20) and the Business Messaging Policy (quoted in `-364`) | the opt-in page sets ⛔ duration; *"Provide clear instructions for how people can opt out … honor these requests"*; *"You must respect all requests (either on or off WhatsApp) by a person to block, discontinue, or otherwise opt out"* | provider policy — found, ⛔ counsel's ([[feedback_provider_policy_is_found_not_counsel]]) |
| Roster Row 35 (g) | *"row `5-12-whatsapp-yes-lasts-until-withdrawn` `done` (`-364`'s four conditions — until then the reminder reaches only a yes given in the last 24 hours)"* | go-live gate — ⛔ a merge fence |
| deferred-work (two items homed here by `-364`) | *"A member's WhatsApp opt-in counts for 24 hours only, and an expired one cannot be withdrawn"*; *"Withdrawing a WhatsApp opt-in revokes only the newest consent row, and every re-opt-in mints another"* — each *"stays OPEN until that row is `done`"* | to be closed by this story at Task 7 (AC11) |
| Sprint row `5-12-…` comment (`-364`'s routing to this row by name) | *"(1) the app's "expired" wording changes (en + reviewed hi)"*; *"Owns deferred-work's two `-364` items. Its create-story decides (`-364` reading (iv)) what a member told "expired" before the ruling is told now."* | routing record — LY9, LY11 |
| `-364` "Not covered by this ruling" | *"counsel's view on the consent wording (whether it should say how long a yes lasts — the note's "still uncertain" (1))"* | ⚠ homed NOWHERE before this story — LY11 (c) homes it |

## ⭐ THE INVARIANTS

- **I1 — No yes expires.** ⛔ Code path moves an ACTIVE opt-in to `EXPIRED_24H_WINDOW`, and the database refuses the edge.
  `isOptInActive` is `state = 'ACTIVE'` — ⛔ clock. *Proof:* AC1, AC2 (incl. a raw-SQL leg against the trigger).
- **I2 — A withdrawal ends every yes.** Every withdrawal path (member DELETE, admin opt-out, STOP, Meta status 131050) calls ONE domain function
  that moves the member's ACTIVE row and revokes EVERY open `whatsapp_opt_in` consent row of that member, under ONE audit line whose id is
  on every revoked row. *Proof:* AC3's "opt in, expire, opt in again, withdraw ⇒ ⛔ open consent, ⛔ message" leg, once per path.
- **I3 — STOP always works.** A STOP ends every yes of every member whose opt-in rows carry the sender's number in that Pariwar, whatever
  their newest row's state. Nothing to end ⇒ a no-op. A STOP whose member end FAULTS is ⛔ silent: retried once, then an ids-only alarm;
  a fault BEFORE the per-member loop (the blind index, the member listing) alarms from the per-message catch (the drain is at-most-once —
  LY6). *Proof:* AC4.
- **I4 — The app never says a standing yes ended.** ⛔ `waNotifications` value in either locale says "expired" / समाप्त; the withdraw
  control renders for every ACTIVE response. *Proof:* AC6, AC7.
- **I5 — The claim half is untouched.** 6.37d's claim STOP is still recorded first, in its own try, whether or not the number has a
  member opt-in; a claim send's failed status still ⛔ moves a member opt-in. *Proof:* 6.37d's legs (a)/(b) unchanged and green; leg (c)
  re-asserted under the new member behaviour (AC8).
- **I6 — The four conditions land before the read change.** The ratified cost: *"Before anything is sent on a yes older than a day:"*
  the four conditions (reading (iii) restates it). On the branch, the read / sweep change (Task 5) is committed AFTER Tasks 1–4; one
  fast-forward lands them together, so `main` never holds the read change without them. ⚠ Intermediate commits are ⛔ required green:
  6.37d's AC11 pins on `read.ts` / `write.ts` fail from the first commit that edits them until Task 6.1 (or update the two pins in each
  such commit — either is fine; say which in Completion Notes). *Proof:* `git log --oneline` in Completion Notes.
- **I7 — Ids only.** ⛔ Mobile number, verification phrase or name in a log or alarm. (The audit hash already carries the phrase hashed.)

## 📜 Policy meaning (AI-10-1)

**5.12 introduces ⛔ predicate that gates a member's access to a benefit, and changes ⛔ such predicate.** It changes a DELIVERY
predicate — whether a message the Trust already sends also goes by WhatsApp — and ⛔ thing reads it to decide a payment, a pool, a
claim, a warning or a member state. In the member's terms: *"once you tell the Trust "yes" to WhatsApp, you keep getting its WhatsApp
messages until you say stop — in the app or by replying STOP — and saying stop ends every yes you ever gave."* Checked against the
Niyamavali: compatible — R10(B): *"WhatsApp/Telegram and similar are convenience mirrors only"*, so ⛔ official notice or benefit depends on it; ⛔ clause
governs how long a channel preference lasts (the Niyamavali is a rulebook, ⛔ binding — [[feedback_niyamavali_rulebook_not_spec]]).

## ⭐ FOUND FACTS (at ec6d826e — re-run each at Task 0.1)

**The read and who consumes it**
- **F1 — The read is time-bound.** `isOptInActive(db, { pariwarId, memberId, at? })` (`read.ts:141-163`) = `state = 'ACTIVE' AND
  (window_expires_at IS NULL OR now() < window_expires_at)` (or `> at`). Its doc (`:136-140`): *"ACTIVE opt-in whose 24h window has not
  passed"*. ⚠ A DIFFERENT `telegramOptIn.isOptInActive` exists (`telegram-opt-in/read.ts:117`) — ⛔ touched.
- **F2 — Two callers.** (1) `resolveWaTarget` (`delivery.ts:116-148`, gate 2 at `:127-129`, passes `at`; doc `:108-115` says *"within the
  24h Meta window"*) ← `resolveMemberDeliveryContext` (`apps/jobs/src/scheduler/contribution-notify.ts:161-184`, call `:172`) ← contribution
  notify `:450`, `survey-publish.ts:219`, `news-publish.ts:240`; also `apps/api/src/modules/channel-config/composition.ts:59-65` (re-export,
  ⛔ src caller). (2) `isPeerMeshWaReminderOptedIn` (`read.ts:173-176`) ← 6.31's begin (`packages/domain/src/claim/peer-mesh-wa-reminder.ts:337`).
  6.37d's claimant basis (`claim/claim-contact-whatsapp-basis.ts:37-94`) reads ⛔ member opt-in.
- **F3 — The window is set once, on the match.** `resolveWindowExpiresAt` (`wa-webhook-processor.ts:232-239`, `META_24H_WINDOW_MS` `:46`)
  → `activateOptIn` (`write.ts:180-204`, `windowExpiresAt` REQUIRED). Nothing extends it. The status response exposes it only while ACTIVE
  (`handlers.ts:186-197`); the app never renders it (grep: ⛔ use in `apps/mobile`).

**The sweep and the state machine**
- **F4 — The sweep expires both halves.** `runWaWebhookProcessorTick` (`:591-619`) drains, then always runs `runWaOptInExpirySweep`
  (`:530-555`): stale PENDING (`listStalePendingOptIns`, `write.ts:279-294`, TTL `DEFAULT_PENDING_TTL_SECONDS = 48 h` at
  `wa-webhook-processor.ts:50`) AND past-window ACTIVE (`listExpiredWindowOptIns`, `write.ts:300-306`) → `expireOptIn` (`:558-588`): audit
  `member.wa_opt_in_expired` (`system_expiry`, actor null) FIRST, then `revokeOptIn(…, 'EXPIRED_24H_WINDOW')` — ⛔ consent write
  (`void auditId` `:573`). `expiredWindow` appears at THREE sites: the sweep's result (`:530` / `:554`), the tick's type (`:593`) and the
  refusal shape (`:599`). The sweep reads across ALL tenants, `LIMIT 200` (`:48`), ⛔ `ORDER BY` — on :5433 it already has ≥ 60 stale
  PENDING rows, one per Pariwar, and growing (66 at validate) (AC9's seed must account for them). ⚠ The sweep has ⛔ test — deferred-work's Story 5.5 item *"Task 11's
  "stale-PENDING → EXPIRED" integration coverage is checked off but not actually tested."* (mainly the TELEGRAM sweep,
  `runTelegramOptInExpirySweep`; it adds *"Same gap exists in the Story 5.4 WA precedent (`runWaOptInExpirySweep` likewise untested).
  **Re-trigger:** alongside any future change to the stale-PENDING sweep logic in either the WA or Telegram worker."*). 5.12 closes only its
  WA half (AC9).
- **F5 — Edges.** `revokeOptIn` (`write.ts:216-253`): REVOKED ← ACTIVE; BLOCKED_BY_META ← ACTIVE; EXPIRED_24H_WINDOW ← PENDING **or ACTIVE**
  (`legalFrom` `:225-226`; doc `:216-222`). ⛔ src caller other than `expireOptIn`'s ACTIVE half passes ACTIVE → EXPIRED; one TEST does
  (F18). Terminal states never move again; a new yes is a fresh PENDING (ADR-0029: *"no inferred re-consent"*).
- **F6 — The enum is append-only.** `wa_opt_in_state` (`schema/member_wa_opt_in.ts:43-49`; created `0042_member-wa-opt-in.sql:18`) — the
  schema comment `:31-41` forbids reorder/removal; Postgres cannot drop an enum value. Contracts mirror it in lockstep
  (`packages/contracts/src/wa-opt-in/opt-in.ts:23-29`, enforced by `packages/contracts/tests/wa-opt-in.test.ts:20-35`); `openapi/v1.yaml:2426-2431`.
  The screen's `OptInState` (`notifications.tsx:26`) is DERIVED from contracts; only its comparison `state === 'EXPIRED_24H_WINDOW'` (`:162`)
  carries the literal.
- **F7 — The table's guards.** `member_wa_opt_in` (0042): ⛔ trigger, ⛔ CHECK; indexes `match_idx (pariwar_id, mobile_blind_index, state)`,
  `member_idx (pariwar_id, member_id)`, partial UNIQUE `pending_phrase_uq` (0042 `:45`) and `pending_member_uq (pariwar_id, member_id) WHERE
  state = 'PENDING'` (`0044`, SQL-only, ⛔ in Drizzle). `twt_app`: SELECT / INSERT / UPDATE; RLS ENABLE + FORCE. ⛔ "one ACTIVE per member"
  guard exists; the API's mint refuses only when the NEWEST row is ACTIVE (`handlers.ts:112-114` — a STATE check via `getOptInForMember`,
  ⛔ window-aware). Two ACTIVE rows for one member are ⛔ reachable through the code (a row is minted only while the newest is ⛔ ACTIVE;
  `pending_member_uq` allows one PENDING; activation needs PENDING) — only by hand-seeded data; neither :5432 nor :5433 holds such a member
  (read-only check at validate). PENDING rows carry `mobile_blind_index` (NOT NULL, set at mint, `write.ts:113`).

**Withdrawal and consent**
- **F8 — Every activation mints a consent row; every withdrawal revokes one.** The ONLY `whatsapp_opt_in` writer is the worker's match
  (`:384-400`, fresh `consentId = randomUUID()` `:368`). Revokes all pass the CURRENT row's id: member DELETE (`handlers.ts:234-241`), admin
  (`:299-306`), worker STOP / block via `revokeActiveOptIn` (`:479-522`, consent `:503-510`). `consent.revokeConsent` (`consent/write.ts:134-172`,
  `{ pariwarId, consentId, reason, revokedAuditId?, revokedAt? }`) works by id and THROWS `ConsentStateError` on an already-revoked row
  (`:142-144`, and `:169` on a race). Columns: `subject_id`, `consent_type`, `granted_at`, `revoked_at`, `revocation_reason`,
  `revoked_audit_id` (FK → `audit_log_entries`, `:324`), `audit_id`. `consent_records` has ⛔ unique on (subject, type) by design
  (`schema/consent_records.ts:271`, index `:330`). `consentExists(db, pariwarId, subjectId, consentType, validAt?)` (`consent/read.ts:36-68`, POSITIONAL) = ANY open row. The data export
  (`data-export/assemble.ts:450`) lists every row ⇒ an expired yes reads *granted* forever.
- **F9 — The API refuses a non-ACTIVE withdrawal.** Member DELETE: `if (!existing || existing.state !== 'ACTIVE') throw new
  ConflictError(…, 'wa_opt_in.not_active')` (`handlers.ts:216-218`; `existing` = the NEWEST row, `getOptInForMember` `read.ts:96-112`).
  Admin: the same at `:276-278` (route `routes.ts:62-78`, `member.moderate`; ⛔ admin UI calls it — F16). Errors mapped in
  `apps/api/src/middleware/error-mapping/index.ts:598-612`.

**STOP and block (the worker)**
- **F10 — STOP's member half reads ACTIVE only.** `:340-351`: `getActiveOptInByMobile` (`read.ts:72-89` — `state = 'ACTIVE'`, newest by
  `matched_at`) → `if (!active) continue;` ⇒ an EXPIRED / PENDING / REVOKED member's STOP does nothing and writes ⛔ audit. STOP keywords
  `:97` (`stop`, `unsubscribe`, `cancel`, `बंद`, `रोको`, `रोकें`; whole-message after NFKC — `:107-110` ⇒ *"STOP."* / *"Stop!"* match
  ⛔). The number resolves through the OPT-IN ROW's `mobile_blind_index` (the number that said yes), ⛔ the member's current mobile.
- **F10a — The drain is AT-MOST-ONCE and a member-half fault is silent.** `claimUnprocessedWebhookEvents`
  (`packages/domain/src/wa-opt-in/webhook-events.ts:70-74`) sets `processedAt = now()` AT CLAIM; the per-message catch
  (`wa-webhook-processor.ts:411-413`) only `console.error`s *"inbound-message processing failed (isolated)"* — ⛔ alarm, ⛔ retry. The claim
  half already alarms for exactly this (`contact_ladder.stop_unrecorded`, `:320-332`; its residual was TOLD to the Panel under `-372`).
  Today a lost member STOP is bounded by the 24-hour clock; under a lasting yes it is ⛔ bounded.
- **F10b — The yes is bound to the identity's NUMBER, and nothing changes a member's mobile.** The mint copies the identity's blind index
  (`handlers.ts:128-131`), the match requires the inbound index to equal it (`read.ts:48-65`), and `resolveWaTarget` sends to the decrypted
  `member_identities.mobile_ciphertext` (`delivery.ts:131-135`) — today the number that said yes IS the number messaged.
  `member_identities_pariwar_mobile_uq (pariwar_id, mobile_blind_index)` (`schema/member_identities.ts:60`) + ⛔ mobile-change writer (only
  `anonymize.ts:162` updates the table; `member-data-rights/handlers.ts:923` and `data-export/delivery.ts:7` note *"no mobile-change
  history"*) ⇒ opt-in rows carrying a number belong to ONE member per Pariwar. AR-24 (`epics.md`) plans a step-up-gated *"mobile change"*.
  A recycled SIM keeps the old member's ACTIVE row ⇒ its new holder receives the Trust's WhatsApp — today for ≤ 24 h, under 5.12 until they
  reply STOP or block (LY13). Likewise a yes outlives death (an overlay the audience predicates do not see — `news-blog/audience.ts:44-49`)
  and erasure (`anonymizeMember` never touches `member_wa_opt_in`).
- **F10c — Every WhatsApp send is a TEMPLATE** (`packages/channels/src/providers/whatsapp-app.ts:202`, `type: 'template'`) ⇒ a yes older
  than 24 h does ⛔ hit Meta's free-form window in the normal case; `whatsapp-errors.ts:31-33` notes *"some accounts/message shapes still
  surface a window error"* (131047 / 131051 / 131053 → `window_expired`).
- **F11 — The claim half runs first and is self-contained.** `:314-333` (6.37d WS10): STOP ⇒ `recordClaimContactWaStop` in its own try,
  alarm `contact_ladder.stop_unrecorded` on failure; the header comment `:265-270`: *"Row 5-12 (`-364`) will widen the MEMBER half below;
  this half is its own."* The status branch's claim ownership (`:430-459`) runs before the member block (`:460-471`).
- **F12 — The block codes are not all consent signals.** `WA_BLOCK_ERROR_CODES = {131050, 131049, 131026, 131047}` (`:115`) move an ACTIVE
  opt-in to BLOCKED_BY_META and revoke its consent for ANY wamid. Two deferred-work items, quoted by their titles:
  - *"`WA_BLOCK_ERROR_CODES` revokes a member's WhatsApp consent on signals that are not consent"* — 131049 (*"Meta's per-user MARKETING
    cap"*), 131026 (*"not on WhatsApp / Terms not accepted / an old app version"*), 131047 (the chat window); *"Only 131050 (the person
    blocked the business) is a consent signal."* Trigger: *"row 5-12 (which edits the same worker), or the first production WhatsApp send."*
  - *"WS11's hash fallback can suppress a MEMBER's block"* — a member-path wamid's block is claimed by the claim-space hash ⇒ *"the member
    path keeps sending to a number that blocked the Trust"*. Trigger: *"row `5-12-whatsapp-yes-lasts-until-withdrawn` or the
    `WA_BLOCK_ERROR_CODES` item reworking the member block path (check whether the wamid is a member send before the hash fallback)."*
  The worker carries the same marker (`:438-443`, *"RE-EXAMINE when: … row 5-12 / the `WA_BLOCK_ERROR_CODES` item reworks the member block
  path"*). ⚠ `isBlock` (`:427-428`, from `WA_BLOCK_ERROR_CODES`) ALSO gates the CLAIM half's hash fallback (`:451-458`) ⇒ editing the set or
  `isBlock` changes 6.37d's claim ownership (I5). Under a lasting yes the first item bites harder: a non-consent code (131047 included — a
  window code) ends a yes the member never took back, contradicting option A and reading (ii). The second stays BOUNDED in reach: the
  fallback claims a block-coded status only within 7 days of a claim-send row's last write (`hasRecentClaimContactWaSendTo`,
  `CONTACT_LADDER_WA_ISOLATION_DAYS = 7` — `claim/contact-ladder-whatsapp-record.ts:94`, aged by `updated_at`); a later member send's
  status outside that window reaches the member path. Its prescribed check (*"whether the wamid is a member send"*) is buildable only for
  6.31's reminders (`claim_peer_mesh_wa_reminders` records the wamid); an ALERT send's wamid IS returned by `dispatch`
  (`SendResult.providerMessageId`, `packages/channels/src/provider.ts:80`) but ⛔ recorded (`contribution-notify.ts:50`; `whatsapp_send_status`
  is written only by status callbacks — `channel-config/wa-status.ts:32`, worker `:420`) — recording it edits `apps/jobs/src/scheduler`
  (`contribution-notify.ts`, 6.37d AC11-pinned; `survey-publish.ts`, `news-publish.ts`) and adds a domain writer: outside AC8.
  ⚠⚠ **Meta's codes, from Meta's Cloud API error-code reference (fetched at validate, 2026-10-20):** 131050 = *"Unable to deliver the
  message. This recipient has chosen to stop receiving marketing messages on WhatsApp from your business."* — a MARKETING opt-out, ⛔ a
  block; 130403 = *"This business has blocked the end user"* (the reverse); ⛔ code reports a person blocking the business. ⇒ the item's
  *"Only 131050 (the person blocked the business) is a consent signal"* is wrong about WHAT 131050 says (it is still the only code that
  records a person's own request); ⛔ path records `BLOCKED_BY_META` for a person who blocks the business; and `blocked_desc`'s *"It looks
  like you blocked messages on WhatsApp"* is untrue for the one code that should set it (LY10).

**The app**
- **F13 — The withdraw control is ACTIVE-only and EXPIRED reads "expired".** `notifications.tsx` (186 lines, `useState`/`useEffect`, ⛔
  TanStack): ACTIVE → `active_title` / `active_desc` + `revoke_cta` (`testID="wa-opt-in-revoke"`, `:149-159`) — the ONLY withdraw control;
  `BLOCKED_BY_META || EXPIRED_24H_WINDOW` → `blocked_*` / `expired_*` + `retry_cta` (`wa-opt-in-enable`, `:161-175`); null / REVOKED →
  `enable_hint` + `enable_cta` (`:177-185`). ⛔ Test covers the screen. testIDs: `wa-opt-in-unavailable` (`:134`), `wa-opt-in-active`
  (`:151`), `wa-opt-in-revoke` (`:154`), `wa-opt-in-retry` (`:165`), `wa-opt-in-off` (`:179`), and `wa-opt-in-enable` in BOTH the retry and
  off branches (`:170`, `:181`). A second `waNotifications.*` consumer: `components/notifications/NotificationSettingsEntry.tsx`
  (`entry_label` / `entry_hint`). The screen ignores the DELETE body and re-fetches.
- **F13a — ⚠ The screen re-fetches in an endless loop TODAY.** `const t = useT()` (`:29`); `load = useCallback(…, [t])` (`:35-45`);
  `useEffect(() => { void load() }, [load])` (`:47-49`); `useT()` returns a fresh arrow every render (`packages/i18n/src/react.ts:56-59` —
  [[project_uset_fresh_closure_memo_trap]]) ⇒ every `setStatus` re-renders, re-creates `load`, re-runs the effect, issues another GET. A
  validate probe of the exact pattern (React 19.2.7, jsdom) made 4,396 fetches in 300 ms with *"Maximum update depth exceeded"*. A mocked
  stable `useT` HIDES it. `telegram-notifications.tsx:36-50` has the same shape (out of scope — a deferred item, Task 7.1).
- **F14 — The copy.** `packages/i18n/locales/{en,hi}/common.json:329-346`, 18 keys. `expired_title` *"WhatsApp opt-in expired"* /
  *"व्हाट्सएप ऑप्ट-इन समाप्त"*; `expired_desc` *"Your WhatsApp opt-in window closed. Tap below to opt in again."* / *"आपकी व्हाट्सएप ऑप्ट-इन
  अवधि समाप्त हो गई। फिर से चालू करने के लिए नीचे टैप करें।"*; `active_desc` *"You'll receive TWT notifications on WhatsApp."* / *"आपको TWT की
  सूचनाएँ व्हाट्सएप पर मिलेंगी।"*. Gates: i18n parity (`packages/i18n/scripts/check-parity.ts`, `ci-local.sh:66` — `common` is member-facing);
  microcopy (`microcopy.yaml:388-389` lists both `common.json` in `copy_globs`, scanning `Object.values` — `$comment` entries too;
  `notifications.tsx` is ⛔ in `code_globs`; the ten LY10 strings (incl. the reworded `blocked_*`) return ⛔ finding against the real
  config — validate probe; re-probe at Task 4). The parity
  check walks EN keys only (`packages/i18n/scripts/lib.ts:42-54`) ⇒ a leftover hi-only `expired_*` passes it. ⛔ machine "Hindi reviewed"
  marker and ⛔ Hindi glossary gate exist. `waNotifications.expired_*` are used ONLY at `notifications.tsx:167,169` (Telegram has its own
  `telegramNotifications.expired_*` — ⛔ touched). Copy-key precedent: `apps/mobile/tests/unit/known-people-copy-keys.test.ts` (real
  `getCatalog` / `t`) — ⚠ its literal regex (`:30`, `[a-z_]+`) matches ZERO camelCase `waNotifications.*` keys, and it reads a NAMESPACED
  catalog while these are flat dotted keys in `common` (`t` defaults to `common` — `resolver.ts:55`).

**Fences and tests that encode today's behaviour**
- **F15 — The "told expired" population is empty in production.** Nothing is in production ([[project_not_in_production_merge_is_not_golive]]);
  once this story ships ⛔ ACTIVE row ever expires (I1), so ⛔ member can be told "expired" after it either. Dev / test DBs (:5432, :5433)
  may hold EXPIRED rows that were ACTIVE (`consent_id IS NOT NULL`) with an open consent row.
- **F16 — ⛔ admin surface shows a member's opt-in.** `apps/admin/src` has ⛔ reference to wa-opt-in; only the API route exists.
- **F17 — 6.37d's AC11 PINS the two opt-in files.** `apps/jobs/tests/claim-contact-ladder-whatsapp.test.ts:153-169` SHA-256-pins
  `packages/domain/src/wa-opt-in/read.ts` and `write.ts` (also `contribution-notify.ts`, `peer-mesh-wa-reminder.ts`, `dispatch.ts`,
  `cascade.ts` …); `:92-95` requires `recordClaimContactWaStop(` in the worker. Editing read.ts / write.ts turns it RED BY DESIGN (T3).
- **F18 — Legs that encode 24 hours, by what happens to each.**
  - **RED under this story:** `packages/domain/tests/integration/wa-opt-in/wa-opt-in.spec.ts:185-209` (*"past window → false"*; passes
    `at` ⇒ also a TS error once LY1 removes it) + header `:9`; `peer-mesh-wa-reminder-opted-in.spec.ts:61-68` (*"ACTIVE past
    window_expires_at … ⇒ false"*) + header `:6`; ⚠ **`peer-mesh-wa-reminder-opted-in.spec.ts:70-79`** (*"EXPIRED_24H_WINDOW, REVOKED and
    BLOCKED_BY_META ⇒ false"* — loops `revokeOptIn(…, toState)` on a row `optIn()` just made ACTIVE ⇒ the EXPIRED iteration throws under
    LY3 and is refused by LY4's trigger); `packages/domain/tests/notifications/delivery-targets.test.ts` (mock call shape; header `:10`
    *"in-window"*).
  - **GREEN, title only:** `wa-opt-in.spec.ts:169-183` (*"EXPIRED_24H_WINDOW is legal from PENDING (stale sweep)"* — PENDING only; stays
    legal); `apps/api/tests/integration/wa-opt-in/wa-opt-in.spec.ts:132` (PENDING only) and `admin-opt-out.spec.ts:194` (no row) — still 409
    under LY7 (nothing to end); `apps/jobs/tests/wa-webhook-processor.test.ts:276-283` (6.37d leg (c), EXPIRED seeded by INSERT `:197-205`
    with ⛔ `consent_id` ⇒ nothing to end ⇒ still a no-op).
  - **UNAFFECTED:** 6.31's source fence (`apps/jobs/tests/claim-peer-mesh-wa-reminders.test.ts:80-89`, forbids `consentExists`,
    `isOptInActive` and `member_wa_opt_in` in the reminder modules); the contracts enum lockstep. Every raw ACTIVE seed in tests is one row
    per random member ⇒ LY4's index breaks ⛔ fixture.
- **F19 — Migrations are hand-authored.** `packages/domain/migrations/` (journal `meta/_journal.json`; snapshots stop at 0020 — ⛔
  `drizzle-kit generate`). Highest at the pin: `0176_claim-contact-wa-send-cap.sql`. ⚠ [[project_live_db_test_gotchas]]: never regenerate
  an applied migration; edits reach :5432 AND :5433; [[project_prepush_hook_inherits_5432]]. Conventions: journal `when` steps by
  +86400001 (0176's is `1794714000020`); a trigger raises `USING ERRCODE = 'integrity_constraint_violation'` (`0171:104-106`,
  `0172:51-53`); `db:migrate` (drizzle migrator, `__drizzle_migrations`) SKIPS an applied file ⇒ idempotency is shown with `psql -f`.
  ⛔ journal checker and ⛔ Drizzle drift test exist; `db:check` passes SQL-only objects.
- **F20 — Meta sets no duration.** Meta's opt-in page (fetched 2026-10-20) states ⛔ expiry; it asks businesses to give opt-out instructions
  and honour them. The 24-hour customer-service window governs FREE-FORM messages only; the Trust sends Meta-approved templates (§3.4
  *"Meta UTILITY templates only"*) — `-364` reading (ii).

**Gates the edits trip**
- **F21 — `ci:local` runs `integration-tests` ONLY when `DATABASE_URL` is set** (`scripts/ci-local.sh:98`); it strips `DATABASE_URL`
  from the `test (unit)` job itself (`:61`, AI-10-5). ⇒ `env -u DATABASE_URL pnpm ci:local` SKIPS `integration-tests`.
- **F22 — friction-budget AC-4.** `scripts/friction-budget/lib.ts:453` `MEMBER_FACING_PREFIXES = ['apps/mobile/', 'apps/public/']`;
  `check.ts:204-219` diffs COMMITTED work against `origin/main` and asks for a NEW/AMENDED row or a *"**Story <id> disposition (...)**"*
  block ⇒ any committed `apps/mobile/` edit with ⛔ disposition is RED ([[project_friction_budget_baseline_ratchet]]).
- **F23 — The OpenAPI text is emitted from `packages/contracts/scripts/emit-openapi.ts`, ⛔ the JSDoc.** GET `:1553` (*"…or window expiry
  (ACTIVE)"*); member DELETE `:1566-1567` (*"Member-initiated revocation of an ACTIVE opt-in … 409 when there is no ACTIVE opt-in"*) and
  `:1573` `409: errorResponse('No active opt-in to revoke')`; admin `:1585` (*"…no ACTIVE opt-in"*) and `:1594`. They land in
  `openapi/v1.yaml:10742-10818`, checked byte-for-byte (`contracts:check-openapi-determinism`; ci.yml `contracts-check`, ci-local
  `contracts-determinism`). `opt-in.ts:50-56` is a JSDoc block (⛔ `.describe()`) ⇒ ⛔ emitted. The Telegram routes' twin text
  (`:1638-1645`; `v1.yaml:10884`) is ⛔ touched.
- **F24 — Lint.** `packages/eslint-config-twt/index.js` = `js.configs.recommended` + `tseslint.configs.recommended`, ⛔ `argsIgnorePattern`
  ⇒ an unused `_at` parameter is an ERROR (validate probe); `void at;` lints clean.
- **F25 — Other gates that read these edits:** domain-invariants (`clampLimit` on any dynamic `.limit()`); access-wrapper (scans
  `apps/api/src/modules/wa-opt-in` ⇒ keep `withCompensatingAudit`; `apps/jobs` ⛔ scanned); `docs/domain-accessor-invariants.md:76-102`
  family (c) asks for a double-operation test (convention). ⛔ audit-action registry exists (actions are strings); `governance_boundary.yaml`
  covers flags only (⛔ added here).

## ⚖️ Build decisions LY1–LY13 (⭐ = recommended)

> ⭐ **OUTCOME (2026-10-21) — it governs:** DECIDED by [Decision 2026-10-21-373](../../.decision-log.md#decision-2026-10-21-373)
> (author-commit, `97e1e7ad`, alone). BigDev: *"all as recommended"* — every ⭐ option below, INCLUDING LY6's optional member-only
> punctuation strip; PQ1 and PQ2 = yes (one told item, `trustee-panel-told-2026-10-21-5-12-whatsapp-yes-residuals.md`, WRITTEN — ⛔ told
> until BigDev sends it); the alarm `wa_opt_in.stop_unrecorded` owned by BigDev (`-373` decision 6); WhatsApp enquiries routed into the
> helpdesk after go-live (`-373` decision 10 — ⛔ in 5.12's scope). The roster row is **Row 37**. The options below are kept as put.

Each RECOMMENDED option is the author's (§0 — where each sits against option A is stated there). Each carries its cost.

- **LY1 — The read.** ⭐ **(a)** `isOptInActive(db, { pariwarId, memberId })` = `state = 'ACTIVE'`, ⛔ window guard; the `at` parameter is
  REMOVED from `isOptInActive` and `resolveWaTarget` stops passing it. ⚠ `resolveWaTarget`'s OWN trailing `at?: Date` STAYS in its
  signature: its callers pass it — `contribution-notify.ts:172` (a file 6.37d's AC11 PINS, AC8) and the API adapter
  `channel-config/composition.ts:65` (+ `apps/api/tests/unit/wa-target.test.ts:44`); it becomes unused there — KEEP the name `at` and add
  `void at; // retained for callers (contribution-notify.ts — pinned — and the API adapter); the opt-in has ⛔ clock since 5.12` (⛔ `_at`:
  F24 — it fails lint). Correct the adapter's doc `composition.ts:56` (*"member opt-in (ACTIVE, within window)"*) and `delivery.ts`'s
  `:108-115` doc + `:127` inline comment. `isPeerMeshWaReminderOptedIn` keeps its composition (WR3); only its doc comment is corrected. **(b)** keep `at` on `isOptInActive`
  accepted-and-ignored. *Cost (a):* touches `delivery.ts` and the delivery-target mocks, ⛔ `contribution-notify.ts`; (b) leaves a
  parameter that lies.
- **LY2 — `window_expires_at`.** ⭐ **(a)** keep writing it on the match (it is a TRUE fact — when Meta's free-form window closes, reading
  (ii)); ⛔ read it for the yes anywhere; correct its comments (schema, `activateOptIn`, contracts `WaOptInStatusResponse` doc) to say
  "Meta's free-form window end — ⛔ the opt-in's end". **(b)** stop writing it. *Cost (a):* a column nobody gates on; (b) changes
  `activateOptIn`'s signature and loses the fact.
- **LY3 — The sweep.** ⭐ **(a)** delete the ACTIVE half (`listExpiredWindowOptIns`, the `past` loop, `expiredWindow` at all three sites
  — F4); keep the stale-PENDING half unchanged (a request never confirmed is ⛔ a yes) → `EXPIRED_24H_WINDOW`, whose meaning becomes "a
  request that was never confirmed" (the value stays — F6); `revokeOptIn`'s `legalFrom` for `EXPIRED_24H_WINDOW` becomes `['PENDING']`;
  the doc comments say so. Add the sweep's missing tests (F4 — closes the 5.5 item). **(b)** add a new enum value for "unconfirmed". *Cost
  (a):* a value named for 24 hours now means "unconfirmed after 48 h" — documented in the schema comment; (b) an `ALTER TYPE … ADD VALUE` in
  its own migration, a contracts lockstep change and two values for one meaning.
- **LY4 — Database backstops.** ⭐ **(a)** ONE forward migration, slug `member-wa-opt-in-lasting-yes` (number = next free at its commit):
  (i) a `BEFORE UPDATE` trigger on `member_wa_opt_in` that RAISES (`USING ERRCODE = 'integrity_constraint_violation'` — F19) when
  `NEW.state = 'EXPIRED_24H_WINDOW' AND OLD.state IS DISTINCT FROM NEW.state AND OLD.state <> 'PENDING'` (exactly LY3's edge set — it
  also refuses REVOKED / BLOCKED → EXPIRED, and lets an update that leaves an EXPIRED row EXPIRED pass, e.g. a future erasure scrub; ⛔ SECURITY DEFINER needed, RLS FORCE is irrelevant to a RAISE-only trigger); (ii) a partial UNIQUE index
  `member_wa_opt_in_active_member_uq (pariwar_id, member_id) WHERE state = 'ACTIVE'` (SQL-only, like 0044's); both idempotent
  (`CREATE OR REPLACE FUNCTION`, `DROP TRIGGER IF EXISTS` / `CREATE TRIGGER`, `CREATE UNIQUE INDEX IF NOT EXISTS`). The mint guard
  (`handlers.ts:112`) KEEPS its newest-row check and ALSO refuses when ANY row has `state = 'ACTIVE'` — a STATE read, ⛔ `isOptInActive`
  (the delivery gate, window-aware until Task 5). **(b)** code-only. *Cost (a):* a migration; (ii) fails to apply only on hand-seeded data
  (F7: two ACTIVE rows for one member are ⛔ reachable through the code, and neither dev DB holds one) — a failure is a finding, ⛔ to be
  papered over; an OLD jobs worker against a migrated :5432 hits the trigger each tick (two audit lines per past-window ACTIVE row — dev
  only).
- **LY5 — One way to end every yes (condition 4).** ⭐ **(a)** a NEW consent function `revokeOpenConsentsOfType(db, { pariwarId,
  subjectId, consentType, reason, revokedAuditId }) → number` — set-based `UPDATE … WHERE revoked_at IS NULL`, ⛔ throw on zero rows
  (`revokeConsent`'s by-id contract is unchanged); and a NEW opt-in function `endEveryWaYes(tx, { pariwarId, memberId, toState: 'REVOKED' |
  'BLOCKED_BY_META', reason, revokedAuditId }) → { movedOptInId: string | null, consentsRevoked: number }` in `wa-opt-in/write.ts`: moves
  the member's ACTIVE row (≤ 1 — LY4; selected by `state = 'ACTIVE'`, ⛔ via `isOptInActive`) to `toState` and revokes every open
  `whatsapp_opt_in` row of the member, in the caller's tx. ALL FOUR withdrawal paths call it; `revokeActiveOptIn`'s per-id consent revoke
  goes. ONE audit line per withdrawal (the existing actions and five-field hash), committed on its own connection BEFORE the state tx (as
  all four sites do today — the `revoked_audit_id` FK is then satisfied), its id on every revoked consent row. A result of
  `{ movedOptInId: null, consentsRevoked: 0 }` (a lost race — e.g. STOP and DELETE together, both pre-checks passing) ⇒ the CALLER writes the
  compensating `_rolled_back` line (so ⛔ audit line asserts a transition that did not happen): the API handler throws
  `ConflictError('…', 'wa_opt_in.not_active')` (`apps/api/src/http-errors.ts:67`) inside `mutate`, so `withCompensatingAudit` compensates
  and rethrows (`compensating.ts:64-68`; ⛔ a `WaOptInStateError`, which maps to `wa_opt_in.invalid_state`); the worker writes the
  compensation and RETURNS — ⛔ retry, ⛔ alarm (a lost race is ⛔ a fault). API audit snapshot when ⛔ ACTIVE row moved (LY7's
  EXPIRED-with-open-consent 200): `before` = `after` = the newest row's state, as LY6 (today `handlers.ts:228-229`, `:293-294` hard-code
  ACTIVE → REVOKED). **(b)** loop `revokeConsent` per row. *Cost (a):* a new shared consent function
  (Story 2.7's module) — narrow, typed; (b) N reads + a throw on a concurrently revoked row.
- **LY6 — STOP always works (condition 3).** ⭐ **(a)** the member half resolves EVERY member whose opt-in rows (ANY state) carry the
  sender's `mobile_blind_index` in the Pariwar (a NEW read `listMemberIdsByOptInMobile(db, { pariwarId, mobileBlindIndex })`, bounded); for
  each member with something to end (an ACTIVE row OR an open `whatsapp_opt_in` consent row) it writes the audit line and calls
  `endEveryWaYes(…, 'REVOKED')`. Nothing to end ⇒ ⛔ write, ⛔ audit. A PENDING row is LEFT (it is ⛔ a yes; only a later phrase message —
  itself a new user-initiated yes — can activate it). The claim half (F11) is untouched and still runs first. Audit snapshot when ⛔ ACTIVE
  row moved: `before` = `after` = the member's newest row's state (an auditor reads "consent closed, state unchanged").
  **Fault shape (condition 3 — F10a):** each member in its OWN try, with its OWN `deps.db.transaction` opened inside that try after that
  member's audit line (⛔ one transaction around the loop — a failed statement aborts it, 25P02, and costs every later member their STOP).
  A fault AFTER that member's audit line committed writes the `_rolled_back` compensation; a fault before it (the read, or the audit
  write itself) writes none. Either is RETRIED ONCE in a fresh transaction, and each attempt writes its OWN primary line (a first-attempt
  fault + a successful retry = 2 primary + 1 `_rolled_back`; the revoked consent rows carry the SECOND primary's id). A second fault raises `wa_opt_in.stop_unrecorded` through `deps.onAlarm` (ids only: Pariwar, inbound event id, member id —
  ⛔ number), in its own try like the claim half's. A fault BEFORE the loop — `memberMobileBlindIndex` (`:334`, a KMS HMAC) or
  `listMemberIdsByOptInMobile` — reaches only the per-message catch (`:411-413`); that catch ALSO raises `wa_opt_in.stop_unrecorded`
  (ids only: Pariwar, inbound event id — the claim half may already have recorded its stop, so the text names the member opt-in only)
  when `isStopKeyword(msg.text?.body ?? '')` (`body` is a `const` inside the try, `:310` — ⛔ in scope in the catch; or
  `isMemberStopKeyword(…)` if the punctuation option is chosen). The per-member path does ⛔ rethrow after its own alarm (else this catch
  alarms twice). Owner of the alarm: named in the Task 0.3 decision (the Row 32 (h)
  shape).
  *Cost (a):* (1) the drain is at-most-once, so a STOP that faults twice stays unrecorded until a person acts on the alarm — today the
  24-hour clock bounded that, under 5.12 nothing does (**PQ1**: whether this residual is TOLD to the Panel, as `-372` told the claim STOP's,
  is BigDev's at Task 0.2); (2) a STOP from a number ends the yes of every member whose opt-in rows carry it, whoever sent it — ⛔ reachable
  today (one member per number per Pariwar — F10b), reachable once a mobile-change writer exists (AR-24); (3) Meta delivering the STOP
  before the phrase that preceded it (out-of-order events) leaves the member ACTIVE — ⛔ ordering by `messages[].timestamp` is attempted.
  **(b)** keep ACTIVE-only but also revoke open consent rows of that one member. *Cost (b):* leaves an EXPIRED member's STOP doing nothing
  to the state they see.
  *Optional, the author's (a narrowing):* a MEMBER-half-only predicate (`isMemberStopKeyword`, used at `:340` only) strips trailing
  `[.!।,]+` after NFKC so *"STOP."* / *"Stop!"* match (⛔ substring matching); `isStopKeyword` (`:107-110`, also the claim half's `:314`)
  stays BYTE-UNCHANGED (I5 — widening the claim STOP too is a separate narrowing, ⛔ taken here). ⭐ Recommended: yes.
- **LY7 — The API withdrawals.** ⭐ **(a)** member DELETE and admin opt-out: 409 `wa_opt_in.not_active` ONLY when there is nothing to end
  (⛔ ACTIVE row and ⛔ open consent row); otherwise the audit line + `endEveryWaYes(…, 'REVOKED')` → 200 `{ state }` (`REVOKED` when an ACTIVE
  row moved, else the newest row's state — `RevokeWaOptInResponse` unchanged; it is `.strict()` over the full five-value enum, so EXPIRED
  validates). The 409's message stays; the route / 409 DESCRIPTIONS in `emit-openapi.ts` change to this condition (F23). **(b)** always 200
  (idempotent). *Cost (a):* keeps the existing error contract; ⚠ the EXPIRED-with-open-consent 200 is ⛔ reachable from the app (the
  EXPIRED branch renders only `wa-opt-in-enable`) — such a consent closes by STOP or by a re-opt-in then withdrawal (consistent with LY9 (a);
  the population is empty in production). *Cost (b):* removes the documented 409 (`emit-openapi.ts:1573`, `:1594`) for ⛔ member-visible
  gain.
- **LY8 — The Meta block path.** In both options the block still resolves the recipient's ACTIVE row only (`getActiveOptInByMobile` — a
  block on a number with ⛔ standing yes ends nothing; ⛔ LY6's any-state lookup, which is for a request the person made), and on a hit
  calls `endEveryWaYes(…, 'BLOCKED_BY_META')` (so a block also ends every earlier yes). The member block call sits in the member block at
  `:460-471`; the claim ownership checks above it (`:429-459`, 6.37d R4 / P17) are ⛔ touched (T1).
  ⭐ **(a)** ONLY `131050` ends a MEMBER yes — per Meta's reference a MARKETING opt-out (F12), ⛔ a block; it is the only code that
  records the person's own request, and ending the whole yes on it NARROWS who is messaged (the author's — the Trust sends UTILITY
  templates, so under (a) ⛔ Meta signal should normally end a yes at all). Mechanism: a NEW member-only predicate (`WA_MEMBER_CONSENT_BLOCK_CODES = new Set([131050])`, `isMemberConsentBlock`) gates the member block at
  `:460`; `WA_BLOCK_ERROR_CODES` and `isBlock` stay BYTE-UNCHANGED because they also gate the claim half's hash fallback (F12, I5).
  131047 / 131026 / 131049 are still recorded by `upsertWaSendStatus` and end NOTHING. The `WA_BLOCK_ERROR_CODES` item is then *"Closed
  by 5.12"* for the MEMBER path (a dated note: the set itself still drives the claim fallback — ⛔ a consent question there; and the item's
  *"the person blocked the business"* is corrected against Meta's reference). A member ended by 131050 is shown the reworded `blocked_*`
  (LY10). The WS11 item
  gets a DATED NOTE: the 5-12 trigger FIRED; ⛔ fixed here (its prescribed check needs a send-time wamid record for alert sends — an
  `apps/jobs/src/scheduler` edit (`contribution-notify.ts` is 6.37d AC11-pinned) plus a new domain writer, outside AC8 — F12); it stays deferred to its other trigger (the `WA_BLOCK_ERROR_CODES` item, now closed for the
  member path ⇒ restated to *"the first send-time wamid record for member alert sends"*), with its cost restated as BOUNDED (F12). The
  worker's RE-EXAMINE comment (`:438-443`) is dated. *Cost (a):* relative to TODAY it widens who is messaged for three codes (a member Meta
  could not reach on a non-consent code stays opted in — each later send fails the same way and is recorded); relative to option A it is
  the ruled reach for those three codes, and a narrowing for 131050 (above). One new guard in the member half of the status loop; ⛔ change above `:460`.
  **(b)** codes UNCHANGED. *Cost (b):* NARROWS option A for three codes — a window code (131047) or a cap / reachability code ends a yes the
  member never took back (against reading (ii)), and the app then tells them *"It looks like you blocked messages on WhatsApp"*. Both items
  get a DATED NOTE: the 5-12 trigger FIRED; `WA_BLOCK_ERROR_CODES` stays deferred to *"the first production WhatsApp send"* (its own other
  trigger), WS11 to the `WA_BLOCK_ERROR_CODES` item (ITS other trigger); the first becomes a go-live leg of the LY11 row, and Row 35 (g)'s
  note records that condition 1 is ⛔ discharged for those codes.
- **LY9 — Members told "expired" before the ruling (`-364` reading (iv)).** ⭐ **(a)** ⛔ restoration: production holds ⛔ such member
  (F15); an EXPIRED row that was ACTIVE (dev / test data only) stays EXPIRED and shows the new "not on" copy; its open consent row closes at
  the member's next withdrawal (LY5 / LY6). This NARROWS who is messaged — the author's under (iv). Task 0.1 S1 STOPS if any production data
  exists. ⚠ For that population (none in production — S1) (a) departs from option A's *"The app shows them as still opted in"*; the
  `unconfirmed_*` copy (*"We did not receive your WhatsApp message"*) is UNTRUE for a row that was once ACTIVE; and its consent row reads
  *granted* in the data export until the member's next withdrawal. **(b)** an audited one-shot reconcile that moves each member's newest
  EXPIRED-from-ACTIVE row with an open consent back to ACTIVE — reading (iv)'s DEFAULT (⛔ ratified), and it MATCHES option A's
  *"The app shows them as still opted in"*. ⛔ message tells them. *Cost (a):* a dev member who had said yes must say yes again; (b) a new
  audited transition (`EXPIRED → ACTIVE`, against F5's "terminal" and beside ADR-0029's *"no inferred re-consent"* — the expiry was ⛔ a
  withdrawal under `-364`, so it is ⛔ a re-consent, but the ADR note must say so) for rows ⛔ real member holds.
  (iv) places this decision at *"the build row's create-story"*: the recommendation here IS that decision, confirmed by BigDev at Task 0.2.
- **LY10 — The words (condition 1).** ⭐ **(a)** DELETE `expired_title` / `expired_desc` from both locales (so ⛔ surface can render
  "expired") and ADD `unconfirmed_title` / `unconfirmed_desc` for `EXPIRED_24H_WINDOW`; CHANGE `active_desc` to say how long it lasts and how
  to stop. Proposed (en / hi — the Hindi is a DRAFT for LY11's review):
  - `unconfirmed_title`: *"WhatsApp notifications are not on"* / *"व्हाट्सएप सूचनाएँ चालू नहीं हैं"*
  - `unconfirmed_desc`: *"We did not receive your WhatsApp message, so WhatsApp notifications were not turned on. Tap below to try again."* /
    *"हमें आपका व्हाट्सएप संदेश नहीं मिला, इसलिए व्हाट्सएप सूचनाएँ चालू नहीं हुईं। फिर से प्रयास करने के लिए नीचे टैप करें।"*
  - `active_desc`: *"You'll receive TWT notifications on WhatsApp until you turn them off here or reply STOP on WhatsApp."* /
    *"जब तक आप इन्हें यहाँ बंद नहीं करते या व्हाट्सएप पर STOP नहीं भेजते, आपको TWT की सूचनाएँ व्हाट्सएप पर मिलती रहेंगी।"*
  - `blocked_title` / `blocked_desc` (the only code that now sets BLOCKED_BY_META is a person's MARKETING opt-out — F12 — so *"It looks
    like you blocked messages on WhatsApp"* is untrue): *"WhatsApp notifications were turned off"* / *"व्हाट्सएप सूचनाएँ बंद कर दी गईं"*;
    *"WhatsApp told us you no longer want our messages there, so we turned WhatsApp notifications off. Tap below to turn them on again."*
    / *"व्हाट्सएप ने हमें बताया कि आप वहाँ हमारे संदेश नहीं चाहते, इसलिए हमने व्हाट्सएप सूचनाएँ बंद कर दीं। फिर से चालू करने के लिए नीचे
    टैप करें।"* — under LY8 (b) the old words stay (codes unchanged) and this bullet drops.
  `retry_cta` and the rest are unchanged; the Telegram `telegramNotifications.blocked_*` are ⛔ touched. **(b)** change the `expired_*` VALUES in place. *Cost (a):* key churn; (b) keeps a key
  named for what the screen must never say. ⚠ The new `active_desc` is app status text, ⛔ the consent wording counsel may yet look at
  (`-364` "still uncertain" (1)).
- **LY11 — The Hindi review.** The sprint row routes condition 1 as *"the app's "expired" wording changes (en + reviewed hi)"*.
  ⭐ **(a)** a go-live record: a new roster row by KEY `wa-opt-in-lasting-yes-hindi-reviewed` (number = next free at Task 0.4), legs:
  (a) *"before the first production WhatsApp on a member opt-in, the 5.12 Hindi strings human-reviewed (Row 28's control pattern)"*;
  (b) only if LY8 (b) is chosen — the three non-consent codes narrowed for the member path; (c) `-364`'s *"Not covered"* item —
  *"counsel's view on the consent wording (whether it should say how long a yes lasts …)"* recorded, or its absence accepted as a
  decision. ⛔ a merge fence. **(b)** a reviewer signs off before `done`. *Cost (a):* "5-12 `done`" ≠ "the Hindi reviewed" — Row 35 (g)'s
  note must say so and read BOTH (Task 7.1); (b) blocks the row on a person's diary.
- **LY12 — Records.** ⭐ **(a)** Task 0.3: ONE author-commit decision (next free id) recording LY1–LY13 and PQ1 / PQ2 as answered,
  including the residuals (LY6 cost (1), LY13), committed ALONE before any record or code
  ([[feedback_governance_commits_precede_implementation]]); Task 0.4: the owed `epics.md` 5.12 entry (6.31's post-hoc format), the LY11
  roster row, a dated note on ADR-0029 (changelog *"(ratified — annotated)"*) and architecture §3.4 (⛔ decision text edited),
  deferred-work dated notes (LY8) and the new items (LY13; the Telegram screen's re-fetch loop — F13a), the ledger, and — if PQ1 / PQ2
  are answered "tell" — the told item(s) WRITTEN (⛔ recorded as told until BigDev says it went out); Task 7: the two `-364` items closed,
  the 5.5 item's WA half closed (its Telegram half stays OPEN — F4), the LY8 items per the option chosen, Row 35 (g)'s dated note, dated
  notes on Stories 6.31 and 6.37d. **(b)** fewer records. *Cost:* paper; the alternative is footgun #14 (an item closed at one site, open
  at three).
- **LY13 — A yes that follows a number, or outlives the member (F10b).** ⭐ **(a)** state the costs in the Task 0.3 decision and add two
  deferred-work items: (1) *"A member's WhatsApp yes is bound to the number that sent it"* — trigger: the first mobile-change writer
  (AR-24), which must call `endEveryWaYes(…, 'REVOKED')` in its own transaction; (2) *"A WhatsApp yes outlives death and erasure"* —
  trigger: the first production WhatsApp send. ⛔ code here. **(b)** end the yes now at death (the claim-filing / death-overlay write) and
  at `anonymizeMember` by calling `endEveryWaYes` (a narrowing — the author's). *Cost (a):* a recycled SIM's new holder — ⛔ a member,
  outside `-364`'s accepted *"More WhatsApp messages reach members"* — receives the Trust's WhatsApp until they reply STOP (LY6 ends it)
  or block; today ≤ 24 h. A deceased member's phone (often with the family) keeps receiving news / survey WhatsApp. Calibration: SMS
  already goes to the registered mobile with ⛔ opt-in at all. **PQ2**: whether the recycled-number residual is TOLD to the Panel is
  BigDev's at Task 0.2. *Cost (b):* two more call sites in modules this story otherwise leaves alone (death overlay, anonymize), each with
  its own tests.

## Acceptance Criteria

**AC1 — The read has ⛔ clock (I1; LY1).** `isOptInActive` returns `true` for an ACTIVE row whatever its `window_expires_at` (past,
future, NULL), and `false` for PENDING, REVOKED, BLOCKED_BY_META, EXPIRED_24H_WINDOW and ⛔ row (live DB). `resolveWaTarget` forwards ⛔
`at` to `isOptInActive` (mock call shape in `delivery-targets.test.ts`, which MOCKS the read — so "a target for a member whose window
passed a week ago" is proven by the live `isOptInActive` leg plus this call shape, ⛔ in the mock file alone). `isPeerMeshWaReminderOptedIn`
is unchanged in composition: ACTIVE past window + open consent ⇒ `true`; ACTIVE + consent revoked ⇒ `false`. *Legs:* `wa-opt-in.spec.ts`
(replacing `:185-209` *"past window → false"*, header `:9`), `peer-mesh-wa-reminder-opted-in.spec.ts` (`:61-68` flipped, header `:6`
corrected, and `:70-79` re-seeded: the EXPIRED case by a raw `INSERT … state = 'EXPIRED_24H_WINDOW'`, REVOKED / BLOCKED_BY_META still
through `revokeOptIn`), `delivery-targets.test.ts` (call shape; header `:10`).

**AC2 — ⛔ Yes expires (I1; LY3, LY4).** A tick leaves an ACTIVE row whose window passed as ACTIVE (and writes ⛔ `member.wa_opt_in_expired`
for it); a PENDING older than the TTL still becomes EXPIRED_24H_WINDOW with its audit line; the tick's result carries ⛔ `expiredWindow`.
`revokeOptIn(…, 'EXPIRED_24H_WINDOW')` on an ACTIVE row throws `WaOptInStateError`. A raw `UPDATE member_wa_opt_in SET state =
'EXPIRED_24H_WINDOW'` on an ACTIVE, a REVOKED and a BLOCKED_BY_META row is each REFUSED by the trigger (SQLSTATE 23000); the same UPDATE on
a PENDING row succeeds; an INSERT of an EXPIRED row succeeds (the trigger is UPDATE-only); an UPDATE of a non-state column on an EXPIRED row
succeeds. A second ACTIVE row for one member is refused
(23505, `member_wa_opt_in_active_member_uq`). The migration file, after `db:migrate`, applies TWICE more cleanly via
`psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f …` on :5433 (`db:migrate` skips an applied file — F19).

**AC3 — Every withdrawal ends every yes (condition 4; I2; LY5).** For EACH of the four paths (member DELETE, admin opt-out, STOP, Meta status
code 131050): seed the LEGACY yes by INSERT — an open `consent_records` row (`whatsapp_opt_in`, explicit `granted_at` two days ago — T8)
and a `member_wa_opt_in` row INSERTed directly in `EXPIRED_24H_WINDOW` with that `consent_id` and explicit `matched_at` / `created_at`
(⛔ an `UPDATE` of an ACTIVE row — the LY4 trigger refuses it; ⛔ disabling the trigger) → opt in again through the real path → withdraw ⇒
ZERO open `whatsapp_opt_in` consent rows for the member, `consentExists(…, 'whatsapp_opt_in')` false, `isPeerMeshWaReminderOptedIn` false,
`isOptInActive` false; ONE audit line for the withdrawal and its `audit_id` in `revoked_audit_id` of BOTH consent rows; the ACTIVE row is
REVOKED (BLOCKED_BY_META for the 131050 status). `revokeOpenConsentsOfType` on a member with ⛔ open row returns 0 and ⛔ throws; it touches ⛔
other consent type and ⛔ other member. Double operation (F25): `endEveryWaYes` twice for one member ⇒ the second returns
`{ movedOptInId: null, consentsRevoked: 0 }` and ⛔ throws; each caller then takes LY5's lost-race arm (compensating line; the API 409).
Block legs only: a status with 131047, 131026 or 131049 on an ACTIVE member ⇒ the member stays ACTIVE with its consent open (LY8 (a));
the same status on a CLAIM send is owned exactly as before (6.37d legs unedited — AC8).

**AC4 — STOP always works (condition 3; I3; LY6).** STOP from: (a) an ACTIVE member ⇒ REVOKED + every consent closed; (b) a legacy EXPIRED
member with an open consent (seeded by INSERT — AC3) ⇒ the consent closed, the row's state unchanged, one audit line (`before` = `after`
= EXPIRED_24H_WINDOW); (c) a member whose only row is PENDING, or REVOKED, or ⛔ row, or EXPIRED with ⛔ consent ⇒ ⛔ write, ⛔ audit line;
(d) DEFENSIVE (⛔ reachable today — F10b; seeded by raw SQL): a number on two members' rows ⇒ both members' yes ended, and a fault injected
for the first still ends the second; (e) a STOP in Hindi (`रोको`) behaves as (a); (f) a fault injected in a member's end on BOTH attempts ⇒
`wa_opt_in.stop_unrecorded` raised ONCE through a recording `onAlarm`, its message string holding the ids and ⛔ number / phrase (T13), and the claim stop is still
recorded; a fault on the FIRST attempt only ⇒ the retry ends the yes and ⛔ alarm; (g) if the LY6 punctuation option is chosen: *"STOP."*
and *"Stop!"* behave as (a), *"please stop now"* does ⛔. Fault injection: the worker runs on separate pool connections, so the
precedent's shape (`packages/domain/tests/integration/claim/approval-warnings.spec.ts:355-356` — a `pg_temp` function + trigger inside ONE uncommitted client tx) does ⛔ reach it:
use a COMMITTED test trigger on `consent_records` (or `member_wa_opt_in`) calling a NON-temp function (e.g. `public.t512_fault_<uuid>()`),
scoped `WHEN (…)` to the target id, both dropped in `finally` (the
`apps/api/tests/integration/claims/cycle-freeze.spec.ts:57-92` / `:851-872` shape: its own connection, `SET lock_timeout`, a name-prefix
sweep of leaked triggers / functions in `beforeAll`; prefer `member_wa_opt_in` over the shared `consent_records` where the leg allows —
`CREATE TRIGGER` takes SHARE ROW EXCLUSIVE); for the first-attempt-only leg it raises ONCE (a guard row or a sequence's
first value). Or a `deps` seam — ⛔ a mock of `endEveryWaYes` (it would not exercise the transaction shape). (h) a `kms.computeHmac` that throws on the
SECOND HMAC only (the member blind index — the claim-space hash is the first; the P4 test's seam, `wa-webhook-processor.test.ts:315-337`)
on a STOP ⇒ the claim stop IS recorded, and `wa_opt_in.stop_unrecorded` is raised ONCE from the per-message catch, ⛔ number. AC4 (f)'s first-attempt-only leg also asserts the
audit lines: 2 primary + 1 `_rolled_back`, and the revoked consent rows carry the second primary's id. Every case still records the claim stop first when the claim branch is open (6.37d legs unchanged).

**AC5 — The API withdrawals (condition 3; LY7).** DELETE `/api/v1/member/wa-opt-in`: ACTIVE ⇒ 200 `{ state: 'REVOKED' }`; newest row
EXPIRED with an open consent ⇒ 200 `{ state: 'EXPIRED_24H_WINDOW' }` and the consent closed; nothing to end ⇒ 409 `wa_opt_in.not_active`.
The admin route the same (with `admin_action` and the admin as actor). POST (mint) with ANY ACTIVE row ⇒ 409 `wa_opt_in.already_active`
(incl. an ACTIVE row past its window, and an ACTIVE row that is ⛔ the newest — seeded by raw SQL). `openapi/v1.yaml` changes ONLY in the
wa-opt-in route and 409 descriptions emitted from `emit-openapi.ts` (F23: GET's *"window expiry"*, the two *"409 when there is no ACTIVE
opt-in"*, the two `errorResponse('No active opt-in to revoke')`) — reworded to LY7's condition (*"409 only when there is nothing to end: ⛔
ACTIVE opt-in and ⛔ open whatsapp_opt_in consent"*) and LY2's (*"Meta's free-form window end — ⛔ the opt-in's end"*); `pnpm
contracts:emit-openapi` regenerates it, it is committed, and `pnpm contracts:check-openapi-determinism` passes. The Telegram routes' text
is ⛔ touched. LY2's JSDoc edit in `opt-in.ts` emits ⛔ thing.

**AC6 — The app never says "expired" (condition 1; I4; LY10).** `expired_title` / `expired_desc` are ABSENT from both `common.json`;
`unconfirmed_title` / `unconfirmed_desc` and the new `active_desc` are present in both with the LY10 words (or BigDev's at Task 0.2). A
copy-keys test (the `known-people-copy-keys.test.ts` SHAPE — the REAL `getCatalog` / `t`, ⛔ a stub —
[[feedback_stub_must_call_not_transcribe]]) scans `app/(settings)/notifications.tsx` AND `components/notifications/NotificationSettingsEntry.tsx`
with a camelCase-capable regex `/\bt\(\s*'([A-Za-z_]+(?:\.[A-Za-z_]+)*)'/g` (⛔ the precedent's `[a-z_]+`, which matches ZERO of these keys
— F14); POSITIVE CONTROL: the scanned set has ≥ 18 keys and contains `waNotifications.unconfirmed_title`; each key satisfies
`getCatalog(locale, 'common')![key]` and `t(key, undefined, { locale, namespace: 'common' })` non-empty in en AND hi. ⛔ `waNotifications.*`
value in EITHER locale matches `/expir/i` or contains `समाप्त`, and `expired_title` / `expired_desc` are asserted absent in `hi`
EXPLICITLY (the parity gate walks en keys only — F14). i18n parity and microcopy gates green.

**AC7 — The withdraw control shows for every standing yes, and the screen loads ONCE (condition 2; I4; F13a).** A jsdom render test of
`notifications.tsx` (`// @vitest-environment jsdom`; the `workplace-screen-render.test.ts` scaffold EXTENDED — RTL `cleanup` in
`afterEach` — [[project_mobile_vitest_and_expo_install_traps]]):
- Rendered inside a REAL `<LocaleProvider initialLocale=…>` from `@twt/i18n/react` (⛔ a mocked `useT` — a stable stub hides F13a; an
  echo-`t` renders key names and cannot test words).
- Mocks: the tamagui primitives this screen uses (`YStack`, `Paragraph`, `Button`, `Spinner`, …) FORWARD `testID` → `data-testid` (the
  precedent's `({ children }) => div` drops it); `react-native` includes `Linking: { openURL: vi.fn() }`; `lib/member-api` exposes
  `memberAuth.{ getWaOptInStatus, requestWaOptIn, revokeWaOptIn }`; `lib/mmkv` mocked.
- The screen loads in `useEffect` ⇒ `await screen.findByTestId(…)`; then `getWaOptInStatus` has been called EXACTLY ONCE (RED at the pin).
- ACTIVE with a `windowExpiresAt` in the PAST ⇒ `wa-opt-in-active` + `wa-opt-in-revoke`; pressing it calls `revokeWaOptIn` once.
- EXPIRED_24H_WINDOW ⇒ `wa-opt-in-retry` + `wa-opt-in-enable` (`wa-opt-in-enable` alone also matches the off branch — F13) and the
  `unconfirmed_*` words; `container.textContent` ⛔ matches `/expir|समाप्त/i` — in en AND in hi.
- BLOCKED_BY_META ⇒ `wa-opt-in-retry` + the `blocked_*` words; REVOKED / null ⇒ `wa-opt-in-off`; `available: false` ⇒
  `wa-opt-in-unavailable`.

**2026-10-21 review clarification (F2/F3):** `available:false` shows the unavailable explanation while retaining withdrawal
for ACTIVE; it only suppresses enable controls for other states. "Loads once" means one initial fetch, not a ban on focus/
foreground refresh or PENDING polling after the external WhatsApp interaction. These corrections realize condition 2/I4.

**AC8 — The claim half and every other surface are untouched (I5).** 6.37d's worker legs (a)/(b) pass UNEDITED. Under LY8 (a) the
claim-isolation legs that use a NON-consent code (`wa-webhook-processor.test.ts:358` R4, `:374-382` I7, `:391-397` WS11 (2) — 131026 /
131049) would pass VACUOUSLY (those codes no longer end a member yes) ⇒ RE-CODED to `131050` (and their `failure_code` asserts `:360`,
`:380`) with a dated comment, so they still prove
isolation; the member-only control `:384-389` (131026 ⇒ BLOCKED_BY_META) would turn RED ⇒ flips to 131050, with a companion 131026 ⇒ ACTIVE leg (AC3).
Under LY8 (b) all four stay unedited. The other claim-status / hash-fallback legs pass UNEDITED; leg (c) is re-titled and re-asserted under AC4 (b)/(c) (a dated comment — ⛔ deleted; as seeded it has ⛔ consent ⇒ AC4 (c)'s
no-op; AC4 (b)'s shape needs its own consent seed). `claim_contact_wa_stops` is written ⛔ by the member half. `WA_BLOCK_ERROR_CODES` and
`isBlock` are byte-unchanged (they gate the claim hash fallback — F12); ⛔ line above `:460` in the status loop or above `:334` in the
message loop changes except dated comments. 6.37d's AC11 PINS change ONLY for `wa-opt-in/read.ts` and `wa-opt-in/write.ts` (new SHAs, a dated comment naming
Story 5.12); `dispatch.ts`, `cascade.ts`, `provider-composition.ts`, `contribution-notify.ts`, `peer-mesh-wa-reminder.ts` and the rest keep
their pins. 6.31's source fence (F18) passes unedited. `git diff ec6d826e -- packages/channels apps/jobs/src/scheduler` is EMPTY.

**AC9 — The sweep is tested (closes the 5.5 item's WA half only — F4).** `runWaOptInExpirySweep` legs: a stale PENDING expires with one
audit line; a fresh PENDING is left; an ACTIVE past window is left (and writes ⛔ audit); a per-row fault is isolated (the next row still
expires). The table is SHARED and un-ordered (F4 — ≥ 60 stale PENDINGs already on :5433 and growing, `LIMIT 200`): seed the test's stale rows with
`created_at = now() - interval '10 years'`, the "fresh" one at `now() - interval '8 years'`, and pass `pendingTtlSeconds: 9 * 365 * 86400`
in the sweep's DEPS (`:185`, read at `:531` — ⛔ a call argument), so ONLY the seeded rows are candidates and "fresh is left" discriminates;
the per-row fault is a committed test trigger calling a non-temp function, scoped `WHEN (OLD.opt_in_id = '<uuid>')`, both dropped in
`finally` (AC4's recipe). `apps/jobs` runs
files serially (`fileParallelism: false`).

**AC10 — Order (I6).** On the branch the read / sweep / edge / migration commit (Task 5) comes AFTER the commits for Tasks 1–4; the
Completion Notes list the commit order.

**AC11 — Records (LY12).** The author-commit decision committed ALONE before any record or code; the epics.md entry, the LY11 roster row,
the ADR-0029 / §3.4 dated notes and the deferred-work dated notes / new items (LY8, LY13, F13a) committed next; at Task 7 each item's
status is written at EVERY site that cites it (footgun #14 — grep each item's verbatim TITLE AND its key phrases — `5-12`, `24 hours`,
`newest consent`, `WR15`, `F14`, `hash fallback`, `stale-PENDING` — because most sites cite by PARAPHRASE; Task 7.1 lists the sites known at
validate), with the status word its instrument supports ([[feedback_closure_language_precision]]): the two `-364` items *"Closed
by 5.12"*; the 5.5 item *"WA half closed by 5.12 (AC9); Telegram half OPEN"*; the two LY8 items per the option chosen; Row 35 (g)'s dated
note reads BOTH this row's `done` and the LY11 row. ⛔ Decision text is edited anywhere.

**AC12 — The merge gate.** `DATABASE_URL='postgresql://twt_dev_app:devpass@127.0.0.1:5433/twt_dev?sslmode=disable' pnpm ci:local` green
(incl. `integration-tests`, `i18n-parity`, `microcopy`, `friction-budget`, `contracts-determinism`) at the final commit — ⛔ `env -u
DATABASE_URL` around the run (F21: it SKIPS `integration-tests`; the script strips it from the unit job itself). Push with `DATABASE_URL`
set to :5433 explicitly ([[project_prepush_hook_inherits_5432]]).

## Tasks / Subtasks

- [x] **Task 0 — Preflight, decisions, governance (AC11)**
  - [x] 0.1 `git fetch origin`; re-run the baseline diff (header); re-derive F1–F25 (re-grep each symbol). **STOP** and tell BigDev if:
    **S1** any production database or real member data exists (LY9 (a), LY13 and F15 rest on "not in production"); **S2** a branch or
    worktree other than this one edits `wa-webhook-processor.ts`, `wa-opt-in/`, `consent/write.ts`, `notifications.tsx` or
    `emit-openapi.ts`'s wa-opt-in block (`git branch -a`, `git worktree list`, ListAgents — [[feedback_shared_tree_branch_switch]]);
    **S3** a new decision after `-372` touches WhatsApp opt-in; **S4** Meta's policy now sets an opt-in duration; **S5** a mobile-change
    writer now exists (F10b — LY13 (a)'s premise).
  - [x] 0.2 Put LY1–LY13 to BigDev (recommended first, each with its cost) and PQ1 (LY6 cost (1)) / PQ2 (LY13); record the answers
    verbatim.
  - [x] 0.3 Write the author-commit decision (next free id; `governance:` prefix; "supersedes ⛔ thing; realises `-364` Consequence 1;
    decides `-364` reading (iv) at LY9"; records LY6 cost (1), LY13's residuals, the alarm's owner and the PQ1 / PQ2 answers); stage in the scratchpad, try the
    insert ([[project_decision_log_writes_user_inserted]]); commit it ALONE; write its SHA only AFTER the commit.
  - [x] 0.4 Records commit: the epics.md `### Story 5.12` entry (Epic 5, after 5.9 — 6.31's post-hoc format *"> **Added 2026-10-…
    (Story 5.12, Task 0.4)** —"*; Epic 5 has TWO count lines, the summary's *"**9 stories**"* and the checklist's *"Epic 5 — 9 stories"* —
    bump both, or leave both per Epic 6's precedent, and say which); the LY11 roster row; ADR-0029 changelog row *"(ratified —
    annotated)"* + a dated note on §3.4; deferred-work: the LY8 dated notes and the new items (LY13 (1)/(2) if (a); the Telegram screen's
    re-fetch loop — F13a — trigger: the next edit of `telegram-notifications.tsx`); if PQ1 / PQ2 = "tell", the told item(s) WRITTEN from the
    template; the ledger.
- [x] **Task 1 — The domain: end every yes (AC3; LY5, LY6)**
  - [x] 1.1 `consent/write.ts`: `revokeOpenConsentsOfType` (set-based; returns the count; ⛔ throw on 0) + unit/integration legs.
  - [x] 1.2 `wa-opt-in/write.ts`: `endEveryWaYes` (in the caller's tx; ⛔ opens a tx — Story 5.4's accessor rule; selects `state = 'ACTIVE'`
    directly, ⛔ via `isOptInActive`); `wa-opt-in/read.ts`: `listMemberIdsByOptInMobile` (bounded with `clampLimit` —
    [[project_domain_limit_clamp_and_savepoint_retry]]), a `hasAnythingToEnd` helper (a `state = 'ACTIVE'` row OR an open consent — ⛔
    `isOptInActive`, which is window-aware until Task 5) and a state-only `hasActiveOptIn` for the mint guard. Export through the `waOptIn`
    barrel (`export *`).
  - [x] 1.3 Integration legs on :5433: AC3's legacy seed by INSERT (⛔ UPDATE — the trigger lands in Task 5 and would refuse it); the
    double-operation leg (F25).
- [x] **Task 2 — The worker (AC3, AC4, AC8; LY6, LY8)**
  - [x] 2.1 The member STOP half → LY6: per-member try + per-member `deps.db.transaction`; audit first; compensating `_rolled_back` on
    failure (the P1 pattern in `revokeActiveOptIn`); one retry; then `wa_opt_in.stop_unrecorded` via `deps.onAlarm` (ids only). The claim
    half and its position are ⛔ touched. The optional punctuation strip if chosen.
  - [x] 2.2 `revokeActiveOptIn` → calls `endEveryWaYes`; the block path → `'BLOCKED_BY_META'`, gated per LY8 (option (a): the new
    member-only `isMemberConsentBlock` at `:460`; `WA_BLOCK_ERROR_CODES` / `isBlock` byte-unchanged). Date the RE-EXAMINE comment `:438-443`
    and the header comment `:265-270` (*"Row 5-12 (`-364`) will widen the MEMBER half below"* — now done).
  - [x] 2.3 Legs: AC4 (a)–(h); AC3's STOP and block legs (incl. the three non-consent codes); 6.37d leg (c) re-titled (dated comment);
    under LY8 (a) the claim-isolation legs `wa-webhook-processor.test.ts:358`, `:374-382`, `:391-397` RE-CODED to 131050 (and their
    `failure_code` asserts `:360`, `:380`) and the member
    control `:384-389` flipped (+ a 131026 ⇒ ACTIVE companion), each with a dated comment (AC8).
- [x] **Task 3 — The API (AC3, AC5; LY4 mint guard, LY7)**
  - [x] 3.1 DELETE and admin opt-out → `hasAnythingToEnd` / `endEveryWaYes` inside `withCompensatingAudit` (the access-wrapper gate scans
    this module — F25); response per LY7; the lost-race arm (LY5) ⇒ 409.
  - [x] 3.2 Mint: KEEP the newest-row check; ALSO refuse when `hasActiveOptIn` (any `state = 'ACTIVE'` row).
  - [x] 3.3 `emit-openapi.ts` wa-opt-in descriptions (F23) → `pnpm contracts:emit-openapi`; commit `openapi/v1.yaml`.
  - [x] 3.4 Legs: AC5; AC3's DELETE and admin legs; RE-TITLE `wa-opt-in.spec.ts:132` / `admin-opt-out.spec.ts:194` (they stay green — F18).
- [x] **Task 4 — The app (AC6, AC7; LY10; F13a)**
  - [x] 4.1 `common.json` (en, hi): delete `expired_*`, add `unconfirmed_*`, change `active_desc` (and `blocked_*` under LY8 (a)) — hand-edit, ⛔ prettier --write
    ([[project_prettier_not_enforced]]).
  - [x] 4.2 `notifications.tsx`: EXPIRED_24H_WINDOW renders `unconfirmed_*`; FIX the re-fetch loop (T10 — depend on `locale` from
    `useLocale()`, ⛔ `t`); header comment `:1-14` updated; the ACTIVE branch already renders the control — ⛔ condition on
    `windowExpiresAt`.
  - [x] 4.3 `apps/mobile/tests/unit/wa-notifications-copy-keys.test.ts` (AC6) and `wa-notifications-screen-render.test.ts` (AC7).
  - [x] 4.4 friction-budget (F22): append a `**Story 5.12 disposition (no new row — the WhatsApp opt-in screen's words and its
    always-present withdraw control)**` paragraph to `friction-budget.md` above `## How to declare` — the payer (the member), what it
    protects (`-364` conditions 1–2), that 5.4's row stands; commit it with Task 4 (a gate input — ⛔ a docs-only commit) and run
    `pnpm friction:check`.
- [x] **Task 5 — The read change, LAST (AC1, AC2, AC9, AC10; LY1–LY4)**
  - [x] 5.1 `isOptInActive` → LY1; `resolveWaTarget` call + `void at;` + docs (`delivery.ts:108-115`, `:127`); `composition.ts:56`;
    `isPeerMeshWaReminderOptedIn` doc only (`read.ts:169-171`).
  - [x] 5.2 The sweep → LY3; `revokeOptIn` edges (`:225-226`) + doc (`:216-222`); delete `listExpiredWindowOptIns`; `expiredWindow` at its
    three sites. Stale comments: worker header `:1-11` (incl. `:7-8` *"A STOP from a member with no ACTIVE opt-in is a no-op"*), `:45-46`,
    `:113-114`, `:524-528`; `read.ts:67-70` (`getActiveOptInByMobile`'s *"⇒ a STOP is a no-op"*); `handlers.ts:6-7`, `:204`, `:256-261`;
    `apps/jobs/src/boot.ts:464-467`; `packages/queue/src/index.ts:101`. ⛔ edit `0042_member-wa-opt-in.sql` (applied).
  - [x] 5.3 Migration `NNNN_member-wa-opt-in-lasting-yes.sql` + journal entry (`when` = previous + 86400001 — F19) (LY4); `db:migrate` on
    :5433, then `psql -f` twice (AC2); ⚠ a dev DB that fails (ii) is a FINDING — report it.
  - [x] 5.4 LY2 comments: `schema/member_wa_opt_in.ts` (`:4`, `:6-7`, `:34`, `:37`, `:78` + a comment naming the SQL-only index — T7),
    `schema/index.ts:158-159`, `activateOptIn`, contracts `WaOptInStatusResponse` JSDoc (`opt-in.ts:50-56` — ⛔ emitted); run `vitest` in
    `packages/contracts` (T11).
  - [x] 5.5 Legs: AC1, AC2, AC9; flip `peer-mesh-wa-reminder-opted-in.spec.ts:61-68`, re-seed its `:70-79` EXPIRED case by INSERT;
    `wa-opt-in.spec.ts:185-209` + header `:9`; `apps/api/tests/unit/wa-target.test.ts:6` header.
- [x] **Task 6 — Fences (AC8)**
  - [x] 6.1 Update 6.37d's AC11 PINS for `read.ts` / `write.ts` ONLY, with a dated comment (*"2026-10-xx Story 5.12 — `-364`; the rest
    of the fence stands"*). Re-run the fence; every other pin must still match.
  - [x] 6.2 Confirm AC8's empty diff for `packages/channels` and `apps/jobs/src/scheduler`, and that `WA_BLOCK_ERROR_CODES` / `isBlock` are
    byte-unchanged.
- [x] **Task 7 — Close the records and the gate (AC11, AC12)**
  - [x] 7.1 Statuses at EVERY site (grep each verbatim title across `_bmad-output`, `docs`, story files and code comments; the sites known
    at validate):
    - the two `-364` items → *"Closed by 5.12"*: deferred-work; Story 6.31 F14, WR15 (4) + its dated P28 note, T2; the 5-12 sprint-row
      comment; code `read.ts:169-171`, `peer-mesh-wa-reminder-opted-in.spec.ts:6` (fixed in Task 5).
    - the 5.5 item → *"WA half closed by 5.12 (AC9); Telegram half OPEN"*: deferred-work; `5-5-telegram-mirror-fire-and-forget.md`'s
      Review/Defer line.
    - `WA_BLOCK_ERROR_CODES` item (per LY8): deferred-work; 6.37d F10, T22; 6.31 WR15 (2); worker `:438-443`.
    - WS11 item (per LY8): deferred-work; 6.37d P17; ADR-0029's 2026-10-20 changelog row; worker `:438-443`.
    - Row 35 (g)'s dated note — reads BOTH this row `done` on `main` AND the LY11 row (*"⚠ the 5.12 Hindi is reviewed only when roster
      row `wa-opt-in-lasting-yes-hindi-reviewed` closes"*); dated notes on Stories 6.31 (AC4 / F14) and 6.37d (AC7 (c), T22);
      `docs/governance/decision-flow-end-to-end.md` (the 6.31 node *"reaches almost nobody until row `5-12` builds…"*, the `-364` node, the
      sprint-row line).
  - [x] 7.2 AC12's `ci:local` command on :5433; record the job count and the commit.
  - [x] 7.3 Story Status → `review`; sprint row → `review`; ledger.

### Review Findings

Full `bmad-code-review` on 2026-10-21: baseline `ec6d826e` → `b6d54a1d`, 44 files, three independent layers
(Blind Hunter, Edge Case Hunter, Acceptance Auditor). Triage: **0 decision-needed, 5 patch, 1 defer, 4 dismissed**.
These are engineering and factual-record corrections; the Panel-routing template §0 does not require a new ruling.
BigDev chose **1 — apply every patch**. All five patches are CLOSED; `ci:local` passed all 36 jobs and the final mobile gate passed.
The findings below preserve the initial evidence; their implementation dispositions follow the list.

- [x] [Review][Patch] **F1 — P1: Serialize activation and withdrawal, including the withdrawal snapshot.**
  [`packages/domain/src/wa-opt-in/write.ts:285`; `apps/api/src/modules/wa-opt-in/handlers.ts:61`;
  `apps/jobs/src/wa-webhook-processor.ts:560`] — AC3/I2 and invariant families 2, 6, 8.
  Confirmed with two live database connections and the real domain functions: seed a legacy EXPIRED/open consent plus a
  PENDING request; pause withdrawal after its ACTIVE UPDATE returns zero rows; activate the PENDING and commit; resume the
  consent UPDATE. Withdrawal returns `{ movedOptInId: null, consentsRevoked: 2 }`, but the committed ACTIVE row survives:
  `isOptInActive=true`, `isPeerMeshWaReminderOptedIn=false`. Ordinary `resolveWaTarget` can therefore still authorize WhatsApp
  after withdrawal. Neither serial ordering produces this split state. Protect the entire per-member operation with
  serialization shared with activation, and plan the audit/response under that protection. The unprotected planning reads
  also permit activation between the first ACTIVE read and the later snapshot, producing an ACTIVE response/audit after
  the actual row was revoked. Add true two-connection regression coverage; the trigger-skipped UPDATE tests only exercise
  the zero-result branch. Reproduction script: `/private/tmp/twt-5-12-race-repro.ts` (temporary review evidence, not a repo artifact).
- [x] [Review][Patch] **F2 — P1: Keep withdrawal available when Pariwar sending is disabled.**
  [`apps/mobile/app/(settings)/notifications.tsx:143`; `apps/mobile/tests/unit/wa-notifications-screen-render.test.ts:144`] —
  ratified condition 2, I4, AC7. GET can legitimately return ACTIVE with `available:false`, because availability comes from
  the Pariwar configuration independently of consent. `OptInBody` returns the unavailable branch before the ACTIVE branch,
  hiding withdrawal; the new test explicitly expects that absence. The standing yes can resume sending when the administrator
  re-enables WhatsApp. Preserve the unavailable explanation while allowing an ACTIVE member to withdraw, and correct the
  contradictory test. This existing branch is a patch finding because this story expressly undertakes the unconditional
  withdrawal requirement.
- [x] [Review][Patch] **F3 — P2: Refresh a pending confirmation after returning from WhatsApp.**
  [`apps/mobile/app/(settings)/notifications.tsx:51`] — condition 2/I4 and AC7.
  Stabilizing `load` fixes the fetch loop but leaves only mount/action-triggered refreshes. `Linking.openURL` resolves on
  opening WhatsApp, before the phrase is sent or the asynchronous webhook runs; `onReopen` never reloads. A mounted screen
  can remain PENDING indefinitely after the server becomes ACTIVE, so withdrawal never appears. Refresh on foreground/focus
  and handle the delayed webhook while PENDING, with cleanup; retain a single initial fetch and no render-driven loop.
- [x] [Review][Patch] **F4 — P2: Make the first-member fault-isolation proof deterministic.**
  [`apps/jobs/tests/wa-opt-in-lasting-yes.test.ts:315`] — AC4(d).
  Lookup orders members by UUID, but this test generates two random UUIDs and always faults `m1`. In roughly half of runs
  the successful `m2` is processed first, so aborting after a fault could pass the advertised proof. Sort the IDs before
  choosing the faulted member, or seed ordered IDs, and prove the second member is processed after the first fails twice.
- [x] [Review][Patch] **F5 — P2: Correct the prepared disclosure's retry claim.**
  [`_bmad-output/planning-artifacts/trustee-panel-told-2026-10-21-5-12-whatsapp-yes-residuals.md:20`] — AC11/LY12,
  invariant family 10. The note uses the phone-number protection service failing as its example, then says the system
  tries once more. A pre-loop member HMAC/listing failure instead reaches the per-message catch and alarms immediately;
  only failures inside the per-member withdrawal receive a retry (AC4(h) proves this distinction). Correct the factual
  description before sending; preserve WRITTEN versus TOLD. No decision text or consent policy needs changing.
- [x] [Review][Defer] **D1 — P2: A failed Meta 131050 withdrawal is consumed without retry or an identifying alarm.**
  [`apps/jobs/src/wa-webhook-processor.ts:506`] — deferred, pre-existing. The status branch catches a failed audit/database
  withdrawal and logs it; the event is consumed by the at-most-once drain. This failure policy predates 5.12, whereas STOP
  now has explicit retry/alarm handling. With the expiry removed, a lost 131050 can leave the yes standing indefinitely.
  Re-trigger: the next change to member status-callback failure handling or WhatsApp alarm wiring; add a fault-injected
  131050 leg and recover or alarm without changing claim-send ownership. Recorded in `deferred-work.md`.

**Patch dispositions:** F1 — a per-Pariwar/member transaction advisory lock serializes minting, activation and withdrawal;
API and worker withdrawal snapshots are read under that same lock, before their separately committed audit intent and
state/consent writes. The worker locks before granting consent too. The transaction can open before the audit, but no
state/consent mutation precedes its committed intent. Four new live domain legs prove both activation/withdrawal orderings,
one winner plus one no-op for concurrent withdrawals, and full rollback on a second-write FK failure. A live API leg proves
DELETE waits before planning, returns REVOKED and hashes ACTIVE → REVOKED after a competing activation. F2 — ACTIVE
withdrawal renders before the availability guard, with the unavailable explanation when sending is disabled. F3 — one
initial focus fetch, foreground/focus refresh and five-second PENDING-only foreground polling; background refresh keeps
controls visible, overlapping background fetches coalesce, and a post-mutation fetch waits for any older read before
fetching fresh state. Listeners/timers are cleaned up. Five new mobile render legs cover the availability case, delayed
webhook after returning from WhatsApp, external STOP, withdrawal during an older read, and unmount cleanup. F4 — sort the UUIDs
before choosing the member whose writes fault. F5 — the prepared disclosure distinguishes per-member retry from immediate
alarms on pre-resolution failures; its WRITTEN status is unchanged. D1 remains deferred and unchanged.

**Initial review verification:** 141 targeted tests passed (domain 47, jobs 69, API 15, mobile 10), with integration suites using the live
:5433 database. The initial sandboxed domain run could not connect (`EPERM`); the approved rerun passed. The separate
two-connection reproduction above confirmed F1. The `packages/channels` / `apps/jobs/src/scheduler` scope-fence diff remains
empty. This review did not rerun the complete `ci:local` gate; the implementation's recorded gate remains its own evidence.

**Final patch verification (2026-10-21):** `DATABASE_URL` explicitly set to :5433, `pnpm ci:local` PASSED —
**36 jobs green**, including live integrations (domain 6027 passed / 1 skipped, API withdrawal and worker regressions green).
The unit phase preceded F3's last mobile-only follow-up (waiting for an older read before refreshing after withdrawal),
so the complete mobile gate was rerun afterward: `env -u DATABASE_URL pnpm exec turbo run lint typecheck test build
--filter=@twt/mobile --concurrency=2` — **22 tasks successful**, mobile **1096/1096 tests** across 74 files. The database URL
was stripped only for this separate hermetic mobile command; the full `ci:local` integration phase used :5433. Backend code
was unchanged during its full integration run. Logs: `/private/tmp/twt-5-12-review-ci.log` and
`/private/tmp/twt-5-12-final-mobile.log`. Final domain test-file lint/typecheck and `git diff --check` also passed.

**Review closure:** *(Superseded by the second review below, 2026-10-21 — its fourteen patches reopened the story's action items.)* F1–F5 fixed; zero remaining patch/decision action items. D1 remains deferred, as selected. The initial
invariant gaps in families 1/2/6/8/10 below are CLOSED by the domain concurrency/rollback, API snapshot and mobile render
regressions and the corrected disclosure. Native screen-reader validation remains unattested; the go-live Hindi/alarm
roster gates and the told item's WRITTEN status remain separate from story completion. Changes are local and uncommitted.
*(True when written; committed afterwards in `5022a43c`, unpushed — second review P13 (a), 2026-10-21.)*

**Invariant lens:** family 1 — DB transitions covered by direct tests; reachable UI gap F2/F3. Family 2 — REAL GAP F1;
sequential idempotency tests pass. Families 3/12 — tenant/member filters and existing route authorization retained, with
isolation/denial tests. Family 5 — direct SQL trigger/index tests pass; no RLS/FK definitions changed. Family 6 — explicit
response/ID projections retained, but concurrent withdrawal snapshots are part of F1. Family 7 — DISTINCT member lookup
and direct updated-row counts. Family 8 — audit attribution/compensation tests pass; concurrency caveat F1. Family 9 —
existing DELIBERATE bypass and re-examination note retained. Family 10 — REAL GAP F5; other closure caveats remain explicit.
Family 13 — real button handlers and text retained; native screen-reader behavior remains unattested by the jsdom harness.
Untouched families 4 and 11 were skipped.

**Dismissed (4):** an unwired future async alarm adapter; hypothetical failure of the future configured alarm sink
(the current sink is the documented log default); more than 50 members sharing a number (not constructible through the
current identity/mint paths, and the spec explicitly requires a bounded read); a standalone atomicity-test complaint
(the actual mutations share one transaction by construction; concurrency coverage is addressed in F1).

#### Second review — 2026-10-21 (`bmad-code-review 5.12`, BigDev: "B, go ahead in parallel")

Full re-review of `ec6d826e` → `5022a43c` (45 files, the first review's F1–F5 fixes included), three independent layers in
parallel (Blind Hunter on the code-only diff; Edge Case Hunter with project read access; Acceptance Auditor against this spec,
`-364`, `-373` and the load-bearing-invariant checklist). Triage: **0 decision-needed, 14 patch, 4 defer, 12 dismissed**.
§0 gate: every item is an engineering, test or record correction — none changes what was decided or what a person is owed;
P10 corrects an unsent told item (WRITTEN, ⛔ TOLD), and P6 adds what a screen-reader user hears of a state the screen already shows. The
Auditor found every AC realised in code; the scope fence (`packages/channels`, `apps/jobs/src/scheduler`) is EMPTY and
`WA_BLOCK_ERROR_CODES` / `isBlock` / `isStopKeyword` are byte-identical; F1–F5 are built as their dispositions say.
Three of the patches (P1, P2, P3) are regressions introduced by the F1 / F3 fixes.

- [x] [Review][Patch] **P1 (Medium) — The F3 single-flight `load` can hang forever.** A GET that never settles (the api-client
  transport has no timeout) leaves `fetching.current` set: background callers re-join it, foreground callers spin on
  `while (fetching.current) await fetching.current`, so after a successful DELETE `await load()` never returns — `busy` stays
  true, every control is disabled and the pre-withdrawal ACTIVE body stays until unmount; a hung first load spins forever.
  Bound each fetch (race a timeout / abort) and never let a foreground load wait unboundedly on a background read.
  [`apps/mobile/app/(settings)/notifications.tsx:42`] (blind+edge)
- [x] [Review][Patch] **P2 (Medium) — The worker's withdrawal needs two connections at once on a 2-connection pool.**
  `endMemberWaYes` writes its audit line on `deps.pool` while its own `deps.db.transaction` (holding the member lock) holds
  a connection; the jobs pool is `createDb(…, { max: 2 })`, shared with the data-export / report-export builds, the vacuum and
  the GC crons. Before 5.12 the audit wrote BEFORE the transaction (one connection at a time); the F1 fix moved it under the
  lock. With the second connection held elsewhere for > 10 s both STOP attempts fail back-to-back ⇒ `stop_unrecorded` and a
  lost STOP (at-most-once drain); a 131050 is consumed silently (D1); the member lock is held meanwhile, stalling that
  member's API DELETE / mint. Give the opt-in audit a connection budget the transaction cannot starve (its own small pool, or
  a pool sized for tx + audit with a comment) and prove it with a leg. PLAUSIBLE (environment-dependent).
  [`apps/jobs/src/wa-webhook-processor.ts:564`; `apps/jobs/src/boot.ts:313`] (blind+edge)
- [x] [Review][Patch] **P3 (Low–Medium) — A background refresh wipes an action's error line.** Every `load(true)` (the 5 s
  PENDING poll, focus, foreground) calls `setError(false)`: a failed `onReopen` (no app handles wa.me) is cleared within 5 s; a
  failed `onRevoke` / `onEnable` on the next focus or foreground — the member never learns the withdrawal failed. Background
  loads clear only a load-originated error. [`apps/mobile/app/(settings)/notifications.tsx:50`] (blind+edge)
- [x] [Review][Patch] **P4 (Low) — A 409 on withdraw leaves a stale ACTIVE screen.** The yes ended elsewhere (trustee
  opt-out, 131050, STOP from another device) while the screen stayed focused (no poll in ACTIVE); `onRevoke` reloads only on
  success, so every tap 409s against the same ACTIVE body. Reload after a failed revoke.
  [`apps/mobile/app/(settings)/notifications.tsx:120`] (edge)
- [x] [Review][Patch] **P5 (Low) — The PENDING poll and the AppState listener are not gated on focus.** A mounted-but-blurred
  screen polls GET every 5 s for up to the 48 h PENDING TTL (each a scope transaction; a 401 / 429 flashes the error line).
  Gate both on focus; the test mock `useFocusEffect: cb => useEffect(cb, [cb])` has no blur, so the suite cannot see this —
  give the mock a blur and add legs for P1 / P3 / P5. [`apps/mobile/app/(settings)/notifications.tsx:70`;
  `apps/mobile/tests/unit/wa-notifications-screen-render.test.ts`] (blind+edge)
- [x] [Review][Patch] **P6 (Medium — family 13 (d) REAL GAP) — State changes made by polling / foreground refresh are not
  announced.** PENDING → ACTIVE (the withdraw control appears) and ACTIVE → off (an external STOP) replace the body silently:
  no live region, no `AccessibilityInfo.announceForAccessibility`; only the error line is `role="alert"`. Condition 2 / I4
  reaches a screen-reader user only through the visual tree. [`apps/mobile/app/(settings)/notifications.tsx:76`] (edge+auditor)
- [x] [Review][Patch] **P7 (Low — family 1 / 10) — The schema comment claims more than the trigger enforces.** "Terminal states
  never move": the 0177 trigger refuses only a move INTO `EXPIRED_24H_WINDOW` from a non-PENDING state — REVOKED → ACTIVE,
  BLOCKED_BY_META → REVOKED, ACTIVE → PENDING all pass the DB (only code from-state predicates guard them). Reword the TS
  comment; the migration header says the same but 0177 is APPLIED — ⛔ edit it, record the correction instead.
  [`packages/domain/src/schema/member_wa_opt_in.ts:28`; `packages/domain/migrations/0177_member-wa-opt-in-lasting-yes.sql:4`] (blind+edge)
- [x] [Review][Patch] **P8 (Low) — The lost-race comments describe a race the F1 lock rules out.** "another withdrawal or a STOP
  ended it between the plan and here" — every withdrawal now holds `lockMemberWaYes` from snapshot to write, so the `{ null, 0 }`
  branch is reachable only by an unlocked writer (the tests reach it by an injected trigger). Keep the guard; say what it guards.
  [`apps/api/src/modules/wa-opt-in/handlers.ts:77`; `apps/jobs/src/wa-webhook-processor.ts:548`] (blind)
- [x] [Review][Patch] **P9 (Low) — AC3's admin leg neither opts in through the real path nor asserts the three reads.** It seeds
  ACTIVE + consent by raw INSERT (`seedActiveOptIn`) and checks `revoked_audit_id` only; AC3 asks for the real opt-in path and
  `consentExists` / `isPeerMeshWaReminderOptedIn` / `isOptInActive` all false (the DELETE, STOP and 131050 legs do).
  [`apps/api/tests/integration/wa-opt-in/admin-opt-out.spec.ts:231`] (auditor)
- [x] [Review][Patch] **P10 (Low) — The told item contradicts itself.** "Replying STOP from that number always ends it" follows
  limit 1, "A STOP can very rarely be lost". WRITTEN, ⛔ TOLD — correct before BigDev sends it.
  [`_bmad-output/planning-artifacts/trustee-panel-told-2026-10-21-5-12-whatsapp-yes-residuals.md:34`] (auditor)
- [x] [Review][Patch] **P11 (Low — family 10) — "Closed by 5.12" for the first `-364` item is wider than its evidence.** The
  item's own phrase "an expired one cannot be withdrawn" is still true IN THE APP: a legacy EXPIRED row with an open consent
  renders only `wa-opt-in-enable` (LY7's admitted cost; `-373` decision 7; the population is empty in production). The note
  should say the API ends it and the app offers no control for that population. [`_bmad-output/implementation-artifacts/deferred-work.md:148`] (auditor)
- [x] [Review][Patch] **P12 (Low) — An undated comment rewrite beside the frozen set.** The comment above `WA_BLOCK_ERROR_CODES`
  was rewritten without a date and 5.4's sentence "Conservative: only an explicit opt-out/undeliverable-by-user-choice code
  drives BLOCKED_BY_META (a transient failure must NOT revoke)" deleted. Restore it and date the 5.12 addition (T1 / AC8).
  [`apps/jobs/src/wa-webhook-processor.ts:130`] (auditor)
- [x] [Review][Patch] **P13 (Low — family 10) — Record hygiene.** (a) "Changes are local and uncommitted" / "not committed or
  pushed" / v1.6 "uncommitted" (this file `:793`, `:957`, `:1046`; `sprint-status.yaml:1`, `:20299`) — `5022a43c` commits them;
  the branch is unpushed. (b) The newest ledger entry is `2026-10-21` without its same-day suffix (`2026-10-21c`). (c) The File
  List omits `.decision-log.md`, `epics.md` and the told item. (d) The v1.6 Change Log row sits outside its table (blank line
  `:1045`). (e) Task 7.1's third `decision-flow-end-to-end.md` site (the sprint-row line) is undated (gitignored — local only).
  (auditor)
- [ ] [Review][Patch] **P14 (Low) — AC12's gate has not run at the final commit.** The 36/36 `ci:local` ran on the uncommitted
  tree before F3's last mobile follow-up (disclosed). Re-run `ci:local` on :5433 at the commit that carries P1–P13. (auditor)
- [x] [Review][Defer] **W1 — An ambiguous COMMIT failure is compensated as a rollback.** COMMIT reaches the server, the client
  sees a reset ⇒ a `_rolled_back` line for a transition that happened; the STOP retry then finds nothing to end. The same class
  as `withCompensatingAudit` everywhere. [`apps/jobs/src/wa-webhook-processor.ts:588`] — deferred, pre-existing (blind+edge)
- [x] [Review][Defer] **W2 — The stale-PENDING sweep does not take the member lock.** A re-tap near the 48 h TTL returns the
  outstanding PENDING's deep link; the sweep then expires it and the member's phrase matches nothing. [`apps/jobs/src/wa-webhook-processor.ts:663`]
  — deferred, pre-existing (edge)
- [x] [Review][Defer] **W3 — The worker's under-lock snapshot has no live race leg; `revokeOptIn` can still move ACTIVE
  unlocked.** Only the API has a two-connection F1 leg; a STOP / 131050 racing activation is covered by construction. The
  exported `waOptIn.revokeOptIn(…, 'REVOKED' | 'BLOCKED_BY_META')` moves ACTIVE without the lock or the consents — no source
  caller today. [`packages/domain/src/wa-opt-in/write.ts:249`] — deferred, by construction today (auditor)
- [x] [Review][Defer] **W4 — Deploy order: 0177 ahead of the old jobs build floods the audit chain.** The pre-5.12 sweep
  re-lists every past-window ACTIVE each minute; the trigger refuses each ⇒ a primary + `_rolled_back` line per row (≈ 400 a
  minute at the 200 cap) until the new build lands. Not in production; matters at the first deploy carrying 0177.
  [`packages/domain/migrations/0177_member-wa-opt-in-lasting-yes.sql:19`] — deferred, deploy-time (edge)

**Dismissed (12):** a PENDING not cancelled by a withdrawal (a PENDING is not a yes; the member's own later phrase is a fresh
yes); 131050 ends only the recipient's ACTIVE row (LY8 (a) as decided; a legacy EXPIRED yes is not sent to — `-373` decision
7); the lock "outside a transaction" (every call site is inside one — traced); a 200 `REVOKED` with no row (LY7; unreachable);
> 50 members on a number (first review); STOP ends an earlier holder's yes (LY6 / LY13, told item); `isMemberStopKeyword`
locale / copy (mirrors the byte-frozen `isStopKeyword`); tests on shared live tables (integration concurrency = 1; green
gate); `void at` (6.37d pin); a repeated ACTIVE read (trivial); the non-CONCURRENT 0177 index (not in production; dev DBs
audited — LY4); dated notes still reading "`review` at this note" (true on their dates — supersede, never re-date).

**Invariant lens (second review):** families 1, 5 covered by test (trigger / unique legs) with P7 a comment over-claim;
family 2 covered by test for domain and API, by construction for the worker (W3), REAL GAP P2 (connection budget); families
3, 6, 7, 8, 12 covered by test / construction; family 9 covered (DELIBERATE note kept); family 10 REAL GAPS P10, P11, P13;
family 11 covered (§Policy meaning); family 13 (c) covered, (a)/(b) not constructible here, (d) REAL GAP P6. Family 4 untouched.

**Patch dispositions (BigDev: "1" — apply every patch):**
- **P1** — every status read AND both mutations race `CALL_TIMEOUT_MS` (15 s) via `withTimeout`; a timed-out call's late
  answer never reaches state. A hung read no longer freezes withdrawal; a hung first read ends in the error line; a hung
  withdrawal shows the error, re-reads and re-enables the controls.
- **P2** — `boot.ts` gives the processor its OWN `createDb(…, { max: 2 })` pool (ended on SIGTERM and on a startup failure); the
  worker states `localConcurrency: 1`. A live leg proves the need (one connection held elsewhere on a 2-pool ⇒
  `stop_unrecorded`; a free 2-pool ⇒ the STOP ends the yes); source pins hold the boot wiring and the concurrency.
- **P3** — errors carry their source (`load` / `action`); a background read clears only its own kind, and an action's error
  is superseded only when a later read changes what the screen shows.
- **P4** — a failed enable / withdrawal re-reads in a `refresh` mode (no spinner, but it waits out an older read and fetches
  fresh). A 409 "already off" now shows off without the error — cleared in the SAME update as the new status (the first
  version cleared it in a later effect, and the P4 leg caught the in-between frame under `ci:local`'s load at `b64dd462`).
- **P5** — polling and the AppState listener run only while focused; the test mock gained a blur (it matches expo-router's
  `useFocusEffect` contract).
- **P6** — a later change is announced (`AccessibilityInfo.announceForAccessibility`) in the screen's existing words — on /
  waiting / turned off by WhatsApp / not on — and only while the screen is focused and the app in front; the first read is not.
  ⛔ new copy keys. Native screen-reader behaviour remains unattested (jsdom).
- **P7** — the schema comment names the three code from-state guards; 0177 (applied) is left as written, the correction recorded.
- **P8** — the lost-race comments say the guard is reachable only past an unlocked writer.
- **P9** — the admin AC3 leg opts in through the domain write functions (`createPendingOptIn` → `recordConsent` +
  `activateOptIn`) and asserts the three reads.
- **P10** — the told item says STOP ends a yes "with the one limit below" / "apart from the rare lost STOP"; still WRITTEN, ⛔ TOLD.
- **P11** — deferred-work: closed for the API and STOP; in the app **not addressed — an accepted cost** (LY7, `-373` decision 7).
- **P12** — 5.4's "Conservative…" sentence restored verbatim; the 5.12 addition dated.
- **P13** — "uncommitted" claims annotated *true when written; committed in `5022a43c`* (⛔ rewritten); ledger head re-keyed
  `2026-10-21c`; File List completed; the v1.6 row rejoined its table; the decision-flow sprint-row site dated (gitignored).
  The first review's closure paragraph is marked superseded by this one.

**Fix-diff review (2026-10-21, one fresh-context reviewer of the patch diff — [[feedback_review_the_fix_diff_before_commit]]):**
0 H / 2 M / 11 L, all applied before commit — P6 announced "off" with `enable_hint` (no state words) and was silent across
availability, and announced while the app was behind WhatsApp; P1 left both mutations unbounded; a failed action's re-read
joined an older read (now `refresh`); an action error outlived a read showing the goal reached; a failed first read rendered
"not available for your Pariwar"; P2's leg could not see the boot wiring (pins added; `localConcurrency: 1`); P7 omitted
`revokeOptIn`; P9's helper name over-claimed; the told item's opening line still read "STOP always works"; P11's status word;
P13 (a) half applied; the §0 sentence wider than its items; the decision-flow note named a status the row did not have.
Mobile: 11 new legs — 10 RED against `5022a43c`'s screen (the eleventh, "⛔ announced while the app is behind", is a negative
control: that screen announced nothing), and the six follow-up legs RED against the first-pass fix.

## Dev Notes

### ⚠ TRAPS

- **T1 — The claim half comes first and stays self-contained.** 6.37d T22: *"Keep the claim branch BEFORE and independent of the member
  lookup; … ⛔ hard-code today's EXPIRED behaviour as a requirement."* Edit only below `const blindIndex = …` (`:334`) in the message loop,
  and only from `if (isBlock && status.recipient_id && !claimOwned)` (`:460`) in the status loop — where LY8 (a) swaps `isBlock` for the
  new member-only predicate IN THAT LINE. ⛔ edit `WA_BLOCK_ERROR_CODES` (`:115`) or `isBlock` (`:427-428`): the claim half's hash
  fallback (`:451-458`) reads them (F12). Comments above those lines may be dated.
- **T2 — `revokeConsent` throws on an already-revoked row.** Never loop it over a member's rows (a concurrent STOP + DELETE would throw
  one path). Use LY5's set-based function; `WHERE revoked_at IS NULL` makes the race benign.
- **T3 — The red fence is deliberate.** 6.37d's AC11 will fail the moment `read.ts` / `write.ts` change. Update ONLY those two pins,
  with a dated comment; a third pin changing means scope crept.
- **T4 — `getOptInForMember` reads the NEWEST row; `isOptInActive` reads ANY ACTIVE row (and, until Task 5, only within its window).**
  LY4's unique index is what makes newest-vs-any agree; the mint guard, `hasAnythingToEnd` and `endEveryWaYes` read `state = 'ACTIVE'`
  DIRECTLY — ⛔ through `isOptInActive`, or every Task 1–3 leg seeding a past-window ACTIVE row is RED until Task 5 and "nothing to end"
  is mis-read in between.
- **T5 — The enum value cannot be dropped or renamed** (F6). ⛔ `ALTER TYPE … RENAME VALUE` either — the contracts lockstep and the
  screen's comparison `state === 'EXPIRED_24H_WINDOW'` (`notifications.tsx:162`) carry the literal (its `OptInState` type is derived).
- **T6 — ⛔ Inferred re-consent.** LY9 (a) restores nothing; ⛔ code path moves a terminal row back to ACTIVE (ADR-0029, unchanged).
- **T7 — Migrations.** Hand-authored; journal `when` = previous + 86400001; idempotent (shown by `psql -f` twice — F19); ⛔ regenerate
  an applied one ([[project_live_db_test_gotchas]]). The unique index and the trigger are SQL-only (like 0044) — add a comment in the
  Drizzle schema naming both.
- **T8 — Same-transaction `now()`, and the legacy seed is an INSERT.** Legs that seed a legacy yes then re-opt-in in one BEGIN/ROLLBACK
  see one `now()` ([[project_db_clock_ordering_tests_tie]]) — seed `granted_at` / `matched_at` / `created_at` explicitly. ⛔ create a
  legacy EXPIRED row by UPDATE-ing an ACTIVE one, ⛔ disable the trigger: INSERT it directly (the jobs fixture
  `wa-webhook-processor.test.ts:197-205` already does).
- **T9 — The JSDoc trap.** Bold markdown like `**cl.3**` inside a `/** */` can close it ([[project_markdown_emphasis_closes_jsdoc]]) —
  grep after editing doc comments.
- **T10 — The screen ALREADY depends on `t` and loops (F13a).** `load`'s deps `[t]` (`:45`) + `useEffect([load])` (`:47-49`) re-fetch on
  EVERY render because `useT()` returns a fresh closure ([[project_uset_fresh_closure_memo_trap]]). Task 4.2 fixes it: take `locale`
  from `useLocale()` and depend on `[locale]` (call `t` inside without listing it, or read it through a ref) — ⛔ `[t]`, ⛔ `[]` with a
  stale `t`. AC7's "called ONCE" leg, under a REAL `LocaleProvider`, is RED at the pin.
- **T11 — Contracts tests are outside tsc** ([[project_contracts_tests_outside_tsc]]) — run `vitest` in `packages/contracts` after the
  doc change.
- **T12 — One transaction around a loop is one failure for all.** LY6's per-member isolation needs a transaction PER member (`deps.db`
  is pool-bound — each `transaction` takes its own connection); a `try` inside one shared transaction does ⛔ isolate (25P02).
- **T13 — `onAlarm` takes a STRING** (`wa-webhook-processor.ts:190`; the claim half's call `:325`). The `wa_opt_in.stop_unrecorded`
  message carries the alarm name and ids only — ⛔ the number, ⛔ the phrase, ⛔ a name (I7).

### Reuse map

| Need | Use | ⛔ Rebuild |
|---|---|---|
| audit-first + compensation | `auditOptInTransition` / `writeCompensatingOptInAudit` (worker), `audit.withCompensatingAudit` + `optInAuditIntent` (API member DELETE — a closure inside `createWaOptInHandlers`, `handlers.ts:59-85`) / the inline `auditIntent` (admin, `handlers.ts:283-297`) | a new audit helper |
| forced test failure | `pg_temp` function + `CREATE TRIGGER … RAISE EXCEPTION 'forced'` (`packages/domain/tests/integration/claim/approval-warnings.spec.ts:355-356`) | a mock of the domain call |
| ids-only alarm | the claim half's `deps.onAlarm` call (`wa-webhook-processor.ts:320-332`) | a new alarm channel |
| five-field hash | `waOptIn.waOptInAuditPayloadHash` | — |
| blind index | `memberMobileBlindIndex` (worker) — byte-identical to the API's (5.4 review) | a third copy |
| consent read | `consent.consentExists` | — |
| limits | `clampLimit` | — |
| render test scaffold | `apps/mobile/tests/unit/workplace-screen-render.test.ts` — EXTENDED per AC7 (testID-forwarding mocks, `Paragraph`, `Linking`, a real `LocaleProvider`) | — |
| copy-key test | `apps/mobile/tests/unit/known-people-copy-keys.test.ts` — its SHAPE, with AC6's camelCase regex and flat `common` keys | — |

### Testing standards

Domain / jobs / API integration on :5433 with `DATABASE_URL` set explicitly; `ci:local` with `DATABASE_URL` set to :5433 too (AC12 —
the script strips it from the unit job itself, AI-10-5; ⛔ `env -u` around the whole run, which SKIPS `integration-tests` — F21;
[[project_ci_local_double_run_pollution]]); a `deadlock detected` in domain is lock order, ⛔ a flake
([[project_fk_truncate_cascade_deadlock]]). Mobile: vitest, `// @vitest-environment jsdom` per file, mock `lib/mmkv` and `lib/member-api`,
RTL `cleanup` in `afterEach`. Every new leg must be RED against the pre-change code (state it in the Debug Log for AC1 / AC3 / AC4 /
AC7's once-only fetch).

### Project structure notes

All edits sit in existing modules: `packages/domain/src/{wa-opt-in,consent,notifications,schema}`, `apps/jobs/src/wa-webhook-processor.ts`
(+ comments in `apps/jobs/src/boot.ts`, `packages/queue/src/index.ts`), `apps/api/src/modules/{wa-opt-in,channel-config}`,
`apps/mobile/app/(settings)/notifications.tsx`, `packages/i18n/locales/{en,hi}/common.json`, `packages/contracts/src/wa-opt-in`,
`packages/contracts/scripts/emit-openapi.ts` + `openapi/v1.yaml`, `packages/domain/migrations`, `friction-budget.md`. ⛔ New package
([[feedback_no_premature_package]]). ⛔ edits in `packages/channels` or `apps/jobs/src/scheduler` (AC8).

### Sequencing

- 6.37d is on `main` — this story is the "later widening" its WS1 planned for; ⛔ rebase owed.
- Row 5-10 (signup box) and row 5-11 (SMS fallback) are `backlog` and read whatever this story leaves; 5-10's box reaches members for as
  long as their yes stands once this ships.
- Roster Row 35 (g) waits on this row `done` (and on 6-36d); the LY11 row is a separate go-live leg.

### Previous story intelligence (5.4, 6.31, 6.37d)

- 5.4: audit-before-write needs a `*_rolled_back` compensation (P1); map every new domain error in `error-mapping` or it is a 500; NFKC for
  STOP; `windowExpiresAt` from DB `now()`; `.transaction()` on a client-bound Db commits the caller's tx early — use SAVEPOINTs for retries.
- 6.31: WR3's composition is the reminder's ONE read — change what it reads, ⛔ how the reminder calls it.
- 6.37d: two reviews found the status branch's ownership checks fragile (R4, P17); stay out of it beyond the member block call (LY8).

### Git intelligence

Last five commits (`ec6d826e` … `d5bb7778`) are 6.37d records / review closes: author-commit decisions committed ALONE, then records,
then code; ledger letters per commit; fences updated with dated comments rather than deleted.

### Latest tech information (fetched 2026-10-20)

Meta *Get opt-in for WhatsApp*: ⛔ duration stated; opt-in must name the business and be clear; businesses must give opt-out instructions
and honour them. No library upgrade is involved (Drizzle, Fastify, Expo, vitest as pinned in the repo).

### References

- `.decision-log.md` — `2026-10-19-364`, `2026-07-08-065`, `2026-10-19-365` WR3, `2026-10-20-367` d1, `2026-10-18-357`
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-17-6-31-how-long-a-whatsapp-yes-lasts.md`
- `docs/adr/ADR-0029-whatsapp-webhook-ingress-and-opt-in-lifecycle.md` (lifecycle; changelog 2026-10-19 rows)
- `_bmad-output/planning-artifacts/architecture.md` §3.4 "Member WA opt-in flow" and its dated notes
- `_bmad-output/implementation-artifacts/5-4-member-wa-opt-in-via-inbound-webhook-matching-webhook-ingress-primitive.md`
- `_bmad-output/implementation-artifacts/6-31-peer-mesh-whatsapp-reminder-at-48-hours.md` (F14, WR3, AC4, T2)
- `_bmad-output/implementation-artifacts/6-37d-claim-contact-whatsapp-step.md` (F9, F10, WS1, AC7, T22)
- `docs/launch-gate-inventory/inventory-roster.md` Rows 28, 32 (h), 35, 36
- `.decision-log.md` `2026-10-20-372` and its told item (the claim STOP's residual — the PQ1 precedent)
- deferred-work (by verbatim title): the two `-364` items; *"`WA_BLOCK_ERROR_CODES` revokes a member's WhatsApp consent on signals that
  are not consent"*; *"WS11's hash fallback can suppress a MEMBER's block"*; 5.5's *"Task 11's "stale-PENDING → EXPIRED" integration
  coverage is checked off but not actually tested."*
- `scripts/ci-local.sh`, `scripts/friction-budget/`, `packages/contracts/scripts/emit-openapi.ts` (F21–F23)

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (`claude-opus-5-5`) — `bmad-dev-story 5.12`, 2026-10-21.

### Debug Log References

- **(a) Task 0 (2026-10-21).** 0.1: `git fetch origin` — `origin/main` = `ec6d826e` (the pin); `git diff --name-only ec6d826e..HEAD --
  packages apps scripts` EMPTY; S1 ⛔ production (nothing is deployed); S2 ⛔ other branch / worktree edits the named files, ListAgents
  empty; S3 ⛔ decision after `-372` except this story's `-373`; S4 Meta's opt-in page (2026-10-20) sets ⛔ duration; S5 ⛔ mobile-change
  writer (`update(memberIdentities)` only in `anonymize.ts:162`). 0.2 — BigDev, verbatim: *"all as recommended"*; on WhatsApp enquiries
  (put after the LYs): *"we will go with option C, but let's postpone that for post go-live."*; on the draft decision: *"confirmed,
  insert and commit"*. 0.3: `-373` committed alone (`97e1e7ad`). 0.4: the records commit — the told item (WRITTEN), roster Row 37,
  the epics.md entry (Epic 5's two "9 stories" lines LEFT, per Epic 6's precedent), ADR-0029 changelog row and §3.4 dated note (both
  "decided, ⛔ yet built"), deferred-work (a new 5.12 section of four items; dated notes on the `WA_BLOCK_ERROR_CODES` and WS11 items),
  the ledger.
- **(b) RED proofs (2026-10-21) — each new leg run against the PRE-change source of its own task, then restored.** Task 1: the nine
  domain legs import functions that did not exist (RED by construction). Task 2: 9 of 14 worker legs RED at `HEAD~` of the worker
  (AC3 STOP / 131050 / non-consent codes; AC4 (b), (d), (f) ×2, (g), (h)); the 4 green there guard existing behaviour (AC4 (a), (c),
  (e), the claim-only STOP). Task 3: all 6 new API legs RED at the pre-change `handlers.ts` (AC3 / AC5 member + admin, the mint guard,
  the lost race). Task 4: 9 of 10 mobile legs RED at the pin's screen + copy — incl. AC7's "loads EXACTLY ONCE" (the `[t]` loop); the
  off / unavailable leg guards existing behaviour. Task 5: AC1 (live any-window ⇒ true; the call shape), peer-mesh's flipped leg, AC2's
  `revokeOptIn` refusal, the tick and the sweep legs RED at the pre-Task-5 sources; the trigger / index legs pass there because 0177
  was already applied to :5433 (they test the DATABASE).
- **(c) Fault injection.** AC4 (d)/(f) and AC9's per-row fault: a COMMITTED test trigger on `member_wa_opt_in` calling a non-temp
  function, `WHEN (OLD.opt_in_id = …)`, its own connection with `lock_timeout = 5s`, a `t512_fault_` prefix sweep in `beforeAll`, dropped
  in `finally`; first-attempt-only = a sequence's first value (`nextval` survives the rollback). The LY5 lost race (worker and API) is a
  BEFORE trigger that RETURNS NULL — the row update is skipped, so `endEveryWaYes` returns `{ null, 0 }` exactly as after a concurrent
  withdrawal. AC4 (h): a `computeHmac` that throws on the SECOND call only.
- **(d) Dev-DB side effect, disclosed (LY4's stated cost).** The Task 5 RED run executed the OLD sweep against the migrated :5433: it hit
  the 0177 trigger on each past-window ACTIVE dev row (63 at the read-only check) and wrote an `expired` + `_rolled_back` audit pair for
  each (test tenants only; dev data). :5432 is ⛔ migrated by this session — the pre-push hook will apply 0177 there
  ([[project_prepush_hook_inherits_5432]]); neither DB held a member with two ACTIVE rows (read-only check before applying).

### Completion Notes List

- **Code review closed 2026-10-21 (Codex; BigDev: "1", apply every patch).** F1–F5 fixed: shared member transaction lock and protected withdrawal snapshots; withdrawal while Pariwar sending is disabled; focus/foreground refresh and pending polling, including a fresh read after withdrawal; deterministic first-member fault coverage; accurate retry disclosure. Four domain race/rollback legs, one API snapshot race leg and five mobile render legs added. `ci:local` :5433 36/36 green; final mobile lint/typecheck/build/test gate 1096/1096. D1 deferred. Status → done; not committed or pushed. *(True when written; committed afterwards in `5022a43c`, unpushed — second review P13 (a).)*
- Story created 2026-10-20 by `bmad-create-story 5-12` (ultimate context engine analysis completed — comprehensive developer guide created).
- **Built 2026-10-21 (`bmad-dev-story 5.12`), every LY as decided by `-373`.** Domain: `consent.revokeOpenConsentsOfType`;
  `waOptIn.endEveryWaYes` + the state reads `getActiveOptInForMember` / `hasActiveOptIn` / `hasAnythingToEnd` /
  `listMemberIdsByOptInMobile`; `isOptInActive` = `state = 'ACTIVE'` (⛔ `at`); the EXPIRED edge PENDING-only;
  `listExpiredWindowOptIns` deleted. Worker: the member STOP (any-state lookup, per-member try + transaction, one retry, then
  `wa_opt_in.stop_unrecorded`; a pre-loop fault alarms from the per-message catch; a lost race compensates, ⛔ alarm); the
  member-only `isMemberStopKeyword` (trailing `[.!।,]`) and `WA_MEMBER_CONSENT_BLOCK_CODES = {131050}`; the sweep's ACTIVE half and
  `expiredWindow` gone. API: 409 only when nothing to end; ONE audit line + `endEveryWaYes`; the lost race ⇒ 409 + `_rolled_back`;
  the mint refuses ANY ACTIVE row. Migration `0177_member-wa-opt-in-lasting-yes` (trigger + one-ACTIVE index). App: `expired_*`
  deleted, `unconfirmed_*` added, `active_desc` / `blocked_*` reworded (Hindi = LY10 DRAFT until Row 37 closes).
- **I6 / AC10 — commit order:** `a0fa5403` Task 1 → `814cfec9` Task 2 → `c25fcbb0` Task 3 → `4719b712` Task 4 → `f9baac1e` Task 5 (the
  read change, LAST) → `70d11eee` Task 6 → `edc4cf2f` Task 7.1 records → the Task 7.3 close. Intermediate commits are ⛔ all green: I
  took I6's first option — 6.37d's AC11 pins on `read.ts` / `write.ts` were RED from `a0fa5403` until `70d11eee` re-took them (every
  other jobs test green throughout — 1329 pass at Task 2).
- **One deviation from T10's wording, same intent:** T10 suggested depending on `[locale]`; instead the screen stores an error FLAG and
  translates at render, so ⛔ callback uses `t` at all (`load` deps `[]` — ⛔ stale `t` possible, nothing to re-fetch on a locale
  change). AC7's "EXACTLY ONCE" leg under a REAL `LocaleProvider` proves it (RED at the pin).
- **Records (AC11).** Status words carry the caveat *"effective when the row is `done` on `main` (the row is `review`)"* — the
  items' own text keeps them OPEN until `done` ([[feedback_closure_language_precision]]). `docs/governance/decision-flow-end-to-end.md`
  got its two dated notes LOCALLY only — `docs/governance/` is gitignored (that map and its published artifact are synced by the
  `decision-flow-sync` skill, ⛔ run here; `-373` is ⛔ yet in it). The told item stays WRITTEN, ⛔ told.
- **AC12 — the gate.** Run 1 (`ci:local`, `DATABASE_URL` = :5433, at `70d11eee`'s code): 36/37 jobs green; `integration-tests` failed
  ONE leg outside this story — `apps/api/tests/integration/channel-webhooks-msg91.spec.ts` AC3's no-leak check asserts `'0.25'` is
  absent from EVERY log line, and that run's pino `responseTime` was `10.2556…` ms (a substring collision — a flaky leg; alone it
  passes 38/38). ⛔ fixed here (out of scope) — a candidate deferred item for BigDev. **Run 2 (same command, tree at `edc4cf2f` —
  code identical to `70d11eee`; later commits are records only): `ci:local PASSED — 36 job(s) green`** incl. `integration-tests`
  (api 1998 pass / 1 skipped; domain, jobs, events, channels green), `i18n-parity`, `microcopy`, `friction-budget`,
  `contracts-determinism`, `db-check`, `domain-invariants`, `access-wrapper-invariants`, `ai-10-5-coverage-guard`.
- ⚠ Not pushed. Push with `DATABASE_URL` set to :5433 explicitly ([[project_prepush_hook_inherits_5432]]) — otherwise the hook applies
  0177 to :5432.

### File List

- `_bmad-output/implementation-artifacts/5-12-whatsapp-yes-lasts-until-withdrawn.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/deferred-work.md`
- `_bmad-output/implementation-artifacts/5-5-telegram-mirror-fire-and-forget.md`
- `_bmad-output/implementation-artifacts/6-31-peer-mesh-whatsapp-reminder-at-48-hours.md`
- `_bmad-output/implementation-artifacts/6-37d-claim-contact-whatsapp-step.md`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/planning-artifacts/epics.md` (### Story 5.12, Task 0.4)
- `_bmad-output/planning-artifacts/trustee-panel-told-2026-10-21-5-12-whatsapp-yes-residuals.md` (new — WRITTEN, ⛔ TOLD)
- `.decision-log.md` (Decision `2026-10-21-373`, its own commit `97e1e7ad`)
- `docs/adr/ADR-0029-whatsapp-webhook-ingress-and-opt-in-lifecycle.md`
- `docs/launch-gate-inventory/inventory-roster.md`
- `docs/governance/decision-flow-end-to-end.md` (gitignored — local only)
- `friction-budget.md`
- `openapi/v1.yaml`
- `apps/api/src/modules/channel-config/composition.ts`
- `apps/api/src/modules/wa-opt-in/handlers.ts`
- `apps/api/tests/integration/wa-opt-in/admin-opt-out.spec.ts`
- `apps/api/tests/integration/wa-opt-in/wa-opt-in.spec.ts`
- `apps/api/tests/unit/wa-target.test.ts`
- `apps/jobs/src/boot.ts`
- `apps/jobs/src/wa-webhook-processor.ts`
- `apps/jobs/tests/claim-contact-ladder-whatsapp.test.ts`
- `apps/jobs/tests/wa-opt-in-lasting-yes.test.ts` (new)
- `apps/jobs/tests/wa-webhook-processor.test.ts`
- `apps/mobile/app/(settings)/notifications.tsx`
- `apps/mobile/tests/unit/wa-notifications-copy-keys.test.ts` (new)
- `apps/mobile/tests/unit/wa-notifications-screen-render.test.ts` (new)
- `packages/contracts/scripts/emit-openapi.ts`
- `packages/contracts/src/wa-opt-in/opt-in.ts`
- `packages/domain/migrations/0177_member-wa-opt-in-lasting-yes.sql` (new)
- `packages/domain/migrations/meta/_journal.json`
- `packages/domain/src/consent/write.ts`
- `packages/domain/src/notifications/delivery.ts`
- `packages/domain/src/schema/index.ts`
- `packages/domain/src/schema/member_wa_opt_in.ts`
- `packages/domain/src/wa-opt-in/read.ts`
- `packages/domain/src/wa-opt-in/write.ts`
- `packages/domain/tests/integration/wa-opt-in/end-every-wa-yes.spec.ts` (new)
- `packages/domain/tests/integration/wa-opt-in/wa-opt-in-concurrency.spec.ts` (new, review F1)
- `packages/domain/tests/integration/wa-opt-in/peer-mesh-wa-reminder-opted-in.spec.ts`
- `packages/domain/tests/integration/wa-opt-in/wa-opt-in.spec.ts`
- `packages/domain/tests/notifications/delivery-targets.test.ts`
- `packages/i18n/locales/en/common.json`
- `packages/i18n/locales/hi/common.json`
- `packages/queue/src/index.ts`

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-10-20 | 1.0 | Created (`bmad-create-story 5-12`), pinned `ec6d826e`; LY1–LY12 PROPOSED for Task 0.2. |
| 2026-10-20 | 1.1 | `bmad-create-story validate 5-12` (four fresh-context verifiers: code claims, governance, design, gates; BigDev: *"all"*). Pin unchanged (`origin/main` = `ec6d826e`). Fixed: AC3 / AC4 (b) legacy seed by INSERT (the LY4 trigger refuses the UPDATE); an unnamed RED leg (`peer-mesh-wa-reminder-opted-in.spec.ts:70-79`) and three F18 legs mislabelled RED; the screen's existing endless re-fetch (F13a, T10 was backwards; AC7 now under a real `LocaleProvider`, one fetch); STOP faults silent under an at-most-once drain (F10a; LY6 retry + `wa_opt_in.stop_unrecorded`, per-member transactions; PQ1); LY8 rewritten (its "can only NARROW" was false against option A; `isBlock` also gates the claim fallback ⇒ a member-only 131050 predicate; WS11 restated as bounded and ⛔ fixable inside AC8's scope); the 5.5 item misquoted and over-closed (WA half only); `ci:local` under `env -u` skips `integration-tests` (F21); the friction-budget disposition unordered (F22, Task 4.4); AC5's OpenAPI claim backwards (F23); a yes bound to a NUMBER / outliving the member (F10b, LY13, PQ2); `_at` fails lint (F24); AC6's regex matched zero keys; §0 gate restated; LY9 (b) is ⛔ the author's; `-364` "Not covered" homed (LY11 (c)); citation fixes (F4, F5, F6, T5, `-367` d1, `-065`, R10(B)). |
| 2026-10-20 | 1.2 | Fresh-context re-validate of v1.1 (2 H / 8 M / 7 L, all in v1.1's own text — applied): Meta's reference (fetched) says 131050 is a MARKETING opt-out, ⛔ a block, and ⛔ code reports a person blocking the business ⇒ LY8 (a) restated as a narrowing, F12's "late BLOCKED_BY_META records a block" struck, `blocked_*` reworded (LY10); under LY8 (a) three 6.37d claim-isolation legs would pass vacuously and one turn RED ⇒ re-coded to 131050 (AC8, Task 2.3); the LY4 trigger refused any update of an EXPIRED row ⇒ `OLD.state IS DISTINCT FROM NEW.state`; LY6 compensation only after a committed audit line, per-attempt primary lines, a lost race returns ⛔ alarm, a pre-loop fault alarms from the per-message catch; the punctuation option made member-only (`isStopKeyword` is the claim half's too); WS11's reason corrected (`dispatch` returns the wamid; recording it is an `apps/jobs/src/scheduler` edit); LY9 (b) MATCHES option A (⛔ a Panel question); AC4 / AC9 fault recipe (committed non-temp function — the worker uses other connections); AC9's TTL is a deps field; AC11 grep by key phrases; LY5 names `ConflictError`; cites `:451-458`, `v1.yaml:10742-10818`. |
| 2026-10-20 | 1.3 | Third fresh-context round of v1.2: 0 H / 4 M / 5 L, applied — LY8 (a)'s WS11 sentence still said `packages/channels`; AC4 (h) re-seamed on the SECOND HMAC (a throwing `enc` also fails the claim stop — two alarms); the per-message-catch alarm used an out-of-scope `body` and the per-member path must ⛔ rethrow; §0 now counts LY8 (a)'s 131050 arm as a narrowing; the committed-trigger recipe follows `cycle-freeze.spec.ts`'s safeguards; re-coded legs' `failure_code` asserts; F14's probe count; full precedent path; I2 / AC3 "Meta block" labels. Rounds: 4 verifiers → HIGH 2 → 0. |
| 2026-10-21 | 1.4 | Task 0 done: BigDev *"all as recommended"* (LY1–LY13, the LY6 punctuation option, PQ1 / PQ2 yes); Decision `2026-10-21-373` (`97e1e7ad`, alone); WhatsApp enquiries → the helpdesk after go-live (`-373` decision 10); the records commit (told item WRITTEN, Row 37, epics.md, ADR-0029 / §3.4 notes, deferred-work). Status → in-progress. |
| 2026-10-21 | 1.5 | `bmad-dev-story 5.12`: Tasks 1–7 built and checked (order per I6: domain → worker → API → app → the read change → fences → records). Migration 0177; 38 new / re-coded legs across domain, jobs, API and mobile, RED-proven per task; `ci:local` (:5433) 36/36 green on the second run (run 1's single failure a flaky substring leg in `channel-webhooks-msg91.spec.ts`, outside this story). Records closed with the "effective when `done` on `main`" caveat. Status → review. |
| 2026-10-21 | 1.6 | `bmad-code-review 5.12`: three layers; 0 decision-needed, 5 patches fixed after BigDev chose "1", 1 pre-existing issue deferred, 4 dismissed. True two-connection serialization and API audit-snapshot proofs, second-write rollback, unavailable/return-from-WhatsApp/in-flight-refresh UI regressions; disclosure retry wording corrected. Full `ci:local` :5433 36/36 green; final mobile gate 1096/1096. Story and sprint row → done. Changes local, uncommitted (true when written; committed afterwards in `5022a43c`, unpushed — second review P13 (a)); go-live gates remain separate. |
