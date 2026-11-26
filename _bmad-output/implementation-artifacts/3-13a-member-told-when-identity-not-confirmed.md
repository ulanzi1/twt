---
baseline_commit: ce0737ce
---

<!--
PINNED: `ce0737ce` = `origin/main` (`git fetch origin` 2026-11-26, at authoring — Story 3.13 landed (PR #353, `ec53a325`) and its
browser-pass focus fix after it (`0899a4ac`, `ce0737ce`)). Authored in its OWN worktree
`/Users/dev/Developer/projects/TWT/.claude/worktrees/3-13a-member-told-when-identity-not-confirmed`, branch
`story/3-13a-member-told-when-identity-not-confirmed`, made with `--no-track` (upstream UNSET — push with an explicit refspec,
[[project_story_branch_upstream_is_main]]). The main checkout was ⛔ switched ([[feedback_shared_tree_branch_switch]]); a peer session
(twt-7f) is live on `governance/panel-sitting-2026-11-26` (its own worktree).
Every `apps/` / `packages/` claim below was traced by hand at `ce0737ce` on 2026-11-26. Re-locate by FUNCTION, ⛔ by line number.
⚠ Two separate facts ([[feedback_story_validate_footguns]] #24): "the pin is an ancestor of HEAD" is durable; "the code claims were
re-derived at `ce0737ce`" is perishable — Task 0.1 re-derives them.

GLYPH REGISTER (footguns #24 (f), #67 (a)): ⛔ = NOT / never / refused; ⭐ = the action or the load-bearing fact; ⚠ = a hazard.
A quotation that carries ⛔ is compared byte for byte with its source. ⛔ `file:NNN` pointer into `.decision-log.md`,
`deferred-work.md` or `sprint-status.yaml` (newest-first files — every prepend rots it, #19 / #25 (d)): cite the decision id + item,
the deferred item's id, the row KEY.

§0 GATE (the routing template's, applied FIRST — `_bmad-output/planning-artifacts/trustee-panel-routing-note-TEMPLATE.md`):
  · THAT the member is told, AND told the reason — RULED: `2026-11-25-502` item 4 (Q2 C, Trustee-ratified). ⛔ a question.
  · WHERE the member is told — RULED as put: B's own words, *"The app tells the member, in their language"* ⇒ in the app, in the app's
    language. ⛔ SMS / push / WhatsApp is a MATCH of the ruled words, ⛔ a narrowing (DL1). ⛔ a question.
  · WHAT "the reason staff recorded" is — the closed list, ⛔ the private note: OUR reading, TOLD to the Panel in
    `trustee-panel-told-2026-11-25-3-13-identity-check-as-built.md` §3 (SENT 2026-11-25), ⛔ objected to. ⛔ a question.
  · THE MEMBER'S WORDS (Hindi + English) — the Panel's, by its own ruling: `-502` item 4 quotes B's cost *"New words for members, in
    Hindi and English, which you would approve"*, and the told note §3 promised *"The member's message, in Hindi and English, will come to
    you for approval as its own piece of work."* ⇒ PQ1 (one note, Task 0.3), built on the PROPOSED words until approved; it blocks
    GO-LIVE (roster Row 57 (b)), ⛔ the build or the merge.
  · WHAT "HOW TO ARRANGE IT" PROMISES — what the Trust tells a member it will do (a phone call from staff) and where to go (the in-app
    help request) — the Panel's: it is the substance of the words (PQ1's options, ⛔ a separate note).
  · HOW it is built — the read, the route, the card, its place on the home screen, the cache, the staff hint's words — the AUTHOR's
    (DL1–DL12, BigDev at Task 0.2).
-->

# Story 3.13a: A Member Is Told When Staff Could Not Confirm Their Identity — and Why

Status: ready-for-dev

## Story

As a **member who typed in my own identity details when I joined, and whose identity the Trust's staff could not confirm**,
I want **the app to tell me — in my language — that my identity could not be confirmed yet, why, and how to arrange it**,
so that **I can put it right before it matters, instead of finding out only when my lock-in ends or my family files a claim.**

And as a **District Admin / Pariwar Admin recording "Could not confirm"**, I want **to see, on the form, that the member is told the
reason I pick**, so that **I choose it knowing the member will read it.**

## The rulings and records this story builds on

| Source | What it says (verbatim where it binds) | Status |
|---|---|---|
| `2026-11-25-502` item 4 (Q2 C) | *"As B, and the member is also told the reason staff recorded"* — B being *"The app tells the member, in their language, that their identity could not be checked yet and how to arrange it."* ⚠ Cost as put, accepted: *"A reason like "the photo does not match" is also told to an impostor, and tells them what to fix."* And B's: *"New words for members, in Hindi and English, which you would approve; a new piece of work to build them."* | **Trustee-ratified** (DR + KB) |
| `2026-11-25-502` Consequence 2 | *"A new row `3-13a` (BigDev's choice) builds Q2 C — the member's message in Hindi and English, with the reason, words approved by the Panel; it owes its own AI-10-1 note only if it changes a gate (it should not)."* | author (⛔ ratified) |
| `2026-11-25-502` Policy meaning | *"If staff cannot confirm you, the app tells you, and tells you why."* | the decision's own sentence |
| Routing note `trustee-panel-routing-note-2026-11-21-3-13-checking-a-typed-in-identity.md`, Q2 as put | *"staff record "could not confirm" with a reason (the details do not match the ID, the photo does not match, no ID was shown, or the member could not be reached); nothing about the member changes — should the app tell them?"* · C's row: *"What changes for a person — The member knows exactly what went wrong."* | the question AS PUT (unedited) |
| `2026-11-25-503` item 4 | *"Q2 C's message is row `3-13a`'s. 3.13 keeps `not_confirmed_reason` a plaintext closed enum so 3-13a can read it member-side; the Tier-1 note is ⛔ told (C's "the reason staff recorded" is the closed list the note put, ⛔ the note — OUR reading). The staff hint that the member is told the reason is added by 3-13a when its message ships."* | author-commit |
| Told note `trustee-panel-told-2026-11-25-3-13-identity-check-as-built.md` §3 (SENT 2026-11-25, `72fd4561`) | *"Under Q2 C the member will be told the reason from that list. We read your words as not including the private note, which stays with staff. The member's message, in Hindi and English, will come to you for approval as its own piece of work."* | TOLD, ⛔ objected to |
| `2026-11-26-504` item 5 + `deferred-work.md` `3.13-R1-W6` | the staff note is held OUT of the member's data export; whether a person may download it is asked *"at the Panel sitting that approves row 3-13a's member message, or before the data export goes live, whichever is first"*. | author-commit; ⏳ open |
| Roster Row 57 `identity-validation-live` leg **(b)** + its 2026-11-25 dated line | *"(b) — ruled C (the member is told, with the reason) ⇒ OPEN until row `3-13a` is built."* | go-live leg |
| Story 3.13 N6 / DL12 / DL16 | N6: the reason *"stays a plaintext closed enum (3-13a reads it member-side without a decrypt); ⛔ fold the reason into the note."* DL12: *"⛔ staff hint that the member is told the reason — row `3-13a` adds it when its message ships (it would be false before)."* | story (done) |
| Story 4.7 AC2a (the member status screen) | the status presenter sets `identitySuppressed: isMember` — *"identity / Aadhaar / KYC are NOT re-displayed"* on that screen (`packages/ui/src/member-status/presenter.ts` `buildMemberStatusViewModel`) ⇒ DL1 puts the message on the HOME screen, ⛔ there. | story (done) |

## 📜 Policy meaning (AI-10-1)

⭐ **This story introduces ⛔ predicate that gates a member's access to a BENEFIT, and changes ⛔ existing one.** It adds a predicate
that decides whether a MESSAGE is shown (DL2) — it moves ⛔ state, ⛔ flag, ⛔ coverage, ⛔ eligibility; `trustee_verified`, the reducer,
6.39's identity half and the 3.13 eligibility rule are read, ⛔ written or changed.
**In the member's terms (the message's own meaning, for the record):** *"If the Trust's staff tried to check your identity and could not,
the app tells you so, tells you why, and tells you how to arrange the check. Once staff confirm you, the message goes away."*
**Checked against the Niyamavali:** ⛔ clause is engaged — it is silent on how a member is told about a step of their own verification
(§2.1 (b) requires the verification itself, which 3.13 built). ⛔ conflict.
⚠ **What this note does ⛔ cover:** the lock-in-end consequence for a member staff never confirm (they stop being covered) is row
`3-14`'s and belongs in ITS note — and the home screen's existing lock-in line already promises cover (F9), which `3-14` must reword.

## ⭐ THE INVARIANTS

- **N1 — ONE definition of "awaiting a check".** The message shows ONLY for a member 3.13 itself would still check: the read calls 3.13's
  `identityValidationIneligibility(...)` (`packages/domain/src/member/identity-validation.ts`) and 3.13's standing-death-report
  predicate `isDeathReportStanding` (`packages/domain/src/claim/death-report.ts`) — ⛔ a second copy of either rule. If 3.13's
  eligibility changes (3.16's new strength, 3-14's states), the message follows it for free.
- **N2 — The LIVE row only.** `superseded_at IS NULL` (the partial-unique index `member_identity_validations_one_live_per_member_uq`).
  ⛔ "latest" by `decided_at` (one transaction ⇒ equal `now()`, [[project_db_clock_ordering_tests_tie]]).
- **N3 — The reason and NOTHING else of the record reaches the member.** The member's wire carries the closed reason code only:
  ⛔ the note (Tier-1 — ⛔ even selected), ⛔ `decided_by_actor_id` / `decided_by_display`, ⛔ `evidence_kind` / `document_kind`,
  ⛔ the attempt count, ⛔ `validation_id`, ⛔ the date (DL3). ONE uniform rule for the surface ([[feedback_withholding_must_be_uniform]]):
  every withheld field is absent from the SQL select, the domain type, the contract AND the screen — ⛔ "fetched then hidden".
- **N4 — ⛔ write on read.** The member's read writes ⛔ row, ⛔ event, ⛔ audit line, ⛔ "seen" marker; it takes ⛔ advisory lock (3.13
  DL5: ⛔ lock on a read).
- **N5 — ⛔ change to 3.13's writer, its routes, its tables or its reducer arms.** The only 3.13 files touched are the admin i18n file +
  the detail page (the staff hint, DL9) and the domain module (one new exported read, DL4) — ⛔ an edit to an existing function.
- **N6 — The message never outlives its truth on the phone.** A cached "not confirmed" must not show after staff confirm, after a death
  claim, or when the read fails (DL6). ⛔ persisted to the phone's storage.

## Found facts (traced at `ce0737ce`)

- **F1 — ⛔ member-side reader of `member_identity_validations` exists.** The only member-audience read of the reason is the data export
  (`packages/domain/src/data-export/assemble.ts` `assembleMemberExport` → `identityChecks[]`: `decidedAt`, `outcome`, `evidenceKind`,
  `documentKind`, `notConfirmedReason` — ⛔ the note, ⛔ `decided_by_*`; contract `ProfileSection.identityChecks`,
  `packages/contracts/src/data-export/data-export.ts`). ⛔ standalone "live row for a member" function exists — `readIdentityCheckDetail`
  (admin) finds it with `rows.find(r => r.supersededAt === null)` and returns the note ciphertext ⇒ ⛔ reuse it member-side (N3).
- **F2 — The record.** `packages/domain/src/schema/member_identity_validations.ts`: enums `IDENTITY_VALIDATION_NOT_CONFIRMED_REASONS`
  (`details_do_not_match | photo_does_not_match | no_document_shown | member_not_reached`), `IDENTITY_VALIDATION_OUTCOMES`; its header
  routes this story (*"row `3-13a` tells the member the reason"* — the reason is plaintext for that). Migration `0218`: RLS by
  `app.pariwar_id` ONLY (select / insert / update policies to `twt_app`; ⛔ member-self policy, ⛔ `twt_service` leg) ⇒ the member read
  runs in `openScopeTx` for the member's Pariwar AND filters `member_id = <the session's member>` in SQL — the policy alone would show
  any member of the Pariwar ([[feedback_story_validate_footguns]] #56 (a): CI's superuser bypasses RLS, so a read outside the scope
  transaction passes CI and is dead in production).
- **F3 — The eligibility rule (N1).** `identityValidationIneligibility(facts: { state, moderationStatus, kyc })` returns `null` when
  awaiting: a KYC row, a staff-checkable strength (`isKycStrengthStaffCheckable` — `self_declared` today), ⛔ already verified
  (`isKycIdentityVerified`), state ∈ `IDENTITY_VALIDATION_ELIGIBLE_STATES` (`lock-in`, `pending-valid`), moderation ≠ `terminated`. The
  inputs are read by `getCurrentMemberState`, `getCurrentMemberModerationOverlay`, `getMemberKycProfile` (3.13's private
  `readEligibility` does exactly this and THROWS — the new read needs the same three reads returning a value, ⛔ an exception). The
  death predicate is separate: `isDeathReportStanding(db, pariwarId, memberId)` (3.13 `readIdentityCheckDetail` calls it too).
- **F4 — The member route precedent.** `apps/api/src/modules/member-home/` — `routes.ts` `registerMemberHomeRoutes` (GET
  `/api/v1/member/lock-in-status`, `preHandler: [memberSession]` = `requireMemberSession(deps)`, `schema.response[200]`, tag
  `member-home`; registered via the module's `index.ts`); `handlers.ts` `createMemberHomeHandlers().lockInStatus`: `memberCtx(request)` →
  `openScopeTx(deps, pariwarIdStr)` → domain reads on `scopeTx.tx` → `closeScopeTx(scopeTx, ok)`. Its header: session-guarded ⇒ covered
  by the Story 1.14 login-wall gate (`apps/api/tests/integration/login-wall.spec.ts`), ⛔ on the public allowlist. Live test precedent:
  `apps/api/tests/integration/member-home/lock-in-status.spec.ts`. SDK: `packages/api-client/src/index.ts` `createMemberAuthClient`
  `memberLockInStatus()`; the mobile instance `apps/mobile/lib/member-api.ts` `memberAuth`.
- **F5 — Contracts.** `packages/contracts/src/members/identity-check.ts` already exports `IdentityCheckNotConfirmedReason` /
  `IDENTITY_CHECK_NOT_CONFIRMED_REASONS` (the admin DTOs; lockstep with the domain enum) ⇒ REUSE it, ⛔ a third copy. Contracts never
  import `@twt/domain`. Members barrel: `packages/contracts/src/members/index.ts`. Contracts tests sit outside tsc
  ([[project_contracts_tests_outside_tsc]]).
- **F6 — The home screen.** `apps/mobile/app/(tabs)/index.tsx` (`YogdaanTab`) is a ScrollView of self-suppressing entries, in order:
  `ActiveContributionCard` (Story 8.2 — TOPMOST, by AC), `ViewContributorsEntry`, `SahyogVivranEntry`, `PeerRequestEntry`,
  `KnownPeopleRequestEntry`, `NomineeLinkRequestEntry`, `HomePromptCards`, `AnnouncementChannelsCard`, **`LockInClockWidget`**,
  `RenewalStatusWidget`, … `MembershipStatusEntry`, …. The member this story tells is in `lock-in` (every typed-in paid member, until row
  `3-14`) ⇒ the lock-in widget is the message's neighbour. The cleanest card precedent is the dedicated self-suppressing entry
  (`components/peer-request/PeerRequestEntry.tsx`, `components/known-people/KnownPeopleRequestEntry.tsx`): its own query, renders
  `null` unless there is something to say, `accessibilityLabel` = title + body. ⚠ `KnownPeopleRequestEntry`'s header records a trap
  this story has too: *"TanStack keeps the previous pages when a refetch fails, so reading the open requests alone kept showing a member
  who had left `active` their old one"* (DL6).
- **F7 — The cache.** `apps/mobile/lib/query-client.ts`: default `staleTime` 1 h, `gcTime` 7 d, `refetchOnWindowFocus: false`; the
  client is PERSISTED to MMKV (`components/Provider.tsx` `PersistQueryClientProvider`) and the dehydrate filter
  (`components/peer-request/peer-request-cache.ts` `PEER_REQUEST_DEHYDRATE_OPTIONS`) skips a query ONLY when its `gcTime === 0`
  (*"`gcTime: 0` IS READ HERE AS AN EXPLICIT "⛔ NEVER PERSIST THIS" MARKER"*). Precedent options:
  `KNOWN_PEOPLE_CACHE_OPTIONS = { gcTime: 0, staleTime: 0 }` (`components/known-people/known-people-cache.ts`), keys namespaced by
  `(pariwarId, memberId)`. ⇒ a default query here would keep "not confirmed" on the phone for a week and show it after a confirmation.
- **F8 — i18n.** `packages/i18n/locales/{en,hi}/<namespace>.json`, flat dotted keys; `useT()` from `@twt/i18n/react`; `t()` THROWS on a
  missing key or a missing `{param}` (#27). `lock_in.*` lives in `common`. Gates: hi/en parity `packages/i18n/scripts/check-parity.ts`
  (`pnpm i18n:check`); microcopy `microcopy.yaml` — `scope.copy_globs` INCLUDES `packages/i18n/locales/{hi,en}/common.json` (read in the
  file, ⛔ its header — #22 (a)) and `scope.code_globs` covers `apps/admin/src/**` (the whole words `receipt` / `report` / `invoice` fail
  in copy, test ids AND comments — [[project_microcopy_gate_scans_admin_code]]). Existing member identity words: signup-only `kyc.*`
  (`kyc.title` "Verify your identity" / "अपनी पहचान सत्यापित करें"); ⛔ member line anywhere says "pending-valid", "unverified" or
  "could not be confirmed". The helpdesk's form title is `helpdesk.json` `new.title` "Ask for help" / "मदद माँगें".
- **F9 — ⚠ The lock-in line promises cover.** `common.json` `lock_in.rationale`: *"… You'll be eligible for claim cover once the lock-in
  ends."* For a member staff never confirm, that is FALSE once row `3-14` lands (they go to `pending-valid`, ⛔ in `VALID_STATES`). ⛔ This
  story's to reword (member words are Panel-approved; the consequence is 3-14's) ⇒ a `deferred-work.md` item routed to `3-14` (Task 0.5).
- **F10 — "How to arrange it" — what is REAL today (#65 (c): ⛔ promise a mechanism nothing builds).**
  (a) **Staff can phone the member**: 3.13 DL6a's `member.reveal_mobile_for_identity_check` (District Admin, Pariwar Admin, verifier,
  helpline operator; Super Admin derived), only while the member is awaiting a check — built and landed. ⛔ a guarantee that anyone
  WILL phone.
  (b) **The member can ask in the app**: the member helpdesk (Story 10.2, `done`) — `apps/mobile/app/(helpdesk)/new.tsx`, category
  `kyc-trouble` ("KYC or verification help" / "KYC या सत्यापन में मदद"), routed by `packages/domain/src/helpdesk/registry.ts` to
  `target_role: 'helpline_operator'` at `pariwar` dimension — the SAME role 3.13 lets see the number and the queue. ⚠ The operator can
  reach the member and see the queue, ⛔ record the check (only a District / Pariwar Admin can) — the hand-off is between staff.
  `new.tsx` reads its category from a draft (`draft.category`) — ⛔ route parameter preselects one today (DL8).
  (c) **The member CANNOT re-run DigiLocker or re-type their details** (both KYC routes refuse unless `pending-kyc` — Story 3.13 F2) ⇒
  the words must ⛔ say "submit again" / "verify again in the app".
- **F11 — Push / SMS / WhatsApp.** Push is ⛔ wired on the phone (`apps/mobile/lib/push-notifications.ts` is a prototype imported
  nowhere; the api-client has ⛔ device-token method; FR-71 freezes push at seven categories). An SMS is a DLT family per template
  (`apps/jobs/src/scheduler/*-sms-templates.ts`; roster rows 30 / 32) — ⛔ asked for by the ruling (DL1).
- **F12 — Numbers at the pin (re-read at Task 0.1 across EVERY ref and worktree).** Highest decision `2026-11-26-507` on every ref
  (local + remote) ⇒ next `-508`. Highest migration `0218` ⇒ this story needs ⛔ migration. Ledger: `2026-11-26a`–`f` used ⇒ next
  `2026-11-26g`. Roster: highest Row 57 — this story adds ⛔ row (it is Row 57 (b)'s build). ⚠ The peer branch
  `governance/panel-sitting-2026-11-26` (unpushed, peer session twt-7f) holds a Panel agenda PREPARED, ⛔ sent, whose Part C lists
  *"The member's message when their identity is not confirmed: the Hindi and English words, once that work is built."* and whose item 9
  is the `3.13-R1-W6` note (`4a48c24d`) — ⇒ Task 0.3's note may join that sitting (BigDev's call; ⛔ edit the peer's branch).
- **F13 — Code that routes work here (#9 — grep `3-13a` in `apps/`, `packages/`, `scripts/` at Task 0.1):**
  `apps/admin/src/modules/identity-checks/i18n-en.ts` header *"⛔ A staff hint that the member is TOLD the reason — row `3-13a` adds it
  when its message ships (it would be false before)."*; `packages/domain/src/schema/member_identity_validations.ts` (two comments);
  `packages/domain/tests/integration/member/identity-validation-rtbf.spec.ts`, `packages/domain/tests/member/rtbf-anonymize.test.ts`
  (*"the reason (row 3-13a's)"* — they keep the reason through erasure; ⛔ change needed).
- **F14 — The friction-budget declaration gate** (`scripts/friction-budget/`, `friction-budget.md` §"How to declare"): a PR touching
  `apps/mobile/**` FAILS unless `friction-budget.md` is touched with a row (`payer` + `protects` + `event_type ∈ {forced, optional}`).

## Build decisions — PROPOSED (BigDev answers at Task 0.2)

- **DL1 — Where: the app only, a card on the HOME screen.** A new self-suppressing card `IdentityCheckNoticeCard`
  (`apps/mobile/components/identity-check/`), mounted in `app/(tabs)/index.tsx` directly ABOVE `<LockInClockWidget />` (F6) — the
  `PeerRequestEntry` shape, ⛔ below `ActiveContributionCard` (8.2's topmost AC). ⛔ SMS, ⛔ push, ⛔ WhatsApp, ⛔ banner row, ⛔ notice-strip
  item: the ruling says *"The app tells the member"* (a MATCH); push is ⛔ wired (F11). *Considered and not taken:* the membership status
  screen (4.7 AC2a suppresses identity there — a prior AC would have to be reopened; and a member must navigate to find it);
  `HomePromptCards` (one card at a time and dismissible — another prompt could hide it); a new screen (the whole message fits on the card).
  ⚠ COST (stated in the Panel note's info block): a member who never opens the app is ⛔ told.
- **DL2 — When it shows (N1, N2).** ALL of: the member's LIVE row exists and is `not_confirmed`; `identityValidationIneligibility(...)`
  is `null` right now; `isDeathReportStanding` is false. Otherwise ⛔ card. So: ⛔ checked yet ⇒ nothing (the ruling covers a member staff
  could ⛔ confirm — telling every unchecked member is ⛔ asked); a later `confirmed` ⇒ gone; a later `not_confirmed` with another reason
  ⇒ the NEW reason; a claim filed for the death ⇒ gone (the identity is checked on the claim then — 3.13 DL5); `withdrawn` /
  `anonymized` / `terminated` / a non-checkable strength ⇒ gone.
- **DL3 — What it says (N3).** Four parts: a title (*could not confirm yet*), ONE reason line for the live reason (four keys — one full
  sentence per reason, ⛔ a `{reason}` interpolation, so no `t()` param can be missing, #27), the how-to-arrange line (PQ1), and one button
  (DL8). ⛔ the date, ⛔ who checked, ⛔ how / which ID they saw, ⛔ the note, ⛔ how many attempts. *Considered:* the date (*"on 12
  November"*) — ⛔ in the ruled words; left out (narrow). The words are in PQ1's table, PROPOSED until approved.
- **DL4 — The domain read.** NEW `readMemberIdentityCheckNotice(db, pariwarId, memberId): Promise<{ reason:
  IdentityValidationNotConfirmedReason } | null>` in `packages/domain/src/member/identity-validation.ts` (exported through the existing
  `member/index.ts` barrel). Order: the live row (`select outcome, not_confirmed_reason … where pariwar_id = $1 and member_id = $2 and
  superseded_at is null` — ⛔ `note_ciphertext`, ⛔ `decided_by_*` in the select list) → ⛔ row or `confirmed` ⇒ `null` → the three
  eligibility reads + `identityValidationIneligibility` (F3) → `isDeathReportStanding` → `{ reason }`. A `not_confirmed` live row with a
  NULL reason is impossible (0218's CHECK) — if it occurs, THROW (fail loud, ⛔ guess). ⛔ lock, ⛔ write (N4). Transport-free.
- **DL5 — The route and the contract.** NEW `GET /api/v1/member/identity-check-notice` in `apps/api/src/modules/member-home/`
  (`routes.ts` + `handlers.ts` — the F4 shape: `requireMemberSession`, `openScopeTx` for the session's Pariwar, the member id from the
  SESSION ⛔ a parameter). Response `MemberIdentityCheckNoticeResponse = z.object({ notice: z.object({ reason:
  IdentityCheckNotConfirmedReason }).strict().nullable() }).strict()` in a NEW `packages/contracts/src/members/identity-check-notice.ts`
  (+ barrel), reusing F5's enum. A NEW endpoint, ⛔ a field on `lock-in-status` (a new key on an existing `.strict()` member response
  breaks every installed app that parses it — #29 (a)). A read failure ⇒ 500 (⛔ fail-soft to `notice: null` — a silent `null` would
  hide a real message; the CARD hides on error, DL6). SDK `memberIdentityCheckNotice()` in `createMemberAuthClient`. OpenAPI regenerated.
- **DL6 — The cache and the stale-message trap (N6, F6, F7).** `useIdentityCheckNoticeQuery` with `{ gcTime: 0, staleTime: 0 }` (⛔
  persisted — the reason is personal data and must not sit on the phone; the F7 marker) and a key namespaced
  `['identity-check-notice', pariwarId, memberId]`; disabled until the session has loaded. The card renders ONLY when the query's
  latest fetch SUCCEEDED and returned a notice: `status === 'success' && !isError && data.notice !== null` — a failed REFETCH hides it
  (TanStack keeps the old data on a failed refetch, F6's recorded trap). It refetches when the home tab regains focus (mirror what the
  home's other entries do — read `KnownPeopleRequestEntry` / `useKnownPeopleQueries.ts` at Task 3; ⛔ invent a second mechanism).
- **DL7 — Language.** The app's language (`useLocale()` — Hindi until the member picks, Story 6.35). *"In their language"* = the
  language the app shows them (a MATCH). Keys in `common` (`identity_check.notice.*`, beside `lock_in.*`), hi AND en, parity-checked.
- **DL8 — The button: "Ask for help".** Opens the help form `/(helpdesk)/new` with the `kyc-trouble` category PRE-SELECTED: `new.tsx`
  accepts an optional `category` route parameter, honoured ONLY when it names a category in the in-force list AND the draft has ⛔
  category yet (⛔ overwrite a member's draft); every other value is ignored. The label reuses the helpdesk's own title meaning (*"Ask for
  help"* / *"मदद माँगें"*, F8) under a NEW key in `common` (⛔ cross-namespace read). *Option (b), considered:* open the form
  unselected (⛔ edit to 10.2's screen; the member must find "KYC or verification help" themselves). Recommended: preselect.
- **DL9 — The staff hint (English; BigDev approves — staff words are the author's, 3.13 DL12).** On the "Could not confirm" form, under
  the reason choice, one line: *"The member is told this reason in the app."* — key `form.reasonToldToMember` in
  `apps/admin/src/modules/identity-checks/i18n-en.ts`, rendered in `IdentityCheckDetailPage.tsx`; the header comment F13 quotes is
  REPLACED by a dated line saying it shipped. ⚠ It becomes true only when this story's card ships — same PR, ⛔ earlier.
- **DL10 — Accessibility.** The card is static content: ⛔ live region, ⛔ announcement (nothing changes while it is on screen). The
  button's `accessibilityLabel` = title + reason + how (the `PeerRequestEntry` S30 lesson — the label alone dropped the body). Text wraps
  (⛔ one-line Tamagui button text — [[project_tamagui_button_text_one_line]]: the card's text is ⛔ inside the `Button`'s label; the
  button carries only its short label).
- **DL11 — Erasure and export: ⛔ change.** The export already carries the reason (F1); an anonymized member is ⛔ awaiting a check (DL2 ⇒
  ⛔ card) and cannot sign in.
- **DL12 — Not in scope:** an SMS / push / WhatsApp message (DL1); telling a member who was never checked; the lock-in line's promise of
  cover (F9 — row `3-14`); the staff note in the export (`3.13-R1-W6` — asked at the SAME sitting as PQ1, by the peer's note, F12); a
  "seen" record; any change to 3.13's writer, routes or record; the upload route (row `3-16` — when it lands, its `not_confirmed` acts
  reach this card through N1 automatically; its own words for "how to arrange it" are 3-16's to add).

## Panel question — PROPOSED (one note at Task 0.3)

⭐ It passes §0: the words are what the Trust TELLS a member, and the Panel reserved them (`-502` item 4's cost line; the told note §3).
It blocks GO-LIVE (Row 57 (b)), ⛔ the build or the merge. Built on option A's words meanwhile.

- **PQ1 — The member's words, and what "how to arrange it" promises.**
  - ⭐ **The one fact that decides it:** the member cannot fix this alone in the app — they cannot re-run DigiLocker or retype their
    details (F10 (c)); only a meeting or a video call with staff can, and staff can already see the member's number to arrange one (F10
    (a)). So the "how" line must point the member at staff, and must not promise more than staff will do.
  - **A (our suggestion):** both ways — *"Staff may phone you to arrange it, or you can ask for help here."* + an "Ask for help" button
    (the help request reaches the helpline operators). *Cost:* "may phone" is a possibility, ⛔ a promise — a member may wait for a call
    that never comes; the help request reaches a helpline operator, who must pass it to a District or Pariwar Admin to do the check.
  - **B:** only the help request — *"Ask for help here to arrange it."* *Cost:* every member must act first; one who does not will hear
    nothing more unless staff phone anyway.
  - **C:** only the phone call — *"The Trust's staff will phone you to arrange it."* *Cost:* a promise the Trust must keep for every such
    member; ⛔ way for the member to start it; "will" is ⛔ true today (nothing schedules a call).
  - **The words themselves (Hindi and English) — approve as written, or change them:** the table below. ⚠ The Hindi is the session's
    draft — it needs a Hindi reader's eye before it is sent (Task 0.3).

| Key (`common`) | English (PROPOSED) | Hindi (PROPOSED — session's draft) |
|---|---|---|
| `identity_check.notice.title` | We could not confirm your identity yet | आपकी पहचान की पुष्टि अभी नहीं हो सकी |
| `identity_check.notice.reason.details_do_not_match` | Reason: the details on your photo ID did not match the details you gave when you joined. | कारण: आपके फ़ोटो पहचान पत्र का विवरण, जुड़ते समय दिए गए आपके विवरण से मेल नहीं खाया। |
| `identity_check.notice.reason.photo_does_not_match` | Reason: the photo did not match. | कारण: फ़ोटो मेल नहीं खाई। |
| `identity_check.notice.reason.no_document_shown` | Reason: no photo ID was shown. | कारण: कोई फ़ोटो पहचान पत्र नहीं दिखाया गया। |
| `identity_check.notice.reason.member_not_reached` | Reason: we could not reach you. | कारण: हम आपसे संपर्क नहीं कर सके। |
| `identity_check.notice.how` (option A) | To finish this, show an original government photo ID (for example your Aadhaar card, PAN card or voter ID card) to the Trust's staff, in person or on a video call. Staff may phone you to arrange it, or you can ask for help here. | इसे पूरा करने के लिए, अपना कोई मूल सरकारी फ़ोटो पहचान पत्र (जैसे आधार कार्ड, पैन कार्ड या वोटर आईडी कार्ड) ट्रस्ट के कर्मचारियों को आमने-सामने या वीडियो कॉल पर दिखाएँ। कर्मचारी समय तय करने के लिए आपको फ़ोन कर सकते हैं, या आप यहाँ मदद माँग सकते हैं। |
| `identity_check.notice.ask_help` | Ask for help | मदद माँगें |

  - ⚠ Every line is checked against what is built: the six ID kinds are 3.13 DL7's (`-502` item 1 — *"An original government photo ID,
    shown in person or on a video call"*); "staff may phone" is F10 (a); "ask for help here" is F10 (b). ⛔ line says "submit again",
    ⛔ line names a time limit (3.13 DL9: ⛔ attempt limit, ⛔ time limit), ⛔ line mentions cover or lock-in (F9 — 3-14's).
- **Shown for information — ⛔ asked (object if you disagree)** (each is a MATCH or the narrow side — [[feedback_told_line_must_not_carry_panel_choice]]: ⛔ a choice the Panel must make):
  1. The message is in the app only — ⛔ text message, ⛔ phone notification (your words: *"The app tells the member"*). A member who
     never opens the app is not told.
  2. It shows only while the member is still waiting for a check, and goes away once staff confirm them.
  3. Once a claim is filed for the member's death it stops showing — the identity is then checked on the claim, as you ruled on 31
     October.
  4. The member sees the reason from the list only — ⛔ the date, ⛔ who checked, ⛔ the private note (as told on 25 November).
- ⛔ **NOT a question:** that the member is told, and told the reason (`-502` item 4); where (the app); what "the reason" is (told §3).
- ⭐ **Read with:** the peer note `trustee-panel-routing-note-2026-11-26-3-13-staff-note-in-member-download.md` (`3.13-R1-W6`; on
  `governance/panel-sitting-2026-11-26`, ⛔ sent) — the deferred item names THIS sitting for it.

## Acceptance Criteria

1. **AC1 (Task 0 — governance FIRST).** Before any `apps/` / `packages/` change: Task 0.1's re-derivation recorded; BigDev's Task 0.2
   answers recorded verbatim; the decision entry committed ALONE; the Panel note written and committed ALONE (⛔ "sent" until BigDev
   says so — [[feedback_shown_to_panel_means_sent]]); Row 57's dated line and the `deferred-work.md` lines written; the row
   `in-progress`. ⭐ Then this file is AMENDED to the recorded answers (every DL / AC / Task that a changed answer touches — #67 (e)),
   and the words table stays marked PROPOSED until the Panel approves them.
2. **AC2 (DL4, N1–N4).** `readMemberIdentityCheckNotice` returns `{ reason }` for a member whose live row is `not_confirmed` and who is
   awaiting a check, and `null` for EACH of: ⛔ row; live `confirmed`; a `not_confirmed` superseded by a `confirmed` (two acts in ONE
   transaction — the clock-tie leg); a member `active` / `withdrawn` (hand-seeded); `terminated`; `aadhaar_kyc`; `trustee_verified`
   true; a standing death report (and the reason again once the claim is released innocent — the 3.13 AC6 control). A second
   `not_confirmed` with a different reason returns the NEW reason. Another member's live row in the SAME Pariwar is ⛔ returned (the
   `member_id` predicate — RLS alone would pass it), and a row in another Pariwar is invisible. Each `null` case has a passing control
   beside it ([[feedback_assertion_after_savepoint_rollback_is_vacuous]]). Live DB, own container, `twt_dev`. ⭐ A unit/source test
   proves the read's SQL selects ⛔ `note_ciphertext` / `decided_by_actor_id` / `decided_by_display` / `evidence_kind` /
   `document_kind` (the select list, ⛔ only the returned object). ⛔ row / event / audit line is written (counts before = after).
3. **AC3 (DL5).** `GET /api/v1/member/identity-check-notice`: ⛔ session → 401; an admin session → refused; a member session → 200 with
   `{ notice: { reason } }` or `{ notice: null }`; the member is the SESSION's (a second member's notice never appears — two members, one
   Pariwar). The response's key set is EXACTLY `notice` / `reason` (a key-set assertion on the parsed body, ⛔ "has reason"), and the
   serialized body contains ⛔ the note's plaintext and ⛔ the recorder's display name (both seeded, searched for). The contract is
   `.strict()` (an extra key is refused by a contract test). The route is covered by `login-wall.spec.ts` (green, and ⛔ on the public
   allowlist). OpenAPI regenerated — compared with anchors resolved ([[project_openapi_yaml_anchor_renumbering]]).
4. **AC4 (DL1, DL3, DL6, DL7, DL10).** The card renders NOTHING while loading, on error, on `notice: null`, and after a refetch that
   FAILS following a success that had a notice (the stale-data leg — red without DL6's `!isError`); and, on a notice, the title, exactly
   ONE reason line (the live reason's — each of the four reasons, in `hi` AND `en`, through the REAL `t()` with locale-distinct values,
   [[feedback_stub_must_call_not_transcribe]]), the how line and the button. A refetch returning `null` removes it. The query options
   are `{ gcTime: 0, staleTime: 0 }` (a pin test imports the exported options — the ⛔-persisted marker, F7) and the key carries
   `pariwarId` and `memberId`. The card is mounted directly above `<LockInClockWidget />` and BELOW `<ActiveContributionCard />` (a
   source-order test over `app/(tabs)/index.tsx`). The button's `accessibilityLabel` carries title + reason + how.
5. **AC5 (DL8).** The button opens `/(helpdesk)/new` with `category=kyc-trouble`; `new.tsx` preselects it ONLY when the draft has ⛔
   category and the value is in the in-force list — a test each for: preselected; an existing draft category kept; an unknown value
   ignored; ⛔ parameter (10.2's behaviour unchanged — its existing tests green and unedited).
6. **AC6 (PQ1 words).** Every member string is under `identity_check.notice.*` in `common.json`, hi and en, equal to the words table as
   last approved (PROPOSED until PQ1 is ruled) — a test compares each key with an `APPROVED` table in the test (the
   `panel-473-family-copy-resolves.test.ts` shape), so a ruling that changes a word changes ONE table and the strings. `pnpm i18n:check`
   green; the microcopy gate green ON `common.json` (it is in `copy_globs`, F8). ⛔ line contains "submit", "again", "lock-in", "cover"
   or a digit (a test over both locales).
7. **AC7 (DL9).** The "Could not confirm" form shows *"The member is told this reason in the app."* under the reason choice (admin
   vitest), from `i18n-en.ts` (⛔ an inline literal); 3.13's admin tests stay green and UNEDITED except where they enumerate the i18n keys;
   the microcopy gate green on the admin files.
8. **AC8 (records).** `friction-budget.md` row (F14; `payer`: the member reading the message / `protects`: a member learning their
   identity is unconfirmed before it costs them / `event_type: optional`) and the gate green; the sprint row → `review` with ONE ledger
   entry (safe prepend, YAML parses, row count holds — [[project_sprint_status_safe_prepend]]); Row 57 (b)'s dated line; F13's comments
   updated; the PR's GitHub `ci.yml` run at the EXACT tip SHA concluded `success`, all jobs (ADR-0047 cl.1, `2026-11-24-499`), cited by run
   id + SHA + jobs passed / total for the PR run AND the push to `main`. `pnpm ci:local` optional; if run, on a FRESH container.
9. **AC9 (go-live, ⛔ merge).** A device pass on Android (the card in Hindi and English for one reason, TalkBack reads the button's label
   once, the help form opens preselected, the card gone after staff confirm) is a GO-LIVE leg recorded on Row 57 (b), ⛔ a merge
   condition ([[project_not_in_production_merge_is_not_golive]]; device recipe [[project_installed_debug_apk_cannot_reach_metro]]).

## Tasks / Subtasks

- [ ] **Task 0 — Governance FIRST (AC1).** ⛔ No `apps/` / `packages/` file before 0.4 is committed.
  - [ ] 0.1 `git fetch origin`; `git merge-base --is-ancestor ce0737ce HEAD`; `git diff --name-only ce0737ce..origin/main -- packages apps`
        — re-read every F-fact whose file moved. Re-read across EVERY ref (local + remote) and worktree (`git branch -a`, `git worktree
        list`, `git for-each-ref`): the next decision id (`-508` at the pin), the next ledger letter (`2026-11-26g`), that ⛔ branch builds
        a member-side read of `member_identity_validations` (`git log --all --oneline --grep='3-13a\|3\.13a'`; `git grep -n
        'identity_check\.notice\|identity-check-notice' $(git for-each-ref --format='%(refname)' refs/heads refs/remotes)`). Re-check
        rows `3-14` / `3-16`: if either has started, read its story for a change to DL4's eligibility or a new reason, and reconcile N1
        BEFORE 0.2. Re-read the peer's `governance/panel-sitting-2026-11-26` agenda (has it been sent? does item 9 still name R1-W6?).
  - [ ] 0.2 Put DL1–DL12 to BigDev (the question dialog; recommended option first): DL1 (where), DL2 + DL3 (when / what), DL4–DL7 (the
        build — one question), DL8 (preselect vs unselected), DL9 (the staff hint, word for word), and whether PQ1's note joins the peer's
        sitting agenda (BigDev's to decide and to tell the peer session — ⛔ an edit to its branch). Record the answers verbatim here.
  - [ ] 0.3 Write the Panel note from the TEMPLATE (§0 first; plain question; the one deciding fact; options with an honest cost; the
        words table; the four info lines; evidence LAST, E4 commands run before commit):
        `_bmad-output/planning-artifacts/trustee-panel-routing-note-<date>-3-13a-member-told-identity-not-confirmed.md`. ⚠ The Hindi
        column is the session's draft: ask BigDev (in 0.2) who reads the Hindi before it goes out, and record the answer. Commit it ALONE.
  - [ ] 0.4 Author-commit decision entry (`<date>-<next>`, re-grepped on every ref just before writing): DL1–DL12 as answered, the §0
        split, `-502` item 4 quoted byte for byte, the AI-10-1 line (⛔ benefit gate), PQ1 open + built on A's words; committed ALONE.
        ⚠ If the write is refused, ask once ([[project_decision_log_writes_user_inserted]]).
  - [ ] 0.5 Roster Row 57: a dated line under (b) — *"row `3-13a` started; (b) is MET when it is built AND its words are approved (PQ1)
        AND the device pass (AC9) is recorded"* (⛔ edit to the leg's text — [[feedback_supersede_never_reinterpret]]).
        `deferred-work.md`: a dated line under PQ2 (*"row 3-13a in progress, words PQ1 open"*); a NEW item for row `3-14` — the
        `lock_in.rationale` cover promise (F9), trigger: 3-14's create-story; a dated line on `3.13-R1-W6` naming PQ1's sitting.
  - [ ] 0.6 Sprint row `3-13a-…` `ready-for-dev → in-progress` (map only; the ONE ledger entry is written at the end).
- [ ] **Task 1 — Domain (AC2).** `readMemberIdentityCheckNotice` in `packages/domain/src/member/identity-validation.ts` (DL4; the three
      eligibility reads as 3.13's `readEligibility` makes them, RETURNING ⛔ throwing; `identityValidationIneligibility`;
      `isDeathReportStanding`). ⛔ edit to any existing function there (N5). Unit + live-DB tests (AC2).
- [ ] **Task 2 — Contract + API + SDK (AC3).** `packages/contracts/src/members/identity-check-notice.ts` + barrel + a contract test (strict,
      fixture); `apps/api/src/modules/member-home/` route + handler (F4 shape; the 500 on a read failure — DL5); `memberIdentityCheckNotice()`
      in `packages/api-client/src/index.ts`; OpenAPI emit; `apps/api/tests/integration/member-home/identity-check-notice.spec.ts` (live DB).
- [ ] **Task 3 — Mobile (AC4, AC5, AC6).** Read `KnownPeopleRequestEntry.tsx`, `useKnownPeopleQueries.ts`, `known-people-cache.ts` and
      `PeerRequestEntry.tsx` FIRST. `apps/mobile/components/identity-check/IdentityCheckNoticeCard.tsx` +
      `useIdentityCheckNoticeQuery.ts` (exported cache options, DL6); mount in `app/(tabs)/index.tsx` above `<LockInClockWidget />` with a
      one-line `{/* Story 3.13a … */}` comment like its neighbours; the keys in `packages/i18n/locales/{en,hi}/common.json`; the `category`
      parameter in `app/(helpdesk)/new.tsx` (DL8); vitest. ⭐ Before mounting, `git grep -n "(tabs)/index\|LockInClockWidget\|ActiveContributionCard" apps/mobile/tests`
      — every existing test that pins the home screen's entries or their order (8.2's topmost card, 11b.10's lock-step entry) must
      stay green; if one enumerates the entries, add the card to it, ⛔ weaken it. ⚠ Traps: the tamagui mock must forward the props a test asserts (#71 (d)); a
      mocked `t` must return locale-distinct words; [[project_tanstack_instant_mock_hides_notready_flip]];
      [[project_query_gctime_blinds_removal_tests]] (the "refetch returns null ⇒ gone" leg must assert in the tick it happens);
      [[project_uset_fresh_closure_memo_trap]].
- [ ] **Task 4 — Admin hint (AC7).** `i18n-en.ts` `form.reasonToldToMember` + the header comment replaced by a dated line; render in
      `IdentityCheckDetailPage.tsx` under the reason choice; admin vitest.
- [ ] **Task 5 — Gates.** `pnpm i18n:check`; `pnpm microcopy:check`; `pnpm friction:check` (with the `friction-budget.md` row, F14);
      the api unit suite (the source fence lives there — [[project_source_fence_lives_in_api_unit_suite]]); `login-wall.spec.ts`; the
      live-DB suites on your OWN container (`twt_dev`; a domain red hides 8 packages — re-run the whole job,
      [[project_known_livedb_test_failures]]); mobile + admin vitest; typecheck + eslint. Then the PR's GitHub CI run (AC8;
      `scripts/land.sh --dry-run <pr>` before landing — [[feedback_land_prs_by_fast_forward]]).
- [ ] **Task 6 — Records (AC8).**
  - [ ] 6.1 Story file: Dev Agent Record, File List (a pasted `git diff --name-only`, ⛔ recalled — #60 (a)), Change Log.
  - [ ] 6.2 F13's comments (`member_identity_validations.ts` header: *"row `3-13a` tells …"* → *"row `3-13a` (built) tells …"*, dated).
  - [ ] 6.3 Sprint row → `review`; ONE ledger entry (safe prepend; verify the YAML parses and the row count holds).
  - [ ] 6.4 `deferred-work.md` PQ2: a dated line (built; Row 57 (b) waits on PQ1's ruling and AC9).

## Dev Notes

### Traps

1. **⛔ Reuse `readIdentityCheckDetail` member-side.** It returns the history and the live note's ciphertext (F1). A new, narrow select
   (DL4) — the withheld columns must never leave the database (N3).
2. **RLS is Pariwar-wide.** 0218 has ⛔ member-self policy (F2): forget `member_id = $2` and every member of the Pariwar sees the first
   live row the planner finds. AC2's two-members-one-Pariwar leg is the only test that catches it; CI's superuser hides RLS mistakes the
   other way (#56 (a)) — run the read inside `openScopeTx`.
3. **The default query is persisted for a week** (F7). Without `gcTime: 0` a "not confirmed" stays on the phone after staff confirm and
   after sign-out-sign-in. And TanStack keeps old data on a failed refetch (F6) — render on `!isError`, ⛔ on `data` alone.
4. **⛔ a `{reason}` interpolation** — one full sentence per reason (DL3). `t()` throws on a missing param (#27) and Hindi word order
   differs from English.
5. **⛔ promise what nothing builds** (#65 (c)): ⛔ "submit again", ⛔ "verify again in the app" (F10 (c)), ⛔ "we will call you" (PQ1 C is
   the Panel's to choose), ⛔ "you will be covered" (F9).
6. **The words are PROPOSED.** Build from the table; when PQ1 is ruled, change the `APPROVED` table and the two JSON files together
   (AC6) — ⛔ "approved" in any comment, commit or ledger line before the ruling ([[feedback_record_unattested_no_backfill]]).
7. **The staff hint is false until the card ships** — same PR (DL9).
8. **Hand-format; Prettier is not enforced** ([[project_prettier_not_enforced]]); `**cl.3**` in a JSDoc closes it
   ([[project_markdown_emphasis_closes_jsdoc]]). Unicode escapes in Hindi land raw — write the Devanagari directly and scan added lines
   with `python3 -I` ([[project_unicode_escapes_written_raw]]).
9. **The shell's `DATABASE_URL` is `:5432`** — scope every live run to your container ([[project_prepush_hook_inherits_5432]]); the
   hook runs from the MAIN checkout ([[project_hookspath_absolute_main_checkout]]).

### What this story does ⛔ do
It does not change who is verified, covered or eligible; send a text, notification or WhatsApp; tell a member who was never checked;
show the date, the recorder, the ID kind or the note; touch 3.13's writer, routes or table; reword the lock-in line; or decide whether
the staff note is downloadable.

### Project Structure Notes
- New: `packages/contracts/src/members/identity-check-notice.ts`, `apps/mobile/components/identity-check/`
  (`IdentityCheckNoticeCard.tsx`, `useIdentityCheckNoticeQuery.ts`), `apps/api/tests/integration/member-home/identity-check-notice.spec.ts`,
  tests beside each.
- Updated: `packages/domain/src/member/identity-validation.ts` (one new export), `packages/contracts/src/members/index.ts`,
  `apps/api/src/modules/member-home/{routes,handlers}.ts`, `packages/api-client/src/index.ts`, `openapi/v1.yaml` (emitted),
  `apps/mobile/app/(tabs)/index.tsx`, `apps/mobile/app/(helpdesk)/new.tsx`, `packages/i18n/locales/{en,hi}/common.json`,
  `apps/admin/src/modules/identity-checks/{i18n-en.ts,IdentityCheckDetailPage.tsx}`,
  `packages/domain/src/schema/member_identity_validations.ts` (comment), `friction-budget.md`.

### Testing
Unit (domain, contracts, api with `DATABASE_URL` UNSET), live-DB (domain + api, own container, `twt_dev`), mobile + admin vitest. Every
"nothing shown / nothing written" assertion has a passing control beside it. Device pass = go-live (AC9).

### References
- `.decision-log.md` — `2026-11-25-502` (item 4, Consequence 2, Policy meaning), `2026-11-25-503` (item 4), `2026-11-26-504` (item 5).
- Story 3.13 (`3-13-trustee-validation-of-manually-entered-identity.md`) — N6, DL4, DL5, DL7, DL9, DL12, DL16; F2 (the KYC routes are
  closed after signup).
- The routing note `trustee-panel-routing-note-2026-11-21-3-13-checking-a-typed-in-identity.md` (Q2 as put) and the told note
  `trustee-panel-told-2026-11-25-3-13-identity-check-as-built.md` (§3).
- Precedents: Story 3.7 (`member-home`, the lock-in widget), Story 6.36b (`KnownPeopleRequestEntry` — the stale-data trap, the cache
  options), Story 6.27a (`PeerRequestEntry` — the card), Story 10.2 (the member helpdesk), Story 6.39 / `panel-473-family-copy-resolves.test.ts`
  (an `APPROVED` words table pinned in a test).
- `sprint-status.yaml` — navigate by the `3-13a-…`, `3-13-…`, `3-14-…` row blocks (⛔ line numbers).
- Roster Row 57 (`docs/launch-gate-inventory/inventory-roster.md`, `identity-validation-live`, leg (b)).

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created (`bmad-create-story 3.13a`, 2026-11-26).

### File List

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-26 | Created by `bmad-create-story 3.13a` in its own worktree, branch `story/3-13a-member-told-when-identity-not-confirmed` off `origin/main` `ce0737ce` (upstream unset). §0 applied: telling + the reason + the app are RULED (`-502` item 4); the reason = the closed list is TOLD (§3); the member's words and what "how to arrange it" promises are PQ1 (one note at Task 0.3, ⛔ written yet); DL1–DL12 PROPOSED for Task 0.2. AI-10-1: ⛔ benefit gate. Row `backlog → ready-for-dev`; the `epics.md` Story 3.13a block added. ⛔ Decision id taken, ⛔ code, ⛔ pushed. |
