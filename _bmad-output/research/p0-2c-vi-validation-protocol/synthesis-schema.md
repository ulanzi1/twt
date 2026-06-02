# Synthesis Schema — P0-2c VI/Low-Vision Member Accessibility Validation

> Defines the structure of the AC-named synthesis file at `_bmad-output/research/p0-2c-vi-validation.md`.
>
> At Task 6 author-commit, the synthesis file is **scaffolded** per this schema with `_AWAITING_SESSION_CONDUCT_` placeholders. Task 9 populates substantive findings post-session.

## §1 — Header

- Synthesis date
- Sessions conducted: N=1 (single deep narrow signal; NOT a statistical claim)
- Pseudonym(s): `VI-Member-1` (or `VI-Member-1A`)
- Trustee pre-session approval row reference (`trustee-review-log.md` row `pre-session-001`)
- Prototype operability pre-flight outcome reference (`recruitment-log.md` AT-pre-flight columns)
- Trustee review status (per Task 10 outcome)
- AC-1 closure status (per [[feedback_closure_language_precision]] — Closed by [edit] for framework legs; Resolved via explicit deferral for conduct legs)

## §2 — Recruitment summary

- 1 pseudonymized participant
- Recruitment path used (Bihar disability network / school-inclusion network / Bihar State Welfare Board for Persons with Disabilities / trustee referral / Hindi-language disability NGO)
- **Disability-context sampling acknowledgment** — single session is a deep narrow signal, NOT a statistical claim; `participant-class-extension-needed-for-coverage` classification routes any extension need to Story 0.10-bis or NFR-22 Phase-2 audit
- AT modality used (screen reader / magnification / voice control / multiple)
- Substitute pseudonym `VI-Member-1A` provision per Story 0.9 P-07 precedent

## §3 — Per-dimension synthesis

One section per the 4 AC-named dimensions + §3.5 cross-cutting Hindi-Devanagari-AT-grammar.

Per-section structure:
- Dimension-level finding stated in **2-4 sentences**
- Supporting per-session citations (`VI-Member-1 §dimension-X`)
- Participant's-own-words paraphrased (verbatim only if re-consent-confirmed per ethics-protocol §2-bis)
- PRD/UX/architecture assumption validation status per the `assumption-inventory.md` cross-reference

### §3.1 — Where they succeeded
### §3.2 — Where they got stuck
### §3.3 — What AT behavior surprised the designer
### §3.4 — What copy or interaction patterns broke
### §3.5 — Cross-cutting Hindi-Devanagari-AT-grammar

## §4 — UX-DR clause evaluation (the AC's load-bearing surface)

Per-clause verdict for each UX-DR66/67/68 + UX-DR65 clause × each of the 3 named prototype surfaces cross-linked to `ux-dr-clause-evaluation-worksheet.md` + cross-cutting accessibility-grammar verdict for the 7 cross-cutting elements + **accessibility-debt classification applied per finding** + revision-integration handoff to Task 11 reconciliation if any verdict requires revision.

Sub-sections:
- §4.1 UX-DR66 (Accessibility ≠ Alternate Experience) — per-clause × per-surface (3 cells)
- §4.2 UX-DR67 (WCAG AA Baseline) — per-sub-clause × per-surface (9 × 3 = 27 cells; D-02 review-patch: reduced-motion split into 3 per-surface rows, moved from cross-cutting §4.5 to here)
- §4.3 UX-DR68 (TWT-Specific Accessibility) — per-sub-clause × per-surface (6 × 3 = 18 cells; 6 `not-applicable` cells for operator-zoom + field-worker per P-05)
- §4.4 UX-DR65 (Three touch-target categories) — per-category × per-surface (3 × 3 = 9 cells)
- §4.5 Cross-cutting accessibility-grammar (7 rows; D-02 review-patch: cc-8 reduced-motion removed; now 7 rows)
- §4.6 Accessibility-debt classification summary (count per classification value; **total verdict-eligible cells = 64**: 3+27+18+9+7=64; P-06 review-patch: the 7 cross-cutting rows are per-element not per-surface but are included in the 64 count)
- §4.7 Revision-integration handoff list (any verdict ∈ {`requires-revision-with-proposed-clause`, `requires-deeper-redesign`} → divergence-log row + Task 11 reconciliation; P-17 review-patch: `requires-deeper-redesign` entries must contain minimum content: affected Epic/Story + what must be re-thought + whether participant-class extension is needed)

## §5 — Divergence summary

- Cross-link to `divergence-log.md`
- High-level summary of how many assumptions validated / refuted / nuanced / not-evaluated
- **Critical-hypothesis outcomes for the 22 critical-tagged assumptions** per Story 0.9 P-01 precedent (canonical count; P-07 review-patch: updated from 20 to 22 — A-ux-prototype-operability-precondition + A-ux-rn-accessibility-props-consistency added)
- **Total-assumption count arithmetically matches `assumption-inventory.md` rows** per Story 0.9 P-09 precedent (44 rows in inventory; P-08 review-patch: corrected from 42)

## §6 — Implications for Epic 3 (Reena onboarding)

Per-Story implications:
- **Story 3.2 Member Mobile + OTP Authentication** — does OTP flow announcement under TalkBack Hindi land?
- **Story 3.3b DigiLocker KYC Flow in Signup + Manual Fallback** — does DigiLocker callback handle focus restoration?
- **Story 3.4 Nominee Declaration 75/25 Split** — does multi-nominee form support voice-control activation?
- **Story 3.5 Medical Disclosure with IMA List + Concealment-Denial Ack** — does Devanagari conjunct list render under TalkBack Hindi?
- **Story 3.6 Signup ₹110 Vyawastha Shulk via UPI Intent** — does UPI button ≥56pt under magnification?
- **Story 3.7 Lock-In Clock Widget on Home Screen** — does countdown ARIA-live announcement land?

Each implication carries: dimension citation + UX-DR clause citation + proposed Story design adjustment if applicable.

## §7 — Implications for Epic 8 (Sushil contribution loop)

Per-Story implications:
- **Story 8.2 `<ActiveContributionCard>` My Pool Card + 15-Day Tone Gradient** — does daily countdown ARIA-live polite-vs-assertive setting work?
- **Story 8.3 Real-Time Live Contributor List + Pending Contributors List** — does virtualized list AT navigation work?
- **Story 8.4 UPI Intent Flow + UTR Self-Attestation + Yellow Pill** — does UPI button activation under voice-control work? UTR paste-from-clipboard under screen-reader? Yellow-pill color-independence?
- **Story 8.5 UPI Failure Coach** — does failure-coach surface dignified-recovery copy land under AT announcement?
- **Story 8.6 Yogdaan Bahi `<ContributionTimeline>` + List Virtualization** — does 500-row virtualized scroll AT behavior on entry-level Android (Story 0.10 canonical device) work?
- **Story 8.11 Call Helpline CTA** — does `tel:` link AT activation work?

## §8 — Implications for Story 7.10 (Pool Engine Onboarding Tutorial)

- Does 3-screen tutorial skip-and-confirm pattern work under AT?
- Does mid-tutorial AT-skip-and-resume work?

## §9 — Cross-cutting accessibility-grammar findings

- Hindi TalkBack pronunciation discipline findings that span surfaces
- Devanagari conjunct rendering quality findings that span surfaces
- Focus-order discipline findings
- Dignified-recovery copy under AT failure findings
- Design-system findings that inform Story 1.17 design system + Story 2.1 i18n authoritatively

**§9.bis — Surprises sub-section** (per Story 0.9 P-24 precedent) — findings the researcher did NOT anticipate, often the highest-value design data.

## §10 — Trustee approval and review log

Cross-link to `trustee-review-log.md` — both:
- The **pre-session trustee-approval row** (`pre-session-001` from Task 7)
- The **post-synthesis trustee-review row** (from Task 10)

## §11 — Divergence log

Cross-link to `divergence-log.md`.

## §12 — Sign-off attestation

- ≥1 trustee name
- Sign-off date
- Verdict per AC-1 trustee-review requirement (`accepted` | `accepted-with-revisions` | `rejected-pending-rework`)
- Sign-off note attesting Epic 3 / Epic 8 / Story 7.10 substrate work may begin per the affected-Epic-by-divergence cross-reference (or gating note if not yet acceptable)

---

## Task 6 author-commit instructions

At Task 6 author-commit, scaffold `_bmad-output/research/p0-2c-vi-validation.md` with:
1. This schema's section headers
2. Each per-dimension section (§3.1 - §3.5) carries `_AWAITING_SESSION_CONDUCT_` placeholder
3. §4 UX-DR clause-evaluation matrix scaffolded with pre-staged rows pulling from `ux-dr-clause-evaluation-worksheet.md` (`pending-session-conduct` verdict)
4. §5 divergence summary scaffolded with `assumption-inventory.md` cross-reference rows (`pending-session` status) + 22-critical-hypothesis-outcomes pre-staged (P-07 review-patch)
5. §6 - §8 per-Story implications scaffolded with per-Story enumeration
6. §9 cross-cutting findings + §9.bis Surprises pre-staged
7. §10 - §12 trustee + divergence cross-links + sign-off attestation slot pre-staged

Header note: "This synthesis file is scaffolded at Story 0.10 author-commit (2026-05-31) per the synthesis-schema. Substantive findings will be authored at Task 9 _AWAITING EXTERNAL ACTION_ post-session-conduct. The file MUST be grounded in lived AT-walkthrough data per per-session citations — generic LLM-imagined or PRD/UX-paraphrased synthesis is forbidden per README §4 invariant. Direct quotation is forbidden unless re-confirmed per ethics-protocol §2-bis. UX-DR clause-evaluation verdicts MUST be populated for each enumerated UX-DR66/67/68 + UX-DR65 clause × each of the 3 named prototype surfaces OR explicitly marked `not-evaluated-due-to-participant-non-engagement` or `not-evaluated-due-to-prototype-surface-coverage-gap` with rationale. Accessibility-debt classification MUST be applied per finding. ≥1 trustee review (Task 10) is required before Epic 3 / Epic 8 / Story 7.10 substrate work begins per AC-1."
