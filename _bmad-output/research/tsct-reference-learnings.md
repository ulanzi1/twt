---
name: tsct-reference-learnings
description: Everything learned from scanning tsctup.com — used as the reference model for TWT. Verify alignment before building.
source_url: https://tsctup.com
scanned_date: 2026-05-20
status: needs_user_verification
---

# TSCT (Teachers Self Care Team) — Reference Model Learnings

> **Purpose of this document:** TWT (Teachers Welfare Trust) is modeled closely on TSCT. Before we design TWT, BigDev needs to verify that my understanding of TSCT is accurate, because every assumption here will shape TWT's PRD, architecture, and UX.
>
> **Action for user:** Read each section and mark ✅ correct, ❌ wrong (with correction), or ❓ unclear/unknown.

---

## 1. Organization Snapshot

| Attribute | Value |
| --- | --- |
| Full name | Teachers Self Care Team (TSCT) |
| Founded | 26 July 2020 |
| Registration | ALL/04988/2020-21 |
| State of operation | Uttar Pradesh (primarily) |
| Tagline | "आज का सहयोग कल का सहारा" (today's support becomes tomorrow's strength) |
| Reported scale | ~₹247 crore distributed across 556 deceased members' families |
| Helpline | 7007087337 (WhatsApp), 10 AM – 1 PM daily |

---

## 2. Core Business Model

A **teacher-funded mutual aid pool**:

1. A teacher becomes a member by paying a contribution fee → activates membership.
2. Membership has **rolling one-year validity** from the deposit date (NOT calendar-year).
3. When a member dies, an **alert** is broadcast (currently on Alert #74).
4. Active members contribute a small amount, transferred **directly to the deceased member's nominee** (not pooled into trust account first).
5. Members upload **payment receipts** to their profile as proof of contribution.
6. Failure to contribute → membership invalidated.

**Key principle:** "Registration alone does not constitute legal membership." Joining a Telegram group or filling a form is NOT enough — fee must be paid.

---

## 3. Eligibility Categories

Who can be a member:
- Basic and secondary teachers
- Shikshakamitra (teacher aides)
- Instructors
- Fourth-grade staff
- Clerical personnel
- Block Education Officers
- DIET lecturers
- Higher education faculty (added 6 January 2024)

---

## 4. Support Categories (the "donation modules")

| Category | Hindi | Purpose |
| --- | --- | --- |
| Death benefit | — | Direct transfer to deceased member's nominee |
| Jivandan | जीवनदान | Accidental / emergency medical aid |
| Vyawastha | व्यवस्था | Serious illness treatment support |
| Kanyadan | कन्यादान | Daughter's marriage financial support |

Each category has its own **public list page** on the website.

---

## 5. Money Flow

- **Direct member → nominee transfers** for support cases (peer-to-peer, not via trust account).
- **Trust account** exists for membership fees and operational money:
  - Bank: State Bank of India, Mumfordganj branch
  - Account: 44178920971
  - IFSC: SBIN0004557
  - QR code provided for digital payments
- Members are required to **upload UPI/payment screenshot** to their profile.

> ⚠️ **TSCT pain point we want to fix in TWT:** uploading a screenshot for every contribution is friction. TWT should track payments more automatically while preserving the direct-to-nominee model.

---

## 6. Website Information Architecture

Public pages:
- Home
- About Us
- Teacher's List (member directory)
- Sahyog (Support) List with detailed contribution records
- Vyawastha List
- Jivandan List
- Kanyadan List
- Niyamawali (rulebook)
- Contact
- Login
- Registration

Member-area / admin features:
- Member login + profile
- Per-member receipt upload (`sahyog_vibran.php` style verification pages)
- District-level administrator login
- Support detail / verification pages
- Support alert system (numbered alerts — currently Alert 74)

---

## 7. Governance Structure (multi-tier)

- **Top:** Founder & Chairman (Vivekanand), Co-founder & General Secretary, Co-founder & Treasurer
- **Officers:** Secretary, Organization Ministers (2), Senior VPs (4), VPs (3), Media Head, Joint Secretary
- **Field tiers:** Block → District → Regional → State
- District teams handle **initial claim verification** and **grievance handling** before escalation.

---

## 8. Claim / Settlement Workflow (as I understand it)

1. Member dies → family informs local team.
2. District team verifies claim (death certificate, membership validity).
3. Trust officially announces the case via a numbered **Alert** with deceased member's details.
4. Nominee's bank/UPI details are published.
5. Active members transfer directly to nominee.
6. Members upload receipt to their profile.
7. Receipts visible publicly on the Sahyog list page → **transparency mechanism**.

---

## 9. Tech & Operational Stack (inferred)

- Likely PHP/MySQL website (`.php` URL patterns visible)
- WhatsApp helpline integration
- QR-code payments
- Partner mobile app on Play Store: **"ITR Mantra"** (Income Tax filing) — interesting precedent for a partnered service offering
- No native mobile app for TSCT itself (verify)
- Per-district admin login but unclear if there's a mobile experience for admins

---

## 10. What I Believe TSCT Does Well

- Strong transparency (public lists of contributors and beneficiaries)
- Multi-tier verification reduces fraud
- Direct peer-to-nominee transfers feel personal and trustworthy
- One-year rolling validity is fair to late joiners
- Numbered alerts create urgency and FOMO ("don't miss this one")

## 11. What TSCT Likely Struggles With (TWT's opportunity)

- Manual receipt uploads = friction + admin burden
- No native mobile app = poor on-the-go experience
- District tier requires significant volunteer manpower
- Hard to scale beyond UP without local field teams
- No visible automated reconciliation of payments
- Limited revenue beyond membership fees → hard to fund operations at scale

---

## 12. Open Questions / Things I Couldn't Confirm

- [ ] Exact fee amount for TSCT membership (TWT plans ₹110/year) - exact fee is ₹110/year by TSCT
- [ ] How nominees are pre-validated and how their UPI/account is securely published - Nominees cannot be pre validated as their information will be entered by teacher. And I missed this part, after teacher has died nominee raises the claim and at that time nominee with feed the account number and IFSC code which will be published by TWT among members for donation.
- [ ] What happens if a member can't contribute to a specific case (grace, soft-block, hard-block) - I think you should copy all the rules from TSCT in this file, you will find the answer to each question there. We need those rules as well , we modify as per our need later.
- [ ] Whether TSCT issues 80G receipts automatically -  there's no point of 80G because for 110 rupees is very small for an individual.
- [ ] Whether members can see who has and hasn't contributed to a specific alert - Well again you should scan the website again, also note they do have app, not very great UX but working. Memebers do see who has contributed by going to the list published and searching by name or ehrms
- [ ] If there's an SLA between death and first nominee transfer - Trust holds no responsibility and trust is just the facilitator. The claimant cannot go to court for enforcement of their claim and many rules mentioned on TSCT. 
- [ ] Refund / dispute mechanism for wrong transfers - again rule is mentioned
https://tsctup.com/niyamwali.php

---

## 13. Verification Checklist for BigDev

Please mark each section:

- [ ] §1 Organization snapshot — accurate?
- [ ] §2 Business model — accurate?
- [ ] §3 Eligibility — TWT will mirror, expand, or change?
- [ ] §4 Support categories — TWT v1 = death benefit only ✅ (confirmed)
- [ ] §5 Money flow — accurate? (especially the "direct to nominee" vs "via trust")
- [ ] §6 IA — anything missed?
- [ ] §7 Governance — TWT will use similar tiers or different?
- [ ] §8 Claim workflow — accurate?
- [ ] §11 Struggles — anything I called out that you disagree with?
- [ ] §12 Open questions — any you can answer now?

---

## 14. Niyamawali — Critical Rules Summary

> **Source:** `https://tsctup.com/niyamwali.php` (scanned 2026-05-20).
> Detailed rule extract preserved in this section. All amounts and time periods are TSCT's; TWT may modify each.

### 14.1 Membership & Fees (TSCT)
- **R1, R12:** Registration FREE; membership FREE; no mandatory fee.
- **R15:** Optional **₹50/year "Vyawastha Shulk"** (Arrangement Fee). Voluntary. Funds:
  1. Website ops, 2. App dev, 3. SMS (TRAI), 4. Office + tech staff, 5. Ground inspections, 6. Expansion, 7. Tech upgrades for transparency.
- **R15 also unlocks Accident Treatment Support** for the fee-payer (see §14.6).
- **R2:** Mandatory Telegram group join. Member responsible for checking ≥2x/week. Missed info = member's responsibility (R10B).
- **R11:** Voluntary; can withdraw anytime.

### 14.2 Lock-in Periods (Fraud Prevention — Backbone)
- General death lock-in evolution: 15d (2020) → 30d (Apr 2021) → 90d (Jul 2022) → 6 months (Aug 2024) → **12 months/1 year (from 1 March 2025)**.
- Serious-illness lock-in evolution: 1yr → 2yr → 15mo → **12mo (current, all members)**.
- Accident treatment lock-in: 15 days after Vyawastha Shulk payment.
- During lock-in: contributions still mandatory once required, but death during lock-in = no support.

### 14.3 Contribution Discipline Rules
- **R6:** ALL contributions mandatory after lock-in. Receipt + form upload required.
- **R7(A):** Break before 10 contributions (i.e., before reaching 90% threshold) = validity lost. Restore with **3 consecutive contributions**. One-time-only. Max 2 breaks lifetime → after that R7(B).
- **R7(B):** Registered but never contributed → restore with **5 consecutive contributions** + 3-month lock-in. Requires core-team special recommendation.
- **R7(C):** Long gap → treated as new registration. 5 consecutive + lock-in (currently 5 months from Jan 2024).
- **R7(C.2):** General death lock-in = 6 months (Aug 2024); 12 months from Mar 2025.
- **R7(D):** 1 skip/year → 3-month lock-in + catch-up to reactivate.
- **R7(E):** 2+ skips/year → 5-month lock-in + complete all contributions.
- **R7(F):** 6+ month gap → 5-month lock-in + complete all.
- **R7(G):** Personal events (weddings, family functions) don't excuse skips.

### 14.4 The "90% Rule" (R8 — important UX implication)
- Applies only **after ≥10 contributions**.
- If member maintained 90% contribution rate → 1 missed contribution doesn't invalidate them.
- **Applies only to illness deaths, NOT accidents.**
- Threshold reviewed at milestones (10, 20, 50 contributions).
- **R8(A):** After 10 contributions, 1 skip/year allowed for unavoidable circumstances if prior record was 100%.
- **R8(B):** Mid-contribution death — if member died after alert but before deadline, presumed they would have paid → eligible (only for member's personal emergencies, not family).

### 14.5 Special Death Scenarios (R5, R9)
- **R5(C.2):** Death cause is what matters, not pre-existing illness. *Example:* kidney patient dies in road accident → eligible as accident death.
- **R5(D):** Core team has full discretion. No member has legal claim; commitment is purely ethical.
- **R5(E):** Multi-nominee disputes → team may redirect to second nominee. Defamatory beneficiaries can have funds recovered.
- **R5(F):** Erroneous excess transfer by member → team helps with evidence-based recovery but no guarantee, no liability.
- **R9:** Suicide / controversial / legally notable cases → core-team investigation; voting may apply.
- **R9(A):** Multiple deaths same date → priority to member with higher support/contribution record.
- **Note (Mar 2025):** Suicide/murder where nominee is accused = no support.

### 14.6 Accident Treatment (Optional, R15)
- Eligibility: Valid TSCT member who paid ₹50 Vyawastha Shulk.
- Scope: **Road accidents only.** Bill must exceed ₹1 lakh.
- Support: **₹25,000–₹50,000** (expandable to ₹1 lakh if funds permit).
- 2-nominee split: 75% / 25%.
- Disbursed **after ground inspection** (not instant).
- If insurance already paid → max ₹25k.
- "Gift, not entitlement."

### 14.7 Governance, Discipline, Authority (R10)
- **R10:** No support outside rules; no cancellation outside rules.
- **R10(A):** Can hold no office in parallel teacher org (membership in another is fine; office-bearing is not). Spreading rumors → disciplinary action.
- **R10(D):** Rules amendable anytime by core team.
- **R10(E):** TSCT disburses directly to nominee accounts. **No judicial challenge permitted.**
- **R14:** Forged receipts → validity terminated, support withheld.

### 14.8 "Direct to Nominee" Reaffirmed
- TSCT transfers go **member → nominee directly**, not via trust account.
- Trust account holds only ₹50 Vyawastha Shulk and operational money.
- Trust is **facilitator, not financial intermediary** for support payments.

### 14.9 Communication & Notification
- **Telegram = official channel** (R2, R13). Other channels are best-effort, non-binding.
- Bulk SMS pending TRAI approval (R3).
- Helpline 7007087337, 10 AM – 1 PM (R10C).

### 14.10 Amendment History (compressed)
| Date | Change |
|---|---|
| 2020-11-10 | First lock-in introduced (15d) |
| 2021-04-20 | Lock-in 15d → 30d |
| 2021-05-15 | Accident treatment (₹25k–₹50k) added |
| 2022-02-07 | Serious illness 1yr lock-in; contributions mandatory in lock-in |
| 2022-07-13 | Lock-in 30d → 90d |
| 2023-01-15 | Serious illness 2yr (new) / 1yr (existing) |
| 2024-01-01 | Multiple adjustments — serious illness 15mo |
| 2024-08-09 | General lock-in 6 months |
| 2025-03-01 | **All lock-ins 12 months/1 year**. Suicide/murder w/ nominee accused excluded. |

---

## 15. TWT vs TSCT — Differences Emerging (so we don't accidentally clone)

| Dimension | TSCT (today) | TWT (BigDev's stated direction) |
|---|---|---|
| Membership fee | FREE + optional ₹50 Vyawastha Shulk | **Mandatory ₹110/year** *(needs confirm — see §16 conflict)* | ₹110/year is Vyawastha Shulk mandatory, even new scheme by TSCT which covers private individual has Vyawastha Shulk mandatory.
| Geographic scope | Uttar Pradesh primary | **Pan-India minus TSCT states** | PAN India minus TSCT correct, also you should note not every state has eHRMS, some of them has HRMS and some other may have sth.
| Language | Hindi-only (English partial) | **Hindi + English bilingual at launch** | Hindi + English bilingual at launch
| Mobile app | Exists, "not great UX but working" | **Mobile-first, native-quality UX** | Mobile-first, native-quality UX
| Onboarding | Field workers @ ₹60–70/teacher | **Member-driven referral, ₹0 acquisition cost** | we will have field workers + member driven
| Communication | Telegram-mandatory | **In-app + WhatsApp + SMS (Telegram optional?)** | Telegram mandatory, mobile push, keep whatsapp but we decide what to send on whatsapp need toggle button in admin UI, no SMS
| Receipt tracking | Manual screenshot upload to form | **Automated UPI reconciliation** (mechanism TBD) | What's your plan for automated. How are we going to track ?
| Modules / partner services | One partner app (ITR Mantra) externally listed | **Plug-and-play module marketplace, admin-scoped activation** | correct
| Nominee details | Entered AFTER death by claimant | Same — confirmed |
| Settlement speed | Intentionally slow (~1 month, ground inspection) | Same — speed is NOT a differentiator |
| Trust's legal posture | Pure facilitator, no judicial challenge | Same — confirmed |
| Transparency | Public sahyog lists, searchable by name/eHRMS | **Same + traceable trust-account spends** |

---

## 16. Open Conflicts / Things to Resolve

1. **₹110 fee model** — TSCT's website says membership is FREE and the only fee is the optional ₹50 Vyawastha Shulk. BigDev says "TSCT charges ₹110/year." Either:
   - (a) TSCT's rules page is out of date,
   - (b) TWT is changing the model to a mandatory ₹110 base,
   - (c) ₹110 = ₹50 Vyawastha + something else.
   **Need clarification from BigDev.**
   mentioned above it is Vyawastha Shulk per mandatory. Membership is free any once can join any time. Only after paying Vyawastha Shulk  he becomes valid member and other rules apply. 
2. **Telegram dependency** — TSCT makes it mandatory. Does TWT want to eliminate this dependency by making the app the primary channel? Keep it mandatory. 
3. **Lock-in policy for TWT v1** — adopt TSCT's current 12-month general lock-in, or design differently? 1 month for now, After 1 year we increase it to 3 months and after 2 years 6 months and after 3 years in operation, 1 year.
4. **90% rule** — keep it as-is, or simplify for v1? keep it as-is
5. **Multi-nominee policy** — TSCT splits 75/25. TWT v1 = single nominee, or support multi? support multi
6. **Suicide/murder exclusion** — adopt TSCT's stance, or revise? same stance
7. **Onboarding for TWT outside TSCT states** — without field workers and without Telegram groups, what's the cold-start mechanic? (Round 2 will explore.)

---

## 17. Locked-in TWT Design Constraints (from BigDev — do not violate)

These are non-negotiable rules established during brainstorming. Any future PRD/architecture must honor them.

### 17.1 Money & Payments
- **No payment gateway** integration for trust account. Ever.
- **UPI Intent / Deep Link only** — member taps "Pay" → device launches their chosen UPI app (PhonePe/GPay/Paytm/BHIM/etc.) → returns to TWT.
- **Trust account stays opaque** to members — no public trust ledger, no annual "what your ₹110 bought" statement, no partner commission disclosure.
- **Teacher never pays TWT anything beyond ₹110/year.** Partners pay TWT (revenue share); teachers pay partners directly for services they use.
- **Over-payment recovery is facilitated**, never enforced. Trust = mediator, not arbiter.

### 17.2 Data Sources
- ❌ **State eHRMS direct integration is OUT for v1** (govt API approval is politically infeasible). Members may type eHRMS ID manually for record-keeping; no auto-fetch.
- ✅ **DigiLocker integration is IN** for Aadhaar-linked identity verification (photo, name, DoB).

### 17.3 Transparency Policy (refined)
- ✅ Public: member contribution history (per-member, per-alert), claim verifiers' names (with profile hyperlinks).
- ❌ Private: trust account ledger, partner commission rates, internal operational expenses.
- **Rationale:** peer accountability among members = healthy; politicizing trust money = existential risk.

### 17.4 Verification Approach (WI-4 confirmed)
- **Both crowdsource peer-verification AND ground inspection** retained (not either/or).
- Each claim page publishes verifier names as hyperlinks to their profiles → social accountability for verifiers.

### 17.5 QR Badge (WI-12)
- Approved, but **subtle**. Not loud / not branded as marketing. Reads as quiet proof, not solicitation.

### 17.6 Communication
- TSCT relies on Telegram. TWT decision pending — BigDev to share Telegram screenshots so we understand TSCT's announcement style before deciding TWT's primary channel.

---

## 18. THE POOL SYSTEM (critical — was missing from initial scan)

**Source:** TSCT Telegram alert #74 (15-25 April 2026), shared screenshots & transcript.

### 18.1 How it works
- Each Sahyog Alert covers **N deceased members** (Alert 74 had **N = 20 deceased**).
- The 20 deceased are labelled **POOL A through POOL T** (one nominee per pool).
- **Every active member is pre-assigned to exactly ONE pool** for that alert (visible in their profile/login).
- Member contributes **only to their own pool's nominee** — ₹310 minimum.
- **Contributing to the wrong pool = invalid AND no refund.** Hard rule.

### 18.2 Why this is genius (load balancing)
- ~320,000 active members ÷ 20 pools = ~16,000 members per pool.
- ~16,000 × ₹310 = **~₹49.6 lakh per nominee** → each family gets close to the ₹50 lakh target.
- Without pooling: every member donates ₹50 → tiny per-event amount, harder logistics, harder for member to track multiple transactions per alert.
- With pooling: **1 transaction per member per alert**, even when 20 deaths happened.

### 18.3 Per-nominee dual bank accounts (UPI limit workaround)
- Every nominee provides **TWO bank accounts** to receive support.
- Members can use either.
- Reason: **RBI/UPI transaction limits** force splitting when ~16,000 transactions land in 10 days.
- This is a real operational constraint TWT must replicate.

### 18.4 Real UPI failure modes observed (from Telegram coaching)
- "Prefix account number with 18 or 20 zeros" — works around some bank validation quirks
- "Activate UPI Lite first, then add zeros" — for PhonePe/Paytm
- "Try late night / early morning" — beats UPI rate-limiting
- "Bank app > third-party UPI app" for these transfers
- "Add as beneficiary first" (for IMPS/NEFT fallback)
- **Implication:** UPI failure is a constant operational headache. TWT app MUST have proactive failure coaching, retry guidance, and fallback paths.

### 18.5 Alert lifecycle (observed, ~15 days end-to-end)
1. **Pre-alert:** Pool assignments published; teaser via Telegram
2. **Alert open** (Day 0): Detailed announcement with all 20 pools, nominee details, amount, deadline
3. **Mid-alert nudges** (Day 5-7): "180k of 320k done — please complete soon"
4. **Final push** (Day 8-9): "Only 2 days remaining — your validity is at stake"
5. **Alert close** (Day 10): Hard deadline; no extensions
6. **Celebration** (Day 11): "₹10 crore distributed to 20 families"
7. **Public update** of contributor list & final totals
8. **Safety/educational follow-up** (e.g., 5/20 deaths were road accidents → safety reminder)

### 18.6 Member contribution lookup links observed (these are critical screens for TWT)
| Function | TSCT URL pattern |
|---|---|
| Death/pending list (current period) | `late_teacher_list.php` |
| My joining date & pool | `teacher_list.php` |
| My contribution history (lifetime) | `sahyogsuchi_list.php` |
| All-members contribution log (search) | `sahyogsuchi_namewise_list.php` |
| My Vyawastha Shulk status | `vyawasthashulk_list.php` |
| Current-running sahyog status | `running_sahyogsuchi_list.php` |
| Registration | `register1.php` |
| Login | `login.php` |
| Niyamavali | `niyamwali.php` |
| Kanyadan contribution count | `kanyadanShulkList.php` |

**Search pattern:** all lookup pages take **eHRMS ID OR mobile number** as search key.

---

## 19. Vyawastha Shulk Updated — Now ₹75 (effective 1 May 2026)

- Was ₹50/year (2021-2026), increased to ₹75/year from 1 May 2026.
- Still voluntary. Still funds: website, app, office staff, ground inspection, accident treatment cap.
- **Implication for the "₹110" question:** BigDev's "TWT charges ₹110/year" likely refers to TWT's own *mandatory* membership fee — NOT the same line item as TSCT's voluntary ₹50–₹75 Vyawastha Shulk. The two should not be conflated. TWT is shifting from TSCT's voluntary model to a mandatory annual fee. The ₹310 per-event contribution is separate and will likely also exist in TWT.

---

## 20. Additional TSCT Benefits Surface (from founder's annual recap)

Beyond just death benefit:
| Benefit | Amount | Notes |
|---|---|---|
| Death support | Up to ₹50 lakh | Direct to nominee |
| Serious illness support | Up to ₹5 lakh | Treatment support |
| Road accident | Up to ₹50,000 | Bill > ₹1 lakh; Vyawastha Shulk required |
| Daughter's marriage (Kanyadan) | Currently ₹50k, soon ₹1 lakh | Per teacher |
| Post-retirement extension | +1 year per 5 years served | Cool retention mechanic |
| Honorable retirement bonus | TBD amount | "Teacher samman" |

**Implication for TWT v1:** these are out of scope (v1 = death only). But the architecture must accommodate them as future "support categories" without rewrites.

---

## 21. Communication Tone (from Telegram excerpts)

- **Salutation:** "सम्मानित साथियों" (respected colleagues), "सम्मानित शिक्षक साथियों"
- **Tone:** warm-formal, deeply respectful, never marketing-speak
- **Multiple voices** per alert: founder, organization minister, IT cell, media head (each addressing different angle — gratitude, technical help, urgency)
- **Educational follow-ups:** safety reminders, recap of why TSCT exists, member journey ("why join")
- **Heavy use of:** emojis, bold formatting, decorative dividers — feels community-led, not corporate
- **Calls to action:** always include "जोड़ते रहें" (keep adding [members])
- **TWT implication:** the brand voice (WI-29) should mirror this warmth. App copy needs an Indian copywriter who knows this register.

---

## 22. Big Question Updated — NSCT?

In one Telegram message Ankita Shukla signs off as **"सह संस्थापक NSCT UP"** (Co-founder NSCT UP) and the founder's recap mentions NSCT. This suggests TSCT may already be evolving into **NSCT (National Self Care Team)** — potentially making "TWT pan-India minus TSCT states" a moving target. **BigDev: confirm if NSCT is real, active, and if it already covers states you were planning TWT to enter.**

---

## 23. CORRECTED Money Model (supersedes any earlier per-event assumption)

> ⚠️ Earlier sections may have implied a per-event/per-death contribution model. This is **WRONG**. The correct model is:

### 23.1 Monthly cycle
- **One alert per month** (matches observed Alert 71=Jan, 72=Feb, 73=Mar, 74=Apr).
- Trustees approve claims throughout the month.
- At the cycle close, **the number of approved claims = the number of pools that month**.

### 23.2 Pool creation & assignment
- Admin reviews/confirms `N` valid claims approved.
- System creates `N` pools (one per nominee).
- Every active member is **auto-assigned to exactly ONE pool** for the month — deterministically + balanced.
- Member contributes once per month, to that one nominee.

### 23.3 Per-member contribution: FIXED over long periods (corrected)

> ⚠️ **Earlier sections incorrectly described per-pool variable amounts. The actual model is:**

- Trustee panel **sets a fixed amount** per member per pool (e.g., ₹400/pool).
- That amount stays fixed for **12+ months** at a time.
- When the amount changes, members are **notified in advance** via standard channels (Telegram / app / SMS).
- Example: ₹400 from June 2026 → Sep 2027 → then raised to ₹430 for the next period.
- **Per-nominee total = members_in_pool × fixed_amount** (so total scales with member base, not per-event tuning).
- Pool count = number of approved claims that month (per §23.2).
- **No per-pool dynamic recalculation.** The system is intentionally predictable for members.

### 23.4 Annual cost picture for a member
| Line item | Approx amount | Notes |
|---|---|---|
| Mandatory TWT membership fee | ₹110/year | TWT-specific; goes to trust account |
| Per-month contributions | ~₹310 × 12 = ~₹3,720/year | Direct member → nominee; varies with pool composition |
| **Total** | **~₹3,830/year** | Per active member |

### 23.5 Implications for product
- **There is no "per-event" contribution flow.** One monthly cycle, one alert, one transaction per member.
- The system must support **per-month variable contribution amounts**, surfaced clearly when alert opens.
- The pool-balancing algorithm is a real engineering deliverable, not a footnote.

---

## 24. STRATEGIC SCOPE EXPANSION — From "TWT" to "Pariwar Platform"

> Major strategic clarification from BigDev. The platform being built is NOT just for teachers.

### 24.1 Vision
TWT is **the first instance** of a broader platform that hosts **multiple "Pariwar" (family) communities**, each functioning as a member-funded mutual-aid pool.

### 24.2 Planned communities (BigDev's stated trajectory)
| Community | Scope | Member base | Notes |
|---|---|---|---|
| TWT (Teachers Welfare Trust) | State or National | 4 lakh+ targeted | First go-live |
| **Rail Pariwar** | **National** | ~13 lakh railway employees | Nation-wide by necessity (railway is transferable) |
| Public Servants Welfare | National | ~30 lakh central govt employees | IAS/IPS/IFS/Group A across India |
| Other sectoral communities | TBD | TBD | Anyone whose member math demands a national/large pool |

### 24.3 Design principle: "Family bigger than state when math requires it"
- Pool size depends on community membership.
- If a state's teacher count is insufficient to fund ~₹50 lakh per nominee, expand the family geographically.
- "Pariwar" = the unit of belonging; defined per community.

### 24.4 Architectural consequence
- The platform must be **multi-tenant by COMMUNITY**, not just by state.
- Each Community is a first-class entity with:
  - `name`, `scope` (state | multi-state | national)
  - eligibility rules (engine-driven, not hardcoded)
  - pool computation rules (target amount, distribution algorithm, min/max floor)
  - module marketplace (community-scoped)
  - admin hierarchy (Community → State → District → Block, with rules per community)
  - rulebook + amendment history
  - brand identity (name, colors, logo)
- A single user account *could* belong to multiple Communities — v2 concern, but data model must allow.

### 24.5 Naming & deployment model (BigDev decided)
- **One Pariwar = one app + one website + one brand identity.**
- Examples: **Shikshak Parivar** (or TWT), **Rail Parivar**, **Bank Parivar**, **Public Parivar**, etc.
- **One codebase** powers all of them — pure multi-tenant white-label.
- Deployment: GitHub → auto-trigger to **Dokploy**, one deployment per Pariwar (separate URLs, separate Play/App Store listings, distinct branding).
- Backend strategy: shared infrastructure with `pariwar_id` as a first-class column on every multi-tenant table. (Database isolation per-Pariwar is a v2/v3 escalation if needed.)

### 24.6 Competitive posture
- **NSCT** confirmed: real but stuck — only ~300 members, hasn't escaped UP.
- TWT's stance: **not competing now**; may compete in future where NSCT has no stronghold (everywhere outside UP).
- Build to bypass NSCT geographically, not to fight them head-on.

---

## 25. Payment Window Confirmed: 15 days (not 5, not 10)

- TSCT currently allows 10-day contribution window per monthly alert.
- **TWT will allow 15 days** — explicitly more generous than TSCT.
- Implication for alert lifecycle: alert opens Day 1 → final push around Day 12-13 → closes Day 15.
- Member retry/grace logic must work within this window.

---

## 26. Money Meter & Public Donation — Reframed

### 26.1 What stays in v1: Member-only progress meter
- Fundraiser-style target meter on each pool — but **visible to members only**, fed only by **member contributions**.
- Purpose: collective effort visualization, peer accountability.
- No payment gateway involved. Pure UI / data display.

### 26.2 What was killed: Direct public-to-nominee donations
- **Problem 1:** if public donates to nominee's bank account and the funds turn out to be fraud-tainted (laundering, terror-funding, etc.), the **nominee becomes legally exposed** — a bereaved family suddenly facing PMLA scrutiny is unacceptable.
- **Problem 2:** public has zero trust in random "donate to a deceased family" pages without an intermediary brand they recognize.
- **Conclusion:** members can donate peer-to-peer because they verified each other's eligibility upfront; public CANNOT donate peer-to-peer for the same reason.

### 26.3 What replaces it: Crowdfunding Module (deferred to Phase 2 or 3)
A separate, Ketto/Milaap-style fundraising system that operates inside the app as a MODULE:

| Aspect | Design |
|---|---|
| Donation flow | Public donor → **Trust account** → Trust deducts ~10% → wires net to nominee/beneficiary |
| Donor requirements | Registration; **PAN card mandatory** for 80G eligibility |
| Trust requirements | **Payment gateway integration** (only for THIS flow; member→nominee still UPI Intent direct) |
| Trust cut | ~10% (funds ops + risk reserve + due diligence overhead) |
| Receipt | Trust issues 80G receipt to donor (real receipt, not just contribution note) |
| Use cases (best fit) | Accident treatment, wedding (Kanyadan), serious illness, calamity — not great for routine death benefit (members already cover that) |
| Trial timing | Launch in Phase 2 or 3 as opt-in module; evaluate uptake before committing further |
| Sunset criteria | If public participation is too low to justify the regulatory/ops cost → kill the module without affecting core product |

### 26.4 Why this matters architecturally for v1
Even though the Crowdfunding Module is Phase 2/3:
- The **Module Marketplace** infrastructure must support modules that need a payment gateway and PAN/KYC flows.
- The **Trust account** model must allow donation receipt → distribution flow (not just member fee collection).
- **Compliance posture** must accommodate 80G issuance, PMLA reporting, donor data retention.
- These constraints should shape the v1 architecture even if the module itself ships later.

### 26.5 Refined positioning (BigDev clarified)
- Crowdfunding Module's primary audience is **members** (peer-to-peer with Trust as legal intermediary), not the general public.
- Used for events outside the routine death-benefit pool (disaster, special illness cases, large one-off needs).

---

## 27. Retirement Coverage Policy (added to Terms)

Adopting TSCT's policy verbatim and codifying in TWT Terms:
- On completing **5 years of valid membership**, member retains **1 additional year of post-retirement coverage** (death-benefit eligibility extends 1 year past retirement date).
- **Every additional 5 years adds 1 more year** of post-retirement coverage.
- Example: 15 years of membership → 3 years post-retirement coverage.
- Honorable-retirement recognition gesture (financial + ceremonial) reserved for later phase.
- **"Retirementdaan"** as a distinct support category — launched separately, on member demand, alongside Kanyadan / Jivandan / Vyawastha.

---

## 28. New Core Feature — Surveys / Member Polling

- Trust admin creates polls to gauge member opinion before launching new schemes, rule changes, or scheme parameters.
- Survey types: yes/no, multi-choice, scaled rating, free text.
- Scoping: all members | by state | district | block | specific cohort (e.g., 5+ year members).
- Optionally anonymous or attributed.
- Quorum thresholds (e.g., require ≥30% participation for valid result).
- Results dashboard for trustees + member-facing summary post-close.
- **Use cases:**
  - "Should we launch Retirementdaan in 2027?"
  - "Approve proposed rule amendment X?"
  - "Vote on new module before activation"
  - "Capped-slot event RSVP: attending? family count?" *(replaces SC-14 attendance-by-selection)*
- Core feature, not a third-party module.

---

## 29. Pool Naming Convention (BigDev approved)

- Pools named after **Mahabharata characters**, not letters.
- Examples: **Pool Arjuna**, **Pool Bhishma**, **Pool Karna**, **Pool Yudhishthira**, etc.
- Both names AND letters can coexist for backward compatibility ("Pool A / Arjuna").
- Cultural resonance > alphabetic anonymity. Builds emotional identity per pool.

---

## 30. Final v1 Decisions (locked in)

| Decision | Choice |
|---|---|
| **Multi-nominee policy** | Replicate TSCT's 75% / 25% split for primary + secondary nominee |
| **Product name** | **"TWT"** for now (working name). Final brand TBD before launch; architecture must allow renaming. |
| **First launch state** | **Bihar** |
| **First module partners to court** | **HDFC home loan**, **LIC term plan** |
| **Telegram strategy** | **Mirror** — TWT alerts and announcements posted to Telegram in addition to in-app/SMS/WhatsApp, to honor TSCT-cohort members migrating in |

---

## 31. Admin UI Expanded — RBAC, News/Blog, "Powerful yet Flexible"

BigDev explicitly flagged Admin UI as underspecified. Expanded design surface below.

### 31.1 RBAC (Role-Based Access Control) — flexible, not hardcoded

- **Permission model:** every UI action and API endpoint has a permission key (e.g., `claim.approve`, `member.suspend`, `module.activate.state`).
- **Roles = bundles of permissions** stored in DB, editable by Super-admin.
- **Scoping dimension:** every permission grant also carries scope = `block | district | state | pariwar | global`.
- **Default seeded roles** (editable later):
  - Super-admin (everything, global)
  - Pariwar Admin (everything within one Pariwar)
  - State Trustee (everything within one state)
  - District Admin (claim approval, member ops within district)
  - Block Admin (verification, member ops within block)
  - IT Cell (technical config, no member PII)
  - Media / Comms (news/blog, announcements, no money)
  - Field Worker (member registration, no approvals)
  - Finance Officer (read-only money flows, reconciliation)
  - Verifier (peer verification mesh; smallest role)
  - Auditor (read-only across everything)
  - Helpline Operator (member lookup, ticket creation, no edits)
- **Custom role creation** via UI — Super-admin can define new roles by picking permissions.

### 31.2 News / Blog system

- Two surfaces: **public blog** (SEO, recruitment, brand) + **member-facing news feed** (in-app, announcements, success stories, rule updates).
- **Authoring workflow:** draft → editor review → publish (configurable per role).
- **Rich text** with image upload, embedded video, attachments.
- **Multi-author** with role-based permission to author / approve / publish.
- **Scheduling** for future publish.
- **Audience scoping** (public, members, state-scoped, role-scoped).
- **Categories / tags** (rule updates, success stories, safety, founder's notes, partner news).
- **Featured / pinned posts** at top of news feed.
- **Push to channels:** opt-in send to push notification, WhatsApp, SMS digest.
- **Comments:** disabled by default (avoid drama); can be enabled per post with moderation.

### 31.3 Other admin-power features

| Capability | Purpose |
|---|---|
| **Audit log** | Every admin action timestamped, attributable, immutable, searchable. DPDPA / fraud-investigation grade. |
| **Bulk operations** | CSV upload for member onboarding, bulk message send, bulk status changes, bulk module activation. |
| **Reports & exports** | Financial, membership, claims, contributions; period-over-period; CSV/PDF/Excel exportable. |
| **Communications composer** | Compose alerts, announcements, broadcasts; choose scope; schedule; template library. |
| **Banner / popup management** | Push critical messages into app UI (e.g., "rate change effective next month"). |
| **Feature flags / A-B toggles** | Turn features on/off per Pariwar / state / cohort without redeploy. |
| **Helpdesk / ticket system** | Member complaints, ticket assignment, SLA tracking, escalation paths. |
| **Field-worker dispatch** | Assign ground inspections; track visits; mobile-friendly. |
| **Knowledge base** | Internal docs for ops team; member FAQ for public. |
| **Custom fields** | Extend member/claim records per Pariwar without schema changes (JSON columns + UI-managed schemas). |
| **Workflow builder** (v2) | Admins define approval workflows (e.g., claim approval steps) without code. |
| **Delegation** | Temporarily delegate permissions when an admin is unavailable. |
| **Configurable dashboards** | Each role lands on a dashboard tailored to their work. |
| **API tokens** | Long-lived tokens for trusted integrations (Dokploy, monitoring, third parties). |
| **Backup / restore visibility** | Show backup status + restore points; trigger manual snapshot. |
| **Tenant management** (super-admin) | Pariwar provisioning, status, billing, deactivation. |

### 31.4 Member-app surface from admin actions
- Alerts → in-app
- News posts → news feed tab
- Polls/surveys → home screen card when active
- Banners → home screen
- Module activations → module shelf
- Direct messages (helpdesk replies) → notifications + inbox

### 31.5 Workflow builder (v2) — clarified scope
- **Not** for amount-based approvals (there are no amount requests in this system).
- **For verification chains:** e.g., "Claim approval requires Block Admin peer-verify-mesh review → District Admin ground-inspection signoff → State Trustee final approval." With branches for special cases (suicide → core team only; foreign death → consulate evidence required; dispute → state team voting).

---

## 32. Pool Reality — Under-funded Cycles (codified)

Pools are **voluntary**. If only 3L of 4L members contribute in a given cycle, nominee receives the actual collected amount. Trust does NOT top up from reserves.

- **Pool-Reality #1:** Under-funded pool acceptance. Final disbursement = actual collection; trust facilitator-only posture upheld.
- **Pool-Reality #2:** Member impact messaging at close. "Because [N] members contributed, the family received ₹[X]." No mention of shortfall vs target — just celebrate the real outcome.
- **Trustee policy:** if collection rate slips below a threshold (e.g., 70%) for 2+ cycles, trigger member outreach campaign; do NOT raise per-pool amount as a knee-jerk reaction (only adjust per the slow announced cycle per §23.3).

---

## 33. Field-Worker Attribution System (Theme 10 expansion)

Filling a gap: tracking how each member came in (paid field worker, peer adopter, or organic), and ensuring quality-aligned payment to field workers.

### 33.1 Mechanism
- **Random 6-digit code per field worker** (e.g., `742195`), generated when admin adds the worker through Admin UI.
- Printed on field-worker ID card and collateral; embeddable in deep-link invite URLs.
- **Single optional "Reference Code" field at signup:** accepts a 6-digit field-worker code OR a member username/eHRMS (adopter). Empty = `organic`.
- Permanent attribution; one source only per member.

### 33.2 Payment alignment
- Field worker earns commission (₹60–70) only when attributed member completes ALL of:
  1. Full KYC (DigiLocker verified)
  2. ₹110 fee paid
  3. First valid contribution in the next monthly cycle
- Trust disburses monthly to field worker's bank account with statement.
- Aligns incentive with quality (no commission for fake/abandoned signups).

### 33.3 Analytics
- Admin dashboard: signups per source category, top field workers per period, funnel conversion (signup → KYC → fee → first contribution), per-state, per-district, per-block.
- Surfaces "how members really find us" — the founder's most asked question.

### 33.4 Anti-fraud + lifecycle
- Code usage > X/day or > Y unique devices → flag for trustee review.
- Field worker leaves → code marked inactive (no new attributions); historical preserved.
- Optional territory assignment (state/district) for reporting; not enforced (member can attribute to any worker).

---

## 34. Public Page Architecture (formal IA — addition to Theme 9)

Beyond the prominent search bar, dedicated public pages required:

### 34.1 Page list (English-first labels with Hindi parity)
| Page | Hindi | Purpose |
|---|---|---|
| **Member Directory** | शिक्षक सूची | Browse / search active members (bot-safe display) |
| **In Memoriam** | दिवंगत शिक्षक सूची | All deceased members (current + historical) |
| **Active Support Drive** | वर्तमान सहयोग | Live alert — pool-wise breakdown, donor counts, progress |
| ↳ Live Contributor List per Pool | वर्तमान दानकर्ता सूची | Real-time list of members who have contributed (this pool, this alert) |
| ↳ Pending Contributors per Pool | शेष सदस्य | Members yet to contribute (encourages action) |
| **Support Drive Archive** | पूर्व सहयोग सूची | Past alerts, searchable by alert#, year, district, deceased name |
| **Support Drive Detail** | सहयोग विवरण | Per-claim story page (replaces TSCT's sahyog_vibran.php) |
| **Vyawastha Subscribers** | व्यवस्था शुल्क सूची | Annual fee–paying members |
| **Rulebook** | नियमावली | Complete rules + version diff |
| **Public Blog** | समाचार / ब्लॉग | SEO + recruitment + announcements |
| **About / Founders / Team** | हमारे बारे में | Org, founders, governance |
| **Contact / Helpline** | संपर्क | Channels |
| **(When _daan launched)** | | Kanyadan List, Jivandan List, Vyawastha List, Retirementdaan List — same template, parameterized |

### 34.2 English-first naming (with Hindi labels coexisting)
- Sahyog → **"Support Drive"** (or **"Contribution Drive"**)
- Sahyog Vivran → **"Support Detail"**
- Death List → **"In Memoriam"** (respectful framing)
- Teacher's List → **"Member Directory"**
- Vyawastha List → **"Vyawastha Subscribers"** (or **"Annual Subscribers"**)
- Niyamavali → **"Rulebook"**
- Both labels render based on language toggle; design system uses neutral keys.

---

## 35. PII Shielding & Anti-Scraping (new theme — Security & Anti-Abuse)

### 35.1 Public-vs-private data matrix
| Field | Member view (logged in) | Public view (no auth) |
|---|---|---|
| Name | Full | First name + last initial (e.g., "Ramesh S.") |
| Photo | Full | Avatar (initials) or stylized — **never raw photo** publicly |
| Mobile | Yes (own only) | **Never public** |
| Email | Yes (own only) | **Never public** |
| Home address | Yes (own only) | **Never public** |
| DOB | Yes (own only) | **Never public** |
| Joining date | Yes | Month/year only |
| eHRMS / Work ID | Yes (search by) | Yes (it's a work ID, not personal) |
| School name | Yes | Yes |
| District / State | Yes | Yes |
| Designation | Yes | Yes |
| Contribution count + history | Yes | Yes (numbers only, no per-event PII) |
| Pool / Badge | Yes | Yes |
| **Nominee bank / account / IFSC** | Visible during active alert only | **Never to non-logged-in users.** Logged-in members see during the alert window. After alert closes, hidden again. |

### 35.2 Anti-scraping measures (v1 mandatory)
1. **Cloudflare front** with Bot Management + Turnstile challenge on bulk search.
2. **Rate limiting** per IP / per session / per endpoint.
3. **Login wall** for nominee bank/account display — never visible to non-authenticated users.
4. **Forced pagination** (no `?page=all`; max 50 results/page).
5. **No bulk export** from public surfaces.
6. **Honeypot fields** in HTML to trap basic scrapers.
7. **API tokens for legitimate bulk access** — admin/auditor only.
8. **noindex** on member-detail pages, search-result pages.
9. **TLS fingerprinting / WAF rules** block known scraper signatures.
10. **Behavioral monitoring** — alert if unusual pattern (1000+ profile views from one IP in 5 min).
11. **Phone/email obfuscation** wherever shown (image render or transform — though policy is "never public" anyway).
12. **CAPTCHA** on heavy search queries.
13. **Watermarking** on PDFs (Contribution Note) — donor's own ID embedded for traceability if leaked.

