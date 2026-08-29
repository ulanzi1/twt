---
baseline_commit: 80e0d12f4cd0fb071d1faedfd7bb151ddd3635d6
---

# Story 11b.2: ContributionList Presenter — the sixth `@twt/ui` module `[PRIMITIVE]`

Status: ready-for-dev

> ✅ **AND IT IS NOW TRUE IN BOTH SENSES.** ⭐ **ALL THREE DECISIONS ARE RULED (BigDev, 2026-08-29):
> D2(a) · D6(a) · D7(a).** ⛔ Nothing in this story is gated any longer. Start at Task 0.

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

⭐ **All three decisions are RULED (BigDev, 2026-08-29): D2(a) — ⛔ no status on the row · D6(a) — YES,
write the UX-spec amendment · D7(a) — record the question, ⛔ rule nothing.** They are written in the
Decisions section below with their grounds.

⛔ **Task 0 TRANSCRIBES those rulings into `.decision-log.md`. It does ⛔ NOT author them, ⛔ not
paraphrase them, and ⛔ not supply a ground.** ⚠ If any decision below has been edited back to UNRULED,
**STOP and report blocked** ([[feedback_supersede_never_reinterpret]]).

> ✅ **BASELINE VERIFIED LIVE.** `git fetch origin` at authoring **and** at validation:
> `HEAD == origin/main == 80e0d12`, zero ahead / zero behind, tree clean, branch `main`. Every claim
> was checked by reading the named file at that tree. Branch off `main`; re-`fetch` before you branch.

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

**Outcome 2 — death changes nothing, and that is the whole point.** ⛔ No death-derived term may
filter, mask, anonymize or reorder a contributor row, at any tier, on any surface (`2026-08-24-159`
D9(a)). **In the member's terms:** *"a contribution you made while you were alive stays in the record
with your name on it. Dying does not un-give it."*

**Checked against the Niyamavali — the two return DIFFERENT results; ⛔ do not collapse them:**
· **Outcome 1 — §4.4 governs it** (*"public rendering of any personal information is consent-gated
  and never default opt-in"*) and the build complies in the strictest direction. ⚠ The **positive**
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
surface. The three gates 11b.1 recorded (counsel's DPDPA posture, Row 17's ≥2-trustee publication
ratification, the per-data-class publication basis) are ⛔ **untouched** — they bind the **surfaces**
(11b.1 · 11b.3 · 11b.6), ⛔ not the primitive they consume.

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
| Did 11b.1 "explicitly decline" the dep? | ⚠ **NO — it declined FOR ITSELF and named THIS STORY as the consumer.** `11b-1-…md:203` in full: *"⛔ NO — and **this story** does ⛔ NOT add it. C-1 ruled the addition is 'an ordinary dependency addition, ⛔ NOT a governance reversal', but **its consumers are 11b.2 / 11b.5 / 11b.7**. ⛔ Do not add the dep here for a surface that needs no presenter."* ⛔ It is a scope-limited decline, ⛔ not a standing prohibition. |
| A **host route** for a contributor table | ⛔ **NO.** `apps/public/src/pages/` holds `404 · 500 · blog · blog/[postId] · index · members · niyamavali · sahyog · terms`. `/sahyog` (11b.1) renders ⛔ no contributor rows at any grain. 11b.3's `/sahyog-vivran/{id}` is `backlog`. ⇒ **the ground for deferring the Astro layer.** |
| The **confirmed-only wire contract** | ✅ `packages/contracts/src/contributions/pool-contributor-list.ts:42-51` — `ConfirmedContributorRow = { firstName: min(1), lastInitial: max(16) }`, `.strict()`. `:16-22` states the invariant as a SHAPE: no `status`/`yellow`/`attested`/`utr`/`pending`**-member-identity** field, *"the one change this contract exists to forbid"*. ⚠ Note the elision the first pass made: a `pending` **aggregate** DOES exist (`PendingContributorsAggregate`, `:59-65`) — the ban is on a per-row identity field. |
| The **RTBF display seam** | ✅ `packages/domain/src/member/display-name.ts:47-58` — `resolveMemberDisplayName({state,name})`. ⛔⛔ **IT RETURNS THREE KINDS, ⛔ NOT TWO:** `{kind:'name',value}` · `{kind:'unknown'}` · `{kind:'anonymized',i18nKey}` (`:36-39`). `unknown` fires when `name === null`. ⭐ The `anonymized` variant **already carries its own `i18nKey`** — the presenter passes it through, ⛔ it does not mint one. |
| ⭐⛔ The **i18n namespace of that key** | ⛔⛔ **`common`, ⛔ NOT `contribution` — AND THIS IS A CRASH, NOT A TIDINESS POINT.** `ANONYMOUS_MEMBER_I18N_KEY = 'member.anonymousMember'` resolves in `packages/i18n/locales/{en,hi}/common.json:215`. The `contributor_list.*` keys live in `contribution.json:30-39`. ⚠ `t()` **THROWS** on a miss. ⇒ **a view-model that emits bare string keys guarantees a runtime throw on the anonymized row** — the exact row this story exists to render correctly. → **AC2**. |
| The **existing `contributor_list.*` keys** | ✅ `contribution.json:30-39` — `confirmed_header · empty · no_pool · pending_strip · pending_strip_a11y · row_a11y · title · view_cta · view_cta_a11y · view_cta_hint`. ⭐ **Reuse them; ⛔ mint nothing.** ⚠ `row_a11y = "{name}, confirmed contributor"` takes a **`{name}` param** — see AC3. |
| The `@twt/tokens` roles | ✅ `packages/tokens/src/tokens.ts:42 'status-confirmed'` · `:45 'status-held'`. ⛔ The presenter emits the role **NAME**, ⛔ never a hex. |
| The **status-pill presenter** is reusable as-is | ✅ `packages/ui/src/status-pill/` — `deriveStatusPillViewModel(status)`, 5 states, `satisfies Record<ContributionStatus,…>`. ⚠ Reusable ⛔ only if a row HAS a status — and the 8.3 contract deliberately gives it none. → **D2**. |
| The **matrix Tier-1 allowlist** | ⛔ **TWO ENTRIES, NEITHER A CONTRIBUTOR.** `matrix.ts:392-403`: `member-directory.member_name` (`:394`) · `sahyog-drive.deceased_member_name` (`:403`). The third widening (`2026-08-28-165` cl.1) is **four nominee-bank fields** on `sahyog-vivran` (`account_holder_name · account_number · ifsc · vpa`), added by **11b.3** at surface declaration — ⛔ not yet in the file. `:390-391`: *"do NOT 'fix' a failing third entry by appending it here — that inverts the control. The gate failing is the gate working."* |
| The **contributor NAME FORM** is ruled | ⛔ **NO — unruled since 2026-08-19, re-affirmed undisturbed by D10 and at `.decision-log.md:1061`.** ⚠ Two counterweights the first pass did not surface: the epic AC for this story itself specifies *"first-name + last-initial"*, and `matrix.ts:400-402` states *"those keep first-name + last-initial"*. Neither is a Panel ruling on **contributor** names, so "unruled" survives — but D7(b) argues for something two committed documents already assume. → **D7**. |
| The **UX-spec column inventory** is buildable | ⛔ **NO — 3 of 10 have no substrate, 2 labels are microcopy-PROHIBITED.** Inventory at `ux-design-specification.md:1158` **only**: `Donation ID · Member ID · HRMS · Donor Name · School · District · Block · Pool · Late Teacher · Date`. No `donation_id` in `packages/`; no HRMS field; `Member ID` on a public wire is what 11a.3's handler refuses in terms. `microcopy.yaml:42` bars *"donor"*, `:48` bars *"Late Teacher"* (both `member_only: true`). ⭐ `deferred-work.md:121` names THIS STORY as the trigger, and it has FIRED. → **D6**. |
| The `<ContributionListTable>` **stat-cards strip** | ⛔ **NO PRODUCER, NO OWNER** — `ux:1788` names it; C-3 (`epics.md:4799`) records *"NO PRODUCER \| No owner"* and `-154` declined to settle it (*"a settled **shape** is ⛔ not a settled **source**"*). ⛔ Out of scope; ⛔ do not stub it. |
| A public surface can reach 50,000 rows | ⛔ **NO — 10,000, BY CONSTRUCTION.** `apps/public/src/lib/pagination.ts:39` (=50) × `:65` (=200). ⭐ **AND THE UX SPEC RESOLVES THIS AT `:2165`**: *"This is a **performance contract**, not an implementation specification. The implementation may use windowing …, **pagination**, infinite scroll, or any combination."* ⇒ 50k/10k bind the component's **behaviour under load**, ⛔ not a page's row budget. |
| The **a11y gate** | ⛔ **NO CI GATE EXISTS** — 19 gate directories in `scripts/`, none a11y. Family 13 of `_bmad/custom/load-bearing-invariant-checklist.md` is live on merge via `bmad-code-review.toml:9`. ⚠ **It applies to a component/surface story — this one has no component.** ⇒ family 13 lands in **11b.2b**, ⛔ not here. |
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

`pool-contributor-list.ts:39`: *"No status field: **a row's mere presence means confirmed**."* Adding
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
`pool-progress/view-model.ts:17-21` declares a **local structural type** mirroring the contracts DTO
and says so in the doc-block. Do the same for the display-name variant.

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

### AC1 — The presenter is the SIXTH `@twt/ui` module, headless, and per-row

`packages/ui/src/contribution-list/` ships on the `pool-progress` shape (`index.ts` · `view-model.ts`
· `presenter.ts` · `i18n-keys.ts`), barrelled from `packages/ui/src/index.ts` with a per-story
annotation matching the file's existing style.

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
out. **Mechanically asserted, ⛔ not asserted as a wish:** a comment-stripped source scan of
`presenter.ts` finds no `.map(` / `.forEach(` / `.filter(` / `.reduce(` / `for (`, and the function's
parameter is a single object, ⛔ never an array. ⛔ There is **no** function in this module that maps
or iterates a full row set.

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

**And** a unit test asserts every key the module can emit is declared with the namespace it actually
resolves in, by reading the locale JSON — ⛔ not by restating the pairing in the test.

### AC3 — The shape, written out ✅ `[D2(a) RULED]`

`view-model.ts` declares these types. ⭐ **The invariant is the SHAPE; the doc-block carries it, the
way `pool-progress/view-model.ts:9-15` does.**

```ts
/** Confirmed-only, by SHAPE (Stories 8.3 + 9.5). The INPUT carries NO way to express
 *  yellow/pending/attested/projected/utr/status — a row's mere presence means confirmed
 *  (pool-contributor-list.ts:39). Adding such a field is the one change this module exists to forbid.
 *  ⛔ Local structural mirror of @twt/domain's MemberDisplayName — NOT imported (Trap 3). */
export type ContributionRowDisplayName =
  | { readonly kind: 'name'; readonly firstName: string; readonly lastInitial: string }
  | { readonly kind: 'unknown' }
  | { readonly kind: 'anonymized' };

export interface ContributionRowInput {
  readonly displayName: ContributionRowDisplayName;
  readonly poolLetterCode: string;
}

export interface ContributionRowViewModel {
  /** Either a literal string to print, or an i18n ref to resolve — never both, never a bare key. */
  readonly displayName:
    | { readonly kind: 'literal'; readonly value: string }
    | { readonly kind: 'i18n'; readonly ref: ContributionListI18nRef };
  readonly poolLetterCode: string;
  /** `contributor_list.row_a11y` — takes a `{name}` PARAM; see the nesting rule below. */
  readonly rowA11y: { readonly ref: ContributionListI18nRef; readonly nameParamFrom: 'displayName' };
}
```

**And ⛔ THREE kinds, not two.** `resolveMemberDisplayName` returns `name | unknown | anonymized`
(`display-name.ts:36-39`); `unknown` fires on a null name. The presenter handles all three with an
**exhaustive `never` check that throws**, ⛔ never a silent fall-through to a blank name.

⚠ ⭐ **AND THE WIRE CARRIES ONLY TWO — THAT ASYMMETRY IS DELIBERATE, ⛔ NOT DRIFT.** Story 11b.2a's
D3-shape(i) was **RULED (BigDev, 2026-08-29)** as a two-variant discriminated union
(`kind: 'name' | 'anonymized'`, both `.strict()`, both carrying `rowKey`), because the API boundary's
`:313` guard already `continue`s on a null ciphertext ⇒ **`unknown` is unreachable on that producer**.
⛔ Do **not** delete the presenter's `unknown` branch to "match the wire": the presenter is the shared
layer and a **second** producer (11b.3's Astro path) may legitimately hand it an `unknown`. ⇒ keep all
three, and record the `unknown` branch as **un-attested / unexercised by the mobile producer**
([[feedback_record_unattested_no_backfill]]), ⛔ never as tested.
**And** the input carries the ruled **`rowKey`** through to the view-model unchanged — the presenter
⛔ neither derives nor interprets it (it is a virtualization identity, ⛔ not content).
**And** the anonymized case is a **first-class variant** — ⛔ never an empty string, ⛔ never a
caller-supplied literal — emitting `{key:'member.anonymousMember', namespace:'common'}`. ⚠ The
presenter ⛔ **does not decide** that a member is anonymized; it renders the decision it is handed.
**And** ⭐ **`contributor_list.row_a11y` = `"{name}, confirmed contributor"` takes a `{name}` param.**
For the anonymized row the render layer must resolve `member.anonymousMember` FIRST and pass the
result as `{name}` — a **nested** resolution. The presenter emits the ref and names the param source;
⛔ it never composes the string itself.
**And** the presenter's doc-block states **in terms** that it throws on a corrupt operand and that
**every consumer owes a try/catch** (Trap 4).

### AC4 — Confirmed-only is preserved as a SHAPE ✅ `[D2(a) RULED]`

The INPUT type carries ⛔ no `status` / `yellow` / `attested` / `utr` / `pending` / `projected` field.

**And** the anti-widening test copies **both halves** of the 9.12 precedent
(`packages/ui/tests/pool-progress/presenter.test.ts:151-190`), ⛔ not one:
 **(a) the compile half** — `const INPUT_KEYS: Record<keyof ContributionRowInput, true> = {...}`.
     Adding a key breaks the literal as *missing*; removing one breaks it as *excess*. ⭐ A unit test
     cannot assert this at runtime — it asserts it **by being a file that fails
     `pnpm turbo run typecheck`** (the teeth are real: `scripts/ci-local.sh:41`).
 **(b) the runtime half** — `for (const banned of ['status','yellow','attested','utr','pending','projected']) expect(INPUT_KEYS).not.toHaveProperty(banned)`.
**And** ⛔ `deriveStatusPillViewModel` is **not** called from this module, and no `'green'` literal is
emitted (Trap 2).

### AC5 — The forbidden-import and death-term scans have teeth ✅ `[D2(a) RULED]`

A test asserts the module imports ⛔ **none** of `splitFirstNameLastInitial` /
`resolvePublicMemberName` / `resolvePoolIdentity` / `deriveStatusPillViewModel` / `@twt/domain`, and
that ⛔ no death-derived term (`account-frozen`, `deceased`, `members.state`) appears.

⚠ ⛔ **Scoped so it cannot be vacuous** ([[feedback_gate_scope_semantic_coverage]]; cf. commit
`38a2d8b` *"close five vacuous/gameable review-fence assertions"*):
 · it enumerates **all four files** in the directory, and **a new file added there and not covered
   fails the test** — ⛔ a scan of `presenter.ts` alone is not sufficient;
 · it **strips comments first** (the `status-pill-render.test.ts:16` precedent) — ⚠ otherwise the
   doc-block required by Trap 3 and AC3, which must *name* the forbidden symbols to forbid them,
   false-positives the scan and the next dev weakens it;
 · it asserts on **parsed import specifiers**, ⛔ not raw text.

### AC6 — The deferrals are routed, each with a written trigger, ⛔ none marked closed ✅ `[D7(a) RULED]`

⛔ `@twt/ui` is **not** added to `apps/public/package.json`; ⛔ no `.astro` component is authored; ⛔
no matrix surface or field is declared. ⭐ **The ground is that no host exists** (11b.3 is `backlog`)
— ⛔ **not** that C-1 forbids the dep. C-1 **pre-authorised** it as *"an ordinary dependency
addition"* (`.decision-log.md:1741`), so the routing note must say **deferred**, ⛔ never **blocked**.

Route into `deferred-work.md` in the precise closure language ([[feedback_closure_language_precision]]):
 (a) **the Astro contributor render layer** — trigger: **Story 11b.3 authoring** (it owns the host);
 (b) **a contributor name at `public` tier** — trigger: **a Panel ruling adding a `(surface, field)`
     pair to `matrix.ts:392`**, ⛔ never a code edit;
 (c) **the contributor NAME FORM** — trigger: **its own Panel ruling**;
 (e) **`<StatCardStrip>`** — trigger: **C-3's producer**, ⛔ unowned.

⛔⛔ **(d) IS DELETED — IT IS ALREADY RECORDED.** The public/member inversion is open at
`deferred-work.md:97-100` under 11b.1 item (e), with the same *"binds 11b.2 and 11b.3"* language.
⛔ Do not write a second record of one obligation.
**And** ⭐ **(b) is a RE-TRIGGER, ⛔ not a new item.** Story 8.3's D11 deferred exactly this matrix
entry — prescribing `live-contributor-list` (`first_name` + `last_initial`) — with a re-trigger
naming **Story 11a.1**. 11a.1 is `done` and the matrix still has two pairs. ⇒ the routing note must
record *"8.3 D11's re-trigger fired at 11a.1 and was not acted on"* — ⛔ filing it as fresh is the
exact failure D6(b) names, applied to this story.

### AC7 — The Panel packet for D7 is assembled, and it records what is NOT settled ✅ `[D7(a) RULED]`

The packet records: the allowlist has **two** entries; the third widening is **four nominee-bank**
fields on a different surface; and `-165` cl.2 (*"the underlying **account** fields remain Tier-1 …
treat masking as a presentation/projection policy"*) ⚠ **is scoped to account fields** — extending it
to *"a shielded contributor name is still Tier-1"* is a **sound inference via `pii_tier` being a fact
about the data** (`public-vs-private-matrix.yaml:60`), ⛔ **not** something the ruling decided. Say so.

**And** it records the **asymmetry**: the **basis** is settled (11b.3's AC rests contributor names on
*"those members' own T&C"*) while the **matrix declaration** and the **mechanism** are not.
**And** ⛔ it records that **the 11b.9 precedent is INERT today** — no `clause_versions` row is
minted, the predicate is false for every member, and Task 1 there waits on counsel's T&C return
(**2026-09-07**) **and** a second real person holding `niyamavali.review`. ⛔ Do not present it to the
Panel as a working mechanism.
**And** it records that **`2026-08-28-162` cl.2 retired `sahyog_vivran_publication` and
`in_memoriam_listing`** alongside `sahyog_drive_publication` — the consent type most adjacent to a
contributor list on `/sahyog-vivran` no longer exists as a family-facing control.

### AC8 — The UX-spec column-inventory amendment is written ✅ `[D6(a) RULED]`

`deferred-work.md:121` names *"Story 11b.2 or 11b.3 authoring, whichever comes first"*; **it has
fired**. The amendment records, against `ux-design-specification.md:1158` (the inventory) / `:1788`
(the desktop anatomy) / `:1798` (the mobile row anatomy) / `:2161` + `:2165` (the performance
contract), that of the ten columns: **three have no substrate** (`Donation ID`, `HRMS`, `Member ID` —
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

- [ ] **Task 0 — Governance first (AC8)** ✅ `[D2 + D6 + D7 RULED — startable]`
  - [ ] Read the `.decision-log.md` head **live** (`2026-08-28-167` at authoring; ⛔ do not hardcode
        the next number) and **TRANSCRIBE** into it the rulings **already recorded in the Decisions
        section of this file** — **D2(a)** (⛔ no status on the row) · **D6(a)** (write the amendment)
        · **D7(a)** (record the question, ⛔ rule nothing) — one clause each, quoting the ground
        verbatim. ⛔⛔ **The dev agent does not decide, does not paraphrase, and does not supply a
        ground.** ⛔ `governance:` prefix, own commit, before any code.
  - [ ] Append the `⛔ RECONCILED 2026-08-29` block to `epics.md`'s Story 11b.2 section — the
        defective-AC findings **and** the 11b.2 / 11b.2a / 11b.2b split, with the new sprint-status
        keys named so a future `sprint-planning` run does not regenerate a ghost. ⛔ Annotate only.
  - [ ] Write the UX-spec amendment (AC8); mark `deferred-work.md` item (f) **discharged by this
        story**, ⛔ not "closed".
- [ ] **Task 1 — The presenter (AC1, AC2, AC3, AC4)** ✅ `[D2(a) RULED — startable]`
  - [ ] ⛔ **Read `packages/ui/src/pool-progress/*` end to end first** — four files, ~250 lines. It
        answers nearly every "how should this be shaped?" question here. ⛔ Do not invent a shape.
  - [ ] Create `packages/ui/src/contribution-list/{index,view-model,presenter,i18n-keys}.ts`.
  - [ ] `view-model.ts` — the AC3 types verbatim, with the confirmed-only doc-block (AC4) and the
        local-structural-mirror note (Trap 3).
  - [ ] `presenter.ts` — `deriveContributionRowViewModel(row)`; exhaustive `never` check over the
        three kinds; doc-block stating it throws and that consumers owe a try/catch (Trap 4).
  - [ ] `i18n-keys.ts` — `{key, namespace}` refs over the **existing** `contributor_list.*` keys
        (`contribution`) plus `member.anonymousMember` (`common`). ⭐ **Reuse; ⛔ mint nothing, and
        ⛔ do not create a namespace** — a namespace not in `copy_globs` is unscanned copy wearing a
        green check (`microcopy.yaml:350-352`).
  - [ ] Barrel from `packages/ui/src/index.ts` with the per-story annotation comment.
- [ ] **Task 2 — The teeth (AC1, AC2, AC4, AC5)**
  - [ ] `packages/ui/tests/contribution-list/presenter.test.ts` — the two-half anti-widening test
        (AC4), the three-kind exhaustiveness test, the anonymized-variant test, and the
        namespace-vs-locale-JSON test (AC2).
  - [ ] The forbidden-import + death-term scan with AC5's three anti-vacuity properties.
  - [ ] `packages/ui/tests/package-boundary.test.ts` — `dependencies` is exactly `@twt/contracts`
        **and** `@twt/tokens` is absent from `dependencies` (AC1).
- [ ] **Task 3 — Route the deferrals (AC6, AC7)** ✅ `[D7(a) RULED — startable]`
  - [ ] Four items — (a), (b), (c), (e) — each with a named re-trigger, ⛔ none marked closed.
        ⛔ **(d) is deleted; it is already open at `deferred-work.md:97-100`.**
  - [ ] (b) is written as **8.3 D11's re-trigger having fired at 11a.1**, ⛔ not as a fresh item.
  - [ ] Assemble the D7 Panel packet (AC7), including the 11b.9-is-inert and `-162` cl.2 facts.
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
        **already** an 11b.2 entry (`2026-08-29b`, the authoring pass) — use `2026-08-29c` or later
        and ⛔ do not overwrite it.

---

## ⚖️ Decisions — ✅ **ALL THREE RULED (BigDev, 2026-08-29).** ⛔ Do not re-litigate.

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

**Ground:** confirmed-only stays a **shape**. `pool-contributor-list.ts:39` — *"a row's mere presence
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

## Dev Notes

**The one-line summary:** it is **`<PoolProgressCard>` again, one row down** — same package, same
module shape, same confirmed-only-by-shape discipline, same mobile-consumer-later posture. ⭐ Almost
every hard decision has already been made, in files you can read.

- **⭐ The two most valuable properties of the existing presenters are both NEGATIVE:** they emit
  token **role names** (never colours) and i18n **keys** (never copy). ⛔ Breaking either makes the
  presenter unusable on one of its two stacks, and the break will not show up until the second
  consumer lands.
- **⚠ `t()` defaults to `common` and THROWS.** That is why AC2 exists. Assert copy **through** `t()`,
  ⛔ not around it — that is exactly how the 11a.2 `{{max}}` vs `{max}` defect reached production
  green (`resolver.ts:33`'s `TOKEN` regex is single-brace; the test fed a hand-built fixture and
  bypassed `t()` entirely).
- **⚠ Type-only → value import cycles** break **consuming** packages at runtime while typecheck, lint
  and local tests stay green ([[project_type_only_import_cycle_trap]]). `@twt/ui` is imported by
  `apps/mobile` — be deliberate. See Trap 3.
- **⭐ CI Actions availability flips both ways without warning — re-verify live**
  ([[project_ci_actions_suspension_local_mirror]]).
- **⚠ The `governance:` commit prefix is a real repo convention (142 commits) but is formally invalid
  under the checked-in `commitlint.config.js`** (`type-enum` is left at conventional's default, which
  excludes it). It survives only because commitlint is wired to nothing — no `commit-msg` hook, not
  in `ci-local.sh`, not in CI. **Use the prefix** (convention wins), and route the divergence as a
  one-line `deferred-work.md` note under Task 3.

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
| `packages/domain/src/member/display-name.ts` | ⛔ **DO NOT IMPORT** | Read it for the variant's shape; ⛔ mirror it structurally (Trap 3). |
| `packages/domain/src/kyc/name.ts` · `kyc/public-name.ts` · `notifications/pool-identity.ts` | ⛔ **DO NOT IMPORT** | Name FORM is not the presenter's decision. |
| `apps/**` | ⛔ **NOT TOUCHED** | ⛔ No `@twt/ui` dep on `apps/public`, ⛔ no `.astro`, ⛔ no mobile edit (that is 11b.2b). |
| `packages/contracts/src/public-pages/matrix.ts` · `public-vs-private-matrix.yaml` | ⛔ **NOT TOUCHED** | A third Tier-1 pair is a **RULING**. The gate failing is the gate working. |
| `friction-budget.md` | ⛔ **NOT TOUCHED** | AC-4 is dormant — no member-facing path in this diff. |
| `.decision-log.md` | UPDATE | Task 0. Read the head **live**. |
| `_bmad-output/planning-artifacts/epics.md` · `ux-design-specification.md` | UPDATE `[D6]` | The AI-11a-1(b) block + the column-inventory amendment. ⛔ Annotate, ⛔ never rewrite. |
| `_bmad-output/implementation-artifacts/deferred-work.md` | UPDATE | AC6's four items + item (f) discharged. ⛔ Not item (d). |

### References

- [Source: `epics.md:4923,4929,4931-4932`] — the three-clause AC; the adjacent status-pill / confirmed-only contradiction
- [Source: `epics.md:4793-4835`] — C-1…C-5; ⭐ `:4815` = C-1's *"`apps/public` adds `@twt/ui`"* and *"presenters + Astro render layers, ⛔ not as components"* (⚠ this string is in `epics.md`, ⛔ **not** in `.decision-log.md`); `:4799` = C-3
- [Source: `epics.md:403,404,504`] — UX-DR13 (50k) · UX-DR14 (10k) · UX-DR80 (⭐ *"Native: FlatList tuning. Web: TanStack Virtual / react-virtuoso / react-window"* — direct support for Trap 1's split)
- [Source: `.decision-log.md:1729,1734,1741`] — ⭐ C-1 as an **ordinary dependency addition**; *"there was no declination"*
- [Source: `.decision-log.md#decision-2026-08-24-159` cl.11] — D9(a); *"the right conjunct in the wrong read"*; `:1061` = the name form stays UNRULED
- [Source: `.decision-log.md#decision-2026-08-28-165` cl.1-2] — four **nominee-bank** fields; masking ⛔ does not lower the tier (⚠ scoped to **account** fields)
- [Source: `.decision-log.md#decision-2026-08-28-162` cl.2] — `sahyog_vivran_publication` + `in_memoriam_listing` retired
- [Source: `packages/ui/src/index.ts:3,8,14,21,35` · `src/pool-progress/*` (⭐ `view-model.ts:9-15`, `:17-21`) · `src/status-pill/*`] — the module template
- [Source: `packages/ui/tests/pool-progress/presenter.test.ts:151-190`] — ⭐ the two-half anti-widening precedent
- [Source: `apps/mobile/tests/unit/status-pill-render.test.ts:7-12,16`] — exhaustiveness + the comment-stripping precedent
- [Source: `packages/contracts/src/contributions/pool-contributor-list.ts:16-22,39,42-51,59-65`] — confirmed-only as a SHAPE; ⚠ the `pending` **aggregate** that does exist
- [Source: `packages/domain/src/member/display-name.ts:26,36-39,47-58`] — ⭐ the THREE-kind union and `ANONYMOUS_MEMBER_I18N_KEY`
- [Source: `packages/i18n/locales/{en,hi}/common.json:215`] — ⭐ `member.anonymousMember` is a **`common`** key
- [Source: `packages/i18n/locales/en/contribution.json:30-39`] — the `contributor_list.*` keys; `row_a11y` takes `{name}`
- [Source: `packages/i18n/src/catalog.ts:29-56,63-66,69`] — the three registration sites (⚠ imports run to `:56`)
- [Source: `microcopy.yaml:42,48,317-318,350-352`] — prohibited terms; `contribution` already globbed; ⭐ *"unscanned copy wearing a green check"* (⚠ at `:350-352`, not `:293-295`)
- [Source: `packages/contracts/src/public-pages/matrix.ts:176-197,390-403`] — the biconditional rule; the two-entry allowlist; the do-not-append warning
- [Source: `public-vs-private-matrix.yaml:60`] — `pii_tier` is *"a FACT about the data"* (the inference AC7 must state)
- [Source: `ux-design-specification.md:1158,1788,1798,2161,2165`] — the inventory; the anatomies; ⭐ *"a performance contract, not an implementation specification"*
- [Source: `deferred-work.md:97-100,121`] — ⛔ the ALREADY-OPEN inversion item; item (f) and its fired trigger
- [Source: `11b-1-…md:203`] — ⚠ the scope-limited dep decline that names **11b.2** as the consumer
- [Source: `epic-11a-retro-2026-08-23.md:381`] — AI-11a-1(b)
- [Source: `scripts/friction-budget/lib.ts:453`] — `MEMBER_FACING_PREFIXES`; why AC-4 is dormant here
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
| 2026-08-29 | 0.2 | **Validation pass (4 adversarial verifiers at `80e0d12`).** ⭐ **Scope SPLIT three ways** — this file keeps the presenter (the true `[PRIMITIVE]`); the RTBF defect + decrypt bound moved to **11b.2a**; the mobile render layer + a11y moved to **11b.2b**. Findings applied: **(1)** the authoring pass specified a **guaranteed runtime crash** — `member.anonymousMember` is a **`common`** key while `contributor_list.*` is `contribution`, and `t()` throws ⇒ AC2 now requires namespace-tagged refs. **(2)** ⛔ **C-1 was read backwards** — `-154` cl.6 ruled `apps/public` **adds** `@twt/ui` as *"an ORDINARY DEPENDENCY ADDITION"* and `:1734` records *"there was no declination"*; 11b.1's decline was scope-limited and named **11b.2** as the consumer. D1's ground corrected to *"no host exists"*. **(3)** `resolveMemberDisplayName` returns **THREE** kinds, not two. **(4)** The presenter's type is now **written out** (AC3) instead of described in prose. **(5)** Trap 3 added — importing `MemberDisplayName` from `@twt/domain` violates AC1 and trips the bundle-boundary trap; 9.12's local-structural-mirror is the solution. **(6)** Trap 4 added — 9.12's review found a throwing presenter on a fail-soft path; the blast radius here is a `renderItem` hot path. **(7)** AC4 now names **both halves** of the 9.12 anti-widening precedent; AC5's scans given three anti-vacuity properties. **(8)** Deferral **(d) DELETED** — already open at `deferred-work.md:97-100`; **(b)** re-framed as 8.3 D11's re-trigger having fired at 11a.1. **(9)** D7 packet must record that the 11b.9 precedent is **inert** and that `-162` cl.2 retired two adjacent consent types. **(10)** Task 0 rewritten from *"mint BigDev's rulings"* to **TRANSCRIBE-or-STOP**. **(11)** Status → `blocked-awaiting-decisions` + Preflight. **(12)** friction-budget AC-4 confirmed **dormant** here. Line-range corrections: `catalog.ts` imports `:29-56`; `microcopy.yaml` `:350-352`; ux-spec inventory `:1158` only. | BigDev + Claude |
