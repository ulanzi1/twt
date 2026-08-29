---
baseline_commit: 9b05372ad08aa39a933e6e374e0718cf26514d01
---

# Story 11b.2: ContributionList Presenter — the sixth `@twt/ui` module `[PRIMITIVE]`

Status: ready-for-dev

> ⭐ **ALL FIVE DECISIONS ARE RULED (BigDev, 2026-08-29): D2(a) · D6(a) · D7(a) · D8(a) · D9(a).**
> ⛔ Nothing in this story is gated any longer. Start at Task 0.

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

⭐ **All five decisions are RULED (BigDev, 2026-08-29): D2(a) — ⛔ no status on the row · D6(a) — YES,
write the UX-spec amendment · D7(a) — record the question, ⛔ rule nothing · D8(a) — the `unknown` row
THROWS and ⛔ mints nothing · D9(a) — the presenter emits name PARTS and ⛔ never joins them.** They
are written in the Decisions section below with their grounds.

⛔ **Task 0 TRANSCRIBES those rulings into `.decision-log.md`. It does ⛔ NOT author them, ⛔ not
paraphrase them, and ⛔ not supply a ground.** ⚠ If any decision below has been edited back to UNRULED,
**STOP and report blocked** ([[feedback_supersede_never_reinterpret]]).

> ⭐ **BASELINE RE-PINNED `80e0d12` → `9b05372` (second validation pass, 2026-08-29). ⛔ NOT A SINGLE
> VERIFIED CLAIM MOVED** — `9b05372` is governance-only: `git diff --name-only 80e0d12..9b05372` returns
> **four `_bmad-output/` files** (this file, `11b-2a`, `11b-2b`, `sprint-status.yaml`) and ⛔ **zero**
> files under `packages/` · `apps/` · `scripts/` or any root config. Every `:NNN` below was checked
> against the cited path, and ⛔ **no cited path is among those four** — so every reference still
> resolves byte-for-byte. ⚠ ⛔ Do ⛔ not re-verify them on the SHA change alone (the `fe8a6f9` precedent).
>
> ⚠⛔ **THIS STORY IS ⛔ NOT ON `main`. ⛔ DO NOT BRANCH OFF `main`.** At validation
> `origin/main == 80e0d12` and `9b05372` lives only on **`governance/11b-2-validate-split`** (zero
> ahead / one behind, tree clean). ⛔ **`main` still carries the PRE-RULING file**, whose Status reads
> `blocked-awaiting-decisions` and which orders you to stop. ⇒ `git fetch origin`, then branch off
> **`9b05372`** — or off `main` **after** that branch merges. ⚠ Re-`fetch` before you branch.
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

**Outcome 1 — RTBF.** An `anonymized` member renders the ratified *"an anonymous member"* marker
regardless of any residual stored name (`member/display-name.ts:47-58`, Story 3.12 defense-in-depth).
**In the member's terms:** *"if you exercised your right to erasure, your contribution stays counted
but your name does not appear next to it — anywhere, on any surface, in any language."*

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
| The **RTBF display seam** | ✅ `packages/domain/src/member/display-name.ts:47-58` — `resolveMemberDisplayName({state,name})`. ⛔⛔ **IT RETURNS THREE KINDS, ⛔ NOT TWO:** `{kind:'name',value}` · `{kind:'unknown'}` · `{kind:'anonymized',i18nKey}` (`:36-39`). `unknown` fires when `name === null` (`:54-55`), and only after the `anonymized` short-circuit at `:51-53`. ⚠⛔ **THE `anonymized` VARIANT CARRIES ITS OWN `i18nKey` — BUT ⛔ IN `@twt/domain`, WHERE THIS PRESENTER CANNOT REACH IT** (Trap 3). ⇒ the presenter **declares the key itself** in `i18n-keys.ts` and the presenter's INPUT variant carries ⛔ **no key** — a caller-supplied key defeats AC2's *static* namespace pairing, which is the whole crash-prevention mechanism. ⛔ An earlier pass wrote *"the presenter passes it through, it does not mint one"*; that is **false** and would have produced a runtime-supplied key AC2 cannot pair. ⚠ The declared key is therefore a **deliberate duplicate of `ANONYMOUS_MEMBER_I18N_KEY` that nothing links** — AC2's locale-JSON test is the only thing holding it true; Task 3 routes the un-linked duplication as deferred work. |
| ⭐⛔ The **i18n namespace of that key** | ⛔⛔ **`common`, ⛔ NOT `contribution` — AND THIS IS A CRASH, NOT A TIDINESS POINT.** `ANONYMOUS_MEMBER_I18N_KEY = 'member.anonymousMember'` resolves in `packages/i18n/locales/{en,hi}/common.json:215`. The `contributor_list.*` keys live in `contribution.json:30-39`. ⚠ `t()` **THROWS** on a miss. ⇒ **a view-model that emits bare string keys guarantees a runtime throw on the anonymized row** — the exact row this story exists to render correctly. → **AC2**. |
| The **existing `contributor_list.*` keys** | ✅ `contribution.json:30-39` — `confirmed_header · empty · no_pool · pending_strip · pending_strip_a11y · row_a11y · title · view_cta · view_cta_a11y · view_cta_hint`. ⭐ **Reuse them; ⛔ mint nothing.** ⚠ `row_a11y = "{name}, confirmed contributor"` takes a **`{name}` param** — see AC3. |
| The `@twt/tokens` roles | ✅ `packages/tokens/src/tokens.ts:42 'status-confirmed'` · `:45 'status-held'`. ⛔ The presenter emits the role **NAME**, ⛔ never a hex. |
| The **status-pill presenter** is reusable as-is | ✅ `packages/ui/src/status-pill/` — `deriveStatusPillViewModel(status)`, 5 states, `satisfies Record<ContributionStatus,…>`. ⚠ Reusable ⛔ only if a row HAS a status — and the 8.3 contract deliberately gives it none. → **D2**. |
| The **matrix Tier-1 allowlist** | ⛔ **TWO ENTRIES, NEITHER A CONTRIBUTOR.** `matrix.ts:392-403`: `member-directory.member_name` (`:394`) · `sahyog-drive.deceased_member_name` (`:403`). The third widening (`2026-08-28-165` cl.1) is **four nominee-bank fields** on `sahyog-vivran` (`account_holder_name · account_number · ifsc · vpa`), added by **11b.3** at surface declaration — ⛔ not yet in the file. `:390-391`: *"do NOT 'fix' a failing third entry by appending it here — that inverts the control. The gate failing is the gate working."* |
| The **contributor NAME FORM** is ruled | ⛔ **NO — unruled since 2026-08-19, re-affirmed undisturbed by D10 and at `.decision-log.md:1061`.** ⚠ The counterweight, and it is **ONE, ⛔ not two**: the epic AC for this story specifies *"first-name + last-initial"* (`epics.md:4931`). ⚠⛔ **`matrix.ts:401-402` is ⛔ NOT a second one** — an earlier pass cited it as such, but read in full it is about the **DECEASED MEMBER's** name on 11b.3 / 11b.6 (*"those keep first-name + last-initial, and moving them requires each surface's OWN Panel ruling"*), ⛔ **not a contributor's**. ⇒ exactly **one** committed document assumes the form for contributors, and "unruled" survives comfortably. → **D7**. |
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

The obvious way to type the `name | unknown | anonymized` variant is
`import type { MemberDisplayName } from '@twt/domain'`. That **(a)** violates AC1's dependency
invariant, **(b)** trips [[project_contracts_domain_bundle_boundary]] (leaks `pg` into the RN Metro
bundle), and **(c)** is exactly the [[project_type_only_import_cycle_trap]] shape — it typechecks,
lints and passes local tests while breaking **consuming** packages at runtime.

⭐ **9.12 already solved this and you should copy the solution, not rediscover it:**
`pool-progress/view-model.ts:17-29` — doc-block at `:17-24` (the sentence that carries it is `:20`),
**declaration** at `:25-29` — declares a **local structural type** mirroring the contracts DTO and
says so in the doc-block. Do the same for the display-name variant. ⚠ Note the honest difference:
9.12's really is *structural* (field-identical to the DTO); ours mirrors the **kind tag only**.

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

`.decision-log.md` gains **one dated decision** whose clauses transcribe **D1** (ruled by
construction), **D2(a)**, **D6(a)**, **D7(a)**, **D8(a)** and **D9(a)** from this file's Decisions
section — **one clause each**, the **ground quoted verbatim**, the number read **live** from the head
(`2026-08-28-167` at validation; ⛔ never hardcoded).

⛔⛔ **The dev agent does ⛔ not author, ⛔ not paraphrase, ⛔ not re-ground and ⛔ not re-scope them.**
⚠ If any decision in this file reads UNRULED, **STOP and report blocked**
([[feedback_supersede_never_reinterpret]]). It lands in its **own** commit, `governance:` prefixed,
**before** the first line of `packages/ui/src/contribution-list/`
([[feedback_governance_commits_precede_implementation]]).

⚠ **Why this is an AC and not only a Task:** without it a reviewer can walk AC1→AC8, find every box
ticked, and pass the story with an **empty decision log** — leaving the shipped code resting on
rulings that exist only inside a story file. That is the decay shape D6(a) and D3-rollout(a) each name
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
**And** `packages/ui/package.json` `dependencies` stays **exactly `@twt/contracts`** — a test asserts
it. ⚠ **The test must ALSO assert `@twt/tokens` stays out of `dependencies`** (it is currently a
`devDependency`, so a `dependencies`-only assertion passes while a value import would still
typecheck and become a real bundle edge for `apps/mobile`).
**And** the ROW presenter is **`deriveContributionRowViewModel(row)`** — one row in, one view-model
out. **Mechanically asserted, ⛔ not asserted as a wish** — and in **two** halves, because the text half
alone is a proxy:
 **(a) the source half** — over **all** files in the module (`readdirSync`, comment-stripped by the
     same helper AC5 uses; ⛔ not `presenter.ts` alone, since a mapping helper parked in
     `view-model.ts` defeats a single-file scan): no `.map(` / `.flatMap(` / `.forEach(` / `.filter(`
     / `.reduce(` / `Array.from(` / `for` / `while` / `do` token appears. ⚠ Note `for` and `while`
     **without** a trailing space — `for(` defeats a `for (` scan.
 **(b) ⭐ the compile half, which is the one with real teeth** — a runtime test cannot see a
     TypeScript parameter type, so assert it as a type:
     `type _P = Parameters<typeof deriveContributionRowViewModel>[0];`
     `type _NotArray = _P extends readonly unknown[] ? never : true;`
     `const _assertNotArray: _NotArray = true;`
     — an array parameter then fails `pnpm turbo run typecheck` (`scripts/ci-local.sh:41`).
⛔ There is **no** function in this module that maps or iterates a full row set.

### AC2 — ⭐ Every emitted i18n reference carries its NAMESPACE

The view-model emits **`{ key, namespace }` pairs**, ⛔ never bare string keys.

**Ground, and it is a crash, not a style point:** `member.anonymousMember` resolves in **`common`**
(`locales/{en,hi}/common.json:215`) while `contributor_list.*` resolves in **`contribution`**
(`contribution.json:30-39`), and `t()` **throws** on a miss. A bare-key view-model forces the render
layer to guess one namespace for both and guarantees a throw on the anonymized row.

```ts
/** An i18n key plus the namespace it resolves in. `t()` defaults to `common` and THROWS on a miss,
 *  and this module emits keys from BOTH namespaces: `contributor_list.*` lives in `contribution`
 *  (contribution.json:30-39); `member.anonymousMember` lives in `common` (common.json:215). */
export interface ContributionListI18nRef {
  readonly key: string;
  readonly namespace: 'contribution' | 'common';
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

**And** it declares refs for **all ten** `contributor_list.*` keys plus `member.anonymousMember` — ⛔
not only the two this row presenter emits. ⭐ **Ground:** the eight list-level keys
(`confirmed_header · empty · no_pool · title · view_cta · view_cta_a11y · view_cta_hint ·
pending_strip · pending_strip_a11y`) have ⛔ no emitter here (Trap 1 forbids a list presenter) but
**will** be consumed by 11b.2b — and a bare key there is **this AC's crash, one story later**.

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
AC2 is deliberately **stronger** — per-**ref**, not per-**module** — because this module spans **two**
namespaces and a per-module constant cannot express that.

### AC3 — The shape, written out ✅ `[D2(a) · D8(a) · D9(a) RULED]`

`view-model.ts` declares these types. ⭐ **The invariant is the SHAPE; the doc-block carries it, the
way `pool-progress/view-model.ts:9-15` does.**

```ts
/** Confirmed-only, by SHAPE (Stories 8.3 + 9.5). The INPUT carries NO way to express
 *  yellow/pending/attested/projected/utr/status — a row's mere presence means confirmed
 *  (pool-contributor-list.ts:39-40). Adding such a field is the one change this module exists to forbid.
 *  ⛔ Local KIND-TAG mirror of @twt/domain's MemberDisplayName — NOT imported (Trap 3).
 *  ⚠ It mirrors the DISCRIMINANT only, not the payloads: domain has {kind:'name', value} and
 *  {kind:'anonymized', i18nKey}; this has wire-shaped name PARTS and a bare 'anonymized'. */
export type ContributionRowDisplayName =
  | { readonly kind: 'name'; readonly firstName: string; readonly lastInitial: string }
  | { readonly kind: 'unknown' }
  | { readonly kind: 'anonymized' };

export interface ContributionRowInput {
  readonly displayName: ContributionRowDisplayName;
  readonly poolLetterCode: string;
  /** The ruled opaque virtualization identity (11b.2a D3-shape(i)(a)) — carried through UNCHANGED.
   *  ⛔ Neither derived nor interpreted; it is IDENTITY, not content, and must never reach a
   *  rendered string. ⚠ It sits at ROW level here; on 11b.2a's wire it sits INSIDE each union
   *  variant — the re-nesting is the render layer's adapter's job, ⛔ not the presenter's. */
  readonly rowKey: string;
}

export interface ContributionRowViewModel {
  /** Name PARTS to join, a literal to print, or an i18n ref to resolve — never a bare key.
   *  ⛔ The presenter NEVER joins firstName + lastInitial: the contributor name FORM is UNRULED
   *  (D7(a)), AC6 item (iii) routes it to the Panel, and joining it here would RULE it. D9(a). */
  readonly displayName:
    | { readonly kind: 'nameParts'; readonly firstName: string; readonly lastInitial: string }
    | { readonly kind: 'literal'; readonly value: string }
    | { readonly kind: 'i18n'; readonly ref: ContributionListI18nRef };
  readonly poolLetterCode: string;
  readonly rowKey: string;
  /** `contributor_list.row_a11y` = "{name}, confirmed contributor" — takes a `{name}` param the
   *  presenter does NOT fill. The consumer resolves in TWO steps, in this order:
   *    1. resolve `displayName` — 'nameParts' → join per the ruled form; 'literal' → .value;
   *       'i18n' → t(ref.key, { namespace: ref.namespace })
   *    2. t(rowA11y.ref.key, { namespace: rowA11y.ref.namespace }, { name: <step 1> })
   *  ⛔ The presenter composes neither string. */
  readonly rowA11y: { readonly ref: ContributionListI18nRef };
}
```

⚠ ⭐ **THE INPUT IS ⛔ NOT THE WIRE ROW, AND THE DIFFERENCE IS DELIBERATE.** 11b.2a's ruled row is
**flat** (`{kind, firstName, lastInitial, rowKey}`), and `letterCode` lives **once per response** on
the `pool` identity block (`pool-contributor-list.ts:73-80,94`), ⛔ **not per row**. ⇒ a render layer
must **ADAPT**: re-nest the row's `kind`/name fields under `displayName`, carry `rowKey` across
unchanged, and splice `pool.letterCode` onto each row. ⛔ **This presenter does not do that and must
not** — an adapter that reads a *response* shape is not framework-free and would take a build
dependency on 11b.2a's contract, breaking the parallelism. ⭐ **The adapter is 11b.2b's, and 11b.2b
owes it an AC** — routed by Task 3, ⛔ not assumed.

⚠ **AC3 rests on a ruling owned by a story running in PARALLEL.** If 11b.2a's D3-shape(i) is amended,
this AC3 is **stale** — re-read `11b-2a-…md` before writing `view-model.ts`.

**And ⛔ THREE kinds, not two.** `resolveMemberDisplayName` returns `name | unknown | anonymized`
(`display-name.ts:36-39`); `unknown` fires on a null name (`:54-55`). The presenter handles all three
with an **exhaustive `never` check over the kind discriminant**, ⛔ never a silent fall-through to a
blank name.

⭐ **AND `unknown` HAS A RULED OUTPUT — ⛔ IT IS NOT LEFT TO THE IMPLEMENTER. `[D8(a) RULED]`**
**`unknown` THROWS, and ⛔ NO KEY IS MINTED FOR IT.** ⚠ This is a **posture**, ⛔ not an oversight:
 · ⛔ **`{kind:'literal', value:''}` is FORBIDDEN** — a blank where a name belongs, banned below.
 · ⛔⛔ **REUSING `member.anonymousMember` IS FORBIDDEN, AND IT IS THE DANGEROUS ONE.** It would tell
   every reader *"this person exercised their right to erasure"* when the name was merely **null** —
   a **false statement about a data-subject right**, on the one surface Outcome 1 exists to protect.
 · ⛔ **Minting `contributor_list.unknown_contributor` is FORBIDDEN HERE** — no producer can emit
   `unknown` today (11b.2a's boundary `continue`s on a null ciphertext, `handlers.ts:312-318`), so
   the copy would be speculative. ⭐ **11b.3 mints it** at the point a producer that can emit it exists.
⇒ the branch is kept, **throws**, and is recorded **un-attested / unexercised**
([[feedback_record_unattested_no_backfill]]) — ⛔ never written up as tested. ⚠ **11b.2b's try/catch
(Trap 4) is the only thing between this throw and a red-boxed list**, which is why that delegation is
⛔ not optional.

⚠ ⭐ **AND THE WIRE CARRIES ONLY TWO — THAT ASYMMETRY IS DELIBERATE, ⛔ NOT DRIFT.** Story 11b.2a's
D3-shape(i) was **RULED (BigDev, 2026-08-29)** as a two-variant discriminated union
(`kind: 'name' | 'anonymized'`, both `.strict()`, both carrying `rowKey`), because the API boundary's
`:313` guard already `continue`s on a null ciphertext ⇒ **`unknown` is unreachable on that producer**.
⛔ Do **not** delete the presenter's `unknown` branch to "match the wire": the presenter is the shared
layer and a **second** producer (11b.3's Astro path) may legitimately hand it an `unknown`. ⇒ keep all
three, and record the `unknown` branch as **un-attested / unexercised by the mobile producer**
([[feedback_record_unattested_no_backfill]]), ⛔ never as tested.
**And** `rowKey` is **declared on BOTH interfaces above** and carried through unchanged — the
presenter ⛔ neither derives nor interprets it. ⚠⛔ **It is ⛔ NOT enough to say this in prose:** an
earlier pass mandated `rowKey` here while omitting it from the "verbatim" types, and AC4's
`Record<keyof ContributionRowInput, true>` would then have **locked the omission in as a passing
gate** while 11b.2b's keyExtractor had no stable identity to read.

**And** ⭐ **THE PRESENTER EMITS NAME PARTS AND ⛔ NEVER JOINS THEM. `[D9(a) RULED]`** For
`kind:'name'` it emits `{kind:'nameParts', firstName, lastInitial}` **unchanged**. ⛔ There is ⛔ **no
`${firstName} ${lastInitial}.`** anywhere in this module. **Ground:** joining them **decides the
contributor name FORM** — the exact question D7(a) ruled must ⛔ not be ruled and AC6 item (iii)
routes to the Panel; a join here would make that routed deferral **false on the day it is written**,
and would hardcode a Latin-script space-and-period form into a package that must also render `hi`.
⭐ The join is **11b.2b's**, under the form the Panel rules; until then 11b.2b uses the form already
committed at `epics.md:4931` and records it **built-to, ⛔ not ratified**.
⚠ The `'literal'` arm is reserved for a future pre-composed producer and is ⛔ **unreachable today** —
record it **un-attested**, ⛔ not tested.

**And** the anonymized case is a **first-class variant** — ⛔ never an empty string, ⛔ never a
caller-supplied literal — emitting `{key:'member.anonymousMember', namespace:'common'}`, a key this
module **declares itself** (it cannot import `ANONYMOUS_MEMBER_I18N_KEY` — Trap 3). ⚠ The presenter
⛔ **does not decide** that a member is anonymized; it renders the decision it is handed.
**And** ⭐ **`contributor_list.row_a11y` = `"{name}, confirmed contributor"` takes a `{name}` param.**
The render layer resolves the display name FIRST and passes the result as `{name}` — a **nested,
two-step** resolution, written out in the `rowA11y` doc-block above **because the consumer is a
different file and will read the type, ⛔ not this paragraph**. ⚠ The `nameParamFrom: 'displayName'`
field an earlier pass specified is **deleted**: a field whose type admits exactly one value carries
⛔ no information — it is a comment wearing a type, and it did not encode the two-call ordering.
**And** the presenter's doc-block states **in terms** that it throws on a corrupt operand and that
**every consumer owes a try/catch** (Trap 4).

### AC4 — Confirmed-only is preserved as a SHAPE ✅ `[D2(a) RULED]`

The INPUT type carries ⛔ no `status` / `yellow` / `attested` / `utr` / `pending` / `projected` field.

**And** the anti-widening test copies **both halves** of the 9.12 precedent
(`packages/ui/tests/pool-progress/presenter.test.ts:151-190`), ⛔ not one:
 **(a) the compile half** — `const INPUT_KEYS: Record<keyof ContributionRowInput, true> = { displayName: true, poolLetterCode: true, rowKey: true };`
     — ⚠ **THREE keys**, matching AC3's declared input exactly. Adding a key breaks the literal as
     *missing*; removing one breaks it as *excess*. ⭐ A unit test cannot assert this at runtime — it
     asserts it **by being a file that fails `pnpm turbo run typecheck`** (the teeth are real:
     `scripts/ci-local.sh:41`).
 **(b) the runtime half** — `for (const banned of ['status','yellow','attested','utr','pending','projected']) expect(INPUT_KEYS).not.toHaveProperty(banned)`.
 **(c) ⭐ the NESTING + RENAME half — ⛔ WITHOUT IT (a) AND (b) ARE DEFEATED BY ONE WORD.** `keyof` is
     **top-level only**, so `displayName: { kind:'name'; …; status:'confirmed' }` widens the row with
     a status and passes **both** halves; so does any rename — `statusKind`, `pendingCount`,
     `isAttested`, `utrRef`. ⇒ the ban is **transitive and substring-matched**: flatten the key set
     (`type AllKeys<T> = T extends object ? { [K in keyof T]: K | AllKeys<T[K]> }[keyof T] : never;`),
     build `NESTED_KEYS` over it, and assert **no flattened key contains** any banned token
     **case-insensitively**. ⛔ A top-level exact-name check alone is a fence with a gate in it.
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

**(b) `death-term.test.ts` — RAW TEXT, and it asserts in BOTH directions.** Assert `account-frozen`,
`account_frozen`, `deceased`, `members.state`, `date_of_death` appear ⛔ nowhere in the
comment-stripped source — **and ⭐ assert them in the COMMENTS too.** ⚠ **The comment half is the
point:** the C-5 inversion above enters as an *idea* ("we should exclude deceased contributors here")
before it enters as a conjunct, and a comment is where it lands first.
⇒ ⚠ The Trap 3 / AC3 doc-blocks must therefore name the forbidden **import symbols** without naming
any **death** term. That is achievable, and it is a real constraint on how those doc-blocks are worded.

⚠ **Comment-stripping is required for (a) and for (b)'s first half** — the doc-blocks must *name* the
forbidden symbols in order to forbid them, and an un-stripped scan false-positives on its own
documentation, after which the next dev weakens the scan. ⭐ **Copy the helper, ⛔ do not re-invent
it:** `apps/mobile/tests/unit/status-pill-render.test.ts:31-32` (the implementation; `:16` is the
rationale).

**And** ⛔ no `'green'` string literal appears anywhere in the module (Trap 2, AC4).

### AC6 — The deferrals are routed, each with a written trigger, ⛔ none marked closed ✅ `[D7(a) RULED]`

⛔ `@twt/ui` is **not** added to `apps/public/package.json`; ⛔ no `.astro` component is authored; ⛔
no matrix surface or field is declared. ⭐ **The ground is that no host exists** (11b.3 is `backlog`)
— ⛔ **not** that C-1 forbids the dep. C-1 **pre-authorised** it as *"an ordinary dependency
addition"* (`.decision-log.md:1741`), so the routing note must say **deferred**, ⛔ never **blocked**.

⚠⛔ **LETTERING — READ THIS BEFORE WRITING A SINGLE ITEM.** `deferred-work.md` **already carries an
unqualified (a)…(j) belonging to 11b.1** (`:21`–`:179`, including the item (e) at `:89` and the item
(f) at `:104` this story cites). ⛔ Filing a *second* (a)/(b)/(e) beside them is a guaranteed
mis-read. ⇒ **this story's items are numbered `11b.2 (i)` … `11b.2 (vii)`**, section-qualified, and
the AC text below uses roman numerals throughout. ⚠ Where this story says *"item (e)"* or *"item (f)"*
it means **11b.1's**, ⛔ never one of these.

Route into `deferred-work.md` in the precise closure language ([[feedback_closure_language_precision]]),
⛔ **none marked closed** — **SEVEN items**:
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
 (vi)  **the un-linked `member.anonymousMember` duplicate** — this module declares the key literal
       because it cannot import `ANONYMOUS_MEMBER_I18N_KEY` (Trap 3), and ⛔ nothing links the two;
       AC2's locale-JSON test is the only thing holding it true — trigger: **`@twt/ui` gaining a
       lawful path to `@twt/domain`'s constant**;
 (vii) **no `t()`-through assertion for `@twt/ui`'s emitted keys** — AC2 reads locale JSON from disk
       because `@twt/ui` cannot depend on `@twt/i18n`; that is the 11a.2 defect's shape, recorded as
       a known limitation — trigger: **11b.2b** (which *can* call `t()`).

⛔⛔ **THE PUBLIC/MEMBER INVERSION IS ⛔ NOT FILED HERE — IT IS ALREADY OPEN.** It sits at
`deferred-work.md:97-100` under **11b.1 item (e)** (`:89`), with the same *"binds 11b.2 and 11b.3"*
language. ⛔ Do not write a second record of one obligation. ⚠ **And state the omission at the
destination**, ⛔ not only here — a future reader of `deferred-work.md` sees only what is in
`deferred-work.md`:
`### ⛔ (viii) — INTENTIONALLY NOT RECORDED. The public/member inversion is already open at 11b.1 item (e) (:97-100). ⛔ Do not write a second record of one obligation.`
**And** ⭐ **(b) is a RE-TRIGGER, ⛔ not a new item.** Story 8.3's D11 deferred exactly this matrix
entry — prescribing `live-contributor-list` (`first_name` + `last_initial`) — with a re-trigger
naming **Story 11a.1**. 11a.1 is `done` and the matrix still has two pairs. ⇒ the routing note must
record *"8.3 D11's re-trigger fired at 11a.1 and was not acted on"* — ⛔ filing it as fresh is the
exact failure D6(b) names, applied to this story.

### AC7 — The Panel packet for D7 is assembled, and it records what is NOT settled ✅ `[D7(a) RULED]`

⭐⛔ **THE PACKET IS A FILE, AND IT IS NAMED — ⛔ "routed to the Panel" is not a mechanism.** Write
`_bmad-output/implementation-artifacts/trustee-panel-routing-note-2026-08-29-contributor-name-public-tier.md`,
on the `trustee-panel-routing-note-2026-08-24-drive-record-publication-basis.md` shape, and add it to
the Project Structure table and the File List. ⚠ Without a path, a reviewer cannot check the document
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

### AC8 — The UX-spec column-inventory amendment is written ✅ `[D6(a) RULED]`

`deferred-work.md` item **(f)** (`:104-121`) names *"Story 11b.2 or 11b.3 authoring, whichever comes
first"*; **it has fired**.

⚠⛔ **THE INVENTORY APPEARS FOUR TIMES, ⛔ NOT ONCE — AND AN EARLIER PASS "CORRECTED" THIS TO
`:1158` ONLY.** Annotating `:1158` alone would leave the section **literally titled *"Public Column
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

- [ ] **Task 0 — Governance first (AC0, AC8)** ✅ `[ALL FIVE RULED — startable]`
  - [ ] Read the `.decision-log.md` head **live** (`2026-08-28-167` at validation; ⛔ do not hardcode
        the next number) and **TRANSCRIBE** into it the rulings **already recorded in the Decisions
        section of this file** — **D1** (ruled by construction: the presenter only; the Astro layer
        deferred because **there is no host**, ⛔ not because C-1 forbids the dep, which `-154` cl.6
        pre-authorised as *"an ordinary dependency addition"*) · **D2(a)** (⛔ no status on the row) ·
        **D6(a)** (write the amendment) · **D7(a)** (record the question, ⛔ rule nothing) ·
        **D8(a)** (the `unknown` row throws; ⛔ mint nothing) · **D9(a)** (emit name parts; ⛔ never
        join) — one clause each, quoting the ground verbatim. ⛔⛔ **The dev agent does not decide,
        does not paraphrase, and does not supply a ground.** ⛔ `governance:` prefix, own commit,
        before any code.
  - [ ] ⚠ ⭐ **AND 11b.2a IS MINTING AGAINST THE SAME HEAD.** The two stories run in **parallel**
        and both read `2026-08-28-167`. ⇒ ⛔ **re-read the head immediately before you write, on a
        freshly-`fetch`ed branch**, and if the number you were about to take is taken, **take the
        next one** — ⛔ never edit, merge into, or renumber 11b.2a's entry
        ([[feedback_supersede_never_reinterpret]]). ⭐ Same rule for the `sprint-status.yaml`
        `last_updated` ledger: **append above whatever head exists**, ⛔ never overwrite a sibling's.
  - [ ] Append the `⛔ RECONCILED 2026-08-29` block to `epics.md`'s Story 11b.2 section — the
        defective-AC findings **and** the 11b.2 / 11b.2a / 11b.2b split, with the new sprint-status
        keys named so a future `sprint-planning` run does not regenerate a ghost. ⛔ Annotate only.
  - [ ] Write the UX-spec amendment (AC8); mark `deferred-work.md` item (f) **discharged by this
        story**, ⛔ not "closed".
- [ ] **Task 1 — The presenter (AC1, AC2, AC3, AC4)** ✅ `[D2(a) RULED — startable]`
  - [ ] ⛔ **Read `packages/ui/src/pool-progress/*` end to end first** — ⚠ **FIVE files, ~245 lines**
        (the fifth is `constants.ts`, and it is the worked answer to "how do I emit a token ROLE
        without importing `@twt/tokens`"). It answers nearly every "how should this be shaped?"
        question here. ⛔ Do not invent a shape.
  - [ ] Create `packages/ui/src/contribution-list/{index,view-model,presenter,i18n-keys}.ts`.
  - [ ] `view-model.ts` — the AC3 types **verbatim** (⚠ they include **`rowKey` on both interfaces**
        and the **three-arm** view-model `displayName` union with `nameParts`), the
        `ContributionListI18nRef` declaration (AC2), the confirmed-only doc-block (AC4) and the
        kind-tag-mirror note (Trap 3).
  - [ ] `presenter.ts` — `deriveContributionRowViewModel(row)`; exhaustive `never` check over the
        three kinds; ⛔ **`unknown` THROWS and mints nothing** (D8(a)); ⛔ **no name join** — emit
        `{kind:'nameParts', firstName, lastInitial}` (D9(a)); doc-block stating it throws and that
        **every consumer owes a try/catch** (Trap 4).
  - [ ] `i18n-keys.ts` — `import type { ContributionListI18nRef } from './view-model.js';` then one
        iterable `CONTRIBUTION_LIST_I18N_REFS` record over **all ten** `contributor_list.*` keys
        (`contribution`) plus `member.anonymousMember` (`common`). ⭐ **Reuse; ⛔ mint nothing, and
        ⛔ do not create a namespace** — a namespace not in `copy_globs` is unscanned copy wearing a
        green check (`microcopy.yaml:350-352`).
  - [ ] `index.ts` — **explicit named exports** on the `pool-progress/index.ts` precedent; then
        barrel from `packages/ui/src/index.ts` with the per-story annotation comment.
- [ ] **Task 2 — The teeth (AC1, AC2, AC4, AC5)**
  - [ ] `packages/ui/tests/contribution-list/presenter.test.ts` — the **three-half** anti-widening
        test (AC4: compile · runtime · **nesting+rename**), the three-kind exhaustiveness test, the
        anonymized-variant test, the **`nameParts`** test (⛔ assert no joined string is ever
        emitted), and the namespace-vs-locale-JSON test over **every declared ref** in both locales
        (AC2). ⛔ **Do not write a passing test for the `unknown` branch's reachability** — record it
        in **Completion Notes** and as AC6 item (i)-adjacent deferred work under Task 3:
        *"the `unknown` display-name branch is unexercised by the mobile producer (11b.2a's wire is
        two-variant); un-attested, ⛔ not tested. Trigger: 11b.3's Astro producer."*
  - [ ] `packages/ui/tests/contribution-list/no-list-iteration.test.ts` (AC1) — the source half over
        **all** module files (`readdirSync`, comment-stripped) **and** the compile-time
        array-parameter assertion. ⛔ Both halves; the source half alone is a proxy.
  - [ ] ⛔ **TWO scan files, ⛔ not one** (AC5): `forbidden-imports.test.ts` (parsed import
        specifiers, incl. `react`/`react-native`/`astro`/`@twt/tokens`) **and** `death-term.test.ts`
        (raw text, asserting in the comment-stripped source **and** in the comments). ⚠ Merging them
        makes the death half **vacuous for every possible file**. Plus the `'green'`-literal check.
  - [ ] `packages/ui/tests/package-boundary.test.ts` — `dependencies` is exactly `@twt/contracts`
        **and** `@twt/tokens` is absent from `dependencies` (AC1). ⚠ Write out the relative path from
        `packages/ui/tests/` to `packages/i18n/locales/` for the AC2 test — a wrong path is a
        **silent skip** if the test guards on file existence.
- [ ] **Task 3 — Route the deferrals (AC6, AC7)** ✅ `[D7(a) RULED — startable]`
  - [ ] **SEVEN items — (i) … (vii)**, roman-numeralled and section-qualified as `11b.2 (i)` etc.
        (⚠ `deferred-work.md` already holds 11b.1's unqualified (a)…(j)), each with a named
        re-trigger, ⛔ none marked closed. ⛔ **The public/member inversion is NOT filed** — it is
        already open at `deferred-work.md:97-100`; write the `⛔ (viii) — INTENTIONALLY NOT RECORDED`
        stub **in `deferred-work.md` itself**, ⛔ not only in this story.
  - [ ] ⚠ **Item (v) — the commitlint divergence — is ⛔ not optional.** `sprint-status.yaml` and
        **11b.2a both bank on this Task writing it**. ⛔ Do not stop at four items.
  - [ ] (ii) is written as **8.3 D11's re-trigger having fired at 11a.1**, ⛔ not as a fresh item.
  - [ ] Write the D7 Panel packet as its **own named file** (AC7) —
        `trustee-panel-routing-note-2026-08-29-contributor-name-public-tier.md` — with **all SIX**
        recordings: (1) the allowlist has **two** entries; (2) the third widening is **four
        nominee-bank fields on `sahyog-vivran`**, ⛔ nothing contributor-shaped; (3) `-165` cl.2 is
        scoped to **account** fields, so *"a shielded contributor name is still Tier-1"* is a **sound
        inference via `pii_tier` being a fact about the data** — ⛔ **not** something the ruling
        decided; **say so in those words**; (4) the **asymmetry** (basis settled; matrix declaration
        and mechanism not); (5) the 11b.9 precedent is **INERT**, and its wait is a ruled **CHOICE**,
        ⛔ not a block; (6) `-162` cl.2 retired `sahyog_vivran_publication` + `in_memoriam_listing`.
        ⛔ **Ruling nothing** (D7(a)). Add the file to the Project Structure table and the File List.
  - [ ] ⭐ **Route the ADAPTER to 11b.2b** — the wire row is flat and `letterCode` is per-response,
        so a render layer must re-nest and splice (see AC3). ⛔ 11b.2b does not currently own it in
        an AC; record it so the seam is not assumed.
- [ ] **Task 4 — Close out**
  - [ ] `pnpm --filter @twt/ui test` · `pnpm turbo run typecheck` (⭐ where AC4's compile half bites)
        · then `pnpm ci:local` green. ⚠ `git push` runs the full `ci:local` via a pre-push hook —
        that is the "hang", ⛔ not a failure. ⚠ `integration-tests` concurrency is `1` and is
        **LOAD-BEARING** — ⛔ never raise it.
  - [ ] ⛔ **`friction-budget.md` is NOT touched by this story** — AC-4 is a path trigger over
        `apps/mobile/` + `apps/public/` (`scripts/friction-budget/lib.ts:453`), and this story
        touches neither. The leg stays **dormant**. (11b.2b owes it.)
  - [ ] Flip `development_status[11b-2-contribution-list-components-table-mobile-row]` and add ONE
        combined top-of-file `last_updated` entry ([[project_sprint_status_ledger]]). ⚠ The head is
        **already an 11b.2-family entry** — at the second validation pass it was **`2026-08-29g`**,
        and it may have moved again (11b.2a is running in parallel). ⇒ **read it live**, take the
        next free suffix, and ⛔ **do not overwrite any existing entry.**

---

## ⚖️ Decisions — ✅ **ALL FIVE RULED (BigDev, 2026-08-29).** ⛔ Do not re-litigate.

> ⭐ D1, D3, D4 and D5 from the authoring pass were **resolved by the split**. D3/D4 moved to
> **11b.2a**; D5 moved to **11b.2b** (⛔ ruled there, ⛔ not here). D1 is ruled-by-construction below.

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

### ✅ D6 — Write the UX-spec amendment? → **(a) YES.** RULED 2026-08-29.

`deferred-work.md:121`'s trigger — *"Story 11b.2 or 11b.3 authoring, whichever comes first"* — **has
fired**.

**Ground:** the trigger names this story; the findings are verified; and deferring again re-commits the
*"unowned for seven epics"* pattern the item itself names. ⛔ (b) (leave it for 11b.3) was rejected
because *"then the trigger fired and nothing happened, which is how a real obligation disappears"* —
⭐ **and AC6 records that exactly this has ALREADY happened once on this surface** (8.3's D11
re-triggered at 11a.1 and vanished).

### ✅ D7 — The contributor name at `public` tier, and its FORM → **(a) record the question, ⛔ rule nothing.** RULED 2026-08-29.

**Ground:** ⛔ nothing this story BUILDS requires an answer — it is raised because 11b.3 cannot start
without one, and the evidence was assembled here. ⇒ **AC6 and AC7 proceed exactly as written.**

⛔ (b) (rule the name form now) was rejected: **BigDev may not have standing** — two committed records
reserve a public name-form change to the **Panel** (`epics.md` 11b.1's 2026-08-19 block;
`.decision-log.md:1061`). ⛔ (c) (member-tier only, never public) was rejected: it contradicts 11b.3's
shipped epic AC, which names the contributor list as public shell content.

⚠ ⭐ **WHAT (a) COMMITS THIS STORY TO — ⛔ it is not a way of doing nothing.** AC7's packet is
**assembled and routed to the Panel**, and it must record the three things that make it honest:
· the third matrix widening is **four nominee-bank fields on a different surface**, ⛔ nothing
  contributor-shaped;
· `-165` cl.2 is scoped to **account** fields, so the *"shielded ⇒ lower tier"* foreclosure is a
  **sound inference via `pii_tier` being a fact about the data**, ⛔ not something the ruling decided;
· **the 11b.9 precedent is INERT** — no `clause_versions` row, the predicate false for every member,
  blocked on counsel's **2026-09-07** return **and** a second real person holding `niyamavali.review`
  — and `-162` cl.2 retired `sahyog_vivran_publication` + `in_memoriam_listing`.

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

**Ground:** **joining them DECIDES the contributor name FORM** — the exact question **D7(a) ruled must
⛔ not be ruled**, and which **AC6 item (iii)** routes to the Panel. A join in `presenter.ts` would
make that routed deferral **false on the day it was written**, decided by the person least authorised
to decide it — and would hardcode a Latin-script space-and-period form into a package that must also
render `hi`. ⇒ the view-model's `displayName` gains a **`nameParts`** arm and the presenter passes the
two fields through untouched.

⛔ **(b) join per the committed first-name + last-initial form was rejected.** ⚠ It is the *tempting*
option, because `epics.md:4931` already assumes that form — but exactly **one** committed document
assumes it **for contributors** (`matrix.ts:401-402` is about the **deceased member's** name, ⛔ not a
contributor's), and D7(b) was already rejected on the ground that **BigDev may not have standing**.
⭐ **The join is 11b.2b's**, under the form the Panel rules; until then 11b.2b uses `epics.md:4931`'s
form and records it **built-to, ⛔ not ratified**.

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
  AC6 item **(vii)**, ⛔ not silently accepted.
- **⚠ Type-only → value import cycles** break **consuming** packages at runtime while typecheck, lint
  and local tests stay green ([[project_type_only_import_cycle_trap]]). `@twt/ui` is imported by
  `apps/mobile` — be deliberate. See Trap 3.
- **⭐ CI Actions availability flips both ways without warning — re-verify live**
  ([[project_ci_actions_suspension_local_mirror]]).
- **⚠ The `governance:` commit prefix is a real repo convention (143 commits at `9b05372`) but is
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
| `packages/ui/package.json` | ⚠ **READ-ONLY** | ⛔ `dependencies` stays exactly `@twt/contracts`. ⚠ `@twt/tokens` is a **devDependency** — Task 2 asserts it stays out of `dependencies`. |
| `packages/ui/tests/contribution-list/presenter.test.ts` | **NEW** | Anti-widening (both halves) · three-kind exhaustiveness · anonymized variant · namespace-vs-locale-JSON. |
| `packages/ui/tests/package-boundary.test.ts` | **NEW** | The C-1 property, mechanized. |
| `packages/ui/tests/contribution-list/no-list-iteration.test.ts` · `forbidden-imports.test.ts` · `death-term.test.ts` | **NEW** | AC1's two-half iteration scan; AC5's **two** scans. ⛔ Not one merged file. |
| `packages/contracts/src/contributions/pool-contributor-list.ts` | ⛔ **NOT TOUCHED** | ⭐ **11b.2a owns the widening** (D3-shape(i)(a)). Read it for the confirmed-only invariant; the presenter mirrors the shape **structurally** and takes ⛔ **no build dependency** on it — that is what keeps the two stories parallel. |
| `…/trustee-panel-routing-note-2026-08-29-contributor-name-public-tier.md` | **NEW** | AC7's packet. ⛔ "Routed to the Panel" is not a mechanism; a file is. |
| `packages/domain/src/member/display-name.ts` | ⛔ **DO NOT IMPORT** | Read it for the variant's shape; ⛔ mirror it structurally (Trap 3). |
| `packages/domain/src/kyc/name.ts` · `kyc/public-name.ts` · `notifications/pool-identity.ts` | ⛔ **DO NOT IMPORT** | Name FORM is not the presenter's decision. |
| `apps/**` | ⛔ **NOT TOUCHED** | ⛔ No `@twt/ui` dep on `apps/public`, ⛔ no `.astro`, ⛔ no mobile edit (that is 11b.2b). |
| `packages/contracts/src/public-pages/matrix.ts` · `public-vs-private-matrix.yaml` | ⛔ **NOT TOUCHED** | A third Tier-1 pair is a **RULING**. The gate failing is the gate working. |
| `friction-budget.md` | ⛔ **NOT TOUCHED** | AC-4 is dormant — no member-facing path in this diff. |
| `.decision-log.md` | UPDATE | Task 0. Read the head **live**. |
| `_bmad-output/planning-artifacts/epics.md` · `ux-design-specification.md` | UPDATE `[D6]` | The AI-11a-1(b) block + the column-inventory amendment. ⛔ Annotate, ⛔ never rewrite. |
| `_bmad-output/implementation-artifacts/deferred-work.md` | UPDATE | AC6's four items + item (f) discharged. ⛔ Not item (d). |

### References

- [Source: `epics.md:4930-4932`] — ⭐ the three-clause AC (⚠ `:4923`/`:4929` are the "I want" + "When" framing, ⛔ not AC clauses); `:4931`/`:4932` are the LITERALLY ADJACENT status-pill / confirmed-only contradiction, and `:4931` is the ONE committed document assuming first-name + last-initial for CONTRIBUTORS
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
- [Source: `apps/api/src/modules/member-pool/handlers.ts:312-318`] — the boundary `continue`s on a null ciphertext ⇒ `unknown` is unreachable on that producer (D8(a)'s ground). ⚠ the guard is `:312`, the `continue` `:317`; `:313` is the comment
- [Source: `microcopy.yaml:42,48,317-318,350-352`] — prohibited terms; `contribution` already globbed; ⭐ *"unscanned copy wearing a green check"* (⚠ at `:350-352`, not `:293-295`)
- [Source: `packages/contracts/src/public-pages/matrix.ts:176-198,390-403`] — the biconditional rule; the two-entry allowlist (`:394`, `:403`); the do-not-append warning (`:390-391`). ⚠ `:401-402` keeps 11b.3/11b.6 at first-name + last-initial for the **DECEASED MEMBER's** name — ⛔ NOT a contributor's
- [Source: `public-vs-private-matrix.yaml:60`] — `pii_tier` is *"a FACT about the data"* (the inference AC7 must state)
- [Source: `ux-design-specification.md:1158,1252,1287-1298,1788,1798,2161,2165`] — ⚠ the inventory appears FOUR times, ⛔ not once: `:1158` (layout primitive) · `:1252` (Real Data Test restatement) · ⭐ `:1287-1298` (the section literally titled *"Public Column Inventory — Sahyog List"*, inventory line `:1291`, identifier semantics `:1295-1298`); the anatomies `:1788`/`:1798`; ⭐ `:2165` *"a performance contract, not an implementation specification"*
- [Source: `deferred-work.md:21-179` (⚠ 11b.1's unqualified (a)…(j) — the lettering this story must NOT collide with), `:89` + `:97-100` (⛔ the ALREADY-OPEN inversion, under item (e)), `:104-121` (item (f) and its fired trigger at `:121`)]
- [Source: `11b-1-…md:203`] — ⚠ the scope-limited dep decline that names **11b.2** as the consumer
- [Source: `epic-11a-retro-2026-08-23.md:381`] — AI-11a-1(b)
- [Source: `scripts/friction-budget/lib.ts:453`] — `MEMBER_FACING_PREFIXES` = exactly `['apps/mobile/','apps/public/']`; `isMemberFacingPath` `:458-461` ⇒ a `packages/ui`-only diff matches neither ⇒ why AC-4 is dormant here
- [Source: `_bmad/custom/load-bearing-invariant-checklist.md:72` · `bmad-code-review.toml:9-11`] — family 13; ⚠ `:10` evaluates only families **the diff touches**, so the verdict here is *covered-by-construction*, ⛔ not *skipped*
- [Source: `11b-9-…md:139-140,570,574-576,935,945`] — ⭐ the three-gate posture 11b.1 recorded has MOVED: gate 1 LIFTED, gate 3 de-authorised by 11b.9 itself; and 11b.9's wait is a ruled CHOICE, ⛔ not a block
- [Source: `.decision-log.md:618,676-680` (Decision `2026-08-28-160` cl.3, cl.7)] — all three 11b surfaces cleared on a NEW basis; the per-data-class basis is a preserved BASIS, ⛔ not a gate
- [Source: `scripts/ci-local.sh:41`] — where the compile-time teeth bite

---

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

### Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-08-29 | 0.1 | Story authored at `80e0d12`. Five defective AC clauses found. Seven decisions raised, all unruled. | BigDev + Claude |
| 2026-08-29 | 0.2 | **Validation pass (4 adversarial verifiers at `80e0d12`).** ⭐ **Scope SPLIT three ways** — this file keeps the presenter (the true `[PRIMITIVE]`); the RTBF defect + decrypt bound moved to **11b.2a**; the mobile render layer + a11y moved to **11b.2b**. Findings applied: **(1)** the authoring pass specified a **guaranteed runtime crash** — `member.anonymousMember` is a **`common`** key while `contributor_list.*` is `contribution`, and `t()` throws ⇒ AC2 now requires namespace-tagged refs. **(2)** ⛔ **C-1 was read backwards** — `-154` cl.6 ruled `apps/public` **adds** `@twt/ui` as *"an ORDINARY DEPENDENCY ADDITION"* and `:1734` records *"there was no declination"*; 11b.1's decline was scope-limited and named **11b.2** as the consumer. D1's ground corrected to *"no host exists"*. **(3)** `resolveMemberDisplayName` returns **THREE** kinds, not two. **(4)** The presenter's type is now **written out** (AC3) instead of described in prose. **(5)** Trap 3 added — importing `MemberDisplayName` from `@twt/domain` violates AC1 and trips the bundle-boundary trap; 9.12's local-structural-mirror is the solution. **(6)** Trap 4 added — 9.12's review found a throwing presenter on a fail-soft path; the blast radius here is a `renderItem` hot path. **(7)** AC4 now names **both halves** of the 9.12 anti-widening precedent; AC5's scans given three anti-vacuity properties. **(8)** Deferral **(d) DELETED** — already open at `deferred-work.md:97-100`; **(b)** re-framed as 8.3 D11's re-trigger having fired at 11a.1. **(9)** D7 packet must record that the 11b.9 precedent is **inert** and that `-162` cl.2 retired two adjacent consent types. **(10)** Task 0 rewritten from *"mint BigDev's rulings"* to **TRANSCRIBE-or-STOP**. **(11)** Status → `blocked-awaiting-decisions` + Preflight (⚠ superseded by 0.3 — the Status now reads `ready-for-dev`). **(12)** friction-budget AC-4 confirmed **dormant** here. Line-range corrections: `catalog.ts` imports `:29-56`; `microcopy.yaml` `:350-352`; ux-spec inventory `:1158` only. | BigDev + Claude |
| 2026-08-29 | 0.3 | **Ruling pass (BigDev).** D2(a) · D6(a) · D7(a) ruled with grounds and rejection reasons; every `[GATED ON Dn]` marker cleared; Status → `ready-for-dev`; Preflight added on TRANSCRIBE-or-STOP terms. ⛔ No AC re-scoped. | BigDev |
| 2026-08-29 | 0.4 | **Second validation pass (4 adversarial verifiers at `9b05372`).** Baseline **re-pinned `80e0d12` → `9b05372`** — ⛔ no verified claim moved (the commit is governance-only; ⛔ no cited path is in its diff), the `fe8a6f9` precedent. ⭐ **Two NEW decisions ruled by BigDev, both raised by this pass: D8(a)** — an `unknown`-name row **THROWS** and mints nothing (the three rejected options included reusing `member.anonymousMember`, which would have asserted an **RTBF erasure that never happened**); **D9(a)** — the presenter emits name **PARTS** and ⛔ never joins them, because a join would have **ruled the contributor name FORM** inside `presenter.ts` — the exact question D7(a) ruled must not be ruled and AC6 routes to the Panel. **Defects fixed: (1)** `rowKey` was mandated in prose, absent from the "verbatim" types, and would have been **locked in as a passing gate** by AC4's `Record<keyof …>` — found independently by three verifiers. **(2)** The Launch-posture block restated a **three-gate posture Story 11b.9 falsified on two legs one commit earlier**, and misnamed the third (a preserved *basis* substituted for the gate that fell) — contradicting this file's own AC7. **(3)** AC5's death-term scan was **vacuous by construction** (asserted on parsed import specifiers; a death term is never one) — now two tests, two mechanisms, plus a comments-inclusive half. **(4)** The Preflight sent the dev agent to branch off `main`, where this file still reads `blocked-awaiting-decisions`. **(5)** AC8 was scoped to `:1158` "only", leaving the section titled *"Public Column Inventory — Sahyog List"* (`:1287-1298`) un-annotated. **(6)** The decision-log transcription discharged **no AC** — now **AC0**. **(7)** "Passes the `i18nKey` through" vs "mints it" — the file said both; the presenter mints, and the un-linked duplicate is routed. **(8)** AC4 was defeatable by one nested or renamed field; AC1's iteration scan had no Task; AC7's packet had no destination file. **(9)** Deferral lettering collided with 11b.1's existing (a)–(j) ⇒ roman numerals, seven items, incl. the commitlint item the ledger and 11b.2a both expect here. **(10)** No decision-number collision rule for two parallel Task 0s. Citation corrections: `handlers.ts:312-318` · `status-pill-render.test.ts:31-32` · `presenter.test.ts:151-192` · `view-model.ts:17-29` · `pool-contributor-list.ts:39-40` · `epics.md:4930-4932` · `.decision-log.md:1068-1069` · `matrix.ts:401-402` (deceased, ⛔ not contributor) · pagination literals are re-exports · 142→143 `governance:` commits · D9(a) does ⛔ not say "reorder" · §4.4 SPEAKS to but ⛔ governs nothing. | BigDev + Claude |
