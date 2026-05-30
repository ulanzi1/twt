---
title: PRD Addendum — TWT (Teachers Welfare Trust)
status: final
created: 2026-05-22
updated: 2026-05-27
companion_to: ./prd.md
---

# Addendum — TWT PRD

> Companion to the PRD: rejected-alternative rationale, TSCT divergence detail, mechanism options, Niyamavali full reference, pool-math worked examples, and extended personas. Downstream artifacts (architecture, solution design, UX spec) source from here.

## 1. Rejected Alternatives — full rationale matrix

Decisions of the form "we considered X, chose Y because Z." PRD reflects the chosen path; rationale lives here.

| # | Rejected | Chosen instead | Rationale |
|---|---|---|---|
| RA-1 | **Public trust ledger** (Open-Books #1) | Public = member contributions + verifier names only | Politicizing trust money is an existential risk. Member-side accountability ≠ ledger transparency. |
| RA-2 | **"What your ₹110 bought" annual statement** (Open-Books #3) | Private trust ledger | Same political risk as RA-1; framing makes it worse. |
| RA-3 | **Partner commission disclosure** (Open-Books #4, Module-Mart #4) | Commissions kept private | Politicizing partner relationships harms member-side ROI; partners pull out if commissions are disclosed publicly. |
| RA-4 | **UPI Autopay for ₹110 renewal** (WI-17) | Manual UPI Intent renewal | Violates the no-payment-gateway-for-trust-money posture; Autopay is gateway-mediated. |
| RA-5 | **WhatsApp-only signup** (WI-22) | Full KYC mandatory at signup | Fraud control. WhatsApp-only would allow attackers to mass-create attribution chains for field-worker commission abuse. |
| RA-6 | **Public-to-nominee direct donations** (original WI-43/44) | Crowdfunding Module (Phase 2/3, Trust-intermediated, 80G, 10% cut) | Bereaved family cannot face PMLA scrutiny from unaccounted public donations. Trust intermediation creates a clean PAN/80G audit path. |
| RA-7 | **Math-Health dashboard for Pariwar founders** (WI-47) | Operational dashboards in admin UI | Too operational for the member-side surface; founder-class dashboards belong in admin UI (FR-58 surveys, audit log analytics), not a dedicated surface. |
| RA-8 | **Pool-Sys #3 mid-alert reassignment** | Late deaths spill into next cycle | Reassigning members mid-window is too disruptive; produces audit churn. |
| RA-9 | **SC-1 weighted-by-tenure assignment** | Pure balanced hash | Audit simplicity beats fairness optimization. |
| RA-10 | **SC-2 rolling 30-day windows per claim** | Calendar-month cycle | Operational simplicity; matches teacher salary cadence. |
| RA-11 | **SC-3 multi-pool proportional split** | One member, one pool per cycle | Audit simplicity; single payment per member per cycle. |
| RA-12 | **SC-4 Adopter + Pool combining (fixed pairing)** | Pure balanced hash | Removes attribution-gaming risk; adopter chain stays attribution-only. |
| RA-13 | **SC-6 Cross-Pariwar pool merging in early stages** | Per-Pariwar isolated pools | Premature aggregation; governance + accountability boundaries cleaner per Pariwar. |
| RA-14 | **SC-7 rare-context member prioritization** | Equal treatment | Fairness. |
| RA-15 | **SC-8 insurance "experience rating" by district** | Flat fee/contribution | Mutual-aid posture, not insurance — explicitly rejected the insurance framing. |
| RA-16 | **SC-10 shrink pools to 1000 members** | Pool size = function of approved claims (auto-spawn) | Math follows reality, not a target. Forcing a target pool size requires throttling claims, which is morally problematic. |
| RA-17 | **SC-11 single national mega-pool** | Per-Pariwar pools, possibly state-scoped | Governance + trust scale; mega-pool concentrates risk and breaks the field-worker geographic model. |
| RA-18 | **SC-12 tenure-bracketed contribution amounts** | Fixed amount for all members in a pool | Simplicity; perceived fairness; tenure-bracketing reads like insurance pricing. |
| RA-19 | **SC-16 eliminate monthly cycle** | Monthly cycle retained | Operational cadence proven by TSCT; matches teacher salary cycle. |
| RA-20 | **SC-19 member-choice pool browsing** | Deterministic hash assignment | Removes selection-bias gaming (choosing pools with higher-status nominees). |
| RA-21 | **SC-20 nominee contributes first to activate claim** | Trustee approves claim, then pool spawns | Grief-aware UX; nominee burden after a death must be minimized. |
| RA-22 | **SC-21 personal-coalition pre-formed pools** | Hash-based fresh assignment | Anti-cliquing; mutual aid is a community, not a coalition. |
| RA-23 | **Self-Svc #2 DigiLocker KYC for nominee changes** | Member-only KYC; nominee no KYC | Matches bank norms; banks don't require KYC for nominee declarations. |
| RA-24 | **WI-18 lapsed-member social re-engagement** | Out of scope | Focus discipline; rejoin path via Niyamavali R7 sub-rules. |
| RA-25 | **WI-20 dispute SLA enforcement** | OverPay facilitated flow (mediator, not enforcer) | Trust posture: facilitator, not enforcer. |
| RA-26 | **Full Kanban claim board for v1** | Trustee-Lite list + signals | List works for v1; Kanban v2. Don't over-build admin UI when claim volume is single-digit per month. |
| RA-27 | **Account Aggregator reconciliation for v1** | Manual UTR matching + nominee statement intake | Manual fine until scale demands. AA introduces integration debt for unclear v1 value. |
| RA-28 | **Kinship-network seeding as primary cold-start** (WI-21) | Paid field workers first; kinship/Adopt-a-Colleague Phase B | Math floor demands paid acquisition first; kinship seeding doesn't generate the velocity needed to reach ~4L members. |
| RA-29 | **SMS as bulk-alert channel** (TSCT R3, brainstorm Theme 8 v1-S original) | **Three-tier channel model:** in-app push (universal) + WhatsApp Business (dual-gated: Pariwar admin toggle + member self-declared opt-in) + SMS (preserved surfaces: OTP, step-up OTP, per-member transactional fallback, Pariwar-degraded-mode cycle-open bridge) + Telegram mirror (non-canonical). **Bulk-alert SMS dropped**; **OTP-SMS, step-up-OTP-SMS, and transactional-fallback-SMS preserved.** | TRAI bulk-SMS DLT approval friction + per-SMS cost at 4L scale + no SMS-specific feature the other alert channels don't cover. Transactional OTP-SMS, step-up-OTP-SMS, and fallback-SMS use the separate DLT-transactional pathway (PE/OE), evaluated independently. DLT-transactional registration committed as operational prerequisite (see architecture §2.2 + §3.4). |

## 2. TSCT Divergences — full rationale

Each row is a deliberate disagreement with TSCT — the substance of what makes TWT not a clone.

| TSCT behavior | TWT v1 | Why |
|---|---|---|
| ₹50→₹75/year **voluntary** Vyawastha Shulk | **₹110/year mandatory** | Predictable trust-side revenue; less collection friction; unifies member status (no "paid vs not paid" ambiguity). |
| Flat 12-month lock-in (TSCT's current state after 5 years of organic ramping) | **Trustee-adjustable ramp starting at 30d (1 month) at launch, lengthening as member base grows** (illustrative: 1mo → 3mo → 6mo → 12mo). Trigger is member-count milestone + trustee judgment, not calendar. | Bootstrap new community without crushing early joiners. TSCT had years of trust capital before tightening; TWT does not. Member-count-driven trigger (vs calendar) keeps lock-in matched to actual fraud-attempt risk. |
| Manual screenshot upload for every contribution | **Automated UPI reconciliation** (UTR self-attestation + nominee daily statement intake + matching engine). Screenshot fallback **only on mismatch.** | Friction + admin burden at scale. TSCT itself flags this as the dominant operational pain. |
| Telegram-mandatory (R2, R13) | **Multi-channel:** in-app primary + WhatsApp Business (admin-toggle) + Telegram **mirror** (honors migrating cohort) + push. No SMS. | Cross-channel reach. In-app gives a product surface for polls, modules, audit. Telegram excludes non-Telegram users. |
| Hindi-only website (English partial) | **Hindi + English bilingual** at launch | Pan-India reach; Bihar urban + diaspora demands bilingual. |
| No native mobile app (or "exists but not great UX") | **Mobile-first native-quality UX** | Primary device is phone; TSCT's web UX has clearly capped its scale. |
| One partner app (ITR Mantra) externally listed | **Plug-and-play module marketplace**, admin-scoped activation | Revenue diversification; aligned partner ecosystem; future-proof. |
| Public Sahyog lists with full PII exposure | **PII shielding** (first-name + last-initial publicly; bank only login-walled during alert window) | Anti-scraping; anti-abuse; DPDPA posture. |
| Single nominee bank account | **Dual nominee bank accounts** (RBI UPI rate-limit workaround) | Already a real TSCT operational workaround; TWT formalizes. |
| 10-day contribution window | **15-day** | More generous; reduces missed-contribution churn for first-time members. |
| Pool letters (A–T) | **Culture-rooted names** drawn from a trustee-curated list (Mahabharata as the seed set; extensible to Ramayana, classical Indian poets/scholars/reformers, regionally significant figures, and per-Pariwar resonant names) + letter codes for backward compat | Cultural resonance > alphabetic anonymity. Builds emotional identity per pool without locking the naming to a single source. Per-Pariwar curation supports future Pariwars (Rail, Bank) using sets that resonate for their cadre. |
| UP-only geographic scope | **Multi-Pariwar Platform; v1 = Bihar** | Math demands larger pools for some communities; TSCT/NSCT haven't escaped UP at scale. |
| State eHRMS direct integration (would be ideal but politically infeasible) | **DigiLocker for Aadhaar-linked KYC**; eHRMS ID typed manually | Govt API approval unrealistic for v1. |
| Public-can-donate (implied risk path) | **Public donation removed** in v1; Crowdfunding Module (Phase 2/3) goes through trust intermediation with 80G + PAN + 10% cut | Bereaved family must not face PMLA scrutiny from random donations. |
| One-time-only attendance/RSVP workflows | **Survey/poll feature** as core (admin UI) | Quorum-gated decisions replace ad-hoc Telegram forms. |
| Field worker comp unconditional (~₹60–70 on signup) | **Field worker comp gated on KYC + ₹110 + first valid contribution** | Quality alignment; prevents fraud rings inflating signup counts. |
| TSCT R11 voluntary withdrawal — no mention of rejoin restriction | **12-month rejoin lock** under same identity (Aadhaar + eHRMS) after voluntary withdrawal (FR-6) | Prevents abuse pattern where members withdraw + immediately rejoin to game lock-in / contribution-discipline reset. TWT-introduced addition; not a TSCT inheritance. |
| TSCT lacks an explicit Vyawastha Shulk renewal grace structure | **3-month grace period from all renewals** (FR-1A); first-time signup remains mandatory-upfront | Renewal grace prevents margin-of-error members (Reena persona) being penalized by a single admin lapse. Mutual-aid posture > insurance-renewal strictness. |

## 3. Pool Math — worked examples

### 3.1 Steady-state Bihar (320,000 members, 20 deaths/mo, ₹310)

- Pools spawned: 20; members/pool: 320,000 / 20 = **16,000**.
- Per-nominee at 100% collection: 16,000 × ₹310 = **₹49.6 lakh**.
- At 80%: ₹39.68 lakh. At 70%: ₹34.72 lakh — below trustee threshold; triggers outreach, not an amount hike.

### 3.2 Pre-floor (50,000 members, 5 deaths/mo, ₹310) — 12 months from launch

- Pools spawned: 5; members/pool: 10,000.
- Per-nominee at 100%: **₹31 lakh**.

"Product is real, value proposition weaker." SM-2 (pool-math floor) gates "value proposition fully landed."

### 3.3 Fixed-amount adjustment (month 36 → month 48)

Month 36: 280,000 members, 22 deaths/mo average. At ₹310 and 90% collection → 12,727/pool × ₹310 × 0.9 = **₹35.51 lakh** per nominee.

Trustee announces in month 36, effective month 48 (FR-15 12-month notice): raise to ₹400.

- 280,000 × ₹400 × 0.9 ÷ 22 pools ≈ **₹45.5 lakh** per nominee.

Per-pool monthly burden goes from ₹310 to ₹400 with a full year of warning. SM-C4 counter-metric prevents knee-jerk hikes.

## 4. Reconciliation matcher — mechanism options (deep-dive)

PRD declares the *capability* (FR-29, FR-30). Mechanism is OQ-2. Three v1 implementations; all run a matcher cron 6×/day during live alerts.

| Option | Input | Parse | Pros | Cons |
|---|---|---|---|---|
| **A — PDF + OCR** | Daily PDF bank statement uploaded by nominee shepherd | Server-side PDF parser + OCR | Standard bank format; no nominee-side burden | PDF fragility across banks; OCR error rate |
| **B — CSV/Excel** | Daily CSV/Excel upload | Server-side structured parse | Robust parse; clear error modes | Shepherd must convert PDF→CSV unless bank exports |
| **C — Hybrid** | CSV preferred, PDF fallback | Both paths | Best of A+B | Two code paths to maintain |

**Author's prior:** target **C**, ship **B** first (one path, fewer bugs). Add PDF OCR when a partner bank without CSV export onboards. Resolve in OQ-2.

## 5. Niyamavali full reference (R-numbered, TSCT-derived)

> Reference for the rule registry (FR-7). Each entry is the TSCT R-number, a one-line TWT v1 status, and TSCT's source text annotation.

| Rule | TWT v1 status | TSCT phrasing (preserved) |
|---|---|---|
| R1 | Adapted | Registration is free; membership is free; mandatory annual ₹110 Vyawastha Shulk on TWT. |
| R2 | Modified | TSCT: Telegram mandatory. TWT: Telegram mirrored; in-app primary. |
| R3 | n/a v1 | TRAI bulk SMS prerequisite. TWT drops SMS. |
| R5(C) | Carried | Medical pause workflow. |
| R5(C.2) | Carried | Death cause is what matters, not pre-existing illness. |
| R5(D) | Carried | Core team has full discretion. No member has legal claim; commitment purely ethical. |
| R5(E) | Carried | Multi-nominee disputes → team may redirect to second nominee. Defamatory beneficiaries can have funds recovered. |
| R5(F) | Carried | Erroneous excess transfer → trust helps with recovery; no guarantee, no liability. |
| R6 | Carried | All contributions mandatory after lock-in. |
| R7(A) | Carried (review) | Break before 10 contributions → 3-consecutive restore; one-time only; max 2 lifetime. |
| R7(B) | Carried (review) | Registered but never contributed → 5-consecutive + 3-month lock-in; core-team approval. |
| R7(C) | Carried (review) | Long gap → treated as new registration; 5-consecutive + lock-in. |
| R7(D) | Carried (review) | 1 skip/year → 3-month lock-in + catch-up. |
| R7(E) | Carried (review) | 2+ skips/year → 5-month lock-in + complete all. |
| R7(F) | Carried (review) | 6+ month gap → 5-month lock-in + complete all. |
| R7(G) | Carried | Personal events do not excuse skips. |
| R8 | Carried | 90% rule; applies after ≥10 contributions; only to illness deaths, not accidents. |
| R8(A) | Carried | 1 skip/year permitted if prior 100%. |
| R8(B) | Carried | Mid-contribution death → eligible. |
| R9 | Carried | Suicide / controversial → core-team investigation; voting may apply. |
| R9(A) | Carried | Multiple deaths same date → priority to higher contribution record. |
| Mar 2025 rule | Carried | Suicide/murder where nominee is accused → no support. |
| R10 | Carried | No support outside rules; no cancellation outside rules. |
| R10(A) | Carried | No parallel teacher-org office-bearing. |
| R10(D) | Carried | Rules amendable anytime by core team. |
| R10(E) | Carried | TSCT disburses directly to nominee accounts. No judicial challenge permitted. |
| R11 | Carried | Voluntary; member can withdraw anytime. (No refund.) |
| R12 | Adapted | Same as R1 — membership free; TWT layers ₹110 mandatory fee. |
| R13 | Modified | TSCT: Telegram official. TWT: in-app official; Telegram mirror. |
| R14 | Carried | Forged receipts → validity terminated; support withheld. |
| R15 | Adapted | TSCT optional Vyawastha Shulk + Accident Treatment unlock. TWT: ₹110 mandatory; the benefit — renamed **Durghatana Sahayata (Accident Assistance)** — is deferred to v2/v3 with forward-compat hooks only (FR-100, §4.15). Note: this is a trust-paid assistance benefit (rule-tagged `benefit_mechanism = reserve`), not a daan / pool support category. |

## 6. In-depth personas

The PRD's §2 personas are tight by design. Depth lives here.

### 6.1 Sushil (primary) — extended

**Day in the life:**
- Wakes 6:00; checks WhatsApp before getting up; school-prep, breakfast.
- 7:30 reaches school; classes till 1:30. No phone use during teaching.
- 1:30–3:30 staffroom; phone heavy. TWT alert push lands here. Sushil reads, sees 12 days remaining, defers.
- 3:30 commute home; on the bus he opens TWT, taps My Pool, taps Pay, UPI Intent launches PhonePe, he pays, returns, pastes UTR. Done in ~2 minutes.
- Evening with family; doesn't think about TWT until next month's alert.

**Constraints:**
- Bus commute is when he transacts. 4G connectivity is intermittent.
- Single-SIM phone. UPI is the primary digital money interface (no debit cards used).
- Hindi-first; reads English but slowly. Mixes English nouns into Hindi conversation (typical of his demographic).

**Anti-personas (who Sushil is not):**
- He is **not** a UPI power user; he doesn't auto-pay rent, doesn't use multiple UPI apps.
- He is **not** a Telegram heavy user; he was on the TSCT Telegram briefly but found it noisy. (This is why TWT's Telegram mirror is courtesy-only.)
- He is **not** an English-first reader. UX defaults should be Hindi.

### 6.2 Anita (admin) — extended

**Why she took the role:**
- Her sister-in-law's husband, a teacher in a neighboring district, died at 47. The family's group insurance was ₹2 lakh. The funeral and children's school fees ate it in months.
- She heard about TSCT but found it hard to join from Bihar. When TWT launched, she joined the staff week one.
- She works full-time on TWT because she's seen what happens without it.

**What she needs in the admin UI:**
- One-screen claim signal panel (FR-42). Five seconds. Her queue is dense; her day is back-to-back claim and helpdesk work.
- One-tap approve / escalate, with a forced rationale text box — she's seen what happens when audit logs don't hold up.
- Helpdesk inbox routed to her by scope, not a cross-state firehose.

**Anti-pattern she'd hate:**
- A Kanban board with lanes she has to drag cards between. Phone-first, list-first, signals-first.

### 6.3 Vikram (field worker) — extended

**Comp model from his perspective:**
- He's selling LIC policies for his primary income (~₹15,000/month on a good month).
- TWT field-worker work is supplementary. He targets ~50 acquisitions/month at ₹65 each = ₹3,250.
- His comp depends on **qualified** acquisition: KYC + ₹110 + first contribution. He learns fast that getting someone to install the app is not enough.
- He becomes a proxy customer-success rep for his attributed members — calling them when the contribution deadline approaches, explaining the UPI flow.

**What he needs:**
- A simple dashboard: who he's attributed, what stage they're at, where they're stuck.
- Fast attribution code lookup (his own code, not anyone else's).
- A clear monthly statement of what he's owed.

## 7. Decision provenance summary

Cross-reference for downstream artifacts that need to source-extract design rationale:

| Decision | Source | Notes |
|---|---|---|
| Multi-Pariwar from day 1 | Brainstorm Theme 11 | Architecture cost vs retrofit cost. |
| No payment gateway for support pool | Brief, Brainstorm Theme 4 | PMLA / regulatory surface. |
| UPI Intent + UTR self-attestation + nominee statement intake | Brainstorm Theme 4 | Replaces TSCT screenshot model. |
| Culture-rooted pool naming (Mahabharata seed + extensible) | Brainstorm Theme 2 SC-9 + user-review-driven loosening | Cultural resonance + per-Pariwar extensibility. |
| 12-default-role set | Derived from TSCT §8.3 + extrapolation | OQ-3 to confirm. |
| 30-day (1-month) starting lock-in, trustee-adjustable, member-count-driven ramp | Brainstorm Theme 12; TSCT divergence; user-review-driven correction | Member-count + trustee judgment triggers graduation, not calendar. |
| Ground inspection + peer mesh — both | Brief, Brainstorm Theme 5; explicit BigDev correction | Not either/or. |
| Nominee bank at claim-time | Brainstorm Theme 5; explicit BigDev correction | Not at member signup. |
| Public donation killed | Brainstorm Theme 7 | PMLA exposure to bereaved family. |
| Telegram mirror, not mandatory | Brainstorm Theme 8 | Honors migrating cohort. |
| ₹110 mandatory Vyawastha Shulk | Brainstorm Theme 12 | TWT divergence from TSCT voluntary. |
| Solo-build acceptance | Brief §Constraints | Sequencing primacy over speed. |
| Three uncompromisable subsystems | Brief §Constraints | Pool Engine, Reconciliation, RBAC/multi-tenant. |
