---
baseline_commit: e16cc69073bcc951eb8f65192764d020ac66fcf9
---

# Story 11b.3a: Nominee Bank Public Presentation + Per-Pariwar Masking Schedule + Trust-Admin Knob `[SURFACE]`

Status: done

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

**The predicate, in the family's terms** — ⭐ **AMENDED 2026-09-04 by the third code-review pass; the
superseded wording is recorded verbatim below, ⛔ not deleted:**
*"While the drive is collecting, anyone can see the account the money goes to, so they can check it is
real — **unless the Trust has set your Pariwar's window to 'hidden permanently', which hides it even
while the drive is still collecting.** After the drive closes, **the Trust — centrally, ⛔ not your own
Pariwar** — decides how long that stays visible: hidden immediately, hidden after N days, or hidden
permanently. After that the public sees only the last four digits, the bank, the branch **and the IFSC
code**. ⚠ **And until the Trust sets a window for your Pariwar at all, the complete details simply stay
visible after the drive closes** — that is the default, and at launch it is every Pariwar's state."*

> ⚠⛔ **WHAT THIS SENTENCE SAID BEFORE, AND WHY IT WAS WRONG** (third pass, family **11** REAL GAP —
> AI-10-1's vehicle is this section, and ⛔ no CI gate can see it):
> *"While the drive is collecting, anyone can see the account the money goes to, so they can check it
> is real. After the drive closes, the Trust Admin for your Pariwar decides how long that stays
> visible — hidden immediately, hidden after N days, or hidden permanently — and after that the public
> sees only the last four digits plus the bank and branch."*
>
> ⚠⛔ **AND THIS AMENDMENT WAS ITSELF DEFECTIVE — CORRECTED AGAIN 2026-09-05 (chunk G4's Acceptance
> Auditor, family 11).** The 2026-09-04 amendment below fixed corrections (1) and (2) and ⛔ **left a
> THIRD error untouched while INTRODUCING A SECOND INSTANCE OF IT.** ⭐ Recorded in full rather than
> quietly re-edited, because it is the exact failure mode this pass has been finding in others:
> **(3) THE AUTHORITY WAS WRONG, TWICE.** The sentence said *"the **Trust Admin for your Pariwar**
> decides"* — and the 2026-09-04 amendment **added** *"unless **your Pariwar has chosen** to hide it
> permanently"*. ⛔ **A Pariwar cannot choose.** `2026-09-02-178` ruled **D8(ii)**: the knob is held by
> the **TRUST CENTRALLY** (`super_admin`), and `.decision-log.md:1228` states it in terms — *"puts the
> masking authority **centrally**, so a Pariwar **cannot set its own window**"*. ⇒ the amendment
> **propagated the uncorrected half of the very defect it was fixing.**
> **(4) THE FAIL-OPEN DEFAULT WAS ABSENT, and still is in the superseded text.** `-179` cl.1 ruled
> `D8-default` **FAIL-OPEN**: until the Trust configures a window, the complete details **stay
> visible** after close — ⭐ which governs **every Pariwar at launch**. That is the single most
> consequential fact about what a visitor sees, and it appeared ⛔ nowhere in the sentence a future
> reader quotes as *"what this means to the family."*
> ⇒ both are now in the live sentence above. ⚠ ⛔ **Neither (3) nor (4) is a behaviour change** — the
> code and the rulings were always right; ⛔ only this record was wrong.

> **Two corrections, ⛔ neither of them a change of behaviour — the CODE was always right:**
> **(1)** *"While the drive is collecting, anyone can see the account"* was **false for one of the
> three ruled settings.** `isNomineeBankMasked` returns `true` for `mode: 'permanent'` **before every
> close-instant rung** (`packages/domain/src/claim/nominee-bank-masking.ts:201`), so a **collecting**
> drive on a `permanent` Pariwar **is masked**. ⭐ That predicate is **ratified** — `-183` cl.4
> recorded it as an authoring reading and BigDev accepted it 2026-09-03, and the copy defect it
> dragged was fixed — ⛔ what was never done is the amendment **here**, to the sentence a future reader
> quotes as *"what this means to the family"*.
> **(2)** *"the bank and branch"* **omitted the IFSC**, contradicting **AC4** (*"the last 4 digits …
> plus the bank / branch / **IFSC** identification needed for verification"*). ⛔ The two were not
> interchangeable: **IFSC is Tier-1 ciphertext** and is one of the **two** values a masked projection
> still decrypts (`pool/sahyog-vivran-read.ts:26-27` — *"the holder name and the VPA are ⛔ not in
> cl.10(e)'s retention list, so they are never decrypted when masked"*). ✅ **AC4 was correct; this
> sentence was the wrong one**, and it is the sentence corrected.
>
> ⚠ Correction (2) becomes **moot for the PUBLIC surface** once **11b.11** lands (`-190` cl.1
> withdraws the coordinates), ⛔ but the story record would have stayed wrong, and the **member** donor
> path retains all four values under 11b.11 AC6.

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

- [x] **Task 5 — The Trust-Admin knob** (AC: 5, 6)
  - [x] ✅ **`D8(ii)` RULED 2026-09-02 (`-178`): `super_admin`, the Trust centrally.** ⛔ `pariwar_admin`
        is **foreclosed**; ⛔ `district_admin` / `state_trustee` stay excluded (inert).
  - [x] ✅ **`pariwar.manage_nominee_bank_masking` MINTED, v38 → v39 (46 → 47 keys), `super_admin` ONLY**, transcribed FIRST at `2026-09-02-183` cl.1-3. ⛔ Not an overload; ⭐ the two keys cross-reference in both catalog notes. ⭐ The live-DB spec's denial case uses a REAL `pariwar_admin` grant, so `-178`'s foreclosure has teeth rather than a comment.
  - [x] ✅ **`D8-default` RULED FAIL-OPEN** (`-179` cl.1) — no row ⇒ details stay **visible** until the
        Trust sets a window. ⛔ Do ⛔ **not** default to masked; that is the assumption cl.10(b) forbids.
  - [x] ✅ Amended in place — the *"ratification is OWED"* clause now records it **MADE** (`-179` cl.2), names what it does ⛔ NOT discharge (the DPDPA exposure, counsel's review, Row 17, the switch), and leaves the three grounds and the scope note **untouched**.
  - [x] ✅ `/p/$pariwarId/nominee-bank-masking` — read + change in every direction, THREE settings (⛔ not a toggle). ⭐ The **FIRST self-serve presentation-toggle UI** is recorded in the module barrel, the handler header, `server.ts`, the page component AND the friction-budget disposition. **15 UI tests**, incl. `0` submitting as a real value and a blank day field being refused.
  - [x] ✅ Shape reused — the same four refusals (rationale / anchor / display name / grant) plus a fifth for the day range, on `presentation-policy.ts`'s pattern via `directory-publication.ts`. ⛔ No new accountability wrapper invented.
  - [x] ✅ `getDisplayName` fail-closed BEFORE the write (409, ⛔ never a partial state); `withCompensatingAudit` writes `pariwar.nominee_bank_masking.changed`. ⛔ The wire carries ⛔ no `changedByDisplay` and ⛔ no `effectiveFrom` — `.strict()` refuses both with a 400 (back-dating a window is refused, ⛔ not merely unused).
  - [x] ✅ All three — the schema file, the public route header and the admin console — and **MECHANIZED**: `apps/admin/tests/nominee-bank-masking-terminology.test.ts` bans the adverbs AND the direct-SQL offer across seven targets, and asserts the `s-maxage=300` disclosure is PRESENT at each of AC6's three sites. ⭐ It bit during the build: my own quotes of cl.10(c)'s wording were the first violations, now paraphrased with a note saying why.

- [x] **Task 6 — Route what is not built** (AC: 8)
  - [x] ✅ Seven items (a)-(g), each with a trigger: the un-attested Claim Terms substrate **and** counsel's objection CARRIED AS RISK in ONE item · `D5-subject`'s two halves with the two-document contradiction named · ⭐ **the NEW 12-digit/Aadhaar collision** · the cl.10(c) reading routed for Panel confirmation · VPA collection · the post-masking authenticated tier · the edge-cache blindness **RE-AFFIRMED, ⛔ not re-filed**. ⛔ No second `epics.md` annotation written — that is 11b.3's Task 0.

---

## 🔍 Review Findings — code review 2026-09-03 (3-layer: Blind Hunter · Edge Case Hunter · Acceptance Auditor)

**Outcome:** all 8 ACs SATISFIED. 2 decision-needed (both DISPOSED — routed for governance), 9 patch (all APPLIED), 1 deferred, 3 dismissed as noise. No unresolved High/Medium correctness defect in shipped production behaviour; the sharpest items were a CI-flaky test (P2) and a user-facing copy defect (P1). **Verification:** `twt-test-pg` recreated fresh, `db:migrate` applied 0001→0113 clean, full integration leg re-run (`--concurrency=1`, 8 packages) → 23/23 turbo tasks green (`@twt/domain` 3169 pass, `@twt/api` 1169 pass); lint/typecheck/contract/render/i18n also green. Status: `review` → `done`.

### Decision-needed

- [x] [Review][Decision] `permanent` masking applies while a drive is still `live` — `isNomineeBankMasked` (`packages/domain/src/claim/nominee-bank-masking.ts`) returns `true` for `mode:'permanent'` before the `driveClosedAt === null` rung, so a `permanent` setting hides bank details during an active campaign. Recorded by the dev as an authoring reading (`2026-09-02-183` cl.4) and routed for Panel confirmation at `deferred-work.md` item (d). **RESOLVED 2026-09-03 (BigDev): accept the routed reading — predicate unchanged, Panel confirmation stands. The copy defect it drags (P1) is fixed now so a masked live drive is never mislabelled regardless of the Panel outcome.**
- [x] [Review][Decision] FR-74 naked-PII / Aadhaar heuristic reports `status:'fail'` for `sahyog-vivran` in the default fail-open state — a bare 12-digit account number (a real Indian length) matches `detectNakedPii`'s Aadhaar pattern, and `D8-default` FAIL-OPEN renders it in full for every Pariwar until the Trust configures a window. Disclosed in the Dev Agent Record, pinned by three tests, routed at `deferred-work.md` item (c); detector deliberately NOT weakened. **RESOLVED 2026-09-03 (BigDev): leave routed for governance — "built is not published" covers it; the routing + three pinning tests stand. Which control yields is a governance-session decision, not a story-review edit.**

### Patch

- [x] [Review][Patch] Masked-note copy asserted closure on a live drive — `bank.masked_note` said "This drive has closed…"; with `mode:'permanent'` an actively-collecting drive shows the masked note, so a live drive stated it had closed (Hindi copy identically wrong). **FIXED 2026-09-03:** copy changed to a state-neutral sentence in `packages/i18n/locales/{en,hi}/sahyog-vivran.json` ("Only part of the account number is shown here. The trust holds the complete details in its own records." + the Hindi equivalent) — true whether the drive is `live`+`permanent` or closed; keeps the cl.10(g) protected-record reference. Comment at `[poolCanonicalIdentifier].astro:489` updated to record why the note must not assert closure.
- [x] [Review][Patch] Flaky test — `not.toMatch(/\d{6,}/)` against `resource_locator`, which embeds a `randomUUID()` pariwarId whose hex frequently holds ≥6 consecutive digits → non-deterministic CI failures; no bank number flows through this module so the guard was vacuous. **FIXED 2026-09-03:** `apps/api/tests/integration/nominee-bank-masking/admin.spec.ts` now asserts the exact locator `pariwar/${pariwarId}/nominee-bank-masking;mode=permanent` (subsumes the old `.toContain` line, which was removed).
- [x] [Review][Patch] Concurrent schedule PUT for one Pariwar → unmapped 500 instead of 409. **FIXED 2026-09-03:** `setNomineeBankMaskingSchedule` now takes `SELECT pg_advisory_xact_lock(hashtext(${pariwarId}))` before the close-head / max-version / insert sequence — the exact `pool/fixed-amount.ts` (`pool_fixed_amount_schedule`) precedent the Panel named for this table. Interleaved writers serialize; the loser reads a fresh `max(version)` and no longer hits `23505`.
- [x] [Review][Patch] Empty-string Tier-3 `branch` → whole-response 500 instead of degrading one field. **FIXED 2026-09-03 (branch only):** `readNomineeBank` (`packages/domain/src/pool/sahyog-vivran-read.ts`) now coerces `branch: r.branch?.trim() ? r.branch.trim() : null`, mirroring the handler's existing `district` treatment — a blank branch becomes the same first-class `null` the render already omits. ⚠ **Residual:** `bank_name` is `NOT NULL` with no nullable projection and `z.string().min(1)` on the wire — a genuinely empty `bank_name` (data-integrity fault, not this surface's) would still 500 the page. Left as-is: nulling a required field ripples through contract/OpenAPI/SSR/render.
- [x] [Review][Patch] SSR full-arm validator omitted presence checks the zod contract requires. **FIXED 2026-09-03:** `isNomineeBankAccounts` (`apps/public/src/lib/sahyog-vivran.server.ts`) now rejects a full-arm account that OMITS `accountHolderName` / `accountNumber` / `vpa` (`if (!(key in a)) return false`), mirroring the masked-arm's `'x' in a` absence checks.
- [x] [Review][Patch] `settled`-pool masking had no end-to-end test. **FIXED 2026-09-03:** added `after_days: 0` on a `settled` drive masks (`apps/api/tests/integration/public-pages/sahyog-vivran.spec.ts`) — confirms `DRIVE_CLOSED_AT` resolves a close instant for a pool that reached `settled` and the offset engages. Behaviour was already correct by construction; this pins it.
- [x] [Review][Patch] Projector lag can render `status:"collecting"` with `masked:true` — transient public self-contradiction. **RESOLVED via P1, no wiring change 2026-09-03.** The proposed fix (force `driveClosedAt=null` while `status==='collecting'`) was rejected: during the same projector-lag window it would render a drive that closed 40 days ago with `after_days:30` as UNMASKED to match the stale status — a brief privacy regression, strictly worse than a cosmetic mismatch. `DRIVE_CLOSED_AT` reads the event (not the projection), so the masking verdict is already CORRECT during lag; only the `status` label is stale, and P1's neutral copy removes the false-statement artifact. The real fix (deriving `status` from the close event too) is 11b.3's `status` derivation and out of scope.
- [x] [Review][Patch] No window-direction CHECK on `pariwar_nominee_bank_masking_schedule`. **FIXED 2026-09-03:** migration 0113 gains constraint `…_window_not_inverted` — `effective_until IS NULL OR effective_until >= effective_from` (`>=`, so a zero-width `[T,T)` supersession of a same-instant row stays legal; only a backwards window is forbidden). ✅ `twt-test-pg` was recreated fresh and `db:migrate` re-ran clean (0001→0113); the constraint is confirmed on the table and the full integration leg is green.
- [x] [Review][Patch] Minor cleanups. **FIXED 2026-09-03:** dropped the discarded `.returning({version})` + `void closed;` in `setNomineeBankMaskingSchedule`. Added a sync-guard test (`packages/domain/tests/claim/nominee-bank-masking.test.ts`) asserting migration 0113's `setting_check` embeds the same `<= 36500` as `MAX_NOMINEE_BANK_MASK_AFTER_DAYS` — the app-validation-vs-DB-CHECK drift is the dangerous one. ⚠ **Residual:** the contract↔domain copy of the constant stays comment-synced only (`@twt/domain` may not import `@twt/contracts` — turbo cycle; a cross-package test would need a host that depends on both).

### Deferred

- [x] [Review][Defer] Family 13 (semantic accessibility, AI-11a-3) — the Astro bank block's `role="group"` / `aria-label` grouping attributes have no test coverage (Astro pages are tested only through the pure render module, the house carve-out); a later edit could drop `role="group"` without failing CI. Covered-by-construction in source today [`apps/public/src/pages/sahyog-vivran/[poolCanonicalIdentifier].astro`] — deferred, the checklist itself rules family 13 un-mechanized until Story 11b.8's accessibility audit.

### Dismissed (noise / false positive — recorded, not actioned)

- Rendered account order relies on an unseen `ORDER BY` — FALSE POSITIVE: `packages/domain/src/claim/nominee-bank-read.ts` ends with `.orderBy(asc(claimNomineeBankAccounts.accountRank))`; order is deterministic.
- OpenAPI `minLength: 1` doesn't capture `z.string().trim()` — JSON Schema cannot express `.trim().min(1)` cleanly; the live Fastify/zod path correctly rejects a whitespace-only rationale with 400. Cosmetic schema-fidelity only.
- Combined-leg scrape assertion sensitivity reduced by the D2 split — mitigated: the tier-leak-only leg (`html: undefined`) is asserted independently with `leaks: []`, so a genuine tier leak is still caught.

---

## 🔍 Review Findings — code review 2026-09-03 **SECOND PASS** (3-layer: Blind Hunter · Edge Case Hunter · Acceptance Auditor)

⭐ **A SECOND, INDEPENDENT 3-LAYER PASS**, run over `git diff origin/main` → working tree — i.e. the five
story commits **PLUS the nine patches the first pass applied**, which had themselves never been reviewed
by anyone. ⛔ The section above is ⛔ NOT superseded: its dispositions stand. This section records only
what the second pass found ON TOP of it.

**Outcome:** all 8 ACs re-verified SATISFIED. **19 raw findings → 3 merged duplicates → 12 surviving,
4 dismissed.** 3 decision-needed (**all RESOLVED by BigDev 2026-09-03** — 2 became patches, 1 a
BLOCKING deferral), **10 patch (ALL APPLIED)**, 2 deferred (one of them blocking). ⭐ **Two REAL GAPs**
on the load-bearing-invariant checklist (families **2** and **5**) — triaged at AC severity per the
checklist's own ruling, ⛔ not downgraded to notes, and **both now mechanized**. ⚠ **Two of the first
pass's own patches are implicated:** the `window_not_inverted` CHECK it added never reached the Drizzle
schema, and that same CHECK opened a new `23514` → opaque-500 path under multi-instance clock skew.

⭐⭐ **VERIFICATION — MEASURED, ⛔ NOT ASSERTED** ([[feedback_verify_before_committing_governance_claims]]).
`pnpm ci:local` against the live `twt-test-pg` (`:5433`): **PASSED — 34 jobs green**, including
`integration-tests`, `pii-scrape`, `microcopy`, `i18n-parity`, `sahyog-vivran-financial-truth` and all
nineteen invariant gates. Suite totals: **@twt/domain 262 files / 3183 pass** (⭐ **+14** on the first
pass's 3169), **@twt/api 128 files / 1170 pass**, **@twt/admin 406**, **@twt/public 447**,
**@twt/contracts 1100**. Typecheck clean across all five touched packages; all 18 turbo lint tasks green.

⭐⭐ **AND THE THREE NEW GUARDS WERE PROVED NON-VACUOUS BY REVERTING THE FIX AND WATCHING THEM FAIL** —
⛔ not assumed from a green run, because a test that cannot fail is the defect this story's own gates
keep finding: **(i)** removing `pg_advisory_xact_lock` reproduced the ORIGINAL defect exactly —
`23505` on `…_pariwar_version_uq`; **(ii)** pointing the read back at `DRIVE_CLOSED_AT` failed the
late-`pool.settled` un-masking test and ⛔ nothing else; **(iii)** seeding the admin form from constants
failed the three new seeding assertions. Each probe was reverted and the green re-confirmed.

### Decision-needed

- [ ] [Review][Decision] **A `pool.settled` event moves the masking clock FORWARD and re-publishes details that were already masked.** `DRIVE_CLOSED_AT` (`packages/domain/src/pool/public-read.ts:363-371`) selects `event_type IN ('pool.closed','pool.settled') ORDER BY occurred_at DESC LIMIT 1`, so once a settle event lands later than the close event, `driveClosedAt` jumps from T0 to T_settle. On `after_days: N` the predicate (`nominee-bank-masking.ts:182`) flips `now >= closedAt + N` back to **false**: a drive masked since T0+N publishes the **full account number, holder name, IFSC and VPA again** for another N days, and cl.10(c)'s window silently becomes `(settle − close) + N`. The predicate's own doc claims monotonicity (*"`true` from then on"*); it does not hold. ⚠ **Latent today** — verified live: there is ⛔ **no producer of `pool.settled`** anywhere in `packages/domain/src`, `apps/api/src` or `apps/jobs/src` (only `pool/state.ts:71,97` and the catalog `pool/events.ts:141`). It fires the day settlement ships, on the state where masking matters most. ⚠⚠ **`DRIVE_CLOSED_AT` is a SHARED fragment** (`listPublicSahyogDrivePools` + `sahyog-vivran-read`), so a fix at the source also moves `/sahyog`'s `closedAt` and `DECEASED_DISTRICT`'s freeze instant — ⛔ cross-story blast radius, ⛔ not a local edit. **Options:** (a) earliest close/settle event governs masking (add a masking-specific fragment, leave the shared one alone); (b) latch monotonic in the predicate; (c) accept and route to the Panel as an authoring reading of cl.10(c)'s *"closure/settlement"*. — ⭐ **RESOLVED 2026-09-03 (BigDev): (a) — a MASKING-SPECIFIC fragment.** A new `DRIVE_MASKING_FROM` selects the **EARLIEST** close/settle event and is read **only** by the masking path; `DRIVE_CLOSED_AT` is ⛔ **untouched**, so `/sahyog`'s `closedAt` and `DECEASED_DISTRICT`'s freeze instant are unaffected and there is ⛔ no cross-story blast radius. ⭐ This is `public-read.ts`'s own stated rule followed rather than bent: *"a consumer needing different semantics needs its OWN fragment, ⛔ never a parameter bolted onto one of these."* ⇒ **re-classified as a PATCH.**
- [ ] [Review][Decision] **A `closed`/`settled` drive whose stream carries no close event is NEVER masked under any `after_days` setting.** `isNomineeBankMasked` maps `driveClosedAt === null` unconditionally to *"still collecting ⇒ cl.10(a) governs ⇒ not masked"* (`nominee-bank-masking.ts:181`), but the read's own doc-block names this exact data anomaly (a `closed`/`settled` pool with no close/settle event), and it is also how the integration fixtures create pools (direct state write under `app.pool_state_writer='on'`). An archived drive on a Pariwar that configured `after_days: 0` therefore publishes **complete** bank details indefinitely, with no error and no signal; only the `permanent` rung covers it. `readNomineeBank` does ⛔ not pass `status`, so no guard combining `status !== 'collecting'` with a null instant exists anywhere. ⚠ The sibling `DECEASED_DISTRICT` fragment already treats this anomaly with `COALESCE(…, now)` — but `now` here is *also* fail-open. **Options:** (a) pass `status` and mask when non-collecting with no instant (fail-closed for a configured Pariwar — ⛔ note cl.10(b) forbids assuming masking only for the UNCONFIGURED default, so this does not collide); (b) accept as a data-integrity fault and route. — ⭐ **RESOLVED 2026-09-03 (BigDev): (a) — pass `status`, mask when non-collecting.** ⚠⛔ **AND THE cl.10(b) BOUNDARY IS THE WHOLE POINT, ⛔ not a footnote:** this fail-closes **only** for a Pariwar that has **already configured a window** (rung 1 returns `false` before `status` is ever consulted), so ⛔ it does **not** make immediate masking the code's assumption for the unconfigured default, which cl.10(b) forbids **in terms**. ⛔ A future edit that moves this branch **above** the `setting === null` rung reverses a ratified ruling — say so at the branch. ⇒ **re-classified as a PATCH.**
- [ ] [Review][Decision] **`limits.search` is the only bound on a sequential-identifier walk over four decrypted Tier-1 fields, under a FAIL-OPEN default.** `P-YYYY-MM-###` is sequential, the route is a single-item GET (so controls 2/3 are structurally N/A), and `D8-default` FAIL-OPEN means **every Pariwar renders complete details until the Trust writes a schedule row** — and only the Trust can write one. At launch that is all of them. ⭐ The story **states** this in all three required places and AC2 rules in terms that *"if `limits.search` is judged insufficient for a Tier-1-bearing single-item GET, that is a **DECISION**, ⛔ not a tuning knob"*. ⇒ the finding is ⛔ not that it is undocumented; it is that **the judgement itself has never been made**, and the code is a working harvest endpoint the moment the surface deploys. ⛔ Do ⛔ not quietly tighten or loosen the tier here. — ⛔⛔ **RESOLVED 2026-09-03 (BigDev): ROUTED TO THE PANEL AS *BLOCKING ON DEPLOYMENT*.** ⛔ **No code change** — the tier is ⛔ **not** touched, because AC2 rules that tightening it as an authoring act is exactly what may not happen. What changes is the **status of the question**: it stops being a documented property and becomes a **launch-blocking governance item**, recorded as the FIRST item of `deferred-work.md`'s **second-pass code-review section** for this story, with the trigger *before Epic 11b deploys*. ⚠ ⛔ **Not** lettered into the story's own (a)–(g) block: those are AC8's routed non-builds, and this is a review finding of a different kind — ⛔ do not renumber them to make room. ⚠⭐ **AND THIS IS WHY THE STORY DOES ⛔ NOT CLOSE AS `done`** — ⛔ the build is complete, but a blocking judgement is outstanding, and *"built is not published"* is what keeps the surface dark until the Panel rules. ⇒ **re-classified as a BLOCKING DEFER.**

### Patch

- [x] [Review][Patch] **`DRIVE_MASKING_FROM` — the masking window measures from the EARLIEST close/settle event** [`packages/domain/src/pool/public-read.ts`, new fragment; consumed by `sahyog-vivran-read.ts`] — from **Decision 1, resolved (a)**. ⛔ `DRIVE_CLOSED_AT` is **not** modified. Owes: the new fragment (`ORDER BY e.occurred_at ASC`, `event_version ASC`), the read threading it into `readNomineeBank` as the masking instant (⛔ distinct from the `closedAt` the drive header still renders), a comment at both fragments saying why there are two, and a test that a late `pool.settled` does **not** un-mask an already-masked drive.
- [x] [Review][Patch] **`isNomineeBankMasked` gains `status`; a non-collecting drive with no close instant masks** [`packages/domain/src/claim/nominee-bank-masking.ts:181`] — from **Decision 2, resolved (a)**. ⚠ The new branch sits **below** the `setting === null` rung and must stay there — moving it above reverses cl.10(b). Owes: the fourth input key (⛔ a drive fact, ⛔ never a member handle — the module header's prohibition is unaffected), `readNomineeBank` passing `row.status`, a comment stating the cl.10(b) boundary at the branch, and tests for `{after_days, driveClosedAt: null, status: 'closed'}` → masked vs `status: 'collecting'` → not.
- [x] [Review][Patch] **The admin form ignores the setting in force and always seeds `after_days` / `0` — one save silently downgrades `permanent` and unmasks every LIVE drive** [`apps/admin/src/modules/nominee-bank-masking/MaskingScheduleForm.tsx:57-70`] — ⭐ VERIFIED: `useState<'after_days'|'permanent'>('after_days')` + `useForm({ defaultValues: { days: '0' } })` + a `useEffect` resetting to those same constants; `MaskingScheduleFormProps` has ⛔ **no** prop for the current setting, and `MaskingSchedulePage.tsx:178` renders `<MaskingScheduleForm>` **without passing `schedule.data.setting`**, which it displays two lines above at `:139`. A Pariwar on `permanent` shows a form pre-selected on `after_days: 0` — which *looks like* the current state. `permanent` masks a live drive; `after_days: 0` does ⛔ not (a test in this very diff pins that they differ). ⇒ an operator who types a rationale to re-affirm the current setting publishes the complete holder name, account number, IFSC and VPA on every live drive, un-pullable for `s-maxage=300`. Every other guard (rationale, audit anchor, `super_admin` key) is satisfied by this mistake. **Fix:** pass `schedule.data.setting` and seed `mode`/`days` from it.
- [x] [Review][Patch] **REAL GAP — family 5 (DB-level backstops): the new table has no policy-regression spec; five backstops are asserted nowhere** [`packages/domain/tests/integration/rls/` — file absent] — ⭐ VERIFIED against the two siblings this module's own header names as its precedents (*"this is its third application"*): `public-name-presentation-policy.spec.ts:57,68` and `directory-publication-policy.spec.ts:47,58` both open with *"FORCE ROW LEVEL SECURITY is enabled"* and *"an UNSET scope reads zero rows"*. `pariwar_nominee_bank_masking_schedule` has neither, nor a spec of its own. Unasserted: (1) FORCE RLS; (2) unset-scope fail-closed; (3) the RLS `withCheck` negative; (4) `…_pariwar_current_uq`, the **partial open-head unique** — load-bearing, because `getNomineeBankMaskingHead` takes `.limit(1)` with ⛔ no `ORDER BY` and is deterministic *only* because that index guarantees one open head; (5) `…_window_not_inverted`. **Failure:** drop the partial unique and two open heads coexist — the console shows a setting the Trust did not choose and the public resolver can pick the other, serving a **full account number** on a `permanent` Pariwar. Every existing test still passes: `(a)`–`(f)` never create two open heads and `(g)` reads only across tenants.
- [x] [Review][Patch] **REAL GAP — family 2 (concurrency): the advisory lock is proven by no test, and the caller-transaction it depends on is unenforced** [`packages/domain/src/claim/nominee-bank-masking-policy.ts:286`] — the `pg_advisory_xact_lock` added by the first pass has ⛔ no two-connection race test on either entry path (both the API and domain specs are single-writer); the checklist's standard is *a true two-connection race proven live*. Compounding: it is an **xact** lock but the accessor takes a plain `Db`, and *"REQUIRES THE CALLER'S TRANSACTION"* is a doc-block, ⛔ not a type or a runtime check — called outside a transaction it serializes for the length of one implicit statement tx, i.e. **not at all**, while the close/max-version/insert triple runs non-atomically. Deleting the lock re-introduces the exact opaque-500 the first pass fixed and ⛔ **no test would fail**. **Failure:** without the enclosing tx the head is closed and the insert fails ⇒ the Pariwar is left with **no open head**, which under FAIL-OPEN makes the full account number public.
- [x] [Review][Patch] **The `window_not_inverted` CHECK exists only in the migration, never in the Drizzle schema** [`packages/domain/src/schema/pariwar_nominee_bank_masking_schedule.ts:143-171` vs `migrations/0113_nominee-bank-masking-schedule.sql:96`] — ⭐ VERIFIED: the `(t) => [...]` list declares `version_positive`, `setting_check` and the three indexes; the window CHECK is **absent**, and it is the only constraint in 0113 with no TS twin. Added by the first pass to the SQL alone. ⚠ Note the contrast — that same pass *did* give `MAX_NOMINEE_BANK_MASK_AFTER_DAYS` a migration↔constant sync-guard test; this constraint got neither a mirror nor a guard. Low severity while migrations stay hand-authored and the snapshot is frozen at 0020; the risk is a future reader or generator treating the TS table as authoritative.
- [x] [Review][Patch] **The admin console reports designed 400 and 409 rejections as unexplained server faults** [`apps/admin/src/modules/nominee-bank-masking/MaskingSchedulePage.tsx:36-46`] — the handler's own comment enumerates 400/401/403/409 as the designed list; `errorMessage` branches on **403 only** and returns `nomineeBankMasking.error.unexpected` for the rest, whose copy says the change *"may not have been saved"* and instructs a reload. A **409** is `AdminDisplayNameMissingError` — the acting admin has no `users.display_name`, fully expected and actionable — where the change definitively did **not** save and reloading will never fix it; the display name is resolved *before* the domain write, so the copy's hedge is also inaccurate. `i18n-en.ts` carries no 400- or 409-specific key.
- [x] [Review][Patch] **The masked note claims part of the account number is shown when nothing is shown** [`apps/public/src/pages/sahyog-vivran/[poolCanonicalIdentifier].astro:494`] — the note renders on `account.isMasked` alone, but `accountNumberLast4` is `null` whenever the stored value has ≤4 digits (cl.10(e)'s own boundary) or the decrypt soft-fails, in which case the account-number cell is omitted **entirely**. The visitor sees a bank, a branch, an IFSC, no number, and copy reading *"Only part of the account number is shown here."* ⚠ This is the **second iteration of the same copy defect** the first pass just fixed (it asserted closure on a live drive; it now asserts a partial value that is absent) — and it re-introduces in prose the announced-omission the block's own comments forbid. **Fix:** gate the note on `account.nomineeAccountNumber !== null`, or make the sentence independent of whether digits are shown.
- [x] [Review][Patch] **Clock skew between API instances turns the first pass's new CHECK into an opaque 500** [`packages/domain/src/claim/nominee-bank-masking-policy.ts:291-299`] — the advisory lock covers `23505`, ⛔ not `23514`. The close step writes `effective_until = <new effectiveFrom>` onto the prior head **unconditionally**; if instance B's `effectiveFrom` is earlier than the open head's `effective_from` (written moments earlier by instance A with a clock a second ahead — ordinary NTP skew), the prior row's window is inverted and Postgres raises `23514`, which is not in the error-mapping registry ⇒ **500**, on a module whose header states in terms that *"⛔ NONE of them is a 500"*. Fail-safe for data (nothing is written) but the operator is told the server broke and the change *may* have half-landed. ⚠ Created by this diff — the CHECK did not exist before the first pass.
- [x] [Review][Patch] **The masked arm's "retention list is exhaustive" reading is asserted as fact, where the identical class of inference was recorded and routed** [`packages/contracts/src/public-pages/sahyog-vivran.ts`] — the masked arm drops `accountHolderName` and `vpa`, justified as *"a retention list is **exhaustive**: what it does not name is not retained."* cl.10(e) as quoted in AC4 states what **is** retained; it does not say *"and nothing else"*. That is an **inference** — and it is the same kind the story chose to record and route for `permanent` (`deferred-work.md` item (d), *"⭐ An authoring reading, ⛔ NOT a ruling"*). ⛔ **No code change proposed** — this is the more protective direction and should stay. The defect is the **asymmetry**: one inference is labelled, the other is not. **Fix:** one line appended to item (d).

### Deferred

- [x] [Review][Defer] ⛔⛔ **BLOCKING ON DEPLOYMENT — the enumeration bound over four decrypted Tier-1 fields has never been judged by the Panel** [`apps/api/src/modules/public-pages/routes.ts`] — from **Decision 3, resolved: routed as blocking**. ⛔ **No code change**; the rate-limit tier is deliberately ⛔ **not** touched (AC2 forbids tightening it as an authoring act). The combination is: a **sequential** `P-YYYY-MM-###` identifier · a single-item GET with ⛔ no `page`/`limit` for controls 2/3 to bind to · `D8-default` **FAIL-OPEN** governing **every** Pariwar until the Trust acts · **four decrypted Tier-1 fields** behind it. ⇒ this is a **launch-blocking governance item**, ⛔ not a documented property. Recorded as the first item of `deferred-work.md`'s second-pass code-review section for this story (⛔ not lettered into AC8's (a)–(g) block). **Trigger:** before Epic 11b deploys. — ✅⭐ **ANSWERED 2026-09-03, TRUSTEE-RATIFIED (Dhiraj Rahul, Kalpana Bharti) — `2026-09-03-184`.** **(A) YES**, a `live` drive should be publicly reachable (`D4-linkage` answered affirmatively); **(B) MAKE THE ADDRESS UNGUESSABLE** — ⛔ the rate-limit tier is **NOT** changed, the Panel directed option (c) and ⛔ not (b). ⭐ The judgement is **"Closed by ruling"**, ⛔ not *"resolved via deferral"* ⇒ **this story returns to `done`.** ⚠⛔⛔ **AND THE DEPLOYMENT GATE DOES ⛔ NOT LIFT WITH IT:** (B) removes the ONLY way a `live` drive can be reached, so the token and the inbound path are **ONE deliverable in two parts** — shipping the token alone makes a live drive reachable by ⛔ NOBODY and **defeats (A)**. That obligation is ⛔ **neither this story's nor 11b.3's** (it touches both surfaces) and is carried, still BLOCKING, in `deferred-work.md`. ⛔ Do ⛔ not read this story's `done` as the surface being shippable — [[project_directory_launch_gated_on_killswitch_ui]] is the precedent: 11a.3 closed `done` while its surface stayed gated.
- [x] [Review][Defer] **An empty or whitespace `bank_name` 500s the entire transparency page** [`packages/domain/src/pool/sahyog-vivran-read.ts:547`] — ⛔ **not re-opened**: the first pass considered this exact residual and dispositioned it with a stated reason (nulling a required field ripples through contract/OpenAPI/SSR/render). Recorded here because **two independent layers re-raised it unprompted**, which is signal about its visibility, ⛔ not a reversal of that disposition. The column is `NOT NULL` with no length CHECK and the value is copied verbatim from the IFSC lookup — the same lookup whose empty-`branch` responses were guarded on the adjacent line 555. Today's only adapter is `createInMemoryBankIfscLookup` (a fixture map), so the value is non-empty **by construction**; the risk arrives with a real RBI-dataset adapter. **Trigger:** the story that ships a live IFSC/bank-directory adapter.

### Dismissed (noise / false positive / already disposed — recorded, not actioned)

- **`permanent` masks a still-`live` drive** — ⛔ not a new finding: disclosed as an authoring reading (`-183` cl.4), routed at `deferred-work.md` item (d), and **already RESOLVED 2026-09-03 by BigDev** in the section above. The Auditor re-derived it independently and confirmed the copy fix landed in both locales.
- **FR-74 12-digit/Aadhaar collision leaves the gate asserted-failing** — already disposed by BigDev 2026-09-03 (*"leave routed for governance"*); the three pinning tests and the deliberately-unweakened detector stand. The added operational observation (a genuine naked-PII signal is now indistinguishable from the expected failure on this surface) is folded into that routing, ⛔ not re-filed.
- **The AC6 terminology gate omits the two files that would fail it** — ⭐ CHECKED, ⛔ not assumed: `nominee-bank-masking.ts` and migration `0113.sql` do contain the banned needle (2 and 3 occurrences), and the two scanned domain files contain **zero**. But every occurrence is a quotation of cl.10(c)'s *"mask immediately"* — the **0-day setting**, a different sense from AC6's prohibition (a change is not immediate on the public page). Adding them would force rewording a Panel clause. AC6 names **three** places and the gate covers all three.
- **The "either account can be used" equality copy renders with only one account** — DELIBERATE and documented at the call site (*"⭐ STANDING copy, rendered whenever the block renders — ⛔ not only when there are two"*), and a lone account row contradicts the exactly-two-atomic invariant `nominee-bank-persist.ts` enforces. ⚠ Recorded, ⛔ not actioned: that invariant is app-layer only, so if a DB backstop is ever added, this copy is a consumer of it.

---

## 🔍 Review Findings — code review 2026-09-04 **THIRD PASS** (3-layer: Blind Hunter · Edge Case Hunter · Acceptance Auditor)

⭐ **A THIRD, INDEPENDENT 3-LAYER PASS**, run over the story's full committed range
`e16cc690..2c69cd5d` (13 commits — 4 `feat`/`fix`, 9 `governance`). ⛔ Neither section above is
superseded; their dispositions stand. This section records only what the third pass found on top of
both.

✅⭐⭐ **THIS PASS IS CHUNKED AND NOW COMPLETE — ALL FOUR GROUPS REVIEWED BY ALL THREE LAYERS.**
The diff is **61 files / +7,996**, far past the review workflow's 3,000-line guidance, so it was split
into four groups: **G1** `packages/domain` (17 files / +2,213) · **G2** `apps/api` +
`packages/contracts` + `openapi` (19 / +2,288) · **G3** `apps/public` + `apps/admin` + `packages/i18n`
+ `scripts` (19 / +1,998) · **G4** the governance documents (6 / +1,497). ⭐ Findings are in the four
sub-sections below.

**THIRD-PASS TOTAL: 4 decision-needed · 65 patch · 16 deferred · 11 routed to 11b.11 · 11 dismissed ·
⭐⭐ NINE REAL GAPs** on the load-bearing-invariant checklist — families **8**, **10** (×3), **11** (×2)
and **13** — every one triaged at AC severity per the checklist's own ruling, ⛔ none downgraded.

⚠⛔ **EACH CHUNK FOUND A DEFECT THE PREVIOUS CHUNKS STRUCTURALLY COULD NOT SEE, AND TWO OF THEM WERE
IN THIS PASS'S OWN WORK.** G1's Blind Hunter reported a HIGH that was false because the test refuting
it lives in G2. G3 found that this pass's **own 2026-09-04 family-11 fix** had corrected the **spec**
while the identical falsehood stood in the **shipped operator copy**. G4 then found that the **same
fix** had left the *authority* half wrong and **introduced a second instance of it** — ⭐ corrected
2026-09-05, and recorded in place rather than quietly re-edited. ⇒ ⛔ **a per-chunk pass cannot see
cross-chunk coverage, and a per-chunk FIX silently claims story-wide closure.** Both are routed to the
Epic 11b retro.

⚠⛔ **VERIFICATION — UN-ATTESTED FOR G1–G3, MEASURED FOR G4.** ⛔ `pnpm ci:local` was ⛔ **not** run for
this pass and ⛔ no code fix was applied, so for the three code chunks every `✅ VERIFIED` means **read
against the live tree at `HEAD`**, ⛔ never executed, and the two prior passes' green runs are ⛔ **not**
inherited ([[feedback_record_unattested_no_backfill]]). ⭐ **G4 is different and stronger:** its
findings are about documents, and every one was checked against **committed git history**
(`git show <sha>:<path>`, `git log -S`) or the live tree. ⭐ The four **doc-only** corrections applied
2026-09-04 **were** executed and attested — AC6 terminology gate 9/9, domain masking units 18/18,
`tsc --noEmit` and `eslint` clean.

⚠⛔ **AND THE SUBJECT IS PARTLY SUPERSEDED.** `2026-09-04-190` cl.1 (Trustee-ratified, and RULED into
**Story 11b.11**, `ready-for-dev`) **withdraws the nominee banking coordinates from the public wire**
entirely; cl.4 **RETAINS** `isNomineeBankMasked`, the schedule table, its permission key and its tests,
which after 11b.11 have ⛔ **no public consumer** (11b.11 Trap 4 / AC4). ⇒ findings were **split by
survival** (BigDev, 2026-09-04): those bearing on the **surviving machinery** stay here; those bearing
on code 11b.11 **deletes or collapses** are routed to 11b.11 and are listed in their own section below,
⛔ not silently dropped.

**Outcome (G1):** 27 raw findings across three layers → **3 merged duplicates → 24 surviving,
3 dismissed.** **1 decision-needed** · **16 patch** (⭐ **4 DOC-ONLY ones APPLIED 2026-09-04** — the other 12 remain action items) ·
**5 deferred** (all pre-existing / house-wide) · **5 routed to 11b.11**. ⭐ **Two REAL GAPs** on the
load-bearing-invariant checklist (families **10** and **11**) — triaged at AC severity per the
checklist's own ruling, ⛔ not downgraded to notes.

⭐⭐ **AUDITOR FAMILY VERDICTS (G1).** 1 `covered-by-construction` · 2 `covered-by-test` ·
3 `covered-by-test` · 5 `covered-by-test` · 6 `covered-by-construction` · 8 `covered-by-construction` ·
9 `covered-by-construction` · 12 `covered-by-construction` · **10 REAL GAP** · **11 REAL GAP**.
Families 4, 7 and 13 untouched by this chunk — skipped.

⚠⛔ **VERIFICATION STATUS — ⛔ UN-ATTESTED, AND SAID SO.** ⛔ `pnpm ci:local` was **NOT** run for this
pass; ⛔ no test was executed and ⛔ no fix was applied, so ⛔ there is **nothing to attest**. Every
`✅ VERIFIED` below means *read against the live tree at `HEAD`*, ⛔ never *executed*. ⭐ The two prior
passes' green runs are ⛔ **not** inherited as evidence for this one.

⭐ **STALENESS CHECK — MEASURED, ⛔ NOT ASSUMED.** Of this story's 17 G1 files, **three** changed after
it closed (`2c69cd5d..HEAD`): `pool/public-read.ts` and `pool/sahyog-vivran-read.ts` (Story 11b.10
re-addressed the read from the sequential `poolCanonicalIdentifier` to the opaque `publicToken`) and
one doc-block line in the schema file. ⇒ the migration, the policy module, the RLS module, the RBAC
keys and the masking predicate are **byte-identical to what 11b.3a shipped**, so every finding against
them is **live today**, ⛔ not a historical artifact.

### 🔷 G1 — `packages/domain` (17 files / +2,213), reviewed 2026-09-04

#### Decision-needed

- [x] [Review][Decision] ✅ **RULED (a) 2026-09-04 (BigDev) — see the resolution in this item's body.** **REAL GAP — family 10 (closure honesty): a second-pass item is marked `[x]` with one of its two named defects unfixed, and the summary says "both now mechanized".** The second-pass patch item above reads *"REAL GAP — family 2 (concurrency): the advisory lock is proven by no test, **and the caller-transaction it depends on is unenforced** … it is an **xact** lock but the accessor takes a plain `Db`, and *"REQUIRES THE CALLER'S TRANSACTION"* is a doc-block, ⛔ not a type or a runtime check"*. ⭐ The diff ships the concurrency test — the first half is genuinely closed. ⛔ **The second half is not touched:** the signature is still `setNomineeBankMaskingSchedule(db: Db, …)` [`packages/domain/src/claim/nominee-bank-masking-policy.ts:221`], there is no type distinction, no `txid_current_if_assigned()`-style runtime check, and no test that the accessor is inside a transaction. The second-pass summary then states *"**both now mechanized**"* — true of family 5, **half-true of family 2**. ⚠ **This is ⛔ not bookkeeping:** outside a transaction the close/max-version/insert triple is non-atomic and can leave a Pariwar with **no open head**, which under `D8-default` FAIL-OPEN publishes a full account number. ⭐ **A mitigation that actually holds does exist** — RLS is transaction-scoped, so a non-tx caller's INSERT is rejected `42501` — and the only production caller correctly passes `scopeCtx(request).tx` [`apps/api/src/modules/nominee-bank-masking/handlers.ts:196`]. It is simply ⛔ **not the argument that was recorded**, and a future BYPASSRLS caller sits outside it. ⛔ Per [[feedback_closure_language_precision]] the three closures are ⛔ not interchangeable and this must ⛔ not be collapsed by an author. **Options:** (a) state the RLS-forces-a-tx construction explicitly at `:221` and re-mark the second clause **closed by construction**; (b) reword the item to *"first half fixed, second half CARRIED"* and route the carried half; (c) mechanize it now (a `Tx`-branded parameter type). — ⭐ **RESOLVED 2026-09-04 (BigDev): (a) — STATE THE CONSTRUCTION.** The mitigation is **real and sufficient** and was simply never the argument recorded: RLS is **transaction-scoped**, so a caller outside a transaction has no `SET LOCAL app.pariwar_id` and its INSERT is rejected **`42501`** ⇒ the non-atomic close/insert triple the item feared is **structurally unreachable through every RLS-scoped caller**, which today is all of them. ⇒ the second clause is **closed by construction**, ⛔ not carried and ⛔ not faked. ⚠ **Two obligations follow, and the ruling is ⛔ not discharged without them:** **(i)** the construction is written at `:221` — ⛔ a construction nobody records is the same defect one rung up; **(ii)** it names its own **limit**: a future **BYPASSRLS** caller sits outside it, so that is the re-examination trigger. ⛔ (c) is refused **here** — `pool/fixed-amount.ts:534` carries the identical signature, so a `Tx`-brand is a **codebase-wide** change and ⛔ not a 11b.3a fix; it stays in `deferred-work.md`. ⇒ **re-classified as a PATCH** (⛔ left as an action item per BigDev's 2026-09-04 triage — ⛔ not applied). ⚠ ⛔ **Do ⛔ not edit the second-pass section in place** — [[feedback_supersede_never_reinterpret]]: append the correction, ⛔ never re-read the original.

#### Patch

- [ ] [Review][Patch] **The day ceiling is hand-duplicated across `@twt/contracts` and `@twt/domain` with ⛔ NOTHING asserting they stay in sync — and the drift surfaces as an opaque 500 on a plain input error** [`packages/contracts/src/nominee-bank-masking/masking.ts:35` vs `packages/domain/src/claim/nominee-bank-masking.ts:86`] — ✅ **VERIFIED against the live tree.** `MAX_NOMINEE_BANK_MASK_AFTER_DAYS = 36500` is declared **independently in both packages** (contracts may not import `@twt/domain` — [[project_contracts_domain_bundle_boundary]]), and a **third** copy is the DB CHECK in migration `0113`. The only drift guard [`packages/domain/tests/claim/nominee-bank-masking.test.ts:220`] asserts **domain ↔ migration SQL**; ⛔ **nothing asserts contracts ↔ domain**. **Failure:** lower the domain ceiling and the contract keeps accepting the old max; the request passes body validation, reaches `setNomineeBankMaskingSchedule:267-274` and throws `UngovernedNomineeBankMaskingChangeError` — which is ⛔ **not in the API error-mapping registry** ⇒ an **opaque 500 on what is really a 400**, the exact failure `routes.ts:57-60` says the body schema exists to prevent. Adding a domain mode value without adding it to the contract union is the same shape. ⭐ **The mechanization asymmetry is the finding** — one of two duplication seams is gated, the other is not ([[feedback_mechanization_split_commitment]]: *decay concentrates in the un-mechanized half*).
- [ ] [Review][Patch] **`rationale` and `audit_id` are NULLABLE at the DB while the write path requires both — an ungoverned row is DB-legal** [`packages/domain/migrations/0113_nominee-bank-masking-schedule.sql:71-72`] — ✅ **VERIFIED**: `"rationale" text,` / `"audit_id" uuid,`. Family 5's standard is *"app-layer shape validation mirrored by CHECK constraints"*. The column comment justifies the nullability as *"only because a Pariwar that never configured a window has no row at all"* — which **refutes itself**: if an unconfigured Pariwar has ⛔ **no row**, then every row that exists came from a write, and the write path requires both ⇒ the columns could be `NOT NULL`. ⭐ The gap is **proved by the story's own test**: the policy-regression spec inserts rows with neither [`…-policy-regression.spec.ts`, `rawRow` helper], and such a row reads back through `resolveEffectiveNomineeBankMasking` **exactly like a governed one**. ⇒ the "governance trail" is an app-layer promise with no DB backstop.
- [ ] [Review][Patch] **The `FOR SELECT` policy is fully redundant with the `FOR ALL` one, so the cross-tenant read regression test cannot fail** [`packages/domain/migrations/0113_nominee-bank-masking-schedule.sql:106-107`] — ✅ **VERIFIED**: `…_tenant_isolation_select` is `AS PERMISSIVE FOR SELECT` and `…_tenant_isolation_write` is `AS PERMISSIVE FOR ALL`, with **identical** `USING` predicates. `FOR ALL` already covers `SELECT`, and permissive policies are **OR'd** ⇒ the SELECT policy adds nothing. **Failure:** the spec's *"⛔ a Pariwar cannot read ANOTHER Pariwar's schedule"* passes if **either** policy is deleted — which is the precise opposite of what a policy-regression spec is for ([[project_gate_scope_semantic_coverage]]: *a green scan proves nothing*). **Fix:** drop the redundant policy, or split the write policy into `FOR INSERT`/`FOR UPDATE` so each policy is independently load-bearing.
- [ ] [Review][Patch] **The migration↔constant drift guard asserts a SUBSTRING of a text file — a comment satisfies it, and it passes against a database the constraint never reached** [`packages/domain/tests/claim/nominee-bank-masking.test.ts:232`] — ✅ **VERIFIED**: `expect(sql).toContain(`<= ${MAX_NOMINEE_BANK_MASK_AFTER_DAYS}`)`. This is green if `-- <= 36500` appears **anywhere** in the file while the real `CHECK` says `<= 365`, and green if migration 0113 was never applied to any database. ⭐ **The real assertion is one line away and was not made:** the live-DB policy-regression spec already probes an out-of-range insert, so probing `36501` and asserting `23514` on `…_setting_check` would bind the constant to the **applied** constraint rather than to file text.
- [ ] [Review][Patch] **Overlapping and zero-width effective windows are both reachable — the clamp only considers the OPEN head, never a closed row** [`packages/domain/src/claim/nominee-bank-masking-policy.ts:302-317`] — two distinct paths into one defect. **(i)** When `head === null` — the state the code's own next comment says is real (*"a head closed by a superseding write that then rolled back"*) — ⛔ **no clamping happens at all**, so a write with `effectiveFrom = T` inserts a window overlapping an existing **closed** row spanning `[T-10, T+10)`. `…_window_not_inverted` is **per-row** and cannot see it; there is no exclusion constraint. **(ii)** Under multi-instance clock skew, a later real-time write carrying an earlier `effectiveFrom` **collapses the prior head to zero width** `[T, T)` — legal by design under that same CHECK — so the setting actually in force for that interval is erased from the as-of record, on the one table whose stated purpose is *"the trail of every prior window survives"*. ⛔ Nothing logs or flags that a clamp occurred, so it is undetectable after the fact. **Fix:** clamp against `max(effective_until)` as well as the open head, and/or add a `tstzrange` `EXCLUDE` constraint so overlap is a DB-level impossibility.
- [ ] [Review][Patch] **The "§1.5 audit anchor" is checked for non-emptiness only — it anchors nothing, and a malformed value 500s** [`packages/domain/src/claim/nominee-bank-masking-policy.ts:388-390`] — the guard is `if (input.auditId === null || input.auditId === '')`. `audit_id` has ⛔ **no FK** and `auditId` is an **unbranded `string`**. The module claims it *"REFUSES the write without its anchor rather than silently accepting an unanchored change"*; it in fact refuses a write without **a string**. ⭐ Every test in the diff demonstrates the hole — `auditId: randomUUID()` with ⛔ no audit line ever written. A caller that generates an id and then fails to write the line produces a row that **looks governed and traces to nothing**. Secondary: `auditId: 'x'` passes the check and reaches Postgres as an invalid uuid → `22P02`, unregistered ⇒ another opaque 500 on the module whose header states *"⛔ NONE of them is a 500"*. **Fix:** brand the id and validate the uuid shape at the boundary.
- [ ] [Review][Patch] **`actorGrants` is OPTIONAL, in direct contradiction of the 10.8 lesson quoted three lines above it** [`packages/domain/src/claim/nominee-bank-masking-policy.ts:346` vs `:360`] — the doc-block states the discipline verbatim (*"null, never omitted (the 10.8 lesson: a required property turns an omission into a compile error)"*) and applies it to `changedByActor` and `changedByDisplay`; the very next declaration is `actorGrants?: readonly EffectiveGrant[]`. ⇒ the discipline is dropped for the **one field that carries the authorization decision**. It fails closed today (`?? []` → `hasPermission` false), so this is hygiene — but it is the field where a silent omission matters most.
- [ ] [Review][Patch] **A `null` actor bypasses the permission check entirely, and ⛔ no test exercises the bypass in either direction** [`packages/domain/src/claim/nominee-bank-masking-policy.ts:403-417`] — authorization is conditioned on the **presence of an attribution field**, ⛔ not on an explicit system-write intent: `if (input.changedByActor !== null && !hasPermission(…))`. A caller resolving its actor as `session?.userId ?? null` produces an **unauthenticated, unattributed, fully-accepted** change to how long bank numbers stay public — and the guard that then fires (`changedByDisplay must be null`) is **satisfied by the same bug**. ⭐ **Family 9 is satisfied** — the bypass is documented at two sites and is the third identical application of the `kyc/presentation-policy.ts` precedent, so it is ⛔ not an undocumented bypass. **Two residuals against the family's own wording:** it states a rationale but ⛔ **no re-examination trigger**, and ⛔ **no test** covers it (neither that a system write succeeds without grants, nor the `null` actor + non-null display refusal). ⇒ a refactor routing an actor-attributed write down the null-actor path would ⛔ not fail CI. **Fix:** an explicit `system: true` discriminator that fails closed, plus the two tests and a re-examination trigger.
- [ ] [Review][Patch] **`NomineeBankMaskingDriveState` hand-mirrors the pool vocabulary with ⛔ no compile-time link to it** [`packages/domain/src/claim/nominee-bank-masking.ts:174`] — declared as a standalone literal union `'live' | 'closed' | 'settled'`, and the predicate's ⛔ only load-bearing value is the literal `'live'` [`:232`]. ⭐ **VERIFIED CORRECT TODAY** — `packages/domain/src/pool/state.ts:95-96` confirms the reducer's vocabulary is `spawned → live → closed → settled`, so ⛔ there is **no live defect**. The finding is the **absent type link**: two `as` casts sit on the same call path, so a future rename of the pool state would ⛔ not be caught by the compiler here. ⚠ Note the doc-block two lines above uses the word *"collecting"* for the same state the code spells `'live'` — a second, smaller vocabulary drift in the same file.
- [x] [Review][Patch] ✅ **APPLIED 2026-09-04.** **REAL GAP — family 11: the story's own one-sentence Policy meaning is now FALSE for one of the three ruled settings, and was never amended** [spec `## 📜 Policy meaning` §, this file, vs `packages/domain/src/claim/nominee-bank-masking.ts:201`] — the sentence reads *"**While the drive is collecting, anyone can see the account the money goes to**, so they can check it is real."* The code returns `true` for `mode: 'permanent'` **before every close-instant rung**, so a **collecting** drive on a `permanent` Pariwar **is masked**. A second, smaller divergence sits at `:232` (a configured Pariwar's non-`live` drive with no close instant). ⭐ **The predicate itself is ratified** — `-183` cl.4 recorded it as an authoring reading, BigDev accepted it 2026-09-03, and the copy defect it dragged was fixed. ⛔ **What was never done is the amendment to the Policy-meaning section** — which is the **vehicle AI-10-1 assigns to this check**. ⇒ two live parts of the same spec now say opposite things about an active campaign, and the one a future reader will quote as *"what this means to the family"* is the wrong one. ⚠ **Honest caveat, stated ⛔ not glossed:** `-160` cl.10(f) rules this a **public-presentation** control, ⛔ not a member-gating one, and the code enforces that structurally (`NomineeBankMaskingInput` has ⛔ no member handle, pinned by the *"⛔ reads NOTHING about any member"* test) ⇒ family 11's **trigger is arguable**. What is ⛔ **not** arguable is that the story chose to write the section, and it is now wrong. **Fix:** one amended sentence covering the terminal rung.
- [x] [Review][Patch] ✅ **APPLIED 2026-09-04.** **AC4 and the Policy-meaning section disagree about whether IFSC survives masking** [this file: `## 📜 Policy meaning` § vs AC4] — AC4 says the masked projection retains *"the **last 4 digits** … plus the **bank / branch / IFSC** identification needed for verification"*; the Policy-meaning sentence says the public sees *"only the last four digits **plus the bank and branch**"*. The code follows **AC4** — the read's header states a masked projection decrypts *"only **two** per account"*, i.e. account number + **IFSC**. Since IFSC is Tier-1 ciphertext and the holder name is not, the two statements are ⛔ **not interchangeable**: one of them is wrong about which Tier-1 field a masked page still decrypts and publishes. ⚠ Becomes moot for the **public** surface once 11b.11 lands, but the story record stays wrong unless corrected.
- [x] [Review][Patch] ✅ **APPLIED 2026-09-04.** **The schema header asserts a paraphrase discipline that two files in its own commit do not follow** [`packages/domain/src/schema/pariwar_nominee_bank_masking_schedule.ts`, header] — it states *"**every file here** paraphrases as *'masked from the close instant'* … ⛔ Do not paste the adverb back in"*, but `migrations/0113_….sql:33` and `claim/nominee-bank-masking.ts` both still carry the adverb. ⭐ The **occurrences** were correctly dismissed by the first pass (they are quotations of a Panel clause, and the AC6 gate covers the three sites AC6 names) — ⛔ this is **not** a reversal of that. What survives is the **claim**: a standing instruction saying *"every file here"* does something two files demonstrably do not, i.e. **prose that outlives the thing it describes**. ⚠ Story 11b.11's Trap 4 records that exact class three times in one day (`-187`/`-188`/`-192`) — see the cross-cutting note below.
- [x] [Review][Patch] ✅ **APPLIED 2026-09-04.** **A comment states a failure mode its own code cannot produce** [`packages/domain/src/pool/sahyog-vivran-read.ts`, the `coerceDriveInstant` call site] — *"a string here would make `getTime()` return NaN and every comparison false — i.e. a FULL ACCOUNT NUMBER staying public"*. If the value were a string, `driveClosedAt.getTime()` **throws `TypeError`** — the page 500s, it does ⛔ not publish. The coercion is correct; the stated consequence is not, and a reviewer trusting the comment will **mis-rank the risk of removing it**.
- [ ] [Review][Patch] **The day-boundary test stops one step short of the boundary it exists to pin** [`packages/domain/tests/claim/nominee-bank-masking.test.ts`, the `days(29.9)` / `days(30)` pair] — the asserted "just before" point is **2.4 hours early**, ⛔ not `closedAt + N·86_400_000 − 1ms`. A `>` vs `>=` flip is caught; a `− MS_PER_DAY` or a `Math.floor`-style rounding change would ⛔ not be. Also unpinned: a **negative** offset (`now < closedAt`, reachable via skew between the event's `occurred_at` and the request instant) — the arithmetic returns `false`, which is correct, but nothing asserts it.
- [ ] [Review][Patch] **`…_version_positive` is the one CHECK in migration 0113 with ⛔ no direct assertion** [`packages/domain/tests/integration/rls/nominee-bank-masking-schedule-policy-regression.spec.ts`] — every other constraint in 0113 has a direct probe in this spec (FORCE RLS, unset-scope fail-closed, the `withCheck` negative, the partial open-head unique, `(pariwar_id, version)`, `window_not_inverted` **and** its zero-width legal case). `version_positive` is guarded **in-process only**, by `nextVersion = max+1`.
- [ ] [Review][Patch] **The cross-tenant/system-actor path is untested in BOTH directions** [`packages/domain/tests/integration/claim/nominee-bank-masking-schedule.spec.ts`] — family 3 is otherwise `covered-by-test` (cross-tenant read **and** write denial, and case `(f)` uses a **real `pariwar_admin` grant** rather than an empty array, so `-178`'s foreclosure genuinely has teeth). The residual is the **system-actor** path: neither that `changedByActor: null` succeeds without grants, nor the `null` actor + non-null display refusal at `:246`, is asserted anywhere.

#### Deferred

- [x] [Review][Defer] **Vacuous assertion matchers in the new specs** [`packages/domain/tests/integration/rls/nominee-bank-masking-schedule-policy-regression.spec.ts:178`] — ⛔ **pre-existing house-wide convention, ⛔ not introduced by this story.** `.resolves.not.toThrow()` applies `toThrow` to a **resolved value**, not a function, so it asserts nothing beyond *"the promise settled"*; `.resolves.toBeUndefined()` on a `.then(async () => {…})` is a tautology. ✅ **VERIFIED** across **8+ pre-existing specs** (`r9-voting-`, `claim-shepherd-assignments-`, `claim-concealment-assessments-`, `pariwar-custom-field-definitions-`, `state-trustee-cycle-freeze-` policy-regressions, `projection-equivalence`, `pool-fixed-amount`). ⇒ a codebase-wide cleanup, ⛔ not a 11b.3a defect. **Trigger:** the next test-hygiene sweep, or the Epic 11b retro.
- [x] [Review][Defer] **`setNomineeBankMaskingSchedule` documents a mandatory caller transaction but ⛔ never asserts one** [`packages/domain/src/claim/nominee-bank-masking-policy.ts:221`] — the **mechanization** half; the **closure-honesty** half is the decision-needed item above and is ⛔ not deferred with it. Called with a pool rather than a tx, `pg_advisory_xact_lock` runs in an implicit single-statement transaction and **serializes nothing**, and the close/insert pair auto-commits separately. ⭐ The sibling `packages/domain/src/pool/fixed-amount.ts:534` carries the **identical** gap ⇒ house-wide posture, ⛔ not novel here. ⚠ Recorded because the FAIL-OPEN default makes the consequence **worse** here than at the precedent: no open head ⇒ full account numbers republished. **Trigger:** the story that introduces a `Tx`-branded accessor type, or a BYPASSRLS caller on this table.
- [x] [Review][Defer] **The advisory lock shares the GLOBAL single-argument key space with an unrelated subsystem** [`packages/domain/src/claim/nominee-bank-masking-policy.ts:439`] — `pg_advisory_xact_lock(hashtext($1))` uses one global 64-bit space, and the comment says it mirrors the same convention in `pool/fixed-amount.ts`. If that call also hashes a `pariwarId`, the two subsystems **contend on the same key**, and a transaction taking them in different orders alongside row locks is a deadlock candidate. `pg_advisory_xact_lock(classid, objid)` with a per-subsystem `classid` costs nothing. (`hashtext` is 32-bit, so unrelated Pariwars also collide at ~77k tenants — perf only.) ⛔ Pre-existing convention. **Trigger:** the next subsystem to take a Pariwar-keyed advisory lock.
- [x] [Review][Defer] **`Promise.all` over one transaction client yields TWO `READ COMMITTED` snapshots** [`packages/domain/src/pool/sahyog-vivran-read.ts`, `readNomineeBank`] — node-postgres queues statements per client, so the two reads **serialize** rather than interleave, but serialization is ⛔ not a shared snapshot: under `READ COMMITTED` each statement takes a fresh one. If the schedule read lands **before** a concurrent `permanent` commit and the accounts read **after** it, the page emits `masked: false` beside live account data. ⚠ Extremely narrow (a commit must land between two queued statements) and the blast radius is one request; pinning `now` does ⛔ not pin the snapshot. **Trigger:** if this read is ever moved off a single client, or the surface gains a stronger consistency requirement.
- [x] [Review][Defer] **The anomaly branch substitutes a window the admin did ⛔ NOT choose — the mirror of cl.10(b), and it is unrouted** [`packages/domain/src/claim/nominee-bank-masking.ts:220-232`] — `-160` cl.10(b) rules *"⛔ **immediate masking is NOT hard-coded** — '0 days' is a **value an admin chose**, ⛔ not a default the code assumes."* The branch ignores `maskAfterDays` entirely, so a Pariwar that deliberately chose `after_days: 365` gets **0-day behaviour** on any `closed`/`settled` drive whose stream carries no close event — which is ⛔ **also how the integration fixtures create pools**. ⭐ BigDev's second-pass resolution defended the cl.10(b) boundary in **one direction only** (that the branch sits *below* the `setting === null` rung, so the **unconfigured** default is untouched). It did ⛔ not address the other direction: for a **configured** Pariwar the code silently assumes a setting the admin did not choose. The branch is **more protective**, so this is ⛔ not a leak — it is an **unrouted residual** on the exact clause the story treats as load-bearing, recorded in ⛔ neither the (a)–(g) block nor the second-pass section. **Trigger:** the Epic 11b retro, or any reactivation of the masking control.

#### ➡️ Routed to Story 11b.11 (⛔ NOT actioned here — 11b.11 deletes or collapses the code they bear on)

⭐ Per BigDev's **split-by-survival** routing (2026-09-04). `2026-09-04-190` cl.1 removes `accountNumber`,
`accountNumberLast4`, `ifsc`, `vpa`, `bankName` and `branch` from the public wire **and stops the domain
read SELECTing and DECRYPTing them** (11b.11 AC1); cl.4 retains the machinery with ⛔ no public consumer
(AC4). ⛔ These are ⛔ **not** dismissed — they are 11b.11's to close or inherit.

- **`bank_name = ''` 500s the entire transparency page** [`packages/domain/src/pool/sahyog-vivran-read.ts:586`] — `bankName` is passed through raw while `branch` on the **next line** is `.trim() || null`-guarded; the column is `text NOT NULL` with ⛔ no non-empty CHECK and is written verbatim from the IFSC lookup, and `''` fails `z.string().min(1)` in **both** arms of the response union ⇒ serialization failure ⇒ 500 ⇒ outage page. ⭐ **11b.11 AC1 CLOSES THIS BY DELETION** — `bankName` leaves the public read entirely. ⚠ Confirm at implementation that the **member** donor path (which retains all four values, AC6) does not inherit the same ungurarded pass-through. ⚠ The second pass already dispositioned this once and it was **re-raised unprompted by two independent layers** — signal about its visibility.
- **One malformed schedule row throws on the UNAUTHENTICATED path and darkens EVERY drive page in the Pariwar** [`packages/domain/src/claim/nominee-bank-masking-policy.ts:71-86`, reached from `sahyog-vivran-read.ts`] — a row with `masking_mode = 'after_days'` and `mask_after_days IS NULL` (the CHECK dropped, or a snapshot restore predating it) makes `settingFromRow` throw a bare `Error` inside the read's `Promise.all` ⇒ the API 500s ⇒ the Astro route maps `!fetched.ok` to the **503 outage view**, for **every** Sahyog Vivran page in that tenant. ⚠ That is the **opposite posture taken 12 lines away** for the same failure class, where an out-of-range `accountRank` is **dropped** explicitly because *"throwing would 500 a whole transparency page over one malformed row"* — the module is internally inconsistent about **tenant-wide vs row-local blast radius**. ⭐ **Whether 11b.11 closes this depends on its implementation:** if the public read stops resolving the schedule (the predicate becomes inert per D1), it is closed by deletion; if the call survives, ⛔ **this stands and must be fixed there**. ⛔ Do not assume — check at implementation.
- **The read model returns `masked: boolean` ALONGSIDE the complete ciphertext of every field** [`packages/domain/src/pool/sahyog-vivran-read.ts`, `readNomineeBank` / `SahyogVivranNomineeBank`] — `accounts` is built unconditionally and always carries `accountNumberCiphertext`, `accountHolderNameCiphertext`, `ifscCiphertext` and `vpaCiphertext`; ⛔ nothing in the returned **type** changes when `masked === true`, so the guarantee is a downstream promise rather than a structural property (a discriminated union would make it structural). ⚠ **Severity reduced on verification:** the leak is genuinely guarded at the wire by a real test — `apps/api/tests/integration/public-pages/sahyog-vivran.spec.ts:911`, *"AC4 — `after_days: 0` on a CLOSED drive masks, and the FULL NUMBER IS NOT ON THE WIRE"* ⇒ hardening, ⛔ not a live defect. ⭐ **11b.11 D1 COLLAPSES THE UNION ENTIRELY** (both `masked` arms become identical) ⇒ closed by supersession.
- **Un-masking is RETROACTIVE across every historical drive, and the blast radius of one PUT is unbounded and unpreviewable** [`sahyog-vivran-read.ts`, `readNomineeBank` → `resolveEffectiveNomineeBankMasking(db, pariwarId, now)`] — the schedule resolves at the **request instant**, ⛔ never at the drive's close instant, and the offset is then measured against each drive's own close. ⇒ a Pariwar on `permanent` for two years that moves to `after_days: 30` **instantly re-publishes** complete bank details for every drive closed more than 30 days ago; `after_days: 36500` un-masks the **entire archive in one request**. The console shows the setting, ⛔ never the count of drives whose projection flips; there is ⛔ no dry-run, ⛔ no staged application and ⛔ no per-drive pinning. The doc-blocks celebrate reversibility (*"⛔ There is no 'already masked, cannot unmask' branch anywhere here and there must never be one"*) without noting the reverse direction is a **bulk disclosure event**. ⚠ Secondarily: the `s-maxage=300` staleness is disclosed in three places but **all three frame it as a schedule-change delay** — the identical delay on the **time-elapse** transition at `closedAt + N` is disclosed nowhere. ⭐ **Dormant after 11b.11** (no public consumer) ⇒ routed as a **REACTIVATION PRECONDITION**: ⛔ do not re-point this machinery at a public surface until the retroactivity semantics are ruled.
- **RLS scope failure is INDISTINGUISHABLE from "no window configured" — and resolves to PUBLISH** [`packages/domain/src/claim/nominee-bank-masking-policy.ts:251-275`] — `resolveEffectiveNomineeBankMasking` returns `null` for **every** zero-row cause: no row, unset `app.pariwar_id`, empty-string scope, wrong-tenant scope, a dropped policy. `null` then means **not masked**. ⇒ a public route whose connection loses its `SET LOCAL app.pariwar_id` on a `permanent` Pariwar publishes complete bank details, and `s-maxage=300` pins that answer at every warm PoP. ⭐ `-179` cl.1 ruled the **POLICY** default fail-open; the code silently extends that ruling to **INFRASTRUCTURE FAILURE**, which ⛔ no one ruled on. ⚠ 11b.11 **AC7 leaves the `D8-default` FAIL-OPEN ruling UNCHANGED**, so the semantics persist in the dormant machinery. ⭐ Routed as a **REACTIVATION PRECONDITION**: the resolver should distinguish *"queried successfully, no row"* from *"could not resolve"* before this ever governs a public surface again.

#### Dismissed (noise / false positive / handled elsewhere — recorded, ⛔ not actioned)

- **"⛔ Nothing tests the read-path wiring — swap `driveMaskingFrom` → `driveClosedAt` and CI stays green"** (Blind Hunter, **HIGH**) — ⛔ **FALSE, and instructive.** ✅ **VERIFIED**: `apps/api/tests/integration/public-pages/sahyog-vivran.spec.ts:984` is a dedicated test named *"⭐⭐ A LATE `pool.settled` does ⛔ NOT UN-MASK an already-masked drive (second-pass review 2026-09-03)"* — **exactly** the defect, and the second pass additionally proved it non-vacuous by reverting the fix. ⭐⭐ **THE FINDING IS THE CHUNK BOUNDARY, ⛔ not the code:** the layer was scoped to G1 (`packages/domain`) and the mechanization lives in G2 (`apps/api`), so a correctly-mechanized fix read as un-mechanized **purely because of where the review was cut**. ⚠ Record this for the Epic 11b retro — it is the review-process analogue of [[feedback_circular_deferral_between_sibling_stories]]: **a per-chunk pass cannot see a guard that lives in another chunk.**
- **"A re-closed drive stays pinned to its FIRST close, so it is masked while actively collecting again"** (Blind Hunter, MEDIUM) — ⛔ **NOT REACHABLE.** ✅ **VERIFIED** at `packages/domain/src/pool/state.ts:50-78`: the pool reducer is **strictly linear and monotonic** — `pool.closed` fires **only** from `live`, `pool.opened_for_contributions` **only** from `spawned`, and `pool.spawned` is explicitly **identity** so *"a corrupt replay must not regress a live pool back to spawned"*. ⇒ there is ⛔ **no reverse edge**: a closed drive can never re-open, and the premise has no producer ([[feedback_trace_reachability_before_escalating]]). ⭐ Independently corroborates the Edge Case Hunter's CLEAN verdict on the full state × setting matrix.
- **"⛔ Nothing proves `pools.current_state` spells its collecting state `'live'`; if it does not, the anomaly branch masks ACTIVE campaigns with all tests green"** (Blind Hunter, MEDIUM) — ⛔ **FALSE.** ✅ **VERIFIED** at `packages/domain/src/pool/state.ts:95-96`: the vocabulary **is** `spawned → live → closed → settled`. ⭐ The **residual** — that the union is hand-mirrored with ⛔ no compile-time link — survives as a **patch** above, at LOW severity; the HIGH failure scenario does ⛔ not.

---

### 🔷 G2 — `apps/api` + `packages/contracts` + `openapi` (19 files / +2,288), reviewed 2026-09-04

**Outcome:** 37 raw findings across three layers → **9 merged duplicates → 24 surviving, 4 dismissed.**
⛔ 0 decision-needed · **18 patch** · **3 deferred** · **3 routed to 11b.11**. ⭐ **Two more REAL GAPs**
(families **8** and **10**) — at AC severity, ⛔ not downgraded.

⭐⭐ **AUDITOR FAMILY VERDICTS (G2).** 2 `covered-by-construction` (owned by G1) · 3
`covered-by-construction` · 4 `covered-by-test` · 6 `covered-by-test` (⭐ the strongest-covered family
in the chunk) · 9 `covered-by-construction` · 11 `covered-by-construction` · 12
`covered-by-construction` · **8 REAL GAP** · **10 REAL GAP**. Families 1, 5, 7, 13 untouched.

#### Patch

- [ ] [Review][Patch] **REAL GAP — family 10: the matrix YAML asserts, in the PRESENT TENSE, that this surface declares ZERO Tier-1 fields and "renders ⛔ NO person's name at all" — in the file this story EDITED** [`packages/contracts/public-pages/public-vs-private-matrix.yaml:112-117`, `:748-751`, `:758-760`] — ✅ **VERIFIED, three separate stale claims.** **(i)** the file header still reads *"The `sahyog-vivran` surface below declares ⛔ **ZERO** `pii_tier: 1` fields at `tier: public` — it renders ⛔ **NO person's name at all** — so it neither needs nor claims a name-form ruling."* Both halves are now false: the surface declares **four** Tier-1 fields at `tier: public` and renders `nominee_account_holder_name`, a person's name **in full**. ⚠ **And the conclusion no longer follows on the header's own logic** — with the antecedent gone, the **name FORM** for `account_holder_name` (vs the separately-ruled forms under `-136` / `-159` / `-179` cl.2) is addressed ⛔ nowhere in the diff. **(ii)** the surface's `description:` — **YAML data, ⛔ not a comment** — still reads *"⭐ IT NAMES ⛔ NOBODY. ⛔ Not the deceased member, ⛔ not a contributor, ⛔ not a verifier, ⛔ **not a nominee**"*, and *"the nominee bank presentation **is** 11b.3a's"*, a future tense inside the commit that discharged it. **(iii)** `:758-760` states `noindex` is *"control 3 of the **THREE** this route states"* — see the control-count patch below. ⭐ AC2 rules this in terms: *"⛔ **Do ⛔ not leave them describing a zero-Tier-1 route while serving four Tier-1 fields**"*. The story executed that discipline in **four** places (`routes.ts`, `login-wall.spec.ts`, `sahyog-vivran.ts`, the `sahyog-drive` rationale) — ⇒ the discipline was understood and simply ⛔ not applied to the matrix. ⚠⭐ **This is the class Story 11b.11's Trap 4 records happening THREE TIMES IN ONE DAY** (`-187`/`-188`/`-192`): **prose that outlives the thing it describes.** ⛔ It is now four.
- [ ] [Review][Patch] **A THIRD committed artifact states the route's control count — and it says THREE while the two the AC names were both moved to FOUR** [`packages/contracts/public-pages/public-vs-private-matrix.yaml:758-760`] — ✅ **VERIFIED.** AC2 requires *"the `routes.ts` header **and** the `login-wall.spec.ts` allowlist entry … **both stating the SAME count** — 'two authoritative documents disagreeing on how many controls exist is the defect this file records having already had once'."* ⭐ Those two **were** moved to FOUR and are mutually consistent. ⛔ The matrix is a **third** artifact that also states the count **and a different ordinal** (`X-Robots-Tag` is control **3** here, control **4** in `routes.ts`). ⇒ the same defect, arrived at from a third side. ⚠ **And the control is prose-only in ALL THREE places** — ⛔ no constant, ⛔ no test, ⛔ no lint rule mechanizes it; it is prevented solely by a reviewer counting bullet points by eye, **which is exactly how it failed the first time** ([[feedback_mechanization_split_commitment]]). **Fix:** export a single `SAHYOG_VIVRAN_APPLICABLE_CONTROLS` list all three import, and assert its length.
- [ ] [Review][Patch] **REAL GAP — family 8: the designed 409 ("a missing display name blocks the action") has ⛔ NO test on this new mutation route, and the regression it would catch surfaces as the exact 500 the module forbids in terms** [`apps/api/tests/integration/nominee-bank-masking/admin.spec.ts`] — ✅ **VERIFIED**: `409 (admin.display_name_missing)` is enumerated as a **designed** status in the spec's own header at `:24` and published in `openapi/v1.yaml`, and ⛔ **no case exercises it** (grep returns the header comment and an unrelated line only). The checklist clause is explicit: *"admin attribution snapshotted server-side from `users.display_name` … **missing name blocks the action**"* — the **snapshot** half is covered; the **block** half is not. **Failure:** delete or invert the two-line guard at `handlers.ts:159-162` and `changedByDisplay: null` reaches the domain, whose guard throws `UngovernedNomineeBankMaskingChangeError` — which `extends Error`, ⛔ **not** `ApiError`, and is **absent from the error-mapping registry** ⇒ *"Anything else → 500"*. ⇒ a designed, actionable **409 becomes an opaque 500**, on the module whose header states *"⛔ **NONE of them is a 500**"*. ⚠ The same spec file **does** test this class for the rationale path (*"a whitespace rationale is 400 … ⛔ NEVER a 500"*) and omits it for the display name. ⭐ **The precedent this module names as its model tests it** — `apps/api/tests/integration/directory-publication/admin.spec.ts:437`, *"blocks the flip with 409 when the acting admin has NO display_name (fail-closed)"*. **Fix:** one case — authenticate an admin with an absent `display_name`, PUT, assert `409` **and** `storedRows === []`.
- [ ] [Review][Patch] **FOUR of the five masking assertions are VACUOUS — `[].every(…) === true`** [`apps/api/tests/integration/public-pages/sahyog-vivran.spec.ts:973, 1011, 1041, 1066`] — ✅ **VERIFIED, and worse than reported** (the blind layer said three). Only `:904` is safe, via `nomineeBankAccounts[0]!['accountNumber']`, which throws on an empty array. The other four assert **only** through `.every()`; the two `for` loops that follow (`expect('accountNumber' in account).toBe(false)`) are **equally vacuous** over an empty array, and `expect(res.body).not.toContain('50100123456789')` at `:1066` also passes on `[]`. ⇒ if the `claimNomineeBankAccounts` seeding silently stops inserting, or the read's join breaks and returns `[]`, **`permanent` masks a LIVE drive**, **`after_days: 0` on a SETTLED drive**, **`after_days: 30` does NOT mask yet** and the fourth all pass **green with the feature entirely absent**. **Fix:** `expect(body.drive.nomineeBankAccounts).toHaveLength(2)` as the first assertion of each.
- [ ] [Review][Patch] **The public route's four Tier-1 fields NEVER reached `openapi/v1.yaml`** [`openapi/v1.yaml`] — ✅ **VERIFIED: zero occurrences of `nomineeBankAccounts` in the entire spec**, although the emitter demonstrably ran (every tag anchor shifted `&a67`→`&a75`). ⇒ the single machine-readable description of the platform's API does ⛔ **not record** that a public, unauthenticated route now returns four decrypted Tier-1 fields. The likely cause is that the public-pages routes are not registered with the emitter at all — ⭐ if so that is the finding, and it is **wider than this story**: the surface most in need of an auditable contract is the one absent from it. ⚠ Note the asymmetry — the **admin** route's request/response schemas **did** land in the spec.
- [ ] [Review][Patch] **The decrypt bound is stated in all three required places, and it names a mechanism that does ⛔ NOT do the bounding** [`apps/api/src/modules/public-pages/handlers.ts` (the `mapWithConcurrency` call), `routes.ts:551`, `login-wall.spec.ts:702`] — Trap 6 requires *"bound the amplification before you write the read … ⚠ but **say so in writing** rather than letting a reviewer re-derive it"*, and all three documents say *"the fan-out is bounded by `DIRECTORY_DECRYPT_CONCURRENCY` and is **AT MOST EIGHT** values per page"*. ⛔ **The limiter is applied over ACCOUNTS, not values:** `mapWithConcurrency(drive.nomineeBank.accounts, DIRECTORY_DECRYPT_CONCURRENCY, …)` receives **≤2** items against a limit of **8** ⇒ **the limiter never engages**, and the four field decrypts inside run under an **unbounded `Promise.all`**. Real in-flight KMS round-trips are `min(2,8) × 4 = 8` — ⭐ the number is right **by arithmetic accident, ⛔ not by the named control**. Lower `DIRECTORY_DECRYPT_CONCURRENCY` to 2 and the page still puts 8 in flight; raise the account cap and the ceiling becomes `8 × 4 = 32`, **four times the stated bound**, with all three documents still asserting EIGHT. ⭐ The real bound is the substrate's **exactly-two** invariant × four fields — a perfectly good bound, simply ⛔ not the one written down, which is precisely what AC2 required the writing to prevent.
- [ ] [Review][Patch] **The OpenAPI description asserts transactional atomicity the implementation does ⛔ NOT provide** [`packages/contracts/scripts/emit-openapi.ts` → `openapi/v1.yaml`, vs `apps/api/src/modules/nominee-bank-masking/handlers.ts`] — the published contract tells an auditor *"Writes a §1.5 hash-chain audit line **covering the same transaction as the change**."* The audit goes to `deps.servicePool`; the change goes to `request.scopeTx.tx` — **two connections, two transactions**, which is ⭐ **why a compensating-audit pattern is needed at all**. A scope-tx rollback after `mutate` returns (a commit-time serialization failure, an `onSend` error — cf. [[project_fastify_onsend_doublesend]]) leaves an audit line **asserting a change that never landed**. The API description states the opposite of the design.
- [ ] [Review][Patch] **The audit line cannot answer "what did they set it to"** [`apps/api/src/modules/nominee-bank-masking/handlers.ts`, `resourceLocator`] — the locator is `pariwar/${id}/nominee-bank-masking;mode=${body.setting.mode}`: `mode=after_days` is recorded, **`maskAfterDays` is not**. ⇒ `after_days: 0` (mask immediately) and `after_days: 36500` (a century — *"de-facto permanence"* in the contract's own words) produce **byte-identical audit locators**. The day count survives only inside `requestPayloadHash`, a one-way SHA-256; `actorRole: null` is also passed, so the line records ⛔ no role either. ⚠ **The test then pins the omission in place** by asserting the exact locator string. ⇒ for a control whose entire justification is a **governance trail**, the trail ⛔ cannot distinguish the two settings that matter most — and the only place the value is legible (the schedule row) is writable by the same actor.
- [ ] [Review][Patch] **The `effectiveFrom` clamp desynchronizes the audit line's `requestPayloadHash` from the row actually written** [`apps/api/src/modules/nominee-bank-masking/handlers.ts:166,179-188` vs `packages/domain/src/claim/nominee-bank-masking-policy.ts:303-306`] — the handler hashes `effective_from: deps.clock().toISOString()` into the audit intent **before** calling the domain; the domain then **clamps** `effectiveFrom` up to the open head's when the head is newer (the second pass's clock-skew guard). Under NTP skew the persisted row carries `head.effectiveFrom` while the audit line's payload hash covers the **unclamped** instant. ⚠ **Why this matters HERE specifically:** `audit_id` is a `randomUUID()` the handler mints, ⛔ **not** the id `withCompensatingAudit` hands back (`mutate` ignores it) ⇒ the **only** verifiable link between a schedule row and its audit line is **recomputing that hash** — which the clamp is the one thing that can break. ⛔ Nothing re-hashes after the clamp, and the response DTO uses the clamped row, so the API answer is honest and **the divergence is silent**. ⚠ Created by the second pass's own patch.
- [ ] [Review][Patch] **The same clamp falsifies the GET handler's stated invariant** [`apps/api/src/modules/nominee-bank-masking/handlers.ts:121-124`] — the doc-block asserts head and in-force window *"differ only for a head whose `effective_from` is in the future, **which this write path cannot create**"*. ⛔ The clamp creates exactly that: instance A (clock ahead by Δ) writes a head at `T+Δ`; instance B's PUT at `T` is **clamped to `T+Δ`**. ⇒ for Δ the admin GET reports the new setting while `resolveEffectiveNomineeBankMasking` still returns the **previous** one — the console says *masked* while the public page serves a **full account number**, on top of the already-disclosed 300s edge window. ⭐ ⛔ **Not** an exposure gap (the closed row's window still contains `now`), but a **display/verification divergence** on the one screen an operator uses to confirm the exposure is closed. ⚠ Secondarily, the accessor takes a caller-supplied `effectiveFrom` and ⛔ nothing rejects a **future** one, so a migration/backfill/job can create the very head the doc-block says is impossible.
- [ ] [Review][Patch] **A KMS/decrypt outage produces a valid 200 with every Tier-1 field silently `null` — and that degraded page is PINNED TO EVERY EDGE PoP for 300s** [`apps/api/src/modules/public-pages/handlers.ts:658-680`] — `decryptNomineeBankFieldSoft` never throws and returns the sentinel on **any** error including a KMS outage; `soft()` maps it to `null`; the response is a well-formed **200** whose accounts carry only `bankName`/`branch`. The Astro `no-store` override fires only on `!fetched.ok` ⇒ **a degraded-but-successful 200 takes the `s-maxage=300` arm and is cached**. ⚠⭐ **This inverts the repo's own established discipline:** the moderation-rationale and appeal reads deliberately answer **503 on a key-service outage** and reserve `null` for a corrupt envelope, explicitly *"so an auditor can never mistake temporarily undecryptable for no rationale"*. Here both collapse into *"render nothing"* — which is **also** the *"never collected"* signal. `members.astro:175` already demonstrates the `no-store`-on-degraded pattern.
- [ ] [Review][Patch] **Read and write share ONE permission key — ⛔ no read-only visibility into the FAIL-OPEN state** [`apps/api/src/modules/nominee-bank-masking/routes.ts`] — the same `[adminSession, scope, manageNomineeBankMasking]` chain guards **GET** and **PUT**. ⚠ This repo's own feature-flag surface splits `feature_flag.view` from `feature_flag.flip` **and documents why**. ⇒ an auditor, a State Trustee or a DPO ⛔ **cannot determine whether a Pariwar is FAIL-OPEN** — i.e. whether full account numbers are public — **without being granted the ability to change it**. ⭐ The only people who can **see** the exposure are the people responsible for it, which is the inverse of the separation the governance trail exists to create.
- [ ] [Review][Patch] **The admin `GET` can 500 on a corrupt row, in the module that forbids 500s** [`apps/api/src/modules/nominee-bank-masking/handlers.ts`, `getSchedule`] — `settingFromRow(row)` is documented to *"throw loudly rather than picking a side"* on a NULL `mask_after_days` in an `after_days` row, and in `getSchedule` that call sits **outside any try/catch and outside `withCompensatingAudit`** ⇒ an unmapped throw ⇒ **500 on a READ**. ⚠ **The operator's only recovery path is the console that just 500'd**, and direct SQL is explicitly ruled out as the operational fallback. ⭐ Same root as the routed tenant-wide-outage item below; this is its **admin-side** half and ⛔ 11b.11 does ⛔ not touch it.
- [ ] [Review][Patch] **Cross-tenant containment on the new permission key is untested — the negatives use the WRONG ROLE, never the RIGHT role at the WRONG SCOPE** [`apps/api/tests/integration/nominee-bank-masking/admin.spec.ts`] — every positive uses `grantRole(userId, pariwarId, 'super_admin', 'global')`; the negatives use `pariwar_admin` and `auditor`. ⛔ There is **no test that a `super_admin` grant scoped to Pariwar A is rejected for Pariwar B**, and no `district_admin` narrower-ceiling case. ⭐ **Containment itself IS covered-by-construction** — `scopeResolutionHook` 404s on zero grants before any handler runs, and hook and handler read the *same* `request.scopeGrants` at the same `dimension: 'pariwar'` — so this is a **coverage residual, ⛔ not a live hole**. ⚠ But it is the one assertion that would catch a scope-dimension mistake on a route that takes its tenant from a client-supplied path parameter ([[project_rbac_geo_scope_containment]]).
- [ ] [Review][Patch] **Both new admin routes can answer 404, and ⛔ neither the OpenAPI nor the tests admit it** [`apps/api/src/modules/nominee-bank-masking/routes.ts`; `openapi/v1.yaml` documents GET 200/401/403 and PUT 200/400/401/403/409] — `scopeResolutionHook` 404s when `loadActorGrants` returns zero rows, and the `role_grants` SELECT is RLS-scoped on `pariwar_id` with ⛔ no global-grant carve-out. ⇒ a **globally-granted `super_admin` still needs a `role_grants` row whose `pariwar_id` equals the target Pariwar**, otherwise the *"Trust-Admin controlled, centrally"* knob answers **404 Pariwar not found** for a Pariwar that exists. ⭐ The **mapping** is correct (`NotFoundError extends ApiError`); the gap is that ⛔ neither authoritative document lists the status and the spec only ever grants a row in the target Pariwar, so **the operator-facing dead end is untested**.
- [ ] [Review][Patch] **Negative contract tests assert only `success === false`, never WHY** [`packages/contracts/tests/public-pages-sahyog-vivran.test.ts`] — every rejection case checks the boolean alone. A parse failing for an **unrelated** reason (a change to `ENTRY`'s other required keys, a discriminator rename making *every* arm fail) keeps them all green **while the AC4 guarantee has evaporated**. ⚠ These are the tests carrying the story's headline claim — *"AC4 IS A SHAPE, ⛔ NOT A CONVENTION"* — so they should assert the **issue path / `code`**, not just falsity. ⭐ Family 6 is otherwise the strongest-covered family in the chunk; this is its one soft edge.
- [ ] [Review][Patch] **Two small contract/route hygiene gaps** — **(i)** the emitted OpenAPI **drops the `.trim()`**: `rationale` publishes as `minLength: 1`, so a spec-generated client believes `"   "` is valid where the server 400s it (and `maxLength: 2000` is applied *post*-trim server-side but *pre*-trim per the spec) [`openapi/v1.yaml` vs `packages/contracts/src/nominee-bank-masking/masking.ts:129`]. **(ii)** neither new admin route declares a **`querystring` schema**, so they silently accept `?setting=permanent&…`, where the public route boasts *"the `.strict()` EMPTY query schema makes every query parameter a 400"*. ⛔ Not exploitable as written; it removes the boundary that makes a future *"we'll read it from the query"* shortcut fail loudly.
- [ ] [Review][Patch] **`{ configured: true, setting: null }` is representable on the wire, and "masking reduces the decrypt" is half true** — **(i)** `configured: z.boolean()` and `setting: …nullable()` are **independent** [`packages/contracts/src/nominee-bank-masking/masking.ts`]; the doc-block insists these are two facts an operator must distinguish, the schema permits the **contradictory pair**, and the file forbids adding a `.refine()`. A second producer (a cached read, a mock, a future BFF) can emit it and the console renders something meaningless. **(ii)** the masked arm **still decrypts the full account number** to compute the last four, so the header's framing (*"⛔ TWO decrypts, ⛔ not four"*) is true of the **wire** but ⛔ not of **process memory**: the crown-jewel plaintext is materialised in the API process on **every anonymous, edge-cacheable request** regardless of masking state. ⭐ Masking reduces what crosses the wire; it does ⛔ not reduce heap-dump / log-capture exposure, and the doc should not imply otherwise.

#### Deferred

- [x] [Review][Defer] ⭐⭐ **PROMOTED OUT OF DEFERRAL 2026-09-05 — ruled with G3's version decision as `#decision-2026-09-05-201` (BOTH, LAYERED; idempotency FIRST). ⛔ No longer deferred: it is a PATCH under that ruling.** **The PUT has ⛔ no idempotency key and ⛔ no no-op detection** [`apps/api/src/modules/nominee-bank-masking/handlers.ts:143-213`] — a client retry after a timeout, or a double-clicked console button, appends a second schedule **version** with identical content plus a second audit line, closing the head it just opened. The advisory lock serializes them, so **both succeed**. ⚠ Compare `feature_flags`, which accepts an `Idempotency-Key` header for exactly this (*"a replay with the same key returns the original response instead of creating a second identical version"*) ⇒ the divergence from the named precedent is the finding. Consequence is a **padded governance trail**, ⛔ not a wrong setting — but the trail is the artifact the ruling exists to produce. **Trigger:** the story that generalises `Idempotency-Key` across admin mutations.
- [x] [Review][Defer] **An unauthenticated caller gets 400, not 401, whenever the request is malformed** [`apps/api/src/modules/nominee-bank-masking/routes.ts:309,332`] — Fastify runs schema validation **before** `preHandler`, and the whole auth chain is a `preHandler`. ⇒ `PUT …/schedule` with a non-UUID `pariwarId`, or a malformed body, is rejected **400 with ⛔ no session required**, and the ≤2000-char rationale is parsed **pre-auth**. ⚠ The story's own 401 assertion passes only because it sends a **well-formed** payload. ⛔ Same shape as the `directory-publication` precedent ⇒ **house pattern, ⛔ not a new defect**; recorded because it is an enumerated path both the tests and the OpenAPI assert away. **Trigger:** the next auth-ordering sweep.
- [x] [Review][Defer] **⭐ AMENDS the G1 advisory-lock defer — there is a THIRD collider, not one** [`packages/domain/src/claim/nominee-bank-masking-policy.ts:286`] — the bare un-namespaced `hashtext(pariwarId)` key is also taken by `pool/fixed-amount.ts:534,620` **and `degraded-mode/declarations.ts:80`**. ⇒ a masking-schedule PUT mutually excludes a fixed-amount write **or a degraded-mode declaration** for the same Pariwar, for the whole remaining scope transaction (the lock is `xact`-scoped and the scope tx commits **after** the handler returns and the response is serialized). ⭐ Contrast the **discriminated** key used at `pool/spawn.ts:586` (`cycle.spawn.finalize:${cycleId}`) — the convention exists in this codebase and was not followed. Contention/latency, ⛔ not correctness.

#### ➡️ Routed to Story 11b.11 (additional to the G1 list)

- **The bank block is published regardless of the drive's OUTCOME — including DENIED and APPEAL-REVERSED claims** [`apps/api/src/modules/public-pages/handlers.ts`] — the `mapWithConcurrency` over `drive.nomineeBank.accounts` is **unconditional**, and the only suppressor anywhere on the path is the **time-since-close** masking predicate. The same response object carries `appealReversal` and `fundingOutcome`, so a claim that was **denied**, or whose approval was **reversed on appeal**, still publishes the account holder's name and full account number indefinitely under FAIL-OPEN. ⭐ `-160` cl.10(a) authorises publication *"during an active campaign"*; ⛔ nothing here checks the campaign is **legitimate**, only that it is **recent**. ⇒ **11b.11 AC1 closes this by deletion** — but ⚠ confirm the **member** donor path (which retains all four values under AC6) does not inherit the same unconditional projection.
- **FAIL-OPEN by default, centrally administered, with O(N) remediation and a five-minute floor** [`apps/api/src/modules/nominee-bank-masking/handlers.ts`] — `configured: false` resolves FAIL-OPEN, and `-178` forbids a Pariwar setting its own window ⇒ the incident path is **one Trust PUT per Pariwar**, each with a hand-written rationale, each taking up to **300s** to reach warm PoPs, with *"⛔ Direct SQL is NOT the operational fallback"*. ⛔ There is no global default, ⛔ no bulk setter and ⛔ no cache-purge hook ⇒ an account number being actively abused has a remediation time of **N admin requests + 5 minutes**, N unbounded. ⭐ Documented three times, mitigated zero. ⇒ **REACTIVATION PRECONDITION** alongside the two G1 items.
- **The route header's "FOUR applicable controls" overcounts what actually defends** [`apps/api/src/modules/public-pages/routes.ts`] — control **4** is `X-Robots-Tag: noindex, nofollow` (a crawler **hint** — archivers and scrapers ignore it), control **5** is *"the absence of any DETAIL or EXPORT affordance"* (irrelevant to a direct GET), and control **6** is the decrypt itself. ⇒ netting out, **one** control stands between an anonymous caller and Tier-1 data. ⚠ **The enumeration half is CLOSED** — `2026-09-03-184` (B) ruled the address unguessable and **11b.10 shipped the opaque `publicToken`**, so the sequential-walk premise no longer holds (see the dismissal below). ⭐ What survives is that counting three non-controls as controls **manufactures a false defence-in-depth** on the exact document a future reviewer will trust. ⇒ 11b.11 rewrites this header under AC4/AC5 — correct the count **there**.

#### Dismissed (G2)

- **"The only real control is a rate limit keyed on a caller-supplied header; an anonymous client can walk `P-2026-09-001…999` and bulk-harvest account numbers"** (Blind Hunter, **HIGH**) — ⛔ **SUPERSEDED, ⛔ not open.** ✅ **VERIFIED**: `2026-09-03-184` (B) ruled **MAKE THE ADDRESS UNGUESSABLE**, and **Story 11b.10 shipped it** — `readPublicSahyogVivran` now resolves a drive by an opaque `publicToken` and by ⛔ **nothing else** (`sahyog-vivran-read.ts`, and its doc-block forbids an `OR` arm for the canonical identifier). ⇒ **the sequential-walk premise was true when 11b.3a shipped and is false at `HEAD`.** ⭐ The layer read the story's own (accurate, at-the-time) prose and could not see the ruling that answered it — the same chunk/time blindness as the G1 wiring dismissal.
- **"`PUT` writes a governance record for a `pariwarId` that need not exist; a one-character typo returns a cheerful 200"** (Blind Hunter, MEDIUM-HIGH) — ⛔ **FALSE.** The tenant **is** validated — via **grants**, ⛔ not via the `pariwars` table: `scopeResolutionHook` 404s when `loadActorGrants` returns zero rows, and `role_grants` is RLS-scoped on `pariwar_id`. ⇒ a typo'd id has ⛔ **no grant row** and answers **404**, ⛔ never 200. The spec's `freshPariwar()` succeeds only because `grantRole()` **creates** the grant for that id. ⭐ Corroborated independently by the Edge Case Hunter and by the Auditor's family-12 `covered-by-construction`. ⚠ Residual, ⛔ not raised: a Pariwar with grants but no `pariwars` row is writable — reachable **only** by a seeding artifact.
- **"`soft()` will throw if the decrypt helper ever returns `null`, 500-ing the whole page"** (Blind Hunter, LOW — self-flagged as reasoning without the file) — ⛔ **NOT CONSTRUCTIBLE.** ✅ **VERIFIED**: `decryptNomineeBankFieldSoft` is typed `Promise<string>`, returns `NOMINEE_BANK_DECRYPT_FAILED_SENTINEL` on **any** error, swallows even a logging failure, and ⛔ **never returns `null` and never throws** (`apps/api/src/modules/claims/nominee-bank-crypto.ts:57-74`). ⇒ `value.length === 0` cannot fault. ⭐ The stated `⚠ FAIL-SOFT PER FIELD, ⛔ never per page` contract holds. (The **outage** variant is a real and separate finding — see the KMS patch above.)
- **"A double flip has no 409 and no test; two simultaneous PUTs produce two open heads or an unregistered `23505` → 500"** (Blind Hunter, MEDIUM) — ⛔ **FALSE at the concurrency claim.** The serialization lives in the shared domain accessor — `pg_advisory_xact_lock` at `nominee-bank-masking-policy.ts:286` — which the blind layer could not see, and it **is** exercised by a genuine two-connection race in `packages/domain/tests/integration/claim/nominee-bank-masking-concurrency.spec.ts` (*"TWO INTERLEAVED WRITERS SERIALIZE — exactly one open head, versions 1 and 2, ⛔ no 23505"*). Auditor verdict: family 2 `covered-by-construction` for this chunk. ⚠ The **idempotency** half is real and is deferred above.

---

### 🔷 G3 — `apps/public` + `apps/admin` + `packages/i18n` + `scripts` (19 files / +1,998), reviewed 2026-09-05

**Outcome:** 27 raw findings → **6 merged duplicates → 24 surviving, 3 dismissed.** **1 decision-needed** ·
**16 patch** · **4 deferred** · **3 routed to 11b.11**. ⭐ **Three more REAL GAPs** — families **10**,
**11** and **13** — at AC severity, ⛔ none downgraded.

⭐⭐ **AUDITOR FAMILY VERDICTS (G3).** 3 `covered-by-construction` (one untested residual) ·
6 `covered-by-test` · **10 REAL GAP** · **11 REAL GAP** · **13 REAL GAP**. Families 1, 2, 4, 5, 7, 8,
9, 12 untouched.

⭐⭐⭐ **THIS CHUNK IS WHY G3 WAS WORTH REVIEWING, AND THE PROOF IS A DEFECT THE THIRD PASS ITSELF
ALREADY "FIXED".** On 2026-09-04 this pass raised the Policy-meaning sentence as a **family-11 REAL
GAP** and corrected it — in the **spec**. ⛔ The identical falsehood was sitting in the **SHIPPED
OPERATOR COPY** the whole time and was never touched, because G3 was unreviewed. ⇒ the fix corrected
the **record**, ⛔ not the **product**. ⚠ By the Auditor's count this is the **THIRD** instance of the
class in this story: pass 1 fixed `bank.masked_note` asserting closure on a `live` drive; pass 2 fixed
the same note asserting a partial value that was **absent**; ⛔ the **admin half was never swept
either time**.

⭐⭐ **AND FAMILY 13 SPLIT EXACTLY WHERE SOMEBODY WROTE THE CHECKS DOWN.** The **Astro** half carries a
written four-check web translation at `[driveToken].astro:289-311` and **meets all four** (with (b)
held **vacuously and said so**) ⇒ `covered-by-construction`. The **admin console** — ⭐ the half **AC7
names explicitly** (*"the same translation is owed on the admin knob surface, which is neither Astro
nor RN"*) — carries ⛔ **no such note** and **fails three checks in fact**. ⚠ Independently corroborated
before the layers reported: `apps/public/tests/sahyog-drive-link-a11y.test.ts` is the ⛔ **only**
accessibility test in `apps/public/tests/`, it was written by **Story 11b.10** for **its own** surface
(`/sahyog`'s drive link, *"AC3, family 13"*), and ⛔ **nothing tests accessibility on the Sahyog Vivran
page at all.** ⇒ within one epic, 11b.10 applied family 13 and left a test; **11b.3a did not**. ⭐ That
is the checklist's own stated prediction observed directly — *"un-mechanized BY RULING ⇒ the half that
decays … a missed check leaves ⛔ no trace."*

⚠⛔ **VERIFICATION — UN-ATTESTED, as with G1 and G2.** ⛔ `pnpm ci:local` was ⛔ not run for this chunk
and ⛔ no fix was applied. Every `✅ VERIFIED` below means **read against the live tree at `HEAD`**,
⛔ never executed. ⭐ **Staleness matters more here than anywhere:** **8 of these 19 files changed after
the story closed** (11b.10 renamed `[poolCanonicalIdentifier].astro` → `[driveToken].astro` and edited
seven others), so every finding below was re-read at `HEAD` before it survived triage.

#### Decision-needed

- [x] [Review][Decision] ✅ **RULED 2026-09-05 (BigDev) — `#decision-2026-09-05-201`: BOTH, LAYERED. See the resolution at the end of this item.** **The console DISPLAYS a `version` and ⛔ NEVER SENDS IT BACK — there is no optimistic concurrency on the one control that publishes bank account numbers.** [`apps/admin/src/api/client.ts` request body · `MaskingSchedulePage.tsx:173` renders `nominee-bank-masking-version`] — the GET response carries `version` and the page renders it under its own `data-testid`; the PUT body is **only** `{ setting, rationale }`. ⚠ The client's doc-block **enumerates its deliberate omissions** (*"⛔ The request body deliberately carries NO display name and NO effective-from"*) — ⛔ `expectedVersion` is **not among them**, i.e. it was ⛔ not considered rather than considered and declined. **Failure:** two `super_admin`s open the page. A sets `permanent` (v5 → v6). B, whose page still shows v5, submits `after_days: 30` with a rationale about a **different** decision. **Last write wins silently**, B's rationale is recorded as the justification for reverting A's change, and the complete account number becomes public again on every `live` drive, un-pullable for `s-maxage=300`. ⭐ **Showing a version while not using it for conflict detection is worse than not showing one** — it signals a guard that does not exist. ⚠ Independently reached by two layers. **Options:** (a) add `expectedVersion` to the request and a `409` on mismatch — ⛔ a **contract change** (`packages/contracts` + `openapi` + the domain accessor), so it is ⛔ not an author's call; (b) drop the version from the UI so it stops implying a guard — cheap, but loses operator-visible provenance; (c) accept, and record it as an accepted risk with a re-examination trigger. ⚠ Note (a) interacts with G2's *"the PUT has no idempotency key"* defer — ⭐ they are the same seam and should be ruled together, ⛔ not twice. — ✅⭐⭐ **RULED 2026-09-05 (BigDev), TOGETHER WITH THE G2 DEFER — `2026-09-05-201`: (a) AND the key, LAYERED.** ⭐⭐ **AND THE INVESTIGATION FOUND WHY NEITHER ALONE WORKS, which neither raising layer had seen:** `nominee-bank-masking-policy.ts:277-286` records that the **second pass added the advisory lock** so a losing writer would stop hitting `…_pariwar_version_uq` with a bare **23505 → opaque 500**. ⛔ **But that collision was the ONLY thing preventing a silent overwrite** — the lock converts a race into a **QUEUE**, so both writers now succeed as N and N+1 and the second ⛔ never learns the first happened. ⚠ Contrast `feature-flags/handlers.ts:207`, this module's own model, which **lets its unique constraint fire** and so gets lost-update protection **free** — *"the unique constraint only catches a CONCURRENT double-flip … a SEQUENTIAL replay … reports two operator decisions where there was one … a **correctness problem**, not just noise"*. ⇒ ⭐ **feature-flags needs only the key; masking needs BOTH, because it traded its 409 seam away.** ⛔⛔ **AND THE ORDER IS LOAD-BEARING — idempotency FIRST:** reversed, a legitimate retry carries the **stale** version, `expectedVersion` fires, and the operator is told *"someone else changed this"* when the someone was **themselves** ⇒ a **false signal** that drives a re-submit, **manufacturing the very duplicate the key exists to prevent**. ⭐ `expectedVersion` is **REQUIRED and `number | null`** (⛔ not optional — the sole caller holds the version, and optional repeats G1's `actorGrants?:` defect; `null` = *"I believe there is no schedule yet"*, which makes the **first** write safe too), mismatch ⇒ **409 with its own REGISTERED code**. ⛔ **Option (b) REFUSED** — dropping the version from the UI removes the operator's provenance view to avoid building the guard, on the surface whose purpose **is** provenance. ⇒ **re-classified as a PATCH** (⛔ left as an action item; ⛔ not applied).

#### Patch

- [ ] [Review][Patch] **REAL GAP — family 11: the console tells the operator that a collecting drive ALWAYS shows complete details. Under `permanent` that is FALSE, and it is the sentence this very pass corrected one document away.** [`apps/admin/src/modules/nominee-bank-masking/i18n-en.ts:25-26`, `:58-61`] — ✅ **VERIFIED at HEAD.** `header.subtitle` — ⭐ **the first thing the operator reads** — states: *"…after a drive closes. **While a drive is still collecting, the complete details are shown** so that anyone can check the trust is paying a real family. **This setting governs what happens afterwards.**"* Both emphasised clauses are false for one of the three ruled settings: `isNomineeBankMasked` returns `true` for `permanent` **before every close-instant rung**, the **terminal rung** of cl.10(d) (`-183` cl.4, accepted 2026-09-03). The form repeats the softening: `form.modeLabel` = *"What should happen **after a drive closes**"* and `form.daysLabel` = *"Days after the drive closes"*. ⭐⭐ **THE ONE CORRECT SENTENCE IS STRUCTURALLY UNREACHABLE AT THE MOMENT OF CHOOSING.** `status.permanent` (`i18n-en.ts:49-50`) does say *"at all times, **including while a drive is still collecting**"* — but ✅ **VERIFIED** it is emitted only by `settingSentence()` (`MaskingSchedulePage.tsx:79`), which describes the setting **already in force**, and the **form renders ⛔ no status sentence at all** (grep returns nothing). ⇒ the operator sees it only **after** saving. ⚠⛔ **The module's own comment forbids exactly this** (`MaskingSchedulePage.tsx:421-423`): *"⛔ **Do not soften it to 'after a drive closes': an operator choosing it must know it also covers the active campaign.**"* ⭐ `permanent` is the one setting that suppresses cl.10(a)'s entire transparency purchase on an actively-collecting drive. ⚠ `s-maxage=300` runs the **wrong way** here (it delays the *hiding*, ⛔ not the exposure) ⇒ a **correctness-of-understanding** defect, ⛔ not a leak. **Fix is copy-only:** one clause on `header.subtitle`, one on `form.modeLabel` or `form.modePermanent`, plus a test on the **form** path — `nominee-bank-masking-page.test.tsx:894` asserts the **status panel only**, so the gap leaves ⛔ no CI trace. ⭐⭐ **SURVIVES 11b.11** — cl.4 explicitly RETAINS the admin console.
- [ ] [Review][Patch] **REAL GAP — family 13, item 1: `aria-invalid` and `aria-describedby` are absent on BOTH new form controls, orphaning the clause this story treats as load-bearing.** [`apps/admin/src/modules/nominee-bank-masking/MaskingScheduleForm.tsx`] — a grep for `aria-` returns **only** the form's `aria-label` and the button's `aria-busy`. Three consequences: **(i)** the invalid state is ⛔ never announced **on the control** — a user returning to the day field hears *"Days after the drive closes, edit text"* with ⛔ no indication it is rejected; **(ii)** the error is announced **once**, on insertion, via `role="alert"`, and ⛔ re-announces nothing on return; **(iii)** ⭐ **the HINTS are unassociated too, and one is load-bearing policy copy** — `form.daysHint` reads *"Enter 0 to hide the details as soon as a drive closes — **that is a choice you are making, not a default**"*, which is the operator-facing form of **cl.10(b)**, and it is an orphan `<p>` a screen-reader operator moving by form control ⛔ never hears. ⚠⛔ **This is ⛔ NOT an invented standard — it is a deviation from an established in-repo convention:** `apps/admin/src/modules/audit-integrity/AcknowledgeForm.tsx:51-59` is the same RHF-plus-rationale shape done correctly (`aria-invalid` + `aria-describedby` + an `id`'d `role="alert"`), and `aria-invalid` appears **12 times across 8 admin modules**. ⭐ The sibling this module was copied from (`PublicationForm.tsx`, 10.30) shares the gap — so the class is **inherited** — ⛔ but a better precedent existed in the same app. **Fix ≈ 6 lines**, and it closes item 2 below with it.
- [ ] [Review][Patch] **REAL GAP — family 13, item 2: the blocked-submit state — which is the form's DEFAULT state — announces ⛔ NO reason at all.** [`MaskingScheduleForm.tsx:208`] — `disabled={pending || rationaleIsBlank || daysInvalid}`. A `disabled` button is **out of the tab order** and offers ⛔ no affordance. With a blank rationale — ⭐ **the initial state, and the state after every successful save**, because `resetToken` clears it — react-hook-form's `required` validation ⛔ never runs (the disable prevents the submit attempt), so `errors.rationale` stays `undefined` and ⛔ **no message renders at all**. A sighted operator at least sees a greyed button and the visible hint; a screen-reader operator tabbing the form finds ⛔ **no submit control and hears nothing explaining why**. ⚠ The file's own comment concedes the design point without noticing the consequence: *"⚠ The disable-until-valid behaviour is a COURTESY, ⛔ not the boundary"* — ⭐ **the courtesy is inaccessible.** ⚠ Pattern inherited from 10.30, but **this story adds a second silent disabling condition (`daysInvalid`) of its own.**
- [ ] [Review][Patch] **REAL GAP — family 13, item 3: focus is lost to `<body>` on success, while the confirming region is a newly-inserted POLITE live region that may never be announced.** [`MaskingSchedulePage.tsx:555-560` → `MaskingScheduleForm.tsx:104`] — on success the parent sets `saved` and bumps `resetToken`; the form's effect runs `reset({ rationale: '' })`; `rationaleIsBlank` becomes true ⇒ ⭐ **the submit button the operator just activated becomes `disabled` while it holds focus**. Browsers move focus off a disabled element to `<body>`, so a screen reader's virtual cursor **resets to the top of the document**. ⚠ Compounding: every status region is **conditionally mounted**, entering the DOM at the same instant as its text — `role="alert"` is reliably announced on insertion, but a newly-inserted **polite** region commonly is ⛔ not (NVDA/JAWS frequently miss it), and the at-risk message is the success line, ⭐ **which is the one carrying AC6's whole point** (*"The public pages will catch up as their cached copies expire"*). ⇒ a screen-reader operator can complete a governed change to what the public sees of a family's bank account and receive ⛔ **no confirmation and no focus anchor**. ✅ Verified: ⛔ nothing in the module calls `focus()` or holds a ref. ⚠ Inherited from 10.30 — ⭐ but materially worse here: that control is a **boolean publish switch**; this is a **three-setting knob** whose mistaken-state failure mode, established by this story's **own second-pass finding**, is publishing a full account number for `s-maxage=300`. **Fix:** render the status region always and toggle its content; move focus to it on settle.
- [ ] [Review][Patch] **AC7's web translation is owed on the admin surface and was ⛔ never written — the omission is the reason the three items above exist.** [`apps/admin/src/modules/nominee-bank-masking/`] — AC7 says in terms: *"⚠⛔ family 13 is written in REACT-NATIVE vocabulary and this is an ASTRO surface … **And ⭐ the same translation is owed on the admin knob surface, which is neither Astro nor RN**."* ⭐ The **Astro** half discharges it in full at `[driveToken].astro:289-311`. ✅ **VERIFIED**: a grep over the admin module finds ⛔ no family-13 note, ⛔ no `aria-live`, ⛔ no `aria-invalid`, ⛔ no `aria-describedby`, ⛔ no `focus()` and ⛔ no `useRef` — while the same two files document rationale, cl.10(b), the 10.30 findings and the propagation floor **at length**. ⇒ ⭐ **the family held exactly where somebody wrote it down and failed exactly where nobody did.**
- [ ] [Review][Patch] **The `permanent` → `after_days` transition PRE-FILLS `0` — the code assuming the strictest day value, which cl.10(b) and this file's own header forbid in terms.** [`MaskingScheduleForm.tsx:76`] — ✅ **VERIFIED at HEAD**: `if (setting.mode === 'permanent') return { mode: 'permanent', days: '0' };` (and `:75`, the unconfigured case, likewise seeds `'0'`). The header states: *"`0` **IS A LEGAL, MEANINGFUL VALUE** … and it is **a choice the admin makes**, ⛔ never a default the code assumes (cl.10(b) forbids that in terms)."* ⭐⭐ **This defeats the second pass's headline fix ONE CLICK LATER.** That fix held for the **mode** — a `permanent` Pariwar correctly opens on `permanent` — ⛔ but the disabled day field already reads `0`. The operator clicks the `after_days` radio to *consider* a window, types a rationale, and the submit is armed to send **`after_days: 0`**. ⚠ That is precisely the transition the story exists to prevent: **`permanent` masks a `live` drive; `after_days: 0` does ⛔ not** ⇒ one click plus a rationale publishes holder name, account number, IFSC and VPA on **every live drive**. ✅ ⛔ **There is no test for the `permanent → after_days` transition anywhere** — the two seeding tests assert the **initial** radio state only. **Fix:** leave the day field **empty** on a transition out of `permanent` and let the existing blank-guard block submit, so `0` can only ever be typed.
- [ ] [Review][Patch] **The terminology gate bans a VOCABULARY while the copy it guards makes the banned CLAIM in permitted words — and the claim is false.** [`apps/admin/tests/nominee-bank-masking-terminology.test.ts` vs `i18n-en.ts:46`, `:63`] — ✅ **VERIFIED**: the needles are `immediately` / `instantly` / `right away` (assembled at runtime), and the guarded copy reads *"The details are hidden **as soon as a drive closes**"* and *"Enter 0 to hide the details **as soon as a drive closes**"*. ⭐ The gate's own rationale is *"An operator who believes otherwise closes the tab and reports the change as done while the account number is still public"* — ⛔ *"as soon as a drive closes"* produces **exactly that belief**, clears all five needles, and is contradicted **on the same screen** by the propagation notice (*"up to five minutes"*). ⚠⭐ **G2 found the matching half independently:** the `s-maxage=300` staleness is disclosed in three places, **all framed as a SCHEDULE-CHANGE delay**, and the identical delay on the **drive-close / time-elapse** transition is disclosed ⛔ nowhere. ⇒ ⭐ **the gate mechanizes the words, not the proposition** — [[feedback_mechanization_split_commitment]] exactly: decay concentrates in the un-mechanized half. ⚠ Other permitted phrasings that also clear it: *"at once"*, *"instant"*, *"without delay"*.
- [ ] [Review][Patch] **A failed background REFETCH replaces the whole status panel while the form below stays live, seeded and SUBMITTABLE.** [`MaskingSchedulePage.tsx:129` vs `:182`] — ✅ **VERIFIED at HEAD**: the status ladder branches `isLoading ? … : isError ? … : data ?`, but the form is gated on **`{schedule.data && (…)}` alone** — ⛔ never on `isError`. TanStack v5 flips `status` to `'error'` while **retaining `data`**, and a refetch is **guaranteed** here (the mutation invalidates on every success, and `staleTime: 0` with default `refetchOnWindowFocus` refetches on every focus). ⇒ the operator can submit a governed change while the panel the code designates as the source of truth shows an **error**. ⚠ **Two specific losses:** the `configured: false` **FAIL-OPEN warning** — ⭐ the copy the page's own comment calls *"the most consequential state"* — **disappears**; and the *"THE FORM MUST OPEN ON THE TRUTH"* property becomes **unverifiable by the operator at the moment they act**. ⚠ The `DirectoryPublicationPage` precedent has the same shape, ⛔ but that surface's stale-read cost is a **boolean**, not a published account number.
- [ ] [Review][Patch] **A network or contract-drift failure on the PUT is the ONE case where "did it save?" is genuinely ambiguous — and it is the only case with ⛔ no guidance and ⛔ no refetch.** [`MaskingSchedulePage.tsx:56` fallback; `apps/admin/src/api/hooks.ts:512-517`] — the curated ladder requires `instanceof ApiError`, so a `fetch` rejection (Wi-Fi drop, proxy reset, throttled tab) falls to `return error.message` and the operator sees the raw **`Failed to fetch`**. ⚠ Because `onSuccess` never ran, `invalidateQueries` ⛔ never fires ⇒ the status panel keeps rendering the **pre-change** setting. ⇒ the operator reads *"it failed and the old setting stands"*, retries, and records a **second** governed change with a second audit row and a second version — **or walks away believing a full account number is masked when it is not.** ⭐⭐ **The copy that says exactly the right thing is the one branch that cannot be reached:** `error.unexpected` reads *"the change **may not have been saved** — reload the page to check."* ⚠ Same line also renders a raw **`ZodError`** JSON dump into `role="alert"` on contract drift. ⚠ The comment two lines above states the intent — *"curated copy, ⛔ not the raw server code/message"* — and the branch below does the opposite. **Fix:** treat non-`ApiError` as the `unexpected` case, and refetch on error.
- [ ] [Review][Patch] **`errorMessage()` is shared between the GET and the PUT, so a failed READ is reported in WRITE-tense copy about fields the operator never touched.** [`MaskingSchedulePage.tsx`, `errorMessage` used at both `:131` and `:202`] — the 400/409 strings are written entirely for the write path: *"The server rejected these values, so **nothing was saved**. Check that the **rationale** is not excessively long and that the **number of days** is a whole number…"*; the 409 is *"**Your change was not saved** because your user record has no display name set."* ⚠ The route is **direct-URL only and deliberately unlinked from any nav menu**, so operators type or paste `/p/<uuid>/nominee-bank-masking` ⇒ a mistyped UUID yields a **GET** failure rendered as a **form** error, and the operator hunts a nonexistent rationale/days problem instead of the URL. **Fix:** separate read-path copy, or a `context` argument to `errorMessage`.
- [ ] [Review][Patch] **Mutation state is ⛔ not reset on a Pariwar change — the missing sibling of the fix that IS there.** [`MaskingSchedulePage.tsx:95-97`] — the effect exists **precisely because** *"client-side nav between two Pariwars' pages does not remount this component"*, and it resets `saved`. ⛔ It does **not** call `change.reset()`. ⇒ a `super_admin` who takes a **409** or **403** on Pariwar A and then navigates to Pariwar B lands on a **fresh, untouched form for B already displaying A's red failure text**. ⚠ If A's mutation is still in flight, `change.isPending` additionally renders **B's** button disabled and reading *"Saving…"*, implying a write against B that is not happening. ⭐ `key={pariwarId}` remounts the **form**, ⛔ but `submitError`/`pending` are props computed in the **parent** from the un-keyed mutation. ⚠ Reachability is **exactly what the author already accepted** when writing that effect.
- [ ] [Review][Patch] **A background refetch silently DISCARDS a half-typed rationale and moves the radio under the operator's cursor.** [`MaskingScheduleForm.tsx:104-109`] — ⚠ raised independently by **two** layers. The re-seed effect depends on `currentSetting.mode`/`maskAfterDays`; `refetchOnWindowFocus` is **not overridden**. ⇒ operator A opens on `after_days: 90`, types a long rationale citing a board resolution, alt-tabs to the PDF; operator B sets `permanent`; on refocus the effect fires, `reset({ rationale: '' })` wipes the text and `setMode('permanent')` **moves the radio** — with ⛔ **no banner, no toast, no `role="status"` announcement**. ⭐ If A does not notice, retyping a rationale **saves the terminal rung** while believing they re-affirmed a 90-day window. ⚠ The effect's comment argues for the dependency on **seeding-lies** grounds only and ⛔ never addresses **loss of operator input**; there is ⛔ no `isDirty` guard (`formState` destructures `errors` only). ⭐ The correct behaviour for the **post-save** case and the **concurrent-edit** case differ, and the code does ⛔ not distinguish them.
- [ ] [Review][Patch] **REAL GAP — family 10: the scrape leg's two-account fixture buys ⛔ NOTHING, and its comment claims the opposite.** [`apps/public/tests/integration/public-pages/scrape-test.spec.ts`, the HTML builder] — ⚠ raised independently by **two** layers. The comment justifies the fixture: *"⭐ TWO accounts, one FULL and one MASKED, on purpose. **A fixture with only one arm would leave the other's four Tier-1 declarations unexercised on the very leg that exists to catch a leak.**"* ⛔ The scanned HTML is built from **`model.nomineeAccounts[0]` only** — the **full** account. The masked account (`accountRank: 2`, last-4 `9012`) contributes **nothing** and is ⛔ never scanned. ⇒ if the masked arm ever regressed to emitting a full number into the render model, ⛔ **this leg would not see it**, on the leg the comment says covers it. ⚠ The companion *"the MASKED projection does NOT trip it"* case compounds it: it fabricates the masked state with `SAHYOG_VIVRAN_HTML.replace('123456789012', 'Account ending in 9012')` — asserting that a **hand-edited string** does not match a regex, which proves ⛔ nothing about `nomineeAccountRow` (and `String.replace` with a literal substitutes only the **first** occurrence). ⭐ Impact is genuinely limited — the masked arm **is** validated hard in `sahyog-vivran-client.test.ts` — ⇒ this is a **closure-honesty** defect (a coverage claim outliving what it describes), ⛔ not a coverage hole. **Fix:** iterate **both** accounts into the built HTML, or one honest sentence saying the second arm serves the field-id set and ⛔ not the leak leg.
- [ ] [Review][Patch] **The financial-truth gate's SCOPE SAFEGUARD is structurally blind to the entire file family this story added to the read path.** [`scripts/sahyog-vivran-financial-truth/check.ts:95-106`, `:117`] — ✅ **VERIFIED at HEAD.** The gate has two halves: an explicit `SCAN_FILES` list, and `findSahyogVivranCandidates`, the safeguard that **fails the build when a read-path-looking file is missing from the list**. ⭐ 11b.3a correctly paid the `SCAN_FILES` tax for its three new domain modules — ⛔ but did ⛔ not touch the safeguard. `CANDIDATE_DIRS.sharedDirs` omits **`packages/domain/src/claim`** entirely, and the filter requires **`/sahyog-vivran/i.test(entry)` on the FILENAME**, which ⛔ **no `nominee-bank-*.ts` will ever satisfy**. ⇒ a future story adding a fourth `claim/nominee-bank-*.ts` to this read path and forgetting `SCAN_FILES` gets `▸ Scope safeguard — ✓ none` and **exit 0**. ⭐ The three files that **are** scanned are covered **only because they were typed in by hand** — the mechanism meant to make the list self-maintaining cannot see any of them. ⚠ The gate's own header warns *"a gate that does not cover the new surface silently under-protects"* ⇒ enforced by **convention alone** for this family ([[project_gate_scope_semantic_coverage]]: *a green scan proves nothing*).
- [ ] [Review][Patch] **A test asserts a call was ⛔ not made without ever attempting it — it passes with the implementation deleted.** [`apps/admin/tests/nominee-bank-masking-page.test.tsx`, the day-ceiling case] — the body types `999999999` and a rationale, then asserts `toHaveProperty('disabled', true)` and `expect(client.setNomineeBankMaskingSchedule).not.toHaveBeenCalled()` — ⛔ **with no `user.click`**. ⇒ the second assertion is a **tautology** that holds for any implementation, including one with no submit guard. ⭐ The **sibling blank-field test does click** before the same assertion, so this is an **oversight, ⛔ not a convention**. ⇒ if the `> MAX_DAYS` term is later removed from `daysInvalid`, only the `disabled` assertion catches it, and a refactor of the disabled logic degrades this test to asserting **nothing**.
- [ ] [Review][Patch] **The 400 and 409 branches — the entire point of the "review 2026-09-03" change — have ⛔ ZERO tests, and the 403 test exercises a path that cannot occur.** [`MaskingSchedulePage.tsx` vs `nominee-bank-masking-page.test.tsx`] — the change advertises itself: *"⭐ THE DESIGNED LIST IS 400/401/403/409, AND EACH NOW GETS ITS OWN ANSWER (review 2026-09-03)."* ⛔ The only status covered is **403**, and only on the **mutation**. ⇒ **(a)** a refactor collapsing the 409 or 400 branch back into `unexpected` — ⭐ precisely the regression this change reversed — keeps the suite **green**; **(b)** the 403 test asserts *"⛔ does NOT hide the form"*, but the whole base path is gated server-side by the **same** permission, so a non-holder gets 403 on the **read**, `schedule.data` is `undefined`, and the form ⛔ never renders ⇒ **the tested behaviour is unreachable in production and the reachable behaviour is untested.**
- [ ] [Review][Patch] **Console copy promises "the last four digits remain visible" where the render can show ⛔ no number at all — the admin-side twin of a defect BOTH earlier passes fixed on the public side.** [`i18n-en.ts` `status.afterDaysZero` / `status.afterDays` / `status.permanent`] — all three state *"Only **the last four digits**, the bank, the branch and the IFSC code remain visible."* ⚠ The render's own second-pass comment concedes the boundary: `nomineeAccountNumber` is `null` when the stored value has **four or fewer digits** (cl.10(e)'s own boundary) **or when the decrypt soft-failed**, in which case the account-number cell is **omitted entirely** and the masked note is correctly suppressed. ⇒ an operator choosing `permanent` on the strength of that promise has a **wrong mental model of what the public sees**, in the direction that matters for support calls and incident reconstruction. ⭐ **Pass 1 and pass 2 each fixed this exact class on the PUBLIC copy; the console was never swept** — the same omission as the family-11 gap above.
- [ ] [Review][Patch] **Four small copy and hygiene defects in the console, and one dead key.** [`i18n-en.ts`, `MaskingSchedulePage.tsx`, `NomineeBankMaskingRoute.tsx`, `router.tsx`] — **(i) ⛔ no pluralization:** `status.afterDays` renders *"The details stay visible for **1 days** after a drive closes"* — the function special-cases `0` with its own sentence but ⛔ not `1`, on a screen whose credibility is the point. **(ii)** the **"Saved." banner stands under a form since changed to a different, unsaved setting** — `saved` is cleared only on a `pariwarId` change, so after saving `after_days: 30` and then clicking `permanent`, the affirmation *"Saved. This is now the setting of record"* reads as describing what is on screen (mitigated by the status panel above still showing the truth). **(iii)** `MAX_DAYS = 36500` is a **hand-copied third instance** (contract + domain + here) and the ceiling is also **spelled into prose** (`daysInvalid`: *"between 0 and 36500"*) — ⭐ import it from `@twt/contracts` and interpolate. ⚠ ⛔ Not a live defect today: the client bound and the contract bound were verified equal at `HEAD`. **(iv)** `error.heading` is **defined and never referenced**; `resolveEn` returns the **raw dotted key** on a miss with ⛔ no test asserting every referenced key resolves (⛔ not reachable today — all 33 referenced keys verified present); and four user-facing strings in `NomineeBankMaskingRoute.tsx` are **hardcoded English** bypassing the module's own resolver. **(v)** `router.tsx` inserts `NomineeBankMaskingRoute` between `DirectoryPublication` and `GroundInspection` — **N before G**, breaking the file's alphabetical convention.

#### Deferred

- [x] [Review][Defer] **`role="group"` on the Astro `<section>`s DOWNGRADES what would otherwise be a `region` landmark** [`[driveToken].astro:451,457`] — a `<section>` with an accessible name is a **landmark**; `role="group"` replaces that, so the page's most consequential block is ⛔ not reachable by landmark navigation (NVDA `D`). ⭐ AC7 asked for *"a real grouping element carrying a `role` AND an `aria-label`"* and this **satisfies it literally**; the posture is **page-wide, inherited from the facts block**, ⛔ not introduced here. Recorded so it is ⛔ not re-derived as new. **Trigger:** 11b.8's accessibility audit.
- [x] [Review][Defer] **`formatTimestamp` uses a bare `toLocaleString()` — no locale, no `timeZone`, no zone suffix** [`MaskingSchedulePage.tsx`] — an operator in another timezone cannot reconcile *"In force since"* against the audit trail. ⛔ **Pre-existing house convention**: verbatim the `DirectoryPublicationPage` helper and matching ~15 other `apps/admin` call sites. ⚠ Related: the test titled *"shows WHO changed it, WHEN it came into force, WHY, and the version"* asserts changed-by, rationale and version but ⛔ **never asserts the effective-from testid** — the title claims coverage the body does not provide. **Trigger:** the next admin-wide timestamp sweep.
- [x] [Review][Defer] **The two cross-tenant hygiene devices are ⛔ never exercised** [`MaskingSchedulePage.tsx:95-97`, `:184`] — `key={pariwarId}` and the `saved`-reset effect both exist to stop state leaking across a client-side tenant switch, ⛔ but every case in `nominee-bank-masking-page.test.tsx` uses a **single constant Pariwar** ⇒ a regression removing either would ⛔ not fail CI. ⭐ Family 3 is otherwise `covered-by-construction` (the real boundary is `requirePermissionHook`, tested in G2's chunk). Low severity — the leaked artifact is a **banner**, not data. ⚠ Note the **mutation-reset** sibling of this gap is a **patch** above, ⛔ not deferred with it.
- [x] [Review][Defer] **The terminology gate's self-exclusion is by BASENAME only, and its documented scope overstates its actual scope** [`apps/admin/tests/nominee-bank-masking-terminology.test.ts`] — `path.basename(entry) !== SELF` means any future file of that name anywhere inside a scan target is **silently skipped**; the exclusion is currently **dead code** because `apps/admin/tests/` is not itself a scan target. ⚠ The doc-block says *"⛔ The API module and the contracts are in scope too"*, but `apps/admin/src/api/client.ts` and `hooks.ts` — ⭐ which carry the **longest propagation-floor prose in the diff** — are ⛔ not in `SCAN_TARGETS`. ⭐ **Partially refuted on verification:** all three of **AC6's named** disclosure sites **are** covered at `HEAD`, every `SCAN_TARGETS` entry resolves to ≥1 file, and no stale `[poolCanonicalIdentifier]` reference survives the 11b.10 rename ⇒ the gate meets its **AC obligation**; the overstatement is in its **doc-block**, ⛔ not its coverage. **Trigger:** the next edit to that gate.

#### ➡️ Routed to Story 11b.11 (additional to the G1/G2 lists)

- **The per-account `aria-label` announces an ordinal the sighted page deliberately suppresses** [`[driveToken].astro:458` + `surface-fields.ts:490,569`] — ✅ **VERIFIED at HEAD**, and raised independently by **two** layers. `aria-label={labels.bankAccountLabel(account.accountRank)}` renders *"Account 1"* / *"Account 2"*, while `surface-fields.ts` maps `accountRank: null` and its doc-block states: *"**rendering 'Account 1' / 'Account 2' … would put an ordering that implies preference onto the page**."* ⇒ a sighted visitor sees two visually identical boxes with ⛔ no numbering; a screen-reader visitor is announced the ordinal. ⭐ **AC2 rules the two accounts EQUAL payment destinations with ⛔ "no ordering that implies preference"** — so the story's own stated reasoning is contradicted by its shipped output, **in the direction only assistive-tech users experience**. ⚠ Secondly, because the value reaches the DOM via `aria-label` rather than `<MatrixField>`, the field-classification gate is **structurally blind** to it — ⛔ the gate cannot fail on a field it has been told does not exist. ⭐⭐ **SURVIVES 11b.11** — Task 6 removes five **rows** from the block, ⛔ not the block or its per-account grouping ⇒ **11b.11 must decide**: name the group by its **bank**, or restate equality in the per-account label. ⛔ Do ⛔ not assume the withdrawal closes it.
- **The "either account can be used" equality copy renders when the page shows exactly ONE account** [`[driveToken].astro`, `bank.equal_destinations`] — the standing copy is rendered whenever the block renders, and a one-element array is **explicitly legal** in the SSR validator. ⇒ a visitor on a claim where only account #1 was collected reads *"Either account can be used. Neither one is preferred over the other."* beside **one** card — on the page whose entire purpose is that nothing about the money is hidden — and reasonably infers **a second account is being withheld**. ⚠ The comment above the line asserts the behaviour is deliberate (*"⛔ not only when there are two"*), which is ⭐ a defence of the choice, ⛔ not a mitigation of the reading. ✅ **Length 1 is ⛔ never exercised** — the client suite covers `[]` and a three-account rejection only. ⇒ **11b.11 Task 6 rewrites this block**; decide there whether the copy still holds once the coordinates are gone, since after the withdrawal *"either account can be used"* sits beside two **names** and ⛔ no payment coordinates at all.
- **The masked value restates its own label** [`[driveToken].astro` + both locales] — the `<dt>` reads *"Account number"* and the `<dd>` renders *"Account ending in 1234"*, announcing as *"Account number: Account ending in 1234"*; Hindi has the same shape. ⭐ The wrapper exists for a **good** reason — AC4 requires the masked value be announced as one coherent field rather than digit-by-digit — ⛔ but placing a full sentence inside a `<dd>` whose `<dt>` already names the field achieves it **by duplication**. ⇒ **closed by deletion at 11b.11 Task 6** (the account-number row goes); recorded so the **member** donor path, which retains the field under AC6, does ⛔ not inherit the same shape.

#### Dismissed (G3)

- **"The FR-74 Aadhaar collision ships as an asserted FAILURE on a launch-blocking control"** (Blind Hunter, MEDIUM) — ⛔ **already disposed, ⛔ not new.** Dispositioned by BigDev 2026-09-03 (*"leave routed for governance"*); the three pinning tests and the deliberately-unweakened detector stand, and the identity assertion (`piiMatches` by **exact equality**) means a **different** naked-PII leak still fails the leg. ⭐ The Auditor independently re-derived it and classified the handling as family-10 **held well**. Recorded, ⛔ not re-filed.
- **"Duplicate `accountRank` is not validated — `[{rank:1},{rank:1}]` renders two groups both named 'Account 1'"** (Blind Hunter, HIGH confidence / low impact) — ⛔ **NOT CONSTRUCTIBLE.** ✅ Verified: the substrate's **composite PK `(claim_case_id, account_rank)`** plus migration-0057's `account_rank ∈ {1,2}` CHECK make a duplicate **unproducible at the source**. ⭐ Correctly identified as unenforced *in the validator* — but the path is handled by the schema, which is where family 5 says it belongs.
- **"`soft()`/`resolveEn` passthrough renders a raw dotted key to an operator"** (Blind Hunter, HIGH facts / LOW severity) — ⛔ **not reachable today.** ✅ Verified: **all 33 keys** referenced by the two components are present in `EN`, so the `?? key` fallback is dead. ⭐ The **residual** — that ⛔ no test asserts every referenced key resolves — survives as sub-item (iv) of the small-defects patch above, ⛔ not as a live defect.

---

### 🔷 G4 — governance documents (6 files / +1,497), reviewed 2026-09-05 · ⭐ THE PASS IS NOW COMPLETE

⚠⛔ **THE LAYERS WERE RETARGETED, because prose is not code.** Blind Hunter → **contradiction hunter**
(the six documents against each other and themselves, ⛔ no repo access). Edge Case Hunter →
**CLAIM VERIFIER** (extract every checkable assertion and grep it — [[feedback_negative_claims_checkable_in_repo]]).
Acceptance Auditor → **AC0/AC8 + closure-language precision**, with family **10** as the load-bearing
family. ⭐ The retarget is why this chunk produced the most severe findings of the four.

**Outcome:** 30 raw findings → **8 merged duplicates → 22 surviving, 1 dismissed.** **2
decision-needed** · **15 patch** · **4 deferred** · ⛔ 0 routed (⭐ 11b.11 does ⛔ not touch these
documents). ⭐ **Two more REAL GAPs** — families **10** and **11** — at AC severity.

⭐⭐ **AUDITOR FAMILY VERDICTS (G4).** 9 `covered-by-construction` (⭐ *"SATISFIED, and well"*) ·
**10 REAL GAP** · **11 REAL GAP**. Families 1-8, 12, 13 untouched by a prose chunk.

⭐⭐⭐ **THE CENTRAL FINDING OF THE WHOLE THIRD PASS IS HERE, AND IT IS ABOUT THE REVIEW PROCESS
ITSELF.** The routing note tells the Trustee Panel, in Appendix A: *"**the first review said 'done',
and it was wrong.** That is worth knowing the next time a green check is offered as proof."* ⛔ **That
sentence is not reconstructable from committed history** — see REAL GAP 1. ⚠ And the second pass then
closed on **its own green run with no third pass**, i.e. *the lesson the document draws was ⛔ not
applied to the document drawing it.* ⭐ Filling that gap is what this pass has been doing for four
chunks.

⚠⛔ **VERIFICATION — for THIS chunk, MEASURED.** ⛔ `pnpm ci:local` was still ⛔ not run (⛔ nothing to
run — these are documents), ⛔ but every finding below was checked against **committed git history**
(`git show <sha>:<path>`, `git log -S`) or against the **live tree**, ⛔ never inferred from prose.
⭐ The verification is recorded per-finding.

#### Decision-needed

- [x] [Review][Decision] ✅ **ANSWERED BY RULING 2026-09-05 (`-200`).** ⛔⛔ **THE RATIFIED ANSWER IS A COMBINATION THE PANEL WAS TOLD WAS NOT ON OFFER, AND THE RECORD ⛔ NEVER SAYS SO.** [`_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-09-03-11b3a-enumeration-bound-tier1.md`, Appendix A vs §10; `.decision-log.md` `-184`] — ✅ **VERIFIED at HEAD.** The note instructs: *"**Panel members — please start at Appendix A.** … ⭐ **You can answer this note from Appendix A alone.** The numbered sections are the engineering record. ⛔ You are not expected to read them."* Appendix A's *"What happens either way"* then binds the two answers **disjunctively**: **A = "Yes"** (`:459`) → *"we **leave things as they are** for now and come back to you with a proposal for a **proper way in**"* — i.e. ⛔ explicitly **no token**; **A = "No, not for now"** (`:379`, `:257`) → *"then making the address unguessable **costs us nothing real**."* ⭐⭐ **The ratified answer is `A = YES` PLUS `B = (c) the token`** — the pairing Appendix A presents as **not being chosen**. `-184` cl.4 then spends its **longest clause** working out that shipping (B) alone *"would make a live drive reachable by ⛔ NOBODY"* — ⇒ ⭐ **it discovers as a coupling problem the thing Appendix A had structured as an either/or.** ⛔ Nowhere — ⛔ not in `.decision-log.md`, ⛔ not in §10, ⛔ not in the story — is it recorded that the ratified combination departed from the option set as presented. ⚠⛔ **For a body whose CONSENT is the entire legitimacy of the entry, this is the omission that matters most**, and it is ⛔ not an author's call to paper over ([[feedback_supersede_never_reinterpret]]: *never re-read a ratified decision; supersede it*). **Options:** (a) a one-line note in `-184` recording that the Panel went **outside** the presented pairing, and that the coupling in cl.4 is the consequence — cheapest, and honest; (b) return to the Panel to confirm the combination they intended, since Appendix A may have led them to believe "Yes" meant *leave it alone*; (c) treat cl.4's coupling as the Panel's own reconciliation and record that reading explicitly. ⚠⛔ **Do ⛔ NOT silently re-derive why the combination makes sense** — that is the reinterpretation the memory forbids. — ⭐⭐ **ROUTED TO THE PANEL 2026-09-05: `trustee-panel-routing-note-2026-09-05-11b3a-appendix-a-defects-and-the-ratified-combination.md`.** Option **(b)**, and ⛔ **not** (a) or (c): both of those settle on the author's reading of what the Panel meant, and ⛔ only the Panel can say ([[feedback_supersede_never_reinterpret]]). ⭐ The note carries **BOTH** Appendix-A defects together — the unoffered combination **and** the false mobile premise (§5) — because they sit in the same appendix and bear on the same ratification. ⚠⛔ **AND IT DISCLOSES WHAT IS ALREADY BUILT (§6):** 11b.10 shipped **both halves** of cl.4 and is merged, so a changed answer has merged code on the other side of it — ✅ verified (`SahyogVivranEntry.tsx`; `public-site.ts:60 sahyogVivranUrl`; the read resolves by `publicToken` with ⛔ **zero** remaining canonical-identifier predicates). ⭐ It also discloses (§7) that `-190` cl.1 **withdraws the four Tier-1 fields anyway**, which may reasonably make this a smaller matter — ⛔ recorded so the Panel is ⛔ not spending time on a stale premise. ⭐⭐ **Its Appendix A lists WHOLE POSITIONS, ⛔ not a fork** — including *"you have it right, add one line"* — because presenting a fork is the defect being reported. ⇒ — ✅⭐⭐ **ANSWERED 2026-09-05, TRUSTEE-RATIFIED (Dhiraj Rahul, Kalpana Bharti) — `2026-09-05-200`.** **Q1:** *"yes, a collecting drive's page should be reachable by the public"* ⇒ the Panel confirms it meant **BOTH answers together**; **`-184` STANDS IN FULL**, and cl.4's coupling is the **Panel's own position**, ⛔ not an author's post-hoc reconciliation. **Q2:** *"It doesn't change anything. Phone-app member should reach the page."* ⇒ the false mobile premise is recorded **as false** and **moved nothing**. ⚠⛔ **ONE PRECISION, RECORDED RATHER THAN SMOOTHED:** the Panel's words restate **(A)** and ⛔ do **not** restate **(B)** — the question asked was *"both together?"* and *"yes"* answers it **as asked**, ⛔ but the verbatim text is preserved in `-200` so a future reader sees exactly what was said. ⭐ Over-reading a Panel answer is the defect this item reported; ⛔ it is not repeated in closing it. ⭐ The owed annotation is made **in `-200`**; `-184` carries a **forward pointer only** and is ⛔ **not** edited in place. ⚠⭐ **THE PANEL WENT FURTHER THAN ASKED** — *a phone-app member SHOULD reach the page* — ✅ already satisfied by **11b.10** (`SahyogVivranEntry.tsx`, `public-site.ts:60`), so ⛔ **no new work**, ⚠ but it is now a **RATIFIED PROPERTY**: removing the member-app path to the public drive page would **reverse a Trustee ruling**, ⛔ not merely refactor a link — ⭐ say so at the call site. ⇒ **closure = "ANSWERED BY RULING"**, ⛔ not deferral. ⚠⛔ **The PROCESS finding is ⛔ NOT closed by this** and is carried to the Epic 11b retro.
- [x] [Review][Decision] ✅ **RULED 2026-09-05 (BigDev) — `#decision-2026-09-05-202`: CORRECTED AND STOOD DOWN, and the web chain GAINS THE TRIGGER IT NEVER HAD. See the resolution at the end of this item.** **THE `page_weight_bytes` ESCALATION RESTS ON A COUNT THAT DOES ⛔ NOT EXIST — and the story's own paragraph contradicts it.** [`friction-budget.md`, 11b.3a disposition; propagated verbatim into the story spec's Completion Notes and `sprint-status.yaml`] — ✅ **VERIFIED at HEAD.** The escalation's sole quantitative basis: *"⇒ **11a.5 → 11b.9 → 11b.2b → 11b.3 → 11b.3a is the FIFTH** … so it is stated as a **standing gate defect**, ⛔ not as a per-story footnote."* ⛔ **The first three are a DIFFERENT FACET ON A DIFFERENT SURFACE.** 11a.5 / 11b.9 / 11b.2b (`friction-budget.md:1583`, `:1640`, `:1705`) all record **`member-app-native`** — an RN/Metro **EAS build no-op**, whose re-trigger is *"the first EAS build wired into CI"*. 11b.3 / 11b.3a record **`member-public-web`**'s per-route `own_bytes: 0`, closed by the deferred **`critical_render_path_ms` harness**. ⭐ `friction-budget.yaml:31-39` confirms these are **separate surfaces**, and 11b.3a touches ⛔ **zero** `apps/mobile` files. ⭐⭐ **THE CONTRADICTION IS INSIDE ONE PARAGRAPH:** `9445` appears at exactly **three** dispositions (`:108` 11b.1, `:1752` 11b.3, `:1816` 11b.3a), and 11b.3a's own next sentence (`:1817`) says *"**BYTE-IDENTICAL** to the 9445 Story 11b.1 recorded **and to the 9445 Story 11b.3 recorded**"* — ⇒ **naming three, then claiming five.** ⚠ **Compounding, same paragraph:** the escalation cites *"**11b.3's own note** said a **fourth** consecutive recording *'should be read as the gate having a standing blind spot … ⛔ not as three unlucky diffs'*"* — ✅ **that sentence is in 11b.2b's section (`:1710`), ⛔ not 11b.3's, and it is about the MOBILE gate** (*"a standing blind spot on **the app most members actually use**"*). ⛔ 11b.3's disposition (`:1740-1772`) contains ⛔ no "fourth", ⛔ no "standing blind spot", ⛔ no "unlucky diffs", and claims ⛔ no chain at all. ⇒ **the escalation misattributes its precedent AND miscounts its basis.** **Options:** (a) correct to **THREE** (11b.1 → 11b.3 → 11b.3a) and ask whether three still warrants "standing gate defect" — ⭐ BigDev's call, ⛔ not an author's; (b) keep the escalation on the corrected count and finally give it the register entry it lacks (see the patch below); (c) revert it to a per-story footnote, which is what it is **currently discharged as** anyway. — ✅⭐⭐ **RULED 2026-09-05 (BigDev): (a) + (c) TOGETHER, PLUS THE THING NEITHER OPTION NAMED — `2026-09-05-202`.** ⭐⭐ **The investigation found the shape is cleaner than "the count is wrong": there are TWO chains, each THREE deep.** `11a.5 → 11b.9 → 11b.2b` are **`member-app-native`** (an EAS **build no-op** — different surface, different facet, different closing instrument); `11b.1 → 11b.3 → 11b.3a` are **`member-public-web`**. ⇒ the escalation spliced them **and** borrowed **11b.2b's** *"a fourth reads as a standing blind spot"* threshold, which was set **for the mobile chain**. ⛔ **Nothing anyone actually set had been crossed:** mobile stands at **3 of its own 4**; this chain had ⛔ **NO trigger, ever**. ⭐⭐ **THAT ABSENCE — ⛔ not the count — IS THE REAL DEFECT, and it is what made the splice possible:** a chain with no threshold of its own borrowed one from a chain that had. ⇒ **STOOD DOWN to a per-story footnote** (which is what it was in fact discharged as — three prose mentions, ⛔ no register entry, ⛔ no owner, ⛔ no trigger) **AND a trigger is SET for the web chain**, mirroring 11b.2b's deliberately and exactly, ⭐ registered in `deferred-work.md` so it is ⛔ not prose only ⇒ **neither chain can be spliced onto the other again.** ⚠ The superseded paragraph is preserved **verbatim in place** in `friction-budget.md`, ⛔ not deleted. ⚠ **One justification EXPIRES and is recorded rather than leaned on:** *"the most sensitive payload it has ever carried"* ceases to be true when 11b.11 lands — ⛔ but that does ⛔ **NOT** downgrade the item, because a gate that cannot measure a surface is blind **regardless of what the surface carries**. ⛔ The baseline stays at **3942**; ⛔ no number invented. ⇒ ⭐⭐ **THIS WAS THE LAST OPEN DECISION OF THE THIRD PASS — ALL FOUR ARE NOW CLOSED.**

#### Patch

- [ ] [Review][Patch] **REAL GAP — family 10: THE FIRST REVIEW PASS ⛔ NEVER EXISTED IN COMMITTED HISTORY. Its `review`→`done` flip did not happen, and its nine patches ride inside the commit labelled "the second pass's TEN patches."** [`sprint-status.yaml`; `bac8dda6`] — ✅✅ **VERIFIED BY `git show <sha>:sprint-status.yaml` AT EVERY COMMIT IN THE RANGE**, and independently reached by **two** layers. The row's committed values: `43e3ac01` **`review`** → `0f52549e` **`review`** → `bac8dda6` **`review`** → `ee692b4f` **`in-progress`** → `35103f81` `in-progress` → `2c69cd5d` **`done`**. ⇒ ⛔ **the row was NEVER `done` before the final commit.** Yet the ledger entry written **by `ee692b4f` itself** records *"**`done` -> `in-progress`.** ONE row moves"* — ⭐ a transition **from a value that never existed in committed history** — and `git log -S` shows the *earlier* `review -> done` entry was **also added by `ee692b4f`**, i.e. both entries were authored together, after the fact. ✅ **And the patch split is confirmed:** `git log -S "pg_advisory_xact_lock"` and `-S "window_not_inverted"` both return **`bac8dda6`** as the first introduction — both recorded in the story as **FIRST-pass** patches. `bac8dda6` carries **19 files / +926**, ⛔ not "ten patches". **Three consequences, in severity order:** **(i)** under [[project_sprint_status_ledger]] the ledger **IS** the state history, and here it is a **reconstruction** — the same class as backfilling an attestation ([[feedback_record_unattested_no_backfill]]); **(ii)** ⭐⭐ **the second pass's central claim is UN-RECONSTRUCTABLE** — its entire value rests on *"reviewing the first pass's patches found **two of them defective**"*, and because 9 + 10 patches sit in **one commit**, ⛔ **no reader can diff first-pass output from second-pass output** — and that is the very sentence the routing note quotes **to the Trustee Panel**; **(iii)** `bac8dda6`'s message is **inaccurate by a factor of two**. ⚠⛔ **⛔ NOTHING WAS FABRICATED** — every patch is real and every finding is disclosed in prose. ⭐ The defect is that the **history was reconstructed into a shape the record then narrates as if it had been lived**, when one line of disclosure was available: *"the first pass ran in the working tree; its patches are committed with the second pass's, so the two cannot be separated in history"* — ⭐ **exactly the disclosure this same story applies CORRECTLY to `page_weight_bytes` four paragraphs later.** **Fix:** that sentence, in the story record and beside the ledger entries; ⛔ do ⛔ not rewrite history.
- [x] [Review][Patch] ✅ **APPLIED 2026-09-05.** **REAL GAP — family 11: the AI-10-1 sentence was wrong in THREE ways, and the third pass's OWN 2026-09-04 amendment fixed one, missed one, and INTRODUCED A SECOND INSTANCE OF THE MISSED ONE.** [this file, `## 📜 Policy meaning`] — ✅ **VERIFIED against `.decision-log.md:1228` and `:1302`.** The vehicle is ⛔ **not in any hunk of this diff** — i.e. the sentence was ⛔ never re-read while the story moved `ready-for-dev` → `done` through **four rulings and two review passes**, both of which re-verified *"all 8 ACs SATISFIED"*. Three departures: **(i)** *"After the drive closes"* is false for `permanent`, cl.10(d)'s terminal rung — ✅ **fixed 2026-09-04**; **(ii)** *"the **Trust Admin for your Pariwar** decides"* is **FALSE ON AUTHORITY** — `-178` ruled **D8(ii)**: the knob is held by the **TRUST CENTRALLY** (`super_admin`), and `.decision-log.md:1228` says in terms *"puts the masking authority **centrally**, so a Pariwar **cannot set its own window**"*; **(iii)** the **`D8-default` FAIL-OPEN** default — ⭐ the single most consequential fact for a visitor, governing **every Pariwar at launch** — appeared ⛔ **nowhere**. ⚠⛔ **AND THE 2026-09-04 AMENDMENT MADE (ii) WORSE**, adding *"unless **your Pariwar has chosen** to hide it permanently"* — ⇒ ⭐ **it propagated the uncorrected half of the very defect it was fixing.** ✅ **BOTH NOW CORRECTED**, with the defective amendment recorded in place rather than quietly re-edited. ⭐⭐ **This is the third pass's own instance of the class it spent four chunks finding in others** — routed to the Epic 11b retro.
- [ ] [Review][Patch] **PANEL-FACING FACTUAL ERROR — the Panel was told a mobile member CANNOT reach the page, and the app opens the OS browser.** [routing note §6(c) and **Appendix A**] — ✅ **VERIFIED at `2c69cd5d`.** The claim: *"on **mobile it is not possible at all** — the app has no address bar and links to no such page"*, and in Appendix A: *"**In the app it is not even possible**: there is nowhere to type a web address."* ⛔ `apps/mobile/lib/public-site.ts` exists at that commit and its **own header states the design**: *"the requirement is satisfied by an **OUTBOUND link** … ⛔ Do not 'improve' this into an in-app WebView"*; `apps/mobile/app/(auth)/terminated.tsx:94` calls `Linking.openURL(publicSiteHomeUrl(locale))`, which hands the URL to the **SYSTEM BROWSER — which has an address bar.** ⇒ a mobile member is **one tap** from a real browser on the public site. ⭐ **The NARROW claim is TRUE and was correctly separated** — ✅ **zero** `sahyog-vivran` references in `apps/mobile` at that commit. ⛔ The **device-capability** claim is not, and it is the one doing the argumentative work behind *"the donor-verification reading describes a workflow that does ⛔ NOT exist"* — ⭐ **the premise on which the Panel ratified (A)+(B).** ⚠⛔ **This is the SECOND defect in Appendix A**, the half the Panel was told it could answer from alone. ⇒ pair the fix with the decision above.
- [ ] [Review][Patch] **A FIRED TRIGGER WAS ⛔ NEVER AMENDED — the BLOCKING register entry still says "unscoped" and "zero references in the mobile app" after 11b.10 shipped BOTH halves.** [`deferred-work.md`, the `-184` cl.4 BLOCKING item — ⭐ **still present at HEAD**] — ✅ **VERIFIED at HEAD.** The entry reads *"the public-URL **TOKEN** and the `live`-drive **INBOUND PATH**, as ONE deliverable … ⛔ **unscoped as of 2026-09-03** … ⛔ none in the mobile app (**zero** references to `sahyog-vivran`)"*. ⛔ At HEAD `sprint-status.yaml:2` reads **`11b-10 done`**, and `grep -rc 'sahyog-vivran\|sahyogVivran' apps/mobile` returns **20 hits** — including `apps/mobile/components/sahyog-vivran/SahyogVivranEntry.tsx` (**the inbound path**) and `apps/mobile/lib/public-site.ts` `sahyogVivranUrl(sahyogVivranToken, locale)` (**the token**). ⇒ ⭐ **the deliverable this entry calls BLOCKING has SHIPPED, and the register that blocks on it says otherwise.** ⚠ Against this project's own convention that a fired trigger is **AMENDED with what happened**, ⛔ never left ([[feedback_closure_language_precision]]). **Fix:** amend with *what discharged it and when* — ⛔ do ⛔ not delete, and ⛔ do ⛔ not mark "resolved" without saying by which story.
- [ ] [Review][Patch] **THE SAME CLASS, IN `friction-budget.md` — and here the fired trigger owed a FRESH LOOK that was ⛔ never taken.** [`friction-budget.md`, 11b.3a disposition] — ✅ **VERIFIED: `git log 2c69cd5d..HEAD -- friction-budget.md` returns EMPTY** — the file has ⛔ not been touched since this story. Its disposition states *"`D4-linkage` is **STILL OPEN** … a `live` pool has ⛔ **no inbound link**, and the identifier is **SEQUENTIAL** … ⭐ **The first story that RULES it owes this section a fresh look**"*. ⇒ **the triggering condition FIRED** — `-184` (A) ruled it and **11b.10 SHIPPED the inbound path** (`4952d77a feat(11b.10): the unguessable public address AND the inbound path — ONE deliverable`) — and the fresh look was ⛔ never taken. ⚠ **Three of that section's claims are now false at HEAD:** *"`D4-linkage` STILL OPEN"* (answered), *"no inbound link"* (built), *"the identifier is SEQUENTIAL … reachable BY IDENTIFIER ONLY"* (replaced by an opaque `publicToken`). ⭐⭐ **AND THE "NO NEW ROW" CONCLUSION RESTS ON A ROW THAT RULING (B) INVALIDATED:** it leans on 11b.1's *"absence as friction"* row — *"arrive by **district + date + drive code**"* (`friction-budget.md:100-102`) — and (B) makes the **drive code non-constructible**, so that path no longer exists. ⇒ the ledger's own reasoning is now unsound, on the surface it calls *"the largest dynamic response in the project"*. ⚠ The obligation belongs to **11b.10** (`done`), ⛔ not 11b.3a — ⭐ but 11b.3a's record created it and **nothing tracked it**: the forward-obligation analogue of a sibling-deferral loop.
- [ ] [Review][Patch] **THREE DOCUMENTS SAY, IN THE PRESENT TENSE, THAT THIS STORY IS HELD AT `in-progress` — above the blocks that return it to `done`.** [`deferred-work.md`; routing note §9; story spec second-pass Decision 3] — ✅ verified, three instances. `deferred-work.md`: *"Story 11b.3a **is held at `in-progress`** on this item alone; its build is complete"*; routing note §9: *"Story 11b.3a is held at **`in-progress`** … ⛔ **It must not be flipped to `done`** by re-reading the build as finished"* — ⭐ **under a header that already reads `Status: ✅ ANSWERED 2026-09-03`**; story spec: *"⚠⭐ **AND THIS IS WHY THE STORY DOES ⛔ NOT CLOSE AS `done`**"*. ⛔ None is marked superseded, so all three read as **current instructions forbidding the state the same files now record** (`sprint-status.yaml` → `done`). ⭐ The ✅ ANSWERED blocks appended below each say only *"the item STAYS BLOCKING ON DEPLOYMENT"* and ⛔ do not amend the sentence a reader hits first.
- [ ] [Review][Patch] **`-183` cl.5 records `D4-linkage` "DISPOSED"; `-184` reverses it while claiming to supersede NOTHING — and the Tasks list still carries the disposal `[x]`.** [`.decision-log.md` `-183` cl.5 vs `-184` Status; story Task 0] — `-183` cl.5: *"**`D4-linkage` READ AS AN ENUMERATION QUESTION, AND DISPOSED** … ⛔ **And no inbound link to a `live` drive is added**"*. `-184` Status: *"⭐ **Supersedes, reverses and vacates nothing.**"* ⛔ But `-184` cl.1/cl.4 **create a mandatory `live`-drive inbound path** — the direct negation of cl.5. ⇒ **a ruling that reverses a recorded disposition cannot also supersede nothing.** ⚠ Compounding: the story's own second pass says *"the finding is ⛔ not that it is undocumented; it is that **the judgement itself has never been made**"* — ⇒ *"DISPOSED"* was a **closure word applied to a question whose operative half was untouched**, and `-183` was ⛔ never amended. ⭐⭐ **And Task 0 still carries `- [x] ✅ READ AND DISPOSED (2026-09-02-183 cl.5)`** un-amended — so **the Tasks list, which is what the dev agent reads** ([[feedback_spec_edits_must_propagate_to_tasks]]), records the question as closed by an **authoring act**, while the log records it as having required a **Trustee ruling three days later**.
- [ ] [Review][Patch] **A newly-created blindness in a LAUNCH-BLOCKING gate is filed under "Dismissed", and the fold it was folded into ⛔ never landed.** [story spec second-pass Dismissed; `deferred-work.md` item (c)] — the dismissal reads: *"The added operational observation (**a genuine naked-PII signal is now indistinguishable from the expected failure on this surface**) is **folded into that routing**, ⛔ not re-filed."* ✅ **VERIFIED: `deferred-work.md` item (c) does ⛔ NOT contain it** — it ends at the *"re-read, not silently resolved"* trigger. ⭐ **The asymmetry is demonstrable within the same pass:** the parallel patch item said *"**Fix:** one line appended to item (d)"* and item (d) **does** carry its appended paragraph. ⇒ one observation reached the trigger-bearing register and its twin did not. **Consequence:** the fact that this surface's FR-74 leg is **green-in-CI while reporting `status:'fail'`** — so a **real** leak is indistinguishable from the pinned expectation — survives only in a **Dismissed list nobody reads at trigger time**, on a **launch-blocking** control. ⚠ Filing a newly created gate blindness under *"dismissed as noise"* is the wrong register ⇒ **re-file it as an item with a trigger.**
- [ ] [Review][Patch] **`-184` records what option (c) costs the public as nothing, dropping the one cost the routing note itself called a POLICY CHANGE.** [`.decision-log.md` `-184` cl.5 vs routing note §6(c) and Appendix A] — `-184` cl.5: *"(B) changes **who can find the page**, ⛔ not **what the page shows**."* ⛔ The framing actually put to the Panel was stronger: *"⇒ the set of drives anyone can examine becomes the set someone **published a link to**, which moves a **public record** toward a **disclosed document**. ⛔ **That is a policy change, not an engineering one.**"* Appendix A put it starker still: *"the question **'is there a drive you are not telling me about?'** could no longer be answered by an outsider."* ⭐ Strictly compatible (content vs discoverability), ⇒ ranked below the outright contradictions — ⛔ **but the ratified entry is the DURABLE artefact**, and it records only the coupling risk while ⛔ none of the transparency cost survives into it.
- [ ] [Review][Patch] **The `-178` clause pin is WRONG in two places.** [`.decision-log.md` `-183` Decision-type line; story References] — both cite *"`2026-09-02-178` **cl.3** handed back … (\"`D8(i)` is now unblocked and is BigDev's\")"*. ✅ In `.decision-log.md`, `-178` **cl.3 is the Q3 VACATUR**; the quoted sentence sits in the entry's **Context** block, **outside the numbered clauses**. ⭐ The **substance is right** (the hand-back is real, and `:1302` confirms it) — ⛔ the **pin** is not. ⚠ On a project where **clause-level citation is the unit of authority** (`-160` cl.10(f), `-165` cl.2, `-179` cl.1 are all cited to the clause), a wrong pin is what a later reader resolves by **reading cl.3 and concluding the story misdescribed the ruling**.
- [ ] [Review][Patch] **`sprint-status.yaml` says "all FOUR 11b.3 commits" and then lists FIVE.** [`sprint-status.yaml:814`] — ✅ **VERIFIED: all five are genuine 11b.3 commits and all five are ancestors of `origin/main`** — `254e9fe` (governance), `65ca766` (feat), `c64c21b` (fix), `3745d00` (governance), `e16cc69` (docs). ⭐ The **story spec's Task 0 correctly says FIVE**; only the ledger entry says four. ⇒ the enumerated list is the authority and the adjective is wrong.
- [ ] [Review][Patch] **AC8's "seven items, EACH with a trigger" is literally inaccurate — item (g) has none.** [story Task 6 / AC8 vs `deferred-work.md` items (a)-(g)] — ✅ verified: (a)-(f) each carry an explicit `⭐ **Trigger:**` line; **(g) carries none**. ⭐⭐ **DOWNGRADED ON THE AUDITOR'S EVIDENCE, and the downgrade is the point:** (g) is written *"⭐ **RE-AFFIRMED**, ⛔ not re-filed"* into **11b.1 item (g)**, which ✅ **does** carry *"⭐ **Trigger: edge / CDN configuration.**"* ⇒ the trigger **exists at the canonical item**, and its local absence is the **direct consequence of the "re-affirm, never re-file" discipline AC8 itself names.** ⇒ ⛔ **NOT a routing gap** — what remains is narrower: the summary's word *"each"* is false, and a reader of the 11b.3a section alone gets ⛔ no trigger **and no pointer to the line that has one**. **Fix:** one cross-reference.
- [ ] [Review][Patch] **The `page_weight_bytes` escalation is discharged as exactly the thing it disclaims being.** [`friction-budget.md`, story spec, `sprint-status.yaml`] — the claim: *"⭐ Recording it a fifth time **without escalating** would itself be the decay this ledger exists to prevent — so it is stated as a **standing gate defect**, ⛔ not as a per-story footnote."* ✅ **VERIFIED: the escalation consists of THREE PROSE MENTIONS and nothing else** — ⛔ it is **not** an item in `deferred-work.md` (the (a)-(g) block is Claim Terms / D5-subject / Aadhaar / cl.10(c) / VPA / authenticated tier / edge-cache), ⛔ not in the second-pass section, and all five `page_weight_bytes` hits in that file belong to **other stories**. ⇒ ⛔ **no register entry, no owner, no trigger.** ⭐ Stating a defect a fifth time **inside the per-story section** *is* the per-story footnote the text disclaims. ⚠ **Deepened by the Auditor, and it narrows the finding honestly:** the **closing instrument** *is* registered with a live trigger (the `critical_render_path_ms` harness, `deferred-work.md:3117`), so the escalation is ⛔ not routed into thin air — ⭐ what is missing is the **escalation itself**, which is *"the only item in this chunk that routes nothing."* ⚠ See the decision above: its **count is also wrong**.
- [ ] [Review][Patch] **The story's Change Log stops one day and THREE status transitions short, and the second-pass checkboxes invert their own text.** [story spec Change Log; second-pass Decision-needed block] — the newest Change Log row is `2026-09-02 … in-progress → review`; the same file then records, all dated 2026-09-03, a **first** pass (`review`→`done`), a **second** pass (`done`→`in-progress`) and the **Panel answer** returning it to `done`. `sprint-status.yaml` logs all three; ⛔ the story's own designated change record logs **none**. ⚠ Separately, all three second-pass *Decision-needed* items are `- [ ]` while their bodies read *"⭐ **RESOLVED 2026-09-03 (BigDev)**"* and *"⇒ **re-classified as a PATCH**"* — the first pass's equivalents are `[x]`. ⇒ a checkbox scan reports **three unresolved decisions on a story marked `done`**, and the one unchecked-looking block is the one that is **fully resolved**.
- [ ] [Review][Patch] **Two dangling citations, one of them to an object that will vanish.** [routing note Sources; `deferred-work.md` bank_name item] — **(i)** the routing note attests *"**Sources — every one read at `6706ae0`**"*; ✅ `6706ae03` is a **real object but ⛔ NOT an ancestor of `2c69cd5d`** — it is the **pre-amend twin** of `ee692b4f`, so the hash is unresolvable from merged history and **will be garbage-collected**. **Fix:** re-point at `ee692b4f`. **(ii)** `deferred-work.md`'s `bank_name` item cites *"`sahyog-vivran-read.ts:547` … while its sibling `branch` was guarded … on the **adjacent line 555**"*; ✅ at `2c69cd5d` those are at **:569** and **:577** — **eight lines apart**, and `:547`/`:548` are the **pre-patch** positions where `branch` was ⛔ **still unguarded** ⇒ **the cited pair describes a tree in which the guard the sentence relies on did not yet exist.**
- [ ] [Review][Patch] **A parenthetical "only" that is wrong, inside a negative claim that is right.** [story spec second-pass Decision 1; echoed in `.decision-log.md` `-184`] — *"there is ⛔ **no producer of `pool.settled`** … (**only** `pool/state.ts:71,97` and the catalog `pool/events.ts:141`)"*. ✅ **The NEGATIVE holds** — ⛔ no append/emit site exists. ⛔ The parenthetical does not: also `events.ts:22`, `events.ts:157` (the payload-schema map), `public-read.ts:107` (`POOL_SETTLED_EVENT_TYPE`) and `schema/pools.ts:61`. ⭐ Low severity, recorded because **this story's own discipline is that an enumeration is checkable** — and a future reader who greps and finds five sites where the record names three will distrust the negative that is actually correct.

#### Deferred

- [x] [Review][Defer] **The "specified / unscoped" pair reads as a contradiction.** [`.decision-log.md` `-184`; routing note §10] — both call the replacement obligation *"a **specified**, still-blocking deployment obligation"* and, in the same breath, *"⛔ **Unscoped** as of this entry"*. ⭐ Reconcilable (contents known, owner unassigned) ⛔ but the two words sit adjacent. **Trigger:** the next edit to `-184`.
- [x] [Review][Defer] **Citation drift on the excluded-states constant.** [routing note §6(c) vs its Sources list vs `.decision-log.md` `-184`] — `public-read.ts:84-87` in one place, `:84-89` in two others, for the same constant. ⭐ Trivial, ⛔ recorded only because the note leans hard on *"verified, ⛔ not assumed"*. ✅ The Claim Verifier confirmed **`:84-89` is the correct span** (comment at :84-87, `SAHYOG_DRIVE_VISIBLE_POOL_STATES` at :89). **Trigger:** the next edit to that note.
- [x] [Review][Defer] **`docs/legal/` is absent from this repo by design, so the Trust-Deed citation is UNCHECKABLE here.** [routing note; `.decision-log.md`] — *"Trust Deed cl.15(c) names 'nominee' expressly"* ⛔ cannot be verified: the canonical corpus is the **private `ulanzi1/twt-legal`** ([[project_legal_corpus_private_repo_split]]). ⭐ Recorded as **UNCHECKED, ⛔ not as wrong** — which is itself the correct family-10 posture. **Trigger:** any review with access to the private corpus.
- [x] [Review][Defer] **The friction-budget "no new row" ground will need re-deriving regardless.** [`friction-budget.md`] — separate from the fired-trigger patch above: even once the fresh look happens, the **reasoning** must be rebuilt rather than re-affirmed, because its premise (arrival by constructible drive code) ⛔ no longer exists. ⭐ Recorded so the re-look is ⛔ not discharged by re-reading the old paragraph. **Trigger:** the fresh look the patch above requires.

#### Dismissed (G4)

- **"The `-184` Status line 'Supersedes, reverses and vacates nothing' is merely sloppy wording"** — ⛔ **NOT dismissed as wording; PROMOTED to a patch** (see above). Recorded here only because it was initially offered as a low-severity wording note by one layer and the Auditor's Task-0 evidence (`- [x] READ AND DISPOSED` still standing) shows it has a **live consequence in the Tasks list**. ⭐ The one genuine dismissal in this chunk is that there is ⛔ **no separate finding** in the `-183`/`-184` pair beyond the patch already filed.

#### ⭐⭐ What this chunk is evidence FOR — recorded because it is evidence about whether the process works

⚠ ⛔ **This is ⛔ not balance-for-its-own-sake.** The Auditor was asked to say specifically where the record is well made, and the answer bears on whether the findings above are systemic or local.

- **Closure-language precision is HELD, in terms, across FOUR documents.** ✅ **Five distinct closure states, ⛔ none collapsed:** *"Closed by ruling"* (the enumeration judgement, **explicitly contrasted** with *"resolved via deferral"* in `-184` cl.6, `deferred-work.md`, `sprint-status.yaml` **and** routing note §10 — the same words in all four) · *"**CARRIED AS RISK**, ⛔ not closed, ⛔ not resolved via deferral"* (counsel's objection) · *"**UN-ATTESTED**, never back-filled"* (the Claim Terms substrate) · *"**VACATED** (⛔ its question ceased to exist)"* (`D12-schedule`, Q3 — each with the `2026-08-24-159` precedent cited) · *"**NON-BLOCKING**, ⛔ not resolved"* (`D5-subject`). ⭐ This is the single best-executed thing in the chunk.
- **Family 9 SATISFIED, and well.** The one real bypass — publishing Tier-1 data with ⛔ **no consent instrument** — carries an explicit rationale (`-177` cl.1: *"what is missing is a **RECORD-KEEPING** instrument, ⛔ not an authorisation"*), an explicit refusal to reconstruct, and a **two-part FALSIFIABLE** re-examination trigger — *"counsel's A3.2/A3.3 revisit (due 2026-09-07) — **half LIFTED** by `-160` cl.7 — **PLUS** a consent basis that reaches a non-member"* — with the record insisting **both** halves must fire. ⭐ **A half-lifted trigger is exactly where a bypass usually decays into "closed"; it did not.**
- **Attestations MEASURED, not asserted — exemplary.** *"34 jobs green"* comes with per-package totals, named gates, and a **stated delta** (`3183` = `3169` **+14**). ✅ The Claim Verifier **reconciled the +14 exactly** (9 RLS + 2 concurrency + 3 pure) and confirmed **262 / 128 file counts** and the **34-job** figure against `ci-local.sh`. ⭐ The non-vacuity proof is better still: three guards reverted with the **observed** failure named — *"(ii) … failed the late-`pool.settled` un-masking test **and ⛔ nothing else**"*. ⭐⭐ **Reporting WHICH test failed AND that nothing else did is the difference between a probe and a claim.**
- **AC0's governance-first box is a FACT, ⛔ not a claim.** ✅ `a6fa7d94` precedes all three `feat` commits and touches **only** governance files. ⭐ *"This is the box most often a claim rather than a fact; here it is a fact."*
- **The catalog act refused the tempting fake.** `-183` mints the key and labels itself *"**Author-committed. ⛔ Not Trustee-ratified**"* with its ground stated — ⛔ it does **not** dress an author act as ratified.
- **The second pass PAID FOR ITSELF, measurably** — it reviewed the first pass's own patches, which nobody had, and found **two defective**, plus **two REAL GAPs**, plus the admin-form seeding defect that would have unmasked every live drive on a `permanent` Pariwar. ⭐ **A single-pass review would have shipped all five.** ⚠ Which is precisely the argument for this third pass, and for G4 having been reviewed at all.

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

Claude Opus 5 (`claude-opus-5`) via `bmad-dev-story`, 2026-09-02.

### Debug Log References

⭐ Recorded because each was found by a control **working**, ⛔ not by reading:

1. **The allowlist gate FIRED on the planted fifth field** (Testing Standards revert-sanity). Message
   named all **six** permitted pairs and refused to be resolved by appending. Reverted → green.
2. **The Tier-1 identity assertion FIRED on the real widening** before it was updated — `2 → 6` was
   made deliberately, ⛔ not pre-emptively.
3. **`deriveFieldIds` FIRED in both directions** on the render-model change (a key with no mapping,
   and a mapping with no key), across four test files.
4. **A failed DB CHECK probe ABORTS the transaction** ⇒ probes 2 and 3 returned a false-`undefined`
   and were silently vacuous. Each now runs inside its own raw **SAVEPOINT**
   ([[project_domain_limit_clamp_and_savepoint_retry]]).
5. **`super_admin`'s bundle derives from `PERMISSION_CATALOG.keys`** ⇒ a live-DB test that
   hand-granted the key would have passed **with the mint reverted**. The grant goes through the ROLE.
6. **The AC6 terminology gate FIRED on this story's own comments** — quotes of cl.10(c)'s wording.
   Paraphrased, with a note recording that the ban is on what this control CLAIMS and that a source
   scan cannot tell a quote from a claim.
7. **`ci:local` 31/34 → 34/34.** The three were an unused import, the contracts shape fixtures, and
   friction-budget's AC-4 — which diffs **COMMITTED** history and passes once the disposition lands
   ([[project_friction_budget_baseline_ratchet]]).

### Completion Notes List

⭐ **`ci:local` — 34/34 GREEN with the integration leg run** (`DATABASE_URL` set, `twt-test-pg`).

**AC1 — the four fields + four allowlist entries, ONE commit.** ✅ Six YAML fields (four Tier-1 + two
Tier-3 siblings carrying ⛔ no exception and needing none), four `matrix.ts` entries citing
`2026-08-28-165 cl.1`, and both count assertions moved — in the SAME commit as the declarations.
⭐⭐ **The count was READ, ⛔ never assumed** (Trap 2): 11b.3b verified `ready-for-dev` and unmerged, so
the surface assertion read **0 → 4** and the matrix-wide identity assertion **2 → 6**, both **BY
NAME**. ⛔ Neither deleted. ⛔ No fifth entry. ⭐ Revert-sanity done.

**AC2 — the complete details render.** ✅ Both equal accounts, through `<MatrixField>`, decrypted at
`apps/api` (⛔ `apps/public` gains no KMS dependency — `no-kms-in-public.test.ts` green). ⛔ Nothing is
labelled *"Nominee"*; ⛔ no join to `member_nominees`. ⭐ The **enumeration bound**, the **approval-chain
inversion** and the **`limits.search`-is-a-DECISION** rule are stated in **three** places. ⭐ Both
written defences moved together and state **FOUR**, each telling 11b.3b its count is **SIX** and to
EXTEND, ⛔ never overwrite. ⛔ The rate-limit tier is untouched.

**AC3 — the schedule.** ✅ `pariwar_nominee_bank_masking_schedule` + migration 0113 + RLS, on
`pool_fixed_amount_schedule`'s effective-window shape. ⛔ `claim_nominee_bank_accounts` untouched.
⛔ Never a boolean — a discriminator + payload coupled by a DB CHECK. ⭐ FAIL-OPEN on no row. ⛔ The
predicate is never handed a member to branch on (cl.10(f)) — asserted structurally.

**AC4 — the masked projection.** ✅ **STRUCTURAL, ⛔ not conventional**: the masked wire arm has ⛔ NO
`accountNumber` / `accountHolderName` / `vpa` key, and `.strict()` makes populating one a parse error.
Asserted against the **RAW serialized body**. ⛔ `null` at four OR FEWER digits. ⭐ Announced as one
coherent phrase through `t()`.

**AC5 — the knob.** ✅ `super_admin` only; ⭐ the denial case uses a **real `pariwar_admin` grant**, so
`-178`'s foreclosure has teeth. ⛔ No display name and ⛔ no `effectiveFrom` on the wire.

**AC6 — the cache cost.** ✅ Three places, and **MECHANIZED** by a new terminology gate covering both
prohibitions plus the presence of the disclosure at each site.

**AC7 — accessibility + microcopy.** ✅ Family 13 in its **web** form; copy in the existing
`sahyog-vivran` namespace (⛔ no second namespace); microcopy gate green.

**AC8 — routing.** ✅ Seven items, each with a trigger. ⛔ No second `epics.md` annotation.

---

⚠⛔⛔ **ONE FINDING WORTH BIGDEV'S ATTENTION, RECORDED RATHER THAN HIDDEN — a REAL, REACHABLE
COLLISION BETWEEN TWO RULED CONTROLS.** A **12-digit account number trips the FR-74 naked-PII
detector's AADHAAR pattern**. cl.10(a) rules the complete number publishable and `D8-default` is
FAIL-OPEN, so it renders in full for every Pariwar until the Trust acts — while `detectNakedPii`
treats any bare 12-digit run at `public` as an Aadhaar number. ⭐ Verified precisely: **11, 13 and 14
digits do NOT match; exactly 12 does**, and 12 is a real Indian length (ICICI's). ⛔ **The detector is
NOT weakened** — it is a launch-blocking FR-74 control scanning a string with no field context, so
narrowing it is a **governance act**, ⛔ not a fixture fix. ⛔ Nor is it hidden behind a friendlier
11-digit fixture. **Three tests now pin the behaviour** so it is asserted rather than latent, and it
is routed at `deferred-work.md` item **(c)** with its trigger. ⚠ **It is a question about which
control yields, ⛔ not an engineering preference.**

⚠⛔ **AND ONE AUTHORING READING, RECORDED AS SUCH.** `2026-09-02-183` **cl.4**: cl.10(c)'s third
setting, *"permanent masking"*, is built as cl.10(d)'s **TERMINAL RUNG** — masked in every state,
including while the drive is `live` — because read as a fourth post-close offset it is a **synonym for
`after_days: 0`** and one of the Panel's three settings would ship meaning nothing. ⭐ cl.10(a) is a
**permission**, ⛔ not a mandate. ⭐ Chosen in the **more protective** direction: if wrong, the cost is
a reversible over-application of privacy, ⛔ never a leak. ⛔ **An authoring reading, ⛔ NOT a ruling** —
routed for Panel confirmation, and it is **one predicate line** to change.

⚠ **AND A STANDING GATE DEFECT IS ESCALATED, ⛔ not footnoted:** `page_weight_bytes` reads **9445**,
byte-identical to 11b.1's and 11b.3's, after a story that added a block of decrypted bank details to a
public page — the **FIFTH consecutive** recording of the same un-measured facet, and 11b.3's own note
said a fourth *"should be read as the gate having a standing blind spot"*.

⭐ **AND THE PROJECT'S FIRST SELF-SERVE PRESENTATION-TOGGLE UI SHIPPED** (11a.1 shipped none by
design). ⛔ Not a blocker; recorded in five places.

⛔⛔ **BUILT IS ⛔ NOT PUBLISHED.** What keeps this dark is deployment plus the counsel/Panel process —
⛔ never a code mechanism, ⛔ never the kill switch.

### File List

**NEW**
- `packages/domain/src/schema/pariwar_nominee_bank_masking_schedule.ts`
- `packages/domain/migrations/0113_nominee-bank-masking-schedule.sql`
- `packages/domain/src/policies/pariwar-nominee-bank-masking-schedule-rls.ts`
- `packages/domain/src/claim/nominee-bank-masking.ts`
- `packages/domain/src/claim/nominee-bank-masking-policy.ts`
- `packages/domain/tests/claim/nominee-bank-masking.test.ts`
- `packages/domain/tests/integration/claim/nominee-bank-masking-schedule.spec.ts`
- `packages/contracts/src/nominee-bank-masking/masking.ts`
- `packages/contracts/src/nominee-bank-masking/index.ts`
- `apps/api/src/modules/nominee-bank-masking/handlers.ts`
- `apps/api/src/modules/nominee-bank-masking/routes.ts`
- `apps/api/src/modules/nominee-bank-masking/index.ts`
- `apps/api/tests/integration/nominee-bank-masking/admin.spec.ts`
- `apps/admin/src/modules/nominee-bank-masking/i18n-en.ts`
- `apps/admin/src/modules/nominee-bank-masking/MaskingScheduleForm.tsx`
- `apps/admin/src/modules/nominee-bank-masking/MaskingSchedulePage.tsx`
- `apps/admin/src/routes/NomineeBankMaskingRoute.tsx`
- `apps/admin/tests/nominee-bank-masking-page.test.tsx`
- `apps/admin/tests/nominee-bank-masking-terminology.test.ts`

**MODIFIED**
- `.decision-log.md` · `_bmad-output/implementation-artifacts/sprint-status.yaml` ·
  `_bmad-output/implementation-artifacts/deferred-work.md` · this story file · `friction-budget.md`
- `packages/domain/src/rbac/permissions.ts` · `packages/domain/tests/rbac/permissions.test.ts`
- `packages/domain/src/schema/index.ts` · `packages/domain/src/policies/index.ts` ·
  `packages/domain/src/claim/index.ts` · `packages/domain/migrations/meta/_journal.json`
- `packages/domain/src/pool/sahyog-vivran-read.ts`
- `packages/contracts/public-pages/public-vs-private-matrix.yaml` ·
  `packages/contracts/src/public-pages/matrix.ts` ·
  `packages/contracts/src/public-pages/sahyog-vivran.ts` · `packages/contracts/src/index.ts` ·
  `packages/contracts/scripts/emit-openapi.ts` · `openapi/v1.yaml`
- `packages/contracts/tests/public-pages.test.ts` ·
  `packages/contracts/tests/public-pages-sahyog-vivran.test.ts`
- `apps/api/src/modules/public-pages/handlers.ts` · `apps/api/src/modules/public-pages/routes.ts` ·
  `apps/api/src/server.ts`
- `apps/api/tests/integration/login-wall.spec.ts` ·
  `apps/api/tests/integration/public-pages/sahyog-vivran.spec.ts`
- `apps/public/src/lib/surface-fields.ts` · `apps/public/src/lib/sahyog-vivran-render.ts` ·
  `apps/public/src/lib/sahyog-vivran.server.ts` ·
  `apps/public/src/pages/sahyog-vivran/[poolCanonicalIdentifier].astro`
- `apps/public/tests/sahyog-vivran-render.test.ts` · `apps/public/tests/sahyog-vivran-client.test.ts` ·
  `apps/public/tests/integration/public-pages/scrape-test.spec.ts`
- `apps/admin/src/api/client.ts` · `apps/admin/src/api/hooks.ts` · `apps/admin/src/router.tsx`
- `packages/i18n/locales/{en,hi}/sahyog-vivran.json`
- `scripts/sahyog-vivran-financial-truth/check.ts`

⛔ **NOT TOUCHED, and that is a Trap-3 requirement rather than an omission:**
`packages/domain/src/schema/claim_nominee_bank_accounts.ts`.

### Change Log

| Date | Change |
|---|---|
| 2026-09-02 | ⭐⭐ **STORY IMPLEMENTED — `in-progress` → `review`.** `ci:local` **34/34 green with the integration leg run**. Four commits: the `governance:` write (`2026-09-02-183` — **D8(i)**'s key minted v38→v39, cl.10(c)'s third setting read as the terminal rung, `D4-linkage` disposed, `D5(a)`'s price carried) · the schedule substrate · the presentation + the four allowlist entries in ONE commit · the knob + the routing. ⚠⛔⛔ **ONE REAL FINDING, RECORDED RATHER THAN HIDDEN:** a **12-digit account number trips the FR-74 naked-PII AADHAAR heuristic** — cl.10(a) rules the complete number publishable and `D8-default` is FAIL-OPEN, while `detectNakedPii` treats any bare 12-digit run at `public` as an Aadhaar number. Verified precisely (11/13/14 do NOT match; exactly 12 does, and 12 is a real Indian length). ⛔ The detector is **NOT weakened** — narrowing a launch-blocking FR-74 control is a **governance act** — and ⛔ not hidden behind a friendlier fixture: three tests now pin the behaviour, and it is routed with its trigger. ⚠⛔ **AND ONE AUTHORING READING recorded as such** (`-183` cl.4): *"permanent masking"* covers the ACTIVE campaign, because otherwise it is a synonym for `after_days: 0` — chosen in the more protective direction, routed for Panel confirmation, **one predicate line** to change. ⚠ **A standing gate defect escalated:** `page_weight_bytes` is byte-identical for the FIFTH consecutive story. ⭐ The project's **FIRST self-serve presentation-toggle UI** shipped. |
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
