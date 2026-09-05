---
baseline_commit: 9e81000b
---

<!--
⭐ BASELINE — the last governance commit before this story opens
(`governance(11b): spawned excluded from the member drive list — story E unblocked`).
It carries decisions `2026-09-04-186` … `-196`, Story 11b.10 closed, and the six-story split.
-->

# Story 11b.11: The Nominee Banking Coordinates Are WITHDRAWN From the Public Surface `[SURFACE]`

Status: done

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
| The wire is a **discriminated union on `masked`** | `sahyog-vivran.ts:205-243` | ⭐ read |
| The **masked arm DROPS `accountHolderName`** and `vpa`, keeping `accountNumberLast4` + `ifsc` + `bankName` + `branch` | same | ⭐ read |
| The public label reads **"Account holder"** | `i18n/locales/en/sahyog-vivran.json:35` (`label.account_holder`) | ⭐ read |
| The **member** donor path returns **THREE** Tier-1 values **unmasked** — `accountHolderName` · `accountNumber` · `ifsc` — plus Tier-3 `bankName` and a **`vpaPresent: boolean`**. ⛔ **THE VPA ITSELF IS NEVER SENT** (`nominee-accounts.ts:44,60`, verbatim). Gated to the member's OWN `live` pool | `contracts/contributions/nominee-accounts.ts:45-63`; `payment/handlers.ts` answers `{available:false}` with no live pool | ⭐ read |
| The donor path uses its **OWN** read — `claimDomain.getClaimNomineeBankAccountsCiphertext` (`domain/src/claim/nominee-bank-read.ts`), ⛔ **NOT** `pool/sahyog-vivran-read.ts` | `payment/handlers.ts:149` | ⭐ read |
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

⚠⛔⛔ **AND THE COPY THIS STORY SHIPS IS CALLED *WRONG* IN THREE COMMITTED PLACES — AMEND THEM, ⛔ DO
⛔ NOT LEAVE THEM STANDING.** ✅ Verified live:
- `apps/api/src/modules/public-pages/handlers.ts:648-650` — *"⚠⛔ AND `accountHolderName` IS ⛔ NOT
  LABELLED **"NOMINEE"** ANYWHERE DOWNSTREAM. 6.8's D1 removed the linkage deliberately — ⛔ no FK to
  `member_nominees`, ⛔ no rank, ⛔ no match rule. It is the ACCOUNT HOLDER."*
- `packages/contracts/src/public-pages/sahyog-vivran.ts:193-199` — the same claim, adding that
  `contracts/src/contributions/nominee-accounts.ts:18` calling it *"the NOMINEE name"* **is WRONG**.
- `deferred-work.md` **`D5-subject(i)`** — routes the contradiction with the ruling *"⭐ **the SCHEMA
  is the authority**"*, trigger *"the first story that revisits nominee-bank collection."*

⇒ ⭐ **`-190` cl.2 is Trustee-ratified and it OVERRIDES the PRESENTATION** — the label ships. ⛔ But
after this story those three passages are **actively false about the shipped page**, which is exactly
Trap 4. ⇒ **amend each to record that the Panel ruled the PUBLIC WORDING at `-190` cl.2 while 6.8 D1's
DATA linkage is unchanged** — ⛔ do ⛔ not delete them, and ⛔ do ⛔ not "resolve" `D5-subject(i)` by
adding a join or a match rule ([[project_nominee_bank_disbursement_channel]]).

⚠⛔ **AND STATE THE RESIDUAL PLAINLY, because the page now asserts it to the internet:** the account
holder **may not be the nominee** — there is ⛔ no FK, ⛔ no match rule, and per `D5-subject(ii)`
⛔ **no verifier, ⛔ no state trustee and ⛔ no correcting admin can READ this name** (the verifier
console has no bank surface; the only read-back is a **presence** view). ⇒ the ⛔ ONE field that
survives this withdrawal is both **unverified** and, today, **unverifiable** — ⛔ recorded, ⛔ not
hidden, and ⛔ **not this story's to fix** (it is a Story 6.10-family change, already routed).

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

**Given** `2026-09-04-190` cl.1 **for four of them** — the Panel named exactly `nominee_account_number`,
`nominee_ifsc`, `nominee_bank_name`, `nominee_branch` — ⭐ **and `2026-09-04-191` cl.1 for the FIFTH**
**Given** ⚠⛔ **`nominee_vpa` is ⛔ NOT NAMED IN `-190` cl.1.** It was `-190` follow-up **(i)**, and
`-191` cl.1 (separately **Trustee-ratified**) closed it: *"the VPA goes with them, and is shown to the
logged-in member so they can make the contribution."* ⇒ `-190` cl.1's own *"FOUR pairs → ONE"*
arithmetic ⛔ **does not close without `-191`** — dropping only `account_number` + `ifsc` from the
allowlist leaves **TWO**. ⛔ Do ⛔ not key the vpa deletion to `-190`.
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
**And** ⛔ every control-count statement that says **FOUR** Tier-1 pairs is corrected to **ONE**
**And** ⭐⛔ **`apps/api/src/modules/public-pages/routes.ts` IS OPENED — it carries FOUR of them**
(`:67` *"11b.3a declares **FOUR** ruled Tier-1 nominee-bank fields on this [surface]"* · `:116`
*"restored **PII-BEARING** (control 6 above)"* · `:127` *"that walk reached **FOUR DECRYPTED TIER-1
FIELDS** under `D8-default` FAIL-OPEN"* · `:286` *"the **FOUR** applicable controls"*). ⛔ An AC
obligation with ⛔ no Task line ships unmet ([[feedback_spec_edits_must_propagate_to_tasks]]) — Task 7
owns it.

### AC6 — `member > public` is satisfied STRUCTURALLY, and said so

**Given** `2026-09-04-189` cl.3 as scoped by `-195` cl.1 (a **data-class** invariant)
**Then** the story record states, in one sentence, that this story satisfies it **by lowering the
public**, ⛔ not by widening the member
**And** a test asserts the **member** donor path still returns, **unmasked**, the **THREE** Tier-1
values it actually carries — `accountHolderName`, `accountNumber`, `ifsc` — plus Tier-3 `bankName` and
`vpaPresent: true` where a VPA exists — ⛔ the regression this AC exists to prevent is a well-meaning
sweep that removes the coordinates from `contracts/contributions/nominee-accounts.ts` too, breaking the
ability to **pay a family**.

⚠⛔⛔ **AND ⛔ DO ⛔ NOT WRITE A TEST ASSERTING THE MEMBER PATH RETURNS `vpa`. IT ⛔ NEVER HAS.**
✅ Verified: `NomineeBankAccountView` (`nominee-accounts.ts:45-63`) is `.strict()` and declares
`vpaPresent: z.boolean()`, doc-blocked *"⛔ the VPA itself is **NEVER sent**"*; the plaintext VPA is
consumed **server-side** into the UPI intent (`payment/handlers.ts:150-172`, fail-soft to `null`).
⇒ ⭐ **`-191` cl.1's *"shown to the member"* is ALREADY SATISFIED by the UPI-intent path** — `-191`'s
own open follow-up says so verbatim: *"clause 1 is a **confirmation**, and the build task is to ⛔ NOT
regress it while removing the public arm."* ⛔ **Adding `vpa` to the member wire would be a NEW Tier-1
exposure ⛔ nobody ruled on** — it is ⛔ not this story's to add, and ⛔ not a way to satisfy this AC.

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
  keeps returning its **THREE Tier-1 values unmasked** — `accountHolderName`, `accountNumber`, `ifsc`
  — plus `bankName` and `vpaPresent`, gated to the member's own `live` pool. ⭐ A member must be able to
  **pay the family** — a masked account number ⛔ cannot be transferred to. ⚠ ⛔ **The VPA string itself
  has ⛔ NEVER been on that wire** (`vpaPresent: boolean`; the plaintext is consumed server-side into the
  UPI intent) ⇒ ⛔ do ⛔ not "restore" it here.
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

- [x] **Task 0 — GOVERNANCE FIRST** (AC0)
  - [x] Annotate `epics.md` at the FR-74 block: this story implements `-190` cl.1–2 and is story A of
        the `-195` cl.3 split. ⛔ Do ⛔ not edit FR-74's clause text — it already carries the
        2026-09-04 re-annotation; **append**, do not rewrite.
  - [x] Flip `sprint-status.yaml` `11b-11-…` → `in-progress`, with a ledger entry. ⚠ ✅ Verified live:
        the row (`:15535`) already reads **`ready-for-dev`**, ⛔ not `backlog` — the create-story run
        already advanced it. ⇒ the flip is `ready-for-dev` → `in-progress`.
  - [x] Commit both with a `governance:` prefix. ⛔ No code in this commit.
- [x] **Task 1 — RULE D1** (blocked Task 2) — ✅ **RULED (b) by BigDev, 2026-09-04: collapse the wire,
      keep the machinery.** ⇒ Task 2 is unblocked; ⛔ nothing else in this story changes.
- [x] **Task 2 — The contract** (AC1, AC2, AC3; shape per D1)
  - [x] `packages/contracts/src/public-pages/sahyog-vivran.ts` — **per D1(b): COLLAPSE
        `PublicSahyogVivranNomineeAccount` from a `z.discriminatedUnion('masked', […])` to a SINGLE
        `.strict()` object carrying `accountHolderName` (+ `rank`).** ⛔ Remove `accountNumber`,
        `accountNumberLast4`, `ifsc`, `vpa`, `bankName`, `branch` **and the `masked` literal itself**.
        ⭐ Keys **ABSENT**, ⛔ never `null`.
  - [x] Leave the doc-block D1 requires at the collapse site: what the union was, why both arms became
        identical, and that the machinery still lives in
        `packages/domain/src/claim/nominee-bank-masking*.ts`. ⛔ Without it the next reader concludes
        masking was deleted.
  - [x] ⬅️ **INHERITED (11b.3a 3rd pass)** — the doc-block also states whether the collapsed shape
        still carries **ciphertext it no longer uses**. The old read returned `masked: boolean`
        **alongside** `accountNumberCiphertext` / `accountHolderNameCiphertext` / `ifscCiphertext` /
        `vpaCiphertext`, with ⛔ nothing in the TYPE changing when `masked === true` — the guarantee
        was a downstream promise, ⛔ not a structural property. D1's collapse closes it; ⛔ say so, so
        the next reader does ⛔ not re-introduce a flag beside the payload it is supposed to govern.
  - [x] ⛔ Remove the masking **CALL** from the public read path (Task 4) — ⛔ never compute a verdict
        and discard it. ⭐ Keep the **function**, the schedule, the key and every test (AC4).
  - [x] `matrix.ts:426-429` — four `RULED_TIER1_PUBLIC_EXCEPTIONS` entries → **one**, re-keyed
        `'2026-09-04-190 cl.2'`.
  - [x] Amend the file's doc-blocks: the *"four ruled pairs"* prose, and cl.10(e)'s **reading** per
        Trap 2. ⛔ Amend, ⛔ do not delete — name the previous claim.
  - [x] ⭐⛔⛔ **`-191` cl.5 ORDERED A NAMED CORRECTION IN THIS FILE, AND IT SURVIVES THE COLLAPSE.**
        ✅ Verified live. `sahyog-vivran.ts:201-202` (the **shared header** above the union, ⛔ NOT the
        field doc-block) reads *"Two causes: `vpa` is null for every nominee today (**Story 8.4**
        shipped the resolver seam ABSENT)"*. ⛔ **The REASON is wrong** — `-191` cl.5, verbatim:
        *"8.4 deferred it, ⭐ **8.13 built it**. ⇒ VPA is null for a nominee who ⛔ did not fill in an
        optional field, and will ⛔ **never** be universally populated — a **permanent** property, ⛔ not
        a pending one."* ⚠ Its twin at `:219` dies with the field; **`:201-202` does ⛔ NOT** — the
        header describes the whole shape and stays. ⇒ correct it here, ⛔ or it outlives the field it
        describes (Trap 4) in the file this task already opens.
  - [x] ⚠ Same header: *"EVERY VALUE IS NULLABLE"* and the two-causes framing describe a shape that no
        longer exists after the collapse. ⭐ Restate for the collapsed shape; ⛔ do ⛔ not leave it.
- [x] **Task 3 — The matrix YAML** (AC1)
  - [x] `public-vs-private-matrix.yaml` — drop the five field declarations from `sahyog-vivran`;
        keep `nominee_account_holder_name`.
  - [x] Amend the surface's rider to record the supersession and point at `-190`. ⛔ Trap 1.
  - [x] ⬅️⭐⭐ **INHERITED (11b.3a 3rd pass) — THIS FILE CARRIES THREE CLAIMS THAT ARE ALREADY FALSE,
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
- [x] **Task 4 — The domain read** (AC1)
  - [x] `packages/domain/src/pool/sahyog-vivran-read.ts` — stop selecting/decrypting the five for this
        surface.
  - [x] ⭐✅ **THE SHARED-RESOLVER QUESTION IS ALREADY ANSWERED — ⛔ do ⛔ not re-investigate it, and
        ⛔ do ⛔ not draw the wrong conclusion from it.** Verified live: the 9.9 donor path reads through
        `claimDomain.getClaimNomineeBankAccountsCiphertext` (`domain/src/claim/nominee-bank-read.ts`,
        called at `payment/handlers.ts:149`) — a **separate** read. ⇒ ⛔ **NOTHING here is shared with
        9.9**, so narrowing this file ⛔ cannot strip the member's payment coordinates.
        ⚠⛔ **BUT "NOT SHARED" CUTS BOTH WAYS: it means the two defects below are ⛔ NOT closed on the
        member path by your deletion — they must be fixed THERE, separately (Task 8).**
  - [x] ⬅️ **INHERITED (11b.3a 3rd pass) — dropping `bankName` here CLOSES a latent 500; confirm it
        rather than assume it.** `sahyog-vivran-read.ts:586` passes `bankName` through **raw** while
        `branch` on the **next line** is `.trim() || null`-guarded. The column is `text NOT NULL` with
        ⛔ no non-empty CHECK, is copied verbatim from the IFSC provider port (`bankName: string`, no
        minimum), and `''` fails `z.string().min(1)` in **both** arms ⇒ serialization failure ⇒ **500**
        ⇒ outage page for every visitor. Latent only because today's sole adapter is an in-memory
        fixture map. ⭐ AC1's deletion closes it **for the public surface** — ⚠⛔ **AND IT IS
        CONFIRMED LIVE ON THE MEMBER PATH: `contracts/src/contributions/nominee-accounts.ts:51` is
        `bankName: z.string().min(1).max(200)` — the IDENTICAL constraint `''` fails.** ⇒ ⛔ not a
        "verify whether"; it is a **fix**, at Task 8.
  - [x] ⚠ **READ THE COUNTER-POSITION BEFORE YOU TOUCH IT, ⛔ do ⛔ not rediscover it as undecided.**
        `sahyog-vivran-read.ts:~596` already argues the opposite in a committed comment: *"(The
        `bank_name` column is `NOT NULL` and has no such nullable projection — a truly empty
        `bank_name` is a **data-integrity fault**.)"* ⭐ That is a real position and it is why the guard
        was never added. ⛔ It does ⛔ not survive contact with `z.string().min(1)` at the response
        boundary: a data-integrity fault that **500s a whole page** is still an outage. ⇒ if you fix
        it on the member path, **name this comment and amend it** rather than silently contradicting
        it.
  - [x] ⬅️⚠⛔ **INHERITED (11b.3a 3rd pass) — CONDITIONAL, and ⛔ DO ⛔ NOT ASSUME IT IS CLOSED.** One
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
- [x] **Task 5 — The API handler** (AC1)
  - [x] `apps/api/src/modules/public-pages/handlers.ts` — drop the five from the response mapping,
        including the `soft(account.vpaCiphertext, 'vpa')` decrypt at `:712`.
  - [x] ⬅️ **INHERITED (11b.3a 3rd pass) — the decrypt fan-out is UNCONDITIONAL on the drive's
        OUTCOME.** The map over `drive.nomineeBank.accounts` has ⛔ no outcome predicate, and the ⛔ only
        suppressor on the path is the **time-since-close** masking verdict. The same response carries
        `appealReversal` and `fundingOutcome`, so a **DENIED** claim — or one whose approval was
        **REVERSED ON APPEAL** — still published the holder's name and full account number
        indefinitely under FAIL-OPEN. ⭐ `-160` cl.10(a) authorises publication *"during an active
        campaign"*; ⛔ nothing checked the campaign was **legitimate**, only that it was **recent**.
        ⇒ AC1's deletion closes it **for the public surface**; ⚠ the member path is Task 8.
- [x] **Task 6 — The render layer + copy** (AC2)
  - [x] `apps/public/src/lib/sahyog-vivran-render.ts`, `surface-fields.ts`,
        `pages/sahyog-vivran/[driveToken].astro` — remove the five rows from the bank block.
  - [x] ⭐⛔ **THE BLOCK'S OWN HEADING AND GROUP LABEL DESCRIBE WHAT YOU ARE DELETING.** ✅ Verified
        live in `i18n/locales/en/sahyog-vivran.json`: `bank.title` = *"**Where the money goes**"*
        (`:31`) and `bank.group_label` = *"**Bank details for this drive**"* (`:32`). ⇒ after AC1 a
        section headed *"Bank details for this drive"* contains **one name and ⛔ no bank details**,
        and *"where the money goes"* names a destination the page no longer shows. ⛔ Task 6 removes
        **rows**; these are the **frame**. ⭐ Re-word both (⛔ both locales — `t()` THROWS on a missing
        key), or state why they still hold. **Same class as the `equal_destinations` item below** —
        ⛔ do ⛔ not fix one and leave the other.
  - [x] ⚠ Retire `bank.masked_note` (*"Only part of the account number is shown here…"*) and
        `value.account_ending_in` (*"Account ending in {last4}"*) — ⛔ both describe an
        account-number projection that ⛔ no longer exists on this surface. ⭐ Grep first; ⛔ delete
        ⛔ nothing another surface consumes.
  - [x] ⭐ **D1's collapse kills `isMasked` as a RENDER concept, ⛔ not just as a wire key.**
        `surface-fields.ts:570` maps `isMasked: null` with the comment *"Selects the masked vs. full
        copy block"*, and `SahyogVivranNomineeAccountRow` carries the field. ⇒ with ⛔ no `masked` on
        the wire there is ⛔ nothing to select between — remove the field and its mapping.
        ⚠ **AND the doc-block at `surface-fields.ts:486-490`** (*"REDUCED at the `apps/api` boundary …
        by the time a value reaches this shape the projection is already the ruled one"*) describes a
        masking step this surface no longer performs ⇒ it is squarely inside **AC4's** *"every
        doc-block … is amended"*. ⛔ Amend, ⛔ do not delete.
  - [x] ⬅️⭐⭐ **INHERITED (11b.3a 3rd pass, G3) — THE PER-ACCOUNT `aria-label` ANNOUNCES AN ORDINAL THE
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
  - [x] ⬅️ **INHERITED (11b.3a 3rd pass, G3) — the "either account can be used" copy renders when the
        page shows exactly ONE account, and after your change it sits beside two NAMES and ⛔ no
        payment coordinates at all.** `bank.equal_destinations` is standing copy rendered whenever the
        block renders, and a one-element array is **explicitly legal** in the SSR validator ⇒ a
        visitor on a claim where only account #1 was collected reads *"Either account can be used.
        Neither one is preferred over the other."* beside **one** card, on the page whose whole
        purpose is that nothing about the money is hidden, and reasonably infers **a second account is
        being withheld**. ✅ Length 1 is ⛔ never exercised (the suite covers `[]` and a three-account
        rejection only). ⇒ decide here whether the sentence still holds once the coordinates are gone.
  - [x] ⬅️ **INHERITED (11b.3a 3rd pass, G3) — the masked value restates its own label; closed by YOUR
        deletion, but ⛔ check the member path does not inherit the shape.** The `<dt>` reads *"Account
        number"* and the `<dd>` renders *"Account ending in 1234"* ⇒ announced as *"Account number:
        Account ending in 1234"*; Hindi is the same shape. ⭐ The wrapper exists for a **good** reason
        (AC4 requires the masked value be announced as ONE coherent field, ⛔ never digit-by-digit) —
        the defect is achieving it **by duplication**. ⇒ the account-number row goes at Task 6, so this
        dies with it; recorded because **AC6 retains the field on the member donor path**.
  - [x] `i18n/locales/{en,hi}/sahyog-vivran.json` — `label.account_holder` → **"Nominee Name"** /
        the Hindi equivalent. ⚠ `t()` **THROWS** on a missing key — change both locales in the same
        commit. ⭐ Retire `label.account_number` / `label.ifsc` / `label.vpa` / `label.bank_name` /
        `label.branch` **only if** no other surface consumes them — ⛔ grep first.
- [x] **Task 7 — The identity gates** (AC5)
  - [x] `apps/public/tests/integration/public-pages/scrape-test.spec.ts:1218-1235` — the 16-entry set
        → **11** (drop `nominee_account_number`, `nominee_bank_name`, `nominee_branch`,
        `nominee_ifsc`, `nominee_vpa`; ⭐ **keep `nominee_account_holder_name`**); amend the
        "TEN → SIXTEEN" comment to record the third move.
  - [x] ⚠ **AND THE TEST'S OWN NAME.** It reads *"the snapshot field set … is EXACTLY the **sixteen**
        classified fields"*. ⛔ A test titled *sixteen* that asserts eleven is Trap 4 inside the gate
        that exists to catch Trap 4.
  - [x] ⭐ `apps/api/tests/integration/login-wall.spec.ts` (⚠⛔ **`apps/api`, ⛔ NOT `apps/public`** —
        it does ⛔ not sit beside `scrape-test.spec.ts`; the entry is at `:236-260`) — amend the
        allowlist entry's control list and its PII-bearing characterisation. ⛔ Amend, ⛔ do not revert
        to pre-11b.3a wording, and ⛔ do ⛔ not touch its `-186` / `s-maxage=300` / `limits.search`
        paragraphs (AC7).
  - [x] ⭐⛔⛔ **`apps/api/src/modules/public-pages/routes.ts` — AC5's fourth file, and the one the
        control-count findings are actually about.** ✅ Verified live, **four** statements move:
        `:67` *"11b.3a declares **FOUR** ruled Tier-1 nominee-bank fields"* → **ONE** · `:116`
        *"restored **PII-BEARING** (control 6 above)"* → amend per AC5's *"⛔ no longer PII-bearing in
        the nominee-bank sense"*, ⛔ **without** reverting the `deceased_member_name` half · `:127`
        *"that walk reached **FOUR DECRYPTED TIER-1 FIELDS** under `D8-default` FAIL-OPEN"* → **ONE**,
        ⚠ and it is ⛔ no longer *decrypted under FAIL-OPEN* on a masking verdict this read no longer
        computes · `:286` *"the **FOUR** applicable controls"* → the honest recount below.
        ⚠ `:13`'s *"FIVE, matching `login-wall.spec.ts`'s allowlist entry exactly"* is a **different**
        list (the allowlist's controls, ⛔ not the Tier-1 pairs) — ⛔ check before touching it.
  - [x] ⬅️⭐ **INHERITED (11b.3a 3rd pass) — THERE IS A THIRD DOCUMENT STATING THE CONTROL COUNT, AND
        AC5 DOES ⛔ NOT NAME IT.** `public-vs-private-matrix.yaml:758-760` says `noindex` is *"control
        **3** of the **THREE** this route states"* — a different **count** AND a different **ordinal**
        from `routes.ts` (which says four, with `X-Robots-Tag` as control **4**). ⇒ AC5's *"every
        control-count statement is corrected"* reaches this line too.
  - [x] ⬅️⚠ **INHERITED — and make the corrected count HONEST about which of them are controls.**
        The *"FOUR applicable controls"* overcounted: control **4** is `X-Robots-Tag` (a crawler
        **hint** — archivers and scrapers ignore it), control **5** is *"the absence of any DETAIL or
        EXPORT affordance"* (irrelevant to a direct GET) and control **6** is the decrypt itself
        ⇒ netting out, **ONE** control stood between an anonymous caller and Tier-1 data.
        ⚠ **The enumeration half is CLOSED** — `-184` (B) ruled the address unguessable and 11b-10
        shipped the opaque `publicToken` — ⛔ do ⛔ not re-raise it. ⭐ What survives is that counting
        three non-controls as controls **manufactures a false defence-in-depth** on the document a
        future reviewer will trust.
  - [x] ⬅️ **INHERITED — mechanize the count, ⛔ or record that you chose not to.** It is prose in
        **three** places with ⛔ no constant, ⛔ no test and ⛔ no lint rule; it is prevented solely by a
        reviewer counting bullet points by eye, **which is exactly how it failed the first time**.
        ⭐ Cheapest fix: one exported `SAHYOG_VIVRAN_APPLICABLE_CONTROLS` all three import, plus a
        length assertion.
  - [x] `packages/contracts/tests/public-pages-sahyog-vivran.test.ts` — update shape assertions.
- [x] **Task 8 — The tests that prove it** (AC1, AC3, AC6)
  - [x] Live-DB: a public drive with real ciphertext returns ⛔ **no** account number / IFSC / VPA /
        bank / branch key at all.
  - [x] Live-DB: a **MASKED** drive still returns `accountHolderName` (AC3's regression guard).
  - [x] Live-DB: the **member** donor path still returns, **unmasked**, the **THREE** Tier-1 values it
        actually carries — `accountHolderName`, `accountNumber`, `ifsc` — plus `bankName` and
        `vpaPresent` (AC6's regression guard). ⛔ **⛔ NOT "all four": `NomineeBankAccountView` is
        `.strict()` and has ⛔ NO `vpa` key — *"the VPA itself is NEVER sent"*
        (`nominee-accounts.ts:44,60`).** ⛔ Do ⛔ not add one to make a test pass.
  - [x] ⬅️⚠ **INHERITED (11b.3a 3rd pass) — AC6 KEEPS ALL FOUR VALUES ON THE DONOR PATH, SO VERIFY IT
        DOES ⛔ NOT INHERIT THE TWO DEFECTS AC1 CLOSES BY DELETION.** ⭐ Deleting a field from the
        public surface does ⛔ **not** fix it on a path that retains the field. **(i)** the unguarded
        `bankName` pass-through (`''` ⇒ `min(1)` parse failure ⇒ 500) — Task 4; **(ii)** the
        **unconditional** projection with ⛔ no outcome predicate — Task 5.
        ⭐⛔ **✅ RESOLVED, AND THE ANSWER IS THE HARDER ONE: THE DONOR PATH SHARES ⛔ NEITHER CODE
        PATH** (`claim/nominee-bank-read.ts` via `payment/handlers.ts:149`, ⛔ not
        `pool/sahyog-vivran-read.ts`) ⇒ ⛔ **your public deletion closes ⛔ NOTHING there.** And **(i)
        is CONFIRMED live on it**: `nominee-accounts.ts:51` is `bankName: z.string().min(1).max(200)`,
        the identical constraint an `''` fails ⇒ a real 500 on the member's payment screen the day a
        live IFSC adapter lands. ⇒ ⭐ **guard `bankName` on the member read** (mirror
        `sahyog-vivran-read.ts`'s `branch` treatment, and amend that file's *"data-integrity fault"*
        comment per Task 4), and **(ii)** decide explicitly whether a **denied** or **appeal-reversed**
        claim should still hand a member payment coordinates — ⛔ record the answer either way.
        ⛔ Do ⛔ not close these on the strength of the public deletion alone.
  - [x] ⭐ **Execute them.** `twt-test-pg` on `:5433`; ⛔ *"written but not run"* is ⛔ not attested —
        that exact gap shipped a red spec at 11b.10.
- [x] **Task 9 — Masking status prose** (AC4)
  - [x] Amend every doc-block that describes masking as governing a public disclosure to state it has
        ⛔ no public consumer. ⛔ Delete ⛔ nothing.
  - [x] ⬅️⛔⛔ **INHERITED (11b.3a 3rd pass) — RECORD THREE REACTIVATION PRECONDITIONS ALONGSIDE THE
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

### Review Findings

- [x] [Review][Patch] Per-account `aria-label` was identical on both nominee account groups — `apps/public/src/pages/sahyog-vivran/[driveToken].astro`'s two mapped `<section role="group">` blocks shared the exact same static label, so a screen-reader user got two indistinguishable "group" landmarks even though sighted users see two separate boxes. **First attempt (2026-09-05) was ITSELF BUGGY, caught by a second review pass:** `aria-labelledby` was pointed at the `<dt>` — the static field LABEL ("Nominee Name"), identical for every account — not the `<dd>` holding the actual value, so the computed accessible name never differed and the defect was unfixed. **Corrected (2026-09-05, second pass):** dropped the id/`aria-labelledby` indirection; `aria-label` now directly interpolates the recorded name (`"Nominee Name: <value>"`) when present, generic fallback only when the name itself is `null`. When the underlying name is genuinely identical (or both decrypts fail), the two groups are still indistinguishable — but that now matches exactly what a sighted user sees, never less. [`apps/public/src/pages/sahyog-vivran/[driveToken].astro:487-508`]
- [x] [Review][Patch] `bankEqualNominees` copy ("recorded equally") was gated on `model.nomineeAccounts.length > 1` (raw array length) rather than on how many accounts actually render a visible name. Fixed: gate now filters on `nomineeAccountHolderName !== null` before counting, so the copy never claims two names are recorded equally when only one (or zero) actually renders. [`apps/public/src/pages/sahyog-vivran/[driveToken].astro:487-491`]
- [x] [Review][Patch] Stale cross-file documentation described the admin masking-schedule change as reaching the public Sahyog Vivran read via `resolveEffectiveNomineeBankMasking`, and warned the cached projection "may be a full account number" — both false since this story's domain read no longer calls that resolver and the coordinate fields are structurally removed from the public wire. Fixed at both sites the story's "amended at seven sites" claim (AC4) missed: the OpenAPI description (regenerated into `openapi/v1.yaml`, verified deterministic) and the admin masking-schedule integration test's header/rationale comments — both now state the schedule has NO PUBLIC CONSUMER, dormant per `2026-09-04-190` cl.4. Verified: `admin.spec.ts` 9/9 green. [`packages/contracts/scripts/emit-openapi.ts:1937-1994`, `apps/api/tests/integration/nominee-bank-masking/admin.spec.ts:13-21,184-189`]
- [x] [Review][Patch] Stray backtick instead of an apostrophe in the ordinal-6 control `summary` string: "11b.3b\`s deceased-member exposure". Fixed. [`apps/api/src/modules/public-pages/sahyog-vivran-controls.ts:100`]
- [x] [Review][Patch] Comment named the wrong function — "`isNomineeBankMasking`" — where the real (and only ever) exported identifier is `isNomineeBankMasked`. Fixed. [`packages/domain/src/pool/sahyog-vivran-read.ts:98`]
- [x] [Review][Patch] `WITHDRAWN_VALUES` in the leak-regression test included the bare 4-digit substring `'6789'`, checked via `expect(res.body).not.toContain(forbidden)` against the full raw JSON response body — a coincidental unrelated 4-digit run elsewhere in the body (an id, a timestamp fragment) would have flipped this into a false failure. Fixed: quoted to `'"6789"'`, pinning the check to the value appearing as its own JSON string rather than any bare digit run. Verified: `sahyog-vivran.spec.ts` 28/28 green. [`apps/api/tests/integration/public-pages/sahyog-vivran.spec.ts:879-889`]
- [x] [Review][Defer] The public decrypt/render of the surviving nominee name is still unconditional on the claim's outcome — a **denied** claim, or one **reversed on appeal**, on a cycle that stays `live` keeps publishing the holder's name indefinitely under `D8-default` FAIL-OPEN. [`apps/api/src/modules/public-pages/handlers.ts:~205-214`] — deferred, pre-existing: honestly disclosed and ruled by this story itself as "recorded, not invented" (no suppression-by-outcome rule has been ruled; narrowing it would be a new rule nobody has made). Not introduced or worsened by this diff, which only narrows exposure.

#### SECOND PASS (2026-09-05) — re-review of the first pass's own patches

- [x] [Review][Patch] **The first pass's own `aria-labelledby` fix was buggy** — see the corrected first bullet above for the full record; captured here as its own line because it was the headline finding of this pass.
- [x] [Review][Patch] Two comments (`apps/api/src/modules/payment/handlers.ts`, `apps/api/tests/integration/payment/nominee-accounts.spec.ts`) justified a trim fix by citing "the same treatment `branch` already gets in `pool/sahyog-vivran-read.ts`" — that trimming was deleted by THIS story's own withdrawal of `branch` from the public projection, so the citation was false the moment the commit that introduced it landed. Fixed: citation removed at both sites. [`apps/api/src/modules/payment/handlers.ts:368-374`, `apps/api/tests/integration/payment/nominee-accounts.spec.ts:323-326`]
- [x] [Review][Patch] Trustee/operator-facing admin console copy (`apps/admin/src/modules/nominee-bank-masking/i18n-en.ts`) told a Trust Admin things like "the complete bank details stay visible on the public pages" and "only the last four digits, the bank, the branch and the IFSC code remain visible" — both false since AC1 withdrew those fields structurally, in every state of this setting. This is the most consequential instance of Trap 4 ("prose that outlives the thing it describes") in the whole story: it is Trustee-facing, not a comment, and the story's own "amended at seven sites" claim (AC4) missed it entirely. Fixed: `header.subtitle` and all three `status.*` strings now state plainly that this setting has no visible effect on the public page as of Story 11b.11. Verified against the terminology gate (`nominee-bank-masking-terminology.test.ts`, 9/9 green — no banned immediacy term introduced, the `s-maxage=300` disclosure kept present in the directory). [`apps/admin/src/modules/nominee-bank-masking/i18n-en.ts:24-50`]
- [x] [Review][Patch] Same stale claim, lower severity (dev-facing comments, not rendered copy), at three more sites: `apps/api/src/modules/nominee-bank-masking/handlers.ts:161-165`, `apps/admin/src/modules/nominee-bank-masking/MaskingScheduleForm.tsx:9-11`, `apps/admin/src/modules/nominee-bank-masking/MaskingSchedulePage.tsx:136-140`, `apps/admin/src/api/client.ts:906-911`. Fixed at all four.
- [x] [Review][Patch] `_bmad-output/implementation-artifacts/deferred-work.md`'s `setNomineeBankMaskingSchedule` concurrency item still said a no-open-head Pariwar "publishes a full account number" under FAIL-OPEN — now structurally impossible on this surface. Fixed: reworded to "resolves as unmasked" with a note that the account-number consequence no longer applies here; the underlying serialization gap itself is unchanged and still deferred. [`_bmad-output/implementation-artifacts/deferred-work.md`]
- [x] [Review][Patch] `packages/domain/src/claim/nominee-bank-masking.ts`'s status banner claimed `sahyog-vivran-read.ts` is `isNomineeBankMasked`'s "ONLY caller" — verified false in the OPPOSITE direction: `isNomineeBankMasked(` has ZERO call sites anywhere in the repository now (not a different caller — no caller at all). Fixed: reworded to "ONLY PRODUCTION caller" (historical) with an explicit note that there is currently no caller anywhere. [`packages/domain/src/claim/nominee-bank-masking.ts:34-39`]
- [x] [Review][Dismiss] Import order in `login-wall.spec.ts` (re-raised by the blind layer, which has no repo access each run) — re-verified: no `import/order` lint rule is configured; `eslint` passes clean.
- [x] [Review][Dismiss] Claimed staleness of the generated OpenAPI schema for the collapsed nominee-account shape — verified the `/public-pages/sahyog-vivran/{driveToken}` route was never registered in `emit-openapi.ts` at all (only `member-directory` is under `public-pages`); there is nothing to regenerate for an endpoint that was never documented there.
- [x] [Review][Dismiss] Claimed flakiness of `expect(SAHYOG_VIVRAN_HTML).not.toMatch(/\d{6,}/)` via a `randomUUID().slice(0,6)`-derived `canonicalIdentifier` — verified `SAHYOG_VIVRAN_HTML` in `apps/public/tests/integration/public-pages/scrape-test.spec.ts` is built from a fixed test fixture (`poolCanonicalIdentifier: 'P-2026-09-003'`, static account holder names), not from `randomUUID()`; the claim conflated it with a different file's fixture.
- [ ] [Review][Defer] An empty per-account `<section role="group">` still renders (with a generic fallback `aria-label`) when a decrypt fails and `nomineeAccountHolderName` is `null` — pre-existing page shape (the wrapper was never conditionally rendered on content, only the inner `<dl>` row was), not introduced by either review pass. Matches the story's own accepted "the cell is omitted entirely" design for the null case. Low severity; not actioned this round.
- [ ] [Review][Defer] `nominee-accounts.spec.ts`'s `seedLivePoolMemberWithNomineeAccounts` helper only overrides account #1's seed fields; the AC6 test's "`vpaPresent` must differ between accounts" claim depends on account #2's un-shown, pre-existing default carrying no VPA, asserted implicitly rather than in the helper itself. Pre-existing test design, low severity; not actioned this round.

All six second-pass patches verified: `typecheck`+`lint` clean across 36 packages (incl. `@twt/admin`), `openapi` regeneration deterministic, `nominee-bank-masking-terminology.test.ts` 9/9, `admin.spec.ts` 9/9, `sahyog-vivran.spec.ts` 28/28, `nominee-accounts.spec.ts` 3/3, public-app suites (`scrape-test.spec.ts` + client/render tests + domain `nominee-bank-masking.test.ts`) 119/119.

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
- `packages/contracts/src/public-pages/sahyog-vivran.ts:205-243` — the discriminated union
- `apps/public/tests/integration/public-pages/scrape-test.spec.ts:1218-1235` — the identity assertion
- `packages/i18n/locales/en/sahyog-vivran.json:31-42` — the bank-block labels, **title and group label**
- `apps/api/tests/integration/login-wall.spec.ts:236-260` — the allowlist entry (⚠ `apps/api`, ⛔ not `apps/public`)
- `apps/api/src/modules/public-pages/routes.ts:67, :116, :127, :286` — AC5's four control-count statements
- `packages/contracts/src/contributions/nominee-accounts.ts:45-63` — the member donor shape (⛔ `vpaPresent`, ⛔ no `vpa`)
- `packages/domain/src/claim/nominee-bank-read.ts` — the donor path's OWN read; ⛔ shares nothing with `sahyog-vivran-read.ts`
- `deferred-work.md` `D5-subject(i)`/`(ii)` — the account-holder ≠ nominee routing, and the un-mechanized approver duty

## Dev Agent Record

### Agent Model Used

Claude Opus 5 (`claude-opus-5`) — `bmad-dev-story`, 2026-09-05.

### Debug Log References

- `pnpm ci:local` with `DATABASE_URL` pointed at `twt-test-pg` (`:5433`) — **34/34 green**, including
  the live-DB `integration-tests` job. Run twice end-to-end; the second run is the attested one.
- ⚠ The **first** full run failed **2 jobs**, and both are recorded rather than glossed:
  - `sahyog-vivran-financial-truth` — its **SCOPE SAFEGUARD** fired on the new
    `apps/api/src/modules/public-pages/sahyog-vivran-controls.ts`. ⭐ That is the gate working; the
    file was added to `SCAN_FILES` with `renderPath: false` and an explicit note that this is a
    **scope declaration, ⛔ not a coverage claim** ([[feedback_gate_scope_semantic_coverage]]).
  - `test (unit)` — did ⛔ **not** reproduce on a clean re-run and passed on every subsequent
    invocation. ⛔ Recorded as **un-diagnosed**, ⛔ not claimed fixed
    ([[project_ci_local_concurrency_oversubscription]], [[project_ci_local_double_run_pollution]]).
- Targeted live-DB runs during development:
  `apps/api/tests/integration/public-pages/sahyog-vivran.spec.ts` (28 pass) ·
  `apps/api/tests/integration/payment/nominee-accounts.spec.ts` (3 pass) ·
  `apps/public` full suite (458 pass) · `packages/contracts` full suite (1100 pass).
- ⭐ The gates FAILED FIRST, as the Dev Notes predicted: `apps/public`'s typecheck broke on the
  collapsed union before any test was touched, and `scrape-test.spec.ts`'s identity assertion went red
  on the field removal. ⛔ Neither was "fixed" by loosening an assertion.

### Completion Notes List

**AC0 — governance first.** `epics.md` annotated (story **A** of the `2026-09-04-195` cl.3 six-story
split; why it exists; ships first and alone; what it supersedes; the retained-but-consumerless masking
machinery; what it does not touch) and `sprint-status.yaml` flipped `ready-for-dev` → `in-progress`
with a ledger entry, in commit `4ee115c6`, prefixed `governance:`, with ⛔ **no code**
([[feedback_governance_commits_precede_implementation]]).

**AC1 — the five coordinates are gone.** Removed at **every** layer, ⛔ not just the render: the
contract (`PublicSahyogVivranNomineeAccount`), the `RULED_TIER1_PUBLIC_EXCEPTIONS` allowlist
(4 → 1, re-keyed `2026-09-04-190 cl.2`), the matrix YAML (five field declarations dropped), the
domain read's **projection**, the API decrypt fan-out, the render model, the SSR validator and the
page. ⭐ Keys are **ABSENT**, ⛔ never `null` — asserted against the RAW serialized body as well as the
parsed fields.
⚠⛔ **The shared row read was ⛔ NOT narrowed, deliberately.**
`getClaimNomineeBankAccountsCiphertext` also serves the 9.9 donor path; narrowing it would have
stripped the member's payment coordinates. The withdrawal is a **projection** taken on this surface's
own boundary — the Dev Notes' *"prefer a separate projection"* guidance, followed.

**AC2 — the name stays, relabelled.** `label.account_holder` → **"Nominee Name"** / **"नामिती का
नाम"**. ⭐ The i18n KEY is deliberately unchanged: the key names the **DATA** (6.8 D1 — it is the
account holder), the value is the ruled **PRESENTATION**, and that is exactly the line `-190` cl.2
draws. Field id, matrix key, wire key and column are untouched (Trap 3).

**AC3 — the masked arm retains the name.** ⭐ Satisfied **structurally** by D1(b)'s collapse, and
pinned by a live-DB test that drives `after_days: 0` on a `closed` drive — the configuration that
would once have emptied the block — and asserts the name is present.

**AC4 — masking retained, status stated.** ⛔ Nothing deleted: `isNomineeBankMasked`,
`resolveEffectiveNomineeBankMasking`, `DRIVE_MASKING_FROM`, `maskAccountNumberLast4`, the schedule
table, its permission key, its admin surface and all three of its own test files survive untouched.
⭐ The **"⛔ NO PUBLIC CONSUMER"** status is recorded at **seven** sites, and the **three REACTIVATION
PRECONDITIONS** live on the machinery itself (`nominee-bank-masking.ts`), ⛔ not only in
`deferred-work.md`, so whoever wakes it inherits them.

**AC5 — the gates moved loudly, and the count is MECHANIZED.** Identity set **16 → 11** (and the test
title with it); the matrix-wide exception allowlist **6 → 3**; `login-wall.spec.ts` **amended, ⛔ not
reverted**. ⭐⭐ The control count is now `SAHYOG_VIVRAN_APPLICABLE_CONTROLS`, one exported constant
replacing prose in three documents **that had drifted to three different answers** — `routes.ts` said
**FIVE** in its header and **FOUR** at the route site, and the matrix YAML said `noindex` was *"control
3 of the THREE"*, a different count **and** a different ordinal. `login-wall.spec.ts` asserts its
length **and** its composition, and `routes.ts` **re-exports** it so the binding is real rather than a
comment that can rot. ⚠ The recount is honest: of five entries only **TWO** are controls — `noindex`
is a crawler hint, *"no detail/export affordance"* is irrelevant to a direct GET, and the Tier-1
decrypt is the thing being **defended**.

**AC6 — `member > public`, structurally.** ⭐ Satisfied by **LOWERING THE PUBLIC**, ⛔ never by widening
the member: ⛔ no member surface gained a field. A live-DB regression guard asserts the donor path
still returns the **THREE** Tier-1 values unmasked plus `bankName` and `vpaPresent`, with a
`vpaPresent: true`/`false` pair so the assertion ⛔ cannot pass vacuously, and asserts the **VPA
string is ⛔ not on that wire** — it never has been.

**AC7 — nothing else moved.** ⛔ `limits.search`, ⛔ `D8-default` FAIL-OPEN, ⛔ the public token, ⛔ the
index, ⛔ the stage vocabulary, ⛔ the meter, ⛔ the deceased-name basis, ⛔ every member surface.

#### ⬅️ The eight INHERITED findings, dispositioned individually

- ✅ **CLOSED BY DELETION** (public surface): the unguarded `bankName` 500 · the `masked: boolean`
  returned beside complete ciphertext · the outcome-unconditional decrypt fan-out · **and the
  CONDITIONAL one** — the malformed schedule row that threw a bare `Error` inside the read's
  `Promise.all` and darkened **every** Sahyog Vivran page in a tenant. ⭐ The public read no longer
  resolves the schedule at all, so the unauthenticated path can ⛔ not reach it. ⚠⛔ Its **admin-side
  twin is ⛔ NOT closed** and stays on 11b.3a — stated at the deletion site.
- ✅ **CLOSED BY [EDIT]** — the FR-74 **Aadhaar collision**. `-190` cl.1 removes the 12-digit account
  number ⇒ ⛔ no 12-digit run remains on the render. ✅ Verified by execution: the snapshot now reports
  `status: 'pass'`, `piiMatches: []`, `leaks: []`. ⛔ The detector was ⛔ **not** weakened — not by
  length, not by surface, not by field — and the entry records that the conflict RETURNS in full if
  any surface ever re-publishes a 12-digit value.
- ⚠⛔ **⛔ NOT CONFIRMED, and recorded as such rather than claimed as fixed** — the routed assertion
  that the **member** donor path carried a **LIVE 500** on an empty `bankName`. ✅ Checked at the call
  site: `payment/handlers.ts` **already** degraded `''` to the decrypt-failed sentinel before the
  schema saw it, and **that guard predates the finding** ⇒ the 500 was ⛔ never reachable
  ([[feedback_trace_reachability_before_escalating]]). ⭐ What **is** real is the milder residual — a
  **whitespace-only** value passing `.length > 0`, rendering a blank bank label on the screen where a
  donor picks an account — and that **is fixed**, with the `district`/`branch` treatment. ⭐ The
  committed counter-position in `sahyog-vivran-read.ts` (*"a truly empty `bank_name` is a
  data-integrity fault"*) is **named and amended**, ⛔ not silently contradicted.
- ⭐ **RULED** — no outcome predicate is added to the member donor path.
  `resolveMemberLivePool` returns `null` unless the member is `active` **and** assigned in a **`live`**
  cycle, and a drive reaches `live` only through a frozen cycle on an **approved** claim ⇒ a denied
  claim never reaches the handler, and an appeal-reversed one reaches it only because the reversal
  restored it. The public defect was that *"recent"* stood in for *"legitimate"*; here `live` **IS**
  the legitimacy gate. ⚠ The residual (an approval reversed **while** its cycle is still `live`) is
  named at the handler so it is inherited, ⛔ not rediscovered.
- ⛔ **DORMANT, ⛔ NOT RESOLVED** — the three reactivation preconditions (retroactive un-masking as a
  bulk disclosure event · RLS-failure indistinguishable from *"no window"* and resolving to PUBLISH ·
  O(N) remediation with a five-minute floor), recorded on the machinery.
- ⭐ The three **G3** render findings: the per-account `aria-label`'s ordinal is **removed** (it
  announced *"Account 1"/"Account 2"* to screen readers only, contradicting the equality the page
  states in copy, on a path the field gate is **structurally blind** to); the *"either account can be
  used"* copy is **re-worded and re-gated** on `length > 1` (a one-element array is legal, and the old
  standing sentence invited a visitor to infer a second account was being **withheld**); the
  label-restating-value row died with its field.
- ⭐ The **frame** moved with the rows: *"Where the money goes"* and *"Bank details for this drive"*
  both re-worded in **both** locales, and seven now-orphaned i18n keys retired after grepping for
  other consumers.

#### ⚖️ Decided here rather than left implicit

- ⭐ **ROUTED, ⛔ not ruled** — `D-nominee-name-form` (`deferred-work.md` item **(h)**). `-190` cl.2
  rules the **LABEL**; it says ⛔ nothing about the **FORM** (full name vs first-name + last-initial).
  The matrix YAML header's *"declares ZERO `pii_tier: 1` fields … so it neither needs nor claims a
  name-form ruling"* went false at 11b.3a, and with the antecedent gone the conclusion no longer
  follows on its own logic. ⛔ A subtraction story has ⛔ no authority to rule a name form, so the gap
  is recorded with the argument on **both** sides and a trigger.
- ✅ **CLOSED** — `deferred-work.md` item **(e)** *"VPA collection"*. Its premise was **FALSE when
  written**: `-191` cl.5 verified 8.13 **built** the collection (migration 0080, a real optional
  intake, 11 of 558 accounts populated). ⛔ A null VPA is a **permanent** property of an unfilled
  optional field, ⛔ never a pending gap.
- ⚠ **RE-AFFIRMED, ⛔ not downgraded** — item **(g)** (edge-cache blindness). Two of its premises moved
  (the address is opaque since 11b.10; the walk would now reach ONE Tier-1 field, not four) and
  ⛔ neither touches what the item is about.

#### ⚠ Carried forward, openly

- ⛔ **The `-190` cl.3 residual.** A logged-in member does ⛔ not yet see the complete banking
  information for a **FINISHED** drive — that is **story F** (`11b-16`), which needs story **E**'s
  list. ⇒ between this story and F, a `closed` drive's coordinates sit on ⛔ no surface. ⛔ Recorded,
  ⛔ not hidden, and ⛔ **not** to be "fixed" by restoring the public arm.
- ⚠ **The surviving public name is UNVERIFIED and, today, UNVERIFIABLE.** ⛔ No FK, ⛔ no match rule,
  and per `D5-subject(ii)` ⛔ nobody in the approval chain can read it. ⭐ Sharper now that it is the
  ⛔ only thing published — stated at four sites and in `deferred-work.md`.

### File List

**Governance (commit `4ee115c6`)**
- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

**Contracts**
- `packages/contracts/src/public-pages/sahyog-vivran.ts`
- `packages/contracts/src/public-pages/matrix.ts`
- `packages/contracts/public-pages/public-vs-private-matrix.yaml`
- `packages/contracts/tests/public-pages-sahyog-vivran.test.ts`
- `packages/contracts/tests/public-pages.test.ts`

**Domain**
- `packages/domain/src/pool/sahyog-vivran-read.ts`
- `packages/domain/src/pool/public-read.ts`
- `packages/domain/src/claim/nominee-bank-masking.ts`
- `packages/domain/src/claim/nominee-bank-masking-policy.ts`

**API**
- `apps/api/src/modules/public-pages/sahyog-vivran-controls.ts` *(new)*
- `apps/api/src/modules/public-pages/handlers.ts`
- `apps/api/src/modules/public-pages/routes.ts`
- `apps/api/src/modules/payment/handlers.ts`
- `apps/api/src/modules/nominee-bank-masking/index.ts`
- `apps/api/tests/integration/public-pages/sahyog-vivran.spec.ts`
- `apps/api/tests/integration/payment/nominee-accounts.spec.ts`
- `apps/api/tests/integration/login-wall.spec.ts`

**Public web**
- `apps/public/src/pages/sahyog-vivran/[driveToken].astro`
- `apps/public/src/lib/sahyog-vivran-render.ts`
- `apps/public/src/lib/sahyog-vivran.server.ts`
- `apps/public/src/lib/surface-fields.ts`
- `apps/public/tests/integration/public-pages/scrape-test.spec.ts`
- `apps/public/tests/sahyog-vivran-client.test.ts`
- `apps/public/tests/sahyog-vivran-render.test.ts`

**i18n**
- `packages/i18n/locales/en/sahyog-vivran.json`
- `packages/i18n/locales/hi/sahyog-vivran.json`

**Gates + records**
- `scripts/sahyog-vivran-financial-truth/check.ts`
- `friction-budget.md`
- `_bmad-output/implementation-artifacts/deferred-work.md`

**Code review pass (2026-09-05) — stale-doc + test-fragility patches**
- `apps/public/src/pages/sahyog-vivran/[driveToken].astro`
- `packages/contracts/scripts/emit-openapi.ts`
- `openapi/v1.yaml` *(regenerated)*
- `apps/api/tests/integration/nominee-bank-masking/admin.spec.ts`
- `apps/api/src/modules/public-pages/sahyog-vivran-controls.ts`
- `packages/domain/src/pool/sahyog-vivran-read.ts`
- `apps/api/tests/integration/public-pages/sahyog-vivran.spec.ts`
- `_bmad-output/implementation-artifacts/11b-11-nominee-banking-coordinates-withdrawn-from-public.md`

**Code review — SECOND PASS (2026-09-05) — fixed a bug in the first pass's own patch, plus stale Trustee-facing copy**
- `apps/public/src/pages/sahyog-vivran/[driveToken].astro` (aria-label fix, corrected)
- `apps/api/src/modules/payment/handlers.ts`
- `apps/api/tests/integration/payment/nominee-accounts.spec.ts`
- `apps/admin/src/modules/nominee-bank-masking/i18n-en.ts`
- `apps/admin/src/modules/nominee-bank-masking/MaskingScheduleForm.tsx`
- `apps/admin/src/modules/nominee-bank-masking/MaskingSchedulePage.tsx`
- `apps/admin/src/api/client.ts`
- `apps/api/src/modules/nominee-bank-masking/handlers.ts`
- `packages/domain/src/claim/nominee-bank-masking.ts`
- `_bmad-output/implementation-artifacts/deferred-work.md`

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-09-05 | 1.0 | ✅ **IMPLEMENTED — all ten Tasks and all eight ACs closed; status → `review`.** ⭐ Governance first (`4ee115c6`), then the code (`a208cf23`). ⛔ The five coordinates are ABSENT (⛔ not null) at the contract, the allowlist, the matrix YAML, the domain PROJECTION, the API decrypt, the render model, the SSR validator and the page; the name stays, relabelled *"Nominee Name"* in both locales. ⭐ D1(b)'s collapse shipped with its doc-block; the masking machinery is RETAINED whole, its **⛔ no-public-consumer** status recorded at seven sites, and the three REACTIVATION PRECONDITIONS moved onto the machinery itself. ⭐ Identity set **16 → 11**, allowlist **6 → 3**, and the control count is **MECHANIZED** into `SAHYOG_VIVRAN_APPLICABLE_CONTROLS` (three documents had drifted to three different answers) with a length **and** composition assertion. ⚠⛔ **One inherited finding is recorded ⛔ NOT CONFIRMED:** the member path's `bankName` 500 was ⛔ never reachable — the guard predates the finding — while the real whitespace-only residual IS fixed. ✅ FR-74 Aadhaar collision **CLOSED BY [EDIT]**; `deferred-work.md` (e) **CLOSED**, (g) re-affirmed, and **(h) `D-nominee-name-form` ROUTED** — `-190` cl.2 rules the LABEL, ⛔ not the FORM. ✅ `ci:local` **34/34 green** incl. live DB. | BigDev + Claude |
| 2026-09-04 | 0.1 | Created from `2026-09-04-195` cl.3 (story **A**). ⚠ **D1 is OPEN and blocks Task 2.** | BigDev + Claude |
| 2026-09-04 | 0.2 | ✅ **D1 RULED (b) — collapse the wire, keep the machinery.** Task 1 closed, Task 2 unblocked and made concrete. ⛔ `dev-story` ⛔ NOT started, by instruction. | BigDev + Claude |
| 2026-09-05 | 0.4 | ⬅️ **THREE MORE INHERITED from 11b.3a's third pass, chunk G3** — all on the public bank block, all lifted into **Task 6**. ⚠ **One is ⛔ NOT closed by the withdrawal:** the per-account `aria-label` announces *"Account 1"/"Account 2"*, contradicting AC2's *"no ordering that implies preference"* — Task 6 removes five **rows**, ⛔ not the per-account grouping. ⛔ No AC changed; story stays `ready-for-dev`. | BigDev + Claude |
| 2026-09-05 | 0.5 | ✅ **VALIDATION PASS — six critical corrections against live code and the decision log.** ⛔ **AC6 asserted the member path returns "all four values unmasked"; it ⛔ NEVER has** — `NomineeBankAccountView` is `.strict()` with `vpaPresent: boolean` and *"the VPA itself is NEVER sent"* ⇒ AC6 + the fact table corrected, and adding `vpa` to the member wire explicitly forbidden. ⭐ **The donor path shares ⛔ NO code with `sahyog-vivran-read.ts`** ⇒ Task 8's `bankName` item upgraded from *verify* to a **confirmed live defect** (`nominee-accounts.ts:51` carries the same `.min(1)`). ⭐ **AC5 + Task 7 now name `routes.ts`**, which carries four of the FOUR-counts. ⭐ **Task 2 gains `-191` cl.5's ordered correction** — the stale *"8.4 shipped the resolver seam ABSENT"* claim at `sahyog-vivran.ts:201-202` **survives** the collapse. ⭐ **Trap 3 gains the three committed passages that call AC2's own label WRONG** (6.8 D1 / `D5-subject`), plus the residual stated plainly: the surviving public name is unverified and, per `D5-subject(ii)`, unverifiable. ⭐ **AC1 re-attributed** — `-190` cl.1 names four fields; `nominee_vpa` is `-191` cl.1's. Plus the bank block's own heading/group-label copy, the dead `isMasked` mapping, the "sixteen" test title, `login-wall.spec.ts`'s real path (`apps/api`) and three line-number corrections. ⛔ No AC weakened; ⛔ no scope added; story stays `ready-for-dev`. | BigDev + Claude |
| 2026-09-04 | 0.3 | ⬅️ **EIGHT FINDINGS INHERITED from 11b.3a's THIRD code-review pass, and LIFTED INTO THE TASKS** (BigDev's split-by-survival routing: `-190` cl.1 deletes or collapses the code they bear on). New `⬅️ INHERITED` subtasks under Tasks **2, 3, 4, 5, 7, 8, 9**. ⚠ **Three are REACTIVATION PRECONDITIONS, ⛔ not fixes** — cl.4 retains the machinery and AC7 leaves `D8-default` FAIL-OPEN unchanged. ⚠ **One (Task 4's malformed-row item) is CONDITIONAL** — closed only if the public read stops resolving the schedule. ⛔ No AC changed; ⛔ no code touched; story stays `ready-for-dev`. | BigDev + Claude |
