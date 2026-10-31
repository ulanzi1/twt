---
baseline_commit: 01062c51
---

<!--
⭐ BASELINE: `01062c51` — `records: ledger 2026-10-30q — Story 6.33 LANDED on main …` = `origin/main` at creation (fetched
2026-10-30). Every code claim below was read at `01062c51` (perishable). Re-diff `packages apps scripts friction-budget.md
docs/launch-gate-inventory` from `01062c51` at Task 0.1.
⚠ No `file:NNN` pointer in this file points into `.decision-log.md`, `deferred-work.md` or `sprint-status.yaml` (all
newest-first). Cite those by decision id / clause / item / row key only.
⭐ NUMBERS — taken 2026-10-30 at `01062c51` across EVERY local + remote branch and EVERY worktree (12-1, 13-2, 6-38, this one).
Re-take ALL of them at Task 0.1 and again immediately before each write (`-366` decision 6: a number belongs to the first COMMIT):
  next decision id **`-431`** (⚠ `-424` = 6.38's Panel ruling, on `main`; `-425` = 6.38's author-commit and `-430` = 6.38's Panel ruling
  on a fee paid after the death, both on its branch (`78316d0c`); `-427` and `-429` = Story 12-1's (`-427` taken by `a22dbdec`);
  **`-426` = THIS story's addendum ruling** and **`-428` = THIS story's main ruling** (both Trustee-ratified 2026-10-31) — at creation
  the next was `-424`) — ⭐ this file writes `-NNN` wherever an id is not yet taken; this story takes THREE so far (a FOURTH when the R1–R3 ruling is transcribed): the two Panel
  transcriptions (`-426`, `-428`, each committed alone — AC0 (3)) and then our author-commit (AC0 (4)) · migration **`0193`** (⚠ the
  12-1 worktree holds an UNCOMMITTED `0193_marketplace-modules.sql` with `when` `1796269200038` — the number belongs to the first COMMIT
  (`-366` decision 6), so RE-TAKE it at Task 3.1; if 12-1 has committed by then, this story takes `0194` and the next `when`; main's newest is `0192_questionnaire-versions.sql`;
  directory `packages/domain/migrations/` — there is ⛔ no `packages/db`) · `PERMISSION_CATALOG_VERSION` **56**, ⛔ no change
  (reviewing kinship uses the existing `memorial.review`) · ADR: ⛔ none expected (next free ADR-0044) · launch-gate roster: ⛔ no new
  row recommended (KL13 annotates Row 41; next free row would be 46) · ledger: main's header holds `2026-10-30` + `-30a`…`-30q`;
  ⚠ `-30r` is HELD by Story 6.38's local commit `f14318f8` (branch `story/6-38-…`, unpushed) ⇒ this creation is **`2026-10-30s`**
  and its validation **`2026-10-30t`** (⚠ main's second ledger list — the YAML `last_updated: >-` key — holds only `a`…`k`: `l`…`q`
  were never added there; ⛔ not this story's to repair, recorded). Re-take the letter with
  `git for-each-ref refs/heads refs/remotes` + `git show <ref>:…/sprint-status.yaml` before every ledger write.
⭐ WORKTREE: `.claude/worktrees/11b-5a-kinship-capture-and-lattice`, branch `story/11b-5a-kinship-capture-and-lattice` (created from
`01062c51`). A peer interactive session shares the main checkout, which is why this is a worktree. Push with `-u origin <branch>`
the first time, ⛔ never a bare `git push`; every push needs `DATABASE_URL=<this story's own container port>` prefixed
([[project_prepush_hook_inherits_5432]]).
⭐ LETTERS: `KL1–KL16` = this story's build decisions; `PQ1`, `PQ2`, `PC1`, `PC2`, `AQ1`–`AQ3` = the questions put to the Panel (ruled); `R1`–`R3` = the follow-up confirms (no prior `KL`
exists in `.decision-log.md` — grep at Task 0.1). Other stories' letters are cited qualified (`11b.4 MA2`, `11b.5 MV2`, `11b.4a MP3`).
⚠ GLYPH INVERSIONS UPSTREAM: `deferred-work.md`'s 11b.4 section (items (2), (4)–(9), (11)), its 6.27a section, and `-416` carry ⛔
markers with the negator MISSING ("Kinship capture … ⛔ collected" means it is NOT collected). ⛔ Never copy text from those; quote
the story files, the decision log's clause text read in context, or the code.
⚠ PRIVATE CORPUS: `docs/legal/` is ABSENT from this repository by design (`-167`; [[project_legal_corpus_private_repo_split]]).
It exists only in the MAIN checkout, git-ignored. Cite its sections by number; ⛔ never paste its text into a tracked file.
-->

# Story 11b.5a: Kinship — Capture, Review and the Public `<KinshipLattice>`

Status: review

## ⭐ GLYPH REGISTER — read this before any clause below

⭐ = do this / the load-bearing fact · ⚠ = a hazard or a cost · ⛔ = a prohibition, and in THIS file it is always followed by
its own negator word (*not*, *no*, *never*, *none*). Upstream text does ⛔ not follow this rule (see the header). ⇒ A ⛔ with no
negator is a defect: infer the sense from context and the cited source, ⛔ never by deleting the glyph, and note it.

## PREFLIGHT — ✅ TASKS 0–1 DONE: the Panel has RULED (`-426`, `-428`); our author-commit is `-431`. Next: Task 2 (code). Follow-up confirms R1–R3 are written for the Panel (SENT by BigDev 2026-10-31, ⏳ no ruling yet; they gate 11b-5c and go-live, ⛔ not Task 1).

### ⚖️ RULED — what binds the build (this block WINS over any plan text below that still reads otherwise)

| Ruling | What it means for this story |
|---|---|
| **`2026-10-31-426`** (addendum; DR + KB): AQ1 A, AQ2 A, AQ3 A, AQ3 (b)1 | **A guardian declaration at Send** — *"For every child I have named, I am their parent or lawful guardian, or I have their parent's or guardian's agreement. Every adult I have named has agreed to be named."* + *"… and every child in the photo"*. It covers **the list, the words and the photo** (KL16). The reviewer does ⛔ not leave out a child the declaration covers; `identifies_a_child` stays for a child it cannot cover (reading — KL16). The "in the photo" ticks are built (KL15) and are ⛔ never public. Supersedes `-391` item 2's child + photo halves in part |
| **`2026-10-31-428`** (main note v2; DR + KB): PQ1 A + rider, PQ2 B, PC1 A | **PQ1 A** — the list may appear, relation + name, the fourteen relations, children on the declaration, used for **nothing else** (AC10). **The rider** — *"member also sees the memorial page"* — BigDev's reading: the **member app's drive screen also shows the memorial** (words, photo, list) ⇒ built by **row `11b-5c`** (BigDev 2026-10-31), ⛔ not here; this story renders the **public** page only; in the floor test all four memorial ids become **declared gaps owed by 11b-5c** (Trap 6). ⚠ BigDev's reading is put back to the Panel as confirm **R1** (`_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-31-11b5a-confirms-r1-r3.md` — SENT by BigDev 2026-10-31, ⏳ no ruling yet) — 11b-5c is ⛔ not built until R1 is answered. Supersedes `-412` §3 item 3 in part. **PQ2 B** — a named person may have their own name removed through the helpline ⇒ built by **row `11b-5b`** (KL14 (a)), ⛔ not here; this story's per-entry model makes it possible. **PC1 A** — the four reasons (the child reason only for an undeclared child) + "no mark" apply to the list (KL6 unchanged). **PC2** — ⛔ not answered as put; the rider governs |
| **`2026-10-31-432`** (confirms; DR + KB): R1 A, R2 A, R3 A | **R1 A** — the members' app shows the memorial ITSELF (words, photo + description, list) beside the member's name, **v4+ memorials only** ⇒ row 11b-5c builds exactly that and ⛔ no longer waits. **R2 A** (⚠ ⛔ not our suggestion) — the declaration's adult half covers every adult named, in the list **or** in the words ⇒ v4 ③ stands as approved. **R3 A** — after a declaration the reviewer leaves out a child only where **something in the memorial itself** shows the declaration cannot cover that child, and the family is told why ⇒ KL16's guidance and copy 4.4 follow these words |

**Scope after the rulings (BigDev, 2026-10-31):** **11b-5a (this story)** — capture (list + "in the photo" ticks), the ONE
declaration at Send for words + list + photo (v4 permission), the review (list entries + the declaration-aware child rule for words,
list and photo), storage, the public `<KinshipLattice>`, the helpline's read-only view. **11b-5b** — the helpline's one-name removal
(PQ2 B). **11b-5c** — the member app's drive screen shows the memorial (words, photo, list) — the `-428` rider. ⛔ Neither row is
built here; both are minted at Task 1.2 with the comment blocks in KL14 / Task 1.2 (iv-b). **Go-live (Row 41)** needs all three, AND
R1–R3 answered. ⚠ **v4 promises both rows** (① *"and to members in the app"*; ⑤B's removal) and v4 can ⛔ never be edited ⇒ v4 is ⛔ never
live with the switch on unless 11b-5b and 11b-5c are `done` and R1–R3 are answered; if either row is dropped or narrowed (e.g. by
R1 = B), or R2 = B narrows ③, a v5 without (or with the narrowed) clause is minted before go-live (AC12).

⭐ **What this story is, in one paragraph.** The family's memorial (Story 11b.4 writes it, 11b.4a puts it on the public Sahyog
Vivran page, 11b.5 framed its photo) has ⛔ no list of the deceased's relatives. The epic wants one — *"optional kinship details"*
captured by the family (epic 11b.4 step (d)) and drawn by `<KinshipLattice>` (epic 11b.5) — and the UX draws it as a newspaper
obituary's family line (`पत्नी · सुनीता देवी | पुत्र · अमित, राहुल`). Every story since October has declined to collect it on one
ground, Decision `-398` MA2 (author-commit): **⛔ no names of living relatives held for a purpose not yet ruled.** ⚠ The history
matters for the note: in October the Panel was told, as **the author's decision, ⛔ not a question**, that relatives would ⛔ not be
collected *"until this question [Q2] is answered"* (routing note 2026-10-23 :145-147). Q2 was answered (`-391` Q2 A), and `-391`'s
Not-covered line left kinship *"still Story 11b.4a/11b.5's to plan, ⛔ not ruled here"*. Since then `-398` MA2 has held it back on
the PURPOSE ground, and `-420` MV2 records that the Panel *"has ⛔ not been told of these hops"*. ⇒ ⭐ This story **asks the Panel first** (Task 0), with a
real capture design behind the question (KL1–KL14 — who types the names, how a child is kept off, how a name is left out, where
the list appears, what it is never used for), and builds **only what the Panel rules** (Tasks 1–9). If the Panel rules that
there is no list, this story closes on records alone.

⭐ **This is kinship's fourth hop and its last.** 11b.4 → 11b.4a → 11b.5 → 11b-5a; Story 11b.6's `epics.md` note carries a STOP
(*"row `11b-5a-…` must be created (bmad-create-story) before this story's create-story proceeds"*). **Its literal condition is met
by this creation once this story file is COMMITTED** (an uncommitted file in a worktree is invisible to an 11b.6 create-story run
from `main`); **its purpose — the Panel question — is carried to Task 0.3**, ⛔ not discharged (record both at Task 1.2 (ii)).
⛔ No further hop: what is not built here is built by the rows Task 1.2 mints (11b-5b, 11b-5c), with the rulings already in hand.

### STOP conditions — RUN 2026-10-31 at Task 0.1. ⚠ STOP 7 is now TRUE (ruled) and STOP 5 becomes false at Task 4.2 — before Task 2, RE-RUN ONLY STOP 1, 2, 3, 6 (any one ⇒ stop and ask BigDev)

⚠ **STOP 2 FIRED (2026-10-31, at validation):** 6.38's commit `e813e5ee` (pushed to its branch, ⛔ not on `main`; row `review`) changes `anonymize.ts`
(the deceased-keyed memorial scrub is now *"dead code"* there) and `resolveRtbfLegality` (a `pariwarId` parameter and a
`death_reported` branch; `acquireErasureLocks` is new) ⇒ **rebase onto 6.38 (or onto `main` once it lands) before Task 4.7**, and write
AC9's legality sentence from its code (Trap 9).

1. Any file under `packages/domain/src/memorial/`, `packages/contracts/src/memorial/`, `packages/ui/src/memorial/`,
   `apps/api/src/modules/{memorial,memorial-review,memorial-takedown,public-pages}/`, `apps/mobile/app/(memorial)/`,
   `apps/mobile/components/memorial-authorship/`, `apps/mobile/lib/{memorial-draft,use-memorial-send}.ts`,
   `apps/admin/src/modules/{memorial-review,memorial-takedown}/`, or
   `apps/public/src/{components/FamilyMemorial.astro,lib/family-memorial.ts,lib/sahyog-vivran.server.ts}` changed since `01062c51`.
2. Row `6-38-death-locks-erasure-and-non-member-claims-refused` (the `-423` build) has COMMITTED changes to
   `packages/domain/src/member/anonymize.ts` or `resolveRtbfLegality` — at this story's creation its branch holds only the 6.38
   story commit `f14318f8` (story file + ledger `-30r`, ⛔ no code, ⛔ no migration). ⇒ rebase onto it first; AC9's erasure leg must
   follow whatever it lands (Trap 9).
3. Row `11b-6-in-memoriam-roll-consent-governed-revocable-invariant` moved off `backlog` (it builds `<MemorialRecord>`, whose UX
   anatomy contains the lattice — Trap 11).
4. Any kinship column, contract, i18n key, matrix field or component appeared anywhere outside the prototype
   (`apps/mobile/components/shradhanjali/`) — `git grep -n -i kinship -- packages apps ':!apps/mobile/components/shradhanjali'`
   must show only comments.
5. `MEMORIAL_SUBMISSION_AUTHORISATION_COPY_VERSION` is no longer `2026-10-25.v3-pending-hi-review`, or any version's `hiReviewed`
   became `true` (KL7 mints the next version on top of whatever is current).
6. The `-173` clause row was pinned (the deceased's name would start rendering on the same page — PQ1's options assume it does ⛔ not).
7. A Panel ruling on kinship exists (`grep -n -i kinship .decision-log.md` shows a Trustee-ratified entry newer than `-420`) — then
   Task 0.3 is ⛔ not needed; read the ruling verbatim and go to Task 0.4.

## Story

As **a nominee writing my family's memorial**,
I want to list, if I wish, the family the member leaves behind — by relation, and by name where the Trust allows it —
so that the memorial reads the way an Indian obituary does: the person, their story, and the family that mourns them.

As **a living relative of a member who has died**,
I want the Trust to collect and show my name only for a purpose it has decided openly, to show a child's name only on their
guardian's declaration, to let me have my own name taken off, and to use the list for nothing else,
so that being part of a bereaved family does not quietly put my name in the Trust's records or on a public page.

As **the Trustee Panel**,
we want this asked before anything is built, with each option's cost in front of us,
so that the Trust collects no relative's name for a purpose we have not ruled (`-398` MA2's ground), and we are told plainly
why a matter the October note called the author's decision now comes to us.

## 📜 Policy meaning (AI-10-1 — read before the ACs)

⭐ **This story introduces no predicate that gates a member's access to a benefit, and changes none.** In the member's terms:
*whether a family lists its relatives, and who is on the list, changes nothing that any member, family or nominee receives — the
list is never read by a claim, a nominee check, the choice of the neighbours asked about a death, or any eligibility rule.*
⭐ **Checked against the Niyamavali** (2026-10-30, the private corpus in the main checkout, `docs/legal/niyamavali.md`, by grep for
family / relative / kin / child / minor / memorial / dependant): the rulebook **defines no family of a deceased member and gives no
purpose for recording relatives**; its only memorial passages are §6.5 (post-decision visibility on the Sahyog Vivran) and Part 10
item (c) (claim-time *In Memoriam* consent, pre-`-162` and binding nothing — the 11b.4 note's E2) — the same finding as Row 41 (j).
**Result: no conflict; the rulebook is silent.** ⚠ AC10 makes the "never read by anything else" half **mechanical** (a source pin),
because it is the half a future story would break without noticing: the `6.27a` deferred item already wants a *"family-link
substrate"* to exclude relatives from the peer-mesh five — reusing this list for that would be exactly the purpose-creep `-398`
MA2 forbids, and needs its own Panel question.

## 🎯 What already EXISTS — read at `01062c51` (re-verify at Task 0.1)

| Need | What exists | Reuse? |
|---|---|---|
| The submission row | `memorial_submissions` (`0182:71-99`, `0183`): Tier-1 `body_ciphertext text NOT NULL`, `alt_text_ciphertext text`; `authorisation_copy_version`, `authorisation_locale`, `handover_recipient`, `handover_nominee_ref`; chain via `supersedes_submission_id` (UNIQUE + composite FK within one pool); `idempotency_key` (0183). Grants: `SELECT, INSERT` + column-level `GRANT UPDATE ("body_ciphertext","alt_text_ciphertext")` for the erasure scrub ONLY; RLS ENABLE + FORCE, SELECT / INSERT / UPDATE policies on `app.pariwar_id`. ⛔ No DELETE anywhere. ⛔ No append-only TRIGGER on any memorial table — append-only is the grants' absence. Header (0182:21): ⛔ no CHECK on a ciphertext column (it re-runs on the scrub's UPDATE). Drizzle: `packages/domain/src/schema/memorial_submissions.ts:53-55` (`piiColumn(1, MEMORIAL_FIELD_CLASS)`) | ⭐ KL5 adds ONE nullable Tier-1 column here |
| The review row | `memorial_review_decisions` (`0182:119-152`): one row per submission; `action` (3 values); `omissions jsonb DEFAULT '[]'` of `{field,start,end,reason}` UTF-16 spans, validated by the SQL function `memorial_omissions_valid(v jsonb)` (`0182:47-68`, `field IN ('body','altText')` at :63); `photo_left_out_reason` (a scalar, ⛔ not a span); CHECK `omissions_iff_action` (`0182:135-140`: `approved_with_omissions` ⇔ `jsonb_array_length(omissions) > 0 OR photo_left_out_reason IS NOT NULL`) | ⭐ KL6 adds a per-entry column beside `photo_left_out_reason` and REPLACES that CHECK |
| The four reasons | pgEnum `memorial_review_reason` (`0182:30`) = `attacks_someone_named · accuses_someone_of_wrongdoing · against_the_law · identifies_a_child`; domain tuple `MEMORIAL_REVIEW_REASONS` (`packages/domain/src/memorial/vocab.ts:19-24`; header :4-5: a new value needs a decision entry); contracts copy pinned equal by `packages/contracts/tests/memorial.test.ts` | ⭐ Reused unchanged — ⛔ no fifth reason (PC1) |
| Omission fields | `MEMORIAL_OMISSION_FIELDS = ['body','altText']` — domain `vocab.ts:55`, contracts `vocab.ts:24`; hard-coded again in admin `derive.ts:85` (`for (const field of ['body','altText'] as const)`) and the presenter (`packages/ui/src/memorial/presenter.ts:93-94`) | ⛔ **Not extended** — the list is ⛔ not text; KL6 models it per ENTRY, like the photo (Trap 3) |
| Send (multipart) | `POST /api/v1/member/memorial/submissions` (`apps/api/src/modules/memorial/routes.ts:58-66`, preHandlers `[memorialSwitch, memberSession, handoverStepUp]`); `readSendMultipart` (`handlers.ts:173-226`) enforces `MEMORIAL_SEND_FIELDS = ['body','altText','authorisationCopyVersion','authorisationLocale','keepPreviousPhoto']` (`packages/contracts/src/memorial/dto.ts:99`) — unknown part ⇒ `memorial.field_not_allowed`; limits `{files:1, fields:10, fieldSize:32KiB, parts:12}` (`handlers.ts:133-139`); validation order `handlers.ts:489-526`; sequence: photo strip + put → **encrypt BEFORE the lock** (:570) → `lockMemorialPool` (:582) → `insertMemorialSubmission` (:630) | ⭐ KL8 adds ONE part `kinship` (a JSON string) |
| Copy-version gate | `decideMemorialSend` (`packages/domain/src/memorial/submission.ts:132-149`): the echoed version must equal `MEMORIAL_SUBMISSION_AUTHORISATION_COPY_VERSION` else `authorisation_outdated`. Registry `packages/domain/src/memorial/authorisation-copy.ts:48-127` (v1, v2, v3 — all `hiReviewed: false`; current v3 at :130). Rule :10-12: a version is ⛔ never edited, a change mints a new one. v3's text (:108-115) covers *"these words, and the photo if you added one"*; :35-36 *"the permission covers the FAMILY's words and photo only"* | ⭐ KL7 mints v4 naming the list |
| Crypto | `apps/api/src/modules/memorial/memorial-crypto.ts` `encryptMemorialField` / `decryptMemorialField` (:19-29), `MEMORIAL_FIELD_CLASS = 'memorial'` (`packages/domain/src/encryption/field-classes.ts:111`), keyed on `pariwarId`, verbatim UTF-8 (⛔ no trim, ⛔ no normalisation) | ⭐ Reuse — the list is ONE ciphertext (KL5) |
| Member view | `GET /api/v1/member/memorial` (`handlers.ts:350-445`) → `MemorialMemberView` (`dto.ts:49-88`: `omissions`, `photoLeftOut`, `authorisation:{copyVersion,text:{hi,en}}`, `idempotencyKey`…); decrypt AFTER the tx | ⭐ Extend with the list + its left-out entries |
| Review API + screen | `apps/api/src/modules/memorial-review/` (`memorial.review`, routes :47-80; `decide` `handlers.ts:268-340`: decrypt → `validateMemorialDecision` → `400 memorial_review.invalid_omissions {problem}` → encrypt note → lock → insert). Input `MemorialReviewDecisionInput` (`dto.ts:210-233`, `.strict()`; `photoLeftOut: {reason}` optional). Shared validator `packages/contracts/src/memorial/omissions.ts` `validateMemorialDecision` (:102-153; problems :37-49). Admin `apps/admin/src/modules/memorial-review/MemorialReviewPage.tsx` (820 lines): `SentencePicker` (:550-595), `ReasonSelect` (:519-543), the photo checkbox + reason (:711-726), `DecisionForm` (:603-767, pre-check :668), `VersionCard` history (:412-500); `derive.ts` `buildOmissions` (:83-97) | ⭐ KL6 adds a per-entry checkbox + `ReasonSelect` modelled on the PHOTO, ⛔ not on `SentencePicker` |
| Mobile flow | `apps/mobile/app/(memorial)/`: `index` → `write` (*"Start from what I sent"* — `write.tsx:88` `original` / `write.start_from_sent`, the family's OWN last-sent text, a tap) → `photo` (`keepPreviousPhoto` :115, :135; pushes to `preview` at :176 AND :234) → `preview` (Send; permission text above the button :165-169) → `outcome` (left-out parts with reasons — `MemorialText showReasons`, `outcome.photo_left_out`, `outcome.alt_text_left_out`). FormData built in `apps/mobile/lib/use-memorial-send.ts:282-291`. Draft `apps/mobile/lib/memorial-draft.ts`: key `memorial-draft:v1:${memberId}:${driveId}` (:50-52), shape :40-48, **`sendContent(d)` (:65-67) lists the fields whose edit drops the kept Idempotency-Key** — it returns `readonly (string | boolean)[]` compared element-by-element with `===` (:96), so every element must be a primitive; `memorialDraftHasContent` (:113-115). The draft is CLEARED after a landed Send (`use-memorial-send.ts:259` `clearMemorialDraft`) — a re-send usually starts empty (cleared unless the draft changed during the Send). The server's idempotency replay ignores the payload (`handlers.ts:460-486`, :585-590), so this client-side framing is the only guard. i18n namespace `memorial` (`packages/i18n/locales/{en,hi}/memorial.json`, via `useMemorialT`) | ⭐ KL8 adds `family.tsx` between `photo` and `preview`; the draft gains `kinship` |
| Public render | `apps/public/src/components/FamilyMemorial.astro` (heading → `<figure>` + `<PortraitFrame>` → one `<p dir="auto">` per paragraph; three `visibilityOf('sahyog-vivran', id, 'public')` calls :32-36; spacing-only inline styles — 11b.5 MV5); `src/lib/family-memorial.ts` `planFamilyMemorial`; `src/lib/surface-fields.ts` `SahyogVivranFamilyMemorialView` (:642-649), `SAHYOG_VIVRAN_FAMILY_MEMORIAL_FIELD_IDS` (:754-758), `SAHYOG_VIVRAN_FAMILY_MEMORIAL_SHAPE` (:761-765); wire → view `src/lib/sahyog-vivran-render.ts:481-487`; **wire guard `src/lib/sahyog-vivran.server.ts:210-222` `isFamilyMemorial` requires keys EXACTLY `photo,words`** (called :336 — any new key sends the whole page to its outage state); page `src/pages/sahyog-vivran/[driveToken].astro:608-614` (its :36 already notes `<KinshipLattice>` → row 11b-5a) | ⭐ KL10 adds `<KinshipLattice>` inside the section |
| Public wire | `packages/contracts/src/public-pages/sahyog-vivran.ts:214-220` `PublicSahyogVivranFamilyMemorial = { words: string[], photo: {altText}\|null }.strict()`, embedded at :541; doc-block :197-213 *"FINISHED STRINGS ONLY"* (no marker, reason, key, kind or cut position); prohibited keys :237-244. API: `resolvePublicFamilyMemorial` (`apps/api/src/modules/public-pages/memorial-public-read.ts:24-67`; sentinel check :57), `publicMemorialText` / `joinKeptSegments` (`memorial-public-text.ts:36-104`), domain `readPublicMemorial` (`packages/domain/src/memorial/public-read.ts:52-66`) | ⭐ KL10 adds `kinship` |
| Matrix | `packages/contracts/public-pages/public-vs-private-matrix.yaml` (memorial rows :1347-1404, each `tier: public`, `pii_tier: 1`, with `tier1_public_exception {decision, rationale, scope}`); `packages/contracts/src/public-pages/matrix.ts` `RULED_TIER1_PUBLIC_EXCEPTIONS` (:398-526; memorial :518-520; :514 *"Each pair cites its OWN authority (`2026-09-07-205` cl.2)"*; a Tier-1 public field not on it fails the parse :528-541). ⛔ No golden hash — the pins are exact lists (Trap 6) | ⭐ KL10 adds the FOURTH memorial pair, on the NEW ruling's id |
| Helpline view | `packages/contracts/src/memorial/takedown.ts:79-97` `shown: { submissionId, sentAt, words, hasPhoto, photoUrl, altText }` — built in `apps/api/src/modules/memorial-takedown/handlers.ts:187-218` via `publicMemorialText` (throws `takedownNotFound()` on a body / alt sentinel, :194) so the operator sees what the public sees; screen `apps/admin/src/modules/memorial-takedown/MemorialTakedownPage.tsx` (+ `i18n-en.ts`) | ⭐ KL11 adds the list |
| Review DTOs | `MemorialReviewDecisionOutput` (`dto.ts:147-157`, carries `photoLeftOutReason`) nested as `decision` in `MemorialReviewVersion` (`dto.ts:169-185`); the review-detail handler builds both field by field (`memorial-review/handlers.ts:210-243`, its `dec()` helper counts `fields_decrypted` and sets `unavailable` on failure); the decide audit `requestPayloadHash` lists fields explicitly (:302-311); the Send audit hashes ⛔ no digest of the words (`memorial/handlers.ts:599-609`) | ⭐ KL6 / KL12 extend each |
| Chain reads | `readMemorialChain` uses `.select()` (all columns) ⇒ a new column flows to `readPublicMemorial` and the review / member / take-down reads with no extra select work; ⛔ no withdraw / take-down / supersede path copies a submission's ciphertexts (only `keptPhoto`) | ⭐ Nothing to copy |
| Erasure | `packages/domain/src/member/anonymize.ts:175-212` scrubs `body_ciphertext` / `alt_text_ciphertext` (CASE-NULL) / the two notes to `ANONYMIZED_SENTINEL` (:94); RLS spec `packages/domain/tests/integration/rls/memorial-policy-regression.spec.ts` `SCRUBBABLE` (:49-53) + (c)/(c2) exact-UPDATE-column asserts (:250-275) + scrub legs (v)/(w) (:755-841) | ⭐ AC9 — the new column joins every one |
| A relation vocabulary | `NOMINEE_RELATIONSHIPS` (20 codes, `-257` Trustee-ratified; `packages/domain/src/nominee/relationship.ts:14-35`, contracts lockstep `packages/contracts/src/nominee/relationship.ts`); Hindi `packages/i18n/locales/hi/common.json:64-83` — picker labels, several slash-compound (*"चाचा / ताऊ / मामा / फूफा / मौसा"*), gender-neutral (*जीवनसाथी*, *बेटा*); `ClaimantRelationship` (5, wire-only, `packages/contracts/src/claims/filing.ts:38`) | ⛔ **Not reused** — ruled for the nominee's relation for a different purpose; labels are a form picker's, ⛔ not an obituary's (KL3) |
| Prototype | `apps/mobile/components/shradhanjali/KinshipLattice.tsx` + `sample-data.ts:19, 42-47` (`{ relation: string; names: string }`, free Hindi relation words, comma-joined names), mounted at `app/(tabs)/shradhanjali.tsx` | ⛔ **Not production, ⛔ not extended, ⛔ not deleted** (every 11b story recorded this) — the LOOK only |

**What does NOT exist (each checked by grep at `01062c51`):** any kinship column, contract, i18n key, matrix field, wire key,
`memorial.kinship*` refusal code or component outside the prototype and three comments (`[driveToken].astro:36`,
`sahyog-vivran-render.ts`, `apps/mobile/app/(tabs)/shradhanjali.tsx:6` — the last sits outside the prototype directory, so STOP 4's
grep shows it); any `member_family` /
dependants / household table; any public relationship value anywhere (`members.astro:30` and `lib/members-render.ts:21` forbid
*"social graphing or relationship visualisation"*); the memorial in the member data export (`packages/domain/src/data-export/assemble.ts`
reads ⛔ no memorial table — KL13).

### The epic's ACs, clause by clause, against the pin (footgun 12 — the premise against the live data)

| Epic clause | At the pin | Where |
|---|---|---|
| 11b.4 step (d): *"optional kinship details for Story 11b.5 `<KinshipLattice>`"* | ⛔ Not collected (`-398` MA2) | PQ1 → KL8 |
| 11b.5: *"`<KinshipLattice>` renders optional kinship relationships (parent / spouse / child / sibling of deceased) when family provides them in Story 11b.4"* | ⛔ No data; ⚠ *"child"* is listed — PQ1 decides whether a child may be named | PQ1, KL3, KL4 |
| 11b.5: *"visualization is respectful structural diagram, NOT social-network-style graph (inheriting Story 11a.3 legitimacy-not-social-graph invariant)"* | ⚠ Contradicted by UX :475 / :1962-1968 (a `<dl>`, *"NOT a family-tree diagram"*) | KL2 |
| 11b.5: *"matrix-tier respecting + Hindi-first per Story 2.1; accessibility per Story 0.10"* | Matrix: a new Tier-1 public pair needs its own ruling (`-205` cl.2) | KL10, AC7 |
| 11b.4: *"tone-review (Story 2.2) applies for member-facing copy"* | The `memorial` namespace's non-author tone review is Row 41 (c), open | AC12 |
| UX `<MemorialAuthorshipSurface>` anatomy: *"`<KinshipLattice>` editor"*; UX :1671 *"any family member with handover credentials … add kinship details"* | ⚠ `-391` Q1 A: only the **nominee** sends (with their code) | KL8 — the nominee only |
| UX :1966 *"empty rows hidden"*; :1968 *"Semantic definition-list (`<dl>`); screen reader announces 'wife: Sunita Devi, son: Amit and Rahul'"* | — | KL10, AC7 |

## 🧭 Build decisions KL1–KL16 — ALL ANSWERED by BigDev at Task 0.2 (2026-10-31: KL1–KL14, then KL15–KL16 — *"KL15 and KL16 looks good"*). ⭐ marks the recommendation.

⭐ **The answer, verbatim:** *"KL1-KL2, KL5-KL14 as recommended. KL3 - Use a closed domain vocabulary, not the nominee relationship
vocabulary or free text. I recommend splitting grandchildren into four precise relations rather than using only grandson /
granddaughter. KL4 - One relation and one name per entry; adults only by name; maximum 20 entries. I recommend a 200-code-point
name limit rather than 80."* ⇒ every KL below is **(a)**; KL3 with **fourteen** codes (the four-way grandchildren split — this also
answers Q-copy-1's structural half and keeps grandchildren in the list: Questions-list item 2); KL4 with a **200**-code-point cap
(answers Q-copy-6). Every other Task 0.2 item was answered later the same day (copy, KL15, KL16, Questions 7–8 — see each).
These are build decisions; what is disclosed is RULED by `-426` / `-428` (the RULED block at the top).

### KL1 — Order of work: the Panel first, the build after
⭐ **(a)** Task 0 asks; Tasks 1–9 build only what is ruled; under **PQ1 D** the story closes on records alone (appendix A3 (d)).
**Why:** `-398` MA2 (⛔ no names held for an unruled purpose); the 11b.4 precedent (note drafted, ruled, then built). **Cost:** the
row sits at `ready-for-dev` with ⛔ no code until the Panel answers (the 6.33 precedent: a row at `ready-for-dev` through its own
Task 0). Rejected — **(b)** build the capture + render dark behind the switch while
the question is out (code for a ruling that may never come — the 10.10 shape; and MA2 is about *holding* names, which
a dark build would ⛔ not do, but the fixtures and copy would pre-empt the Panel's choice of wording).

### KL2 — The look: a two-column label/value list, ⛔ never a diagram
⭐ **(a)** UX §11's `<dl>` (`ux-design-specification.md` :1962-1968; :475 *"a simple two-column key-value list (NOT a family-tree
diagram)"*): one row per relation, relation label left, names right, joined by `, `. ⛔ No tree, ⛔ no lines, ⛔ no avatars.
**Why:** the UX is the later and more specific source; a `<dl>` is what a screen reader announces as pairs (UX :1968); both sources
forbid a social graph. **Cost:** the epic's *"structural diagram"* wording is ⛔ not delivered — recorded as a narrowing of the plan,
⛔ not of a ruling. Rejected — **(b)** a diagram (the epic's word; harder to make accessible; reads as a family tree).

### KL3 — The relations: a NEW closed list of fourteen, in obituary words
⭐ **(a)** — ⭐ **BigDev, Task 0.2 (2026-10-31):** a closed domain vocabulary (⛔ not `NOMINEE_RELATIONSHIPS`, ⛔ not free text), grandchildren
split four ways. `MEMORIAL_KINSHIP_RELATIONS` = `wife · husband · son · daughter · father · mother · brother · sister · sons_son ·
daughters_son · sons_daughter · daughters_daughter · daughter_in_law · son_in_law` — **in this display order** (spouse, children,
parents, siblings, grandchildren — grandsons before granddaughters, the son's line first — in-laws). ⭐ **Every code is the person's relation TO THE MEMBER WHO DIED** (a deceased woman's spouse is `husband`; the nominee's
own mother, if she is the member's wife, is `wife`) — said in the code's doc-block, the screen's question (Q-copy-2) and the
reviewer's screen. Hindi labels (**approved by BigDev, Task 0.2 Q-copy-1, 2026-10-31: *"fourteen labels are fine"***; the non-author Hindi review of `docs/tone-review-checklist.md` (`reviewedBy ≠ authoredBy`) still decides `hiReviewed` — Row 41 (s)): पत्नी · पति ·
पुत्र · पुत्री · पिता · माता · भाई · बहन · पौत्र · नाती · पौत्री · नातिन · पुत्रवधू · दामाद — one plain word each (पौत्र = a son's son, नाती =
a daughter's son, पौत्री = a son's daughter, नातिन = a daughter's daughter — the distinction obituaries keep), ⛔ no slash label
anywhere (the ground on which (b) below is rejected). English (approved with the Hindi): Wife · Husband · Son · Daughter · Father · Mother · Brother ·
Sister · Grandson (son's son) · Grandson (daughter's son) · Granddaughter (son's daughter) · Granddaughter (daughter's daughter) ·
Daughter-in-law · Son-in-law. ⚠ **Grandchildren are very often minors** (and so are sons and daughters when a young member dies) —
kept by BigDev's answer; under `-426` the protection is the guardian declaration (KL16) plus `identifies_a_child` for a child it cannot cover.
The six relation groups (fourteen codes) are written into PQ1 A's option text (appendix A1 G10). ⛔ No `other`, ⛔ no free-text relation: anyone
else, the family names in its own words (which the reviewer already reads). Minted as a domain tuple + contracts copy pinned equal,
⛔ no pgEnum (the code lives only inside the ciphertext — KL5). Minted in **our** author-commit (a member-facing vocabulary — the
`-398` §2 precedent: ⛔ not under the `-210` cl.2 delegation).
**Why:** the nominee list (`-257`) answers *"who is your nominee to you"* on a form; an obituary says *पत्नी* and *पुत्र*, ⛔ not
*जीवनसाथी* or *"चाचा / ताऊ / मामा / फूफा / मौसा"*. Free text would be a second Tier-1 text field the reviewer must read span by
span. **Cost:** a family with a relation off the list (an uncle, a niece) cannot list them — only name them in the words; gendered
codes assume the family picks the right one (it does — it is their family). Rejected — **(b)** reuse `NOMINEE_RELATIONSHIPS`
(slash-compound picker labels on an obituary; a ruled vocabulary borrowed for a purpose it was ⛔ not ruled for); **(c)** free text.

### KL4 — One entry = one relation + one name; children by name only on the guardian's declaration (`-426`)
⭐ **(a)** — ⭐ **BigDev, Task 0.2 (2026-10-31):** one relation and one name per entry; adults only by name (⚠ superseded for children by `-426` — KL16); at most 20 entries; a 200-code-point
name cap. `MemorialKinshipEntry = { relation: MemorialKinshipRelation; name: string }` — **name required**, 1–200 Unicode code points
on the raw string (`memorialCodePointLength`, `packages/contracts/src/memorial/text-classes.ts:44`), blank by the existing
`isMemorialTextBlank` (:39 — ZWJ/ZWNJ-only counts as blank; ⚠ "." or "🙏" passes as a name — accepted, recorded) ⇒ refused. The 200
cap matches the codebase's other name limit (`packages/contracts/src/claims/contact.ts:43`). ⭐ It fits the multipart `fieldSize`
of 32 KiB (`handlers.ts:134-140`): `JSON.stringify` writes Devanagari as raw UTF-8 (3 bytes a code point) ⇒ 20 × 200 × 3 ≈ 12 KB;
the worst case, every code point a lone surrogate escaped as `\uXXXX` (6 bytes), is ≈ 24 KB + ~1 KB of JSON — still under. A leg
sends 20 entries at the cap and proves the part is accepted. **One person per entry** — the screen says so (Q-copy-2), so *"अमित, राहुल"* is ⛔ not
typed into one name (that would defeat KL6's per-entry cut); at most **20** entries;
duplicates allowed (two sons called the same? the family's call — ⛔ never deduplicated). Names are kept **exactly as typed** (⛔ no
trim, ⛔ no case or Unicode normalisation, ⛔ no initials — [[feedback_never_mangle_member_names]]). ⭐ **Superseded by `-426` (AQ1 A):** the screen says
a child may be named only by their parent or guardian or with that person's agreement (copy **2.4A**), and the sender gives the
declaration at Send (KL16); the reviewer leaves out an entry on `identifies_a_child` only for a child the declaration cannot cover
(KL16's reading). ~~"adults only … the reviewer leaves out any entry that names a child"~~ — the plan text before the ruling. Rendered grouped by relation in KL3's order, names in the family's order within a relation.
**Why:** one entry per person makes "leave out this one name" a clean act (KL6) and a later per-person removal possible (PQ2 B).
**Cost:** a name on a false declaration stays up until someone tells the Trust (`-426`'s accepted cost). Rejected — **(b)** name
optional (a nameless *पुत्री* row would say "a child is here" — the absence-leak [[feedback_withholding_must_be_uniform]] warns of);
**(c)** the prototype's `names: string` comma list (one omission would cut inside a string).

### KL5 — Storage: ONE Tier-1 ciphertext column on the submission
⭐ **(a)** Migration `0193_memorial-kinship.sql`: `ALTER TABLE memorial_submissions ADD COLUMN kinship_ciphertext text` (nullable =
no list; an empty array is ⛔ never stored — no list is `NULL`); `GRANT UPDATE ("kinship_ciphertext") ON memorial_submissions TO twt_app`
(the erasure scrub; the table-level SELECT/INSERT already covers a new column — `0183:20-23`); ⛔ no CHECK on it (0182:21); Drizzle
`kinshipCiphertext: piiColumn(1, MEMORIAL_FIELD_CLASS)('kinship_ciphertext')`. The plaintext is `JSON.stringify(entries)`, encrypted
with `encryptMemorialField` **before** `lockMemorialPool` (`submission.ts:9`: ⛔ no KMS call under the lock). The relation codes
are INSIDE the ciphertext (a family's shape — *"a widow and three daughters"* — is itself personal). ⭐ **Migration conventions**
(0183's): idempotent — `ADD COLUMN IF NOT EXISTS`, `DROP CONSTRAINT IF EXISTS` + `ADD CONSTRAINT`, the new CHECK inside a
`duplicate_object` guard; the journal `when` by convention `1796269200038` (0192 = `1796182800037`, +86400001) — re-read 0192's at
Task 3.1. ⛔ No UPDATE grant on `kinship_omissions` (the decisions table's only UPDATE grant stays `internal_note_ciphertext`; its
INSERT is table-level, so the new column needs ⛔ no grant). Matrix escalation: `escalation_count` stays 1 — a new field has ⛔ no
`from` tier (matrix YAML :1255 precedent).
**Why:** the list is versioned with the words (each Send carries the whole memorial; the chain, the supersede, the take-down and
the Trust's withdraw-approval all act on the submission and so on the list, for free). **Cost:** the reviewer's per-entry omission
indexes into a decrypted array (KL6) rather than a row id. Rejected — **(b)** a child table `memorial_kinship_entries` (its own
grants, RLS, FK chain, scrub, policy spec — four times the surface for no new behaviour); **(c)** plaintext relation codes (a
family's structure in clear).

### KL6 — The Trust's review: leave out a WHOLE entry, on one of the four reasons, like the photo
⭐ **(a)** `memorial_review_decisions` gains `kinship_omissions jsonb NOT NULL DEFAULT '[]'` — elements `{ index: int, reason:
memorial_review_reason }`, `index` = the entry's position in the submission's decrypted list, sorted ascending, unique — validated by
a NEW SQL function `memorial_kinship_omissions_valid(v jsonb)` (exactly the 2 keys; integer `index >= 0`; reason in the four) in a
CHECK; the CHECK `omissions_iff_action` is **dropped and re-added** so `approved_with_omissions` ⇔ `jsonb_array_length(omissions) > 0
OR photo_left_out_reason IS NOT NULL OR jsonb_array_length(kinship_omissions) > 0`, and every other action requires all three empty.
Contracts: `MemorialReviewDecisionInput` gains `kinshipLeftOut: z.array(z.object({ index, reason }).strict()).max(20).optional()`;
`validateMemorialDecision` gains problems for an index out of range / unsorted / duplicate and for kinship on a submission with
⛔ no list (⭐ grep `packages/contracts/src/memorial/omissions.ts` for the existing problem names first — footgun 63(b)). ⚠ **Every
validator site the field reaches** (`omissions.ts`): `MemorialDecisionCandidate` (:24-29) gains `kinshipLeftOut`;
`MemorialDecisionSubject` (:31-35) gains `kinshipLength: number | null`; **all three `action_shape` checks count kinship** — `approved`
(:110-111) and `not_approved` (:115-116) refuse any `kinshipLeftOut`, and `approved_with_omissions` (:129) is refused only when
`omissions`, `photoLeftOut` AND `kinshipLeftOut` are all empty. Miss one and a kinship-only decision is refused, or `approved` +
`kinshipLeftOut` passes the validator and hits the DB CHECK as a 23514 ⇒ a 500. Admin `i18n-en.ts:110` `PROBLEM_SENTENCES:
Record<MemorialDecisionProblem, string>` will ⛔ not compile until each new problem has a sentence. The server validates against the
decrypted list length. ⛔ No name-only cut (the entry goes, relation and all). `MEMORIAL_OMISSION_FIELDS` is ⛔ not extended (Trap 3).
**Output + audit:** `MemorialReviewVersion` gains `kinship: MemorialKinshipEntry[] | null`; the nested `MemorialReviewDecisionOutput`
gains `kinshipLeftOut: { index; reason }[]`; the review-detail handler decrypts the list through its `dec()` helper (counted in
`fields_decrypted`, `unavailable` on failure); the decide audit `requestPayloadHash` adds `kinship_left_out` (indexes + reasons —
⛔ not PII).
**Why:** the photo is already modelled this way (a scalar beside the spans); a whole-entry cut is uniform — the public cannot tell a
left-out son from one never listed. **Cost:** one CHECK drop/re-add on a populated table (the dev DB has rows; the constraint is
re-validated — keep it `VALID`, the existing rows satisfy it trivially since the new column defaults to `[]`). Rejected — **(b)** a
`'kinship'` omission `field` with character offsets into the JSON (spans over serialised JSON — a cut could leave a broken row);
**(c)** let the reviewer EDIT a name (`-398` MA6: ⛔ never edits — invariant by absence).

### KL7 — The permission at Send names the list, both places and the declaration (a new version, v4)
⭐ **(a)** Mint `MEMORIAL_SUBMISSION_AUTHORISATION_VERSIONS` v4 (`2026-1M-DD.v4-pending-hi-review`, `hiReviewed: false`), its text v3's
with exactly the marked changes of Q-copy-3 (APPROVED 2026-10-31; ④ RE-APPROVED 2026-10-31 — BigDev: *"approved"*). ⭐ **After `-426` / `-428`:** v4 names the list, **both places** it appears (the public page and the member app — `-391` item 2:
*"told exactly where"*; the member app per the `-428` rider, built by 11b-5c), carries the **declaration** (KL16) in place of v3's
*"Please do not name any children"*, and takes take-down sentence **⑤B** (PQ2 B). The redrafted text is Q-copy-3 below. ⚠ v4 is ⛔ not simply "v3 plus the list": v3 en
(`authorisation-copy.ts:106-115`) says *"Only the nominee can ask for it to be taken down; the helpline will not remove it at anyone
else's request."* — under PQ2 B a named relative may have their own name removed, so v4 must reconcile that sentence with PQ2's
outcome (done — ⑤B). ⭐ **v4 carries `carriesGuardianDeclaration: true`** (KL16); v4 becomes current; a v3 echo is then refused
`authorisation_outdated` (existing behaviour — the app re-reads `view.authorisation`). v1–v3 stay, ⛔ never edited. Row 41 (a) now
waits on **v4**'s Hindi review.
**Why:** `-391` item 2 — *"the family is told exactly where it will appear"*; v3 says *"words and photo"* only. **Cost:** Row 41 (a)
restarts on a new text; a family mid-draft on v3 is asked to look again at the permission. Rejected — **(b)** edit v3 in place (the
registry rule; the record would lie about what earlier senders agreed to).

### KL8 — The family's screen: one optional step, the nominee only
⭐ **(a)** A new screen `apps/mobile/app/(memorial)/family.tsx` between `photo` and `preview` (`photo` → `family` → `preview` — BOTH
of `photo.tsx`'s pushes, :176 and :234, become `family`; `preview` gains a *"Change the family list"* link like `change_photo`). The
screen asks *"How is each person related to {the member}?"* and says *"One person per row"* (Q-copy-2). Rows of (relation picker over
KL3 + a name field), *"Add someone"*, *"Remove"*, and a plain *"Skip"* / *"Continue"* — ⛔ never required, ⛔ never pre-filled (epic
Trap 3: the box starts empty; ⛔ nothing from the nominee record or the claim). ⭐ **Re-send:** the draft is cleared after a landed
Send, so on a re-send (`view.memorialState !== 'none'` and `view.kinship !== null`) `family.tsx` offers *"Start from the list I
sent"*, which fills the rows from the family's OWN last-sent list (`view.kinship`, ⛔ not as approved) — a tap, ⛔ never automatic,
only while the rows are empty — exactly as `write.tsx` offers the words (`write.start_from_sent`). This is ⛔ not "pre-filling": the
ban is on the nominee record and the claim, ⛔ not the family's own earlier Send. Preview says *"No family list"* when the draft has
none and the previous version had one (else a re-send to fix one word silently takes the list off the page at the next approval).
The draft gains `kinship?: { relation; name }[]` — **added to `sendContent` (`memorial-draft.ts:65-67`) as a STRING,
`JSON.stringify(d.kinship ?? [])` (absent ≡ empty; an array element would compare by reference at :96) [⭐ 2026-11-01 review RP1: now `JSON.stringify` of the rows the Send would carry, as `[relation, name, inPhoto]` tuples], and to
`memorialDraftHasContent` (:113-115) as `(d.kinship?.length ?? 0) > 0`** (else an edit to the list is replayed away under the kept
Idempotency-Key — the R6 trap); the key stays `v1` (an additive optional field; the reader tolerates its absence). The FormData gains
part `kinship` = `JSON.stringify(entries)` only when non-empty; `MEMORIAL_SEND_FIELDS` gains `'kinship'`; the server parses it with a
`.strict()` Zod array schema (KL4's limits) and refuses with a NEW code family (grep `memorial.` codes first — footgun 63(b); ⛔ no
`memorial.kinship*` exists at the pin), `memorial.kinship_invalid` (malformed / unknown relation / too many / blank or too-long name
/ **an empty array `[]`** — the client never sends one, so a `[]` is a malformed client; ⛔ never coerced to `NULL`), mapped in
`memorial-copy.ts`. The Send audit adds at most `has_kinship: boolean` — ⛔ never a digest of the list (names are short and
guessable; `handlers.ts:599-609` hashes ⛔ no digest of the words for the same reason). Whoever
holds the step-up (the nominee's code, `-391` Q1 A) is the only author — ⛔ no second family author (UX :1671 / :2155 overridden by
the ruling).
**Why:** the list is the family's; it is optional and separate from the words so a family that wants none never sees a field it must
leave empty. **Cost:** one more screen in a grief flow (Story 0.9 un-attested — carried); the multipart `fields: 10` limit has room
(5 used + 1). Rejected — **(b)** fields inside `write.tsx` (crowds the one screen that must stay calm); **(c)** a draft-key bump to
`v2` (orphans every saved draft for an additive field).

### KL9 — The family sees the list as it will appear, and what was left out
⭐ **(a)** `preview.tsx` renders the list exactly as the public will (KL10's grouping and labels — a shared pure helper, ⛔ never two
implementations; the RN render is ⛔ not framed or styled beyond the existing preview — 11b.5 MV6). `outcome.tsx`: for each left-out
entry, one line *"{relation} — {name}: left out by the Trust. The reason: {reason}"* (Q-copy-4), reusing `outcome.reason` and
`reason.<4>`. `MemorialMemberView` gains `kinship: MemorialKinshipEntry[] | null` and `kinshipLeftOut: { index; reason }[]`.
⚠ On the member view (`memorial/handlers.ts:388-401`) a kinship decrypt failure sets `unavailable` and `canSend: false`, exactly as
for the words — else the family could re-send with `kinship: null` and silently drop the list. The relation labels come from ONE
home, `memorial.kinship.<code>` + `memorial.kinship.heading` (en + hi), read by the mobile picker / preview / outcome AND by
`apps/public` (the shared catalog registers every namespace — `packages/i18n/src/catalog.ts:82-87`); ⛔ no second copy in
`sahyog-vivran`. The admin (English-only) holds its own English labels in `i18n-en.ts`, pinned equal to `memorial.json` en by a test.
**Why:** `-391` Q4 A — the family is told what was left out and why, and may change it and send again. **Cost:** the reason for a
child's name is shown to the nominee who typed it (as for the words today).

### KL10 — The public `<KinshipLattice>`: inside the memorial section, after the words, its own matrix field
⭐ **(a)** `apps/public/src/components/KinshipLattice.astro`, props `{ heading: string; rows: readonly { label: string; names:
string }[] }`, markup: `<h3 id="sv-family-kinship-heading">` + `<dl data-field="family_memorial_kinship" aria-labelledby=…>` of
`<dt>{label}</dt><dd dir="auto">{names}</dd>` (every matrix field carries `data-field` — `family-memorial-source.test.ts:158-159`,
`family-memorial-render.spec.ts:175-178`), static spacing-only inline styles on the 11b.5 MV5 pattern (`var(--space-row)`) **inside
`KinshipLattice.astro`** (⛔ never a new styled wrapper in `FamilyMemorial.astro` — the exact-three-styles pin,
`family-memorial-source.test.ts:162-166`), ⛔ no class, ⛔ no `<style>`, ⛔ no `set:html`. Placed in `FamilyMemorial.astro` after the
last paragraph (UX anatomy: parichay → kinship). **Gating lives in `planFamilyMemorial`** (`src/lib/family-memorial.ts`, pure — the
component only renders its verdicts): it gains a `kinship` verdict — the lattice is drawn **iff the section is drawn AND
`family_memorial_kinship` is visible at `public` AND ≥ 1 row survives**; otherwise ⛔ nothing (⛔ no heading, ⛔ no empty `<dl>`). (A
lattice with ⛔ no words is unreachable — `nothing_left` refuses leaving out every word, `omissions.ts:146`.) Heading copy Q-copy-5
(*Copy for review* 5.1: hi *"शोकाकुल परिवार"*, en ⭐ *"Mourned by"*), relation labels from KL9's ONE home `memorial.kinship.<code>` (English plurals for two or more names — 5.2). **Wire:**
`PublicSahyogVivranFamilyMemorial` gains `kinship: z.array(z.object({ relation: z.enum(MEMORIAL_KINSHIP_RELATIONS), names:
z.array(z.string().min(1)).min(1) }).strict())` — **already grouped, ordered and filtered by the API**; ⭐ **the API applies
`isolateMemorialBidi` (`@twt/ui`, `packages/ui/src/memorial/bidi.ts:39`) to EACH name before the wire** — a render view, ⛔ never
stored — exactly as `memorial-public-text.ts:80` isolates each kept piece before the join (an unclosed RLO in one name would
otherwise reorder every later name in the same `<dd>`; `dir="auto"` isolates rows, ⛔ not names); the mobile preview does the same
per name. ⚠ The relation code is a closed-set value the page translates like any enum, ⛔ not a marker, reason or cut position — the
doc-block's *"FINISHED STRINGS ONLY"* sentence is amended by a dated line saying so, ⛔ never rewritten. The guard `isFamilyMemorial`
accepts exactly `kinship,photo,words` (and validates each row's keys exactly — an unknown row key is rejected).
**One decrypt rule (this KL's; the code's comments call it 11b.4a "Trap 4"):** a sentinel, a bad envelope, unparsable JSON or a schema failure on `kinship_ciphertext` ⇒ the
**whole** memorial is `null` — the same rule `memorial-public-read.ts:4-10, :55-59` applies to the words and alt text (⛔ never "no list but
the memorial stays" — that would be a second rule); a KMS outage rethrows. The same OR joins the take-down's sentinel check
(`memorial-takedown/handlers.ts:194`). Add it to both doc-blocks. ⚠ Because a schema failure drops the WHOLE memorial, the READ
schema is ⛔ never tighter than any Send-time schema ever was (relation set ⊇, name cap ≥) — a later narrowing (a lower cap, a
ruling that removes grandchildren) filters entries at render, ⛔ never by failing the parse. **Matrix:** a fourth memorial row `id:
family_memorial_kinship`, `tier: public`, `pii_tier: 1`, `tier1_public_exception: { decision: '2026-10-31-428 item 1', rationale
(verbatim ruling), scope: 'sahyog-vivran ONLY …' }`; `RULED_TIER1_PUBLIC_EXCEPTIONS` gains `['sahyog-vivran.family_memorial_kinship',
'2026-10-31-428 item 1']` (Tier-1-public pairs nine → ten; the YAML row's `decision: '2026-10-31-428 item 1'`). ⛔ Never in `<head>`, Open Graph, a share card or a sitemap.
**Why:** v4 names two places — this story builds the public one; row 11b-5c the member app's; `-205` cl.2 requires each pair's own
authority. **Cost:** every exact-list pin moves (Trap 6 — the pasted grep). ⚠ **The members' drive view (the floor test):** under
`-428` the memorial is OWED to members (built by 11b-5c), so all four memorial ids — the three existing and the list — become
**declared GAPS owed by 11b-5c**, ⛔ no longer a data-class exclusion (Trap 6 / Task 7.2). Rejected — **(b)** fold the list into `family_memorial_words` (one field id for two
data shapes; the pair would rest on `-391` item 2, which did ⛔ not rule a list).

### KL11 — The helpline operator sees the list too
⭐ **(a)** `takedown.ts` `shown` gains `kinship` (the same grouped, per-name-isolated rows the page gets, from the same API helper,
built in `apps/api/src/modules/memorial-takedown/handlers.ts:187-218`), and the admin take-down screen
(`apps/admin/src/modules/memorial-takedown/MemorialTakedownPage.tsx` + `i18n-en.ts`) lists it under the words. A take-down removes the whole memorial, list included (no new act). **Why:** the
operator confirms with the nominee what the public sees (`-412` MP7's mirror). **Cost:** none new.

### KL12 — The review screen
⭐ **(a)** In `MemorialReviewPage.tsx`, under the words and before the photo: the list (relation label + name, the name passed through
the existing `bidiVisible` aid), one checkbox *"Leave this one out"* + `ReasonSelect` per entry — modelled on the photo control
(:711-726), ⛔ not `SentencePicker`; `DecisionForm`'s pre-check sends `kinshipLeftOut`; `VersionCard` shows each left-out entry and
its reason; the payload builder (:673-679) and the pre-check (:668) pass it. The screen states that each relation is relative to
the member who died. Copy in `apps/admin/src/modules/memorial-review/i18n-en.ts` (admin is English-only today), including a
`PROBLEM_SENTENCES` entry per new problem.

### KL13 — Erasure, export, go-live
⭐ **(a)** Erasure: the column joins `anonymizeMember`'s memorial scrub (CASE-NULL, as `alt_text_ciphertext`), `SCRUBBABLE`, the (c)/(c2)
UPDATE-column asserts and the (v)/(w) scrub legs, and the public sentinel check — ⚠ **`-423` rules this path closed for a deceased
member; it stays REACHABLE in code on `main` until row 6-38 lands (built on its branch, `e813e5ee`, row `review`, pushed to its branch, ⛔ not on `main` at 2026-10-31 — STOP 2 fired; read its `death_reported` branch before writing AC9)** (a memorial exists only after a death claim) — kept for `-391` Q5 A's *"erased with it"* in the
cases erasure stays legal (a report closed because the member is alive — `-423` Q1 (b)) and so the RLS spec's exact-column pin stays
truthful (footgun #59(a): ⛔ never write "erased with the record" without the legality). Export: ⛔ no change — the memorial is in ⛔ no
export section today; adding it is a separate call (Ravi-mode: the session member is the deceased), recorded, ⛔ not made here.
Go-live: ⛔ no new roster row — a dated annotation on **Row 41** adds criteria **(r)** the kinship rulings recorded (`-426`, `-428`) AND
rows **11b-5b** (PQ2 B) and **11b-5c** (the member-app rider) `done` AND confirms **R1–R3** answered (v4 ⛔ never live otherwise; a v5
if a promised clause is dropped or narrowed — AC12), **(s)** the KL3 / Q-copy Hindi review (folded into (a) / (c) if
BigDev prefers), **(t)** the architecture amendment to :1839-1846 (`-426` Consequence 3) and the counsel question recorded as asked.
**Why:** kinship is part of the memorial, behind the same switch (`MEMORIAL_AUTHORSHIP_ENABLED`). **Cost:** Row 41 grows again.

### KL14 — PQ2's build — ✅ RULED B (`-428`) ⇒ row `11b-5b-kinship-named-relative-removal` (minted at Task 1.2)
⭐ **(a)** ⛔ Not built in this story. **Task 1.2 mints** the row with this comment block (verbatim):
> *"`-428` PQ2 B (verbatim, as put). A helpline act removes ONE entry (by submission + index) from the version shown; ⛔ not a review
> reason (⛔ no fifth `memorial_review_reason`); ⛔ no trace on the page (the public read and the take-down `shown` apply removals
> through 11b-5a's grouping helper's left-out input). The family is told in the app (a new outcome line, ⛔ not `outcome.reason`).
> DESIGN POINTS: (1) a later Send naming the person again — the reviewer is told; (2) 11b-5a's 'Start from the list I sent' must omit or
> flag removed entries, or it revives them; (3) the caller's identity cannot be proven (the accepted cost); (4) AC10's allow-list gains
> the new files / table; (5) whether a named person has a legal right to removal is counsel's (deferred-work). ⚠ v4 ⑤B already
> promises this — if this row is descoped, mint a v5 without ⑤B's exception before go-live."*
This story builds the list so that act is possible (KL4's one-name-per-entry, KL6's index model). **Cost:** until that row lands, a
relative who asks is told *"we have noted it"* and the operator offers the nominee a re-send without them (`-393` M4 as narrowed by
`-412` MP8 (b)) — ⚠ over a clean `approved` head that means the memorial comes down first and stays off while the new version is
reviewed (`-411` item 4 / 11b.4a PC2 A, 11b.4 MA13). ⛔ Nothing is live, so ⛔ no relative can ask before go-live (Row 41 (r)).

### KL15 — "Who is in the photo": a tick on listed people — ✅ TO BE BUILT (`-426` AQ3 A, (b)1) — ✅ (a) ANSWERED by BigDev 2026-10-31
⭐ **(a)** On `family.tsx`, when the Send will carry a photo (a new one, or `keepPreviousPhoto`), each list row gains an optional *"In
the photo"* tick (copy 2.23–2.25). Stored as `inPhoto: true` on the entry, INSIDE the kinship ciphertext (KL5 — ⛔ no new column);
`MemorialKinshipEntry` gains `inPhoto: z.literal(true).optional()` (`false` refused; `.strict()` still refuses any other key). ⛔ No
new names: a tick only points at a listed person. **Send:** any `inPhoto` when `withPhoto` is false (`handlers.ts:504` — `photo !==
null || keepPreviousPhoto`) ⇒ `memorial.kinship_invalid`, before the lock — for a malformed client only: the app's FormData builder
**strips every tick** when its own photo test (`use-memorial-send.ts:286-287` — `photoUri !== null || draft.keepPreviousPhoto`) is
false (a unit leg), so copy 2.22 is ⛔ never shown for a tick. **Read:** the SAME `MemorialKinshipEntry` schema parses the list on every
read (public, member view, review, take-down) — a stricter read schema would drop every ticked memorial under KL10's one rule; the
grouping helper DROPS `inPhoto`. **Shown only** on the family's screen and the review screen (KL12 — the ticked people and relations
beside the photo); ⛔ never on the public page, the helpline's `shown` block or the wire (a leg asserts ⛔ no `inPhoto` crosses). **Re-send:**
*"Start from the list I sent"* copies `inPhoto` only when the draft keeps the previous photo; with a new photo or none, ticks start cleared
(a leg proves both). **Review:** if the reviewer leaves out a ticked entry on `identifies_a_child` while keeping the photo, the
pre-check shows a confirm — *"This person is ticked as in the photo; the photo is being kept."* — a confirm, ⛔ not a refusal.
**Why:** it makes the declaration and the review exact, and records who is in the photo for a later per-person removal. **Cost:** one more
optional control; one more personal fact per listed person, kept for good with the list. Rejected — **(b)** a free "names in the photo"
field (new names to review); **(c)** face tagging on the image (a face-to-name map of children — ⛔ never).

### KL16 — ONE declaration at Send covers the list, the words and the photo (`-426` AQ1 A / AQ2 A / AQ3 A) — ✅ (a) ANSWERED by BigDev 2026-10-31
⭐ **(a)** The declaration is **sentence ③ of the v4 permission** the nominee accepts by pressing Send (⛔ not a separate store, ⛔ not a
second tick): accepting v4 = giving it. **The record (the audit trail for a sender who lies):** the submission row —
`authorisation_copy_version` (`NOT NULL`, schema :60), `authorisation_locale`, `handover_nominee_ref` — written under the step-up session;
⛔ no new column. **The flag, ⛔ not the version string:** the registry entry type `MemorialAuthorisationVersion` (`authorisation-copy.ts:41-46`)
gains `readonly carriesGuardianDeclaration: boolean` — v1–v3 `false`, v4 and every later version containing ③ `true` (pinned in
`memorial-status.test.ts`); `MemorialReviewVersion` (`dto.ts:169-185`) gains `guardianDeclaration: z.boolean()`, computed in the
review-detail builder (`memorial-review/handlers.ts:210-243`; an unknown id ⇒ `false`) — the admin is a browser bundle and cannot import
`@twt/domain` (`apps/admin/src/modules/banners/derive.ts:12`), so it reads the boolean, ⛔ never matches a version id. **The review (words,
list and photo):** when `guardianDeclaration` is true, `VersionCard` shows a banner beside the permission line (`MemorialReviewPage.tsx:458-460`)
— *"The sender has declared they are the parent or guardian of every child named or shown, or have that person's agreement, and that every
adult named has agreed."* — and reviewer guidance is **added** (there is none today — the admin has only the label `'Names or shows a
child'`, `i18n-en.ts:101`): a new `i18n-en.ts` key shown by every reason select, including `WithdrawApprovalForm` (:769) — *use "names or
shows a child" only where something in the memorial itself shows the declaration cannot cover that child* (`-432` R3 A, as put; the family is told why). For a v4+ submission the admin
label reads *"Names or shows a child the declaration cannot cover"* and the family's outcome reason is copy 4.3. ⛔ No validator change
(`validateMemorialDecision` :102-153 never checks a reason against content). A historical v1–v3 row (dev / test data only — v1–v3 are
refused `authorisation_outdated` once v4 is current, `submission.ts:137-139`, and production never had the switch on) shows ⛔ no banner
and ⛔ no declaration guidance. **The family's screens:** copy 2.4A on the family screen; ⛔ no child line on the write or photo screens.
✅ **Both readings RULED by `-432`** (R2 A — ③'s adult half reaches names in the WORDS; R3 A — the reviewer's test, narrowed to a reason in
the memorial itself).
**Why:** `-426` rules one rule for one page; the v4 permission is already this story's (KL7). **Cost:** the reviewer's child rule becomes
a judgment, ⛔ not a mechanical one (`-426`'s accepted cost) — AC14 proves the guidance is SHOWN, ⛔ not that reviewers follow it
(un-mechanised by design). Rejected — **(b)** a separate declaration column; **(c)** the words / photo change in its own row (BigDev).

## Acceptance Criteria

### AC0 — Governance before code, the Panel before the build
**Given** Task 0
**Then** (1) the routing note `_bmad-output/planning-artifacts/trustee-panel-routing-note-<date>-11b5a-kinship.md` is written FROM
THE TEMPLATE (§0 kept as the gate; the question, the one fact, options with a cost on EVERY option, what is at stake, how much to
trust it — including the hop disclosure and why "our decision" is now a question — plain English with ⛔ no clause ids, then E1–E4
evidence carrying the ids and the verbatim texts, E4's commands RUN with their output) and committed **alone**, before any ruling and
before any code; (2) the agent ⛔ never sends it, and every record reads *"prepared for relay — ⛔ not yet sent"* until BigDev confirms; (3) each ruling, when relayed, is transcribed **verbatim** into its note's ⏳ block (everything
below kept unedited) AND into `.decision-log.md` as a Trustee-ratified entry `-NNN`, committed **alone**; (4) our author-commit `-NNN`
(KL1–KL16 as answered; records BigDev's reading of the rider, the 11b-5b / 11b-5c split and the KL16 design that `-426` left
*"to be designed in Story 11b.5a"*; mints `MEMORIAL_KINSHIP_RELATIONS`, the v4 permission (with `carriesGuardianDeclaration`), the
matrix pair under `2026-10-31-428 item 1`; supersedes ⛔ nothing ratified) is committed **alone** before the records and before code ([[feedback_governance_commits_precede_implementation]]);
(5) every number (each decision id, the migration number, the ledger letter) is re-taken immediately before its own commit. ✅ (1)–(3)
done for `-426` (`16dc6911`) and `-428` (`1bdd8cd0`); the follow-up confirms R1–R3 follow the same rule.

### AC1 — If the Panel rules D: records only — ⛔ NOT APPLICABLE (`-428` ruled PQ1 A)
**Given** PQ1 = D
**Then** ⛔ no code, column, contract, copy, matrix field or component is added; the records (Task 1.2) mark `-398` MA2's ground
**answered**, the deferred kinship items **DISCHARGED — ruled D** (⛔ not deleted), epic 11b.4 step (d) and 11b.5's `<KinshipLattice>`
annotated **dropped by ruling** (⛔ no AC edited), UX §11's lattice annotated likewise, and the row closes `done` with ⛔ no build.

### AC2 — Capture (PQ1 A)
**Given** a nominee in the memorial flow with the switch on
**When** they reach `family.tsx`
**Then** it starts empty (⛔ nothing pre-filled), offers KL3's fourteen relations in order with a name field per entry, allows 0–20
entries, and Skip / Continue both go to preview; **and** the draft saves the list on every change, `sendContent` includes it as
`JSON.stringify(d.kinship ?? [])` (an edit to the list ALONE after a failed Send mints a new Idempotency-Key — a unit leg proves it) [⭐ 2026-11-01 review RP1: now `JSON.stringify` of the rows the Send would carry, as `[relation, name, inPhoto]` tuples — same intent, canonical form],
and `memorialDraftHasContent` counts it; **and** on a re-send *"Start from the list I sent"* fills the rows from `view.kinship` on a
tap, ⛔ never automatically (a leg proves a re-send after `approved_with_omissions` can keep the list, and that preview says *"No
family list"* when the draft has none but the previous version had one); **and** the Send carries `kinship` only when non-empty;
**and** copy 2.4A sits under the screen's body text, and the *"In the photo"* tick (KL15) appears on each row only when the Send will
carry a photo; *"Start from the list I sent"* copies ticks only when the previous photo is kept; the FormData builder strips every tick
when no photo is sent; **and** the server refuses a malformed list (unknown relation, > 20, blank or > 200 code-point name, non-array,
extra keys, `inPhoto` other than `true`, a tick with ⛔ no photo in the Send, an empty array `[]`) with `memorial.kinship_invalid` before
the lock, writing ⛔ no row; **and** a name is stored byte-identical to what was typed
(a leg with a Devanagari name, a combining mark and a bidi control round-trips through encrypt → decrypt unchanged).

### AC3 — Storage
**Given** migration `0193`
**Then** `memorial_submissions.kinship_ciphertext` is a nullable `text`, Tier-1 in Drizzle (`piiColumn(1, MEMORIAL_FIELD_CLASS)`), with
its own column-level `GRANT UPDATE` and ⛔ no CHECK; an empty list is stored as `NULL`; `memorial_review_decisions.kinship_omissions`
has ⛔ no UPDATE grant; the migration is idempotent (KL5's conventions); the journal entry's `when` is later than `0192`'s
([[project_sibling_migration_when_order_shared_db]]); the migration is ⛔ never regenerated once applied
([[project_live_db_test_gotchas]]); the policy-regression spec's exact UPDATE-column assert includes the column, and its named-CHECK
exact list (`memorial-policy-regression.spec.ts:303-321`, "The thirteen named CHECKs") gains
`memorial_review_decisions_kinship_omissions_check` (fourteen).

### AC4 — The permission (KL7)
**Then** v4 exists beside v1–v3 (⛔ none edited), is current, is Q-copy-3 exactly (① both places, ③ the declaration, ⑤B, ④ as
re-approved), carries `carriesGuardianDeclaration: true` (v1–v3 `false`), and a v3 echo is refused `authorisation_outdated`; the pins in
`memorial-status.test.ts` move — :173-180 (v3 joins the refused ids), :262-263 (current = v4; keys `[V1, V2, V3, V4]`), :271-275 (the
current text = v4) — v4 gets its own *"v3 with exactly the marked changes"* describe, and the :318 `it.each` stays v1–v3 (v4 does ⛔ not
say *"it will leave it out"*); the `GROUND_EN` pin (:382) follows ④; the app shows v4's text above Send in both locales; v4 stays `hiReviewed: false` until a
person records the review (Row 41 (a)).

### AC5 — Review (KL6, KL12)
**Given** a submission with a list
**When** the reviewer leaves out one or more entries, each with one of the four reasons
**Then** the decision row stores `kinship_omissions` sorted and unique, the CHECKs admit it (`approved_with_omissions` with ONLY a
kinship omission is valid; `approved` with any kinship omission is refused by the DB); the shared validator agrees with the DB on
every action — a kinship-only `approved_with_omissions` passes, and `approved` / `not_approved` with `kinshipLeftOut` are refused
`action_shape` (⛔ never reaching the DB as a 500); an index ≥ the list's length, a duplicate, an unsorted array, or kinship omissions
on a submission with ⛔ no list are refused `400 memorial_review.invalid_omissions` with a named problem; the review detail returns
`kinship` and `decision.kinshipLeftOut`; the decide audit hash carries `kinship_left_out`; the reviewer can ⛔ never change a name
(⛔ no input field carries one — the `.strict()` input is the proof).

### AC6 — The family's screens (KL9)
**Then** preview shows the list exactly as KL10 will render it (one shared grouping helper — a test feeds both callers the same
input — with each name bidi-isolated); outcome lists each left-out entry with its reason; the family may change the list and send
again (11b.4 MA13 unchanged); a kinship decrypt failure on the member view sets `unavailable` and `canSend: false`.

### AC7 — The public page (KL10)
**Given** an approved submission with a list, some entries left out
**Then** the page shows `<KinshipLattice>` after the words: one `<dt>`/`<dd>` per relation in KL3's order, names joined by `, `, the
`<dl>` carrying `data-field="family_memorial_kinship"`, the left-out entries absent with ⛔ no marker — **the page is byte-identical to
the page for a submission that never listed them**, with the input INTERLEAVED (`son, wife, son-left-out` vs `wife, son`) so the
grouping is proven too (a built-server leg, the 11b.4a AC5 pattern) [⭐ 2026-11-01 review RP27: SUBSTITUTED — the interleaved identity is proven on the WIRE in `apps/api/tests/integration/memorial/kinship.spec.ts` (kinship rows compared with `toEqual`; live DB, ⛔ not yet run); ⛔ no page-level interleaved leg was built, and the HTML step is a pure function of the wire]; a list whose every entry was left out, or no list, renders ⛔ no
heading and ⛔ no `<dl>`; an unclosed RLO in a row's first name leaves the second name's order unchanged; a sentinel, bad envelope,
unparsable or schema-failing list drops the WHOLE memorial (the page stays); ⛔ nothing of the list appears in `<head>`; the wire
carries only grouped surviving rows (⛔ no index, ⛔ no reason, ⛔ no count of left-out entries); the guard rejects an unexpected key
and an unexpected row key; the matrix row, `RULED_TIER1_PUBLIC_EXCEPTIONS`, and every exact-list pin (Trap 6) carry the new pair
under the PQ1 ruling's id; in the floor test all FOUR memorial ids are **declared gaps owed by row 11b-5c** (`MEMBER_COUNTERPART: []`, `declaredGaps` 3 → 7, `DATA_CLASS_EXCLUDED` emptied, its test rewritten to cite `2026-10-31-428` — the memorial is owed to members, ⛔ no longer a data-class exclusion); the take-down still leaves the
page byte-identical to before any memorial.

### AC8 — The helpline view (KL11)
**Then** the take-down screen's `shown` block carries the same rows as the public page (one helper; a test compares them), and a
kinship sentinel makes the take-down read `takedownNotFound()` like a body / alt sentinel.

### AC9 — Erasure (KL13)
**Then** `anonymizeMember` sentinels `kinship_ciphertext` (NULL stays NULL); `rtbf-anonymize.test.ts:644`'s key list gains
`kinshipCiphertext`; the RLS spec's `SCRUBBABLE`, (c)/(c2) and a scrub leg over a row carrying a list pass on a live DB; the public
read treats a sentinel list as it treats a sentinel body (the whole memorial goes); ⚠ the story's records state that `-423` rules
this path closed for a deceased member and that it stays reachable in code until row 6-38's lock (built on its branch) lands on `main` — ⛔ never "erased with
the record" unqualified.

### AC10 — Purpose limitation, mechanically
**Then** a source-pin test (in `packages/domain/tests/memorial/`) scans `packages/*/src`, `apps/*/src`, `apps/*/app`, `apps/*/lib` and
`apps/*/components` (tests, `openapi/`, `_bmad-output` and migrations are ⛔ not scanned — the migration is named in the allow-list) and asserts
that `kinship_ciphertext` / `kinshipCiphertext` / `MEMORIAL_KINSHIP_RELATIONS` / `kinshipLeftOut` / `kinship_omissions` — **and
`memorialSubmissions` / `memorial_submissions`** (a `db.select().from(memorialSubmissions)` returns the column without naming it) —
are referenced ONLY in an explicit allow-list: domain `src/memorial/**`, `src/schema/memorial_*.ts`, `src/schema/index.ts`,
`src/member/anonymize.ts`, `src/encryption/field-classes.ts`, `src/policies/memorial-rls.ts` (the 14 non-test domain users of the
table identifier at the pin); contracts `src/memorial/**` + `src/public-pages/sahyog-vivran.ts`; api
`src/modules/{memorial,memorial-review,memorial-takedown}/**` + `src/modules/public-pages/memorial-public-*.ts`; mobile
`app/(memorial)/**`, `components/memorial-authorship/**`, `lib/{memorial-draft,use-memorial-send,memorial-i18n}.ts`; admin
`src/modules/{memorial-review,memorial-takedown}/**`; public `src/components/{FamilyMemorial,KinshipLattice}.astro`,
`src/lib/{family-memorial,sahyog-vivran-render,sahyog-vivran.server,surface-fields}.ts`. ⭐ Build the list from the pasted grep at Task
8 (⛔ never a recalled list) — `git grep -l -E "memorialSubmissions|memorial_submissions" -- packages apps` minus tests and
migrations; every existing user must be covered or the pin fails on `main`. A non-empty file list and a planted reference outside it proven RED. ⛔ No claims, nominee, peer-mesh, directory, validity or
jobs file may read it.

### AC11 — Gates
**Then** green: `i18n-parity` (new keys in both locales; the `memorial` namespace is registered — `catalog.ts:82-87`); every new
interpolated key has a real-`t()` leg in both locales ([[feedback_stub_must_call_not_transcribe]]:
`apps/public/tests/sahyog-vivran-copy.test.ts`, the mobile memorial render test); `microcopy` (`family.tsx` added to `microcopy.yaml`
**`code_globs`** beside `(memorial)/outcome.tsx` (:370) — the memorial `.tsx` files stay OUT of `copy_globs` by the file's own header
(:360-364); `memorial.json` is already in `copy_globs`; `scripts/microcopy/memorial.test.ts` extended); `sahyog-vivran-financial-truth`
(`KinshipLattice.astro` added to `SCAN_FILES` `renderPath: true` by hand — `CANDIDATE_DIRS` does ⛔ not walk `src/components`);
`friction-budget` (a new 11b.5a disposition block — AC-4 fires on any `apps/mobile/` or `apps/public/` diff; the baseline ⛔ never
raised); `contracts:check-openapi-determinism` (`openapi/v1.yaml` re-emitted with `pnpm contracts:emit-openapi` and committed); `db-check`;
`pii-scrape`; `contracts:check-pii-scrape`; `verify-matrix-inline.mjs` (a gate over a built `dist/`, ⛔ not a pin).

### AC12 — Nothing goes live
**Then** `MEMORIAL_AUTHORSHIP_ENABLED` stays off; Row 41 carries KL13's dated annotation ((r), (s), (t)), including: v4 is ⛔ never live
with the switch on unless rows 11b-5b and 11b-5c are `done` and R1–R3 are answered — if either row is dropped or narrowed, a v5 without
the matching clause (① *"and to members in the app"* / ⑤B's exception / ③ *"every adult you have named"* if R2 = B) is minted before go-live; ⛔ no criterion of Row 41 is
marked MET by this story; the un-attested items (Story 0.9; device, TalkBack, VoiceOver and real-browser passes of `family.tsx` and
the lattice; the Hindi review of KL3 and v4) are recorded as carried, ⛔ not closed.

### AC14 — The declaration (KL16, `-426`)
**Then** v4 carries the declaration (Q-copy-3 ③) and is shown above Send in both locales; a v4 submission's review detail carries
`guardianDeclaration: true` and shows the banner, the added guidance and the v4 child label on every reason select (decision and
withdraw-approval); the family's outcome shows copy 4.3 for that reason; a historical v1–v3 row shows ⛔ no banner and ⛔ no declaration
guidance; a leg with a SYNTHETIC later version carrying the flag shows the banner (the flag, ⛔ not the version string, drives it); ⛔ no new
column records the declaration. ⚠ AC14 proves the guidance is SHOWN, ⛔ not that reviewers follow it — un-mechanised by design (`-426`'s
accepted cost).

### AC15 — "Who is in the photo" (KL15, `-426` AQ3 (b)1)
**Then** with a photo in the Send, each list row offers an optional tick; a tick with ⛔ no photo is refused `memorial.kinship_invalid`;
the review screen lists the ticked people beside the photo, and leaving out a ticked entry on the child reason while keeping the photo
shows a confirm (⛔ not a refusal); the SAME schema parses the list on every read (a ticked list renders on the public page); the public wire, the page and the helpline's `shown` block carry ⛔ no tick
(a leg asserts ⛔ no `inPhoto` crosses the public wire).

### AC13 — Done means a clean gate on the committed tree
**Then** the row moves `review` → `done` only after `pnpm ci:local` 36 / 36 on the COMMITTED tip, on a fresh database NAMED `twt_dev`
in its own container ([[project_known_livedb_test_failures]]), with `DATABASE_URL` set on the push; a red run is re-run and recorded,
⛔ never skipped.

## Tasks / Subtasks

- [x] **Task 0 — Preflight and the Panel (AC0, AC1)** ⛔ no code in this task
  - [x] 0.1 `git fetch origin`; rebase onto `origin/main` if it moved; re-diff from `01062c51`; run STOP 1–7; re-take every number in
    the header across all branches and worktrees (the ledger letter included — `-30r` is 6.38's); `grep -n 'KL[0-9]' .decision-log.md`
    (⛔ no prior KL). ✅ **Run 2026-10-31:** `origin/main` still `01062c51` (⛔ no rebase); STOP 1 ⛔ no change under any listed path;
    STOP 2 — 6.38 has committed records + its own routing note (2026-10-31), ⛔ no code, ⛔ no `anonymize.ts` change ⇒ ⛔ not a stop;
    STOP 3 11b-6 `backlog` on every ref; STOP 4 three comments only; STOP 5 v3 current, ⛔ none `hiReviewed`; STOP 6 ⛔ not pinned; STOP 7
    ⛔ no kinship ruling. Numbers: decision `-424` at the run (⚠ since taken by 6.38's ruling — next is `-425`), migration `0193`, ledger next `2026-10-31e` at the run — ⚠ 6.38 then took `-31e` (`c9fed42a`), so this story's Task 0.3 records are `-31f`. ⏳ The
    `deferred-work.md` trigger lines below are ⛔ not yet written. Record in `deferred-work.md`: 11b.4 item (2) and 11b.4a item (6) — *"Trigger reached 2026-10-30 at 11b-5a's
    create-story — carried to the Panel ruling (Task 0.4); ⛔ not closed."*
  - [x] 0.2 ✅ **Done 2026-10-31** — KL1–KL16, Q-copy-1…6 and Questions 7–8 all answered (records under each). BigDev answers **KL1–KL14**, **Q-copy-1…6** and Questions 7–8 (below). Record the answers verbatim under each KL and in the
    Questions list; story version bump. ⏳ **Part done 2026-10-31 (v1.2):** KL1–KL14 answered (verbatim under the KL heading), Q-copy-1's
    structure and Q-copy-6 answered. Q-copy-1 wording answered later the same day. Open: Q-copy-2…5, Questions 7–8. ⚠ Task 0.1 (fetch, re-diff, STOP 1–7, numbers)
    has ⛔ not been run yet — run it before 0.3.
  - [x] 0.3 Write the routing note from the template (PQ1, PQ2, PC1, PC2 as planned above, re-costed against the KL answers; the
    meeting part carries ⛔ no clause ids — they go to E1/E2 with the verbatim texts); run E4; commit it **alone**
    (`governance(11b.5a): routing note — kinship …`). ⛔ Never send. Record "prepared for relay — ⛔ not yet sent". ⏳ **WRITTEN
    2026-10-31** — `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-31-11b5a-kinship.md` (PQ1, PQ2, PC1, PC2; E4 run);
    committed ALONE as `6f22bd4d` (`9efa0c06` before the rebase); ledger `2026-10-31ab` (relabelled from `-31n`, earlier from `-31f`). ✅ **SENT 2026-10-31** — BigDev: *"routing note sent"*. Task 0.4 waits on
    the ruling.
  - [x] 0.4 ✅ **Done 2026-10-31:** the addendum ruled (`-426`, committed alone `16dc6911`), the main note v2 ruled (`-428`, committed
    alone `1bdd8cd0`); outcome **PQ1 A + rider, PQ2 B, PC1 A, AQ1–AQ3 A, (b)1** ⇒ the RULED block at the top; rows 11b-5b / 11b-5c
    minted at Task 1.2; story v2.0 + a validate pass before Task 1. (The original outcome branches are in the appendix.)
- [x] **Task 1 — Governance commits (AC0)** — ✅ 2026-10-31: `-431` committed alone (`1c68adc4`); records (Task 1.2) in the next commit
  - [x] 1.1 ✅ `-431` committed alone (`1c68adc4`). Re-take the id (`-431` at validation); commit our author-commit `-NNN` **alone** (KL1–KL16 as answered — all answered
    2026-10-31; §0: the questions were the Panel's and are ruled by `-426` / `-428`; records BigDev's reading of the rider (since RATIFIED — `-432` R1 A),
    the 11b-5b / 11b-5c split, and KL16's design; mints: the relation tuple, v4 with `carriesGuardianDeclaration`, the matrix pair under
    `2026-10-31-428 item 1`). **Commit slicing after it:** records → contracts + migration → API → admin (incl. KL16) → mobile → public →
    fences.
  - [x] 1.2 ✅ Records commit (2026-10-31): rows 11b-5b / 11b-5c minted; Row 41 (r)(s)(t); the architecture dated note; epics notes under 11b.4 / 11b.5 / 11b.6; deferred-work annotated (kinship items RULED + HOMED, counsel item extended, the 6.27a family-link item); the sprint row → `in-progress`; ledger `2026-10-31z`. Records commit: (i) ✅ pointers under `-391` / `-398` WRITTEN (`2330a941`); ⏳ the pointer under `-420` (MV2 **carried out**
    by `-428` — ⛔ not "discharged") — written at validation (v2.3), confirm present; (ii) `epics.md` dated notes under `### Story 11b.4` (step (d)),
    `### Story 11b.5` (lattice built here / dropped) and `### Story 11b.6` (**the STOP's literal condition met** by this row's creation,
    committed on <date>, **its purpose carried out by the ruling `-NNN`**; and the lattice ⛔ not part of an In Memoriam entry — the
    matrix scope, Trap 11); (iii) `deferred-work.md`: the 11b.4 counsel item gains `-426`'s DPDPA §9 declaration question and `-428`'s named person's legal
    right to removal (Trigger: counsel's next memorial review; if counsel finds the declaration is ⛔ not verifiable consent, AQ1–AQ3
    return to the Panel before go-live); 11b.4 item (2), 11b.4a item (6), the 11b.3 components item, the 0.9 PortraitFrame
    + KinshipLattice item, and the 11b.5 section intro (*"`<KinshipLattice>` → row 11b-5a"*) — each annotated *"RULED by `-NNN`; HOMED
    here; closes when 11b-5a is `done` on main"* (⛔ not deleted; DISCHARGED is written at Task 9, or at once under PQ1 D); the 6.27a
    family-link item annotated *"⛔ not this list — AC10"*, ⛔ not discharged; (iv) Row 41 dated annotation (KL13 — (r), (s), (t)); (iv-b) mint rows `11b-5b-kinship-named-relative-removal` (comment block = KL14's, verbatim) and `11b-5c-member-app-shows-the-memorial`
    (`backlog`), its comment block verbatim: *"`-428` rider (verbatim) + BigDev's reading (the drive screen shows words, photo + description,
    and list). ⛔ NOT BUILT until confirm R1 is answered (the follow-up note) [⭐ ANSWERED 2026-10-31 — `-432` R1 A: build it]; v1–v3 submissions are ⛔ never shown in the app. Removes the
    four floor-test GAPS 11b-5a declares (`MEMBER_COUNTERPART: []` for the memorial ids). Adds a member surface to the matrix rows' scope
    (they read 'sahyog-vivran ONLY' today) and to AC10's allow-list. Shows the same finished, grouped rows as the public page, ⛔ never
    `inPhoto`. ⚠ v4 ① / copy 2.3 already promise this — if descoped or narrowed, mint a v5 before go-live."*; (iv-c) ✅ pointers under
    `-411` / `-412` WRITTEN (`2330a941`); dated notes under `-426` and `-428` (v2.3 — Consequence 1's member-app render moved to 11b-5c;
    PQ2 B's grounds; quote corrections), the correction under `-391` and the pointer under `-420` — ✅ WRITTEN at validation (v2.3);
    ⏳ a dated note in `architecture.md` :1839-1846 recording `-426` (the amendment is owed before
    go-live — `-426` Consequence 3); (v) the sprint row
    `ready-for-dev` → `in-progress` and the ledger (both lists).
- [x] **Task 2 — Vocabulary and contracts (AC2, AC5, AC7)**
  - [x] 2.1 Domain `vocab.ts`: `MEMORIAL_KINSHIP_RELATIONS` (KL3 order; doc-block: relation TO THE MEMBER WHO DIED), `MemorialKinshipEntry`
    (`{ relation; name; inPhoto?: true }` — KL15), `MemorialKinshipOmission`. Limits `MEMORIAL_KINSHIP_MAX_ENTRIES = 20`, `MEMORIAL_KINSHIP_NAME_MAX_CODE_POINTS = 200` (KL4, BigDev
    2026-10-31) in **`packages/contracts/src/memorial/text-classes.ts`** (there is ⛔ no domain `text-classes.ts`; the handler imports
    its limits from `@twt/contracts`).
  - [x] 2.2 Contracts copies + `memorial.test.ts` lockstep legs; `MemorialKinshipListSchema` (`.strict()` entries with
    `inPhoto: z.literal(true).optional()` — `false` refused; `[]` refused) — the ONE schema for Send AND every read (KL15);
    `MEMORIAL_SEND_FIELDS` + `'kinship'`; `MemorialReviewDecisionInput.kinshipLeftOut`; `validateMemorialDecision` — kinship problems
    (names grepped first), `MemorialDecisionCandidate.kinshipLeftOut`, `MemorialDecisionSubject.kinshipLength`, and **all three
    `action_shape` checks (:110, :115, :129) widened** (KL6); `MemorialMemberView` (`kinship`, `kinshipLeftOut`),
    `MemorialReviewVersion.kinship` + `guardianDeclaration: z.boolean()` (KL16), `MemorialMemberView.guardianDeclaration: z.boolean()` (the LATEST submission's version — for copy 4.3), `MemorialReviewDecisionOutput.kinshipLeftOut`; `PublicSahyogVivranFamilyMemorial.kinship` + the
    dated doc-block line; `takedown.ts` `shown.kinship`. Export the new `kinship.ts` from `packages/contracts/src/memorial/index.ts`.
    Update every strict fixture that gains a required key — `packages/contracts/tests/public-pages-sahyog-vivran.test.ts`,
    `apps/public/tests/sahyog-vivran-client.test.ts`, `apps/public/tests/integration/public-pages/scrape-test.spec.ts`,
    `apps/api/tests/integration/public-pages/sahyog-vivran-memorial-photo.spec.ts`, `apps/mobile/tests/unit/memorial-screens-render.test.ts`,
    `apps/admin/tests/{memorial-review,memorial-takedown,memorial-takedown-route}.test.tsx`,
    `apps/api/tests/integration/{memorial-takedown/takedown,memorial/review-memorial}.spec.ts` (re-grep `familyMemorial: {` and
    `photoLeftOut` at the time). Re-emit `openapi/v1.yaml` (`pnpm contracts:emit-openapi`). ⚠ Contracts tests sit outside tsc — run
    them ([[project_contracts_tests_outside_tsc]]).
  - [x] 2.3 ONE pure grouping helper (entries + left-out indexes → ordered `{relation, names[]}` rows) — in
    `packages/contracts/src/memorial/kinship.ts` so the API, the mobile preview and the admin all import it (⛔ not `@twt/ui` for
    `apps/public` — 11b.5 MV3; the page receives grouped rows). The helper DROPS `inPhoto` (⛔ never in its output). The helper stays free of `@twt/ui`; each caller that renders applies
    `isolateMemorialBidi` per name (the API before the wire; the mobile preview).
- [x] **Task 3 — Migration `0193` — RE-TAKE first (`0194` if 12-1 has committed `0193`) (AC3, AC5)**
  - [x] 3.1 Hand-author `0193_memorial-kinship.sql` + `_journal.json` (idx 193, `when` > 0192's — KL5's convention): idempotent (KL5);
    the column, its GRANT UPDATE, the `kinship_omissions` column, `memorial_kinship_omissions_valid(jsonb)` mirroring 0182:47-67's
    NULL-safe / ORDER-safe `CASE WHEN` chain (type before value; `^[0-9]+$` on `->>`; numeric cap 2147483647), its CHECK (in a
    `duplicate_object` guard), the DROP IF EXISTS + ADD of `omissions_iff_action`. Drizzle schema edits. `db-check` green.
  - [x] 3.2 `memorial-policy-regression.spec.ts`: `SCRUBBABLE`, (c)/(c2), the named-CHECK list thirteen → fourteen (:303-321), CHECK
    legs (kinship-only omission valid under `approved_with_omissions`; refused under `approved`; malformed element refused), a scrub
    leg over a row with a list. (`(u)` :732-745 walks every column — no edit.)
- [x] **Task 4 — API (AC2, AC4, AC5, AC7, AC8, AC9)**
  - [x] 4.1 Send: accept/parse `kinship`; validate before the lock (`[]` refused; any `inPhoto` when `withPhoto` (`handlers.ts:504`) is
    false ⇒ `memorial.kinship_invalid`); encrypt with the body (before the lock); insert. Refusal mapping. Audit: `has_kinship` only.
  - [x] 4.2 v4 in `authorisation-copy.ts` — minted with ③ as approved (if R2 = B arrives after minting, that is a v5) (Q-copy-3 as approved, ④ as re-approved: both places, the declaration ③, take-down ⑤B); the
    entry type gains `carriesGuardianDeclaration` (v1–v3 `false`, v4 `true`); current → v4; the `memorial-status.test.ts` pins of AC4.
  - [x] 4.3 Member view + review detail: decrypt after the tx (`dec()` on the review side); return the list and its left-out indexes;
    a kinship decrypt failure on the member view ⇒ `unavailable`, `canSend: false`; the review detail computes `guardianDeclaration` from
    the registry flag (an unknown id ⇒ `false`) — and the member view computes the same for its latest submission; every read parses with the Task 2.2 schema.
  - [x] 4.4 Decide: validate kinship omissions against the decrypted length; audit hash + `kinship_left_out`; insert.
  - [x] 4.5 Public: `readPublicMemorial` returns `kinshipCiphertext` + `kinshipOmissions`; `resolvePublicFamilyMemorial` decrypts;
    sentinel / bad envelope / unparsable / schema failure ⇒ the **whole** memorial `null` (KL10's one rule; a KMS outage rethrows as
    today); parses with the Task 2.2 schema (a ticked list is valid — a leg); groups via the Task 2.3 helper (⛔ no `inPhoto` on the wire);
    `isolateMemorialBidi` per name; the doc-block (:4-10) gains the list.
  - [x] 4.6 Take-down `shown.kinship` from the same helper (`memorial-takedown/handlers.ts:187-218`); a kinship sentinel joins the
    `takedownNotFound()` OR at :194.
  - [x] 4.7 ⚠ FIRST rebase onto 6.38 (STOP 2 fired — `e813e5ee` changes `anonymize.ts` / `resolveRtbfLegality`); then the
    `anonymizeMember` scrub line; `rtbf-anonymize.test.ts:644` key list; live legs; AC9's legality sentence from 6.38's code.
- [x] **Task 5 — Mobile (AC2, AC6)**
  - [x] 5.1 `family.tsx` (empty start, *"How is each person related to {the member}?"*, *"One person per row"*, picker, add/remove,
    Skip/Continue, copy 2.4A under the body, the *"In the photo"* tick only when the Send will carry a photo (KL15), *"Start from the list I
    sent"* on a re-send (ticks copied only with the previous photo kept; choosing "without photo" or a NEW photo clears every tick);
    accessible labels on every control — `memorial-a11y-scan` walks the
    directory); `photo.tsx` — BOTH pushes (:176, :234) → `family`; `preview.tsx` link + list render (bidi-isolated per name) + *"No
    family list"* line.
  - [x] 5.2 Draft `kinship` field; `sendContent` + `JSON.stringify(d.kinship ?? [])` [⭐ 2026-11-01 review RP1: canonical `[relation, name, inPhoto]` tuples of the rows the Send carries]; `memorialDraftHasContent` +
    `(d.kinship?.length ?? 0) > 0`; `use-memorial-send.ts` FormData part (only when non-empty; strips every `inPhoto` when the photo test at :286-287 is false — a unit leg).
  - [x] 5.3 `outcome.tsx` left-out lines; when `view.guardianDeclaration` is true, copy 4.3 replaces `reason.identifies_a_child` (a render leg); `memorial-copy.ts` refusal mapping; `memorial.json` en + hi keys incl. `kinship.<code>` +
    `kinship.heading` (Q-copy answers) — the ONE home of the labels.
  - [x] 5.4 Tests: `memorial-screens-render.test.ts` (family step, re-send start, preview, outcome), `memorial-draft.test.ts` (R6 leg —
    an edit to the list alone mints a new key; ticks stripped with no photo), `memorial-source-pins.test.ts` — **`family` joins the screen lists at :56 (no
    `useStepUpGate`), :64 (R20 `SCREENS`), :73-75 (draft loaded in an effect) and :107-112 (T6, re-read on focus)**; route present;
    `gcTime: 0` unchanged. ⚠ Mock `lib/mmkv`, add RTL `cleanup` ([[project_mobile_vitest_and_expo_install_traps]]).
- [x] **Task 6 — Admin (AC5, AC8, AC14, AC15)** — when `guardianDeclaration` is true: the banner in `VersionCard` (:458-460), the ADDED
  guidance and the v4 child label on every reason select incl. `WithdrawApprovalForm` (:769) (KL16; ⛔ not for v1–v3 rows); the ticked
  people beside the photo, and the confirm when a ticked entry is left out on the child reason with the photo kept (KL15); KL12 controls, pre-check (:668), payload builder (:673-679), history; `PROBLEM_SENTENCES`
  entries; the English labels pinned equal to `memorial.json` en; `memorial-review.test.tsx` legs (the decision posts indexes and
  reasons, ⛔ never a name; ⛔ no textbox holds a name); take-down screen (`MemorialTakedownPage.tsx`) shows the list
  (`memorial-takedown.test.tsx`).
- [x] **Task 7 — Public (AC7)**
  - [x] 7.1 `KinshipLattice.astro` (with `data-field`, styles inside it); `planFamilyMemorial` gains the `kinship` verdict;
    `FamilyMemorial.astro` places it (a fourth `visibilityOf` call); `surface-fields.ts` view + ids map + shape;
    `sahyog-vivran-render.ts` mapping; the guard (exact keys, exact row keys); labels read from `memorial.kinship.<code>` (⛔ no copy in
    `sahyog-vivran.json`).
  - [x] 7.2 Matrix YAML row + `RULED_TIER1_PUBLIC_EXCEPTIONS` + every Trap 6 pin; the floor test (`member-drive-detail-field-floor.test.ts`): ALL FOUR memorial ids move to `MEMBER_COUNTERPART: []` as declared GAPS
    owed by row 11b-5c (`2026-10-31-428` — the memorial is owed to members); `declaredGaps` (:258-262) grows 3 → 7 with a comment citing
    `-428` and 11b-5c; `DATA_CLASS_EXCLUDED` (:87-91) is emptied (or removed) with a dated doc-block line (*"2026-10-31: `-428` supersedes
    `-412` §3 item 3 — ⛔ no longer a data-class exclusion; a GAP owed by 11b-5c"*); the :275 test is rewritten to assert the four are gaps
    and ⛔ none is excluded (:284 / :288 move with it).
  - [x] 7.3 [⭐ 2026-11-01 review RP14: the page-level interleaved byte-identity leg was ⛔ not built — it is proven on the WIRE in `apps/api/tests/integration/memorial/kinship.spec.ts`; see Review Findings] Tests: `family-memorial-render.spec.ts` (AC7 byte-identity with interleaved input, empty, `<head>`, RLO-in-a-name, whole
    memorial dropped on a bad list), a new `kinship-lattice-source.test.ts` (the 11b.5 `portrait-frame-source.test.ts` pattern: props,
    markup order, `data-field`, ⛔ no class / `<style>` / `set:html`, positive controls), `family-memorial-source.test.ts` (`TOUCHED`
    :17-28 + `KinshipLattice.astro`, `STYLED` :108, the id list :75 and `feeds` map :84, the exact-three-styles pin :162-166 unchanged),
    `family-memorial-gating.test.ts` (the kinship verdict), `sahyog-vivran-copy.test.ts` (real `t()`).
- [x] **Task 8 — Fences (AC10, AC11)** — the purpose-limitation pin (built from the pasted grep); `SCAN_FILES`; `microcopy.yaml`
  **`code_globs`**; the friction-budget disposition; `contracts:check-openapi-determinism`.
- [ ] **Task 9 — Verify and record (AC12, AC13)** — ✅ the 17 named mutants RED + restored; ✅ records (Dev Agent Record, File List, Change Log, ledger `2026-10-31al`). ⏳ **OPEN: `pnpm ci:local` 36 / 36 on one run** — four runs on tip `50b7a2b6` (lint fix included), each 35 / 36, every red a load timeout or the fixed-`PARIWAR_A` pollution, each red spec green in isolation (Debug Log); AC13 makes it the `review` → `done` gate. ⏳ The Task 1.2 (iii) DISCHARGED annotations — owed when `done` is on main. — plant named mutants and prove each RED, then restore byte-identical: drop `kinship`
  from `sendContent`; render a left-out entry; accept an index out of range; an unknown relation code; a wire key leak; the guard accepting an
  unknown row key; per-name bidi isolation removed; an `action_shape` check ignoring kinship; `family` missing from the T6 list;
  `data-field` missing; a memorial id dropped from the declared gaps; a reference outside AC10's allow-list; `inPhoto` reaching the
  public wire; copy 4.3 not shown when `guardianDeclaration` is true; the banner keyed on the version string (`=== V4`); ticks kept after the photo is removed; a strict read schema without
  `inPhoto` (a ticked memorial vanishes). `pnpm ci:local` 36 / 36 (AC13); records
  (story Dev Agent Record, File List, Change Log, ledger); the Task 1.2 (iii) items annotated DISCHARGED once `done` is on main.

### Review Findings

**2026-11-01 — `bmad-code-review 11b.5a`, full review of `origin/main...HEAD` (merge-base `beae5116`, tip `7de62adf`; 88 files, +5,814 / −273; 6,911 lines of code, 2,504 of records).**
Run in three chunks, all layers in parallel: (1) contracts, openapi, domain, i18n, microcopy, scripts — 3,454 diff lines; (2) api, admin — 1,506; (3) mobile, public — 1,951. Blind Hunter / Edge Case Hunter / Acceptance Auditor on each chunk: **9 of 9 layers completed, 0 failed.** Raw findings **96** (Blind 66, Edge 13, Auditor 17) → **51 distinct** after merging duplicates → **0 decision-needed, 20 patch, 11 defer, 20 dismissed**.
The Blind Hunters read their chunk from a diff file in the scratchpad (not inline) and were told to open nothing else. The Auditors read the spec (lines 1–971; the Dev Agent Record as claims only) and the load-bearing checklist. Every contested finding below was re-checked against the code at `7de62adf` by the reviewer before it was classified; the ones that did not survive are in the dismissed list.
**Not run:** no test, build, migration or `ci:local` was run by this review (read-only). Task 9 is still OPEN in this story (four `ci:local` runs at 35 / 36, a clean 36 / 36 owed), so AC13 is unmet independent of anything here.
**Panel-routing gate (template §0):** no finding passes it. The three governance-shaped items raised (v4 promises member-app display and a name-removal route before rows 11b-5c / 11b-5b exist; the Hindi wording of v4; the Tier-1 public field with no ledger escalation) are already ruled or fenced — `-428` item 1, `-432`, AC12, Row 41 (a) and (r). No note was written.
**Branch state:** `origin/main` is now `3d6b46c5` (Story 12.1 landed, PR #318, with migration `0193`). This branch is not a fast-forward of `main`; it needs a rebase (see RP10).

**Load-bearing checklist (touched families):** 2 idempotency — REAL GAP (RP1); 3 tenant / actor — covered-by-test (no new route; existing actor-denial and cross-Pariwar specs); 5 DB backstops — covered-by-test for shape and `omissions_iff_action`, sorted / unique deliberately validator-only (0182 precedent), reasons lockstep untested (RP18); 6 projection — covered-by-test (field picks, `inPhoto` never on the wire); 8 audit / attribution — covered-by-construction, the `kinship_left_out` hash content untested (RP7); 9 deliberate-vs-oversight — covered-by-construction (the R16 remove-key exception is named, scoped, BigDev-confirmed); 10 closure honesty — REAL GAP (RP12, RP14, RP15, RP16); 11 policy meaning — covered-by-test for the data identifiers, residual at the wire / helper layer (RP11); 12 cross-member ownership — covered-by-test (every index validated against the list decrypted from the scoped row); 13 semantic accessibility — REAL GAP (RP2, RP4).

#### Decision-needed

None.

#### Patch

- [x] [Review][Patch] **RP1 — The Send's Idempotency-Key is derived from the raw draft, so identical content can mint a new key** — `sendContent` stringifies `d.kinship` as stored. UI-built rows are `{name, relation}` (`family.tsx:166,178`), but `memorialKinshipClearTicks` and the un-tick path rebuild them as `{relation, name}` (`memorial-kinship.ts:75`, `family.tsx:195`), and rows the Send strips (blank rows, ticks with no photo) still count. A Send lands, its answer is lost, the family opens Photo and taps "Continue without a photo" (no ticks): the rows are rebuilt, the signature changes, the kept key is dropped, the retry mints a new key and a second version is created. The R6 test uses same-order literals. Fix: build the list part from `memorialKinshipForSend(d.kinship, withPhoto)` as `[relation, name, inPhoto]` tuples; add a leg with reordered keys, a blank row and an invisible tick. [apps/mobile/lib/memorial-draft.ts:84] (blind ×3, edge; checklist 2)
- [x] [Review][Patch] **RP2 — The family screen draws two reachable states that are never announced (checklist 13(d) REAL GAP)** — the over-limit name line (copy 2.10) is a plain `Paragraph` and part of an `accessibilityHint` read only on focus; the limit-reached line (copy 2.16) replaces the "Add someone" button silently. `write.tsx:69` and `photo.tsx:92` announce the same kind of crossing through `useMemorialOverLimitAnnounce`; `family.tsx` has no such call and no test leg (the "copy 2.11 (spoken)" test asserts text, not speech). Existing approved copy; no new strings. [apps/mobile/app/(memorial)/family.tsx:142,185,220] (auditor, blind)
- [x] [Review][Patch] **RP3 — The review screen ignores `unavailable` when only the family list fails** — the API sets `unavailable` on a list decrypt / parse failure (`handlers.ts:212,221`) but the admin keys only on `v.body === null`: the list is silently omitted and the full decision form is offered; `decide` then throws a bare `Error` and returns 500 (`handlers.ts:298`). That mirrors an undecryptable body by design, but the reviewer is never told the cause. The member view also logs a list parse failure as "words decrypt failed" (`memorial/handlers.ts:409`) and the review detail logs nothing for `kinshipFailed`. Fix: when `v.unavailable !== null` show a `role="status"` notice and hide the form; log list failures distinctly; optionally a typed 409 from `decide`. [apps/admin/src/modules/memorial-review/MemorialReviewPage.tsx:447,700; apps/api/src/modules/memorial-review/handlers.ts:212,298] (blind ×3, edge ×2, auditor)
- [x] [Review][Patch] **RP4 — The child guidance on the reason select is never announced (checklist 13(d), AC14)** — `aria-label={label}` on the `<select>` overrides the wrapping label, and the guidance span inside it is neither the name nor a description; a keyboard or screen-reader reviewer hears "Reason, combo box" and not the R3 A guidance, which is the only mitigation for the un-mechanized child rule. Fix: `aria-describedby` to an id on the guidance; assert `toHaveAccessibleDescription`. [apps/admin/src/modules/memorial-review/MemorialReviewPage.tsx:595-607] (blind, auditor)
- [x] [Review][Patch] **RP5 — The helpline drive view and the public page disagree when the list is unreadable** — the public read drops the whole memorial (KL10); the take-down keeps the words, sets `shown.kinship = null` and headlines "On the Sahyog Vivran page now". Only the sentinel is mirrored (`:198-204`) and tested. Fix: mirror the public rule for a present list that fails to decrypt or parse (words not shown, say so); tests for a bad envelope, bad JSON and a schema failure. [apps/api/src/modules/memorial-takedown/handlers.ts:196,231-237] (blind, auditor)
- [x] [Review][Patch] **RP6 — AC11 unmet: two new interpolated keys have a real-`t()` leg in one locale only** — `family.limit_reached` in `hi` only, `family.in_photo_a11y` in `en` only. [apps/mobile/tests/unit/memorial-screens-render.test.ts:3718,3746] (auditor)
- [x] [Review][Patch] **RP7 — Specified behaviour with no test** — AC2: a re-send after `approved_with_omissions` can keep the list (the family-screen leg uses `approved`); AC6: a list decrypt / parse failure on the member view sets `unavailable` and `canSend:false` (the existing spec corrupts the body only); the review detail's `unavailable` for a list failure; the decide audit hash carries `kinship_left_out` (only "no name in the audit" is asserted); copy 4.3 under `MemorialText showReasons` and the photo / alt / earlier-withdrawn lines (only the kinship line is asserted); tick-clearing on the new-pick and keep-previous branches. [apps/mobile/tests/unit/memorial-screens-render.test.ts; apps/api/tests/integration/memorial/*.spec.ts; apps/api/src/modules/memorial-review/handlers.ts:327] (auditor ×2, edge)
- [x] [Review][Patch] **RP8 — The public-wire leak assertion cannot catch the leak it names** — it forbids `'leftOut'` (lower-case l); the field would be `kinshipLeftOut` or `kinshipOmissions`; `reason` and a count are never checked despite the comment "no reason, no count". Case-insensitive match and add the tokens. [apps/api/tests/integration/memorial/kinship.spec.ts:209] (blind)
- [x] [Review][Patch] **RP9 — The Photo screen clears every tick when the photo did not change** — `releasePicked(true)` re-pressing "Use the photo I sent before" wipes ticks that still point at the right photo; only the "without" path is tested. Clear only on an actual change of choice. [apps/mobile/app/(memorial)/photo.tsx:166,173-178] (edge, blind, auditor)
- [x] [Review][Patch] **RP10 — Migration 0194's header is wrong, and the branch must be rebased onto `3d6b46c5`** — (a) "this `when` is later, so whichever lands second on a shared DB still applies both" holds in one order only: Drizzle skips every migration whose `when` is not above the newest applied one, so a DB that applied 0194 first skips 0193 for good. 12-1 has landed first (0193 `when` 1796269200038 < 0194's 1796355600039), so the order that works is the one `main` now has; any dev DB that ran this branch's 0194 before the rebase must be recreated. (b) The header says sorted / unique are the validator's because "the DB cannot see the list"; only the range rule needs the list — sorted / unique are validator-only by the 0182 `memorial_omissions_valid` precedent (harmless downstream: `Set`). Comment-only edit; `when` untouched. Rebase: the `_journal.json` tail will conflict (keep idx 193 then 194, in `when` order), as will the ledger lists. [packages/domain/migrations/0194_memorial-kinship.sql:7-8,17; packages/domain/migrations/meta/_journal.json] (blind, edge, auditor)
- [x] [Review][Patch] **RP11 — The AC10 purpose pin guards the column names, not the helpers or the domain property** — `GUARDED` omits `kinshipOmissions` (the domain property of `kinship_omissions`), `parseMemorialKinship`, `MemorialKinshipListSchema`, `groupMemorialKinship`; `SOURCE` omits `.mts/.cts/.cjs/.jsx`; scan roots skip repo `scripts/`, `infra/` and mobile `hooks/` / `store/`; the negative-control leg checks hard-coded paths that may not exist. AC10's literal list is met; this is gate scope (the pin must meaningfully cover). Today every source file naming the wider identifiers is already on the allow-list except `apps/api/src/modules/public-pages/handlers.ts`. [packages/domain/tests/memorial/kinship-purpose-pin.test.ts:22,66,129-140] (blind ×2, edge ×2, auditor)
- [x] [Review][Patch] **RP12 — `MEMORIAL_KINSHIP_LABEL_KEYS` claims a parity walk that does not exist, and omits `kinship.heading`** — the only use is a length test (24 keys, 10 plurals); deleting `kinship.daughter_in_law_plural` from both locales passes every test. Add the walk against the en and hi catalogs and include the heading. [packages/contracts/src/memorial/kinship.ts:137-141; packages/contracts/tests/memorial-kinship.test.ts:244] (blind, edge, auditor; checklist 10)
- [x] [Review][Patch] **RP13 — `memorial.kinship_invalid` is missing from `MEMORIAL_MEMBER_ERROR_CODES`**, which declares itself the one source for the API's error bodies, the typed refusals and the app's copy keys. Thrown in the Send's kinship branch, mapped in `memorial-copy.ts:34`. [packages/domain/src/memorial/errors.ts:8-31] (auditor)
- [x] [Review][Patch] **RP14 — The render spec's AC7 claim is stronger than its assertions (checklist 10)** — AC7 / Task 7.3 name a built-server byte-identity leg with INTERLEAVED input; the spec has none. The test titled "…byte-identical…" asserts three `not.toContain`s; `heading > indexOf(...)` passes if the anchor is missing (-1); `memorialState = null` is reset at the end of each test instead of `afterEach`. The substitute (wire-level equality in `kinship.spec.ts`) is sound and the spec's own comment says so, but Task 7.3 is ticked [x]. Retitle, assert anchors ≥ 0, `afterEach`; add the interleaved page leg or annotate Task 7.3 / AC7. [apps/public/tests/integration/public-pages/family-memorial-render.spec.ts:255,268] (blind, auditor)
- [x] [Review][Patch] **RP15 — A stale doc block contradicts the floor test beneath it (checklist 10)** — it still says "exact set of three … excluded below BY NAME" over `DATA_CLASS_EXCLUDED = {}` and seven declared gaps. [apps/public/tests/member-drive-detail-field-floor.test.ts:90-94,105] (auditor, blind)
- [x] [Review][Patch] **RP16 — Stale or wrong comments** — `anonymize.ts` "four Tier-1 columns" (now five); the policy-regression spec "all four columns" (two places); `KinshipLattice.astro` says a screen reader announces "wife: Sunita Devi, son: Amit and Rahul" (the real output is "Sons: Amit, Rahul"). [packages/domain/src/member/anonymize.ts:183; packages/domain/tests/integration/rls/memorial-policy-regression.spec.ts:20,826; apps/public/src/components/KinshipLattice.astro:5] (auditor, blind)
- [x] [Review][Patch] **RP17 — Raw bidi control characters in a test file** — U+202E at three lines, plus U+202C, U+2068, U+2069 on one (found by scanning the diff); a Trojan-Source hazard, and the integration specs already use `${FSI}` / `${RLO}` constants. Replace with escapes or constants. [apps/mobile/tests/unit/memorial-screens-render.test.ts:3777,3787,3796] (blind; [[project_unicode_escapes_written_raw]])
- [x] [Review][Patch] **RP18 — Tests that cannot tell the mutants that matter apart** — code points vs UTF-16 units: the "astral" test repeats a lone surrogate and measures bytes, and every cap test uses BMP Devanagari, so a mutant counting `.length` survives while AC2 says 200 code points; the SQL reason list is exercised with 2 of 4 reasons, so dropping `attacks_someone_named` from `memorial_kinship_omissions_valid` survives; `groupMemorialKinship` with an out-of-range, duplicate or NaN index is untested though documented "Pure; total". Add astral names at 200 / 201, iterate `MEMORIAL_REVIEW_REASONS` through the SQL function, add the grouping cases. [packages/contracts/tests/memorial-kinship.test.ts:80; apps/mobile/tests/unit/memorial-draft.test.ts; packages/domain/tests/integration/rls/memorial-policy-regression.spec.ts] (blind ×4, edge)
- [x] [Review][Patch] **RP19 — `validateMemorialDecision` fails open on a missing `kinshipLength`** — `subject.kinshipLength === null`: a caller or fixture that omits the new required field passes `undefined`, so the no-list and range checks are skipped and any index is accepted. The one production caller passes `number | null`, and contracts tests run outside `tsc`. Use `== null` (fails closed). [packages/contracts/src/memorial/omissions.ts:162] (blind)
- [x] [Review][Patch] **RP20 — `declared` defaults to `false` in three helpers, so a forgotten call site silently shows the wording KL16 forbids** — `reasonLabel`, `ReasonSelect`, `memorialReasonKey`. All current call sites pass it (checked). Make the parameter required so the type checker finds the next one. [apps/admin/src/modules/memorial-review/i18n-en.ts:188; apps/admin/src/modules/memorial-review/MemorialReviewPage.tsx:579; apps/mobile/components/memorial-authorship/memorial-copy.ts:50] (blind ×2)

#### Patches applied (2026-11-01, BigDev: "1" — apply every patch)

All 20 applied, in the working tree — **NOT committed, NOT gated**. Applied by three agents on disjoint directories, then the whole diff was read and the gates below re-run on the combined tree. Where a patch landed differently from its finding:
- **RP1** — the story text at AC2, Task 5.2 and the Trap 5 note says `sendContent` includes the list as `JSON.stringify(d.kinship ?? [])`; it now includes `JSON.stringify` of the rows the Send would carry (`memorialKinshipForSend`) as `[relation, name, inPhoto]` tuples. The intent (an edit to the list alone mints a new Idempotency-Key) is unchanged and tested; the old wording is kept above as written. Side effect: an edit made during an in-flight Send that touches only rows the Send does not carry (blank or unfinished rows) no longer counts as a newer draft.
- **RP2** — the per-row announcer is a small component, `MemorialRowOverLimitAnnouncer`, in `useMemorialAnnounce.ts` (`memorial-source-pins.test.ts` forbids `return null` in screen files; the pin is unchanged). A draft restored already over a limit stays silent.
- **RP3** — NOT as first drafted. The patch agent reused `memorial.detail.unavailable` ("The stored words could not be read right now"), which is false for a list-only failure and hid words that had decrypted. Now: the words stay when they decrypted, two NEW staff-facing lines say the version is not whole and the decision form is withheld: `memorial.detail.partUnavailable` ("Part of this version could not be read right now." — on the card, NEUTRAL because it also shows on a version already decided, withdrawn or erased; fix-round RP21) and `memorial.detail.partUnavailableForm` (the same, "…, so it cannot be decided yet.", in place of the decision form). The two new strings are admin chrome, not member or public copy; the microcopy gate passes. `decide`'s bare `Error` is unchanged by design (no new error code).
- **RP5** — the helpline screen's headline "On the Sahyog Vivran page now" still shows above the two existing "could not be read" lines, exactly as it already does for a words failure; no copy was invented.
- **RP11** — the pin now walks every `apps/*` and `packages/*` directory whole (so mobile `hooks/` and `store/` are covered) plus repo-root `scripts/` and `infra/`; no allow-list additions were needed; the planted-reference leg still goes red.
- **RP14** — the interleaved built-server leg was NOT added; the title no longer claims byte-identity and a comment points at the wire-level proof in `kinship.spec.ts` (which compares wire rows, not HTML bytes). **Task 7.3 and AC7's "built-server leg with interleaved input" are therefore SUBSTITUTED by that wire-level leg (unexecuted: it needs a live database) plus the page's own non-vacuous legs; there is ⛔ no page-level leg.**
- **RP16** — one more stale count was found and fixed: `packages/domain/src/schema/index.ts` ("four" → "five" Tier-1 columns).
- **RP18** — measured: 20 × 200 real astral names are 17,181 bytes, lone-surrogate escapes 25,181 bytes, both under the 32 KiB part. A hand-escaped surrogate PAIR (12 bytes per code point) would be about 49 KB and be refused by the part cap; no app produces one.
- **RP20** — `memorialReasonKey` / `reasonLabel` / `ReasonSelect` now require the flag. `MemorialText`'s own optional prop `guardianDeclaration = false` was left at first and CLOSED in the fix round (RP23): the prop is required and the two preview call sites pass `false`.

**Verified on the combined tree:** `tsc --noEmit` clean for mobile, admin and api (admin and api include tests; mobile excludes `tests/**`, so the new mobile tests were type-checked once with a temporary config — no errors in the additions); eslint `--max-warnings 0` exit 0 on every changed `.ts` / `.tsx` in all six packages; mobile memorial tests 526 / 526 and the full mobile suite 2,271 / 2,271 (run by the patch agent); admin memorial tests 133 / 133; `apps/api/tests/unit/memorial*` 116 / 116; contracts 1,674 / 1,674; domain `tests/memorial` + `tests/member` 411 / 411 (the purpose pin included); public unit legs for the files touched; `pnpm microcopy:check`, `pnpm friction:check` and the financial-truth gate pass. Mutation spot-checks (the new tests go RED on the old behaviour) were run by the patch agents for RP1, RP2, RP3, RP4, RP9, RP12, RP18 and RP19.
**WRITTEN but NOT RUN (they need a live database):** the new legs in `apps/api/tests/integration/memorial/kinship.spec.ts` (RP5 ×3, RP7 member view ×3 and review detail ×3, the decide audit hash, RP8); leg `(s4)` in `packages/domain/tests/integration/rls/memorial-policy-regression.spec.ts` (RP18); `apps/public/tests/integration/public-pages/family-memorial-render.spec.ts` (RP14, retitled and restructured). They are type-checked and linted only. **Task 9 stays OPEN: a clean `pnpm ci:local` 36 / 36 on the committed tree is still owed (AC13), and it is the first run that will exercise these.**
**Status:** left at `review` — the patches are applied and nothing is left as an action item, but AC13 defines done as a clean gate on the COMMITTED tree, and this tree is uncommitted and ungated. No sprint-status change and no ledger entry written here: `origin/main` already holds ledger `2026-11-01a` (Story 12.1 landed) and the branch must be rebased onto `3d6b46c5` first, so the letter is taken at the commit / rebase round.

#### Defer

- [x] [Review][Defer] **RD1 — The stored list has no version, and its read schema is strict** — `.strict()`, a closed relation enum and `inPhoto: literal(true)`, the same schema on every read, and KL10 drops the WHOLE memorial on a parse failure: a later tightening, a new relation or a rollback (old pod, new row) silently removes approved memorials from the page. Trigger: the first change to `MemorialKinshipListSchema` or `MEMORIAL_KINSHIP_RELATIONS` after go-live (Row 41) — needs a versioned envelope or a read-tolerant schema first. [apps/api/src/modules/memorial/memorial-kinship.ts:1-26] — deferred, design property of KL5 / KL10
- [x] [Review][Defer] **RD2 — Omissions are bare indexes into a write-once list** — safe today (only the erasure scrub updates the ciphertext, and it leaves a sentinel that drops the memorial), but `groupMemorialKinship` ignores out-of-range indexes and the decision row binds no length or digest. Row 11b-5b (PQ2 B, KL14: remove one entry "by submission + index") is the first writer that can shift positions. Trigger: the 11b-5b story's creation — it must remove by marker, never splice, with a test. [packages/contracts/src/memorial/kinship.ts:94-110] — deferred, unreachable until 11b-5b
- [x] [Review][Defer] **RD3 — The public SSR guard takes the whole drive page to the outage state over a bad family list** — it requires the `kinship` key and rejects an unknown relation, so a public deploy ahead of the API (or a relation the build does not know) degrades every visitor of a drive with a memorial. Same fail-closed posture as the words and photo guards, AC7 prescribes the strictness, and the memorial is dark behind Row 41. The guard also has no row / name ceilings, and the `names.length > 0` filter in `kinshipLatticeRows` is unreachable. Trigger: the go-live deploy-order decision (Row 41), or the first relation minted. [apps/public/src/lib/sahyog-vivran.server.ts:209-231] — deferred
- [x] [Review][Defer] **RD4 — The earlier withdrawn approval's reason is worded by the LATEST version's declaration flag** — a pre-v4 earlier version would show copy 4.3's "a confirmation never given". Unreachable until a v1–v3 approval exists in a live environment; the fix needs the earlier version's flag on the wire. Trigger: any live pre-v4 submission, or Row 41 go-live. [apps/mobile/app/(memorial)/outcome.tsx:145] — deferred
- [x] [Review][Defer] **RD5 — Family-screen rough edges** — "Continue without a list" discards up to 20 typed names with no confirmation; navigation proceeds when `save` failed (the existing V9 (a) keep-in-state pattern; the preview reads storage); a whitespace-only name with no relation blocks "Next" with nothing visibly wrong (Remove is available); a blank row counts as draft content; an unfinished row left by Back is dropped from the Send (the preview shows exactly what will be sent); "Start from the list I sent" re-seeds entries the Trust left out. Trigger: Story 11b.8, or a family-reported confusion. [apps/mobile/app/(memorial)/family.tsx; apps/mobile/lib/memorial-draft.ts:134] — deferred
- [x] [Review][Defer] **RD6 — Accessibility beyond checklist 13(a)–(d)** — every row's controls share one label (no row number); the "unfinished row" line does not name or focus the row; the 14 `radio` buttons have no `radiogroup`; the render-test mock copies role / state into data-attributes (tautological) and never maps `expanded`. Any fix needs new accessibility copy (BigDev approval). Trigger: Story 11b.8's accessibility audit (UX-DR70, launch-blocker). [apps/mobile/app/(memorial)/family.tsx:150-190] — deferred
- [x] [Review][Defer] **RD7 — Wife / Husband / Father / Mother have no plural** — copy 5.2 lists ten plurals and skips these four, but a list may hold many names per relation ("Mother · A, B" in English; Hindi is unaffected). Options: cap at one, add four plural keys (new copy), or accept. Trigger: the Row 41 (a) copy review. [packages/contracts/src/memorial/kinship.ts:115-126] — deferred
- [x] [Review][Defer] **RD8 — Names accept newline, tab, U+2028 / 2029, C0 / C1 controls and lone surrogates** — an API-direct caller can fuse two people into one entry the Trust cannot split; the app's single-line input cannot produce one. Names are stored byte-identical by design (AC2) and bidi controls are accepted and isolated at render. Trigger: the next change to KL4's name rule, or a reported fused entry. [packages/contracts/src/memorial/kinship.ts:36-40] — deferred
- [x] [Review][Defer] **RD9 — Maintainability drift** — the "same photo test" is derived three ways (`family.tsx`, `preview.tsx`, `use-memorial-send.ts`; equivalent today, checked); `kinship: null` has different meanings across the member view, review detail, take-down and public view; the omissions are named `kinshipLeftOut` / `kinshipOmissions` / `kinship_left_out` / `omissions` and the `{index, reason}` projection is copied in four places; the admin label table duplicates `memorial.json`, with no fallback for a relation a newer server sends; `lib/memorial-draft.ts` imports its row type from a components folder. Trigger: the next change to the Send photo logic, or 11b-5b / 11b-5c touching these shapes. — deferred
- [x] [Review][Defer] **RD10 — Test hardening** — the positive-control legs in `kinship-lattice-source.test.ts:76-80` test re-declared regexes; admin test titles overclaim ("bidi control visible" asserts only `not.toContain(RLO)`; no "list sits after the words" check); the KL15 in-photo confirm is tested on its happy path only; a dead cast in `takedown.spec.ts`; the DB-free erasure test asserts `typeof sub.kinshipCiphertext === 'object'` (the live integration spec is the real check); thin unit coverage of the new public read without a DB; the microcopy gate's `PLACEHOLDER_PARAMS` Proxy and magic offsets; the 32 KiB multipart field against escaped JSON. Trigger: the next touch of these suites. — deferred
- [x] [Review][Defer] **RD11 — Operator-screen polish** — the take-down view joins names with ", " (a name with a comma is ambiguous) and shows the isolate controls invisibly, where the review screen makes them visible; singular English labels (already disclosed in the Completion Notes). Trigger: Story 11b.8, or helpline feedback. [apps/admin/src/modules/memorial-takedown/MemorialTakedownPage.tsx:272-280,473-477] — deferred

#### Dismissed (20 distinct, with the reason — nothing here is hidden)

Send accepts a list without checking the copy carries the declaration (only v4 is current; a v1–v3 echo is refused `authorisation_outdated` inside the lock) · "idempotency fingerprint untouched" (the server has no content fingerprint; a replay is by key alone, `UNIQUE (pool_id, idempotency_key)` — the content-derived key is the client's, RP1) · a tick with `keepPreviousPhoto` refused (`withPhoto = photo !== null || keepPreviousPhoto`) · a kinship-only memorial dropped before the list is considered (unreachable: `nothing_left` refuses a decision that empties the words) · v4 promises member-app display and removal before they are built (AC12 / Row 41 (r) / `-432`) · Hindi v4 wording (BigDev's approved text, verbatim; `hiReviewed: false` until Row 41 (a) — input to that review) · Tier-1 public field with no ledger escalation (ruled, `-428` item 1) · `$comment` keys in the runtime bundle (existing convention on `main`) · "letters" vs code points in copy 2.10 (approved copy) · contracts test imports `@twt/domain` (declared dependency) · openapi lacks error codes (it never enumerates them; the kinship parts are present) · sorted / unique not mirrored in the DB CHECK (0182 precedent; the comment is RP10) · third-party names erased only in edge cases (disclosed and ruled, KL13 / AC9) · the prohibition glyph "reads as the opposite" (the file's documented glyph register) · outcome drops a left-out entry with an unresolvable index (needs a corrupt list, which sets `unavailable`) · matrix verdict not independent of the words (deliberate, per the test's title) · member-parity gate "weakened" (AC7 prescribes the four declared gaps) · wrapper `<div>` in `KinshipLattice.astro` and the unreachable empty-names filter (not violations) · non-atomic DROP / ADD under `psql -f` (the migration's stated contract is re-runnable idempotency) · the Hindi v4 test "freezes" the wording (it pins approved copy).

### Review Findings — fix-round review (2026-11-01, `bmad-code-review 11b.5a`, re-run on BigDev's option 2)

Review of the uncommitted patch round (`git diff HEAD`, tip `7de62adf`; 26 files, +906 / −85, 1,737 diff lines — records excluded; no chunking). Blind Hunter (diff only), Edge Case Hunter (diff + repo) and Acceptance Auditor (diff + spec + the RP1–RP20 record, judging each patch) all completed: **3 of 3 layers, 0 failed.** Raw findings **35** (Blind 20, Edge 6, Auditor 9) → **24 distinct** → **1 decision-needed (since DEFERRED by BigDev, "1" — now RD17), 7 patch, 6 defer (RD12–RD17), 11 dismissed.** No finding passes the Panel-routing gate (template §0). Not run: no test, build or `ci:local` (read-only review); the live-DB legs of round one are still unexecuted.
**Auditor verdicts on the 20 round-one patches:** RESOLVED 16 (RP1, RP2, RP3 [its logging half only partly done — RD16], RP4, RP6, RP7 [live legs unexecuted], RP8, RP9, RP10, RP11, RP12, RP15, RP16, RP17, RP18, RP19), PARTIAL 3 (RP5 — the helpline screen; RP14 — AC7's own text; RP20 — `MemorialText`), NOT TESTED 1 (RP13). No AC regression in AC2, AC5, AC6, AC7, AC8, AC10, AC14, AC15.

#### Decision-needed (resolved — DN1 deferred, listed here as RD17)

- [x] [Review][Defer] **RD17 (from DN1) — RP5 on the helpline screen: the headline and the "words could not be read" line do not say what the page actually shows** — the API now returns `words`, `altText`, `photoUrl` and `kinship` all `null` and `hasPhoto:false` for a memorial whose family list will not decrypt or parse (the public page drops the whole memorial, KL10). The screen still headlines it "On the Sahyog Vivran page now" and then prints "The words could not be read just now" (false: the words decrypted) and "The family list could not be read just now". `shown` carries no field that tells "the page shows nothing" from "the words failed", and `takedown.drive.notOnPage` is unreachable because `shown` must stay non-null to carry `submissionId`. The same gap already exists, unpatched, for a body or kept-photo-description decrypt failure (the view keeps the photo and list; the public page drops the memorial) — see RD13. Deciding fact: any heading or flag change is helpline-facing copy, which is BigDev's copy approval; it is NOT a disclosure, consent or basis question (the operator's own view). [apps/api/src/modules/memorial-takedown/handlers.ts:207-251; apps/admin/src/modules/memorial-takedown/MemorialTakedownPage.tsx:263-281] (auditor, blind, edge) — **DEFERRED by BigDev ("1", options: defer / build the flag + copy now / accept as is).** Reason, the reviewer's from the triage (BigDev gave none — edit if you want it in your words): the state arises only if a stored list is corrupt or unparsable, for which no path exists today (the Send validates with the same schema); the screen already prints two "could not be read" lines; and the right fix is a contract flag plus helpline copy that needs BigDev's approval, so it goes with RD13. **Trigger:** the next change to the helpline drive view, the RD1 list-schema change, or the first reported confusion. Sibling: RD13.

#### Patch

- [x] [Review][Patch] **RP21 — The part-unavailable notice is worded for a pending version but also shows on decided, withdrawn and erased ones** — "…so it cannot be decided yet" is false for a version already decided, and an erased member's list (a sentinel that does not parse) now sets `unavailable` too. The same string also renders twice (card and form) and the test (`findAllByText` + loop) passes with one or two. Make the card line neutral ("Part of this version could not be read right now."), keep the consequence line ("…so it cannot be decided yet.") in the decision form only, and assert each renders exactly once. Admin chrome only. [apps/admin/src/modules/memorial-review/MemorialReviewPage.tsx:445-451,711-714; apps/admin/src/modules/memorial-review/i18n-en.ts:43; apps/admin/tests/memorial-review.test.tsx] (edge, blind)
- [x] [Review][Patch] **RP22 — The RP19 fail-closed check still accepts `NaN`, `Infinity` and negative lengths** — `typeof … !== 'number'`: with `NaN` both comparisons are false and any index passes, the same fail-open as the `undefined` case it fixes. Use `Number.isInteger(len) && len >= 0`; add `NaN` / `Infinity` / `-1` to the test. [packages/contracts/src/memorial/omissions.ts:159-163] (blind, edge, auditor)
- [x] [Review][Patch] **RP23 — RP20 is only partly closed: `MemorialText` still defaults `guardianDeclaration = false`** — a forgotten `showReasons` call site compiles and shows the plain child wording KL16 forbids. Make the prop required and pass `false` explicitly at the two preview call sites (they never show reasons). [apps/mobile/components/memorial-authorship/MemorialText.tsx:25; apps/mobile/app/(memorial)/preview.tsx:137,152] (edge, auditor)
- [x] [Review][Patch] **RP24 — RP13 has no test that would fail without it** — nothing ties the `memorial.*` codes the memorial handlers throw to `MEMORIAL_MEMBER_ERROR_CODES`; the only enumerator checks photo problems. Add a source-scan unit test (the repo's pin idiom) that every `'memorial.<code>'` literal thrown in `apps/api/src/modules/memorial/**` is in the tuple. [packages/domain/src/memorial/errors.ts; apps/api/tests/unit/] (auditor)
- [x] [Review][Patch] **RP25 — RP9's failed-save branch is untested** — `held = lastSaveFailed.current ? shown.current : loadMemorialDraft(...)` (the X1 path) runs only on healthy storage in every leg. Add a leg where the previous save failed and the held choice comes from the screen. [apps/mobile/app/(memorial)/photo.tsx:173-190; apps/mobile/tests/unit/memorial-screens-render.test.ts] (blind)
- [x] [Review][Patch] **RP26 — Two comments claim more than the code does** — `sendContent` calls its photo test "the Send's own" but tests the file NAME where the Send tests that the file still resolves (they differ only when a picked file has vanished; the signature then errs on the side of changing the key); `KinshipLattice.astro` says "a plural label for two or more names" but only ten of the fourteen relations have one. [apps/mobile/lib/memorial-draft.ts:83; apps/public/src/components/KinshipLattice.astro:2-5] (auditor, blind)
- [x] [Review][Patch] **RP27 — Closure honesty: the spec text the patches amended is only partly annotated (checklist 10)** — (a) AC7 (`:549-550`) and Testing standards (`:928`) still promise a built-server byte-identity leg with interleaved input; annotate them as SUBSTITUTED by the wire-level leg in `kinship.spec.ts` (which is unexecuted) and change "met by" to "substituted by" in the applied block; (b) KL8 (`:327`) and the Trap 5 note (`:860`) still say `JSON.stringify(d.kinship ?? [])` — annotate as for AC2; (c) the applied block says the `MemorialText` residual is "recorded under RD9" while the story's RD9 line does not list it — settled by RP23, then fix the sentence; (d) list `memorial.detail.partUnavailable` (and RP21's second line) in the Completion Notes for BigDev's next copy pass. [_bmad-output/implementation-artifacts/11b-5a-kinship-capture-and-lattice.md] (auditor)

#### Fix-round patches applied (2026-11-01, BigDev: "1" — apply every patch)

RP21–RP27 applied in the working tree — **still NOT committed, NOT gated.** RP21: the card line is neutral and the decision form carries the consequence (`memorial.detail.partUnavailable` / `…Form`; admin chrome, listed for BigDev's next copy pass); two admin tests assert each notice renders exactly once and that a decided version never says "cannot be decided yet". RP22: the length check is `Number.isInteger(len) && len >= 0` (tests: `NaN`, `Infinity`, `-1`, `2.5`, length 0). RP23: `MemorialText.guardianDeclaration` is required; the two preview call sites pass `false`. RP24: new `apps/api/tests/unit/memorial-error-codes.test.ts` scans the memorial module's `'memorial.<code>'` literals against `MEMORIAL_MEMBER_ERROR_CODES` — mutation-checked (removing `memorial.kinship_invalid` from the tuple turns it red). RP25: a failed-save leg, mutation-checked (reading the held choice from storage turns it red) — the scenario is contrived by necessity: the failed-save branch differs from a storage read only when the stored draft disagrees with the screen. RP26: both comments corrected. RP27: AC7, Testing standards, KL8 and Trap 5 annotated, and the applied block's wording fixed ("substituted by", RP3's two strings, RP20 closed).

**Committed 2026-11-01 (BigDev: "commit it"):** the code and tests of all 27 patches as `ee25f597` (29 files, local only, ⛔ not pushed); this records commit follows it. Every "NOT committed" / "in the working tree" above is as of its own writing and PREDATES this line. Still owed: the rebase onto `origin/main` `3d6b46c5`, the ledger entry (its letter is taken after the rebase), and `pnpm ci:local` on the committed tree (Task 9).

#### Defer

- [x] [Review][Defer] **RD12 — A version whose family list is permanently unreadable has no exit** — the decision form is withheld and `decide` decrypts the list before validating, so the reviewer cannot decide even `not_approved`; `canSend` / `canWithdraw` are false so the family cannot re-send. The same class as an undecryptable body; reachable only after a schema change or corruption, because the Send validates with the same schema. Trigger: RD1 (the first change to the list schema) — then a `not_approved` path that does not need the list, and `decide` decrypting the list only when `kinshipLeftOut` is non-empty. [apps/api/src/modules/memorial-review/handlers.ts:290-299; apps/admin/src/modules/memorial-review/MemorialReviewPage.tsx:711-714] — deferred
- [x] [Review][Defer] **RD13 — The helpline view still diverges from the public page for an unreadable BODY or kept-photo description** — only an unreadable LIST was brought into line (RP5); the divergence for the words and the alt text predates this story. Trigger: the DN1 outcome (the same "page shows nothing" signal covers both). [apps/api/src/modules/memorial-takedown/handlers.ts:215-252] — deferred, pre-existing
- [x] [Review][Defer] **RD14 — `sendContent` does not sign exactly what the Send carries** — `altText` with no photo, `photoMime`, and `photoFileName` beside `keepPreviousPhoto` are still hashed raw, and the photo predicate is a copy. Not reachable by a UI edit today (`releasePicked` clears the file name; the description is edited only with a photo). Trigger: the next change to the draft or Send photo logic. [apps/mobile/lib/memorial-draft.ts:73-95] — deferred
- [x] [Review][Defer] **RD15 — The AC10 purpose pin scans TypeScript-family sources only** — no `.sql` outside migrations, `.sh`, `.py`, `.json`, `.yml`; `SKIP_DIR` drops any `test` / `tests` directory at any depth, including under `src`. AC10 concerns application code. Trigger: the first non-TypeScript tooling that touches the memorial tables. [packages/domain/tests/memorial/kinship-purpose-pin.test.ts:68-125] — deferred
- [x] [Review][Defer] **RD16 — Observability and test leftovers** — a list decrypt failure in the review detail and the take-down logs the generic "decrypt failed"; the public-wire leak test now checks the memorial object only (the page-wide key-name check was narrowed because `count` false-positives); the audit-hash test recomputes the payload from a copy of the production shape (its `.not.toBe` check is the meaningful part); the (s4) title says "lockstep" but proves a subset; the limit-line announcement does not manage focus when the focused "Add someone" button is removed at 20 rows. Trigger: the next touch of these files, or Story 11b.8. — deferred

#### Dismissed (11, with the reason)

Pinning the out-of-range-index fail-open in tests (owned by RD2; the safe change is 11b-5b's) · a runtime import cycle from `lib/memorial-draft.ts` (`memorial-kinship.ts` imports only `@twt/contracts`) · RP1's key-survival tests "pass for the wrong reason" (`saveMemorialDraft` merges, and each leg asserts the kept key) · other forms on the version also hit the list (only `detail` and `decide` decrypt it; the withdraw handlers do not) · the limit line "gated by two sources" (`rows` and `limitText` both derive from the same `loaded.kinship`) · the per-row announcer reset "depends on batching" (`setRemovals` and `save`'s `setLoaded` run in one handler) · the policy-spec (v) title "all five columns" (its body does scrub and check the kinship column) · `MEMORIAL_KINSHIP_LABEL_KEYS` widened with `kinship.heading` (its own doc says every `kinship.*` key; no other consumer) · lone surrogates accepted (RD8) · the 0194 header edit "rots" or trips a gate (comment-only; no gate hashes migrations; it stays true after the rebase) · the rebase onto `3d6b46c5` still owed (known, recorded).

## Dev Notes

### Traps

1. **The rulings decide the shape.** `-428` PQ1 A carries its conditions (footgun 45): *used for nothing else* (AC10) and the RIDER
   (the member app shows the memorial — row 11b-5c, ⛔ not here). `-426` replaces "adults only" with the guardian declaration (KL16).
   ⛔ Never start Task 2 before Task 1's governance commits (the validate pass of v2.x is done — v2.3).
2. **⛔ No names held for an unruled purpose (`-398` MA2).** Until the ruling, the Trust holds ⛔ no list of living relatives. ⛔ No
   fixture, seed or test DB row with a real-looking relative list ships before the ruling — test data uses obviously synthetic names,
   and only from Task 2 on. (The October note's *"until this question is answered"* named Q2, which is answered; MA2 is the live ground.)
3. **`MEMORIAL_OMISSION_FIELDS` is ⛔ not the place.** The `body` / `altText` pair is hard-coded in AT LEAST these places — SQL
   `0182:63`, domain vocab :55, contracts vocab :24, admin `derive.ts:85`, the presenter (`packages/ui/src/memorial/presenter.ts:93-94`),
   `memorial-public-text.ts:98, :102`, `MemorialReviewPage.tsx:468, :558, :648`, `omissions.ts:132-134` — ⛔ not a closed list until you
   paste `git grep -n -E "'body'|'altText'" -- packages apps`. It models UTF-16 spans over TEXT. The list is structured; its omission is
   per entry (KL6), so ⛔ none of these sites changes. (The presenter needs ⛔ no kinship change: `reconstructMemorial` takes only
   `{omissions, photoLeftOut}`.)
4. **Encrypt before the lock, decrypt after the tx** (`submission.ts:9`) — a KMS call under `pg_advisory_xact_lock` stalls every write
   on that pool.
5. **`sendContent` (`memorial-draft.ts:65-67`) is a CLOSED list of PRIMITIVES.** Miss `kinship` — or add it as an array, which `===`
   at :96 compares by reference — and a family that edits only the list after a failed Send replays the OLD submission under the kept
   Idempotency-Key, silently (the server's replay ignores the payload). Add `JSON.stringify(d.kinship ?? [])`. [⭐ 2026-11-01 review RP1: built canonically instead — the rows the Send would carry, as `[relation, name, inPhoto]` tuples.]
6. **The exact-list pins — a fourth memorial field moves every one.** ⭐ The pasted grep at the pin
   (`git grep -n "family_memorial_photo_alt_text" -- packages apps scripts`, 17 hits — re-run it, ⛔ never a recalled list, footgun
   #60(a)): `FamilyMemorial.astro:35` · `family-memorial.ts:8` · `surface-fields.ts:757` · `family-memorial-gating.test.ts:3, 20, 59` ·
   `family-memorial-source.test.ts:75` (id list), `:84` (`feeds` map) · `scrape-test.spec.ts:1447, 1558, 1599, 1654` (the `RULED` map
   :1645-1660) · `member-drive-detail-field-floor.test.ts:90` (`DATA_CLASS_EXCLUDED` :87-91 — ⭐ under `-428` all FOUR memorial ids become declared
   GAPS owed by row 11b-5c: `MEMBER_COUNTERPART: []`, `declaredGaps` 3 → 7, `DATA_CLASS_EXCLUDED` emptied, the :275 test rewritten —
   Task 7.2; ⛔ never `-411` item 7 as their authority any more, ⛔ never "the PC2 ruling" — PC2 was ⛔ not answered) · `sahyog-vivran-render.test.ts:540`
   · matrix YAML :1389 · `matrix.ts:520` (`RULED_TIER1_PUBLIC_EXCEPTIONS` :518-520) · `packages/contracts/tests/public-pages.test.ts:531`
   (the pair, under the :512 title *"carries EXACTLY the nine ruled Tier-1 public exceptions"* → ten). Also in
   `family-memorial-source.test.ts` (⛔ not alt-text hits, same file): `TOUCHED` (:17-28 — add `KinshipLattice.astro` by hand, the
   PortraitFrame precedent), `STYLED` (:108), and the exact-three-styles pin (:162-166 — it fails if `FamilyMemorial.astro` gains a
   styled wrapper, so styles live inside `KinshipLattice.astro`). `apps/public/scripts/verify-matrix-inline.mjs` is ⛔ not a pin (its
   probes are generic) — it is an AC11 gate over a built `dist/`.
7. **The wire guard fails the WHOLE page.** `isFamilyMemorial` (`sahyog-vivran.server.ts:210-222`) demands exact keys; the API and the
   guard must change in the same commit, and the built-server spec must run (only the BUILT image exercises the real path —
   footgun #60).
8. **"Finished strings only."** The relation CODE crosses the wire by design (KL10); ⛔ nothing else does — no index, no reason, no
   left-out count, no per-entry id. A count of left-out entries would leak exactly what `-411` item 3 hides.
9. **Erasure legality ≠ a scrub existing.** `resolveRtbfLegality` admits erasure only for `withdrawn` / a `terminated` overlay; `-423`
   RULES it closed for every member whose death was reported; row 6-38 has built the lock on its branch (`e813e5ee`, `review`) but ⛔ not on `main` — until it lands, the
   scrub is REACHABLE in code for a deceased member. Write the scrub (AC9) and say exactly that (ratified ≠ built). If 6-38 has landed,
   read its code before writing the leg.
10. **A CHECK on a populated table.** Dropping and re-adding `omissions_iff_action` re-validates existing rows — they pass (new column
    defaults `[]`). ⛔ `NOT VALID` is ⛔ not needed and would leave old rows unchecked; ⛔ no CHECK touches a ciphertext column.
11. **`<MemorialRecord>` (11b.6) is ⛔ not this lattice's home.** UX-DR17 / UX §11 put the lattice inside `<MemorialRecord>`, but 11b.6 is
    In Memoriam and the matrix scopes family-owned fields to `sahyog-vivran` ONLY. The list must ⛔ not appear in an In Memoriam entry
    without its own ruling — say so in 11b.6's epics note (Task 1.2 (ii)).
12. **Names are never touched.** ⛔ no `trim()`, ⛔ no `normalize()`, ⛔ no initials, ⛔ no title-case — in the app, the API, the render.
    `dir="auto"` on every `<dd>` isolates ROWS, ⛔ not names: each name is wrapped by `isolateMemorialBidi` at render time (a view, ⛔
    never stored — KL10); the admin shows bidi controls visibly (`bidiVisible`, `derive.ts:108`).
13. **Pool-state producer.** The writing window opens only on a pool `closed` / `settled`, and ⛔ no production code moves a pool there
    (Row 41 (f); footgun #59(b)) — tests seed the state; ⛔ nothing here fixes that.
14. **The prototype stays.** `apps/mobile/components/shradhanjali/` is ⛔ not imported, ⛔ not edited, ⛔ not deleted.

### Architecture compliance
- Tier-1 per architecture §2.7 (:1527-1562) — *"new PII fields declare their tier at schema definition; CI guards that no Tier 1 field
  is rendered to a public surface"* — the public exception is a RULING (`matrix.ts`), ⛔ never a code change.
- Minor data: architecture :1839-1846 suppresses a **minor nominee's** identity from public surfaces (*"Sahyog Vivran shows family
  without minor's name"*) and says DPDPA §9 *"carries to all minor-data handling"*. ⚠ `-426` (Trustee-ratified) lets a family name and
  show children on a guardian's declaration ⇒ the architecture is AMENDED to match before go-live (`-426` Consequence 3; Task 1.2
  (iv-c) records the dated note; Row 41 (t)); the draft privacy policy's §5 minors line (private corpus) needs the same look. Counsel has ⛔ not reviewed the list (Row 3's
  clearance is edge-scoped only — [[project_dpdpa_counsel_engaged_but_unrecorded]]); carried as a risk, ⛔ not a blocker.
- Basis: family-owned information rests on **the family's own consent** (`-160` cl.3), given **at the point of submission** (`-162`
  cl.3) — the v4 permission at Send. ⛔ Never a claim-time box (`-162` cl.2 retired them), ⛔ never the member's T&C.
- No new permission key; no new role; no event; audit lines only through the existing memorial write actions (MA11).

### Library / framework
⛔ No new dependency. Astro (apps/public, existing version), Expo Router + Tamagui (mobile — ⚠ `Button` text wraps poorly:
[[project_tamagui_button_text_one_line]]), React (admin), Zod (contracts), Drizzle + hand-written SQL (domain). Web research: ⛔ none
needed — no library or API changes.

### File structure (NEW / UPDATE)
- NEW `packages/domain/migrations/0193_memorial-kinship.sql`; UPDATE `meta/_journal.json`
- UPDATE `packages/domain/src/schema/{memorial_submissions,memorial_review_decisions}.ts`, `src/memorial/{vocab,submission,public-read,review,authorisation-copy}.ts`, `src/member/anonymize.ts`
- UPDATE `packages/contracts/src/memorial/{vocab,dto,omissions,text-classes,takedown,index}.ts`; NEW `packages/contracts/src/memorial/kinship.ts` (schema + grouping helper); UPDATE `src/public-pages/{sahyog-vivran,matrix}.ts`, `public-pages/public-vs-private-matrix.yaml`
- UPDATE `openapi/v1.yaml` (`pnpm contracts:emit-openapi` — generated, committed; `contracts-determinism` compares it byte for byte)
- UPDATE `apps/api/src/modules/memorial/handlers.ts`, `memorial-review/handlers.ts`, `memorial-takedown/handlers.ts` (the `shown` builder :187-218, the sentinel check :194), `public-pages/memorial-public-read.ts`, `public-pages/memorial-public-text.ts` (if the per-name isolation lives beside the words')
- NEW `apps/mobile/app/(memorial)/family.tsx`; UPDATE `photo.tsx`, `preview.tsx`, `outcome.tsx`, `lib/memorial-draft.ts`, `lib/use-memorial-send.ts`, `components/memorial-authorship/memorial-copy.ts`
- UPDATE `apps/admin/src/modules/memorial-review/{MemorialReviewPage.tsx,derive.ts,i18n-en.ts}`, `apps/admin/src/modules/memorial-takedown/{MemorialTakedownPage.tsx,i18n-en.ts}`
- NEW `apps/public/src/components/KinshipLattice.astro`; UPDATE `FamilyMemorial.astro`, `lib/{family-memorial,surface-fields,sahyog-vivran-render,sahyog-vivran.server}.ts`
- UPDATE `packages/i18n/locales/{en,hi}/memorial.json` (the ONE home of the labels — ⛔ no `sahyog-vivran.json` copy), `microcopy.yaml` (`code_globs`), `scripts/sahyog-vivran-financial-truth/check.ts`, `friction-budget.md`
- NEW tests: `apps/public/tests/kinship-lattice-source.test.ts`, the AC10 pin (`packages/domain/tests/memorial/`); UPDATE the tests and fixtures named in Tasks 2–7 (incl. `rtbf-anonymize.test.ts`, `memorial-status.test.ts`)

### Testing standards
- Live-DB specs use `describe.skipIf(!hasDatabase)` and run only in `integration-tests`; admin / mobile / contracts / ui run only in
  the unit job. Run touched live specs on your own container, DB NAMED `twt_dev`.
- RED first on named mutants (Task 9); restore byte-identical.
- The AC7 byte-identity leg uses INTERLEAVED input (`son, wife, son-left-out` vs `wife, son`) so it proves the grouping as well as the
  omission. [⭐ 2026-11-01 review RP27: that is the WIRE leg in `kinship.spec.ts` (live DB, ⛔ not yet run); the render spec has ⛔ no interleaved leg.]
- Same-transaction `now()` ties — separate transactions for any ordering assert ([[project_db_clock_ordering_tests_tie]]).

### Previous story intelligence (11b.5, landed `8dd3e623..8d90f560`)
- `<PortraitFrame>` set the pattern this story copies: a dumb Astro component, static inline token styles (spacing only), a source
  test pinning props / markup order / bans with positive controls, and a hand-added `SCAN_FILES` entry.
- `apps/public` has ⛔ no Tailwind pipeline — utility classes are inert (MV5); ⛔ no `@twt/ui` in `apps/public` (MV3).
- Review lessons: the class / style source guards must catch `class:list=`, no-whitespace `style`, any case, `<style/>`; the
  decorative empty `alt` (item (5)) and the `code()` `//` line-swallow are carried — ⛔ not this story's.
- 11b.4a: the render spec builds its own server copy; a take-down must leave the page byte-identical (the same assert AC7 reuses).

### Questions for BigDev (Task 0.2) — saved for the end, as the workflow asks
1. **KL1–KL14** — as recommended, or which differ? (KL14: PQ2's build in a follow-up row, or here?) — ✅ **ANSWERED 2026-10-31**:
   KL1–KL2, KL5–KL14 as recommended (KL14: a follow-up row); KL3 a closed domain vocabulary, grandchildren split four ways; KL4 one
   relation + one name per entry, adults only by name, at most 20, a 200-code-point cap (verbatim under the KL heading).
2. **Q-copy-1** — the relation labels (hi + en), KL3. ✅ **ANSWERED 2026-10-31**: structure — four grandchildren codes, grandchildren
   kept; wording — *"fourteen labels are fine"*: hi पत्नी · पति · पुत्र · पुत्री · पिता · माता · भाई · बहन · पौत्र · नाती · पौत्री · नातिन ·
   पुत्रवधू · दामाद, and the English in KL3. (`hiReviewed` still waits on a non-author review — Row 41 (s).)
3–5. **Q-copy-2…5** — ✅ **ALL APPROVED 2026-10-31** (*"all copy approved. Hindi modified in one place."*): the family screen
   (2.1–2.25, with 2.4A shipping and 2.4B dropped), the v4 permission (① with BigDev's own Hindi; ③ the declaration; ⑤B), the outcome
   line (4.1), the public heading (5.1 — the ⭐ *"Mourned by"* / *"शोकाकुल परिवार"*; the alternative is ⛔ not used) and the English
   plurals (5.2). ⚠ `hiReviewed` stays `false` for all of it until a reviewer who did ⛔ not write it signs off (Row 41 (s)); ① is now
   BigDev's own Hindi, so BigDev cannot be that reviewer for ① (the v3 precedent). Noted for that review, ⛔ not changed here: ① says *"क्लिक"*
   (a phone tap — ③ says *"दबाकर"*), quotes the button as *'भेजें'* (it reads *"ट्रस्ट को भेजें"*), carries English glosses *(Send)*,
   *(Sahyog Vivran)* (no other Hindi string does), and writes *फोटो* (elsewhere *फ़ोटो*).
6. **Q-copy-6** — the name cap. ✅ **ANSWERED 2026-10-31: 200 code points** (KL4).
7. **Split?** ✅ ANSWERED 2026-10-31: the member-app memorial (the `-428` rider) → new row **11b-5c**; the helpline one-name
   removal (PQ2 B) → row **11b-5b**; the declaration for words + photo (AQ2 / AQ3 A) → **inside 11b-5a**.
8. Send the routing note yourself (Task 0.3)? ✅ Done — v1 sent, the addendum sent and ruled (`-426`), v2 re-sent and ruled (`-428`).

### Copy — Q-copy-2…5 — ✅ APPROVED by BigDev 2026-10-31 (*"all copy approved. Hindi modified in one place."*)

⭐ Written to match the shipped `memorial` namespace (`photo.title` *"A photo, if you wish"*, `write.start_from_sent`, `photo.without`,
v3's sentences). Every key is in `memorial` — the ONE home (KL9); the public page reads the same keys. `{…}` = interpolated (each needs
a real-`t()` leg in both locales — AC11). ⚠ Approval here is BigDev's; `hiReviewed` still needs a reviewer who did ⛔ not write the
text (`docs/tone-review-checklist.md`, `reviewedBy ≠ authoredBy`) — Row 41 (s).

**Q-copy-2 — the family screen (`family.tsx`), its preview line and its refusal**

| # | Key | English | Hindi | Note |
|---|---|---|---|---|
| 2.1 | `family.title` | Their family, if you wish | उनका परिवार, अगर आप चाहें | mirrors `photo.title` |
| 2.2 | `family.body` | You can list the family they leave behind, as an obituary does. It is up to you. | आप चाहें तो, शोक संदेश की तरह, उनके परिवार के लोगों के नाम लिख सकते हैं। यह आपकी इच्छा पर है। | optional, said plainly |
| 2.3 | `family.where_shown` | The list will appear with your words on the member's Sahyog Vivran page, which anyone with its link can read, and to members in the app. | यह सूची आपके शब्दों के साथ सदस्य के सहयोग विवरण पेज पर दिखेगी, जिसे उसका लिंक रखने वाला कोई भी पढ़ सकता है, और ऐप में सदस्यों को भी। | (both places — `-428` rider) `-391` item 2: *"told exactly where it will appear"*; the Trust's review is said ONCE, in the permission at Send (Q-copy-3) — ⛔ not repeated here; under PQ1 C this line changes |
| 2.4A | `family.children_guardian` | You may name a child only if you are their parent or guardian, or have their parent's or guardian's agreement. You will be asked to confirm this before you send. | किसी बच्चे का नाम आप तभी लिख सकते हैं जब आप उसके माता-पिता या अभिभावक हों, या उनके माता-पिता या अभिभावक की सहमति ली हो। भेजने से पहले आपसे इसकी पुष्टि करने को कहा जाएगा। | ✅ **SHIPS — `-426` ruled AQ1 A (the guardian declaration)** — BigDev's line (*"Children name is permissible only if you are Guardian"*), widened to match the addendum's declaration word for word (*"… or I have their parent's or guardian's agreement"*) so a grandparent can list grandchildren with their parents' agreement; the declaration is sentence ③ of the v4 permission, given by pressing Send (KL16) |
| 2.4B | `family.adults_only` | Please list only adults. Do not list any children — if the Trust finds a child's name, it will leave it out. | कृपया केवल वयस्कों के नाम लिखें। किसी बच्चे का नाम न लिखें — अगर ट्रस्ट को किसी बच्चे का नाम मिलता है, तो वह उसे छोड़ देगा। | **DROPPED** — `-426` ruled AQ1 A, ⛔ not B; v3's child sentence, extended |
| 2.5 | `family.relation_question` | For each person, choose how they are related to the member. | हर व्यक्ति के लिए चुनें कि सदस्य से उनका क्या रिश्ता है। | KL3: relation TO THE MEMBER WHO DIED |
| 2.6 | `family.relation_label` | Relation | रिश्ता | picker label |
| 2.7 | `family.relation_choose` | Choose | चुनें | picker placeholder |
| 2.8 | `family.name_label` | Name | नाम | |
| 2.9 | `family.name_hint` | One person on each line, written as you would like it to appear. | हर पंक्ति में एक ही व्यक्ति — नाम वैसे लिखें जैसे आप उसे दिखाना चाहें। | KL4 one person per entry; names never changed |
| 2.10 | `family.name_over_limit` | This name is a little long for the page. Please shorten it by about {count} letters. | यह नाम पेज के लिए थोड़ा लंबा है। कृपया इसे लगभग {count} अक्षर छोटा करें। | mirrors `write.over_limit`; cap 200 |
| 2.11 | `family.row_incomplete` | Please choose a relation and write a name for each person, or remove that line. | कृपया हर व्यक्ति के लिए रिश्ता चुनें और नाम लिखें, या वह पंक्ति हटा दें। | blocks Next |
| 2.12 | `family.add` | Add someone | किसी को जोड़ें | |
| 2.13 | `family.remove` | Remove | हटाएँ | |
| 2.14 | `family.remove_a11y` | Remove {name} from the list | {name} को सूची से हटाएँ | screen-reader label; an empty name falls back to 2.15 |
| 2.15 | `family.remove_empty_a11y` | Remove this line | यह पंक्ति हटाएँ | |
| 2.16 | `family.limit_reached` | You have listed {count} people, which is as many as the page can hold. | आपने {count} लोगों के नाम लिखे हैं; पेज पर इतने ही आ सकते हैं। | `{count}` = 20 |
| 2.17 | `family.start_from_sent` | Start from the list I sent | जो सूची मैंने भेजी थी, वहीं से शुरू करें | mirrors `write.start_from_sent`; re-send only |
| 2.18 | `family.without` | Continue without a list | बिना सूची के आगे बढ़ें | mirrors `photo.without` |
| 2.19 | `family.next` | Next | आगे | |
| 2.20 | `preview.change_family` | Change the family list | परिवार की सूची बदलें | mirrors `preview.change_photo` |
| 2.21 | `preview.no_family_list` | This version has no family list. The list you sent before will not appear. | इस संस्करण में परिवार की सूची नहीं है। पहले भेजी गई सूची नहीं दिखेगी। | shown only when the previous version had one |
| 2.22 | `send.kinship_invalid` | We could not read the family list. Please check that each person has a relation and a name, then send again. | हम परिवार की सूची नहीं पढ़ सके। कृपया देखें कि हर व्यक्ति का रिश्ता और नाम लिखा है, फिर दोबारा भेजें। | refusal `memorial.kinship_invalid` |
| 2.23 | `family.in_photo` | In the photo | फ़ोटो में | optional tick on each row; only when a photo is being sent (KL15) |
| 2.24 | `family.in_photo_hint` | If you added a photo, you can tick who in your list appears in it. This helps the Trust; it is not shown under the photo. | अगर आपने फ़ोटो जोड़ी है, तो आप सूची में से उन लोगों पर निशान लगा सकते हैं जो फ़ोटो में हैं। इससे ट्रस्ट को मदद मिलती है; यह फ़ोटो के नीचे नहीं दिखाया जाता। | ✅ true — `-426` ruled (b)1 |
| 2.25 | `family.in_photo_a11y` | {name} is in the photo | {name} फ़ोटो में हैं | screen-reader state of the tick |

**Q-copy-3 — the v4 permission shown above Send (`MEMORIAL_SUBMISSION_AUTHORISATION_VERSIONS` v4).** v3 word for word, except the
five marked changes. ⚠ Sentence ⑤ has **one wording per PQ2 outcome** — the one the Panel picks is minted; the others are dropped.
Under PQ1 B (relations only) ①–④ change again; under PQ1 D there is ⛔ no v4.

| # | Change from v3 | English | Hindi |
|---|---|---|---|
| ① | the list named; **both places** (`-428` rider) — ✅ Hindi = **BigDev's wording** (2026-10-31, edited in this table; kept verbatim) | When you press Send, you, as the nominee, give the Trust permission to show these words, the family list if you added one, and the photo if you added one, on this member's Sahyog Vivran page, which anyone with its link can read, and to members in the app. | जब आप 'भेजें' (Send) पर क्लिक करते हैं, तो नॉमिनी के तौर पर आप ट्रस्ट को यह अनुमति देते हैं कि वह इन शब्दों, परिवार की सूची (यदि आपने जोड़ी है), और फोटो (यदि आपने जोड़ी है) को इस सदस्य के 'सहयोग विवरण' (Sahyog Vivran) पेज पर दिखाए। इस पेज को कोई भी व्यक्ति, जिसके पास इसका लिंक हो, देख सकता है; साथ ही, ऐप में मौजूद अन्य सदस्य भी इसे देख सकते हैं। |
| — | unchanged | The Trust will read them before anyone else does. | किसी और के देखने से पहले ट्रस्ट इनका अवलोकन करेगा। |
| ② | a name may be left out; names never changed | It may leave out a sentence, a name from the list, or the photo, and will tell you why, but it will never change your words or the names you wrote. | वह कोई वाक्य, सूची का कोई नाम या फ़ोटो छोड़ सकता है, और आपको इसका कारण बताएगा, पर आपके शब्द या आपके लिखे नाम कभी नहीं बदलेगा। |
| ③ | **the declaration** (`-426` AQ1 / AQ2 / AQ3 A) — replaces v3's child sentence | By pressing Send you also confirm: for every child you have named or who is in the photo, you are their parent or lawful guardian, or you have their parent's or guardian's agreement; and every adult you have named has agreed to be named. | भेजें दबाकर आप यह भी पुष्टि करते हैं: आपने जिस भी बच्चे का नाम लिखा है या जो फ़ोटो में है, उसके आप माता-पिता या कानूनी अभिभावक हैं, या आपने उसके माता-पिता या अभिभावक की सहमति ली है; और आपने जिस भी वयस्क का नाम लिखा है, उसने नाम लिखे जाने पर सहमति दी है। |
| — | unchanged | If you, the nominee, ever want it changed or taken down, you can call the helpline. | अगर आप, नॉमिनी, कभी इसमें बदलाव चाहें या इसे हटवाना चाहें, तो हेल्पलाइन पर फ़ोन कर सकते हैं। |
| ⑤A | DROPPED (`-428` ruled PQ2 B, ⛔ not A) | — | — |
| ⑤B | ✅ **SHIPS — `-428` ruled PQ2 B** | Only the nominee can ask for it to be taken down; the helpline will not remove it at anyone else's request — except that a person named in the family list may ask for their own name to be removed. | इसे हटवाने का अनुरोध केवल नॉमिनी ही कर सकते हैं; किसी और के कहने पर हेल्पलाइन इसे नहीं हटाएगी — सिवाय इसके कि परिवार की सूची में जिसका नाम है, वह अपना नाम हटवाने का अनुरोध कर सकता है। |
| ⑤C | DROPPED (`-428` ruled PQ2 B, ⛔ not C) | — | — |
| — | unchanged | Often a small change is enough. | अक्सर एक छोटा-सा बदलाव काफ़ी होता है। |
| ④ | the list among the Trust's grounds; ✅ **the child ground narrowed** (`-426` / `-428` PC1 A) — **RE-APPROVED by BigDev 2026-10-31** (*"approved"*; the earlier approved text said *"…or names or shows a child."*) | The Trust itself may still withdraw its approval, but only if something in the words, the list or the photo speaks against a person by name, says that someone did something wrong, may be against the law, or names or shows a child this confirmation does not cover. | ट्रस्ट स्वयं फिर भी अपनी स्वीकृति वापस ले सकता है, पर केवल तब, जब शब्दों, सूची या फ़ोटो में किसी व्यक्ति के विरुद्ध उसका नाम लेकर कुछ कहा गया हो, यह कहा गया हो कि किसी ने कुछ गलत किया, कुछ ऐसा हो जो कानून के विरुद्ध हो सकता है, या किसी ऐसे बच्चे का नाम हो या वह दिखता हो जिसके लिए यह पुष्टि लागू नहीं होती। |

**Q-copy-4 — the outcome screen, for each entry the Trust left out**

| # | Key | English | Hindi | Note |
|---|---|---|---|---|
| 4.1 | `outcome.kinship_left_out` | Left out of the family list: {relation} — {name} | परिवार की सूची से छोड़ा गया: {relation} — {name} | followed by the existing `outcome.reason` (*"The reason: {reason}"* / *"कारण: {reason}"*); `{name}` bidi-isolated |
| 4.2 | (existing) `outcome.approved_with_omissions` | — | — | already reads *"left out a part, marked below … nothing marks where it was"*; it fits a list entry too ⇒ ⛔ no change proposed |
| 4.3 | `outcome.reason_child_undeclared` — ✅ **NEW, APPROVED 2026-10-31** | it names or shows a child your confirmation cannot cover | इसमें किसी ऐसे बच्चे का नाम है या वह दिखता है जिसके लिए आपकी पुष्टि लागू नहीं हो सकती | shown in place of `reason.identifies_a_child` for a submission whose version carries the declaration (KL16) — so a family that declared does ⛔ not read the plain *"it names or shows a child"* |
| 4.4 | admin `memorial.reason.identifies_a_child_declared` (English only) — ✅ **NEW, APPROVED 2026-10-31** | Names or shows a child the declaration cannot cover | — | the admin label for a v4+ submission; plus the added guidance key: *"Use this only where something in the memorial itself shows the sender's declaration cannot cover the child; the family is told why."* (worded to `-432` R3 A as put — was *"…a concrete reason to think…"*; ✅ BigDev confirmed 2026-10-31: *"changes fine"*) |

**Q-copy-5 — the public heading over the list (also used by the app's preview, which must match the page)**

| # | Key | English | Hindi | Note |
|---|---|---|---|---|
| 5.1 | `kinship.heading` | ⭐ Mourned by · *alt:* The grieving family | शोकाकुल परिवार | the `<h3>` and the `<dl>`'s label; it sits under the section heading *"In the family's words"* / *"परिवार के शब्द"*. *"Mourned by"* is the obituary idiom and reads straight into the list (*"Mourned by — Wife: Sunita Devi"*); *"The grieving family"* is the literal Hindi |
| 5.2 | `kinship.<code>_plural` (English only) | Sons · Daughters · Brothers · Sisters · Grandsons (son's sons) · Grandsons (daughter's sons) · Granddaughters (son's daughters) · Granddaughters (daughter's daughters) · Daughters-in-law · Sons-in-law | — (Hindi labels read correctly for one or more: *पुत्र · अमित, राहुल*) | ⚠ **a gap found while drafting:** the approved English labels are singular, so two names under one relation would read *"Son: Amit, Rahul"*. Proposed: an English plural used when a relation has two or more names (Wife / Husband / Father / Mother need none). ⛔ No new relation; Q-copy-1's words unchanged |

### References
- Decisions: `-398` MA2, MA6, MA11, MA13, MA15 (author-commit) · `-391` items 2, 4, 5, 7, Not covered + dated pointer (Trustee-ratified) ·
  `-393` M1, M4 · `-395` item 3 · `-411` PQ1 A, items 3, 4, 6, 7 (Trustee-ratified) · `-412` §3.2, MP3, MP7, MP8 (b) · `-398` MA16 ·
  `-195` cl.1 · `-420` MV2, MV3, MV5, MV6 · `-423` Q1 (a),
  (b) (Trustee-ratified 2026-10-30) · `-160` cl.3, cl.5 · `-162` cl.2, cl.3 · `-205` cl.2 · `-173` (a), (d) · `-257` cl.1 · `-210` cl.2
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-23-11b4-family-memorial-five-questions.md` :145-147 (*"Our decision, ⛔ not a question"* — kinship not collected until Q2 is answered), :115-143 (Q2 as put; options table
  :133-139), E2 :405-406 · `trustee-panel-routing-note-2026-10-27-11b4a-family-memorial-public-render.md` :188-189 (memorial off the member app — the permission names only the public page)
- `_bmad-output/planning-artifacts/epics.md` :6660 (11b.4 step (d)), :6690 (11b.5 lattice), :6695 (11b.5 note), :6767-6768 (11b.6 note + STOP), :414 / :416 (UX-DR17 / UX-DR19), :6122-6125 (11a.3 invariant)
- `_bmad-output/planning-artifacts/ux-design-specification.md` :439, :475, :1204, :1671, :1947, :1950, :1962-1969, :2026, :2150-2157
- `_bmad-output/planning-artifacts/architecture.md` §2.7 :1527-1562, minor data :1839-1846
- `_bmad-output/research/p0-2b-bereaved-spouse-protocol/assumption-inventory.md` :114 `A-memorial-relations-private` (*"optional + private by default"*; pending interview)
- `_bmad-output/implementation-artifacts/11b-5-memorial-visual-components-memorial-record-portrait-frame-kinship-lattice.md` G6, MV2 · `11b-4-…md` MA2 (:345-351) · `11b-4a-…md` :853, :874
- `docs/launch-gate-inventory/inventory-roster.md` Row 41 (:745-764; criteria (a)–(q), (r) / (s) free)
- Niyamavali (private corpus, main checkout): §6.5, Part 10 (c) — silent on relatives (checked 2026-10-30)

## Appendix — History (NON-BINDING; the RULED block at the top binds)

⚠ Kept for the record of how the questions were put. ⛔ Nothing below orders a build step. The questions AS PUT live in the two
routing notes (`trustee-panel-routing-note-2026-10-31-11b5a-kinship.md` — version 2, ruled `-428`; version 1 `6f22bd4d` — and
`…-11b5a-kinship-addendum-guardian-declaration.md`, ruled `-426`).

### A1 — Routing-template §0 gate (as planned at Task 0.3) (the template is referenced by path, never copied: `_bmad-output/planning-artifacts/trustee-panel-routing-note-TEMPLATE.md`)

| # | Question | §0 verdict | Where it goes |
|---|---|---|---|
| G1 | Should the Trust ask the family for a list of the deceased's living relatives, and if so may it appear on the public page — by name, by relation only, to members only, or not at all? And may it be used for anything else? | **Panel's** — what the Trust **discloses** about living people (children among them) and a **purpose** for holding their names (`-398` MA2's open ground). ⚠ `-391` item 2 (Q2 A) covers names inside the family's **words**, ⛔ not a list the Trust **asks for**; `-205` cl.2 (each public `(surface, field)` pair needs its OWN authority — `matrix.ts` :514) means a kinship field cannot ride on `-391` item 2 even if the content overlaps | **PQ1** |
| G2 | A living relative named on the list asks the Trust to take their own name off | **Panel's** — what the Trust **owes** a named person who is ⛔ not the nominee. Two texts already reach it and the note QUOTES both ([[feedback_panel_gate_read_ratified_verbatim]]): `-395` item 3 (author-commit, shown to the Panel as T1) — *"a request from anyone else in the family is ⛔ not a take-down request; the operator may still talk with them (M4) and suggest the nominee calls"*; `11b.4a PQ1 A` (`-411`, Trustee-ratified), as put — *"**Only the nominee who sent it**, as built. If that nominee has died or been replaced, ⛔ no one can have it taken down. The Trust can still withdraw its own approval on its four grounds."* ⇒ PQ2 A = that rule applied to one name (**match**); B **widens** it to the named person for their own entry; neither text addressed a person asking about their own name only | **PQ2** |
| G3 | The four grounds for leaving something out, and "a left-out part leaves no trace on the public page", applied to the list | **Panel's to confirm** — `-391` item 7 (Confirm 2 A): *"The four reasons in Q4 A, and ⛔ no others, are the only grounds on which a family's words or photo may be left out or declined"*; `-411` item 3 (11b.4a PC1 B) rules the no-marker join for the **words**. Extending either to a list is a **reading**, and a reading of what a family is told ⇒ put as a confirm. ⚠ **PQ2 B would be a fifth ground** (removal at the named person's request) — `-412` §3.2 already refused `family_asked` as *"a fifth ground against `-391` item 7"* ⇒ PC1 and PQ2 B are worded together | **PC1** (+ PQ2 B's cost) |
| G4 | How long the list is kept | ⚠ Panel-adjacent but **already ruled by consequence**: `-391` Q5 A (*"Kept with the member's record; erased with it"*) + `-423` Q1 (a) A (Trustee-ratified 2026-10-30: *"Never erased once a death is reported"*; except a report closed as false, Q1 (b)) ⇒ **indefinitely** — unless counsel finds otherwise (`-423` does ⛔ not cover *"the retention PERIOD and the legal basis"*; its Consequence 3 brings Q1 (a) back to the Panel if counsel finds a right to erase) or the family uses the erasure route `-391` Q5 A promises (*"⛔ not built yet"*). ⛔ Not a new question — stated as a **cost on EVERY PQ1 option (A, B, C)** | PQ1 cost line |
| G5 | Relation vocabulary, entry shape, storage, omission mechanics, screens, the component's markup, the draft, the wire | **Ours** — how, ⛔ not what is disclosed or owed | KL2–KL12 |
| G6 | The epic's *"respectful structural diagram"* vs the UX's *"two-column key-value list (NOT a family-tree diagram)"* | **Ours** — a presentation choice; both forbid a social graph (11a.3's invariant) | KL2 |
| G7 | The UX's other homes for the lattice (admin Phase 1, the claim-intake nominee view, the live-pool `<ActiveContributionCard>` — UX :1969, :2026) | **Ours to decline** — each would read family-owned data outside the places v4 names (the public page and — 11b-5c — the member app's drive screen); ⛔ not built, recorded | Out of scope |
| G8 | The permission text the nominee agrees to at Send must mention the list | **Ours** to write (a new version — the registry rule), BigDev's copy; the RULE that the family is told exactly where it appears is `-391` item 2's and is ⛔ not moved | KL7 |
| G9 | Whether the list is kept OFF the members' drive view (`11b-17`'s surface), as the family's words are | **Panel's to confirm** — the field-floor test (`member-drive-detail-field-floor.test.ts:80-91`) pins EVERY exclusion's cite to `-411` item 7 (`toContain('2026-10-27-411 item 7')` at :284), so a fourth exclusion needs that assertion changed; the three memorial exclusions cite `-195` cl.1 + `-411` item 7 (11b.4a PC5 A), and PC5 A as put reads *"The rule does ⛔ not reach the family's **words**"* — a list is ⛔ not the words ⇒ ⛔ no text we wrote may stand in for it | **PC2** — ⚠ ⛔ not answered as put; the `-428` rider (members also see the memorial) governs ⇒ 11b-5c |
| G10 | Which relations may be listed (KL3's six groups, fourteen codes — e.g. grandchildren in, uncles out) | Codes and labels are **ours** (G5), but the SET decides whose names reach a public page ⇒ the six relation groups (fourteen codes) are written INTO PQ1 A's option text so the ruling covers them | PQ1 A text |

⇒ ⭐ **One routing note, written at Task 0.3 from the template, AFTER BigDev answers KL1–KL14** (the options' costs depend on
them). The agent ⛔ never sends it — BigDev does. Until BigDev confirms it went, every record says *"prepared for relay — ⛔ not
yet sent"* ([[feedback_shown_to_panel_means_sent]]).

### A2 — The Panel questions as planned (Task 0.3) — HISTORICAL: put to the Panel, RULED as `-426` (addendum) and `-428` (v2 of the main note); the RULED block at the top binds

⚠ The clause ids below are for US. The note's meeting part (question, one fact, options, costs) carries ⛔ no clause ids — the
template puts *"the clause each option touches"* in the EVIDENCE section (E1/E2) ⇒ Task 0.3 strips them.

**PQ1 — Should the Trust ask families for a list of the relatives the member leaves behind, and where may it appear?**
*The one fact that decides it:* the family can **already** name every person such a list would hold, inside its own words, and you
ruled in October that living adults named there *"appear as written"* and children are left out (`-391` Q2 A). ⇒ A list discloses
nothing of a new kind — but the Trust would be **asking** for names (a row marked *पुत्र* invites a child's name), and it would **hold
them as a list**, kept as long as the member's record — which, after a reported death, is ⛔ not erased (`-423` Q1 (a); except a
report closed as false, Q1 (b)).

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** ⭐ | A list on the public memorial page **only** (⛔ not on the members' drive view — as you ruled for the words): relation and name, **adults only**, from these relations of the member who died: spouse, children, parents, siblings, grandchildren (a son's and a daughter's children, named apart), children-in-law (KL3 as answered at Task 0.2); the family is asked ⛔ not to list children; the reviewer leaves out any entry naming a child; used for **nothing else** | A family may show, as an obituary does, *पत्नी · सुनीता देवी, पुत्र · अमित, राहुल* | The Trust asks for names of living people who have ⛔ not themselves agreed (only the nominee does); grandchildren — and the children of a member who died young — are offered by name and many will be children: the family is asked to leave them out and the reviewer cannot age them, so a child's name the reviewer does ⛔ not recognise stays up until someone tells the Trust, and then the Trust can only take the **whole** memorial down until a one-name removal is built (`-398` MA16); kept indefinitely, unless counsel finds otherwise or the family uses the erasure route promised in October (⛔ not built yet); counsel ⛔ not asked |
| **B** | A list of **relations only**, ⛔ no names (*"wife, two sons, one daughter"*), children included; used for nothing else | The family's shape is shown without anyone's name | Less of what families expect of a शोक संदेश; a small village can still tell who is meant; the family may still name people in its words; kept indefinitely (as A) |
| **C** | Relation and name, adults only — but shown **only to members** signed in, ⛔ not on the public page | Members see it; the open page does ⛔ not | A new member-only place for family-owned data; the family's permission would have to name it (you ruled that "members see more than the public" does ⛔ not reach the family's words — so nothing requires this, and nothing forbids it); more to build; members are thousands of people, ⛔ not a closed circle; kept indefinitely (as A) |
| **D** | ⛔ No list. The family names whom it wishes in its words, as today | Nothing changes | The design's family line is dropped; the epic's third component is ⛔ never built |

*Our reading:* **A** — it is the same people, the same review and the same page you already ruled for the words, with the child
protection made firmer (a list can say "adults only" where free writing cannot), and the purpose stated in the ruling itself.

**PQ2 — A relative named on the list asks the Trust to take their own name off.** Today a request from anyone in the family other
than the nominee is ⛔ not a take-down request — the operator suggests the nominee calls (`-395` item 3); only the nominee who sent it
can have the memorial taken down, and if that nominee has died or been replaced, ⛔ no one can (`-411` PQ1 A, as put). Neither rule
was written for a person asking about their own name only.

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | Only through the nominee: the relative asks the nominee, who sends a new version without them | Nothing — today's rule, applied to one name | A relative estranged from the nominee has ⛔ no route; their name stays up; if the nominee has died or been replaced, ⛔ no one can; over a clean approval the re-send means the memorial comes down first and stays off the page while the new version is reviewed; counsel has ⛔ not been asked whether a named person has a legal right to have their own name removed — if so, A must change |
| **B** ⭐ | The relative may call the helpline, and the Trust removes **that one name** (⛔ not the memorial), leaving no trace | A named adult can remove their own name by phone | **A ground for leaving part of the family's memorial out beyond the four you set** (Confirm 2) — B makes an exception to that rule for a person's own name; the operator cannot prove the caller is that person (a family quarrel can play out through the helpline); the removal binds only the version shown — a later version naming them again needs the reviewer told; a new helpline act to build (KL14) |
| **C** | As B, but the Trust first calls the nominee back and removes the name only if the nominee agrees | As B, if the nominee agrees | The nominee can keep a relative's name up against their wish; the same fifth-ground exception as B; counsel ⛔ not asked (as A) |

*Our reading:* **B** — a person's own name on an open page is theirs to withdraw; the list's one-name-per-entry makes it a small, exact fix.

**PC1 (confirm) — the four reasons, and no trace, apply to the list.** We will leave out an entry only for one of the four reasons
you set for the words and photo (*attacks someone named · accuses someone of wrongdoing · against the law · names a child*) — and,
if you choose PQ2 B or C, at the named person's own request — tell the family which and why in the app, and show ⛔ no mark on the
public page where an entry was left out — as you ruled for the words. *Cost:* a listed relative left out leaves no mark; the page
shows a shorter family than the family sent. **A** confirm · **B** something else.

**PC2 (confirm) — if you choose A or B above, the list stays off the members' drive view, as the family's words do.** You ruled that
"members see more than the public" does ⛔ not reach the family's words; we read the same for the list, which the family's permission
names for the public page only. *Cost:* a signed-in member sees less of the memorial than the open page shows — the reverse of your
rule for the drive's own information. **A** confirm · **B** something else. (Folded into PQ1 A's text; asked separately so a ruling
of A cannot be read without it. Under PQ1 C it is moot.)

⚠ *How much to trust the plan (carry into the note's own section):* **(1)** in October we told you, as **our decision and ⛔ not a
question**, that relatives would ⛔ not be collected *"until this question [Q2] is answered"*. You answered Q2; we then left kinship
to plan and, on our own ground (⛔ no names held for a purpose not yet ruled), held it back through three stories without telling you.
It now comes to you as a question because the list asks for names of living people, children among them, and a purpose — what the
Trust discloses and owes them is yours, ⛔ not ours (`-420` MV2's cost: *"the Panel … has ⛔ not been told of these hops"*). The note
must say so plainly. **(2)** The Story 0.9 assumption `A-memorial-relations-private` reads in full: *"Family wants kinship
relationships to be optional + private by default; not all families want extended family relationships publicly listed."* —
**un-interviewed**; "private by default" leans toward C; the list is optional under every option.

### A3 — Task 0.4's original outcome branches (superseded by the outcome)

When BigDev relays the ruling: transcribe it (AC0 (3)); then by outcome — **(a) PQ1 A** → Task 1; **(b) PQ1 B / C** →
    revise KL4 / KL10 and the ACs (story version bump, a validate pass) before Task 1; **(c) PQ2 B** and KL14 (a) → mint row
    `11b-5b-kinship-named-relative-removal: backlog` with its comment block (including the re-send-revives-the-name design point);
    **PQ2 C** → as (c), the nominee callback in its scope; **PQ2 A** → record, ⛔ no row, and v4's take-down sentence stays as v3's;
    **(d) PQ1 D** → AC1's records, then close; **PQ1 C** makes PC2 moot (record it so); **PC1 B or PC2 B** → revise KL6 / KL10 (and the floor exclusion) before Task 1.
    **The addendum (guardian declaration) — ✅ RULED 2026-10-31 as `-426` (AQ1 A, AQ2 A, AQ3 A, (b)1); apply these branches in the same
    pass as the main note's ruling:** **AQ1 A** → revise KL4 (children by name under the
    declaration), KL7 (v4 carries the declaration — Q-copy-3 ③ rewritten), copy 2.4A ships (2.4B dropped; the reverse under AQ1 B), AC2 / AC5 / AC7, and the reviewer's
    `identifies_a_child` use for the list (only an undeclared child); **AQ2 A** → the same for the words — a change to the 11b.4 review
    flow and permission (supersedes `-391` item 2's child half in part), possibly its own row; **AQ3 A** → the photo too, and KL15
    (the *"in the photo"* tick) is built — shown publicly only under **(b)2**; **any A** → an architecture amendment to :1839-1846
    (*"Sahyog Vivran shows family without minor's name"*) after the ruling, and the counsel question on DPDPA §9 recorded as owed;
    **AQ1 B / C** → the main note's PQ1 answer stands (C: children as a count). Story version bump and a validate pass before Task 1.

### A4 — KL10's PQ1 C alternative (⛔ not chosen)

⚠ (Plan text — PQ1 C was ⛔ not chosen; `-428` chose A with the member-app rider, built by 11b-5c.) Under **PQ1 C** (members only): ⛔ no public row; the list renders on the member's drive detail (`11b-17`'s surface) at
`authenticated_member` — a re-plan at Task 0.4. `-411` item 7 (PC5 A) ruled that "members see more than the public" does ⛔ not reach
the family's words — it neither requires nor forbids a member-only place; the family's permission would have to name it (11b.4a
note :188-189: the memorial is off the member app *"because the family's permission names only the public page"*).


## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (`claude-opus-5-5`), `bmad-dev-story`, worktree `.claude/worktrees/11b-5a-kinship-capture-and-lattice`, 2026-10-31.

### Debug Log References

- Task 0.1 STOP re-run before Task 2 (2026-10-31): STOP 1 ⛔ change under any listed path (`origin/main` = `beae5116`, the branch's base);
  STOP 2 satisfied (6.38 landed — its `death_reported` branch is in `rtbf-legality.ts`); STOP 3 `11b-6` `backlog` on all 350 refs read;
  STOP 6 the `-173` clause still has ⛔ pinned row. ⇒ ⛔ stop.
- Migration number RE-TAKEN at Task 3.1: Story 12-1's branch had COMMITTED `0193_marketplace-modules` (`when` 1796269200038) ⇒ this story
  takes **`0194_memorial-kinship`**, journal idx 194, `when` **1796355600039** (later than 12-1's). ⚠ For 12-1: if 11b.5a lands first, a
  DB that applied 0194 will SKIP 12-1's 0193 (earlier `when`) — [[project_sibling_migration_when_order_shared_db]]; whichever lands second
  must check. Applied to this story's own container (`twt-11b5a-pg`, :5481, DB `twt_dev`); re-run by hand with `psql -f` = idempotent.
- The session broke once mid-Task 4 (Docker Desktop went down with it); the container was restarted, ⛔ nothing was lost.
- ⚠ The Write tool landed `\u` escapes as RAW invisibles in two test files ([[project_unicode_escapes_written_raw]]); found by a scan of
  every changed file and converted back to escapes before commit (`kinship.spec.ts`, `memorial-kinship.test.ts`); ⛔ none in source.
- Named mutants (Task 9) — each planted, the named test run, then `git checkout` (byte-identical; tree clean after each): (1) `kinship`
  dropped from `sendContent` · (2) the helper rendering a left-out entry · (3) an index out of range accepted · (4) an unknown relation
  accepted · (5) a wire key leak (row `.passthrough()`) · (6) the guard accepting an unknown row key · (7) per-name bidi isolation
  removed — API (live spec) AND the mobile preview · (8) an `action_shape` check ignoring kinship · (9) `family` losing its focus
  re-read (the T6 pin) · (10) `data-field` missing · (11) a memorial id dropped from the declared gaps · (12) a reference outside AC10's
  allow-list (`claim/index.ts`) · (13) `inPhoto` reaching the public wire · (14) copy 4.3 not shown under the declaration · (15) the
  banner keyed on the version string · (16) ticks kept after the photo changes · (17) a read schema without `inPhoto`. ⇒ **all 17 RED.**
- **`pnpm ci:local` (AC13) — four runs, ⛔ yet a 36 / 36 on one run** (`DATABASE_URL` = this story's own container :5481, DB `twt_dev`;
  the host's load average ~22–25 throughout — peer sessions' vitest runs):
  · **Run 1** (tip `b61e2b37`, fresh DB): **35 / 36** — `integration-tests` GREEN; `lint` RED: a `\x00` placeholder in the AC10 pin's glob
    helper (`no-control-regex`) and an unused destructure in `public-pages-sahyog-vivran.test.ts` — both MINE, fixed in `50b7a2b6`;
    `pnpm turbo run lint --force` then 20 / 20.
  · **Run 2** (tip `50b7a2b6`, the same DB): **35 / 36** — `lint` GREEN; `integration-tests` RED: `state-trustee-cycle-freeze.spec.ts`
    and `import-workplaces.spec.ts` (timeouts — both GREEN in isolation) and `announcement-activity-read.spec.ts` (deterministic on that DB:
    it lists the latest two cycles of the FIXED `PARIWAR_A`, and run 1's own-committing specs crowded its seeded cycles out —
    [[project_known_livedb_test_failures]]'s accumulation class; ⛔ memorial code touched).
  · **Run 3** (tip `50b7a2b6`, container RECREATED fresh): **35 / 36** — `integration-tests` RED on 20 s timeouts / vitest-worker
    timeouts in 5 api files (`memorial/races`, `memorial/review-memorial`, `claims/nominee-bank`, `member-moderation/moderation-escalation`,
    `payment/nominee-accounts`) — all five GREEN in isolation (65 / 65).
  · **Run 4** (tip `50b7a2b6`, container recreated fresh): **35 / 36** — ONE test: `import-workplaces.spec.ts` "a header-only file exits 1"
    (a spawned CLI, 30 s timeout) — GREEN in isolation in run 2's check.
  ⇒ every job has been GREEN in at least one run on this code; ⛔ single run is 36 / 36. ⚠ **A clean 36 / 36 is OWED before `review` →
  `done`** (AC13) — on a quieter host; ⛔ claimed here.

### Completion Notes List
- 2026-10-30 — Story created by `bmad-create-story 11b.5a` at `01062c51`: comprehensive developer guide; build gated on the Panel (Task 0).
- 2026-10-31 — Validated against the checklist (v1.1); every finding applied. Next: Task 0.1, then BigDev's answers at Task 0.2.
- 2026-10-31 — Task 0.2 in part (v1.2): KL1–KL14 answered; Q-copy-1 wording, Q-copy-2…5 and Questions 7–8 still open.
- 2026-10-31 — v1.4: Q-copy-1 answered; the routing note SENT by BigDev. Next: Task 0.4 on the ruling; Q-copy-2…5 and Questions 7–8 still open.
- 2026-10-31 — v1.6–v1.11: the guardian-declaration addendum drafted, sent, RULED (`-426`); the main note revised to v2 at the Panel's direction.
- 2026-10-31 — v2.0: the main note v2 RULED (`-428`); Task 0.4 done; scope split to rows 11b-5b / 11b-5c (BigDev).
- 2026-10-31 — v2.1–v2.2: all copy approved (v4 ① Hindi is BigDev's); KL15 / KL16 answered ⇒ Task 0.2 done.
- 2026-10-31 — v2.3: validated (three verifiers, then a fix-diff review whose 20 corrections are applied); all findings applied; follow-up confirms R1–R3 drafted for the Panel; ④ / 4.3 / 4.4 copy re-approval owed. Next: Task 1.
- 2026-10-31 — **Tasks 2–9 implemented (`bmad-dev-story`)** — commits `9c695ef1` (Tasks 2–3), `a3e1240c` (4), `51f65a0d` (5),
  `8d33cecc` (6), `3c97d091` (7), `b61e2b37` (8). What was ACTUALLY built and tested:
  - **Contracts / domain:** `MEMORIAL_KINSHIP_RELATIONS` (fourteen, KL3 order, domain + contracts lockstep test); `kinship.ts` — THE list
    schema (`.strict()`, `inPhoto: z.literal(true).optional()`, `[]` refused, 1–200 code points, ≤ 20) used at Send AND on every read; the
    ONE grouping helper (drops `inPhoto`; a left-out entry leaves no trace — interleaved-input leg); label keys (English plurals, copy 5.2).
    `validateMemorialDecision`: `kinship_without_list` / `kinship_index_out_of_range` / `kinship_order`; ALL THREE `action_shape` checks count
    `kinshipLeftOut`. Permission **v4** minted (Q-copy-3 as approved, ④ as re-approved; `carriesGuardianDeclaration`, v1–v3 `false`) —
    v4 is pinned as "v3 with exactly the five marked sentences changed" in both locales; v3 now refused `authorisation_outdated`.
  - **Migration 0194** (number re-taken — see the Debug Log): `kinship_ciphertext` (+ scrub-only UPDATE grant, ⛔ CHECK),
    `kinship_omissions` + `memorial_kinship_omissions_valid` CHECK, `omissions_iff_action` replaced (VALID). The RLS spec: `SCRUBBABLE`,
    fourteen named CHECKs, legs (q2) / (r2) / (s3), scrub legs (v) / (w) over a row with a list (NULL stays NULL) — **live**, 69 legs.
  - **AC9 legality, from 6.38's code (⛔ "erased with the record" unqualified):** `anonymizeMember` sentinels `kinship_ciphertext`
    (CASE-NULL). As built, `resolveRtbfLegality` refuses erasure with `death_reported` once a claim is filed for the member's death, and a
    memorial exists only after a death claim ⇒ the line runs only for a member whose every claim was released by an innocence finding
    (`-423` Q1 (b)) or for a row older than Story 6.38 (`anonymize.ts`'s own 6.38 note: "defence in depth — dead code"). Recorded in the
    code comment beside the line.
  - **API:** Send parses part `kinship` (refusals `memorial.kinship_invalid` before anything is written, incl. a tick with no photo and
    `[]`), encrypts before the lock, audit `has_kinship` only; member view (`kinship` as SENT, `kinshipLeftOut`, `guardianDeclaration`; a
    list decrypt/parse failure ⇒ `unavailable`, `canSend: false`); review detail (`kinship` with ticks, `decision.kinshipLeftOut`,
    `guardianDeclaration` from the registry flag); decide validates against the decrypted length, audit `kinship_left_out`; public read —
    a sentinel / bad envelope / unparsable / schema-failing list drops the WHOLE memorial (four live legs), grouped by the helper and
    each name isolated (`publicMemorialKinship`); take-down `shown.kinship` from the same function, a sentinel list ⇒ `not_found`.
    New live spec `apps/api/tests/integration/memorial/kinship.spec.ts` (22 legs, incl. AC7's interleaved byte-identity at the WIRE —
    `son, wife, son-left-out` vs `wife, son` give equal rows — and the RLO-in-one-name leg).
  - **Mobile:** `family.tsx` between photo and preview (starts empty; fourteen relations as inline radio options; one person per row;
    ≤ 20; an unfinished row blocks Next with 2.11; copy 2.4A under the body; the "In the photo" tick only when a photo is sent; "Start
    from the list I sent" on a re-send, ticks only with the previous photo kept); `photo.tsx` — both pushes → `family`, any photo change
    clears every tick; the draft's `sendContent` carries `JSON.stringify(kinship ?? [])` (R6 leg: an edit to the list ALONE mints a new
    key); FormData part only when non-empty, ticks stripped with no photo (ONE function — what the preview draws is what the Send
    carries); preview draws the grouped rows (names isolated) + *"Change the family list"* + *"No family list"*; outcome lines per
    left-out entry; copy 4.3 under the declaration. Copy (en + hi) for Q-copy-2, 4.1, 4.3, 5.1, 5.2 and the 24 label keys.
  - **Admin:** the list under the words, ticked people beside the photo, a per-entry "Leave this one out" + reason (the photo's model),
    pre-check + payload (indexes and reasons only), history lines; KL16 banner + v4 child label + R3 A guidance on EVERY reason select
    (decision and withdraw-approval), keyed on `guardianDeclaration` (a synthetic later version with the flag shows it; a v4 id without it
    does not); the KL15 confirm (a second press, ⛔ a refusal); English labels pinned equal to `memorial.json` en; take-down lists the rows.
  - **Public:** `KinshipLattice.astro` (`<h3>` + `<dl data-field aria-labelledby>`, `<dd dir="auto">`, spacing tokens inside it);
    `planFamilyMemorial` gains the kinship verdict (a fourth `visibilityOf`); guard demands exactly `kinship,photo,words` and exact row keys;
    labels from the `memorial` namespace (⛔ copy in `sahyog-vivran`). Matrix row `family_memorial_kinship` + the ruled pair under
    `2026-10-31-428 item 1` (nine → ten). Floor test: the four memorial ids are DECLARED GAPS owed by row 11b-5c (`declaredGaps` 3 → 7,
    `DATA_CLASS_EXCLUDED` emptied, its test rewritten to cite `-428`). Built-server render spec + 3 lattice legs (after the words, the
    `<dl>`, the plural, nothing in `<head>`, `[]` ⇒ ⛔ heading, a leaked tick ⇒ outage).
  - **Fences:** the AC10 pin (`packages/domain/tests/memorial/kinship-purpose-pin.test.ts`, allow-list from the pasted grep, planted RED);
    `SCAN_FILES` += `KinshipLattice.astro`; `microcopy.yaml` `code_globs` += `family.tsx`, `memorial-kinship.ts`; friction disposition.
  - ✅ **A gate's scope was narrowed — CONFIRMED by BigDev 2026-10-31 (*"agreed"*, on the recommendation to keep the exception):** the 11b.4 R16 scans (`scripts/microcopy/memorial.test.ts` — "no
    memorial Button offers a take-down", by key name and by value) flagged the APPROVED copy 2.13–2.15 (*"Remove"* / *"हटाएँ"*, *"Remove
    {name} from the list"*) — the control that removes one line from the family's own UNSENT list. Added ONE named exception: exactly
    `family.remove`, `family.remove_a11y`, `family.remove_empty_a11y`, and (for the value scan) only inside `family.tsx`, with legs proving
    those keys ARE flagged and that a fourth "remove" key or the same key elsewhere still fails. Re-wording the copy was declined (the
    plain word for the family; the button cannot touch anything published). ⚠ Carried to the device / TalkBack pass (still owed): check a
    family reads "Remove" as "this line", ⛔ "the memorial" — if anyone hesitates, re-word then.
  - **Un-attested (carried, ⛔ closed — AC12):** device / TalkBack / VoiceOver passes of `family.tsx`, real-browser pass of the lattice,
    Story 0.9, the non-author Hindi review of the KL3 labels, the family-screen copy and v4 (`hiReviewed: false` — Row 41 (a) / (s));
    `MEMORIAL_AUTHORSHIP_ENABLED` stays off; ⛔ no Row 41 criterion marked MET; v4 is ⛔ never live unless rows 11b-5b and 11b-5c are `done`.
  - ⚠ **AC13 not met yet:** four `ci:local` runs, each 35 / 36 with a different load-class red (Debug Log) — a clean 36 / 36 on one run
    is owed before `done`.
  - **Not done here (by design):** the Task 1.2 (iii) DISCHARGED annotations — owed when this row is `done` ON MAIN; the take-down screen
    shows singular English labels (operator chrome; the page uses the plurals) — recorded, ⛔ changed.
- 2026-11-01 — Code review (`bmad-code-review 11b.5a`) and its fix-round review: 20 + 7 patches applied (uncommitted), deferrals RD1–RD17 in `deferred-work.md`. **New staff-facing admin strings for BigDev's next copy pass:** `memorial.detail.partUnavailable` ("Part of this version could not be read right now.") and `memorial.detail.partUnavailableForm` ("Part of this version could not be read right now, so it cannot be decided yet.") in `apps/admin/src/modules/memorial-review/i18n-en.ts`. Task 9 (a clean `ci:local` 36 / 36 on the committed tree) stays OPEN; the live-DB legs added by the review are unexecuted.

### File List

Code commits `9c695ef1`…`b61e2b37` (Tasks 2–8) + `50b7a2b6` (the `ci:local` lint fix — two of the test files below); governance and records before them are listed in their own commits:

- UPDATE `apps/admin/src/modules/memorial-review/MemorialReviewPage.tsx`
- UPDATE `apps/admin/src/modules/memorial-review/i18n-en.ts`
- UPDATE `apps/admin/src/modules/memorial-takedown/MemorialTakedownPage.tsx`
- UPDATE `apps/admin/src/modules/memorial-takedown/i18n-en.ts`
- UPDATE `apps/admin/tests/memorial-review.test.tsx`
- UPDATE `apps/admin/tests/memorial-takedown-route.test.tsx`
- UPDATE `apps/admin/tests/memorial-takedown.test.tsx`
- UPDATE `apps/api/src/modules/memorial-review/handlers.ts`
- UPDATE `apps/api/src/modules/memorial-takedown/handlers.ts`
- UPDATE `apps/api/src/modules/memorial/handlers.ts`
- NEW `apps/api/src/modules/memorial/memorial-kinship.ts`
- UPDATE `apps/api/src/modules/public-pages/memorial-public-read.ts`
- UPDATE `apps/api/src/modules/public-pages/memorial-public-text.ts`
- UPDATE `apps/api/tests/integration/memorial-takedown/takedown.spec.ts`
- NEW `apps/api/tests/integration/memorial/kinship.spec.ts`
- UPDATE `apps/api/tests/integration/memorial/review-memorial.spec.ts`
- UPDATE `apps/api/tests/unit/memorial-public-read.test.ts`
- NEW `apps/mobile/app/(memorial)/family.tsx`
- UPDATE `apps/mobile/app/(memorial)/outcome.tsx`
- UPDATE `apps/mobile/app/(memorial)/photo.tsx`
- UPDATE `apps/mobile/app/(memorial)/preview.tsx`
- UPDATE `apps/mobile/components/memorial-authorship/MemorialText.tsx`
- UPDATE `apps/mobile/components/memorial-authorship/memorial-copy.ts`
- NEW `apps/mobile/components/memorial-authorship/memorial-kinship.ts`
- UPDATE `apps/mobile/lib/memorial-draft.ts`
- UPDATE `apps/mobile/lib/use-memorial-send.ts`
- UPDATE `apps/mobile/tests/unit/memorial-draft.test.ts`
- UPDATE `apps/mobile/tests/unit/memorial-screens-render.test.ts`
- UPDATE `apps/mobile/tests/unit/memorial-source-pins.test.ts`
- UPDATE `apps/public/src/components/FamilyMemorial.astro`
- NEW `apps/public/src/components/KinshipLattice.astro`
- UPDATE `apps/public/src/lib/family-memorial.ts`
- UPDATE `apps/public/src/lib/sahyog-vivran-render.ts`
- UPDATE `apps/public/src/lib/sahyog-vivran.server.ts`
- UPDATE `apps/public/src/lib/surface-fields.ts`
- UPDATE `apps/public/src/pages/sahyog-vivran/[driveToken].astro`
- UPDATE `apps/public/tests/family-memorial-gating.test.ts`
- UPDATE `apps/public/tests/family-memorial-source.test.ts`
- UPDATE `apps/public/tests/integration/public-pages/family-memorial-render.spec.ts`
- UPDATE `apps/public/tests/integration/public-pages/scrape-test.spec.ts`
- NEW `apps/public/tests/kinship-lattice-source.test.ts`
- UPDATE `apps/public/tests/member-drive-detail-field-floor.test.ts`
- UPDATE `apps/public/tests/sahyog-vivran-client.test.ts`
- UPDATE `apps/public/tests/sahyog-vivran-render.test.ts`
- UPDATE `friction-budget.md`
- UPDATE `microcopy.yaml`
- UPDATE `openapi/v1.yaml`
- UPDATE `packages/contracts/public-pages/public-vs-private-matrix.yaml`
- UPDATE `packages/contracts/src/memorial/dto.ts`
- UPDATE `packages/contracts/src/memorial/index.ts`
- NEW `packages/contracts/src/memorial/kinship.ts`
- UPDATE `packages/contracts/src/memorial/omissions.ts`
- UPDATE `packages/contracts/src/memorial/takedown.ts`
- UPDATE `packages/contracts/src/memorial/text-classes.ts`
- UPDATE `packages/contracts/src/memorial/vocab.ts`
- UPDATE `packages/contracts/src/public-pages/matrix.ts`
- UPDATE `packages/contracts/src/public-pages/sahyog-vivran.ts`
- NEW `packages/contracts/tests/memorial-kinship.test.ts`
- UPDATE `packages/contracts/tests/memorial-text-classes.test.ts`
- UPDATE `packages/contracts/tests/memorial.test.ts`
- UPDATE `packages/contracts/tests/public-pages-sahyog-vivran.test.ts`
- UPDATE `packages/contracts/tests/public-pages.test.ts`
- NEW `packages/domain/migrations/0194_memorial-kinship.sql`
- UPDATE `packages/domain/migrations/meta/_journal.json`
- UPDATE `packages/domain/src/member/anonymize.ts`
- UPDATE `packages/domain/src/memorial/authorisation-copy.ts`
- UPDATE `packages/domain/src/memorial/public-read.ts`
- UPDATE `packages/domain/src/memorial/vocab.ts`
- UPDATE `packages/domain/src/schema/memorial_review_decisions.ts`
- UPDATE `packages/domain/src/schema/memorial_submissions.ts`
- UPDATE `packages/domain/tests/integration/rls/memorial-policy-regression.spec.ts`
- UPDATE `packages/domain/tests/member/rtbf-anonymize.test.ts`
- NEW `packages/domain/tests/memorial/kinship-purpose-pin.test.ts`
- UPDATE `packages/domain/tests/memorial/memorial-status.test.ts`
- UPDATE `packages/i18n/locales/en/memorial.json`
- UPDATE `packages/i18n/locales/hi/memorial.json`
- UPDATE `scripts/microcopy/memorial.test.ts`
- UPDATE `scripts/sahyog-vivran-financial-truth/check.ts`
- UPDATE `apps/mobile/components/memorial-authorship/useMemorialAnnounce.ts` (code review 2026-11-01, RP2 — the per-row over-limit announcer)
- UPDATE `packages/domain/src/memorial/errors.ts` (code review 2026-11-01, RP13 — `memorial.kinship_invalid`)
- UPDATE `packages/domain/src/schema/index.ts` (code review 2026-11-01, RP16 — a stale column count in a comment)
- NEW `apps/api/tests/unit/memorial-error-codes.test.ts` (code review 2026-11-01, RP24)
- UPDATE `_bmad-output/implementation-artifacts/11b-5a-kinship-capture-and-lattice.md` (this file — the permitted sections)
- UPDATE `_bmad-output/implementation-artifacts/sprint-status.yaml` (row → `review`; ledger)

## Change Log (rows newest first, below the SHA maps)

**SHA map 2 — the 2026-10-31 rebase onto `beae5116` (Story 6.38 landed)** (every SHA written before this map — in the story, the ledger and the routing notes' status lines — is the OLD one; read it through this table):

| Old | New | Commit |
|---|---|---|
| `a27febe0` | `6c04fb78` | story(11b.5a): created and validated — kinship capture, review and the |
| `6f22bd4d` | `014bd52c` | governance(11b.5a): routing note — kinship: may the Trust ask for the  |
| `5f28d24e` | `cc5abb9a` | records(11b.5a): Task 0.2 build answers (KL3 fourteen codes, KL4 200-c |
| `130943af` | `d1af5acb` | governance(11b.5a): routing note ADDENDUM — may a family name and show |
| `1c582ad7` | `8454f1c1` | records(11b.5a): routing note SENT; Q-copy-1 answered; Q-copy-2..5 dra |
| `b0f1a675` | `9e92d1f8` | records(11b.5a): rebased onto origin/main b2f36fe9 — SHA map in the st |
| `16dc6911` | `49649186` | governance: 2026-10-31-426 TRUSTEE-RATIFIED (DR + KB) — a family may n |
| `04c17a0c` | `91d4b3f7` | governance(11b.5a): routing note REVISED to version 2 at the Panel's d |
| `ec7e5eb9` | `92810cab` | records(11b.5a): -426 recorded — dated pointer under -391; story v1.11 |
| `1bdd8cd0` | `93e8a9f9` | governance: 2026-10-31-428 TRUSTEE-RATIFIED (DR + KB) — the family lis |
| `2330a941` | `e988396c` | records(11b.5a): -428 recorded — pointers under -391 / -398 / -411 / - |
| `9006d0ce` | `b4b501cf` | records(11b.5a): Task 0.2 done — all copy approved (v4 sentence 1 Hind |
| `3981fd0b` | `bdc24e92` | governance(11b.5a): routing note — three confirms on the family-list r |
| `691020b1` | `032a2652` | records(11b.5a): second validation applied — story v2.3 (33 findings + |
| `0e642974` | `2d63bda9` | records(11b.5a): copy re-approved — v4 sentence 4's child ground narro |
| `1c68adc4` | `d971c015` | governance: 2026-10-31-431 AUTHOR-COMMIT (BigDev) — Story 11b.5a's bui |
| `13f8dbff` | `fddd2fc2` | records(11b.5a): Task 1.2 — rows 11b-5b / 11b-5c minted, launch-gate R |


**SHA map — the 2026-10-31 rebase onto `b2f36fe9`** (rows below written before it cite the OLD SHAs):

| Old | New | Commit |
|---|---|---|
| `dbbafd59` | `a27febe0` | story created + validated (ledger -30s / -30t) |
| `9efa0c06` | `6f22bd4d` | governance: the routing note, ALONE |
| `bc6edbad` | `5f28d24e` | records: Task 0.2 / 0.1 / 0.3 (ledger -31f → RELABELLED -31n) |
| `f8e0455d` | `130943af` | governance: the addendum, ALONE |
| `45ae84e1` | `1c582ad7` | records: note SENT, copy table, KL15 (ledger -31m) |

| Date | Version | Change |
|---|---|---|
| 2026-11-01 | v2.12 | **Fix-round review** (`bmad-code-review 11b.5a`, option 2; 3 / 3 layers): 35 raw → 24 distinct → DN1 deferred by BigDev (RD17), 7 patch (RP21–RP27), 6 defer (RD12–RD17), 11 dismissed; the Auditor judged 16 of the 20 round-one patches RESOLVED, 3 PARTIAL (RP5, RP14, RP20), 1 NOT TESTED (RP13). BigDev: apply every patch — RP21–RP27 applied in the working tree (uncommitted, ungated). Status stays `review`. |
| 2026-11-01 | v2.11 | **Code review** (`bmad-code-review 11b.5a`, three chunks × three layers, 9 / 9 completed): 96 raw → 51 distinct → 0 decision-needed, 20 patch, 11 defer, 20 dismissed; no Panel question. BigDev: apply every patch — all 20 applied in the working tree (uncommitted, ungated); RP3 landed with one new admin string; deferrals RD1–RD11 in `deferred-work.md`. `origin/main` is now `3d6b46c5` (Story 12.1 landed, `0193`) — rebase owed. Task 9 still OPEN. Status stays `review`. |
| 2026-10-31 | v2.10 | The R16 take-down-scan exception (the three family-list row keys, copy 2.13–2.15, only in `family.tsx`) **CONFIRMED by BigDev** (*"agreed"*); copy unchanged; the device / TalkBack pass checks that "Remove" reads as "this line". Ledger `2026-10-31am`. |
| 2026-10-31 | v2.9 | **TASKS 2–9 IMPLEMENTED** (`bmad-dev-story`) — six code commits `9c695ef1`…`b61e2b37`: contracts + migration **0194** (re-taken — 12-1 committed 0193 first), the API (Send / member view / review / decide / public read / take-down; permission **v4** with the declaration flag), the mobile family screen, the admin review + take-down, the public `<KinshipLattice>` with its ruled matrix pair (`-428` item 1) and the floor's four declared gaps (owed by 11b-5c), the fences (AC10 pin, `SCAN_FILES`, microcopy, friction). 17 named mutants planted and proven RED, each restored byte-identical. ⚠ One gate scope narrowed for BigDev to confirm (the R16 take-down scan vs approved copy 2.13–2.15 — Completion Notes). Status → **review**. ⏳ `ci:local`: four runs, each 35 / 36 (load timeouts / fixed-Pariwar pollution, each red spec green in isolation; run 1's lint red was ours — fixed `50b7a2b6`) — a clean 36 / 36 is owed before `done` (AC13). Ledger `2026-10-31al`. |
| 2026-10-31 | v2.8 | The confirms RULED — Decision `2026-10-31-432` (Trustee-ratified, DR + KB): *"R1 A, R2 A, R3 A"* — R1 A the members' app shows the memorial itself, v4+ only (row 11b-5c builds it, ⛔ no longer waits); R2 A (⚠ ⛔ not our suggestion) the declaration's adult half covers the words too (v4 ③ stands); R3 A the reviewer's child test narrowed to a reason in the memorial itself (KL16's guidance and copy 4.4's guidance line re-worded to it — ✅ BigDev confirmed, *"changes fine"*). Row 41 (r)'s *"R1–R3 answered"* clause met. |
| 2026-10-31 | v2.7 | The follow-up note R1–R3 (`bdc24e92`, `3981fd0b` before the second rebase) SENT by BigDev (*"I have sent the note"*) — ⏳ no ruling yet. It gates row 11b-5c and go-live (Row 41 (r)), ⛔ not Task 2. |
| 2026-10-31 | v2.6 | REBASED onto `origin/main` `beae5116` (Story 6.38 landed; backup `backup/11b-5a-pre-rebase-2-2026-10-31`); ledger-only conflicts; `-426`'s swallowed separator and its misplaced dated note fixed inside their commits; changed-line sets and all decision entries verified. **STOP 2 now satisfied** — 6.38's erasure lock is on `main` under this branch (Task 4.7 writes AC9 from its code; ⛔ no further rebase needed for it). SHA map 2 above. Ledger letters `-31m/n/o/r/s` relabelled `-31aa`…`-31ae` (`main` holds them); this entry `-31af`. Migration `0193` still free on `main` (re-take at Task 3.1). |
| 2026-10-31 | v2.5 | TASK 1 DONE — Decision `2026-10-31-431` (author-commit, KL1–KL16) committed alone (`1c68adc4`); Task 1.2's records: rows `11b-5b-kinship-named-relative-removal` and `11b-5c-member-app-shows-the-memorial` minted (`backlog`, comment blocks); launch-gate Row 41 annotated (r)(s)(t); a dated note in `architecture.md` :1839-1846; `epics.md` dated notes under 11b.4 / 11b.5 / 11b.6 (11b.6's STOP met and carried out); `deferred-work.md` annotated. Status `ready-for-dev` → **`in-progress`**. Next: Task 2 — rebase onto 6.38 before Task 4.7; re-take the migration number at Task 3.1. |
| 2026-10-31 | v2.4 | Copy RE-APPROVED by BigDev (*"approved"*): v4 ④ with the child ground narrowed (*"…or names or shows a child this confirmation does not cover"*, en + hi), new 4.3 (the family's reason for a declared submission) and 4.4 (the admin label + guidance). `hiReviewed` stays `false` pending a non-author review. Open: the R1–R3 note to send; Task 1. |
| 2026-10-31 | v2.3 | VALIDATED (`bmad-create-story validate 11b.5a`, second pass; three parallel read-only verifiers — code as built / governance / adversarial design — at `9006d0ce`): 33 findings (9 critical, 17 should-add, 6 optimisations, 1 wording), ALL applied on BigDev's "all". Critical: next decision id `-431` (`-430` is 6.38's); STOP 2 FIRED (6.38's `e813e5ee` changes `anonymize.ts` / `resolveRtbfLegality` — rebase before Task 4.7); v4 ④ + the family's child reason contradicted the declaration ⇒ ④ narrowed + copy 4.3 / 4.4 (⏳ RE-APPROVAL owed); KL15 / KL16 propagated to Tasks 2 / 4 / 5 / 6 / 9 (the `inPhoto` schema on Send AND every read, the tick-without-photo refusal + client strip, `carriesGuardianDeclaration` + `guardianDeclaration` for the banner); the floor test's four memorial ids → declared GAPS owed by 11b-5c (⛔ never "the PC2 ruling"); dated notes under `-428` (Consequence 1 moved to 11b-5c; PQ2 B's grounds corrected — `-391` item 7 ⛔ not superseded by `-428`; quotes exact; "no fifth reason" a reading), `-426` (items 4 / 7 superseded in part; readings 2 / 3 carried as R2 / R3), `-391` (correction), `-420` (MV2 carried out); superseded plan text struck; history moved to a non-binding appendix. Governance: a follow-up note **R1–R3** written (`trustee-panel-routing-note-2026-10-31-11b5a-confirms-r1-r3.md`) — prepared for relay, ⛔ not yet sent. Recorded defects in notes as sent: the addendum (`130943af`) went out with *"Split out and ⛔ asked"* / *"Also ⛔ yours"* (negators missing — meant "not asked" / "not yours"); v2 (`04c17a0c`) said *"⛔ Nothing else changed"* though its §0 wording, one example, its plain English and its evidence also changed — both disclosed in R1–R3's *How much to trust*. Migration `0193` is held UNCOMMITTED by the 12-1 worktree — re-take at Task 3.1. |
| 2026-10-31 | v2.2 | KL15 and KL16 ANSWERED as proposed (*"KL15 and KL16 looks good"*) ⇒ Task 0.2 DONE (KL1–KL16, all copy, Questions 7–8). Open before Task 1: the validate pass of v2.x. |
| 2026-10-31 | v2.1 | Q-copy-2…5 APPROVED by BigDev (*"all copy approved. Hindi modified in one place."*); v4's sentence ① Hindi is BigDev's own wording (edited in the table, kept verbatim). 5.1 = *"Mourned by"* (the alternative unused). `hiReviewed` stays `false` pending a non-author review; four points noted for it (*क्लिक*, the button name, English glosses, *फोटो*). Open before Task 1: KL15 / KL16 answers and the validate pass. |
| 2026-10-31 | **v2.0** | Task 0.4 DONE — the main note v2 RULED: Decision `2026-10-31-428` (Trustee-ratified, DR + KB): *"PQ1 -A, member also sees the memorial page, they don't have to logout to see the public memorial page. PQ2 - B, PC1 -A"*; the rider read by BigDev (asked in session) as the member app's drive screen showing the memorial; PC2 ⛔ not answered as put (the rider governs). Committed alone (`1bdd8cd0`). BigDev's scope (2026-10-31): the member-app memorial → new row **11b-5c**; the helpline removal (PQ2 B) → row **11b-5b**; the declaration for words + photo → **inside** this story (KL16, PROPOSED). Revision pass: a RULED block at the top binds; KL4 / KL7 / KL13 / KL14 / KL15 updated, KL16 added; AC1 not applicable; AC7's floor exclusion only until 11b-5c; AC14 (declaration) and AC15 (ticks) added; Tasks 0.4 ✅, 1.1, 1.2, 4.2, 6, 7.2 updated; copy 2.3 and Q-copy-3 ① / ③ / ⑤ redrafted for both places, the declaration and PQ2 B. ⏳ Next: BigDev's answers on KL15 / KL16 and the remaining copy, then a validate pass, then Task 1. |
| 2026-10-31 | v1.11 | The addendum RULED — Decision `2026-10-31-426` (Trustee-ratified, DR + KB): AQ1 A, AQ2 A, AQ3 A, AQ3 (b)1, and *"revise the main routing note and send again"*. Transcribed into the addendum's block and `.decision-log.md` (supersedes `-391` item 2's child and photo halves in part; dated pointer under `-391`). The main note revised to **version 2** (PQ1's options rest on the declaration; PQ2 says why it matters more; PC1's child reason narrowed) — prepared for relay, ⛔ not yet re-sent. Next decision id `-428` (`-425` is 6.38's, `-427` is 12-1's). Copy 2.4A ships; KL15 is built. The "adults only" KLs / ACs are revised at Task 0.4 after the main ruling. |
| 2026-10-31 | v1.10 | Copy 2.4 split by the addendum's AQ1 outcome: **2.4A** (AQ1 A — *"You may name a child only if you are their parent or guardian, or have their parent's or guardian's agreement. You will be asked to confirm this before you send."*, from BigDev's line, widened to match the declaration) and **2.4B** (AQ1 B — the adults-only line as drafted). Only the ruled one ships. |
| 2026-10-31 | v1.9 | Copy 2.3 trimmed at BigDev's request: *"The Trust will see it before anyone else does"* dropped from the family screen — the review is stated once, in the permission at Send. |
| 2026-10-31 | v1.8 | REBASED onto `origin/main` `b2f36fe9` (backup `backup/11b-5a-pre-rebase-2026-10-31`); changed-line sets verified equal to pre-rebase; governance commits still alone. SHAs rewritten — see the SHA map below; earlier rows keep the old SHAs as written. Ledger `-31f` RELABELLED `-31n` (`main` holds `-31f`); this entry `-31o`. |
| 2026-10-31 | v1.7 | Addendum committed ALONE as `f8e0455d` (prepared for relay — ⛔ not yet sent). `origin/main` MOVED since Task 0.1 (`01062c51` → `b2f36fe9`: Story 6.38's records + Decision `-424` (6.38's Panel ruling, ⛔ no memorial content) + rows 3-13 / 3-14) ⇒ next decision id `-425`; ⛔ no memorial path changed (STOP 1 still clear); the branch is ⛔ not yet rebased — owed before any push. Ledger: this entry `-31m` (`-31j` / `-31k` are on `main`, `-31l` is 6.38's). |
| 2026-10-31 | v1.6 | BigDev asked whether children may be named (and shown) on a guardian's declaration ⇒ an ADDENDUM to the Panel note drafted — `trustee-panel-routing-note-2026-10-31-11b5a-kinship-addendum-guardian-declaration.md`: AQ1 the list (⭐ A a declaration — BigDev's proposal), AQ2 the words (⭐ A one rule; reverses `-391` Q2 A's child half), AQ3 the photo (⭐ A, BigDev's reading; the drafter's B disclosed) with AQ3 (b) an optional *"in the photo"* tick on listed people (⭐ (b)1 ⛔ not shown publicly). Architecture :1839-1846 (*"Sahyog Vivran shows family without minor's name"*, DPDPA §9 *"carries to all minor-data handling"*) disclosed — an amendment follows under A. KL15 + copy 2.23–2.25 PROPOSED. Addendum prepared for relay — ⛔ not yet sent, ⛔ not committed. ⚠ Every AC/Task assumes the main note's PQ1 A (adults only) until the addendum is ruled — Task 0.4 revises. |
| 2026-10-31 | v1.5 | Q-copy-2…5 DRAFTED in full (en + hi) in one review table under *Questions for BigDev* — the family screen (2.1–2.22), the v4 permission (①–⑤, one take-down sentence per PQ2 outcome), the outcome line (4.1), the public heading (5.1); gap found: English plural labels (5.2). PROPOSED — awaiting BigDev. |
| 2026-10-31 | v1.4 | Q-copy-1 answered (*"fourteen labels are fine"* — the KL3 Hindi + English stand; `hiReviewed` still owed by a non-author review). Task 0.3 DONE: BigDev confirmed the routing note SENT (*"routing note sent"*). Waiting on the ruling (Task 0.4). Ledger `2026-10-31j`. |
| 2026-10-31 | v1.3 | Task 0.1 run (⛔ no STOP; numbers unchanged; ledger next `-31e`). Task 0.3: the routing note WRITTEN from the template — `trustee-panel-routing-note-2026-10-31-11b5a-kinship.md` (PQ1, PQ2, PC1, PC2; meeting part with ⛔ no clause ids; E1 verbatim, E4 run). Prepared for relay — ⛔ not yet sent. Note committed alone (`9efa0c06`); records `2026-10-31f`. |
| 2026-10-31 | v1.2 | Task 0.2, part: BigDev answered KL1–KL14 — KL1–KL2, KL5–KL14 as recommended; KL3 a closed domain vocabulary of **fourteen** codes (grandchildren split `sons_son · daughters_son · sons_daughter · daughters_daughter`, grandchildren kept); KL4 one relation + one name per entry, adults only by name, ≤ 20, a **200**-code-point cap (fits the 32 KiB part — worked in KL4). Propagated to §0 G10, PQ1 A, AC2, Task 2.1, Task 9. Open: Q-copy-1 wording, Q-copy-2…5, Questions 7–8; Task 0.1 not yet run. ⛔ No code, ⛔ no decision id, ⛔ no Panel note. |
| 2026-10-31 | v1.1 | Validated (`bmad-create-story validate 11b.5a`; three parallel read-only verifiers — code as built / governance / adversarial design — at `01062c51`): 52 findings (13 critical, 27 should-add, 7 optimisations, 5 wording), ALL applied on BigDev's "all", then a fix-diff review of the patch (one fresh reviewer): 14 corrections applied (the floor test's `-411` item 7 assertion moves; PC2 moot under PQ1 C; costs on PC1 / PC2; read schema never tighter than a Send schema; letter qualifications). Critical: the October note's promise was the AUTHOR's and conditional on Q2 (answered) — MA2 is the live ground; PC5 A read correctly; PC2 added (the list off the members' drive view needs its own ruling); PQ2 B disclosed as a fifth ground; G2 quotes `-395` item 3 + `-411` PQ1 A; `-393` M4 (not M3); ledger letter; microcopy `code_globs`; re-send keeps the list ("Start from the list I sent"); `sendContent` stores a string; all three `action_shape` checks count kinship; per-name bidi isolation; AC10's scan root + table-identifier pin. ⛔ No code, ⛔ no decision id taken, ⛔ no Panel note. |
| 2026-10-30 | v1.0 | Created (`bmad-create-story 11b.5a`, worktree `.claude/worktrees/11b-5a-kinship-capture-and-lattice`, pin `01062c51`). Three read-only research passes (governance / code as built / tests-gates-numbers) + hand checks of every load-bearing quote and the Niyamavali. KL1–KL14 PROPOSED; PQ1, PQ2, PC1 PLANNED (the note is written at Task 0.3). ⛔ No code, ⛔ no decision id taken, ⛔ no Panel note. |
