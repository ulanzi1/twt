# PRD Quality Review — TWT (Teachers Welfare Trust) v1

## Overall verdict

This is an unusually substantive launch-stakes PRD: the thesis ("discipline outlasts cleverness," §10.1) is real and load-bearing, trade-offs are named with what was given up (multi-Pariwar from day 1 vs. faster ship; no payment gateway vs. simpler reconciliation), and the Niyamavali + Pool Engine + FR-12A core is specified with the depth downstream story creation will need. The principal risks to usefulness are concentrated in two places — scope ambition (≥99 FRs, three uncompromisable subsystems, and 12-role admin UI on solo-build cadence) is asserted but not honestly tested against the "v1 ship is materially slower" caveat in §9.1, and a handful of FRs in the §4.7 admin cluster (FR-49, FR-51, FR-52, FR-53, FR-56, FR-58) are thin on testable consequences relative to the rest. These are correctable in a focused pass; nothing in the document blocks UX or architecture from starting.

## Decision-readiness — strong

Trade-offs are named as trade-offs, not smoothed. §10.1 "What this product bets on" is unusually honest — "TWT does not have a technical moat — and the PRD refuses to pretend otherwise" — and explicitly names the risk that "discipline can look like slowness from outside, and slowness can lose to a faster builder who got the regulatory side lucky." The four-clause trust posture (§4.14) is stated as a unified, non-negotiable stance and the PRD shows where it manifests across FRs (FR-19, FR-33, FR-36, FR-32, FR-74, FR-6, FR-43). Rejected alternatives are pushed to `addendum.md §1` with 29 entries each carrying explicit rationale — that's substantive provenance, not theater.

Open Questions (§13) are genuinely open: OQ-2 (reconciliation matcher mechanism) is named as "the single biggest engineering risk" (§9.6); OQ-5 (field-worker recruitment cash-flow) is given a gating role (Phase 2 blocked, Phase 1 not); OQ-1 (brand name) is correctly tagged as blocking ASO and trust legal docs. `[NOTE FOR PM]` callouts land at real tensions (FR-1A grace strictness, FR-10 R7 re-tuning, FR-42 ground-inspection-vs-peer-mesh policy correction).

### Findings
- **medium** SM-1 hides a multi-month sequencing decision (§7) — "First end-to-end claim closes without manual heroics" within 6–9 months treats end-to-end as a single milestone, but a real claim requires a real death within a real member base; pool-math floor (SM-2 at 18–24 months) implies the SM-1 target cannot be met by a live claim until at least the member base is large enough for a death to be statistically likely. *Fix:* state explicitly whether SM-1 will be validated by simulated drill (Phase 1, OQ-11) or by waiting for a real claim, and what counts as "without manual heroics."

## Substance over theater — strong

Personas (§2.1–2.6) are load-bearing: Reena (§2.2) is named as the design constraint for FR-1A renewal grace and SM-C1 — "UX decisions that work for Sushil but fail Reena... are net failures" — and that constraint is actually visible in FR-1A's 3-month grace logic and in the friction-as-resource principle (§4.5). Anita (§2.3) drives FR-42 signals-panel design (5-second judgment, six-minute lunch breaks per addendum §6.2). Vikram (§2.4) shapes FR-84's qualified-acquisition payment gating. No persona is decorative.

NFRs (§8 and feature-specific) carry product-specific thresholds: My Pool card render < 500ms p95, reconciliation latency < 4hr during live alerts, FR-12A < 200ms p95 against 4L-member registry, pool spawn for N=50/M=4L < 60s p95. These are not boilerplate.

Glossary (§3) earns its length — every term is used downstream; Vyawastha Shulk has an explicit disambiguation note distinguishing TWT use from TSCT's serious-illness usage; "Pariwar terms" cluster is genuinely first-class because `pariwar_id` is everywhere.

The Vision (§1) is specific — "Bihar before UP," "₹247 crore distributed to 556 families since 2020," "NSCT stalled at ~300 members" — it could not swap into any other PRD.

### Findings
- **low** Six personas is at the upper threshold of useful (§2). Quinary "Trustee Panel + Trust Staff" (§2.6) blends two distinct user classes (low-volume high-authority vs. high-volume low-authority) into one persona block, which then has to be untangled later in stakeholder responsibilities (§11). *Fix:* either split §2.6 into two personas or explicitly call out the two sub-roles up front so admin-UI work doesn't conflate them.

## Strategic coherence — strong

The thesis is stated and the features serve it. The bet (§10.1) is "structural choices most builders won't make" — multi-Pariwar from day 1, no payment gateway, automated reconciliation without losing direct transfer, codified trust posture, patience as discipline. Feature prioritization follows: §4.8 Multi-Pariwar Platform Architecture is in MVP even though only Bihar ships, §4.5 Payment & Reconciliation gets the friction-as-resource principle, §4.14 Trust Posture is structured as a single coherent stance not as a bag of compliance FRs. The "three uncompromisable subsystems" (§9.1: Pool Engine, Reconciliation, RBAC/multi-tenant) match where the FR density and NFR specificity are highest.

Success Metrics validate the thesis rather than just measure activity: SM-2 is pool-math viability, not DAU; counter-metrics are named (SM-C1 signup velocity without contribution, SM-C5 PII exposure as hard zero, SM-C4 average per-pool amount as a check on reactive amount hikes).

MVP scope kind is coherent: this is a platform-with-first-tenant scope, not a single-product scope, and §6.1's "multi-Pariwar scaffolding" line item is consistent with that framing.

### Findings
*(none material; one observation surfaced under Scope honesty)*

## Done-ness clarity — adequate

The strong FRs (FR-1, FR-1A, FR-2, FR-7, FR-8, FR-12A, FR-13–FR-20, FR-22, FR-27–FR-32, FR-37–FR-43, FR-47, FR-59, FR-74) have explicit testable consequences — often a dedicated "Consequences (testable):" block listing 3–6 verifiable conditions. FR-12A even ships a status-payload schema. FR-13 specifies the curated-list seed and fallback. FR-14 names the determinism property. FR-22 enumerates state transitions. This is genuinely engineer-ready.

The weaker cluster is §4.7's admin FRs: FR-49 (bulk operations everywhere) — what counts as "everywhere," what's the per-bulk-action minimum dry-run behavior? FR-51 (News/Blog dual surface) names audience scoping but no acceptance shape for "scheduled publishing" or what happens to a published-then-scoped-out post. FR-52 (helpdesk/ticket) is a single sentence; what's the lifecycle, what's the SLA shape? FR-53 (field-worker dispatch) names what surfaces appear but not what success/failure looks like. FR-56 (member moderation) lists state transitions but the restoration logic ("either rule-clearance or trustee discretion") doesn't define who has authority for which sub-clause. FR-58 (survey/poll) is one sentence at v1-S.

§8 cross-cutting NFRs use mostly bounded language ("≥ 99.5% monthly," "AES-256," "WCAG 2.1 AA targeted") — "targeted" on WCAG is the one weasel-word; either it's a launch criterion or it isn't.

### Findings
- **high** Admin-UI FR cluster lacks testable consequences (§4.7: FR-49, FR-51, FR-52, FR-53, FR-56 partially, FR-58) — these are described at a capability level without acceptance shapes. Story creation downstream will have to invent the gaps. *Fix:* add a "Consequences (testable):" block to each, matching the depth of FR-1 / FR-42 / FR-47. Particularly: FR-52 needs ticket lifecycle states, FR-53 needs success criteria for field-worker workflows, FR-49 needs the canonical list of bulk-eligible operations.
- **medium** WCAG 2.1 AA "targeted" (§8 Accessibility) is the only weasel word in NFRs. *Fix:* state whether AA is a launch blocker or a directional goal; if directional, name the AA gaps acceptable at launch.
- **low** FR-25 (pending contributors per pool) and FR-26 (progress meter + countdown) at `[v1-S]` carry one-sentence specs with a `[NOTE FOR PM]` on social-pressure tension but no acceptance criteria — fine for v1-S, but if either ships in v1 the consequences need filling in.

## Scope honesty — strong

Non-Goals (§5) names 10 explicit exclusions with reasons; "Crowdfunding Module... killed for v1 to keep PMLA posture clean" is honest about why the obvious-looking feature is out. `[NOTE FOR PM]` callouts in §6.2 (e.g., "solo-build cadence may mean 2nd Pariwar is 18+ months out") admit timing realism the PRD elsewhere doesn't dwell on.

`[ASSUMPTION]` tags are indexed (§14, A-1 through A-12) and roundtrip cleanly — every inline `[ASSUMPTION]` I checked appears in the index, and every A-N has its inline anchor. Open-items density (15 OQs + 12 A-N + ~7 NOTE FOR PM callouts) is high but appropriate for launch-stakes / chain-top — these are real items, not theatre.

`[v1-S]`, `[v1-M]`, `[v2]`, `[v3]` phase tags are used consistently inline and surfaced in §6.2.

### Findings
- **medium** Solo-build cadence vs. v1 scope tension is named (§9.1: "Realistic v1 ship is materially slower; sequencing matters more than ever") but the PRD then commits to a ≥99-FR v1 with all of §4.1–§4.14 in scope per §6.1. The scope honesty gap: which FRs would slip if the cadence runs slow? Only FR-25, FR-26, FR-34, FR-35, FR-36, FR-48, FR-58, FR-72, FR-73, FR-86, FR-93, FR-99 are `[v1-S]`. Three uncompromisable subsystems are named but not the *next ring* — which v1 features would be cut if year one runs long? *Fix:* add a §6.3 or §9.8 "cut order if cadence slips" — name the next 5–8 FRs that would slip to v2 in priority order. This converts an implicit risk into a stated trade-off.
- **low** OQ-6 is shown as RESOLVED in §13 — keep this; it's good provenance and shows the PRD has been revised on real input.

## Downstream usability — strong

This is a chain-top PRD and the downstream-extraction discipline shows: FRs are globally numbered (FR-1..FR-99) with stable IDs explicitly preserved even on feature reorganization (§0); UJs are UJ-1..UJ-10 and every one names a persona from §2 by exact label (Sushil, Reena, Anita, Vikram, Bereaved family, Trustee — all defined); SMs are SM-1..SM-7 with SM-C1..SM-C5 counter-metrics; Glossary is dense and used identically across sections.

Cross-references resolve. Spot-checked: FR-12A → FR-7, FR-42, FR-47 all resolve; FR-19 Pool-Reality #2 → FR-69, FR-77 resolve; FR-74 → FR-47, FR-66 resolve; FR-94 trust posture clauses → R10(E), R5(D), R10(A), R10(B) all appear in Niyamavali full reference (addendum §5). The "Realizes UJ-N" pattern in feature description blocks gives architecture and UX a clean source-extract target.

### Findings
- **low** FR-66 is referenced from FR-77 ("the social-accountability mechanism per Theme 5") but FR-66 in §4.9 is the "admin module-targeting wizard" — not verifier profile pages. The verifier-profile-page concept is in FR-74 and FR-77 itself. *Fix:* the cross-reference to FR-66 from FR-77 looks like a stale ID — verify whether it should point to FR-74 instead, or whether a separate FR for verifier profile pages was intended.
- **low** FR-94 references "FR-19's Pool-Reality #2" — good; but the close-of-cycle copy templating is owned partly by "trust comms / tone-guide owner" (FR-19) and partly by FR-69 tone-guide enforcement — the seam between these two is implicit. *Fix:* state in FR-69 that close-of-cycle templates are governed by both.
- **low** SM-1's validation list "Validates FR-1 through FR-43, FR-66" — FR-66 again looks suspect (see prior finding); also "FR-1 through FR-43" as a range elides which FRs are actually under SM-1's validation. *Fix:* enumerate the validated FRs explicitly or scope the range tighter.

## Shape fit — strong

Shape is correctly identified and respected. This is a consumer product (member app) + multi-stakeholder B2B (admin / trustee / field-worker) + meaningful UX + chain-top + launch-stakes. The PRD treats personas and UJs as load-bearing (correct), gives admin RBAC its own dense feature cluster (correct for the multi-stakeholder shape), and carries the full Niyamavali rule reference into addendum §5 (correct for the regulatory-adjacent compliance posture).

Brownfield context (TSCT divergences) is handled by a dedicated addendum §2 matrix — existing-code references are not in play because TWT is a greenfield build deliberately divergent from TSCT, and the matrix makes the divergences explicit.

The PRD has not been over-formalized: there are no UJs for trivial admin actions; the rule registry is described at the capability level (FR-7) not enumerated as 30 separate FRs.

### Findings
*(none)*

## Mechanical notes

- **Glossary drift:** light — spot-checked terms (Pariwar, Vyawastha Shulk, Niyamavali, Sahyog, lock-in, My Pool, UTR, Pool Engine, Reconciliation engine, Validity service, Human shepherd, Sahyog Vivran) used identically across §3, §4 FRs, §6.1 MVP scope, and §13 OQs. No singular/plural drift observed. "Pariwar"/"Parivar" appears in both forms — §3 glossary acknowledges "Shikshak Parivar / Teachers Pariwar" — this is intentional dual-spelling for brand variation, not drift.
- **ID continuity:** FRs FR-1 through FR-99 with FR-1A, FR-12A, FR-58A, FR-58B, FR-58C inserted; numbering is contiguous and unique. UJ-1..UJ-10 contiguous. SM-1..SM-7, SM-C1..SM-C5 contiguous. OQ-1..OQ-15 with OQ-6 marked RESOLVED — good provenance. A-1..A-12 contiguous. No gaps or duplicates detected.
- **Cross-reference resolution:** spot-checked ~20 cross-references, all resolved except the two FR-66 references called out under Downstream usability findings (one suspect cross-ref from FR-77, one from SM-1's validates-list).
- **Assumptions Index roundtrip:** A-1 through A-12 all have inline anchors as cited; inline `[ASSUMPTION: ...]` callouts in FR-2, FR-5, FR-8, FR-9, FR-13, FR-29, FR-46, FR-62, FR-84 are reflected in the index. Roundtrip clean.
- **UJ persona linkage:** UJ-1..UJ-10 each name a persona from §2 by exact label (Sushil, Reena, Anita, Vikram, Bereaved family / nominee, Trustee). No floating UJs.
- **Required sections present for launch-stakes / chain-top:** Vision, Target User, Glossary, Features (with nested FRs and testable consequences), Non-Goals, MVP Scope, Success Metrics + counter-metrics, NFRs, Constraints/Risks, Why Now, Stakeholders, Rollout, Open Questions, Assumptions Index — all present. Companion artifacts (addendum, decision-log) referenced and used.
