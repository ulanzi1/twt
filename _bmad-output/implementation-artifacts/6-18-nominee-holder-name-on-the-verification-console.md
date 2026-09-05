---
baseline_commit: b9beb2c6
---

<!--
⭐ BASELINE — `governance(11b.12): attribution CONFIRMED`. Carries decisions `2026-09-04-186` … `-196`,
Story 11b.11 `done`, and the D2 arc that COMMISSIONED this story.
-->

# Story 6.18: The Nominee **Holder Name** Reaches the Verification Console — and the Approver **ATTESTS** the Match `[SURFACE]`

Status: ready-for-dev

> ⭐⛔ **⛔ NOT IN `epics.md`'s STORY LIST.** Commissioned by **Trustee ruling, 2026-09-05**
> (Dhiraj Rahul + Kalpana Bharti), on Story **11b.12**'s **D2**: *"Open a story to MECHANIZE the
> approver duty."* ⇒ it owes an `epics.md` **ANNOTATION** (Task 0).
>
> ⭐⭐ **IT CLOSES `D5-subject` (ii)** — `deferred-work.md` item **(b)**, open since 11b.1 and sharpened
> at 11b.3a and 11b.11. ⚠ Its recorded trigger has **FIRED**: *"the next story touching Story 6.10's
> console, or any story that adds a Tier-1 decrypt to an approval surface."*
>
> ⚠⛔ **⛔ IT DOES ⛔ NOT CLOSE `D5-subject` (i).** ⭐ Different half, different fix, ⛔ explicitly
> forbidden here — see **Trap 1**.

## Story

As the verifier (or state trustee) approving a death claim,
I want to see the name on the account that will receive the Pariwar's contributions, and to record
that I checked it against the nominee this member declared,
so that money reaches the nominee the member chose — and so that the Trust can show it checked,
rather than merely intending to.

## 📜 Policy meaning (AI-10-1, CONFIRMED BigDev 2026-08-18)

⭐⭐ **YES — THIS STORY INTRODUCES A PREDICATE THAT GATES A BENEFIT, AND IT IS THE POINT OF THE STORY.**

⭐ **In the member's terms, one sentence:**
> **"The money from your Pariwar goes to the nominee you named — and before a claim is approved, a
> human being now has to look at the account name and say so."**

⚠ **Checked against the Niyamavali, and the result:** ⛔ **the Niyamavali does ⛔ NOT rule on this.**
⭐ Its nominee provisions govern **declaration and the 75/25 split** (Story 3.4), ⛔ not the
disbursement account. ⇒ this predicate rests on the **Trustee ruling of 2026-09-05** and on 6.8's
collection design, ⛔ **not** on the rulebook — and [[feedback_niyamavali_rulebook_not_spec]] applies:
⛔ the Niyamavali is ⛔ **not** a blocker here and must ⛔ not be cited as one.

⚠⛔ **AND THE SHARP EDGE, STATED BEFORE IT IS BUILT — ⭐ this is the 10.10 lesson.**
**A blocking attestation ⛔ CAN STOP A GRIEVING FAMILY'S CLAIM.** ⇒ if the attestation is
**mandatory** and the verifier cannot resolve a mismatch, the claim **halts** — and the member is
already dead. ⛔ That is a constitutional consequence hiding in a checkbox. ⇒ **D2 rules whether it
blocks**, and ⛔ the story does ⛔ not assume.

## 🎯 What already EXISTS — ⭐ verified live at `b9beb2c6`, ⛔ not assumed

| Fact | Where | Verified |
|---|---|---|
| The console modules | `apps/admin/src/modules/claim-verification/` — `VerificationConsoleShell`, `SignalsPanel`, `VerifierReviewPanel`, `VerificationDecisionStrip` | ⭐ read |
| ⭐ `claim.verify` = the console **READ** key | `rbac/permissions.ts:185` — minted at 6.10, catalog **12 → 13**; ⛔ DISTINCT from `claim.approve` (the 6.11 WRITE) | ⭐ read |
| `claim.correct_nominee_bank` = the **tier-2 admin** correction key | `permissions.ts:168` | ⭐ read |
| `PERMISSION_CATALOG_VERSION` | **39** (`permissions.ts:598`). ⚠ Story **11b.13** takes it 39 → 41 and is ⛔ not yet built — ⭐ coordinate, ⛔ do not collide | ⭐ read |
| ⛔⛔ **The ONLY read-back today is a PRESENCE BOOLEAN** | `contracts/src/claims/nominee-bank.ts:107-122` — `NomineeBankAccountView` = `{rank, bankName, ifscValidated, holderNamePresent, vpaPresent}`, doc-block: *"never echo account number / holder name / raw IFSC"* | ⭐ read |
| The collection window (before approval) | `NOMINEE_BANK_COLLECTABLE_STATES` = `intake_converged`, `documents_pending`, `verification_in_progress`, `verifier_review` (`claim/errors.ts:198-203`) | ⭐ read |
| The correction window (after approval) | `NOMINEE_BANK_ADMIN_CORRECTION_STATES` = `['verifier_approved']` **ONLY** (`errors.ts:205-210`) | ⭐ read |
| The declared nominee's name **EXISTS** | `schema/member_nominees.ts:60` — `name_ciphertext`, Tier-1, PK `(member_id, rank)` | ⭐ read |
| The holder name | `claim_nominee_bank_accounts.account_holder_name_ciphertext`, Tier-1 `piiColumn(1, 'claim_nominee_bank')` | ⭐ read |
| ⛔ `ifsc_validated` is ⛔ NOT corroboration | it proves the **BRANCH** exists, ⛔ not the **PERSON** (`D5-subject` (ii)) | ⭐ known |
| ⛔ The public page ALREADY publishes this name | 11b.11 — *"Nominee Name"*, `-190` cl.2 | ⭐ known |

---

## ⛔ THE FIVE TRAPS

### Trap 1 — ⛔⛔ ⛔ DO ⛔ NOT ADD A JOIN OR A MATCH RULE. ⭐ THAT IS THE ⛔ FORBIDDEN FIX

`D5-subject` **(i)** says it in terms:

> *"⛔ **Do ⛔ not "fix" this by adding a join or a match rule.**"*

⭐ **Why, and it is ⛔ not arbitrary:** Story **6.8's D1** removed the nominee linkage **deliberately**
— the two accounts are a **CLAIM-SCOPED payment channel**, ⛔ not one row per declared nominee
([[project_nominee_bank_disbursement_channel]]). ⛔ No FK to `member_nominees`, ⛔ no `nominee_rank`,
⛔ no match rule. ⭐ The schema is the **designated authority** on this.

⇒ ⭐⭐ **THIS STORY MECHANIZES A ⛔ HUMAN JUDGEMENT, ⛔ NOT A STRING COMPARISON.** ⚠ Real nominee names
differ legitimately from account names — initials, expansions, maiden vs married, transliteration,
`S/O` forms, bank truncation. ⛔ **An automated equality check would produce false mismatches on
exactly the families least able to argue**, and would be a **de-facto eligibility predicate nobody
ruled** — ⭐ the **10.10 shape** ([[project_moderation_model_correct_course]]).

⛔ **The system SHOWS both names. ⭐ A HUMAN decides. ⭐ The system records WHAT THEY DECIDED.**

### Trap 2 — ⚠⛔ DISPLAY ALONE IS ⛔ NOT MECHANIZATION — IT MOVES THE GAP, IT ⛔ DOES NOT CLOSE IT

⚠ The obvious build is *"render the holder name on the console."* ⛔ **That is ⛔ not what was
commissioned.** A duty that is merely **visible** is still **un-performed and unrecorded**: ⛔ nothing
proves anyone looked, and the Trust still ⛔ cannot show it checked.

⭐ [[feedback_mechanization_split_commitment]] — **decay concentrates in the un-mechanized half.**
⇒ the deliverable is **display + a RECORDED ATTESTATION**, ⛔ never display alone.

### Trap 3 — ⛔ THE PRESENCE VIEW'S DOC-BLOCK ⛔ FORBIDS EXACTLY WHAT THIS STORY DOES

`contracts/src/claims/nominee-bank.ts:107-122` says *"**never echo** account number / holder name /
raw IFSC."* ⇒ this story makes that sentence **false for one field, on one surface, under one key**.

⚠⛔ **⛔ Do ⛔ NOT delete it, and ⛔ do ⛔ not widen it.** ⭐ **AMEND AND NAME** — record that the holder
name is now readable **only** on the verification surface, **only** under the new key, and that
⛔ **the account number and raw IFSC remain never-echoed**
([[feedback_supersede_never_reinterpret]]).

### Trap 4 — ⚠⛔ A TIER-1 DECRYPT AT A ⛔ NEW SURFACE OWES ITS OWN PII POSTURE

⭐ `D5-subject` (ii) names this requirement explicitly. ⇒ the story owes, ⛔ not by default:
⛔ **no logging** of either name (the `fieldLog` pattern logs a *field label*, ⛔ never a value);
⭐ decrypt **at the API boundary only**; ⛔ **no** name in any audit **payload** (the audit records
**that** an attestation happened and its **verdict**, ⛔ never the two strings);
⛔ **no** name in an error message, a 500 body, or a client cache key.

⚠ **AND THE SECOND NAME IS ⛔ NOT FREE.** Reading `member_nominees.name_ciphertext` puts a **second**
Tier-1 subject — ⭐ a **living** person, the nominee — on this surface. ⛔ It is ⛔ not covered by the
claim's own posture and must be reasoned about in its own right.

### Trap 5 — ⚠ THE CORRECTING ADMIN IS ⛔ ALSO BLIND, AND THAT IS A ⛔ SEPARATE INVERSION

`D5-subject` (ii) records it: *"even a tier-2 admin **corrects a name they cannot see**."* The
correction window is `NOMINEE_BANK_ADMIN_CORRECTION_STATES = ['verifier_approved']`, gated on
`claim.correct_nominee_bank`.

⚠ ⇒ **D3** rules whether this story fixes that too, or scopes it out **by name**. ⛔ Do ⛔ not fix it
silently, and ⛔ do ⛔ not leave it unmentioned — an unmentioned second inversion is how the first one
survived four stories.

---

## Acceptance Criteria

### AC0 — The governance is transcribed BEFORE any code
**Given** this story is commissioned by the Trustee ruling of 2026-09-05 and closes `D5-subject` (ii)
**Then** Task 0 writes the `epics.md` annotation, the decision-log entry and the sprint flip in a
`governance:` commit
**And** ⛔ no code lands before it ([[feedback_governance_commits_precede_implementation]]).

### AC1 — The approver SEES both names, side by side
**Then** the verification console shows, for **each** of the two accounts: the **account holder name**
and the **declared nominee name(s)** for that member
**And** both are decrypted **server-side at the API boundary**, ⛔ never in the browser
**And** the surface renders **exactly** these two values plus the existing non-PII fields — ⛔ **no**
account number, ⛔ **no** raw IFSC, ⛔ **no** VPA (Trap 3)
**And** ⚠ when a member declared **two** nominees, **both** are shown — ⛔ the story does ⛔ not pick one
**And** ⚠ when the member declared **none**, the surface says so **explicitly** — ⛔ never a blank that
reads as a match.

### AC2 — The approver **ATTESTS**, and the attestation is RECORDED
**Given** Trap 2 — display alone is ⛔ not mechanization
**Then** the approver records an explicit verdict — **matches** / **does not match** — before the claim
can be approved (subject to **D2**)
**And** the attestation is an **event**, carrying the actor, the timestamp, the claim, the account
rank and the **verdict**
**And** ⛔ ⛔ **NEITHER NAME appears in the event payload** (Trap 4)
**And** a *"does not match"* verdict **requires a reason** (the `claim.correct_nominee_bank`
reason-required precedent)
**And** ⛔ the attestation is ⛔ **never** inferred, defaulted or back-filled
([[feedback_record_unattested_no_backfill]]).

### AC3 — ⛔ NO automated match, ⛔ NO join
**Given** Trap 1 and `D5-subject` (i)
**Then** ⛔ **no** FK, ⛔ **no** `nominee_rank` column and ⛔ **no** string-equality rule is added
between `claim_nominee_bank_accounts` and `member_nominees`
**And** ⛔ the system offers ⛔ **no** *"looks like a match"* hint, score or highlight — ⭐ it shows two
strings and records a human verdict
**And** a test asserts the absence of any such comparison in the read path.

### AC4 — A NEW permission key, ⛔ not a widened one
**Given** Trap 4 — a Tier-1 decrypt at a new surface
**Then** a **new** key gates the holder-name read — ⛔ `claim.verify` is ⛔ **not** widened
**And** `PERMISSION_CATALOG_VERSION` is bumped, ⚠ **coordinated with Story 11b.13**, which takes it
**39 → 41** and is ⛔ not yet built
**And** the key's dimension and grants follow the 6.10/6.11 district pattern
([[project_rbac_geo_scope_containment]]).

### AC5 — The "never echo" contract is AMENDED and NAMED
**Given** Trap 3
**Then** `nominee-bank.ts:107-122`'s doc-block is amended to record the **exception**, naming this
story and the new key
**And** ⛔ the **account number** and **raw IFSC** remain **never-echoed** — asserted by a test
**And** ⛔ the presence view (`holderNamePresent`) is ⛔ **not** deleted: it remains the shape every
**other** caller sees.

### AC6 — The PII posture holds
**Then** ⛔ neither name is logged, ⛔ neither appears in an audit payload, an error body or a cache key
**And** the decrypt happens **only** at the API boundary, **only** for a caller holding the new key
**And** a test plants each name as a known-bad string and asserts it appears in ⛔ **no** log, ⛔ no
event payload and ⛔ no error response.

### AC7 — ⛔ Nothing else moves
**Then** ⛔ no claim state, ⛔ no collection window, ⛔ no correction window, ⛔ no public surface and
⛔ no `member_nominees` write path changes
**And** ⛔ the public *"Nominee Name"* render (11b.11) is **untouched**
**And** ⛔ `D5-subject` **(i)** is ⛔ **NOT** closed by this story — ⭐ recorded explicitly.

---

## ⚖️ Decisions

### 🟡 D1 — ⛔ OPEN, ⛔ BLOCKS AC1/AC2. **WHERE does the attestation live?**
- **(a)** in `SignalsPanel` — ⭐ the console's existing *"things the verifier should weigh"* surface;
- **(b)** in `VerificationDecisionStrip` — ⭐ beside the decision it gates;
- **(c)** a **new** panel of its own.

⭐ **BigDev's recommendation: (b).** ⚠ The attestation **gates the decision**; putting it anywhere else
invites approving without it. ⛔ (a) risks reading as advisory — which is the state we are leaving.

### 🟡 D2 — ⛔⛔ OPEN, ⛔ BLOCKS AC2. **Does a missing or NEGATIVE attestation BLOCK approval?**
⚠⛔ **⛔ THE CONSTITUTIONAL ONE. ⭐ Read the Policy-meaning note first.**
- **(a) HARD BLOCK** — ⛔ no approval without a *"matches"* attestation. ⭐ Strongest guarantee;
  ⛔ **a grieving family's claim halts** on a name the verifier cannot resolve.
- **(b) SOFT** — the attestation is **required to be RECORDED**, but a *"does not match"* verdict
  routes to a **named resolver** (state trustee) instead of halting. ⭐ Nothing is silently approved,
  ⛔ nothing dead-ends.
- **(c) ADVISORY** — recorded, ⛔ never blocking. ⚠ Closest to today; ⛔ weakest.

⭐ **BigDev's recommendation: (b).** ⚠⛔ **This is a Panel question, ⛔ not an engineering preference**
— it decides whether a clerical mismatch can stop a death claim. ⇒ **route it before building AC2.**

### 🟡 D3 — ⛔ OPEN, ⛔ non-blocking. **Does the TIER-2 CORRECTING ADMIN also get the name?** (Trap 5)
- **(a)** yes — ⭐ same key, same posture; ⛔ *"corrects a name they cannot see"* is closed in the same
  story.
- **(b)** no — ⭐ scope to the verifier; ⚠ record the admin inversion as **still open**, by name.

⭐ **BigDev's recommendation: (a).** ⛔ Leaving it open re-creates the exact split this story exists to
end — ⚠ but it is a **second** surface and a **second** posture, so it is recorded as a decision
rather than assumed.

---

## ⚠ What this story does ⛔ NOT do

- ⛔ It does ⛔ **NOT** close `D5-subject` **(i)** — the consent-subject gap. ⭐ Different half.
- ⛔ It adds ⛔ **no** FK, ⛔ no `nominee_rank`, ⛔ no match rule (**Trap 1**).
- ⛔ It changes ⛔ **nothing** on any public surface — ⛔ not the *"Nominee Name"* render, ⛔ not the
  index, ⛔ not the drive page.
- ⛔ It does ⛔ **not** put the nominee name on the public index — ⭐ that is the **Trustee ruling 2**
  story, ⛔ a different one, ⚠ and it owes its own decision-log entry and matrix row.
- ⛔ It does ⛔ not widen either the collection or the correction window.
- ⛔ It does ⛔ not make `account_number` or raw `ifsc` readable anywhere (**AC5**).

---

## Tasks / Subtasks

- [ ] **Task 0 — GOVERNANCE FIRST** (AC0)
  - [ ] `epics.md` annotation: commissioned by the Trustee ruling 2026-09-05 (DR + KB) on 11b.12's
        **D2**; closes `D5-subject` **(ii)**; ⛔ leaves **(i)** open.
  - [ ] A **decision-log entry** recording the ruling and this story's commissioning.
  - [ ] `deferred-work.md` item **(b)**: mark **(ii) COMMISSIONED**, ⛔ **not** closed — ⭐ it closes
        when this story ships ([[feedback_closure_language_precision]]).
  - [ ] `sprint-status.yaml`: add `6-18-…` and flip to `in-progress`, with a ledger entry.
  - [ ] Commit `governance:`. ⛔ No code.
- [ ] **Task 1 — RULE D1, D2, D3** — ⛔ **D2 BLOCKS Task 4**; ⚠ route D2 to the Panel.
- [ ] **Task 2 — The read** (AC1, AC4, AC6)
  - [ ] Mint the new permission key; bump `PERMISSION_CATALOG_VERSION` ⚠ **coordinated with 11b.13**.
  - [ ] Extend the claim read to return the holder name **and** the declared nominee name(s),
        decrypted at the API boundary, ⛔ gated on the new key.
  - [ ] ⛔ **NO** join, ⛔ **NO** comparison (Trap 1, AC3) — two independent reads.
  - [ ] ⛔ Neither value logged, cached or echoed in an error (Trap 4).
- [ ] **Task 3 — The contract** (AC5)
  - [ ] Amend `nominee-bank.ts:107-122`'s *"never echo"* doc-block — ⭐ **amend and NAME**, ⛔ do not
        delete (Trap 3). ⛔ Account number + raw IFSC stay never-echoed.
  - [ ] Keep `NomineeBankAccountView` intact for every other caller.
- [ ] **Task 4 — The attestation** (AC2; ⛔ shape per **D2**)
  - [ ] The verdict control, in the surface **D1** picks.
  - [ ] The event: actor, timestamp, claim, account rank, verdict, reason-when-negative.
        ⛔ **NEITHER NAME IN THE PAYLOAD.**
  - [ ] Wire the approval path per **D2**.
- [ ] **Task 5 — The console** (AC1, D1)
  - [ ] Render both names side by side; ⭐ the *"no nominee declared"* state explicitly (AC1).
  - [ ] ⛔ **No** match hint, score or highlight (AC3).
- [ ] **Task 6 — The tests** (AC2, AC3, AC5, AC6)
  - [ ] ⛔ No comparison exists in the read path (AC3).
  - [ ] Known-bad-string test: neither name in ⛔ any log, ⛔ event payload or ⛔ error body (AC6).
  - [ ] Account number + raw IFSC still never echoed (AC5).
  - [ ] A caller ⛔ without the new key gets ⛔ no name (AC4).
  - [ ] Two-nominee and zero-nominee renders (AC1).
  - [ ] The attestation event shape + the D2 approval behaviour (AC2).
  - [ ] ⭐ **Execute them** against `twt-test-pg` on `:5433` — ⛔ *"written but not run"* is ⛔ not
        attested.
- [ ] **Task 7 — The friction-budget disposition** — ⚠ **AFTER** the code commits
  ([[project_friction_budget_baseline_ratchet]]).

---

## Dev Notes

### ⭐ Why this story exists, in one paragraph

The Trust's rule is that a dead member's Pariwar money reaches **the nominee that member named**.
⚠⛔ **Today ⛔ nothing checks it.** The account holder's name is collected from the filer, encrypted,
⛔ never shown to the verifier, ⛔ never shown to the state trustee, ⛔ never shown to the admin who may
*correct* it — and then **published to the whole internet** under the word *"Nominee"* (11b.11). ⇒ the
one field that survived the public withdrawal is the one field ⛔ **nobody inside the Trust can read.**
⭐ This story ends that.

### The one genuinely hard part

**D2.** Everything else is mechanical. ⚠ D2 decides whether a clerical mismatch — an initial, a maiden
name, a bank truncation — can **stop a death claim**. ⛔ Getting it wrong in the strict direction hurts
the exact families this Trust exists for; ⛔ getting it wrong in the loose direction leaves the duty
un-mechanized after a story whose whole purpose was to mechanize it.

### ⚠ Coordinate with Story 11b.13

⛔ Both bump `PERMISSION_CATALOG_VERSION`. 11b.13 takes it **39 → 41** and is `ready-for-dev`.
⇒ ⭐ whichever lands second takes the next number; ⛔ do ⛔ not hard-code 40 without checking.

### Testing standards

Permission/console assertions are **unit** tests in `apps/admin`. The decrypt, the key gate and the
attestation event are **live-DB** (`apps/api/tests/integration/claims/`). ⭐ The PII-leak test follows
the **known-bad-string** pattern: plant a sentinel, assert it appears ⛔ nowhere it must not.

### References

- `.decision-log.md` — the Trustee ruling of **2026-09-05** (DR + KB) commissioning this story
- `deferred-work.md` item **(b)** `D5-subject` **(ii)** — the gap, and *"what would close it"*
- `trustee-panel-routing-note-2026-09-05-11b12-under-funded-commitment-claim.md` §9.6.1, §10 — the
  reasoning that produced the ruling
- `packages/contracts/src/claims/nominee-bank.ts:107-122` — the *"never echo"* doc-block (AC5)
- `packages/domain/src/schema/claim_nominee_bank_accounts.ts:9-11` — ⛔ *"NO … linkage of any kind"*
- `packages/domain/src/schema/member_nominees.ts:60` — `name_ciphertext`, the declared name
- `packages/domain/src/claim/errors.ts:198-214` — the collection + correction windows
- `packages/domain/src/rbac/permissions.ts:168,185,598` — the keys and the catalog version
- `apps/admin/src/modules/claim-verification/` — the console (D1)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-09-05 | 0.1 | Created on the **Trustee ruling of 2026-09-05** (DR + KB) — *"Open a story to MECHANIZE the approver duty"* — from Story 11b.12's **D2**. ⭐ Closes `D5-subject` **(ii)**; ⛔ leaves **(i)** open by design. ⚠ **THREE decisions OPEN: D1, D2, D3 — D2 BLOCKS Task 4 and is a PANEL question**, because it decides whether a clerical name mismatch can halt a death claim. ⭐ Five traps recorded at authoring, the first two load-bearing: ⛔ **no join or match rule** (`D5-subject` (i) forbids the obvious fix, and an automated comparison would be an unruled eligibility predicate — the 10.10 shape), and ⛔ **display alone is not mechanization** (it moves the gap rather than closing it). | BigDev + Claude |
