---
baseline_commit: c9d86ab97ad79cdd70f1cea5cce33143fb306f6a
---

# Story 11b.2: ContributionList Presenter — the sixth `@twt/ui` module `[PRIMITIVE]`

Status: review

> ⭐ **NINE DECISIONS ARE COMMITTED, AND ⛔ "FIVE" WAS NEVER THE RIGHT COUNT.** Ruled by BigDev
> 2026-08-29: **D2(a) · D6-uxspec(a) · D7-nameform(a) · D8(a) · D9(a)**. Ruled by BigDev **2026-08-30
> (third validation pass)**: **D11-outputshape(a) · D12-refscope(a) · D13-numbering(a)**. Plus **D1**,
> ruled by construction. ⇒ **AC0 transcribes ALL NINE**, ⛔ not five.
>
> ⚠⛔ **D6 AND D7 WERE RENAMED (D13-numbering(a)).** They are **`D6-uxspec`** and **`D7-nameform`**
> here. ⛔ **11b.2a has its OWN D6(a) and D7(c), which are DIFFERENT RULINGS**, and both stories'
> Task 0 mint against the same `.decision-log.md` head. ⛔ Never cite a bare `D6`/`D7` across stories.

> ⭐⛔ **SCOPE WAS SPLIT ON 2026-08-29 (validation pass). READ THIS BEFORE ANYTHING ELSE.**
>
> The epic's Story 11b.2 bundled four separable things: a headless presenter, a **live RTBF defect
> fix** on shipped API code, an `N+1` decrypt bound, and a mobile render-layer rewire. They are three
> risk classes, three reviewers and three revert units. They are now three stories:
>
> | Story | Owns | Tag | Runs |
> |---|---|---|---|
> | **11b.2** (this file) | the `@twt/ui` `contribution-list` presenter + its teeth + the governance writes | `[PRIMITIVE]` | parallel with 11b.2a |
> | **11b.2a** | the RTBF contributor-name defect + the decrypt bound + the wire-shape widening | `[DEFECT]` | ⭐ **parallel; ship first if capacity is scarce — it is a live, user-visible defect** |
> | **11b.2b** | the mobile render layer (`<PoolContributorList>` + the Nominee Console) + family-13 a11y | `[SURFACE]` | ⛔ **after both** |
>
> ⛔ **This story ships no pixel and touches no `apps/`.** That is the correct shape for the sixth
> presenter module — it is exactly 9.12's precedent.

## ✅ PREFLIGHT — the dev agent's first action

⛔⛔ **STEP 1 — RE-READ `11b-2a-…md`'s PREFLIGHT AND ITS TASK-6 "WHAT DROPS" TABLE (`:1036-1044`)
BEFORE ANYTHING ELSE.** 11b.2a runs in **parallel** and **its rulings bind this presenter BY LINE
NUMBER**. ⚠ **This is ⛔ not a formality — it has already fired once:** 11b.2a's **D5** and **D6(a)**
(BigDev, 2026-08-30) landed *after* this file's second validation pass and between them abolished the
subject of three of its ACs. The third validation pass (2026-08-30) absorbed all seven routed
artefacts; **if 11b.2a has ruled AGAIN since, STOP and report the conflict — ⛔ do not reconcile it
yourself** ([[feedback_supersede_never_reinterpret]]).

⚠⛔ **AND THE OLD TRIP-WIRE WAS TOO NARROW — ⛔ DO NOT RESTORE IT.** It read *"if 11b.2a's D3-shape(i)
is **amended**"*. What happened was **vacatur**, ⛔ not amendment — a stronger event its own vocabulary
did not describe — so a literal reader could conclude it had not fired. **It had.** ⇒ the condition is
now *"if 11b.2a has ruled at all since this file's baseline"*, and it lives **here**, ⛔ not buried in
AC3.

⭐ **The nine committed decisions are listed in the banner above and written out with their grounds in
the Decisions section below.** ⛔ **Task 0 TRANSCRIBES them into `.decision-log.md`. It does ⛔ NOT
author them, ⛔ not paraphrase them, and ⛔ not supply a ground.** ⚠ If any decision below has been
edited back to UNRULED, **STOP and report blocked**.

> ⭐ **BASELINE RE-PINNED `9b05372` → `c9d86ab` (THIRD validation pass, 2026-08-30). ⛔ NOT A SINGLE
> CODE CLAIM MOVED** — `git diff --name-only 9b05372..c9d86ab` returns **four `_bmad-output/` files**
> (this file, `11b-2a`, `11b-2b`, `sprint-status.yaml`) and ⛔ **zero** files under `packages/` ·
> `apps/` · `scripts/` or any root config. ⚠ ⛔ Do ⛔ not re-verify code citations on the SHA change
> alone (the `fe8a6f9` precedent).
>
> ⚠⛔⛔ **BUT THE "NOTHING MOVED" ARGUMENT DOES ⛔ NOT COVER WHAT ACTUALLY BROKE, AND THE SECOND PASS'S
> VERSION OF THIS BLOCK IS EXACTLY HOW IT WAS MISSED.** Those four files are **the three sibling
> stories plus the ledger** — i.e. **precisely the governance state this file depends on most**. Six
> commits in that window carried 11b.2a's **D5** · **D6(a)** · the **D3-shape(i) / D3-key / D3-rollout
> vacations** and 11b.2b's **D10**, and between them they falsified three of this story's ACs.
> ⇒ ⭐ **"no code path moved" is ⛔ NOT "nothing moved". Read the sibling diffs, ⛔ never just the
> `--name-only` list.**
>
> ⚠⛔ **THIS STORY IS ⛔ NOT ON `main`. ⛔ DO NOT BRANCH OFF `main`.** At the third validation pass
> `origin/main == 80e0d12` and this branch **`governance/11b-2-validate-split`** is at **`c9d86ab`,
> 10 commits AHEAD / 0 behind** `origin/main`, tree clean. ⛔ **`main` still carries the PRE-RULING
> file**, whose Status reads `blocked-awaiting-decisions` and which orders you to stop. ⇒ `git fetch
> origin`, then branch off **`c9d86ab`** — or off `main` **after** this branch merges. ⚠⛔ **NEVER off
> `9b05372`**: the six commits between them carry the rulings that reshaped AC2, AC3 and AC4.
> ⚠ Re-`fetch` before you branch.
>
> ✅ **ORIGINALLY VERIFIED LIVE at `80e0d12`** — `git fetch origin` at authoring **and** at the first
> validation pass; every claim checked by reading the named file at that tree, ⛔ none inherited from
> an epic line, a retro, or a prior story record.

---

## Story

As a member looking at who has already given to the pool I was assigned to — and, later, as anyone
reading a closed drive's public record,
I want the list of confirmed contributors to read the same way everywhere it appears,
so that one person's contribution looks the same to everyone who sees it, and the app and the public
page can never tell two different stories about the same list.

---

## 📜 Policy meaning (AI-10-1, CONFIRMED BigDev 2026-08-18)

**This story introduces ⛔ NO predicate that gates a member's access to a benefit.** It is a pure
presenter: it decides how an **already-decided** row LOOKS. ⛔ Nothing in it may be read by, joined
into, or referenced from an eligibility, validity, assignability, pool-assignment or claim path.

⚠ It renders **two** identity outcomes it does ⛔ **not** decide. Both are stated because a reader
will mistake either for the other:

**Outcome 1 — RTBF: the contributor is OMITTED, ⛔ NOT MASKED.** ⚠⛔ **REWRITTEN 2026-08-30 — the
previous wording stated SUPERSEDED policy in terms, and it is the single line 11b.2a's D6 was raised
over.** Story 11b.2a's **D5** (BigDev, 2026-08-30, ⛔ FINAL) ruled: *"**An RTBF invocation removes the
contributor from the contributor surface.** ⛔ **No anonymized row is emitted** — ⛔ no marker, ⛔ no
placeholder, ⛔ no `rowKey`, ⛔ nothing occupying the position where that person used to be."* ⇒ ⛔ there
is **no** *"an anonymous member"* marker on this surface, and ⛔ **this presenter carries no
`anonymized` variant at all** (D6(a)).

**In the member's terms:** *"if you exercised your right to erasure, **your contribution stays
counted** — the total still includes what you gave — but **the line with your name on it is gone
entirely**. Not blanked, not replaced by a placeholder: absent."*

⚠ ⭐ **Both halves are load-bearing and neither may be dropped.** *"Stays counted"* is 11b.2a's
**D3-aggregate** cl.(1); *"the line is gone"* is **D5**. ⛔ Writing only the first implies the row
survives; ⛔ writing only the second implies the money vanished.

**Outcome 2 — death changes nothing, and that is the whole point.** The ruling, **verbatim**
(`.decision-log.md:1032-1033`, Decision `2026-08-24-159` cl.11 = D9(a) — ⚠ ⛔ **that is the DECISION
LOG's D9, ⛔ not this story's D9 below**): *"⇒ ⛔ **no death-derived predicate may filter, mask or
anonymize a contributor row**, on any surface, at any tier."* ⚠ ⛔ **It does ⛔ NOT say "reorder"** —
an earlier pass added that word and presented it as the ruling. Ordering is ⛔ not ruled here; treat a
death-derived **sort** as forbidden by this story's own scope rule (⛔ no death term in the module at
all, AC5), ⛔ never by citing `-159`. **In the member's terms:** *"a contribution you made while you
were alive stays in the record
with your name on it. Dying does not un-give it."*

**Checked against the Niyamavali — the two return DIFFERENT results; ⛔ do not collapse them:**
· **Outcome 1 — §4.4 SPEAKS to it** (*"public rendering of any personal information is consent-gated
  and never default opt-in"*) and the build complies in the strictest direction ⚠ **regardless** —
  ⛔ **§4.4 GOVERNS nothing.** The Niyamavali is unratified, agent-drafted design reference
  ([[feedback_niyamavali_rulebook_not_spec]]), §4.4 carries a pending amendment expressly declaring it
  *"INCONSISTENT with the ruled directory policy"* (`11a-3-…md:1654`, ⛔ authorised, ⛔ not applied),
  and the instrument `epics.md:4916` names for this posture — Deed cl.15(c) — was ruled to *"govern
  nothing"* (`2026-08-28-164`, `.decision-log.md:261`). ⛔ Do not cite any of the three as binding.
  ⚠ The **positive**
  half (on what authority a contributor's name renders **publicly** at all) is ⛔ **not this story's**
  — 11b.3 owns the mechanism. ⇒ **this presenter takes the resolved name as INPUT and ⛔ never
  resolves, gates or decides it.** → **D7**.
· **Outcome 2 — ⛔ no clause governs it, and that is the CORRECT result, ⛔ not a gap.** Whether a
  dead contributor's name stays on a historical list changes ⛔ no member's `is_valid`, ⛔ no
  `is_assignable`, ⛔ no assignment, ⛔ no claim outcome, ⛔ no disbursement.

**Outcome 3 — a corrupt row fails LOUDLY, and the member's cost is stated.** ⭐ **This is the only
genuinely NEW member-facing behaviour this story creates, and until 2026-08-30 it was stated in
engineering terms only.** D8(a) makes an unresolvable name **throw** rather than render a blank.
**In the member's terms:** *"if the app cannot work out whose contribution a line belongs to, it shows
you nothing rather than showing you a nameless line — and 11b.2b's guard is what keeps that one bad
line from hiding the whole list."* ⛔ No benefit, eligibility or validity is affected ⇒ ⛔ **no
Niyamavali clause governs it**, and that is the correct result, ⛔ not a gap.

⛔⛔ **THE C-5 SHARP EDGE INVERTS HERE.** The epic instructs authors to add the `account-frozen`
(death) overlay conjunct to predicates that lack it, because 11a.3 wrongly **published** a deceased
member. ⭐ **The same correction applied to a CONTRIBUTOR read silently DELETES dead contributors
from the historical record** — *"the right conjunct in the wrong read"* (`2026-08-24-159` cl.11,
verbatim). ⛔ A diff that adds a death conjunct to any contributor path must be **rejected in review**.
⚠ ⛔ And do **not** restate this as *"contribution history is immutable"* — it is **not**, and that
sentence implements the wrong thing in the RTBF direction.

---

## 🚦 Launch posture — ⛔ THIS STORY PUBLISHES NOTHING

A presenter has no route, no cache policy and no viewer. ⛔ It closes no launch gate and opens no
surface.

⚠⛔ **AND THE GATE PICTURE HAS MOVED — ⛔ DO NOT RESTATE IT STALE.** An earlier pass wrote that
*"the three gates 11b.1 recorded … are untouched"*. **Two of the three had already fallen** when it
was written, and **Story 11b.9 — `done`, merged at `b287ba1`, two commits before this file — is what
felled one of them.** Of 11b.1's three gates (`11b-1-…md:156-160`):
 · **(1) counsel's DPDPA hold — ⛔ LIFTED.** `2026-08-28-160` cl.7 cleared **all three** 11b surfaces,
   superseding `-157` cl.3 (`.decision-log.md:618`; `11b-9-…md:139-140`).
 · **(2) Row 17's ≥2-trustee publication ratification — ✅ STANDS**, extended by C-5 to 11b.1 · 11b.3
   · 11b.6.
 · **(3) the per-subject consent gate — ⛔ DE-AUTHORISED BY 11b.9 ITSELF** (`11b-9-…md:570`);
   `sahyog_drive_publication` is preserved-but-de-authorised
   ([[project_11b_consent_model_c5_superseded]]), and `-162` cl.2 retired the two adjacent boxes.

⚠⛔ **AND THE THIRD GATE WAS MISNAMED.** 11b.1 recorded it as *"the per-subject consent gate"*. The
phrase *"the per-data-class publication basis"* is `-160` cl.3's language for a **preserved BASIS** —
⛔ **not a gate, and not 11b.1's**. Substituting it silently dropped the one gate that actually fell,
and contradicted this story's own **AC7**, which says the basis **is** settled.

⇒ ⛔ **None of this is moved by a presenter.** What keeps `/sahyog` dark is **deployment plus the
counsel/Panel process** — ⛔ not a code mechanism, and ⛔ never the publication kill switch
(`11b-9-…md:142-146`, `574-576`; [[project_directory_launch_gated_on_killswitch_ui]]).

⇒ ⛔ Do not write anywhere that Epic 11b is launch-ready, that a public contributor list is
authorised, or that D7 is settled. ⛔ Do not declare a matrix surface or field.

---

## 🎯 What already exists — verified at `80e0d12`, re-verified at validation

| Claim | Verified state |
|---|---|
| A **headless presenter pattern** exists, five times over | ⭐ ✅ **YES, AND IT IS THE TEMPLATE.** `packages/ui/src/index.ts` barrels `member-status` (4.7, `:3`) · `status-pill` (9.6, `:8`) · `pool-progress` (9.12, `:14`) · `contribution-disclosure` (10.16, `:21`) · `noticeboard` (11a.5/11a.6, `:35`). Style: a leading `// Story N.N — …` prose block, then `export * from './<dir>/index.js';`. |
| The **module file set** | ⚠ **NOT the uniform "four/five" the first pass claimed.** `member-status` and `contribution-disclosure` = 4 files; `pool-progress` = 5 (`+constants.ts`); `status-pill` = 5 (`+spec.ts`); `noticeboard` = 5, and its fifth is **`pinned-notice.ts`** — neither `spec.ts` nor `constants.ts`. ⇒ the shape is **`index · view-model · presenter · i18n-keys`, plus whatever that module needed**. ⛔ Do not treat the fifth slot as a closed set of two. |
| ⭐ The **closest sibling** to copy | `packages/ui/src/pool-progress/` (9.12) — same domain, same confirmed-only invariant, same "token ROLE names + i18n KEYS, never colours or copy" discipline. `view-model.ts:9-15` is the worked example of **an invariant expressed as a SHAPE**. |
| `@twt/ui` may hold React / a virtualizer | ⛔⛔ **NO.** `packages/ui/package.json` `dependencies` is **exactly `{"@twt/contracts": "workspace:*"}`; zero `.tsx` in the package. ⚠ **BUT `@twt/tokens` IS a `devDependency`** — see AC1's test clause. |
| ⭐ Does C-1 forbid `apps/public` from depending on `@twt/ui`? | ⛔⛔ **NO — IT RULED THE OPPOSITE, AND THE FIRST PASS HAD THIS BACKWARDS.** `.decision-log.md:1729,1741` and `epics.md:4815`: *"`apps/public` **adds `@twt/ui` as a dependency**"* … *"⭐ **C-1 is an ORDINARY DEPENDENCY ADDITION** — ⛔ materially cheaper than the retro and that block assumed"*, and `:1734` *"⛔ **Verified: there was no declination.**"* ⇒ **the Astro layer is deferred because there is NO HOST, ⛔ not because the dep is forbidden.** → **D1-resolved**. |
| Did 11b.1 "explicitly decline" the dep? | ⚠ **NO — it declined FOR ITSELF and named THIS STORY as the consumer.** `11b-1-…md:203` (in the *What already exists* table, ⛔ not Project Structure Notes; the trailing `[[feedback_no_premature_package]]` link is elided): *"⛔ NO — and **this story** does ⛔ NOT add it. C-1 ruled the addition is 'an ordinary dependency addition, ⛔ NOT a governance reversal', but **its consumers are 11b.2 / 11b.5 / 11b.7**. ⛔ Do not add the dep here for a surface that needs no presenter."* ⛔ It is a scope-limited decline, ⛔ not a standing prohibition. |
| A **host route** for a contributor table | ⛔ **NO.** `apps/public/src/pages/` holds `404 · 500 · blog · blog/[postId] · index · members · niyamavali · sahyog · terms`. `/sahyog` (11b.1) renders ⛔ no contributor rows at any grain. 11b.3's `/sahyog-vivran/{id}` is `backlog`. ⇒ **the ground for deferring the Astro layer.** |
| The **confirmed-only wire contract** | ✅ `packages/contracts/src/contributions/pool-contributor-list.ts:42-51` — `ConfirmedContributorRow = { firstName: min(1), lastInitial: max(16) }`, `.strict()`. `:16-22` states the invariant as a SHAPE: no `status`/`yellow`/`attested`/`utr`/`pending`**-member-identity** field, *"the one change this contract exists to forbid"*. ⚠ Note the elision the first pass made: a `pending` **aggregate** DOES exist (`PendingContributorsAggregate`, `:59-65`) — the ban is on a per-row identity field. |
| The **RTBF display seam** | ✅ `packages/domain/src/member/display-name.ts:47-58` — `resolveMemberDisplayName({state,name})`. ⛔⛔ **IT RETURNS THREE KINDS, ⛔ NOT TWO:** `{kind:'name',value}` · `{kind:'unknown'}` · `{kind:'anonymized',i18nKey}` (`:36-39`). `unknown` fires when `name === null` (`:54-55`), and only after the `anonymized` short-circuit at `:51-53`. ⚠⛔⛔ **BUT ⛔ ONLY TWO OF THE THREE REACH THIS PRESENTER — 11b.2a's D6(a) DROPPED THE THIRD.** The `anonymized` kind is ⛔ **not** mirrored here: D5 omits the contributor's row entirely, so ⛔ no producer can hand this presenter an `anonymized` operand. ⇒ the local mirror is **`name | unknown`** (AC3), and ⛔ **this module declares ⛔ NO `member.anonymousMember` key** — the duplicate an earlier pass mandated, and the whole `common`-vs-`contribution` crash analysis built on it, are both **GONE** (11b.2a Task 6 routes both by line: *"⛔ **BOTH GO.** ⭐ The crash they mitigate is a crash on a row that can no longer exist"*). ⚠ Read this row for the **`unknown`** semantics only (`:54-55`); ⛔ the `anonymized` branch here is `@twt/domain`'s business, ⛔ not this module's. |
| ⭐⛔ The **`t()` CALL SHAPE** — ⚠ this row REPLACES the two-namespace crash ground, which D6(a) removed | ⛔⛔ **`t(key, params?, options?)` — THE NAMESPACE IS THE *THIRD* ARGUMENT (`resolver.ts:53`), AND GETTING THIS WRONG IS A GUARANTEED THROW ON *EVERY* ROW.** `TranslateParams = Record<string, string\|number>` (`:31`); `namespace` is a field of `TranslateOptions` (`:23-28`). ⇒ `t(key, {namespace})` puts the namespace in the **params** slot, leaves `options` undefined, `namespace` defaults to `'common'` (`:55`), the `contribution` key is absent, and `:63-64` **throws**. ⚠⛔ **An earlier pass prescribed exactly that call in AC3's verbatim doc-block** — the artefact 11b.2b's consumer reads — so the AC written to prevent a crash shipped the crash, on a `renderItem` hot path (Trap 4). ⇒ **`t(key, params, { namespace })`**, always. → **AC2, AC3**. |
| The **existing `contributor_list.*` keys** | ✅ `contribution.json:30-39` — `confirmed_header · empty · no_pool · pending_strip · pending_strip_a11y · row_a11y · title · view_cta · view_cta_a11y · view_cta_hint`. ⭐ **Reuse them; ⛔ mint nothing.** ⚠ `row_a11y = "{name}, confirmed contributor"` takes a **`{name}` param** — see AC3. |
| The `@twt/tokens` roles | ✅ `packages/tokens/src/tokens.ts:42 'status-confirmed'` · `:45 'status-held'`. ⛔ The presenter emits the role **NAME**, ⛔ never a hex. |
| The **status-pill presenter** is reusable as-is | ✅ `packages/ui/src/status-pill/` — `deriveStatusPillViewModel(status)`, 5 states, `satisfies Record<ContributionStatus,…>`. ⚠ Reusable ⛔ only if a row HAS a status — and the 8.3 contract deliberately gives it none. → **D2**. |
| The **matrix Tier-1 allowlist** | ⛔ **TWO ENTRIES, NEITHER A CONTRIBUTOR.** `matrix.ts:392-404` (⚠ the `Map` literal CLOSES at `:404`): `member-directory.member_name` (`:394`) · `sahyog-drive.deceased_member_name` (`:403`). The third widening (`2026-08-28-165` cl.1) is **four nominee-bank fields** on `sahyog-vivran` (`account_holder_name · account_number · ifsc · vpa`), added by **11b.3** at surface declaration — ⛔ not yet in the file. `:390-391`: *"do NOT 'fix' a failing third entry by appending it here — that inverts the control. The gate failing is the gate working."* |
| The **contributor NAME FORM** is ruled | ⛔ **NO — unruled since 2026-08-19, re-affirmed undisturbed by D10 and at `.decision-log.md:1061`.** ⚠⛔ **THE COUNTERWEIGHT IS ⛔ NOT "EXACTLY ONE" — THAT CLAIM WAS FALSE AND WAS ASSERTED THREE TIMES.** **THREE** committed `epics.md` lines assume first-name + last-initial **for contributors**: ⭐ **`:3145`** (Story 8.3's own "I want", and the load-bearing one — it names the audience as *"any pool member viewing the My Pool card **or any visitor on Sahyog Drive (Epic 11b)**"* and specifies *"(first-name + last-initial only)"*) · **`:3238`** (the receipt PDF embeds the contributing member's *"first-name + last-initial"*) · **`:4931`** (this story's epic AC). ⚠⛔ **`matrix.ts:401-402` is still ⛔ NOT one of them** — read in full it is about the **DECEASED MEMBER's** name on 11b.3 / 11b.6, ⛔ not a contributor's. ⇒ ⭐ **"unruled" still survives, and the reason is unchanged: ⛔ an epic AC is ⛔ not a ruling.** But it survives against **three** assumptions, ⛔ not one — ⛔ do not restate the count as one. → **D7-nameform**. |
| The **UX-spec column inventory** is buildable | ⛔ **NO — 3 of 10 have no substrate, 2 labels are microcopy-PROHIBITED.** Inventory at `ux-design-specification.md:1158` **only**: `Donation ID · Member ID · HRMS · Donor Name · School · District · Block · Pool · Late Teacher · Date`. No `donation_id` in `packages/`; no HRMS field; `Member ID` on a public wire is what 11a.3's handler refuses in terms. `microcopy.yaml:42` bars *"donor"*, `:48` bars *"Late Teacher"* (both `member_only: true`). ⭐ `deferred-work.md:121` names THIS STORY as the trigger, and it has FIRED. → **D6**. |
| The `<ContributionListTable>` **stat-cards strip** | ⛔ **NO PRODUCER, NO OWNER** — `ux:1788` names it; C-3 (`epics.md:4799`) records *"NO PRODUCER \| No owner"* and `-154` declined to settle it (*"a settled **shape** is ⛔ not a settled **source**"*). ⛔ Out of scope; ⛔ do not stub it. |
| A public surface can reach 50,000 rows | ⛔ **NO — 10,000, BY CONSTRUCTION**, and the file says so itself at `apps/public/src/lib/pagination.ts:57`: *"At the 50-row cap, page 200 is row 10,000."* ⚠ `pagination.ts:39` / `:65` are **re-exports**, ⛔ not the literals (the file says so at `:32-34`, `:59-62`); the literals live at `packages/contracts/src/_common/pagination.ts:26` (`= 50`) and `packages/contracts/src/public-pages/directory.ts:48` (`= 200`). ⭐ **AND THE UX SPEC RESOLVES THIS AT `:2165`**: *"This is a **performance contract**, not an implementation specification. The implementation may use windowing …, **pagination**, infinite scroll, or any combination."* ⇒ 50k/10k bind the component's **behaviour under load**, ⛔ not a page's row budget. |
| The **a11y gate** | ⛔ **NO CI GATE EXISTS** — 19 gate directories in `scripts/`, none a11y. Family 13 of `_bmad/custom/load-bearing-invariant-checklist.md:72` is live on merge via `bmad-code-review.toml:9-11`. ⚠⛔ **BUT ⛔ DO NOT EXPECT IT TO BE SKIPPED HERE.** `bmad-code-review.toml:10` evaluates *"only checklist families **the diff actually touches**"* — and this diff **does** touch accessibility: AC3 emits `rowA11y` and specifies the nested `{name}` resolution. ⇒ the Auditor's verdict here is **covered-by-construction** (state the structural reason: family 13's four checks are RN-shaped and ⛔ not constructible in a headless presenter), ⛔ **never "skipped"**. **Mechanization** lands in 11b.2b. |
| i18n registration | ⭐ The `contribution` namespace is **already registered at all three `catalog.ts` sites** (imports `:29-56` — ⚠ not `:29-54`; `catalogs` map `:63-66`; `KNOWN_NAMESPACES:69`) **and already globbed** (`microcopy.yaml:317-318`). ⇒ **reuse it.** ⚠ `common` is likewise already registered. |
| `.decision-log.md` head | `2026-08-28-167`. ⛔ **Do not hardcode the next number** — read the head **live** at implementation time. |

---

## ⛔ THE FOUR TRAPS

### Trap 1 — ⭐⛔ "VIRTUALIZED COMPONENT IN `packages/ui`" IS TWO WORDS THAT CANNOT BOTH BE TRUE.

A pure `(input) → view-model` function has ⛔ no scroll container, ⛔ no viewport, ⛔ no mount
lifecycle. **Virtualization is a render-layer property, always.** ⇒ the epic AC's *"virtualized
components … as extensions of `packages/ui`"* is satisfied by **splitting the noun**: this story owns
the row's **content contract**; **11b.2b** and a future Astro layer own the **windowing**.

⚠ ⭐ **The presenter must be virtualization-friendly BY SHAPE, and that is a real constraint:** a
windowing render layer calls the row presenter **once per visible row, on every scroll frame**. ⇒
author **`deriveContributionRowViewModel(row)`** — per-row, allocation-light. ⛔ Do **not** author a
`deriveContributionListViewModel(rows[])` that maps the whole set.

### Trap 2 — ⛔⛔ THE STATUS PILL IS A CONTRADICTION, ⛔ NOT A FEATURE.

`pool-contributor-list.ts:39-40` (⚠ the sentence WRAPS the two lines): *"No status field: **a row's mere presence means confirmed**."* Adding
`status` to feed a pill would (a) break the `.strict()` shape test that exists to reject it, (b)
re-open the yellow/attested door 8.3 and 9.5 closed **structurally**, and (c) render a pill whose
value is a constant. ⚠ ⛔ **Do not "satisfy" the AC by hard-coding `'green'` either** — that is a
decoration asserting a fact it did not check. → **D2**.

### Trap 3 — ⭐⛔ THE PRESENTER MUST NOT IMPORT `MemberDisplayName` FROM `@twt/domain`.

The obvious way to type the `name | unknown` variant (⚠ **two kinds** — D6(a) dropped `anonymized`;
`@twt/domain`'s own union still has three, which is exactly why a blind import is wrong) is
`import type { MemberDisplayName } from '@twt/domain'`. That **(a)** violates AC1's dependency
invariant, **(b)** trips [[project_contracts_domain_bundle_boundary]] (leaks `pg` into the RN Metro
bundle), and **(c)** is exactly the [[project_type_only_import_cycle_trap]] shape — it typechecks,
lints and passes local tests while breaking **consuming** packages at runtime.

⭐ **9.12 already solved this and you should copy the solution, not rediscover it:**
`pool-progress/view-model.ts:17-29` — doc-block at `:17-24` (the sentence that carries it is `:20`),
**declaration** at `:25-29` — declares a **local structural type** mirroring the contracts DTO and
says so in the doc-block. Do the same for the display-name variant. ⚠ Note the honest difference:
9.12's really is *structural* (field-identical to the DTO); ours mirrors **a SUBSET of the kind tags** —
`name | unknown`, ⛔ deliberately **not** `@twt/domain`'s third (`anonymized`), because D5 means no
producer can emit it here. ⭐ **Say that in the doc-block**: a future reader who diffs the two unions
must find the omission explained, ⛔ never look like drift.

### Trap 4 — ⚠ A THROWING PRESENTER ON A SCROLL HOT PATH.

9.12's code review found — independently, in all three layers — *"unguarded
`derivePoolProgressCardViewModel(...)` throw wired into a fail-soft-designed render path"*, resolved
by wrapping the **consumer** call in try/catch. ⚠ **The blast radius is strictly worse here:** 9.12's
consumer is one card; this presenter's consumer is a FlashList `renderItem`, called per visible row
per scroll frame. A throw there red-boxes the list.

⇒ **This story's half:** the presenter **surfaces** corrupt operands (⛔ never silently renders a
blank where a name belongs) **and its doc-block states, in terms, that it throws and that every
consumer owes a try/catch.** ⭐ **11b.2b's half is the try/catch.** ⛔ Neither half is optional, and
the presenter must not be authored as if the consumer will remember.

---

## Acceptance Criteria

### AC0 — The rulings are TRANSCRIBED into `.decision-log.md` before any code

`.decision-log.md` gains **one dated decision** whose clauses transcribe **ALL NINE** from this
file's Decisions section — **one clause each**, the **ground quoted verbatim**, the number read
**live** from the head (`2026-08-28-167`, ⭐ **re-verified unmoved at the third validation pass** —
the siblings minted into their story files only; ⛔ never hardcoded):

**D1** (ruled by construction) · **D2(a)** · **D6-uxspec(a)** · **D7-nameform(a)** · **D8(a)** ·
**D9(a)** · **D11-outputshape(a)** · **D12-refscope(a)** · **D13-numbering(a)**.

⚠⛔ **NINE, ⛔ NOT FIVE — and the count was wrong in four places until 2026-08-30.** The banner said
*"ALL FIVE"* while this AC listed six; **D1** — whose entire content is the correction that the Astro
layer is deferred *because there is no host*, ⛔ **not** because C-1 forbids the dep — is precisely the
clause that fell out of the log when a reader trusted the banner.

⚠⛔ **AND EVERY CROSS-STORY CITATION IS QUALIFIED BY ITS OWNING STORY (D13-numbering(a)).** Write
*"11b.2's D8(a)"*, *"11b.2a's D6(a)"* — ⛔ never a bare `D6`/`D7`/`D5`. **Three** live collisions exist
across this sibling set (this story's D6/D7 vs 11b.2a's; `D5` vs `D5-prototype` in 11b.2b; this
story's D9 vs the DECISION LOG's own D9 in `2026-08-24-159` cl.11).

⛔⛔ **The dev agent does ⛔ not author, ⛔ not paraphrase, ⛔ not re-ground and ⛔ not re-scope them.**
⚠ If any decision in this file reads UNRULED, **STOP and report blocked**
([[feedback_supersede_never_reinterpret]]). It lands in its **own** commit, `governance:` prefixed,
**before** the first line of `packages/ui/src/contribution-list/`
([[feedback_governance_commits_precede_implementation]]).

⚠ **Why this is an AC and not only a Task:** without it a reviewer can walk AC1→AC8, find every box
ticked, and pass the story with an **empty decision log** — leaving the shipped code resting on
rulings that exist only inside a story file. That is the decay shape D6-uxspec(a) and D3-rollout(a) each name
by example.

### AC1 — The presenter is the SIXTH `@twt/ui` module, headless, and per-row

`packages/ui/src/contribution-list/` ships on the `pool-progress` shape **minus its `constants.ts`**
(this module has no token constant) — `index.ts` · `view-model.ts` · `presenter.ts` · `i18n-keys.ts` —
barrelled from `packages/ui/src/index.ts` with a per-story annotation matching the file's existing
style. ⚠ **Four files TODAY; a fifth is permitted** — the What-exists table is explicit that the fifth
slot is ⛔ not a closed set, so **every scan in this story enumerates the directory, ⛔ never a literal
file list**.
**And** the module's own `index.ts` uses **explicit named exports** on the `pool-progress/index.ts`
precedent (the presenter fn, the ref record, and `export type` for the declared types) — ⛔ not a
blanket `export *`. (It is `packages/ui/src/index.ts` that `export *`s the module.)

**And** it is **strictly pure**: ⛔ no `react` / `react-native` / `astro` import, ⛔ no DB, ⛔ no API
call, ⛔ no resolved copy (i18n **KEYS** only), ⛔ no palette (`@twt/tokens` role **NAMES** only), ⛔
no numeral or currency formatting. Same input → same output.
**And** ⛔ it does **not** import from `@twt/domain` — the display-name variant is a **local
structural type** with a doc-block saying why (Trap 3).
**And** `packages/ui/package.json` `dependencies` stays **exactly `@twt/contracts`** — a test asserts it.
⚠⛔ **THAT TEST DOES ⛔ NOT CLOSE THE REAL HOLE, AND ⛔ DO NOT BELIEVE IT DOES.** *"`dependencies` is
exactly `{@twt/contracts}`"* **already entails** *"`@twt/tokens` ∉ `dependencies`"*, so an extra
assertion to that effect adds ⛔ zero coverage — an earlier pass prescribed exactly that, and it is
**redundant, ⛔ not protective**. The real risk is a **value import of the `devDependency`**, which
typechecks, ships, and becomes a real bundle edge for `apps/mobile` while `dependencies` stays
untouched. ⭐ **The only thing that catches it is AC5(a)'s parsed-import scan**, which bans
`@twt/tokens` by specifier. ⛔ Neither test is optional and ⛔ neither substitutes for the other.
**And** the ROW presenter is **`deriveContributionRowViewModel(row)`** — one row in, one view-model
out. **Mechanically asserted, ⛔ not asserted as a wish** — and in **two** halves, because the text half
alone is a proxy:
 **(a) the source half** — over **all** files in the module (`readdirSync`, comment-stripped by the
     same helper AC5 uses; ⛔ not `presenter.ts` alone, since a mapping helper parked in
     `view-model.ts` defeats a single-file scan): no `.map(` / `.flatMap(` / `.forEach(` / `.filter(`
     / `.reduce(` / `Array.from(` / `for` / `while` / `do` **construct** appears — ⭐ **matched with
     `\b` WORD BOUNDARIES, ⛔ never as bare substrings**:
     `[/\.map\(/, /\.flatMap\(/, /\.forEach\(/, /\.filter\(/, /\.reduce\(/, /\bArray\.from\(/, /\bfor\s*\(/, /\bwhile\s*\(/, /\bdo\s*\{/]`
     ⚠⛔⛔ **THE WORD BOUNDARIES ARE LOAD-BEARING IN BOTH DIRECTIONS, AND AN EARLIER PASS GOT THIS
     EXACTLY BACKWARDS.** It ordered bare-substring matching (*"note `for` and `while` **without** a
     trailing space"*) — which makes the scan **unsatisfiable**, because **`rea`⟨`do`⟩`nly` contains
     `do`**, and AC3's types declare `readonly` on **every field**. The shipped
     `contribution-disclosure/view-model.ts` has ten. ⇒ that scan red-fails on the first file written,
     and the cheapest repair is deleting `do`/`for`/`while` — gutting the half with real teeth.
     ⭐ `/\bfor\s*\(/` catches `for(` **and** `for (` while ⛔ never firing on `before`, `format` or
     `readonly`.
 **(b) ⭐ the compile half, which is the one with real teeth** — a runtime test cannot see a
     TypeScript parameter type, so assert it as a type:
     ```ts
     type _P = Parameters<typeof deriveContributionRowViewModel>[0];
     type _NotArray = [_P] extends [readonly unknown[]] ? never : true;
     const _assertNotArray: _NotArray = true;
     void _assertNotArray;   // ⚠ REQUIRED — see below
     ```
     — an array parameter then fails `pnpm turbo run typecheck` (`scripts/ci-local.sh:41`). ⭐ Verified:
     the negative case yields `TS2322: Type 'true' is not assignable to type 'never'`, and
     `packages/ui/tsconfig.json` includes `tests/**/*`, so the assertion is inside the typecheck program.
     ⚠⛔ **`void _assertNotArray;` is ⛔ NOT stylistic — without it `eslint .` fails at
     `ci-local.sh:40`, one line BEFORE typecheck.** `@twt/eslint-config-twt` spreads
     `tseslint.configs.recommended` with ⛔ **no `varsIgnorePattern`** (`index.js:39`), so the
     `_` prefix exempts nothing. ⭐ In-repo precedent: `packages/contracts/tests/rules.test.ts:56-58`.
     ⚠ The `[_P] extends [...]` **tuple wrapping** is deliberate — it suppresses distribution, so a
     `Row | Row[]` signature cannot slip through.
⛔ There is **no** function in this module that maps or iterates a full row set.

### AC2 — ⭐ Every emitted i18n reference carries its NAMESPACE ✅ `[D12-refscope(a) RULED]`

The view-model emits **`{ key, namespace }` pairs**, ⛔ never bare string keys.

⚠⛔⛔ **THE ORIGINAL GROUND IS GONE, AND THE MECHANISM SURVIVES ANYWAY — ⛔ DO NOT RESTATE THE OLD ONE.**
Until 2026-08-30 this AC was grounded on a **two-namespace crash**: `member.anonymousMember` in
`common` vs `contributor_list.*` in `contribution`. **11b.2a's D6(a) deleted that ref**, so this module
now spans **ONE** namespace and ⛔ that crash can no longer occur. ⭐ **D12-refscope(a) re-grounds the
AC rather than dropping it**, on two grounds that are live today:
 **(1) 11b.2b's AC6 depends on it by name** — it de-duplicates against *"11b.2's AC2 … which already
     owns a `packages/i18n`-backed test for all ten `contributor_list.*` keys"* and ⛔ **writes no
     second one**. Falling back to a per-module constant silently breaks a sibling's shipped AC.
 **(2) a per-ref shape lets a second namespace return without a breaking change** — 11b.3's Astro
     producer is the named candidate. A per-**module** constant cannot express two, which is the
     property this AC was always really buying.
⇒ **the union NARROWS to `'contribution'` only.** ⛔ Do ⛔ not keep `'common'` as a speculative member:
that is the vacuous-branch posture 11b.2a's D6(a) rejected by name, one type down.

⚠⛔ **AND THE REAL CRASH IS NOW THE CALL SHAPE, ⛔ NOT THE NAMESPACE CHOICE.** `t(key, params?,
options?)` — **the namespace is the THIRD argument** (`resolver.ts:53`). `t(key, {namespace})` puts it
in the **params** slot, `namespace` falls back to `'common'` (`:55`), and `:63-64` **throws** — on
**every** row, ⛔ not one. See AC3's `rowA11y` doc-block, which now carries the correct call.

```ts
/** An i18n key plus the namespace it resolves in. `t()` defaults to `common` and THROWS on a miss
 *  (resolver.ts:55, :63-64), so a BARE key forces the render layer to guess.
 *  ⚠ Every key this module emits lives in `contribution` (contribution.json:30-39). The namespace is
 *  carried per-REF anyway — 11b.2b's AC6 reads this record, and 11b.3 may add a second namespace.
 *  ⛔ Do NOT collapse this to a module-level constant (D12-refscope(a)).
 *  ⚠⛔ CALL SHAPE: t(key, params, { namespace }) — the namespace is the THIRD argument. */
export interface ContributionListI18nRef {
  readonly key: string;
  readonly namespace: 'contribution';
}
```

⭐ **The interface is declared in `view-model.ts`**, ⛔ not `i18n-keys.ts` — `view-model.ts` owns the
ref **type**, `i18n-keys.ts` imports it and owns the ref **values**. ⚠ Without this, AC3's block
(which *uses* `ContributionListI18nRef`) transcribed "verbatim" fails `tsc` on an undefined name —
a build break on the first file written.

**And** `i18n-keys.ts` exports the refs as **one iterable record**, ⛔ not loose consts:
`export const CONTRIBUTION_LIST_I18N_REFS = { … } as const satisfies Record<string, ContributionListI18nRef>;`
⚠ The AC2 test is only writable against an **iterable** export; against loose consts it enumerates by
hand and is **vacuous by construction**.

**And** it declares refs for **all ten** `contributor_list.*` keys — ⛔ **and ⛔ NOT
`member.anonymousMember`, which 11b.2a's D6(a) removed** (nothing can render it; the un-linked
duplicate an earlier pass mandated is **gone**, and its deletion question is 11b.2a's Task 6, ⛔ not
this story's). ⛔ Do not declare refs for **only** the one key this row presenter emits.
⭐ **Ground:** the **NINE** list-level keys (`confirmed_header · empty · no_pool · title · view_cta ·
view_cta_a11y · view_cta_hint · pending_strip · pending_strip_a11y`) — ⚠ **nine, ⛔ not the "eight" an
earlier pass wrote while listing nine** — have ⛔ no emitter here (Trap 1 forbids a list presenter) but
**will** be consumed by 11b.2b, and a bare key there is this AC's crash one story later. ⇒ this row
presenter emits exactly **ONE** of the ten (`row_a11y`).

⚠ ⭐ **`pending_strip` / `pending_strip_a11y` ARE A DELIBERATE EXCEPTION TO AC4's BANNED-TOKEN LIST, ⛔
NOT A VIOLATION.** They are the **aggregate** signal (`pool-contributor-list.ts:59-65`), ⛔ not a
per-row identity field. AC4's ban is over the **row type's flattened key set** only — see AC4(c)'s
scope clause. ⛔ Do not delete a required ref to make a scan green.

**And** a unit test asserts **every declared ref** resolves in the namespace it claims, in **both**
locales, by reading the locale JSON — ⛔ not by restating the pairing in the test, and ⛔ not only over
the emitted subset.

⚠⛔ **AND THE TEST READS JSON FROM DISK — IT CANNOT CALL `t()`, AND THAT IS A KNOWN, RECORDED
WEAKNESS.** `@twt/i18n` is ⛔ not a dependency **or** devDependency of `@twt/ui` (verified), and
`packages/ui/package.json` is READ-ONLY here — so "assert copy **through** `t()`" is unavailable.
⭐ **Two in-package tests already solve the disk read; copy one, ⛔ do not add the dep:**
`packages/ui/tests/member-status/presenter.test.ts:277-283` (which states the reason in terms —
*"Read from disk rather than importing `@twt/i18n`: `@twt/ui` deliberately does not depend on it"*)
and `packages/ui/tests/contribution-disclosure/presenter.test.ts:342` (the `import.meta.url`-relative
variant). ⚠ Reading around `t()` **is** the shape of the 11a.2 defect — record it as a limitation and
route "a `t()`-through assertion for `@twt/ui`'s emitted keys" as deferred work under Task 3,
triggered by **11b.2b** (which *can* call `t()`).

⚠ ⭐ **A weaker form of this already ships and you should be consistent with it:**
`packages/ui/src/contribution-disclosure/i18n-keys.ts:19-20` exports a module-level namespace constant.
AC2 is deliberately **stronger** — per-**ref**, not per-**module**. ⚠⛔ **The reason is ⛔ NO LONGER
"this module spans two namespaces"** (D6(a) made it span one) — it is **D12-refscope(a)**'s two grounds
above: 11b.2b's AC6 reads this record by name, and a per-ref shape absorbs a second namespace without
a breaking change. ⛔ Do not "simplify" it back to the weaker form.

### AC3 — The shape, written out ✅ `[D2(a) · D8(a) · D9(a) · D11-outputshape(a) RULED]`

⚠⛔⛔ **REWRITTEN 2026-08-30 (third validation pass). THREE of this AC's subjects were ABOLISHED by
rulings that post-dated it:** 11b.2a's **D5** (RTBF omits the contributor) · **D6(a)** (⛔ no
`anonymized` presenter variant) · the **D3-shape(i) / D3-key vacations** (⛔ no `rowKey` anywhere).
⭐ **D11-outputshape(a)** then ruled the view-model's output union down to a single arm. ⛔ Do not
restore any of it from an older copy of this file.

`view-model.ts` declares these types. ⭐ **The invariant is the SHAPE; the doc-block carries it, the
way `pool-progress/view-model.ts:9-15` does.**

```ts
/** Confirmed-only, by SHAPE (Stories 8.3 + 9.5). The INPUT carries NO way to express
 *  yellow/pending/attested/projected/utr/status — a row's mere presence means confirmed
 *  (pool-contributor-list.ts:39-40). Adding such a field is the one change this module exists to forbid.
 *  ⛔ Local KIND-TAG mirror of @twt/domain's MemberDisplayName — NOT imported (Trap 3).
 *  ⚠ It mirrors a SUBSET of the discriminants, and the omission is DELIBERATE: domain has
 *  'name' | 'unknown' | 'anonymized'; this has only 'name' | 'unknown', because 11b.2a's D5 omits an
 *  RTBF'd contributor's ROW ENTIRELY ⇒ no producer can hand this presenter an 'anonymized' operand
 *  (11b.2a D6(a): "the contributor row has exactly ONE kind, everywhere"). NOT drift. */
export type ContributionRowDisplayName =
  | { readonly kind: 'name'; readonly firstName: string; readonly lastInitial: string }
  | { readonly kind: 'unknown' };

export interface ContributionRowInput {
  readonly displayName: ContributionRowDisplayName;
  readonly poolLetterCode: string;
}

export interface ContributionRowViewModel {
  /** Name PARTS, and ONLY name parts. The presenter NEVER joins firstName + lastInitial: the
   *  contributor name FORM is UNRULED (D7-nameform(a)), AC6 item (iii) routes it to the Panel, and
   *  joining it here would RULE it. D9(a). Single-arm by D11-outputshape(a) — the 'literal' and
   *  'i18n' arms were dropped once D6(a) left them with zero possible emitters. */
  readonly displayName:
    | { readonly kind: 'nameParts'; readonly firstName: string; readonly lastInitial: string };
  readonly poolLetterCode: string;
  /** `contributor_list.row_a11y` = "{name}, confirmed contributor" — takes a `{name}` param the
   *  presenter does NOT fill. The consumer resolves in TWO steps, in this order:
   *    1. resolve `displayName` — join .firstName + .lastInitial per the ruled form
   *    2. t(rowA11y.ref.key, { name: <step 1> }, { namespace: rowA11y.ref.namespace })
   *  ⚠⛔ t(key, params, options) — the NAMESPACE IS THE THIRD ARGUMENT (resolver.ts:53). Passing it
   *     second puts it in the params slot, silently falls back to the 'common' namespace, and THROWS
   *     (resolver.ts:55, :63-64). The {name} value is a PARAM and belongs in the second slot.
   *  ⛔ The presenter composes neither string. */
  readonly rowA11y: { readonly ref: ContributionListI18nRef };
}
```

⚠ ⭐ **THE INPUT IS ⛔ NOT THE WIRE ROW, AND THE DIFFERENCE IS DELIBERATE.** The shipped wire row is
`ConfirmedContributorRow = { firstName, lastInitial }`, `.strict()`
(`pool-contributor-list.ts:42-51`) — ⛔ **no `kind`, ⛔ no `rowKey`** (11b.2a's AC4/AC5 are **VACATED
by D5**: *"⛔⛔ DO NOT WIDEN `ConfirmedContributorRow`. DO NOT ADD `kind`. DO NOT ADD `rowKey`."*), and
`letterCode` lives **once per response** on the `pool` identity block (`:73-80`, `:94`), ⛔ **not per
row**. ⇒ a render layer must **ADAPT**: wrap the name fields as `{kind:'name', …}` under `displayName`
and splice `pool.letterCode` onto each row. ⛔ **This presenter does not do that and must not** — an
adapter that reads a *response* shape is not framework-free and would take a build dependency on the
contract, breaking the parallelism.
⭐✅ **The adapter is 11b.2b's AC9, and that obligation is ⛔ NO LONGER OUTSTANDING** — it was
**discharged 2026-08-30** (`4bbe28b`), and 11b.2b's Task 2 builds it. ⇒ Task 3 records it
**"Discharged by 11b.2b's AC9"** ([[feedback_closure_language_precision]]) — ⛔ never re-files it as
*"11b.2b does not currently own it in an AC"*, which is **false on the day it would be written**.
⚠⛔ **And ⛔ do NOT tell the adapter to carry a `rowKey`:** 11b.2b's AC9 *"supplies ⛔ NO `rowKey`"* and
forbids inventing one. An earlier version of this paragraph ordered the adapter to produce a field its
own AC forbids.

⚠ **AC3 rests on rulings owned by a story running in PARALLEL, and they have already moved once.**
The re-read obligation now lives in the **Preflight**, as STEP 1 and as a STOP condition — ⛔ not here,
because a warning buried mid-AC guards one file while seven were affected.

**And ⛔ TWO kinds, not three — and ⛔ not one.** `resolveMemberDisplayName` returns
`name | unknown | anonymized` (`display-name.ts:36-39`), but only **two** can reach this presenter:
`anonymized` is abolished by D5/D6(a), and `unknown` fires on a null name (`:54-55`). The presenter
handles both with an **exhaustive `never` check over the kind discriminant**, ⛔ never a silent
fall-through to a blank name.

⭐ **AND `unknown` HAS A RULED OUTPUT — ⛔ IT IS NOT LEFT TO THE IMPLEMENTER. `[D8(a) RULED]`**
**`unknown` THROWS, and ⛔ NO KEY IS MINTED FOR IT.** ⚠ This is a **posture**, ⛔ not an oversight:
 · ⛔ **`{kind:'literal', value:''}` is FORBIDDEN** — a blank where a name belongs, banned below.
 · ⛔⛔ **REUSING `member.anonymousMember` IS FORBIDDEN — AND SINCE 2026-08-30 IT IS ALSO IMPOSSIBLE.**
   It would tell every reader *"this person exercised their right to erasure"* when the name was merely
   **null** — a **false statement about a data-subject right**. ⭐ 11b.2a's D6(a) then deleted the ref
   from this module altogether, so the option can no longer be taken even by accident. ⚠ **The
   prohibition is kept, ⛔ not deleted**: it records *why* the branch throws rather than borrowing copy,
   and a future reader who re-adds a `common` ref must find the reasoning already here.
 · ⛔ **Minting `contributor_list.unknown_contributor` is FORBIDDEN HERE** — no producer can emit
   `unknown` today (11b.2a's boundary `continue`s on a null ciphertext, `handlers.ts:312-318`), so
   the copy would be speculative. ⭐ **11b.3 mints it** at the point a producer that can emit it exists.
⇒ the branch is kept, **throws**, and is recorded **un-attested / unexercised**
([[feedback_record_unattested_no_backfill]]) — ⛔ never written up as tested. ⚠ **11b.2b's try/catch
(Trap 4) is the only thing between this throw and a red-boxed list**, which is why that delegation is
⛔ not optional.

⚠ ⭐ **AND THE WIRE CARRIES ONLY ONE KIND — ⛔ THE "TWO-VARIANT UNION" IS VACATED, ⛔ NOT AMENDED.**
An earlier pass recorded 11b.2a's D3-shape(i) as a ruled two-variant union
(`kind: 'name' | 'anonymized'`, both `.strict()`, both carrying `rowKey`). **D5 vacated D3-shape(i),
D3-key and D3-rollout together** — ⛔ *"their questions ceased to exist; they were ⛔ NOT reversed on
merits"* — because with omission there is **one kind of row and ⛔ no wire change at all**. ⇒ ⛔ that
union **never shipped and never will**; ⛔ do not cite it, and ⛔ do not carry a `rowKey`.
⭐ **The presenter's `unknown` branch nonetheless SURVIVES, and the reason is a real distinction:**
it is a **throwing exhaustiveness guard**, ⛔ not a rendering branch with copy behind it (D8(a)). The
API boundary `continue`s on a null ciphertext (`handlers.ts:312-318`) ⇒ `unknown` is unreachable on
that producer, and a **second** producer (11b.3's Astro path) may legitimately hand it one. ⇒ keep it,
record it **un-attested / unexercised** ([[feedback_record_unattested_no_backfill]]), ⛔ never as
tested. ⚠ **A guard that never fires is working; a render arm that never fires is dead code** — that
is the whole line between `unknown` (kept) and `anonymized` (dropped).

⚠⛔⛔ **AND `rowKey` IS GONE FROM BOTH INTERFACES — THIS EDIT IS COUPLED, ⛔ NOT LOCAL.** Removing it
from the types **must** be done in the same edit as **AC4(a)'s `INPUT_KEYS` literal**, which is typed
`Record<keyof ContributionRowInput, true>`: leave `rowKey: true` there and the literal has an **excess
property** ⇒ `pnpm turbo run typecheck` **fails**. ⚠ The likeliest wrong repair is putting `rowKey`
back on the interface to make the build green — which silently restores the vacated ruling. ⛔ Neither
sibling's routing list named the AC4 literal; it is named here.

**And** ⭐ **THE PRESENTER EMITS NAME PARTS AND ⛔ NEVER JOINS THEM. `[D9(a) RULED]`** For
`kind:'name'` it emits `{kind:'nameParts', firstName, lastInitial}` **unchanged**. ⛔ There is ⛔ **no
`${firstName} ${lastInitial}.`** anywhere in this module. **Ground:** joining them **decides the
contributor name FORM** — the exact question D7-nameform(a) ruled must ⛔ not be ruled and AC6 item (iii)
routes to the Panel; a join here would make that routed deferral **false on the day it is written**,
and would hardcode a Latin-script space-and-period form into a package that must also render `hi`.
⭐ The join is **11b.2b's**, under the form the Panel rules; until then 11b.2b uses the form already
committed at `epics.md:4931` and records it **built-to, ⛔ not ratified**.

**And** ⭐ **THE OUTPUT UNION IS A SINGLE ARM. `[D11-outputshape(a) RULED]`** ⚠ Until 2026-08-30 the
view-model's `displayName` had three arms — `nameParts | literal | i18n`. 11b.2a's **D6(a)** left the
`i18n` arm with **zero possible emitters** (its only emitter was the anonymized row), and the
`'literal'` arm was **already unreachable**, reserved for a pre-composed producer that does not exist.
⇒ **both are DROPPED.** **Ground:** D6(a) rejected *"the unreachable branch preserved as
defense-in-depth"* **by name** on the input side; the same argument holds one type down, and two
un-emittable arms on a hot-path view-model are exactly the vacuous surface this story keeps deleting.
⛔ (b) *keep `literal` as a forward seam* and ⛔ (c) *keep all three for 11b.3* were both rejected:
11b.3 may add an arm **when it has a producer**, and adding one then is not a breaking change.
⇒ ⭐ **`ContributionListI18nRef` survives in the view-model for `rowA11y` ONLY.**
**And** ⭐ **`contributor_list.row_a11y` = `"{name}, confirmed contributor"` takes a `{name}` param.**
The render layer resolves the display name FIRST and passes the result as `{name}` — a **nested,
two-step** resolution, written out in the `rowA11y` doc-block above **because the consumer is a
different file and will read the type, ⛔ not this paragraph**.
⚠⛔⛔ **AND THE CALL SHAPE IN THAT DOC-BLOCK IS LOAD-BEARING — AN EARLIER PASS SHIPPED THE CRASH THIS
AC EXISTS TO PREVENT.** `t(key, params?, options?)` (`resolver.ts:53`): `params` is
`Record<string, string|number>` (`:31`), and `namespace` is a field of `TranslateOptions` (`:23-28`).
The earlier doc-block prescribed `t(rowA11y.ref.key, { namespace: … }, { name: … })` — namespace in
the **params** slot ⇒ `namespace` falls back to `'common'` (`:55`) ⇒ `:63-64` **throws**; and `{name}`
in the **options** slot ⇒ the interpolation token has no param ⇒ `:38-39` throws too. ⚠ **Both calls
threw, on every row, inside a `renderItem` hot path.** ⇒ the ordering is
**`t(key, { name }, { namespace })`**, and it is written into the type where the consumer will read it.
⚠ The `nameParamFrom: 'displayName'` field an earlier pass specified stays **deleted**: a field whose
type admits exactly one value carries ⛔ no information — it is a comment wearing a type, and it did
not encode the two-call ordering.
**And** the presenter's doc-block states **in terms** that it throws on a corrupt operand and that
**every consumer owes a try/catch** (Trap 4).

### AC4 — Confirmed-only is preserved as a SHAPE ✅ `[D2(a) RULED]`

The INPUT type carries ⛔ no `status` / `yellow` / `attested` / `utr` / `pending` / `projected` field.

**And** the anti-widening test copies **ALL THREE HALVES** — the two of the 9.12 precedent
(`packages/ui/tests/pool-progress/presenter.test.ts:151-192`) **plus (c)**. ⚠⛔ **"both halves" was
this AC's own wording until 2026-08-30, and (c) is the half it calls indispensable** — a summary that
says "two" is how (c) gets dropped.
 **(a) the compile half** — `const INPUT_KEYS: Record<keyof ContributionRowInput, true> = { displayName: true, poolLetterCode: true };`
     — ⚠⛔ **TWO keys**, matching AC3's declared input exactly. ⛔ **`rowKey` is ⛔ NOT among them** —
     D5 vacated it (11b.2a D3-key), and this literal is **the coupled edit**: leaving `rowKey: true`
     here while AC3 drops it from the interface makes the literal an **excess property** and
     `typecheck` **fails**. Adding a key breaks the literal as *missing*; removing one breaks it as
     *excess*. ⭐ A unit test cannot assert this at runtime — it asserts it **by being a file that
     fails `pnpm turbo run typecheck`** (`scripts/ci-local.sh:41`).
 **(b) the runtime half** — `for (const banned of BANNED) expect(INPUT_KEYS).not.toHaveProperty(banned)`,
     where `const BANNED = ['status','yellow','attested','utr','pending','projected'] as const;`
 **(c) ⭐ the NESTING + RENAME half — ⛔ WITHOUT IT (a) AND (b) ARE DEFEATED BY ONE WORD.** `keyof` is
     **top-level only**, so `displayName: { kind:'name'; …; status:'confirmed' }` widens the row with
     a status and passes **both** halves; so does any rename — `statusKind`, `pendingCount`,
     `isAttested`, `utrRef`. ⇒ the ban is **transitive and substring-matched**.
     ⚠⛔⛔ **AND THE MECHANISM IS PRESCRIBED, ⛔ NOT LEFT TO THE IMPLEMENTER — BECAUSE `AllKeys<T>` IS A
     TYPE AND `Object.keys()` CANNOT SEE IT.** An earlier pass said only *"build `NESTED_KEYS` over
     it"*, which admits a hand-written `const NESTED_KEYS = ['displayName','kind',…]` — decoupled from
     the types, passing forever, **vacuous by construction**: the exact `38a2d8b` class AC5 cites by
     name. ⇒ **declare it as a TYPED LITERAL so the compiler forces it complete and the runtime can
     read it:**
     ```ts
     type AllKeys<T> = T extends object ? { [K in keyof T]: K | AllKeys<T[K]> }[keyof T] : never;
     const NESTED_KEYS: Record<AllKeys<ContributionRowInput>, true> = {
       displayName: true, kind: true, firstName: true, lastInitial: true, poolLetterCode: true,
     };
     for (const k of Object.keys(NESTED_KEYS))
       for (const banned of BANNED) expect(k.toLowerCase()).not.toContain(banned);
     ```
     ⭐ **Both directions bite, and that is the point:** adding `displayName.status` makes `AllKeys`
     include `'status'` ⇒ the literal is **missing a key** ⇒ `typecheck` fails
     (`TS2741`); adding it to the literal to silence typecheck then fires the runtime substring loop.
     ⚠ Verified: `AllKeys` distributes correctly over the `ContributionRowDisplayName` union (the naked
     `T` in `T extends object` is what makes `keyof` apply per-member), terminates on `string` leaves,
     and compiles clean under `--strict`.
     ⚠⛔ **SCOPE — `ContributionRowInput` AND `ContributionRowViewModel` ONLY.** ⛔ Do **not** run this
     scan over `i18n-keys.ts` or over raw module text: AC2 mandates
     `contributor_list.pending_strip` and `…_a11y`, whose identifiers and key values **contain the
     banned token `pending` BY DESIGN** — they are the **aggregate** signal
     (`pool-contributor-list.ts:59-65`), ⛔ not a per-row identity field. The ban is on a **row's key
     set**, ⛔ never on a copy key. (⭐ `utr` was checked exhaustively and collides with nothing —
     note `contributor` is `c-o-n-t-r-i-b-u-t-o-r`, ⛔ not `utr`.)
     ⛔ A top-level exact-name check alone is a fence with a gate in it.
**And** ⛔ `deriveStatusPillViewModel` is **not** called from this module, and no `'green'` literal is
emitted (Trap 2).

### AC5 — The forbidden-import and death-term scans have teeth

⛔⛔ **THESE ARE TWO TESTS WITH TWO MECHANISMS. ⛔ DO NOT MERGE THEM.** An earlier pass wrote one test
asserting both **on parsed import specifiers** — and a death term is ⛔ **never** an import specifier,
so that half was **true for every possible source file, forever**. That is exactly the class commit
`38a2d8b` closed en masse (*"close five vacuous/gameable review-fence assertions"*), re-created inside
the AC written to prevent it ([[feedback_gate_scope_semantic_coverage]]).

**Both** tests enumerate the module directory with `readdirSync`, ⛔ **never a hardcoded file list** —
a **fifth** file added there is then covered automatically (the What-exists table is explicit that the
fifth slot is ⛔ not a closed set).

**(a) `forbidden-imports.test.ts` — PARSED IMPORT SPECIFIERS.** Assert no import resolves to
`@twt/domain` and none binds `splitFirstNameLastInitial` / `resolvePublicMemberName` /
`resolvePoolIdentity` / `deriveStatusPillViewModel`. **And** ⛔ no import of `react` / `react-native` /
`astro` / `@twt/tokens` — ⚠ AC1's purity clause, which the `dependencies` test alone **cannot see**
(a `devDependency` value import typechecks and ships).

**(b) `death-term.test.ts` — RAW TEXT, over TWO SCOPES, asserting ⛔ ABSENCE IN BOTH.** Assert
`account-frozen`, `account_frozen`, `deceased`, `members.state`, `date_of_death` appear ⛔ nowhere in
the comment-stripped source **and ⛔ nowhere in the stripped-out comments either**. ⚠ **The comment
scope is the point:** the C-5 inversion above enters as an *idea* ("we should exclude deceased
contributors here") before it enters as a conjunct, and a comment is where it lands first.
⚠⛔⛔ **WORDING — AN EARLIER PASS SAID "assert them in the COMMENTS too", WHICH PARSES AS *ASSERT THEM
PRESENT*.** It also called this *"BOTH directions"*, which is wrong twice over: there is **one**
direction (absence) over **two** scopes. A dev who takes the presence reading writes
`expect(comments).toContain('deceased')`, watches it red-fail, and reaches the cheapest green — **adding
a death term to a doc-block**, manufacturing the exact artefact this AC exists to keep out.
⇒ ⛔ **NOTHING in this AC ever asserts a death term is PRESENT.**
⇒ ⚠ The Trap 3 / AC3 doc-blocks must therefore name the forbidden **import symbols** without naming
any **death** term. That is achievable, and it is a real constraint on how those doc-blocks are worded.

⚠ **Comment-stripping is required for (a) and for (b)'s first half** — the doc-blocks must *name* the
forbidden symbols in order to forbid them, and an un-stripped scan false-positives on its own
documentation, after which the next dev weakens the scan. ⭐ **Copy the helper, ⛔ do not re-invent
it:** `apps/mobile/tests/unit/status-pill-render.test.ts:31-32` (the implementation; `:16` is the
rationale).

**And** ⛔ no `'green'` string literal appears anywhere in the module (Trap 2, AC4).

### AC6 — The deferrals are routed, each with a written trigger, ⛔ none marked closed ✅ `[D7-nameform(a) RULED]`

⛔ `@twt/ui` is **not** added to `apps/public/package.json`; ⛔ no `.astro` component is authored; ⛔
no matrix surface or field is declared. ⭐ **The ground is that no host exists** (11b.3 is `backlog`)
— ⛔ **not** that C-1 forbids the dep. C-1 **pre-authorised** it as *"an ordinary dependency
addition"* (`.decision-log.md:1741`), so the routing note must say **deferred**, ⛔ never **blocked**.

⚠⛔ **LETTERING — READ THIS BEFORE WRITING A SINGLE ITEM.** `deferred-work.md` **already carries an
unqualified (a)…(j) belonging to 11b.1** (`:21`–`:179`, including the item (e) at `:89` and the item
(f) at `:104` this story cites). ⛔ Filing a *second* (a)/(b)/(e) beside them is a guaranteed
mis-read. ⇒ **this story's items are numbered `11b.2 (i)` … `11b.2 (vi)`**, section-qualified, and
the AC text below uses roman numerals throughout. ⚠ Where this story says *"item (e)"* or *"item (f)"*
it means **11b.1's**, ⛔ never one of these.
⚠⛔ **AND THAT RULE APPLIES TO THIS AC's OWN PROSE — IT WAS VIOLATED HERE UNTIL 2026-08-30.** A
paragraph below referred to *"**(b)**"* meaning **this story's item (ii)**, 38 lines after the rule
above says a bare letter means 11b.1's. ⛔ Never write a bare letter for one of these items.

Route into `deferred-work.md` in the precise closure language ([[feedback_closure_language_precision]]),
⛔ **none marked closed** — ⚠⛔ **SIX items** (⭐ it was **seven** until 2026-08-30; the old item (vi)
is deleted — see below — and the count now agrees in **all three** places it appears: this AC, Task 3,
and the Project Structure table, which said *"four"* for two revisions):
 (i)   **the Astro contributor render layer** — trigger: **Story 11b.3 authoring** (it owns the host);
 (ii)  **a contributor name at `public` tier** — trigger: **a Panel ruling adding a `(surface, field)`
       pair to `matrix.ts:392`**, ⛔ never a code edit;
 (iii) **the contributor NAME FORM** — trigger: **its own Panel ruling**. ⚠ D9(a) is what keeps this
       item **true**: the presenter emits name parts and never joins, so nothing in this story
       decides the form;
 (iv)  **`<StatCardStrip>`** — trigger: **C-3's producer**, ⛔ unowned;
 (v)   **the `governance:` commit prefix is formally invalid** under the checked-in
       `commitlint.config.js` (`type-enum` left at conventional's default), surviving only because
       commitlint is wired to **nothing** — no `commit-msg` hook (`core.hooksPath` = `.githooks`,
       which holds only `pre-push`), absent from `ci-local.sh` and from CI — trigger: **any story
       that wires commitlint into a hook or a CI leg**. ⚠⛔ **This item is ⛔ not optional and ⛔ not
       new:** `sprint-status.yaml` and **11b.2a both record that THIS story's Task 3 writes it**, and
       an earlier pass left it in Dev Notes prose while AC6 said "four items" — the exact way a
       cross-referenced obligation evaporates;
 (vi)  **no `t()`-through assertion for `@twt/ui`'s emitted keys** — AC2 reads locale JSON from disk
       because `@twt/ui` cannot depend on `@twt/i18n`; that is the 11a.2 defect's shape, recorded as
       a known limitation — trigger: **11b.2b** (which *can* call `t()`).

⛔⛔ **THE OLD ITEM (vi) — the un-linked `member.anonymousMember` duplicate — IS DELETED, ⛔ NOT
RENUMBERED AWAY.** Its subject no longer exists: 11b.2a's **D6(a)** removed the ref from this module,
so there is ⛔ no duplicate to link. ⭐ **And its successor is already owned elsewhere** — 11b.2a's
Task 6 records `ANONYMOUS_MEMBER_I18N_KEY` as *"un-consumed, with ⛔ no named prospective consumer
remaining"* and routes **the deletion question as its own decision**. ⇒ ⛔ **do not file a second
record of one obligation**, and state the omission **at the destination** exactly as the inversion
stub below does.

⛔⛔ **THE PUBLIC/MEMBER INVERSION IS ⛔ NOT FILED HERE — IT IS ALREADY OPEN.** It sits at
`deferred-work.md:97-100` under **11b.1 item (e)** (`:89`), with the same *"binds 11b.2 and 11b.3"*
language. ⛔ Do not write a second record of one obligation. ⚠ **And state the omission at the
destination**, ⛔ not only here — a future reader of `deferred-work.md` sees only what is in
`deferred-work.md`. ⇒ write **TWO** not-recorded stubs there:
`### ⛔ (vii) — INTENTIONALLY NOT RECORDED. The public/member inversion is already open at 11b.1 item (e) (:97-100). ⛔ Do not write a second record of one obligation.`
`### ⛔ (viii) — INTENTIONALLY NOT RECORDED. The un-linked `member.anonymousMember` duplicate ceased to exist when 11b.2a's D6(a) removed the ref; 11b.2a's Task 6 owns the successor deletion question. ⛔ Do not re-file it here.`
**And** ⭐ **item (ii) is a RE-TRIGGER, ⛔ not a new item.** ⚠ (An earlier pass wrote *"(b)"* here —
a bare letter, which under this AC's own lettering rule means **11b.1's** item (b).) Story 8.3's D11 deferred exactly this matrix
entry — prescribing `live-contributor-list` (`first_name` + `last_initial`) — with a re-trigger
naming **Story 11a.1**. 11a.1 is `done` and the matrix still has two pairs. ⇒ the routing note must
record *"8.3 D11's re-trigger fired at 11a.1 and was not acted on"* — ⛔ filing it as fresh is the
exact failure D6-uxspec(b) names, applied to this story.

### AC7 — The Panel packet for D7-nameform is assembled, and it records what is NOT settled ✅ `[D7-nameform(a) RULED]`

⭐⛔ **THE PACKET IS A FILE, AND IT IS NAMED — ⛔ "routed to the Panel" is not a mechanism.** Write
`_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-08-30-contributor-name-public-tier.md`,
on the `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-08-24-drive-record-publication-basis.md`
shape, and add it to the File List (⭐ the Project Structure row already exists).
⚠⛔ **THE DIRECTORY IS `planning-artifacts/`, ⛔ NOT `implementation-artifacts/` — AN EARLIER PASS HAD
THIS WRONG.** ⭐ Verified: **all 22** existing `trustee-panel-routing-note-*` files live in
`_bmad-output/planning-artifacts/`, including the shape precedent this AC names, and `.decision-log.md`
cites them at that path. Filing it under `implementation-artifacts/` puts it where ⛔ no reader of the
routing-note series will look.
⭐ **The precedent's shape, so "on that shape" is actionable:** `# Trustee Panel routing note — <date>`
+ `## <the question, as a question>`; a field block (`**Author:**` · `**Occasion:**` · `**Routed to:**`
naming the Panel and counsel with dates · `**Status:** ⏳ ROUTED, ⛔ NOTHING RATIFIED AND NOTHING
APPLIED.`); a `>` blockquote headline callout; numbered `## 1.`…`## 7.` sections ending with
`## 7. What this note does ⛔ NOT do`; and `## Sources — every one read at <SHA>`. ⚠ Without a path, a reviewer cannot check the document
and the dev agent inlines it into `deferred-work.md` or omits it.

The packet records **all SIX of the following, ⛔ not a subset** — the packet records: the allowlist
has **two** entries; the third widening is **four nominee-bank**
fields on a different surface; and `-165` cl.2 (*"the underlying **account** fields remain Tier-1 …
treat masking as a presentation/projection policy"*) ⚠ **is scoped to account fields** — extending it
to *"a shielded contributor name is still Tier-1"* is a **sound inference via `pii_tier` being a fact
about the data** (`public-vs-private-matrix.yaml:60`), ⛔ **not** something the ruling decided. Say so.

**And** it records the **asymmetry**: the **basis** is settled (11b.3's AC rests contributor names on
*"those members' own T&C"*) while the **matrix declaration** and the **mechanism** are not.
**And** ⛔ it records that **the 11b.9 precedent is INERT today** — no `clause_versions` row is
minted, the predicate is false for every member, and **Task 1 there, and ⛔ only Task 1**, waits on
counsel's T&C return (**2026-09-07**) **and** a second real person holding `niyamavali.review`.
⛔ Do not present it to the Panel as a working mechanism. ⚠⛔ **And do ⛔ NOT tell the Panel that
11b.9 is "blocked":** 11b.9 ruled that wait a **CHOICE, ⛔ not a constraint** (`11b-9-…md:935,945`) —
its Tasks 2-8 are *"not merely permitted — they are the ruled posture"*, and they shipped inert by
design. Calling a deliberate choice a block misstates the precedent to the body being asked to rule
on it ([[feedback_closure_language_precision]]).
**And** it records that **`2026-08-28-162` cl.2 retired `sahyog_vivran_publication` and
`in_memoriam_listing`** alongside `sahyog_drive_publication` — the consent type most adjacent to a
contributor list on `/sahyog-vivran` no longer exists as a family-facing control.

### AC8 — The UX-spec column-inventory amendment is written ✅ `[D6-uxspec(a) RULED]`

`deferred-work.md` item **(f)** (`:104-121`) names *"Story 11b.2 or 11b.3 authoring, whichever comes
first"*; **it has fired**.

⚠⛔ **THE INVENTORY AND ITS RESTATEMENTS SPAN FIVE ANCHORS — ⛔ AND THE COUNT IS ⛔ NOT THE
REQUIREMENT, THE LIST IS.** ⚠ An earlier pass "corrected" this to `:1158` **only**; the pass after
that said *"FOUR TIMES"* and then listed **five** bullets, while the References said "four" and listed
**three**. ⇒ ⭐ **annotate EVERY anchor below and stop counting.** ⚠ Note also that the inventory is
*referred to* — ⛔ not fully restated — at six further sites (`:1317`, `:1319`, `:1321`, `:1330`,
`:1787`, and ⭐ **`:2581`, in a breakpoint table no one annotating §8/§10/§11 would open**). Those are
⛔ **not** in scope for the amendment, but ⭐ the amendment must **say they exist**, so the next author
does not read the annotated set as exhaustive. Annotating `:1158` alone would leave the section **literally titled *"Public Column
Inventory — Sahyog List"*** un-annotated: the first document the next author opens. The amendment is
written against **all** of:
 · `ux-design-specification.md:1158` — the layout-primitive inventory;
 · ⭐ **`:1287-1298` — the dedicated *"Public Column Inventory — Sahyog List"* section**, including
   the standalone inventory line `:1291` and the per-column identifier semantics `:1295-1298`;
 · `:1252` — the Real Data Test's full 10-column restatement;
 · `:1788` (desktop anatomy) / `:1798` (mobile row anatomy);
 · `:2161` + `:2165` (the performance contract).

It records that of the ten columns: **three have no substrate** (`Donation ID`, `HRMS`, `Member ID` —
the last refused in terms on a public wire as an enumeration primitive), **two labels are
microcopy-prohibited** (`microcopy.yaml:42`, `:48`), and **`School` / `Block` are separately
ineligible or gated** (`-133` cl.1, `-132` cl.3, `2026-08-19-137` cl.7).
**And** it is written as an **annotation**, ⛔ never a rewrite ([[feedback_supersede_never_reinterpret]]).
**And** the reconciliation above **and the three-way split** are written back into `epics.md` as a
dated `⛔ RECONCILED 2026-08-29 (AI-11a-1(b), Story 11b.2 authoring + validation passes)` block —
⛔ annotating, ⛔ never rewriting the ACs (`epic-11a-retro-2026-08-23.md:381`).

---

## Tasks / Subtasks

> ⛔ **EXECUTION ORDER IS BINDING.** Task 0 first ([[feedback_governance_commits_precede_implementation]]).
> ✅ **All decisions are ruled; ⛔ no task is gated.**

- [x] **Task 0 — Governance first (AC0, AC8)** ✅ `[ALL NINE RULED — startable]`
  - [x] ⛔⛔ **FIRST: RE-READ `11b-2a-…md`'s PREFLIGHT AND ITS TASK-6 "WHAT DROPS" TABLE** (Preflight
        STEP 1). If 11b.2a has ruled since this file's `c9d86ab` baseline, **STOP and report the
        conflict** — ⛔ do not reconcile it yourself.
  - [x] Read the `.decision-log.md` head **live** (`2026-08-28-167`, re-verified unmoved 2026-08-30;
        ⛔ do not hardcode the next number) and **TRANSCRIBE** into it the rulings **already recorded
        in the Decisions section of this file** — **ALL NINE**: **D1** (ruled by construction: the
        presenter only; the Astro layer deferred because **there is no host**, ⛔ not because C-1
        forbids the dep, which `-154` cl.6 pre-authorised as *"an ordinary dependency addition"*) ·
        **D2(a)** (⛔ no status on the row) · **D6-uxspec(a)** (write the amendment) ·
        **D7-nameform(a)** (record the question, ⛔ rule nothing) · **D8(a)** (the `unknown` row
        throws; ⛔ mint nothing) · **D9(a)** (emit name parts; ⛔ never join) ·
        **D11-outputshape(a)** (the view-model's `displayName` is a **single `nameParts` arm**) ·
        **D12-refscope(a)** (per-**ref** namespace tagging survives on a new ground; the union narrows
        to `'contribution'`) · **D13-numbering(a)** (D6/D7 renamed; every cross-story citation is
        qualified by its owning story) — one clause each, quoting the ground verbatim.
        ⛔⛔ **The dev agent does not decide, does not paraphrase, and does not supply a ground.**
        ⛔ `governance:` prefix, own commit, before any code.
  - [x] ⚠ ⭐ **AND 11b.2a IS MINTING AGAINST THE SAME HEAD.** The two stories run in **parallel**
        and both read `2026-08-28-167`. ⇒ ⛔ **re-read the head immediately before you write, on a
        freshly-`fetch`ed branch**, and if the number you were about to take is taken, **take the
        next one** — ⛔ never edit, merge into, or renumber 11b.2a's entry
        ([[feedback_supersede_never_reinterpret]]). ⭐ Same rule for the `sprint-status.yaml`
        `last_updated` ledger: **append above whatever head exists**, ⛔ never overwrite a sibling's.
  - [x] Append the `⛔ RECONCILED 2026-08-30` block to `epics.md`'s Story 11b.2 section — the
        defective-AC findings **and** the 11b.2 / 11b.2a / 11b.2b split, with the new sprint-status
        keys named so a future `sprint-planning` run does not regenerate a ghost. ⭐ Verified: **no
        RECONCILED block exists there yet**, and 11b.2a/11b.2b appear **nowhere** in `epics.md` — so
        this is a **write**, ⛔ not an extend. ⛔ Annotate only.
  - [x] ⭐⛔ **Write the UX-spec amendment (AC8) AGAINST ALL FIVE ANCHORS, NAMED HERE** — ⚠ an earlier
        pass compressed this to *"Write the UX-spec amendment (AC8)"*, and the dev agent works from
        the Tasks list ([[feedback_spec_edits_must_propagate_to_tasks]]), so the anchors evaporated:
        · **`:1158`** (the layout-primitive inventory)
        · ⭐ **`:1287-1298`** — the section literally titled *"Public Column Inventory — Sahyog List"*,
          incl. the standalone inventory line `:1291` and the identifier semantics `:1295-1298`
        · **`:1252`** (the Real Data Test's 10-column restatement)
        · **`:1788`** (desktop anatomy) / **`:1798`** (mobile row anatomy)
        · **`:2161`** + **`:2165`** (the performance contract)
        Record: **three columns have no substrate** (`Donation ID`, `HRMS`, `Member ID` — the last
        refused in terms on a public wire as an enumeration primitive) · **two labels are
        microcopy-prohibited** (`microcopy.yaml:42`, `:48`) · **`School` / `Block` are separately
        ineligible or gated** (`-133` cl.1, `-132` cl.3, `2026-08-19-137` cl.7). ⛔ **Annotation,
        ⛔ never a rewrite** ([[feedback_supersede_never_reinterpret]]). ⚠ **And note that six further
        sites *refer* to the inventory without restating it** (`:1317`, `:1319`, `:1321`, `:1330`,
        `:1787`, `:2581`) so the annotated set is not read as exhaustive.
  - [x] Mark `deferred-work.md` item (f) **discharged by this story**, ⛔ not "closed".
- [x] **Task 1 — The presenter (AC1, AC2, AC3, AC4)** ✅ `[D2(a) · D11-outputshape(a) · D12-refscope(a) RULED — startable]`
  - [x] ⛔⛔ **RE-READ `11b-2a-…md` BEFORE WRITING A LINE OF `view-model.ts`** — its rulings bind this
        presenter **by line number**, and they have already moved once (D5 · D6(a) · the D3-shape(i)
        and D3-key vacations all landed after this story's second validation pass). If it has ruled
        again, **STOP and report the conflict** ([[feedback_supersede_never_reinterpret]]).
  - [x] ⛔ **Read `packages/ui/src/pool-progress/*` end to end first** — ⚠ **FIVE files, ~245 lines**
        (the fifth is `constants.ts`, and it is the worked answer to "how do I emit a token ROLE
        without importing `@twt/tokens`"). It answers nearly every "how should this be shaped?"
        question here. ⛔ Do not invent a shape.
  - [x] Create `packages/ui/src/contribution-list/{index,view-model,presenter,i18n-keys}.ts`.
  - [x] `view-model.ts` — the AC3 types **verbatim**. ⚠⛔ **They carry ⛔ NO `rowKey` on either
        interface** (D5 vacated it) and the view-model's `displayName` is a **SINGLE `nameParts` arm**
        (D11-outputshape(a)); the input variant is **`name | unknown`, ⛔ two kinds** (D6(a) dropped
        `anonymized`). Plus the `ContributionListI18nRef` declaration with `namespace: 'contribution'`
        (AC2/D12-refscope(a)), the confirmed-only doc-block (AC4) and the kind-tag-mirror note
        explaining the **deliberate** omission of `anonymized` (Trap 3).
  - [x] `presenter.ts` — `deriveContributionRowViewModel(row)`; exhaustive `never` check over the
        **two** kinds; ⛔ **`unknown` THROWS and mints nothing** (D8(a)); ⛔ **no name join** — emit
        `{kind:'nameParts', firstName, lastInitial}` (D9(a)); doc-block stating it throws and that
        **every consumer owes a try/catch** (Trap 4).
  - [x] `i18n-keys.ts` — `import type { ContributionListI18nRef } from './view-model.js';` then one
        iterable `CONTRIBUTION_LIST_I18N_REFS` record over **all ten** `contributor_list.*` keys
        (`contribution`). ⛔⛔ **⛔ NOT `member.anonymousMember`** — 11b.2a's D6(a) removed it; nothing
        in this module can render it. ⭐ **Reuse; ⛔ mint nothing, and ⛔ do not create a namespace** —
        a namespace not in `copy_globs` is unscanned copy wearing a green check
        (`microcopy.yaml:350-352`).
  - [x] `index.ts` — **explicit named exports** on the `pool-progress/index.ts` precedent; then
        barrel from `packages/ui/src/index.ts` with the per-story annotation comment.
- [x] **Task 2 — The teeth (AC1, AC2, AC4, AC5)**
  - [x] `packages/ui/tests/contribution-list/presenter.test.ts` — the **three-half** anti-widening
        test (AC4: compile · runtime · **nesting+rename**, the last using the prescribed
        `Record<AllKeys<T>, true>` literal, ⛔ never a hand-written key array), the **two-kind**
        exhaustiveness test, the **`nameParts`** test (⛔ assert no joined string is ever emitted),
        and the namespace-vs-locale-JSON test over **every declared ref** in both locales (AC2).
        ⛔⛔ **⛔ NO anonymized-variant test** — 11b.2a's D6(a) deleted that variant; a test for it
        could only pass by hand-forging a row the API can never emit, which is a test of the fixture,
        ⛔ not of the system. ⛔ **Do not write a passing test for the `unknown` branch's
        reachability** either — record it in **Completion Notes** and as deferred work under Task 3:
        *"the `unknown` display-name branch is unexercised by the mobile producer (the boundary
        `continue`s on a null ciphertext); un-attested, ⛔ not tested. Trigger: 11b.3's Astro
        producer."* ⭐ It is a **throwing exhaustiveness guard**, and a guard that never fires is
        working.
  - [x] `packages/ui/tests/contribution-list/no-list-iteration.test.ts` (AC1) — the source half over
        **all** module files (`readdirSync`, comment-stripped) **and** the compile-time
        array-parameter assertion. ⛔ Both halves; the source half alone is a proxy.
  - [x] ⛔ **TWO scan files, ⛔ not one** (AC5): `forbidden-imports.test.ts` (parsed import
        specifiers, incl. `react`/`react-native`/`astro`/`@twt/tokens`) **and** `death-term.test.ts`
        (raw text, asserting the terms are ⛔ **ABSENT** from the comment-stripped source **and**
        ⛔ **ABSENT** from the comments — ⛔ never asserting one is present). ⚠ Merging them makes the
        death half **vacuous for every possible file**. Plus the `'green'`-literal check.
        ⭐ Both scans point `readdirSync` at **`packages/ui/src/contribution-list/`** — ⛔ never at
        `packages/ui/src/`.
  - [x] `packages/ui/tests/package-boundary.test.ts` — `dependencies` is exactly `@twt/contracts`
        (AC1). ⚠ ⭐ **The `@twt/tokens` hole is closed by `forbidden-imports.test.ts`, ⛔ not here** —
        a `devDependency` **value import** never touches `dependencies`.
  - [x] ⚠⛔ **THE AC2 TEST'S PATH — GET THE DEPTH RIGHT; AN EARLIER PASS NAMED THE WRONG ORIGIN.** The
        AC2 locale test lives at **`packages/ui/tests/contribution-list/presenter.test.ts`**, ⛔ not
        `packages/ui/tests/`, so it is **four** levels to the repo root, ⛔ not three:
        `path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')` then
        `packages/i18n/locales/${locale}/${ref.namespace}.json`. ⭐ Copy
        `tests/member-status/presenter.test.ts:280` verbatim (it uses exactly this), or the
        `new URL('../../../i18n/locales/…', import.meta.url)` form of
        `tests/contribution-disclosure/presenter.test.ts:342`. ⚠⛔ **And ⛔ do NOT guard on file
        existence** — let `readFileSync` throw. A guarded wrong path is a **silent skip**, which is
        the failure this bullet exists to prevent; belt-and-braces, assert the bundle is non-empty
        before asserting any key.
- [x] **Task 3 — Route the deferrals (AC6, AC7)** ✅ `[D7-nameform(a) RULED — startable]`
  - [x] **SIX items — (i) … (vi)**, roman-numeralled and section-qualified as `11b.2 (i)` etc.
        (⚠ `deferred-work.md` already holds 11b.1's unqualified (a)…(j) — ⚠ and 11a.6 at `:214-311`
        and 11a.5 at `:353-526` do the same, so the roman-numeral rule is **more** necessary, not
        less), each with a named re-trigger, ⛔ none marked closed. ⚠ **SIX, ⛔ not seven** — the old
        item (vi) is deleted (D6(a) removed its subject).
  - [x] ⛔ **Write BOTH not-recorded stubs in `deferred-work.md` ITSELF**, ⛔ not only in this story:
        `(vii)` the public/member inversion (already open at `:97-100` under 11b.1 item (e)) and
        `(viii)` the `member.anonymousMember` duplicate (subject removed by 11b.2a's D6(a); its
        successor deletion question is **11b.2a's Task 6**). ⛔ Two records of one obligation is the
        failure both stubs exist to prevent.
  - [x] ⚠ **Item (v) — the commitlint divergence — is ⛔ not optional.** `sprint-status.yaml` and
        **11b.2a both bank on this Task writing it**. ⛔ Do not stop at four items. ⭐ Re-verified
        2026-08-30: `commitlint.config.js` overrides only `scope-enum`/`subject-case`/the max-length
        rules — **`type-enum` is untouched** — and `core.hooksPath` = `.githooks`, which holds only
        `pre-push`.
  - [x] **Item (ii)** — ⚠ a bare *"(b)"* here would mean **11b.1's** item (b) — is written as
        **8.3 D11's re-trigger having fired at 11a.1**, ⛔ not as a fresh item.
  - [x] Write the D7-nameform Panel packet as its **own named file** (AC7), in
        ⭐ **`_bmad-output/planning-artifacts/`** (⛔ **not** `implementation-artifacts/` — all 22
        existing routing notes live there) —
        `trustee-panel-routing-note-2026-08-30-contributor-name-public-tier.md` — with **all SIX**
        recordings: (1) the allowlist has **two** entries; (2) the third widening is **four
        nominee-bank fields on `sahyog-vivran`**, ⛔ nothing contributor-shaped; (3) `-165` cl.2 is
        scoped to **account** fields, so *"a shielded contributor name is still Tier-1"* is a **sound
        inference via `pii_tier` being a fact about the data** — ⛔ **not** something the ruling
        decided; **say so in those words**; (4) the **asymmetry** (basis settled; matrix declaration
        and mechanism not); (5) the 11b.9 precedent is **INERT**, and its wait is a ruled **CHOICE**,
        ⛔ not a block; (6) `-162` cl.2 retired `sahyog_vivran_publication` + `in_memoriam_listing`.
        ⛔ **Ruling nothing** (D7-nameform(a)). Add the file to the File List (the Project Structure
        row already exists).
  - [x] ✅⭐ **THE ADAPTER SEAM IS ⛔ NO LONGER OUTSTANDING — RECORD IT DISCHARGED, ⛔ DO NOT RE-FILE
        IT.** 11b.2b wrote **AC9** for it on 2026-08-30 (`4bbe28b`), with Task 2 building it. ⇒ the
        note reads **"Discharged by 11b.2b's AC9 (2026-08-30)"**
        ([[feedback_closure_language_precision]]) — ⛔ never *"11b.2b does not currently own it in an
        AC"*, which an earlier pass ordered written and which is **false on the day it would be
        written**.
- [x] **Task 4 — Close out**
  - [x] `pnpm --filter @twt/ui test` · `pnpm turbo run typecheck` (⭐ where AC4's compile half bites)
        · then `pnpm ci:local` green. ⚠ `git push` runs the full `ci:local` via a pre-push hook —
        that is the "hang", ⛔ not a failure. ⚠ `integration-tests` concurrency is `1` and is
        **LOAD-BEARING** — ⛔ never raise it.
  - [x] ⛔ **`friction-budget.md` is NOT touched by this story** — AC-4 is a path trigger over
        `apps/mobile/` + `apps/public/` (`scripts/friction-budget/lib.ts:453`), and this story
        touches neither. The leg stays **dormant**. (11b.2b owes it.)
  - [x] Flip `development_status[11b-2-contribution-list-components-table-mobile-row]` and add ONE
        combined top-of-file `last_updated` entry ([[project_sprint_status_ledger]]). ⚠ The head is
        **already an 11b.2-family entry** — at the THIRD validation pass it was **`2026-08-30h`**
        (⚠ ⛔ **not** the `2026-08-29g` an earlier pass recorded — the calendar day has rolled and
        eight entries were prepended), and it may have moved again (11b.2a runs in parallel).
        ⇒ **read it live**, take the next free suffix, and ⛔ **do not overwrite any existing entry.**

---

## ⚖️ Decisions — ✅ **ALL NINE COMMITTED (BigDev, 2026-08-29 and 2026-08-30).** ⛔ Do not re-litigate.

> ⭐ D1, D3, D4 and D5 from the authoring pass were **resolved by the split**. D3/D4 moved to
> **11b.2a**; the memorial-prototype question moved to **11b.2b**, where it is named
> **`D5-prototype`** — ⚠⛔ **`D5` in 11b.2b means 11b.2a's GOVERNING RTBF ruling, ⛔ not this one**
> (11b.2b renamed its own to end exactly that collision). D1 is ruled-by-construction below.
>
> ⚠⛔ **D6 AND D7 ARE `D6-uxspec` AND `D7-nameform` HERE (D13-numbering(a)).** 11b.2a has a
> **different** D6(a) and D7(c). ⛔ Never cite a bare number across stories.

### ✅ Ruled by construction — ⛔ do not re-litigate

- **D1 — what this story ships.** The presenter, and only the presenter. The Astro render layer is
  deferred because **there is no host** (11b.3 `backlog`, `apps/public/src/pages/` verified). ⛔ **NOT**
  because C-1 forbids the dep — `-154` cl.6 ruled `apps/public` **adds** `@twt/ui` and called it *"an
  ORDINARY DEPENDENCY ADDITION"*, and `:1734` corrected the "declination" framing as false. The mobile
  consumer moves to **11b.2b**. ⭐ Exactly 9.12's precedent: `pool-progress` shipped with mobile as its
  only consumer and its own barrel comment names the Epic-11b web render as *"later"*.

### ✅ D2 — The status pill → **(a) ⛔ NO status on the row.** RULED 2026-08-29.

The epic AC says lists render a *"status pill (Story 9.6)"* **one line above** *"never yellow-pill or
attested-only states"* (`epics.md:4931-4932`, verified adjacent). **The pill clause is a DEFECTIVE AC**
and is reconciled away in `epics.md` by AC8.

**Ground:** confirmed-only stays a **shape**. `pool-contributor-list.ts:39-40` — *"a row's mere presence
means confirmed"* — and `:16-22`'s `.strict()` teeth are **honoured, ⛔ not fought**. ⛔ (b) was
rejected because widening the row with `status` breaks the shape test **by design** and re-opens the
yellow/attested door 8.3 and 9.5 closed structurally. ⛔ (c) (a constant "confirmed" chrome element in
the render layer) was rejected too: it asserts a fact nothing checked, and the next surface would read
it as one.

⇒ ⛔ **No `status` field, ⛔ no `deriveStatusPillViewModel` call, ⛔ no `'green'` literal.**
⭐⛔ **AND THIS RULING BINDS 11b.2b:** because (c) was rejected by name, ⛔ the pill must **not** be
re-introduced as chrome at the render layer either.

### ✅ D6-uxspec — Write the UX-spec amendment? → **(a) YES.** RULED 2026-08-29. ⚠ Renamed from `D6` 2026-08-30 (D13-numbering(a)); ⛔ **11b.2a's D6(a) is a DIFFERENT ruling** (drop the anonymized presenter variant).

`deferred-work.md:121`'s trigger — *"Story 11b.2 or 11b.3 authoring, whichever comes first"* — **has
fired**.

**Ground:** the trigger names this story; the findings are verified; and deferring again re-commits the
*"unowned for seven epics"* pattern the item itself names. ⛔ (b) (leave it for 11b.3) was rejected
because *"then the trigger fired and nothing happened, which is how a real obligation disappears"* —
⭐ **and AC6 records that exactly this has ALREADY happened once on this surface** (8.3's D11
re-triggered at 11a.1 and vanished).

### ✅ D7-nameform — The contributor name at `public` tier, and its FORM → **(a) record the question, ⛔ rule nothing.** RULED 2026-08-29. ⚠ Renamed from `D7` 2026-08-30 (D13-numbering(a)); ⛔ **11b.2a's D7(c) is a DIFFERENT ruling** (the empty-state copy).

**Ground:** ⛔ nothing this story BUILDS requires an answer — it is raised because 11b.3 cannot start
without one, and the evidence was assembled here. ⇒ **AC6 and AC7 proceed exactly as written.**

⛔ (b) (rule the name form now) was rejected: **BigDev may not have standing** — two committed records
reserve a public name-form change to the **Panel**. ⚠⛔ **THE PAIR IS ⛔ NOT AT `:1061` — THAT IS THE
"name form stays UNRULED" LINE.** The pair is **recorded** at `.decision-log.md:1068-1069` (cl.12) and
**lives** at `epics.md:4868` (11b.1's 2026-08-19 `RECONCILED` block, *"requires its own Panel
ruling"*) and `public-vs-private-matrix.yaml:361` (the matrix exception's own `scope:`). ⚠ The matrix
half is about the **deceased member's** name, so for **contributors** the on-point reservation is
`epics.md:4868` / `:4888`. ⛔ (c) (member-tier only, never public) was rejected: it contradicts 11b.3's
shipped epic AC, which names the contributor list as public shell content.

⚠ ⭐ **WHAT (a) COMMITS THIS STORY TO — ⛔ it is not a way of doing nothing.** AC7's packet is
**assembled and routed to the Panel**, and it must record the three things that make it honest:
· the third matrix widening is **four nominee-bank fields on a different surface**, ⛔ nothing
  contributor-shaped;
· `-165` cl.2 is scoped to **account** fields, so the *"shielded ⇒ lower tier"* foreclosure is a
  **sound inference via `pii_tier` being a fact about the data**, ⛔ not something the ruling decided;
· **the 11b.9 precedent is INERT** — no `clause_versions` row, the predicate false for every member,
  blocked on counsel's **2026-09-07** return **and** a second real person holding `niyamavali.review`
  — ⚠⛔ **and say "its Task 1, and ⛔ ONLY Task 1, WAITS", ⛔ never "blocked"**: AC7 bans that word by
  name because 11b.9 ruled the wait a **CHOICE, ⛔ not a constraint**, and this bullet used it —
  misstating the precedent to the very body being asked to rule on it. And `-162` cl.2 retired
  `sahyog_vivran_publication` + `in_memoriam_listing`.

### ✅ D8 — What does a row with an UNKNOWN name render? → **(a) it THROWS; ⛔ mint nothing.** RULED 2026-08-29 (second validation pass).

⚠ **The question existed because AC3 mandated a three-kind branch and then forbade every output it
could have had.** ⛔ It was ⛔ not raised by the authoring pass and ⛔ not visible to the first
validation pass.

**Ground:** ⛔ **no producer can emit `unknown` today** — 11b.2a's boundary `continue`s on a null
ciphertext (`handlers.ts:312-318`), so minting member-facing copy for it is speculative. The branch is
kept (a second producer, 11b.3's Astro path, may legitimately emit one), it **throws**, and it is
recorded **un-attested / unexercised** ([[feedback_record_unattested_no_backfill]]).

⛔ **(b) mint `contributor_list.unknown_contributor` was rejected** — it writes copy for a case
nothing can currently produce and weakens Task 1's *"mint nothing"* to a rule with an exception in it.
⭐ **11b.3 mints it**, at the point a producer that can emit it exists.
⛔⛔ **(c) reuse `member.anonymousMember` was rejected, and it is the dangerous one** — it would state
*"this person exercised their right to erasure"* when the name was merely **null**. That is a **false
statement about a data-subject right**, rendered on the one surface Outcome 1 exists to protect.
⛔ **(d) render a blank was rejected** — a blank where a name belongs, already banned by AC3.

⚠ **What (a) costs, stated plainly:** it puts a throw on a `renderItem` hot path. ⇒ **11b.2b's
try/catch (Trap 4) is load-bearing, ⛔ not defensive polish**, and the presenter's doc-block must say
so in terms.

### ✅ D9 — Does the presenter JOIN `firstName` + `lastInitial`? → **(a) ⛔ NO — it emits name PARTS.** RULED 2026-08-29 (second validation pass).

⚠ **The question existed because the view-model's `displayName` was typed `{kind:'literal'; value:
string}`, and ⛔ nothing in the story said how two fields became one string.** The dev agent would have
written `` `${firstName} ${lastInitial}.` `` because ⛔ nothing else produces a `string`.

**Ground:** **joining them DECIDES the contributor name FORM** — the exact question **D7-nameform(a) ruled must
⛔ not be ruled**, and which **AC6 item (iii)** routes to the Panel. A join in `presenter.ts` would
make that routed deferral **false on the day it was written**, decided by the person least authorised
to decide it — and would hardcode a Latin-script space-and-period form into a package that must also
render `hi`. ⇒ the view-model's `displayName` gains a **`nameParts`** arm and the presenter passes the
two fields through untouched.

⛔ **(b) join per the committed first-name + last-initial form was rejected.** ⚠ It is the *tempting*
option, because `epics.md:4931` already assumes that form — ⚠⛔ **and the count is THREE, ⛔ not the
"exactly one" an earlier pass asserted three times**: `epics.md:3145` (Story 8.3's own "I want",
naming *"any visitor on Sahyog Drive (Epic 11b)"* and specifying *"first-name + last-initial only"*) ·
`:3238` (the receipt PDF) · `:4931`. ⭐ **The rejection stands regardless, and on the SAME ground:
⛔ an epic AC is ⛔ not a ruling** — but ⛔ do not restate the count as one. (`matrix.ts:401-402` is
still about the **deceased member's** name, ⛔ not a contributor's.) D7-nameform(b) was already
rejected on the ground that **BigDev may not have standing**.
⭐ **The join is 11b.2b's**, under the form the Panel rules; until then 11b.2b uses `epics.md:4931`'s
form and records it **built-to, ⛔ not ratified**.

### ✅ D11-outputshape — Does the view-model's `displayName` keep its `literal` and `i18n` arms? → **(a) ⛔ NO — a SINGLE `nameParts` arm.** RULED 2026-08-30 (third validation pass).

⚠ **The question existed because 11b.2a's D6(a) ruled only on the INPUT variant.** It said nothing
about the OUTPUT union — and once `anonymized` was gone, the `i18n` arm had **zero possible emitters**
(its only emitter was the anonymized row) while `'literal'` was **already unreachable**, reserved for
a pre-composed producer that does not exist.

**Ground:** D6(a) rejected *"the unreachable branch preserved as defense-in-depth"* **by name**, and
the argument does not weaken one type down. Two un-emittable arms on a **hot-path view-model** are the
same vacuous surface, and every consumer must still `switch` over them. ⇒ the union collapses to
`{kind:'nameParts', firstName, lastInitial}`. ⭐ **`ContributionListI18nRef` survives — for `rowA11y`
ONLY.**

⛔ **(b) keep `'literal'` as a forward seam was rejected** — a seam with no producer is a comment
wearing a type; 11b.3 may add an arm **when it has a producer**, and adding one then is ⛔ not a
breaking change for a single-consumer package.
⛔ **(c) keep all three for 11b.3 was rejected** — it is (b)'s argument twice, and it re-creates on the
output side exactly what D6(a) deleted on the input side.

⚠ **What (a) costs, stated plainly:** if 11b.3's Astro producer does need a pre-composed or
i18n-resolved name, it re-opens this decision. ⭐ That is the intended cost — ⛔ the seam is not
pre-built on speculation.

### ✅ D12-refscope — After D6(a), does per-REF namespace tagging survive? → **(a) YES — narrowed to `'contribution'`.** RULED 2026-08-30 (third validation pass).

⚠ **The question existed because AC2's ENTIRE stated ground was a two-namespace crash**, and 11b.2a's
D6(a) deleted the `common` ref that made the module span two. A mechanism whose ground has evaporated
is normally deleted — ⛔ but here it is load-bearing elsewhere.

**Ground, and it is two things that are true TODAY, ⛔ not the old crash:**
· **11b.2b's AC6 depends on this record BY NAME** — it de-duplicates against *"11b.2's AC2 … which
  already owns a `packages/i18n`-backed test for all ten `contributor_list.*` keys"* and ⛔ writes no
  second one. Dropping to a per-module constant **silently breaks a sibling's shipped AC**.
· **a per-ref shape absorbs a second namespace without a breaking change** — 11b.3's Astro producer is
  the named candidate.
⇒ the mechanism stays **per-ref**; the union **narrows to `'contribution'`**.

⛔ **(b) keep `'common'` in the union as a forward seam was rejected** — a union member nothing can
produce is D11-outputshape's defect one file over.
⛔ **(c) fall back to `contribution-disclosure/i18n-keys.ts:19-20`'s per-MODULE constant was
rejected** — it is the simpler shape for a one-namespace module, and it breaks 11b.2b's AC6 **without
saying so**, which is the failure mode this sibling set keeps producing.

⚠⛔ **AND THE REAL CRASH MOVED, ⛔ IT DID NOT DISAPPEAR.** It is now the **`t()` argument order** —
`t(key, params, options)`, namespace **third** (`resolver.ts:53`). AC3's doc-block had it wrong and
would have thrown on **every** row.

### ✅ D13-numbering — Two live D6/D7 collisions across parallel siblings → **(a) RENAME 11b.2's to `D6-uxspec` / `D7-nameform`.** RULED 2026-08-30 (third validation pass).

⚠ **The question existed because 11b.2 and 11b.2a each have a D6(a) and a D7, they are DIFFERENT
rulings, and both stories' Task 0 mints against the same `.decision-log.md` head** — so a
decision-log entry could be ambiguous about which it transcribes, on the one artefact whose purpose is
to make rulings outlive their story files.

**Ground:** the precedent is **already set in this sibling set** — 11b.2b renamed its own `D5` to
`D5-prototype` because *"two different D5s in one sibling set is exactly how a ruling gets applied to
the wrong question."* ⭐ Renaming the **non-governing** one is the established move, and 11b.2's D6/D7
are local (a UX-spec amendment; a routing posture) while 11b.2a's D6(a)/D7(c) bind **three** stories.
⇒ this story's become `D6-uxspec` and `D7-nameform`, and **every cross-story citation anywhere is
qualified by its owning story**.

⛔ **(b) rename 11b.2a's was rejected** — they are already transcribed into `sprint-status.yaml` under
those names across three ledger entries, so the rename would propagate into the ledger.
⛔ **(c) qualify citations and leave the numbers alone was rejected as insufficient alone** — it is the
cheaper edit, and it is **kept as an additional requirement**, but it leaves two live `D6(a)`s in one
sibling set, which is what the `D5-prototype` rename was performed to end.

⚠ **What (a) costs:** 11b.2's `D7(a)`/`D8(a)`/`D9(a)` are cross-cited from `11b-2b-…md` and from
11b.2a's Task-6 table. ⛔ Those citations are ⛔ **not** edited by this story — ⭐ the rename is
recorded here and in the ledger, and each sibling picks it up at its own next pass.

## Dev Notes

**The one-line summary:** it is **`<PoolProgressCard>` again, one row down** — same package, same
module shape, same confirmed-only-by-shape discipline, same mobile-consumer-later posture. ⭐ Almost
every hard decision has already been made, in files you can read.

- **⭐ The two most valuable properties of the existing presenters are both NEGATIVE:** they emit
  token **role names** (never colours) and i18n **keys** (never copy). ⛔ Breaking either makes the
  presenter unusable on one of its two stacks, and the break will not show up until the second
  consumer lands.
- **⚠ `t()` defaults to `common` and THROWS** (`resolver.ts:55` · `:58` · `:63`; the file states the
  posture itself at `:14-16`). That is why AC2 exists. ⚠⛔ **But this package ⛔ CANNOT call `t()`** —
  `@twt/i18n` is ⛔ not a dependency **or** devDependency of `@twt/ui`, and `packages/ui/package.json`
  is READ-ONLY here. ⇒ AC2's test reads the locale JSON **from disk**, on the
  `member-status/presenter.test.ts:277-283` precedent. ⚠ **That is deliberately "around `t()`", and it
  is the 11a.2 defect's shape** — `resolver.ts:33`'s `TOKEN` regex is single-brace, and 11a.2's test
  fed a hand-built fixture and bypassed `t()` entirely. ⇒ recorded as a known limitation and routed as
  AC6 item **(vi)** (⚠ renumbered from (vii) when the old (vi) was deleted), ⛔ not silently accepted.
  ⚠⛔ **AND THE PATH DEPTH IS FOUR, ⛔ NOT THREE** — the test lives in `tests/contribution-list/`, so
  `'../../../..'` reaches the repo root (`member-status/presenter.test.ts:280` is the verbatim
  precedent). ⛔ Do not guard on file existence; a guarded wrong path is a **silent skip**.
- **⚠ Type-only → value import cycles** break **consuming** packages at runtime while typecheck, lint
  and local tests stay green ([[project_type_only_import_cycle_trap]]). `@twt/ui` is imported by
  `apps/mobile` — be deliberate. See Trap 3.
- **⭐ CI Actions availability flips both ways without warning — re-verify live**
  ([[project_ci_actions_suspension_local_mirror]]).
- **⚠ The `governance:` commit prefix is a real repo convention (143 commits at `9b05372`; **152 at `c9d86ab`**) but is
  formally invalid under the checked-in `commitlint.config.js`** (`type-enum` is left at
  conventional's default, which excludes it). It survives only because commitlint is wired to
  nothing — no `commit-msg` hook (`core.hooksPath` = `.githooks`, which holds only `pre-push`), not
  in `ci-local.sh`, not in CI. **Use the prefix** (convention wins), and route the divergence as
  **AC6 item (v)** under Task 3 — ⚠ `sprint-status.yaml` and 11b.2a both record that **this** story's
  Task 3 writes it.

### Testing

```
pnpm --filter @twt/ui test        # packages/ui/tests/**/*.test.ts (vitest.config.ts include)
pnpm turbo run typecheck          # ⭐ where AC4's Record<keyof T,true> compile half actually bites
pnpm ci:local                     # before push only — integration concurrency 1 is LOAD-BEARING
```

### Project Structure Notes

| Path | New/Update | Note |
|---|---|---|
| `packages/ui/src/contribution-list/{index,view-model,presenter,i18n-keys}.ts` | **NEW** | The sixth presenter module. ⛔ Framework-free, ⛔ palette-free, ⛔ copy-free, ⛔ `@twt/domain`-free. |
| `packages/ui/src/index.ts` | UPDATE | One `export *` + its per-story annotation. |
| `packages/ui/package.json` | ⚠ **READ-ONLY** | ⛔ `dependencies` stays exactly `@twt/contracts`. ⚠ `@twt/tokens` is a **devDependency**, so a `dependencies` assertion ⛔ **cannot** see a value import — ⭐ **AC5(a)'s import scan is what closes that**, ⛔ not this row. |
| `packages/ui/tests/contribution-list/presenter.test.ts` | **NEW** | Anti-widening **(ALL THREE halves — compile · runtime · nesting+rename)** · **two-kind** exhaustiveness + `never` check · ⭐ **`nameParts` never joined** · namespace-vs-locale-JSON over **every declared ref, both locales**. ⛔ **NO anonymized-variant test** (D6(a) deleted the variant). |
| `packages/ui/tests/package-boundary.test.ts` | **NEW** | The C-1 property, mechanized. |
| `packages/ui/tests/contribution-list/no-list-iteration.test.ts` · `forbidden-imports.test.ts` · `death-term.test.ts` | **NEW** | AC1's two-half iteration scan (⭐ **word-boundary regexes** — a bare `do` matches `readonly`); AC5's **two** scans, both asserting ⛔ **absence**. ⛔ Not one merged file. |
| `packages/contracts/src/contributions/pool-contributor-list.ts` | ⛔ **NOT TOUCHED** | ⚠⛔ **⛔ NOBODY owns a widening — there is none.** 11b.2a's AC4/AC5 are **VACATED by D5** (*"⛔ DO NOT WIDEN … DO NOT ADD `kind`. DO NOT ADD `rowKey`"*). Read it for the confirmed-only invariant; the presenter mirrors the shape **structurally** and takes ⛔ **no build dependency** on it — that is what keeps the two stories parallel. ⚠⛔ **And ⛔ do NOT read population from `:88`** — its *"producer is unbuilt"* comment is **false since 9.4/9.5 and contradicts its own file header at `:7-8`** ([[project_epic9_confirmed_producer_is_live]]). ⭐ Already routed to **11b.3**; ⛔ this story files nothing for it. |
| ⭐ `_bmad-output/**planning-artifacts**/trustee-panel-routing-note-2026-08-30-contributor-name-public-tier.md` | **NEW** | AC7's packet. ⛔ "Routed to the Panel" is not a mechanism; a file is. ⚠⛔ **`planning-artifacts/`, ⛔ NOT `implementation-artifacts/`** — all 22 existing routing notes live there. |
| `packages/domain/src/member/display-name.ts` | ⛔ **DO NOT IMPORT** | Read it for the variant's shape; ⛔ mirror it structurally (Trap 3). |
| `packages/domain/src/kyc/name.ts` · `kyc/public-name.ts` · `notifications/pool-identity.ts` | ⛔ **DO NOT IMPORT** | Name FORM is not the presenter's decision. |
| `apps/**` | ⛔ **NOT TOUCHED** | ⛔ No `@twt/ui` dep on `apps/public`, ⛔ no `.astro`, ⛔ no mobile edit (that is 11b.2b). |
| `packages/contracts/src/public-pages/matrix.ts` · `public-vs-private-matrix.yaml` | ⛔ **NOT TOUCHED** | A third Tier-1 pair is a **RULING**. The gate failing is the gate working. |
| `friction-budget.md` | ⛔ **NOT TOUCHED** | AC-4 is dormant — no member-facing path in this diff. |
| `.decision-log.md` | UPDATE | Task 0. Read the head **live**. |
| `_bmad-output/planning-artifacts/epics.md` · `ux-design-specification.md` | UPDATE `[D6]` | The AI-11a-1(b) block + the column-inventory amendment. ⛔ Annotate, ⛔ never rewrite. |
| `_bmad-output/implementation-artifacts/deferred-work.md` | UPDATE | ⭐ AC6's **SIX** items **(i)–(vi)** + the **(vii)** and **(viii)** INTENTIONALLY-NOT-RECORDED stubs + item (f) **discharged**. ⚠⛔ **SIX — this cell said "four" for two revisions while AC6 and Task 3 said seven**, which is how item (v) (commitlint) nearly evaporated. ⛔ Do not re-file the public/member inversion or the `member.anonymousMember` duplicate. |

### References

- [Source: `epics.md:4930-4932`] — ⭐ the three-clause AC (⚠ `:4923`/`:4929` are the "I want" + "When" framing, ⛔ not AC clauses); `:4931`/`:4932` are the LITERALLY ADJACENT status-pill / confirmed-only contradiction
- [Source: ⭐ `epics.md:3145` · `:3238` · `:4931`] — ⚠⛔ **THE THREE committed lines assuming first-name + last-initial FOR CONTRIBUTORS — ⛔ NOT the "exactly ONE" this file asserted three times.** ⭐ `:3145` is the load-bearing one: Story 8.3's own "I want", naming the audience as *"any pool member viewing the My Pool card **or any visitor on Sahyog Drive (Epic 11b)**"* and specifying *"(first-name + last-initial only)"*. `:3238` = the receipt PDF embeds the contributing member's *"first-name + last-initial"*. ⛔ **None is a RULING** — that is why D7-nameform(a) survives — but the COUNT is three. ⚠ `matrix.ts:401-402` is still ⛔ NOT one of them (deceased member)
- [Source: `epics.md:4793-4835`] — C-1…C-5; ⭐ `:4815` = C-1's *"`apps/public` adds `@twt/ui`"* and *"presenters + Astro render layers, ⛔ not as components"* (⚠ this string is in `epics.md`, ⛔ **not** in `.decision-log.md`); `:4799` = C-3
- [Source: `epics.md:403,404,504`] — UX-DR13 (50k) · UX-DR14 (10k) · UX-DR80 (⭐ *"Native: FlatList tuning. Web: TanStack Virtual / react-virtuoso / react-window"* — direct support for Trap 1's split)
- [Source: `.decision-log.md:1729,1734,1741`] — ⭐ C-1 as an **ordinary dependency addition**; *"there was no declination"*
- [Source: `.decision-log.md:1029-1062`, Decision `2026-08-24-159` cl.11 = D9(a)] — ⚠ the DECISION LOG's D9, ⛔ not this story's; *"the right conjunct in the wrong read"* verbatim at `:1043-1044`; ⛔ the ruling says *filter, mask or anonymize* — ⛔ NOT "reorder". `:1061` = the name form stays UNRULED; ⭐ `:1068-1069` = the TWO records reserving a public name-form change to the Panel (the matrix exception's own `scope:` + 11b.1's 2026-08-19 block) — ⛔ that reservation is NOT at `:1061`
- [Source: `.decision-log.md#decision-2026-08-28-165` cl.1-2] — four **nominee-bank** fields; masking ⛔ does not lower the tier (⚠ scoped to **account** fields)
- [Source: `.decision-log.md#decision-2026-08-28-162` cl.2] — `sahyog_vivran_publication` + `in_memoriam_listing` retired
- [Source: `packages/ui/src/index.ts:3,8,14,21,35` · `src/pool-progress/*` — ⚠ FIVE files, ~245 lines (⭐ `view-model.ts:9-15` the invariant-as-SHAPE; `:17-29` the local structural type — doc-block `:17-24`, DECLARATION `:25-29`) · `src/status-pill/*`] — the module template
- [Source: `packages/ui/tests/pool-progress/presenter.test.ts:151-192`] — ⭐ the two-half anti-widening precedent (compile half `:157`, runtime half `:189-191`, rationale `:152-156`)
- [Source: `apps/mobile/tests/unit/status-pill-render.test.ts:7-12` (exhaustiveness) · ⭐ `:31-32` (the comment-stripping IMPLEMENTATION to copy; ⚠ `:16` is only its rationale)]
- [Source: `packages/contracts/src/contributions/pool-contributor-list.ts:16-22,39-40,42-51,59-65,73-80,94`] — confirmed-only as a SHAPE (⚠ *"a row's mere presence / means confirmed"* WRAPS `:39-40`); `.strict()` at `:51`; ⚠ the `pending` **aggregate** that does exist; ⭐ `:73-80,94` = `letterCode` is PER-RESPONSE, ⛔ not per row — the ground of AC3's adapter seam
- [Source: `packages/domain/src/member/display-name.ts:26,36-39,47-58`] — ⭐ the THREE-kind union and `ANONYMOUS_MEMBER_I18N_KEY`
- [Source: `packages/i18n/locales/{en,hi}/common.json:215`] — ⭐ `member.anonymousMember` is a **`common`** key
- [Source: `packages/i18n/locales/en/contribution.json:30-39`] — the `contributor_list.*` keys; `row_a11y` takes `{name}`
- [Source: `packages/i18n/src/catalog.ts:29-56,63-66,69`] — the three registration sites (⚠ imports run to `:56`)
- [Source: `packages/i18n/src/resolver.ts:14-16,26,33,49,55,58,63`] — ⭐ THE CRASH: `t()` defaults to `common` (`:55`) and THROWS on unknown namespace (`:58`) and missing key (`:63`); single-brace `TOKEN` at `:33`
- [Source: `packages/ui/tests/member-status/presenter.test.ts:277-283` · `tests/contribution-disclosure/presenter.test.ts:342`] — ⭐ the in-package precedent for READING LOCALE JSON FROM DISK rather than adding `@twt/i18n` as a dep
- [Source: `packages/ui/src/contribution-disclosure/i18n-keys.ts:19-20`] — the weaker per-MODULE namespace constant AC2 deliberately strengthens to per-REF
- [Source: `apps/api/src/modules/member-pool/handlers.ts:312-318`] — the boundary `continue`s on a null ciphertext ⇒ `unknown` is unreachable on that producer (D8(a)'s ground). ⚠ the guard is `:312`, the `continue` `:317`; the comment spans **`:313-315`** (⛔ not `:313` alone) and `:316` is a `request.log.warn`. ⭐ Re-verified 2026-08-30: the guard fires on a **missing profile** as well as a null ciphertext, and two further `continue`s follow (`:327` decrypt failure, `:332` empty first name) ⇒ the ground is **stronger** than stated. ⚠⛔ It rests on **live code**, ⛔ not on `pool-contributor-list.ts:88`'s stale *"unbuilt"* comment
- [Source: `microcopy.yaml:42,48,317-318,350-352`] — prohibited terms; `contribution` already globbed; ⭐ *"unscanned copy wearing a green check"* (⚠ at `:350-352`, not `:293-295`)
- [Source: `packages/contracts/src/public-pages/matrix.ts:176-198,390-403`] — the biconditional rule; the two-entry allowlist (`:394`, `:403`); the do-not-append warning (`:390-391`). ⚠ `:401-402` keeps 11b.3/11b.6 at first-name + last-initial for the **DECEASED MEMBER's** name — ⛔ NOT a contributor's
- [Source: `public-vs-private-matrix.yaml:60`] — `pii_tier` is *"a FACT about the data"* (the inference AC7 must state)
- [Source: `ux-design-specification.md:1158,1252,1287-1298,1788,1798,2161,2165`] — ⚠ the inventory appears FOUR times, ⛔ not once: `:1158` (layout primitive) · `:1252` (Real Data Test restatement) · ⭐ `:1287-1298` (the section literally titled *"Public Column Inventory — Sahyog List"*, inventory line `:1291`, identifier semantics `:1295-1298`); the anatomies `:1788`/`:1798`; ⭐ `:2165` *"a performance contract, not an implementation specification"*
- [Source: `deferred-work.md:21-179` (⚠ 11b.1's unqualified (a)…(j) — the lettering this story must NOT collide with), `:89` + `:97-100` (⛔ the ALREADY-OPEN inversion, under item (e)), `:104-121` (item (f) and its fired trigger at `:121`)]
- [Source: `11b-1-…md:203`] — ⚠ the scope-limited dep decline that names **11b.2** as the consumer
- [Source: `epic-11a-retro-2026-08-23.md:381`] — AI-11a-1(b)
- [Source: `scripts/friction-budget/lib.ts:453`] — `MEMBER_FACING_PREFIXES` = exactly `['apps/mobile/','apps/public/']`; `isMemberFacingPath` `:458-461` ⇒ a `packages/ui`-only diff matches neither ⇒ why AC-4 is dormant here
- [Source: `_bmad/custom/load-bearing-invariant-checklist.md:72` · `_bmad/custom/bmad-code-review.toml:9-11` (⚠ under `_bmad/custom/`, ⛔ not repo root)] — family 13; ⚠ `:10` evaluates only families **the diff touches**, so the verdict here is *covered-by-construction*, ⛔ not *skipped*
- [Source: `11b-9-…md:139-140,570,574-576,935,945`] — ⭐ the three-gate posture 11b.1 recorded has MOVED: gate 1 LIFTED, gate 3 de-authorised by 11b.9 itself; and 11b.9's wait is a ruled CHOICE, ⛔ not a block
- [Source: `.decision-log.md:618` (heading) · `:676-680` (**cl.3**) · ⭐ `:746-750` (**cl.7**, ⚠ ⛔ NOT `:676-680` — an earlier pass put cl.7 at cl.3's lines)] — cl.7 clears all three 11b surfaces and SUPERSEDES `-157` cl.3; cl.3's per-data-class **basis** is a preserved BASIS, ⛔ not a gate. ⚠ The exact wording is *"per-data-class **basis**"* — ⛔ there is no "publication" in that construction
- [Source: `scripts/ci-local.sh:41`] — where the compile-time teeth bite

---

## Dev Agent Record

### Agent Model Used

Claude Opus 5 (`claude-opus-5`) via Claude Code, `bmad-dev-story` workflow, 2026-08-30.

### Debug Log References

⭐ **The teeth were MUTATION-VERIFIED, ⛔ not assumed green.** Nine deliberate breakages were introduced
and reverted, each confirming the mechanism that is supposed to catch it actually does:

| # | Mutation | Caught by | Observed failure |
|---|---|---|---|
| 1 | `row: ContributionRowInput[]` | AC1(b) compile half | `no-list-iteration.test.ts(77,9): TS2322: Type 'true' is not assignable to type 'never'` — ⭐ the AC's predicted error, verbatim |
| 2 | `rowKey` added to `ContributionRowInput` only | AC4(a) **and** AC4(c) | `TS2741` at **both** literals — ⭐ confirms the removal really is the COUPLED edit the third validation pass found |
| 3 | `status` nested inside `displayName` | AC4(c) compile | `TS2741: Property 'status' is missing … Record<"status" \| …, true>` — ⛔ `keyof`-only would have PASSED |
| 3b | `status: true` added to the literal to silence (3) | AC4(c) runtime | `'status' carries the banned token 'status'` — ⭐ **both directions bite** |
| 4 | `.map(` helper parked in `view-model.ts` | AC1(a) source half | `view-model.ts matches /\.map\(/` — ⛔ a `presenter.ts`-only scan would have missed it |
| 5 | value import of the `@twt/tokens` **devDependency** | AC5(a) parsed-import scan | `['presenter.ts → @twt/tokens']` — ⚠ `package-boundary.test.ts` stayed **green**, exactly as AC1 warns |
| 6a | a lifecycle term added to a **doc-block** | AC5(b) comment scope | `'deceased' is ABSENT from the comments` failed |
| 6b | the same term added to **code** | AC5(b) code scope | `'deceased' is ABSENT from the code` failed |
| 7 | a confirmed-tone literal in a comment | Trap 2 raw-text scan | `presenter.ts emits 'green'` |
| 8 | a ref key absent from the locale JSON | AC2 | failed in **both** `en` and `hi` |
| 9 | a second namespace + a `common` ref | AC2 / D12-refscope(a) | the all-ten `contributor_list.*` assertion failed |

⭐ **AC1(a)'s word boundaries were also confirmed non-vacuous the OTHER way:** this module's own types
carry **10** `readonly` occurrences and `/\bdo\s*\{/` does ⛔ **not** fire on any of them. The
unsatisfiable-scan trap the third validation pass caught (`rea⟨do⟩nly`) is really closed, ⛔ not merely
described.

**Verification commands, all run at close-out:**
`pnpm --filter @twt/ui test` → **251 passed / 13 files** · `pnpm turbo run typecheck` → **20/20** ·
`eslint .` → clean · `pnpm ci:local` → **33 jobs green**.
⭐ **`integration-tests` was ⛔ NOT left skipped** — `twt-test-pg` was up on `:5433`, so `DATABASE_URL`
was supplied and the leg **ran**. (Without it, `ci:local` reports 31 jobs with the leg `SKIP`.)

### Completion Notes List

**✅ PREFLIGHT — both STOP conditions checked, ⛔ neither fired.**
- **STEP 1:** `git log c9d86ab..HEAD` over `11b-2a-…md` and over `11b-2b-…md` returned **empty**, and
  neither file had uncommitted changes ⇒ ⛔ **no sibling has ruled since this file's baseline.** The
  trip-wire's condition (*"if 11b.2a has ruled at all since this file's baseline"*) is ⛔ not met.
- Every decision in the Decisions section read **RULED** ⇒ ⛔ no *"reads UNRULED"* stop.
- Branched from `governance/11b-2-validate-split` (⛔ **not** `main`, which still carries the
  pre-ruling file reading `blocked-awaiting-decisions`), `git fetch origin` first.

**⭐ AC0 — the head was read LIVE and 168 was free.** `.decision-log.md`'s head was still
`2026-08-28-167` (every sibling minted into its **story file** only), so **`2026-08-30-168`** was
taken. All **NINE** transcribed, one clause each, grounds quoted **verbatim**, every cross-story
citation qualified by its owning story. ⛔ Nothing authored, paraphrased, re-grounded or re-scoped.

**⭐ What the code actually is:** four files plus one barrel comment — and ⛔ that is the entire diff
under `packages/`. ⛔ Zero `apps/` edits · ⛔ `packages/ui/package.json` untouched · ⛔
`pool-contributor-list.ts` untouched · ⛔ `matrix.ts` untouched · ⛔ `friction-budget.md` untouched
(AC-4's path trigger is `apps/mobile/` + `apps/public/`; the leg stayed **dormant** and was confirmed
green anyway).

**⚠ RECORDED UN-ATTESTED, ⛔ NOT TESTED — the `unknown` display-name branch is UNEXERCISED.** ⛔ No
producer can emit it: the API boundary skips a row whose contributor name it cannot resolve
(`apps/api/src/modules/member-pool/handlers.ts:312-318`, with two further skips at `:327`/`:332`).
⛔ **No passing reachability test was written** — it is a **throwing exhaustiveness guard**, and a
guard that never fires is working ([[feedback_record_unattested_no_backfill]]). What **is** asserted
is its BEHAVIOUR when handed one: it throws. **Trigger: 11b.3's Astro producer.**

**⚠ A SECOND KNOWN LIMITATION, RECORDED NOT HIDDEN — AC2's test asserts AROUND `t()`.** It reads the
locale JSON from disk because `@twt/i18n` is ⛔ not a dependency **or** devDependency of `@twt/ui` and
`packages/ui/package.json` was READ-ONLY here — ⛔ **a test must not be the reason a package boundary
moves**. That is the **11a.2 defect's shape**, so it is routed as `11b.2 (vi)`, trigger **11b.2b**.

**⚠⛔ ONE THING RECORDED RATHER THAN FIXED, AND THE REASON IS A RULE.** Prepending the 11b.2 section to
`deferred-work.md` (its newest-first discipline) shifted every Story 11b.1 anchor down by **192**
lines, so `2026-08-30-168`'s pointer to `deferred-work.md:104-121` was **true when written** and now
points short. ⛔ **It is ⛔ NOT corrected in the log:** a decision entry is **never edited in place**,
and a correction would have to be a **new entry binding the old one**
([[feedback_supersede_never_reinterpret]] cl.4) — which a drifted *convenience* pointer does ⛔ not
warrant, especially as the entry also names **item (f)**, which is the stable address. ⇒ the drift is
recorded **at the destination** with the new anchors, and the three artefacts this story **owns** (the
Panel packet · the `epics.md` RECONCILED block · the UX-spec annotation) were corrected.

**⛔ WHAT THIS STORY DID NOT DO, stated so it is not inferred:**
⛔ It publishes **nothing** — no route, no viewer, no cache policy; ⛔ no launch gate closed and ⛔ no
surface opened. ⛔ The contributor **NAME FORM** stays **UNRULED** — the packet is ⏳ **ROUTED, nothing
ratified, nothing applied**. ⛔ No matrix pair declared (the allowlist still has **two** entries,
neither a contributor). ⛔ No i18n key minted and ⛔ no namespace created. ⛔ `member.anonymousMember`
and `ANONYMOUS_MEMBER_I18N_KEY` were **not deleted** — that successor question is **11b.2a's Task 6**.
⛔ No `<StatCardStrip>` stub. ⛔ No status pill, in the presenter **or** as render-layer chrome (D2(a)
rejected (c) **by name**, and that binds 11b.2b).

**⚠ A11y — family 13's verdict here is *covered-by-construction*, ⛔ never *skipped*.** The four checks
are RN-shaped (`accessible={true}`, `accessibilityValue`, real handlers, announced states) and are ⛔
not constructible in a headless presenter. What this story **does** owe and ships is the a11y REF plus
the **nested two-step `{name}` resolution** written into the type where the consumer will read it.
**Mechanization lands in 11b.2b.**

**⚠ For the reviewer — the one thing most likely to be got wrong downstream:** the `rowA11y` doc-block
is read by 11b.2b's consumer and prescribes **`t(key, params, { namespace })`**. The namespace is the
**THIRD** argument (`packages/i18n/src/resolver.ts:53`). Passing it second lands it in the params
slot, falls back to `'common'`, and **throws on every row** inside a `renderItem` hot path. ⛔ Do not
"simplify" that call.

### File List

**New — the module (the only code in this story):**
- `packages/ui/src/contribution-list/index.ts`
- `packages/ui/src/contribution-list/view-model.ts`
- `packages/ui/src/contribution-list/presenter.ts`
- `packages/ui/src/contribution-list/i18n-keys.ts`

**New — the teeth:**
- `packages/ui/tests/contribution-list/presenter.test.ts`
- `packages/ui/tests/contribution-list/no-list-iteration.test.ts`
- `packages/ui/tests/contribution-list/forbidden-imports.test.ts`
- `packages/ui/tests/contribution-list/death-term.test.ts`
- `packages/ui/tests/package-boundary.test.ts`

**New — governance:**
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-08-30-contributor-name-public-tier.md`

**Modified:**
- `packages/ui/src/index.ts` (one `export *` + its per-story annotation)
- `.decision-log.md` (Decision `2026-08-30-168`)
- `_bmad-output/planning-artifacts/epics.md` (the `RECONCILED 2026-08-30 (AI-11a-1(b))` block)
- `_bmad-output/planning-artifacts/ux-design-specification.md` (five `AMENDED 2026-08-30` annotations)
- `_bmad-output/implementation-artifacts/deferred-work.md` (the 11b.2 section; item (f) discharged)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (row → `review`; ledger `2026-08-30i`)
- `_bmad-output/implementation-artifacts/11b-2-contribution-list-components-table-mobile-row.md` (this file)

⛔ **Deliberately NOT in this list:** `packages/ui/package.json` · `packages/contracts/**` ·
`apps/**` · `friction-budget.md` · `public-vs-private-matrix.yaml`.

### Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-08-30 | 1.0 | **IMPLEMENTED.** Four commits, governance first: `f513816` (Task 0 — Decision `2026-08-30-168` transcribing all NINE; the `epics.md` RECONCILED block; the UX-spec amendment across all five anchors; `deferred-work.md` item (f) **discharged**) · `6028581` (Tasks 1-2 — the four-file `contribution-list` module + five test files; ⛔ the only code in the story) · `9560fb0` (Task 3 — the SIX roman-numerled deferrals, the (vii)/(viii) not-recorded stubs, the (ix) adapter-seam **discharge**, and the D7-nameform Panel packet in `planning-artifacts/`) · this one (Task 4 — close-out). ⭐ **The teeth were MUTATION-VERIFIED: nine deliberate breakages, nine bites**, including both directions of AC4(c) and the `@twt/tokens` value-import hole that `package-boundary.test.ts` is blind to by construction. ✅ `@twt/ui` 251 tests · typecheck 20/20 · `eslint` clean · `ci:local` **33 jobs green including `integration-tests`** (the leg was run, ⛔ not skipped). ⚠ Recorded rather than fixed: prepending the 11b.2 section shifted `deferred-work.md`'s 11b.1 anchors by 192, so `-168`'s `:104-121` pointer drifted — ⛔ **not** corrected in the log, because a decision entry is never edited in place ([[feedback_supersede_never_reinterpret]] cl.4); the drift is recorded at the destination. ⚠ Un-attested: the `unknown` branch is unexercised. Status → `review`. | BigDev + Claude |
| 2026-08-29 | 0.1 | Story authored at `80e0d12`. Five defective AC clauses found. Seven decisions raised, all unruled. | BigDev + Claude |
| 2026-08-29 | 0.2 | **Validation pass (4 adversarial verifiers at `80e0d12`).** ⭐ **Scope SPLIT three ways** — this file keeps the presenter (the true `[PRIMITIVE]`); the RTBF defect + decrypt bound moved to **11b.2a**; the mobile render layer + a11y moved to **11b.2b**. Findings applied: **(1)** the authoring pass specified a **guaranteed runtime crash** — `member.anonymousMember` is a **`common`** key while `contributor_list.*` is `contribution`, and `t()` throws ⇒ AC2 now requires namespace-tagged refs. **(2)** ⛔ **C-1 was read backwards** — `-154` cl.6 ruled `apps/public` **adds** `@twt/ui` as *"an ORDINARY DEPENDENCY ADDITION"* and `:1734` records *"there was no declination"*; 11b.1's decline was scope-limited and named **11b.2** as the consumer. D1's ground corrected to *"no host exists"*. **(3)** `resolveMemberDisplayName` returns **THREE** kinds, not two. **(4)** The presenter's type is now **written out** (AC3) instead of described in prose. **(5)** Trap 3 added — importing `MemberDisplayName` from `@twt/domain` violates AC1 and trips the bundle-boundary trap; 9.12's local-structural-mirror is the solution. **(6)** Trap 4 added — 9.12's review found a throwing presenter on a fail-soft path; the blast radius here is a `renderItem` hot path. **(7)** AC4 now names **both halves** of the 9.12 anti-widening precedent; AC5's scans given three anti-vacuity properties. **(8)** Deferral **(d) DELETED** — already open at `deferred-work.md:97-100`; **(b)** re-framed as 8.3 D11's re-trigger having fired at 11a.1. **(9)** D7 packet must record that the 11b.9 precedent is **inert** and that `-162` cl.2 retired two adjacent consent types. **(10)** Task 0 rewritten from *"mint BigDev's rulings"* to **TRANSCRIBE-or-STOP**. **(11)** Status → `blocked-awaiting-decisions` + Preflight (⚠ superseded by 0.3 — the Status now reads `ready-for-dev`). **(12)** friction-budget AC-4 confirmed **dormant** here. Line-range corrections: `catalog.ts` imports `:29-56`; `microcopy.yaml` `:350-352`; ux-spec inventory `:1158` only. | BigDev + Claude |
| 2026-08-29 | 0.3 | **Ruling pass (BigDev).** D2(a) · D6(a) · D7(a) ruled with grounds and rejection reasons; every `[GATED ON Dn]` marker cleared; Status → `ready-for-dev`; Preflight added on TRANSCRIBE-or-STOP terms. ⛔ No AC re-scoped. | BigDev |
| 2026-08-30 | 0.5 | **THIRD validation pass (4 adversarial verifiers at `c9d86ab`), and the headline is that this file had been SUPERSEDED BY ITS OWN SIBLINGS FOR SIX COMMITS.** Baseline re-pinned `9b05372` → **`c9d86ab`**. ⚠⛔ **The second pass's *"not a single verified claim moved"* argument was TRUE for code and BLIND to what broke:** the four `_bmad-output/` files in that diff are the three sibling stories plus the ledger — the governance state this file depends on most. **11b.2a's D5** (RTBF **omits** the contributor entirely) and **D6(a)** (⛔ no `anonymized` presenter variant) plus the **D3-shape(i)/D3-key/D3-rollout VACATIONS** and **11b.2b's D10** all landed after v0.4, and **11b.2a's Task 6 + 11b.2b's Task 0 routed SEVEN artefacts into this file BY LINE NUMBER. ⛔ ZERO had been absorbed**, while the story sat `ready-for-dev` with Task 1 `startable`. All seven are now applied. ⭐ **Three NEW decisions ruled by BigDev, all raised by this pass: D11-outputshape(a)** — the view-model's `displayName` collapses to a **single `nameParts` arm** (D6(a) left `i18n` with zero emitters and `literal` was already unreachable); **D12-refscope(a)** — per-**ref** namespace tagging **survives on a NEW ground** (11b.2b's AC6 reads the record by name) with the union narrowed to `'contribution'`; **D13-numbering(a)** — this story's D6/D7 are renamed **`D6-uxspec`/`D7-nameform`**, on the `D5`→`D5-prototype` precedent, because 11b.2a has DIFFERENT rulings under the same numbers and both Task 0s mint against one log head. **BLOCKERS fixed: (1)** AC3's `rowA11y` doc-block — ordered written **verbatim**, and read by 11b.2b's consumer — prescribed `t(key, {namespace}, {name})`, but `t(key, params?, options?)` puts the **namespace THIRD** (`resolver.ts:53`): it resolved in the default `common` namespace and **threw on EVERY row**, on a `renderItem` hot path. The AC written to prevent a crash shipped the crash. **(2)** AC1(a) banned the bare token **`do`**, which is a substring of **`readonly`** — unsatisfiable against this story's own mandated types; now word-boundary regexes. **(3)** AC4(c) prescribed a **runtime** assertion over the **compile-time** `AllKeys<T>`; the naive reading is a hand-written array, vacuous by construction (the `38a2d8b` class). Now a typed `Record<AllKeys<T>, true>` literal that bites in both directions. **(4)** `rowKey`'s removal is **COUPLED to AC4(a)'s literal** — dropping it from the interface alone makes the literal an excess property and **typecheck fails**; ⛔ neither sibling's routing named `:461`. **(5)** The trip-wire fired and was scoped to *"amended"* (it was **vacated**) and to `view-model.ts` (seven files were affected); it moved to the **Preflight** as a STOP condition. **Defects fixed:** *"exactly ONE committed document"* assumes the contributor name form — **FALSE, it is three** (`epics.md:3145`, `:3238`, `:4931`), and it was a rejection ground for D9(b); AC7's packet was pathed to `implementation-artifacts/` when **all 22** routing notes live in `planning-artifacts/`; `pending` collides with two of AC2's ten mandated refs under AC4(c) (scope clause added; `utr` collides with nothing); AC1(b) fails `eslint` without `void`; Task 2's path origin was off by one level — the silent skip it warns about; AC6 mandated roman numerals then wrote a bare `(b)`; **"four items" vs "SEVEN"** (now **SIX**, agreeing in all three places); *"ALL FIVE decisions"* vs AC0's six (now **NINE**); *"eight list-level keys"* listing nine; AC5(b)'s *"assert them in the COMMENTS too"* admitted the **inverse** reading; the adapter obligation was **discharged by 11b.2b's AC9** and still recorded outstanding; AC8's five anchors never reached Task 0; D7's own ground used *"blocked"*, the word AC7 bans by name. Citation corrections: `-160` cl.7 at **`:746-750`** (⛔ not `:676-680`) · the "two committed records" pair is `epics.md:4868` + `matrix yaml:361`, recorded at `.decision-log.md:1068-1069` (⛔ not `:1061`) · `bmad-code-review.toml` is under `_bmad/custom/` · `matrix.ts:392-404` · `handlers.ts` comment `:313-315` · sprint head **`2026-08-30g`** (⛔ not `2026-08-29g`) · 143 → **152** `governance:` commits · `pool-contributor-list.ts:88`'s *"unbuilt"* comment fenced. | BigDev + Claude |
| 2026-08-29 | 0.4 | **Second validation pass (4 adversarial verifiers at `9b05372`).** Baseline **re-pinned `80e0d12` → `9b05372`** — ⛔ no verified claim moved (the commit is governance-only; ⛔ no cited path is in its diff), the `fe8a6f9` precedent. ⭐ **Two NEW decisions ruled by BigDev, both raised by this pass: D8(a)** — an `unknown`-name row **THROWS** and mints nothing (the three rejected options included reusing `member.anonymousMember`, which would have asserted an **RTBF erasure that never happened**); **D9(a)** — the presenter emits name **PARTS** and ⛔ never joins them, because a join would have **ruled the contributor name FORM** inside `presenter.ts` — the exact question D7(a) ruled must not be ruled and AC6 routes to the Panel. **Defects fixed: (1)** `rowKey` was mandated in prose, absent from the "verbatim" types, and would have been **locked in as a passing gate** by AC4's `Record<keyof …>` — found independently by three verifiers. **(2)** The Launch-posture block restated a **three-gate posture Story 11b.9 falsified on two legs one commit earlier**, and misnamed the third (a preserved *basis* substituted for the gate that fell) — contradicting this file's own AC7. **(3)** AC5's death-term scan was **vacuous by construction** (asserted on parsed import specifiers; a death term is never one) — now two tests, two mechanisms, plus a comments-inclusive half. **(4)** The Preflight sent the dev agent to branch off `main`, where this file still reads `blocked-awaiting-decisions`. **(5)** AC8 was scoped to `:1158` "only", leaving the section titled *"Public Column Inventory — Sahyog List"* (`:1287-1298`) un-annotated. **(6)** The decision-log transcription discharged **no AC** — now **AC0**. **(7)** "Passes the `i18nKey` through" vs "mints it" — the file said both; the presenter mints, and the un-linked duplicate is routed. **(8)** AC4 was defeatable by one nested or renamed field; AC1's iteration scan had no Task; AC7's packet had no destination file. **(9)** Deferral lettering collided with 11b.1's existing (a)–(j) ⇒ roman numerals, seven items, incl. the commitlint item the ledger and 11b.2a both expect here. **(10)** No decision-number collision rule for two parallel Task 0s. Citation corrections: `handlers.ts:312-318` · `status-pill-render.test.ts:31-32` · `presenter.test.ts:151-192` · `view-model.ts:17-29` · `pool-contributor-list.ts:39-40` · `epics.md:4930-4932` · `.decision-log.md:1068-1069` · `matrix.ts:401-402` (deceased, ⛔ not contributor) · pagination literals are re-exports · 142→143 `governance:` commits · D9(a) does ⛔ not say "reorder" · §4.4 SPEAKS to but ⛔ governs nothing. | BigDev + Claude |
