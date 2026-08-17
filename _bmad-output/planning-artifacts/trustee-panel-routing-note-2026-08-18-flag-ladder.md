# Trustee Panel Routing Note — The Flag Ladder: how "all Pariwars" is actually reached

**Status:** ✅ **RULED 2026-08-18.** **Q1(a), Q2 (three named rungs), Q3(a), Q4(a).** The ladder is
ruled **generally** across both Panel-owned flags; one Decision authorises the whole walk; the AC7
ladder is **not amended**. ⛔ **Q3's sub-question is NOT ANSWERED** (distinct from *not reached*) — the
F-5 reading stands as a **reading, not a ruling**. ⚠ **The attestation is UN-ATTESTED** — trustee
identities and ruling date were not supplied and are ⛔ not reconstructed. Recorded as Decision
`2026-08-18-128` (`.decision-log.md:37`). See *"The ruling as given"* at the foot; it is authoritative
where it differs from the option and recommendation text above, which is **retained, not edited**.
*(Superseded status line, retained: ⏳ Open — four questions, awaiting ruling. Q1, Q2 and Q3 are
⛔ BLOCKING — no authorised flip can execute until they are ruled. Q4 is ⚠ FORM.)*
**Author:** BigDev (Solo Builder)
**Raised:** 2026-08-18, against `governance/trustee-panel-obligation-queue` @ `ba5cbc3` (clean,
fetched). ⚠ **Baseline is a branch, not `main`** — the branch carries Decision `2026-08-17-127` and is
not yet merged. Recorded so the baseline is not misread as trunk.
**Scope:** ⛔ **Attached to no story.** It concerns the **two Panel-owned feature flags** and the
mechanism by which any Panel flip reaches its ruled state.
**Decision-log head, verified live at authoring:** `2026-08-17-127` (`.decision-log.md:37`).
`grep -c '^### Decision '` → **129** headings, of which one is the `YYYY-MM-DD-NNN` **template**,
leaving **128** numbered headings over **127** distinct numbers — the `+1` is the legitimate amendment
suffix `2026-06-01-012-amend-1`. No gaps in `001…127`.
**Disposition on ruling:** a single `.decision-log.md` entry, numbered **`2026-08-18-128`** from the
current head — *(⚠ **re-verify the head at ruling time** and number from whatever is then head)*. Per
Decision `2026-08-09-095` the entry must **label per-clause provenance**.

> ⚠ **Every recommendation in this note is NON-BINDING.** Each ⭐ is a suggestion the Panel may reject.

> ⚠ **This note does NOT re-open Decision `2026-08-17-127`.** That ruling stands: the
> `termination_access_block` control **is authorised**, for **all Pariwars**, and the canonical wording
> of what it does is ratified. ⛔ This note asks only **how an authorised flip is executed**, a question
> `127` did not reach because the ladder was not in view when it was drafted
> ([[feedback_supersede_never_reinterpret]]).

---

## Why this note exists

Decision `2026-08-17-127` clause 6 authorised the `termination_access_block` control for **all
Pariwars** — *"the `full` state, where the cohort is ignored entirely"*, exactly as Decision
`2026-08-09-094` defines it.

**That authorisation cannot be executed.** The flag is at `off`, and `off → full` is not a legal
transition. It is not a lint, not a convention, and not advisory: an API call attempting it returns
**409 `feature_flag.illegal_state_transition`**.

The destination is right. The **route to it** was never ruled — and it turns out the route passes
through two states that carry governance requirements of their own.

⚠ **This is not a defect in `127`.** The ladder is a shipped invariant that no governance entry had
ever had occasion to meet, because **no Panel-owned flag has ever been flipped**. `127` is the first
authorisation to reach the point where the mechanism answers back.

---

## Findings

*(Every citation re-verified from source at `ba5cbc3` during authoring.)*

### F-1 ⭐ THE BLOCKER — `off → full` is illegal, and the ladder is ENFORCED

`packages/domain/src/feature-flags/registry.ts:72-79`, verbatim:

```
off:         ['off', 'canary']
canary:      ['canary', 'rollout', 'rolled_back']
rollout:     ['rollout', 'full', 'rolled_back']
full:        ['full', 'rolled_back']
rolled_back: ['rolled_back', 'off', 'canary']
```

Its own header calls it *"The AC7 legal-transition map — the staged-rollout ladder, **ENFORCED**
(Review Pass 2)."* The enforcement site is `apps/api/src/modules/feature-flags/handlers.ts:169-175`,
which throws `ConflictError(…, 'feature_flag.illegal_state_transition')` and comments that this is
*"the single most likely 4xx on this route in normal operation."* The prohibition is separately pinned
by test: `packages/domain/tests/feature-flags/registry.test.ts:212` asserts
`LEGAL_FLAG_STATE_TRANSITIONS.off` does **not** contain `full`.

⇒ Reaching `full` from `off` requires **three publishes**: `off → canary → rollout → full`.

### F-2 — the two intermediate rungs are cohort-gated, and an empty cohort serves NOBODY

`canary` and `rollout` do not resolve to enabled-for-all. `evaluate.ts` records the reasoning
explicitly — an empty cohort was once read as enabled-for-all, *"which made `canary` behaviourally
identical to `full`"*, and the shipped resolution is that **serving nobody** is the only reading under
which *"not yet narrowed"* is not a synonym for *"narrowed to everyone"*. An empty cohort resolves to
`enabled: false` / `reason: 'cohort_empty'`.

⇒ Passing through the rungs is not a formality. Each rung needs a **real, non-empty cohort**.

### F-3 ⭐ THE SHARP ONE — clause 6 binds exactly the two states `127` said nothing about

Decision `2026-08-09-093` clause 6 is a **form requirement on the enabling entry itself**:

> *"an enabling Decision must state (i) the target state, (ii) its cohort clauses verbatim, and
> (iii) that the cohort is non-empty… a Decision omitting (ii) is not a narrower authorization — it is
> a **vacuous** one that will read afterwards as an authorized flip that failed."*

Decision `2026-08-09-094` then **scoped clause 6 to the two intermediate states**, since `full` ignores
the cohort entirely.

⇒ `127` cl. 6 is **fully compliant as to its destination** — target state stated, cohort correctly
omitted because `full` ignores it. And it is **silent as to the two rungs**, each of which clause 6
binds. ⛔ The gap is not that `127` erred; it is that clause 6's requirement attaches to publishes
`127` did not know it was authorising.

### F-4 ⭐ STRUCTURAL — BOTH Panel-owned flags hit this wall, not just this one

Verified live:

| Flag | Registry state | Cohort | Ruled scope |
|---|---|---|---|
| `termination_access_block` (`registry.ts:274`) | `off` | `{ clauses: [] }` | all Pariwars = `full` (`2026-08-17-127` cl. 6) |
| `restoration_discipline_imposition` (`registry.ts:205`) | `off` | `{ clauses: [] }` | all Pariwars = `full` (`2026-08-09-094`) |

Both are Panel-owned, both sit at `off` with an empty cohort, and **both have been ruled to a
destination they cannot legally reach in one step.** The second has simply never been tested against
the mechanism because Escalation 6 keeps it unflippable for independent reasons.

⇒ ⛔ **This is not a `termination_access_block` question.** Whatever the Panel rules here governs the
restoration flip too, whenever it comes.

### F-5 — the sentinel precondition does NOT gate this flag, and DOES gate the other

Checked because a general reading would have added a second precondition. **It is scoped.**

Decision `2026-08-09-093` clause 1's substance is entirely restoration-discipline machinery —
`deriveContributionFacts` returning `null` on absent coverage, `runRestorationDiscipline` reporting
`unavailable: null` indistinguishably from a clean Pariwar, and a remedy that is *"a third named
producer on the `unavailable` field (`apps/jobs/src/restoration-discipline.ts:66`)"*.
`termination_access_block` reads the **moderation overlay** to deny session issuance and touches none
of it; **there is no analogous sentinel for it to be missing.** Both later restatements
(`2026-08-09-094`, `2026-08-09-095`) pair the sentinel with `restoration_discipline_imposition` **by
name**.

⚠ **Offered with its one weakness stated:** the phrase *"a PRECONDITION of any flip"* sits in `093`'s
**title**, and titles in this log are load-bearing. The body scopes it; a reader could argue the title
generalises. ⛔ **If the Panel intended a general rule, that is the Panel's to say** — Q3 offers it the
chance rather than letting an author's reading settle it.

⇒ ⚠ **Consequence for Q3:** a ladder ruling that covers both flags still leaves the restoration flip
blocked by **Escalation 6 (undischarged, and a ruled hold as of `127` cl. 4)** *and* the Q1 sentinel.
⛔ A ladder ruling must not be read as unblocking that flip.

### F-6 — the cohort-dimension trap, already recorded once and worth re-stating

`093`'s own open follow-up warns that `COHORT_DIMENSIONS` is exactly
`pariwar_id, member_state, district, block, role, cohort_tag`, and that a cohort **cannot** express a
member-level predicate. For `termination_access_block` the same discipline applies: the cohort selects
**which Pariwars** the block operates in; **who** is denied a session within them is decided by the
moderation overlay, not by the cohort.

⛔ A rung cohort written as *"terminated members"* would be unimplementable and would fail clause 6 for
the reason clause 6 exists.

### F-7 — what a rung costs, mechanically

Publishes go through `POST` on the global feature-flag route, gated by
`requireGlobalPermission(deps, FEATURE_FLAG_FLIP_KEY)` behind an admin session
(`apps/api/src/modules/feature-flags/routes.ts:82-91`). Each publish writes a **new flag version**.

⇒ Three rungs = three versions. ⚠ The question in Q1 is whether that is **one governance act executed
in three steps**, or **three governance acts**.

---

## The four questions

### Q1 — May ONE Decision authorise the whole walk to `full`? ⛔ BLOCKING · *Feeds every flip, both flags*

`093` clause 6 says *"one Decision authorizes ONE enabling version."* Read strictly, reaching `full`
needs **three** Decisions. Read as governing the *authorisation* rather than the *publish*, one
Decision naming all three rungs satisfies it.

⭐ **Recommendation: (a) one Decision, naming each rung's target state and cohort verbatim.** It
satisfies clause 6 literally — every rung's cohort is stated in the entry — while keeping **one
governance act per flip**, which is what "the Panel authorises the flip" has always meant in practice.
⛔ **Option (c) is flagged as the one to avoid:** amending the ladder to permit `off → full` for
Panel-owned flags edits a **shipped, tested AC7 invariant** to make a governance act more convenient.

### Q2 — What cohorts for `canary` and `rollout`? ⛔ BLOCKING · *Feeds clause 6 compliance*

Both must be **non-empty** and expressed in `pariwar_id` (F-6). The destination is all Pariwars, so
these are **staging** cohorts, not scope limits.

⭐ **Recommendation: (a) name one pilot Pariwar at `canary`, and a stated subset at `rollout`.** ⛔ The
Panel may equally rule (b) the same single cohort at both rungs, or (c) delegate cohort *selection* to
operations within a Panel-stated bound — but ⛔ under (c) the entry must still state the bound
verbatim, or it is the vacuous authorisation clause 6 exists to prevent.

### Q3 — Does this ruling govern BOTH Panel-owned flags? ⛔ BLOCKING · *Feeds F-4 and F-5*

⭐ **Recommendation: (a) yes — the ladder ruling is general.** The mechanism is identical and a
flag-specific ruling would leave the same question to be re-asked. ⚠ **If (a): the entry must state in
terms that this does NOT unblock `restoration_discipline_imposition`**, which remains held by
Escalation 6 (`127` cl. 4) and the Q1 sentinel.

⚠ **Sub-question, and the Panel may answer it separately:** is `093`'s *"PRECONDITION of any flip"*
general (title reading) or restoration-scoped (body reading, F-5)? ⭐ Author's reading is
restoration-scoped; ⛔ it is offered as a reading, not as a settled fact.

### Q4 — What happens to `2026-08-17-127` clause 6? ⚠ FORM

⭐ **Recommendation: (a) it STANDS, unedited, and this entry SUPPLEMENTS it.** `127` cl. 6 authorised a
destination and remains true; this entry supplies the route. ⛔ Not a supersession and ⛔ not a
correction — `127` is not edited in place.

---

## What non-answer would mean

| Q | Consequence of no answer |
|---|---|
| **Q1** ⛔ | The authorised flip stays unexecutable. ⚠ **The live risk is an implementer "just walking the ladder"** to honour an authorisation that looks settled — publishing two rungs the Panel never named. |
| **Q2** ⛔ | Any walk attempted would publish rungs with cohorts chosen by whoever ran the command. ⛔ That is the vacuous-authorisation failure clause 6 was written to prevent, arriving by a different door. |
| **Q3** ⛔ | The same question is re-asked at the restoration flip, and two flags with one mechanism get two rulings that may not agree. |
| **Q4** ⚠ | Ambiguity about whether `127` cl. 6 still authorises anything. **Low stakes; the other three are the real ones.** |

⛔ **No story stops on any of this.** The flip is authorised and unexecuted; the system's behaviour is
**unchanged and safe** — `termination_access_block` remains `off` and FAILS OPEN, so terminated members
retain portal access exactly as `§8.4a`'s *"built but not enabled"* disposition already discloses.

---

## What this note does NOT ask, and what a ruling would NOT mean

**Not asked:**
- ⛔ **Whether the control should be enabled.** Ruled at `127` cl. 6. This note asks only *how*.
- ⛔ **Any change to the canonical wording** of what the control does. Ratified at `127` cl. 6.
- ⛔ **Discharge of Escalation 6.** A ruled hold as of `127` cl. 4, and untouched here.
- ⛔ **Any change to `evaluate.ts`'s empty-cohort semantics.** F-2 explains the shipped reading; it is
  not up for revision.
- ⛔ **Whether §8.4a should be updated.** `127` cl. 7 already sequences that **after** the flip lands.

**A ruling would NOT mean:**
- ⚠ that **`restoration_discipline_imposition` becomes flippable.** It stays held by Escalation 6 and
  the sentinel, whatever Q3 rules.
- ⚠ that **the flip has occurred.** A ladder ruling authorises a route; the publishes are a separate,
  logged operational act.
- ⚠ that **register row (vii) is discharged.** It discharges when the flip lands, not when its route
  is ruled ([[feedback_closure_language_precision]]).
- ⚠ that **the AC7 ladder has been weakened**, unless the Panel expressly rules Q1(c) — which this note
  recommends against.

---

## Ruling template

Per Decision `2026-08-09-095`, the recorded entry must carry **per-clause provenance**.

| Q | Ruling | Notes |
|---|---|---|
| **Q1** ⛔ | (a) one Decision, all three rungs named / (b) one Decision per rung / (c) amend the ladder to permit `off → full` for Panel-owned flags | ⛔ If (c): it edits a shipped tested AC7 invariant and the entry must say so in terms |
| **Q2** ⛔ | `canary` cohort: ______ · `rollout` cohort: ______ · both in `pariwar_id`, both non-empty | ⛔ Cohorts state WHICH PARIWARS, never which members (F-6) |
| **Q3** ⛔ | (a) general — governs both flags / (b) `termination_access_block` only · **and** `093`'s "any flip" is: (i) general / (ii) restoration-scoped | ⚠ If (a): entry must state it does NOT unblock the restoration flip |
| **Q4** ⚠ | (a) `127` cl. 6 stands, supplemented / (b) superseded — with reason | ⛔ `127` is never edited in place |

---

## Disposition

On ruling: **one** `.decision-log.md` entry, numbered from the **then-live head**
(**`2026-08-18-128`** at authoring), per-clause provenance labelled, committed under a
`governance(flags):` prefix **before** any implementation commit
([[feedback_governance_commits_precede_implementation]]).

This note's status line is then updated to `✅ RULED <date>` with the superseded `⏳ Open` line
**retained**, and the ruling appended at the foot.

**On execution of the walk:** each publish is a separate logged act. ⛔ Register row **(vii)** discharges
when the flag reaches `full`, ⛔ **not** when this note is ruled. §8.4a's third disposition update
follows the flip, per `2026-08-17-127` clause 7 — both rows, both locales, verbatim.

⛔ Decisions `2026-08-07-089`, `2026-08-09-093`, `2026-08-09-094`, `2026-08-09-095` and
`2026-08-17-127` are **not edited** by any of this.

# The ruling as given — 2026-08-18

**Ratifying trustees:** ⚠ **un-attested-pending** — ⛔ not supplied and ⛔ not reconstructed
([[feedback_record_unattested_no_backfill]]). ⛔ **Not carried over** from `2026-08-17-127`; a
same-Panel continuation is likely and is **not evidence**. **Recorded as Decision `2026-08-18-128`.**

This section is authoritative where it differs from the option and recommendation text above. ⛔ The
text above is **retained, never overwritten**.

## The ruling, question by question

| Q | Ruled | Effect |
|---|---|---|
| **Q1** | **(a)** — one Decision authorises the whole walk, each rung named | Clause 6 read as governing the **authorisation**, not the publish. ⛔ Option (c) rejected: the AC7 ladder is **not amended** |
| **Q2** | Three rungs, cohorts named (below) | All non-empty; clause 6(i)(ii)(iii) satisfied |
| **Q3** | **(a)** — general, governs **both** Panel-owned flags | ⛔ Does **NOT** unblock `restoration_discipline_imposition` |
| **Q3 sub** | ⛔ **NOT ANSWERED** | Asked and reached; no answer given. The F-5 reading stands as a **reading** |
| **Q4** | **(a)** — `2026-08-17-127` cl. 6 stands, supplemented | ⛔ Not superseded, ⛔ not edited in place |

## The ruled walk

| Rung | Target state | Cohort (`dimension: pariwar_id`, `op: in`) |
|---|---|---|
| 1 | `canary` | **Shikshak Pariwar** |
| 2 | `rollout` | **Shikshak Pariwar, Rail Pariwar, Banker Pariwar** |
| 3 | `full` | ⛔ **none — `full` ignores the cohort entirely** |

⛔ **"All Pariwars" is the TARGET STATE at rung 3, not a cohort clause.** It is never written into a
`values` array.
⛔ **Cohorts name WHICH PARIWARS, never which members.** The moderation overlay decides who is denied a
session within them.
⚠ **The `pariwar_id` UUIDs were not verifiable from source** — the tree carries no seeded Pariwar rows —
so they are resolved **at publish time from these three names and nothing else**, and recorded then. ⛔ If
a name does not resolve to exactly one live Pariwar, **the walk stops** and returns to the Panel.

## What the ruling deliberately did NOT do

- ⛔ **It did not flip a flag.** Both Panel-owned flags remain `off`. `termination_access_block` **fails
  open**, so terminated members retain portal access exactly as §8.4a's *"built but not enabled"*
  disposition already discloses.
- ⛔ **It did not amend the AC7 ladder.** `off → full` remains illegal for every flag.
- ⛔ **It did not unblock `restoration_discipline_imposition`.** That flag is held by **two** independent
  obstacles: Escalation 6 (undischarged, a **ruled hold** as of `127` cl. 4) and the Q1 sentinel. This
  ruling governs how a flip **travels**, never whether it may **depart**.
- ⛔ **It did not discharge register row (vii).** That discharges when the flag reaches `full` — **not**
  when its route is ruled.
- ⛔ **It did not settle whether `093`'s "any flip" is general.** Clause 5 records the non-answer.

## Disposition, as executed

Decision `2026-08-18-128` recorded at `.decision-log.md:37`, per-clause provenance labelled
(`[Trustee-ratified]` clauses 1–4, `[Author-committed]` clauses 5–8), committed under a
`governance(flags):` prefix **before** any publish.

⚠ **One field remains open** — the attestation (entry clause 7). Its closure path is a **successor
entry** recording trustees and date; ⛔ never an edit to `128`'s fields.
