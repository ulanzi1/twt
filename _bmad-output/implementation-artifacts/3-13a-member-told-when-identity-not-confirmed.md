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
v1.2 (validate, 2026-11-26): `origin/main` moved `ce0737ce → f5c559d0` — records only (the 3.13 story, `sprint-status.yaml` ledger
`2026-11-26h`, the roster's Row 57 (c) MET line); `git diff --name-only ce0737ce..f5c559d0 -- packages apps` is EMPTY ⇒ the code pin
stands. Every code claim was re-traced at `ce0737ce` by three read-only verifiers (code / governance / premises).
⚠ Two separate facts ([[feedback_story_validate_footguns]] #24): "the pin is an ancestor of HEAD" is durable; "the code claims were
re-derived at `ce0737ce`" is perishable — Task 0.1 re-derives them.

GLYPH REGISTER (footguns #24 (f), #67 (a)): ⛔ = NOT / never / refused; ⭐ = the action or the load-bearing fact; ⚠ = a hazard.
A quotation that carries ⛔ is compared byte for byte with its source. ⛔ `file:NNN` pointer into `.decision-log.md`,
`deferred-work.md` or `sprint-status.yaml` (newest-first files — every prepend rots it, #19 / #25 (d)): cite the decision id + item,
the deferred item's id, the row KEY.

§0 GATE (the routing template's, applied FIRST — `_bmad-output/planning-artifacts/trustee-panel-routing-note-TEMPLATE.md`):
  · THAT the member is told, AND told the reason — RULED: `2026-11-25-502` item 4 (Q2 C, Trustee-ratified). ⛔ a question.
  · WHERE the member is told — RULED as put: B's own words, *"The app tells the member, in their language"* ⇒ in the app, in the app's
    language. Leaving out SMS / WhatsApp is a MATCH of the ruled words (B's row names ⛔ channel beyond the app; the Niyamavali's Part 7
    R10(B) makes the in-app surface the official place for the Trust's word to members). Leaving out a PHONE NOTIFICATION (push) is OUR narrow reading — push is ⛔
    built (F11) — ⛔ the Panel's words: the note says so as a NON-BLOCKING confirm (PQ1's confirm line), ⛔ a told line
    ([[feedback_told_line_must_not_carry_panel_choice]]; the `-295` §8 / `-296` "build as ruled + non-blocking confirm" shape).
  · WHAT "the reason staff recorded" is — the closed list, ⛔ the private note: OUR reading, TOLD to the Panel in
    `trustee-panel-told-2026-11-25-3-13-identity-check-as-built.md` §3 (SENT 2026-11-25), ⛔ objected to. It NARROWS what the member is
    told ⇒ put to the Panel as a NON-BLOCKING confirm (the note's Confirm 3), ⛔ a told line (v1.3).
  · THE MEMBER'S WORDS (Hindi + English) — the Panel's, by its own ruling: `-502` item 4 quotes B's cost *"New words for members, in
    Hindi and English, which you would approve"*, and the told note §3 promised *"The member's message, in Hindi and English, will come to
    you for approval as its own piece of work."* ⇒ PQ1 (one note, Task 0.3), built on the PROPOSED words until approved; it blocks
    GO-LIVE (roster Row 57 (b)), ⛔ the build or the merge.
  · WHAT "HOW TO ARRANGE IT" PROMISES — what the Trust tells a member it will do (a phone call from staff) and where to go (the in-app
    help request) — and what the card says for a reason that showing an ID cannot fix (a wrong detail typed at joining: ⛔ route corrects
    it, F10 (d)) — the Panel's: it is the substance of the words (PQ1 (a) / (b), ⛔ a separate note).
  · HOW it is built — the read, the route, the card, its place on the home screen, the cache, the staff hint's words — the AUTHOR's
    (DL1–DL12, BigDev at Task 0.2).
-->

# Story 3.13a: A Member Is Told When Staff Could Not Confirm Their Identity — and Why

Status: done

## Story

As a **member who typed in my own identity details when I joined, and whose identity the Trust's staff could not confirm**,
I want **the app to tell me — in my language — that my identity could not be confirmed yet, why, and how to arrange it**,
so that **I can put it right before it matters, instead of finding out only when my lock-in ends or my family files a claim.**

And as a **District Admin / Pariwar Admin recording "Could not confirm"**, I want **to see, on the form, that the app shows the
member the reason I pick**, so that **I choose it knowing the member may read it.**

## The rulings and records this story builds on

| Source | What it says (verbatim where it binds) | Status |
|---|---|---|
| `2026-11-25-502` item 4 (Q2 C) | *"As B, and the member is also told the reason staff recorded"* — B being *"The app tells the member, in their language, that their identity could not be checked yet and how to arrange it."* ⚠ Cost as put, accepted: *"A reason like "the photo does not match" is also told to an impostor, and tells them what to fix."* And B's: *"New words for members, in Hindi and English, which you would approve; a new piece of work to build them."* | **Trustee-ratified** (DR + KB) |
| `2026-11-25-502` Consequence 2 | *"A new row `3-13a` (BigDev's choice) builds Q2 C — the member's message in Hindi and English, with the reason, words approved by the Panel; it owes its own AI-10-1 note only if it changes a gate (it should not)."* | author (⛔ ratified) |
| `2026-11-25-502` Policy meaning | *"If staff cannot confirm you, the app tells you, and tells you why."* | the decision's own sentence |
| Routing note `trustee-panel-routing-note-2026-11-21-3-13-checking-a-typed-in-identity.md`, Q2 as put | *"staff record "could not confirm" with a reason (the details do not match the ID, the photo does not match, no ID was shown, or the member could not be reached); nothing about the member changes — should the app tell them?"* · C's "What changes for a person" cell: *"The member knows exactly what went wrong."* · Info line 6 (what the Panel was TOLD): correcting a member's details *"is a separate piece of work"* — ⛔ row builds it (F10 (d)). | the question AS PUT (unedited) |
| `2026-11-25-503` item 4 | *"Q2 C's message is row `3-13a`'s. 3.13 keeps `not_confirmed_reason` a plaintext closed enum so 3-13a can read it member-side; the Tier-1 note is ⛔ told (C's "the reason staff recorded" is the closed list the note put, ⛔ the note — OUR reading). The staff hint that the member is told the reason is added by 3-13a when its message ships."* | author-commit |
| Told note `trustee-panel-told-2026-11-25-3-13-identity-check-as-built.md` §3 (written `72fd4561`; SENT 2026-11-25, recorded at `dc3ba086` — whether the sent text equals `72fd4561` is ⛔ recorded) | *"Under Q2 C the member will be told the reason from that list. We read your words as not including the private note, which stays with staff. The member's message, in Hindi and English, will come to you for approval as its own piece of work."* | TOLD, ⛔ objected to |
| Told note §4 (same note) | *"The check, the number and the message go live only once all three are built and checked."* ⇒ the card's go-live waits on PQ1's ruling AND the device pass (AC9) — a promise already made to the Panel. | TOLD, ⛔ objected to |
| `2026-11-26-504` item 5 + `deferred-work.md` `3.13-R1-W6` | *"The open question — whether the note is part of what a person may download — goes to the Panel / counsel at the sitting that approves row `3-13a`'s message, or before the data export goes live, whichever is first"* (item 5). The item's Trigger: *"the Panel sitting that approves row 3-13a's member message (ask it there), or before the data export goes live, whichever is first"*. ⇒ a DEADLINE: R1-W6 is asked NO LATER than the sitting that approves PQ1 — at it, or before. PQ1's note is ⛔ sent while R1-W6 is still unasked (Task 0.3). | author-commit; ⏳ open |
| Roster Row 57 `identity-validation-live` leg **(b)** + its 2026-11-25 dated line | *"(b) — ruled C (the member is told, with the reason) ⇒ OPEN until row `3-13a` is built."* | go-live leg |
| Story 3.13 N6 / DL12 / DL16 | N6: the reason *"stays a plaintext closed enum (3-13a reads it member-side without a decrypt); ⛔ fold the reason into the note."* DL12: *"⛔ staff hint that the member is told the reason — row `3-13a` adds it when its message ships (it would be false before)."* | story (done) |
| Story 4.7 AC2a (the member status screen) | *"(a) member identity / Aadhaar / KYC details are not re-displayed"*; the status presenter sets `identitySuppressed: isMember` (`packages/ui/src/member-status/presenter.ts` `buildMemberStatusViewModel`). AC2a bars re-displaying identity DETAILS — a status message is ⛔ clearly barred ⇒ DL1's choice of the HOME screen is the author's preference (a member must navigate to find the status screen), ⛔ forced by 4.7. | story (done) |

## 📜 Policy meaning (AI-10-1)

⭐ **This story introduces ⛔ predicate that gates a member's access to a BENEFIT, and changes ⛔ existing one.** It adds a predicate
that decides whether a MESSAGE is shown (DL2) — it moves ⛔ state, ⛔ flag, ⛔ coverage, ⛔ eligibility; `trustee_verified`, the reducer,
6.39's identity half and the 3.13 eligibility rule are read, ⛔ written or changed.
**In the member's terms (the message's own meaning, for the record):** *"If the Trust's staff tried to check your identity and could not,
the app tells you so, tells you why, and tells you how to arrange the check. Once staff confirm you, the message goes away."*
**Checked against the Niyamavali (2026-11-26, section numbers only — the rulebook copy is git-ignored):** two clauses are engaged, ⛔
conflict with either. §2.1 (b) requires the verification itself (3.13 built it). Part 7 R10(B) makes the in-app surface the official place
for the Trust's word to members for official communications — consistent with DL1 (an in-app card). ⛔ clause speaks to telling a member about a step of their
own verification. (Part 10 lists a correction right — relevant to PQ1 (b)'s wrong-detail case; counsel's, ⛔ a blocker.)
⚠ **What this note does ⛔ cover:** the lock-in-end consequence for a member staff never confirm (they stop being covered) is row
`3-14`'s and belongs in ITS note — and the home screen's existing lock-in lines already promise cover (F9: `lock_in.rationale` and
`lock_in.unlock_date_label`), which `3-14` must reword.

## ⭐ THE INVARIANTS

- **N1 — ONE definition of "awaiting a check".** The message shows ONLY for a member 3.13 itself would still check: the read calls 3.13's
  `identityValidationIneligibility(...)` (`packages/domain/src/member/identity-validation.ts`) and 3.13's standing-death-report
  predicate `isDeathReportStanding` (`packages/domain/src/claim/death-report.ts`) — ⛔ a second copy of either rule. If 3.13's
  eligibility changes (3.16's new strength, 3-14's states), the message follows it for free.
- **N2 — The LIVE row only.** `superseded_at IS NULL` (the partial-unique index `member_identity_validations_one_live_per_member_uq`).
  ⛔ "latest" by `decided_at`: the index is the authority, ⛔ a clock. (3.13's writer stamps both `superseded_at` and `decided_at` with
  `clock_timestamp()`, so two acts in one transaction do ⛔ tie through the writer — but a hand-seeded or future row can; AC2's N2 leg
  seeds a SUPERSEDED row with a LATER `decided_at` than the live one, which kills a "latest by `decided_at`" read.)
- **N3 — The reason and NOTHING else of the record reaches the member — on this card.** The member's wire carries the closed reason
  code only: ⛔ the note (Tier-1 — ⛔ even selected), ⛔ `decided_by_actor_id` / `decided_by_display`, ⛔ `evidence_kind` /
  `document_kind`, ⛔ the attempt count, ⛔ `validation_id`, ⛔ the date (DL3). ONE uniform rule for the surface
  ([[feedback_withholding_must_be_uniform]]): every withheld field is absent from the SQL select, the domain type, the contract AND the
  screen — ⛔ "fetched then hidden". The same holds for the eligibility read: the KYC standing is read as TWO plaintext columns
  (`verification_strength`, `trusteeVerified`), ⛔ through `getMemberKycProfile` (its `select()` loads the KYC name / date of birth / photo
  ciphertext — DL4). ⚠ The member's DATA EXPORT (Story 3.13 DL14 as amended by `-504` item 5) already carries the date, outcome, evidence
  kind, document kind and reason of each check — N3 is about this card, ⛔ a claim about everything the member can see (the Panel note
  says so, info line 2).
- **N4 — ⛔ write on read.** The member's read writes ⛔ row, ⛔ event, ⛔ audit line, ⛔ "seen" marker; it takes ⛔ advisory lock (3.13
  DL5: ⛔ lock on a read).
- **N5 — ⛔ change to 3.13's writer, its routes, its tables or its reducer arms.** The only 3.13 files touched are the admin i18n file +
  the detail page (the staff hint, DL9) and the domain module (one new exported read, DL4) — ⛔ an edit to an existing function.
- **N6 — The message never outlives its truth on the phone.** A cached "not confirmed" must not show after staff confirm, after a death
  claim, or when the read fails (DL6). ⛔ persisted to the phone's storage. ⚠ The home tab mounts ONCE per app process and the app's query
  client ⛔ refetches on focus or reconnect (F7) — so the card re-reads on its own when the home tab gains focus AND when the app returns
  to the foreground (DL6; the 5.14 `useAnnouncementChannelsQuery` precedent), else a confirmed member keeps the card until a restart.

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
- **F3 — The eligibility rule (N1).** `identityValidationIneligibility(facts: { state: MemberLifecycleState; moderationStatus:
  ModerationStatus; kyc: Pick<MemberKycProfileRow, 'verificationStrength' | 'trusteeVerified'> | null })` returns one of five codes, or
  `null` when awaiting: a KYC row, a staff-checkable strength (`isKycStrengthStaffCheckable` — `self_declared` today), ⛔ already verified
  (`isKycIdentityVerified`), state ∈ `IDENTITY_VALIDATION_ELIGIBLE_STATES` (`lock-in`, `pending-valid`), moderation ≠ `terminated`
  (⚠ `suspended` IS eligible — and a suspended member keeps sign-in, `termination-block-seam.ts`). 3.13's private `readEligibility`
  runs `memberExists` (THROWS `not_found`), then the three reads, then THROWS `not_eligible`. The three reads themselves ⛔ throw on
  missing data: `getCurrentMemberState(db, memberId)` (⛔ `pariwarId` argument; an empty stream ⇒ `'pending-kyc'`),
  `getCurrentMemberModerationOverlay(db, memberId)` (⛔ `pariwarId`), `getMemberKycProfile(db, pariwarId, memberId)` (`… | null`, but
  a `select()` of every column incl. the identity ciphertext — N3 ⇒ use the two-column read `readDeceasedKycStanding(db, pariwarId,
  memberId)` in `packages/domain/src/claim/membership-check-approval.ts` (despite its name it takes any member id; its
  `verificationStrength` is `string` — narrow it to the enum before passing it on). The death predicate is separate:
  `isDeathReportStanding(db: Db, pariwarId, memberId): Promise<boolean>` — CALL it, ⛔ copy its SQL
  (`apps/api/tests/unit/erasure-and-death-report-fence.test.ts` pins that SQL to `claim/death-report.ts`).
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
  `null` unless there is something to say; the WHOLE card is an `unstyled` `Button` whose `accessibilityLabel` = title + body (the
  label replaces the children for TalkBack — DL10). ⚠ `KnownPeopleRequestEntry`'s header records a trap this story has too: *"TanStack
  keeps the previous pages when a refetch fails, so reading the open requests alone kept showing a member who had left `active` their
  old one"*. ⚠ But its FIX is the opposite of DL6's: `lib/known-people.ts` `requestEntryVisible` hides the card ONLY on the server's
  denial — *"a network blip … says nothing about the member (it flickered the card off …)"* — and `PeerRequestEntry` renders on `data`
  alone. ⛔ Neither re-reads on focus. DL6's rule is this story's own choice, ⛔ a copy of either.
- **F7 — The cache.** `apps/mobile/lib/query-client.ts`: default `staleTime` 1 h, `gcTime` 7 d, `retry: 1`,
  `refetchOnWindowFocus: false`, `refetchOnReconnect: false` (and the app wires ⛔ `focusManager` / `onlineManager`); the client is
  PERSISTED to MMKV (`components/Provider.tsx` `PersistQueryClientProvider` — its comment: *"`gcTime: 0` IS READ HERE AS AN EXPLICIT
  "⛔ NEVER PERSIST THIS" MARKER"*), and the dehydrate filter (`components/peer-request/peer-request-cache.ts`) is
  `query.state.status === 'success' && query.options.gcTime !== 0` (it also skips any query ⛔ loaded). Precedent options:
  `KNOWN_PEOPLE_CACHE_OPTIONS = { gcTime: 0, staleTime: 0 }` (`components/known-people/known-people-cache.ts`), keys namespaced by
  `(pariwarId, memberId)`. ⇒ a default query here would keep "not confirmed" on the phone for a week and show it after a confirmation.
  ⭐ The re-read precedent is `components/announcement-channels/useAnnouncementChannelsQuery.ts` (Story 5.14, `-419` item 5): keyed
  `(pariwarId, memberId)`, `{ gcTime: 0, staleTime: 0 }`, `withTimeout(…, CALL_TIMEOUT_MS)` (`lib/with-timeout.ts` — the transport has
  ⛔ timeout of its own), re-read on `useFocusEffect` AND on `AppState` `'active'` with `refetch({ cancelRefetch: false })` guarded by
  `enabled`, and `clearAnnouncementChannelsCache(client)` called from the four account-change paths in `lib/session-context.tsx`
  (`signIn`, `signOut`, the terminated refresh, the rejected refresh).
- **F7a — TanStack 5.101.0, RUN (validate, 2026-11-26).** A real `QueryObserver` (`retry: false`): one success, then a failed `refetch()`
  ⇒ `status: 'error'`, `isError: true`, `isSuccess: false`, `data` KEPT. While a refetch is IN FLIGHT with data, `status` stays
  `'success'`. ⇒ `status === 'success'` and `!isError` are the same test; the stale-data hazard is a guard that reads `data` alone, and a
  HUNG refetch (⛔ timeout) keeps a stale card up for ever.
- **F8 — i18n.** `packages/i18n/locales/{en,hi}/<namespace>.json`, flat dotted keys; `useT()` from `@twt/i18n/react`; `t()` THROWS on a
  missing key or a missing `{param}` (#27). `lock_in.*` lives in `common`. Gates: hi/en parity `packages/i18n/scripts/check-parity.ts`
  (`pnpm i18n:check`); microcopy `microcopy.yaml` — `scope.copy_globs` INCLUDES `packages/i18n/locales/{hi,en}/common.json` (read in the
  file, ⛔ its header — #22 (a)) and `scope.code_globs` covers `apps/admin/src/**` (the whole words `receipt` / `report` / `invoice` fail
  in copy, test ids AND comments — [[project_microcopy_gate_scans_admin_code]]). Existing member identity words: signup-only `kyc.*`
  (`kyc.title` "Verify your identity" / "अपनी पहचान सत्यापित करें"), and ⚠ one signup line that already PROMISES the check —
  `kyc.fallback_empathy` *"… you can enter your details manually and we'll verify them."* (this card is the first place the member
  learns that promise was ⛔ kept yet; ⛔ edit to it here). ⛔ member line anywhere says "pending-valid", "unverified" or "could not be
  confirmed"; ⛔ `identity_check.*` key exists (the nearby `identity_validation.*` error codes and `admin_identity_check.*` audit types
  do ⛔ clash). The helpdesk's form title is `helpdesk.json` `new.title` "Ask for help" / "मदद माँगें". `scripts/microcopy/common.test.ts`
  runs `checkTone` over every `common` string (it will scan the new keys); ⛔ test pins `common.json`'s key set (parity checks only
  that each en key has a non-empty hi twin). ⚠ `apps/mobile/tests/unit/language-source-pins.test.ts` runs a `[t]`-dependency check over
  `app/(tabs)/index.tsx` — ⛔ add a hook with `[t]` in its deps there ([[project_uset_fresh_closure_memo_trap]]).
- **F9 — ⚠ The lock-in lines promise cover.** `common.json` `lock_in.rationale`: *"… You'll be eligible for claim cover once the lock-in
  ends."*, and `lock_in.unlock_date_label` *"Cover begins on"* / *"कवरेज प्रारंभ होने की तिथि"*. For a member staff never confirm, both are
  FALSE once row `3-14` lands (they go to `pending-valid`, ⛔ in `VALID_STATES`). ⛔ This story's to reword (member words are
  Panel-approved; the consequence is 3-14's) ⇒ a `deferred-work.md` item routed to `3-14` naming BOTH keys (Task 0.5). ⚠ DL1 puts the
  card directly above the widget that shows them, which makes the contradiction more visible — stated as DL1's cost.
- **F10 — "How to arrange it" — what is REAL today (#65 (c): ⛔ promise a mechanism nothing builds).**
  (a) **Staff can phone the member**: 3.13 DL6a's `member.reveal_mobile_for_identity_check` (District Admin, Pariwar Admin, verifier,
  helpline operator; Super Admin derived), only while the member is awaiting a check — built and landed. ⛔ a guarantee that anyone
  WILL phone.
  (b) **The member can ask in the app**: the member helpdesk (Story 10.2, `done`) — `apps/mobile/app/(helpdesk)/new.tsx`, category
  `kyc-trouble` ("KYC or verification help" / "KYC या सत्यापन में मदद"), routed by `packages/domain/src/helpdesk/registry.ts` to
  `target_role: 'helpline_operator'` at `pariwar` dimension — the SAME role 3.13 lets see the number and the queue. ⚠ The operator can
  reach the member and see the queue, ⛔ record the check (only a District / Pariwar Admin can) — the hand-off is between staff.
  `new.tsx` reads its category from a per-member draft persisted in MMKV (`lib/helpdesk-draft.ts`, key `helpdesk-draft:<memberId>`;
  `useState(draft.category)` at mount); the category list loads AFTERWARDS from the server (`useHelpdeskCategoriesQuery(pariwarId)`); ⛔
  `useLocalSearchParams` — ⛔ route parameter preselects one today (DL8). `kyc-trouble` is offered to every member (⛔ member-state gate);
  a per-Pariwar override may drop it. 10.2's tests for `new.tsx` are SOURCE SCANS only (`apps/mobile/tests/unit/helpdesk-screens-render.test.ts`
  reads the file — ⛔ render, ⛔ mocks) and pin `/canSubmit\s*=\s*!!category/` and a `setCategory(c.category)` block that must contain
  `setStaffMediation(false)`.
  (c) **The member CANNOT re-run DigiLocker or re-type their details** (both KYC routes refuse unless `pending-kyc` — Story 3.13 F2) ⇒
  the words must ⛔ say "submit again" / "verify again in the app".
  (d) **⛔ ROUTE CORRECTS A WRONG DETAIL — for anyone.** Staff cannot change the typed-in name / date of birth / photo either (Story 3.13:
  *"correction of a typed-in name is ⛔ this story"*; 3.13 DL16 leaves *"a staff change to name / date of birth / photo"* out), and the
  21 November note TOLD the Panel it *"is a separate piece of work"* (info line 6). ⛔ row exists for it. ⇒ for `details_do_not_match`
  caused by a typing mistake (and a `photo_does_not_match` caused by the record), showing an ID again CANNOT finish the check — the
  member can only be confirmed by showing an ID that matches what they typed. Showing an ID still helps when the WRONG ID was shown.
  This is PQ1 (b)'s deciding fact, and an unhomed gap recorded in `deferred-work.md` (Task 0.5 — observed and escalated, ⛔ planned here).
  ⚠ For `member_not_reached` the card says *"we could not reach you"* — a following *"Staff may phone you"* reads as a contradiction.
- **F11 — Push / SMS / WhatsApp.** Push is ⛔ wired on the phone (`apps/mobile/lib/push-notifications.ts` is a prototype imported
  nowhere; the api-client has ⛔ device-token method; FR-71 freezes push at seven categories). An SMS is a DLT family per template
  (`apps/jobs/src/scheduler/*-sms-templates.ts`; roster rows 30 / 32) — ⛔ asked for by the ruling (DL1).
- **F12 — Numbers (re-read at Task 0.1 across EVERY ref and worktree).** Highest decision `2026-11-26-507` on every ref (local +
  remote, re-checked at v1.2) ⇒ next `-508`. Highest migration `0218` ⇒ this story needs ⛔ migration. Ledger (v1.2): `2026-11-26a`–`h`
  used — `g` by THIS story's own creation commit, `h` by `main`'s `f5c559d0` ⇒ next `2026-11-26i` (v1.2's own records line takes `i`
  ⇒ the next after it is `j`; re-grep every ref before writing). Roster: highest Row 57 — this story adds ⛔ row (it is Row 57 (b)'s
  build). ⚠ The peer branch `governance/panel-sitting-2026-11-26` (tip `92f9d95e` at v1.2 — it moves; unpushed, peer session twt-7f) holds a Panel agenda
  PREPARED, ⛔ sent, whose Part C lists *"The member's message when their identity is not confirmed: the Hindi and English words, once that
  work is built."* and whose item 9 is the `3.13-R1-W6` note (`4a48c24d`). ⭐ `-504` item 5 and R1-W6's Trigger set a DEADLINE for R1-W6: no
  later than the sitting that approves this row's message (or the data export's go-live, whichever is first) ⇒ PQ1's note goes ⛔ to the
  Panel while R1-W6 is still unasked; asking R1-W6 EARLIER (e.g. at item 9 of that agenda, before this row is built) satisfies it.
  WHICH sitting is BigDev's call (and telling the peer session is BigDev's). ⛔ edit the peer's branch.
- **F13 — Code that routes work here (#9 — grep `3-13a` in `apps/`, `packages/`, `scripts/` at Task 0.1):**
  `apps/admin/src/modules/identity-checks/i18n-en.ts` header *"⛔ A staff hint that the member is TOLD the reason — row `3-13a` adds it
  when its message ships (it would be false before)."*; `packages/domain/src/schema/member_identity_validations.ts` (two comments);
  `packages/domain/tests/integration/member/identity-validation-rtbf.spec.ts` (*"the reason (row 3-13a reads it)"*),
  `packages/domain/tests/member/rtbf-anonymize.test.ts` (*"the reason (row 3-13a's)"*) — they keep the reason through erasure; ⛔ change
  needed. Exactly these five hits at the pin.
- **F14 — The friction-budget declaration gate** (`scripts/friction-budget/lib.ts`): a PR touching `apps/mobile/**` (or `apps/public/**`)
  FAILS unless `friction-budget.md` carries a NEW or AMENDED row (compared with the base on the normalized `payer|protects|event_type`
  key; `EVENT_TYPES = ['forced', 'optional']`) or a new `**Story <id> disposition (...)**` block. ⚠ Merely touching the file FAILS, and the
  file's own §"How to declare" still says *"or affirm an existing one"* — the code ⛔ accepts that.
- **F15 — OpenAPI.** Paths are registered BY HAND in `packages/contracts/scripts/emit-openapi.ts` (`registerPath`), ⛔ derived from the
  Fastify routes; ⛔ member-home read is in `openapi/v1.yaml` (`lock-in-status`: 0 hits; nor active-contribution, known-people,
  peer-requests, nor 3.13's admin identity-check routes). A re-emit without a new `registerPath` leaves `v1.yaml` byte-identical (DL5).
- **F16 — The member session guard.** `requireMemberSession` (`apps/api/src/modules/auth/shared/member-session-guard.ts`) reads a BEARER
  JWT (`sub` = the member id, `pariwar_id` = the membership's Pariwar) — ⛔ a cookie. No / bad / expired token, a non-access `typ`, and an
  ADMIN's cookie session (it carries ⛔ bearer token) all answer 401 `auth.session_required`. One mobile number can hold one membership
  per Pariwar; a session is ONE membership (`member-auth.repo.ts`, the `pariwar_select` branch) ⇒ the session-scoped read is right.
  Responses are PARSED by the Zod serializer (`plugins/zod-openapi`) and the api-client `schema.parse`s every response.
- **F17 — Mobile tests.** `apps/mobile/vitest.config.ts` `include: ['tests/unit/**/*.test.ts']` — `.ts` only, ⛔ beside components. A
  test placed beside the component NEVER RUNS. Home-screen pins that the insert must keep green (none enumerates the whole order):
  `announcement-channels-source-pins.test.ts` (`/<HomePromptCards \/>\s*<AnnouncementChannelsCard \/>/` — and a second pin that every
  `clearKnownPeopleCache(queryClient)` in `session-context.tsx` is IMMEDIATELY followed by `clearAnnouncementChannelsCache(queryClient)`
  ⇒ the new clear goes AFTER the announcement clear, ⛔ between the two), `peer-request.test.ts`,
  `sahyog-vivran-entry.test.ts`, `memorial-source-pins.test.ts`, `language-source-pins.test.ts`.

## Build decisions — PROPOSED (BigDev answers at Task 0.2)

> ⭐ **2026-11-26 — ANSWERED (Task 0.2), BigDev verbatim: *"Build questions as recommended"*.** Each DL is taken as written below, on
> its recommended side: DL1 the home card (app only); DL2 / DL3 as written; DL4 as written; DL5 ⛔ OpenAPI entry (`openapi/v1.yaml`
> byte-identical — ⛔ option (b)); DL6 the render rule `q.isSuccess && q.data.notice !== null` (a failed re-read hides the card — ⛔
> option (b)); DL7 the app's language; DL8 PRESELECT `kyc-trouble` (⛔ option (b)); DL9 option **(b)** — *"The app shows the member
> this reason."* (the one the text recommends); DL10 the WHOLE card is ONE button (⛔ option (b)); DL11 / DL12 as written. `3.13-R1-W6`:
> asked as Q3 of this story's note (answered earlier). The section's "PROPOSED" now reads ANSWERED; the text below is kept as written.

- **DL1 — Where: the app only, a card on the HOME screen.** A new self-suppressing card `IdentityCheckNoticeCard`
  (`apps/mobile/components/identity-check/`), mounted in `app/(tabs)/index.tsx` between `<AnnouncementChannelsCard />` and
  `<LockInClockWidget />` — directly ABOVE the lock-in widget (F6) and therefore BELOW `ActiveContributionCard` (8.2's topmost AC); the
  `PeerRequestEntry` / `KnownPeopleRequestEntry` shape. ⛔ SMS, ⛔ WhatsApp, ⛔ banner row, ⛔ notice-strip item: the ruling says *"The app
  tells the member"* (a MATCH; R10(B)). ⛔ push — push is ⛔ wired (F11); that half is OUR narrow reading, put to the Panel as a
  non-blocking confirm (PQ1). *Considered and not taken:* the membership status screen (a member must navigate to find it; 4.7 AC2a bars
  re-displaying identity DETAILS there; whether it also bars a status message is unclear, so 4.7 is ⛔ the reason); `HomePromptCards` (one card at a time and
  dismissible — another prompt could hide it); a new screen (the whole message fits on the card).
  ⚠ COSTS: a member who never opens the app is ⛔ told (stated in the Panel note); the card sits below EIGHT entries (`ActiveContributionCard`,
  `ViewContributorsEntry`, `SahyogVivranEntry`, `PeerRequestEntry`, `KnownPeopleRequestEntry`, `NomineeLinkRequestEntry`,
  `HomePromptCards`, `AnnouncementChannelsCard` — most self-suppress when they have nothing to say); and it sits directly above the lock-in widget whose lines promise cover (F9) — the
  contradiction is more visible there until row `3-14` rewords them.
- **DL2 — When it shows (N1, N2).** ALL of: the member's LIVE row exists and is `not_confirmed`; `identityValidationIneligibility(...)`
  is `null` right now; `isDeathReportStanding` is false. Otherwise ⛔ card. So: ⛔ checked yet ⇒ nothing (the ruling covers a member staff
  could ⛔ confirm — telling every unchecked member is ⛔ asked); a later `confirmed` ⇒ gone; a later `not_confirmed` with another reason
  ⇒ the NEW reason; a claim filed for the death ⇒ gone (the identity is checked on the claim then — 3.13 DL5) — and BACK once a
  `member_found_innocent` finding ends the report (a death claim withdrawn or refused with ⛔ such finding keeps it standing ⇒ gone, as
  3.13); `withdrawn` / `anonymized` / `terminated` / a non-checkable strength ⇒ gone; a late DigiLocker callback making the member
  `aadhaar_kyc` (the callback has ⛔ member-state guard — a narrow pre-existing window) ⇒ gone. A `suspended` member IS told (3.13
  checks them, and the 21 November note told the Panel so — info line 5). `pending-valid` has ⛔ producer until row `3-14`.
- **DL3 — What it says (N3).** Four parts: a title (*could not confirm yet*), ONE reason line for the live reason (four keys — one full
  sentence per reason, ⛔ a `{reason}` interpolation, so no `t()` param can be missing, #27), ONE how-to-arrange line chosen BY THE
  REASON (PQ1 (b): under our suggestion three keys — `how` for `photo_does_not_match` / `no_document_shown`, `how_not_reached`,
  `how_details`; under PQ1 (b) (i) `how` for all four — the reason → how-key map is ONE exported constant `IDENTITY_CHECK_HOW_KEY_BY_REASON`, so a ruling
  changes it and the words table — the two tables that move with PQ1), and one action (DL8). ⛔ the date, ⛔ who checked, ⛔ how / which ID they saw, ⛔ the note, ⛔ how many attempts. *Considered:*
  the date (*"on 12 November"*) — ⛔ in the ruled words; left out (narrow). The words are in PQ1's table, PROPOSED until approved.
- **DL4 — The domain read.** NEW `readMemberIdentityCheckNotice(db, pariwarId, memberId): Promise<{ reason:
  IdentityValidationNotConfirmedReason } | null>` in `packages/domain/src/member/identity-validation.ts` (exported through the existing
  `member/index.ts` barrel). Order: the live row (`select outcome, not_confirmed_reason … where pariwar_id = $1 and member_id = $2 and
  superseded_at is null` — ⛔ `note_ciphertext`, ⛔ `decided_by_*`, ⛔ `evidence_kind` / `document_kind`, ⛔ `validation_id` in the select
  list) → ⛔ row or `confirmed` ⇒ `null` → the eligibility facts (F3: `getCurrentMemberState(db, memberId)`,
  `getCurrentMemberModerationOverlay(db, memberId)`, the two-column KYC standing `readDeceasedKycStanding(db, pariwarId, memberId)` —
  ⛔ `getMemberKycProfile`) + `identityValidationIneligibility` → `isDeathReportStanding` → `{ reason }`. The three reads ⛔ throw on
  missing data, so they are called directly (⛔ "returning variant" of `readEligibility` is needed; ⛔ `memberExists` — a session's member
  exists). A `not_confirmed` live row with a NULL reason is impossible (0218's coherence CHECK) — if it occurs, THROW (fail loud, ⛔
  guess). ⛔ lock, ⛔ write (N4). Transport-free. ⚠ If importing `claim/membership-check-approval.ts` from `member/identity-validation.ts`
  makes an import cycle (`git grep` its imports; [[project_type_only_import_cycle_trap]]), write a local read of the SAME two columns
  with the explicit `pariwar_id` predicate instead — ⛔ widen it.
- **DL5 — The route and the contract.** NEW `GET /api/v1/member/identity-check-notice` in `apps/api/src/modules/member-home/`
  (`routes.ts` + `handlers.ts` — the F4 shape: `requireMemberSession`, `openScopeTx` for the session's Pariwar, the member id from the
  SESSION ⛔ a parameter). Response `MemberIdentityCheckNoticeResponse = z.object({ notice: z.object({ reason:
  IdentityCheckNotConfirmedReason }).strict().nullable() }).strict()` in a NEW `packages/contracts/src/members/identity-check-notice.ts`
  (+ barrel), reusing F5's enum. A NEW endpoint, ⛔ a field on `lock-in-status` (a new key on an existing `.strict()` member response
  breaks every installed app that parses it — #29 (a)). A read failure ⇒ 500 (⛔ fail-soft to `notice: null` — a silent `null` would
  hide a real message; the CARD hides on error, DL6). SDK `memberIdentityCheckNotice()` in `createMemberAuthClient` (it `schema.parse`s
  the body — F16). ⛔ OpenAPI entry (PROPOSED): ⛔ member-home read is registered in `emit-openapi.ts` (F15), so this matches
  `lock-in-status`; `openapi/v1.yaml` stays byte-identical. *Option (b):* a `registerPath` + `pnpm contracts:emit-openapi` — the first
  member-home entry, a new precedent.
- **DL6 — The cache, the re-read and the stale-message trap (N6, F6, F7, F7a).** `useIdentityCheckNoticeQuery` mirrors
  `useAnnouncementChannelsQuery` (F7 — read it FIRST; ⛔ invent a second mechanism, ⛔ a global `focusManager` bridge):
  - exported `IDENTITY_CHECK_NOTICE_CACHE_OPTIONS = { gcTime: 0, staleTime: 0 }` (⛔ persisted — the reason is personal data and must not
    sit on the phone; the F7 marker); exported key `identityCheckNoticeKey(pariwarId, memberId)` = `['identity-check-notice', 'v1',
    pariwarId, memberId]`; `enabled` only once the session has loaded;
  - the read bounded by `withTimeout(…, CALL_TIMEOUT_MS)` (a hung re-read becomes an error ⇒ the card hides — F7a);
  - re-read on `useFocusEffect` AND on `AppState` `'active'`, `refetch({ cancelRefetch: false })`, ⛔ refetch while disabled;
  - `clearIdentityCheckNoticeCache(client)` (`removeQueries({ queryKey: ['identity-check-notice'] })`) called in the four account-change
    paths of `lib/session-context.tsx`, each placed AFTER `clearAnnouncementChannelsCache(queryClient)` (F17's adjacency pin). With
    `gcTime: 0` and the namespaced key this is belt-and-braces, kept for parity with every other `gcTime: 0` read.
  - ⭐ RENDER RULE (PROPOSED): the card renders ONLY when `q.isSuccess && q.data.notice !== null` — ⇒ a FAILED re-read hides it (TanStack
    keeps the old data and sets `status: 'error'`, F7a). ⚠ This is the OPPOSITE of the known-people rule (*"Only the DENIAL hides it"*,
    F6): its COST is a card that flickers off on a network blip and back on the next good read. Chosen because here a stale card is the
    worse error (it would keep telling a confirmed member they are unconfirmed). *Option (b):* the known-people rule — keep the last good
    answer on an error (cost: after staff confirm, a member offline at the time keeps the card until the next good read).
- **DL7 — Language.** The app's language (`useLocale()` — Hindi until the member picks, Story 6.35). *"In their language"* = the
  language the app shows them (a MATCH). Keys in `common` (`identity_check.notice.*`, beside `lock_in.*`), hi AND en, parity-checked.
- **DL8 — The action: "Ask for help".** Pressing the card opens the help form `/(helpdesk)/new` with the `kyc-trouble` category
  PRE-SELECTED. `new.tsx` reads an optional `category` route parameter (`useLocalSearchParams`) and applies it ONCE, when the categories
  query (`useHelpdeskCategoriesQuery`) FIRST succeeds, and ONLY if (i) the value names a category in that in-force list and (ii) the
  member has ⛔ category yet (neither from the draft nor picked on this visit) — ⛔ in the `useState` initializer (the list is ⛔ loaded
  then, F10 (b)). While the list is loading or has failed, nothing is preselected (the form behaves as today). The preselect does
  EXACTLY what a tap on that category does — the tap's inline `onPress` runs `setCategory`, `setSubCategory(undefined)`,
  `setStaffMediation(false)` and `persist({ category, subCategory: undefined, staffMediation: false })`, so the preselected category IS
  saved to the member's draft. ⛔ refactor the tap's inline handler into a shared function: the Story 10.29 source pin
  `/setCategory\(c\.category\)[\s\S]*?\}\}/` (`helpdesk-screens-render.test.ts`, describe "Story 10.29 (D2)") reads it and matches the
  FIRST occurrence in the file (AC5 keeps those tests unedited) — the preselect effect repeats the same four steps for its own value
  under a DIFFERENT identifier (e.g. `setCategory(preselect)`, ⛔ `c`), else the pin could match the effect and stop checking the tap; a
  NEW pin asserts `setCategory(c.category)` occurs exactly ONCE. ⚠ An old draft with a subject but ⛔ category is paired with `kyc-trouble` — accepted (the member sees it and
  can change it). Every other parameter value is ignored. The label reuses
  the helpdesk's own title meaning (*"Ask for help"* / *"मदद माँगें"*, F8) under a NEW key in `common` (⛔ cross-namespace read).
  *Option (b), considered:* open the form unselected (⛔ edit to 10.2's screen; the member must find "KYC or verification help"
  themselves). Recommended: preselect.
- **DL9 — The staff hint (English; BigDev approves — staff words are the author's, 3.13 DL12).** On the "Could not confirm" form, under
  the reason choice, one line: *"The member will see this reason in the app."* (recommended — true only while they are still awaiting a
  check and open the app, — ⚠ "will see" predicts the member looks, so it is no truer than "is told" for a member who never opens the
  app; *option (b)* *"The app shows the member this reason."* (claims only what the app does); *option (c)* the v1.1 wording *"The
  member is told this reason in the app."* — recommended: (b)) — key `form.reasonToldToMember` in
  `apps/admin/src/modules/identity-checks/i18n-en.ts`, rendered in `IdentityCheckDetailPage.tsx`; the header comment F13 quotes is
  REPLACED by a dated line saying it shipped. ⚠ It becomes true only when this story's card ships — same PR, ⛔ earlier.
- **DL10 — Accessibility (PROPOSED).** The card is static content: ⛔ live region, ⛔ announcement (nothing changes while it is on
  screen). The WHOLE card is ONE `unstyled` `Button` (the `PeerRequestEntry` / `KnownPeopleRequestEntry` shape, F6) whose
  `accessibilityLabel` = title + reason + how + the action words (*"Ask for help"*) and `accessibilityRole="button"` — the label REPLACES
  the children for TalkBack, so the text is read ONCE (the S30 lesson: a label of the title alone dropped the body). The text is the
  card's own `Text` children, ⛔ a Tamagui button text prop, so it wraps ([[project_tamagui_button_text_one_line]]; check on device,
  AC9). *Option (b):* static text plus a separate small button labelled only *"Ask for help"* (cost: two focus stops; the button's label
  alone ⛔ says what help is for). ⛔ both a full label AND readable text outside it — TalkBack would read the content twice.
- **DL11 — Erasure and export: ⛔ change.** The export already carries the reason (F1); an anonymized member is ⛔ awaiting a check (DL2 ⇒
  ⛔ card) and cannot sign in.
- **DL12 — Not in scope:** an SMS / push / WhatsApp message (DL1); telling a member who was never checked; the lock-in line's promise of
  cover (F9 — row `3-14`); the staff note in the export (`3.13-R1-W6` — asked no later than PQ1's sitting, by the peer's note, F12); a
  "seen" record; any change to 3.13's writer, routes or record; a route to correct a wrong detail (F10 (d) — unhomed, recorded at Task
  0.5); the upload route (row `3-16` — its `not_confirmed` acts reach this card through N1 ONLY if they use one of today's four reasons.
  ⚠ A NEW reason code does ⛔ reach it: the contract's `z.enum` and the api-client's `schema.parse` make an installed app throw a ZodError
  and the card hide, and there is ⛔ words key for it ⇒ a `deferred-work.md` item routed to `3-16` (Task 0.5): a new reason needs the
  contract, the words (Panel-approved), and a decision on what an older installed app does).

## Panel question — PROPOSED (one note at Task 0.3)

> ⭐⭐ **2026-11-26 — RULED, [Decision 2026-11-26-508](../../.decision-log.md#decision-2026-11-26-508)** (Trustee-ratified, DR + KB;
> relayed by BigDev: *"by DR and KB / Q1 A / Q2 (ii) / Q3 A / confirmed all three"*). PQ1 (a) = **A**; PQ1 (b) = **(ii)**; the words
> table below = **APPROVED as written** (by reading — ⛔ change given; BigDev may object); PQ2 (`3.13-R1-W6`) = **A** (counsel's half
> open); the three confirms confirmed. ⛔ build change: everything was built-until-ruled on these sides. The text below is kept as
> written; its "PROPOSED" labels now read APPROVED.

⭐ It passes §0: the words are what the Trust TELLS a member, and the Panel reserved them (`-502` item 4's cost line; the told note §3).
It blocks GO-LIVE (Row 57 (b); told note §4), ⛔ the build or the merge. Built on PQ1 (a) A and PQ1 (b) (ii) meanwhile (our
suggestions, PROPOSED).

- **PQ1 — The member's words, and what "how to arrange it" promises.** Two parts, one note.
- **PQ1 (a) — what the Trust promises to do.**
  - ⭐ **The one fact that decides it:** the member cannot fix this alone in the app — they cannot re-run DigiLocker or retype their
    details (F10 (c)); only a meeting or a video call with staff can, and staff can already see the member's number to arrange one (F10
    (a)). So the "how" line must point the member at staff, and must not promise more than staff will do.
  - ⚠ **On every option:** for a member whose typed-in details were WRONG, meeting staff cannot finish the check — ⛔ route corrects a
    detail, for the member or for staff (F10 (d); the Panel was told on 21 November it is *"a separate piece of work"*). PQ1 (b) asks what
    the card says to them.
  - **A (our suggestion):** both ways — *"Staff may phone you to arrange it, or you can ask for help here."* + an "Ask for help" action
    (the help request reaches the helpline operators). *Cost:* "may phone" is a possibility, ⛔ a promise — a member may wait for a call
    that never comes; the help request reaches a helpline operator, who must pass it to a District or Pariwar Admin to do the check.
  - **B:** only the help request — *"Ask for help here to arrange it."* *Cost:* every member must act first; one who does not will hear
    nothing more unless staff phone anyway.
  - **C:** only the phone call — *"The Trust's staff will phone you to arrange it."* *Cost:* a promise the Trust must keep for every such
    member; ⛔ way for the member to start it; "will" is ⛔ true today (nothing schedules a call); and for a member staff could ⛔ reach, it
    repeats what already failed.
- **PQ1 (b) — what the card says, reason by reason.**
  - ⭐ **The one fact that decides it:** showing an ID again finishes the check only when the ID was the problem. When the member typed a
    detail wrongly, ⛔ step built today can put it right; and when staff could ⛔ reach the member, "staff may phone you" repeats what
    already failed.
  - **(i):** ONE "how" line for all four reasons (the table's `how`). *Cost:* it promises a fix that cannot happen for a wrong detail,
    and reads oddly after *"we could not reach you"*.
  - **(ii) (our suggestion):** a "how" line per reason — `how` for a photo mismatch and for no ID shown; `how_not_reached` (the same
    line WITHOUT "staff may phone you"); `how_details` (show an ID whose details match what you gave — which finishes it when the wrong ID
    was shown — and ask a member whose detail was wrong to say so through the help request, where the Pariwar Admin can record it with
    10.21's `recordCorrection` — `-109` row 2; v1.7). *Cost:* three lines to approve instead of one; a member whose detail WAS wrong
    who asks has the request recorded, but ⛔ one can change the detail yet (`3.13a-G1`), and the card does ⛔ say so; a photo mismatch
    that came from the record (⛔ the person's ID) still gets the "show an ID" line, which cannot finish it. DPDP Act s.12(2) (*"shall…
    correct the inaccurate or misleading personal data"* on request) and the rulebook (Part 10) give a correction right; counsel has ⛔
    been asked whether, and from when, it binds the Trust here.
  - **(iii):** per reason as (ii), but `how_details` ⛔ mentions a wrong detail. *Cost:* a member whose detail was wrong is ⛔ invited
    to say so, so fewer requests are recorded; one who asks anyway gets the same as (ii); the same open question on the correction right.
  - Under PQ1 (a) B or C the sentence on ARRANGING it (*"Staff may phone you to arrange it, or you can ask for help here."* / *"You can
    ask for help here to arrange it."*) changes to that option's words — `how_details` keeps its last sentence about a wrong detail;
    under (a) B, `how` and `how_not_reached` become the same line; under (a) C, `how_not_reached` also says *"The Trust's staff will
    phone you to arrange it."*
  - **The words themselves (Hindi and English) — approve as written, or change them:** the table below. ⚠ The Hindi is the session's
    draft — BigDev reads it before the note is sent (BigDev, 2026-11-26: *"I will read hindi"*; Task 0.3). ⛔ read yet.

| Key (`common`) | English (PROPOSED) | Hindi (PROPOSED — session's draft) |
|---|---|---|
| `identity_check.notice.title` | We could not confirm your identity yet | आपकी पहचान की पुष्टि अभी नहीं हो सकी |
| `identity_check.notice.reason.details_do_not_match` | Reason: the details on your photo ID did not match the details you gave when you joined. | कारण: आपके फ़ोटो पहचान पत्र का विवरण, जुड़ते समय दिए गए आपके विवरण से मेल नहीं खाया। |
| `identity_check.notice.reason.photo_does_not_match` | Reason: the photo did not match. | कारण: फ़ोटो मेल नहीं खाई। |
| `identity_check.notice.reason.no_document_shown` | Reason: no photo ID was shown. | कारण: कोई फ़ोटो पहचान पत्र नहीं दिखाया गया। |
| `identity_check.notice.reason.member_not_reached` | Reason: we could not reach you. | कारण: हम आपसे संपर्क नहीं कर सके। |
| `identity_check.notice.how` (PQ1 (a) A; (b) (ii): photo, no ID shown) | To finish this, show an original government photo ID (for example your Aadhaar card, PAN card or voter ID card) to the Trust's staff, in person or on a video call. Staff may phone you to arrange it, or you can ask for help here. | इसे पूरा करने के लिए, अपना कोई मूल सरकारी फ़ोटो पहचान पत्र (जैसे आधार कार्ड, पैन कार्ड या वोटर आईडी कार्ड) ट्रस्ट के कर्मचारियों को आमने-सामने या वीडियो कॉल पर दिखाएँ। कर्मचारी समय तय करने के लिए आपको फ़ोन कर सकते हैं, या आप यहाँ मदद माँग सकते हैं। |
| `identity_check.notice.how_not_reached` (PQ1 (b) (ii)) | To finish this, show an original government photo ID (for example your Aadhaar card, PAN card or voter ID card) to the Trust's staff, in person or on a video call. You can ask for help here to arrange it. | इसे पूरा करने के लिए, अपना कोई मूल सरकारी फ़ोटो पहचान पत्र (जैसे आधार कार्ड, पैन कार्ड या वोटर आईडी कार्ड) ट्रस्ट के कर्मचारियों को आमने-सामने या वीडियो कॉल पर दिखाएँ। समय तय करने के लिए आप यहाँ मदद माँग सकते हैं। |
| `identity_check.notice.how_details` (PQ1 (b) (ii)) | To finish this, show the Trust's staff an original government photo ID whose details match the ones you gave when you joined (for example your Aadhaar card, PAN card or voter ID card), in person or on a video call. You can ask for help here to arrange it. If a detail you gave was wrong, ask for help here too. | इसे पूरा करने के लिए, ट्रस्ट के कर्मचारियों को आमने-सामने या वीडियो कॉल पर अपना कोई ऐसा मूल सरकारी फ़ोटो पहचान पत्र (जैसे आधार कार्ड, पैन कार्ड या वोटर आईडी कार्ड) दिखाएँ, जिसका विवरण जुड़ते समय दिए गए आपके विवरण से मेल खाता हो। समय तय करने के लिए आप यहाँ मदद माँग सकते हैं। अगर आपका दिया कोई विवरण गलत था, तो उसके लिए भी यहाँ मदद माँगें। |
| `identity_check.notice.ask_help` | Ask for help | मदद माँगें |

  - ⚠ Every line is checked against what is built: the six ID kinds are 3.13 DL7's (`-502` item 1 — *"An original government photo ID,
    shown in person or on a video call"*); "staff may phone" is F10 (a); "ask for help here" is F10 (b). ⛔ line says "submit again",
    ⛔ line names a time limit (3.13 DL9: ⛔ attempt limit, ⛔ time limit), ⛔ line mentions cover or lock-in (F9 — 3-14's).
    `how_details`' *"If a detail you gave was wrong, ask for help here too."* is F10 (d) (v1.7; it replaced *"…it cannot be changed at
    present."*) — it promises ⛔ change and ⛔ time, because nothing builds one (⛔ "in the app", ⛔ "yet"); the help request is F10 (b),
    and what staff can do there is RECORD the request (`-109` row 2 — `3.13a-G1`). The two new lines are the session's draft in BOTH languages —
    BigDev reads them with the rest (Task 0.3). The validate pass ran the microcopy checks (`checkTone`, `checkVocabulary` with the
    member terms, `checkNumerals`, from `scripts/microcopy/lib.ts`) on every line in both languages and on both DL9 hints — all clean
    (2026-11-26); re-run after any change BigDev or the Panel makes.
- **Confirm — does ⛔ hold the build (object if you want it otherwise):** (i) once a claim is filed for the member's death the message
  stops showing — the identity is then checked on the claim, as you ruled on 31 October; a member still alive whose death was wrongly
  reported stops seeing it until staff record that the member is alive (a `member_found_innocent` finding); a claim only withdrawn or
  refused does ⛔ bring it back (OUR reading — it narrows who is told). (ii) The message is in the app only. A text message is left out —
  your words name only the app (*"The app tells the member"*). A phone notification is left out because the app cannot send one yet — that is OUR
  reading, ⛔ your words; adding one later would be its own piece of work. The cost: a member who never opens the app is not told. (iii) "The
  reason" is the one staff pick from the list, ⛔ the private note — our reading, told on 25 November; object if you want the note
  shown.
- **Shown for information — ⛔ asked (object if you disagree)** (each is a MATCH or the narrow side — [[feedback_told_line_must_not_carry_panel_choice]]: ⛔ a choice the Panel must make):
  1. It shows only while the member is still waiting for a check, and goes away once staff confirm them. A suspended member is told too
     (staff can check them, as told on 21 November).
  2. On this message the member sees the reason only — ⛔ the date, ⛔ who checked, ⛔ which ID was shown (the private note is Confirm
     (iii)). Their data download, once it is live, already shows the date of each check and how and with which kind of ID it was done
     (⛔ the private note — whether it may be downloaded is the note's Q3, PQ2 below).
- ⛔ **NOT a question:** that the member is told, and told the reason (`-502` item 4).
- ⭐ **Asked no later than this sitting (a deadline, ⛔ optional):** the peer note `trustee-panel-routing-note-2026-11-26-3-13-staff-note-in-member-download.md`
  (`3.13-R1-W6`; on `governance/panel-sitting-2026-11-26`, ⛔ sent). `-504` item 5 and the deferred item's Trigger put it at *"the sitting
  that approves row `3-13a`'s message, or before the data export goes live, whichever is first"* ⇒ if it has ⛔ been asked before,
  it goes in the same sitting as PQ1; PQ1's note is ⛔ sent while it is unasked (F12).
  ⭐ **2026-11-26 (v1.5) — DISCHARGED into this story's note:** BigDev, *"put the private-note question in same routing note, this session will go first."* ⇒ asked as the note's **Q3** (`c7e9e94b`), its
  options, costs and reading kept as the separate note put them; this note goes to the Panel FIRST. The separate note (`4a48c24d`) and the
  agenda on `governance/panel-sitting-2026-11-26` are ⛔ edited here — withdrawing or marking their copy is BigDev's (F12).
- **PQ2 (the note's Q3) — may a member download the private note staff wrote about their check?** (`3.13-R1-W6`.) A keep it out — built
  today, our reading subject to counsel; B put it in; C keep it out, say it exists, give it on request. The legal half (DPDP s.11(1)(a))
  is counsel's, split out. ⛔ build change in this story: A is what `assemble.ts` does today (F1); B or C would be a new row's work.

## Acceptance Criteria

1. **AC1 (Task 0 — governance FIRST).** Before any `apps/` / `packages/` change: Task 0.1's re-derivation recorded; BigDev's Task 0.2
   answers recorded verbatim; the decision entry committed ALONE; the Panel note written and committed ALONE (⛔ "sent" until BigDev
   says so — [[feedback_shown_to_panel_means_sent]]); Row 57's dated line and the `deferred-work.md` lines written; the row
   `in-progress`. ⭐ Then this file is AMENDED to the recorded answers (every DL / AC / Task that a changed answer touches — #67 (e)),
   and the words table stays marked PROPOSED until the Panel approves them.
2. **AC2 (DL4, N1–N4).** `readMemberIdentityCheckNotice` returns `{ reason }` for a member whose live row is `not_confirmed` and who is
   awaiting a check (the CONTROL: `lock-in`, `self_declared`, `trustee_verified` false, ⛔ moderation, ⛔ death report). ⭐ Every `null`
   leg differs from that control by EXACTLY ONE fact, so deleting the one check it exists for turns it RED. Because 3.13's writer sets
   `trustee_verified` in the same transaction as a `confirmed`, a "live confirmed" fixture fails at the outcome check FIRST and proves
   nothing about eligibility ⇒ the eligibility legs are HAND-SEEDED on a live `not_confirmed` (each labelled so in the test):
   - (a) ⛔ row at all; (b) a live `confirmed` row (through the writer — the outcome check);
   - (c) live `not_confirmed` + the KYC row UPDATEd to `trustee_verified = true` (hand-seeded — kills a missing `identityValidationIneligibility` call);
   - (d) live `not_confirmed` + `verification_strength = 'aadhaar_kyc'` (hand-seeded);
   - (e) live `not_confirmed` + state `active`, and + state `withdrawn` (hand-seeded events — ⛔ production producer, [[project_lock_in_never_ends_no_active_members]]);
   - (f) live `not_confirmed` + `terminated` (through the moderation writers: suspend → terminate);
   - (g) live `not_confirmed` + a standing death report (through the death-report writer) — and the reason AGAIN once a
     `member_found_innocent` finding ends it (the 3.13 AC6 control);
   - (h) N2: a SUPERSEDED `not_confirmed` (reason X) carrying a LATER `decided_at` than the live `not_confirmed` (reason Y), both
     hand-seeded ⇒ returns Y (kills "latest by `decided_at`"); and through the writer, a second `not_confirmed` with a different reason
     returns the NEW reason.
   - POSITIVE legs beside them: a `suspended` member ⇒ `{ reason }`; a hand-seeded `pending-valid` member ⇒ `{ reason }` (labelled
     "⛔ production producer until row 3-14").
   Another member's live row in the SAME Pariwar is ⛔ returned (the `member_id` predicate — RLS alone would pass it), and the same
   person's second membership in ANOTHER Pariwar is invisible to this one's read. Live DB, own container, `twt_dev`, run inside
   `openScopeTx` / `twt_app` ([[feedback_story_validate_footguns]] #56 (a)). ⭐ A select-list test (the live-DB `client.query` spy shape —
   `packages/domain/tests/integration/marketplace/read.spec.ts`, `questionnaire-versions/read.spec.ts`): spy, call the read, keep the
   statements whose text names `member_identity_validations` (assert ≥ 1), and assert their select list is an ALLOW-list (`outcome`,
   `not_confirmed_reason`, plus the WHERE columns) — ⛔ a deny-list, so a future column fails; NON-VACUOUS CONTROL: the same scanner over
   `readIdentityCheckDetail` MUST find `note_ciphertext`. The same spy shows ⛔ statement selecting a `member_kyc_profiles` ciphertext
   column (N3). ⛔ row / event / audit line is written (counts before = after).
3. **AC3 (DL5).** `GET /api/v1/member/identity-check-notice`: ⛔ session → 401 `auth.session_required`; an admin session (log in the way
   `apps/api/tests/integration/device-token/device-token.spec.ts`'s local `authenticateAdmin` does — it is ⛔ exported: copy it) → 401 `auth.session_required` (the guard reads a
   bearer JWT, F16); a member session → 200 with
   `{ notice: { reason } }` or `{ notice: null }`; the member is the SESSION's (a second member's notice never appears — two members, one
   Pariwar). The response's key set is EXACTLY `notice` / `reason` (a key-set assertion on the parsed body, ⛔ "has reason"), and the
   serialized body contains ⛔ the note's plaintext and ⛔ the recorder's display name (both seeded, searched for). The contract is
   `.strict()` (an extra key is refused by a contract test). The route is covered by `login-wall.spec.ts` (it walks the real route table
   and recognises the member session guard — green, and ⛔ on its `PUBLIC_ALLOWLIST`). Under DL5's PROPOSED ⛔-entry answer,
   `openapi/v1.yaml` is byte-identical and `contracts:check-openapi-determinism` green; under option (b), the new path is in `v1.yaml`,
   compared with anchors resolved ([[project_openapi_yaml_anchor_renumbering]]).
4. **AC4 (DL1, DL3, DL6, DL7, DL10).** The card renders NOTHING while loading, on error, on `notice: null`, and after a re-read that
   FAILS following a success that had a notice (the stale-data leg — it goes RED when the render guard reads `data` alone, e.g.
   `data?.notice != null`: name THAT as its mutation; `!isError` beside `isSuccess` is an equivalent mutant, F7a). A re-read that
   HANGS past `CALL_TIMEOUT_MS` hides it (fake timers — [[feedback_story_validate_footguns]] #71 (f)). On a notice: the title, exactly
   ONE reason line (the live reason's — each of the four reasons, in `hi` AND `en`, through the REAL `t()` with locale-distinct values,
   [[feedback_stub_must_call_not_transcribe]]), exactly ONE how line — the one the exported reason → how-key map names for that reason
   (DL3) — and the action words. A re-read returning `null` removes it: on mount, on home-tab FOCUS (`useFocusEffect`), and on `AppState`
   `'active'` — three legs, each asserted in the tick the re-read settles ([[project_query_gctime_blinds_removal_tests]] applies to the
   sign-out clear leg: spy `removeQueries`). Tests use `retry: false` (the client default `retry: 1` adds a delay) and hold the read open
   to see the in-flight state ([[project_tanstack_instant_mock_hides_notready_flip]]; in `renderHook`, read tracked props inside the
   callback — [[project_tanstack_tracked_props_stale_result_current]]). The timeout regression also runs with the production client's
   `retry: 1` default; the hook overrides it with `retry: false` so the first failure hides the notice within `CALL_TIMEOUT_MS`.
   The query options are `{ gcTime: 0, staleTime: 0 }` (a pin test
   imports `IDENTITY_CHECK_NOTICE_CACHE_OPTIONS` — the ⛔-persisted marker, F7) and the key carries `pariwarId` and `memberId`;
   `clearIdentityCheckNoticeCache` is called in all four account-change paths, each right after `clearAnnouncementChannelsCache` (a
   source pin). The card is mounted between `<AnnouncementChannelsCard />` and `<LockInClockWidget />` — so BELOW
   `<ActiveContributionCard />` (a source-order test over `app/(tabs)/index.tsx`; F17's pins stay green). The card is ONE button whose
   `accessibilityLabel` carries title + reason + how + action words (DL10), and the test's tamagui mock FORWARDS `accessibilityLabel`
   and `accessibilityRole` ([[feedback_story_validate_footguns]] #71 (d)).
5. **AC5 (DL8).** Pressing the card opens `/(helpdesk)/new` with `category=kyc-trouble`; `new.tsx` preselects it ONLY when the
   member has ⛔ category yet and the value is in the in-force list, once that list has loaded — a test each for: preselected (and saved
   to the draft, `staffMediation` false); an existing draft category kept; a category the member tapped before the list arrived kept; an
   unknown value ignored; a list that omits `kyc-trouble` (a Pariwar override) ⇒ ignored; the list still loading ⇒ nothing selected; the
   list failed ⇒ nothing selected; ⛔ parameter (10.2's behaviour unchanged). The existing `new.tsx` tests (source scans — F10 (b); Stories 10.2 / 10.29) stay
   green and UNEDITED, incl. the `canSubmit` and `setCategory(c.category)` pins, plus a NEW pin that `setCategory(c.category)` occurs
   exactly once (DL8). These legs need a NEW render harness for `new.tsx` (mock
   `expo-document-picker`, `expo-image-picker`, `lib/turnstile`, `lib/helpdesk-api` and the session) under `apps/mobile/tests/unit/`.
6. **AC6 (PQ1 words).** Every member string is under `identity_check.notice.*` in `common.json`, hi and en, equal to the words table as
   last approved (PROPOSED until PQ1 is ruled) — a test compares each key with an `APPROVED` table in the test (the
   `panel-473-family-copy-resolves.test.ts` shape), so a ruling that changes a word changes ONE table and the strings. The reason → how-key map is pinned the same way: a test compares
   `IDENTITY_CHECK_HOW_KEY_BY_REASON` with a LITERAL map in the test (⛔ read back from the export), and AC4's how-line leg takes its
   expected key from that literal. `pnpm i18n:check`
   green; the microcopy gate green ON `common.json` (it is in `copy_globs`, F8). ⛔ line contains "submit", "again", "lock-in", "cover",
   their Hindi forms (फिर, दोबारा, लॉक-इन, कवर — `कवर` also catches कवरेज), a Latin digit or a Devanagari digit (०–९) — a test over BOTH
   locales, with a control string proving each pattern bites.
7. **AC7 (DL9).** The "Could not confirm" form (`data-testid="identity-check-not-confirmed-form"`) shows the DL9 line as answered at
   Task 0.2 under the reason `<select>` (`not-confirmed-reason`) (admin vitest), from `i18n-en.ts` (⛔ an inline literal); 3.13's admin
   tests (`apps/admin/tests/identity-checks.test.tsx` — ⛔ key-set pin today) stay green and UNEDITED; the microcopy gate green on the
   admin files.
8. **AC8 (records).** A NEW `friction-budget.md` row (F14 — touching the file is ⛔ enough; `payer`: the member reading the message /
   `protects`: a member learning their identity is unconfirmed before it costs them / `event_type: optional`) and `pnpm friction:check`
   green; the sprint row → `review` with ONE ledger
   entry (safe prepend, YAML parses, row count holds — [[project_sprint_status_safe_prepend]]); Row 57 (b)'s dated line; F13's comments
   updated; the PR's GitHub `ci.yml` run at the EXACT tip SHA concluded `success`, all jobs (ADR-0047 cl.1, `2026-11-24-499`), cited by run
   id + SHA + jobs passed / total for the PR run AND the push to `main`. `pnpm ci:local` optional; if run, on a FRESH container.
9. **AC9 (go-live, ⛔ merge).** A device pass on Android (the card in Hindi and English for one reason, its text wrapping; TalkBack reads
   the card's label ONCE; the help form opens preselected; with the app left open on the home tab, staff confirm the member ⇒ the card
   is gone after the member leaves and returns to the app, and after they visit another tab and come back — ⛔ a restart) is a GO-LIVE leg
   recorded on Row 57 (b) (told note §4), ⛔ a merge
   condition ([[project_not_in_production_merge_is_not_golive]]; device recipe [[project_installed_debug_apk_cannot_reach_metro]]).

## Tasks / Subtasks

- [x] **Task 0 — Governance FIRST (AC1).** Touch an `apps/` or `packages/` file only AFTER 0.4 is committed.
  - [x] 0.1 `git fetch origin`; `git merge-base --is-ancestor ce0737ce HEAD`; `git diff --name-only ce0737ce..origin/main -- packages apps`
        (EMPTY at v1.2, `origin/main` = `f5c559d0`) — re-read every F-fact whose file moved; rebase the story branch onto `origin/main`
        first if it is behind (the ledger conflict recipe: [[project_rebase_ledger_conflict_separator]]). Re-read across EVERY ref (local +
        remote) and worktree (`git branch -a`, `git worktree list`, `git for-each-ref`): the next decision id (`-508` at v1.2), the next
        ledger letter (after v1.2's own `2026-11-26i` ⇒ `j`, unless a peer has taken it), that ⛔ branch builds
        a member-side read of `member_identity_validations` (`git log --all --oneline --grep='3-13a\|3\.13a'`; `git grep -n
        'identity_check\.notice\|identity-check-notice' $(git for-each-ref --format='%(refname)' refs/heads refs/remotes)`). Re-check
        rows `3-14` / `3-16`: if either has started, read its story for a change to DL4's eligibility or a new reason, and reconcile N1
        BEFORE 0.2. Re-read the peer's `governance/panel-sitting-2026-11-26` agenda (has it been sent? does item 9 still name R1-W6?).
        Re-check row `3-16`'s reason list if it has started (DL12).
        ⭐ 2026-11-26 (partial, before 0.2): `git fetch origin` — `origin/main` = `f5c559d0`; `ce0737ce` IS an ancestor of HEAD;
        `git diff --name-only ce0737ce..origin/main -- packages apps` EMPTY (⛔ F-fact moved); the branch lacks only `f5c559d0`
        (records-only) — ⛔ rebased (the note cites this branch's SHAs); ⛔ `3-14` / `3-16` branch on any ref. The agenda re-read: ⛔
        sent; item 9 now MARKED withdrawn (`041889ae`). Still owed in 0.1 (⚠ `-508` is now TAKEN by the Panel's ruling ⇒ 0.4 re-greps from `-509`): the next decision id and ledger letter (⭐ DONE 2026-11-26: re-grepped every ref + worktree before `-509` — `-508` highest — and before ledger `m` — `l` highest), re-read just before 0.4.
  - [x] 0.2 Put DL1–DL12 to BigDev (the question dialog; recommended option first): DL1 (where), DL2 + DL3 (when / what), DL4–DL7 (the
        build — one question, naming DL5's OpenAPI choice and DL6's render rule with their options), DL8 (preselect vs unselected),
        DL9 (the staff hint, word for word — "will see" vs "is told"), DL10 (whole card as the button vs a separate button), and WHERE
        `3.13-R1-W6` is asked — at PQ1's sitting or earlier (the deadline is bound, F12; the sitting is BigDev's to decide and to tell
        the peer session — ⛔ an edit to its branch). ⭐ ANSWERED 2026-11-26: *"put the private-note question in same routing note, this session will go first."* — it is the note's Q3 (`c7e9e94b`). Record the answers verbatim here.
        ⭐ 2026-11-26 — DL1–DL12 ANSWERED: *"Build questions as recommended"* (each side named in the box under "Build decisions").
        The peer agenda marked at BigDev's word (*"mark that this file come before"*) — `041889ae` on `governance/panel-sitting-2026-11-26`
        (no peer session was running — ListAgents empty — and the edit is BigDev's ask, so the "⛔ an edit to its branch" line above is
        superseded by BigDev's word, ⛔ reinterpreted).
  - [x] 0.3 Write the Panel note from the TEMPLATE (§0 first; PQ1 (a) and (b), each with its one deciding fact and options with an
        honest cost; the words table; the two confirm lines; the two info lines; evidence LAST, E4 commands run before commit). ⛔ send it
        while `3.13-R1-W6` is still unasked — it goes in the same sitting unless it was asked earlier (F12):
        `_bmad-output/planning-artifacts/trustee-panel-routing-note-<date>-3-13a-member-told-identity-not-confirmed.md`. ⚠ The Hindi
        column is the session's draft: ask BigDev (in 0.2) who reads the Hindi before it goes out, and record the answer. Commit it ALONE.
        ⭐ 2026-11-26 — ANSWERED at create-story (BigDev: *"I will read hindi"*): BigDev reads the Hindi column before the note is sent;
        record their changes in the words table (and the story's PQ1 table) BEFORE the note is committed. ⛔ "Hindi reviewed" until they
        have read it. ⚠ v1.2 added two lines (`how_not_reached`, `how_details`) in BOTH languages — they are in the same read.
        ⭐ 2026-11-26 — WRITTEN at BigDev's ask (*"create a panel note separately in this story"*), BEFORE 0.2:
        `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-11-26-3-13a-member-told-identity-not-confirmed.md`, committed
        ALONE `ff89f047` (E4 run first; a fresh-context review of the draft applied first). The note's Q1 = PQ1 (a), Q2 = PQ1 (b), plus
        three non-blocking confirms (a reported death; app only; the reason ⛔ the private note). ⛔ SENT. Still owed before it is sent:
        BigDev's Hindi read (DONE 2026-11-26, *"Hindi is ok"*); `3.13-R1-W6` (DONE 2026-11-26 — asked in this note as Q3,
        `c7e9e94b`); the peer agenda's copy of R1-W6 and its *"once that work is built"* line withdrawn or marked (BigDev's — this note goes
        first); and, after 0.2, the note re-checked against the answers (a changed DL that touches the words amends the
        note by a dated line, ⛔ a rewrite). The box stays unticked until it is sent.
        ⭐ 2026-11-26 — BigDev READ the Hindi (all nine lines, shown with the English): *"Hindi is ok"* — ⛔ change; recorded in the
        note's status block. ⛔ the Panel's approval — the words table stays PROPOSED until PQ1 is ruled.
        ⚠ 2026-11-26 (v1.7) — REOPENED for ONE sentence: `how_details`' last sentence changed (*"…तो उसके लिए भी यहाँ मदद माँगें।"*);
        BigDev reads it before the note is sent. The other eight lines stand as read.
        ⭐ 2026-11-26 (v1.8) — BigDev READ the changed sentence (shown with the English): *"Hindi is ok"* — ⛔ change; the Hindi read is
        DONE again; recorded in the note's status block.
        ⭐ 2026-11-26 (v1.9) — EVERY owed item before sending is DONE: the Hindi read; `3.13-R1-W6` (Q3); the peer agenda marked
        (`041889ae`); the note re-checked against 0.2's answers — ⛔ word changed (a dated line in its status block). The box stays
        unticked until BigDev sends it.
        ⭐⭐ 2026-11-26 — SENT and RULED: `-508` (DR + KB — *"by DR and KB / Q1 A / Q2 (ii) / Q3 A / confirmed all three"*); the note's
        ruling block filled, the rest unedited. That it was sent is INFERRED from the ruling (channel / time ⛔ recorded).
  - [x] 0.4 Author-commit decision entry (`<date>-<next>`, re-grepped on every ref just before writing): DL1–DL12 as answered, the §0
        split, `-502` item 4 quoted byte for byte, the AI-10-1 line (⛔ benefit gate), PQ1 (a) and (b) open + built on PQ1 (a) A and PQ1 (b) (ii); committed ALONE.
        ⚠ If the write is refused, ask once ([[project_decision_log_writes_user_inserted]]).
        ⚠ 2026-11-26 — PQ1 / PQ2 are now RULED (`-508`), ⛔ open: the entry cites `-508` for them instead of "open + built on …"; its
        id is re-grepped from `-509`.
        ⭐ 2026-11-26 — WRITTEN: [Decision 2026-11-26-509](../../.decision-log.md#decision-2026-11-26-509) (`659d9829`, committed ALONE;
        `-508` the highest id on every ref and worktree after `git fetch origin`) — DL1–DL12 on their recommended sides, the §0 split,
        `-502` item 4 copied byte for byte from the log, the AI-10-1 line (⛔ benefit gate), PQ1 / PQ2 cited as ruled by `-508`.
  - [x] 0.5 Roster Row 57: a dated line under (b) — *"row `3-13a` started; (b) is MET when it is built AND its words are approved (PQ1)
        AND the device pass (AC9) is recorded"* (⛔ edit to the leg's text — [[feedback_supersede_never_reinterpret]]).
        `deferred-work.md`: a dated line under PQ2 (*"row 3-13a in progress, words PQ1 open"*); a NEW item for row `3-14` — the cover
        promise in BOTH `lock_in.rationale` and `lock_in.unlock_date_label` (F9), trigger: 3-14's create-story; a NEW item for row `3-16`
        — a new `not_confirmed` reason needs the contract, Panel-approved words and a decision on older installed apps (DL12), trigger:
        3-16's create-story; a NEW item, OPEN and unhomed — ⛔ route corrects a wrong typed-in detail for anyone (F10 (d); the 21 November
        note's info line 6; Niyamavali Part 10's correction right is counsel's to read), owner BigDev, trigger: PQ1's ruling or Row 57's
        go-live, whichever is first (observed and escalated — ⛔ planned here) (⭐ WRITTEN 2026-11-26 with v1.6 as `3.13a-G1`); a dated line on `3.13-R1-W6` naming PQ1's sitting (⭐ WRITTEN 2026-11-26 with v1.5 — it is the note's Q3).
        ⭐ 2026-11-26 — DONE: the Row 57 (b) line and the PQ2 line were written with `-508`'s records (`798e1493` — the words now RULED,
        so (b) is MET when built AND the device pass is recorded); `3.13-R1-W6` (`798e1493`) and `3.13a-G1` (`3499ed0e`, its trigger
        line `798e1493`); NEW `3.13a-G2` (the cover promise in BOTH `lock_in.rationale` and `lock_in.unlock_date_label` → row `3-14`) and
        `3.13a-G3` (a new `not_confirmed` reason → row `3-16`) — both re-verified on the code.
  - [x] 0.6 Sprint row `3-13a-…` `ready-for-dev → in-progress` (map only; the ONE ledger entry is written at the end).
        ⭐ 2026-11-26 — DONE: the row flipped `ready-for-dev → in-progress` with a dated comment above it; ledger `2026-11-26m` (the
        highest letter on every ref was `l`; prepended with the size-guarded write; plain `yaml.safe_load` passes, 327 rows). ⚠ Earlier
        steps of this story also wrote ledger lines (`g`, `i`–`l`), so "the ONE ledger entry" is ⛔ how it went; dev-story adds its own.
- [x] **Task 1 — Domain (AC2).** `readMemberIdentityCheckNotice` in `packages/domain/src/member/identity-validation.ts` (DL4: the narrow
      live-row select; `getCurrentMemberState(db, memberId)`, `getCurrentMemberModerationOverlay(db, memberId)`, the two-column KYC
      standing (`readDeceasedKycStanding` or a same-shape local read if the import cycles — ⛔ `getMemberKycProfile`);
      `identityValidationIneligibility`; `isDeathReportStanding` CALLED, ⛔ its SQL copied). ⛔ edit to any existing function there (N5).
      Unit + live-DB tests (AC2), incl. the select-list spy test.
      ⭐ 2026-11-26 — DONE (`7afdf47e`): `readMemberIdentityCheckNotice` appended (⛔ existing function edited; `readDeceasedKycStanding`
      imported — ⛔ import cycle); 17 live-DB tests (`identity-check-notice.spec.ts`), every one inside `twt_app` scope. Mutants killed:
      ⛔ eligibility call (5 red), ⛔ death check (1), ⛔ `member_id` predicate (2), "latest by `decided_at`" (1), the note in the select (1).
      ⚠ (f) and (g) use 3.13's own fixtures (the overlay's `member.moderation.*` event arms; `seedClaim` + a raw
      `member_found_innocent` finding) — ⛔ the moderation / death-report writers the AC names; the read sees the same rows.
      A separate unit test was ⛔ written: the read has no pure logic beyond the call into 3.13's unit-tested rule.
- [x] **Task 2 — Contract + API + SDK (AC3).** `packages/contracts/src/members/identity-check-notice.ts` + barrel + a contract test (strict,
      fixture); `apps/api/src/modules/member-home/` route + handler (F4 shape; the 500 on a read failure — DL5); `memberIdentityCheckNotice()`
      in `packages/api-client/src/index.ts`; OpenAPI per DL5's answer (⛔ entry ⇒ `v1.yaml` byte-identical; option (b) ⇒ a `registerPath`
      in `packages/contracts/scripts/emit-openapi.ts` + `pnpm contracts:emit-openapi`);
      `apps/api/tests/integration/member-home/identity-check-notice.spec.ts` (live DB).
      ⭐ 2026-11-26 — DONE (`533f3f69`): the contract (+ barrel, 8 contract tests), the route + handler (500 on a read failure), the SDK
      method; ⛔ OpenAPI entry (DL5) — `contracts:check-openapi-determinism` green, `openapi/v1.yaml` untouched. API spec 5 tests;
      `login-wall.spec.ts` green and RED with the route's guard removed (mutant).
- [x] **Task 3 — Mobile (AC4, AC5, AC6).** Read FIRST: `components/announcement-channels/useAnnouncementChannelsQuery.ts` (THE re-read
      precedent — DL6), `KnownPeopleRequestEntry.tsx` + `lib/known-people.ts` `requestEntryVisible` (the card shape; and the opposite
      render rule, F6), `PeerRequestEntry.tsx`, `known-people-cache.ts`, `lib/session-context.tsx` (the four clear sites),
      `app/(helpdesk)/new.tsx` + `lib/helpdesk-draft.ts`. Then: `apps/mobile/components/identity-check/IdentityCheckNoticeCard.tsx` +
      `useIdentityCheckNoticeQuery.ts` (exported key, cache options, clear function and reason → how-key map, DL3 / DL6); the clears in
      `session-context.tsx` after each `clearAnnouncementChannelsCache(queryClient)`; mount in `app/(tabs)/index.tsx` between
      `<AnnouncementChannelsCard />` and `<LockInClockWidget />` with a one-line `{/* Story 3.13a … */}` comment like its neighbours (⛔ a
      `[t]`-dependency hook in that file, F8); the keys in `packages/i18n/locales/{en,hi}/common.json`; the `category` parameter in
      `app/(helpdesk)/new.tsx` (DL8, the tap's inline handler UNCHANGED); vitest. ⭐ Tests go in `apps/mobile/tests/unit/*.test.ts`
      (F17 — a test beside a component never runs). ⭐ Before mounting, `git grep -n "(tabs)/index\|LockInClockWidget\|ActiveContributionCard\|session-context" apps/mobile/tests`
      (F17's list is a START, ⛔ complete — e.g. `announcement-channels-signout.test.ts` renders the real `SessionProvider` the new clear
      lands in, and `announcement-channels-render.test.ts`) — every existing test that pins the home screen's entries or their order or
      the account-change clears must stay green; if one enumerates the entries, add the card to it, ⛔ weaken it. ⚠ Traps: the tamagui mock
      must forward the props a test asserts (#71 (d)); a mocked `t` must return locale-distinct words; `retry: false` in tests;
      [[project_tanstack_instant_mock_hides_notready_flip]]; [[project_tanstack_tracked_props_stale_result_current]];
      [[project_query_gctime_blinds_removal_tests]] (the sign-out clear leg); [[project_uset_fresh_closure_memo_trap]].
      ⭐ 2026-11-26 — DONE (`679c5c46`). Deviations, stated: the two key maps live in a PURE `identity-check-notice-keys.ts` (the words
      test imports them without native code); the hook sets ⛔ `retry` (the app client's default `retry: 1` applies — production
      unchanged; tests use `retry: false`). The "same tick" legs wait on TanStack's `setTimeout(0)` notify with `waitFor` — the query
      stays OBSERVED, so the 0 ms gc cannot stand in for the re-read; the remount leg first waits for the `gcTime: 0` removal. AC5's
      "a category tapped before the list arrived" is ⛔ reachable (no category button renders while the list loads or has failed); the
      harness proves the `category !== undefined` guard by the draft leg and a pick kept across a reload, plus a leg that the preselect
      applies only at the FIRST success. ⚠ The new once-only pin caught this story's own comment quoting the tap's call (the 10.29 pin
      reads the FIRST occurrence) — reworded. 50 new tests in four files; 14 mutants killed (render guard on `data`, ⛔ timeout, ⛔ focus,
      ⛔ AppState, ⛔ `gcTime: 0`, swapped how key, a title-only label, wrong category, wrong clear key, two clears dropped, the four
      preselect guards, a `useState`-initializer preselect). Every existing home / session / helpdesk test green and UNEDITED.
- [x] **Task 4 — Admin hint (AC7).** `i18n-en.ts` `form.reasonToldToMember` + the header comment replaced by a dated line; render in
      `IdentityCheckDetailPage.tsx` under the reason choice; admin vitest.
      ⭐ 2026-11-26 — DONE (`e1137251`): the line under the select, which is `aria-describedby` it (the `select` helper gained an optional
      last parameter); a new test file (4); `identity-checks.test.tsx` unedited and green (119 together).
- [x] **Task 5 — Gates.** `pnpm i18n:check`; `pnpm microcopy:check`; `pnpm friction:check` (with a NEW `friction-budget.md` row, F14);
      `contracts:check-openapi-determinism`;
      the api unit suite (the source fence lives there — [[project_source_fence_lives_in_api_unit_suite]]); `login-wall.spec.ts`; the
      live-DB suites on your OWN container (`twt_dev`; a domain red hides 8 packages — re-run the whole job,
      [[project_known_livedb_test_failures]]); mobile + admin vitest; typecheck + eslint. Then the PR's GitHub CI run (AC8;
      `scripts/land.sh --dry-run <pr>` before landing — [[feedback_land_prs_by_fast_forward]]).
      ⭐ 2026-11-26 — LOCAL gates ALL green (Completion Notes). ⚠ The PR's GitHub CI run is OWED AT LANDING by BigDev's answer
      (*"At landing, after review (Recommended)"*) — AC8's CI clause stays OPEN until then (the 3.13 shape).
- [x] **Task 6 — Records (AC8).**
  - [x] 6.1 Story file: Dev Agent Record, File List (a pasted `git diff --name-only`, ⛔ recalled — #60 (a)), Change Log.
  - [x] 6.2 F13's comments (`member_identity_validations.ts` header: *"row `3-13a` tells …"* → *"row `3-13a` (built) tells …"*, dated).
  - [x] 6.3 Sprint row → `review`; ONE ledger entry (safe prepend; verify the YAML parses and the row count holds).
  - [x] 6.4 `deferred-work.md` PQ2: a dated line (built; Row 57 (b) waits on PQ1's ruling and AC9).

### Review Findings

Code review 2026-11-26 — baseline `ce0737ce`, reviewed HEAD `13c7c8e3`; Blind Hunter, Edge Case Hunter and Acceptance Auditor completed. Two patch findings, no decision-needed or deferred findings; two speculative candidates dismissed (the prescribed in-flight refetch joining and the pre-existing helpdesk category-cache policy).

- [x] [Review][Patch][P2] Production retries keep the stale notice visible beyond AC4's timeout. [apps/mobile/components/identity-check/useIdentityCheckNoticeQuery.ts:59] — `withTimeout` bounds each attempt, but the production query client supplies `retry: 1`. After the first 15-second timeout, TanStack keeps `isSuccess: true` and the previous notice during backoff and a second attempt; a hung re-read can therefore retain the card for about 31 seconds. The timeout test uses `retry: false`, masking this AC4 / DL6 / N6 gap. Enforce the stated deadline in production and exercise the timeout with production retry settings. Verified with the installed QueryObserver: the first rejected refetch attempt retains success and the notice; the second rejection changes status to error.
- [x] [Review][Patch][P3] G1 still describes the discarded member wording as current behavior. [_bmad-output/implementation-artifacts/deferred-work.md:15044] — the "Who it hits" paragraph says the card tells the member a detail "cannot be changed at present". The approved and implemented `identity_check.notice.how_details` instead says "If a detail you gave was wrong, ask for help here too." Add a dated correction distinguishing the historical wording from the shipped behavior; the underlying correction gap remains open.

Initial review validation: focused mobile suites 83/83, admin suites 119/119, contract suite 8/8 passed. Live domain/API database tests were inspected but not re-run: the story's `twt-3-13a-pg` container was unavailable. Android/TalkBack remains the disclosed AC9 go-live leg, and GitHub CI remains owed at landing.

2026-11-26 — both patches applied at BigDev's choice **1** (apply every patch). P2: the hook now sets `retry: false`; the card suite uses the production client's `retry: 1` default. The hung-refetch regression was run before the fix and failed (`success` instead of `error` after the deadline), then passed after the fix, including no transport retry after the deadline. P3: G1 has a dated correction quoting the approved English and Hindi and preserving the earlier wording as history; the correction gap stays OPEN. Re-validation: all six focused mobile suites 83/83, mobile typecheck and targeted ESLint passed. Review findings resolved; story and sprint row → `done` (ledger `2026-11-26o`). This is review completion, ⛔ landing or go-live; GitHub CI at landing and AC9 remain owed.

## Dev Notes

### Traps

1. **⛔ Reuse `readIdentityCheckDetail` member-side.** It returns the history and the live note's ciphertext (F1). A new, narrow select
   (DL4) — the withheld columns must never leave the database (N3).
2. **RLS is Pariwar-wide.** 0218 has ⛔ member-self policy (F2): forget `member_id = $2` and every member of the Pariwar sees the first
   live row the planner finds. AC2's two-members-one-Pariwar leg is the only test that catches it; CI's superuser hides RLS mistakes the
   other way (#56 (a)) — run the read inside `openScopeTx`.
3. **The default query is persisted for a week, and ⛔ query re-reads on focus** (F7). Without `gcTime: 0` a "not confirmed" stays on the
   phone after staff confirm and after sign-out-sign-in; without DL6's `useFocusEffect` + `AppState` re-read it stays on screen until a
   restart. TanStack keeps old data on a failed refetch with `status: 'error'` (F7a) — render on `isSuccess`, ⛔ on `data` alone; and a
   hung re-read keeps `status: 'success'`, so bound it with `withTimeout`.
4. **⛔ a `{reason}` interpolation** — one full sentence per reason (DL3). `t()` throws on a missing param (#27) and Hindi word order
   differs from English.
5. **⛔ promise what nothing builds** (#65 (c)): ⛔ "submit again", ⛔ "verify again in the app" (F10 (c)), ⛔ "we will call you" (PQ1 C is
   the Panel's to choose), ⛔ "you will be covered" (F9), ⛔ a line implying that showing an ID finishes it when the typed-in detail itself
   was wrong — ⛔ route corrects a detail (F10 (d) — PQ1 (b)); ⛔ "in the app yet" / "later" for a change nothing builds.
6. **OpenAPI is hand-registered** (F15) — "regenerate" changes nothing; ⛔ claim an OpenAPI change you did not register (DL5).
7. **The help form's category list is ASYNC and its draft is PERSISTED** (F10 (b)) — a preselect in the `useState` initializer cannot
    check the list, and one that skips `persist` disagrees with the draft on the next visit (DL8).
8. **The words are PROPOSED.** Build from the table; when PQ1 is ruled, change the `APPROVED` table, the reason → how-key map and the two JSON files together
   (AC6) — ⛔ "approved" in any comment, commit or ledger line before the ruling ([[feedback_record_unattested_no_backfill]]).
9. **The staff hint is false until the card ships** — same PR (DL9).
10. **Hand-format; Prettier is not enforced** ([[project_prettier_not_enforced]]); `**cl.3**` in a JSDoc closes it
   ([[project_markdown_emphasis_closes_jsdoc]]). Unicode escapes in Hindi land raw — write the Devanagari directly and scan added lines
   with `python3 -I` ([[project_unicode_escapes_written_raw]]).
11. **The shell's `DATABASE_URL` is `:5432`** — scope every live run to your container ([[project_prepush_hook_inherits_5432]]); the
   hook runs from the MAIN checkout ([[project_hookspath_absolute_main_checkout]]).

### What this story does ⛔ do
It does not change who is verified, covered or eligible; send a text, notification or WhatsApp; tell a member who was never checked;
show the date, the recorder, the ID kind or the note; touch 3.13's writer, routes or table; reword the lock-in line; or decide whether
the staff note is downloadable.

### Project Structure Notes
- New: `packages/contracts/src/members/identity-check-notice.ts`, `apps/mobile/components/identity-check/`
  (`IdentityCheckNoticeCard.tsx`, `useIdentityCheckNoticeQuery.ts`), `apps/api/tests/integration/member-home/identity-check-notice.spec.ts`;
  tests in each package's OWN test tree — mobile: `apps/mobile/tests/unit/*.test.ts` (F17; ⛔ beside the component); domain:
  `packages/domain/tests/…`; contracts: the package's tests (outside tsc — [[project_contracts_tests_outside_tsc]]); admin:
  `apps/admin/tests/`.
- Updated: `packages/domain/src/member/identity-validation.ts` (one new export), `packages/contracts/src/members/index.ts`,
  `apps/api/src/modules/member-home/{routes,handlers}.ts`, `packages/api-client/src/index.ts`, `apps/mobile/lib/session-context.tsx`
  (four clears), `packages/contracts/scripts/emit-openapi.ts` + `openapi/v1.yaml` ONLY under DL5 option (b),
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
  `trustee-panel-told-2026-11-25-3-13-identity-check-as-built.md` (§3, §4).
- Precedents: Story 3.7 (`member-home`, the lock-in widget), Story 5.14 (`useAnnouncementChannelsQuery` — the re-read on focus and
  foreground, the timeout, the account-change clears), Story 6.36b (`KnownPeopleRequestEntry` — the card shape, the cache options, and the
  render rule DL6 departs from), Story 6.27a (`PeerRequestEntry` — the card), Story 10.2 (the member helpdesk), Story 6.39 /
  `panel-473-family-copy-resolves.test.ts` (an `APPROVED` words table pinned in a test), `claim/membership-check-approval.ts`
  `readDeceasedKycStanding` (the two-column KYC read), `marketplace/read.spec.ts` (the `client.query` spy).
- Niyamavali (git-ignored copy; section numbers only): §2.1 (b), Part 7 R10(B), Part 10.
- `sprint-status.yaml` — navigate by the `3-13a-…`, `3-13-…`, `3-14-…` row blocks (⛔ line numbers).
- Roster Row 57 (`docs/launch-gate-inventory/inventory-roster.md`, `identity-validation-live`, leg (b)).

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (`claude-opus-5-5`), `bmad-dev-story 3.13a on worktree`, 2026-11-26.

### Debug Log References

- Own container `twt-3-13a-pg` (postgres:16, `:5462`, `twt_dev`), migrated fresh; the shell's `:5432` never used.
- Unit job: `env -u DATABASE_URL pnpm turbo run test --concurrency=4 --force` — 37 / 37 tasks.
- Live-DB job (CI's command, `--concurrency=1`, the nine packages) — 24 / 24 tasks: domain 8989 passed + 1 skipped (pre-existing,
  `column-transformer.integration.test.ts`), api 3460 + 1 skipped (pre-existing), jobs 2402, public 826, channels 468,
  validity-service 284, niyamavali-engine 144, events 50, queue 4.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created (`bmad-create-story 3.13a`, 2026-11-26).
- ⭐ 2026-11-26 — DEV-STORY COMPLETE (`bmad-dev-story 3.13a`), four code commits on `d3e94d9b`: `7afdf47e` (domain read),
  `533f3f69` (contract + route + SDK), `679c5c46` (the card, the preselect, the words, the friction row), `e1137251` (staff hint).
- AC2 / AC3 — live-DB specs: domain 17, api 5 (own container). AC4–AC6 — mobile 50 new tests; mobile vitest 2596 / 2596. AC7 — admin
  4 new + 3.13's file unedited. The words: the nine `identity_check.notice.*` lines in both locales compared with the ruled Panel note
  (`-508`) line by line — 9 / 9; the `APPROVED` table in `identity-check-notice-copy.test.ts` pins them through the real `t()`.
- Gates: `pnpm i18n:check` ✓; `pnpm microcopy:check` ✓ (337 code / 34 copy files); `pnpm contracts:check-openapi-determinism` ✓
  (`openapi/v1.yaml` untouched — DL5); `pnpm friction:check` ✓ AFTER the commits (*"member-facing surface touched and a declaration row
  changed (1 added/amended)"* — before commit it reads "dormant", which proves nothing); typecheck + eslint clean on every touched
  package; added lines scanned for raw `\u` escapes (`python3 -I`) — 0.
- ⚠ NOT done here: the PR's GitHub CI run (owed at landing — BigDev); the Android device pass (AC9 — a GO-LIVE leg, Row 57 (b));
  `pnpm ci:local` (optional, ⛔ run). The words are the Panel's (`-508`); ⛔ new member wording was introduced.
- Records: Row 57 (b) and `deferred-work.md` PQ2 — dated "built on the story branch, ⛔ landed" lines; F13's schema comments dated;
  sprint row `in-progress → review`, ledger `2026-11-26n`.

### File List

(`git diff --name-only d3e94d9b..HEAD` + the records commit — pasted, ⛔ recalled.)

- `_bmad-output/implementation-artifacts/3-13a-member-told-when-identity-not-confirmed.md`
- `_bmad-output/implementation-artifacts/deferred-work.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `apps/admin/src/modules/identity-checks/IdentityCheckDetailPage.tsx`
- `apps/admin/src/modules/identity-checks/i18n-en.ts`
- `apps/admin/tests/identity-checks-reason-hint.test.tsx`
- `apps/api/src/modules/member-home/handlers.ts`
- `apps/api/src/modules/member-home/routes.ts`
- `apps/api/tests/integration/member-home/identity-check-notice.spec.ts`
- `apps/mobile/app/(helpdesk)/new.tsx`
- `apps/mobile/app/(tabs)/index.tsx`
- `apps/mobile/components/identity-check/IdentityCheckNoticeCard.tsx`
- `apps/mobile/components/identity-check/identity-check-notice-keys.ts`
- `apps/mobile/components/identity-check/useIdentityCheckNoticeQuery.ts`
- `apps/mobile/lib/session-context.tsx`
- `apps/mobile/tests/unit/helpdesk-new-preselect-render.test.ts`
- `apps/mobile/tests/unit/identity-check-notice-card.test.ts`
- `apps/mobile/tests/unit/identity-check-notice-copy.test.ts`
- `apps/mobile/tests/unit/identity-check-notice-signout.test.ts`
- `docs/launch-gate-inventory/inventory-roster.md`
- `friction-budget.md`
- `packages/api-client/src/index.ts`
- `packages/contracts/src/members/identity-check-notice.ts`
- `packages/contracts/src/members/index.ts`
- `packages/contracts/tests/members-identity-check-notice.test.ts`
- `packages/domain/src/member/identity-validation.ts`
- `packages/domain/src/schema/member_identity_validations.ts`
- `packages/domain/tests/integration/member/identity-check-notice.spec.ts`
- `packages/i18n/locales/en/common.json`
- `packages/i18n/locales/hi/common.json`

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.14 | 2026-11-26 | `bmad-code-review 3.13a` — three review layers completed; two patches applied (BigDev **1**). The notice hook disables retries so the first failed or hung re-read hides the card within 15 seconds; regression uses the production client's `retry: 1`, failed before the fix and passed after it. G1 gains a dated wording correction; the underlying correction gap remains OPEN. Mobile focused suites 83/83, typecheck and targeted ESLint passed. Story and sprint row → `done`; ledger `2026-11-26o`. GitHub CI remains owed at landing; Android/TalkBack AC9 remains a go-live leg. ⛔ Committed, pushed or landed here. |
| 1.0 | 2026-11-26 | Created by `bmad-create-story 3.13a` in its own worktree, branch `story/3-13a-member-told-when-identity-not-confirmed` off `origin/main` `ce0737ce` (upstream unset). §0 applied: telling + the reason + the app are RULED (`-502` item 4); the reason = the closed list is TOLD (§3); the member's words and what "how to arrange it" promises are PQ1 (one note at Task 0.3, ⛔ written yet); DL1–DL12 PROPOSED for Task 0.2. AI-10-1: ⛔ benefit gate. Row `backlog → ready-for-dev`; the `epics.md` Story 3.13a block added. ⛔ Decision id taken, ⛔ code, ⛔ pushed. |
| 1.1 | 2026-11-26 | BigDev: *"I will read hindi"* — BigDev reads PQ1's Hindi column before the note is sent (Task 0.3, PQ1). ⛔ read yet. |
| 1.2 | 2026-11-26 | Validated (`bmad-create-story validate 3.13a`; three read-only verifiers — code / governance / premises — at `ce0737ce`; `origin/main` `f5c559d0`, records only), 29 findings, BigDev: *"all"*. Build: DL6 re-reads on home-tab focus and app foreground (the 5.14 precedent; ⛔ query re-read on focus before — the card would have stayed after a confirmation), bounded by `withTimeout`, cleared at the four account-change sites; render on `isSuccess` (the `!isError` mutation was equivalent — RUN in query-core 5.101.0), stated as the opposite of the known-people rule with its cost; DL4 reads the KYC standing as two columns and calls the three reads directly; DL5 ⛔ OpenAPI entry (hand-registered; PROPOSED); DL8 preselects after the async list loads, exactly as a tap (persisted), the tap handler unchanged; DL10 the whole card is one button; DL1's inverted ⛔ fixed and its costs stated; DL12 a new 3-16 reason does ⛔ reach the card. Tests: AC2 rebuilt one-fact-per-leg (hand-seeded where the writer cannot reach), a `suspended` positive leg, the select-list spy shape; AC3 401 `auth.session_required` for an admin; AC4 focus / foreground / timeout legs and the right mutant; AC5 list-loading / list-error / override legs and a new harness; AC6 Hindi bans; tests in `tests/unit/`. Governance: PQ1 split into (a) the promise and (b) a per-reason how line (⛔ route corrects a wrong typed-in detail — F10 (d), two new PROPOSED lines in both languages, microcopy-clean); push left out is OUR reading ⇒ a non-blocking confirm, ⛔ a told line; `3.13-R1-W6` BOUND to PQ1's sitting (`-504` item 5 quoted); told note §4 added; the Niyamavali's Part 7 R10(B) engaged; the export's fields disclosed; F9's second cover key; three new `deferred-work.md` items for Task 0.5; quote fixes (C's cell, 4.7 AC2a, the told note's send commit). Numbers: next ledger after this line's `2026-11-26i`; decision `-508`. Then a fresh-context review of the PATCH diff: 1 HIGH / 7 MEDIUM / 10 LOW, all the pass's own, all applied — `how_details` no longer hints at a fix (⛔ "in the app yet"; it keeps the show-a-matching-ID instruction) and PQ1 (b)'s costs are even; `3.13-R1-W6` is a DEADLINE (no later than PQ1's sitting), ⛔ "the same sitting"; the reason → how-key map pinned as a literal; the 10.29 `setCategory` pin protected by a distinct identifier + a once-only pin; a wrongly reported living member losing the card moved from a told line to a confirm; DL9 recommends *"The app shows the member this reason."*; the push confirm's cost in our own words; the home-test grep restored; trap numbering, cross-references, the peer tip (`92f9d95e`). Row stays `ready-for-dev`. ⛔ Code, ⛔ decision id taken, ⛔ pushed. |
| 1.3 | 2026-11-26 | The Panel note WRITTEN at BigDev's ask (*"create a panel note separately in this story"*), before Task 0.2, and committed ALONE `ff89f047` — WRITTEN, ⛔ sent (Task 0.3). A fresh-context review of the draft (1 HIGH / 5 MEDIUM / 12 LOW) applied before commit, and its changes synced here: the Hindi `how_details` used अभी, which reads as "not yet" — now इस समय ("at this time"); the PQ1 (a) B / C rule swaps the sentence on ARRANGING it, ⛔ `how_details`' last sentence; the reason-⛔-the-note reading moved from a told line to a non-blocking confirm (iii); confirm (i) says what brings the card back (a finding that the member is alive, ⛔ a withdrawn claim); PQ1 (b)'s costs name the rulebook's correction right (counsel ⛔ asked). Words tables in the note and here compared cell by cell — identical; microcopy-clean. Row stays `ready-for-dev`. |
| 1.4 | 2026-11-26 | BigDev read PQ1's Hindi (all nine lines, shown in the session with the English): *"Hindi is ok"* — ⛔ change. Recorded in the note's status block (owed item (1) done) and Task 0.3. The words stay PROPOSED until the Panel rules. Row stays `ready-for-dev`. |
| 1.5 | 2026-11-26 | BigDev: *"put the private-note question in same routing note, this session will go first."* — `3.13-R1-W6` (may a member download the private note staff wrote about their check) is now Q3 of this story's Panel note (`c7e9e94b`, committed ALONE), its options, costs and reading kept as the separate note (`4a48c24d`, on `governance/panel-sitting-2026-11-26`, unsent, ⛔ edited) put them; recorded here as PQ2 (⛔ build change — A is built). Task 0.2's R1-W6 item answered; Task 0.3's owed list updated; `deferred-work.md` R1-W6 dated line written (Task 0.5's sub-item). The note stays WRITTEN, ⛔ sent; owed: the peer agenda's copy withdrawn or marked (BigDev's) and the words re-checked after 0.2. Row stays `ready-for-dev`. |
| 1.6 | 2026-11-26 | The Panel note said the wrong-detail gap *"is recorded as owed work"* (What is at stake) and *"Recorded in `deferred-work.md` as owed (Story 3.13a, Task 0.5)"* (E2) before any such item existed — a record ahead of its evidence ([[feedback_record_unattested_no_backfill]]). BigDev: *"write the deferred-work entry and fix both lines"* ⇒ `deferred-work.md` `3.13a-G1` WRITTEN (Task 0.5's wrong-detail sub-item; OPEN, unhomed, owner BigDev; observed and escalated, ⛔ planned). It quotes what binds a fix: `-109` row 2 (a recorded, staff-executed correction on a helpdesk ticket; ⛔ general profile editor; the correction-vs-falsification question un-analysed), `-424` Q2 (b)'s addition, the 21 November info line 6, DPDP Act s.12(2) and s.8(3) (counsel's to read) and the Niyamavali Part 10 (⛔ ratified). Re-verified: 10.21's `recordCorrection` RECORDS and ⛔ writes, so `applied` is ⛔ an honest outcome for a wrong name or date of birth. The note's two lines now name `3.13a-G1`; E4 gains its grep. ⛔ change to the questions, options, words or reading. The note stays WRITTEN, ⛔ sent. Row stays `ready-for-dev`. |
| 1.7 | 2026-11-26 | BigDev: *"yes add both to the note and commit"* — (1) `how_details`' last sentence *"If a detail you gave was wrong, it cannot be changed at present."* / *"…तो उसे इस समय बदला नहीं जा सकता।"* is REPLACED by *"If a detail you gave was wrong, ask for help here too."* / *"अगर आपका दिया कोई विवरण गलत था, तो उसके लिए भी यहाँ मदद माँगें।"* — the old line read as the Trust refusing a correction and gave the member no way to ask; a request made through the help request can be RECORDED by the Pariwar Admin (10.21's `recordCorrection`, `member.data_rights`; `-109` row 2), ⛔ applied (`3.13a-G1`). (2) DPDP Act s.12(2) and s.8(3) quoted beside the Niyamavali Part 10 in PQ1 (b)'s costs and the note's E3; `-109` row 2 added to the note's E1 and E2. PQ1 (b) (ii) / (iii) costs and the note's reading, words-check line, plain English, trust section, status block and E4 updated to match. Microcopy re-run on the new line in both languages (`checkTone`, `checkVocabulary` with the member terms, `checkNumerals`) — clean; note and story `how_details` compared cell by cell — identical. ⚠ BigDev's Hindi read (Task 0.3 item 1) is REOPENED for that one sentence. ⛔ build change beyond the one copy value (the key, the reason → how-key map and every AC stand). The note stays WRITTEN, ⛔ sent. Row stays `ready-for-dev`. |
| 1.8 | 2026-11-26 | BigDev read v1.7's changed Hindi sentence (*"अगर आपका दिया कोई विवरण गलत था, तो उसके लिए भी यहाँ मदद माँगें।"*, shown with the English): *"Hindi is ok"* — ⛔ change. Task 0.3's Hindi read DONE again; a dated line in the note's status block. The words stay PROPOSED until the Panel rules. Still owed before the note is sent: the peer agenda's copy withdrawn or marked (BigDev's) and the re-check after Task 0.2. Row stays `ready-for-dev`. |
| 1.9 | 2026-11-26 | BigDev: *"mark that this file come before"* ⇒ the peer agenda MARKED on `governance/panel-sitting-2026-11-26` (`041889ae`): a dated status line (this note goes before the sitting), item 9 and Part C's member-message line WITHDRAWN (kept as written), the separate private-note note (`4a48c24d`) marked DO NOT SEND. BigDev: *"Build questions as recommended"* ⇒ Task 0.2 DONE — DL1–DL12 on their recommended sides (DL5 ⛔ OpenAPI entry; DL6 the `isSuccess` render rule; DL8 preselect; DL9 (b) *"The app shows the member this reason."*; DL10 the whole card one button); a dated box under "Build decisions". Task 0.1's drift check run (⛔ F-fact moved; ⛔ rebase — records-only `f5c559d0`). The note re-checked against the answers — ⛔ word changed — and its status block says nothing more is owed before sending; its E3 line updated. Next: Task 0.1's numbers re-read, then 0.4 (the author-commit decision entry) before any code. Row stays `ready-for-dev`. |
| 1.10 | 2026-11-26 | ⭐⭐ The Panel RULED the note — [Decision 2026-11-26-508](../../.decision-log.md#decision-2026-11-26-508) (Trustee-ratified, DR + KB; relayed by BigDev: *"by DR and KB / Q1 A / Q2 (ii) / Q3 A / confirmed all three"*), committed ALONE (`978c2c11`) before these records. PQ1 (a) A, PQ1 (b) (ii), the words APPROVED as written (by reading — ⛔ change given), PQ2 A (counsel's half open), the three confirms. ⛔ build change. Records: the note's status and ruling block (the rest unedited); Task 0.3 ticked; a ruled box over "Panel question"; roster Row 57 (b) dated line (⛔ MET — built + device pass owed); `deferred-work.md` PQ2 (under `-501`), `3.13-R1-W6` (Panel half ruled A, counsel's half open) and `3.13a-G1` (trigger FIRED; the ruling accepts the gap as a cost, ⛔ rules it unfixable; homing it is BigDev's) dated lines. Next: Task 0.4 from `-509`, then 0.5's remaining items and 0.6, then code. Row stays `ready-for-dev`. |
| 1.11 | 2026-11-26 | BigDev: *"yes, write the 0.4 entry"* — Task 0.4 DONE: [Decision 2026-11-26-509](../../.decision-log.md#decision-2026-11-26-509) (author-commit, `659d9829`, committed ALONE before any `apps/` / `packages/` change; `-508` the highest id everywhere). DL1–DL12 as answered (DL5 ⛔ OpenAPI entry; DL6 the `isSuccess` render rule; DL8 preselect; DL9 (b); DL10 one button), built on `-508`; `-502` item 4 copied byte for byte; every other quote checked against its source. Next: Task 0.5's remaining items (Row 57 line, PQ2 line, the `3-14` and `3-16` items), 0.6 (the sprint row + the ONE ledger entry), then code. Row stays `ready-for-dev`. |
| 1.12 | 2026-11-26 | BigDev: *"yes, finish 0.5 and 0.6"* — Task 0.5 DONE (`3.13a-G2` → row `3-14`, `3.13a-G3` → row `3-16`, both re-verified on the code; the Row 57, PQ2, R1-W6 and G1 lines already written with `-508`'s records). Task 0.6 DONE: sprint row `ready-for-dev → in-progress`, ledger `2026-11-26m`, YAML parses. **Task 0 — Governance FIRST — is complete**: every `apps/` / `packages/` file may now be touched. Status → `in-progress`. Next: `bmad-dev-story 3.13a` (Task 1). |
| 1.13 | 2026-11-26 | `bmad-dev-story 3.13a` — Tasks 1–6 DONE: the domain read (`7afdf47e`), the contract / route / SDK (`533f3f69`), the home card + help-form preselect + the approved words + the friction row (`679c5c46`), the staff hint (`e1137251`). Unit job 37 / 37; live-DB job 24 / 24 on the story's own container; mobile 2596 / 2596; gates green. BigDev: GitHub CI *"At landing, after review"*. Deviations stated under Task 1 / Task 3 (3.13's fixtures for (f) / (g); the pure keys module; ⛔ `retry` on the hook; AC5's unreachable pre-load tap). Row 57 (b) and PQ2 dated lines; status `review`; ledger `2026-11-26n`. ⛔ Pushed. Nothing is live. |
