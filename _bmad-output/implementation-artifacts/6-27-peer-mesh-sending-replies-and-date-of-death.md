---
baseline_commit: 51b9000a
---

<!--
⭐⭐ MERGED 2026-10-12 as PR #277 (REBASE-merge, branch `story/6-27a-repin` → `main` at `9f63c537`) — THE SHA MAP for the v2.10–v2.12
re-pin, the `2026-10-12-324` routing note and ruling. GitHub's rebase-merge rewrote the 8 branch commits (on `main` `51b9000a`; PR head =
branch tip `cbe755be`) ONCE, although the branch already sat on `main`. The one citation of a branch SHA — `sprint-status.yaml`'s ledger
`2026-10-12i` (`3e1463a8`; grepped on `main` 2026-10-12, ⛔ no other file cites one) — is kept AS WRITTEN (the record); this maps every
commit to its `main` twin, PROVED ⛔ never assumed:
  · every pair has an identical subject AND an identical `git patch-id --stable` (8 / 8);
  · the merged tree is byte-identical to the PR head — tree `42129be0` both — which passed `ci:local` 36/36 (pre-push).
Negative control: a WRONG pair (the 1st branch commit vs the 2nd `main` commit) DIFFERS on the patch-id.
  · `3e1463a8` → `addb0adc`  story(6.27a v2.10): re-pinned to main 51b9000a after 6.30, 6.28 and 6.34
  · `b41c468f` → `13c0359a`  sprint-status: ledger 2026-10-12i — 6.27a re-pinned to main 51b9000a (v2.10)
  · `4bd23d9d` → `e12525dc`  governance(6.27a): routing note — answers while the special panel decides
  · `eed2e580` → `ea48e88f`  governance(6.27a): routing note — before sending, two facts added at BigDev's request
  · `645a25a4` → `451f6e5e`  governance(6.27a): routing note — 'usually within a day of filing' (unverified) replaced
  · `7128bdd0` → `fafec432`  governance(6.27a): 2026-10-12-324 — TRUSTEE-RATIFIED (DR + KB): option A
  · `80a271ba` → `8b9cf99f`  governance(6.27a): -324 applied — the routing note's ruling block (option A); story v2.11
  · `cbe755be` → `9f63c537`  story(6.27a v2.12): the v2.10 / v2.11 validate applied
Re-verify (bash): `diff <(git show <branch> | git patch-id --stable | cut -d' ' -f1) <(git show <main> | git patch-id --stable | cut -d' ' -f1)`
— ⚠ needs the branch SHAs, which survive only while `origin/story/6-27a-repin` (or a local copy) does.
-->

<!--
⭐⭐ MERGED 2026-10-10 as PR #268 (REBASE-merge, branch `governance/6-27-6-30-stories` → `main` at `9990cffa`) — THE SHA MAP for every commit
of Stories 6.27 (a–d) and 6.30's governance and story work. The 39 branch commits (from `5946e411`) were rewritten by the rebase; every
citation in this file, the other 6.27 files, 6.30's file, `.decision-log.md` and `sprint-status.yaml` is kept AS WRITTEN (the record) and
this maps it to its `main` twin, PROVED ⛔ never assumed: each pair has an IDENTICAL `git patch-id --stable` and an identical subject, and
the merged tree is byte-identical to the branch head (`df48e750`) — tree `43eb31f9` both. Negative control: a WRONG pair (the 1st branch
commit vs the 2nd main commit) DIFFERS.
  · `a05ce150` → `1cce7e5a`  story(6.27): created for dev (v1.2) — the five neighbours 
  · `61fb4744` → `b72677ff`  story(6.30): created for dev — a link in a text opens the 
  · `d62932a5` → `a4381ef5`  governance(6.27): routing note — option A's cost states th
  · `21715fcb` → `1d7d048d`  governance(6.27): 2026-10-10-303 — TRUSTEE-RATIFIED: the f
  · `d5789ffc` → `2c18d180`  story(6.27): v1.4 — the Panel's ruling (-303) applied: bot
  · `3c424bb0` → `27609982`  story(6.27): v1.5 — the neighbours' questionnaire (version
  · `f75adfae` → `5b5f2c41`  story(6.27): v1.6 — who sees the neighbours' answers: ever
  · `9905a1d0` → `e3553d7c`  story(6.27): v1.7 — the inspector is shown only discrepanc
  · `75453eeb` → `b2433ace`  story(6.27): v1.8 — the questionnaire engine is shared; ro
  · `7f5603ff` → `bc1ec53c`  governance(6.27): 2026-10-10-304 — TRUSTEE-RATIFIED: cause
  · `877e5864` → `cf5adf67`  story(6.27): v1.9 — the Panel's -304 applied: v2 of the ne
  · `fa2687ce` → `0281d449`  governance(6.27): 2026-10-10-305 — author-commit after the
  · `7987b0a9` → `220c6bfb`  sprint-status: 6.27 split rows (6-27b / 6-27d / 6-27c) and
  · `f5539827` → `f1855296`  story(6.30): v1.1 — the validate's findings applied: the p
  · `59e8d9e0` → `45d01fff`  story(6.27): v2.0 — split into 6.27a / 6.27b / 6.27d / 6.2
  · `5e664108` → `eeed1782`  story(6.27 v2.1, 6.30 v1.2): round-2 validate findings app
  · `af97dfd5` → `606694f7`  sprint-status: ledger 2026-10-10o — validate rounds 1–2 ap
  · `5bc4f97d` → `a51892c3`  story(6.27 v2.2, 6.30 v1.3): round-3 validate findings app
  · `dc89794c` → `a5864df6`  story(6.27 v2.3, 6.30 v1.4): round-4 validate findings app
  · `4eec8043` → `898d47a1`  story(6.27 v2.4): round-5 validate findings applied — 0 BL
  · `b1136116` → `f322ae6f`  story(6.27 v2.5): round-6 validate (0 BLOCKER / 0 HIGH — v
  · `9b35d3a2` → `01ee335f`  sprint-status: ledger 2026-10-10p — validate ends (round 6
  · `cb2dde39` → `632d7a82`  governance(6.27): 2026-10-10-306 — author-commit: the five
  · `c6c75e3b` → `f90ea219`  story(6.27 v2.6): the five are chosen by school (row 6-36,
  · `ce6a3e27` → `5c677398`  story(6.27): glyph-register fix in the v2.5 change-log row
  · `0a038a47` → `0f281ebc`  governance(6.27): 2026-10-10-307 — author-commit: workplac
  · `4c9fea19` → `b1c0b6c9`  sprint-status: ledger 2026-10-10r — 2026-10-10-307 (workpl
  · `a238f407` → `7cdacb54`  story(6.27 v2.7): PM1 and 6.27c's predecessor note read 20
  · `0627e581` → `a81f92fd`  governance(6.27): 2026-10-10-308 — author-commit: every ne
  · `513c84b9` → `46bed1fd`  governance(6.27): 2026-10-10-309 — author-commit: 'people 
  · `88749b6b` → `adf379ac`  sprint-status: ledger 2026-10-10s — -308 (answer source sh
  · `118f6913` → `add34fcd`  governance(6.27): 2026-10-10-310 — TRUSTEE-RATIFIED: CF1 A
  · `058fb7b1` → `b513e97b`  story(6.27 v2.8, 6.30 v1.5): the confirm statuses updated 
  · `b2e70128` → `d9c6feb4`  sprint-status: ledger 2026-10-10t — 2026-10-10-310 (the Pa
  · `b3ae7627` → `693e8761`  story(6.30): CF1 shown as confirmed by 2026-10-10-310 in t
  · `082ab743` → `3df45a54`  governance(6.27): 2026-10-10-311 — author-commit of 6.27's
  · `b3970886` → `56fcd235`  story(6.27 v2.9): -311 applied — PM1 replacement, PM2 in-a
  · `21e89ed6` → `b3a9476b`  governance(6.30): 2026-10-10-312 — author-commit of 6.30's
  · `df48e750` → `9990cffa`  story(6.30 v1.6): -312 applied — Tasks 0.2 / 0.3 done, bui
Re-verify (bash): for each pair, `diff <(git show <branch> | git patch-id --stable | cut -d' ' -f1) <(git show <main> | git patch-id --stable | cut -d' ' -f1)`
— ⚠ needs the branch SHAs, which survive only while `origin/governance/6-27-6-30-stories` (or a local copy) does.
-->

<!--
⭐ RE-PINNED 2026-10-12 (v2.10 — `bmad-create-story 6.27a` run on this EXISTING file; BigDev chose *"Re-pin to main"*) to `51b9000a`
(`origin/main` after 6.30, 6.28 and 6.34 merged; ⛔ no 6.27 code exists yet). `fa2687ce` is ⛔ not an ancestor of `main` — its twin is
`0281d449` (the SHA map above; identical code). Every `file:NNN` into code is now AS OF `51b9000a`, re-read by five read-only checkers
(domain; api + contracts; admin; jobs + mobile + channels; cross-cutting) and the author. ⛔ No PM, ruling or AC intent moved — the semantic
changes are dated annotations (*"re-pin 2026-10-12"*) at F12, F13, F17, F18, F29, F35, F41, PM8, PM23, PM9, PM10, PM11, PM13, AC4, AC5, Tasks 5 / 7,
Trap 5 and the new Trap 21. ✅ RULED (PM8): `2026-10-12-324` (Trustee-ratified, option A) — answers are taken
— and PM5 (iv) may still text a neighbour — while the special panel decides a claim that passed the month's vote; PM8's R9 arm stands as `-311` committed it (v2.11). ⚠ 6.27b / 6.27c / 6.27d were ⛔ not re-pinned (6.27b's PM10 summary still says "fourth
source") — THIS file is the record.
-->

<!--
⭐ RE-PINNED 2026-10-10 (v2.0, after the fresh-context validate) to `fa2687ce` on `story/6-30-app-links-open-the-app-from-a-text`
(= `main` `5946e411` + the 6.27 / 6.30 story and governance commits, incl. `2026-10-10-303`, `-304`, `-305`). The CODE is identical to
`5946e411` (`git diff --stat 5946e411 fa2687ce -- packages apps scripts infra` is empty). Every `file:NNN` is AS OF that code, verified by
four read-only validators (consistency + split; code claims; governance trace; 6.30 + the interface) and the author.
⚠ Before Task 1: `git diff --name-only 51b9000a..HEAD -- packages apps scripts infra` — re-read any cited file in that list.
⚠ BRANCH: this file's history (v1.3–v2.0) and `-303` / `-304` / `-305` live on `story/6-30-…`, ⛔ not on `story/6-27-…` (whose tip
`a05ce150` holds v1.2). ⇒ Task 0.0: rebase / fast-forward the build branch onto the governance tip (or onto `main` once these merge) and
`git fetch`; ⛔ never build from a branch where this file reads below v2.5 (the round-6 fixes).

⭐ STORY 6.27 IS FOUR STORIES (`2026-10-10-305` §2 item 1; BigDev: *"Four parts (Recommended)"*):
  · **6.27a — THIS FILE** (keeps the row key `6-27-peer-mesh-sending-replies-and-date-of-death` — the rulings cite it): the neighbours can
    ANSWER (the versioned questionnaire, the app screens, the helpline) and the District Admin SEES the answers.
  · **6.27b** — `6-27b-peer-mesh-warnings-wait-and-approvers-view.md`: the two warnings, the late wait, the correction queue, and every
    approver at their step sees the answers.
  · **6.27d** — `6-27d-inspector-discrepancy-at-completion.md`: the inspector is shown only differences, after completing their own record.
  · **6.27c** — `6-27c-peer-mesh-sending-texts-and-links.md`: SENDING — the texts, the link, the language. LAST.
  ORDER: a → (b ∥ d) → c; c also needs row `6-30` `done` AND row `6-36-peer-mesh-school-wise-selection` `done` (`2026-10-10-306`: the five are
  chosen from the member's own school — ⛔ never texted on 6.6's district choice); ⚠ 6.27a's Task 5 (the mobile screens) ALSO needs 6.30's route shell
  (`apps/mobile/app/(peer-request)/peer-request.tsx`, 6.30 AL16) MERGED (✅ met — row `6-30` `done`, re-pin 2026-10-12) — the rest of 6.27a does ⛔ not. b, c, d stay `backlog` until their
  predecessors are `done` (the 6.21b / 6.23b / 6.24b / 6.26b precedent). ⭐ Sending last turns every go-live coupling into merge order: by the time a real text goes out, the warnings
  and the wait (b), the approvers' view (b) and the inspector's independence (d) already exist.
⭐ THE RECORD: this file holds the ONE shared decision block PM1–PM25, the rulings, the invariants, the FOUND facts and Task 0 (shared by all
four). Each PM is tagged **[a]**, **[b]**, **[c]**, **[d]** for the part that builds it. Where a summary in b / c / d and THIS file disagree,
THIS file is the record (the 6.26a / 6.26b precedent).

STATUS: `ready-for-dev` — ✅ Task 0's governance is DONE: the Panel's rulings (`-303`, `-304`, `-310`), the validate's corrections and
BigDev's calls (`-305`–`-309`), and PM1–PM25 COMMITTED ALONE as `2026-10-10-311` (`082ab743`) — all as written EXCEPT PM1 (a skipped neighbour
is REPLACED) and PM2 (also an IN-APP ALERT), applied below. 6.27a may be built (its Task 5's 6.30 dependency is ✅ met — row `6-30` `done`)
([[feedback_governance_commits_precede_implementation]]).
The Panel confirm note (`…-6-27-confirms.md`, CF1–CF5) is ✅ RULED — `2026-10-10-310` (all five as suggested).

⭐ §0 gate (template `trustee-panel-routing-note-TEMPLATE.md`): the Panel's questions are RULED — Q1 / Q2 (`-303`), Q3–Q8 (`-304`), PM8's R9 arm (`-324` A, 2026-10-12); the
corrections and the CF1 narrowing are recorded (`-305`) and CONFIRMED by the Panel (`-310`: CF1 A, CF2, CF3 (a)–(d), CF4 A, CF5 A). Every PM strips to "the code should do X". ⚠ A PM BECOMES
the Panel's if the build (i) shows a neighbour's answer — or who answered — to the FAMILY or the PUBLIC, directly OR BY PARAPHRASE (the
inspector asks the family open-ended, ⛔ never *"a neighbour said …"* — `-305` §2 item 3; FR-39's *"verifier names are published"* stays
unruled, 11b.3b `verifierName`), (ii) says MORE in the text than the ruled wording (a claim, money, the family, the nominee, who reported
it, a deadline), (iii) lets a neighbour's answer REFUSE a claim or stand in for the ground inspection (FQ9 / FQ10 A), or (iv) lets a
question added through the `-304` chain become a warning or a flag, or adds an alcohol question (CF3 (b), (c)). Traps 1–3 fence all four.

GLYPH REGISTER, ADDRESSING RULE: as 6.24a / 6.24b / 6.25 / 6.29 — `⛔` sits ONLY on a negation word · `⭐` = key fact / action · `⚠` =
hazard. ⛔ No `file:NNN` into `.decision-log.md`, `deferred-work.md` or `sprint-status.yaml` (newest-first files — cite entry id + clause,
item heading, row key). `file:NNN` is used ONLY for code.
LETTERS: `PM` = this story's build decisions (the author's, PROPOSED — answered at Task 0.3, committed at Task 0.4); `F` = FOUND facts;
`Q1`–`Q8` = the two routing notes' Panel questions; `CF1`–`CF3` = the confirm note's. Foreign letters cited: `NW` / `EA` (6.23a/b,
`-278`), `GI` (6.26, `-282`), `RF` (6.24a, `-292`), `RB` (6.24b, `-295`), `RE` (6.25, `-299`), `RN` (6.29, `-302`), `AL` (6.30). `PM` is
used by ⛔ no earlier story (grepped 2026-10-10).
-->

# Story 6.27a: The Five Neighbours Can Answer — a Versioned Questionnaire in the App and by the Helpline, Saved as They Go, and the District Admin Sees Every Answer `[SURFACE]`

Status: done

> ⭐⭐ **WHAT STORY 6.27 IS, IN ONE PARAGRAPH.** Story 6.6 (`done`) chooses the five members nearest a member who has died and writes a
> request for each — and ⛔ nothing ever sends it, ⛔ nothing can answer it, so **every claim ends its 72 hours with zero answers**
> (`2026-09-28-263`'s FINDING). Story 6.27 makes the check with neighbours real: each of the five is **texted** with a link and the helpline
> (`-303` Q1 A — 6.27c), answers **a few short questions** in the app or by phoning the helpline, saved as they go (`-304` Q6 A — 6.27a),
> and the District Admin and every later approver **see the answers** (6.27a / 6.27b). Two answers become **warnings** under the ONE rule
> 6.23a built (`-264` FQ12): a neighbour saying the member **has not died**, and a date **more than a day** from the accepted
> certificate's (`-263` FQ10 A) — and one that arrives after the District Admin approved makes the final approval **wait** for the
> District Admin (`-303` Q2 A — 6.27b). The inspector, after completing their own record, is shown only where the family and the
> neighbours DIFFER (6.27d). ⭐ **A neighbour's answer never refuses a claim, and ⛔ never stands in for the ground inspection.**

> ⭐ **THIS PART (6.27a):** the neighbours can answer — the versioned questionnaire engine (v1 and the ruled v2), the database for replies
> and answers (and the ping columns 6.27c will write), the save / submit writer, the member screens and routes (DARK until 6.27c texts
> anyone — PM11), the helpline's recording for a neighbour who phones, and the District Admin's view in the verifier console. ⛔ No text
> is sent, ⛔ no warning is raised, ⛔ no inspector screen changes in this part.

> ⭐ **What already ships and 6.27 READS or EXTENDS — rebuild ⛔ none of it:**
> · **6.6's substrate** — `claim_peer_mesh_selections` / `claim_peer_mesh_pings` (0054), the pure `selectPeerMesh`, the SELECT / WINDOW
>   workers `apps/jobs/src/claim-peer-mesh.ts`, the writer `recordPeerMeshResponse` (`packages/domain/src/claim/peer-mesh-persist.ts:222`),
>   the reads `peer-mesh-read.ts`. The selection is ⛔ not changed (determinism, replay — Trap 8).
> · **6.24b / 6.29's SMS discipline** (6.27c) — `sendClaimDltSms` (`apps/jobs/src/scheduler/claim-dlt-sms-send.ts:100`) UNCHANGED in its input (since 6.34 a final may carry `helplineNotCallbackNumber: true` and the caller logs ONE `helplineNotCallbackNumberWarning`, `:64` — `-322` C1 / `-323` R1); 0151 /
>   0155, `packages/domain/src/claim/suspicion-notice.ts`, `apps/jobs/src/scheduler/claim-suspicion-notices.ts` as the DESIGN TEMPLATE.
> · **6.23a / 6.23b / 6.26b's warnings** (6.27b) — `packages/domain/src/claim/approval-warnings.ts`: TWO KINDS added, ⛔ never a rule.
> · **6.10's console** — `assemblePeerMesh` (`apps/api/src/modules/claims/claims.verifier-console.handlers.ts:800-831`) and `PeerMeshView`
>   (`apps/admin/src/modules/claim-verification/SignalsPanel.tsx:207-241`).
> · **6.26a's inspection** (6.27d) — `completeGroundInspection` (`packages/domain/src/claim/ground-inspection-persist.ts:919-1044`), the
>   screen `apps/admin/src/modules/ground-inspection/GroundInspectionPage.tsx`.
> · **10.15's Polls** member route conventions (`apps/api/src/modules/surveys/member-routes.ts:67,83` — ⛔ never its engine: it forbids
>   conditions and locks at publish by design, its LBD-4 / LBD-5) and **6.3's helpline chain** (`apps/api/src/modules/claims/claims.helpline.routes.ts`).
> · **Row 6-30** (6.30) — the app-link plumbing 6.27c consumes: `APP_LINK_PATHS` (`packages/contracts/src/app-links/paths.ts:54`, read from the data file `app-link-paths.json`),
>   `buildAppLinkUrl` (`paths.ts:90`), `parseAppLinkCode` (`paths.ts:112`), the shared validator `resolveHttpsOrigin` (`apps/jobs/src/scheduler/staff-email-config.ts:112`), and a THIN ROUTE SHELL `apps/mobile/app/(peer-request)/peer-request.tsx`
>   that 6.27a FILLS (PM11) — ✅ MERGED; 6.30 also shipped the placeholder `apps/mobile/components/peer-request/PeerRequestSlot.tsx` and the group `app/(peer-request)/_layout.tsx`, both pinned by its tests (Task 5).

> ⚠⚠ **SEVEN FACTS — read before anything else.**
> 1. ⭐ **Members cannot be notified in the app** — ⛔ no device token is ever registered (`apps/mobile/lib/push-notifications.ts` has
>    ⛔ no importer), ⛔ no member inbox; the app still carries the P0 prototype identity outside a `production` build (`apps/mobile/app.config.ts:46-51`) and, since 6.30, reads ONE incoming URL — `/peer-request?c=<code>` (parsed at `app/(peer-request)/peer-request.tsx:21`). ⇒ the five are
>    reached by a TEXT with a link (6.27c), the app shows requests by PULL, and the helpline is the second way in. Row 6-30 builds the
>    link plumbing; it does ⛔ not decide the app's production identity — that stays BigDev's decision (D-13 / PRD OQ-1, `-305` §2 item 5).
> 2. ⭐ **The Panel has ruled everything 6.27 asks of a person:** the text and its reminder (`-303` Q1 A), the language rider (`-303`;
>    narrowed for a time by `-305` §2 item 2 ⇒ CF1), the late wait (`-303` Q2 A), the questions (`-304` Q3–Q6), and who changes them
>    (`-304` Q7 / Q8 — the Panel's own chain).
> 3. ⚠⚠ **Today a reply is refused the moment it matters.** `recordPeerMeshResponse` throws `PeerMeshClaimNotInVerificationError` once
>    the claim leaves `verification_in_progress` and `PeerMeshWindowResolvedError` once the 72 hours resolve (`peer-mesh-persist.ts:222-279`)
>    ⇒ PM8 widens the acceptance to every state in which an approval is still to come.
> 4. ⚠⚠ **"More than a day" cannot be one index comparison.** The warning module never decrypts (fence:
>    `packages/domain/tests/claim/nominee-name-no-comparison-fence.test.ts:345-353`); 6.26b compares dates as keyed-INDEX EQUALITY
>    (`deathDateComparison`, `approval-warnings.ts:209-228`). ⇒ PM7 stores the keyed indexes (`text`) of the neighbour's date AND the day
>    before AND the day after; 6.27b's key is present ⇔ the accepted certificate's index is none of the three.
> 5. ⚠ **The 6.6 reply vocabulary conflates two answers** (`response: confirmed | denied | unknown`, `packages/domain/src/claim/events.ts:157-161`)
>    ⇒ the questionnaire separates *"they have not died"* from *"I don't know"*, and maps onto the event so that `denied` ⇔ *"has not
>    died"* ONLY.
> 6. ⚠⚠ **`@twt/domain` cannot import `@twt/contracts`** (`packages/domain/package.json` has ⛔ no `@twt/contracts`; contracts depends on
>    domain; the RN bundle boundary, `packages/contracts/src/index.ts:170-171`) ⇒ the questionnaire ENGINE lives in a pure, pg-free DOMAIN
>    module; contracts mirrors only the wire shape, with a test-only lockstep (the `APPROVAL_WARNING_KINDS` pattern) — PM23.
> 7. ⚠ **The app has ⛔ no language setting** (`LocaleProvider`, `packages/i18n/src/react.ts:30-40`, an in-memory state mounted with ⛔ no
>    initial locale at `apps/mobile/app/_layout.tsx:93` ⇒ always `hi`; ⛔ no `setLocale` call anywhere in `apps/mobile`) ⇒ texts go in the
>    Pariwar's default language until row `6-35-in-app-language-switch` lands (`-305` §2 item 2; PM22).

## Story

As **one of the five members the Trust asks about a reported death** —
I want **to answer a few short questions in a minute, in the app or by phoning the helpline, with every answer saved as I go**,
so that **the Trust hears from people who knew the member before it pays a family —**

and as **the District Admin** —
I want **to see each neighbour's answers on the claim**,
so that **I can weigh them beside the ground inspection — ⛔ never as a reason to refuse a family on a neighbour's word alone.**

## The rulings 6.27 builds (shared by 6.27a–d)

| Ruling | Key (verbatim, abridged) | Status |
|---|---|---|
| `-263` FINDING + Consequence 2 | 6.6's requests are ⛔ never sent, ⛔ cannot be answered, staff ⛔ cannot see answers ⇒ row 6-27: *"send the five requests (the wording, en + hi), a reply screen for the five, record replies through `recordPeerMeshResponse`, show them to staff …, and FQ8 E, with FQ10's warnings"* | ⚠ a recorded FINDING and an author consequence INSIDE a Trustee-ratified entry — the Panel ruled FQ9–FQ11 |
| `-263` FQ10 A | the check with neighbours is a SIGNAL, ⛔ not a gate; *"a reply of 'they have not died', or a date that differs (FQ8 E), is shown to the District Admin as a warning"*; *"the neighbours can ⛔ never block a claim on their own"* | ⭐ Trustee-ratified |
| `-262` FQ8 E | the five are also asked *"If you know, on what date did they die?"*; the District Admin is shown answers that differ from the certificate by **more than a day** | ⭐ Trustee-ratified |
| `-264` FQ12 | ONE rule for every warning — incl. the neighbours' date and *"a neighbour saying the member has not died"* | ⭐ Trustee-ratified |
| `-277` Q2 C / Q3 B | every approver gives a reason and a note; a late warning makes the final approval wait for the District Admin | ⭐ Trustee-ratified |
| `-261` C3 | the true nominee's refile inherits the ground inspection — *"and nothing else carries over (… the checks with neighbours …)"* | ⭐ Trustee-ratified ⇒ ⛔ no inherited neighbour key (Trap 7) |
| `-279` A6 + Consequence 2 | a new warning kind enters the wait only by a decision; row 6-27 *"decides or routes that"* | author-commit ⇒ **DISCHARGED** by `-303` Q2 A (its Consequence 1) |
| **`2026-10-10-303`** Q1 A | each of the five is texted, naming the member, with a link and the helpline, ⭐ **plus one WhatsApp reminder after 48 hours** to those who have ⛔ not answered and chose WhatsApp (row 6-31); ⭐ **rider:** *"Send Text in Hindi to those whose preferred langauge is Hindi and in English to those whose preferred language in English"* | ⭐ Trustee-ratified |
| **`2026-10-10-303`** Q2 A | a neighbour's late warning makes the final approval wait for the District Admin's reason and note — ⛔ never a refusal; ⛔ no answer is taken once the final approval has been given | ⭐ Trustee-ratified |
| **`2026-10-10-304`** Q3 A | neighbours are asked *"How did they die?"* — *"shown to staff **as context only — ⛔ never a warning, ⛔ never a flag on its own**"*; *"the **inspector asks the family the same question**, so the inspector is shown only where the two differ"* | ⭐ Trustee-ratified |
| **`2026-10-10-304`** Q4 A | after *"illness"*, *"Do you know which illness?"* — *"**context only, ⛔ never compared automatically with the member's medical declaration; counsel confirms the legal basis before go-live**"*; the inspector asks the family the same | ⭐ Trustee-ratified |
| **`2026-10-10-304`** Q5 A · Q6 A | ⛔ no alcohol question · the text says *"a few short questions"* (amends `-303`'s "two"), three questions added, and the closing note as put | ⭐ Trustee-ratified |
| **`2026-10-10-304`** Q7 / Q8 | *"Pariwar Admin proposes, State Trustee proposes/approves with/without modification. Super Admin make it live for one pariwar/all pariwar with/without modification. Superadmin can add question directly and make it live. No additional Permission required for Superadmin."* — for the neighbours' AND the inspector's questions | ⭐ Trustee-ratified (the Panel's own chain — ⛔ not our reading) — row 6-33 builds it |
| `-303` reading (*"preferred language = the language chosen in the app … shown to the Panel"*) | — | ⚠ OVERTAKEN: never shown; the app has ⛔ no language choice (`-305` §1 (a), (b)); the "TWO questions" part overtaken by `-304` Q6 A |
| **`2026-10-10-305`** | corrections §1 (a)–(c); calls: the four-part split; texts in the Pariwar's default language until row 6-35 (⚠ a temporary narrowing ⇒ CF1); the inspector asks the family open-ended; the text goes while an answer can still be taken; rows 6-34 / 6-35; roster Rows 27 / 28 / 29 reserved | author-commit (BigDev) |
| `-304` readings (CF3) | EVERY ruled question (the seven v2 keys) is in every `peer_mesh` version from v2 onward (v1 exempt); a chain-added question is ⛔ never a warning or a flag; an alcohol question needs Q5 superseded first; every health question needs counsel's basis before it is shown — ⇒ the TEXTS themselves wait for Row 27 (f); a health question added LATER through the chain HOLDS that Pariwar's texts until its `counselBasis` is recorded (6.27c AC2b; ⚠ a cost row 6-33 must state) | ⭐ Trustee-ratified — `2026-10-10-310` CF3 (a)–(d); the VALIDATOR enforces them (PM23) |
| `-282` GI7 · `-281` Q1 B | the two precedents for a kind entering the wait | precedent |
| `-295` RB4 / RB5 / RB11 / RB12 / RB16 · `-302` RN2–RN8 | one send core, ⛔ never copied; the mode-resolved name or `no_target`; go-live rows; a held config never uses up the slot; the deadline-word deny-list; 0155's backstops | author-commit — the TEMPLATE (6.27c) |
| `-292` Consequence 4 · `-282` Consequence 4 | rows 6-24 / 6-25 / 6-27 share the gate and writers — *"whichever lands second rebases; ⛔ none drops another's check"* | ⭐ every sibling is `done` ⇒ 6.27 rebases onto all; row 6-28 (one payment per death) joins the list (Trap 5) — ✅ `done`; what it changed is in Trap 5 (re-pin 2026-10-12) |

**⛔ Not covered by any ruling (stays open, ⛔ not built here):** whether the family or the public ever sees who answered or what they said
(FR-39 / FR-77 — unruled, 11b.3b `verifierName`); FR-39's *"non-response after 72 hours → escalate to block admin"* (⛔ not built, ⛔ not
superseded — PM19); what an approver must weigh under a neighbour's warning; counsel's legal basis for health information from neighbours
(`-304` "does NOT cover" — Row 27 (f)) and from the family (row 6-32's own row); Meta's approval of the WhatsApp wording (`-303` — row 6-31);
the Hindi of staff-added questions (`-304` — our reading: a person reviews it before it goes live); whether a Pariwar's version may drop a
ruled question (`-304` — our reading ⛔ no, CF3 (a)); whose data an answer is on the RESPONDER's side, for erasure (PM17).

⚠ **HISTORICAL — the "Re-plan by answer" branches of v1.0–v1.9** (Q1 B/C/D, Q2 B/C) are ⛔ no longer live: the Panel took Q1 A and Q2 A.
They are kept only in the git history of this file.

## ⭐ THE INVARIANTS (shared)

1. **A neighbour's answer never refuses a claim and never replaces the inspection.** Each warning kind (6.27b) is a condition on the FORM
   of an approval (a reason + a note) or a WAIT; ⛔ never a denial, ⛔ never a gate conjunct, ⛔ never read by `assertGroundInspectionCompleteForApproval`.
2. **ONE rule, ONE derivation** — two kinds; the assertion is ⛔ never edited (NW1); both warning readers share the pure derivation and ONE
   SQL fragment that selects codes and indexes only.
3. **⛔ No decrypt in the warning module** — keyed indexes and plaintext codes only.
4. **The selection is ⛔ not changed.** A peer 6.27c will ⛔ not text is recorded as such on its ping, ⛔ never replaced.
5. **Texted at most once; ONE reply per ping; answers editable until Submit, then locked; every change kept.** At-least-once delivery is
   RECORDED, ⛔ not hidden (RB3); an edit appends a row and stamps the old one superseded.
6. **⛔ No PII in an event, a log, an alarm, an audit row or a `detail`** — the date, the cause and the illness are Tier-1; the link code is
   treated like a number; audit carries codes and counts only (NW12, GI14).
7. **Who sees the answers** (PM13, PM24, PM25; corrected by `-305` §1 (c), confirmed in CF2): the District Admin (and the district's
   verifiers) — every answer for their district; whoever approves the claim at a later step — in v1 a **Pariwar Admin acting as
   Trustee-Lite** (the final vote, an R9 vote, the escalation, the no-correction approval) or the **Super Admin** (G1) — every answer, for
   that claim at that step only; the INSPECTOR — ⛔ nothing before completing their own FULL visit's record, then only THAT the family and a neighbour differ, per question —
⛔ never the neighbour's answer itself, ⛔ never who (6.27d); the
   HELPLINE OPERATOR — only the answers of the neighbour on the phone, while recording. ⛔ NEVER the family (directly or by paraphrase),
   the claimant, the nominee, the other neighbours, any other member, or a public page (Trap 1).
8. **An unknown is ⛔ never shown as "no warning"** (6.18's fail-closed rule): a failed warnings read makes each answer's warning flag
   `null` (*"could not be checked just now"*), ⛔ never `false`; a failed decrypt shows *"could not be shown just now"*, ⛔ never a blank.
9. **Every lock is taken in ONE order: the claim row, then the ping row, then the reply row** (PM7 (b)) — the order 6.26a's writers use
   (assignment → claim → …) never meets it in reverse. ⭐ `recordPeerMeshResponse` takes the claim lock ITSELF (`lockClaimCase`) before its
   ping lock — STRUCTURAL, ⛔ never a caller convention. ⛔ No KMS inside any of these locks: every encrypt and keyed index is computed in
   the HANDLER first, and the domain writer receives ciphertext and indexes (Trap 9).

## 📜 Policy meaning (AI-10-1)

⭐ **Story 6.27 ADDS two conjuncts to an existing benefit-gating predicate** (the approval-warning rule — built by **6.27b**) — conjuncts
on the FORM an approval must take (a reason + a note) or a WAIT, ⛔ never a conjunct of the approval GATE (Invariant 1, Trap 3). In the
member's terms:
- **P1 (`peer_says_not_died`):** *"If one of the members the Trust asked about a death answers that the member has not died, anyone
  approving the family's claim must choose a reason and write a note; and if that answer arrives after the District Admin approved, the
  claim waits until the District Admin has done so — a neighbour's answer never refuses the claim."* — `-263` FQ10 A + `-264` FQ12 +
  `-303` Q2 A: ✅ consistent.
- **P2 (`peer_death_date_differs`):** *"If one of the members the Trust asked gives a date of death two or more days away from the date on
  the certificate the Trust accepted, anyone approving the family's claim must choose a reason and write a note, with the same wait —
  never a refusal."* — `-262` FQ8 E + FQ12: consistent; ⚠ *"two or more days"* is OUR reading of *"more than a day"* (disclosed to the
  Panel in the first routing note's "ours" list).
- **6.27a adds ⛔ no predicate:** it lets neighbours answer and lets the District Admin SEE; PM8 changes WHEN a neighbour may answer, ⛔ not
  who may be paid. **6.27c adds ⛔ no predicate** (who is texted changes ⛔ nothing about who may be paid). **6.27d adds ⛔ no predicate**
  (the inspector's discrepancy screen asks a question; it gates ⛔ nothing).
- **Q3 / Q4 (the cause of death, the illness) add ⛔ no predicate** — ✅ ruled A (`-304`), verbatim: Q3 *"shown to staff as context only —
  ⛔ never a warning, ⛔ never a flag on its own"*; Q4 *"context only, ⛔ never compared automatically with the member's medical declaration;
  counsel confirms the legal basis before go-live"* — ⚠ OUR reading adds that neither creates a WAIT; and a question added later through the chain is ⛔ never a warning or a flag either — the VALIDATOR refuses it (PM23 (a)), so the
  chain can ⛔ never create a benefit-gating predicate (CF3 (b)).
- **Niyamavali check:** §6.2 (*"The Trust verifies the qualifying event …"*) — consistent; ⛔ no clause mentions neighbours or the peer
  mesh (grepped `docs/legal/niyamavali.md` 2026-10-10); §5.1 / §5.5 / §5.6 (cause of death, suicide / murder, concealment) are ⛔ never read
  by any 6.27 comparison (PM25 fence); the Niyamavali is ⛔ not ratified ([[feedback_niyamavali_rulebook_not_spec]]).

## ⭐ FOUND FACTS (shared; each ⇒ the PM it feeds; verified at `5946e411` code)

**6.6's substrate:**
- **F1 — the five are opaque member ids.** `selected_member_ids uuid[]` (CHECK `cardinality <= 5`); one `claim_peer_mesh_pings` row per
  (selection, member) — `ping_id`, `selection_id`, `pariwar_id`, `member_id`, `message_key` (default `'peer_mesh_verification_request_v1'` —
  the constant `schema/claim_peer_mesh_pings.ts:31`, the column default `:56`), `constructed_at`; `UNIQUE (selection_id, member_id)`; ⛔ no dispatch columns (0054 `:64-72`) ⇒ PM4.
- **F2 — the delivery columns are PRE-AUTHORISED here** (`schema/claim_peer_mesh_pings.ts:8-13`, D1); its *"There is still NO live
  `dispatch()` caller anywhere"* (`:9-10`) is STALE (`contribution-notify.ts:246`, `claim-correction-reminders.ts:600`) ⇒ PM4, PM18.
- **F3 — "nearest" = same latest posting district, then nearest `created_at`, then `member_id`** (`peer-mesh-metric-registry.ts:65,113`);
  candidates = every `members.state='active'` member except the deceased and the claimant (`peer-mesh-read.ts:77-105`; the
  correlated-subquery comment ~`:60-75` — ⛔ never "simplify" it, [[project_epic6_drizzle_correlated_subquery_bug]]). A suspended member CAN be
  chosen (`member/moderation/index.ts:22`); a member who has died stays `active` ([[project_death_is_an_overlay_not_a_state]]) ⇒ PM1.
- **F4 — the window runs from SELECTION** (`apps/jobs/src/claim-peer-mesh.ts:46,226`; `boot.ts:172-176`); the WINDOW worker resolves
  `sufficient` (≥ 3 distinct responders, `:49`) or `insufficient_responses_fallback` (monotonic), counting responders by the PAYLOAD's
  `responder_member_id` (`peer-mesh-read.ts:212-219`) — so a helpline-recorded answer counts the neighbour ⇒ PM6, PM12.
- **F5 — `claim.peer_mesh_pinged` is the ONLY edge into checking** (`state.ts:131-133`) and 6.19d's day-0 anchor (CR3,
  `certificate-reminder.ts:132-169`) ⇒ PM5, PM14 (⛔ never a second pinged event).
- **F6 — the SELECT worker takes injected hooks** — the 6.12 shepherd precedent: the call `claim-peer-mesh.ts:346-356` (also on the
  idempotent no-op branch, `:341-356`), boot wiring `boot.ts:483-505` (`enqueueShepherdAssign` at `:491`); the select result carries ⛔ no
  ping ids (`:310-319`) ⇒ PM5.
- **F7 — `recordPeerMeshResponse`** (`peer-mesh-persist.ts:222-279`): a raw `pg.PoolClient`; refuses ⛔ no selection, a non-selected
  responder, a resolved window, a claim ⛔ not in `verification_in_progress`, a second answer (`SELECT … FOR UPDATE` on the PING row only,
  `:245-253`); hard-codes `from_state` / `to_state` = `'verification_in_progress'` (`:269-270`) and `actor: 'member'`, `actorId` =
  responder (`:276`); then `projectClaimState` reads the stream head, inserts `eventVersion = head + 1` and UPDATEs `claims.current_state`
  ⇒ PM7, PM8 (⚠ the lock-order hazard — F31).
- **F8 — the event payload** `requireIdentityTransition({ ...auditShape, responder_member_id, response })` (`events.ts:157-161`; `auditShape`
  `:82-92`; `requireIdentityTransition` `:98-103` refines only `from_state === to_state`; `claimActorSchema` admits `'operator'`, `:61`) ⇒ PM7, PM12.
- **F9 — the operator affordances exist only as functions** (`claim-peer-mesh.ts:458-478`; `peer-mesh-persist.ts:325-375`) ⇒ PM19.
- **F10 — a refile gets a FRESH selection** — usually the SAME five ⇒ PM1, Trap 7.
- **F11 — the zero-candidate stall** (`claim-peer-mesh.ts:249-264`) ⇒ PM20.

**6.10's console:**
- **F12 — the transcript has ⛔ no outcome, window, skip reason, name, time or date** (`packages/contracts/src/claims/verifier-console.ts:151-188`);
  the UI prints raw UUIDs (`SignalsPanel.tsx:207-241`); `verifierAnnotations` hard-coded `not_available_yet` (handlers `:825`; a `present`
  variant REJECTED by `packages/contracts/tests/claims-verifier-console.test.ts:255`); `VERIFIER_CONSOLE_MAX_READS = 23` (handlers `:207`; 6.28 OP14 (a) 21 → 22, OP14 (b) 22 → 23; pinned `toBe(23)` at FOUR sites — `verifier-console.spec.ts:1135`, `verifier-console-ground-inspection.spec.ts:219,349`, `suspicion-refusal-routes.spec.ts:483`);
  `VerifierConsolePacket.peerMesh` is REQUIRED (`verifier-console.ts:508`, variants `present | empty | unavailable`); since 6.28 the packet also REQUIRES `otherClaimsForDeath` (`:522`) and `finallyApprovedElsewhere` (nullable, `:528`) ⇒ PM13, PM25 (c).

**The warnings machinery (6.23a / 6.23b / 6.26b):**
- **F13 — the kinds list and its pin.** `APPROVAL_WARNING_KINDS` (`approval-warnings.ts:101-118` — SIX kinds since 6.28 appended `other_claim_for_death`, `:116`); pinned by
  `packages/domain/tests/claim/approval-warnings.test.ts:56-70` with a GENERIC message (`:60-62` — *"its producer row decides or routes that
  before extending this list"*; the row-6-27 mention is in the module header, `approval-warnings.ts:16-17`); contracts mirror
  `verification-decision.ts:128-138` (incl. `'other_claim_for_death'`, `:135`), lockstep `packages/contracts/tests/claims-verifier-decision.test.ts:225-229` ⇒ PM9.
- **F14 — two readers, one pure derivation** (`:434`, `:575`, `:587`, `BULK_READ_SLICE` `:559`, `deriveClaimApprovalWarnings` `:746-820`;
  `deathFactColumnsSql()` `:379-425`; the pattern helper `deriveDeathFactWarningKeys` `:253`; `current_accepted_date_index` is `text` on
  `RawWarningsRow`) ⇒ PM9.
- **F15 — lateness is set membership, ⛔ never a timestamp** (`lateWarningKeys` `:944-947`): a key present at approval is covered for
  good ⇒ the SUBJECT is a ruling-sized choice (6.26b Trap 16) ⇒ PM9 keys each kind by the LIVE `answer_id` — a changed answer is a NEW key.
- **F16 — the wait has ⛔ no per-kind filter** (`:830-844`, `:907-917`) ⇒ a new kind enters the wait by construction (`-303` Q2 A rules it).
- **F17 — the correction queue's late arm** (`correction-queue-read.ts:161-194` — FOUR sources since 6.28 OP5 added (4) `otherOpenClaimForDeathExistsSql`, `:192`; scan states `:54`; the R9 arm `:252`) ⇒ PM10.
- **F18 — the gate order** (`nominee-name-check.ts:408-443`, the wait LAST at `:442`; since 6.28 OP2's `assertNoOtherFinalApprovalForDeath` sits between RF5 and the wait, final step only, `:435-440`) ⇒ ⛔ no new conjunct.
- **F19 — the cycle-freeze commit ⛔ never re-reads warnings** (`commitCycleFreeze`, `state-trustee-decision-persist.ts:1245`, comment
  `:1326`) ⇒ PM8 closes acceptance at the final vote (`state_trustee_freeze → state_trustee_approved`, `:585,644`) — EXCEPT
  under a live R9 routing, where R9 finalize still runs the gate (PM8's answer window).
- **F20 — the revise lock** (`verifier-decision-persist.ts:668-673` — a revise is refused when `warnings.coverage.records.length > 0 ||
  warnings.kinds.length > 0`) ⇒ ANY current neighbour key (⛔ not only a late one) makes the District Admin's approval unrevisable —
  RECORDED, ⛔ not changed.
- **F21 — a late DATE key is reachable through a certificate re-review** (`-289` L5(f)); the queue's determination arm already fires (GI7).
- **F22 — the console's kind words are typed** (`apps/admin/src/modules/claim-verification/i18n-en.ts:138-153` — six kinds incl. 6.28's `other_claim_for_death`, `:152`; renderers
  `VerificationDecisionStrip.tsx:342,427`, `LaterApprovalWarnings.tsx:89`; `apps/admin/tests/verifier-console.test.tsx:415` forbids a date);
  the admin console is English-only ⇒ PM9, PM13.

**Sending, mobiles, the app, the API, the gates:**
- **F23 — the send core** (`claim-dlt-sms-send.ts:100`, classification `:144-159`; `INVALID_ARGUMENT` is final `error` + alarm since 6.29,
  `:117-125`) ⇒ PM2, PM16.
- **F24 — 0151 is the wrong home** ⇒ PM4 puts the record on the ping row.
- **F25 — a member's mobile:** `member_identities.mobile_ciphertext` (`schema/member_identities.ts:45`), `waOptIn.getMemberMobileCiphertext`
  (`wa-opt-in/read.ts:118`), `decryptMobile` (`encryption/member-fields.ts:137`), `normalizeMobile` (`:92`); erasure writes an ENCRYPTED
  sentinel (`member/anonymize.ts:77,156`); `resolveSmsTarget` (`notifications/delivery.ts:157-175`) does ⛔ not normalise; the number hash is
  `claim.correctionNumberHash` (`claim/correction-crypto.ts:58`) ⇒ PM1, PM13.
- **F26 — members have ⛔ no locale column**; 6.24b sends (a)/(b) in `hi` (`claim-suspicion-notices.ts:92-95`) ⇒ PM22.
- **F27 — member route conventions:** `requireMemberSession` (`auth/shared/member-session-guard.ts:25`), a `perMemberKey` budget
  (`helpdesk/member-routes.ts:50`), each handler opens its OWN `openScopeTx` (`modules/multi-tenant/scope-tx.ts:34`), a path `pariwarId`
  that is ⛔ not the session's ⇒ 404 (`helpdesk/member-handlers.ts:261-273`), writes inside `audit.withCompensatingAudit` ⇒ PM11.
- **F28 — the helpline chain** `[requireAdminSession, scopeResolutionHook, requirePermissionHook('claim.file'), requireStepUp('claim_file')]`
  (`claims.helpline.routes.ts:88-91,103`); every 6.3 helpline route is under `/api/v1/p/:pariwarId/admin/claims/…` ⇒ PM12.
- **F29 — the go-live roster ends at Row 26**; Rows 27 / 28 / 29 are RESERVED (`-305` §4); the DLT sheet carries templates 1–12 ⭐ (re-pin 2026-10-12: Row 29 `app-links-live` (6.30) and Row 30 (6.34) are now WRITTEN; Rows 27 / 28 stay reserved for Task 0.6; 6.34's sheet covers 1–12, 15, 16) ⇒ PM16.
- **F30 — `@twt/domain` cannot import `@twt/contracts`** (SEVEN FACTS #6) ⇒ PM23.
- **F31 — the lock-order hazard.** Every approval writer locks the CLAIM row first, then appends; `recordPeerMeshResponse` locks the PING
  first, then appends (`project.ts` ~`:107-125`) ⇒ under PM8's widened window a reply racing an approval can (i) collide on `eventVersion`
  (`ClaimStreamConcurrencyError` — an approver told "already updated" because a neighbour answered), (ii) deadlock (`40P01`, unmapped ⇒ 500),
  (iii) commit after the approval read its warnings while `saved_at < v.decided_at` ⇒ late but ⛔ never listed by the queue. ⇒ PM7 (b) /
  PM8: CLAIM first, then ping, then reply.
- **F32 — the app has ⛔ no language setting** (SEVEN FACTS #7) ⇒ PM22.
- **F33 — who approves, by key** (corrects v1.6's FOUND — `-305` §1 (c)):

  | Approval | Step | Gate key |
  |---|---|---|
  | District Admin | `district_admin_approval` | `claim.approve`, district (`claims.verification-decision.routes.ts:92`) |
  | Final vote | `final_vote` | `cycle.freeze`, pariwar (`claims.cycle-freeze.routes.ts:44,63`) |
  | Escalation resolution | `escalation_resolution` | `cycle.freeze` (`resolveEscalation`, `claims.cycle-freeze.handlers.ts:534`) |
  | No-correction approval | `no_correction_approval` | `cycle.freeze` (`claims.correction-closure.routes.ts:184-188`) |
  | R9 vote / finalize | `r9_vote` | `claim.r9_vote`, pariwar (`claims.r9-voting.routes.ts:53`) |
  | Super Admin G1 | `super_admin_approval` | `claim.decide_escalated_closure`, pariwar (`claims.correction-escalation.routes.ts:61`) |

  `cycle.freeze` and `claim.r9_vote` are held by `pariwar_admin` (`packages/domain/src/rbac/roles.ts:386,395`); `state_trustee` holds
  neither (`:472-478`); `super_admin` holds every key ⇒ PM24.
- **F34 — the mobile Turnstile token is a placeholder** (`apps/mobile/lib/turnstile.ts:14-16`, *"a real production verifier rejects the
  placeholder"*) ⇒ PM11 drops Turnstile from the peer-request routes.
- **F35 — gates a new file trips:** the claims human-actor invariant (`scripts/claim-adjudication-human-actor-invariant/check.ts:277-291` —
  every `apps/api/src/modules/claims/*.routes.ts` in exactly one of `COVERAGE_SET` / `NON_ADJUDICATION_ROUTES` / `ENROLMENT_OWED`); forced
  pagination (`apps/api/tests/integration/forced-pagination.spec.ts` — every collection GET declares a bounded `limit`); the friction budget
  (`scripts/friction-budget/lib.ts:453`, `MEMBER_FACING_PREFIXES` incl. `apps/mobile/`); the microcopy scan scope (`microcopy.yaml`); the
  decrypt fence's `FENCED_FILES` pin `toBe(41)` (`nominee-name-no-comparison-fence.test.ts:174`) and the import-discipline entries
  (`approval-warnings.test.ts:360-369` — FIVE entries since 6.28 added `claim/one-payment-per-death.ts`); the rtbf completeness pin (`packages/domain/tests/member/rtbf-anonymize.test.ts:121` — *"exactly the
  NINETEEN member-PII tables"*) ⇒ Tasks.
- **F36 — 0054 grants `SELECT, INSERT, UPDATE` on `claim_peer_mesh_pings` table-wide** — a column-level GRANT cannot narrow it; nothing
  UPDATEs pings today (`persistPeerMeshPingIntents` uses `onConflictDoNothing`, `peer-mesh-persist.ts:117`) ⇒ PM4.
- **F37 — the erasure precedent** for a locked, Tier-1 claim column is **0143 + 0149** (6.23a NW13 / 6.26b): a column-level UPDATE grant,
  per-command policies (`0143:73-76`; `-279` A12: *"without the policy the scrub matches 0 rows under FORCE"*), and a mutation trigger in
  0143's form — `IF (to_jsonb(NEW) - '<the scrubbable column>') IS DISTINCT FROM (to_jsonb(OLD) - '<…>')` — that freezes every OTHER column;
  0149's own header records *"The trigger cannot tell the RTBF scrub from any other writer"* (the sentinel is a FRESH Tier-1 envelope each
  time — `encSentinel` → `encryptTier1`, `member/anonymize.ts:120-131` — so ⛔ no trigger can recognise it). ⚠ `member/anonymize.ts:255-292`
  (the `claim_ground_inspections` scrub, GI13) is the SCRUB statement's shape (`WHERE … IS NOT NULL`), ⛔ not a grant / policy / trigger
  triple — it rides 0055's table-wide grant and a `FOR ALL` policy ⇒ PM7 (a), PM17.
- **F38 — reuse, ⛔ never hand-roll:** `addCalendarDays` (`packages/domain/src/cycle-calendar/holiday-resolver.ts:187`) and
  `isRealCalendarDate` (`packages/domain/src/claim/nominee-determination-persist.ts:71`). ⚠⚠ The latter lives in a pg / event module
  (imports `drizzle-orm`, `../db.js`, `./events.js`, `./nominee-name-check.js`, `./project.js`) ⇒ importing it from the pure questionnaire
  module would break the NW1 transitive import test (`approval-warnings.test.ts:340-372` forbids reaching `claim/events.ts`,
  `claim/nominee-name-check.ts`, `claim/nominee-lock.ts`) and close a runtime cycle approval-warnings → questionnaires →
  nominee-determination-persist → nominee-name-check → approval-warnings ([[project_type_only_import_cycle_trap]]) ⇒ Task 1 EXTRACTS it into
  the import-free leaf `cycle-calendar/holiday-resolver.ts` (already on approval-warnings' safe-leaf list, beside `addCalendarDays` and
  `istDateOf`), re-exported from `nominee-determination-persist.ts` with the same identity ⇒ PM7 (b), PM23.
- **F39 — tests and callers PM7 / PM8 change:** `apps/jobs/tests/claim-peer-mesh.test.ts:586-620` asserts
  `rejects.toBeInstanceOf(claim.PeerMeshWindowResolvedError)` after the window resolves (and the `verification_in_progress` guard's error is
  asserted too) — PM8 INVERTS them; `recordPeerMeshResponse` is called without an `actor` by the jobs test (`:373+`) and by
  `apps/api/tests/integration/claims/verifier-console.spec.ts:195`, `verifier-console-shape.spec.ts:198` ⇒ `actor` DEFAULTS to `'member'`.
- **F40 — audit and list gates:** a staff READ is audited through `emitAuthAudit(deps, request, '<event>', …)` (the console's precedent,
  `claims.verifier-console.handlers.ts:1175`), and a new event must join the closed `AuthAuditEventType` union (`apps/api/src/audit/audit-sink.ts`);
  a direct `audit.writeAuditEntry` under `apps/api/src/modules/claims/` trips access-wrapper-invariants (3)
  (`scripts/access-wrapper-invariants/check.ts`, CLAIM_ROOTS); every new DOMAIN list read takes `clampLimit` (the domain-accessor-invariants
  gate — [[project_domain_limit_clamp_and_savepoint_retry]]) ⇒ PM11, PM12, PM13, PM24.
- **F41 — the optional console field breaks typed consumers:** `apps/admin/src/modules/claim-verification/SignalsPanel.tsx:318`
  (`packet.peerMesh.status`) and typed specs (`apps/api/tests/integration/claims/verifier-console-shape.spec.ts:431,494`, `apps/api/tests/integration/claims/verifier-console.spec.ts:413,918-920` — the latter missed at v2.0) fail tsc once
  `peerMesh` is optional; the contracts tests (`claims-verifier-console.test.ts:145,244,251`) are outside tsc ⇒ PM25 (c), Task 7.

## ⚖️ Build decisions PM1–PM25 (shared record; PROPOSED — answered by BigDev at Task 0.3, committed by ONE author-commit at Task 0.4)

- **PM1 [c] — who is texted: the five chosen by row 6-36's rule (`2026-10-10-306`, `-307` — colleagues at the deceased member's WORKPLACE,
  school or office, and the previous one after a transfer within 90 days; otherwise the up-to-3 "people who know me" the member named and who
  accepted; otherwise ⛔ no one; ⛔ never the district; possibly fewer than five — `-310` CF4 A) through 6.6's engine, minus those the Trust must ⛔ not text — ⭐ a skipped one is REPLACED (`-311` PM1).** At the child's locked
  re-check (PM5 (iv)) a ping is finished `no_target` with a fixed detail when its member: is ⛔ not `members.state = 'active'`
  (`no_target:peer_not_active`); has ANY claim filed naming them as the deceased (`no_target:peer_reported_deceased` — ⚠ includes a claim
  wrongly filed against a living member, who is locked by 6.20 until row 6-22's release (`-238`); the exclusion STAYS even after such a
  release — a known residual, with a pointer on row 6-22, Task 9.4); has an erased or unresolvable mobile after decrypt → `normalizeMobile`
  (`no_target:no_sendable_number`). ⭐ **`-311` PM1 — REPLACED:** ineligible members are FILTERED when the people are first chosen (row 6-36), so a send-time skip is rare; when
  one still happens, the NEXT ELIGIBLE person in the SAME group (the next workplace colleague; otherwise the next named person who accepted)
  replaces them — deterministically from the selection's recorded ranking (replayable) — as a NEW ping row naming the one it replaces
  (`replaces_ping_id`), at most five live; ⛔ never from another group, ⛔ never the district; ⛔ none left ⇒ fewer are asked (`-310` CF4).
  FQ10's 3-reply count counts responders as before.
  ⚠ RECORDED: the deceased's family who are themselves members (other than the claimant) are ⛔ not excluded — the Trust has ⛔ no
  family-link data. ⚠ A refile texts the same five again for the same death (F10) — expected.
- **PM2 [c; the in-app alert a] — one DLT text per ping, through `sendClaimDltSms` UNCHANGED** (RB4), with a sibling registry
  `apps/jobs/src/scheduler/peer-mesh-sms-templates.ts` (the `suspicion-notice-sms-templates.ts` shape); ⛔ not `SMS_DLT_TEMPLATE_REGISTRY`,
  ⛔ not `dispatch()`, ⛔ no `AlertCategory`. Config keys `sms.dlt.template_id.peer_mesh.request.<locale>` (⚠ dotted — PM16); the helpline
  slot is the per-Pariwar key the core already resolves (F23). ⭐ **`-311` PM2 — ALSO an IN-APP ALERT:** once the text is accepted (the
  request is OPEN — PM11), the member sees it inside the app — the home-screen card AND an item in the app's notice strip (Story 11a.5's
  `NoticeboardStrip`, `packages/ui/src/noticeboard/` — follow its one-source banner-lane rule); ⛔ no push (⛔ no device registration),
  ⛔ no day-one WhatsApp (`-303` Q1 A — row 6-31's reminder at 48 h), ⛔ no second SMS (the alert system's WhatsApp → SMS fallback is ⛔ not
  used). Built in 6.27a (PM11's surfaces), dark until texted.
- **PM3 [c] — what the text says.** Copy key `peer_mesh_sms.request` in `packages/i18n/locales/{en,hi}/claim.json` (+ `$comment.peer_mesh_sms`
  in BOTH: NOT-YET-HUMAN-REVIEWED + *"must match the registered DLT content byte for byte"*, RB1's form). en, as ratified (`-303` Q1 A,
  amended by `-304` Q6 A): *"We have been told that {member} has died. If you knew them, please answer a few short questions: {link} — or
  call the helpline {helpline}."* — ⚠ the routing note's *"TWT:"* prefix is DROPPED (the DLT header names the sender): an AUTHOR reading,
  recorded in Task 0.4, ⛔ never more words. hi: agent-authored afresh for *"a few"* — ⛔ NEVER copied from the `-303` routing block's draft
  (its *"दो छोटे प्रश्नों"* says "two"); human review = Row 28. Typed DLT variables (row 6-34 retags every template; these two are
  registered typed from the start): `{member}` = `{#alphanumeric#}` (≤ 40 characters — ⚠ whether it accepts Devanagari with spaces is
  UNCONFIRMED: ask the provider at registration; a name that cannot fit ⇒ `no_target:name_too_long`, ⛔ never a truncated name — with a
  test; ⚠ an AUTHOR reading recorded at Task 0.4: it narrows `-303` Q1 A at the edge — a name the template cannot carry means that claim's
  five are ⛔ not texted — told to the Panel as an FYI in the confirm note; the provider's answer on Devanagari is a Row 27 evidence line), `{link}` = `{#url#}`, `{helpline}` = `{#cbn#}`. ⭐ (2026-10-12 annotation — Story 6.34 Task 0.4, TV1 / TV11) ⚠ on STPL / SmartPing the text keeps `{#var#}`; the tag names here are the slot TYPES — 6.34 TV1 / TV11. ⭐ (2026-10-12 annotation — Story 6.34 Task 0.4, `-322` C7) the answer is recorded ONCE at Row 30 (d) (`-322` C7); Row 27's evidence line POINTS to it. ⚠ Hindi is Unicode — likely THREE segments per text (the cost the Panel saw).
  `{member}` = the Pariwar's mode-resolved name (`-181`; `notifications.resolveMemberFacingDeceasedName`, `notifications/pool-identity.ts:141`),
  read once per child OUTSIDE the claiming transaction; erased / unresolvable / ⛔ no KYC name ⇒ `no_target:name_<reason>` (RB5). ⛔ No claim,
  money, family, nominee, claimant or reporter; ⛔ no deadline word (S4 / T6 — RB16). D33 carve-out recorded (this registry names the member
  because the ruled text does). The LANGUAGE: PM22.
- **PM4 [a: columns + structural CHECKs · c: the grammar CHECK, the builder and the writers] — the delivery record on
  `claim_peer_mesh_pings` (F2), adapted from 0151 / 0155** (⛔ never mirrored literally: 0151 INSERTs a row at begin; here the record lives on an
  EXISTING ping row whose `send_outcome IS NULL` means "⛔ not yet begun"). **6.27a's migration** adds `send_outcome text NULL` (else one of
  0138's values EXCEPT `recorded` — meaningless for a text; CHECK), `attempt_count INT NOT NULL DEFAULT 0` (0 until begin; ≥ 1 after — CHECK `(send_outcome IS NULL) = (attempt_count = 0)`), `claimed_at`,
  `claimed_by_job`, `aging_since`, `parked_at`, `detail`, `first_detail`, `provider_message_id`, `recipient_number_hash`, `send_updated_at`,
  `locale_source` (PM22 — `'pariwar_default'` today; CHECK), `link_code` (PM21 (a)); the STRUCTURAL CHECKs only — `detail` /
  `first_detail` ≤ 200; `attempting` ⇒ `claimed_at` and `claimed_by_job`; `claimed_by_job = 'sweep:held'` ⇔ `parked_at`; a finished-row
  trigger (a finished `send_outcome` is ⛔ never rewritten; `aging_since` forward-only; `link_code` written once); ⭐ **`REVOKE UPDATE ON
  claim_peer_mesh_pings FROM twt_app`, then `GRANT UPDATE (<exactly these columns>)`** (F36) with a policy-regression leg proving `UPDATE …
  SET message_key` is refused; the partial index `(aging_since, claimed_at) WHERE send_outcome = 'attempting'`. ⭐ **Once-ever is a CAS:**
  begin = `UPDATE … SET send_outcome = 'attempting', attempt_count = 1, … WHERE ping_id = $1 AND send_outcome IS NULL` (or a
  re-claim of a stale `attempting` row under RN7's lease rule); ⭐ a SKIP at the locked re-check (`no_target` / `skipped_superseded`) is the
  SAME CAS from `send_outcome IS NULL`, writing that outcome with `attempt_count = 1` (0151's `no_target` precedent); **the CAS finalise** = `UPDATE … WHERE send_outcome = 'attempting' AND claimed_by_job = $job`;
  **the transient note** = `detail` + `send_updated_at` only (6.29's `noteSuspicionNoticeTransient` shape). **6.27c's migration** adds the
  `detail` / `first_detail` GRAMMAR CHECK mirroring `PEER_MESH_REQUEST_DETAIL_PATTERN` (an ENUMERATED alternation, 0155's form, with the
  `(?!.*[0-9]{7})` lookahead) and 6.27c builds the ONE `detail` builder (pure, domain) that its writers assert (RN5 — a RAW gateway code is
  SANITISED before it is stored) — the vocabulary lives with its only writer, so a merged 6.27a can ⛔ never refuse a 6.27c detail.
- **PM5 [c] — when it is sent** (`-305` §2 item 4). (i) The SELECT worker, after its commit, enqueues ONE child per CLAIM through an
  INJECTED `enqueuePeerMeshRequestSend` dep (F6 — the select result carries ⛔ no ping ids; the child reads the pings and fans out); the hook
  fires on the idempotent no-op branch too, like the shepherd hook; ⛔ never a second `claim.peer_mesh_pinged`. (ii) A daily sweep
  (`'30 10 * * *'` IST) is the backstop, with 6.29's hold / park / give-up (RN2 / RN3 / RN7). (iii) **Quiet hours:** outside 09:00–20:00
  IST ⇒ re-enqueued with `startAfter` = the next 09:00 IST. (iv) **The locked re-check** (CLAIM row, then the ping — Invariant 9; then
  COMMIT; then decrypt — ⛔ no KMS under a lock): the claim is in PM8's ANSWER WINDOW — a text goes WHILE AN ANSWER CAN STILL BE TAKEN, and
  ⛔ never once a final approval is given or the claim is refused / closed ⇒ else `skipped_superseded` /
  `superseded:claim_decided`; then PM1's exclusions. (The proposal *"no text once the District Admin has decided"* is WITHDRAWN — it narrowed
  `-303` Q1 A; `-305` §2 item 4.)
- **PM6 [a] — the 72 hours are ⛔ not changed** (FQ10 A *"as built"*): still from selection; the label still `sufficient` /
  `insufficient_responses_fallback`, monotonic, counted from the payload responder (F4). ⚠ RECORDED: a held send shortens the time before
  the label resolves — harmless (the label gates ⛔ nothing; FQ9 requires the inspection anyway; PM8 keeps answers open past it).
- **PM7 [a] — the answers: a versioned questionnaire (PM23), saved as the member goes, locked at Submit** (BigDev 2026-10-10: *"ask few more
  but keep optional, with options. Ask 2 or 3 questions at a time on screen with auto save feature, A note at the end before Submit. Also,
  Submit button just redirect user to Thank You page, because answers were already saved"*; the questions ruled by `-304`).
  (a) **Storage** (6.27a's migration — next free number at build): `claim_peer_mesh_replies` — ONE per ping: `reply_id` PK, `pariwar_id`,
  `claim_case_id`, `selection_id`, `ping_id` UNIQUE (FK), `responder_member_id`, `questionnaire_version_id` (pinned at the first save),
  `started_at`, `submitted_at NULL` (forward-only — a replies trigger refuses clearing it), `UNIQUE (pariwar_id, reply_id)` (the composite FK's
  target); and `claim_peer_mesh_reply_answers` — APPEND-ONLY rows: `answer_id` PK (the 6.27b warning SUBJECT),
  `pariwar_id`, `claim_case_id`, `reply_id` (composite FK `(pariwar_id, reply_id)`), `question_key`, `value_codes text[]` (plaintext codes
  for NON-sensitive questions), `value_ciphertext` (Tier-1 `piiColumn` under a NEW field class `PEER_MESH_ANSWER_FIELD_CLASS` — wired in
  `member/anonymize.ts`'s literal and `apps/api/src/context.ts` — for a question the definition marks `sensitive`: the date, the cause, the
  illness), `death_date_window_indexes text[]` (only the date question; CHECK `IS NULL OR cardinality(…) = 3`), `saved_via text
  CHECK IN ('member_app','helpline')`, `saved_by_actor_id`, `saved_at timestamptz DEFAULT clock_timestamp()`, `superseded_at NULL` (the
  LIVE answer = `superseded_at IS NULL`; partial UNIQUE `(pariwar_id, reply_id, question_key) WHERE superseded_at IS NULL`). CHECKs:
  exactly one of `value_codes` / `value_ciphertext` (an erased row keeps a ciphertext — the sentinel); the indexes only with the date; ⭐ *"I
  don't know the date"* is stored as `value_codes = ['unknown']` (a plaintext code, ⛔ no ciphertext, ⛔ no indexes). Indexes: replies
  `(pariwar_id, claim_case_id)`; answers `(pariwar_id, reply_id) WHERE superseded_at IS NULL` (both warning readers run in the cycle-freeze
  bulk path). ⭐ **The answers trigger holds at ALL times** (⛔ not only after Submit): it admits ONLY (i) an INSERT, and an UPDATE of `superseded_at`
  from NULL to non-NULL with every other column unchanged, while the reply's `submitted_at` IS NULL AND the claim is in PM8's answer window;
  and (ii) the **erasure arm in 0143's form** (F37): an UPDATE admitted only when `(to_jsonb(NEW) - 'value_ciphertext' - 'death_date_window_indexes')
  IS NOT DISTINCT FROM (to_jsonb(OLD) - …)` AND `value_ciphertext` changes only where OLD is non-NULL and NEW is non-NULL AND
  `death_date_window_indexes` changes only to NULL. Every other write is ⛔ never admitted — a live answer's CODES are ⛔ never rewritten, its indexes ⛔ never set to a non-NULL value,
  and `superseded_at` is ⛔ never cleared or moved. ⚠ RECORDED, as 0149 does (⛔ never claimed refused): the erasure arm has ⛔ no state
  condition, so a ciphertext-only rewrite (non-NULL → non-NULL) or an indexes → NULL write of ANY row — an open one included — is ADMITTED;
  the trigger cannot tell the RTBF scrub from any other writer of those two columns (the sentinel is a fresh envelope). APPEND-ONLY is
  therefore enforced for the codes, the indexes' values and `superseded_at`; the ciphertext's append-only rests on the ONE writer (PM7 (b)). Its plpgsql window test (the state list + the live-R9 `EXISTS`) is parity-tested against the TS answer-window predicate (PM8 —
  `claim/answer-window.ts`) and `claim/review-window.ts:15`. RLS ENABLE + FORCE, four tenant
  policies on `pariwar_id` (plus the per-command UPDATE policy the scrub needs); grants `SELECT, INSERT` + `UPDATE (superseded_at)`,
  `UPDATE (submitted_at)` on replies, `UPDATE (value_ciphertext, death_date_window_indexes)` for erasure.
  (b) **Saving:** each answer is saved the moment it is chosen. ⭐ The HANDLER first encrypts the sensitive value and computes the date's three
  keyed indexes (⛔ no KMS under a lock — Trap 9); the domain writer receives ciphertext + indexes and then takes the lock order CLAIM row
  `FOR UPDATE`, then the PING row, then the REPLY row (Invariant 9; F31) — validated against the PINNED version by the domain validator (PM23 (a)): a known key, allowed codes, its
  `showIf` met, a date that is a real calendar date (`isRealCalendarDate`, from the import-free leaf after Task 1's extraction — F38), ⛔ never in the future (IST today), ⛔ never before 1900-01-01;
  the date's three window indexes computed by ONE shared helper (D, `addCalendarDays(D, ±1)`, each keyed by `deathDateBlindIndex` under
  `DEATH_DATE_INDEX_FIELD_CLASS`, `apps/api/src/modules/claims/ground-inspection-crypto.ts:63-65`) used by BOTH the member and the helpline
  handlers; an answer whose condition stops holding (e.g. *"died"* changed to *"not sure"*) has its dependants superseded in the same
  transaction; an edit stamps the old row's `superseded_at` FIRST, then inserts the NEW live row (the partial UNIQUE cannot be deferred).
  (c) **Counts when saved:** a saved answer is live; staff see *"⛔ not submitted yet"* until Submit.
  (d) **Submit** stamps `submitted_at` (locks the reply); the app shows the Thank-you page; ⛔ nothing else happens at Submit; a second
  Submit ⇒ 409 `peer_request.submitted`.
  (e) **The event** `claim.peer_mesh_responded` (payload shape ⛔ not changed) is written ONCE, at the FIRST save of `has_died` —
  `recordPeerMeshResponse` is called ONLY when ⛔ no prior `has_died` answer row exists (checked under the locks; the function takes the
  CLAIM lock itself — `lockClaimCase` — before its ping lock, Invariant 9), so 6.6's throwing
  already-answered guard is ⛔ never hit on an edit; mapped `died` ⇒ `confirmed`, `not_died` ⇒ `denied`, `not_sure` / `did_not_know` ⇒
  `unknown`; its `from_state` / `to_state` = the claim's CURRENT state and `actor` a parameter DEFAULTING to `'member'` (so the existing callers —
  F39 — keep working) (`'member'` | `'operator'`; `actorId` = the
  operator for a helpline save, `responder_member_id` = the neighbour). ⚠ RECORDED: the event carries the FIRST answer; the live answer is
  the table's.
  (f) **Mixed app + helpline:** ONE reply per ping; each answer row carries its own `saved_via` / `saved_by_actor_id`; either side may
  Submit; after Submit both are locked.
  (g) **For row 6-31:** ONE exported read `peerMeshReplyState(pingId) → 'none' | 'started' | 'submitted'` — the WhatsApp reminder's *"has
  ⛔ not answered"* reads it (⛔ never its own copy); and the reminder, like the text, goes ONLY while the claim is in PM8's answer window
  (`-305` §2 item 4).
- **PM8 [a] — when an answer is taken: while an approval is still to come.** `recordPeerMeshResponse` (and the save path) drop the
  `verification_in_progress` and `pending`-window guards and accept while the claim is in the ANSWER WINDOW =
  `CLAIM_REVIEW_WINDOW_STATES` (`verification_in_progress`, `verifier_review`, `verifier_approved`, `reversed`, `state_trustee_freeze`), OR
  `state_trustee_approved` WHILE the claim carries a live R9 routing (the `-283` A1 precedent: R9 finalize still runs the gate there, so a
  final approval is still to come; 6.27b's queue already scans that case). ⭐ **ONE predicate, ⛔ never re-composed:** 6.26a's
  `isClaimInGroundInspectionWindow` (`ground-inspection-persist.ts:267-276` — `CLAIM_REVIEW_WINDOW_STATES` OR (`state_trustee_approved` AND
  `hasLiveRoutedRow`)) IS this window; Task 1 extracts it under a neutral name (`isClaimInAnswerWindow`) into a NEW module
  `claim/answer-window.ts` that imports `review-window.ts` + `r9-routing.ts` (⛔ never into `review-window.ts`, whose header requires it
  import-free), and `ground-inspection-persist.ts` re-exports it under its old name (same identity). It is reused by PM7 (b), PM8,
  PM5 (iv) and row 6-31's reminder; per-claim reads use `hasLiveRoutedRow`; ⭐ 6.27b's queue needs ⛔ no window term (its scan states + R9 arm already equal the window, and answers exist only in-window — PM10); ⭐ the module ALSO exports `answerWindowSql(claimRef)` (built from `CLAIM_REVIEW_WINDOW_STATES` +
  `liveRoutedToR9Exists`) — EVERY set-based reader (the member list's **Open**, the helpline list, the sweep) uses it, with a parity leg
  against `isClaimInAnswerWindow` over every state × routed / not routed (⛔ never a hand-composed SQL copy); keep the
  not-selected guard; ⛔ never accept in `state_trustee_approved` without a live R9 routing, or in any closed / refused state (F19). ✅ (v2.11 — RULED: `2026-10-12-324`, Trustee-ratified, option A — this arm is RATIFIED as committed; ⛔ no code change; one payment
  per death (`-318`) is ⛔ not moved by it. The question as put, kept for the record: `-318` Q1 A / Q4 A speak of a claim that *"has passed the final
  vote"*, and 6.28 counts `state_trustee_approved` among `FINALLY_APPROVED_CLAIM_STATES` (`one-payment-per-death.ts:31`); read in that
  vocabulary, taking an answer in `state_trustee_approved` under a live R9 routing may WIDEN `-303` Q2 A — *"⛔ no answer is taken once the
  final approval has been given"*. `-311` committed this arm as an author reading on the `-283` A1 precedent (R9 finalize still runs the
  gate); ratified by `-324` (Consequence 2). Since 6.28, `closed` also arrives MID-WINDOW — OP4 at payment commit (trigger
  `death_already_finally_approved`, `closeClaimsOfPaidDeath`), and OP13: an allowed suspicion appeal now also closes a
  `state_trustee_approved` claim of the death (trigger `suspicion_appeal_allowed`, `closeClaimsHeldBySuspicionAppeal`) — outside the
  window, so a 409 (AC4).) A refused save answers 409 `peer_request.no_longer_open`
  and the screen says *"Thank you — this request is no longer open."* (⛔ not why). The 72-hour label is ⛔ not recounted. ⭐ The existing jobs test that asserts `PeerMeshWindowResolvedError` after the window resolves (F39)
  is REWRITTEN as *"accepted after resolution, the label ⛔ not recounted"*; the two error classes stay exported only if another caller uses
  them (grep at build). ⭐ **Trap 13 (rewritten):** a save racing an approval is made SAFE by
  the lock order (claim first — Invariant 9): the save and the approval serialize on the claim row, so ⛔ no `eventVersion` collision, ⛔ no
  deadlock, and a save after the approval's warnings read commits with `saved_at > v.decided_at` (6.27b's queue arm sees it) — proven by a
  two-connection ordering test.
- **PM9 [b] — the two kinds** (appended to `APPROVAL_WARNING_KINDS` after `register_check_mismatch` ⭐ (re-pin 2026-10-12: now at the END, after 6.28's `other_claim_for_death`, `approval-warnings.ts:116` — six → eight kinds; the pin's GENERIC message keeps 6.28's discharge and adds 6.27b's); ⛔ not in `NOMINEE_VERSION_WARNING_KINDS`):
  - **`peer_says_not_died:<answer_id>`** — the LIVE `has_died` answer row of a reply of THIS claim has the code `not_died` (submitted or
    not). A changed answer is a NEW row ⇒ a NEW key (late if after approval — F15). It needs ⛔ no certificate.
  - **`peer_death_date_differs:<answer_id>`** — the LIVE `death_date` answer row's `death_date_window_indexes` is non-null AND the current
    accepted review's `accepted_date_index` (`text`) is non-null AND is ⛔ none of the three. ⛔ No accepted certificate, or a pre-6.26b
    review ⇒ ⛔ no key. *"More than a day"* = **two or more calendar days apart** (our reading). Re-evaluates by itself when a re-review
    moves the accepted date.
  - Both: own claim ONLY (⛔ never inherited — `-261` C3); derived OUTSIDE the `postDeath` block; ONE SQL fragment (`peerReplyColumnsSql()`)
    selected by BOTH readers, selecting codes and indexes ONLY (⛔ never `value_ciphertext` — a fence assertion); ONE exported pure helper
    (the `deriveDeathFactWarningKeys` pattern). ⛔ Never in `peer-mesh-persist.ts` (it imports `project.ts`; the import discipline forbids it).
  - **Enter the wait** (`-303` Q2 A) — ⛔ no edit to the assertion; the pin test's GENERIC message gains the discharge *"6.27b's two kinds
    enter by `2026-10-10-303` Q2 A (its Consequence 1)"*. ⚠ RECORDED: a late neighbour key also makes the District Admin's approval
    unrevisable (F20).
- **PM10 [b] — the correction queue's FOURTH source.** ⭐ (re-pin 2026-10-12: the FIFTH — 6.28 OP5 took (4), `:192`; the *"THREE sources"* comments, still stale after 6.28 at `:90` and `:144`, are amended to five) `lateArm` (`correction-queue-read.ts:161-194`) gains ONE hoisted disjunct: `EXISTS
  (SELECT 1 FROM claim_peer_mesh_reply_answers a WHERE a.pariwar_id = v.pariwar_id AND a.claim_case_id = v.claim_case_id AND a.question_key
  IN (<the two warning keys, from the domain list>) AND a.superseded_at IS NULL AND a.saved_at > v.decided_at)` — used by the column AND the
  WHERE (⛔ never two copies); the *"THREE sources"* comment amended, ⛔ never deleted. ⛔ No change to the scan states. F21 rides arm (1).
- **PM11 [a; the `?c=` half c] — the member's answer screens (pull) and routes.** Contracts `packages/contracts/src/claims/peer-request.ts`
  (the wire shape, mirroring PM23's domain shape — lockstep test); routes in a NEW `apps/api/src/modules/claims/claims.peer-request.member.routes.ts`
  (classified `NON_ADJUDICATION_ROUTES` — F35): `GET /api/v1/p/:pariwarId/member/peer-requests?limit=` (bounded, cap 5 — forced
  pagination) → the session member's OPEN requests `{ pingId, memberName (mode-resolved), askedOn (IST date) }`; `GET …/member/peer-requests/:pingId`
  → `{ memberName, questionnaire: <the PINNED version's definition WITH the question words resolved in en and hi on the server>, answers:
  <live>, submitted }`; `PUT …/member/peer-requests/:pingId/answers/:questionKey` `{ value }` → 200 (the auto-save; idempotent by value);
  `POST …/member/peer-requests/:pingId/submit` → 200. `requireMemberSession` + `perMemberKey` budget + `Idempotency-Key` on writes; ⛔ NO
  Turnstile (F34 — the session and the budget are the control; a neighbour is a selected, authenticated member). **404** for "⛔ not
  yours / unknown / another Pariwar" AND for a ping of yours that was ⛔ never texted (`send_outcome IS DISTINCT FROM 'accepted'`) — one
  indistinguishable answer on EVERY member route (the list omits it; detail, PUT, submit and 6.27c's by-link answer 404), so ⛔ no named
  death reaches a member the Trust has ⛔ not texted; **409** `peer_request.no_longer_open` / `peer_request.submitted` for "yours, texted, but
  closed or submitted". Every new domain list read takes `clampLimit` (F40). **Open** = ⛔ not submitted AND the claim is in PM8's window AND **`send_outcome = 'accepted'`** (the member
  WAS texted) ⇒ ⭐ the card and list are DARK until 6.27c texts anyone — ⛔ no named death is shown to a member the Trust has ⛔ not texted
  (and so ⛔ never before Row 27's counsel basis). Mobile (`apps/mobile`): a card on `app/(tabs)/index.tsx` while ≥ 1 request is open (*"The
  Trust has asked you about a member"*); 6.30's route shell `app/(peer-request)/peer-request.tsx` FILLED with the list (no `c`) and the
  questionnaire — its pages (2–3 questions each), the Saved / *"Not saved — retrying"* line, the closing note and the Thank-you page are
  IN-SCREEN STATE (⛔ never a new route file, ⛔ never a new root-level catch-all — 6.30 AL16; ⭐ re-pin 2026-10-12: 6.27a's choice, narrower than AL16, which also admits nested segments under `/peer-request/…`; 6.30's placeholder slot and its tests are amended in Task 5); a GENERIC renderer per question `kind` driven
  by the server's definition; the question WORDS come from the server (so a new version needs ⛔ no app release) — ONLY the chrome (card,
  saved line, buttons, errors) is in `packages/i18n/locales/{en,hi}/claim.json`, read through `useClaimT()` (`apps/mobile/lib/claim-i18n.ts` — the hook only; corrected at the re-pin). **The closing note and Thank-you, VERBATIM as put under `-304` Q6 A:** *"Your
  answers are saved as you go. Only the Trust's staff who check this claim will see them — never the family. Please answer only what you
  know. Press Submit when you are done."* and *"Thank you. Your answers have been sent to the Trust."* (en; hi agent-authored, Row 28). A
  request that cannot be opened (404) shows a dignified *"This request could not be opened"* + the shared `CallHelplineCTA` — ⛔ never a
  hard error; ⛔ no API call before the session has loaded. The screens show ⛔ no claim, ⛔ no family, ⛔ no amount — the name only. Empty /
  loading / error states OUTSIDE any list ([[project_fabric_flatlist_empty_populated_crash]]); depend on `locale`, ⛔ never `t`
  ([[project_uset_fresh_closure_memo_trap]]). **The `?c=` split (stated ONCE, here and in 6.30):** 6.30's shell PARSES `c` (`parseAppLinkCode`) and owns the
  login-return (AL6); **6.27a** fills the slot — the list, the questionnaire, the not-openable state and *"⛔ no call before the session"*;
  **[c]** wires the parsed `c` to the by-link resolver (route + call, PM21 (d)), and its 404 reuses 6.27a's not-openable state.
- **PM12 [a] — the helpline records the answers of a neighbour who phones.** A NEW `claims.peer-request.helpline.routes.ts` (ENROLLED in
  the human-actor invariant's `COVERAGE_SET` — it composes the full chain; ⛔ never a new `ENROLMENT_OWED` entry, which `check.ts:403-405`
  prints as debt — F35) on 6.3's chain (`claim.file` + step-up; ⛔ no new key — a reuse,
  6.21b D5's precedent): `GET /api/v1/p/:pariwarId/admin/claims/helpline/members/:memberId/peer-requests?limit=` (the caller's requests —
  gated like the member list: ONLY pings with `send_outcome = 'accepted'` — before 6.27c texts anyone the panel is EMPTY, so the helpline
  can ⛔ never name a reported death to a member the Trust has ⛔ not texted; `clampLimit`), and the SAME save / submit shape as PM11 (`PUT …/admin/claims/helpline/peer-requests/:pingId/answers/:questionKey`,
  `POST …/submit`) — ⭐ BOTH refuse, with 404, a ping whose `send_outcome IS DISTINCT FROM 'accepted'` (as the member routes do); `saved_via = 'helpline'`, `saved_by_actor_id` = the operator; the event (first `has_died` save) `actor: 'operator'`;
  the shared date-window helper. Admin UI: a *"Requests to confirm a death"* panel on the helpline member-lookup screen, rendering the same
  definition (English). ⭐ The operator sees ONLY that neighbour's answers (PM25 (b)).
  ⭐ **AMENDED 2026-10-13 by [`2026-10-13-325`](../../.decision-log.md#decision-2026-10-13-325) S12 A — second-pass review S12 (BigDev: "bind and audit"), ⛔ never a silent re-read:** the PUT / submit
  paths above let an operator write ANY texted ping in the Pariwar. They are now
  `PUT …/admin/claims/helpline/members/:memberId/peer-requests/:pingId/answers/:questionKey` and
  `POST …/admin/claims/helpline/members/:memberId/peer-requests/:pingId/submit` — the domain's `visible()` checks the ping
  is THAT neighbour's (another neighbour's ping is the same 404; the `memberId: null` form is gone), both take an
  Idempotency-Key exactly as PM11's do (S18), and the list is an AUDITED read (`helpline_claim.peer_requests_read`,
  `member:<id>`). The text above is kept AS WRITTEN (the record).
- **PM13 [a] — what the District Admin sees** (the verifier console's peer-mesh section through ONE actor-aware assembler
  `assemblePeerAnswers` — reused by 6.27b's PM24 read; English only, F22): the 72-hour line (*"Fewer than 3 answers in 72 hours — the
  ground inspection is the main check"* / *"3 or more answers"* / *"Still open until {date}"* / *"⛔ No neighbour could be chosen"*); per ping:
  the neighbour's NAME (decrypted in the HANDLER — ⛔ never the warning module), the send status for EVERY value of the column (6.27c writes it): `NULL` *"⛔ not
  sent yet"* · `attempting` *"sending"* · `accepted` *"text sent"* · `rejected_invalid_number` / `rejected_unreachable` *"text could ⛔ not be
  delivered"* · `no_target` *"⛔ not texted — {reason code}"* · `error` *"text failed"* · `skipped_superseded` *"⛔ not texted — the claim had
  moved on"* (`recorded` is excluded by the CHECK — PM4), EVERY live answer with its question's English words (the sensitive ones
  decrypted in the handler), *"submitted"* / *"⛔ not submitted yet"*, *"answered in the app"* / *"recorded by the helpline"* per answer, the
  last-saved IST time and *"changed N times"*; when `callback_consent = yes`, the neighbour's mobile (decrypted in the handler, normalised,
  each showing audited through `emitAuthAudit` with a new `AuthAuditEventType` member — actor, claim, ping; ⛔ never the number in the audit
  row; ⛔ never a direct `writeAuditEntry` — F40). ⚠ The per-answer warning flags (*"says the member has ⛔ not
  died"*, *"more than a day from the certificate"*) arrive with 6.27b — its AC and Task (from the warnings read; a failed read ⇒ `null`,
  Invariant 8). `VERIFIER_CONSOLE_MAX_READS` bumped to the exact new ceiling ⭐ (re-pin 2026-10-12: from 23 — 6.28; the new reads sit BEFORE the warnings, which stay LAST; ALL FOUR `toBe(23)` sites move — F12) with a ledger line
  and a `toBe`. `verifierAnnotations` STAYS `not_available_yet` (staff NOTE capture is ⛔ not built). The family's app, the claim status page
  and every public page show ⛔ nothing new.
- **PM14 [c] — ⛔ no new events beyond the existing one.** Sending writes the ping row only; `claim.peer_mesh_pinged` stays the selection's.
- **PM15 [c] — alarms: ids only** — the end-of-run held-scope alarm, a final `error`, a re-claimed `attempting` that fails its re-check
  (`-297` §2), a `no_target` on a re-claimed row (`-298`); ⛔ no alarm for PM1's `no_target`s. ⚠ The named owner is Row 27 (d).
- **PM16 [a: Rows 27 / 28 · c: the DLT templates] — the go-live records** (decision-authored; numbers RESERVED by `-305` §4 — whichever
  story lands first writes its own row at its number). **Row 27 `peer-mesh-request-counsel-basis`** — closes on ALL of: (a) counsel's basis
  for telling five members of a reported death; (b) a privacy-policy revision naming the purpose; (c) **Closed by `2026-10-10-303`** (the
  Panel's Q1 A); (d) the alarms reaching a named owner through a real transport (Row 22 (d)'s bar); (e) Row 29 (`app-links-live`, 6.30)
  closed; (f) counsel's basis for HEALTH information from neighbours — `death_cause` and `death_illness` (`-304` Q4 A), closed only when v2's
  `counselBasis` for both is RECORDED in code (a reviewed edit citing counsel's recorded basis — a decision id — + its test); (f) closes on that edit —
  ⭐ ⇒ the TEXTS themselves wait for it (Row 27 stays ONE conjunction; ⛔ no "skip the health questions" interim — it would show the
  neighbours a list the Panel never ruled); (g) **Closed by `2026-10-10-310`** (the confirm note CF1–CF5 answered). Evidence lines: the provider confirms that
  `{#alphanumeric#}` carries Devanagari with spaces (PM3); the dotted-key defect (below). ⭐ (2026-10-12 annotation — Story 6.34 Task 0.4, TV1 / TV11) ⚠ on STPL / SmartPing the text keeps `{#var#}`; the tag names here are the slot TYPES — 6.34 TV1 / TV11. ⭐ (2026-10-12 annotation — Story 6.34 Task 0.4, `-322` C7) the answer is recorded ONCE at Row 30 (d) (`-322` C7); Row 27's evidence line POINTS to it. Note: row 6-31 built, or its absence at go-live
  recorded as a decision. ⭐ Rows 6-31 and 6-34 cite `-305` §4 for the reserved numbers, so ⛔ no third story takes Row 27 / 28 / 29. **Row 28 `peer-mesh-request-hindi-human-review`**
  — the Hindi of the texts, the questionnaire's question words, the screens, AND 6.30's fallback page, not-found screen and route-shell
  placeholder. **[c]:** DLT
  templates 13 (hi) / 14 (en) in the sheet (typed variables — 6.27c TYPES its two templates; row 6-34 VERIFIES them with every other) ⭐ (2026-10-12 annotation — Story 6.34 Task 0.4, TV11) 6.34 does ⛔ hand-verify them: 6.27c USES 6.34's vocabulary (`{#var#}` + `slots` from `@twt/channels` `dlt-variables.ts`), runs the shape check in its own registry test and adds its file to the gate's `REGISTRY_FILES`., *"⛔ never provision the ids until Row 27 closes"*; unset ids ⇒ the sweep HOLDS
  (RB12). ⚠ The dotted Secret Manager names (`sms.dlt.template_id.peer_mesh.…`) inherit the recorded UNVERIFIED dotted-secret-id defect
  (deferred-work *"Dotted Secret Manager names"*) — since 6.29 an `INVALID_ARGUMENT` is a final `error` + alarm that uses up the slot (F23) —
  recorded on Row 27, ⛔ not fixed here. ⚠ Row 26 (`jobs-db-role`) applies to 6.27c's sweep. ⭐ Go-live gates ⛔ never block a merge.
- **PM17 [a; d's arm in d] — erasure.** On erasure of the DECEASED member (`member/anonymize.ts`, the GI13 shape — F37): EVERY answer row of
  their claims' replies — live AND superseded — is scrubbed by ONE statement `UPDATE … SET value_ciphertext = <sentinel>,
  death_date_window_indexes = NULL WHERE value_ciphertext IS NOT NULL AND …` (GI13's `IS NOT NULL` form — a non-sensitive row keeps its codes
  and the exactly-one CHECK holds); the trigger's 0143-form arm admits it. ⭐ The rtbf completeness pin counts the ANSWERS table (the replies
  table holds ⛔ no PII): NINETEEN → TWENTY (`rtbf-anonymize.test.ts:121`); the rtbf unit test's statement count `toHaveLength(22)` → 23
  (`:191`); the no-claims leg stays 21 (`:256`); 6.27d raises them again for its notes. On erasure of the RESPONDER: the reply holds ⛔ no identity beyond an id; the answers
  stay as claim evidence — ⚠ whose data an answer is stays OPEN (GI13's deferred item gains these tables).
- **PM18 [a] — stale text corrected in the files this story touches** (⛔ no standalone edits): `schema/claim_peer_mesh_pings.ts:9-10`;
  `apps/jobs/src/claim-peer-mesh.ts:22-23` and `packages/queue/src/index.ts:138`; `packages/contracts/src/claims/verifier-console.ts:161-163`;
  the deferred-work 6.10 item's stale `events.ts:125-134` cite (now `:157-161`).
- **PM19 [a] — ⛔ not built, recorded:** FR-39's escalation and 6.6 AC6's operator extend / skip — the console's 72-hour line is the
  signal. A deferred-work item, ⛔ never a supersession.
- **PM20 [a] — ⛔ not taken: the zero-candidate stall** — the console shows *"⛔ No neighbour could be chosen"* for a `skipped` selection.
- **PM21 [a: the column · c: the rest] — the link in the text.** (a) `link_code` (6.27a's migration): 12 characters base62 from a CSPRNG,
  `UNIQUE`, written ONCE by 6.27c's begin UPDATE, ⛔ never rewritten; it carries ⛔ no name, Pariwar, claim id or login — ⛔ not a
  credential. (b) `{link}` = 6.30's `buildAppLinkUrl(<base>, 'peerRequest', link_code)` = `<origin>/peer-request?c=<code>` (a QUERY string —
  operators refuse dynamic paths); the base is the env var `APP_LINKS_BASE_URL`, READ AT BOOT by 6.27c and validated every run by 6.30's
  `resolveHttpsOrigin` (⛔ not Secret Manager); invalid / unset ⇒ the sweep HOLDS (`config:app_links_base_url_invalid`) and alarms — ⛔ never a
  broken link. (c) 6.30's route shell PARSES `c` (`parseAppLinkCode`, from `useLocalSearchParams()`) and owns the login-return (AL6); 6.27c wires the
  parsed `c` to the resolver once the session has loaded, and opens 6.27a's questionnaire (PM11's `?c=` split). (d) The resolver `GET /api/v1/p/:pariwarId/member/peer-requests/by-link/:code` →
  `{ pingId }` ONLY when the code's ping belongs to the SESSION member in that Pariwar AND was texted (`send_outcome = 'accepted'`); else
  **404** (one indistinguishable answer, reusing 6.27a's not-openable state); a
  closed request resolves and the screen says it is no longer open. (e) The code is ⛔ never in a log, an alarm, an audit row or a `detail`.
  (f) Go-live: Row 27 (e).
- **PM22 [c] — the language** (`-305` §2 item 2; ✅ `-310` CF1 A — the interim ⛔ never applies if row 6-35 lands before go-live): each text goes in the Pariwar's `pariwar_passport.locale_default`
  (`schema/pariwar_passport.ts:86`, `NOT NULL` ⇒ always present; Hindi for Bihar) — the template of that locale, both registered; the
  sweep's config check needs that locale's id for each Pariwar it texts; the choice is recorded as a CODE (`locale_source: pariwar_default`).
  ⭐ **Boundary:** row `6-35-in-app-language-switch` adds the member's own choice (saved on the phone, recorded on the server on an explicit
  change — ⛔ never on first launch) and changes this ONE read to *member's choice, else the Pariwar's default*. Row 6-31's reminder reads the
  same. ⛔ No `member_language_preferences` table in 6.27. ⚠ RECORDED: the app always renders `hi` (F32) — a Pariwar whose default is `en`
  would send English texts that open Hindi screens; moot for Bihar (Hindi) in v1; row 6-35 fixes both halves.
- **PM23 [a] — the questionnaire is DATA, versioned, in a pure domain module** (BigDev: *"these questions are of evolving nature"*; F30).
  (a) **The engine:** `packages/domain/src/questionnaires/` — pg-free, ⛔ no `db` import: the definition shape (pages of 2–3 questions; a
  question = `key` stable across versions, `kind` `single` / `multi` / `date` / `yes_no`, option CODES, `optional` (all but `has_died`),
  `showIf`, `sensitive`, `warning`, copy keys (en + hi), `approvedBy`, ⭐ `health: boolean`, and ⭐ `counselBasis` — a STATE, ⛔ not a
  boolean: `'pending'` or a recorded basis id (counsel's recorded basis — a decision id; a later one recorded through row 6-33); the SERVED definition SKIPS
  any question whose `counselBasis` is `'pending'` (a test) — v2's ruled health questions — `death_cause` (whole question: its
  answers include illnesses) and `death_illness` are `health: true` — carry `'pending'` until Row 27 (f) closes; the TEXTS wait, and that is
  MECHANISED: a `'pending'` question in `resolveLiveVersion('peer_mesh', pariwarId)` is one of 6.27c's config GAPS, checked by BOTH the
  sweep (per Pariwar per run) AND the child's begin path (the RB12 race guard ⇒ `held_config`, ⛔ no ping begun) — 6.27c AC2b — so the skip
  can ⛔ never reach a texted neighbour; recording the basis is a reviewed code edit of v2 that cites COUNSEL'S RECORDED BASIS (a decision
  id), and Row 27 (f) closes on that edit (+ its test); a later health question (v3+, from the Panel or row 6-33) likewise HOLDS that
  Pariwar's texts until its basis is recorded — ⚠ a cost row 6-33 must state); the VALIDATOR (a definition is refused unless): ⭐ for the `peer_mesh` kind, in
  EVERY version from v2 onward, every question the Panel ruled is present — the seven v2 keys `has_died`, `death_date`, `how_known`, `relationship`, `death_cause`, `death_illness`, `callback_consent` (CF3 (a));
  `warning` is set ONLY on `has_died` and `death_date` (CF3 (b)); every question has `approvedBy` = a Trustee-ratified decision id — or, once row 6-33 lands, a chain record — ⛔ no v3 before
  6-33 except from a Panel decision id; ⛔ no alcohol question key or option (CF3 (c) — Q5 A); a `health: true` question carries a `counselBasis` (CF3 (d));
  ⭐ **v1 is EXEMPT** from the seven-key rule — registered and historical, ⛔ never CURRENT, ⛔ never returned by `resolveLiveVersion`
  (a test proves v1 is registered AND exempt); the `ground_inspection` kind (row 6-32) gets ITS OWN rule from its own story — ⛔ never
  these seven keys; `showIf` refers only to an earlier key; codes unique. The VERSION REGISTRY
  (`QUESTIONNAIRE_KINDS = ['peer_mesh', 'ground_inspection']`), `resolveLiveVersion(kind, pariwarId)` (a Pariwar's own live version, else
  the all-Pariwar one), `COMPARABLE_QUESTION_KEYS` (`has_died`, `death_date`, `death_cause`, `death_illness` — the SAME keys and codes wherever
  BOTH sides answer; ⚠ `has_died` (rule ①) is NEIGHBOUR-ONLY — the family has ⛔ no `has_died` answer, ① compares against the inspection
  having happened), and the warning-key list (read by 6.27b's SQL). Because the rules live in the VALIDATOR, row 6-33's
  database-backed versions inherit them. Contracts mirrors ONLY the zod wire shape the app renders, with a test-only lockstep. ⭐ The module imports ONLY import-free leaves (⛔ never
  `isRealCalendarDate` from `nominee-determination-persist.ts` — F38); the event-response MAPPING lives in `claim/peer-mesh-reply.ts`,
  ⛔ never in `questionnaires/` (a type import from `claim/events.ts` alone trips NW1); `questionnaires/index.ts` is ADDED as an NW1 entry
  (`approval-warnings.test.ts:360-369` — the SIXTH entry, after `claim/one-payment-per-death.ts`) and a reachability test proves the module reaches ⛔ no `db.ts`, `pg` or `drizzle-orm` (AC2's
  "pg-free" made a check).
  (b) **Versions:** v1 = page 1 only (`has_died`; `death_date` after *"Yes"*) + the closing note, `approvedBy` `-262` FQ8 E / `-263` FQ10 /
  `-303`. **v2 = `2026-10-10-304`, exactly as ruled — CURRENT (all-Pariwar):** page 1 (`has_died` — *Yes, they have died · No, they have
  not died · I am not sure · I did not know them*; `death_date` after *"Yes"* — a date · *I don't know the date*); page 2 (`how_known` —
  *"How do you know they died?"*: I attended the last rites or visited the family · The family told me · I heard it from others · Other;
  `relationship` — *"How do you know [member]?"*: A relative · A neighbour · A colleague at the same school · Other); page 3 (`death_cause`
  after *"Yes"* — Q3's list: Illness over a long time · Sudden illness (heart attack, stroke) · Old age · Accident (road, drowning, electric
  shock, snake bite, fire, other) · Suicide · Killed by someone · Other · I don't know; `death_illness` after an illness cause, multi — Q4's
  list); page 4 (`callback_consent`
  — *"May the District Admin phone you about this?"*); the closing note. ⛔ No alcohol question (Q5 A). `death_date`, `death_cause` and
  `death_illness` are `sensitive`. ⭐ ⛔ No texted neighbour ever sees a ruled question skipped: the sweep and the child HOLD while any is `'pending'`
  (6.27c AC2b; PM16) — so the full ruled list is the only list a neighbour ever sees.
  (c) **Pinning:** a reply pins `resolveLiveVersion('peer_mesh', pariwarId)` at its first save; answers are validated against it; a newer
  version applies to new replies only.
  (d) **Who approves a version** (`-304` Q7): the Pariwar Admin proposes; a State Trustee proposes or approves, with or without changes; the
  Super Admin makes it live for one Pariwar or all, with or without changes, and may add a question directly — row 6-33 builds the chain;
  until then v1 / v2 are reviewed code.
- **PM24 [b] — every approver sees the answers for the claim in front of them** (BigDev: *"yes, make those changes"*; F33 — the v1 later
  approvers are Pariwar Admins as Trustee-Lite and the Super Admin). ONE read `GET /api/v1/p/:pariwarId/admin/claims/:claimCaseId/peer-answers`
  in a NEW `claims.peer-answers.routes.ts` (classified `COVERAGE_SET` with its `expectedMethods`), first hook `requirePermissionHook('cycle.freeze',
  pariwar)` (the coarse key every v1 later approver holds — `pariwar_admin` and `super_admin`), then an IN-HANDLER `rbac.hasPermission`
  disjunction keyed by the claim's PENDING step: `verifier_approved` / `reversed` / `state_trustee_freeze` → `cycle.freeze`; a live R9 routing
  row → `claim.r9_vote`; an open CORRECTION escalation awaiting the Super Admin's G1 decision → `claim.decide_escalated_closure` (the
  cycle-freeze escalation RESOLUTION is `cycle.freeze`'s — the first arm); any other claim state ⇒ 404. ⚠ RECORDED: in v1 everyone who passes
  the first hook also holds `claim.r9_vote` (`pariwar_admin`) or every key (`super_admin`), so the disjunction reduces to STATE gating; and in
  `state_trustee_freeze` with an open correction escalation, a Pariwar Admin may read at what is the Super Admin's step — accepted (both
  are approvers of that claim; Invariant 7's "at that step" is enforced per state, ⛔ not per actor). Built through PM13's
  `assemblePeerAnswers`; audited through `emitAuthAudit` with a new `AuthAuditEventType` member (actor, claim, time — ⛔ no answer content; F40). A *"Neighbours' answers"* panel beside the warning lines on
  `LaterApprovalWarnings.tsx`'s four hosts — `apps/admin/src/modules/cycle-freeze/PendingCaseCard.tsx`,
  `apps/admin/src/modules/correction-closure/EscalationPanel.tsx`, `apps/admin/src/modules/correction-closure/PariwarClosureStrip.tsx`,
  `apps/admin/src/modules/r9-voting/R9CasePanel.tsx`. ⛔ No new permission key.
- **PM25 [d: (a) · a: (b), (c) · b: the kinds filter] — the people who meet the family form their own view first** (BigDev 2026-10-10).
  (a) **[d] The inspector** (the actor named on an assignment — a District Admin or a Block Admin; `field_worker` holds ⛔ no key):
  · **Before completing:** shown ⛔ nothing about the neighbours — ⛔ no answers, ⛔ no counts, ⛔ no "hidden" line.
  · **At completion** (`completeGroundInspection`), the server compares against the neighbours' answers SAVED by then: ① any neighbour's
  live `has_died` = `not_died`; ② a neighbour's live `death_date` two or more calendar days from the FAMILY's date — ONLY when the
  completed row's `death_date_source = 'family_statement'` (a SOURCE value — `claim_ground_inspections.ts:116`, ⛔ not a completion kind; a
  `certificate_check` STAGE records the original's date), by index membership (the family's `death_date_index` against the neighbour's
  three window indexes — ⛔ no decrypt). ⭐ ③ (cause) and ④ (illness) are ⛔ NOT built:
  the family's answers come from row 6-32, and comparing ENCRYPTED codes needs a comparable form (a keyed blind index per option code) —
  a design OWED by row 6-32, recorded. ⛔ Never compared: *"how do you know"*, *"how do you know them"*, the call-back consent; ⛔ never
  `member_medical_disclosures` (a fence test — `-304` Q4 A).
  · **⛔ No difference (or ⛔ no answer yet)** ⇒ *"Thank you, your response has been recorded. No further action needed."*
  · **A difference** ⇒ *"Thank you, your response has been recorded. We found the family's answers don't match the neighbours'
  observations. Please ask the family again, in your own words, without mentioning anyone else's answer, and record their response in the
  note next to each question."* — each differing question shown to the INSPECTOR as — for ① *"The family reported that the member has died. A neighbour's answer
  differs."*; for ② *"The family said: [their date, as the inspector entered it — decrypted in the HANDLER after the completion commit, for
  display only]. A neighbour's answer differs."*
  (⭐ the inspector SEES the difference — `-304` Q3 / Q4 as put — but asks the family OPEN-ENDED, ⛔ never stating what any neighbour said
  and ⛔ never who: `-305` §2 item 3), ⛔ never a name, ⛔ never a count, and ONE note box per differing question.
  · **The notes and the showing** — 6.27d's migration: `claim_ground_inspection_discrepancy_notes` (Tier-1 note, `pariwar_id`,
  `ground_inspection_id`, `question_key`, `noted_at clock_timestamp()`; once per question; while the claim is in PM8's window; its own
  erasure arm in 0143's form) and a SEPARATE table `claim_ground_inspection_discrepancy_showings` (the result's question KEYS only, ⛔ no
  values, and `shown_at clock_timestamp()`), written in ITS OWN transaction AFTER the completion commits — ⛔ never columns on the assignment
  (whose row is frozen after completion) ⇒ `completed_at` < `shown_at`, provable by an ordering test. ⭐ The showing write is IDEMPOTENT
  (`UNIQUE` per assignment); if it is ABSENT (the post-commit write failed), the inspector's OWN re-read of their completed assignment
  RECOMPUTES the result against the answers live AS OF `completed_at` (`saved_at ≤ completed_at AND (superseded_at IS NULL OR
  superseded_at > completed_at)`) and writes it ⇒ a lost completion response or a failed showing write is ⛔ never lost for good.
  · **Answers arriving after completion** reach the District Admin, ⛔ never the inspector.
  (b) **[a] The helpline operator** sees ONLY the answers of the neighbour they are recording — ⛔ never another neighbour's, ⛔ never the
  warning lines, ⛔ never the counts.
  (c) **[a; the kinds half b] Enforced in the SERVER read** (`assemblePeerAnswers` takes the actor): for an actor who holds an
  UN-completed assignment on the claim and has completed ⛔ no FULL visit on it (a `certificate_check` alone does ⛔ not count — it records
  ⛔ no family account), the console's `peerMesh` is ABSENT — the contract field becomes OPTIONAL
  (⛔ never a new variant, which would itself be a "hidden" signal) and `SignalsPanel` renders ⛔ no peer-mesh section at all (⛔ never
  a title with nothing under it — F41); **[b]** and 6.27b filters the two peer kinds out of that actor's
  warnings summary and correction-queue row (approval is impossible before completion anyway — GI1).

## Acceptance Criteria (6.27a)

1. **AC1 — governance first (shared).** ⛔ No code in any part before Task 0.4's author-commit (PM1–PM25 as answered, incl. the author
   readings Task 0.4 lists) lands ALONE; the epics.md entries for 6.27a–d, Rows 27 / 28 and the deferred-work items follow it.
2. **AC2 — the engine** (PM23): the domain module exists and a REACHABILITY test proves it reaches ⛔ no `db.ts`, `pg` or `drizzle-orm`;
   `questionnaires/index.ts` is an NW1 entry and the NW1 test stays green; `isRealCalendarDate` is served from the import-free leaf (same
   identity re-exported); the validator refuses a `peer_mesh` definition (v2 onward) missing ANY of the seven ruled keys (v1 registered AND exempt — a test), a `warning` on any other key, a question
   without a valid `approvedBy` (⛔ no v3 before 6-33 except a Panel decision id), an alcohol key, a `health: true` question
   without a `counselBasis`; the served definition skips a question whose `counselBasis` is `'pending'` (a test); a forward `showIf`, a duplicate code; v1 and v2 are registered and v2 is CURRENT; v2's DEFINITION holds all seven keys, and the SERVED v2 skips `death_cause` and
   `death_illness` while their `counselBasis` is `'pending'` (a test) — and 6.27c's sweep AND child's begin path HOLD (`held_config`) while any question of the live version is
   `'pending'` (6.27c AC2b), so a neighbour is ⛔ never texted into a questionnaire with a ruled question hidden;
   `resolveLiveVersion` prefers a Pariwar version over the all-Pariwar one; the contracts wire shape is in lockstep with the domain shape
   (test-only).
3. **AC3 — the schema** (PM4 schema, PM7 (a), PM21 (a)): the migration applies from zero on :5432 AND :5433; the ping columns, `link_code`,
   the REVOKE + column GRANT (a leg proves `UPDATE … SET message_key` refused), both new tables with `pariwar_id`, the composite FK,
   `UNIQUE (pariwar_id, reply_id)`, the structural CHECKs (incl. `recorded` refused, `attempt_count` 0 before begin and `(send_outcome IS NULL) = (attempt_count = 0)`, `locale_source`),
   the ping finished-row trigger (a finished `send_outcome` refused a rewrite; `aging_since` forward-only; `link_code` written once — each a
   direct-SQL policy-spec leg), the indexes, RLS + policies; the answers' trigger holds at ALL times — it admits ONLY an INSERT and a `superseded_at` NULL → non-NULL
   while the reply is open AND in the window (a leg each: a write after Submit refused; outside the window refused; a live answer's
   CODES rewrite refused and its indexes set to a non-NULL value refused while OPEN; a ciphertext-only or indexes → NULL write ADMITTED by the
   erasure arm (a leg that RECORDS it — 0149's limit, ⛔ never claimed refused); `superseded_at` cleared or moved refused), plus the 0143-form erasure arm, which
   refuses ANY other column change and refuses `death_date_window_indexes` to non-NULL (⛔ never a "sentinel
   only" claim — F37); `submitted_at` cannot be cleared; the state list matches `review-window.ts:15` + the live-R9 case (parity test).
4. **AC4 — the writer** (PM7 (b)–(g), PM8): a save takes claim → ping → reply locks; validates against the pinned version; appends and
   supersedes (dependants too); the event is written exactly once at the first `has_died` save, with the CURRENT state and the right actor;
   a later edit writes ⛔ no event and ⛔ never throws the already-answered error; the handler encrypts and indexes BEFORE the locks (⛔ no KMS under a lock — a test asserts the writer receives ciphertext);
   `recordPeerMeshResponse` takes the claim lock itself and `actor` defaults to `'member'` (the existing callers unchanged); accepted in each of
   the five window states incl. after the 72 hours and after the District Admin approved, AND in `state_trustee_approved` with a live R9
   routing; refused (409) in `state_trustee_approved` without one and every closed / refused state (⭐ re-pin 2026-10-12: a leg each for a claim `closed` by 6.28 — OP4's closure at payment commit and OP13's `state_trustee_approved` (live R9 routing) → `closed` by an allowed suspicion appeal (`suspicion_appeal_allowed`)); the inverted jobs test (F39) passes; Submit locks;
   a second Submit is 409; `peerMeshReplyState` answers `none` / `started` / `submitted`; a two-connection save-vs-approval ordering test
   shows ⛔ no collision, ⛔ no deadlock — plus a save-vs-6.28-closure leg (the closure takes the death's intake key, then claim rows; the save ⛔ never takes the intake key).
5. **AC5 — the member surface** (PM11; 6.30's route shell ✅ MERGED): the list is bounded (`clampLimit`) and returns ONLY
   requests whose ping `send_outcome = 'accepted'` (a fixture sets it — ⛔ none exists before 6.27c); detail, PUT and submit answer 404 for a
   ping that was ⛔ never texted exactly as for not-yours / unknown / another Pariwar (one indistinguishable answer — a test per route), and 409
   for closed / submitted;
   ⛔ no Turnstile; the definition carries resolved en + hi words; the screen fills 6.30's shell with the list and the in-screen pages,
   saves each answer with a saved / not-saved line (a failed save retries, ⛔ never lost silently), shows the closing note and the Thank-you
   VERBATIM, shows the dignified not-openable state with the helpline on a 404, makes ⛔ no API call before the session loads, and shows
   ⛔ no claim, family or amount. ⭐ (re-pin 2026-10-12) 6.30's mobile tests are AMENDED in the same change, ⛔ never deleted: the shell stays
   API-free; the slot's no-API leg becomes a no-call-before-the-session leg (Task 5). The screen's header is decided as Task 5 says (a source-scan
   leg). The home card on `app/(tabs)/index.tsx` shows while ≥ 1 request is open and ⛔ never for a ping that is ⛔ not `accepted` (PM2,
   PM11); PM2's notice-strip item follows `NoticeboardStrip`'s one-source banner-lane rule.
6. **AC6 — the helpline** (PM12, PM25 (b)): on 6.3's chain with step-up (⛔ no step-up ⇒ refused); enrolled in `COVERAGE_SET`; the list
   returns ONLY `send_outcome = 'accepted'` pings (a test: a ping with `send_outcome` NULL is absent); the same save / submit shape, and the helpline PUT and submit answer 404
   for a ping whose `send_outcome IS DISTINCT FROM 'accepted'` (a leg each); `saved_via = 'helpline'` per answer; a mixed app + helpline reply works and locks for both at Submit; the operator's view carries only that
   neighbour's answers.
7. **AC7 — the District Admin sees** (PM13, PM25 (c)): the 72-hour line, each neighbour's name, the send status, every live answer with its
   words, submitted or not, how and when it was saved, *"changed N times"*, the call-back mobile when consented (audited, ⛔ no number in the
   audit); a failed decrypt shows *"could not be shown just now"*; the read ceiling is the exact bumped `toBe`; every `send_outcome` value has its
   words; the call-back reveal is audited via `emitAuthAudit`; for an actor holding an un-completed assignment with ⛔ no completed FULL visit,
   the `peerMesh` field is ABSENT (⛔ no variant) and `SignalsPanel` renders ⛔ no peer-mesh section; `SignalsPanel.tsx:318` and the typed specs
   compile with the optional field.
8. **AC8 — erasure** (PM17): erasing the deceased scrubs every SENSITIVE answer row of their claims (live and superseded; `WHERE
   value_ciphertext IS NOT NULL`) to the sentinel and NULLs the date indexes — after Submit and after the claim closed; a non-sensitive row
   keeps its codes; the rtbf completeness pin is TWENTY (the answers table) and the unit statement count 23.
9. **AC9 — ⛔ no PII escapes, and the gates hold:** ⛔ no date, cause, illness or code in an event, log, alarm, audit row or `detail`; the
   decrypt fence covers each new domain module (`FENCED_FILES` bumped); the new route files are classified in the human-actor invariant;
   the list GETs pass forced pagination; the friction-budget declaration and the microcopy scope cover the new mobile files; ⛔ no direct `writeAuditEntry` under
   `apps/api/src/modules/claims/` (access-wrapper-invariants (3)); every new domain list read takes `clampLimit`.
10. **AC10 — the records** (PM16 Rows, PM18, PM19, PM20): Rows 27 / 28 written at their reserved numbers with their conditions; the
    stale comments corrected; the deferred-work items; `pnpm ci:local` green.

## Tasks / Subtasks (6.27a — Task 0 is shared by 6.27a–d)

- [x] **Task 0 — governance FIRST (AC1).** ⛔ No code in any part.
  - [x] 0.1 The Panel's rulings put and transcribed — `2026-10-10-303` (Q1, Q2), `2026-10-10-304` (Q3–Q8).
  - [x] 0.2 The validate's corrections and BigDev's calls recorded — `2026-10-10-305` (`fa2687ce`); the confirm note CF1–CF3 written
        (`trustee-panel-routing-note-2026-10-10-6-27-confirms.md` — owed before Row 27 closes, ⛔ not blocking).
  - [x] 0.0 Branch: rebase / fast-forward the build branch onto the governance tip (or `main` once merged); verify this file reads v2.5 or later.
  - [x] 0.3 Put PM1–PM25 to BigDev — ✅ answered in session 2026-10-10: all as written except PM1 (*"you should replace"*) and PM2
        (*"send through alert as well"* → *"In-app alert only"*); PM16 / PM25 *"Accept all as recommended"*.
  - [x] 0.4 ✅ `2026-10-10-311` (`082ab743`), committed ALONE. ONE author-commit (the next id after `-305`) recording PM1–PM25 as answered AND these author readings: the *"TWT:"* prefix
        dropped (PM3); `no_target:name_too_long` and the unconfirmed Devanagari `{#alphanumeric#}` question — a narrowing of `-303` Q1 A at
        the edge (PM3; FYI in the confirm note; a Row 27 evidence line ⭐ (2026-10-12 annotation — Story 6.34 Task 0.4, TV11 / `-322` C7: ⚠ on STPL / SmartPing the text keeps `{#var#}`; the tag names here are the slot TYPES — 6.34 TV1 / TV11; the answer is recorded ONCE at Row 30 (d) (`-322` C7); Row 27's evidence line POINTS to it)); *"two or more calendar days"* (PM9); the exclusions of PM1; the
        ANSWER WINDOW incl. `state_trustee_approved` under a live R9 routing (PM8, PM5 (iv)); ⛔ no texted neighbour ever sees a ruled
        question skipped — the sweep and the child hold while any is `'pending'` (PM16, PM23, 6.27c AC2b); every ruled question in every `peer_mesh` version from v2 onward, v1 exempt (PM23 — CF3 (a)); the hold on a `'pending'` question in BOTH the sweep and the child (PM23, 6.27c AC2b); the untexted-ping 404 and the helpline gate
        (PM11, PM12); the open-ended inspector wording and *"no FULL visit"* (PM25); PM24's state-gating coarseness; the `detail` grammar
        living in 6.27c (PM4); ⭐ v1 EXEMPT from the seven-key rule and the `ground_inspection` kind's rule left to 6-32 (PM23 (a)); the
        answer window extracted as ONE predicate (PM8); `counselBasis` as a state with the served-definition skip (PM23 (a)) — committed ALONE; stage in the scratchpad, try the insert first
        ([[project_decision_log_writes_user_inserted]]).
  - [x] 0.5 epics.md entries `### Story 6.27a` … `6.27d` (after 6.26b; a dated source line, ⛔ never a merge fence); annotate Story 6.6's AC
        (*"pinged via Story 5.1 dispatcher"* → the ruled text) and Story 6.10's AC2(c) — ⛔ never rewrites. ⭐ 6.27a OWNS these annotations
        (6.27c only checks them).
  - [x] 0.6 Roster Rows 27 / 28 at their reserved numbers (PM16); a line on Row 26 (jobs-db-role) and Row 22's precedent.
  - [x] 0.7 Sprint ledger line ([[project_sprint_status_ledger]], [[project_sprint_status_safe_prepend]]).
- [x] **Task 1 — the questionnaire engine (AC2).** FIRST extract `isRealCalendarDate` into `cycle-calendar/holiday-resolver.ts` (re-exported
      from `nominee-determination-persist.ts`, the same identity — F38), and extract the ANSWER WINDOW predicate into `claim/answer-window.ts`
      (`isClaimInAnswerWindow`; `ground-inspection-persist.ts` re-exports it as `isClaimInGroundInspectionWindow` — same identity; PM8) AND its
      set-based twin `answerWindowSql(claimRef)` (built from `CLAIM_REVIEW_WINDOW_STATES` + `liveRoutedToR9Exists`) with a parity leg over
      every state × routed / not routed. Then `packages/domain/src/questionnaires/` (shape, validator,
      registry, `resolveLiveVersion`, `COMPARABLE_QUESTION_KEYS`, the warning-key list, v1, v2) — pg-free, importing only import-free leaves;
      `questionnaires/index.ts` added as an NW1 entry; the reachability test; the copy keys en + hi in `packages/i18n` (server-resolved);
      the contracts wire mirror + lockstep test; unit tests for every validator rule (incl. v1 registered AND exempt; `health` + `counselBasis`; the served-definition skip). ⛔ Never in `packages/contracts` (F30).
- [x] **Task 2 — the migration (AC3).** Next free number at build (`ls packages/domain/migrations | tail`); hand-authored; journal; applied to
      :5432 AND :5433 and proven from zero; Drizzle schema files (`schema/claim_peer_mesh_pings.ts`, NEW `schema/claim_peer_mesh_replies.ts`
      incl. the answers table); RLS policy files + policy-regression specs (incl. the REVOKE leg, the ping finished-row trigger legs, the
      0143-form erasure arm and its RECORDED admissions, the answers trigger's all-times legs, the plpgsql window parity test against
      `isClaimInAnswerWindow`, `submitted_at` forward-only, `UNIQUE (pariwar_id, reply_id)`); the new field class
      `PEER_MESH_ANSWER_FIELD_CLASS` (anonymize literal, `apps/api/src/context.ts`); ⛔ no `detail` grammar here (6.27c); ⛔ never regenerate an
      applied migration ([[project_live_db_test_gotchas]]).
- [x] **Task 3 — the writer (AC4).** A NEW domain module (`packages/domain/src/claim/peer-mesh-reply.ts`) with the save and submit paths,
      `peerMeshReplyState` and the event-response MAPPING (⛔ never in `questionnaires/`); the handler-side encrypt + index helper (⛔ no KMS
      under a lock); `recordPeerMeshResponse` widened (the answer window incl. live R9, CURRENT state, `actor` defaulting to `'member'`, the
      claim lock taken inside) and called only on the first `has_died` save; the inverted jobs test (F39); the supersede write order; the lock order; the shared date-window helper (`addCalendarDays`, `isRealCalendarDate`); unit + integration tests
      incl. every state in / out of the window; a 409 leg each for a claim closed by 6.28 (OP4 at payment commit; OP13's allowed suspicion
      appeal on a `state_trustee_approved` + live-R9 claim); the two-connection save-vs-approval ordering test AND the save-vs-closure leg
      (`closeClaimsOfPaidDeath` takes the death's intake key, then claim rows; the save ⛔ never takes it) (separate committed transactions —
      [[project_db_clock_ordering_tests_tie]]).
- [x] **Task 4 — the member API (AC5).** `claims.peer-request.member.routes.ts` + handlers + contracts + api-client factory
      (`createMemberPeerRequestClient`); 404 / 409 rules incl. the untexted-ping 404 on every route; `clampLimit`; bounded `limit`; `perMemberKey`; ⛔ no Turnstile; the human-actor classification;
      route tests incl. the three indistinguishable 404s.
- [x] **Task 5 — the mobile screens (AC5).** Fill 6.30's shell `app/(peer-request)/peer-request.tsx`: the list, the generic renderer, the
      in-screen pages, the saved line, the closing note and the Thank-you, the not-openable state with `CallHelplineCTA`, ⛔ no call before
      the session; the home card on `app/(tabs)/index.tsx` and PM2's notice-strip item (11a.5's `NoticeboardStrip`); chrome strings in `packages/i18n/locales/{en,hi}/claim.json` (a `$comment.peer_request` marker; read through `useClaimT()` — depend on `locale`, never `t`); source-scan
      and pure-logic tests (the mobile harness renders ⛔ no screen); the friction-budget declaration; the microcopy scope.
      ✅ 6.30's route shell is MERGED (row `6-30` `done`) — ⛔ never create a second route file ([[feedback_circular_deferral_between_sibling_stories]]).
      ⭐ Re-pin 2026-10-12 — what 6.30 actually shipped, and what Task 5 owes it:
      - The shell (`app/(peer-request)/peer-request.tsx:20-23`) renders `<PeerRequestSlot code={code} />`; the placeholder
        `components/peer-request/PeerRequestSlot.tsx` (*"6.27a may replace or remove it"*) renders `peer_request.placeholder` and
        `CallHelplineCTA` and makes ⛔ no call. Fill or replace the slot; a present `c` renders the list (6.27c wires the resolver to `code`).
      - AMEND `apps/mobile/tests/unit/app-link-route-map.test.ts` in the same change: `:78-80` (reads `PeerRequestSlot.tsx` by
        path when the describe is defined — re-point it if the slot is renamed or removed, or the whole describe fails); `:83-86` (the
        shell's slot line) to the new shape; `:88-92` RE-SCOPED — the shell stays API-free, the slot gains a "⛔ no call before the session
        has loaded" leg; KEEP `:44-47`, `:49-53`, `:56-60`, `:62-73`, `:94-96`.
      - The session gate: the root guard returns early while `isLoading` (`app/_layout.tsx:116`) but the `<Stack>` still renders (`:153`) ⇒
        the screen gates on `useSession()` itself (`lib/session-context.tsx`).
      - The header: the root Stack hides only the group's OUTER header (`-315` C8; `app-link-route-map.test.ts:94-96`); the group's inner
        `<Stack />` (`(peer-request)/_layout.tsx:8-10`) shows a default header unless the screen hides it — today the placeholder does
        (`PeerRequestSlot.tsx:24`), so replacing the slot without that line shows a header titled with the raw route name. Decide it (keep it
        hidden and give the in-screen pages their own back affordance, or show it with a translated title), with a source-scan leg.
      - `peer_request.placeholder`: keep it, or retire it AND update `not-found-copy.test.ts:13`, `common.json` `$comment.app_links` (en / hi
        `:413`) and Row 28's scope (Task 0.6; 6.30's Row 29 (h) points there). 6.30's copy already promises the home card (`app-links.json`
        `body.home_screen`; `common.json` `peer_request.placeholder`) — the card is load-bearing.
- [x] **Task 6 — the helpline (AC6).** `claims.peer-request.helpline.routes.ts` + handlers on 6.3's chain, enrolled in `COVERAGE_SET`; the
      list gated on `send_outcome = 'accepted'`; the PUT and submit 404 for an untexted ping; the admin panel on the member-lookup screen;
      tests incl. ⛔ no step-up ⇒ refused, the mixed reply, a NULL-outcome ping absent, and the PUT / submit 404 legs.
- [x] **Task 7 — the District Admin's view (AC7).** `assemblePeerAnswers` (actor-aware); the console contract (`PeerMeshTranscript` gains
      `outcome`, `windowExpiresAt`, per-ping `sendStatus`, `responderName`, the answers, the call-back mobile; `peerMesh` OPTIONAL);
      `PeerMeshView` (⛔ no section rendered when `peerMesh` is absent); `SignalsPanel.tsx:318` and the typed specs
      (`verifier-console-shape.spec.ts:431,494`, `verifier-console.spec.ts:413,918-920`) updated for the optional field (F41); the call-back reveal audited via `emitAuthAudit` (a new
      `AuthAuditEventType` member); the read-ceiling bump FROM 23 with an exact `toBe` at all four sites (F12); `claims-verifier-console.test.ts:255` stays; contracts vitest
      ([[project_contracts_tests_outside_tsc]]).
      ⭐ Re-pin 2026-10-12 (6.28): new `VerifierConsolePacket` fixtures carry the REQUIRED `otherClaimsForDeath` / `finallyApprovedElsewhere`;
      the admin test renders `SignalsPanel` through its `QueryClientProvider` wrapper (`apps/admin/tests/verifier-console.test.tsx:33-42`)
      and `:177` asserts the section PRESENT — the absent-field leg is NEW; the view stays in section (c) (`SignalsPanel.tsx:316-323`), above
      6.28's `OtherClaimsForDeathNotice` (`:401`) and banner (`:406-411`) — ⛔ never touch those; a test seeding two OPEN claims of one
      deceased now raises `other_claim_for_death` (an approval then needs a reason code and a note — `verifier-console-shape.spec.ts:276-287`).
- [x] **Task 8 — erasure, fences, gates (AC8, AC9).** `member/anonymize.ts` (the scrub `WHERE value_ciphertext IS NOT NULL`) + the rtbf pin
      (TWENTY; the unit count 23; the no-claims leg 21); `FENCED_FILES` bumps + the decrypt-fence arm for
      `peer-mesh-reply.ts`; the human-actor classifications; forced pagination; ⛔ no PII in events / logs / audit (assertions).
- [x] **Task 9 — records and close (AC10).** 9.1 the stale comments (PM18); 9.2 deferred-work: 6.10's item updated, GI13's erasure item gains
      the two tables, PM19's item, PM20 on the zero-candidate item, the family-member item (PM1); 9.3 Rows 27 / 28 (if Task 0.6 did ⛔ not);
      9.4 a pointer on row 6-22 for PM1's residual (6.27a OWNS it; 6.27c only checks it); 9.5 this file's Change Log + File List; 9.6 `pnpm ci:local` green — run it,
      paste the summary, ⛔ never claim it.

### Review Findings

Code review 2026-10-12, against `51b9000a..3f9e7c42`, story v2.13. Full review: Blind Hunter, Edge Case Hunter and Acceptance Auditor, followed by parent verification. **0 decision-needed, 12 patch, 0 defer; 3 candidates dismissed.** BigDev selected option 1, apply every patch. The descriptions and verdict table below preserve the original review evidence; the fix record follows them. All items are engineering against the stated behavior; no Panel ruling is needed. Sending, warnings, later-approver views and inspector discrepancies remain the explicitly deferred 6.27c / b / d scope.

- [x] [Review][Patch] **R1 — HIGH: isolate the member's request cache and exclude decrypted answers from persistence** [`apps/mobile/components/peer-request/usePeerRequestQueries.ts:16`]. Both list and detail keys omit the member identity, and inherit the singleton client's one-hour freshness / seven-day retention. `SessionProvider.signOut` does not clear that client. Member B signing into the same Pariwar on the same handset therefore receives member A's cached list and can open A's cached detail without an authorization request. The detail also omits `gcTime: 0`, the Provider's explicit exclusion from MMKV persistence, so decrypted dates / health answers are persisted. Violates Invariant 7, AC5's owner-only surface, and checklist families 3 / 6 / 12. **Runtime verified** with the actual hook options and real QueryClient: B received A's answers; API fetch count remained one; the plaintext date appeared in dehydrated state. Scope keys to the authenticated member, opt these sensitive reads out of persistence, and remove obsolete peer-request cache entries on restoration / account change.

- [x] [Review][Patch] **R2 — HIGH: order autosaves and prevent obsolete retries / responses from replacing newer choices** [`apps/mobile/components/peer-request/PeerQuestionnaire.tsx:108`]. Every tap starts an independent loop and fresh key. If A fails before reaching the server, B succeeds, then A retries, A becomes the final stored answer. A delayed response also replaces the entire answer map at line 120, reverting newer choices even when database order was correct. Optimistic parent answers expose dependent questions before their prerequisites commit, so a date save can be rejected with `condition_not_met`. Violates AC5 / PM7(b) / PM11 and family 2. **Runtime verified** for the obsolete retry: `not_died` became `died` after the earlier failed request retried. Serialize saves for the reply, preserve newer optimistic intent while acknowledging responses, and order conditional answers after their parents.

- [x] [Review][Patch] **R3 — HIGH: wait for all helpline saves before Submit locks the reply** [`apps/admin/src/modules/helpline-claims/HelplinePeerRequests.tsx:180`]. Submit is disabled only for a missing previously saved `has_died` or its own pending request. An operator can edit an answer and immediately submit while that PUT is still pending; Submit can acquire the claim lock first, making the correction fail with `peer_request.submitted` and permanently excluding it. Violates AC6 / PM7(b), (d) / PM12. **Runtime verified** from the actual card source: Submit remained enabled and ran while a correction was unresolved. Track every pending save, block Submit until all succeed, and retain failed corrections for recovery.

- [x] [Review][Patch] **R4 — MEDIUM: recover from a transient Submit failure** [`apps/mobile/components/peer-request/PeerQuestionnaire.tsx:182`]. Network errors, 5xx, rate limits and in-progress conflicts set `saveLine = 'retrying'`; `busy` then permanently disables Submit. No submit retry is scheduled and no enabled retry control is shown. Violates AC5 / PM7(d) / PM11. **Runtime verified**: after a network failure, Submit was disabled, call count was one and retry-timer count was zero. Separate submit error state from answer-save state and retry with the same submit key, automatically or through an enabled control.

- [x] [Review][Patch] **R5 — MEDIUM: keep detail cache consistent with saves and submission** [`apps/mobile/components/peer-request/usePeerRequestQueries.ts:31`]. Saves neither update nor invalidate the detail query; Submit invalidates only the list. Reopening a request within the inherited one-hour freshness window initializes the component from old GET answers, with no new request. Even a later detail refresh does not rerun the `useState` initializer at `PeerQuestionnaire.tsx:89`. Saved answers appear absent or outdated, and cached submitted details can appear editable. Violates AC5 / PM11. Update the owner-scoped detail cache from save results, invalidate it on submission, and reconcile authoritative refreshes without discarding pending local choices. This consistency issue is distinct from R1's access / persistence boundary.

- [x] [Review][Patch] **R6 — MEDIUM: a rejected answer must remain visibly unsaved** [`apps/mobile/components/peer-request/PeerQuestionnaire.tsx:131`]. A 422 retains the optimistic answer and then unconditionally changes the line to `saved` when pending reaches zero. The closing page does not render the validation notice. A member can proceed believing an absent answer was saved. Violates AC5's saved / not-saved behavior and PM7(b). **Runtime verified**: a rejected `not_died` remained selected while the line became `saved`. Roll back or explicitly retain an unsaved edit, expose its error on the closing page, and block submission until its disposition is clear.

- [x] [Review][Patch] **R7 — MEDIUM: Back must not abandon a failed answer's retry** [`apps/mobile/components/peer-request/PeerQuestionnaire.tsx:212`]. Page-one Back calls `onBack()` during saving / retrying. Unmount sets `mounted.current = false`, stopping the loop; nothing retains the pending answer or key. A failed save is lost on this ordinary navigation path. Violates AC5's “a failed save retries, never lost silently” requirement. Prevent leaving with unresolved saves or retain the pending work across the in-screen navigation; do not place decrypted sensitive values in the general persisted query cache.

- [x] [Review][Patch] **R8 — MEDIUM: bind each answer's claim to its reply's claim in the database** [`packages/domain/migrations/0156_claim-peer-mesh-replies.sql:167`]. The answer's reply and claim FKs validate independently. The trigger reads submission status from the reply, but checks `NEW.claim_case_id` for the answer window. Under `twt_app`, an unsubmitted reply belonging to a closed claim accepts an answer naming another open claim in the same tenant. It also misattributes claim-based erasure and subsequent reads. Violates AC3 / PM7(a) / PM8 and families 1 / 5 / 12. **Live PostgreSQL verified**, with rollback. Add a composite ownership FK or equivalent trigger assertion. The current domain writer supplies consistent IDs; this finding concerns the promised database backstop, not a demonstrated HTTP exploit.

- [x] [Review][Patch] **R9 — MEDIUM: bind reply selection and ping ownership across tenant / claim / responder** [`packages/domain/migrations/0156_claim-peer-mesh-replies.sql:118`]. The selection and ping FKs use their single-column IDs. Tenant RLS on the new reply does not establish that those referenced resources belong to its tenant or claim. **Live PostgreSQL verified**: `twt_app` scoped to Pariwar A inserted a reply using A's claim and B's selection / ping; B's legitimate reply then failed with `23505` because the ping was reserved. All writes were rolled back. Violates AC3's tenant backstops and families 3 / 5 / 12. Bind the reply to the ping's tenant, selection and responder, and the selection to the claim. Current HTTP writers construct matching IDs; no HTTP exploit is claimed.

- [x] [Review][Patch] **R10 — MEDIUM: preserve an unavailable saved answer in the owner / operator wire view** [`apps/api/src/modules/claims/peer-request-core.ts:155`]. A failed decrypt leaves no map entry; `toWireAnswers` silently skips that stored answer. Both member detail and helpline list therefore present a saved sensitive answer as unanswered. Violates shared Invariant 8 (“could not be shown just now”, never blank). The staff assembler correctly represents `unavailable`; the owner/operator contract needs an equivalent state and explicit rendering. This differs from the disclosed fail-closed save refusal when a live answer is undecryptable, which remains a recorded limitation.

- [x] [Review][Patch] **R11 — MEDIUM: preserve ping correlation in the durable callback-disclosure audit** [`apps/api/src/modules/claims/claims.verifier-console.handlers.ts:1210`]. `ping_id` appears only in `context`; the resource locator names only the claim. The production sink hashes context into `request_payload_hash` and stores no context fields (`audit-log-sink.ts:119`). The durable row cannot name which neighbour's mobile was shown, contrary to PM13's actor / claim / ping requirement and family 8. Include the ping in an accepted, non-PII resource locator and assert the persisted audit row. The current console test captures the showing callback, not this durable correlation.

- [x] [Review][Patch] **R12 — MEDIUM: preserve consecutive helpline multi-select choices before refetch** [`apps/admin/src/modules/helpline-claims/HelplinePeerRequests.tsx:156`]. Each tap derives its value from `item.answers`, which changes only after save / refetch. Tapping options A and B before that round trip sends `[A]` and `[B]`, rather than `[A, B]`; the later save drops A. Violates the generic questionnaire renderer / same save shape in AC6 / PM12. **Latent while the health questions have pending counsel basis**; once the existing illness question is served, it is reachable without an app release. Maintain local selections and serialize acknowledgements, including exclusive options; test rapid consecutive taps with delayed saves.

Verification: **187 existing focused tests passed across 13 files** — mobile (28), pure domain (42), admin (53), domain PostgreSQL (51), API PostgreSQL (13). The domain DB tests first failed because the sandbox denied the socket (`EPERM`); the authorized rerun passed. No full `ci:local` rerun or device / native screen-reader validation was performed for this review.

Additional evidence: `/private/tmp/twt-6-27a-ui-repro.cjs` executes transpiled current component / hook source with stubbed platform hooks and the real QueryClient. It verifies R1, R2, R3, R4 and R6; it is not a device-render test. `/private/tmp/twt-6-27a-db-repro.cjs` verifies R8 / R9 against :5433 as `twt_app` in a single rollback-only transaction. Its first fixture run failed on an uncast enum array; the corrected run produced both admissions and B's `23505`. These temporary probes are session artifacts, not committed regression tests.

Checklist verdicts for touched families:

| Family | Verdict / evidence |
|---|---|
| 1 — state guards | **REAL GAP R8**; matching-ID window / R9 / OP4 / OP13 cases covered by `peer-mesh-reply.spec.ts`. |
| 2 — concurrency / idempotency | **REAL GAP R2 / R3**; domain lock ordering covered by the four two-connection `peer-mesh-reply-concurrency.spec.ts` tests. |
| 3 — tenant / actor boundaries | **REAL GAP R1 / R9**; member indistinguishable-404 and helpline permission / step-up legs pass in the API suites. |
| 4 — event completeness | **Covered-by-test:** first-answer event tests in `peer-mesh-reply.spec.ts` assert current state, responder and actor; the existing projector supplies deceased correlation by construction. |
| 5 — DB backstops | **REAL GAP R8 / R9**; the other grants, CHECKs, uniqueness, RLS, triggers and parity are covered by the 19 migration policy-regression tests. |
| 6 — projections / privacy | **REAL GAP R1 / R5 / R10**; wire fields are otherwise explicitly picked and reply versions pinned by construction. |
| 7 — aggregates | **Covered-by-test:** open-list filtering in `peer-mesh-reply.spec.ts`, change counts in `peer-answers-console.spec.ts`, dependant superseding in the domain suite. |
| 8 — audit / attribution | **REAL GAP R11**; server actor attribution and compensating-audit wrappers are used by construction. |
| 9 — deliberate bypasses | **Covered-by-construction:** the helpline's documented `memberId = null` matches the specified tenant-scoped, ping-only routes. Extra caller binding is not constructible from that API shape and is not asserted as delivered. |
| 10 — closure honesty | **Covered-by-construction:** pending counsel, erasure-arm admissions, responder-erasure uncertainty, deferred sibling work and absent device proof are disclosed. |
| 12 — ownership | **REAL GAP R1 / R8 / R9**; member HTTP writes otherwise validate owner / tenant / resolved state before mutation. |
| 13 — accessibility | **Covered-by-construction for inspected controls:** real handlers, alert notices and a polite save live region. Actual native announcements are **not constructible in the checked-in harness**; no claim of device coverage. |

Family 11 is untouched. Dismissed candidates: a legacy event-only UI fallback without a demonstrated reachable historical response in this rollout; pagination beyond the explicitly specified cap of five; and an unverified shell failure-path candidate in CI changes that predate the 6.27a implementation (`7120ac20` / `7ce9154a`). Duplicate retry / stale-response / prerequisite findings were consolidated into R2; cache persistence and account-isolation findings into R1. No review layer failed.

#### Review fix record — 2026-10-12

- **R1 / R5:** request query keys now include both Pariwar and member, with zero freshness / retention; sensitive queries and mutation variables are excluded from persistence. Restoration removes legacy entries and immediately rewrites storage. Sign-in, sign-out and session termination clear peer data. Save responses update only existing detail entries; Submit updates submitted state and invalidates detail / list; the editor reconciles settled refetches, including date text and newly hidden failed dependent drafts.
- **R2 / R6 / R12:** mobile and helpline share an in-memory FIFO editor. Each retry preserves its idempotency key; acknowledgements retain newer drafts; prerequisites save before dependent answers. Rejected edits stay visibly unsaved and prevent Submit; hidden dependent failures are discarded when their parent changes. Helpline multi-select reads current local choices, including rapid consecutive taps.
- **R3 / R4 / R7:** Submit waits for every save to succeed; controls are also locked throughout Submit so a later edit cannot race it. A failed Submit remains retryable with the original key. Unresolved edits guard mobile Back / route departure and helpline navigation / caller changes; helpline failed saves have an enabled retry control. A transient background refresh preserves the loaded editor and its queue, with a helpline refresh / step-up notice. Authentication redirects and permission refusals remain available.
- **R8 / R9:** additive migration **0157** binds answer → reply → claim and reply → selection / ping / responder / tenant, with a ping → selection ownership backstop. Schema definitions match. Applied to both :5432 and :5433; every migration was then applied from zero in a temporary database on each instance and the four ownership constraints verified. Migration 0156 was not rewritten.
- **R10:** the response contract preserves `{ unavailable: true }` for an unreadable stored answer; member and helpline render its notice. The write contract still rejects that output-only marker. The existing fail-closed save refusal remains documented.
- **R11:** callback-disclosure audit locators name both claim and ping. A real route event is passed through the production sink and the persisted row checked for actor / claim / ping correlation without the phone.

**40 new regression tests** cover the shared editor (10), mobile cache (6), rendered mobile questionnaire (9), response/write contract distinction (1), live database ownership (3), live member / helpline unavailable answers (2), durable audit sink (1), helpline card (7) and caller-change guard (1). Follow-up review also exercised the reverse Submit race, stale errors, date refetch, background refresh failures and editor Strict Mode lifecycle. Mobile rendering uses real React DOM with native primitives stubbed; no device, native screen-reader announcement or FR95 timing measurement is claimed. The four new English / Hindi recovery strings remain within Row 28's human-review hold; friction-budget.md records the changed departure / retry behavior.

**Verification complete:** `pnpm ci:local` with `DATABASE_URL` pointing to :5433 passed **36/36 jobs**, including live domain (354 files / 5047 passed, 1 skipped), API (158 / 1644 passed, 1 skipped), jobs (57 / 797) and the other integration packages. The final three editor / refresh recovery fixes landed after that run's static stage; their targeted tests and lint / typechecks passed, then `env -u DATABASE_URL pnpm ci:local` passed **34/34 static jobs** on the final code. The latter run intentionally skipped the already-passed live leg; those last changes affect only the UI / client editor. Logs: `/private/tmp/twt-6-27a-ci-local-green.log` and `/private/tmp/twt-6-27a-ci-local-static-final.log`. `git diff --check` passed. All twelve original patches are resolved, with no remaining HIGH / MEDIUM review item; story and sprint row → `done`. These review fixes are uncommitted. Rows 27 / 28 and the device go-live proof remain open; b / c / d remain backlog.

#### Review Findings — second pass, group 1 of 3: domain / migrations / jobs (2026-10-13)

Second-pass code review on `story/6-27a` at `618566d3` (which includes the first review's fixes), diff `7120ac20..HEAD`, run in three chunks. **Group 1** = `packages/domain`, `apps/jobs`, `packages/queue`, `scripts` (39 files, 4,288 diff lines). Group 2 (API, contracts, api-client) and Group 3 (mobile, admin, i18n) follow. Three parallel layers ran, then parent verification. **1 decision-needed, 7 patch, 3 defer; 17 dismissed.** None of these needs the Panel: the one decision is BigDev's own author-commit (`-308`), not a disclosure, debt, or legal-basis question.

- [x] [Review][Defer] **S1 — `-308`'s obligation on 6.27a (show each answer's SOURCE) is neither built nor recorded** — ⭐ RESOLVED 2026-10-13, BigDev option (a) — recorded as [`2026-10-13-325`](../../.decision-log.md#decision-2026-10-13-325) S1 A: HANDED OFF to row 6-36 (its sprint-status comment and a deferred-work item carry it). Reason: the value cannot exist until 6-36 stores it on the selection. Original finding: `2026-10-10-308` call 1: each neighbour's answer carries its source, `workplace` or `named_by_member`, "stored on the reply and shown … (the District Admin's console, 6.27a PM13 …)". Its Consequences: "6.27a PM7 (the reply) and PM13 (the console) … show it". 0156's `claim_peer_mesh_replies` has no source column, and PM7 / PM13 never mention it. There is no deferred-work item and no epics entry; the only trace is the sprint ledger `2026-10-10s` ("Row 6-36 builds both"). The value cannot exist until row 6-36 (backlog) stores it on the selection. Options: (a) record the hand-off: a deferred-work item, plus a row 6-36 note that 6-36 also adds the reply's source and the PM13 console line; (b) build a nullable source column and a console line now, which shows "not recorded" until 6-36 fills it. Checklist family 10 (closure honesty).
- [x] [Review][Patch] **S2 — MEDIUM: the validator checks that the ruled keys are present, not how they are classified; a date question on any key except `death_date` passes the validator but fails the DB CHECK** [`packages/domain/src/questionnaires/validator.ts:135`]. Classification: from v2 onward, a version that keeps `death_cause` / `death_illness` with `health: false, sensitive: false, counselBasis: null` passes validation, so their answers would be stored as plaintext codes, served without counsel's basis, and escape 6.27c AC2b's `'pending'` hold. The validator also never requires `warning: true` on `has_died` / `death_date`, so a version could drop both warnings (`-308` item 2's "a 'they have not died' warns every approver"). PM23 (a) says row 6-33's database-backed versions inherit the validator's rules, so the classification must be enforced there. Date questions: `checkAnswer` returns `dateWindow` for every `kind: 'date'` question (`answers.ts:74`), while 0156's `indexes_check` admits indexes only when `question_key = 'death_date'`, so every dated answer to such a question gets a 23514 (500). Fix: pin the ruled keys' `health` / `warning` classification for v2 onward, and refuse a `date` question on any key other than `death_date` (or emit `dateWindow` only for `death_date`). Sources: auditor, blind, edge.
- [x] [Review][Patch] **S3 — MEDIUM: the live parity of the set-based answer window (`answerWindowSql`) is never tested, and the unit test cites a spec file that does not exist** [`packages/domain/tests/claim/answer-window.test.ts:2`]. The header says the SQL twin's live parity "is in tests/integration/claim-peer-mesh-replies.spec.ts"; no such file exists. The parity describe in `rls/claim-peer-mesh-replies-policy-regression.spec.ts:334` compares the plpgsql function with `isClaimInAnswerWindow`, never `answerWindowSql`. The only live caller (`listOpenPeerRequestsForMember`) is tested in three states, never under an R9 routing. The twins are equal today by construction (shared `CLAIM_REVIEW_WINDOW_STATES` / `liveRoutedToR9Exists`), but PM8 / Task 1 promise a parity leg. Add `answerWindowSql` to the live parity leg (every state × routed / not routed) and correct the cited path. Checklist families 1 and 10. Sources: auditor, blind.
- [x] [Review][Patch] **S4 — MEDIUM-LOW: no DB backstop ties the sensitive keys to a ciphertext, and the erasure scrub filters on the ciphertext** [`packages/domain/migrations/0156_claim-peer-mesh-replies.sql:171`]. `one_value_check` requires exactly one value form; nothing requires `death_date` / `death_cause` / `death_illness` to be stored encrypted. A plaintext `value_codes` row for those keys passes every CHECK and the trigger, and `anonymizeMember`'s `WHERE value_ciphertext IS NOT NULL` would leave it after erasure. Today only the one TS writer prevents this. Fix: an additive migration with `CHECK (question_key NOT IN ('death_date','death_cause','death_illness') OR value_codes IS NULL)` plus a policy-spec leg; 0156 is never rewritten. Checklist family 5. Source: blind.
- [x] [Review][Patch] **S5 — LOW: the helpline's bypass of the owner check carries no DELIBERATE block** [`packages/domain/src/claim/peer-mesh-reply.ts:171`]. `memberId: null` means "any texted ping in scope" for `readPeerRequest` / `lockForWrite` / `savePeerAnswer` / `submitPeerReply`. It is described only in prose, and PM25 (b)'s "only the neighbour on the phone" then rests on the UI. Family 9 requires a marked DELIBERATE block with its rationale (PM12's ping-only routes) and a re-examination trigger. The first pass recorded this as covered-by-construction; this pass finds the marker itself missing. Source: auditor.
- [x] [Review][Patch] **S6 — LOW: the new tables' indexes are never asserted directly** [`packages/domain/tests/integration/rls/claim-peer-mesh-replies-policy-regression.spec.ts:204`]. No test names `claim_peer_mesh_replies_claim_idx`, `claim_peer_mesh_reply_answers_live_reply_idx` (load-bearing for 6.27b's bulk warning readers, PM7 (a)) or `claim_peer_mesh_reply_answers_claim_idx`. The live partial UNIQUE is covered only by its 23505 behaviour. Add `pg_indexes` legs (definition and predicate). Checklist family 5. Source: auditor.
- [x] [Review][Patch] **S7 — LOW: `readLivePeerAnswers` has no `clampLimit`** [`packages/domain/src/claim/peer-mesh-reply.ts:238`]. AC9 says every new domain list read takes `clampLimit`. The read is bounded by construction (one live row per question per reply), but the domain-accessor gate only scans dynamic `.limit()` calls, so it cannot see the gap. Add a clamped limit (cap = the question count bound). Source: auditor.
- [x] [Review][Patch] **S8 — LOW: three test legs cannot fail on the thing they name** [`apps/jobs/tests/claim-peer-mesh.test.ts:588`]. (a) "the label is NOT recounted" never re-runs the window worker after the late response, so `outcome` cannot change and the assertion is a tautology. Re-run the window handler, then assert the outcome and the event count. (b) The open list's "clamped" leg (`peer-mesh-reply.spec.ts:394`) seeds one row; the cap of 5 (`PEER_REQUEST_LIST_CAP`) is never exercised. (c) Every reply spec pins v2, so no leg proves that a reply pinned to `peer_mesh.v1` is validated against v1 (e.g. `how_known` refused). Source: blind.
- [x] [Review][Defer] **S9 — the erasure scrub is not serialized with the reply writer, and saves after erasure are not refused** [`packages/domain/src/member/anonymize.ts:307`] — deferred, reachability unproven. The answers scrub takes no claim lock, and `lockForWrite` does not check whether the deceased is anonymized. A save that commits during or after the scrub could store a fresh Tier-1 answer about an erased member. `anonymizeMember` runs only for a `withdrawn` member; nobody has traced whether a withdrawn member can be the deceased on an in-window claim. The 6.26 ground-inspection scrub has the same shape (GI13).
- [x] [Review][Defer] **S10 — "changed N times" counts removals by a parent answer, and re-entry of the same value** [`packages/domain/src/claim/peer-mesh-reply.ts:548`] — deferred to 6.27b PM24 (which reuses the assembler). `versions` counts every row for the question. A date cleared as a dependant (`has_died` → `not_sure`) and then re-entered unchanged shows "changed 1 time". PM13 does not define whether a removal and re-entry counts as a change; settle that when 6.27b reuses the count.
- [x] [Review][Defer] **S11 — the ping's delivery columns are free while `attempting`** [`packages/domain/migrations/0156_claim-peer-mesh-replies.sql:78`] — deferred to 6.27c (its writer). Under the finished-row trigger, `attempt_count` can decrease and `first_detail` / `claimed_*` can be rewritten while `send_outcome = 'attempting'`. That is RN7's lease re-claim window, and 6.27c's writer and its detail grammar own it (PM4).

Dismissed (17), each verified against the code: the erasure arm admits a rewrite of a live ciphertext / NULLs the indexes (RECORDED, 0149's limit, v2.3); the writer stores the handler's ciphertext without re-deriving it (by design: KMS and the keyed indexes run before the locks, PM7); a response accepted for a `skipped` selection (unreachable: `skipped` arises only with zero selected, so the not-selected guard refuses); the window label recounted by a late response (`resolvePeerMeshOutcome` guards `WHERE outcome = 'pending'`, so it is monotonic); the event carrying only the first `has_died` (RECORDED); the replies trigger enforcing no window on Submit / insert (the answers trigger and the writer's claim lock hold it; an empty reply row is inert); the plpgsql window read without a lock (the only writer holds the claim lock); `isPeerSectionHiddenFromActor` failing open (`scheduled` is the only non-terminal status; `inspection_stage` is NOT NULL); `readPeerNeighbourContacts` truncating (≤ 5 selected; the KYC / identity joins are 1:1); `readPeerAnswersForClaim`'s LIMIT on joined rows (≤ 5 × 7 = 35 < 100); `actorId` defaulting to the responder (the only caller passes both); an undecryptable / erased live answer making saves 409 (RECORDED); the duplicate single-column FKs and the Drizzle schema omitting 0156's FKs (hand-authored migrations, snapshots end at 0020, no runtime effect); `askedAt` drifting (the finished-row trigger freezes `send_updated_at` once `accepted`); the RTBF leak loop (line 92 decrypts to the sentinel, so that test has teeth); the concurrency spec's `saved_at` check (the `event_version` assertion carries it); a reply pinned to an unregistered version (registry versions are never removed). No review layer failed.

Checklist verdicts (group 1, touched families):

| Family | Verdict / evidence |
|---|---|
| 1 — state guards | **Covered-by-test:** `peer-mesh-reply.spec.ts` "the answer window (PM8)" (5 review states and R9-routed accepted; denied / appeal / approved / settled / closed refused; OP4 / OP13) and the plpgsql ⇔ TS parity. **REAL GAP S3** (the SQL twin). |
| 2 — concurrency | **Covered-by-test:** `peer-mesh-reply-concurrency.spec.ts` (save ↔ approval, save ↔ 6.28 closure, both orders). App + helpline first-save race **covered-by-construction** (claim row FOR UPDATE first). |
| 3 — tenant / actor | **Covered-by-test:** indistinguishable not-found (other Pariwar / other member), RLS cross-tenant and unscoped probes, 0157 cross-tenant legs. Per-route actor denial is group 2's. |
| 4 — event payload | **Covered-by-test:** first-save event carries the current state, actor, responder and response; a 6.6-era event means no second one. |
| 5 — DB backstops | **Covered-by-test:** CHECKs, REVOKE + column GRANT, triggers, 0157 FKs, RLS ENABLE + FORCE. **REAL GAP S4, S6.** |
| 6 — projection | **Covered-by-construction:** field-picked reads; `questionnaire_version_id` / `saved_by_actor_id` frozen by trigger. `readLivePeerAnswers` returns whole rows, so group 2 must check the wire mapping. |
| 7 — aggregates | **Covered-by-test:** the open-list filter. The `versions` count's meaning is deferred as S10. |
| 8 — audit | **Covered-by-construction:** the answer row and the event are written in one tx; operator attribution tested. Audit rows are group 2's. |
| 9 — deliberate bypass | **REAL GAP S5.** |
| 10 — closure honesty | **REAL GAP S1, S3.** |
| 12 — ownership | **Covered-by-test:** the ping id is checked against Pariwar, member and texted; a submitted reply refuses changes (writer and trigger). Helpline residual: S5. |

#### Review Findings — second pass, group 2 of 3: API / contracts / api-client (2026-10-13)

**Group 2** = `apps/api`, `packages/contracts`, `packages/api-client`, diff `7120ac20..618566d3` (25 files, 2,809 diff lines). Three parallel layers ran, then parent verification. **1 decision-needed, 15 patch, 0 defer; 14 dismissed.** BigDev ruled 2026-10-13 that every patch from every group is applied together at the end. The one decision is BigDev's: it would change PM12's committed route shape. It is not the Panel's.

- [x] [Review][Patch] **S12 — MEDIUM: helpline PUT / submit are not bound to the neighbour on the phone, and the helpline list's Tier-1 read is unaudited** [`apps/api/src/modules/claims/claims.peer-request.handlers.ts:73`] — ⭐ DECIDED 2026-10-13, BigDev option (a) BIND AND AUDIT — recorded as [`2026-10-13-325`](../../.decision-log.md#decision-2026-10-13-325) S12 A: add `:memberId` to the helpline PUT / submit paths (routes, contracts, admin client), pass it to the domain's `visible()` (a ping of another member is the SAME 404), add a read-audit line on the helpline list, and amend PM12's route text to match (a spec edit propagated to the Task, ⛔ never a silent drift). Original finding: `helplineCtx` returns `memberId: null` (`claims.peer-request.handlers.ts:73`), so `helplineSave` / `helplineSubmit` act on ANY texted ping in the Pariwar by `:pingId` alone. The domain's `visible()` admits `memberId === null`. The PUT response returns that ping's answers, decrypted. The only binding to the caller is the admin UI's identity-confirmed flag. The list (`:memberId`) returns the deceased's name and the decrypted date / cause / illness with NO read audit, whereas comparable reads are audited (`admin_verifier_console.read`; `admin_claim.contact_details_read`, `claims.contact.handlers.ts:324`). This conflicts with PM25 (b) ("ONLY the answers of the neighbour they are recording"), but PM12 specified the ping-only paths. Options: (a) bind it: add `:memberId` to the helpline PUT / submit paths (routes, contracts, admin client) and pass it to `visible()`, plus a read-audit line on the list; (b) keep PM12's ping-only shape and add only the list's read audit plus S5's DELIBERATE block; (c) S5's block alone. Families 6, 8, 9 and 12. Sources: blind, edge, auditor.
- [x] [Review][Patch] **S13 — MEDIUM: `assemblePeerAnswers` is not actor-aware, though the record says it is** [`apps/api/src/modules/claims/peer-answers-assembler.ts:44`]. PM13 / PM25 (c) say it "takes the actor". Its signature has no actor; the inspector hide lives only in the console wrapper (`assemblePeerMesh`), and `onCallbackMobileShown` is optional. When 6.27b PM24 reuses it, it would get neither the hide nor a mandatory disclosure audit. Completion Notes, Task 7 and `b1b1293b` all claim "actor-aware". Fix: the assembler takes the actor and runs `isPeerSectionHiddenFromActor` itself (returning absent); make the disclosure callback required. Family 10.
- [x] [Review][Patch] **S14 — MEDIUM: the console's peer-mesh reads run without a SAVEPOINT, and a failed hide check shows the section** [`apps/api/src/modules/claims/claims.verifier-console.handlers.ts:827`]. `isPeerSectionHiddenFromActor`, `readPeerAnswersForClaim` and `readPeerNeighbourContacts` run on bare `ctx.db`. A SQL error aborts the scope tx (25P02), so every later section and the audited read degrade. This breaks the `VerifierConsoleContext` rule at `:232` that every read since 6.24a uses `underSavepoint`. The section's catch also turns a failed hide check into `{ status: 'unavailable' }`, so an inspector sees a peer-mesh title, which PM25 (c) forbids. The three pre-existing reads had the same exposure; 6.27a doubled it. Fix: run the section under `underSavepoint`, and fail closed (absent) when the hide check itself throws.
- [x] [Review][Patch] **S15 — MEDIUM: `dispose()` then `activate()` while a save is in flight silently drops the next edit** [`packages/api-client/src/peer-answer-editor.ts:121`]. `dispose()` empties the queue but leaves `running = true`; `activate()` clears `disposed`. A new `save()` pushes task B, but its `drain()` returns early. The old loop then resumes, applies its stale result, and `queue.shift()` removes B, which was never sent; the line still reads "saved". This is reachable through the Strict Mode cleanup / setup cycle that `activate` exists for. Fix: a drain epoch bumped by `dispose()`, and shift only when `queue[0] === task`. Also: any `save()` sets `error = null` while other failures remain (`:63`-style reset), so the UI loses the reason. Add a live in-flight dispose / activate test. Sources: blind, edge.
- [x] [Review][Patch] **S16 — MEDIUM: superseded queued edits are still sent** [`packages/api-client/src/peer-answer-editor.ts:127`]. The only pre-send skip is `task.discarded`. A queued, unsent task whose question already has a newer draft is still sent, with full backoff. For `has_died`, a stale `died` sent first becomes the ONE immutable `claim.peer_mesh_responded` event even though the neighbour's last choice was `not_died`. Every stale value is also a server version, which inflates the District Admin's "changed N times", and a burst spends the per-member write budget. Fix: before sending, skip a task whose question's draft generation is newer (the in-flight request still completes). Sources: blind, edge.
- [x] [Review][Patch] **S17 — LOW-MEDIUM: the call-back mobile audit is emitted before the section is known to render** [`apps/api/src/modules/claims/peer-answers-assembler.ts:116`]. `onCallbackMobileShown` fires inside the per-ping loop. If a later ping, section or serialization fails, the admin gets `unavailable` or a 5xx, but the audit says the number was shown. Fix: collect the ping ids and emit after the section has assembled. Family 8.
- [x] [Review][Patch] **S18 — LOW: helpline writes take no Idempotency-Key** [`apps/api/src/modules/claims/claims.peer-request.handlers.ts:282`]. PM12 says "the SAME save / submit shape as PM11", and PM11 requires the key. A helpline Submit whose response is lost retries into 409 `peer_request.submitted`. The admin client drops the key the shared editor generates (`apps/admin/src/api/client.ts`). Fix: `requireIdempotencyKey` + `withIdempotency` on both helpline writes; the admin client sends the key. Family 2.
- [x] [Review][Patch] **S19 — LOW: the idempotency claim can block a save for 24 h, and a replayed save can 409** [`apps/api/src/modules/claims/claims.peer-request.handlers.ts:51`]. The pending claim uses the 24 h retention TTL. A process death between `claim()` and `release()` leaves the key `pending`, and the mobile editor retries with the same key into 409 `idempotency_in_progress` until it expires. Separately, the replay path goes through `detailOn`, which 409s once the reply was submitted or the window closed, so a save that DID commit is reported as failed. Fix: a TTL matched to the comment's "within seconds" (minutes, not a day; the save is idempotent by value), and a replay that reads the live answers without the open checks.
- [x] [Review][Patch] **S20 — LOW: a no-op save writes a "saved" audit row** [`apps/api/src/modules/claims/claims.peer-request.handlers.ts:150`]. `saveOn` always opens `withCompensatingAudit('claim.peer_answer_saved')`; `savePeerAnswer` returns `written: false` for a same value. ADR-0030's protocol (`audit/compensating.ts` header) runs the no-op pre-check before the helper. Family 8.
- [x] [Review][Patch] **S21 — LOW: the save response echoes the request value, not the stored (normalised) one** [`apps/api/src/modules/claims/claims.peer-request.handlers.ts:180`]. `known.set(row.answerId, value)` uses the raw request value, while `checkAnswer` stores codes sorted into option order. The editor's authoritative state then differs from the next GET. Fix: echo the normalised value from `prepareSave`.
- [x] [Review][Patch] **S22 — LOW (latent until counsel clears the health questions): an undecryptable sensitive PARENT becomes a 422, and the editor drops edits under it** [`apps/api/src/modules/claims/peer-request-core.ts:219`; `packages/api-client/src/peer-answer-editor.ts:99`]. A failed decrypt leaves the parent out of `decryptedLive`, so saving `death_illness` under an unreadable `death_cause` returns 422 `condition_not_met`, a permanent error for a transient fault. Fix: a stale (409) like the recorded own-row case. In the editor, `discardHiddenDrafts` treats an `{ unavailable: true }` parent as "condition not met" and deletes the child's draft silently. Fix: an unknown parent never discards.
- [x] [Review][Patch] **S23 — LOW: an erased neighbour's call-back mobile reads "could not be shown just now"** [`apps/api/src/modules/claims/peer-answers-assembler.ts:790`]. The sentinel decrypts, `normalizeMobile` returns null, and the result is `unavailable`, which reads as a transient failure. The name branch maps the sentinel to `none` (`:740`). Invariant 8, read honestly: map the sentinel to `none`.
- [x] [Review][Patch] **S24 — LOW: the console's send-status / window-outcome enums have no lockstep with the domain** [`packages/contracts/src/claims/verifier-console.ts`]. `PEER_MESH_SEND_STATUSES` / `PEER_MESH_WINDOW_OUTCOMES` are literal lists; the assembler casts with `as PeerMeshPingView['sendStatus']` (`:806`). 6.27c owns that column, and a new value would fail serialization of the WHOLE console packet, outside the section's try. Add a lockstep test against `PEER_MESH_SEND_OUTCOMES` / `PEER_MESH_OUTCOMES`.
- [x] [Review][Patch] **S25 — LOW: the read ledger over-counts by one when a selection has zero pings** [`apps/api/src/modules/claims/peer-answers-assembler.ts`]. `bump()` is booked for `readPeerNeighbourContacts`, which returns before any statement when there are no member ids (`peer-mesh-reply.ts:592`). The exact-read spy only covers two pings. Fix: book the bump only when a statement runs, and add a zero-ping leg.
- [x] [Review][Patch] **S26 — LOW, family 3 REAL GAP: no per-route runtime actor-denial tests on the new writes** [`apps/api/tests/integration/claims/peer-request-member.spec.ts`]. Member detail / PUT / submit have no unauthenticated or non-access-token leg; only the list's 401 is tested. Helpline PUT / submit have no wrong-permission or unauthenticated leg; only the list is tested with `district_verifier`. The guards exist by construction (the login-wall walk, `COVERAGE_SET`), so this is a test gap.
- [x] [Review][Patch] **S27 — LOW: two tests cannot fail on what they name** [`apps/api/tests/integration/claims/peer-request-member.spec.ts`; `packages/contracts/tests/claims-peer-request.test.ts`]. (a) The idempotency-replay leg would pass on a silent second write too: re-saving the same codes returns equal answers. Assert no second audit row or version. (b) The contracts lockstep test copies `toWireQuestionnaire`'s mapping instead of calling it, so drift in `exclusive` / `showIf` goes uncaught.

Dismissed (14), each verified against the code: an Idempotency-Key reused with a different body (the codebase's keyed-store convention keys without the body; the editor mints a key per task); `recordResult` failing after commit re-runs the save (`onMemberTx` has committed; the re-run is idempotent by value, `written: false`); no retry cap in the editor (AC5: "a failed save retries, never lost silently"; R2's FIFO); `wait()` rejecting (an internal timer); the mobile shown on a draft "yes" (PM13 shows live answers "submitted or not"); console decrypts without a per-disclosure audit (the console read is audited, `admin_verifier_console.read`); GET and PUT checking submitted / window in a different order (both 409s are true); the case-sensitive path Pariwar check (server-issued ids are lower-case); unrated reads / per-row decrypts (≤ 5 rows, `clampLimit`); an unbounded Idempotency-Key length (codebase convention); `actorRole: null` on helpline audits (`actor_id` names the operator); `askedOn: ''` (an `accepted` ping always carries `send_updated_at`); the R11 test persisting the captured event (its stated scope: a real route event through the production sink); the per-row helpline N+1 (≤ 5). No review layer failed.

Checklist verdicts (group 2, touched families):

| Family | Verdict / evidence |
|---|---|
| 1 — state guards | **Covered-by-test:** member spec (one indistinguishable 404 on every route; 409 submitted / closed); helpline spec (404 on PUT / submit for an untexted ping). |
| 2 — idempotency | **Covered-by-test** (member): key required, save / submit replay. **REAL GAP S18, S19**; editor ordering S15 / S16. |
| 3 — tenant / actor | **Covered-by-test:** cross-Pariwar (the member spec's other-Pariwar path). Guards **covered-by-construction** (login wall, `COVERAGE_SET`). **REAL GAP S26.** |
| 4 — event payload | **Covered-by-test:** helpline `actor: 'operator'`, the operator's `actor_id`, `responder_member_id`; member exact payload keys. |
| 6 — projection | **Covered-by-construction and by test:** `toWireAnswers` / `buildPeerRequestDetail` / the assembler pick fields; ciphertext, indexes and `saved_by_actor_id` never reach the wire (group 1's hand-off (i) closed). **REAL GAP S12** (the operator's reach). |
| 7 — aggregates | **Covered-by-test:** `changeCount: 1` (`peer-answers-console.spec`); inflation by stale edits is S16; the meaning of the count is S10. |
| 8 — audit | **Covered-by-test:** member save row; R11's durable disclosure row. **REAL GAP S12 (list read), S17, S20.** |
| 9 — deliberate bypass | **REAL GAP S5** (group 1), widened by S12. |
| 10 — closure honesty | **REAL GAP S13.** |
| 12 — ownership | **Covered-by-test** (member): ping vs session member / Pariwar / texted; `questionKey` vs the pinned version (422); submitted ⇒ 409. **REAL GAP S12** (helpline). |

#### Review Findings — second pass, group 3 of 3: mobile / admin UI / i18n (2026-10-13)

**Group 3** = `apps/mobile`, `apps/admin`, `packages/i18n`, `microcopy.yaml`, `friction-budget.md`, `pnpm-lock.yaml`, diff `7120ac20..618566d3` (39 files, 2,921 diff lines). At BigDev's request the three layers ran ONE AT A TIME (Blind → Edge → Auditor; each later layer was told the earlier layers' findings), followed by parent verification. **0 decision-needed, 15 patch, 0 defer; 11 dismissed.** All engineering, ⛔ no Panel question.

- [x] [Review][Patch] **S28 — MEDIUM, family 13 (d) REAL GAP: the questionnaire's error / notice lines are never announced** [`apps/mobile/components/peer-request/PeerQuestionnaire.tsx:174`]. The notice (`:174`), `submit_error` (`:175`), `required` / `invalid` / `unsaved` (`:227`), `unavailable` (`:300`) and `date_invalid` (`:312`) use a bare `accessibilityRole="alert"`, with ⛔ no live region and ⛔ no iOS `announceForAccessibility`. The repo already records that this does not announce (`app/(claim)/nominee-review.tsx:330`) and has the shared fix (`lib/death-certificate-announce.ts` `announcementPlan`; `contact.tsx:157`). The save line's `accessibilityLiveRegion="polite"` (`:389`) is Android-only, so VoiceOver never hears Saved / "Not saved — retrying". All of these are states AC5 / R4 / R6 / R7 / R10 made reachable. The render test maps the RN alert role to DOM `role="alert"` (`peer-questionnaire-render.test.ts:32`), so its "announced" leg passes while a device stays silent. Fix: use the shared announce pattern; the test asserts the announce call, ⛔ not a DOM role. Sources: auditor, blind.
- [x] [Review][Patch] **S29 — MEDIUM-LOW, family 13 (d) REAL GAP: in-screen page and phase changes are silent** [`apps/mobile/components/peer-request/PeerQuestionnaire.tsx:233`]. The header is hidden (`PeerRequestSlot.tsx`), and pages, closing, Thank-you and not-openable are state in one screen, so ⛔ no navigation announcement fires. `setPageIndex` / `setPhase` neither move focus nor announce, and the pressed button unmounts. A save refused with 409 swaps in `PeerRequestNotOpenable`, whose text is never spoken. Fix: announce the new page heading or phase (the same helper as S28) and move focus to it; reset the shared `ScrollView` to the top on page change.
- [x] [Review][Patch] **S30 — LOW-MEDIUM, family 13: wrong radio semantics, no grouping, the card label drops its body, and a test stub masks it** [`apps/mobile/components/peer-request/PeerQuestionnaire.tsx:336`]. Single-choice options declare `accessibilityRole="radio"` with `accessibilityState={{ selected }}`; RN announces a radio from `checked`, so the chosen answer reads "not checked". There is ⛔ no `radiogroup` container labelled by the question (the repo pattern is `contact.tsx:262`, `PersonalEventAssertion.tsx:162`). Admin renders exclusive choices as `aria-pressed` toggles rather than a radio group. The home card's `accessibilityLabel={t('peer_request.card_title')}` drops `card_body` (`PeerRequestEntry.tsx`). The render test's Button stub maps `selected` → `aria-checked` (`peer-questionnaire-render.test.ts:~2158`), which masks the defect. Sources: blind, auditor.
- [x] [Review][Patch] **S31 — MEDIUM: the new home card displaces Story 8.2's ratified TOPMOST My Pool card** [`apps/mobile/app/(tabs)/index.tsx:56`]. `<PeerRequestEntry />` renders above `<ActiveContributionCard />`. Story 8.2's AC (`epics.md:3767`) makes the My Pool card "the topmost home-screen element" for an active member with a live alert, and PM2 / PM11 do ⛔ not rule placement. The `:23` / `:51` "TOPMOST" comments are now wrong. Fix: place the peer card below the My Pool card and its lock-step siblings. It is dark until 6.27c, but would merge wrong. Source: auditor.
- [x] [Review][Patch] **S32 — MEDIUM: the mobile member can be trapped on the questionnaire** [`apps/mobile/components/peer-request/PeerQuestionnaire.tsx:133`; `apps/mobile/lib/peer-request.ts:95`]. (a) A 422-rejected answer stays on screen, `failed.size > 0` disables Submit and page-0 Back, and `usePreventRemove` blocks leaving. Mobile has ⛔ no retry or discard, and `t('peer_request.invalid')` ⛔ never names the question, which may sit on an earlier page. Re-tapping does not clear it: the multi toggle returns `null` (a no-op). A device clock ahead of the server's IST date and "today" makes this reachable. (b) Offline, every save is `'retry'` forever, so `busy` stays true and Back plus the gesture stay blocked until connectivity returns. (c) `classifyFailure` treats 401 / 403 as `'retry'`, while the load path treats them as fatal (a suspended member's 403 loops every 30 s). Fix: 401 / 403 fatal on save too; name the rejected question and offer to restore the saved value; an explicit "leave without saving this answer?" confirmation when saves are unresolved (⛔ never silent, so AC5 / R7's "never lost silently" holds). Sources: edge, blind.
- [x] [Review][Patch] **S33 — LOW-MEDIUM: Android hardware back leaves the whole request** [`apps/mobile/components/peer-request/PeerRequestSlot.tsx`]. Pages, closing and `openPingId` are in-screen state. There is ⛔ no `BackHandler`, and `usePreventRemove` engages only while busy, so back on page 2+, on the closing page or from a list-opened request pops the whole route; on a cold-start app link the app exits. Fix: back steps to the previous page, the list, or the closing page's predecessor, mirroring the in-screen Back. Source: edge.
- [x] [Review][Patch] **S34 — MEDIUM: the helpline panel cannot recover, can lock the operator to one caller, and loses its result message** [`apps/admin/src/modules/helpline-claims/HelplinePeerRequests.tsx:68`; `apps/admin/src/modules/helpline-claims/HelplineClaimPage.tsx:79`; `apps/admin/src/api/hooks.ts`]. (a) The list query is `retry: false` and is ⛔ never invalidated after a successful step-up (`verify()`'s `onSuccess` only resets local state), so "Confirm with a code" loops. A failed first load shows "could not be loaded just now" with ⛔ no retry. (b) `failed.size > 0` keeps the card busy, and `canChangeCaller()` plus the router blocker refuse every move, with ⛔ no discard, so the operator is stuck on this caller until the save succeeds or the page reloads. (c) After Submit or a 404 / 409, the list refetch drops the item (open-only), the card unmounts, and its "Sent — the answers are locked." / "no longer open" status vanishes; with one request the panel returns `null`. Fix: invalidate the list on step-up success plus a retry control; an explicit discard for a failed save; keep a per-caller outcome line after the item leaves the list. Source: edge.
- [x] [Review][Patch] **S35 — MEDIUM: a typed but unsaved date is silently dropped (mobile and helpline)** [`apps/mobile/components/peer-request/PeerQuestionnaire.tsx:245`; `apps/admin/src/modules/helpline-claims/HelplinePeerRequests.tsx:205`]. The date is saved only by "Save the date". `death_date` is optional, so Next or Submit passes with a typed, unsaved date, and the reply goes in without a date the neighbour gave, with ⛔ no notice. Fix: treat a typed, unsaved date as an unresolved edit (save it on Next, or block with a named notice). Source: edge.
- [x] [Review][Patch] **S36 — LOW-MEDIUM: helpline editor wiring** [`apps/admin/src/api/hooks.ts:88`; `apps/admin/src/modules/helpline-claims/HelplinePeerRequests.tsx:260`]. (a) Every save invalidates the gated, decrypting list (one tap = a save plus a full list GET), and the refetch feeds `replaceFromServer` mid-queue. Patch the cache from the save response, as mobile does. (b) Submit is gated on a hard-coded `answers.has('has_died')`, ⛔ not the version's required (`optional: false`) questions as mobile's `canLeavePage` does. (c) The date `<input type="date">` has ⛔ no `min` / `max` (a future, pre-1900 or 5-digit-year date gets a 422 or a contract miss and loops through retry), and "I don't know" leaves the typed date in the field. The idempotency key is folded into S18. Sources: blind, edge.
- [x] [Review][Patch] **S37 — LOW: mobile input edges** [`apps/mobile/lib/peer-request.ts:56`] — ⭐ (a), (b), (d) FIXED; **(c) DEFERRED** (deferred-work): clearing an optional answer needs a server "clear" the API does ⛔ not have (an empty value is a 422 by design; answers are append-only), ⛔ a client fix. (a) Devanagari digits (०५-१०-२०२६) are refused, because `\d` is ASCII-only and the app is Hindi-default; normalise digits first. (b) Two fast taps on a multi question compute the second from the stale `value` prop (`PeerQuestionnaire.tsx:343`) and lose the first; read the editor snapshot, as admin does. (c) An optional multi answer can never be cleared (`next.length === 0 ? null`, and admin `if (next.length > 0)`). (d) The idempotency key uses `Math.random`, and `useRef(newIdempotencyKey())` mints a throwaway key on every render; use a CSPRNG and a lazy ref. Sources: edge, blind.
- [x] [Review][Patch] **S38 — LOW: a required answer that is saved but unreadable blocks Next with "required"** [`apps/mobile/components/peer-request/PeerQuestionnaire.tsx:237`]. `answers` strips `{ unavailable: true }`, so `canLeavePage` sees it as unanswered, and the member sees both "could not be shown" and "please answer this first". Fix: an unavailable saved answer counts as answered. Source: blind.
- [x] [Review][Patch] **S39 — LOW: the console says "Still open until <a past time>"** [`apps/admin/src/modules/claim-verification/SignalsPanel.tsx:210`]. Between the 72-hour expiry and the window worker's relabel, `outcome === 'pending'` renders `window.pending(formatIst(windowExpiresAt))` with a time already gone. Fix: once past the expiry, show a "the 72 hours have passed — the count is being taken" line. Source: edge.
- [x] [Review][Patch] **S40 — LOW-MEDIUM, family 10 REAL GAP: the friction-budget declaration overclaims** [`friction-budget.md`]. It says "the helpline is on every page", but the closing phase (`PeerQuestionnaire.tsx:169-211`), exactly where `submit_error` lands, has ⛔ no `<CallHelplineCTA />`. It says the member is "never surprised by the lock", but neither the closing note nor the chrome says that answers lock at Submit. Fix: add the CTA to the closing phase, and correct the lock claim (the lock wording itself is copy under Row 28's review, so the declaration states what IS shown). Source: auditor.
- [x] [Review][Patch] **S41 — LOW: the helpline panel's copy bypasses the module catalog** [`apps/admin/src/modules/helpline-claims/HelplinePeerRequests.tsx`]. About 20 English strings are inline (headings, `failureText`, status lines, buttons), plus the new warning line in `HelplineClaimPage.tsx`. Every other `helpline-claims/*.tsx` imports `./i18n-en.js`. Source: auditor.
- [x] [Review][Patch] **S42 — LOW, family 10: two stale records** [`apps/mobile/tests/unit/peer-request.test.ts:1`; `docs/launch-gate-inventory/inventory-roster.md:484`]. The test header still says the harness renders "⛔ no screen", but this diff added a jsdom render test. Row 28's `gate_name` ("…and route-shell placeholder") and `support` (`:487`) still name the retired `peer_request.placeholder`, while Task 5 required Row 28's scope updated. Source: auditor.

Dismissed (11), each verified: the helpline card ignoring `submitted` (the list is OPEN-only, `submitted_at IS NULL`; a mid-call app submit surfaces as "These answers were already sent."); stale answers under now-hidden questions (the domain writer supersedes dependants transitively, confirmed in group 1); the expression-bodied `useEffect` (`replaceFromServer` returns `void`); `transcript.responses` no longer listed (PM13's per-neighbour view replaces it; the dead copy keys are harmless); the raw `no_target` code (PM13 specifies *"⛔ not texted — {reason code}"*); the closing-note "never the family" chrome scan (server words, verbatim-checked); > 5 open requests hidden (PM11's cap of five; dismissed in the first pass too); queued choices lost on an app kill (memory-only by R1's design, so decrypted answers are ⛔ never persisted); `crypto.randomUUID` over plain HTTP (a secure-context API; the console is HTTPS-only); the react-dom 19.2.0 / react 19.2.7 lock entry (the render suite passed in `ci:local`, so ⛔ no version-mismatch throw); long Hindi option labels in a Tamagui Button (unverified, belongs to the device go-live proof that is already open). No review layer failed.

Checklist verdicts (group 3, touched families):

| Family | Verdict / evidence |
|---|---|
| 3 / 12 — owner scoping (mobile) | **Covered-by-test:** `peer-request-cache.test.ts` (a second member in the same Pariwar fetches their own list / detail). Clear on refresh-rejected: source-scan (`link-target.test.ts`). Clear on sign-in / sign-out / terminated: **covered-by-construction** (`session-context.tsx`). Helpline binding: S12. |
| 6 — PII in caches | **Covered-by-test:** dehydration drops both reads and the decrypted date; restore rewrites legacy plaintext; paused peer mutations are excluded. Admin: **covered-by-construction** (no query persister). |
| 10 — closure honesty | **REAL GAP S40, S42.** The device / native screen-reader gap is otherwise disclosed. |
| 13 (a) labelled container accessible | **Covered-by-construction:** only a Tamagui `Button` and an `Input` carry labels; ⛔ no labelled `YStack` / `View`. |
| 13 (b) progressbar / slider value | **Not applicable:** ⛔ no such role ("1 of 4" is text). |
| 13 (c) role has a real handler | **Covered-by-construction and partly by test** (`peer-questionnaire-render.test.ts` drives the real handlers). |
| 13 (d) ratified state announced | **REAL GAP S28, S29, S30.** Real VoiceOver / TalkBack announcement is **not constructible in this harness** (jsdom with stubbed Tamagui proves DOM roles only, and S28 shows the stub actively masks the defect). After the fix, the tests assert the announce CALL, and device proof stays with the open go-live item. |

#### Second-pass fix record — 2026-10-13 (BigDev: "apply all patches at once")

**38 patches applied** (S2–S8, S12–S42), **S1 handed off** to row 6-36, **S9–S11 and S37 (c) deferred** (deferred-work). ⛔ Nothing committed yet: the fixes are uncommitted on `story/6-27a` (base `618566d3`).

- **Domain (group 1).** S2: the validator holds the ruled classification from v2 on (`death_cause` / `death_illness` stay `health: true`; both warnings stay), and `checkAnswer` emits the ±1 window for `death_date` ONLY (`PEER_MESH_HEALTH_QUESTION_KEYS` / `PEER_MESH_SENSITIVE_QUESTION_KEYS`). S4: additive **migration 0158** `claim_peer_mesh_reply_answers_sensitive_encrypted_check`; `death_date` keeps only `ARRAY['unknown']` as codes. **Applied to :5432 and :5433** (constraint verified on both); 0156 / 0157 were ⛔ not rewritten. S3: the live parity leg runs `answerWindowSql` too, and the unit test cites the real spec. S6: `pg_indexes` legs. S7: `readLivePeerAnswers` is clamped. S8: the jobs leg re-fires the window worker after three late answers, the cap-of-5 leg seeds six, and a v1-pinned reply refuses a v2 question. **S5 is moot:** S12 REMOVED the `memberId: null` bypass, so there is ⛔ no bypass left to mark.
- **API / contracts / client (group 2).** S12 (bind and audit): the helpline writes moved to `…/helpline/members/:memberId/peer-requests/:pingId/…`, `visible()` takes a non-null member on every path, the list emits `helpline_claim.peer_requests_read` (`member:<id>`, counts only), and PM12 is AMENDED in place with the new paths (the original text kept as written). S18: the helpline writes take an Idempotency-Key on their OWN scope tx (the key's result is recorded after COMMIT). S19: TTL 24 h → 15 min, and a replay reads the live answers with ⛔ no open checks. S20: the no-op pre-check runs before the audit helper (a race is refused as stale and rolled back). S21: the stored, normalised value is echoed. S22: an unreadable parent ⇒ 409 stale, and the editor keeps the child's draft. S13 / S14 / S17 / S23 / S24 / S25: `assemblePeerSection` is the ONE actor-aware builder (the hide FIRST, failing CLOSED; every read under `underSavepoint`; the disclosure callback REQUIRED, fired after assembly and audited by the route after the packet is built; an erased mobile ⇒ `none`; an unknown send status degrades THIS section; ⛔ a contacts read with zero pings). S15 / S16: a drain epoch, and adjacent same-question edits coalesce; `discardFailed()` added. S26 / S27: per-route 401 / 403 legs; the replay leg counts audit rows and versions; `apps/api/tests/unit/peer-request-wire-lockstep.test.ts` runs the REAL `toWireQuestionnaire` and the enum lockstep.
- **UI (group 3).** Mobile: `announce.tsx` (the repo's `announcementPlan`; the tests assert the iOS announce CALL), page and phase announcements plus scroll-to-top, radios `checked` in a named `radiogroup` (the test stub now maps `checked`), the card label includes its body, the card moved BELOW the My Pool card, a named refused answer with "Keep my earlier answer", "Leave without saving", 403 ⇒ closed (401 still retries), Android back steps back, a typed but unsaved date holds Next, Devanagari digits accepted, the latest value used on a tap, a CSPRNG key, an unreadable required answer counts as answered, and the helpline on the closing page. Admin: Try again, a step-up success re-reads the list, discard, outcome lines that outlive the item, the cache patched from save responses, Submit gated on the required questions, date `min` / `max` and "I don't know" clearing the typed date, `radiogroup` / `radio` / `checkbox`, the catalog copy, and the expired-window line. Five new en + hi chrome keys sit under Row 28's hold. `friction-budget.md` now states what IS shown (⛔ "never surprised by the lock"); Row 28's gate_name and support no longer name the retired placeholder.

**Verification.** `pnpm ci:local` with `DATABASE_URL` → :5433, run 1: 33/36. Microcopy flagged literal Devanagari digits in a comment, and the accessor gate rejected `.limit(n)`; both were fixed (an inline `clampLimit(…)`, U+ escapes). Two admin RTL tests timed out under load, and both passed alone. Run 2: **35/36**, live integration GREEN (domain 5052 + 1 skipped; API 1652 + 1 skipped; jobs 797). The one failure was again an admin RTL test: "keeps the caller…while peer answers are queued", 5.6 s against the 5 s default, ~1 s alone, the userEvent-oversubscription class `scripts/ci-local.sh` names. That test got an explicit 15 s budget (⛔ a global timeout). The `test (unit)` job was then re-run exactly as `ci:local` runs it (`env -u DATABASE_URL pnpm turbo run test --concurrency=4`): **37/37 tasks** (admin 1036, mobile 799, contracts 1345, api-client 19). ⚠ Not claimed: a third full 36/36 run after that test-only change; the timeout edit touched no product code, and `git diff --check` is clean. Native / device announcement proof stays with the open go-live item. Logs: `scratchpad/ci-local.log`, `ci-local-2.log`, `unit-3.log` (session-local).

## Dev Notes (shared traps; each part adds its own)

### ⚠ TRAPS (each has bitten an earlier story)

1. **Showing an answer to the family or the public is a Panel question** (Invariant 7) — ⛔ never on the claim status page, the Sahyog
   Vivran shell, `verifierName`, any member-facing contract, or through the inspector's words to the family.
2. **The text says only the ruled words** — ⛔ never the claim, the family, the amount, *"within 72 hours"* or any deadline word (S4 / T6);
   a wording change is a re-registration AND a Panel matter.
3. **⛔ No conjunct in the gate**; ⛔ no question added through the chain becomes a warning or a flag (the validator refuses it).
4. **⛔ Never edit the assertion or the approver writers** (NW1); re-judge any exclusion at EVERY coverage reader (the queue, the gate,
   R9 finalize, the console) — 6.26b's lesson.
5. **Rebase onto every sibling** (`-292` / `-282` Consequence 4): the gate order (F18), RF5's required `step`, RF15, the NW1 transitive
   import scan, `FENCED_FILES`, the console read ceiling, 6.25's `standingSuspicionRefusalSql`; ⭐ AND row 6-28 (one payment per death —
   the same approval path; two claims for one death both produce neighbour keys). ⭐ (re-pin 2026-10-12 — 6.28 is `done`; what it changed: OP2's
   `assertNoOtherFinalApprovalForDeath` in the gate between RF5 and the wait (F18); NW1 five entries (`questionnaires/index.ts` the sixth);
   SIX kinds (PM9); the queue's source (4) (PM10); console reads 23 and two REQUIRED packet fields (F12); OP13 — `state_trustee_approved`
   closable (`state.ts:362`); OP4 — the death's other open claims `closed` at payment commit, taking the death's intake key FIRST
   (`apps/api/src/modules/claims/close-claims-of-paid-death.ts`) ⇒ the reply writer ⛔ never takes the intake key (claim → ping → reply stays
   its whole order); for 6.27b's PM24, `FinallyApprovedElsewhereBanner` on all four `LaterApprovalWarnings` hosts; for 6.27d, OP14 (d)'s
   *"Other claims for this death"* section on `GroundInspectionPage.tsx:154-179` — ⛔ never merge the discrepancy UI into it.)
6. **Both warning readers or neither** (6.27b) — the bulk reader is a separate statement; the parity test is the guard.
7. **⛔ Never inherit a neighbour key** (`-261` C3).
8. **⛔ Never touch the selection** (`peer-mesh-read.ts`; `member/moderation/index.ts:22`).
9. **⛔ No KMS under a lock — anywhere in 6.27** (the save path too: the handler encrypts and indexes FIRST, the writer takes the locks);
   ⛔ no number in a log.
10. **The erased sentinel is a "mobile"** — ALWAYS `normalizeMobile`; ⛔ never `resolveSmsTarget`.
11. **A RAW gateway code in `detail` breaks the CHECK after a successful send** (6.29 Trap 4) — sanitise through the ONE builder.
12. **`clock_timestamp()` for `saved_at` / `noted_at`**, ⛔ never `now()` ([[project_db_clock_ordering_tests_tie]]).
13. **Locks in ONE order — claim, then ping, then reply** (Invariant 9; F31) — `recordPeerMeshResponse` takes the claim lock ITSELF. A
    ping-first lock under PM8's window collides on `eventVersion`, deadlocks, or hides a late key from the queue.
14. **Markdown emphasis closes a JSDoc** — grep `\*\*/` after every doc-block edit ([[project_markdown_emphasis_closes_jsdoc]]).
15. **Contracts tests are outside tsc** — run vitest ([[project_contracts_tests_outside_tsc]]).
16. **Prettier is ⛔ not enforced** — hand-format ([[project_prettier_not_enforced]]).
17. **Leave room for row 6-31's reminder — ⛔ never build it here.** It reads `peerMeshReplyState` and the ping's send record; ⛔ never give
    the text's finished-row trigger a rule that would refuse a SEPARATE reminder record; it needs its own send path (the WA registry is
    keyed by `AlertCategory`, and `dispatch()`'s WA-undelivered SMS fallback would send a SECOND text); and it goes ONLY within PM8's answer
    window (`-305` §2 item 4).
18. **⛔ Never put the engine in `@twt/contracts`** (F30) — a domain → contracts import is a workspace cycle.
19. **⛔ Never copy the `-303` routing block's Hindi** — it says "two" (`दो`); the text says "a few" (`-304` Q6 A).
20. **⛔ Never import a pg / event module into `questionnaires/`** (F38) — `isRealCalendarDate` from `nominee-determination-persist.ts`
    alone breaks NW1 and closes a runtime cycle the typecheck cannot see.
21. **⛔ Never write `{#var#}`, `DLT_VAR` or `sms.dlt.template_id.` in any 6.27a source line — comments included** (re-pin 2026-10-12):
    6.34's `dlt-typed-variables` gate (rules (ii) / (iii), `scripts/dlt-typed-variables/lib.ts:109-148`) scans every tracked `apps/*/src` /
    `packages/*/src` `.ts` / `.tsx` outside `REGISTRY_FILES` (`:56-62`). PM18's stale-comment fixes and the ping columns' doc comments are in
    scope; PM2's template-id keys and the registry are 6.27c's.

### Reuse map (⛔ never reinvent)
| Need | Reuse |
|---|---|
| member route shape | `helpdesk/member-routes.ts:50` (`perMemberKey`), `member-handlers.ts:261-273` (404 rule), `scope-tx.ts:34` |
| helpline write | `claims.helpline.routes.ts:88-91,103` chain |
| date index | `deathDateBlindIndex` (`ground-inspection-crypto.ts:63-65`), `DEATH_DATE_INDEX_FIELD_CLASS` |
| calendar arithmetic | `addCalendarDays` (`cycle-calendar/holiday-resolver.ts:187`), `isRealCalendarDate` (moved there by Task 1 — today `nominee-determination-persist.ts:71`) |
| erasure arm | 0143's trigger form + 0149's header (F37); the scrub statement's shape: GI13 (`member/anonymize.ts:255-292`, `WHERE … IS NOT NULL`) |
| staff read audit | `emitAuthAudit` (`claims.verifier-console.handlers.ts:1175`) + the `AuthAuditEventType` union |
| member's name | `notifications.resolveMemberFacingDeceasedName` (`notifications/pool-identity.ts:141`) |
| member's mobile | `waOptIn.getMemberMobileCiphertext` → `decryptMobile` → `normalizeMobile` |
| warning kind threading (6.27b) | 6.26b's commit `bdb01014` (63 files) |
| send record / sweep (6.27c) | 0151 + 0155, `suspicion-notice.ts`, `claim-suspicion-notices.ts`, `sendClaimDltSms` |
| injected post-commit enqueue (6.27c) | `claim-peer-mesh.ts:346-356` + `boot.ts:483-505` |

### Testing standards
- Unit (vitest): every validator rule (the seven ruled keys; `warning` on two; `approvedBy`; ⛔ no alcohol; a new health question's flag); the
  reachability test; v1 / v2 registration; `resolveLiveVersion`; the window helper across month / year /
  leap boundaries (±1 inside, ±2 outside); the response mapping; the contracts lockstep.
- Integration (live DB, :5433): the migration from zero; RLS policy regressions incl. the REVOKE leg and the erasure arm; the writer in every
  state; the two-connection ordering test; erasure after Submit and after closure.
- API: the member routes (404 ×3 indistinguishable; 409 closed / submitted; idempotent replay; ⛔ no Turnstile); the helpline routes (step-up);
  the console shape + ceiling `toBe` + the absent field.
- Mobile: source-scan + pure-logic tests (the harness renders ⛔ no screen — `apps/mobile/vitest.config.ts`); a REAL `t()` leg for the chrome
  ([[feedback_stub_must_call_not_transcribe]]).
- Assert MEMBERSHIP, ⛔ never counts, on shared tables ([[project_live_db_test_gotchas]]); suite-level `{timeout:20000}` on live specs
  ([[project_known_livedb_test_failures]]). `pnpm ci:local` before review.

### Project structure notes (6.27a)
- NEW: `packages/domain/src/questionnaires/` (+ tests); `packages/domain/src/claim/peer-mesh-reply.ts`; `packages/domain/migrations/<next>_*.sql`;
  `packages/domain/src/schema/claim_peer_mesh_replies.ts`; `packages/contracts/src/claims/peer-request.ts`;
  `apps/api/src/modules/claims/claims.peer-request.member.routes.ts`, `claims.peer-request.helpline.routes.ts` (+ handlers);
  the api-client factory; the mobile home card and the filled shell.
- UPDATE: `packages/domain/src/claim/peer-mesh-persist.ts`, `packages/domain/src/schema/claim_peer_mesh_pings.ts`,
  `apps/api/src/modules/claims/claims.verifier-console.handlers.ts`, `packages/contracts/src/claims/verifier-console.ts`,
  `apps/admin/src/modules/claim-verification/SignalsPanel.tsx`, `member/anonymize.ts`, the fence / rtbf / human-actor / pagination test
  lists, `microcopy.yaml`, `friction-budget.md`.
- ⚠ Do ⛔ not extract a shared "DLT notice" package ([[feedback_no_premature_package]]); the questionnaire engine IS shared (two consumers).

### Previous story intelligence
- **6.29**: the 0151 parity bar for any once-ever SMS record; raw gateway codes broke a CHECK after a successful send.
- **6.26b**: adding a kind touches ~60 files; derive ONLY in the shared helper; one hoisted queue fragment; fixture defaults raise ⛔ no
  warning; `null` is ⛔ never `false`; the key's stability is a ruling-sized choice; re-judge exclusions at every reader.
- **6.25**: `ADMIN_APP_ORIGIN` — the env + per-run validator + hold pattern (6.30 generalises it as `resolveHttpsOrigin`).
- **6.30 (dev, 2026-10-10 — its Task 9 check)**: roster **Rows 27 / 28 are ⛔ not yet written** (this story's Task 0.6 has ⛔ not landed); 6.30
  wrote **Row 29** (`app-links-live`) at its reserved number. When Task 0.6 writes them, Row 27 (e) names Row 29, and Row 28 names 6.30's
  fallback page (`apps/public/src/pages/peer-request.astro` — copy `packages/i18n/locales/{en,hi}/app-links.json`), the not-found screen
  (`apps/mobile/app/+not-found.tsx` — `common.json` `not_found.*`) AND the route-shell placeholder (`common.json`
  `peer_request.placeholder`) — PM16 already says so; 6.30's Row 29 (h) points at Row 28 for that review.
- **6.28 (`done`, re-pin 2026-10-12)**: one payment per death — Trap 5 lists what it changed. Precedents for 6.27a: a by-value state list
  with a pin test and alias-validated SQL fragments (`packages/domain/src/claim/one-payment-per-death.ts:12-14, 36-48`) — the shape for
  `answer-window.ts` / `answerWindowSql`; an exact-one-read test with a statement-count spy per new console section
  (`apps/api/tests/integration/claims/verifier-console.spec.ts:1176-1216`).
- **6.30 (`done`)**: the shell, slot, group layout and their tests (Task 5); the login-return records a target only for a valid `c`
  (`apps/mobile/lib/link-target.ts:33-38`) — a bare `/peer-request` after login lands on `/(tabs)`, where the home card is.
- **6.34 (`done`)**: Trap 21; it touches only 6.27c's send (typed, named slots in a registry entry; the helpline warning — see the reuse note at the top).
- **6.6**: the SELECT worker is "frozen" — extend through injected deps only.
- **This story's own validate (2026-10-10)**: nine revisions in a day left ACs, Tasks and Invariants behind the PMs — the split exists so each
  part stays in sync with itself ([[feedback_spec_edits_must_propagate_to_tasks]]).

### Git intelligence
`fa2687ce` `-305` (governance) · `877e5864` 6.27 v1.9 · `7f5603ff` `-304` · `d5789ffc` 6.27 v1.4 · `21715fcb` `-303` · `61fb4744` 6.30
created — the house order: decision entry → records → build → review; REBASE-merge, ⛔ never squash ([[project_story_automator_ops]]); commit
on the story branch ([[feedback_commit_on_story_branch]]).
Re-pin base `51b9000a` (2026-10-12): 6.30 (`12d0fbb4` … `72f7b607`), 6.28 (`01bc04c2` … `b5285004`), 6.34 (`97808e99` … `914a6252`).

### Latest tech information
⛔ No new library or version — read the neighbouring code, ⛔ never upgrade anything.

### References
- `.decision-log.md`: `-261` C3 · `-262` FQ8 E · `-263` FQ9 / FQ10 / FINDING / Consequences · `-264` FQ12 · `-277` Q2 C / Q3 B · `-278` NW1 /
  NW7 / NW12 / EA2 / EA10 · `-279` A6 · `-281` Q1 B · `-282` GI5–GI7 / GI13 · `-288` K3 · `-289` L4 / L5 · `-292` RF1 / RF5 / RF15 ·
  `-295` RB1–RB18 · `-297` §2 · `-298` · `-302` RN2–RN9 · `-303` · `-304` · `-305`.
- Routing notes `trustee-panel-routing-note-2026-10-10-6-27-asking-the-neighbours.md`, `…-6-27-the-neighbours-questions.md`,
  `…-6-27-confirms.md`.
- Sibling files `6-27b-…`, `6-27c-…`, `6-27d-…`; `6-30-app-links-open-the-app-from-a-text.md`.
- PRD FR-39 / FR-40; architecture §3.4, §4.7; `epics.md` Stories 6.6, 6.7, 6.10; `docs/launch-gate-inventory/inventory-roster.md`.

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (`claude-opus-5-5`) — `bmad-dev-story 6.27a`, 2026-10-12, branch `story/6-27a` from `main` `7120ac20`.

Codex (GPT-6) — `bmad-code-review 6.27a` and the user-authorized apply-all pass, 2026-10-12, same branch at `3f9e7c42` plus uncommitted review fixes.

### Debug Log References

- Migration 0156 iterated on a THROWAWAY database (`twt_scratch_627a`) first, so the in-place edits never touched an applied migration
  ([[project_live_db_test_gotchas]]); applied to `:5432` / `:5433` `twt_dev` only after the writer, race and policy specs were green on it;
  then proven FROM ZERO on both instances (scratch DBs, dropped after).
- The answers trigger's first draft raised *"the reply is submitted"* when the reply was merely OUT OF SCOPE (a cross-tenant insert) —
  split into two messages (*"not in scope"* / *"submitted"*) before 0156 was applied anywhere.
- `apps/mobile` `tsc` with the checked-out `.expo/types/router.d.ts` reports ONE error in `app/(auth)/otp.tsx:50` (`"/peer-request"` is ⛔ in
  the stale, gitignored typed-routes file generated before 6.30) — PRE-EXISTING on `main` (stash-verified); with the file moved aside
  `tsc` is clean ([[project_mobile_typed_routes_worktree]]).
- The human-actor gate reads each route's `preHandler` ARRAY LITERALLY — a shared `chain` const was reported as "no preHandler chain";
  inlined per route.
- Review fixes: regenerated the stale, ignored mobile typed-route declarations with the installed Expo router generator. The rendered
  questionnaire tests were moved into the mobile package after an initial cross-package placement failed TypeScript's rootDir check.
  Offline lockfile-only installation records the already-installed React DOM test tools and the admin's workspace API-client dependency.
- Review verification: the first full CI rerun had two failures (a brittle session-handler source assertion and the microcopy scanner
  matching a local identifier); both were corrected. The second rerun passed all integration suites but caught an unused test-fixture
  parameter in lint; its correction passed mobile lint, typecheck and the six cache tests before the final full rerun. No overlapping
  full CI database runs were started. Migration 0157 also passed fresh-database installation on both PostgreSQL instances.

### Completion Notes List
- 2026-10-12 — **code review and apply-all (v2.14):** 12 patches fixed, 0 decision-needed / 0 deferred, 3 candidates dismissed.
  Member cache isolation / persistence scrub, shared ordered in-memory saves, submission / departure recovery, database ownership
  backstops (additive 0157), explicit unavailable wire answers and durable ping audit correlation. 40 new regression tests; full live CI
  36/36, followed by final static CI 34/34 after the last UI / editor recovery changes. Status → `done`; native / device validation and
  the human-review / counsel go-live holds remain explicitly unclaimed. See the Review fix record for evidence and exact scope.
- 2026-10-10 — created by `bmad-create-story 6.27` (Opus 5.5); v2.0 after a four-reviewer fresh-context validate and `-305`: cut into
  6.27a (this file — the shared record) and 6.27b / c / d. ⛔ No code; Task 0.3 / 0.4 owed.
- 2026-10-12 — **dev (`bmad-dev-story 6.27a`)**. Task 0.0 / 0.5 / 0.6 / 0.7 (epics.md entries 6.27a–d + the 6.6 / 6.10 annotations; roster
  Rows 27 / 28; the ledger line) committed FIRST, then Tasks 1–9:
  - **Task 1 (AC2):** `isRealCalendarDate` moved to the import-free leaf (same identity re-exported); the answer window extracted ONCE
    (`claim/answer-window.ts` — the pure decision, `isClaimInAnswerWindow`, `answerWindowSql`; 6.26a's name a re-export); the pure
    questionnaire engine `packages/domain/src/questionnaires/` (shape, validator — every CF3 rule, v1 historical + EXEMPT, v2 LIVE as ruled,
    the served definition skipping a `'pending'` health question, `resolveLiveVersion`, the answer check, the dependants, the date window);
    an NW1 entry + a pg-free reachability test with teeth; the question words en + hi (Row 28 marker); the contracts wire mirror + lockstep.
  - **Task 2 (AC3):** 0156 — the ping's delivery columns + structural CHECKs, `REVOKE UPDATE` + a column GRANT (⛔ `message_key`), the
    finished-row trigger; `claim_peer_mesh_replies` (one per ping, `submitted_at` forward-only) and APPEND-ONLY
    `claim_peer_mesh_reply_answers` with the all-times trigger (insert / supersede only while open AND in the window; the 0143-form erasure
    arm, its admissions RECORDED, ⛔ claimed refused); a plpgsql window parity-tested against `answer-window.ts` over every state ×
    routed / not routed; RLS per-command.
  - **Task 3 (AC4):** `claim/peer-mesh-reply.ts` — save as they go (claim → ping → reply locks; ⛔ KMS under a lock — the handler encrypts and
    indexes first; dependants superseded; idempotent by value; the ONE event at the first `has_died` save with the CURRENT state and the
    right actor), Submit, `peerMeshReplyState`, the open list; `recordPeerMeshResponse` widened (the window, the claim lock taken INSIDE,
    `actor` defaulting to `'member'`); `PeerMeshWindowResolvedError` removed (⛔ other caller); the jobs test inverted (F39); the
    two-connection races (save ↔ approval and save ↔ 6.28's OP4 closure, both orders — ⛔ collision, ⛔ deadlock); 409 legs for OP4 (the real
    `closeClaimsOfPaidDeath`) and OP13 (`suspicion_appeal_allowed` on a `state_trustee_approved` + live-R9 claim).
  - **Task 4 (AC5 API):** the member routes (one indistinguishable 404 incl. the untexted ping; 409 no-longer-open / submitted; 422 with
    ⛔ the value echoed; ⛔ Turnstile; Idempotency-Key; `withCompensatingAudit` with codes only); `NON_ADJUDICATION_ROUTES`;
    `createMemberPeerRequestClient`.
  - **Task 5 (AC5 mobile):** 6.30's slot FILLED (the list, the in-screen questionnaire with a generic renderer, the save line that retries
    with the SAME key, the server's closing note and Thank-you, the not-openable state with the helpline, ⛔ a call before the session; the
    inner header hidden — in-screen Back); the home card and a notice-strip item beside `<PollsEntry />` (the banner lane stays one source)
    — both DARK until a request is texted; 6.30's tests amended (⛔ deleted); `peer_request.placeholder` RETIRED; the friction row +
    disposition; the microcopy scope.
  - **Task 6 (AC6):** the helpline routes on 6.3's chain + step-up, ENROLLED in `COVERAGE_SET`; texted-only list / PUT / submit; ONLY that
    neighbour's answers; the mixed app + helpline reply; the admin "Requests to confirm a death" panel.
  - **Task 7 (AC7):** `assemblePeerAnswers` (actor-aware; 6.27b's PM24 reuses it) — names, send status for every value, every live answer
    in English with provenance and "changed N times", the call-back mobile on a "yes" (each showing audited, ⛔ the number), "could not be
    shown just now"; `peerMesh` OPTIONAL — ABSENT for an inspector before a full visit (⛔ a variant); the ceiling 23 → 26 (all four pins);
    the F41 typed specs; the section's exact-read spy.
  - **Task 8 (AC8 / AC9):** the erasure scrub (19 → 20 tables, 22 → 23 statements; the no-claims leg 21) + a live leg after Submit and
    closure; `FENCED_FILES` 41 → 50 with a ⛔-decrypt arm (+ teeth); a no-PII leg on the audit rows and the event payload.
  - **Task 9 (AC10):** PM18's stale comments annotated; the deferred-work items (PM19, PM1's family residual, the undecryptable-answer
    refusal; the 6.10 / GI13 / zero-candidate items annotated); the row 6-22 pointer. Rows 27 / 28 were written at Task 0.6.
  - ⭐ **`pnpm ci:local` (with `DATABASE_URL` → `:5433`), 2026-10-12, at `ffa85b61` + this record: `ci:local PASSED — 36 job(s) green`**
    (domain 354 files / 5044 tests + 1 skipped; api 158 / 1641 + 1 skipped; jobs 57 / 797; mobile 51 / 772; admin 65 / 1022; contracts
    77 / 1344). ⚠ Two EARLIER runs failed and are RECORDED: (1) `typecheck` — the stale, gitignored `apps/mobile/.expo/types/router.d.ts`
    (generated before 6.30; fails on `main` too) — moved aside to the session scratchpad (⛔ deleted; `expo start` regenerates it), which
    matches GitHub CI (⛔ `.expo/types` there); (2) `integration-tests` — `member-renewal-lifecycle.test.ts` timed out at 20 s because run
    (1) was STILL running against the same database (its typecheck failure did not stop its other turbo tasks); alone the file passes on
    this branch (4.9 s / 8.7 s) and on `main` (17.9 s / 14.1 s). The third run, with nothing else running, is the one above.
  - ⚠ **RECORDED, ⛔ demonstrated:** the mobile screens are proven by source-scan + pure-logic + real-`t()` tests only (the harness renders
    ⛔ no screen) — ⛔ run on a device. ⚠ An authoring choice inside PM11's latitude: invalid input is a **422** (`peer_request.invalid_answer`)
    — PM11 names only the 404 / 409 codes.

### File List

- MOD `_bmad-output/implementation-artifacts/6-27-peer-mesh-sending-replies-and-date-of-death.md`
- MOD `_bmad-output/implementation-artifacts/deferred-work.md`
- MOD `_bmad-output/implementation-artifacts/sprint-status.yaml`
- MOD `_bmad-output/planning-artifacts/epics.md`
- MOD `apps/admin/src/api/client.ts`
- MOD `apps/admin/src/api/hooks.ts`
- MOD `apps/admin/src/modules/claim-verification/SignalsPanel.tsx`
- MOD `apps/admin/src/modules/claim-verification/i18n-en.ts`
- MOD `apps/admin/src/modules/helpline-claims/HelplineClaimPage.tsx`
- NEW `apps/admin/src/modules/helpline-claims/HelplinePeerRequests.tsx`
- NEW `apps/admin/tests/helpline-peer-requests.test.tsx`
- MOD `apps/admin/tests/verifier-console.test.tsx`
- MOD `apps/api/src/audit/audit-sink.ts`
- MOD `apps/api/src/context.ts`
- NEW `apps/api/src/modules/claims/claims.peer-request.handlers.ts`
- NEW `apps/api/src/modules/claims/claims.peer-request.helpline.routes.ts`
- NEW `apps/api/src/modules/claims/claims.peer-request.member.routes.ts`
- MOD `apps/api/src/modules/claims/claims.verifier-console.handlers.ts`
- MOD `apps/api/src/modules/claims/index.ts`
- NEW `apps/api/src/modules/claims/peer-answers-assembler.ts`
- NEW `apps/api/src/modules/claims/peer-request-core.ts`
- NEW `apps/api/tests/integration/claims/peer-answers-console.spec.ts`
- NEW `apps/api/tests/integration/claims/peer-request-helpline.spec.ts`
- NEW `apps/api/tests/integration/claims/peer-request-member.spec.ts`
- MOD `apps/api/tests/integration/claims/suspicion-refusal-routes.spec.ts`
- MOD `apps/api/tests/integration/claims/verifier-console-ground-inspection.spec.ts`
- MOD `apps/api/tests/integration/claims/verifier-console-shape.spec.ts`
- MOD `apps/api/tests/integration/claims/verifier-console.spec.ts`
- MOD `apps/jobs/src/claim-peer-mesh.ts`
- MOD `apps/jobs/tests/claim-peer-mesh.test.ts`
- MOD `apps/mobile/app/(tabs)/index.tsx`
- MOD `apps/mobile/components/panchayat/PanchayatNoticeboard.tsx`
- NEW `apps/mobile/components/peer-request/PeerQuestionnaire.tsx`
- NEW `apps/mobile/components/peer-request/PeerRequestEntry.tsx`
- NEW `apps/mobile/components/peer-request/PeerRequestList.tsx`
- NEW `apps/mobile/components/peer-request/PeerRequestNotOpenable.tsx`
- MOD `apps/mobile/components/peer-request/PeerRequestSlot.tsx`
- NEW `apps/mobile/components/peer-request/usePeerRequestQueries.ts`
- NEW `apps/mobile/lib/peer-request-api.ts`
- NEW `apps/mobile/lib/peer-request.ts`
- MOD `apps/mobile/tests/unit/app-link-route-map.test.ts`
- MOD `apps/mobile/tests/unit/not-found-copy.test.ts`
- NEW `apps/mobile/tests/unit/peer-request.test.ts`
- MOD `docs/launch-gate-inventory/inventory-roster.md`
- MOD `friction-budget.md`
- MOD `microcopy.yaml`
- MOD `packages/api-client/src/index.ts`
- NEW `packages/api-client/tests/peer-request-client.test.ts`
- MOD `packages/contracts/src/claims/index.ts`
- NEW `packages/contracts/src/claims/peer-request.ts`
- MOD `packages/contracts/src/claims/verifier-console.ts`
- NEW `packages/contracts/tests/claims-peer-request.test.ts`
- MOD `packages/contracts/tests/claims-verifier-console.test.ts`
- NEW `packages/domain/migrations/0156_claim-peer-mesh-replies.sql`
- MOD `packages/domain/migrations/meta/_journal.json`
- NEW `packages/domain/src/claim/answer-window.ts`
- MOD `packages/domain/src/claim/ground-inspection-persist.ts`
- MOD `packages/domain/src/claim/index.ts`
- MOD `packages/domain/src/claim/nominee-determination-persist.ts`
- MOD `packages/domain/src/claim/peer-mesh-persist.ts`
- NEW `packages/domain/src/claim/peer-mesh-reply.ts`
- MOD `packages/domain/src/cycle-calendar/holiday-resolver.ts`
- MOD `packages/domain/src/ids/index.ts`
- MOD `packages/domain/src/index.ts`
- MOD `packages/domain/src/member/anonymize.ts`
- NEW `packages/domain/src/policies/claim-peer-mesh-replies-rls.ts`
- MOD `packages/domain/src/policies/index.ts`
- NEW `packages/domain/src/questionnaires/answers.ts`
- NEW `packages/domain/src/questionnaires/index.ts`
- NEW `packages/domain/src/questionnaires/keys.ts`
- NEW `packages/domain/src/questionnaires/peer-mesh.ts`
- NEW `packages/domain/src/questionnaires/registry.ts`
- NEW `packages/domain/src/questionnaires/types.ts`
- NEW `packages/domain/src/questionnaires/validator.ts`
- MOD `packages/domain/src/schema/claim_peer_mesh_pings.ts`
- NEW `packages/domain/src/schema/claim_peer_mesh_replies.ts`
- MOD `packages/domain/src/schema/index.ts`
- NEW `packages/domain/tests/claim/answer-window.test.ts`
- MOD `packages/domain/tests/claim/approval-warnings.test.ts`
- MOD `packages/domain/tests/claim/nominee-name-no-comparison-fence.test.ts`
- NEW `packages/domain/tests/integration/claim/peer-mesh-reply-concurrency.spec.ts`
- NEW `packages/domain/tests/integration/claim/peer-mesh-reply-rtbf.spec.ts`
- NEW `packages/domain/tests/integration/claim/peer-mesh-reply.spec.ts`
- NEW `packages/domain/tests/integration/rls/claim-peer-mesh-replies-policy-regression.spec.ts`
- MOD `packages/domain/tests/member/rtbf-anonymize.test.ts`
- NEW `packages/domain/tests/questionnaires/questionnaires.test.ts`
- MOD `packages/i18n/locales/en/claim.json`
- MOD `packages/i18n/locales/en/common.json`
- MOD `packages/i18n/locales/hi/claim.json`
- MOD `packages/i18n/locales/hi/common.json`
- MOD `packages/queue/src/index.ts`
- MOD `scripts/claim-adjudication-human-actor-invariant/check.ts`

Review-fix additions to this file list (paths already listed above also changed):

- MOD `apps/admin/package.json`
- MOD `apps/admin/tests/helpline-claim-page.test.tsx`
- MOD `apps/mobile/components/Provider.tsx`
- MOD `apps/mobile/lib/session-context.tsx`
- MOD `apps/mobile/package.json`
- MOD `apps/mobile/tests/unit/contributor-list-render.test.ts`
- MOD `apps/mobile/tests/unit/link-target.test.ts`
- MOD `apps/mobile/vitest.config.ts`
- MOD `packages/domain/src/schema/claim_peer_mesh_selections.ts`
- MOD `pnpm-lock.yaml`
- NEW `apps/mobile/components/peer-request/peer-request-cache.ts`
- NEW `apps/mobile/tests/unit/peer-questionnaire-render.test.ts`
- NEW `apps/mobile/tests/unit/peer-request-cache.test.ts`
- NEW `packages/api-client/src/peer-answer-editor.ts`
- NEW `packages/api-client/tests/peer-answer-editor.test.ts`
- NEW `packages/domain/migrations/0157_claim-peer-mesh-reply-ownership.sql`

## Change Log
| Date | Version | Change |
|---|---|---|
| 2026-10-13 | 2.15 | **SECOND-PASS CODE REVIEW (3 chunks) + APPLY ALL** — groups 1–3 (domain / API / UI): S1 handed off to row 6-36 (BigDev), S12 BIND AND AUDIT (BigDev; PM12 amended in place), 38 patches applied incl. additive migration 0158 (applied to :5432 / :5433), S9–S11 + S37 (c) deferred, 42 dismissed. `ci:local` run 2 35/36 (live integration green), then the unit job 37/37 at CI concurrency after a test-only timeout. Status stays `done`; uncommitted. |
| 2026-10-12 | 2.14 | **CODE REVIEW + APPLY ALL** — all 12 findings fixed; cache owner / persistence boundaries, FIFO autosaves / recovery / Submit guards, additive migration 0157 ownership constraints, unavailable-answer wire state and durable claim / ping audit attribution. Follow-up review closed reverse Submit, refresh-error unmount, hidden failed draft, date refresh and Strict Mode gaps. 40 new regression tests; live CI 36/36, then final static CI 34/34. Status → `done`; sprint synced. Native / device proof and Rows 27 / 28 remain open; sibling implementation stays separate. |
| 2026-10-12 | 2.13 | ⭐ **DEV (`bmad-dev-story 6.27a`)** — Tasks 0.0 / 0.5–0.7 and 1–9 built on `story/6-27a`: the questionnaire engine (v1 historical / v2 live; the CF3 validator; the `'pending'` skip), migration 0156 (the ping's delivery columns; replies + append-only answers; the all-times trigger and its RECORDED erasure arm), the reply writer (claim → ping → reply; ⛔ KMS under a lock; the ONE event), the member + helpline routes (texted-only; one 404), the mobile screens (6.30's slot filled; the home card + notice-strip item, dark until texted), the District Admin's view (ceiling 23 → 26; `peerMesh` optional for an inspector before a full visit), erasure (20 tables / 23 statements), the fences, the records (Rows 27 / 28, the epics entries, deferred-work, the row 6-22 pointer). Status → `review`. |
| 2026-10-12 | 2.12 | The v2.10 / v2.11 validate (one fresh-context reviewer; 0 BLOCKER / 0 HIGH / 6 MEDIUM / 3 LOW — all applied): NW1 has FIVE entries (`questionnaires/index.ts` the sixth); OP13's closure is the allowed suspicion appeal (`suspicion_appeal_allowed`), ⛔ not `death_already_finally_approved` (OP4's); AC4's closure legs reach Task 3; Task 5 amends `app-link-route-map.test.ts:78-80` and keeps the right ranges; the header — the inner `<Stack />` shows one unless the screen hides it — with an AC5 leg; the home card and PM2's notice-strip item gain an AC5 leg and a Task 5 item; PM8 reads *ratified by `-324`*; the header records PM5 (iv)'s texts and F35 / F41 / PM23. |
| 2026-10-12 | 2.11 | ⭐ `2026-10-12-324` (Trustee-ratified, DR + KB — option A): PM8's R9 arm — answers taken while the special panel decides a claim that passed the month's vote — RATIFIED as `-311` committed it; the PM8 annotation and the header read RULED; ⛔ no PM, AC or Task text changes; ⛔ no code change. |
| 2026-10-12 | 2.10 | ⭐ RE-PINNED to `51b9000a` (after 6.30, 6.28, 6.34; BigDev chose *"Re-pin to main"* at `bmad-create-story 6.27a`): every moved code cite updated (five read-only checkers + the author); F12 — ceiling 23 and two required packet fields; F13 — six kinds; F17 — four queue sources; F18 — OP2 in the gate; F29 — Rows 29 / 30 written; F41 — the missed `verifier-console.spec.ts` consumers; F7's `:262-263` → `:269-270` (wrong since v2.0); dated annotations: PM8 (an OPEN `-318` / `-303` reading for BigDev; 6.28's mid-window closures), PM9 (END position), PM10 (the FIFTH source), PM11 (AL16 narrowing; the chrome strings' home corrected to `claim.json`), PM13 (from 23); AC4 closure legs; AC5 / Task 5 — 6.30 merged, its tests amended ⛔ never deleted, the session gate, the header, the placeholder; Task 7 — 6.28's fixtures; Trap 5 lists 6.28's changes; Trap 21 (6.34's DLT gate); ⛔ no PM, ruling or AC intent moved. |
| 2026-10-12 | 2.9a | ⭐ ANNOTATIONS by Story 6.34 Task 0.4 (TV11 / `2026-10-12-322` C6, C7 — ⛔ a PM moved, ⛔ a word above changed): on STPL / SmartPing the text keeps `{#var#}` and the tag names in PM3, Row 27 and Task 0.4 are the slot TYPES; 6.34 does ⛔ hand-verify 6.27c's texts (6.27c uses its vocabulary); the provider's answer on Devanagari / spaces in names is recorded ONCE at Row 30 (d) and Row 27's evidence line POINTS to it (a refusal goes back to the Panel — `-322` C7). |
| 2026-10-10 | 2.9 | ⭐ PM1–PM25 COMMITTED as `2026-10-10-311` (`082ab743`): PM1 — a skipped neighbour is REPLACED from the same group (deterministic, `replaces_ping_id`); PM2 — also an IN-APP alert (the home card + the notice strip; ⛔ no push / day-one WhatsApp / second SMS); Tasks 0.3 / 0.4 done; STATUS updated. |
| 2026-10-10 | 2.8 | `2026-10-10-310` (the Panel: CF1 A, CF2, CF3 (a)–(d), CF4 A, CF5 A): the confirm statuses updated to RULED; Row 27 (g) closed by it; the CF3 readings now ratified. |
| 2026-10-10 | 2.7 | `2026-10-10-307`: PM1 reads row 6-36's full order — workplace colleagues → people the member named and who accepted → ⛔ no one. |
| 2026-10-10 | 2.6 | `2026-10-10-306` (BigDev): the five are chosen by school (row 6-36), ⛔ never the district; 6.27c also waits for row 6-36; PM1 updated; CF4 owed. |
| 2026-10-10 | 2.5 | Round 6 (0 BLOCKER / 0 HIGH — validate ends): Row 27 (f) and PM23's basis id cite counsel's recorded basis (⛔ no longer circular); AC2 names the sweep AND the child; 6.27b's queue needs ⛔ no window term (PM8 corrected); build floor v2.5. |
| 2026-10-10 | 2.4 | Round 5 (0 BLOCKER / 1 HIGH): the `'pending'`-question hold is a config gap checked by BOTH the sweep and the child's begin path (6.27c AC2b); the "no ruled question is ever skipped" passages reworded to "no TEXTED neighbour sees one skipped"; a later chain-added health question HOLDS that Pariwar's texts (a cost row 6-33 must state; CF3 (d) says so); the basis edit cites counsel's recorded basis, Row 27 (f) closes on it; `answerWindowSql` + parity leg in Task 1; build floor v2.4. |
| 2026-10-10 | 2.3 | Round 4 (0 BLOCKER / 2 HIGH, both introduced by round 3): the erasure arm's admissions RECORDED honestly (a ciphertext-only or indexes → NULL write is admitted, 0149's limit — the AC3 leg records it); the `'pending'` health questions MECHANISED — 6.27c's sweep holds while any is pending, Row 27 (f) closes only when v2's basis is recorded in code, AC2's "no question skipped" corrected; `answerWindowSql` for set-based readers with a parity leg; stale "every version" wording; build floor v2.3; Tasks 2 / 6 carry the round-3 legs. |
| 2026-10-10 | 2.2 | Round-3 validate (one narrow reviewer; 1 HIGH): the seven-key rule scoped to the `peer_mesh` kind from v2 onward, v1 registered AND exempt (a test), the `ground_inspection` kind left to 6-32; the helpline PUT / submit 404 an untexted ping; the answer window = ONE predicate extracted from 6.26a's `isClaimInGroundInspectionWindow` into `claim/answer-window.ts`; the answers trigger holds at ALL times (APPEND-ONLY enforced); `health` + `counselBasis` as a state with a served-definition skip; the build gate reads v2.1+; the showing write idempotent with an as-of-`completed_at` recompute; `attempt_count NOT NULL DEFAULT 0` + the skip CAS; F19 / parity mention live R9; NW1 lines `:358-365`; `has_died` neighbour-only in `COMPARABLE_QUESTION_KEYS`. |
| 2026-10-10 | 2.1 | Round-2 validate (three reviewers; ⛔ no BLOCKER): the `detail` grammar + builder MOVED to 6.27c (6.27a ships the columns + structural CHECKs, the CAS finalise and transient note now recorded in PM4); the texts WAIT for Row 27 (f) — ⛔ no ruled question skipped; the validator requires EVERY ruled key; the answer window adds `state_trustee_approved` under a live R9 routing (`-283` A1 precedent); `name_too_long` / Devanagari recorded as an author reading + Row 27 evidence + an FYI; every member route 404s an untexted ping and the helpline list is gated; Task 5 needs 6.30's shell merged; the `?c=` split stated once; `isRealCalendarDate` extracted into the import-free leaf, the mapping in `peer-mesh-reply.ts`, an NW1 entry and a reachability test; F37 corrected (0143 + 0149; the 0143-form arm; `WHERE value_ciphertext IS NOT NULL`); encrypt / index in the handler (⛔ no KMS under a lock — story-wide); the inverted jobs test, `actor` default, `emitAuthAudit`, `clampLimit`, the optional field's tsc fallout; ① / ② wording and source; a SEPARATE showings table; *"no FULL visit"*; PM24's coarseness and escalation named; F20, F1 lines; rtbf counts; `locale_source`; send-status words; `submitted_at` forward-only; `UNIQUE (pariwar_id, reply_id)`; *"I don't know the date"* storage; a new field class; F39–F41; Trap 20. |
| 2026-10-10 | 2.0 | ⭐ After the fresh-context validate (four read-only reviewers) and `2026-10-10-305`: SPLIT into 6.27a (this file, the shared record) / 6.27b / 6.27c / 6.27d. The engine moves to a pure DOMAIN module (contracts cannot be imported by domain); the validator (⛔ not only a test) enforces the ruled questions, warning keys, `approvedBy`, ⛔ no alcohol, the counsel flags (per question / option; Row 27 (f)); v2 CURRENT; locks claim → ping → reply (the race was ⛔ not benign); warning keys per LIVE `answer_id`; `pariwar_id` on the answers table; indexes `text[]`; the erasure arm; the REVOKE before the column GRANT; texts while an answer can still be taken (PM5 (iv) — `-305` §2 item 4); the Pariwar's default language (PM22 — the preference table moved to row 6-35); the member surface DARK until a text is accepted, ⛔ no Turnstile, 404 / 409 split, server-resolved words, in-screen pages in 6.30's shell; the helpline's same save / submit shape; F33's real approver keys (Pariwar Admins as Trustee-Lite, ⛔ not State Trustees); PM25: the inspector asks the family OPEN-ENDED (`-305` §2 item 3), ① / ② only (③ / ④ owed by 6-32), the console field OPTIONAL, the kinds filtered (6.27b); Rows 27 / 28 reserved, Row 27 (c) Closed by `-303`, (f) health counsel, (g) CF1–CF3; stale text from v1.0–v1.9 removed (Invariants 5 / 7, AC1, Task 0, "Re-plan by answer" marked historical). |
| 2026-10-10 | 1.9 | The Panel RULED the follow-up note (`-304`): Q3–Q6 A; Q7 / Q8 the Panel's own chain. v2 as ruled; versions per Pariwar / all. |
| 2026-10-10 | 1.8 | The engine shared with the inspector's questionnaire; rows 6-32 / 6-33; Panel Q8. |
| 2026-10-10 | 1.7 | The inspector shown only discrepancies after completing; a notes table. |
| 2026-10-10 | 1.6 | Who sees the answers — PM24 (every approver at their step), PM25 (the inspector and the operator). |
| 2026-10-10 | 1.5 | The questionnaire — versioned, optional, auto-saved, Submit → Thank you; PM23. |
| 2026-10-10 | 1.4 | The Panel RULED `-303`: Q1 A + the language rider, Q2 A; PM22. |
| 2026-10-10 | 1.3 | Aligned with 6.30: the query-string link, the env base URL, one route file, typed DLT variables. |
| 2026-10-10 | 1.2 | The WhatsApp reminder at 48 hours — row 6-31; Trap 17. |
| 2026-10-10 | 1.1 | The link in the text — PM21; row 6-30. |
| 2026-10-10 | 1.0 | Created (`bmad-create-story 6.27`); pinned `5946e411`; routing note Q1 / Q2; PM1–PM20 proposed. |
