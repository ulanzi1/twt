---
title: Product Requirements Document — TWT (Teachers Welfare Trust)
status: final
created: 2026-05-22
updated: 2026-05-27
project: TWT
audience: internal-team-handoff
authoring_inputs:
  - _bmad-output/planning-artifacts/briefs/brief-TWT-2026-05-22/brief.md
  - _bmad-output/brainstorming/brainstorming-session-2026-05-20-1609.md
  - _bmad-output/research/tsct-reference-learnings.md
companion_artifacts:
  - ./addendum.md
  - ./.decision-log.md
  - ./extract-brainstorm.md
  - ./extract-tsct-reference.md
  - ./reconcile-brief.md
  - ./reconcile-brainstorm.md
  - ./reconcile-tsct.md
  - ./review-rubric.md
  - ./review-adversarial.md
---

# PRD: TWT (Teachers Welfare Trust)
*Working title — final brand may shift to "Shikshak Parivar" (OQ-1). Architecture allows renaming; ASO and trust legal docs do not — decision blocking before app-store listing.*

## 0. Document Purpose

Canonical capability spec for **TWT v1** — the first instance of a multi-tenant "Pariwar Platform," shipped as a single trust serving Bihar government teachers. Audience: Solo Builder, future collaborators/hires, downstream UX / architecture / story-creation workflows, Trustee Panel.

Not a re-statement of the brief, brainstorm, or TSCT reference (canonical at their cited paths). This PRD extracts capability-level requirements, anchors a Glossary that downstream work uses verbatim, and surfaces blocking questions and assumptions. Trade-off rationale and rejected alternatives live in `addendum.md`; decision provenance in `.decision-log.md`.

FRs numbered globally (FR-1..FR-N); User Journeys UJ-1..UJ-N; Success Metrics SM-1..SM-N (counter-metrics SM-Cn). Numbering is stable across reorganizations.

## 1. Vision

Government teachers in India face a specific, named risk: dying mid-career or in early retirement leaves a family with little. Pensions kick in late, group insurance is inadequate or absent, and ad-hoc collections (Telegram groups, WhatsApp chains) work briefly and break under scale. TSCT proved the model in Uttar Pradesh — ~₹247 crore distributed to 556 families since 2020 — but TSCT is structurally UP-bound, screenshot-receipt heavy, Telegram-mandatory, and not packaged for replication. NSCT, the obvious national scale-out, has stalled at ~300 members. The rest of India is structurally underserved by a model that demonstrably works.

**TWT v1 closes that gap for Bihar.** A mobile-first member app + admin UI + public website lets a Bihar teacher pay ₹110/year, enter a lock-in, and from then on, contribute ~₹310–400 each month *directly via UPI* to the nominee of a deceased colleague — no payment gateway, no trust intermediation of support money. The system spawns one pool per approved claim per month, deterministically assigns each active member to exactly one pool, and reconciles contributions automatically via member-attested UTRs + a nominee-pushed daily bank statement. The first claim closes end-to-end without manual heroics; that's when v1 is real.

The longer arc is the **Pariwar Platform**: one codebase, `pariwar_id` first-class everywhere from day 1, that will later host Rail Parivar (~13L railway employees), Public Servants Parivar (~30L central government employees), Bank Parivar, and other sectoral mutual-aid communities — each as its own app, brand, and scope, all running on shared infrastructure. Multi-tenant scaffolding is built into v1 even though only TWT-Bihar ships first, because retrofitting it after launch is prohibitively expensive. The next Pariwar comes when the first one's math works — not before, and not on a runway-dictated date.

## 2. Target User

### 2.1 Primary Persona — *Sushil, a Bihar primary-school teacher*

Sushil is a 38-year-old assistant teacher at a government primary school in Vaishali district. He earns ~₹45,000/month, has two school-age children, and is the sole earner — his wife teaches part-time at a private coaching center. His group-insurance coverage through the state education department is ~₹2 lakh; the math doesn't reach. He is Hindi-first, comfortable in basic English, smartphone-primary (WhatsApp daily, Telegram if a colleague pulls him in, no laptop at home). A colleague tells him about TWT; he downloads it because the colleague's WhatsApp message includes a 6-digit field-worker code that the colleague was paid ₹65 to share. He pays ₹110 within five minutes of opening the app. His mental model: this is like a *chanda* (community contribution) but with rules and an app that tells him who to send to.

### 2.2 Primary Persona (Margin-of-Error) — *Reena, a Shikshakamitra (teacher aide)*

Reena is a 32-year-old teacher aide in the same district as Sushil, earning a ~₹15,000/month stipend. She's a single mother of one. The ₹110 annual fee is a noticeable line item for her; the ~₹310 monthly contribution gets scrutinized every cycle. Hindi-first, marginal English. Uses a basic Android phone (~2 GB RAM, 4G intermittent). She represents the lower-margin half of TWT's eligible base — the most likely to churn on a single bad alert experience. UX decisions that work for Sushil but fail Reena (e.g., a missed-deadline penalty without a soft reminder, or a UPI flow that requires retrying) are net failures. Her presence as a primary persona is the design constraint that keeps Phase A onboarding honest: signups that don't convert Reena-class members are SM-C1 problems.

### 2.3 Secondary Persona — *Anita, a District Admin / Verifier*

Anita is **full-time paid TWT staff** based in Patna district. She's the first reviewer when a claim is filed in her block-cluster, coordinates the ground-inspection visit, vouches for or against the claim, and answers helpdesk tickets routed to her scope. She uses TWT's admin UI on a mid-range Android phone and occasionally on a borrowed laptop. Her RBAC scope is `district=Patna`. She is what keeps the trust trustworthy.

### 2.4 Tertiary Persona — *Vikram, a Bihar Field Worker (Phase A acquisition)*

Vikram is a 28-year-old who sells LIC policies part-time. Recruited as a paid TWT field worker (₹60–70/qualified acquisition), he gets a 6-digit attribution code, an admin-app login, and a target list of teacher meet-ups, school visits, and union halls in his block. Comp gates on (a) full KYC, (b) ₹110 paid, (c) first valid contribution in the next monthly cycle — not on signup alone.

### 2.5 Quaternary Persona — *Bereaved Family Nominee (claim-time only)*

Often Sushil's wife, mother, or adult son. May not be a TWT member. May not be smartphone-fluent. Files a claim ~1 month after death (grief eases the rush). Enters bank account + IFSC at claim-time — these are **not** pre-validated at member signup. Receives contributions to two equal nominee bank accounts (donor's choice, FR-31) over a 15-day window. **The trust assigns a human shepherd per claim** — Anita-class — to walk them through.

### 2.6 Quinary Persona — *Trustee Panel + Trust Staff*

TWT is a legal trust with the **statutorily required minimum of 3 trustees** plus a small staff. Trustees: lower-volume, higher-authority actions — set the per-pool fixed amount (₹310–400) on 90-day notice, approve claims at cycle freeze, amend Niyamavali, govern. Staff: higher-volume, lower-authority — claim shepherding, nominee statement intake, helpdesk routing, field-worker dispatch, reconciliation triage. Admin UI serves both layers. "Solo" refers to **build capacity** (BigDev engineering + product), not trust operations.

### 2.7 Jobs To Be Done

- **Sushil (member):** "I want to know that if I die, my family won't be ruined — and I want this to cost me less than ₹4,000/year, total." (Functional.) "I want to feel I'm part of something honorable — not a customer of a service." (Emotional / social.) "I don't want to have to upload a screenshot every month." (Contextual.)
- **Reena (margin-of-error member):** "I want a single clear monthly number, no surprises, no extra friction." (Functional.) "I want to be told *before* I miss something, not penalized for missing it." (Emotional.) "I want to know my status without having to ask anyone." (Functional — drives FR-12A.)
- **Anita (verifier):** "When a claim comes in, give me everything I need to judge it on one screen in five seconds." (Functional.) "I don't want to be Telegram-paging strangers to verify someone." (Contextual.)
- **Vikram (field worker):** "Tell me which 6-digit code is mine, who I've signed up, what stage they're at, and when I'm getting paid." (Functional.)
- **Bereaved family:** "Tell me exactly what happens next and who I can call." (Emotional / functional.)
- **Trustee:** "Let me run an honest trust without WhatsApp chaos, with an audit log that holds up under investigation." (Functional.) "Let me change the rules when reality demands without it looking arbitrary." (Social.) "Let me look up any member at any time and see if they're valid right now — not just at claim time." (Functional — drives FR-12A.)

### 2.8 Non-Users (v1)

- Non-Bihar teachers — v1 is **single-state**. Architecture supports multi-state from day 1, but Bihar is the only Pariwar live.
- Non-government teachers — eligibility is the TSCT-cadre set: basic + secondary teachers, Shikshakamitra, instructors, fourth-grade staff, clerical, BEOs, DIET lecturers, higher-ed faculty.
- Public donors / non-teachers wanting to contribute to a claim — **explicitly out** in v1. Crowdfunding Module is Phase 2/3 with its own posture.
- Other sectoral cadres (railway, banking, public-service) — architecture supports them via second Pariwar provisioning; v1 does not implement.

### 2.9 Key User Journeys

> UJ-1..UJ-10. FRs reference journeys inline ("realizes UJ-N"). Captured narratives anchored in the personas above — not authored ideal-state.

- **UJ-1. Sushil signs up after a colleague hands him a 6-digit code.**
  Sushil installs TWT (no account yet). On first launch he's offered Hindi or English. He picks Hindi. He enters his mobile and OTP. He types his eHRMS ID manually (no auto-fetch). He runs **DigiLocker KYC** — Aadhaar-linked photo, name, DoB pulled in. He fills in his school, district, designation. **Reference Code field** is offered (optional) — he pastes the 6-digit field-worker code his colleague gave him. He pays **₹110 via UPI Intent** (no gateway, no card form). He sees a confirmation screen: "You're a member. Your lock-in period is 30 days — you'll see your first pool on the next monthly alert after that." A **lock-in clock widget** appears on his home screen counting down. *Edge case:* DigiLocker fails (provider down). The app captures KYC fields manually and queues for trustee validation; member becomes "pending-valid" until validated.
- **UJ-2. Sushil pays his monthly contribution to his assigned pool.**
  It's the 3rd of the month. Sushil's lock-in is over. The trust has approved 17 claims this month. The Pool Engine has auto-spawned 17 pools, each given a culture-rooted name (the seed list is Mahabharata characters — Arjuna, Bhishma, Karna, Yudhishthira — but the curated set extends to other cultural and historical figures as needed). Sushil opens TWT and sees his **"My Pool" card** at the top: "Pool Karna — Nominee: Mrs. Sharma (your contribution this month: ₹310). 12 days left." He taps it. He sees Mrs. Sharma's two nominee bank accounts. He taps **Pay via UPI**. UPI Intent launches with the VPA pre-filled, amount locked at ₹310, idempotent `tr=` reference unique to (Sushil × Alert-78). He pays in his UPI app. He returns to TWT. He's prompted to **enter the UTR** — paste from his UPI app. He submits. Card now reads "Submitted — awaiting reconciliation." That night, the trustee's UTR matcher confirms the deposit on Mrs. Sharma's daily bank statement. Sushil's status flips to "Confirmed." *Edge case:* UTR mismatch — Sushil is asked to upload a **screenshot** as backup; trustee reviews manually.
- **UJ-3. A nominee files a claim after Sushil's death (hypothetical — illustrative).**
  Sushil's wife is told by a colleague to call the TWT helpline. A trustee assigns a **human shepherd** — Anita-class — to her case. Shepherd guides her through the claim filing: she uploads the **death certificate** (OCR runs a parity check on name/DoB against Sushil's TWT profile), enters nominee bank account + IFSC (entered at claim-time, not pre-validated), confirms two nominee accounts for the UPI-limit workaround. The claim enters review. **Peer first-witness verification** auto-pings the 5 nearest members (by district + school proximity). **Ground inspection** is scheduled within the trust's standard SLA. Anita is the block-level reviewer and approves. State Trustee gives final approval at cycle freeze. The pool spawns. ~16,000 contributors are notified. 15 days later, ~₹49 lakh has landed in Sushil's wife's two accounts. Public Sahyog page reflects the closed pool; In Memoriam page now includes Sushil. *Edge case:* peer verifiers report a discrepancy → claim escalates to State Trustee for direct review.
- **UJ-4. Anita reviews a claim queue on her phone.**
  Anita gets a push: "3 claims pending your block-scope review." She opens admin app. She sees a list; first claim has a **status banner** with member's KYC validity, contribution history (87% over 18 months), last login, and field-worker attribution chain. She taps "Approve" — her reviewer name is now publicly attached to that claim (social accountability). She schedules a ground-inspection visit with one tap.
- **UJ-5. Vikram recruits Sushil and gets paid.**
  Vikram meets Sushil at a union meeting. He shows his TWT field-worker QR — Sushil scans, pastes the 6-digit code at signup. Over the next 6 weeks, Sushil completes KYC, pays ₹110, and makes his first contribution. **Only then** does Vikram's commission of ₹65 enter the next monthly disbursement to his bank. Vikram opens his field-worker dashboard: 14 members attributed, 9 fully qualified, ₹585 paid this month, 5 pending qualification.
- **UJ-6. Trustee changes the fixed contribution amount.**
  Trustee Panel decides to raise the per-pool contribution from ₹400 to ₹430 starting next cycle. The trustee opens admin UI → Contribution Settings. Sets effective date 12 months out. Drafts the announcement copy. Schedules push to all channels (in-app + WhatsApp + Telegram mirror). Audit log records who changed what, when, with prior value.
- **UJ-7. Trustee amends a Niyamavali rule.**
  Lock-in policy moves from 1 month to 3 months (year 2 ramp). Trustee edits the Niyamavali entry in admin UI. A **diff view** is generated showing old → new clause. The amendment goes to the Niyamavali public page with the diff visible to members. Audit log captures the change. All affected members get a notification.
- **UJ-8. Public visitor browses an active Sahyog Drive.**
  A non-member visits twt.org from a search result. Lands on **Active Support Drive** — sees this month's pools (Pool Arjuna, Pool Bhishma…), per-pool target and live total, contributor count (no PII — first-name + last-initial only). Clicks into Pool Karna detail — sees the family's story (Sahyog Vivran), the verifier names with profile links, no nominee bank details (login-walled). They see "Become a member" CTA but it's prefaced with "TWT is for government teachers — see eligibility." *No public donation path exists.*
- **UJ-9. Member resolves a UTR-mismatch.**
  Reena paid ₹310 on Day 8 but the UTR matcher couldn't confirm a deposit on Mrs. Sharma's statement. Day 10, Reena gets a push: "Your contribution for Pool Karna needs verification — please upload a payment screenshot." She uploads. Trustee reconciliation queue picks it up; matches manually; confirms within 24 hours. Reena's status flips to "Confirmed" with 4 days to spare.
- **UJ-10. Reena explores the Module Shelf after a successful contribution.**
  Reena's contribution for the month is `confirmed`. The home screen scrolls past **My Pool** to the **Module Shelf**. She sees two cards she's eligible for: "LIC term insurance for govt teachers — ₹1 crore cover from ~₹10,000/yr" and "HDFC home loan — ₹50 lakh + at govt-teacher rates." She taps LIC. The detail screen describes the offering, lists what TWT knows about her (school, designation — pre-filled into a lead form, with consent), and a **Start Application** CTA. She fills basic interest details. LIC partner receives the lead with TWT attribution (Module-Mart manifest). Reena's role in the loop is exactly: tap, consent, submit lead. *Edge case:* she's outside LIC's age-band — the module's `eligibility_filter` (FR-65) prevents the card from showing up at all, so she never sees it. For partner-side soft-eligibility rejections, the partner responds in-app within their SLA with a courteous "not at this time."

> v1 explicitly omits journeys for: cross-state transfer-in (v2), foreign-death claims (v2), Crowdfunding Module donor flow (Phase 2/3), Pariwar provisioning (activates with 2nd Pariwar).

## 3. Glossary

> Every domain noun the rest of this PRD uses. Defined once. FRs/UJs/SMs use these terms verbatim — synonyms are a discipline violation. New nouns in Features must be added here in the same pass.

**Pariwar terms**
- **Pariwar** (परिवार) — "family"; the unit of belonging in the TWT platform. Each tenant community is a Pariwar (TWT-Bihar = Shikshak Parivar / Teachers Pariwar; future tenants: Rail Parivar, Bank Parivar, Public Servants Parivar). Singular pariwar = one community.
- **`pariwar_id`** — first-class column on every multi-tenant table; identifies which Pariwar a row belongs to. Foundational discipline; cannot be retrofitted cheaply.
- **Pariwar-Passport** — cross-Pariwar master identity profile. Data model present in v1, member-facing UI deferred to v2.
- **TWT** — Teachers Welfare Trust. Working brand name for the first Pariwar (Bihar). Final brand may shift; see OQ-1.

**Reference / context**
- **TSCT** — Teachers Self-Care Trust (Uttar Pradesh). The proven reference model; TWT inherits most of its Niyamavali (see §4.2) and diverges deliberately on specific items (see Addendum §1, "TSCT divergences").
- **NSCT** — National Self-Care Team. National-scale TSCT variant, stalled at ~300 members. TWT's competitive posture: not competing; geographic bypass (Bihar before UP).

**Membership & lifecycle**
- **Member** — an individual who has registered, paid the ₹110 Vyawastha Shulk, completed KYC, and entered the active/lock-in lifecycle. Address as **सम्मानित साथी** ("respected colleague"); never "user."
- **Vyawastha Shulk** — TWT's mandatory ₹110/year annual membership fee (the line item). Distinct from TSCT's voluntary ₹50→₹75 of the same name. (Disambiguation note: TSCT also uses "Vyawastha" as a serious-illness support category; TWT v1 does not include that support category — the term refers exclusively to the annual fee in this PRD.)
- **Lock-in period** — pre-eligibility window after signup during which the member's nominee cannot claim. TWT v1 starts at 30 days; phased ramp to 12 months by year 4.
- **Active member** — past lock-in, Vyawastha Shulk valid (within rolling 1-year), contribution discipline maintained.
- **Pending-valid** — KYC manually queued (DigiLocker fallback) and awaiting trustee validation.
- **Lapsed member** — fell out of compliance per R7 sub-rules; restoration paths defined in §4.2 Niyamavali.
- **Voluntary withdrawal** — member exits; ₹110 forfeited; 12-month rejoin lock under same identity.

**Cycle, alerts, pools**
- **Alert** — the monthly numbered support drive announcement (e.g., Alert #78). One alert per month. Contains N pools where N = approved claims that month.
- **Pool** — a single contribution flow within an alert, given a **culture-rooted name** drawn from a trustee-curated list. Mahabharata characters (Pool Arjuna, Pool Bhishma, Pool Karna, Pool Yudhishthira…) are the **seed set**; other culturally or historically meaningful names (mythological, historical, vernacular-literary, regionally significant) may be added to extend the list as N grows. Letter codes (A, B, C…) retained for backward compatibility with TSCT. Each pool has exactly one nominee.
- **My Pool** — the home-screen card shown to a member showing their assigned pool for the current alert, the nominee, the amount, the deadline. The single most important member-facing UI element.
- **15-day window** — the contribution window from alert publish to hard close. No extensions.
- **Pool Engine** — the subsystem that auto-spawns pools, deterministically assigns members (`hash(member_id + cycle_id) mod N`), tracks contributions, closes the cycle.
- **Under-funded cycle** — a cycle where actual collection is less than the target. Trust does **not** top up from reserves; nominee receives actual collection. Codified as "Pool-Reality #1."

**Money & reconciliation**
- **Fixed amount** — the per-pool per-member contribution amount set by trustees (current range ₹310–400). Announced at least 90 days in advance of any change; no minimum period for which an amount must stand.
- **UPI Intent / UPI Deep Link** — the only payment rail for member → nominee in v1. No payment gateway for trust money in the support-pool flow.
- **UTR** (Unique Transaction Reference) — bank/UPI payment identifier. Member self-attests UTR post-payment.
- **Reconciliation engine** — cron-based subsystem matching member-attested UTRs against nominee-pushed daily bank statements.
- **Contribution Note** — the PDF artifact issued to a member after a confirmed contribution. **Never** called "receipt" or "invoice" — legal posture (see §4.14 Trust Posture).
- **Dual bank accounts (per nominee)** — every nominee provides two bank accounts at claim-time; UPI rate-limit workaround for ~16,000 transactions in 15 days.

**Claim & verification**
- **Claim** — the trust-side workflow opened when a nominee files for support after a member's death. Verified, approved, and resolved into a Pool.
- **Peer verification mesh** — auto-pings 5 nearest members (by district + school proximity) for first-witness verification on a claim.
- **Ground inspection** — physical visit by trust field tier (block / district) to confirm facts. Retained alongside peer mesh — both, not either.
- **Human shepherd** — a trustee-assigned individual (typically a District Admin) who guides the bereaved family through the claim journey end-to-end.
- **Trustee-Lite signals panel** — pragmatic v1 alternative to a full Kanban claim board. List + per-claim signals (KYC validity, contribution history, attribution chain, peer-mesh status).

**Identity & RBAC**
- **eHRMS ID** — government teacher HR identifier. Manually entered at signup; no auto-fetch (govt API politically infeasible).
- **DigiLocker KYC** — Aadhaar-linked KYC via DigiLocker. Pulls photo, name, DoB. Mandatory at signup when available; manual fallback supported until provider approval lands universally — at which point DigiLocker becomes hard-mandatory.
- **Scope dimensions** — the five RBAC grant dimensions: `block`, `district`, `state`, `pariwar`, `global`.
- **Default seeded roles (12)** — the role bundles pre-installed with each Pariwar. v1 set: Super Admin, Pariwar Admin, State Trustee, District Admin, Block Admin, Finance Officer, IT Cell, Media/Comms, Field Worker, Verifier, Auditor, Helpline Operator. *[ASSUMPTION: 12-role set derived from TSCT operational structure + reasonable extrapolation. Trustee Panel to confirm or revise before launch.]*
- **Audit log** — attributable, immutable record of every admin action, contribution event, rule change, claim transition. 7-year retention (DPDPA-aware).

**Niyamavali (rules)**
- **Niyamavali** (नियमावली) — the rulebook. Versioned per Pariwar. TWT v1 ships with a Bihar-flavored set derived from TSCT's R1–R15 with deliberate divergences (see §4.2).
- **R8 / 90% Rule** — the contribution discipline threshold. Applies only after ≥10 contributions. Allows 1 missed contribution if prior compliance ≥ 90%. Sub-rules R8(A), R8(B). Applies only to illness deaths, not accidents.
- **R5(C)** — medical pause clause. Allows formal pause of contribution obligations during a medical episode.
- **R7(A–G)** — contribution discipline restoration rules. Carried verbatim from TSCT as v1 baseline; may be re-tuned to align with phased lock-in ramp *[ASSUMPTION: Trustee Panel will re-tune R7 thresholds when lock-in graduates between years]*.
- **75/25 multi-nominee split** — when two nominees are declared, primary gets 75% and secondary 25% (R5(E)).
- **Suicide / nominee-accused-murder exclusion** — Mar 2025 TSCT rule, adopted unchanged.

**Growth & attribution**
- **Field Worker** — paid acquirer of new members; assigned a random 6-digit attribution code.
- **Reference Code** — the field at signup where a new member pastes either a field-worker code or an existing member's username/eHRMS for adopter-chain attribution.
- **Adopter chain** — attribution graph for organic referrals (Phase B onboarding, activates ≥1L members).

**Further Hindi / Sanskrit terms (TSCT-derived)**
- **Sahyogsuchi** (सहयोगसूची) — "support list"; contributor list per alert. Public version (first-name + last-initial) per FR-74.
- **Jivandan** (जीवनदान) — "gift of life"; future ***daan* / crowdfunded** support category for accidental / emergency medical aid. Engine reuse via FR-20; **not** the same as Durghatana Sahayata (which is a trust-paid assistance benefit, not a daan). v2-v3.
- **Durghatana Sahayata** (दुर्घटना सहायता) — "Accident Assistance"; future **trust-paid assistance benefit** available to Vyawastha Shulk-paid members for accident treatment costs. Member-self, disbursed from the trust account after ground inspection, framed as *"gift, not entitlement"* (TSCT R15 posture). **Not** a *daan* / pool category — does not use member contribution pools. Forward-compat hooks in FR-100 (§4.15); v1 ships no member-side benefit. v2-v3.
- **Kanyadan** (कन्यादान) — daughter's marriage financial support. TSCT support category; future TWT category, engine reuse, v2-v3.
- **Retirementdaan** (रिटायरमेंटदान) — honorable-retirement gesture (financial + ceremonial); planned TWT category alongside Kanyadan/Jivandan. v3.
- **Shikshakamitra** (शिक्षकमित्र) — teacher aides; eligible category for membership (FR-1 eligibility dropdown).
- **"आज का सहयोग कल का सहारा"** — "today's support becomes tomorrow's strength." TSCT-inherited tagline; preserved in TWT brand voice (FR-94 T&C, FR-69 tone guide, public-page footers).
- **"जोड़ते रहें"** — "keep adding [members]." TSCT-inherited CTA; reusable in growth comms (FR-83 analytics dashboard targeting, field-worker dispatch).

**Communication**
- **In-app push** — primary alert delivery channel.
- **Telegram mirror** — TWT alerts mirrored to Telegram, in addition to in-app, to honor TSCT-cohort members migrating in.
- **WhatsApp Business** — admin-toggleable channel for alert delivery.
- **Hindi + English bilingual** — v1 launch languages. Additional regional languages are v2+.

**Compliance / regulatory**
- **DPDPA** — Digital Personal Data Protection Act (India). Governs PII handling. Drives consent registry, RTBF flow, export/portability, breach reporting.
- **PMLA** — Prevention of Money Laundering Act. Reason public-donor-to-nominee donations are killed in v1.
- **DPO** — Data Protection Officer. Required at MeitY's Data Fiduciary threshold; trust to appoint pre-launch or v1-S.
- **80G** — Income Tax Act donation deduction. Only relevant when Crowdfunding Module ships (Phase 2/3).

**Public / transparency**
- **Sahyog** (सहयोग) — "support." TWT English: "Support Drive." Used in public page names.
- **Sahyog Vivran** (सहयोग विवरण) — per-claim story / support detail page.
- **In Memoriam** — public roll of deceased members. Respectful framing; no PII beyond first-name + last-initial + school + district.
- **Contributor List** — per-pool, real-time, public — first-name + last-initial only.
- **Public-vs-Private matrix** — see §4.11. Mobile, address, email, DOB **never** public. Trust ledger, partner commissions, operational spend **never** public.

**Phase / scope tags (used inline)**
- **v1** — first ship. The scope of this PRD.
- **v1-S** — "secondary" — desirable in v1 but cuttable for solo-build cadence. Tagged `[v1-S]` inline.
- **v2 / v3** — explicit follow-on phases. Tagged `[v2]` or `[v3]` inline. The Crowdfunding Module is specifically tagged `[Phase 2/3]`.

## 4. Features

> Capability clusters; FRs nested, numbered globally. Ordering follows the brainstorm's critical-path engineering sequence (identity → rules → pool engine → alert → payment → claim → admin → multi-tenant → modules → comms → public → security → compliance). Sequence is prioritization, not an implementation gate.

### 4.1 Identity & Membership Lifecycle

Identity is anchored to DigiLocker KYC + manually-entered eHRMS ID. The same member-data shape supports both DigiLocker-verified and manual-trustee-validated paths so DigiLocker becoming mandatory later requires no schema change. Member ID is state-agnostic with a `location_history[]` audit trail so cross-state transfers (v2) don't require re-onboarding. A **lock-in clock** widget on the home screen is the primary UX intervention against disputed claims. Realizes UJ-1.

#### FR-1: Member signup with mandatory ₹110 Vyawastha Shulk

A Bihar government teacher can register, complete KYC, pay ₹110, and become a member within a single app session. Realizes UJ-1.

**v1 posture on the ₹110:** The Vyawastha Shulk is a **mandatory entry fee that buys the member no direct return in v1** — it funds trust operations (app, ground inspection, expansion). The Vyawastha Shulk-paid state is, however, the **future eligibility anchor** for **Durghatana Sahayata (Accident Assistance)** and other future trust-paid benefits — see §4.15 (Future Benefit Hooks). Forward-compat hooks for those benefits live in §4.15; FR-1 itself owns only the fee, not the future products it enables.

**Consequences (testable):**
- Member is created in `pending-kyc` state on form completion.
- On successful DigiLocker pull, state moves to `pending-fee`.
- On successful ₹110 UPI Intent payment + UTR confirmation, state moves to `lock-in` with lock-in clock initialized to the current applicable lock-in duration (v1: 30 days).
- Reference Code field accepts: 6-digit numeric (field-worker), or member username/eHRMS (adopter), or empty (organic). Empty → `attribution_source = organic`.
- Eligibility-category dropdown enumerates: basic teacher, secondary teacher, Shikshakamitra, instructor, fourth-grade staff, clerical, BEO, DIET lecturer, higher-ed faculty. No "other."
- Vyawastha Shulk receipts retain `paid_at`, `valid_through`, `amount`, `utr`, `payment_method` indefinitely — sufficient to back-prove, for any past date, whether a member was Vyawastha Shulk-paid. Required by §4.15 future-benefit eligibility evaluations against historical event dates.

**Out of Scope:**
- eHRMS auto-fetch (politically infeasible — Open Question owner: Trustee Panel).
- Non-Bihar state signups in v1.
- Any member-side return on the ₹110 in v1 — no Durghatana Sahayata (Accident Assistance) unlock, no insurance, no medical-aid path. Forward-compat hooks live in §4.15.
- "What your ₹110 bought" member-facing annual statements (deliberately not published in v1; TSCT precedent).

#### FR-1A: Annual Vyawastha Shulk renewal with 3-month grace

Members renew the ₹110 Vyawastha Shulk annually after year 1. **First-time signup is mandatory-upfront** (no grace; ₹110 required to activate `pending-fee` → `lock-in` per FR-1). **All renewals** get a **3-month grace** after expiry during which `is_active` is preserved.

**Consequences (testable):**
- Member record carries `vyawastha_shulk_valid_through` (= `paid_at + 365 days` for the most recent payment).
- Renewal grace logic:
  - Day 0 (`valid_through`): in-app + push reminder; status remains `active`.
  - Day +1 to +90 of grace: member is `active_in_grace`. Validity service (FR-12A) returns `is_active=true` with a flag `in_renewal_grace=true` + `grace_remaining_days`. Reminders escalate at +30, +60, +75, +89.
  - Day +91 onwards: status flips to `lapsed_unpaid`. Member is **not** eligible to claim or contribute. Restoration requires renewal payment; on restoration, lock-in is NOT re-applied (this is a renewal, not a fresh signup).
- Reminders sent via in-app push, WhatsApp Business (admin-toggleable), and Telegram mirror per FR-23 multi-channel render.
- Audit log records each renewal payment + the grace state transitions.
- Validity service (FR-12A) exposes `vyawastha_shulk_status: { paid_through, days_until_lapse, in_renewal_grace, grace_remaining_days }` in its payload.
- If a member dies during `active_in_grace`, the claim is **eligible** (the grace exists precisely so a one-month admin gap doesn't penalize a long-tenure member's family).
- If a member dies during `lapsed_unpaid`, the claim is **not eligible** (R10 — no support outside rules).

**Notes:** `[NOTE FOR PM]` Grace+reminders must balance: too lenient erodes the renewal-rate signal (SM-3); too strict catches Reena-class members on an admin lapse. 3-month grace resolved from OQ-6.

#### FR-2: DigiLocker KYC with manual fallback

When DigiLocker is available, signup pulls Aadhaar-linked photo, name, DoB. When unavailable (provider down, member chooses to defer), KYC fields are entered manually and the member becomes `pending-valid` until trustee validation.

**Consequences (testable):**
- DigiLocker integration uses an abstraction that lets `pending-valid` state flip to `verified` post-hoc without data migration.
- A trustee-action queue contains all `pending-valid` members ordered by signup date.
- Once DigiLocker provider approval lands universally [ASSUMPTION: timeline 6–12 months post-launch], a feature flag flips DigiLocker to **mandatory** for new signups — existing manual-validated members remain valid.

#### FR-3: Lock-in clock widget on home screen (WI-13)

The active lock-in countdown is the topmost UI element on the home screen for a member in `lock-in` state.

**Consequences (testable):**
- Widget shows: countdown in days/hours, lock-in policy rationale (one-line), expected unlock date.
- Tap → opens Niyamavali entry for the applicable lock-in rule.
- When lock-in expires, widget transitions to "My Pool" card (FR-13) on next alert cycle.

#### FR-4: Multi-nominee declaration with 75/25 split (R5(E))

Members can declare one or two nominees at signup or in Life Events. When two are declared, payout is 75% primary / 25% secondary per Niyamavali R5(E). Nominee identity does **not** require KYC (matches bank norms).

**Consequences (testable):**
- Nominee bank/IFSC fields are **not** collected at member signup — they are collected at claim-time only (explicit policy correction from brainstorm).
- Multi-nominee disputes route to State Trustee discretion (R5(E)).

#### FR-5: Life Events panel `[v1-S, except medical-disclosure which is v1-M]`

Members can update marriage status, nominee declaration, address, transfer-in/out, and **medical disclosure** via self-service. Two-sided trustee verify on transfer-in (new state's block admin reaches out within 7 days [v2]).

Medical disclosure is **v1-M** (not deferrable): members must declare any serious illnesses **as listed by the Indian Medical Association (IMA)** in their profile. Disclosure carries an ack timestamp and a Niyamavali-version-of-record at the time of ack. The disclosure list and the IMA reference source are configured in the rule registry (FR-7) so the list can be updated centrally as the IMA list evolves.

**Consequences (testable):**
- Medical-disclosure section is gated behind an explicit "I understand: concealment will result in claim denial" acknowledgement before submit.
- Disclosure events (add / amend / remove an illness) are audit-logged (FR-47) with timestamps.
- Concealment penalty wiring: see FR-11 (Special death scenarios). The rule-engine consequence is hard — claim denial on proven concealment.
- IMA list is sourced from a stable static reference; refresh process and source URL are operational concerns. *[ASSUMPTION: IMA list source is the IMA's published critical-illness schedule or its DPDPA-equivalent reference; Trustee Panel to confirm canonical source pre-launch — see OQ-13.]*

**Out of Scope:** transfer handshake automation in v1 (manual trustee approval suffices); cross-illness medical-history history page in member-facing UI (v2).

#### FR-6: Voluntary withdrawal flow

A member can withdraw at any time. ₹110 forfeited. Contribution history retained. 12-month rejoin lock under the same identity (Aadhaar, eHRMS).

**Consequences (testable):**
- Withdrawal is a single confirmation flow with explicit "no refund" disclosure.
- Withdrawn member retained in DB; visible in admin as `withdrawn`; not searchable in member directory.
- DPDPA RTBF (FR-78) is a distinct path that further anonymizes contributions and removes PII — not the same as withdrawal.

**Feature-specific NFRs:** DigiLocker latency budget 8s p95 for the photo/name/DoB pull; manual fallback CTA visible after 12s wait.

### 4.2 Niyamavali (Rules Engine)

Versioned rule registry per Pariwar. Every membership / contribution / claim eligibility check is registry-driven, not hardcoded. Rules are amendable; amendments produce a public diff against the prior version. v1 Bihar ships with the rules in this section. TSCT R-numbers preserved where applicable. Trustee posture (see §4.14) is encoded in the registry, surfaced in T&C, and reflected in product copy. Realizes UJ-7.

#### FR-7: Versioned per-Pariwar rule registry (Rule-Engine #1)

Every Niyamavali clause has a `pariwar_id`, version, effective date, and a structured payload the engine consumes. Engine queries are deterministic and audit-logged.

**Consequences (testable):**
- Two simultaneous active Pariwars can have divergent rule sets.
- Every eligibility check writes an audit-log line: `{member_id, rule_id, version, evaluated_at, outcome, inputs}`.
- Rule amendments require role `Pariwar Admin` or higher; produce a diff document; trigger a notification to all affected members (e.g., all members of `pariwar_id` if Niyamavali-wide; affected subset if scoped).
- Every rule carries a `benefit_mechanism` discriminator (enum: `pool`, `reserve`). v1 ships only `pool`-tagged rules (R5, R7, R8, R9, R10, etc., governing crowdfunded death-support and future *daan* categories). The `reserve` value exists in the enum but no v1 rule tags as `reserve` — reserved for future trust-paid assistance benefits (Durghatana Sahayata; see FR-100). The discriminator is part of every rule's stored payload and every eligibility-check audit-log line.

#### FR-8: Lock-in policy — trustee-adjustable, member-count-driven ramp (TWT divergence from TSCT)

v1 launches at **30-day** general-death lock-in. Lock-in duration is a **trustee-adjustable rule-registry parameter** — not a fixed calendar schedule. Expected progression: lengthen as the active base grows (shorter lock-in is only safe at small scale; as scale grows, fraud-attempt incentive grows, lock-in must tighten).

Illustrative ramp: 1mo → 3mo → 6mo → 12mo. Graduation trigger is **member-count milestone + trustee judgment**, not a fixed year. Members notified well in advance (FR-23). Members who joined under a shorter lock-in are **not retroactively re-locked** — original clock applies.

Serious-illness lock-in: not applicable to v1 (no illness category). Reserved for v2/v3.

**Consequences (testable):**
- Lock-in duration is a Niyamavali clause keyed `general_death_lock_in.days`, not a code constant. (FR-7 registry.)
- Trustee amendment to `general_death_lock_in.days` requires role `Pariwar Admin` or higher and produces a diff document (per FR-7), an announcement notification to affected members, and an audit-log entry (FR-47).
- Each member carries `lock_in_days_at_join` snapshot — the registry value at their join time. The validity service (FR-12A) computes their unlock date from that snapshot, not the current registry value.
- **Scope fence (added 2026-08-04).** `lock_in_days_at_join` is **join-scoped** by name and semantics. Restoration discipline (R7(B)–(F)'s 3- and 5-month lock-ins) uses a **separate** registry policy clause, resolved and version-pinned at imposition. The two clocks run **concurrently and independently** — neither absorbs, shortens nor completes the other.
- A new joiner after a graduation gets the new (longer) value; existing members are unaffected.
- `[ASSUMPTION: Graduation triggers — member-count thresholds + trustee judgment — are set by the Trustee Panel pre-launch. PRD captures the principle; the schedule is operational policy, not software config.]`

#### FR-9: Contribution discipline (R7 carry-over with v1 caveats)

Carry TSCT's R7(A–G) restoration rules as v1 baseline. Tag the registry entries `policy_review_required` to flag that thresholds may need re-tuning under the phased lock-in ramp.

**Consequences (testable):**
**Restoration never substitutes for joining discipline (added 2026-08-04).** Restoration obligations and joining discipline are **independent governance instruments**. A member may simultaneously owe both; completion, expiry or satisfaction of one never shortens, waives or completes the other unless the Niyamavali expressly provides otherwise. R7(A) and R7(B) therefore apply only while the original joining discipline remains incomplete — the v1 populations below (`total_count < 10`; `ever_contributed == false`) are **implementation proxies, not the constitutional definitions**: a lifetime contribution count is not a joining-discipline state, and `ever_contributed == false` cannot distinguish a new member still completing joining discipline from a long-standing member who never contributed. Superseded by the Niyamavali §3.1 amendment. *(Without this, a member can shorten a 12-month joining discipline to roughly 8 months by lapsing deliberately — inverting its purpose and creating the exact adverse-selection risk that "level playing field / fair opportunity" exists to prevent.)*

- **R7(A) and R7(B) MUST NOT be evaluated from the `contribution.total_count < 10` / `contribution.ever_contributed == false` proxies alone.** The 2026-08-04 amendment above disclaims them as constitutional definitions, so until `member.joining_discipline_state` is **produced by the validity payload** both clauses remain **omitted** from `applicable_niyamavali_clauses[]`. An omitted clause is honest; a clause evaluated from a proxy this PRD has already disclaimed produces a *wrong eligibility answer on a real member's record*, which is the worse failure. R7(C)–(G) gate on gap, skip and excuse facts rather than joining discipline and are unaffected by this constraint — though R7(G) remains un-evaluated for a separate reason, its own fact source. **This requirement is normative: future implementations MUST NOT substitute alternative proxy populations without a corresponding Part 11 amendment.**
- R7(A): break before 10 contributions → 3-consecutive-contribution restore; one-time-only; max 2 lifetime → after that R7(B) applies.
- R7(B): registered but never contributed → 5-consecutive + 3-month lock-in; core-team recommendation.
- R7(C): long gap → treated as new registration; 5-consecutive + lock-in.
- R7(D): 1 skip/year → 3-month lock-in + catch-up.
- R7(E): 2+ skips/year → 5-month lock-in + complete all.
- R7(F): 6+ month gap → 5-month lock-in + complete all.
- R7(G): personal events do not excuse skips.
- `[ASSUMPTION: R7 thresholds will be re-tuned by Trustee Panel ahead of year-2 lock-in graduation; PRD captures baseline only.]`

#### FR-10: 90% Rule (R8) with R8(A), R8(B) sub-clauses

Carry verbatim from TSCT. Applies only after ≥10 contributions. Threshold reviewed at the 10/20/50 milestones. Applies only to illness deaths, not accidents.

**Consequences (testable):**
- R8(A): 1 skip/year permitted if prior compliance was 100%.
- R8(B): Mid-contribution death (member died after alert published, before deadline) → eligible — presumed they would have paid.
- Engine logs each evaluation with rule version.

#### FR-11: Special death scenarios + concealment penalty (R5, R9, R14-adapted)

Carry R5(C.2), R5(D), R5(E), R5(F), R9, R9(A) verbatim. Including the **Mar 2025 suicide / murder-with-nominee-accused exclusion**. Plus a concealment-penalty consequence: if a member dies of an illness that they failed to declare in their medical disclosure (FR-5) — and the illness is on the IMA reference list — the claim is **denied** under an R14-adapted framework (TSCT R14 was originally about forged receipts; TWT extends the integrity-violation principle to declared-illness concealment).

**Consequences (testable):**
- R5(C.2) — actual cause of death governs eligibility, not pre-existing illness *that was honestly declared*.
- R5(D) — Core team has full discretion. No member has legal claim; commitment purely ethical.
- R9 — controversial cases → core team voting workflow.
- R9(A) — multiple deaths same date → priority to higher support/contribution record.
- **Concealment denial:** if claim review surfaces evidence that the deceased had a pre-existing IMA-listed serious illness *not declared in their medical-disclosure history*, AND the cause of death is reasonably linked to that illness, the rule engine flags the claim for State Trustee review with the concealment recommendation. Final denial requires explicit trustee action — never auto-denial — but the engine surfaces the trigger. Audit-logged.
- R5(C.2) and the concealment-penalty are not in conflict: R5(C.2) protects honestly-declared pre-existing patients (e.g., declared kidney patient who dies in a road accident → eligible as accident death). The concealment penalty targets dishonesty, not pre-existing condition.

#### FR-12: Retirement coverage extension

After 5 years of valid membership, member retains **+1 year post-retirement coverage**. Each additional 5 years adds another year. (15 years → +3 years post-retirement.)

**Consequences (testable):**
- Engine computes post-retirement coverage on-the-fly from `joined_at` and `retired_at` (when set).
- Retirement is a Life Event (FR-5); retired members continue receiving alerts and contributing during their covered extension.

#### FR-12A: Member Validity Service (real-time eligibility evaluation)

A deterministic, real-time validity service over the rule registry (FR-7): given a `member_id`, returns current status with rule-by-rule provenance. Canonical answer to "is this member valid and active right now?" — called by every admin surface (FR-42 signals panel, member-search, FR-50 reconciliation queue) and the member's own profile screen.

**Status payload shape:**
```
{
  member_id,
  evaluated_at,
  rule_registry_version,
  is_valid: bool,                  // covered for support if death today
  is_active: bool,                 // valid AND past lock-in AND not suspended
  lock_in_status: {
    days_at_join, unlock_date,
    state: "in_lockin" | "past_lockin",
  },
  vyawastha_shulk_status: {
    paid_through, days_until_lapse,
  },
  contribution_history: {
    total_contributions, missed_count_lifetime,
    rolling_year_skips, R7_subclause_state, R8_subclause_state,
  },
  medical_disclosure: {
    declared_illnesses[], last_disclosure_at,
    pending_concealment_flag: bool,    // surfaced only to State Trustee scope
  },
  retirement_coverage: {
    is_retired, years_of_coverage_earned, coverage_through,
  },
  special_flags[],                   // e.g., "suspended_per_R7E", "under_medical_pause_R5C"
  applicable_niyamavali_clauses[],   // each evaluated rule with version + outcome
}
```

**Consequences (testable):**
- Admin member-search (any scope) calls FR-12A and renders the result; admin scope determines which fields are visible (e.g., `pending_concealment_flag` is State-Trustee+).
- The Trustee-Lite signals panel (FR-42) is a presentation layer over FR-12A — same service, different surface.
- The member's own profile screen calls FR-12A for self-visibility and renders the same status (minus internal flags like `pending_concealment_flag`). The member's mental model: "I can always see my own status — no need to ask anyone."
- Service is **deterministic** — given the same `member_id` and same `rule_registry_version`, the output is reproducible. Replayable for audit.
- Service is **idempotent** and **audit-logged** (FR-47); each call writes `{actor_id, member_id, evaluated_at, outcome_digest, rule_registry_version}`. Audit logs admin-side calls; member-side self-calls are not logged (privacy + volume).
- Service evaluates Niyamavali rules **verbatim from the registry** — no hardcoded logic. Adding a new rule to the registry must require zero code change to the service.
- Service surface is consistent across admin and member apps (same payload shape; different rendering per scope).

**Feature-specific NFRs:**
- p95 latency < 200 ms per evaluation against a fully-populated registry on Bihar's expected steady-state scale (~4L active members).
- **Cache freshness invariant:** validity status reflects any Niyamavali amendment or member-state change within at most 60 seconds. Implementation may **optimize invalidation scope provided the freshness invariant remains satisfied** (see architecture §1.10); architecture commits the correctness invariants — including a conservative all-members fallback when scope confidence is insufficient.
- The service is the API surface of one of the three uncompromisable subsystems (see §9.1) — bugs are P0.

**Feature-specific NFRs (for the Niyamavali section overall):**
- Audit log retention 7 years (FR-47).
- Rule changes lawyer-reviewable before publish — out of scope for v1 software (operational gate).

**Notes:** `[NOTE FOR PM]` R7 re-tuning around the lock-in ramp is the single biggest Niyamavali tension. Trustee Panel must own this. Consider running a member-visible "Niyamavali consultation" survey ahead of each graduation.

### 4.3 Pool Engine (the math core)

The math heart of the product. On trustee approval of N claims for a cycle, the engine **auto-spawns N pools**, names them from a curated culture-rooted list (Mahabharata seed + extensions), and **deterministically assigns** every active member to exactly one pool via `hash(member_id + cycle_id) mod N`. Fixed per-pool amount (₹310–400) is trustee-set on 90-day notice, loaded from config. Wrong-pool contributions: rejected, never refunded. Under-funded cycles deliver actual collection — no top-up. Engine is parameterized so future *daan* categories (Kanyadan, Jivandan, Retirementdaan) reuse it without modification. Realizes UJ-2.

#### FR-13: Auto-spawn N pools per cycle (SC-18)

At cycle freeze (trustee bulk-approval action — see FR-49), the engine creates one pool per approved claim. N is determined at freeze and immutable thereafter for that cycle.

**Consequences (testable):**
- Pool object: `{pool_id, alert_id, claim_id, nominee_bank_accounts[2], display_name, letter_code, fixed_amount, spawn_timestamp}`.
- Pool `display_name` drawn from a **trustee-curated, ordered list of culture-rooted names**. **Seed set:** Mahabharata characters (Arjuna, Bhishma, Karna, Yudhishthira, …). List is open and extended with other resonant names (Ramayana, classical Indian poets/scholars/reformers, Bihar-regional figures, per-Pariwar curation for future tenants). No single-source requirement.
- When N exceeds available names, system falls back to letter-suffixed extensions (e.g., "Pool Arjuna-2"); curated list should be maintained at ≥ 2× expected steady-state N. `[ASSUMPTION: ≥ 30 curated names pre-launch; per-Pariwar curation supported. See OQ-12.]`
- Letter codes (A, B, C…) assigned in parallel to the name for backward compatibility with TSCT and for audit-log brevity.

#### FR-14: Deterministic balanced member-to-pool assignment

`pool_index = hash(member_id + cycle_id) % N`. Every active member is assigned to exactly one pool for the cycle. Audit-reproducible from `(member_id, cycle_id)` alone.

**Consequences (testable):**
- For any (member_id, cycle_id, N), the assignment is deterministic and reproducible.
- Across a large active membership, pool sizes differ by no more than `ceil(M/N) − floor(M/N)`.
- Visible to the member as their **My Pool** card (FR-21).

#### FR-15: Fixed-amount per pool on 90-day notice (SC-17, §23.3)

Trustee sets the per-pool fixed amount; changes announced at least 90 days in advance. There is no mandatory minimum period for which an amount must stand (Decision `2026-08-16-124` clause 7).

**Consequences (testable):**
- Amount is a Pariwar-scoped configuration with `effective_from` / `effective_to`.
- A change action requires a future `effective_from` ≥ now + 90 days, except for explicitly-flagged emergency adjustments which require multi-trustee approval and are audit-logged with the override reason. An emergency adjustment's `effective_from` may not precede the amount currently in force.
- Each pool's `fixed_amount` is snapshotted at spawn time.

#### FR-16: Pool-bound payment enforcement (Pool-Sys #2)

UPI Intent pre-fills the assigned pool's nominee VPA. Member paying to a non-assigned pool's VPA is reconciled as **wrong-pool / invalid**; no refund. The pre-filled VPA is the assigned pool's nominee-account VPA collected at claim-time (FR-37 / Story 8.13); when absent, UPI Intent is unavailable (first-class fail-soft) — never a fabricated or `undefined` VPA.

**Consequences (testable):**
- The UTR matcher (FR-28) flags wrong-pool deposits; member sees "wrong-pool, contact helpdesk."
- Helpdesk has a manual "facilitated recovery" path (per "Trust as mediator, not enforcer" posture) — never enforced.

#### FR-17: Idempotent payment reference (UPI-Track #4)

UPI Intent constructs a `tr=` (transaction reference) unique to `(member_id, alert_id)`. Repeated payments under the same `tr=` are treated idempotently (one valid contribution).

#### FR-18: Amount-lock at UPI Intent (OverPay #5)

UPI Intent pre-fills amount; member cannot edit on the UPI app side in most apps (per UPI app behavior). Where editable, reconciliation rejects any amount ≠ fixed_amount.

**Consequences (testable):**
- Over-payments are detected by the matcher; member is informed; over-payment recovery is the **facilitated** path (FR-30), not enforced.

#### FR-19: Under-funded cycle behavior + close-of-cycle messaging (Pool-Reality #1, #2)

**Pool-Reality #1 — actual delivery, no top-up.** If collection < target, nominee receives actual. No top-up from trust reserves.

**Pool-Reality #2 — close-of-cycle celebration messaging (v1-M).** Cycle-close comms celebrate the *actual outcome*; do not dwell on shortfall against target. Approved framing: "Because [N] members contributed, the family of [member name] received ₹[X]." Rejected: "₹[Y] short of target," "[%] collection," "underfunded," "below expected." Brand-voice rule (FR-69) anchored in trust posture — under-collection is the math reality of mutual aid, not moral failure.

**Consequences (testable):**
- A trustee policy threshold (e.g., <70% for 2+ cycles) triggers an **outreach campaign** — *not* a per-pool amount hike. Threshold is a Niyamavali clause; see SM-C4 counter-metric.
- Close-of-cycle copy is template-driven, with the celebration framing mandatory for cycles where collection rate is < 100%. Templates are reviewed by trust comms / tone-guide owner.
- Public Sahyog Vivran (FR-77) reflects actual amount delivered; comparison to target is not displayed.

#### FR-20: Engine parameterized for future _daan reuse (SC-13)

The pool engine's interfaces (spawn, assign, settle) do not assume "death support" semantics. Each pool carries a `support_category` discriminator. v1 ships exactly one category (`death_support`). v2/v3 categories (Kanyadan, Jivandan, Retirementdaan) reuse the engine.

**Consequences (testable):**
- Engine code has no `if category == 'death'` branches; behavior is category-config driven.
- Adding a new category in v2 requires registry config + UX surfaces; not engine changes.

**Feature-specific NFRs:**
- Pool spawn for a cycle of N=50 claims and M=4L members completes in < 60 s p95.
- Assignment determinism is verifiable by replay — `hash(member_id + cycle_id)` is stable across releases.

**Notes:** `[NOTE FOR PM]` Pool Engine correctness is named in the brief as one of three uncompromisable subsystems. Property-based testing recommended.

### 4.4 Alert Lifecycle & Monthly Cycle

Driven by an `alert` state machine: `draft → frozen → published → live → closed → settled`. A single canonical `alert` object renders across all channels (in-app push, WhatsApp, Telegram mirror) — same payload, channel-appropriate rendering. The **15-day contribution window** (vs TSCT's 10) reduces missed-contribution churn. **"My Pool"** is the primary member-facing surface during a live alert. Realizes UJ-2, UJ-8.

#### FR-21: "My Pool" home-screen card (WI-31)

When an alert is `live` and the member is assigned to a pool, the home screen's top element is a card showing: pool name, nominee first-name + last-initial, contribution amount, days remaining, primary CTA (Pay via UPI).

**Consequences (testable):**
- Card replaces lock-in widget (FR-3) on transition out of lock-in.
- Card persists until member's contribution is `confirmed` or alert `closed`.

#### FR-22: Alert state machine

States: `draft → frozen → published → live → closed → settled`. Transitions are role-gated, audit-logged.

**Consequences (testable):**
- `draft → frozen`: trustee bulk-approves N claims; engine spawns N pools (FR-13).
- `frozen → published`: announcement copy finalized; multi-channel render triggered.
- `published → live`: alert open date (Day 0).
- `live → closed`: hard close at Day 15.
- `closed → settled`: reconciliation complete; contributor list final; nominee payout confirmed; In Memoriam + Sahyog Vivran pages published.

#### FR-23: Structured `alert` object → multi-channel render (WI-37)

One source-of-truth payload renders across in-app push, WhatsApp Business, Telegram mirror. SMS dropped from v1.

**Consequences (testable):**
- Render templates are channel-specific but data is shared.
- Telegram mirror is fire-and-forget; deliverability is not gated on Telegram availability.
- WhatsApp Business send is admin-toggleable per Pariwar — i.e., can be turned off if budget/quota constrains.

#### FR-24: Real-time per-pool live contributor list (member-facing)

During a live alert, members can browse a per-pool real-time list of who has contributed (first-name + last-initial). No PII.

**Consequences (testable):**
- List updates with reconciliation confirmation (not on UTR self-attestation alone — prevents false positives during mismatch states).
- Public (non-logged-in) version of the list is also rendered on the Sahyog Vivran page (FR-77).

#### FR-25: Pending contributors per pool `[v1-S]`

For members to see who in their pool has *not yet* contributed — a peer-accountability signal. Privacy-considered; member-only.

**Notes:** `[NOTE FOR PM]` Pending list may cause social pressure that's productive but could feel coercive. Pilot carefully.

#### FR-26: Real-time progress meter + personal deadline countdown `[v1-S]`

Per-pool progress meter (no public donation framing, no shortfall narrative — celebrate actual). Personal countdown widget on home screen during live alert.

### 4.5 Payment, UTR Self-Attestation & Reconciliation

UPI Intent is the only payment rail member → nominee. No payment gateway anywhere in the support-pool flow. Member self-attests UTR post-payment; nominee (via shepherd) pushes a daily bank statement; a cron-driven matcher reconciles attested UTRs against statement entries. Screenshot upload is **forced-required only on UTR mismatch**. This is v1's highest operational-risk surface; matcher mechanism is OQ-2. Realizes UJ-2, UJ-9.

**Friction-as-resource (named principle).** Friction is a *budgeted resource*, not a thing to minimize globally. Happy path is friction-free (UPI Intent + UTR self-attest, no screenshot). Friction is introduced only where it earns its place: screenshot on UTR mismatch (FR-32); manual KYC fallback when DigiLocker is down (FR-2); manual eHRMS entry (FR-1); facilitated (not enforced) over-payment recovery (FR-36); under-funded cycle delivers actual with no top-up (FR-19). When adding a new friction surface elsewhere in §4, name what friction is being budgeted *for*.

#### FR-27: UPI Intent payment flow (UPI-Track #1)

Member tap → UPI Intent launched with VPA, amount, and `tr=` pre-filled. Member completes in their UPI app. Returns to TWT. When the assigned pool's nominee VPA is not collected (FR-37 / Story 8.13), the Intent is unavailable (fail-soft "not available yet — Get help") and the FR-28 UTR self-attest path still supports out-of-band payment.

**Consequences (testable):**
- Pre-fill includes `pa=` (VPA), `am=` (amount), `cu=INR`, `tr=` (unique per member × alert), `tn=` (transaction note: "Pool Karna — Sahyog Alert #78"), `mc=` (optional).
- Per-app guidance shown when the user's installed UPI apps are detected (BHIM, PhonePe, GPay, Paytm).

#### FR-28: UTR self-attestation post-payment

After returning from the UPI app, the member is prompted to paste the UTR.

**Consequences (testable):**
- UTR field accepts 12-digit numeric (typical) and 22-char alphanumeric (NEFT/RTGS fallback if used).
- Format validation runs client-side; final acceptance gated on matcher.
- Status reflects: `submitted → pending_match → confirmed | mismatch`.

#### FR-29: Nominee-pushed daily bank statement intake (UPI-Track #5)

Trust receives the nominee's bank statement daily (mechanism TBD — see OQ-2). Statement entries are parsed; deposits are loaded into the matcher queue.

**Consequences (testable):**
- Bank statement intake supports at least PDF and CSV.
- Parsed deposits expose: `{datetime, amount, sender_name, sender_VPA?, UTR, narration}`.
- `[ASSUMPTION: Daily push is operational; nominee-shepherd assists. Account Aggregator integration deferred to v3.]`

#### FR-30: UTR matching engine (reconciliation cron)

Cron job runs N times per day (frequency configurable; v1 default 6×/day during live alerts). Matches member-attested UTRs against statement deposits.

**Consequences (testable):**
- Match criteria: UTR equality on both sides → confirmed.
- Match by amount + sender VPA + timestamp tolerance is a secondary path (when UTRs don't reach the statement).
- Failure path: 48h after self-attestation without match → status flips to `mismatch`; member notified; **screenshot upload becomes mandatory** (FR-32).

#### FR-31: Dual nominee bank accounts (donor choice — equal payment destinations)

> **Re-scoped 2026-07-27 (BigDev, Story 9.9).** The earlier "RBI UPI per-payee daily limit workaround" framing is superseded — there is no v1 requirement to route on a regulatory receiving cap. The two accounts are **equal** payment destinations; the donor picks which to pay.

Every approved claim records two nominee bank accounts at claim-time. Members can pay to **either** — both are equal, with no primary/secondary/default account and no server-side routing. Each account may carry an **optional** UPI VPA (FR-37 / Story 8.13) — the `pa=` destination for member→nominee contributions; the "choose the other account" affordance (below) is enabled only when ≥ 2 accounts carry a VPA.

**Consequences (testable):**
- UPI Intent (FR-27) presents both accounts as an equal choice by bank name (Story 9.9) — no preselected/"primary" account; the donor's selection determines the account, never a server default.
- Reconciliation matches against both accounts' statements.
- Approval workflow refuses to advance a claim to `frozen` unless both accounts have valid IFSC + verified account-holder name match the declared nominee.

#### FR-32: Screenshot upload as forced fallback on UTR mismatch

Screenshot upload is hidden in the happy path. Becomes **mandatory** only when (a) UTR mismatch flagged, or (b) member explicitly chooses it (e.g., NEFT fallback).

**Consequences (testable):**
- Upload UI is hidden under "Trouble with UTR?" in the happy path.
- On `mismatch` status, the screen prompts the upload directly.
- Trustee review queue (FR-50) processes uploaded screenshots; manual confirm.

#### FR-33: Contribution Note PDF (WI-30 — legal positioning)

After a contribution is `confirmed`, the system generates a PDF artifact called **"Contribution Note"** — never "receipt" or "invoice."

**Consequences (testable):**
- PDF includes: member name, contribution date, pool name, alert ID, amount, nominee acknowledgement note ("Family of [Member name]"), Niyamavali version reference, watermark with donor ID embedded for traceability (`[v1-S]`).
- PDF copy is reviewed by trust legal; no language permitted that could be read as a financial-services receipt.

#### FR-34: UPI failure coach with per-app guidance `[v1-S]`

If the UPI Intent returns without a UTR (failure, cancel, etc.), the app shows per-app guidance (PhonePe, GPay, Paytm screenshot examples).

#### FR-35: Retry queue with 4-hour reminders (WI-34) `[v1-S]`

Members with `pending_match` after 4 hours get a soft reminder; after 24 hours, escalated.

#### FR-36: Over-payment self-report + auto-drafted polite recovery `[v1-S]`

Trust facilitates recovery; never enforces. Auto-drafts a polite note from the trust to the nominee asking for return of the excess; member-side flows surface the over-payment.

**Feature-specific NFRs:**
- Reconciliation latency p95 < 4 hours from statement intake to member status update during live alerts.
- Matcher must be idempotent — replayable without producing false confirmations.
- For a cycle of M=4L members and N=20 pools (~16k transactions per pool), matcher throughput supports full reconciliation within the 15-day window with 4-hour latency budgets honored.

**Notes:** `[NOTE FOR PM]` This entire feature is the highest-risk operational surface in v1. The matcher mechanism is **OQ-2**. Manual-fallback discipline (screenshot only on mismatch) is the design principle; do not erode it for "convenience."

### 4.6 Claim Flow, Peer Verification & Ground Inspection

A claim begins when a nominee (often the bereaved family member, possibly not a TWT member) files for support. **Nominee bank/IFSC is entered at claim-time, not at member signup.** Both **peer verification mesh** (5 nearest members) **and ground inspection** are required — not either/or. A **human shepherd** (typically a District Admin) is assigned per claim to guide the family. The Trustee-Lite signals panel surfaces context to admin reviewers in ~5 seconds. Realizes UJ-3, UJ-4.

#### FR-37: Claim filing with nominee bank entered at claim-time

Claim filing is open to the nominee (regardless of TWT membership). Nominee enters bank account #1, IFSC #1, account holder name #1; bank account #2, IFSC #2, account holder name #2 (two equal payment destinations per FR-31); optionally a UPI VPA per account (the `pa=` destination for member→nominee contributions per FR-16/FR-27). Death certificate uploaded.

**Consequences (testable):**
- Nominee VPA is **optional** per account and format-validated (`handle@psp`); its absence is a first-class state and does **not** block `frozen` (unlike IFSC + holder-name). Added by Story 8.13 (correct-course 2026-07-21).
- Nominee identity does not require KYC (matches bank norms, R5(E) compatibility).
- Account holder name fields are validated against bank IFSC lookup (penny-drop verification deferred to v1-S).
- Claim enters `under_verification` state on submit.

#### FR-38: Death certificate upload + OCR parity check (Verify-Mesh #2)

OCR runs against the uploaded certificate; deceased name and DoB compared to the member's TWT profile.

**Consequences (testable):**
- Mismatch → flagged for trustee manual review; not auto-rejected.
- Match → proceeds to peer-mesh auto-ping.

#### FR-39: Peer first-witness verification — 5 nearest members (Verify-Mesh #1)

Auto-ping the 5 nearest active members (by district + school proximity) to confirm or report concerns about the death.

**Consequences (testable):**
- Selection algorithm is deterministic: district match > block match > school match; ties broken by `member_id` order.
- Each ping is logged. Each verifier's response is logged. Verifier names are published with profile links on the Sahyog Vivran page (FR-77).
- Verifier non-response after 72 hours → escalate to block admin.

#### FR-40: Ground inspection retained alongside peer mesh

A block-/district-level admin schedules a physical visit. Confirms facts on the ground (visit notes, photo of family, school principal letter optional).

**Consequences (testable):**
- Ground inspection workflow is a separate state in the claim lifecycle — both peer mesh confirm AND ground confirm must be `pass` for the claim to advance to State Trustee approval.

#### FR-41: Human shepherd assigned per claim (WI-26) `[v1-M]`

On every claim entering `under_verification`, the trust assigns a named human shepherd (typically a District Admin in the deceased's scope). Shepherd contact (name + phone + WhatsApp) surfaces on the claim status page and in the claim-filing confirmation.

**Consequences (testable):**
- A claim cannot advance to peer-mesh / ground-inspection workflows without a shepherd assigned.
- Shepherd identity is logged on the claim object and is visible to the family + downstream admin actors.
- Reassignment is supported (shepherd unavailable, scope-mismatch correction); reassignment is audit-logged.
- Self-assignment is prohibited (an admin cannot shepherd a claim where they are the verifier or where the deceased is in their direct scope-conflict — same-school edge case).
- v1-S follow-on: shepherd inbox / dashboard view, shepherd-load balancing, shepherd-handoff UI. v1-M ships the assignment + surfacing; supporting tooling is v1-S.

#### FR-42: Member status banner on claim review (WI-39)

When an admin opens a claim, the **Trustee-Lite signals panel** shows in ~5 seconds: KYC validity, Vyawastha Shulk status, contribution history (count + 90% rule status), last login, attribution chain (which field worker brought them, when), claim history if any, lock-in status, special-rule flags (suicide, mid-contribution death).

**Consequences (testable):**
- All signals load from one indexed query; no N+1.
- "Approve" / "Reject" / "Escalate to State Trustee" actions present with confirmation modal that requires a brief reason text (audit-logged).

#### FR-43: Special-case routing per Niyamavali R9

Suicide / murder-with-nominee-accused / multiple-deaths-same-date / foreign-death → routed to State Trustee voting workflow (not block-/district-resolved).

**Consequences (testable):**
- Routing logic is rule-engine-driven (FR-7), not hardcoded.
- Voting workflow logs each vote with rationale; majority required per R9.

#### FR-43A: Internal claim-denial appeal flow (v1-M)

When a claim is denied (R7/R8 failure, R9 special-case exclusion, R11 concealment, R14 forgery, or trustee discretion), the nominee/claim-filer accesses a structured internal appeal flow.

**Consequences (testable):**
- Every denial action is accompanied by a structured `denial_reason` (Niyamavali clause + free-text rationale, recorded in audit log per FR-47).
- Denial notification surfaces the appeal CTA + the named human shepherd's contact (FR-41) + the appeal SLA (e.g., 30 days to respond per stage).
- Appeal stages:
  1. **Stage 1 — District Admin review.** Reviewer must be a different individual from the original decision-maker. May uphold, request additional evidence, or escalate.
  2. **Stage 2 — State Trustee panel vote.** ≥ 2 trustees per the panel; majority-rules per R9 framework. May uphold, reverse, or partially uphold (e.g., approve under 75/25 multi-nominee split when original denial was for nominee-identity dispute).
  3. **Stage 3 — Trustee discretion (R5(D), R10(D)).** Final internal outcome. Not appealable inside the system.
- Each stage's decision + rationale + reviewer identity are public on Sahyog Vivran (FR-77) if the appeal results in the claim being approved post-appeal — social accountability for the reversal. Denials remain visible only to the family + audit trail (PII shielding per FR-74).
- The appeal flow is intentionally separate from R9 special-case voting (FR-43) — R9 is *pre-decision* trustee voting for ambiguous claims; FR-43A is *post-decision* appeal of a denial.
- No formal time limit on the family's right to appeal — grief-aware. But each stage has a trust-side SLA so a stalled appeal doesn't sit indefinitely.

**Why this exists:** Indian courts routinely set aside ouster-of-jurisdiction clauses, and TWT's *mandatory* ₹110 fee creates contract-law consideration. Internal appeal is the practical alternative to "no judicial challenge permitted" — gives members a real grievance channel so few cases reach court.

**Out of Scope (v1):**
- Foreign-death (consular attestation) — deferred to v2.
- Full workflow-builder Kanban — deferred to v2; v1 ships Trustee-Lite list + signals.
- Grief-aware claim UX hardening — deferred to v3 (WI-25).

**Notes:** `[NOTE FOR PM]` "Peer verification AND ground inspection — both, not either" is an explicit policy correction. Do not allow product or eng to silently treat ground inspection as optional after peer confirm.

### 4.7 Admin UI — RBAC, Audit, News/Blog, Bulk Ops, Helpdesk

The densest theme. Replaces today's WhatsApp/Telegram operational chaos with: flexible RBAC (permission keys + role bundles + scope dimensions), immutable 7-year audit log, dual-surface News/Blog with scheduled-publish + audience-scoped messaging, bulk operations everywhere, helpdesk/ticket system, field-worker dispatch, per-Pariwar custom fields via JSON columns. Realizes UJ-4, UJ-6, UJ-7.

#### FR-44: Flexible RBAC — permission keys + role bundles (ADM-1)

A permission key model: every admin action has a permission key. Roles are bundles of permission keys. Members are granted roles with scopes.

**Consequences (testable):**
- Permission keys are enumerated and versioned in a config (e.g., `claim.approve`, `member.suspend`, `pariwar.amend_rule`).
- Role bundles editable in admin UI.
- A permission check is `has_permission(user, permission_key, target)` where `target` carries scope dimensions.

#### FR-45: Scope dimension on every grant (ADM-2)

Every role grant carries a scope: `block | district | state | pariwar | global`.

**Consequences (testable):**
- Anita (District Admin, scope=Patna) can approve claims for Patna members; cannot approve claims for Vaishali.
- Scope is enforced server-side on every privileged endpoint.

#### FR-46: 12 default seeded roles, editable (ADM-3)

Default role set installed per Pariwar at provisioning: Super Admin, Pariwar Admin, State Trustee, District Admin, Block Admin, Finance Officer, IT Cell, Media/Comms, Field Worker, Verifier, Auditor, Helpline Operator. Each editable. *[ASSUMPTION: 12-role set derived from TSCT structure; Trustee Panel to confirm or revise before launch — see OQ-3.]*

#### FR-47: Audit log — attributable, tamper-evident, 7-year retention (ADM-5)

Every privileged action writes an audit line: `{timestamp, actor_id, action_key, target_id, target_kind, scope, before_value?, after_value?, rationale_text?, ip_hash, session_id, prev_hash, this_hash}`.

**Consequences (testable):**
- Audit log is append-only at the application layer; no `update` or `delete` endpoint exposed in code.
- **Tamper-evident hash chain:** each entry's `this_hash = sha256(prev_hash + canonical_serialization(this_entry))`. A tampered intermediate row breaks every subsequent hash check. Daily integrity check job verifies the chain end-to-end.
- **Off-site mirror:** the audit log is replicated (append-only) to an out-of-application storage tier (e.g., S3 + Object Lock, or equivalent regulator-acceptable WORM-grade store) every 6 hours. The mirror is the canonical reference when a tamper claim arises; the production DB is the operational copy.
- **External attestation (v1-S):** daily Merkle-root publication of the audit chain to a separate trustee-controlled channel (e.g., signed Telegram-mirror post) so external observers can verify integrity. Tagged `[v1-S]` because v1-M operational discipline (hash chain + off-site mirror) is the load-bearing piece; external attestation is hardening.
- Retention 7 years; archive policy after 7 years (DPDPA-aware).
- Exportable for investigation under role `Auditor`. Export includes the chain so external verification is possible.
- **Single DB-access engineer cannot silently tamper:** any rewrite of the production DB breaks the off-site mirror's chain; integrity check catches within 24h. This addresses the bus-factor-of-one risk on audit-log integrity (see §9.1.1).

#### FR-48: Permission delegation with date range + audit (ADM-4) `[v1-S]`

A trustee can delegate a permission to another user for a date range. Delegation is audit-logged. Revocable.

#### FR-49: Bulk operations everywhere (ADM-11)

Member upload (CSV with field mapping), message send, status change, module activation, claim approval-at-freeze, contribution status review.

**Consequences (testable):**
- Bulk actions support **dry-run preview** — admin sees the per-item proposed outcome before commit; cancel without side effects.
- Each bulk action emits **one audit line per item** with a shared `batch_id` and the actor identity (FR-47).
- Bulk actions are **scope-respecting** (FR-45) — items outside the actor's RBAC scope are silently excluded from the preview with a count returned.
- Bulk size limit: 5,000 items per batch in v1 (configurable). Larger sets must be split.
- Failure handling: per-item failure does not roll back the batch; failures are reported in a downloadable error CSV.
- Bulk claim approval-at-freeze is gated on State Trustee role (cannot delegate scope-down).

#### FR-50: Reconciliation review queue (UTR mismatch triage)

Mismatch contributions (FR-30) land in a queue. Trustee reviews uploaded screenshot + statement entry; confirms or rejects.

**Consequences (testable):**
- Queue ordered by alert deadline proximity (closer to Day-15 = higher priority).
- Confirm → contribution status `confirmed`; reject → `invalid`, member notified.

#### FR-51: News/Blog — dual surface (public + member feed) (ADM-6, ADM-7, ADM-8, ADM-9)

Authoring workflow `draft → review → publish`. Audience scoping per post: `public | members-all | state | role | cohort`. Scheduled publishing. Push channel selection per post (in-app push, WhatsApp, Telegram mirror).

**Consequences (testable):**
- A "public + members" post renders on the public blog AND in member feeds.
- A "state=Bihar" post is visible only to members where `state=Bihar`; non-Bihar members do not see it in feeds; bots and unauth visitors do not see it on public surfaces.
- **Workflow:** `draft` editable by author; `review` advances to `publish` only via a reviewer different from the author; `publish` triggers channel dispatch + audience-scoped rendering. Each transition audit-logged.
- **Scheduled publishing:** posts queued with a future `publish_at`; system fires at the scheduled time with the same audit semantics.
- **Push-channel selection per post:** opt-in per channel (`in_app_push`, `whatsapp`, `telegram_mirror`). Unselected channels do not receive the post.
- Comments disabled by default (ADM-10) — avoid drama in gravitas context. Config flag exists for v2+.
- Hindi + English required for `public` and `members-all` scoping; Hindi-only acceptable for `state=Bihar`.

#### FR-52: Helpdesk / ticket system (ADM-15)

Members open tickets; tickets are scoped/routed to admin roles by category and scope. Replaces WhatsApp chaos.

**Consequences (testable):**
- Ticket categories enumerated (v1): KYC trouble, payment-failed, UTR-mismatch, claim-status, profile-update, Niyamavali-question, partner-module-issue, complaint, other.
- Auto-routing: category × scope (member's district / Pariwar) → primary assignee role; falls back through escalation chain on SLA breach.
- v1 SLA targets: first-response 24h; resolution 5 business days for non-Niyamavali categories, 10 business days for Niyamavali questions (which may need trustee referral).
- Per-ticket: status (`open | in_progress | awaiting_member | resolved | reopened`), category, scope, primary assignee, audit log.
- Member-facing UI shows their tickets + status; admin-facing UI is the ticket queue scoped to the assignee's role + scope.
- Auto-close on `resolved` after 7 days of no member reply; member can reopen via in-app within 30 days post-close.
- Helpdesk staff scope: `Helpline Operator` role per FR-46.

#### FR-53: Field-worker dispatch (mobile-first) (ADM-16)

Field workers have a mobile-first admin app (separate from member app). Surfaces their attribution code, attributed members and qualification state, commission pipeline.

**Consequences (testable):**
- Mobile-first UI optimized for mid-range Android (Snapdragon 4-series; 3 GB RAM); offline-capable for view (cached attribution list); writes require network.
- Field worker sees only **their own** attribution code (FR-81) and **their own** attributed members + qualification states (no cross-FW data leakage; RBAC scope = `field_worker_self`).
- Commission pipeline view: current month qualified count + ₹ projected, last month paid (with transaction reference), pending qualification count.
- Push notification when a previously-attributed member crosses a qualification step (KYC done; ₹110 paid; first contribution made).
- Field worker can flag a member account as "this person is no longer reachable" — admin-side action: investigate / disable attribution from this worker.
- Audit log records each field worker session + attribution-related action.

#### FR-54: Custom fields per Pariwar via JSON columns (ADM-17)

Per-Pariwar custom fields on member, claim, pool — stored in JSON columns. Variation without schema migrations.

#### FR-55: Trustee fixed-amount setter + announcement workflow

The ₹400 → ₹430 mechanism (UJ-6). Effective date ≥ now + 90 days (FR-15). Drafts the announcement copy; selects channels; schedules publish.

#### FR-56: Member moderation — suspend, terminate, restore

State transitions: `active ↔ suspended → terminated`. Restoration paths are governed by Niyamavali (R7, R14).

**Consequences (testable):**
- Suspension reasons supported (audit-logged with rationale): R7-sub-clause violation, R14 forgery, R10(A) parallel-org office-bearing disqualification (declared via Life Events update or trustee discovery), concealment-flag confirmed by State Trustee (FR-11), helpdesk-escalated abuse.
- A suspended member can be restored on either rule-clearance (e.g., R7(A) restoration via 3 consecutive contributions) or trustee discretion (R5(D), R10(D)).
- Termination is recoverable only via trustee-explicit reinstatement; rejoin under same identity blocked for 12 months (FR-6).

**Amended 2026-08-04 (Sprint Change Proposal — moderation model).**

**Suspension preserves the obligation to contribute.** A suspension removes a member's entitlement to *receive* support, not their obligation to *contribute* while completing an available restoration path. Suspended members remain on the donor roster; only termination removes them. (Niyamavali §3.3 — a member under discipline remains a member and may continue to contribute; the restoration path requires ongoing contribution, so removing them from the roster makes rule-clearance restoration unreachable.)

**Contributions during suspension do not create entitlement.** Disclosed on the payment surface itself, not in a status panel: contributions made during suspension restore standing but do not create beneficiary entitlement for deaths occurring during the suspension period. This applies equally to a member serving a restoration-discipline lock-in.

**Termination is an exceptional governance act, not a stronger suspension.** It carries its own threshold, its own reasoning and its own record. Grounds, principles and the record model are governed by Niyamavali Part 8 as amended — including the suspension-vs-termination comparison at §8.4a. Termination ends authenticated member access; statutory rights survive through an identity-verified administrative process (see FR-95/FR-96).

**Termination requires a two-part escalation justification.** The decision-maker must record BOTH (a) why suspension is inadequate to the case — what it would fail to protect, what risk would persist through it, or why the restoration path it preserves is unavailable or futile — AND (b) why termination is proportionate. Part (a) is not satisfied by asserting the seriousness of the ground.

**Consequences (testable):**
- Grounds for termination are enumerated separately from grounds for suspension; the two sets are not interchangeable.
- No termination is recordable without a two-part escalation justification whose parts are separately answerable and not pre-fillable from one another.
- Moderation carries a member-facing appeal route distinct from the claim-denial appeal flow (Niyamavali Part 9 is claim-scoped and Part 8 does not reference it).
- Violator detection surfaces candidates for trustee action but never recommends a sanction (FR-57).

#### FR-57: Trustee-Lite list + signals (v1 alternative to full Kanban)

Pragmatic v1 claim board: a list view sorted by stage and deadline + the FR-42 signals panel on hover/tap. Full Kanban deferred to v2.

**Violator flags are detection only (added 2026-08-04).** The list surfaces members in R7 violation so a trustee can act — the system detects and presents; the trustee decides and acts. A violator flag **never recommends a sanction**: no proposed action, no `recommended_action`-shaped field, no severity ranking, no pre-selected action in a downstream moderation form, no verbs of advice in its copy. Permitted content is the clause in violation, the facts establishing it, and the date from which it has held. A flag that recommends is a soft auto-suspend — it relocates the decision from the trustee to the detector while preserving the appearance of a human gate, which the standing no-auto-suspend prohibitions forbid.

#### FR-58: Survey/poll authoring + results dashboard `[v1-S]`

Author surveys with optional quorum threshold; render in member feed; aggregate results.

#### FR-58A: Reports & exports library (ADM-12)

Pre-built reports + ad-hoc export tools for trustees and staff. Reports: monthly contribution-rate by district/Pariwar; under-collection trigger watch; new-member funnel by attribution source; reconciliation queue throughput; claim cycle-time analytics; field-worker payout summary; helpdesk ticket SLA; audit log query (Auditor only).

**Consequences (testable):**
- Reports are role-scoped (FR-44/45): a District Admin sees their district's slice; an Auditor sees the full audit log.
- Exports are scope-respecting (no cross-scope leakage); each export operation writes one audit log line (FR-47).
- CSV + JSON export formats supported. Excel/PDF deferred to `[v1-S]` polish.
- Exports above a configurable size threshold queue for async generation and notify via in-app push when ready.

#### FR-58B: Banner / popup manager (ADM-13)

Trustee or Media/Comms publishes a scope/cohort-targeted in-app banner or full-screen popup (one at a time per surface). Uses: maintenance notices, fixed-amount-change announcements, mass-event comms, urgent helpdesk redirects, lock-in graduation announcements.

**Consequences (testable):**
- Banner copy supports Hindi + English variants (FR-68).
- Banner has explicit `valid_from` / `valid_until`; auto-archives.
- Popup has a dismiss action (no member trapped by an undismissable surface) and a configurable display-once-per-member rule.
- Audit-logged (publish, edit, retract).

#### FR-58C: Feature flags per cohort (ADM-14)

A per-cohort feature-flag mechanism allowing trustees and IT Cell to gate behaviors by `pariwar_id`, scope (block / district / state), role, or arbitrary cohort tag.

**Consequences (testable):**
- DigiLocker hard-mandatory switch (FR-2) is the canonical use case: feature flag flips from off → on per Pariwar.
- Flag changes audit-logged with actor + rationale.
- Flag evaluation is deterministic and fast (< 5 ms per evaluation), called by FR-12A and by client-side feature gates.
- No "secret" flags — flag inventory is visible to Pariwar Admin role and above.

**Feature-specific NFRs:**
- Admin UI usable on mid-range Android phones (≤ 720p) — most admin actions doable on mobile.
- Audit log writes do not block user-facing actions (async queue acceptable; ≤ 1 minute write delay budget).

**Notes:** `[NOTE FOR PM]` 12-default-roles list (OQ-3) and audit-log scope (which actions qualify) need a Trustee Panel decision before launch.

### 4.8 Multi-Pariwar Platform Architecture

v1 ships only Bihar (one Pariwar), but `pariwar_id` is first-class on every multi-tenant table from day 1. Branding (logos, colors, copy strings, app icon, store listing) is externalized to a per-Pariwar bundle. Build pipeline supports N apps from one codebase. Provisioning a second Pariwar in v1 is theoretically possible but not productized — requires direct engineering. 4-hour provisioning wizard activates with the second Pariwar (v2). Cross-Pariwar discovery is v3.

#### FR-59: `pariwar_id` first-class on every multi-tenant table

Schema discipline: every relevant table has a non-nullable `pariwar_id` FK; every query filters by `pariwar_id`; every API endpoint resolves `pariwar_id` from auth context.

**Consequences (testable):**
- A test verifies that any insert into a multi-tenant table without a `pariwar_id` raises at the DB layer.
- An adversarial test attempts cross-Pariwar reads with a different Pariwar's auth context and confirms zero leakage.

#### FR-60: Per-Pariwar branding config bundle

Logo, color tokens, copy strings (member salutation, support category names, footer text), Niyamavali ID, app icon, app name, app store metadata.

**Consequences (testable):**
- Bundle is a single file (or directory) loadable at build time per Pariwar.
- Two Pariwars can ship simultaneously with no shared production assets.

#### FR-61: Separate app per Pariwar — N build configs, N store listings

CI/CD produces N App Store / Play Store builds from one codebase. Each Pariwar has its own listing, signing key (or alias), and store presence.

**Consequences (testable):**
- A new Pariwar build is added by introducing a new branding bundle + CI matrix entry. Code does not change.

#### FR-62: GitHub → Dokploy auto-deploy (v1); Kubernetes migration path documented

Push to a release branch triggers Dokploy deploy of the relevant backend service. One backend, multi-Pariwar.

**v1 → v2+ migration note:** Dokploy fits v1 (single Pariwar, low-to-moderate traffic, solo-build simplicity). When deploy footprint expands (multiple Pariwars live in parallel; sustained high traffic at 4L+ members; blue-green / canary / multi-region needs), substrate **graduates to Kubernetes** (managed or self-hosted; choice deferred). Build-time discipline supports migration:

**Consequences (testable):**
- Backend services are packaged as container images (Docker) from day 1 — Dokploy consumes them; Kubernetes will too.
- Environment configuration is 12-factor compliant (env vars, no Dokploy-specific assumptions baked into application code).
- Branding bundles (FR-60) and per-Pariwar build configs (FR-61) are CI-driven, not Dokploy-driven — the same matrix builds work under K8s.
- Secrets management abstracted behind a provider interface so migration from Dokploy's secret store to K8s secrets (or an external secret manager) is a config change, not a code change.
- A documented migration runbook is owned by the Solo Builder; first checkpoint trigger: 2nd Pariwar provisioning OR sustained ≥ 70% peak-cycle infrastructure utilization on Dokploy. *[ASSUMPTION A-12: Kubernetes migration is forward-looking, not v1 scope; v1 ships on Dokploy.]*

**Out of Scope (v1):** Kubernetes manifests, Helm charts, service mesh, multi-cluster orchestration. Authored when migration trigger fires.

#### FR-63: Pariwar-Passport data model present (UI deferred to v2)

Cross-Pariwar identity object (`pariwar_passport_id`) exists in data; UI surfaces in v2.

**Out of Scope (v1):**
- 4-hour Pariwar provisioning wizard — v2.
- Cross-Pariwar discovery surface — v3.

**Feature-specific NFRs:**
- Multi-tenant isolation is one of the three uncompromisable subsystems (brief, §Constraints). Cross-tenant data leakage is treated as a P0 incident.

### 4.9 Module Marketplace

A pluggable module system targets users by scope (user / block / district / state / all) with a time-bombed lifecycle (`valid_until`, `slot_capacity`). First partners: HDFC home loan, LIC term plan, health-camp pilot. Commission revenue funds operations — teacher's annual cost stays at ₹110. Partner self-service portal and cross-Pariwar partner manifest are v2. **Crowdfunding Module is Phase 2/3** with its own posture (payment gateway, PAN, 80G, 10% trust cut) — also the platform's first regulated-flow stress test, validating that the multi-Pariwar architecture can absorb a gateway-mediated donor→trust→nominee flow without compromising the gateway-free support-pool flow.

#### FR-64: Module manifest schema + storage (Module-Mart #1)

A module is described by a manifest: `{module_id, title, description, eligibility_filter, scope_filter, valid_from, valid_until, slot_capacity?, target_url_or_form, partner_id, commission_terms (private)}`.

#### FR-65: Module shelf UI for members (Module-Mart #2)

Members see their eligible-modules shelf on the home screen below My Pool. Each shelf entry is a card → details → CTA (external partner URL or in-app form).

**Consequences (testable):**
- Filter applies: only modules where the member matches `eligibility_filter` and `scope_filter` and current time is in `[valid_from, valid_until]`.
- Slot capacity decrements on attribution; auto-archive when zero.

#### FR-66: Admin module-targeting wizard (Module-Mart #3)

Admin selects: which Pariwars (cross-Pariwar in v2), which scopes, which member filters (state, role, cohort), validity window, slot capacity, CTA destination, commission terms.

#### FR-67: Time-bombed lifecycle (TimeBomb #1)

Modules auto-archive at `valid_until` or `slot_capacity == 0`.

**Out of Scope (v1):**
- Partner self-service portal — v2.
- Cross-Pariwar partner manifest — v2.
- Crowdfunding Module (Ketto-style) — **Phase 2/3**. Different posture: payment gateway, PAN required for ≥ ₹2,000, 80G receipts, 10% trust cut. Public donor → Trust → nominee (NOT direct public-to-nominee).

**Notes:** First partner deal terms with HDFC and LIC — commission %, lead/conversion tracking, exclusivity clauses — are **OQ-4**.

### 4.10 Communication & Brand Voice

Communication is product, not decoration. Members are **participants in honorable mutual aid, not consumers of a service**. Hindi + English bilingual at launch. Warm-formal tone: "सम्मानित साथी / colleague," never "user/customer/donor." Tagline **"आज का सहयोग कल का सहारा"** appears on home screen, public footer, and Contribution Notes (FR-33). Growth-comms CTA: **"जोड़ते रहें"** (TSCT-inherited). A canonical `alert` renders across in-app push (primary), WhatsApp Business (admin-toggleable), Telegram mirror (TSCT-cohort honor). SMS dropped from v1. Realizes UJ-2, UJ-6, UJ-7.

#### FR-68: Bilingual content with i18n hooks

All member-facing strings: Hindi + English variants. Language switcher in profile. Default to Hindi for Bihar v1.

**Consequences (testable):**
- No hardcoded English strings in member-facing UI.
- Niyamavali content has separate Hindi/English versions; both versioned.

#### FR-69: Tone guide enforced via copy review (WI-29, Trust-Voice #1)

Every member-facing string passes copy review against the tone guide before merge.

**Consequences (testable):**
- Tone guide ships with the codebase; copy review is a checklist step in the doc-standards pass (§ Polish).
- Member address: **सम्मानित साथी** (Hindi) / **colleague** (English). Never "user," "customer," "donor."

#### FR-70: Multi-channel render from single alert object (WI-37)

See FR-23. One source-of-truth alert → in-app push + WhatsApp + Telegram mirror.

#### FR-71: In-app push notifications — primary delivery

Push tokens registered on app install; categories: alert-published, alert-deadline-reminder, contribution-confirmed, contribution-mismatch, claim-status-change, helpdesk-reply, module-new.

#### FR-72: WhatsApp Business API integration `[v1-S]`

Admin-toggleable; templates for alert announcements, deadline reminders, contribution confirmations.

#### FR-73: Telegram channel mirror `[v1-S, but locked]`

TSCT-cohort honor channel; fire-and-forget mirror of alerts.

**Out of Scope (v1):**
- **Bulk-alert SMS — dropped.** Killed because of TRAI bulk-DLT friction + per-SMS cost at 4L scale. **SMS preserved as:**
  - **Canonical OTP channel** via DLT-transactional (PE/OE) headers (architecture §2.2).
  - **Step-up OTP** for high-trust operations (nominee change, bank change, claim filing, trust-payout authorization, role grants, Niyamavali amendment, disaster-window declaration, etc.) — see architecture §2.2 for full list.
  - **Per-member transactional fallback** when both WhatsApp gates (Pariwar admin toggle + member opt-in) are ON and WA delivery fails (architecture §3.4).
  - **Pariwar-degraded-mode cycle-open bridge** when push delivery is degraded and WA admin-toggle is OFF (architecture §3.4).
- Vernacular video alerts (WI-16) — v2.
- TTS regional language read-aloud (WI-15) — v3.

### 4.11 Public Pages, Transparency & PII Shielding

Publishes what creates accountability (member contributions, verifier names); withholds what creates political risk (trust ledger, partner commissions, operational spend). The **Public-vs-Private matrix** is codified and enforced in code. Mobile, address, email, DOB are **never** public. Sahyog Vivran is the per-claim story page; Niyamavali is the rulebook with version diff. Realizes UJ-8.

#### FR-74: Public-vs-Private matrix codified (§35.1)

A single document and a single enforcement layer:

- **Public (no auth):** Member directory (first-name + last-initial + school + district + designation), Sahyog Drive listings (active + archive), Sahyog Vivran (per-claim story + **verifier names with hyperlinks to verifier profile pages** + contributor count + first-name + last-initial of contributors), In Memoriam, Niyamavali (with version diff), public Blog, About / Founders / Team, Contact. Verifier profile pages display verifier name + designation + district + role + claims verified (count and list). The public visibility of verifier identities is intentional — it is the social-accountability mechanism that keeps peer verification trustworthy (per brainstorm Theme 5 v1-M).
- **Members-only (auth required):** Full member profile lookup by eHRMS / mobile, nominee bank/account/IFSC during active alert window only, contribution history per member per alert, member profile detail with school/contact-via-trust.
- **Never public, never visible to other members:** trust account ledger, partner commission rates, internal operational expenses, member's full mobile, email, home address, DOB; member's raw photo (avatar/initials only public).

**Consequences (testable):**
- An automated test scrapes the public site and asserts that no PII from the "Never" list is exposed.
- Audit log (FR-47) captures any admin-side access to "Never" data with rationale.

#### FR-75: Member Directory with PII shielding

Public directory page; first-name + last-initial only.

**Consequences (testable):**
- No mobile, email, address, DOB exposed.
- Pagination is forced (no `?page=all`).
- `noindex` on member detail pages.

#### FR-76: Sahyog Drive — Active + Archive

Active alert page lists current pools, contribution count, target/actual.

Archive lists past alerts, searchable by month, by pool name, by nominee state.

**Consequences (testable):**
- Active page updates in near-real-time during a live alert.
- Archive pagination forced; no bulk export from public surfaces.

#### FR-77: Sahyog Vivran (per-claim story)

For each closed pool: family story (light narrative), **verifier names with hyperlinks to public verifier profile pages**, contributor count, total raised, close-of-cycle celebration messaging (per FR-19's Pool-Reality #2 framing).

**Consequences (testable):**
- Family story is human-written; no AI-generated narratives in v1.
- Story is reviewed by trust before publish.
- Verifier hyperlinks resolve for non-logged-in visitors (public scope) — this is the social-accountability mechanism per Theme 5. Profile pages render only the public-scope fields (FR-74).
- Close-of-cycle copy uses the FR-19 templates; comparison-to-target framing is disallowed.

#### FR-78: In Memoriam

Roll of deceased members. First-name + last-initial + school + district + designation. Respectful framing.

#### FR-79: Niyamavali public page with version diff

Niyamavali rendered publicly; each amendment produces a public diff.

#### FR-80: English-first labels with Hindi parity (renaming TSCT terms)

Page titles, navigation, and UI labels in English with Hindi parity. Hindi terms (Sahyog, Niyamavali, Vyawastha Shulk) retained as proper nouns; English labels added where TSCT used Hindi-only.

### 4.12 Growth, Field Worker Attribution & Onboarding

Two-phase strategy. **Phase A** (0→1L members/Pariwar): paid field workers, 6-digit attribution code, ₹60–70 commission on **qualified** acquisition (KYC + ₹110 + first valid contribution). **Phase B** (≥1L): Adopt-a-Colleague organic, adopter badge tiers (Seedling/Sapling/Grove/Forest/Banyan). Adopter-chain attribution captured from day 1 so Phase B data exists when it activates. Realizes UJ-5.

**Expectation-calibration discipline (recruitment surfaces).** Every recruitment touchpoint frames the support promise honestly: "members of the Pariwar pool contribute when a colleague dies; the actual amount depends on how many members contribute that cycle." **Never** "₹50 lakh guaranteed" or "₹50 lakh insurance" — that figure is steady-state full-collection math, not a guarantee. Recruitment copy goes through the same tone-guide review as FR-69 and FR-19 close-of-cycle messaging.

#### FR-81: Field worker random 6-digit code (FieldWorker #1)

Code generated on admin "Add Field Worker." Unique per Pariwar.

#### FR-82: Optional Reference Code field at signup (FieldWorker #2)

Accepts: 6-digit numeric (field worker), member username/eHRMS (adopter), empty (organic). Parsed and stored as `attribution_source`.

#### FR-83: Attribution analytics dashboard (FieldWorker #3)

Funnel by source: signups → KYC complete → ₹110 paid → first contribution → qualified for commission.

#### FR-84: Field worker payment trigger (FieldWorker #4)

Commission earned only on **all three** of: KYC complete + ₹110 paid + first valid contribution in next monthly cycle.

**Consequences (testable):**
- Monthly disbursement batch sums qualified attributions per worker and disburses to worker's bank.
- A statement is generated per worker per month.
- *[ASSUMPTION: Commission rate ₹65/qualified acquisition (mid-point of ₹60–70 range); confirm OQ-5.]*

#### FR-85: Field worker lifecycle (FieldWorker #5)

Field worker can be deactivated; existing attributions preserved; new attributions on deactivated code rejected.

#### FR-86: Anti-fraud throttling on attribution code `[v1-S]`

Code usage > X/day or > Y unique devices → flag for trustee review. X, Y thresholds set by trustee.

#### FR-87: Adopter chain attribution (Adopt #1)

When Reference Code is a member username/eHRMS, the chain is captured. No commission flow in v1 (Phase B feature) — data captured for Phase B activation.

**Out of Scope (v1):**
- Adopter badge tiers — v2.
- Personalized invite deep links + WhatsApp share `[v1-S]`.

### 4.13 Security, PII Shielding & Anti-Scraping

Cloudflare front + Bot Management + Turnstile is the first line. Login wall on nominee bank/account display (members only, active-alert-window only). Forced pagination, no bulk export from public surfaces, honeypot fields, noindex on member-detail pages. The §4.11 PII-shielding policy enforced at the security layer.

#### FR-88: Cloudflare front + Bot Management + Turnstile

All public traffic via Cloudflare. Bot Management active. Turnstile on signup, claim filing, helpdesk forms.

#### FR-89: Rate limiting (IP / session / endpoint)

Per-endpoint rate limits — strict on auth, write, search.

#### FR-90: Login wall for sensitive data

Nominee bank/account display gated on auth AND active-alert-window check (FR-22 state == `live` for the alert containing the displayed pool).

#### FR-91: Forced pagination, no bulk export from public surfaces

`?page=all`-style query rejected. Max page size enforced. Bulk export disabled on member directory and Sahyog archive from public-side.

#### FR-92: Honeypot fields in HTML, noindex on member-detail pages

Bot traps; `<meta name="robots" content="noindex,nofollow">` on member-detail and search-result pages.

#### FR-93: Phone/email obfuscation `[v1-S — moot per policy]`

Per FR-74 policy these are never public; obfuscation patterns retained as defense-in-depth for any leak.

**Feature-specific NFRs:**
- Cross-Pariwar data isolation: see FR-59. Treated as P0 if breached.

**Notes:** `[NOTE FOR PM]` Anti-fraud watermarking on Contribution Note PDFs is `[v1-S]` (FR-33 already references).

### 4.14 Trust Posture, Compliance & DPDPA

**Trust posture (unified principle).** TWT is a **facilitator, not a guarantor; not a financial intermediary; commitment is purely ethical.** One coherent stance, enforced consistently across the product. Trust-side discretion is preserved via Niyamavali R5(D) and R10(D); the internal claim-denial appeal flow (FR-43A) is the primary path for grievance. The trust **will engage with judicial inquiry** when one arises — Indian courts (Consumer Protection Act 2019 and otherwise) routinely set aside contractual ouster of jurisdiction, and the *mandatory* ₹110 fee creates consideration that makes member-trust an enforceable contract. TSCT's "no judicial challenge permitted" phrasing was loyal to its voluntary-fee model; TWT drops the verbatim phrasing while retaining the substance — internal resolution is the norm; courts are the exception, and that exception does happen.

The posture manifests in: under-funded delivers actual, no top-up (FR-19); Contribution Note language, never "receipt"/"invoice" (FR-33); facilitated over-payment recovery, never enforced (FR-36); screenshot only on mismatch (FR-32); trust ledger never public (FR-74); voluntary withdrawal forfeits ₹110, no refund (FR-6); special-case routing + internal appeal (FR-43, FR-43A). Future amendments touching one of these FRs must consider the others — weakening one without the others fractures the posture.

**DPDPA & PMLA.** DPDPA compliance is built in from v1: data export, RTBF (soft-delete + anonymize, no refund), consent registry. DPO + breach-reporting readiness activate at the MeitY threshold. PMLA posture is **structurally limited** — by never holding support money in the support-pool flow, the trust avoids PMLA exposure on support funds. But the trust does hold the ₹110 fee inflow, module commissions, and Phase 2/3 crowdfunding (when shipped); those flows have their own regulatory surface — enumerated in §4.14.1.

#### §4.14.1 Regulatory Surface Inventory

The trust touches multiple regulatory regimes despite the "facilitator, not intermediary" posture on support-pool money. Every cash flow the trust handles is enumerated below with applicable law and TWT's posture. Canonical; legal counsel must sign off pre-launch.

| Cash flow | Annual scale at v1 / steady-state | Applicable law(s) | TWT posture |
|---|---|---|---|
| **₹110 Vyawastha Shulk fee** (member → trust) | ~₹4.4 cr/yr at 4L active members | Indian Trust Act 1882; Income Tax Act (trust-income tax position via 12A/12AB registration); DPDPA (member PII); state-cooperative-society laws *if* trust is registered as one (Bihar specifics in OQ-pending) | Trust holds; trust-account banking; ITR filing; trust audit; transparent under FR-74 trust-ledger-private; **not** under PMLA (trust-grade KYC + audit log + DPDPA-aware) but **is** subject to Income Tax + Indian Trust Act |
| **Support-pool contributions** (member → nominee, UPI direct) | ~₹4–10 cr/month at scale | UPI is RBI-regulated payment system; member-to-individual transfers fall under personal-transaction rules; **trust is not a custodian** so PMLA reporting threshold doesn't apply to trust | Trust facilitates routing (FR-13 pool assignment) but never holds funds; explicit "facilitator, not intermediary" posture; no Payment Aggregator license needed |
| **Module commissions** (partner → trust) | ~₹50L–5cr/yr depending on partner traction | Income Tax (TDS §194H @ 5–10% on commission); GST (if commission revenue > ₹20L p.a., trust must register and charge GST) | Trust accepts commission via standard B2B billing; GST registration triggered when threshold crosses; income reported under trust ITR |
| **Field-worker payments** (trust → field worker) | ~₹65/qualified × N workers × M acquisitions/month | Income Tax (TDS §194H on commission paid; PF/ESI if treated as employment); field workers are **independent contractors**, not employees, but TDS still applies | Trust deducts and remits TDS on each disbursement; PAN required from field worker; quarterly TDS return |
| **Phase 2/3 Crowdfunding Module** (public donor → trust → nominee, with 10% cut) | Activates Phase 2/3 only | 80G registration (Income Tax); PAN-mandated for donations ≥ ₹2000 (CSR-related); PMLA threshold reporting (donation aggregation per donor); FCRA if foreign donors permitted (TBD); RBI for payment-gateway integration | Whole module is gated on additional regulatory readiness; not v1 |

**Open regulatory questions — each a Phase-0 prerequisite:**
- Indian Trust Act registration (specific state; Bihar process).
- 12A / 12AB Income Tax registration.
- 80G registration (for Phase 2/3 readiness; can begin pre-launch as it lapses if unused).
- GST registration trigger threshold (likely required from launch given module commissions).
- DPDPA Data Fiduciary registration (when MeitY thresholds are clarified; tracking is needed).
- **TRAI compliance — partial.** Bulk-DLT compliance de-scoped (no bulk-alert SMS). **DLT-transactional (PE/OE) registration required** for OTP-SMS, step-up-OTP-SMS, transactional-fallback-SMS, and degraded-mode cycle-open-bridge SMS — committed as operational prerequisite (architecture §2.2, §3.4). In-app notification rules may apply where notification content overlaps with regulated categories.
- Consumer Protection Act 2019 — trust's "service" is in scope; internal appeal flow (FR-43A) is the mitigation.

**Owner:** Legal counsel + Trustee Panel. **Blocker for:** trust account opening, Phase 0 → Phase 1 transition. See OQ-7 (DPO timing) and OQ-16 (regulatory surface sign-off).

#### FR-94: Trust posture in T&C — lawyer-reviewed

Terms include verbatim phrasings (preserved from TSCT precedent where applicable):
- *"Facilitator, not financial intermediary, not guarantor."*
- *"Commitment is purely ethical."* (R5(D))
- *"Internal resolution via the appeal flow (FR-43A) is the primary path for grievance; judicial challenge is not contractually barred, but core-team discretion under R5(D), R10(D), and R10(E) is preserved."* (TWT-adapted from TSCT R10(E); verbatim "no judicial challenge permitted" phrasing dropped per legal advisability — see §4.14 framing.)
- *"Registration alone does not constitute legal membership."*
- *"Missed information is the member's responsibility — official communications are delivered via the channels listed in this clause."* (R10(B), TWT-adapted: official channel is the in-app surface, not Telegram. Telegram and WhatsApp Business are mirrors / convenience channels. The member's responsibility to check the in-app surface follows from this clause.)
- *"A member holding an office-bearer position in a parallel teacher organization is disqualified for the duration of that role. Membership in a parallel teacher organization is permitted; office-bearing is not."* (R10(A), preserved.)
- *"Today's support becomes tomorrow's strength — आज का सहयोग कल का सहारा."* (Tagline; reproduced in the T&C preamble and on Contribution Notes.)

**Consequences (testable):**
- Lawyer review sign-off recorded in `.decision-log.md` pre-launch.
- T&C version is tied to Niyamavali version; member acceptance recorded with timestamp.
- T&C versions are persisted; an audit query can recover the T&C any member accepted at signup or at any subsequent re-acceptance.

#### FR-95: Data export / portability (DPDPA #1)

Profile → Download ZIP. Includes member profile, contribution history, attribution chain, Contribution Notes (PDFs).

#### FR-96: Right to be Forgotten — soft delete + anonymize (DPDPA #2)

Soft-delete member profile; contributions anonymized to "an anonymous member." No refund.

**Consequences (testable):**
- RTBF action audit-logged with timestamp + member acknowledgement.
- Audit log itself is not anonymized (regulatory necessity).
- Post-RTBF, member cannot rejoin under same Aadhaar for 12 months (FR-6 rejoin lock).

**Terminated members (added 2026-08-04).** FR-95's export and FR-96's RTBF are **member-portal** features. Termination ends authenticated member access, so for terminated members these rights are exercised through an **identity-verified administrative route** designated by the Trust (Niyamavali Part 10; Epic 10 Story 10.21). The route delivers access, correction, portability and erasure without reinstating a standing authenticated surface. Absent it, termination would silently extinguish rights the DPDPA guarantees — a compliance gap by omission.

#### FR-97: Consent registry (DPDPA #3)

Granular consent records: T&C version, privacy policy version, marketing comms, biometric data, photo. Revocable.

#### FR-98: Disaster-handling policy — slow-roll over months

When a mass-casualty event hits, claims are stretched over months. Never panic. Per-pool amount is not raised reactively.

**Consequences (testable):**
- A trustee can mark a disaster window; the alert engine throttles claim spawn (e.g., max N claims/month carried; remainder rolled forward).
- Member-facing copy explicitly de-emphasizes urgency in disaster windows.

#### FR-99: DPO + breach-reporting readiness `[v1-S, activates at MeitY threshold]`

Process + contact present; tooling for incident-response, breach notification timing per DPDPA, monthly compliance review.

**Feature-specific NFRs:**
- All PII at rest encrypted; in-transit TLS 1.3+.
- PII access by admins audit-logged (FR-47).

### 4.15 Future Benefit Hooks

TWT v1 ships **no member-side benefit** on the Vyawastha Shulk (per FR-1). This section carries the **forward-compat hooks** required so that future trust-paid benefits — beginning with **Durghatana Sahayata (Accident Assistance)** — can be activated later without destructive migration of v1 member or payment records. The benefit flows themselves are out of scope for v1; only the hooks are in scope.

Membership → enables. Benefit → consumes eligibility. This section owns the second half of that relationship so FR-1 doesn't.

#### FR-100: Durghatana Sahayata (Accident Assistance) — forward-compat hooks

TWT plans to introduce **Durghatana Sahayata** (दुर्घटना सहायता, "Accident Assistance") in a later release: a TSCT R15-style member-self **trust-paid assistance benefit** where a Vyawastha Shulk-paid member can request trust-paid assistance for accident treatment costs. Durghatana Sahayata is **not a *daan* / pool-engine category** — it is **not crowdfunded** from other members; it is disbursed from the trust account after ground inspection, framed as *"gift, not entitlement"* (TSCT R15 posture). It is distinct from Jivandan (a planned crowdfunded *daan* pool category — see Glossary and FR-20); do not conflate.

FR-100 carries **only the forward-compat hooks**. The Durghatana Sahayata flow itself (member-self intake UI, accident-evidence handling, ground-inspection variant, trust-side disbursement, accident-specific lock-in policy, Niyamavali rules) is **out of scope for v1**; reserved for v2/v3 design.

**Consequences (testable):**
- **Receipt persistence is reconstructable.** Vyawastha Shulk receipts (per FR-1) are retained indefinitely and reconstructable for any historical date — sufficient to determine, post-hoc, whether a member was Vyawastha Shulk-paid on the date of any future accident-assistance request. No retroactive backfill required at Durghatana Sahayata launch.
- **Payout-destination capability is reserved (architectural, not schema-locked).** The data model reserves a future payout-destination capability for trust-funded assistance flows. A payout destination identifies where trust-paid assistance may be disbursed — `member`, `nominee`, `hospital`, or future destination types. **Testable v1 non-add:** v1 does **not** ship a `payout_destinations` table, column on existing tables, API endpoint, validator, or UI surface for payout destinations. Schema-diff against v1 baseline at Durghatana Sahayata launch must show a greenfield introduction (new table + new endpoints), not a column/index addition to v1 tables.
- **Rule registry tags rules by `benefit_mechanism`, not by death-support-only assumptions.** The Niyamavali rule registry (FR-7) tags every rule with a `benefit_mechanism` discriminator. v1 ships two values: `pool` (rules that govern crowdfunded *daan* benefits — death-support today; Jivandan / Kanyadan / Retirementdaan later) and `reserve` (rules that will govern trust-paid assistance benefits — Durghatana Sahayata and future reserve-funded benefits such as accident, education, retirement). All v1 death-support rules (R5, R7, R8, R9, R10, etc.) tag as `pool`. No v1 rules tag as `reserve` yet — the value exists in the enum so Durghatana Sahayata can be added later without re-tagging existing rules. The `benefit_mechanism` axis is deliberately wide so future benefits co-locate under one of the two existing mechanisms rather than spawning new tag values per product.
- **Separate entity for future requests.** When shipped, Durghatana Sahayata will use a separate request/case entity, not the `claim` entity defined in §4.6 for nominee-on-death claims. v1 does **not** introduce that entity; v1's `claim` entity remains scoped to death-support nominee claims.
- **Trust-disbursement audit reuse.** The trust-disbursement audit trail (FR-47) is already attributable and immutable — Durghatana Sahayata trust-paid disbursements will reuse the audit-log substrate, no v1 work required.
- **Benefit independence.** Receiving Durghatana Sahayata does not reduce, replace, delay, or prioritize death-support eligibility. The two flows are independent products that consume Vyawastha Shulk-paid status without interfering with each other's outcomes for the member or the nominee.

**Out of Scope for v1 (in scope for v1 design / forward-compat only):**
- Member-self request intake UI (the form a Vyawastha Shulk-paid member uses to raise an accident-assistance request).
- Accident-evidence handling (hospital records, FIR, medical certificates, treatment estimates).
- Payout-destination data collection, validation, or UI (member's own bank account, hospital direct-pay, etc.).
- Accident-specific lock-in clock (TSCT precedent: 15 days post Vyawastha Shulk payment; a per-benefit lock-in variant of FR-3).
- Durghatana Sahayata rule predicates in the Niyamavali registry (R-numbers reserved but not authored).
- Ground-inspection variant for accident-assistance (the §4.6 claim-side ground-inspection is scoped to death; Durghatana Sahayata's inspection cadence and SLA will be re-specified at launch).
- "What your ₹110 bought" member-facing communication — remains explicitly NOT published in v1 even after Durghatana Sahayata ships (TSCT precedent; "gift, not entitlement" framing).

**Feature-specific NFRs:**
- Activating Durghatana Sahayata must not require destructive migration, historical backfill, or rewrite of existing member / payment / Vyawastha Shulk-receipt records. Column adds, new tables, and new entities are acceptable.

**Notes:** `[NOTE FOR PM]` The forward-compat surface is intentionally minimal — receipt persistence (already in FR-1), a reserved architectural slot for payout destinations, and a `benefit_mechanism` tag on the rule registry. Anything richer (configurable claim-template, accident taxonomy, ground-inspection SLA variant) is deferred to the Durghatana Sahayata release itself. TSCT R15 + the "gift, not entitlement" posture are the reference model.

## 5. Non-Goals (Explicit)

TWT v1 is **not**:

- A payment gateway, fintech, or financial intermediary for support funds. The trust never holds support money in v1 (Crowdfunding Module Phase 2/3 changes this scope explicitly with PAN/80G/gateway).
- A multi-state product. Bihar only. Architecture supports more; v1 does not implement.
- A multi-Pariwar UX. One Pariwar is live (Bihar). Cross-Pariwar discovery is v3 and requires ≥2 Pariwars first.
- A public-donation platform. No path exists for non-members to donate to a specific nominee. PMLA exposure to bereaved families is the reason. Crowdfunding Module ships donor → Trust → 10% cut → nominee with 80G in Phase 2/3.
- A teacher community / social network. No comments, no friend graph, no chat. Comments disabled by default on News/Blog.
- A general insurance / regulated mutual-fund product. Mutual-aid posture; no actuarial pricing, no top-up reserves, no entitlement.
- An NSCT competitor. Geographic bypass posture for now. Posture revisited if NSCT activates in Bihar pre-launch.
- An eHRMS replacement or state-government partner system. eHRMS ID is data, not integration.
- A WhatsApp-only or Telegram-only app. Telegram mirror honors the migrating cohort; product surface lives in-app.
- A non-Hindi-non-English product in v1. Additional regional languages are v2+, prioritized per state expansion.

## 6. MVP Scope

### 6.1 In Scope (must-ship for v1 to be v1)

- **Identity & Membership Lifecycle:** Signup, ₹110 Vyawastha Shulk, annual renewal with 3-month grace (FR-1A), manual eHRMS, DigiLocker KYC + manual fallback, lock-in clock, multi-nominee 75/25, medical disclosure (IMA-listed) with concealment-denial, voluntary withdrawal. (§4.1, FRs 1, 1A, 2–6)
- **Niyamavali (Rules Engine):** Versioned per-Pariwar registry, lock-in trustee-adjustable/member-count-driven ramp, R7/R8/R5/R9 carry-over with R14 concealment-denial extension, retirement coverage, Member Validity Service (FR-12A). (§4.2, FRs 7–12, 12A)
- **Pool Engine:** Auto-spawn, Mahabharata naming, deterministic balanced assignment, fixed-amount on 90-day notice, pool-bound payment enforcement, under-funded cycle policy, _daan parameterization. (§4.3, FRs 13–20)
- **Alert Lifecycle:** State machine, My Pool card, structured `alert` → multi-channel render, real-time contributor list, 15-day window. (§4.4, FRs 21–24)
- **Payment & Reconciliation:** UPI Intent, UTR self-attestation, nominee daily statement intake, UTR matching engine, dual nominee accounts, screenshot-on-mismatch, Contribution Note PDF. (§4.5, FRs 27–33)
- **Claim Flow:** Claim filing with claim-time nominee bank, death-cert OCR parity, peer mesh + ground inspection, human shepherd per claim (FR-41 v1-M), signals panel, special-case routing, internal appeal (FR-43A). (§4.6, FRs 37–43A)
- **Admin UI core:** Flexible RBAC, scope dimensions, 12 default roles, audit log, bulk ops, reconciliation review queue, News/Blog dual-surface, helpdesk, field-worker dispatch, per-Pariwar JSON custom fields, fixed-amount setter, member moderation, Trustee-Lite list+signals, Reports & exports (FR-58A), Banner/popup (FR-58B), Feature flags per cohort (FR-58C). (§4.7, FRs 44–47, 49–57, 58A, 58B, 58C)
- **Multi-Pariwar scaffolding:** `pariwar_id` first-class, branding bundles, separate app per Pariwar build pipeline, Dokploy auto-deploy, Pariwar-Passport data model. (§4.8, FRs 59–63)
- **Module Marketplace:** Manifest schema, member shelf, admin targeting wizard, time-bombed lifecycle, first 2–3 partner modules (HDFC home loan, LIC term plan, health-camp pilot). (§4.9, FRs 64–67)
- **Communication:** Bilingual Hindi + English, warm-formal tone, multi-channel render, in-app push (primary). (§4.10, FRs 68–71)
- **Public Pages:** Public-vs-Private matrix, Member Directory, Sahyog Drive (active + archive + detail), In Memoriam, Niyamavali public page with diff. (§4.11, FRs 74–80)
- **Growth & Field Worker:** Random 6-digit code, Reference Code at signup, attribution analytics, qualified-acquisition payment trigger, field-worker lifecycle, adopter chain capture. (§4.12, FRs 81–85, 87)
- **Security & PII Shielding:** Cloudflare + Bot Management + Turnstile, rate limits, login walls, forced pagination, no bulk export, honeypot, noindex. (§4.13, FRs 88–92)
- **Compliance:** Trust posture in T&C, DPDPA data export, RTBF, consent registry, disaster-handling policy. (§4.14, FRs 94–98)

### 6.2 Out of Scope for MVP

- **Crowdfunding Module** (Ketto-style; gateway, PAN, 80G, 10% trust cut) — **Phase 2/3**. Killed for v1 to keep PMLA posture clean.
- **Pariwar provisioning wizard, cross-Pariwar discovery** — v2 / v3 (activates with 2nd Pariwar). `[NOTE FOR PM]` solo-build cadence may mean 2nd Pariwar is 18+ months out.
- **Account Aggregator reconciliation** — v3. Manual UTR matching + daily statement intake is sufficient at v1 scale.
- **Full workflow-builder Kanban claim board** — v2. Trustee-Lite list + signals works for v1.
- **Public trust ledger / partner commission disclosure / "what your ₹110 bought" annual statement** — **killed**. Political risk to trust.
- **Direct public-to-nominee donations** — **killed**. PMLA exposure to bereaved family.
- **eHRMS auto-fetch** — politically infeasible; manual entry only.
- **Additional regional languages beyond Hindi + English** — v2+, prioritized per state expansion.
- **Foreign-death claims** — v2. Consular attestation flow.
- **Grief-aware claim UX hardening** — v3 (WI-25).
- **Vernacular video alerts** — v2.
- **TTS regional language read-aloud** — v3.
- **State-health dashboard, configurable per-role dashboards, tenant/Pariwar management surfaces** — v2 (activates with 2nd Pariwar).
- **Adopter badge tiers (Seedling/Sapling/Grove/Forest/Banyan)** — v2 (activates Phase B).
- **Permission delegation with date range** — `[v1-S]` (FR-48); may slip to v2 depending on cadence.

## 7. Success Metrics

### Primary (gating)

- **SM-1: First end-to-end claim closes without manual heroics.** Target: 6–9 months from v1 ship. *Validates via either path, whichever lands first:* (a) Phase 1 simulated drill (gated by OQ-11 legal viability) — fake-but-functioning claim with real members, real contributions, real reconciliation, controlled return of funds; or (b) first real claim in the soft-launch base. *Definition (real-claim form):* death certificate uploaded → peer mesh + ground inspection → trustee approval → pool spawn → assigned members notified → contributions via UPI Intent → reconciliation matches without trustee chasing → nominee receives funds on ≥1 of 2 accounts → cycle closes → public contributor list publishes → In Memoriam updated. Validates FR-1 through FR-43A, FR-77.
- **SM-2: Pool-math viability — member count approaches ~4 lakh active members in scope.** Target: 18–24 months from v1 ship. At this scale, with fixed amount ~₹310 and ~20 pools/month, each nominee receives close to the ₹50 lakh north-star. Validates FR-13 through FR-19.

### Secondary

- **SM-3: Vyawastha Shulk renewal rate ≥ 85% YoY.** Target: from month 12. Validates FR-1, FR-6.
- **SM-4: Cycle collection rate ≥ 70% consistently.** Under-funded cycles are accepted per policy, but sustained low collection signals a member-engagement problem. Validates FR-2, FR-13–19, FR-30, FR-71.
- **SM-5: Pool reconciliation accuracy ≥ 95%** during live alerts. UTR matching catches contributions without trustee chasing. Target tightens to > 99% once the matcher mechanism (OQ-2) is chosen, instrumented, and has ≥ 1 full live-cycle of measured evidence. Validates FR-30, FR-32.
- **SM-6: Module marketplace revenue from HDFC + LIC pilots.** Target: covers ground-inspection + helpline + DPO operating costs by month 18. Validates FR-64–67.
- **SM-7: Field-worker qualified-acquisition rate ≥ 60%** of attributed members in Phase A. Validates FR-81–85.

### Counter-metrics (do not optimize)

- **SM-C1: Signup velocity in absence of contribution.** Do not chase a high signup number that doesn't convert to active contributors. Counterbalances SM-3 / SM-4.
- **SM-C2: Active Telegram members.** Telegram mirror is a courtesy to the migrating cohort, not the strategic surface. Counterbalances any drift back to Telegram-as-primary.
- **SM-C3: Module-shelf CTR.** Modules should help teachers, not annoy them. A high CTR on inappropriate-fit modules is worse than a low CTR on well-targeted ones. Counterbalances SM-6.
- **SM-C4: Average per-pool contribution amount.** Do not raise the per-pool amount reactively when collection is below target. Counterbalances SM-4. (Adjustments carry at least 90 days' notice per FR-15.)
- **SM-C5: Public PII exposure incidents.** One = critical incident; this is a *hard zero* counter-metric. Counterbalances any "growth at all costs" pressure on FR-74.

## 8. Cross-Cutting NFRs

- **Performance:** App cold start < 3 s on mid-range Android (Snapdragon 4-series, 3 GB RAM). My Pool render < 500 ms p95 when alert is live. UPI Intent launch < 1 s p95. Reconciliation latency p95 < 4h during live alerts.
- **Reliability:** Member-app availability ≥ 99.5% monthly; admin UI ≥ 99%. Pool spawn at cycle freeze is atomic with retry semantics.
- **Security:** PII at rest AES-256; in-transit TLS 1.3+. Audit log integrity (no post-write tampering). Cross-tenant isolation tested. Cloudflare + Bot Management + Turnstile per §4.13.
- **Observability:** Every state transition (member / alert / claim / reconciliation lifecycle) emits a structured event. Trustee dashboards are built on these events.
- **Accessibility:** WCAG 2.1 AA is a **launch blocker** for member-app primary flows (signup, KYC, My Pool, payment, claim filing) and public-site primary navigation + Niyamavali + Sahyog pages. Acceptable v1 gaps (fix in v1-S / v2): admin-UI trustee-only screens, FR-58A export rendering. Devanagari renders with the same affordances as English; font sizing scalable. Pre-launch accessibility audit gates Phase 2.
- **Localization integrity:** Niyamavali content has parity Hindi/English; mismatch is a launch blocker.
- **Data residency:** All PII stored in India. DPDPA-aware (CERT-In incident reporting in-region).
- **Backup & restore:** Daily backups of the production DB; restore tested quarterly. Audit log archived separately.

## 9. Constraints, Risks & Solo-Build Sequencing

### 9.1 Solo-built + self-funded (build capacity, not trust ops)

Solo refers to **engineering + product build** — BigDev is engineer, product lead, design owner. Trust operations are not solo (see §2.6: ≥3 trustees + small staff). The brainstorm's "4–6 person team / 18–26 weeks" baseline does not match the build profile; realistic v1 ship is materially slower, so sequencing matters.

- **Three uncompromisable subsystems** — correctness here is non-negotiable:
  1. **Pool Engine** (math, balance, audit reproducibility, edge cases).
  2. **Reconciliation pipeline** (UTR matching, nominee statement intake, dispute handling, idempotency).
  3. **RBAC + multi-tenant data isolation** (one bug = data leak across Pariwars or scopes).
- Everything else can be cut or simplified for v1 without breaking the product.

### 9.1.1 Solo-build operational continuity (bus-factor mitigation)

Solo build creates a bus-factor-of-one. Not theoretical — this product holds real trust money for grieving families; operational continuity must outlive any single engineer's availability. The following are **Phase-0 prerequisites**, owned by Solo Builder, reviewed by Trustee Panel:

- **Runbooks** for every operational task that today exists only in the Solo Builder's head: deploy, rollback, secret rotation, audit-log integrity verification, reconciliation manual-intervention, RBAC seed reset, multi-Pariwar provisioning (when applicable).
- **Credential escrow** with at least two trustees (sealed; opened only on trustee-quorum action). Covers: production DB access, Cloudflare admin, Dokploy (and later K8s) admin, partner integrations, payment intent / banking, DigiLocker integration, DPDPA breach-reporting tooling.
- **Code escrow** — the source repository is mirrored to at least one trustee-controlled location with sufficient documentation for a contracted external engineer to take over within 30 days. Mirror is updated automatically on every release-branch push.
- **Degradation policy** — if the Solo Builder is unavailable for > 7 days, what does the trust do? Documented per surface: claim processing continues (admin UI is the operational surface), member signups continue (no Solo Builder dependency), reconciliation runs (cron-driven; only failure triage requires engineer), feature changes pause. Communications template prepared.
- **Knowledge-transfer documentation** — at minimum: architecture decision records (ADRs), Niyamavali → FR mapping, deployment topology, on-call playbook, third-party dependency inventory with renewal dates.
- **Backup engineer arrangement** — a named contracted external engineer with read-access + retainer agreement for surge / continuity. *[ASSUMPTION A-13: Trustee Panel authorizes ₹15–25k/month retainer for backup engineer arrangement; pre-launch trustee approval needed.]*

`[NOTE FOR PM]` This is the single biggest unaddressed risk in the brainstorm and brief. The product is built to outlive the builder; the operational stance must match.

### 9.2 Trust formation (pre-software prerequisites)

- TWT must be registered as a legal trust entity before the first ₹110 is collected.
- Banking + DPDPA compliance (DPO appointment, breach-reporting readiness) + Trustee Panel formation are gating items.
- `[ASSUMPTION: trust formation is in motion or accepted as v1-pre-launch operational work. Not a software scope item but a hard prerequisite.]`

### 9.3 Pool-math floor

- The model only pays out meaningfully at ~4L members. Below the floor, the product runs but the value proposition weakens.
- Bihar field-worker recruitment plan (cost, comp structure, geographic seeding) is the lever that determines whether the floor is reached in 12–24 months or 36+.
- **Field-worker comp is a cash-flow constraint that must be modeled before recruitment scales.** At ₹65/qualified × N workers × M acquisitions/month, disbursement obligation grows ahead of the ₹110 fee inflow funding it. Pre-launch cash-flow model (member-base × conversion × per-acquisition comp × ramp curve) is a Phase-0 prerequisite — without it, Phase A onboarding can outrun trust-account funding. Owner: Trustee Panel + Solo Builder (OQ-5). Gates Phase 2 (Bihar rollout); Phase 1 soft-launch can run while the model is built.
- **Trust staff salary is a second cash-flow input growing ahead of fee inflow.** Anita-class is **full-time paid staff** (claim shepherds, statement-intake, helpdesk, scope-bound verifiers), not volunteer labor. Headcount, role mix, and ramp schedule are owned by Trustee Panel (OQ-15); the pre-launch cash-flow model must include staff salary outflow alongside field-worker comp. Same Phase-0 prerequisite, same Phase 2 gate.

### 9.4 NSCT positioning

- NSCT is real but stalled. Posture: not competing now; geographic bypass.
- **Pre-launch monitoring required** — owner: Trustee Panel + Media/Comms (OQ-10). Monitor NSCT's Bihar activity through public channels, member forums, known organizers.
- **Contingency — if NSCT activates in Bihar before TWT launches:** re-position, don't surrender. Lead public comms with *structural* differentiators (Pariwar Platform vision, mandatory KYC + DPDPA posture, no payment gateway in support flow, automated reconciliation, mobile-native, multi-channel comms) — not "alternative to NSCT." Co-existence is the goal; product is the lever.

### 9.5 Naming question

- "TWT" is a working name; "Shikshak Parivar" is the strongest alternative.
- Decision needed **before** app store listings and brand identity work — architecture allows renaming, but ASO and trust legal docs do not. OQ-1.

### 9.6 Reconciliation mechanism (OQ-2)

- The matcher mechanism (cron + statement parsing) is decided at a capability level. The "how" — exact statement format, parser, idempotency strategy, dispute-handling sub-flow — is open and is the single biggest engineering risk.

### 9.7 Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Cross-Pariwar data leak via RBAC bug | Low | Critical | FR-59 isolation tests; adversarial tests; treated as P0 |
| Reconciliation matcher silently mismatches | Medium | High | Conservative `mismatch` flagging; screenshot fallback (FR-32); manual review queue (FR-50) |
| Pool Engine non-determinism / replay drift | Low | Critical | Property-based tests on `hash(member_id + cycle_id) mod N`; replay verification per cycle |
| NSCT enters Bihar pre-launch | Low | High | Pre-launch monitoring; differentiation story emphasized on launch comms |
| DigiLocker provider approval delayed indefinitely | Medium | Medium | Manual KYC fallback is the v1 baseline; switch-to-mandatory is feature-flagged |
| Field-worker code abuse / fraud rings | Medium | Medium | Anti-fraud throttling (FR-86); commission gated on qualified acquisition (FR-84) |
| Trust-staff bandwidth during a heavy cycle (claim shepherding + reconciliation review queue spike together) | Medium | Medium | Bulk operations everywhere (FR-49); Trustee-Lite signals panel (FR-42) and FR-12A Member Validity Service to compress admin task time; helpdesk scope-routing (FR-52) to distribute load; pending list and signals panel let any-scope admin act with full context |
| DPDPA enforcement before DPO ready | Medium | Medium | DPO + breach-reporting readiness `[v1-S]` (FR-99); pre-launch legal review |
| Bihar field-worker recruitment plan undefined (OQ-5) | High | High | Resolve before launch; otherwise pool-math floor unreachable in target window |

## 10. Why Now

- **NSCT has not scaled.** ~300 members in five years confirms the model needs product, not just a national logo. The opening for a serious product attempt is real.
- **TSCT has plateaued operationally.** Screenshot upload at TSCT's current scale (4L+ members) is friction TSCT cannot solve without rebuilding. TWT is the rebuild.
- **DPDPA arrived.** PII handling is now structural. Building DPDPA-compliant from day 1 beats retrofitting a 4L-member product.
- **UPI Intent + DigiLocker are stable rails.** Neither was production-grade five years ago.
- **The next sectoral Pariwar will be built by someone** — either by an organization with platform discipline or by 50 different organizations independently. Pariwar Platform bets on the former.

### 10.1 What this product bets on (positioning)

TWT does not have a technical moat — and the PRD refuses to pretend otherwise. The actual differentiation is **a set of structural choices most builders won't make**:

- **Multi-Pariwar from day 1**, when single-tenant would ship faster (§4.8).
- **No payment gateway** for trust money in the support-pool flow, when a gateway would simplify reconciliation (§4.5).
- **Automated reconciliation without losing direct-transfer**, when screenshot-upload is the obvious path TSCT proved viable (§4.5).
- **Patience as discipline.** v1 ships when the first end-to-end claim closes cleanly (SM-1) — not on a runway-dictated date. Multi-Pariwar expansion happens when the first Pariwar's math works (SM-2 / §12 Phase 4). Captured here so a future amendment cannot quietly trade patience for speed without confronting the choice.
- **Trust posture codified in the product** (see §4.14 for the unified clause; not fine print — encoded in the rules engine and the UX).

The bet: discipline outlasts cleverness. A worse-architected, gateway-mediated, single-tenant alternative built faster will run into the regulatory, scaling, and trust problems TWT structurally avoided — at which point TWT's investments compound. The risk: discipline can look like slowness from outside, and slowness can lose to a faster builder who got the regulatory side lucky. Acknowledged.

## 11. Stakeholders & Approvals

- **Trustee Panel (≥ 3 trustees, statutory minimum)** — owns: Niyamavali amendments, fixed-amount setting, claim final approval (special-case voting per R9), brand/naming decision (OQ-1), 12-role-set confirmation (OQ-3), R7 re-tuning at lock-in graduations (OQ-8), graduation triggers (OQ-14), lock-in policy changes, IMA list source confirmation (OQ-13), partner-deal terms (OQ-4), field-worker recruitment plan (OQ-5 — co-owned with Solo Builder).
- **Trust Staff (several employees)** — owns day-to-day ops: claim shepherding (Human Shepherd role per FR-41), nominee daily statement intake, helpdesk routing, field-worker dispatch coordination, reconciliation review queue triage (FR-50), member onboarding support for manual-KYC fallback queue. Operates within RBAC scope dimensions per FR-45.
- **Solo Builder (BigDev)** — owns: engineering, product, design, ops orchestration of the technical build in v1. Stakeholder in every product decision; final authority on technical sequencing and architectural trade-offs. Co-owns OQ-5 (recruitment plan) with the Trustee Panel.
- **Legal counsel + DPO (TBD pre-launch)** — owns: T&C, Privacy Policy, Niyamavali legal sign-off, DPDPA compliance posture, Phase-0 simulated-drill legal viability (OQ-11), IMA list legal review (OQ-13). DPO appointment timing OQ-7.
- **DigiLocker provider (Govt of India)** — gates: when DigiLocker KYC becomes mandatory (post-approval).
- **Partner Modules (HDFC, LIC, health-camp partner)** — own: commission terms, lead/conversion tracking, exclusivity clauses. OQ-4.
- **Field worker network (Bihar, Phase A)** — owns: ground recruitment execution. Comp structure: ₹65/qualified acquisition (A-8). Recruitment plan owner: Trustee Panel + Solo Builder (OQ-5).

## 12. Rollout

### Phase 0 — Pre-launch (operational)

- Trust legal formation.
- Trustee Panel formation.
- DPO appointment (or activation plan).
- Bihar field-worker recruitment plan (OQ-5).
- App store + brand identity (post OQ-1 resolution).
- Niyamavali v1 legal review.
- HDFC + LIC + health-camp partner deal terms (OQ-4).
- **Architectural launch-blocker gates** — all entries in architecture §Launch Gate Risks must reach closure or explicit disposition before Phase 1 transition. The list includes the P0-x validation experiments and decision / validation gates surfaced via architecture's Gap Analysis. **Substrate-conditional implementation commitments must not be frozen until P0-5 closes; exploration, prototyping, and validation work may proceed.** Architecture remains the source of truth for gate definitions and closure criteria; PRD references the gate inventory but does not duplicate it.

### Phase 1 — Soft launch (v1)

- Deploy to a controlled Bihar block (~1 district, target 1,000–5,000 members).
- First monthly cycle is a **simulated drill** — fake claim, simulated approval, real members, real ₹310, real UTRs, money actually moves to a trust-held escrow account that returns it (regulatory caveat: this requires legal vetting; alternative is to wait for the first real claim).
- Telegram mirror live; in-app primary.

### Phase 2 — Bihar rollout

- Open signup statewide.
- Field-worker network operational in 5–10 districts.
- First real claim closes (SM-1).

### Phase 3 — Approach pool-math floor

- 12–24 months from v1 ship.
- Member count approaches ~4L.
- Module Marketplace producing operating revenue.

### Phase 4 — Second Pariwar (v2 trigger)

- When Bihar math works (SM-2 met), provision second Pariwar.
- Most likely: Rail Parivar (national scope, ~13L employees).
- Activates: 4-hour provisioning wizard, cross-Pariwar discovery scaffolding, state-health dashboard.

## 13. Open Questions

> Each is an actual open item, not a rhetorical setup.

- **OQ-1: Final brand name — "TWT" vs "Shikshak Parivar" vs other.** *Owner:* Trustee Panel. *Blocks:* app store listings, brand identity, trust legal docs. *Target resolution:* before Phase 0 completes.
- **OQ-2: Reconciliation matcher mechanism.** Cron architecture, statement parser (PDF vs CSV-first), idempotency strategy, dispute sub-flow. *Owner:* Solo Builder. *Blocks:* §4.5 implementation. *Target:* before Pool Engine + Alert lifecycle hits integration.
- **OQ-3: 12 default seeded roles — confirm or revise.** PRD proposes: Super Admin, Pariwar Admin, State Trustee, District Admin, Block Admin, Finance Officer, IT Cell, Media/Comms, Field Worker, Verifier, Auditor, Helpline Operator. *Owner:* Trustee Panel. *Blocks:* RBAC seed in production. *Target:* before Admin UI ships.
- **OQ-4: First partner deal terms** (HDFC home loan, LIC term plan, health-camp pilot). Commission %, lead/conversion tracking, exclusivity. *Owner:* Trustee Panel + Partner contacts. *Blocks:* SM-6 viability.
- **OQ-5: Bihar field-worker recruitment plan.** Headcount, geographic seeding, comp structure beyond per-acquisition rate, cash-flow model. *Owner:* Trustee Panel + Solo Builder. *Blocks:* pool-math floor trajectory.
- **OQ-6: ~~₹110 first-month grace handling~~ — RESOLVED 2026-05-22.** First-time signup mandatory-upfront; all renewals get 3-month grace (FR-1A). *Resolution in `.decision-log.md`.*
- **OQ-7: DPO appointment + Privacy Policy drafting timing.** Legal track. *Owner:* Trustee Panel + Legal counsel. *Target:* before public launch.
- **OQ-8: R7 thresholds under the lock-in ramp.** Should R7(A) / R7(B) / R7(C) thresholds be retuned each time lock-in graduates (1mo → 3mo → 6mo → 12mo)? *Owner:* Trustee Panel. *Target:* before the first lock-in graduation milestone is hit. *Trigger:* member-count + trustee judgment, not a fixed calendar.
- **OQ-9: Pool scope per Pariwar.** TWT-Bihar = state-scoped; future Rail Parivar = national. Confirm scope dimension is a Pariwar-level config (assumed in §4.8). *Owner:* Architect. *Target:* before second Pariwar planning.
- **OQ-10: NSCT activation in Bihar — monitoring & contingency.** *Owner:* Trustee Panel. *Target:* ongoing pre-launch.
- **OQ-11: Phase-0 simulated drill — legal viability of moving real money in a non-claim test cycle.** *Owner:* Legal counsel. *Target:* before Phase 1.
- **OQ-12: Curated pool-name list (culture-rooted, ≥ 30 names).** Seed set is Mahabharata characters; expand with other culturally / mythologically / historically resonant names appropriate to Bihar (and per-Pariwar curation for future tenants). *Owner:* Content/Trustee. *Blocks:* FR-13 spawn behavior at high N. *Target:* pre-launch.
- **OQ-13: Canonical IMA serious-illness list source for medical disclosure (FR-5).** Which IMA publication or DPDPA-equivalent reference defines the disclosed-illness schedule? How is the list refreshed when IMA updates it? *Owner:* Trustee Panel + Legal counsel. *Target:* before medical disclosure ships.
- **OQ-14: Lock-in graduation triggers.** Member-count milestones and/or trustee-discretion criteria that trigger lock-in lengthening (1mo → 3mo → 6mo → 12mo). *Owner:* Trustee Panel. *Target:* before the first graduation is contemplated.
- **OQ-15: Trust staff hiring plan.** Headcount, role mix, geographic distribution, and ramp schedule for the trust's staff (claim shepherds, statement-intake coordinator, helpdesk operator, finance officer). Complements OQ-5 (field-worker recruitment). *Owner:* Trustee Panel. *Target:* before Phase 1 soft launch; staff ramp synchronized with member-base growth.
- **OQ-16: Regulatory surface sign-off (§4.14.1).** Indian Trust Act registration (Bihar), 12A/12AB Income Tax registration, GST registration, 80G registration (Phase 2/3 readiness), DPDPA Data Fiduciary registration, Consumer Protection Act 2019 posture, banking. Each item resolved with legal counsel + trustee sign-off and added to `.decision-log.md`. *Owner:* Legal counsel + Trustee Panel. *Target:* Phase-0 prerequisite; gates trust-account opening and Phase 1.
- **OQ-17: Vyawastha Shulk receipt retention horizon under DPDPA RTBF (FR-1, FR-100).** FR-100 requires reconstruction of Vyawastha Shulk-paid status for any past date so a future Durghatana Sahayata claim can evaluate eligibility against the historical accident date. This collides with FR-47's 7-year audit retention and FR-96 RTBF anonymization — if a member exercises RTBF, can the Vyawastha Shulk receipt fact (`paid_at`, `valid_through`, `category`) survive as a non-PII anonymized record, or is fee-paid status lost? Define the retention window and the RTBF carve-out (if any). *Owner:* Trustee Panel + Legal counsel + DPO (when appointed, OQ-7). *Target:* before Durghatana Sahayata enters design.
- **OQ-18: Trustee Panel ratification of Durghatana Sahayata scope and posture (FR-100, §4.15).** FR-100 inherits TSCT R15's posture ("gift, not entitlement"; ground-inspection-gated; member-self claimant) as the v2/v3 design target. Trustee ratification is required before the forward-compat hooks harden into a release plan — confirm posture inheritance, the two-value `benefit_mechanism` enum width (`pool` + `reserve`), and the assistance-benefit-not-daan framing. *Owner:* Trustee Panel. *Target:* before Durghatana Sahayata enters design / before v2 sprint planning.

## 14. Assumptions Index

Every inline `[ASSUMPTION]` surfaced here for explicit confirmation by Trustee Panel + Solo Builder before finalization.

- **A-1 (§2.7, §6.2):** v1 is single-state (Bihar only); architecture supports multi-state from day 1 but no other state is provisioned in v1.
- **A-2 (§3 Glossary, FR-46):** 12-role set (Super Admin, Pariwar Admin, State Trustee, District Admin, Block Admin, Finance Officer, IT Cell, Media/Comms, Field Worker, Verifier, Auditor, Helpline Operator) is derived from TSCT structure + reasonable extrapolation; Trustee Panel to confirm or revise pre-launch. (Also OQ-3.)
- **A-3 (§3 Glossary, FR-9):** R7 sub-clauses (R7(A)–R7(G)) carried verbatim from TSCT as v1 baseline; Trustee Panel will re-tune thresholds at each lock-in graduation milestone (member-count + trustee judgment driven, not calendar). (Also OQ-8.)
- **A-4 (FR-2):** DigiLocker provider approval timeline 6–12 months post-launch; DigiLocker becomes mandatory at that point via feature flag.
- **A-5 (FR-8):** Lock-in graduation triggers (member-count milestones + trustee judgment) are set by Trustee Panel pre-launch — operational policy, not software config. PRD encodes the principle (lengthens with scale); the schedule is owned offline. (Also OQ-14.)
- **A-6 (FR-13):** Curated pool-name list of ≥ 30 culture-rooted names finalized by content track pre-launch. Mahabharata is the seed; other resonant names extend the list. Per-Pariwar curation supported. (Also OQ-12.)
- **A-7 (FR-29):** Daily nominee bank statement push is operationally supported; nominee shepherd assists; AA integration deferred to v3.
- **A-8 (FR-84):** Field-worker commission rate ₹65/qualified acquisition (mid-point of ₹60–70 range). (Also OQ-5.)
- **A-9 (§9.2):** Trust legal formation is in motion or accepted as v1-pre-launch operational work; not a software scope item but a hard prerequisite.
- **A-10 (§9.1):** Solo-build cadence understood as the trade; PRD sequencing prioritizes the three uncompromisable subsystems accordingly.
- **A-11 (FR-5):** IMA serious-illness list source confirmed as canonical pre-launch; refresh process for the list set. (Also OQ-13.)
- **A-12 (FR-62):** Kubernetes is the v2+ deployment substrate, not v1. v1 ships on Dokploy; migration trigger is 2nd Pariwar or sustained ≥ 70% peak-cycle infra utilization. Migration runbook owned by Solo Builder.
- **A-13 (§9.1.1):** Trustee Panel authorizes ₹15–25k/month retainer for a backup engineer arrangement (read-only access + on-call surge agreement). Pre-launch trustee approval needed; covers bus-factor-of-one mitigation.
- **A-14 (FR-100, §4.15):** TSCT R15 posture ("gift, not entitlement"; ground-inspection-gated; member-self claimant; 15-day post Vyawastha Shulk lock-in) is the design reference for Durghatana Sahayata. Trustee Panel will ratify or revise this posture before Durghatana Sahayata enters design; v1 forward-compat hooks are posture-neutral but the design target inherits R15. (Also OQ-18.)

---

*Draft prepared 2026-05-22. Source extracts in `extract-brainstorm.md` and `extract-tsct-reference.md`. Rejected alternatives, options-considered matrices, and mechanism deep-dives in `addendum.md`. Decision provenance in `.decision-log.md`.*
