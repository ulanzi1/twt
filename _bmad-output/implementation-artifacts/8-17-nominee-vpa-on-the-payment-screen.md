---
baseline_commit: 19ff4109
---

<!--
⭐ BASELINE — `governance(11b.17): close AC4's last conditional`. Every claim below verified at
this SHA. ⭐ Created 2026-09-10 to discharge Story `11b-17` **Task 0e** / `#decision-2026-09-10-212`
**Consequence 3** — the work cl.2 created and which is ⛔ NOT story F's to absorb.
-->

# Story 8.17: The Nominee's UPI ID Reaches the Member — On the Payment Screen, Where They Are Asked to Pay `[SURFACE]`

Status: ready-for-dev

## ✅ PREFLIGHT — ✅ **ALL CLEAR. ⭐ STARTABLE. ⛔ ZERO BLOCKING DECISIONS.**

⭐ The authority is **Trustee-ratified and already ruled** — `#decision-2026-09-10-212` **cl.2**,
applying `#decision-2026-09-04-191` **cl.1**. ⛔ Nothing here waits on the Panel.

⚠ **THREE THINGS TRAVEL WITH THIS STORY. ⛔ None blocks it; ⛔ none may be dropped:**

| | Carried | Where it binds |
|---|---|---|
| **C4** | The `.strict()` additive-field blank-out **FIRES** | Task 4 — a deployment-ordering constraint |
| **C5** | ⛔ **No UPI-ID label exists** on any member surface — one must be minted | Task 3 |
| **C6** | The screen labels the nominee *"Account holder"*, against `-190` cl.2 — ⛔ **UNRESOLVED** | AC6 — ⛔ record, ⛔ do ⛔ not fix by side effect |
| **§8.4(ii)** | Two accounts may carry **different holder names** — ⛔ unruled | AC6 — routed, ⛔ not this story's to decide |

---

## Story

As a member who has been asked to contribute to a colleague's Sahyog drive,
I want to see the family's UPI ID, not just a button that pays for me,
so that I can pay from whichever app or device I actually use — or hand it to whoever in my family
does the paying — instead of being locked to one screen at one moment.

## 📜 Policy meaning (AI-10-1, CONFIRMED BigDev 2026-08-18)

⛔ **⛔ NO PREDICATE THAT GATES A MEMBER'S ACCESS TO A BENEFIT** is introduced or changed — ⛔ no
eligibility, ⛔ no assignment, ⛔ no obligation, ⛔ no amount owed. ⭐ This story **widens ⛔ nothing**:
it adds ⛔ no drive, ⛔ no member and ⛔ no state to what the payment screen already serves.

⚠ **ONE DISCLOSURE CHANGES, and it gates ⛔ no benefit.** In the member's terms:

> **"When you are asked to contribute, you can now see the family's UPI ID itself — not only a
> button that pays for you."**

⭐ **The Niyamavali check, reported honestly:** the check yields **nothing dispositive** — the
Niyamavali is an unexecuted, agent-drafted design reference that binds nothing
([[feedback_niyamavali_rulebook_not_spec]]). ⇒ ⭐ **the authority is `-191` cl.1 as applied at `-212`
cl.2, ⛔ nothing else.**

## 🎯 What already EXISTS — ⭐ verified live at `19ff4109`, ⛔ not assumed

| Fact | Where | Verified |
|---|---|---|
| ⭐ The payment screen **exists and ships** | `apps/mobile/app/(contribution)/pay.tsx` (31 KB) | ⭐ read |
| ⭐ It **already renders unmasked coordinates** — holder, bank, **full account number**, IFSC | `pay.tsx:473-480` (`FieldRow` ×4) | ⭐ read |
| ⛔ It renders **⛔ NO VPA row** — only a boolean drives the button | `nominee-accounts.ts:61` `vpaPresent: z.boolean()` | ⭐ read |
| ⭐ The ciphertext **exists and is decrypted server-side today** | `payment/handlers.ts:155-164` → the `upi://pay` URL | ⭐ read |
| ⭐ The VPA **is genuinely collectable** — ⛔ not an inert gate | `apps/mobile/app/(claim)/nominee-review.tsx:39-45,146` — an **optional** nominee-filled field, `VPA_RE`-validated | ⭐ read |
| ⚠ ⛔ **How many nominees have supplied one is a DATA question ⛔ code cannot answer** | — | ⛔ **un-attested, ⛔ not backfilled** |
| ⭐ The intake, persistence and decrypt shipped at **8.13** (`done`) | `claim/nominee-bank-persist.ts:195`; `claims/nominee-bank.ts:41` `NOMINEE_BANK_VPA_REGEX` | ⭐ read |

---

## ⛔ THE TRAPS

### Trap 1 — ⭐⭐ **THERE ARE ⛔ TWO TYPES NAMED `NomineeBankAccountView`. ⛔ EDITING THE WRONG ONE IS A DIFFERENT, UNRULED DISCLOSURE**

| | File | Exported? | Whose eyes | Consumers |
|---|---|---|---|---|
| ✅ **THIS ONE** | `packages/contracts/src/contributions/nominee-accounts.ts:46` | ⭐ **exported** | the **paying member** (9.9 donor path) | `payment/handlers.ts` → `pay.tsx` |
| ⛔ **⛔ NOT THIS ONE** | `packages/contracts/src/claims/nominee-bank.ts:112` | ⚠ **module-private `const`** | **staff / the nominee** at claim time | `RecordNomineeBankResponse`, `NomineeBankStatusResponse` |

⚠⛔ **BOTH already carry `vpaPresent`**, so a grep for that field lands in **both**. ⛔ `-212` cl.2
rules the VPA onto the **member payment surface ⛔ only**; putting the plaintext on the claims presence
view would be a **⛔ NEW disclosure ⛔ nobody has ruled**.
⚠ ⭐ And Story **8.13**'s own Task text attributes `NomineeBankAccountView` to
`claims/nominee-bank.ts` (`8-13:62`) — ⛔ **the exported symbol it actually edited lives in
`contributions/nominee-accounts.ts`**. ⇒ ⛔ do ⛔ not navigate by that story's file names.

### Trap 2 — ⚠⛔ **ADDING ONE FIELD BLANKS THE SCREEN ON EVERY INSTALLED OLDER BUILD**

`NomineeBankAccountView` is `.strict()` and `api-client`'s `call` uses a **throwing** `schema.parse`
(`packages/api-client/src/index.ts:261`). ⇒ the moment the API ships `vpa`, **every app build older
than that release rejects the unknown key**, `call` throws, and the member gets the failure branch —
⛔ not a missing row, **⛔ the whole screen**, until they update.

⭐ This is `deferred-work.md`'s recorded item (11b-15 third pass), and **`-212` Consequence 4 fires
it**. ⇒ ⛔ it is ⛔ not this story's to *solve* repo-wide, ⚠ but this story is the one that **detonates
it**, so Task 4 owes a **stated deployment order**.

### Trap 3 — ⛔ **THE VPA IS OPTIONAL AND ALWAYS WILL BE. ⛔ A NULL IS ⛔ NOT AN ERROR**

`vpa_ciphertext` is **nullable by design** — *"a nominee without a VPA is a first-class state (do NOT
chain `.notNull()`)"* (`claim_nominee_bank_accounts.ts:65-67`). ⭐ A member seeing an account with
⛔ no UPI ID is **ordinary**, ⛔ never a failure. ⛔ Do ⛔ not render a placeholder, an error, or
`vpa_not_collected` copy in the field's place — ⭐ **omit the row.**

### Trap 4 — ⛔ **THE DECRYPT ALREADY HAPPENS. ⛔ DO ⛔ NOT ADD A SECOND ONE**

`payment/handlers.ts:155-164` **already decrypts** `vpaCiphertext` for the chosen account and folds it
into the `upi://pay` URL, fail-soft to `null` on a decrypt failure (⛔ never a 500). ⇒ ⭐ this story
**surfaces a value the handler already holds**; ⛔ it does ⛔ not add a KMS call, ⛔ and must ⛔ not.
⚠ Per the audit tracing at `-212`-era, **every extra `decryptDek` is an audit line on a global
advisory-lock chain** — ⭐ adding none is the point.

---

## Acceptance Criteria

### AC0 — Governance first
Task 0 lands the `epics.md` entry and the sprint-row flip in a `governance:` commit before any code
([[feedback_governance_commits_precede_implementation]]).

### AC1 — The member can READ the family's UPI ID on the payment screen
On `apps/mobile/app/(contribution)/pay.tsx`, the selected account's **UPI ID renders as text the
member can read**, beside the account number and IFSC already shown.
**And** it is **UNMASKED and complete** — ⭐ the same ground the account number is unmasked on
(*"a masked account# cannot be transferred to"*).

### AC2 — Where there is no VPA, the row is ABSENT
Per Trap 3 — an account with ⛔ no `vpa` renders **⛔ no row at all**: ⛔ no placeholder, ⛔ no error,
⛔ no "not collected" copy. **And** the pay button's existing behaviour is **⛔ unchanged** in that case.

### AC3 — The wire carries the VPA, and ⛔ only on this path
`vpa` is added to **`packages/contracts/src/contributions/nominee-accounts.ts`**'s
`NomineeBankAccountView` as **optional** — per Trap 1, ⛔ **NOT** to `claims/nominee-bank.ts:112`.
**And** `vpaPresent` **stays** — ⭐ it is non-PII and 8.13 records a live reason to keep it
(`8-13:250`).
**And** a test asserts the **claims** presence view still carries ⛔ **no** `vpa`.

### AC4 — ⛔ Nothing else moves
⛔ No public surface · ⛔ no drive-detail page (⭐ `-212` cl.2 excludes it — story `11b-17`) · ⛔ no
change to `resolveMemberLivePool`'s scope · ⛔ no new decrypt (Trap 4) · ⛔ no change to the
`upi://pay` URL, `tr`, or the attest path · ⛔ no masking of any coordinate.

### AC5 — The read stays ATTRIBUTABLE, and ⛔ no PII enters the audit line
The existing `member_contribution.nominee_accounts_viewed` audit **stays as it is** —
`payment/handlers.ts:390` records the **account COUNT only**. ⛔ The VPA must ⛔ **never** reach an
audit line, an event payload, or a log ⇒ ⭐ a test asserts it.

### AC6 — Two labels are recorded, ⛔ not silently decided
**And** the new UPI-ID label is **minted in `contribution.json`** beside its four siblings
(`upi_intent.{account_holder,account_number,ifsc,bank}_label`), **both locales**, ⛔ never inlined.
⚠⛔ **AND TWO OPEN QUESTIONS ARE RECORDED IN THE STORY, ⛔ NOT ANSWERED AT A RENDER SITE:**
⭐ **(a)** this screen calls the nominee *"Account holder"*, which `-190` **cl.2** rules ⛔ not to be
used (*"the public wording is **Nominee Name**"*), and the member drive list already carries
`nominee.label` on that ground — ⚠ **whether cl.2 binds ⛔ only the public surface is ⛔ UNRESOLVED**
(`-212` Consequence 6). ⛔ Do ⛔ not relabel by side effect.
⭐ **(b)** **§8.4(ii)** — the **code asserts ONE nominee** across both accounts
(`member-pool/handlers.ts:537`) while the **SCHEMA permits a different name per account**
(`claim_nominee_bank_accounts.ts:61`) ⇒ ⛔ one is wrong and ⛔ nobody has said which (`-213` cl.2).

---

## ⚖️ Decisions

### ✅ D1 — **RULED before this story existed** (`#decision-2026-09-10-212` cl.2, Trustee-ratified)

> ⭐⭐ **THE RULING:** the nominee's UPI ID is ⛔ **NOT** on the member's drive-detail page. ⭐ It is
> **ADDED to the PAYMENT screen**, where a member is actually asked to pay. **DR + KB, 2026-09-10.**

⭐ **THE GROUND, from the routing note the Panel answered:** the pay path resolves to **ONE** drive —
`resolveMemberLivePool` needs `active` + a `live` cycle + an **assignment** — so on a drive-detail page
listing every drive a Pariwar ever ran, *"the button is enough"* was ⛔ **empty**: for almost every
drive shown, ⛔ there is no button. ⇒ ⭐ the coordinate belongs where the **payment purpose** is.

⚠⛔ **AND WHAT THIS SUPERSEDED, NAMED:** `deferred-work.md` item (e)'s *"do ⛔ NOT add `vpa` to that
wire; that would be a NEW Tier-1 exposure ⛔ nobody ruled on."* ⭐ Superseded by cl.2 — ⚠ **and its
stated ground was ⛔ FALSE when written**: `-191` cl.1 had already ruled, and item (e) quotes that
clause three lines above its own prohibition ([[feedback_closure_language_precision]]).

⛔ **ZERO OPEN DECISIONS.** AC6's two items are **recorded questions**, ⛔ not gates on this build.

---

## ⚠ What this story does ⛔ NOT do

⛔ No drive-detail page · ⛔ no public surface · ⛔ no widening of which drives the payment screen
serves · ⛔ no second decrypt · ⛔ no change to `vpaPresent`, the pay button, the `upi://pay` URL or the
attest path · ⛔ no relabelling of *"Account holder"* · ⛔ no answer to §8.4(ii) · ⛔ no VPA on the
claims presence view.

---

## Tasks / Subtasks

- [ ] **Task 0 — GOVERNANCE** (AC0) — an `epics.md` entry under Epic 8; flip the sprint row; ⛔ one
      `governance:` commit, ⛔ no code.
- [ ] **Task 1 — The contract** (AC3) — add optional `vpa` to `NomineeBankAccountView` in
      **`contributions/nominee-accounts.ts`**. ⚠⛔ **Re-read Trap 1 first.** ⭐ Keep `.strict()`; keep
      `vpaPresent`; ⛔ do ⛔ not touch `claims/nominee-bank.ts:112`.
- [ ] **Task 2 — The handler** (AC1, AC5) — surface the plaintext the decrypt at
      `payment/handlers.ts:155-164` **already produces**; ⛔ add ⛔ no KMS call (Trap 4). ⭐ Fail-soft to
      **omitted**, ⛔ never a 500, ⛔ never the sentinel string in the VPA's place.
      ⛔ The audit line at `:390` stays **count-only**.
- [ ] **Task 3 — The screen + the label** (AC1, AC2, AC6) — a `FieldRow` beside `ifsc_label` at
      `pay.tsx:473-480`; ⭐ mint `upi_intent.vpa_label` in **both** locales; ⛔ omit the row when absent.
      ⚠ Follow the file's existing `FieldRow` idiom and `tabular` usage — ⛔ do ⛔ not invent a variant.
- [ ] **Task 4 — The deployment order** (Trap 2) — state it explicitly in the story record: the
      **API ships the additive field ⛔ only alongside or after** a mobile build that tolerates it, or
      the older-build blank-out is accepted **and recorded**. ⛔ Do ⛔ not discover this in production.
- [ ] **Task 5 — Tests** (AC1-AC3, AC5, AC6)
  - [ ] Contract: `vpa` optional; absent ⇒ parses; `vpaPresent` retained; ⛔ **claims** view still has
        ⛔ no `vpa`.
  - [ ] Handler: an account **with** a VPA returns it; **without** ⇒ the key is **ABSENT**, ⛔ not
        `null`; a decrypt failure ⇒ omitted, ⛔ not a 500.
  - [ ] ⛔⛔ **The VPA appears in ⛔ NO audit line, ⛔ NO event payload and ⛔ NO log** (AC5).
  - [ ] The screen renders the row when present and ⛔ omits it when absent — ⚠ **source-scan idiom**:
        ⛔ there is ⛔ no RN mount harness (`components/drive-list/format.ts:1-10` records why); put any
        checkable logic in a plain `.ts`.
  - [ ] `i18n:check` + `microcopy:check` green for the new key in **both** locales.
  - [ ] ⭐ **Execute against `twt-test-pg` `:5433`.**

---

## Dev Notes

### Why this story exists at all — ⭐ read once, ⛔ it prevents a re-litigation

`-191` cl.1 ruled in **September 2026** that the VPA is *"shown to the logged-in member"*. ⚠⛔ **It was
then read narrowly in a working note, recorded as *"already satisfied"* by the pay button, and
⛔ never put back to the Panel** — a ratified instruction that lapsed for six days and was found only
by tracing the payment path during Story `11b-17`'s validate pass. ⇒ ⛔ **do ⛔ not re-open the
question**; ⭐ it is ruled twice over now (`-191` cl.1, `-212` cl.2).

### Testing standards

Live-DB for the handler; contract tests in `packages/contracts`; ⚠ **⛔ no RN mount tests exist** —
source-scan plus plain-`.ts` extraction is the shipped idiom. ⭐ Assert **membership and explicit
values**, ⛔ never counts over the shared fixture ([[project_live_db_test_gotchas]]).

### References

- `.decision-log.md#decision-2026-09-10-212` **cl.2** (the ruling) · **Consequences 3-6** (what travels)
  · `#decision-2026-09-04-191` **cl.1** (the clause it applies) · `#decision-2026-09-10-213` **cl.2**
  (§8.4(ii), open) · `#decision-2026-09-04-190` **cl.2** (the *"Nominee Name"* wording — ⛔ unresolved here)
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-09-10-11b17-member-drive-detail-two-questions.md`
  **Q2** / **§4.2b** — the traced pay-path evidence the Panel ruled on
- `apps/mobile/app/(contribution)/pay.tsx:473-480` — the four `FieldRow`s this joins
- `apps/mobile/app/(claim)/nominee-review.tsx:39-45`, `:146` — where a VPA is actually collected
- `packages/contracts/src/contributions/nominee-accounts.ts:46-61` — ⭐ **the view to edit**
- `packages/contracts/src/claims/nominee-bank.ts:112` — ⛔ **the view ⛔ NOT to edit** (Trap 1)
- `apps/api/src/modules/payment/handlers.ts:155-164`, `:390` — the existing decrypt; the count-only audit
- `_bmad-output/implementation-artifacts/8-13-…md` — the intake/persistence this builds on (`done`)
- `_bmad-output/implementation-artifacts/deferred-work.md` item **(e)** — SUPERSEDED by `-212` cl.2

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-09-10 | 0.1 | Created to discharge Story `11b-17` **Task 0e** / `-212` **Consequence 3** — the work cl.2 created, which is ⛔ NOT story F's. ⭐ **ZERO open decisions**: the authority is Trustee-ratified (`-212` cl.2 applying `-191` cl.1). ⭐⭐ Four traps recorded from live verification: **(1)** ⛔ TWO types named `NomineeBankAccountView` — the exported donor view (`contributions/nominee-accounts.ts:46`) is the target; the module-private claims view (`claims/nominee-bank.ts:112`) is ⛔ NOT, and **both already carry `vpaPresent`** so a grep lands in both — ⚠ 8.13's own Task text names the wrong file for the symbol it edited; **(2)** the `.strict()` additive-field blank-out **detonates here** ⇒ Task 4 owes a stated deployment order; **(3)** a null VPA is a **first-class state**, ⛔ never an error ⇒ omit the row; **(4)** the decrypt **already happens** at `handlers.ts:155-164` ⇒ ⛔ add no KMS call, since each one is an audit line on a global lock. ⭐ Verified the VPA is **genuinely collectable** (`nominee-review.tsx` — an optional nominee-filled field) ⇒ ⛔ not an inert gate; ⚠ how many rows are populated is a **DATA question code cannot answer** and is recorded un-attested. ⚠ AC6 carries `-190` cl.2's *"Account holder"* conflict and §8.4(ii) as **recorded questions, ⛔ not gates**. | BigDev + Claude |
