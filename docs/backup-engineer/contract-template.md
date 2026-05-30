# Contract Template — Backup Engineer Engagement (Framework Skeleton)

> **Status:** drafted (framework skeleton; substantive legal language pending Story 0.13 counsel return per Task 9)
> **Owner role:** Trustee Panel (engager); Legal Counsel per Story 0.13 (drafter / reviewer of §6 NDA + §9 Insurance + §10 Termination + §11 Dispute resolution); named backup engineer (contractor)
> **Architectural authority:** PRD §9.1.1 paragraph 6 (PRD lines 1380-1381); PRD A-13 (PRD lines 1532-1533); architecture §5.10 (lines 3375-3414); AR-67; Story 0.6 epics.md (lines 785-801)

---

> **⚠️ Framework-skeleton notice.** This template is a **framework skeleton**, NOT a substantive legal instrument. Substantive legal language (jurisdiction clauses, dispute resolution mechanics, indemnification, force majeure, governing law, NDA boilerplate) is the **Story 0.13 counsel return** per [[feedback_architecture_vs_adr_boundary]]: the contract is a control instrument; this framework commits the property (engagement scope + retainer band + SLA + termination triggers); legal counsel commits the specific control language. The trust may NOT execute the contract using this template alone — legal counsel return per Story 0.13 + ≥2-trustee ratification per Story 0.6 Task 8 are prerequisites.
>
> Sections marked **[COUNSEL-RETURN PLACEHOLDER]** are explicit Story 0.13 dependencies; the framework structure stands but the substantive language is to-be-authored.

---

## §1. Parties

- **Engager:** The Workmen's Trust (TWT), a registered trust under Indian Trust Act (Bihar registration), acting via the Trustee Panel.
- **Contractor:** The named backup engineer ("the Engineer") whose identity is recorded in `engineer-roster.md` post-Task-10 selection. The Engineer is engaged as an **independent contractor**, not an employee — no employee-benefit obligations attach (per §9).
- **Drafter / Reviewer:** Legal Counsel engaged under Story 0.13 (the Trust's standing counsel for trust-grade matters per PRD §9.1.1 paragraph 4 legal-engagement commitment).

## §2. Engagement scope

The Engineer is engaged for the four engagement modes enumerated in `scope-of-work.md`:

1. **Daily-ops read-only investigation** — continuous read-access to repo + KT pack + runbooks + escrow + degradation policy framework documents; quarterly capacity-review participation + threat-actor inventory participation + access-review participation + friction-budget review participation; activity audit-logged + periodically reviewed per architecture §5.10.
2. **Surge engagement** — Solo Builder requests for parallel work on a named scope; write/admin scoped per request with Solo Builder co-sign; per-hour billable rate per §4.
3. **Bus-factor activation** — Solo Builder unreachable >7 days OR trustee-declared incapacitation; backup engineer takes over on-call duties; write/admin requires per-action trustee approval; audit-mirror credential retrieval becomes available per Story 0.2 review Decision 3 + sealing-procedure §1.
4. **Comprehension administration participation** — the Story 0.5 Task 9 administration; cold-read of KT pack; ≥80% threshold per Story 0.5 AC-3.

**Scope exclusions** (binding per `scope-of-work.md` §5):

- No member-data access without trustee co-sign + audit-line emission;
- No PII-tier credential access without trustee co-sign;
- No single-principal write to production;
- No single-principal staging→prod promotion (per architecture §5.4);
- No KEK-root destruction approval (per §5.9 + Multi-actor controls in degraded mode);
- No action that bypasses architecture's audit-log emission discipline (per Cross-Cutting #9 + §1.5);
- No modification of audit-log retention policy or Object Retention Lock terms (per §2.10 + §5.2);
- No modification of the Engineer's own contract or IAM grants (separation of duties).

Scope additions or modifications require a contract amendment ratified by ≥2 trustees per Story 0.6 Task 8 material-edit threshold per `README.md` §5.

## §3. Retainer schedule

**Retainer band:** **₹15,000–25,000 per month** per PRD A-13 (PRD lines 1532-1533).

**Specific monthly retainer amount:** [TO BE FINALIZED BY TRUSTEE PANEL AT TASK 8 AUTHORIZATION SESSION — finalization guidance is in `README.md` §1; final choice is the panel's discretion].

**Retainer is availability compensation**, NOT per-activation billing. The retainer compensates the Engineer for:
- Continuous read-access maintenance + responsiveness to surge / bus-factor activation;
- Quarterly cadence participation (capacity-review + threat-actor inventory + access-review + friction-budget review) at the time-commitment named in `scope-of-work.md` §1;
- Comprehension-administration cycle participation (initial onboarding + annual re-administration);
- 4-hour acknowledgment SLA + 24-hour engagement-start SLA per §8.

Surge engagement (mode 2 per §2) is billable **separately** per §4; bus-factor activation (mode 3) is **continuously billable at the surge rate** for the duration of activation; comprehension administration (mode 4) is included in the retainer (no separate billing).

**Payment cadence:** Monthly retainer disbursed on the [NAMED DAY-OF-MONTH — final choice at Task 10 contract signature] via the trust's banking arrangement. Late payment (>15 days past due) triggers the Engineer's escalation right per `activation-procedure.md` §5 + termination-for-non-payment right per §10.

**Currency:** Indian Rupees (INR). No foreign-currency component at v1.

## §4. Surge-engagement billing

**Per-hour billable rate:** [TO BE FINALIZED BY TRUSTEE PANEL + ENGINEER AT TASK 10 CONTRACT SIGNATURE; framework commits the property — surge IS billable separately from the retainer; specific rate is the negotiation outcome].

**Surge engagement triggers:**
- Solo Builder requests parallel work on a named scope (bug investigation, OCR-parity issue, parser update, observability tuning, etc.) per `scope-of-work.md` §2.
- Bus-factor activation per §3 + `scope-of-work.md` §3 — the duration of bus-factor is billable at the surge rate.

**Invoicing cadence:** Per surge event; invoice submitted within 7 days of event closure; trust pays within 15 days of invoice receipt; late payment triggers §10 termination-for-non-payment right.

**Surge engagement output** (commits, ADRs, runbook revisions) is attributed to the Engineer in the audit trail per architecture §1.5 + Cross-Cutting #2 audit-line emission. Authorship attribution is not a billing matter; it is an audit-discipline matter.

## §5. Term + renewal

**Initial term:** 12 months from the contract signature date (Task 10).

**Renewal:** Auto-renews for successive 12-month terms on annual Trustee Panel review per `backup-engineer-ledger.md` "Contract-renewal log". **Default is renewal: the contract continues unless the Trustee Panel takes affirmative action to decline at the annual review; failure to hold the annual review does not lapse the contract — it triggers a follow-up review obligation per `backup-engineer-ledger.md` "Contract-renewal log" gap-row.** The annual review may:
- Re-attest the existing terms (no change; renewal proceeds);
- Re-negotiate the retainer amount within the A-13 band (Trustee Panel discretion);
- Re-negotiate the surge billing rate;
- Modify the scope-of-work (subject to ≥2-trustee material-edit threshold per `README.md` §5);
- Decline renewal (60-day notice required; alternate-engineer-onboarding triggered per `README.md` §8 deferred-ADR slot 5).

**Termination notice:**
- **Either-party 60-day notice** for routine termination.
- **Trustee-initiated immediate termination for cause** is permitted under documented breach (e.g., NDA violation; unauthorized PII access; bypass of audit-emission discipline). NDA + IP terms (§6 + §7) survive termination indefinitely.
- **Engineer-initiated immediate termination** is permitted under documented trust non-payment (>30 days past due cumulative) or scope expansion beyond the contracted scope-of-work without contract amendment.

**Renewal-decline cascade:** If the Engineer declines renewal at the annual mark, Trustee Panel + BigDev trigger the alternate-engineer-on-contract-renewal-decline procedure per `README.md` §8 deferred-ADR slot 5; the outgoing Engineer's read-access is revoked per `access-grant-procedure.md` §3 within 30 days of the renewal-decline notice.

## §6. Confidentiality + NDA

**[COUNSEL-RETURN PLACEHOLDER per Story 0.13]**

This section will carry the substantive NDA boilerplate per legal counsel return at Task 9. Framework commits:

- NDA is **binding through and beyond engagement termination** (no time-bound expiration of the confidentiality obligation per the standard trust-grade NDA pattern).
- NDA covers: member data of any shape (PII per architecture §2.7 tiering); credential material per Story 0.2 envelopes; trustee-deliberation records; pending-strategic-decision content (e.g., Niyamavali amendment drafts pre-publication per Story 2.4); third-party-vendor commercial terms; operational-incident details pre-disclosure.
- NDA explicitly excludes information that is (a) public at the time of receipt; (b) becomes public through no breach by the Engineer; (c) was rightfully known by the Engineer prior to engagement; (d) is required to be disclosed by legal process (with prompt notice to the trust to seek protective order).
- NDA-on-file location: legal counsel's standing files per Story 0.13; cross-reference recorded in `engineer-roster.md` `nda_signature_status` column.

Counsel return populates the specific contractual language including jurisdiction (Bihar), governing law, dispute-resolution mechanism for NDA disputes (likely arbitration with seat in Patna per the broader §11 disposition), and the precise definition of "confidential information" and "permitted disclosure".

> **Illustrative-framing note:** The jurisdiction and arbitration-seat references in this section are illustrative starting-point briefs for counsel — they represent the Solo Builder's best understanding of the trust's likely disposition, not an enacted legal commitment. They do not create operative legal effect until Story 0.13 counsel reviews, revises as needed, and co-signs per §12. The trust MUST NOT treat these references as binding terms prior to counsel return.

## §7. Intellectual property

**Pre-existing IP:** The Engineer retains all rights to pre-existing intellectual property (prior open-source contributions; prior commercial work; published writings) brought to the engagement. The contract explicitly enumerates any pre-existing IP that may overlap with trust-specific work in a **Schedule C** annexed at signature.

**Engagement-time IP:** All trust-specific configurations, ADRs, runbooks, framework revisions, code commits, documentation authored during paid engagement (whether surge or bus-factor) are **trust property**. Authorship attribution is preserved in the audit trail per §4.

**No work-for-hire over pre-existing IP** — the engagement does NOT convert the Engineer's prior open-source code, blog posts, or unrelated commercial work into trust property.

**Open-source contributions:** Where the Engineer's engagement-time work touches open-source dependencies (e.g., a bug fix to a npm package the trust uses), the Engineer may upstream the fix to the open-source project. The upstream contribution carries the standard open-source license; the trust does not assert exclusive rights to fixes upstreamed to public projects.

## §8. Response-time SLA

- **Acknowledgment SLA:** 4 business hours from receipt of activation request (paging surface acknowledgment per `activation-procedure.md` §1 Prerequisites).
- **Engagement-start SLA:** 24 hours from acknowledgment (on-site or remote engagement begins per `activation-procedure.md` §2.3 for bus-factor; §2.2 for surge).
- **Bus-factor non-production task completion SLA:** 48 hours from activation request (per Story 0.6 AC-2 commitment).

**SLA breach handling:**
- Single SLA breach: logged in `backup-engineer-ledger.md` "Activation event log" gap-list rows; remediation owner is the Engineer; no automatic financial penalty at v1.
- Repeated SLA breaches (≥3 in any rolling 12-month window): trigger Trustee Panel review at next annual renewal; may inform renewal-decline decision per §5.
- Critical breach during bus-factor activation: Trustee Panel may invoke for-cause termination per §10.

**Business hours definition:** Indian Standard Time (IST) business hours [TO BE FINALIZED — likely 10:00–18:00 IST Monday–Friday excluding Indian national holidays, but specific window is the Trustee Panel + Engineer agreement at signature]. Activation requests outside business hours: acknowledgment SLA extends to next business hour start (no 24/7 commitment at v1 retainer; 24/7 commitment is a separate v2 negotiation if warranted).

## §9. Insurance + liability

**[COUNSEL-RETURN PLACEHOLDER per Story 0.13]**

This section will carry the substantive insurance + liability language per legal counsel return. Framework commits:

- The Engineer is an **independent contractor** — no employee-benefit obligations (provident fund, gratuity, paid leave, medical insurance) attach to the trust.
- The trust carries **no liability** for the Engineer's other engagements (the Engineer is free to engage with other clients subject to NDA + conflict-of-interest disclosure per §6 + a separate Schedule D listing prior engagements at signature).
- The Engineer carries **standard contractor indemnification** per legal counsel's standard contractor language — covers third-party claims arising from Engineer's gross negligence or willful misconduct in engagement-time work.
- The trust carries indemnification for engagement-instructed work performed per the scope-of-work (the Engineer is not personally liable for trustee-instructed bus-factor decisions taken in good-faith per the procedure).
- Insurance: the Engineer's professional liability insurance (if any) — per legal counsel guidance; the trust does NOT require the Engineer to carry specific insurance at the A-13 retainer band but counsel may recommend.

Counsel return populates the specific limits, exclusions, sub-limits, and the precise indemnification matrix.

> **Illustrative-framing note:** The indemnification directions in this section (backup engineer carries standard contractor indemnification; trust carries indemnification for engagement-instructed work) are illustrative starting-point briefs for counsel, not binding indemnification terms. They do not create operative legal effect until Story 0.13 counsel reviews, revises as needed, and co-signs per §12.

## §10. Termination triggers

**[COUNSEL-RETURN PLACEHOLDER per Story 0.13 for the specific contractual mechanisms; framework commits the trigger taxonomy below.]**

| Trigger class | Initiator | Notice period | NDA + IP survival |
|---|---|---|---|
| Routine end-of-term non-renewal | Either party | 60 days before annual mark | Indefinite |
| Routine mid-term termination | Either party | 60 days | Indefinite |
| For-cause termination (Engineer breach) | Trustee Panel (≥2 trustees) | Immediate | Indefinite |
| For-cause termination (trust non-payment >30 days cumulative) | Engineer | Immediate | Indefinite |
| For-cause termination (scope expansion without amendment) | Engineer | Immediate | Indefinite |
| Mutual termination | Both parties | Per agreement | Indefinite |
| Renewal-decline cascade | Engineer (declines annual renewal) | 60 days from annual mark | Indefinite + 30-day access-revocation window |

**Documented breach examples** (non-exhaustive; legal counsel return refines):
- NDA violation (any disclosure of confidential information per §6 outside the permitted-disclosure carve-out);
- Unauthorized PII access (any production-PII touch without trustee co-sign + audit-line emission);
- Bypass of audit-emission discipline (any action that suppresses audit-line emission per architecture §1.5);
- Modification of self-IAM (any attempt to grant the Engineer write/admin access without per-action trustee approval per `access-grant-procedure.md` §1);
- Repeated SLA breaches (per §8 ≥3 in rolling 12-month threshold).

Termination records a `.decision-log.md` `[CONTINUITY]` entry per the Story 0.1 + 0.2 + 0.3 + 0.4 + 0.5 supersession schema; `engineer-roster.md` row flips to `terminated` per the forbidden-removal rule.

**Access revocation timing:**
- **Notice-period terminations (mutual, engineer-initiated, renewal-decline):** access revocation per `access-grant-procedure.md` §3 executes at or before the notice-period end date. All engagement modes continue unchanged through the notice period.
- **Immediate for-cause termination:** no notice period exists; access revocation per `access-grant-procedure.md` §3.1 executes immediately upon Trustee Panel authorization. **Before executing revocation**, the Trustee Panel MUST assess in-flight surge scope: if a surge engagement is in progress at the moment of termination, the panel explicitly decides whether to grant a bounded completion window (maximum duration at Trustee Panel's discretion) or halt immediately. The panel's decision is recorded as a `.decision-log.md` `[CONTINUITY]` entry before access revocation executes.

## §11. Dispute resolution

**[COUNSEL-RETURN PLACEHOLDER per Story 0.13]**

This section will carry the substantive dispute-resolution language per legal counsel return. Framework commits:

- **Jurisdiction:** Bihar (where the trust is registered).
- **Mechanism:** Likely arbitration with seat in Patna (per the broader trust-counsel default for trust-grade contractor disputes); fallback to civil court if arbitration mechanism fails or counsel recommends court-route directly.
- **Pre-arbitration mediation:** A good-faith mediation step before arbitration — likely 30-day mediation window facilitated by Trustee Panel chair + the Engineer's named representative; failure to resolve triggers arbitration.
- **Governing law:** Indian law (Indian Contract Act 1872; Indian Trust Act provisions where applicable; CPA 2019 considerations per architecture §Regulatory cross-reference table).
- **Force majeure:** Standard force-majeure clauses per legal counsel's contractor template.

Counsel return populates the specific arbitrator-selection mechanism, the arbitration rules (Indian Arbitration and Conciliation Act 1996 default unless counsel recommends institutional rules), the cost-allocation mechanism (likely loser-pays with provision for trustee-discretion adjustment in compelling-equity cases), and the appeal-limitation language.

> **Illustrative-framing note:** The dispute-resolution references in this section (IAC Act 1996, loser-pays cost allocation, force-majeure clauses, jurisdiction Bihar, arbitration seat Patna) are illustrative starting-point briefs for counsel — they represent the Solo Builder's best understanding of the applicable framework, not enacted contractual terms. They do not create operative legal effect until Story 0.13 counsel reviews, revises as needed, and co-signs per §12.

## §12. Signatures + ratification path

**Signatories:**

- **Trustees:** ≥2 ratifying trustees per the A-13 quorum (per Story 0.6 Task 8 + `README.md` §5 quorum rule). Trustee chair countersigns as authorized representative of the Trustee Panel.
- **Engineer:** The named backup engineer signs in personal capacity (the Engineer is engaged as an individual contractor; if engaging via a firm, the firm signs as principal with the named engineer's signature as accountable representative — Schedule E annexed at signature names the firm-engagement variant if applicable).
- **Legal Counsel:** Co-signature as witness + counsel-of-record for the trust per Story 0.13.

**Ratification path:**

1. Trustee Panel ≥2-trustee A-13 retainer authorization (Story 0.6 Task 8); recorded in `.decision-log.md` Decision 2026-05-30-006 + `backup-engineer-ledger.md` "Trustee A-13 authorization log".
2. Legal counsel returns substantive contract language (Story 0.6 Task 9; gated on Story 0.13); recorded in `backup-engineer-ledger.md` "Contract-signature log" header.
3. Trustee Panel + BigDev select named engineer (Story 0.6 Task 10); technical-fit assessment recorded in `engineer-roster.md` row.
4. Contract signature event: trustees + Engineer + counsel sign; recorded in `backup-engineer-ledger.md` "Contract-signature log" with date + contract git SHA at signature + NDA-on-file location; new `.decision-log.md` `[CONTINUITY]` entry supersedes Decision 006 status from "Author-committed; awaiting trustee A-13 authorization" to "Trustee-ratified" (or "Trustee-ratified (conditional on Story 0.13 counsel return)" if signed before counsel return — though this is dispreferred).
5. IAM grant provisioning per `access-grant-procedure.md` §2 (Story 0.6 Task 10); recorded in `engineer-roster.md` `iam_grant_status` column.

## §13. Schedule A — IAM grant inventory

Reference to `access-grant-procedure.md` §2 for the grant scope. The schedule (annexed at signature) names:

- GCP project list to which the Engineer's Secondary IAM-admin role is granted (per architecture §3078-3082; specific project IDs are operational secrets handled out-of-band per the structural invariant inherited from Story 0.4 + 0.5 — annexed in trustee-handled signature documents, NOT inlined in the public template).
- GitHub repo + team grants (primary repo + mirror destination per Story 0.3 once Tasks 7-11 close).
- Framework-document read-access scope (`docs/knowledge-transfer/` + `docs/runbooks/` + `docs/escrow/` framework READMEs + `docs/escrow/code-escrow/` + `docs/degradation-policy/` + `docs/adr/` + this `docs/backup-engineer/`).
- Architecture / PRD / epics planning-artifact read-access (`_bmad-output/planning-artifacts/`).
- **Explicit exclusions:** sealed credentials (`docs/escrow/` credential envelopes — those require bus-factor activation + Story 0.2 quorum-open); member data (production read requires trustee co-sign + audit-line emission per `scope-of-work.md` §5); audit-mirror write/read service accounts pre-Tasks-8-10-closure (gated on the Story 0.2 audit-mirror structural fix Decision 3).

## §14. Schedule B — Activation procedure summary

Reference to `activation-procedure.md` for the full five-section runbook. One-paragraph summary for engineer-side reference at signature:

> Activation is **always trustee-authorized**, never self-initiated. Five activation modes are defined: (1) **daily-ops** — quarterly cadence participation (no trigger event; routine engagement); (2) **surge** — Solo Builder request via direct contact or paging surface with co-sign; (3) **bus-factor** — paging via `on-call-playbook.md` §5 escalation → trustee chair confirms in `.decision-log.md` → Engineer acknowledges per 4-hour SLA → bus-factor-silence discipline activates → Engineer accesses repo + KT pack + runbooks + escrow framework documents read-only; write/admin actions queue for per-action trustee co-sign; (4) **activation-scenario exercise** — Trustee Panel rehearsal; 48-hour completion window for selected non-production task; bus-factor-silence discipline applies; outcome logged in both `backup-engineer-ledger.md` Activation event log AND `docs/runbooks/operational-readiness-ledger.md` Execution-validation log; (5) **comprehension-administration session** — Story 0.5 Task 9 procedure; cold-read of KT pack; ≤4 hours; ≥80% threshold per Story 0.5 AC-3. The Engineer's reference document is `onboarding-checklist.md` segment (d) bus-factor briefing + the on-call playbook; the trustee's reference is `activation-procedure.md`.

---

## Schedules annexed at signature (NOT in template; trustee-handled at Task 10)

| Schedule | Content | Owner |
|---|---|---|
| Schedule A | IAM grant inventory (specific project IDs, role IDs, team names) | Trustee Panel + Solo Builder (technical detail) |
| Schedule B | Activation procedure summary (per §14 above) | Trustee Panel |
| Schedule C | Pre-existing IP enumeration (per §7) | Engineer + Legal Counsel |
| Schedule D | Engineer's prior + concurrent engagement disclosure (per §9 conflict-of-interest) | Engineer + Legal Counsel |
| Schedule E | Firm-engagement variant (if Engineer is engaged via firm rather than individual) | Engineer + Legal Counsel |

## Cross-references

- `README.md` — framework lifecycle + invariants + cadence + sign-off lifecycle
- `scope-of-work.md` — substantive engagement-mode + exclusions content referenced from §2
- `access-grant-procedure.md` — substantive IAM grant + revocation procedure referenced from §13
- `activation-procedure.md` — substantive activation procedure referenced from §14
- `onboarding-checklist.md` — onboarding session structure (referenced from §12 ratification path)
- `engineer-roster.md` — named-engineer inventory; row populated at §12 signature event
- `backup-engineer-ledger.md` — authorization + signature + activation event logs
- `../../.decision-log.md` — Decision 2026-05-30-006 + Tasks 8/10/11 supersession entries
- Story 0.13 (legal counsel engagement) — gates §6 NDA + §9 Insurance + §10 Termination + §11 Dispute resolution counsel-return placeholders

## Changelog

| Date | git SHA | Author | Material edit? | Re-sign required? | Ledger entry |
|---|---|---|---|---|---|
| 2026-05-30 | n/a (pre-git at author-commit) | Solo Builder (BigDev) via dev-story agent | initial author-commit | yes (≥2 trustees per Task 8) | `backup-engineer-ledger.md` Framework-commit record row |
