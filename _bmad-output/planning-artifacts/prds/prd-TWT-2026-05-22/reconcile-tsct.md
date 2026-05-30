---
title: TSCT Reconciliation — Rule Fidelity Audit
companion_to: ./prd.md
companion_to_2: ./addendum.md
source_inputs:
  - /Users/dev/Developer/projects/TWT/_bmad-output/research/tsct-reference-learnings.md
  - /Users/dev/Developer/projects/TWT/_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/extract-tsct-reference.md
status: draft
created: 2026-05-22
---

# TSCT Reconciliation Report — TWT PRD vs TSCT Reference

> Purpose: audit rule-level fidelity between the TSCT reference learnings (the legal ancestry of TWT) and the TWT PRD draft. Silent divergence is the failure mode; deliberate divergence with rationale (in PRD FR or addendum §2) is acceptable.

---

## 1. R-Rules: Carried Correctly (verbatim or near-verbatim)

These rules from TSCT's Niyamavali are reflected in the PRD with their substance intact:

| Rule | PRD Anchor | Carried Status |
|---|---|---|
| **R5(C)** — Medical pause clause | Glossary §3; Addendum §5 table; partially expressed via FR-5 (medical disclosure) | Carried (referenced) |
| **R5(C.2)** — Cause of death governs, not pre-existing illness | FR-11 explicitly; Addendum §5 | Carried verbatim — concealment carve-out preserves intent |
| **R5(D)** — Core team full discretion; no legal claim; commitment purely ethical | FR-11; FR-94; Glossary; Addendum §5 | Carried verbatim |
| **R5(E)** — Multi-nominee disputes; 75/25 split; defamatory beneficiary recovery | FR-4 (75/25); FR-11 (disputes route to State Trustee); Glossary | Carried verbatim |
| **R5(F)** — Erroneous excess transfer; trust helps recovery; no guarantee/liability | FR-30; FR-36 (over-payment self-report + facilitated recovery); Addendum §5; §4.14 posture | Carried verbatim |
| **R6** — All contributions mandatory after lock-in | FR-9 implied; Addendum §5; FR-22 alert state machine + FR-21 My Pool card | Carried |
| **R7(A)** — Break before 10 contributions → 3-consecutive restore; one-time-only; max 2 lifetime | FR-9 explicit | Carried verbatim (tagged `policy_review_required`) |
| **R7(B)** — Registered but never contributed → 5-consecutive + 3-month lock-in; core-team approval | FR-9 explicit | Carried verbatim |
| **R7(C)** — Long gap → treated as new registration; 5-consecutive + lock-in | FR-9 explicit | Carried verbatim |
| **R7(D)** — 1 skip/year → 3-month lock-in + catch-up | FR-9 explicit | Carried verbatim |
| **R7(E)** — 2+ skips/year → 5-month lock-in + complete all | FR-9 explicit | Carried verbatim |
| **R7(F)** — 6+ month gap → 5-month lock-in + complete all | FR-9 explicit | Carried verbatim |
| **R7(G)** — Personal events do not excuse skips | FR-9 explicit | Carried verbatim |
| **R8 (90% Rule)** — Applies only after ≥10 contributions; illness deaths only | FR-10 explicit; Glossary | Carried verbatim |
| **R8(A)** — 1 skip/year permitted if prior 100% | FR-10 explicit | Carried verbatim |
| **R8(B)** — Mid-contribution death eligible | FR-10 explicit | Carried verbatim |
| **R9** — Suicide/controversial → core-team investigation; voting may apply | FR-11; FR-43 (special-case routing) | Carried verbatim |
| **R9(A)** — Multiple deaths same date → priority to higher contribution record | FR-11 explicit | Carried verbatim |
| **Mar 2025 rule** — Suicide/murder where nominee accused → no support | FR-11 explicit; Glossary | Carried verbatim |
| **R10** — No support outside rules; no cancellation outside rules | FR-94; FR-1A (renewal posture); Addendum §5 | Carried verbatim |
| **R10(D)** — Rules amendable anytime by core team | FR-7 (versioned registry + amendment workflow); FR-44 RBAC | Carried |
| **R10(E)** — Direct disbursement to nominee accounts; **no judicial challenge permitted** | FR-94 verbatim; §4.14 description; Glossary trust-posture | Carried verbatim |
| **R11** — Voluntary; member can withdraw anytime | FR-6 (voluntary withdrawal flow) | Carried (with TWT's added 12-month rejoin lock — see §2) |
| **R12** — Membership free | FR-1 (registration free; ₹110 is fee gate to validity) | Adapted (see §2) |
| **R14** — Forged receipts → validity terminated, support withheld | FR-11 (extended to concealment); Addendum §5 | Carried + extended (concealment penalty) |
| **R15** — Optional Vyawastha Shulk; accident treatment unlock | Adapted (see §2 — TWT mandatory; accident category dropped in v1) | Carried in spirit; v1 scope reduced |
| **Retirement coverage policy** (+1 yr per 5 yrs) | FR-12 explicit | Carried verbatim |

**Total R-rules verified as carried (substance intact): 24 of TSCT's ~26 codified rules.**

---

## 2. R-Rules: Carried With Deliberate Divergence

Each item below is a divergence that **is** acknowledged in `addendum.md §2 TSCT Divergences` and/or in the PRD FR itself with explicit rationale.

| TSCT Rule | TWT Divergence | Documented? | Where |
|---|---|---|---|
| **R1 + R12 (membership FREE)** | TWT: ₹110/year **mandatory** Vyawastha Shulk; "valid member" status gated on payment | YES | Addendum §2 row 1; FR-1 explicit; Glossary entry for Vyawastha Shulk explicitly differentiates from TSCT |
| **R15 (Vyawastha Shulk voluntary; accident-treatment unlock)** | TWT: mandatory; no accident-treatment support category in v1 | YES | Addendum §2 row 1; Addendum §5 explicit; PRD §4 (v1 = death support only); FR-20 parameterized for future _daan |
| **R2 (Mandatory Telegram, ≥2x/week)** | TWT: in-app primary; Telegram **mirrored** (honors TSCT-migrating cohort); no enforced check cadence | YES | Addendum §2 row 4; FR-23, FR-73; SM-C2 counter-metric |
| **R3 (Bulk SMS pending TRAI)** | TWT: SMS dropped from v1 | YES | Addendum §2 row 4; FR-23 explicit; §4.10 Out-of-Scope |
| **R10(A) — No parallel teacher-org office-bearing** | Carried in Addendum §5 table; **NOT explicitly encoded in any PRD FR** | **PARTIAL** | Addendum §5 lists as "Carried" but no FR governs office-bearing eligibility; enforcement path absent from product surface. See §3 below — risk of silent drop on operational side |
| **R10(C) — Helpline 10 AM – 1 PM, 7007087337** | TWT helpdesk subsystem (FR-52) replaces ad-hoc helpline; hours/number not specified in PRD | PARTIAL | FR-52 establishes ticketing; specific TSCT helpline hours/number are TSCT-specific operational detail. Acceptable omission but worth flagging |
| **R13 — Telegram official channel** | TWT: in-app official; Telegram mirror | YES | Addendum §5; same divergence as R2 |
| **Lock-in policy (TSCT current = 12mo)** | TWT: phased ramp starting 30d (1mo) → 3mo → 6mo → 12mo (member-count + trustee judgment, not calendar) | YES | FR-8 explicit; Addendum §2 row 2; OQ-14 |
| **R8 / R7 illness-lock-in (12mo all members)** | TWT v1: no illness category, so illness-lock-in N/A; FR-8 states "reserved for v2/v3" | YES | FR-8 explicit |
| **Pool naming (letters A–T)** | TWT: culture-rooted names (Mahabharata seed + extensible); letters retained for backward compat | YES | Addendum §2 row 12; FR-13; Glossary |
| **Contribution window 10d (TSCT current)** | TWT: 15d | YES | Addendum §2 row 11; Glossary; FR-22 |
| **Manual screenshot per contribution** | TWT: UPI Intent + UTR self-attestation + nominee daily statement intake + matching engine; screenshot only on mismatch | YES | Addendum §2 row 3; FR-27–32 |
| **Single nominee bank account** | TWT: dual nominee bank accounts (RBI UPI workaround) | YES | Addendum §2 row 9; FR-31 |
| **Field worker comp on signup** | TWT: comp gated on full qualification (KYC + ₹110 + first valid contribution) | YES | Addendum §2 row 13; FR-84 |
| **Public sahyog lists with full PII exposure** | TWT: PII shielding (first-name + last-initial; bank login-walled in active alert only) | YES | Addendum §2 row 8; FR-74; FR-75; FR-90 |
| **eHRMS as primary ID (TSCT relies heavily)** | TWT: manual eHRMS entry (no integration); DigiLocker is the verified-identity backbone | YES | Addendum §2 row 14; FR-2; Glossary |
| **R11 voluntary withdrawal — no rejoin lock mentioned by TSCT** | TWT: 12-month rejoin lock under same Aadhaar/eHRMS | NOT explicitly called out in Addendum §2 | **MINOR GAP** — FR-6 introduces the lock but Addendum §2 row for R11 doesn't surface this as a deliberate TWT addition. See §3 |

---

## 3. R-Rules: Silently Dropped or Mis-Carried

These are the gaps — TSCT rules or rule-mechanics where the PRD either fails to encode the rule or weakens it without an explicit divergence-with-rationale entry.

| Issue | Severity | Detail |
|---|---|---|
| **R10(A) — Parallel teacher-org office-bearing prohibition is unwired** | MEDIUM | Addendum §5 lists R10(A) as "Carried" but the PRD has no FR that (a) collects the data point at signup, (b) flags a member who takes office in another org, or (c) routes such a flag to disciplinary action. Rule exists on paper, has no product surface. Legal posture intact (T&C can reference) but operational discipline depends on someone watching, which TSCT does via field-worker channels TWT has not yet wired. |
| **R11 12-month rejoin lock — TWT addition, not flagged as divergence** | LOW | FR-6 silently introduces a 12-month rejoin lock under same Aadhaar/eHRMS. TSCT R11 contains no such lock. Should be explicitly captured in Addendum §2 as a "TWT-introduced fraud-control divergence from R11." Not a legal exposure but a documentation hygiene gap. |
| **R10(C) — Helpline operational specifics** | LOW | FR-52 helpdesk replaces, but TSCT's specific helpline hours, dedicated number, and the rule that "missed info = member's responsibility" (R10B) is not encoded as a member-facing obligation in TWT T&C. The R10B principle ("member responsible for checking the channel") is implicit in TWT's notification model but not codified. |
| **R10(B) — "Missed info = member's responsibility"** | MEDIUM | This is the legal shield that lets TSCT say "you should have known." TWT's PRD does not explicitly encode this principle anywhere. Given TWT moves the channel from Telegram (R2) to in-app primary, the analogous principle — "member is responsible for checking the app" — needs explicit T&C language. **Recommend adding to FR-94 verbatim phrasings.** |
| **Pool Reality #2 messaging discipline ("no shortfall narrative")** | LOW | FR-19 captures "celebrate actual outcome" but the specific copy-discipline rule from TSCT — "no mention of shortfall vs target" — is not surfaced as a copy-guide constraint in FR-69 (Tone Guide). Risk: a well-meaning copywriter writes "₹X collected vs ₹Y target." |
| **TSCT R8 milestone-review-at-10/20/50-contributions** | LOW | FR-10 mentions threshold "reviewed at milestones (10, 20, 50)" — but no FR specifies *who* reviews, *what* the review changes, or *how* a member sees their milestone status. Reference Glossary contains it; engine surface is implied via FR-12A `R8_subclause_state`. Carried in spirit, weakly operationalized. |
| **R9(A) priority-tie-breaker mechanism** | LOW | FR-11 references the rule but the actual algorithm (compare contribution counts, then…?) is not specified. Engine needs deterministic tie-break logic; PRD leaves it implicit. |
| **TSCT amendment-history transparency** | LOW | TSCT publishes amendment dates (2020-11-10, 2021-04-20, etc.). FR-79 includes "Niyamavali public page with version diff" — but doesn't explicitly require the historical amendment-date timeline to be visible. Recommend tightening FR-79 to include a versioned timeline. |

---

## 4. Pool Mechanics Fidelity

| TSCT Mechanic | PRD Coverage | Fidelity |
|---|---|---|
| **Monthly cycle (one alert/month)** | FR-22 state machine; PRD §4.4; Glossary "Alert"; Addendum §3 worked examples | **Faithful** |
| **Pool spawn — N pools = N approved claims** | FR-13 explicit; "N is determined at freeze and immutable thereafter" | **Faithful** |
| **Culture-rooted pool naming (Mahabharata seed + extensible)** | FR-13; Glossary; Addendum §2; OQ-12 | **Faithful + improvement** (extensibility built in) |
| **Letter-code backward compat** | FR-13 (`letter_code` field) | **Faithful** |
| **Deterministic balanced hash assignment** `hash(member_id + cycle_id) % N` | FR-14 verbatim formula; Glossary "Pool Engine" | **Faithful** |
| **One member, one pool per cycle** | FR-14; RA-11 (rejected alternative captured) | **Faithful** |
| **Wrong-pool = invalid AND no refund** | FR-16 explicit; "no refund" called out; helpdesk facilitated-recovery path | **Faithful** |
| **Dual nominee bank accounts (RBI UPI workaround)** | FR-31; FR-37 collects at claim-time | **Faithful** |
| **Fixed amount over 12+ months; 12-month advance notice for changes** | FR-15 explicit; UJ-6; Addendum §3.3 worked example | **Faithful** |
| **Under-funded pool = nominee gets actual; no top-up** | FR-19 explicit; Pool-Reality #1; SM-C4 counter-metric | **Faithful** |
| **Outreach (not amount-hike) at <70% for 2+ cycles** | FR-19; threshold called out as a Niyamavali clause | **Faithful** |
| **15-day window with hard close** | Glossary; FR-22 `closed` state; "Day 15" referenced in UJ-2 | **Faithful** (and explicit divergence from TSCT 10-day) |
| **~16,000 members × ₹310 ≈ ₹49.6L per nominee target** | Addendum §3 worked examples; SM-2 | **Faithful** |
| **UPI failure modes (zeros prefix, late-night, IMPS fallback)** | FR-34 UPI failure coach `[v1-S]` | **Partially captured** — coaching deferred to v1-S; observed TSCT failure modes (the specific "prefix zeros" / "UPI Lite" tricks) not enumerated in PRD copy guide. Operational risk if v1-S slips. |
| **Idempotent `tr=` reference** | FR-17 explicit | **Faithful** |

**Verdict:** Pool mechanics are the **strongest-fidelity** section of the PRD. Every load-bearing mechanic is carried. Only weak link is the UPI failure-coaching specifics (TSCT-observed tricks) deferred to `[v1-S]`.

---

## 5. Trust Posture Phrasing Fidelity

| TSCT Phrase | Carried in PRD? | Where |
|---|---|---|
| **"Facilitator, not guarantor" / "Facilitator, not financial intermediary"** | **YES** | FR-94 verbatim; §4.14 description; Glossary trust-posture; PRD vision |
| **"No judicial challenge permitted"** | **YES** | FR-94 verbatim; Addendum §5 R10(E); Glossary |
| **"Commitment is purely ethical"** | **YES** | FR-94 verbatim; Addendum §5 R5(D); Glossary |
| **"Registration alone does not constitute legal membership"** | **YES** | FR-94 verbatim |
| **Hindi tagline "आज का सहयोग कल का सहारा"** | **NO** | NOT present anywhere in PRD or Addendum. **GAP.** |
| **"Gift, not entitlement"** (R15 phrasing) | **NO** | Not present. Since accident-treatment category is out of v1, the phrasing is technically unused — but the *posture* it captures (no entitlement to any support payment) is operationally relevant to the death-support category too. **Recommend incorporating into FR-94 or trust posture copy.** |
| **"सम्मानित साथी / सम्मानित शिक्षक साथियों"** salutation | **YES** | Glossary "Member"; FR-69 tone guide; §4.10 |
| **"जोड़ते रहें"** call-to-action | **NO** | Not present in PRD copy guide. Minor but the standard TSCT CTA is absent. |
| **Trust holds no responsibility for SLA between death and first transfer** | **YES** (implicit) | §1.3 "Settlement speed is NOT a differentiator"; PRD §4.14 posture; §2.9 UJ-3 explicit ground inspection within standard SLA |
| **"Over-payment recovery facilitated, never enforced"** | **YES** | FR-30; FR-36; §4.14 description |

**Phrasings Carried Summary:**

| Phrase | Status |
|---|---|
| Facilitator, not guarantor | **Y** |
| No judicial challenge permitted | **Y** |
| Commitment is purely ethical | **Y** |
| Registration alone does not constitute legal membership | **Y** |
| Hindi tagline "आज का सहयोग कल का सहारा" | **N** — gap |
| "Gift, not entitlement" | **N** — minor gap |
| "सम्मानित साथी" salutation | **Y** |
| "जोड़ते रहें" CTA | **N** — minor |

---

## 6. Vocabulary Fidelity (Glossary Audit)

Audit of TSCT Hindi/Sanskrit terms vs PRD Glossary §3.

| TSCT Term | In PRD Glossary? | Meaning Correct? |
|---|---|---|
| **Niyamavali / नियमावली** | YES | Correct |
| **Pariwar / परिवार** | YES | Correct (with TWT platform meaning extended) |
| **Sahyog / सहयोग** | YES | Correct |
| **Sahyog Vivran / सहयोग विवरण** | YES | Correct |
| **Sahyogsuchi / सहयोगसूची** | **NO** | **GAP** — used heavily in TSCT URL patterns; not in PRD Glossary. Operationally relevant when discussing public page architecture (member contribution lookups). |
| **Vyawastha / व्यवस्था** (as serious-illness category) | YES (disambiguated) | Correct (PRD Glossary explicitly disambiguates from Vyawastha Shulk and notes the support-category meaning is not used in v1) |
| **Vyawastha Shulk / व्यवस्था शुल्क** | YES | Correct |
| **Jivandan / जीवनदान** | **NO** | **GAP** — referenced in PRD §4.3 FR-20 (future _daan reuse) without Glossary entry. Should be in Glossary for downstream architecture/UX work. |
| **Kanyadan / कन्यादान** | **NO** | **GAP** — same as Jivandan; referenced in FR-20, FR-58 context, and PRD §4 narrative without Glossary entry. |
| **Retirementdaan / रिटायरमेंटदान** | **NO** | **GAP** — TSCT reference introduces this; PRD FR-20 anticipates reuse but term absent from Glossary. |
| **Shikshakamitra / शिक्षकमित्र** | Partial — used in eligibility list (FR-1, persona) | Not formally defined in Glossary; should be |
| **आज का सहयोग कल का सहारा** (tagline) | NO | **GAP** — see §5 |
| **सम्मानित साथी** (salutation) | YES | Correct (Glossary "Member"; FR-69) |
| **जोड़ते रहें** (CTA) | NO | Minor gap |
| **eHRMS, DigiLocker, UTR, DPDPA, PMLA, 80G, UPI Intent** (operational/technical) | YES | All present and correct |
| **NSCT** | YES | Correct |

**Vocabulary terms missing from Glossary:** **Sahyogsuchi, Jivandan, Kanyadan, Retirementdaan, Shikshakamitra (formal entry), आज का सहयोग कल का सहारा tagline, जोड़ते रहें CTA.**

The four "daan" categories (Jivandan, Kanyadan, Retirementdaan) plus Sahyogsuchi are the most operationally consequential omissions — FR-20 explicitly anticipates them as reusable categories, and downstream architecture/UX work will reference them as named entities.

---

## 7. Verification Process Fidelity

TSCT's verification model is **multi-layered: peer awareness + district team initial verification + ground inspection + escalation tiers**.

| TSCT Element | PRD Coverage | Fidelity |
|---|---|---|
| **Block → District → Regional → State field tiers** | FR-45 scope dimensions (`block | district | state | pariwar | global`); FR-46 12-role set; persona Anita (District Admin) | **Faithful** (Regional tier folded into State via RBAC scope flexibility) |
| **District team handles initial claim verification + grievance** | FR-42, FR-57 (Trustee-Lite signals + list); UJ-4 Anita reviews claim queue | **Faithful** |
| **Ground inspection retained as physical visit** | FR-40 explicit ("Ground inspection retained alongside peer mesh") | **Faithful** |
| **Peer verification mesh (TWT addition: 5 nearest members)** | FR-39 explicit; verifier names public with profile links | **Faithful (and improvement)** |
| **Both peer mesh AND ground inspection — not either/or** | FR-40 explicit; NOTE FOR PM in §4.6: *"Do not allow product or eng to silently treat ground inspection as optional after peer confirm"*; UJ-3 narrative | **Faithful + explicit guardrail** |
| **Special-case escalation (suicide / disputes / multiple deaths)** | FR-43 routes to State Trustee voting per R9; Workflow Builder v2 anticipated | **Faithful** |
| **Verifier name social accountability (public hyperlinks)** | FR-39; FR-77 Sahyog Vivran | **Faithful** |
| **Core team voting (R9)** | FR-43; Addendum §5 | **Faithful** |
| **Human shepherd assigned per claim** | FR-41 `[v1-S]` | Carried but tagged v1-S — at risk of slipping. **Important enough that v1-S tag should be reviewed** given Quaternary Persona (Bereaved Family) lists shepherd as a load-bearing UX element. |

**Verdict on "both-not-either":** explicitly preserved with a NOTE FOR PM guardrail. This is the verification rule TSCT cares most about; PRD honors it.

**One risk:** FR-41 (Human Shepherd) is tagged `[v1-S]` which means "desirable but cuttable." Given the bereaved-family persona depends on it, a slip would be a UX failure that compounds grief. Recommend re-evaluating the `[v1-S]` tag for FR-41.

---

## 8. Summary

The TWT PRD demonstrates **high fidelity** to TSCT's Niyamavali ancestry. Pool mechanics and core trust-posture phrasings are faithful; R-rule carry-over is comprehensive. The deliberate divergences are all documented with rationale in Addendum §2 or in the FR itself.

**Critical gaps** (legal-ancestry exposure):
1. **R10(B) "missed info = member's responsibility"** not codified anywhere in PRD — needed in T&C now that primary channel shifts from Telegram to in-app.
2. **R10(A) parallel-org office-bearing prohibition** is listed as carried but unwired in product.
3. **Hindi tagline "आज का सहयोग कल का सहारा"** is absent — brand voice gap.

**Documentation hygiene gaps:**
4. **R11 12-month rejoin lock** (TWT addition) not flagged as divergence in Addendum §2.
5. **Daan vocabulary** (Jivandan, Kanyadan, Retirementdaan) referenced but not Glossary-defined.
6. **Sahyogsuchi** missing from Glossary.

**Operational refinements recommended:**
7. **FR-41 Human Shepherd** v1-S tag warrants re-review given bereaved-family persona dependency.
8. **R9(A) tie-break algorithm** needs deterministic specification before engine implementation.
9. **R8 milestone-review (10/20/50)** needs an owner and a process surface.
10. **Pool-Reality #2 "no shortfall narrative" copy discipline** should be added to FR-69 Tone Guide as an explicit prohibition.
