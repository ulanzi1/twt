---
baseline_commit: e16cc69073bcc951eb8f65192764d020ac66fcf9
---

# Story 11b.3a: Nominee Bank Public Presentation + Per-Pariwar Masking Schedule + Trust-Admin Knob `[SURFACE]`

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

> ⭐⛔ **THIS STORY IS ⛔ NOT IN `epics.md`'s STORY LIST.** It is the second of the three-way split of
> Story 11b.3, ruled **D6(b)** by BigDev on **2026-09-01**, and is recorded in `epics.md` as an
> **annotation** owed by **11b.3's Task 0** — exactly as `11b-2a` / `11b-2b` are. ⛔ A future
> `sprint-planning` run must ⛔ not regenerate a ghost 11b.3 or drop this story.
>
> ⛔ **ORDER: this story runs AFTER `11b-3` is `done` AND MERGED.** It declares fields on a surface
> 11b.3 creates. ⭐ It is **independent of 11b.3b** and the two may run in parallel.
>
> ✅ **PRECONDITION SATISFIED 2026-09-02 — 11b.3's `D4` RULED (b)** (`2026-09-02-176`): the surface
> renders **`live` + `closed` + `settled`**. ⇒ ⭐ **AC2's active-campaign subject HAS A HOST**, and
> ⛔ this story does ⛔ **not** need to widen the visible-pool predicate — that was the whole point of
> ruling it on 11b.3 rather than on the story that adds the Tier-1 bank fields.
> ⚠ **One rider is open and touches this story's subject: `D4-linkage`** — is a `live` pool's page
> **linked** from anywhere, or reachable **by identifier only**? `/sahyog` lists only `closed` +
> `settled`, and `P-YYYY-MM-###` is **sequential**. ⛔ Read it before assuming an active campaign's
> page is discoverable.

> ⭐⭐ **WHY THIS STORY EXISTS AT ALL, AND WHY `epics.md` DOES NOT SAY SO.**
> `epics.md` Story 11b.3's newest annotation (**2026-08-29**) says the AR-48 authenticated-fragment
> deferral is *"UNDISTURBED"*. ⛔ **True of the AUTHENTICATED half only.** One day earlier the Panel
> ruled `2026-08-28-160` **cl.10**: nominee bank details **may be publicly displayed during an active
> campaign**, with a **Trust-Admin per-Pariwar masking knob** governing what happens after it closes.
> `2026-08-28-164` **A2** then **RE-PURPOSED SD-2** onto exactly that post-campaign state, and
> `2026-08-28-165` **cl.1** ruled **four** named `(surface, field)` Tier-1 allowlist pairs.
> ⭐ **The `epics.md` amendment was never made** and is recorded as owed at
> `trustee-panel-routing-note-2026-08-28-11b3-publication-basis-and-matrix.md` **§11**.
> ⇒ ⛔ **There is no epic AC for this story. This file is the specification.**

---

## Story

As a **non-member visitor** looking at a live Sahyog Drive,
I want to **see the actual bank account the money is going to**, so I can check the trust is routing
funds to a real family and not to itself —
and as a **Trust Admin**, I want to decide **for my Pariwar how long that stays visible after the
drive closes**, and to change my mind later, without anyone rebuilding the record it projects from.

---

## 📜 Policy meaning (AI-10-1, CONFIRMED BigDev 2026-08-18)

**This story introduces ONE predicate that gates what a person sees, and ONE explicit NON-predicate.**

**The predicate, in the family's terms:**
*"While the drive is collecting, anyone can see the account the money goes to, so they can check it is
real. After the drive closes, the Trust Admin for your Pariwar decides how long that stays visible —
hidden immediately, hidden after N days, or hidden permanently — and after that the public sees only
the last four digits plus the bank and branch."*

✅ **Checked against the Niyamavali:** ⛔ **the Niyamavali says nothing about it.** This is a
**PRODUCT / presentation control ratified by the Trustee Panel** (`2026-08-28-160` cl.10), ⛔ not a
rulebook rule, and per [[feedback_niyamavali_rulebook_not_spec]] the Niyamavali's silence is ⛔ neither
a blocker nor authority either way. ⚠ **Result: no amendment is owed**, and ⛔ nobody may cite the
Niyamavali for or against the knob.

**⭐⛔ THE NON-PREDICATE, AND IT IS THE ONE MOST LIKELY TO BE GOT WRONG — `2026-08-28-160` cl.10(f),
verbatim:** the knob is a **PUBLIC-PRESENTATION control, ⛔ NOT a member-access control.** It must
⛔ **not** prevent a **suspended** member from reaching what they need in order to contribute and
regain active status.

⇒ ⛔⛔ **NO predicate this story writes may read `members.state`, `is_valid`, a moderation overlay, or
any lifecycle label.** A masking check that grows a member-state conjunct is **Story 10.10's
`is_valid: false` defect wearing a new costume** — the one that silently made every suspension a
de-facto permanent ban with every CI gate green, and reshaped Epic 10 from 15 stories to 29
([[project_moderation_model_correct_course]], [[project_assignability_predicate_is_isvalid_only]]).

---

## 🚦 Launch posture — ⛔ BUILT IS ⛔ NOT PUBLISHED

Inherits 11b.3's posture unchanged: DPDPA clearance **lifted** for this surface (`-160` cl.7, on
clause 4's model); Row 17's ≥2-trustee posture extends here via **C-5** → **AI-11a-5**; ⛔ the
publication kill switch may ⛔ **not** be cited as the technical launch gate; the pull lever is
⛔ **NOT IMMEDIATE** at `s-maxage=300`.

⚠⭐ **AND THE CACHE COSTS MORE ON THIS STORY THAN ON ANY SURFACE BEFORE IT.** A masking flip is served
stale from **every warm PoP for up to five minutes**, and what is being served stale is a **full
account number**. ⛔ Direct SQL is ⛔ **NOT** the operational fallback. ⇒ **AC6** requires this be
stated where an operator will read it, ⛔ not only here.

---

## 🎯 What already EXISTS — verified live at `79ed41d`

| Thing | State | Where |
|---|---|---|
| The four nominee bank fields, **Tier-1 envelope ciphertext** | ✅ `account_holder_name_ciphertext` · `account_number_ciphertext` · `ifsc_ciphertext` · `vpa_ciphertext` (⚠ **nullable** — a nominee without a VPA is a first-class state) | `packages/domain/src/schema/claim_nominee_bank_accounts.ts:61-67` |
| `bank_name` (**not null**) · `branch` (nullable) | ✅ **Tier-3 PLAINTEXT** — *"public, IFSC-derived, non-identifying"* ⇒ ⛔ **nothing is decrypted to render them** | same file, `:69-72` |
| `ifsc_validated` | ✅ Non-PII boolean (D4) | same file |
| The **exactly-two, equal** account rows (#1 / #2) | ✅ `account_rank` is part of the composite PK — ⛔ **NOT a priority, ⛔ NOT a nominee rank**; both are equal payment destinations | [[project_nominee_bank_disbursement_channel]], [[project_disbursement_is_money_in_routing]] |
| `pool_fixed_amount_schedule` | ✅ **LIVE** — the per-Pariwar **effective-window** shape modelled 1:1 on `terms_and_conditions_versions`. ⭐ `2026-08-28-160`'s own reference list names it *"the precedent for clause 10(c)/(d)"* | `packages/domain/src/schema/pool_fixed_amount_schedule.ts` |
| The `sahyog-vivran` matrix surface | ✅ **created by 11b.3**, with ⛔ **zero** Tier-1 fields and a test asserting that count is 0 | `public-vs-private-matrix.yaml` |
| The fail-closed Tier-1 leg + the ruled allowlist | ✅ **LIVE, both directions**; **two** entries today | `matrix.ts:157-200`, `:376-424` |
| ⭐ The **governed per-Pariwar presentation-config** substrate | ✅ **LIVE** (11a.1) — a config row + **required `rationale` + actor + display snapshot** + a §1.5 hash-chain **audit anchor** the module **refuses to write without**. ⭐ The accountability shape AC5 needs, ⛔ already built | `packages/domain/src/kyc/presentation-policy.ts`, `schema/pariwar_public_name_presentation.ts` |
| ⚠ `pariwar.manage_public_name_presentation` | ✅ **LIVE**, catalog **v37** — the nearest key, and **`super_admin` ONLY**; ⛔ the `pariwar_admin` exclusion **IS a ruling**. ⇒ **D8(ii)** | `rbac/permissions.ts` (catalog now **v38**) |

**⛔ What does ⛔ NOT exist:**

- ⛔ **No Claim Terms document, no version table, no acceptance record, and no `consent_type` value for
  one.** The enum is `tc_acceptance · dpdpa_data_processing · dpdpa_data_sharing · marketing ·
  medical_disclosure_ack · nominee_share_split · claim_time_dpdpa · whatsapp_opt_in · telegram_opt_in`
  plus **three write-never** publication types. ⇒ **Trap 1 / D5.**
- ⛔ **No masking schedule table, no admin surface for one.**
- ⛔ **No `vpa` on any nominee-facing collection surface** — 8.4 shipped the resolver seam **ABSENT**
  (`{available:false}`) and deferred VPA collection to its own story
  ([[project_nominee_vpa_deferred_seam]]). ⇒ **Trap 5.**

---

## ⛔ THE SIX TRAPS

### Trap 1 — ⭐⛔ THE BASIS FOR NOMINEE DATA IS RULED, AND ITS INSTRUMENT DOES ⛔ NOT EXIST

`2026-08-28-160` **cl.3** preserved the per-data-class basis expressly, and the table is part of the
ruling: *"Nominee information + bank details → **the nominee's own Claim Terms acceptance** → per-subject
gate? ⛔ No."* Story 11b.3's epic AC adds *"clause 8"*, and says *"the **mechanism** for each class is
this story's to design; ⛔ only the **basis** is settled."*

⛔ **Verified by grep: there is no Claim Terms document, no version table, no acceptance record, and no
`consent_type` value.** `terms_and_conditions_versions` is the **member's** T&C, per-Pariwar.

⚠ **And a second, independent record is still standing:** `deferred-work.md` **11b.1 item (a)** records
counsel's `2026-08-24-157` **cl.3(b)** *third-party objection* to nominee data as **intact**, with a
**two-part** trigger: *"counsel's A3.2/A3.3 revisit (due 2026-09-07) **PLUS** a consent basis that
reaches a non-member."* ⭐ `-160` cl.7 **lifted the A3.2/A3.3 hold**; the second half is what is missing.

⛔ **You cannot design a mechanism over a record that does not exist.** → **D5.**

⭐⛔ **AND THERE IS A SECOND GAP UNDER IT:** even if the instrument existed, the row does ⛔ **not
identify the subject** it would attach to — ⛔ no FK to `member_nominees`, ⛔ no rank, ⛔ no match rule.
⚠ **A human approval chain DOES guard the account** (verifier → state trustee → freeze), ⛔ **but it
cannot SEE the holder name** — the only read-back is a presence boolean. → **D5-subject**, under D5.

### Trap 2 — ⭐⛔ THE ALLOWLIST ENTRIES ARE RULED, ⛔ BUT THE TIMING IS ALSO RULED

`2026-08-28-165` **cl.1** ruled **all four** fields in scope on `sahyog-vivran` —
`account_holder_name` · `account_number` · `ifsc` · **`vpa`** (⭐ `vpa` was the genuinely open one and
is ruled **IN**, consistent with its role as the UPI-Intent `pa=` destination). **cl.3** ruled that
**Story 11b.3 adds them at surface declaration** — ⚠ which the D6(b) split reassigns **to this
story**, because the duty **travels with the fields** ([[feedback_closure_language_precision]] — the
obligation **moves**, it does ⛔ not evaporate; 11b.3's Task 0 records the move).

⛔⛔ **AND THE TIMING RULE IS PART OF IT** (routing note **§11**): *"⚠ ⛔ Not added now: the matrix
check is one-directional, so a pre-added entry is a standing permission with ⛔ no subject."*
⇒ **the four entries and the four field declarations land in the SAME commit.** ⛔ Never one without
the other.

⚠ **Four entries, ⛔ not one.** The allowlist pins **(surface, field)** pairs — *"a widening that
**pins identity** is not the same act as a widening that raises a ceiling"* (`matrix.ts:381-385`).

⭐ **This story also owes 11b.3's AC2 test an update in the same commit.** ⚠⛔ **AND THE UPDATE IS
`+4`, ⛔ NEVER `0 → 4` — ⛔ READ THE CURRENT VALUE, ⛔ do not assume it.** This story and **11b.3b** are
declared independent and may run **in parallel**, and 11b.3b adds **two** entries of its own. ⇒ if
11b.3b merges first the assertion already reads **2** and the correct update is **2 → 6**; hard-coding
`0 → 4` silently **deletes 11b.3b's two entries from the count** and leaves the control asserting a
number that is smaller than the truth — which is the one direction in which this gate fails **open**.
⛔ Leaving it at 0 and deleting the test is the inverse of the control.

### Trap 3 — ⭐⛔ *"CONFIGURATION OVER ONE RECORD"* IS THE LOAD-BEARING PHRASE, AND A BOOLEAN IS A **DEFECT**

`2026-08-28-160` **cl.10(d)**, verbatim: policy must move **full public disclosure → shorter
post-campaign exposure → immediate masking → permanent masked presentation** ⛔ **WITHOUT redesigning
the underlying bank-detail record** and ⛔ **without a schema change.** ⇒ *"**configuration over one
record**, ⛔ never a second record and ⛔ never a boolean. A later 'simplification' to a boolean is a
**defect**, not a cleanup."*

⇒ ⛔ **Do NOT add `is_masked` to `claim_nominee_bank_accounts`.** ⛔ Do NOT write a second, masked copy
of the row. ⭐ The ruled shape is a **per-Pariwar effective-window schedule** — model it on
`pool_fixed_amount_schedule`, which the Panel named as the precedent.

⚠ **And cl.10(g) is the other half:** *"complete bank details remain available in the protected
internal record."* ⇒ masking is a **projection**, ⛔ never a deletion, ⛔ never an overwrite, ⛔ never
a re-encrypt.

### Trap 4 — ⛔ MASKING DOES ⛔ NOT CREATE A SECOND TIER, AND THE ARGUMENT THAT IT DOES IS **FORECLOSED**

`2026-08-28-165` **cl.2**, BigDev verbatim: *"Do not create a separate Tier-1 classification merely
because the public projection is masked. The underlying account fields remain Tier-1. Treat masking as
a presentation/projection policy."*

⇒ the fields are **Tier-1 in every state** — full during the active campaign, masked after it — so the
**four Trap-2 entries cover both** and the masked projection needs ⛔ **no entries of its own**.
⭐ **And a specific future argument is foreclosed:** *"the masked view is only last-4, so it isn't
really Tier-1."* ⛔ **It is.**

### Trap 5 — ⚠ `vpa` IS RULED IN, ⛔ AND IT IS EMPTY FOR EVERY NOMINEE TODAY

`vpa_ciphertext` is **nullable by design** — *"a nominee without a VPA is a first-class state (do NOT
chain `.notNull()`)"* — and Story **8.4** shipped the VPA **resolver seam ABSENT** (`{available:false}`),
deferring collection to its own story ([[project_nominee_vpa_deferred_seam]]).

⇒ ⛔ **do not treat a null `vpa` as an error, a gap, or a reason to hold the render**, and ⛔ do not
build a collection surface here. ⭐ Render **nothing** for a null — ⛔ no placeholder, ⛔ no *"not
provided"* marker (an omission that announces itself is an enumeration signal, and this surface is
already the most sensitive one in the epic).

### Trap 6 — ⛔ THE DECRYPT HAPPENS AT `apps/api`, AND `apps/public` MUST ⛔ NOT GAIN THE CAPABILITY

D6(a) / `2026-08-20-143` cl.1: rendering a Tier-1 field needs a KMS decrypt, and *"the KEK is shared
across EVERY Tier-1 field class"* — so `apps/public` gaining the capability for **one** field class
gives it **all** of them. ⛔ Do not add a `withPublicScope` read to `apps/public`.

⚠ **And bound the amplification before you write the read.** `DIRECTORY_DECRYPT_CONCURRENCY = 8` exists
because 11a.3 found this exact cost. ⭐ **Here it is materially cheaper than the directory's**: a
Sahyog Vivran page decrypts **at most eight values** (four fields × at most two equal accounts), ⛔ not
a page of fifty rows — ⚠ but say so in writing rather than letting a reviewer re-derive it.

---

## Acceptance Criteria

### AC1 — The four fields are declared on `sahyog-vivran`, WITH their four ruled allowlist entries, in ONE commit

**Given** `2026-08-28-165` cl.1 (the four fields) + cl.3 (added at surface declaration) + the §11
timing rule (⛔ never pre-added)
**When** the fields land in `public-vs-private-matrix.yaml`
**Then** exactly four entries are added to `RULED_TIER1_PUBLIC_EXCEPTIONS` in
`packages/contracts/src/public-pages/matrix.ts` — `sahyog-vivran.nominee_account_holder_name` ·
`.nominee_account_number` · `.nominee_ifsc` · `.nominee_vpa` — **each citing `2026-08-28-165` cl.1**
**And** each YAML field carries a full `tier1_public_exception: {decision, rationale, scope}` block
whose **`scope`** states, in terms, that it reaches **`sahyog-vivran` only** and that **masking does
⛔ not change the tier** (`-165` cl.2)
**And** ⛔ **field declaration and allowlist entry land in the SAME commit** — a pre-added entry is *"a
standing permission with ⛔ no subject"*
**And** ⭐ **11b.3's AC2 Tier-1-count test is updated by `+4` in the same commit — ⛔ READ the current
value, ⛔ NEVER hard-code `0 → 4`** (Trap 2). **11b.3b runs in parallel** and adds **two** entries of
its own: if it merged first the assertion already reads **2** and the correct value is **6**.
⚠⛔ A hard-coded `4` silently deletes 11b.3b's two from the count and leaves the control asserting a
number **smaller than the truth** — the one direction in which this gate fails **OPEN**. ⛔ The test is
⛔ **not** deleted
**And** ⛔ **no fifth entry is added** — the deceased member's name and the contributor name belong to
**11b.3b** and are gated on their own Panel rulings.

### AC2 — Complete nominee bank details render PUBLICLY during an active campaign [`-160` cl.10(a)]

**Given** cl.10's ruled framing — the Panel does ⛔ **not** treat public bank details as an automatic
reason to prohibit publication, and the transparency benefit during an active Sahyog Drive is
**accepted** — ⭐ **and `D5(a)` (`2026-09-02-177`): this renders UN-GATED**, with ⛔ no per-subject
consent gate, ⛔ no `consentExists` predicate and ⛔ no minted `consent_type`
**When** the pool is in the **`live`** state (collecting; ⛔ not yet `closed`/`settled`)
**Then** the **complete** details render at the `public` tier for **each of the at-most-two equal
accounts**: `account_holder_name` · `account_number` · `ifsc` · `vpa`, each through `<MatrixField>` so
`getVisibility()` is the **only** thing deciding what appears
**And** `bank_name` / `branch` render from **Tier-3 plaintext** — ⛔ nothing is decrypted for them
**And** ⚠⛔ **`account_holder_name` is ⛔ NOT linked to a declared nominee** — ⛔ do ⛔ **not** join to
`member_nominees`, ⛔ do not add a match rule, and ⛔ do not render it labelled *"Nominee"*: 6.8's **D1**
removed that linkage deliberately (**D5-subject**). ⭐ Label it for what the column holds — the
**account holder** — ⛔ never for what a reader assumes it holds
**And** ⚠⭐ **the value is guarded by a human approval chain that ⛔ cannot SEE it** (D5-subject): the
verifier console has ⛔ no bank surface and the only read-back is a **presence boolean**. ⇒ ⛔ **this
story publishes to the internet a value ⛔ no approver in that chain can read** — ⛔ state it in the
route header beside the decrypt, ⛔ never leave it for a reviewer to find
**And** ⛔ the two accounts are presented as **EQUAL payment destinations** — ⛔ no "primary" /
"secondary", ⛔ no ordering that implies preference, ⛔ no routing or split. `account_rank` is composite-PK
identity, ⛔ **not a priority and ⛔ not a nominee rank**
**And** ⛔⛔ **the write-up must NOT say *"consent makes it lawful but not safe"*, and must NOT claim
that knowing a name and bank details by itself enables banking fraud** — cl.10 forbids **both**
framings in terms. ⭐ The stated concern is the **broader public exposure / security posture** and the
**ability to reduce it as TWT grows**
**And** the decrypt happens **server-side at the `apps/api` boundary**, bounded and documented
(Trap 6); ⛔ `apps/public` gains ⛔ **no** KMS dependency
**And** ⭐⛔ **THE ROUTE'S ONLY ENUMERATION BOUND IS `limits.search`, AND IT IS UNSTATED — ⛔ say so
where the decrypt is.** `P-YYYY-MM-###` is **sequential**, this is a **single-item GET on a path
parameter**, and 11b.3's **D11(a)** recorded controls **2**/**3** structurally N/A *precisely because
there is no `page` and no `limit` to bind them to* — ⚠ it was option **(c)** that would have obliged
the route to name what bounds **identifier enumeration**, and (c) was ⛔ **not** ruled. ⇒ ⭐⭐ **this
story is what makes that gap expensive:** four **decrypted Tier-1** fields, `D8-default` **FAIL-OPEN**
for every Pariwar until the Trust acts (`-179` cl.1), behind a **walkable** identifier. ⛔ State the
bound in the route header **beside the decrypt**, ⛔ never leave it for a reviewer to re-derive
**And** ⚠⛔ **if `limits.search` is judged insufficient for a Tier-1-bearing single-item GET, that is a
DECISION, ⛔ not a tuning knob** — ⛔ do ⛔ not quietly tighten or loosen the tier here (11b.3's
`D4-linkage` routes this question to this AC by name)
**And** ⭐⛔ **THIS STORY MAKES THE THIRD PUBLIC-PAGES ROUTE `PII-BEARING`, AND THE ROUTE'S WRITTEN
DEFENCE MUST MOVE WITH IT — ⛔ IN THIS COMMIT.** `apps/api/src/modules/public-pages/routes.ts:52-55`
rules that the control set is a property of *"an unauthenticated, paginated, **PII-BEARING** public
collection"*, and 11b.3 shipped the route **without** that property under **D11**. ⇒ the `routes.ts`
header **and** the `login-wall.spec.ts` allowlist entry are both updated to state the set that now
applies, ⛔ **both stating the SAME count** — *"two authoritative documents disagreeing on how many
controls exist is the defect this file records having already had once"*. ⛔ **Do ⛔ not leave them
describing a zero-Tier-1 route while serving four Tier-1 fields**
**And** ⚠⛔⛔ **11b.3b RESTORES A DIFFERENT PROPERTY ON THE SAME TWO DOCUMENTS, IN PARALLEL — ⛔ READ
WHAT IS THERE AND EXTEND IT, ⛔ NEVER OVERWRITE IT.** 11b.3b flips `paginated` `false → true` and owes
this same pair its own update; the two stories are declared **independent and parallel**. ⇒ if 11b.3b
landed first the set already names the **pagination** controls, and replacing it with a PII-only set
**drops a control both documents must state identically** — which is the two-documents-disagreeing
defect `routes.ts` records having already had once, arrived at from the other side

### AC3 — The masking schedule: Trust-Admin, PER PARIWAR, configuration over ONE record [cl.10(b)–(d), (g)]

**Given** cl.10(d)'s **load-bearing** future-proofing requirement and the `pool_fixed_amount_schedule`
precedent the Panel named
**When** the schedule is built
**Then** it is **Trust-Admin controlled, PER PARIWAR**, measured **from campaign closure/settlement**,
expressing three settings: **0 days** (mask immediately) · **N days** · **permanent masking**
**And** it stays **reversible and re-configurable** — a later change applies to the projection, ⛔ never
to the record
**And** ⛔⛔ **it is a SEPARATE per-Pariwar effective-window schedule row — ⛔ never a boolean, ⛔ never
a column on `claim_nominee_bank_accounts`, ⛔ never a second copy of the bank row.** ⭐ *"A later
'simplification' to a boolean is a **defect**, not a cleanup"* — say so **in the schema file**, where
the person tempted to simplify it will be reading
**And** cl.10(b) is honoured: ⛔ **immediate masking is NOT hard-coded** — *"0 days"* is a **value an
admin chose**, ⛔ not a default the code assumes
**And** cl.10(g): **complete bank details remain available in the protected internal record** —
⛔ masking is a projection, ⛔ never a deletion, overwrite or re-encrypt
**And** ⛔ **the predicate reads the pool's settlement instant and the schedule, and NOTHING about any
member** — ⛔ no `members.state`, ⛔ no `is_valid`, ⛔ no moderation overlay (Policy meaning, cl.10(f)).

### AC4 — The masked projection is DEFINED HERE, ⛔ not left to implementation discretion [cl.10(e)]

**Given** cl.10(e), which specifies the projection rather than delegating it
**When** the schedule says the details are masked
**Then** the public projection retains the **last 4 digits** of the account number plus the **bank /
branch / IFSC** identification needed for verification
**And** ⛔ **the complete account number is NOT exposed after masking**
**And** the masking is a **pure function over the decrypted value at the boundary** — ⛔ the full value
never crosses the wire once masked, so ⛔ *"mask it in CSS/JS"* and ⛔ *"send it and hide it"* are both
out
**And** the tier is **unchanged** — ⛔ no second Tier-1 classification is minted, and the AC1 entries
cover both states (Trap 4)
**And** ⚠ the masked value is announced to assistive tech as **one coherent field**, ⛔ never as a bare
truncated string a screen reader reads digit by digit.

### AC5 — The Trust-Admin knob surface

**Given** the schedule from AC3
**When** the authorised holder opens it — ⚠⛔ **and "Trust Admin" is `-160` cl.10's phrase, ⛔ NOT a
role: there is ⛔ no `trust_admin` in the seeded set. WHO holds this is `D8(ii)`, ⛔ not an authoring
choice**
**Then** they can set and re-set **0 / N / permanent** for their Pariwar, and see what is currently in
effect and from when
**And** ⚠ the permission is checked against the **existing** key catalog first — ⛔ **a new permission
key is a catalog VERSION BUMP, a ratified governance act, ⛔ not a code change**
([[project_helpdesk_operator_surface_103]]). ⚠ ⛔ And the version is ⛔ **not a key count** — 10.18 and
6.17 both bumped with **zero** keys, so a bump is owed even when only a **holder** changes
**And** ⛔⛔ **the closest existing key, `pariwar.manage_public_name_presentation`, is `super_admin`
ONLY — and that exclusion IS a ruling** (`kyc/presentation-policy.ts:11-13`). ⛔ Do ⛔ **not** grant
this knob to `pariwar_admin` *"for symmetry"*: that file calls it *"reversing a ratified ruling by way
of a catalog edit … its own Panel decision, not a tidy-up"* → **D8(ii)**
**And** ⛔ `district_admin` is **DEFERRED** and `state_trustee` **EXCLUDED** — either grant is **INERT**
under scope containment ([[project_rbac_geo_scope_containment]]). ⛔ Seed neither
**And** the change is attributed with `users.display_name` **snapshotted at action time** — ⛔ never
email-derived, ⛔ never resolved at read time ([[project_admin_display_name_attribution]])
**And** the change is **audit-logged via Story 1.10**
**And** ⛔ RBAC geo-scope containment is **asymmetric** — a narrower grant never satisfies a broader
check, and `pariwar` outranks `state` ([[project_rbac_geo_scope_containment]]).

### AC6 — The edge-cache cost is stated where an operator will read it

**Given** the inherited property that the pull lever is ⛔ **NOT IMMEDIATE**
**When** an admin flips the knob
**Then** the surface tells them, in words, that a change is **not immediate**: `s-maxage=300` means the
previous projection keeps being served **from every warm PoP for up to five minutes**
**And** ⛔ **direct SQL is NOT offered as the operational fallback**, in the copy or anywhere else
**And** the same statement appears in the schema file and in the route header — ⚠ three places, because
this is the property most likely to be discovered during an incident rather than before one.

### AC7 — Accessibility + microcopy

**Then** the fields hold **family 13 (Semantic accessibility, AI-11a-3)** of
`_bmad/custom/load-bearing-invariant-checklist.md:72`, and the masked/full states are each announced
coherently (AC4)
**And** ⚠⛔ **family 13 is written in REACT-NATIVE vocabulary and this is an ASTRO surface** — 11a.6's
worked example is `apps/mobile/components/panchayat/PinnedItem.tsx`, and `accessible={true}` /
`accessibilityLabel` have ⛔ **no HTML equivalent**. ⇒ hold it in its **web form**: the account block is
one grouping element with `role` + `aria-label`, ⛔ never a bare `<div>` carrying a label no role
announces — which matters more here than anywhere in the family, because a masked account number read
digit-by-digit is the exact failure AC4 names
**And** ⭐ the same translation is owed on the **admin knob** surface, which is neither Astro nor RN
**And** any new copy lands in the `sahyog-vivran` locale namespace **already in `microcopy.yaml`
`scope.copy_globs`** (11b.3 added it) — ⛔ do not add a second namespace to dodge the gate
**And** the admin-side copy carries the non-immediacy statement from AC6.

### AC8 — What this story does ⛔ NOT build is ROUTED

**Then** `deferred-work.md` gains this story's section recording, each with a trigger: ⭐⭐ **the Claim
Terms acceptance substrate — D5(a)'s ROUTED mechanism, recorded UN-ATTESTED** ([[feedback_record_unattested_no_backfill]]),
**and, ⛔ in the same item, counsel's third-party objection (11b.1 item (a), `2026-08-24-157` cl.3(b))
recorded CARRIED AS RISK** — ⛔ *"carried"*, ⛔ never *"closed"*, ⛔ never *"resolved via deferral"*:
`-160` cl.7 lifted only the FIRST half of its two-part trigger, and ⛔ **this story ships without the
second** ·
⭐ **the ACCOUNT-HOLDER SUBJECT gap** (**D5-subject**, ⚠ **narrowed 2026-09-02**) — ⚠ it **survives a
D5(a) ruling**, because building un-gated does ⛔ not make the holder a nominee. ⭐ Route **BOTH** halves:
**(i)** the consent-subject gap, with the **two-document contradiction** named
(`nominee-accounts.ts:18` vs `claim_nominee_bank_accounts.ts:7-11`), trigger *the first story that
revisits nominee-bank collection, or any Claim Terms substrate work*; and **(ii)** ⭐ **the
UN-MECHANIZED APPROVER DUTY** — the holder name reaches ⛔ **no** approval surface
(`NomineeBankStatusResponse` is a presence view), so the verifier cannot exercise the check the
process assumes. ⛔ **A verifier-console change, ⛔ not this story's** — trigger: *the next story
touching Story 6.10's console, or any story that adds a Tier-1 decrypt to an approval surface* ·
**VPA collection** (8.4's deferred seam — ⛔ not built here) · the **post-masking
authenticated-member presentation** (`-164` A2: *"a separate future decision — ⛔ not carried, ⛔ not
foreclosed"*) · the **edge-cache blindness** of any abuse counter on this surface (11b.1 item (g),
⛔ re-affirmed, ⛔ not re-filed)
**And** ⛔ **the `epics.md` annotation is 11b.3's Task 0, ⛔ not this story's** — ⛔ do not write a
second one ([[feedback_circular_deferral_between_sibling_stories]] — ⛔ never route an obligation to a
sibling that routes it back).

---

## Tasks / Subtasks

- [x] **Task 0 — ⛔ TRANSCRIBE-or-STOP.** (AC: all)
  - [x] ✅ **VERIFIED LIVE 2026-09-02 — `11b-3` is `done` AND MERGED.** `git fetch origin`; `git rev-list --left-right --count origin/main...HEAD` = `0 0`; all five 11b.3 commits (`254e9fe`…`e16cc69`) are on `origin/main` ([[feedback_git_fetch_before_remote_reasoning]]). ⛔ **Verify `11b-3` is `done` AND MERGED** before starting. This story declares fields on a
        surface 11b.3 creates.
  - [x] ✅ **11b.3's `D4` RULED (b)** — `live` + `closed` + `settled`. ⇒ AC2 **has a host** and this
        story does ⛔ **not** widen the predicate. ⚠ `D4-linkage` (linked vs identifier-only) is open.
  - [x] ✅ **READ AND DISPOSED (`2026-09-02-183` cl.5): STATE THE BOUND WHERE THE DECRYPT IS** — `routes.ts` header + `login-wall.spec.ts` entry + beside the handler decrypt. ⛔ The tier is ⛔ NOT tightened and ⛔ NOT loosened (AC2: that is a DECISION); ⛔ no inbound link to a `live` drive is added. ⚠⛔ **Read `D4-linkage` as an ENUMERATION question, ⛔ not only a discoverability one.** 11b.3
        raised it as *"is a `live` pool's page linked?"*; ⭐ **on this story the live question is what
        bounds someone WALKING the sequential identifier** to four decrypted Tier-1 fields (AC2).
  - [x] ✅ **11b.3's `D11` RULED (a)** — the route states **three** applicable controls, with controls
        2/3 recorded N/A. ⚠⛔ **This story makes the route PII-bearing**, so **Task 4 owes `routes.ts` +
        `login-wall.spec.ts` an update** to the set that applies then — ⛔ both stating the same count.
  - [x] ✅ **Head re-read immediately before writing: `2026-09-02-182`. Next free = `2026-09-02-183`, MINTED.** ⛔ 11b.3b has minted nothing; ⛔ no renumber, ⛔ no merge into a sibling's entry. Re-read `.decision-log.md` head; take the next free number. ⚠ **11b.3a and 11b.3b mint against
        the same head** — re-read immediately before writing; ⛔ never renumber or merge into a
        sibling's entry.
  - [x] ✅ **D5 RULED (a) — 2026-09-02** (`2026-09-02-177`): build **UN-GATED** on cl.10(a); the
        mechanism is **routed**; the missing instrument is recorded **UN-ATTESTED** and counsel's
        third-party objection is **CARRIED AS RISK**. ⛔ Already transcribed — ⛔ do not re-transcribe.
  - [x] ✅ **CARRIED at `-183` cl.6 and written into AC8's `deferred-work.md` section (Task 6).** ⛔⛔ **CARRY (a)'s PRICE INTO THE BUILD, ⛔ do not ship only its permission.** AC8 must record
        the un-attested substrate **and** counsel's standing objection — ⛔ *"carried"*, ⛔ never
        *"closed"* or *"resolved via deferral"* ([[feedback_closure_language_precision]]).
  - [x] ✅ **FIRED — a new key IS needed. `D8(i)` transcribed at `-183` cl.1-3: `pariwar.manage_nominee_bank_masking`, v38 → v39, `super_admin` ONLY.** ⛔ **Transcribe D8 IF a new permission key turns out to be needed** (AC5). ⚠ Conditional — it
        fires at build time, ⛔ not before. ⛔ Never mint a key silently.
  - [x] ✅ **PUT — in its CURRENT (narrowed) form, at `-183` cl.6 + its two Open Follow-ups, and routed at AC8 in BOTH halves.** ⚠ **Put `D5-subject` in front of whoever rules D5** (⚠ **narrowed 2026-09-02** — read the
        current form, ⛔ not the withdrawn one): the row does ⛔ not identify the **nominee** the
        instrument's subject would be, **and** the approval chain that guards the account ⛔ **cannot
        see the holder name** — the only read-back is a presence boolean. ⭐ It **survives a D5(a)
        ruling** and is ⛔ not answered by one.
  - [x] ✅ `governance:` commit landed FIRST, before the first line of implementation ([[feedback_governance_commits_precede_implementation]]).

- [x] **Task 1 — The masking schedule substrate** (AC: 3)
  - [x] ✅ **ONE SUBJECT, written into the schema header with `-175`'s correction named.** ⭐ **THE SCHEDULE HAS EXACTLY ONE SUBJECT: the four nominee bank fields.** ⚠ Recorded because
        it was briefly in doubt: `2026-09-02-174` cl.3 appeared to extend cl.10's staged schedule to
        **contributor names**, which would have given this table a second subject. ⛔ **That was
        corrected the same day, Panel-ratified** (`2026-09-02-175`) — the staged reduction is the
        **nominee bank fields'**, ⭐ which is what cl.10 always said, and the *nominee's* name is the
        phrase's true referent. ⇒ **`D12-schedule` is VACATED** (⛔ its question ceased to exist) and
        ⛔ **nothing about this story ever moved.** ⛔ Do ⛔ not generalise the table to *"any masked
        field"* on the strength of a withdrawn clause.
  - [x] ✅ `pariwar_nominee_bank_masking_schedule` + migration **0113** + RLS, modelled on `pool_fixed_amount_schedule` (version / `[effective_from, effective_until)` / at-most-one open head). New per-Pariwar effective-window table + migration.
  - [x] ✅ Written into **both** the schema file and migration 0113's header, with the three forbidden shapes named (`is_masked` column · a second masked row · a boolean/one-nullable-int collapse).
  - [x] ✅ `claim_nominee_bank_accounts.ts` is **untouched** — verified by `git diff --stat`.
  - [x] ✅ **7 live-DB tests green** (`tests/integration/claim/nominee-bank-masking-schedule.spec.ts`) + **14 pure tests**. ⛔ No migration regenerated, ⛔ no `DROP SCHEMA`, membership/explicit-value assertions only. ⭐ Found mid-write: a failed CHECK probe ABORTS the tx, so probes 2 and 3 returned a false-`undefined` — each now runs inside its own raw SAVEPOINT ([[project_domain_limit_clamp_and_savepoint_retry]]).

- [x] **Task 2 — The projection function + the boundary read** (AC: 2, 4)
  - [x] ✅ `maskAccountNumberLast4` + `isNomineeBankMasked`, **14 pure tests**. ⭐ `null` at **four OR FEWER** digits — at exactly four, *"the last four"* IS the whole number, which cl.10(e) forbids exposing. Null `vpa`, separators, and the negative/non-integer/over-ceiling throws all covered.
  - [x] ✅ Decrypt at `apps/api` via `mapWithConcurrency(DIRECTORY_DECRYPT_CONCURRENCY)`, reusing `decryptNomineeBankFieldSoft`. ⭐ Bound WRITTEN DOWN in the handler, the route header and the login-wall entry: **at most EIGHT** per page, and only **TWO per account** when masked (cl.10(e)'s retention list excludes holder name + VPA). ⛔ `apps/public` gains no KMS dependency (`no-kms-in-public.test.ts` still green).
  - [x] ✅ **STRUCTURAL, ⛔ not a convention**: the wire is a discriminated union whose masked arm has ⛔ NO `accountNumber` / `accountHolderName` / `vpa` key, and `.strict()` makes populating one a parse error. Asserted against the RAW serialized body in the live-DB spec, ⛔ not merely against a parsed field.

- [x] **Task 3 — Declare the four fields + the four allowlist entries, in ONE commit** (AC: 1)
  - [x] ✅ Six YAML fields (four Tier-1 + two Tier-3 siblings that carry ⛔ no exception and need none) with full `{decision, rationale, scope}` blocks, and four `matrix.ts` entries citing `2026-08-28-165 cl.1` — **same commit**.
  - [x] ✅ **READ, ⛔ not assumed.** Verified live: 11b.3b is `ready-for-dev` and unmerged ⇒ the surface assertion read **0** and is now **4** BY NAME; the matrix-wide identity assertion read **2** and is now **6** BY NAME. ⛔ Neither deleted; both assert IDENTITY, ⛔ not a count.
  - [x] ✅ A per-ROW mapping (`SAHYOG_VIVRAN_NOMINEE_ACCOUNT_FIELD_IDS`) + a REPRESENTATIVE SHAPE, on the `/members` precedent. ⭐ Load-bearing here: deriving from `accounts[0]` would shrink the set on every bank-detail-less AND every MASKED drive — the vacuous leg, per request. Set 10 → 16.

- [x] **Task 4 — Render them on the surface + move the route's written defence** (AC: 2, 4, 7)
  - [x] ✅ Both amended, both stating **FOUR** (three + the bounded, projected Tier-1 read). ⛔ The stale *"carries ZERO Tier-1 fields"* / *"there is nothing to decrypt"* claims are AMENDED and NAMED, ⛔ not deleted. ⭐ 11b.3b had not landed; both documents now tell it its count is **SIX** and to EXTEND, ⛔ never overwrite.
  - [x] ✅ Stated in **three** places — the route header, the login-wall entry and beside the handler's decrypt — with `2026-09-02-183` cl.5's rule that judging it insufficient is **A DECISION**, ⛔ not a tuning knob, in either direction.
  - [x] ✅ Pure `nomineeAccountRow` mapper + the `.astro` block. ⛔ The render module has nothing to hide: the masked arm arrives with no full value, so *"mask it in CSS/JS"* cannot be reintroduced by accident.
  - [x] ✅ All six through `<MatrixField>`; ⛔ no session read added (`authenticated-fragment.test.ts` + `no-kms-in-public.test.ts` green).
  - [x] ✅ The whole cell is OMITTED for a null `vpa` (and for a null branch / holder / IFSC) — ⛔ no placeholder, ⛔ no *"not provided"* marker.

- [ ] **Task 5 — The Trust-Admin knob** (AC: 5, 6)
  - [x] ✅ **`D8(ii)` RULED 2026-09-02 (`-178`): `super_admin`, the Trust centrally.** ⛔ `pariwar_admin`
        is **foreclosed**; ⛔ `district_admin` / `state_trustee` stay excluded (inert).
  - [ ] ⭐ **`D8(i)`: MINT the key, granted `super_admin` ONLY**, as a **catalog version bump** from
        **v38** — a governed act, ⛔ not a code change. ⛔ Do ⛔ not overload
        `pariwar.manage_public_name_presentation`; ⭐ **do** cross-reference it — the two are the same
        class under the same authority now (`-178` cl.2).
  - [x] ✅ **`D8-default` RULED FAIL-OPEN** (`-179` cl.1) — no row ⇒ details stay **visible** until the
        Trust sets a window. ⛔ Do ⛔ **not** default to masked; that is the assumption cl.10(b) forbids.
  - [ ] ⚠ **Amend the `sahyog-drive.deceased_member_name` exception's `rationale:`** while you are in
        `public-vs-private-matrix.yaml` — it says D10's Panel ratification is **OWED**, which is now
        **stale** (`-179` cl.2 ratified it). ⛔ **Amendment, ⛔ never a rewrite** of the surrounding
        grounds ([[feedback_supersede_never_reinterpret]]).
  - [ ] Admin screen. ⚠⭐ **This is the project's FIRST self-serve presentation-toggle UI** — 11a.1
        shipped none by design. ⛔ Not a blocker; ⛔ do say so in the story record.
  - [ ] ⭐ **Reuse the governed-config SHAPE, ⛔ not the key:** `kyc/presentation-policy.ts` already
        enforces required `rationale` + actor + display snapshot + a §1.5 hash-chain **audit anchor**,
        and **refuses a write carrying neither**. ⛔ Do ⛔ not re-invent that accountability wrapper.
  - [ ] `users.display_name` snapshot at action time; audit via 1.10.
  - [ ] The non-immediacy statement, in **all three** places (AC6).

- [ ] **Task 6 — Route what is not built** (AC: 8)
  - [ ] Write this story's `deferred-work.md` section, every item with a trigger.

---

## ⚖️ Decisions — ✅ **D5 RULED (a) 2026-09-02** (`2026-09-02-177`). ⛔ **ZERO BLOCKING.** ✅ **ALL RULED.** `D8(ii)` `super_admin` (`-178`) · `D8-default` **FAIL-OPEN** (`-179`). ⛔ **ZERO BLOCKING** — `D8(i)` is BigDev's governed act; `D5-subject` observational + routed · `D5-subject` open + routed, ⛔ made non-blocking by D5(a)

### ✅ D5 — RULED **(a)** by BigDev, 2026-09-02 — **BUILD UN-GATED**, mechanism routed, absence recorded **UN-ATTESTED**

⭐ `2026-09-02-177`. Built on **cl.10(a)**, which authorises public display during an active campaign.
⭐ **Ground:** cl.10 is a Panel ruling about **this exact data on this exact surface**, so what is
missing is a **RECORD-KEEPING instrument**, ⛔ **not an authorisation**.
⇒ ⛔ **no per-subject consent gate is authored** · ⛔ no `consentExists`-shaped gate (11b.9's D5) ·
⛔ **NO `consent_type` value is minted** (`-162` retired the three types; re-wording one *"was on the
table and was rejected on the record"*).

⚠⛔⛔ **AND (a)'s PRICE IS PART OF (a) — ⛔ it is not a footnote, and it must ⛔ not decay:**
- ⛔ **The Claim Terms substrate does ⛔ NOT exist** — recorded **UN-ATTESTED**, ⛔ never back-filled
  ([[feedback_record_unattested_no_backfill]]).
- ⛔⛔ **Counsel's third-party objection STANDS and is CARRIED AS RISK.** `deferred-work.md` **11b.1
  item (a)** — `2026-08-24-157` cl.3(b), **intact**, two-part trigger. `-160` cl.7 lifted the **first**
  half; ⛔ the second — *"a consent basis that reaches a **non-member**"* — is exactly what is missing,
  and **(a) ships without it.** ⛔ **CARRIED**, ⛔ not closed, ⛔ not "resolved via deferral".
- ⚠ **`D5-subject` is made NON-BLOCKING, ⛔ NOT resolved** — un-gated means ⛔ nothing gates on
  identifying a subject; the instrument gap **and** the un-mechanized approver duty stay open.
- ⛔ **(a) adopts ⛔ NEITHER reading of cl.10(a)** — ⛔ not (i) *"about the ACCOUNT"*, ⛔ not (ii)
  *"about the NOMINEE's data"*. ⭐ **Only the Panel can decide that**, and ⛔ nobody may cite this as
  having done so.

⭐⭐ **AND BUILT IS ⛔ STILL NOT PUBLISHED.** (a) authorises the **BUILD** only. ⛔ What keeps this dark
is **deployment plus the counsel/Panel process** — ⛔ never a code mechanism, ⛔ **never** the kill
switch ([[project_directory_launch_gated_on_killswitch_ui]]).

<details><summary>⛔ The question as put (kept as the record)</summary>

**The nominee data's MECHANISM, when its BASIS has no instrument (Trap 1, AC2)**

`-160` cl.3 preserves the basis — **the nominee's own Claim Terms acceptance** — and the epic AC says
*"the **mechanism** for each class is this story's to design; ⛔ only the **basis** is settled."*
⛔ **There is no Claim Terms document, no version table, no acceptance record, and no `consent_type`
value.** ⚠ And `deferred-work.md` 11b.1 item (a) records counsel's third-party objection to nominee
data as **standing**, with a two-part trigger whose second half — *"a consent basis that reaches a
non-member"* — is exactly what is missing.

- **(a) Build the render UN-GATED**, on the strength of cl.10(a)'s explicit authorisation of public
  display during an active campaign, and **route the mechanism** with the absence recorded openly as
  **un-attested** ([[feedback_record_unattested_no_backfill]]). ⚠ *Reading: cl.10 is a Panel ruling
  about **this exact data on this exact surface**, so what is missing is a **record-keeping**
  instrument, ⛔ not an authorisation.* ⭐ *Authoring recommendation.*
- **(b) Build it FAIL-CLOSED** on a predicate that is false until the substrate exists — the 11b.9
  posture (inert, ⛔ not broken). ⚠⛔ **But 11b.9's D5 forbids the obvious form of this:** *"⛔ Do ⛔ not
  author a `consentExists`-shaped publication gate here and plan to retire it later — that is the
  exact defect 11b.9 exists to correct."* ⇒ (b) is only available in a shape that is ⛔ **not**
  `consentExists`-shaped, and naming that shape is part of ruling it.
- **(c) DEFER the nominee bank half entirely** until a Claim Terms substrate exists. ⚠ That empties
  this story of its subject and leaves 11b.3a as the masking substrate alone — a legitimate outcome,
  ⛔ but it must be a **ruling**, ⛔ never a drift.

#### ⭐⛔ D5-subject — **NARROWED 2026-09-02.** The approval chain EXISTS — ⛔ but it ⛔ CANNOT SEE the field it is assumed to verify

⚠ **OBSERVATIONAL. ⛔ It prescribes nothing and rules nothing** ([[feedback_gap_analysis_observational]]).

> ⭐⛔ **CORRECTED, ⛔ NOT DELETED. The first form of this finding OVERSTATED the exposure and is
> withdrawn here** ([[feedback_closure_language_precision]] — the claim was **wrong**, ⛔ not merely
> superseded). It quoted the schema's *"the filer types a holder name per account, full stop"* and
> presented it as though **nothing** checked the value. ⚠ **BigDev challenged that**, asking whether
> verifying the holder is not the claim approver's job before a drive is approved. ⭐ **It is, and a
> real control chain exists.** ⛔ The first version had ⛔ not traced it
> ([[feedback_trace_reachability_before_escalating]] — the same discipline applied in only one
> direction).

⭐ **WHAT ACTUALLY GUARDS IT — verified live, and it is more than was first recorded:**
- **Bank details are collected BEFORE the verifier decides.** The collectable window is
  `intake_converged` · `documents_pending` · `verification_in_progress` · `verifier_review`
  (`packages/domain/src/claim/errors.ts:198-203`).
- **After that the window narrows to `verifier_approved` ONLY** — ⛔ not open to the nominee, admin-only,
  gated on a **separate tier-2 permission** `claim.correct_nominee_bank`, and **audited +
  reason-required** (`:205-210`).
- **Past the claim/cycle freeze**, changes need *"the separately governed emergency correction
  workflow"* (`:212-214`).
- ⇒ ⭐ the details sit **inside** a multi-stage human chain — `verifier_review` → `verifier_approved`
  → `state_trustee_freeze` → `state_trustee_approved` → `approved` (`claim/state.ts:325-336`).

⭐⭐ **AND THAT IS EXACTLY WHY THE REAL FINDING IS SHARPER THAN THE ONE IT REPLACES: ⛔ NOBODY IN THAT
CHAIN CAN SEE THE HOLDER NAME.**

| Party | Sees `account_holder_name`? |
|---|---|
| The filer typing it | ✅ |
| **Verifier** (approves the claim) | ⛔ **NO.** Story 6.10's console (UX-DR39) mandates prior verifier comments · peer-mesh responses · ground-inspection notes + photos · similar-case precedents · reason-codes · trustee audit UI · cross-Pariwar scope. ⛔ **No bank surface**, and ⛔ no verification handler reads it |
| **State trustee** (freeze → approve) | ⛔ **NO** |
| **Admin making a tier-2 CORRECTION** | ⛔ **NO** — the read-back is `NomineeBankStatusResponse`, a **presence view**: `rank` · `bankName` · `ifscValidated` · **`holderNamePresent: boolean`** · `vpaPresent`. Its own doc-block: *"never echo account number / holder name / raw IFSC"* (`contracts/src/claims/nominee-bank.ts:107-122`). ⚠ ⇒ **they correct a name they cannot see** |
| Contributing member at payment | ✅ — Story 9.9's donor display, the **one** production decrypt (`apps/api/src/modules/payment/handlers.ts:305`) |
| ⭐ **The anonymous PUBLIC** | ✅ — **once this story ships** |

⇒ ⭐⭐ **THE INVERSION, STATED PLAINLY: this story would publish to the whole internet a value that
⛔ no verifier, ⛔ no state trustee and ⛔ no correcting admin in the approval chain can see.**

⚠⛔ **AND `ifsc_validated` IS ⛔ NOT CORROBORATION.** It is a **format + branch lookup** — it proves the
**bank branch** exists, ⛔ **not** that the **person** does, and ⛔ not that they are a nominee.

⭐ **THE SHAPE THIS IS:** the duty is real and the process is built for it, but it is
**UN-MECHANIZED** — the data is ⛔ not rendered where the approval happens. ⚠ *"Decay concentrates in
the un-mechanized half"* ([[project_mechanization_split_commitment]]).

**⇒ WHAT SURVIVES FOR D5, and it is narrower and better-evidenced than the first version:**
- ⭐ **The CONSENT-SUBJECT point stands.** Even a perfectly-verified account establishes that the
  **account** is legitimate; it does ⛔ **not** create a record that the **named holder accepted Claim
  Terms**. `-160` cl.3's instrument has a **subject** — the nominee — and the row still ⛔ does not
  identify one (⛔ no FK to `member_nominees`, ⛔ no rank, ⛔ no match rule).
- ⭐ **It STRENGTHENS reading (i) of cl.10(a)**, recorded under D5: that the ruling is about **THE
  ACCOUNT** — an operational payment coordinate the approval chain governs — ⛔ **not** about a
  nominee's informational PII. ⚠ ⛔ Still ⛔ not adopted here; ⛔ only the Panel can say.
- ⛔ **WITHDRAWN:** *"a filer may type any name and nothing checks it."* ⛔ Do ⛔ not repeat it.

⚠⛔ **AND TWO COMMITTED DOCUMENTS STILL DISAGREE** — ⛔ unaffected by this correction, and recorded
because the next reader will hit one of them: `packages/contracts/src/contributions/nominee-accounts.ts:18`
calls it *"`accountHolderName` (**the NOMINEE name**)"*, **assuming** the identity; the schema at
`claim_nominee_bank_accounts.ts:7-11` **denies** the linkage. ⇒ ⛔ **the SCHEMA is the authority**; the
comment is **recorded with a trigger**, ⛔ **not** swept as a drive-by.

⛔ **And a cross-check is still POSSIBLE and DELIBERATELY ABSENT** — `member_nominees.name_ciphertext`
exists and is `notNull()` — because 6.8's **D1** removed the nominee linkage on purpose (the accounts
are a **claim-scoped payment channel**, ⛔ not one row per nominee). ⛔ **Do ⛔ not "fix" this by adding
a join or a match rule.**

⭐ **WHAT WOULD ACTUALLY CLOSE IT is ⛔ not this story's act, and is named so it is ⛔ not re-derived:**
surfacing the holder name **on the verification console**, so the approver can exercise the duty the
process already assumes. ⚠ That is a **verifier-console** change (Story 6.10's family), it needs its
own PII-posture reasoning for a **Tier-1 decrypt at a new surface**, and ⛔ it is **routed, ⛔ not
built here**.

⚠⛔ **Whichever way this goes, ⛔ do NOT resolve it by minting a `consent_type` value.** The three
publication types were **RETIRED, ⛔ not reinterpreted** (`2026-08-28-162`), and re-wording one to
cover a new class *"was on the table and was **rejected on the record**"*
([[project_11b_consent_model_c5_superseded]]).

</details>

### ⛔ D8 — **RE-FRAMED 2026-09-02.** ⛔ The question is ⛔ NOT *"does it need a new key?"* — it is **WHO HOLDS IT**, and cl.10 and the 11a.1 precedent point in **OPPOSITE DIRECTIONS** (AC5, conditional)

⚠ **The first framing asked only whether a key must be minted. ⛔ That is the easy half and it is not
where the risk is.** Checked live at `79ed41d`:

**(1) ⛔⛔ THERE IS ⛔ NO `trust_admin` ROLE.** The seeded set is `super_admin · pariwar_admin ·
state_trustee · district_admin · block_admin · finance_officer · it_cell · verifier · auditor ·
field_worker · helpline_operator · trustee_panel` (`rbac/roles.ts`; `grep trust_admin` over
`packages/` + `apps/` returns **zero hits**). ⇒ `-160` cl.10's phrase *"**Trust-Admin** controlled, per
Pariwar"* was carried into AC5 **verbatim** and **maps to nothing**. It must resolve to
**`pariwar_admin`** (a tenant control) or to **`super_admin` / `trustee_panel`** (a governed act) —
⛔ **and those are opposite answers.**

**(2) ⭐⛔ THE NEAREST PRECEDENT DELIBERATELY WENT THE OTHER WAY.**
`pariwar.manage_public_name_presentation` (minted 11a.1, catalog **36 → 37**) governs the per-Pariwar
**public presentation mode** of a **Tier-1** field — structurally the **same class** as this knob. It
is **`super_admin` ONLY**, and `kyc/presentation-policy.ts:11-13` says the exclusion **IS** the ruling:

> *"granted to super_admin ONLY — ⛔ **deliberately NOT `pariwar_admin`**, which holds every other
> tenant-content key. **That exclusion IS the ruling, expressed in the catalog.**"*

⭐ **And its stated ground transfers almost word-for-word:** *"the authority that ruled full names would
be published is the Trustee Panel, so the authority to change that form is theirs too."* ⇒ the
authority that ruled nominee bank details publicly displayable is **also the Panel** (`-160` cl.10) —
so by the same reasoning the authority to decide **how long they stay visible** would be the **Panel's**.
⚠⛔ The catalog warns about exactly this move: granting this class to `pariwar_admin` *"for symmetry"*
would *"**reverse a ratified ruling by way of a catalog edit. It requires its own Panel decision, not a
tidy-up.**"*

**⇒ THE QUESTION, RE-POSED:**

- **D8(i) — the KEY.** ⭐ *Authoring recommendation: **MINT A NEW ONE.*** The masking schedule is a
  **distinct governed act** from the name form; overloading `manage_public_name_presentation` would
  make one key mean two unrelated things, and its own doc-block forbids widening it *"for symmetry"*.
  ⚠ A bump is a **ratified governance act**, ⛔ not a code change ([[project_helpdesk_operator_surface_103]]).
  ⚠ ⛔ And note the version is **⛔ NOT a key count** — 10.18 and 6.17 both bumped with **zero** keys
  (*"the catalog version is the version of the CAPABILITY MODEL"*), so a bump is owed even if a key is
  reused and only a **holder** changes.
> ## ✅ **`D8(ii)` RULED 2026-09-02 — THE TRUST CENTRALLY: `super_admin`.**
> Dhiraj Rahul + Kalpana Bharti; transcribed `.decision-log.md#decision-2026-09-02-178`.
> ⇒ cl.10(b)'s *"Trust-Admin controlled"* spoke to **AUTHORITY** and means the **Trust** — ⛔ **not** a
> Pariwar Admin. ⭐ **`2026-08-19-136` cl.3's two-axis separation is FOLLOWED**: the knob is
> **per-Pariwar in SCOPE, central in AUTHORITY**, exactly like the public-name control. ⇒ the two are
> now **aligned**, ⛔ not divergent.
> ⛔ **`pariwar_admin` is FORECLOSED** — granting it "for symmetry" is the *"reverse a ratified ruling
> by way of a catalog edit"* move. ⛔ `district_admin` / `state_trustee` stay **excluded** (inert).
> ⭐ **Q3 is VACATED** — its antecedent did not obtain, so ⛔ the name-presentation control is
> **untouched** ([[feedback_closure_language_precision]]).
> ⇒ ⭐ **`D8(i)` is now unblocked and is BigDev's:** mint the key, granted `super_admin` ONLY, as a
> **catalog version bump** (v38 →). ⚠ ⛔ Version is ⛔ not a key count.
>
> ⛔⛔ **AND THE RULING CREATED A NEW OPEN QUESTION — `D8-default` (below).**

⭐ **The packet, for the record:**
`_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-09-02-11b3a-masking-knob-authority.md`.
✅ **ANSWERED** (above). ⚠ It asked the Panel to **disambiguate its own phrase**, ⛔ not to make new
policy.

⭐⭐ **AND WRITING IT FOUND THE ANSWER'S GROUND ALREADY RATIFIED — `2026-08-19-136` cl.3**
(Trustee-ratified, the same two trustees, 2026-08-19), verbatim: *"**Two different axes, and they must
not be collapsed** … **(a) SCOPE** — the setting is per-Pariwar; **(b) AUTHORITY** — changing it is a
**governed act**, ⛔ not a casual Pariwar-Admin toggle."*
⇒ ⛔ **"per Pariwar" does ⛔ NOT imply "a Pariwar Admin controls it"** — the Panel ruled that in terms,
about the closest analogous control. ⚠ ⇒ cl.10's *"Trust-Admin controlled, per Pariwar"* collapses the
two axes `-136` cl.3 separates, and the open question is only whether cl.10 meant to **follow** cl.3 or
**depart** from it.
⭐⭐ **AND THE INFERENCE WAS PUT, ⛔ NOT ASSUMED — AND THE PANEL ADOPTED IT.** Applying `-136` cl.3
(subject: the public-**name** policy) to **bank masking** was an inference; `2026-09-02-175` — the
same-day correction where extending a ruling past its subject had to be undone — was cited as the live
warning. ⇒ it was **asked** and is now **ruled** (`-178` cl.2). ⛔ For **this control**; ⛔ nothing
extends by analogy further.

### ✅ D8-default — **RULED FAIL-OPEN by the Trustee Panel, 2026-09-02** (`2026-09-02-179` cl.1)

⭐ **A Pariwar with ⛔ no schedule row keeps its nominee bank details VISIBLE after close, until the
Trust sets a window.** ⇒ ⛔ **immediate masking is ⛔ NOT the code's assumption** — which is exactly
what cl.10(b) forbids — and it aligns with the analogous name control's deliberate fail-open.

⚠⛔⛔ **AND ITS COST IS PART OF THE RULING, ⛔ not a footnote.** `-178` put authority **centrally**, so a
Pariwar ⛔ **cannot** set its own window ⇒ **fail-open governs EVERY Pariwar until the Trust acts**, and
what stays exposed is a **full account number**. ⭐ The Panel ruled it with that in front of them.
⇒ ⭐⭐ **AC6's non-immediacy statement matters MORE, ⛔ not less** — an operator flipping the knob must
know the previous projection is served from every warm PoP for up to five minutes, and that the
*absence* of a knob setting is itself a decision that is live today.

<details><summary>⛔ The question as put (kept as the record)</summary>

**What does the public see for a Pariwar with ⛔ NO schedule row?**

⭐ **Created by `-178`, and ⛔ not answered by it.** With authority held **centrally**, a Pariwar
⛔ **cannot** set its own window ⇒ **whatever the code does with no row governs EVERY Pariwar until the
Trust acts.** ⚠ The default now carries far more weight than it would under tenant control.

⛔ **cl.10 does ⛔ NOT state one.** cl.10(b) says only what it is ⛔ **not**: *"immediate masking is
⛔ NOT hard-coded — '0 days' is a value an admin chose, ⛔ not a default the code assumes."*

- **(a) FAIL-OPEN** — no row ⇒ details stay **fully visible** after close until the Trust configures a
  window. ⚠ The analogous control chose exactly this, deliberately (`kyc/public-name.ts`: *"It is NOT
  fail-closed, and that is deliberate … the safe default here is the **RULED** one"*). ⛔ **But that
  ground was about a ruled PUBLICATION posture** — cl.10(a) rules publication during an **active**
  campaign, and is silent **after** it. ⇒ the reasoning does ⛔ not transfer unexamined.
- **(b) FAIL-CLOSED** — no row ⇒ **masked** at close (last-4 + bank/branch/IFSC). ⚠ Safer, ⛔ but it
  makes *"immediate masking"* the code's assumption, which cl.10(b) forbids **in terms** — ⛔ unless the
  Panel says the default is itself a ruled value rather than an assumption.
- **(c) The Trust sets a SINGLE global default** the per-Pariwar row overrides. ⚠ A third config layer,
  ⛔ and it must not become the *"second record"* cl.10(d) forbids.

⛔ **A ruling, ⛔ not an authoring choice.** ⚠ ⛔ Do ⛔ not resolve it by picking whichever the schema
makes easy.

</details>

⭐ **RULED (a) FAIL-OPEN.** ⚠ ⛔ (b) and (c) did ⛔ not become wrong — they were not chosen.

- **D8(ii) — ⭐⭐ THE HOLDER, AND THIS IS THE ONE THAT MATTERS.** `pariwar_admin` (reading cl.10's
  *"Trust-Admin"* as a tenant control) **or** `super_admin` / `trustee_panel` (following 11a.1's
  reservation of this class). ⚠⛔ **This may ⛔ NOT be BigDev's to rule.** The precedent reserves the
  class to the Panel **in terms**, and choosing `pariwar_admin` would be the *"reverse a ratified
  ruling by way of a catalog edit"* move that file names. ⛔ **If the answer is `pariwar_admin`, it
  needs the Panel — ⛔ not a catalog edit.**
- ⛔ **`district_admin` DEFERRED and `state_trustee` EXCLUDED, in both directions** — a `district`
  ceiling can ⛔ never satisfy a `pariwar`-dimension check and a `state` ceiling is broader than the
  gate; either grant is **INERT** ([[project_rbac_geo_scope_containment]]). ⛔ Do ⛔ not seed one.

⚠⭐ **AND A SEPARATE FIRST, RECORDED SO IT IS ⛔ NOT DISCOVERED MID-BUILD: AC5 WOULD BE THE PROJECT'S
FIRST SELF-SERVE PRESENTATION-TOGGLE UI.** 11a.1 shipped ⛔ **no** admin toggle screen — deliberately,
as a scope boundary (*"⛔ NO self-serve admin toggle UI ships in this story"*). Presentation changes
have so far been governed by a **write path** with required rationale + actor + audit anchor and ⛔ no
screen at all. ⛔ That is ⛔ not a reason to refuse the screen; it **is** a reason to say so out loud.

---

## Dev Notes

### Architecture constraints — ⛔ non-negotiable

- **The auth boundary lives at the API, ⛔ not at the page or the edge** (`architecture.md:504-517`) —
  SSR output carries *"no PII, no member-state, and no auth-derived branching."* ⚠ ⭐ **This surface is
  the architecture's OWN worked example of a fragment that cannot be built** (`:495-525` names FR-77
  nominee bank details), and that finding is **routed to Winston, ⛔ open, ⛔ not back-filled**.
  ⛔ This story does ⛔ not close it. ⭐ **What makes this story buildable at all is that cl.10 made the
  data `public`** — ⛔ it did ⛔ **not** make an authenticated fragment possible.
- ⛔ **SD-2 is RE-PURPOSED, ⛔ not dissolved** (`-164` A2). Its concern now governs **this story's
  post-campaign half**. ⛔ *"The absence of an authenticated-member surface is ⛔ NOT grounds to delete
  the requirement."*
- ⛔ **`packages/contracts` must never import `@twt/domain`'s pg-touching namespaces**
  ([[project_contracts_domain_bundle_boundary]]).

### Testing standards

- **Astro pages are tested through the pure render module**, ⛔ not the `.astro` file (the house
  carve-out).
- **Prove the allowlist gate with a planted violation**: add a **fifth** Tier-1-at-public field, watch
  CI fail with the *"not on the allowlist"* message, revert, confirm green. ⭐ Record the revert-sanity
  in the Dev Agent Record — ⛔ a green scan proves nothing
  ([[feedback_gate_scope_semantic_coverage]]).
- **Masking is unit-tested at its boundaries** — null `vpa`, short account numbers, and ⭐ a test that
  the **full** value is absent from the serialized response once masked (⛔ not merely absent from the
  rendered HTML).
- **`t()` for real**, namespace in the **third** slot, on the
  `apps/mobile/tests/unit/panchayat-noticeboard-render.test.ts:21,141` mount-free pattern.
- ⚠ **`ci:local`**: `integration-tests` concurrency `=1` is **LOAD-BEARING**
  ([[project_ci_local_concurrency_oversubscription]]). `git push` runs full `ci:local` via a pre-push
  hook.

### Project Structure Notes

| Path | New / Update |
|---|---|
| `packages/domain/src/schema/<masking-schedule>.ts` + migration | **NEW** — the only migration in the 11b.3 family. ⭐ **ONE subject: the four nominee bank fields** (`D12-schedule` VACATED by `2026-09-02-175`) |
| `packages/domain/src/pool/sahyog-vivran-read.ts` | **UPDATE** — join the nominee accounts + the schedule |
| `packages/contracts/public-pages/public-vs-private-matrix.yaml` | **UPDATE** — four fields + four exception blocks |
| `packages/contracts/src/public-pages/matrix.ts` | **UPDATE** — four allowlist entries, ⛔ nothing else |
| `packages/contracts/src/public-pages/sahyog-vivran.ts` | **UPDATE** — the bank block on the DTO |
| `apps/api/src/modules/public-pages/handlers.ts` | **UPDATE** — the bounded decrypt |
| `apps/api/src/modules/public-pages/routes.ts` | **UPDATE** — the header defence, now PII-bearing (D11) |
| `apps/api/tests/integration/login-wall.spec.ts` | **UPDATE** — the same control count as the header |
| `apps/public/src/lib/sahyog-vivran-render.ts` + the `.astro` | **UPDATE** |
| `apps/admin/…` masking-knob screen | **NEW** |
| ⛔ `claim_nominee_bank_accounts.ts` | ⛔ **NOT TOUCHED** — no column is added (Trap 3) |

### References

- [Source: `.decision-log.md#decision-2026-08-28-160` **cl.3** (the per-data-class basis table) · **cl.10(a)–(g)** (the whole presentation policy) — ⭐ the primary specification for this story]
- [Source: `.decision-log.md#decision-2026-08-28-164` **A2** (SD-2 re-purposed) · **A3** (the third widening ruled, enumeration owed)]
- [Source: `.decision-log.md#decision-2026-08-28-165` **cl.1** (four fields, `vpa` IN) · **cl.2** (masking is presentation; fields stay Tier-1) · **cl.3** (added at surface declaration)]
- [Source: `.decision-log.md#decision-2026-08-28-162` (the three publication types RETIRED, ⛔ not reinterpreted)]
- [Source: `trustee-panel-routing-note-2026-08-28-11b3-publication-basis-and-matrix.md` §5(b) · §8 · §10 · **§11** (the timing rule + the un-made epics.md amendment)]
- [Source: `packages/domain/src/schema/claim_nominee_bank_accounts.ts:50-77` · `packages/domain/src/schema/pool_fixed_amount_schedule.ts` (the ruled precedent)]
- [Source: `packages/contracts/src/public-pages/matrix.ts:376-424` (*"the gate failing is the gate working"*; the two current entries)]
- [Source: `_bmad-output/implementation-artifacts/deferred-work.md` — 11b.1 items (a) (g)]
- [Source: `_bmad-output/implementation-artifacts/11b-3-…md` (the host surface) · `11b-3b-…md` (the sibling; ⛔ different subject)]
- Memory: [[project_nominee_bank_disbursement_channel]] · [[project_disbursement_is_money_in_routing]] · [[project_nominee_vpa_deferred_seam]] · [[project_11b_consent_model_c5_superseded]] · [[project_moderation_model_correct_course]] · [[project_assignability_predicate_is_isvalid_only]] · [[project_admin_display_name_attribution]] · [[project_rbac_geo_scope_containment]] · [[feedback_record_unattested_no_backfill]] · [[feedback_closure_language_precision]]

---

## Dev Agent Record

### Agent Model Used

_(to be filled by the dev agent)_

### Debug Log References

### Completion Notes List

### File List

### Change Log

| Date | Change |
|---|---|
| 2026-09-02 | **Second combined validation of 11b.3 / 11b.3a / 11b.3b.** Three fixes. ⭐⭐ **AC1 contradicted its own Trap 2 and Task 3** — it said the Tier-1-count test is *"updated from 0 to 4"*, which Trap 2 forbids **in terms**; 11b.3b runs in parallel and adds two, so a hard-coded `4` deletes them from the count and the control fails **OPEN**. Now `+4`, read from the file. ⭐ **The two siblings rewrite the SAME two documents in parallel** (`routes.ts` header + `login-wall.spec.ts`): 11b.3b already carried *"extend, never overwrite"*; this file did not, so whichever landed second dropped the other's control. ⭐ **The enumeration bound is named where the decrypt is** — `P-YYYY-MM-###` is sequential, D11(a) recorded controls 2/3 N/A *because* there is no `page`/`limit`, and it was option **(c)** — ⛔ not ruled — that would have obliged the route to say what bounds walking it. ⇒ this story is what makes that gap expensive: four decrypted Tier-1 fields, `D8-default` fail-open for every Pariwar. |
| 2026-09-02 | ✅ **PRECONDITION SATISFIED — 11b.3's `D4` ruled (b)** (`2026-09-02-176`): `live` + `closed` + `settled` all render, so **AC2's active-campaign subject has a host** and this story does ⛔ not widen the predicate. **`D11` ruled (a)** too — the route states three applicable controls, and this story's PII-bearing change owes `routes.ts` + `login-wall.spec.ts` their update at Task 4. ⚠ New open rider from D4: **`D4-linkage`** — a `live` pool's page has no inbound link today and `P-YYYY-MM-###` is sequential. |
| 2026-09-02 | ⭐ **NO CHANGE TO THIS STORY — recorded because it was briefly in doubt.** `2026-09-02-174` cl.3 appeared to extend cl.10's staged schedule to contributor names, which would have given this schedule a second subject. ⛔ **Corrected the same day, Panel-ratified** (`2026-09-02-175`): the staged reduction is the **nominee bank fields'**, as cl.10 always said. ⇒ **`D12-schedule` VACATED**, Task 1 returns to a single subject, and ⛔ nothing here ever moved. |
| ~~2026-09-02~~ | ~~⚠ **This story's schedule gained a POTENTIAL SECOND SUBJECT.**~~ ⛔ **SUPERSEDED by the row above** — ⛔ left as the record, ⛔ not deleted. `2026-09-02-174` cl.3 (Panel) **extended `-160` cl.10's staged schedule from bank fields to a PERSON'S NAME** — contributor names on 11b.3b. Whether the two share one per-Pariwar row is **`D12-schedule`**, a **policy** question, ⛔ not a de-duplication. Task 1 now reads that ruling before designing the table, and ⛔ must neither generalise unilaterally nor foreclose D12. |
| 2026-09-02 | ✅ **`D8-default` RULED FAIL-OPEN by the Panel** (`2026-09-02-179` cl.1) ⇒ ⭐⭐ **THIS STORY IS NOW FULLY UNBLOCKED — zero blocking decisions.** No schedule row ⇒ details stay **visible** until the Trust sets a window; ⛔ immediate masking is ⛔ not the code's assumption (cl.10(b)), aligning with the name control's deliberate fail-open. ⚠⛔ **Its cost is part of the ruling:** `-178` made authority central, so a Pariwar cannot self-serve ⇒ **fail-open governs every Pariwar until the Trust acts**, and a **full account number** stays exposed. ⇒ AC6's non-immediacy statement matters **more**. ⚠ New task: amend the `sahyog-drive.deceased_member_name` exception `rationale:`, now **stale** — `-179` cl.2 **Panel-ratified D10**. |
| 2026-09-02 | ✅ **`D8(ii)` RULED by the Trustee Panel** (Dhiraj Rahul, Kalpana Bharti; `2026-09-02-178`) — **the Trust centrally, `super_admin`.** cl.10(b)'s *"Trust-Admin controlled"* spoke to **authority** and means the Trust, ⛔ not a Pariwar Admin. ⭐ **`-136` cl.3's two-axis separation is FOLLOWED** — per-Pariwar in **scope**, central in **authority** — so this knob and the public-name control are now **aligned**. ⭐ The inference the packet declined to make was **put and adopted** (`-178` cl.2). **Q3 VACATED** (antecedent did not obtain) ⇒ the name control is untouched. ⇒ **`D8(i)` unblocked**: mint the key, `super_admin` ONLY, catalog bump from v38. ⛔⛔ **AND THE RULING CREATED `D8-default`, OPEN and BLOCKING**: with authority central, a Pariwar cannot set its own window, so **whatever happens with no row governs EVERY Pariwar until the Trust acts** — and cl.10 states no default, only what it is *not*. |
| 2026-09-02 | ⭐ **`D8(ii)` ROUTED TO THE PANEL** — packet written: `trustee-panel-routing-note-2026-09-02-11b3a-masking-knob-authority.md`. ⏳ Routed, ⛔ nothing ratified; Task 5 now **STOPS** if it is unanswered. ⭐⭐ **Writing it found the ground already ratified:** `2026-08-19-136` **cl.3** (same two trustees) rules *"two different axes, and they must not be collapsed — **(a) SCOPE** per-Pariwar; **(b) AUTHORITY** a governed act, ⛔ not a casual Pariwar-Admin toggle."* ⇒ cl.10's *"Trust-Admin controlled, per Pariwar"* **collapses** exactly those two, and the only open question is whether it meant to **follow** cl.3 or **depart** from it. ⚠⛔ Applying cl.3 here is still an **inference** (its subject is the *name* policy, ⛔ not bank masking) — so it is **put, ⛔ not assumed**, with `-175` as the live warning against extending a ruling past its subject. |
| 2026-09-02 | ⚠⭐ **`D8` RE-FRAMED — the question is ⛔ NOT *"new key?"* but *"WHO HOLDS IT?"*, and it may not be BigDev's to rule.** Two checked findings: **(1)** there is ⛔ **no `trust_admin` role** — `-160` cl.10's phrase was carried into AC5 verbatim and maps to nothing, so it must resolve to `pariwar_admin` **or** `super_admin`/`trustee_panel`, which are opposite answers; **(2)** the nearest key, `pariwar.manage_public_name_presentation`, is **`super_admin` ONLY** and `presentation-policy.ts:11-13` says *"that exclusion IS the ruling"*, warning that granting the class to `pariwar_admin` *"for symmetry"* would *"reverse a ratified ruling by way of a catalog edit … its own Panel decision, not a tidy-up."* ⭐ Its ground transfers: the Panel ruled the data publishable, so the authority to time-limit it is arguably theirs. ⇒ **D8(i)** mint (recommended — a distinct governed act) · **D8(ii)** the holder, ⛔ possibly the Panel's. ⚠ Also recorded: catalog version is ⛔ **not** a key count (10.18 / 6.17 bumped with zero), and **AC5 would be the project's FIRST self-serve presentation-toggle UI** (11a.1 shipped none by design). ⭐ And `presentation-policy.ts`'s accountability wrapper is **reusable as a shape** — ⛔ reuse it, ⛔ not the key. |
| 2026-09-02 | ✅ **D5 RULED (a) by BigDev** (`2026-09-02-177`) — the nominee bank render ships **UN-GATED** on cl.10(a); the mechanism is routed. ⭐ **This story has ZERO blocking decisions** (D8 stays conditional). ⚠⛔ **And (a)'s price is carried, ⛔ not glossed:** the Claim Terms substrate is recorded **UN-ATTESTED**, and **counsel's third-party objection (11b.1 item (a)) is CARRIED AS RISK** — `-160` cl.7 lifted only the first half of its two-part trigger and this story ships without the second. ⚠ `D5-subject` is made **non-blocking**, ⛔ **not** resolved; and (a) adopts ⛔ **neither** reading of cl.10(a) — only the Panel can. ⭐ **Built is still ⛔ NOT published.** |
| 2026-09-02 | ⚠⭐ **`D5-subject` NARROWED — its first form OVERSTATED the exposure and is WITHDRAWN.** BigDev challenged it: *isn't verifying the holder the claim approver's job?* ⭐ **It is, and the chain is real** — bank details are collected **before** the verifier decides (`errors.ts:198-203`), the post-approval window is `verifier_approved` only, admin-only, tier-2-permissioned, audited and reason-required (`:205-210`), and past the freeze it needs the emergency workflow. ⛔ The first version had ⛔ not traced it. ⭐⭐ **But the check surfaced a SHARPER finding: ⛔ nobody in that chain can SEE the holder name** — the verifier console has no bank surface, no verification handler reads it, and the only read-back is `NomineeBankStatusResponse`, a **presence view** (`holderNamePresent: boolean`), so even a tier-2 admin **corrects a name they cannot see**. ⇒ this story would publish to the internet a value ⛔ no approver can read. ⚠ `ifsc_validated` is ⛔ not corroboration (branch lookup, ⛔ not a person). ⭐ What survives for D5: the **consent-subject** point, and it **strengthens reading (i)** of cl.10(a). ⛔ Closing it is a **verifier-console** act, routed ⛔ not built here. |
| ~~2026-09-02~~ | ~~**D5-subject recorded** (observational)~~ ⛔ **SUPERSEDED by the row above** — ⛔ left as the record, ⛔ not deleted. — arising from the 11b.3b packet's "whose name" pass. `-160` cl.3's basis is *"the **nominee's** own Claim Terms acceptance"*, but `account_holder_name` is **free text the filer types**, with ⛔ no FK and ⛔ no match rule (`claim_nominee_bank_accounts.ts:7-11`), verified reachable through the contract (`:56`) and the handler (`:155`). ⇒ a second gap **under** D5: even with an instrument, the row does ⛔ not identify its subject. ⚠ Two committed documents disagree (`nominee-accounts.ts:18` calls it *"the NOMINEE name"*); the schema is the authority and the comment is ⛔ recorded, ⛔ not swept. ⛔ Nothing ruled; both readings of cl.10(a) recorded. |
| 2026-09-01 | **Combined validation of 11b.3 / 11b.3a / 11b.3b.** Three fixes: the Tier-1-count update is **+4 read from the file**, ⛔ never `0 → 4` (11b.3b runs in parallel and adds two); this story restores the route's **PII-bearing** property and now owes `routes.ts` + `login-wall.spec.ts` their update (11b.3's **D11**); and **11b.3's D4 is named as a precondition** — under D4(a) this story has no host for AC2. |
| 2026-09-01 | Story created by the D6(b) three-way split of Story 11b.3 (ruled by BigDev, 2026-09-01). Carries `2026-08-28-160` cl.10 in its **own ACs and Tasks list**, as that decision's open-follow-up list requires ([[feedback_spec_edits_must_propagate_to_tasks]] — *"the AC-only route has failed on this epic before"*). `-165` cl.3's allowlist duty travels here with the fields. D5 (the Claim Terms basis has no instrument) is **blocking**; D8 is conditional. |
