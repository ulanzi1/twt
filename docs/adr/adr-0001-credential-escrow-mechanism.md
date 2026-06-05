# ADR-0001: Credential escrow mechanism — physical sealed envelopes in joint bank safe deposit + separate custodial path per envelope class

> **Status:** ratified
> **Date:** 2026-06-05
> **Author:** Solo Builder (BigDev), transcribing trustee answers from `_bmad-output/implementation-artifacts/phase-0-trustee-questionnaire.md` Q2.1 + Q2.2 + Q2.3 + Q2.6 + Q2.7
> **Ratifying trustees:** Dhiraj Rahul (Trustee 1), Kalpana Bharti (Trustee 2)
> **Supersedes:** (none)
> **Superseded by:** (none)

## Context

Architecture §Workspace Layout (line 4172) + PRD §9.1.1 + AR-67 commit the **property** that prod, audit-mirror, and high-sensitivity-tier credentials are escrowed such that opening requires ≥2-trustee quorum, with the audit-mirror class structurally separable from prod per architecture §2.10a audit independence invariant. This ADR records the **control mechanism** Solo Builder + Trustee Panel selected to discharge that property per [[feedback_architecture_vs_adr_boundary]] (architecture commits properties; ADRs commit controls).

Decision-driving conditions:

- **Trustee headcount = 3** per Q2.7 confirmation (PRD §11 statutory minimum). Disjoint-trustee-subset mechanisms (strict ≥6 unique trustees or constrained-overlap ≥4 trustees) are unworkable at headcount 3.
- **§2.10a audit independence invariant** (architecture lines per §2.10a): opening prod-credential envelopes must not transitively grant audit-mirror access. The mechanism must enforce this structurally, not via policy alone.
- **Rotation cadence interface** per architecture §5.9 (database credentials annual; partner JWT signing keys per partner contract; KEK quarterly; webhook signing dual-secret window). The mechanism must support re-sealing across these cadences without procedural ambiguity.
- **Dry-run repeatability** per Story 0.2 AC-2 amendment (Q2.4 ratified): one dry-run per envelope class (3 total). The mechanism must support repeatable open-then-re-seal cycles with deterministic verification checks.
- **Geographic resilience** — concentrating envelopes at a single location creates a single point of failure (fire, theft, regional incident).
- **Operational accessibility for trustees** — the mechanism must be operable by trustees in Bihar without specialized cryptographic tooling at first activation, and must remain operable under bus-factor simulation discipline (Solo Builder silent for the duration).

Decision deadline: Story 0.2 Task 6 — `_AWAITING EXTERNAL ACTION_` gate for Tasks 7 (sealing of `sealable-now` envelopes), Task 8 (dry-run), Task 9 (bus-factor table-top). Resolved at 2026-06-05 Trustee Panel ratification per `.decision-log.md` Decision 2026-06-05-018 + Decision 2026-06-05-034.

## Decision

**The Trust escrows credentials via physical sealed envelopes held under a separate-custodial-path-per-envelope-class control, opened by a ≥2-trustee quorum at the custodial location, and re-sealed under the same quorum after retrieval.**

Specific commitments:

1. **Sealing medium** — physical paper envelopes carrying the credential payload in printed or written form, sealed with tamper-evident seals (signature across seal-tape + date inscribed; the tamper-evident seal is the verification check for envelope integrity per `sealing-procedure.md` §4).
2. **Custodial locations per envelope class:**
   - `prod-credential` envelopes — **trustee residences** (multi-geographic distribution across the trustee panel's home addresses; minimum two trustees hold the active prod-credential envelopes such that retrieval requires both physically present).
   - `audit-mirror-credential` envelopes — **bank safe deposit box** (joint-access; structurally distinct from the prod-credential residence-based custody per §2.10a). Compromise of the prod-residence custody does not transitively grant access to the bank safe deposit.
   - `high-sensitivity-tier-credential` envelopes — **bank safe deposit box at a geographically separated branch from the audit-mirror box** (e.g., audit-mirror box at City-A branch; high-sensitivity-tier box at City-B branch). Provides additional separation from the audit-mirror class while sharing the bank-safe-deposit operational model.
3. **Quorum-open procedure** — both trustees must be physically present at the custodial location to open. For trustee residences, both trustees + the residence-holder are present (3-person presence). For bank safe deposit boxes, both trustees present themselves at the branch with the joint-access authority.
4. **Re-sealing** — after retrieval, the credential is returned to a fresh envelope; both trustees sign across the new seal-tape with date; the new envelope ID is recorded in `escrow-ledger.md` Sealing log.
5. **§5.9 rotation alignment** — when a credential rotates per architecture §5.9 cadence, the rotation event triggers a re-seal cycle: the old envelope is opened by quorum, the rotated credential payload is sealed in a new envelope, the old envelope's contents are destroyed under both-trustee witness, the rotation event is recorded in `escrow-ledger.md` per the supersession schema. Per Q2.6 ratification, the credential-escrow-mechanism ADR (this file) includes explicit reconciliation of the operational-rotation pathway (architecture §5.9 two-person Terraform-mediated approval — operational engineers) and the escrow-quorum pathway (≥2 trustees — governance). Both pathways are operative as distinct controls: operational rotation is engineer-driven on the cadence; escrow re-sealing is trustee-driven and triggers from operational-rotation events. The two pathways remain independent — rotation does not require trustee presence at the rotation moment; re-sealing happens after rotation at the next available trustee quorum window.

## Alternatives considered

- **GPG-encrypted-to-N-recipients with emergency-recovery threshold** — Rejected because: (a) requires cryptographic key management at each trustee (private GPG keys held individually, each one a single point of failure); (b) trustee operability — Bihar-based trustees may not have GPG fluency at first activation; (c) recovery scheme adds operational complexity (Shamir-style threshold scheme for emergency recovery would need to be authored as a separate ADR). Reconsider if: trustee panel grows + acquires GPG fluency + operational tempo demands online quorum-open without physical travel.
- **Shamir's Secret Sharing with M-of-N share distribution** — Rejected because: (a) M-of-N share schemes at headcount = 3 effectively reduce to 2-of-3 with single-share-loss being catastrophic; (b) digital share storage at each trustee re-introduces the GPG-style key-management problem; (c) physical share storage (printed shares) does not add separation over physical-envelope-with-joint-quorum. Reconsider if: shares can be held by external custodians (notary; lawyer per Story 0.13 engagement) reducing the single-point-of-failure concern.
- **Password manager emergency-kit feature (e.g., 1Password Emergency Kit)** — Rejected because: (a) introduces a third-party SaaS dependency for credential survival, increasing vendor-trust surface; (b) the emergency-kit recovery flow at most password managers is single-trustee-initiated with notification to other trustees — does not enforce a quorum-open structurally; (c) introduces a recurring SaaS bill which the Trust would prefer to avoid pre-launch. Reconsider if: an open-source self-hosted equivalent emerges with a structurally-enforced quorum-open primitive.
- **Hybrid (physical envelope holding decryption keys for software vault)** — Rejected because: (a) the hybrid combines the operational complexity of both layers without resolving the §2.10a separation cleanly; (b) compromise of the software vault decryption keys (envelope) instantly compromises the vault contents, collapsing the two-layer abstraction. Reconsider if: a vault product emerges with structural separation between credential classes that the hybrid layer could discharge cleanly.
- **Disjoint trustee subsets (strict 2-of-3-prod + 2-of-3-audit with no overlap, requires ≥6 trustees)** — Rejected because: trustee headcount is 3 per Q2.7 confirmation; the Trust's statutory minimum is 3 trustees per PRD §11, and expanding the panel to 6+ trustees is a separate governance decision with its own cost (panel coordination overhead; per-decision quorum negotiation; legal-counsel-engaged Trust Deed amendments). Reconsider if: trustee panel grows to ≥6 in future supersession.
- **Constrained-overlap disjoint (one shared trustee permitted, requires ≥4)** — Rejected at headcount 3 for the same reason; reconsider at panel growth.
- **Separate sealing mechanism per envelope class (e.g., prod = GPG; audit = physical)** — Rejected because: maintaining two parallel sealing-procedure runbooks adds operational complexity without preserving operability across both classes when trustees rotate. The chosen separate-custodial-path-per-class approach uses one sealing mechanism (physical envelopes) for all classes, with the §2.10a invariant preserved via custodial location separation.

## Consequences

### Operational

- **Runbook obligation** — `docs/escrow/sealing-procedure.md` is the canonical runbook for sealing operations. Pre-ADR `[deferred ADR — placeholder procedure]` tags in §2.4 (apply sealing mechanism) + §2.6 (transmit to custodial location) are replaced with citations to this ADR at the same commit landing this ADR.
- **Three custodial location paths** introduce three operational coordination surfaces: (a) trustee residence access for prod credentials; (b) bank safe deposit Branch A for audit-mirror credentials; (c) bank safe deposit Branch B for high-sensitivity-tier credentials. The trustees commit to maintaining valid joint-access authority at both bank branches per `operations-policy.md` cadence.
- **Rotation events trigger re-seal cycles** at the next trustee-quorum window after operational rotation. Re-seal latency = time from operational rotation to next quorum window; documented expectation is ≤30 days per Q2.6 reconciliation note. If re-seal latency exceeds 30 days, escalation per `escrow-ledger.md` Procedure-revision log.
- **Bus-factor table-top exercises** per Story 0.2 AC-3 + Q2.8 ratification execute against this mechanism. The substitute engineer per Q1.3 participates as Solo-Builder-silence guarantor; trustees execute the quorum-open + re-seal cycle.

### Security

- **§2.10a invariant preserved structurally** — compromise of any single custodial path does not transitively grant access to envelopes in another path. Specifically: residence break-in cannot grant bank safe deposit access; bank branch incident cannot grant residence access. The invariant is enforced by physical separation, not by procedural promise.
- **Threat-actor surface** per architecture §2.1 — adds three custodial-location attack surfaces (trustee residences; two bank branches) but eliminates the cryptographic-key-loss attack surface that GPG-based schemes introduce. Net surface change: physical-security risk traded for cryptographic-operability risk; trustees can rehearse physical security at the custodial locations directly.
- **Trustee-coercion threat** — a coerced 2-trustee quorum can still open the appropriate-class envelope. The §2.10a invariant only prevents transitive escalation across classes; it does not prevent a coerced quorum from opening within-class. Mitigated procedurally by `escrow-ledger.md` event logging + the bus-factor simulation rehearsal (which validates that quorum-open events are observable).
- **High-sensitivity-tier two-person operational rotation per §5.9** continues to apply at rotation time; this ADR's escrow procedure governs sealing (post-rotation) and quorum-open (retrieval), not the rotation event itself.

### Performance

- **Open latency** — physical retrieval from custodial location is slower than cryptographic vault retrieval. Expected open latency: trustee residence = same-day if both trustees in the same city; ≤72 hours under bus-factor scenarios with travel. Bank safe deposit = banking-hours-constrained; ≤same-business-day at the trustee's home branch; ≤72 hours if cross-branch travel required.
- **No online operability** — quorum-open cannot occur online. Operations requiring credential retrieval must accommodate the physical-presence requirement in their SLA budgets.

### Cost

- Per-trustee residence custody: zero direct cost (uses existing trustee residence); indirect cost = trustee time + physical-security maintenance at residence.
- Per-bank-safe-deposit-box: annual rental fee per box × 2 boxes = ~₹3,000-6,000/year per branch (Bihar 2026 typical rates). Two boxes = ~₹6,000-12,000/year total. Trust operating budget per PRD §9.3 absorbs.
- No SaaS recurring fees (vs password-manager-emergency-kit alternative).

### Failure modes accepted

- **Residence-incident loss of prod-credential envelopes** — recovery via per-credential rotation: revoke the lost credentials at the source-of-truth (Cloudflare admin re-issued; database service account rotated; etc.); re-seal new envelopes; log the loss event in `escrow-ledger.md` Procedure-revision log. Recovery latency ≤ source-of-truth rotation latency per architecture §5.9.
- **Bank-branch-incident loss of audit-mirror or high-sensitivity-tier envelopes** — same recovery path; recovery latency may extend if the credential rotation at the source-of-truth requires multi-step coordination (e.g., audit-mirror IAM grant rotation per Story 1.10).
- **Trustee unavailability for quorum** — emergency single-trustee fallback per `escrow-ledger.md` framework (time-bounded 30 days per Story 0.9 D-02 precedent); recorded as `.decision-log.md` `[CONTINUITY]` entry. If the single-trustee fallback exceeds 30 days, the credential rotation per architecture §5.9 is triggered to invalidate the single-trustee-held envelope.
- **Trustee dispute over envelope contents post-open** — re-seal procedure requires both trustees to sign across the new seal-tape; dispute prevents re-seal; escalation to Trust Deed dispute resolution per `engagement-letter-template.md §11` (Story 0.13). Mitigated by the dual-trustee witness requirement at the open event.

### Migration / pivot path

This ADR is reversible. Trigger conditions for migration to an alternative mechanism:

- **Trustee panel expansion to ≥6 trustees** — re-evaluate strict disjoint subsets (Q2.3 option a) as a stronger structural §2.10a control. Supersession ADR authored at Trustee Panel decision.
- **Operational tempo demanding online quorum-open** — e.g., if member-app volume necessitates frequent credential rotation, the ≤72-hour physical-retrieval latency may become a bottleneck. Re-evaluate GPG-encrypted-to-N-recipients or hardware-security-key based vault. Supersession ADR.
- **Custodial-path failure** — bank branch closure, residence-no-longer-available, or trustee turnover that breaks the joint-access authority. The Procedure-revision log captures the failure event; the supersession ADR authors the corrective custodial arrangement.
- **§2.10a invariant violation discovered** — if a downstream review surfaces a path where prod-quorum compromise transitively grants audit-mirror access (e.g., trustee residence custodian also holds bank safe deposit access via Power of Attorney), the supersession ADR re-architects the custody to restore the invariant.

Pivot procedure: author successor ADR; flip this ADR's `Status:` to `superseded` + add `Superseded by: ADR-NNNN-<successor>` link; mass-migrate existing envelopes to the new mechanism over a coordinated re-seal window; archive this ADR's runbook references with the supersession date.

## References

- [Source: `_bmad-output/planning-artifacts/architecture.md`, §Workspace Layout (line 4172)] — `docs/escrow/` directory existence
- [Source: `_bmad-output/planning-artifacts/architecture.md`, §2.10a audit independence invariant] — the structural property this ADR's control enforces
- [Source: `_bmad-output/planning-artifacts/architecture.md`, §5.9 secret rotation] — rotation cadences this ADR's re-seal cycle aligns with
- [Source: `_bmad-output/planning-artifacts/architecture.md`, §5.10 backup-alert path] — operational continuity property
- [Source: `_bmad-output/planning-artifacts/prd.md`, §9.1.1] — credential-escrow property commitment + AR-67
- [Source: `_bmad-output/planning-artifacts/prd.md`, §11] — Trustee Panel statutory minimum (≥3) + this ADR's headcount=3 working assumption
- [Source: `_bmad-output/implementation-artifacts/0-2-credential-escrow-established-with-trustee-quorum-open.md`] — owning Story (Story 0.2 Tasks 6-9)
- [Source: `_bmad-output/implementation-artifacts/phase-0-trustee-questionnaire.md`, Q2.1 + Q2.2 + Q2.3 + Q2.6 + Q2.7] — trustee ratification answers
- [Source: `.decision-log.md`, Decision 2026-06-05-018] — Story 0.2 Tasks 6-9 ratification entry citing this ADR
- [Source: `.decision-log.md`, Decision 2026-06-05-034] — QC.3 ADR-authoring-now ratification authorizing this ADR
- [Source: `docs/escrow/README.md`, §"Audit independence invariant — envelope-class separation"] — framework README this ADR's control implements
- [Source: `docs/escrow/sealing-procedure.md`] — operational runbook citing this ADR
- [Source: `docs/knowledge-transfer/adr-index.md`] — live ADR index row (to be updated to `ratified` at the commit landing this ADR)
- Memory: [[feedback_architecture_vs_adr_boundary]] — property/control discipline
- Memory: [[feedback_architecture_vs_prd_boundary]] — boundary discipline
- Memory: [[feedback_closure_language_precision]] — closure-language convention

---

## Changelog

| Date | Status flip | Author | Notes |
|---|---|---|---|
| 2026-06-05 | (initial draft) | Solo Builder (BigDev) | Authored at Story 0.2 Task 6 + QC.3 ratification per Decisions 2026-06-05-018 + 2026-06-05-034. |
| 2026-06-05 | drafted → under-trustee-review | Solo Builder | Presented to Trustee Panel as Q2.1 + Q2.2 + Q2.3 + Q2.6 + Q2.7 of phase-0-trustee-questionnaire.md. |
| 2026-06-05 | under-trustee-review → ratified | Dhiraj Rahul + Kalpana Bharti | Ratified at trustee panel session 2026-06-05; logged in `.decision-log.md` Decision 2026-06-05-018 + 2026-06-05-034. |
