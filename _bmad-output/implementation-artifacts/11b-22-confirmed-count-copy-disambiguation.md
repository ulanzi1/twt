---
baseline_commit: 797860e7
---

<!--
⭐ BASELINE: `797860e7` — `governance(11b.21): code review complete`. `origin/main` was fetched and
equals it (2026-09-19). Two facts, stated separately:
  - the pin is an ancestor of HEAD (durable);
  - every code claim below was read at `797860e7` (perishable). Re-diff `packages apps scripts` (Task 0).
⚠ No `file:NNN` pointer in this file points into `.decision-log.md`, `deferred-work.md` or
`sprint-status.yaml` (all newest-first). Cite those by decision id / clause / item title / row key only.
⚠ Line numbers for `[driveToken].astro` in the sprint ledger (`:161`, `:201`) are STALE — 11b.20 and
11b.21 moved them. This file cites the two label entries by NAME (`contributorTotal`, `contributionsCount`).
⚠ KEY `11b-18` IS SKIPPED for the reason recorded in `11b-19`. It is absent from `development_status`.
-->

# Story 11b.22: One Page, Two Counts — Word the Contributor Set Size and the Confirmed-Contribution Count Differently `[SURFACE]`

Status: review

## ⭐ GLYPH REGISTER — read this before any clause below

⭐ = an action to take · ⚠ = a hazard · **⛔ marks a negation and must be followed by an explicit
negator** (`not` / `no` / `never` / `nothing` / `neither`, or a prohibition verb). A ⛔ placed before a
positive clause is an **inversion**, not emphasis.

## ✅ PREFLIGHT — **STARTABLE.** No Panel question blocks it.

⭐ **Authority.** This story discharges the **third and last code-owned open follow-up** of
`#decision-2026-09-16-219` (scheduled 2026-09-18 as this row). It asks no new question of the Panel.

⭐ **The routing template's §0 gate, applied (2026-09-19).** The one open question is *which words label
a count*. Stripped of citations: *"what do we call the number of people on the list?"* That changes
⛔ nothing the Trust **discloses** (the figure is already on the page), ⛔ nothing it **owes** anyone,
and sets ⛔ no legal basis; ⛔ no two ratified clauses conflict and ⛔ none is superseded. ⇒ **it is the
author's**, and the ledger row already says so (*"a COPY call, ⛔ not a code defect"*; `-219`'s
follow-up: *"BigDev's, ⛔ not the Panel's"*). The precedent is `-220` (the Hindi placeholder, BigDev
author-commit) and the ordinary-label precedent `label.branch` / `pagination.*` (minted at their own
render site, ⛔ not ratified copy).

⚠ **What the Panel HAS ruled, and this copy must satisfy** (all three are constraints, ⛔ none is
reopened): `-219` **cl.3** (no word may imply *which* of the five omission causes applies; ⛔ no
completeness claim), `-219` **cl.4(c)** (nothing may disclose the cause), and `-169` **cl.6**
(D3-aggregate: the EVENT count keeps counting an erased contributor).

⭐ **One decision is ruled in THIS FILE** (the "Decisions" section). Task 1 records it as ONE
author-commit entry (**`2026-09-19-225`**, the next free id; HEAD is `-224`) **before any code**
([[feedback_governance_commits_precede_implementation]]). ⚠ The proposed words are a **recommendation
for BigDev to commit or change at Task 1** — see the closing *Question for BigDev*; the story does ⛔ not
wait on it, because D2 is written as the default.

---

## Story

As a **visitor reading a Sahyog Vivran page** (a colleague, a member of the family's Pariwar, or a
stranger),
I want **the figure that counts *people* and the figure that counts *confirmed contributions* to be worded
as what each counts**,
so that **I never read the same words — "N confirmed" — twice on one page for two different facts.**

## 📜 Policy meaning (AI-10-1, CONFIRMED BigDev 2026-08-18)

⭐ **No predicate that gates a member's access to a benefit** is introduced or changed. Which
contributions count (`CONFIRMED_CONTRIBUTION_COUNT`) and who is listed (`listConfirmedContributorsForPool`)
are ⛔ not touched; ⛔ no `is_valid`, `is_assignable`, `members.state` or moderation overlay is read. The
story re-words ONE label and repoints ONE key.

⭐ **One sentence, in the reader's terms:** *"the page tells me how many people contributed and how many
contributions were confirmed in different words, so the two numbers never look like one claim said
twice."*
**Checked against the Niyamavali: no clause governs the wording of a count** (`docs/legal/niyamavali.md`
grepped for `contributors` / `confirmed` / `count of` / `number of contributions` — the only hits are the
skip definition and sanction clauses, ⛔ none about display). ⚠ That file is the **local, git-untracked**
copy of the private legal corpus (`git ls-files docs/legal` is empty) — a fresh clone does ⛔ not have it,
so the check is reproducible only where the corpus is present. The governing text is the rulings cited in
the PREFLIGHT, checked at `797860e7`.

---

## ⚠ THE FIVE TRAPS

### Trap 1 — ⚠ The premise "the two numbers differ" is true of their DERIVATION, ⛔ not (usually) of their VALUE
Traced, ⛔ not cited ([[feedback_trace_internal_state_never_cite_decision_text]]):

| | EVENT count | SET size |
|---|---|---|
| Field | `drive.confirmedContributionCount` | `total` (response envelope) |
| Producer | `CONFIRMED_CONTRIBUTION_COUNT(now)` — `packages/domain/src/pool/public-read.ts` (`count(*)` of live `contribution.confirmed` events for the pool, reversals compensated, `occurred_at <= now`) | `confirmedContributors.length` — `apps/api/src/modules/public-pages/handlers.ts`, from `listConfirmedContributorsForPool` (DISTINCT member with ≥1 live confirmation) |
| Rendered as | `contributionsCount` → *Drive details* `<dd>`, under the `<dt>` **"Contributions confirmed"** | `contributorTotal` → the `<p>` under the contributor `<h2>` |

⚠ **The matcher emits `contribution.confirmed` at most once per `(member, pool)`**
(`hasConfirmedContribution` short-circuits a re-run — `packages/domain/src/reconciliation/matcher-reads.ts`,
AC5a), so **in the steady state the two figures are EQUAL** and the page prints the same "N confirmed"
twice. They diverge only if a member ends up with two live confirmations, or a confirmed event lacks a
member id (the set read skips it; the SQL count does not), or an event is future-dated relative to `now`.
⚠ **This story did ⛔ not prove any of those reachable, and ⛔ must not assume one.** ⇒ the copy has to be
correct in **both** cases: read as redundancy when equal, and ⛔ never as a contradiction when they differ.
⭐ That is the whole reason the fix is *different nouns* and ⛔ not a reconciling guard.

### Trap 2 — ⚠ Two entries, ONE key — and a repoint, ⛔ not a rename
`[driveToken].astro`'s label map resolves `value.contributions_count` **twice**: `contributorTotal:` and
`contributionsCount:`. ⭐ The fix is a **new key** for the set size (`value.contributor_total`) and a
**repoint of `contributorTotal` only**. ⛔ Do ⛔ not rename `value.contributions_count`, ⛔ do not touch
`contributionsCount`, and ⛔ do not move either entry: the event-count key is also resolved by
`apps/public/src/pages/sahyog.astro` (`sahyog-drive`) and the mobile `MemberDriveDetail.tsx`
(`member-drive-detail`) — each from its **own** namespace file, ⛔ not this one — so its wording is a
three-namespace matter and is out of scope (D3).

### Trap 3 — ⚠ Stubs transcribe; the two existing stubs are IDENTICAL
`sahyog-vivran-render.test.ts` (`contributorTotal` and `contributionsCount` stubs) and the `scrape-test`
spec (`contributorTotal` stub) both return `` `${n} confirmed` `` — the SAME shape for both fields, which is
exactly the defect, hand-built into the fixture. ⇒ a render test on those stubs **cannot see** the
collision, and a hand-typed new string in a stub proves nothing about the committed locale file
([[feedback_stub_must_call_not_transcribe]]; the 11a.2 `{{max}}` defect and 11b.3b's `${amount}` defect
both passed every stub). ⭐ The proof lives in a leg that calls the **real `t()`**.

### Trap 4 — ⚠ The new string must not re-collide, re-claim, or re-disclose
Every one of these is a way to fail `-219` while "fixing" the copy:
- ⛔ **`confirmed` / `पुष्ट` in the new string** — that is the collided word; the heading directly above
  already says *"Confirmed contributions"*.
- ⛔ **a completeness word** — `all`, `every`, `listed`, `shown`, `names`, `नाम`. The page is paginated and
  holds unnamed rows; the count is ⛔ never "the names below".
- ⛔ **a live-drive estimate frame** — `so far`, `अभी तक`, `and counting` (AC3(b)/(c) of Story 11b.3: ⛔ no
  projection on a collecting drive).
- ⛔ **a per-cause word** — the five-cause ban words (`BANNED_PLACEHOLDER_WORDS` in
  `apps/public/tests/sahyog-vivran-copy.test.ts`) apply to this string too.
- ⛔ **`donor`** — `microcopy.yaml`'s `member_only` vocabulary (→ *colleague*).
- ⛔ **a plural that needs agreement.** `t()` has ⛔ no plural support (`packages/i18n/src` — no `_one` /
  `_other`, no `Intl.PluralRules`); *"{count} contributors"* renders **"1 contributors"**. ⭐ Use a
  label-first, number-last form (`Contributors: {count}`), which is correct at 0, 1 and 42.

### Trap 5 — ⚠ The stale prose that says the SET SIZE reads "N confirmed"
Traced at `797860e7` by symbol (these are code files, so the line numbers are a convenience, ⛔ not the
address). Two phrasings exist — `` `{{count}} confirmed` `` and *"N confirmed"* — and a grep for only one
misses most sites.

**⭐ MUST UPDATE — the prose ties "N confirmed" to the SET SIZE (`contributorTotal` / `total`):**
1. `apps/public/src/lib/sahyog-vivran-render.ts` — the `contributorTotal` label doc
   (`` `{{count}} confirmed` for the contributor SET SIZE ``, ~:155).
2. `apps/public/src/lib/surface-fields.ts` — the **`contributors`** doc-block (⛔ not the `contributorTotal`
   one): *"THE PAGE MAY HOLD FEWER NAMED ROWS THAN `contributorTotal` SAYS … ⇒ this page reads
   *"N confirmed"* beside FEWER than N NAMED rows"* (~:584-586).
3. `packages/contracts/src/public-pages/sahyog-vivran.ts` — the module doc on `total`: *"`total` IS THE
   CONFIRMED-CONTRIBUTOR SET SIZE … ⇒ this page reads *"N confirmed"* beside FEWER than N NAMED rows"*
   (~:702). ⚠ A **comment-only** edit in `packages/contracts` — D3 permits it; ⛔ no schema change.
4. `apps/public/src/pages/sahyog-vivran/[driveToken].astro` — the contributor-section comment
   *"FEWER NAMED ROWS THAN THE COUNT IS THE ORDINARY CASE … this page reads "N confirmed" beside FEWER
   than N NAMED rows"* (~:672-676; it sits above the set-size `<p>`).
5. `apps/public/src/lib/sahyog-vivran-render.ts` — the `contributorsHeader` doc (*"this page reads
   *"N confirmed"* beside FEWER than N named rows"*, ~:137).
6. Test comments that quote the same sentence about `total`:
   `packages/contracts/tests/public-pages-sahyog-vivran.test.ts` (~:482),
   `apps/api/tests/integration/public-pages/sahyog-vivran.spec.ts` (~:1258), and
   `apps/public/tests/sahyog-vivran-copy.test.ts` (the completeness-fence comment, ~:234).

⭐ In each, say the set size renders as *contributors* (the D2 words) and keep the "fewer NAMED rows,
⛔ no completeness claim" point, which is still true.

**LEAVE ALONE (⛔ do not edit) — these describe the EVENT count, which still reads "N confirmed":** the `contributionsCount`
label doc in `sahyog-vivran-render.ts` (~:121), the `confirmedContributionCount` model comment there
(~:434), the rupee-figure comment in the page's facts `<dl>` (~:589), the `confirmedContributionCount` doc
in the contract (~:461), and `sahyog-render.ts` (the INDEX, another surface).

The label-map comment in the page (*"A COUNT of the confirmed-contributor SET"*) and the `surface-fields.ts`
`contributorTotal` doc (*"Do not reconcile the two"*) contain ⛔ no "confirmed" wording for the set size and
need ⛔ no change beyond what reads naturally next to the repointed key.

⚠ A doc-block edit with markdown emphasis (`**cl.3**/**cl.8**`) can terminate a JSDoc — grep `\*\*/` after
editing ([[project_markdown_emphasis_closes_jsdoc]]).

---

## ⚖️ Decisions (the author's to make; each passed the routing template's §0 gate)

### D1 — Re-word the SET SIZE; leave the EVENT count alone
⭐ **Ruled:** the contributor-set-size line gets its own key and its own words; the confirmed-contribution
count keeps `value.contributions_count` ("{count} confirmed" / "{count} पुष्ट") **unchanged**.
- **Why this side:** the set-size line is the one that sits under a heading already reading *"Confirmed
  contributions"* — repeating *"confirmed"* there is the redundancy. It is also the only one of the two
  that is **page-local**: the event-count wording is shared by three surfaces in three namespaces.
- **Rejected — drop the set-size line.** The row's own ledger note is explicit (*"⛔ neither number may be
  dropped: they are different facts"*), and `-219` cl.1's ground is FAIRNESS: the stated count is what
  lets an ordinary reader see the list may hold unnamed rows.
- **Rejected — reword the event count.** Three namespaces carry `value.contributions_count` =
  "{count} confirmed" (`sahyog-vivran`, `sahyog-drive`, `member-drive-detail`, each en + hi); rewording
  one alone leaves the surfaces disagreeing, and rewording all three is a wider story than a copy fix on one page.
- **Rejected — a reconciling guard or a shared derivation.** The contract's own fence
  (`packages/contracts/src/public-pages/sahyog-vivran.ts`, on `total`) says *"⛔ Do ⛔ not add a reconciling
  check between them — they answer different questions and a guard would invent a third."*

### D2 — The words (**default; BigDev may change it at Task 1**)
| Locale | New key `value.contributor_total` | Reads as |
|---|---|---|
| `en` | `Contributors: {count}` | *Contributors: 12* |
| `hi` | `योगदानकर्ता: {count}` | *योगदानकर्ता: 12* |

- **True under all five omission causes; discloses none; claims no completeness** — it counts people who
  contributed, ⛔ not names shown.
- **Number-agnostic** (Trap 4) — needs ⛔ no plural machinery in either language.
- **In-vocabulary on this very section.** The contributor section already says *"No contributor names…"* /
  *"…कोई योगदानकर्ता नाम…"* (`contribution` → `contributor_list.empty`) in both locales, so the
  population is already "contributor" / "योगदानकर्ता" here.
- ⚠ **A known register note, ⛔ not a defect:** the Hindi *placeholder* is `एक सहकर्मी` (`-220`), while
  this line says `योगदानकर्ता`. The empty-state string beside it already does the same, and `-220`'s own
  note says the page carries both registers by design. ⭐ **Fallbacks if BigDev prefers one word:**
  `en` `People who contributed: {count}` / `hi` `योगदान करने वाले सहकर्मी: {count}`. Either passes the
  Trap 4 list. ⛔ Do ⛔ not pick `सहकर्मी: {count}` alone — it reads as a bare noun with a number.
- ✅ **Pre-checked against the real gate (2026-09-19):** `checkVocabulary` (member-only on) +
  `checkTone` + `checkNumerals` return **0 findings** for both default strings, and the same probe flags
  `Donor: {count}` — the probe has teeth. The dev still runs the real gate (AC5).

### D3 — Out of scope, stated so it is ⛔ not rediscovered as a defect
- ⛔ **`value.contributions_count` and its shared wording** — "Contributions confirmed: 12 confirmed" is
  itself tautological, and it is the same on the drive index and the member drive detail. A wording change
  there is a three-namespace story of its own.
- ⛔ **The section heading** `contribution` → `contributor_list.confirmed_header` ("Confirmed
  contributions" / "पुष्ट अंशदान") — a **shared** key that the member surface also reads (`-189` cl.3
  parity), ⛔ not this page's to reword.
- ⛔ **The mobile app.** The member contributor list renders ⛔ no confirmed total
  (`PoolContributorList.tsx` — *"this component renders no confirmed total"*) and the member drive detail
  renders only the event count, so the two figures never share a screen there. ⛔ No mobile change.
- ⛔ **The wire, the model shape and the field id.** `contributorTotal` stays a `string` field with a `null`
  field id; ⛔ no contract schema, ⛔ no API, ⛔ no `surface-fields.ts` shape change. ⭐ Comment-only edits
  in `surface-fields.ts` and `packages/contracts/src/public-pages/sahyog-vivran.ts` ARE in scope (Trap 5).

### D4 — No deploy-ordering hazard
⭐ Pure copy on a server-rendered page: the key ships in the same deploy as the page that reads it, and
`t()` runs per request. ⛔ No wire change, ⛔ no MMKV shape, ⛔ no installed-build skew (contrast 11b.21's
Trap 6). An edge-cached page may serve the old wording until its TTL lapses; that is harmless — the old
wording is the current wording.

---

## Acceptance Criteria

### AC0 — Governance before code
**Given** D1–D4, **when** the story starts, **then** Task 1's commit lands **first**, containing:
- the `2026-09-19-225` author-commit entry in `.decision-log.md` (§0-gate line included);
- an **annotation only** on `-219`'s follow-up (3) and on the `2026-09-18c` sprint-ledger note pointing at
  `-225` (⛔ no clause edited; use *DECIDED / SCHEDULED*, ⛔ never *closed* — the follow-up closes only when
  the code lands, [[feedback_closure_language_precision]]);
- the `epics.md` section for 11b.22 (the **SECTIONED** header block, the 11b.19–11b.21 precedent);
- the sprint row `11b-22-…` moved to `in-progress`.

⛔ No `packages/` or `apps/` change is in that commit.

### AC1 — The set size has its own key and its own words
- `value.contributor_total` exists in **both** `packages/i18n/locales/en/sahyog-vivran.json` and
  `…/hi/sahyog-vivran.json`, with the D2 values, and a `$comment.contributor_total` in each file naming
  `-225`, the trap it avoids (no plural machinery; no `confirmed`) and the "do not reconcile" fence.
- `contributorTotal:` in the `[driveToken].astro` label map resolves `value.contributor_total`, through
  `t()` with `{ count }` — ⛔ never by local string surgery.

### AC2 — The event count is untouched
`value.contributions_count` keeps its exact value in all six locale files that carry it
(`sahyog-vivran`, `sahyog-drive`, `member-drive-detail`, each en + hi), and `contributionsCount:` still
resolves it. ⛔ No other namespace file changes.

### AC3 — The collision cannot come back silently
- **(a) Wiring.** In the **comment-stripped** page source (copy the small file-local `template()` helper
  from `sahyog-vivran-a11y.test.ts` with a pointer to it; ⛔ do not extract a shared package —
  [[feedback_no_premature_package]]; include its non-empty anti-vacuity guard), `value.contributions_count` appears **exactly once** and
  `value.contributor_total` **exactly once**, and each sits on its own label entry.
- **(b) Real `t()`, both locales.** For `n` in `0, 1, 42`: the two keys resolve through the REAL `t()` with
  `namespace: 'sahyog-vivran'`; both outputs contain `n`, carry ⛔ no `{` or `}`, and **differ from each
  other**.
- **(c) Content constraints on the new string** (en + hi), each with a self-test proving the pattern
  fires on a probe (the vacuous-guard lesson in `BANNED_PLACEHOLDER_WORDS`'s doc): ⛔ no `confirmed` /
  `पुष्ट`; ⛔ no `all` / `every` / `listed` / `shown` / `name(s)` / `नाम`; ⛔ no `so far` / `अभी तक`; and ⛔ none
  of `BANNED_PLACEHOLDER_WORDS`.
  ⚠ **The Devanagari patterns use the file's existing `beforeNoLetter` lookbehind with the `u` flag,
  ⛔ never `\b`.** JS `\b` is an ASCII boundary, so `/\bपुष्ट/` can ⛔ never match and `not.toMatch`
  passes trivially — the exact defect fixed in this file on 2026-09-18 (see the `HI_TALLIES` comment).
  ⭐ Declare each pattern ONCE and point both the probe leg and the real leg at that constant, ⛔ never
  a retyped copy (the fifth-review-pass lesson in the same comment).
- **(d) Teeth.** Plant each violation (point `contributorTotal` back at the old key; put `confirmed` in the
  new string; re-add a duplicate key use) and see the matching leg go **red**, then revert. Record it in
  the Dev Agent Record ([[feedback_gate_scope_semantic_coverage]]).
- **(e) The existing scans cover the new string too.** The completeness fence (*"⛔ NO copy claims the
  contributor list is COMPLETE"*) and the prohibited-vocabulary / comparison leg both build their text
  from `KEYS` only. ⭐ Append `t('value.contributor_total', { count: 42 }, …)` to each leg's joined
  text (both locales), so the new string is scanned by the fences that already exist, ⛔ not only by a
  parallel list.

### AC4 — A model test that can tell the two fields apart
In `sahyog-vivran-render.test.ts`, the two label stubs return **different** shapes
(e.g. `Contributors: ${n}` vs `${n} confirmed`) and the fixture uses `total ≠ confirmedContributionCount`
(e.g. 12 vs 13). Assert `model.contributorTotal` is the SET stub fed `total`, and
`model.confirmedContributionCount` is the EVENT stub fed the event count — so an argument swap fails.
⛔ This leg does ⛔ not stand in for AC3(b); it is the arg-swap guard only. Update the `scrape-test` spec's
`contributorTotal` stub to the same distinct shape.

### AC5 — The copy gates and the parity gates pass on the real files
`pnpm microcopy:check`, `pnpm microcopy:test`, the `@twt/i18n` parity/`catalog-registration` suites, the
`sahyog-vivran-copy` suite (⚠⛔ **do ⛔ not add `value.contributor_total` to its `KEYS`**: that loop calls
`t(key, undefined, …)` and `t()` THROWS `missing interpolation param 'count'`
(`packages/i18n/src/resolver.ts`, `interpolate`) — which is why `value.contributions_count`,
`appeal.stage` and `value.amount_raised` are absent from `KEYS` too. ⭐ The key gets its own
interpolated leg and joins the existing scans per AC3(e)), the **placeholder one-key** test
(the new value is ≠ `A contributor`, so it stays green) and `astro check` for `apps/public` all pass.

### AC6 — No stale prose (Trap 5)
Every **MUST UPDATE** site in Trap 5 (six items) is updated to say the set size renders as
*contributors*, keeping the "fewer NAMED rows, ⛔ no completeness claim" point and, where present,
*"do not reconcile — they answer different questions"*. Every **LEAVE ALONE** site is unchanged.
Run both phrasings — `grep -rn "{{count}} confirmed" apps/public/src` **and**
`grep -rn "N confirmed" apps packages --include=*.ts --include=*.astro | grep -v node_modules` — and
classify each remaining hit in the Dev Agent Record as EVENT-count prose; ⛔ none may describe the set size.
`grep -rn '\*\*/' <edited files>` finds ⛔ no comment-terminating emphasis.

### AC7 — The friction budget is DISPOSED, ⛔ not skipped
`MEMBER_FACING_PREFIXES` includes `apps/public/`, so AC-4's attribution-on-change **fires**. ⇒
`friction-budget.md` gains a **Story 11b.22 disposition**. Expected shape: *declaration affirmed — ⛔ no
new row, ⛔ no row retired, ⛔ no row amended*; the change re-words one label, asks the reader for ⛔
nothing, and is ⛔ not friction (follow the 11b.20 disposition's shape). ⭐ Run `pnpm friction:check`
**after committing** — it diffs `${baseRef}...HEAD`, so a pre-commit run passes vacuously (the 11b.20 and
11b.21 lesson).

### AC8 — The follow-up closes only on green, and says so precisely
**Given** the code is committed and `pnpm ci:local` is green, **then** `-219` follow-up (3) is annotated
*"BUILT at Story 11b.22"* (annotation only, ⛔ no clause edited), `deferred-work.md`'s *"Same i18n key used
for two different 'confirmed' numbers on one page"* item is annotated **in place** (⛔ never deleted), and
the sprint row is flipped per the ledger convention ([[feedback_closure_language_precision]]).

---

## Tasks / Subtasks

- [x] **Task 0 — Re-verify the baseline** (all ACs)
  - [x] `git fetch origin`; `git diff 797860e7..origin/main --stat -- packages apps scripts`. If
        `[driveToken].astro`, `sahyog-vivran-render.ts`, `surface-fields.ts` or either
        `sahyog-vivran.json` moved, re-derive every cite below first (`11b-20`/`11b-21` are `done`, so
        there is ⛔ no sibling to rebase against).
  - [x] Confirm the two `tr('value.contributions_count', …)` uses in `[driveToken].astro`
        (`contributorTotal:` and `contributionsCount:`) and that `.decision-log.md` HEAD is still `-224`
        (else take the next free id and update every `-225` here).
  - [x] *(Observational — ⛔ not blocking, ⛔ changes nothing below.)* Note in the Dev Agent Record whether
        any producer path can give one member two live confirmations for one pool (Trap 1). The copy is
        correct either way.
- [x] **Task 1 — GOVERNANCE COMMIT, before any code** (AC0)
  - [x] `### Decision 2026-09-19-225` (**Author-committed, BigDev**): D1–D4, the rejected alternatives,
        the §0-gate line (*"the author's: it changes ⛔ no disclosure, ⛔ no obligation, ⛔ no basis, and
        supersedes ⛔ no clause"*), and the D2 words — as committed or as BigDev changed them.
  - [x] Annotate `-219` follow-up (3) and the `2026-09-18c` ledger note (annotations only).
  - [x] `epics.md`: add `### Story 11b.22: …` after the 11b.21 section and before `## Epic 12`, with the
        SECTIONED header block (`SECTIONED 2026-09-19 (Story 11b.22 Task 1, before the first line of
        code)`), commissioning authority `-219` follow-up (3).
  - [x] Sprint row `11b-22-…` → `in-progress` (SAFE prepend of a ledger entry: read first, guard on size,
        then write; [[project_sprint_status_safe_prepend]]).
  - [x] Commit as `governance(11b.22): -225 — the two counts get two wordings; section the story; row → in-progress`.
- [x] **Task 2 — The copy** (AC1, AC2)
  - [x] Add `value.contributor_total` + `$comment.contributor_total` to both `sahyog-vivran.json` files,
        next to `value.contributions_count`. Keep key order/parity with the sibling entries.
  - [x] Repoint `contributorTotal:` in `[driveToken].astro`; leave `contributionsCount:` as is.
  - [x] `git diff --stat` shows ⛔ no other locale file.
- [x] **Task 3 — Tests** (AC3, AC4, AC5)
  - [x] `sahyog-vivran-copy.test.ts`: ⛔ do ⛔ not add the key to `KEYS` (it would throw — AC5); add the
        interpolation leg for `value.contributor_total` beside the `value.contributions_count` one; add
        AC3(b), AC3(c) (probe self-tests; Devanagari via `beforeNoLetter` + `u`, ⛔ never `\b`), AC3(a)
        (source wiring) and AC3(e) (feed the resolved string into the completeness and
        prohibited-vocabulary legs).
  - [x] `sahyog-vivran-render.test.ts` + the `scrape-test` spec: distinct stubs; the arg-swap leg (AC4).
  - [x] Plant-and-revert each AC3(d) violation; record the reds.
- [x] **Task 4 — Stale prose** (AC6): the six MUST-UPDATE sites in Trap 5 (incl. the comment-only edit in
      `packages/contracts`); the LEAVE-ALONE sites untouched; both greps, hits classified.
- [x] **Task 5 — Gates and friction** (AC5, AC7)
  - [x] `pnpm microcopy:check && pnpm microcopy:test`; `pnpm --filter @twt/i18n test`;
        `pnpm --filter @twt/public test`; `astro check`; `eslint` on the touched files; `tsc`.
  - [x] Live-DB `public-pages` suite on `twt-test-pg` (the `scrape-test` spec is in it).
        ⚠ `env -u DATABASE_URL` for `ci:local` ([[project_ci_local_double_run_pollution]]); never
        regenerate an applied migration ([[project_live_db_test_gotchas]]).
  - [x] Write the `friction-budget.md` disposition (AC7); **commit**; then `pnpm friction:check`.
  - [x] `pnpm ci:local` before merge.
- [x] **Task 6 — Close the follow-up honestly** (AC8)
  - [x] Only after the code is committed and green: annotate `-219` follow-up (3) *"BUILT at Story
        11b.22"*; annotate `deferred-work.md`'s *"Same i18n key used for two different 'confirmed'
        numbers on one page"* item **in place, ⛔ never deleted**; flip the row per the ledger convention.

---

## Dev Notes

### The code path, at `797860e7`
- **Page** — `apps/public/src/pages/sahyog-vivran/[driveToken].astro`. The `labels` map holds
  `contributorTotal: (count) => tr('value.contributions_count', { count })` and, further down,
  `contributionsCount: (count) => tr('value.contributions_count', { count })`. `tr` is the page's
  `sahyog-vivran`-namespace shorthand. The set size renders as `<p class="mt-1 text-sm text-gray-700">
  {model.contributorTotal}</p>` under `<h2 id="sv-contributors-heading">`; the event count renders in the
  facts `<dl>` via `<MatrixField … field="confirmed_contribution_count">` under `labels.labelContributions`.
- **Render module** — `apps/public/src/lib/sahyog-vivran-render.ts`: `contributorTotal:
  labels.contributorTotal(total)` and `confirmedContributionCount:
  labels.contributionsCount(drive.confirmedContributionCount)`. Code unchanged; only the doc-blocks
  named in Trap 5 are edited.
- **Fields** — `apps/public/src/lib/surface-fields.ts`: `contributorTotal: string`, field id `null`
  (*"a COUNT of a set, ⛔ never a fact about a person"*). Code unchanged; only the `contributors`
  doc-block is edited (Trap 5).
- **Contract** — `packages/contracts/src/public-pages/sahyog-vivran.ts`: schema unchanged; only the module
  doc on `total` is edited (Trap 5).
- **Locales** — `packages/i18n/locales/{en,hi}/sahyog-vivran.json`; `value.contributions_count` sits
  beside `value.district_unknown`. No plural support in `t()`.

### Rulings checked and found to leave this story unchanged
- **`-219` cl.1** (placeholder row) — kept whole; the row count still equals the stated set size.
- **`-219` cl.3 / cl.4(c)** — the D2 words are cause-blind (Trap 4).
- **`-169` cl.6 (D3-aggregate)** — the event count still counts an erased contributor; ⛔ nothing here
  changes a producer.
- **`-222` cl.2 / `-224` D1** (one placeholder key) — ⛔ not implicated: this key's VALUE is ≠ the
  placeholder's, and the one-key test compares values.
- **`-218`** (no percentage on a closed drive) — ⛔ no percentage is introduced.

### Load-bearing invariant families to self-check
- Placeholder banned-word guard (`BANNED_PLACEHOLDER_WORDS`) — applies to the new string.
- Financial-truth gate (`scripts/sahyog-vivran-financial-truth`) — ⛔ no count × amount shape is added.
  ✅ Checked at `797860e7`: the page, the render module and the contract file are all `renderPath: true`
  in its `SCAN_FILES`, and its operand patterns are anchored names (`TARGET_OPERANDS`, `COUNT_OPERAND`,
  `PER_MEMBER_AMOUNT` in `lib.ts`), so ⛔ neither `value.contributor_total` nor `contributorTotal` matches.
  ⛔ No file is added ⇒ ⛔ no `SCAN_FILES` enrolment is owed.
- `microcopy:test` — `scripts/microcopy/sahyog-vivran.test.ts` runs `checkVocabulary` (member-only on) /
  `checkTone` / `checkNumerals` over **every** value in both `sahyog-vivran.json` files (`resolvedStrings`
  is `Object.values`), so it covers the new value with ⛔ no edit; both files are in `microcopy.yaml`'s
  `copy_globs`. ⚠ **That includes the new `$comment.contributor_total`** — so the comment itself must
  ⛔ not use `donor`, a Devanagari digit or a banned tone frame, even when quoting what it avoids.
- Numeral discipline (UX-DR73) — Latin digits in both locales, from `{count}` through `t()`.
- Family 13 (a11y) — the set-size `<p>` is plain text under a named `<section>`; ⛔ no `title=`, ⛔ no role.

### Testing standards
Vitest; real `t()` for every copy assertion; source-reading legs use the comment-stripped page reader
(the page is densely commented — an unstripped read matches literals inside comments). Live-DB on
`twt-test-pg`. Every new guard proves its teeth by planting a violation.

### Previous-story intelligence
- **11b.21** (`done`, review closed 2026-09-19): a `[SURFACE]` story with a Task-1 governance commit, an
  AC for the friction-budget disposition, and a `bmad-code-review` that found the friction gate passing
  vacuously before commit (AC7 here). Its Trap 8 (*"fences that go RED on write, and one that passes
  vacuously"*) is the model for AC3(d). ⚠ 11b.21 rewrote `contributorUnnamed`'s neighbour comments in this
  same label map — read them before editing near it.
- **11b.20** (`done`): added the message-block section to the same page and missed the friction
  disposition (fixed at `a44aef23`) — the reason AC7 exists.
- **11b.3b**: the `${amount}` defect passed every stub and shipped `₹₹` — the reason AC3(b) uses real `t()`.

### References
- `#decision-2026-09-16-219` — cl.1–cl.4 and the three Open follow-ups (this row is follow-up (3)).
- `#decision-2026-09-17-220` (Hindi placeholder, author-commit) · `#decision-2026-09-19-224` D1.
- `#decision-2026-08-30-169` cl.1, cl.6 · `#decision-2026-09-15-218`.
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-TEMPLATE.md` §0 (the gate applied above).
- `deferred-work.md` — *"Same i18n key used for two different 'confirmed' numbers on one page"*.
- `packages/contracts/src/public-pages/sahyog-vivran.ts` — the doc on `PublicSahyogVivranResponse` (`total`).
- `apps/public/tests/sahyog-vivran-copy.test.ts` · `sahyog-vivran-render.test.ts` ·
  `sahyog-vivran-a11y.test.ts` · `packages/i18n/tests/contributor-placeholder-one-key.test.ts`.

### ❓ Question for BigDev (does ⛔ not block the story; D2 is written as the default)
Are the D2 words yours — `Contributors: {count}` / `योगदानकर्ता: {count}` — or do you prefer the
`People who contributed` / `योगदान करने वाले सहकर्मी` fallback (one register for the Hindi on this
section)? Whichever you commit at Task 1 is what AC1 and AC3 assert; the Trap 4 constraints apply to
both.

---

## Dev Agent Record

### Agent Model Used

Claude Opus 5 (1M context) — `claude-opus-5[1m]`, via `bmad-dev-story`, 2026-09-19.

### Debug Log References

- **Task 0 (2026-09-19):** `git fetch origin`; `origin/main` = `797860e7`; `git diff 797860e7..origin/main` and
  `797860e7..HEAD` over `packages apps scripts` are both **empty** ⇒ every cite in the story holds. The two
  `tr('value.contributions_count', …)` uses are at `[driveToken].astro:173` (`contributorTotal:`) and `:213`
  (`contributionsCount:`). `.decision-log.md` HEAD was `-224` ⇒ the new id is `-225` as planned.
- **Task 0, observational (Trap 1) — changes nothing below:** the only non-test code path that emits
  `contribution.confirmed` is the matcher (`reconciliation/matcher-write.ts`, called from
  `apps/jobs/src/matcher/matcher-worker.ts`), which short-circuits on `hasConfirmedContribution` first. The review
  path (`reconciliation-review-write.ts`) appends a *reversal*, ⛔ not a second confirmation; a later fresh
  confirmation re-greens to ONE live confirmation (the reversal is compensated). `self-verify-write.ts` emits ⛔ no
  `contribution.confirmed`. ⇒ ⛔ no path found that yields two LIVE confirmations for one (member, pool). ⚠ ⛔ Not
  proven: that two concurrent matcher runs cannot both pass the `hasConfirmedContribution` check (it is read
  before the append). The copy is correct either way.
- **Task 1:** D2 committed as the default (`Contributors: {count}` / `योगदानकर्ता: {count}`) — BigDev's open
  question was answered by the story's own default, as the story permits; the fallback is recorded in `-225`.

- **Task 3, AC3(d) teeth (plant → red → revert, 2026-09-19):**
  1. `contributorTotal:` pointed back at `value.contributions_count` → RED: *"each count key is resolved EXACTLY ONCE, by its OWN label entry"*.
  2. `en` value → `Contributors confirmed: {count}` → RED: *"en: the SET-SIZE string carries ⛔ no forbidden word"*.
  3. `hi` value → `पुष्ट योगदानकर्ता: {count}` → RED: *"hi: the SET-SIZE string carries ⛔ no forbidden word"* (the `beforeNoLetter` + `u` pattern fires; ⛔ not vacuous).
  4. Duplicate key use (`contributionsCount:` → `value.contributor_total`) → RED: the wiring leg.
  5. Arg swap in `sahyog-vivran-render.ts` (`labels.contributorTotal(drive.confirmedContributionCount)`) → RED: the AC4 arg-swap leg.
  6. `en` value → `{count} confirmed` (identical to the event count) → RED ×4: AC3(b) *"at 0 / 1 / 42 … DIFFER"* + the forbidden-word leg.
  Every plant reverted; `git status` clean of plants after each.
- **Task 4, AC6 grep classification:** `grep -rn "{{count}} confirmed" apps/public/src` → `sahyog-vivran-render.ts:121`
  (`contributionsCount` label doc — EVENT, LEAVE ALONE) and `sahyog-render.ts:175` (the INDEX, another surface).
  `grep -rn "N confirmed" apps packages` (`.ts`/`.astro`/`.tsx`) → `sahyog-vivran-render.ts:439`
  (`confirmedContributionCount` model comment — EVENT); `[driveToken].astro:590` (rupee-figure comment in the
  facts `<dl>` — EVENT); `packages/contracts/src/public-pages/sahyog-vivran.ts:461` (`confirmedContributionCount`
  doc — EVENT); `packages/domain/src/pool/sahyog-vivran-read.ts:341` (the domain `confirmedContributionCount` doc —
  EVENT; ⚠ not in the story's Trap 5 list, classified here, left alone); `apps/api/src/modules/member-pool/handlers.ts:1413`
  (pool-progress "0 of N confirmed" — another surface); `packages/ui/tests/pool-progress/presenter.test.ts:118`
  (`NaN confirmedCount` — false hit); `apps/public/tests/sahyog-vivran-copy.test.ts:425` (the new 11b.22 block's
  header, describing the RETIRED collision). ⇒ ⛔ none describes the set size. `grep '\*\*/'` over every edited
  non-JSON file: ⛔ no hit.
- **Task 5 gates:** `microcopy:check` ✓ · `microcopy:test` 340/340 · `@twt/i18n` 110/110 · `@twt/contracts`
  1135/1135 · `@twt/public` 684/684 (incl. `scrape-test.spec.ts` 59 — it lives in `apps/public`, ⛔ not the live-DB
  suite) · `astro check` 0/0/0 · eslint (touched files in public, contracts, api) clean · `tsc --noEmit` public +
  contracts clean · live-DB `apps/api/tests/integration/public-pages` on `twt-test-pg` 92/92.
- **Task 5 friction (AC7):** `pnpm friction:check` run on the code commit `473de3ca` FIRST → **FAILED** (AC-4:
  member-facing surface touched, `friction-budget.md` unchanged). Disposition written, committed, re-run →
  **PASSED** (*"a new story disposition was recorded (11b.22)"*).

- **`pnpm ci:local`** (with `DATABASE_URL` → `twt-test-pg`, 2026-09-19, HEAD after the friction commit): **34/34 green**,
  incl. `friction-budget`, `microcopy`, `i18n-parity`, `sahyog-vivran-financial-truth` and live-DB `integration-tests`.
- **Task 6 (AC8):** `-219` follow-up (3) annotated *BUILT at Story 11b.22*; `deferred-work.md` item annotated in place;
  row `in-progress → review` (ledger `2026-09-19n`).

### Completion Notes List

- D2 words committed as the story's default: `Contributors: {count}` / `योगदानकर्ता: {count}` (`-225`).
- `value.contributor_total` + `$comment.contributor_total` added to both `sahyog-vivran.json` files beside
  `value.contributions_count`; `contributorTotal:` repointed; `contributionsCount:` and every other namespace
  untouched (AC1, AC2). ⛔ Not added to `KEYS` (AC5); it has its own interpolation leg and joins the completeness,
  vocabulary and numeral scans via a `contributorTotal(locale)` helper (AC3(e)).
- New 11b.22 describe block: comment-stripped source wiring (copied `template()` + anti-vacuity guard), real-`t()`
  differ legs at 0/1/42 in both locales, one `SET_SIZE_FORBIDDEN` constant read by both the probe and real legs,
  plus `BANNED_PLACEHOLDER_WORDS` (AC3(a)–(c)). Render test: distinct stubs + arg-swap leg with total 12 vs event 13;
  `scrape-test` stub updated (AC4).
- Six Trap 5 sites re-worded; comment-only in `packages/contracts` (AC6).

### File List

- `.decision-log.md` (`-225` entry; `-219` follow-up (3) annotated)
- `_bmad-output/planning-artifacts/epics.md` (Story 11b.22 section)
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/11b-22-confirmed-count-copy-disambiguation.md`
- `packages/i18n/locales/en/sahyog-vivran.json`
- `packages/i18n/locales/hi/sahyog-vivran.json`
- `apps/public/src/pages/sahyog-vivran/[driveToken].astro`
- `apps/public/src/lib/sahyog-vivran-render.ts` (doc-blocks only)
- `apps/public/src/lib/surface-fields.ts` (doc-block only)
- `packages/contracts/src/public-pages/sahyog-vivran.ts` (doc-block only)
- `apps/public/tests/sahyog-vivran-copy.test.ts`
- `apps/public/tests/sahyog-vivran-render.test.ts`
- `apps/public/tests/integration/public-pages/scrape-test.spec.ts`
- `packages/contracts/tests/public-pages-sahyog-vivran.test.ts` (comment only)
- `apps/api/tests/integration/public-pages/sahyog-vivran.spec.ts` (comment only)
- `friction-budget.md` (Story 11b.22 disposition)

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-09-19 | v0.1 | Created via `bmad-create-story` at `797860e7`: `backlog → ready-for-dev`. |
| 2026-09-19 | v0.2 | Validate pass at `797860e7` (HEAD `c9cf7125`): AC5 no longer adds the key to `KEYS` (`t()` throws on a missing param); AC3(c) Devanagari patterns use `beforeNoLetter`, ⛔ never `\b`; AC3(e) feeds the new string into the existing fences; Trap 5 / AC6 re-traced (six sites to update, incl. a comment-only contract edit, and the event-count sites listed to leave alone); D3 allows that comment edit; AC8 added for Task 6; financial-truth and microcopy coverage recorded; Niyamavali copy noted as untracked; three ⛔ inversions fixed. |
| 2026-09-19 | v0.3 | `bmad-dev-story`: `-225` governance commit; `value.contributor_total` shipped (en + hi) and wired; real-`t()` / wiring / content / arg-swap legs with recorded teeth; six stale prose sites re-worded; friction disposition. |
