---
baseline_commit: 6547ead2
---

<!--
⭐ BASELINE — `fix(11b.3b): review passes 4-6 — outage classification, the mononym leak, the gate, tests`.
⭐ RE-PINNED 2026-09-18 (v0.4, second validate). `7d12a4ce` (v0.3) predates ALL of `11b-3b`, which has
since shipped and gone `done`: 38 files under packages/apps/scripts moved. Every code claim below was
RE-DERIVED at `6547ead2`. ⚠ That half is perishable. It expires the next time a sibling ships, so re-diff
`packages apps scripts` before starting.
⚠ v0.3 was committed ONLY on the unmerged local branch `governance/11b-20-validate`, so `main` carried
v0.2 until v0.4 cherry-picked it forward.
⚠ KEY `11b-18` IS SKIPPED for the reason recorded in `11b-19`. It is absent from `development_status`.
-->

# Story 11b.20: The Ratified Message Block on the PUBLIC Sahyog Vivran Page `[SURFACE]`

Status: ready-for-dev

## ⭐ GLYPH REGISTER — read this before any clause below

⭐ = an action to take · ⚠ = a hazard · **⛔ marks a negation and must be followed by an explicit
negator** (`not` / `no` / `never` / `nothing` / `neither`, or a prohibition verb). A ⛔ placed before a
positive clause is an **inversion**, not emphasis. Doubling (`⭐⭐`, `⛔⛔`) adds volume only.

## ✅ PREFLIGHT — **STARTABLE.** Every blocker is discharged.

⭐ **Authority:** `#decision-2026-09-11-214` **Consequence 3** commissions this story.

| Was blocked on | For | Status (re-verified 2026-09-19 at `6547ead2`) |
|---|---|---|
| ~~`11b-19`~~ | the ratified copy, in `sahyog-shared` | ✅ `done`. All eight `message_block.*` keys ship in both locales |
| ~~`11b-3b`~~ | the amount on the wire | ✅ `done`. `amountRaisedInr` is on the DTO and **already rendered** on this page |
| ~~B1~~ | which headline a drive **without a displayable name** gets | ✅ **`no_family`**, after the ₹0 check: `#decision-2026-09-19-223` **cl.1** (author-commit) |
| ~~B2~~ | counsel on `message_block.join` going **public** (§8.4(iii)) | ✅ **Cleared**: `#decision-2026-09-19-223` **cl.2** (recorded on BigDev's attestation; the document lives in the private legal repo) |

### ⚠ Why there is ⛔ no "withheld name" case (read before Trap 1)

⛔ **Nobody withholds the deceased member's name.** `-160` **cl.4(a)**: the member's own accepted,
versioned T&C is the basis, and every member accepts it at joining. **cl.6**: *"NO FAMILY VETO OVER THE
MEMBER'S OWN NAME"*. The nominee's information rests on the nominee's own Claim Terms (**cl.3**).
⇒ `deceasedMemberName: null` means only one of two things:
- **(i)** counsel's clause `niy.public-disclosure.member-information` is not yet pinned. This is
  **every** drive today.
- **(ii)** a technical cause: no KYC row, a failed decrypt, or a one-word name that `shielded_name`
  cannot render.

⚠ v0.1–v0.4 called the no-name headline the variant for a family that *"withheld"* the name. That label
came from the 2026-09-05 note §8.3(4), which quoted pre-`-160` public copy, and it is corrected at
`-223` cl.4. ⭐ **The ratified no-name wording itself stands unchanged.** Only the idea that it is
reserved for a refusal is gone.

---

## Story

As a member of the public reading about a drive,
I want the page to say what the trust actually wants said about it, in the Panel's own words,
so that the family's drive ends on the sentence the trustees chose instead of a bare row of figures.

## 📜 Policy meaning (AI-10-1, CONFIRMED BigDev 2026-08-18)

⭐ **No predicate that gates a member's access to a benefit** is introduced or changed by this story.

⚠ **No new public exposure either, stated because it looks like one.** Every value is already on this
page's wire and already rendered on it: the holder name (`-190` cl.2), `district`, and `amountRaisedInr`
(`11b-3b`). The deceased name is `11b-3b`'s ruled exposure (`-173`/`-174`) and is `null` everywhere
today. ⇒ this story **re-arranges** what is already published.

⭐ **One sentence, in the member's terms:** *"a drive's public page ends with the trustees' own words about
it, and shows nothing at all until real money has been contributed."* Checked against the Niyamavali:
no clause governs the wording of a gratitude message. The ₹0 silence is `#decision-2026-09-13-216`
**cl.1**. A drive without a displayable name gets the ratified no-name headline (`-223` cl.1). That
is ⛔ not a refusal by anyone, because ⛔ none is possible (`-160` cl.6).

---

## ⚠ THE SIX TRAPS

### Trap 1 — A NULL NAME RENDERS `no_family`, AND ⛔ NEVER A CLAIM ABOUT WHY

⚠ `t()` **throws** on an unsupplied token, and this block is page-shaped, so resolving `.full` with a
null name is a **500 for the whole page** (`-214` Consequence 5).
⭐ **Ruled (`-223` cl.1):** after the ₹0 check, a null name renders `message_block.headline.no_family`,
and a name renders `.full`. This is exactly the shipped member selector's mapping
(`apps/mobile/components/drive-detail/format.ts`, `selectMessageBlockHeadline`) and the public index's
(`apps/public/src/lib/sahyog-render.ts`, `selectIndexLineVariant` / `zeroLine`). ⭐ Mirror them, as a
pure selector that returns `null` for "render nothing".
⛔ **Never** add a per-cause signal to the wire. The contract forbids it as an enumeration oracle, and
the no-name headline needs none: it is true under every cause.
⛔ **Never** write copy, a comment or a test name that says the family *declined*, *withheld* or *chose*
not to be named. `-160` cl.6 makes that false.
⛔ **Never** reuse `-219`'s contributor placeholder (`A contributor` / `एक सहकर्मी`) for the deceased.
Only the headline varies; the deceased arm renders nothing else in the gap.
⚠ **Not this story's to fix:** the public drive **list** still shows `sahyog-drive:consent.note`
(*"A family may choose whether their relative is named here…"*), which `-160` cl.6 made false
(`-223` Consequence 3). ⛔ Do not edit it here, and ⛔ do not echo it on this page.

### Trap 2 — THE AMOUNT IS `amountRaisedInr`. **`deliveredTotal` fails CI BY NAME**

⭐ The wire field is **`amountRaisedInr: z.number().int().nonnegative()`**
(`packages/contracts/src/public-pages/sahyog-vivran.ts`, in `PublicSahyogVivranEntry`). It is non-null on
every stage, and is `0` on a zero drive. The server multiplies **once**, in
`packages/domain/src/pool/sahyog-vivran-read.ts` (`rawDeliveredTotal`, clamped), and publishes it as
`amountRaisedInr`.
⚠⛔ **Never write the identifier `deliveredTotal` in any render-path file**, not even as an object key or
a property access. It is in the financial-truth gate's banned `TARGET_OPERANDS`
(`scripts/sahyog-vivran-financial-truth/lib.ts`, pinned by `lib.test.ts`), and
`apps/public/tests/sahyog-vivran-render.test.ts` fails if the serialised model matches `/deliveredTotal/i`.
(v0.3 ordered *"render `deliveredTotal`"* at five sites. That order was red on write.)
⛔ **No multiplication** at a render site, in a route handler, or "just for this block": the gate's
`isAmountDerivation` catches a count × `fixedAmount` or × a literal. ⛔ **Do not call**
`derivePoolProgressCardViewModel` either: it requires `rosterSize` + `fixedAmount`, which `-204` cl.8
forbids on this wire.

### Trap 3 — DO NOT PRE-ADD WIRE FIELDS "TO BE READY"

⭐ The contract: *"Do not pre-add them: a field with no render is the vacuous-leg defect wearing a
forward-compatibility costume."* ⇒ ⛔ no `fixedAmount`, ⛔ no `rosterSize`, ⛔ no new DTO field of any
kind. Everything this story needs is already on the wire.

### Trap 4 — THE PAGE ALREADY RENDERS BOTH TABLE VALUES, UNDER DIFFERENT RULES

`apps/public/src/pages/sahyog-vivran/[driveToken].astro` today:

| Value | What the page ships | What the ratified table orders |
|---|---|---|
| **District** | `model.district ?? labels.districtUnknown` ⇒ **"Not recorded"** when absent | an absent district **drops its column** (`-214` Consequence 6), ⛔ never "Not recorded" |
| **Holder name** | label **"Nominee Name"** (`label.account_holder`, `-190` cl.2), rendered only when non-null | label **"Nominee full name"** (`message_block.table.nominee_name`, §8.1) |

⭐ **A precedent exists and Task 2 cites it:** on the member drive detail, `11b-17` shipped **both**
labels on one screen. "Nominee Name" stays in the account block and "Nominee full name" heads the
message-block table. Neither ratified label overwrote the other. ⭐ Two rules for the one District value
on one page is still a divergence that Task 2 must rule on **in writing**. ⚠ If ruling it would require
editing ratified text, **STOP and route it**.
⚠ **Two accounts:** `nomineeBankAccounts` is `.max(2)`. ⭐ The precedent is the **first** account's holder
name (`apps/api/src/modules/member-pool/handlers.ts`, `resolveSummaryNomineeName`, *"matching … the
public page's single `nominee_account_holder_name`"*). `-215` de-routed the differing-holder-name
question. ⇒ follow the precedent. ⛔ Do not invent a rule.
✅ This page decrypts the holder name in the **correct** field class (`decryptNomineeBankFieldSoft` in
`apps/api/src/modules/public-pages/handlers.ts`). ⚠ The public **index** does ⛔ not, and returns `null`
in production (routed separately in `deferred-work.md`). ⇒ ⛔ never source this table from index-derived
code.

### Trap 5 — THE COLUMN SAYS *"Nominee"*, THE SCHEMA DOES NOT BACK IT, AND THIS PAGE IS PUBLIC

⭐ The value is `account_holder_name_ciphertext`, the **disbursement account holder**. `deferred-work.md`
item (b) `D5-subject` (i) records *"the SCHEMA is the authority"* as the item's ruling. ⚠ The item itself
is **open**. The public exposure is **ruled** (§10.2 ruling 2, and `-214` Consequence 8).
⇒ ⭐ render a **label**. ⛔ **Never** render *"is the nominee of"*.

### Trap 6 — SILENT ON A ₹0 DRIVE, AND THE CHECK ORDER IS LOAD-BEARING

⭐ `#decision-2026-09-13-216` **cl.1** (DR + KB), which names this story in Consequence 2: the **entire**
block (headline, solidarity, gratitude, tagline, join **and the table**) renders **nothing** while the
amount is ≤ 0, on **every** stage. There is ⛔ no `no_amount` variant, and ⛔ none may be added (option B
was rejected).
⚠ **The page has no ₹0 branch today.** It renders "₹ 0 raised" beside "0 confirmed". The only
zero-silence in `apps/public` is on the **index** (`sahyog-render.ts`, `row.amountRaisedInr === 0`).
⇒ this story builds the first one here.
⚠⭐ **The ₹0 check runs BEFORE the name check.** If they are swapped, a ₹0 unnamed drive can resolve a
headline while a presence-only assertion still passes. ⭐ Assert the **order**, as the member fence does.

---

## Acceptance Criteria

### AC0 — Governance first, and both Preflight items discharged
⭐ One `governance:` commit adds the `epics.md` section (⭐ there is **no** `Story 11b.20` section today;
follow the `11b-19` `SECTIONED` precedent) and lands **before any code**
([[feedback_governance_commits_precede_implementation]]). Authority: `-214` Consequence 3.
✅ Both governance prerequisites exist: `#decision-2026-09-19-223` cl.1 (the null-name branch) and cl.2 (counsel on the join line).

### AC1 — The block renders on the PUBLIC per-drive page
⭐ `apps/public/src/pages/sahyog-vivran/[driveToken].astro`, the surface §8.3(2) names. ⛔ Not the
index, ⛔ not a table cell. The index keeps `index_line.*`.

### AC2 — Every string comes from `sahyog-shared` BY NAME
⛔ No copy is authored, derived or translated here (`-193` cl.3, `-206` cl.1). A missing key is a
**STOP**, ⛔ never a licence.
**And** every key is a **bare literal** or a simple `` `message_block.headline.${variant}` `` template.
⛔ **Never build a key by concatenation**: the fence's `RESOLVER` cannot see one. That discharges the
`deferred-work.md` item whose trigger is *"the first `11b-17`/`11b-20` render site landing"*.

### AC3 — The `Nominee full name` | `District` table
⭐ Per §8.1: two columns, **above** the message. Its relationship to the existing presentation is
**ruled in Task 2** (Trap 4). It is a **label**, ⛔ not a claim (Trap 5). The nominee value comes from the
**first** account's `accountHolderName`.

### AC4 — Absent tokens DROP their clause
⭐ §10.2 ruling 3 / `-214` Consequence 6. The District column is dropped when `district` is null
**or when the deceased name is null**, because the district travels with the **deceased** (the member
`selectMessageBlockTableColumns` precedent). The Nominee column is dropped when the holder name is null.
An empty table renders **nothing**. ⛔ It never renders as a table of placeholders.
⚠ **With the name null on every drive today, no public drive shows the District column.** That is
correct. ⛔ Do not file it as a defect.
⚠ Branch on the **raw** `drive.district` (nullable). ⛔ Never branch on a value that has already had
`districtUnknown` applied.
**And** this AC carries the real drop-when-absent assertion that `deferred-work.md` routes to the first
real render site.

### AC5 — The amount is RENDERED, never re-derived
⭐ `{amount}` = `formatCurrency(drive.amountRaisedInr, 'en')` from the raw number (the same call and
locale as the page's existing labels closure). ⚠ `model.amountRaisedInr` is the labelled string
*"₹ X raised"*, ⛔ not a bare amount. `formatCurrency` already prints `₹ `, so ⛔ never add a literal ₹
(the fence rejects ₹ before `amount`).
⛔ No multiplication, ⛔ no presenter call, ⛔ never the identifier `deliveredTotal` (Trap 2). The
financial-truth gate is the no-second-multiplication test. ⭐ AC8 puts the new file in its scope.

### AC6 — A null name renders `no_family`; a name renders `.full`
⭐ Per Trap 1 and `-223` cl.1. A test proves a named, funded drive renders **`.full`** with the name
(this catches a selector stuck on `no_family`). A test proves a null-name, funded drive renders
**`no_family`**, and ⛔ never `null` (this catches a selector that drops the block).
⛔ No test, comment or code claims a cause for the null (⛔ "withheld", ⛔ "declined", ⛔ "consent").

### AC7 — Silent on a zero-amount drive, and the ₹0 check runs FIRST
⭐ Per Trap 6. The whole block renders **nothing** while `amountRaisedInr <= 0`, on every stage.
**And** a test pins the **order**: the ₹0 decision precedes the name decision (an index comparison,
the same way the member fence does it). Presence alone does ⛔ not discharge this.

### AC8 — Nothing else moves, and both gates are NARROWED, never appended to blindly
⛔ No member surface, ⛔ no new wire field, ⛔ no contract widening, ⛔ no index change, ⛔ no masking
behaviour, ⛔ no new exposure.
**And (i) the dark-copy fence** `packages/i18n/tests/sahyog-shared-dark-copy.test.ts` turns **red** the
moment this story renders. Its `AUTHORISED` list is an exact `toEqual` of the two member files, and its
message says the public half *"is not pre-authorised here"*. ⭐ The remedy is written inside it:
***NARROW it***. ⛔ Never delete it, and ⛔ never append to make the build green. Add this story's sites
**with their authority named**, plus guard assertions that mirror the `11b-17` block: the ₹0-first order
check, the null → `no_family` mapping (the regex shape the `11b-17` block already uses), no literal ₹ before `amount`, the district coupling, and no
"Not recorded" in the table.
**And (ii) the financial-truth gate:** the new selector module is named `apps/public/src/lib/sahyog-vivran-*.ts`
and is added to `SCAN_FILES` with `renderPath: true` **in the same commit**. The scope safeguard in
`check.ts` fails the run otherwise. ⚠ A selector named *without* `sahyog-vivran` would escape the gate
silently. ⛔ Never use `renderPath: false` to get past it.
**And (iii)** no new surface-field id is added to the model. `scrape-test.spec.ts` pins exactly 14
`sahyogVivranSurfaceFieldIds`. ⚠ That scan synthesises its HTML from field ids, so **it never sees the
block's text**. The unit tests in Task 5 are the only coverage the text has.

---

## Tasks / Subtasks

- [ ] **Task 0 — RE-VERIFY THE BASELINE** (AC0). Re-diff `packages apps scripts` against `6547ead2`.
      If a sibling has shipped into this page, the selector module, the dark-copy fence or the
      financial-truth gate, re-read the Traps before writing code. (✅ The governance prerequisites
      exist: `-223` cl.1 + cl.2.)
- [ ] **Task 1 — GOVERNANCE** (AC0): the `epics.md` section under Epic 11b naming `-214` Consequence 3 and
      `-223`. **One `governance:` commit, before any code.**
- [ ] **Task 2 — RULE THE TABLE'S RELATIONSHIP TO THE PAGE** (AC3, AC4, Trap 4), **in writing, before
      rendering**: (a) the table **sits above** the message, and the existing "Nominee Name" and
      District fields stay or go, citing the `11b-17` both-labels precedent; (b) how the page's
      "Not recorded" District field and the table's drop-rule coexist. If this cannot be settled without
      editing ratified text, **STOP and route it**. The nominee value is the first account's.
- [ ] **Task 3 — The selector** (AC4, AC6, AC7): a **pure** module,
      `apps/public/src/lib/sahyog-vivran-message-block.ts` (⭐ the name keeps it inside the
      financial-truth safeguard). It takes the **raw** DTO values: `amountRaisedInr: number`,
      `deceasedMemberName`, `district`, and the first account's holder name. Order, which is
      load-bearing: **(1)** `amountRaisedInr <= 0` ⇒ `null`; **(2)** name null ⇒
      `no_family` (`-223` cl.1); **(3)** otherwise `.full` with the name. Plus a table-column
      selector mirroring `selectMessageBlockTableColumns`.
- [ ] **Task 4 — The render** (AC1, AC2, AC3, AC5) in `[driveToken].astro`: bare-literal keys only;
      `{amount}` from `formatCurrency(drive.amountRaisedInr, 'en')`; ⛔ no multiplication, ⛔ no presenter,
      ⛔ never `deliveredTotal`. Respect the family-13 a11y rules (`sahyog-vivran-a11y.test.ts`): ⛔ no
      `<script>`, ⛔ no `role=` on `ul`/`li`/`nav`, ⛔ no `title=`.
- [ ] **Task 5 — Tests** (AC4–AC8), in `apps/public/tests/` against the pure module with the real
      `formatCurrency`:
  - [ ] the named-drive `.full` headline (AC6)
  - [ ] a null-name funded drive renders `no_family`, ⛔ never `null` (AC6)
  - [ ] ₹0 silence **and** the order check (AC7)
  - [ ] a null `district` drops the column; a null name drops the District column; an empty table renders nothing (AC4)
  - [ ] real-`t()` legs for every resolved key in both locales ([[feedback_stub_must_call_not_transcribe]])
  - [ ] **NARROW** the dark-copy fence; register the module in `SCAN_FILES` (AC8)
- [ ] **Task 6 — Record what this story does not close.** `deferred-work.md`'s **Q1** (suspended member /
      unmasked coordinates) names `11b-20`, but it does not apply here: this page is unauthenticated,
      and `-217` (1) ruled Q1. ⭐ Record it as **not applicable**. ⛔ Do not re-raise it.

## Dev Notes

### Coordination
⚠ `11b-22` (backlog) edits the **same** `[driveToken].astro` for the confirmed-count copy
(`value.contributions_count` is resolved twice). ⭐ Whichever lands second rebases onto the first. ⛔ Neither
story absorbs the other's scope.

### What is already on this page (so it is not rebuilt)
`amountRaisedInr` renders through `<MatrixField field="amount_raised_inr">`. The deceased name renders
only when non-null, with no placeholder. The contributor list renders `A contributor` placeholders
(`-219`). ⇒ the page is **not dark** ([[project_sahyog_vivran_public_shell]]).
The pure view-model is `apps/public/src/lib/sahyog-vivran-render.ts` (`buildSahyogVivranView`). The
outage view sets `deceasedMemberName: null` and `amountRaisedInr: ''`. ⚠ The block must render **nothing**
on the outage path.

### What `-214` leaves open after this story
⭐ Nothing of `-214`: `11b-19` (C2) + `11b-17` AC10 (cl.4(b)) + this story (C3) close the 2026-09-05
ratification. `-216` cl.1 and `-223` cl.1 are the other instruments on this block. `11b-15`'s omission
stays recorded against `11b-15` and is never back-filled.
⛔ Do not write any present-tense *"the member app shows less than the public page"*. `-209` cl.3 ruled
that false for every drive.

### Rulings checked and found NOT to bind this story
`-217` (Q1 → Task 6 only) · `-218` (no percentage on closed/settled; already shipped) · `-219`/`-220`/`-221`/`-222`
(contributor placeholder and its parity, which is `11b-21`) · the matrix yaml's stale *"renders no rupee
figure"* surface description is ⛔ not this story's to edit.

### References
⭐ **Addressed by clause, item or declaration, not by line number.** `.decision-log.md`,
`deferred-work.md` and `sprint-status.yaml` are newest-first.

- ⭐ `.decision-log.md#decision-2026-09-11-214`: Consequences **3** (commission), **5** (null ⇒ an explicit branch), **6** (district drops), **8** (label, not claim)
- ⭐ `.decision-log.md#decision-2026-09-13-216` **cl.1** and Consequence 2: ₹0 silence, every stage
- ⭐ `.decision-log.md#decision-2026-09-19-223`: cl.1 (null → `no_family`), cl.2 (counsel on the join line), cl.4 (no "withheld name" case)
- ⭐ `.decision-log.md#decision-2026-08-28-160` cl.3, cl.4(a), cl.6: the member's own T&C is the basis; ⛔ no family veto
- ⚠ `trustee-panel-routing-note-2026-09-18-11b20-message-block-unnamed-drive.md`: **WITHDRAWN** (false premise)
- ⭐ `…/trustee-panel-routing-note-2026-09-05-11b12-under-funded-commitment-claim.md` §8.1, §8.3(2), §8.3(4), §8.4(ii)/(iii), §9.1 row 4, §10.2 rulings 2 + 3
- ⭐ `packages/contracts/src/public-pages/sahyog-vivran.ts`: the `amountRaisedInr`, `deceasedMemberName` ("FOUR CAUSES"), `district` and `nomineeBankAccounts` declarations
- ⭐ `packages/domain/src/pool/public-read.ts`: `NAME_PUBLICATION_AUTHORISED`, `SAHYOG_DRIVE_PUBLICATION_CLAUSE_ID`
- ⭐ `apps/mobile/components/drive-detail/format.ts`: `selectMessageBlockHeadline`, `selectMessageBlockTableColumns` (mirror the **shape**)
- ⭐ `apps/public/src/lib/sahyog-render.ts`: `selectIndexLineVariant`, `zeroLine` (the public null-name precedent)
- ⭐⭐ `packages/i18n/tests/sahyog-shared-dark-copy.test.ts`: the fence this story narrows
- ⭐⭐ `scripts/sahyog-vivran-financial-truth/` (`lib.ts` `TARGET_OPERANDS`, `check.ts` `SCAN_FILES` + scope safeguard)
- `deferred-work.md`: `D5-subject` (i)/(ii); the concatenated-key item (AC2); the vacuous district-drop item (AC4); Q1 (Task 6); the `11b-3b` Task 7 hand-off *"FOR `11b-20`"*
- `-173`/`-174` · `-189` C6 · `-190` cl.2 · `-193` cl.3 · `-204` cl.3/cl.8 · `-205` cl.1/cl.9 · `-206` cl.1 · `-209` cl.3 · `-215` · `-219` cl.3

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-09-19 | 0.5 | **STARTABLE. No code; the row stays `ready-for-dev`, now unblocked.** ⚠⛔ **v0.4's B1 rested on a false premise, caught by BigDev:** it assumed a family or member can *withhold* the deceased member's name. ⛔ Neither can: `-160` cl.4(a) makes the member's own T&C the basis, and cl.6 removed the family's veto. The *"withheld name"* label came from the 2026-09-05 note §8.3(4), which quoted pre-`-160` public copy; v0.4 also added *"a member not having agreed"* on its own. ⇒ the routing note is **WITHDRAWN**, and B1 is decided as an author-commit, `-223` cl.1: a null name renders `no_family`, after the ₹0 check. **B2** is discharged by `-223` cl.2 (counsel's clearance recorded on BigDev's attestation). Rewritten: Preflight, Policy meaning, Trap 1, AC0, AC6, AC8(i), Task 0/1/3/5, References. Also noted: the stale `sahyog-drive:consent.note` on the public list is **not this story's** (`-223` Consequence 3). | BigDev + Claude |
| 2026-09-18 | 0.4 | **Second `validate` pass, re-derived at `6547ead2`. No code; the row is unchanged (`ready-for-dev`, blocked).** v0.3 had lived only on the unmerged local branch `governance/11b-20-validate` and was cherry-picked onto `main` first. **Findings:** **(1)** `11b-3b` is `done`, so both code dependencies are discharged. **(2)** v0.3 ordered *"render `deliveredTotal`"* at five sites, which is **red on write**: the name is banned on the render path by the financial-truth gate and `sahyog-vivran-render.test.ts`. The wire field is `amountRaisedInr`. **(3)** v0.3's clause-pin gate (Trap 1 / AC6 / Task 3) **can never be satisfied**. The wire collapses four causes into one null and forbids a per-cause signal, and the basis is the member's own T&C, not a family choice. So *"no_family for consent and nothing else"* cannot be implemented, and the "family declined" premise was never ruled. Against it: `-214` C5, `11b-3b`'s `deferred-work.md` hand-off, and the shipped index/member selectors all map null → `no_family`. **BigDev routed the question to the Panel (B1)** instead of deciding it on our own record. **(4)** A routing-note-only obligation was found: §8.4(iii) requires counsel to review the join line *"before it goes public"*. BigDev reports it was cleared, but no record exists ⇒ **B2**. **(5)** The new selector must be named `sahyog-vivran-*.ts` and registered in `SCAN_FILES`, or it escapes the gate. **(6)** The page has no ₹0 branch; `model.amountRaisedInr` is a labelled string, so `{amount}` needs `formatCurrency` on the raw number. **(7)** Trap 4 now cites the `11b-17` both-labels precedent and the first-account nominee precedent, and notes that this page (unlike the index) decrypts the holder name correctly. **(8)** No public drive shows the District column today, by design. **(9)** The scrape test cannot see the block's text. **(10)** Coordination with `11b-22`. `-217`…`-222` were checked and do not bind this story. | BigDev + Claude |
| 2026-09-15 | 0.3 | First `validate` pass: `-216` cl.1 (₹0 silence) added as Trap 6/AC7; the presenter remedy struck; `11b-19` `done`; the dark-copy fence named; Trap 4 resolved; three `deferred-work.md` triggers carried. ⚠ *(v0.4 note: its `deliveredTotal` instrument and its clause-pin gate are both superseded; see 0.4.)* | BigDev + Claude |
| 2026-09-11 | 0.2 | The `11b-3b` dependency corrected (`deliveredTotal`, not `rosterSize`/`fixedAmount`; the name gated on the clause, not the merge). | BigDev + Claude |
| 2026-09-11 | 0.1 | Created from `#decision-2026-09-11-214` Consequence 3. Five traps. | BigDev + Claude |
