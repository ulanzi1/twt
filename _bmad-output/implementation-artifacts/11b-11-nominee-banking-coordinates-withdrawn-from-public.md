---
baseline_commit: 9e81000b
---

<!--
⭐ BASELINE — the last governance commit before this story opens
(`governance(11b): spawned excluded from the member drive list — story E unblocked`).
It carries decisions `2026-09-04-186` … `-196`, Story 11b.10 closed, and the six-story split.
-->

# Story 11b.11: The Nominee Banking Coordinates Are WITHDRAWN From the Public Surface `[SURFACE]`

Status: ready-for-dev

> ⭐⛔ **THIS STORY IS ⛔ NOT IN `epics.md`'s STORY LIST.** It is **story A** of the six-story split
> ruled at `2026-09-04-195` cl.3, which itself follows a **Trustee-ratified** decision
> (`2026-09-04-190`, Dhiraj Rahul + Kalpana Bharti). ⇒ it owes an `epics.md` **ANNOTATION** (Task 0),
> exactly as `11b-3a` and `11b-10` did, and a future `sprint-planning` run must ⛔ not drop it.
>
> ⭐⭐ **IT SHIPS FIRST AND ALONE.** Of stories A–F it is the ⛔ ONLY one that **REDUCES** public
> exposure, and it depends on ⛔ nothing. ⛔ Do ⛔ not bundle it with B–F "since they touch the same
> files" — that would gate a withdrawal of live PII behind feature work.

## Story

As the Trustee Panel, who ruled on 2026-09-04 that a family's banking coordinates must not be public,
I want the account number, IFSC, bank, branch and UPI ID removed from the public Sahyog Vivran page,
leaving only the nominee's name under a label that says what it is,
so that a bereaved family's payment coordinates stop being readable by anyone holding a link.

## 📜 Policy meaning (AI-10-1, CONFIRMED BigDev 2026-08-18)

⛔ **THIS STORY INTRODUCES AND CHANGES ⛔ NO PREDICATE THAT GATES A MEMBER'S ACCESS TO A BENEFIT.**
Stated explicitly rather than omitted, because an absent note is indistinguishable from an unasked
question.

⭐ It changes **what a PUBLIC page renders**. ⛔ It touches ⛔ no member-facing gate, ⛔ no eligibility
rule, ⛔ no `members.state` / `is_valid` conjunct, and ⛔ no assignment predicate. The member's own
access to these values — the 9.9 donor path — is **UNTOUCHED** (see *What this story does NOT do*).
⇒ ⛔ nothing to check against the Niyamavali here.

⚠ **The one invariant it MUST state its compliance with** is `2026-09-04-189` cl.3 — *"a member must
see MORE than the public, ⛔ never less"* — ruled a **DATA-CLASS-SPECIFIC** invariant (⛔ not universal)
at `2026-09-04-195` cl.1. ⭐ **This story moves the comparison in the SAFE direction: it LOWERS the
public.** ⇒ compliance is structural, ⛔ not asserted. AC6 pins it.

## 🎯 What already EXISTS — ⭐ verified live 2026-09-04, ⛔ not assumed

| Fact | Where | Verified |
|---|---|---|
| The public drive page renders **16** classified fields | `scrape-test.spec.ts` asserts the exact set by identity | ⭐ read |
| **6** of them are the nominee-bank block | `nominee_account_holder_name` · `_account_number` · `_ifsc` · `_vpa` · `_bank_name` · `_branch` | ⭐ read |
| **4** carry a Tier-1 public exception | `matrix.ts:426-429`, all keyed `'2026-08-28-165 cl.1'` | ⭐ read |
| The wire is a **discriminated union on `masked`** | `sahyog-vivran.ts:206-246` | ⭐ read |
| The **masked arm DROPS `accountHolderName`** and `vpa`, keeping `accountNumberLast4` + `ifsc` + `bankName` + `branch` | same | ⭐ read |
| The public label reads **"Account holder"** | `i18n/locales/en/sahyog-vivran.json:35` (`label.account_holder`) | ⭐ read |
| The **member** donor path returns all four **unmasked**, gated to the member's OWN `live` pool | `contracts/contributions/nominee-accounts.ts`; `payment/handlers.ts` answers `{available:false}` with no live pool | ⭐ read |
| **VPA collection is BUILT and populated** — ⛔ not deferred | col `vpa_ciphertext` (8.13 / migration 0080); input at `(claim)/nominee-review.tsx:232-239`; **11 of 558** accounts carry one | ⭐ queried |

## ⛔ THE FOUR TRAPS

### Trap 1 — ⛔⛔ THIS SUPERSEDES A **TRUSTEE-RATIFIED** DECISION. ⛔ DO NOT EDIT IT IN PLACE

`2026-08-28-165` cl.1–2 (Trustee-ratified) put these four pairs at `tier: public`.
`2026-09-04-190` cl.1 **supersedes cl.1–2 IN PART** — 4 pairs → 1.

⛔ `-165` is ⛔ **NOT edited, ⛔ not annotated as wrong, ⛔ not softened**
([[feedback_supersede_never_reinterpret]]). ⭐ Its **cl.3–4** — *masking is a presentation/projection
policy; the underlying fields stay Tier-1 in every state* — ⛔ **STAND UNCHANGED** and this story
depends on them. ⇒ the supersession lives in `-190`; this story **implements** it.

### Trap 2 — ⚠⛔ THE MASKED ARM WOULD BLANK THE ONLY FIELD LEFT

The masked arm currently **drops `accountHolderName`**. ⇒ once the coordinates go, a masked drive would
render **⛔ NOTHING** in the bank block. `2026-09-04-191` cl.2 rules that the masked arm **RETAINS the
nominee name**.

⚠ This **amends the READING of `2026-08-28-160` cl.10(e)**'s retention list — which was written when
the masked view still carried account coordinates and therefore had something else to retain.
⛔ **Amend the reading, ⛔ never restate cl.10(e) as if it had always said this.**

### Trap 3 — ⛔ THE COLUMN NAMES DO ⛔ NOT CHANGE. THIS IS A **PRESENTATION** RULING

*"Nominee Name"* replaces *"Account holder"* **in COPY**. ⛔ `nominee_account_holder_name` (the field
id, the matrix key, the wire key `accountHolderName`, the column
`account_holder_name_ciphertext`) is **UNCHANGED** — Story 6.8's composite-PK row identity and the 9.9
donor path key on it, and `public-pages/handlers.ts:650` already records *"it is the ACCOUNT HOLDER"*
as a deliberate naming note. ⛔ Renaming the field is a migration this story ⛔ does not own.

### Trap 4 — ⚠⛔ THE MASKING CODE SURVIVES, BUT IT IS ⛔ NO LONGER A LIVE CONTROL

`2026-09-04-190` cl.4: **RETAIN** `isNomineeBankMasked`, the schedule table, its permission key and its
tests — *"we may use it in future"*. ⛔ Do ⛔ **not** delete any of it.

⚠⛔ **AND STATE ITS NEW STATUS WHEREVER IT IS DESCRIBED:** with the coordinates gone it has ⛔ **no
public consumer**. ⛔ It must ⛔ not be described as a live safeguard in any comment, doc-block or
Trustee-facing material until it has one. ⭐ This is the same class of error `-187` / `-188` / `-192`
recorded three times in one day — **prose that outlives the thing it describes.**

---

## Acceptance Criteria

### AC0 — The governance is transcribed BEFORE any code

**Given** this story exists only because of `2026-09-04-190` (Trustee-ratified) as scoped by `-195` cl.3
**Then** Task 0 writes the `epics.md` **annotation** recording that this story exists and why
**And** the sprint-status row flips `backlog` → `in-progress` in a `governance:`-prefixed commit
**And** ⛔ **no code lands before that commit**
([[feedback_governance_commits_precede_implementation]]).

### AC1 — The five coordinates are GONE from the public wire

**Given** `2026-09-04-190` cl.1
**When** `GET /api/v1/p/:pariwarId/public-pages/sahyog-vivran/:driveToken` responds
**Then** the body carries ⛔ **NO** `accountNumber`, ⛔ no `accountNumberLast4`, ⛔ no `ifsc`, ⛔ no
`vpa`, ⛔ no `bankName` and ⛔ no `branch` — ⛔ **not as `null`, but ABSENT**, the same
`.strict()`-enforced discipline `-165` used for the masked arm (*"the masked arm has ⛔ NO
`accountNumber` KEY AT ALL"*)
**And** the four `RULED_TIER1_PUBLIC_EXCEPTIONS` entries at `matrix.ts:426-429` become **ONE**
**And** `public-vs-private-matrix.yaml` drops the five field declarations
**And** ⛔ the domain read stops SELECTING and DECRYPTING them for this surface — ⛔ a field removed at
the render layer while still crossing the wire is ⛔ not removed.

### AC2 — The nominee's name REMAINS, under a label that says what it is

**Given** `-190` cl.2
**Then** `nominee_account_holder_name` stays at `tier: public` with its Tier-1 exception, re-keyed to
`2026-09-04-190 cl.2`
**And** the rendered label reads **"Nominee Name"** in **both** locales — ⛔ never *"Account holder"*
**And** ⛔ the field id, the matrix key, the wire key and the DB column are **UNCHANGED** (Trap 3).

### AC3 — The masked arm RETAINS the nominee name

**Given** `-191` cl.2
**When** the masking predicate returns `true` for a drive
**Then** the projection still carries `accountHolderName`
**And** a test drives a **masked** drive and asserts the name is present — ⛔ the regression this AC
exists to prevent is a masked drive rendering an **empty** bank block.

### AC4 — The masking code is RETAINED, and its status is STATED

**Given** `-190` cl.4
**Then** `isNomineeBankMasked`, `pariwar_nominee_bank_masking_schedule`, the permission key and every
existing test **survive** — ⛔ nothing is deleted
**And** every doc-block describing it as governing a public disclosure is **amended** to record that it
has ⛔ **no public consumer** after this story
**And** ⛔ ⛔ no Trustee-facing material describes it as a live safeguard.

### AC5 — The identity gates MOVE, and they move LOUDLY

**Given** `scrape-test.spec.ts` asserts the classified field set **by identity** (16 entries) and the
tier-leak leg is policed
**Then** that set becomes **ELEVEN**, and the assertion is updated in the same commit as the fields
**And** the `login-wall.spec.ts` allowlist entry for this route is amended: the route is ⛔ **no longer
PII-bearing in the nominee-bank sense** — ⚠ it still carries `deceased_member_name`'s sibling exposure
via the index, so ⛔ **do not restore the pre-11b.3a wording wholesale**; amend, ⛔ do not revert
**And** ⛔ every control-count statement that says **FOUR** Tier-1 pairs is corrected to **ONE**.

### AC6 — `member > public` is satisfied STRUCTURALLY, and said so

**Given** `2026-09-04-189` cl.3 as scoped by `-195` cl.1 (a **data-class** invariant)
**Then** the story record states, in one sentence, that this story satisfies it **by lowering the
public**, ⛔ not by widening the member
**And** a test asserts the **member** donor path still returns all four values **unmasked** — ⛔ the
regression this AC exists to prevent is a well-meaning sweep that removes the coordinates from
`contracts/contributions/nominee-accounts.ts` too, breaking the ability to **pay a family**.

### AC7 — ⛔ Nothing else moves

**Then** the rate-limit tier is **unchanged** · the `D8-default` FAIL-OPEN ruling is **unchanged** ·
the public address token, the index, the stage vocabulary and the meter are **untouched** (⭐ stories
B/C/D own those)
**And** the deceased-name publication basis is **untouched**
**And** ⛔ no member surface changes.

---

## ⚖️ Decisions

### ✅ D1 — **RULED (b) by BigDev, 2026-09-04: COLLAPSE THE WIRE, KEEP THE MACHINERY.** Does the wire keep the `masked` discriminated union?

> ⭐⭐ **THE RULING.** The public DTO **collapses to a single nominee-name shape** — ⛔ no
> `z.discriminatedUnion('masked', …)`, ⛔ no `masked` literal on the wire at all. ⭐ **The masking
> MACHINERY is untouched and stays fully live in the codebase**: `isNomineeBankMasked`, the
> `pariwar_nominee_bank_masking_schedule` table, its permission key, its policy module and **every one
> of its existing tests** (AC4). ⇒ *"keep the masking window code"* (`-190` cl.4) is honoured; what
> ⛔ stops is the **wire advertising a control it no longer exercises**.
>
> ⚠⛔ **AND THE ABSENCE MUST BE EXPLAINED WHERE THE UNION USED TO BE.** A future reader finding ⛔ no
> `masked` field will otherwise conclude masking was **deleted** — the mirror image of trap 4. ⇒ leave
> a doc-block at the collapse site naming what was there, why both arms became identical, and where
> the machinery still lives.
>
> ⚠ **The masking predicate is ⛔ NOT called on this path any more.** ⛔ Do ⛔ not leave a call whose
> result is computed and discarded — that is a live-looking control with a dead output. ⭐ Remove the
> CALL from the public read; ⛔ keep the FUNCTION.

⭐ **The problem:** after AC1 + AC3, the unmasked arm carries `accountHolderName` and the masked arm
carries `accountHolderName`. ⇒ **the two arms become IDENTICAL** and the `masked` discriminator is
**inert on the public wire**.

- **(a) KEEP the union**, both arms carrying only the name plus the flag. ⭐ Zero churn; the shape is
  ready if masking ever returns. ⛔ But it ships an **inert discriminator**, which is precisely the
  *"prose that outlives the thing it describes"* failure Trap 4 names — a future reader will read
  `masked: true` on the wire as evidence of a live control.
- **(b) ⭐ COLLAPSE the public wire** to a single nominee-name shape, and keep the masking **machinery**
  (`isNomineeBankMasked`, the schedule, the key, the tests) fully intact per AC4. ⛔ The wire stops
  advertising a control it no longer exercises.

⭐ **RULED (b).** `-190` cl.4 retains *"the masking window CODE"*; it does ⛔ not require the **wire**
to keep a discriminator whose two arms are the same. ⇒ **Task 2 is UNBLOCKED.**

---

## ⚠ What this story does ⛔ NOT do

- ⛔ **It does ⛔ NOT touch any member surface.** `contracts/contributions/nominee-accounts.ts` (9.9)
  keeps returning **all four values unmasked**, gated to the member's own `live` pool. ⭐ A member must
  be able to **pay the family** — a masked account number ⛔ cannot be transferred to.
- ⛔ **It does ⛔ NOT give the member the complete banking information for a FINISHED drive.**
  `-190` cl.3 requires that; ⭐ it is **story F**, which needs story E's list first. ⇒ after this story
  a small residual inversion remains for `closed` drives, ⛔ recorded and ⛔ not hidden.
- ⛔ It does ⛔ not rename any column, field id, matrix key or wire key (Trap 3).
- ⛔ It does ⛔ not delete masking (Trap 4), change the stage vocabulary (story B), add the target
  (story C), list `live` drives (story D), or build any member list (stories E/F).
- ⛔ It does ⛔ not touch `limits.search`, `D8-default`, the publication kill switch or the name basis.

---

## ⬅️ INHERITED — eight findings routed here by 11b.3a's THIRD code-review pass (2026-09-04)

⭐⭐ **These are ⛔ NOT new scope.** They are findings from the third 3-layer review of **Story 11b.3a**,
routed here rather than actioned there under BigDev's **split-by-survival** ruling (2026-09-04): 11b.3a
is `done` and **merged**, and `2026-09-04-190` cl.1 — which **this** story implements — **deletes or
collapses the exact code they bear on**. ⛔ Fixing them in 11b.3a would have queued work against code
about to be removed.

✅⭐ **LIFTED INTO THE TASKS — 2026-09-04, on BigDev's instruction.** The dev agent works from the
Tasks list, ⛔ not from a findings section ([[feedback_spec_edits_must_propagate_to_tasks]]), so all
eight items now appear as `⬅️ INHERITED` subtasks under the Task that already owns the file:
**Task 2** (the collapse-site doc-block covers unused ciphertext) · **Task 3** (the matrix YAML's three
false claims) · **Task 4** (`bank_name`, and the CONDITIONAL malformed-row item) · **Task 5** (the
unconditional outcome projection) · **Task 7** (the THIRD control-count document, the honest recount,
and mechanizing it) · **Task 8** (the member donor path must ⛔ not inherit either defect) ·
**Task 9** (the three REACTIVATION PRECONDITIONS).
⇒ ⭐ **This section is now the RATIONALE; the Tasks are the obligation.** ⛔ Do ⛔ not action from here
— action from the Tasks, and read this for the evidence and the reasoning behind each.

### ✅ Closed by this story's own ACs — verify at implementation, ⛔ do not assume

- **`bank_name = ''` 500s the entire public transparency page** [`packages/domain/src/pool/sahyog-vivran-read.ts:586`] — `bankName` is passed through **raw** while `branch` on the **next line** is `.trim() || null`-guarded; the column is `text NOT NULL` with ⛔ no non-empty CHECK, is copied verbatim from the IFSC provider port (which declares `bankName: string`, no minimum), and `''` fails `z.string().min(1)` in **both** arms of the response union ⇒ serialization failure ⇒ **500** ⇒ outage page for every visitor. Latent today (the only adapter is an in-memory fixture map); it arrives with a real RBI-dataset adapter. ⭐ **AC1 closes it by deletion** — `bankName` leaves the public read entirely. ⚠⛔ **BUT VERIFY THE MEMBER PATH:** AC6 keeps all four values on the **donor** path, and that path must ⛔ not inherit the same unguarded pass-through. ⚠ The second pass dispositioned this once and **two independent layers re-raised it unprompted** in the third — signal about its visibility, ⛔ not a reversal.
- **The read model returns `masked: boolean` ALONGSIDE the complete ciphertext of every field** [`sahyog-vivran-read.ts`, `readNomineeBank` / `SahyogVivranNomineeBank`] — `accounts` is built unconditionally and always carries `accountNumberCiphertext`, `accountHolderNameCiphertext`, `ifscCiphertext` and `vpaCiphertext`; ⛔ nothing in the returned **type** changes when `masked === true`, so the guarantee is a downstream promise rather than a structural property. ⚠ Severity reduced on verification — the leak **is** guarded at the wire by a real test (`apps/api/tests/integration/public-pages/sahyog-vivran.spec.ts:911`, *"the FULL NUMBER IS NOT ON THE WIRE"*) ⇒ hardening, ⛔ not a live defect. ⭐ **D1 collapses the union entirely** ⇒ closed by supersession. ⚠ If the collapsed shape still carries ciphertext it does not use, say so at the collapse site — D1 already owes a doc-block there.
- **The bank block is published regardless of the drive's OUTCOME — including DENIED and APPEAL-REVERSED claims** [`apps/api/src/modules/public-pages/handlers.ts`] — the decrypt fan-out over `drive.nomineeBank.accounts` is **unconditional**, and the ⛔ only suppressor on the path is the **time-since-close** masking predicate. The same response carries `appealReversal` and `fundingOutcome`, so a **denied** claim, or one whose approval was **reversed on appeal**, still publishes the holder's name and full account number indefinitely under FAIL-OPEN. ⭐ `-160` cl.10(a) authorises publication *"during an active campaign"*; ⛔ nothing checks the campaign is **legitimate**, only that it is **recent**. ⇒ **AC1 closes it by deletion** — ⚠ same member-path caveat as above.

### ⚠ CONDITIONAL — closed ⛔ ONLY IF the public read stops resolving the schedule

- **One malformed schedule row throws on the UNAUTHENTICATED path and darkens EVERY drive page in the Pariwar** [`packages/domain/src/claim/nominee-bank-masking-policy.ts:71-86`, reached from `sahyog-vivran-read.ts`] — a row with `masking_mode = 'after_days'` and `mask_after_days IS NULL` (the CHECK dropped, or a snapshot restore predating it) makes `settingFromRow` throw a **bare `Error`** inside the read's `Promise.all` ⇒ the API 500s ⇒ the Astro route maps `!fetched.ok` to the **503 outage view**, for **every** Sahyog Vivran page in that tenant. ⚠⭐ **That is the OPPOSITE posture taken 12 lines away** for the same failure class, where an out-of-range `accountRank` is **dropped** explicitly because *"throwing would 500 a whole transparency page over one malformed row"* — the module is internally inconsistent about **tenant-wide vs row-local blast radius**. ⛔ **DO ⛔ NOT ASSUME THIS IS CLOSED.** If D1's collapse means the public read no longer calls `resolveEffectiveNomineeBankMasking` at all, it is closed by deletion; **if the call survives, this stands and must be fixed here.** ⚠ Its **admin-side twin is ⛔ NOT closed by this story** and stays on 11b.3a: the same `settingFromRow` sits outside any try/catch in the admin `getSchedule`, so a corrupt row **500s the console** — and the operator's only recovery path is the console that just 500'd.

### ⛔ REACTIVATION PRECONDITIONS — ⛔ NOT to be fixed here, ⛔ NOT to be forgotten

⭐ **Trap 4 / AC4 retain the masking machinery with ⛔ no public consumer.** These three findings are
**dormant, ⛔ not resolved** — each becomes live again the moment the machinery is re-pointed at any
surface. ⚠ **AC7 leaves the `D8-default` FAIL-OPEN ruling UNCHANGED**, so the fail-open semantics
persist inside the dormant code. ⇒ record them wherever AC4 records the machinery's new status, so
whoever reactivates it inherits the list.

- **Un-masking is RETROACTIVE across every historical drive, and the blast radius of one PUT is unbounded and unpreviewable** — the schedule resolves at the **request instant**, ⛔ never at the drive's close instant. A Pariwar on `permanent` for two years that moves to `after_days: 30` **instantly re-publishes** complete details for every drive closed more than 30 days ago; `after_days: 36500` un-masks the **entire archive in one request**. ⛔ No dry-run, ⛔ no affected-drive count, ⛔ no per-drive pinning. The doc-blocks celebrate reversibility without noting the reverse direction is a **bulk disclosure event**. ⚠ Secondarily, the `s-maxage=300` staleness is disclosed in three places but **all three frame it as a schedule-change delay** — the identical delay on the **time-elapse** transition at `closedAt + N` is disclosed ⛔ nowhere.
- **RLS scope failure is INDISTINGUISHABLE from "no window configured" — and resolves to PUBLISH** — `resolveEffectiveNomineeBankMasking` returns `null` for **every** zero-row cause: no row, unset `app.pariwar_id`, empty-string scope, wrong-tenant scope, a dropped policy. `null` means **not masked**. ⇒ a public route whose connection loses its `SET LOCAL app.pariwar_id` on a `permanent` Pariwar publishes complete details, pinned at every warm PoP for 300s. ⭐ `-179` cl.1 ruled the **POLICY** default fail-open; the code silently extends that to **INFRASTRUCTURE FAILURE**, which ⛔ no one ruled on. **Before reactivation:** distinguish *"queried successfully, no row"* from *"could not resolve"*.
- **FAIL-OPEN by default, centrally administered, with O(N) remediation and a five-minute floor** — `configured: false` resolves FAIL-OPEN and `-178` forbids a Pariwar setting its own window ⇒ the incident path is **one Trust PUT per Pariwar**, each with a hand-written rationale, each up to **300s** to reach warm PoPs, with *"⛔ Direct SQL is NOT the operational fallback"*. ⛔ No global default, ⛔ no bulk setter, ⛔ no cache-purge hook ⇒ remediation time for an actively-abused account number is **N admin requests + 5 minutes**, N unbounded. ⭐ Documented three times, mitigated zero.

### 📋 One correction this story's own AC5 already owes

- **The route header's "FOUR applicable controls" overcounts what actually defends** [`apps/api/src/modules/public-pages/routes.ts`] — control **4** is `X-Robots-Tag: noindex, nofollow` (a crawler **hint**; archivers and scrapers ignore it), control **5** is *"the absence of any DETAIL or EXPORT affordance"* (irrelevant to a direct GET) and control **6** is the decrypt itself ⇒ netting out, **one** control stood between an anonymous caller and Tier-1 data. ⚠ **The enumeration half is CLOSED** — `-184` (B) ruled the address unguessable and **11b.10 shipped the opaque `publicToken`**. ⭐ What survives is that counting three non-controls as controls **manufactures a false defence-in-depth** on the document a future reviewer will trust. ⇒ **AC5 already requires every control-count statement to be corrected to ONE Tier-1 pair** — make the same edit honest about *which* of those four are controls. ⚠⛔ **AND THERE IS A THIRD DOCUMENT AC5 DOES NOT NAME:** `packages/contracts/public-pages/public-vs-private-matrix.yaml:758-760` states `noindex` is *"control 3 of the **THREE** this route states"* — a different count **and** a different ordinal from `routes.ts`. ⭐ That same file also still asserts, at `:112-117` and in its `description:` **data** at `:748-751`, that this surface *"declares ⛔ ZERO `pii_tier: 1` fields"* and *"NAMES ⛔ NOBODY … ⛔ not a nominee"* — both **false since 11b.3a**, and both squarely inside AC4's *"every doc-block describing it … is amended"* and Trap 4's *"prose that outlives the thing it describes."*

---

## Tasks / Subtasks

- [ ] **Task 0 — GOVERNANCE FIRST** (AC0)
  - [ ] Annotate `epics.md` at the FR-74 block: this story implements `-190` cl.1–2 and is story A of
        the `-195` cl.3 split. ⛔ Do ⛔ not edit FR-74's clause text — it already carries the
        2026-09-04 re-annotation; **append**, do not rewrite.
  - [ ] Flip `sprint-status.yaml` `11b-11-…`: `backlog` → `in-progress`, with a ledger entry.
  - [ ] Commit both with a `governance:` prefix. ⛔ No code in this commit.
- [x] **Task 1 — RULE D1** (blocked Task 2) — ✅ **RULED (b) by BigDev, 2026-09-04: collapse the wire,
      keep the machinery.** ⇒ Task 2 is unblocked; ⛔ nothing else in this story changes.
- [ ] **Task 2 — The contract** (AC1, AC2, AC3; shape per D1)
  - [ ] `packages/contracts/src/public-pages/sahyog-vivran.ts` — **per D1(b): COLLAPSE
        `PublicSahyogVivranNomineeAccount` from a `z.discriminatedUnion('masked', […])` to a SINGLE
        `.strict()` object carrying `accountHolderName` (+ `rank`).** ⛔ Remove `accountNumber`,
        `accountNumberLast4`, `ifsc`, `vpa`, `bankName`, `branch` **and the `masked` literal itself**.
        ⭐ Keys **ABSENT**, ⛔ never `null`.
  - [ ] Leave the doc-block D1 requires at the collapse site: what the union was, why both arms became
        identical, and that the machinery still lives in
        `packages/domain/src/claim/nominee-bank-masking*.ts`. ⛔ Without it the next reader concludes
        masking was deleted.
  - [ ] ⬅️ **INHERITED (11b.3a 3rd pass)** — the doc-block also states whether the collapsed shape
        still carries **ciphertext it no longer uses**. The old read returned `masked: boolean`
        **alongside** `accountNumberCiphertext` / `accountHolderNameCiphertext` / `ifscCiphertext` /
        `vpaCiphertext`, with ⛔ nothing in the TYPE changing when `masked === true` — the guarantee
        was a downstream promise, ⛔ not a structural property. D1's collapse closes it; ⛔ say so, so
        the next reader does ⛔ not re-introduce a flag beside the payload it is supposed to govern.
  - [ ] ⛔ Remove the masking **CALL** from the public read path (Task 4) — ⛔ never compute a verdict
        and discard it. ⭐ Keep the **function**, the schedule, the key and every test (AC4).
  - [ ] `matrix.ts:426-429` — four `RULED_TIER1_PUBLIC_EXCEPTIONS` entries → **one**, re-keyed
        `'2026-09-04-190 cl.2'`.
  - [ ] Amend the file's doc-blocks: the *"four ruled pairs"* prose, and cl.10(e)'s **reading** per
        Trap 2. ⛔ Amend, ⛔ do not delete — name the previous claim.
- [ ] **Task 3 — The matrix YAML** (AC1)
  - [ ] `public-vs-private-matrix.yaml` — drop the five field declarations from `sahyog-vivran`;
        keep `nominee_account_holder_name`.
  - [ ] Amend the surface's rider to record the supersession and point at `-190`. ⛔ Trap 1.
  - [ ] ⬅️⭐⭐ **INHERITED (11b.3a 3rd pass) — THIS FILE CARRIES THREE CLAIMS THAT ARE ALREADY FALSE,
        AND 11b.3a NEVER CORRECTED THEM.** ✅ Verified live. **(i)** `:112-117` — the file header still
        says the `sahyog-vivran` surface *"declares ⛔ **ZERO** `pii_tier: 1` fields at `tier: public`
        — it renders ⛔ **NO person's name at all** — so it neither needs nor claims a name-form
        ruling."* Both halves went false at 11b.3a. ⚠ **And the conclusion no longer follows on the
        header's own logic** — with the antecedent gone, the **name FORM** for `account_holder_name`
        is addressed ⛔ nowhere; ⭐ this story keeps that field (AC2), so ⛔ decide and record whether
        `-190` cl.2 settles the form, or route it. **(ii)** `:748-751` — the surface's `description:`,
        which is **YAML DATA, ⛔ not a comment**, still reads *"⭐ IT NAMES ⛔ NOBODY. … ⛔ not a
        nominee"* and *"the nominee bank presentation **is** 11b.3a's"* — a future tense pointing at a
        merged story. ⚠ After this story *"names nobody"* becomes **true again for the bank block but
        FALSE overall** — `nominee_account_holder_name` **stays** (AC2) ⇒ ⛔ do ⛔ not simply restore
        the old sentence; state what it now names. **(iii)** `:758-760` — see Task 7.
        ⭐ This is Trap 4's *"prose that outlives the thing it describes"* and AC4's *"every doc-block
        … is amended"*, in the file this task already opens.
- [ ] **Task 4 — The domain read** (AC1)
  - [ ] `packages/domain/src/pool/sahyog-vivran-read.ts` — stop selecting/decrypting the five for this
        surface. ⚠ Verify the shared nominee-bank resolver is ⛔ not also feeding the 9.9 donor path
        before narrowing it; if it is, ⭐ give this surface its **own** projection rather than
        narrowing the shared one (`public-read.ts`'s standing rule: *"a consumer needing different
        semantics needs its OWN fragment"*).
  - [ ] ⬅️ **INHERITED (11b.3a 3rd pass) — dropping `bankName` here CLOSES a latent 500; confirm it
        rather than assume it.** `sahyog-vivran-read.ts:586` passes `bankName` through **raw** while
        `branch` on the **next line** is `.trim() || null`-guarded. The column is `text NOT NULL` with
        ⛔ no non-empty CHECK, is copied verbatim from the IFSC provider port (`bankName: string`, no
        minimum), and `''` fails `z.string().min(1)` in **both** arms ⇒ serialization failure ⇒ **500**
        ⇒ outage page for every visitor. Latent only because today's sole adapter is an in-memory
        fixture map. ⭐ AC1's deletion closes it **for the public surface** — ⚠ the member path is
        Task 8.
  - [ ] ⬅️⚠⛔ **INHERITED (11b.3a 3rd pass) — CONDITIONAL, and ⛔ DO ⛔ NOT ASSUME IT IS CLOSED.** One
        malformed schedule row (`masking_mode = 'after_days'` with `mask_after_days IS NULL` — the
        CHECK dropped, or a snapshot restore predating it) makes `settingFromRow` throw a **bare
        `Error`** inside this read's `Promise.all` ⇒ the API 500s ⇒ the Astro route maps `!fetched.ok`
        to the **503 outage view**, for **EVERY** Sahyog Vivran page in that tenant. ⚠ That is the
        **opposite posture taken 12 lines away**, where an out-of-range `accountRank` is **dropped**
        because *"throwing would 500 a whole transparency page over one malformed row"*.
        ⇒ **If Task 2's removal of the masking CALL means this read no longer resolves the schedule,
        this is closed BY DELETION — say so. If the call survives in any form, it is ⛔ NOT closed and
        MUST be fixed here** (degrade row-local, ⛔ never tenant-wide). ⚠ Its **admin-side twin stays
        on 11b.3a** and is ⛔ not yours: the same `settingFromRow` sits outside any try/catch in the
        admin `getSchedule`, so a corrupt row 500s the console.
- [ ] **Task 5 — The API handler** (AC1)
  - [ ] `apps/api/src/modules/public-pages/handlers.ts` — drop the five from the response mapping,
        including the `soft(account.vpaCiphertext, 'vpa')` decrypt at `:712`.
  - [ ] ⬅️ **INHERITED (11b.3a 3rd pass) — the decrypt fan-out is UNCONDITIONAL on the drive's
        OUTCOME.** The map over `drive.nomineeBank.accounts` has ⛔ no outcome predicate, and the ⛔ only
        suppressor on the path is the **time-since-close** masking verdict. The same response carries
        `appealReversal` and `fundingOutcome`, so a **DENIED** claim — or one whose approval was
        **REVERSED ON APPEAL** — still published the holder's name and full account number
        indefinitely under FAIL-OPEN. ⭐ `-160` cl.10(a) authorises publication *"during an active
        campaign"*; ⛔ nothing checked the campaign was **legitimate**, only that it was **recent**.
        ⇒ AC1's deletion closes it **for the public surface**; ⚠ the member path is Task 8.
- [ ] **Task 6 — The render layer + copy** (AC2)
  - [ ] `apps/public/src/lib/sahyog-vivran-render.ts`, `surface-fields.ts`,
        `pages/sahyog-vivran/[driveToken].astro` — remove the five rows from the bank block.
  - [ ] ⬅️⭐⭐ **INHERITED (11b.3a 3rd pass, G3) — THE PER-ACCOUNT `aria-label` ANNOUNCES AN ORDINAL THE
        SIGHTED PAGE DELIBERATELY SUPPRESSES, AND IT ⛔ SURVIVES THIS STORY.** ✅ Verified at HEAD,
        raised independently by two layers. `[driveToken].astro:458` renders
        `aria-label={labels.bankAccountLabel(account.accountRank)}` ⇒ *"Account 1"* / *"Account 2"*,
        while `surface-fields.ts:569` maps `accountRank: null` and its doc-block at `:490` states
        *"**rendering 'Account 1' / 'Account 2' … would put an ordering that implies preference onto
        the page**."* ⇒ a sighted visitor sees two identical unnumbered boxes; a screen-reader visitor
        hears the ordinal. ⭐ **AC2 rules the two accounts EQUAL payment destinations with ⛔ "no
        ordering that implies preference"** ⇒ the story's stated reasoning is contradicted by its
        shipped output, **in the direction only assistive-tech users experience**. ⚠ And because the
        value reaches the DOM via `aria-label` rather than `<MatrixField>`, the field-classification
        gate is **structurally blind** — ⛔ it cannot fail on a field it was told does not exist.
        ⛔⛔ **YOUR Task 6 REMOVES FIVE ROWS, ⛔ NOT THE BLOCK OR ITS PER-ACCOUNT GROUPING ⇒ THIS IS
        ⛔ NOT CLOSED BY THE WITHDRAWAL.** Decide here: name the group by its **bank**, or restate
        equality in the per-account label.
  - [ ] ⬅️ **INHERITED (11b.3a 3rd pass, G3) — the "either account can be used" copy renders when the
        page shows exactly ONE account, and after your change it sits beside two NAMES and ⛔ no
        payment coordinates at all.** `bank.equal_destinations` is standing copy rendered whenever the
        block renders, and a one-element array is **explicitly legal** in the SSR validator ⇒ a
        visitor on a claim where only account #1 was collected reads *"Either account can be used.
        Neither one is preferred over the other."* beside **one** card, on the page whose whole
        purpose is that nothing about the money is hidden, and reasonably infers **a second account is
        being withheld**. ✅ Length 1 is ⛔ never exercised (the suite covers `[]` and a three-account
        rejection only). ⇒ decide here whether the sentence still holds once the coordinates are gone.
  - [ ] ⬅️ **INHERITED (11b.3a 3rd pass, G3) — the masked value restates its own label; closed by YOUR
        deletion, but ⛔ check the member path does not inherit the shape.** The `<dt>` reads *"Account
        number"* and the `<dd>` renders *"Account ending in 1234"* ⇒ announced as *"Account number:
        Account ending in 1234"*; Hindi is the same shape. ⭐ The wrapper exists for a **good** reason
        (AC4 requires the masked value be announced as ONE coherent field, ⛔ never digit-by-digit) —
        the defect is achieving it **by duplication**. ⇒ the account-number row goes at Task 6, so this
        dies with it; recorded because **AC6 retains the field on the member donor path**.
  - [ ] `i18n/locales/{en,hi}/sahyog-vivran.json` — `label.account_holder` → **"Nominee Name"** /
        the Hindi equivalent. ⚠ `t()` **THROWS** on a missing key — change both locales in the same
        commit. ⭐ Retire `label.account_number` / `label.ifsc` / `label.vpa` / `label.bank_name` /
        `label.branch` **only if** no other surface consumes them — ⛔ grep first.
- [ ] **Task 7 — The identity gates** (AC5)
  - [ ] `scrape-test.spec.ts:1219-1234` — the 16-entry set → **11**; amend the "TEN → SIXTEEN"
        comment to record the third move.
  - [ ] `login-wall.spec.ts` — amend the allowlist entry's control list and its PII-bearing
        characterisation. ⛔ Amend, ⛔ do not revert to pre-11b.3a wording.
  - [ ] ⬅️⭐ **INHERITED (11b.3a 3rd pass) — THERE IS A THIRD DOCUMENT STATING THE CONTROL COUNT, AND
        AC5 DOES ⛔ NOT NAME IT.** `public-vs-private-matrix.yaml:758-760` says `noindex` is *"control
        **3** of the **THREE** this route states"* — a different **count** AND a different **ordinal**
        from `routes.ts` (which says four, with `X-Robots-Tag` as control **4**). ⇒ AC5's *"every
        control-count statement is corrected"* reaches this line too.
  - [ ] ⬅️⚠ **INHERITED — and make the corrected count HONEST about which of them are controls.**
        The *"FOUR applicable controls"* overcounted: control **4** is `X-Robots-Tag` (a crawler
        **hint** — archivers and scrapers ignore it), control **5** is *"the absence of any DETAIL or
        EXPORT affordance"* (irrelevant to a direct GET) and control **6** is the decrypt itself
        ⇒ netting out, **ONE** control stood between an anonymous caller and Tier-1 data.
        ⚠ **The enumeration half is CLOSED** — `-184` (B) ruled the address unguessable and 11b-10
        shipped the opaque `publicToken` — ⛔ do ⛔ not re-raise it. ⭐ What survives is that counting
        three non-controls as controls **manufactures a false defence-in-depth** on the document a
        future reviewer will trust.
  - [ ] ⬅️ **INHERITED — mechanize the count, ⛔ or record that you chose not to.** It is prose in
        **three** places with ⛔ no constant, ⛔ no test and ⛔ no lint rule; it is prevented solely by a
        reviewer counting bullet points by eye, **which is exactly how it failed the first time**.
        ⭐ Cheapest fix: one exported `SAHYOG_VIVRAN_APPLICABLE_CONTROLS` all three import, plus a
        length assertion.
  - [ ] `packages/contracts/tests/public-pages-sahyog-vivran.test.ts` — update shape assertions.
- [ ] **Task 8 — The tests that prove it** (AC1, AC3, AC6)
  - [ ] Live-DB: a public drive with real ciphertext returns ⛔ **no** account number / IFSC / VPA /
        bank / branch key at all.
  - [ ] Live-DB: a **MASKED** drive still returns `accountHolderName` (AC3's regression guard).
  - [ ] Live-DB: the **member** donor path still returns all four **unmasked** for the member's own
        live pool (AC6's regression guard).
  - [ ] ⬅️⚠ **INHERITED (11b.3a 3rd pass) — AC6 KEEPS ALL FOUR VALUES ON THE DONOR PATH, SO VERIFY IT
        DOES ⛔ NOT INHERIT THE TWO DEFECTS AC1 CLOSES BY DELETION.** ⭐ Deleting a field from the
        public surface does ⛔ **not** fix it on a path that retains the field. **(i)** the unguarded
        `bankName` pass-through (`''` ⇒ `min(1)` parse failure ⇒ 500) — Task 4; **(ii)** the
        **unconditional** projection with ⛔ no outcome predicate — Task 5. ⇒ if the donor path shares
        either code path, ⭐ **fix it there or give it its own guard** — ⛔ do ⛔ not close these on the
        strength of the public deletion alone.
  - [ ] ⭐ **Execute them.** `twt-test-pg` on `:5433`; ⛔ *"written but not run"* is ⛔ not attested —
        that exact gap shipped a red spec at 11b.10.
- [ ] **Task 9 — Masking status prose** (AC4)
  - [ ] Amend every doc-block that describes masking as governing a public disclosure to state it has
        ⛔ no public consumer. ⛔ Delete ⛔ nothing.
  - [ ] ⬅️⛔⛔ **INHERITED (11b.3a 3rd pass) — RECORD THREE REACTIVATION PRECONDITIONS ALONGSIDE THE
        NEW STATUS. These are DORMANT, ⛔ NOT RESOLVED.** cl.4 retains the machinery with ⛔ no public
        consumer and **AC7 leaves `D8-default` FAIL-OPEN UNCHANGED**, so each of these goes live again
        the moment the machinery is re-pointed at any surface. ⛔ Whoever reactivates it must inherit
        this list, so it belongs **where AC4 records the status**, ⛔ not only in `deferred-work.md`:
        **(a) UN-MASKING IS RETROACTIVE, and one PUT's blast radius is unbounded and unpreviewable** —
        the schedule resolves at the **request instant**, ⛔ never at the drive's close instant, so a
        Pariwar moving `permanent` → `after_days: 30` instantly re-publishes every drive closed more
        than 30 days ago, and `after_days: 36500` un-masks the **entire archive in one request**;
        ⛔ no dry-run, ⛔ no affected-drive count, ⛔ no per-drive pinning. ⚠ The doc-blocks celebrate
        reversibility without noting the reverse direction is a **bulk disclosure event**, and the
        `s-maxage=300` staleness is disclosed three times **all framed as a schedule-change delay** —
        the identical delay on the **time-elapse** transition at `closedAt + N` is disclosed ⛔ nowhere.
        **(b) RLS SCOPE FAILURE IS INDISTINGUISHABLE FROM "NO WINDOW CONFIGURED", AND RESOLVES TO
        PUBLISH** — `resolveEffectiveNomineeBankMasking` returns `null` for **every** zero-row cause
        (no row, unset `app.pariwar_id`, empty-string scope, wrong-tenant scope, a dropped policy),
        and `null` means **not masked**. ⭐ `-179` cl.1 ruled the **POLICY** default fail-open; the
        code silently extends that to **INFRASTRUCTURE FAILURE**, which ⛔ no one ruled on. **Before
        reactivation:** distinguish *"queried successfully, no row"* from *"could not resolve"*.
        **(c) FAIL-OPEN BY DEFAULT, CENTRALLY ADMINISTERED, O(N) REMEDIATION, FIVE-MINUTE FLOOR** —
        `-178` forbids a Pariwar setting its own window ⇒ one Trust PUT **per Pariwar**, each with a
        hand-written rationale, each up to **300s** to reach warm PoPs, with *"⛔ Direct SQL is NOT the
        operational fallback"*; ⛔ no global default, ⛔ no bulk setter, ⛔ no cache-purge hook.
        ⭐ Documented three times, mitigated zero.

---

## Dev Notes

### The shape of the change

⭐ **This is a SUBTRACTION story.** Almost every task removes something. The risk profile is therefore
inverted from a normal story: ⛔ the danger is ⛔ not that something fails to work, it is that
**something keeps working that should have stopped** — a field still on the wire while the render layer
hides it, a decrypt still running, a matrix entry left behind.

⇒ **AC1's wording is deliberate: ABSENT, ⛔ not `null`.** `-165` established that discipline for the
masked arm and stated why: *"a single shape with `accountNumber` beside `accountNumberLast4` would make
that a CONVENTION — one a handler bug can violate."* ⭐ Follow it.

### Why the gates catch this

The scrape-test asserts the classified field set **by identity**, ⛔ not by count. ⇒ every removal here
**fails that test until it is updated**, and an accidental leftover fails it too. ⭐ That is the gate
working — ⛔ do not "fix" it by loosening the assertion.

### ⚠ The 6.8 / 9.9 coupling — read before narrowing anything shared

`resolveNomineeBankBlock`-style helpers may serve **both** the public read and the 9.9 donor path.
⛔ Narrowing a shared resolver would silently strip the member's payment coordinates and make it
impossible to pay a family. ⭐ Read the call sites first; prefer a **separate projection** for the
public surface.

### Testing standards

Live-DB integration under `apps/api/tests/integration/public-pages/` and
`packages/domain/tests/integration/pool/`; unit under `apps/public/tests/` and
`packages/contracts/tests/`. ⚠ Assert **membership and explicit values**, ⛔ never counts over the
shared fixture ([[project_live_db_test_gotchas]]).

### References

- `.decision-log.md#decision-2026-09-04-190` cl.1–2, cl.4 — the ruling
- `.decision-log.md#decision-2026-09-04-191` cl.2 — the masked arm retains the name
- `.decision-log.md#decision-2026-09-04-195` cl.1, cl.3 — the invariant's scope; the six-story split
- `.decision-log.md#decision-2026-08-28-165` cl.1–2 — **superseded in part**; cl.3–4 **stand**
- `.decision-log.md#decision-2026-08-28-160` cl.10(e) — the retention list whose **reading** is amended
- `packages/contracts/src/public-pages/matrix.ts:426-429` — the four allowlist entries
- `packages/contracts/src/public-pages/sahyog-vivran.ts:206-246` — the discriminated union
- `apps/public/tests/integration/public-pages/scrape-test.spec.ts:1219-1234` — the identity assertion
- `packages/i18n/locales/en/sahyog-vivran.json:35-40` — the bank-block labels

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-09-04 | 0.1 | Created from `2026-09-04-195` cl.3 (story **A**). ⚠ **D1 is OPEN and blocks Task 2.** | BigDev + Claude |
| 2026-09-04 | 0.2 | ✅ **D1 RULED (b) — collapse the wire, keep the machinery.** Task 1 closed, Task 2 unblocked and made concrete. ⛔ `dev-story` ⛔ NOT started, by instruction. | BigDev + Claude |
| 2026-09-05 | 0.4 | ⬅️ **THREE MORE INHERITED from 11b.3a's third pass, chunk G3** — all on the public bank block, all lifted into **Task 6**. ⚠ **One is ⛔ NOT closed by the withdrawal:** the per-account `aria-label` announces *"Account 1"/"Account 2"*, contradicting AC2's *"no ordering that implies preference"* — Task 6 removes five **rows**, ⛔ not the per-account grouping. ⛔ No AC changed; story stays `ready-for-dev`. | BigDev + Claude |
| 2026-09-04 | 0.3 | ⬅️ **EIGHT FINDINGS INHERITED from 11b.3a's THIRD code-review pass, and LIFTED INTO THE TASKS** (BigDev's split-by-survival routing: `-190` cl.1 deletes or collapses the code they bear on). New `⬅️ INHERITED` subtasks under Tasks **2, 3, 4, 5, 7, 8, 9**. ⚠ **Three are REACTIVATION PRECONDITIONS, ⛔ not fixes** — cl.4 retains the machinery and AC7 leaves `D8-default` FAIL-OPEN unchanged. ⚠ **One (Task 4's malformed-row item) is CONDITIONAL** — closed only if the public read stops resolving the schedule. ⛔ No AC changed; ⛔ no code touched; story stays `ready-for-dev`. | BigDev + Claude |
