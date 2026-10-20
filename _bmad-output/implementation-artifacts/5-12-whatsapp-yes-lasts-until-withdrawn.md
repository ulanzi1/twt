---
baseline_commit: ec6d826e
---

<!--
PINNED: ec6d826e (`main`, 2026-10-20 — Story 6.37d landed, PR #292 merged). Branch `story/5-12-whatsapp-yes-lasts-until-withdrawn`,
cut from the pin in the main checkout (no peer session was running — ListAgents empty at creation).
Two facts, kept apart (footgun #24): the pin is an ancestor of HEAD (durable); the CODE claims below were derived at ec6d826e
(perishable). Re-check before Task 1: `git fetch origin && git diff --name-only ec6d826e..origin/main -- packages apps scripts docs/adr docs/launch-gate-inventory`.

STATUS: ready-for-dev (created 2026-10-20 via `bmad-create-story 5-12`).

START CONDITION — MET at the pin: row 6-37d is `done` and ON `main` (its worker edit — the claim half of the STOP / block branches —
landed first, as `-367` d1 / 6.37d WS1 (a) ordered: *"5-12 rebases over this story's worker edit"*). Row 6-31 is `done` on `main`.
Nothing else is a precondition.

NUMBERS (footguns #19 / #42(e); `-366` decision 6 — a number belongs to the first COMMIT that takes it, on any branch): at the pin
`main` holds migrations to 0176, decisions to `-372`, roster Rows to 36, ledger `2026-10-20i`. This file names ⛔ number that is not yet
TAKEN: the author-commit is "the next free decision id at Task 0.3", the migration is named by its SLUG `member-wa-opt-in-lasting-yes`,
the roster row (LY11) by its KEY `wa-opt-in-lasting-yes-hindi-reviewed`. Re-grep `main`, every branch and every worktree at each commit.

§0 GATE (`trustee-panel-routing-note-TEMPLATE.md`): the substance is RULED — `2026-10-19-364` (Trustee-ratified, *"by DR and KB / option
A"*): a member's yes lasts until the member takes it back, for every WhatsApp message from the Trust, after four conditions. Every build
decision LY1–LY12 below is the AUTHOR's — stripped of citations each reads "the code should do X", and ⛔ one changes what a member is
owed. The one place a choice could have become the Panel's — what a member told "expired" before the ruling is now told (`-364` reading
(iv): *"it is the author's only if it narrows who is messaged"*) — is LY9; its recommended option NARROWS (author's), and F15 shows the
population is EMPTY in production. Kept OUT, each a Panel question if ever wanted: a proactive message telling members their yes stands
(⛔ sent by anything here); any change to who may opt in or how (§3.4's origination rule — untouched); the claimant's or a nominee's
WhatsApp (`-357` / `-356` — `-364` reading (i)).

GLYPH REGISTER: `⛔` negates the word it precedes — before a word that is ALREADY negative it is emphasis only, ⛔ a double negative;
`⭐` emphasis / action / recommended; `⚠` a hazard. ⛔ No `file:NNN` into `.decision-log.md`, `deferred-work.md` or `sprint-status.yaml`
(newest-first files) — cite the decision id + clause, the item's phrase, or the row key. Line numbers into CODE files are as of the pin;
re-grep the symbol if a line moved.

LETTERS: F = found facts (at the pin) · LY = build decisions (PROPOSED; answered by BigDev at Task 0.2) · I = invariants · T = traps ·
S = Task 0.1 STOP conditions. Decision-entry letters (WR, WS, PM …) keep their own stories' meaning.
-->

# Story 5.12: A Member's WhatsApp "Yes" Lasts Until the Member Takes It Back — the App Stops Saying "Expired", the Withdraw Control Always Shows, STOP Always Works, and a Withdrawal Ends Every Earlier Yes `[SURFACE]`

Status: ready-for-dev

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
| `2026-10-19-364` (option A) | *"A yes lasts until the member takes it back (in the app, or by replying STOP), for every WhatsApp message from the Trust."* Cost accepted with its conditions: *"Before anything is sent on a yes older than a day: the app's "expired" wording must change, its withdraw control must show, STOP must always work, and taking a yes back must end every earlier yes, not only the newest."* | ⭐ TRUSTEE-RATIFIED |
| `-364` "What the ruling therefore requires" 1–4 | (1) *"a member whose yes still stands must ⛔ be told it ended"*; (2) *"The withdraw control shows for every member whose yes stands (today it shows for ACTIVE only)"*; (3) *"STOP always works — today a STOP from a member past the 24 hours is ignored … and the API revoke returns 409"*; (4) *"Taking a yes back ends EVERY earlier yes — today each opt-in records a new `whatsapp_opt_in` consent row, expiry revokes none, and a withdrawal revokes only the current one."* | ⭐ TRUSTEE-RATIFIED (the transcriber's list of what the ruled cost requires) |
| `-364` "Our reading — NOT RATIFIED" (i)–(iv) | (i) member opt-in sends only — ⛔ the claimant (`-357`), ⛔ a nominee (`-356`); (ii) Meta's 24-hour window is a fact about free-form messages, it no longer ends the yes; (iii) until 1–4 ship ⛔ message goes on a yes older than a day; (iv) a pre-ruling "expired" yes counts as standing only once 1–4 ship; *"whether such members are told their yes stands (or asked again) is decided by the build row's create-story — it is the author's only if it narrows who is messaged"* | ⚠ NOT RATIFIED — readings; this story applies (i)–(iii) and decides (iv) at LY9 |
| `-364` Consequence 1 | *"A build row owns conditions 1–4 and the opt-in read change (the expiry no longer ends the yes; `isOptInActive` / the expiry sweep / the `EXPIRED_24H_WINDOW` state)"* | ⭐ (consequence text inside the ratified entry) |
| `2026-07-08-065` ratifying ADR-0029 | the five-state lifecycle, *"the 24h-window expiry"*, *"stale PENDINGs / past-window ACTIVEs → EXPIRED_24H_WINDOW"*, *"The AC6 dual gate reads BOTH (`isOptInActive` AND the admin toggle)"*, *"Re-opt-in after revoke requires a NEW inbound message … — no inferred re-consent"* | ⭐ TRUSTEE-RATIFIED — superseded IN PART by `-364` (the 24-hour life only); the rest STANDS |
| Architecture §3.4 "Member WA opt-in flow" (+ its dated `-364` note) | *"Opt-in withdrawal: member disables from app settings (audit-logged) or sends STOP message"*; origination: *"user-initiated interaction … or an explicit affirmative consent capture in-app … Passive defaults, pre-checked boxes, bundled consent, or inference from other settings are not valid opt-in origins."* | ⭐ TRUSTEE-RATIFIED (via `-065`) — UNCHANGED here |
| `2026-10-18-357` (§3.4 claim-contact exception) | *"The exception does not change any member's opt-in state"*; a claimant's STOP ends WhatsApp for that claim | ⭐ TRUSTEE-RATIFIED — the claim half is ⛔ touched (I5) |
| `2026-10-19-365` WR3 | `isPeerMeshWaReminderOptedIn` = `isOptInActive` AND `consentExists(…, 'whatsapp_opt_in')` (defensive); *"Under `-364` its reach widens when row 5-12 changes the shared read; 6.31 edits ⛔ it."* | author-commit |
| `2026-10-20-367` d1 (6.37d WS1 (a)) | 6.37d goes first; *"its claim branch sits BEFORE the member lookup in both branches and is self-contained, so 5-12's later widening of the member half … cannot change it"*; *"5-12 rebases over this story's worker edit"* | author-commit — MET (6.37d on `main`) |
| Meta, *Get opt-in for WhatsApp* (fetched 2026-10-20) and the Business Messaging Policy (quoted in `-364`) | the opt-in page sets ⛔ duration; *"Provide clear instructions for how people can opt out … honor these requests"*; *"You must respect all requests (either on or off WhatsApp) by a person to block, discontinue, or otherwise opt out"* | provider policy — found, ⛔ counsel's ([[feedback_provider_policy_is_found_not_counsel]]) |
| Roster Row 35 (g) | *"row `5-12-whatsapp-yes-lasts-until-withdrawn` `done` (`-364`'s four conditions — until then the reminder reaches only a yes given in the last 24 hours)"* | go-live gate — ⛔ a merge fence |
| deferred-work (two items homed here by `-364`) | *"A member's WhatsApp opt-in counts for 24 hours only, and an expired one cannot be withdrawn"*; *"Withdrawing a WhatsApp opt-in revokes only the newest consent row, and every re-opt-in mints another"* — each *"stays OPEN until that row is `done`"* | CLOSED by this story (AC11) |

## ⭐ THE INVARIANTS

- **I1 — No yes expires.** ⛔ Code path moves an ACTIVE opt-in to `EXPIRED_24H_WINDOW`, and the database refuses the edge.
  `isOptInActive` is `state = 'ACTIVE'` — ⛔ clock. *Proof:* AC1, AC2 (incl. a raw-SQL leg against the trigger).
- **I2 — A withdrawal ends every yes.** Every withdrawal path (member DELETE, admin opt-out, STOP, Meta block) calls ONE domain function
  that moves the member's ACTIVE row and revokes EVERY open `whatsapp_opt_in` consent row of that member, under ONE audit line whose id is
  on every revoked row. *Proof:* AC3's "opt in, expire, opt in again, withdraw ⇒ ⛔ open consent, ⛔ message" leg, once per path.
- **I3 — STOP always works.** A STOP ends every yes of every member whose opt-in rows carry the sender's number in that Pariwar, whatever
  their newest row's state. Nothing to end ⇒ a no-op. *Proof:* AC4.
- **I4 — The app never says a standing yes ended.** ⛔ `waNotifications` value in either locale says "expired" / समाप्त; the withdraw
  control renders for every ACTIVE response. *Proof:* AC6, AC7.
- **I5 — The claim half is untouched.** 6.37d's claim STOP is still recorded first, in its own try, whether or not the number has a
  member opt-in; a claim send's failed status still ⛔ moves a member opt-in. *Proof:* 6.37d's legs (a)/(b) unchanged and green; leg (c)
  re-asserted under the new member behaviour (AC8).
- **I6 — The four conditions land before the read change (`-364` reading (iii)).** On the branch, the read / sweep change (Task 5) is
  committed AFTER Tasks 1–4; one fast-forward lands them together. *Proof:* `git log --oneline` in Completion Notes.
- **I7 — Ids only.** ⛔ Mobile number, verification phrase or name in a log or alarm. (The audit hash already carries the phrase hashed.)

## 📜 Policy meaning (AI-10-1)

**5.12 introduces ⛔ predicate that gates a member's access to a benefit, and changes ⛔ such predicate.** It changes a DELIVERY
predicate — whether a message the Trust already sends also goes by WhatsApp — and ⛔ thing reads it to decide a payment, a pool, a
claim, a warning or a member state. In the member's terms: *"once you tell the Trust "yes" to WhatsApp, you keep getting its WhatsApp
messages until you say stop — in the app or by replying STOP — and saying stop ends every yes you ever gave."* Checked against the
Niyamavali: compatible — R10(B) makes WhatsApp a *"convenience mirror only"*, so ⛔ official notice or benefit depends on it; ⛔ clause
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
  (`:530-555`): stale PENDING (`listStalePendingOptIns`, `write.ts:279-294`, TTL `DEFAULT_PENDING_TTL_SECONDS = 48 h` `:50`) AND past-window
  ACTIVE (`listExpiredWindowOptIns`, `write.ts:300-306`) → `expireOptIn` (`:558-588`): audit `member.wa_opt_in_expired` (`system_expiry`,
  actor null) FIRST, then `revokeOptIn(…, 'EXPIRED_24H_WINDOW')` — ⛔ consent write (`void auditId` `:573`). The tick returns
  `{ drained, expiredPending, expiredWindow }` (`:593`, refusal shape `:599`). ⚠ The sweep has ⛔ test (deferred-work, Story 5.5 review:
  *"`runWaOptInExpirySweep` is untested … Re-trigger: alongside any future change to the stale-PENDING sweep logic"*) — this story changes it.
- **F5 — Edges.** `revokeOptIn` (`write.ts:216-253`): REVOKED ← ACTIVE; BLOCKED_BY_META ← ACTIVE; EXPIRED_24H_WINDOW ← PENDING **or ACTIVE**
  (`legalFrom` `:221-222`). Terminal states never move again; a new yes is a fresh PENDING (ADR-0029: *"no inferred re-consent"*).
- **F6 — The enum is append-only.** `wa_opt_in_state` (`schema/member_wa_opt_in.ts:43-49`; created `0042_member-wa-opt-in.sql:18`) — the
  schema comment `:31-41` forbids reorder/removal; Postgres cannot drop an enum value. Contracts mirror it in lockstep
  (`packages/contracts/src/wa-opt-in/opt-in.ts:23-29`, enforced by `packages/contracts/tests/wa-opt-in.test.ts:21-31`); `openapi/v1.yaml:2426-2431`.
- **F7 — The table's guards.** `member_wa_opt_in` (0042): ⛔ trigger, ⛔ CHECK; indexes `match_idx (pariwar_id, mobile_blind_index, state)`,
  `member_idx (pariwar_id, member_id)`, partial UNIQUE `pending_phrase_uq` (0042 `:45`) and `pending_member_uq (pariwar_id, member_id) WHERE
  state = 'PENDING'` (`0044`, SQL-only, ⛔ in Drizzle). `twt_app`: SELECT / INSERT / UPDATE; RLS ENABLE + FORCE. ⛔ "one ACTIVE per member"
  guard exists; the API's mint refuses only when the NEWEST row is ACTIVE (`handlers.ts:112-114`).

**Withdrawal and consent**
- **F8 — Every activation mints a consent row; every withdrawal revokes one.** The ONLY `whatsapp_opt_in` writer is the worker's match
  (`:384-400`, fresh `consentId = randomUUID()` `:368`). Revokes all pass the CURRENT row's id: member DELETE (`handlers.ts:234-241`), admin
  (`:299-306`), worker STOP / block via `revokeActiveOptIn` (`:479-522`, consent `:503-510`). `consent.revokeConsent` (`consent/write.ts:134-172`)
  works by id and THROWS `ConsentStateError` on an already-revoked row. `consent_records` has ⛔ unique on (subject, type) by design
  (`schema/consent_records.ts:271`, index `:330`). `consentExists` (`consent/read.ts:36-68`) = ANY open row. The data export
  (`data-export/assemble.ts:450`) lists every row ⇒ an expired yes reads *granted* forever.
- **F9 — The API refuses a non-ACTIVE withdrawal.** Member DELETE: `if (!existing || existing.state !== 'ACTIVE') throw new
  ConflictError(…, 'wa_opt_in.not_active')` (`handlers.ts:216-218`; `existing` = the NEWEST row, `getOptInForMember` `read.ts:96-112`).
  Admin: the same at `:276-278` (route `routes.ts:62-78`, `member.moderate`; ⛔ admin UI calls it — F16). Errors mapped in
  `apps/api/src/middleware/error-mapping/index.ts:598-612`.

**STOP and block (the worker)**
- **F10 — STOP's member half reads ACTIVE only.** `:340-351`: `getActiveOptInByMobile` (`read.ts:72-89` — `state = 'ACTIVE'`, newest by
  `matched_at`) → `if (!active) continue;` ⇒ an EXPIRED / PENDING / REVOKED member's STOP does nothing and writes ⛔ audit. STOP keywords
  `:97` (`stop`, `unsubscribe`, `cancel`, `बंद`, `रोको`, `रोकें`; whole-message after NFKC — `:107-110`). The number resolves through the
  OPT-IN ROW's `mobile_blind_index` (the number that said yes), ⛔ the member's current mobile.
- **F11 — The claim half runs first and is self-contained.** `:314-333` (6.37d WS10): STOP ⇒ `recordClaimContactWaStop` in its own try,
  alarm `contact_ladder.stop_unrecorded` on failure; the header comment `:265-270`: *"Row 5-12 (`-364`) will widen the MEMBER half below;
  this half is its own."* The status branch's claim ownership (`:430-459`) runs before the member block (`:460-471`).
- **F12 — The block codes are not all consent signals.** `WA_BLOCK_ERROR_CODES = {131050, 131049, 131026, 131047}` (`:115`) move an ACTIVE
  opt-in to BLOCKED_BY_META and revoke its consent for ANY wamid. deferred-work: *"`WA_BLOCK_ERROR_CODES` revokes consent on non-consent
  signals"* — trigger *"row 5-12 (which edits the same worker), or the first production WhatsApp send"*; and 6.37d round 2's *"WS11's hash
  fallback can suppress a MEMBER's block"* — trigger *"row `5-12-…` or the `WA_BLOCK_ERROR_CODES` item reworking the member block path"*.

**The app**
- **F13 — The withdraw control is ACTIVE-only and EXPIRED reads "expired".** `notifications.tsx` (186 lines, `useState`/`useEffect`, ⛔
  TanStack): ACTIVE → `active_title` / `active_desc` + `revoke_cta` (`testID="wa-opt-in-revoke"`, `:149-159`) — the ONLY withdraw control;
  `BLOCKED_BY_META || EXPIRED_24H_WINDOW` → `blocked_*` / `expired_*` + `retry_cta` (`wa-opt-in-enable`, `:161-175`); null / REVOKED →
  `enable_hint` + `enable_cta` (`:177-185`). ⛔ Test covers the screen.
- **F14 — The copy.** `packages/i18n/locales/{en,hi}/common.json:329-346`, 18 keys. `expired_title` *"WhatsApp opt-in expired"* /
  *"व्हाट्सएप ऑप्ट-इन समाप्त"*; `expired_desc` *"Your WhatsApp opt-in window closed. Tap below to opt in again."* / *"आपकी व्हाट्सएप ऑप्ट-इन
  अवधि समाप्त हो गई। फिर से चालू करने के लिए नीचे टैप करें।"*; `active_desc` *"You'll receive TWT notifications on WhatsApp."* / *"आपको TWT की
  सूचनाएँ व्हाट्सएप पर मिलेंगी।"*. Gates: i18n parity (`packages/i18n/scripts/check-parity.ts`, `ci-local.sh:66` — `common` is member-facing);
  microcopy (`microcopy.yaml:381-389` scans both `common.json`; `notifications.tsx` is ⛔ in `code_globs`). ⛔ machine "Hindi reviewed"
  marker exists for `common.json`. Copy-key precedent: `apps/mobile/tests/unit/known-people-copy-keys.test.ts` (real `getCatalog` / `t`).

**Fences and tests that encode today's behaviour**
- **F15 — The "told expired" population is empty in production.** Nothing is in production ([[project_not_in_production_merge_is_not_golive]]);
  once this story ships ⛔ ACTIVE row ever expires (I1), so ⛔ member can be told "expired" after it either. Dev / test DBs (:5432, :5433)
  may hold EXPIRED rows that were ACTIVE (`consent_id IS NOT NULL`) with an open consent row.
- **F16 — ⛔ admin surface shows a member's opt-in.** `apps/admin/src` has ⛔ reference to wa-opt-in; only the API route exists.
- **F17 — 6.37d's AC11 PINS the two opt-in files.** `apps/jobs/tests/claim-contact-ladder-whatsapp.test.ts:153-169` SHA-256-pins
  `packages/domain/src/wa-opt-in/read.ts` and `write.ts` (also `contribution-notify.ts`, `peer-mesh-wa-reminder.ts`, `dispatch.ts`,
  `cascade.ts` …); `:92-95` requires `recordClaimContactWaStop(` in the worker. Editing read.ts / write.ts turns it RED BY DESIGN (T3).
- **F18 — Legs that assert 24 hours.** `packages/domain/tests/integration/wa-opt-in/wa-opt-in.spec.ts:169-183` (EXPIRED legal from ACTIVE
  edge set), `:185-209` (*"past window → false"*); `peer-mesh-wa-reminder-opted-in.spec.ts:61-68` (*"ACTIVE past window_expires_at … ⇒
  false"*) and its header `:6`; `apps/jobs/tests/wa-webhook-processor.test.ts:276-283` (6.37d leg (c): *"the member row is as `main` stands
  (row 5-12 will change it …)"*); `apps/api/tests/integration/wa-opt-in/wa-opt-in.spec.ts:132` and `admin-opt-out.spec.ts:194` (409);
  `packages/domain/tests/notifications/delivery-targets.test.ts` (mocks; header `:10` *"in-window"*). 6.31's source fence
  (`apps/jobs/tests/claim-peer-mesh-wa-reminders.test.ts:80-89`) forbids `isOptInActive` in the reminder modules — UNAFFECTED.
- **F19 — Migrations are hand-authored.** `packages/domain/migrations/` (journal `meta/_journal.json`; snapshots stop at 0020 — ⛔
  `drizzle-kit generate`). Highest at the pin: `0176_claim-contact-wa-send-cap.sql`. ⚠ [[project_live_db_test_gotchas]]: never regenerate
  an applied migration; edits reach :5432 AND :5433; [[project_prepush_hook_inherits_5432]].
- **F20 — Meta sets no duration.** Meta's opt-in page (fetched 2026-10-20) states ⛔ expiry; it asks businesses to give opt-out instructions
  and honour them. The 24-hour customer-service window governs FREE-FORM messages only; the Trust sends Meta-approved templates (§3.4
  *"Meta UTILITY templates only"*) — `-364` reading (ii).

## ⚖️ Build decisions LY1–LY12 (PROPOSED — answered by BigDev at Task 0.2; ⭐ = recommended)

Each is the author's (§0). Each carries its cost.

- **LY1 — The read.** ⭐ **(a)** `isOptInActive(db, { pariwarId, memberId })` = `state = 'ACTIVE'`, ⛔ window guard; the `at` parameter is
  REMOVED from `isOptInActive` and `resolveWaTarget` stops passing it. ⚠ `resolveWaTarget`'s OWN trailing `at?: Date` STAYS in its
  signature: its callers pass it — `contribution-notify.ts:172` (a file 6.37d's AC11 PINS, AC8) and the API adapter
  `channel-config/composition.ts:65` (+ `apps/api/tests/unit/wa-target.test.ts:44`); it becomes unused there — rename to `_at` with a
  one-line comment (*"retained for callers; the opt-in has ⛔ clock since 5.12"*), checking the package's `no-unused-vars` args rule passes.
  `isPeerMeshWaReminderOptedIn` keeps its composition (WR3); only its doc comment is corrected. **(b)** keep `at` on `isOptInActive`
  accepted-and-ignored. *Cost (a):* touches `delivery.ts` and the delivery-target mocks, ⛔ `contribution-notify.ts`; (b) leaves a
  parameter that lies.
- **LY2 — `window_expires_at`.** ⭐ **(a)** keep writing it on the match (it is a TRUE fact — when Meta's free-form window closes, reading
  (ii)); ⛔ read it for the yes anywhere; correct its comments (schema, `activateOptIn`, contracts `WaOptInStatusResponse` doc) to say
  "Meta's free-form window end — ⛔ the opt-in's end". **(b)** stop writing it. *Cost (a):* a column nobody gates on; (b) changes
  `activateOptIn`'s signature and loses the fact.
- **LY3 — The sweep.** ⭐ **(a)** delete the ACTIVE half (`listExpiredWindowOptIns`, the `past` loop, `expiredWindow` in both return
  shapes); keep the stale-PENDING half unchanged (a request never confirmed is ⛔ a yes) → `EXPIRED_24H_WINDOW`, whose meaning becomes "a
  request that was never confirmed" (the value stays — F6); `revokeOptIn`'s `legalFrom` for `EXPIRED_24H_WINDOW` becomes `['PENDING']`;
  the doc comments say so. Add the sweep's missing tests (F4 — closes the 5.5 item). **(b)** add a new enum value for "unconfirmed". *Cost
  (a):* a value named for 24 hours now means "unconfirmed after 48 h" — documented in the schema comment; (b) an `ALTER TYPE … ADD VALUE` in
  its own migration, a contracts lockstep change and two values for one meaning.
- **LY4 — Database backstops.** ⭐ **(a)** ONE forward migration, slug `member-wa-opt-in-lasting-yes` (number = next free at its commit):
  (i) a `BEFORE UPDATE` trigger on `member_wa_opt_in` that RAISES when `OLD.state = 'ACTIVE' AND NEW.state = 'EXPIRED_24H_WINDOW'`;
  (ii) a partial UNIQUE index `member_wa_opt_in_active_member_uq (pariwar_id, member_id) WHERE state = 'ACTIVE'` (SQL-only, like 0044's);
  both idempotent (`CREATE OR REPLACE FUNCTION`, `DROP TRIGGER IF EXISTS` / `CREATE TRIGGER`, `CREATE UNIQUE INDEX IF NOT EXISTS`). The
  mint guard (`handlers.ts:112`) also refuses when ANY ACTIVE row exists (`isOptInActive`), ⛔ only the newest. **(b)** code-only. *Cost (a):*
  a migration; (ii) fails to apply if a dev DB already holds two ACTIVE rows for one member (⛔ reachable through the code — F7 — so a
  failure is a finding, ⛔ to be papered over).
- **LY5 — One way to end every yes (condition 4).** ⭐ **(a)** a NEW consent function `revokeOpenConsentsOfType(db, { pariwarId,
  subjectId, consentType, reason, revokedAuditId }) → number` — set-based `UPDATE … WHERE revoked_at IS NULL`, ⛔ throw on zero rows
  (`revokeConsent`'s by-id contract is unchanged); and a NEW opt-in function `endEveryWaYes(tx, { pariwarId, memberId, toState: 'REVOKED' |
  'BLOCKED_BY_META', reason, revokedAuditId }) → { movedOptInId: string | null, consentsRevoked: number }` in `wa-opt-in/write.ts`: moves
  the member's ACTIVE row (≤ 1 — LY4) to `toState` and revokes every open `whatsapp_opt_in` row of the member, in the caller's tx. ALL FOUR
  withdrawal paths call it; `revokeActiveOptIn`'s per-id consent revoke goes. ONE audit line per withdrawal (the existing actions and
  five-field hash), its id on every revoked consent row. **(b)** loop `revokeConsent` per row. *Cost (a):* a new shared consent function
  (Story 2.7's module) — narrow, typed; (b) N reads + a throw on a concurrently revoked row.
- **LY6 — STOP always works (condition 3).** ⭐ **(a)** the member half resolves EVERY member whose opt-in rows (ANY state) carry the
  sender's `mobile_blind_index` in the Pariwar (a NEW read `listMemberIdsByOptInMobile(db, { pariwarId, mobileBlindIndex })`, bounded); for
  each member with something to end (an ACTIVE row OR an open `whatsapp_opt_in` consent row) it writes the audit line and calls
  `endEveryWaYes(…, 'REVOKED')`, each member in its own try (a fault for one never costs another their STOP); nothing to end ⇒ ⛔ write, ⛔
  audit. A PENDING row is LEFT (it is ⛔ a yes; only a later phrase message — itself a new user-initiated yes — can activate it). The claim
  half (F11) is untouched and still runs first. Audit snapshot when ⛔ ACTIVE row moved: `before` = `after` = the member's newest row's state
  (an auditor reads "consent closed, state unchanged"). **(b)** keep ACTIVE-only but also revoke open consent rows of that one member.
  *Cost (a):* a number shared by two members' rows (a reassigned number) ends both members' yes from that number — which is what a STOP
  from that number means; (b) leaves an EXPIRED member's STOP doing nothing to the state they see.
- **LY7 — The API withdrawals.** ⭐ **(a)** member DELETE and admin opt-out: 409 `wa_opt_in.not_active` ONLY when there is nothing to end
  (⛔ ACTIVE row and ⛔ open consent row); otherwise the audit line + `endEveryWaYes(…, 'REVOKED')` → 200 `{ state }` (`REVOKED` when an ACTIVE
  row moved, else the newest row's state — `RevokeWaOptInResponse` unchanged). The 409's message stays. **(b)** always 200 (idempotent).
  *Cost (a):* keeps the existing error contract; (b) changes the OpenAPI responses for ⛔ member-visible gain.
- **LY8 — The Meta block path.** ⭐ **(a)** the codes are UNCHANGED and the block still resolves the recipient's ACTIVE row only
  (`getActiveOptInByMobile` — a block on a number with ⛔ standing yes ends nothing; ⛔ LY6's any-state lookup, which is for a request
  the person made); on a hit it calls `endEveryWaYes(…, 'BLOCKED_BY_META')` (so a block also ends every earlier yes); both deferred items (F12) get a DATED NOTE: the 5-12 trigger FIRED and they stay deferred to *"the first
  production WhatsApp send"* (the items' own other trigger), with the cost restated — under a lasting yes a non-consent code (131026 /
  131049 / 131047) ends a yes the member did not take back, and the app then tells them *"It looks like you blocked messages on
  WhatsApp"*; it can only NARROW who is messaged. **(b)** narrow the set to `131050` now (+ the hash-fallback wamid check). *Cost (a):* a
  known wrong label carried to go-live; (b) widens who is messaged relative to today and grows this story into the status branch 6.37d just
  re-shaped.
- **LY9 — Members told "expired" before the ruling (`-364` reading (iv)).** ⭐ **(a)** ⛔ restoration: production holds ⛔ such member
  (F15); an EXPIRED row that was ACTIVE (dev / test data only) stays EXPIRED and shows the new "not on" copy; its open consent row closes at
  the member's next withdrawal (LY5 / LY6). This NARROWS who is messaged — the author's under (iv). Task 0.1 S1 STOPS if any production data
  exists. **(b)** an audited one-shot reconcile that moves each member's newest EXPIRED-from-ACTIVE row with an open consent back to ACTIVE
  — the ruling's default for (iv), widening to it; ⛔ message tells them. *Cost (a):* a dev member who had said yes must say yes again;
  (b) a new audited transition (`EXPIRED → ACTIVE`, against F5's "terminal") for rows ⛔ real member holds.
- **LY10 — The words (condition 1).** ⭐ **(a)** DELETE `expired_title` / `expired_desc` from both locales (so ⛔ surface can render
  "expired") and ADD `unconfirmed_title` / `unconfirmed_desc` for `EXPIRED_24H_WINDOW`; CHANGE `active_desc` to say how long it lasts and how
  to stop. Proposed (en / hi — the Hindi is a DRAFT for LY11's review):
  - `unconfirmed_title`: *"WhatsApp notifications are not on"* / *"व्हाट्सएप सूचनाएँ चालू नहीं हैं"*
  - `unconfirmed_desc`: *"We did not receive your WhatsApp message, so WhatsApp notifications were not turned on. Tap below to try again."* /
    *"हमें आपका व्हाट्सएप संदेश नहीं मिला, इसलिए व्हाट्सएप सूचनाएँ चालू नहीं हुईं। फिर से प्रयास करने के लिए नीचे टैप करें।"*
  - `active_desc`: *"You'll receive TWT notifications on WhatsApp until you turn them off here or reply STOP on WhatsApp."* /
    *"जब तक आप इन्हें यहाँ बंद नहीं करते या व्हाट्सएप पर STOP नहीं भेजते, आपको TWT की सूचनाएँ व्हाट्सएप पर मिलती रहेंगी।"*
  `blocked_*`, `retry_cta` and the rest are unchanged. **(b)** change the `expired_*` VALUES in place. *Cost (a):* key churn; (b) keeps a key
  named for what the screen must never say. ⚠ The new `active_desc` is app status text, ⛔ the consent wording counsel may yet look at
  (`-364` "still uncertain" (1)).
- **LY11 — The Hindi review.** ⭐ **(a)** a go-live record: a new roster row by KEY `wa-opt-in-lasting-yes-hindi-reviewed` (number = next
  free at Task 0.4) — *"before the first production WhatsApp on a member opt-in, the 5.12 Hindi strings human-reviewed (Row 28's control
  pattern)"*; ⛔ a merge fence. **(b)** a reviewer signs off before `done`. *Cost (a):* "5-12 `done`" ≠ "the Hindi reviewed" — Row 35 (g)
  must read both; (b) blocks the row on a person's diary.
- **LY12 — Records.** ⭐ **(a)** Task 0.3: ONE author-commit decision (next free id) recording LY1–LY12 as answered, committed ALONE before
  any record or code ([[feedback_governance_commits_precede_implementation]]); Task 0.4: the owed `epics.md` 5.12 entry (6.31's post-hoc
  format), the LY11 roster row, a dated note on ADR-0029 (changelog *"(ratified — annotated)"*) and architecture §3.4 (⛔ decision text
  edited), deferred-work dated notes (LY8), the ledger; Task 7: the two `-364` items and the 5.5 sweep-untested item marked *"Closed by
  5.12"*, a dated note on Roster Row 35 (g) (the 5-12 half discharged once `done` on `main`), dated notes on Story 6.31 (AC4's past-window
  leg) and Story 6.37d (AC7 (c)). **(b)** fewer records. *Cost:* paper; the alternative is footgun #14 (an item closed at one site, open at three).

## Acceptance Criteria

**AC1 — The read has ⛔ clock (I1; LY1).** `isOptInActive` returns `true` for an ACTIVE row whatever its `window_expires_at` (past,
future, NULL), and `false` for PENDING, REVOKED, BLOCKED_BY_META, EXPIRED_24H_WINDOW and ⛔ row. `resolveWaTarget` resolves a target for an
ACTIVE member whose window passed a week ago (WA switch on). `isPeerMeshWaReminderOptedIn` is unchanged in composition: ACTIVE past window +
open consent ⇒ `true`; ACTIVE + consent revoked ⇒ `false`. *Legs:* `wa-opt-in.spec.ts` (replacing *"past window → false"*),
`peer-mesh-wa-reminder-opted-in.spec.ts` (`:61-68` flipped, header `:6` corrected), `delivery-targets.test.ts` (mock call shape).

**AC2 — ⛔ Yes expires (I1; LY3, LY4).** A tick leaves an ACTIVE row whose window passed as ACTIVE (and writes ⛔ `member.wa_opt_in_expired`
for it); a PENDING older than the TTL still becomes EXPIRED_24H_WINDOW with its audit line; the tick's result carries ⛔ `expiredWindow`.
`revokeOptIn(…, 'EXPIRED_24H_WINDOW')` on an ACTIVE row throws `WaOptInStateError`. A raw `UPDATE member_wa_opt_in SET state =
'EXPIRED_24H_WINDOW'` on an ACTIVE row is REFUSED by the trigger; a second ACTIVE row for one member is refused (23505,
`member_wa_opt_in_active_member_uq`). The migration applies twice cleanly (idempotent) on :5433.

**AC3 — Every withdrawal ends every yes (condition 4; I2; LY5).** For EACH of the four paths (member DELETE, admin opt-out, STOP, Meta block
code 131050): seed opt in → (legacy) expire via raw SQL with the consent left open → opt in again → withdraw ⇒ ZERO open `whatsapp_opt_in`
consent rows for the member, `consentExists(…, 'whatsapp_opt_in')` false, `isPeerMeshWaReminderOptedIn` false, `isOptInActive` false; ONE
audit line for the withdrawal and its `audit_id` in `revoked_audit_id` of BOTH consent rows; the ACTIVE row is REVOKED (BLOCKED_BY_META for
the block). `revokeOpenConsentsOfType` on a member with ⛔ open row returns 0 and ⛔ throws; it touches ⛔ other consent type and ⛔ other
member.

**AC4 — STOP always works (condition 3; I3; LY6).** STOP from: (a) an ACTIVE member ⇒ REVOKED + every consent closed; (b) a legacy EXPIRED
member with an open consent ⇒ the consent closed, the row's state unchanged, one audit line (`before` = `after` = EXPIRED_24H_WINDOW);
(c) a member whose only row is PENDING, or REVOKED, or ⛔ row ⇒ ⛔ write, ⛔ audit line; (d) a number on two members' rows ⇒ both members'
yes ended, a fault injected for the first still ends the second; (e) a STOP in Hindi (`रोको`) behaves as (a). Every case still records the
claim stop first when the claim branch is open (6.37d legs unchanged).

**AC5 — The API withdrawals (condition 3; LY7).** DELETE `/api/v1/member/wa-opt-in`: ACTIVE ⇒ 200 `{ state: 'REVOKED' }`; newest row
EXPIRED with an open consent ⇒ 200 `{ state: 'EXPIRED_24H_WINDOW' }` and the consent closed; nothing to end ⇒ 409 `wa_opt_in.not_active`.
The admin route the same (with `admin_action` and the admin as actor). POST (mint) with ANY ACTIVE row ⇒ 409 `wa_opt_in.already_active`.
OpenAPI byte-stable except the doc strings LY2 changes (`contracts:check-openapi-determinism`).

**AC6 — The app never says "expired" (condition 1; I4; LY10).** `expired_title` / `expired_desc` are ABSENT from both `common.json`;
`unconfirmed_title` / `unconfirmed_desc` and the new `active_desc` are present in both with the LY10 words (or BigDev's at Task 0.2). A
copy-keys test (the `known-people-copy-keys.test.ts` pattern — the REAL `getCatalog` / `t`, ⛔ a stub — [[feedback_stub_must_call_not_transcribe]])
asserts every `t('waNotifications.…')` literal in `notifications.tsx` resolves in en and hi, and ⛔ `waNotifications.*` value in either
locale matches `/expir/i` or contains `समाप्त`. i18n parity and microcopy gates green.

**AC7 — The withdraw control shows for every standing yes (condition 2; I4).** A jsdom render test of `notifications.tsx` (the
`workplace-screen-render.test.ts` mocking pattern; RTL `cleanup` in `afterEach` — [[project_mobile_vitest_and_expo_install_traps]]):
ACTIVE with a `windowExpiresAt` in the PAST ⇒ `wa-opt-in-active` + `wa-opt-in-revoke`, pressing it calls `revokeWaOptIn`;
EXPIRED_24H_WINDOW ⇒ the `unconfirmed_*` words + `wa-opt-in-enable`, ⛔ "expired" text; BLOCKED_BY_META ⇒ `blocked_*`; REVOKED / null ⇒
`wa-opt-in-off`; `available: false` ⇒ `wa-opt-in-unavailable`.

**AC8 — The claim half and every other surface are untouched (I5).** 6.37d's worker legs (a)/(b) and the claim-status / hash-fallback legs
pass UNEDITED; leg (c) is re-titled and re-asserted under AC4 (b)/(c) (a dated comment — ⛔ deleted). `claim_contact_wa_stops` is written
⛔ by the member half. 6.37d's AC11 PINS change ONLY for `wa-opt-in/read.ts` and `wa-opt-in/write.ts` (new SHAs, a dated comment naming
Story 5.12); `dispatch.ts`, `cascade.ts`, `provider-composition.ts`, `contribution-notify.ts`, `peer-mesh-wa-reminder.ts` and the rest keep
their pins. 6.31's source fence (F18) passes unedited. `git diff ec6d826e -- packages/channels apps/jobs/src/scheduler` is EMPTY.

**AC9 — The sweep is tested (closes the 5.5 item).** `runWaOptInExpirySweep` legs: a stale PENDING expires with one audit line; a fresh
PENDING is left; an ACTIVE past window is left; a per-row fault is isolated (the next row still expires).

**AC10 — Order (I6).** On the branch the read / sweep / edge / migration commit (Task 5) comes AFTER the commits for Tasks 1–4; the
Completion Notes list the commit order.

**AC11 — Records (LY12).** The author-commit decision committed ALONE before any record or code; the epics.md entry, the LY11 roster row,
the ADR-0029 / §3.4 dated notes and the deferred-work dated notes committed next; at Task 7 the two `-364` items and the 5.5 sweep item
marked *"Closed by 5.12"* at EVERY site that cites them (footgun #14 — grep each item's phrase), Row 35 (g)'s dated note, the 6.31 / 6.37d
dated notes. ⛔ Decision text is edited anywhere.

**AC12 — The merge gate.** `pnpm ci:local` green on :5433 (incl. `integration-tests`, `i18n-parity`, `microcopy`, `friction-budget`) at
the final commit; push with `DATABASE_URL` set to :5433 explicitly ([[project_prepush_hook_inherits_5432]]).

## Tasks / Subtasks

- [ ] **Task 0 — Preflight, decisions, governance (AC11)**
  - [ ] 0.1 `git fetch origin`; re-run the baseline diff (header); re-derive F1–F20 (re-grep each symbol). **STOP** and tell BigDev if:
    **S1** any production database or real member data exists (LY9 (a) and F15 rest on "not in production"); **S2** a branch or worktree
    other than this one edits `wa-webhook-processor.ts`, `wa-opt-in/`, `consent/write.ts` or `notifications.tsx` (`git branch -a`,
    `git worktree list`, ListAgents — [[feedback_shared_tree_branch_switch]]); **S3** a new decision after `-372` touches WhatsApp opt-in;
    **S4** Meta's policy now sets an opt-in duration.
  - [ ] 0.2 Put LY1–LY12 to BigDev (recommended first, each with its cost); record the answers verbatim.
  - [ ] 0.3 Write the author-commit decision (next free id; `governance:` prefix; "supersedes ⛔ thing; realises `-364` Consequence 1;
    decides `-364` reading (iv) at LY9"); stage in the scratchpad, try the insert ([[project_decision_log_writes_user_inserted]]);
    commit it ALONE.
  - [ ] 0.4 Records commit: the epics.md `### Story 5.12` entry (Epic 5, after 5.9 — and Epic 5's story count line); the LY11 roster row;
    ADR-0029 changelog row *"(ratified — annotated)"* + a dated note on §3.4; deferred-work dated notes (LY8 — both items); the ledger.
- [ ] **Task 1 — The domain: end every yes (AC3; LY5, LY6)**
  - [ ] 1.1 `consent/write.ts`: `revokeOpenConsentsOfType` (set-based; returns the count; ⛔ throw on 0) + unit/integration legs.
  - [ ] 1.2 `wa-opt-in/write.ts`: `endEveryWaYes` (in the caller's tx; ⛔ opens a tx — Story 5.4's accessor rule); `wa-opt-in/read.ts`:
    `listMemberIdsByOptInMobile` (bounded with `clampLimit` — [[project_domain_limit_clamp_and_savepoint_retry]]) and a
    `hasAnythingToEnd` helper (ACTIVE row OR open consent). Export through the `waOptIn` barrel.
  - [ ] 1.3 Integration legs on :5433 (AC3's seed shape via raw SQL for the legacy expire).
- [ ] **Task 2 — The worker (AC3, AC4, AC8; LY6, LY8)**
  - [ ] 2.1 The member STOP half → LY6 (per-member try; audit first; compensating `_rolled_back` on failure — the P1 pattern in
    `revokeActiveOptIn`). The claim half and its position are ⛔ touched.
  - [ ] 2.2 `revokeActiveOptIn` → calls `endEveryWaYes`; the block path → `'BLOCKED_BY_META'`. Codes unchanged.
  - [ ] 2.3 Legs: AC4 (a)–(e); AC3's STOP and block legs; 6.37d leg (c) re-asserted (dated comment).
- [ ] **Task 3 — The API (AC3, AC5; LY4 mint guard, LY7)**
  - [ ] 3.1 DELETE and admin opt-out → `hasAnythingToEnd` / `endEveryWaYes`; response per LY7.
  - [ ] 3.2 Mint: refuse when ANY ACTIVE row exists.
  - [ ] 3.3 Legs: AC5; AC3's DELETE and admin legs; update `wa-opt-in.spec.ts:132` / `admin-opt-out.spec.ts:194` to the new 409 condition.
- [ ] **Task 4 — The app (AC6, AC7; LY10)**
  - [ ] 4.1 `common.json` (en, hi): delete `expired_*`, add `unconfirmed_*`, change `active_desc` — hand-edit, ⛔ prettier --write
    ([[project_prettier_not_enforced]]).
  - [ ] 4.2 `notifications.tsx`: EXPIRED_24H_WINDOW renders `unconfirmed_*`; header comment `:1-14` updated; the ACTIVE branch already
    renders the control — ⛔ condition on `windowExpiresAt`.
  - [ ] 4.3 `apps/mobile/tests/unit/wa-notifications-copy-keys.test.ts` (AC6) and `wa-notifications-screen-render.test.ts` (AC7).
- [ ] **Task 5 — The read change, LAST (AC1, AC2, AC9, AC10; LY1–LY4)**
  - [ ] 5.1 `isOptInActive` → LY1; `resolveWaTarget` call + doc; `isPeerMeshWaReminderOptedIn` doc only.
  - [ ] 5.2 The sweep → LY3; `revokeOptIn` edges; delete `listExpiredWindowOptIns`; comments (worker header `:1-11`, `:45-46`, `:524-528`).
  - [ ] 5.3 Migration `NNNN_member-wa-opt-in-lasting-yes.sql` + journal entry (LY4); apply on :5433 twice; ⚠ a dev DB that fails (ii)
    is a FINDING — report it.
  - [ ] 5.4 LY2 comments: `schema/member_wa_opt_in.ts`, `activateOptIn`, contracts `WaOptInStatusResponse` (`opt-in.ts:55`); regenerate
    and check OpenAPI determinism.
  - [ ] 5.5 Legs: AC1, AC2, AC9; flip `peer-mesh-wa-reminder-opted-in.spec.ts:61-68`.
- [ ] **Task 6 — Fences (AC8)**
  - [ ] 6.1 Update 6.37d's AC11 PINS for `read.ts` / `write.ts` ONLY, with a dated comment (*"2026-10-xx Story 5.12 — `-364`; the rest
    of the fence stands"*). Re-run the fence; every other pin must still match.
  - [ ] 6.2 Confirm AC8's empty diff for `packages/channels` and `apps/jobs/src/scheduler`.
- [ ] **Task 7 — Close the records and the gate (AC11, AC12)**
  - [ ] 7.1 deferred-work: the two `-364` items and the 5.5 *"`runWaOptInExpirySweep` is untested"* item → *"Closed by 5.12"* at every site
    (grep each phrase across `_bmad-output`, `docs`, story files); Row 35 (g) dated note; dated notes on Stories 6.31 (AC4 / F14) and
    6.37d (AC7 (c), T22).
  - [ ] 7.2 `pnpm ci:local` on :5433; record the job count and the commit.
  - [ ] 7.3 Story Status → `review`; sprint row → `review`; ledger.

## Dev Notes

### ⚠ TRAPS

- **T1 — The claim half comes first and stays self-contained.** 6.37d T22: *"Keep the claim branch BEFORE and independent of the member
  lookup; … ⛔ hard-code today's EXPIRED behaviour as a requirement."* Edit only below `const blindIndex = …` (`:334`) in the message loop,
  and only from `if (isBlock && status.recipient_id && !claimOwned)` (`:460`) in the status loop.
- **T2 — `revokeConsent` throws on an already-revoked row.** Never loop it over a member's rows (a concurrent STOP + DELETE would throw
  one path). Use LY5's set-based function; `WHERE revoked_at IS NULL` makes the race benign.
- **T3 — The red fence is deliberate.** 6.37d's AC11 will fail the moment `read.ts` / `write.ts` change. Update ONLY those two pins,
  with a dated comment; a third pin changing means scope crept.
- **T4 — `getOptInForMember` reads the NEWEST row; `isOptInActive` reads ANY ACTIVE row.** LY4's unique index is what makes them agree;
  keep the mint guard on "any ACTIVE".
- **T5 — The enum value cannot be dropped or renamed** (F6). ⛔ `ALTER TYPE … RENAME VALUE` either — the contracts lockstep and the
  mobile `OptInState` type both carry the literal.
- **T6 — ⛔ Inferred re-consent.** LY9 (a) restores nothing; ⛔ code path moves a terminal row back to ACTIVE (ADR-0029, unchanged).
- **T7 — Migrations.** Hand-authored; journal `when` strictly increasing; idempotent; ⛔ regenerate an applied one
  ([[project_live_db_test_gotchas]]). The unique index is SQL-only (like 0044) — add a comment in the Drizzle schema naming it.
- **T8 — Same-transaction `now()`.** Legs that "expire then re-opt-in" in one BEGIN/ROLLBACK see one `now()`
  ([[project_db_clock_ordering_tests_tie]]) — seed `granted_at` / `created_at` explicitly.
- **T9 — The JSDoc trap.** Bold markdown like `**cl.3**` inside a `/** */` can close it ([[project_markdown_emphasis_closes_jsdoc]]) —
  grep after editing doc comments.
- **T10 — `useT()` returns a fresh closure** ([[project_uset_fresh_closure_memo_trap]]) — ⛔ add `t` to effect deps in the screen.
- **T11 — Contracts tests are outside tsc** ([[project_contracts_tests_outside_tsc]]) — run `vitest` in `packages/contracts` after the
  doc change.

### Reuse map

| Need | Use | ⛔ Rebuild |
|---|---|---|
| audit-first + compensation | `auditOptInTransition` / `writeCompensatingOptInAudit` (worker), `audit.withCompensatingAudit` + `optInAuditIntent` (API) | a new audit helper |
| five-field hash | `waOptIn.waOptInAuditPayloadHash` | — |
| blind index | `memberMobileBlindIndex` (worker) — byte-identical to the API's (5.4 review) | a third copy |
| consent read | `consent.consentExists` | — |
| limits | `clampLimit` | — |
| render test scaffold | `apps/mobile/tests/unit/workplace-screen-render.test.ts` | — |
| copy-key test | `apps/mobile/tests/unit/known-people-copy-keys.test.ts` | — |

### Testing standards

Domain / jobs / API integration on :5433 (`DATABASE_URL` explicit); `env -u DATABASE_URL` for `ci:local`
([[project_ci_local_double_run_pollution]]); a `deadlock detected` in domain is lock order, ⛔ a flake ([[project_fk_truncate_cascade_deadlock]]).
Mobile: vitest, `// @vitest-environment jsdom` per file, mock `lib/mmkv` and `lib/member-api`. Every new leg must be RED against the
pre-change code (state it in the Debug Log for AC3 / AC4 / AC1).

### Project structure notes

All edits sit in existing modules: `packages/domain/src/{wa-opt-in,consent,notifications}`, `apps/jobs/src/wa-webhook-processor.ts`,
`apps/api/src/modules/wa-opt-in`, `apps/mobile/app/(settings)/notifications.tsx`, `packages/i18n/locales/{en,hi}/common.json`,
`packages/contracts/src/wa-opt-in`, `packages/domain/migrations`. ⛔ New package ([[feedback_no_premature_package]]).

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
- `docs/launch-gate-inventory/inventory-roster.md` Rows 28, 35
- deferred-work: the two `-364` items; *"`WA_BLOCK_ERROR_CODES` revokes consent on non-consent signals"*; *"WS11's hash fallback can
  suppress a MEMBER's block"*; 5.5's *"`runWaOptInExpirySweep` is untested"*

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

- Story created 2026-10-20 by `bmad-create-story 5-12` (ultimate context engine analysis completed — comprehensive developer guide created).

### File List

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-10-20 | 1.0 | Created (`bmad-create-story 5-12`), pinned `ec6d826e`; LY1–LY12 PROPOSED for Task 0.2. |
