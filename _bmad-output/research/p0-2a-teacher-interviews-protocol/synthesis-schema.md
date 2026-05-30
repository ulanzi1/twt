# Synthesis Schema — P0-2a Teacher Empathy Interviews

**Authority:** Story 0.8 AC-1 Task 5 + epics line 833 (synthesis filed at `_bmad-output/research/p0-2a-teacher-interviews.md`) + README §4 invariants (synthesis grounded in lived data; per-interview citations mandatory).

**Purpose:** Define the schema for the AC-named synthesis file. The synthesis file at `_bmad-output/research/p0-2a-teacher-interviews.md` MUST follow this schema. At Story 0.8 Task 6, the synthesis file is *scaffolded* with this schema + per-dimension `_AWAITING_INTERVIEW_CONDUCT_` placeholders. Task 9 populates substantive findings post-interview-conduct.

**Critical invariants:**
- Every synthesis row carries citations to ≥1 per-interview note (`Shikshakamitra-N §dimension-X`).
- Synthesis is grounded in lived conversation data; generic LLM-imagined or PRD-paraphrased synthesis is forbidden per README §4 invariant 4.
- Every refuted-or-nuanced assumption per `assumption-inventory.md` produces a `divergence-log.md` row per README §4 invariant 6.

---

## Synthesis file structure (10 sections)

### §1 Header

```
# P0-2a Teacher Empathy Interviews — Synthesis

**Synthesis authored:** YYYY-MM-DD (Story 0.8 Task 9)
**Interviews conducted:** N=5
**Trustee review status:** pending | accepted | accepted-with-revisions | rejected-pending-rework
**AC-1 closure status (per [[feedback_closure_language_precision]]):** framework-leg Closed by [edit] (Story 0.8 Tasks 1-6); recruitment + conduct + synthesis + trustee-review legs status updates here
**AC-2 closure status:** divergence-reconciliation pending Task 11 + Epic 3 + Epic 8 design freezes
**Authority:** UX-DR5 + UX §Phase-0 P0-2 + AR-49 P0-2 Launch Gate Risks row (architecture line 4782) + architecture §4.10 Devanagari readability field-validation gate
**Cross-references:** README at `_bmad-output/research/p0-2a-teacher-interviews-protocol/README.md` + ethics-protocol + protocols + schemas + assumption-inventory + divergence-log + trustee-review-log
```

### §2 Recruitment summary

```
## §2 Recruitment summary

- **5 pseudonymized participants:** Shikshakamitra-1 through Shikshakamitra-5
- **Recruitment paths used:** [enumerate which of the 4 paths per README §3 were used; e.g., "2 via Bihar state ed dept directory; 2 via Vaishali district teacher union; 1 via trustee referral"]
- **Sampling-bias acknowledgment:** [acknowledge any bias the recruitment paths may have introduced; specifically address whether TSCT/NSCT awareness influenced participant selection]
- **Withdrawal status:** [enumerate any withdrawals — before / during / after interview / after synthesis]
- **Substitute participants (if any):** [if a participant withdrew before interview, the substitute is named here with new pseudonym Shikshakamitra-6 etc.]
- **Substantive identity:** stored out-of-band per ethics-protocol §4 (NOT in this file)
```

### §3 Per-dimension synthesis (one section per dimension)

For each of the 6 dimensions:

```
## §3.X Dimension X: [dimension name]

### Dimension-level finding (2-4 sentences)

[Cross-participant pattern stated as a coherent finding. Grounded in lived data. Pre-PRD/UX-framing-neutral — the synthesis describes what participants told the researcher, not what the PRD/UX assumes they should have told the researcher.]

### Supporting per-interview citations

- **Shikshakamitra-1 §dimension-X:** [specific citation; verbatim or paraphrased observation]
- **Shikshakamitra-2 §dimension-X:** [specific citation]
- **Shikshakamitra-3 §dimension-X:** [specific citation]
- **Shikshakamitra-4 §dimension-X:** [specific citation]
- **Shikshakamitra-5 §dimension-X:** [specific citation]

(Every synthesis row MUST cite ≥1 per-interview note. Uncited synthesis rows are gaps per README §4 invariant 4.)

### Cross-participant pattern observations

[Patterns that hold across multiple participants; e.g., "4 of 5 participants described X"; "all 5 participants used Y verbatim"; "1 outlier participant Z reported W which contradicts the other 4"]

### Verbatim participant-words quotes

> "[Hindi verbatim]" — Shikshakamitra-N (English gloss in parens if useful for trustee review)
> "[Hindi verbatim]" — Shikshakamitra-M

(Quotes are non-identifying per ethics-protocol §4; cultural-grammar meaning preserved.)

### PRD/UX assumption validation

For each `assumption_id` mapped to this dimension in `assumption-inventory.md`:
- **A-<id>:** validation_status = `validated` | `refuted` | `nuanced` — [one-sentence justification grounded in the above synthesis content]
```

Apply this template to:
- §3.1 Dimension 1: Financial-literacy baseline (Sushil-class + Reena-class financial discipline + chanda familiarity + ₹110 elasticity + ₹310 monthly scrutiny)
- §3.2 Dimension 2: Mobile-device usage patterns (smartphone vs basic Android + WhatsApp vs Telegram + shared-phone scenarios + data-cost ceiling + bus-commute attention)
- §3.3 Dimension 3: Comfort with UPI (UPI muscle memory + screenshot-receipt habit + UTR concept landing + UPI failure modes + intent-pre-fill comfort)
- §3.4 Dimension 4: Trust-source mapping (colleague-primary + village elder + helpline credibility + Pariwar framing + सम्मानित साथी resonance + trust-by-institution patterns)
- §3.5 Dimension 5: Grief experience (dignity-over-delight + fursat cadence + shok sabha echo + 1-month claim delay + WhatsApp-collection prior experience + helpline-first behavior)
- §3.6 Dimension 6: Mental-model validation (chanda mental model unprompted? + phone reminder load-bearing? + passbook visual grammar + Hindi-first default + anticipatory care + staff-fallback expectation + vocabulary discipline resonance)
- §3.7 Cross-cutting accessibility: Devanagari readability + copy-density observations (Story 0.10 P0-2c owns substantive Devanagari + assistive-tech validation; Story 0.8 contributes broader Hindi-readability + copy-density observation as field-validation-gate input for architecture §4.10)

### §4 Divergence summary

```
## §4 Divergence summary

- **Total assumption rows pre-stated:** 36 (per `assumption-inventory.md`)
- **Validated:** N assumptions
- **Refuted:** N assumptions
- **Nuanced:** N assumptions
- **Unaddressed (no per-interview signal):** N assumptions — these remain pending for future P0-2 b/c/d empathy work OR explicit deferral per [[feedback_closure_language_precision]]
- **Cross-link to full divergence-log:** see `divergence-log.md` for per-row reconciliation status + reconciliation_action_plan + reconciliation_owner

### Critical hypothesis outcomes

- **A-mm-chanda (chanda mental model):** [validated / refuted / nuanced + one-sentence summary]
- **A-mm-phone-reminder (phone reminder load-bearing):** [validated / refuted / nuanced + one-sentence summary]
- **A-upi-intent-pre-fill-works:** [validated / refuted / nuanced + one-sentence summary]
- **A-fin-110-elastic + A-fin-310-scrutinized (fee elasticity):** [validated / refuted / nuanced + one-sentence summary]
```

### §5 Implications for Epic 3 (Member Identity & Lifecycle)

For each Epic 3 Story that depends on this synthesis (per Story 0.8 Dev Notes cross-Story dependencies):

```
## §5 Implications for Epic 3

### Story 3.2 Member Mobile OTP Authentication
[What the synthesis tells the Story design about Reena-class comfort with OTP, phone-number-as-identity, shared-phone scenarios]

### Story 3.3b DigiLocker KYC flow with manual fallback
[What the synthesis tells the Story design about DigiLocker familiarity, manual-KYC acceptability, Reena-class document-collection burden]

### Story 3.6 Signup ₹110 Vyawastha Shulk via UPI Intent + Reference Code Lock-in Entry
[What the synthesis tells the Story design about ₹110 elasticity, UPI Intent first-experience for non-power-users, Reference Code from colleague flow]

### Story 3.8 Annual Renewal with 3-month grace + reminder cadence
[What the synthesis tells the Story design about renewal-reminder credibility, grace-period trust, reminder channel preference (push vs WA vs SMS)]
```

(Additional Epic 3 stories may be added if synthesis surfaces cross-Story relevance.)

### §6 Implications for Epic 8 (Sushil's Contribution Loop)

```
## §6 Implications for Epic 8

### Story 8.2 Active Contribution Card + My Pool Card + progress meter + 15-day tone gradient
[What the synthesis tells the Story design about home-screen card resonance for Reena-class device usage + dignified tone gradient]

### Story 8.4 UPI Intent flow + UTR self-attestation + yellow pill
[What the synthesis tells the Story design about UPI Intent first-tap comfort + UTR concept landing + screenshot-receipt habit migration]

### Story 8.5 UPI Failure Coach
[What the synthesis tells the Story design about actual common UPI failure modes for Reena-class + helpline-call vs in-app coaching preference]

### Story 8.6 Yogdaan Bahi + contribution timeline + list virtualization
[What the synthesis tells the Story design about passbook visual reference resonance + Hindi numeral discipline + contribution-history scroll behavior]

### Story 8.11 Call Helpline CTA cross-cutting affordance
[What the synthesis tells the Story design about helpline as trusted source + when members reach for helpline + voice vs WhatsApp preference]
```

### §7 Cross-cutting findings

Each §7 sub-section uses this template:

```
### [Sub-section name]

**Finding (1-3 sentences):** [Cross-dimension pattern stated as a coherent finding. Grounded in lived data. Not PRD/UX-paraphrased.]

**Per-interview citations:** Shikshakamitra-N (§dimension-X + §dimension-Y where the cross-dimension pattern was observed)

**Affected artifacts:** [List which Stories / design-system components / architecture sections / UX-DRs this finding informs]

**Action implication:** [One sentence: what should the design / system / document do differently based on this finding? If no action needed, state "No immediate action — observation on record."]
```

Apply this template to:

```
## §7 Cross-cutting findings

### Cultural-grammar findings spanning dimensions
[Findings about cadre vocabulary, civic-trust visual references, register (peer vs authority), dignity-grammar — that inform multiple Stories + the §1.17 design system + UX-DR71 vocabulary discipline]

### Trust-grammar findings
[Findings about how trust builds and breaks for Reena-class — institution-trust patterns, person-trust patterns, recovery from broken trust; informs Story 3.2 OTP trust + Story 8.11 helpline CTA + divergence-log rows affecting A-trust-* assumptions]

### Copy-density and Hindi-readability findings
[Findings about how Reena-class reads Devanagari at speed — informs architecture §4.10 field-validation gate + UX-DR71 vocabulary discipline + UX-DR73 numeral discipline; Story 0.10 P0-2c owns substantive accessibility validation, but Story 0.8 contributes broader Hindi-readability + copy-density observation]

### Surprises (findings the researcher did not anticipate)
[Themes that emerged unprompted across participants — often the highest-value design data; these also surface as candidate dimension extensions per per-interview-note divergence-flags; record here even if no immediate action — they are the raw material for future design-freeze conversations]
```

### §8 Trustee review log

```
## §8 Trustee review log

Cross-link to `trustee-review-log.md` for per-review event detail. Summary status:

- **Review-1:** [trustee name + date + verdict + sign-off note]
- (Additional reviews if `accepted-with-revisions` triggered rework cycle)
```

### §9 Divergence log

```
## §9 Divergence log

Cross-link to `divergence-log.md` for per-row reconciliation status + reconciliation_action_plan + reconciliation_owner. Summary status:

- **Total divergence rows:** N
- **Reconciled via spec update:** N
- **Reconciled via design adjustment:** N
- **Explicitly deferred with rationale:** N
- **Pending resolution:** N (gating Epic 3 / Epic 8 design freeze per AC-2)
```

### §10 Sign-off attestation

```
## §10 Sign-off attestation

**Trustee sign-off:** ≥1 trustee accepted the synthesis with sign-off note attesting that Epic 3 substrate work may begin.

**Reviewing trustee:** [name]
**Sign-off date:** YYYY-MM-DD
**Verdict:** accepted
**Sign-off note:** [the explicit "Epic 3 substrate work may begin" attestation per AC-1; OR the gating note explaining what must close before Epic 3 may begin]
**Cross-link to decision-log:** `.decision-log.md` Decision 2026-05-30-008-trustee-review-N

**Closure status:**
- AC-1 framework-leg: Closed by [edit] (Story 0.8 Tasks 1-6 author-committed 2026-05-30)
- AC-1 recruitment-leg: [status]
- AC-1 conduct-leg: [status]
- AC-1 substantive-synthesis-leg: [status]
- AC-1 trustee-review-leg: [status]
- AC-2 divergence-reconciliation-leg: [status; pending downstream Epic 3 + Epic 8 design freezes per [[feedback_closure_language_precision]]]
```

---

## At-author-commit scaffolding (Task 6)

At Story 0.8 Task 6 author-commit, Task 6 creates the synthesis file `_bmad-output/research/p0-2a-teacher-interviews.md` with:

- §1 Header — populated with placeholder `[pending Task 9]` values for synthesis-author-date + interview-count + trustee-review status; populated values for AC-1 framework-leg `Closed by [edit] (Story 0.8 Tasks 1-6 author-committed 2026-05-30)` + cross-references
- §2 Recruitment summary — `_AWAITING_INTERVIEW_CONDUCT_` placeholder
- §3.1 through §3.6 — `_AWAITING_INTERVIEW_CONDUCT_` placeholder per dimension; assumption-validation-status rows pulling from `assumption-inventory.md` with `pending-interviews` status
- §4 Divergence summary — `_AWAITING_INTERVIEW_CONDUCT_` placeholder; critical-hypothesis-outcomes rows enumerate A-mm-chanda + A-mm-phone-reminder + A-upi-intent-pre-fill-works + A-upi-muscle-memory + A-fin-110-elastic + A-fin-310-scrutinized + A-trust-colleague-primary + A-trust-helpline-credible + A-dev-shared-phone with `pending-interviews` status (9 critical hypotheses per assumption-inventory.md summary)
- §5 Implications for Epic 3 — `_AWAITING_INTERVIEW_CONDUCT_` placeholder per Story
- §6 Implications for Epic 8 — `_AWAITING_INTERVIEW_CONDUCT_` placeholder per Story
- §7 Cross-cutting findings — `_AWAITING_INTERVIEW_CONDUCT_` placeholder per sub-section
- §8 Trustee review log — empty (populated Task 10)
- §9 Divergence log — empty cross-link (populated Task 9 onwards via `divergence-log.md`)
- §10 Sign-off attestation — placeholder values; AC-1 framework-leg already populated

The scaffolded synthesis file is THE commitment record at framework-author-commit time. It is operationally accurate ("this is what the synthesis will contain") without being substantively prescriptive ("here is what the participants will say").

---

## Forbidden states

- Synthesis row without per-interview citation — violates README §4 invariant 4.
- Synthesis row that contradicts PRD/UX assumption but no divergence-log row exists — violates README §4 invariant 6.
- Synthesis row that pre-supposes participant response (generic LLM-imagined / PRD-paraphrased) — violates README §4 invariant 4.
- §1 trustee-review-status flipped to `accepted` without corresponding `trustee-review-log.md` row — violates synthesis-vs-trustee-log reconciliation (synthesis must reflect trustee-review-log; trustee-review-log is authoritative).
- §10 sign-off attestation with `verdict = accepted` but no `sign-off note` — violates trustee-review-log schema; sign-off note is the attestation substance, not optional.
