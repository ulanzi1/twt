# ADR Ratification — Trustee Consent Sheet (2026-08-01)

**Purpose:** collect Trustee Panel consent for **ADR-0036** (feature-flag tool selection — an
in-house subsystem integrated into TWT's primary transactional platform, Google Cloud SQL for
PostgreSQL, avoiding an additional external feature-flag service for v1), authored 2026-07-31 at Story 10.8 closure,
and for the **coupled capability-bar admission batch** recorded in `.decision-log.md` Decision
`2026-08-01-069`, which cites ADR-0036 on all four of its entries and is itself
un-attested-pending. Mark **Ratify / Defer / Reject** and initial.

**Trustee Panel (≥2-trustee quorum required to ratify):** Dhiraj Rahul (Trustee 1) · Kalpana Bharti (Trustee 2)
**Prepared by:** BigDev (Solo Builder)
**Authority for the flip:** `docs/adr/README.md` lifecycle (`drafted → under-trustee-review → ratified`); `docs/knowledge-transfer/adr-index.md` is the authoritative status ledger.

> Status as of 2026-08-01: ADR-0036 is one of **five** Section A ADRs currently `drafted`
> (ADR-0032/0033/0034/0035 are the other four — those are explicitly deferred to Story 14.7's
> AR-69 backlog closure per the adr-index ledger notes and are **not** on this sheet).
> ADR-0036 has not previously been presented to the Trustee Panel. Its `adr-index.md` Section A
> row already exists (added 2026-07-31 as `drafted`) — no index-hygiene gap this session, only
> a status flip pending quorum.
>
> Decision `2026-08-01-069` (the four-entry `governance_boundary.yaml` admission batch) is a
> **separate** decision-log item, not an ADR-index row, but it is presented alongside ADR-0036
> because all four admitted entries cite ADR-0036 as their ADR reference — ratifying one without
> the other leaves the attestation chain complete in form but incomplete in authority on the
> other half.

---

## Read-first priority

**ADR-0036 gates a P1 load-bearing dependency — read closely.** Architecture §Deferred
Decisions L200-229 names feature-flag tool selection as required *before* the first
FR-58C-gated cohort rollout, whose canonical case is the DigiLocker-mandatory cutover
(PRD A-4). The mechanism itself is a **route to change production behaviour without a code
review** — which is exactly why the panel's sign-off matters here, not just as a formality.

The ADR is candid about its own limits; the panel should read these before signing, not
discover them later:

1. **A prior attestation was FALSE and has been corrected.** The `kyc_manual_fallback` rationale
   originally claimed `fallback_default: true` meant "fallback available," and shipped saying so.
   It meant the opposite — an unevaluable cohort rule traced through to KYC becoming
   **hard-mandatory**, the exact outcome the sentence said was impossible. The constant is now
   `false` and the rationale rewritten. The panel is ratifying the **corrected** text
   (`.decision-log.md` Decision `2026-08-01-069` item 3), not the one that shipped first.
2. **The admission workflow's own first use skipped its own requirement.** `governance_boundary.yaml`
   requires trustee attestation for every admission; it shipped with four seeded entries and no
   such record. Decision `2026-08-01-069` is that record, written retroactively. This sheet is
   the belated ratification step.
3. **Three of the four admitted behaviours have no live consumer.** Only `kyc_manual_fallback`
   is wired end-to-end. `kyc_provider_selection` reads the evaluator but is inert (no
   construction site sets `alternateProviderKey`). `wa_cost_optimization` and `telegram_mirror`
   are registered and attested but deliberately unwired. The panel is admitting capability, not
   attesting to four live behaviours in production.
4. **AR-64's automatic error-spike rollback is NOT built** — no error-rate metrics substrate
   exists in this repo. Only the audited **manual** `rolled_back` flip ships. This is a knowing
   partial delivery of AR-64, tracked against the AR-31 observability story.
5. **NFR-FR58C's `< 5 ms` resolution budget is asserted, not measured.** Every other property in
   this ADR cites a named test; this one does not.
6. **Cohort predicate is OR-only.** It cannot express a compound cohort ("district = X AND role =
   Y") — the canonical staged-rollout shape. A workaround (`cohort_tag`, precomputed outside the
   flag) exists but relocates cohort logic away from the audited record.
7. **Scheduled (future-dated) flips are dropped, not merely unimplemented** — an earlier attempt
   deadlocked the rollback path, so the capability was removed rather than repaired.
8. **The governance-boundary CI gate closes syntactic routes only, not transitive reachability.**
   A governance module importing an innocent helper that itself imports the evaluator would not
   be caught. An earlier draft overstated this as "structurally impossible"; that has been
   retracted in the ADR text.

None of these are hidden inside the document — the ADR states all eight as accepted failure
modes or corrections. They are surfaced here because a panel that only reads the Decision table
would miss them.

---

## Consent table

| # | Item | Decision (one line) | Owning story/event | Status | Recorded gate / caveat | Weight | Trustee decision |
|---|---|---|---|---|---|---|---|
| 1 | **ADR-0036** feature-flag-tool-selection | Feature flags are implemented **in-house, integrated into TWT's primary transactional platform (Google Cloud SQL for PostgreSQL), evaluated in-process — avoiding an additional external feature-flag service** for v1. Demonstrates all seven Item-9 capability-bar properties against shipped code (deterministic evaluation, tenant isolation via RLS, replay safety via immutable versioned rows, auditability via `audit.withCompensatingAudit`, a degradation ladder, owner/dead-by lifecycle metadata, DPDPA-compatible no-PII-outbound evaluation); adds the mechanized `governance-boundary` CI gate (conformance leg + AST source-scan leg) as the control with no vendor equivalent. | Story 10.8 | `drafted` (2026-07-31) | Architecture already committed the *properties* (Cross-Cutting #15 + the L208-227 capability bar); this ADR names the *control* — per [[feedback_architecture_vs_adr_boundary]]. Eight accepted failure modes recorded in Consequences (see Read-first above). | **Trustee-judgment** (gates the DigiLocker-mandatory KYC cutover; DPDPA residency posture is the decisive rejection reason for every vendor alternative) | Ratify / Defer / Reject : _______  init: _______ (KP) _______ (DR) |
| 2 | **Decision 2026-08-01-069** capability-bar admission batch | Admits FOUR behaviours to `governance_boundary.yaml`: `kyc_manual_fallback` (FR-2, live), `kyc_provider_selection` (AR-43, inert seam), `wa_cost_optimization` (AR-18, unwired), `telegram_mirror` (FR-73, unwired). Corrects the `kyc_manual_fallback` rationale (item 1 above). Declines to admit `beta_ux_patterns` (no FR/AR/UX-spec backing). | Story 10.8 | Author-committed; un-attested-pending | All four entries cite ADR-0036 as their ADR reference — ratifying this batch without ADR-0036 (or vice versa) leaves the attestation chain complete in FORM but not in AUTHORITY. | **Light-touch** (bookkeeping admission + a correction already made in text) | Ratify / Defer / Reject : _______  init: _______ (KP) _______ (DR) |

---

## Points the panel may want to probe before signing

1. **Is "in-house, on our primary transactional platform, no external vendor" still the right call given the admitted gaps?**
   The ADR's Alternatives section argues DPDPA residency (Property 7) and the governance-boundary
   invariant have no vendor equivalent — a hosted evaluator would receive cohort PII on every
   call, and no SaaS product can enforce "this flag may not be read inside the RBAC module." The
   panel is affirming that trade-off holds even with AR-64 rollback unbuilt and NFR performance
   unmeasured.
2. **Is admitting `kyc_provider_selection` and the two unwired channel-routing flags premature?**
   They are capability with no current live consumer. The ADR's position is that admission
   without a consumer is honest (the seam is inert, not fake), and re-triggers are named (a real
   AR-43 second vendor; each channel's own consumer story). The panel may prefer to defer either
   or both until a consumer lands — that is a legitimate amendment, not a rejection of the ADR.
3. **Does the corrected `kyc_manual_fallback` rationale need independent verification beyond this
   sheet?** The correction is a big claim (an attested rationale asserted the opposite of what the
   code did). The panel may want to see the specific test/trace cited in the ADR's Property-4 row
   before ratifying, rather than taking the corrected prose on faith.

None of these block ratification on their own — they are the ADR's own stated scope boundaries,
surfaced so the panel probes them deliberately rather than missing them.

---

## After the session — what I do per ratified row

Standard 3-surface cascade for ADR-0036, plus a decision-log follow-up entry for Decision 069:

1. **ADR file** (`ADR-0036-feature-flag-tool-selection.md`) — `Status: drafted → ratified`,
   `Date` → `<ratification date> (date entered current status)`, `Ratifying trustees` filled in,
   `## Ratification (<date>)` section + changelog row appended.
2. **`adr-index.md`** — flip the ADR-0036 Section A row `drafted → ratified`; update the
   status-count breakdown (`drafted` 5→4, `ratified` 29→30, Total unchanged at 148); refresh the
   ledger note.
3. **`.decision-log.md`** — one ratification entry for ADR-0036, next number
   `2026-08-01-070` (last entry on file: `2026-08-01-069`).
4. **If row 2 (Decision 069) is also ratified** — a NEW decision-log entry (not an edit to 069,
   per this log's own "never edited in place" rule) recording the batch's ratification, updating
   its `Status` line by reference and naming the ratifying trustees. If row 2 is deferred or
   rejected while row 1 is ratified, that split is recorded explicitly, not glossed.

**I will not perform this cascade until an actual Trustee Panel session has happened** — this
sheet is prepared for that session, not a stand-in for it. Per [[feedback_record_unattested_no_backfill]]
and [[feedback_verify_before_committing_governance_claims]], nothing below the line gets marked
ratified without real initials from Dhiraj Rahul and Kalpana Bharti.

---

## Session Resolution

The Trustee Panel (DR, KP) reviewed ADR-0036 and Decision `2026-08-01-069` as presented on this
sheet. Quorum met (≥2 trustees).

| ADR / Decision | Decision | Amendments / conditions |
|---|---|---|
| ADR-0036 | ☑ Ratified | Three amendments: (1) Decision framing softened from a vendor-rejection statement to a scale/governance-fit judgment with four named revisit triggers (experimentation, multi-region operation, large-scale percentage rollouts, advanced analytics); (2) "Postgres-backed" reframed as "integrated into TWT's primary transactional platform (Google Cloud SQL for PostgreSQL)" so the decision does not read as a PostgreSQL selection; (3) "declared, not production-active" established as the standing label for the three no-live-consumer admissions. |
| Decision 2026-08-01-069 | ☑ Ratified, **with one condition** | The three currently inert capability-bar admissions (`kyc_provider_selection`, `wa_cost_optimization`, `telegram_mirror`) remain explicitly marked "declared but not production-active" until their first real consumer ships, and future reviews continue to distinguish admitted capability from live production behaviour. Panel's scope note: ratifying ADR-0036 affirms the architectural decision to implement feature flags in-house with the described governance controls; it does not certify every admitted capability is currently production-active, and does not waive the accepted limitations under "Read-first priority." |

Trustee initials: __dr__ (DR)  __kp__ (KP)   Date: 2026-08-01

Logged in `.decision-log.md` as Decision `2026-08-01-070`. Cascade applied 2026-08-01 (below).

---

## Cascade applied — 2026-08-01

ADR-0036 ratified with three amendments; Decision `2026-08-01-069` ratified with one condition;
quorum met (DR + KP). The cascade was run per Decision **`2026-08-01-070`**:

- **`ADR-0036-feature-flag-tool-selection.md`** — `Status: drafted → ratified`; `Date` →
  `2026-08-01 (date entered current status)`; `Ratifying trustees` filled in; title and `##
  Decision` section amended per the three in-session amendments; `## Ratification (2026-08-01)`
  section + `## Changelog` table appended.
- **`adr-index.md`** — ADR-0036 Section A row flipped `drafted` → `ratified`; description
  reworded to match the amended framing; status-count breakdown updated (`drafted` 5→4,
  `ratified` 29→30; Total unchanged at 148); ledger note added.
- **`governance_boundary.yaml`** — rationale text for `kyc_provider_selection`,
  `wa_cost_optimization`, and `telegram_mirror` amended to state "DECLARED, NOT
  PRODUCTION-ACTIVE (Trustee condition, 2026-08-01)" explicitly; `count` unchanged at 4.
- **`packages/domain/tests/feature-flags/capability-bar.test.ts`** — `EXPECTED_BAR_HASH` updated
  to the new golden hash after the rationale amendment; full `@twt/domain` suite re-run green
  (1355 passed).
- **`.decision-log.md`** — Decision `2026-08-01-070` appended, referencing Decision
  `2026-08-01-069` (never edited in place, per this log's own convention).

**Open follow-ups carried forward (NOT closed by this ratification):** the "declared, not
production-active" condition binds ongoing — it lifts per-flag only when that flag's first real
consumer ships, each its own story; ADR-0032/0033/0034/0035 remain `drafted`, deferred to Story
14.7's AR-69 backlog closure, untouched by this session; the eight accepted failure modes in
ADR-0036 remain accepted, not resolved.

---

### Footnote — ratification weight (for triage, grounded in the decision log)

Consistent with the 2026-06-21 / 2026-07-08 / 2026-07-20 sheets' distinction:
- **Light-touch** — engineering-substrate / reversible-tooling ADRs.
- **Trustee-judgment** — security / data-model / policy ADRs where the choice is materially
  the trust's. **ADR-0036 sits here** — it gates the DigiLocker-mandatory KYC cutover and its
  DPDPA-residency argument is a policy call, not just an engineering preference.
- **Policy-adjacent** — mixed: mechanics are substrate, but a policy commitment is embedded.

The weight column is a triage aid, not a status — each row still requires the ≥2-trustee quorum
to flip to `ratified`.
