---
title: Product Brief — TWT (Teachers Welfare Trust)
status: final
created: 2026-05-22
updated: 2026-05-22
audience: internal-team-handoff
---

# Product Brief: TWT (Teachers Welfare Trust)

## Executive Summary

TWT is a member-funded mutual-aid platform for Indian government teachers: when a member dies, their nominee receives a meaningful sum (~₹50 lakh target) raised directly from the membership through a single monthly contribution cycle. The model is proven — Uttar Pradesh's TSCT has distributed ~₹247 crore to 556 families since 2020 — but it is structurally UP-bound, lacks a usable mobile experience, and depends on manual screenshot-receipts for every transaction. Outside UP, teachers have no equivalent. NSCT, the obvious national-scale attempt, has stalled at ~300 members.

The opening is real. The execution gap is large. TWT v1 is the **first instance** of a deliberately multi-tenant "Pariwar Platform": one codebase that will later host Rail Parivar (~13L railway employees), Public Servants Parivar (~30L central govt employees), and other sectoral mutual-aid communities — each as its own app + brand + scope, all running on shared infrastructure.

This is a solo, self-funded build — and that is the chosen strategy, not a constraint to apologize for. The product space (mutual aid, KYC, UPI, regulated trust money) rewards patience over speed. v1 ships when the first claim can close end-to-end without manual heroics, not when a runway dictates.

## The Problem

Government teachers in India face a specific, named risk: dying mid-career or in early retirement leaves a family with little. Pensions kick in late, group insurance is inadequate or absent, and ad-hoc collections (Telegram groups, WhatsApp chains) work briefly and break under scale.

TSCT solved this in UP through discipline (12-month lock-in, mandatory contributions, peer verification) and culture (Telegram-mandated, warm-formal communication, district-level field tiers). The result works, but is hard to replicate:

- **Geography:** UP-only. A Bihar teacher cannot join TSCT. An MP teacher cannot.
- **Mechanics:** screenshot-receipts uploaded manually after every payment. The UX is friction-by-default.
- **Channel dependency:** Telegram-mandatory excludes anyone who doesn't or won't use it.
- **No mobile-native experience:** the existing TSCT app exists but is "not great UX but working."
- **No scaffolding for other communities:** TSCT is a single trust for one cadre in one state. The model isn't packaged.

Meanwhile NSCT, the national expansion, has not produced sustained growth — leaving the rest of India structurally underserved by a model that demonstrably works.

## The Solution

TWT is a mobile-first member-app + admin-UI + website, architected from day one as a multi-Pariwar platform but launched as a single trust serving Bihar teachers.

**The core loop** (v1):
1. Teacher signs up, pays ₹110/year mandatory membership fee, optionally enters a reference code (paid field worker or peer adopter). KYC fields are captured manually at launch and validated by trustees; DigiLocker integration switches on — and becomes mandatory — once provider approval lands.
2. Each month, the trust approves N claims from deceased members' families. The system auto-spawns N pools (named after Mahabharata characters), and deterministically assigns every active member to exactly one pool.
3. Member opens the app, sees their assigned pool ("My Pool" card), gets nominee bank/UPI details, pays a fixed amount (~₹310–400, trustee-set, announced 12+ months in advance) via **UPI Intent** directly to the nominee. No gateway. No trust intermediation of the contribution.
4. Member self-attests UTR after payment. Nominee pushes daily bank statement to the trustee; the reconciliation engine matches UTR to deposit automatically. Screenshot upload stays as an optional fallback and is forced only on UTR mismatch (see Differentiation).
5. Cycle closes Day 15. Nominee receives ~members × fixed_amount. Public contributor list updates. Educational follow-up goes out.

**Around that loop** sits a flexible RBAC admin UI (12 default roles, scope dimension on every grant, audit log), a module marketplace (HDFC home loan, LIC term plan as first partners — revenue without ever asking the teacher for more money), a peer + ground verification mesh for claims, a public transparency layer (member contributions, verifier names — never trust ledger, never operational spend), and the multi-tenant scaffolding (`pariwar_id` first-class everywhere, branding bundles, separate per-Pariwar app builds from one codebase).

Operational depth — 13 themes, ~85 locked decisions, critical-path engineering sequence — is captured in `_bmad-output/brainstorming/brainstorming-session-2026-05-20-1609.md` and the rules/reference model in `_bmad-output/research/tsct-reference-learnings.md`. The PRD will draw from those directly.

## What Makes This Different

This product does not have a technical moat, and the brief should not pretend it does. The real differentiation is a set of choices most builders won't make:

- **Multi-Pariwar from day 1.** TSCT is a single trust; TWT is the first instance of a platform. `pariwar_id` is first-class on every multi-tenant table from the first commit. When Rail Parivar or Bank Parivar follows, it is a config + branding + provisioning job, not a rewrite.
- **No payment gateway for trust money in the support-pool flow.** UPI Intent only, member → nominee directly. The trust never holds support money. The posture — facilitator, not financial intermediary — is made structural, which removes an entire regulatory surface (PMLA, KYC-of-donor, trust-account fraud exposure) that any "modernize TSCT with Razorpay" approach inherits. A payment gateway enters the product only when the Crowdfunding Module ships in Phase 2/3, scoped strictly to that flow (public donor → trust → nominee, with 80G receipts) — never to the monthly contribution cycle.
- **Automated reconciliation without losing the direct-transfer model.** TSCT's pain point (mandatory screenshot upload for every contribution) is solved by member UTR self-attestation + nominee-pushed daily bank statements + a UTR matching engine. Screenshot upload still exists, but only as an optional fallback that becomes mandatory when a UTR fails to match — friction is reserved for the cases that actually need it.
- **Patience as discipline.** Slow burn is the build strategy. v1 ships when the first end-to-end claim closes cleanly, not on a runway-dictated date. Multi-Pariwar expansion happens when the first Pariwar's math works, not when a deck slide demands it.
- **Trust posture codified in the product.** "Facilitator, not guarantor. No judicial challenge accepted." This isn't fine print — it's reflected in the UX (Contribution Note, never "receipt" or "invoice"), in the rules engine (under-funded cycles deliver actual collection, no top-up), and in the transparency policy (member contributions public; trust ledger private).

## Who This Serves

**v1 — Bihar government teachers.** Basic/secondary teachers, Shikshakamitra, instructors, clerical staff, BEOs, DIET lecturers, higher-ed faculty. Hindi + English bilingual. Smartphone users (mobile-first; SMS/WhatsApp fallback for late adopters). Roughly the same cadre TSCT serves in UP, in a state with no equivalent today.

**Trustees and field administrators.** People running the trust day-to-day need a flexible admin UI that replaces today's WhatsApp/Telegram chaos: claim review queues, RBAC scoped by block/district/state/Pariwar, audit logs that hold up under investigation, bulk operations, helpdesk, news/blog authoring with audience scoping.

**Adjacent (future):** Rail employees, public servants, bank employees, other sectoral cadres whose member math demands a national or large-scope pool. Architecture allows; v1 does not implement.

## Success Criteria

Two markers, sequenced:

**First — proof the system works (target: 6–9 months from v1 ship).** One claim flows end-to-end without manual heroics: death certificate uploaded → peer verification mesh + ground inspection → trustee approval → pool spawn → assigned members notified → contributions paid via UPI Intent → reconciliation matches → nominee receives funds → cycle closes → public contributor list publishes. If this happens cleanly for a single claim, the product is real.

**Second — pool-math viability (target: 18–24 months from v1 ship).** Member count approaches the threshold at which per-pool collection is meaningful (~4 lakh members in scope). At that scale, with ~₹310/pool fixed amount and ~20 pools/month, each nominee receives close to the ₹50 lakh north-star. Below that threshold, the trust is a smaller-scale aid mechanism — still useful, but not yet the model proven in UP.

Supporting signals (not gates):
- **₹110 renewal rate > 85%** year-over-year.
- **Cycle collection rate ≥ 70%** consistently (under-funded cycles are accepted per policy — but sustained low collection signals a member-engagement problem).
- **Pool reconciliation accuracy > 99%** (UTR matching catches contributions without trustee chasing).
- **Module marketplace revenue** from HDFC + LIC pilots — proof that the marketplace model produces ops funding without taxing teachers further.

## Scope (v1)

**In (must-ship for v1 to be v1):**
- Signup + ₹110 fee + manual eHRMS ID + manual KYC capture (DigiLocker integration optional at launch, switches to mandatory once provider approval lands — design KYC fields as a single data shape that either source can populate)
- Rule registry (lock-in, 90% rule, contribution discipline, multi-nominee 75/25)
- Pool engine (auto-spawn, Mahabharata naming, deterministic balanced assignment, fixed-amount over 12+ months)
- Alert lifecycle + 15-day window + "My Pool" card
- Claim flow + peer verification mesh + ground inspection + trustee-lite signals panel
- UPI Intent payment + UTR self-attestation + nominee statement intake + reconciliation engine + optional screenshot upload (force-required on UTR mismatch)
- Admin UI core: flexible RBAC, audit log, news/blog, bulk ops, helpdesk, custom fields per Pariwar
- Field-worker attribution + adopter chain + funnel analytics
- DPDPA compliance (export, RTBF, consent registry)
- Public pages: member directory, in memoriam, support drive (current + archive + detail), rulebook, blog
- Security: Cloudflare front, rate limits, PII shielding, anti-scrape
- First 2–3 partner modules: HDFC home loan, LIC term plan, health-camp pilot
- Multi-tenant scaffolding: `pariwar_id` first-class, branding config bundles, Dokploy-driven per-Pariwar deploys

**Out (deferred or killed) — see brainstorm for full list:**
- Crowdfunding/Ketto-style public donation module (Phase 2/3; needs gateway + PAN + 80G + trust cut)
- Pariwar provisioning wizard, cross-Pariwar discovery (activates with 2nd Pariwar)
- Account Aggregator reconciliation (manual is fine until scale demands it)
- Full workflow-builder Kanban claim board (list works for v1)
- Public trust ledger / partner commission disclosure / "what your ₹110 bought" statement (killed — political risk)
- Direct public-to-nominee donations (killed — recipient fraud-money exposure)
- eHRMS auto-fetch (govt API politically infeasible)
- Additional regional languages beyond Hindi + English (v2+ rollout per state)

## Constraints & Risks

This brief is honest about what it is signing up for:

- **Solo + self-funded.** The brainstorm's "4–6 person team, 18–26 weeks" baseline does not match the actual build profile. Realistic v1 ship is slower; sequencing matters more than ever. Pool Engine, reconciliation pipeline, and RBAC/multi-tenant isolation are the three subsystems where correctness cannot be compromised — everything else can be cut or simplified for v1. [ASSUMPTION: solo-build cadence understood as the trade; please correct if external help is closer than implied.]
- **Trust formation.** TWT as a legal trust entity must be registered and governed before the first ₹110 is collected. Banking, DPDPA compliance (DPO appointment, breach reporting readiness), and trustee panel formation are gating items. [ASSUMPTION: trust formation is in motion or accepted as v1-pre-launch work; not a software scope item but a hard prerequisite.]
- **Pool-math floor.** The model only pays out meaningfully at ~4L members. Below that floor, the product runs but the value proposition weakens. Bihar field-worker recruitment plan (cost, comp structure, geographic seeding) is the lever that determines whether the floor is reachable in 12–24 months or 36+. Without external funding, ₹60–70/teacher field-worker comp is a cash-flow constraint that must be modeled before recruitment scales.
- **NSCT positioning.** NSCT is real but stalled. Posture is "not competing now; bypass geographically." If NSCT activates in Bihar before TWT launches there, the differentiation story tightens.
- **Open naming question.** "TWT" is a working name; "Shikshak Parivar" is the strongest alternative. Decision needed before app store listings and brand identity work — architecture allows renaming, but ASO and trust legal docs do not.

## Vision

In 2–3 years, if v1 succeeds:

- TWT is operating in Bihar with a member base approaching the pool-math floor. Monthly cycles close reliably. First claims have paid out cleanly. The product has earned the trust required to grow organically.
- The platform layer (`pariwar_id`, branding bundles, per-Pariwar Dokploy deploys, Pariwar-Passport identity model) has been exercised by at least one additional Pariwar — most likely Rail Parivar, because its national scope and ~13L employee base most rewards the multi-tenant architecture investment.
- The module marketplace has 5–10 partners spanning financial services, health, and education-adjacent commerce. Teachers benefit; trust ops fund themselves through commissions; the teacher's annual cost stays at ₹110.
- Support categories beyond death benefit (Kanyadan, Jivandan, Vyawastha, Retirementdaan) reuse the engine rather than requiring rewrites.
- The Crowdfunding Module ships as a Phase 2/3 opt-in, proving the platform can absorb a regulated donation-flow surface without compromising the core peer-to-peer architecture.

The longer arc — a true platform hosting many sectoral Pariwars — is the right ambition, but the brief refuses to promise it on any specific clock. The next Pariwar comes when the first one's math works, not before.

---

_Operational depth (13 PRD themes, locked decisions matrix, critical-path engineering sequence) lives in_ `_bmad-output/brainstorming/brainstorming-session-2026-05-20-1609.md`. _Reference model (TSCT, Niyamavali, pool system, payment mechanics) lives in_ `_bmad-output/research/tsct-reference-learnings.md`. _Both are canonical inputs for the PRD phase._
