# Trustee Panel Routing Note — Story 10.23, AC14 Flag Mechanics

**Status:** ✅ **Ruled 2026-08-09 — both questions ratified at Option (a), with one Panel direction on
Q2's population.** Binding record: Decision `2026-08-09-093`. **This note is the question set; the
Decision entry governs.**
**Ruled:** 2026-08-09 by the Trustee Panel. The Q2 ruling carries a direction recorded verbatim in
`2026-08-09-093` clause 3: *"Apply the mechanism to the members to whom the currently activated
restoration rules apply. Do not narrow this wording to R7(D)/(E) only; the applicable population is
determined by which restoration rules are currently activated."* ⚠ Two consequences are recorded in the
Decision rather than here, because they are findings against the substrate rather than parts of the
ruling: that direction **mandates no code change** (the writer already derives its population from
clause data, and a rung-keyed branch would violate D3), and it **cannot serve as a cohort** (no cohort
dimension can express it — see `2026-08-09-093` clause 4 and its first open follow-up).
⚠ **Superseded in part by Decision `2026-08-09-094`:** the Panel has since clarified that the rollout
scope is **all Pariwars**, which is the `full` state, where the cohort is ignored entirely. That
**withdraws** `093`'s "a `pariwar_id` cohort is still owed" follow-up and **scopes** its clause 6 to the
two intermediate states. Read `094` alongside `093`; the population constraint in `093` clause 4 is
unchanged and reaffirmed.
**Author:** BigDev (Solo Builder)
**Raised:** 2026-08-09, against the post-merge findings in
`_bmad-output/implementation-artifacts/10-23-restoration-discipline-lock-in.md` (§ *Post-merge
Findings — production-path validation against the live 8.14 emitter*), as committed at `665b519`.
Those findings were measured off `main` @ `0f72c37` (Story 8.14's `alert.closed` producer).
**Story state:** 10.23 is `done` and merged (`7729951`, `9c08020`). **Nothing here reopens it.**
**Disposition on ruling:** a `.decision-log.md` entry in the per-question option-ratification pattern of
Decision `2026-08-07-084`, as its successor entries `2026-08-07-088` / `089` were for the first note.

---

## Why this note exists

Story 8.14 (`0f72c37`) shipped the `alert.closed` producer, which made it possible for the first time to
drive `cycle open → close sweep → alert.closed → projection → contribution facts → R7 scan → imposition
→ fold` from **real production code** rather than fixtures. Doing so surfaced two observations about
the AC14 flag — not about shipped behaviour, which is correct and fail-safe in every arm measured.

**This note is narrow by design.** It is the second Panel note on Story 10.23. The first
(`trustee-panel-routing-note-2026-08-07-story-10-23.md`, ruled into Decisions `2026-08-07-088` and
`089`) asked *whether* the writer should be flag-gated and *who* may enable it. Both were answered:
gated, default-OFF, Trustee-Panel-exclusive and non-delegable.

This note asks neither of those again. It asks **what a single exercise of that authority covers**, and
**what must be observable before it is exercised**. Both are downstream of `089`, not challenges to it.

> ⛔ **Nothing in this note discharges Escalation 6, and nothing in it asks the Panel to.** The
> catch-up gap stands exactly as Decision `2026-08-08-092` clause 4 restates it: R7(D)/(E)/(F) packages
> still name a completion act no workflow in the system can perform. Both questions below are about the
> *instrument* of enablement, and are live whether or not the invariant is ever discharged.

### What is deliberately NOT here

| | Why it is not a question |
|---|---|
| **The third sentinel's construction** | Implementer-owned under `2026-08-07-089`'s ownership table ("building the mechanism… and the tests pinning them"). The Panel owns authorization, not construction. Only its *sequencing* is asked, in Q1. |
| **Escalation 6's discharge** | Unchanged and outstanding. Routes named in `2026-08-08-092`; authority is the Panel's, exclusively. |
| **The copy-truth defect** | Still separately owed, still needs a Story 2.2 tone sign-off owner, still not fixable by narrowing the disclosure's trigger. Untouched here. |
| **R7(B)'s hold** | Newly evidenced as resting on the unpublished Part 11 amendment **alone** — every fact blocker is now satisfied in production. Recorded as evidence in the story artifact. **No reclassification is proposed and none is owed** unless the amendment is published. |

---

## Q1 — Is a projection-coverage sentinel owed *before* the flag is ever flipped?

> ✅ **RULED — Option (a), Decision `2026-08-09-093`.** The A/B choice is closed and is not to be reopened.

**Governs AC13 / AC14 sequencing. Arises from Finding 1.**

**The gap.** `deriveContributionFacts` returns `null` when projection coverage is absent
(`packages/validity-service/src/producer.ts:508` — `if (input.coveredFrom === null) return null`).
Without a `contribution_projection_coverage` row, **every** member degrades to the
`producer_unavailable` sentinel and **no R7 clause can apply**.

`scanR7ViolatorCandidates` handles this honestly, and the Trustee-Lite surface renders
`detection_unavailable`. But `runRestorationDiscipline`'s own result does **not** carry the
distinction. Measured live on 2026-08-09 with coverage absent:

```
{ writerEnabled: false, unavailable: null, membersScanned: 1, impositionsWritten: 0, skipped: {} }
```

That is **byte-identical to a genuinely clean Pariwar.** The `unavailable` field
(`apps/jobs/src/restoration-discipline.ts:66`) is the field built to name exactly this class of gap. It
already carries two producers, deliberately kept distinct so an operator is not sent to provision the
wrong instrument:

- `R7_REGISTRY_UNPROVISIONED_PRODUCER` = `'niyamavali-registry'` (`rules.ts:333`)
- `RESTORATION_POLICY_UNPROVISIONED_PRODUCER` = `'niyamavali-registry:restoration-discipline-policy'` (`restoration-discipline.ts:261`)

Projection coverage is a **third** such gap with no sentinel of its own.

**Why this reaches the Panel at all.** The sentinel is implementer work. What is *not* implementer work
is whether it is a **precondition of the flip**: after a flip, `unavailable` is the field an operator
reads to confirm the writer did nothing *for the right reason*. A flip into a coverage-less Pariwar
currently reports success-shaped silence.

⚠ **This bit the validation pass that found it.** The first run reported `applied = []` and was misread
as a clause gap until coverage was backfilled. That was a developer with the source open; an operator
post-flip has only the job result.

| | Option | Consequence |
|---|---|---|
| **(a)** ⭐ | **Sentinel owed before any flip.** A third `unavailable` producer for absent projection coverage, shipped and pinned by a test, is a precondition of the enabling Decision. | The operator-visible signal exists at the moment it first matters. Costs one constant, one arm, one test — no governance surface. |
| **(b)** | **Owed, but not blocking.** Record it in `deferred-work.md`; the flip may precede it. | Cheaper sequencing; leaves the first flip — the highest-attention, least-reversible one — as the one without the signal. |
| **(c)** | **Not owed.** `membersScanned` is a sufficient proxy; an operator can infer the gap. | Rejected in the finding's own reasoning: `membersScanned: 1` was reported *with* the gap present. The proxy does not discriminate. |

**Recommendation: (a).** It is the smallest of the three and the only one under which the first flip is
observable. ⚠ The Panel is **not** being asked to design the sentinel — only to say whether it precedes
the flip.

---

## Q2 — What does a single AC14 authorization cover: the first enabling version, or the whole ramp?

> ✅ **RULED — Option (a), Decision `2026-08-09-093`.** The A/B choice is closed and is not to be reopened.

**Governs AC14 and the enabling Decision's own form. Arises from Finding 2.**

**The gap.** `2026-08-07-089` fixes authorization as "a formal `.decision-log.md` entry" — singular. The
substrate stages enablement across a ramp. AC14 is silent on how one maps to the other.

### The mechanics, verified live 2026-08-09

1. **`off → full` is rejected.** `LEGAL_FLAG_STATE_TRANSITIONS`
   (`packages/domain/src/feature-flags/registry.ts:71-79`) admits `off` only to `off` or `canary`.
   Reaching `full` takes three `createFlagVersion` calls and three audit rows.
2. **But the count is not the governance-relevant number.** **Coverage removal begins at the FIRST
   enabling version** — `off → canary` with a non-empty cohort. **One call.** The remaining two only
   widen *who else* loses coverage.
3. **An empty cohort resolves to `enabled: false`** (`evaluate.ts:164`, `reason: 'cohort_empty'`).
   `FLAG_DEFAULTS.restoration_discipline_imposition` ships `cohortDefinition: { clauses: [] }`
   (`registry.ts:207`). So a Decision that says "flip to canary" **without naming a cohort
   authorizes something that serves nobody.**
4. ⚠ **The admin console has no cohort editor** and "carries the existing (empty) cohort forward" (Review
   Pass 4 comment, `evaluate.ts`). The path that populates a cohort is not the console path.
5. **A 5 s in-process TTL** (`FLAG_CACHE_TTL_MS`, `cache.ts:36`) means a resolution taken shortly before
   a flip continues to serve `state_off` until it expires — observed in this pass.

Each behaviour is correct and fail-safe in isolation. Together they mean a correctly-authorized flip can
look like it did nothing, and the state most likely to be mistaken for a broken toggle is an
already-`canary` flag with an empty cohort.

| | Option | Consequence |
|---|---|---|
| **(a)** ⭐ | **One Decision authorizes ONE enabling version, naming its cohort explicitly.** Each widening (`canary → rollout → full`) requires its own entry. | The Panel only ever authorizes a cohort it has seen. Costs three entries to reach `full`. Matches `089`'s non-delegable framing most literally. |
| **(b)** | **One Decision authorizes the FULL ramp,** with the cohort at each stage specified in advance. | One governance act, as AC14's language suggests. Requires the Panel to fix all three cohorts before observing the behaviour of any — authorizing the widest blast radius before the narrowest has run. |
| **(c)** | **One Decision authorizes the ramp, with operational discretion over cohort composition.** | Fewest entries. ⛔ Delegates cohort choice to Operations, which `2026-08-07-089` reserves to the Panel and states is non-delegable. Recorded for completeness; believed foreclosed by `089`. |

**Recommendation: (a).** Under (b) the Panel authorizes the `full` cohort at a moment when no imposition
has ever been observed in production. (a) preserves the property that made option (a) of the first note
correct: nothing is imposed until the Panel says so, *for each population*.

### ⚠ Answer-independent, and therefore stated outside the table

**Under all three options, an enabling Decision must name a non-empty cohort, or it authorizes nothing.**
This is not a consequence of any particular ruling — it follows from `cohort_empty` and holds however Q2
is answered. It is stated here so it cannot be read as belonging to whichever option is selected.

Recommended as a **form requirement on the entry itself**: an enabling Decision for
`restoration_discipline_imposition` must state (i) the target state, (ii) the cohort clauses verbatim,
and (iii) that the cohort is non-empty. A Decision that omits (ii) is not a narrower authorization —
it is a vacuous one that will read, afterwards, as an authorized flip that failed.

---

## What non-answer would mean

Consistent with the first note's closing reasoning, and stated because the same hazard applies:

- **Q1 unanswered** — the flip proceeds without the sentinel by default, and the first flip is the one
  performed without the signal. The failure is silent and shaped exactly like success.
- **Q2 unanswered** — the enabling Decision's scope is settled by whoever drafts it, and its cohort
  content by whoever executes it. Both then carry the authority of a ratified Decision without having
  been ratified. If the drafter omits the cohort, the Panel's authorization is spent on a flip that
  removed no coverage — and the *second*, corrective flip is the one that does, under an authorization
  written for the first.

⚠ The failure direction in both is **safe** — the writer stays off. That is why neither is a defect, and
also why neither would be noticed until someone re-flips.

---

## References

- `_bmad-output/implementation-artifacts/10-23-restoration-discipline-lock-in.md` — § *Post-merge Findings*, Findings 1 and 2; the R7(B) evidence entry
- `trustee-panel-routing-note-2026-08-07-story-10-23.md` — the first note; Q4 is this note's parent
- Decision **2026-08-07-088** clause 4 — Escalation 6 binds the flag flip rather than story closure
- Decision **2026-08-07-089** — enablement authority: Trustee Panel, exclusive and non-delegable; the ownership table Q1 turns on
- Decision **2026-08-08-092** — the "alone" transcription correction; confirms `done` stands and the invariant is UNDISCHARGED
- Decision **2026-08-07-084** — the per-question option-ratification format this note is written to be answered in
- `packages/validity-service/src/producer.ts:508` — the coverage gate behind Q1
- `apps/jobs/src/restoration-discipline.ts:66,159,170` — the `unavailable` field and its two existing producers
- `packages/domain/src/feature-flags/registry.ts:71-79` — `LEGAL_FLAG_STATE_TRANSITIONS`
- `packages/domain/src/feature-flags/registry.ts:205-217` — the flag's default; `cohortDefinition: { clauses: [] }` at `:207`
- `packages/domain/src/feature-flags/evaluate.ts:164` — `cohort_empty`, and the Review Pass 4 comment on the missing cohort editor
- `packages/domain/src/feature-flags/cache.ts:36` — `FLAG_CACHE_TTL_MS`
