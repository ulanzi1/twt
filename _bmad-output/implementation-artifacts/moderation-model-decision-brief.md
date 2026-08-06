# Decision Brief — The Moderation Model (Epic 10 / Story 10.10 follow-up)

**Raised:** 2026-08-03 · **Owner:** PM / Trustee Panel · **Input to:** `bmad-correct-course`
**Trigger:** Story 10.10 merged (PR #160, `8d9fcd4`). A design review found that the shipped
enforcement mechanism makes the Niyamavali's primary restoration path unreachable.

> **Read this first if you have no other context.** Story 10.10 shipped member moderation
> (suspend / terminate / restore). It enforces suspension by setting `is_valid: false` in the
> Validity Service payload. `is_valid` is also the sole predicate for pool assignment. Pool
> assignment is the only path through which a contribution can be recorded. The Niyamavali's
> primary restoration path is "3 consecutive contributions". Therefore a suspended member cannot
> perform the act that restores them.

---

## 1. The finding, in one chain

| # | Fact | Source |
|---|---|---|
| 1 | Suspension sets `is_valid: false` | `packages/validity-service/src/payload.ts:77` |
| 2 | Pool assignability is `is_valid` and nothing else (frozen AI-7-2 invariant) | `apps/jobs/src/assignable-roster.ts:52` |
| 3 | A member off the roster is told they have no pool | `assignable-roster.ts:31-33` (its own comment) |
| 4 | No contribution path exists outside an assigned pool — and a CI fence asserts the absence of one | Story 8.10 (AC: "the demonstrable absence of a data path") |
| 5 | R7(A) restoration = **3 consecutive contributions** | Niyamavali §3.1, §8.3; PRD FR-56 `:853`, FR-9 `:343` |

**⇒ Every suspension is a de-facto permanent ban until a trustee manually intervenes.**
Rule-clearance restoration is currently unreachable; trustee discretion is the only working path.

### 1a. The Niyamavali clause this breaks

> **§3.3 Effect on eligibility.** Discipline consequences affect a member's **standing and
> beneficiary eligibility**, never a monetary liability. **A member in lock-in remains a member and
> may continue to contribute;** only their eligibility to *claim as a beneficiary* is affected.

The codebase **already honours this for lock-in**: `VALID_STATES = ['lock-in', 'active',
'active-in-grace']`, so a lock-in member keeps `is_valid: true`, stays on the roster, keeps
contributing, and their beneficiary ineligibility is carried as a *signal* (`lockInStatus`) for the
human verifier. Nothing in the claim path blocks on lock-in in code.

Story 10.10 did the opposite for suspension. This is a rule contradiction, not only a design gap.

### 1b. Scope of the enforcement claim (correction to the shipped code's own comment)

`payload.ts:46-48` states that because the roster reads `isValid`, *"pool assignability, claim
eligibility and the rules engine ALL inherit suspension with no code change."*

Only the first is true.
- **Claim eligibility does not read `is_valid`.** It runs the R5/R8 standing ladder with a human
  verifier; validity is a *display signal* in the verifier console.
- **The niyamavali engine does not read `is_valid`.** It produces inputs to the payload; `is_valid`
  is derived afterwards.

So "one edit is the ENTIRE enforcement surface" is wrong in both directions: it reached the one
consumer it should not have, and missed the two it claimed.

### 1c. Lock-in and suspension are two distinct instruments — both are required

*(Ratified by PM, 2026-08-03. This supersedes any reading in which one replaces the other.)*

| | **Lock-in** | **Suspension** |
|---|---|---|
| Purpose | Level playing field / fair opportunity | Consequence of indiscipline |
| Nature | **Not** a sanction | A sanction |
| Duration | **Trustee-set; varies over time** | Rule-defined; more or less constant |
| Ends by | **Time** elapsing | **An act** — contributions cleared, or trustee decision |
| Imposed at | Join, rejoin, **or after a discipline event** (§1.3) | A §8.2 ground |
| Claim-eligible during? | No | No |
| On roster / contributing? | **Yes** (§3.3) | **Must be**, to cure |

### 1d. GOVERNANCE PRINCIPLE — obligations are independent and never subsume one another

*(Proposed by PM, 2026-08-03. Constitutional; generalises beyond R7.)*

> **Every restoration mechanism must require the member to satisfy all outstanding obligations
> independently. No restoration package may reduce, replace or subsume any other outstanding
> governance obligation unless the Niyamavali explicitly states that it does.**

This is the general form. **D8** is its application to the specific case discovered in review
(restoration vs joining discipline), and **D2**'s overlay design is bound by it. Any future
instrument — a medical pause under R5(C), a concealment hold, a rejoin lock — inherits it without
needing its own clause.

### 1e. FINDING — the discipline lock-in does not exist in the system

Niyamavali §1.3 defines lock-in as imposed *"on joining, rejoining, or **after a discipline
event**."* R7(B)/(C) prescribe 3 months, R7(D) 3 months, R7(E)/(F) 5 months. None of it is built:

| Evidence | Source |
|---|---|
| `lock_in_months` appears **only in test fixtures**; no production code consumes it | `packages/niyamavali-engine/tests/fixtures/r7-clauses.ts` (sole hits) |
| Exactly **one** entry into `lock-in`: `pending-fee → lock-in` on fee payment | `packages/domain/src/member/state.ts:82,143` |
| **No `active → lock-in` transition.** "Renewal from grace/lapsed → active with **NO re-lock-in**" | `state.ts:80` |
| Only two events exist: `lock_in_entered` / `lock_in_expired`; the payload field is `lock_in_days_at_join` | `member/events.ts:152,209-210` |

**The system implements join-time lock-in only.** Of the two instruments the trust requires, one is
half-built and the other (suspension) is mis-wired.

The **trustee-tunable** property is correctly built for the join case and is the model to reuse:
FR-8 (`prd.md:323-334`) makes lock-in duration a rule-registry parameter, resolved per-Pariwar from
`niy.lock-in.policy`, and **version-pinned onto the member** (`lock_in_days_at_join` +
`lock_in_policy_version`) so a later re-tune never retroactively moves an existing member's unlock
date (`prd.md:334`).

### 1f. CONSTITUTIONAL FINDING — restoration currently substitutes for joining discipline

*(Raised by PM, 2026-08-03. A governance clarification, not an implementation bug to patch.)*

The current interpretation lets an R7 restoration package **substitute for unfinished joining
discipline**.

> **Worked example.** Joining discipline = 12 months. A member never contributes, so R7(B) applies
> (`ever_contributed == false`). They complete the R7(B) package — 5 consecutive contributions plus
> a 3-month restoration discipline — and resume normal standing at roughly month 8, rather than
> completing the original 12-month joining discipline.
>
> The same structure applies to R7(A) (a member with one or more contributions but under 10 routes
> there instead, via `total_count < 10`).

**This inverts the purpose of joining discipline.** It creates an incentive to lapse *deliberately*
in order to shorten it — the precise adverse-selection risk that "level playing field / fair
opportunity" (§1c) exists to prevent.

**The governing principle (general form §1d; applied form D8):** restoration obligations and joining discipline are **two
independent governance instruments**. A member may simultaneously owe unfinished joining discipline
*and* be serving an R7 restoration package. **Completion of one never implies completion of the
other.**

> ⚠️ Do **not** express this as "R7(A) requires joining lock-in." That phrasing makes joining
> discipline a *component* of the restoration package and does not generalise to future clauses.
> The instruments are orthogonal and run concurrently.

---

## 2. Cross-verification tables

### 2.1 Grounds for suspension

| # | Niyamavali §8.2 | PRD FR-56 `:851` | Shipped reason code | Status |
|---|---|---|---|---|
| 1 | R7 sub-clause violation | ✓ | `r7-contribution-discipline` | ⚠️ see **D1** |
| 2 | R14 forgery | ✓ | `r14-forgery` | OK |
| 3 | R10(A) parallel-org office-bearing | ✓ | `r10a-parallel-org-office` | OK — §7: lasts *"for the duration of that role"*; self-clearing |
| 4 | Concealment confirmed by State Trustee (§5.6) | ✓ (FR-11) | `concealment-confirmed` | OK |
| 5 | Helpline-escalated abuse | ✓ | `helpdesk-escalated-abuse` | OK |
| 6 | **absent** | **absent** | `regulator-action` | ⚠️ epic-only; no Niyamavali anchor — see **D6** |
| 7 | **absent** | **absent** | `voluntary-pending-review` | ⚠️ epic-only; `niyamavaliRef: 'FR-56'` is a placeholder — see **D6** |

Codes 6–7 are documented in `reason-codes.ts:16-20` as a deliberate union with `epics.md:3549`.
They are recorded, not smuggled — but §8.2 does not authorise them.

### 2.2 The R7 ladder — what each clause requires to clear

Niyamavali §3.1 alongside the seeded registry (`packages/domain/seed/niyamavali-v1-clauses.sql`):

| Clause | Condition (seeded facts) | Niyamavali consequence | Seeded `on_pass` | Can only be satisfied by contributions? |
|---|---|---|---|---|
| **R7(A)** | `in_lapse` ∧ `total_count < 10` ∧ `r7a_restorations_used < 2` | 3 consecutive; one-time-only, max 2 lifetime | `restore_3_consecutive_one_time` | **YES** |
| **R7(B)** | `ever_contributed == false` | 5 consecutive + 3-mo lock-in + Core-Team rec | `restore_5_consecutive_plus_lockin` | **YES** |
| **R7(C)** | `months_since_last ≥ 12` | New-registration treatment → 5 consecutive + lock-in | `treat_as_new_registration` | **YES** |
| **R7(D)** | `total_count ≥ 10` ∧ `skips_current_year == 1` | 3-mo lock-in + catch-up | `lockin_3mo_plus_catchup` | **YES** |
| **R7(E)** | `total_count ≥ 10` ∧ `skips_current_year ≥ 2` | 5-mo lock-in + complete all missed | `lockin_5mo_complete_all` | **YES** |
| **R7(F)** | `months_since_last ≥ 6` | 5-mo lock-in + complete all missed | `lockin_5mo_complete_all` | **YES** |
| **R7(G)** | `personal_event_excuse_claimed == true` | **No exemption** — recorded, grants no relief, carries no consequence | `no_exemption` | no (declarative) |

> **⚠️ MARKERS CLEARED 2026-08-06 (Decision 2026-08-06-080).** Both rows above read *"not in §3.1"*
> until the Trustee Panel **ratified R7(F) and R7(G) into `docs/legal/niyamavali.md`** §3.1 and
> Appendix A — closing this brief's **D9** (which recommended ratifying R7(F) as a real rung) and
> Story 10.26's **Escalation 1** (which raised the identical gap for R7(G)). The seed rows dropped
> `provisional`/`policy_review_required` to `false` accordingly. ⚠ **R7(A)/(B)/(C)/(D)/(E) are
> UNCHANGED and still provisional** — do not infer their ratification from this. R7(C)'s 12-month
> threshold is now *stated* in §3.1 as a textual corollary of D9's two-rung ladder, but its own
> ratification was not confirmed in that pass.
>
> **R7(G) is also now EVALUATED** (Story 10.26): its fact
> `contribution.personal_event_excuse_claimed` had no source anywhere in the substrate until that
> story built the member assertion instrument. ⚠ It is deliberately excluded from the violator-flag
> channel — a member who discloses a bereavement must never become a suspension candidate for it,
> which the ratified text now makes constitutional ("carries no consequence of its own").

**Six of seven R7 clauses can only be cleared by contributing.** All six are unreachable today.

Note: **zero occurrences of "suspend"** appear anywhere in the niyamavali engine source or the
seeded clause data. Every R7 `on_pass` is a lock-in or restoration outcome.

> **This table records what the system encodes today, not the intended governance rule.**
> · R7(A)/(B) populations are superseded by **D8** — they must key on joining-discipline state, not
>   on `total_count` / `ever_contributed`.
> · R7(C)/(F) thresholds are ratified by **D9** as a two-rung ladder (F: 6–11 months; C: ≥12), which
>   matches what is already seeded.

### 2.3 Restoration paths

| Path | Niyamavali | Shipped code | Works today? |
|---|---|---|---|
| Rule-clearance | §8.3 — *"e.g., R7(A) restoration via 3 consecutive contributions"* | `rule-clearance` | **NO — blocked** |
| Trustee discretion | §8.3 — R5(D) / R10(D) | `trustee-discretion` | Yes (manual) |
| Moderation error | not in Niyamavali | `moderation-error` | Yes (operational) |
| Termination reversal | §8.4 — explicit reinstatement + 12-mo rejoin lock (§2.5) | via `restore` | Yes (manual) |

---

## 3. Decisions required

### D1 — What does an R7 sub-clause violation produce? *(RESOLVED 2026-08-03)*

> Settle **D8** first — it fixes the populations R7(A)/(B) apply to, which this decision assumes.

Given §1c (both instruments exist and are needed), §3.1 and §8.2 are **not** alternatives:

- **§3.1** — each R7 clause prescribes a *restoration package*: N consecutive contributions,
  M months of restoration discipline, and/or catch-up. The seeded registry encodes exactly this
  (`restoration: {consecutive_required, lock_in_months, catch_up_required, complete_all}`).
- **§8.2** — an R7 violation may **additionally** justify a trustee **suspension**.

**RESOLVED — the human gate stands. No automatic suspension.** R7 evaluation produces the §3.1
restoration package; suspension under §8.2 remains a **separate, discretionary trustee act**. Both
instruments retained; §8.2 needs no amendment.

**This was already the ratified position — it simply was not connected to the moderation model.**
No-auto-suspend is a standing prohibition in four places:

| Source | Text |
|---|---|
| `ux-design-specification.md:123` | *"Staff-discretionary dispute resolution, **not auto-suspend**. Suspension requires staff outcome of 'unsatisfactory' or 'unreachable after escalation.' … Tiered escalation, never punitive timer."* |
| `ux-design-specification.md:203` | *"No auto-suspend; staff-discretionary after outbound call"* |
| `ux-design-specification.md:1066` | UTR mismatch → soft notification; HQ staff call within 24h |
| `docs/fallback-handler-ledger/README.md:67` | *"never trigger punitive action against members (no auto-suspend, no punitive-timer pattern)"* |

Plus `epics.md:4089`, prohibiting partner-driven auto-suspend.

**Implementation already conforms.** `moderateMember` (`write.ts:129`) is the sole recorder of a
moderation decision, with exactly **one** production caller — the admin route at
`apps/api/src/modules/member-moderation/handlers.ts:210`, gated on `member.moderate` + step-up. No
job, scheduler, projector or DB trigger reaches it; `apps/jobs/src/scheduler/moderation-notify.ts`
is a notifier only. Zero occurrences of `"suspend"` exist in the niyamavali engine or seeded clause
data, so R7 evaluation cannot structurally produce one.

#### D1 carries a NEW requirement — surface violators for trustee action

Nothing auto-suspends; but **nothing surfaces suspension candidates either**. A trustee must notice
an R7 lapse by hand. There is no queue, flag or worklist.

> **Requirement:** members in violation must be **flagged on the admin dashboard for immediate
> trustee action**. The system detects and presents; the trustee decides and acts. This preserves
> the human gate while making it operable — detection is automated, the sanction is not.

This is the constructive reading of **ESCALATION 2**. `epics.md:3563` expects Story 10.11 to
aggregate "moderation pending items" and Story 10.10 defines no pending concept — so the gap is not
"a queue we forgot to build" but **"discretionary suspension needs a candidate-surfacing mechanism,
and that mechanism is what 10.11 should aggregate."** This reframes 10.11's scope rather than
blocking it.

### D2 — Build the discipline lock-in ⭐ **the largest missing piece**

Per §1e, R7(B)–(F)'s 3- and 5-month lock-ins have no implementation. Required regardless of D1's
outcome, because §3.1 prescribes them independently of suspension.

| Option | Effect |
|---|---|
| **D2-a** *(recommended)* — a **second overlay**, mirroring the moderation overlay | `lock-in` the *lifecycle state* stays join-only. The overlay carries `imposed_at` + duration + policy version, folds into `is_valid` (coverage), and is **ignored by the roster**. Reuses a shipped, reviewed pattern |
| **D2-b** — an `active → lock-in` lifecycle transition | **Has the Decision-1 defect.** Expiry cannot know which state to return to (a member locked from `active-in-grace` cannot be routed back) — the exact reason Story 10.10 rejected lifecycle labels for moderation |

Duration source: **do not reuse `lock_in_days_at_join`** — that field is join-scoped by name and
semantics. Add a restoration-discipline policy clause to the registry, resolved and version-pinned
at imposition, following the FR-8 pattern in §1e.

⚠️ **Constrained by §1d and D8.** Joining discipline and restoration discipline are independent instruments
that may run concurrently. The overlay must track them **separately, with separate expiry** — one
clock must never absorb or shorten the other. Design the overlay to hold both, not one.

### D3 — Donor-roster eligibility

**Principle to ratify — this is the *why*, and it must be stated explicitly:**

> A suspension removes a member's **entitlement to receive support**, not their **obligation to
> contribute** toward the Pariwar while completing an available restoration path.

Without this sentence on the record, a future reader will reasonably ask *"why are we asking
suspended members to pay?"* — and the answer is not obvious from the predicate alone. Entitlement
and obligation are separable, and suspension separates exactly them: it withdraws the first while
leaving the second intact, because the second is the mechanism by which the first is re-earned.

Given §1c, this simplifies to a single predicate — no per-reason-code branching:

```ts
is_assignable = VALID_STATES.includes(state) && moderationStatus !== 'terminated'
```

**Under the recommended model, both lock-in and suspension keep the member on the donor roster and
contributing — because restoration requires ongoing contribution. Only termination removes.**
*(A recommendation for Trustee ratification, not an established constitutional fact.)*
Story 10.10 already routes termination *through* suspension, so the escalation path for
"actually remove them" exists: if a ground warrants removal from the roster, the correct act is
**terminate**, not suspend.

*(An earlier draft proposed reason-code-scoped roster treatment. Superseded — it was
over-engineering once suspension is understood as always-curable.)*

### D4 — Disclosure: contributions during suspension do not create entitlement

Under any option where a suspended member contributes, they are paying in **without being covered**.
If they die mid-restoration, the nominee receives nothing.

**The disclosure must state this without ambiguity:**

> **Contributions made during suspension restore standing but do not create beneficiary entitlement
> for deaths occurring during the suspension period.**

That is the honest meaning of R7(A) — standing is re-earned by demonstrated discipline. But it must
be **disclosed on the payment surface**, not buried in a status panel. Today's copy would show
"suspended / not covered" beside a live request for ₹310, with no explanation of the relationship.

- **D4-a** *(recommended)* — the sentence above rendered on the contribution surface itself, plus
  what this payment does, what it does not buy, and how many remain. Route through
  `docs/tone-guide.md`; §4.5's no-shortfall-framing discipline applies.
- **D4-b** — leave to the generic moderation notice. **Not recommended** — this is the path that
  can hurt a bereaved family.

Applies to **both** instruments: a member in a discipline lock-in is equally contributing without
coverage, and equally entitled to know it.

### D5 — Termination ends membership privileges (supersedes ESCALATION 3)

**The original framing was wrong.** ESCALATION 3 asked "should a terminated member be able to write
to their own record?" — treating it as a gate-coverage problem across five `TERMINAL_STATES` sets.
The real question is prior: **does an expelled person need an authenticated portal account at all?**

**Principles to ratify:**

> **Termination ends membership, not history.** The Trust shall preserve the historical record of
> the member's participation, moderation decisions and financial transactions in accordance with its
> retention obligations, while ending all membership privileges and authenticated member access.

> **Statutory rights survive termination.** Termination ends authenticated member access. Any
> statutory rights of access, correction, portability or erasure shall be exercised through an
> **identity-verified administrative process designated by the Trust**.

The second sentence deliberately promises a **process**, not a portal — it satisfies DPDPA Part 10
without creating a standing authenticated surface for expelled members.

| Immediately disabled on termination | Preserved internally by the Trust |
|---|---|
| Login · member portal · nominee management · medical updates · life events · T&C · contribution participation · claims · messaging · internal announcements · directory — everything operational | Audit trail · moderation record and Decision Note · contribution history · payment records · notices issued · evidence references |

The terminated person may **request copies, exercise statutory rights, and communicate through an
official channel** — they do not retain portal access. This is how regulated organisations
ordinarily operate.

**This dissolves ESCALATION 3 rather than patching it.** With no authenticated session there is no
write path, so the five `TERMINAL_STATES` sets need no change and no AC5 deviation is required.

**It also removes Decision 6's basis.** Story 10.10 kept login open so a moderated member could
*"read the dignified explanation and reach the appeal CTA."* Per **D10**, that appeal CTA has no
moderation-scoped destination — the justification rested on a mechanism that does not exist.

#### Three requirements this creates

1. **DPDPA access must move off-portal.** Part 10 guarantees access, correction, portability and
   erasure; Story 3.11's data export is a member-portal feature. Terminated members need an
   identity-verified helpline/helpdesk route to those rights, or this becomes a compliance gap by
   omission.
2. **The termination notice must be self-contained.** 10.10's second review pass fixed exactly the
   bug where the moderation explanation reached nobody. A *"Your membership has been terminated.
   View details →"* notice becomes absurd once the portal is closed — the notice **is** the
   explanation. Required shape:

   > **Decision** — Termination
   > **Ground** — Forgery
   > **Summary** — The Trustee Panel determined that the relationship of trust has irreparably
   > broken following confirmed document forgery.
   > **Effective** — 4 August 2026
   > **Further communication** — If you wish to obtain copies of records or exercise statutory
   > rights, contact …

   No portal dependency, no broken deep link. Note the Summary is member-facing prose derived from
   the Decision Note — **not** the Tier-1 Decision Note verbatim, which may carry detail that should
   not ride an SMS or WhatsApp channel.
3. **Suspension is unaffected.** A suspended member must retain login: they are curing, they need
   the contribution surface, and D4's disclosure lives there. This decision applies to
   **termination only.**

#### Implementation

The login gate is `member-auth.handlers.ts:71` (`state === 'withdrawn' || state === 'anonymized'`).
Moderation is an **overlay**, not a lifecycle state, so this requires adding an overlay read to the
auth path — not a string added to a set. It must be **timing-equalised** exactly like the existing
withdrawn block (P6, `:77`), or the differing response time becomes a membership-enumeration oracle.

The session cascade already exists: `revokeAllMemberSessions` runs on both suspend and terminate.
Today it revokes without blocking re-login; this decision closes that half.

### D6 — Capability model must represent the Trustee Panel ⭐ **governance prerequisite**

> **Governance prerequisite — not technical debt.** The moderation model cannot fully satisfy
> **D10** until the capability model can represent the **Trustee Panel** as defined by the
> Niyamavali.

D10 principle 2 assigns the sanction decision to the Trustee Panel. The shipped gate is
`member.moderate`, held by `pariwar_admin` + `super_admin`. `state_trustee` is DEFERRED because a
`state`-ceiling grant can never satisfy a `pariwar`-dimension check — so the body the Niyamavali
names as decider **cannot currently be granted the permission it needs**. Ratifying D10 as written
without closing this leaves the governance document describing an authority the system cannot
express.

`state_trustee` holds `member.suspend`, not `member.moderate`, and its `scopeCeiling: 'state'` can
never satisfy a `pariwar`-dimension check. `epics.md:3540` casts a State Trustee as the actor.
v1 ships `pariwar_admin` + `super_admin`; `state_trustee` and `district_admin` are deferred, each
pinned by a 403 test. `member.suspend` is now effectively superseded and unused.

Decide: correct the epic's actor, or introduce pariwar-ceiling roles for these actors.

### D7 — Niyamavali drift

Four drifts found. All are Part 11 amendments, not code changes:

1. **R7(F) and R7(G)** are implemented in the seeded registry and named in PRD `:169` ("R7(A–G)"),
   but §3.1 and Appendix A document only **R7(A)–(E)**.
2. **`regulator-action`** and **`voluntary-pending-review`** are shipped moderation grounds with no
   §8.2 authorisation.
3. **Joining lock-in duration:** §2.2 says `[[15 days]]`; FR-8 `:325` and the seeded
   `niy.lock-in.policy` clause both say **30 days**. The brackets mark it Trustee-tunable, so 30 is
   probably the ratified value and §2.2 is stale — confirm which is authoritative.
4. Part 11 pins each member's obligations to **the version they accepted**, so this drift is
   substantive, not cosmetic.

*(Drift 1 is resolved by **D9**, which ratifies R7(F) as a real rung and documents it in §3.1.)*

### D8 — Restoration never substitutes for joining discipline ⭐ **load-bearing**

**Principle to ratify.**

> **Restoration obligations and joining discipline are independent governance instruments. A member
> may simultaneously owe both. Completion, expiry or satisfaction of one never shortens, waives or
> completes the other unless the Niyamavali expressly provides otherwise.**

This is the specific application of the general non-subsumption principle in **§1d**, and it governs
all present and future R7 restoration clauses.

**Consequences:**

1. **R7(A) and R7(B) apply only while the original joining discipline remains incomplete.** The
   current implementation populations are therefore not the intended constitutional definitions:

   | Clause | Current population | Problem |
   |---|---|---|
   | R7(A) | `in_lapse` ∧ `total_count < 10` ∧ `r7a_restorations_used < 2` | A lifetime contribution count, not a joining-discipline state |
   | R7(B) | `ever_contributed == false` | Cannot distinguish a new member still completing joining discipline from a long-standing member who never contributed |

2. **The two instruments run concurrently and are tracked independently.** A member may owe both at
   once; clearing one never clears the other. This is a direct constraint on the **D2** overlay
   design: joining discipline and restoration discipline must be **separately tracked and
   separately expiring** — they must not collapse into one clock.

3. **A new fact is required.** The engine cannot currently evaluate the intended rule because no
   fact represents joining-discipline status.

   - Suggested name: **`member.joining_discipline_state`** (or equivalent).
   - **Sourced from the validity payload**, not derived inside the rule engine — the frozen
     "the engine consumes facts, never derives them" invariant holds
     (`[[project_engine_never_infers_contribution_facts]]`).
   - Low cost: the payload already carries `lockInStatus.state`
     (`'never-entered' | 'in-lock-in' | 'unlocked'`), so the producer side is a projection, not a
     new computation.

**Decide:** ratify the principle, and define the intended governance population for R7(A) and R7(B)
explicitly in §3.1 (a Part 11 amendment).

### D9 — Long-gap restoration ladder *(agreed 2026-08-03 — Option B)*

Ratify the inactivity thresholds as a **progressive ladder** rather than a single threshold:

| Clause | Inactivity | Consequence |
|---|---|---|
| **R7(F)** | **6 through 11 months** | 5-month restoration discipline + complete all missed |
| **R7(C)** | **12 months or more** | 5 consecutive + 3-month restoration discipline; treat as new registration |

**Rationale.** Preserves the intended escalation of consequences as inactivity increases; avoids
making R7(F) dead data; and aligns the implementation with the governance document by explicitly
documenting the currently `provisional` 12-month threshold.

**Rejected alternative:** setting R7(C) to 6 months. R7(F) already fires at `months_since_last >= 6`,
so the two clauses would become co-extensive; precedence (C=70 > F=45) would make C always win the
applicable pick, silently retiring R7(F) and swapping its "complete all missed" consequence for
new-registration treatment.

**Implementation impact: none.** The seeded registry already encodes both thresholds
(`r7-c` at `>= 12`, `r7-f` at `>= 6`). D9 is a **Niyamavali amendment only** — document R7(F) in
§3.1 and Appendix A, and record 12 months as the ratified R7(C) threshold so it can drop
`provisional: true`.

Note R7(C)'s "treat as new registration" closes a coherent loop under **D8**: new-registration
treatment re-imposes joining discipline, at which point R7(A)/(B) become applicable again on a
subsequent lapse.

### D10 — Grounds and principles for termination ⭐ **load-bearing**

**FINDING: no source defines grounds for termination.**

| Source | Grounds for **suspension** | Grounds for **termination** |
|---|---|---|
| Niyamavali Part 8 | §8.2 — five grounds | **No section exists.** §8.4 defines only the *exit* (trustee reinstatement + 12-month rejoin lock) |
| PRD FR-56 | `:851` — five grounds | `:855` covers recovery only |
| `epics.md` 10.10 | "structured reason codes" | no distinction drawn |
| Code | 7 codes | **the same 7 codes** |

`MODERATION_APPLIES_TO = ['suspend', 'terminate']` — every moderation ground applies to both.
`reason-codes.ts:66-71` is candid about why: *"Per-code narrowing beyond this would be inventing
policy the PRD does not state — recorded rather than guessed."* The consequence is that
**`voluntary-pending-review` can justify termination on the same footing as `r14-forgery`**,
carrying a 12-month rejoin lock.

**The one existing safeguard is nominal.** Decision 2 makes `none --terminate-->` illegal so
termination routes through suspension — rationale: *"a trustee must first suspend (itself notified,
audited and appealable) and only then terminate."* Both halves fail today:

- **No dwell time.** `nextModerationStatus('suspended','terminate')` returns `'terminated'`
  unconditionally. Two API calls seconds apart terminate a member, and the suspension notice is a
  best-effort post-commit job — so termination can precede the notice.
- **No moderation appeal exists.** `appeal-eligibility.ts` is entirely claim-scoped (`claims`,
  `claimVerifierDecisions`, `claimStateTrusteeDecisions`, `claimR9Votes`; "exactly one journey per
  claim, ever"). Niyamavali Part 9 is explicitly *"the internal **claim-denial** appeal flow,"* and
  **Part 8 never references Part 9.**

**Also note the severity gradient is thin.** §2.5 applies the 12-month rejoin lock to a member who
is *"terminated **or lapses**"* — so termination's harshest consequence is shared with ordinary
lapsing. What termination uniquely adds over suspension is: no rule-clearance cure, and roster
removal under D3. Confirm that gradient is intended.

#### Principles to ratify

**1. Constitutional distinction.** Suspension and termination are distinct sanctions with distinct
thresholds — not two intensities of one act.

**2. Reason codes establish the ground; the Trustee Panel determines the sanction.**

> Reason codes establish the factual ground requiring moderation. They do not, by themselves,
> determine whether the appropriate outcome is suspension or termination. The Trustee Panel shall
> determine the proportionate sanction after considering the seriousness of the conduct, any
> previous disciplinary history, the member's response, the possibility of restoration, and the
> Trust's duty to protect the Pariwar.

*(Mirrors the shipped `[[project_niyamavali_precedence_is_provenance]]` discipline — registry
metadata is provenance; the decision stays with the decider. This is a **reasoned decision against
stated criteria**, not unbounded discretion.)*

**3. Proportionality — termination is the final measure.**

> Termination is the Trust's final disciplinary measure and shall be used only where suspension or
> restoration is inadequate to protect the Trust or enforce the Niyamavali.

**4. Restoration is ordinarily exhausted first.**

> Where a Niyamavali-defined restoration path exists, termination shall ordinarily occur only after
> that restoration opportunity has been exhausted, unless the Trustee Panel records specific reasons
> why immediate termination is necessary to protect the Trust.

Without this, a trustee could terminate on an R7 ground despite the restoration package existing —
which would let termination **bypass** an available restoration obligation. That is **§1d's
non-subsumption principle running in the opposite direction**, and both protect the integrity of the
same instrument.

**5. The termination test is a failure of TRUST, not merely seriousness.**

> Termination is ordinarily reserved for conduct that irreparably destroys the relationship of trust
> between the member and the Trust, or presents a continuing material risk to the Trust or its
> members.

This is a principled test rather than a severity judgement, and it survives the vocabulary evolving.
Applying it:

| Sanction | Test | Grounds |
|---|---|---|
| **Suspension** | Restoration is realistically possible | R7 contribution discipline · voluntary pause · parallel-org office-bearing · pending investigation · temporary conduct issues |
| **Termination** | The trust relationship is fundamentally broken | Forged documents · identity fraud · financial fraud · deliberate concealment · repeated malicious abuse · persistent conduct materially threatening the Trust after due process |

Note R10(A) parallel-org office-bearing is definitionally a suspension ground: §7 disqualifies
*"for the duration of that role"* — it is time-bound and self-clearing, so trust is not broken.

**6. Termination follows a prior suspension**, except where the Niyamavali expressly creates an
immediate-termination exception.

**7. Documented notice and opportunity to respond** must precede termination, unless an express
exception applies.

**8. The absence of a moderation-specific appeal mechanism is a separate governance gap** requiring
its own story — explicitly *not* solved inside Story 10.10.

#### The moderation record — three separable parts

Today a moderation action carries one structured `reason_code` plus one free-text `rationale`. That
conflates three distinct questions. Separate them:

| Part | Answers | Form | Required |
|---|---|---|---|
| **1. Reason code(s)** | *What happened?* | Structured, from the governed vocabulary | Always — exactly one **primary** |
| **2. Decision Note** | *Why was this sanction chosen?* | Prose, governance-grade | Always |
| **3. Evidence** | *How can the case be reconstructed?* | **References only, never free text** — complaint #, investigation #, helpdesk ticket, document IDs, external order number | Optional |

**Rename `rationale` → `Decision Note`** (or *Recorded Reasons*) — the language disciplinary bodies
and regulators actually use, and a more accurate description of what the field must contain.

**Primary and supporting grounds.** Exactly one primary ground; any number of supporting ones. This
keeps reporting and analytics sane while allowing a case to reflect its real complexity.

**Escalation justification — mandatory on termination only.**

> Where the sanction is termination, the Trustee Panel shall additionally record why suspension is
> insufficient.

This is what makes principles 3 and 5 *testable* rather than aspirational. It forces conscious
justification of the escalation, and it completes the chain: **the reason code identifies the
misconduct, the Decision Note explains the facts, the escalation justification explains why
termination — not suspension — was proportionate.**

**Grounds are append-only. History is enriched, never rewritten.**

> Reason codes may be **added**, **superseded**, or **corrected by a further append-only record**.
> They are never edited or removed. A later finding attaches to the original action; it does not
> alter it.

*Worked example.* A member is suspended for **forgery** with a Decision Note. Six months later a
police report concludes identity theft. A State Trustee **appends** `identity-fraud` as a supporting
ground, attributed and reasoned, referencing the police report. The original action, its primary
ground and its Decision Note are untouched. This matches the event-sourced discipline used
throughout the codebase; `member_moderation_actions` is already append-only with a policy-regression
spec asserting it.

#### The record model is a candidate primitive — but do not extract it yet

The shape that has emerged is not moderation-specific. **Primary ground · supporting grounds ·
findings · proportionality justification · evidence references** would serve trustee removals,
volunteer discipline or vendor blacklisting without changing form. That generality is usually a sign
the abstraction is right.

**Build it moderation-only for now.** Per `[[feedback_no_premature_package]]`, no shared primitive
should be extracted before a second consumer exists *today*. There is exactly one. Concretely, a
generic version would need a **polymorphic subject** — `member_moderation_actions` currently carries
a member FK and member-scoped RLS, and neither a trustee nor a vendor is a member. That is real
design cost for a consumer that does not exist.

**Recommended:** design the moderation tables so the shape *could* generalise (keep the grounds
record clean and subject-agnostic in its columns), name this in the story as a recognised future
extraction point, and extract only when a second discipline surface is actually being built.

#### ⚠️ Vocabulary extensibility — split the governance act from the operational one

The proposal that trustees/superadmins may add reason codes later **conflates two different acts**.
Story 10.10 deliberately rejected a tenant-extensible registry, and its reasoning is sound
(`reason-codes.ts:7-10`):

> *"A per-tenant versioned table … would let a tenant **INVENT ITS OWN GROUNDS for terminating a
> member** — a governance-boundary violation of exactly the kind Story 10.8's capability bar exists
> to prevent."*

**RATIFIED SPLIT (2026-08-03).** This boundary is deliberate and load-bearing — a worked example of
where the governance line falls.

| | **Operational act** | **Governance act** |
|---|---|---|
| **What** | Add another ground to an **existing** moderation action | Create an **entirely new reason code** |
| **Example** | Primary: *Forgery* · Supporting: *Concealment* · six months later, Supporting: *Regulator action* | Introducing *"Political activity"*, *"Cyber harassment"* or *"Financial misconduct"* as new codes |
| **Nature** | No vocabulary change — **just more facts** | **Changes the Trust's disciplinary vocabulary** |
| **Route** | Append-only, attributed, reasoned. Build it | Part 11 amendment → registry version → trustee approval → audit → publication, exactly as Story 2.4 intended |
| **Who** | Trustee recording a finding | Trustee Panel amending the Niyamavali |

This delivers the intended extensibility using machinery that already exists — versioned,
audit-logged, publish-gated — without reopening the governance boundary. Note the vocabulary already
contains two codes **unauthorised by §8.2** (`regulator-action`, `voluntary-pending-review` —
D7 item 2); a runtime mint path would multiply that failure mode rather than contain it.

**The architecture stays as shipped.** `reason-codes.ts`'s frozen, code-level vocabulary is correct
and should not change; what is added is the append-only *grounds* record beneath it.

#### ⚠️ Immediate-termination exceptions — counsel-drafted only

**No exception is currently proposed.** An earlier candidate — *a member filing a court case
regarding a claim* — was **withdrawn on review (2026-08-03)**, because it sits in direct tension
with three ratified positions:

| Source | Text |
|---|---|
| Niyamavali §1.2 | *"No rule ousts the jurisdiction of any court or forum; internal resolution (Part 9) is the **primary** path, not an exclusive one."* |
| Niyamavali R10(E) | *"Judicial challenge is **not contractually barred** … (The older 'no judicial challenge permitted' phrasing is **deliberately dropped**; see §1.2 and Deed Clause 26.)"* |
| Deed Clause 26 | Natural justice |

Terminating a member **for** seeking judicial recourse would functionally reintroduce the clause
R10(E) deliberately removed, and could read as retaliatory. Where the underlying concern is
protecting the pool during active litigation, a **claims-participation hold** achieves the effect
without penalising recourse.

**Standing requirement:** any future immediate-termination exception under principle 6 must be
drafted by counsel and routed through `docs/legal-counsel-engagement/` §1(a) trust-posture and
§1(c) appeal fairness, with `[LEGAL]` acceptance recorded in `.decision-log.md`, **before**
ratification.

#### Implementation shape

Principle 2 changes the earlier plan: **do not hard-narrow `appliesTo`.** If the Trustee Panel
determines the sanction, the registry must not pre-empt it. Instead:

| Principle | Mechanism |
|---|---|
| 2, 5 | `appliesTo` stays `['suspend','terminate']` for all moderation grounds; add **guidance** metadata (e.g. `ordinarilyResultsIn: 'suspend'`) that the admin UI surfaces. Registry data + copy, no engine change |
| 2 | **Blocked on D6** — the Trustee Panel must be grantable before it can be named as decider |
| 3, 5 | Escalation-justification field, mandatory when `action === 'terminate'`. The single strongest safeguard: it makes proportionality testable |
| 4 | Recorded-justification requirement when terminating on a ground with an available restoration path. `contribution.r7a_restorations_used` already evidences genuine exhaustion (`>= 2` = path unavailable), so this is checkable from data rather than assertion |
| 6, 7 | A dwell/notice precondition in `nextModerationStatus`'s caller — a new precondition, not a new state |
| Record model | One migration adds `escalation_justification` + `evidence_refs` (reference IDs, not text) + primary/supporting grounds, and renames `rationale` → `decision_note`. Bundle the rename here — `rationale` ships with Tier-1 encryption, a decrypt endpoint and RTBF scrub (migration 0092), so a standalone rename would be pure cost |
| Append-only grounds | A `member_moderation_grounds` append-only table keyed to `moderation_action_id`, carrying code · primary flag · added_by · added_at · note · evidence refs |

**⚠️ Principle 2 makes D6 load-bearing.** It names the **Trustee Panel** as the decider, but the
shipped gate is `member.moderate`, held by `pariwar_admin` + `super_admin`; `state_trustee` is
DEFERRED because a `state`-ceiling grant can never satisfy a `pariwar`-dimension check
(ESCALATION 1). Ratifying principle 2 as written requires the capability model to be able to
*express* it — so **D6 stops being housekeeping and becomes a prerequisite.**

#### Future governance test

> **Any future moderation ground or sanction shall be evaluated against these principles rather than
> by analogy to existing reason codes.**

This prevents the failure mode where a future amendment reasons *"R14 behaves like R7, so treat it
the same."* A new ground must independently satisfy the tests: is trust irreparably broken
(principle 5)? Is the sanction proportionate (principle 3)? Is a restoration path available and
exhausted (principle 4)? Has due process been afforded (principles 6–7)? Analogy to an existing code
is not an answer to any of those.

It also guards the D7 failure mode from recurring: `regulator-action` and
`voluntary-pending-review` entered the vocabulary without §8.2 authorisation, most likely by analogy
to the codes already present.

---

## 4. Change surface if the roster is unblocked

Assumes the recommended shape: `is_valid` keeps its current meaning (coverage; suspended → false),
and a **new** payload field carries donor-roster membership. Only the roster switches fields.

### Tier 1 — the fix (5 files, ~1 real logic line)

| File | Change |
|---|---|
| `packages/validity-service/src/payload.ts:77` | add `deriveIsAssignable(state, moderationStatus[, reasonCode])`; wire at `:290` |
| `packages/validity-service/src/types.ts:167` | add field to `MemberValidityPayload` |
| `packages/contracts/src/members/validity.ts:111` | add to the zod DTO |
| `packages/contracts/scripts/emit-openapi.ts:3027,3077` | regenerate + correct the prose |
| `apps/jobs/src/assignable-roster.ts:52` | read the new field; rewrite the frozen-invariant doc block at `:43-48` |

Per **D3** the derivation is a single predicate (`moderationStatus !== 'terminated'`) with no
reason-code branching, keeping the roster a **single pre-derived field** read — which preserves what
AI-7-2 exists to protect (no eligibility logic in `apps/jobs`). Record as an amendment to AI-7-2,
not a violation.

**Scope note:** this Tier-1 fix unblocks the roster only. **D2 (build the discipline lock-in) is a
separate and substantially larger build** — a new overlay, a registry policy clause, imposition and
expiry events, and an `is_valid` fold. It should be its own story, not a patch.

### Tier 2 — behaviour that newly switches on

- **Pool spawn** (`packages/domain/src/pool/spawn.ts:419`) — rosters include suspended members. Comment only.
- **Contribution notify (8.8)** — suspended members receive contribution alerts. *This is the cure working.* Copy must say so (→ **D3**).
- **Yogdaan status (8.6)** — their contributions render green beside a suspension notice. Needs reconciling.
- **`packages/ui/src/member-status/presenter.ts:81-91`** — headline logic unchanged (reads `specialFlags`), but the rendered *combination* is new. **Largest exposure; it is copy, not code.**

### Tier 3 — replay determinism (needs a pin)

`assignable-roster.ts` promises byte-identical re-spawn from a frozen `committed_at`. Changing the
predicate changes historical replay. Nothing diverges yet — 10.10 shipped 2026-08-03 and no
moderation event predates any frozen cycle — but pin it with a test before that stops being true.

### Tier 4 — verified NOT affected

| Surface | Why |
|---|---|
| Validity cache | `0036_member-validity-cache.sql:106` bumps the cohort epoch on `event_type LIKE 'member.%'` — `member.moderation.*` already invalidates |
| Redaction | `STATE_TRUSTEE_ONLY_FLAGS` holds only the concealment flag; moderation flags are deliberately member-visible |
| Peer mesh | keys on `members.state = 'active'` (`peer-mesh-read.ts:93`), never `is_valid` |
| News audience | keys on `NEWS_DISPATCH_MEMBER_STATES` lifecycle states |
| Claim eligibility | does not read `is_valid` — human R5/R8 ladder |
| Login | never gated on `is_valid`. **Superseded by D5** — termination now blocks login via an overlay read in the auth path; suspension still does not |
| The five `TERMINAL_STATES` sets | **untouched, and D5 keeps them that way** — with no authenticated session there is no write path to gate |

---

## 5. Recommended sequence

0. **§1d** — ratify the general non-subsumption principle. One sentence; governs every instrument, present and future.
1. **D8** — its applied form (restoration vs joining discipline). Governs D2 and every future R7 clause.
2. **D6** — capability model represents the Trustee Panel. **Governance prerequisite for D10.**
3. **D10** — termination grounds, principles and the record model. No immediate-termination exception is proposed; any future one is counsel-drafted.
4. **D5** — termination ends membership privileges. Dissolves ESCALATION 3; carries the DPDPA off-portal and self-contained-notice requirements.
3. **D3** — donor-roster eligibility. Small code change, unblocks rule-clearance restoration immediately.
4. **D2** — build the discipline lock-in, honouring D8's independence constraint. The largest piece; its own story.
5. **D4** — disclosure copy. Required before any member contributes without coverage.
6. **D9, D7** — Niyamavali amendments via Part 11. **D9 is agreed** and needs no code change; both can run in parallel with the above.
7. **D5** — independent of the deadlock; carried from the Story 10.10 review.
   **D6** — promoted: now a prerequisite for D10 principle 2, not housekeeping.

### Spun out — needs its own story

Each owns a distinct concern; none is a nice-to-have.

| # | Story | Scope |
|---|---|---|
| 1 | **Moderation record model** (from D10) | Primary/supporting grounds · Decision Note · escalation justification · evidence references · append-only grounds table · `rationale` → `decision_note` migration |
| 2 | **Moderation appeal mechanism** (D10 principle 8) | Currently nonexistent. Part 8 never references Part 9; the appeal system is claim-scoped |
| 3 | **Off-portal DPDPA access** (from D5) | Identity verification · export · correction · RTBF for members without portal access |
| 4 | **Trustee capability model** (D6) | Geo-tree / scope-ceiling work so the Trustee Panel can hold `member.moderate`. **Prerequisite for D10** |

Plus **violator flagging on the admin dashboard** (from D1) — the candidate-surfacing mechanism that
makes the human gate operable. This is scope-defining input to **Story 10.11** rather than a
standalone story.

**Status:** **D1 resolved** (2026-08-03 — human gate stands, no auto-suspension; violator flagging
spun out). **D9 agreed.** **D5, D8, D10** drafted by PM, pending formal ratification. **D6**
promoted to governance prerequisite for D10. **D2, D3, D4, D7** open.

**Vocabulary extensibility — RESOLVED (2026-08-03).** The operational/governance split is ratified;
the shipped frozen code-level vocabulary stays as-is. See D10.

---

## 5a. The constitutional structure in one view

The moderation model now answers eight distinct questions, each owned by a different mechanism.
This is the frame to carry into `correct-course`:

| # | Question | Mechanism | Where |
|---|---|---|---|
| 1 | **Ground** — why did the case arise? | Structured reason code, primary + supporting | D10 |
| 2 | **Facts** — what happened? | Decision Note (was `rationale`) | D10 |
| 3 | **Trustee reasoning** — why this sanction? | Reasoned decision against stated criteria | D10 §2 |
| 4 | **Proportionality** — why termination rather than suspension? | Mandatory escalation justification | D10 §3, §5 |
| 5 | **Governance vocabulary** — who may define new grounds? | Part 11 amendment via the clause registry; never a superadmin UI | D10 |
| 6 | **Operational history** — how are later facts appended? | Append-only grounds; enrich, never rewrite | D10 |
| 7 | **Rights after termination** — what ends, what remains? | Membership ends; history is preserved | D5 |
| 8 | **DPDPA** — do legal rights survive? | Yes — through an identity-verified administrative process | D5 |

Substantially stronger than *"select a reason code and terminate the member."*

### Note — these principles need a permanent home

This brief is a **point-in-time artifact**: once `correct-course` consumes it, it becomes history.
The constitutional principles inside it are **permanent**, and all four spun-out stories will need
to cite them. Leaving them here orphans them.

Recommended split when the decisions are ratified:

| Content | Destination | Route |
|---|---|---|
| §1d non-subsumption · D8 · D10 principles 1–8 · D5's two principles · the future governance test | **Niyamavali Part 8** (expanded) and §3.1 | Part 11 amendment — these *are* governance text, not commentary about it |
| The record model · the operational/governance vocabulary split · the primitive-extraction note | A `docs/` governance reference (the `docs/tone-guide.md` / `docs/access-wrapper-invariants.md` precedent) | Ordinary doc, cited by the four stories |

The brief then retains what a brief should: **findings, decisions, and implementation impact.** Not
required before `correct-course` — but do it at ratification, not later, or the principles will be
re-derived from a stale artifact.

Story **10.11 (Trustee-Lite list + signals)** is blocked on a related open question already recorded
as ESCALATION 2: `epics.md:3563` has it aggregate "moderation pending items … sorted by
deadline-proximity … with category + age + severity", but 10.10 defines no pending/queue concept,
and moderation items carry no deadline and no severity. **Resolve that alongside D1** — the answer
depends on whether moderation acquires a pending state at all.

---

## 6. Sources

All claims above are read from these, not inferred:

- `docs/legal/niyamavali.md` — §1.3, §3.1, §3.3, §5.6, §7, §8.1–8.4, Part 11, Appendix A
- `_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md` — `:249`, `:343`, `:389-392`, `:411`, `:851-855`
- `_bmad-output/planning-artifacts/epics.md` — `:3540`, `:3549`, `:3553-3566`
- `packages/domain/seed/niyamavali-v1-clauses.sql` — R7(A)–(G), R8, R8(A)/(B), lock-in policy
- `packages/validity-service/src/payload.ts`, `types.ts`, `service.ts`, `redaction.ts`, `cache.ts`
- `packages/domain/src/member/moderation/` — `status.ts`, `overlay.ts`, `reason-codes.ts`
- `packages/domain/src/member/state.ts` (`:80`, `:82`, `:143-145`), `events.ts` (`:152`, `:209-210`)
- `packages/niyamavali-engine/tests/fixtures/r7-clauses.ts` — the only `lock_in_months` hits in the repo
- `apps/jobs/src/assignable-roster.ts`; `packages/domain/src/pool/spawn.ts`
- `packages/ui/src/member-status/presenter.ts`
- `packages/domain/migrations/0036_member-validity-cache.sql`
- `_bmad-output/implementation-artifacts/10-10-member-moderation-suspend-terminate-restore-reason-codes.md` — Decisions 1/2/6/8, ESCALATIONS 1–3
- `_bmad-output/implementation-artifacts/8-10-out-of-band-contribution-policy.md` — the no-alternative-path fence
