# Engagement Letter Template (Framework Skeleton)

**Authority cite:** Story 0.13 AC-1; UX §Phase-0 P0-4 (UX spec line 109); epics line 687; architecture §External Validation Pending (architecture lines 4849-4852); Decision 2026-06-02-013.

**Status:** Framework skeleton — substantive legal language pending counsel return at Task 9 engagement-signature event.

---

> **HEADER NOTE — Read before any execution:**
>
> This template is a **framework skeleton**. Substantive legal language (jurisdiction clauses, dispute resolution, indemnification, force majeure, governing law, professional-indemnity coverage specifics, work-product ownership detailed boundaries) is the **counsel return per [[feedback_architecture_vs_adr_boundary]]**: the engagement letter is a control instrument; this framework commits the property; legal counsel commits the specific control language.
>
> **The trust may NOT execute the engagement letter using this template alone — counsel return on the substantive language is a prerequisite.** Unlike Story 0.6's contract-template (which depends on Story 0.13 closure for counsel-return content), THIS template's substantive return is provided by the named counsel selected at Story 0.13 Task 8 — the same counsel who will execute the engagement. Self-referencing dependency is intentional per Decision 2026-06-02-013 body item 7: counsel reviews and edits the engagement letter for their own engagement, then signs.
>
> Sections §7 NDA + §10 Work-product ownership + §11 SLA breach + §12 Insurance + §13 Termination carry explicit `<COUNSEL-RETURN PLACEHOLDER>` markers identifying the counsel-return dependency boundaries. Jurisdiction clauses + governing law + indemnification + force majeure are part of the counsel return across the document.

---

## §1 Parties

This concurrent-review engagement is between:

- **The Engager:** The Wealth Trust (TWT), a Bihar-jurisdiction mutual-aid trust represented by its Trustee Panel. Signatory authority: Trustee Panel chair + ≥1 additional trustee per the ≥2-trustee authorization quorum established by Story 0.13 AC-1.
- **The Concurrent-Reviewer:** `<NAMED COUNSEL — pending Task 8 selection>`, a `<COUNSEL CATEGORY — sole practitioner | firm | chambers — pending Task 8>` qualified in DPDPA practice + Indian Trust Act practice + financial-services regulatory practice per the shortlist criteria committed in `counsel-roster.md`.
- **Trust-side witness role:** an independent witness designated by the Trustee Panel (typically a trustee not party to the ≥2-trustee signature quorum, or an independent third party of standing).

The Engager engages the Concurrent-Reviewer for the concurrent-review services enumerated in §3 (Review scope), at the response cadence enumerated in §4 (Response SLA), under the term enumerated in §8, with the binding properties enumerated in §6 (COI) + §7 (NDA) + §10 (Work-product ownership).

## §2 Engagement nature

**Concurrent review — NOT post-hoc audit.** This is the load-bearing structural property of this engagement per UX spec line 75: "Legal counsel is engaged from spec-drafting forward, with concurrent-review scope; their findings shape the spec, not just check it. A standing footnote acknowledging fragility while the underlying posture is unchanged would, in hostile litigation, be entered as evidence that the trust knew its T&C was unenforceable — worse than no footnote. Either the posture is defended substantively (legal counsel hardens the language and operational practices to match) or it is changed. The hedge is not a third option."

The Concurrent-Reviewer reviews artifacts **during drafting and pre-launch** (NOT after the artifact has shipped, NOT after a legal-exposure event has occurred). Counsel return content **shapes the spec** rather than merely flagging defects — substantive changes proposed by Counsel are integrated into the artifact's implementing Story per `per-artifact-return-roster.md` integration lifecycle.

This engagement is distinct from:
- **Post-hoc audit engagement** — out of scope under this letter; may be engaged separately under a separate engagement letter
- **Per-artifact retainer-counsel pattern** — the engagement is concurrent across the term, NOT event-bounded per artifact; Counsel commits availability across the term per §9

## §3 Review scope

The Concurrent-Reviewer reviews the substantive scope items committed in the **review-scope-charter** (`review-scope-charter.md`), bound at Task 9 engagement-signature event:

**Primary scope (per epics line 908 + UX spec line 109):**
- (a) **Trust-posture copy review during drafting (not after)** — Niyamavali clauses per PRD §10.1 trust-posture + FR-94 verbatim phrasings + Epic 2 Niyamavali publishing per Stories 2.3 + 2.4 + 2.5 + 2.6 T&C version-pinning + the Sahyog Vivran public-rendering copy per Story 11b memorial + the close-of-cycle celebration copy per Pool-Reality #2 + the disaster-handling slow-roll copy per FR-98 + the Contribution Note copy per FR-33 + the under-funded-delivers-actual copy per FR-19 + the facilitated-recovery-never-enforced copy per FR-36 + the screenshot-only-on-mismatch copy per FR-32
- (b) **DPDPA consent flow design review** — claim-time DPDPA consent per UX spec line 79 + consent registry granular records per FR-97 + Story 2.7 + data export per FR-95 + Story 3.11 + RTBF soft-delete per FR-96 + Story 3.12 + DPDPA Data Fiduciary registration timing per PRD §4.14.1 + DPO appointment per OQ-7 + breach-reporting tooling per architecture §2.12 + Story 14.3 + minor-data handling per architecture §1778 + audit-log PII handling under RTBF per architecture §1754
- (c) **Denial-appeal flow procedural fairness review** — FR-43A internal claim-denial appeal flow per PRD line 712 with three-stage taxonomy + denial-notification copy + appeal-CTA + named human shepherd's contact per FR-41 + appeal-SLA + no-formal-time-limit-on-family-right-to-appeal discipline + structured denial_reason audit-line per FR-47 + State-Trustee escalation per Story 6.13 + R9 voting workflow per Story 6.14 + audit-of-Anita UI per Story 1.11b + FR-43A external forum destination per architecture line 4786
- (d) **Account State Machine transition-table review for notice/service formalities** — Account State Machine per UX §0 Stance #2 + UX Design Challenge #2 + Cross-Cutting #12 + five states `active → claim-filed-frozen → disbursed-frozen-readable → disabled-T+90 → public-record-∞` + transition-table format + five mandatory test cases + dispatcher suppression policy per architecture §3.4 + Module Shelf grief-context exclusion per UX spec line 77 + durable nominee-facing access path per architecture §2892 + notice/service formalities under Indian Trust Act + CPA 2019
- (e) **Dual-path claim authority-to-file evidentiary specification** — UX Design Challenge #1 dual-path death-claim intake convergence ICP + deceased-phone-OTP authority-to-file evidentiary basis (Ravi-mode proxy-credential) + helpline-mediated authority-to-file evidentiary basis (Persona #7 + Story 6.10 verifier console) + dedup semantics + in-flight session visibility + override semantics per UX §164 ICP commitments + claim-shepherd assignment per FR-41 + witnessed declaration of relationship per UX spec Stance #7 + OQ-UX-9 transferable-credential proxy patterns

**Cross-Story deferred-scope inventory:** the ~32 rows enumerated in `review-scope-charter.md §3` (Stories 0.2 + 0.4 + 0.5 + 0.6 + 0.7 + 0.12 upstream framework cross-references) + the 9-row regulatory surface review per `review-scope-charter.md §4` + the ADR slot review per `review-scope-charter.md §5`.

**Out-of-scope items** (per `review-scope-charter.md §7`): criminal-defense; tax-litigation; non-Bihar non-Indian jurisdiction matters; non-trust-related business; non-legal accounting + tax-filing; specific contract negotiations with non-trust parties — these may be engaged separately under separate engagement letters, NOT under this concurrent-review engagement.

## §4 Response SLA

**Per-artifact SLA default:** 5-10 business days per artifact, computed from `actual_submission_date` (per `review-artifact-roster.md`) to `actual_return_date`. The default range accommodates artifact complexity — counsel exercises discretion within the 5-10 biz day window per substantive review effort required.

**Expedited SLA:** 2-3 business days per artifact, applied to time-critical artifacts marked priority-1 or surge-tagged per the per-artifact-rate-card (per the deferred ADR `adr-index.md` Section K row #6). Expedited SLA carries surge-pricing multiplier per the rate-card.

**Acknowledgment SLA:** within 2 business hours of artifact submission — counsel confirms receipt of the artifact + commits a target return date within the per-artifact-SLA window. Acknowledgment is a separate event from substantive review return.

**SLA breach escalation:** see §11.

## §5 Pricing structure

The pricing structure carries one or more of the following shapes, per Counsel + Trustee Panel agreement at engagement-signature:

- **Retainer-fixed:** monthly retainer of `<RETAINER AMOUNT — pending Task 9 counsel + Trustee Panel agreement>`, providing for `<N>` artifacts per month at the per-artifact-SLA, with additional artifacts billed at the per-artifact rate
- **Per-artifact:** per-artifact rate of `<PER-ARTIFACT BASE RATE — pending Task 9 agreement>` for standard-complexity artifacts; complex-artifact rate `<COMPLEX RATE — pending>` for artifacts requiring substantive cross-statutory analysis
- **Hybrid:** a combination of retainer-fixed + per-artifact overage rates
- **Surge-pricing:** expedited 2-3 biz day SLA carries surge multiplier `<SURGE MULTIPLIER — pending>` per the per-artifact-rate-card

**Substantive amount + funding source** is Trustee Panel + Story 0.12 P0-3 spec-to-cadence reconciliation contract-help-path territory per `docs/spec-to-cadence-reconciliation/reconciliation-decision-framework.md` §3(c) + Decision 2026-06-01-012 body item 9. The framework commits the pricing-shape options; specific amount + funding source resolution lands at Task 9 engagement-signature event + Decision 2026-06-02-013 supersession entry.

**Invoicing cadence:** monthly billing on the `<INVOICING DAY — pending agreement>` business day of each month; payment terms `<NET-N — pending counsel return>` from invoice date; non-payment beyond NET-N triggers counsel-side escalation per §13.

## §6 Conflict-of-Interest (COI) disclosure

**Initial disclosure (at engagement-signature):**
- Counsel discloses all relevant practice-area engagements that could conflict — particularly counsel-side engagements with other Bihar trusts / cooperative-societies / financial-services entities that could constitute adverse representation
- Counsel acknowledges no engagement with TSCT or any other operating mutual-aid trust that could constitute privileged-information conflict
- Counsel discloses any prior or current engagement with members of the Trustee Panel that could create a personal-interest-conflict
- Counsel discloses any prior or current engagement with the proposed members of TWT's helpline operator or verifier or field-worker staff layer

**Ongoing-disclosure requirement:** Counsel notifies the trust within 5 business days of any new engagement that emerges during the term that creates a COI surface. Failure to disclose is grounds for trustee-initiated termination per §13.

**COI classification:**
- **No conflicts** — engagement proceeds without restriction
- **Disclosed-with-managed-conflicts** — counsel + Trustee Panel agree on management plan (e.g., specific scope-area carve-out; Chinese-wall mechanism; counsel-side recusal on specific artifacts); management plan documented in `engagement-ledger.md` §4
- **Disclosed-with-unmanaged-conflicts-disqualifying** — engagement does not proceed; Trustee Panel returns to shortlist for substitute counsel selection

**COI review cadence:** quarterly per `engagement-ledger.md` §9 Periodic re-attestation log + on-demand if Trustee Panel surfaces concerns.

**Mid-term COI escalation:** either party may raise a potential mid-term COI event at any time during the term. Upon notice, a 14-business-day review window opens:
- Trustee Panel (≥2 trustees) + Counsel jointly review the potential conflict; outcome documented in `engagement-ledger.md` §4
- Outcome is one of: `no-conflict-confirmed` (engagement continues without restriction), `disclosed-with-managed-conflicts` (management plan documented in `engagement-ledger.md` §4), or `disclosed-with-unmanaged-conflicts-disqualifying`
- **If `disclosed-with-unmanaged-conflicts-disqualifying` confirmed:** §13 for-cause termination is triggered immediately; the trust returns to the shortlist per `README.md` §5 fallback path; the event is logged in `engagement-ledger.md` §4 + `.decision-log.md` `[LEGAL]` entry
- Failure to raise a known COI within 5 business days of discovery constitutes a breach of the ongoing-disclosure requirement above and is grounds for for-cause termination per §13

## §7 Confidentiality + NDA

**Status:** `<COUNSEL-RETURN PLACEHOLDER — substantive NDA language committed by Counsel at engagement-signature>`

**Framework commitments at engagement-signature:**
- NDA is binding through and beyond engagement termination per Counsel's standard NDA
- NDA covers all artifacts submitted to Counsel + Counsel's return content + Trustee Panel + Solo Builder communications during the term
- NDA-on-file location: trustee-accessible repo path + counsel-side archive; specific path recorded in `engagement-ledger.md` §5 Engagement-signature log
- NDA survives termination of this engagement letter; NDA-breach is grounds for legal action by the non-breaching party
- NDA does not preclude Counsel's legal obligations to disclose privileged content under judicial order or regulatory requirement; such disclosures are documented per `engagement-ledger.md` §10 Pack-revision log
- Cross-reference to §10 Work-product ownership: privilege-protected counsel opinions remain Counsel-side privileged; non-privileged summaries are trust-side records

**Substantive NDA language** (counsel-return-pending): definitions of "Confidential Information"; permitted-use clause; non-use carve-outs; survival period; remedies for breach; jurisdiction for enforcement; choice-of-law per Indian Contract Act + Bar Council of India professional-rules.

## §8 Term

**Initial term:** 12 months from engagement-signature date per `engagement-ledger.md` §5.

**Renewal:** auto-renewing on annual trustee review per `engagement-ledger.md` §9 Periodic re-attestation log; auto-renewal triggers at the 60-day-pre-anniversary mark unless either party terminates per §13.

**Term-end handover:** at term-end (without renewal), counsel completes outstanding artifact returns per §4 SLA; in-progress artifacts are handed over per the counsel-side handover protocol per the deferred ADR `adr-index.md` Section K row #7; privileged content remains counsel-side per §10.

**Termination during term:**
- **Either party may terminate with 60-day notice** — notice in writing to the other party + recorded in `.decision-log.md` `[LEGAL]` entry
- **Trustee-initiated termination for cause is immediate** with NDA + work-product terms surviving — for-cause triggers enumerated in §13
- **Counsel-initiated termination for documented breach** (e.g., non-payment beyond NET-N + cure period; scope expansion beyond contracted concurrent-review scope) is permissible with 30-day notice + handover

## §9 Concurrent-review cadence

Counsel commits **availability across the term** — NOT a per-artifact engagement-renewal. This distinguishes the engagement from per-artifact retainer-counsel patterns and is the load-bearing engagement-term property per the §2 engagement nature.

**Availability commitment:**
- Counsel commits availability for artifact review at the per-artifact-SLA throughout the term
- Counsel may decline a specific artifact if outside competence with written rationale (recorded in `engagement-ledger.md` §7 Return-receipt log as `declined-out-of-scope`); such decline triggers Trustee Panel + Solo Builder consideration of substitute-counsel engagement for the declined artifact's scope-area
- **The decline right does NOT apply to artifacts within `review-scope-charter.md` §1 (the five AC-named primary scope items).** Declining a §1 primary-scope-item artifact constitutes a material engagement breach, triggering the for-cause termination path per §13. Competence on all five AC-named scope items is a mandatory hiring criterion per `counsel-roster.md`; declining a §1 artifact after engagement is inconsistent with the engagement basis.
- Counsel **may NOT decline availability across the term** without breach; sustained unavailability triggers Trustee Panel review per §11 SLA-breach escalation

**Concurrent-review event-receiver:** Counsel commits to engaging with artifacts as they are submitted, NOT batching artifacts for periodic-review-cycles. The engagement is event-driven (per-artifact-submission triggers per-artifact-SLA), not calendar-cycle-driven.

**Pre-launch checkpoint availability:** Counsel commits availability at the named pre-launch checkpoints per `review-scope-charter.md §6`: Phase-0 closure, T&C version-pin lock per Story 2.6, first-claim SM-1 pre-launch, public-launch gate. Checkpoint attendance + outcome is logged in `engagement-ledger.md` §9.

## §10 Work-product ownership

**Status:** `<COUNSEL-RETURN PLACEHOLDER — substantive work-product-ownership detailed boundaries committed by Counsel at engagement-signature>`

**Framework commitments at engagement-signature:**
- **Counsel's review opinions become trust property** for the purposes of the trust's operational-readiness records — the trust records Counsel's substantive positions in `per-artifact-return-roster.md` per-row entries
- **Specific legal advice carries privilege** per Bar Council of India + Indian Evidence Act § attorney-client privilege provisions — privilege-protected content is counsel-only-archive and does NOT enter the trustee-accessible repo per Story 0.13 README §4 invariant 10
- **The summary of Counsel's positions** in trust records is **non-privileged operational-readiness content** — these summaries land in `per-artifact-return-roster.md` `return_summary` + `return_substantive_changes_required` + `return_open_questions` fields
- **Counsel-side archive** retains the substantive privileged advice + supporting analysis per Counsel's standard records-retention practice
- **Trust-side archive** retains the non-privileged summaries + integration-tracking content per `per-artifact-return-roster.md` schema
- **Privilege-boundary policy** for ambiguous content (e.g., substantive scope-area analysis that crosses privilege-protected legal advice and non-privileged operational-readiness summary) is the deferred ADR per `adr-index.md` Section K row #3

**Substantive work-product-ownership detail** (counsel-return-pending): specific privilege-boundary scope; counsel-side archive retention horizon; trust-side archive retention horizon; work-product-derived-artifacts (e.g., revised T&C language counsel proposes that the trust adopts — does the proposed language carry privilege at adoption?); successor-counsel transfer procedure (privilege transfer or waiver at counsel substitution).

## §11 SLA breach + escalation

**Status:** `<COUNSEL-RETURN PLACEHOLDER — substantive SLA-breach remedies + escalation thresholds committed by Counsel at engagement-signature>`

**Framework commitments at engagement-signature:**
- **Acknowledgment-SLA breach** (counsel does not acknowledge artifact within 2 business hours) — escalates to Counsel-side senior oversight; recurring acknowledgment-SLA breach (≥3 in a month) escalates to Trustee Panel review
- **First-review-comment-SLA breach** (counsel does not return substantive review within the 5-10 biz day per-artifact-SLA, or expedited 2-3 biz day surge-SLA) — escalates to Counsel-side senior oversight; recurring first-review-SLA breach (≥3 in a quarter) triggers Trustee Panel review per `engagement-ledger.md` §8 SLA-breach-tracking log + may trigger trustee-initiated termination per §13
- **Trustee-side ≥3 SLA breaches in a quarter** triggers mandatory Trustee Panel review of the engagement health; review outcome documented in `engagement-ledger.md` §9 Periodic re-attestation log

**Substantive SLA-breach remedies** (counsel-return-pending): specific Counsel-side senior-oversight escalation path; remediation commitments by Counsel on documented breach; pricing-adjustment mechanism for documented sustained-breach periods; mandatory-substitution-counsel trigger if remediation does not restore SLA-compliance within `<REMEDIATION WINDOW — pending counsel return>`.

## §12 Insurance + liability

**Status:** `<COUNSEL-RETURN PLACEHOLDER — substantive insurance + liability bounds committed by Counsel at engagement-signature>`

**Framework commitments at engagement-signature:**
- Counsel carries professional-indemnity coverage adequate for the engagement scope per Counsel's standard professional-indemnity coverage
- Counsel's professional-indemnity coverage protects against routine review-error claims per Indian Advocates Act professional-liability framework
- **Trust carries no liability for Counsel's other engagements** — Counsel is an independent professional, not an employee or agent of the trust
- Counsel acts as independent professional under Indian Advocates Act, not as a trust agent — Counsel's professional duties under the Bar Council of India rules govern professional conduct
- Counsel's liability for documented professional negligence (per Indian Contract Act + Indian Evidence Act + Bar Council of India professional-rules) is preserved per counsel's professional-indemnity coverage limits + the standard counsel-side liability cap

**Substantive insurance + liability bounds** (counsel-return-pending): specific professional-indemnity coverage amount; specific liability cap; specific carve-outs (e.g., willful misconduct exclusion vs gross negligence inclusion); counsel-side errors-and-omissions coverage scope; trust-side indemnification of counsel for permitted-use of work-product (e.g., if the trust adopts counsel-proposed T&C language and a court action later challenges it, does the counsel-side indemnification cover the proposed-language defense?).

## §13 Termination triggers

**Status:** `<COUNSEL-RETURN PLACEHOLDER — substantive termination-triggers + cure procedures + handover-mechanisms committed by Counsel at engagement-signature>`

**Framework commitments at engagement-signature:**

**Mutual termination** — either party may terminate the engagement at any time by mutual agreement; mutual termination is documented in a `.decision-log.md` `[LEGAL]` entry with effective date; in-progress artifacts handed over per the counsel-side handover protocol.

**For-cause termination by the trust** — immediate termination with NDA + work-product terms surviving; for-cause triggers include:
- Counsel-side documented breach of NDA
- Counsel-side documented breach of COI disclosure obligations (failure to disclose new conflicts per §6 ongoing-disclosure requirement)
- Counsel-side documented breach of professional-conduct rules under Bar Council of India
- Counsel-side documented sustained SLA-breach pattern (≥3 breaches in a quarter per §11 + remediation-window failure)
- Counsel-side documented professional incompetence on substantive review (e.g., counsel-return content materially misrepresents the legal posture per peer-review by substitute counsel)

Notwithstanding the immediate-termination nature, Counsel completes handover of in-progress artifact-review materials within `<HANDOVER WINDOW — pending counsel return>` business days; in-progress materials (non-privileged notes + partially-reviewed content) are handed over per the counsel-side handover protocol per the deferred ADR `adr-index.md` Section K row #7; privilege-protected content remains counsel-side per §10.

**For-cause termination by Counsel** — permissible with 30-day notice + handover:
- Trust-side documented non-payment beyond NET-N + cure period
- Trust-side documented scope expansion beyond contracted concurrent-review scope (per §3 + `review-scope-charter.md §7` out-of-scope items)
- Trust-side documented action that creates impossible-to-resolve COI for Counsel (e.g., trust engages other counsel on the same scope-area without §6 management plan)

**60-day notice termination by either party** — without cause; in-progress artifacts handed over per the counsel-side handover protocol; NDA + work-product terms survive.

**Substantive termination-trigger detail** (counsel-return-pending): specific cure-window for trust-side non-payment + scope-expansion triggers; specific notification-format + delivery-mechanism for termination notice; specific handover-protocol-substance (per the deferred ADR `adr-index.md` Section K row #7); specific successor-counsel-transition timeline.

## §14 Signatures + ratification path

**Trust-side signatories** (per AC-1 authorization quorum):
- **Trustee Panel chair:** signature + date + reference to `.decision-log.md` Decision 2026-06-02-013 engagement-signature `[LEGAL]` entry
- **≥1 additional trustee:** signature + date
- **Trust-side witness:** signature + date

**Counsel-side signatories:**
- **Named Counsel** (per `counsel-roster.md` row selected at Task 8): signature + date + Bar Council of India enrollment number + firm-affiliation reference

**Ratification path:**
1. Counsel reviews + edits the engagement letter substantive language (§7 NDA + §10 Work-product + §11 SLA + §12 Insurance + §13 Termination + jurisdiction clauses + dispute resolution + indemnification + force majeure + governing law); the dev-story agent at Story 0.13 Task 6 commits the framework skeleton; the substantive return is Counsel's contribution at Task 9
2. Counsel files COI disclosure per §6 + NDA per §7
3. Trustee Panel chair + ≥1 additional trustee sign per the ≥2-trustee authorization quorum; trust-side witness signs
4. Counsel signs
5. Signed engagement letter is filed at: **secure non-git trustee-accessible storage** (the executed letter is held outside the git repository — only the storage reference path + receipt is committed to the repo); counsel-side archive holds the executed copy per §7 NDA + §10 work-product-ownership; reference path recorded in `engagement-ledger.md` §5 Engagement-signature log

   > ⭐⭐ **AMENDED 2026-08-28 — ⛔ A WITHHELD LOCATOR IS A *COMPLETE* STATE, ⛔ NOT AN OUTSTANDING ROW.**
   > Authority: [Decision 2026-08-28-160](../../.decision-log.md#decision-2026-08-28-160) clause 2 +
   > consent sheet `trustee-consent-sheet-2026-08-28-11b-consent-model.md` **Row 7 (ruled (a);
   > amendment authorised: Yes)**.
   >
   > ⚠ **Why this amendment is required rather than optional.** As drafted, step 5 demanded a
   > **resolvable reference path** in every case. The Trustee Panel and counsel have ruled that the
   > **actual custody location is deliberately kept out of the agent-accessible repository unless
   > absolutely necessary**. ⇒ an unamended step 5 permanently demands what the Panel has ruled it
   > will not supply, so the row **regenerates as "outstanding" at every reconciliation, forever**. A
   > clause that conflicts with ratified behaviour is a **required amendment**, ⛔ not a standing
   > breach ([[feedback_niyamavali_rulebook_not_spec]]).
   >
   > ⭐ **Step 5 is satisfied by EITHER:**
   > **(a) `path-recorded`** — a resolvable storage reference path + receipt in `engagement-ledger.md` §5; **OR**
   > **(b) `custody-attested-locator-withheld`** — custody **attested by the holder** (who holds it, in
   > what form), with the **locator deliberately withheld** by trustee/counsel ruling, and the ruling
   > cited in `engagement-ledger.md` §5.
   >
   > ⛔ **Under (b) the row is CLOSED, ⛔ not open.** ⛔ It may ⛔ not be re-raised as an outstanding
   > item, and ⛔ *"reference path OWED"* may ⛔ not be written against it
   > ([[feedback_closure_language_precision]] — *withheld by ruling* ≠ *not addressed*).
   > ⚠ **What (b) does ⛔ NOT do:** it does ⛔ not attest that the §14 signature *event* occurred
   > (Panel chair + ≥1 further trustee + trust-side witness), and it does ⛔ not evidence the document's
   > contents. Those remain separately recorded wherever they actually stand.
6. `.decision-log.md` Decision 2026-06-02-013 supersession entry records the engagement-signature event per the Story 0.1 + 0.2 + 0.3 + 0.4 + 0.5 + 0.6 + 0.7 + 0.12 supersession schema

**Engagement-letter amendment:** any amendment to the executed engagement letter requires ≥2-trustee + Counsel co-signature + `.decision-log.md` `[LEGAL]` entry per the supersession schema. The framework engagement-letter-template is amended via Story 0.13 ledger entries; the executed engagement letter is amended via supersession entries.

---

## Counsel-Return Placeholder Markers Inventory

The following sections explicitly tag the counsel-return dependency at engagement-signature time. Substantive language commits at Task 9; the framework commits the property + the structure.

| Section | Counsel-return dependency |
|---|---|
| §7 NDA | Substantive NDA language: definitions; permitted-use; non-use carve-outs; survival period; remedies; jurisdiction; choice-of-law |
| §10 Work-product ownership | Privilege-boundary scope; counsel-side retention horizon; trust-side retention horizon; work-product-derived-artifacts privilege treatment; successor-counsel transfer procedure |
| §11 SLA breach + escalation | Counsel-side senior-oversight escalation path; remediation commitments; pricing-adjustment for documented sustained-breach; mandatory-substitution-counsel trigger remediation window |
| §12 Insurance + liability | Professional-indemnity coverage amount; liability cap; carve-outs (willful misconduct exclusion vs gross negligence inclusion); errors-and-omissions scope; trust-side indemnification of counsel for permitted-use of work-product |
| §13 Termination triggers | Cure-window for trust-side non-payment + scope-expansion; notification-format + delivery-mechanism; handover-protocol-substance; successor-counsel-transition timeline |
| Document-wide | Jurisdiction clauses (Bihar default per `counsel-roster.md` shortlist criteria); governing law (Indian Contract Act + Bar Council of India professional-rules); indemnification (per §12); force majeure (Indian-jurisdiction force-majeure standard); dispute resolution (arbitration vs court-route per counsel guidance) |
