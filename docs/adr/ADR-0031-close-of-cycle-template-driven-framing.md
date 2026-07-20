# ADR-0031: Close-of-cycle template-driven framing + Pool-Reality #2 disallowance (Story 7.8)

> **Status:** ratified
> **Date:** 2026-07-20 (date entered current status)
> **Author:** BigDev (Solo Builder), at Story 7.8 closure
> **Ratifying trustees:** Dhiraj Rahul (Trustee 1) + Kalpana Bharti (Trustee 2) — Trustee Panel session 2026-07-20; consent sheet `docs/knowledge-transfer/adr-ratification-consent-sheet-2026-07-20.md`; logged in `.decision-log.md` Decision 2026-07-20-067. Discharges the un-attested-pending record (author-committed 2026-07-19) — attested by a real quorum, no session fabricated, per [[feedback_record_unattested_no_backfill]].
> **Supersedes:** —
> **Superseded by:** —

## Context

FR-19 commits that close-of-cycle copy is **template-driven**, celebrates the **actual
delivered outcome**, and that **comparison-to-target framing is disallowed** (epics.md L60;
UX L152 "turns mutual-aid math into emotional payoff *without ever saying 'shortfall'*").
The load-bearing risk is the **under-funded** close: it correlates with grief, and the wrong
frame ("we fell short of the target", "62% achieved", a progress-meter-against-target — the
rejected Ketto/GoFundMe pattern, UX L541) would turn a dignified solidarity moment into a
failure narrative on the exact surface a nominee family reads.

Per [[feedback_architecture_vs_adr_boundary]], the architecture/PRD records the *property*
("close-of-cycle copy is template-driven; comparison-to-target framing is disallowed"); this
ADR records the *control mechanism* that enforces it. The consuming surfaces — Epic 8's
Panchayat Noticeboard pinned notice and Epic 11b's Sahyog Vivran per-claim memorial page
(FR-77) — do not exist yet, and the reconciled figures they interpolate (`deliveredTotal` /
`contributorCount`) are produced by Epic 9 reconciliation. So Story 7.8's deliverable is the
**copy policy + the executable framing seam + the enforcement teeth**, not a rendered surface
(the same primitive/consumer seam discipline as Stories 7.6/7.7).

Several scope questions were locked at create-story:

- **Where does the "under-funded never surfaces a comparison" guarantee live?** In a
  *convention each future consumer must remember*, or in a *tested, centralized invariant*?
  Left as a convention, it decays (the un-gated-commitment failure — [[feedback_record_unattested_no_backfill]]).
- **Is a new CI scanner needed?** The tone floor already exists (the Story 1.17 `microcopy`
  gate, ADR-0016, which already carries a `pool-reality-comparison` tone rule). A parallel
  "close-of-cycle lint" would over-gate a reliably-caught family ([[feedback_mechanization_split_commitment]]).
- **Does the target figure need to be persisted / surfaced?** No — surfacing it is the exact
  Pool-Reality #2 hazard.

Risk if undecided: the FR-19 "comparison-to-target disallowed" promise has no runtime teeth on
the new surface, and a green scan over new files would falsely read as coverage
([[feedback_gate_scope_semantic_coverage]]).

## Decision

**Ship close-of-cycle framing as (1) a bilingual, Hindi-primary template catalog, (2) a pure
outcome→template selection policy whose under-funded branch structurally cannot return a
comparison template, and (3) a target-quarantining outcome classifier — enforced by BOTH
existing tone layers extended (not duplicated) to cover the new surface.** The load-bearing
choices:

1. **A dedicated `close-of-cycle` i18n namespace** (`packages/i18n/locales/{en,hi}/close-of-cycle.json`,
   registered in `catalog.ts`) — a different surface/actor/register from the 7.6/7.7
   `contribution` payment-error copy (D1). Three outcome families (`fully_funded` /
   `under_funded` / `partial`); Hindi-primary + full parity (member-facing default, auto-enforced
   by the Story 2.1 `i18n-parity` gate — no `classification.json` edit); **Latin numerals via
   interpolation tokens** (`{contributorCount}`, `{amount}`) — the §8 v4 Devanagari carve-out is
   closed for FR-19 Noticeboard framing (UX L1127/L1308); dignified / Pattern-4 / grief-context
   register; members addressed as *सम्मानित साथी* / colleague, never donor.

2. **A pure `selectCloseOfCycleFraming(outcome)` policy** (`packages/domain/src/close-of-cycle/`)
   returning the canonical `close-of-cycle` template keys + the required interpolation-param
   contract. Exhaustive over the outcome union (a compile-time `never` default, the
   assignment/verdict precedent); deterministic + replay-safe; **no Fastify/DB/clock import**.
   The shape has only `titleKey`/`bodyKey` into the `close-of-cycle` namespace and that namespace
   carries no shortfall copy — so the `under_funded` (and `partial`) branch **structurally cannot**
   select a comparison template. This is the single seam Epic 8/11b/8.9 call: the outcome→template
   decision is made **once, tested once**.

3. **A companion `classifyCycleOutcome({ expectedTotal, deliveredTotal })`** (D2) that
   **quarantines the target**: the expected/target total flows *in* and only the
   `CycleFundingOutcome` enum flows *out* (`deliveredTotal >= expectedTotal → fully_funded`,
   else `under_funded`). The comparison is computed once, internally; the raw numbers physically
   never reach the copy path. `partial` is not derivable from a two-total comparison — it is a
   consumer-supplied outcome (a close acknowledged before the delivered figure is reconciled).
   Non-finite / negative / non-integer inputs throw (the 7.7 `Number.isInteger` guard precedent).

4. **Two-layer enforcement, both existing gates EXTENDED — no new scanner** (D4). The **automated
   floor** (Story 1.17 `microcopy`): the two locale files are added to `microcopy.yaml`
   `scope.copy_globs`, and the `pool-reality-comparison` tone pattern is **strengthened** for
   close-of-cycle variants (`shortfall`, `short of the target/goal`, `N% of the target/goal`,
   `goal (not) met`, `couldn't/didn't reach`) plus one high-signal Hindi phrase (`लक्ष्य से कम`)
   (D3). **Teeth are proven**, not asserted: a planted-violation fixture + a revert-sanity on the
   real JSON (plant → red naming file:line → remove → green), per [[feedback_gate_scope_semantic_coverage]].
   The **human ceiling** (Story 2.2 tone-review): close-of-cycle is registered as a governed
   surface in `docs/tone-review-checklist.md` Publish-routing; the runtime sign-off enforcement is
   the consumer's (Epic 8 / 11b wires the existing `evaluateToneReviewGate`, exactly as Story 2.4
   did for the Niyamavali). A passing lint does not waive the human review; the human review does
   not waive the lint (tone-guide §5).

5. **No migration, no schema, no `@twt/contracts` DTO** (D6). The template keys are strings the
   domain returns and the i18n catalog defines; no cross-package boundary validates them yet
   (enum-width / [[feedback_no_premature_package]]). If Epic 11b later needs a validated DTO across
   a package boundary, it is added in *that* story.

## Alternatives considered

- **Fold the keys under `contribution.close_of_cycle.*`** — Rejected (D1): muddles two registers
  (payment-error validation vs cycle-outcome celebration) and drags the whole `contribution`
  namespace's future keys into the celebration-copy scope reasoning. A dedicated namespace keeps
  the `copy_globs` scope surgical (exactly two files) and lets the selector return a single
  `namespace` constant.
- **Ship only the selector; let each consumer classify the outcome** — Rejected (D2): the
  target-quarantine invariant would then live in each consumer, not in the tested governance layer.
  Shipping the classifier too makes "the numbers physically cannot reach the copy path" a
  centralized, tested property.
- **A new / parallel "close-of-cycle" CI lint** — Rejected (D4): over-gates a family the
  `microcopy` gate already reliably catches. A scope + semantic-coverage extension of the owning
  gate (copy_globs + strengthened pattern + proven teeth) is the complete mechanization
  ([[feedback_mechanization_split_commitment]]).
- **Make the regex exhaustive over natural language** — Rejected (D3): impossible, and false
  confidence. The lint covers the literal/high-signal forms; the human tone-review explicitly owns
  the paraphrased / spelled-out / template-literal tail (tone-guide §5).
- **Persist the cycle's shortfall figure for audit** — Rejected: surfacing or storing the shortfall
  into the member-visible path is the exact Pool-Reality #2 hazard. The framing decision is
  reproducible from the pure selector + the versioned templates + the two gate results — no
  shortfall figure need be persisted to make it auditable (AC4).

## Consequences

- **Operational** — A new governed surface lands installed-but-unrendered: the templates + the
  selector/classifier exist; Epic 8 (Noticeboard) and Epic 11b (Sahyog Vivran) render them and wire
  the tone-review sign-off; Epic 9 reconciliation sources the totals; Story 8.9 owns the close
  *timing*. The `microcopy` gate's `copy_globs` now scans 6 member files (was 4).
- **Security / privacy** — Neutral-to-positive: the target/shortfall is quarantined in a pure
  classifier and never persisted or surfaced. The template *files* carry no PII themselves —
  amounts and names arrive as `{token}`s, never literal values. `{familyName}` is a required
  interpolation param and IS PII once a consuming surface renders it (a deceased member's family
  name, on a public-facing Noticeboard/memorial page) — handling that responsibly (display scope,
  consent posture) is the rendering consumer's (Epic 8 / 11b's) responsibility, not something this
  story's template-key contract enforces.
- **Performance** — None: pure synchronous functions; the gate is an invariant scan of two small
  JSON files.
- **Cost** — None.
- **Failure modes accepted** — (a) The templates are rendered by no surface at Story 7.8 (inert
  until Epic 8/11b) — the deliberate land-once posture. (b) The `microcopy` regex cannot catch every
  paraphrase; the human tone-review is the required second layer. (c) `partial` is consumer-supplied,
  not classifier-derived — documented in the module so a consumer does not expect the two-total
  classifier to emit it.
- **Migration / pivot path** — If a future outcome family is added, extend `CYCLE_FUNDING_OUTCOMES`
  + add a template family + a selector branch (the `never` default forces the branch at compile
  time) + a locale key pair (parity-enforced). Reverse via a successor ADR.

## Ratification (2026-07-20)

Ratified by ≥2 trustees (Dhiraj Rahul + Kalpana Bharti) at the 2026-07-20 Trustee Panel
session; consent sheet `docs/knowledge-transfer/adr-ratification-consent-sheet-2026-07-20.md`;
logged in `.decision-log.md` Decision 2026-07-20-067. This discharges the un-attested-pending
record carried from the 2026-07-19 author-commit — the ratification is now attested by a real
quorum, not reconstructed ([[feedback_record_unattested_no_backfill]]).

Presented as **policy-adjacent**: the mechanism (the `close-of-cycle` i18n namespace + the pure
`selectCloseOfCycleFraming` selector + the target-quarantining `classifyCycleOutcome` + the
scope+semantic extension of the ADR-0016 microcopy floor and the ADR-0019 tone-review ceiling)
is engineering substrate, but the FR-19 **Pool-Reality #2 disallowance** it enforces — an
under-funded close must never surface a comparison-to-target frame on a nominee-family grief
surface — is a dignity commitment materially the trust's. The panel affirmed the *structural*
control (the target/shortfall figure is quarantined in the classifier and cannot reach the
copy-selection path; the `under_funded` branch cannot return a comparison template because the
namespace carries no shortfall copy, guarded by the microcopy gate over the two locale files)
over a decay-prone per-consumer convention.

**Deferred to the rendering consumers (NOT discharged by this ratification, by design):** the
`{familyName}` interpolation param is PII once a surface renders a deceased member's family name
publicly; this ADR intentionally does not define that policy — display scope, consent posture,
and publication rules remain Epic 8's (Panchayat Noticeboard) and Epic 11b's (Sahyog Vivran)
responsibility, tracked in those stories.

## References

- [Source: epics.md, Story 7.8] — the four ACs (templates per outcome; Pool-Reality #2 disallowance lint-checked; bilingual + Pattern 4; publish blocked on violation; Epic 11b consumer framing)
- [Source: epics.md L60 (FR-19)] — close-of-cycle copy template-driven; celebrates actual outcome; comparison-to-target disallowed; [Source: epics.md L146 (FR-77)] — Sahyog Vivran consumer
- [Source: ux-design-specification.md L985] — canonical FR-19 copy; L391/L402 register; L1122-1127/L1308 §8 v4 Latin-numeral rule; L2334-2360 Pattern 4; L541 rejected progress-meter frame
- [Source: microcopy.yaml L52-106] — the `pool-reality-comparison` tone rule + `scope.copy_globs` extended; [Source: scripts/microcopy/lib.ts / check.ts / close-of-cycle.test.ts] — the gate engine + the proven teeth
- [Source: docs/tone-guide.md §3, §5] + [docs/tone-review-checklist.md Publish-routing] — the human-layer Pool-Reality #2 frame + the governed-surface registration
- [Source: packages/domain/src/close-of-cycle/framing.ts] — `selectCloseOfCycleFraming` + `classifyCycleOutcome`; [Source: packages/i18n/src/catalog.ts] — namespace registration
- [Source: ADR-0016] — the Story 1.17 `microcopy` automated floor (extended, not duplicated); [Source: ADR-0019] — the Story 2.2 tone-review human ceiling (the mechanism the consumer wires)
- [Source: `docs/knowledge-transfer/adr-index.md`] — the live Section A index row for this ADR
- Memory: [[feedback_gate_scope_semantic_coverage]] (teeth over green; revert-sanity); [[feedback_mechanization_split_commitment]] (extend the owning gate, don't add a parallel scanner); [[feedback_no_premature_package]] (no contracts DTO); [[feedback_architecture_vs_adr_boundary]] (ADR records control, architecture records property); [[feedback_record_unattested_no_backfill]] (ratification recorded un-attested-pending, no fabricated session)

---

## Changelog

| Date | Status flip | Author | Notes |
|---|---|---|---|
| 2026-07-20 | drafted → ratified | Dhiraj Rahul + Kalpana Bharti | Ratified at the 2026-07-20 Trustee Panel session (policy-adjacent — the FR-19 grief-surface dignity commitment affirmed; mechanism is substrate). Discharges the un-attested-pending record — attested by a real quorum, no session fabricated. `.decision-log.md` Decision 2026-07-20-067; consent sheet `adr-ratification-consent-sheet-2026-07-20.md`. |
| 2026-07-19 | (initial draft) | BigDev (Solo Builder) | Authored under Story 7.8 (close-of-cycle template-driven framing) closure. Ratification un-attested-pending — a reviewer convenes the Trustee Panel; no session fabricated. |
