---
baseline_commit: 20fcb479
---

<!--
PINNED: 20fcb479 (`main` = `origin/main`, 2026-10-21 — Story 5.12 landed: migration 0177, Decision `2026-10-21-373`, its told item TOLD).
Branch `story/5-10-signup-whatsapp-opt-in-checkbox`, cut from the pin in a SEPARATE worktree `.claude/worktrees/5-10` (a peer session,
twt-7d, shares the main checkout — [[feedback_shared_tree_branch_switch]]).
Two facts, kept apart (footgun #24): the pin is an ancestor of HEAD (durable); the CODE claims below were derived at 20fcb479 and
RE-DERIVED by the v1.4 validate at `2f4a4303` (perishable). Re-check before Task 1: `git fetch origin && git diff --name-only 20fcb479..origin/main -- packages apps scripts docs/adr docs/launch-gate-inventory`.
REBASED 2026-10-21 (v1.4) onto `origin/main` `2f4a4303` — a ledger-only commit (`git diff --name-only 20fcb479..2f4a4303` = `sprint-status.yaml`
only) ⇒ the pin stands. `main` took ledger `2026-10-21f` (5.12 LANDED) ⇒ this branch's ledger entries were renumbered `21g` (created) and
`21h` (v1.3 + row 5-13), commit messages included.

STATUS: done (v1.11 — CODE REVIEW CLOSED 2026-10-21: R1–R5 fixed, 18 regression cases added; mobile 1172/1172; ci:local 36/36 on :5433 including integration-tests. Changes local and uncommitted.)

PREVIOUS STATUS: review (v1.10 — DEV DONE 2026-10-21 by `bmad-dev-story 5.10`: decision `-375` `ae4fbaf7`, records `9396deac`, code `d336be8e`; ci:local 36/36 on :5433. Earlier: ready-for-dev, created 2026-10-21 via `bmad-create-story 5.10`; v1.3 — SB12 DECIDED in session; v1.4 — VALIDATED (`bmad-create-story
validate 5.10`, four fresh-context verifiers; BigDev: *"all"*): SB1–SB11 + PQ1 PROPOSED for BigDev at Task 0.2, several REVISED by v1.4 —
the member-facing words (SB5), SB2 option (d), SB3 option (c), SB6's resend, SB9 legs (b)–(d); v1.8 — Task 0.2 DONE: BigDev accepted
EVERY recommendation for SB1–SB11 and PQ1 (Debug Log (a)); PREV = `medical`, NEXT = `'/(signup)/payment'`. Next: Task 0.1 (preflight),
then 0.3 (the author-commit decision, committed alone) and 0.4 (records) before any code).

START CONDITION — MET at the pin: row `5-12-whatsapp-yes-lasts-until-withdrawn` is `done` and ON `main` (a yes now lasts until withdrawn,
so the box reaches members for as long as their yes stands — the row-5-10 ledger annotation: *"This box's reach follows row 5-12; no
Panel ruling is still owed."*). Nothing else is a precondition.

NUMBERS (footguns #19 / #42(e); `-366` decision 6 — a number belongs to the first COMMIT that takes it, on any branch): at the pin `main`
holds migrations to 0177, decisions to `-373`, roster Rows to 37. This file names NO number that is not yet TAKEN: the author-commit is
"the next free decision id at Task 0.3"; the roster row (SB9) is named by its KEY `wa-signup-box-hindi-reviewed`. ⭐ The recommended
design needs NO migration (SB1 (a), SB8 (a)). Re-grep `main`, every branch and every worktree at each commit.

§0 GATE (`trustee-panel-routing-note-TEMPLATE.md`): two RATIFIED texts govern how a WhatsApp yes may be given, and they are NOT the
same width —
  · architecture §3.4 (ratified with ADR-0029 — `-065` item 4 names ADR-0029; §3.4's ratified status rests on `-364`'s framing,
    *"ratified … by `-065` (ADR-0029 and architecture §3.4)"*): *"WA opt-in state may only transition to ACTIVE via a user-initiated
    interaction (the user-sent WhatsApp message above) or an explicit affirmative consent capture in-app (recorded with timestamp + the
    UI context). Passive defaults, pre-checked boxes, bundled consent, or inference from other settings are not valid opt-in origins."*
  · ADR-0029 Rationale (ratified, `-065`): *"User-initiated ONLY (AR-16). A PENDING is minted only by the member tapping the toggle;
    ACTIVE only by a matched inbound WhatsApp message. Re-opt-in after revoke requires a NEW inbound message (a new PENDING + phrase) —
    no inferred re-consent."*
The RECOMMENDED design (SB1 (a)) MATCHES BOTH: the tick is the member tapping to ask (a PENDING), and the member's own WhatsApp message
turns it on — exactly §3.4's onboarding *"Yes" branch* (*"app opens WhatsApp via deeplink … Member must tap send to complete opt-in"*).
Reading: MATCH IN SUBSTANCE, with three differences stated, ⛔ hidden — (1) ADR-0029 says a PENDING is minted *"only by the member
tapping the toggle"*; the signup box is a second place the member taps to ask, read as covering §3.4's own ratified onboarding offer
(the PENDING is still minted only by the member's own tap); (2) §3.4's offer wording (*"Do you have WhatsApp? Get notified on
WhatsApp?"*) and pre-filled message (*"Hello, I would like to get notifications on WhatsApp."*) differ from the box's words and from
the phrase-only message `buildSendHelloDeepLink` already sends (as built by 5.4) — stated, ⛔ changed; (3) §3.4's *"mismatch logged +
surfaced for member confirmation"* (inbound handling) is only HALF built — the worker logs a mismatch and surfaces nothing (F8a) — a
pre-existing gap 5.10 neither causes nor closes; recorded in `deferred-work.md` (the 5.10 validate section); (4) §3.4 places the
offer *"After mobile-OTP verification"*, *"during onboarding"* — SB2 (d) (recommended) puts it at the END of onboarding, still after
OTP and during onboarding; SB2 (a) right after the Terms — stated, ⛔ hidden.
Every recommended SB is therefore the AUTHOR's — stripped of citations each reads "the app should show X / call Y".
⚠ DEPARTURE FROM THE ROW'S FRAMING, stated openly ([[feedback_panel_gate_read_ratified_verbatim]]): the row-5-10 comment framed the box
as *"the §3.4 "explicit affirmative consent capture in-app (recorded with timestamp + the UI context)", so the author's call, ⛔ the
Panel's"*, and owed *"the consent row + `member_wa_opt_in` write"*; `-364` "Not covered" calls it *"the author's, under the unchanged
§3.4 capture rule"*. Read against ADR-0029's ratified *"ACTIVE only by a matched inbound WhatsApp message"*, a box that is ITSELF the
in-app capture route to ACTIVE (SB1 (b)) widens the ADR — so it is NOT the author's, whatever the row assumed. SB1 (a) narrows the
box to the route both texts allow; the owed consent row + `member_wa_opt_in` write is then *"already built by 5.4 (the worker) — no
change by 5.10"*. Two further narrowings of the row comment, stated: its box words *"Send me WhatsApp messages from **the Trust**"*
become *"… from **TWT**"* (SB5 — the legal name is pending, and existing copy names "TWT"); and its *"Counsel's DPDP view on the capture
recorded"* becomes *"recorded, OR its absence accepted as a decision"* (SB9 (b)). The popup also departs from UX spec Pattern 2
(*"Confirmation Modal Discipline"*: *"Only for irreversible actions"*) — SB4. The Task 0.3 decision records each departure and its reason.
Kept OUT, a Panel question if ever wanted (PQ1): a tick that switches WhatsApp ON BY ITSELF (SB1 (b)) — it would act on §3.4's wider
in-app route against ADR-0029's narrower *"ACTIVE only by a matched inbound WhatsApp message"* (the two texts already differ on their
face), which the template puts with the Panel. Also out: any SMS consent (row 5-11 — BigDev: *"WhatsApp box only"*); anything about how long a yes lasts
(`-364`, built by 5.12).

GLYPH REGISTER: `⛔` negates the word it precedes; `⭐` emphasis / action / recommended; `⚠` a hazard. NO `file:NNN` into
`.decision-log.md`, `deferred-work.md` or `sprint-status.yaml` (newest-first files) — cite the decision id + clause, the item's phrase,
or the row key. Line numbers into CODE files are as of the pin; re-grep the symbol if a line moved.

LETTERS: F = found facts (at the pin) · SB = build decisions (PROPOSED; answered by BigDev at Task 0.2) · I = invariants · T = traps ·
S = Task 0.1 STOP conditions · PQ = a question for BigDev at Task 0.2.
-->

# Story 5.10: An Unticked "Send Me WhatsApp Messages" Box at Signup — With One Even-Handed Reminder if the Member Leaves It Unticked `[SURFACE]`

Status: done

> **WHAT THIS STORY IS, IN ONE PARAGRAPH.** Today a new member is offered WhatsApp nowhere in signup. The only way to say yes is a
> low-prominence control — the dimmed *"WhatsApp notifications"* entry at the bottom of the home tab, which opens
> `(settings)/notifications.tsx` (Story 5.4, reworked by 5.12; the app has ⛔ "Settings" screen — F14): it mints a PENDING request,
> opens WhatsApp with a pre-filled message, and the member's sent message turns WhatsApp on. This story adds ONE new signup step — its
> own screen, separate from the Terms (placement SB2: ⭐ just before `payment`, or right after the Terms) — with a box, **unticked**, *"Send me WhatsApp messages from TWT"*. Ticked + Continue does exactly what that
> control does (same API call, same WhatsApp hand-off) and the member carries on with signup. Unticked + Continue shows a reminder
> **once** — TWT can send important notices on WhatsApp when an app notification does not reach the member (F7a) — with two buttons of
> **equal weight**: *go back and tick the box* / *continue without WhatsApp*. A Pariwar with WhatsApp switched off never sees the step.
>
> **Day-one output: none** — every Pariwar's WhatsApp config defaults to NULL (off), so no member sees the step until an admin turns
> WhatsApp on; and nothing is in production ([[project_not_in_production_merge_is_not_golive]]). ⚠ "Turned on" here means `enabled` +
> a display number — ⛔ "fully set up" (F7c); SB9 (c)/(d) carry what must be true before a Pariwar is switched on in production.
>
> **What already ships and this story REUSES (rebuild none of it):**
> - `POST /api/v1/member/wa-opt-in` (`apps/api/src/modules/wa-opt-in/handlers.ts:141-223`) — the mint: config check (409
>   `wa_opt_in.channel_unavailable`), `lockMemberWaYes`, 409 `wa_opt_in.already_active`, PENDING re-use, audit-first
>   `member.wa_opt_in_requested` (`originatingChannel: 'member_app'`), the `wa.me` deep link. Guarded by `requireMemberSession` only.
> - `GET /api/v1/member/wa-opt-in` — the status, incl. `available`.
> - The worker's phrase match (`apps/jobs/src/wa-webhook-processor.ts`, ~404-448) — audit, then in one tx `lockMemberWaYes` +
>   `recordConsent('whatsapp_opt_in', member_self, {source:'meta_webhook_inbound'})` + `activateOptIn`. ⭐ This is where the consent row
>   and the ACTIVE `member_wa_opt_in` row are written — unchanged.
> - `apps/mobile/app/(settings)/notifications.tsx` — the existing opt-in screen (5.12; called "Settings" in this file for short — the
>   member reaches it from the home tab's *"WhatsApp notifications"* entry), and its `CALL_TIMEOUT_MS` (`:53`) + `withTimeout` (`:56-70`).
> - `components/banners/BannerHost.tsx:245-280` — the rendered-overlay popup precedent (⛔ `Alert.alert`). Copy its SHAPE; ⛔ edit or
>   extract from `components/banners/*` — SHA-256-pinned (T10).
> - `components/peer-request/announce.tsx` — `AnnouncedText` / `useAnnounceOnChange`, the house announce wrappers (AC8).
>
> **What it CHANGES:** `apps/mobile/lib/wizard-steps.ts` (a new `whatsapp` step placed per SB2) and the test that pins its order
> (`apps/mobile/tests/unit/workplace.test.ts:41-42`), PREV's next-route literal (`medical.tsx:54` under SB2 (d), `tc.tsx:128` under
> (a)), a NEW `apps/mobile/app/(signup)/whatsapp.tsx`, a NEW `apps/mobile/lib/with-timeout.ts` (SB10), a NEW
> `apps/mobile/components/notifications/OtherPhoneHint.tsx` (SB12), `apps/mobile/app/(settings)/notifications.tsx` (the helper import;
> `OptInBody` gains the number + phrase props and renders the hint in PENDING — SB12), the Settings render + copy-key tests (AC12 legs
> ADDED; `PARAMS` + the hint file in the copy-key scan), en + hi `common.json` (new `waSignup.*` and `waOtherPhone.*` keys), the records.
>
> **What it READS and leaves alone:** everything under `apps/api/src`, `packages/contracts/src`, `packages/domain/src`, `apps/jobs/src`,
> every migration (only a TEST file under `apps/api/tests` changes — AC9), `isOptInActive`,
> `resolveWaTarget`, the payment lock-in gate (`payment.tsx:28`'s `LockInGateStep` — the WhatsApp step is ⛔ a lock-in step).

## Story

As a **new member signing up**,
I want **to be asked, plainly and once, whether I want WhatsApp messages from TWT — with nothing ticked for me, and a fair choice if I
leave it unticked**,
so that **I can switch WhatsApp on in the same sitting I join, or knowingly carry on without it, and change my mind later in Settings or
by replying STOP**.

*(The story statement says "Settings" in the member's sense; the place is the home screen's "WhatsApp notifications" entry — F14.)*

## The rulings and records this story builds on

| Source | Key (verbatim, abridged) | Status |
|---|---|---|
| Architecture §3.4, *Member WA opt-in flow* | *"Members self-declare WhatsApp availability during onboarding: After mobile-OTP verification, member is offered … "Yes" branch: app opens WhatsApp via deeplink … Member must tap send to complete opt-in."* + the origination rule (quoted in the §0 header) | ⭐ TRUSTEE-RATIFIED (with ADR-0029 — per `-364`'s framing; `-065` item 4 names ADR-0029) |
| Architecture §3.4, *Inbound message handling* | *"matches the inbound WA number to member-mobile-on-file (assumption: same number; mismatch logged + surfaced for member confirmation)"* | ⭐ TRUSTEE-RATIFIED (as above) — ⚠ the "surfaced for member confirmation" half is ⛔ BUILT (F8a); pre-existing, recorded in `deferred-work.md` |
| Architecture §3.4, claim-contact exception (`-357`) | *"Outside the member opt-in flow, WhatsApp may carry messages about a claim … to ONE person only: the **claimant**, on the claim's filing agreement … an explicit affirmative capture recorded per claim with timestamp + the UI context, never pre-ticked"* | ⭐ TRUSTEE-RATIFIED (`-357`) — the one ratified WhatsApp contact outside the member opt-in; cited by the row-5-13 routing note, ⛔ used by this story |
| ADR-0029 Rationale | *"ACTIVE only by a matched inbound WhatsApp message"* (quoted in the §0 header) | ⭐ TRUSTEE-RATIFIED (`-065`) |
| `2026-10-19-364` | Option A: *"A yes lasts until the member takes it back (in the app, or by replying STOP), for every WhatsApp message from the Trust."* Keeps: *"opt-in only by a user-initiated message or an explicit affirmative capture in-app (⛔ pre-ticked, ⛔ bundled)"*. "Not covered": *"the planned signup box … — the author's, under the unchanged §3.4 capture rule"* | ⭐ TRUSTEE-RATIFIED (option A); the "Not covered" list is the entry's framing |
| 6.31 routing note, fact (3) (sent; ruled `-364`) | *"a separate WhatsApp box, not ticked in advance, with a reminder that important notices come on WhatsApp and a choice to go back or carry on, is now planned"* | told to the Panel as a FACT (not asked) |
| `2026-10-21-373` d1, d10 | one ACTIVE row per member; *"the mint refuses while any ACTIVE row exists"*; *"§3.4's origination rule, unchanged"* | author-commit (5.12) — BUILT |
| Niyamavali R10(B) | *"Official communications are delivered via the in-app surface (the channel of record). WhatsApp/Telegram and similar are convenience mirrors only. Missed information is the member's responsibility"* | rulebook, ⛔ binding ([[feedback_niyamavali_rulebook_not_spec]]); the T&C carries the same draft clause |
| Row `5-10-…` ledger comment (2026-10-19) | BigDev: *"Go with unticked, but display popup saying we send important notification over whatsapp with option to go back and tick or proceed anyway"*; *"WhatsApp box only"*; owed: popup words (en + reviewed hi; *"both choices given equal weight — a nudge, ⛔ a dark pattern"*), the same capture in settings, the consent row + `member_wa_opt_in` write, counsel's DPDP view recorded | BigDev's direction (author) |
| UX spec, Pattern 1: Button Hierarchy | *"Single primary action per surface — never two primary buttons competing."* | UX spec (author) — reconciled by SB4 |
| UX spec, Pattern 2: Confirmation Modal Discipline | *"When to use: Only for irreversible actions"*; *"When NOT to use: … state transitions"*; mobile: a bottom-sheet | UX spec (author) — deliberately ⛔ applied to the reminder (SB4) |
| Meta, *Get opt-in for WhatsApp* (fetched 2026-10-21) | *"It is up to businesses to determine the method of opt-in"*; examples *"SMS · Website · By phone (… IVR …) · In person or on paper"*; opt-in *"can be general and not specifically for WhatsApp"*; must *"clearly state the business's name"* and that the person is opting in to receive messages from it; *"Businesses may contact people on WhatsApp if: (a) they have given their mobile phone number; and (b) businesses have received opt-in permission from the recipient confirming that they wish to receive subsequent messages or calls from a particular business"*; silent on pre-checked boxes | provider policy — FOUND ([[feedback_provider_policy_is_found_not_counsel]]) |
| Counsel's DPDP view on the capture | NOT RECORDED — the 6.31 note: *"counsel's view on WhatsApp consent has not been recorded"*; roster Row 37 (b) open; `-367` d19 lists DPDPA §5 (notice) and §6(4) (withdrawal ease) as open for the claim agreement (Row 19 is the home of THAT notice only) — the same questions apply here; the private `privacy-policy.md` names neither WhatsApp nor Meta | ⚠ un-attested — carried as a go-live leg (SB9 (b)), ⛔ backfilled ([[feedback_record_unattested_no_backfill]]) |

## ⭐ THE INVARIANTS

- **I1 — Never pre-ticked.** The box renders unticked on every visit; nothing (a previous answer, the Pariwar, a default, the popup's
  "go back") ticks it except the member's own tap. *Proof:* AC1, AC3.
- **I2 — Separate from the Terms.** The box is on its OWN step; accepting the Terms neither ticks it nor is conditioned on it; leaving it
  unticked never blocks signup. *Proof:* AC1, AC4.
- **I3 — The member's WhatsApp message turns WhatsApp on.** The box only ASKS (the existing mint → PENDING + WhatsApp hand-off). No new
  writer of `member_wa_opt_in` or `consent_records`; ACTIVE is still reached only by the worker's phrase match. *Proof:* AC5, AC9.
- **I4 — Even-handed.** The reminder appears at most ONCE, during signup only — never after signup and never on a later app open — and its two choices are identical in size, theme and
  weight; its words state a fact and never threaten (R10(B): the app is the channel of record). *Proof:* AC3, AC7.
- **I5 — Never a dead end.** Every failure (status unknown, mint refused, WhatsApp not installed, a call that hangs) still lets the
  member continue signup. *Proof:* AC2, AC6.

## 📜 Policy meaning (AI-10-1)

**5.10 introduces NO predicate that gates a member's access to a benefit, and changes none.** Its one new condition — the step is shown
only when the member's Pariwar has WhatsApp switched on — decides whether a convenience channel is OFFERED, and nothing reads the
member's answer to decide a payment, a pool, a claim, a warning or a member state (the payment lock-in gate is untouched). In the
member's terms: *"when you join, you can ask for TWT's WhatsApp messages by ticking a box and sending one WhatsApp message; if you
don't, you still get everything in the app, and you can turn WhatsApp on or off later."* Checked against the Niyamavali (2026-10-21,
`docs/legal/niyamavali.md` — the private corpus copy in the main checkout): compatible — its only WhatsApp clause is R10(B), *"convenience
mirrors only"*; no clause governs how a channel preference is asked for.

## ⭐ FOUND FACTS (at 20fcb479 — re-run each at Task 0.1)

**Signup today**

- **F1 —** OTP → `memberAuth.signupCreate` (member + identity created in one tx, full session) → `router.replace('/(signup)/tc')`
  (`apps/mobile/app/(auth)/otp.tsx:54-65`; `apps/api/src/modules/auth/member/signup.handlers.ts:57-225`). ⇒ The member and their
  identity (incl. `mobile_blind_index`) EXIST before the Terms — the mint's `getMemberMobileBlindIndex` finds them.
- **F2 —** `WIZARD_STEPS = ['tc', 'kyc', 'workplace', 'nominees', 'medical', 'payment']` (`apps/mobile/lib/wizard-steps.ts:18`). The
  layout derives *"Step N of M"* from it (`app/(signup)/_layout.tsx:27-31`); each screen hard-codes the next route as a typed literal
  (`tc.tsx:128` → `'/(signup)/kyc'`). Story 6.36a's `workplace` is the add-a-step precedent (its header comment, and friction-budget's
  "Story 6.36a disposition").
- **F3 —** The `(signup)/_layout.tsx` header comment lists a stale order (`tc → kyc → nominees → medical → [payment hand-off]`, no
  `workplace`) — it is a comment, ⛔ code; SB11 refreshes it with a dated line.
- **F4 —** `tc.tsx:195-211` (checkbox) and `:213-217` (error) are the in-app checkbox pattern: a tamagui `Button` with `accessibilityRole="checkbox"`,
  `accessibilityState={{ checked, disabled }}`, glyph `'☑  ' / '☐  '`, errors as `accessibilityRole="alert"` + assertive.
- **F5 —** The wizard does not survive a relaunch: a cold start opens `(tabs)` (`initialRouteName: '(tabs)'`, `app/_layout.tsx:39`) and
  a pending-kyc re-login goes to `(tabs)` (`otp.tsx:49-52`); ⛔ path anywhere resumes the wizard — `kyc.tsx`'s KYC start (`:102`, then
  `openBrowserAsync` `:105`) and `payment.tsx`'s payment intent (`:57`, then the UPI `openURL` `:85`) are reachable ONLY from it. A plain background/foreground keeps the wizard (no `AppState` re-route;
  the root guard only redirects out of `(auth)`). ⚠ BUT if Android kills the app process while WhatsApp is open, the member relaunches
  into `(tabs)` and cannot reach KYC or payment anywhere — stuck `pending-kyc`. `payment` already leaves the app (UPI) and `kyc` opens a
  Custom Tab, but SB2 (a) would be the first optional full app switch placed BEFORE KYC (SB2 (d) answers it). (The guard race in memory
  [[project_expo_router_guard_race]] was FIXED 2026-10-11 — `_layout.tsx:140-146` skips `(auth)/otp`, so `otp.tsx`'s replace wins.)
- **F6 —** `payment.tsx:28` `type LockInGateStep = 'kyc' | 'nominees' | 'medical' | 'tc'` — the lock-in reads those four; the WhatsApp
  step is ⛔ one of them (I2).

**The opt-in substrate (unchanged by this story)**

- **F7 —** The mint (`handlers.ts:141-223`): 409 `wa_opt_in.channel_unavailable` when the Pariwar config is missing / disabled / has no
  number; `lockMemberWaYes`; 409 `wa_opt_in.already_active` if any ACTIVE row; a PENDING is RE-USED (no new audit); else audit-first
  `member.wa_opt_in_requested` then `createPendingOptIn`; returns `{state, displayPhoneNumber, deepLink, verificationPhrase}`. 409
  `wa_opt_in.no_mobile` if no blind index; 409 `wa_opt_in.invalid_display_number` from `buildSendHelloDeepLink` (`handlers.ts:29-39`)
  — SB6's "any other rejection". The route's only guard is `requireMemberSession` (`routes.ts:36-42`) — no member-STATE check
  (`apps/api/src/modules/auth/shared/member-session-guard.ts` has none), so a `pending-kyc` or `pending-fee` member may mint — the member is `pending-kyc` at the step under SB2 (a),
  `pending-fee` under (d) (`member.kyc_completed` → `pending-fee`, `packages/domain/src/member/state.ts:177-178`). ⚠ Proved by AC9's
  new leg, ⛔ assumed.
- **F7a — WhatsApp is a FALLBACK rung, ⛔ a mirror.** `CANONICAL_CHANNEL_LADDER = ['push', 'whatsapp', 'sms']`
  (`packages/channels/src/dispatch.ts:34`); the member-alert ladder runs one attempt per rung and STOPS at the first `sent`
  (`apps/jobs/src/scheduler/contribution-notify.ts:302`). The payment reminder (`deadline_reminder`,
  `contribution-notify-triggers.ts:357,389`) goes through it; news does too, limited to the post's selected channels
  (`news-publish.ts:247`, `restrictTargetsToChannels`); helpdesk replies would once `createHelpdeskReplyFanOutNotifier` is wired
  (production uses the log-only `consoleHelpdeskReplyNotifier` — `apps/api/src/deps.ts:516-520`) ⇒ an ACTIVE member whose push works
  gets ⛔ WhatsApp for the payment reminder. The only push-independent WhatsApp send is 6.31's neighbours'
  claim reminder (`claim-peer-mesh-wa-reminders.ts`). There is ⛔ notification inbox; the in-app equivalents are the contribution card,
  the peer-request entry on home and helpdesk. ⇒ The words (SB5) say "when an app notification does not reach you", ⛔ "also".
- **F7b — ⚠ A switched-on Pariwar with no approved template stops the ladder at WhatsApp, so an opted-in member's SMS rung is never reached** (pre-existing, 5.4 / 8.8 — ⛔ 5.10's to fix,
  but 5.10 brings members into it in bulk). `resolveWaTarget` checks only `enabled` + ACTIVE (`packages/domain/src/notifications/
  delivery.ts:116-133`); `resolveWhatsappProviderDeps` returns null when the category has no `approved` row in `pariwar_wa_templates`
  (`packages/channels/src/composition/provider-composition.ts:88-91`; rows default `pending`), so `createWhatsappProvider` selects the
  log-only fixture (`providers/index.ts:71`), which *"Reports `accepted` … so downstream dispatch behaves as if WA worked"*
  (`fixture-whatsapp.ts:8,33`) ⇒ the ladder stops and SMS is ⛔ tried. Today this removes nothing: the per-member SMS
  fallback is itself DARK (Story 6.34 TV6; row `5-11-per-member-sms-fallback-fixed-wording`; `fixture-sms.ts` also reports `accepted`).
  Once row 5-11 turns it on, an opted-in member — exactly whom ratified §3.4 fire condition (iii) sends the fallback to (*"when both WA
  gates ON and WA delivery returns failure"*) — would never get it. Recorded in `deferred-work.md` (the 5.10 validate section); go-live leg SB9 (d).
- **F7c — "Available" ⛔ "complete".** `available = Boolean(config?.enabled && config?.displayPhoneNumber)` (`handlers.ts:234`); every
  credential is optional in the contract (`packages/contracts/src/channel-config/config.ts:38-48`), and the webhook rejects every inbound
  message when `appSecretSecretName` is missing (`apps/api/src/modules/channel-webhooks/handlers.ts:92-95`, `webhook.signature_rejected`)
  ⇒ a Pariwar with only a display number shows the step to every new member and every tick expires (F11). Go-live leg SB9 (c).
- **F8 —** ACTIVE is written only by the worker's phrase match (audit, then one tx: `lockMemberWaYes`, `recordConsent('whatsapp_opt_in',
  'member_self', {source:'meta_webhook_inbound'})`, `activateOptIn`). `activateOptIn` accepts PENDING only
  (`packages/domain/src/wa-opt-in/write.ts:196-226`). 6.31's reminder reads `isOptInActive` AND `consentExists` (`read.ts:168-171`) — so a
  yes must carry BOTH rows, which the worker path writes.
- **F8a — How the number is verified.** The worker matches an inbound message on (Pariwar, the blind index of the SENDER's number,
  the verification phrase, a PENDING row) — `matchPendingOptIn` (`apps/jobs/src/wa-webhook-processor.ts:370-399`); a sender that is not
  an Indian mobile is ignored, and a message matching no PENDING is logged with no state change. The PENDING carries the member's
  REGISTERED mobile's blind index (the mint copies the identity's — `handlers.ts`). ⇒ ACTIVE proves the registered mobile is on
  WhatsApp AND the member sent from it. A member whose WhatsApp is on a different number cannot be matched; their PENDING expires (F11)
  and Settings says it was not turned on. This is why SB1 (a) keeps the message step — a tick alone proves neither.
  ⚠ Ratified §3.4 (*Inbound message handling*) says a mismatch is *"logged + surfaced for member confirmation"*; only the first half is
  built — the no-match branch (`wa-webhook-processor.ts:396-399`) does `console.warn('… matched no PENDING opt-in — surfaced for
  confirmation')` and `continue`s: nothing reaches the member, and the log line overstates it (the code comment at `:397` is accurate). Pre-existing; ⛔ this story's to build
  (recorded in `deferred-work.md`). ⚠ The common real case is a DUAL-SIM phone with WhatsApp on the OTHER SIM's number — the deep link
  then sends from that number on THIS phone; SB12's "another phone?" label does not name it. ⚠ v1.5: BigDev's wording (SB5) leaves the condition OUT of the main words — it
  is stated only in `waOtherPhone.note`, behind the link; an accepted cost, recorded.
- **F8b — The phrase can be typed by hand.** `TWT-` + 8 characters from an unambiguous alphabet (no 0/O, 1/I/L), e.g. `TWT-7K2F9QXR`
  (`packages/domain/src/wa-opt-in/phrase.ts:16-40`); the extractor upper-cases the body and folds dash variants
  (`phrase.ts:43-60`), so a hand-typed, lower-case or autocorrected phrase still matches. The mint response carries
  `displayPhoneNumber` + `verificationPhrase`, and the status response carries both while PENDING (`packages/contracts/src/wa-opt-in/opt-in.ts`
  `CreateWaOptInResponse`, `WaOptInStatusResponse`) ⇒ either screen can show them with NO API change. ⚠ Precisely: the status
  response returns `displayPhoneNumber` whenever the config has one (`handlers.ts:235`); only `verificationPhrase` and `deepLink` are
  PENDING-only (`:246-250`); both are `string | null` (`opt-in.ts:61,64`). A PENDING lives 48 h
  (`DEFAULT_PENDING_TTL_SECONDS`, `apps/jobs/src/wa-webhook-processor.ts:54`).
- **F8c — Signing up on a phone that does not hold the member's WhatsApp.** The deep link opens WhatsApp on THIS phone, so the message
  comes from another number (no match — F8a) or, with no WhatsApp installed, `https://wa.me/…` opens a browser page and
  `Linking.openURL` RESOLVES (⛔ rejects) — so `link_failed` does ⛔ catch it. Only WhatsApp's linked-device mode (the member's own account
  linked on this phone) matches. Before SB12 the only way to finish was to install the app on the other phone and use Settings.
  ⚠ `notifications.tsx:199`'s comment says *"No app can handle the wa.me URL (e.g. WhatsApp not installed)"* — it contradicts this;
  device behaviour is un-attested either way. ⛔ "Correct" the story back from that comment; the step treats a resolve as nothing (T3).
- **F9 —** Neither `member_wa_opt_in` nor `consent_records` has an origin / ui_context column; `consent_records.consent_payload` (jsonb)
  documents `checkboxTextShown, locale, copyVersion …` (`packages/domain/src/schema/consent_records.ts:245-264`). The claim-contact
  agreement is the precedent for server-resolved evidence copy (`apps/api/src/modules/claims/claim-contact-copy.ts`). Used only if SB8
  (b) is chosen.
- **F10 —** No `events_log` event exists for WhatsApp opt-in; transitions are hash-chained audit lines (`member.wa_opt_in_*`).
- **F11 —** A stale PENDING is moved to `EXPIRED_24H_WINDOW` by the jobs sweep (`wa-webhook-processor.ts:639-680`); Settings then shows
  `unconfirmed_*` ("we did not receive your WhatsApp message … try again"). ⇒ A member who ticks but never taps send ends there — honest
  and recoverable. ⚠ For a member who DID send, from a number other than their registered one (F8a), that wording is inaccurate — the
  message arrived and matched nothing; pre-existing, ⛔ changed here. Nothing can be withdrawn while PENDING for a member with no earlier yes (the
  revoke answers 409 `wa_opt_in.not_active` — `hasAnythingToEnd`, `read.ts:207-222`, counts only ACTIVE rows and open consent rows; Settings' PENDING branch has no withdraw button), yet the pre-filled WhatsApp
  draft can still switch it on for up to 48 h — acceptable (nothing is on yet), and why the box's words never say "turn it off" of a
  PENDING.

**The app**

- **F12 —** `apps/mobile/app/(settings)/notifications.tsx` (5.12): `CALL_TIMEOUT_MS = 15_000` (`:53`) + a module-local `withTimeout`
  (`:56-70`, passes the original rejection through) bound every call (the api-client transport has no timeout — 5.12 P1); `Linking.openURL` failures surface as a `link` error; state
  changes are announced. Its enable control = `requestWaOptIn()` → `Linking.openURL(res.deepLink)` (`onEnable`, 168-189). ⚠ It does
  NOT tell 409 codes apart — every failure sets the `'action'` error and re-reads (`:182-185`). The working pattern for a code is
  `err instanceof ApiError && err.code === '…'` — `ApiError` from `@twt/api-client` (`packages/api-client/src/index.ts:193`: `.status`,
  `.code`, `.details`); precedent `apps/mobile/app/(auth)/otp.tsx:11,70`; `ConflictError(…, code)` puts the code in the envelope.
  ⚠ Its PENDING body is a separate `OptInBody` component (`notifications.tsx:230-238`, `:250-293`; PENDING branch `:283-293`) that
  receives only `state` and `available` — SB12 must widen its props. `onReopen` (`:191-204`) re-opens the stored `deepLink` with ⛔ API
  call — SB6's resend precedent.
- **F12a — Bounded-call helpers already exist, all local:** `withAnswerTimeout` (`apps/mobile/lib/workplace.ts:226-260`, typed
  `AnswerTimeout`, "the `withReadTimeout` house pattern"), `withReadTimeout` (`components/known-people/useKnownPeopleQueries.ts:37-60`,
  abort + race) and `boundClaimEntryRead` with `CLAIM_ENTRY_READ_TIMEOUT_MS = 5000` (`lib/claim-entry-gate.ts:63-76` — the precedent for
  SB3's 5 s). SB10's `lib/with-timeout.ts` is the FIRST SHARED one; those three are ⛔ migrated by 5.10.
- **F13 —** `memberAuth.getWaOptInStatus / requestWaOptIn / revokeWaOptIn` (`packages/api-client/src/index.ts:1003-1015`), on the
  `memberAuth` instance `apps/mobile/lib/member-api.ts` builds.
- **F14 —** Existing copy names the sender **"TWT"** (`waNotifications.active_desc`: *"You'll receive TWT notifications on WhatsApp …"*;
  `entry_hint`). The Trust's legal name is pending ([[project_legal_name_pending]]) — never hard-code one. ⚠ The app has ⛔ settings
  screen: `NotificationSettingsEntry.tsx:3-4` (*"the app has no dedicated profile/settings screen yet"*) is a dimmed, chromeless
  *"WhatsApp notifications"* (`waNotifications.entry_label`; hi *"व्हाट्सएप सूचनाएँ"*) entry near the bottom of the home tab
  (`(tabs)/index.tsx:96`), and ⛔ en/hi string names "Settings" / "सेटिंग्स" ⇒ member-facing words point to *the home screen, under
  "WhatsApp notifications"* (SB5).
- **F15 —** The app is always Hindi (no language switch; `LocaleProvider` in-memory `hi` — [[project_mobile_app_no_language_switch]]). ⇒
  The Hindi strings are what members read; the English is not member-visible today.
- **F16 —** `BannerHost.tsx:245-280`: overlay (⚠ an `absoluteFill` overlay INSIDE a `ScrollView` covers only the scroll content —
  render it as a SIBLING of the ScrollView) with `accessibilityViewIsModal`, absolute-fill scrim (`zIndex: 1000`), inner
  `accessibilityLiveRegion="polite"`; its comment records the rule *"NOT Alert.alert / alert() / confirm()"*. `Alert.alert` would style a
  `cancel` button differently on each OS — ⛔ equal weight. BannerHost has no Android-back handling; the precedent is
  `components/peer-request/PeerQuestionnaire.tsx:264` (`BackHandler.addEventListener('hardwareBackPress', …)`). The announce plan is
  `apps/mobile/lib/death-certificate-announce.ts` (`announcementPlan(platform, kind)` → `{liveRegion, iosAnnounce}`), and the house
  WRAPPERS over it are `components/peer-request/announce.tsx` — `AnnouncedText` (a LINE with a live region: Android live region OR iOS
  announce, never both) and `useAnnounceOnChange` (a page / PHASE change, which has ⛔ live region: spoken on BOTH platforms —
  `announce.tsx:1-5,18-22`; already reused by `components/workplace/*` and `(life-events)/*`). ⛔ `notifications.tsx:164`'s
  unconditional announce. BannerHost's overlay uses tamagui `View` and RN `StyleSheet.absoluteFill` (`BannerHost.tsx:45-46,249-258`).

**Gates the edits trip**

- **F17 —** `friction-budget.md`: any committed `apps/mobile/` member-facing change needs a ledger row or a "**Story X disposition (…)**"
  paragraph (5.12 F22); the 6.36a `workplace` step added ONE row (`forced`) — the precedent. ⚠ `parseAndValidateLedger`
  (`scripts/friction-budget/lib.ts`) reads only the FIRST table whose header has payer / protects / event_type and stops at the first
  line not starting with `|` (in `friction-budget.md` the table opens at `| payer` near the top) — a row placed anywhere else is ⛔
  parsed, while the new disposition heading alone still turns AC-4 green (`/^\*\*Story\s+(\S+?)\s+disposition\b/`). The check diffs
  COMMITTED history (`git diff merge-base(HEAD, origin/main)...HEAD`, `check.ts:79`). `event_type` ∈ {`forced`, `optional`}.
- **F18 —** i18n parity walks en keys only (5.12 F14; `packages/i18n/scripts/lib.ts checkParity`); ⛔ test pins `common.json` key
  counts. `common.json` keys are FLAT dotted strings (`"waNotifications.title": …`) — the new keys are `"waSignup.title"` etc. The
  copy-key test precedent is `apps/mobile/tests/unit/wa-notifications-copy-keys.test.ts` (real `t()`, camelCase-capable regex, positive
  control); ⚠ it scans only its `FILES` (`:13`) and calls `t(key, undefined, …)` (`:34`), and the resolver THROWS on a `{token}` with no
  param (`packages/i18n/src/resolver.ts:33-41`, *"missing interpolation param"*) ⇒ `waOtherPhone.desc`'s `{number}` needs a `PARAMS`
  object — precedent `workplace-copy.test.ts:93,116`. Its regex sees only LITERAL keys (`t('…')`). `microcopy.yaml` scans en + hi
  `common.json` line by line, keys and `$comment` included (`scripts/microcopy/common.test.ts:43-44` pins the scope); the v1.3 strings
  AND the v1.4 rewording (all 17 `waSignup.*` / `waOtherPhone.*` rows of the SB5 table, en + hi) gave 0 findings on vocabulary / tone /
  numerals (validate v1.4, the real `checkVocabulary` / `checkTone` / `checkNumerals` + `microcopy.yaml` at `2f4a4303`); Task 2.2 re-runs
  the full gate on the committed JSON.
- **F18a —** `apps/mobile/tests/unit/workplace.test.ts:41-42` (6.36a AC5) pins `[...WIZARD_STEPS]` to the six-step order — it goes RED
  when `'whatsapp'` is inserted; Task 3.1 amends it.
- **F19 —** Mobile vitest includes `tests/unit/**/*.test.ts`, env `node`; render tests opt in with `// @vitest-environment jsdom`. The
  harness precedent is `tests/unit/wa-notifications-screen-render.test.ts` (real `<LocaleProvider>`, mocks `lib/mmkv`, `lib/member-api`,
  `expo-router` with a blur-aware `useFocusEffect`, `react-native`, `tamagui` forwarding `testID`; RTL `cleanup`). ⚠ That `tamagui` mock
  forwards only `children`, `testID`, `onPress`, `disabled` (`:76-88`), its `react-native` mock has no `Alert` / `Platform` /
  `BackHandler`, and its `expo-router` mock has no `useRouter` — a copied harness would make AC1/AC3/AC8's prop legs pass VACUOUSLY
  ([[feedback_gate_scope_semantic_coverage]]). No signup-screen test exists today. ⭐ The closer harness precedent for this step is
  `tests/unit/peer-questionnaire-render.test.ts:35-63`: `BackHandler` with `mock.backHandlers` + a `hardwareBack()` helper, a `Platform`
  with a mutable `OS` getter (both `announcementPlan` branches), and a checkbox stub mapping `accessibilityState.checked` →
  `aria-checked`. ⚠ Its `useRouter: () => ({ replace: vi.fn() })` (`:28`) builds a NEW object per call — `replace` cannot be asserted
  and a `router`-dependent effect re-runs; use a stable `mock.router` from `vi.hoisted`. ⛔ shared mocks folder exists (`tests/` holds
  `unit/`, `fixtures/` and `export.test.ts`). Vitest collects only `tests/unit/**/*.test.ts` (`apps/mobile/vitest.config.ts`) ⇒ render tests are
  `.test.ts` using `createElement` (⛔ JSX; a `.test.tsx` is never collected); `globals` unset ⇒ explicit RTL `cleanup`;
  `apps/mobile/tsconfig.json` excludes `tests/**` ⇒ tests are ⛔ typechecked. `new ApiError(status, code, message)` works in mobile
  tests (`bank-statement-upload-view.test.ts:101`).
- **F19a —** `apps/api/tests/integration/wa-opt-in/wa-opt-in.spec.ts:110` ALREADY proves a `pending-kyc` member (projected via
  `member.signup_initiated`) mints 200; `:150-162` proves a disabled config gives 409 — the CODE is ⛔ asserted by any leg today. Its
  config seed is inline SQL inside `seedMemberWithConfig` (`:54-97`, ⛔ a named helper), and its `inject` (`:30-49`) sends ⛔ payload —
  signup needs one. The real-signup helpers are file-local in `apps/api/tests/integration/signup/signup-create.spec.ts`
  (`continuationViaOtp` :66, `mintContinuation` :78; the OTP from the default `CapturingStepUpDelivery`); `createTestApp` is per test
  and takes `{ env }` (`_setup.ts:298,501`) ⇒ `createTestApp({ env: { DEFAULT_SIGNUP_PARIWAR_ID } })`; a fresh random Pariwar per test
  is the `member-moderation/termination-access-block.spec.ts:216-217` precedent (⛔ FK from members / `pariwar_wa_config` / the signup
  handler to a Pariwar row).
- **F20 —** Typed routes are absent in a worktree (no `.expo/types`) ⇒ `tsc` skips `Href` checks; run it both ways
  ([[project_mobile_typed_routes_worktree]]). The new `'/(signup)/whatsapp'` literal is exactly what that check guards. The worktree
  has ⛔ `node_modules` until `pnpm install --frozen-lockfile`. To generate the types: in `apps/mobile`, `CI=1 npx expo start --port <free>`
  in the background until `.expo/types/router.d.ts` and `expo-env.d.ts` exist, then `pkill -f "expo start --port <n>"`, then
  `pnpm --filter @twt/mobile typecheck`; move `.expo/types` aside and re-run.

## ⚖️ Build decisions SB1–SB11 (⭐ = recommended) — ✅ ANSWERED 2026-10-21 at Task 0.2: every ⭐ accepted (Debug Log (a))

- **SB1 — What a tick does.** ⭐ **(a)** Ticked + Continue = the Settings enable control: `requestWaOptIn()` (mint PENDING), then
  `Linking.openURL(deepLink)`; the member's sent message turns WhatsApp on via the unchanged worker path (which writes the consent row and
  the ACTIVE row — F8). MATCHES §3.4's onboarding "Yes" branch and ADR-0029; the row's owed *"consent row + `member_wa_opt_in` write"* is the worker's, already
  built (5.4). **(b)** The tick switches WhatsApp on by itself (a new
  in-app ACTIVE writer + consent row with the words shown). *Cost (a):* an app switch in the middle of signup; a member who ticks but does
  not tap send is not opted in (F11 — Settings says so and offers a retry). *Cost (b):* widens ADR-0029's ratified sentence ⇒ a Panel
  question (PQ1); a tick proves neither that the number is on WhatsApp nor that the member controls it there (the phrase does — 5.4);
  a new writer under the 5.12 lock + one-ACTIVE index, an evidence column (migration), and a second consent route to keep consistent.
- **SB2 — Where the box lives.** **(a)** A new wizard step `whatsapp`, immediately AFTER `tc` (step 2 of 7) — its own screen (the
  v1.0–v1.3 recommendation).
  **(b)** The last step, after `payment`. **(c)** On `tc.tsx` below the Terms box — ⛔ recommended: one Continue would post the Terms and
  the WhatsApp answer together (the *"bundled consent"* objection). **(d)** After `medical`, immediately BEFORE `payment` (step 6 of 7)
  — the app switch then sits next to the existing UPI one, after the data that cannot be recovered outside the wizard (KYC, nominees,
  medical) is collected. *Cost (a):* every member passes one more screen (F17 row); *"Step N of M"* becomes 7; ⚠ the first optional
  full app switch BEFORE KYC — if Android kills the app while WhatsApp is open, the member relaunches into `(tabs)` with ⛔ way back to
  KYC or payment (F5), stuck `pending-kyc`. *Cost (b):* reaches fewer members (F5 — a relaunch drops the wizard; payment hands off to
  `(tabs)`). *Cost (d):* a member who quits mid-wizard is never asked (Settings remains); a member who ticks makes TWO app switches
  before payment (WhatsApp, then UPI) — a kill during either strands them `pending-fee` with ⛔ route to payment (F5): the stranding UPI
  already has, one more time, but nobody is stranded before KYC. ⭐ Recommendation REVISED by validate v1.4: **(d)**,
  unless BigDev prefers the earlier ask of (a) and accepts the stranding risk — BigDev's call at Task 0.2. ⭐ Two NAMES used below so
  the ACs and Tasks hold under either answer: **PREV** = the step before `whatsapp` and its next-route literal (`tc.tsx:128` under
  (a); `medical.tsx:54`'s `router.replace('/(signup)/payment')` under (d)); **NEXT** = the route the step moves on to
  (`'/(signup)/kyc'` under (a); `'/(signup)/payment'` under (d)).
- **SB3 — A Pariwar without WhatsApp, or a status that cannot be read.** ⭐ **(a)** The step loads `getWaOptInStatus()` (bounded,
  SB10); `available: false`, a load failure or a timeout → `router.replace(NEXT)` without showing the box; `state: 'ACTIVE'`
  → also straight on (nothing to ask). **(b)** Render an "unavailable" line with Continue. *Cost (a):* the progress label jumps from
  PREV's number past the step (*Step 5 → 7 of 7* under SB2 (d); *Step 1 → 3 of 7* under (a)) for those members — at day one that is EVERY member (every Pariwar's WhatsApp is off); a member whose status
  call failed is not asked (Settings remains). The status read gets a SHORTER bound (`STATUS_TIMEOUT_MS = 5_000`, in the step — the
  `CLAIM_ENTRY_READ_TIMEOUT_MS` precedent, F12a) so a hang holds the spinner at most 5 s, ⛔ 15. ⚠ While it loads, the layout's polite
  header already reads the step's own number (*"Step 6 of 7"* under SB2 (d), *"Step 2 of 7"* under (a); `_layout.tsx:27-31`) and the
  screen reader announces a step with no content, then the member lands on NEXT's number (*"Step 7 of 7"* / *"Step 3 of 7"*) of what
  is, for them, a six-screen flow (`workplace` is never skipped — no precedent). *Cost
  (b):* a screen telling every member of a WhatsApp-less Pariwar about a channel they cannot have. **(c)** Do the bounded status read
  in the PREVIOUS step's Continue and route straight past the step when it is not offered, with the layout's count leaving `whatsapp`
  out when skipped. *Cost (c):* the previous screen gains a network call on Continue and a second copy of the skip rule; the layout
  needs to know the answer (a wizard-scoped flag). ⭐ Recommended: (a) with the label jump and the empty-step announcement ACCEPTED as
  costs, recorded in the decision — BigDev's call at Task 0.2.
- **SB4 — The reminder (popup).** ⭐ A rendered in-screen overlay (F16 pattern), shown when Continue is pressed with the box UNTICKED,
  at most ONCE, during signup only (a second unticked Continue on the step proceeds directly). The step is part of the one-time signup
  wizard and every step moves on by `router.replace`, so a member is never asked again after signup (F5) — Settings never prompts. Two buttons, same component, size, theme and
  `height` — neither is `theme="accent"` — in BigDev's order: *"Go back and tick the box"*, then *"Continue without WhatsApp"*.
  "Go back" closes the overlay and leaves the box UNTICKED (I1) — the member ticks it themselves; the Android back gesture while the overlay is open = "Go back"
  (`BackHandler`, F16 precedent; removed on close/unmount). The overlay renders as a sibling of the ScrollView (F16).
  ⛔ `Alert.alert`. UX Pattern 1 (*"never two primary buttons competing"*) is MET (neither is primary); its *"Primary action is always
  the highest-priority next-step"* is deliberately not applied here — BigDev's equal-weight direction; recorded in the decision. UX
  Pattern 2 (*"Confirmation Modal Discipline"*: *"Only for irreversible actions"*; *"When NOT to use: … state transitions"*; a mobile
  bottom-sheet, first focus on Cancel) is likewise deliberately ⛔ applied — the reminder is a modal on a reversible choice, by BigDev's
  popup direction; recorded in the decision. The overlay copies BannerHost's SHAPE in the new screen — ⛔ edit or extract from
  `components/banners/*` (T10).
  *Cost:* one more tap for a member who meant to skip.
- **SB5 — The words (en + DRAFT hi).** ⭐ A `waSignup.*` family in `packages/i18n/locales/{en,hi}/common.json` (table below). The sender
  is **"TWT"** (F14 — Meta wants the business named; the legal name is pending). The reminder states a FACT and never threatens: under
  R10(B) the app is the channel of record, so ⛔ "you will miss …" — it says the app still has everything. ⭐ v1.4 (validate): the
  words describe WhatsApp as it is BUILT — a fallback when an app notification does not reach the member (F7a), ⛔ "also"; they point
  to *the home screen, under "WhatsApp notifications"* (F14 — there is ⛔ "Settings"); and the box hint and the sent stage say the message is SENT TO TWT
  (the member sends it; nothing is sent to the member). ⭐ v1.5 (2026-10-21, BigDev, in session): BigDev rewrote the English of six rows
  (`intro`, `box_hint`, `popup_body`, `sent_desc`, `request_failed`, `link_failed`) — the direction made explicit; the registered-number
  condition (F8a) is left to `waOtherPhone.note` (behind SB12's link) — an accepted cost; `intro` says TWT *"will send"* (`popup_body`
  keeps *"can"*) — ⚠ true only once the Pariwar is switched on with approved templates (F7b, SB9 (c)/(d)). The Hindi of those six rows was
  translated from that English and then reviewed and edited by BigDev in session. The box's hint says how to stop (that entry, or STOP)
  — Meta's opt-out tip and DPDPA §6(4)'s withdrawal ease. v1.6: BigDev then reviewed the other eleven Hindi rows in session — *"nothing to change"* —
  so all 17 rows have had BigDev's review. *Cost:* whether that in-session review discharges SB9 (a) (Row 28's Hindi-review control) is
  for that roster row to record (⛔ assumed here).
- **SB6 — After a tick.** ⭐ No waiting and no polling in signup: once WhatsApp opens, the step shows `sent_title` / `sent_desc`, *"Open
  WhatsApp again"* and Continue. ⭐ v1.4: *"Open WhatsApp again"* RE-OPENS the first mint's `deepLink` (kept in state) with ⛔ API call —
  Settings' `onReopen` precedent (F12) — so the resend has no failure branches of its own beyond a `Linking.openURL` rejection
  (→ `link_failed`, same as below). Codes are read as `err instanceof ApiError && err.code` (F12). The step makes ONE mint: after the
  first ticked Continue, the following Continue always goes to NEXT, never a second mint. Outcomes: 409 `wa_opt_in.already_active` →
  NEXT at once (done); 409 `wa_opt_in.channel_unavailable` → NEXT at once (switched off meanwhile); any other rejection (incl.
  `wa_opt_in.no_mobile`, `wa_opt_in.invalid_display_number` — F7) or a timeout → stay on the ask stage showing `request_failed`
  (*"…turn it on later from the home screen"*, ⛔ *"try again"*), Continue → NEXT; `Linking.openURL` rejects (rare — F8c) → stay on the
  ask stage showing `link_failed`, Continue → NEXT (the PENDING already minted expires — F11). *Cost:* the member does not see, in
  signup, whether their message arrived (opening the home screen's *"WhatsApp notifications"* shows it — F12); a transient failure is not
  retried in signup.
- **SB7 — "The same capture in Settings"** (the row's word; the place is the home tab's *"WhatsApp notifications"* entry →
  `notifications.tsx` — F14). (SB12 adds ONE thing to its waiting state; otherwise:) ⭐ **(a)** No change: Settings' enable control already makes the very request the box makes
  (mint + WhatsApp) — recorded as *"already built by 5.4 / 5.12 — no change by 5.10"*, ⛔ "closed by 5.10"
  ([[feedback_closure_language_precision]]). **(b)** Put the box + reminder in Settings too. *Cost (a):* Settings words differ from the
  box's (*"Want WhatsApp notifications? Tap here to enable"*). *Cost (b):* a second surface for one request; a reminder on a screen the
  member opened on purpose is a nag.
- **SB8 — What is recorded.** ⭐ **(a)** Nothing new on the server: the consent evidence stays the member's own WhatsApp message (the
  worker's consent row); the in-app request is the mint's existing audit line (`member.wa_opt_in_requested`, `member_app`, time).
  Honest limit: the server cannot tell a signup tick from a Settings tap. **(b)** An optional mint body `{ uiContext: 'signup' |
  'settings', locale }`, server-resolved box words (the claim-contact precedent, F9), a new nullable column on the PENDING row
  (migration), copied by the worker into `consent_payload` at the match. *Cost (a):* no record of which screen or words preceded a yes.
  *Cost (b):* a migration, a contract change, a worker edit on the activation path, and a mint that is no longer bodyless
  ([[project_fastify_empty_json_body_400]]). ⚠ §3.4's *"recorded with timestamp + the UI context"* governs the in-app-capture ROUTE TO
  ACTIVE — which (a) does not use; the route used is the user-sent message, recorded as today.
- **SB9 — Go-live.** ⭐ A NEW roster row, KEY `wa-signup-box-hindi-reviewed` (the next free Row at Task 0.4), decision-authored:
  **(a)** the new hi `waSignup.*` and `waOtherPhone.*` strings HUMAN-REVIEWED (Row 28's control); **(b)** counsel's DPDP view on the box
  and reminder — the DPDPA §5 notice (incl. the privacy policy naming WhatsApp / Meta as a channel and processor: the private
  `privacy-policy.md` / `.hi.md` name neither today) and §6(4) withdrawal ease — recorded, or its absence accepted as a decision
  (Row 19 is ⛔ its home: `-367` d19 makes Row 19 the home of the CLAIM agreement's notice only); **(c)** before a Pariwar's WhatsApp is
  switched on in production, its config is COMPLETE — phone number id, access-token secret name, app-secret name, verify-token name —
  ⛔ only `enabled` + a display number (F7c); **(d)** before a Pariwar's WhatsApp is switched on in production, an opted-in member's
  SMS fallback is cut off because a category lacks an approved template (F7b) — EITHER **(d-i)** every category the member-alert ladder sends has an
  `approved` UTILITY template for that Pariwar, OR **(d-ii)** the fixture stand-in no longer counts as `sent` for a switched-on Pariwar
  (an engineering fix owed elsewhere — the `deferred-work.md` item). ⭐ Recommended: (d-i) as the leg, (d-ii) left to its own item —
  BigDev's call at Task 0.2. Target: before the first production build that shows the step (legs (a), (b)) / before the first Pariwar is
  switched on (legs (c), (d)). Blocks no build and no merge. *Cost:* one more open row with four legs.
- **SB10 — The timeout helper.** ⭐ Move `withTimeout` + `CALL_TIMEOUT_MS` out of `notifications.tsx` into
  `apps/mobile/lib/with-timeout.ts` — the FIRST SHARED bounded-call helper (three local ones exist and are ⛔ migrated by 5.10 — F12a;
  the step is the second consumer of THIS one — [[feedback_no_premature_package]]). Settings imports it, behaviour identical: the body
  moves unchanged apart from `export` and a domain-neutral rejection message (⛔ `'wa-opt-in call timed out'` — no test pins it; the 5.12
  render test fakes the global `setTimeout`, `:258-292`). *Alternative:* reuse `withAnswerTimeout` from `lib/workplace.ts` (generic,
  React-free) — ⛔ recommended: it rejects with a workplace-named `AnswerTimeout`. *Cost:* touches a just-reviewed screen (import
  only; its render test must stay green).
- **SB11 — Records.** ⭐ One author-commit decision (the next free id) carrying SB1–SB10 as answered; an `epics.md` `### Story 5.10`
  entry (post-hoc, 5.12's shape; placed BETWEEN `### Story 5.9` and `### Story 5.12`); a dated note under §3.4's opt-in bullets and an "annotated" ADR-0029 changelog row (*"the onboarding
  offer is built as an unticked signup step that starts the user-sent message; the origination rule is unchanged"*); the friction-budget
  row; the ledger. ⛔ edit any ratified sentence.
- **SB12 — "WhatsApp on another phone?" (DECIDED IN SESSION 2026-10-21 — BigDev, after F8c: *"I think we need to send OTP in this
  case. May be ask later if whatsapp is on another phone."*, then, offered (1) phrase + number now / (2) the same plus a Panel note + a
  new row for a WhatsApp code / (3) wait for a ruling: *"2, go ahead"*).** On the signup step's `sent` stage AND on Settings' PENDING
  state, a link *"WhatsApp on another phone?"* reveals, as SELECTABLE text, the Pariwar's WhatsApp number and the phrase, with *"From
  the phone that has your WhatsApp, send this message to this number"* (F8b — no API change; signup uses the mint response, Settings the
  status fields). The member's own message from the registered number still switches it on (F8a) — within ADR-0029. Hidden until
  tapped (asked "later", per BigDev). ⛔ a WhatsApp code: that route extends two ratified clauses, so it is the Panel's — routing note
  `trustee-panel-routing-note-2026-10-21-5-10-whatsapp-code-for-another-phone.md` (WRITTEN, ⛔ sent) and backlog row
  `5-13-whatsapp-code-for-another-phone`. ⭐ RULED 2026-10-21 — Decision `2026-10-21-374` (Trustee-ratified, *"by DR and KB / option A,
  one code per request and one retry"*; BigDev's reading of the retry: at most two codes per request, two entry attempts per code): the
  code is ALLOWED, built by row 5-13 (⛔ by 5.10); 5.10's scope is unchanged — it builds the link with the number + phrase now. Row 5-13
  replaces what this link reveals on the SIGNUP step (the note asks
  about signing up; whether Settings' link follows is row 5-13's to decide). *Cost:* the member types a short code into WhatsApp (less
  familiar than a code typed into the app); a small edit to the just-reviewed Settings screen (`OptInBody` gains `displayPhoneNumber` /
  `verificationPhrase` props, both `string | null`; the hint renders only when BOTH are non-null — F12, F8b). ⚠ The link's label
  ("another phone") does not name the dual-SIM case (F8a) — v1.5: the condition is stated only in `waOtherPhone.note` (BigDev's wording, SB5).
- **PQ1 (for BigDev at Task 0.2) —** Is a tick that switches WhatsApp on BY ITSELF (SB1 (b)) wanted at all? ⭐ Recommended: no, not now —
  then nothing goes to the Panel. If yes, it is a routing note (template; §0: it would act on §3.4's wider in-app route against
  ADR-0029's narrower ratified sentence), and SB1 waits.

### The words (SB5) — en: BigDev's (six rows rewritten by BigDev, v1.5); **hi: reviewed by BigDev in session (v1.5 six rows edited, v1.6 eleven unchanged)** — SB9 (a) records whether that is Row 28's review

| Key | en | hi (reviewed by BigDev, 2026-10-21) |
|---|---|---|
| `waSignup.title` | WhatsApp messages | व्हाट्सएप संदेश |
| `waSignup.intro` | When an app notification does not reach you, TWT will send the notice on WhatsApp instead. You will also find all the notifications in app. | जब ऐप की सूचना आप तक नहीं पहुँचेगी, तब TWT वह सूचना व्हाट्सएप पर भेजेगा। सभी सूचनाएँ आपको ऐप में भी मिलेंगी। |
| `waSignup.box_label` | Send me WhatsApp messages from TWT | मुझे TWT से व्हाट्सएप संदेश भेजें |
| `waSignup.box_hint` | If you tick this, WhatsApp will open with pre-composed short message, that you have to send to TWT to finish WhatsApp registration. You can turn it off any time on the home screen, under "WhatsApp notifications", or by replying STOP on WhatsApp. | टिक करने पर व्हाट्सएप एक पहले से लिखे छोटे संदेश के साथ खुलेगा। व्हाट्सएप पंजीकरण पूरा करने के लिए यह संदेश TWT को भेजें। आप इसे कभी भी होम स्क्रीन पर "व्हाट्सएप सूचनाएँ" में, या व्हाट्सएप पर जवाब में STOP भेजकर बंद कर सकते हैं। |
| `waSignup.popup_title` | Continue without WhatsApp? | व्हाट्सएप के बिना आगे बढ़ें? |
| `waSignup.popup_body` | If an important notice, such as a payment reminder, cannot reach you as an app notification, TWT can send it on WhatsApp. You will also find all the notifications in app. | अगर कोई ज़रूरी सूचना, जैसे भुगतान की याद, ऐप की सूचना के रूप में आप तक नहीं पहुँचेगी, तो TWT उसे व्हाट्सएप पर भेज सकता है। सभी सूचनाएँ आपको ऐप में भी मिलेंगी। |
| `waSignup.popup_back` | Go back and tick the box | वापस जाएँ और बॉक्स पर टिक करें |
| `waSignup.popup_proceed` | Continue without WhatsApp | व्हाट्सएप के बिना आगे बढ़ें |
| `waSignup.popup_a11y` | Choose whether to continue without WhatsApp | चुनें कि व्हाट्सएप के बिना आगे बढ़ना है या नहीं |
| `waSignup.sent_title` | Send the message in WhatsApp | व्हाट्सएप में संदेश भेजें |
| `waSignup.sent_desc` | Send the message from the WhatsApp to TWT to receive important notifications. You can continue here. | ज़रूरी सूचनाएँ पाने के लिए व्हाट्सएप से यह संदेश TWT को भेजें। आप यहाँ आगे बढ़ सकते हैं। |
| `waSignup.continue` | Continue | आगे बढ़ें |
| `waOtherPhone.link` | WhatsApp on another phone? | व्हाट्सएप दूसरे फ़ोन में है? |
| `waOtherPhone.desc` | From the phone that has your WhatsApp, send this message to {number}: | जिस फ़ोन में आपका व्हाट्सएप है, उससे यह संदेश {number} पर भेजें: |
| `waOtherPhone.note` | It must come from your registered number. Small or capital letters both work. | यह संदेश आपके पंजीकृत नंबर से ही आना चाहिए। छोटे या बड़े अक्षर, दोनों चलेंगे। |
| `waSignup.request_failed` | We couldn't set up WhatsApp just now. You can continue for now, and turn it on later from the home screen, under "WhatsApp notifications". | अभी व्हाट्सएप चालू नहीं हो सका। फ़िलहाल आप आगे बढ़ सकते हैं, और बाद में होम स्क्रीन पर "व्हाट्सएप सूचनाएँ" में इसे चालू कर सकते हैं। |
| `waSignup.link_failed` | WhatsApp did not open. You can continue for now, and turn WhatsApp messages on later from the home screen, under "WhatsApp notifications". | व्हाट्सएप नहीं खुला। फ़िलहाल आप आगे बढ़ सकते हैं, और बाद में होम स्क्रीन पर "व्हाट्सएप सूचनाएँ" में व्हाट्सएप संदेश चालू कर सकते हैं। |

Re-used, ⛔ re-minted: `waNotifications.pending_resend` (*"Open WhatsApp again"*). The quoted entry name is
`waNotifications.entry_label`'s value (en *"WhatsApp notifications"*, hi *"व्हाट्सएप सूचनाएँ"*) — if that label changes, these strings
change with it. In JSON the inner quotes are escaped (`\"`). ⚠ The factual claims, as FOUND by validate v1.4 (Task 0.1 S3 re-checks
they still hold): *"such as a payment reminder"* — `deadline_reminder` goes through the push → WhatsApp → SMS ladder (F7a) and is in
§3.4's UTILITY scope (*"Scope: Meta UTILITY templates only — payment reminder, payout issued, claim accepted, expiry warning, membership
lapse"*); *"when an app notification does not reach you"* — WhatsApp is the fallback rung, ⛔ a mirror (F7a); *"You will also find all
the notifications in app"* (v1.5, BigDev's wording) — R10(B) (the app is the channel of record) and the in-app surfaces named in F7a;
⚠ there is ⛔ notification inbox, so "notifications" means the notices on their own screens (contribution card, peer-request entry,
helpdesk), ⛔ a list; *"TWT will send"* (`intro`) — holds only for a switched-on Pariwar with approved templates (F7b, SB9 (c)/(d)). `continue` is ⛔ in `common.json` (it is `workplace.json`'s), so the step
mints `waSignup.continue`.

## Acceptance Criteria

**AC1 — A separate, unticked box on its own step (I1, I2; SB2).** Given a new member who has passed PREV (SB2), when the Pariwar's
WhatsApp is available and the member has no ACTIVE yes, then PREV routes to `'/(signup)/whatsapp'`, which shows `waSignup.title`,
`intro`, a checkbox (`accessibilityRole="checkbox"`, `accessibilityState.checked === false`) labelled `box_label` with `box_hint`, and a
Continue button. `WIZARD_STEPS` has seven entries with `'whatsapp'` placed per SB2 — under (d)
`['tc', 'kyc', 'workplace', 'nominees', 'medical', 'whatsapp', 'payment']` (layout: *Step 6 of 7*); under (a)
`['tc', 'whatsapp', 'kyc', 'workplace', 'nominees', 'medical', 'payment']` (*Step 2 of 7*). Re-entering the step shows the box
unticked again. *Legs:* render test (initial unticked state; the label/hint keys); the `WIZARD_STEPS` order assertion in
`workplace.test.ts` amended (F18a); PREV's literal.

**AC2 — Skipped where there is nothing to offer (I5; SB3).** Given `getWaOptInStatus()` returns `available: false`, OR `state:
'ACTIVE'`, OR rejects, OR does not settle within `STATUS_TIMEOUT_MS` (5 s), then the step calls `router.replace(NEXT)` and renders
neither the box nor the reminder; while loading it shows a spinner only. *Legs:* one per branch (four), each asserting the replace and
that `requestWaOptIn` was ⛔ called; the timeout leg uses fake timers and asserts the replace lands at 5 s, ⛔ 15.

**AC3 — The reminder, once, even-handed (I1, I4; SB4).** Given the box is unticked, when Continue is pressed the first time, then a
rendered overlay (`accessibilityViewIsModal`, ⛔ `Alert.alert`) shows `popup_title`, `popup_body` and two buttons `popup_back` then
`popup_proceed` that differ ONLY in label, handler and testID (neither `theme="accent"`). "Go back" closes it and the box is STILL
UNTICKED; a second unticked Continue on the step proceeds to NEXT with no overlay. "Continue without WhatsApp" proceeds to NEXT. Neither
path calls `requestWaOptIn`. *Legs:* overlay renders; ⭐ the `Button` mock records each button's FULL props object by `testID`, and the
leg asserts `omit(back, ['children','onPress','testID','accessibilityLabel'])` deep-equals the same for proceed, and `theme !==
'accent'` on both (⛔ a comparison over a hand-picked prop list — two buttons differing in `variant` / `chromeless` / `bg` /
`fontWeight` / `borderColor` / `icon` would pass it); go-back leaves `checked === false`; second-Continue skips the overlay; proceed
routes; `Alert.alert` never called; Android back while the overlay is open closes it and the box stays unticked (and the listener is
removed after — `mock.backHandlers` empty).

**AC4 — Unticked never blocks signup (I2).** The member reaches NEXT without ticking, and `payment.tsx`'s `LockInGateStep` is unchanged
(no `'whatsapp'`). *Legs:* AC3's proceed leg; a source/type assertion or grep note that `LockInGateStep` is byte-unchanged.

**AC5 — A tick asks, the member's WhatsApp message answers (I3; SB1 (a), SB6).** Given the box is ticked, when Continue is pressed, then
`requestWaOptIn()` is called ONCE (bounded), `Linking.openURL(res.deepLink)` is called with the returned link, and the step shows
`sent_title` / `sent_desc`, *"Open WhatsApp again"* and Continue (→ NEXT). No change under `apps/api/src`, `packages/contracts/src`,
`packages/domain/src`, `apps/jobs/src` or the migrations. *Legs:* the call sequence; the sent stage; ⭐ *"Open WhatsApp again"*
re-opens the SAME `deepLink` with `requestWaOptIn` still called exactly once (SB6), and a rejected re-open shows `link_failed`;
Continue routes.

**AC6 — Every failure still lets the member continue (I5; SB6).** Mint rejects with `ApiError` 409 `wa_opt_in.already_active` →
NEXT at once; 409 `wa_opt_in.channel_unavailable` → NEXT at once; any other rejection (incl. `wa_opt_in.no_mobile`,
`wa_opt_in.invalid_display_number`) or a timeout → `request_failed` (`accessibilityRole="alert"`) and the next Continue → NEXT with NO
second mint; `Linking.openURL` rejects → `link_failed` and the next Continue → NEXT with no second mint. A double tap on Continue issues
ONE mint (a `useRef` busy guard). *Legs:* one per outcome, the mocks rejecting with REAL `ApiError` instances
(`new ApiError(409, code, msg)`); the no-second-mint leg; ⭐ the double-tap leg fires BOTH presses inside ONE `act()`
(`await act(async () => { fireEvent.click(b); fireEvent.click(b) })`) so the second press sees the pre-update closure — a state-only
guard passes two separate `fireEvent.click`s because the mock `<button disabled>` swallows the second; prove it RED with a state-only
guard.

**AC7 — The words (SB5).** All `waSignup.*` and `waOtherPhone.*` keys exist in en AND hi `common.json`; every `t('…')` key in
`whatsapp.tsx` and `OtherPhoneHint.tsx` resolves through the REAL `t()` (a copy-key test on the 5.12 precedent, with a positive
control) — ⛔ a stub transcription ([[feedback_stub_must_call_not_transcribe]]); keys are LITERAL in source (⛔ `` t(`waSignup.${x}`) ``),
and the test asserts the scanned key set EQUALS the expected list (every `waSignup.*` + `waOtherPhone.*` + `waNotifications.pending_resend`
used), so a key the regex cannot see fails it; `t()` is called with `PARAMS = { number: '+91 98765 43210' }` (F18 — the resolver throws on
`{number}` without it); the microcopy gate passes on the new strings; no string tells the member they will miss something without
WhatsApp, and none names "Settings" (F14). *Legs:* the copy-key test; the parity check; the microcopy gate output in the Debug Log.

**AC8 — Accessible (I4).** The checkbox announces its checked state; the overlay is modal to assistive tech; errors render as
`AnnouncedText kind='error'` (`components/peer-request/announce.tsx` — a LINE: Android live region OR iOS announce, never both); the
overlay's title on open and the `sent` stage are PHASE changes with ⛔ live region ⇒ `useAnnounceOnChange` (spoken on BOTH platforms,
`announce.tsx:18-22`), each once. *Legs:* render-test props + an `AccessibilityInfo.announceForAccessibility` spy, run under both
`Platform.OS` values (the mutable-`OS` mock, F19).

**AC9 — The premise the screen rests on, through the REAL signup path (F7, F19a).** The existing legs (`wa-opt-in.spec.ts:110`, `:150`)
already prove a projected `pending-kyc` member mints and a disabled config gives 409; this AC's added value is the SEED: a member created
by `POST /api/v1/member/auth/signup/create` (the `signup-create.spec.ts` helpers, copied file-locally or moved to a shared test helper;
`createTestApp({ env: { DEFAULT_SIGNUP_PARIWAR_ID } })`; a FRESH random Pariwar per test — ⛔ toggle `pariwar_wa_config` on the shared
Pariwar; the config seeded by the `seedMemberWithConfig` SQL; an `inject` that carries a payload; under SB2 (d) the member is then driven
to `pending-fee` by appending `member.kyc_completed` the way the existing specs do, so the leg proves the state the step really sees —
F7) mints a PENDING (200, a `deepLink`)
when that Pariwar's WhatsApp is enabled, and gets 409 with `(res.body.error as Json).code` = `'wa_opt_in.channel_unavailable'` (the
spec's own style, `:350`; no current leg asserts this code) when it is not. *Legs:* the two cases.

**AC10 — Settings unchanged in behaviour (SB7, SB10).** `notifications.tsx` imports `withTimeout` / `CALL_TIMEOUT_MS` from
`lib/with-timeout.ts`; its existing render-test legs pass unmodified (AC12 ADDS legs); its UI and copy are unchanged apart from AC12. *Legs:* the existing suite green; a
unit test of `with-timeout.ts` (settles, rejects on timeout, clears its timer).

**AC11 — Records and gates (SB9, SB11).** The decision committed ALONE before any code; the records commit (epics.md entry, §3.4 dated
note, ADR-0029 annotated row, roster row `wa-signup-box-hindi-reviewed` with legs (a)–(d), friction-budget row, ledger) before code;
`pnpm friction:check` run AFTER the commit reports AC-4 basis `row` (*"a declaration row changed (1 added/amended)"*), ⛔ only *"a new
story disposition was recorded"* (F17); `ci:local` green on :5433 at the final commit with `DATABASE_URL` set (⛔ `env -u` — that SKIPS
integration-tests, 5.12 F21); `tsc` run both with and without typed routes (F20).

**AC12 — Another phone (SB12).** On the signup step's `sent` stage, and on Settings' PENDING state, a `waOtherPhone.link` control
(collapsed by default) reveals `waOtherPhone.desc` (with the number), the phrase in a SELECTABLE text element (`selectable`), and
`waOtherPhone.note`. Signup takes both values from the mint response (no extra call); Settings from the status response, passed into
`OptInBody` as `displayPhoneNumber` / `verificationPhrase` (both `string | null`); the hint renders only when BOTH are non-null. Nothing is
shown in any other state. No change under `apps/api/src`, `packages/contracts/src`, `packages/domain/src`, `apps/jobs/src` or the
migrations. *Legs:* signup — collapsed, then revealed with the mocked mint's number + phrase, the phrase element carrying `selectable`
(the `Text` mock FORWARDS `selectable`, or the leg is vacuous — F19); Settings — revealed in PENDING, absent in ACTIVE / null, absent in
PENDING when either value is null; the copy-key tests cover `waOtherPhone.*`.

## Tasks / Subtasks

- [x] **Task 0 — Preflight, decisions, governance (AC11)**
  - [x] 0.1 (DONE 2026-10-21 — Debug Log (e)) `git fetch origin`; if `main` moved past the pin, rebase and re-derive F1–F20 (`sed -n` every cite, read past the range). STOP
        and report to BigDev if:
        **S1** the mint gained a member-state guard, or `requireMemberSession` refuses the state PREV leaves the member in (`pending-kyc` under SB2 (a), `pending-fee` under (d) — F7) — SB1 (a) then needs an API change;
        **S2** another branch/worktree edits `lib/wizard-steps.ts`, PREV's next route (`tc.tsx` / `medical.tsx`) or `notifications.tsx`
        (`git for-each-ref` + `git diff`);
        **S3** the words' factual claims, as FOUND at v1.4 (SB5's note), no longer hold — `deadline_reminder` no longer goes through the
        push → WhatsApp → SMS ladder (F7a), WhatsApp became a mirror (the words would then UNDER-state it — reword, ⛔ STOP), or the
        home tab's *"WhatsApp notifications"* entry moved / was renamed (F14);
        **S4** a `waSignup.*` key is already taken in either locale (`grep -n '"waSignup\.' packages/i18n/locales/*/common.json`);
        **S5** any routing note or told item after the pin mentions the signup box (`git log 20fcb479..origin/main -- _bmad-output/planning-artifacts`).
  - [x] 0.2 (DONE 2026-10-21 — Debug Log (a)) Put SB1–SB11 and PQ1 to BigDev — ⭐ incl. the v1.4 revisions: the words (SB5), the placement (SB2 (a) vs (d)), the label
        cost (SB3 (a) vs (c)), the roster legs (SB9 (b)–(d), and (d-i) vs (d-ii)); record the answers VERBATIM in Debug Log (a), and
        write PREV / NEXT (SB2) at the top of Debug Log (a) — every later Task reads them. If SB1 (b) or PQ1 "yes": STOP — write the
        routing note from the template (§0 first); do not build SB1 until it is ruled.
  - [x] 0.3 (DONE 2026-10-21 — `2026-10-21-375`, committed alone `ae4fbaf7`) Author-commit decision (the next free id — re-grep `^### Decision` on `main`, every branch, every worktree), staged in the
        scratchpad first ([[project_decision_log_writes_user_inserted]]); carries SB1–SB11 as answered, the §0 reading (matches both
        ratified texts) AND the stated departure from the row-5-10 / `-364` "Not covered" framing (see the header), PQ1's answer, "Supersessions: none", and what it does NOT cover (counsel's view; SB1 (b)). Committed ALONE
        (`governance:` prefix); its SHA written only after.
  - [x] 0.4 (DONE 2026-10-21 — Row 38) Records commit: `epics.md` `### Story 5.10` (post-hoc, after 5.9, 5.12's format); §3.4 dated note under the opt-in bullets
        (the bullets unedited); ADR-0029 changelog "annotated" row; roster row `wa-signup-box-hindi-reviewed` (next free Row; Row 37's shape;
        legs (a)–(d) per SB9 as answered); the friction-budget row (Task 5); ledger entry (safe prepend —
        [[project_sprint_status_safe_prepend]]); row `5-10-…` `ready-for-dev → in-progress`.
- [x] **Task 1 — The timeout helper (SB10; AC10)**
  - [x] 1.1 `apps/mobile/lib/with-timeout.ts`: `CALL_TIMEOUT_MS = 15_000` and `withTimeout<T>(promise, ms)` moved with the body
        unchanged apart from `export` and a domain-neutral rejection message (the timer cleared on settle); its own unit test.
  - [x] 1.2 `notifications.tsx` imports them; remove the local copies; its render + copy-key tests pass unmodified.
- [x] **Task 2 — The words (SB5; AC7)**
  - [x] 2.1 Add the `waSignup.*` and `waOtherPhone.*` keys (flat dotted keys, F18) to en + hi `common.json` (hi as the DRAFT above,
        marked nowhere in the JSON — the roster row tracks review; inner quotes escaped); hand-format ([[project_prettier_not_enforced]]).
  - [x] 2.2 Run the parity check and the microcopy gate; fix wording (⛔ the rule) if it bites.
- [x] **Task 3 — The step (SB1–SB4, SB6; AC1–AC6, AC8)**
  - [x] 3.1 `lib/wizard-steps.ts`: insert `'whatsapp'` per SB2 (before `'payment'` under (d); after `'tc'` under (a)); a dated comment
        line (Story 5.10, the decision id). Amend `tests/unit/workplace.test.ts:41-42`'s order assertion to the seven steps with a dated
        comment (F18a) — ⛔ delete it.
  - [x] 3.2 PREV's next-route literal → `router.replace('/(signup)/whatsapp')` (`medical.tsx:54` under (d); `tc.tsx:128` under (a)).
  - [x] 3.3 NEW `app/(signup)/whatsapp.tsx`: stages `loading → ask → sent`; the status load (bounded; AC2 branches → NEXT); the
        checkbox (F4 pattern); Continue with a `useRef` busy guard; the reminder overlay (BannerHost's SHAPE copied, ⛔ imported — T10; a
        SIBLING of the ScrollView; a `shownOnce` flag; a `BackHandler` listener while open); the tick path (`requestWaOptIn` →
        `Linking.openURL`, both caught; codes via `ApiError`; the first mint's `deepLink` kept for *"Open WhatsApp again"*); the one-mint
        rule and outcomes of SB6; errors via `AnnouncedText kind='error'`, the overlay title and `sent` stage via `useAnnounceOnChange`
        (AC8); `STATUS_TIMEOUT_MS = 5_000` for the status read; `const router = useRouter()` (the `tc.tsx:20,68` form). ⚠ `t` NOT in any
        effect's deps — depend on `locale` (T1). Header comment cites the decision id and SB letters.
  - [x] 3.4 `_layout.tsx`: refresh the stale order comment with a dated line (F3); code unchanged (SB3 (a)) — under SB3 (c) the count
        logic changes too, per the answer.
  - [x] 3.5 SB12 / AC12: a small shared component `apps/mobile/components/notifications/OtherPhoneHint.tsx` (beside
        `NotificationSettingsEntry.tsx`; props `displayPhoneNumber`, `verificationPhrase`; collapsed by default; the phrase in a
        `selectable` text) used by `whatsapp.tsx`'s `sent` stage and `notifications.tsx`'s PENDING branch — WIDEN `OptInBody`'s props with
        both values (`string | null`) and render the hint only when BOTH are non-null (F12). Add `waOtherPhone.*` (en + DRAFT hi) in Task 2.
- [x] **Task 4 — Tests (AC1–AC10, AC12)**
  - [x] 4.1 NEW `apps/mobile/tests/unit/wa-signup-step-render.test.ts` — `.test.ts` with `createElement` (⛔ JSX; F19); jsdom; RTL
        `cleanup`; the real `LocaleProvider`; mocked `lib/mmkv`, `lib/member-api`. Harness from `peer-questionnaire-render.test.ts:35-63`
        (F19): `BackHandler` + `mock.backHandlers` + `hardwareBack()`, a mutable-`OS` `Platform`, the checkbox stub; plus `react-native`
        `Linking` / `Alert` / `AccessibilityInfo` / `StyleSheet: { absoluteFill: {} }`; `expo-router`'s `useRouter: () => mock.router`
        with a STABLE `mock.router = { replace: vi.fn() }` from `vi.hoisted`; `tamagui` exporting every primitive the screen and
        `OtherPhoneHint` import (incl. `View`, `XStack` if used — a missing mocked export throws), whose `Button` RECORDS its full props
        per `testID` (AC3) and whose `Text` forwards `selectable` (AC12); mint rejections are real `ApiError`s. Every AC1–AC6 / AC8 /
        AC12-signup leg; ⭐ prove each leg RED once (break the code, see it fail) and note it in Debug Log (b).
  - [x] 4.2 NEW `apps/mobile/tests/unit/wa-signup-copy-keys.test.ts` (real `t()`, both locales, positive control; scans `whatsapp.tsx`
        AND `components/notifications/OtherPhoneHint.tsx`; `t(key, PARAMS, …)` with `PARAMS = { number: '+91 98765 43210' }` — the
        `workplace-copy.test.ts:93` precedent; asserts the scanned key set equals the expected list — AC7).
  - [x] 4.3 AC9's two live-DB legs in `apps/api/tests/integration/wa-opt-in/wa-opt-in.spec.ts`, seeded through the real signup path
        on a fresh Pariwar (F19a).
  - [x] 4.4 `lib/with-timeout` unit test (AC10).
  - [x] 4.5 AC12 legs: in the new signup render test, and ADDED to `wa-notifications-screen-render.test.ts` — its mocks EXTENDED for every
        primitive `OtherPhoneHint` imports and its `Text` mock forwarding `selectable` (a mock change, ⛔ a change to any existing leg; F19).
        In `wa-notifications-copy-keys.test.ts`: add `components/notifications/OtherPhoneHint.tsx` to `FILES` and change ONLY the
        `t(key, undefined, …)` call to pass `PARAMS` (F18) — its assertions untouched.
- [x] **Task 5 — Friction ledger (F17; AC11)** — ONE new row appended as the LAST line of the FIRST ledger table in `friction-budget.md`
      (the contiguous `|` lines under the `| payer | protects | event_type |` header — ⛔ anywhere else; F17) (payer: a new member of a
      Pariwar with WhatsApp on — one more signup screen, and for a member who leaves the box unticked one reminder; protects: a WhatsApp
      yes asked for plainly and never pre-ticked; event_type: `forced` — every such member passes the screen, the 6.36a `workplace`
      precedent). The app switch after a tick is ALREADY covered by the 5.4 row *"member (opting in to WhatsApp notifications …) | … |
      optional"* — named in the disposition, ⛔ amended. Plus a "**Story 5.10 disposition (…)**" paragraph naming the files, on the 6.36a
      precedent. After COMMITTING, run `pnpm friction:check`; its AC-4 line must read *"… a declaration row changed (1 added/amended) …"*
      (basis `row`) — record it in Debug Log (c).
- [x] **Task 6 — Close the records and the gate (AC11)** (DONE 2026-10-21 — Debug Log (c), (f); ⚠ the PUSH is ⛔ done — held for BigDev's go-ahead) — `ci:local` on :5433 with `DATABASE_URL` set; `tsc` both ways (F20); push with
      `DATABASE_URL` on :5433 ([[project_prepush_hook_inherits_5432]]); story STATUS line, File List, Change Log; ledger; row → `review`.

### Review Findings

Code review 2026-10-21 (`bmad-code-review 5.10`), target `20fcb479..2215e276`; all three layers completed
(Blind Hunter, Edge Case Hunter, Acceptance Auditor). **0 decision-needed, 5 patch, 0 defer, 1 dismissed.**
These are engineering corrections; none needs a Trustee Panel ruling under the routing template's §0.

- [x] [Review][Patch] **R1 · P2 — Make the reminder modal to TalkBack.** [apps/mobile/app/(signup)/whatsapp.tsx:180] —
      AC8: `accessibilityViewIsModal` is iOS-only; the underlying ScrollView remains in Android's accessibility tree. With the
      reminder open, TalkBack can still reach and activate its obscured checkbox and Continue. Hide the background descendants
      from accessibility while the reminder is open and preserve both reminder buttons as separate controls. The existing mock
      maps the iOS-only prop to `aria-modal` on both OS values, so it cannot detect the native gap. Sources: blind + edge + auditor.
- [x] [Review][Patch] **R2 · P2 — Ignore a mint response after the member leaves the step.** [apps/mobile/app/(signup)/whatsapp.tsx:111] —
      The status read has an unmount guard, but the mint does not. Start a request, leave/unmount the step, then let it settle:
      success still launches WhatsApp; either handled 409 still calls `goNext()` and replaces the current screen with payment.
      Guard the asynchronous continuation and navigation against departure; test delayed success and both 409 codes after leaving.
      Source: blind; independently reproduced by the parent for all three outcomes.
- [x] [Review][Patch] **R3 · P2 — Keep reminder choices reachable when content exceeds the screen.** [apps/mobile/app/(signup)/whatsapp.tsx:234] —
      I5 / AC3: the centered card is inside a fixed, absolute-fill overlay with no scrolling or height bound. On a short landscape
      viewport or with enlarged system text, the title, Hindi body and two 56px buttons can exceed the available height, leaving
      choices clipped with no way to scroll to them. Bound the card to the available height and make its content scrollable while
      retaining equal button styling. Structural finding; exact device/font combinations remain unverified. Sources: blind + edge.
- [x] [Review][Patch] **R4 · P2 — Deliver the reminder's labelled accessibility instruction.** [apps/mobile/app/(signup)/whatsapp.tsx:240] —
      Checklist family 13(a), applied alongside AC8: the container has `accessibilityLabel={t('waSignup.popup_a11y')}` without
      explicit `accessible={true}`. Put this instruction on a dedicated accessible noninteractive element (or announce it through
      the existing phase mechanism); do not group the entire button-bearing overlay and swallow its independent choices. Add a
      native-prop assertion; the current mock forwards every container label regardless of accessibility-element status. Source: auditor.
- [x] [Review][Patch] **R5 · P3 — Make the destination number selectable as SB12 requires.** [apps/mobile/components/notifications/OtherPhoneHint.tsx:42] —
      Accepted SB12 says the number and phrase appear as selectable text, but the number is interpolated into a Paragraph without
      `selectable`; only the phrase is selectable. This affects signup and Settings. Make the number-bearing text selectable and
      extend the tests beyond the phrase-only AC12 assertion. Sources: edge + auditor.

**Patch disposition (2026-10-21, BigDev: "1" — apply every patch):** R1–R5 are resolved. The final full CI run passed all **36 jobs**,
including the live integration-tests job on **:5433**; story and sprint row are `done`. Changes remain local and uncommitted. R1 hides the background ScrollView's descendants on Android and iOS while the reminder is open;
R4 moves its label onto an explicitly accessible heading, leaving both actions independent. R3 puts the card inside a ScrollView
bounded to the overlay height. R2 invalidates pending action continuations on navigation blur/unmount (including blur then refocus),
checking the generation before opening WhatsApp, applying errors/stage changes, or navigating; a later Continue still moves on without
minting again. R5 makes the number-bearing Paragraph selectable in the shared hint. The signup harness now records native view props,
models navigation focus/blur, and treats `accessibilityViewIsModal` as iOS-only. Eighteen new regression cases bring its suite from
31 to 49; signup and Settings both assert selectable destination text. The full mobile suite passes **1172/1172**, and mobile
lint/typecheck pass. Family 1's review gap is now **covered-by-test** by `Review R2 — a response belongs to the visit that requested it`;
family 13's gaps are now **covered-by-test** by the expanded AC8 background-hiding/explicit-heading checks and the R3 bounded-scroll
case. The original verdicts below describe the reviewed baseline. Native layout/screen-reader behavior remains unverified on a device.

**Validation:** six existing mobile suites pass, **90/90 tests** (`wa-signup-step-render`, `wa-signup-copy-keys`, `with-timeout`,
`wa-notifications-screen-render`, `wa-notifications-copy-keys`, `workplace`). The two Story 5.10 AC9 integration cases pass against
the local dev DB on **:5433** (nine unrelated cases deselected); the first sandboxed attempt was blocked by EPERM, then the permitted
rerun passed. Those cases create fresh dev-only fixture rows as documented in Debug Log (d). Review-only regression probes live in
`/private/tmp/twt-5-10-review-tests/` and leave production/test source untouched: delayed success and both 409s after unmount, absent
Android background hiding, the labelled container's absent explicit accessibility flag, and the unselectable number each expose the
reported gap. These probes verify behavior/props with mocked native primitives, not a real screen reader. No device validation or
new full `ci:local` run is claimed.

**Final validation after the patches:** `DATABASE_URL=…127.0.0.1:5433/twt_dev pnpm ci:local` passed **36/36 jobs** on the
working tree based on `2215e276`, including lint, typecheck, build, mobile **77 files / 1172 tests**, all static gates, and the live
integration job (domain **6027 passed / 1 skipped**, jobs **1338 passed**, API **2001 passed / 1 skipped**, including all **11** WhatsApp opt-in
integration cases). Log: `/private/tmp/twt-5-10-review-ci.log`. No production/test source changed during that run; only these review
records were completed afterwards. The reviewed five findings are checked off above; no decision or deferral remains from this review.

**Dismissed:** the proposed permanently hung `Linking.openURL` failure has no demonstrated production trigger. Installed React
Native's Android `IntentModule.openURL` resolves/rejects directly after starting the intent; iOS settles from its OS completion
callback. An arbitrarily never-settling mock alone does not establish the reported P1 defect. No speculative hang finding is carried.

**Load-bearing-invariant lens (touched families only):**

| Family | Verdict and evidence |
|---|---|
| 1 — State/guards | **REAL GAP:** R2; a completed request still performs side effects after the screen's lifetime ends. Other loading/mint outcomes are covered by the AC2/AC6 render cases. |
| 2 — Concurrency/idempotency | **covered-by-test:** one-act double-tap case, unticked double-tap case, and reopen retaining one mint. No worker or DB concurrency path changes. |
| 3 — Tenant/actor boundaries | **covered-by-construction:** existing authenticated bodyless member endpoint; no caller-supplied tenant/member ID or new mutation route. AC9 proves the actual pending-fee signup session works. |
| 6 — Projection/snapshot | **covered-by-construction:** explicit number/phrase prop picks from the authenticated response; AC12 cases cover state/null restrictions. |
| 8 — Audit/attribution | **covered-by-construction:** no server writer changed; the existing audited mint and worker consent/activation transaction remain the writers. |
| 10 — Closure honesty | **covered-by-construction:** device/counsel/pre-existing limitations disclosed, Row 38 open, row 5-13 explicitly unbuilt; commit history confirms decision alone, then records, then code. |
| 11 — Policy meaning | **covered-by-construction:** the story states the member meaning; the new condition controls the convenience-channel offer, while payment eligibility is unchanged and covered by AC4's source assertion. |
| 12 — Cross-member ownership | **covered-by-construction:** no client-supplied resource IDs; displayed values come from the member-scoped mint/status responses. |
| 13 — Semantic accessibility | **REAL GAP:** R1/R3/R4. Checkbox checked state, phase announcements and error announcements otherwise have AC8 render cases under both OS values. |

## Dev Notes

### ⚠ TRAPS

- **T1 — `useT()` returns a fresh closure every render** — `t` in an effect's deps re-runs it forever (5.12 F13a: 4,396 fetches in
  300 ms). Depend on `locale`; test under the REAL `LocaleProvider` ([[project_uset_fresh_closure_memo_trap]]).
- **T2 — The transport has no timeout** — bound the status read AND the mint (5.12 P1); a `withTimeout` rejection is "failed", so AC2 /
  AC6 apply ([[project_tanstack_refetch_rejoins_hung_fetch]]).
- **T3 — `Linking.openURL` resolves before WhatsApp's message is sent**, and for the `https://wa.me/…` link it usually RESOLVES even
  with no WhatsApp installed (a browser opens — F8c); it rejects only when nothing can open the link. Always catch (5.4 review); never
  infer the yes from it, and never treat a resolve as "WhatsApp opened".
- **T4 — Clear an error in the SAME update as the new state** (5.12 P4 / `dea4e5d1` — a later-effect clear raced a frame and failed
  `ci:local`).
- **T5 — "Go back" must NOT tick the box.** Ticking on the member's behalf is a pre-ticked box by another name (I1). AC3 pins it.
- **T6 — Typed routes:** the `'/(signup)/whatsapp'` literal compiles in a worktree even if wrong (F20) — run `tsc` with `.expo/types`
  generated too.
- **T7 — A JSDoc closed by markdown emphasis** (`**…**/`) — grep comments after editing ([[project_markdown_emphasis_closes_jsdoc]]).
- **T8 — Fabric FlatList** — if the step ever lists anything, render loading / error OUTSIDE the list
  ([[project_fabric_flatlist_empty_populated_crash]]); the recommended screen has no list.
- **T9 — A mobile edit needs a friction row or disposition** (F17) or the gate fails — and a row outside the first ledger table is
  silently ignored while the disposition alone turns the gate green (F17).
- **T10 — `components/banners/*` is SHA-256-pinned** (`panchayat-noticeboard-render.test.ts`, *"does NOT edit ANY of the four
  `components/banners/*` files"*: `BannerHost.tsx`, `copy.ts`, `useMemberBannersQuery.ts`, `route-suppression.ts`). Copy BannerHost's
  overlay SHAPE into the new screen; ⛔ edit it, ⛔ extract a shared overlay from it.
- **T11 — A test can pass vacuously on this screen in four ways** (F19): a props comparison over a hand-picked list (AC3), two separate
  clicks on a mock `<button disabled>` (AC6), a `useRouter` mock that returns a new object per call, a `Text` mock that drops
  `selectable` (AC12). Each AC names the form that bites.
- **T12 — WhatsApp is a fallback, ⛔ a mirror** (F7a) — ⛔ write words, comments or tests that say a member "also" gets WhatsApp.

### Reuse map

| Need | Use | ⛔ Rebuild |
|---|---|---|
| Ask for WhatsApp | `memberAuth.requestWaOptIn()` + `Linking.openURL(deepLink)` | a new route / writer |
| Tell 409 codes apart | `err instanceof ApiError && err.code` (`@twt/api-client`; `otp.tsx:70`) | string-matching messages |
| Android back on the overlay | `BackHandler` (`PeerQuestionnaire.tsx:264`) | — |
| Announce an error line | `AnnouncedText kind='error'` (`components/peer-request/announce.tsx`) | `notifications.tsx`'s unconditional announce |
| Announce a phase change (overlay open, `sent` stage) | `useAnnounceOnChange` (same file — both platforms) | an `announcementPlan` "never both" call |
| Know if WhatsApp is offered | `memberAuth.getWaOptInStatus()` → `available`, `state` | a config read in the app |
| Bound a call | `lib/with-timeout.ts` (SB10; the first SHARED one — F12a) | a fourth local copy |
| Resend | the first mint's `deepLink` (Settings' `onReopen`, F12) | a second mint |
| Checkbox | `tc.tsx`'s Button-as-checkbox (F4) | a new primitive |
| Popup | `BannerHost`'s overlay shape, copied (F16, T10) | `Alert.alert`; an extraction from `components/banners/*` |
| Copy-key test | `wa-notifications-copy-keys.test.ts` + `PARAMS` (`workplace-copy.test.ts:93`) | a stubbed `t` |
| Render harness | `peer-questionnaire-render.test.ts:35-63` (BackHandler / Platform / checkbox) + `wa-notifications-screen-render.test.ts` (LocaleProvider, mmkv, member-api) | new mocks from scratch |
| Signup in an API test | `signup-create.spec.ts` helpers + `seedMemberWithConfig`'s SQL (F19a) | a projected member (AC9's point is the real path) |

### Testing standards

Mobile: vitest, `tests/unit/**/*.test.ts` only (render tests use `createElement`, ⛔ JSX; tests are outside `tsc`), jsdom opt-in, RTL
`cleanup` ([[project_mobile_vitest_and_expo_install_traps]]). API live-DB:
`*.spec.ts`, skipped without `DATABASE_URL`; use :5433; never regenerate an applied migration (none is planned). Prove each new leg RED
once. `ci:local` with `DATABASE_URL` on :5433 (`env -u DATABASE_URL` skips integration-tests). Contracts tests are outside `tsc` — none
change here.

### Project structure notes

New: `apps/mobile/app/(signup)/whatsapp.tsx`, `apps/mobile/lib/with-timeout.ts`, `apps/mobile/components/notifications/OtherPhoneHint.tsx`
(SB12), two mobile tests + the helper's test. Changed: `lib/wizard-steps.ts`, `tests/unit/workplace.test.ts` (the order assertion), PREV
(`app/(signup)/medical.tsx` under SB2 (d), `app/(signup)/tc.tsx` under (a)), `app/(signup)/_layout.tsx` (comment), `app/(settings)/notifications.tsx`
(import + `OptInBody` props + SB12's hint in PENDING), `tests/unit/wa-notifications-screen-render.test.ts` (mocks extended; AC12 legs
added), `tests/unit/wa-notifications-copy-keys.test.ts` (`FILES` + `PARAMS`), `packages/i18n/locales/{en,hi}/common.json`,
`apps/api/tests/integration/wa-opt-in/wa-opt-in.spec.ts`, `friction-budget.md`, and the records. ⛔ `components/banners/*` (T10).
`lib/` and `components/` (⛔ `app/`) for non-routes — expo-router treats `app/` files as routes. Folders kebab-case, components PascalCase.

### Sequencing

Governance first ([[feedback_governance_commits_precede_implementation]]): 0.3 alone → 0.4 → Tasks 1–5 → 6. Row 5-11 (SMS fallback) is
independent — it touches neither the wizard nor the mint (⚠ but F7b's ladder stop also decides whether row 5-11's SMS ever goes to
an opted-in member — name it to row 5-11's create-story). No other open row edits `wizard-steps.ts`, `tc.tsx`, `medical.tsx`,
`notifications.tsx` or `common.json` at `2f4a4303` (checked across every local branch at v1.4; S2 re-checks).

### Previous story intelligence (5.12, 5.4)

- 5.12 built the lasting yes: `isOptInActive` = ACTIVE (no clock); `lockMemberWaYes`; one ACTIVE per member (0177); every withdrawal ends
  every yes (`endEveryWaYes`). The box inherits all of it unedited (5.12: *"5-10's box reaches members for as long as their yes stands"*).
- 5.12 review lessons that apply to a new screen: bound every call (P1); per-source errors (P3); re-read after a failed action (P4);
  focus-gated polling (P5 — the step does not poll); announce state changes (P6); seed through real paths (P9); `ci:local` at the
  FINAL commit (P14).
- 5.4: the mint and the phrase match; `Linking.openURL` needs a catch; validate the display number before building `wa.me` (done
  server-side in `buildSendHelloDeepLink`).
- Roster Row 37 (b) — counsel on whether the opt-in wording should say how long a yes lasts — reads on the box's words too; SB9 (b)
  does not duplicate it, it adds the DPDP notice/withdrawal question for the box.

### Git intelligence

`origin/main` tip `2f4a4303` (a 5.12 ledger-only commit on top of `20fcb479`); the 15 commits before it are Story 5.12 end to end (created → validated → `-373` alone → records → Tasks 1–7 →
two review rounds `5022a43c`, `b64dd462`, `dea4e5d1`, `1ecf5d65` → told item). The pattern to follow: decision alone, records, tasks in
order, the read change last; fix commits prefixed `fix(wa-opt-in):`.

### Latest tech information (fetched 2026-10-21)

Meta, *Get opt-in for WhatsApp* (developers.facebook.com/docs/whatsapp/overview/getting-opt-in; re-fetched by validate v1.4): *"It
is up to businesses to determine the method of opt-in"*, with examples *"SMS · Website · By phone (… IVR …) · In person or on paper"*;
opt-in *"can be general and not specifically for WhatsApp"*; it must name the business and state that the person is opting in to
receive its messages; *"Businesses may contact people on WhatsApp if: (a) they have given their mobile phone number; and (b) businesses have received opt-in permission from the recipient confirming that they wish to receive subsequent messages or calls from a particular business"*; *"Businesses
must comply with applicable law"*; the tip *"Provide clear instructions … and honor these requests"* for opting out; no expiry; nothing
on checkboxes (the ratified §3.4 rule is stricter). No library changes; Expo / expo-router / tamagui as pinned (tamagui 2.1.0 `Text`
accepts RN `selectable` — ⛔ precedent in `apps/mobile` yet).

### References

- `_bmad-output/planning-artifacts/architecture.md` §3.4 *Member WA opt-in flow* (incl. the dated `-364` / `-373` notes)
- `docs/adr/ADR-0029-whatsapp-webhook-ingress-and-opt-in-lifecycle.md` (Rationale; changelog)
- `.decision-log.md` — `2026-07-08-065` item 4; `2026-10-19-364` (option A; "Not covered"); `2026-10-21-373` d1, d10; `2026-10-17-351`
  "NOT cover" (b); `2026-10-18-357` (the claimant exception); `2026-10-20-367` d19 (DPDPA §5 / §6(4); Row 19 = the claim agreement's notice)
- `_bmad-output/implementation-artifacts/deferred-work.md` — section *"Deferred from: validate of 5-10-signup-whatsapp-opt-in-checkbox.md"*
  (F7b's ladder stop; F8a's unbuilt "surfaced for member confirmation")
- `packages/channels/src/` — `dispatch.ts` (the ladder), `composition/provider-composition.ts`, `providers/fixture-whatsapp.ts` (F7a, F7b)
- `apps/mobile/components/peer-request/announce.tsx`; `apps/mobile/tests/unit/peer-questionnaire-render.test.ts` (harness)
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-17-6-31-how-long-a-whatsapp-yes-lasts.md` — fact (3), §E2b
- `_bmad-output/implementation-artifacts/5-12-whatsapp-yes-lasts-until-withdrawn.md`; `5-4-member-wa-opt-in-via-inbound-webhook-matching-webhook-ingress-primitive.md`
- `_bmad-output/planning-artifacts/ux-design-specification.md` — Pattern 1: Button Hierarchy
- `docs/launch-gate-inventory/inventory-roster.md` — Row 37 (shape), Row 28 (Hindi-review control)
- `sprint-status.yaml` — row block `5-10-signup-whatsapp-opt-in-checkbox` (its 2026-10-19 comment and annotation)

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (`claude-opus-5-5`), `bmad-dev-story 5.10`, 2026-10-21, worktree `.claude/worktrees/5-10`.

### Debug Log References

(a) Task 0.2 answers, verbatim · (b) RED proofs · (c) microcopy / parity / friction gate outputs · (d) dev-DB side effects · (e) Task 0.1 preflight

**(a) Task 0.2 — answered 2026-10-21 (BigDev, in session), verbatim:** *"all recommendation accepted for SB1-SB11 and PQ1"*.

**PREV = `medical` (`app/(signup)/medical.tsx:54` → `router.replace('/(signup)/whatsapp')`); NEXT = `'/(signup)/payment'`** (SB2 (d)).
`WIZARD_STEPS` = `['tc', 'kyc', 'workplace', 'nominees', 'medical', 'whatsapp', 'payment']` — the step is *Step 6 of 7*. The member is
`pending-fee` at the step (F7).

What each answer resolves to (the ⭐ of each SB as it stands at v1.7):
- **SB1 (a)** — a tick = the existing request (mint PENDING) + open WhatsApp with the message to TWT; the member's sent message turns it on.
- **SB2 (d)** — the step is immediately BEFORE `payment`.
- **SB3 (a)** — the step loads the status (5 s bound) and moves straight on when WhatsApp is not offered, the status fails, or the member
  is already ACTIVE; the label jump (*Step 5 → 7 of 7*) and the empty-step announcement are ACCEPTED costs.
- **SB4** — the in-screen reminder, once, two equal buttons in BigDev's order; "Go back" never ticks; Android back = "Go back"; UX
  Patterns 1 (primary-action rule) and 2 (modal discipline) deliberately departed from.
- **SB5** — the 17 strings as reviewed by BigDev (v1.5 / v1.6).
- **SB6** — no waiting in signup; ONE mint; "Open WhatsApp again" reopens the first link; every failure lets the member continue.
- **SB7 (a)** — no change to the "WhatsApp notifications" screen beyond SB12's hint.
- **SB8 (a)** — nothing new recorded on the server.
- **SB9** — roster row `wa-signup-box-hindi-reviewed`, legs (a)–(c) and **(d-i)** (every ladder category approved before a Pariwar is
  switched on); (d-ii) stays with its `deferred-work.md` item.
- **SB10** — `withTimeout` + `CALL_TIMEOUT_MS` extracted to `apps/mobile/lib/with-timeout.ts`.
- **SB11** — one author-commit decision, the `epics.md` entry, a dated §3.4 note, an ADR-0029 annotated row, the friction-budget row,
  the ledger; ⛔ ratified sentence edited.
- **PQ1 — no**: a tick does ⛔ switch WhatsApp on by itself; nothing goes to the Panel on it.

(SB12 was decided in session earlier — v1.3 — and the WhatsApp code it routed was ruled by `2026-10-21-374`.)

**(e) Task 0.1 — preflight, 2026-10-21 (dev session):** `git fetch origin`; `origin/main` = `2f4a4303` = the v1.4 re-derivation
point (an ancestor of HEAD) ⇒ ⛔ rebase, ⛔ re-derivation; `git diff --name-only 20fcb479..origin/main -- packages apps scripts docs/adr
docs/launch-gate-inventory` empty. **S1** clear — `routes.ts` mint `preHandler: [memberSession]` only; `member-session-guard.ts` has ⛔
state check. **S2** clear — the only refs touching `wizard-steps.ts` / `tc.tsx` / `medical.tsx` / `notifications.tsx` / `payment.tsx`
are four June remote branches of `done` stories 3.5 / 3.6a / 3.6b / 3.9 (1,536–1,543 commits behind `main`); ⛔ other worktree.
**S3** clear — `CANONICAL_CHANNEL_LADDER = ['push', 'whatsapp', 'sms']`; `deadline_reminder` still an alert category in
`contribution-notify-triggers.ts`; `NotificationSettingsEntry` still on the home tab; `waNotifications.entry_label` unchanged (en + hi).
**S4** clear — ⛔ `waSignup.*` / `waOtherPhone.*` key in either locale. **S5** clear — ⛔ planning-artifact commit after the pin.
Numbers at Task 0.3/0.4: next free decision `-375` (highest across every ref `-374`), next free roster Row 38 (highest 37); ⛔ migration.

**(b) RED proofs, 2026-10-21.** Each leg was broken once in the CODE and seen to fail, then restored (a scripted sweep — each mutation
applied alone, the file restored after):
- `workplace.test.ts` order assertion amended FIRST → RED (6 steps) → `wizard-steps.ts` → GREEN. `with-timeout.test.ts` RED (module
  missing) → GREEN.
- `wa-signup-step-render.test.ts` (31 legs) — 26 mutations of `whatsapp.tsx` / `OtherPhoneHint.tsx` / `medical.tsx`, 25 caught: box pre-ticked (24
  legs fail); ACTIVE / unavailable not skipped; a failed read showing the ask (2); status bound 15 s; "Go back" ticking the box (2);
  the proceed button `theme="accent"`, `chromeless`, `variant="outlined"` (the full-props comparison — each 1); the reminder every
  time; the back listener never removed; "Open WhatsApp again" minting again; no one-mint rule (5); a state-only busy guard (the
  one-`act()` double tap); the reminder marked `shown` on opening (the unticked double tap); 409 codes not told apart (2); a link
  failure showing the sent stage; the reminder / sent stage not announced (2 each, both OS); the error as a `status` line (6); the
  hint open by default; the phrase not `selectable`; the mint bounded at 5 s; the hint on the ask stage (2); PREV routing to payment.
  ⚠ One SURVIVOR, acted on: a `reminder.current === 'open'` guard in `onContinue` was NOT load-bearing (a second press while the
  reminder is open only re-opens it) — REMOVED; the unticked double-tap leg is proven by the mutation that would skip it.
- `wa-signup-copy-keys.test.ts` — a misspelt key (3 fail), a template-literal key (1), a hi key missing (2). ⭐ Its key-set equality
  caught a real blind spot: the 5.12 precedent's regex `[A-Za-z_]` cannot see `waSignup.popup_a11y` (digits) — widened to `[A-Za-z0-9_]`
  in the NEW test (the 5.12 test's regex left as it was; none of its keys has a digit).
- `wa-notifications-screen-render.test.ts` AC12 legs — no hint in PENDING; a hint in ACTIVE; the both-present check removed (2); the
  phrase not `selectable`: each caught.
- AC9 (`wa-opt-in.spec.ts`, :5433) — the two legs' seeded configs swapped: both fail.

**(c) Gate outputs, 2026-10-21.** `pnpm --filter @twt/i18n i18n:check-parity`: *"✓ i18n parity gate passed — every member-facing en/
key has non-empty Hindi parity"*. `pnpm microcopy:check`: *"✓ no vocabulary / tone / numeral / magic-number-color violations in the
scanned scope"* (on the committed JSON and the new screens); `pnpm microcopy:test` 371/371. `pnpm friction:check` AFTER the code commit
`d336be8e`: *"✓ member-facing surface touched and a declaration row changed (1 added/amended) — declaration affirmed"* — basis `row`
(AC11). Mobile `tsc` green WITH typed routes (`.expo/types` generated by `CI=1 npx expo start`) and WITHOUT (moved aside).
⚠ **Typed routes do ⛔ guard the new literal (found, ⛔ assumed):** under expo-router 55.0.17 a deliberately broken
`router.replace('/(signup)/zzz-not-a-route')` TYPECHECKS with the generated types — a probe shows `Href` rejects `'zzz'` and `42` but
accepts any two-segment absolute path (`'/zzz/yyy'`). So the route literals are guarded by a SOURCE leg instead (AC1 "PREV and NEXT":
`medical.tsx` → `'/(signup)/whatsapp'`, `whatsapp.tsx` → `'/(signup)/payment'`, both route files exist — proven RED).

**(f) Task 6 — `ci:local`, 2026-10-21.** `DATABASE_URL=…127.0.0.1:5433/twt_dev pnpm ci:local` at code commit `d336be8e` (the
later commit is story / ledger text only): *"ci:local PASSED — 36 job(s) green"*, `integration-tests` RUN (⛔ skipped), friction-budget
✓, microcopy ✓, i18n-parity ✓; turbo `test` 8m38s. `.expo/types` was moved aside for the run (CI has none). ⛔ pushed: the branch push
(with `DATABASE_URL` on :5433 — [[project_prepush_hook_inherits_5432]]) waits for BigDev.

**(d) Dev-DB side effects.** AC9's legs ran ONLY on :5433 (`apps/api/.env`, copied into the worktree, git-ignored): each run creates a
fresh random Pariwar, its `pariwar_wa_config` row, one member through real signup + manual KYC, and (enabled leg) one PENDING
`member_wa_opt_in` row — committed test rows, ⛔ cleaned up (the house pattern). ⛔ write to :5432. ⛔ migration.
⚠ AC9 drove the member to `pending-fee` through the REAL `POST /api/v1/member/kyc/manual` (event `member.kyc_manual_fallback`), ⛔ by
appending `member.kyc_completed` as the AC's wording suggested — the real path is the stronger seed; the state is the same.

### Completion Notes List

- Governance first: Decision `2026-10-21-375` (author-commit, SB1–SB12 + PQ1 as answered) committed ALONE `ae4fbaf7`; records
  `9396deac` (epics.md entry, §3.4 dated note, ADR-0029 annotated row, roster Row 38 `wa-signup-box-hindi-reviewed`, friction row +
  disposition, ledger `2026-10-21l`, row → in-progress). The decision insert went through first try (additive 36/0).
- Code `d336be8e`: the step `app/(signup)/whatsapp.tsx` (loading → ask → sent; one mint per visit; ref guards; the reminder overlay
  copied from BannerHost's SHAPE — `components/banners/*` untouched), `OtherPhoneHint.tsx` (signup sent stage + Settings PENDING),
  `lib/with-timeout.ts` (moved from `notifications.tsx`, behaviour unchanged), `wizard-steps.ts` + `medical.tsx` (PREV) + the
  `_layout.tsx` comment, 17 strings en + hi taken programmatically from the SB5 table (byte-identical to BigDev's reviewed text).
  ⛔ change under `apps/api/src`, `packages/contracts/src`, `packages/domain/src`, `apps/jobs/src` or migrations; `payment.tsx` untouched.
- Tests: 31 step render legs, 5 copy-key legs, 4 helper legs, 6 Settings AC12 legs, 2 live-DB AC9 legs; every leg proven RED (Debug
  Log (b)). Mobile 77 files / 1154 tests green; mobile + api lint and typecheck green.
- Not demonstrated on a device: native layout, a real screen reader, a real WhatsApp hand-off ([[feedback_record_unattested_no_backfill]]).

### File List

Governance / records: `.decision-log.md` · `_bmad-output/planning-artifacts/epics.md` · `_bmad-output/planning-artifacts/architecture.md`
· `docs/adr/ADR-0029-whatsapp-webhook-ingress-and-opt-in-lifecycle.md` · `docs/launch-gate-inventory/inventory-roster.md` ·
`friction-budget.md` · `_bmad-output/implementation-artifacts/sprint-status.yaml` · `_bmad-output/implementation-artifacts/5-10-signup-whatsapp-opt-in-checkbox.md`

New: `apps/mobile/app/(signup)/whatsapp.tsx` · `apps/mobile/components/notifications/OtherPhoneHint.tsx` · `apps/mobile/lib/with-timeout.ts`
· `apps/mobile/tests/unit/wa-signup-step-render.test.ts` · `apps/mobile/tests/unit/wa-signup-copy-keys.test.ts` ·
`apps/mobile/tests/unit/with-timeout.test.ts`

Modified: `apps/mobile/lib/wizard-steps.ts` · `apps/mobile/app/(signup)/medical.tsx` · `apps/mobile/app/(signup)/_layout.tsx` (comment) ·
`apps/mobile/app/(settings)/notifications.tsx` · `apps/mobile/tests/unit/workplace.test.ts` ·
`apps/mobile/tests/unit/wa-notifications-screen-render.test.ts` · `apps/mobile/tests/unit/wa-notifications-copy-keys.test.ts` ·
`packages/i18n/locales/en/common.json` · `packages/i18n/locales/hi/common.json` · `apps/api/tests/integration/wa-opt-in/wa-opt-in.spec.ts`

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-10-21 | 1.11 | CODE REVIEW CLOSED (`bmad-code-review 5.10`, three layers; BigDev: "1"): R1–R5 fixed — Android/iOS background accessibility hiding; explicit accessible reminder heading; bounded scrolling reminder; late-response invalidation on blur/unmount/refocus; selectable number on signup and Settings. Eighteen new regression cases; mobile 1172/1172; full ci:local 36/36 on :5433 including integration-tests. Story and sprint row `review` → `done`. Changes local, uncommitted. |
| 2026-10-21 | 1.10 | Task 6: `ci:local` 36/36 green on :5433 at `d336be8e` (integration-tests run); tsc both ways; STATUS → `review`; ledger `2026-10-21m`; row 5-10 → `review`. ⛔ pushed (held for BigDev). |
| 2026-10-21 | 1.9 | DEV (`bmad-dev-story 5.10`): Task 0.1 preflight clean; Decision `2026-10-21-375` committed alone (`ae4fbaf7`); records (`9396deac`, roster Row 38); Tasks 1–5 implemented and tested (`d336be8e`) — every leg proven RED; friction gate basis `row`. Found: typed routes (expo-router 55) do ⛔ guard a `'/(signup)/…'` literal ⇒ a source leg added under AC1; the 5.12 copy-key regex cannot see digit keys ⇒ widened in the new test. |
| 2026-10-21 | 1.8 | Task 0.2 DONE — BigDev: *"all recommendation accepted for SB1-SB11 and PQ1"*. Debug Log (a) records the answer verbatim and what each SB resolves to; PREV = `medical`, NEXT = `payment` (SB2 (d)); SB9 (d-i); PQ1 no. STATUS line, SB heading and Task 0.2 updated. Next: Task 0.1, then 0.3 (decision, alone) and 0.4 (records). |
| 2026-10-21 | 1.7 | The routing note `…-5-10-whatsapp-code-for-another-phone.md` was RULED (BigDev relayed: *"by DR and KB / option A, one code per request and one retry."*) ⇒ Decision `2026-10-21-374` (Trustee-ratified, committed alone `09094409`); BigDev's reading of "one retry" when asked: *"Both"* (two codes per request, two entry attempts per code — ⛔ separately ratified). SB12 records it; 5.10's scope is unchanged (row 5-13 builds the code and swaps the signup link's content). |
| 2026-10-21 | 1.6 | BigDev reviewed the remaining eleven Hindi rows (`title`, `box_label`, `continue`, `popup_title`, `popup_back`, `popup_proceed`, `popup_a11y`, `sent_title`, `waOtherPhone.link` / `desc` / `note`): *"nothing to change"*. All 17 rows now BigDev-reviewed; the table header and SB5 updated. Whether this discharges roster leg SB9 (a) (Row 28's control) is left to that row. Offered and NOT taken: "to TWT" in `sent_title` / `waOtherPhone.desc`, and "अंग्रेज़ी के" in `waOtherPhone.note`. |
| 2026-10-21 | 1.5 | BigDev, in session, after reading the v1.4 words (*"this word means differently to user"*): the member sends the message TO TWT — six English rows rewritten by BigDev (`intro`, `box_hint`, `popup_body`, `sent_desc`, `request_failed`, `link_failed`); their Hindi translated from that English and then reviewed and edited by BigDev (*"done, commit hindi and english"*). The registered-number condition now lives only in `waOtherPhone.note` (SB5, F8a, SB12 updated); `intro`'s *"will send"* noted against F7b. Microcopy gate: 0 findings (en + hi). |
| 2026-10-21 | 1.4 | `bmad-create-story validate 5.10` — four fresh-context verifiers (code claims · governance · premise / end-to-end · tests and gates); BigDev: *"all"* (31 findings). Branch rebased onto `2f4a4303` (ledger-only; ledger ids renumbered `21g` / `21h`). ⭐ Premise fixes: WhatsApp is a FALLBACK rung after push, ⛔ a mirror (F7a ⇒ `intro` / `popup_body` reworded); a switched-on Pariwar with no approved template makes a yes REMOVE the SMS fallback (F7b, pre-existing ⇒ `deferred-work.md` + SB9 (d)); §3.4's *"surfaced for member confirmation"* is unbuilt (F8a, pre-existing ⇒ `deferred-work.md`); there is ⛔ "Settings" (F14 ⇒ four strings point to the home screen's *"WhatsApp notifications"*); `available` ⛔ complete (F7c ⇒ SB9 (c)); the dual-SIM case named in the main words; process death mid-WhatsApp strands a pre-KYC member (F5 ⇒ SB2 (d) PROPOSED, recommendation revised; PREV / NEXT names). Also: SB3 (c) and the label cost; SB4's UX Pattern 2 departure; SB6's resend re-opens the first link (no second mint); SB9 (b) re-homed (Row 19 is the claim agreement's only); SB10's reason (three local helpers exist — F12a); §0 reading made precise (the toggle; §3.4's offer words; attribution); announce wrappers (AC8); test legs that bite (AC3 full props, AC6 one-`act()` double tap, stable `useRouter`, `selectable`, `PARAMS`, key-set equality — T11); T10 (`components/banners/*` SHA-pinned); friction row placement + `row` basis (F17, AC11); F5 / F7 / F8b / F8c / F11 / F19 / F19a / F20 corrected; `OtherPhoneHint` in `components/notifications/`. The reworded strings: 0 microcopy findings (en + hi). Routing note `…-5-10-whatsapp-code-for-another-phone.md` (⛔ sent) corrected in the same commit. ⭐ Then a fresh-context review of this pass's OWN diff (1 H / 7 M / 1 L, all applied before commit): F7b's loss was overstated (the per-member SMS is itself dark today — it bites once row 5-11 ships); helpdesk replies are ⛔ on the ladder in production; under SB2 (d) the member is `pending-fee` at the step (F7 / S1 / AC9); SB2 (d)'s cost (two app switches before payment); §0 difference (4) (the offer's place); Meta's opt-in condition (b) quoted in full; `sent_desc` no longer claims the home screen shows the status (en + hi); the note's confirmation route is ⛔ claimed ruling-free; cites `kyc.tsx:102`, `payment.tsx:57`, copy-keys `:34`, `provider-composition.ts:88-91`. Final strings re-checked: 0 microcopy findings. |
| 2026-10-21 | 1.0 | Created by `bmad-create-story 5.10` (pinned `20fcb479`, branch `story/5-10-signup-whatsapp-opt-in-checkbox` in worktree `.claude/worktrees/5-10`). SB1–SB11 + PQ1 PROPOSED for BigDev at Task 0.2. ⭐ Recommended design needs no API, contract, domain, worker or migration change. ⛔ validated yet. |
| 2026-10-21 | 1.3 | BigDev (in session): *"I think we need to send OTP in this case. May be ask later if whatsapp is on another phone."*, then *"2, go ahead"* ⇒ SB12 + AC12 + Task 3.5 / 4.5: a "WhatsApp on another phone?" link reveals the number + phrase (signup `sent` stage and Settings PENDING); F8b (the phrase is hand-typeable; both responses carry it), F8c (another phone; a `wa.me` link resolves with no WhatsApp — T3 / SB6 corrected). The WhatsApp code itself → routing note `…-2026-10-21-5-10-whatsapp-code-for-another-phone.md` (WRITTEN, ⛔ sent) + backlog row `5-13-whatsapp-code-for-another-phone`. |
| 2026-10-21 | 1.2 | BigDev asked whether the reminder repeats on every app open — it does ⛔: "once per visit" reworded to "once, during signup only — never after signup" (I4, SB4, SB6, AC3, Task 3.3). F8a added: how the number is verified (the sender's blind index + phrase). |
| 2026-10-21 | 1.1 | Create-story checklist pass (one fresh-context verifier; 1 H / 8 M / 10 L, all applied): `workplace.test.ts` pins the step order (F18a, Task 3.1); scope wording "no change under `…/src`" (AC9's test edit); 409 codes via `ApiError` (F12, SB6); the one-attempt rule after a failed tick + `request_failed` copy; harness extended so prop legs bite (F19, Task 4.1); Android back (SB4, AC3); the §0 departure from the row's framing stated; AC9 re-scoped to the real-signup seed (F19a); friction row `forced`; cites corrected (`notifications.tsx:53`/`:56-70`, `payment.tsx:28`, `tc.tsx:195-217`); 5 s status bound; overlay as a ScrollView sibling; SB9 (b) → Row 19 for §5; epics placement. |
