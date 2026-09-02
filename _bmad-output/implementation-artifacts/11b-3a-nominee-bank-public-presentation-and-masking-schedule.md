# Story 11b.3a: Nominee Bank Public Presentation + Per-Pariwar Masking Schedule + Trust-Admin Knob `[SURFACE]`

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

> ⭐⛔ **THIS STORY IS ⛔ NOT IN `epics.md`'s STORY LIST.** It is the second of the three-way split of
> Story 11b.3, ruled **D6(b)** by BigDev on **2026-09-01**, and is recorded in `epics.md` as an
> **annotation** owed by **11b.3's Task 0** — exactly as `11b-2a` / `11b-2b` are. ⛔ A future
> `sprint-planning` run must ⛔ not regenerate a ghost 11b.3 or drop this story.
>
> ⛔ **ORDER: this story runs AFTER `11b-3` is `done` AND MERGED.** It declares fields on a surface
> 11b.3 creates. ⭐ It is **independent of 11b.3b** and the two may run in parallel.
>
> ⚠⛔ **AND IT HAS A SECOND, SHARPER PRECONDITION THAT IS ⛔ NOT AN ORDERING ONE: 11b.3's `D4`.**
> AC2's whole subject is the **`live`** pool — the active campaign. `SAHYOG_DRIVE_VISIBLE_POOL_STATES`
> is `['closed','settled']` (`packages/domain/src/pool/public-read.ts:89`), and 11b.3's **D4(a)** would
> mirror it. ⇒ ⛔ **if D4 ruled (a), this story has NO HOST for AC2** and widening the visible-pool
> predicate becomes **this story's Task 1**, ⛔ not a detail. ⭐ Read D4's ruling before Task 0 —
> ⛔ never infer it from the fact that this file was written.

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
identify the subject** it would attach to — `account_holder_name` is free text with ⛔ no
nominee linkage. → **D5-subject**, recorded under D5.

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
**And** ⭐ **11b.3's AC2 Tier-1-count test is updated from 0 to 4 in the same commit** — ⛔ the test is
⛔ **not** deleted
**And** ⛔ **no fifth entry is added** — the deceased member's name and the contributor name belong to
**11b.3b** and are gated on their own Panel rulings.

### AC2 — Complete nominee bank details render PUBLICLY during an active campaign [`-160` cl.10(a)]

**Given** cl.10's ruled framing — the Panel does ⛔ **not** treat public bank details as an automatic
reason to prohibit publication, and the transparency benefit during an active Sahyog Drive is
**accepted**
**When** the pool is in the **`live`** state (collecting; ⛔ not yet `closed`/`settled`)
**Then** the **complete** details render at the `public` tier for **each of the at-most-two equal
accounts**: `account_holder_name` · `account_number` · `ifsc` · `vpa`, each through `<MatrixField>` so
`getVisibility()` is the **only** thing deciding what appears
**And** `bank_name` / `branch` render from **Tier-3 plaintext** — ⛔ nothing is decrypted for them
**And** ⚠⛔ **`account_holder_name` is FREE TEXT the filer typed and is ⛔ NOT verified to be a
nominee's name** — ⛔ do ⛔ **not** join to `member_nominees`, ⛔ do not add a match rule, and ⛔ do not
render it labelled *"Nominee"*: 6.8's D1 removed that linkage deliberately (**D5-subject**). ⭐ Label
it for what the column holds — the **account holder** — ⛔ never for what a reader assumes it holds
**And** ⛔ the two accounts are presented as **EQUAL payment destinations** — ⛔ no "primary" /
"secondary", ⛔ no ordering that implies preference, ⛔ no routing or split. `account_rank` is composite-PK
identity, ⛔ **not a priority and ⛔ not a nominee rank**
**And** ⛔⛔ **the write-up must NOT say *"consent makes it lawful but not safe"*, and must NOT claim
that knowing a name and bank details by itself enables banking fraud** — cl.10 forbids **both**
framings in terms. ⭐ The stated concern is the **broader public exposure / security posture** and the
**ability to reduce it as TWT grows**
**And** the decrypt happens **server-side at the `apps/api` boundary**, bounded and documented
(Trap 6); ⛔ `apps/public` gains ⛔ **no** KMS dependency
**And** ⭐⛔ **THIS STORY MAKES THE THIRD PUBLIC-PAGES ROUTE `PII-BEARING`, AND THE ROUTE'S WRITTEN
DEFENCE MUST MOVE WITH IT — ⛔ IN THIS COMMIT.** `apps/api/src/modules/public-pages/routes.ts:52-55`
rules that the control set is a property of *"an unauthenticated, paginated, **PII-BEARING** public
collection"*, and 11b.3 shipped the route **without** that property under **D11**. ⇒ the `routes.ts`
header **and** the `login-wall.spec.ts` allowlist entry are both updated to state the set that now
applies, ⛔ **both stating the SAME count** — *"two authoritative documents disagreeing on how many
controls exist is the defect this file records having already had once"*. ⛔ **Do ⛔ not leave them
describing a zero-Tier-1 route while serving four Tier-1 fields**

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
**When** a Trust Admin opens it
**Then** they can set and re-set **0 / N / permanent** for their Pariwar, and see what is currently in
effect and from when
**And** ⚠ the permission is checked against the **existing** key catalog first — ⛔ **a new permission
key is a catalog VERSION BUMP with a scope dimension, a ratified governance act, ⛔ not a code
change** ([[project_helpdesk_operator_surface_103]]). ⭐ If a new key is needed, that is **D8**, ⛔ not
an authoring choice
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

**Then** `deferred-work.md` gains this story's section recording, each with a trigger: the **Claim
Terms acceptance substrate** (D5's mechanism — ⛔ whatever D5 rules, the *record* is still absent) ·
⭐ **the ACCOUNT-HOLDER SUBJECT gap** (**D5-subject**) — ⚠ it **survives a D5(a) ruling**, because
building un-gated does ⛔ not make the holder a nominee; route it with the **two-document
contradiction** (`nominee-accounts.ts:18` vs `claim_nominee_bank_accounts.ts:7-11`) named, and its
trigger: *the first story that revisits nominee-bank collection, or any Claim Terms substrate work* ·
**VPA collection** (8.4's deferred seam — ⛔ not built here) · the **post-masking
authenticated-member presentation** (`-164` A2: *"a separate future decision — ⛔ not carried, ⛔ not
foreclosed"*) · the **edge-cache blindness** of any abuse counter on this surface (11b.1 item (g),
⛔ re-affirmed, ⛔ not re-filed)
**And** ⛔ **the `epics.md` annotation is 11b.3's Task 0, ⛔ not this story's** — ⛔ do not write a
second one ([[feedback_circular_deferral_between_sibling_stories]] — ⛔ never route an obligation to a
sibling that routes it back).

---

## Tasks / Subtasks

- [ ] **Task 0 — ⛔ TRANSCRIBE-or-STOP.** (AC: all)
  - [ ] ⛔ **Verify `11b-3` is `done` AND MERGED** before starting. This story declares fields on a
        surface 11b.3 creates.
  - [ ] ⛔ **Read 11b.3's `D4` ruling.** If D4 ruled **(a)** (`closed` + `settled` only), AC2 has ⛔ no
        host and widening the visible-pool predicate is **this story's Task 1** — ⛔ record it as this
        story's act, ⛔ never as an incidental edit.
  - [ ] ⛔ **Read 11b.3's `D11` ruling** (the third route's control set). This story restores the
        route's **PII-bearing** property, so Task 4 owes `routes.ts` + `login-wall.spec.ts` an update.
  - [ ] Re-read `.decision-log.md` head; take the next free number. ⚠ **11b.3a and 11b.3b mint against
        the same head** — re-read immediately before writing; ⛔ never renumber or merge into a
        sibling's entry.
  - [ ] Transcribe BigDev's rulings for **D5** (and **D8** if a new permission key is needed). ⛔ The
        dev agent transcribes; it ⛔ never authors or re-grounds a ruling.
  - [ ] ⛔ **If D5 is unruled → STOP and report.** ⚠ D5 is not a preference — it decides whether AC2
        ships at all.
  - [ ] ⚠ **Put `D5-subject` in front of whoever rules D5** — the account holder is ⛔ not verified to
        be a nominee, so *"the nominee's own Claim Terms acceptance"* has ⛔ no identified subject on
        the row. ⭐ It **survives a D5(a) ruling** and is ⛔ not answered by one.
  - [ ] `governance:` commit first ([[feedback_governance_commits_precede_implementation]]).

- [ ] **Task 1 — The masking schedule substrate** (AC: 3)
  - [ ] ⭐⛔ **READ `2026-09-02-174` cl.3 BEFORE DESIGNING THE TABLE.** The Panel **extended cl.10's
        staged schedule from bank fields to a PERSON'S NAME** (contributor names, Story 11b.3b). ⇒ this
        schedule now has a **potential SECOND SUBJECT**, and whether the two share one per-Pariwar row
        is **`D12-schedule`** in 11b.3b — ⚠ a **POLICY** question (one row ⇒ a Trust Admin ⛔ cannot
        hide bank details quickly while letting names persist), ⛔ **not** a de-duplication call.
        ⛔ **Do ⛔ not unilaterally generalise the table to "any masked field", and ⛔ do not hard-code
        it to bank-only in a way that forecloses D12.** ⚠ If D12 is unruled when this task runs, build
        for **this story's subject** and record the seam — ⛔ never guess the shared shape.
  - [ ] New per-Pariwar effective-window table + migration, modelled on `pool_fixed_amount_schedule`.
  - [ ] Write the *"⛔ never a boolean"* rationale **into the schema file** (Trap 3).
  - [ ] ⛔ Do not add any column to `claim_nominee_bank_accounts`.
  - [ ] Live-DB tests: ⛔ never regenerate an applied migration (42P07), ⛔ never `DROP SCHEMA`
        (42P01), assert **membership, not counts** ([[project_live_db_test_gotchas]]).

- [ ] **Task 2 — The projection function + the boundary read** (AC: 2, 4)
  - [ ] Pure masking function (last-4 + bank/branch/IFSC), unit-tested at the boundaries — ⚠ including
        a `null` `vpa` and an account number shorter than 4 digits.
  - [ ] Decrypt at `apps/api`; bound and document the amplification (Trap 6).
  - [ ] ⛔ The full value never crosses the wire once masked.

- [ ] **Task 3 — Declare the four fields + the four allowlist entries, in ONE commit** (AC: 1)
  - [ ] YAML fields with full `tier1_public_exception` blocks; four `matrix.ts` entries citing
        `-165` cl.1.
  - [ ] ⛔ **READ** the current Tier-1-count assertion and update it by **+4** — ⛔ never hard-code
        `0 → 4`. If 11b.3b merged first it reads **2** and the correct value is **6**. ⛔ Do not delete it.
  - [ ] Extend the `FieldIdMapping` so the tier-leak leg still derives a complete set.

- [ ] **Task 4 — Render them on the surface + move the route's written defence** (AC: 2, 4, 7)
  - [ ] ⭐ Update the `routes.ts` header **and** the `login-wall.spec.ts` allowlist entry to the control
        set that applies now the route is **PII-bearing** — ⛔ both stating the **same** count.
  - [ ] Extend `apps/public/src/lib/sahyog-vivran-render.ts` (pure) + the `.astro` wrapper.
  - [ ] Every value through `<MatrixField>`. ⛔ No `Astro.cookies` / `Astro.request.headers` /
        `Astro.session` — the surface stays auth-blind.
  - [ ] Render **nothing** for a null `vpa`.

- [ ] **Task 5 — The Trust-Admin knob** (AC: 5, 6)
  - [ ] Admin screen; permission check against the **existing** catalog first (D8 if not).
  - [ ] `users.display_name` snapshot at action time; audit via 1.10.
  - [ ] The non-immediacy statement, in **all three** places (AC6).

- [ ] **Task 6 — Route what is not built** (AC: 8)
  - [ ] Write this story's `deferred-work.md` section, every item with a trigger.

---

## ⚖️ Decisions — ⛔ **TWO OPEN: D5 (blocking, and it carries D5-subject) · D8 (conditional)**

### ⛔ D5 — The nominee data's MECHANISM, when its BASIS has no instrument (Trap 1, AC2)

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

#### ⭐⛔ D5-subject — A SECOND GAP UNDER THE FIRST: the record does ⛔ NOT IDENTIFY THE SUBJECT the instrument would attach to

⚠ **OBSERVATIONAL — recorded 2026-09-02, arising from the 11b.3b packet's "whose name" pass.
⛔ It prescribes nothing and rules nothing** ([[feedback_gap_analysis_observational]]). ⛔ It is
⛔ **not** a new decision and ⛔ not a re-filing: it is a **property of D5's option space** that ⛔ no
document had recorded.

`-160` **cl.3**'s basis is *"the **NOMINEE's** own Claim Terms acceptance"* — an instrument whose
subject is **the nominee**. ⚠⛔ **But `account_holder_name` is ⛔ not verified to be a nominee's name,
and the schema says so in terms** (`claim_nominee_bank_accounts.ts:7-11`): *"there is deliberately
**NO** `nominee_rank` column, **NO** FK to `member_nominees`, and **NO** holder-name-must-match-nominee
linkage of any kind: **the filer types a holder name per account, full stop.**"*

⭐ **Verified REACHABLE, ⛔ not inferred from the type** ([[feedback_trace_reachability_before_escalating]]):
- the wire accepts free text — `accountHolderName: z.string().trim().min(1).max(200)`
  (`packages/contracts/src/claims/nominee-bank.ts:56`), with ⛔ no linkage field;
- the write path encrypts it **straight from request input** —
  `encryptNomineeBankField(entry.accountHolderName, …)`
  (`apps/api/src/modules/claims/claims.nominee-bank.handlers.ts:155`), with ⛔ no read of
  `member_nominees`;
- ⇒ a filer may type **any** name, including a person who is ⛔ not a declared nominee (a relative
  whose account the family is using, a joint holder, an executor).

⚠⭐ **AND A CROSS-CHECK IS POSSIBLE AND DELIBERATELY ABSENT — ⛔ which is why this is a QUESTION and
⛔ not a defect to fix here.** `member_nominees.name_ciphertext` exists and is `notNull()`
(`packages/domain/src/schema/member_nominees.ts:59-60`), so a comparison *could* be written. Story 6.8
chose not to, for a stated reason: the two accounts are a **claim-scoped payment channel**, ⛔ not one
row per declared nominee. ⛔ **Do ⛔ not "fix" this by adding a join or a match rule** — that would
re-impose the nominee linkage 6.8's D1 removed, and it is ⛔ not this story's act.

⚠⛔ **AND TWO COMMITTED DOCUMENTS DISAGREE ABOUT IT** — recorded because the next reader will hit one
of them and conclude the question is settled:
- `packages/contracts/src/contributions/nominee-accounts.ts:18` — *"`accountHolderName` (**the NOMINEE
  name**)"*, ⭐ **assuming** the identity;
- `packages/domain/src/schema/claim_nominee_bank_accounts.ts:7-11` — *"⛔ **NO**
  holder-name-must-match-nominee linkage of any kind"*, ⭐ **denying** it.
⇒ ⛔ **The schema is the authority on what the column holds.** ⚠ ⛔ Do ⛔ **not** sweep the comment as a
drive-by ([[project_epic9_confirmed_producer_is_live]] — the stale-comment-family discipline); it is
recorded here with a trigger, ⛔ not fixed in passing.

**⇒ WHAT IT MEANS FOR D5, stated as a property and ⛔ not as a recommendation.** Each option inherits a
question about **whose** acceptance would authorise the render:
- **(a) un-gated** — cl.10(a) authorises the render, so the subject question does ⛔ not block it. ⚠ But
  it means a **third party's name** may be published at the `public` tier under a ruling framed about
  *nominee* bank details. ⭐ **Two readings, and this note takes ⛔ neither:** *(i)* cl.10(a) is about
  **the ACCOUNT** — the coordinates money goes to, whoever holds it — so the holder's name travels with
  the account and nothing is stretched; *(ii)* cl.10(a) is about **the NOMINEE's data**, and a
  non-nominee holder is outside what was ruled. ⛔ Only the Panel can say which.
- **(b) fail-closed** — the predicate would need a subject to key on, and there is ⛔ **none on the
  row**. ⇒ (b) is harder than it looks, ⛔ independently of the `consentExists`-shape prohibition.
- **(c) defer** — unaffected.

⭐ **The asymmetry worth carrying:** the **deceased member's** basis works because that subject is a
**member** with their own accepted T&C (`claims.deceased_member_id` is `notNull()` and branded
`MemberId`). A nominee — or a non-nominee account holder — is a **NON-MEMBER**, which is exactly the
missing *"consent basis that reaches a non-member"* half of counsel's standing objection
(`deferred-work.md` 11b.1 item **(a)**), ⛔ **the half `-160` cl.7 did NOT lift.**

⚠⛔ **Whichever way this goes, ⛔ do NOT resolve it by minting a `consent_type` value.** The three
publication types were **RETIRED, ⛔ not reinterpreted** (`2026-08-28-162`), and re-wording one to
cover a new class *"was on the table and was **rejected on the record**"*
([[project_11b_consent_model_c5_superseded]]).

### ⛔ D8 — Does the Trust-Admin knob need a NEW permission key? (AC5, conditional)

Check the existing catalog first. ⚠ If a new key is needed it is a **catalog version bump with a scope
dimension** — a **ratified governance act**, ⛔ not a code change
([[project_helpdesk_operator_surface_103]]). ⛔ Do not mint one silently.

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
| `packages/domain/src/schema/<masking-schedule>.ts` + migration | **NEW** — the only migration in the 11b.3 family. ⚠ Shape gated on **`D12-schedule`** (a second subject — contributor names — was added by `2026-09-02-174` cl.3) |
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
| 2026-09-02 | ⚠ **This story's schedule gained a POTENTIAL SECOND SUBJECT.** `2026-09-02-174` cl.3 (Panel) **extended `-160` cl.10's staged schedule from bank fields to a PERSON'S NAME** — contributor names on 11b.3b. Whether the two share one per-Pariwar row is **`D12-schedule`**, a **policy** question, ⛔ not a de-duplication. Task 1 now reads that ruling before designing the table, and ⛔ must neither generalise unilaterally nor foreclose D12. |
| 2026-09-02 | **D5-subject recorded** (observational) — arising from the 11b.3b packet's "whose name" pass. `-160` cl.3's basis is *"the **nominee's** own Claim Terms acceptance"*, but `account_holder_name` is **free text the filer types**, with ⛔ no FK and ⛔ no match rule (`claim_nominee_bank_accounts.ts:7-11`), verified reachable through the contract (`:56`) and the handler (`:155`). ⇒ a second gap **under** D5: even with an instrument, the row does ⛔ not identify its subject. ⚠ Two committed documents disagree (`nominee-accounts.ts:18` calls it *"the NOMINEE name"*); the schema is the authority and the comment is ⛔ recorded, ⛔ not swept. ⛔ Nothing ruled; both readings of cl.10(a) recorded. |
| 2026-09-01 | **Combined validation of 11b.3 / 11b.3a / 11b.3b.** Three fixes: the Tier-1-count update is **+4 read from the file**, ⛔ never `0 → 4` (11b.3b runs in parallel and adds two); this story restores the route's **PII-bearing** property and now owes `routes.ts` + `login-wall.spec.ts` their update (11b.3's **D11**); and **11b.3's D4 is named as a precondition** — under D4(a) this story has no host for AC2. |
| 2026-09-01 | Story created by the D6(b) three-way split of Story 11b.3 (ruled by BigDev, 2026-09-01). Carries `2026-08-28-160` cl.10 in its **own ACs and Tasks list**, as that decision's open-follow-up list requires ([[feedback_spec_edits_must_propagate_to_tasks]] — *"the AC-only route has failed on this epic before"*). `-165` cl.3's allowlist duty travels here with the fields. D5 (the Claim Terms basis has no instrument) is **blocking**; D8 is conditional. |
