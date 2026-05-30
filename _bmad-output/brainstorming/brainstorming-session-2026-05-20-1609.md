---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: ['_bmad-output/research/tsct-reference-learnings.md']
session_topic: 'Product brainstorm — TWT (Teachers Welfare Trust) mobile app + website + admin UI, with plug-and-play module architecture, evolving into a multi-Pariwar mutual-aid platform'
session_goals: 'Generate broad-to-narrow idea space for v1 minimum-lovable product, surface differentiators vs TSCT, define plug-and-play module system, end with prioritized themes ready for PRD/architecture'
selected_approach: 'progressive-flow'
techniques_used: ['What If Scenarios', 'Mind Mapping', 'SCAMPER (Pool Engine)', 'Decision Tree Mapping']
ideas_generated: 130
technique_execution_complete: true
facilitation_notes: 'Highly engaged user; technical depth; fast-paced batched reactions; deep domain knowledge (TSCT operations); strong opinion-led pruning; provided real artifacts (Telegram screenshots, TSCT rules) mid-session that corrected my mental model multiple times'
context_file: ''
---

# Brainstorming Session Results — TWT (Teachers Welfare Trust)

**Facilitator:** BMad Brainstorming Coach (Claude)
**For:** BigDev
**Date:** 2026-05-20 / 2026-05-21
**Reference doc:** `_bmad-output/research/tsct-reference-learnings.md`

---

## Session Overview

**Topic:** Design TWT — mobile app + website + admin UI — modeled on tsctup.com (TSCT) but architected from day 1 as a **multi-tenant Pariwar platform** that will later host Rail Parivar, Bank Parivar, Public Servants Parivar, and other sectoral communities.

**v1 Scope:** Minimum lovable. Death benefit only. UPI-Intent payments (no gateway for trust money). Bihar as launch state. Bilingual (Hindi + English). Mobile-first with full-featured admin UI. Monthly pool model with 15-day contribution window.

**Goals achieved:**
- ✅ Wide divergent idea set across 13 themes
- ✅ Strategic differentiators vs TSCT identified
- ✅ Plug-and-play module architecture designed
- ✅ Architecture extended from single-product to multi-Pariwar platform
- ✅ Prioritized v1 / v2 / v3 / parking-lot tree with dependencies
- ✅ Critical path sequenced for engineering plan

---

## Technique Selection

**Approach:** Progressive Technique Flow
**Journey:** Divergent → analytical → refining → action

**Techniques executed:**

| Phase | Technique | Goal | Outcome |
|---|---|---|---|
| 1 | **What If Scenarios** (5 rounds) | Generate raw ideas across orthogonal domains, fight semantic clustering | 50 provocations → ~80 captured ideas after reactions |
| 2 | **Mind Mapping** | Cluster all ideas into PRD-ready themes | 13 themes; duplicates merged; gaps surfaced |
| 3 | **SCAMPER on Pool Engine** | Stress-test the highest-risk subsystem through 7 lenses | 21 SCAMPER provocations → distilled pool engine design |
| 4 | **Decision Tree Mapping** | Carve into v1 / v2 / v3 / parking lot with dependencies | Complete shelving + critical path |

---

## Locked Decisions (final)

| Decision | Choice |
|---|---|
| Product name (working) | **TWT** — final brand TBD before launch |
| First launch state | **Bihar** |
| Languages at launch | **Hindi + English** |
| Mobile-first | Yes |
| Membership fee model | Mandatory **₹110/year** (TWT-specific; not TSCT's voluntary Vyawastha Shulk model) |
| Per-month per-pool contribution | **Fixed** for 12+ month periods (currently ₹310-400 range; trustee-set, announced in advance) |
| Pool naming | **Mahabharata characters** (Arjuna, Bhishma, Karna, etc.) — letters retained for backward compat |
| Cycle frequency | One alert per month |
| Contribution window | **15 days** |
| Pool count per cycle | **= number of approved claims that month** (auto-spawned) |
| Member pool assignment | Deterministic hash, balanced — one pool per member per cycle |
| Multi-nominee policy | TSCT's **75% / 25% split** (primary + secondary) |
| Payment rails | **UPI Intent / Deep Link only** for member → nominee. NO payment gateway for trust account in v1. |
| Reconciliation | Member self-attests UTR; nominee pushes daily bank statement to trustee; trustee matches |
| Refund policy | **No refunds** under any circumstance (₹110 forfeited on withdrawal) |
| Member offboarding | Permanent, no rejoining under same identity for 12 months |
| Trust posture | **Facilitator, not financial intermediary, not guarantor.** No judicial challenge accepted. |
| Transparency | Public: member contributions, verifier names. Private: trust ledger, partner commissions, ops spend. |
| Crowdfunding (Ketto-like) | Module form, **Phase 2/3** — requires payment gateway, PAN, 80G, 10% trust cut |
| Onboarding model | Phase A (0→1L per Pariwar): **paid field workers @ ₹60-70 with attribution code**. Phase B: Adopt-a-Colleague organic |
| First module partners | **HDFC home loan, LIC term plan** |
| Telegram strategy | **Mirror** (in addition to in-app + WhatsApp + SMS) |
| Disaster handling | Stretch claims over months; never panic; adjust contribution slowly, announced |
| Retirement coverage | Adopt TSCT's +1yr per 5yr policy in Terms. Retirementdaan = future _daan category |
| Architecture | **Multi-Pariwar-ready from day 1** — `pariwar_id` first-class everywhere; one codebase; **separate app per Pariwar** (build configs differ, store listings differ) |
| Deployment | GitHub → Dokploy auto-trigger |
| Competitive posture vs NSCT | Not competing now (NSCT stuck at ~300 members in UP); avoid head-on conflict |

---

## The 13 Themes (PRD Scaffold)

> Each theme below lists ideas as `[ID] Description — bucket — dependencies`. Buckets: **v1-M** (must), **v1-S** (should), **v2** (3-6 mo post-launch), **v3+** (year 1+), **PARK** (parking lot).

---

### Theme 1 — Identity & Membership Lifecycle

| Idea | Bucket | Notes |
|---|---|---|
| Aadhaar + DigiLocker KYC at signup | v1-M | Fraud control foundation |
| eHRMS ID manual entry (no auto-fetch — govt API politics) | v1-M | — |
| Member profile (name, photo, school, district, designation) | v1-M | Foundational |
| State-agnostic member ID + `location_history[]` audit trail | v1-M | Cheap upfront; expensive retrofit (Transfer #1) |
| Self-service transfer-posting with two-sided admin verify | v1-S | High user value (Transfer #2-5) |
| Lock-in clock widget on home screen (WI-13) | v1-M | Eliminates #1 cause of disputed claims |
| Life Events panel — marriage, nominee change, address, medical disclosure, transfer (Self-Svc #1) | v1-S | Replaces ad-hoc WhatsApp admin burden |
| Medical pause workflow (Self-Svc #3, WI-28) | v1-S | Formalizes what TSCT does ad-hoc |
| Nominee change (no DigiLocker KYC for nominee — matches bank norms) | v1-M | — |
| Pariwar-Passport master profile (data model in v1, UI in v2) (WI-45) | v1-M data / v2 UI | Pays back when 2nd Pariwar launches |
| Subtle classroom QR badge (WI-12) | v2 | Brand-adjacent |
| Transfer-in handshake — new state's block admin reaches out in 7 days (WI-36) | v2 | Polish |
| Central-cadre national pool exception (KV/JNV/Sainik) (WI-35) | v2 | Activates when central-cadre cohort grows |

---

### Theme 2 — Pool Engine (the math core)

| Idea | Bucket | Notes |
|---|---|---|
| Auto-spawn N pools from approved-claim count (SC-18) | v1-M | One alert = one pool per claim |
| Deterministic balanced assignment via `hash(member_id + cycle_id) mod N` (Pool-Sys #1) | v1-M | Audit-friendly |
| Pool naming = Mahabharata characters (SC-9) | v1-M | Letters retained for backward compat |
| Fixed per-pool contribution amount over 12+ month periods (SC-17 / §23.3) | v1-M | Trustee-set; announced in advance |
| Pool-bound payment enforcement (Pool-Sys #2) | v1-M | UPI Intent pre-fills VPA; reconciliation rejects wrong-pool |
| Engine parameterized for future _daan reuse (SC-13) | v1-M | Same engine; per-category config |
| Pool-Reality #1 — under-funded cycles → nominee gets actual collection, no top-up | v1-M | Codifies "facilitator, not guarantor" |
| Pool-Reality #2 — close-of-cycle celebration messaging (no shortfall narrative) | v1-M | Member impact framing |
| Verifier-mesh tie-in: 5 verifiers pre-assigned to that nominee's pool (SC-5) | v2 | Social mechanic; deferrable |
| Social-affinity soft preference (WI-32) | v2 | Optimization; pure-balanced fine for v1 |

---

### Theme 3 — Alert Lifecycle (monthly, 15-day window)

| Idea | Bucket | Notes |
|---|---|---|
| Alert state machine (draft → frozen → published → live → closed → settled) | v1-M | — |
| 15-day contribution window (vs TSCT's 10) | v1-M | Locked |
| "My Pool" home-screen card (WI-31) | v1-M | Replaces 5+ TSCT lookup pages |
| Personal deadline countdown widget (Alert-Lifecycle #2) | v1-S | Drives action |
| Live progress meter, member-only (Money-Meter #1) | v1-S | Peer accountability; no public donation |
| Structured `alert` object → multi-channel render (WI-37) | v1-M | Source-of-truth pattern |
| Real-time per-pool live donor list (member-facing) | v1-M | TSCT page parity |
| Pending contributors per pool (visibility for nudging) | v1-S | — |
| Live progress with district breakdown (Alert-Lifecycle #1) | v2 | — |
| Post-alert educational nudge (Alert-Lifecycle #3) | v2 | Founder safety post pattern |
| Founder/trustee voice/video attachments to alerts (WI-38) | v2 | Polish |

---

### Theme 4 — Payment & Reconciliation

| Idea | Bucket | Notes |
|---|---|---|
| UPI Deep Link / Intent payment flow (UPI-Track #1) | v1-M | The whole payment story |
| Idempotent `tr=` reference per (member × alert) (UPI-Track #4) | v1-M | Solves duplicate confusion |
| Amount-lock at UPI Intent (OverPay #5) | v1-M | 80% of fat-finger errors prevented |
| Self-attestation + UTR entry post-payment (UPI-Track #1) | v1-M | Bridge without gateway |
| Nominee-pushed daily bank statement → trustee (UPI-Track #5) | v1-M | Reconciliation backbone |
| UTR matching engine (cron-based reconciliation) | v1-M | Confirms contributions |
| Dual bank accounts per nominee (RBI UPI limit workaround) | v1-M | Operational reality from TSCT |
| UPI failure coach with per-app guidance (UPI-Coach #1) | v1-S | Reduces helpdesk load |
| Retry queue with 4-hr reminders (WI-34) | v1-S | Reduces drop-off |
| Contribution Note PDF — NOT "receipt" or "invoice" (WI-30) | v1-S | Legal positioning preserved |
| Over-payment self-report + auto-drafted polite recovery (OverPay #1-4) | v1-S | Trust as mediator, not enforcer |
| UPI failure heatmap for admin (WI-33) | v2 | Needs corpus first |
| Real-time UPI responsiveness indicator (UPI-Coach #2) | v2 | Needs telemetry |
| Account Aggregator reconciliation (UPI-Track #3) | v3 | Manual reconciliation is fine until scale demands it |

---

### Theme 5 — Claim Flow & Verification

| Idea | Bucket | Notes |
|---|---|---|
| Claim filing — claimant enters nominee bank/IFSC at claim time | v1-M | Not at member signup (BigDev correction) |
| Death certificate upload + OCR parity check (Verify-Mesh #2) | v1-M | Auto-filter |
| Peer first-witness verification (5 nearest members) (Verify-Mesh #1) | v1-M | Speeds approval |
| Ground inspection retained alongside peer verification | v1-M | Both, not either (BigDev) |
| Public verifier names with profile hyperlinks | v1-M | Social accountability |
| Member status banner on claim review (WI-39) | v1-M | Trustee context in 5 sec |
| Human shepherd assigned per claim (WI-26) | v1-S | Trustee assigns; free; trust-builder |
| Medical pause integration in claim eligibility | v1-M | R5(C) compliance |
| Transfer-pending fallback policy (WI-40) | v1-M | Edge case but real |
| Suicide / murder-with-nominee-accused exclusion (Mar 2025 rule) | v1-M | Per TSCT |
| WhatsApp-based verification for non-app users (Verify-Mesh #3) | v2 | Optional channel |
| Foreign death edge case (consular attestation) (WI-27) | v2 | Rare |
| Grief-aware claim UX (WI-25) | v3 | Claimants come ~1 month after; not acute |

---

### Theme 6 — Admin UI (RBAC, News/Blog, Ops Power)

| Idea | Bucket | Notes |
|---|---|---|
| **Flexible RBAC** with permission keys + role bundles (ADM-1) | v1-M | Foundational |
| **Scope dimension** on every grant (block/district/state/pariwar/global) (ADM-2) | v1-M | Multi-state ops |
| 12 default seeded roles, editable (ADM-3) | v1-M | Out-of-box productivity |
| Permission delegation with date range + audit (ADM-4) | v1-S | Ops continuity |
| **Audit log** — attributable, immutable, 7-year retention (ADM-5) | v1-M | DPDPA + investigations |
| **News / Blog** — dual surface (public + member feed) (ADM-6) | v1-M | — |
| Authoring workflow with role gating (ADM-7) | v1-M | Draft → review → publish |
| Audience scoping per post (public / members-all / state / role / cohort) (ADM-8) | v1-M | — |
| Scheduled publishing + push channel selection (ADM-9) | v1-M | One author UI, N channels |
| Comments disabled by default (ADM-10) | v1-M | Avoid drama in gravitas context |
| Bulk operations everywhere (member upload, message send, status, module activation) (ADM-11) | v1-M | Scale enabler |
| Reports & exports library (ADM-12) | v1-M | Self-serve trustees |
| Banner / popup manager (ADM-13) | v1-M | In-app comms layer |
| Feature flags per cohort (ADM-14) | v1-M | Safe experimentation |
| Helpdesk / ticket system (ADM-15) | v1-M | Replaces WhatsApp chaos |
| Field-worker dispatch (mobile-first) (ADM-16) | v1-M | Pairs with FieldWorker attribution |
| Custom fields per Pariwar (JSON columns) (ADM-17) | v1-M | Pariwar variation without schema changes |
| Trustee fixed-amount setter + announcement workflow | v1-M | The ₹400→₹430 mechanism |
| Bulk claim approval at cycle freeze | v1-M | Once-a-month operation |
| Member contribution reconciliation review queue | v1-M | Triggered by UTR mismatch |
| Member moderation (suspend, terminate, restore) | v1-M | Discipline rule enforcement |
| Rule amendment with member-visible diff (WI-24) | v1-S | Replaces buried-in-Telegram |
| Survey / poll authoring + results dashboard (§28) | v1-S | Drives future-feature decisions |
| State-health dashboard (WI-23) | v2 | Needs data corpus |
| Trustee-Lite list+signals (v1 instead of full Kanban) | v1-M | Pragmatic |
| Full Kanban claim board | v2 | List works for v1 |
| Verification-chain workflow builder (ADM-18, reframed) | v2 | Visual approval-chain designer |
| Configurable dashboards per role | v2 | — |
| API tokens for trusted integrations | v1-S | — |
| Backup / restore visibility (super-admin) | v1-S | — |
| Tenant / Pariwar management (super-admin) | v2 | Activates when 2nd Pariwar provisions |

---

### Theme 7 — Module Marketplace

| Idea | Bucket | Notes |
|---|---|---|
| Module manifest schema + storage (Module-Mart #1) | v1-M | Foundational |
| Module shelf UI for members (Module-Mart #2) | v1-M | Core surface |
| Admin module-targeting wizard — scope user/block/district/state/all (Module-Mart #3) | v1-M | Scoping is the point |
| Time-bombed module lifecycle (`valid_until`, `slot_capacity`) (TimeBomb #1) | v1-M | Auto-archive |
| Slot-aware UI (TimeBomb #3) | v1-S | For first slot-based module (health camp) |
| First launch partner modules — HDFC home loan, LIC term plan | v1-S | Validates marketplace; revenue start |
| Partner self-service portal (Module-Mart #5) | v2 | Manual onboarding fine for first 2-3 |
| Cross-Pariwar partner manifest (Module-Mart #6, WI-48) | v2 | Activates with 2nd Pariwar |
| Recurring seasonal modules (TimeBomb #2) | v2 | Year-on-year reuse |
| Crowdfunding Module (Ketto-style, gateway, PAN, 80G, 10% cut) (CrowdFund #1) | v3 | Member-focused; trial first |

---

### Theme 8 — Communication & Brand Voice

| Idea | Bucket | Notes |
|---|---|---|
| Hindi + English bilingual at launch | v1-M | Locked |
| Warm-formal tone guide ("सम्मानित साथी / colleague", never "user") (WI-29 + Trust-Voice #1) | v1-M | Indian copywriter brief |
| Multi-channel parity from single `alert` object (WI-37) | v1-M | Already in Theme 3 |
| In-app push notifications | v1-M | Primary alert delivery |
| WhatsApp Business API integration | v1-S | Replaces Telegram dependency for non-legacy |
| SMS fallback for non-app users | v1-S | Mass reach |
| Telegram channel mirror | v1-S | Honors TSCT-migrating cohort (locked decision) |
| Vernacular video alerts (WI-16) | v2 | TTS pipeline cost |
| Trustee voice/video attachments (WI-38) | v2 | Polish |
| TTS regional language read-aloud (WI-15) | v3 | Accessibility |
| Additional regional languages (Marathi, Bengali, Tamil...) | v2 → v3 | Per-state rollout |

---

### Theme 9 — Transparency & Public Pages

| Idea | Bucket | Notes |
|---|---|---|
| Universal search (eHRMS / mobile) (Search-UX #1) | v1-M | Replaces TSCT's 10 lookup pages |
| Member Directory page (bot-safe display) | v1-M | Theme 13 protections apply |
| In Memoriam page (all deceased members) | v1-M | Respectful framing |
| Active Support Drive page (live alert + pool breakdown) | v1-M | — |
| Live Contributor List per Pool (real-time) | v1-M | — |
| Pending Contributors per Pool | v1-S | Nudging tool |
| Support Drive Archive (past alerts, searchable) | v1-M | — |
| Support Drive Detail / Sahyog Vivran (per-claim story) | v1-M | — |
| Vyawastha Subscribers page | v2 | Activates if Vyawastha-style fee added |
| Rulebook with version diff (Niyamavali) | v1-M | — |
| Public Blog | v1-M | Theme 6 authoring tool |
| About / Founders / Team page | v1-M | — |
| Contact / Helpline page | v1-M | — |
| Future _daan list pages (Kanyadan, Jivandan, etc.) | v2-v3 | Same template, parameterized |
| English-first labels with Hindi parity (renaming TSCT terms) | v1-M | Design system supports both |
| Per-alert heatmap with district drill-down (Open-Books #2) | v2 | Engagement layer |
| **NEVER public:** trust ledger, partner commissions, ops spend, mobile, address, email, DOB | v1-M | Locked policy |

---

### Theme 10 — Growth & Onboarding

| Idea | Bucket | Notes |
|---|---|---|
| Field worker random 6-digit code (FieldWorker #1) | v1-M | Generated on admin add |
| Optional Reference Code field at signup (FieldWorker #2) | v1-M | Accepts field-worker code OR adopter username/eHRMS |
| Attribution analytics dashboard (FieldWorker #3) | v1-M | Funnel by source |
| Field worker payment trigger — only on KYC + ₹110 + first valid contribution (FieldWorker #4) | v1-M | Quality alignment |
| Field worker lifecycle: deactivate on leave, preserve history (FieldWorker #5) | v1-M | Graceful sunset |
| Anti-fraud throttling for code abuse (FieldWorker #6) | v1-S | — |
| Adopter chain attribution (Adopt #1) | v1-M | Data captured from day 1 |
| Personalized invite deep-links + WhatsApp share (Adopt #3) | v1-S | Cheap |
| Adopter badge tiers (Seedling/Sapling/Grove/Forest/Banyan) (Adopt #2) | v2 | Activates Phase B (≥1L members) |
| Vouch tie-in to verifier mesh (Adopt #4) | v2 | Pairs with SC-5 |
| Anti-spam throttle for low-quality adopters (Adopt #5) | v2 | Activates with badge system |
| **Killed:** WhatsApp-only signup (WI-22) | KILLED | Full KYC mandatory |
| **Killed:** Kinship-network seeding as primary cold-start (WI-21) | DEFERRED | Math floor demands paid field workers first |

---

### Theme 11 — Multi-Pariwar Platform Architecture

| Idea | Bucket | Notes |
|---|---|---|
| `pariwar_id` first-class on every multi-tenant table | v1-M | Cheap upfront |
| Branding config bundle per Pariwar (logo, colors, copy strings) | v1-M | Externalize even for single-tenant v1 |
| Dokploy CI/CD auto-deploy from GitHub | v1-M | Confirmed |
| Separate app per Pariwar — N build configs, N store listings, one codebase | v1-M infra / v2 use | Build pipeline in v1 |
| Pariwar-Passport identity (data model v1 / UI v2) (Pariwar-Plat #3) | v1 data / v2 UI | — |
| 4-hour Pariwar provisioning wizard (Pariwar-Plat #1) | v2 | Activates with 2nd Pariwar |
| Cross-Pariwar discovery surface (Pariwar-Plat #4) | v3 | Needs ≥2 Pariwars |

---

### Theme 12 — Compliance, Edge Cases & Rules Engine

| Idea | Bucket | Notes |
|---|---|---|
| Rule registry — versioned, per-Pariwar | v1-M | Drives every check |
| Lock-in periods (general death = 12mo from Mar 2025) + reactivation logic (R7A-G) | v1-M | Per TSCT |
| 90% contribution rule (R8) + R8A (one-skip-per-year) + R8B (mid-contribution death) | v1-M | Per TSCT |
| Multi-nominee 75/25 split | v1-M | Locked |
| Suicide / murder-with-nominee-accused exclusion | v1-M | Per TSCT Mar 2025 |
| Trust posture (facilitator, no judicial challenge) in T&C | v1-M | Lawyer-reviewed |
| Contribution Note legal language | v1-M | Not receipt/invoice |
| Data export / portability (DPDPA #1) | v1-M | Profile → Download ZIP |
| Right to be Forgotten — soft delete + anonymize contributions, no refund (DPDPA #2) | v1-M | DPDPA compliant |
| Consent registry (DPDPA #3) | v1-M | — |
| Data Fiduciary readiness — DPO, breach reporting (DPDPA #4) | v1-S | Activate at MeitY threshold |
| Retirement coverage in Terms (+1yr per 5yr per TSCT) | v1-M | Codify TSCT policy |
| Disaster-handling policy (slow-roll over months, never panic, slow rate adjust) | v1-M rules / v2 UI | — |
| Retirementdaan as future support category | v3 | Same engine, after Kanyadan/Jivandan |
| Kanyadan / Jivandan / Vyawastha support categories | v2-v3 | Engine reuse |
| Voluntary withdrawal flow (no refund, 12-month rejoin lock) | v1-M | — |

---

### Theme 13 — Security, PII Shielding & Anti-Scraping

| Idea | Bucket | Notes |
|---|---|---|
| Public-vs-private data matrix codified (§35.1) | v1-M | Mobile/address/email/DOB **never public** |
| Cloudflare front + Bot Management + Turnstile (Anti-Scrape) | v1-M | First line of defense |
| Rate limiting (IP / session / endpoint) | v1-M | — |
| Login wall for nominee bank/account display | v1-M | Members only, during alert window |
| Forced pagination (no `?page=all`) | v1-M | — |
| No bulk export from public surfaces | v1-M | — |
| Honeypot fields in HTML | v1-M | — |
| API tokens for legitimate bulk (admin/auditor) | v1-S | — |
| noindex on member-detail and search-result pages | v1-M | — |
| WAF rules + TLS fingerprinting | v1-S | — |
| Behavioral monitoring + scraper alerting | v1-S | — |
| CAPTCHA on heavy search | v1-S | — |
| Watermarking on Contribution Note PDFs (donor ID embedded) | v1-S | Traceability if leaked |
| Phone/email obfuscation patterns | v1-M | Policy is "never public" anyway |

---

## Critical Path to v1 (Engineering Sequence)

```
1.  Schema design — pariwar_id everywhere; multi-tenant foundation
2.  Auth + KYC + DigiLocker + Profile (Theme 1)
3.  Rule registry + Lock-in/90%/reactivation engine (Theme 12)
4.  Pool Engine — auto-spawn + Mahabharata naming + balanced assignment + fixed-amount (Theme 2)
5.  Alert state machine + 15-day window + "My Pool" card (Theme 3)
6.  Claim flow + Verifier mesh + Trustee-Lite signals panel (Theme 5 + 6)
7.  UPI Intent + UTR self-attestation (Theme 4)
8.  Nominee-pushed statement intake + UTR matching reconciliation (Theme 4)
9.  Admin UI core: RBAC + Audit log + News/Blog + Bulk ops + Helpdesk (Theme 6)
10. Field-worker attribution + Adopter chain + Funnel analytics (Theme 10)
11. Survey/poll feature (Theme 6)
12. Module Marketplace foundation: manifest + shelf + targeting + time-bomb (Theme 7)
13. Communication: in-app push + WhatsApp + SMS + Telegram mirror via alert object (Theme 8)
14. DPDPA compliance: export, RTBF, consent registry (Theme 12)
15. Public pages: Member Directory, In Memoriam, Support Drive (current + archive), Detail, Blog (Theme 9)
16. Security: Cloudflare, rate limits, PII shielding, anti-scrape (Theme 13)
17. First 2-3 partner modules: HDFC home loan, LIC term plan, health-camp pilot (Theme 7)
18. Tone-guide + copy review (Theme 8)
```

**Estimated v1 effort:** 18–26 weeks with a 4–6 person team, depending on prior experience with multi-tenant SaaS + KYC + UPI + Indian regulatory work.

**Top three engineering risks:**
1. **Pool Engine correctness** (math, balance, audit reproducibility, edge cases)
2. **Reconciliation pipeline** (nominee statement intake, UTR matching, dispute handling)
3. **RBAC + multi-tenant data isolation** (one bug = data leak across Pariwars/states)

---

## Open Questions Still to Resolve

1. **Naming finalization** — "TWT" vs "Shikshak Parivar" vs other. Defer to before launch.
2. **NSCT positioning** — clarify if/when TWT competes in non-UP states.
3. **Pool scope per Pariwar** — TWT v1 = state-scoped; Rail Parivar = national. Make scope a Pariwar config from day 1.
4. **First partner deal terms** — commission %, lead/conversion tracking, exclusivity clauses with HDFC and LIC.
5. **Bihar field-worker recruitment plan** — how many, where, comp structure beyond ₹60-70/teacher.
6. **₹110 fee model** — confirm mandatory (vs. TSCT's voluntary ₹50→₹75 Vyawastha Shulk); decide handling for first-month grace.
7. **DPO appointment + privacy policy drafting** — legal track.
8. **App naming on stores** — "TWT" vs "Shikshak Parivar"? Branding decision affects ASO.

---

## Killed / Deferred / Parking Lot (so we don't relitigate)

- ❌ **Public trust ledger** — political risk (Open-Books #1)
- ❌ **"What your ₹110 bought" annual statement** — political risk (Open-Books #3)
- ❌ **Partner commission disclosure** — political risk (Open-Books #4, Module-Mart #4)
- ❌ **UPI Autopay for ₹110 renewal** (WI-17) — no payment gateway for trust money
- ❌ **WhatsApp-only signup** (WI-22) — full KYC mandatory
- ❌ **Public-to-nominee direct donations** (original WI-43/44) — recipient fraud-money exposure; replaced by Crowdfunding Module
- ❌ **Math Health dashboard for Pariwar founders** (WI-47) — too operational
- ❌ **Pool-Sys #3** mid-alert reassignment — late deaths spill into next cycle
- ❌ **SC-1** weighted-by-tenure assignment
- ❌ **SC-2** rolling 30-day windows per claim
- ❌ **SC-3** multi-pool proportional split
- ❌ **SC-4** Adopter+Pool combining (kill the fixed pairing)
- ❌ **SC-6** Cross-Pariwar pool merging in early stages
- ❌ **SC-7** rare-context member prioritization
- ❌ **SC-8** insurance "experience rating" by district
- ❌ **SC-10** shrink pools to 1000 members
- ❌ **SC-11** single national mega-pool
- ❌ **SC-12** tenure-bracketed contribution amounts
- ❌ **SC-16** eliminate monthly cycle
- ❌ **SC-19** member-choice pool browsing
- ❌ **SC-20** nominee contributes first to activate claim
- ❌ **SC-21** personal-coalition pre-formed pools
- ❌ **Self-Svc #2** DigiLocker KYC for nominee changes
- ❌ **WI-18** lapsed-member social re-engagement (out of scope)
- ❌ **WI-20** dispute SLA enforcement (replaced by OverPay facilitated flow)

---

## Recommended Next Steps (BMad agent / skill chain)

The brainstorm output is ready to feed:

1. **`/bmad-product-brief`** → Distill this session into a 1-pager product brief (mission, audience, scope, success metrics). Quick win.
2. **`/bmad-prd`** → Author the formal PRD using this session as input. The 13 themes become PRD sections; v1-M items become MUST requirements; v1-S become SHOULD; v2+ become "Out of Scope for v1."
3. **`/bmad-create-architecture`** → Solution design with the architect agent (Winston). Critical surfaces: multi-tenant DB design (`pariwar_id` first-class), Pool Engine, Reconciliation pipeline, RBAC permission model, Module manifest schema, UPI Intent + reconciliation flow.
4. **`/bmad-create-ux-design`** → Member-app + admin-UI specifications. Start with the home screen ("My Pool" card), alert detail, claim flow.
5. **`/bmad-create-epics-and-stories`** → Break the v1-M tier into epics following the critical-path sequence above.
6. **`/bmad-check-implementation-readiness`** → Gate before sprint 1 starts.
7. **`/bmad-testarch-test-design`** → Test strategy for the Pool Engine + Reconciliation (the highest-risk subsystems).

**Suggested initial trio in sequence:**
- Today: `/bmad-product-brief` (under 30 min)
- Next: `/bmad-prd` (multi-session; use this doc as primary input)
- Then: parallel `/bmad-create-architecture` + `/bmad-create-ux-design`

---

## Session Highlights

**User's Creative Strengths:**
- Deep operational knowledge of TSCT (caught my mental-model errors three times)
- Disciplined pruning — killed weak ideas fast; expanded strong ones with substance
- Strategic vision (Pariwar platform expansion mid-session was a major architectural pivot)
- Realistic constraint discipline (no gateway for trust, no eHRMS politics, no public trust ledger)

**Facilitator's Approach Adapted:**
- Batched provocations per round (10 at a time) matched user's high-velocity reaction style
- Used 🔥/❄️/💀/➕ shorthand for fast triage
- Captured corrections immediately in the live reference doc (TSCT learnings) to maintain a single source of truth
- Pulled real artifacts (TSCT website, Niyamavali, Telegram screenshots) when offered, surfacing missed mechanics (pool system, UPI failure modes, monthly cycle)

**Breakthrough Moments:**
1. Discovering the **POOL SYSTEM** from Telegram screenshots — completely missed in initial scan; reshaped the engine design
2. **Pariwar Platform pivot** — recognition that this is a *platform for multiple welfare communities*, not a single app for teachers
3. **Pool-Reality codification** — under-funded cycles are accepted, not engineered around; reinforces facilitator-not-guarantor posture
4. **Field-worker attribution gap-fill** — surfaced organically after the SCAMPER round when user reflected on real ops costs

**Energy Flow:**
- Sustained high throughout (~6 rounds + 4 phases without fatigue signals)
- Maintained constructive tension between divergent ideation and pragmatic constraints
- Final ~115 captured ideas; 130 if SCAMPER provocations are counted separately

---

**End of Session Output.**

This document is the authoritative input for the PRD phase. Cross-reference with `_bmad-output/research/tsct-reference-learnings.md` for the underlying TSCT operational model + locked TWT design constraints.
