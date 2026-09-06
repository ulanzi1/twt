---
baseline_commit: 222fb4d8
---

<!--
⭐ BASELINE — `story(11b.12): create story B`. Carries decisions `2026-09-04-186` … `-196`,
Story 11b.10 closed, the six-story split, and stories A/B `ready-for-dev`.
-->

# Story 11b.13: The Per-Pariwar Drive TARGET — Set by a Pariwar Admin, Revealed Only by a Super Admin `[SUBSTRATE]`

Status: done

> ✅ **`in-progress` → `done` (code review Pass 2 COMPLETE, 2026-09-06).** ⭐ **All three chunks are
> now reviewed** — G1 (`packages/domain/`), G2 (`apps/api` + `openapi` + `packages/contracts`), G3
> (`apps/admin/`) — by three adversarial layers each, **59 patches applied**, `pnpm ci:local`
> **34/34 green**.
>
> ⚠ The earlier `done` → `in-progress` flip was ⛔ never about breakage; it was that the review was
> one-third complete while **5 of Pass 1's 8 patches sat in G3 unreviewed**. ⭐ That caution was
> **vindicated three times over**: each chunk's unreviewed Pass-1 patch concealed a real defect — a
> **vacuous concurrency spec** (G1), a **dangling audit anchor on every governance row** (G2), and an
> **inert 403 guard test** plus three more (G3, where **4 of 5** were defective).
>
> ⚠⛔ **WHAT `done` DOES ⛔ NOT MEAN HERE.** Three things are closed by RULING rather than by code and
> stay live as record: **D-A** (reveal record is last-write-wins — re-raised **five** times, now
> pinned by a test), **D-D** (a no-op save is a governed act), and the **`closeScopeTx` seam** routed
> to the Epic 11b retro. ⭐ Nine deferrals stand in `deferred-work.md`, and **family 13's fix is
> un-mechanized by ruling** — ⛔ nothing in `scripts/` will catch its next regression.

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
| 2026-09-06 | 1.2 | ⭐⭐ **CODE REVIEW PASS 2, CHUNK G2 (`apps/api` + `openapi` + `packages/contracts`) — 11 files / 2,617 diff lines, all three layers.** ⛔ Story stays `in-progress`: **G3 (`apps/admin/`) is still UNREVIEWED** and still holds **5 of Pass 1's 8 never-reviewed patches**. ⭐⭐ **HEADLINE — every governance row's audit anchor pointed at NOTHING.** `withCompensatingAudit` hands the REAL audit id to its `mutate` callback (its doc comment: *"thread the audit id into the mutation row"*); **both** handlers declared `mutate: async () => {`, **discarded it**, and wrote a locally minted `randomUUID()` into `audit_id`. ⛔ No FK ⇒ ⛔ nothing failed, on the surface whose sole justification is provenance, in the column the schema calls *"the join back to it"*. ⚠ The domain guard checks only NON-NULL, so a dangling anchor **satisfied the very check meant to prevent an unanchored change** — and Pass 2's own new UUID-shape guard passed it too. **Verified at source, then fixed**, with the assertion whose absence let it ship (`audit_id` ↔ real line ids, two versions, two distinct anchors). ⚠ `nominee-bank-masking` has the identical shape — a propagated precedent. **1 Decision RULED:** Pass-1 deferral (b)'s *"noisy, ⛔ not corrupting"* ground is **FALSE** with an `Idempotency-Key` present (`closeScopeTx` swallows a failed COMMIT, the 200 ships, audit + idempotency already committed, replay returns the recorded 200 for 24h) ⇒ rationale corrected, original preserved verbatim, and the **house-wide `closeScopeTx` seam ROUTED to the Epic 11b retro**. **16 patches applied:** the audit-anchor fix + its assertion; the **vacuous AC6 scan** rebuilt and **RELOCATED** to `public-pages/sahyog-drive.spec.ts`, where a real fixture serves a real 200 (the old one injected a `randomUUID()` Pariwar, waived the status, and scanned an empty body — `targetInr` could have been added to the public payload and it would have stayed green); the member half of AC6 proven **by construction**; the `expect(true).toBe(true)` vehicle retired; an unusable `Idempotency-Key` now **400** instead of a silent downgrade to unprotected; idempotency-store errors **registered (503)**; six OpenAPI corrections (undocumented 404s ×4, the visibility 409, two **over-promised** statuses, the false *"same transaction"* audit claim, the trim-invisible rationale bounds — now emitting `pattern: \S` so generated clients actually refuse whitespace); the **cross-Pariwar** A-holder-hits-B test; a **contracts↔domain ceiling-sync** test (the third literal, previously prose-only); six untested branches; and the three divergent rejection lists reconciled. **2 deferrals AUGMENTED** (the key binds no ACTOR either — two admins sharing a key means a **misattributed** governance decision; the 24h TTL wedge **self-heals**, so the residual defect is the copy). **1 dismissed** — the reveal-setter concurrency gap, raised by all three layers for the **fourth** time across two passes, ⛔ RULED by D-A and now pinned by a test. ⚠ **Two patches did ⛔ not land as predicted and say so:** the `super_admin` fixture finding was **half wrong** (RLS filters `role_grants`, so the row MUST name the Pariwar — changing it turned seven tests red; reverted, property pinned by a new test), and the duplicated-header guard is **half-attested** (`inject` joins array headers, so that arm is unreachable in this harness — disclosed, ⛔ not faked). ✅ `ci:local` **34/34** — ⚠ after a **33/34 first run** whose two `@twt/admin` failures were **flake** (187/147 ms in isolation vs 7 778/7 097 ms under the gate), reported rather than quietly re-run. | BigDev + Claude |
| 2026-09-06 | 1.1 | ⭐⭐ **CODE REVIEW PASS 2 — `done` → `in-progress`. ⛔ NOT a defect flip: `ci:local` is 34/34 GREEN.** Pass 2 existed because Pass 1's whole output, **including its 8 applied patches**, sat UNCOMMITTED and ⛔ unreviewed. Ran `6759efe5` → **working tree**, chunked by layer (6,491 lines); this pass = **G1** (`packages/domain/`, 23 files / 3,024 lines). ⭐⭐ **HEADLINE: Pass 1's patch 7(b) voided 7(a) in the same commit** — the `23505` backstop made the new concurrency spec VACUOUS (delete `pg_advisory_xact_lock`, everything stayed green, on the file whose header calls itself "the two-connection proof"). All three layers found it independently; **PROVEN BY MUTATION** — the mutant now dies at the new `actualVersion` discriminator while ⭐ every other assertion still passes. **2 Decisions RULED by BigDev:** D-A last-write-wins on the reveal record is **ratified** (`-203` cl.5) and now **pinned by a test** so it stops being re-raised as an oversight; D-B `effectiveFrom` **bounded** (`MAX_DRIVE_TARGET_CLOCK_SKEW_MS` = 5 min + a new registered **400**) — ⚠ closes the BACKWARDS hole only; the future/first-write half is ⛔ **not** closable without a reference clock and is recorded, ⛔ not faked. **14 patches applied** (lock discriminator + predicate unit test, ceiling-sync `pg_get_constraintdef` assertion + accept-at-ceiling, `Object.freeze` on the fail-closed default, `auditId` UUID shape, 3 vacuous tests, reveal refusal case, AC7 scan extended to the HAS-PAID path, `try/finally`, 2 comment corrections, the story record). **6 deferred, 3 dismissed.** ⚠ **3 Pass-1 claims SUPERSEDED, ⛔ not rewritten:** families **1/4/13 were UNTOUCHED**, ⛔ not "covered" — ⭐ 13 is the decaying family, claimed on a chunk with ZERO component code, which is the exact leak it was written to catch; the concurrency-proof claim was FALSE as shipped; AC6 holds in INTENT, ⛔ not as literally written. ⚠ **The first `ci:local` was 33/34 (`lint` RED)** from Pass 2's own unused import — precisely what patch #5 existed to catch, since Pass 1 verified with SCOPED runs and ⛔ never the full gate. ⛔⛔ **⛔ NOT `done`: G2 (API + contracts) and G3 (admin console) are UNREVIEWED, and 5 of Pass 1's 8 patches live in G3 where ⛔ nothing has reviewed them** — the same condition that hid the G1 defect. | BigDev + Claude |
| 2026-09-06 | 1.0 | ⭐⭐ **CODE REVIEW COMPLETE — `review` → `done`.** Three adversarial layers (Blind Hunter, Edge Case Hunter, Acceptance Auditor); no Critical/High. Acceptance Auditor rated AC0–AC8, Traps 1–5, PREFLIGHT STOP 1/2/3, D1/D2/D3 all COVERED and invariant-checklist families 1–13 covered by test or construction. **1 decision** (console sent no `Idempotency-Key` ⇒ `-201` control #1 inert for the one real caller) resolved as a patch by BigDev. **8 patches applied:** the console now sends a per-submit `Idempotency-Key`; the 409 copy branches all three registered codes; a non-403 error on the visibility read now surfaces a retryable error instead of a silently missing section; both forms early-return in the submit callback on an invalid non-text field; the `pariwarId` effect now resets the mutations so a stale error can't leak across tenants; **new integration coverage** for the clock-skew clamp branch and a **true two-connection concurrency spec** (`drive-target-concurrency.spec.ts`) proving the advisory lock serialises and the loser gets the registered 409, backed by a new `23505`→`DriveTargetVersionConflictError` conversion in `setDriveTargetSchedule` (mirroring `fixed-amount.ts`); the redundant non-unique `(pariwar_id)` index dropped from `0115` + the drizzle file. **5 deferred** (shared idempotency-store semantics ×3, background-refetch edit loss, malformed-`pariwarId` copy — all pre-existing / cross-cutting, in `deferred-work.md`). **5 dismissed** (reveal-setter lost-update — ruled by D2; payload-hash `audit_id`; the doc-only `expect(true)` test; AC6's token scan — D3-routed; the intended zero-width window). Verified: `@twt/domain` + `@twt/api` + `@twt/admin` + `@twt/contracts` typecheck + lint clean; domain 430 unit + 490 pool/rls integration green (incl. new specs), api 24 drive-target integration green, admin 16 page tests green. | BigDev + Claude |
| 2026-09-06 | 0.6 | ⭐⭐ **TASKS 1-5 COMPLETE — STORY `in-progress` → `review`. `ci:local` 34/34 GREEN** (incl. `integration-tests` on `twt-test-pg`:5433). **Task 1:** both keys declared `dimension: 'pariwar'`, EACH with its own doc-block (the reveal key's explains why it is NARROWER than its sibling); v39 → **41**, `47 → **49**`; `roles.ts` gets **ONE** edit — the write key into `pariwar_admin`, and ⛔ **NO** bundle edit for the reveal key (`super_admin` auto-derives), pinned by a test. **Task 2:** migration **0115**, hand-authored, **TWO records** — the schedule carries ⛔ no flag column and the visibility record ⛔ no target column, asserted against `information_schema` so a re-merge fails loudly. Money mirrors `pool_fixed_amount_schedule` (**strictly `> 0`** + a ceiling synced three ways), ⛔ not `pools.fixed_amount`; `member ≥ public` is a DB CHECK that bites on UPDATE too; ⛔ no DELETE grant. **Task 3:** `-201`'s two controls IN ORDER — `Idempotency-Key` first at the boundary, `expectedVersion` (REQUIRED, `number \| null`) second inside the advisory lock — with the lock RETAINED and its non-protection stated where it applies. **Task 4:** four routes under **two** gates; AC5's *"switches visible only to a super_admin"* satisfied by a **403 on a separate resource**, ⛔ never a role-shaped response; a 403 there renders **nothing**, ⛔ not an error; every error class **REGISTERED** (⛔ deliberately not the masking module's opaque-500 posture). **Task 5: 123 tests, EXECUTED.** AC7 proven structurally (a source assertion that the obligation path references the target **nowhere**) **and** behaviourally. ⚠ **AC6's uncovered DERIVED channel is recorded IN the test file as its own case** — D3 stays **ROUTED to 11b.14, OPEN**. ⚠⛔ **One real regression found + fixed:** the 10.30 terminology gate scans a **SLICE** of `admin/api/hooks.ts` spanning THREE modules' hooks, so an innocent adverb in this story's block failed a gate about a different control — fixed by **rewording**, ⛔ not by narrowing the gate. Collateral: `pool/public-token.ts`'s *"39 → 40"* claim, falsified by this commit, corrected. | BigDev + Claude |
| 2026-09-06 | 0.5 | ⭐⭐ **TASK 0 CLOSED — `2026-09-06-203` MINTS THE TWO KEYS; ⛔ NO CODE.** PREFLIGHT run first: **STOP 1** — `permissions.ts:598` read **live** = **39** and **6.18 has not landed** ⇒ `39 → 41`, `47 → 49`; **STOP 2** — both hard-coded test numbers located, `:54`'s rationale chain to be **appended**, ⛔ not replaced; **STOP 3** — `-201` confirmed post-baseline and confirmed **unbuilt** (⛔ zero `expectedVersion` / `Idempotency-Key` matches in the masking module). ⭐ Decision-log head read live was **`-202`**, ⛔ not `-201` ⇒ the entry is **`-203`**. The decision mints `pariwar.manage_drive_target` (`pariwar_admin` + `super_admin` auto) and `pariwar.manage_drive_target_visibility` (⛔ `super_admin` ONLY), **both `dimension: 'pariwar'`** — the narrowing is the **GRANT's**, ⛔ never the dimension's. ⭐ **cl.3 carries Trap 1 in full** on the narrow ground (*setting discloses nothing; revealing does, and stays central*) ⇒ `-178` and the masking key's foreclosure **STAND UNTOUCHED**; it supersedes **nothing**. **D2 rides cl.5** (two records ⇒ the `pariwar_admin` path cannot name a flag column). **cl.6** pins `pool_fixed_amount_schedule` + strict `> 0`; **cl.7** commits `-201`'s two controls IN ORDER on the **new** path only. `epics.md` annotated (ANNOTATION ONLY); sprint row `ready-for-dev` → `in-progress`. | BigDev + Claude |
| 2026-09-04 | 0.1 | Created from `2026-09-04-195` cl.3 (story **C**). ⚠ **D1 is OPEN and blocks Task 0**, which itself blocks all code. ⭐ Finding at authoring: the neighbouring key **FORECLOSES `pariwar_admin` in writing**, with *"a Panel ruling"* as its acceptance condition — `-190` cl.7(a) IS one, but the decision must say why the disclosure analogy does ⛔ not apply. | BigDev + Claude |
| 2026-09-06 | 0.4 | ✅⭐⭐ **D2 RULED (b) BY BIGDEV — TWO RECORDS; ⇒ TASK 2 UNBLOCKED, and ⛔ ZERO open decisions remain in this story.** `pariwar_drive_target_schedule` (versioned, `pariwar_admin`) + `pariwar_drive_target_visibility` (⛔ `super_admin` ONLY, both flags + AC4's CHECK). ⭐ The target setter **cannot name a flag column**, so AC3's *"a `pariwar_admin` change leaves the flags byte-unchanged"* becomes **true by construction**, ⛔ not a test of discipline. ⚠ `-201`'s `expectedVersion` attaches to the **schedule**; the reveal record's posture is its own question. ⭐ **D3 ROUTED to story D (11b.14) with the question OPEN** — the reciprocal note is written into **11b-14 AC2 + Task 3 + Change Log**, with the three options and ⛔ none pre-ruled. ⛔ C ships unchanged. | BigDev + Claude |
| 2026-09-06 | 0.3 | ⭐⭐ **VALIDATED — TEN FINDINGS, ⛔ ZERO ROWS MOVE; stays `ready-for-dev`.** ⛔ No code. **Two NEW decisions raised:** **D2** (⛔ BLOCKED Task 2 — D1 split the keys, ⛔ nothing split the ROW: a `pariwar_admin` target write would re-state a `super_admin`-only reveal on every change) and **D3** (⛔ non-blocking, ROUTED to **D** — the meter recovers the hidden target by arithmetic from two published figures, and BOTH stories' *"target in no response"* tests pass anyway). **Corrections:** Trap 4 named `pools.fixed_amount`, which carries ⛔ **no** DB constraint at all — the real precedent is `pool_fixed_amount_schedule` + `MAX_POOL_FIXED_AMOUNT_INR`; *"non-negative"* admitted **₹0**, a division-by-zero for D's meter ⇒ **strictly positive**; **NEW Trap 5** — `-201` (ruled ⛔ AFTER the baseline, ⛔ still unbuilt) rules this exact precedent's write path needs `Idempotency-Key` **then** `expectedVersion`; Task 1's `roles.ts` instruction would have produced an edit **that exists nowhere in the file** (`super_admin` auto-derives the catalog); a **PREFLIGHT** with 3 STOPs — the `39 → 41` collision with **6.18** (whose story carried the warning while this one did ⛔ not) and the two hard-coded test numbers (`47 → 49`, ⛔ not 48); AC1's *"a per-Pariwar record"* pinned to the **versioned effective-window** shape; the reveal key's **`dimension`** stated; and the header's *"⛔ nothing depends on A or B"* corrected — **D**, **E** and **F** all do. | BigDev + Claude |
| 2026-09-04 | 0.2 | ✅ **D1 RULED: TWO keys, v39 → v41.** Write key `pariwar_admin` + `super_admin`; reveal key ⛔ `super_admin` ONLY. Task 0 unblocked — ⚠ it still opens with the governance decision, and **both** doc-blocks carry the argument. | BigDev + Claude |

---

## Review Findings

> ⚠⛔ **THREE CLAIMS IN THIS SECTION ARE SUPERSEDED IN PART BY PASS 2** (below) — the invariant-family
> coverage claim, the concurrency-proof claim, and the AC6 verdict. ⛔ The text below is left **as
> written** ([[feedback_supersede_never_reinterpret]] — a record is superseded, ⛔ never re-read); the
> corrections are stated in **Pass 2 → Corrections to the Pass-1 record**. ⭐ Two of Pass 1's five
> dismissals were also re-raised on narrower grounds and became **Decisions D-A / D-B**, both since
> ruled by BigDev.

⭐ **Code review 2026-09-06** — three adversarial layers (Blind Hunter, Edge Case Hunter, Acceptance Auditor).
**No Critical or High findings.** The Acceptance Auditor rates **AC0–AC8, Traps 1–5, PREFLIGHT STOP 1/2/3, and D1/D2/D3 all COVERED**, and load-bearing-invariant checklist families 1–13 all covered by test or construction (five Low notes, none an AC violation). Findings below are the residue.

### Patches — ALL APPLIED (2026-09-06, `pnpm ci:local`-scoped suites re-run green)

- [x] [Review][Patch] **(resolved from Decision, BigDev chose option 1)** The admin console never sent an `Idempotency-Key`, so `-201`'s control #1 was inert for the only real caller. **Fixed:** `setDriveTarget` / `setDriveTargetVisibility` (`client.ts`) now take an `idempotencyKey` arg and send it as the `idempotency-key` header; `useSetDriveTarget` / `useSetDriveTargetVisibility` (`hooks.ts`) pass a fresh `crypto.randomUUID()` per submission attempt (the `beginErasure` / ground-inspection house pattern) — so a timed-out transport retry replays the recorded result instead of falling through to a spurious `expectedVersion` conflict. OpenAPI already documented the header as optional; no contract change. [apps/admin/src/api/client.ts; apps/admin/src/api/hooks.ts]
- [x] [Review][Patch] 409 error-copy branch mis-mapped `pariwar.drive_target_idempotency_in_progress` to the "display name missing" copy. **Fixed:** `errorMessage` now branches all three registered 409 codes (`version_conflict`, `idempotency_in_progress` → new `driveTarget.error.idempotencyInProgress` copy, `admin.display_name_missing`) and falls through to the generic `unexpected` copy for any unrecognised 409. New test pins it. [apps/admin/src/modules/drive-target/DriveTargetPage.tsx]
- [x] [Review][Patch] A non-403 error on the visibility query rendered nothing (silent vanish for a `super_admin`). **Fixed:** new `revealLoadError = visibility.isError && !revealForbidden` renders a `role="alert"` block (`driveTarget.reveal.loadError` copy — explicitly "not a permissions problem") with a "Try again" button calling `visibility.refetch()`. Only the ruled 403 still renders nothing. New test pins it. [apps/admin/src/modules/drive-target/DriveTargetPage.tsx; i18n-en.ts]
- [x] [Review][Patch] Both admin forms let `handleSubmit` fire with an invalid non-text field. **Fixed:** `DriveTargetForm`'s submit callback early-returns on `amountInvalid`; `RevealSwitchesForm`'s early-returns on `orderInvalid`. The contract + DB CHECK remain the real boundary; this stops the malformed request leaving the browser. [apps/admin/src/modules/drive-target/DriveTargetForm.tsx; RevealSwitchesForm.tsx]
- [x] [Review][Patch] Stale mutation error leaked across client-side Pariwar navigation. **Fixed:** the existing `pariwarId` effect now also calls `changeTarget.reset()` and `changeVisibility.reset()`, so a failed submit on one Pariwar cannot render its error in another's fresh form. [apps/admin/src/modules/drive-target/DriveTargetPage.tsx]
- [x] [Review][Patch] The `effectiveFrom` clock-skew clamp branch was never exercised. **Fixed:** new integration test in `drive-target.spec.ts` — a second write whose `effectiveFrom` precedes the open head, asserting the new row's start is clamped to the head's, the prior row is closed at that same instant (the legitimate zero-width `[T,T)` window), and no instant from `at(0)` onward has no row in force. [packages/domain/tests/integration/pool/drive-target.spec.ts]
- [x] [Review][Patch] No true two-connection concurrency test; no `23505` backstop. **Fixed:** (a) new `packages/domain/tests/integration/pool/drive-target-concurrency.spec.ts` — two `pg.Pool` clients, a FORCED race (writer A held open past B's lock-wait), asserting the loser gets `DriveTargetVersionConflictError` (registered 409) and never a bare `23505` / second version, plus a per-Pariwar-lock non-blocking test; (b) `setDriveTargetSchedule` now wraps the close-head/insert pair and converts a `23505` on the two unique indexes to `DriveTargetVersionConflictError` (`isDriveTargetScheduleUniqueViolation` in `pool/errors.ts`, mirroring `insertNewHead` in `fixed-amount.ts`) — defence-in-depth for the lock, already mapped to 409. [packages/domain/tests/integration/pool/drive-target-concurrency.spec.ts; packages/domain/src/pool/drive-target-policy.ts; packages/domain/src/pool/errors.ts]
- [x] [Review][Patch] Redundant non-unique `index("pariwar_drive_target_visibility_pariwar_id_idx")`. **Fixed:** dropped from migration `0115` and the drizzle table file (`index` import removed); the `UNIQUE (pariwar_id)` index serves every lookup. Migration is pre-merge/unpushed. [packages/domain/migrations/0115_pariwar-drive-target.sql; packages/domain/src/schema/pariwar_drive_target_visibility.ts]

**Verification (2026-09-06, `DATABASE_URL` set → `twt-test-pg` :5433):** `@twt/domain` typecheck + lint clean, 430 unit + 490 pool/rls integration tests green (incl. the new concurrency spec's 2 tests and the new clamp test); `@twt/api` typecheck + lint clean, 24 drive-target integration tests green; `@twt/admin` typecheck + lint clean, 16 `drive-target-page.test.tsx` tests green (+2 new); `@twt/contracts` typecheck clean.

### Deferred

- [x] [Review][Defer] A replayed `Idempotency-Key` carrying a *different* body returns the first body's recorded result and silently drops the second change (the key has no request-body fingerprint) [apps/api/src/modules/drive-target/handlers.ts:184-205] — deferred, pre-existing: a property of the shared `idempotency.createKeyedStore` + the "one key per user action" client contract, matched by the feature-flags / masking precedent; a repo-wide look at whether the keyed store should reject key-reuse-with-different-payload is the right venue.
- [x] [Review][Defer] The idempotency result and the `withCompensatingAudit` line (on `deps.servicePool`) both commit before the caller's scope tx commits — a failed commit after `mutate()` leaves a recorded idempotency response and an audit line with no schedule row [apps/api/src/modules/drive-target/handlers.ts:208-218,266-314] — deferred, pre-existing: the idempotency half is explicitly disclosed as inherited from feature-flags ("noisy, not corrupting"); the audit half is the standard house `withCompensatingAudit` pattern shared by every admin governance module.
- [x] [Review][Defer] The 24h idempotency claim TTL wedges a key for a full day if the process hard-crashes between `claim()` and `recordResult()` / `release()` [apps/api/src/modules/drive-target/handlers.ts:87,193-206] — deferred, pre-existing: a property of the shared keyed store and the documented TTL choice ("matches the feature-flag flip window"); only affects callers that send a key.
- [x] [Review][Defer] A background refetch of `useDriveTarget` / `useDriveTargetVisibility` while a form is open re-seeds it via the `currentTargetInr` effect dependency, silently discarding an unsaved amount / rationale [apps/admin/src/modules/drive-target/DriveTargetForm.tsx:83-86; apps/admin/src/modules/drive-target/RevealSwitchesForm.tsx] — deferred: the dependency is deliberate (avoid a stale "lying" baseline); preserve-edits-vs-re-seed is a design choice, narrow window on a deliberate-submission surface.
- [x] [Review][Defer] A present-but-malformed `pariwarId` in the route URL yields the API's 400 → *"check that the amount is a whole number of rupees…"* page copy (the route guards `!pariwarId` but not a non-UUID one) [apps/admin/src/routes/DriveTargetRoute.tsx:36-45] — deferred: the route `mirrors NomineeBankMaskingRoute EXACTLY` by design; a UUID-shape guard here would diverge from the followed precedent; ultra-narrow (hand-typed / stale URL), recoverable.

### Dismissed as noise (5)

- The reveal setter (`setDriveTargetVisibility`) has no lost-update guard — **ruled by D2 / `-203` cl.5**: the reveal record deliberately does *not* inherit `expectedVersion`; last-write-wins + the §1.5 audit chain matches the two sibling `super_admin`-only disclosure controls, and the setter's docblock states this. All three layers raised it; the Acceptance Auditor flags it "so a future reviewer does not mistake the asymmetry for an oversight." Not a defect.
- `requestPayloadHash` folds in a fresh random `audit_id` and the pre-clamp `effectiveFrom` — the hash records the *request* (RFC-8785 canonical, which is what the comment actually claims — about key order); recording the requested `effective_from` rather than the domain-internal clamped value is defensible request provenance, and no downstream dedup keys on this hash.
- Tautological `expect(true).toBe(true)` documentation test in `admin.spec.ts` — the deliberate closure-honesty idiom (Completion Note #27); the Acceptance Auditor counts it as *correct* family-10 disclosure of AC6's uncovered DERIVED channel.
- AC6's "target in no public response" is a weak substring scan — spec-acknowledged: AC6's own amendment calls it a "TOKEN assertion", the DERIVED channel is D3-routed to 11b.14, and the limitation is recorded in the test file.
- The clock-skew clamp can produce a zero-width `[T, T)` window ("a version that never applied to any instant") — documented in the migration header and policy comments as a legitimate, intended supersession of a row created at the same instant.

---

## Review Findings — PASS 2 (2026-09-06): chunk **G1** `packages/domain/`

⚠⛔ **⛔ This does NOT supersede the Pass-1 section above; it stands ALONGSIDE it.** Pass 1's verdicts remain
its own record ([[feedback_supersede_never_reinterpret]]). Where Pass 2 reaches a different conclusion on
the SAME item, that is stated explicitly below rather than by editing Pass 1's text.

⭐ **Why a second pass.** Pass 1's entire output — the `review → done` flip, the `## Review Findings`
section above, the `deferred-work.md` block, **and its 8 applied patches** — was left **UNCOMMITTED** in
the working tree. ⭐⭐ **Nothing had ever reviewed those 8 patches.** Pass 2 was run over
`6759efe5` → **working tree**, so the patches are inside the reviewed diff for the first time.

**Scope — ⛔ THIS IS ONE CHUNK OF THREE.** 6,491 lines exceeded the review threshold, so the diff was
split by layer-with-its-own-tests. Pass 2 covered **G1 only**: `packages/domain/` — 23 files, 3,024 lines
(migration `0115`, both schema files, both RLS policies, `drive-target-policy.ts`, `drive-target.ts`,
`errors.ts`, the RBAC catalog, and the domain test suite, **including the untracked
`drive-target-concurrency.spec.ts`**).
⛔ **G2** (API + contracts, ~2,120 lines) and ⛔ **G3** (admin console, ~1,399 lines) are **NOT reviewed by
this pass** and owe their own runs.

**Layers:** all three ran and completed (Blind Hunter, Edge Case Hunter, Acceptance Auditor). ⚠ The Edge
Case Hunter and Acceptance Auditor were killed mid-run by a session rate limit on first launch and were
**relaunched at the same model capability** — ⛔ not downgraded — so all three layers are comparable.

⭐⭐ **THE HEADLINE — Pass 1's patch 7(b) VOIDED patch 7(a)'s proof value, in the same commit.**
All three layers reached this independently, and it was then verified directly at the source. Pass 1 added
(a) a two-connection concurrency spec whose stated purpose is proving the advisory lock is load-bearing,
and (b) a `23505` → `DriveTargetVersionConflictError` backstop. **(b) makes (a) vacuous:** delete
`pg_advisory_xact_lock` and every assertion in the spec still passes, because the no-lock path collides on
the unique index and is converted to the *same* class with the *same* code the test asserts on. The file's
own header claims *"DELETING IT would leave every test green … This file is the two-connection proof"* —
⛔ that claim is **false as shipped**, and it names the exact decay pattern
([[feedback_mechanization_split_commitment]]) it fell into.

### ⚠ Corrections to the Pass-1 record (⛔ Pass 1's text is NOT rewritten)

⭐ Three claims in the Pass-1 section and its Change Log row do ⛔ not survive independent checking.
They are corrected **here**, ⛔ not by editing the original — a dated record is superseded, ⛔ never
re-read ([[feedback_supersede_never_reinterpret]], [[feedback_closure_language_precision]]).

1. ⛔ **"invariant-checklist families 1–13 all covered by test or construction"** — **FALSE as stated.**
   Families **1** (⛔ no new events, ⛔ no reducer cases), **4** (this story emits ⛔ no domain event)
   and **13** (semantic accessibility) are **UNTOUCHED**, ⛔ not covered. ⚠⛔ **Family 13 is the sharp
   one:** it is un-mechanized **by ruling** and therefore the half that decays (Epic 10 E3 / I-5), and
   it was claimed as covered on a chunk containing ⛔ **zero** component or surface code. ⭐ Claiming
   coverage for an untouched decaying family is **exactly the leak family 13 was written to catch.**
   ⇒ the correct verdict is **skipped — untouched**, which the checklist's own rule requires be done
   *silently*, ⛔ never as a coverage claim.
2. ⛔ **"a TRUE two-connection concurrency spec … proving the advisory lock serialises"** — **FALSE as
   shipped.** ⭐ Now **TRUE as of this pass**: the spec was vacuous (the same commit's `23505` backstop
   absorbed the mutant), and a discriminating assertion on `actualVersion` was added. ⚠ **Verified by
   MUTATION, ⛔ not by argument:** with `pg_advisory_xact_lock` commented out the suite now FAILS at
   that exact line (`expected null to be 1`) — and ⭐ **every other assertion in the test still
   passed**, which is precisely the vacuity Pass 1 could not see. Lock restored; suite green.
3. ⚠ **AC6 rated flatly COVERED** — covered **in intent**, ⛔ not as literally written. AC6 says *"⛔ no
   wire contract carries the target or either flag"*; `DriveTargetResponse.targetInr` / `.version` and
   the visibility response **do** carry them — key-gated, **as AC5 requires**. ⇒ the honest statement
   is *"⛔ no **PUBLIC or MEMBER** surface or contract carries it"*, which **is** true and **is** what
   AC6 means. The DERIVED channel stays D3-routed to 11b.14, **open**.

### ✅ Decisions — 2, **RESOLVED by BigDev 2026-09-06** (both become patches; ⛔ neither changes shipped behaviour)

- [x] **D-A → option 1: LAST-WRITE-WINS IS RATIFIED.** `-203` cl.5 settled the reveal record's posture; it did ⛔ not merely decline to inherit `expectedVersion`. Pass 1's dismissal was **correct on the merits**. ⭐ But the absence is now pinned by a test rather than left to be re-raised a fourth time — see the patch below. ⛔ No behaviour change, ⛔ no new governance entry owed.
- [x] **D-B → option 2: KEEP THE CLAMP, BOUND THE INPUT.** The clamp is correct for its stated purpose (NTP drift between API instances); what is wrong is that the input it reconciles is unbounded. A `effectiveFrom` outside a bounded skew window is refused; inside it, the clamp behaves exactly as today. ⚠ **This closes the BACKWARDS hole only** — see the patch for why the future/first-write symptom cannot be closed the same way.

- [x] [Review][Decision] **The reveal setter has ⛔ NO concurrency control of any kind — and Pass 1 dismissed this as "ruled by D2".** `setDriveTargetVisibility` has no advisory lock, no `expectedVersion`, and no `updatedAt` precondition on its `onConflictDoUpdate`; two `super_admin`s reading the same state can silently revert each other, **re-publishing a target to the unauthenticated internet after a colleague withdrew it**, with the §1.5 chain showing a coherent attributed change. ⚠ Pass 1 dismissed it (*"ruled by D2 / `-203` cl.5 … last-write-wins matches the two sibling `super_admin`-only disclosure controls"*). ⭐ Pass 2's Edge Case Hunter re-raises it on a **different ground**: the module header states the reveal record's *"concurrency posture is its own question, answered by its own setter (`-203` cl.5)"* and *"⛔ do not assume it inherits"* — but the setter then **answers nothing**. So the question is whether `-203` cl.5 **ratified** last-write-wins, or merely **declined to inherit** `expectedVersion` and left the posture unwritten. ⛔ That is a governance reading, ⛔ not a code call. **Options: (1)** LWW is ratified — re-dismiss, and add a test that PINS the posture so it is a decision on the record rather than an absence; **(2)** add a precondition to the reveal setter (⚠ needs its own decision entry — it departs from what Pass 1 read `-203` cl.5 to say); **(3)** add an advisory lock only (serializes the writes, ⛔ does NOT stop a stale-read overwrite). [packages/domain/src/pool/drive-target-policy.ts:477-546]
- [ ] [Review][Decision] **`effectiveFrom` is UNBOUNDED at the domain API, and a test actively blesses the destructive case.** The clamp is `head.effectiveFrom > input.effectiveFrom ? head.effectiveFrom : input.effectiveFrom`, and the head is then closed at that same instant — so a **backwards** write collapses the prior head's **ENTIRE** effective window to zero width, ⛔ not merely the overlap. `drive-target.spec.ts` asserts this as correct using `effectiveFrom: at(-5)` — **five days backwards**, which is ⛔ not clock skew. After it, *"what was this Pariwar's target on day 3?"* answers with **v2's** figure, on a record whose whole justification is that the trail survives. ⚠ Two layers split on this: the Blind Hunter rated it High (silent history falsification); the Edge Case Hunter enumerated the same boundary and pronounced it *correct and covered*. ⭐ **Both are partly right, and the reachability is the hinge:** from HTTP the handler passes `deps.clock()`, so damage is bounded by NTP skew; from the domain API `effectiveFrom` is a required `Date` with ⛔ no bound at all. The same root cause produces a second symptom on the **first** write (no head ⇒ no clamp): a future `effectiveFrom` makes `getDriveTargetHead` return the row while `resolveEffectiveDriveTargetInr` returns `null`, so the console shows a target and 11b.14's meter sees none. ⚠ Pass 1 dismissed the zero-width window as *"supersession of a row created at the same instant"* — ⭐ that reading is **narrower than the code**, which collapses a row created at **any** earlier instant. **Options: (1)** refuse a backwards (and/or future) `effectiveFrom` with a registered typed error, and retire the blessing test; **(2)** keep the clamp but bound `effectiveFrom` to a skew window, refusing beyond it; **(3)** accept as-is — the only live caller passes the server clock — and record the domain-surface hole openly as an un-attested gap ([[feedback_record_unattested_no_backfill]]). [packages/domain/src/pool/drive-target-policy.ts:366-372,385]

### Patches — 14, ✅ **ALL APPLIED** (12 raised + 2 from the resolved Decisions)

- [x] [Review][Patch] **(from D-A, BigDev chose option 1)** **PIN last-write-wins on the reveal setter as a deliberate posture.** `-203` cl.5 ratified it, so ⛔ no guard is added and ⛔ no behaviour changes — but the posture is currently an **absence**, which is why three review layers across two passes each read it as an oversight. Add an integration test that writes the reveal record from two readers of the same prior state and asserts the **second write wins wholesale** (both flags, rationale and attribution are the second writer's), naming `-203` cl.5 in the test title so the next reviewer meets the ruling instead of the silence. [packages/domain/tests/integration/pool/drive-target.spec.ts]
- [x] [Review][Patch] **(from D-B, BigDev chose option 2)** **Bound `effectiveFrom` to a skew window; keep the clamp inside it.** Refuse with a registered typed error when `head.effectiveFrom - input.effectiveFrom` exceeds a named constant (proposed `MAX_DRIVE_TARGET_CLOCK_SKEW_MS`, **5 minutes** — orders of magnitude above real NTP drift between API instances, far below the 5-day case the current test blesses); within the bound, clamp exactly as today. Retire/retarget the `at(-5)` assertion so the suite stops certifying a 5-day-backwards write as correct, and register the new error so it cannot surface as an opaque 500. ⚠⛔ **HONEST LIMIT — this closes the BACKWARDS hole only.** The **future** first-write symptom (no head ⇒ no clamp ⇒ `getDriveTargetHead` returns a row `resolveEffectiveDriveTargetInr` cannot see) is ⛔ **not** closable the same way: the domain layer has ⛔ no reference clock to compare a future instant against — `effectiveFrom` *is* the clock it is handed. Closing that needs either an injected `now` or a `new Date()` call inside the accessor, ⛔ neither of which this patch introduces. That half is recorded, ⛔ not fixed. [packages/domain/src/pool/drive-target-policy.ts:366-372; packages/domain/src/pool/drive-target.ts; packages/domain/src/pool/errors.ts; packages/domain/tests/integration/pool/drive-target.spec.ts]
- [x] [Review][Patch] **The concurrency spec cannot detect removal of the advisory lock it exists to prove** — all three layers, then verified at source. The `catch` rethrows using the **stale** `actualVersion` captured before the insert, so the lock path throws `actualVersion = 1` (B re-read A's committed head) while the 23505 path throws `actualVersion = null`; the spec asserts only `instanceof` and `code`. Fix: assert the loser's `actualVersion === 1`. ⚠ Also add the missing case — **⛔ no test anywhere exercises the new `catch`**; deleting it leaves all four suites green. [packages/domain/tests/integration/pool/drive-target-concurrency.spec.ts:146-147; packages/domain/src/pool/drive-target-policy.ts:341,433-440]
- [x] [Review][Patch] **The ceiling lives in FOUR artifacts with a stated "KEEP IN SYNC" obligation and ⛔ nothing mechanizes it** — all three layers. `MAX_DRIVE_TARGET_INR` (domain), a hard-coded `100000000` in the frozen migration, a **third** literal in `packages/contracts`, and the drizzle declaration which derives. Both ceiling tests assert rejection *above* using a hard-coded `100_000_001` / `MAX + 1`, so a divergence stays green and surfaces as an unmapped `23514` — ⛔ the exact `-201` failure mode this story exists not to repeat. Fix: assert `pg_get_constraintdef` contains `String(MAX_DRIVE_TARGET_INR)`, and add a DB-level **accept-at-the-ceiling** case. [packages/domain/src/pool/drive-target.ts:55; packages/domain/migrations/0115_pariwar-drive-target.sql:137; packages/contracts/src/drive-target/drive-target.ts:52]
- [x] [Review][Patch] **`DEFAULT_DRIVE_TARGET_VISIBILITY` is a shared mutable singleton returned DIRECTLY by the fail-closed resolver** — verified: ⛔ no `Object.freeze` anywhere in `pool/`. One mutating caller flips the process-wide default and every Pariwar with no visibility row resolves to **revealed**, until restart — turning the single most-emphasized property in the changeset (fail-closed, stated ~15 times) into fail-open, silently, with ⛔ no row anywhere to explain it. Fix: `Object.freeze` it, or return a fresh object. [packages/domain/src/pool/drive-target.ts:114-117; drive-target-policy.ts:222]
- [x] [Review][Patch] **The story record OVERCLAIMS its own coverage in three places** — Acceptance Auditor. Pass 1 states families **1–13 all covered**; families **1, 4 and 13 are UNTOUCHED**, not covered — and 13 is the un-mechanized decaying family, claimed on a chunk with ⛔ no component code, which is precisely the leak family 13 was written to catch. The Change Log's *"proving the advisory lock serialises"* is **false as stated**. AC6 is rated flatly COVERED though its literal *"⛔ no wire contract carries the target"* is untrue — the key-gated admin contract carries it, **as AC5 requires**; the honest statement is *"no **public or member** surface or contract carries it."* Fix: correct all three claims in place ([[feedback_closure_language_precision]]). [_bmad-output/implementation-artifacts/11b-13-per-pariwar-drive-target-substrate.md:852,865]
- [x] [Review][Patch] **⛔ The full gate suite was never run after Pass 1's 8 patches** — Acceptance Auditor. The Change Log lists scoped typecheck/lint plus four test suites, ⛔ not `pnpm ci:local`. The patches edited an **applied migration**, domain source, and admin i18n copy, while `scripts/` holds ~20 invariant gates plus `microcopy`, `schema-diff`, `governance-boundary` and `friction-budget` — ⛔ none in that scoped list. ⚠ Related and benign but real: the live `twt-test-pg` still carries the **dropped** `pariwar_drive_target_visibility_pariwar_id_idx` (created before the edit) while the file no longer creates it, and ⛔ no test asserts the index either way ⇒ it drifts silently until a fresh DB is built. Fix: run `pnpm ci:local` and record the true result. [_bmad-output/implementation-artifacts/11b-13-per-pariwar-drive-target-substrate.md:865]
- [x] [Review][Patch] **Three tests assert nothing they claim to assert.** (a) `expect('pariwar.manage_drive_target').not.toBe('pariwar.manage_drive_target_visibility')` — a parse-time tautology; deleting the entire catalog would not fail it. (b) *"the permission keys are the CATALOG's strings, ⛔ not re-typed literals"* compares each constant to a **hand-typed literal** — i.e. exactly the re-typed literal the name disclaims; rename the catalog key and it still passes while every `hasPermission` silently denies. ⚠ It is also a DB-free assertion sitting inside `describe.skipIf(!hasDatabase)`, so it does not run without a live DB. (c) The cross-tenant **visibility** assertion expects a value byte-identical to the fail-closed default, so a dead fixture passes; the schedule half of the same test adds a raw `select` that would catch it. Fix: assert catalog membership, move (b) out of the skip, add the raw select to (c). [packages/domain/tests/rbac/permissions.test.ts:54-56; packages/domain/tests/integration/pool/drive-target.spec.ts:2454-2457,2482-2487]
- [x] [Review][Patch] **`auditId` is validated for null/empty but ⛔ not for UUID shape** — two layers. The column is `uuid` and the parameter is a bare unbranded `string | null` while every sibling id is branded; `auditId: 'audit-2026-09-06-001'` passes both guards and dies at Postgres as `22P02`, which is ⛔ not in the error registry ⇒ the opaque 500 this module is built to avoid. HTTP path is safe (`randomUUID()`); this is a domain-surface hole. Fix: brand it, or regex the shape alongside the emptiness check. [packages/domain/src/pool/drive-target-policy.ts:297,487]
- [x] [Review][Patch] **The reveal-write refusal table omits the null-actor-carrying-a-display-name case** the schedule table covers. The guard exists at `:825-829` but is untested on the **more consequential** of the two writes — delete it and every test stays green, permitting a `super_admin`-only **disclosure** record attributed to no actor but bearing a human's name. The asymmetry is backwards. Fix: add the case to the reveal `it.each`. [packages/domain/tests/integration/pool/drive-target.spec.ts:2427-2452]
- [x] [Review][Patch] **AC7's isolation scan covers 2 of the 3 paths AC7 names.** AC7 says *what a member owes, is assigned, or has paid*; the source scan covers `pool/fixed-amount.ts` and `pool/assign.ts` — ⛔ not the contribution/reconciliation ("has paid") modules. The property does hold today by a stronger fact (the resolvers have ⛔ no consumer outside the admin API handler), so this is a mechanization gap, ⛔ not a defect. Fix: extend the scan's module list. [packages/domain/tests/integration/pool/drive-target-obligation-isolation.spec.ts:1750-1781]
- [x] [Review][Patch] **The new concurrency spec has ⛔ no `try/finally`**, so any failed assertion between the writers leaves an uncommitted transaction holding row + advisory locks: `afterAll`'s `DELETE` then blocks, `pool.end()` waits on the unreleased client, and the `catch` only logs ⇒ one failing assertion becomes a **hung suite** that masks the original failure. Fix: wrap the client work in `try/finally`. [packages/domain/tests/integration/pool/drive-target-concurrency.spec.ts:114-143,186-196]
- [x] [Review][Patch] **Comment under-states the check it documents:** three doc-blocks say `rationale` is required *"for any actor-attributed change"*; the code requires it **unconditionally**, before any actor branch, so a system/seed write is refused without one. Harmless direction, but in a file this dense with normative comments a comment that under-states a guard is a trap for the next author. Fix: correct the comment to match. [packages/domain/src/pool/drive-target-policy.ts:588,623-625,785]
- [x] [Review][Patch] **Migration header cites the wrong story for the audit chain** — *"its trail lives in the **Story 1.10** audit chain"*, where every other reference in the changeset says **§1.5 / Story 1.5**. ⛔ No runtime effect, but it is the governance header of the file recording what the trail depends on, and it sends the next auditor to the wrong chain. [packages/domain/migrations/0115_pariwar-drive-target.sql:79]

**✅ VERIFICATION (2026-09-06, Pass 2) — `pnpm ci:local` with `DATABASE_URL` → `twt-test-pg` :5433: **34/34 JOBS GREEN**.**
⭐⭐ **AND THE FIRST RUN FAILED, WHICH IS THE POINT.** Patch #5 existed precisely because Pass 1 verified its
8 patches with SCOPED typecheck/lint/test runs and ⛔ never the full gate. The first full run came back
**33/34 with `lint` RED** — an unused-import error introduced by Pass 2's own patch #6 (a test was moved
to the unit file, its two imports were ⛔ not). Fixed, re-run, **34/34 green** (`lint`, `typecheck`,
`build`, `test (unit)`, `db-check`, `integration-tests`, `friction-budget`, `schema-diff`,
`governance-boundary`, `microcopy`, and all 20 invariant gates). ⇒ the scoped-verification gap was ⛔ not
theoretical.

⭐⭐ **PATCH #1 IS MUTATION-PROVEN, ⛔ NOT ARGUED.** With `pg_advisory_xact_lock` commented out,
`drive-target-concurrency.spec.ts` FAILS at the discriminator (`expected null to be 1`) — and ⭐ **every
other assertion in that test still PASSES**, which is exactly the vacuity all three layers predicted and
Pass 1 could not see. Lock restored; suite green (79 drive-target integration tests, 30 unit).

### Deferred — 6

- [x] [Review][Defer] `isDriveTargetScheduleUniqueViolation` discriminates on **SQLSTATE only** (`code === '23505'`), ⛔ not on the two index names its doc-block claims, so a PK collision or any future unique index on the table is reported as a version conflict — and on that path the operator-facing message contradicts itself (*"you last saw none (no schedule yet), but the current head is none (no schedule yet)"*) [packages/domain/src/pool/errors.ts:632-634] — deferred, pre-existing: the named mirror `isFixedAmountUniqueViolation` has a **byte-identical body**, so the imprecision was inherited faithfully rather than introduced; narrowing it is a change to the ratified precedent. ⚠ The *test* gap on this catch is ⛔ NOT deferred — it is folded into the concurrency-spec patch above. **Trigger:** a hardening pass on the pool unique-violation predicates.
- [x] [Review][Defer] `twt_app` holds an **unqualified `UPDATE`** on `pariwar_drive_target_schedule` under a `FOR ALL` policy with ⛔ no column restriction and ⛔ no write-rejection trigger, so *"a governance record is not discarded; every prior target survives"* is an application convention the DB does ⛔ not enforce — a closed row's `target_inr`, `rationale` and `changed_by_actor` can be rewritten in place, routing around the withheld `DELETE` [packages/domain/migrations/0115_pariwar-drive-target.sql:115,162] — deferred, pre-existing: `pool_fixed_amount_schedule` (`0075:72`) carries the **identical** grant shape, so this story mirrors the ratified money precedent exactly; the 0071 `RAISE EXCEPTION` trigger pattern exists as the house remedy but retrofitting it spans both tables. **Trigger:** the Epic 11b retro, or a hardening pass on versioned-schedule immutability.
- [x] [Review][Defer] Passing a **non-transactional `Db`** silently voids both the advisory lock (`pg_advisory_xact_lock` releases at statement commit) and close/insert atomicity, producing the orphaned-closed-head state the same file elsewhere calls unreachable — after which `resolveEffectiveDriveTargetInr` returns `null` for a Pariwar that has a target, and `expectedVersion: null` is accepted despite a full version chain, with the 409 message then reporting *"none (no schedule yet)"* for a Pariwar with rows on disk [packages/domain/src/pool/drive-target-policy.ts:385-389,671,725-727] — deferred, pre-existing: the contract is prose-only across **every** scoped accessor in this repo, ⛔ not this module's invention, and no current caller does it (`setDriveTargetSchedule` is the only writer of the table). **Trigger:** a repo-wide decision on whether `Db` should carry a transaction marker.
- [x] [Review][Defer] The advisory-lock key `hashtext(pariwar_id)` is **un-namespaced**, so it is byte-identical to the key taken by `pool/fixed-amount.ts` and `degraded-mode/declarations.ts` — unrelated governed writes to the same Pariwar serialize against each other, and `hashtext`'s `int4` range means distinct Pariwars collide too [packages/domain/src/pool/drive-target-policy.ts:339] — deferred: ⛔ no correctness loss (each path takes exactly one lock, so no deadlock cycle) and the story was **instructed** to follow this convention (*"⛔ do not introduce a different hash function"*), though a namespaced precedent exists at `pool/spawn.ts:586`. **Trigger:** the next control to adopt the convention, or an observed contention regression.
- [x] [Review][Defer] The `23505` backstop and the `expectedVersion` check throw the **same error class from two different transaction states** — one usable, one already aborted — so a caller that does anything in the same tx after catching (a probe to build a richer 409 body) gets `25P02`, which is unregistered ⇒ opaque 500 [packages/domain/src/pool/drive-target-policy.ts:350-356 vs 433-440] — deferred: ⛔ not reachable today — the audit line is written on `deps.servicePool` (a separate connection) and the handler rolls back — so this needs a future caller that continues in the failed tx. **Trigger:** any change that adds post-catch work to the drive-target handler.
- [x] [Review][Defer] A reveal can be configured for a Pariwar with **⛔ no target at all** — the two records are deliberately independent (D2) and unFK'd, so `resolveDriveTargetVisibility` can report *revealed to the public* while `resolveEffectiveDriveTargetInr` reports `null` [packages/domain/src/pool/drive-target-policy.ts:477-546] — deferred **to 11b.14 alongside D3**: benign today (⛔ no consumer exists), but it becomes a live decision the first consumer must make, and the domain currently records ⛔ no answer for it. **Trigger:** Story 11b.14 Task 3, where D3 is already routed.

### Dismissed as noise (3)

- **The concurrency spec's cleanup `DELETE` is a no-op under `FORCE ROW LEVEL SECURITY`** (Blind Hunter, flagged by it as unverifiable) — ⛔ false: the Edge Case Hunter read `integration-setup.ts:12` and confirmed the `DATABASE_URL` login role is a Docker/CI superuser that bypasses FORCE RLS, so the owner-role purge works.
- **Comments assert out-of-diff components that may not exist** (Blind Hunter, honestly self-flagged as un-checkable from the diff) — ⛔ resolved: all four drive-target error classes **are** registered (`apps/api/src/middleware/error-mapping/index.ts:42-45,544-558`), and `handlers.ts` **does** wrap the domain call in `withIdempotency`, so the `Idempotency-Key`-then-`expectedVersion` ordering holds at the boundary. Both load-bearing claims verified true.
- **`schema/` taking a runtime value import from `pool/` creates a module-init cycle risk** — ⛔ not a current defect: `pool/drive-target.ts` has **zero imports**, so no cycle exists ([[project_type_only_import_cycle_trap]] needs an actual cycle). Recorded as latent only — the edge direction is new, and the migration hard-codes the ceiling anyway.

---

## Review Findings — PASS 2, chunk **G2** `apps/api` + `openapi` + `packages/contracts`

⭐ Second chunk of three. Baseline `6759efe5` → **working tree**, narrowed to G2: **11 files / 2,617 diff
lines** (routes, handlers, the error registry, the Zod wire contracts, `openapi/v1.yaml`, the emitter,
and `admin.spec.ts`). Under the chunking threshold ⇒ reviewed in ONE pass. All three layers ran.
⛔ **G3** (`apps/admin/`, ~1,399 lines) remains **UNREVIEWED**, and still holds **5 of Pass 1's 8
never-reviewed patches**.

⚠ The Edge Case Hunter and Acceptance Auditor were each killed **twice** by a session rate limit and
relaunched at the **same model capability** (⛔ never downgraded) — the third time sequentially rather
than in parallel, which is what got them through.

⭐⭐ **THE HEADLINE — every governance row's audit anchor points at NOTHING.**
`audit.withCompensatingAudit` writes the intent audit line and hands the **real** id to its callback —
`mutate: (intentAudit: { auditId: string })`, whose doc comment states the contract in terms: *"thread
the audit id into the mutation row — e.g. `consent.recordConsent({ auditId })"*. **Both** drive-target
handlers declare `mutate: async () => {` — ⛔ **discarding the parameter** — and write their own locally
minted `randomUUID()` (`handlers.ts:258`, `:341`) into `audit_id` instead. The column has ⛔ no FK, so
⛔ nothing fails. ⇒ on the surface whose ENTIRE stated justification is provenance, ⛔ **no schedule row
or visibility row can ever be joined to its audit line** — the schema calls that column *"the join back
to it"*, and there is ⛔ no join. ⚠ The domain's own `UngovernedDriveTargetChangeError` guard checks
only NON-NULL, so a dangling anchor **satisfies the very check that exists to prevent an unanchored
change** — and Pass 2's own new UUID-shape guard passes it too, since a random UUID is well-formed.
⭐ **Verified directly at source, ⛔ not taken on report.** ⚠ `nominee-bank-masking/handlers.ts` has the
identical shape ⇒ a propagated precedent, ⛔ not a typo.

### ✅ Decision — 1, **RESOLVED by BigDev 2026-09-06** → option 1

- [x] **RULED: correct the rationale, keep deferring, route the seam.** Deferral (b)'s *"noisy, ⛔ not corrupting"* ground is **replaced by the honest one** — *a lost governance write, reported `200`, affirmatively audited as having happened, and un-retryable by the intended mechanism* — with the original wording **preserved verbatim** beside it so the correction is legible ([[feedback_supersede_never_reinterpret]]). ⛔ **No code changes here:** the seam is `closeScopeTx`, which is **house-wide**, so this module ⛔ must not diverge unilaterally. ⭐ **The Epic 11b retro now owes the `closeScopeTx` question** — silently turning a failed COMMIT into a `200` is a property of **every governed write in the system**. ⇒ this becomes patch #16 (the record correction, already applied to `deferred-work.md`).

- [x] [Review][Decision] **A recorded deferral's RATIONALE has been falsified — the write is *corrupting*, ⛔ not "noisy".** Pass-1 deferral (b) deferred the cross-transaction commit window on the stated ground that *"the worst case is a client being told about a version it can then fail to find — **noisy, ⛔ not corrupting**."* ⛔ That is **false when an `Idempotency-Key` is present.** `closeScopeTx` wraps `COMMIT` in `try { … } catch { /* non-fatal */ }` (`apps/api/src/modules/multi-tenant/scope-tx.ts:57-66`) and the commit runs in `onSend` **before the payload is written** — so a failed COMMIT is **swallowed** and the 200 goes out anyway. Meanwhile the audit line (on `deps.servicePool`) and the idempotency result (on `deps.pool`) have **both already committed independently**. ⇒ the operator gets **200 with a version number**, `audit_log_entries` **affirmatively asserts a change that never landed** with ⛔ no compensating line, the schedule row does ⛔ not exist — and **replaying the same key returns the recorded 200 for the full 24h TTL**, so the intended retry mechanism ⛔ cannot recover it. The operator's only escape is to notice the discrepancy and invent a new key. ⚠ The underlying seam (`closeScopeTx` swallowing COMMIT failures) is **house-wide** — every admin module rides it — so this is ⛔ not this story's to fix unilaterally. **Options: (1)** correct the deferral's rationale to the honest one and keep deferring, routing the seam to the Epic 11b retro — ⛔ the record stops claiming a safety it does not have; **(2)** additionally narrow it HERE (e.g. record the idempotency result only after the scope tx commits, or refuse to record a result the handler cannot confirm landed) — ⚠ diverges from the house pattern and owes a decision entry; **(3)** escalate the `closeScopeTx` seam as its own story now, since it silently converts a failed COMMIT into a 200 on **every** governed write in the system. [apps/api/src/modules/drive-target/handlers.ts:291; apps/api/src/modules/multi-tenant/scope-tx.ts:57-66]

### Patches — 16, ✅ **ALL APPLIED**

- [x] [Review][Patch] **(from the Decision, BigDev chose option 1)** Deferral (b)'s falsified *"noisy, ⛔ not corrupting"* rationale **corrected in `deferred-work.md`**, original preserved verbatim beside it, and the house-wide `closeScopeTx` seam **routed to the Epic 11b retro**. ⛔ No code change. [_bmad-output/implementation-artifacts/deferred-work.md]
- [x] [Review][Patch] ⭐⭐ **THREAD THE REAL AUDIT ID.** Change both handlers to `mutate: async ({ auditId }) => { … }` and delete the local `randomUUID()`, so `audit_id` is the id of the row `withCompensatingAudit` actually wrote. ⚠ Also fold it into `requestPayloadHash` **after** it is known (today the hash digests the bogus id, so the digest is ⛔ not reproducible from the audit row either). ⭐ Add a test asserting the written row's `audit_id` **equals** the id of the audit line for that action — the assertion whose absence let this ship. [apps/api/src/modules/drive-target/handlers.ts:258,293,305,341,366,373]
- [x] [Review][Patch] **AC6's guarding test is VACUOUS — it proves nothing about anything.** It injects `GET /p/{freshPariwar}/public-pages/sahyog-drive` for a `randomUUID()` **no row is ever created for**, explicitly waives the status (*"the status is not the subject"*), then token-scans the body — which for a 404/empty index contains none of the tokens **whatever the code does**. Add `targetInr` to the public payload tomorrow and it still passes. **Fix:** build a REAL Pariwar with a configured drive AND a set target, assert a **200 with a non-trivial body**, then token-scan. ⚠⛔ **AND COVER THE MEMBER HALF** — AC6 says *"⛔ no public surface **and ⛔ no member surface**"*; the test injects ⛔ **no member-session route at all** and asserts nothing about the two reveal flags reaching a member. ⭐ The Auditor verified AC6's **substance** holds **by construction** (repo-wide grep: `targetInr`/`revealToMembers`/`revealToPublic` appear ⛔ nowhere outside `drive-target/`; the resolvers have ⛔ no consumer but this handler) — so this is a **mechanization** gap, ⛔ not a live leak. [apps/api/tests/integration/drive-target/admin.spec.ts:659]
- [x] [Review][Patch] **Correct Completion Note 27's AC6 claim, and retire the `expect(true).toBe(true)` vehicle.** The note presents the AC6 test as delivering a token assertion it does ⛔ not deliver. Under family 10 the honest record is *"**AC6 is UN-ATTESTED at the API layer**"* ([[feedback_record_unattested_no_backfill]]). ⚠ Pass 1 **dismissed** this test as the closure-honesty idiom; that dismissal is now untenable, because the always-green case sits **directly beneath** a second always-green case, and together they present as AC6's coverage. Keep the 13-line explanation (it is genuinely valuable and correctly routes D3) — move it to the file header or the deferral, ⛔ not an `it()`. [apps/api/tests/integration/drive-target/admin.spec.ts:680-694]
- [x] [Review][Patch] **OpenAPI states the audit line covers *"the same transaction as the change"* — ⛔ FALSE.** The audit runs on `deps.servicePool`; the mutation on `request.scopeTx.tx`. Two connections, two transactions — which is the entire reason `withCompensatingAudit` exists. ⚠ The **call** is the correct house pattern (all ~20 call sites use `deps.servicePool`); the **claim** is the defect. Fix the sentence in the emitter (the YAML is generated). [openapi/v1.yaml:1551; packages/contracts/scripts/emit-openapi.ts:2273-2274]
- [x] [Review][Patch] **`404` is a real, TESTED status on all four routes and documented on NONE.** Every path entry lists `200/401/403` (+`400/409/422` on writes). The suite asserts 404 for an admin with no grant, and the house posture is deliberate (*404 = this Pariwar is not yours*). A generated client treats it as a transport failure or "endpoint not found" instead of "no access". Document it on all four. [openapi/v1.yaml:1530-1687]
- [x] [Review][Patch] **The visibility PUT can return `409 pariwar.drive_target_idempotency_in_progress`; its OpenAPI 409 names only `admin.display_name_missing`.** `withIdempotency` wraps **both** PUTs; the target PUT documents the code, the visibility PUT does not. [packages/contracts/scripts/emit-openapi.ts:2364]
- [x] [Review][Patch] **OpenAPI OVER-promises two statuses neither PUT can emit** (opposite polarity to the two above): `422 pariwar.drive_target_ungoverned_change` and `400 pariwar.drive_target_invalid` are both fully pre-empted upstream — blank rationale → Zod 400 first; audit anchor → always minted; display name → 409 first; missing grant → `requirePermissionHook` 403 first with an **identical predicate** (verified against `rbac/index.ts:145-157` vs `drive-target-policy.ts:331-345`). Either remove them or state they are backstop-only. [packages/contracts/scripts/emit-openapi.ts:2299-2302,2365-2369]
- [x] [Review][Patch] **A duplicated `Idempotency-Key` header silently DISABLES idempotency instead of rejecting.** Fastify surfaces a repeated header as `string[]`, which fails `typeof headerKey === 'string'` and is treated as **absent** ⇒ the request runs unprotected while the caller believes it is protected, and their timeout retry manufactures the second version the key exists to prevent — *"a version history that reports two operator decisions where there was one"*. Same for a whitespace-only key. **Fix: 400.** [apps/api/src/modules/drive-target/handlers.ts:265-272]
- [x] [Review][Patch] **Register the idempotency-store errors — otherwise a 500 lands AFTER a successful write.** `IdempotencyKeyNotClaimedError` (and any transient pg error from `claim`/`getResult`/`recordResult`/`release`) has ⛔ no arm; `grep -rn "IdempotencyKeyNotClaimed" apps/api/src/` returns **nothing**. ⚠ Because the throw lands **after** `withCompensatingAudit` returned, its compensating line ⛔ never fires while the 500 rolls the scope tx back ⇒ a committed audit line asserting a change that was rolled back. ⭐ The Hunter confirmed ⛔ no earlier arm shadows the five new classes (all derive from the private `abstract class PoolDriveTargetError`), so the `(3c-bis)` block's placement is correct — this is a **missing** arm, ⛔ not a dead one. [apps/api/src/modules/drive-target/handlers.ts:291,296; apps/api/src/middleware/error-mapping/index.ts]
- [x] [Review][Patch] ⚠ **PASS 2'S OWN SKEW PATCH IS WRONG ON THREE COUNTS — self-correction.** (a) **Unreachable on a single node:** the wire carries no `effectiveFrom` (`.strict()`), the handler passes `deps.clock()`, so the only way to trip the 5-minute refusal via HTTP is a **second API node more than five minutes ahead**. (b) ⛔ **The status rationale is FALSE as written.** I justified 400 with *"retrying the same instant fails identically"* — but the caller supplies ⛔ **no instant**; it advances with wall-clock, so the retry I called futile is exactly the one that **succeeds once the clocks converge**, and the operator is told their request is malformed about a field they cannot see or send. (c) **Inside the band the clamp still silently collapses a version's window to zero width**, answering 200 with a bumped version and ⛔ no signal — D-B bounded the outer case and left this one, which Pass 2 recorded only as "the backwards hole is closed". **Fix:** rewrite the rationale honestly, document the 400 in OpenAPI, add a test (or state plainly that it is unreachable via HTTP and is a domain-surface guard only), and record (c) as an open residue. [apps/api/src/middleware/error-mapping/index.ts:64-71; apps/api/src/modules/drive-target/handlers.ts:345]
- [x] [Review][Patch] **`rationale`'s trim is invisible to the published contract — BOTH bounds.** Zod is `.trim().min(1).max(2000)`; OpenAPI emits bare `minLength: 1, maxLength: 2000`. ⇒ a client validating against the spec accepts `"   "` (length 3) and gets a 400 the spec says cannot happen (the suite confirms that 400 is real), **and** a 2000-char rationale with trailing whitespace is documented-invalid but server-valid. [packages/contracts/src/drive-target/drive-target.ts:114,153; openapi/v1.yaml:1438-1441,1502-1505]
- [x] [Review][Patch] **Family 3 REAL GAP — ⛔ NO cross-Pariwar denial test on either new mutation route.** The two tenancy tests are `auditor` **inside** the tenant → 403, and an admin with ⛔ **no grant anywhere** → 404. The case family 3 actually names — **an actor legitimately granted `pariwar_admin` on Pariwar A, hitting Pariwar B** — is exercised ⛔ nowhere. The 404 test's own comment contrasts *"404 = this Pariwar is not yours"* against *"403 = it is yours, but you lack this key"*, yet its actor has **no** Pariwar at all, so "not yours" is never contrasted with "yours". ⚠ Compounded: `grantRole(…, 'super_admin', 'global')` still stamps `pariwar_id` with the Pariwar under test, so **every reveal-route success in the suite rests on an ambiguity** — nothing distinguishes *"a global grant satisfies a pariwar-dimension check"* from *"the row happens to name this Pariwar"*. **Fix both:** add the A-holder-hits-B test, and give the global fixture a different (or null) `pariwar_id`. [apps/api/tests/integration/drive-target/admin.spec.ts:171,459,476]
- [x] [Review][Patch] **The ceiling is TRIPLICATED and only two-thirds mechanized.** G1 now asserts the applied DB CHECK contains the domain constant. `packages/contracts` holds a **third** literal `100_000_000` whose only protection is prose (*"LOCKSTEP: if it moves in the domain it moves here"*) — ⛔ exactly the discipline that mechanization replaced. All three agree today ⇒ latent, ⛔ not live. On drift the wire bound and the DB CHECK disagree and a value between them dies as an **unregistered `23514` → 500**. ⚠ The contracts *source* rightly cannot import `@twt/domain`, but a **test** in `packages/contracts` can — that is the missing leg ([[feedback_mechanization_split_commitment]]). [packages/contracts/src/drive-target/drive-target.ts:52]
- [x] [Review][Patch] **Untested branches.** ⛔ The **entire visibility idempotency path** (its `drive-target:visibility:${pariwarId}` namespace, claim/record/replay and its 409) — so the namespace-collision guarantee between the two PUTs is asserted **nowhere**; ⛔ the **visibility audit action** (`AUDIT_ACTION_VISIBILITY_CHANGED` appears in ⛔ no test — an unwritten visibility audit line would be invisible); ⛔ `409 …idempotency_in_progress` on **either** route; ⛔ the target PUT's `.strict()` (only the visibility PUT's is tested); ⛔ `targetInr` at **exactly** the ceiling (only `+1` is tested); ⛔ `expectedVersion: 1` against an unset Pariwar; ⛔ **both GETs against a configured row** (both only read the unset shape, so the non-null DTO arms are reached only via PUT responses). [apps/api/tests/integration/drive-target/admin.spec.ts]
- [x] [Review][Patch] **Three documents in this diff carry three DIFFERENT rejection-path lists**, and the handler header's *"⛔ NONE of them is a 500. Every domain error class this module can raise IS REGISTERED"* is falsified within the same file by a bare `throw new Error(...)` for the missing-session invariant. ⚠ Defensible as a can't-happen guard — the **absolute prose** is the defect. Reconcile the handler header, the route header and the OpenAPI list (the handler's own list omits the 404 and the `422 ungoverned_change` its registry block registers). ⭐ Also `handlers.ts:73` transcribes *"catalog **v41**"* as prose that ⛔ no test pins — if 6.18 lands second it silently goes stale. [apps/api/src/modules/drive-target/handlers.ts:73,112-123,224-232]

**✅ VERIFICATION (2026-09-06, Pass 2 / G2) — `pnpm ci:local` with `DATABASE_URL` → `twt-test-pg` :5433: **34/34 JOBS GREEN**.**
Suites: `@twt/api` drive-target admin **35/35** (+7 new), public `sahyog-drive` **20/20** (+1 — the
relocated AC6 scan), `@twt/contracts` ceiling-sync **4/4** (new file); `@twt/domain`, `@twt/api`,
`@twt/contracts`, `@twt/admin` typecheck + lint clean; `contracts-determinism` green after
regenerating `openapi/v1.yaml` from the patched emitter.
⚠⛔ **A FALSE START, RECORDED:** the first full run came back **33/34** with `test (unit)` RED on two
`@twt/admin` tests (`moderation-section`, `verifier-console`). ⭐ **FLAKE, ⛔ not a defect** — G2 changed
⛔ nothing under `apps/admin/`, the G1 run passed 34/34 with the identical admin tree, and both tests
pass **in isolation in 187 ms / 147 ms against 7 778 ms / 7 097 ms under the gate** — the
[[project_ci_local_concurrency_oversubscription]] signature on the `test (unit)` job. Re-run: 34/34.
⛔ Reported here rather than quietly re-running until green.

**⚠ TWO PATCHES DID ⛔ NOT LAND AS THE REVIEW PREDICTED — recorded, ⛔ not smoothed over:**

1. ⭐⭐ **The `super_admin` fixture finding was HALF WRONG, and investigating it produced something
   better.** The Blind Hunter argued the fixture could ⛔ not distinguish *"a global grant satisfies a
   pariwar-dimension check"* from *"the row happens to name this Pariwar"*. Changing it as advised
   turned **SEVEN tests RED**. ⇒ `loadActorGrants` queries `role_grants WHERE user_id = $1` with ⛔ NO
   Pariwar predicate, **but runs on the RLS-scoped client**, so the tenant policy filters the rows: a
   grant that does ⛔ not name the Pariwar is **INVISIBLE, whatever its dimension**. ⭐ BOTH halves are
   load-bearing — `pariwar_id` decides whether the row is **SEEN**, `scope_dimension: 'global'`
   decides whether it **SATISFIES** the check. Fixture reverted; the doc-block now states the real
   property; and a new test pins it (*a global grant on ANOTHER Pariwar → 403*), so the next reviewer
   who "corrects" this meets an explanation instead of seven red tests.
2. ⚠⛔ **The duplicated-`Idempotency-Key` guard is only HALF-ATTESTED, and that is recorded rather
   than faked.** The guard is right for real Fastify (a repeated header arrives as `string[]`), but
   `light-my-request`'s `inject` **JOINS an array into one comma-separated string**, so that arm is
   ⛔ NOT reachable through this harness. ⇒ the **blank-key** case is tested; the **array** case is
   disclosed as un-attested ([[feedback_record_unattested_no_backfill]]). ⛔ A green test that
   exercised a different code path and was called coverage is the exact pattern this whole review
   spent two passes unpicking.

### Deferred — 2 (both AUGMENT existing Pass-1 deferrals rather than adding new ones)

- [x] [Review][Defer] **The `Idempotency-Key` binds route + `pariwarId` and ⛔ NOTHING ELSE — ⭐ including ⛔ no ACTOR.** Pass 1 deferred the missing **payload** fingerprint; ⭐ this pass adds the sharper half: **two `pariwar_admin`s in the same Pariwar reusing one key string** (a fixed-key script, a shared form id) means B's write vanishes and B is handed **A's response including A's `changedByDisplay`** — an attribution the operator did ⛔ not make. ⚠ And the handler **already computes** a canonical `requestPayloadHash` twenty lines below and throws it into the audit intent — the fingerprint exists and is ⛔ not used for this. [apps/api/src/modules/drive-target/handlers.ts:260-299] — deferred, pre-existing: a property of the shared `idempotency.createKeyedStore` and the "one key per user action" client contract, matched by the feature-flags / masking precedent. **Trigger:** the repo-wide review of whether the keyed store should key on payload + actor.
- [x] [Review][Defer] **The 24h claim-TTL wedge — ⭐ SOFTENED by evidence Pass 1 did not have.** `keyed-store.ts`'s `claim` path (b) **reclaims an expired-and-still-pending row**, so a key wedged by a hard crash **self-heals at the TTL** rather than permanently. ⚠ The error copy is still misleading meanwhile (*"already in progress — wait and retry"* for a claim that is provably dead), and the advice is false: waiting never helps within the window. [apps/api/src/modules/drive-target/handlers.ts:168,274-298] — deferred, pre-existing: a property of the shared keyed store and its documented TTL choice. **Trigger:** a review of the claim lifecycle, or a report of a wedged key.

### Dismissed as noise (1)

- **The reveal switches have no optimistic-concurrency guard** — raised independently by **all three** G2 layers, and this is now the **fourth** time across two passes. ⛔ **RULED, ⛔ not an oversight:** decision **D-A** (BigDev, 2026-09-06) — `2026-09-06-203` cl.5 **ratifies last-write-wins** for the reveal record, matching the two sibling `super_admin`-only disclosure controls whose accountability is the required rationale + actor + display snapshot + the §1.5 chain rather than a version compare. ⭐ Pass 2 added a test **pinning the posture** precisely so a fifth reviewer meets the ruling instead of the silence. ⚠ If a future story ADDS a precondition, that test SHOULD fail — it is a governance change owing its own decision entry.

---

## Review Findings — PASS 2, chunk **G3** `apps/admin/` (THE LAST CHUNK)

⭐ Baseline `6759efe5` → **working tree**, narrowed to `apps/admin/`: **9 files / 1,497 diff lines**
(page + two forms + i18n copy, the API client and hooks, the route, the router entry, and the RTL
suite). All three layers ran; the two that had been rate-limited earlier were launched **sequentially**
at the **same model capability** — ⛔ never downgraded.

⭐⭐ **THE PATTERN HELD THREE FOR THREE, AND HERE IT IS WORST.** G1 found Pass 1's own patch had made
its concurrency spec vacuous; G2 found every governance row's audit anchor dangling; G3 finds that
**FOUR of the FIVE Pass-1 patches living here have a defect.** ⛔ Nothing had reviewed any of them.

| Pass-1 patch (unreviewed until now) | Verdict |
|---|---|
| (a) console sends `Idempotency-Key` | ⛔ **DEFECTIVE** — fresh key per submit, ⛔ no `pending` guard; the key ⛔ cannot survive an operator retry, which is the ONE case it was minted for |
| (b) 409 copy branches all three codes | ✅ **CLEAN** — all three branches have real tests; the 422 backstop confirmed ⛔ not a gap |
| (c) non-403 visibility read error | ⛔ **GUARD TEST INERT** — asserts a testid that ⛔ cannot render; mutation-walked, **all 16 tests still pass** |
| (d) forms early-return on invalid field | ⛔ **TESTS TAUTOLOGICAL** — both assert `not.toHaveBeenCalled()` ⛔ without ever submitting |
| (e) `pariwarId` mutation reset | ⛔ **ENTIRELY UN-ATTESTED** — ⛔ no test ever renders a second Pariwar; and it **drops a pending save's success callback** |

⭐ **AC5 IS SETTLED — COVERED, and the strongest-covered AC in the chunk.** G2 recorded it as G3-owned
and unverified by any pass. The disclosure renders **outside** every loading/error/data branch, states
the claim in the strong form (*"nothing on any page displays it today … Setting a target is never the
same thing as revealing one"*), and is pinned by two tests — one explicitly rejecting the
"appears-only-after-a-save" degradation. Trap 3's residual is closed too (`noConsumerNote`).

⭐⭐ **FAMILY 13 (SEMANTIC ACCESSIBILITY) EVALUATED IN FULL — the ONLY chunk where it could be.**
G1 and G2 correctly skipped it as untouched. ⚠ It is un-mechanized **by ruling** (`scripts/` holds ~20
invariant gates and ⛔ **zero** cover accessibility), so the Auditor is the only thing reading it.
**Verdict: (a), (b), (c) PASS by construction; (d) REAL GAP (Low).**
⭐ The framing was handled honestly: the checklist is written in **React Native** vocabulary and this is
**web DOM**, so the four checks were read for their SEMANTICS and evaluated against DOM analogues —
⛔ not by forcing RN props onto DOM elements, which would have invented a gap.
· **(a) PASS** — every `aria-label` sits on a `<section>` or `<form>`, i.e. a role that *supports* an
accessible name (the label is what promotes it to a landmark). ⛔ **No** `aria-label` on a bare `<div>`
/`<span>`/`<p>` anywhere ⇒ ⛔ no DOM analogue of the 11a.6 Masthead-seal defect.
· **(b) NOT APPLICABLE, non-trivially** — ⛔ no `progressbar`/`slider`/`meter`/`spinbutton` exists here,
and that is ⛔ **not luck**: the amount field is `type="text" inputMode="numeric"` precisely so it never
acquires the `spinbutton` role that would demand `min`/`max`.
· **(c) PASS** — every interactive element is a native control with a live handler; ⛔ no `role="button"`
on a handler-less body.
· **(d) REAL GAP** — measured against **this codebase's own convention**, ⛔ not an abstract standard.

### ✅ Decisions — 2, **RESOLVED by BigDev 2026-09-06**

- [x] **D-C → option 2: PRESERVE A DIRTY FORM, WARN ON CHANGE.** Re-seed only while the form is
  **untouched**; when the server value changes under an in-progress edit, **say so** rather than
  silently discarding it. ⭐ This keeps the dependency's deliberate intent (⛔ never sit on a stale
  baseline — the comment's stated reason) while ending silent data loss, and it closes the reveal
  form's blank-rationale path as a side effect, because the rationale is ⛔ no longer wiped underneath
  the operator. ⇒ patch below.
- [x] **D-D → option 2: A NO-OP SAVE IS ALLOWED — a restatement IS a governed act.** A rationale-only
  re-affirmation (*"reaffirmed after the Panel meeting"*) is real governance, and the trail is this
  record's whole purpose. ⛔ **No behaviour change, ⛔ no dirty check.** ⇒ the patch is to **record the
  reasoning in the code**, so a sixth reviewer meets the ruling instead of re-raising it — the same
  remedy D-A needed. ⚠ The accepted cost is stated plainly: a restatement bumps `version` and stales
  every other open console's `expectedVersion`.

- [x] [Review][Decision] **A background refetch WIPES the operator's unsaved edits — Pass 1 deferred this as a "design choice", and that framing is now too weak.** The re-seed effect depends on `currentTargetInr`, so a refetch on window-focus/refetchOnMount (`staleTime: 0`, `refetchOnWindowFocus` default `true`) calls `reset({ amount: …, rationale: '' })` mid-edit, discarding a typed amount and a long rationale with ⛔ no warning. ⚠ Pass 1 deferred it as *"a genuine design choice, narrow window on a deliberate-submission surface"*. ⭐ **What Pass 1 did ⛔ not know:** the SAME effect also silently upgraded `expectedVersion` (patched separately below), so the window was ⛔ not narrow — it was the mechanism by which the lost-update guard stopped firing. ⚠ On the REVEAL form it is worse: the effect resets **both toggles AND the rationale**, and because that form's `disabled` omits a rationale check (unlike its sibling), the operator can then submit a **blank** rationale on the disclosure control. **Options: (1)** keep deferring the edit-loss as UX, now that the correctness half is fixed independently; **(2)** preserve a dirty form — re-seed only when untouched, and warn when the server value changes under an in-progress edit; **(3)** block the re-seed entirely while dirty. [apps/admin/src/modules/drive-target/DriveTargetForm.tsx:83-86; RevealSwitchesForm.tsx:60-65]
- [ ] [Review][Decision] **⛔ Neither form has a DIRTY CHECK, so a no-op save is possible — and on a versioned governance record that is ⛔ not harmless.** Both forms seed from the recorded truth, so an operator who opens the page, types a rationale and clicks Save writes the **identical** figure. Consequences: `version` increments, so **every other open console's `expectedVersion` goes stale** and their next legitimate change is refused with *"Somebody else changed the target"* — for a change that changed **nothing**; and the schedule gains a governance row asserting an operator decision that was ⛔ not one. ⚠ But this is ⛔ **not obviously a defect**: re-stating a rationale against an unchanged figure could be a legitimate governance act (*"reaffirmed after the Panel meeting"*), and this record's whole purpose is the trail. ⛔ A code change cannot decide which. **Options: (1)** allow it — a rationale-only restatement IS a governed act; record the reasoning so it stops being re-raised; **(2)** block it — disable Save when neither the amount nor the switches differ from what is in force; **(3)** allow but distinguish — permit it and mark the row as a restatement, ⚠ which is a SUBSTRATE change and owes its own story. [apps/admin/src/modules/drive-target/DriveTargetForm.tsx:159; RevealSwitchesForm.tsx:150]

### Patches — 29, ✅ **ALL APPLIED** (27 raised + 2 from the resolved Decisions)

⚠ This heading read *"26 (24 raised + 2)"* while the list was being written — an undercount of the
bullets actually authored, corrected here rather than left to disagree with the list beneath it.

- [x] [Review][Patch] **(from D-C, BigDev chose option 2)** **Re-seed only an UNTOUCHED form; warn when the value changes under an edit.** Gate both re-seed effects on the form not being dirty (`formState.isDirty`, plus the two `useState` toggles on the reveal form), and when a refetch brings a different `currentTargetInr` / posture while dirty, render a `role="status"` notice naming what changed and offering to take the new value — ⛔ never a silent `reset()`. ⚠ Pairs with the `expectedVersion`-capture patch: with the version captured at seed time, an operator who keeps editing through a change now gets an honest **409** instead of a silent overwrite. [DriveTargetForm.tsx:83-86; RevealSwitchesForm.tsx:60-65]
- [x] [Review][Patch] **(from D-D, BigDev chose option 2)** **Record that a NO-OP SAVE IS DELIBERATE.** ⛔ No dirty check is added. Write the ruling where a reviewer will meet it — a comment on both submit paths stating that a rationale-only restatement against an unchanged figure is a **governed act**, that the resulting `version` bump and the staling of other consoles' `expectedVersion` are the **accepted cost** of an append-only trail, and that removing it would be a governance change owing its own decision entry. ⚠ Without this it will be re-raised, exactly as D-A's absence has been raised **five** times. [DriveTargetForm.tsx:159; RevealSwitchesForm.tsx:150]

**⛔ Correctness — the operator is told something false, or loses a write**

- [x] [Review][Patch] ⭐⭐ **THE IDEMPOTENCY KEY CANNOT SURVIVE THE ONE RETRY IT EXISTS FOR** (three layers converge). `crypto.randomUUID()` is evaluated **inside `mutationFn`**, so every attempt mints a NEW key. ⇒ (i) ⛔ no `pending` guard on either submit handler, so a double-Enter fires two mutations with two DIFFERENT keys and the same `expectedVersion` — the second returns a version conflict telling the operator *"Somebody else changed the target"* **when the somebody was themselves**, verbatim the failure `-201` cl.2 minted the control to prevent; (ii) G2 added a **503 `idempotency.record_failed`** whose server message is literally *"retry with the same `Idempotency-Key`"* — the console has ⛔ no 503 branch, falls through to *"the change may not have been saved, reload…"*, and there **is no same key to retry with**. ⭐ **The in-repo precedent does it correctly:** `FeatureFlagsPage.tsx:189/296` and `CustomFieldsPage.tsx:181/207` hold the key in a `useRef` (`??=`), reset only on a genuinely new operator attempt. **Fix:** hold the key in a ref per operator attempt; add `if (pending) return;` to both handlers; map 503 to copy that says *retry, do not reload*. [apps/admin/src/api/hooks.ts:583,602; DriveTargetForm.tsx:304-313; RevealSwitchesForm.tsx:798-808; DriveTargetPage.tsx:82]
- [x] [Review][Patch] ⭐⭐ **A BACKGROUND REFETCH SILENTLY UPGRADES `expectedVersion`, DEFEATING THE GUARD THE PAGE'S OWN COPY PROMISES UNCONDITIONALLY.** `expectedVersion: target.data.version` is read from the **freshest query data at submit time**, ⛔ never from the version the operator was shown when they began editing. ⇒ A edits; B saves v8; A's tab refetches; A's submit now carries `expectedVersion: 8` and **SUCCEEDS, overwriting B**. The standing copy says: *"If someone else changes the target first, your change is refused rather than quietly overwriting theirs."* ⛔ That is false in exactly the window it describes. **Fix:** capture the version into form state at seed time and submit **that**. ⚠ This is the correctness half of Decision 1 and is fixed independently of the edit-loss question. [DriveTargetPage.tsx:615-619; DriveTargetForm.tsx:290-293; i18n-en.ts:951-952]
- [x] [Review][Patch] ⭐⭐ **THE DOCUMENTED 404 IS UNMAPPED, AND IT DEFEATS `revealForbidden`** ⇒ a wrong-tenant URL renders **two contradictory, both-false** messages plus an infinite retry button. G2's handler documents 404 as a *different layer* from 403 (*"404 = this Pariwar is not yours; 403 = it is yours, but you lack this key"*). The console: `errorMessage` has ⛔ no 404 branch ⇒ *"Something went wrong on the server and the change may not have been saved. Reload…"* (both clauses false, and the reload loops forever); and `revealForbidden` keys on `status === 403` **only**, so a 404 makes `revealLoadError` true ⇒ *"**This is not a permissions problem** — the request to the server failed. Try again."* on a condition that is **purely** authorization, with a retry that can ⛔ never succeed. ⚠ Patch (c) added the non-403 branch without enumerating the sibling denial documented four lines above the 403. [DriveTargetPage.tsx:53-84,122-129]
- [x] [Review][Patch] **THE OFFLINE/`paused` CELL RENDERS NOTHING — reproducing the exact silent omission patch (c) exists to forbid.** `createQueryClient` sets no `networkMode`, so the default `'online'` pauses a fetch when connectivity drops. Verified in the installed `query-core`: a paused query has `isLoading === false`, `isError === false`, `data === undefined` — a cell the page's three-way ternary ends in `: null`. ⇒ the status region renders a heading over an **empty body**; the form is absent; and **the reveal region renders nothing at all**, which for a `super_admin` is **byte-identical to the ruled 403** — precisely the "indistinguishable from the ordinary 403" outcome the retry affordance was added to prevent, with the retry button unreachable in the one state that needs it. ⚠ Same cell on the mutation side: a paused mutation keeps `isPending`, so the button reads *"Saving…"* with `aria-busy` **indefinitely**. **Fix:** handle `fetchStatus === 'paused'` explicitly on both queries and both mutations. [DriveTargetPage.tsx:158-212,215,259-283]
- [x] [Review][Patch] **`isError` WITH `data` present: a read error is announced ABOVE a live, submittable form carrying a stale `expectedVersion`.** React Query retains `data` across a failed refetch, and the form's guard is the independent `{target.data && …}`. ⇒ a red `role="alert"` reading *"…the change may not have been saved"* — voiced for a **mutation the operator never made** — sits directly above a Save button whose version came from a read the page has just declared failed. ⚠ Same shape on the reveal side (`revealLoadError` and `showReveal` are not mutually exclusive): an error banner stacked above **working, populated switches**, under **duplicate `aria-label`s**, on a disclosure surface. **Fix:** gate the form/section on `!isError`, or state in the copy that stale values are shown. [DriveTargetPage.tsx:126-128,159-162,215]
- [x] [Review][Patch] **A whitespace-only rationale is submittable on the REVEAL form** — the disclosure control. Two gaps compounding: its Save `disabled` has ⛔ no rationale check (its sibling's does, via `.trim()`), and React Hook Form's `required` does ⛔ not trim (verified in the installed `react-hook-form@7.79.0`: `isEmpty` tests `=== ''`, so `'   '` passes). The early-return guard checks only `orderInvalid`. ⇒ the request reaches the server with an empty rationale and the operator is shown *"Check that the **amount** is a whole number of rupees … and that the reason is not excessively **long**"* — on a form with ⛔ no amount field, told their **empty** reason is too **long**. [RevealSwitchesForm.tsx:64,77-82,150]
- [x] [Review][Patch] **`errorMessage` renders RAW JavaScript / Zod text into a `role="alert"`, contradicting its own comment** (*"curated copy, ⛔ not the raw server code/message"*). Three reachable non-`ApiError` producers: a network drop surfaces the browser's *"Failed to fetch"* / *"Load failed"* verbatim — **the most common console failure never reaches the curated copy**; a contract drift surfaces a multi-line `ZodError` JSON dump as the entire status region; and `crypto.randomUUID` is **secure-context-gated**, so over plain `http://` on a LAN/staging host the operator's Save renders *"crypto.randomUUID is not a function"*. ⭐ The repo already has the guard pattern (`SurveyEditor.tsx:54`, `GroundInspectionPage.tsx:201` via `globalThis.crypto`); this hook follows neither. [DriveTargetPage.tsx:84; hooks.ts:583; client.ts:293-320]
- [x] [Review][Patch] **A 409 leaves the page permanently failing.** `useSetDriveTarget` has `onSuccess` only — ⛔ no `onError` invalidation. After a version conflict the page still holds the stale version, so **every** subsequent submit re-sends it and 409s again, forever. ⚠ The copy honestly says *"Reload to see the current target"*, so the operator is not stranded — but the page declines a trivially available recovery (`invalidateQueries`) on the one error whose entire purpose is to be recoverable. [hooks.ts:163-178; DriveTargetPage.tsx:611]
- [x] [Review][Patch] **Patch (e)'s `reset()` DROPS a pending save's success callback.** Switching Pariwar (or navigating away) mid-flight fires `changeTarget.reset()`, which — verified in the installed `query-core` `mutationObserver.js:50-55` — calls `removeObserver`, so the per-call `onSuccess` (`setSavedTarget(true)`, the reset-token bump) ⛔ never runs. ⇒ the change to Pariwar A **commits**, the operator ⛔ never sees *"Saved"*, and the only evidence is the changed number. ⚠ Secondarily `reset()` flips `isPending` false immediately, so Pariwar B's Save is enabled while a write to A is still outstanding. ⭐ The cache write itself is correctly tenant-scoped (mutate-time options snapshot) — that half is clean. [DriveTargetPage.tsx:111-118,235-238]
- [x] [Review][Patch] **Three distinct 400 codes collapse to one amount-blaming message, and two of them the operator cannot act on.** `pariwar.drive_target_idempotency_key_invalid` (added in G2 for *"a proxy or SDK that appends rather than replaces"* — the key is machine-generated, there is ⛔ nothing for the operator to fix) and `pariwar.drive_target_effective_from_skew` (multi-node NTP skew) both render *"check that the **amount** is a whole number of rupees…"*. ⇒ the operator edits the amount, resubmits, it succeeds once clocks converge, and **learns a false lesson**. [DriveTargetPage.tsx:54]
- [x] [Review][Patch] **The 401 copy asserts two things that are false, and its instructed remedy destroys the operator's work.** 401 falls through to `unexpected`: *"Something went wrong **on the server** and the change **may not have been saved**"* — nothing went wrong, and it definitively was **not** saved. ⚠ The comment defends the fall-through (*"a session that expired mid-form IS resolved by reloading"*), but reloading errors the session query and `DriveTargetRoute` bounces to `/login`, taking the typed amount and rationale with it — after telling the operator the reload was a **check**. ⛔ The routing decision may stand; the **copy** cannot. [DriveTargetPage.tsx:118-121,466-469; i18n-en.ts:1031-1032]
- [x] [Review][Patch] **`reveal.loading` announces a question the page then declines to answer.** *"Checking whether you hold the reveal control…"* renders in a `role="status"`, then for a `pariwar_admin` — *the common case* — vanishes and is replaced by **nothing**. Raising the question and going silent is worse than never raising it: the operator now knows a reveal control exists and has ⛔ no statement about their relationship to it. ⚠ Also `!revealForbidden` in that condition is **dead** (`revealForbidden` requires `isError`, mutually exclusive with `isLoading`). [DriveTargetPage.tsx:646-650; i18n-en.ts:975]
- [x] [Review][Patch] **Leading zeros: the field shows one number and the request carries another.** `/^\d+$/.test('0500000')` passes, `Number()` submits `500000`, ⛔ no inline message, and the input still displays `0500000` — with ⛔ no normalization back into the field. On the one form whose stated principle is *"IT OPENS ON THE TRUTH"*, the screen and the payload disagree at the moment of submission. [DriveTargetForm.tsx:94-95]
- [x] [Review][Patch] **The target read has ⛔ no retry affordance and its failure hides the entire form** — asymmetric with the reveal read, which was given a deliberate retry button *with a comment explaining why*. ⛔ No comment explains the asymmetry. ⚠ Also the retry button itself has **no in-flight state**: `refetch()` leaves `status === 'error'`, so the button stays enabled and unchanged for the whole round trip and the operator can queue repeats. [DriveTargetPage.tsx:545-550,602,264-280; hooks.ts:133-138]

**⛔ Accessibility — family 13(d), the un-mechanized family**

- [x] [Review][Patch] ⭐⭐ **`aria-invalid` and `aria-describedby` are absent from EVERY control — a divergence from this console's OWN convention.** `AcknowledgeForm.tsx:51-52` uses both; `aria-invalid` also appears in `AddPariwarForm` (×6), `LoginPage` (×2), `DraftForm`, `MemberLookupForm`, `ReasonCodeDropdown`. The drive-target forms use **neither**. ⇒ a screen-reader user who returns focus to a field after the `role="alert"` has fired hears only *"Target amount (₹), edit text"* — ⛔ no indication it is invalid, ⛔ no route to the message, ⛔ no access to the hint. ⚠ **AC4's `orderInvalid` is the sharpest instance:** a state the AC **ratifies as reachable** and a test **pins**, where ⛔ neither checkbox the operator must change to clear it is marked or described. ⚠ Because the amount field is `type="text"` (correctly, per check (b)), the real bounds exist for AT **nowhere** — they live only in an orphaned hint. **Fix:** `aria-invalid` on both inputs, both textareas and both checkboxes when invalid; `aria-describedby` pointing at each control's hint id and, when present, its error id — the `AcknowledgeForm.tsx:51-52` pattern already in this app. [DriveTargetForm.tsx:325-361; RevealSwitchesForm.tsx:818-841]
- [x] [Review][Patch] **The blank form disables Save and explains NOTHING — a reachable state whose only representation is a `disabled` prop** (check (d) in its purest form). With a blank rationale the button is `disabled` and ⛔ no error renders: react-hook-form's `required` only materialises after a submit attempt, which the disabled button **prevents**. A sighted user infers it from the empty textarea; in the accessibility tree there is a disabled button (skipped entirely by some AT browse modes) and ⛔ nothing else. **Fix:** `aria-disabled` + a live-region reason, or leave the button enabled and surface the errors on submit. [DriveTargetForm.tsx:334-338,364-372]
- [x] [Review][Patch] **Every hint is orphaned from its control** — `amountHint` (the only place the `> 0` / ceiling bounds exist for AT), `rationaleHint` (*"Recorded permanently against your name"*), `orderHint` (`member ≥ public`), and **`noConsumerNote`** — the governance-loaded honesty note the story calls *"⛔ not optional"*. All are sibling `<p>`s with ⛔ no `aria-describedby` from any control. ⇒ a screen-reader user who tabs straight to the checkboxes and submits ⛔ never encounters the disclosure the story treats as load-bearing. [DriveTargetForm.tsx; RevealSwitchesForm.tsx]
- [x] [Review][Patch] **`resolveEn` falls back to the raw key (`EN[key] ?? key`), and `t()` feeds seven `aria-label`s.** A typo'd key becomes a literal accessible name — *"driveTarget.reveal.heading"* announced to a screen reader — with ⛔ no console warning and ⛔ no test that would catch it. ⚠ Also `driveTarget.error.heading` is **defined and never used** (the inventory is otherwise exactly complete in both directions). **Fix:** warn (or throw in dev) on a missing key; delete the orphan. [i18n-en.ts:1013,1035-1037]

**⛔ Tests that do not test what they claim**

- [x] [Review][Patch] ⭐⭐ **THE 403 GUARD TEST ASSERTS A TESTID THAT CANNOT RENDER** (two layers, mutation-walked). It queries `drive-target-reveal-error` — the **submit** error **inside** the section that is absent, so it can ⛔ never exist in this scenario whatever the page does — and `drive-target-status-error`. The element that would actually appear is **`drive-target-reveal-load-error`**, ⛔ never queried. ⇒ delete the `&& !revealForbidden` discriminator that Pass-1 patch (c) introduced, and **all 16 tests still pass** while every Pariwar Admin sees *"The reveal controls could not be loaded"*. ⭐ The shipped code is CORRECT — this is coverage vacuity, the same shape as G1's vacuous concurrency spec and G2's dangling anchor. [tests/drive-target-page.test.tsx:142]
- [x] [Review][Patch] **Two tests assert `not.toHaveBeenCalled()` without ever attempting a submit** — tautologies, since nothing in either test could have called the client. They verify only `disabled === true`, which their own comments call *"a COURTESY, ⛔ not the guard"*. ⇒ delete both early-return guards that Pass-1 patch (d) added — each with a paragraph explaining why they are necessary — and both tests **still pass**. **Fix:** `userEvent.type(field, '{Enter}')`, then assert. [tests/drive-target-page.test.tsx:1297-1311,1390-1399]
- [x] [Review][Patch] **Pass-1 patch (e) is entirely un-attested and so are four other review-added behaviours.** ⛔ No test renders a second `pariwarId`, so neither the stale-error leak the patch fixes nor the `key={pariwarId}` remount beside it is proven — delete the whole effect and the suite stays green. Also untested: `resetToken` clearing the rationale after a save (*the documented reason the prop exists*); the retry button actually calling `refetch()` (only its existence is asserted); either "Saved" banner ever appearing; and `expectedVersion` being re-read after a background refetch. [tests/drive-target-page.test.tsx]
- [x] [Review][Patch] **Four of the seven `errorMessage` branches have ⛔ zero coverage** — 400 (`error.invalid`), 422 (`error.visibilityInvalid`), the non-`ApiError` branch, and `error.forbidden` **as a mutation** result. ⛔ No test asserts the form is ABSENT when `target.isError`. ⛔ No test covers the reveal form's blank rationale or its Save `disabled` conditions at all. ⛔ No test covers the paused/offline cell on either query or mutation. [tests/drive-target-page.test.tsx]
- [x] [Review][Patch] **`'5,00,000'` is asserted literally and depends on the Node ICU build.** `Intl.NumberFormat('en-IN')` yields Indian grouping only with full ICU; on a small-icu Node it silently formats `500,000` and this test fails for a reason unrelated to the component. ⭐ To its credit it hardcodes rather than recomputing with the component's own logic — that part is right. **Fix:** pin the ICU expectation or assert through the same formatter. [tests/drive-target-page.test.tsx:1250-1252]

**⛔ Prose that outlives what it describes**

- [x] [Review][Patch] **`retry: false`'s doc-block justifies preventing a behaviour the app NEVER HAD.** It says *"⛔ Do NOT add `retry`: retrying a ruled 403 three times would delay the page for every Pariwar Admin"* — but `createQueryClient` sets `retry: false` **app-wide** (`hooks.ts:34`). There was never a three-retry behaviour; the per-query flag is redundant and its stated justification is **counterfactual**. ⭐ The conclusion drawn from it (⛔ no auto-recovery ⇒ the retry button is owed) remains true, for a different reason. [hooks.ts:114-115,141-144]
- [x] [Review][Patch] **The ceiling now has a FOURTH and FIFTH copy, both in `apps/admin`** — `MAX_TARGET = 100_000_000` in `DriveTargetForm.tsx:32`, and a prose restatement in `driveTarget.form.amountInvalid` (*"…between 1 and 100000000"*, unformatted on a page that otherwise uses Indian grouping, so the operator must count digits). G1 mechanized the DB↔domain leg; G2 mechanized the contracts leg, explicitly calling the prose-only "LOCKSTEP" comment *"exactly the discipline that mechanization replaced"*. ⚠ This is the same class one layer further out, and **un-noted**. On drift the console silently refuses values the server accepts. **Fix:** a test asserting the admin constant equals the contracts bound (admin already depends on `@twt/contracts`), and derive the copy from the constant. [DriveTargetForm.tsx:32; i18n-en.ts]
- [x] [Review][Patch] **Provenance timestamps carry no timezone.** `toLocaleString()` renders in the viewer's locale and zone with ⛔ no offset shown, on a screen whose stated purpose is provenance (*"In force since"*, *"Last changed"*). Two operators in different zones read the same audit record as different times and ⛔ neither can tell. ⭐ The `NaN` guard falling back to the raw ISO string is correct and stays. [DriveTargetPage.tsx:479-482]
- [x] [Review][Patch] **Minor, bundled:** `savedTarget` persists across later edits (*"Saved. This is now the target of record"* sits beside an unsaved edit); **triplicated accessible names** (`<section aria-label="Change the target">` → `<h2>` → `<form aria-label="Change the target">` — three nested named landmarks, one name); the reveal load-error section has an `aria-label` but ⛔ no heading, unlike every sibling; `showReveal && visibility.data` is redundant; `error.forbidden` is rendered as the **target** form's submit error where half its body is about the reveal key the operator was not using; and `DriveTargetRoute`'s `if (!pariwarId)` branch is **dead** for the registered route (`useParams` always yields a segment). [DriveTargetPage.tsx; DriveTargetRoute.tsx:34,43-44]

**✅ VERIFICATION (2026-09-06, Pass 2 / G3) — `pnpm ci:local`: **34/34 JOBS GREEN**.**
`@twt/admin` drive-target suite **20/20** (was 16, **+4**: the tenant switch, the retry button
actually refetching, the "Saved" banner with the rationale cleared, and `expectedVersion` pinned to
the SEEDED version through a mid-edit refetch). All four packages typecheck + lint clean.

⭐⭐ **THE HEADLINE FIX IS MUTATION-PROVEN, ⛔ NOT ASSERTED.** Deleting `&& !revealForbidden` — the
exact change that previously left **all 16 tests green** — now fails the suite at the new assertion
(`expected <p role="alert"> to be null`). Lock restored; 20/20. ⭐ Third mutation-verified fix of this
review, and the third unreviewed Pass-1 patch whose guard could ⛔ not fail.

⚠⛔ **TWO FALSE STARTS, BOTH MINE, BOTH RECORDED:**
1. **I introduced a bug and the tests caught it.** Threading `seededVersion` through the form meant it
   was **spread into the request body** — which the `.strict()` wire contract would have rejected as a
   **400**. Three tests failed on the call shape; it is destructured out now. ⭐ Exactly the class of
   defect the deep-equality `toHaveBeenCalledWith` assertions exist to catch, catching it.
2. **`aria-disabled` had a consequence I had to chase.** Making the buttons clickable meant a
   blank-form submit surfaced the rationale error but stayed **SILENT about the amount**, since that
   message is suppressed while the field is empty. ⇒ added `submitAttempted` so a blank form now
   explains **both** problems, ⛔ not one.

⚠⛔ **AND THE FULL GATE CAUGHT WHAT THE SCOPED RUNS COULD NOT — for the THIRD time in this review.**
`@twt/admin` lint + typecheck were clean and the suite was 20/20, but `ci:local` came back **33/34**
with **`microcopy` RED on three findings, ALL IN COPY AND COMMENTS I HAD JUST WRITTEN**: two used
*"report"*, which the vocabulary rule reserves for **Sahyog Vivran**, and one code comment
(*"so the operator does not count digits"*) tripped a **tone** rule barring compare-to-target framing.
⭐ Fixed by **REWORDING**, ⛔ not by adding allow-list entries — the discipline this story already
applied when the 10.30 terminology gate caught it during Tasks 1–5. Re-run: **34/34**.

### Deferred — 1

- [x] [Review][Defer] **`DriveTargetRoute` does ⛔ not shape-check `pariwarId`**, so a truncated/typo'd segment (`/p/1111-1111/drive-target`) matches the route, is `encodeURIComponent`'d into the URL and fails server-side ⇒ a 400 rendered as the amount-shaped copy, or a 404 rendered as the contradictory pair above. ⚠ Also `if (session.isLoading)` shares the paused-cell hole: an offline session query has `isLoading === false` and `isError === false`, so the route falls through and mounts the page, firing both API calls. [apps/admin/src/routes/DriveTargetRoute.tsx:34,41,43-44] — deferred, **already carried from Pass 1** on the ground that the route *mirrors `NomineeBankMaskingRoute` EXACTLY* by design, so a UUID guard here would diverge from the followed precedent. ⭐ Pass 2 adds that the consequence is worse than Pass 1 recorded (⛔ not merely wrong copy — one branch is dead and another mounts while offline), and that the fix belongs to **all** the `/p/$pariwarId/…` admin routes together. **Trigger:** a shared fix across those routes.

### Dismissed as noise (1)

- **The reveal switches carry no optimistic-concurrency token** — raised **again**, by two of three G3 layers. That is the **FIFTH** independent raise across three chunks and two passes. ⛔ **RULED** by decision **D-A** (BigDev, 2026-09-06): `2026-09-06-203` cl.5 ratifies last-write-wins for the reveal record, matching the two sibling `super_admin`-only disclosure controls. ⭐ G1 added a test pinning the posture for exactly this reason. ⚠ That the console layer re-raises it independently of the domain layer is worth noting at the retro — five raises means the *absence* reads as an oversight to every fresh reader, and the pin lives in the domain suite where a console reviewer will not meet it.

---

## Review Findings — PASS 3 (2026-09-06): full-diff re-review

⚠⛔ **⛔ This does NOT supersede the Pass-1 or Pass-2 sections above; it stands ALONGSIDE them**
([[feedback_supersede_never_reinterpret]]). Run **after** the story reached `done` (Pass 2 complete),
over the whole branch diff (`dd233293..HEAD`, 51 files / ~10.8k lines) in a **single pass** — three
adversarial layers (Blind Hunter, Edge Case Hunter, Acceptance Auditor + the AI-6-5 load-bearing
lens), no chunking. Every finding below was verified at source and cross-checked against the Pass-1 /
Pass-2 record and `deferred-work.md` before triage.

⭐ **The Acceptance Auditor found no AC / decision / trap / PREFLIGHT violation** — AC0–AC8, D1/D2,
Traps 1–5, and STOP 1–3 all hold; the two Low items it noted (AC6's literal wording vs the key-gated
admin contract; the audit line not being in the mutation's tx) are **already reconciled / routed** in
the Pass-2 record and are not re-raised here. ⛔ **No Critical / High.** The residue is a defect
*introduced by the Pass-2 D-C fix*, two console state-machine gaps, and one input-validation gap.

### ✅ Decision — 1, RESOLVED by BigDev 2026-09-06 → **option (2), the minimal fix** (⇒ becomes a patch)

- [x] [Review][Patch] ⭐⭐ **A version-conflict 409 is UNRECOVERABLE while the form stays dirty —
  a defect in the Pass-2 D-C fix, on the exact path `-201` exists for.** `DriveTargetForm.tsx`'s
  `[currentTargetInr, currentVersion]` effect refreshes `seededVersionRef.current` **only when
  `!isDirty`**; when the form is dirty it sets `changedUnderEdit` and `return`s. After a concurrent
  change lands mid-edit (the common case — you are slow *because* you are typing), `useSetDriveTarget`'s
  `onError` invalidates and refetches `currentVersion` → `N+1`, but the effect early-returns, so
  `seededVersionRef` stays `N`. Neither path that advances the ref can then fire: the `[resetToken]`
  effect needs a *successful* save (impossible — every submit sends `expectedVersion: N` and 409s), and
  the `[currentTargetInr, currentVersion]` effect needs its deps to change *again* while the form is
  clean. ⇒ the operator is **409-locked until they reload the page**, with a "changed under edit"
  banner that gives no such instruction. ⚠ `hooks.ts:619-621`'s comment claims the `onError`
  invalidation fixes *"the page held the stale version forever: every later submit re-sent it and 409'd
  again"* — it fixes that **only for a clean form**; the dirty case (BH6's variant: revert edits →
  form clean but deps unchanged → `seededVersionRef` stranded at `N` → re-entering the current value
  yields a **spurious** 409, the false-conflict class `-201` cl.2 exists to prevent) still holds.
  ⭐ **RULED (BigDev, 2026-09-06): option (2) — the MINIMAL fix. D-C is UNCHANGED.** The dirty
  409-lock stays as documented friction (an operator with unsaved edits must clear them or reload —
  the *"submit anyway earns an honest 409"* half of D-C stands). What is fixed is the **clean-form
  path**: when the form returns to a clean state (`!isDirty`) after `changedUnderEdit`, re-sync
  `seededVersionRef.current = currentVersion`, clear `changedUnderEdit`, and `reset()` — closing
  BH6's spurious-409 path (an unambiguous bug: a clean form must never carry a stale version token).
  ⚠ ⛔ Do **not** add an "adopt latest, keep my text" affordance (option 1) — that advances the token
  across a live edit, which *is* the D-C amendment BigDev declined. Sources: edge + blind.
  [`apps/admin/src/modules/drive-target/DriveTargetForm.tsx:120-137`; `apps/admin/src/api/hooks.ts:615-624`]

### Patches — 3 (+ the resolved Decision above = 4), ✅ **ALL APPLIED** (2026-09-06)

> **Verification.** `@twt/admin` + `@twt/api` typecheck + lint clean; `apps/admin/tests/drive-target-page.test.tsx`
> **20/20**; `apps/api/tests/integration/drive-target/admin.spec.ts` **35/35** (against `twt-test-pg`
> :5433); the full `@twt/admin` suite **426/426**. `pnpm ci:local` result recorded in the Change Log.
> ⛔ No new tests were added for these four — pinning them is left as follow-up (P1's clean-form
> re-sync and P3's `onEdit` clear are the two that most warrant a regression test).

- [x] [Review][Patch] **The reveal section renders a self-contradicting UI on a mid-session 403.**
  `DriveTargetPage.tsx:198` — `const showReveal = visibility.data !== undefined;`. A `super_admin`
  who loaded the switches, then hits a **403 on a refetch** (grant revoked mid-session, or any 403
  blip; `refetchOnMount: 'always'` + `staleTime: 0` make refetches routine), keeps the
  last-successful `data`, so `revealForbidden` **and** `showReveal` are both true ⇒ the page renders
  *"you don't hold the reveal control"* (line 392) **and** the full editable `RevealSwitchesForm`
  with stale values (line 435) at the same time. ⚠ The Pass-2 *"a failed refetch retains data"*
  handling (`revealStale = revealLoadError && showReveal`) has a hole exactly here — `revealLoadError`
  **excludes** `revealForbidden`, so a 403 refetch gets no "stale" warning either. **Fix:**
  `const showReveal = visibility.data !== undefined && !revealForbidden && !revealNotYours;` (mirrors
  how `revealLoadError` already excludes those). Source: edge. [`apps/admin/src/modules/drive-target/DriveTargetPage.tsx:197-201,392,435`]
- [x] [Review][Patch] ⚠ **"Saved. This is now the target of record" still sits beside a fresh unsaved
  edit — the Pass-2 / G3 patch for this was cosmetic.** Pass 2 G3 listed *"`savedTarget` persists
  across later edits"* in a bundled patch marked applied; the "fix" was adding `targetResetToken > 0`
  to the guard + the comment *"Cleared by the reset-token bump on the next edit"*. But
  `setTargetResetToken` is called **only in `onSuccess`** — never on edit — so after the first save
  `savedTarget` is `true` (until a tenant switch) and `targetResetToken` is `1` (`> 0`) permanently;
  typing a new value sets neither `isPending` nor `error`, so the banner keeps asserting *"Saved. This
  is now the target of record"* above the unsaved change. `savedReveal` (`:483`) is looser still — no
  `resetToken` guard at all. **Fix:** plumb an `onEdit` / `onDirty` callback from `DriveTargetForm` /
  `RevealSwitchesForm` that clears `savedTarget` / `savedReveal` on the first change after seed, and
  correct the stale comment. Source: blind. [`apps/admin/src/modules/drive-target/DriveTargetPage.tsx:352-358,483-487`]
- [x] [Review][Patch] **An oversized / control-char `Idempotency-Key` bypasses the 400 validation and
  reaches an opaque 500.** `handlers.ts:206-226` rejects a repeated header (array) and a
  blank/whitespace key, then builds `idemKey = ${namespace}:${headerKey.trim()}` with no length or
  charset check. `idempotency_keys.key` is an **unbounded `text` PRIMARY KEY**; a value past the btree
  index-row limit (≈ 2704 bytes — reachable within Fastify's default header budget) fails the
  `claim()` INSERT with `54000`, which is **not in the error-mapping registry** ⇒ opaque 500,
  contradicting this module's stated *"a PRESENT-BUT-UNUSABLE KEY IS A 400"*. **Fix:** add a length
  cap (say ≤ 255) — and optionally a `^[\x21-\x7E]+$` check — in the same block, reusing
  `pariwar.drive_target_idempotency_key_invalid`. Source: edge. [`apps/api/src/modules/drive-target/handlers.ts:206-226`]

### Deferred — 1

- [x] [Review][Defer] **`withIdempotency`'s `release()` on a *post-`run()`* failure turns the
  server's own 503 "retry with the same Idempotency-Key" advice into a re-execute, adding a second
  governance audit line.** `handlers.ts:246-255` — the `try` wraps both `run()` and `recordResult()`;
  the `catch` calls `idempotencyStore.release(idemKey)` on **any** failure. If `run()` succeeds (audit
  line committed on `deps.servicePool`, schedule row on the scope tx) but `recordResult()` then throws
  (the diff maps that to **503**), the handler rethrows → the scope tx rolls back (row gone) →
  `withCompensatingAudit` already returned success (no compensating line) → **orphan audit line**; and
  because the key was released, the sanctioned same-key retry **re-executes** rather than replays →
  a **second** audit line. The docblock's *"the replay is a read of the recorded response, so the
  worst case is … noisy, ⛔ not corrupting"* reasoning **assumes `recordResult` succeeded** and does
  not cover this branch. ⇒ **augments** the existing `deferred-work.md` entry on the
  compensating-audit / idempotency / scope-tx seam — **already routed to the Epic 11b retro** by
  ruling (Pass 2 / G2), and the `release()`-vs-leave-`claimed` choice (leave claimed ⇒ a legit retry
  is `409 idempotency_in_progress`-locked until the TTL self-heals) is part of that same question, not
  a fresh one. Sources: blind + edge. [`apps/api/src/modules/drive-target/handlers.ts:246-256`]

### Dismissed as noise (5)

- **Clock-skew clamp collapses the prior version's window to zero width; the 5-min bound is generous
  vs real NTP drift** (blind + edge) — **ruled D-B** (BigDev, Pass 2 / G1); the in-band residue is
  explicitly recorded as an open residue in the Pass-2 / G2 self-correction (c). The "bound could be
  tighter" observation is noted there already; no new action.
- **First-write future `effectiveFrom` wedges the domain schedule** (edge) — **domain-surface only**
  (HTTP passes `deps.clock()`, the contract has no such field); already recorded per **D-B option 3**
  as an un-attested gap in `drive-target.ts` / `errors.ts`, and carried in `deferred-work.md`
  (*"A reveal can be configured for a Pariwar that has no target"* / the D-B residue).
- **The reveal setter has no optimistic-concurrency token** (blind + edge) — **RULED D-A**, now the
  **sixth** raise; pinned by a G1 test.
- **OpenAPI `driveTargetParams` is non-`.strict()` while the route param object is `.strict()`**
  (blind) — inert for a URL path parameter (no extra keys are expressible); the reporter concedes it
  is harmless.
- **AC6's literal *"no wire contract carries the target or either flag"* is not literally true**
  (auditor) — already reconciled in the Pass-2 record (correction #3: *"no **public or member**
  surface or contract"*); the key-gated admin contract necessarily carries `targetInr` because AC5
  requires the operator to see it.

**Layers:** all three completed; no layer failed or returned empty.
