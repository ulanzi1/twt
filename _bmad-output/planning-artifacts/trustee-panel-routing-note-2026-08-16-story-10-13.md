# Trustee Panel Routing Note — Story 10.13, Fixed-Amount Setter Admin UI

**Status:** ⏳ **Open** — five questions, awaiting ruling. **Q1, Q2 and Q3 are ⛔ BLOCKING**; Q4 and Q5
are answerable but each carries a stated non-answer consequence.
**Author:** BigDev (Solo Builder)
**Raised:** 2026-08-16, against
`_bmad-output/implementation-artifacts/10-13-fixed-amount-setter-admin-ui.md`
at its baseline `main` @ `9fb88c3` (clean, fetched, `== origin/main`). **No code has been written.**
The story is `in-progress` at its governance half and stops at **Task 2** until this note is ruled.
**Story state:** 10.13 is `in-progress` (governance half only). Its dependencies 7.5, 1.8, 1.9, 6.12,
6.14, 10.11 and 10.18 are all `done`. Decision `2026-08-16-122` is the head of `.decision-log.md`,
which carries **123** numbered entries (verified live: `grep -c '^### Decision ' .decision-log.md` →
124, of which one is the `YYYY-MM-DD-NNN` template heading at `:7102`).
**Disposition on ruling:** a single `.decision-log.md` entry, numbered **`2026-08-16-123`** from the
current head `2026-08-16-122` — *(if the ruling lands on a later date the entry takes that date and
the `-123` sequence holds only while `-122` remains the head; the note carries **one** identity for
the ruling either way)*. Per Decision `2026-08-09-095` the entry must **label per-clause provenance** —
which clauses are Panel rulings (`[Trustee-ratified]`), which are defaults taken (`[Author-committed]`),
and which are author findings.
⚠ **If — and only if — the ruling amends Niyamavali §4.2**, the amended text must be reproduced
**verbatim in BOTH locales** inside that entry: `docs/legal/` is gitignored (`.gitignore:68`, verified
live: `git check-ignore -v docs/legal/niyamavali.md` → `docs/legal/`), so the entry is the **only**
durable copy. §4.2 is `niyamavali.md:101-104` / `niyamavali.hi.md:99-102`.

> ⚠ **Every recommendation in this note is NON-BINDING.** Each ⭐ is a suggestion the Panel may reject,
> not a default the Panel is assumed to accept by silence. Where silence *does* carry a consequence,
> that consequence is stated per question and again in *"What non-answer would mean"*.

> ⚠ **Nothing in this note re-interprets a ratified instrument** ([[feedback_supersede_never_reinterpret]]).
> Deed Clause 10(b) and Niyamavali §4.2 mean what they say. This note asks whether the **code** is
> brought to them, or whether the divergence is **recorded** as deliberate. Both are legitimate
> answers; only silence is not.

---

## Why this note exists

**The emergency attesting panel has no authorization in it, and the record it writes is immutable.**

Story 7.5 shipped a complete, correct, well-tested fixed-amount schedule: an effective-dated,
append-only, per-Pariwar window table with at most one open head, a standard write path behind a
365-day DB-authoritative notice floor, and an emergency write path that bypasses that floor in
exchange for a **recorded State-Trustee attesting panel** written into an immutable Emergency
Adjustment Record. Everything about that design is sound. One thing in it was left unanswerable:
**who may sit on that panel.**

Traced end to end, verified live at `9fb88c3`:

```
FixedAmountPage.tsx:247-257   textarea, comma/newline-separated raw UUIDs
        ↓
contracts/pools/fixed-amount.ts:107-125
                              z.array(z.string().uuid()).min(2).max(20) + a no-duplicates refine
        ↓                     ← SHAPE only; says nothing about WHO
apps/api/.../handlers.ts:250-269
                              for each id: getDisplayName(deps.pool, actorId)
        ↓                     ← note `deps.pool`, NOT the scope tx: the UNSCOPED global pool
admin-auth.repo.ts:186-193    SELECT display_name FROM users WHERE id = $1
                              ← `users` is GLOBAL (schema/users.ts:1-15, "GLOBAL, NOT pariwar-scoped").
                                No tenant predicate. No role predicate. No grant predicate.
        ↓
domain/pool/fixed-amount.ts:393-401
                              non-empty · >= 2 · no duplicates      ← ARITHMETIC only
        ↓
pool_fixed_amount_emergency_attestations   ← immutable, append-only, forever
```

**Every box is correct in isolation. The composition has no authorization in it.** Any actor id that
resolves to a non-blank `display_name` anywhere in the global `users` table — an admin of a completely
different Pariwar, an `auditor`, a `field_worker` — can today be written onto **this** Pariwar's
immutable Emergency Adjustment Record as an attesting State-Trustee.

**And the governing instruments already answer "who may fix the amount", and the code does not match
them.** Verified live:

| Instrument | Line | What it says |
|---|---|---|
| Trust Deed **Clause 10(b)** | `trust-deed.md:147` | *"a fixed per-Pool amount determined by the **Board** (which the Board may fix for stated periods of not less than twelve months)"* |
| Trust Deed **Clause 20(c)** | `trust-deed.md:241` | *"open Pools, **fix per-Pool amounts**, and cause collection and disbursement of Pool monies as facilitator"* |
| Trust Deed **Clause 20(a)** | `trust-deed.md:237` | the power to amend the *Niyamavali* *"including … the fixed per-Pool contribution amount and the periods for which it is fixed"* |
| Trust Deed, definitions | `trust-deed.md:75` | *"**Board**" / "Board of Trustees" means the trustees of the Trust for the time being collectively* |
| Niyamavali **§4.2** | `niyamavali.md:102` (hi `:100`) | *"set by the **Board** for stated periods of **not less than 12 months**"* |

The shipped route gates on `pool.fixed_amount_set` / `pool.fixed_amount_emergency`, and both keys are
held by **`pariwar_admin` alone** (`roles.ts:317-325`), plus `super_admin` by catalog derivation
(`roles.ts:244-250`). **A `pariwar_admin` is not the Board.**

This is the same defect shape Story 10.18 existed to end — *"Before this role existed there was no way
to distinguish a Panel act from a `pariwar_admin` act, and every exclusivity `.decision-log.md` asserts
was enforced by convention alone"* (`roles.ts:601-605`). That sentence describes the fixed-amount
setter today, one epic later.

⚠ **But 10.18 does not carry over by itself.** Niyamavali §8.7 constitutes the Trustee Panel as *"the
Board of Trustees acting in a **moderation capacity**"* (`niyamavali.md:266`). **Amount-fixing is a
different capacity.** A `trustee_panel` grant here is therefore a Panel decision, never an author
default — which is Q1.

---

## Four findings the Panel should see before ruling anything

### F-1 ⭐ THE SHARP ONE — the emergency control does not constrain the threat it was designed for

`architecture.md:1324`, the threat model, verified live:

| Threat actor | Attack | Control |
|---|---|---|
| **Hostile trustee** — *"Pariwar Admin / State Trustee"* | *"Niyamavali manipulation; **fixed-amount change**; rule registry tampering"* | *"Versioned amendments with public diff (FR-79); audit log of every rule change; **cooling-off period via 12-month notice (FR-15)**"* |

The emergency path exists precisely to **bypass** that cooling-off window. Its substitute control is
FR-15's *"explicitly-flagged emergency adjustments which require **multi-trustee approval**"*
(`prd.md:469`) — the attesting panel.

Now compose that with the capability model. Under Q2 option (a) — *"an eligible attestor is an actor
holding `pool.fixed_amount_emergency` at this Pariwar"* — the eligible set **today** is exactly:

> `{ holders of pariwar_admin at this Pariwar }` ∪ `{ holders of super_admin }`

⇒ **Two `pariwar_admin`s can attest each other's emergency override.** The population the threat model
names as the hostile actor and the population that checks it are **the same population**. The control
is real in form and vacuous in substance, and no amount of eligibility enforcement inside 10.13 changes
that — **only Q1 does.**

⚠ Stated as an author finding, not as an argument for a particular ruling. Granting `trustee_panel` the
keys does not by itself separate the populations either, unless a Pariwar's `trustee_panel` and
`pariwar_admin` grants are held by different people. **That is an operational fact about grant
issuance, not a code invariant, and this story cannot make it one.** What Q1 *can* do is make the two
capacities **distinguishable** — which is the whole of what 10.18 achieved and the whole of what it
claimed.

### F-2 — "State-Trustee panel" is a misnomer at every layer, and it is not fixable by a grant

The string *"State-Trustee"* appears in the domain doc comment, the contracts DTO comment
(`contracts/src/pools/fixed-amount.ts:31`, `:114`), two HTTP error messages (`handlers.ts:68`, `:74`) and the
admin page's own label (*"Attesting panel — State-Trustee actor IDs"*, `FixedAmountPage.tsx:249`).

Verified live, a literal State Trustee is **ineligible by arithmetic**:

- `state_trustee`'s bundle is `[claim.approve, member.suspend, member.view_validity,
  niyamavali.review, tc.approve]` with `scopeCeiling: 'state'` (`roles.ts:374-381`). It holds
  **neither** fixed-amount key.
- Even if granted them, a `state`-ceiling grant can **never** satisfy a `pariwar`-dimension check.
  `scopeWithinCeiling` is a pure numeric compare over `CEILING_RANK` with **no resolver parameter**,
  and `scopeContains` denies independently before any resolver runs (`roles.ts:607-618`, the rank-order
  note; [[project_rbac_geo_scope_containment]]). ⛔ **This is rank order, not a missing resolver.**
  Story 1.18 could not lift it and nothing can.
- And §8.7 states expressly that the Trustee Panel *"is not the 'State Trustee panel' of Part 9"* — the
  Part 9 body is *"a geographic body voting by majority under **R9**"* (`niyamavali.md:270`), a
  **claim-adjudication office**, not an amount-fixing one.

⇒ The label is inherited from FR-15's *"multi-trustee approval"* prose and names a body that **cannot**
sit on this panel under any ruling. **Recorded as a sub-point of Q2 (Q2.2), not as a sixth question** —
it is a labelling consequence of whatever Q2 decides, not an independent governance choice.

⭐ **Non-binding:** re-label the **copy** (page label + error messages) to *"attesting panel"* / the
body the ruling actually names, and ⛔ **do not** rename the `panel` / `panel_actor_ids` column and
contract field — a wire break and an append-only-column rename for zero governance gain.

### F-3 — AUTHOR FINDING: an attestor is not an approver, and this story does not make one

⚠ **This is the finding most likely to be misread as fixed by a ruling here.** State it plainly so the
record cannot later claim more than was built.

The attesting panel is **data submitted by one actor**. Only the *submitting* actor is authenticated,
step-up gated and display-resolved (`handlers.ts:115-137`, `index.ts:99` — the `requireStepUp` preHandler). **Nothing anywhere proves
a listed attestor consented, saw the amount, or knows the record exists.** Eligibility enforcement — all
of AC3, the whole of this story's teeth — makes the roster **truthful about capability**. It does not
make it truthful about **assent**.

Real multi-party approval is the R9 voting lifecycle (a session, per-actor votes, quorum), and
`fixed-amount.ts:15-19` **forbids pulling it in**, deliberately, as Decision-recorded posture D3:
*"a recorded, attestable sign-off, not a vote."*

⇒ After this story, FR-15's *"require multi-trustee approval"* remains **partially** implemented: the
roster will be provably composed of capable actors at this Pariwar, and provably not of anyone else.
Whether that satisfies *"approval"* is a governance judgment, and it is **not** one of the five
questions — it is recorded here so the ruling entry can state it, and it carries a re-trigger in
`deferred-work.md` either way.

### F-4 — the cross-tenant hole closes by **construction** once the check moves onto the scope tx

The mechanism, so the Panel can see why the fix is small even though the gap is serious:
`role_grants` is a **scoped** RLS table (`policies/role-grants-rls.ts:32,49`;
`role_grants_tenant_isolation_select`), and `openScopeTx` runs the request as `twt_app` with
`SET LOCAL app.pariwar_id` (`scope-tx.ts:34-55`). A grant held by an actor in a *different* Pariwar is
therefore **invisible** to a query on the scoped client — it folds to "no grants", which
`hasPermission` refuses. That is exactly how `assertPanelAuthorized` already behaves at its two shipped
call sites (`r9-voting-persist.ts:314-350`, `appeal-panel-persist.ts:247-274`).

The present hole exists because the one identity check in the emergency path runs on **`deps.pool`** —
the unscoped global pool — against the **global** `users` table, and never touches `role_grants` at
all. ⇒ The build is: *do what R9 already does, on the client the request already has.*

---

## The five questions

⚠ **Read Q1 and Q2 together.** They are one design in two parts: *who may **fix** the amount*, and
*who may **attest** an emergency bypass of the notice floor*. A ruling that answers them inconsistently
produces an instrument the capability model cannot express.

---

### Q1 — Does `trustee_panel` gain the fixed-amount keys, and does `pariwar_admin` retain them? ⛔ BLOCKING · *Feeds AC1, AC3, and Task 3*

**The question.** The Deed vests amount-fixing in the **Board** (Cl. 10(b), Cl. 20(c); §4.2 repeats it).
The code vests it in `pariwar_admin` alone. Does the `trustee_panel` role — constituted by §8.7,
ratified by Decision `2026-08-10-096`, and the system's only expression of "the Board acting as such" —
gain `pool.fixed_amount_set` and `pool.fixed_amount_emergency`? And if so, does `pariwar_admin`
**retain** them concurrently, or lose them?

| | Option | What it means |
|---|---|---|
| **(a)** ⭐ | **Grant both keys to `trustee_panel`; `pariwar_admin` RETAINS both** | The §8.7 *"concurrent, not exclusive"* posture (`niyamavali.md:268`), which is how 10.18 handled `member.moderate`. The two capacities become **distinguishable** in the audit record and in the eligible-attestor directory; nothing that works today stops working. Catalog `34 → 35`; ⛔ key count **stays 43**. |
| **(b)** | **Grant both to `trustee_panel`; `pariwar_admin` LOSES both** | Matches the Deed most literally — only the Board fixes the amount. ⚠ **Breaking**: every existing `pariwar_admin`-operated Pariwar loses the ability to set its fixed amount the moment this ships, with no migration path except issuing `trustee_panel` grants first. The `member.restore_terminated` precedent (10.19, exclusive to the Panel) exists, but that key was **minted** exclusive — it never took a capability away from a live holder. |
| **(c)** | **Grant `…_emergency` ONLY to `trustee_panel`; `…_set` stays with `pariwar_admin` (both retained on emergency? see note)** | Splits by risk: the *routine* 12-month-notice change stays operational; the *notice-bypassing* emergency becomes a Panel act. ⚠ Requires stating whether `pariwar_admin` retains `…_emergency` — if it does, this collapses toward (a) for the key that matters; if it does not, it is (b) scoped to one key. |
| **(d)** | **No grant. Record the divergence as deliberate.** | A legitimate closure: the Panel may hold that `pariwar_admin` **is** the Board's authorised delegate for this purpose under Cl. 10(a)'s *"the Board **or its authorised delegates**"*. ⚠ Cl. 10(a)'s delegate language governs **opening a Pool**; Cl. 10(b)'s amount-fixing sentence names the **Board** without a delegate clause. If the Panel rules (d), the entry should say which reading it adopts, because the marker closure (AC6) will quote it. |

⚠ **The cost of (a), stated plainly.** Concurrency means an emergency override remains performable by a
`pariwar_admin` acting alone as submitter, attested by other `pariwar_admin`s (F-1). (a) buys
**distinguishability**, not **separation**. It is the honest, incremental move; it is not a fix to F-1.

⚠ **The cost of (b) and (c), stated equally plainly.** Both are **live-capability removals**. There is
no seeded `trustee_panel` grant in any Pariwar today beyond what Stories 10.18/10.19/10.22 caused to be
issued operationally, and this story has **no** grant-migration in scope. Ruling (b) or (c)-exclusive
means the fixed-amount setter is **inoperable** in any Pariwar without a `trustee_panel` grant-holder,
from the moment it ships until grants are issued by hand. ⛔ If the Panel rules (b) or (c)-exclusive,
say so explicitly and the story will **add** a stated operational precondition to the release record;
it will not quietly ship a dark surface.

⛔ **Do NOT grant to `state_trustee` or `district_admin` under any option.** By F-2's rank ordering the
grant would be **inert on arrival** — the same trap `roles.ts:607-618` and Decision `2026-08-15-121`
already record twice.

⭐ **Recommend (a)** — grant both keys to `trustee_panel`, `pariwar_admin` retains both. It is the §8.7
concurrency posture, it is the 10.18/`member.moderate` precedent, it breaks nothing, and it is the
minimum that makes a Panel act distinguishable from an admin act at this surface. ⚠ Non-binding, and
⚠ **it does not close F-1** — the entry should say so.

---

### Q2 — Is an eligible attestor defined by the KEY, or asserted at attestation time? ⛔ BLOCKING · *Feeds AC2, AC3, AC6*

**Q2.1 — the predicate.** Is an eligible emergency attestor exactly *"an actor holding
`pool.fixed_amount_emergency` at this Pariwar (`dimension: 'pariwar'`)"*, resolved from `role_grants`
inside the request's scope transaction — or is panel membership **asserted by the submitting trustee at
attestation time**, with no directory read and no eligibility predicate?

| | Option | What it means |
|---|---|---|
| **(a)** ⭐ | **Key-as-credential** — the emergency key IS the panel-membership credential | The exact precedent already in the tree, twice: `claim.r9_vote` is *"ALSO the panel-membership eligibility credential — `assertPanelAuthorized` requires every panel actor to hold it"* (`roles.ts:113-114`), and `claim.appeal_vote` likewise (`roles.ts:313-316`). Build = a third `assertPanelAuthorized` + a directory read for the picker. Cross-tenant closes by construction (F-4). |
| **(b)** | **Asserted at attestation time** — no directory, no predicate | `epics.md:3827-3829` admits this in terms: *"either a real directory read **or a recorded decision that panel membership is asserted at attestation time**"*. ⚠ It is a **closure**, not a failure ([[feedback_closure_language_precision]]) — but it leaves the global-`users` hole exactly as it is today, and the marker must then say so in those words. |
| **(c)** | **Key-as-credential, plus a stricter predicate** | e.g. attestors must hold the key **and** be distinct from the submitting actor. ⚠ Costless to add (one comparison) and the Panel may want it — the submitter is already recorded separately as `attested_by_actor`, so a submitter who also lists themselves is double-counted toward the ≥2 floor today. **Verified live**: nothing prevents that. |

⚠ **The cost of (b), stated plainly.** Choosing (b) means the immutable Emergency Adjustment Record
continues to accept any global user id with a display name, including an admin of another tenant. If
the Panel rules (b), the entry should state whether that is **accepted** or whether a **narrower**
mechanical guard is wanted instead (e.g. "must be a user with any grant at this Pariwar"), because
"asserted at attestation time" and "unvalidated" are not the same claim.

⚠ **The cost of (a).** The eligible set is small and, today, is F-1's set. On a Pariwar with a single
`pariwar_admin` and no `trustee_panel` grants, the emergency path becomes **unusable** — one eligible
actor cannot form a panel of two. ⛔ That is a real operational consequence of ruling (a), and the
story will surface it as an **empty/insufficient directory** state in the UI rather than a mystery 4xx.

**Q2.2 — the label** (see F-2). Whatever Q2.1 rules, the surface currently calls the body a
*"State-Trustee panel"*, and a literal `state_trustee` is ineligible by arithmetic under every option.
⭐ **Non-binding:** re-label the **copy** to the body the ruling names; ⛔ do **not** rename the stored
`panel` column or the `panel_actor_ids` wire field.

⭐ **Recommend (a)**, with **(c)'s submitter-distinctness added** if the Panel wants the ≥2 floor to mean
two people other than the submitter. State which, because the two produce different tests.

---

### Q3 — Must the emergency path additionally check the Deed Clause 19(b) quorum? ⛔ BLOCKING · *Feeds AC1, AC6*

**The question.** Deed **Clause 19(b)** (`trust-deed.md:227`) sets Board quorum at *"**one-half of the
Trustees then in office, or two, whichever is higher**"*. `POOL_FIXED_AMOUNT_MIN_PANEL_SIZE = 2`
(`fixed-amount.ts:88`) is that formula's **lower** bound — it is `two`, never `one-half`. If the
emergency override is an act of the Board (Q1), must the panel size additionally satisfy the Deed
quorum?

| | Option | What it means |
|---|---|---|
| **(a)** ⭐ | **No** — and record **why** | The system has **no roster of "the Trustees then in office"** distinct from grant-holders. *"One-half"* is therefore **uncomputable** without inventing exactly the trustee directory `epics.md:3830` and `deferred-work.md:4468` forbid. Record `POOL_FIXED_AMOUNT_MIN_PANEL_SIZE` as **a floor that is NOT the Deed quorum**, and say so at the constant's own doc comment (AC6). |
| **(b)** | **Yes** — compute it | Requires a roster primitive: which grant-holders are "Trustees in office" at a given instant, with joiners/leavers over time. ⛔ That is the trustee-directory table this story's epic explicitly forbids, and it is a multi-story build. |
| **(c)** | **Approximate it** — quorum = ⌈half of current eligible-key holders⌉, min 2 | ⚠ **The dangerous option.** It would make a governance quorum a function of **grant issuance**, so revoking a grant *lowers* the quorum. It also silently redefines "Trustees then in office" as "current key holders", which the Deed does not say. Recorded so it is visibly rejected, not silently unconsidered. |

⛔ **The constant does not move under any option.** `epics.md:3830-3831` states it in terms — *"it is
the floor, not the directory"* — and `deferred-work.md:4468-4469` says the same thing in its own words:
*"`POOL_FIXED_AMOUNT_MIN_PANEL_SIZE = 2` stays as the mechanical floor; Story 1.18 changes no value."*
Story 1.18 changed no value here and neither does this story. A ruling of (b) or (c) would be a **successor story**, not an edit here.

⭐ **Recommend (a)** — with the *why* recorded at the constant, so the next reader does not re-raise
Clause 19(b) as an unnoticed gap.

---

### Q4 — Minimum notice is enforced; minimum DURATION is not. Defect, recorded divergence, or successor? · *Feeds AC7(b)*

**The question.** Deed Cl. 10(b) and §4.2 fix the amount *"for stated periods of **not less than twelve
months**"*. The code enforces minimum **notice** — `effective_from >= dbNow + 365d`, evaluated against
DB-authoritative `now()` (`fixed-amount.ts:127-143`, `:329-331`) — and **never** minimum **duration**.

**The reachable divergence, verified live.** `closeOpenHead` (`fixed-amount.ts:261-287`) closes the
prior open head at `max(newEffectiveFrom, openHead.effectiveFrom)`. Two *conforming* standard writes a
day apart therefore produce two entries whose windows are **one day** and **open-ended** respectively:
both passed the 365-day notice floor; neither was in force for twelve months. The emergency path makes
it sharper still — it has no floor at all.

| | Option | What it means |
|---|---|---|
| **(a)** ⭐ | **Named, minted successor story** | The fix changes the **write path** Story 7.5 owns (a duration predicate over the prior head), not the setter surface 10.13 owns. Minting it keeps the owner concrete. ⛔ A deferral naming an **epic** expires unowned ([[project_r7_fact_producer_unbuilt]]) — so it must name a story, with a re-trigger. |
| **(b)** | **Recorded divergence, deliberate** | The Panel may hold that *"for stated periods of not less than twelve months"* constrains the **Board's intent** at the time of fixing, not the system's ability to supersede an entry on new facts. ⚠ If so, say it — the sentence then becomes a recorded interpretation, and the marker quotes it. |
| **(c)** | **Defect — fix in 10.13** | ⛔ Not recommended. It changes 7.5's write model under a story scoped to the setter surface, and it needs its own tests over `closeOpenHead`'s window arithmetic. |

⭐ **Recommend (a)** — a named successor, recorded in `deferred-work.md` with a concrete re-trigger.

---

### Q5 — How far back may an emergency `effective_from` reach? And the record Story 7.5 says it wrote, which does not exist · *Feeds AC7(b)*

**The question, in two parts.**

**(i)** The emergency path's `effective_from` *"MAY be `<= now()`"* (`fixed-amount.ts:351`) with **no
lower bound of any kind**. How far back may it reach — a day, a cycle, a year, unbounded?

⚠ Why it matters concretely: pools snapshot the amount at cycle-freeze `committed_at`, so no schedule
write can reach an **already-spawned** pool — non-retroactivity is architectural (7.5's D5). But a
backdated emergency landing **between** a committed cycle-freeze and its **retried** spawn resolution
changes what that retry resolves. That is the replay-determinism question 7.5's own review raised.

**(ii)** ⛔ **AUTHOR FINDING.** Story 7.5's review record states that residual scope was *"logged to
deferred-work.md"* (`7-5-…-override.md:229`, verbatim: *"**Residual scope, logged to
deferred-work.md**: the deeper replay-non-determinism question … is a genuine policy question … flagged
for a future decision rather than silently resolved here"*). **Verified 2026-08-16: it is not there.**
The only Story 7.5 entry in `deferred-work.md` is the `documented_reason` PII one (`:1150-1152`).

⇒ The un-mechanized half decayed exactly as [[feedback_mechanization_split_commitment]] predicts: the
half that was a **code change** shipped; the half that was a **record** did not, and nothing caught it
for a month.

| | Option | What it means |
|---|---|---|
| **(a)** ⭐ | **Record the bound (or record that there is none, deliberately) AND write the missing entry** | Whichever way (i) goes, (ii) is discharged by writing the `deferred-work.md` entry 7.5 claimed to have written, with a re-trigger. |
| **(b)** | **Enforce a bound now** | e.g. "no earlier than the current open head's `effective_from`". ⚠ A write-path change (Q4's owner), not a setter change. |
| **(c)** | **Widen to an audit of 7.5's other logging claims** | ⚠ Offered because one false claim invites the question. Scoped **out** by default — say so if you want it in. |

⭐ **Recommend (a)**, scoped to *write the missing entry*, not *audit 7.5*. ⚠ Non-binding; (c) is a
one-line escalation if you want it.

---

## What non-answer would mean

| Q | Consequence of no answer |
|---|---|
| **Q1** ⛔ | Task 3 has no input and the eligible-attestor set has no definition beyond `pariwar_admin`. The AC6 marker cannot state an outcome. **The story stops.** |
| **Q2** ⛔ | AC2 and AC3 have no predicate — there is nothing to enforce and nothing to render. **The story stops.** |
| **Q3** ⛔ | `POOL_FIXED_AMOUNT_MIN_PANEL_SIZE`'s doc comment cannot carry the answer AC6 requires, and Clause 19(b) stays an unnoticed open question that the next reader re-raises. **The story stops.** |
| **Q4** | The divergence ships un-owned. ⚠ Not neutral: an un-owned divergence from a **ratified Deed clause** is the thing [[feedback_record_unattested_no_backfill]] says decays. |
| **Q5** | The bound stays unstated **and** 7.5's false logging claim stays uncorrected — a story file asserting a record that does not exist. |

**A blocked ruling stops the story at its governance half, recorded as such** — not worked around, not
partially built. Q1, Q2 and Q3 are the three that stop it.

---

## What this note does NOT ask, and what a ruling would NOT mean

**Not asked:**
- ⛔ **Any change to `POOL_FIXED_AMOUNT_MIN_PANEL_SIZE`.** `epics.md:3830`, `deferred-work.md:4468`.
  The constant does not move under any ruling on Q3.
- ⛔ **A `trustee_directory` table, registry or new primitive.** The eligibility predicate exists twice
  (`assertPanelAuthorized`) and the directory-read shape once (`resolveShepherdCandidates`). Compose
  them. [[feedback_no_premature_package]] — the third instance is where extraction becomes *arguable*,
  and *arguable* is not *now*.
- ⛔ **The R9 voting lifecycle.** `fixed-amount.ts:15-19` forbids it in terms (D3). No session, no
  quorum object, no per-vote encrypted rationale.
- ⛔ **A second announcement composer.** FR-55's announcement half is dispositioned in the story
  (AC7(a)), not routed here — Story 10.5's News/Blog console **is** that machinery.
- ⛔ **Whether the fixed amount itself should change.** This note is about *who*, never *how much*.

**A ruling would NOT mean:**
- ⚠ that FR-15's *"multi-trustee approval"* is enforced (F-3 — attestation is not assent);
- ⚠ that F-1 is closed (the hostile-trustee population and the attesting population may still coincide);
- ⚠ that Niyamavali §4.2 or Deed Cl. 10(b) have been re-read (they are applied, or the divergence is
  recorded — never reinterpreted).

---

## Ruling template

The Panel may rule by completing this table. Per Decision `2026-08-09-095`, the recorded entry must
carry **per-clause provenance** — `[Trustee-ratified]`, `[Author-committed]`, or author finding.

| Q | Ruling | Notes |
|---|---|---|
| **Q1** ⛔ | (a) / (b) / (c) / (d) | If (b) or (c): state that the surface is **inoperable** without `trustee_panel` grants, and that this story ships no grant migration |
| **Q2.1** ⛔ | (a) key-as-credential / (b) asserted at attestation / (c) key + submitter-distinct | If (b): is it **accepted as unvalidated**, or is a narrower mechanical guard wanted? |
| **Q2.2** | re-label copy: yes / no | ⛔ The stored column + wire field are **not** renamed either way |
| **Q3** ⛔ | (a) no, record why / (b) yes, compute / (c) approximate | ⛔ The constant does not move under any option |
| **Q4** | (a) named successor / (b) recorded divergence / (c) fix here | If (a): the successor is minted with a re-trigger |
| **Q5.1** | bound = ______ / no bound, deliberately | |
| **Q5.2** | write the missing 7.5 entry: yes | ⚠ and: widen to an audit of 7.5's other logging claims? yes / no |
| **F-1** | noted / route as a separate question | The control does not constrain the population it was designed for |
| **F-3** | noted / route as a separate question | Attestation ≠ assent; FR-55/FR-15 "approval" stays partial |

---

## Disposition

On ruling: **one** `.decision-log.md` entry, `2026-08-16-123`, per-clause provenance labelled, committed
under a `governance(10.13):` prefix **before** any implementation commit
([[feedback_governance_commits_precede_implementation]]). If the ruling amends §4.2, both locales
verbatim in that entry. This note's status line is then updated to `✅ RULED <date>` with the
superseded line retained, never overwritten.
