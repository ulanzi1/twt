---
title: Adversarial Review — TWT PRD (prd-TWT-2026-05-22)
status: draft
created: 2026-05-23
reviewer_posture: cynical-senior-engineer-and-PM, never-seen-before
artifacts_reviewed:
  - ./prd.md
  - ./addendum.md
---

# Adversarial Review — TWT PRD

## Overall Verdict

The PRD is unusually disciplined for a v1 — the trust posture is named, the deferrals are honest, decision provenance is preserved. But that polish is also the trap: several of the load-bearing claims (FR-30 reconciliation engine, FR-14 deterministic assignment, FR-47 audit-log immutability, FR-12A real-time validity service, "structurally PMLA-free") are *postures stated as if they were solved problems*. They are not. Worse, multiple regulatory surfaces the PRD claims to be outside of — "no judicial challenge," "facilitator not guarantor," "trust never holds support money" — are claims that contract law, RBI law, and the courts will independently re-test the first time a bereaved family is unhappy with the payout. The product can absolutely ship; what cannot ship is the comfort that the PRD has fully covered itself. A senior reviewer would not sign this off without forcing several "decided" items back into open-question status.

---

## Critical Risks (must address before launch)

### C-1. "No judicial challenge permitted" (FR-94, R10(E)) is not enforceable and the PRD treats it as if it is.

The unified trust-posture clause in §4.14 quotes verbatim *"No judicial challenge permitted"* and *"Commitment is purely ethical"* and bakes them into T&C. **Indian courts routinely set aside contractual ouster of jurisdiction**, especially when:
- The counterparty is a bereaved family of a deceased member who paid money believing the system was binding (estoppel + legitimate expectation arguments);
- The transaction has the *commercial colouring* of insurance even if labelled "mutual aid" (IRDAI has previously taken interest in chit-fund-adjacent and benevolent-fund structures);
- A consumer-protection complaint is filed (Consumer Protection Act 2019 explicitly covers "service" — and the trust offers a service to members in exchange for ₹110/year).

This is not a theoretical risk: ₹49 lakh changing hands on the back of a denied claim *will* attract a writ or consumer complaint. The PRD takes comfort from TSCT having preserved this clause, but TSCT has not yet had its first hostile litigation publicly play out. The R5(D) "purely ethical commitment" framing also clashes with the act of *taking ₹110 as a mandatory annual fee* (FR-1) — consideration creates contract, contract creates enforceable expectation. The mandatory fee is a TWT *divergence* from TSCT's voluntary fee (addendum §2) and this divergence materially weakens the no-challenge posture without acknowledgment.

**Fix:** Re-cast §4.14 as "we will not be drawn into adjudicating disputes; courts may; we have planned for that." Add an FR for "claim-denial appeal pathway" (internal review + ombudsman-equivalent) so the first thing a court does is not throw out the T&C as unconscionable. Have counsel pressure-test FR-94 against Consumer Protection Act 2019 and IRDAI's stated views on benevolent funds before launch, not after. This is OQ-7-adjacent but never raised as its own question.

### C-2. The "no PMLA exposure because we never hold support money" posture is fragile.

The PRD asserts (§4.14, §5, RA-6) that PMLA is structurally removed because support money flows member → nominee via UPI Intent and "the trust never holds support money in v1." This is partly true and partly self-flattering:

- The **₹110 Vyawastha Shulk** is real money the trust *does* collect (FR-1). At 4 lakh members × ₹110 = ₹4.4 crore/year — comfortably in PMLA-reporting-entity discussion range, and very much in Income Tax / FCRA scrutiny range.
- The trust holds operational reserves; takes module-commission revenue (FR-64–67) it must declare; pays field workers ₹65/qualified acquisition (FR-84) — that is a TDS-on-commission surface (Income Tax §194H likely applies).
- The Crowdfunding Module (Phase 2/3) *does* route money through the trust with a 10% cut — and the PRD acknowledges this introduces gateway/PAN/80G — but does not acknowledge that the *moment Phase 2/3 ships*, the PMLA-clean posture is gone, and the architecture must already have been audit-ready. "Architectural validation" framing (§4.9) understates the regulatory leap.
- The "trust as mediator on over-payment recovery" (FR-36) and "wrong-pool reconciliation" (FR-16) descriptions implicitly assume the trust can ask a nominee to return money. **The trust has no legal lever to do this** — the money belongs to the nominee the moment it lands in her account. "Facilitated, not enforced" is the right posture, but the PRD doesn't acknowledge how often this will leave members ₹310 poorer with no recourse, and what that does to SM-4.

**Fix:** Add an explicit "Regulatory surface inventory" subsection in §4.14 or as a Constraint. List every cash flow the trust touches (Vyawastha Shulk inflow, module commission inflow, field-worker outflow, operational spend, future crowdfunding intake) and the regulatory law each maps to (PMLA, Income Tax, FCRA if any non-resident donations later, state cooperative-society or trust-act, IRDAI watch-list potential). Make this a Phase-0 gating item, not a Phase 2/3 problem.

### C-3. The audit log's "immutability" (FR-47, NFR §8) is a posture, not a guarantee.

FR-47 says *"Audit log is append-only; no `update` or `delete` endpoint."* §8 NFR says *"Audit log integrity (no tampering after write)."* This is wish-list language. Without one of:

- Write-once-read-many (WORM) storage on the backing store, or
- Cryptographic hash-chaining (each row signs the previous row's digest), or
- External audit-log mirroring to an attesting third party,

…a database row is mutable by any operator with DB access — *especially* the Solo Builder, who by §9.1 is the only engineer. "Append-only at the application layer" is broken by `psql`. This matters specifically because the PRD wants the audit log to be the *evidence in a hostile investigation* (§4.14 DPDPA breach reporting, §4.7 Auditor role, FR-94 lawyer-reviewable T&C version recovery). An audit log that the sole admin can rewrite has zero evidentiary weight when the dispute is *with that admin*.

This is also where the "RBAC + audit log + multi-tenant" claim of being one of the three uncompromisable subsystems (§9.1) is hollow: there is no actual specification of *how* immutability is achieved. It's a NFR bullet, not a design.

**Fix:** Add an FR — "Audit log integrity mechanism" — that specifies hash-chaining (Merkle log or similar), off-site mirroring, and a quarterly attestation procedure. This is not v1-S; it is v1-prereq for the trust to survive its first investigation.

### C-4. The Pool Engine's "deterministic assignment" + "verifiable by replay" (FR-14, §4.3 NFR) doesn't survive a membership-set change between cycles, and the PRD doesn't say what wins.

`pool_index = hash(member_id + cycle_id) % N`. Determinism is claimed and stated as audit-reproducible from `(member_id, cycle_id)` alone. But:

- **N is determined at cycle freeze** (FR-13) and immutable thereafter. So an audit replay must also know N. Fine. But what is the *member set* at the time of assignment? The set of "active members" at freeze. If a member's status changes *between freeze and the moment a reviewer is replaying* (suspension under R7E, RTBF deletion under FR-96, voluntary withdrawal under FR-6, death between freeze and Day 15), replay diverges from the truth-at-freeze. The PRD does not specify that the assignment table is snapshotted at freeze — it just says assignment is deterministic.
- If a member is RTBF-deleted (FR-96) between cycles, their contribution is anonymized. Does the assignment table preserve `member_id` or anonymize the row? FR-96 says contributions are anonymized; FR-47 says audit log is not. The pool assignment table is neither.
- If a member is *added* (signup completes between freeze and Day 15), are they assigned for that cycle or do they wait? Membership-set drift between freeze and close is unspecified.

This is the kind of edge case that bites at the first audit, not the hundredth. Property-based testing (mentioned in §4.3 Notes) does not catch state-management bugs unless the property under test is *"the assignment recorded at freeze == the assignment any reviewer can compute later from the snapshotted member set."*

**Fix:** Be explicit. Add to FR-14: "On freeze, an assignment table is persisted with `{cycle_id, member_id, pool_id, frozen_member_state_digest}`. Subsequent reads serve the persisted table; the formula is a verification path, not the source of truth." Add a Niyamavali clause for membership-set freeze: who is in for this cycle, who isn't, how late-additions are handled.

### C-5. The reconciliation matcher is the highest-risk v1 surface and is explicitly an Open Question (OQ-2), but the PRD scopes it in MVP anyway.

§4.5 names this — "the highest-risk operational surface in v1, the matcher mechanism is **OQ-2**." Yet FR-30 sits inside §6.1 In-Scope, with a 4-hour p95 latency NFR, idempotency requirements, and 99% reconciliation accuracy as SM-5. The PRD is shipping a budget and an SLA for a subsystem whose **mechanism is undecided**. Addendum §4 offers three options — Author's prior is Option B (CSV) — but no commitment.

The realistic failure mode: at 4L members × 20 pools × 15-day window = ~80,000 statement lines/cycle to reconcile. Bihar banks (most likely SBI, PNB, BoB) have inconsistent PDF/CSV exports, narration-field garbage, and intermittent UTR truncation. Option B (CSV-only) requires the nominee or shepherd to do CSV export from net-banking — a non-trivial ask in a grief context. Option A (PDF + OCR) has 1–5% error rates in field conditions. **Either way, FR-30's p95 < 4 hours and SM-5's 99% accuracy are unsubstantiated.**

**Fix:** Resolve OQ-2 *before* Phase 1, not "before integration." Run an honest matcher pilot on TSCT-published archived data (or a simulated dataset) and back the NFRs into measured numbers. Drop SM-5 to "≥ 95% reconciliation accuracy in the first 6 months, target 99% by month 18" until evidence exists.

---

## High Risks (must address before scale-out)

### H-1. Solo-build cadence assumption (§9.1, A-10) treats the bus factor as a planning convenience, not a fatal-class risk.

The PRD names the Solo Builder ("BigDev") as engineer + product + design owner. §9.1 says "the brainstorm's 4–6 person team / 18–26 weeks baseline does not match the build profile. Realistic v1 ship is materially slower." That's honest. What's missing:

- **What happens if BigDev is unavailable for 30+ days?** No mention. The trust is collecting ₹110/year from real members; they're paying ₹310/month to real nominees. A single engineer's medical event or family emergency stalls reconciliation, claim approval workflow, anti-fraud monitoring. The audit log keeps writing, but no one is reading it.
- **Knowledge transfer artifacts.** The PRD is an excellent handoff document — but it does not specify runbooks, on-call rotation, secret-rotation procedure, backup-restore drill cadence (NFR §8 says "restore tested quarterly" but who tests it?), or who-to-call if Dokploy dies during a live alert.
- **The "three uncompromisable subsystems" framing implicitly requires bug-free first-draft code from one person.** Property-based tests (§4.3 Notes) help, but the framing in §9.1 is "everything else can be cut for v1 without breaking the product" — which assumes the engineer prioritizes correctly under fatigue. That's a strong assumption.
- **FR-58A reports & exports library** alone is ~10 distinct report types — solo-build will under-deliver this and the gap will only surface mid-claim-cycle when a trustee can't pull a number they need.

**Fix:** Add §9.1.1 "Solo-build operational continuity." Specify (a) a named technical backup (even part-time / advisory), (b) escrow of credentials with a trustee, (c) a runbook repo separate from this PRD, (d) a "what-degrades-first" priority list if BigDev is unavailable for >7 days, >30 days, >90 days.

### H-2. Field-worker fraud at scale is hand-waved (FR-86 is `[v1-S]`).

FR-84 gates commission on qualified acquisition (KYC + ₹110 + first contribution). That defeats *naive* attacks. It does not defeat:

- **Collusion rings.** A field worker plus 5 friends sign up 50 sock-puppet "teachers" with valid-looking eHRMS IDs (entered manually — FR-1 explicitly states no auto-fetch). DigiLocker KYC requires real Aadhaar but does not validate that the Aadhaar holder is actually a government teacher in Bihar. The first contribution can be made from one shared bank account in rotation. Commission = ₹65 × 50 = ₹3,250 per ring per cycle. Below per-incident detection thresholds; above incident-aggregation thresholds — but FR-86 (anti-fraud throttling) is `[v1-S]`, meaning it may not ship.
- **Stipend-level fraud incentive.** Vikram's modeled income (addendum §6.3) is ~₹3,250/month from TWT. For a Bihar Shikshakamitra at ₹15k stipend, a sock-puppet ring is 2× monthly income. The incentive is large and the asymmetry favors the attacker.
- **eHRMS ID validation is not specified.** FR-1 takes the ID as a field; the Glossary calls it "data, not integration." There is no specification for how the trust will detect a fabricated eHRMS ID at signup — even reactively. By the time a fake teacher's "first contribution" lands and the commission is paid, the sock puppet has done its job; the trust now has a stale member record it must pay attention to.

**Fix:** Move FR-86 from v1-S to v1. Add an FR for eHRMS-ID *plausibility* checks (format, district/school cross-reference against a maintained authoritative list — the trust can build this from the Bihar education department's published school directory). Add a hard cap: a single device, IP, or UPI handle cannot be associated with > N attributed acquisitions in a rolling window without trustee approval. Make field-worker comp a *deferred* monthly payout (e.g., the qualified-acquisition member must complete *two* cycle contributions, not one) so the fraud cost-to-detect ratio shifts.

### H-3. The "facilitator, not guarantor" posture has a brand breaking-point the PRD doesn't acknowledge.

§10.1 names trust posture as a structural moat: under-funded delivers actual (FR-19), facilitated recovery never enforced (FR-36), unified clause in T&C (FR-94). Strong. But here's the breaking-point case:

**Scenario:** A high-profile teacher dies. Pool spawns. Claim approved. 16,000 members are assigned. Collection comes in at 55% — well below the 70% threshold (SM-4, addendum §3.1). Per FR-19, the family receives ~₹27 lakh (actual collection) instead of the ~₹49 lakh "expected." The widow goes to the press. *"Trust promised ₹50 lakh; family got ₹27 lakh."* Even though every Niyamavali clause and T&C line says actual-not-target and no-guarantee — the press story is "broken promise."

The "celebration framing" copy guideline (FR-19 Pool-Reality #2) makes this worse: the trust's own public messaging will say *"Because 8,000 members contributed, the family of [name] received ₹27 lakh."* That framing is anodyne to a designer and tone-deaf to a grieving family who heard "₹50 lakh" from the field worker who recruited them. The product is structurally sound; the *expectation gap between recruitment narrative and delivered reality* is not.

This is exactly the scenario that produces an unfavorable judicial outcome around FR-94 (see C-1).

**Fix:** Add an FR for *expectation calibration at every touchpoint* — field-worker scripts (FR-83 attribution analytics dashboard target list), signup screens, My Pool card framing, and crucially, the **public Sahyog Drive** page must not advertise a target the system isn't designed to hit. SM-C4 (no reactive amount hikes) is a discipline; what's missing is an SM for *member-understood expected payout* — survey-driven, measured pre-claim.

### H-4. Trustee bandwidth during multi-claim cycles (§9.7 risk register, "Medium") is under-rated.

The risk register acknowledges trust-staff bandwidth during a heavy cycle. The mitigations cited (FR-49 bulk ops, FR-42 signals panel, FR-52 helpdesk routing) compress *individual task time*. They do not multiply trustee count.

Per §2.6 the trust has the **statutorily required minimum of 3 trustees + small staff**. Per FR-43, special-case claims route to State Trustee voting — *which means 3 humans*. R9(A) multi-death-same-date scenarios, R5(C.2) declared-illness vs accident determinations, R11/R14 forgery cases, FR-11 concealment-flag confirmations — all converge on the State Trustee bench. A Bihar-scale event (e.g., a bus crash with 4 teachers, or a heatwave week with 8 elder-teacher deaths) creates a queue of special-case votes that 3 trustees cannot clear in the 15-day window.

Worse, the **first-claim shepherding load** (FR-41 v1-M) is per-claim — 20 claims/month at steady state means 20 simultaneous shepherds, all coordinating with families during their grief. Even with District Admin volunteers (Anita-class), this exceeds the volunteer hours described (Anita: 6 hours/week per §2.3). 6 hrs/week × 4 volunteers ≠ 20 claim shepherds.

**Fix:** Model trustee/staff/volunteer load at steady-state (20 claims/month) and at burst (5 claims approved in one cycle freeze). Add an FR for "claim-queue throttling on bench saturation" — i.e., if special-case votes exceed N/week, lower-urgency claims slip to next cycle (with comms). Add a hiring trigger for full-time claim shepherds at member-count milestones (this is implicit in OQ-15 but not quantified).

### H-5. DPDPA "compliant from day 1" (§10) is asserted without a Data Fiduciary registration plan.

§4.14 says "DPDPA compliance is built in from v1." FR-95 (export), FR-96 (RTBF), FR-97 (consent registry) are listed. FR-99 (DPO appointment) is `[v1-S, activates at MeitY threshold]`. The MeitY Data Fiduciary threshold has not been quantitatively published as of PRD date; *Significant Data Fiduciary* status may apply at scale ahead of any explicit trigger, and the trust handles biometric data (DigiLocker pulls Aadhaar photo — FR-2, and consent registry mentions "biometric data" — FR-97).

The PRD's posture is "we'll be DPDPA-ready when we cross the threshold." DPDPA Section 10 (Significant Data Fiduciary obligations) includes mandatory DPIA, mandatory periodic audit, mandatory DPO who is an India-resident person — not just a "process + contact." If the trust processes Aadhaar-linked photo + name + DoB + financial transaction history + medical disclosure (FR-5) at 4L members, the SDF threshold is plausibly already crossed at launch.

OQ-7 covers "DPO appointment timing" but does not name the SDF-classification analysis as a deliverable.

**Fix:** Add an explicit Phase-0 deliverable: SDF-classification legal opinion. Move FR-99 to v1 (not v1-S). DPIA before first cycle.

### H-6. Multi-tenant scaffolding's cost is acknowledged once and never re-examined.

§4.8 celebrates `pariwar_id` first-class everywhere; the retrofit-cost argument is correct. What the PRD doesn't acknowledge:

- **Every FR that touches a database read is now `pariwar_id`-scoped**. The Solo Builder writes (and tests, and reviews) ~100 FRs' worth of queries with a `pariwar_id` filter, and *one* missing filter = cross-tenant data leak (treated as P0 per §9.7). The defense — FR-59's adversarial test — exists for cross-Pariwar reads, but the test only exercises *known* endpoints. Every new endpoint added in v1-S, every analytics export (FR-58A), every report — re-introduces the surface.
- **The branding bundle (FR-60)** is multi-Pariwar enabled but v1 has *one* Pariwar. So the bundle abstraction is untested in production until v2. Bugs in the branding-resolution layer will only manifest at second-Pariwar provisioning, when the PRD-promised "4-hour wizard" (§4.8) must absorb them all at once.
- **FR-12A Member Validity Service** is `pariwar_id`-scoped (implicitly — member-id is unique per Pariwar). When Pariwar-Passport (FR-63) data model lands but UI is deferred, what happens if a TWT-Bihar member moves to a future Rail Parivar context? The data model is "present" but the validity service has no inter-Pariwar evaluation contract.

**Fix:** Add a recurring "multi-tenant audit" as part of every release checklist — automated tests for tenant isolation extended every time a new query is added. Specify, in §4.8, the **invariants** the system maintains (every write carries `pariwar_id`; every read passes through a Pariwar-bound session; every export is Pariwar-scoped). Treat this as a typed constraint enforceable in the data layer (Row-Level Security in Postgres), not a code discipline.

### H-7. SM-3 (Vyawastha Shulk renewal ≥ 85%) is gameable in the way the PRD explicitly worried about.

The PRD's own Notes on FR-1A say *"Grace + reminders strategy must be balanced — too lenient and renewal-rate signal weakens (SM-3)."* The 3-month grace mechanism (FR-1A) **directly inflates SM-3 by treating `active_in_grace` as `is_active=true`** (FR-12A payload). So a member who pays nothing for 90 days *and* contributes nothing for that period *and* makes no positive engagement still counts as "active" toward SM-3 — until day 91, when they flip to `lapsed_unpaid`.

Worse, the renewal pattern most likely in Reena's persona is "pay-on-day-89" — meaning the trust collects renewal revenue but the member never engaged. SM-3 reads as 85%; the underlying engagement is much weaker. SM-C1 (signup velocity without contribution) catches this *for new members* but not *for renewing members*.

**Fix:** Decompose SM-3 into (a) renewal-paid-rate, (b) renewal-paid-with-active-contribution-in-renewing-year-rate. Make (b) the gating number. Or: require renewal payment to coincide with at least one positive contribution within the renewing year, or `lapsed_unpaid` triggers earlier.

---

## Medium Risks (should address; can plan around)

### M-1. FR-12A "p95 latency < 200 ms against 4L members" (§4.2 NFR) is a wish without a caching strategy detail.

The NFR also says cache invalidation on any rule amendment OR member-state change. A rule amendment invalidates 4L cache entries at once — and the FR-23 multi-channel push fires off simultaneously, hitting validity service from every notification handler. The cache stampede pattern is unaddressed.

### M-2. The "feature flags per cohort" (FR-58C) is power-tool without a kill-switch policy.

A trustee or IT Cell can flip a flag for "all of state=Bihar" — including DigiLocker-mandatory. Misfire = 4L members locked out of contribution. No staged-rollout discipline specified. No "10% canary, then 50%, then 100%" workflow. No automatic rollback on error-rate spike.

### M-3. The Niyamavali "diff is public" (FR-79) creates a manipulation surface.

A trustee can amend a rule, observe member reaction, and re-amend. The PRD captures versioning but no minimum-time-between-amendments. R10(D) says "Rules amendable anytime by core team" — preserved verbatim — which means there is no procedural protection against trustee-driven rule volatility, however well-intentioned. The "Niyamavali consultation" survey suggestion (§4.2 Notes) is a suggestion, not a requirement.

### M-4. "Human shepherd self-assignment prohibited" (FR-41) is a paper rule.

The Solo Builder is also implicitly capable of acting as a Pariwar Admin (which has full RBAC override per FR-44/45 implication). If the only engineer is also the only person who can review their own bypass — there is no separation-of-duties.

### M-5. UPI Intent's "amount-lock" (FR-18) is *"per UPI app behavior."*

Some UPI apps allow amount editing on the Intent screen. FR-18's mitigation is *reconciliation rejects ≠ fixed_amount*. But the member already paid. The "facilitated recovery" path (FR-36) is the only remedy. Members who over-pay or under-pay will be common; the comms script for "your contribution didn't count, please contact nominee directly" is not specified.

### M-6. The "Daily PDF push" assumption (FR-29, A-7) assumes the nominee has net-banking + technical capacity.

The nominee is by definition a bereaved family member, often non-smartphone-fluent (§2.5). The "human shepherd" carries the responsibility, but shepherding 20 nominees through 30 days of daily bank statement uploads is a *staffing* problem the PRD does not size.

### M-7. "Real money" simulated drill (Phase 1, §12) has unaddressed legal exposure.

OQ-11 acknowledges this. But Phase 1's plan ("real members, real ₹310, real UTRs, money actually moves to a trust-held escrow account that returns it") **violates the structural PMLA posture** (C-2 above) — the trust *is* holding support money in this drill. The PRD acknowledges this needs legal vetting; reviewer must insist Phase 1's drill be redesigned, not just legally vetted.

### M-8. Module Marketplace eligibility-filter (FR-65) leaks PII to partners (FR-66).

"Pre-filled into a lead form, with consent" (UJ-10) implies the trust hands the partner a member's school + designation + name. Each module enrollment is a controller-to-controller PII transfer under DPDPA. The consent registry (FR-97) covers it in principle; the **partner's downstream processing** (HDFC, LIC) is the trust's joint-liability surface and is not enumerated. Partner-side breach = trust-side regulator visit.

### M-9. The In Memoriam page (FR-78) is permanent PII publication by design.

First-name + last-initial + school + district + designation, of a deceased member, indefinitely public. DPDPA right-of-the-deceased through nominees (DPDPA §11) — what happens when a bereaved family member requests removal? "Respectful framing" is asserted; takedown procedure is not.

### M-10. The "open" pool naming list (FR-13, OQ-12) introduces a cultural-sensitivity surface.

Mahabharata-rooted names are warm in the Indian context broadly, but at scale and across future Pariwars (Rail Parivar, Bank Parivar with potentially non-Hindi cadres), the naming convention may exclude or alienate. The PRD acknowledges "per-Pariwar curation" but TWT-Bihar's list itself — to be ≥ 30 names — needs religious-balance review the PRD doesn't name. (E.g., a list of 30 Hindu epic figures with zero Muslim/Christian/secular regional figures will land badly with Bihar's significant Muslim teacher population.)

### M-11. "12-month rejoin lock after voluntary withdrawal" (FR-6) under same Aadhaar — Aadhaar reuse is detectable, but only if the trust *retains* Aadhaar past RTBF (FR-96).

The interaction between FR-6 and FR-96 is not specified. If a member withdraws → invokes RTBF → re-attempts signup with the same Aadhaar — the trust's posture is "blocked for 12 months under same identity" but the trust has anonymized the prior record. The lookup is impossible. Either RTBF is incomplete (Aadhaar hash retained) or the rejoin-lock is unenforceable. Pick one.

### M-12. Cash-flow model for field-worker comp (§9.3) is named as Phase-0 gating but no FR sizes it.

The trust collects ₹110/year per member upfront. Field-worker comp is ₹65/qualified acquisition paid *monthly*. At rapid Phase A growth (say 5,000 acquisitions/month), monthly outflow = ₹3.25 lakh; monthly inflow from those new members' ₹110 fees = ~₹5.5 lakh. Net positive — but with timing risk: signup is rushed but qualification is the contribution cycle 1-2 months later. The trust may have committed to field workers before the ₹110 collection clears. PRD says "model before recruitment scales" but no FR pins the trust's *minimum cash buffer* policy.

### M-13. The "first end-to-end claim closes without manual heroics" SM-1 (§7) is gameable by silently doing the heroics.

The Solo Builder is also the only person who would notice if a "manual override" was used to close the cycle. SM-1 has no third-party verification. Counter-metric needed: "number of manual interventions per cycle" — published in the audit log.

### M-14. The 75/25 multi-nominee split (FR-4) without nominee KYC is exposed to fraud.

The deceased member declares "Nominee A (75%) and Nominee B (25%)" at signup or Life Events. At claim time, the (potentially) different family member files the claim. Disputes route to State Trustee discretion (R5(E)). There is no specification of how the trust validates *the member's intent had not been changed under duress in the final weeks*. (TSCT has this same gap; the PRD inherits it without remarking.)

### M-15. FR-67 time-bombed modules + FR-65 eligibility filter — what happens to *in-flight* enrollments at `valid_until`?

A member taps Apply on Day 28 of a module's lifecycle; partner takes 5 days to respond; module auto-archived on Day 30. Member status: in limbo. PRD doesn't say.

### M-16. The retirement coverage extension formula (FR-12) creates a 4L-member-scale silent eligibility creep.

5 years membership → +1 year coverage; 15 years → +3 years. At year 20 of the platform, ~half the early base could be retired but still covered. The pool-math model (addendum §3) assumes active contributors fund pools, not retired-covered members. The retired-covered population does *not* contribute monthly (implicit) but *is* eligible. The model doesn't disclose this dilution.

### M-17. The "Trustee-Lite signals panel loads in ~5 seconds" (UJ-4, FR-42) — "5 seconds" is also a latency budget.

NFR §8 has no entry for admin-UI latency. FR-42 says "all signals load from one indexed query; no N+1." At 4L members + 7-year audit log + contribution history per pool, the query plan needs explicit attention. Not specified.

---

## Low Risks / Nits

- "Mahabharata characters as seed naming" (FR-13) — Karna and Bhishma both died tragically; pool names referencing their deaths-of-circumstance may read as omen-bearing for some members. Curate carefully.
- "Reena gets a notice on day 8 / day 10 / etc." (UJ-9) — timezone handling for push notifications not specified anywhere; Bihar = IST but cron in UTC = subtle bugs.
- FR-1A grace logic: 90-day grace + "no lock-in re-applied on restoration" — but the member's *contribution-discipline counters* (R7 thresholds, FR-9) need a defined treatment during grace. Skip counted? Skip excused?
- §3 Glossary: "Pending-valid" is used in FR-1 and FR-2 with subtly different scopes (KYC fallback vs trustee validation).
- The PRD says "ground inspection" with "school principal letter optional" (FR-40) — but `optional` artifacts collected during a v1 ground inspection are a known audit-log gap when a claim is later disputed.
- "Letter codes (A, B, C…)" for backward compat with TSCT (FR-13) — at N > 26 pools, the letter codes break (TSCT's A–T tops out at 20).
- "No N+1" claim (FR-42) is in product copy of the PRD; should be in the architecture doc as a constraint on the schema.
- §7 SM-2 "approaches ~4L members" — "approaches" is unfalsifiable. State a number.
- §11 stakeholders lists "Legal counsel + DPO (TBD pre-launch)" — DPO is a regulated role; "TBD" is fine for now but Phase 0 must name a candidate.
- §10.1 says "discipline outlasts cleverness" — but the *self-described moat* is a posture, not a barrier to a well-funded clone. Worth naming honestly.
- FR-58B banner manager: "one at a time per surface" — collision behavior between a "scheduled maintenance" banner and an "urgent helpdesk redirect" banner not specified.
- The PRD never names a *currency rounding policy*. ₹310 is fine; what about ₹310.50 if a rule change introduces it?
- FR-12A audit-logs every admin call but not member self-calls "for privacy + volume" — but adversaries who steal a member session can poll the validity service for reconnaissance. At least rate-limit it.
- The "8s p95 for DigiLocker pull" budget (FR-6 NFR) has no fallback if DigiLocker returns in 12s on a slow connection — the user has been told a 12s wait triggers the manual fallback CTA, but the response may still arrive at 13s, creating two parallel KYC states.
- §12 Phase 0 doesn't list "audit log integrity mechanism design" (see C-3) as a deliverable.
- Counter-metric SM-C5 is "hard zero" PII incidents — but PRD doesn't define what counts as an incident at the threshold of a single member's record being mis-exposed vs a bulk-leak.

---

*End review. Recommend the PRD be revised to convert C-1 through C-5 to either resolved-FRs or explicit Open Questions before Phase 0 begins. H-class risks should be re-evaluated at the Architecture document; if they remain unaddressed in Architecture, they re-block.*
