---
baseline_commit: 222fb4d8
---

<!--
⭐ BASELINE — `story(11b.12): create story B`. Carries decisions `2026-09-04-186` … `-196`,
Story 11b.10 closed, the six-story split, and stories A/B `ready-for-dev`.
-->

# Story 11b.13: The Per-Pariwar Drive TARGET — Set by a Pariwar Admin, Revealed Only by a Super Admin `[SUBSTRATE]`

Status: review

> ⭐⛔ **⛔ NOT IN `epics.md`'s STORY LIST.** **Story C** of the six-story split (`2026-09-04-195`
> cl.3), following **Trustee-ratified** `2026-09-04-190` cl.7 and `-191` cl.4 (Dhiraj Rahul + Kalpana
> Bharti). ⇒ it owes an `epics.md` **ANNOTATION** (Task 0).
>
> ⛔⛔ **IT OPENS WITH A GOVERNANCE DECISION AND ⛔ DOES NOT PROCEED WITHOUT ONE.** `-195` cl.2:
> minting a permission key moves `PERMISSION_CATALOG_VERSION`, which is a **governance act** in this
> repo. ⛔ The key is ⛔ **NOT** minted inside a build task.
>
> ⚠ **STORY D DEPENDS ON THIS ONE** — `-195` cl.3: **D waits on B *and* C**. ⭐ **THIS STORY depends on
> neither A nor B** ⇒ it may run in parallel with both.
> ⚠⛔ *Corrected 2026-09-06 (validation).* This read *"⛔ Nothing depends on A or B"*, which is **false**
> — **D** depends on **B**, **E** depends on **B**, **F** depends on **A** (`-195` cl.3's table). ⛔ The
> independence being asserted is **THIS story's**, ⛔ never theirs.

---

## ⛔⛔ PREFLIGHT — ⛔ THREE STOP CONDITIONS, CHECKED BEFORE TASK 0's FIRST LINE

⚠⛔ **These are ⛔ NOT mid-AC caveats. Each is a STOP: check it, then proceed.**

### ⛔ STOP 1 — `PERMISSION_CATALOG_VERSION` IS ⛔ NOT 39 BY ASSUMPTION. **READ IT LIVE.**

⭐ It **was** 39 at authoring and is **still 39 as of 2026-09-06** (`permissions.ts:598`, re-verified).
⚠⛔ **BUT `39 → 41` IS ⛔ NOT A CONSTANT OF THIS STORY** — **Story 6.18** (`ready-for-dev`) bumps the
same counter, and its own Dev Notes carry the reciprocal warning in terms:

> *"⛔ Both bump `PERMISSION_CATALOG_VERSION`. 11b.13 takes it **39 → 41** … ⇒ ⭐ whichever lands
> second takes the next number; ⛔ do ⛔ not hard-code 40 without checking."* — `6-18-…md:367-370`

⇒ ⛔ **The coordination was ONE-SIDED until now: 6.18 named the collision, this story did ⛔ not.**
⭐ **Read `permissions.ts:598` live.** `39 → 41` holds ⛔ only if this story lands first; if 6.18 landed
first, it is **40 → 42**. ⛔ The arithmetic (**+1 per key, TWO keys**) is what D1 ruled — ⛔ never the
literal `41`.

### ⛔ STOP 2 — TWO TESTS HARD-CODE THE CATALOG NUMBERS. ⛔ THEY ARE ⛔ NOT OPTIONAL EDITS

- `packages/domain/tests/rbac/permissions.test.ts:54` — `expect(PERMISSION_CATALOG_VERSION).toBe(39)`
- `packages/domain/tests/rbac/permissions.test.ts:56` — `expect(PERMISSION_CATALOG.keys).toHaveLength(47)`
  ⇒ ⭐ **47 → 49** (TWO keys), ⛔ not 48.
- ⚠ `:54`'s trailing comment is a **mandatory running rationale chain** — every prior bump appended its
  full justification there. ⛔ Bumping the number without appending this story's entry breaks the
  file's own convention.
- `packages/domain/tests/rbac/roles.test.ts` asserts **per-key holder sets** — the write key gains one.

### ⛔ STOP 3 — THE NAMED PRECEDENT HAS AN ⛔ UNFIXED, ALREADY-RULED CONCURRENCY DEFECT

⚠⛔ See **Trap 5**. `#decision-2026-09-05-201` was ruled **after this story's `baseline_commit`** and is
⛔ **not yet in the code**. ⇒ *"follow the masking precedent"* now means **follow it PLUS `-201`**,
⛔ never the shipped file alone.

## Story

As a Pariwar Admin who knows what a drive in my Pariwar needs to raise,
I want to record that figure once, and have it stay invisible to members and the public unless the
Trust centrally decides otherwise,
so that a progress bar can be measured against something real without anyone being shown a target to
fall short of.

## 📜 Policy meaning (AI-10-1, CONFIRMED BigDev 2026-08-18)

⛔ **THIS STORY INTRODUCES ⛔ NO PREDICATE THAT GATES A MEMBER'S ACCESS TO A BENEFIT.** Stated
explicitly, ⛔ not omitted.

⭐ The target is a **presentation denominator**. ⛔ It does ⛔ not affect who may contribute, how much
they owe, whether they are assigned, or whether a family is paid. ⚠ **A member's obligation is
`pools.fixed_amount`, ⛔ never this figure**, and ⛔ nothing in this story may make the two interact —
⇒ **AC7** pins that, because a target that silently became an obligation would be the AI-10-1 shape
exactly.

⭐ `-189` cl.3 (*member > public*) is satisfied **symmetrically**: the target is hidden from
**both**, and cl.7(c)'s two switches are **independent**, so a Pariwar can reveal it to members
without revealing it publicly — ⛔ never the reverse. **AC4** pins that ordering.

## 🎯 What already EXISTS — ⭐ verified live 2026-09-04, ⛔ not assumed

| Fact | Where | Verified |
|---|---|---|
| `PERMISSION_CATALOG_VERSION = 39` | `packages/domain/src/rbac/permissions.ts:598` | ⭐ read |
| The closest per-Pariwar setting: a **schedule table + one write key + an admin UI** | `pariwar_nominee_bank_masking_schedule`; `pariwar.manage_nominee_bank_masking` (v38→39); UI at `/p/$pariwarId/nominee-bank-masking` | ⭐ read |
| ⛔⛔ That key **FORECLOSES `pariwar_admin`** in terms | `permissions.ts:573-576` — *"granting it 'for symmetry' … is precisely the 'reverse a ratified ruling by way of a catalog edit' move"*; **acceptance condition: a Panel ruling** | ⭐ read |
| Per-Pariwar disclosure controls are **central in AUTHORITY** | `2026-09-02-178`; `2026-08-19-136` cl.3's two-axis rule | ⭐ read |
| One key meaning two acts is **the drift a catalog exists to prevent** | `permissions.ts` — *"forbids widening it 'for symmetry'"*; `2026-09-02-183` cl.1 | ⭐ read |
| `pariwar_admin` DOES hold other `pariwar.*` keys | `permissions.ts:90,94,108,184,207,213` | ⭐ read |
| The masking control is **NOT step-up-gated**; accountability = required rationale + actor + audit line | `permissions.ts` | ⭐ read |

## ⛔ THE FOUR TRAPS

### Trap 1 — ⛔⛔ THE NEIGHBOURING KEY **FORECLOSES `pariwar_admin` IN WRITING**. ⛔ READ IT BEFORE MINTING

`pariwar.manage_nominee_bank_masking`'s own doc-block:

> *"⛔⛔ `pariwar_admin` is **FORECLOSED**. Granting it 'for symmetry' with the neighbouring
> pariwar-dimension content keys is precisely the 'reverse a ratified ruling by way of a catalog edit'
> move … **ACCEPTANCE CONDITION for pariwar_admin: a Panel ruling** superseding `2026-09-02-178`.
> ⛔ Never a consistency argument from the neighbouring keys."*

⭐ **This story grants `pariwar_admin` on a NEW key, and that is ⛔ NOT a violation** — `-190` cl.7(a)
is a **Panel ruling** (DR + KB). ⚠⛔ **BUT the governance decision MUST say why the analogy does ⛔ not
apply, or the next reader will read it as the forbidden symmetry move:**

⭐ **The two precedents govern DISCLOSURE.** The public-name mode decides *what a public page shows*;
the masking window decides *how long it keeps showing it*. ⇒ both are **presentation policy**, and
`-178` correctly put that authority centrally.
⭐⭐ **SETTING the target discloses ⛔ NOTHING** — cl.7(b) makes it invisible to everyone. **REVEALING
it IS a disclosure act, and cl.7(c) keeps that Super-Admin-only.** ⇒ the two-axis rule of
`2026-08-19-136` cl.3 is **FOLLOWED, ⛔ not departed from**: this control is per-Pariwar in **scope**,
Pariwar-Admin in **operational authority**, and **central in DISCLOSURE authority**.

⛔ It supersedes **nothing**. `-178` and the masking key's foreclosure ⛔ stand untouched.

### Trap 2 — ⛔ ONE KEY MEANING TWO ACTS IS THE DRIFT THE CATALOG EXISTS TO PREVENT

**Setting** a figure and **revealing** it are different governed acts under **different authorities**.
⛔ Do ⛔ not express cl.7(c) as *"the same key, but the route checks the role"* — that hides an
authority split inside a handler. ⇒ **D1** rules the shape.

### Trap 3 — ⚠⛔ THIS STORY BUILDS A CONTROL WITH ⛔ NO VISIBLE OUTPUT

The target is ⛔ **not displayed** (cl.7(b)), and the meter that will consume it is **story D**. ⇒ at
the end of this story a Pariwar Admin can set a number that **⛔ nothing renders**.

⭐ That is **correct and intended** — ⛔ do ⛔ not "finish the job" by rendering it, and ⛔ do not add a
preview. ⚠ But it means the story's own tests are the **only** proof it works: ⛔ there is nothing to
look at.

### Trap 4 — ⚠ IT IS MONEY. VALIDATE IT LIKE MONEY — ⚠⛔ AND THE PRECEDENT IS ⛔ NOT `pools.fixed_amount`

`-191` cl.4 makes the target a **rupee** figure ⇒ its validation is ⛔ not a free choice. **whole INR**,
rejected at the contract boundary ⛔ **and** at the DB. ⛔ No floats, ⛔ no paise, ⛔ no coercion — *"on
this control the two outcomes are 'a wrong number is shown to 43,000 members' and 'it is not'."*

⚠⛔ **CORRECTED 2026-09-06 (validation) — THIS TRAP NAMED THE WRONG FILE, AND THE WRONG BOUND.** It read
*"mirror `pools.fixed_amount`: whole INR, **non-negative** integer, with an upper sanity bound … at the
DB."* ⛔ **Both halves fail on inspection:**

| ⛔ What the trap said | ⭐ What the code actually is | Verified |
|---|---|---|
| *"mirror `pools.fixed_amount` … at the DB"* | `pools.ts:193` is a **bare `integer().notNull()`** — ⛔ **NO** `CHECK`, ⛔ no positivity, ⛔ no ceiling. A dev mirroring it writes ⛔ **zero** constraints | ⭐ read |
| *"non-negative"* | The precedent is **strictly positive**: `pool_fixed_amount_schedule_amount_positive` = `fixed_amount > 0` (`pool_fixed_amount_schedule.ts:104`) | ⭐ read |
| *"an upper sanity bound"* | It is a **NAMED CONSTANT with a sync obligation**: `pool_fixed_amount_schedule_amount_max` = `<= 10000000`, *"keep IN SYNC with `pool/fixed-amount.ts` `MAX_POOL_FIXED_AMOUNT_INR`"* (`= 10_000_000`, `fixed-amount.ts:79`) | ⭐ read |
| the app-side assertion | `fixed-amount.ts:405` — `!Number.isInteger(v) \|\| v <= 0 \|\| v > MAX_POOL_FIXED_AMOUNT_INR`, *"applies to every write path"* | ⭐ read |

⇒ ⭐⭐ **THE PRECEDENT TO MIRROR IS `pool_fixed_amount_schedule` + `pool/fixed-amount.ts`**, ⛔ not
`pools.fixed_amount`. ⭐ It is also the **nearer** precedent structurally — a per-Pariwar, versioned,
effective-window **rupee** record, which is exactly this story's shape (see **AC1**), and it is the file
`pariwar_nominee_bank_masking_schedule.ts:27-32` itself names as **its own** model.

⛔⛔ **AND `0` IS ⛔ NOT A LEGAL TARGET — *"non-negative"* WOULD HAVE ADMITTED IT.** ⚠ Story **D**'s meter
is `amountRaisedInr / target` (`-191` cl.4, D's D1) ⇒ a **₹0** target is a **division by zero**, and
D's ruled *"⛔ no target ⇒ ⛔ no bar"* covers **UNSET**, ⛔ not **zero-and-set**. ⇒ **strictly positive**
(`> 0`), at the contract boundary ⛔ and at the DB, ⛔ never `>= 0`.

### Trap 5 — ⛔⛔ THE NAMED PRECEDENT HAS A **RULED, ⛔ UNFIXED** SILENT-OVERWRITE HOLE

⚠⛔ **ADDED 2026-09-06 (validation). ⭐ `#decision-2026-09-05-201` was ruled ⛔ AFTER this story's
`baseline_commit` (`222fb4d8`) and is ⛔ NOT in the code** — it stands as an **open PATCH** on Story
11b.3a (`11b-3a-…md:788,846`), and a live grep finds ⛔ **no** `expectedVersion` and ⛔ **no**
`Idempotency-Key` anywhere in `apps/api/src/modules/nominee-bank-masking/`. ⭐ Verified 2026-09-06.

⇒ ⛔ **A dev told to *"follow the `/p/$pariwarId/nominee-bank-masking` precedent"* copies a shape that
has ⛔ ALREADY been ruled defective**, on a control that is **structurally identical to this one**: a
per-Pariwar, versioned, rationale-bearing governance write with more than one possible writer.

⭐ **The finding `-201` records, and why it transfers ⛔ exactly:** the masking module's **advisory
lock** — added by a review pass so a losing writer would stop hitting `…_pariwar_version_uq` with a
bare `23505` → **opaque 500** — **removed the only collision that was preventing a silent overwrite**.
⇒ it converts a race into a **QUEUE**: both writers succeed as N and N+1, and ⛔ the second never learns
the first happened. ⚠ Contrast `feature_flags`, which **lets its unique constraint fire** and so gets
lost-update protection **free**.

⛔⛔ **`-201` RULES BOTH, LAYERED, AND THE ORDER IS LOAD-BEARING:**

1. **`Idempotency-Key` — FIRST, opt-in**, reusing `idempotency.createKeyedStore(deps.pool)` (⛔ never a
   second store), **namespaced by route + scope + `pariwarId`**. ⛔ No header ⇒ previous behaviour.
2. **`expectedVersion` — SECOND, REQUIRED and `number | null`** (⛔ not optional; `null` = *"I believe
   there is no record yet"*, which makes the **first** write safe too). Mismatch ⇒ **409 with its own
   REGISTERED error code** — ⛔ never a bare `23505`.

⚠⛔ **Reversed, the two fight each other:** a legitimate retry after a timeout carries the **stale**
version, `expectedVersion` fires, and the admin is told *"someone else changed this"* — ⛔ when the
someone was **themselves** — driving a re-submit that manufactures the very duplicate the key exists to
prevent. ⛔ Do ⛔ not reorder them, and **say so at the call site**.

⚠ ⭐ **This story does ⛔ NOT owe 11b.3a's patch** — that is 11b.3a's open item, ⛔ not scope here
(**AC8**). ⭐ It owes ⛔ not shipping the **same defect a second time** on its own new write path.

---

## Acceptance Criteria

### AC0 — ⛔ THE GOVERNANCE DECISION LANDS FIRST, AND THE KEY IS MINTED IN IT

**Given** `-195` cl.2 — the key gets its **own** governance decision, ⛔ not a build task
**Then** a decision entry is written that: mints the key(s) per **D1**; moves
`PERMISSION_CATALOG_VERSION` from **39**; states the grant (`pariwar_admin` for the write half);
and **states why the `2026-09-02-178` / `2026-08-19-136` cl.3 analogy does ⛔ NOT apply** (Trap 1)
**And** it records that it supersedes **nothing** — `-178` and the masking key's `pariwar_admin`
foreclosure ⛔ stand
**And** the `epics.md` annotation and the sprint flip ride the same `governance:` commit
**And** ⛔ **no code lands before it** ([[feedback_governance_commits_precede_implementation]]).

### AC1 — The target is STORED, per Pariwar, once

**Given** `-190` cl.7(a) and `-191` cl.4
**Then** a per-Pariwar record holds **one** whole-INR target, **strictly positive** (Trap 4)
**And** it is the **SAME target for every drive** in that Pariwar (`-189` cl.2(d), carried forward)
**And** ⛔ there is ⛔ no per-drive override — ⛔ not a column, ⛔ not a nullable field, ⛔ not a seam
**And** ⭐ the shape is the **VERSIONED EFFECTIVE-WINDOW SCHEDULE**, ⛔ not a mutable single row.

⚠⛔ **AMENDED 2026-09-06 (validation) — *"a per-Pariwar record holds one target"* was ⛔ AMBIGUOUS, and
the cheap reading is the ⛔ WRONG one.** ⛔ It reads as *"UPSERT one row per Pariwar"*, which would
(a) destroy the change trail **AC2** requires, and (b) leave ⛔ no `version` for Trap 5's
`expectedVersion` to compare against. ⭐ Both named precedents are **append-only**:

> *"a monotonic `version` per Pariwar, a `[effective_from, effective_until)` window, at most ONE
> open-ended row per Pariwar, and the resolver returns the row whose window contains `asOf` … a later
> change **closes the prior head and inserts a new one**."* — `pariwar_nominee_bank_masking_schedule.ts:29-35`

⇒ **one row per CHANGE; one *currently-in-force* row per Pariwar**, enforced by the partial unique
`… WHERE effective_until IS NULL` (both precedents carry it, and a `(pariwar_id, version)` unique).
⭐ *"One target per Pariwar"* is a **resolver** property, ⛔ not a row count.

### AC2 — A **Pariwar Admin** sets it, and every change is attributable

**Given** cl.7(a)
**Then** the write is gated by the key minted at AC0, checked at `dimension: 'pariwar'`
**And** ⭐ the **REVEAL** key is checked at `dimension: 'pariwar'` **too** — ⛔ not `global`
**And** every change carries a **required rationale**, the **actor**, and an **admin display-name
snapshot**, plus a §1.5 hash-chain **audit line** — the masking-policy precedent, which *"refuses to
skip"* them (`nominee-bank-masking-policy.ts:241-260` throws on a blank rationale ⛔ and on a null
`auditId`) — ⚠ note those four columns are **NULLABLE at the DB** on both precedents: the requirement
is a **write-path** fact, ⛔ so it must be built, ⛔ never assumed from the schema
**And** ⭐⭐ **the write path carries `-201`'s TWO controls, IN ORDER — `Idempotency-Key` FIRST,
`expectedVersion` (REQUIRED, `number | null`) SECOND** (**Trap 5**), with a **registered** 409 code
**And** ⛔ `district_admin` / `state_trustee` are ⛔ NOT granted — inert in both directions
([[project_rbac_geo_scope_containment]]).

⚠⛔ **WHY THE REVEAL KEY'S DIMENSION IS NOW STATED (2026-09-06 validation):** it was ⛔ unstated, and
*"`super_admin` ONLY"* invites `global`. ⛔ Both precedents are `pariwar`-dimension **despite** being
`super_admin`-only (`permissions.ts:563-566`) — the two-axis rule again: **per-Pariwar in SCOPE**,
central in AUTHORITY. ⭐ The narrowing is done by the **GRANT**, ⛔ never by the dimension.

### AC3 — Only a **Super Admin** may reveal it — and the two switches are INDEPENDENT

**Given** cl.7(c)
**Then** two **separate** visibility flags exist — *reveal to members* and *reveal to the public*
**And** ⛔ **only `super_admin`** may change either
**And** they are **independent**: any of the four combinations is expressible
**And** a test asserts a `pariwar_admin` **cannot** flip either — ⛔ the regression this AC exists to
prevent is the write key quietly carrying the reveal
**And** ⭐⭐ **the `pariwar_admin` write path can ⛔ NOT WRITE THE FLAGS AT ALL — ⛔ not even to their
current values.** ⚠ Per **D2 (RULED (b): TWO RECORDS)** the flags live in
`pariwar_drive_target_visibility`, which the target setter ⛔ never touches ⇒ this is **true by
construction**, ⛔ not by discipline. ⭐ A test still asserts it: setting the target leaves both flags
**byte-unchanged**.

⚠⛔ **ADDED 2026-09-06 (validation) — THE ⛔ ROW-LEVEL ANALOGUE OF TRAP 2, AND IT WAS ⛔ UNGUARDED.**
⭐ **D1 split the KEYS. ⛔ Nothing in this story split the ROW.** ⇒ under AC1's ruled append-only shape,
if the target and the two flags share one versioned record, then a **Pariwar Admin** setting the target
closes the head and inserts a **new row that must carry the flags forward** — i.e. a `pariwar_admin`
write becomes the thing that **re-states a `super_admin`-only disclosure decision**, and a copy-forward
bug (or Trap 5's stale read) **silently reverts a reveal the Trust made**. ⛔ That is precisely the
authority collapse Trap 2 forbids, moved down one layer from the key to the row. ⇒ **D2** rules the
storage shape, ⛔ and Task 2 does ⛔ not start without it.

### AC4 — Hidden is the DEFAULT, and `member ≥ public` holds in the reveal

**Given** cl.7(b) and `-189` cl.3
**Then** a Pariwar with no configuration reveals the target to **nobody**
**And** a newly set target is **hidden** — ⛔ setting is ⛔ never revealing
**And** ⭐ **public-revealed-while-member-hidden is REFUSED** — it would show the public more than a
member, which `-189` cl.3 forbids for this data class (`-195` cl.1). ⚠ Enforced, ⛔ not documented.

### AC5 — The admin surface exists, and it says what it does

**Given** cl.7(a)'s *"from day 1"* — a target nobody can set is not set
**Then** a Pariwar Admin can set the figure from an admin surface, following the
`/p/$pariwarId/nominee-bank-masking` precedent
**And** the surface states that the figure is **⛔ not shown to anyone** unless the Trust reveals it
**And** the reveal switches are visible ⛔ only to a `super_admin`.

### AC6 — ⛔ NOTHING RENDERS IT

**Given** Trap 3
**Then** ⛔ no public surface, ⛔ no member surface and ⛔ no wire contract carries the target or either
flag
**And** a test asserts the target does ⛔ **not** appear in the public drive or drive-page responses
**And** ⭐ story **D** is the first consumer, and it consumes the target **SERVER-SIDE ONLY** — the
value reaches the read model, ⛔ never a response body.

⚠⛔ **ADDED 2026-09-06 (validation) — WHAT THIS AC DOES ⛔ NOT COVER, STATED SO IT IS ⛔ NOT MISTAKEN
FOR COVERED.** ⭐ *"The target appears in no response"* is a **TOKEN** assertion, and story **D** ships
a **DERIVED** channel this AC's test would pass straight through: D's meter is
`round(amountRaisedInr / target × 100)` and D's **AC3 displays `amountRaisedInr` itself** ⇒ a reader
recovers `target ≈ amount / percentage` from **two published numbers**, to within the rounding band.
⇒ ⛔ **both this AC's test and D's *"the target is NOWHERE in any response"* test can pass while the
hidden figure is publicly derivable.** ⚠ This story mints the control whose entire purpose is that
invisibility, so it **records** the channel; ⭐ the **mitigation is D's**, at D's render boundary.
⇒ **D3** routes it. ⛔ **D3 does ⛔ NOT block any task in this story** — this story renders nothing.

### AC7 — The target and a member's OBLIGATION never touch

**Given** the policy-meaning note
**Then** ⛔ nothing reads the target when computing what a member owes, is assigned, or has paid
**And** `pools.fixed_amount` is **untouched**
**And** a test asserts the contribution path produces identical results with the target set, unset and
changed.

### AC8 — ⛔ Nothing else moves

**Then** ⛔ no stage vocabulary (story **B**), ⛔ no bank field (story **A**), ⛔ no listing predicate,
⛔ no meter, ⛔ no rate limit, ⛔ no masking behaviour
**And** ⛔ ⛔ the masking key and `-178` are **untouched** (Trap 1).

---

## ⚖️ Decisions

### ✅ D1 — **RULED (b) by BigDev, 2026-09-04: TWO KEYS, `PERMISSION_CATALOG_VERSION` 39 → 41.** ONE key or TWO?

⚠⛔ **READ WITH PREFLIGHT STOP 1 (2026-09-06).** ⭐ What D1 ruled is **TWO KEYS ⇒ +2**. ⛔ The literal
`41` is ⛔ **not** part of the ruling — it is `39 + 2` computed at authoring, and **Story 6.18** bumps
the same counter. ⇒ ⭐ **`+2` from the LIVE value**, ⛔ never a transcribed `41`.

> ⭐⭐ **THE RULING.** **TWO** catalog entries, ⛔ not one. **v39 → v41** (+1 per key, the
> `helpdesk.create` v22→23 and `manage_nominee_bank_masking` v38→39 precedent).
>
> | Key | Grant | Governed act |
> |---|---|---|
> | **write** — recommended name `pariwar.manage_drive_target` | `pariwar_admin` **+** `super_admin` | SET the figure. ⛔ Discloses **nothing** (cl.7(b)). |
> | **reveal** — recommended name `pariwar.manage_drive_target_visibility` | ⛔ **`super_admin` ONLY** | REVEAL it, to members and/or the public. ⭐ **A disclosure act.** |
>
> ⚠ Names are BigDev's recommendation; ⭐ the governance decision **confirms or corrects** them — ⛔ they
> are ⛔ not settled by this ruling.
>
> ⭐⭐ **WHY TWO IS THE POINT, ⛔ not the cost.** Trap 1's entire defence is *"the DISCLOSURE half stays
> CENTRAL"*. ⇒ under one key that claim would rest on a **role check inside a route**; under two it is
> **visible in the catalog**, which is where a Panel member or an auditor would look for it. ⭐ The
> reveal key's `super_admin`-only grant is then **byte-identical in shape** to
> `pariwar.manage_public_name_presentation` and `pariwar.manage_nominee_bank_masking` — ⇒ the analogy
> Trap 1 must distinguish is **honoured for the disclosure half and departed from only for the
> operational half**, which is exactly the two-axis rule of `2026-08-19-136` cl.3.
>
> ⚠⛔ **AND BOTH DOC-BLOCKS CARRY THE ARGUMENT.** ⛔ Not just the write key's. A reader arriving at the
> **reveal** key must see why it is narrower than its sibling, or the pair looks arbitrary.

⭐ **The problem (Trap 2):** cl.7 splits **setting** (Pariwar Admin) from **revealing** (Super Admin
only). ⛔ The catalog must express that split, ⛔ not a handler.

- **(a) ONE key**, granted to `pariwar_admin` + `super_admin`, with the reveal route additionally
  checking the role. ⭐ v39 → **40**. ⛔ But it puts an **authority boundary inside a handler**, where
  ⛔ no catalog reader can see it — and the neighbouring key's doc-block names exactly this
  (*"one key meaning two unrelated things is the drift a catalog exists to prevent"*).
- **(b) ⭐ TWO keys** — a write key (`pariwar_admin` + `super_admin`) and a reveal key
  (`super_admin` **only**). ⭐ v39 → **41**. ⛔ Two catalog entries instead of one; ⭐ the authority
  split is **structural and readable**, and the reveal key's grant matches the masking/presentation
  precedent exactly, which is what makes Trap 1's argument hold.

⭐ **BigDev's recommendation: (b).** Trap 1's whole defence is *"the DISCLOSURE half stays central"*.
⚠ Under (a) that claim rests on a role check in a route; under (b) it is **visible in the catalog**,
which is where a Panel or an auditor would look for it.

⇒ **Task 0 is UNBLOCKED.** ⚠ It still opens with the **governance decision** (`-195` cl.2) — ⛔ the
keys are ⛔ NOT minted in a build task, and the decision must carry Trap 1's argument in full.

### ✅ D2 — **RULED (b) by BigDev, 2026-09-06: TWO RECORDS. ⇒ TASK 2 IS UNBLOCKED.** D1 split the KEYS — ⛔ does the ROW split too?

> ⭐⭐ **THE RULING. TWO records, ⛔ not one.** The authority split is a **DB fact**, ⛔ not a code review.
>
> | Record | Written by | Shape |
> |---|---|---|
> | **`pariwar_drive_target_schedule`** | `pariwar_admin` (+ `super_admin` auto) | ⭐ **VERSIONED** — `pariwar_id`, `version`, `target_inr`, `[effective_from, effective_until)`, `rationale`, `changed_by_actor`, `changed_by_display`, `audit_id`. The `pool_fixed_amount_schedule` shape exactly (Trap 4, AC1). |
> | **`pariwar_drive_target_visibility`** | ⛔ **`super_admin` ONLY** | `pariwar_id`, `reveal_to_members`, `reveal_to_public`, + the same attribution columns. ⭐ **AC4's `CHECK (NOT (reveal_to_public AND NOT reveal_to_members))` lives HERE** — both flags in ⛔ one row, so the constraint is expressible without a join. |
>
> ⭐⭐ **WHY IT IS THE POINT, ⛔ not the cost.** The `pariwar_admin` write path **⛔ cannot name a flag
> column** — ⛔ not to change one, ⛔ not to copy one forward, ⛔ not by accident. ⇒ **AC3's**
> *"a `pariwar_admin` target change leaves both flags byte-unchanged"* stops being a **test of
> discipline** and becomes **true by construction**. ⚠ That is D1's own reasoning, one layer down: if
> the catalog earns two entries so the split is visible to an auditor, the substrate must ⛔ not
> re-merge it underneath.
>
> ⚠ **The cost, stated:** two records and two resolvers. ⭐ Accepted — the reveal record has ⛔ no
> effective-window and ⛔ no version chain to resolve; it is a plain per-Pariwar config row.
>
> ⚠⛔ **AND `-201`'s `expectedVersion` ATTACHES TO THE SCHEDULE, ⛔ NOT THE FLAGS** (Trap 5): the
> versioned record is the one with a `version` to compare. ⭐ The reveal record's concurrency posture
> is a **separate question** its own setter answers — ⛔ do ⛔ not assume it inherits.

⚠⛔ **Raised 2026-09-06 (validation).** ⭐ `-190` cl.7 splits **setting** (Pariwar Admin) from
**revealing** (Super Admin). **D1** made that split **structural in the catalog**. ⛔ **Nothing yet
makes it structural in the SUBSTRATE** — and AC1's ruled append-only shape is what forces the question:

⇒ under *"close the head, insert a new row"*, a **`pariwar_admin`** target change **writes a new row**.
If that row also carries the two reveal flags, the Pariwar Admin's write is **the act that re-states a
`super_admin`-only disclosure decision every time**. ⭐ A copy-forward bug — or Trap 5's stale read —
then **silently reverts a reveal the Trust made**, with the Pariwar Admin's rationale recorded as the
justification. ⚠ **This is `-201`'s exact failure mode with an AUTHORITY BOUNDARY crossed**, which is
strictly worse than the one `-201` was ruled to fix.

- **(a) ONE table**, target + both flags on the versioned row; the write path copies the flags forward
  under a column-level guard. ⭐ One resolver, one `asOf` window, one row to read. ⚠⛔ But the guard is
  **app-level discipline on a governance boundary**, which is the shape Trap 2 rejects.
- **(b) ⭐ TWO records — RECOMMENDED.** A **target schedule** (versioned, `pariwar_admin`-written, the
  `pool_fixed_amount_schedule` shape) **+** a **reveal config** (`super_admin`-written, holding both
  flags). ⭐ The `pariwar_admin` write path then **cannot name a flag column at all** — the separation
  is a **DB fact**, ⛔ not a code review. ⭐ **AC4's** *"public-revealed-while-member-hidden is refused"*
  `CHECK` still lands cleanly: both flags live in **one** row of the reveal record.
  ⚠ Two records instead of one; two resolvers.
- **(c) ONE table, flags on an UN-versioned column set** mutated in place. ⭐ Cheapest. ⛔ But it gives
  the **disclosure** half — the half `-190` cl.7(c) reserved to the Panel's authority — **⛔ no trail
  at all**, on the one axis this story exists to govern.

⭐ **BigDev's recommendation: (b).** ⚠ D1's own reasoning applies unchanged one layer down: *"under (a)
that claim rests on a role check … under (b) it is visible where an auditor would look."* ⇒ if the
catalog earns two entries to make the authority split readable, the substrate should ⛔ not re-merge it.

### ⚠ D3 — **ROUTED 2026-09-06 by BigDev to STORY D (11b.14), QUESTION OPEN. ⛔ NON-BLOCKING; ⛔ C ships unchanged.** The meter's ARITHMETIC channel

> ⭐ **THE ROUTING.** The channel is **RECORDED from this side** (this story mints the control it would
> bypass) and the **question travels to D unanswered** — ⛔ C decides nothing and ⛔ narrows nothing.
> ⚠ **11b-14 gains the reciprocal note by name**, so D cannot wire its meter without meeting it.
> ⛔ ⛔ **Not** escalated, and ⛔ **not** pre-ruled: it is D's render boundary, and D is where the three
> options are actually costed.

⚠⛔ **Raised 2026-09-06 (validation). ⛔ Blocks ⛔ nothing here** — this story renders nothing (Trap 3).
⭐ Recorded **from this side** because this story mints the reveal control the channel would bypass.

⭐ **The channel:** `-189` cl.2(b) ratifies a **bar**; cl.2(c) and `-190` cl.7(b) hide the **target**;
`-190` cl.6/D's **AC3 publishes `amountRaisedInr`**. ⇒ `target ≈ amountRaisedInr ÷ confirmedPercentage`,
recoverable to within the rounding band from **two ratified, published figures**. ⚠ D's AC2 already
bans *"no percentage **label** that lets it be inferred by arithmetic"* — ⛔ but the **bar's own
geometry** is that percentage, and `pool-progress`'s view model exposes `confirmedPercentage` as an
integer 0–100 (`view-model.ts`, verified). ⇒ ⛔ **the ban as written does ⛔ not reach the mechanism.**

⚠ ⭐ **It is a consequence of a RATIFIED COMBINATION, ⛔ not a defect in any one ruling** — the Panel
ruled bar-yes and target-no together. ⇒ ⛔ **not** re-litigated here.
**Question for D:** does D (i) quantize/band the rendered fill so the divisor is not recoverable,
(ii) accept and record it as a ratified consequence, or (iii) route it to the Panel as a disclosure the
combination produces? ⚠ ⛔ Do ⛔ not answer it by narrowing this story — the answer lives at D's render
boundary.

---

## ⚠ What this story does ⛔ NOT do

- ⛔ It does ⛔ **not render the target anywhere** (Trap 3, AC6). ⭐ Story **D** is the first consumer.
- ⛔ It does ⛔ not build the progress bar or the headline copy (**D**).
- ⛔ It does ⛔ not supersede `2026-09-02-178`, and ⛔ does ⛔ not lift the masking key's `pariwar_admin`
  foreclosure (Trap 1). ⚠ A future story wanting that still needs its own Panel ruling.
- ⛔ It does ⛔ not add a per-drive target (AC1).
- ⛔ It does ⛔ not touch `pools.fixed_amount`, the assignment engine, or anything a member owes (AC7).
- ⚠ ⛔ It does ⛔ **not apply `-201`'s patch to the MASKING module** (Trap 5). ⭐ That is Story 11b.3a's
  open item. ⇒ this story owes ⛔ only that its **own** new write path does ⛔ not ship the same defect
  a second time. ⛔ Reaching into `nominee-bank-masking/` would be scope drift (**AC8**).
- ⚠ ⛔ It does ⛔ not decide **D3** — the meter's arithmetic channel is **story D's** render boundary.

---

## Tasks / Subtasks

- [x] **Task 0 — RULE D1 + D2, THEN THE GOVERNANCE DECISION** (AC0) — ⛔ **BLOCKS EVERYTHING**
  - [x] Put **D1** to BigDev — ✅ **RULED: TWO keys, v39 → v41.**
  - [x] ⚠⛔ **Put D2 to BigDev** — ✅ **RULED (b) 2026-09-06: TWO RECORDS.** ⇒ Task 2 unblocked.
  - [x] ⭐ Carry **D2** into the governance decision alongside the keys — ⛔ it is a substrate shape
        under existing rulings, ⛔ not a new policy, so it rides the same entry. ✅ `-203` **cl.5**.
  - [x] ⚠ **D3 ROUTED to story D (11b.14), question OPEN** — ✅ the reciprocal note is **written into
        `11b-14` AC2 + Task 3 + its Change Log** (2026-09-06). ⛔ Non-blocking here.
  - [x] ⛔ **Run the PREFLIGHT's three STOPs** before writing the decision — the catalog number is
        ⛔ read, ⛔ never assumed. ✅ **STOP 1**: `permissions.ts:598` read live 2026-09-06 = **39**,
        and `git log` confirms **6.18 has NOT landed** ⇒ `39 → 41`, `47 → 49`. ✅ **STOP 2**: both
        hard-coded numbers located at `permissions.test.ts:54,56`; `roles.test.ts` holder-set pattern
        confirmed (`expect(holders).toEqual([...])`). ✅ **STOP 3**: `-201` read live — it exists at
        `.decision-log.md:112`, is **post-baseline**, and a grep of
        `apps/api/src/modules/nominee-bank-masking/` finds ⛔ **no** `expectedVersion` and ⛔ **no**
        `Idempotency-Key` ⇒ still **unbuilt**.
  - [x] Read `.decision-log.md` **live** for the head number — ⛔ do ⛔ not hardcode it. ✅ head was
        **`2026-09-05-202`** (⛔ not `-201`) ⇒ this story's entry is **`2026-09-06-203`**.
  - [x] Write the decision: mint **TWO** keys — a **write** key (`pariwar_admin` + `super_admin`) and a
        **reveal** key (⛔ `super_admin` ONLY); bump `PERMISSION_CATALOG_VERSION` by **+2 from the
        LIVE value** (⚠ **STOP 1** — `39 → 41` ⛔ only if this lands before **6.18**); confirm
        or correct the recommended names; **state why the `-178` / `-136` cl.3 analogy does ⛔ not
        apply to the WRITE half and IS honoured for the REVEAL half** (Trap 1, D1); record that it
        supersedes ⛔ nothing.
  - [x] Annotate `epics.md`; flip `sprint-status.yaml` `11b-13-…` to `in-progress`. ✅ seven-item
        annotation block under Epic 11b, **ANNOTATION ONLY**; row flipped; ledger comment prepended.
  - [x] ⛔ One `governance:` commit. ⛔ No code.
- [x] **Task 1 — The catalog** (AC0, AC2, AC3)
  - [x] Declare **BOTH** keys in `packages/domain/src/rbac/permissions.ts`. ⚠⛔ **EACH gets its own
        doc-block carrying Trap 1's argument** — the write key's explains why `pariwar_admin` is
        granted despite the neighbouring foreclosure; the **reveal** key's explains why it is
        **NARROWER than its sibling**, or the pair reads as arbitrary.
  - [x] Cross-reference the two, and cross-reference `pariwar.manage_nominee_bank_masking` — ⭐ that is
        the correct relationship between same-class keys (`2026-09-02-183` cl.1's precedent).
  - [x] ⭐ Declare **BOTH** at `dimension: 'pariwar'` (AC2) — ⛔ neither is `global`.
  - [x] ⚠⛔ **`roles.ts` — CORRECTED 2026-09-06 (validation). The instruction here was WRONG.** It read
        *"Grant in `roles.ts`: write → `pariwar_admin` + `super_admin`; reveal → `super_admin` ONLY"*,
        which would produce **an edit that exists nowhere in the file**: `super_admin`'s bundle is
        `permissions: PERMISSION_CATALOG.keys` (`roles.ts:267-274`) — *"the only global role: every
        catalog key … deriving from the catalog (not a hand-copied list)"* ⇒ ⭐ **`super_admin`
        AUTO-DERIVES both keys the moment they are declared.** ⇒ the actual edits are:
        - **write key** → add to the **`pariwar_admin`** bundle. ⛔ Do ⛔ NOT list `super_admin`.
        - **reveal key** → ⛔ **NO `roles.ts` EDIT AT ALL.** ⭐ Confirmed by the precedent: a grep for
          `manage_nominee_bank_masking` / `manage_public_name_presentation` in `roles.ts` returns
          ⛔ **nothing** — `super_admin`-only keys appear in the catalog and ⛔ never in a bundle.
        - ⛔ Not `district_admin`, ⛔ not `state_trustee` (inert either way).
  - [x] `PERMISSION_CATALOG_VERSION` — **+2 from the LIVE value** (⛔ read it; **STOP 1**). `39 → 41`
        ⛔ only if this story lands before **6.18**.
  - [x] ⚠ **STOP 2's two tests, in the same commit:** `permissions.test.ts:54` (`toBe(39)` → the new
        value, **and append this story's entry to the running rationale comment**) and `:56`
        (`toHaveLength(47)` → **49**, ⛔ not 48). Then `roles.test.ts`'s holder-set assertion for the
        write key.
- [x] **Task 2 — The substrate** (AC1, AC4) — ✅ **UNBLOCKED (D2 RULED (b): TWO RECORDS)**
  - [x] Migration: **TWO** records per **D2** — `pariwar_drive_target_schedule` (versioned,
        `pariwar_admin`-written) and `pariwar_drive_target_visibility` (`super_admin`-written, both
        flags + AC4's CHECK). ⛔ The target table carries ⛔ NO flag column. ⭐ Model on
        **`pool_fixed_amount_schedule`** — the versioned per-Pariwar **rupee** precedent (Trap 4), which
        is also what `pariwar_nominee_bank_masking_schedule.ts:27-32` names as **its own** model.
        ⚠ Hand-authored, ⛔ never `db:generate` ([[project_live_db_test_gotchas]]).
  - [x] ⭐ The **versioned effective-window** shape (AC1): `version` monotonic per Pariwar,
        `[effective_from, effective_until)`, `(pariwar_id, version)` unique, **and** the partial unique
        `ON (pariwar_id) WHERE effective_until IS NULL` — the at-most-one-open-head guard.
  - [x] Whole-INR CHECK — **strictly positive (`> 0`)** ⛔ not `>= 0` — plus the ceiling, mirroring
        `pool_fixed_amount_schedule_amount_positive` / `…_amount_max` and kept **IN SYNC** with a named
        constant, the `MAX_POOL_FIXED_AMOUNT_INR` discipline (Trap 4).
  - [x] ⭐ A DB-level guard that ⛔ refuses public-revealed-while-member-hidden (AC4) — ⛔ do ⛔ not leave
        it to the handler alone; family 5 wants the app rule mirrored by a constraint.
  - [x] ⭐ Every constraint declared in the **migration** has its **twin in the drizzle table file** —
        the snapshot is frozen, so the declaration is what a future reader treats as truth
        (`pariwar_nominee_bank_masking_schedule.ts:171-174` records this being caught by a review pass).
  - [x] RLS + grants per the existing per-Pariwar-settings posture.
- [x] **Task 3 — The domain write** (AC2)
  - [x] The setter, with required rationale + actor + display-name snapshot + audit line, following
        `nominee-bank-masking-policy.ts:241-260`, which *"refuses to skip"* them (⚠ the columns are
        NULLABLE — the refusal is the **write path's**, ⛔ not the schema's).
  - [x] ⭐⭐ **`-201`'s TWO controls, IN ORDER** (Trap 5): `Idempotency-Key` **FIRST** (opt-in, reusing
        `idempotency.createKeyedStore(deps.pool)`, namespaced by route + scope + `pariwarId`), then
        **`expectedVersion` REQUIRED and `number | null`**, mismatch ⇒ **409 with a REGISTERED code**.
        ⛔ Do ⛔ not reorder them, and **say why at the call site**.
  - [x] ⚠ Under **D2(b)** the reveal write is its **own** setter — ⛔ the target setter never names a
        flag column (AC3).
- [x] **Task 4 — The admin surface** (AC5)
  - [x] Route + UI on the `/p/$pariwarId/nominee-bank-masking` precedent.
  - [x] The reveal switches render ⛔ only for `super_admin`.
  - [x] Copy states plainly that the figure is shown to **nobody** unless the Trust reveals it.
- [x] **Task 5 — The tests** (AC1-AC7)
  - [x] `pariwar_admin` CAN set; ⛔ CANNOT reveal (AC3's regression guard).
  - [x] `super_admin` can do both; `district_admin` / `state_trustee` can do neither.
  - [x] Defaults hidden; setting ⛔ never reveals (AC4).
  - [x] Public-revealed-while-member-hidden is **refused** — at the handler **and** at the DB (AC4).
  - [x] The target appears in ⛔ no public response (AC6).
  - [x] The contribution path is **identical** with the target set / unset / changed (AC7).
  - [x] Non-integer, negative, **zero** and absurd values rejected — at the contract boundary **and**
        at the DB (Trap 4). ⚠ **`0` is a rejection case, ⛔ not a boundary pass.**
  - [x] ⭐ **A `pariwar_admin` target change leaves both reveal flags byte-unchanged** (AC3 / D2).
  - [x] ⭐ **Trap 5's two:** a replayed `Idempotency-Key` returns the recorded response and creates
        ⛔ **no** second version + ⛔ no second audit line; a **stale `expectedVersion`** gets the
        registered **409**, ⛔ never a silent overwrite and ⛔ never a bare `23505`/opaque 500.
  - [x] ⭐ The versioned shape holds: a second change **closes the head** and inserts `version + 1`;
        the partial unique refuses a second open head (AC1).
  - [x] ⭐ **Execute them** against `twt-test-pg` on `:5433` — ⛔ *"written but not run"* is ⛔ not
        attested; that gap shipped a red spec at 11b.10.

---

## Dev Notes

### The whole story is an authority argument

⭐ The code is small: one table, one or two keys, a setter, a form. ⚠ **The load-bearing part is
Trap 1's paragraph**, and it has to survive in the catalog doc-block — because the neighbouring key
says in writing that granting `pariwar_admin` "for symmetry" is a **ruling reversal by catalog edit**.

⇒ ⛔ A reader who finds `pariwar_admin` on a new pariwar-dimension key, ⛔ with no argument beside it,
is correct to treat it as a defect. ⭐ **Give them the argument.**

### Why the reveal switches exist before anything reads them

cl.7(c) is the **Panel's** control over a disclosure that does not exist yet. ⛔ Building it later,
after story D renders the bar, would mean shipping a display first and its governance second — the
ordering this project inverts on purpose.

### Testing standards

Live-DB integration under `packages/domain/tests/integration/` and `apps/api/tests/integration/`;
RLS/constraint assertions in a **migration-level policy-regression spec**, ⛔ never only inferred
through higher-level tests (family 5). ⚠ Assert **membership and explicit values**, ⛔ never counts over
the shared fixture.

### References

- `.decision-log.md#decision-2026-09-04-190` cl.7 — set / reveal, and the authority split
- `.decision-log.md#decision-2026-09-04-191` cl.4 — the target is a RUPEE figure
- `.decision-log.md#decision-2026-09-04-195` cl.2 — the key gets its own governance decision
- `.decision-log.md#decision-2026-09-02-178` — the authority ruling this story does ⛔ NOT supersede
- `.decision-log.md#decision-2026-08-19-136` cl.3 — the two-axis SCOPE/AUTHORITY rule
- `packages/domain/src/rbac/permissions.ts:562-598` — the precedent key, its foreclosure, and v39
- `packages/domain/src/claim/nominee-bank-masking-policy.ts:241-260` — the audit discipline to follow

⭐ **Added 2026-09-06 (validation):**

- `.decision-log.md#decision-2026-09-05-201` — ⛔ **POST-BASELINE.** The masking PUT's ruled-but-unbuilt
  `Idempotency-Key` + `expectedVersion` seam, and why the order is load-bearing (**Trap 5**)
- `packages/domain/src/schema/pool_fixed_amount_schedule.ts:60-115` — ⭐ the **true** precedent: a
  per-Pariwar **versioned rupee** record, `> 0` + ceiling CHECKs, open-head partial unique (**Trap 4**)
- `packages/domain/src/pool/fixed-amount.ts:79,405` — `MAX_POOL_FIXED_AMOUNT_INR` + the app-side assert
- `packages/domain/src/rbac/roles.ts:267-274` — `super_admin` derives `PERMISSION_CATALOG.keys` ⇒ ⛔ no
  bundle edit for a `super_admin`-only key (**Task 1**)
- `packages/domain/tests/rbac/permissions.test.ts:54,56` — the two hard-coded numbers (**STOP 2**)
- `_bmad-output/implementation-artifacts/6-18-…md:367-370` — the reciprocal catalog-version warning
  this story did ⛔ not carry (**STOP 1**)

## Dev Agent Record

### Agent Model Used

Claude Opus 5 (`claude-opus-5`) — `bmad-dev-story`, 2026-09-06.

### Debug Log References

**PREFLIGHT, run before Task 0's first line (2026-09-06):**

| STOP | What was read | Result |
|---|---|---|
| **1** | `packages/domain/src/rbac/permissions.ts:598` | `PERMISSION_CATALOG_VERSION = 39`. `git log` shows **6.18 has NOT landed** ⇒ this story takes **39 → 41**, key count **47 → 49**. |
| **2** | `packages/domain/tests/rbac/permissions.test.ts:54,56` | `toBe(39)` + `toHaveLength(47)` located; `:54`'s running-rationale comment confirmed present and appended to, ⛔ not replaced. `roles.test.ts` holder-set convention confirmed (`expect(holders).toEqual([...])`, sorted). |
| **3** | `.decision-log.md:112` + `grep -rn 'expectedVersion\|Idempotency-Key' apps/api/src/modules/nominee-bank-masking/` | `-201` exists, is **post-baseline** (`222fb4d8`), and returns ⛔ **zero** matches in the masking module ⇒ **ruled but unbuilt**, exactly as Trap 5 states. |

⭐ **Decision-log head read live: `2026-09-05-202`** — ⛔ not `-201`, which the story's Trap 5 cites as
the newest relevant entry. ⇒ this story's entry is **`2026-09-06-203`**.

### Completion Notes List

**Task 0 (AC0) — the governance decision, `governance:` commit, ⛔ no code.**

1. ✅ **`2026-09-06-203` written** — author-committed, implementing Trustee-ratified `-190` cl.7 +
   `-191` cl.4. Mints **TWO** keys (D1), carries **D2** as cl.5, pins the money precedent as cl.6,
   and commits `-201`'s two controls on the **new** write path as cl.7.
2. ✅ **Recommended names CONFIRMED unchanged** — `pariwar.manage_drive_target` /
   `pariwar.manage_drive_target_visibility`. Both validated against `PERMISSION_KEY_REGEX`
   (`^[a-z0-9_]+\.[a-z0-9_]+$`, exactly one dot) **before** minting — the 10.22
   `member.moderation_appeal.decide` invalid-name class does ⛔ not recur.
3. ✅ **Trap 1's argument is in the decision in full** (cl.3), on the narrow ground — *setting
   discloses nothing; the disclosure half stays central* — ⛔ never a consistency argument from the
   neighbouring keys, which is the move those keys foreclose in writing.
4. ✅ **Supersedes NOTHING**, stated explicitly: `-178` and the masking key's `pariwar_admin`
   foreclosure stand untouched (cl.3 closing, cl.8).
5. ✅ **`epics.md` annotated** — a seven-item block under Epic 11b naming
   `11b-13-per-pariwar-drive-target-substrate` so a future `sprint-planning` run can neither drop it
   nor regenerate a ghost. **ANNOTATION ONLY**: ⛔ no AC rewritten, ⛔ no prior dated block re-worded
   ([[feedback_supersede_never_reinterpret]]).
6. ✅ **Sprint row flipped** `ready-for-dev` → `in-progress`, with the reverse-chron ledger comment
   `2026-09-06e` prepended ([[project_sprint_status_ledger]]).


**Task 1 (AC0, AC2, AC3) — the catalog.**

7. ✅ **BOTH keys declared at `dimension: 'pariwar'`**, each with its OWN doc-block: the write key's
   carries Trap 1's argument on the narrow ground; the **reveal** key's explains why it is
   **NARROWER than its sibling** — ⛔ without that second block the pair reads as arbitrary. Both
   cross-reference each other **and** `pariwar.manage_nominee_bank_masking`.
8. ✅ **`PERMISSION_CATALOG_VERSION` 39 → 41**, with the full version-bump note above the constant.
   **STOP 2 discharged in the same commit**: `permissions.test.ts:54` `toBe(41)` with this story's
   entry **APPENDED** to the running rationale chain (⛔ the prior text is intact), `:56`
   `toHaveLength(49)` — ⛔ not 48.
9. ✅ **`roles.ts` — the CORRECTED instruction followed.** Exactly ONE edit: the **write** key joins
   the `pariwar_admin` bundle. The **reveal** key gets ⛔ **NO bundle edit** — `super_admin`
   auto-derives `PERMISSION_CATALOG.keys`. ⭐ A test pins BOTH halves, including that `roles.ts`
   never names the reveal key (the `manage_nominee_bank_masking` precedent, verified by grep).
10. ⚠ **COLLATERAL, recorded not silent:** `pool/public-token.ts:103` asserted the live counter as
   *"39 → 40"* — a claim this commit **falsifies**. Corrected to a live-read instruction with the
   argument intact; the *"prose that outlives the thing it describes"* class (11b.11 Trap 4).

**Task 2 (AC1, AC4) — the substrate.** Migration **0115**, hand-authored (⛔ never `db:generate`),
journal entry added by hand, applied and verified live against `twt-test-pg`.

11. ✅ **TWO records per D2.** `pariwar_drive_target_schedule` (versioned, `pariwar_admin`-written)
   carries ⛔ **NO flag column**; `pariwar_drive_target_visibility` (`super_admin`-written) carries
   ⛔ **no target column**. ⭐ A policy-regression test asserts BOTH absences against
   `information_schema`, so a future "simplification" that re-merges them fails **loudly**.
12. ✅ **The versioned effective-window shape** — `version` monotonic per Pariwar,
   `[effective_from, effective_until)`, `(pariwar_id, version)` unique, **and** the partial unique
   `ON (pariwar_id) WHERE effective_until IS NULL`, plus `…_window_not_inverted`.
13. ✅ **Money per the CORRECTED precedent** — `pool_fixed_amount_schedule`, ⛔ not
   `pools.fixed_amount`. **Strictly `> 0`** (⛔ never `>= 0`) + a ceiling kept **IN SYNC** three ways
   (`MAX_DRIVE_TARGET_INR`, the drizzle CHECK, migration 0115) + the contracts wire bound.
14. ✅ **AC4's `member ≥ public` is a DB CHECK**, ⛔ not a handler rule — and a test proves it bites
   on **UPDATE** as well as INSERT.
15. ✅ **Every constraint in the migration has its twin in the drizzle table file** — the 0113
   review-pass finding, honoured up front rather than caught later.
16. ✅ RLS + grants per the per-Pariwar-settings posture: SELECT/INSERT/UPDATE, ⛔ **no DELETE**
   (asserted against `information_schema.role_table_grants`).

**Task 3 (AC2) — the domain write.**

17. ✅ Two setters. The target setter refuses a blank rationale, a null audit anchor, an attributed
   change with no display name, a system write carrying a human name, and grants without the key.
18. ✅ ⭐⭐ **`-201`'s TWO controls, IN ORDER.** `Idempotency-Key` **FIRST** at the HTTP boundary
   (reusing `idempotency.createKeyedStore`, namespaced by route + scope + `pariwarId`);
   `expectedVersion` **SECOND**, REQUIRED and `number | null`, enforced **inside the advisory lock**
   so the head it compares is the one the write supersedes. ⛔ The order is stated at the call site,
   as `-201` cl.2 requires, and a test proves a retry does ⛔ not hit a false conflict.
19. ✅ **The advisory lock STAYS**, with `-201`'s finding written where it applies: it does ⛔ NOT
   give lost-update protection — it converts a race into a **QUEUE**. ⛔ The lock and the version
   guard are ⛔ not alternatives.
20. ✅ The `effectiveFrom` clock-skew CLAMP carried from the masking module — ⛔ not re-learned.

**Task 4 (AC5) — the admin surface.** `/p/$pariwarId/drive-target`, on the masking precedent.

21. ✅ ⭐⭐ **FOUR routes under TWO gates, and AC5's *"reveal switches visible only to a
   `super_admin`"* is satisfied by a 403 on a SEPARATE RESOURCE** — ⛔ never by one endpoint shaping
   its response two ways, which would put the authority boundary back inside a handler.
22. ✅ **A 403 on the visibility read renders NOTHING** — ⛔ not an error. It is the ORDINARY outcome
   for a Pariwar Admin, and a page error there would say the page is broken when it is working
   exactly as ruled.
23. ✅ **Every drive-target error class is REGISTERED** in the error-mapping registry (409/422/400).
   ⚠⛔ Deliberately ⛔ NOT the masking module's posture, whose ungoverned-change error is unregistered
   and reaches the wire as an opaque 500 (11b.3a chunk G2).
24. ✅ Copy states plainly that the figure is shown to **nobody** — STANDING, above the control, in
   every state. ⛔ The masking module's `s-maxage=300` disclosure is ⛔ NOT copied across: this
   control governs nothing rendered, so that sentence would describe a mechanism that does not exist.
25. ✅ OpenAPI: four paths + four components emitted; determinism gate green.

**Task 5 (AC1-AC7) — the tests. ⭐ EXECUTED, ⛔ not merely written** (against `twt-test-pg` on
`:5433` — the gap that shipped a red spec at 11b.10).

| Suite | Count |
|---|---|
| `packages/domain/tests/pool/drive-target.test.ts` (pure) | **22** |
| `packages/domain/tests/integration/pool/drive-target.spec.ts` | **35** |
| `packages/domain/tests/integration/rls/drive-target-policy-regression.spec.ts` | **23** |
| `packages/domain/tests/integration/pool/drive-target-obligation-isolation.spec.ts` (AC7) | **5** |
| `apps/api/tests/integration/drive-target/admin.spec.ts` | **24** |
| `apps/admin/tests/drive-target-page.test.tsx` | **14** |

26. ✅ **AC7 is proven STRUCTURALLY and BEHAVIOURALLY.** A source-level assertion that
   `pool/fixed-amount.ts` and `pool/assign.ts` reference the target **nowhere** (a behavioural test
   can only sample the inputs it tries), plus `getEffectiveFixedAmount` identical with the target
   unset / set far ABOVE the obligation / changed far BELOW it, and
   `pool_fixed_amount_schedule` **byte-unchanged** by a target write.
27. ⚠ **AC6 — WHAT THE TEST DOES ⛔ NOT COVER IS RECORDED IN THE TEST FILE ITSELF**, as its own case,
   so it cannot be mistaken for covered: the assertion is a **TOKEN** one, and D's meter ships a
   **DERIVED** channel it passes straight through. **D3 stays ROUTED to 11b.14 with the question
   OPEN.** ⛔ Not answered by narrowing this story.

**Regression.**

28. ⚠ **ONE REAL REGRESSION FOUND AND FIXED, and it is worth the next reader's attention.**
   `apps/admin/tests/directory-publication-terminology.test.ts` scans a **SLICE** of
   `apps/admin/src/api/hooks.ts` — from the `Directory-publication kill switch` marker to the
   `Verifier-console surface` marker — for the three adverbs `2026-08-21-147` cl.1(d) forbids. ⇒ that
   slice contains **this story's hooks block and the masking one too**, and an innocent *"settles
   immediately"* about a React Query retry failed a gate about a DIFFERENT control's propagation.
   ⭐ **Fixed by REWORDING, ⛔ not by narrowing the gate's markers** — narrowing would REDUCE coverage
   of the control the gate exists to protect. The slice property is now recorded in the file
   ([[project_gate_scope_semantic_coverage]]).
29. ✅ **`pnpm ci:local` with `DATABASE_URL` set: 34/34 jobs GREEN**, including `test (unit)` and
   `integration-tests`. ⚠ Two intermediate failures were **flakes under `turbo run test`'s parallel
   DB load** (`@twt/validity-service`, then `@twt/api`), each passing 284/284 and 1199/1200 in
   isolation and green under the serialized `ci:local` — [[project_ci_local_concurrency_oversubscription]].
   ⛔ Neither touches anything this story changed; ⛔ recorded rather than quietly re-run.

### File List

**Governance (Task 0)**
- `.decision-log.md` — **modified** (Decision `2026-09-06-203` prepended)
- `_bmad-output/planning-artifacts/epics.md` — **modified** (Epic 11b annotation block)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — **modified** (ledger + row flip)
- `_bmad-output/implementation-artifacts/11b-13-per-pariwar-drive-target-substrate.md` — **modified**

**Task 1 — the catalog**
- `packages/domain/src/rbac/permissions.ts` — **modified** (version note, v41, TWO keys)
- `packages/domain/src/rbac/roles.ts` — **modified** (write key → `pariwar_admin`; ⛔ no reveal edit)
- `packages/domain/tests/rbac/permissions.test.ts` — **modified** (STOP 2: `41` / `49` + rationale)
- `packages/domain/tests/rbac/roles.test.ts` — **modified** (two holder-set assertions)
- `packages/domain/src/pool/public-token.ts` — **modified** (collateral: stale catalog number)

**Task 2 — the substrate**
- `packages/domain/migrations/0115_pariwar-drive-target.sql` — **new**
- `packages/domain/migrations/meta/_journal.json` — **modified**
- `packages/domain/src/schema/pariwar_drive_target_schedule.ts` — **new**
- `packages/domain/src/schema/pariwar_drive_target_visibility.ts` — **new**
- `packages/domain/src/schema/index.ts` — **modified**
- `packages/domain/src/policies/pariwar-drive-target-schedule-rls.ts` — **new**
- `packages/domain/src/policies/pariwar-drive-target-visibility-rls.ts` — **new**
- `packages/domain/src/policies/index.ts` — **modified**

**Task 3 — the domain write**
- `packages/domain/src/pool/drive-target.ts` — **new** (bounds + `member ≥ public` predicate)
- `packages/domain/src/pool/drive-target-policy.ts` — **new** (both setters + resolvers)
- `packages/domain/src/pool/errors.ts` — **modified** (four typed errors + codes)
- `packages/domain/src/pool/index.ts` — **modified**
- `packages/domain/src/index.ts` — **modified** (top-level error exports for the registry)

**Task 4 — the admin surface**
- `packages/contracts/src/drive-target/drive-target.ts` — **new**
- `packages/contracts/src/drive-target/index.ts` — **new**
- `packages/contracts/src/index.ts` — **modified**
- `packages/contracts/scripts/emit-openapi.ts` — **modified** (4 components + 4 paths)
- `openapi/v1.yaml` — **modified** (generated)
- `apps/api/src/modules/drive-target/handlers.ts` — **new**
- `apps/api/src/modules/drive-target/routes.ts` — **new**
- `apps/api/src/modules/drive-target/index.ts` — **new**
- `apps/api/src/server.ts` — **modified** (module registration)
- `apps/api/src/middleware/error-mapping/index.ts` — **modified** (four registered arms)
- `apps/admin/src/modules/drive-target/DriveTargetPage.tsx` — **new**
- `apps/admin/src/modules/drive-target/DriveTargetForm.tsx` — **new**
- `apps/admin/src/modules/drive-target/RevealSwitchesForm.tsx` — **new**
- `apps/admin/src/modules/drive-target/i18n-en.ts` — **new**
- `apps/admin/src/routes/DriveTargetRoute.tsx` — **new**
- `apps/admin/src/router.tsx` — **modified**
- `apps/admin/src/api/client.ts` — **modified**
- `apps/admin/src/api/hooks.ts` — **modified** (+ the terminology-gate slice note)

**Task 5 — the tests**
- `packages/domain/tests/pool/drive-target.test.ts` — **new**
- `packages/domain/tests/integration/pool/drive-target.spec.ts` — **new**
- `packages/domain/tests/integration/pool/drive-target-obligation-isolation.spec.ts` — **new**
- `packages/domain/tests/integration/rls/drive-target-policy-regression.spec.ts` — **new**
- `apps/api/tests/integration/drive-target/admin.spec.ts` — **new**
- `apps/admin/tests/drive-target-page.test.tsx` — **new**

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-09-06 | 0.6 | ⭐⭐ **TASKS 1-5 COMPLETE — STORY `in-progress` → `review`. `ci:local` 34/34 GREEN** (incl. `integration-tests` on `twt-test-pg`:5433). **Task 1:** both keys declared `dimension: 'pariwar'`, EACH with its own doc-block (the reveal key's explains why it is NARROWER than its sibling); v39 → **41**, `47 → **49**`; `roles.ts` gets **ONE** edit — the write key into `pariwar_admin`, and ⛔ **NO** bundle edit for the reveal key (`super_admin` auto-derives), pinned by a test. **Task 2:** migration **0115**, hand-authored, **TWO records** — the schedule carries ⛔ no flag column and the visibility record ⛔ no target column, asserted against `information_schema` so a re-merge fails loudly. Money mirrors `pool_fixed_amount_schedule` (**strictly `> 0`** + a ceiling synced three ways), ⛔ not `pools.fixed_amount`; `member ≥ public` is a DB CHECK that bites on UPDATE too; ⛔ no DELETE grant. **Task 3:** `-201`'s two controls IN ORDER — `Idempotency-Key` first at the boundary, `expectedVersion` (REQUIRED, `number \| null`) second inside the advisory lock — with the lock RETAINED and its non-protection stated where it applies. **Task 4:** four routes under **two** gates; AC5's *"switches visible only to a super_admin"* satisfied by a **403 on a separate resource**, ⛔ never a role-shaped response; a 403 there renders **nothing**, ⛔ not an error; every error class **REGISTERED** (⛔ deliberately not the masking module's opaque-500 posture). **Task 5: 123 tests, EXECUTED.** AC7 proven structurally (a source assertion that the obligation path references the target **nowhere**) **and** behaviourally. ⚠ **AC6's uncovered DERIVED channel is recorded IN the test file as its own case** — D3 stays **ROUTED to 11b.14, OPEN**. ⚠⛔ **One real regression found + fixed:** the 10.30 terminology gate scans a **SLICE** of `admin/api/hooks.ts` spanning THREE modules' hooks, so an innocent adverb in this story's block failed a gate about a different control — fixed by **rewording**, ⛔ not by narrowing the gate. Collateral: `pool/public-token.ts`'s *"39 → 40"* claim, falsified by this commit, corrected. | BigDev + Claude |
| 2026-09-06 | 0.5 | ⭐⭐ **TASK 0 CLOSED — `2026-09-06-203` MINTS THE TWO KEYS; ⛔ NO CODE.** PREFLIGHT run first: **STOP 1** — `permissions.ts:598` read **live** = **39** and **6.18 has not landed** ⇒ `39 → 41`, `47 → 49`; **STOP 2** — both hard-coded test numbers located, `:54`'s rationale chain to be **appended**, ⛔ not replaced; **STOP 3** — `-201` confirmed post-baseline and confirmed **unbuilt** (⛔ zero `expectedVersion` / `Idempotency-Key` matches in the masking module). ⭐ Decision-log head read live was **`-202`**, ⛔ not `-201` ⇒ the entry is **`-203`**. The decision mints `pariwar.manage_drive_target` (`pariwar_admin` + `super_admin` auto) and `pariwar.manage_drive_target_visibility` (⛔ `super_admin` ONLY), **both `dimension: 'pariwar'`** — the narrowing is the **GRANT's**, ⛔ never the dimension's. ⭐ **cl.3 carries Trap 1 in full** on the narrow ground (*setting discloses nothing; revealing does, and stays central*) ⇒ `-178` and the masking key's foreclosure **STAND UNTOUCHED**; it supersedes **nothing**. **D2 rides cl.5** (two records ⇒ the `pariwar_admin` path cannot name a flag column). **cl.6** pins `pool_fixed_amount_schedule` + strict `> 0`; **cl.7** commits `-201`'s two controls IN ORDER on the **new** path only. `epics.md` annotated (ANNOTATION ONLY); sprint row `ready-for-dev` → `in-progress`. | BigDev + Claude |
| 2026-09-04 | 0.1 | Created from `2026-09-04-195` cl.3 (story **C**). ⚠ **D1 is OPEN and blocks Task 0**, which itself blocks all code. ⭐ Finding at authoring: the neighbouring key **FORECLOSES `pariwar_admin` in writing**, with *"a Panel ruling"* as its acceptance condition — `-190` cl.7(a) IS one, but the decision must say why the disclosure analogy does ⛔ not apply. | BigDev + Claude |
| 2026-09-06 | 0.4 | ✅⭐⭐ **D2 RULED (b) BY BIGDEV — TWO RECORDS; ⇒ TASK 2 UNBLOCKED, and ⛔ ZERO open decisions remain in this story.** `pariwar_drive_target_schedule` (versioned, `pariwar_admin`) + `pariwar_drive_target_visibility` (⛔ `super_admin` ONLY, both flags + AC4's CHECK). ⭐ The target setter **cannot name a flag column**, so AC3's *"a `pariwar_admin` change leaves the flags byte-unchanged"* becomes **true by construction**, ⛔ not a test of discipline. ⚠ `-201`'s `expectedVersion` attaches to the **schedule**; the reveal record's posture is its own question. ⭐ **D3 ROUTED to story D (11b.14) with the question OPEN** — the reciprocal note is written into **11b-14 AC2 + Task 3 + Change Log**, with the three options and ⛔ none pre-ruled. ⛔ C ships unchanged. | BigDev + Claude |
| 2026-09-06 | 0.3 | ⭐⭐ **VALIDATED — TEN FINDINGS, ⛔ ZERO ROWS MOVE; stays `ready-for-dev`.** ⛔ No code. **Two NEW decisions raised:** **D2** (⛔ BLOCKED Task 2 — D1 split the keys, ⛔ nothing split the ROW: a `pariwar_admin` target write would re-state a `super_admin`-only reveal on every change) and **D3** (⛔ non-blocking, ROUTED to **D** — the meter recovers the hidden target by arithmetic from two published figures, and BOTH stories' *"target in no response"* tests pass anyway). **Corrections:** Trap 4 named `pools.fixed_amount`, which carries ⛔ **no** DB constraint at all — the real precedent is `pool_fixed_amount_schedule` + `MAX_POOL_FIXED_AMOUNT_INR`; *"non-negative"* admitted **₹0**, a division-by-zero for D's meter ⇒ **strictly positive**; **NEW Trap 5** — `-201` (ruled ⛔ AFTER the baseline, ⛔ still unbuilt) rules this exact precedent's write path needs `Idempotency-Key` **then** `expectedVersion`; Task 1's `roles.ts` instruction would have produced an edit **that exists nowhere in the file** (`super_admin` auto-derives the catalog); a **PREFLIGHT** with 3 STOPs — the `39 → 41` collision with **6.18** (whose story carried the warning while this one did ⛔ not) and the two hard-coded test numbers (`47 → 49`, ⛔ not 48); AC1's *"a per-Pariwar record"* pinned to the **versioned effective-window** shape; the reveal key's **`dimension`** stated; and the header's *"⛔ nothing depends on A or B"* corrected — **D**, **E** and **F** all do. | BigDev + Claude |
| 2026-09-04 | 0.2 | ✅ **D1 RULED: TWO keys, v39 → v41.** Write key `pariwar_admin` + `super_admin`; reveal key ⛔ `super_admin` ONLY. Task 0 unblocked — ⚠ it still opens with the governance decision, and **both** doc-blocks carry the argument. | BigDev + Claude |
