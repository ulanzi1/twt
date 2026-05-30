# Brainstorm Extract — TWT PRD Input

**Source:** `_bmad-output/brainstorming/brainstorming-session-2026-05-20-1609.md`
**Session date:** 2026-05-20 / 2026-05-21
**Extracted:** 2026-05-22

> Note on fidelity: The source document IS as structured as the brief claims. It has explicit "Locked Decisions" table (26 rows), 13 named themes with bucketed idea tables (v1-M / v1-S / v2 / v3 / PARK), a numbered 18-step Critical Path, an Open Questions section (8 items), and a Killed/Deferred list (~25 items). The "~85 locked decisions" figure in the brief includes the 26 in the explicit table PLUS the v1-M bucketed items across all 13 themes (which functionally are locked-in MUST scope). Total v1-M items below: ~90, consistent with the brief.

---

## Themes (the 13)

### Theme 1 — Identity & Membership Lifecycle
**Summary:** KYC-anchored member identity built for portability across states and (eventually) Pariwars; replaces ad-hoc WhatsApp admin burden with self-service life-event workflows.

Locked (v1-M) decisions:
- Aadhaar + DigiLocker KYC at signup (fraud control foundation).
- eHRMS ID manual entry — no auto-fetch (govt API politics).
- Member profile: name, photo, school, district, designation.
- State-agnostic member ID + `location_history[]` audit trail (cheap upfront, expensive retrofit).
- Lock-in clock widget on home screen (WI-13) — eliminates #1 cause of disputed claims.
- Nominee change without DigiLocker KYC for nominee (matches bank norms).
- Pariwar-Passport master profile — data model in v1, UI in v2 (WI-45).

v1-S: Self-service transfer-posting with two-sided admin verify; Life Events panel (marriage, nominee change, address, medical disclosure, transfer); Medical pause workflow (WI-28, R5(C)).

v2: Subtle classroom QR badge; transfer-in handshake (new state's block admin reaches out in 7 days); central-cadre national pool exception (KV/JNV/Sainik).

---

### Theme 2 — Pool Engine (the math core)
**Summary:** Auto-spawning monthly pools (one per approved claim), deterministic balanced member assignment, fixed contribution amount per pool, codifies "facilitator not guarantor."

Locked (v1-M):
- Auto-spawn N pools from approved-claim count (SC-18) — one alert = one pool per claim.
- Deterministic balanced assignment: `hash(member_id + cycle_id) mod N` (Pool-Sys #1) — audit-friendly.
- Pool naming = Mahabharata characters (SC-9) — letters retained for backward compat.
- Fixed per-pool contribution amount over 12+ month periods (SC-17 / §23.3) — trustee-set, announced in advance.
- Pool-bound payment enforcement (Pool-Sys #2): UPI Intent pre-fills VPA; reconciliation rejects wrong-pool.
- Engine parameterized for future _daan reuse (SC-13).
- **Pool-Reality #1:** under-funded cycles → nominee gets actual collection, no top-up (codifies "facilitator not guarantor").
- Pool-Reality #2: close-of-cycle celebration messaging (no shortfall narrative).

v2: Verifier-mesh tie-in (5 verifiers pre-assigned to nominee's pool); social-affinity soft preference.

---

### Theme 3 — Alert Lifecycle (monthly, 15-day window)
**Summary:** State-machine-driven monthly support drive cycle, source-of-truth `alert` object renders across all channels, member-only progress visibility.

Locked (v1-M):
- Alert state machine: draft → frozen → published → live → closed → settled.
- 15-day contribution window (vs TSCT's 10).
- "My Pool" home-screen card (WI-31) — replaces 5+ TSCT lookup pages.
- Structured `alert` object → multi-channel render (WI-37).
- Real-time per-pool live donor list (member-facing) — TSCT page parity.

v1-S: Personal deadline countdown widget; live progress meter (member-only, no public donation framing); pending contributors per pool.

v2: Live progress with district breakdown; post-alert educational nudge (founder safety post pattern); trustee voice/video attachments to alerts.

---

### Theme 4 — Payment & Reconciliation
**Summary:** UPI Intent/Deep Link only (no payment gateway for trust money); member self-attests UTR; nominee pushes daily bank statement; trustee matches via UTR engine.

Locked (v1-M):
- UPI Deep Link / Intent payment flow (UPI-Track #1) — entire payment story.
- Idempotent `tr=` reference per (member × alert) (UPI-Track #4).
- Amount-lock at UPI Intent (OverPay #5) — 80% of fat-finger errors prevented.
- Self-attestation + UTR entry post-payment.
- Nominee-pushed daily bank statement → trustee (UPI-Track #5) — reconciliation backbone.
- UTR matching engine (cron-based reconciliation).
- Dual bank accounts per nominee (RBI UPI limit workaround) — operational reality from TSCT.

v1-S: UPI failure coach with per-app guidance; retry queue with 4-hr reminders (WI-34); Contribution Note PDF — NOT "receipt" or "invoice" (WI-30, legal positioning); over-payment self-report + auto-drafted polite recovery (trust as mediator, not enforcer).

v2: UPI failure heatmap for admin (WI-33); real-time UPI responsiveness indicator.

v3: Account Aggregator reconciliation — manual reconciliation fine until scale demands it.

---

### Theme 5 — Claim Flow & Verification
**Summary:** Peer-verified + ground-inspected claim flow; nominee bank entered at claim time (not signup); public verifier names; human shepherd per claim.

Locked (v1-M):
- Claim filing — claimant enters nominee bank/IFSC at claim time, NOT at member signup (explicit BigDev correction).
- Death certificate upload + OCR parity check (Verify-Mesh #2) — auto-filter.
- Peer first-witness verification (5 nearest members) (Verify-Mesh #1).
- Ground inspection retained alongside peer verification — both, not either (BigDev correction).
- Public verifier names with profile hyperlinks — social accountability.
- Member status banner on claim review (WI-39) — trustee context in 5 sec.
- Medical pause integration in claim eligibility (R5(C) compliance).
- Transfer-pending fallback policy (WI-40).
- Suicide / murder-with-nominee-accused exclusion (Mar 2025 rule, per TSCT).

v1-S: Human shepherd assigned per claim (WI-26) — trustee assigns; free; trust-builder.

v2: WhatsApp-based verification for non-app users; foreign death edge case (consular attestation).

v3: Grief-aware claim UX (WI-25) — claimants come ~1 month after; not acute.

---

### Theme 6 — Admin UI (RBAC, News/Blog, Ops Power)
**Summary:** The densest theme. Flexible RBAC with scope dimensions, 12 default roles, immutable audit log, dual-surface News/Blog, bulk ops, helpdesk, field-worker dispatch, custom fields per Pariwar.

Locked (v1-M):
- **Flexible RBAC** with permission keys + role bundles (ADM-1) — foundational.
- **Scope dimension** on every grant: block/district/state/pariwar/global (ADM-2).
- **12 default seeded roles, editable** (ADM-3).
- **Audit log** — attributable, immutable, 7-year retention (ADM-5) — DPDPA + investigations.
- News/Blog — dual surface (public + member feed) (ADM-6).
- Authoring workflow with role gating: draft → review → publish (ADM-7).
- Audience scoping per post: public / members-all / state / role / cohort (ADM-8).
- Scheduled publishing + push channel selection (ADM-9).
- Comments disabled by default (ADM-10) — avoid drama in gravitas context.
- Bulk operations everywhere (member upload, message send, status, module activation) (ADM-11).
- Reports & exports library (ADM-12).
- Banner / popup manager (ADM-13).
- Feature flags per cohort (ADM-14).
- Helpdesk / ticket system (ADM-15) — replaces WhatsApp chaos.
- Field-worker dispatch (mobile-first) (ADM-16).
- **Custom fields per Pariwar (JSON columns)** (ADM-17) — Pariwar variation without schema changes.
- Trustee fixed-amount setter + announcement workflow — the ₹400→₹430 mechanism.
- Bulk claim approval at cycle freeze — once-a-month operation.
- Member contribution reconciliation review queue (triggered by UTR mismatch).
- Member moderation (suspend, terminate, restore).
- Trustee-Lite list+signals (v1 instead of full Kanban) — pragmatic.

v1-S: Permission delegation with date range + audit (ADM-4); Rule amendment with member-visible diff (WI-24); Survey/poll authoring + results dashboard (§28); API tokens for trusted integrations; Backup/restore visibility (super-admin).

v2: State-health dashboard; full Kanban claim board; verification-chain workflow builder (ADM-18); configurable dashboards per role; tenant/Pariwar management (super-admin) — activates when 2nd Pariwar provisions.

---

### Theme 7 — Module Marketplace
**Summary:** Pluggable module system with scope targeting (user/block/district/state/all), time-bombed lifecycle, first partner modules HDFC + LIC, eventual cross-Pariwar partner manifests.

Locked (v1-M):
- Module manifest schema + storage (Module-Mart #1).
- Module shelf UI for members (Module-Mart #2).
- Admin module-targeting wizard — scope user/block/district/state/all (Module-Mart #3).
- Time-bombed module lifecycle: `valid_until`, `slot_capacity` (TimeBomb #1) — auto-archive.

v1-S: Slot-aware UI (TimeBomb #3); first launch partner modules — HDFC home loan, LIC term plan.

v2: Partner self-service portal; cross-Pariwar partner manifest (WI-48); recurring seasonal modules.

v3: Crowdfunding Module (Ketto-style) — gateway, PAN, 80G, 10% trust cut.

---

### Theme 8 — Communication & Brand Voice
**Summary:** Hindi + English bilingual at launch; warm-formal "सम्मानित साथी / colleague" tone; single `alert` object drives in-app push, WhatsApp, SMS, Telegram in parallel.

Locked (v1-M):
- Hindi + English bilingual at launch.
- Warm-formal tone guide ("सम्मानित साथी / colleague", never "user") (WI-29 + Trust-Voice #1).
- Multi-channel parity from single `alert` object (WI-37).
- In-app push notifications — primary alert delivery.

v1-S: WhatsApp Business API; SMS fallback; Telegram channel mirror (honors TSCT-migrating cohort, explicit locked decision).

v2: Vernacular video alerts (WI-16); trustee voice/video attachments; additional regional languages.

v3: TTS regional language read-aloud (WI-15).

---

### Theme 9 — Transparency & Public Pages
**Summary:** Universal search, Member Directory, In Memoriam, Active Support Drive, archive, Niyamavali (rulebook with version diff). Hard public-vs-private matrix.

Locked (v1-M):
- Universal search (eHRMS / mobile) (Search-UX #1).
- Member Directory page (bot-safe display).
- In Memoriam page (all deceased members) — respectful framing.
- Active Support Drive page (live alert + pool breakdown).
- Live Contributor List per Pool (real-time).
- Support Drive Archive (past alerts, searchable).
- Support Drive Detail / Sahyog Vivran (per-claim story).
- Rulebook with version diff (Niyamavali).
- Public Blog.
- About / Founders / Team page.
- Contact / Helpline page.
- English-first labels with Hindi parity (renaming TSCT terms).
- **NEVER public:** trust ledger, partner commissions, ops spend, mobile, address, email, DOB (locked policy).

v1-S: Pending Contributors per Pool.

v2: Vyawastha Subscribers page; per-alert heatmap with district drill-down.

v2-v3: Future _daan list pages (Kanyadan, Jivandan, etc.) — same template, parameterized.

---

### Theme 10 — Growth & Onboarding
**Summary:** Two-phase onboarding: Phase A paid field workers (₹60-70 with attribution code) for 0→1L per Pariwar; Phase B adopt-a-colleague organic. Killed: WhatsApp-only signup.

Locked (v1-M):
- Field worker random 6-digit code (FieldWorker #1) — generated on admin add.
- Optional Reference Code field at signup (FieldWorker #2) — accepts field-worker code OR adopter username/eHRMS.
- Attribution analytics dashboard (FieldWorker #3) — funnel by source.
- Field worker payment trigger — only on KYC + ₹110 + first valid contribution (FieldWorker #4) — quality alignment.
- Field worker lifecycle: deactivate on leave, preserve history (FieldWorker #5).
- Adopter chain attribution (Adopt #1) — data captured from day 1.

v1-S: Anti-fraud throttling for code abuse; personalized invite deep-links + WhatsApp share.

v2: Adopter badge tiers (Seedling/Sapling/Grove/Forest/Banyan) — activates Phase B (≥1L members); vouch tie-in to verifier mesh; anti-spam throttle.

KILLED: WhatsApp-only signup (WI-22) — full KYC mandatory.
DEFERRED: Kinship-network seeding as primary cold-start (WI-21) — math floor demands paid field workers first.

---

### Theme 11 — Multi-Pariwar Platform Architecture
**Summary:** `pariwar_id` first-class on every multi-tenant table from day 1; one codebase, separate app per Pariwar (N build configs, N store listings); Dokploy auto-deploy.

Locked (v1-M):
- `pariwar_id` first-class on every multi-tenant table — cheap upfront.
- Branding config bundle per Pariwar (logo, colors, copy strings) — externalize even for single-tenant v1.
- Dokploy CI/CD auto-deploy from GitHub.
- Separate app per Pariwar — N build configs, N store listings, one codebase (build pipeline in v1).
- Pariwar-Passport identity — data model v1, UI v2.

v2: 4-hour Pariwar provisioning wizard — activates with 2nd Pariwar.

v3: Cross-Pariwar discovery surface — needs ≥2 Pariwars.

---

### Theme 12 — Compliance, Edge Cases & Rules Engine
**Summary:** Versioned rule registry per Pariwar; TSCT-derived rules (lock-in, 90%, multi-nominee, exclusions); DPDPA compliance; facilitator-not-guarantor in T&C; voluntary withdrawal with no refund.

Locked (v1-M):
- Rule registry — versioned, per-Pariwar — drives every check.
- Lock-in periods (general death = 12mo from Mar 2025) + reactivation logic (R7A-G) (per TSCT).
- 90% contribution rule (R8) + R8A (one-skip-per-year) + R8B (mid-contribution death) (per TSCT).
- Multi-nominee 75/25 split.
- Suicide / murder-with-nominee-accused exclusion (Mar 2025 rule).
- Trust posture (facilitator, no judicial challenge) in T&C — lawyer-reviewed.
- Contribution Note legal language — NOT receipt/invoice.
- Data export / portability (DPDPA #1) — Profile → Download ZIP.
- Right to be Forgotten — soft delete + anonymize contributions, no refund (DPDPA #2).
- Consent registry (DPDPA #3).
- Retirement coverage in Terms (+1yr per 5yr per TSCT).
- Disaster-handling policy: slow-roll over months, never panic, slow rate adjust.
- Voluntary withdrawal flow: no refund, 12-month rejoin lock.

v1-S: Data Fiduciary readiness — DPO, breach reporting (DPDPA #4) — activate at MeitY threshold.

v2-v3: Kanyadan / Jivandan / Vyawastha support categories; Retirementdaan — same engine.

---

### Theme 13 — Security, PII Shielding & Anti-Scraping
**Summary:** Cloudflare front + Bot Management + Turnstile; member-data login wall; forced pagination; no bulk export from public surfaces; never-public PII matrix.

Locked (v1-M):
- Public-vs-private data matrix codified (§35.1) — mobile/address/email/DOB **never public**.
- Cloudflare front + Bot Management + Turnstile — first line of defense.
- Rate limiting (IP / session / endpoint).
- Login wall for nominee bank/account display — members only, during alert window.
- Forced pagination (no `?page=all`).
- No bulk export from public surfaces.
- Honeypot fields in HTML.
- noindex on member-detail and search-result pages.
- Phone/email obfuscation patterns — policy is "never public" anyway.

v1-S: API tokens for legitimate bulk; WAF rules + TLS fingerprinting; behavioral monitoring + scraper alerting; CAPTCHA on heavy search; watermarking on Contribution Note PDFs (donor ID embedded).

---

## Locked Decisions Matrix (FR-candidate seed list)

Top-level locked decisions from the explicit Locked Decisions table:

| # | Theme tag | Decision | Rationale (if given) |
|---|---|---|---|
| L1 | Brand | Product name (working) = **TWT** — final brand TBD before launch | — |
| L2 | Brand/Scope | First launch state = **Bihar** | — |
| L3 | i18n | Languages at launch = **Hindi + English** | — |
| L4 | Platform | Mobile-first | — |
| L5 | T12 Fee | Mandatory **₹110/year** membership fee | TWT-specific; not TSCT's voluntary Vyawastha Shulk model |
| L6 | T2 Pool | Per-month per-pool contribution = **Fixed** for 12+ month periods (₹310-400 range currently) | Trustee-set, announced in advance |
| L7 | T2 Pool | Pool naming = **Mahabharata characters** (Arjuna, Bhishma, Karna, etc.) | Letters retained for backward compat |
| L8 | T3 Alert | Cycle frequency = One alert per month | — |
| L9 | T3 Alert | Contribution window = **15 days** | — |
| L10 | T2 Pool | Pool count per cycle = **= number of approved claims that month** (auto-spawned) | — |
| L11 | T2 Pool | Member pool assignment = deterministic hash, balanced — one pool per member per cycle | Audit-friendly |
| L12 | T12 Rules | Multi-nominee policy = TSCT's **75% / 25% split** (primary + secondary) | — |
| L13 | T4 Payment | Payment rails = **UPI Intent / Deep Link only** for member → nominee. **NO payment gateway for trust account in v1.** | — |
| L14 | T4 Payment | Reconciliation = member self-attests UTR; nominee pushes daily bank statement to trustee; trustee matches | — |
| L15 | T12 Rules | Refund policy = **No refunds** under any circumstance (₹110 forfeited on withdrawal) | — |
| L16 | T12 Rules | Member offboarding = permanent, no rejoining under same identity for 12 months | — |
| L17 | T12 Rules | Trust posture = **Facilitator, not financial intermediary, not guarantor. No judicial challenge accepted.** | — |
| L18 | T9 Transparency | Transparency policy: Public = member contributions, verifier names. Private = trust ledger, partner commissions, ops spend. | — |
| L19 | T7 Modules | Crowdfunding (Ketto-like) = module form, **Phase 2/3** | Requires payment gateway, PAN, 80G, 10% trust cut |
| L20 | T10 Growth | Onboarding model — Phase A (0→1L per Pariwar): **paid field workers @ ₹60-70 with attribution code**. Phase B: Adopt-a-Colleague organic | — |
| L21 | T7 Modules | First module partners = **HDFC home loan, LIC term plan** | — |
| L22 | T8 Comms | Telegram strategy = **Mirror** (in addition to in-app + WhatsApp + SMS) | Honors TSCT-migrating cohort |
| L23 | T12 Rules | Disaster handling = stretch claims over months; never panic; adjust contribution slowly, announced | — |
| L24 | T12 Rules | Retirement coverage = adopt TSCT's +1yr per 5yr policy in Terms. Retirementdaan = future _daan category | — |
| L25 | T11 Platform | Architecture = **Multi-Pariwar-ready from day 1** — `pariwar_id` first-class everywhere; one codebase; **separate app per Pariwar** | — |
| L26 | T11 Platform | Deployment = GitHub → Dokploy auto-trigger | — |
| L27 | Strategy | Competitive posture vs NSCT = not competing now (NSCT stuck at ~300 members in UP); avoid head-on conflict | — |

The full FR-candidate seed list = these 27 + the ~90 v1-M items listed under each Theme section above. (Each Theme section's v1-M bullets are the per-theme detailed decisions; this matrix captures the cross-cutting top-level ones.)

---

## Critical-Path Engineering Sequence

Decided build order with implicit dependency chain (each step typically depends on prior steps' data models):

1. **Schema design** — `pariwar_id` everywhere; multi-tenant foundation.
2. **Auth + KYC + DigiLocker + Profile** (Theme 1).
3. **Rule registry + Lock-in/90%/reactivation engine** (Theme 12).
4. **Pool Engine** — auto-spawn + Mahabharata naming + balanced assignment + fixed-amount (Theme 2).
5. **Alert state machine + 15-day window + "My Pool" card** (Theme 3).
6. **Claim flow + Verifier mesh + Trustee-Lite signals panel** (Themes 5 + 6).
7. **UPI Intent + UTR self-attestation** (Theme 4).
8. **Nominee-pushed statement intake + UTR matching reconciliation** (Theme 4).
9. **Admin UI core:** RBAC + Audit log + News/Blog + Bulk ops + Helpdesk (Theme 6).
10. **Field-worker attribution + Adopter chain + Funnel analytics** (Theme 10).
11. **Survey/poll feature** (Theme 6).
12. **Module Marketplace foundation:** manifest + shelf + targeting + time-bomb (Theme 7).
13. **Communication:** in-app push + WhatsApp + SMS + Telegram mirror via alert object (Theme 8).
14. **DPDPA compliance:** export, RTBF, consent registry (Theme 12).
15. **Public pages:** Member Directory, In Memoriam, Support Drive (current + archive), Detail, Blog (Theme 9).
16. **Security:** Cloudflare, rate limits, PII shielding, anti-scrape (Theme 13).
17. **First 2-3 partner modules:** HDFC home loan, LIC term plan, health-camp pilot (Theme 7).
18. **Tone-guide + copy review** (Theme 8).

**Estimated v1 effort:** 18–26 weeks with 4–6 person team (depends on prior multi-tenant SaaS + KYC + UPI + Indian regulatory experience).

**Top three engineering risks:**
1. Pool Engine correctness (math, balance, audit reproducibility, edge cases).
2. Reconciliation pipeline (nominee statement intake, UTR matching, dispute handling).
3. RBAC + multi-tenant data isolation (one bug = data leak across Pariwars/states).

**Implicit dependency notes:**
- Steps 4-8 form the core mutual-aid loop and must ship together to have any product.
- Step 1 (`pariwar_id` schema) gates ALL subsequent steps — cannot be retrofitted cheaply.
- Step 3 (Rule registry) gates Step 4 (Pool Engine), Step 5 (Alert eligibility), Step 6 (Claim eligibility).
- Step 9 (Admin UI) is technically parallel-buildable but practically needed early for ops onboarding.

---

## Rejected Alternatives with Rationale (Addendum material)

These are explicit "considered X, chose Y because Z" decisions — they belong in addendum.md, not the PRD:

| Rejected | Chosen instead | Rationale |
|---|---|---|
| **Public trust ledger** (Open-Books #1) | Public = member contributions + verifier names only | Political risk |
| **"What your ₹110 bought" annual statement** (Open-Books #3) | Private trust ledger | Political risk |
| **Partner commission disclosure** (Open-Books #4, Module-Mart #4) | Commissions kept private | Political risk |
| **UPI Autopay for ₹110 renewal** (WI-17) | Manual UPI Intent renewal | No payment gateway for trust money |
| **WhatsApp-only signup** (WI-22) | Full KYC mandatory at signup | Fraud control |
| **Public-to-nominee direct donations** (original WI-43/44) | Crowdfunding Module (Phase 2/3, gated) | Recipient fraud-money exposure |
| **Math Health dashboard for Pariwar founders** (WI-47) | Operational dashboards in admin UI | Too operational |
| **Pool-Sys #3 mid-alert reassignment** | Late deaths spill into next cycle | Reassignment too disruptive |
| **SC-1 weighted-by-tenure assignment** | Pure balanced hash | Audit simplicity |
| **SC-2 rolling 30-day windows per claim** | Calendar-month cycle | Operational simplicity |
| **SC-3 multi-pool proportional split** | One member, one pool per cycle | Audit simplicity |
| **SC-4 Adopter+Pool combining (fixed pairing)** | Pure balanced hash | Removes attribution gaming risk |
| **SC-6 Cross-Pariwar pool merging in early stages** | Per-Pariwar isolated pools | Premature aggregation |
| **SC-7 rare-context member prioritization** | Equal treatment | Fairness |
| **SC-8 insurance "experience rating" by district** | Flat fee/contribution | Mutual-aid posture, not insurance |
| **SC-10 shrink pools to 1000 members** | Pool size = function of approved claims (auto-spawn) | Math follows reality, not target |
| **SC-11 single national mega-pool** | Per-Pariwar pools, possibly state-scoped | Governance + trust scale |
| **SC-12 tenure-bracketed contribution amounts** | Fixed amount for all members in a pool | Simplicity, perceived fairness |
| **SC-16 eliminate monthly cycle** | Monthly cycle retained | Operational cadence proven by TSCT |
| **SC-19 member-choice pool browsing** | Deterministic hash assignment | Removes selection-bias gaming |
| **SC-20 nominee contributes first to activate claim** | Trustee approves claim, then pool spawns | Grief-aware UX |
| **SC-21 personal-coalition pre-formed pools** | Hash-based fresh assignment | Anti-cliquing |
| **Self-Svc #2 DigiLocker KYC for nominee changes** | Member-only KYC; nominee no KYC | Matches bank norms |
| **WI-18 lapsed-member social re-engagement** | Out of scope | Focus discipline |
| **WI-20 dispute SLA enforcement** | OverPay facilitated flow (mediator, not enforcer) | Trust posture |
| **Full Kanban claim board for v1** | Trustee-Lite list+signals | List works for v1; Kanban v2 |
| **Account Aggregator reconciliation for v1** | Manual UTR matching | Manual fine until scale demands |
| **Kinship-network seeding as primary cold-start** (WI-21) | Paid field workers first; kinship/Adopt-a-Colleague Phase B | Math floor demands paid acquisition first |

---

## Open Questions / Unresolved

From explicit "Open Questions Still to Resolve" section:

1. **Naming finalization** — "TWT" vs "Shikshak Parivar" vs other. Defer to before launch.
2. **NSCT positioning** — clarify if/when TWT competes in non-UP states.
3. **Pool scope per Pariwar** — TWT v1 = state-scoped; Rail Parivar = national. Make scope a Pariwar config from day 1. (ASSUMPTION: scope dimension is a Pariwar-level config.)
4. **First partner deal terms** — commission %, lead/conversion tracking, exclusivity clauses with HDFC and LIC.
5. **Bihar field-worker recruitment plan** — how many, where, comp structure beyond ₹60-70/teacher.
6. **₹110 fee model** — confirm mandatory (vs. TSCT's voluntary ₹50→₹75 Vyawastha Shulk); decide handling for first-month grace.
7. **DPO appointment + privacy policy drafting** — legal track.
8. **App naming on stores** — "TWT" vs "Shikshak Parivar"? Branding decision affects ASO.

Additional implicit unknowns surfaced in extraction:
- Field-worker compensation: range "₹60-70" given but exact mechanism (per-member? per-month? bonus structure?) not fully specified.
- "12+ month periods" for fixed contribution amount — exact review cadence not specified.
- Bilingual rollout: order of additional regional languages beyond Hindi/English not prioritized.
- "12 default seeded roles" — the 12 are not enumerated in the brainstorm.

---

## Vocabulary (Glossary seeds)

**Pariwar terminology:**
- **Pariwar** / **Parivar** — "family"; used as the suffix for each welfare community tenant (TWT teachers, Rail Parivar, Bank Parivar, Public Servants Parivar).
- **Pariwar-Passport** — cross-Pariwar master identity profile (data model in v1, UI in v2).
- **TWT** — Teachers Welfare Trust (current working name; final brand TBD).
- **TSCT** — Teachers Self-Care Trust (the reference/predecessor organization at tsctup.com).
- **NSCT** — competing trust in UP (~300 members); explicitly non-competitive posture for now.

**Mahabharata pool names:**
- **Arjuna, Bhishma, Karna** (and others) — pool naming convention for monthly cycle pools. Letters (presumably A, B, K…) retained for backward compat with TSCT.

**Support categories (TSCT-derived / future _daan):**
- **Niyamavali** — rulebook (versioned, public, with diff view).
- **Sahyog Vivran** — per-claim support drive detail page.
- **Vyawastha Shulk** — TSCT's voluntary membership fee model (₹50→₹75); explicitly NOT adopted by TWT (mandatory ₹110/yr instead).
- **Vyawastha Subscribers** — page reserved for if/when Vyawastha-style fee is added (v2).
- **Kanyadan** — future support category (girl-child / marriage support); engine reuse, v2-v3.
- **Jivandan** — future support category (life-giving); engine reuse, v2-v3.
- **Retirementdaan** — future support category for retirement-period coverage; v3.
- **_daan** — generic suffix indicating a categorical support program; engine parameterized for reuse.

**Member / claim lifecycle terms:**
- **Lock-in period** — pre-eligibility period before a member's nominee can claim (general death = 12 months from Mar 2025; per TSCT rule R7A-G).
- **90% contribution rule (R8)** — minimum participation threshold; R8A = one-skip-per-year allowance; R8B = mid-contribution-death handling.
- **R5(C)** — medical pause rule (formalizes ad-hoc TSCT practice).
- **Medical pause** — formal workflow to suspend a member's contribution obligations during medical episodes.

**Payment / financial terms:**
- **UPI Intent / Deep Link** — the only payment rail member → nominee in v1.
- **UTR** (Unique Transaction Reference) — member self-attests after payment; trustee matches against nominee bank statement.
- **Contribution Note** (NOT "receipt", NOT "invoice") — PDF given post-payment; legal positioning preserved.
- **VPA** — Virtual Payment Address; UPI Intent pre-fills this for pool-bound payment enforcement.

**Identity / role terms:**
- **eHRMS ID** — government teacher HR identifier; manual entry only (no auto-fetch).
- **DigiLocker KYC** — primary identity verification at signup.
- **Block / district / state / pariwar / global** — the five scope dimensions for RBAC grants.

**Onboarding terms:**
- **Adopt-a-Colleague** — organic referral mechanism (Phase B onboarding, ≥1L members).
- **Adopter badge tiers** — Seedling / Sapling / Grove / Forest / Banyan (v2).
- **Attribution code** — 6-digit random code given to field workers; entered at signup for tracking.

**Tone / address:**
- **सम्मानित साथी / colleague** — preferred member address (never "user").

**Architecture terms:**
- **pariwar_id** — multi-tenant discriminator on every relevant table.
- **Dokploy** — chosen CI/CD platform (GitHub → Dokploy auto-trigger).

**Trust posture phrases (verbatim):**
- "**Facilitator, not financial intermediary, not guarantor.**"
- "**No judicial challenge accepted.**"
- "Member impact framing" / "Pool-Reality #1" — under-funded cycles deliver actual collection with no top-up.

---

## Extraction provenance notes

- Brainstorm document is 489 lines, well-structured, with explicit tables.
- 13 themes are explicitly numbered and named in the source.
- "85 locked decisions" claim from brief: explicit table = 27 rows; v1-M items across all 13 themes = ~90 individual locked items. Combined ≈ 115+ decisions; the "85" figure is plausible if one counts only the most material lock-ins.
- One area where source is LESS structured than the brief implies: the 12 default RBAC roles (ADM-3) are not enumerated; PRD will need a follow-up question.
- One area MORE structured: the killed/deferred list is exhaustive and clearly labeled, giving strong addendum material.
