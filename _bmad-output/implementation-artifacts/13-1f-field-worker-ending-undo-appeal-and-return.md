---
baseline_commit: 5ede00c4
---

<!--
PINNED: `5ede00c4` = `origin/main` (ledger 2026-11-12l - Story 13.1g LANDED, PR #328, `cae6ac65..54ff8a67`). The story lives on branch
`story/13-1f-field-worker-ending-undo-appeal-and-return` in its OWN worktree (`.claude/worktrees/13-1f-field-worker-ending-undo-appeal-and-return`),
created from `origin/main` on 2026-11-12 with no upstream. Every `apps/` / `packages/` claim was traced at the pin on 2026-11-12 by the create-story
pass (the author's own reads of `state.ts`, `events.ts`, `commands.ts`, `project.ts`, `read.ts`, migrations `0200` / `0201`, the register and lifecycle
handlers, the admin module's copy and acts, the RBAC roles and catalog, and the governance trail `-453`..`-455`, Row 50, the 13.1c note, `deferred-work.md`).
Perishable - re-check at Task 0.1. Re-locate by FUNCTION, not by line.

STATUS: ready-for-dev (v1.4, 2026-11-16 - validated three times; Q-1..Q-4 ANSWERED by BigDev 2026-11-16: Q-1, Q-3, Q-4 A; Q-2 - the
mobile-matched link here, a returning worker found by PAN in the new sibling row `13-1h`, C6). Nothing committed. No code before Task 0.5.
VALIDATED: v1.1, v1.2 and v1.3 each re-traced the G / AD / TR code claims at `5ede00c4` (still `origin/main` on 2026-11-16) - re-derived, not inherited.

READ PLAN (the file is ~175 KB - read it in FOUR ranges, never one; re-locate by heading if lines moved): 1-312 (rulings, section 0, names,
G), 313-634 (AD, the Per-command table, the Concurrency matrix, errors), 635-921 (ASKs, the Panel note, invariants, ACs), 922-end (Tasks, Dev
Notes, the File checklist, records).
Build from: the AD block + "Per-command table" + "Concurrency matrix" + "File checklist" + the Tasks. The quote table, section 0 and the Panel
note plan are governance - read them, but they add no build step.

GLYPHS: `⛔ X` = do NOT / not X; `⭐` = an action; `⚠` = a hazard. AC and Task text uses plain words. No `file:NNN` pointer into a
newest-first file (`.decision-log.md`, `deferred-work.md`, `sprint-status.yaml`) - cite by id / clause / item / row key.

NUMBERS (re-grep each at Task 0.1; every one is contended by siblings):
- Next free decision: `-464` (the newest on any ref is `-463`, 13.1g's; grepped every branch 2026-11-12, 2026-11-13 and 2026-11-16). "The number belongs to the first COMMIT" (`-449`), and so does the DATE: the id is `<the day it is committed>-464` (`-461` was committed 2026-11-10; `-463` on 2026-11-12, a day after 13.1g was created) - never `2026-11-12-464` unless it is committed that day.
- RBAC: `PERMISSION_CATALOG_VERSION = 62`, 90 keys (`packages/domain/src/rbac/permissions.ts`). This story: ONE bump, 62 -> 63; keys 90 -> 94 (AD10; four keys - Q-1 A, Q-4 A).
- Migration: ONE, `0207` (the journal's last entry is idx 206, `0206_field-worker-notice-emails`, `when` 1797391800049 - the new `when` must be LATER,
  [[project_sibling_migration_when_order_shared_db]]). No sibling worktree has a `02xx` migration (14-3 ends at 0193, 6-22b at 0198, 6-39 at 0192).
- Ledger: the newest letter on `main` is `2026-11-12l` (read it live: letters collide across branches). The story branch's uncommitted ledger
  holds `2026-11-12m` (create-story), `2026-11-13a` (validation 1), `2026-11-14a` (validation 2), `2026-11-16a` (validation 3) and `2026-11-16b` (the answers); Task 0.0 commits all five.
- Roster: the highest row is 51 (`field-worker-move-requests-live`); Row 46 is RESERVED by 6.39 / 14.3. This story appends Row 52 (Task 0.4).
- Panel notes: 13.1c's note is RULED (`-454`); 13.1d's is RULED (`-459`); the 13.1a keys confirm is SENT, not ruled; the 13.1b confirm is WRITTEN, not sent.
-->

# Story 13.1f: A Mistaken Ending Is Undone, a Disputed One Is Appealed, and a Returning Field Worker Is Linked to Their Old Record - the Registering Officer Is Shown an Ended Worker's Number `[SURFACE]`

Status: in-progress

## WHAT THIS STORY IS, IN ONE PARAGRAPH

Story 13.1c built the route that ENDS a field worker (`field_worker.terminated`, four reasons, from any state but `terminated`), and as built an ending
is final: no event leaves `terminated`, and migration `0200` / `0201`'s guard rule (t) refuses any UPDATE of a terminated row. The Panel ruled on
2026-11-07 (`-454`, DR + KB) that this is wrong for two kinds of ending: **a slip** is undone by the Pariwar Admin, "restoring the worker as they were,
with the same code" (Q1 A), and **a dispute** may be appealed - heard by the Pariwar Admin, or by the Trustee Panel if a Pariwar Admin ended the
worker (Q1 A). It ruled that a worker who **comes back** is a NEW registration with a NEW code, LINKED to the old record (Q2 B), and that an officer
registering an ended worker's **number is shown** the date and reason of that ending, as information only (Q3 A). `-455` minted this row for those
four builds and made two of them - **the undo and the appeal record - a go-live gate for 13.1c's terminate route** (roster Row 50 (f)). This story
builds: a new transition OUT of `terminated` (`field_worker.ending_undone`) and the migration that lets the database accept it; the Pariwar Admin's
undo route; an appeal RECORD on its own stream (lodged, then allowed - which undoes the ending in the same transaction - refused or withdrawn) with the
hearer fixed at the moment of the ending; the shown-number line and the link on the register route; four keys; the screens; the reworded "Ending is
final" line; and ONE Panel note for what `-454` left unruled (credit for the time a worker was wrongly ended - which `-454` itself sends back "with the
work that builds the undo" - the appeal's rules, what the worker is told, who hears in the edge cases, a slip undo after a refused appeal, an allowed
appeal while the number is in use again, and the four keys). **Not here:** the held credit itself
(13.8 / 13.5), the conduct and fraud reasons (13.6), notices of an undo (C4), the 8-year removal (13.1e), a worker's own view (13.3).

## Story

As a **Pariwar Admin** - and, for an appeal against a Pariwar Admin's ending, **the Trustee Panel** - and, when registering, **any registering officer**,
I want **to undo an ending made by mistake, record a worker's appeal against an ending and its outcome, link a returning worker's new registration to their
old record, and be told when a number I am registering belonged to an ended worker**,
so that **a slip costs nobody anything, a worker ended unfairly has someone else to turn to, and one person's history reads as one.**

## Policy meaning (AI-10-1)

**This story introduces NO predicate on a MEMBER's access to a benefit, and changes none.** No member state, `member_attribution` row, account-frozen
source or payout field is touched (I9). A teacher who joins with any worker's code is a member in full in every case.

**It CHANGES which states a FIELD WORKER's existing credit predicate can return to.** 13.1's `acceptsNewAttributions(state)` stays `state === 'active'`
and is NOT edited (I9). What changes is that `terminated` is no longer always the last state: an undo (a slip, or an appeal allowed) returns the worker to
the state the ending left - so a worker ended while `active` is `active` again and their SAME code credits them again from that moment. *In the field
worker's terms:* **"If you were ended by mistake, the Pariwar Admin restores you exactly as you were, with the same code, and from then on teachers who
join with your code are credited to you again. If you think an ending was unfair, you can appeal - to the Pariwar Admin, or to the Trustee Panel if a
Pariwar Admin ended you - and if your appeal is allowed you are restored the same way. Whether teachers who joined with your code while you were
ended are credited to you is a question the Trust is putting to the Trustee Panel (no signup credits anyone yet). If you leave and come back with the
same phone number, you are registered again with a new code, the officer may link your old record to the new one, and your old code never credits you
again."**

*PROPOSED, not ruled* (the Panel note, Task 0.6): one appeal per ending, no time limit, who hears when the officer who ended you is the only Pariwar
Admin, the only trustee, or a super admin, whether a slip undo may follow a refused appeal, what happens to an allowed appeal while your number is in use by a new
registration, and whether you are told at the ending that you may appeal and to whom. "If your appeal is allowed you are restored the same way" is
the `epics.md` text (BigDev's), not a Panel ruling (section 0 row 1a). The sentence above changes if the Panel answers otherwise; it is never told to a
worker as settled until then.

The unruled half of that sentence is the credit for the ended window: `-454`, "does NOT cover": *"Credit for the time a wrongly-ended worker was
ended. ... NOT ruled - it returns to the Panel with the work that builds the undo, or with the credit recorder, whichever comes first."* THIS story
builds the undo, so it returns the question (Panel note Question 1, Task 0.6). It costs **nothing today**: no code records a signup's credit to a worker
(`resolveAttributionForRequest` has no caller - re-grep at Task 0.1). As built, the as-of read (`getFieldWorkerStateAt`) folds a signup captured
inside the ended window to `terminated` - not credited - and that stays the rule until the Panel answers and the recorder (13.8 / 13.5) builds the answer
(C1; Row 52 (c)).

**Checked against the Niyamavali** (the git-ignored private copies in the MAIN checkout, grepped by absolute path 2026-11-12:
`/Users/dev/Developer/projects/TWT/docs/legal/niyamavali.md`, `niyamavali.hi.md`, `privacy-policy.md`, for `field.?worker|kshetra` and the Hindi
compound for "field worker"; re-run 2026-11-14): **0 hits - SILENT on field workers.** The bare Hindi word for "area" has 4 hits in
`niyamavali.hi.md`, each meaning an area or scope, none a field worker. Every appeal hit (29 en lines / 28 hi) and restore hit (`restor` /
`reinstat` 18 en; the Hindi restore words 14) is about MEMBERS (appeal: Parts 7, 8 (20 of 29), 9 and 11, plus one each in the preamble, Appendix A and
the completion checklist; restore: Parts 3 and 8 and Appendix A). `privacy-policy.md` has 2 appeal hits, both about claim records. ⚠ Part 8 (§8.8)
lets a member appeal again after a refusal (one open at a time), sets no deadline, and has the appeal heard by a Panel member who took no part in the
act; this story's proposed "one appeal per ending" is narrower (Panel note Q2's cost), and its ender bar matches §8.8's (AD9). No text is pasted
here ([[project_legal_corpus_private_repo_split]]); the Niyamavali is a rulebook, not a ratified spec ([[feedback_niyamavali_rulebook_not_spec]]).

## The rulings and sources this story builds on (quoted, never paraphrased)

Quotes are word-for-word; typographic dashes are written as ASCII hyphens; "..." marks a cut.

| Source | Verbatim | Status |
|---|---|---|
| Panel `2026-11-07-454` Q1 A, as put | "The Pariwar Admin may undo any ending made by mistake, restoring the worker as they were, with the same code; both the ending and the undo stay in the history. A worker who says an ending was unfair may appeal: the Pariwar Admin hears it - or, if a Pariwar Admin ended them, the Trustee Panel." | Trustee-ratified - AD2-AD9 |
| `-454` Q1 A, cost as put, accepted | "A way back and an appeal record must be built before go-live. Field workers have no login yet, so an appeal is made by phone or in person and recorded by the officer who hears it. Teachers who joined with the code while it was ended were not credited; whether that is made up follows your answer to Question 6." | Trustee-ratified - Row 50 (f); AD9 (recorded by the hearer); Panel note Q1 |
| `-454` Q2 B, as put | "A new registration and a new code, linked to the old record." / "The history reads as one person's; the old code stays dead." Cost: "A link to build; teachers holding the old code can never credit them again." | Trustee-ratified - AD12 |
| `-454` Q3 A, as put | "The screen says the number belonged to a worker ended on a date, for a reason; the officer still decides." Cost: "A second officer learns of an earlier ending and its reason. A small piece of work on the register screen." | Trustee-ratified - AD11 |
| `-454` Q5 A, cost as put | "... It rests on the officer's word; a death recorded wrongly is put right under Question 1." | Trustee-ratified - a wrong `died` is undone like any ending (AC1) |
| `-454` Q6 C, as put | "under review - held, and credited if cleared; at the worker's own request - not credited." | Trustee-ratified - Panel note Q1's suggestion is BY ANALOGY to it: `-454` says the note's reading under Q6 for a wrongly-ended worker "was NOT in option C"; nothing built here |
| `-454` "does NOT cover", the credit bullet | "Credit for the time a wrongly-ended worker was ended. ... NOT ruled - it returns to the Panel with the work that builds the undo, or with the credit recorder, whichever comes first." | the author's reading inside a Trustee-ratified entry (`-454` "How much to trust") - Panel note Q1 (Task 0.6) |
| `-454` "does NOT cover", the appeal bullet | "Who hears an appeal when a Pariwar Admin who ended a worker is also the only Pariwar Admin, the time limit for an appeal, and what the worker is told. Not in the options; the author's to propose with the work that builds the appeal record, the Panel's if it touches what the worker is owed or told." | the author's reading inside a Trustee-ratified entry: `-454`'s "How much to trust" says "The limits under "does NOT cover" are the author's reading of where the options' words stop". The only-Pariwar-Admin case is "the author's to propose": `-464` RECORDS AD8 as that proposal (nothing amended - only the Panel can widen what its ruling covers) and it goes to the Panel to be confirmed (note Q4 (a), not yet sent). Time limit and the telling - note Q2, Q3 |
| `-454` "does NOT cover", the link bullet | "What the link (Q2 B) joins and who makes it - the officer at registration, or the system on a matching number (Q3 A's shown line makes the match visible; inside one Pariwar only). The author's, with that work." | the author's reading inside a Trustee-ratified entry - AD12; Q-2 |
| `-454` "does NOT cover", the conduct bullet | "The conduct and fraud reasons, their review, and whether a worker ended for conduct may return - Story 13.6's." | the author's reading inside a Trustee-ratified entry - C3 |
| `-453` AD8 (author-commit) | "End in every state but ended, with a line that ending is final" | author-commit - `-464` AMENDS it by name (AD14's reworded line; carrying out `-454` Q1 A and the `epics.md` copy line) |
| `-455` item 3 | "the Pariwar Admin's undo of a mistaken ending (same code; both acts in the history) and the appeal record (heard by the Pariwar Admin, or by the Trustee Panel when a Pariwar Admin ended the worker; recorded by the officer who hears it) - Q1 A; the link from a returning worker's new registration to their old record - Q2 B; the line on the register screen that a number belonged to an ended worker, information only - Q3 A. Each needs a new transition out of `terminated`, a change to the database rule that refuses any update of a terminated row, new permission keys (each a `-059` B (3) key with its own confirm), and a migration" | author-commit - the row's scope |
| `-455` item 6 | "NEW leg (f): the undo of a mistaken ending and the appeal record (row `13-1f`, Q1 A) are BUILT and deployed before the terminate route is used on a real worker ... The link and the shown number (Q2 B, Q3 A) are NOT go-live gates by the ruling's words; they ship with `13-1f`." | author-commit - Row 50 (f); Row 52 |
| `-059` amendment B (3) | "(3) Future permission additions for Finance Officer, Media/Comms, Field Worker, and Helpline Operator are to be ratified when their feature sets ship." | Trustee-ratified - the four keys go to the Panel (note Q5) |
| `-210` cl. 2 | (not quoted: its "WHAT IS NOT DELEGATED" names anything touching `PERMISSION_CATALOG_VERSION`, a role or a permission key) | Trustee-ratified - it EXCLUDES permission keys from its delegation; their authority is `-059` B (3) (note Q5). `-464` records them as `-453` / `-458` did ("forbids a silent mint" is their gloss, not `-210`'s text). (`-461` corrected a citation of `-210` as authority for a mint outside its class - a notice kind, not a key) |
| 13.1c C2 (ii) (`deferred-work.md`, item text) | "...so 13-1f snapshots every role the actor held or reads their grants as they were at the ending, and asks the Panel only if a dual-role officer's ending must count as a Pariwar Admin's (13.1c code review round 2, R2-9)" | deferred item - AD8 snapshots the ONE property the hearer rule needs (a `pariwar_admin` grant here, at the act), not every role - recorded in `-464`; the condition is MET (AD8 counts a dual-role ending as a Pariwar Admin's), so the Panel is asked (note Q4 (a)) |
| PRD FR-85 | "Field worker can be deactivated; existing attributions preserved; new attributions on deactivated code rejected." | PRD - binding; an undone ending re-opens the code; nothing earned is touched |
| `epics.md` Story 13.1f | "An appeal allowed undoes the ending as above." / "13.1c's "Ending is final" confirm line is reworded once the undo exists." | BigDev-minted epic text - AD9, AD14 |

### 0 - whose decision is this (`trustee-panel-routing-note-TEMPLATE.md` section 0, per edge)

| # | Edge - stripped of citations | Verdict |
|---|---|---|
| 1 | Can a mistaken ending be undone, by whom, and as what | **The Panel's - RULED** (`-454` Q1 A): the Pariwar Admin, as they were, same code |
| 1a | What an ALLOWED appeal gives the worker | **BigDev's epic text** (`epics.md` Story 13.1f: "An appeal allowed undoes the ending as above") - not a Panel ruling; the Panel's Q1 A rules only that an appeal exists and who hears it. Built as the epic says; note Q7 tests its one hard edge |
| 2 | Who hears an appeal | **The Panel's - RULED** (Q1 A): the Pariwar Admin, or the Panel if a Pariwar Admin ended them. The ONE-Pariwar-Admin case: `-454` leaves it "the author's to propose"; AD8 proposes the Panel (the ender is a Pariwar Admin), `-464` RECORDS the proposal (it amends nothing), and the Panel is asked to confirm it (note Q4 (a), not yet sent) |
| 3 | An officer who held BOTH the District Admin and the Pariwar Admin role ended the worker: who hears | **The Panel's - proposed by the author, put as a confirm** (note Q4 (a)). 13.1c C2 (ii) asks the Panel exactly when a dual-role officer's ending counts as a Pariwar Admin's, which AD8 does. Built on that proposal (the Panel hears) |
| 4 | A super admin ended the worker: who hears | **The Panel's.** Q1 A's default clause ("the Pariwar Admin hears it"), read literally, gives the Pariwar Admin for every ender who is not a Pariwar Admin; AD8 DEPARTS from it (the Panel hears), built ahead of the Panel and named so in `-464`, pending note Q4 (b); go-live held by Row 52 (b) |
| 4a | May a super admin HEAR an appeal (as a Pariwar Admin) | **The Panel's.** It WIDENS Q1 A's "the Pariwar Admin hears it" to an officer who is not a Pariwar Admin; built ahead of the Panel (a super admin may hear an appeal heard by the Pariwar Admin - it derives that key - and never one heard by the Panel) and named so in `-464`, pending note Q4 (c); go-live held by Row 52 (b) |
| 4b | Every `trustee_panel` holder of the Pariwar is the officer who ended the worker: who decides | **The Panel's** - who hears. Built: the appeal stays open (no lawful decider) and Row 52 (d) requires a trustee who could not have ended the worker; note Q4 (d) |
| 5 | Teachers who joined while the worker was wrongly ended: credited once undone? | **The Panel's** - what the Trust owes a worker; `-454` sends it back with this work. Note Q1; NOTHING built (as built the answer is option A, not credited, until 13.8 / 13.5) |
| 6 | An appeal's time limit; how many appeals per ending | **The Panel's** - it limits what a worker may ask for (owed). Built on the suggestion (no limit; one per ending); note Q2 |
| 7 | What the worker is told of an undo or an appeal's outcome, and by whom - and, at an ending, whether they are told that they may appeal and to whom | **The Panel's** - `-454`: "the Panel's if it touches what the worker is ... told". Built on the suggestion (the officer tells them, reminded on screen "Tell the worker." as `-459` Q3 A / `-461` CR41 A give for move requests; the system sends nothing to the worker); note Q3 (a) and (b) |
| 8 | The four new keys and their holders, and whether one `trustee_panel` account records the Panel's decision | **The Panel's in kind** (`-059` B (3); `trustee_panel` was constituted for members, Part 8) - built on the default; note Q5 |
| 9 | Who records the Panel's outcome in the console | **BigDev's** (Q-1) for option A (a trustee's own `trustee_panel` account - the hearer records, as `-454`'s accepted cost says). Option B (a Pariwar Admin transcribes) departs from "recorded by the officer who hears it" and would need the Panel. **ANSWERED: A** (BigDev, 2026-11-16) |
| 10 | Whether the link can join a returning worker who has a NEW number | **BigDev's** (Q-2) - `-454`: "What the link (Q2 B) joins and who makes it ... The author's". **ANSWERED** (2026-11-16): mobile OR PAN finds the old record, Aadhaar last 4 shown as a matches / differs check, both REQUIRED at registration - built in the new sibling row `13-1h` (C6); THIS story builds the mobile-matched link only (AD12). Two edges of that answer are NOT BigDev's and go with 13-1h: a PAN match showing an ending's date and reason widens `-454` Q3 A's "the number" (the Panel's), and the footing and notice for two new personal-data fields (counsel's - roster Row 19 precedent) |
| 10a | What the link lets an officer read of the earlier record | **Yours** - AD12 gates `log?record=` on the officer's OWN read authority over the earlier record, so the link discloses nothing the officer could not already read; nothing beyond Q3 A's date and reason reaches a second officer |
| 10b | A Pariwar Admin undoes "as a slip" an ending the Panel has heard and REFUSED | **The Panel's** - it touches the Panel's own ruling. Built AS RULED (Q1 A: "may undo any ending made by mistake"); note Q6 asks whether to refuse it (non-blocking) |
| 10c | An appeal is ALLOWED while the worker's number belongs to a new registration | **The Panel's** - what an allowed worker receives. Built: the decision is refused and the appeal stays open until that registration is ended (no ending reason describes this - a cost); note Q7 |
| 11 | The undo's mechanics, the appeal record's shape, the guard migration, the register flow, the key names, and the copy that says nothing of who is paid or told | **Yours** (AD) - no change to what a person is owed or told beyond what is ruled. Copy about who is paid or told is NOT yours: AD14 carries none beyond the rulings and the row-7 reminder |
| 11a | A legacy terminated event without `appeal_heard_by` | **Yours** - no production stream exists (Row 48 open); read as `trustee_panel` |
| 12 | Whether an undo or an appeal reaches an ending for CONDUCT | **13.6's** (`-454`) - no conduct reason exists yet; carried (C3) |

**Result: ONE Panel note (Task 0.6), SEVEN questions, all non-blocking. Q2-Q7 are built on our suggestion (Q6 as ruled); Q1 builds NOTHING - as built
the answer is option A until 13.8 / 13.5 build the Panel's. A different answer changes a rule or a holder before go-live (Row 52). Q-1..Q-4 are
BigDev's - ANSWERED 2026-11-16 (below).**

## Names at a glance

| Thing | Name |
|---|---|
| Keys (AD10 - Q-1 A + Q-4 A, BigDev 2026-11-16) | `field_worker.undo_ending` (`pariwar_admin` only); `field_worker.hear_ending_appeal` (`pariwar_admin` - appeals heard by the Pariwar Admin); `field_worker.hear_ending_appeal_as_panel` (`trustee_panel` ONLY; a `global` grant is refused by the command); `field_worker.read_ending_appeals` (`district_admin` own district, `pariwar_admin`, `trustee_panel`); `super_admin` derives all four. Catalog 62 -> 63, keys 90 -> 94 |
| Worker event (AD2) | `field_worker.ending_undone` - `terminated` -> the state the ending left; trigger `field_worker.undo_ending:mistake` / `:appeal_allowed` (a label, not the key) |
| Undo key list (AD2) | `FIELD_WORKER_UNDO_PERMISSION_KEYS = ['field_worker.undo_ending', 'field_worker.hear_ending_appeal', 'field_worker.hear_ending_appeal_as_panel'] as const` in `events.ts` (the move-key-list pattern) |
| Domain, new | In `commands.ts`: TWO exported writers, `undoFieldWorkerEnding` (cause `mistake`; supersedes an open appeal) and `allowFieldWorkerEndingAppeal` (cause `appeal_allowed`; writes `.allowed`), over a MODULE-PRIVATE core `undoEndingLocked` (never exported - the barrel is `export * from './commands.js'`, so an export is public) and a private `readFieldWorkerStreamLocked` (AD2, TR17). New files: `field-worker/ending-appeal-{events,state,lock,project,supersede,commands,read}.ts` - `ending-appeal-commands.ts` holds lodge / refuse / withdraw only; `-lock`, `-project` and `-supersede` import NOTHING from `commands.ts` and are NOT re-exported by `index.ts` (13.1d TR12; the `move-request-supersede.ts` pattern). In `read.ts`: `getCurrentFieldWorkerEnding` / `getCurrentFieldWorkerEndingLocked` (AD17), `findEndedFieldWorkersByMobileIndex`, `getFieldWorkerMobileIndex`, `lockFieldWorkerForLink` (`FOR SHARE`, the `lockFieldWorkerForCodeRead` precedent), `listFieldWorkerLinkChain`, `listAppealEligibleFieldWorkers`. The new error classes in `field-worker/errors.ts`; a branded `FieldWorkerEndingAppealId` in `ids/index.ts` |
| Domain, changed | `state.ts` (`nextFieldWorkerState`'s undo arm BEFORE the table lookup, through a fold-only `{ to_state, reason_code }` schema; `reduce` AND `foldFieldWorkerProjection`'s own call both pass the payload; a doc-only `FIELD_WORKER_UNDO_TRANSITIONS` array kept OUT of `FIELD_WORKER_TRANSITIONS`); `events.ts` (the new payload with its cause-key superRefine, `appeal_heard_by` on `terminated` - OPTIONAL in the schema, required by the command's input, AD8 - every event's key pinned - R2-D1); `commands.ts` (`runLockedTransition` takes an optional `resolveTarget`; `istToday` and `verifiedSnapshot`'s event union widened for the appeal events, both reached by the appeal files through a non-barrel path - Task 3.4); `project.ts` (the undo writer variable; the undone-event check; the 23505 on the live-number index mapped on UPDATE; the genesis INSERT writes `previous_field_worker_id`); `terminateFieldWorker` (takes `appealHeardBy`); `registerFieldWorker` (takes `previousFieldWorkerId`) |
| Appeal stream | `field_worker_ending_appeal.{lodged,allowed,refused,withdrawn,superseded}`, `stream_id = appeal_id` |
| Migration `0207` | `0207_field-worker-ending-undo-appeal-link.sql`: the guard function replaced (rule (t) -> (t'), copied from `0201`); `field_workers.previous_field_worker_id` + its composite FK + CHECK; the table `field_worker_ending_appeals` (text + CHECK states, the decider / ender CHECKs, partial unique open), its transition guard and its no-delete / no-truncate triggers (AD7) |
| Routes (AD13) | `POST /api/v1/p/:pariwarId/field-workers/:fieldWorkerId/undo-ending`; `POST .../:fieldWorkerId/ending-appeals`; `POST .../ending-appeals/:appealId/{decide,withdraw}`; `GET .../field-workers/ending-appeals` (the list); `GET .../field-workers/ending-appeals/eligible` (ended workers a hearer can record an appeal for); `GET .../:fieldWorkerId/ending-appeals?limit=`; `GET .../:fieldWorkerId/log?record=<earlier id>` |
| API files | `apps/api/src/modules/field-worker/undo-handlers.ts`, `ending-appeal-handlers.ts`; `gate.ts` (the lodge loader and the appeal loader, beside `loadFieldWorkerGateDistrict` / `loadMoveRequestGate`); `handlers.ts` (register: shown number + link); `lifecycle-handlers.ts` (terminate: `appealHeardBy`; every act returns `state_event_version`); `log-handlers.ts` (`record`; its RE-EXAMINE header annotated); `routes.ts`; `errors.ts`; `apps/api/src/types.ts` (the new request stash fields `endingAppealHeardBy?` / `endingAppealGateDistrict?`) |
| Errors (new codes) | `field_worker.number_previously_ended` (409, with details), `field_worker.link_invalid` (422), `field_worker.number_registered_again` (409), `field_worker.ending_changed` (409), `field_worker.appeal_open` (409), `field_worker.appeal_already_decided` (409), `field_worker.appeal_not_open` (409), `field_worker.appeal_wrong_hearer` (409 - a super admin on a Panel-heard appeal; other wrong hearers get the gate's 403 first), `field_worker.appeal_decider_is_ender` (409), `field_worker.appeal_date_invalid` (422) |
| Audit actions | = the event type: `field_worker.ending_undone`, `field_worker_ending_appeal.lodged` / `.allowed` / `.refused` / `.withdrawn` / `.superseded` (the undo's line covers its supersede); `field_worker.previous_endings_shown` (the shown line); `field_worker.ending_appeal_list_viewed` (the names on the list); `field_worker.ending_appeal_candidates_viewed` (the names on the eligible list) |
| Admin | `apps/admin/src/api/hooks.ts` (`useFieldWorkerAct` copies `state_event_version`; the new hooks); `WorkerDetail.tsx` (`WorkerSummary` gains `state_event_version`); `apps/admin/src/modules/field-workers/`: `WorkerActions.tsx` (`ACTS_BY_STATE.terminated = ['undo']`, a `REASONS` entry for `'undo'`; the End line reworded), `derive.ts` (`'undo'` in `WorkerAct`; `fw.actions.noAccess.undo`; `'appeals'` in `Surface` / `NO_ACCESS_KEY`; `roleLabel` + `fw.role.trustee_panel`; `BY_CODE` rows), `WorkerHistory.tsx` (the new event, the earlier record), `RegisterFieldWorkerPage.tsx` (the shown line, the link choice), NEW `AppealsPage.tsx` + `AppealActions.tsx` (incl. "Record an appeal" from the eligible list), `FieldWorkerNav.tsx` (an "Appeals" tab, `'appeals'` in `FieldWorkerPage`), `apps/admin/src/router.tsx` (the `/p/$pariwarId/field-workers/appeals` route beside `requests`) + NEW `apps/admin/src/routes/FieldWorkerAppealsRoute.tsx` (the session gate and `key={pariwarId}`, copied from `FieldWorkerMoveRequestsRoute.tsx`) and the module `index.ts` export of `AppealsPage`, copy in `i18n-en.ts` |
| Roster | Row 52 `field-worker-ending-undo-appeal-live`; dated lines at Row 50 (f) and Row 48 (i) |
| Panel note | `_bmad-output/planning-artifacts/trustee-panel-routing-note-<the day it is written>-story-13-1f-field-worker-undo-and-appeal.md` (Task 0.6; the 13.1c / 13.1d notes are dated the day they were written) |

## FOUND FACTS (G) - traced at `5ede00c4`, 2026-11-12 (G1-G22) and 2026-11-14 (G23-G29)

- **G1 - `terminated` is terminal in three places.** (a) `state.ts` `FIELD_WORKER_TRANSITIONS`: no arm leaves `terminated`; the header says "No event
  leaves it - `posted` included. A worker taken back is a NEW registration". (b) `nextFieldWorkerState(state, eventType)` reads NO payload ("PURE; reads no
  payload") and is the legality check of the projector (`project.ts` `projectFieldWorkerTransition`), of `runLockedTransition` (`commands.ts`) and of
  the API pre-read (`lifecycle-handlers.ts` `act`: `nextFieldWorkerState(worker.currentState, event) === null` => 409). (c) The guard function, LAST
  defined by `0201_field-workers-list-index.sql` (`CREATE OR REPLACE FUNCTION field_workers_reject_unguarded_state_write`; only `0200` and `0201`
  define it - never copy `0200`'s older body), rule (t), placed between (a) and (b): "a terminated field worker is never updated", guarded or not.
- **G2 - "As they were" is computable, and only from the stream.** The row after an ending holds `current_state = 'terminated'`, the TERMINATE reason in
  `state_reason_code` and `ended_on`; the pre-ending state and (if suspended) the suspension reason are overwritten. The terminated payload carries
  `from_state` (`'pending_kyc' | 'active' | 'suspended'`). A suspended worker's reason is the last applied `field_worker.suspended` event's (a `posted`
  never changes it). `foldFieldWorkerProjection(rows)` (`state.ts`) is pure and never throws: the fold of the stream PREFIX before the latest
  `field_worker.terminated` event is exactly "as they were", except `version`, `audit_id` and `updated_at`. `kyc_status` is never changed by an ending; `district` cannot change
  while terminated (`posted` is illegal there); `approved_by_display` (`0201`) is never changed by an ending.
- **G3 - The live-number index re-enters on an undo.** `field_workers_pariwar_mobile_live_uq` is `UNIQUE (pariwar_id, mobile_blind_index) WHERE
  current_state <> 'terminated'` (`0200`). An UPDATE that takes a row out of `terminated` while another LIVE row holds the same number fails 23505 on that
  name - and today 23505 on it is mapped ONLY in the genesis (`project.ts` `projectFieldWorkerGenesis` -> `FieldWorkerMobileAlreadyRegisteredError`);
  `projectFieldWorkerTransition`'s UPDATE catch maps it to `FieldWorkerPersistError` (a 500). 13.1c AC6 (a) proves a number is registered again after
  an ending - the exact path that makes an undo collide (13.1c C2 (i)).
- **G4 - The other row CHECKs hold across an undo.** `field_workers_state_reason_pair` (suspended / terminated <=> a reason), `_state_reason_subset`
  (`0204`), `_active_needs_kyc`, `_ended_on_pair` (terminated <=> `ended_on`), `field_workers_approved_by_state` (`0201`, NOT VALID: `pending_kyc` =>
  NULL; `active` / `suspended` => a value). A restored projection satisfies each by construction (G2); a test proves it per from-state.
- **G5 - The code is not touched by an ending.** `field_worker_attribution_codes` (13.2) is append-only for every role, one permanent code per worker,
  with NO state column; credit liveness is `acceptsNewAttributions(state)` alone. So "with the same code" needs NO write to the code table - restoring the
  state restores the code (I3). Q2 B's "the old code stays dead" is likewise automatic: the old record stays `terminated`.
- **G6 - Who ended the worker is NOT reliably recorded.** The terminated payload's `authorization.role` is the MOST SPECIFIC grant's (`authorizingGrant`
  asks `district` before `pariwar`, `events.ts` comment at `FieldWorkerTerminatedPayloadSchema`): an officer holding both the worker's District Admin grant
  and a Pariwar Admin grant is recorded as `district_admin` (13.1c R2-9). No grant-history table exists in `packages/domain/src/schema` (13.1c RP-10; re-grep
  for `role_grant` history at Task 0.1). The grants AT the act are on the request: `request.scopeGrants: rbac.EffectiveGrant[]` (`apps/api/src/types.ts`,
  loaded once by `middleware/scope-resolution`), each `{ pariwarId, role, scopeDimension, scopeValue, grantId? }`.
- **G7 - The ending supersedes a move request, finally.** `terminateFieldWorker` calls `afterEnding` (`move-request-supersede.ts`) after the
  transition: the worker's open request becomes `superseded` (cause `worker_ended`), notices are written, and the supersede is final (13.1d C3).
- **G8 - The register route** (`handlers.ts` `register`): `prepare` (content rules, display name) -> `run`: `assertDistrictRecorded` -> seal ->
  `findLiveFieldWorkerByMobileIndex` PRE-CHECK (409 `mobile_already_registered`, NO audit line) -> `withCompensatingAudit` -> `registerFieldWorker` +
  the code allocation -> COMMIT. No read of ENDED rows by number exists. `ApiError` carries an optional `details` (`http-errors.ts`; "structured
  `details` carries only safe context"). The genesis payload `FieldWorkerRegisteredPayloadSchema` is `.strict()`.
- **G9 - The guard's rule (b) makes a new column immutable by default** ("the 0189 chained-key form ... a column added later is covered by default");
  the INSERT branch checks the genesis SHAPE only. So a `previous_field_worker_id` written at the genesis INSERT can never change afterwards. A
  composite FK `(pariwar_id, previous_field_worker_id) -> field_workers (pariwar_id, field_worker_id)` can target `field_workers_pariwar_worker_uq`.
- **G10 - The log read and its contract are CLOSED.** `listFieldWorkerEvents` (`read.ts`) maps any payload generically (`reason_code`, districts,
  `ended_on`, the authorization), but `@twt/contracts` `FIELD_WORKER_EVENT_TYPES` is a closed 7-tuple (its comment: "Row 13-1f adds the undo's (13.1c C2
  (iii))") and `FieldWorkerLogItem` is `.strict()` - a new event type or field fails the response schema. `getFieldWorkerStateAt`'s ordering contract
  says "(7) all seven event types replay".
- **G11 - The admin module.** `WorkerActions.tsx`: `ACTS_BY_STATE.terminated = []`, and `REASONS: Record<WorkerAct, ...>` (a new `WorkerAct` in
  `derive.ts` needs an entry there); the End confirm shows `fw.actions.end.final` = "Ending is final. Their code stops crediting new teachers; to work
  again they must be registered again." - the comment "Row 13-1f rewords this line when the undo of a mistaken ending exists (`-454` Q1 A)." sits beside
  that key in `i18n-en.ts`. The nav's `FieldWorkerPage` union is `'register' | 'approvals' | 'find' | 'requests'`; `router.tsx` holds the routes. `WorkerHistory.tsx` labels by `fw.history.event.${e.event_type}` (seven keys). `RegisterFieldWorkerPage.tsx` maps
  `mobile_already_registered` through `derive.ts` (`fw.err.mobileTaken`). `apps/admin/tests/field-worker-derive.test.ts` walks `FIELD_WORKER_EN_KEYS`.
- **G12 - RBAC.** Catalog v62, 90 keys; field-worker key comments in `roles.ts` say "⛔ state_trustee / trustee_panel" for every field-worker key so far.
  `trustee_panel` is a seeded role, `scopeCeiling: 'pariwar'`, PROVISIONAL (Q4 of `-096`), holding `member.restore_terminated` (10.19, "held by
  `trustee_panel` ALONE") and `member.decide_moderation_appeal` (10.22) - the precedent for the Panel acting in the console as its own role. A
  `pariwar_admin` (pariwar-level) grant satisfies the field-worker keys' `district` checks, and so does a `trustee_panel` pariwar grant (`scope.ts`,
  after the ceiling check - traced v1.1). ⚠ When two grants of the SAME dimension both carry a key, `authorizingGrant` picks by ROLE NAME
  (`compareGrantSpecificity` in `check.ts`), so a holder of `pariwar_admin` + `trustee_panel` is always recorded as `pariwar_admin`. A key shared by
  the two roles therefore cannot record that the PANEL acted - the reason 10.22 split its key (`roles.ts`: "a SEPARATE key expresses that authority
  because `member.moderate` is shared with `pariwar_admin` and so cannot distinguish"). `requirePermissionHook(deps, key, opts)` takes a FIXED key.
  `request.authorizations[key]` is the verified record of who authorized; `types.ts` TR13 forbids recomputing it from `scopeGrants`.
- **G13 - The 13.1d request is the template for the appeal.** `field_worker_move_requests` (`0205`): its own event stream + a projected table, states
  as `text` with a CHECK (no Postgres enum - no `ADD VALUE` one-transaction trap), a partial unique "one open per worker", a projector-only guard
  trigger, lock order WORKER row first, request second (13.1d I5), the acceptance executing the worker's move in the same transaction.
- **G14 - Members' precedent, and where this differs.** 10.22's moderation appeal is a RECORD whose `allowed` DIRECTS a restore performed as a separate
  Panel act (memory: "It is a RECORD, never a moderation act"). The epic for THIS row says "An appeal allowed undoes the ending as above" - so here the
  allowed outcome performs the undo in the same transaction (AD9), as 13.1d's acceptance performs the move.
- **G15 - R2-D1 is open for six worker events and names this story.** `FieldWorkerAuthorizationSnapshotSchema` accepts any key string; `posted` alone is
  pinned (13.1d). `deferred-work.md` R2-D1: "Owner: the next story that adds a WRITER of field-worker events outside `commands.ts` (13.1d's acceptance,
  13-1f's undo)." `events.test.ts` pins `actAuth('x')` as a CONTROL.
- **G16 - What nothing reads yet.** No code credits a field worker (`resolveAttributionForRequest` has no caller); 13.1e (the 8-year scrub) is
  backlog - its migration will `CREATE OR REPLACE` the same guard function (`0200` header: "its migration must `CREATE OR REPLACE` this function").
- **G17 - The state machine cannot carry a payload-dependent target as built.** (a) `nextFieldWorkerState` is a `.find` over the ONE
  `FIELD_WORKER_TRANSITIONS` table ("ONE table feeds both the documentation matrix and the runtime lookup"): three `terminated -> *` rows added there
  make every two-argument call return the FIRST (`pending_kyc`), never `null`. (b) `reduce` calls `nextFieldWorkerState(state, event.type)` without
  the payload, and `fieldWorkerStateMachine` / `replayFieldWorkerState` go through it. (c) `runLockedTransition` (`commands.ts`) computes
  `nextFieldWorkerState(row.currentState, eventType)` BEFORE the command's guard runs and throws `FieldWorkerIllegalTransitionError` on `null`, then
  builds `to_state` from that same value - so an undo through it always fails. (d) The projector's from/to cross-check compares the payload's `to_state`
  with `nextFieldWorkerState(from, type)`; fed the payload, it compares `to_state` with itself. (e) No existing read does what the undo needs:
  `getFieldWorkerStateAt` folds the WHOLE stream and runs its own existence check; a `Db` on the locked client exists (`bindScopedDb(client)`, used in
  `project.ts`), so the new read is about WHAT it reads (the prefix before the latest ending), not about the client. (f) `state.test.ts` pins the arm
  count (`legal` `toBe(10)`), the literal table, and "nothing leaves terminated" (`nextFieldWorkerState('terminated', t)` is null for every `t` in
  the table). With the undo rows kept OUT of the table these stay green UNCHANGED - add the payload legs, never edit the count. (g) The fold makes its
  OWN legality call, separate from `reduce`: `foldFieldWorkerProjection` does `const next = nextFieldWorkerState(state, row.type); if (next ===
  null) continue;`. Unless that call passes `row.payload` too, the undo is skipped by the fold and the row-equals-fold check fails. The `state.ts`
  header (R4-10) forbids folding through the full WRITE schemas (their pinned `trigger` text), so the fold parses a small fold-only shape.
- **G18 - Tests and gates that pin what this story changes.** `field-workers-policy-regression.spec.ts` pins the exact column list AND "the named
  CHECKs, the FK-target UNIQUE and the primary key - and nothing else" (a new column, CHECK and FK turn it red). `events.test.ts`'s `actAuth('x')` is
  the CR6 CONTROL that proves the next line's refusal is the stray `display_name` key. `events.test.ts` pins `toHaveLength(7)`; `permissions.test.ts`
  pins 62 / 90. `scripts/field-worker-state-invariant` is a STATIC AST scan for writers of the nine guarded columns (allowlist
  `projectFieldWorkerGenesis` / `projectFieldWorkerTransition`) - it folds nothing; the row-equals-fold check is the `_fixtures.ts` helper in
  `packages/domain/tests/integration/field-worker/`. 13.1d shipped `scripts/field-worker-move-request-invariant` with a CI job for its table.
  `forced-pagination.spec.ts` (it reads the LIVE routes through `app.swagger()`) requires every GET whose 200 body is `{ items: [] }` to declare a
  bounded `limit`. `packages/contracts/scripts/emit-openapi.ts` registers every path BY HAND (`registry.registerPath`) and describes
  `field_worker.terminated` as "final in this version"; `packages/events/src/registry.ts` describes it as "Terminal;". The
  `apps/jobs/tests/field-worker-notice-email-no-decision.test.ts` fence lists writer NAMES (`FORBIDDEN`, incl. `'terminateFieldWorker'`) and table
  names (`FORBIDDEN_TABLE_NAMES`); its rule: "A NAME here must be a REAL export" - so a private core cannot be listed.
- **G19 - Reads that do not exist.** No domain read returns a terminated row's `mobile_blind_index` (`FieldWorkerView` omits it;
  `getFieldWorkerSealedIdentity` returns ciphertexts only). No read lists ended workers to anyone without `field_worker.view`.
- **G20 - A 409 is never stored by the idempotency layer.** `withIdempotency` (`write-support.ts`) records a result only on success and RELEASES the key
  on a throw. So a replay of a refused request runs again, and a retried refusal that writes an audit line writes it again.
- **G21 - The code text is final per worker.** The 13.1b sweep settles a worker who is not `active` at send time as `skipped_not_active` - final, one
  row per worker (`UNIQUE (pariwar_id, field_worker_id)`), shown as "not delivered". A worker activated, ended before the sweep ran, then undone, never
  gets the text; the code is read by hand (`GET .../:fieldWorkerId/code`, `field_worker.read_code`).
- **G22 - Making `appealHeardBy` required breaks direct callers** of `terminateFieldWorker` / the projector (`git grep -n "terminateFieldWorker("`
  at Task 0.1 - this list is the 5ede00c4 one): domain `tests/field-worker/commands-guards.test.ts` (14 calls), `tests/integration/field-worker/`
  `commands.spec`, `move-requests.spec`, `notice-emails.spec`, `read.spec`, `log.spec`, `projector-trigger.spec`, `stream-concurrency.spec`; api
  `tests/integration/field-worker/approval.spec.ts`, `code-read.spec.ts`, `terminate-race.spec.ts` (each calls `fieldWorker.terminateFieldWorker`
  directly); jobs `field-worker-code-sms-live.test.ts`; and the `VALID['field_worker.terminated']` fixture in `events.test.ts`. (The jobs
  `field-worker-notice-email-no-decision.test.ts` is a NAME fence, not a caller - G18.)
- **G23 - The barrel exports ALL of `commands.ts`.** `field-worker/index.ts`: `export * from './commands.js'`; its header names the two helpers that
  export carries for 13.1d's request commands (`lockFieldWorkerRow`, `verifiedSnapshot` - 13.1d CR19: neither writes). `runLockedTransition` and
  `istToday` are module-private. `move-request-commands.ts` imports `lockFieldWorkerRow, postFieldWorker, verifiedSnapshot` from `./commands.js`;
  `commands.ts` imports `move-request-supersede.ts`, which imports nothing from `commands.ts` (its header: TR12) and is not re-exported.
- **G24 - The act result carries no version, and the screen patches only two fields.** Contract `FieldWorkerLifecycleResult` (`dto.ts`) is
  `{ field_worker_id, district, current_state, state_reason_code, ended_on }`; `useFieldWorkerAct` (`apps/admin/src/api/hooks.ts`) does
  `{ ...old, current_state: result.current_state, district: result.district }` on the identity cache and invalidates the lists and the log only. The
  domain's `FieldWorkerTransitionResult` (`project.ts`) is `{ eventId, eventVersion, fromState, state, kycStatus, district }` - a version, but no
  reason (the handlers take `state_reason_code` from the BODY). `FieldWorkerIdentityResponse` lacks `state_event_version`; `FieldWorkerView` has it.
- **G25 - Errors and audit twins.** The 403 code is `authz.forbidden` (`AUTHORIZATION_DENIED_CODE`, `packages/domain/src/errors.ts`). There are NO
  `_rolled_back` error classes: `_rolled_back` is the compensating AUDIT line `withCompensatingAudit` writes when `mutate` throws, then rethrows
  (`lifecycle-handlers.ts`: "the `_rolled_back` twin is written (TR2)"). `isFieldWorkerStateDirectWriteError` (`errors.ts`) matches P0001 whose
  message starts with `FIELD_WORKER_STATE_DIRECT_WRITE_MESSAGE_PREFIX` = `'field_workers direct write rejected'` - every rule's message in `0201` has it.
- **G26 - A gate that picks between prebuilt permission hooks already exists.** `apps/api/src/modules/claims/claims.appeal.routes.ts`
  `requireAnyAppealAccess` invokes prebuilt `requirePermissionHook` closures directly (a cast, not Fastify's hook registration). `check.test.ts`'s
  R3-29 / R4-4 fence flags any USE of `rbac.requirePermission`'s result outside `check.ts` and the hook - so a dispatcher calls the HOOKS, never
  `rbac.requirePermission`. `rbac.hasPermission(grants, key, { dimension, value, pariwarId }, ctx?)` is already used in `gate.ts`.
- **G27 - The "no oracle" 403 is not one (13.1d CR31, open, INHERITED).** `AuthorizationDeniedError.toErrorResponse` returns `details: this.denial`
  with `targetLocator`; a loader that stashes a real district for an existing row and `null` for an unknown id lets a grant-holder tell them apart.
  CR31's trigger names "a route whose existence must not leak by UUID" - this story's appeal routes fire it.
- **G28 - 13.1d's list and read machinery to REUSE.** `gate.ts` `listGateDimension` / `listGateValue` (passed as `resolveDimension` /
  `resolveValue` - the "district absent => a Pariwar-level grant only" rule); the contract's `clampedLimit(max)` (`dto.ts`, module-private - export
  it or reuse in place) plus the domain's `clampLimit` (`packages/domain/src/pagination.ts`, enforced by `scripts/domain-accessor-invariants`); the
  page shape of `move-request-handlers.ts` `list` (read on the hook transaction -> `releaseHookTx` -> `withCompensatingAudit` with
  `resourceLocator: field_workers/<ids>` -> `mapWithConcurrency(DIRECTORY_DECRYPT_CONCURRENCY)` decrypt inside `mutate`). 13.1d's page default is
  20 (`PAGE_MOVE_REQUESTS_DEFAULT_LIMIT`), its cap 25. Every decrypting field-worker GET carries `config: { rateLimit: limits.read }`, pinned by
  object identity in `move-requests.spec.ts` AC7 (d) and `reads.spec.ts` CR20. `read.ts` `lockFieldWorkerForCodeRead` is the `.for('share')` precedent.
- **G29 - Test cleanups delete table by table.** `apps/api/tests/integration/field-worker/_registration-harness.ts` `cleanup()`, the domain
  `_fixtures.ts`, and `apps/jobs/tests/field-worker-move-request-escalation-live.test.ts` / `-notice-emails-live` delete each table under
  `session_replication_role = 'replica'` (FKs off) - a new table they do not name leaks rows into the next spec. The HTTP harness already has
  `h.actor(p, role, dim, value)` and `h.addGrant(...)`; `apps/api/tests/integration/_field-worker-fixture.ts` (NOT under `field-worker/`) builds
  `rbac.authorize` snapshots for direct domain calls; the domain `_fixtures.ts` (`FieldWorkerActKey`, `grantAuthorization`'s role union) is allowlisted
  by exact path in `check.test.ts`.

## Build decisions AD1-AD17 - the author's recommendations; BigDev's at Q-1..Q-4 (answered 2026-11-16); recorded at Task 0.3

- **AD1 - Scope.** The undo (worker event, guard migration, route, screen), the appeal record (stream, table, four writes, three reads, screens), the
  hearer fixed at the ending (a change to 13.1c's terminate route), the shown-number line and the link (register route and screen), the log's earlier
  record, four keys, the End line reworded, ONE Panel note, Row 52. NOT here: the held credit for an ended window (Panel note Q1, then 13.8 / 13.5 -
  C1); notices of an undo or an appeal (C4); the conduct reasons (13.6 - C3); the 8-year scrub (13.1e - C2); a worker's own view (13.3 - C5); a link
  across Pariwars (13.1 C11); a returning worker found by PAN, with the Aadhaar last 4 shown (Q-2 - row `13-1h`, C6); re-sending a code text after an undo (C7).
- **AD2 - The undo is ONE new event on the worker's stream, `field_worker.ending_undone`: `terminated -> <the state the ending left>`.** Its strict payload:
  `from_state: 'terminated'`, `to_state: 'pending_kyc' | 'active' | 'suspended'`, `trigger` (`field_worker.undo_ending:mistake` |
  `:appeal_allowed` - a LABEL; the key is the authorization's), `actor`, `authorization` (key PINNED to `FIELD_WORKER_UNDO_PERMISSION_KEYS`), `cause:
  'mistake' | 'appeal_allowed'`, `appeal_id` (a uuid iff `cause = 'appeal_allowed'`, else null), `undone_ending_version` (the `event_version` of the
  `field_worker.terminated` event it undoes), `reason_code` (the restored SUSPENSION reason iff `to_state = 'suspended'`, else null - superRefine).
  A second superRefine ties the cause to the key: `cause = 'mistake'` iff `authorization.permission_key = 'field_worker.undo_ending'` (and
  `appeal_id` null); `cause = 'appeal_allowed'` iff the key is one of the two hear keys (and `appeal_id` a uuid) - one test leg per wrong pairing.
  **How it is computed (G17, G23):** one MODULE-PRIVATE core in `commands.ts`, `undoEndingLocked(client, input)` - never exported, because the barrel
  is `export * from './commands.js'` and any export is public. It runs `runLockedTransition` with a new optional `resolveTarget(row)` hook. When the
  hook is given, the runner's legality step is `row.currentState === 'terminated'` (else `FieldWorkerIllegalTransitionError`) and the target comes
  from the hook, never from the table. The command's guard runs the same `assertLockedTarget` (3d) check every other act runs. The hook reads the
  stream on the locked client (`readFieldWorkerStreamLocked`, private, new), folds the PREFIX before the latest `field_worker.terminated` event (G2;
  earlier `ending_undone` events in the prefix fold through AD3's arm), checks the result against that event's `from_state` - read RAW from the
  payload, never through the strict schema - (a mismatch is `FieldWorkerProjectorInputError` - a corrupt stream, a 500) and returns `to_state` +
  `reason_code`; nothing comes from the caller. **Its two callers are the only exported writers of the undo, both in `commands.ts`:**
  `undoFieldWorkerEnding` (cause `mistake`, key `field_worker.undo_ending`; after the transition it calls `ending-appeal-supersede.ts` to supersede
  an open appeal) and `allowFieldWorkerEndingAppeal` (cause `appeal_allowed`, one of the hear keys: it locks the worker, then the appeal through
  `ending-appeal-lock.ts`, runs AD9's checks, calls the core, then `ending-appeal-project.ts` for `.allowed`). So no caller of the barrel can pass
  an unchecked `appeal_id`, and `ending-appeal-{lock,project,supersede}.ts` import nothing from `commands.ts` (no import cycle - 13.1d TR12; TR17).
  A unit leg pins `expect('undoEndingLocked' in fieldWorker).toBe(false)` (and the same for `readFieldWorkerStreamLocked`). Both writers return
  `FieldWorkerTransitionResult` plus `reasonCode` (the restored reason) and `endedOn: null` - the handler builds the 200 from THAT, never from a body.
  **Statement order** (pinned in `commands-guards.test.ts`, which records every query and shows an unclassified one as `OTHER: …` - add `classify`
  rules for each new statement): SAVEPOINT -> LOCK -> STREAM -> HEAD -> UNDONE-EVENT (the projector's read of AD3) -> APPEND -> GUARD ON -> UNDO ON
  -> UPDATE -> UNDO OFF -> GUARD OFF -> RELEASE, then for the slip only: APPEAL LOCK -> (when an appeal is open) NOW -> appeal APPEND -> appeal
  UPDATE; for the allowed path the writer first takes WORKER LOCK (`lockFieldWorkerRow`) -> APPEAL LOCK (TR5, 13.1d's accept shape), then the
  sequence above (its LOCK re-locks a row the transaction already holds), and `.allowed`'s APPEND / UPDATE after RELEASE. The undo variable's
  `SET LOCAL` on / off nests INSIDE the writer variable's `try / finally`. `ended_on` becomes NULL; `district`, `kyc_status`, the id, the code and
  `approved_by_display` are unchanged.
- **AD3 - The reducer gets ONE payload-dependent arm (a recorded variance).** The target of `ending_undone` is data, not a constant, so
  `nextFieldWorkerState(state, eventType, payload?)` gains an optional third argument. It tests `eventType === 'field_worker.ending_undone'` BEFORE the
  table lookup: it returns the parsed payload's `to_state` when `state === 'terminated'` and the payload parses with one of the three targets, else
  `null` - the table `.find` is never reached for that event. The three rows (`terminated -> pending_kyc | active | suspended`) are documentation in a
  separate `FIELD_WORKER_UNDO_TRANSITIONS` array, never in `FIELD_WORKER_TRANSITIONS` (else every two-argument call returns `pending_kyc` - G17 (a)).
  The arm parses a small FOLD-ONLY schema (`{ to_state }` one of the three, plus `reason_code` through `fieldWorkerSuspendReasonSchema`, passthrough
  for the rest) - NEVER `FieldWorkerEndingUndonePayloadSchema` (the `state.ts` header, R4-10: no fold through the write schemas). `reduce` passes
  `event.payload`, so `fieldWorkerStateMachine` and `replayFieldWorkerState` fold the undo; AND `foldFieldWorkerProjection`'s OWN call becomes
  `nextFieldWorkerState(state, row.type, row.payload)` (G17 (g) - miss it and the fold skips every undo). The fold applies it: state = `to_state`,
  `reasonCode` = the payload's `reason_code`, `endedOn` = null. Pure and total as before; the header's "reads no
  payload" becomes "reads no payload except `ending_undone`'s target". The agreement test treats that event as payload-dependent (each row proved with
  its payload; no payload or a bad one => `null` and the reducer's identity). Not three event types (one per target): the history would show three
  names for one act. Every existing two-argument caller is unchanged and gets `null` for the undo (a unit leg proves it).
  **The projector's check below the command:** for `ending_undone`, `projectFieldWorkerTransition` reads the event at `undone_ending_version` and
  refuses (`FieldWorkerProjectorInputError`) unless it is a `field_worker.terminated` event, its version equals the row's `state_event_version`, and
  its `from_state` (read RAW) equals the payload's `to_state` (the generic from/to cross-check would compare `to_state` with itself - G17 (d)).
- **AD4 - The database admits only an undo-shaped UPDATE out of `terminated` (migration `0207`).** `CREATE OR REPLACE FUNCTION
  field_workers_reject_unguarded_state_write`, copied from `0201` (the LAST definition - TR2) with rule (t) replaced by (t'): an UPDATE of a
  `terminated` row is refused UNLESS `current_setting('app.field_worker_undo_writer', true) = 'on'` AND `NEW.current_state <> 'terminated'` AND
  `NEW.ended_on IS NULL` AND `NEW.district = OLD.district` AND `NEW.kyc_status = OLD.kyc_status`, with its OWN message, which MUST start with the
  shared prefix (G25) - `'field_workers direct write rejected — a terminated field worker leaves terminated only by an undo (Story 13.1f AD4);
  attempted UPDATE of field worker %'` - else `isFieldWorkerStateDirectWriteError` misses it; every other rule ((a), (b), (c), (d′), (e′), and
  `0201`'s (f) - the labels carry primes in `0201`) still applies. (t') sits where (t) sits, between (a) and (b), so it answers before (c). The projector sets the undo
  variable exactly as it sets the existing writer variable (`SET LOCAL ... = 'on'`, and `'off'` in its `finally` - copy `project.ts`, never
  `set_config(..., false)`), for `ending_undone` ONLY. ⚠ The database does NOT check that the target is "as they were" (any non-terminated state and
  any reason the CHECKs allow pass (t')); the command and the projector do (AD2, AD3). A scrub (13.1e) is not admitted here and must carry (t')
  forward (C2).
- **AD5 - A number registered again blocks the undo (13.1c C2 (i)).** If another LIVE row of this Pariwar holds the worker's number, the undo is refused
  409 `field_worker.number_registered_again` ("This number now belongs to another registration. End that registration first, if it was made in
  error, then undo this ending."): on the pre-read (the terminated row's `mobile_blind_index`, read by a new `getFieldWorkerMobileIndex` - never
  decrypted - then `findLiveFieldWorkerByMobileIndex`; NO audit line) and, for the race, by mapping the 23505 on `field_workers_pariwar_mobile_live_uq`
  BY NAME in `projectFieldWorkerTransition`'s UPDATE catch (G3) to `FieldWorkerNumberRegisteredAgainError`. The race: an uncommitted registration
  holds the index entry; the undo's UPDATE waits on that transaction, and gets the 23505 once it commits. The undo never ends the newer registration
  itself: it may be a real returning worker (Q2 B), and that is an officer's call.
- **AD6 - The undo route (a Pariwar Admin, a slip).** `POST .../:fieldWorkerId/undo-ending`, body `{ expected_ending_version }` (strict) - the
  worker's `state_event_version` as the officer's screen showed it (13.1's D7 guard of a move): if the worker has been undone and ended again since,
  the version differs and the route answers 409 `field_worker.ending_changed` (pre-read, and under the lock). Key `field_worker.undo_ending` at
  `district` on the worker's district (the per-worker chain; a Pariwar grant covers it). 13.1c's `act` shape: idempotency namespace with the worker id;
  pre-read refusals (not found, not `terminated` => `illegal_transition`, version, number) write NO audit line; ONE `withCompensatingAudit` (action
  `field_worker.ending_undone`) whose `mutate` runs `undoFieldWorkerEnding` and COMMITS. The 200 is `FieldWorkerLifecycleResult` (the restored state,
  the reason from the COMMAND's result - G24 - `ended_on: null`, and the new required `state_event_version`). **Every act returns
  `state_event_version` (G24):** the contract gains it as a REQUIRED field, filled from the domain result's `eventVersion` in every lifecycle
  handler (move: from its locked re-read), and `useFieldWorkerAct` copies it into the identity cache with `current_state` and `district` - else
  "Undo ending" pressed straight after End sends the pre-end version and always gets `ending_changed`. On `ending_changed` the screen also
  invalidates the worker's IDENTITY query (not only the lists and the log), so a retry reads the current version. Any ending - any reason, `died` included (`-454` Q5 A's cost), any from-state - may be undone, at any time, AS RULED (Q1
  A: "may undo any ending made by mistake") - including after the Panel has REFUSED an appeal on that ending (note Q6 asks whether to refuse that;
  non-blocking). A SLIP's undo (`cause = 'mistake'`) SUPERSEDES the worker's open appeal in the same transaction (AD9); an appeal's own undo
  (`appeal_allowed`) supersedes nothing - the open appeal IS the one being allowed (13.1d's acceptance moves without superseding, for the same
  reason). A terminated worker's `state_event_version` IS its latest terminated event's version (nothing else can be written to the stream while it
  is terminated), so `expected_ending_version` and an appeal's `ending_event_version` name the same thing. It does NOT reopen a move request the ending
  superseded (13.1d C3 - answered here; closes on landing): the supersede is final and the officer opens a new request if the move is still wanted.
  ⚠ It does NOT re-send a code text (G21): a worker activated and ended before the 13.1b sweep sent their code stays `skipped_not_active` after the
  undo; the screen says "not delivered", and the officer reads the code by hand (`field_worker.read_code`) and tells the worker (C7).
- **AD7 - The appeal is a RECORD on its own stream, keyed to ONE ending.** Table `field_worker_ending_appeals` (G13's template): `appeal_id` (pk,
  the stream id), `pariwar_id`, `field_worker_id` (composite FK), `ending_event_version` (bigint, the terminated event appealed), `state` (`text`
  CHECK `open | allowed | refused | withdrawn | superseded`), `heard_by` (`text` CHECK `pariwar_admin | trustee_panel`, copied from the ending, AD8),
  `received_on` (date - the day the worker appealed, on the officer's word), `received_via` (`text` CHECK `phone | in_person` - `-454`: "by phone or in
  person"), `lodged_by_user_id` (NOT NULL), `ended_by_user_id` (NOT NULL - the terminated event's `events_log.actor_id` COLUMN, copied at lodging -
  AD17; a NULL would let the ender CHECK below pass silently, since `NULL <> x` is not false), `decided_by_user_id` (NULL iff
  `open`; for `superseded`, the officer who undid), `decided_on` (date, null while open), `state_event_version`, `audit_id`, `created_at`,
  `updated_at`; GRANT SELECT, INSERT, UPDATE to `twt_app` (never DELETE); FORCE RLS with three per-command policies; a partial UNIQUE
  `(pariwar_id, field_worker_id) WHERE state = 'open'` (one open appeal per worker - never a plain UNIQUE: the 10.22 lesson). **Database backstops
  (13.1d chunk-1 review, CR1-CR6 - carried here, not re-learned):** CHECKs `(state = 'open') = (decided_on IS NULL)`, `(state = 'open') =
  (decided_by_user_id IS NULL)`, `decided_on IS NULL OR decided_on >= received_on`, and `state NOT IN ('allowed','refused','withdrawn') OR
  decided_by_user_id <> ended_by_user_id` (the ender never decides - AD9 (3) in the database too); the projector-only guard trigger (`0205`'s shape)
  admits only `open -> allowed | refused | withdrawn | superseded`, freezes all four final states (one test leg each), and makes `pariwar_id`,
  `field_worker_id`, `ending_event_version`, `heard_by`, `received_on`, `received_via`, `lodged_by_user_id` and `ended_by_user_id` immutable;
  no-delete and no-truncate triggers (`0205` has both) - tested as the OWNER role (under `twt_app` the missing GRANT answers 42501 before any trigger
  runs, so such a test proves nothing); the composite FK's 23503 asserted BY CONSTRAINT NAME for another Pariwar's worker and an unknown one (and the
  same for `previous_field_worker_id`'s FK). **No free text
  anywhere** (13.1 QE12): no grounds, no notes - what the worker said stays with the officer. Events (`stream_id = appeal_id`, human actors only, each
  pinned to its key - AD15): `field_worker_ending_appeal.lodged` (none -> open), `.allowed`, `.refused`, `.withdrawn` (open -> each), `.superseded`
  (open -> superseded, written by the slip undo, key `field_worker.undo_ending`). **Bodies (strict):** lodge `{ expected_ending_version, received_on,
  received_via }` - the D7 guard again: a version that is not the worker's current ending's => 409 `field_worker.ending_changed` (pre-read and under
  the lock), so an appeal never attaches to an ending the worker did not appeal; decide `{ outcome: 'allowed' | 'refused', decided_on }`; withdraw `{
  decided_on }`. A superseded appeal's `decided_on` is the undo's IST date (SQL). Dates are `z.string()` in the contract; the COMMAND answers 422
  `field_worker.appeal_date_invalid` for a malformed or out-of-bounds date (one place, never a contract regex that would answer 400 first). Only a
  `terminated` worker's CURRENT ending (the latest terminated event) can be appealed. **One appeal per ending** (built on the Panel note Q2
  suggestion): a REFUSED appeal on the same ending refuses a new one, 409 `field_worker.appeal_already_decided` (an allowed one undid the ending, so
  `illegal_transition` answers first) - ONE constant (`FIELD_WORKER_APPEALS_PER_ENDING = 1`) in the command, NOT a database constraint, so the Panel's
  answer changes one line; a withdrawn or superseded one does not count. **No time limit** (note Q2): `received_on` must lie between the worker's
  registration day - the IST date of the worker's GENESIS event's `occurred_at` (`field_worker.registered`, `event_version = 1`) - and today (IST,
  judged in SQL on the transaction clock through `istToday` - [[project_ist_vs_utc_test_date_window]]) - not after `ended_on`, because a worker
  told of an ending can appeal before it is recorded or before its last day; `decided_on` between `received_on` and today. Both dates are REQUIRED
  in their bodies.
  **Response bodies (strict; no name, mobile or code - I6):** lodge 201 = `FieldWorkerEndingAppeal` `{ appeal_id, field_worker_id,
  ending_event_version, state, heard_by, received_on, received_via, decided_on, lodged_by: { user_id, display_name }, created_at }` (officer
  names are CURRENT display names - [[project_admin_display_name_attribution]], never email-derived); refuse / withdraw 200 = the same shape;
  decide-allowed 200 = `{ appeal: FieldWorkerEndingAppeal, worker: FieldWorkerLifecycleResult }` (the restored worker, so an open Find panel
  updates without a second fetch); decide-refused 200 = `{ appeal, worker: null }`.
- **AD8 - The hearer is fixed AT THE ENDING (13.1c C2 (ii); R2-9).** 13.1c's terminate route computes `appeal_heard_by` at the act - `'trustee_panel'`
  if the actor holds, in this Pariwar, a `pariwar_admin` grant (or is a global `super_admin` - Panel note Q4 (b)'s suggestion), else
  `'pariwar_admin'` - and passes it to `terminateFieldWorker`, which writes it into the terminated payload. **Where "required" lives (one coherent
  shape):** `FieldWorkerTerminatedPayloadSchema` gains `appeal_heard_by` as `.optional()` (so a stored legacy event still parses wherever the
  schema reads it); `TerminateFieldWorkerInput.appealHeardBy` is a REQUIRED input field and the command refuses a missing one - every NEW terminated
  event carries it (G22 lists the callers to update; the FOLD ignores it). This is a deliberate read of `request.scopeGrants` for one PROPERTY
  (does the actor hold a `pariwar_admin` grant here), not a recomputation of who authorized - the snapshot stays `request.authorizations[key]`
  (`types.ts` TR13). Never taken from the snapshot's `role` (G6), and never recomputed later from grants. The appeal copies it at lodging through
  AD17's read (RAW payload field): absent (a legacy terminated event - test databases only; AC7's leg plants one by raw SQL as `twt_owner`) =>
  `'trustee_panel'`, the more independent hearer. So: a District Admin's ending is heard by the Pariwar Admin; a Pariwar Admin's - including an
  officer who is BOTH and a Pariwar's ONLY Pariwar Admin - by the Panel (the author's proposal under `-454`'s appeal bullet; note Q4 (a) asks the
  Panel to confirm). ⚠ A SUPER ADMIN's ending going to the Panel DEPARTS from Q1 A's literal default clause ("the Pariwar Admin hears it") - built
  ahead of the Panel, named so in `-464`, pending note Q4 (b); go-live held by Row 52 (b).
- **AD9 - Lodging, deciding, withdrawing: the HEARER records all three (`-454`: "recorded by the officer who hears it").** TWO hear keys (AD10), one
  per hearer, because one shared key cannot record that the Panel acted (G12): `heard_by = pariwar_admin` => `field_worker.hear_ending_appeal`;
  `heard_by = trustee_panel` => `field_worker.hear_ending_appeal_as_panel`. **The gate:** the loader (`gate.ts`) stashes `heard_by` and the district
  (lodge: AD17's current ending of a `terminated` worker; decide / withdraw: the appeal's), and a small dispatcher preHandler invokes the matching
  key's prebuilt `requirePermissionHook` closure - the `requireAnyAppealAccess` shape (G26: a cast to call the closures directly; never
  `rbac.requirePermission`, which the R3-29 fence flags). An actor without the matching key => 403 (a Pariwar Admin cannot hear the Panel's
  appeal; a trustee cannot hear a Pariwar Admin's). **When there is no hearer to match** (lodge on a worker who is NOT `terminated` - including
  after an allowed appeal - so no current ending exists), the dispatcher passes if EITHER hook passes (`_as_panel` first, then
  `hear_ending_appeal`); a NULL district (a missing or foreign worker / appeal) still fails closed to 403. The handler then answers its pre-read
  409 (`illegal_transition`), reading whichever authorization was stored. **Pre-read (no audit line, the 13.1c pattern):** besides not found /
  state / version, the handler also refuses a super admin's `_as_panel` authorization (its grant dimension `global`) with 409 `appeal_wrong_hearer`
  BEFORE `withCompensatingAudit` - so that attempt writes no intent / `_rolled_back` pair; the command re-checks under the lock. **Lock order
  (TR5):** lodge locks the worker (then inserts the appeal); decide and withdraw first read the appeal's `field_worker_id` UNLOCKED
  (`appealWorkerOf`, the `moveRequestWorkerOf` pattern - the column is immutable), then `lockFieldWorkerRow`, then `lockEndingAppealRow`, then
  re-verify that the locked appeal's worker is the locked worker - NEVER the appeal first (that deadlocks against the slip undo's worker -> appeal).
  **Actor kind:** an act under `field_worker.hear_ending_appeal_as_panel` (lodge; allow - BOTH of its events, the worker's `ending_undone`
  included; refuse; withdraw) writes `actor: 'trustee'`; every other act in this story writes `actor: 'operator'`. Today every field-worker
  handler hard-codes `'operator'`; the claims appeal handlers write `'trustee'` when the Panel acts (`claims.appeal.handlers.ts`). The handler
  derives it from the stored authorization's `permissionKey`, never from the body; the command refuses a mismatch (`_as_panel` with
  `'operator'`, or `'trustee'` with any other key) with `FieldWorkerProjectorInputError`, as the human-actor check does.
  **Lodge, under the worker lock, in this order** (unit-pinned, AC5 (i)): (1) `terminated`, else `illegal_transition`; (2) `state_event_version =
  expected_ending_version`, else `ending_changed`; (3) the authorization's key matches the IN-LOCK current ending's `appeal_heard_by` (AD17's locked
  read - never the loader's pre-read value, which a re-end between gate and lock makes stale) and an `_as_panel` authorization from a `global` grant
  is refused - else `appeal_wrong_hearer`; (4) no open appeal, else `appeal_open`; (5) no REFUSED appeal on this ending, else
  `appeal_already_decided`; (6) the dates. **Decide / withdraw, under the locks (worker row, then the appeal row - 13.1d I5), in this order:** (1) the
  verified authorization's `permissionKey` matches `heard_by`, and an `_as_panel` authorization whose grant dimension is `global` is refused (a super
  admin derives the key, but never acts as the Panel) - else 409 `field_worker.appeal_wrong_hearer` (through the API only a super admin on a
  Panel-heard appeal reaches it - the gate passes on the derived key; every other wrong hearer gets the gate's 403 first); (2) decide / withdraw: the appeal is open, else 409 `field_worker.appeal_not_open`; (3) decide / withdraw: the actor is not the
  officer who ENDED the worker (the appeal's `ended_by_user_id`, copied at lodging from the terminated event's `events_log.actor_id` column - the AD7 CHECK backs it),
  else 409 `field_worker.appeal_decider_is_ender` - the ender MAY lodge (it is
  recorded as `lodged_by_user_id`) but never decides or withdraws; (4) the dates (AD7). With AD8 the ender rule fires only in edges: an officer
  holding `pariwar_admin` + `trustee_panel` ends a worker and then sits as the Panel, or a District Admin who ended a worker is later made a Pariwar
  Admin. If EVERY holder of the matching key is the ender, the appeal stays open with no lawful decider (note Q4 (d); Row 52 (d) prevents it). A
  `super_admin` may hear an appeal heard by the Pariwar Admin (it derives that key) - this WIDENS Q1 A's "the Pariwar Admin hears it", built ahead
  of the Panel, named so in `-464`, pending note Q4 (c). **Allowed** => `allowFieldWorkerEndingAppeal` (in `commands.ts` - AD2), in ONE
  transaction: lock the worker, then the appeal; assert the worker is `terminated` and its `state_event_version` equals the appeal's
  `ending_event_version` (else `FieldWorkerProjectorInputError` - an open appeal on a changed ending is corrupt, since a slip undo supersedes it);
  the private core with `cause = 'appeal_allowed'`, `appeal_id`, under the hear key's authorization; then `field_worker_ending_appeal.allowed`.
  The handler's pre-read for an allowed decision ALSO runs AD5's number check (`number_registered_again`, no audit line). If the
  undo is refused (the number belongs to a new registration - AD5) the whole decision fails and the appeal stays open; ending that registration is
  the only way forward and no ending reason describes it (note Q7 asks the Panel; option B records the decision and restores later). **Refused** =>
  the worker stays ended. **Withdrawn** (the worker withdraws, the hearer records it) => closed, counts for nothing.
- **AD10 - Four keys, ONE catalog bump** (62 -> 63, 90 -> 94) - Q-1 A, Q-4 A (BigDev, 2026-11-16): `field_worker.undo_ending` - `pariwar_admin` ONLY (the
  ruling: "The Pariwar Admin may undo"); `field_worker.hear_ending_appeal` - `pariwar_admin`; `field_worker.hear_ending_appeal_as_panel` -
  `trustee_panel` ONLY (a `roles.ts` comment in 10.22's words: do not grant it to any other role without a Panel decision); `field_worker.read_ending_appeals` -
  `district_admin` (the worker's district), `pariwar_admin`, `trustee_panel`. All `district`-dimension on the worker's district (a list route takes
  the district as a query parameter, as 13.1a's list does). `super_admin` derives all four. Each is a `-059` B (3) key: built on this default, Panel
  note Q5 (non-blocking; Row 52 (a)). The `roles.ts` comments that say "⛔ trustee_panel" for older field-worker keys stay true for THOSE keys.
  `-210` cl. 2 forbids a silent mint, so the keys are RECORDED in `-464` (the `-453` / `-458` wording) - it does not authorise them.
- **AD11 - The shown number (Q3 A) - on the register route, before any write.** After sealing and the live PRE-CHECK, `findEndedFieldWorkersByMobileIndex`
  (this Pariwar, every district, `current_state = 'terminated'`, ordered `ended_on DESC, field_worker_id`, cap 5) runs; if it finds any and the body does not carry
  `previous_endings_seen: true`, the route answers 409 `field_worker.number_previously_ended` with `details: { previous_endings: [{ field_worker_id,
  ended_on, reason_code }] }` - no name, no district, no officer; nothing is decrypted. It is the ONE pre-read refusal that writes an audit line (I7):
  `field_worker.previous_endings_shown` (`writeAuditEntry` on `deps.servicePool` - NEVER the scope transaction, which rolls back with the 409 -
  awaited, `responseStatus: 409`, locator `field_worker/<newest ended id>`, hash `{ ended ids }`) BEFORE answering - if the write fails, the answer
  is a 500 and nothing is disclosed. A second officer learned of an ending (the ruling's
  accepted cost - Q3 A anticipated an officer of another district), and that showing is recorded. A refused request is never stored by the
  idempotency layer (G20), so a retried first submit writes another line - each is a showing. The officer re-submits with `previous_endings_seen:
  true` (and, optionally, `link_to`) under a NEW idempotency key; the register then proceeds as today. The audit records the showings the SERVER made;
  a client that sends `previous_endings_seen: true` unprompted skips the line, so the screen sends it only after it has shown the 409's list.
  Information only: nothing is refused for an earlier ending (`-454` Q3: "the officer still decides"). ⚠ The reasons shown are the four of today; 13.6's
  conduct reasons would reach this line too (C3).
- **AD12 - The link (Q2 B) - made by the REGISTERING OFFICER, at registration, to a number-matched ended record (Q-2: the mobile match is built HERE; the PAN match and the Aadhaar-last-4 check are row `13-1h`'s, which widens this AD's `link_to` re-check - C6).** `link_to` must be
  one of this Pariwar's TERMINATED records with the SAME blind index, else 422 `field_worker.link_invalid`; a `link_to` without `previous_endings_seen:
  true` is a 400 (the body schema's refine). The re-check runs in the scope transaction (open in `run` before `withCompensatingAudit`) through a
  DOMAIN read - the API never queries `field_workers` itself - `lockFieldWorkerForLink(db, pariwarId, id)` (`read.ts`, `.for('share')`, returning
  `current_state` and `mobile_blind_index`; precedent `lockFieldWorkerForCodeRead`, whose UPDATE grant and policy `twt_app` already has), BEFORE the
  genesis INSERT: a concurrent undo of that record (which holds `FOR UPDATE`) then finishes first and the
  registration answers `link_invalid` (or `mobile_already_registered`) cleanly - without it, the INSERT's FK check waits on the undo while the undo's
  UPDATE waits on the INSERT's index entry, a deadlock (40P01, a 500). It is stored as the immutable column `field_workers.previous_field_worker_id`
  (G9; written by `projectFieldWorkerGenesis`'s INSERT) AND as `previous_field_worker_id` in the genesis `field_worker.registered` payload (an
  optional strict key); the new worker gets a NEW code (13.2's allocation, unchanged); the old record stays `terminated` and its code dead (G5) - true
  AT LINK TIME: a linked registration later ended in error, then the old record undone (AC2's flow), leaves a terminated record pointing at a live one,
  which is allowed (the chain read and the labels still hold). The system never links on a matching number by itself: an officer decides (`-454`
  Q3). ⚠ Numbers are recycled and the 409 carries no name, so the officer judges "the same person" from the date and reason alone, and the link is
  permanent (Q-2's cost). The log follows the link: `GET .../:fieldWorkerId/log?record=<id>` returns the stream of `<id>` iff `<id>` is reached from
  `:fieldWorkerId` by following `previous_field_worker_id` (`listFieldWorkerLinkChain`, at most 10 hops) AND the actor's own `field_worker.read_log`
  passes on `<id>`'s district (the same RBAC predicate the gate uses, on the loaded grants) - else a BARE `ApiError(403)` with NO `details` (never
  `AuthorizationDeniedError`, whose `targetLocator` would tell an existing record from an unknown one - G27), the same for a record not in the chain.
  So the link discloses nothing the officer could not already read; "the history reads as one person's" (Q2 B) for every officer who may read both.
  A linked worker starts `pending_kyc` and is approved as any worker is (`-443` Q4 A, the epic's words) - nothing in the approval reads the link.
- **AD13 - The routes and their gates.** The static `ending-appeals` routes are registered BEFORE the `/:fieldWorkerId` routes in `routes.ts`
  (13.1d's convention there: a static segment beats a parametric one, and the order keeps that visible). Per-worker writes and reads use 13.1a's per-worker chain (`loadWorker` -> `requirePermissionHook(key, {
  dimension: 'district', resolveValue: fieldWorkerGateDistrict })`; a missing or foreign worker => 403 for everyone). The appeal's decide and withdraw
  load the APPEAL, then its worker's district (`loadEndingAppealGate` in `gate.ts` beside `loadMoveRequestGate`; a missing appeal => 403), then AD9's
  dispatcher. The lodge's loader READS THE WORKER (AD17), so a foreign or missing worker gets 403, never 404 (13.1d CR24). ⚠ **Existence leaks to a
  grant-holder (G27, 13.1d CR31 - INHERITED, not fixed here):** the gate's 403 carries `details.targetLocator`, a real district for an existing
  appeal and `null` for an unknown id; `deferred-work.md` CR31's trigger is annotated FIRED at Task 7. **Read gates and shapes (reuse G28's
  helpers - never re-write them):** every new GET carries `config: { rateLimit: limits.read }`; the district rule is `listGateDimension` /
  `listGateValue`; the limit is the contract's `clampedLimit(25)` + the domain's `clampLimit`, **default 20, cap 25** (13.1d's - one audit line
  names a page's workers); the page shape is `move-request-handlers.ts` `list`'s. An EMPTY page writes NO audit line (it names no one) - one
  assertion each. **The list** `GET .../field-workers/ending-appeals?district=&state=&cursor=&limit=` (`read_ending_appeals`; `district` optional -
  absent => a Pariwar-level grant only; `district` filters on the WORKER's district, frozen while terminated) returns `FieldWorkerEndingAppeal` items
  + the worker's NAME decrypted behind ONE audit line per page (`field_worker.ending_appeal_list_viewed`), ordered `created_at DESC, appeal_id`.
  **The trustee-only rule is uniform** ([[feedback_withholding_must_be_uniform]]): a reader whose verified `read_ending_appeals` authorization has
  role `trustee_panel` sees only appeals heard by the Panel - on the list AND the per-worker read. **The eligible list** `GET
  .../field-workers/ending-appeals/eligible?district=&cursor=&limit=` (`read_ending_appeals`, the same district rule, cap and default) returns
  this Pariwar's `terminated` workers whose current ending (AD17: joined on `appeal.ending_event_version = fw.state_event_version`) has no open or
  refused appeal and whose `appeal_heard_by` matches a hear key the reader holds - `rbac.hasPermission` per key on the loaded grants with locator
  `{ dimension: 'pariwar', value: pariwarId }`, and `_as_panel` COUNTS ONLY from a non-`global` grant (a super admin derives it but can never
  lodge with it - AD9) - ordered `ended_on DESC, field_worker_id`. Each item is `{ field_worker_id, display_name, district, ended_on, reason_code,
  ending_event_version, heard_by }` (the version is what the lodge body's `expected_ending_version` needs - a `trustee_panel` holder has no
  identity read), names decrypted behind ONE audit line per page (`field_worker.ending_appeal_candidates_viewed`) - the only way a `trustee_panel`
  holder, who cannot open Find a worker (`field_worker.view` is not theirs), reaches a worker to record an appeal for. A Pariwar Admin may also lodge
  from Find's worker panel. **The per-worker read** `GET .../:fieldWorkerId/ending-appeals?limit=` (`read_ending_appeals`, default 20, cap 25 -
  `forced-pagination.spec.ts`), `FieldWorkerEndingAppeal` items, no decrypt, no audit line; the Find worker panel shows it (Task 6.2). Every write:
  `tenantWrite`, the idempotency namespace carrying the worker or appeal id (13.1a TR6), pre-read refusals with NO audit line, ONE compensating
  audit line whose action is the event type, the COMMIT inside `mutate`.
- **AD14 - The copy (`microcopy:check` must pass).** The WORDING is the author's; what a line says about who is paid or told is NOT - it says
  nothing beyond the rulings, and the "Tell the worker." reminders are built on note Q3's suggestion (section 0 row 7). ⛔ No line says anything
  about credit for the ended window (note Q1, unruled; nothing credits anyone today), and none commits a credit-timing rule. `fw.actions.end.final`
  -> "Their code stops crediting new teachers. If this ending is a mistake, a Pariwar Admin can undo it; a worker who disagrees can appeal." (it
  carries out `-454` Q1 A and amends `-453` AD8's "a line that ending is final" - `-464`). Undo: button "Undo ending"; confirm "Undo this ending? Use
  this only if it was a mistake. The worker returns as they were before it, with the same code." + when an appeal is open on this ending: "Their open
  appeal will close as no longer needed." Reminders (note Q3 (A) / (b) as built - the `-459` Q3 A / `-461` CR41 A shape): after an End, "Tell the
  worker. If they disagree, they can appeal."; after an undo, an appeal decision or a withdrawal, "Tell the worker." Shown number: "This number belonged to a
  worker in this Pariwar whose work ended on {date} ({reason})." + "This is the same person - link the new registration to their earlier record" +
  "Register". History: `fw.history.event.field_worker.ending_undone` "Ending undone" (+ "after an appeal" when `cause` says so), the registered line's
  "Linked to an earlier record" and "Show the earlier record's history". Appeals: "Appeals" tab; "Record an appeal" (the eligible list); states
  "Waiting for a decision", "Allowed", "Refused", "Withdrawn", "No longer needed"; hearer "Heard by the Pariwar Admin" / "Heard by the Trustee Panel".
  One line per new error code (the dev writes them in this register; each is a `BY_CODE` row).
- **AD15 - Every field-worker event pins its key (R2-D1 - answered here; closes on landing).** `registered` -> `field_worker.register`;
  `kyc_completed`, `activated` -> `field_worker.approve`; `suspended` -> `.suspend`; `reactivated` -> `.reactivate`; `terminated` -> `.terminate`;
  `posted` -> the move list (as built); `ending_undone` -> the undo list; `field_worker_ending_appeal.superseded` -> `field_worker.undo_ending`; the
  other appeal events -> the two hear keys (each event's key must match its appeal's `heard_by`, AD9). Done by `.extend({ permission_key: ... })` as
  `posted` is. `ending_undone` is pinned tighter by AD2's cause-key superRefine. The commands already enforce each key, so no stored production event
  can fail; test fixtures that sign an event with another key are swept (TR10).
- **AD16 - Not built, with homes:** the credit for an ended window (C1); 13.1e's carry (C2); conduct endings (C3); undo / appeal notices (C4); the
  worker's own view (C5); a returning worker found by PAN (row `13-1h` - C6); a code text after an undo (C7). 13.1a CR33's re-trigger fires again (more
  keyed writes on `tenantWrite`; not fixed) and 13.1d CR31's trigger fires (G27; not fixed) - both annotated as FIRED at Task 7.
- **AD17 - ONE read for "the current ending" (the hearer and the ender are NOT `field_workers` columns).** `appeal_heard_by` lives only in the
  latest `field_worker.terminated` event's PAYLOAD; the ender is that event's `events_log.actor_id` COLUMN - ⛔ a payload key (`events.ts`: the
  actor's id is an `events_log` column and is never duplicated in payloads; non-null for every field-worker event, the human-only rule). `getCurrentFieldWorkerEnding(db, pariwarId, workerId)` and its in-lock twin
  `getCurrentFieldWorkerEndingLocked(client, ...)` (`read.ts`) return `{ endingVersion, heardBy, endedByUserId, endedOn, reasonCode } | null`
  (null unless `current_state = 'terminated'`) by reading `events_log` on `(pariwar_id, stream_id = field_worker_id, event_version =
  field_workers.state_event_version)` and taking `COALESCE(payload->>'appeal_heard_by', 'trustee_panel')` and the row's `actor_id` column - the legacy rule (AD8) lives HERE and
  nowhere else. Its users: the lodge loader (pre-read), the lodge command (locked), the appeal's `ended_by_user_id` at lodging, and
  `listAppealEligibleFieldWorkers` (the same join, set-wise). Never parse the terminated payload with the strict schema for these fields.

## Per-command table - every write in one place (the AD text is the reason; this is the build sheet)

Pre-read refusals write NO audit line (except the shown-number 409). "Locked checks" run in the order given, under the locks given. A refusal
under the lock is raised inside `mutate`, so `withCompensatingAudit` writes the intent line AND its `_rolled_back` twin (G25) - no extra class.

| Act (route) | Gate key | Pre-read (no audit) | Locks, in order | Locked checks, in order -> code | Events (one transaction) | Audit line | Response |
|---|---|---|---|---|---|---|---|
| Undo, a slip (`POST .../:id/undo-ending`) | `undo_ending` (`district` chain) | missing -> 403; not `terminated` -> `illegal_transition`; version -> `ending_changed`; number live -> `number_registered_again` | worker; then (after the transition) the open appeal | terminated -> version -> (3d) target -> stream fold = `from_state`; UPDATE 23505 on the live index -> `number_registered_again` | `field_worker.ending_undone` (`mistake`); `field_worker_ending_appeal.superseded` if one was open | `field_worker.ending_undone` (covers the supersede) | 200 `FieldWorkerLifecycleResult` + `state_event_version` |
| Lodge (`POST .../:id/ending-appeals`) | the key matching AD17's `heard_by`; either key when not terminated (AD9) | missing -> 403; not `terminated` -> `illegal_transition`; version -> `ending_changed`; super admin `_as_panel` -> `appeal_wrong_hearer`; open -> `appeal_open`; refused -> `appeal_already_decided` | worker | AD9's lodge order (1)-(6); the partial unique's 23505 BY NAME -> `appeal_open` | `field_worker_ending_appeal.lodged` | `field_worker_ending_appeal.lodged` | 201 `FieldWorkerEndingAppeal` |
| Decide allowed (`POST .../ending-appeals/:appealId/decide`) | the key matching the appeal's `heard_by` | missing -> 403; super admin `_as_panel` -> `appeal_wrong_hearer`; not open -> `appeal_not_open`; ender -> `appeal_decider_is_ender`; number live -> `number_registered_again` | `appealWorkerOf` (unlocked), worker, appeal | worker = appeal's worker -> key vs `heard_by` -> open -> ender -> dates -> worker terminated at `ending_event_version` (else 500) -> the core's checks | `field_worker.ending_undone` (`appeal_allowed`) + `field_worker_ending_appeal.allowed` | ONE `field_worker_ending_appeal.allowed` line; both events carry its `audit_id` | 200 `{ appeal, worker }` |
| Decide refused (same route) | as above | as above, minus the number check | as above | worker = appeal's worker -> key -> open -> ender -> dates | `field_worker_ending_appeal.refused` | `.refused` | 200 `{ appeal, worker: null }` |
| Withdraw (`POST .../ending-appeals/:appealId/withdraw`) | as above | missing -> 403; wrong hearer; not open; ender | as above | as decide refused | `field_worker_ending_appeal.withdrawn` | `.withdrawn` | 200 `FieldWorkerEndingAppeal` |
| Terminate (13.1c, changed) | `terminate` (as built) | as built | as built | as built | `field_worker.terminated` + `appeal_heard_by` | as built | 200 + `state_event_version` |
| Register, shown number (`POST .../field-workers`) | `register` (as built) | live holder -> `mobile_already_registered` FIRST; ended holders and no `previous_endings_seen` -> 409 `number_previously_ended` + details | - | - | none | `field_worker.previous_endings_shown` on `servicePool`, awaited, BEFORE the 409 (the one audited pre-read) | 409 |
| Register, link (same route, `link_to`) | as above | `link_to` without `previous_endings_seen` -> 400 | `lockFieldWorkerForLink` (`FOR SHARE`) before the INSERT | the linked row is terminated and number-matched, else `link_invalid` | `field_worker.registered` + `previous_field_worker_id` | as built | 201 (no code) |

## Concurrency matrix - each pair, what serialises it, what happens, the leg that proves it

| Pair | Serialised by | Outcome | Proof |
|---|---|---|---|
| slip undo x decide-allowed | the worker lock (both take it first) | the first wins; the other: `appeal_not_open` (undo first - the appeal was superseded) or `illegal_transition` (allow first) | live, BOTH orders, `waitForBlockedBy` (13.1d CR27: a sequential "second answer" leg proves the state check, not the lock) |
| slip undo x decide-refused / withdraw | worker lock | as above (`appeal_not_open` or the refusal stands and the undo then succeeds - note Q6 as ruled) | live, both orders |
| decide x decide; decide x withdraw | worker lock, then appeal lock | the second -> `appeal_not_open` | live, both orders |
| lodge x lodge | worker lock (the partial unique is the backstop) | the second -> `appeal_open` | live + AC5 (c)'s planted row |
| undo x registration of the same number | the live index entry | the undo's UPDATE waits, then 23505 BY NAME -> `number_registered_again` | AC2 (i) |
| registration x undo of the same number (the reverse order) | the live index entry | the undo's UPDATE holds the entry; the registration's INSERT waits, then 23505 on the live index -> `mobile_already_registered` (the genesis mapping, unchanged) | AC2 (iii) |
| undo x registration with `link_to` = that row | the `FOR SHARE` vs `FOR UPDATE` on the old row | the undo commits; the registration -> `link_invalid`; never 40P01 | AC2 (ii) + its RED proof |
| undo x re-end (another officer) | worker lock | the later act sees the new version: a stale undo or lodge -> `ending_changed` | AC3 |
| lodge x undo | worker lock | lodge first: the undo supersedes it; undo first: the lodge -> `illegal_transition` | live, both orders |

## Errors and their HTTP mapping - only what this story ADDS or makes reachable

| Class / condition | When | HTTP + code |
|---|---|---|
| `FieldWorkerIllegalTransitionError` | undo a worker who is not `terminated`; lodge for a worker who is not `terminated` (incl. after an ALLOWED appeal) (pre-read: no audit line; under the lock: the `_rolled_back` twin) | 409 `field_worker.illegal_transition` (existing) |
| `FieldWorkerEndingChangedError` (NEW) | undo or lodge: `expected_ending_version` != the worker's `state_event_version` (undone and ended again since) | 409 `field_worker.ending_changed` |
| `FieldWorkerNumberRegisteredAgainError` (NEW) | undo, or an allowed decision: a LIVE row holds the number (pre-read; and the 23505 BY NAME under the lock - AD5) | 409 `field_worker.number_registered_again` |
| `numberPreviouslyEndedError(previousEndings)` (NEW - an `ApiError` factory in `apps/api/src/modules/field-worker/errors.ts`, beside `codeNotAvailableError`: the handler's OWN row, since a domain error carries no HTTP and so no `details`) | register: ended records hold the number and `previous_endings_seen` is not `true` (writes ONE audit line - AD11) | 409 `field_worker.number_previously_ended`, `details.previous_endings[]` |
| `FieldWorkerLinkInvalidError` (NEW) | `link_to` is not a terminated, number-matched record of this Pariwar (incl. one undone meanwhile - AD12's `FOR SHARE`) | 422 `field_worker.link_invalid` |
| `FieldWorkerAppealOpenError` (NEW) | lodge while one is open (pre-read; under the lock; the partial unique's 23505 BY NAME is a backstop - lodges queue on the worker lock) | 409 `field_worker.appeal_open` |
| `FieldWorkerAppealAlreadyDecidedError` (NEW) | lodge on an ending whose appeal was REFUSED (an allowed one undid the ending - `illegal_transition` answers first) (AD7) | 409 `field_worker.appeal_already_decided` |
| `FieldWorkerAppealNotOpenError` (NEW) | decide / withdraw a closed appeal | 409 `field_worker.appeal_not_open` |
| `FieldWorkerAppealWrongHearerError` (NEW) | the authorization's key does not match the appeal's `heard_by`, or an `_as_panel` authorization from a `global` grant (AD9) - through the API, a super admin on a Panel-heard appeal; any other wrong hearer gets the gate's 403 first | 409 `field_worker.appeal_wrong_hearer` |
| `FieldWorkerAppealDeciderIsEnderError` (NEW) | decide / withdraw by the officer who ended the worker | 409 `field_worker.appeal_decider_is_ender` |
| `FieldWorkerAppealDateInvalidError` (NEW) | `received_on` / `decided_on` malformed or outside its IST bounds (the command judges both) | 422 `field_worker.appeal_date_invalid` |
| an actor without the hear key matching `heard_by` | AD9's dispatcher | 403 `authz.forbidden` |
| a missing / foreign appeal or worker | the loader stashes null | 403 `authz.forbidden`, as the worker loader - ⚠ its `details.targetLocator` tells an existing row from an unknown id (G27, CR31, INHERITED) |
| `log?record=` not in the chain, or not readable by the actor on its own district | AD12 | a bare 403 with NO `details` (no oracle) |
| body schema | an unknown key, an `outcome` outside `allowed | refused`, a `received_via` outside the two, a `link_to` without `previous_endings_seen: true` | 400 `request.validation` |

No message, detail or URL carries a name, a mobile or a code (I6). Except the shown-number 409 (an API-only row, above), each new domain class lives in `packages/domain/src/field-worker/errors.ts` and
is mapped in `apps/api/src/modules/field-worker/errors.ts`. There is no `_rolled_back` CLASS: a refusal raised under the lock, inside `mutate`,
makes `withCompensatingAudit` write the intent line plus its `_rolled_back` AUDIT twin and rethrow (G25) - the API maps the same class either way.

## ASKs - BigDev's, ANSWERED 2026-11-16

**The answers, verbatim (BigDev, 2026-11-16):** *"Q1, Q3, Q4 as recommended. For Q2 combine mobile number, PAN number and Aadhaar last 4 digits
for indetification."* Then, to the three follow-up choices put the same day: how they combine - *"Mobile OR PAN (Recommended)"* (same mobile or same
PAN finds the old record; the Aadhaar last 4 is shown as a matches / differs check and never finds a record by itself); required at registration -
*"Both required"*; where - *"New sibling story (Recommended)"*. **So:** Q-1 A, Q-3 A, Q-4 A, built as written below. Q-2: THIS story builds AD12's
mobile-matched link unchanged; the PAN / Aadhaar-last-4 identification is the new row `13-1h` (C6), which needs this story LANDED.

The questions as put (kept for the record):

- **Q-1 - Who records the Trustee Panel's decision on an appeal in the admin console (AD9, AD10)?** *Deciding fact:* the Panel hears every appeal
  against a Pariwar Admin's ending, and the ruling's accepted cost says the appeal is "recorded by the officer who hears it"; the platform already
  has a `trustee_panel` role that acts in the console for members' appeals and restorations (10.19, 10.22), but no field-worker permission is held by
  it yet, and the Panel today rules through you. *Options:* (A) a trustee signs in with a `trustee_panel` account and records the lodging and the
  decision - **recommended**: the hearer records, as ruled, and the record shows the Panel's key acted, not a Pariwar Admin on its behalf; cost: before
  go-live at least one trustee who could not have ended the worker needs an admin account with that grant in each Pariwar (Row 52 (d)); every
  Panel-heard appeal waits for a trustee to sign in; one trustee's console act stands for the Panel's decision (the note says so, Q5). (B) a Pariwar
  Admin (never the one who ended the worker) transcribes the Panel's ruling, naming the date it ruled - cost: the record is a transcription, which
  departs from "recorded by the officer who hears it", so B needs the Panel's agreement (note Q5 would ask it); in a Pariwar whose only Pariwar Admin
  ended the worker, only a super admin can record it.
- **Q-2 - Can the link join a returning worker who comes back with a DIFFERENT phone number (AD12)?** *Deciding fact:* the Panel ruled a returning
  worker is linked to their old record and left what the link joins to us; the officer only learns of an old record by its number (Q3 A). *Options:*
  (A) only a number-matched record, chosen at registration - **recommended**: the match is a fact the system can check; cost: a worker who changed
  numbers is not linked (carried, C6); numbers are recycled and the officer judges "the same person" from a date and a reason only, with no name, and
  the link is permanent (the column is immutable); after a link the earlier record's history is readable from the new one only by an officer who may
  read the earlier record anyway (AD12). (B) also a later act - a Pariwar Admin links any two records of this Pariwar - cost: a wrong link joins two
  people's histories and nothing can undo it; one more key and screen (catalog 94 -> 95; the Panel's confirm grows).
- **Q-3 - The Panel note (seven questions; section 0) - send as drafted, non-blocking?** *Deciding fact:* Q2-Q7 are built on our suggestion (Q6 as
  ruled) and Q1 builds nothing; each touches only go-live (Row 52); `-454` itself sends Question 1 back "with the work that builds the undo".
  *Options:* (A) yes, written at Task 0.6 and sent by you - **recommended**; cost: seven more questions for the Panel. (B) hold Questions 2-4, 6 and 7
  and send only 1 and 5 - cost: the appeal goes live on rules nobody ratified (a time limit, who hears and what the worker is told are the Panel's by
  `-454`'s own words).
- **Q-4 - One hear key, or one per hearer (AD9, AD10)?** *Deciding fact:* when an officer holds two grants at the same level, the system records the
  one whose role name sorts first, so a key shared by `pariwar_admin` and `trustee_panel` records a trustee who is also a Pariwar Admin as
  `pariwar_admin` - the record would not show that the Panel acted, which is Q-1 A's own reason (G12; 10.22 split its key for the same cause).
  *Options:* (A) two hear keys - `field_worker.hear_ending_appeal` (Pariwar Admin) and `field_worker.hear_ending_appeal_as_panel` (Trustee Panel only;
  never a super admin) - **recommended**: the key on each record says which hearer acted; cost: four keys instead of three (catalog 90 -> 94) and a
  small dispatcher on three routes. (B) one shared key, and the hearer read from the officer's grants - cost: the record misstates who decided for
  every trustee who is also a Pariwar Admin, and that person cannot act as one hearer without being refused as the other. If Q-1 is B, this question
  falls away (the Panel holds no key) and the hear key is the Pariwar Admin's only.

## The Panel note (Task 0.6) - what it asks

`_bmad-output/planning-artifacts/trustee-panel-routing-note-<the day it is written>-story-13-1f-field-worker-undo-and-appeal.md`, from the TEMPLATE (section 0
first; the deciding fact; an honest cost on EVERY option, the recommended one included; evidence last). Q2-Q7 are built on our suggestion (Q6 as
ruled); Q1 builds nothing. The costs below are the minimum the note carries:

1. **Teachers who joined with the code while the worker was wrongly ended - credited once the ending is undone?** (A) not credited (as built: the code
   was off) - cost: a worker ended by someone else's mistake loses the credit for that window; (B) held, and credited if the ending is undone - by
   mistake or on appeal - *our suggestion*, BY ANALOGY to the Panel's Q6 C ("held, and credited if cleared"), which the Panel did NOT extend to
   endings (`-454`: the note's reading under Q6 "was NOT in option C"); cost: the credit story must hold credits for every ended worker's code, for as
   long as the ending could be undone, and it NARROWS PRD FR-85 for an ended worker ("new attributions on deactivated code rejected" - the
   2026-11-07 annotation says that sentence stands for an ended worker; FR-85 would be annotated, not rewritten); (C) held, and credited only if
   undone within a set time - cost: a worker restored after the cut-off loses the window through no fault, the holding is still built, and it
   narrows FR-85 as (B) does. Nothing is credited to anyone today; as built the answer is (A) until 13.8 / 13.5 build the Panel's.
2. **The appeal's rules.** (A) no time limit; one appeal per ending (a withdrawn one does not count) - *our suggestion*; cost: narrower than members get
   (Part 8 lets a member appeal again after a refusal), so a worker refused once is restored only by a slip undo; an appeal can arrive years later;
   (B) a time limit (e.g. 30 days from the ending) and one appeal - cost: a worker who learns of the ending late loses the appeal; a date rule to build;
   (C) no limit, and a refused appeal may be brought again (as for members under Part 8) - cost: the same ending can be argued again and again.
3. **What the worker is told, and by whom.** (a) *Of an undo or an appeal's outcome:* (A) the officer who recorded the appeal tells the worker the
   outcome; after a slip is undone, the officer who undid it tells them; the screen reminds that officer "Tell the worker." (the shape the Panel
   ruled for move requests, `-459` Q3 A, and `-461` CR41 A extended to refusals) - *our suggestion*; the system sends nothing to the worker (no
   login, no text template); cost: it rests on officers, and nothing records that the worker was told; (B) nothing is required and no reminder -
   cost: a worker may never learn the outcome; (C) a text message - cost: a new approved template (Row 49's problems) and its delay.
   (b) *At an ending:* is the worker told that they may appeal, and to whom? (A) the officer who ended them tells them, reminded on screen ("Tell
   the worker. If they disagree, they can appeal.") - *our suggestion*; cost: it rests on that officer, who is the one being appealed against, and
   nothing records that it was said; (B) the worker is not told unless they ask - cost: a worker who does not know an appeal exists never makes one;
   (C) a text message at the ending - cost: as (a) (C), and it reaches a worker the Trust has just ended.
4. **Who hears, in four edges.** (a) *Confirm:* a Pariwar Admin's ending is heard by the Panel even when they are the Pariwar's only Pariwar Admin, or
   are also the worker's District Admin (the system records such an officer as a District Admin; we propose counting them as a Pariwar Admin - your
   ruling left the only-Pariwar-Admin case to us to propose) - (A) yes, as built; cost: the Panel hears these appeals too; (B) no - cost: an officer
   hears the appeal against their own ending.
   (b) A worker ended by a super admin: (A) the Panel - *our suggestion*, a super admin stands above the Pariwar Admin; cost: it departs from the
   ruling's words ("the Pariwar Admin hears it" covers every ender who is not a Pariwar Admin), and the Panel hears these; (B) the Pariwar Admin, as
   the words read - cost: an officer judges a higher officer's act. (c) May a super admin hear an appeal that the Pariwar Admin hears? (A) yes, as
   built - cost: it widens "the Pariwar Admin hears it", and an officer outside the Pariwar's own line may decide it; (B) no - cost: when no Pariwar
   Admin can act, nobody can. (d) Every Panel
   account holder in the Pariwar is the officer who ended the worker: (A) the appeal waits until another trustee has an account (as built; the roster
   requires one before go-live) - cost: delay; (B) a super admin may decide it - cost: a super admin acts as the Panel.
5. **Confirm four permissions** (`-059` B (3)) and how the Panel records: undo an ending - the Pariwar Admin only; hear an appeal heard by the Pariwar
   Admin - the Pariwar Admin; hear an appeal heard by the Panel - the Trustee Panel only; read the appeals - the District Admin of the worker's
   district, the Pariwar Admin and the Trustee Panel; a super admin derives all four (as `-454` Q7 A confirmed for 13.1c's keys "as recorded in
   `-453` AD5"), which Q4 (c) depends on. The note says plainly that ONE trustee's console account records the Panel's decision; that the
   `trustee_panel` role (constituted for members, Part 8, and itself PROVISIONAL - `-096` cl. 4) acts here for field workers; and that reading the
   appeals shows the workers' NAMES to `trustee_panel` holders (a disclosure, one audit line per page). (A) confirm - cost: one trustee's act stands for the Panel's;
   (B) confirm the keys, but the Panel's decision is recorded only with the date it ruled - cost: one more field and a rule the console cannot check.6. **May a Pariwar Admin undo an ending "as a mistake" after the Panel has heard an appeal on it and refused it?** (A) yes, as ruled ("may undo any
   ending made by mistake") - built; cost: a Pariwar Admin can reverse the Panel's refusal by calling the ending a mistake; (B) no - once the Panel has
   refused, only a new decision of the Panel restores the worker; cost: a genuine slip found after a refusal cannot be mended by the Pariwar Admin.
7. **An appeal is allowed while the worker's number belongs to a new registration (they came back meanwhile).** (A) as built: the decision is refused
   until that registration is ended - cost: the officer must end a registration that may be the worker's own genuine return, no ending reason
   describes it, the hearer's answer is recorded nowhere meanwhile, and a registration made while an appeal is OPEN silently blocks its allowance -
   the registering officer is not told an appeal is open (telling them would disclose more than Q3 A's date and reason); the same block applies to a
   slip undo (AD5); (B) the decision is recorded as allowed at once and the restore follows when
   the number is free - cost: a recorded "allowed" while the worker is still ended, and one more state; (C) allowed, and the worker keeps the NEW
   registration, linked to the old - cost: the old code stays dead, so "with the same code" is not given.

## Invariants (I)

- **I1** - The ONLY way out of `terminated` is `field_worker.ending_undone`, written by `undoEndingLocked` through the projector with the undo writer
  variable set; the database refuses every other UPDATE of a terminated row (AD4) - proved live with and without the variable. The database does not
  check the target; the command and the projector do.
- **I2** - An undo restores EXACTLY the fold of the stream before the undone ending: state, suspension reason, `kyc_status`, district; `ended_on` null;
  the id, the code row and `approved_by_display` unchanged. 13.1's I4 (row = fold) holds after an undo - proved by the row-equals-fold helper in
  `packages/domain/tests/integration/field-worker/_fixtures.ts`; `scripts/field-worker-state-invariant` (a static writer scan) stays green only
  because the undo UPDATE stays inside `projectFieldWorkerTransition`.
- **I3** - No write to `field_worker_attribution_codes` anywhere in this story (check: `git diff 5ede00c4 -- packages apps | grep -n
  field_worker_attribution_codes` shows reads only); the old record's code stays dead after a link; a restored worker's code credits again only
  through `acceptsNewAttributions` (unchanged).
- **I4** - At most one OPEN appeal per worker (partial unique); an appeal names exactly one ending; a SLIP's undo (`cause = 'mistake'`) supersedes the
  open appeal in its own transaction; an `appeal_allowed` undo supersedes nothing.
- **I5** - An appeal is lodged, decided or withdrawn only under the hear key matching its `heard_by`; `heard_by` is fixed at the ending (AD8) and never
  recomputed; the ender never decides or withdraws.
- **I6** - No name, mobile or code in any new payload, audit field, response, error detail or URL. The shown line decrypts nothing; the appeal list and
  the eligible list decrypt names behind one audit line per page.
- **I7** - Every pre-read refusal writes no audit line - EXCEPT AD11's shown-number 409, a disclosure, which writes exactly one (awaited; if it fails,
  a 500 and nothing is disclosed). Every committed act writes exactly one, before the COMMIT: an allowed decision writes ONE line
  (`field_worker_ending_appeal.allowed`) whose `audit_id` both of its events carry; a slip undo's line covers its supersede.
- **I8** - The reach fence, the door's export pin, the AT9 word rule and `check.test.ts`'s two fences stay green with no new allow-list entry.
- **I9** - No member predicate, member state, `acceptsNewAttributions`, the code-SMS sweep, 13.1d's request rules or 13.1g's emails change. The only
  touches to EXISTING routes and writers are: AD8's new terminated field; every lifecycle act's new `state_event_version` in its 200 (AD6); the
  register route's shown number and link (AD11, AD12); the log's `record` parameter and new item fields (AD12); and AD15's key pins.
- **I10** - `PERMISSION_CATALOG_VERSION` moves exactly once (62 -> 63) and the key count by exactly four (Q-1 A, Q-4 A; Q-2's answer adds no key to this story).

## Acceptance Criteria

The HTTP, audit and 403 / 409 legs are proved in `apps/api/tests/integration/field-worker/`; the state, fold and lock legs in
`packages/domain/tests/integration/field-worker/`. Every refusal leg asserts the status AND the code; every "nothing happened" leg pairs its absence
assertion with a control that shows the same path writes when allowed.

**AC1 - Undoing a mistaken ending.** A Pariwar Admin undoes the ending of a worker ended from each of `pending_kyc`, `active` and `suspended` (one live leg
each, and one ended `died`): 200; the worker is back in that state - a suspended one with the SAME suspension reason, a pending one with its KYC status -
`ended_on` null, the same district, id and code row; one `field_worker.ending_undone` event (`cause: mistake`, `undone_ending_version`, the
`field_worker.undo_ending` snapshot); one audit line; the row equals the fold (`_fixtures.ts`). The history shows the ending AND the undo. (a) A District
Admin -> 403 `authz.forbidden`. (b) A worker who is not `terminated` -> 409 `illegal_transition`, no event, no audit line (with a control). (c)
`acceptsNewAttributions` is true again for a worker restored to `active`, and the by-hand code read (`GET .../:fieldWorkerId/code`,
`field_worker.read_code`) works again. (d) The as-of read: a capture made while the worker was ended reads `terminated`; one after the undo reads the
restored state (I2; [[project_db_clock_ordering_tests_tie]] - separate transactions). (e) A worker undone and then ended again is ended normally; the
second ending can be undone too, and the fold of a stream with two endings and one undo restores the right state. (f) Unit: `nextFieldWorkerState(
'terminated', 'field_worker.ending_undone')` with no payload, or a bad one, returns `null`; with each valid payload it returns that target;
`fieldWorkerStateMachine` / `replayFieldWorkerState` fold the undo; every existing arm is unchanged; `foldFieldWorkerProjection` folds it too (its
OWN call passes the payload - G17 (g); a leg whose stream ends in an undo, asserted against the fold). (g) The 200 carries `state_event_version` (the
undo event's) and the restored reason from the COMMAND's result. (h) Unit: the barrel does not expose the core - `'undoEndingLocked' in fieldWorker`
and `'readFieldWorkerStreamLocked' in fieldWorker` are both false. (i) Unit: `FieldWorkerEndingUndonePayloadSchema` refuses each wrong cause-key
pairing (`mistake` + a hear key; `appeal_allowed` + `undo_ending`; `appeal_allowed` with a null `appeal_id`), with a passing control per cause.

**AC2 - The number is live again (AD5, AD12).** Ended, the number registered again by a new worker, the undo -> 409 `number_registered_again`, no event,
no audit line; the newer registration ended `registered_in_error`, the undo then succeeds - leaving the newer record terminated (and, if it was linked,
pointing at a now-live record: allowed, its history and labels still read). Two live race legs (`waitForBlockedBy`; assert the reason AND a control -
[[feedback_assertion_after_savepoint_rollback_is_vacuous]]): (i) a registration's uncommitted INSERT holds the number's index entry, the undo's UPDATE
waits on it, the registration commits -> the undo's 23505 maps BY NAME to the same 409, with the intent line and its `_rolled_back` audit twin; (ii) the undo holds the old row's
lock and a registration with `link_to` = that row waits on its `FOR SHARE` -> the undo commits, the registration answers 422 `link_invalid` - no
40P01; (iii) the reverse of (i): the undo's uncommitted UPDATE holds the entry, a registration of the number waits on it, the undo commits -> the
registration answers 409 `mobile_already_registered` (its intent line and `_rolled_back` twin) and the worker stays restored. RED proof of (ii) (a development-time mutation): without the `FOR SHARE` the same interleave deadlocks.

**AC3 - A stale undo or lodge (AD6, AD7).** Two Pariwar Admins see the same ending; one undoes it and the worker is ended again; the other's undo (the old
version) -> 409 `ending_changed`, the new ending stands. A lodge carrying the old version -> 409 `ending_changed`, no appeal.

**AC4 - The database admits only an undo-shaped UPDATE (AD4).** Live, below the projector, six refusals, each asserting P0001 AND the rule's own message:
an unguarded UPDATE of a terminated row ((a)'s message); guarded WITHOUT the undo variable ((t')'s); with it, an UPDATE that keeps `terminated`,
that sets an `ended_on`, that changes the district, that changes the KYC status `pending -> completed` - each (t')'s message ((t') answers before
(c)). Each refusal is also matched by `isFieldWorkerStateDirectWriteError` (the shared prefix - G25). The legal undo shape passes. The other rules still bite (e.g. (b) still refuses an identity change on a live row). The projector check
(AD3): an `ending_undone` whose `to_state` differs from the undone event's `from_state` -> `FieldWorkerProjectorInputError`. RED proof (a
development-time mutation on a FRESH container migrated through `0207`, not a committed test): re-run `0201`'s `CREATE OR REPLACE FUNCTION
field_workers_reject_unguarded_state_write` body; the AC1 undo then fails P0001 "a terminated field worker is never updated"; restore by re-running
`0207`'s function.

**AC5 - Lodging an appeal (AD7, AD9).** The hearer records an appeal for a `terminated` worker with `expected_ending_version`, `received_on` and
`received_via`: 201 with the appeal; one `lodged` event signed with the hear key matching `heard_by`; `heard_by` copied from the ending. (a) A District
Admin's ending is heard by a Pariwar Admin: a `trustee_panel`-only holder -> 403. (b) A Pariwar Admin's ending (and a dual-role officer's, and a
Pariwar's only Pariwar Admin's) is heard by the Panel: a Pariwar Admin -> 403; a `trustee_panel` holder -> 201 under
`field_worker.hear_ending_appeal_as_panel`; a super admin -> 409 `appeal_wrong_hearer` from the PRE-READ, with no audit line (control: a
`trustee_panel` holder's lodge writes one). (c) A second appeal while one is open -> 409 `appeal_open`; the
partial unique's 23505 BY NAME is a backstop, proved by planting an open row through the projector without the worker lock. (d) After a REFUSED
appeal on the same ending -> 409 `appeal_already_decided`; after a withdrawn one -> 201; after an allowed one -> 409 `illegal_transition`. (e)
`received_on` after today or before the worker's registration day (IST, read from the DB) -> 422 `appeal_date_invalid`; one before `ended_on` (and
after registration) -> 201. (f) A non-terminated worker -> 409 `illegal_transition` (the dispatcher's no-hearer branch - AD9 - for a holder of
either hear key). (g) A District Admin -> 403 (no hear key). (h) The ender may lodge: 201, `lodged_by_user_id` = `ended_by_user_id` = the ender
(fixture: the `pariwar_admin` + `trustee_panel` officer ends the worker - heard by the Panel - then lodges as the Panel). (i) Unit: the lodge's
check order under the lock (AD9: terminated -> version -> key vs the in-lock hearer -> open -> already decided -> dates). (j) The in-lock hearer, not
the gate's (domain leg): the lodge command takes NO `heardBy` input - called directly with an `_as_panel` authorization and the CURRENT version
for an ending made by a District Admin (heard by the Pariwar Admin) -> `appeal_wrong_hearer` under the lock; control: the `hear_ending_appeal`
authorization lodges. (k) A missing worker id, and a REAL worker id of another Pariwar
-> 403, never 404 (13.1d CR24). (l) The 201 body is `FieldWorkerEndingAppeal` - its fields present AND no name, mobile or code (I6).

**AC6 - Deciding and withdrawing (AD9).** (a) Allowed: one transaction writes `field_worker.ending_undone` (`cause: appeal_allowed`, `appeal_id`, the
hear key's snapshot) and `field_worker_ending_appeal.allowed`, ONE audit line whose `audit_id` both events carry; the worker is restored exactly as in
AC1. (b) If the number is live again the decision is refused 409 `number_registered_again` and the appeal stays OPEN - asserting the 409's code AND a
control: the same decision after that registration is ended succeeds. (c) Refused: the worker stays ended; `decided_on` recorded. (d) The ender ->
409 `appeal_decider_is_ender` on decide AND on withdraw (fixture: an officer holding `pariwar_admin` + `trustee_panel` ends the worker - heard by the
Panel - then acts as the Panel). (e) A closed appeal -> 409 `appeal_not_open`. (f) Withdrawn: closed; a new appeal may be lodged. (g) `decided_on`
outside `received_on`..today -> 422. (h) A wrong hearer: a Pariwar Admin on a Panel-heard appeal's decide / withdraw -> 403; a super admin on one ->
409 `appeal_wrong_hearer` (pre-read, no audit line); a super admin on a Pariwar-Admin-heard appeal -> allowed (note Q4 (c) as built). (i) The
command's check order (unit, `commands-guards`-style): the appeal's worker = the locked worker -> key vs `heard_by` -> open -> ender -> dates; and
the lock order: `appealWorkerOf` (unlocked) -> worker lock -> appeal lock (a statement-order pin). (j) The only `_as_panel` holder is the ender:
decide -> 409 `appeal_decider_is_ender` and the appeal stays open (note Q4 (d) as built). (k) The decide-allowed 200 is `{ appeal, worker }` with the
restored `FieldWorkerLifecycleResult`; refused / withdrawn bodies as AD7 - fields present, no name, mobile or code. (l) A REAL appeal id of another
Pariwar -> 403 on decide and withdraw.

**AC7 - The hearer is fixed at the ending (AD8).** The terminate route writes `appeal_heard_by`: a District-Admin-only actor -> `pariwar_admin`; a
Pariwar Admin -> `trustee_panel`; an actor holding both -> `trustee_panel` (while the snapshot's `role` says `district_admin`); a super admin ->
`trustee_panel`. Removing the actor's Pariwar Admin grant after the ending changes nothing. A legacy terminated event without the field (planted by
raw SQL as `twt_owner` - the command refuses to write one) still PARSES with `FieldWorkerTerminatedPayloadSchema` and is lodged as `trustee_panel`
(AD17). `terminateFieldWorker` without `appealHeardBy` is refused (unit). 13.1c's terminate tests and every caller in G22 are updated for the new
required input.

**AC8 - An undo supersedes the open appeal; an ending's supersede of a move request stays (AD6).** A slip undone while an appeal is open: the appeal is
`superseded` in the same transaction (event `field_worker_ending_appeal.superseded`, signed with `field_worker.undo_ending`; `decided_on` the undo's
IST date). A worker whose open move request the ending superseded: after the undo the request is still `superseded` and a new request can be opened.
A slip undo after the Panel REFUSED an appeal on that ending succeeds (note Q6, built as ruled). An `appeal_allowed` undo supersedes nothing (its
appeal becomes `allowed`, no `superseded` event). The superseded row's `decided_by_user_id` is the undoer.

**AC9 - The shown number (AD11).** Registering a number that belongs to one or more ENDED workers of this Pariwar -> 409 `number_previously_ended`
with each `{ field_worker_id, ended_on, reason_code }` (`ended_on DESC, field_worker_id`, at most 5 - a leg with two endings on one day) and ONE `field_worker.previous_endings_shown` audit line
(`responseStatus` 409); re-submitted with `previous_endings_seen: true` under a new idempotency key -> 201. (a) An ended worker of ANOTHER district of
this Pariwar is shown; one of ANOTHER Pariwar never is. (b) A LIVE holder still answers 409 `mobile_already_registered` first (no ended list). (c)
The 409 body holds `details.previous_endings` with the expected ids (positive) AND no name, mobile, district or officer (absence). (d) KMS is called
for the seal only - no decrypt. (e) A retry of the first submit (same key) writes a second audit line (G20). (f) The audit write failing -> 500 and no
`details` in the body.

**AC10 - The link (AD12).** Re-submitted with `link_to` = a shown record -> 201; the new row's `previous_field_worker_id` and the genesis payload carry
it; the new worker has a NEW code; at link time the old record is `terminated`, its code row unchanged and `acceptsNewAttributions` false. (a) `link_to` a
live record, another number's record or another Pariwar's -> 422 `link_invalid`; `link_to` without `previous_endings_seen: true` -> 400. (b) The column
is immutable (a guarded UPDATE that changes it -> P0001, rule (b)). (c) The new worker's log shows the link; `log?record=<old id>` returns the old
stream to a Pariwar Admin; to a District Admin of the new worker's district whose old record lies in ANOTHER district -> 403; a `record` not in the
chain -> 403; both 403s carry NO `details` (absence asserted); a two-hop chain is followed; an 11-hop chain stops at 10; a REAL worker id of another
Pariwar as `record` -> 403. (d) The linked worker starts `pending_kyc` and is approved like any worker (KYC, activate - `-443` Q4 A).

**AC11 - The keys (AD10, AD15).** Catalog v63; exactly four keys added (Q-1 A, Q-4 A); holders and non-holders pinned in `roles.test.ts` (one describe
per key; `undo_ending` and `hear_ending_appeal` may join 13.1d's `describe.each` table, but `_as_panel` and `read_ending_appeals` get their OWN
describes - that table hard-codes `trustee_panel` as a non-holder): `trustee_panel` holds `hear_ending_appeal_as_panel` and `read_ending_appeals` and NOT `undo_ending` or
`hear_ending_appeal`; no role but `trustee_panel` holds `_as_panel` (super_admin derives it); a `trustee_panel` pariwar grant passes the
district-dimension check (a live leg - G12); the bundle count stays 13. Every worker event's schema AND every `field_worker_ending_appeal.*` schema
refuses a snapshot signed with another key (`superseded` -> `undo_ending`; the rest -> the two hear keys), with `posted` unchanged; the CR6 control is
re-keyed, not inverted (TR10).

**AC12 - The screens (AD14).** RTL tests: an ended worker opened from Find shows "Undo ending" to a Pariwar Admin (and the act answers 403's line for a
District Admin - `fw.actions.noAccess.undo` - no client-side role gating, as 13.1c AD8); the End confirm shows the reworded line; **End then Undo in
the SAME open panel, with no refetch between, sends the version the End's 200 returned and succeeds** (G24 - the cache carries
`state_event_version`); the undo confirm (with its open-appeal line when one is open) and a success that updates the panel from the 200 with NO
second identity fetch; the "Tell the worker." reminders after End, undo, decide and withdraw; `ending_changed` invalidates the IDENTITY query and
a retry then succeeds; `number_registered_again` and `illegal_transition` each show their line and refresh; opening worker B after worker A resets
the undo / lodge forms and their retry keys (`key={fieldWorkerId}` - 13.1d CR48); an `appeal_allowed` undo signed by `trustee_panel` shows the
Trustee Panel role label in the history, never "role not recorded";
the register page shows the shown-number line with the endings and the link choice, and a second submit with a NEW idempotency key carrying
`previous_endings_seen: true` only after the list was shown; the history labels the undo and offers the earlier record; the Appeals page lists,
filters by state, offers "Record an appeal" from the eligible list (a `trustee_panel`-only holder can lodge from there), and decides / withdraws with
the hearer's line. A real-browser pass (Task 8): end -> undo, end -> appeal -> allow, end -> appeal -> refuse, register a number of an ended worker
and link it, read both histories ([[project_admin_browser_pass_launcher]]; [[project_agent_chrome_cannot_reach_localhost]]).

**AC13 - Nothing else moves (I8, I9).** The reach fence, the door's export pin, the AT9 word rule and `check.test.ts`'s fences pass with no new
allow-list entry; `field-workers-policy-regression.spec.ts` and `composite-fk.spec.ts` are updated for exactly the new column, CHECK and FK;
`packages/events` registry coverage includes the six new event types (the worker one in `field-worker-registry-coverage.test.ts`, the five appeal
ones in a new `field-worker-ending-appeal-registry-coverage.test.ts`); the seven new paths, the register route's new 409 / 422 and the log's `record`
parameter registered by hand in `packages/contracts/scripts/emit-openapi.ts`, `openapi/v1.yaml` regenerated and its determinism check passes (and
neither `emit-openapi.ts` nor `packages/events/src/registry.ts` calls `terminated` final / "Terminal;" any more); `forced-pagination.spec.ts`
passes; every new GET carries `limits.read`, pinned by object identity in the route-table tests (13.1d AC7 (d), CR20); the jobs
`field-worker-notice-email-no-decision.test.ts` fence lists the new EXPORTED writers (`undoFieldWorkerEnding`, `allowFieldWorkerEndingAppeal`,
the lodge / refuse / withdraw commands) and the table `field_worker_ending_appeals` - never the private core; `scripts/field-worker-state-invariant`
stays green with no allowlist change; the new `scripts/field-worker-ending-appeal-invariant` (13.1d's move-request gate's model) passes in `ci.yml`
AND `ci-local.sh`; `microcopy:check` passes.

**AC14 - Governance first.** Decision `-464` is committed ALONE before any code, and it says in terms: it AMENDS roster Row 50 (f) and `-453` AD8's
"a line that ending is final", each by name, and supersedes no other text; it RECORDS AD8's only-Pariwar-Admin answer as the author's PROPOSAL under
`-454`'s appeal bullet ("the author's to propose") - it does NOT amend `-454`; it NAMES the super admin edges (AD8's Panel hearing for a super
admin's ending, AD9's super admin hearing) as built ahead of the Panel, pending note Q4 (b) / (c); it records the keys under `-059` B (3) as
`-453` / `-458` did (`-210` cl. 2 excludes keys from its delegation). Row 52 and the dated lines at Row 50 (f) and Row 48 (i) in their own commit;
the `epics.md` annotations; the Panel note written per the template and not called sent until BigDev says it went
([[feedback_shown_to_panel_means_sent]]).

**AC15 - The appeal reads (AD13).** (a) The list: one `field_worker.ending_appeal_list_viewed` audit line per page naming its workers; names present;
`limit` defaults to 20 and is clamped to 25; with `district` a District Admin of it -> 200, without `district` a District Admin -> 403 and a
Pariwar Admin -> 200; a `trustee_panel`-only reader sees only Panel-heard appeals. (b) The eligible list: only `terminated` workers whose CURRENT
ending (AD17) has no open or refused appeal and whose `appeal_heard_by` matches a hear key the reader holds; each item carries `ending_event_version`
and `heard_by` (positive) and no mobile or code (absence); one `field_worker.ending_appeal_candidates_viewed` line per page; a `trustee_panel`
holder sees Panel-heard endings only; a super admin sees Pariwar-Admin-heard endings only (`_as_panel` from a `global` grant does not count); a
District Admin with `district` = theirs (no hear key) gets 200 and an empty page; without `district`, 403. (c) The per-worker read takes `limit`
(default 20, cap 25) and applies the same trustee-only rule. (d) A missing appeal id, and a REAL appeal id of another Pariwar, on decide / withdraw
-> 403 (its `details` are the inherited CR31 shape - not asserted absent). (e) An EMPTY page writes NO audit line (list, eligible) - with a control
(a non-empty page writes one). (f) A REAL worker id of another Pariwar on the per-worker read -> 403.

**AC16 - The appeal table's backstops (AD7; 13.1d CR1-CR6).** Live, below the projector: the guard refuses every transition but `open -> allowed |
refused | withdrawn | superseded` and freezes each of the four final states (one leg each, P0001 + its message); each immutable column
(`pariwar_id`, `field_worker_id`, `ending_event_version`, `heard_by`, `received_on`, `received_via`, `lodged_by_user_id`, `ended_by_user_id`)
refused on change; the CHECKs `open <=> decided_on NULL`, `open <=> decided_by_user_id NULL`, `decided_on >= received_on` and "the decider is not
the ender" each fire 23514 BY NAME; an INSERT with `ended_by_user_id` or `lodged_by_user_id` NULL fails 23502 (without the NOT NULL the
ender CHECK passes a NULL); DELETE and TRUNCATE refused AS THE OWNER role (never as `twt_app`, where the missing GRANT answers 42501
first); the composite FK's 23503 BY NAME for another Pariwar's worker and for an unknown worker, and the same for `previous_field_worker_id`.
Every projector write passes under `twt_app` (TR12's GRANT coverage). RED proof per CHECK and guard rule (mutate, see it fail, restore).

**AC17 - Concurrency and actor legs (the "Concurrency matrix"; 13.1d CR12, CR27).** Every row of the matrix has its live leg, in BOTH lock orders
where it says so, with `waitForBlockedBy` and the reason AND a control asserted. For each of undo, lodge, decide and withdraw (domain, as owner): a
non-human actor, a literal (unverified) authorization, a wrong key and a wrong dimension are each refused with their codes. The actor kind
(AD9): every `_as_panel` act's events carry `actor: 'trustee'` and every other act's `'operator'` (API legs); a command given `_as_panel` with
`'operator'`, or `'trustee'` with another key, is refused (domain).

## Tasks / Subtasks

Order matters: governance first ([[feedback_governance_commits_precede_implementation]]), then the migration and domain, then contracts, the API, the
screens. Commit on the story branch only ([[feedback_commit_on_story_branch]]); check the branch before EVERY commit
([[feedback_concurrent_review_agents_mutate_tree]]); work only in this worktree, grep `docs/legal` by ABSOLUTE path
([[feedback_worktree_session_never_cd_to_main_checkout]]); prefix every `ci:local` and `git push` with the story's own `DATABASE_URL` port and
`?sslmode=disable` on a FRESH container ([[project_prepush_hook_inherits_5432]]); hand-format, never `prettier --write` ([[project_prettier_not_enforced]]);
first push with an explicit refspec ([[project_story_branch_upstream_is_main]]).

- [x] **Task 0 - Preflight and governance (AC: 14)** - runs FIRST; writes no code.
  - [x] 0.0 **DONE `c73bddbd` (2026-11-16).** Commit this story file and the create-story record edits (`epics.md` note under Story 13.1f, `deferred-work.md` section, `sprint-status.yaml`
    row + ledger `2026-11-12m` / `2026-11-13a` / `2026-11-14a` / `2026-11-16a` / `2026-11-16b`) as ONE `records(13.1f)` commit on the story branch, when BigDev asks.
  - [x] 0.1 **DONE 2026-11-16 (dev-story):** `origin/main` still `5ede00c4`, nothing to re-derive; `-464`, `0207`, Row 52 free; G6, G12, G16, G22, G23 hold. `git fetch origin`; `git merge-base --is-ancestor 5ede00c4 HEAD`; `git diff --name-only 5ede00c4..origin/main -- packages apps scripts
    .github docs/launch-gate-inventory`. Re-derive any claim at the new tip; re-grep the NUMBERS block; `git worktree list` for a branch touching
    `packages/domain/src/field-worker/`, `rbac/`, `migrations/` or `apps/admin/src/modules/field-workers/`. Re-check G6 (no grant-history table), G12
    (a `trustee_panel` grant passes a district check; `requirePermissionHook` still takes a fixed key), G16 (`resolveAttributionForRequest` still has
    no caller), G17-G29 (esp. G23's `export *` barrel, G24's result shape, G26's precedent, G28's helpers and defaults).
  - [x] 0.2 **DONE 2026-11-16 (v1.4):** BigDev answered Q-1..Q-4 (the ASKs section, verbatim); propagated below in the same edit. The
    instruction as written: **Stop until BigDev answers Q-1..Q-4.** Record BigDev's words verbatim in the Change Log, then propagate each answer through every site that
    names it, in the SAME edit, before any code ([[feedback_spec_edits_must_propagate_to_tasks]]): grep the story for `Q-1`, `Q-2`, `Q-3`, `Q-4`,
    `trustee_panel`, `_as_panel`, `four keys` / `exactly four` / `90 -> 94`, `seven questions`, `link_to`, `PROPOSED`. At minimum: the NUMBERS block,
    the Names table, section 0, AD7, AD9, AD10, AD12-AD14, AD17, I5, I10, the Per-command table, the Errors table, AC5, AC6, AC10, AC11, AC15, the
    File checklist, Tasks 0.3, 0.4, 1.1, 5.2 and the Panel note plan. Then drop each `PROPOSED` tag the answer settles.
  - [x] 0.3 **DONE `7117e7e9` (2026-11-16): `2026-11-16-464`, committed ALONE.** Write decision `-464`, dated the day it is COMMITTED (`<YYYY-MM-DD>-464`; re-grep every ref first) above the newest entry in `.decision-log.md`; commit it ALONE, `governance:` prefix:
    an author-commit (BigDev) recording AD1-AD17 and the answers verbatim (incl. the three Q-2 follow-ups) and the new row `13-1h`
    (Q-2's PAN / Aadhaar-last-4 identification, split out at BigDev's word - the `-458` / 13-1g shape: the parent's decision records the row); the four keys RECORDED under `-059` B (3) as `-453` / `-458` did
    (`-210` cl. 2 EXCLUDES keys from its delegation - it authorises none); AD8's only-Pariwar-Admin answer RECORDED as the author's PROPOSAL under
    `-454`'s appeal bullet ("the author's to propose") - it does NOT amend `-454` (only the Panel widens what its ruling covers) - to be confirmed by
    note Q4 (a); the super admin edges NAMED as built ahead of the Panel (AD8: the Panel hears a super admin's ending, departing from Q1 A's literal
    default clause; AD9: a super admin may hear a Pariwar-Admin-heard appeal, widening it) pending note Q4 (b) / (c), go-live held by Row 52 (b);
    AD8's one-property snapshot instead of 13.1c C2 (ii)'s "every role"; it AMENDS, by name, roster Row 50 (f) (the terminate route also waits on
    Row 52 (a), (b), (d), (e)) and `-453` AD8's "a line that ending is final" (AD14); it supersedes no other text; Policy meaning as in this story;
    the seven questions put to the Panel. Cite `-454`, `-455`, `-453`, `-458`, `-459` Q3 A, `-461` CR41 A, `-059` B (3), `-210` cl. 2, `-096` cl. 4,
    13.1c C2 (ii), PRD FR-85.
  - [x] 0.4 **DONE `785b4db5` (2026-11-16): Row 52 + the dated lines at Row 50 (f) and Row 48 (i).** Roster, its OWN `governance:` commit: append **Row 52 `field-worker-ending-undo-appeal-live`** (decision-authored, `-464`; blocking no build or
    merge - [[project_not_in_production_merge_is_not_golive]]), in Rows 48-51's shape - its `gate_name` ("the undo, the appeal and the register
    route's shown number and link are not used on a real worker in production until ...") and its `architecture_source_line` (citing `-464` under
    `-059` B (3)) - with legs: (a) the Panel's confirm of the four keys and of how the Panel records (note Q5); (b) the
    Panel's answers to note Q2-Q4, Q6 and Q7 recorded (built on the suggestions; a different answer is changed before go-live); (c) note Q1 answered
    before any code that credits a field worker for a signup goes live (13.8 / 13.5 read it - the Row 50 (d) shape); (d) (Q-1 A): in each Pariwar
    where a worker can be ended, at least two `trustee_panel` holders, or one who holds no grant carrying `field_worker.terminate` there; (e) Row 48
    closed first. Dated lines: **Row 50 (f)** - "`-464` amends this leg: met when Row 52 (a), (b), (d) and (e) are met and the undo and appeal
    routes are deployed" (NOT (c) - that leg gates the credit recorder, 13.8 / 13.5, not the terminate route); **Row 48 (i)** - four more keys
    await the Panel (note Q5).
  - [x] 0.5 **DONE 2026-11-16** (the DECIDED note under 13.1f; the `-464` pointer under 13.1h; pointers under 13.1b, 13.1c, 13.1e, 13.5, 13.6, 13.8). Annotate `epics.md` Story 13.1f (a DECIDED note: answers and where; the Story 13.1h section, added 2026-11-16 with the row, gets the
    `-464` id once committed), and pointers under Story 13.1c ("Ending is final" now reworded by
    13.1f), Story 13.1e (C2), Story 13.6 (C3), Stories 13.8 / 13.5 (C1), Story 13.1b (C7). Annotate, never rewrite.
  - [x] 0.6 **DONE 2026-11-16 - DRAFTED, NOT sent:** `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-11-16-story-13-1f-field-worker-undo-and-appeal.md`, seven questions; its E4 commands run 2026-11-16, every one as expected (`-464` 1; the keys 0; the appeal table 0; the credit door's non-test callers 0; each quote 1). Write the Panel note from the TEMPLATE (section "The Panel note" above, every cost carried); run its E4 commands - every one passes, or the
    note is not called ready; it is DRAFTED until BigDev sends it. A ruling is its own decision entry plus dated lines at Row 52 and Row 48 (i).
    Non-blocking: code may start after 0.5.

- [ ] **Task 1 - Keys (AC: 11; I10)** - in the SAME commit as the first code that uses them (Task 3.1's undo key list).
  - [ ] 1.1 `permissions.ts`: four keys, `PERMISSION_CATALOG_VERSION = 63`, the changelog comment (REUSE CHECK: not `field_worker.terminate` - the
    opposite act; not `member.restore_terminated` / `member.decide_moderation_appeal` - members; not `field_worker.read_log` - the worker stream, not
    the appeal stream). `roles.ts`: constants and bundle entries per AD10 (`trustee_panel`'s bundle gains `_as_panel` and `read_ending_appeals`; the
    `_as_panel` comment in 10.22's words).
  - [ ] 1.2 `tests/rbac/permissions.test.ts` (`toBe(63)`, `toBe(94)`), `tests/rbac/roles.test.ts`, `tests/field-worker/events.test.ts` catalog fixtures.

- [ ] **Task 2 - Migration `0207` (AC: 4, 5, 10, 13, 16; I1)** - hand-authored ([[project_live_db_test_gotchas]]: never regenerate; a `when` after 0206's).
  - [ ] 2.1 The guard function `CREATE OR REPLACE`d from `0201`'s body with (t') and its own message (AD4); a header naming 13.1e's duty to carry it (C2).
    Diff the function text against `0201`'s in review (TR2).
  - [ ] 2.2 `field_workers.previous_field_worker_id uuid NULL`, CHECK `<> field_worker_id`, the composite FK (AD12); the drizzle column in
    `schema/field_workers.ts`. Nothing else on `field_workers` changes. Update `field-workers-policy-regression.spec.ts` (the column list; the
    constraint list gains exactly the CHECK and the FK) and `composite-fk.spec.ts` if it pins the table's FKs.
  - [ ] 2.3 `field_worker_ending_appeals` (AD7) on `0205`'s shape: table (incl. `ended_by_user_id` and `lodged_by_user_id` NOT NULL, `decided_by_user_id`), the four AD7 CHECKs + the
    state / hearer / via CHECKs, GRANT, FORCE RLS + three policies, the projector-only guard (transitions `open -> final` only, the four final states
    frozen, the immutable columns), the no-delete and no-truncate triggers, the partial unique, the composite FK; `schema/field_worker_ending_appeals.ts`
    + `schema/index.ts`; the journal entry; the `policies/` RLS file AND its entry in `policies/index.ts`; its own policy-regression pins.
  - [ ] 2.4 Live specs on a FRESH container: `schema-trigger.spec.ts` (AC4's six refusals with their messages + the legal shape; AC10 (b)); the appeal
    table's AC16 legs (guard per transition and per final state, immutables, CHECKs by name, DELETE / TRUNCATE as OWNER, FK 23503 by name) and RLS.
    The RED proof of AC4 (as AC4 words it) and of each AC16 CHECK / guard rule.
  - [ ] 2.5 `scripts/field-worker-ending-appeal-invariant` on 13.1d's move-request gate's model (projector-only writers of the appeal table), wired into
    `ci.yml`, `ci-local.sh` and `package.json` (one more job).

- [ ] **Task 3 - The domain (AC: 1-11, 16, 17; I1-I5)**
  - [ ] 3.1 `events.ts`: `FieldWorkerEndingUndonePayloadSchema` (with AD2's two superRefines - the suspension reason, and cause <-> key),
    `FIELD_WORKER_UNDO_PERMISSION_KEYS` (three entries: the undo key and both hear keys), `appeal_heard_by` on `terminated` as `.optional()` in the
    SCHEMA (AD8 - required by the command's input, not the schema), the optional `previous_field_worker_id` on `registered`, every key pinned (AD15);
    `FIELD_WORKER_EVENT_TYPES` + the schema map (`events.test.ts` `toHaveLength(8)`); the `packages/events` registry entry (and reword
    `field_worker.terminated`'s "Terminal;") and `field-worker-registry-coverage.test.ts`. `ids/index.ts`: the branded `FieldWorkerEndingAppealId`.
  - [ ] 3.2 `state.ts` per AD3: the undo arm BEFORE the table lookup, parsing the fold-only schema; `FIELD_WORKER_UNDO_TRANSITIONS` (doc-only, outside
    `FIELD_WORKER_TRANSITIONS`); `reduce` passes `event.payload`; `foldFieldWorkerProjection`'s OWN call passes `row.payload` (G17 (g)); the fold
    applies the undo; the header. `state.test.ts`: the `legal` count, the literal table and "nothing leaves terminated" stay UNCHANGED (G17 (f)) -
    ADD the payload legs (each valid payload -> its target; none / bad -> `null`), the agreement test treating `ending_undone` as payload-dependent
    (TR1), the fold legs (per from-state, two endings and one undo), AC1 (f)'s unit legs.
  - [ ] 3.3 `project.ts`: the undo variable for `ending_undone` only, `SET LOCAL` as the writer variable is, nested INSIDE its `try / finally`; AD3's
    check of the undone event (`from_state` read raw); `ended_on` null, reason restored; the 23505 on `FIELD_WORKER_MOBILE_LIVE_CONSTRAINT` mapped
    in the UPDATE catch (AD5, TR3); `projectFieldWorkerGenesis`'s INSERT writes `previous_field_worker_id` from the payload.
  - [ ] 3.4 `commands.ts` (AD2, TR14, TR17): `runLockedTransition`'s optional `resolveTarget`; the PRIVATE `readFieldWorkerStreamLocked` and
    `undoEndingLocked`; the two exported writers `undoFieldWorkerEnding` (guard (0): actor, `field_worker.undo_ending`, `expectedEndingVersion`;
    under the lock: terminated, the version, (3d) `assertLockedTarget`, the stream fold; after the transition, `ending-appeal-supersede.ts` for an
    open appeal) and `allowFieldWorkerEndingAppeal` (worker lock -> `ending-appeal-lock.ts` -> AD9's decide checks -> the core -> `.allowed` through
    `ending-appeal-project.ts`). Both return `reasonCode` and `endedOn: null` with the transition result (G24). `istToday` and `verifiedSnapshot`
    (its event union widened to the appeal events - never a bare `string`, 13.1d CR19) exported for the appeal files - neither writes, so the
    barrel's header lists them beside `lockFieldWorkerRow` (the CR19 rule). The full statement-order pin in `commands-guards.test.ts` (AD2's list)
    with `classify` rules for every new statement. `terminateFieldWorker` takes a REQUIRED `appealHeardBy` input (AD8; update every G22 caller).
    `registerFieldWorker` takes `previousFieldWorkerId` (validated in the API, re-checked by the FK). Update the guard-order header. Domain
    `errors.ts`: the new classes (no `_rolled_back` classes - G25).
  - [ ] 3.5 `ending-appeal-{events,state,lock,project,supersede,commands,read}.ts` on 13.1d's request files (G13): `-lock` (`appealWorkerOf`,
    `lockEndingAppealRow`), `-project` and `-supersede` import NOTHING from `commands.ts` and are NOT re-exported by `index.ts` (TR17);
    `ending-appeal-commands.ts` = lodge (AD9's lodge order, its version guard, the one-per-ending constant, the in-lock hearer from AD17 - the
    command takes no `heardBy` input), refuse and withdraw (AD9's decide order, the lock order of TR5); the IST date bounds (AD7, the genesis
    event's IST date as the lower bound); every appeal event's key pinned (AD15); the list, eligible and per-worker reads in `-read.ts` (the name
    decrypt stays in the API, as 13.1d's); the `packages/events` registry entries and `field-worker-ending-appeal-registry-coverage.test.ts`. Extend
    `index.ts`'s barrel for `-events`, `-state`, `-commands`, `-read` only, and its header's "⛔ re-exported" list.
  - [ ] 3.6 `read.ts`: `getCurrentFieldWorkerEnding` / `getCurrentFieldWorkerEndingLocked` (AD17), `findEndedFieldWorkersByMobileIndex`,
    `getFieldWorkerMobileIndex`, `lockFieldWorkerForLink` (AD12), `listFieldWorkerLinkChain` (cap 10), `listAppealEligibleFieldWorkers` (AD13's join,
    `ended_on DESC, field_worker_id` cursor); `getFieldWorkerStateAt`'s header ("all EIGHT event types").
  - [ ] 3.7 Specs in `packages/domain/tests/integration/field-worker/`: `undo.spec.ts` (AC1-AC3, AC8), `ending-appeal.spec.ts` (AC5, AC6, AC17's
    domain legs and the matrix's live legs), `register-previous.spec.ts` (the read halves of AC9-AC10); `commands-guards.test.ts` (the undo's guard
    and full statement order; AD9's lodge and decide orders; the lock order); `state.test.ts` (Task 3.2's legs); the barrel leg (AC1 (h)). Extend
    `_fixtures.ts`: `FieldWorkerActKey` and `grantAuthorization`'s role union gain the four keys and `trustee_panel` (the file stays allowlisted by
    its exact path in `check.test.ts`); its cleanup deletes the appeal table and its streams before `field_workers` (G29). RED proof for each new
    guard (mutate, see the intended assertion fail, restore).

- [ ] **Task 4 - Contracts (AC: 1, 3, 5, 6, 9, 10, 13, 15)**
  - [ ] 4.1 `enums.ts`: the eighth event type (closing 13.1c C2 (iii) on landing), the appeal states / via / outcome / hearer tuples and the appeal event
    types (re-declared; the sync test in `packages/contracts/tests/field-workers.test.ts`). `dto.ts`: `UndoFieldWorkerEndingRequest`, the lodge (with
    `expected_ending_version`), decide and withdraw requests (AD7's bodies; dates as `z.string()`) and responses, the list, eligible and per-worker
    queries (each with `limit`) and pages, `RegisterFieldWorkerRequest` + `previous_endings_seen` / `link_to` (optional, the refine), the 409 details
    shape, `FieldWorkerLogItem` + `to_state`, `cause`, `appeal_id`, `previous_field_worker_id` (nullable), `FieldWorkerLogQuery` + `record`, and
    `state_event_version` on the worker read (`FieldWorkerIdentityResponse`) AND as a REQUIRED field of `FieldWorkerLifecycleResult` (G24, AD6);
    `FieldWorkerEndingAppeal`, the decide response `{ appeal, worker }`, the eligible item (AD13's fields incl. `ending_event_version`, `heard_by`);
    page defaults 20 / cap 25 through `clampedLimit` (export it or reuse it in place - G28). `packages/contracts/scripts/emit-openapi.ts`: register
    the seven new paths, the register route's new 409 / 422 and the log's `record` parameter BY HAND (`registry.registerPath`), and reword its
    "final in this version"; regenerate `openapi/v1.yaml`.
  - [ ] 4.2 New required fields break fixtures outside tsc ([[project_contracts_tests_outside_tsc]]) - grep the contracts and admin tests for
    `FieldWorkerLifecycleResult` / identity fixtures (the new required `state_event_version`).

- [ ] **Task 5 - The API (AC: 1-11, 13, 15, 17; I6-I8)**
  - [ ] 5.1 `gate.ts`: the lodge loader (AD17's current ending -> `heard_by` + district; a missing / foreign worker -> null) and
    `loadEndingAppealGate` beside `loadMoveRequestGate`; `apps/api/src/types.ts`: the stash fields. `undo-handlers.ts` (AD6), `ending-appeal-handlers.ts`
    (AD9's dispatcher on the `requireAnyAppealAccess` shape - G26 - incl. its no-hearer branch; the pre-reads, incl. the super admin `_as_panel`
    refusal and, for an allowed decision, AD5's number check; AD13's list, eligible and per-worker reads on G28's helpers, `limits.read`, the empty-page
    rule), `log-handlers.ts` (`record` + its own read check and BARE 403, AD12; annotate its header's RE-EXAMINE trigger: the worker stream gains
    only `cause` / `appeal_id` / `previous_field_worker_id`, the appeal lives on its own stream), `handlers.ts` register (AD11's `servicePool` audit
    line and the 409, AD12's `lockFieldWorkerForLink` re-check in the scope transaction), `lifecycle-handlers.ts` (terminate: `appealHeardBy` - AD8;
    TR16; EVERY act's 200 gains `state_event_version` from the domain result - G24); `routes.ts` (the static `ending-appeals` routes before `/:fieldWorkerId` - AD13); `errors.ts` + `field-worker-errors.test.ts`
    (every new code, and the `numberPreviouslyEndedError` factory); each appeal and undo handler sets `actor` from the authorization's key (AD9).
  - [ ] 5.2 Harness and fixtures (G29): HTTP legs use the harness's own `h.actor(p, 'trustee_panel', 'pariwar', p)` and `h.addGrant(userId, p,
    'pariwar_admin', 'pariwar', p)` for the dual-role officer - no new grant helper; `_registration-harness.ts` gains the act helpers (`undoEnding`,
    `lodgeAppeal`, `decideAppeal`, `withdrawAppeal`, `listAppeals`, `listEligible`) and its `cleanup()` deletes the appeal rows and their `events_log`
    streams before `field_workers`; `apps/api/tests/integration/_field-worker-fixture.ts` (NOT under `field-worker/`) gains only the DOMAIN
    authorization helpers (planting a legacy terminated event, AC5 (c)'s planted open row) - the `authorize(` fence allows only the two fixture
    files (13.1c G11). The jobs live tests `field-worker-move-request-escalation-live.test.ts` and `-notice-emails-live` extend their cleanup the
    same way. Specs in `apps/api/tests/integration/field-worker/`: `undo.spec.ts`, `ending-appeal.spec.ts`, `ending-appeal-reads.spec.ts` (AC15),
    `register-previous.spec.ts`, `terminate-hearer.spec.ts` (AC7), `log-link.spec.ts`; the route-table tests pin `limits.read` on every new GET;
    cross-Pariwar legs with REAL ids (AC5 (k), AC6 (l), AC10 (c), AC15 (d) (f)); pre-read refusals write no audit line (count `audit_log` rows for
    the locator, with a control); idempotency replays and per-id namespaces.
  - [ ] 5.3 Route review (13.2 C7): no door import, no re-export, no `requestContextStorage.run`, no `pariwarId =` writer; run the reach fence and
    `check.test.ts`. Never write the AT9 word (named in `lifecycle-handlers.ts`'s header) in a field-worker file.

- [ ] **Task 6 - The screens (AC: 12)**
  - [ ] 6.1 Hooks and client (`apps/admin/src/api/hooks.ts`, the lifecycle client): `useFieldWorkerAct`'s `setQueryData` copies
    `state_event_version` with `current_state` and `district` (G24); `useUndoFieldWorkerEnding` (on `ending_changed`: invalidate the IDENTITY query
    as well as the lists and the log), the appeal mutations (an allowed decision writes the 200's `worker` into the identity cache), the per-worker
    `useFieldWorkerEndingAppealsOf`, `useFieldWorkerEndingAppeals` and `useAppealEligibleFieldWorkers` (infinite; `gcTime: 0` where names are shown -
    [[project_query_gctime_blinds_removal_tests]]); the register mutation's 409 details; `fieldWorkerListIsStale` gains the new 409s that mean "the
    list moved" (`ending_changed`, `appeal_not_open`).
  - [ ] 6.2 `WorkerDetail.tsx` (`WorkerSummary` gains `state_event_version`; the worker panel shows its appeals - the per-worker read - and offers
    "Record an appeal" to a hear-key holder), `WorkerActions.tsx` (`ACTS_BY_STATE.terminated = ['undo']`, a `REASONS` entry; the End line; the undo
    confirm with its open-appeal line; the "Tell the worker." reminders - AD14), `derive.ts` (`'undo'` in `WorkerAct`; `fw.actions.noAccess.undo`
    for `actGuidance`'s 403; `'appeals'` in `Surface` / `NO_ACCESS_KEY`; `roleLabel` + `fw.role.trustee_panel`; `BY_CODE` rows for every new code),
    `WorkerHistory.tsx` (the label; "Linked to an earlier record" and its history), `RegisterFieldWorkerPage.tsx` (the shown line, the link choice, a
    new key on re-submit), `AppealsPage.tsx` + `AppealActions.tsx` (the list and "Record an appeal" from the eligible list), `FieldWorkerNav.tsx`
    (`'appeals'` in `FieldWorkerPage`), `router.tsx` (the appeals route) + NEW `apps/admin/src/routes/FieldWorkerAppealsRoute.tsx` (the session gate and `key={pariwarId}`,
    copied from `FieldWorkerMoveRequestsRoute.tsx`; no `login-next.ts` entry - no email links to it) and the module `index.ts` export, copy in
    `i18n-en.ts` (AD14); every undo / lodge / decide form keyed
    `key={fieldWorkerId}` (or the appeal id) so worker B never inherits worker A's form or retry key (13.1d CR48); `microcopy.yaml` entries only if
    `microcopy:check` demands them (file- and phrase-scoped, as 13.1c's).
  - [ ] 6.3 RTL tests `apps/admin/tests/field-worker-{undo,appeals,register-previous}.test.tsx`; update `field-worker-actions.test.tsx` (the End line,
    End-then-Undo in one panel), `field-worker-history.test.tsx`, `field-worker-derive.test.ts`, `field-worker-register-page.test.tsx` (the register
    flow) and `field-worker-lifecycle-client.test.ts` (the new client methods). Mind [[project_tanstack_onsettled_before_success]],
    [[project_tanstack_mutate_callbacks_latest_only]], [[project_jsdom_disabled_button_keeps_focus]].

- [ ] **Task 7 - Records and gate (AC: 13)** - Dev Agent Record, File List; `deferred-work.md` closures with commit ids (13.1c C2 (i)-(iii), 13.1d C3,
  R2-D1; CR9's correction-path half) - closed only when the code LANDS ([[feedback_closure_language_precision]]); 13.1a CR33's re-trigger and 13.1d
  CR31's trigger annotated as FIRED (not fixed - G27); `epics.md` BUILT note; ledger. **Passing means:** `DATABASE_URL=<story port>?sslmode=disable
  pnpm ci:local` on a FRESH container with every job green (count the jobs the script reports at the run - `scripts/ci-local.sh` and the GitHub
  workflow do not list the same number, so never carry a count from a record - plus Task 2.5's new one); any red is re-run alone and named against [[project_known_livedb_test_failures]],
  never called green; `pnpm microcopy:check` exits 0; the OpenAPI determinism check exits 0 with `openapi/v1.yaml` committed regenerated. A record
  states only what has run ([[feedback_record_unattested_no_backfill]]).

- [ ] **Task 8 - Browser pass (AC: 12)** - in the dev Mac's Chrome, per AC12's list; record what ran and what did not.

## Dev Notes

### Current state (what exists, what this story changes, what it must preserve)

- **`state.ts` / `events.ts` / `project.ts` / `commands.ts`** - seven events, `terminated` terminal (G1, G17). Changes: one event, one payload arm
  (before the table lookup), `reduce` passing the payload, the undo writer variable, the projector's undone-event check, `runLockedTransition`'s
  optional `resolveTarget`, an in-lock stream read, two exported writers over one module-private core, two command inputs, every act's result
  carrying the version and reason (AD2-AD5, AD8, AD12). Preserve: every
  existing arm and every two-argument caller's answer, the guard order (13.1 QE5), the lock order (row -> `events_log` -> row UPDATE, 13.1 I13), the
  human-only actor rule (QE7), 13.1d's `afterEnding` / `afterDirectMove` calls exactly where they are.
- **Migration `0201`'s guard function** - the LAST definition. Change only rule (t). Preserve (a), (b), (c), (d'), (e') and (f) byte-for-byte.
- **`handlers.ts` register** - change: the ended pre-check and the link, both inside `run` after the live pre-check and before `withCompensatingAudit`
  (the link re-check is a `FOR SHARE` read in the scope transaction, before the INSERT - AD12; the shown line's audit write is awaited before the
  409). Preserve `prepare`'s no-transaction rule (13.1 review R3), the I11 both-or-neither allocation, the
  201 shape (no code).
- **`lifecycle-handlers.ts`** - change: terminate gets one more input; every act's 200 gains `state_event_version`. Preserve the pre-read refusals
  and the CR12 calendar check.
- **`listFieldWorkerEvents` / `log-handlers.ts`** - change: the `record` parameter and the new item fields. Preserve: no decrypt, no audit line, the
  clamp, actors' CURRENT names.
- **Admin** - change: the acts, the copy, the register flow, a new page. Preserve: no client-side role gating; one identity fetch per open; per-attempt
  idempotency keys; 13.1c's stale handling (and its known R4-W1 shape - do not copy it into new code: `onStale` only while mounted).

### Traps (TR)

- **TR1 - `nextFieldWorkerState` without a payload returns `null` for the undo - only if the undo arm runs BEFORE the table `.find`.** Put the three
  documentation rows in `FIELD_WORKER_TRANSITIONS` and every two-argument call returns `pending_kyc` (G17 (a)). Every existing caller passes two
  arguments; the undo's pre-read tests `state === 'terminated'`; `reduce`, `foldFieldWorkerProjection` (its OWN call - G17 (g)) and the projector
  pass the payload. The table/reducer agreement test must not iterate `ending_undone` as if its target were constant.
- **TR2 - Copy the guard from `0201`, not `0200`.** `0200`'s body lacks rule (f) and the `approved_by_display` exclusion; replacing from it would
  silently drop 13.1a's guard. Diff the function text in the migration review.
- **TR3 - The 23505 on UPDATE.** Map `field_workers_pariwar_mobile_live_uq` by NAME (`uniqueViolationConstraint`), never any 23505; the stream-version
  23505 keeps its own mapping.
- **TR4 - IST dates from the DB.** `received_on`, `decided_on` and every test "today" ([[project_ist_vs_utc_test_date_window]]).
- **TR5 - Lock order worker -> appeal everywhere** - lodge, decide (both outcomes), withdraw, and the slip's supersede. Decide and withdraw are
  given an `appealId`, so the obvious code locks the appeal first - that deadlocks (ABBA) against the slip undo. Read the appeal's
  `field_worker_id` UNLOCKED (`appealWorkerOf`, the `moveRequestWorkerOf` pattern - the column is immutable), lock the worker, lock the appeal,
  re-verify the pair. Prove it with the Concurrency matrix's live legs in BOTH orders (13.1d CR27: a sequential leg proves only the state check).
- **TR6 - One transaction, equal `now()`.** Two events written in one transaction share `occurred_at`; order by `event_version`
  ([[project_db_clock_ordering_tests_tie]]).
- **TR7 - A savepoint rollback leaves nothing to assert.** "Nothing survived" after `ROLLBACK TO SAVEPOINT` cannot fail - assert the reason and a control
  ([[feedback_assertion_after_savepoint_rollback_is_vacuous]]).
- **TR8 - Idempotency namespaces** carry the worker or appeal id (13.1a TR6 - the keyed store keeps no body fingerprint).
- **TR9 - The register re-submit uses a NEW idempotency key** (the body changed). A 409 is never stored (G20), so a replayed key would simply run
  again - the new key is for clarity and for the audit trail, not a cache rule.
- **TR10 - Pinning keys (AD15) breaks fixtures** that sign an event with another key. `events.test.ts`'s `actAuth('x')` is the CR6 CONTROL for the
  `display_name` refusal: re-key it to each event's own pinned key (the control must still parse) and ADD a separate leg that `actAuth('x')` is refused
  for every event type - never invert the control (the `display_name` leg would then fail for the wrong key). Sweep `VALID` there and `state.test.ts`'s
  `AUTH` fixtures; grep `apps/jobs/tests` too (13.1b's live test builds worker events).
- **TR11 - `**` in a JSDoc can close it** ([[project_markdown_emphasis_closes_jsdoc]]). And never write the AT9 word in a field-worker file.
- **TR12 - The appeal table's GRANT** covers every column the projector's `.set()` writes (the 10.22 column-GRANT footgun, memory) - a live test of
  every write.
- **TR13 - The fence lives in `apps/api`'s unit suite** ([[project_source_fence_lives_in_api_unit_suite]]) - run it after the event-kind edits.
- **TR14 - `runLockedTransition` checks legality before the guard.** As built it throws `illegal_transition` for every undo (G17 (c)); the
  `resolveTarget` hook must REPLACE its legality step and its `to_state`, never run after them.
- **TR15 - The link re-check must lock.** A plain read lets an undo of the linked record and the registration deadlock (AD12); `FOR SHARE` before the
  INSERT, and AC2 (ii)'s RED proof.
- **TR16 - `scopeGrants` vs `authorizations`.** The record of who authorized is `request.authorizations[key]` (`types.ts` TR13). AD8 reads
  `scopeGrants` for one property (a `pariwar_admin` grant here); AD12 and AD13 check extra permissions with `rbac.hasPermission` on the loaded grants.
  None of them recomputes or replaces the snapshot. (Why two hear keys: G12, stated once there.)
- **TR17 - The barrel is `export *` (G23).** Anything exported from `commands.ts` is public, so the undo core and its stream read stay
  module-private and the allowed decision is a writer IN `commands.ts`. A file `commands.ts` imports (`ending-appeal-{lock,project,supersede}.ts`)
  must import nothing back from it - a runtime init cycle that typecheck cannot see ([[project_type_only_import_cycle_trap]]; 13.1d TR12). The
  barrel-keys leg (AC1 (h)) is the guard; a helper the appeal files need from `commands.ts` (`lockFieldWorkerRow`, `verifiedSnapshot`, `istToday`)
  may be exported only if it writes nothing (13.1d CR19), and the barrel's header names it.
- **TR18 - Read stored terminated payloads RAW.** `from_state` and `appeal_heard_by` of an existing terminated event are read from the JSON
  (AD17, AD3), never through a write schema - the fold rule (R4-10) and a legacy event without `appeal_heard_by` both forbid it. The ender is
  NOT in the JSON: it is the same row's `events_log.actor_id` column (AD17).
- **TR19 - A "no oracle" 403 that is not one (G27).** Never promise "no oracle" for a gate-hook 403 (CR31, inherited); a handler's OWN 403 that
  must not leak existence is a bare `ApiError(403)` with no `details` (AD12's `log?record=`).

### Carried to sibling stories (C) - WRITTEN to `deferred-work.md` ("Deferred from: story 13-1f-... (create-story, 2026-11-12)"). Build NONE.

- **C1 - Stories 13.8 / 13.5: credit for the window a worker was wrongly ended.** Panel note Q1; Row 52 (c). As built the as-of read says
  `terminated` for that window - not credited. The recorder reads the ruling first.
- **C2 - Story 13.1e: the undo and the appeal meet the 8-year scrub.** Its guard replacement must carry rule (t') forward (copy `0207`, not `0201`); it
  must not scrub a worker with an OPEN appeal; and a scrubbed record must not be undone (it adds the marker and narrows (t')).
- **C3 - Story 13.6: endings for conduct.** Whether an undo or an appeal reaches them, and who hears (`-454`, "does NOT cover"). ⚠ Its new reasons
  would also reach AD11's shown line, told to a second officer: whether a conduct reason is shown there is the Panel's when 13.6 adds them.
- **C4 - Notices of an undo or an appeal's outcome to the officers** (in-app; email would be a new 13.1g kind under ADR-0045). Not built. Trigger: an
  officer asks, or the Panel's answer to note Q3 needs one.
- **C5 - Story 13.3: a worker's own view** of their appeal and their link (no login today).
- **C6 - Row `13-1h`: a returning worker found by PAN** (Q-2, BigDev 2026-11-16 - the ASKs section). Same mobile OR same PAN finds the old
  record; the Aadhaar last 4 is shown as a matches / differs check, never a finder; both REQUIRED at registration. It owes: two new Tier-1 fields
  on `field_workers` (the PAN with a keyed blind index; the Aadhaar LAST 4 only - ⛔ the full number, Aadhaar Act s.8A(4)(b)); the register form
  and contract; its own decision SUPERSEDING 13.1 QE8 ("no document, PAN or bank detail is captured") by name; a Panel question (a PAN match
  shows an ending's date and reason to a second officer - wider than `-454` Q3 A's "the number"); counsel's footing and notice for the two
  fields (roster Row 19 precedent; the recruitment form promises a name and a mobile only); AD11's ended read and AD12's `link_to` re-check
  widened to a PAN match. Needs 13.1f LANDED. Until it lands, a worker who changed numbers is not linked.
- **C7 - Story 13.1b: a code text after an undo.** A worker activated and ended before the sweep sent their code is settled `skipped_not_active`
  (final, one row per worker); after an undo nothing re-sends it, and the officer reads the code by hand (G21). Trigger: an officer reports a restored
  worker who never got their code, or 13.1b's send row is reopened for another reason.

### Closes when this story LANDS (annotated then, never before)

13.1c C2 (i) (AD5), (ii) (AD8), (iii) (Task 4.1); 13.1d C3 (AD6 - "says so"); R2-D1 (AD15); 13.1c CR9's correction-path half (an undo and a new
ending mend a wrong `ended_on`; its bound stays 13.1e's).

### Testing standards

Live specs on a FRESH container per story ([[project_live_db_test_gotchas]]); RED proof by single mutation for every new guard, trigger rule and CHECK;
absence assertions on every 200 / 409 body that could carry PII; audit-row counts with a control; `waitForBlockedBy` for the race legs; RTL for
behaviour and a real-browser pass for focus and layout ([[project_jsdom_disabled_button_keeps_focus]]).

### Project Structure Notes

Follows 13.1c / 13.1d exactly: domain under `packages/domain/src/field-worker/`, one migration under `packages/domain/migrations/` with its journal
entry, contracts under `packages/contracts/src/field-workers/`, API under `apps/api/src/modules/field-worker/`, admin under
`apps/admin/src/modules/field-workers/`. Two variances, both recorded in `-464`: AD3's payload-dependent reducer arm, and AD9's two hear keys behind
one dispatcher (the hook takes a fixed key; the dispatcher itself copies `requireAnyAppealAccess` - G26).

### File checklist - every file this story touches (build order; AD = why, AC = proof, test = where)

| # | File | Change | AD | AC | Test |
|---|---|---|---|---|---|
| 1 | `packages/domain/src/rbac/permissions.ts`, `roles.ts` | four keys, v63; bundles; the `_as_panel` comment | AD10 | 11 | `tests/rbac/permissions.test.ts`, `roles.test.ts` |
| 2 | `packages/domain/migrations/0207_field-worker-ending-undo-appeal-link.sql` + `meta/_journal.json` | (t'); the link column / FK / CHECK; the appeal table and its triggers | AD4, AD7, AD12 | 4, 10, 16 | `schema-trigger.spec.ts`, the appeal table's spec, policy-regression |
| 3 | `packages/domain/src/schema/field_workers.ts`, `field_worker_ending_appeals.ts`, `index.ts`; `policies/` file + `policies/index.ts`; `ids/index.ts` | drizzle column / table; RLS; branded id | AD7, AD12 | 13, 16 | `field-workers-policy-regression.spec.ts`, `composite-fk.spec.ts` |
| 4 | `packages/domain/src/field-worker/events.ts` | undo payload + superRefines; `appeal_heard_by` optional; link field; key pins | AD2, AD8, AD15 | 1, 11 | `tests/field-worker/events.test.ts` |
| 5 | `.../field-worker/state.ts` | the undo arm (fold-only schema); `reduce` + the fold's own call pass the payload | AD3 | 1 (f) | `state.test.ts` |
| 6 | `.../field-worker/project.ts` | undo variable; undone-event check; 23505 by name; genesis link column | AD3-AD5, AD12 | 1, 2, 4 | `undo.spec.ts`, `commands-guards.test.ts` |
| 7 | `.../field-worker/commands.ts` | `resolveTarget`; private core + stream read; `undoFieldWorkerEnding`, `allowFieldWorkerEndingAppeal`; terminate / register inputs; result `reasonCode` | AD2, AD6, AD8, AD9 | 1-3, 6-8 | `undo.spec.ts`, `commands-guards.test.ts` |
| 8 | `.../field-worker/ending-appeal-{events,state,lock,project,supersede,commands,read}.ts` | the appeal stream, table writers, lodge / refuse / withdraw, reads | AD7, AD9, AD13 | 5, 6, 8, 15-17 | `ending-appeal.spec.ts` |
| 9 | `.../field-worker/read.ts` | AD17's current-ending read; ended-by-number; mobile index; link lock; chain; eligible | AD5, AD11-AD13, AD17 | 2, 9, 10, 15 | `register-previous.spec.ts`, `ending-appeal.spec.ts` |
| 10 | `.../field-worker/errors.ts`, `index.ts` (barrel + header) | new classes; barrel lines for the public appeal files | AD2, TR17 | 1 (h) | barrel leg |
| 11 | `packages/events/src/registry.ts` + coverage tests | six event types; "Terminal;" reworded | AD2, AD7 | 13 | `field-worker-registry-coverage.test.ts`, `field-worker-ending-appeal-registry-coverage.test.ts` |
| 12 | `scripts/field-worker-ending-appeal-invariant` + `ci.yml`, `scripts/ci-local.sh`, `package.json` | projector-only writers gate | AD7 | 13 | the job itself |
| 13 | `packages/contracts/src/field-workers/enums.ts`, `dto.ts`; `packages/contracts/scripts/emit-openapi.ts`; `openapi/v1.yaml` | tuples, bodies, results (+ `state_event_version`), queries; the seven paths by hand | AD6, AD7, AD11-AD13 | 1, 5, 6, 9, 10, 13, 15 | `packages/contracts/tests/field-workers.test.ts`, the determinism check |
| 14 | `apps/api/src/types.ts`, `modules/field-worker/gate.ts` | stash fields; the two loaders | AD9, AD13 | 5, 6, 15 | `ending-appeal.spec.ts` |
| 15 | `apps/api/src/modules/field-worker/undo-handlers.ts`, `ending-appeal-handlers.ts`, `routes.ts`, `errors.ts` | the routes, the dispatcher, the pre-reads, `limits.read` | AD6, AD9, AD13 | 1-3, 5, 6, 15, 17 | `undo.spec.ts`, `ending-appeal*.spec.ts`, `field-worker-errors.test.ts`, the route-table tests |
| 16 | `.../field-worker/handlers.ts` (register), `lifecycle-handlers.ts`, `log-handlers.ts` | shown number + link; `appealHeardBy` + `state_event_version`; `record` | AD6, AD8, AD11, AD12 | 7, 9, 10 | `register-previous.spec.ts`, `terminate-hearer.spec.ts`, `log-link.spec.ts` |
| 17 | `apps/api/tests/integration/field-worker/_registration-harness.ts`, `apps/api/tests/integration/_field-worker-fixture.ts`, domain `_fixtures.ts`, the two jobs live tests, `field-worker-notice-email-no-decision.test.ts` | helpers, cleanups, the name fence | G22, G29 | 13 | - |
| 18 | `apps/admin/src/api/hooks.ts` + the lifecycle client | version in the cache; new hooks | AD6 | 12 | `field-worker-lifecycle-client.test.ts` |
| 19 | `apps/admin/src/modules/field-workers/{WorkerDetail,WorkerActions,WorkerHistory,RegisterFieldWorkerPage,AppealsPage,AppealActions,FieldWorkerNav}.tsx`, `derive.ts`, `i18n-en.ts`; `apps/admin/src/router.tsx`, NEW `apps/admin/src/routes/FieldWorkerAppealsRoute.tsx`, the module `index.ts` | acts, copy, pages, labels, the route's session gate | AD14 | 12 | `field-worker-{undo,appeals,register-previous}.test.tsx`, `-actions`, `-history`, `-derive`, `-register-page` |

### References

`.decision-log.md` `-454`, `-455`, `-453`, `-458`, `-459`, `-463` · `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-11-07-story-13-1c-field-worker-lifecycle.md`
· `_bmad-output/planning-artifacts/trustee-panel-routing-note-TEMPLATE.md` · `docs/launch-gate-inventory/inventory-roster.md` Rows 48, 50, 51 ·
`_bmad-output/implementation-artifacts/13-1c-field-worker-moves-suspension-and-termination.md`, `13-1d-field-worker-move-requests-and-notices.md` ·
`_bmad-output/implementation-artifacts/deferred-work.md` (13.1c C2, R2-D1, CR9; 13.1d C3) · `packages/domain/migrations/0200_field-workers.sql`,
`0201_field-workers-list-index.sql`, `0205_field-worker-move-requests.sql` · `packages/domain/src/field-worker/{state,events,commands,project,read,move-request-supersede}.ts`
· `apps/api/src/modules/field-worker/{handlers,lifecycle-handlers,log-handlers,routes}.ts` · `apps/admin/src/modules/field-workers/{WorkerActions,WorkerHistory,RegisterFieldWorkerPage}.tsx`, `i18n-en.ts`
· `packages/domain/src/rbac/{permissions,roles}.ts` · PRD FR-85.

## Dev Agent Record

### Agent Model Used

(the dev-story session fills this)

### Debug Log References

### Completion Notes List

- 2026-11-12 - create-story: ultimate context engine analysis completed - comprehensive developer guide created. Q-1..Q-3 OPEN; nothing committed;
  no code before Task 0.5.
- 2026-11-13 - validate (v1.1): four fresh-context read-only verifiers (code claims, governance, adversarial design, structure); every finding applied
  at BigDev's "all". Q-1..Q-4 OPEN; nothing committed; no code before Task 0.5.
- 2026-11-14 - validate (v1.2): four fresh read-only verifiers (domain + DB, API + RBAC + admin, governance, adversarial design); 6 critical, 26
  should-fix, 13 nits, 5 structural - all applied at BigDev's "all". Q-1..Q-4 still OPEN; nothing committed; no code before Task 0.5.
- 2026-11-16 - validate (v1.3): an in-session re-trace at `5ede00c4` (still `origin/main`); 1 critical, 6 should-fix, the records and a
  compressed change log - all applied at BigDev's "all". Q-1..Q-4 still OPEN; nothing committed; no code before Task 0.5.
- 2026-11-16 - Task 0.2 (v1.4): BigDev answered Q-1..Q-4 (Q-1, Q-3, Q-4 A; Q-2 split to the new row `13-1h`); propagated. Nothing committed; next
  Task 0.0 on BigDev's word, then 0.1, 0.3-0.6.

### File List

## Change Log

| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-11-12 | Created by `bmad-create-story 13.1f` on its own worktree at `5ede00c4`: AD1-AD16, Q-1..Q-3 open, the Panel note's five questions planned (Task 0.6), Row 52 planned (Task 0.4), C1-C6 carried. Row `backlog` -> `ready-for-dev`. |
| v1.1 | 2026-11-13 | `bmad-create-story validate 13.1f` (4 read-only verifiers; their main claims re-checked in the repo; BigDev: "all"). Code still at `5ede00c4`. Detail below. |
| v1.2 | 2026-11-14 | `bmad-create-story validate 13.1f` a second time (4 fresh read-only verifiers: domain + DB, API + RBAC + admin, governance, adversarial design; every critical claim re-checked in the repo; BigDev: "all", 50 items). Code still at `5ede00c4`. Detail below. |
| v1.3 | 2026-11-16 | `bmad-create-story validate 13.1f` a third time (an in-session re-trace at `5ede00c4`, still `origin/main` after `git fetch`; `-464`, `0207`, Row 52 still free; BigDev: "all", 9 items). Detail below. |
| v1.4 | 2026-11-16 | Task 0.2: BigDev's answers recorded verbatim (the ASKs section) - Q-1, Q-3, Q-4 A; Q-2: the mobile-matched link stays here, the PAN / Aadhaar-last-4 identification goes to the new row `13-1h` (C6; mobile OR PAN finds, last 4 a check, both required). PROPOSED tags dropped (NUMBERS, Names, AD10, AD12); section 0 rows 9 and 10, AD1, AD16, I10, Task 0.3, Task 0.4 (d), C6 updated. Row stays `ready-for-dev`. |

- **v1.1 detail** (the full list is in ledger `2026-11-13a`). Blocking: the undo could not run through the table, the runner, the reducer
  or the projector (G17); one shared hear key could not record that the Panel acted (G12 - now Q-4); a trustee had no screen to lodge from (the
  eligible list); a Panel-heard appeal could have no lawful decider (Row 52 (d), note Q4 (d)); the `-210` / `-454` wording. Also the undo /
  linked-registration deadlock (`FOR SHARE`), the lodge's version guard, note Q6 and Q7, the `log?record=` gate, C7, code facts, AC legs and
  governance; the Panel note grew from five questions to seven.
- **v1.2 detail** (the full list is in ledger `2026-11-14a`). Critical: the `export *` barrel (two exported writers over a private core), the act
  results' missing version (G24), the lodge gate's no-hearer branch, the fold's own legality call and the optional `appeal_heard_by`, the decide /
  withdraw lock order, and `-464` records rather than amends `-454`. Also governance wording, AD17, AC16, AC17, the response bodies, G25-G29, the
  read plan and the three build tables.
- **v1.3 detail** (ledger `2026-11-16a`). Critical: (1) the ender is the terminated event's `events_log.actor_id` COLUMN, not a payload key -
  AD7, AD9, AD17 and TR18 corrected; `ended_by_user_id` and `lodged_by_user_id` NOT NULL (a NULL passed the ender CHECK silently), AC16's 23502
  leg. Should-fix: (2) the actor kind - `'trustee'` under `_as_panel`, `'operator'` otherwise, a mismatch refused (AD9, AC17, Task 5.1; the claims
  appeal precedent); (3) `-464` dated the day it is COMMITTED and the Panel note the day it is written, not 2026-11-12 (NUMBERS, Names, the Panel
  note section, Task 0.3); (4) the admin route wrapper `FieldWorkerAppealsRoute.tsx` and the module export (Names, Task 6.2, File checklist 19);
  (5) the reverse undo x registration race (Concurrency matrix, AC2 (iii)); (6) the shown-number 409 is an API `ApiError` factory carrying
  `details` (Errors table); (7) the static `ending-appeals` routes before `/:fieldWorkerId` (AD13, Task 5.1). Records: (8) v1.3, four ledger
  letters at Task 0.0; (9) this change log compressed - the earlier full lists stay in their ledger entries.
