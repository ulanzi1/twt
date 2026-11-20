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

STATUS: in-progress (v1.5, 2026-11-17 - the Panel RULED its note, `2026-11-17-465`: as recommended for all, except Q6 = B - built here, AD6 /
 AC8). Earlier: ready-for-dev (v1.4, 2026-11-16 - validated three times; Q-1..Q-4 ANSWERED by BigDev 2026-11-16: Q-1, Q-3, Q-4 A; Q-2 - the
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

Status: review

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
Pariwar Admin ended you - and if your appeal is allowed you are restored the same way. Teachers who joined with your code while you were ended are
held and credited to you once the ending is undone (the Panel's Q1 B, `-465` - built by 13.8 / 13.5; no signup credits anyone yet). If the
Trustee Panel hears your appeal and refuses it, only a new decision of the Panel can restore you (Q6 B). If you leave and come back with the
same phone number, you are registered again with a new code, the officer may link your old record to the new one, and your old code never credits you
again."**

*RULED 2026-11-17* (`-465`, the Panel note's "Our reading" for every question except Q6, which is B - the sentence above now carries it; the
paragraph below is kept as it stood): *PROPOSED, not ruled* (the Panel note, Task 0.6): one appeal per ending, no time limit, who hears when the officer who ended you is the only Pariwar
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
| 10a | What the link lets an officer read of the earlier record | **Yours** - AD12 gates `log?record=` on the officer's OWN read authority over the earlier record, so what the link lets an officer READ is only what they could already read; ⚠ that an earlier ended record exists, and its id (`previous_field_worker_id` in the new worker's own log), reaches every officer who may read THAT log (code review round 2, R2A-5) - never the earlier record's date, reason or events; nothing beyond Q3 A's date and reason reaches a second officer |
| 10b | A Pariwar Admin undoes "as a slip" an ending the Panel has heard and REFUSED | **The Panel's** - it touches the Panel's own ruling. Built AS RULED (Q1 A: "may undo any ending made by mistake"); note Q6 asks whether to refuse it (non-blocking). **RULED 2026-11-17, `-465` Q6 B: refused** - "once you have refused, only a new decision of yours restores the worker"; built (AD6). A refusal heard by the Pariwar Admin is NOT covered (the slip undo stays); how a new Panel decision is carried out is not built (C8) |
| 10c | An appeal is ALLOWED while the worker's number belongs to a new registration | **The Panel's** - what an allowed worker receives. Built: the decision is refused and the appeal stays open until that registration is ended (no ending reason describes this - a cost); note Q7 |
| 11 | The undo's mechanics, the appeal record's shape, the guard migration, the register flow, the key names, and the copy that says nothing of who is paid or told | **Yours** (AD) - no change to what a person is owed or told beyond what is ruled. Copy about who is paid or told is NOT yours: AD14 carries none beyond the rulings and the row-7 reminder |
| 11a | A legacy terminated event without `appeal_heard_by` | **Yours** - no production stream exists (Row 48 open); read as `trustee_panel` |
| 12 | Whether an undo or an appeal reaches an ending for CONDUCT | **13.6's** (`-454`) - no conduct reason exists yet; carried (C3) |

**RULED 2026-11-17 (`-465`): Q1 B, Q2 A, Q3 A / A, Q4 A x4, Q5 A, Q6 B, Q7 A - every answer matches the build except Q6 (built as B - AD6).**
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
| Errors (new codes) | `field_worker.number_previously_ended` (409, with details), `field_worker.link_invalid` (422), `field_worker.number_registered_again` (409), `field_worker.ending_changed` (409), `field_worker.appeal_open` (409), `field_worker.appeal_already_decided` (409), `field_worker.appeal_not_open` (409), `field_worker.appeal_wrong_hearer` (409 - a super admin on a Panel-heard appeal; other wrong hearers get the gate's 403 first), `field_worker.appeal_decider_is_ender` (409), `field_worker.appeal_date_invalid` (422), `field_worker.appeal_refused_by_panel` (409 - `-465` Q6 B) |
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
  A: "may undo any ending made by mistake") - **EXCEPT (`-465` Q6 B, 2026-11-17; superseding this AD's former "including after the Panel has
  REFUSED an appeal on that ending") an ending whose appeal the PANEL heard and refused**: when the worker's CURRENT ending (AD17) has an appeal
  with `heard_by = 'trustee_panel'` and `state = 'refused'`, the slip undo is refused 409 `field_worker.appeal_refused_by_panel` - on the
  pre-read (no audit line) and under the worker lock (after the version check, before the stream fold; the intent line and its `_rolled_back`
  twin). It binds every actor (a super admin too). A refused appeal heard by the PARIWAR ADMIN does not bar the slip undo (`-465` "does NOT
  cover"). `allowFieldWorkerEndingAppeal` is unaffected (its appeal is open, never refused). No route carries out "a new decision of yours"
  (C8). A SLIP's undo (`cause = 'mistake'`) SUPERSEDES the worker's open appeal in the same transaction (AD9); an appeal's own undo
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
  decided_on }`. A superseded appeal's `decided_on` is the undo transaction's IST date (SQL), clamped to the locked appeal's `received_on` if a post-midnight lodge acquired the worker lock before a pre-midnight undo (review R7). Dates are `z.string()` in the contract (never a contract regex, which would answer 400 first); 422
  `field_worker.appeal_date_invalid` is answered in TWO places that share one rule (code review round 2, R2C-3 - this AMENDS the first version's "the
  command answers it, one place"): a PURE shape failure (not a real calendar date) on the handler's PRE-READ, before the audit wrapper - no intent
  line and no `_rolled_back` twin (I7; the CR12 precedent on terminate's `ended_on`) - and the IST BOUNDS (in the future, before the registration day,
  before the lodge) by the COMMAND under the lock, with the pair. The command still judges the shape as well: the bounds keep ONE judge, and the
  pre-read only declines to spend an audit pair on a request that can never be attempted. Only a
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
  awaited, `responseStatus` 200 through `audit.withCompensatingAudit` (ADR-0030's gate refuses a direct `writeAuditEntry`; was 409 - the variance ACCEPTED by BigDev 2026-11-17, *"Accept the 200 variance"*, v1.7), locator `field_worker/<newest ended id>`, hash `{ ended ids }`) BEFORE answering - if the write fails, the answer
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
  So what the link lets an officer READ of the earlier record is only what they could already read; "the history reads as one person's" (Q2 B) for every officer who may read both. ⚠ What it does NOT hide (code review round 2, R2A-5): `previous_field_worker_id` sits in the NEW worker's own log, so that an earlier ended record exists, and its id, reaches every officer who may read that log - never the earlier record's date, reason or events, which stay behind `record=`.
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
  + the worker's NAME decrypted behind ONE audit line per page (`field_worker.ending_appeal_list_viewed`), ordered `created_at DESC, appeal_id DESC` (the id DESCENDING too: keyset, index and tests agree; AD11's shown-number read is the one list that is ascending on the id).
  **The trustee-only rule is uniform** ([[feedback_withholding_must_be_uniform]]): a reader whose verified `read_ending_appeals` authorization has
  role `trustee_panel` sees only appeals heard by the Panel - on the list AND the per-worker read. **The eligible list** `GET
  .../field-workers/ending-appeals/eligible?district=&cursor=&limit=` (`read_ending_appeals`, the same district rule, cap and default) returns
  this Pariwar's `terminated` workers whose current ending (AD17: joined on `appeal.ending_event_version = fw.state_event_version`) has no open or
  refused appeal and whose `appeal_heard_by` matches a hear key the reader holds - `rbac.hasPermission` per key on the loaded grants with locator
  `{ dimension: 'pariwar', value: pariwarId }`, and `_as_panel` COUNTS ONLY from a non-`global` grant (a super admin derives it but can never
  lodge with it - AD9) - ordered `ended_on DESC, field_worker_id DESC`. Each item is `{ field_worker_id, display_name, district, ended_on, reason_code,
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
  appeal will close as no longer needed."; the `appeal_refused_by_panel` line (`-465` Q6 B): "The Trustee Panel heard this worker's appeal and
  refused it. Only a new decision of the Panel can restore them." Reminders (note Q3 (A) / (b) as built - the `-459` Q3 A / `-461` CR41 A shape): after an End, "Tell the
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
| Undo, a slip (`POST .../:id/undo-ending`) | `undo_ending` (`district` chain) | missing -> 403; not `terminated` -> `illegal_transition`; version -> `ending_changed`; a Panel-refused appeal on this ending -> `appeal_refused_by_panel` (Q6 B); number live -> `number_registered_again` | worker; then (after the transition) the open appeal | terminated -> version -> Panel-refused appeal (Q6 B) -> (3d) target -> stream fold = `from_state`; UPDATE 23505 on the live index -> `number_registered_again` | `field_worker.ending_undone` (`mistake`); `field_worker_ending_appeal.superseded` if one was open | `field_worker.ending_undone` (covers the supersede) | 200 `FieldWorkerLifecycleResult` + `state_event_version` |
| Lodge (`POST .../:id/ending-appeals`) | the key matching AD17's `heard_by`; either key when not terminated (AD9) | missing -> 403; not `terminated` -> `illegal_transition`; version -> `ending_changed`; super admin `_as_panel` -> `appeal_wrong_hearer`; open -> `appeal_open`; refused -> `appeal_already_decided`; a malformed `received_on` (not a real calendar date) -> 422 `appeal_date_invalid` (R2C-3; the IST bounds stay the command's) | worker | AD9's lodge order (1)-(6); the partial unique's 23505 BY NAME -> `appeal_open` | `field_worker_ending_appeal.lodged` | `field_worker_ending_appeal.lodged` | 201 `FieldWorkerEndingAppeal` |
| Decide allowed (`POST .../ending-appeals/:appealId/decide`) | the key matching the appeal's `heard_by` | missing -> 403; super admin `_as_panel` -> `appeal_wrong_hearer`; not open -> `appeal_not_open`; ender -> `appeal_decider_is_ender`; number live -> `number_registered_again`; a malformed `decided_on` -> 422 `appeal_date_invalid` (R2C-3) | `appealWorkerOf` (unlocked), worker, appeal | worker = appeal's worker -> key vs `heard_by` -> open -> ender -> the dates' IST bounds -> worker terminated at `ending_event_version` (else 500) -> the core's checks | `field_worker.ending_undone` (`appeal_allowed`) + `field_worker_ending_appeal.allowed` | ONE `field_worker_ending_appeal.allowed` line; both events carry its `audit_id` | 200 `{ appeal, worker }` |
| Decide refused (same route) | as above | as above, minus the number check | as above | worker = appeal's worker -> key -> open -> ender -> the dates' IST bounds | `field_worker_ending_appeal.refused` | `.refused` | 200 `{ appeal, worker: null }` |
| Withdraw (`POST .../ending-appeals/:appealId/withdraw`) | as above | missing -> 403; wrong hearer; not open; ender; a malformed `decided_on` -> 422 `appeal_date_invalid` (R2C-3) | as above | as decide refused | `field_worker_ending_appeal.withdrawn` | `.withdrawn` | 200 `FieldWorkerEndingAppeal` |
| Terminate (13.1c, changed) | `terminate` (as built) | as built | as built | as built | `field_worker.terminated` + `appeal_heard_by` | as built | 200 + `state_event_version` |
| Register, shown number (`POST .../field-workers`) | `register` (as built) | live holder -> `mobile_already_registered` FIRST; ended holders and no `previous_endings_seen` -> 409 `number_previously_ended` + details | - | - | none | `field_worker.previous_endings_shown` on `servicePool`, awaited, BEFORE the 409 (the one audited pre-read) | 409 |
| Register, link (same route, `link_to`) | as above | `link_to` without `previous_endings_seen` -> 400 (validation); the linked row terminated, in this Pariwar and number-matched, else 422 `link_invalid` - raised in the scope transaction BEFORE the audit wrapper opens (AD12), so NO intent line and NO `_rolled_back` twin (R2C-4: this row used to list it as a LOCKED check) | `lockFieldWorkerForLink` (`FOR SHARE`) before the INSERT - a concurrent undo of that record finishes first | - (the pre-read column above is the only check; the table's own FK and `..._previous_not_self` CHECK are the backstop) | `field_worker.registered` + `previous_field_worker_id` | as built | 201 (no code) |

## Concurrency matrix - each pair, what serialises it, what happens, the leg that proves it

| Pair | Serialised by | Outcome | Proof |
|---|---|---|---|
| slip undo x decide-allowed | the worker lock (both take it first) | the first wins; the other: `appeal_not_open` (undo first - the appeal was superseded) or `illegal_transition` (allow first) | live, BOTH orders, `waitForBlockedBy` (13.1d CR27: a sequential "second answer" leg proves the state check, not the lock) |
| slip undo x decide-refused / withdraw | worker lock | undo first: the decision -> `appeal_not_open`; decision first: a PANEL-heard refusal -> the undo `appeal_refused_by_panel` (`-465` Q6 B); a Pariwar-Admin-heard refusal or a withdrawal -> the undo succeeds | live, both orders |
| decide x decide; decide x withdraw | worker lock, then appeal lock | the second -> `appeal_not_open` | live, both orders |
| lodge x lodge | worker lock (the partial unique is the backstop) | the second -> `appeal_open` | live + AC5 (c)'s planted row |
| undo x registration of the same number | the live index entry | the undo's UPDATE waits, then 23505 BY NAME -> `number_registered_again` | AC2 (i) |
| registration x undo of the same number (the reverse order) | the live index entry | the undo's UPDATE holds the entry; the registration's INSERT waits, then 23505 on the live index -> `mobile_already_registered` (the genesis mapping, unchanged) | AC2 (iii) |
| undo x registration with `link_to` = that row | the `FOR SHARE` vs `FOR UPDATE` on the old row | the undo commits; the registration -> `link_invalid`; never 40P01 | AC2 (ii) + its RED proof |
| undo x re-end (another officer) | worker lock | the later act sees the new version: a stale undo or lodge -> `ending_changed` | AC3 |
| End x a restore, from a stale screen (review R2A-2) | worker lock; the version the screen showed | a worker ended and then restored (a slip undo or an allowed appeal) is NOT ended again by a screen that predates the ending: the End -> `state_changed`; the current version ends them | `undo.spec.ts` R2A-2 (both restores), `lifecycle.spec.ts` R2A-2 (HTTP) |
| suspend x End, BOTH from the same screen (review R2A-2; R2B-5) | worker lock | EXACTLY ONE fulfils - before R2A-2 the End always did, running after the other: End first -> the suspension `illegal_transition`; the suspension first -> the End `state_changed`, the worker keeps the suspension. A move or a reactivate takes the same lock and meets the same version check; they are NOT raced separately | FORCED, both orders: `stream-concurrency.spec.ts` (a1) End holds / (a2) suspension holds; (a) is a probabilistic smoke that counts nothing; `terminate-race.spec.ts` R2A-2 (HTTP, under the lock, with the `_rolled_back` twin) |
| lodge x undo | worker lock | lodge first: the undo supersedes it; undo first: the lodge -> `illegal_transition` | live, both orders |

## Errors and their HTTP mapping - only what this story ADDS or makes reachable

| Class / condition | When | HTTP + code |
|---|---|---|
| `FieldWorkerIllegalTransitionError` | undo a worker who is not `terminated`; lodge for a worker who is not `terminated` (incl. after an ALLOWED appeal) (pre-read: no audit line; under the lock: the `_rolled_back` twin) | 409 `field_worker.illegal_transition` (existing) |
| `FieldWorkerEndingChangedError` (NEW) | undo or lodge: `expected_ending_version` != the worker's `state_event_version` (undone and ended again since) | 409 `field_worker.ending_changed` |
| `FieldWorkerStateChangedError` (NEW, review R2A-2) | End (`terminate`): the body's REQUIRED `expected_state_event_version` != the worker's `state_event_version` - judged on the pre-read (no audit line) and again under the lock (the `_rolled_back` twin), AFTER legality (`terminated` -> `illegal_transition`) and the target (3d), BEFORE the reason and the dates. Why: `terminated` is no longer final, so a stale or repeated End would end a worker a restore has just returned | 409 `field_worker.state_changed` (NEW; the admin reads it as "status changed since you opened them") |
| `FieldWorkerNumberRegisteredAgainError` (NEW) | undo, or an allowed decision: a LIVE row holds the number (pre-read; and the 23505 BY NAME under the lock - AD5) | 409 `field_worker.number_registered_again` |
| `numberPreviouslyEndedError(previousEndings)` (NEW - an `ApiError` factory in `apps/api/src/modules/field-worker/errors.ts`, beside `codeNotAvailableError`: the handler's OWN row, since a domain error carries no HTTP and so no `details`) | register: ended records hold the number and `previous_endings_seen` is not `true` (writes ONE audit line - AD11) | 409 `field_worker.number_previously_ended`, `details.previous_endings[]` |
| `FieldWorkerLinkInvalidError` (NEW) | `link_to` is not a terminated, number-matched record of this Pariwar (incl. one undone meanwhile - AD12's `FOR SHARE`) | 422 `field_worker.link_invalid` |
| `FieldWorkerAppealOpenError` (NEW) | lodge while one is open (pre-read; under the lock; the partial unique's 23505 BY NAME is a backstop - lodges queue on the worker lock) | 409 `field_worker.appeal_open` |
| `FieldWorkerAppealAlreadyDecidedError` (NEW) | lodge on an ending whose appeal was REFUSED (an allowed one undid the ending - `illegal_transition` answers first) (AD7) | 409 `field_worker.appeal_already_decided` |
| `FieldWorkerAppealNotOpenError` (NEW) | decide / withdraw a closed appeal | 409 `field_worker.appeal_not_open` |
| `FieldWorkerAppealWrongHearerError` (NEW) | the authorization's key does not match the appeal's `heard_by`, or an `_as_panel` authorization from a `global` grant (AD9) - through the API, a super admin on a Panel-heard appeal; any other wrong hearer gets the gate's 403 first | 409 `field_worker.appeal_wrong_hearer` |
| `FieldWorkerAppealDeciderIsEnderError` (NEW) | decide / withdraw by the officer who ended the worker | 409 `field_worker.appeal_decider_is_ender` |
| `FieldWorkerAppealRefusedByPanelError` (NEW - `-465` Q6 B) | a slip undo (cause `mistake`) when the worker's CURRENT ending has a REFUSED appeal heard by the Panel (pre-read: no audit line; under the lock: the `_rolled_back` twin) | 409 `field_worker.appeal_refused_by_panel` |
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
`superseded` in the same transaction (event `field_worker_ending_appeal.superseded`, signed with `field_worker.undo_ending`; `decided_on` the undo transaction's
IST date, clamped not to precede the locked appeal's `received_on` across midnight — review R7). A worker whose open move request the ending superseded: after the undo the request is still `superseded` and a new request can be opened.
A slip undo after the Panel REFUSED an appeal on that ending -> 409 `appeal_refused_by_panel` (`-465` Q6 B), no event, no audit line on the
pre-read (and, from the lock - a refusal committed between the pre-read and the lock - the intent line and its `_rolled_back` twin), the worker
stays ended; controls: after a refusal heard by the PARIWAR ADMIN the slip undo succeeds, and after a Panel-heard WITHDRAWN appeal it succeeds;
a super admin's slip undo after a Panel refusal is refused too. An `appeal_allowed` undo supersedes nothing (its
appeal becomes `allowed`, no `superseded` event). The superseded row's `decided_by_user_id` is the undoer.

**AC9 - The shown number (AD11).** Registering a number that belongs to one or more ENDED workers of this Pariwar -> 409 `number_previously_ended`
with each `{ field_worker_id, ended_on, reason_code }` (`ended_on DESC, field_worker_id`, at most 5 - a leg with two endings on one day) and ONE `field_worker.previous_endings_shown` audit line
(`responseStatus` 200 - the variance BigDev accepted 2026-11-17, v1.7); re-submitted with `previous_endings_seen: true` under a new idempotency key -> 201. (a) An ended worker of ANOTHER district of
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

- [x] **Task 1 - Keys (AC: 11; I10)** - in the SAME commit as the first code that uses them (Task 3.1's undo key list).
  - [x] 1.1 `permissions.ts`: four keys, `PERMISSION_CATALOG_VERSION = 63`, the changelog comment (REUSE CHECK: not `field_worker.terminate` - the
    opposite act; not `member.restore_terminated` / `member.decide_moderation_appeal` - members; not `field_worker.read_log` - the worker stream, not
    the appeal stream). `roles.ts`: constants and bundle entries per AD10 (`trustee_panel`'s bundle gains `_as_panel` and `read_ending_appeals`; the
    `_as_panel` comment in 10.22's words).
  - [x] 1.2 `tests/rbac/permissions.test.ts` (`toBe(63)`, `toBe(94)`), `tests/rbac/roles.test.ts`, `tests/field-worker/events.test.ts` catalog fixtures.

- [x] **Task 2 - Migration `0207` (AC: 4, 5, 10, 13, 16; I1)** - hand-authored ([[project_live_db_test_gotchas]]: never regenerate; a `when` after 0206's).
  - [x] 2.1 The guard function `CREATE OR REPLACE`d from `0201`'s body with (t') and its own message (AD4); a header naming 13.1e's duty to carry it (C2).
    Diff the function text against `0201`'s in review (TR2).
  - [x] 2.2 `field_workers.previous_field_worker_id uuid NULL`, CHECK `<> field_worker_id`, the composite FK (AD12); the drizzle column in
    `schema/field_workers.ts`. Nothing else on `field_workers` changes. Update `field-workers-policy-regression.spec.ts` (the column list; the
    constraint list gains exactly the CHECK and the FK) and `composite-fk.spec.ts` if it pins the table's FKs.
  - [x] 2.3 `field_worker_ending_appeals` (AD7) on `0205`'s shape: table (incl. `ended_by_user_id` and `lodged_by_user_id` NOT NULL, `decided_by_user_id`), the four AD7 CHECKs + the
    state / hearer / via CHECKs, GRANT, FORCE RLS + three policies, the projector-only guard (transitions `open -> final` only, the four final states
    frozen, the immutable columns), the no-delete and no-truncate triggers, the partial unique, the composite FK; `schema/field_worker_ending_appeals.ts`
    + `schema/index.ts`; the journal entry; the `policies/` RLS file AND its entry in `policies/index.ts`; its own policy-regression pins.
  - [x] 2.4 Live specs on a FRESH container: `schema-trigger.spec.ts` (AC4's six refusals with their messages + the legal shape; AC10 (b)); the appeal
    table's AC16 legs (guard per transition and per final state, immutables, CHECKs by name, DELETE / TRUNCATE as OWNER, FK 23503 by name) and RLS.
    The RED proof of AC4 (as AC4 words it) and of each AC16 CHECK / guard rule.
  - [x] 2.5 `scripts/field-worker-ending-appeal-invariant` on 13.1d's move-request gate's model (projector-only writers of the appeal table), wired into
    `ci.yml`, `ci-local.sh` and `package.json` (one more job).

- [x] **Task 3 - The domain (AC: 1-11, 16, 17; I1-I5)**
  - [x] 3.1 `events.ts`: `FieldWorkerEndingUndonePayloadSchema` (with AD2's two superRefines - the suspension reason, and cause <-> key),
    `FIELD_WORKER_UNDO_PERMISSION_KEYS` (three entries: the undo key and both hear keys), `appeal_heard_by` on `terminated` as `.optional()` in the
    SCHEMA (AD8 - required by the command's input, not the schema), the optional `previous_field_worker_id` on `registered`, every key pinned (AD15);
    `FIELD_WORKER_EVENT_TYPES` + the schema map (`events.test.ts` `toHaveLength(8)`); the `packages/events` registry entry (and reword
    `field_worker.terminated`'s "Terminal;") and `field-worker-registry-coverage.test.ts`. `ids/index.ts`: the branded `FieldWorkerEndingAppealId`.
  - [x] 3.2 `state.ts` per AD3: the undo arm BEFORE the table lookup, parsing the fold-only schema; `FIELD_WORKER_UNDO_TRANSITIONS` (doc-only, outside
    `FIELD_WORKER_TRANSITIONS`); `reduce` passes `event.payload`; `foldFieldWorkerProjection`'s OWN call passes `row.payload` (G17 (g)); the fold
    applies the undo; the header. `state.test.ts`: the `legal` count, the literal table and "nothing leaves terminated" stay UNCHANGED (G17 (f)) -
    ADD the payload legs (each valid payload -> its target; none / bad -> `null`), the agreement test treating `ending_undone` as payload-dependent
    (TR1), the fold legs (per from-state, two endings and one undo), AC1 (f)'s unit legs.
  - [x] 3.3 `project.ts`: the undo variable for `ending_undone` only, `SET LOCAL` as the writer variable is, nested INSIDE its `try / finally`; AD3's
    check of the undone event (`from_state` read raw); `ended_on` null, reason restored; the 23505 on `FIELD_WORKER_MOBILE_LIVE_CONSTRAINT` mapped
    in the UPDATE catch (AD5, TR3); `projectFieldWorkerGenesis`'s INSERT writes `previous_field_worker_id` from the payload.
  - [x] 3.4 `commands.ts` (AD2, TR14, TR17): `runLockedTransition`'s optional `resolveTarget`; the PRIVATE `readFieldWorkerStreamLocked` and
    `undoEndingLocked`; the two exported writers `undoFieldWorkerEnding` (guard (0): actor, `field_worker.undo_ending`, `expectedEndingVersion`;
    under the lock: terminated, the version, (3d) `assertLockedTarget`, the stream fold; after the transition, `ending-appeal-supersede.ts` for an
    open appeal) and `allowFieldWorkerEndingAppeal` (worker lock -> `ending-appeal-lock.ts` -> AD9's decide checks -> the core -> `.allowed` through
    `ending-appeal-project.ts`). Both return `reasonCode` and `endedOn: null` with the transition result (G24). `istToday` and `verifiedSnapshot`
    (its event union widened to the appeal events - never a bare `string`, 13.1d CR19) exported for the appeal files - neither writes, so the
    barrel's header lists them beside `lockFieldWorkerRow` (the CR19 rule). The full statement-order pin in `commands-guards.test.ts` (AD2's list)
    with `classify` rules for every new statement. `terminateFieldWorker` takes a REQUIRED `appealHeardBy` input (AD8; update every G22 caller).
    `registerFieldWorker` takes `previousFieldWorkerId` (validated in the API, re-checked by the FK). Update the guard-order header. Domain
    `errors.ts`: the new classes (no `_rolled_back` classes - G25).
  - [x] 3.4a **`-465` Q6 B (v1.5):** `undoFieldWorkerEnding` refuses `FieldWorkerAppealRefusedByPanelError` under the worker lock, after the
    version check and before the stream fold, when the current ending (`ending_event_version = state_event_version`) has an appeal with
    `heard_by = 'trustee_panel'` AND `state = 'refused'`; a domain read for the API pre-read (`hasPanelRefusedAppealOnEnding` in
    `ending-appeal-read.ts`); the statement-order pin gains its query (classify rule); `undo.spec.ts` legs per AC8 (Panel refusal refused;
    Pariwar-Admin refusal and Panel withdrawal controls succeed; super admin refused) and the Concurrency matrix's both-orders leg.
  - [x] 3.5 `ending-appeal-{events,state,lock,project,supersede,commands,read}.ts` on 13.1d's request files (G13): `-lock` (`appealWorkerOf`,
    `lockEndingAppealRow`), `-project` and `-supersede` import NOTHING from `commands.ts` and are NOT re-exported by `index.ts` (TR17);
    `ending-appeal-commands.ts` = lodge (AD9's lodge order, its version guard, the one-per-ending constant, the in-lock hearer from AD17 - the
    command takes no `heardBy` input), refuse and withdraw (AD9's decide order, the lock order of TR5); the IST date bounds (AD7, the genesis
    event's IST date as the lower bound); every appeal event's key pinned (AD15); the list, eligible and per-worker reads in `-read.ts` (the name
    decrypt stays in the API, as 13.1d's); the `packages/events` registry entries and `field-worker-ending-appeal-registry-coverage.test.ts`. Extend
    `index.ts`'s barrel for `-events`, `-state`, `-commands`, `-read` only, and its header's "⛔ re-exported" list.
  - [x] 3.6 `read.ts`: `getCurrentFieldWorkerEnding` / `getCurrentFieldWorkerEndingLocked` (AD17), `findEndedFieldWorkersByMobileIndex`,
    `getFieldWorkerMobileIndex`, `lockFieldWorkerForLink` (AD12), `listFieldWorkerLinkChain` (cap 10), `listAppealEligibleFieldWorkers` (AD13's join,
    `ended_on DESC, field_worker_id` cursor); `getFieldWorkerStateAt`'s header ("all EIGHT event types").
  - [x] 3.7 Specs in `packages/domain/tests/integration/field-worker/`: `undo.spec.ts` (AC1-AC3, AC8), `ending-appeal.spec.ts` (AC5, AC6, AC17's
    domain legs and the matrix's live legs), `register-previous.spec.ts` (the read halves of AC9-AC10); `commands-guards.test.ts` (the undo's guard
    and full statement order; AD9's lodge and decide orders; the lock order); `state.test.ts` (Task 3.2's legs); the barrel leg (AC1 (h)). Extend
    `_fixtures.ts`: `FieldWorkerActKey` and `grantAuthorization`'s role union gain the four keys and `trustee_panel` (the file stays allowlisted by
    its exact path in `check.test.ts`); its cleanup deletes the appeal table and its streams before `field_workers` (G29). RED proof for each new
    guard (mutate, see the intended assertion fail, restore).
    ⚠ **Code review round 2, chunk B (R2B-17), 2026-11-19 - what this task's record does NOT attest.** The task was checked `[x]` with this last sentence
    unmet in the record: no RED proof is recorded for the domain command guards of the undo (terminated, version, target), the lodge order (1)-(6),
    the decide and ender rules, the hearer check, the 23505 mapping or the cause-key refinements. Proofs ARE recorded for Q6 B's refusal, AC2 (ii)'s
    `FOR SHARE`, Task 2.4's legs and, in round 2, guard (0), the terminate version guard and the new read / cursor legs. The gap is DISCLOSED, not
    backfilled: whether those mutations were run during the build is unknown, and a proof run now would be a new dated entry, never an edit of this one.

- [x] **Task 4 - Contracts (AC: 1, 3, 5, 6, 9, 10, 13, 15)**
  - [x] 4.1 `enums.ts`: the eighth event type (closing 13.1c C2 (iii) on landing), the appeal states / via / outcome / hearer tuples and the appeal event
    types (re-declared; the sync test in `packages/contracts/tests/field-workers.test.ts`). `dto.ts`: `UndoFieldWorkerEndingRequest`, the lodge (with
    `expected_ending_version`), decide and withdraw requests (AD7's bodies; dates as `z.string()`) and responses, the list, eligible and per-worker
    queries (each with `limit`) and pages, `RegisterFieldWorkerRequest` + `previous_endings_seen` / `link_to` (optional, the refine), the 409 details
    shape, `FieldWorkerLogItem` + `to_state`, `cause`, `appeal_id`, `previous_field_worker_id` (nullable), `FieldWorkerLogQuery` + `record`, and
    `state_event_version` on the worker read (`FieldWorkerIdentityResponse`) AND as a REQUIRED field of `FieldWorkerLifecycleResult` (G24, AD6);
    `FieldWorkerEndingAppeal`, the decide response `{ appeal, worker }`, the eligible item (AD13's fields incl. `ending_event_version`, `heard_by`);
    page defaults 20 / cap 25 through `clampedLimit` (export it or reuse it in place - G28). `packages/contracts/scripts/emit-openapi.ts`: register
    the seven new paths, the register route's new 409 / 422 and the log's `record` parameter BY HAND (`registry.registerPath`), and reword its
    "final in this version"; regenerate `openapi/v1.yaml`.
  - [x] 4.2 New required fields break fixtures outside tsc ([[project_contracts_tests_outside_tsc]]) - grep the contracts and admin tests for
    `FieldWorkerLifecycleResult` / identity fixtures (the new required `state_event_version`).

- [x] **Task 5 - The API (AC: 1-11, 13, 15, 17; I6-I8)**
  - [x] 5.1 `gate.ts`: the lodge loader (AD17's current ending -> `heard_by` + district; a missing / foreign worker -> null) and
    `loadEndingAppealGate` beside `loadMoveRequestGate`; `apps/api/src/types.ts`: the stash fields. `undo-handlers.ts` (AD6), `ending-appeal-handlers.ts`
    (AD9's dispatcher on the `requireAnyAppealAccess` shape - G26 - incl. its no-hearer branch; the pre-reads, incl. the super admin `_as_panel`
    refusal and, for an allowed decision, AD5's number check; AD13's list, eligible and per-worker reads on G28's helpers, `limits.read`, the empty-page
    rule), `log-handlers.ts` (`record` + its own read check and BARE 403, AD12; annotate its header's RE-EXAMINE trigger: the worker stream gains
    only `cause` / `appeal_id` / `previous_field_worker_id`, the appeal lives on its own stream), `handlers.ts` register (AD11's `servicePool` audit
    line and the 409, AD12's `lockFieldWorkerForLink` re-check in the scope transaction), `lifecycle-handlers.ts` (terminate: `appealHeardBy` - AD8;
    TR16; EVERY act's 200 gains `state_event_version` from the domain result - G24); `routes.ts` (the static `ending-appeals` routes before `/:fieldWorkerId` - AD13); `errors.ts` + `field-worker-errors.test.ts`
    (every new code, and the `numberPreviouslyEndedError` factory); each appeal and undo handler sets `actor` from the authorization's key (AD9).
    The undo handler's pre-read refuses `appeal_refused_by_panel` with NO audit line (`-465` Q6 B; AC8's HTTP legs in `undo.spec.ts`).
    ⚠ **Dated note, 2026-11-20 (code review round 2, chunk C, R2C-15 - the text above is NOT edited).** This task was checked `[x]` with its tests
    only partly written: `field-worker-errors.test.ts` was untouched (no new code, `numberPreviouslyEndedError` or `state_changed` was pinned - a
    dropped row would have answered 500 with nothing red), the lodge / decide pre-reads' own refusals (`ending_changed`, `appeal_already_decided`,
    `appeal_not_open`) had no HTTP leg, and the three reads' defaults, cap, cursors and `no-store` were unproved. Those legs were written in round 2
    (R2C-9, R2C-10), RED-proved - see "Round 2, chunk C - patch resolution".
  - [x] 5.2 Harness and fixtures (G29): HTTP legs use the harness's own `h.actor(p, 'trustee_panel', 'pariwar', p)` and `h.addGrant(userId, p,
    'pariwar_admin', 'pariwar', p)` for the dual-role officer - no new grant helper; `_registration-harness.ts` gains the act helpers (`undoEnding`,
    `lodgeAppeal`, `decideAppeal`, `withdrawAppeal`, `listAppeals`, `listEligible`) and its `cleanup()` deletes the appeal rows and their `events_log`
    streams before `field_workers`; `apps/api/tests/integration/_field-worker-fixture.ts` (NOT under `field-worker/`) gains only the DOMAIN
    authorization helpers (planting a legacy terminated event, AC5 (c)'s planted open row) - the `authorize(` fence allows only the two fixture
    files (13.1c G11). The jobs live tests `field-worker-move-request-escalation-live.test.ts` and `-notice-emails-live` extend their cleanup the
    same way. Specs in `apps/api/tests/integration/field-worker/`: `undo.spec.ts`, `ending-appeal.spec.ts`, `ending-appeal-reads.spec.ts` (AC15),
    `register-previous.spec.ts`, `terminate-hearer.spec.ts` (AC7), `log-link.spec.ts`; the route-table tests pin `limits.read` on every new GET;
    cross-Pariwar legs with REAL ids (AC5 (k), AC6 (l), AC10 (c), AC15 (d) (f)); pre-read refusals write no audit line (count `audit_log` rows for
    the locator, with a control); idempotency replays and per-id namespaces.
    ⚠ **Dated note, 2026-11-20 (code review round 2, chunk C, R2C-15 - the text above is NOT edited): the folding was a DEVIATION the record never
    called one.** This task names six API specs and two fixture helpers. As BUILT: `undo-appeal.spec.ts` holds the undo, the lodge / decide /
    withdraw, the hearer, the shown number's happy path, the link and `log?record=` legs (it stands in for `undo.spec.ts`, `terminate-hearer.spec.ts`
    and `log-link.spec.ts`); `ending-appeal-race.spec.ts` holds the Concurrency matrix; `ending-appeal.spec.ts` was NEVER an API file - its legs are
    the DOMAIN spec of that name. `register-previous.spec.ts` (R2C-11) and `ending-appeal-reads.spec.ts` (R2C-10) exist only since round 2. The two
    fixture helpers (a planted legacy terminated event; AC5 (c)'s planted open row) do NOT exist in `_field-worker-fixture.ts`: the planted legs live in
    `packages/domain/tests/integration/field-worker/ending-appeal.spec.ts` (AC7's legacy leg `plantLegacyEnding`, and AC5 (c)'s backstop through the
    projector). Of the cross-Pariwar legs "with REAL ids", AC5 (k), AC6 (l) and AC15 (d) were already in `undo-appeal.spec.ts`; AC10 (c) (another
    Pariwar's real worker as `log?record=`) and AC15 (f) (as the per-worker read) were NOT until R2C-5.
  - [x] 5.3 Route review (13.2 C7): no door import, no re-export, no `requestContextStorage.run`, no `pariwarId =` writer; run the reach fence and
    `check.test.ts`. Never write the AT9 word (named in `lifecycle-handlers.ts`'s header) in a field-worker file.

- [x] **Task 6 - The screens (AC: 12)**
  - [x] 6.1 Hooks and client (`apps/admin/src/api/hooks.ts`, the lifecycle client): `useFieldWorkerAct`'s `setQueryData` copies
    `state_event_version` with `current_state` and `district` (G24); `useUndoFieldWorkerEnding` (on `ending_changed`: invalidate the IDENTITY query
    as well as the lists and the log), the appeal mutations (an allowed decision writes the 200's `worker` into the identity cache), the per-worker
    `useFieldWorkerEndingAppealsOf`, `useFieldWorkerEndingAppeals` and `useAppealEligibleFieldWorkers` (infinite; `gcTime: 0` where names are shown -
    [[project_query_gctime_blinds_removal_tests]]); the register mutation's 409 details; `fieldWorkerListIsStale` gains the new 409s that mean "the
    list moved" (`ending_changed`, `appeal_not_open`).
  - [x] 6.2 `WorkerDetail.tsx` (`WorkerSummary` gains `state_event_version`; the worker panel shows its appeals - the per-worker read - and offers
    "Record an appeal" to a hear-key holder), `WorkerActions.tsx` (`ACTS_BY_STATE.terminated = ['undo']`, a `REASONS` entry; the End line; the undo
    confirm with its open-appeal line; the "Tell the worker." reminders - AD14), `derive.ts` (`'undo'` in `WorkerAct`; `fw.actions.noAccess.undo`
    for `actGuidance`'s 403; `'appeals'` in `Surface` / `NO_ACCESS_KEY`; `roleLabel` + `fw.role.trustee_panel`; `BY_CODE` rows for every new code,
    incl. `appeal_refused_by_panel` with AD14's line - `-465` Q6 B),
    `WorkerHistory.tsx` (the label; "Linked to an earlier record" and its history), `RegisterFieldWorkerPage.tsx` (the shown line, the link choice, a
    new key on re-submit), `AppealsPage.tsx` + `AppealActions.tsx` (the list and "Record an appeal" from the eligible list), `FieldWorkerNav.tsx`
    (`'appeals'` in `FieldWorkerPage`), `router.tsx` (the appeals route) + NEW `apps/admin/src/routes/FieldWorkerAppealsRoute.tsx` (the session gate and `key={pariwarId}`,
    copied from `FieldWorkerMoveRequestsRoute.tsx`; no `login-next.ts` entry - no email links to it) and the module `index.ts` export, copy in
    `i18n-en.ts` (AD14); every undo / lodge / decide form keyed
    `key={fieldWorkerId}` (or the appeal id) so worker B never inherits worker A's form or retry key (13.1d CR48); `microcopy.yaml` entries only if
    `microcopy:check` demands them (file- and phrase-scoped, as 13.1c's).
    ⚠ **Dated note, 2026-11-20 (code review round 2, chunk D, R2D-5 - the text above is NOT edited).** This task says Find "offers 'Record an
    appeal' to a hear-key holder". As BUILT it offers it to every officer who can open the worker, and the server's 403 decides - the module's
    convention (AD8: no client-side role gating; the admin app has no read of an officer's keys), restated in the headers of `AppealActions.tsx`,
    `LodgeAppealForm.tsx` and `WorkerAppeals.tsx`. The clause is therefore met by the SERVER, not the client. What round 2 changed is what that 403
    SAYS: the read page's "Choose a district you manage, or ask a Pariwar Admin" sent a Pariwar Admin to a Pariwar Admin, so an appeal act now
    names who hears THIS appeal (`appealGuidance`; an appeal's and an eligible candidate's `heard_by`), and Find - which does not know - says
    something true of both hearers.
  - [x] 6.3 RTL tests `apps/admin/tests/field-worker-{undo,appeals,register-previous}.test.tsx`; update `field-worker-actions.test.tsx` (the End line,
    End-then-Undo in one panel), `field-worker-history.test.tsx`, `field-worker-derive.test.ts`, `field-worker-register-page.test.tsx` (the register
    flow) and `field-worker-lifecycle-client.test.ts` (the new client methods). Mind [[project_tanstack_onsettled_before_success]],
    [[project_tanstack_mutate_callbacks_latest_only]], [[project_jsdom_disabled_button_keeps_focus]].
    ⚠ **Dated note, 2026-11-20 (code review round 2, chunk D, R2D-17 - the text above is NOT edited): the folding was a DEVIATION the record never
    called one.** This task names `field-worker-{undo,appeals,register-previous}.test.tsx`, `field-worker-history.test.tsx` and
    `field-worker-register-page.test.tsx`, and "the new client methods" in `field-worker-lifecycle-client.test.ts`. Until round 2 the work lived in
    `field-worker-undo.test.tsx` (the undo, the register flow, the Appeals page's happy path, the history) and `field-worker-review-regressions.test.tsx`
    (R1-R6); the client file had only terminate's new version, and no test ran a new client function over a stubbed `fetch`. Round 2 added
    `field-worker-appeals.test.tsx` and `field-worker-register-previous.test.tsx` (both named here) and the wire tests in the client file.
    `field-worker-history.test.tsx` and `field-worker-register-page.test.tsx` were never created: the history's undo label, the linked earlier record
    and its two-step panel are in `field-worker-undo.test.tsx` and `field-worker-review-regressions.test.tsx` (R4); the register flow is there and
    in `field-worker-register-previous.test.tsx`.

- [x] **Task 7 - Records and gate (AC: 13)** (2026-11-17: ci:local 40/40 on a fresh container at `877c6ef2`; microcopy and the OpenAPI determinism check pass; CR31 / CR33 annotated FIRED; `epics.md` BUILT note; the closures wait for landing, as the task says) - Dev Agent Record, File List; `deferred-work.md` closures with commit ids (13.1c C2 (i)-(iii), 13.1d C3,
  R2-D1; CR9's correction-path half) - closed only when the code LANDS ([[feedback_closure_language_precision]]); 13.1a CR33's re-trigger and 13.1d
  CR31's trigger annotated as FIRED (not fixed - G27); `epics.md` BUILT note; ledger. **Passing means:** `DATABASE_URL=<story port>?sslmode=disable
  pnpm ci:local` on a FRESH container with every job green (count the jobs the script reports at the run - `scripts/ci-local.sh` and the GitHub
  workflow do not list the same number, so never carry a count from a record - plus Task 2.5's new one); any red is re-run alone and named against [[project_known_livedb_test_failures]],
  never called green; `pnpm microcopy:check` exits 0; the OpenAPI determinism check exits 0 with `openapi/v1.yaml` committed regenerated. A record
  states only what has run ([[feedback_record_unattested_no_backfill]]).

- [x] **Task 8 - Browser pass (AC: 12)** - in the dev Mac's Chrome, per AC12's list; record what ran and what did not.

### Review Findings

Review dated 2026-11-17, using `bmad-code-review`: full branch at `7b45a0da` against the pinned `5ede00c4`, in this story's worktree.
Blind Hunter, Edge Case Hunter and Acceptance Auditor completed; findings deduplicated and checked against the implementation and specification.
**Initial triage: 7 patch findings (all P2), 0 decision-needed, 0 deferred, 2 dismissed.** BigDev selected option 1, apply every patch; all seven repairs are implemented. Validation and the final status are recorded below.

- [x] [Review][Patch][P2][R1] Bind the shown-number response and acknowledgment to the submitted mobile [apps/admin/src/modules/field-workers/RegisterFieldWorkerPage.tsx:88]. Submit number A, edit the still-editable mobile to B while the request is pending, then receive A's `number_previously_ended` response: the handler unconditionally installs A's endings beside B. The next submission sends `previous_endings_seen: true` for B without showing B's own endings; choosing A's link instead produces an avoidable `link_invalid`. Violates AD11 / AC12. Guard against a changed submitted number or hold edits during the request, and retain a regression test. Reproduced with RTL: the second request contained B and `previous_endings_seen: true` after only A's list was shown. Source: edge + auditor.

- [x] [Review][Patch][P2][R2] Let District Admins select their district on Appeals [apps/admin/src/api/hooks.ts:3325]. The list hook accepts no district and always requests a Pariwar-wide list; the page has no district selector. A District-Admin-only user therefore always receives the server's correctly enforced 403, despite holding `read_ending_appeals` in their own district. Add the district choice and carry it through the list/eligible query arguments and query keys, following the existing list-page pattern. Violates AD10 / AD13 / AC15(a). The live API test confirms that the same District Admin succeeds with a district and is refused without one. Source: blind + auditor.

- [x] [Review][Patch][P2][R3] Expose pagination for eligible appeal candidates [apps/admin/src/modules/field-workers/AppealsPage.tsx:107]. The eligible hook returns an infinite query and a next cursor, but the page never calls `eligible.fetchNextPage()` or renders a continuation control. With more than 20 eligible workers, later candidates cannot be reached; Trustee Panel holders also lack the Find permission, so this blocks their only lodging path for those workers. Violates AD13 / AC12. Reproduced with RTL using 20 candidates plus a non-null next cursor: only one request, no continuation action, and worker 21 unreachable. Source: blind + edge + auditor.

- [x] [Review][Patch][P2][R4] Allow linked history navigation beyond the first earlier record [apps/admin/src/modules/field-workers/WorkerHistory.tsx:151]. The `record === undefined` condition suppresses the link inside every earlier record. For C -> B -> A, C can open B, but B cannot offer A even though its registration payload carries that link and the server supports up to ten hops. Preserve the original worker as the authorization anchor while offering successive readable links within the server's depth cap. Violates AD12 / AC10(c) and Q2 B's one-person history intent. Reproduced with RTL: B's returned genesis points to A, but no link to A or A request exists. Source: blind + edge + auditor.

- [x] [Review][Patch][P2][R5] Deliver the specified per-worker appeal surface in Find [apps/admin/src/modules/field-workers/WorkerDetail.tsx:126]. Task 6.2 is checked complete, but the worker panel does not display its appeal records or offer the specified lodging form. The only consumer of `useFieldWorkerEndingAppealsOf` is the undo warning in `WorkerActions`; it neither displays those records nor offers lodging. Add the per-worker read and lodging interaction with the existing server authorization/error handling and worker-specific form state. Violates AD13 and Task 6.2 / AC12. Source: auditor.

- [x] [Review][Patch][P2][R6] Resolve the appeal-warning check before permitting Undo confirmation [apps/admin/src/modules/field-workers/WorkerActions.tsx:166]. Opening Undo starts the appeal read, but `ready` treats Undo as immediately confirmable and ignores pending/failed appeal reads. An officer can confirm before learning that the action closes an open appeal, and a failed read silently leaves the warning absent. Wait for the relevant result, surface a failed check with recovery, and deliver the conditional warning before enabling confirmation. Violates AD14 / AC12's open-appeal confirmation requirement. Reproduced with RTL: with the appeal read unresolved, Confirm is enabled and calls `undoFieldWorkerEnding` while the warning is absent. Confirm already has `aria-describedby` pointing to the intro; this finding concerns the missing information before confirmation, not an absent description relationship. Source: auditor, verified and refined during triage.

- [x] [Review][Patch][P2][R7] Keep a superseded appeal's date valid when transactions straddle IST midnight [packages/domain/src/field-worker/ending-appeal-supersede.ts:33]. `now()` is the undo transaction's start, not the time it acquires the worker lock. If that transaction starts before midnight, and a lodge started after midnight acquires the worker lock first and records `received_on` on the new day, the undo can then restore the worker but attempts to supersede the appeal with the previous day's `decided_on`. Constraint `field_worker_ending_appeals_decided_after_received` raises 23514; the public undo throws `FieldWorkerAppealPersistError`, making the API fail with 500 and roll back an otherwise valid undo. Derive a supersede date consistent with the locked appeal and the date backstop, preserving event clock/order discipline. Violates AC8 / AC17's lodge-before-undo case and the date consistency invariant. Reproduced through public `undoFieldWorkerEnding` against the live DB, substituting only the supersede clock SELECT with the previous IST day and asserting the exact CHECK name. This is a simulated clock boundary, not an observed wall-clock midnight race. Source: edge, verified by the primary reviewer.

**Review validation.** Existing focused suites: 117 admin tests (undo, actions, derive), 21 ending-appeal invariant tests, 54 live domain tests (undo, appeal, previous registration, appeal RLS), and 31 live API tests (undo/appeal HTTP and the 14 concurrency legs): **223 passed**. Five temporary reproductions also passed: four RTL cases (R1, R3, R4, R6) and the live simulated-clock case (R7). The live checks used the existing story DB on port 5484; no migration was rerun. This review did not rerun all of `ci:local` or perform a screen-reader/browser pass. Temporary repository tests were removed; copies remain in `/private/tmp/twt-13-1f-{mobile-review-repro.test.tsx,navigation-review-repro.test.tsx,undo-warning-repro.test.tsx,midnight-review-repro.spec.ts}`.

**Initial load-bearing invariant lens (before the repairs below).** Untouched family 7 is omitted.

| Family | Review verdict |
|---|---|
| 1 — State machine / guards | Covered-by-test: `state.test.ts`, `undo.spec.ts`, `ending-appeal.spec.ts` exercise restoration, folds and final-state guards. |
| 2 — Concurrency / idempotency | **REAL GAP R7** at the midnight boundary. Other tested interleaves and replay paths are covered by `ending-appeal-race.spec.ts` and `undo-appeal.spec.ts`. |
| 3 — Tenant / actor boundaries | Covered-by-construction: shared `verifiedSnapshot` binds actor, Pariwar, key and district; scoped lookups include Pariwar. Covered-by-test: real foreign-id API legs and domain actor/key guards. |
| 4 — Consumer correlation | Covered-by-construction: strict event payloads carry worker/ending/appeal correlation identifiers. Event-level audit-id wording is qualified below. |
| 5 — DB backstops | Covered-by-test: appeal policy regression, AC16 CHECK/FK/guard/owner-delete legs and schema-trigger undo legs. R7's date CHECK correctly rejects the inconsistent write. |
| 6 — Projection / snapshot discipline | Covered-by-construction: explicitly selected/mapped response fields and the hearer fixed at ending; covered-by-test: undo restoration and legacy-hearer cases. |
| 8 — Audit / attribution | Covered-by-construction: compensating audit encloses commands and COMMIT; an allowed decision shares its audit id across the two projection writes. Covered-by-test: API audit-count controls. |
| 9 — Deliberate bypasses | Covered-by-construction: linked-history cross-district behavior is documented; shown-number disclosure across districts is explicit in AD11. |
| 10 — Closure honesty | **REAL GAP R5:** Task 6.2 is checked complete while its Find appeal surface is absent. The development record otherwise discloses the link-lock RED proof's limited outcome rather than claiming the predicted deadlock was reproduced. |
| 11 — Policy meaning | Covered-by-construction: the story states the worker/member meaning and the Panel's Q6 B effect; `acceptsNewAttributions` is unchanged. |
| 12 — Ownership | **REAL GAP R1:** the browser acknowledgment can be attached to a different number. Server-side link and appeal-worker scope/identity checks are otherwise validated under locks. |
| 13 — Semantic accessibility | **REAL GAP R6:** the conditional appeal-closure information can be missing when the action is confirmed. HTML controls have real handlers; the React Native-specific container/value cases are not constructible on these surfaces. Runtime screen-reader announcement was not verified. |

**Dismissed during triage.** (1) The absence of a reconsideration route after a Panel refusal is explicitly carried to C8, not an omitted route in this build. (2) AC6(a) / I7 say both events carry `audit_id`, but the detailed payload definitions and the existing `events_log` schema omit that field: the implementation and its test share the id across the projection rows. This specification wording conflict is disclosed here; event-level audit-id coverage is not claimed, and no new event-log schema requirement is inferred from it.


#### Patch resolution — 2026-11-17

All seven repairs are confined to this story's worktree; no commit or push was requested. The original findings and initial invariant verdicts above are kept as the review record.

| Finding | Implemented repair | Regression evidence |
|---|---|---|
| R1 | The response checks the submitted mobile against a synchronously updated current-mobile ref before installing a prior-ending list. | `field-worker-review-regressions.test.tsx`: delayed A response cannot acknowledge B; B must show its own list; three submissions have distinct keys. |
| R2 | Appeals uses the shared district picker; both list hooks carry the district in the request and in distinct cache keys, including a separate null/all-districts value. | Same file: recover from all-districts 403, read Patna, switch to Gaya, then return to the denied all-districts view without stale rows. |
| R3 | Eligible candidates have a continuation control, cursor/district propagation, a live count announcement and guarded focus after the last page. | Same file: load worker 21, announce the additional worker and lodge their appeal. |
| R4 | Earlier records expose their own links recursively, keeping the original worker as the authorization anchor and stopping at ten hops. | Same file: traverse all ten links and verify every request retains the original worker id; no eleventh link is offered. |
| R5 | Find renders the per-worker appeal records and a shared `LodgeAppealForm`, keyed by worker and ending. A stale lodge refreshes the identity as well as the appeals. | Same file: withdrawn record displayed, lodge against the shown version without a second identity read on success; a stale ending refreshes to the new version with fresh form state and a fresh key. |
| R6 | Undo waits for a successful, settled appeal read; pending/error states block submission. A failed check has a retry, and the conditional warning arrives through a mounted status region before confirmation. | Same file: pending read blocks both click and direct form submission; open-appeal warning is present before confirmation; failed read blocks until the retry succeeds. |
| R7 | The supersede date is the later of the transaction's IST day and the locked appeal's received day. Event timestamps, row lock order and the DB CHECK remain intact. AD7 / AC8 clarify the midnight case. | `undo.spec.ts`: public undo with a simulated older transaction clock succeeds, supersedes the appeal with a valid date in both row and event, and leaves the worker projection equal to its stream. Existing same-day AC8 and command-order tests also pass. |

The initial REAL GAP verdicts are discharged: family 2 by the live R7 regression; family 10 by delivering Task 6.2's missing surface with R5's tests; family 12 by R1's acknowledgment test; family 13 by R6's pending/error tests and the mounted status region. A runtime screen-reader/browser pass was not performed during these repairs; no connected browser tool was available in this session.

**Repair validation so far:** all 348 field-worker admin tests passed before the additional stale-lodge regression was added; the final eight-case review regression file passes separately. The live undo spec passes 19/19 and command-guard tests 73/73. Admin lint/typecheck, domain changed-file lint/typecheck, ending-appeal invariant tests 21/21 and the ending-appeal/state/domain-accessor/microcopy gates pass. Three existing undo tests now wait for the appeal check before pressing Confirm. An initial domain test typecheck error in the clock stub was corrected by binding the delegated query to its client. Sandbox-only tsx IPC failures were rerun with the required permission and passed. The full fresh-database `ci:local` run is pending; no final green result is claimed yet.

#### Round 2, chunk A (domain src, events, migration 0207) - 2026-11-17

Review dated 2026-11-17, using `bmad-code-review 13.1f` on the story worktree: the working tree (22 commits at `7b45a0da` PLUS the uncommitted round-1 repairs R1-R7) against the pinned `5ede00c4`, `origin/main` unchanged (fetched). BigDev, one chunk at a time: this is chunk A only - `packages/domain/src` (24 files), migration `0207` + its journal entry, the `packages/events` registry (3,225 diff lines, 25 files). Chunks B (domain tests + the invariant gate), C (contracts + API + jobs + CI wiring) and D (admin) are NOT yet reviewed; `openapi/v1.yaml` is covered by its determinism gate, not line by line; the records are the spec. Blind Hunter, Edge Case Hunter and Acceptance Auditor all completed (none failed). 21 raw findings (11 + 4 + 6) -> 16 unique. **Triage: 2 decision-needed, 5 patch, 1 defer, 8 dismissed.** Every claim below was re-read against the code before it was bucketed. No code was changed by this review; nothing was applied.

- [x] [Review][Decision][P2][R2A-1] **RESOLVED 2026-11-17 - BigDev chose option 3: ACCEPT the door at go-live (no new Row 52 leg; recorded as a dated line at roster Row 52 and at `deferred-work.md` C8; whether the Panel is told stays BigDev's, undecided).** A Panel refusal is a one-way door: no act can restore the worker, and no Row 52 leg holds go-live until one exists - sources blind + auditor (A-BH-1, A-AA-1) [`packages/domain/src/field-worker/ending-appeal-commands.ts:115`, `commands.ts:664-669`, roster Row 52]. Traced every writer of `field_worker.ending_undone`: the slip undo is refused after a Panel refusal (`-465` Q6 B, as built); `allowFieldWorkerEndingAppeal` needs an `open` appeal, and a `refused` row is final under the guard's rule (f); a new appeal is refused (`appeal_already_decided`, one per ending). So a worker whose appeal the Panel refused cannot be restored by anyone, although Q6 B says *"only a new decision of yours restores the worker"*. `-465` records this itself ("as built ... CANNOT be restored in the system at all") and carries it to `deferred-work.md` C8 with "Owner: none yet" - so it is DISCLOSED, not hidden; but Row 52's legs (a)(b)(d)(e) do not name it ((b) is met when the Q6 B refusal lands), so Row 52 can close with the door shut. Also: the note's Q6 as put (the options table) does not say that no route exists - those words ("no route") sit in the ruling block transcribed AFTER the ruling. Options: (1) **add a Row 52 closure leg (f) - or a new row - that gates the undo / appeal routes' production use on a built way for the Panel's new decision to be recorded** (a records change; cheapest; recommended); (2) build that act inside 13.1f (a new route, key and event: scope growth, and the SHAPE - a new act under `hear_ending_appeal_as_panel`, or re-opening the refused appeal - is the author's to propose); (3) accept the door at go-live, recorded in Row 52's notes with who is told. Cost of (1): go-live waits on a story nobody has scheduled. Cost of (3): a refused worker can never be restored even if the Panel changes its mind. **Panel gate (template section 0) - NOT routed, and why:** the Panel has already ruled the policy (Q6 B); what is open is whether go-live waits (BigDev's gate) and the mechanism's shape (`-465` assigns it to the author, C8). Whether to tell the Panel that its option B, as built, has no route to carry out a later decision is yours; the Auditor flagged it as a possible Panel question and I did not take it.
- [x] [Review][Patch][P3][R2A-2] **RESOLVED to a patch 2026-11-17 - BigDev chose option 1: a REQUIRED `expected_state_event_version` on terminate ONLY (suspend / reactivate unchanged). It reaches the domain command, the contract + OpenAPI, the API handler, the admin End act and the tests - chunks A, B, C and D.** `terminateFieldWorker` has no expected-version guard, so a stale or repeated End is no longer refused now that `terminated` is not terminal - source edge (A-EC-1) [`commands.ts:472-484`, `:539-569`]. Before 13.1f a second End answered `illegal_transition` (terminal state). Now: an Admin's tab shows a worker as `active`; the worker is ended, the Panel allows the appeal (`active` again, v7); the stale tab's End writes a NEW ending at v8, with a fresh hearer, a fresh one-appeal-per-ending allowance and a second supersede of any move request - the allowed ruling is overridden with no Panel involvement. Recoverable (undo or appeal again), the idempotency key covers a double-click, and it needs a stale human view; spec line 793 says a re-ended worker is "ended normally", so the second ending itself is specified - the missing piece is the stale-view guard. Undo and lodge carry `expected_ending_version`; suspend / reactivate / terminate do not (a stale Suspend of a restored worker has the same shape, smaller). The version is already on every lifecycle 200 (G24), so the screens hold it. Options: (1) add a required `expected_state_event_version` to terminate only (13.1c contract + OpenAPI + the admin End act; recommended - it is the act that overrides a ruling); (2) the same on suspend and reactivate; (3) accept and note it. Cost of (1)/(2): a contract change to routes 13.1c shipped (nothing is live). Engineering call - not the Panel's.
- [x] [Review][Patch][P3][R2A-3] The eligible-appeals list hard-codes "open or refused" while lodge counts refused appeals against `FIELD_WORKER_APPEALS_PER_ENDING`, so AD7's "one constant, the Panel's answer changes one line" is false - sources blind + auditor (A-BH-6, A-AA-4) [`packages/domain/src/field-worker/read.ts:838`]. Raise the constant to 2 and lodge accepts a second appeal after a refusal while the eligible list still hides the worker, so a Panel-only holder (no Find) cannot reach it. Bind the constant in the SQL (an open appeal exists OR refused count >= N) and pin both sites with a sync-guard test; or correct AD7's wording to name both places.
- [x] [Review][Patch][P3][R2A-4] The cross-district ended-by-number read carries no DELIBERATE block (checklist family 9, REAL GAP) - sources blind + auditor (A-BH-2, A-AA-5) [`packages/domain/src/field-worker/read.ts:688`, `apps/api/src/modules/field-worker/handlers.ts:217`]. The read widens an officer's district scope on purpose (AD11, Q3 A); the sibling bypasses in this module (`log-handlers.ts:17`, `code-sms.ts:92`, `move-request-read.ts:500`) each carry a "DELIBERATE (checklist family 9)" block with a rationale and a re-examination trigger; this one does not. Add it, with the triggers C3 (13.6's conduct reasons reach this line) and 13-1h (a PAN match widens it). The disclosure itself is AD11 and is NOT re-opened here.
- [x] [Review][Patch][P3][R2A-5] "The link discloses nothing the officer could not already read" is overstated - source auditor (A-AA-6) [spec AD12 and section 0 row 10a; `apps/api/src/modules/field-worker/log-handlers.ts:23-28`; `packages/domain/src/field-worker/read.ts:422`, `:503`]. Only `log?record=` is gated by the officer's own read; `previous_field_worker_id` (that an earlier ended record exists, and its id) goes to EVERY reader of the new worker's log. Verified: `log-handlers.ts:87` maps it unfiltered. The audience is the District Admin of the worker's district and the Pariwar Admin, and the District Admin also holds `field_worker.register` (the officer Q3 A showed the date and reason) - so the fact reaches no one new in kind, and I did not route it; I did not trace the Pariwar Admin's register grant. Reword the claim in AD12, row 10a and the handler header to say what is true; if you would rather the existence of the link be withheld from a reader who cannot open the earlier record, that is a different, code-side fix - say so and it becomes a decision.
- [x] [Review][Patch][P3][R2A-6] AC17's guard-(0) legs are missing for most of the new commands, and one test title overstates its body - source auditor (A-AA-2; family 3 and family 10 REAL GAP) [`packages/domain/tests/integration/field-worker/undo.spec.ts:239`, `packages/domain/tests/field-worker/commands-guards.test.ts:808`, `:863-895`, `ending-appeal.spec.ts:277`]. AC17 asks, for each of undo, lodge, decide and withdraw: a non-human actor, a literal (unverified) authorization, a wrong key and a wrong dimension, each refused before any statement. Found: undo has a wrong key, the trustee actor kind and a malformed version only; lodge has non-human, literal, wrong key and kind but no wrong dimension; allow / refuse / withdraw have only the lock-order and check-order tests (no tampered-authorization leg). The title at `undo.spec.ts:239` names "a non-human actor" its body never sends. Task 3.7 is checked `[x]` "AC17's domain legs". Add the legs in the unit guard suite (no statement sent) and retitle. Overlaps chunk B (the tests); recorded here because it was found from chunk A's code.
- [x] [Review][Patch][P3][R2A-7] No live test follows a keyset cursor on the appeals list or the eligible list - source auditor (A-AA-3) [`packages/domain/src/field-worker/read.ts:793-834`, `ending-appeal-read.ts:133`]. The only cursor assertions are an empty page's `next_cursor: null` (`undo-appeal.spec.ts:281`); R3's admin test mocks the API. The eligible cursor reuses the worker-list codec with a synthetic `<ended_on> 00:00:00+00` timestamp and a `(ended_on, id) < (...)` row comparison - read and looks right, never executed. Add one live leg per read: three or more rows with a tie on `ended_on`, `limit` 2, follow the cursor, assert no repeat and no skip. Overlaps chunk B.
- [x] [Review][Defer][P3][R2A-8] No supporting index for the ended-by-number read or the eligible page's sort, and no EXPLAIN spec for either - source edge (A-EC-4) [`packages/domain/src/field-worker/read.ts:688-710`, `:808-860`] - deferred: bounded by one Pariwar's worker count, no demonstrated slow path; an index means a new migration (`0207` is applied on dev databases - never edit it). Verified: `field_workers_pariwar_mobile_live_uq` (0200) is partial (`WHERE current_state <> 'terminated'`) so it cannot serve the read; the page falls back to `field_workers_pariwar_created_idx` plus a filter. Trigger: a Pariwar past ~2,500 workers (the 13.1a measurement), or 13-1h widening the match to PAN.

**Dismissed (8) - recorded so a later round does not re-litigate them.** (1) A-BH-3 / A-EC-2, undo / allow and the appeal's supersede not atomic in the domain: the projector's two typed errors (head check, row count) fire only if the appeal stream's head or the row count disagrees while BOTH locks are held - corruption, not an interleave - and `tenantWrite` rolls the scope transaction back unless `run` COMMITs (`write-support.ts`); no handler catches them. (2) A-BH-4, `appealHeardBy` trusted from the caller: the route computes it from the verified grants (`lifecycle-handlers.ts:214`, `appealHearerAtEnding`), the same trust model as every command input; the domain validates the enum. (3) A-BH-5 / A-EC-3, the link is not validated in the domain: the API re-checks and takes `FOR SHARE` (`lockFieldWorkerForLink`, AD12), the command and the migration say so, and there is one caller. (4) A-BH-7, the by-id appeal read has no hearer filter: its one caller is the write's read-back on the writer's own transaction, and no GET-by-id route exists (Row 52's route list). (5) A-BH-8, `permission_key` literals "retroactive" on six event schemas: each command already refuses any other key (QE18, at the pin), so no stored event can carry a different one. (6) A-BH-9, the `0207` journal `when`: strictly above `0206`'s and above every sibling worktree's highest, hand-bumped by convention (a gap of six days, not one, is harmless). (7) A-BH-10, a hostile cursor reaching a SQL cast error: FALSE - `createdAtInRange` validates year, month, day, hour, minute and second before any SQL. (8) A-BH-11, the stale-authorization check before the not-open check: the documented order (1') then (2).

**Round 2, chunk A - the load-bearing-invariant lens (Auditor).** Families 7 and 13 untouched. 1 (state machine), 2 (concurrency), 4 (event payloads), 5 (DB backstops), 6 (projection), 8 (audit), 11 (policy meaning), 12 (ownership): covered-by-test or by-construction, named by the Auditor against `state.test.ts`, `undo.spec.ts`, `ending-appeal.spec.ts`, `ending-appeal-race.spec.ts` (not re-read by it - chunk B), the AC16 CHECK / FK / guard legs and `schema-trigger.spec.ts`. REAL GAP: family 3 (R2A-6), family 9 (R2A-4), family 10 (R2A-6; R2A-1's disclosed-but-ungated closure; R2A-3's claim). R7's repair (`ending-appeal-supersede.ts:38`) was re-traced: the ISO date strings compare correctly, AD7 / AC8 match it, and its `undo.spec.ts` leg separates old code from new. Migration `0207`'s guard function differs from `0201`'s only by rule (t'), diffed word for word. The Auditor wrote one scratch copy of the `0201` migration into the session scratchpad (a redirection, against the read-only rule); no repository file or git state was touched.

#### Round 2, chunk A - patch resolution - applied 2026-11-19

BigDev chose "1" (apply every patch). R2A-1 (accepted) and R2A-8 (deferred) were not touched. Nothing is committed or pushed; the patches sit in the worktree on top of round 1's uncommitted repairs.

| Item | What was done | Evidence (every proof RED first: a single mutation, then restored byte-identical) |
|---|---|---|
| R2A-2 | **End carries the version the screen showed.** Domain: `TerminateFieldWorkerInput.expectedStateEventVersion` REQUIRED; a pure guard (0) before any SQL; under the lock AFTER legality and the target (3d), BEFORE the reason and dates, a mismatch -> new `FieldWorkerStateChangedError`. Contract: `TerminateFieldWorkerRequest.expected_state_event_version` (positive integer, strict). API: 409 `field_worker.state_changed`, judged on the pre-read (no audit line) and again under the lock (the `_rolled_back` twin); the audit hash input includes it. OpenAPI regenerated (8 lines changed, determinism gate green). Admin: the End sends `worker.state_event_version`; `state_changed` reads as the existing "status has changed" line, withdraws the acts, re-reads the worker. Spec: the concurrency matrix (two rows) and the errors table | unit: 3 legs (pure refusal, stale under the lock, check order); live `undo.spec.ts`: ended then restored by a slip undo, by an ALLOWED appeal, and a `terminated` worker still `illegal_transition`; HTTP `lifecycle.spec.ts` (400 / stale 409 with nothing written / control) and `terminate-race.spec.ts` (under the lock, with the twin); admin: the body and the stale 409; contracts. RED: the under-lock comparison removed -> 4 red; the pure check removed -> 1 red; the admin dropping the version -> 3 red; the `state_changed` guidance dropped -> 1 red |
| R2A-3 | The eligible list binds `FIELD_WORKER_APPEALS_PER_ENDING` (an open appeal hides the worker; so do refusals reaching the constant). `appealsPerEnding` is a test-only override, no route passes it | live: hidden at the constant, eligible again when the limit is raised by one, an open appeal hides at any limit, `0` is a `RangeError`. RED: the old `IN ('open','refused')` literal reinstated -> that test red |
| R2A-4 | A "DELIBERATE (checklist family 9)" block on `findEndedFieldWorkersByMobileIndex`: rationale (AD11, Q3 A) and two re-examination triggers (13.6's conduct reasons, 13-1h's PAN match) | documentation; gates green |
| R2A-5 | The overstated "discloses nothing" claim reworded in AD12, section 0 row 10a and the `log-handlers.ts` header: what the link lets an officer READ is only what they could already read; that an earlier record exists, and its id, reaches every reader of the new worker's log | documentation |
| R2A-6 | AC17's guard (0), DB-free, on undo, lodge, refuse, withdraw and allow: a non-human actor (system, member, null and empty id), a literal, a wrong key, the right key at the wrong dimension, another actor's, another Pariwar's - each refused with NOTHING sent, plus a valid-input control per act (15 tests). The undo spec's title that named a non-human actor its body never sent is corrected | RED, per class: a literal passes -> 5 acts red; another actor or Pariwar passes -> 5 red; a wrong dimension passes -> 5 red; the single-key check dropped -> undo red; the hear-key LIST check dropped -> lodge, refuse, withdraw, allow red; both non-human guards dropped -> 5 red. ⚠ Two legs first stayed green under ONE mutation and were fixed or explained: the wrong-key leg on the four hear-key acts used the `trustee` kind, which `assertAppealActorKind` also refuses, so it now carries `operator` (only the key check can refuse it); a non-human actor is refused by two overlapping guards, so it goes red only when both are removed - defence in depth, not a vacuous leg |
| R2A-7 | Live legs that FOLLOW the keyset cursor of the eligible list and of the appeals list to a second page: three rows tied on the sort key (`ended_on`; `created_at`, which is one value inside one transaction), so the id is the whole tie-break; no repeat, no skip | RED: `<` loosened to `<=` in either read -> that leg red |

**Three things found while applying them** (recorded, not in the options as put to BigDev):
1. **A concurrent suspend and End from one screen now has exactly one winner.** Before R2A-2 the End "always fulfilled", running after the suspension; now an End whose version the other act has moved on is refused `state_changed`, as two moves from one screen already were (13.1c AD4). `stream-concurrency.spec.ts` (a), a 13.1 smoke test whose header said "terminate ALWAYS fulfils", was rewritten to assert the two legal outcomes. The same holds for a move or a reactivate committing between the officer's screen and the End. The cost is an officer retrying after a reload; the spec's concurrency matrix says so.
2. **The admin's End assertion was vacuous.** The test fixture's worker carried no `state_event_version`, so the body's version was `undefined` and `toHaveBeenCalledWith` (which ignores undefined properties) passed without it. The fixture now carries one and the assertions name it; with the version dropped from the body, three tests go red.
3. **The audit hash includes the version.** `lifecycle.spec.ts` AC6's hash assertion needed it; no other record changed.

**Validation (2026-11-19).** `tsc --noEmit`: 0 errors in domain, API, admin, jobs and contracts. ESLint on all 42 changed `.ts` / `.tsx` files: clean. DB-free suites: contracts 1724, domain 4132 (4291 DB tests skipped), API 1170, jobs 1430, admin 2187; the gate scripts' own tests 521. LIVE on the story container `twt-13-1f-pg` (:5484, never the shell's :5432): domain field-worker unit + live 24 files / 522 tests; API field-worker 15 files / 181; jobs field-worker 8 files / 227. Gates: `microcopy:check`, `domain-invariants:check`, `field-worker-state:check`, `field-worker-ending-appeal:check`, `contracts:check-openapi-determinism` all pass. **NOT run:** the full `ci:local`; the full live domain and API suites (only the field-worker directories); a browser pass of the End change on a stale panel; chunks B, C and D of this review. The temporary RED-proof helpers live in the session scratchpad, never in the repository.

#### Round 2, chunk B (the domain specs, the events and RBAC tests, the appeal RLS spec, the ending-appeal gate) - 2026-11-19

`bmad-code-review 13.1f`, BigDev: one chunk at a time, chunk B after A's patches. The working tree against the pinned `5ede00c4`, chunk B only: `packages/domain/tests` (18 files), `packages/events/tests` (2) and `scripts/field-worker-ending-appeal-invariant` (4) - 3,852 diff lines in 24 files, rebuilt AFTER chunk A's patches so it holds their tests. Blind Hunter (15), Edge Case Hunter (11) and Acceptance Auditor (16) all completed: 42 raw findings, every one P3 - tests that are missing or cannot fail, titles that claim more than their bodies check, closure claims, and false negatives in the gate - **none is a wrong behaviour of the code, and none is a Panel question**. 42 raw -> 19 unique after merging duplicates. **Triage: 0 decision-needed, 18 patch, 1 defer, 0 dismissed.** Every claim was re-read against the code before it was bucketed (the post-rollback assertions, the projector's parse-before-check order, the gate's regexes and scan roots, the absence of any appeal-schema test, the lodge date bound, the roles title). No code was changed by this review; nothing was applied. The Auditor confirmed that each round-2 chunk-A patch's tests CAN fail, that their titles match their bodies, that `terminateAtCurrentVersion` hides nothing (every test that needs a stale version passes one), and that the File List and the record's test counts match the files.

- [x] [Review][Patch][P3][R2B-1] Assertions made after the test's own `ROLLBACK TO SAVEPOINT` cannot fail - sources blind + edge + auditor (B-BH-8, B-EC-4, B-AA-13) [`packages/domain/tests/integration/field-worker/undo.spec.ts:337-338`, `ending-appeal.spec.ts:317-318`]. Both legs run the refused command, roll back, THEN assert "the row did not move" / "the appeal stays OPEN": a command that wrote before raising would have its damage erased by the test's own rollback (the repo's known TR7 trap). The typed error and the success control stand; the "nothing moved" half proves nothing. Read before the rollback (the command rolled back its own savepoint, so the transaction is usable) and RED-prove it with a command that writes first.
- [x] [Review][Patch][P3][R2B-2] The AD3 projector leg "one naming a non-ending version -> refused" is refused for the wrong reason - sources blind + edge + auditor (B-BH-10, B-EC-1, B-AA-8) [`undo.spec.ts:375`; `project.ts:365-387`]. Version 1 fails the write schema's `.min(2)`, and the schema parse runs BEFORE AD3's own check, so the three conjuncts the leg is named for (the version is a `terminated` event; it is THIS worker's CURRENT ending; its `from_state` is the target) are never isolated - only `from_state` is, by the first leg. Delete any of them and nothing is red. Add: a valid non-ending version (the `activated` event), and a stream end -> undo -> end again projected with the OLDER ending's version; RED-prove each clause.
- [x] [Review][Patch][P3][R2B-3] The appeal event, state and projector layer has no unit test, and AC11's "every `field_worker_ending_appeal.*` schema refuses a snapshot signed with another key" is untested - sources edge + auditor (B-EC-2, B-AA-1) [`ending-appeal-events.ts`, `ending-appeal-state.ts`, `ending-appeal-project.ts`; `packages/events/tests/field-worker-ending-appeal-registry-coverage.test.ts:29-54` checks object identity only]. Searched `packages` / `apps` / `scripts` for each schema and function: only the registry identity test and an import in the guard suite match. Delete a `hearerMatches` refinement, a `.strict()`, the human-actor rule, a projector cross-check or the head-version check and every spec stays green, because the commands pre-check first and only happy paths reach the projector (which the barrel re-exports). Add the unit tests: per schema the key pin (AC11), the human-actor rule, strictness, `ending_event_version >= 2`; `nextEndingAppealState`; `assertAppealHearer` and `assertAppealActorKind`; the projector's pre-SQL cross-checks.
- [x] [Review][Patch][P3][R2B-4] AC17's actor-kind refusal is unisolated for refuse and withdraw, and the matrix tampers only the Panel key - sources auditor + blind (B-AA-2, B-BH-11) [`commands-guards.test.ts`, the R2A-6 describe]. R2A-6 re-keyed the wrong-key leg to the `operator` kind so the key check could be proved alone, which left no leg on `assertAppealActorKind` for refuse / withdraw (one call in `lockAppealForDecision`); AC17 asks that "`_as_panel` with `'operator'`, or `'trustee'` with another key" is refused, and only lodge and undo have it. Also every tamper uses the Panel key; the Pariwar Admin's `hear_ending_appeal` branch (a literal, a wrong dimension, another actor's, another Pariwar's) is never tried. Add both, with a RED proof that removing the kind check turns refuse / withdraw red.
- [x] [Review][Patch][P3][R2B-5] Race (a)'s closing assertion is a tautology, neither order is forced, and the matrix row names acts that are never raced - sources blind + edge + auditor (B-BH-5, B-EC-3, B-AA-7) [`stream-concurrency.spec.ts:179-211`]. `seen.terminateFirst + seen.suspendFirst` is 6 whenever the loop ends (each round bumps exactly one counter after an exactly-one assertion); a scheduler that always lets one act win keeps the test green and one branch never runs. The forced leg (`terminate-race.spec.ts`) stages only "the suspension first, the End waits"; "the End first, the suspension waits" is forced only for End x End. The matrix row (and the record) say "suspend (or move / reactivate) x End": move and reactivate are never raced with an End. Drop the tautology and the counters; add two FORCED domain legs (End holds / suspend waits -> `illegal_transition`; suspend holds / End waits -> `state_changed`), each with its reason and a control; correct the row to what is raced.
- [x] [Review][Patch][P3][R2B-6] The `field-worker-ending-appeal-invariant` gate has false negatives its tests do not pin and its README does not list - sources blind + edge (B-BH-1, -2, -3, -4, -13, -14; B-EC-5, -6, -10) [`scripts/field-worker-ending-appeal-invariant/lib.ts:49-59`, `:93-190`, `check.ts:26-44`, `lib.test.ts`]. Read from the regexes: (i) `insert\s+into` / `merge\s+into` allow no comment between the keywords (`INSERT /* x */ INTO field_worker_ending_appeals` passes); (ii) `WRITER_SETTING` has no `i` flag, though Postgres setting names are case-insensitive; (iii) `SQL_NAME_ONLY` takes one qualifier where `RAW_WRITE` takes two and a quoted `"my-schema"`; (iv) the alias walk misses a class field, a parameter default and a conditional / `??` / `||` operand; (v) the `+` chain tests `RAW_WRITE` only, so a split writer setting passes; (vi) the allow-list's FILE clause is never exercised (a mutant matching by function name alone passes every test) and the "does NOT flag ... a DELETE" title has no DELETE; (vii) a 200 ms wall-clock bound around `createSourceFile` flakes on a loaded `ci:local` (a regex blow-up takes seconds); (viii) the scan roots are each package's `src` / `scripts` / `seed` plus the root `scripts/`, and the README does not say why `apps/mobile`, the root `tests/`, `infra/` or a package's other directories hold nothing that can reach the table. Fix (i)-(vii) with a test each, RED-proved, and list in the README's "Not seen" what a per-file scan cannot follow (a cross-file `export const t = table`, a re-export under a new name, a function that returns the table) and the unscanned directories, with the reason; the 0207 trigger stays the runtime guard.
- [x] [Review][Patch][P3][R2B-7] Weak legs in `register-previous.spec.ts` - sources blind + edge (B-BH-6, B-BH-7, B-EC-11) [`register-previous.spec.ts:70-78`, `:134-136`]. "Another Pariwar's ended row is never shown" registers the foreign worker and never ends it: the `terminated` filter alone would hide it, so the leg cannot fail for the property it names. The self-link test's "CONTROL" is `expect(id).toBeTruthy()` on a value the test set, it accepts two different codes (so the composite FK half is never pinned), and no leg shows that a legal link under the same owner and guard inserts. End the foreign worker; make the control the same INSERT with a NULL link and with a legal link; pin the code Postgres answers.
- [x] [Review][Patch][P3][R2B-8] The partial-unique backstop leg (AC5 (c)) counts the appeals table but not what the refused projector call left in `events_log` - sources blind + edge (B-BH-12, B-EC-11) [`ending-appeal.spec.ts:210-224`]. The throwaway appeal id is never kept, so an orphan `lodged` event with no row would not be seen. Keep the id and assert its stream is empty.
- [x] [Review][Patch][P3][R2B-9] Test titles that claim more than their bodies check - source blind (B-BH-15), with two found by the auditor and edge [`commands-guards.test.ts` (the check-order test: the stub's worker is always `terminated`, so "(2') terminated" is never the refusing leg); `undo.spec.ts` ("refused before any SQL" - a live test cannot show it; the unit suite does); `ending-appeal.spec.ts:293` ("both carrying ONE audit id" - only the two projection rows are compared, and round 1 already recorded that the events carry none); `schema-trigger.spec.ts:256` ("sets or CHANGES it" - no row ever had a link, as its own comment admits); `roles.test.ts:1331` (the title says `trustee_panel` is the ONLY bundle holder, the assertion lists `super_admin` too); `undo.spec.ts` (h) (`'undoEndingLocked' in fieldWorker` is a name-based negative that passes on a rename)]. Retitle each to what it checks, or strengthen it (a linked row for AC10 (b); the barrel's exact set of undo / allow writers for (h)).
- [x] [Review][Patch][P3][R2B-10] Untested branches in lodge, decide and terminate - sources edge + auditor (B-EC-7, B-AA-4, B-AA-10) [`ending-appeal-commands.ts:89`, `:111`, `:121`; `commands.ts` decide's target check, `terminateFieldWorker`'s `appealHeardBy` guard]. No leg: a lodge or a decision whose authorization targets another district than the worker's (`AuthorizationStale`) or its place in the check order; a malformed lodge version (1, NaN, 2.5 - only the undo has it); AC5 (e)'s positive "received between the registration day and `ended_on` -> accepted" (every lodge in the specs is on `ended_on`, so the lower bound could move to `ended_on` unseen); `terminate` with no `appealHeardBy`, or one that is not a hearer (`'district_admin'`), refused with nothing sent (AC7's "unit" leg). Add them in the DB-free guard suite.
- [x] [Review][Patch][P3][R2B-11] The appeal table's DB backstops miss the version disjunct and several columns - source edge (B-EC-8) [`ending-appeal.spec.ts:542-613`; `field-worker-ending-appeals-policy-regression.spec.ts:85`]. The single lodging-INSERT refusal uses a `refused` row with a decider, which fails several disjuncts at once; an `open` row at `state_event_version = 5` is never tried, so removing that disjunct is invisible; `ending_event_version > 1` -> `> 0` is invisible; `appeal_id` and `created_at` immutability (rule (b) by default) have no leg; the CHECK `..._ending_version_positive` is listed by name only. Add a leg per disjunct and per column, as `schema-trigger.spec.ts` does for `field_workers`.
- [x] [Review][Patch][P3][R2B-12] `lockAppealForDecision`'s pair re-verify and the allowed decision's "open appeal on a changed ending" refusal have no leg - source auditor (B-AA-9) [`commands-guards.test.ts:936-950`; `commands.ts` (`appeal.fieldWorkerId !== fieldWorkerId`; `allowFieldWorkerEndingAppeal`'s `currentState` / version guard)]. The stub's appeal worker and appeal lock always agree and the worker is always `terminated` at the appeal's version. Add stub options for a mismatch and a changed ending; assert the typed refusals AC6 (i) names.
- [x] [Review][Patch][P3][R2B-13] AC7's "hearer fixed at the ending" has no test that the grant is gone and the hearer is unchanged, and the legacy-event leg cannot tell the default from a role-derived answer - sources auditor + blind (B-AA-3, B-BH-9) [`ending-appeal.spec.ts:391-419`]. Nothing deletes the ender's Pariwar Admin grant between the ending and the lodge (a hearer recomputed from current grants would pass); the legacy leg's ender is a Pariwar Admin, whose endings are Panel-heard anyway, so a read that derived the hearer from the ender's role would pass - a District Admin ender is the case where the default matters. Add both, live.
- [x] [Review][Patch][P3][R2B-14] AC2's "if it was linked, pointing at a now-live record: allowed, its history and labels still read" has no test - source auditor (B-AA-12) [`undo.spec.ts:329-340`, `register-previous.spec.ts:93-107`]. No spec registers with a link, ends the newer record, undoes the older one, then reads the chain or `log?record=`. A later CHECK or chain-read filter that hid a link whose target became live would ship green. Add it.
- [x] [Review][Patch][P3][R2B-15] The reducer's identity on a bad undo payload was dropped from the agreement test - source auditor (B-AA-16) [`state.test.ts:80`, `:168-200`]. The old `fieldWorkerStateMachine.step` loop now filters out `field_worker.ending_undone`; the fold has a malformed-undo leg but `step` / `reduce` has none (TR1: a bad payload -> `null` and the reducer's identity). Add `step('terminated', undo with a bad payload)` -> `'terminated'`.
- [x] [Review][Patch][P3][R2B-16] API-side legs of the matrix and the ACs are missing - source auditor (B-AA-5, B-AA-6, B-AA-14) [`apps/api/tests/integration/field-worker/ending-appeal-race.spec.ts:147-159`, `:224-230`; `undo-appeal.spec.ts`] - ⚠ these are CHUNK C's files, listed here because the Auditor found the gaps from the matrix. (i) AC2 (iii) asserts neither the intent line nor the `_rolled_back` twin (family 8's pair, unproved for that row); (ii) "decide x decide" and "decide x withdraw" say "live, both orders" but one order each is staged - never a refusal or an allow holding while a withdrawal waits, an allow holding while a decision waits, or a withdrawal waiting behind the slip undo; (iii) no HTTP leg for AC5 (g) (a District Admin lodges -> 403), AC6 (h) (a Pariwar Admin on a Panel-heard decide / withdraw -> 403; a super admin -> 409 `appeal_wrong_hearer` with no audit line), AC6 (b) (the decide pre-read's number check, no audit line), AC6 (d) (the ender on withdraw). Add the legs, or correct the matrix to the orders staged. The heaviest patch of this chunk.
- [x] [Review][Patch][P3][R2B-17] Task 3.7 is checked `[x]` and orders "a RED proof for each new guard"; the record names none for the domain command guards - source auditor (B-AA-11) [spec Task 3.7 (line 1071); the Dev Agent Record]. Recorded proofs are Q6 B's guard, AC2 (ii)'s `FOR SHARE`, Task 2.4's legs and the round-2 patches. The undo's terminated / version / target guards, the lodge order, the decide and ender rules, the hearer check, the 23505 mapping and the cause-key refinements have none recorded (checklist family 10: disclose, never backfill). Add a dated disclosure line to Task 3.7's record naming what is un-attested; a proof run later is a new dated entry, never edited into the old one.
- [x] [Review][Patch][P3][R2B-18] The spec's list orderings read opposite to the built order - source auditor (B-AA-15) [spec AD13 (lines 555, 562)]. AD13 writes "`created_at DESC, appeal_id`" and "`ended_on DESC, field_worker_id`" for the appeals list and the eligible list, which are built `DESC` on the id as well (keyset, index and tests agree); AD11's shown-number read is ascending on the id and says the same words. Say `appeal_id DESC` and `field_worker_id DESC` in AD13.
- [x] [Review][Defer][P3][R2B-19] The undo's fail-closed "corrupt stream" branches and AD17's null returns are never exercised - source edge (B-EC-9) [`commands.ts:714-737` (`resolveTarget`'s two throws); `read.ts:654-655` (`getCurrentFieldWorkerEnding`'s null-actor and bad-`heard_by` returns); `ending-appeal-commands.ts:106-109`] - deferred: three fail-closed 500s over streams the append-only log and the 0207 guard already make unreachable except by planting rows at owner level; a test would prove a throw the system cannot produce. Trigger: any edit to `resolveTarget` or `getCurrentFieldWorkerEnding`.

**Load-bearing-invariant lens, chunk B (Auditor).** Families 7, 9, 11 and 13 untouched. Covered-by-test: 1 (narrow gap R2B-15), 4 (key pins: R2B-3), 5, 6, 12. REAL GAP: 2 (R2B-5, R2B-16), 3 (R2B-4, R2B-16), 8 (R2B-16), 10 (R2B-1, R2B-17, and the "both orders" and "ONE audit id" claims in R2B-5, R2B-9, R2B-16). No finding is a code defect; the code under test behaved as the spec says wherever a leg reached it.

#### Round 2, chunk B - patch resolution - applied 2026-11-19

BigDev chose "1" (apply every patch): R2B-1 to R2B-18. R2B-19 (the corrupt-stream branches) stays deferred. Nothing is committed or pushed; the patches sit in the worktree on top of round 1's repairs and chunk A's patches. Every new leg was proved RED by a single mutation, the source restored byte-identical after each (the DB-level legs by replacing the guard function INSIDE the test's own rolled-back transaction - the guards live in an applied migration).

| Item | What was done | Evidence |
|---|---|---|
| R2B-1 | The two "nothing moved" assertions read BEFORE the test's own `ROLLBACK TO SAVEPOINT` (and also assert that no event was left behind) | RED: the command no longer rolls back its own savepoint (undo AC2); `allow` writes the appeal transition before the core that then fails (AC6 b) - the second is a case the old after-rollback assertion could not see |
| R2B-2 | AD3's projector check: the version-1 leg is retitled as the WRITE SCHEMA's refusal; one leg per AD3 clause - an older ending, no such event, an event that is not an ending (a worker whose latest event is `activated`; the row's version must equal the stream head, so it cannot be faked on the real worker) - each asserted by AD3's own message | RED, one run per clause: `ev === undefined`, `is a terminated event`, `is the row's CURRENT ending`, `from_state is the target` |
| R2B-3 | NEW `ending-appeal-events.test.ts` (15 DB-free tests): every appeal schema's key pin (AC11), the human-actor rule, strictness, `ending_event_version >= 2`, dates, literal states; the state table; `assertAppealActorKind`, `assertAppealHearer` (a super admin never acts as the Panel); the projector's pre-SQL cross-checks and head-version check, with a client that throws if any statement is sent | RED, eleven mutations across the three modules - each goes red on the leg written for it |
| R2B-4 | AC17 on refuse / withdraw / lodge / allow: the actor KIND both ways, and the whole tamper matrix again under the Pariwar Admin's hear key (literal, wrong dimension, another actor, another Pariwar), each with a valid-input control; the undo with the trustee kind | RED: the actor-kind check removed from `lockAppealForDecision` -> refuse, withdraw and allow go red |
| R2B-5 | `stream-concurrency.spec.ts`: the tautological tally is gone; two FORCED legs (the End holds / the suspension waits -> `illegal_transition`; the suspension holds / the End waits -> `state_changed`, with the control that a re-read screen then ends them); the matrix row names suspend only | RED: the version check removed -> (a) and (a2) red; the row lock removed -> (a), (a1), (a2) red |
| R2B-6 | Gate: a comment between `INSERT` and `INTO`, a case-insensitive writer setting, one qualifier grammar for the SQL-name constants, class fields, parameter defaults, conditional / `??` / `\|\|` / `&&` operands, a split writer setting in a `+` chain; the allow-list's FILE clause; DELETE and TRUNCATE cases; the timing bound 200 ms -> 2 s; the README names the scan roots, why, and everything a per-file scan cannot follow | RED: ten mutations, each reverts one fix and fails the test written for it; the gate still passes on the real tree (2,015 files) |
| R2B-7 | The foreign-Pariwar row is now ENDED, with a control that its own Pariwar's read shows it; the self-link test pins the code Postgres really answers (`23514 ..._previous_not_self` - the old comment was wrong that the FK fires first), the dangling link's `23503 ..._previous_fk`, and two real controls (no link; a link to a real terminated record) | RED: the read stops filtering on `terminated`. ⚠ **NOT separately provable:** dropping the read's explicit `pariwar_id` predicate leaves every test green, because FORCE row-level security already hides the foreign row; the predicate is belt-and-braces over RLS (family 10: stated, not faked) |
| R2B-8 | The refused projector call's own stream must be empty (no orphan `lodged` event), with a control on the real appeal's stream | RED: the append escapes the projector's savepoint -> the orphan event appears, the row count (the old assertion) stays green |
| R2B-9 | Titles: the undo check-order test now reaches `(2')`; the barrel test asserts the EXACT set of undo / allow writers; the AC6 (a) title says what is compared; the roles title says `trustee_panel` AND `super_admin` list the key; AC10 (b) now runs on a row written WITH a link (clear and change refused); the undo spec's "before any SQL" claim points at the guard suite that proves it | RED: the core re-exported under a new name (the old name-based test could not see it); the undo's `terminated` legality check removed; the guard function replaced in-transaction so rule (b) stops covering the link |
| R2B-10 | DB-free legs: the lodge's malformed version, its stale target (placed AFTER the hearer and BEFORE the open check), AC5 (e)'s date bounds (any day from the registration day to today; before it -> 422), the decide acts' stale target, `terminate`'s `appealHeardBy` missing or not a hearer (refused with nothing sent) | RED: eight mutations in the command modules |
| R2B-11 | The lodging-INSERT guard one disjunct at a time (version, decider, decision date, state), the version CHECK by name, and `appeal_id` / `created_at` in the immutable-column loop | RED (in-transaction guard replacement): each disjunct removed, and rule (b) no longer covering `created_at` or `appeal_id` |
| R2B-12 | The appeal-worker pair re-verify and the allowed decision's "open on a changed ending" refusal, through two new stub options | RED: both guards removed |
| R2B-13 | The legacy ending by a DISTRICT ADMIN reads as `trustee_panel`; the ender's Pariwar Admin grant revoked afterwards, and a grant given to a District Admin ender, change nothing | RED: the legacy default flipped; the hearer derived from the ender's CURRENT grants (that mutation leaves the OLD Pariwar-Admin-ender legacy test green - the gap the finding named) |
| R2B-14 | The old record undone while a later, LINKED, ended registration points at it: allowed; the chain, the history and the lock read still answer | RED: a chain read that hides a link whose target is live (the existing chain test did not see it) |
| R2B-15 | `fieldWorkerStateMachine.step` is the identity for an undo with no payload or a bad one, and from any state but `terminated` | RED: the reducer falls back to another state |
| R2B-16 | API (chunk C's files): AC2 (iii) asserts the audit pair; eight more orders of closing act x closing act and undo x withdraw, each forced, with the intent line and twin; HTTP legs for AC5 (g), AC6 (h) (six refusals, no audit line), AC6 (b) and AC6 (d) | RED: the twin writer removed -> every in-lock leg goes red; the super-admin pre-read removed; the number pre-read removed; the ender rule removed from BOTH layers. ⚠ the ender rule is enforced twice (the handler's pre-read and the domain command): removing ONE leaves the leg green - defence in depth, recorded, not a vacuous leg |
| R2B-17 | Task 3.7's un-attested RED proofs disclosed in the Tasks section | record only; a proof run later is a new dated entry |
| R2B-18 | AD13's two list orderings now say `DESC` on the id, as built | wording |

**Not provable, recorded rather than faked:** the explicit `pariwar_id` predicate of the ended-by-number read (R2B-7), the ender rule's two layers (R2B-16), and a non-human actor, which two overlapping guards refuse (round 2 chunk A, R2A-6).

**Validation (2026-11-19).** `tsc --noEmit`: 0 errors in domain, API, admin, jobs and contracts. ESLint on the 48 changed `.ts` / `.tsx` files in the five packages: clean (the root `scripts/` folder has no lint step of its own, so the gate folder is covered by its own tests only). DB-free suites: contracts 1724, domain 4172 (4298 DB tests skipped), API 1170, jobs 1430, admin 2187; the gate scripts' own tests 533. LIVE on the story container `twt-13-1f-pg` (:5484, never the shell's :5432): the domain field-worker unit + live specs with the appeal RLS and RBAC specs, 106 files / 2252 tests; API field-worker 15 files / 194; jobs field-worker 8 files / 227; `stream-concurrency.spec.ts` run three times. Gates: `microcopy:check`, `domain-invariants:check`, `field-worker-state:check`, `field-worker-ending-appeal:check`, `contracts:check-openapi-determinism` all pass. **NOT run:** the full `ci:local`; the full live domain and API suites (only the field-worker, RLS and RBAC directories); a browser pass; chunks C and D of this review (R2B-16 touches chunk C's API tests, so chunk C's review will read them as patched).

#### Round 2, chunk C (contracts, the API handlers and gate, the API and jobs tests, the CI wiring) - 2026-11-19

`bmad-code-review 13.1f`, BigDev: one chunk at a time, chunk C after B's patches. The working tree against the pinned `5ede00c4`, chunk C only: `packages/contracts` (src, the OpenAPI emitter script, tests), `apps/api` (the field-worker handlers, routes, gate and error map; the integration and unit tests) and `apps/jobs` tests, `.github/workflows/ci.yml`, `scripts/ci-local.sh`, `package.json` - 3,142 diff lines in 33 files, rebuilt AFTER chunks A's and B's patches (it holds the terminate version guard and R2B-16's API legs). `openapi/v1.yaml` is covered by its determinism gate. Blind Hunter (18), Edge Case Hunter (6) and Acceptance Auditor (8) all completed: 32 raw -> 23 unique after merging duplicates. **Triage: 1 decision-needed, 14 patch, 0 defer, 8 dismissed.** Three claims were settled by throwaway probes (deleted; nothing left in the tree): the 403 oracle below, an authorised Pariwar Admin on a live worker (no denial row reproduced in the test harness - see R2C-2), and which grant `authorize` picks for a super admin who is also a trustee. The Auditor found the code matches the spec on almost every traced point: the gates and holders per route, the pre-read versus under-lock split, strict bodies with no name / mobile / code, `state_event_version` on every lifecycle 200, the REQUIRED terminate version, the emitter's descriptions and error lists, the CI wiring, and the File List's 33 files.

- [ ] [Review][Decision][P2][R2C-1] The 403 on the per-worker and per-appeal routes tells a registering officer of ANOTHER district an ended worker's district and who ended them - sources blind + edge + auditor (C-BH-1, C-EC-1, C-AA-1) [`apps/api/src/modules/field-worker/gate.ts:164-165`, `:187-203`; `AuthorizationDeniedError.toErrorResponse` returns `details: this.denial`]. **Measured, not inferred** (a live probe as a District Admin of Patna, holding only an ended worker's id): lodge on a Gaya worker ended by a Pariwar Admin -> 403 with `permissionKey: field_worker.hear_ending_appeal_as_panel`, `targetLocator.value: "Gaya"`; on a Gaya worker ended by a District Admin -> `permissionKey: field_worker.hear_ending_appeal`, `"Gaya"`; on an unknown id -> `field_worker.hear_ending_appeal`, `null`. The same body for decide; and for the INHERITED routes (terminate on a Gaya worker -> `"Gaya"`, unknown -> `null`). So the 403 reveals (i) that the id exists, (ii) the worker's reporting district, and (iii) NEW in 13.1f, whether a Pariwar Admin / super admin (Panel-heard) or a District Admin (Pariwar-Admin-heard) ended them. **Why this is more than the inherited G27 / CR31 note** (recorded as "needs a request UUID the officer already holds"): the shown-number 409 (AD11) hands every registering officer the `field_worker_id` of each ended record of that number in ANY district - and AD11 promises "no name, no district, no officer" (the Panel's Q3 A: a date and a reason). Through the 403 the officer learns the district AND the ender's rank. Options: (A) **strip `details` from every 403 on the field-worker routes** - one `onSend` / error hook in the module's plugin scope, a bare `authz.forbidden`, identical for a missing, foreign and forbidden id (the shape `log?record=` already uses, G27 / TR19); closes CR31 for the whole module and the new hearer leak; the server-side denial audit is unchanged; cost: it changes the 13.1a-13.1d routes' bodies too and any client that reads `details` (the admin screens read the status and code - to be re-checked when patched); (B) strip `details` on the NEW 13.1f routes only - closes the hearer leak, leaves the district leak (and CR31) on terminate, log, code and the rest, which the id hand-out now amplifies; (C) stop returning `field_worker_id` in the 409 and hand back an opaque single-use handle for `link_to` - the officer then never holds another district's worker id; cost: a redesign of AD11 / AD12 (contract, handler, admin screen, tests) and the log still shows `previous_field_worker_id` to its readers (R2A-5); (D) accept it as the carried CR31 and record the amplifier; cost: the system shows more than the ruling allows. **Recommended: A.** **Panel gate (template section 0) - NOT routed:** the Panel already ruled the limit (a date and a reason, to the registering officer); the code exceeds it. Stripped of clause ids the sentence is "an officer shown a worker's id must not be able to ask the system which district they work in and who ended them" - the answer is already "no", so the question is the mechanism and the scope (BigDev's), not what the Trust may disclose. The Auditor flagged a possible Panel question and I did not take it. ⚠ A residual that A does not touch and the spec designed (AC5 (f)): a trustee lodging on a LIVE worker gets 409 `illegal_transition`, an unknown id 403 - so a role with no worker-read key can tell a live worker's UUID from an unknown one; I would leave it (the trustee is a hearer; the UUID is unguessable) unless you say otherwise.
- [x] [Review][Patch][P3][R2C-2] The hearer dispatcher's no-hearer branch invokes the Panel's hook first for everyone and discards every error it throws - sources edge + blind (C-EC-4, C-BH-5) [`gate.ts:196-203`]. `try { await asPanel(request); } catch { await asPariwarAdmin(request); }`: (i) for a Pariwar Admin (who does not hold the Panel's key) the first hook DENIES, and the denial callback (`auditAuthorizationDenied`) fires for a request that is not denied - an authorised officer lodging on a worker who is not terminated (a stale screen after an undo) leaves a Panel-key denial in the security stream (the test harness persists no denial rows at all - a control probe of a genuinely denied request wrote none - so this is established by the code and the callback, not reproduced); (ii) the bare `catch` swallows a DB or infrastructure error from the first hook and lets the second decide. Fix: ask whether the actor HOLDS the Panel's key with the pure predicate (no callback) before invoking its hook, and rethrow anything that is not an authorization denial; a DB-free dispatcher test with stub hooks (which hook is called for each hearer, and for none; an infra error is not swallowed).
- [x] [Review][Patch][P3][R2C-3] A pure date-shape refusal on lodge, decide and withdraw writes an audit intent line and its `_rolled_back` twin; terminate judges the same class BEFORE the wrapper and writes none - sources edge + blind (C-EC-3, C-BH-8, C-BH-9) [`ending-appeal-handlers.ts` lodge `receivedOn: body.received_on`, decide / withdraw `decidedOn: body.decided_on`, all inside `mutate`; contrast `lifecycle-handlers.ts` terminate `preCheck`]. `received_on: "2026-02-30"` or `"abc"` passes the contract (`z.string().max(32)`), every pre-read, then costs an audit PAIR; I7 says no audit line for an act that will not be attempted, and the CR12 precedent judges the pure shape in the pre-read and leaves the IST bounds to the command (the command still judges both - one judge of the bounds). Also the only lodge-date HTTP leg is masked by `appeal_open` and asserts no code. Fix: `isCalendarDateString` in each pre-read (no line), the command unchanged; legs: a malformed date on lodge (on a worker with no open appeal), decide and withdraw -> 422 `appeal_date_invalid`, NO audit line; a future date -> 422 WITH the pair (the bounds stay the command's); AD7's "the command answers 422 (one place)" amended.
- [x] [Review][Patch][P3][R2C-4] The Per-command table says register-with-link's `link_invalid` is a LOCKED check (intent line and twin); the code raises it BEFORE the audit wrapper and writes none, as AD12's text says - and no test pins either - source edge (C-EC-2) [`handlers.ts:245-252`; spec Per-command table "Register, link" row; `ending-appeal-race.spec.ts` leg (ii)]. The two spec texts disagree. AD12 governs (the re-check runs "in the scope transaction (open in `run` before `withCompensatingAudit`)"). Fix: the table row moves the check to the pre-read column (no audit line, `FOR SHARE` before the INSERT), and the race leg (ii) and the `wrong` link leg assert the audit count: no `field_worker.registered` line from the refused registration.
- [x] [Review][Patch][P3][R2C-5] `link_to` and the cross-Pariwar legs of AC10 / AC15 are partly missing over HTTP - sources blind + auditor (C-BH-3, C-AA-3) [`undo-appeal.spec.ts:423-425`, `:432-446`; Task 5.2]. The `link_to` leg's "wrong" record is a LIVE worker on a DIFFERENT number, so removing the number comparison keeps it green; never sent: a terminated record with a different number, an unknown uuid, another Pariwar's terminated record (AC10 (a)); another Pariwar's REAL worker id as `log?record=` (AC10 (c), a bare 403) and on `GET /:fieldWorkerId/ending-appeals` (AC15 (f)). Add each, with the control that the right record links.
- [x] [Review][Patch][P3][R2C-6] The appeal routes are registered AFTER the `/:fieldWorkerId` routes, against AD13 and Task 5.1, under a comment that says the opposite; and the route-table test can pass vacuously - sources auditor + blind (C-AA-7, C-BH-4) [`routes.ts:281`, `:291`, `:300` vs `:320-346`, the comment at `:309`; `undo-appeal.spec.ts:454-469`]. Behaviour is the same (a static segment beats a parametric one), but the stated order is not the built one. Fix: register the static `ending-appeals` routes before the first `/:fieldWorkerId` route; in the route-table test assert `read` is DEFINED (an absent rate limit makes `toBe(undefined)` pass for all three GETs) and say "four writes" (the loop lists four).
- [x] [Review][Patch][P3][R2C-7] The move race asserts `state_event_version: expect.any(Number)` where the point is the version read under the lock - source blind (C-BH-10) [`move-race.spec.ts:151`]. Compare it with the stored version (the control already reads the stored row).
- [x] [Review][Patch][P3][R2C-8] The race-matrix non-vacuity test checks arithmetic on hard-coded keys (4 x 3 - 4 = 8); deleting one of the four "staged above" legs leaves a hole and everything green - source blind (C-BH-12) [`ending-appeal-race.spec.ts:179-183`]. (R2B-16's own test.) Fix: one table of all twelve pairs, with no `STAGED` set; the non-vacuity assertion is the table's own size.
- [x] [Review][Patch][P3][R2C-9] The error mappings and the handler-owned lodge / decide pre-reads have no test: `field-worker-errors.test.ts` is untouched although Task 5.1 is `[x]`; `appeal_already_decided` appears at no API layer; the lodge's `ending_changed` and a closed appeal's pre-read have no HTTP leg - sources auditor + edge (C-AA-2, C-EC-5, C-AA-6) [`apps/api/tests/unit/field-worker-errors.test.ts`; `ending-appeal-handlers.ts:119-130` (lodge), `:205-212` (`preReadDecision`)]. Deleting the lodge's version or refused-count pre-read turns a no-audit 409 into an intent-plus-twin pair, and dropping a mapping row answers 500, with nothing red. Add: a table-driven unit test for every error class this story adds (status and code), `numberPreviouslyEndedError`, and `state_changed`; HTTP legs - a lodge with the OLD version -> 409 `ending_changed`, no appeal, no audit line; a lodge after a REFUSED appeal -> 409 `appeal_already_decided`, no audit line; a decide / withdraw on a closed appeal -> 409 `appeal_not_open`, no audit line (sequential, the pre-read's own).
- [x] [Review][Patch][P3][R2C-10] The three new reads have no HTTP proof of their defaults, clamp, hostile cursor or `Cache-Control: no-store`, and two gate branches are untested - sources edge + auditor (C-EC-6, C-AA-6) [`ending-appeal-handlers.ts:267-373`; `undo-appeal.spec.ts:357-396`]. The sibling lists pin `cursor_invalid` and `no-store` (`reads.spec.ts`, `move-requests.spec.ts`, `log.spec.ts`); these do not. Add: the default page size and the 25 clamp for the list, the eligible list and the per-worker read; a malformed, a canonical-but-out-of-range and a wrong-codec cursor -> 400, never 500; `no-store` on all three; the eligible list WITHOUT `district` for a District Admin -> 403 (AC15 (b)); a trustee holder lodging on a worker who is not terminated -> 409 `illegal_transition` (AC5 (f), the dispatcher's no-hearer branch - only the Pariwar Admin side is tested).
- [x] [Review][Patch][P3][R2C-11] AC9 (b), (d), (e) and (f) - the shown number's guarantees - have no leg, and (b) cannot fail as tested - sources auditor (C-AA-4, C-AA-5) [`handlers.ts:222-241`; `undo-appeal.spec.ts:401-403`, `lifecycle.spec.ts:264-267`]. (b) "a live holder answers `mobile_already_registered` FIRST" runs while the only record of the number is the live one, so swapping the two checks keeps it green - it needs a number with BOTH an ended record and a live holder; (f) the disclosure audit write failing must answer 500 with no `details` and disclose nothing (it is correct today only because `withCompensatingAudit` writes the line before `mutate` builds the 409 - a refactor could change that); (e) a retry of the first submit with the same key writes a second line (G20); (d) the route calls the key service to SEAL only, never to decrypt. Add all four (the audit failure by the same injection `code-read.spec.ts` uses).
- [x] [Review][Patch][P3][R2C-12] The OpenAPI text says "default 20" for three limits; only the caps are sync-tested - source blind (C-BH-15) [`emit-openapi.ts` (the list, eligible and per-worker descriptions); `field-workers.test.ts` sync-guard]. Give the contract a `..._DEFAULT_LIMIT` constant per read, have the emitter print it, and sync-test it against the domain's `PAGE_ENDING_APPEALS_DEFAULT_LIMIT` and `PAGE_APPEAL_ELIGIBLE_DEFAULT_LIMIT` as the caps are.
- [x] [Review][Patch][P3][R2C-13] The log item's `to_state` comment contradicts what the handler sends - source blind (C-BH-16) [`dto.ts:~283`; `log-handlers.ts:~86-89`]. The contract says it is "the state an event leaves the worker in (the undo's target), else null"; the handler sends it for every event that carries one, and the contract test uses it on a `registered` event. Reword the comment to what is sent. (The `as` casts on `cause` and `to_state` stay: the enums are sync-guarded against the domain's tuples.)
- [x] [Review][Patch][P3][R2C-14] The jobs "no decision" fence lists the five appeal commands and the table name but not the appeal projectors or the supersede helper, as it lists the move-request projectors - sources blind + auditor (C-BH-17, C-AA-8) [`field-worker-notice-email-no-decision.test.ts:50-70`]. The barrel does not export them today, so this is by analogy (the fence already names un-exported `projectFieldWorkerGenesis`); add `projectEndingAppealLodged`, `projectEndingAppealTransition` and `supersedeOpenEndingAppeal`.
- [x] [Review][Patch][P3][R2C-15] Tasks 5.1 and 5.2 are `[x]` and name files, helpers and legs that do not exist; the record never calls the folding a deviation - source auditor (C-AA-2, C-AA-3) [spec Tasks 5.1 / 5.2]. Task 5.2 names six API specs (`undo.spec.ts`, `ending-appeal.spec.ts`, `ending-appeal-reads.spec.ts`, `register-previous.spec.ts`, `terminate-hearer.spec.ts`, `log-link.spec.ts`) and fixture helpers for "a planted legacy terminated event" and "AC5 (c)'s planted open row"; everything was folded into `undo-appeal.spec.ts` and `ending-appeal-race.spec.ts`, and the planted legs live in the domain specs. Disclose it in the tasks' own records (a dated note, never an edit of the old text); the legs R2C-5, R2C-9, R2C-10 and R2C-11 add are what the task named.

**Dismissed (8) - recorded so a later round does not re-litigate them.** (1) C-BH-2, the register retry with the same Idempotency-Key after `number_previously_ended` may get stuck: AD11 says the officer re-submits "under a NEW idempotency key", a refused request is never stored by the idempotency layer (G20), and the admin's R1 regression test pins three submissions with three distinct keys. (2) C-BH-6, a super admin who is also a trustee is listed as eligible but refused on lodge: PROBED - `authorize` returns the pariwar `trustee_panel` grant in either grant order, so `assertNotGlobalPanel` is not tripped. (3) C-BH-7, the disclosure audit line records 200 for a 409, names only the newest ended id, and `previous_endings_seen` is self-attested: all three are recorded design - BigDev accepted the 200 variance ("Accept the 200 variance", v1.7), the locator names the newest id and the hash carries all of them (AD11), and the spec says a client that sends `true` unprompted skips the line. (4) C-BH-11, the harness `terminate` re-reads the version on every call: documented in the helper, it changes the body only when a spec omits the field, and no spec replays `terminate` under one key through it. (5) C-BH-13, the 409's `previous_endings` cap and order: the domain read clamps to 5 and orders as documented (asserted in the AC9 domain leg). (6) C-BH-14, `RegisterFieldWorkerRequest` became a refined schema: nothing calls `.shape`, `.extend`, `.pick` or `.omit` on it (searched `apps` and `packages`), and the Auditor confirmed the emitter's register description. (7) C-BH-18, the new CI job may not be a required check: `ci.yml` has no aggregate job - every invariant gate is a standalone job with `needs: install`, as 13.1d's move-request gate; required checks are branch-protection settings, not this file. (8) C-BH-5 (b), a terminated worker with no readable ending reaching a null hearer: unreachable except by owner-level corruption, and fail-closed anyway - the domain lodge throws `FieldWorkerProjectorInputError` before any write (the same reasoning as R2B-19).

**Load-bearing-invariant lens, chunk C (Auditor).** Families 4, 5, 7, 11 and 13 untouched. Covered-by-test: 1, 2, 12. REAL GAP: 3 (R2C-5: no real foreign-Pariwar id for AC10 (c) / AC15 (f)), 6 (R2C-1: a cross-district ended worker's district and the ender's rank leak through the 403), 8 (R2C-11: the fail-closed disclosure audit), 10 (R2C-9, R2C-15: Tasks 5.1 / 5.2 closed on files and legs that do not exist). Family 9: the `handlers.ts` call site cites AD11 and I7 but not the literal DELIBERATE phrase (R2A-4 added the block at the read). The record says the full `ci:local` last ran at `5044c61a`, before every round-1 and round-2 patch; none has run since.

#### Round 2, chunk C - patch resolution - applied 2026-11-19 and 2026-11-20

BigDev (2026-11-19): *"apply all the patches, I will decide later on question"* - R2C-2 to R2C-15 applied. **R2C-1 (the 403 on the per-worker and per-appeal routes) stays OPEN and was NOT touched**: no `details` was stripped, no route changed for it. Nothing is committed or pushed; the patches sit in the worktree on top of round 1, chunk A and chunk B.

**How this chunk was finished - read before trusting the table.** The 2026-11-19 session applied R2C-2, 3, 6, 7, 8, 12, 13, 14 and began R2C-11, then stopped at its usage limit with a RED-proof mutation of `handlers.ts` in flight. 2026-11-20 resumed it: (1) compared the tree with the chunk's 10:19 snapshot (11 tracked files and 2 untracked specs differed - exactly the patches above); (2) proved NO mutation was left behind - thirteen files byte-compared with their pre-mutation backups, and a content fingerprint of the whole tree outside `_bmad-output` (tracked diff against the pin plus every untracked file) identical before and after the re-proofs; (3) finished R2C-4, 5, 9, 10, 11, 15; (4) **re-ran every RED proof of the earlier patches itself** rather than citing the 2026-11-19 transcript, some of whose proof outputs were never seen. Each proof is ONE mutation applied by a script that requires its anchor text to occur exactly once, runs the live spec, restores the file and compares its hash; the column below is that run's result.

| Item | What was done | Evidence (RED = a single mutation of the code, the leg written for it goes red; every file restored byte-identical) |
|---|---|---|
| R2C-2 | The hearer dispatcher's no-hearer branch asks the PURE `holdsPermission(Panel key)` (`rbac/index.ts`; `routes.ts` passes `holdsPanel`) and runs exactly ONE hook; an error from either is never caught. `requirePermissionHook` and `holdsPermission` share one `permissionAskOf`. NEW `field-worker-hearer-dispatch.test.ts`: 12 DB-free tests over the real hooks with a capturing denial sink, and over stub hooks | RED: the old try / catch back -> 7 of 12 red; the predicate inverted -> 5; an infrastructure error turned into a "no" -> 2. Through HTTP (R2C-10): only the Pariwar Admin's hook, or only the Panel's -> the AC5 (f) leg red each. ⚠ **Not reproduced end to end:** the false Panel-key denial ROW in the security stream (the test harness persists no denial rows - recorded at triage); the unit test observes the callback through its sink |
| R2C-3 | `isCalendarDateString` judged in the lodge, decide and withdraw PRE-READS, before the audit wrapper; the command is unchanged. AD7 and the Per-command table amended. Three HTTP legs: malformed (three shapes) -> 422, no line, no row / appeal stays open; a FUTURE date -> 422 WITH the pair; a real date succeeds | RED: each of the three pre-read checks removed -> 1 leg red (three runs). Order note: the lodge's date check sits AFTER the open / refused checks, so a malformed date on a worker with an open appeal still answers `appeal_open` - the order the table gives |
| R2C-4 | The Per-command table's register-with-link row moves `link_invalid` to the pre-read column (AD12 governs). The race leg (ii), the AC10 "wrong" leg and R2C-5's AC10 (a) leg assert the audit count: a refused link writes NO `field_worker.registered` line | RED: `link_invalid` raised INSIDE the audit wrapper -> 3 red (race (ii), the "wrong" leg, AC10 (a)) |
| R2C-5 | Three HTTP legs in `undo-appeal.spec.ts`: AC10 (a) - `link_to` a terminated record of ANOTHER number, an unknown id, and another Pariwar's terminated record of the SAME number -> 422 `link_invalid`, no worker, no line, with the control that the right record links; AC10 (c) - another Pariwar's real worker as `log?record=` -> a bare 403; AC15 (f) - another Pariwar's real worker on the per-worker read -> 403 | RED: the number comparison removed -> AC10 (a) red (the first version's "wrong" leg stays green - the finding's point); `record=` accepting an id outside the chain -> 2 red; the per-worker gate failing open for a worker it cannot find -> AC15 (f) red. ⚠ **NOT separately provable:** the explicit `pariwar_id` predicate of `lockFieldWorkerForLink` - removing it leaves 31 / 31 legs green because FORCE row-level security already hides the foreign row (belt-and-braces over RLS, as R2B-7 recorded for the ended-by-number read; family 10: stated, not faked) |
| R2C-6 | The four static `ending-appeals` routes are registered before the first `/:fieldWorkerId` route, as AD13 and Task 5.1 order; the route-table test asserts the `read` limit is DEFINED, says "four writes", and a new order test (HEAD twins filtered) keeps the convention visible | RED: a parametric route registered before the static block -> the order test red; the read limit removed from the four GETs -> the new guard red. **The vacuity, shown:** the same mutation against the OLD test (guard deleted) stays GREEN |
| R2C-7 | `move-race.spec.ts` compares the 200's `state_event_version` with the stored version AFTER the holder's act, and asserts the act moved it past the pre-read's | RED: the 200 carrying `locked.stateEventVersion - 1` -> both CR10 legs red |
| R2C-8 | `ending-appeal-race.spec.ts`: ONE table of all twelve orders (four closing acts x three waiting acts), no `STAGED` set; the non-vacuity test pins the table's own size; each leg also checks where the worker was left | RED: one holder row deleted -> the size guard red (every other leg stays green); the under-lock NOT-OPEN refusal removed -> 15 legs red |
| R2C-9 | `field-worker-errors.test.ts`: every error class 13.1f adds (14 rows), `appeal_not_open`'s `state` detail, `numberPreviouslyEndedError` passed through unchanged, no id in any message. `undo-appeal.spec.ts`: lodge with the OLD ending version -> 409 `ending_changed`; lodge after a REFUSAL -> 409 `appeal_already_decided`; decide (both outcomes) and withdraw on a CLOSED appeal -> 409 `appeal_not_open` carrying its state - each with NO audit line and a control | RED, HTTP: the lodge's version pre-read removed -> 1 red; its refused-count pre-read -> 1; the decide / withdraw not-open pre-read -> 1. RED, unit: the `appeal_already_decided` row dropped, the `state_changed` row dropped, `appeal_not_open` losing its state, `link_invalid` answering 409 -> 1 red each. (A defect of this patch's own first draft, fixed: the `%i` title printed `NaN`.) |
| R2C-10 | NEW `ending-appeal-reads.spec.ts` (6 tests, an own 26-row dataset per read): the DEFAULT page of 20 and an over-cap `limit` CLAMPED to 25 (accepted, never refused) for the list, the eligible list and the per-worker read; a cursor walk meeting all 26 rows once; `no-store` on all three; six hostile cursors (not base64url, truncated, wrong keys, the 30th of February, month 13, an upper-case id) -> 400 `cursor_invalid` on both cursor reads, no audit line; the eligible list's own `ended_on` shape (a real timestamp with a time of day is refused there, and accepted by the list); AC15 (b) - the eligible list without `district` for a District Admin -> 403; AC5 (f) - a lodge on a live worker -> 409 `illegal_transition` for a trustee AND a Pariwar Admin, 403 for a District Admin | RED, 14 mutations, all caught: each default 20 -> 15; the contract's clamp removed; the cap raised to 40 in the contract AND both domain reads; the eligible keyset `<` -> `<=`; the eligible cursor's shape check; the codec's range check; the upper-case-id check; `no-store` dropped on each of the three reads; the list gate treating a missing `district` as the officer's own; each no-hearer dispatch branch |
| R2C-11 | NEW `register-previous.spec.ts` (API, 4 tests): AC9 (b) a number with BOTH an ended record and a live holder answers `mobile_already_registered` first, no disclosure line, and shows both once the live one ends; (e) a same-key retry writes a SECOND disclosure line; (f) the disclosure audit write failing -> 500, no `details`, nothing disclosed, no worker; (d) the key service is called to SEAL only | RED: the ended check before the live check -> (b) red; a same-key de-duplication -> (e) red (and (f), collaterally); the audit made best-effort -> (f) red; the route decrypting -> (d) red |
| R2C-12 | `FIELD_WORKER_ENDING_APPEAL_LIST_DEFAULT_LIMIT` in the contract; the emitter prints it in the three descriptions; the sync test binds it to both domain defaults | RED: the constant 20 -> 21 -> the sync test red. `contracts:check-openapi-determinism` run FORCED (not a turbo replay): deterministic, `v1.yaml` unchanged |
| R2C-13 | The log item's `to_state` comment says what the handler sends | comment only - nothing to prove |
| R2C-14 | The jobs "no decision" fence names `projectEndingAppealLodged`, `projectEndingAppealTransition` and `supersedeOpenEndingAppeal` | RED: each named in code in the notice-email sweep -> the fence red (2 tests each) |
| R2C-15 | Dated notes (the old text untouched) under Tasks 5.1 and 5.2: the folding of six named specs into two files, the two fixture helpers that never existed, and which cross-Pariwar legs were missing | record only |

**Also corrected here, not in the findings:** the File List lacked five files (`rbac/index.ts`, `field-worker-errors.test.ts`, and the three new specs) - added; the check is a script comparing every changed file with the list, 119 files, no entry without a change. ⚠ `rbac/index.ts` is OUTSIDE the chunk's reviewed diff (R2C-2 added it after the snapshot) and it refactors `requirePermissionHook`, which every gated route passes through: its diff was read here (the hook's order of checks and its `requirePermission` call are unchanged; `opts.dimension` is read per request, not once) and the shared path was exercised live in four other modules' gated-route specs, `ground-inspection` among them (the one caller of `resolveDimension`).

**Load-bearing-invariant lens, chunk C, after the patches.** Family 3: covered-by-test (R2C-5's three legs; the explicit Pariwar predicate of the link lock is NOT separately provable - above). Family 8: covered-by-test (`register-previous.spec.ts` (f); R2C-3 and R2C-9's no-line legs). Family 10: closed for R2C-9 and R2C-15 by tests and dated notes. Family 6: **R2C-1 OPEN** - a cross-district ended worker's district and the ender's rank still reach any officer holding an id through the 403.

**Validation (2026-11-20).** `tsc --noEmit`: 0 errors in the API, contracts and jobs. ESLint on the 35 changed `.ts` files there (26 / 5 / 4): clean. DB-free: contracts 1,724 (96 files), API 1,198 (96 files; 2,101 DB-only tests skipped), jobs 1,430 (60 files). LIVE on the story container `twt-13-1f-pg` (:5484, never the shell's :5432): the whole API `field-worker` directory 17 files / 218 tests; the jobs field-worker tests 8 files / 227; four other modules' gated-route specs (`memorial/actor-denial`, `claims/certificate-reminder`, `claims/fraud-investigation-routes`, `claims/ground-inspection`) 4 files / 76. Gates: `contracts:check-openapi-determinism` (forced), `field-worker-ending-appeal:check` (2,015 files, 6 allowlisted writes), `field-worker-move-request:check`, `field-worker-state:check`, `microcopy:check`, `domain-invariants:check` - all pass. **NOT run:** the full `ci:local`; the full live API and domain suites (only the directories above); the domain and admin suites (no file of either changed this round - the domain's `commands.ts` and the contracts' / API's source were only mutated and restored byte-identical); a browser pass; chunk D of this review.

#### Round 2, chunk D (the admin screens) - 2026-11-20

`bmad-code-review 13.1f`, BigDev: one chunk at a time, chunk D after C's patches (`start chunk D`). The working tree against the pinned `5ede00c4`, chunk D only: `apps/admin` - 22 files (the hooks and the client, the Appeals page, the appeal actions, the lodging form, the per-worker appeal panel, the register page, the actions, the history, the copy table, the router, six test files), three of them new and untracked - 2,133 diff lines (+1,410 / -52), rebuilt AFTER chunk C's patches. Blind Hunter (21), Edge Case Hunter (12) and Acceptance Auditor (9) all completed, read-only: 42 raw -> 28 unique after merging duplicates. The tree fingerprint (every tracked and untracked file, this story included) was identical before the layers launched and after they returned. **Triage: 1 decision-needed, 20 patch, 0 defer, 7 dismissed** (then, 2026-11-20, at BigDev's word the one decision-needed, R2D-1, became a **defer - routed to the Panel**: 0 decision-needed, 20 patch, 1 defer, 7 dismissed). **The Panel then ruled (option A, `2026-11-20-466`) and that one defer is DISCHARGED - with no change to the code.** Every claim was re-read against the code before it was bucketed (the stale-error unmount path, the query-client defaults and `focusIsUnclaimed`, the register page's submit and fieldset, `fieldWorkerGuidance`'s resolution order, the appeal-act hook's `onError`, the stale-code set, who can reach Approve and End, and a grep for every test the Auditor said was absent). **No finding is a wrong write or a wrong disclosure by the server** - the five P2s are things an officer would read, miss or press on this screen. R2C-1 (the 403's `details`) is still BigDev's open decision and is not touched here.

- [x] [Review][Defer][P3][R2D-1] After an ending recorded for a DEATH, the screen tells the officer "Tell the worker. If they disagree, they can appeal." - source blind (D-BH-9) [`WorkerActions.tsx` (the `act === 'end'` announce), `i18n-en.ts:175` `fw.actions.tell.end`, `fw.actions.end.final` at `:165`]. The reminder is built for every End regardless of `reason`; `died` is an End reason (`-454` Q5 A, built by `-455`), and the Panel's own note lists "they died" among the reasons an ending happens - yet neither its Q3 nor `-465` says anything about what the reminder means for a death. So an officer who has just chosen "Date of death" is told to tell the worker and that they can appeal, and the confirm line before it says "a worker who disagrees can appeal". **Why this is a decision and not a patch:** AD14 says "what a line says about who is paid or told is NOT [the author's]", and `-465` Q3 A (b) ratified the reminder "at an ending" - so dropping or rewording it for `died` NARROWS a ratified clause, and who is told when a worker has died (nobody? the family or nominee?) is what the Trust owes a family. **The one fact that decides it:** the Panel's note names death as a reason an ending happens and still ruled ONE reminder "at an ending"; the record does not say whether it meant that to cover a death (then the line is as ruled and only its awkwardness remains) or never considered it. ⚠ An earlier draft of this item said the reason was added AFTER Q3 and that Q3 was asked about a worker who can be told - both were wrong against the note and the decision dates, and are corrected here. **Options:** (A) leave as built - cost: a line that is nonsensical in the one case where the officer is most careful; (B) for `died` show a neutral line ("Their engagement has ended.") and no reminder, and drop "a worker who disagrees can appeal" from that confirm - cost: no prompt to tell anyone, and it narrows Q3 A (b) for one reason by the author's hand; (C) put the question to the Panel in a routing note: who, if anyone, an officer is reminded to tell when the ending is a death, and whether anyone may appeal it - cost: Panel attention for a copy line, and nothing changes until it rules. **POSSIBLE PANEL QUESTION**, one sentence stripped of every id: *"When we record that a field worker has died, who, if anyone, should the officer be reminded to tell, and may that person appeal the ending?"* **Panel gate (template section 0) - NOT routed by the reviewer:** the strip test cuts both ways (the current line would embarrass us in front of a trustee, which says it is ours to fix; but the fix is a choice about who is told, which is theirs), so it is BigDev's to route or to take as B. The engineering half - the copy must not say "the worker" after a death - is not in doubt; what replaces it is. Server side nothing changes either way (an appeal on a `died` ending is allowed today, and an undo remains the remedy for a death recorded in error). **DEFERRED to the Panel 2026-11-20 (BigDev: "route to panel").** Reason: *awaiting Panel - what an officer is reminded to tell when the ending is a death.* The note is **PREPARED (2026-11-20), READY FOR BigDev TO SEND, NOT SENT** (`_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-11-20-story-13-1f-death-ending-reminder.md`; its E4 commands were run - one found wrong and fixed: an unanchored decision-id grep matched three headings - and re-run verbatim from the file after the code under it changed, which also moved the line numbers its E3 cites). **Nothing in the code changes** until the Panel rules. ⚠ **The note's options and our reading are NOT this item's.** Drafting it turned up a fact the item missed: `-454` Q5 ruled that a death is recorded "on what they have been told" and that "a death recorded wrongly is put right under Question 1" - so the person the line speaks to may be a living worker wrongly recorded as dead, which is exactly when "Tell the worker. If they disagree, they can appeal." matters. The note therefore asks A (as ruled, **our reading**), B (reworded for a death so it is true either way), C (no reminder after a death); the "neutral line for a death" this item first offered is C, and we no longer suggest it. Carried at `deferred-work.md` (code review of 13-1f, chunk D, R2D-W1) and as an open item on roster Row 52. When the Panel rules, a decision id, then this item DISCHARGED - never deleted. ✅ **DISCHARGED 2026-11-20 by [Decision 2026-11-20-466](../../.decision-log.md#decision-2026-11-20-466):** BigDev sent the note and relayed the ruling - *"by DR and KB / option A"* - so the reminder STANDS after a death, exactly as built: no patch, no row, nothing changed in the code (⛔ not "fixed"; the deferral is discharged by the ruling). ⚠ **NOT covered by the ruling** (stated in the entry): the End confirm line (the same clause in the same words, left as built), a family's being told of a death, and who may appeal for a worker who has died. This item's own first options (A leave, B a neutral line, C route) are superseded by the note's A / B / C, and its first reading - drop the reminder for a death - was NOT adopted.
- [x] [Review][Patch][P2][R2D-2] The line that explains a STALE refusal is rendered inside the node the same refusal's refresh unmounts or re-keys, so the officer never reads it - sources blind + auditor + edge (D-BH-1, D-BH-3, D-AA-3, D-EC-5) [`AppealActions.tsx:46-50` (`setProblem(g)` in local state), `LodgeAppealForm.tsx:39-42`, `AppealsPage.tsx` (the open-only row `{a.state === 'open' && <AppealActions .../>}` and the eligible `<li key=...:ending_event_version>`), `WorkerAppeals.tsx:48` (`key={fieldWorkerId}:{state_event_version}`), `hooks.ts` appeal-act `onError`]. The browser pass moved the SUCCESS line to the page (`onDone` / `onLodged` -> `outcome`); a refusal still sets local state. **Decide:** officer A presses Allow on an appeal officer B already decided; 409 `appeal_not_open` -> `onError` invalidates the appeals list -> the list refetches without that appeal -> the row, its form and its `role="alert"` unmount within one round trip; nothing at page level says anything, so the row simply vanishes, exactly as after a success. **Eligible lodge:** `illegal_transition` or `ending_changed` -> the candidate's row drops or its key changes -> the form goes with its line. **Find lodge:** `ending_changed` re-reads the identity, `state_event_version` changes, the keyed form REMOUNTS - the chosen channel and date reset and `fw.err.endingChanged` lived for a few milliseconds; R5's test asserts only that the form is fresh (`via === ''`), never that the officer is told. Fix: report a stale refusal to the PAGE / PANEL status region (the way `outcome` is reported), kept until the next act; tests for decide, eligible lodge and Find lodge that read the line AFTER the refetch, RED-proved by dropping the report.
- [x] [Review][Patch][P2][R2D-3] The register page's shown-number list is neither announced nor explained - sources blind + auditor + edge (D-BH-4, D-AA-1, D-EC-1) [`RegisterFieldWorkerPage.tsx:96-101` and the fieldset at `:202-219`, `i18n-en.ts:235-237`]. On the 409 the page does `setPrevious(...); setLinkTo(null); headingRef.current?.focus(); return;` - no `setProblem`, no `role="status"`, and the only copy keys are the legend, the line and the link. A screen-reader officer hears only the page heading; a sighted officer sees an unexplained fieldset and no sentence saying the worker is NOT YET REGISTERED or that pressing the same "Register" button again registers them. The second press carries `previous_endings_seen: true`, so the disclosure AD11 / `-454` Q3 A meant to ACKNOWLEDGE ("the officer still decides") can be passed without ever being perceived. Family 13 (d) REAL GAP. Fix: a line in a `role="status"` region ("This worker is not registered yet. This number belonged to ...; choose whether to link, then press Register again."), focus to it or to the fieldset legend; one copy key; an RTL leg that the line is present and is in a live region, and that the first press did not register. (AD14's wording is the author's; the line says nothing about who is paid or told.)
- [x] [Review][Patch][P2][R2D-4] On the appeals screens a 409 `illegal_transition` or `authorization_stale` shows the APPROVALS copy - sources auditor + edge (D-AA-2, D-EC-4) [`derive.ts:54-55`, `i18n-en.ts:82` `fw.approvals.alreadyDone` ("This worker is already approved, or is no longer awaiting approval."), reached from `LodgeAppealForm.tsx:40` and `AppealActions.tsx:47`]. `fieldWorkerGuidance` checks `BY_CODE` after the 401 / 403 / 429 specials, so the appeals surface has no override; `actGuidance` and `requestGuidance` exist precisely because that copy is wrong off the Approvals page. **Lodge:** officer A has Find or the eligible list open, officer B undoes the ending; A presses "Record the appeal" -> 409 `illegal_transition` (the lodge pre-read refuses a worker who is no longer `terminated`) -> A is told the worker is "already approved". AC12 asks that `illegal_transition` "show their line and refresh"; no test sends it through a lodge or decide form. Fix: an `appealGuidance` (as `actGuidance`) with a line that says the ending has changed / is no longer in force, and the refresh; tests through the lodge form and the eligible list.
- [x] [Review][Patch][P2][R2D-5] A 403 on an appeal act shows the READ page's line, which sends a Pariwar Admin to "ask a Pariwar Admin"; Find offers "Record an appeal" without knowing who hears the ending - sources edge + auditor (D-EC-2, D-AA-4) [`AppealActions.tsx:47`, `LodgeAppealForm.tsx:40`, `derive.ts` `NO_ACCESS_KEY.appeals` -> `i18n-en.ts:254` `fw.appeals.noAccess` ("... Choose a district you manage, or ask a Pariwar Admin."), `WorkerAppeals.tsx:23`; spec Task 6.2 and AC5 (b)]. The list is filtered by hearer only for a `trustee_panel`-only reader (AC15 (a)), so a Pariwar Admin sees Panel-heard OPEN appeals with live Allow / Refuse / "The worker withdrew" buttons; pressing one is a 403 (`requireEndingAppealHearer` takes the `asPanel` branch) and the officer reads "ask a Pariwar Admin" - they are one. The same for "Record an appeal" on a Panel-heard ending, and a District Admin who holds only `read_ending_appeals` gets it on every act. The row KNOWS who hears it (`appeal.heard_by`; the eligible candidate carries `heard_by`); Find's identity does not. Fix: act-specific no-access lines (the `fw.actions.noAccess.*` / `fw.requests.noAccess.*` convention, CR11): for decide / withdraw / eligible lodge say who hears THIS appeal ("The Trustee Panel hears this appeal." / "A Pariwar Admin hears this appeal."); for Find's lodge a hearer-agnostic line that is true for both. **Spec note to record with the patch:** Task 6.2 says the panel "offers 'Record an appeal' to a hear-key holder"; the module's convention (AD8, restated in the new files' headers) is NO client-side role gate - the server answers 403 - so Task 6.2's wording is met by the server, not the client; a dated note under Task 6.2, the old text unedited.
- [x] [Review][Patch][P2][R2D-6] Returning to the tab can move focus from Undo's Cancel to its Confirm, so Enter on "Cancel" confirms - sources blind + edge (D-BH-10, D-EC-11) [`WorkerActions.tsx:143-145` (`focusIfUnclaimed(confirmRef.current, formRef.current, ...)` re-run on every `undoCheckReady` change), `hooks.ts` `useFieldWorkerEndingAppealsOf` (no `refetchOnWindowFocus: false`; every sibling hook opts out)]. **Confirmed:** `createQueryClient` leaves `refetchOnWindowFocus` on with `staleTime: 0`; `focusIsUnclaimed` counts focus anywhere INSIDE the form (Cancel included) as unclaimed. Officer opens Undo, tabs to Cancel, switches window and back -> the shared appeals read refetches -> `fetchStatus` leaves `idle` then returns -> `undoCheckReady` false -> true -> the effect re-runs -> focus moves to Confirm. Enter or Space meant for Cancel confirms an undo of an ending. (The read carries no name, so opting out of focus refetch is about stability, not PII.) Fix: `refetchOnWindowFocus: false` and `refetchOnReconnect: false` on that hook, and move focus to Confirm only on the FIRST ready transition per opening (a ref); RTL leg that a refetch with focus on Cancel leaves focus on Cancel, RED-proved.
- [x] [Review][Patch][P3][R2D-7] 409 `appeal_open` and `appeal_already_decided` refresh nothing, so a second officer's form stays and every retry returns the same 409 - source edge (D-EC-3) [`hooks.ts` `fieldWorkerListIsStale` (the set lists `appeal_not_open` but not its two siblings) and the appeal-act `onError`]. Admin A lodges for worker X; admin B's Find panel or eligible list still offers X; B's lodge answers `appeal_open` (or `appeal_already_decided` after a refusal) with a true line, but neither the per-worker read nor the eligible list is invalidated, and the eligible list has `refetchOnWindowFocus: false` and `refetchOnReconnect: false`, so it never self-corrects. Fix: add both codes to the set (they are appeal-only codes); leg per code that the list or the form refreshes.
- [x] [Review][Patch][P3][R2D-8] `number_registered_again` tells an appeal's hearer to "undo this ending" - source auditor (D-AA-5) [`derive.ts:82`, `i18n-en.ts:183` `fw.err.numberRegisteredAgain`; spec Errors table: "undo, or an allowed decision"]. One `BY_CODE` row feeds both the undo and `AppealActions`. AC6 (b): Allow is refused 409 and the appeal stays open; the right next step is to end that registration and decide AGAIN. A Trustee Panel hearer cannot undo (that key is the Pariwar Admin's), and a Pariwar Admin who follows the line closes the appeal as "no longer needed" instead of allowing it. Fix: the appeal surface's own line ("... End that registration first, if it was made in error, then decide this appeal again."), leg through `AppealActions`.
- [x] [Review][Patch][P3][R2D-9] Error lines are never cleared when the officer corrects the field or switches the act - source blind (D-BH-12) [`AppealActions.tsx:59,77,88`; `LodgeAppealForm.tsx:53,63`]. `setProblem(null)` runs only inside `submit`. A 422 "Choose a real date" stays after the date is fixed; Cancel and then Refuse shows the old Allow error inside the new form. `WorkerActions` already clears value errors on edit (`clearValueProblem`) - inconsistent. Fix: clear on edit and on opening another act (keep "no access" and "sign in" lines, as `clearValueProblem` does).
- [x] [Review][Patch][P3][R2D-10] The decision date can be edited while the decision is in flight, and a retry then goes out with a NEW key and a different date - source blind (D-BH-11) [`AppealActions.tsx:77`]. `LodgeAppealForm` holds its fields (`readOnly={busy}`, `if (!inFlight.current)`); `AppealActions` does not. A lost response keeps the key (retryable), but the edit changes the body, `attemptKey` mints a new key, and the second request carries D2; if the first had committed, the second gets `appeal_not_open` and the record keeps D1, a date the officer had already changed. Fix: hold the date (and the act buttons) while busy, as the lodge form does; a leg.
- [x] [Review][Patch][P3][R2D-11] Focus is lost on the Appeals surface where the module's convention keeps it - sources auditor + edge (D-AA-9, D-EC-7, D-EC-8, D-EC-9) [`AppealActions.tsx:44,85,88`; `AppealsPage.tsx:97-101` (the list's "Load more"); `WorkerActions.tsx:313` and `WorkerAppeals.tsx:33` ("Try again" on the appeals checks); the models: `WorkerActions.tsx:396-398`, `MoveRequestActions.tsx:51-58`, `WorkerDetail.tsx` / `WorkerHistory.tsx` (CR42)]. Confirm and Cancel go `disabled` while saving (the module uses `aria-disabled` because a disabled focused control loses focus); Cancel and a finished decision unmount the form with no focus move; the list's "Load more" is `disabled` while fetching and unmounts on the last page (the eligible list on the same page already uses `aria-disabled`, a count notice and `focusIfUnclaimed`); the two "Try again" buttons refetch without moving focus first, and the errored query returning to pending unmounts the alert that held it. A keyboard or screen-reader officer ends on `<body>`. PLAUSIBLE on browser behaviour (the module's own comments document it); the code differs from its siblings. Fix: as the siblings - `aria-disabled`, focus into the form on open and back to the opener on Cancel, the page heading on success, focus before `refetch()`; legs that do not rely on jsdom's disabled-button focus (it keeps it).
- [x] [Review][Patch][P3][R2D-12] A failed first page of the Appeals list or of the eligible list has no retry control - source edge (D-EC-6) [`AppealsPage.tsx:74-78`, `:114-118`; the hooks set `retry: false`, `refetchOnWindowFocus: false`, `refetchOnReconnect: false`]. A 503 `decrypt_unavailable` or a 429 is `retryable: true` and the copy says "try again shortly", but there is no button (`WorkerList.tsx:110-121` and `MoveRequestsPage.tsx:153,168` have one). While `recording` is true "Record an appeal" is hidden, so the only way back is the district picker. Fix: "Try again" when `retryable`, with focus kept in the panel; a leg.
- [x] [Review][Patch][P3][R2D-13] The appeal date controls have a `max` but no `min`, though the server's lower bound is in hand - source edge (D-EC-10) [`AppealActions.tsx:77`, `LodgeAppealForm.tsx:53`]. The server refuses `decided_on < appeal.received_on` and `received_on < the registration day` with 422 `appeal_date_invalid` ("Choose a real date within the days allowed" - it names neither bound nor which date); the End form already sets `min`. Fix: decide / withdraw `min = istDateOf(appeal.received_on)`; Find's lodge `min = istDateOf(worker.created_at)`; the eligible list's candidates carry no registration day, so there the server stays the only judge (say so in a comment).
- [x] [Review][Patch][P3][R2D-14] "Link to an earlier record" uses checkboxes that behave as one choice - source blind (D-BH-13) [`RegisterFieldWorkerPage.tsx:207-209`]. Ticking the second record silently unticks the first; a screen reader gets no "one of" semantics and cannot tell which single record will be linked. Fix: a radio group in the fieldset with a "Do not link" choice (default); the RTL leg for two earlier records.
- [x] [Review][Patch][P3][R2D-15] Per-row forms and buttons are not named by their worker - source blind (D-BH-14) [`LodgeAppealForm.tsx:50,65`, `AppealActions.tsx:60`]. With 20 eligible workers or many open appeals a screen-reader officer hears "Record the appeal" / "Allow" / "Refuse" / "The worker withdrew" repeated with no name, and a mis-targeted Allow or Record is easy. Fix: an accessible name that carries the worker's name (already on the row; no new disclosure); `aria-label` or `aria-describedby` on the row's heading; a leg that two rows give two distinct names.
- [x] [Review][Patch][P3][R2D-16] The screen-reader count reads "1 appeals shown." and "0 appeals shown." - source blind (D-BH-20) [`i18n-en.ts:275` `fw.appeals.recordsLoaded`; `AppealsPage.tsx`, `WorkerAppeals.tsx`]. No singular form, although the eligible list has `moreCandidateOne`; it is announced after every load, together with the outcome line. Fix: one / other keys (and a zero line).
- [x] [Review][Patch][P3][R2D-17] The new client functions are exercised by no admin test over a stubbed `fetch`, and Task 6.3 is `[x]` for tests that do not exist - sources blind + auditor + edge (D-BH-18, D-AA-6, D-EC-12) [`apps/admin/src/api/client.ts` (undo, lodge, decide, withdraw, list, eligible, per-worker, `getFieldWorkerLog`'s `record`); `field-worker-lifecycle-client.test.ts` (touched only for terminate's version); spec Task 6.3; family 10]. `grep` for `undo-ending` and `ending-appeals` over the file returns 0; every page test replaces the client with `vi.fn()`, and `AppealActions`' withdraw branch is executed by no test. The file's own header says "The page tests mock the client module, so nothing in them could see what reaches the wire." A wrong path, a missing `encodeURIComponent`, a dropped `record`, a mis-keyed query or a missing `Idempotency-Key` passes everything here and fails only against the server (the paths were checked by hand against `routes.ts` and match). Task 6.3 names `field-worker-{undo,appeals,register-previous}.test.tsx`, `field-worker-history.test.tsx` and `field-worker-register-page.test.tsx`: the work was folded into `field-worker-undo.test.tsx` and `field-worker-review-regressions.test.tsx` with no dated deviation note (R2C-15's shape). Fix: a wire test per function (URL, method, `Idempotency-Key`, body and query, the 4xx envelope), RED-proved by mutating a path / key; a dated note under Task 6.3.
- [x] [Review][Patch][P3][R2D-18] AC12 legs that no test can fail - source auditor (D-AA-7) [`field-worker-actions.test.tsx:307-312` (the 403 table has no `undo` row), `field-worker-undo.test.tsx` (the Appeals page test drives only Allow), `field-worker-review-regressions.test.tsx`; family 3]. Verified by grep over `apps/admin/tests`: nothing mentions the state filter (`fw-appeals-filter`), `fw-appeal-refused`, `fw-appeal-withdrawn`, `fw.actions.noAccess.undo`, `fw.appeals.done.refused` / `.withdrawn`, or `withdrawFieldWorkerEndingAppeal`; AC12 lists them as required legs, and a lodge form's retry key resetting when worker B opens is tested only for the undo form. `actGuidance` builds the no-access key by template, so a deleted `fw.actions.noAccess.undo` falls back silently. Fix: the 403 line for Undo; the state filter; refuse and withdraw with their "Tell the worker." line; the lodge form's key reset on worker B; RED-proved.
- [x] [Review][Patch][P3][R2D-19] The R2A-2 admin test's title says it "re-reads the worker" and asserts no re-read - sources blind + auditor (D-BH-17, D-AA-8) [`field-worker-actions.test.tsx:358-368`, `hooks.ts:3189-3191`; the R2A-2 patch-resolution row cites "admin: the body and the stale 409" as evidence; family 10]. The body asserts the stale text, the sent version, an empty `actButtons()` and one terminate call. Removing `|| err.code === 'field_worker.state_changed'` from the identity invalidation leaves every test green, so after a stale End the identity (and its version) stays out of date until the panel is reopened. Fix: assert the identity read is called again and the next End sends the NEW version; RED-prove by removing the branch; correct the patch-resolution claim if the proof differs.
- [x] [Review][Patch][P3][R2D-20] Date assertions on decide and lodge cannot fail on a wrong or empty date - source blind (D-BH-16) [`field-worker-undo.test.tsx:223,229`; `field-worker-review-regressions.test.tsx` lodge assertions]. `{ outcome: 'allowed', decided_on: expect.any(String) }` and `received_on: expect.any(String)` match `''` and any wrong day, so a regression in `istTodayInBrowser` (a UTC date between 00:00 and 05:30 IST) or a dropped date still passes; "today in India" is never pinned. Fix: pin the clock (a fake system time between 00:00 and 05:30 IST) and assert the exact IST day sent.
- [x] [Review][Patch][P3][R2D-21] The `ending_changed` retry test synchronizes on a call count, not on the rendered version - source blind (D-BH-19) [`field-worker-undo.test.tsx:162-166`]. `getFieldWorkerIdentity` being called twice does not mean the new version has been rendered into `worker`, and `toBeEnabled()` is already true after the error, so it is no barrier; the final "names version 6" holds only if the refetch lands and renders before the click. It passed every run so far - timing luck, sensitive to scheduler changes. Fix: wait on something that only exists once version 6 is rendered (resolve the identity mock's second promise and flush), RED-proved by delaying the mock.

**Dismissed (7) - recorded so a later round does not re-litigate them.** (1) D-BH-2, `appeal_not_found`'s line says the list "has been refreshed" while the stale set does not include it: TRUE as code, but the API's own comment says a missing appeal answers 403 at the gate and "appeals are never deleted" - the 404 is a lost race that cannot happen; the same reasoning as R2B-19. (2) D-BH-5, the register page shows an earlier record's end date and reason to the registering officer: this IS `-465` / `-454` Q3 A ("a date and a reason", "information only - the officer still decides"); the "same person" choice for any earlier record is the ruled design. (3) D-BH-6, Undo is gated on the informational appeals read: the deliberate R6 repair (the officer must learn of an open appeal before confirming); the read answers 200 with an empty list for a worker with no appeal, a Pariwar Admin holds the read key, so only a retryable 429 / 5xx / network failure can block it, and then the "Try again" is offered. (4) D-BH-7, End sends a stale `expected_state_event_version` after Approve: TRACED UNREACHABLE - Approve exists only on the Approvals page, `WorkerActions` (End) only on the Find page, and Approve already `removeQueries` the worker's identity (`ApprovalsPage.tsx:55`). (5) D-BH-8, "Tell the worker." after recording that the worker withdrew: ratified by name - AD14 and `-465` Q3 A (a) list "after an undo, an appeal decision or a withdrawal". (6) D-BH-15, linked history needs two clicks: the nested panel is the same explicit-click `WorkerHistory` (each log read is its own act) and R4's test pins the two-step path. (7) D-BH-21, a 409 `number_previously_ended` whose `details` fail to parse leaves the officer stuck: the schema is the shared contract the same server answers under, and the failure is visible (the generic line names the code), not silent; a contract drift would fail the OpenAPI / contract tests first.

**Load-bearing-invariant lens, chunk D (Auditor).** Families 4, 5, 7, 8, 9 and 11 untouched. Covered-by-test: 1 (`field-worker-actions.test.tsx` "the acts by state"), 2 (the R1 regression's three keys; the `ending_changed` retry), 12 (every id the admin sends comes from a server payload; R1, R4, R5). Covered-by-construction: 6 (name-bearing hooks set `gcTime: 0`; the per-worker read carries no name; the register page's `previous` list holds ids, dates and reason codes only). REAL GAP: 3 (R2D-18: Undo's 403 line has no leg), 10 (R2D-17, R2D-19: Task 6.3 closed on tests that do not exist; the "re-reads" claim), 13 (R2D-3, intent (d): a state the AC ratifies as reachable - the shown number - is not announced; R2D-2 and R2D-11 are the same family). Intents (a) - labelled landmarks are real `form` / `section` / `nav` - and (c) - every control is a real `button` or `Link` - hold; (b) is not touched. The record says the full `ci:local` last ran at `5044c61a`, before every round-1 and round-2 patch; none has run since.

#### Round 2, chunk D - patch resolution - applied 2026-11-20

BigDev chose "1" (apply every patch): **R2D-2 to R2D-21, twenty items**. R2D-1 (what the End reminder means after a death) is **DEFERRED to the Panel** - the routing note is PREPARED and READY TO SEND, NOT SENT, and nothing in the code changed for it. **Update, the same day: BigDev sent it and the Panel ruled option A (`2026-11-20-466`, "by DR and KB / option A") - R2D-1 is DISCHARGED, and still nothing in the code changed, because option A is "as built".** **R2C-1 is still OPEN** and was not touched. Nothing is committed or pushed; the patches sit in the worktree on top of rounds 1, A, B and C. Only `apps/admin` changed.

**The design, once, because twelve of the twenty share it.** (1) One guidance function for the appeal's three writes, `appealGuidance(error, { act, heardBy })` in `derive.ts`: its own line for a 403 (who hears THIS appeal), for `illegal_transition` / `authorization_stale` (the ending changed), for `appeal_open` / `appeal_already_decided` (+ "the list has been refreshed") and for `number_registered_again` ("decide this appeal again"). It sets `stale` for exactly the codes whose refresh unmounts or re-keys the node that raised them (`fieldWorkerListIsStale`, which gained `appeal_open`, `appeal_already_decided` and `appeal_not_found`). (2) A refusal flagged `stale` is NOT kept in the row or form: `AppealActions` and `LodgeAppealForm` hand it to their page (`onStale`), which says it in a `role="alert"` region mounted EMPTY (`fw-appeals-stale`; Find's `fw-worker-appeals-stale`) and clears it on the next attempt (`onAttempt`), a success or a district change. (3) The module's focus convention on the new controls: `aria-disabled`, never `disabled`, while saving; focus into a form that opens and back to its opener on Cancel; the page's heading when a row leaves with its act; focus first on every "Try again".

| Item | What was done | Evidence (RED = ONE mutation of the source, the leg written for it goes red; every file restored byte-identical; counts are distinct mutations) |
|---|---|---|
| R2D-2 | The design above, (2). `field-worker-appeals.test.tsx` reads each line AFTER the refresh: decide `appeal_not_open` (the row leaves, the line stays), the eligible lodge, Find's `ending_changed` (the form is rebuilt and the panel still says why - R5's own test gained that assertion), and a new attempt clears it WHILE IN FLIGHT (a success would also clear it and hide a missing clear) for the decide row, the eligible lodge and Find | RED, 7: a stale refusal kept in the row's state; in the lodge form's state; the page region never filled; Find ignoring it; and each of the three attempt-clears removed |
| R2D-3 | The register page: a status region mounted EMPTY at the top of the form; "This worker is not registered yet. {One earlier record holds / N earlier records hold} this number. Read it below, choose whether to link, then press Register again." arrives into it and takes focus (an effect on the list, ⛔ the page heading); editing the mobile takes it away. `field-worker-register-previous.test.tsx` (new, named by Task 6.3) | RED, 4: no focus; not a live region; an empty line; a wrong count |
| R2D-4 | `appealGuidance`: `illegal_transition` and `authorization_stale` on an appeal say the ending changed and the list is refreshed - ⛔ "already approved" / "moved". Tested through the eligible lodge and the decide row | RED, 2: each of the two codes falling back to the approvals' row |
| R2D-5 | A 403 names who hears THIS appeal (`appeal.heard_by` for decide / withdraw, the candidate's `heard_by` for an eligible lodge); Find, which does not know, says something true of both hearers; the READ page keeps its own "choose a district" line (control). A dated note under Task 6.2 says its "to a hear-key holder" is met by the server, as AD8 | RED, 4: decide / withdraw without the hearer; the lodge form without it; the eligible list not passing it; an unknown-hearer lodge showing the read page's line |
| R2D-6 | The appeals check no longer refetches on window focus or reconnect (as every sibling); Undo's Confirm takes focus ONCE per opening, and only from the form itself, the Undo button or the body - ⛔ from Cancel or any control the officer has reached. Four legs, the refetch HELD open so the form is seen going not-ready and ready again | RED, 4: the opt-out removed; the "not from a child control" guard alone removed (the slow-check leg); the once-per-opening guard alone removed (the form-parked leg); both removed. ⚠ **Found by the proofs:** the first two refetch legs used a mock that resolved at once, React never saw the form go not-ready, and removing the once-guard stayed green - they were rewritten to hold the read |
| R2D-7 | `appeal_open`, `appeal_already_decided` (and `appeal_not_found`, so its line "The list has been refreshed" is true) join the stale set; a lodge refused for either refreshes the lists and says so | RED, 1 (both codes tested) |
| R2D-8 | `appealGuidance`: "... End that registration first, if it was made in error, then decide this appeal again." - ⛔ "undo this ending" | RED, 1 |
| R2D-9 | An error clears when the date (decide or lodge) is edited and when another act is chosen; a no-access or sign-in line does not (it is not about the value) | RED, 4: the three clears removed, and the clear also wiping a no-access line |
| R2D-10 | `AppealActions`: the date is `readOnly` while saving and an edit during the flight is ignored; a lost response then retries the SAME attempt - the same key and day | RED, 2: `readOnly` removed; the in-flight guard removed |
| R2D-11 | The focus convention, (3): `AppealActions` (form focus on open, Cancel to the opener, `aria-disabled` on Confirm / Cancel / the acts); `AppealsPage` (a finished act to the heading; "Load more" `aria-disabled`, "N more appeals shown." in a status region, focus on the last page; "Try again" focuses first); Find's panel and Undo's check "Try again" focus first. Legs start from the button actually holding focus (jsdom's `click` does not move it) | RED, 13: each of the above removed. jsdom keeps focus on a disabled button, so for `aria-disabled` the ATTRIBUTE is what is proved |
| R2D-12 | "Try again" on a failed first page of the appeal list and of the eligible list when the error is retryable (a 503 or 429), none on a 403 | RED, 2 |
| R2D-13 | Decide: `min` = the day the worker appealed; Find's lodge: `min` = the registration day in India; the eligible list has no registration day, so the server stays its only judge | RED, 3 |
| R2D-14 | The link is a radio group: each earlier record plus "This is a different person - register without a link" (the default); `link_to` follows the choice | RED, 3: checkboxes again; no shared group; "do not link" not the default |
| R2D-15 | Each row's act buttons and each lodging form carry the worker's name ("Allow: Ramesh Kumar" - still contains the visible label) | RED, 2 |
| R2D-16 | "No appeals shown." / "1 appeal shown." / "N appeals shown." | RED, 1 (the three counts tested) |
| R2D-17 | `field-worker-lifecycle-client.test.ts`: the seven new client functions and `getFieldWorkerLog`'s `record`, over a stubbed `fetch` against the contracts' strict schemas (9 tests). A dated note under Task 6.3 records the folded files as a deviation | RED, 12: a wrong path for each write and for the eligible list, `state` / cursor / `record` mis-keyed, the id not encoded, decide without an Idempotency-Key, the list cacheable. ⚠ one anchor of the first run matched two functions (a skip, not a pass) and was re-run on its own |
| R2D-18 | The legs AC12 lists: Undo's 403 line, pinned by its WORDS and its key (a deleted key falls back to itself and would match `t(key)`); the state filter; a refusal and a withdrawal each reminding the officer, and the withdraw route executing; a lodge form on worker B not inheriting A's key or line | RED, 6: wording; key; filter; the reminder; the withdraw day; and all three re-key layers of worker B. ⚠ **NOT separately provable:** worker B's own leg. Removing the page's key, the panel's key, or both leaves it green, and removing all three is caught by the "re-keyed for the new ending" legs, not by it - B's form cannot inherit A's because the panel also unmounts while B's identity loads (four layers; the leg is covered by construction, stated, not faked) |
| R2D-19 | The R2A-2 test asserts the identity IS read a second time (the `illegal_transition` leg beside it stays at one) | RED, 1: the hook's `state_changed` re-read removed |
| R2D-20 | The clock pinned at 20:00 UTC on 18 Nov (01:30 IST on the 19th): the decision and the lodge send, and default to, 19 Nov; every other date assertion is a real-day pattern, ⛔ `expect.any(String)` | RED, 1: "today" read as the UTC date |
| R2D-21 | The `ending_changed` retry test holds the identity re-read until released, waits until the cache holds version 6 and one macrotask more, and also proves the click BEFORE the re-read names the old version | RED, 2: the identity re-read removed; the whole render barrier removed. ⚠ the explicit timer ALONE is not provable - Testing Library's `waitFor` also drains a macrotask - so it is belt and braces and says so |

**What the proofs found in the patches' own tests, fixed before this record:** the two R2D-6 refetch legs (above); the R2D-21 comment that overstated its barrier; one wrong anchor (a skip); and `microcopy:check`, which flagged the word "report" in a code comment of `derive.ts` (its vocabulary rule scans comments) - reworded, not allow-listed.

**Load-bearing-invariant lens, chunk D, after the patches.** Family 13: covered-by-test for the shown number (R2D-3's live region and focus), the stale lines (R2D-2) and the focus rules (R2D-6, R2D-11) - intents (d) and (c); intent (a) now also holds for the repeated rows (R2D-15). Family 3: covered-by-test (the undo's 403 line, pinned by its words). Family 10: R2D-17 and R2D-19 closed by tests; Task 6.2 and 6.3 carry dated notes. **Not closed by this chunk:** R2D-1 (the Panel's) and R2C-1 (BigDev's).

**Validation (2026-11-20).** `tsc --noEmit` in `apps/admin`: 0 errors. ESLint on the 24 changed `.ts` / `.tsx` files there: clean. The whole admin suite, DB-free: **109 files / 2,249 tests** (the 2026-11-19 record: 2,187), of them the field-worker tests 13 files / 412 (11 files / 350 before this round). `microcopy:check` passes; the OpenAPI determinism check passes (no contract changed). 75 distinct mutations, all caught except the two items marked above. **NOT run:** a browser pass - this round changed what an officer HEARS and where focus goes (live regions, `aria-disabled`, focus on open / Cancel / "Load more" / "Try again"), which jsdom cannot judge (it keeps focus on a disabled control) and a browser pass or a screen reader should confirm before the screens go live; the full `ci:local`; the API and domain suites (no API, contract or domain file changed this round - the API and jobs suites last ran at the end of chunk C).

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
- **C8 - How a new decision of the Panel restores a worker after it refused the appeal (`-465` Q6 B, "does NOT cover").** As built (AD7's one
  appeal per ending; `refused` final), after a Panel refusal NO route can restore the worker - the slip undo is refused (AD6) and no second
  appeal is admitted. The author proposes the shape (a new act under `field_worker.hear_ending_appeal_as_panel`, re-opening the refused appeal,
  or another), the Panel's if it touches what the worker is owed. Also open: whether a Pariwar Admin's refusal should bar the slip undo too
  (not asked). Trigger: the Panel makes such a decision, or BigDev raises either. WRITTEN to `deferred-work.md` 2026-11-17.
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

Claude Opus 5.5 (`claude-opus-5-5`), `bmad-dev-story 13.1f`, 2026-11-16 (WIP `541b9073`) and 2026-11-17.

### Debug Log References

- Live DB: the story's container `twt-13-1f-pg` (:5484, 0207 applied) for the specs; a FRESH container `twt-13-1f-pg-fresh` (:5485)
  for `ci:local`. A standalone `pnpm db:migrate` against :5485 was refused by the session's permission check; `ci:local`'s own
  integration job migrated it.
- `ci:local` run 1 (2026-11-17, :5485 fresh, at `31d5d99c`): 35 of 40 jobs green; 5 red on three causes — the API `Harness` interface
  lacked the appeal helpers (typecheck, build, crypto-check), two `.limit()`s not clamped inline (domain-invariants), the shown-number
  line's direct `writeAuditEntry` (access-wrapper-invariants, ADR-0030). Fixed in `39357f77`; the five jobs' commands then exit 0 alone.
- `ci:local` run 2 (at `39357f77`, :5485, the second run on that DB): 38 of 40 jobs green, ⛔ called green. 2 red: (a) `test (unit)` — 20
  failures in 4 admin files the branch does not touch (`ground-inspection-{discrepancy,page,questionnaire}`, `helpline-claim-page`), most
  at the 5 s timeout under the unit job's concurrency ([[project_ci_local_concurrency_oversubscription]]); the four pass 142/142 alone.
  (b) `integration-tests` — 1 failure: `ending-appeal-race.spec.ts` AC2 (ii), answering 409 `mobile_already_registered` — EXACTLY the
  RED proof's outcome; the race spec entered the tree mid-run and the RED-proof mutation (the link's `FOR SHARE` removed) was live for
  about a minute while that job ran. The leg passes 14/14 on the restored code against the same DB (:5485). Attribution to the mutation is
  the session's inference from the matching outcome and the timing, ⛔ proven from the log. A third run on a fresh container follows.
- `ci:local` run 3 (at `877c6ef2` — the code tip, the race legs included; a FRESH container `twt-13-1f-pg-fresh3`, :5486): **PASSED — 40 of 40
  jobs green** (incl. `field-worker-ending-appeal-invariant`, `contracts-determinism`, `microcopy`, `integration-tests`). The commits after it
  touch records only.
- `ci:local` run 4 (at `5044c61a` — after Tasks 2.4 / 3.7 / 6.3 / 8 and the browser-pass fix; a FRESH container `twt-13-1f-pg-final`,
  :5487, removed afterwards): **PASSED — 40 of 40 jobs green.**
- Full live domain suite (:5484): 8386 pass, 6 fail under full-suite load (~25 s timeouts in `claim/*` and `field-worker/page.spec`) —
  the four files pass 75/75 alone. Full live API suite (:5484): 239 files, 3216 pass.

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
- 2026-11-17 - the Panel RULED its note: `2026-11-17-465` (committed ALONE `36330c87`), the note's block + roster + PRD FR-85 (`7c0d46f9`),
  story v1.5 + records (`71849dca`). Q6 B is built (Task 3.4a): a slip undo is refused 409 `field_worker.appeal_refused_by_panel` once the
  PANEL has heard and refused the current ending's appeal — pre-read (no audit line) and under the worker lock; a Pariwar-Admin-heard refusal
  does not bar it (`-465` "does NOT cover"). RED-proved (the guard disabled ⇒ the Q6 B leg fails; restored).
- 2026-11-17 - BUILT on the story branch (⛔ landed, ⛔ pushed): domain (`4a51a28e`), contracts + OpenAPI (`fd317a87`), API (`e973d5b2`),
  admin (`31d5d99c`), the ci:local fixes (`39357f77`). What ran: the domain live specs `undo.spec` (18), `ending-appeal.spec` (26, incl.
  AC16's guard / immutables / CHECKs by name / 23502 / DELETE + TRUNCATE as owner / FKs by name), `schema-trigger` AC4's refusals and
  AC10 (b), the appeal table's RLS policy regression; `commands-guards` order pins for the undo (incl. Q6 B's place), the lodge order and
  the decide / withdraw lock order; the API `undo-appeal.spec` (16 — AC1, AC2 pre-read, AC3, AC5-AC10, AC15, the route table's
  `limits.read`); the admin `field-worker-undo.test.tsx` (5 — End then Undo in one panel names the End's version; the open-appeal line;
  Q6 B's line; `ending_changed` re-reads the identity; the register's shown endings + link under a new key; the Appeals page acts and
  "Record an appeal"); every existing 13.1 / 13.1a-d test updated for the new shapes (`state_event_version`, the shown-number 409 on
  13.1c's re-register leg, "Undo ending" on an ended worker, the reworded End line). The new `field-worker-ending-appeal-invariant` gate
  in `package.json`, `ci-local.sh`, `ci.yml`.
- ⚠ Variance — ACCEPTED by BigDev 2026-11-17 (*"Accept the 200 variance"*; AD11 / AC9 amended in the story, v1.7; `-464` AD11 says only
  "writes ONE audit line … BEFORE answering", so no decision entry changes): the shown-number audit line goes through `audit.withCompensatingAudit` (ADR-0030's
  gate refuses a direct `writeAuditEntry`), so it records `responseStatus` 200, not AC9's 409; one line per showing still holds.
- 2026-11-17 (v1.7, Task 5.2) - `ending-appeal-race.spec.ts` (14 legs): every row of the Concurrency matrix live, a holder connection
  running the PUBLIC command (new `_field-worker-fixture.ts` helpers) while the HTTP request is proved BLOCKED behind it
  (`waitForBlockedBy`), reason AND control asserted, the intent + `_rolled_back` pair where the refusal is under the lock: slip undo x
  allowed decision (both orders), slip undo x refusal (both orders — a Panel refusal committed first answers `appeal_refused_by_panel`
  UNDER THE LOCK; a Pariwar Admin's refusal or a withdrawal lets the undo through), decide x decide and decide x withdraw, lodge x lodge,
  lodge x undo (both orders — a lodge committed first is superseded), undo x re-end (AC3, `ending_changed`), and AC2 (i), (ii), (iii).
  Plus `undo-appeal.spec.ts`'s TR8 leg (a replay returns the first 200 and writes one line; the same key on another worker is that
  worker's own act). **RED proof of AC2 (ii)** (the link's `FOR SHARE` removed, run, restored — diff empty): the leg FAILS — the stale
  read passes the link check and the INSERT then answers 409 `mobile_already_registered`, ⛔ 422 `link_invalid`. ⚠ It did NOT deadlock in
  this interleave (the holder commits instead of waiting on the request); the 40P01 TR15 names needs both sides waiting, which this leg
  does not stage — recorded as observed, not as the story worded it. Story DB :5484: 31/31 (undo-appeal 17, race 14).
- 2026-11-17 (v1.9) - **Task 2.4's RED proofs** (`d410cd59`; 13 legs in a TEMPORARY spec, each one rule removed inside the rolled-back
  test transaction, the file deleted after): AC4 — `0201`'s guard function back ⇒ the domain undo fails `FieldWorkerStateDirectWriteError`
  and the same raw undo-shaped write answers rule (t)'s own message (the domain wrapper keeps drizzle's "Failed query" text, so the rule's
  words are asserted on the raw write); AC16 — each of the four CHECKs dropped, the appeal guard without (a), (f), (s), (b), (c), the
  delete / truncate triggers dropped, `ended_by_user_id`'s NOT NULL dropped, the two composite FKs dropped: each time the write its live
  leg refuses goes through. Rules intact afterwards (60/60). **Task 3.7**: `register-previous.spec.ts` (4 — the ended-by-number read's
  order / cap / districts / Pariwar, the link lock read, the chain incl. the 10-hop cap and the genesis payload, the self-link); AC1 (d) in
  `read.spec.ts` (an undo across committed transactions: a capture at the ending's stamp reads `terminated`, 1 µs before the undo's too,
  at the undo's stamp `active`). **Task 6.3** (`84b2b10a`): worker B after A starts fresh, `number_registered_again`'s line, "Ending undone
  after an appeal" with the Trustee Panel label, the linked earlier record read with `record=`.
- 2026-11-17 (v1.9) - **Task 8, the real-browser pass** (the dev Mac's Chrome, connected; a seeded API on :3000 from a temporary
  env-guarded launcher spec on a throwaway container, the admin on Vite :3001, a cookie helper — [[project_admin_browser_pass_launcher]]),
  as the Pariwar Admin and a Trustee Panel holder: (1) End then "Undo ending" in the SAME open panel, no refetch — undone, "…restored as
  they were before the ending. Tell the worker.", the history "Ended" then "Ending undone"; (2) the Pariwar Admin's endings appear on the
  trustee's "Record an appeal" list (heard by the Trustee Panel), lodged by phone / in person, allowed and refused — "All appeals" shows
  Allowed / Refused, the allowed worker active again; (3) `-465` Q6 B: the Pariwar Admin's undo of the Panel-refused ending ⇒ "The Trustee
  Panel heard this worker's appeal and refused it. Only a new decision of the Panel can restore them.", still Ended; (4) registering an
  ended worker's number ⇒ the ending's date and reason shown, linked, registered; the new record's history "Linked to an earlier record" ⇒
  the earlier record's history loads. No console errors; the API log has no error-level line and no worker name or mobile. **Findings,
  FIXED (`5044c61a`) and re-checked in the browser:** (a) the Appeals page lost each outcome and its "Tell the worker." reminder — the
  decided appeal (or the lodged worker) left its list on the refresh and the line unmounted with it; now said at PAGE level (the RTL test
  now answers the refresh with an empty list, as the real one does); (b) the channel select's placeholder read "Choose a reason"; (c) the
  shown-number legend repeated the line's words. Some steps were driven through the API with curl as the same officer (ending Gopal Yadav,
  Lakshmi Prasad and Sita Devi again) — the End flow itself was exercised in the browser in (1). Torn down: the tab closed, the launcher
  deleted, the throwaway containers removed.
- (superseded by the v1.9 lines above) ⛔ NOT built / NOT run at v1.7: the RED proofs of AC4 (re-running
  0201's function) and of each AC16 CHECK / guard rule (Task 2.4); the domain `register-previous.spec.ts` (its reads are covered through
  the API spec only); AC1 (d)'s as-of read across transactions; the rest of AC12's RTL list (worker B after A, the Panel role label in the
  history, the "Linked to an earlier record" panel); the real-browser pass (Task 8). `deferred-work.md`: 13.1a CR33's re-trigger and
  13.1d CR31's trigger annotated FIRED; the closures (13.1c C2 (i)-(iii), 13.1d C3, R2-D1, CR9's half) wait for landing.

### File List

Against `5ede00c4` (the pin), every commit on `story/13-1f-field-worker-ending-undo-appeal-and-return` plus the uncommitted review repairs (rounds 1 and 2; the temporary RED-proof specs and the browser-pass launcher were never committed):

- `.decision-log.md` (modified)
- `.github/workflows/ci.yml` (modified)
- `_bmad-output/implementation-artifacts/13-1f-field-worker-ending-undo-appeal-and-return.md` (new)
- `_bmad-output/implementation-artifacts/deferred-work.md` (modified)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified)
- `_bmad-output/planning-artifacts/epics.md` (modified)
- `_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md` (modified)
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-11-16-story-13-1f-field-worker-undo-and-appeal.md` (new)
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-11-20-story-13-1f-death-ending-reminder.md` (new, review round 2 chunk D R2D-1 - SENT by BigDev and RULED option A by `2026-11-20-466`; never committed before it was sent)
- `apps/admin/src/api/client.ts` (modified)
- `apps/admin/src/api/hooks.ts` (modified)
- `apps/admin/src/modules/field-workers/AppealActions.tsx` (new)
- `apps/admin/src/modules/field-workers/AppealsPage.tsx` (new)
- `apps/admin/src/modules/field-workers/FieldWorkerNav.tsx` (modified)
- `apps/admin/src/modules/field-workers/LodgeAppealForm.tsx` (new, review R5 shared lodging form)
- `apps/admin/src/modules/field-workers/WorkerAppeals.tsx` (new, review R5 Find panel)
- `apps/admin/src/modules/field-workers/RegisterFieldWorkerPage.tsx` (modified)
- `apps/admin/src/modules/field-workers/WorkerActions.tsx` (modified)
- `apps/admin/src/modules/field-workers/WorkerDetail.tsx` (modified)
- `apps/admin/src/modules/field-workers/WorkerHistory.tsx` (modified)
- `apps/admin/src/modules/field-workers/derive.ts` (modified)
- `apps/admin/src/modules/field-workers/i18n-en.ts` (modified)
- `apps/admin/src/modules/field-workers/index.ts` (modified)
- `apps/admin/src/router.tsx` (modified)
- `apps/admin/src/routes/FieldWorkerAppealsRoute.tsx` (new)
- `apps/admin/tests/field-worker-actions.test.tsx` (modified)
- `apps/admin/tests/field-worker-appeals.test.tsx` (new, review round 2 chunk D - the Appeals page and Find's lodging panel when something goes wrong: R2D-2, 4, 5, 7-13, 15, 16, 18, 20; named by Task 6.3)
- `apps/admin/tests/field-worker-derive.test.ts` (modified)
- `apps/admin/tests/field-worker-lifecycle-client.test.ts` (modified)
- `apps/admin/tests/field-worker-move-requests.test.tsx` (modified)
- `apps/admin/tests/field-worker-register-previous.test.tsx` (new, review round 2 chunk D - the register page's shown number and link as an officer perceives them: R2D-3, R2D-14; named by Task 6.3)
- `apps/admin/tests/field-worker-undo.test.tsx` (new)
- `apps/admin/tests/field-worker-review-regressions.test.tsx` (new, review R1–R6)
- `packages/domain/tests/field-worker/ending-appeal-events.test.ts` (new, review round 2 R2B-3 - the appeal event schemas, state table, hearer and actor-kind checks, and the projector's pre-SQL checks, DB-free)
- `apps/api/src/modules/field-worker/ending-appeal-handlers.ts` (new)
- `apps/api/src/modules/field-worker/errors.ts` (modified)
- `apps/api/src/modules/field-worker/gate.ts` (modified)
- `apps/api/src/modules/field-worker/handlers.ts` (modified)
- `apps/api/src/modules/field-worker/lifecycle-handlers.ts` (modified)
- `apps/api/src/modules/field-worker/log-handlers.ts` (modified)
- `apps/api/src/modules/field-worker/read-handlers.ts` (modified)
- `apps/api/src/modules/field-worker/routes.ts` (modified)
- `apps/api/src/modules/field-worker/undo-handlers.ts` (new)
- `apps/api/src/modules/rbac/index.ts` (modified, review round 2 R2C-2 - `holdsPermission`, the PURE twin of `requirePermissionHook`; the hook's question is now resolved in one `permissionAskOf` that both share. The hook's order of checks and its `requirePermission` call are unchanged; the one difference is that `opts.dimension` is read per request, not once at construction)
- `apps/api/src/types.ts` (modified)
- `apps/api/tests/integration/_field-worker-fixture.ts` (modified)
- `apps/api/tests/integration/field-worker/_registration-harness.ts` (modified)
- `apps/api/tests/integration/field-worker/approval.spec.ts` (modified)
- `apps/api/tests/integration/field-worker/code-read.spec.ts` (modified)
- `apps/api/tests/integration/field-worker/ending-appeal-race.spec.ts` (new)
- `apps/api/tests/integration/field-worker/ending-appeal-reads.spec.ts` (new, review round 2 R2C-10 - the three appeal reads' defaults, cap, cursor walk, hostile cursors, `no-store`, and AC15 (b) / AC5 (f)'s gate branches)
- `apps/api/tests/integration/field-worker/lifecycle.spec.ts` (modified)
- `apps/api/tests/integration/field-worker/move-race.spec.ts` (modified)
- `apps/api/tests/integration/field-worker/reads.spec.ts` (modified)
- `apps/api/tests/integration/field-worker/register-previous.spec.ts` (new, review round 2 R2C-11 - the shown number's AC9 (b), (d), (e), (f); the API file of that name, not the domain's)
- `apps/api/tests/integration/field-worker/terminate-race.spec.ts` (modified)
- `apps/api/tests/integration/field-worker/undo-appeal.spec.ts` (new)
- `apps/api/tests/unit/field-worker-errors.test.ts` (modified, review round 2 R2C-9 - the 13.1f error rows and `numberPreviouslyEndedError`)
- `apps/api/tests/unit/field-worker-handler-identity.test.ts` (modified)
- `apps/api/tests/unit/field-worker-hearer-dispatch.test.ts` (new, review round 2 R2C-2 - the hearer dispatcher over the real hooks and over stub hooks, and `holdsPermission`)
- `apps/jobs/tests/field-worker-code-sms-live.test.ts` (modified)
- `apps/jobs/tests/field-worker-move-request-escalation-live.test.ts` (modified)
- `apps/jobs/tests/field-worker-notice-email-no-decision.test.ts` (modified)
- `apps/jobs/tests/field-worker-notice-emails-live.test.ts` (modified)
- `docs/launch-gate-inventory/inventory-roster.md` (modified)
- `openapi/v1.yaml` (modified)
- `package.json` (modified)
- `packages/contracts/scripts/emit-openapi.ts` (modified)
- `packages/contracts/src/field-workers/dto.ts` (modified)
- `packages/contracts/src/field-workers/enums.ts` (modified)
- `packages/contracts/src/field-workers/index.ts` (modified)
- `packages/contracts/tests/field-workers.test.ts` (modified)
- `packages/domain/migrations/0207_field-worker-ending-undo-appeal-link.sql` (new)
- `packages/domain/migrations/meta/_journal.json` (modified)
- `packages/domain/src/field-worker/commands.ts` (modified)
- `packages/domain/src/field-worker/ending-appeal-commands.ts` (new)
- `packages/domain/src/field-worker/ending-appeal-events.ts` (new)
- `packages/domain/src/field-worker/ending-appeal-lock.ts` (new)
- `packages/domain/src/field-worker/ending-appeal-project.ts` (new)
- `packages/domain/src/field-worker/ending-appeal-read.ts` (new)
- `packages/domain/src/field-worker/ending-appeal-state.ts` (new)
- `packages/domain/src/field-worker/ending-appeal-supersede.ts` (new)
- `packages/domain/src/field-worker/errors.ts` (modified)
- `packages/domain/src/field-worker/events.ts` (modified)
- `packages/domain/src/field-worker/index.ts` (modified)
- `packages/domain/src/field-worker/project.ts` (modified)
- `packages/domain/src/field-worker/read.ts` (modified)
- `packages/domain/src/field-worker/state.ts` (modified)
- `packages/domain/src/ids/index.ts` (modified)
- `packages/domain/src/policies/field-worker-ending-appeals-rls.ts` (new)
- `packages/domain/src/policies/index.ts` (modified)
- `packages/domain/src/rbac/permissions.ts` (modified)
- `packages/domain/src/rbac/roles.ts` (modified)
- `packages/domain/src/schema/field_worker_ending_appeals.ts` (new)
- `packages/domain/src/schema/field_workers.ts` (modified)
- `packages/domain/src/schema/index.ts` (modified)
- `packages/domain/tests/field-worker/commands-guards.test.ts` (modified)
- `packages/domain/tests/field-worker/events.test.ts` (modified)
- `packages/domain/tests/field-worker/state.test.ts` (modified)
- `packages/domain/tests/integration/field-worker/_fixtures.ts` (modified)
- `packages/domain/tests/integration/field-worker/commands.spec.ts` (modified)
- `packages/domain/tests/integration/field-worker/ending-appeal.spec.ts` (new)
- `packages/domain/tests/integration/field-worker/log.spec.ts` (modified)
- `packages/domain/tests/integration/field-worker/move-requests.spec.ts` (modified)
- `packages/domain/tests/integration/field-worker/notice-emails.spec.ts` (modified)
- `packages/domain/tests/integration/field-worker/read.spec.ts` (modified)
- `packages/domain/tests/integration/field-worker/register-previous.spec.ts` (new)
- `packages/domain/tests/integration/field-worker/schema-trigger.spec.ts` (modified)
- `packages/domain/tests/integration/field-worker/stream-concurrency.spec.ts` (modified)
- `packages/domain/tests/integration/field-worker/undo.spec.ts` (new)
- `packages/domain/tests/integration/rls/field-worker-ending-appeals-policy-regression.spec.ts` (new)
- `packages/domain/tests/integration/rls/field-workers-policy-regression.spec.ts` (modified)
- `packages/domain/tests/rbac/permissions.test.ts` (modified)
- `packages/domain/tests/rbac/roles.test.ts` (modified)
- `packages/events/src/registry.ts` (modified)
- `packages/events/tests/field-worker-ending-appeal-registry-coverage.test.ts` (new)
- `packages/events/tests/field-worker-registry-coverage.test.ts` (modified)
- `scripts/ci-local.sh` (modified)
- `scripts/field-worker-ending-appeal-invariant/README.md` (new)
- `scripts/field-worker-ending-appeal-invariant/check.ts` (new)
- `scripts/field-worker-ending-appeal-invariant/lib.test.ts` (new)
- `scripts/field-worker-ending-appeal-invariant/lib.ts` (new)

## Change Log

| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-11-12 | Created by `bmad-create-story 13.1f` on its own worktree at `5ede00c4`: AD1-AD16, Q-1..Q-3 open, the Panel note's five questions planned (Task 0.6), Row 52 planned (Task 0.4), C1-C6 carried. Row `backlog` -> `ready-for-dev`. |
| v1.1 | 2026-11-13 | `bmad-create-story validate 13.1f` (4 read-only verifiers; their main claims re-checked in the repo; BigDev: "all"). Code still at `5ede00c4`. Detail below. |
| v1.2 | 2026-11-14 | `bmad-create-story validate 13.1f` a second time (4 fresh read-only verifiers: domain + DB, API + RBAC + admin, governance, adversarial design; every critical claim re-checked in the repo; BigDev: "all", 50 items). Code still at `5ede00c4`. Detail below. |
| v1.3 | 2026-11-16 | `bmad-create-story validate 13.1f` a third time (an in-session re-trace at `5ede00c4`, still `origin/main` after `git fetch`; `-464`, `0207`, Row 52 still free; BigDev: "all", 9 items). Detail below. |
| v1.11 | 2026-11-20 | `bmad-code-review 13.1f`, rounds 1-2, ALL four chunks (A domain source and migration, B domain tests and the gate, C contracts / API / jobs, D the admin screens), each by a Blind Hunter, an Edge Case Hunter and an Acceptance Auditor (read-only subagents), one chunk at a time; BigDev chose "apply every patch" at each. Every patch applied and RED-proved by a single mutation, except as each patch resolution records (e.g. R2C-5's Pariwar predicate, R2D-18's worker-B leg). **R2C-1 (the 403's `details`) is OPEN - BigDev's.** R2D-1 (the End reminder after a death) went to the Panel, which ruled option A, as built (`2026-11-20-466`): DISCHARGED, nothing changed. Committed as `bbaaf766` (-466), `91426fe8` (the ruled note, Row 52), `15f026a2` (domain + gate), `e69f815a` (contracts, OpenAPI), `e4c2d53b` (API, jobs), `c2d6fc48` (admin) - ⚠ only the series TIP is validated. Status stays `review`. ⛔ pushed; ⛔ `ci:local` since `5044c61a`; ⛔ a browser pass on round 2's admin changes; ⛔ the sprint-status ledger line. |
| v1.10 | 2026-11-17 | `ci:local` run 4 PASSED 40/40 on a fresh container at `5044c61a`; every task checked; Status `review` (sprint-status row `in-progress` → `review`). ⛔ landed, ⛔ pushed. |
| v1.9 | 2026-11-17 | BigDev: *"go ahead, complete all, browser is connected"* — Task 2.4 (RED proofs), 3.7 (register-previous spec, AC1 (d)), 6.3 (the remaining RTL legs), 8 (the browser pass; three findings fixed in `5044c61a` and re-checked) done. Every task checked. |
| v1.8 | 2026-11-17 | Task 7 done: `ci:local` run 3 PASSED 40/40 on a fresh container (:5486) at `877c6ef2`; `epics.md` BUILT note. Open: 2.4, 3.7, 6.3, 8 — row stays `in-progress`. |
| v1.7 | 2026-11-17 | Task 5.2 done: the Concurrency matrix's race legs (14) and the TR8 replay leg; the AC2 (ii) RED proof (fails without `FOR SHARE`; no 40P01 in this interleave — recorded as observed). BigDev: *"Accept the 200 variance; build the race legs next"* — AD11 and AC9 now say the shown-number line records `responseStatus` 200 (the wrapper's); `-464` AD11 states no status, so the decision log is unchanged. Next: Task 5.2's race legs. |
| v1.6 | 2026-11-17 | dev-story: Tasks 1, 2.1-2.3, 2.5, 3.1-3.6, 3.4a, 4, 5.1, 5.3, 6.1, 6.2 done and tested (Dev Agent Record); 2.4, 3.7, 5.2, 6.3, 7, 8 open as listed there. One variance (the shown-number line's `responseStatus` 200). Row stays `in-progress`. |
| v1.5 | 2026-11-17 | The Panel RULED its note (`2026-11-17-465`; BigDev's relay verbatim: *"Panel ruled as recommended for all except Q6 for which option B is chosen"*): Q1 B, Q2 A, Q3 A / A, Q4 A x4, Q5 A, Q6 **B**, Q7 A. Q6 B propagated (a spec edit made at BigDev's instruction to record the ruling, outside dev-story's usual sections): AD6 (the slip undo refused after a Panel-heard refusal, superseding its "including after the Panel has REFUSED"), section 0 rows 10b and Result, the Policy meaning, the Per-command table, the Concurrency matrix, the Errors table + Names (`field_worker.appeal_refused_by_panel`), AD14's line, AC8, Tasks 3.4a / 5.1 / 6.2, C8 (new). Governance commits `36330c87` (`-465`, alone), `7c0d46f9` (the note's block, Row 52 (a) / (c) MET and (b) recorded, Row 48 (i), PRD FR-85 annotated). |
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
