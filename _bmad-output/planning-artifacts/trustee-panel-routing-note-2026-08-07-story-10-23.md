# Trustee Panel Routing Note — Story 10.23 (Restoration Discipline Lock-In)

**Status:** ✅ **Ruled 2026-08-07 — all four questions ratified at Option (a), with two Panel amendments.** Binding record: Decision `2026-08-07-088`. This note is the question set; the Decision entry governs.
**Author:** BigDev (Solo Builder)
**Raised:** 2026-08-07, against `_bmad-output/implementation-artifacts/10-23-restoration-discipline-lock-in.md` (authored off `main` @ `6783eba`, status `ready-for-dev`, **not yet implemented**)
**Ruled:** 2026-08-07 by the Trustee Panel. Two amendments were made during the ruling and are incorporated below: the Q4 flag's **default-off scope and authorization owner** were made explicit, and the counterfactual in *"What happens if this note is not answered"* was restated as a governance consequence rather than a prediction about implementer behaviour.
**Disposition on ruling:** recorded as a `.decision-log.md` entry in the pattern of Decision `2026-08-07-084` (per-question option ratification). The story's ACs are amended to cite `2026-08-07-088` before dev begins.

---

## Why this note exists

Story 10.23 carries nine escalations. **Five of them are correctly routed elsewhere** and are not in
this note:

| Escalation | Why it is not here |
|---|---|
| **1** — the falsifiable-hold gate is structurally blind to this story | Resolved *by building it*. It is the story's own Task 1. No ruling needed. |
| **2** — the non-subsumption principle never reached the ratified Niyamavali | A Part 11 amendment already sequenced by `sprint-change-proposal-2026-08-04.md:150`. Routed as a governance instrument, not a question. |
| **3** — lock-in *imposition* is not on the SIE allowlist | Ratification of an argument already written into AC2. Routed with the story. |
| **4** — join lock-in is `is_valid: true`, restoration lock-in will be `false` | Open since Story 10.17 Escalation 3 (`payload.ts:106-107`) and `deferred-work.md:2240`. Resolving it means editing `VALID_STATES` (`payload.ts:67-71`), which moves coverage for **every existing member** and rehashes every payload — larger than this story. Routed, not asked. |
| **7** — R7(C) (gap ≥12 mo) draws a **3**-month lock-in; R7(F) (gap 6–11 mo) draws **5** | Already named in Decision `2026-08-06-080` as a separate unaddressed Trustee-review question. Flagged for confirmation; the seed is **not** to be re-tuned. |
| **8** — R7(A)'s Part 11 amendment remains unpublished | A Trustee Panel instrument **no story can satisfy** (Decision `2026-08-06-077`). Blocking on it blocks indefinitely. |

**The four below are different in kind.** Each one changes what the implementer writes, and each is a
governance choice wearing implementation clothes. The story hands three of them (Q1, Q2, Q3) to the dev
agent with a recommended posture and a "decide and state it" instruction. If the dev agent decides
them, an implementation choice silently becomes de-facto policy — the exact decay pattern the
supersede-never-reinterpret discipline exists to prevent. Q4 is a placement question the story answers
in a way that appears, on inspection of the call graph, to be on the wrong side of the merge.

> Q1, Q2 and Q3 are already scheduled to be **recorded** in `deferred-work.md` by the story's Task 11.
> A record is not a ruling. This note asks for the ruling **before** the code hard-codes an answer,
> not after.

---

## Q1 — Concurrent restoration impositions: what is the combined expiry?

**Escalation 5. Governs AC5.**

**The gap.** Niyamavali §3.1 prescribes a lock-in per rung but is **silent** on what happens when a
member draws a second imposition while a first is still live. Whether the second extends, replaces, or
runs alongside the first is not in the ratified text.

**What the story implements pending a ruling:** the overlay is in force while **any** imposition is
un-expired, and `expiresAt` is the **maximum** over live impositions.

| | Option | Consequence |
|---|---|---|
| **(a)** ⭐ ✅ *ratified* | **Maximum** over live impositions | Non-shortening. The reading consistent with §1d's non-subsumption principle: no instrument absorbs or truncates another. A member drawing a 5-month R7(E) while 1 month remains on an R7(B) serves 5. |
| **(b)** | **Minimum** | A later, *lesser* imposition would shorten a greater one already in force. Directly contrary to §1d. |
| **(c)** | **Replacement** — the newest imposition supersedes | Simple, but a member could draw a 3-month R7(D) to escape a live 5-month R7(E). Creates an incentive the Niyamavali does not contemplate. |
| **(d)** | **Sum** — durations accumulate | Strictly harsher than §3.1's per-rung table prescribes. Would need its own constitutional basis. |

**Recommendation: (a).** It is the only reading that neither shortens a live consequence nor invents a
longer one than §3.1 names.

**Why the Panel and not the implementer:** §3.1 assigns durations; a combination rule is a durational
consequence the Niyamavali does not state. Choosing one in code writes constitutional arithmetic.

**Where it lands if ratified:** the `niy.restoration-discipline.policy` clause payload (per **D2**), so
the rule is registry data the Panel can amend — not a code constant.

---

## Q2 — An unprovisioned Pariwar: impose under a code default, or refuse and surface?

**Escalation 9. Governs AC3 / D2, Task 3.**

**The gap.** The new `niy.restoration-discipline.policy` clause inherits R6's provisioning obligation.
The sibling `niy.lock-in.policy` states it as *"every production Pariwar MUST carry an effective clause
or a paid member 503s"* (`niyamavali-v1-clauses.sql:132-134`). **That failure mode does not transfer
here:** this is a background imposition, not a member request. There is no request to fail.

| | Option | Consequence |
|---|---|---|
| **(a)** ⭐ ✅ *ratified* | **Do not impose; surface the gap as a named sentinel**, following `R7_REGISTRY_UNPROVISIONED_PRODUCER` (`rules.ts:275`) | No member loses coverage under an unratified parameter. The gap is visible and attributable rather than silent. |
| **(b)** | **Impose under a code default** | A member's coverage is removed under a duration/convention **no Pariwar ratified**. This is an unratified sanction imposed by a machine. |
| **(c)** | **Hard-fail the scan for that Pariwar** | Honest, but one unprovisioned Pariwar halts imposition for the whole scan batch unless carefully scoped. |

**Recommendation: (a).**

**Why the Panel and not the implementer:** option (b) is not a fallback — it is coverage removal under
an unratified parameter. That is a governance act whichever way it is spelled.

---

## Q3 — Does an expired imposition **re-impose** while its clause still applies?

**AC2. The question with the worst failure mode.**

**The gap.** Idempotency-while-live (already in AC2) answers what happens when an imposition is in
force. It does not answer what happens **after expiry**, when the clause still applies — which it will,
because R7(D)/(E) key on `skips_current_year`, and **the skip cannot be cleared while no catch-up path
exists** (see Q4).

**Left unspecified, the writer re-imposes on the next scan.** A member who *cannot* discharge their
obligation is then locked continuously until the skip ages out at the IST calendar-year boundary
(`istYearStartUtc`, `packages/domain/src/contribution/facts.ts`).

| | Option | Consequence |
|---|---|---|
| **(a)** ⭐ ✅ *ratified* | **Do not re-impose** for the same unresolved episode while its completion condition is unsatisfiable | The consequence stays bounded at the duration §3.1 names. |
| **(b)** | **Re-impose each scan while the clause applies** | A de-facto **permanent coverage removal imposed by a machine**, lasting up to the IST year rollover. Structurally the same failure Story 10.17 was written to correct, arriving through a different door. If the Panel selects this, Q4's severity rises rather than falls. |
| **(c)** | **Re-impose once, then stop** | Arbitrary without a constitutional basis; recorded for completeness. |

**Recommendation: (a).**

**Why the Panel and not the implementer:** §3.1 prescribes a **bounded** consequence. Option (b)
converts it into an unbounded one. A bounded consequence a member cannot escape by acting is a
different instrument from the one §3.1 prescribes, and only the Panel can say the ladder means that.

---

## Q4 — Does the discharge invariant bind **merge**, or only **closure**?

**Escalation 6 — placement, not content. The invariant itself is not being reopened.**

**The invariant as authored** (verbatim, and to be preserved verbatim):

> **The completion condition of every restoration package Story 10.23 imposes must be satisfiable
> through a ratified system workflow.**

It is correctly phrased as a system property rather than a story key, and it is falsifiable against the
running system. **None of that is in question.** What is in question is where it binds. The story
states: *"Merging 10.23 is permitted; closing it is not."*

### The finding

**Today**, `scanR7ViolatorCandidates` has exactly **one** production consumer:
`apps/api/src/modules/trustee-lite/handlers.ts:246` — an on-demand read that **only displays** violator
flags to a trustee. Nothing is imposed; no coverage moves.

**Story 10.23's Task 4 adds a new call site in `apps/jobs`** that automatically **writes** impositions.
The story names **no feature flag and no dark-launch posture** for it. (AC7's "flag" is the
`specialFlags` payload wire, not a kill switch.)

So at the moment 10.23 merges — **not** at the moment it closes:

1. members enter coverage-removing lock-ins automatically, with **no human in the loop** — the first
   such instrument in the substrate;
2. R7(D) / R7(E) / R7(F) members receive packages **no workflow in the system can complete**, because
   contribution flows only to an **open** cycle (Story 7.6, fenced by 8.10) and a missed cycle is
   closed;
3. the **already-shipped** copy tells them otherwise. Verified live in both locales —
   `packages/i18n/locales/en/contribution.json:153` and its `hi` mirror:
   *"Contributing during this period counts toward completing your restoration."* For an
   R7(D)/(E)/(F) member that sentence is **not true**.

The invariant's content is right. Its placement lets every harm it describes land one step before the
gate.

| | Option | Consequence |
|---|---|---|
| **(a)** ⭐ ✅ *ratified* | **Gate the `apps/jobs` writer behind a rollout feature flag that defaults OFF.** Story 10.8's per-cohort flag substrate already exists. The invariant then binds the **flag flip**, which is where the harm actually begins. | 10.23 merges and is reviewable in full; nothing is imposed until the Panel says so. Smallest change; keeps the invariant verbatim. |
| **(b)** | **Split the binding by rung.** R7(A)/(B)/(C)'s packages *are* completable through ordinary contribution; only R7(D)/(E)/(F)'s are not. Impose for the completable rungs at merge; hold the rest behind the invariant. | Delivers most of the story's value immediately. Costs a rung-keyed condition at the imposition site, which sits uneasily with **D3**'s "no clause-id branch, ever" — it would have to key on the clause *payload*, not the clause id. |
| **(c)** | **Move the invariant to bind merge outright.** | Safest. Blocks the whole story on a catch-up mechanism that has no owner and no vehicle — the story is explicitly scoped **not** to build one. |
| **(d)** | **Keep as authored** — merge permitted, closure gated. | The status quo this note questions. Members are imposed upon, and told something untrue, for the entire interval between merge and discharge — an interval with no committed end. |

**Recommendation: (a)**, with **(b)** as a reasonable alternative if the Panel wants the completable
rungs live sooner.

### ✅ Ratified — and the flag's default and authorization are part of the ruling

A flag with an unstated default and an unnamed owner answers *"how is this held back?"* while leaving
*"who is allowed to release it?"* open. Both are now fixed:

> **The rollout flag defaults OFF in every environment except an explicit, trustee-authorized rollout.**
>
> **Authorization to turn it on is not an operational act.** It is tied to — and may not precede — the
> same governance decision that discharges Q4's invariant. No environment-level, per-cohort, or
> convenience enablement stands in for that decision, and enabling it in a non-production environment
> confers no authority to enable it in production.

The practical consequence for the implementer: the flag is **not** a deployment toggle whose default
happens to be off. It is the mechanism by which the discharge invariant is enforced, and flipping it
without the discharging Decision is a governance violation, not a configuration change.

### ✅ And the authority is OWNED — Decision `2026-08-07-089`

The ruling above named *what* authorizes a flip but not *who* holds that authority. Assigned
separately, and deliberately as its own entry rather than an amendment:

| Role | Owns | Does **not** own |
|---|---|---|
| **Trustee Panel** | **Authorization to activate**, exclusively and non-delegably — exercised through a formal `.decision-log.md` entry | Anything about the mechanism's construction or delivery |
| **Implementer** | Building the mechanism: overlay, writer, flag, gating, default-off behaviour, and the tests pinning them | **Any** authority to enable, in any environment, including their own |
| **Operations** | Deployment mechanics: how configuration reaches an environment, how a flip is executed, observed, rolled back | Any authority to decide that a flip **may** occur |

A ticket, a PR approval on a config change, a deployment sign-off, or a verbal go-ahead is **not** an
authorization and does not become one by being recorded afterwards. **If there is no Decision entry,
the flag is not authorized.**

⚠ **Naming the owner does not discharge the invariant.** The catch-up gap persists exactly as
described — R7(D)/(E)/(F) packages still name a completion act no workflow can perform. This assigns
*who may act*; it creates no mechanism and reduces no severity.

### Additionally owed, and **not** discharged by any option above

The copy defect stands on its own. `suspension_disclosure.lock_in.what_it_does` asserts completability
to members who have no completion path — the same false-statement-to-a-member harm class Story 10.16's
**D3** refused in writing. Two constraints on any fix, both from the story and both binding:

- **Fixing the copy does not discharge the invariant.** Honest copy about an unsatisfiable obligation
  leaves the obligation unsatisfiable. Necessary; not sufficient.
- **Do not resolve it by narrowing the disclosure's trigger** so R7(D)/(E)/(F) members see nothing.
  Silence about a coverage removal is worse than an imperfect explanation, and it re-creates the exact
  gap Story 10.16 was written to close.

A copy change needs a Story 2.2 tone sign-off and sits **above** this story. Routed here for the Panel
to assign, not for the implementer to absorb.

---

## What non-answer would have meant

*Retained as the reasoning that motivated the ruling; superseded in effect by Decision `2026-08-07-088`.*

Not answering would itself have been a disposition, with a specific shape:

- **Q1, Q2, Q3** — absent Trustee Panel ratification, the recommended posture would become the de facto
  policy embodied in the implementation. Each would have bound on merge, discoverable only by reading
  the imposition site, and amendable only by changing code rather than by a governance act. Q3 is where
  that matters most: had the recommendation *not* been the posture embodied, the system would impose an
  unbounded coverage removal by machine.
- **Q4** — option (d) would have stood by omission, and the interval between merge and discharge would
  have begun with no committed end.

This is the general hazard the note exists to interrupt: a governance question left unanswered does not
stay open — it is answered silently, by whatever the implementation happens to do, and its answer then
carries the authority of shipped behaviour without ever having been ratified.

---

## References

- `_bmad-output/implementation-artifacts/10-23-restoration-discipline-lock-in.md` — the story; AC2, AC3, AC5, Escalations 5, 6, 9, decisions **D2**, **D3**, **D8**
- Decision **2026-08-06-077** — 10.23 carries the fact-supply half only; does not inherit the Part 11 amendment
- Decision **2026-08-06-079** — Story 10.25 **D5**, the non-subsumption constraint Q1 turns on
- Decision **2026-08-06-080** — R7(F)/R7(G) ratified into §3.1; names Escalation 7 as a separate open question
- Decision **2026-08-07-086** — the ratified interpretive note (*"reconciliation or an authorized catch-up process"*) that converted catch-up from a deferred implementation into the governance gap behind Q4
- Decision **2026-08-07-084** — the per-question option-ratification format this note is written to be answered in
- `docs/legal/niyamavali.md` §1.3, §3.1, §3.3 — lock-in's definition, the per-rung table, the coverage effect
- `_bmad-output/planning-artifacts/ux-design-specification.md:89` — the SIE allowlist (Escalation 3; context for Q4)
- `packages/validity-service/src/rules.ts:275` — `R7_REGISTRY_UNPROVISIONED_PRODUCER`, Q2's precedent sentinel
- `packages/domain/seed/niyamavali-v1-clauses.sql:132-134` — `niy.lock-in.policy`'s provisioning obligation
- `packages/i18n/locales/en/contribution.json:153` (+ `hi` mirror) — the copy defect
- `apps/api/src/modules/trustee-lite/handlers.ts:246` — today's sole `scanR7ViolatorCandidates` consumer, read-only
- `packages/validity-service/src/payload.ts:67-71` — `VALID_STATES`, the Escalation 4 contradiction this note does **not** ask about
