---
baseline_commit: 20fcb479
---

<!--
PINNED: 20fcb479 (`main` = `origin/main`, 2026-10-21 — Story 5.12 landed: migration 0177, Decision `2026-10-21-373`, its told item TOLD).
Branch `story/5-10-signup-whatsapp-opt-in-checkbox`, cut from the pin in a SEPARATE worktree `.claude/worktrees/5-10` (a peer session,
twt-7d, shares the main checkout — [[feedback_shared_tree_branch_switch]]).
Two facts, kept apart (footgun #24): the pin is an ancestor of HEAD (durable); the CODE claims below were derived at 20fcb479
(perishable). Re-check before Task 1: `git fetch origin && git diff --name-only 20fcb479..origin/main -- packages apps scripts docs/adr docs/launch-gate-inventory`.

STATUS: ready-for-dev (created 2026-10-21 via `bmad-create-story 5.10`; v1.3 — SB12 DECIDED in session; SB1–SB11 PROPOSED for BigDev at Task 0.2; ⛔ validated yet).

START CONDITION — MET at the pin: row `5-12-whatsapp-yes-lasts-until-withdrawn` is `done` and ON `main` (a yes now lasts until withdrawn,
so the box reaches members for as long as their yes stands — the row-5-10 ledger annotation: *"This box's reach follows row 5-12; no
Panel ruling is still owed."*). Nothing else is a precondition.

NUMBERS (footguns #19 / #42(e); `-366` decision 6 — a number belongs to the first COMMIT that takes it, on any branch): at the pin `main`
holds migrations to 0177, decisions to `-373`, roster Rows to 37. This file names NO number that is not yet TAKEN: the author-commit is
"the next free decision id at Task 0.3"; the roster row (SB9) is named by its KEY `wa-signup-box-hindi-reviewed`. ⭐ The recommended
design needs NO migration (SB1 (a), SB8 (a)). Re-grep `main`, every branch and every worktree at each commit.

§0 GATE (`trustee-panel-routing-note-TEMPLATE.md`): two RATIFIED texts govern how a WhatsApp yes may be given, and they are NOT the
same width —
  · architecture §3.4 (ratified with ADR-0029 by `-065`): *"WA opt-in state may only transition to ACTIVE via a user-initiated
    interaction (the user-sent WhatsApp message above) or an explicit affirmative consent capture in-app (recorded with timestamp + the
    UI context). Passive defaults, pre-checked boxes, bundled consent, or inference from other settings are not valid opt-in origins."*
  · ADR-0029 Rationale (ratified, `-065`): *"User-initiated ONLY (AR-16). A PENDING is minted only by the member tapping the toggle;
    ACTIVE only by a matched inbound WhatsApp message. Re-opt-in after revoke requires a NEW inbound message (a new PENDING + phrase) —
    no inferred re-consent."*
The RECOMMENDED design (SB1 (a)) MATCHES BOTH: the tick is the member tapping to ask (a PENDING), and the member's own WhatsApp message
turns it on — exactly §3.4's onboarding *"Yes" branch* (*"app opens WhatsApp via deeplink … Member must tap send to complete opt-in"*).
Every recommended SB is therefore the AUTHOR's — stripped of citations each reads "the app should show X / call Y".
⚠ DEPARTURE FROM THE ROW'S FRAMING, stated openly ([[feedback_panel_gate_read_ratified_verbatim]]): the row-5-10 comment framed the box
as *"the §3.4 "explicit affirmative consent capture in-app (recorded with timestamp + the UI context)", so the author's call, ⛔ the
Panel's"*, and owed *"the consent row + `member_wa_opt_in` write"*; `-364` "Not covered" calls it *"the author's, under the unchanged
§3.4 capture rule"*. Read against ADR-0029's ratified *"ACTIVE only by a matched inbound WhatsApp message"*, a box that is ITSELF the
in-app capture route to ACTIVE (SB1 (b)) widens the ADR — so it is NOT the author's, whatever the row assumed. SB1 (a) narrows the
box to the route both texts allow; the owed consent row + `member_wa_opt_in` write is then *"already built by 5.4 (the worker) — no
change by 5.10"*. The Task 0.3 decision records this departure and its reason.
Kept OUT, a Panel question if ever wanted (PQ1): a tick that switches WhatsApp ON BY ITSELF (SB1 (b)) — it uses §3.4's in-app route but
WIDENS ADR-0029's ratified *"ACTIVE only by a matched inbound WhatsApp message"*; two ratified texts would then disagree, which the
template puts with the Panel. Also out: any SMS consent (row 5-11 — BigDev: *"WhatsApp box only"*); anything about how long a yes lasts
(`-364`, built by 5.12).

GLYPH REGISTER: `⛔` negates the word it precedes; `⭐` emphasis / action / recommended; `⚠` a hazard. NO `file:NNN` into
`.decision-log.md`, `deferred-work.md` or `sprint-status.yaml` (newest-first files) — cite the decision id + clause, the item's phrase,
or the row key. Line numbers into CODE files are as of the pin; re-grep the symbol if a line moved.

LETTERS: F = found facts (at the pin) · SB = build decisions (PROPOSED; answered by BigDev at Task 0.2) · I = invariants · T = traps ·
S = Task 0.1 STOP conditions · PQ = a question for BigDev at Task 0.2.
-->

# Story 5.10: An Unticked "Send Me WhatsApp Messages" Box at Signup — With One Even-Handed Reminder if the Member Leaves It Unticked `[SURFACE]`

Status: ready-for-dev

> **WHAT THIS STORY IS, IN ONE PARAGRAPH.** Today a new member is offered WhatsApp nowhere in signup. The only way to say yes is a
> low-prominence Settings control (Story 5.4, reworked by 5.12): it mints a PENDING request, opens WhatsApp with a pre-filled message,
> and the member's sent message turns WhatsApp on. This story adds ONE new signup step, right after the Terms: a separate box,
> **unticked**, *"Send me WhatsApp messages from TWT"*. Ticked + Continue does exactly what the Settings control does (same API call,
> same WhatsApp hand-off) and the member carries on with signup. Unticked + Continue shows a reminder **once** — TWT also sends
> important notices on WhatsApp — with two buttons of **equal weight**: *go back and tick the box* / *continue without WhatsApp*. A
> Pariwar with WhatsApp switched off never sees the step.
>
> **Day-one output: none** — every Pariwar's WhatsApp config defaults to NULL (off), so no member sees the step until an admin turns
> WhatsApp on; and nothing is in production ([[project_not_in_production_merge_is_not_golive]]).
>
> **What already ships and this story REUSES (rebuild none of it):**
> - `POST /api/v1/member/wa-opt-in` (`apps/api/src/modules/wa-opt-in/handlers.ts:141-223`) — the mint: config check (409
>   `wa_opt_in.channel_unavailable`), `lockMemberWaYes`, 409 `wa_opt_in.already_active`, PENDING re-use, audit-first
>   `member.wa_opt_in_requested` (`originatingChannel: 'member_app'`), the `wa.me` deep link. Guarded by `requireMemberSession` only.
> - `GET /api/v1/member/wa-opt-in` — the status, incl. `available`.
> - The worker's phrase match (`apps/jobs/src/wa-webhook-processor.ts`, ~404-448) — audit, then in one tx `lockMemberWaYes` +
>   `recordConsent('whatsapp_opt_in', member_self, {source:'meta_webhook_inbound'})` + `activateOptIn`. ⭐ This is where the consent row
>   and the ACTIVE `member_wa_opt_in` row are written — unchanged.
> - `apps/mobile/app/(settings)/notifications.tsx` — the Settings capture (5.12), and its `CALL_TIMEOUT_MS` (`:53`) + `withTimeout`
>   (`:56-70`).
> - `components/banners/BannerHost.tsx:245-280` — the rendered-overlay popup precedent (⛔ `Alert.alert`).
>
> **What it CHANGES:** `apps/mobile/lib/wizard-steps.ts` (a new `whatsapp` step after `tc`) and the test that pins its order
> (`apps/mobile/tests/unit/workplace.test.ts:41-42`), `apps/mobile/app/(signup)/tc.tsx:128`
> (the next-route literal), a NEW `apps/mobile/app/(signup)/whatsapp.tsx`, a NEW `apps/mobile/lib/with-timeout.ts` (SB10), en + hi
> `common.json` (a new `waSignup.*` family), the records.
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

## The rulings and records this story builds on

| Source | Key (verbatim, abridged) | Status |
|---|---|---|
| Architecture §3.4, *Member WA opt-in flow* | *"Members self-declare WhatsApp availability during onboarding: After mobile-OTP verification, member is offered … "Yes" branch: app opens WhatsApp via deeplink … Member must tap send to complete opt-in."* + the origination rule (quoted in the §0 header) | ⭐ TRUSTEE-RATIFIED (`-065`, with ADR-0029) |
| ADR-0029 Rationale | *"ACTIVE only by a matched inbound WhatsApp message"* (quoted in the §0 header) | ⭐ TRUSTEE-RATIFIED (`-065`) |
| `2026-10-19-364` | Option A: *"A yes lasts until the member takes it back (in the app, or by replying STOP), for every WhatsApp message from the Trust."* Keeps: *"opt-in only by a user-initiated message or an explicit affirmative capture in-app (⛔ pre-ticked, ⛔ bundled)"*. "Not covered": *"the planned signup box … — the author's, under the unchanged §3.4 capture rule"* | ⭐ TRUSTEE-RATIFIED (option A); the "Not covered" list is the entry's framing |
| 6.31 routing note, fact (3) (sent; ruled `-364`) | *"a separate WhatsApp box, not ticked in advance, with a reminder that important notices come on WhatsApp and a choice to go back or carry on, is now planned"* | told to the Panel as a FACT (not asked) |
| `2026-10-21-373` d1, d10 | one ACTIVE row per member; *"the mint refuses while any ACTIVE row exists"*; *"§3.4's origination rule, unchanged"* | author-commit (5.12) — BUILT |
| Niyamavali R10(B) | *"Official communications are delivered via the in-app surface (the channel of record). WhatsApp/Telegram and similar are convenience mirrors only. Missed information is the member's responsibility"* | rulebook, ⛔ binding ([[feedback_niyamavali_rulebook_not_spec]]); the T&C carries the same draft clause |
| Row `5-10-…` ledger comment (2026-10-19) | BigDev: *"Go with unticked, but display popup saying we send important notification over whatsapp with option to go back and tick or proceed anyway"*; *"WhatsApp box only"*; owed: popup words (en + reviewed hi; *"both choices given equal weight — a nudge, ⛔ a dark pattern"*), the same capture in settings, the consent row + `member_wa_opt_in` write, counsel's DPDP view recorded | BigDev's direction (author) |
| UX spec, Pattern 1: Button Hierarchy | *"Single primary action per surface — never two primary buttons competing."* | UX spec (author) — reconciled by SB4 |
| Meta, *Get opt-in for WhatsApp* (fetched 2026-10-21) | opt-in *"can be general and not specifically for WhatsApp"*, may be collected on websites/apps; must *"clearly state the business's name"* and that the person is opting in to receive messages from it; silent on pre-checked boxes | provider policy — FOUND ([[feedback_provider_policy_is_found_not_counsel]]) |
| Counsel's DPDP view on the capture | NOT RECORDED — the 6.31 note: *"counsel's view on WhatsApp consent has not been recorded"*; roster Row 37 (b) open; `-367` d19 lists DPDPA §5 (notice) and §6(4) (withdrawal ease) as open for the claim agreement — the same questions apply here | ⚠ un-attested — carried as a go-live leg (SB9), ⛔ backfilled ([[feedback_record_unattested_no_backfill]]) |

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
- **F5 —** The wizard does not survive a relaunch: a full session is routed to `(tabs)` (the guard), so a member who quits before the
  WhatsApp step never sees it — Settings remains their way in. ⚠ Memory [[project_expo_router_guard_race]]: the guard's replace can land
  AFTER the post-signIn replace, so a first signup can skip the wizard entirely (pre-existing; ⛔ this story's to fix).
- **F6 —** `payment.tsx:28` `type LockInGateStep = 'kyc' | 'nominees' | 'medical' | 'tc'` — the lock-in reads those four; the WhatsApp
  step is ⛔ one of them (I2).

**The opt-in substrate (unchanged by this story)**

- **F7 —** The mint (`handlers.ts:141-223`): 409 `wa_opt_in.channel_unavailable` when the Pariwar config is missing / disabled / has no
  number; `lockMemberWaYes`; 409 `wa_opt_in.already_active` if any ACTIVE row; a PENDING is RE-USED (no new audit); else audit-first
  `member.wa_opt_in_requested` then `createPendingOptIn`; returns `{state, displayPhoneNumber, deepLink, verificationPhrase}`. 409
  `wa_opt_in.no_mobile` if no blind index. The route's only guard is `requireMemberSession` (`routes.ts:36-42`) — no member-STATE check
  (`apps/api/src/modules/auth/shared/member-session-guard.ts` has none), so a `pending-kyc` member may mint. ⚠ Proved by AC9's new leg,
  ⛔ assumed.
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
- **F8b — The phrase can be typed by hand.** `TWT-` + 8 characters from an unambiguous alphabet (no 0/O, 1/I/L), e.g. `TWT-7K2F9QXR`
  (`packages/domain/src/wa-opt-in/phrase.ts:16-40`); the extractor upper-cases the body and folds dash variants
  (`phrase.ts:43-60`), so a hand-typed, lower-case or autocorrected phrase still matches. The mint response carries
  `displayPhoneNumber` + `verificationPhrase`, and the status response carries both while PENDING (`packages/contracts/src/wa-opt-in/opt-in.ts`
  `CreateWaOptInResponse`, `WaOptInStatusResponse`) ⇒ either screen can show them with NO API change. A PENDING lives 48 h
  (`DEFAULT_PENDING_TTL_SECONDS`, `apps/jobs/src/wa-webhook-processor.ts:54`).
- **F8c — Signing up on a phone that does not hold the member's WhatsApp.** The deep link opens WhatsApp on THIS phone, so the message
  comes from another number (no match — F8a) or, with no WhatsApp installed, `https://wa.me/…` opens a browser page and
  `Linking.openURL` RESOLVES (⛔ rejects) — so `link_failed` does ⛔ catch it. Only WhatsApp's linked-device mode (the member's own account
  linked on this phone) matches. Before SB12 the only way to finish was to install the app on the other phone and use Settings.
- **F9 —** Neither `member_wa_opt_in` nor `consent_records` has an origin / ui_context column; `consent_records.consent_payload` (jsonb)
  documents `checkboxTextShown, locale, copyVersion …` (`packages/domain/src/schema/consent_records.ts:245-264`). The claim-contact
  agreement is the precedent for server-resolved evidence copy (`apps/api/src/modules/claims/claim-contact-copy.ts`). Used only if SB8
  (b) is chosen.
- **F10 —** No `events_log` event exists for WhatsApp opt-in; transitions are hash-chained audit lines (`member.wa_opt_in_*`).
- **F11 —** A stale PENDING is moved to `EXPIRED_24H_WINDOW` by the jobs sweep; Settings then shows `unconfirmed_*` ("we did not receive
  your WhatsApp message … try again"). ⇒ A member who ticks but never taps send ends there — honest and recoverable.

**The app**

- **F12 —** `apps/mobile/app/(settings)/notifications.tsx` (5.12): `CALL_TIMEOUT_MS = 15_000` (`:53`) + a module-local `withTimeout`
  (`:56-70`, passes the original rejection through) bound every call (the api-client transport has no timeout — 5.12 P1); `Linking.openURL` failures surface as a `link` error; state
  changes are announced. Its enable control = `requestWaOptIn()` → `Linking.openURL(res.deepLink)` (`onEnable`, 168-189). ⚠ It does
  NOT tell 409 codes apart — every failure sets the `'action'` error and re-reads (`:182-185`). The working pattern for a code is
  `err instanceof ApiError && err.code === '…'` — `ApiError` from `@twt/api-client` (`packages/api-client/src/index.ts:193`: `.status`,
  `.code`, `.details`); precedent `apps/mobile/app/(auth)/otp.tsx:11,70`; `ConflictError(…, code)` puts the code in the envelope.
- **F13 —** `memberAuth.getWaOptInStatus / requestWaOptIn / revokeWaOptIn` (`packages/api-client/src/index.ts:1003-1015`), on the
  `memberAuth` instance `apps/mobile/lib/member-api.ts` builds.
- **F14 —** Existing copy names the sender **"TWT"** (`waNotifications.active_desc`: *"You'll receive TWT notifications on WhatsApp …"*;
  `entry_hint`). The Trust's legal name is pending ([[project_legal_name_pending]]) — never hard-code one.
- **F15 —** The app is always Hindi (no language switch; `LocaleProvider` in-memory `hi` — [[project_mobile_app_no_language_switch]]). ⇒
  The Hindi strings are what members read; the English is not member-visible today.
- **F16 —** `BannerHost.tsx:245-280`: overlay (⚠ an `absoluteFill` overlay INSIDE a `ScrollView` covers only the scroll content —
  render it as a SIBLING of the ScrollView) with `accessibilityViewIsModal`, absolute-fill scrim (`zIndex: 1000`), inner
  `accessibilityLiveRegion="polite"`; its comment records the rule *"NOT Alert.alert / alert() / confirm()"*. `Alert.alert` would style a
  `cancel` button differently on each OS — ⛔ equal weight. BannerHost has no Android-back handling; the precedent is
  `components/peer-request/PeerQuestionnaire.tsx:264` (`BackHandler.addEventListener('hardwareBackPress', …)`). The announce rule
  (Android live region OR iOS `announceForAccessibility`, never both) is `apps/mobile/lib/death-certificate-announce.ts`
  (`announcementPlan`) — ⛔ `notifications.tsx:164`, which announces unconditionally.

**Gates the edits trip**

- **F17 —** `friction-budget.md`: any committed `apps/mobile/` member-facing change needs a ledger row or a "**Story X disposition (…)**"
  paragraph (5.12 F22); the 6.36a `workplace` step added ONE row — the precedent.
- **F18 —** i18n parity walks en keys only (5.12 F14); the copy-key test precedent is
  `apps/mobile/tests/unit/wa-notifications-copy-keys.test.ts` (real `t()`, camelCase-capable regex, positive control).
  `microcopy.yaml`'s tone rules (scarcity / panic / blame) scan `common.json` — the reminder's words must pass them.
- **F18a —** `apps/mobile/tests/unit/workplace.test.ts:41-42` (6.36a AC5) pins `[...WIZARD_STEPS]` to the six-step order — it goes RED
  when `'whatsapp'` is inserted; Task 3.1 amends it.
- **F19 —** Mobile vitest includes `tests/unit/**/*.test.ts`, env `node`; render tests opt in with `// @vitest-environment jsdom`. The
  harness precedent is `tests/unit/wa-notifications-screen-render.test.ts` (real `<LocaleProvider>`, mocks `lib/mmkv`, `lib/member-api`,
  `expo-router` with a blur-aware `useFocusEffect`, `react-native`, `tamagui` forwarding `testID`; RTL `cleanup`). ⚠ That `tamagui` mock
  forwards only `children`, `testID`, `onPress`, `disabled` (`:76-88`), its `react-native` mock has no `Alert` / `Platform` /
  `BackHandler`, and its `expo-router` mock has no `useRouter` — a copied harness would make AC1/AC3/AC8's prop legs pass VACUOUSLY
  ([[feedback_gate_scope_semantic_coverage]]). No signup-screen test exists today.
- **F19a —** `apps/api/tests/integration/wa-opt-in/wa-opt-in.spec.ts:110` and `:150` ALREADY prove a `pending-kyc` member (projected via
  `member.signup_initiated`) mints 200 and a disabled config gives 409 `channel_unavailable`. The real-signup helpers are file-local in
  `apps/api/tests/integration/signup/signup-create.spec.ts` (`continuationViaOtp` :66, `mintContinuation` :78); signup needs
  `createTestApp({ env: { DEFAULT_SIGNUP_PARIWAR_ID } })`; a fresh random Pariwar per test is the
  `member-moderation/termination-access-block.spec.ts:217` precedent.
- **F20 —** Typed routes are absent in a worktree (no `.expo/types`) ⇒ `tsc` skips `Href` checks; run it both ways
  ([[project_mobile_typed_routes_worktree]]). The new `'/(signup)/whatsapp'` literal is exactly what that check guards.

## ⚖️ Build decisions SB1–SB11 (⭐ = recommended; PROPOSED — BigDev answers at Task 0.2)

- **SB1 — What a tick does.** ⭐ **(a)** Ticked + Continue = the Settings enable control: `requestWaOptIn()` (mint PENDING), then
  `Linking.openURL(deepLink)`; the member's sent message turns WhatsApp on via the unchanged worker path (which writes the consent row and
  the ACTIVE row — F8). MATCHES §3.4's onboarding "Yes" branch and ADR-0029; the row's owed *"consent row + `member_wa_opt_in` write"* is the worker's, already
  built (5.4). **(b)** The tick switches WhatsApp on by itself (a new
  in-app ACTIVE writer + consent row with the words shown). *Cost (a):* an app switch in the middle of signup; a member who ticks but does
  not tap send is not opted in (F11 — Settings says so and offers a retry). *Cost (b):* widens ADR-0029's ratified sentence ⇒ a Panel
  question (PQ1); a tick proves neither that the number is on WhatsApp nor that the member controls it there (the phrase does — 5.4);
  a new writer under the 5.12 lock + one-ACTIVE index, an evidence column (migration), and a second consent route to keep consistent.
- **SB2 — Where the box lives.** ⭐ **(a)** A new wizard step `whatsapp`, immediately AFTER `tc` (step 2 of 7) — its own screen.
  **(b)** The last step, after `payment`. **(c)** On `tc.tsx` below the Terms box — ⛔ recommended: one Continue would post the Terms and
  the WhatsApp answer together (the *"bundled consent"* objection). *Cost (a):* every member passes one more screen (F17 row); *"Step N of
  M"* becomes 7. *Cost (b):* reaches fewer members (F5 — a relaunch drops the wizard; payment hands off to `(tabs)`).
- **SB3 — A Pariwar without WhatsApp, or a status that cannot be read.** ⭐ **(a)** The step loads `getWaOptInStatus()` (bounded,
  SB10); `available: false`, a load failure or a timeout → `router.replace('/(signup)/kyc')` without showing the box; `state: 'ACTIVE'`
  → also straight on (nothing to ask). **(b)** Render an "unavailable" line with Continue. *Cost (a):* the progress label jumps from
  *Step 1* to *Step 3 of 7* for those members — at day one that is EVERY member (every Pariwar's WhatsApp is off); a member whose status
  call failed is not asked (Settings remains). The status read gets a SHORTER bound (`STATUS_TIMEOUT_MS = 5_000`, in the step) so a hang
  holds the spinner at most 5 s, ⛔ 15. *Cost (b):* a screen
  telling every member of a WhatsApp-less Pariwar about a channel they cannot have.
- **SB4 — The reminder (popup).** ⭐ A rendered in-screen overlay (F16 pattern), shown when Continue is pressed with the box UNTICKED,
  at most ONCE, during signup only (a second unticked Continue on the step proceeds directly). The step is part of the one-time signup
  wizard and every step moves on by `router.replace`, so a member is never asked again after signup (F5) — Settings never prompts. Two buttons, same component, size, theme and
  `height` — neither is `theme="accent"` — in BigDev's order: *"Go back and tick the box"*, then *"Continue without WhatsApp"*.
  "Go back" closes the overlay and leaves the box UNTICKED (I1) — the member ticks it themselves; the Android back gesture while the overlay is open = "Go back"
  (`BackHandler`, F16 precedent; removed on close/unmount). The overlay renders as a sibling of the ScrollView (F16).
  ⛔ `Alert.alert`. UX Pattern 1 (*"never two primary buttons competing"*) is MET (neither is primary); its *"Primary action is always
  the highest-priority next-step"* is deliberately not applied here — BigDev's equal-weight direction; recorded in the decision.
  *Cost:* one more tap for a member who meant to skip.
- **SB5 — The words (en + DRAFT hi).** ⭐ A `waSignup.*` family in `packages/i18n/locales/{en,hi}/common.json` (table below). The sender
  is **"TWT"** (F14 — Meta wants the business named; the legal name is pending). The reminder states a FACT and never threatens: under
  R10(B) the app is the channel of record, so ⛔ "you will miss …" — it says the app still has everything. The box's hint says how to
  stop (Settings, or STOP) — Meta's opt-out tip and DPDPA §6(4)'s withdrawal ease. *Cost:* the Hindi is a DRAFT until human-reviewed
  (SB9 (a)).
- **SB6 — After a tick.** ⭐ No waiting and no polling in signup: once WhatsApp opens, the step shows `sent_title` / `sent_desc`, *"Open
  WhatsApp again"* (re-calls the mint — it re-uses the PENDING — then opens the link) and Continue. Codes are read as
  `err instanceof ApiError && err.code` (F12). The step makes ONE attempt: after the first ticked Continue, the NEXT Continue
  always goes to `kyc`, never a second mint. Outcomes: 409 `wa_opt_in.already_active` → `kyc` at once (done); 409
  `wa_opt_in.channel_unavailable` → `kyc` at once (switched off meanwhile); any other rejection or a timeout → stay on the ask stage
  showing `request_failed` (*"…turn it on later in Settings"*, ⛔ *"try again"*), Continue → `kyc`; `Linking.openURL` rejects (rare — F8c) → stay on
  the ask stage showing `link_failed`, Continue → `kyc` (the PENDING already minted expires — F11). *Cost:* the member does not see, in
  signup, whether their message arrived (Settings shows it — F12); a transient failure is not retried in signup.
- **SB7 — "The same capture in Settings".** (SB12 adds ONE thing to Settings' waiting state; otherwise:) ⭐ **(a)** No change: Settings' enable control already makes the very request the box makes
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
  **(a)** the new hi `waSignup.*` and `waOtherPhone.*` strings HUMAN-REVIEWED (Row 28's control); **(b)** counsel's DPDP view on the box and reminder wording
  (§6(4) withdrawal ease; the §5 notice is cross-referenced to roster Row 19 — `-367` d19 names it the home, so ⛔ a parallel counsel
  leg) recorded, or its absence accepted as a decision. Target: before the first production build that
  shows the step. Blocks no build and no merge. *Cost:* one more open row.
- **SB10 — The timeout helper.** ⭐ Move `withTimeout` + `CALL_TIMEOUT_MS` out of `notifications.tsx` into
  `apps/mobile/lib/with-timeout.ts` (the second consumer now exists — [[feedback_no_premature_package]]); Settings imports it, behaviour
  byte-identical. *Cost:* touches a just-reviewed screen (import only; its render test must stay green).
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
  `5-13-whatsapp-code-for-another-phone`; if ruled in, row 5-13 replaces what this link reveals, on the same link. *Cost:* the member
  types a short code into WhatsApp (less familiar than a code typed into the app); a small edit to the just-reviewed Settings screen.
- **PQ1 (for BigDev at Task 0.2) —** Is a tick that switches WhatsApp on BY ITSELF (SB1 (b)) wanted at all? ⭐ Recommended: no, not now —
  then nothing goes to the Panel. If yes, it is a routing note (template; §0: two ratified texts in conflict), and SB1 waits.

### The words (SB5) — en final for review; **hi = DRAFT, ⛔ reviewed**

| Key | en | hi (DRAFT) |
|---|---|---|
| `waSignup.title` | WhatsApp messages | व्हाट्सएप संदेश |
| `waSignup.intro` | TWT can send you notices on WhatsApp too. Everything also appears here in the app. | TWT आपको सूचनाएँ व्हाट्सएप पर भी भेज सकता है। सब कुछ यहाँ ऐप में भी दिखता है। |
| `waSignup.box_label` | Send me WhatsApp messages from TWT | मुझे TWT से व्हाट्सएप संदेश भेजें |
| `waSignup.box_hint` | If you tick this, WhatsApp opens with a short message ready — tap send to finish. You can turn it off any time in Settings, or by replying STOP on WhatsApp. | टिक करने पर व्हाट्सएप एक छोटे संदेश के साथ खुलेगा — पूरा करने के लिए भेजें पर टैप करें। आप इसे कभी भी सेटिंग्स में, या व्हाट्सएप पर STOP भेजकर बंद कर सकते हैं। |
| `waSignup.popup_title` | Continue without WhatsApp? | व्हाट्सएप के बिना आगे बढ़ें? |
| `waSignup.popup_body` | TWT also sends important notices, such as payment reminders, on WhatsApp. You will still see every notice here in the app. | TWT ज़रूरी सूचनाएँ, जैसे भुगतान की याद, व्हाट्सएप पर भी भेजता है। हर सूचना आपको यहाँ ऐप में भी दिखेगी। |
| `waSignup.popup_back` | Go back and tick the box | वापस जाएँ और बॉक्स पर टिक करें |
| `waSignup.popup_proceed` | Continue without WhatsApp | व्हाट्सएप के बिना आगे बढ़ें |
| `waSignup.popup_a11y` | Choose whether to continue without WhatsApp | चुनें कि व्हाट्सएप के बिना आगे बढ़ना है या नहीं |
| `waSignup.sent_title` | Send the message in WhatsApp | व्हाट्सएप में संदेश भेजें |
| `waSignup.sent_desc` | Tap send in WhatsApp to turn on WhatsApp messages. You can carry on here — Settings shows when it is on. | व्हाट्सएप संदेश चालू करने के लिए व्हाट्सएप में भेजें पर टैप करें। आप यहाँ आगे बढ़ सकते हैं — सेटिंग्स में दिखेगा कि यह कब चालू हुआ। |
| `waSignup.continue` | Continue | आगे बढ़ें |
| `waOtherPhone.link` | WhatsApp on another phone? | व्हाट्सएप दूसरे फ़ोन में है? |
| `waOtherPhone.desc` | From the phone that has your WhatsApp, send this message to {number}: | जिस फ़ोन में आपका व्हाट्सएप है, उससे यह संदेश {number} पर भेजें: |
| `waOtherPhone.note` | It must come from your registered number. Small or capital letters both work. | यह संदेश आपके पंजीकृत नंबर से ही आना चाहिए। छोटे या बड़े अक्षर, दोनों चलेंगे। |
| `waSignup.request_failed` | We couldn't set up WhatsApp just now. You can carry on, and turn it on later in Settings. | अभी व्हाट्सएप चालू नहीं हो सका। आप आगे बढ़ सकते हैं और बाद में सेटिंग्स में इसे चालू कर सकते हैं। |
| `waSignup.link_failed` | WhatsApp did not open. You can carry on, and turn WhatsApp messages on later in Settings. | व्हाट्सएप नहीं खुला। आप आगे बढ़ सकते हैं और बाद में सेटिंग्स में व्हाट्सएप संदेश चालू कर सकते हैं। |

Re-used, ⛔ re-minted: `waNotifications.pending_resend`
(*"Open WhatsApp again"*). ⚠ `popup_body`'s *"such as payment reminders"* must stay true: payment reminder is in
§3.4's WhatsApp UTILITY scope — found at the pin (`architecture.md` §3.4: *"Scope: Meta UTILITY templates only — payment reminder, payout issued, claim accepted, expiry warning, membership lapse"*) — re-check at Task 0.1 (S3). `continue` is ⛔ in `common.json` (it is `workplace.json`'s), so the step mints `waSignup.continue`. *"Everything also appears here in the app"* rests on R10(B) and the
dispatcher's in-app primary (Story 5.2) — re-check (S3).

## Acceptance Criteria

**AC1 — A separate, unticked box on its own step (I1, I2; SB2).** Given a new member who has accepted the Terms, when the Pariwar's
WhatsApp is available and the member has no ACTIVE yes, then `tc.tsx` routes to `'/(signup)/whatsapp'`, which shows `waSignup.title`,
`intro`, a checkbox (`accessibilityRole="checkbox"`, `accessibilityState.checked === false`) labelled `box_label` with `box_hint`, and a
Continue button. `WIZARD_STEPS` is `['tc', 'whatsapp', 'kyc', 'workplace', 'nominees', 'medical', 'payment']`; the layout shows *Step 2 of
7*. Re-entering the step shows the box unticked again. *Legs:* render test (initial unticked state; the label/hint keys); the
`WIZARD_STEPS` order assertion in `workplace.test.ts` amended (F18a); `tc.tsx`'s literal.

**AC2 — Skipped where there is nothing to offer (I5; SB3).** Given `getWaOptInStatus()` returns `available: false`, OR `state:
'ACTIVE'`, OR rejects, OR does not settle within `STATUS_TIMEOUT_MS` (5 s), then the step calls `router.replace('/(signup)/kyc')` and renders neither the
box nor the reminder; while loading it shows a spinner only. *Legs:* one per branch (four), each asserting the replace and that
`requestWaOptIn` was ⛔ called.

**AC3 — The reminder, once, even-handed (I1, I4; SB4).** Given the box is unticked, when Continue is pressed the first time, then a
rendered overlay (`accessibilityViewIsModal`, ⛔ `Alert.alert`) shows `popup_title`, `popup_body` and two buttons `popup_back` then
`popup_proceed` with IDENTICAL size / theme / height props (neither `theme="accent"`). "Go back" closes it and the box is STILL UNTICKED;
a second unticked Continue on the step proceeds to `kyc` with no overlay. "Continue without WhatsApp" proceeds to `kyc`. Neither
path calls `requestWaOptIn`. *Legs:* overlay renders; the two buttons' props compared equal; go-back leaves `checked === false`;
second-Continue skips the overlay; proceed routes; `Alert.alert` never called; Android back
while the overlay is open closes it and the box stays unticked (and the listener is removed after).

**AC4 — Unticked never blocks signup (I2).** The member reaches `kyc` without ticking, and `payment.tsx`'s `LockInGateStep` is unchanged
(no `'whatsapp'`). *Legs:* AC3's proceed leg; a source/type assertion or grep note that `LockInGateStep` is byte-unchanged.

**AC5 — A tick asks, the member's WhatsApp message answers (I3; SB1 (a), SB6).** Given the box is ticked, when Continue is pressed, then
`requestWaOptIn()` is called ONCE (bounded), `Linking.openURL(res.deepLink)` is called with the returned link, and the step shows
`sent_title` / `sent_desc`, *"Open WhatsApp again"* and Continue (→ `kyc`). No change under `apps/api/src`, `packages/contracts/src`, `packages/domain/src`, `apps/jobs/src` or the migrations.
*Legs:* the call sequence; the sent stage; resend re-calls the mint and re-opens the link; Continue routes.

**AC6 — Every failure still lets the member continue (I5; SB6).** Mint rejects with `ApiError` 409 `wa_opt_in.already_active` →
`kyc` at once; 409 `wa_opt_in.channel_unavailable` → `kyc` at once; any other rejection or a timeout → `request_failed`
(`accessibilityRole="alert"`) and the next Continue → `kyc` with NO second mint; `Linking.openURL` rejects → `link_failed` and the next
Continue → `kyc` with no second mint. A double tap on Continue issues ONE mint (busy guard). *Legs:* one per outcome, the mocks
rejecting with REAL `ApiError` instances; the no-second-mint leg; the double-tap leg.

**AC7 — The words (SB5).** All `waSignup.*` keys exist in en AND hi `common.json`; every `t('…')` key in `whatsapp.tsx` resolves through
the REAL `t()` (a copy-key test on the 5.12 precedent, with a positive control) — ⛔ a stub transcription
([[feedback_stub_must_call_not_transcribe]]); the microcopy gate passes on the new strings; no string tells the member they will miss
something without WhatsApp. *Legs:* the copy-key test; the parity check; the microcopy gate output in the Debug Log.

**AC8 — Accessible (I4).** The checkbox announces its checked state; the overlay is modal to assistive tech and its title is announced
on open (`announcementPlan` from `lib/death-certificate-announce.ts` — Android live region OR iOS announce, never both); errors are
`alert` + assertive; the sent stage is announced once. *Legs:* render-test props.

**AC9 — The premise the screen rests on, through the REAL signup path (F7, F19a).** The existing legs (`wa-opt-in.spec.ts:110`, `:150`)
already prove a projected `pending-kyc` member mints and a disabled config refuses; this AC's added value is the SEED: a member created
by `POST /api/v1/member/auth/signup/create` (the `signup-create.spec.ts` helpers, copied file-locally or moved to a shared test helper;
`createTestApp({ env: { DEFAULT_SIGNUP_PARIWAR_ID } })`; a FRESH random Pariwar per test — ⛔ toggle `pariwar_wa_config` on the shared
Pariwar) mints a PENDING (200, a `deepLink`) when that Pariwar's WhatsApp is enabled, and gets 409 `wa_opt_in.channel_unavailable` when
it is not. *Legs:* the two cases.

**AC10 — Settings unchanged in behaviour (SB7, SB10).** `notifications.tsx` imports `withTimeout` / `CALL_TIMEOUT_MS` from
`lib/with-timeout.ts`; its existing render-test legs pass unmodified (AC12 ADDS legs); its UI and copy are unchanged apart from AC12. *Legs:* the existing suite green; a
unit test of `with-timeout.ts` (settles, rejects on timeout, clears its timer).

**AC11 — Records and gates (SB9, SB11).** The decision committed ALONE before any code; the records commit (epics.md entry, §3.4 dated
note, ADR-0029 annotated row, roster row `wa-signup-box-hindi-reviewed`, friction-budget row, ledger) before code; `ci:local` green on
:5433 at the final commit with `DATABASE_URL` set (⛔ `env -u` — that SKIPS integration-tests, 5.12 F21); `tsc` run both with and without
typed routes (F20).

**AC12 — Another phone (SB12).** On the signup step's `sent` stage, and on Settings' PENDING state, a `waOtherPhone.link` control
(collapsed by default) reveals `waOtherPhone.desc` (with the number), the phrase in a SELECTABLE text element, and `waOtherPhone.note`.
Signup takes both values from the mint response (no extra call); Settings from the status response. Nothing is shown in any other state.
No change under `apps/api/src`, `packages/contracts/src`, `packages/domain/src`, `apps/jobs/src` or the migrations. *Legs:* signup —
collapsed, then revealed with the mocked mint's number + phrase; Settings — revealed in PENDING, absent in ACTIVE / null; the copy-key
test covers `waOtherPhone.*`.

## Tasks / Subtasks

- [ ] **Task 0 — Preflight, decisions, governance (AC11)**
  - [ ] 0.1 `git fetch origin`; if `main` moved past the pin, rebase and re-derive F1–F20 (`sed -n` every cite, read past the range). STOP
        and report to BigDev if:
        **S1** the mint gained a member-state guard, or `requireMemberSession` refuses `pending-kyc` (F7) — SB1 (a) then needs an API change;
        **S2** another branch/worktree edits `lib/wizard-steps.ts` or `tc.tsx`'s next route (`git for-each-ref` + `git diff`);
        **S3** `popup_body` / `intro`'s factual claims (payment reminder in WhatsApp scope; every notice in the app) do not hold;
        **S4** a `waSignup.*` key is already taken in either locale (`grep -n '"waSignup\.' packages/i18n/locales/*/common.json`);
        **S5** any routing note or told item after the pin mentions the signup box (`git log 20fcb479..origin/main -- _bmad-output/planning-artifacts`).
  - [ ] 0.2 Put SB1–SB11 and PQ1 to BigDev; record the answers VERBATIM in Debug Log (a). If SB1 (b) or PQ1 "yes": STOP — write the
        routing note from the template (§0 first); do not build SB1 until it is ruled.
  - [ ] 0.3 Author-commit decision (the next free id — re-grep `^### Decision` on `main`, every branch, every worktree), staged in the
        scratchpad first ([[project_decision_log_writes_user_inserted]]); carries SB1–SB11 as answered, the §0 reading (matches both
        ratified texts) AND the stated departure from the row-5-10 / `-364` "Not covered" framing (see the header), PQ1's answer, "Supersessions: none", and what it does NOT cover (counsel's view; SB1 (b)). Committed ALONE
        (`governance:` prefix); its SHA written only after.
  - [ ] 0.4 Records commit: `epics.md` `### Story 5.10` (post-hoc, after 5.9, 5.12's format); §3.4 dated note under the opt-in bullets
        (the bullets unedited); ADR-0029 changelog "annotated" row; roster row `wa-signup-box-hindi-reviewed` (next free Row; Row 37's shape;
        legs (a) + (b) per SB9); the friction-budget row (Task 5); ledger entry (safe prepend — [[project_sprint_status_safe_prepend]]);
        row `5-10-…` `ready-for-dev → in-progress`.
- [ ] **Task 1 — The timeout helper (SB10; AC10)**
  - [ ] 1.1 `apps/mobile/lib/with-timeout.ts`: `CALL_TIMEOUT_MS = 15_000` and `withTimeout<T>(promise, ms)` moved byte-for-byte (the
        timer cleared on settle); its own unit test.
  - [ ] 1.2 `notifications.tsx` imports them; remove the local copies; its render + copy-key tests pass unmodified.
- [ ] **Task 2 — The words (SB5; AC7)**
  - [ ] 2.1 Add the `waSignup.*` keys to en + hi `common.json` (hi as the DRAFT above, marked nowhere in the JSON — the roster row tracks
        review); hand-format ([[project_prettier_not_enforced]]).
  - [ ] 2.2 Run the parity check and the microcopy gate; fix wording (⛔ the rule) if it bites.
- [ ] **Task 3 — The step (SB1–SB4, SB6; AC1–AC6, AC8)**
  - [ ] 3.1 `lib/wizard-steps.ts`: insert `'whatsapp'` after `'tc'`; a dated comment line (Story 5.10, the decision id). Amend
        `tests/unit/workplace.test.ts:41-42`'s order assertion to the seven steps with a dated comment (F18a) — ⛔ delete it.
  - [ ] 3.2 `tc.tsx:128`: `router.replace('/(signup)/whatsapp')`.
  - [ ] 3.3 NEW `app/(signup)/whatsapp.tsx`: stages `loading → ask → sent`; the status load (bounded; AC2 branches → `kyc`); the
        checkbox (F4 pattern); Continue with a busy guard; the reminder overlay (F16 pattern, a SIBLING of the ScrollView, a `shownOnce` flag, a
        `BackHandler` listener while open); the tick path (`requestWaOptIn` → `Linking.openURL`, both caught; codes via `ApiError`); the
        one-attempt rule and outcomes of SB6; announcements via `announcementPlan`; `STATUS_TIMEOUT_MS = 5_000` for the status read. ⚠ `t` NOT in any effect's deps — depend
        on `locale` (T1). Header comment cites the decision id and SB letters.
  - [ ] 3.4 `_layout.tsx`: refresh the stale order comment with a dated line (F3); code unchanged.
  - [ ] 3.5 SB12 / AC12: a small shared component `apps/mobile/components/wa-opt-in/OtherPhoneHint.tsx` (props: `displayPhoneNumber`,
        `verificationPhrase`; collapsed by default; the phrase in a `selectable` text) used by `whatsapp.tsx`'s `sent` stage and
        `notifications.tsx`'s PENDING branch. Add `waOtherPhone.*` (en + DRAFT hi) in Task 2.
- [ ] **Task 4 — Tests (AC1–AC10)**
  - [ ] 4.1 NEW `apps/mobile/tests/unit/wa-signup-step-render.test.ts` (jsdom; the 5.12 harness: real `LocaleProvider`, mocked
        `lib/mmkv`, `lib/member-api`, `expo-router` incl. `router.replace`, `react-native` `Linking` / `Alert` / `AccessibilityInfo`,
        `tamagui` forwarding `testID`; RTL `cleanup`) — EXTENDED: the `tamagui` mock forwards (or a props spy captures) `accessibilityRole`,
        `accessibilityState`, `accessibilityViewIsModal`, `accessibilityLiveRegion`, `theme`, `size`, `height`; the `react-native` mock
        adds `Alert`, `Platform`, `BackHandler`; the `expo-router` mock adds `useRouter`; mint rejections are real `ApiError`s (F19).
        Every AC1–AC6/AC8 leg; ⭐ prove each leg RED once (break the code, see it fail) and
        note it in Debug Log (b).
  - [ ] 4.2 NEW `apps/mobile/tests/unit/wa-signup-copy-keys.test.ts` (real `t()`, both locales, positive control).
  - [ ] 4.3 AC9's two live-DB legs in `apps/api/tests/integration/wa-opt-in/wa-opt-in.spec.ts`, seeded through the real signup path
        on a fresh Pariwar (F19a).
  - [ ] 4.4 `lib/with-timeout` unit test (AC10).
  - [ ] 4.5 AC12 legs: in the new signup render test, and ADDED to `wa-notifications-screen-render.test.ts` (existing legs untouched);
        `waOtherPhone.*` in both copy-key tests.
- [ ] **Task 5 — Friction ledger (F17; AC11)** — ONE new row in `friction-budget.md` (payer: a new member of a Pariwar with WhatsApp
      on — one more signup screen, and for a member who leaves the box unticked one reminder; protects: a WhatsApp yes asked for plainly
      and never pre-ticked; event_type: `forced` — every such member passes the screen, the 6.36a `workplace` precedent). The app switch
      after a tick is ALREADY covered by the 5.4 row *"member (opting in to WhatsApp notifications …) | … | optional"* — named in the
      disposition, ⛔ amended. Plus a "**Story 5.10 disposition (…)**" paragraph naming the files, on the 6.36a precedent. Run `scripts/friction-budget/check.ts`.
- [ ] **Task 6 — Close the records and the gate (AC11)** — `ci:local` on :5433 with `DATABASE_URL` set; `tsc` both ways (F20); push with
      `DATABASE_URL` on :5433 ([[project_prepush_hook_inherits_5432]]); story STATUS line, File List, Change Log; ledger; row → `review`.

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
- **T9 — A mobile edit needs a friction row or disposition** (F17) or the gate fails.

### Reuse map

| Need | Use | ⛔ Rebuild |
|---|---|---|
| Ask for WhatsApp | `memberAuth.requestWaOptIn()` + `Linking.openURL(deepLink)` | a new route / writer |
| Tell 409 codes apart | `err instanceof ApiError && err.code` (`@twt/api-client`; `otp.tsx:70`) | string-matching messages |
| Android back on the overlay | `BackHandler` (`PeerQuestionnaire.tsx:264`) | — |
| Announce once per platform | `announcementPlan` (`lib/death-certificate-announce.ts`) | `notifications.tsx`'s unconditional announce |
| Know if WhatsApp is offered | `memberAuth.getWaOptInStatus()` → `available`, `state` | a config read in the app |
| Bound a call | `lib/with-timeout.ts` (SB10) | a second copy |
| Checkbox | `tc.tsx`'s Button-as-checkbox (F4) | a new primitive |
| Popup | `BannerHost`'s overlay shape (F16) | `Alert.alert` |
| Copy-key test | `wa-notifications-copy-keys.test.ts` | a stubbed `t` |
| Render harness | `wa-notifications-screen-render.test.ts` | new mocks from scratch |

### Testing standards

Mobile: vitest, `tests/unit/**/*.test.ts`, jsdom opt-in, RTL `cleanup` ([[project_mobile_vitest_and_expo_install_traps]]). API live-DB:
`*.spec.ts`, skipped without `DATABASE_URL`; use :5433; never regenerate an applied migration (none is planned). Prove each new leg RED
once. `ci:local` with `DATABASE_URL` on :5433 (`env -u DATABASE_URL` skips integration-tests). Contracts tests are outside `tsc` — none
change here.

### Project structure notes

New: `apps/mobile/app/(signup)/whatsapp.tsx`, `apps/mobile/lib/with-timeout.ts`, `apps/mobile/components/wa-opt-in/OtherPhoneHint.tsx` (SB12), two mobile tests + the helper's test. Changed:
`lib/wizard-steps.ts`, `tests/unit/workplace.test.ts` (the order assertion), `app/(signup)/tc.tsx`, `app/(signup)/_layout.tsx` (comment), `app/(settings)/notifications.tsx` (import + SB12's hint in PENDING), `tests/unit/wa-notifications-screen-render.test.ts` (AC12 legs added),
`packages/i18n/locales/{en,hi}/common.json`, `apps/api/tests/integration/wa-opt-in/wa-opt-in.spec.ts`, `friction-budget.md`, and the
records. `lib/` (⛔ `app/`) for non-routes — expo-router treats `app/` files as routes.

### Sequencing

Governance first ([[feedback_governance_commits_precede_implementation]]): 0.3 alone → 0.4 → Tasks 1–5 → 6. Row 5-11 (SMS fallback) is
independent — it touches neither the wizard nor the mint. No other open row edits `wizard-steps.ts` at the pin (S2 re-checks).

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

`origin/main` tip `20fcb479`; the last 15 commits are Story 5.12 end to end (created → validated → `-373` alone → records → Tasks 1–7 →
two review rounds `5022a43c`, `b64dd462`, `dea4e5d1`, `1ecf5d65` → told item). The pattern to follow: decision alone, records, tasks in
order, the read change last; fix commits prefixed `fix(wa-opt-in):`.

### Latest tech information (fetched 2026-10-21)

Meta, *Get opt-in for WhatsApp* (developers.facebook.com/docs/whatsapp/overview/getting-opt-in): opt-in may be collected off WhatsApp
(websites, apps, SMS, IVR, in person) and *"can be general"*; it must name the business and state that the person is opting in to
receive its messages; *"Businesses must comply with applicable law"*; a tip to give clear opt-out instructions and honour them; no
expiry; nothing on pre-checked boxes (the ratified §3.4 rule is stricter). No library changes; Expo / expo-router / tamagui as pinned.

### References

- `_bmad-output/planning-artifacts/architecture.md` §3.4 *Member WA opt-in flow* (incl. the dated `-364` / `-373` notes)
- `docs/adr/ADR-0029-whatsapp-webhook-ingress-and-opt-in-lifecycle.md` (Rationale; changelog)
- `.decision-log.md` — `2026-07-08-065` item 4; `2026-10-19-364` (option A; "Not covered"); `2026-10-21-373` d1, d10; `2026-10-17-351`
  "NOT cover" (b); `2026-10-20-367` d19 (DPDPA §5 / §6(4))
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-17-6-31-how-long-a-whatsapp-yes-lasts.md` — fact (3), §E2b
- `_bmad-output/implementation-artifacts/5-12-whatsapp-yes-lasts-until-withdrawn.md`; `5-4-member-wa-opt-in-via-inbound-webhook-matching-webhook-ingress-primitive.md`
- `_bmad-output/planning-artifacts/ux-design-specification.md` — Pattern 1: Button Hierarchy
- `docs/launch-gate-inventory/inventory-roster.md` — Row 37 (shape), Row 28 (Hindi-review control)
- `sprint-status.yaml` — row block `5-10-signup-whatsapp-opt-in-checkbox` (its 2026-10-19 comment and annotation)

## Dev Agent Record

### Agent Model Used

### Debug Log References

(a) Task 0.2 answers, verbatim · (b) RED proofs · (c) microcopy / parity / friction gate outputs · (d) dev-DB side effects

### Completion Notes List

### File List

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-10-21 | 1.0 | Created by `bmad-create-story 5.10` (pinned `20fcb479`, branch `story/5-10-signup-whatsapp-opt-in-checkbox` in worktree `.claude/worktrees/5-10`). SB1–SB11 + PQ1 PROPOSED for BigDev at Task 0.2. ⭐ Recommended design needs no API, contract, domain, worker or migration change. ⛔ validated yet. |
| 2026-10-21 | 1.3 | BigDev (in session): *"I think we need to send OTP in this case. May be ask later if whatsapp is on another phone."*, then *"2, go ahead"* ⇒ SB12 + AC12 + Task 3.5 / 4.5: a "WhatsApp on another phone?" link reveals the number + phrase (signup `sent` stage and Settings PENDING); F8b (the phrase is hand-typeable; both responses carry it), F8c (another phone; a `wa.me` link resolves with no WhatsApp — T3 / SB6 corrected). The WhatsApp code itself → routing note `…-2026-10-21-5-10-whatsapp-code-for-another-phone.md` (WRITTEN, ⛔ sent) + backlog row `5-13-whatsapp-code-for-another-phone`. |
| 2026-10-21 | 1.2 | BigDev asked whether the reminder repeats on every app open — it does ⛔: "once per visit" reworded to "once, during signup only — never after signup" (I4, SB4, SB6, AC3, Task 3.3). F8a added: how the number is verified (the sender's blind index + phrase). |
| 2026-10-21 | 1.1 | Create-story checklist pass (one fresh-context verifier; 1 H / 8 M / 10 L, all applied): `workplace.test.ts` pins the step order (F18a, Task 3.1); scope wording "no change under `…/src`" (AC9's test edit); 409 codes via `ApiError` (F12, SB6); the one-attempt rule after a failed tick + `request_failed` copy; harness extended so prop legs bite (F19, Task 4.1); Android back (SB4, AC3); the §0 departure from the row's framing stated; AC9 re-scoped to the real-signup seed (F19a); friction row `forced`; cites corrected (`notifications.tsx:53`/`:56-70`, `payment.tsx:28`, `tc.tsx:195-217`); 5 s status bound; overlay as a ScrollView sibling; SB9 (b) → Row 19 for §5; epics placement. |
