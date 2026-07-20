# ADR Ratification — Trustee Consent Sheet (2026-07-20)

**Purpose:** collect Trustee Panel consent for the one ADR currently `drafted` and
awaiting ratification — **ADR-0031** (close-of-cycle template-driven framing + Pool-Reality
#2 disallowance), authored 2026-07-19 at Story 7.8 closure and recorded
**un-attested-pending** (author-committed; no Trustee Panel session fabricated, per
[[feedback_record_unattested_no_backfill]]). Mark **Ratify / Defer / Reject** and initial.

**Trustee Panel (≥2-trustee quorum required to ratify):** Dhiraj Rahul (Trustee 1) · Kalpana Bharti (Trustee 2)
**Prepared by:** BigDev (Solo Builder)
**Authority for the flip:** `docs/adr/README.md` lifecycle (`drafted → under-trustee-review → ratified`); `docs/knowledge-transfer/adr-index.md` is the authoritative status ledger.

> Status as of 2026-07-20: ADR-0031 is the **only** Section A ADR currently in the `drafted`
> state (all other Section A ADRs are `ratified`). It has not previously been presented to
> the Trustee Panel. Its
> `adr-index.md` Section A row already exists (added 2026-07-19 as `drafted`) — no index
> hygiene gap this session, only a status flip pending quorum.

---

## Read-first priority

**ADR-0031 is policy-adjacent — read closely.** The implementation mechanism is engineering
substrate (a dedicated `close-of-cycle` i18n namespace, a pure `selectCloseOfCycleFraming`
selector, a target-quarantining `classifyCycleOutcome` classifier, and scope+semantic
extensions to two already-ratified governance gates — ADR-0016 microcopy floor + ADR-0019
tone-review ceiling — with no new scanner). The policy being protected is a Trust decision —
a **load-bearing dignity commitment** materially the trust's to affirm:

> **FR-19 Pool-Reality #2 disallowance** — on the exact surface a nominee family reads at
> close-of-cycle (the Panchayat Noticeboard pinned notice; later the Sahyog Vivran memorial
> page), an **under-funded** close must **never** surface a comparison-to-target frame
> ("we fell short", "62% achieved", a progress-meter-against-target). The ADR enforces this
> *structurally*: the target/shortfall figure is quarantined inside the classifier and
> **cannot reach the copy-selection path**, and the `under_funded` branch of the selector
> **cannot return a comparison template** because the namespace carries no shortfall copy.

The panel is being asked to affirm that this structural guarantee — not merely a convention
each future consumer must remember — is the right control for the FR-19 dignity property.

---

## Consent table

| # | ADR | Decision (one line) | Owning story/event | Status | Recorded gate / caveat | Weight | Trustee decision |
|---|---|---|---|---|---|---|---|
| 1 | **ADR-0031** close-of-cycle-template-driven-framing | Ship FR-19 close-of-cycle framing as (a) a bilingual Hindi-primary `close-of-cycle` i18n namespace (3 outcome families `fully_funded`/`under_funded`/`partial`; Latin numerals via `{token}`s; dignified/Pattern-4/grief register; colleague-not-donor), (b) a pure exhaustive `selectCloseOfCycleFraming(outcome)` whose `under_funded`/`partial` branch **structurally cannot** return a comparison template, (c) a target-quarantining `classifyCycleOutcome({expectedTotal,deliveredTotal})` (only the enum flows out — the numbers never reach copy), enforced by BOTH existing tone layers **extended, not duplicated** (microcopy `copy_globs`+`pool-reality-comparison` pattern strengthened with teeth proven via planted fixture + revert-sanity; tone-review governed-surface registration). No new scanner, no migration/schema/contracts DTO. | Story 7.8 | `drafted` (2026-07-19) | Architecture/PRD commits the *property* (FR-19: template-driven, comparison-to-target disallowed); this ADR commits the *control mechanism* — per [[feedback_architecture_vs_adr_boundary]] the source of truth for the enforcement design, not a backfill. Templates land installed-but-unrendered (Epic 8 Noticeboard / Epic 11b Sahyog Vivran render them; Epic 9 sources totals; Story 8.9 owns close timing). | **Policy-adjacent — read closely** (FR-19 grief-surface dignity commitment; mechanism is substrate) | Ratify / Defer / Reject : _______  init: _______ (KP) _______ (DR) |

---

## ADR-0031 detail — what you're being asked to ratify

**The gap (why a control, not a convention):** FR-19 says close-of-cycle copy is
template-driven and comparison-to-target framing is disallowed. Left as *a convention each
future consumer must remember*, that promise decays — the un-gated-commitment failure
([[feedback_record_unattested_no_backfill]]). The consuming surfaces (Epic 8 Noticeboard,
Epic 11b Sahyog Vivran) and the reconciled figures they interpolate (Epic 9) do not exist
yet, so Story 7.8's deliverable is deliberately the **copy policy + the executable framing
seam + the enforcement teeth**, not a rendered surface (the 7.6/7.7 primitive/consumer
discipline).

**What does NOT change / scope boundaries the ADR states explicitly:**

1. **No new CI scanner** — the `pool-reality-comparison` tone rule already exists in the
   Story 1.17 `microcopy` gate (ADR-0016). A parallel "close-of-cycle lint" would over-gate a
   reliably-caught family ([[feedback_mechanization_split_commitment]]). The ADR extends the
   *owning* gate's scope (2 locale files → `copy_globs`) and *strengthens* the existing
   pattern (close-of-cycle variants: `shortfall`, `short of the target/goal`,
   `N% of the target/goal`, `goal (not) met`, `couldn't/didn't reach`, + the Hindi
   `लक्ष्य से कम`) — with **teeth proven**, not asserted (planted-violation fixture +
   revert-sanity on the real JSON: plant → red at file:line → remove → green), per
   [[feedback_gate_scope_semantic_coverage]].
2. **The lint is not exhaustive over natural language** (§Alternatives) — it covers the
   literal/high-signal forms; the **human tone-review** (ADR-0019, wired at runtime by the
   Epic 8/11b consumer via the existing `evaluateToneReviewGate`, the Story 2.4 pattern) owns
   the paraphrased / spelled-out tail. A passing lint does not waive the human review; the
   human review does not waive the lint.
3. **The shortfall figure is neither persisted nor surfaced** — surfacing/storing it into the
   member-visible path *is* the Pool-Reality #2 hazard. The framing decision is reproducible
   from the pure selector + the versioned templates + the two gate results; no shortfall
   figure need be persisted to make it auditable (AC4).
4. **`partial` is consumer-supplied, not classifier-derived** — the two-total classifier emits
   only `fully_funded` / `under_funded`; `partial` is a close acknowledged before the delivered
   figure is reconciled. Documented in the module so a consumer does not expect the classifier
   to emit it.

**Points the panel may want to probe before signing** (surfaced here, not left implicit):

1. **`{familyName}` is PII once rendered** — the template *files* carry no PII (amounts/names
   arrive as `{token}`s), but `{familyName}` is a required interpolation param and IS PII once
   a consuming surface renders a deceased member's family name on a public-facing
   Noticeboard/memorial page. **This ADR intentionally does not define that policy.** Display
   scope, consent posture, and publication rules remain the responsibility of the rendering
   consumers (Epic 8 / Epic 11b) — the panel should confirm it is comfortable deferring that to
   the consuming story, as the ADR does.
2. **The dignity guarantee rests on the namespace carrying no shortfall copy** — the structural
   claim ("`under_funded` cannot return a comparison template") holds only so long as no future
   editor adds shortfall copy into `close-of-cycle.{en,hi}.json`. The microcopy gate over those
   two files is exactly what guards that — the panel is ratifying the gate as the durable teeth,
   not the current file contents alone.

None of these are blocking — they are the ADR's own stated scope boundaries.

---

## After the session — what I do per ratified row

Same 3-surface cascade run for every prior ADR ratification (a status flip in one place
without the others is a framework gap per `adr-index.md`):

1. **ADR file** (`ADR-0031-close-of-cycle-template-driven-framing.md`) — `Status: drafted →
   ratified`, `Date` → `2026-07-20 (date entered current status)`, `Ratifying trustees` filled
   in, changelog row appended. Any Pool-Reality #2 / dignity discussion recorded as a
   Ratification note (mirroring how ADR-0021 carries its governance clarification).
2. **`adr-index.md`** — flip the ADR-0031 Section A row `drafted → ratified`; update the
   status-count breakdown (`drafted` 1→0, `ratified` 28→29, Total unchanged at 148); refresh
   the ledger note; supersede the "ratification un-attested-pending" caveat on the row (now
   attested).
3. **`.decision-log.md`** — one ratification entry, next number `2026-07-20-067` (last entry
   on file: `2026-07-19-066`).

---

## Session Resolution

The Trustee Panel (KP, DR) reviewed ADR-0031 as presented in this sheet. Quorum met
(≥2 trustees). No deferral, no rejection, no amendments recorded on the row.

| ADR | Decision | Amendments / conditions |
|---|---|---|
| ADR-0031 | ☑ Ratified | None |

Trustee initials: __dr__ (DR)  __kp__ (KP)   Date: 2026-07-20

Logged in `.decision-log.md` as Decision `2026-07-20-067`. Cascade applied 2026-07-20 (below).

---

### Footnote — ratification weight (for triage, grounded in the decision log)

Consistent with the 2026-06-21 / 2026-07-08 sheets' distinction:
- **Light-touch** — engineering-substrate / reversible-tooling ADRs.
- **Trustee-judgment** — security / data-model / policy ADRs where the choice is materially
  the trust's.
- **Policy-adjacent** — mixed: mechanics are substrate, but a policy commitment is embedded.
  **ADR-0031 sits here** — the i18n namespace + pure selector + gate-scope extension are
  substrate, but the FR-19 grief-surface dignity guarantee (Pool-Reality #2 disallowance) is a
  policy commitment materially the trust's to affirm.

The weight column is a triage aid, not a status — the row still requires the ≥2-trustee
quorum to flip to `ratified`.

---

## Cascade applied — 2026-07-20

ADR-0031 ratified (not deferred, not rejected, no amendments); quorum met (DR + KP, per the
consent-table initials and the Session Resolution line). The 3-surface cascade was run per
Decision **`2026-07-20-067`**:

- **`ADR-0031-close-of-cycle-template-driven-framing.md`** flipped `drafted` → `ratified`
  (`Status`, `Date` → `2026-07-20 (date entered current status)`, `Ratifying trustees` filled
  in, `## Ratification (2026-07-20)` section + changelog row appended). The
  un-attested-pending caveat is discharged (ratification now attested).
- **`adr-index.md`** — ADR-0031 Section A row flipped `drafted` → `ratified`; status-count
  breakdown updated (`drafted` 1→0, `ratified` 28→29, Total unchanged at 148); ledger note
  refreshed; the row's "ratification un-attested-pending" caveat superseded.
- **`.decision-log.md`** — Decision `2026-07-20-067` appended (single-ADR ratification;
  discharges the Story 7.8 un-attested-pending record per [[feedback_record_unattested_no_backfill]]
  — attested by a real quorum, not a fabricated earlier session).

**Open follow-ups carried forward (NOT closed by this ratification):** none — ADR-0031's
implementation shipped at Story 7.8 closure (templates + selector + classifier + gate
extensions are landed-but-unrendered; Epic 8 / Epic 11b are the rendering consumers, tracked
in their own stories).
