---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md
  - _bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/addendum.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/planning-artifacts/sprint-change-proposal-2026-05-27.md
totalStoryCount: 173
epicCount: 16
loadBearingInvariantsCount: 31
---

# TWT - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for TWT (Teachers Welfare Trust), decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories.

Inputs reconciled per the 2026-05-27 Sprint Change Proposal: the Sprint Change Proposal is authoritative only for the explicitly reconciled areas (cloud=GCP `asia-south1`, three-tier channel hierarchy with member self-declared WA opt-in, member lifecycle state model §1.14, FR-12A cache freshness invariant, FR-58C feature-flag capability bar, Edge/WAF capability bar §5.8a, helpdesk §3.5a as first-class subsystem, public pages composition contract §Member-Responsive Web Deferral, FR-20 pool-spawn capacity envelope §5.11, PRD §12 Phase 0 inherits architecture launch gates by reference). For all other areas, PRD/Architecture/UX docs are canonical.

## Requirements Inventory

### Functional Requirements

> FR identifiers and titles preserved verbatim from PRD (`prd.md`) §4 Features. Numbering is stable across reorganization. Sub-suffix FRs (FR-1A, FR-12A, FR-43A, FR-58A/B/C) carry the same authority as their main FR.

**Identity & Membership Lifecycle (§4.1)**

- **FR-1: Member signup with mandatory ₹110 Vyawastha Shulk.** A Bihar government teacher can register, complete KYC, pay ₹110, and become a member within a single app session. State machine: `pending-kyc → pending-fee → lock-in`. Eligibility-category dropdown enumerates the TSCT-cadre set; no "other". Vyawastha Shulk receipts retain `paid_at`, `valid_through`, `amount`, `utr`, `payment_method` indefinitely (forward-compat for FR-100).
- **FR-1A: Annual Vyawastha Shulk renewal with 3-month grace.** First-time signup mandatory-upfront; all renewals get a 3-month grace after expiry during which `is_active` is preserved. States: `active → active_in_grace → lapsed_unpaid`. Reminders at +30, +60, +75, +89. Restoration after grace does NOT re-apply lock-in. Validity service exposes `vyawastha_shulk_status: { paid_through, days_until_lapse, in_renewal_grace, grace_remaining_days }`. Death during grace = eligible; death during lapsed = ineligible (R10).
- **FR-2: DigiLocker KYC with manual fallback.** Aadhaar-linked photo, name, DoB pulled via DigiLocker when available; manual entry creates `pending-valid` until trustee validation. Future feature-flag flip makes DigiLocker hard-mandatory (FR-58C-gated).
- **FR-3: Lock-in clock widget on home screen (WI-13).** Topmost UI for member in `lock-in` state; shows countdown, rationale, unlock date; tap → Niyamavali entry; transitions to "My Pool" card on next alert cycle after expiry.
- **FR-4: Multi-nominee declaration with 75/25 split (R5(E)).** One or two nominees; 75/25 split when two declared; nominee identity requires NO KYC; nominee bank/IFSC NOT collected at signup (claim-time only).
- **FR-5: Life Events panel `[v1-S, except medical-disclosure which is v1-M]`.** Self-service updates: marriage, nominee declaration, address, transfer-in/out, medical disclosure. Medical disclosure is v1-M, IMA-list-driven, ack-required, audit-logged; concealment penalty wires to FR-11.
- **FR-6: Voluntary withdrawal flow.** Member withdraws anytime; ₹110 forfeited; contribution history retained; 12-month rejoin lock under same identity (Aadhaar + eHRMS).

**Niyamavali (Rules Engine) (§4.2)**

- **FR-7: Versioned per-Pariwar rule registry (Rule-Engine #1).** Every clause has `pariwar_id`, version, effective date, structured payload. Two Pariwars can have divergent rule sets. Every eligibility check audit-logged. Amendments require role `Pariwar Admin` or higher; produce diff documents; notify affected members. Each rule carries a `benefit_mechanism` discriminator (`pool` | `reserve`); v1 ships only `pool`-tagged rules.
- **FR-8: Lock-in policy — trustee-adjustable, member-count-driven ramp.** v1 launches at 30-day lock-in. Lock-in is a trustee-adjustable registry parameter; expected ramp 1mo → 3mo → 6mo → 12mo. Each member carries `lock_in_days_at_join` snapshot; new graduations do not retroactively re-lock existing members.
- **FR-9: Contribution discipline (R7(A–G)).** Carry TSCT R7(A)–R7(G) restoration rules as v1 baseline; engine logs each evaluation with rule version; thresholds re-tuneable.
- **FR-10: 90% Rule (R8) with R8(A), R8(B) sub-clauses.** Applies only after ≥10 contributions; only to illness deaths, not accidents. R8(A) 1 skip/year if prior 100%; R8(B) mid-contribution death → eligible.
- **FR-11: Special death scenarios + concealment penalty.** Carry R5(C.2), R5(D), R5(E), R5(F), R9, R9(A), Mar 2025 suicide/murder rule. Plus R14-adapted concealment denial: undeclared IMA-listed illness linked to death → engine flags for State Trustee review (never auto-deny).
- **FR-12: Retirement coverage extension.** After 5 years valid membership, +1 year post-retirement coverage; each additional 5y adds 1y (15y → +3y). Computed on-the-fly from `joined_at` + `retired_at`.
- **FR-12A: Member Validity Service (real-time eligibility evaluation).** Deterministic, idempotent, audit-logged service over the rule registry. Returns canonical status payload (lock_in_status, vyawastha_shulk_status, contribution_history, medical_disclosure, retirement_coverage, special_flags, applicable_niyamavali_clauses). Called by every admin surface and the member's own profile. p95 < 200ms at 4L scale. **Cache freshness invariant:** validity reflects any Niyamavali amendment or member-state change within ≤ 60 seconds; per-cohort invalidation optimization permitted with conservative all-members fallback when scope confidence insufficient (per Sprint Change Proposal Item 5).

**Pool Engine (§4.3)**

- **FR-13: Auto-spawn N pools per cycle (SC-18).** At cycle freeze, engine creates one pool per approved claim; N immutable thereafter. Pool `display_name` from a trustee-curated culture-rooted ordered list (Mahabharata seed + extensions); letter codes (A, B, C…) retained for backward compat. Curated list ≥ 30 names pre-launch.
- **FR-14: Deterministic balanced member-to-pool assignment.** `pool_index = hash(member_id + cycle_id) % N`. Audit-reproducible from `(member_id, cycle_id)` alone. Pool sizes differ by ≤ 1.
- **FR-15: Fixed-amount per pool over 12+ month periods (SC-17).** Trustee-set amount; changes announced ≥ 12 months in advance; each pool's `fixed_amount` snapshotted at spawn.
- **FR-16: Pool-bound payment enforcement (Pool-Sys #2).** UPI Intent pre-fills assigned pool's VPA. Non-assigned-pool deposits are reconciled as wrong-pool/invalid; no refund; facilitated (not enforced) helpdesk recovery.
- **FR-17: Idempotent payment reference (UPI-Track #4).** `tr=` unique to `(member_id, alert_id)`; repeated payments idempotent (one valid contribution).
- **FR-18: Amount-lock at UPI Intent (OverPay #5).** Amount pre-filled; reconciliation rejects amount ≠ fixed_amount.
- **FR-19: Under-funded cycle behavior + close-of-cycle messaging (Pool-Reality #1, #2).** Actual collection delivered to nominee; no top-up. Close-of-cycle copy template-driven; celebrates actual outcome; comparison-to-target framing disallowed.
- **FR-20: Engine parameterized for future _daan reuse (SC-13).** Each pool carries `support_category` discriminator (v1 ships `death_support`); engine has no death-specific branches. **Pool-spawn capacity envelope:** N=50 / M=4L spawn < 60s p95; saga decomposition (parent → N child jobs); pre-launch measured-validation gate required (per Sprint Change Proposal Item 15).

**Alert Lifecycle & Monthly Cycle (§4.4)**

- **FR-21: "My Pool" home-screen card (WI-31).** Top home-screen element when alert is `live` and member assigned. Shows pool name, nominee first-name + last-initial, contribution amount, days remaining, primary CTA (Pay via UPI).
- **FR-22: Alert state machine.** `draft → frozen → published → live → closed → settled`. Role-gated transitions; audit-logged.
- **FR-23: Structured `alert` object → multi-channel render (WI-37).** One canonical payload renders across in-app push, WhatsApp Business (dual-gated), Telegram mirror; SMS only for OTP/step-up/fallback per architecture §2.2, §3.4.
- **FR-24: Real-time per-pool live contributor list (member-facing).** First-name + last-initial only; updates with reconciliation confirmation (not on UTR self-attestation alone).
- **FR-25: Pending contributors per pool `[v1-S]`.** Member-only peer-accountability signal.
- **FR-26: Real-time progress meter + personal deadline countdown `[v1-S]`.** Per-pool progress (no shortfall narrative); personal countdown on home screen during live alert.

**Payment, UTR Self-Attestation & Reconciliation (§4.5)**

- **FR-27: UPI Intent payment flow (UPI-Track #1).** Pre-fill `pa=`, `am=`, `cu=INR`, `tr=`, `tn=`, `mc=`. Per-app guidance for detected UPI apps (BHIM, PhonePe, GPay, Paytm).
- **FR-28: UTR self-attestation post-payment.** UTR 12-digit numeric or 22-char alphanumeric; client-side format validation; status: `submitted → pending_match → confirmed | mismatch`.
- **FR-29: Nominee-pushed daily bank statement intake (UPI-Track #5).** Trust receives nominee daily statement (PDF or CSV); parsed deposits exposed: `{datetime, amount, sender_name, sender_VPA?, UTR, narration}`.
- **FR-30: UTR matching engine (reconciliation cron).** Cron N times/day (default 6×/day during live alerts). Primary match by UTR; secondary by amount + sender VPA + timestamp. 48h after self-attestation without match → `mismatch`; screenshot upload becomes mandatory.
- **FR-31: Dual nominee bank accounts (RBI UPI limit workaround).** Every approved claim records two accounts at claim-time; UPI Intent defaults to account #1 with switch link; reconciliation matches both; both must have valid IFSC + verified account-holder name before `frozen`.
- **FR-32: Screenshot upload as forced fallback on UTR mismatch.** Upload UI hidden in happy path under "Trouble with UTR?"; mandatory only on `mismatch` flag or explicit NEFT fallback.
- **FR-33: Contribution Note PDF (WI-30 — legal positioning).** Never "receipt" or "invoice". Includes member name, contribution date, pool name, alert ID, amount, nominee acknowledgement, Niyamavali version, watermark with donor ID (`[v1-S]`). Legal-reviewed copy.
- **FR-34: UPI failure coach with per-app guidance `[v1-S]`.** If UPI Intent returns without UTR, show PhonePe/GPay/Paytm screenshot examples.
- **FR-35: Retry queue with 4-hour reminders (WI-34) `[v1-S]`.** `pending_match` > 4h → soft reminder; > 24h → escalated.
- **FR-36: Over-payment self-report + auto-drafted polite recovery `[v1-S]`.** Trust facilitates, never enforces.

**Claim Flow, Peer Verification & Ground Inspection (§4.6)**

- **FR-37: Claim filing with nominee bank entered at claim-time.** Open to nominee regardless of TWT membership. Bank #1 + IFSC #1 + account-holder name #1; same for account #2. Account-holder validated against bank IFSC lookup (penny-drop deferred `[v1-S]`). Claim enters `under_verification`.
- **FR-38: Death certificate upload + OCR parity check (Verify-Mesh #2).** OCR compares deceased name + DoB to TWT profile; mismatch → trustee manual review, never auto-reject.
- **FR-39: Peer first-witness verification — 5 nearest members (Verify-Mesh #1).** Deterministic selection: district > block > school proximity; ties by `member_id`. Each ping + response logged. Verifier names published with profile-links on Sahyog Vivran. Non-response 72h → escalate.
- **FR-40: Ground inspection retained alongside peer mesh.** BOTH peer mesh AND ground inspection must pass to advance to State Trustee approval. Not either/or.
- **FR-41: Human shepherd assigned per claim (WI-26) `[v1-M]`.** District Admin scope assigned to every claim entering `under_verification`. Shepherd contact (name + phone + WhatsApp) on claim status page and confirmation. Self-assignment prohibited. Reassignment audit-logged. Shepherd inbox/dashboard/load-balancing/handoff UI is `[v1-S]`.
- **FR-42: Member status banner on claim review (WI-39).** Trustee-Lite signals panel loads in ~5s: KYC validity, Vyawastha Shulk status, contribution history + 90% rule, last login, attribution chain, claim history, lock-in status, special-rule flags. One indexed query; no N+1. Approve/Reject/Escalate actions require brief rationale text (audit-logged).
- **FR-43: Special-case routing per Niyamavali R9.** Suicide / murder-with-nominee-accused / multiple-deaths-same-date / foreign-death → State Trustee voting workflow. Rule-engine-driven (FR-7), not hardcoded.
- **FR-43A: Internal claim-denial appeal flow (v1-M).** Structured `denial_reason` (Niyamavali clause + free-text). Three-stage appeal: Stage 1 = District Admin review (different individual from original decision); Stage 2 = State Trustee panel vote (majority per R9); Stage 3 = Trustee discretion (R5(D), R10(D)). Post-approval reversal decisions publicly visible on Sahyog Vivran; denials only visible to family + audit. Separate from FR-43 (pre-decision R9 voting).

**Admin UI — RBAC, Audit, News/Blog, Bulk Ops, Helpdesk (§4.7)**

- **FR-44: Flexible RBAC — permission keys + role bundles (ADM-1).** Permission key per admin action; roles are bundles; `has_permission(user, permission_key, target)` with target scope.
- **FR-45: Scope dimension on every grant (ADM-2).** `block | district | state | pariwar | global`. Server-side enforcement on every privileged endpoint.
- **FR-46: 12 default seeded roles, editable (ADM-3).** Super Admin, Pariwar Admin, State Trustee, District Admin, Block Admin, Finance Officer, IT Cell, Media/Comms, Field Worker, Verifier, Auditor, Helpline Operator. Trustee Panel confirms or revises pre-launch (OQ-3).
- **FR-47: Audit log — attributable, tamper-evident, 7-year retention (ADM-5).** Append-only; hash-chain (`this_hash = sha256(prev_hash + canonical_serialization(this_entry))`); daily integrity check job. Off-site mirror to Object-Retention-Locked Cloud Storage (per architecture §1.5, GCP `asia-south1`) every 6h. External Merkle-root publication via signed Telegram-mirror post is `[v1-S]`. Exportable for investigation under role `Auditor`. Single DB-access engineer cannot silently tamper (mirror chain breaks; 24h detection).
- **FR-48: Permission delegation with date range + audit (ADM-4) `[v1-S]`.** Date-range delegation; audit-logged; revocable.
- **FR-49: Bulk operations everywhere (ADM-11).** Member upload (CSV with field mapping), message send, status change, module activation, claim approval-at-freeze, contribution status review. Dry-run preview; one audit line per item w/ shared `batch_id`; scope-respecting; 5,000-item limit (configurable); per-item failures don't roll back batch; downloadable error CSV. Bulk claim approval-at-freeze gated on State Trustee.
- **FR-50: Reconciliation review queue (UTR mismatch triage).** Queue ordered by alert deadline proximity. Confirm → `confirmed`; reject → `invalid` + notify.
- **FR-51: News/Blog — dual surface (public + member feed) (ADM-6, 7, 8, 9).** `draft → review → publish` w/ author ≠ reviewer. Audience: `public | members-all | state | role | cohort`. Scheduled publishing. Per-post push channel selection (in-app, WhatsApp, Telegram). Comments disabled by default. Hindi + English required for public/members-all scoping.
- **FR-52: Helpdesk / ticket system (ADM-15).** Categories: KYC trouble, payment-failed, UTR-mismatch, claim-status, profile-update, Niyamavali-question, partner-module-issue, complaint, other. Auto-routing category × scope → primary assignee role. SLA: first-response 24h; resolution 5 biz days (10 for Niyamavali). States: `open | in_progress | awaiting_member | resolved | reopened`. Auto-close on resolved after 7 days no member reply; reopen within 30 days post-close. **Helpdesk is a first-class architectural subsystem** distinct from telephony per architecture §3.5a; backend `apps/api/modules/helpdesk/`, admin UI `apps/admin/modules/helpdesk/`, contracts `packages/contracts/helpdesk/`.
- **FR-53: Field-worker dispatch (mobile-first) (ADM-16).** Mobile-first UI on mid-range Android (Snapdragon 4-series, 3GB RAM); offline view, online writes. Surfaces own attribution code, attributed members + qualification states, commission pipeline. RBAC scope = `field_worker_self`. Push on member crossing qualification step. Flag "unreachable" action. Audit-logged per session.
- **FR-54: Custom fields per Pariwar via JSON columns (ADM-17).** Per-Pariwar JSON-column-based custom fields on member, claim, pool.
- **FR-55: Trustee fixed-amount setter + announcement workflow.** Effective date ≥ now + 12 months per FR-15. Drafts copy; selects channels; schedules publish.
- **FR-56: Member moderation — suspend, terminate, restore.** Transitions: `active ↔ suspended → terminated`. Reasons audit-logged: R7-sub-clause, R14 forgery, R10(A) office-bearing, concealment-flag confirmed, helpdesk abuse. Termination recoverable only via trustee-explicit reinstatement; 12-month rejoin lock per FR-6.
- **FR-57: Trustee-Lite list + signals (v1 alternative to full Kanban).** List sorted by stage + deadline; FR-42 signals on hover/tap. Full Kanban v2.
- **FR-58: Survey/poll authoring + results dashboard `[v1-S]`.** Optional quorum threshold; render in member feed; aggregate results.
- **FR-58A: Reports & exports library (ADM-12).** Pre-built reports (monthly contribution rate, under-collection trigger watch, attribution funnel, reconciliation queue throughput, claim cycle-time, field-worker payout summary, helpdesk SLA, audit log query). Role-scoped; scope-respecting exports; one audit line per export; CSV + JSON formats; Excel/PDF `[v1-S]`; async generation above threshold with in-app push notification.
- **FR-58B: Banner / popup manager (ADM-13).** Scope/cohort-targeted in-app banner or full-screen popup (one at a time per surface). Hindi + English variants. `valid_from`/`valid_until` auto-archive. Popup dismiss action required; display-once-per-member rule configurable. Audit-logged.
- **FR-58C: Feature flags per cohort (ADM-14).** Per-cohort flags by `pariwar_id`, scope, role, or arbitrary cohort tag. DigiLocker hard-mandatory switch (FR-2) is canonical use case. Audit-logged. Deterministic + fast evaluation (< 5ms). Flag inventory visible to Pariwar Admin and above; no "secret" flags. **Tool selection deferred to ADR; capability bar:** deterministic evaluation, tenant isolation, replay safety, auditability, offline resilience, lifecycle accountability (owner + dead-by date), DPDPA-compatible posture (per architecture Deferred Decisions §P1 + Sprint Change Proposal Item 9).

**Multi-Pariwar Platform Architecture (§4.8)**

- **FR-59: `pariwar_id` first-class on every multi-tenant table.** DB-level non-nullable FK; every query filters by `pariwar_id`; every endpoint resolves from auth context. Adversarial cross-Pariwar read test in CI.
- **FR-60: Per-Pariwar branding config bundle.** Logo, color tokens, copy strings, Niyamavali ID, app icon, app name, store metadata. Single file/directory loadable at build time. Two Pariwars can ship simultaneously with no shared production assets.
- **FR-61: Separate app per Pariwar — N build configs, N store listings.** CI/CD produces N App Store / Play Store builds from one codebase. New Pariwar = branding bundle + CI matrix entry.
- **FR-62: GitHub → Dokploy auto-deploy (v1); Kubernetes migration path documented.** Backend services packaged as container images day 1; 12-factor config; secrets abstracted; migration runbook owned by Solo Builder; trigger = 2nd Pariwar OR sustained ≥ 70% peak-cycle infra utilization.
- **FR-63: Pariwar-Passport data model present (UI deferred to v2).** Cross-Pariwar identity object (`pariwar_passport_id`) exists in data; UI v2.

**Module Marketplace (§4.9)**

- **FR-64: Module manifest schema + storage (Module-Mart #1).** `{module_id, title, description, eligibility_filter, scope_filter, valid_from, valid_until, slot_capacity?, target_url_or_form, partner_id, commission_terms (private)}`.
- **FR-65: Module shelf UI for members (Module-Mart #2).** Eligible-modules shelf below My Pool. Cards → details → CTA. Filter applies eligibility_filter + scope_filter + time window. Slot capacity decrements; auto-archive at zero. **Suppressed in all account-frozen states** (Stance #1).
- **FR-66: Admin module-targeting wizard (Module-Mart #3).** Select Pariwars (cross-Pariwar v2), scopes, member filters, validity window, slot capacity, CTA destination, commission terms.
- **FR-67: Time-bombed lifecycle (TimeBomb #1).** Auto-archive at `valid_until` or `slot_capacity == 0`.

**Communication & Brand Voice (§4.10)**

- **FR-68: Bilingual content with i18n hooks.** Hindi + English variants on every member-facing string. Language switcher in profile. Hindi default for Bihar v1. No hardcoded English strings. Niyamavali separate Hindi/English versions, both versioned.
- **FR-69: Tone guide enforced via copy review (WI-29, Trust-Voice #1).** Every member-facing string passes copy review. Address: **सम्मानित साथी** / **colleague**. Never "user", "customer", "donor".
- **FR-70: Multi-channel render from single alert object (WI-37).** See FR-23.
- **FR-71: In-app push notifications — primary delivery.** Push tokens registered on app install. Categories: alert-published, alert-deadline-reminder, contribution-confirmed, contribution-mismatch, claim-status-change, helpdesk-reply, module-new.
- **FR-72: WhatsApp Business API integration `[v1-S]`.** Per-Pariwar admin-toggle. Templates for alert announcements, deadline reminders, contribution confirmations. **Dual-gated:** admin toggle AND member self-declared opt-in via user-initiated WA message to the Pariwar's WA Business number (per architecture §3.4 + Sprint Change Proposal Item 2). Scope: Meta UTILITY templates only.
- **FR-73: Telegram channel mirror `[v1-S, but locked]`.** TSCT-cohort honor channel; fire-and-forget mirror of alerts.

**Public Pages, Transparency & PII Shielding (§4.11)**

- **FR-74: Public-vs-Private matrix codified (§35.1).** Public (no auth): Member Directory (first-name + last-initial + school + district + designation), Sahyog Drive listings, Sahyog Vivran (per-claim story + verifier names hyperlinked + contributor count + first-name + last-initial contributors), In Memoriam, Niyamavali w/ version diff, public Blog, About/Founders/Team, Contact. Members-only: full member lookup, nominee bank/IFSC during active alert window only, contribution history. Never public: trust account ledger, partner commissions, internal expenses, full mobile/email/address/DOB, raw photo. CI scrape-test asserts no PII leak.
- **FR-75: Member Directory with PII shielding.** First-name + last-initial only. Forced pagination. `noindex` on member detail pages.
- **FR-76: Sahyog Drive — Active + Archive.** Active page near-real-time during live alert. Archive paginated; searchable by month/pool name/nominee state; no bulk export.
- **FR-77: Sahyog Vivran (per-claim story).** Family story (human-written; no AI v1); verifier names with profile hyperlinks (public scope); contributor count; total raised; close-of-cycle celebration framing (FR-19). Trust-reviewed before publish. **Composition contract** (per architecture §Member-Responsive Web Deferral + Sprint Change Proposal Item 12): cache-safe public SSR shell + registry-declared authenticated fragments (nominee bank account + IFSC + payment status + UPI Intent CTA deep-link to `apps/mobile/`); auth boundary at API (`apps/api/modules/public-pages/`), not edge.
- **FR-78: In Memoriam.** Roll of deceased members; first-name + last-initial + school + district + designation. Respectful framing.
- **FR-79: Niyamavali public page with version diff.** Public render; amendment produces public diff.
- **FR-80: English-first labels with Hindi parity (renaming TSCT terms).** Page titles, navigation, UI labels in English w/ Hindi parity. Hindi proper nouns retained (Sahyog, Niyamavali, Vyawastha Shulk).

**Growth, Field Worker Attribution & Onboarding (§4.12)**

- **FR-81: Field worker random 6-digit code (FieldWorker #1).** Generated on admin "Add Field Worker"; unique per Pariwar.
- **FR-82: Optional Reference Code field at signup (FieldWorker #2).** 6-digit numeric, member username/eHRMS, or empty. Parsed and stored as `attribution_source`.
- **FR-83: Attribution analytics dashboard (FieldWorker #3).** Funnel by source: signups → KYC complete → ₹110 paid → first contribution → qualified.
- **FR-84: Field worker payment trigger (FieldWorker #4).** Commission only on KYC + ₹110 + first valid contribution. Monthly disbursement batch; per-worker statement. ₹65/qualified acquisition (A-8).
- **FR-85: Field worker lifecycle (FieldWorker #5).** Deactivation preserves existing attributions; new attributions on deactivated code rejected.
- **FR-86: Anti-fraud throttling on attribution code `[v1-S]`.** Code usage > X/day or > Y unique devices → trustee review flag.
- **FR-87: Adopter chain attribution (Adopt #1).** Reference Code = member username/eHRMS → chain captured. No commission flow in v1 (Phase B v2 activation at ≥1L members). UX promotes share-sheet path to v1-M per UX §7.

**Security, PII Shielding & Anti-Scraping (§4.13)**

- **FR-88: Cloudflare front + Bot Management + Turnstile.** All public traffic via Cloudflare; Turnstile on signup, claim filing, helpdesk forms. **Edge/WAF capability bar** per architecture §5.8a + Sprint Change Proposal Item 10: rate limiting, bot management + challenge, ingress signature verification, edge-only ingress, DPDPA-compatible, observable metrics. Pivot path to self-hosted WAF if Cloudflare-DPDPA incompatible.
- **FR-89: Rate limiting (IP / session / endpoint).** Strict on auth, write, search.
- **FR-90: Login wall for sensitive data.** Nominee bank/account display gated on auth AND active-alert-window check.
- **FR-91: Forced pagination, no bulk export from public surfaces.** `?page=all` rejected. Max page size enforced.
- **FR-92: Honeypot fields in HTML, noindex on member-detail pages.** Bot traps; `<meta name="robots" content="noindex,nofollow">`.
- **FR-93: Phone/email obfuscation `[v1-S — moot per policy]`.** Never public per FR-74; obfuscation as defense-in-depth.

**Trust Posture, Compliance & DPDPA (§4.14)**

- **FR-94: Trust posture in T&C — lawyer-reviewed.** Verbatim phrasings: facilitator/not-intermediary; commitment-ethical; internal-resolution-primary-path; registration-not-membership; in-app-as-official-channel; office-bearer-disqualification; tagline. Lawyer sign-off in `.decision-log.md`. T&C version tied to Niyamavali version; member acceptance timestamped; versions persisted for audit recovery.
- **FR-95: Data export / portability (DPDPA #1).** Profile → Download ZIP. Includes profile, contribution history, attribution chain, Contribution Notes (PDFs).
- **FR-96: Right to be Forgotten — soft delete + anonymize (DPDPA #2).** Contributions anonymized; audit log not anonymized (regulatory necessity); 12-month rejoin lock; no refund.
- **FR-97: Consent registry (DPDPA #3).** Granular records: T&C version, privacy policy version, marketing comms, biometric data, photo. Revocable.
- **FR-98: Disaster-handling policy — slow-roll over months.** Trustee marks disaster window; alert engine throttles claim spawn; per-pool amount NOT raised reactively; member copy de-emphasizes urgency.
- **FR-99: DPO + breach-reporting readiness `[v1-S, activates at MeitY threshold]`.** Process + contact present; tooling for incident response; monthly compliance review.

**Future Benefit Hooks (§4.15)**

- **FR-100: Durghatana Sahayata (Accident Assistance) — forward-compat hooks only (v1).** Receipt persistence reconstructable for any past date (FR-1 indefinite retention). Payout-destination capability reserved as architectural slot only (no schema, table, column, endpoint, validator, or UI in v1). Rule registry `benefit_mechanism` discriminator (`pool` | `reserve`) shipped; no v1 rules tag `reserve`. Separate request/case entity at launch (not `claim`). Trust-disbursement audit reuses FR-47 substrate. Activation must be greenfield (new entity + endpoints), not column add to v1 tables.

### NonFunctional Requirements

> Cross-cutting NFRs from PRD §8 + feature-specific NFRs cited inline in §4. Architecture §5.12 NFR budget table supplements with measured envelope commitments.

**Performance**

- **NFR-1: App cold start < 3 s** on mid-range Android (Snapdragon 4-series, 3 GB RAM).
- **NFR-2: My Pool render < 500 ms p95** when alert is live.
- **NFR-3: UPI Intent launch < 1 s p95.**
- **NFR-4: Reconciliation latency p95 < 4 h** during live alerts (statement intake → member status update).
- **NFR-5: FR-12A Validity Service p95 < 200 ms** at fully-populated registry on ~4L active members.
- **NFR-6: FR-12A cache freshness ≤ 60 s** for Niyamavali amendments and member-state changes.
- **NFR-7: Pool spawn p95 < 60 s** at N=50 claims and M=4L members (FR-20 measured-validation gate pre-launch).
- **NFR-8: Admin UI usable on mid-range Android (≤ 720p)** — most admin actions doable on mobile.
- **NFR-9: Reconciliation matcher idempotent and replayable** without false confirmations.
- **NFR-10: Audit log writes async** — do not block user-facing actions; ≤ 1 minute write delay budget.

**Reliability**

- **NFR-11: Member-app availability ≥ 99.5% monthly; admin UI ≥ 99%.**
- **NFR-12: Pool spawn at cycle freeze atomic with retry semantics.**
- **NFR-13: Audit log integrity** — no post-write tampering possible (hash-chain + off-site mirror).

**Security**

- **NFR-14: PII at rest AES-256 / Tier-1 envelope-encrypted** via Cloud KMS (HSM-backed) + Google Tink per architecture §2.7.
- **NFR-15: In-transit TLS 1.3+** at edge and internal hops.
- **NFR-16: Cross-tenant data isolation** — adversarial CI test; any leak is P0.
- **NFR-17: Cloudflare + Bot Management + Turnstile** per §4.13 (subject to §5.8a DPDPA pivot path).

**Observability**

- **NFR-18: Every state transition emits a structured event** (member / alert / claim / reconciliation lifecycle).
- **NFR-19: Trustee dashboards built on these events.**

**Accessibility**

- **NFR-20: WCAG 2.1 AA launch-blocker** for member-app primary flows (signup, KYC, My Pool, payment, claim filing) and public-site primary nav + Niyamavali + Sahyog pages. Acceptable v1 gaps (fix in v1-S/v2): admin-UI trustee-only screens, FR-58A export rendering.
- **NFR-21: Devanagari renders with same affordances as English;** font sizing scalable.
- **NFR-22: Pre-launch accessibility audit gates Phase 2.**

**Localization & Data Residency**

- **NFR-23: Niyamavali Hindi/English parity** — mismatch is launch blocker.
- **NFR-24: All PII stored in India** (GCP `asia-south1` Mumbai per architecture §5.1). DPDPA-aware (CERT-In incident reporting in-region).

**Backup, DR & Operations**

- **NFR-25: Daily backups of production DB; restore tested quarterly.**
- **NFR-26: Audit log archived separately** with 7-year retention per FR-47.
- **NFR-27: DigiLocker latency budget 8s p95** for photo/name/DoB pull; manual fallback CTA visible after 12s.
- **NFR-28: OTP delivery** — login-OTP TTL 5 min, step-up-OTP TTL 3 min, one-time use, invalidated on next-OTP-request. Per-device/member/IP rate limits (separate budgets for cost vs abuse protection).
- **NFR-29: Session model** — refresh-token lifetime 90 days; max 2 trusted devices per member (FR-58C-configurable per Pariwar); step-up OTP required for high-trust operations (mobile/nominee/bank change, claim filing, role grants, Niyamavali amendments, disaster declaration, etc. — full list per architecture §2.2).

### Additional Requirements

> Technical/infrastructure requirements from Architecture that affect epic and story creation. Not duplicates of FRs; these are implementation substrate commitments.

**Starter template / Monorepo (architecture §Starter Template Evaluation)**

- **AR-1 (CRITICAL — Epic 1 Story 1):** Project uses **Turborepo + pnpm workspaces** as the starter foundation (not a templated all-in-one starter). Bootstrap = create-turbo baseline + per-app scaffolds via their native generators. **First implementation story MUST initialize the monorepo skeleton:**
  - `pnpm dlx create-turbo@latest twt --package-manager pnpm`
  - `apps/mobile/` (Expo + Tamagui + Expo Router; substrate ratifies on Phase-0 Native-Stack Validation per UX §6)
  - `apps/public/` (Astro 6 SSR)
  - `apps/admin/` (Vite + React + TS; `modules/helpline/` sub-module)
  - `apps/api/` (manual Fastify + TS + Drizzle scaffold; `modules/` + `telephony/`)
  - `apps/jobs/` (single workspace, sub-directories: `matcher/`, `audit/`, `scheduler/`)
  - `packages/`: `tokens/`, `i18n/`, `domain/`, `contracts/`, `api-client/`, `platform-adapters/`, `bank-parsers/`, `events/` (all empty TS modules at first)
  - `docs/adr/` — ADR directory populated in second PR
  - Dockerfile per deployable workspace from day 1 (every `apps/*` including `apps/jobs/`)
  - Per-Pariwar build profile: `turbo.json` + `apps/mobile/eas.json`; `bihar` profile defined at v1.

**Data layer & multi-tenancy**

- **AR-2:** Managed Postgres in India region — **GCP Cloud SQL Postgres** (`asia-south1`, Mumbai) with regional HA; PostgreSQL RLS first-class required for multi-tenant isolation (per architecture §1.1).
- **AR-3:** Multi-tenant isolation via Postgres Row-Level Security keyed on `pariwar_id` (architecture §1.2); adversarial cross-Pariwar read CI test required.
- **AR-4:** Validation library — Zod (architecture §1.3) for both contracts and domain.
- **AR-5:** Cache + idempotency + job queue — Postgres-only for v1 (no Redis); pg-boss for job queue (architecture §1.4); class A queue for pool-spawn child jobs (architecture §5.11).
- **AR-6:** Migration tool — drizzle-kit, forward-only migrations (architecture §1.8).
- **AR-7:** Per-tenant custom fields — Postgres JSONB with per-Pariwar JSON Schema (architecture §1.7) for FR-54.
- **AR-8:** `packages/events` enforces event immutability — corrections emit new events; never mutate.

**Audit / storage / encryption**

- **AR-9:** Audit log two-tier — Postgres hot + **GCP Cloud Storage Bucket Lock + Object Retention Lock** (Cohasset-assessed WORM-equivalent) cold tier in `asia-south1` (architecture §1.5). 7-year retention; integrity check job daily; Merkle-root publication `[v1-S]`.
- **AR-10:** Audit-mirror write role lives in a dedicated GCP project (`twt-audit-mirror`) under IAM Isolation Commitment §2.10a; read role lives in separate GCP project. Sole-engineer prod-DB credentials cannot access either. Quarterly attestation required.
- **AR-11:** Pool Engine snapshot storage — Postgres hot + Cloud Storage cold with Object Retention Lock (architecture §1.6).
- **AR-12:** PII encryption tiers (architecture §2.7) — Tier 1 ciphertext (envelope-encrypted, KEK in Cloud KMS HSM-backed, Google Tink library, per-row DEK): mobile, email, Aadhaar, DOB, address, nominee bank, nominee IFSC, medical disclosures. Tier 2 (hashed for lookup): mobile-hash, eHRMS-hash. Tier 3 (clear): first-name, school, district.
- **AR-13:** Secrets in GCP Secret Manager; rotation policy per architecture Category 5; secrets abstracted behind a provider interface (12-factor).

**Member state primitive (architecture §1.14, per Sprint Change Proposal Item 3)**

- **AR-14:** Member lifecycle state machine — `pending-fee → lock-in → (pending-valid | active) → active_in_grace → lapsed_unpaid` (+ `withdrawn`). Source-of-truth principle: state derived from event history; persisted state is optimization only. Transitions emit `from_state`, `to_state`, `trigger`, `actor`, `timestamp`, `pariwar_id`. Time-driven transitions via SIE driver (`apps/jobs/scheduler/`). Cache invalidation in same transaction as transition emission.

**Communication channels (architecture §2.2, §3.4, per Sprint Change Proposal Item 2)**

- **AR-15:** Three-tier channel hierarchy: in-app push primary (FCM + APNs); WhatsApp Business dual-gated (Pariwar admin toggle + member self-declared opt-in via user-initiated WA message); SMS (DLT-transactional / PE/OE) for OTP, step-up OTP, per-member transactional fallback, Pariwar-degraded-mode cycle-open bridge; Telegram mirror non-canonical.
- **AR-16:** Member WA opt-in flow during onboarding: post-OTP, member offered "Do you have WhatsApp?"; Yes branch opens WA via deeplink to Pariwar's WA Business number with pre-filled message; inbound webhook matches WA-on-file → opt-in ACTIVE + 24h Meta customer-service window opened. Opt-in only via user-initiated interaction or explicit affirmative in-app consent (no passive defaults). Withdraw via app settings or STOP message.
- **AR-17:** Per-Pariwar WA Business number admin-configurable (default NULL = WA disabled at Pariwar until configured). Per-Pariwar push project (FCM).
- **AR-18:** In-app-engagement cost optimization — FR-58C-flag-gated per-Pariwar suppression of WA send when member acted on same notification in-app within staleness window (default 6h). Time-critical templates (payment reminder 48h before cycle close, expiry warning 7 days, payout issued) always send through both channels regardless.
- **AR-19:** Per-member transactional fallback — when both WA gates ACTIVE and WA delivery undelivered after 3 retries × exponential backoff, dispatcher fires DLT-transactional SMS with equivalent template payload.
- **AR-20:** Pariwar-degraded-mode cycle-open SMS bridge — when per-Pariwar push delivery rate falls below threshold AND WA admin-toggle OFF, dispatcher fires per-Pariwar SMS bridge for cycle-open + other time-critical templates. Distinct from bulk-alert SMS (banned per RA-29).

**Authentication & sessions (architecture §2.2, §2.3, §2.4)**

- **AR-21:** Member auth via mobile + OTP; OTP delivered via SMS (DLT-transactional/PE/OE headers); voice OTP fallback per ADR.
- **AR-22:** Admin auth via email + password + WebAuthn passkey (architecture §2.3).
- **AR-23:** Session model hybrid — refresh-token 90d; max 2 trusted devices per member (FR-58C-configurable); force-re-OTP signals: SIM-swap-positive, device-binding state change, risk signals from fraud-policy ADR.
- **AR-24:** Step-up OTP required for: mobile change, account recovery, self-deactivation, account deletion ack, DigiLocker re-link, nominee change, bank/IFSC change, claim filing, trust-payout authorization, refund/claw-back initiation, staff privilege escalation/role grant, Niyamavali rule amendment, per-Pariwar branding bundle changes affecting public surfaces, disaster-window declaration, (v2+) helpline operator co-pilot session start. TTL 3 min, single-use, audit per send + per consume tagged with operation identifier.

**RBAC & scope enforcement (architecture §2.5, §2.6)**

- **AR-25:** Multi-Pariwar active scope via URL path prefix (`/p/<pariwar_id>/...`).
- **AR-26:** RBAC enforcement — permission keys + scope dimensions; server-side check on every privileged endpoint.

**Infrastructure substrate (architecture §5.1–§5.10)**

- **AR-27:** Cloud provider — GCP `asia-south1` Mumbai. Service map: Cloud SQL Postgres (data), Cloud Storage + Bucket Lock + Object Retention Lock (audit/snapshot cold), Cloud KMS (KEK + HMAC keys), Secret Manager (secrets), Artifact Registry (containers), FCM (push), Cloudflare (edge/WAF subject to §5.8a pivot path).
- **AR-28:** Deployment substrate v1 — Dokploy; Kubernetes migration path documented; trigger = 2nd Pariwar OR ≥ 70% peak-cycle infra utilization.
- **AR-29:** CI/CD pipeline — GitHub Actions → Dokploy auto-deploy on release-branch push; Turborepo task graph builds container images; Docker images stored in Artifact Registry; per-Pariwar build matrix.
- **AR-30:** Environment topology — dev / staging / prod (architecture §5.5).
- **AR-31:** Observability stack split per concern (architecture §5.6, deferred to ADRs); capacity-planning indicators named (pool spawn time, statement-intake queue depth, FR-12A p95 trend).
- **AR-32:** Backup + DR — daily prod DB backups; restore tested quarterly; audit log archived separately to off-site mirror (architecture §5.7).
- **AR-33:** Network topology — edge-only ingress (Cloudflare or self-hosted WAF per §5.8a); backend services not directly reachable from public internet under normal operation; break-glass bypass time-bounded + audit-logged.
- **AR-34:** Secrets management + rotation per architecture §5.9.
- **AR-35:** Operations runbook inventory — deploy, rollback, secret rotation, audit-log integrity verification, reconciliation manual intervention, RBAC seed reset, multi-Pariwar provisioning (architecture §5.15 + PRD §9.1.1 Solo-build operational continuity).
- **AR-36:** pg-boss queue partitioning + worker pool sizing per architecture §5.11.
- **AR-37:** Per-Pariwar infrastructure isolation strategy (architecture §5.14).

**API / Webhook / Resilience patterns (architecture §3)**

- **AR-38:** REST + OpenAPI; Zod-derived schemas; `packages/contracts/` is single source of truth; `packages/api-client/` generates typed client.
- **AR-39:** Real-time updates — push notification primary; on-resume refresh (architecture §3.3).
- **AR-40:** Channel-provider abstraction — single canonical `alert` payload; templated render; central dispatcher (architecture §3.4); provider interface allows BSP substitution.
- **AR-41:** Bank statement intake transport (architecture §3.6, OQ-2) — 5-bank parser allowlist (SBI, PNB, BoB, BoI + 1 Bihar cooperative); 50 golden-file tests per bank pre-launch; PDF + CSV supported.
- **AR-42:** Module Marketplace lead-handoff transport (architecture §3.7).
- **AR-43:** DigiLocker integration transport (architecture §3.8); provider interface; signature verification policy; key rotation; offline-cache validity semantics.
- **AR-44:** Webhook ingress pattern — persist + ack (architecture §3.11); ingress signature verification.
- **AR-45:** External-call resilience — retry/backoff/circuit-breaker conventions (architecture §3.12).
- **AR-46:** Per-Pariwar configurability + extensibility registry (architecture §3.13).
- **AR-47:** Helpdesk ticketing subsystem (architecture §3.5a) — first-class subsystem distinct from telephony. Backend `apps/api/modules/helpdesk/`, admin UI `apps/admin/modules/helpdesk/`, contracts `packages/contracts/helpdesk/`. Member-facing UI in member app. Routing policy (category-to-scope) rule-registry-driven. Integration points: helpline (call-to-ticket), claim, reconciliation, module marketplace, validity service. Form ingress through rate-limited/bot-managed API path.

**Public web composition (architecture §Member-Responsive Web Deferral, per Sprint Change Proposal Item 12)**

- **AR-48:** Cross-surface rendering policy — public pages with login-walled fragments compose cache-safe public SSR shell + registry-declared authenticated fragments. SSR shell contains no PII, no member-state, no auth-derived branching. Authenticated fragments hydrate client-side. Auth boundary at API (`apps/api/modules/public-pages/`), not edge. v1 registry-declared fragments: FR-77 Sahyog Vivran nominee bank account + IFSC + payment status + UPI Intent CTA deep-link.

**Phase-0 launch gates (per PRD §12 + architecture §Launch Gate Risks, per Sprint Change Proposal Item 17)**

- **AR-49:** PRD §12 Phase 0 inherits architecture's gate inventory by reference. All entries in architecture §Launch Gate Risks must reach closure or explicit disposition before Phase 1 transition. Includes P0-1 through P0-5 validation experiments + Cloudflare/DPDPA gate + FR-20 capacity gate. Substrate-conditional implementation commitments not frozen until P0-5 closes; exploration/prototyping/validation may proceed.
- **AR-50:** Phase-0 prerequisites: trust legal formation, Trustee Panel formation, DPO appointment plan, Bihar field-worker recruitment plan (OQ-5), app store + brand identity (post OQ-1), Niyamavali v1 legal review, partner deal terms (OQ-4), trust staff hiring plan (OQ-15), regulatory surface sign-off (OQ-16).

**External / regulatory commitments (architecture Critical External Dependencies)**

- **AR-51:** DigiLocker (govt API) — OAuth-style flow; signed Aadhaar document; rate limits; downtime patterns; signature verification; provider-approval gating (A-4). Isolated behind provider interface.
- **AR-52:** Edge / WAF — Cloudflare v1 default; DPDPA compatibility per legal review remains open; pivot path to self-hosted WAF per §5.8a capability bar. Substitution points: §2.1, §2.11, §3.11, §5.8.
- **AR-53:** WhatsApp Business API — Meta-controlled template approval, throughput tiers, suspension risk; abstract behind channel-provider interface.
- **AR-54:** Dokploy — Live-cycle fallback path required (architecture §5.10).
- **AR-55:** Bank statement intake — parser shipping schedule gates Phase 2 statewide rollout (not Phase 1 single-district).
- **AR-56:** Regulatory gates — Indian Trust Act registration (Bihar), 12A/12AB, GST (likely required from launch given module commissions), 80G (Phase 2/3 readiness), DPDPA Data Fiduciary registration, CPA 2019 internal appeal flow (FR-43A), RBI/UPI rate-limit workaround via dual nominee accounts, TDS §194H on field-worker commission, DLT-transactional (PE/OE) registration for OTP-SMS / step-up-OTP-SMS / transactional-fallback-SMS / degraded-mode bridge SMS.

**Cross-cutting concerns (architecture §Cross-Cutting Concerns)**

- **AR-57:** Determinism & replay — Pool Engine assignment reproducible from snapshotted membership-at-freeze; rule-registry evaluations carry full provenance for replay.
- **AR-58:** Idempotency keyed store — covers UPI Intent `tr=` per (member × alert), reconciliation matcher input dedup, pool assignment evaluation, bulk admin operations.
- **AR-59:** i18n at the core — centralized formatting utility (`packages/i18n/`); CI lint against inline formatting; Devanagari display/body/numeric typeface separation; Hindi numerals reserved for ceremonial Devanagari prose (v4 amendment).
- **AR-60:** Friction-as-budget enforcement — per-PR CI gate validates declared `payer` + `protects` per UX Stance #2 (`friction-budget.md` declaration required on every PR touching member-facing form/interaction).
- **AR-61:** Staff-fallback at every node — Account State Machine drives screen-mode parameters; every loop node carries `{primary_actor, fallback_actor, escalation_trigger}`. P0-1 gates Phase 1.
- **AR-62:** Intake Convergence Points (ICPs) — every channel-merge node specifies dedup key, in-flight session visibility across channels, override semantics under race conditions.
- **AR-63:** Time-as-actor (SIE) — non-punitive state transitions on scheduled time; no punitive auto-action.
- **AR-64:** Feature-flag staged rollout — canary → graduated cohorts + automatic rollback on error-rate spike; inventory visible; no secret flags.
- **AR-65:** Compound read models for operator surfaces — Anita's verifier console loads in ~5s with no N+1; denormalized read store with freshness budget targeted real-time within seconds.
- **AR-66:** Disaster handling (FR-98) — queue-rollover semantics; alert-engine throttling config; member-comms framing de-emphasizes urgency.
- **AR-67:** Solo-build operational continuity — runbooks, credential escrow (≥ 2 trustees, sealed), code escrow (mirror to trustee-controlled location auto-updated on release-branch push), degradation policy, knowledge-transfer documentation, backup engineer arrangement (₹15–25k/month retainer per A-13).

**Pool Engine snapshot mechanism (architecture §5.11, per Sprint Change Proposal Item 15)**

- **AR-68:** Pool spawn saga decomposition — parent job spawns N child jobs (one per pool); child jobs perform immutable snapshot evaluation; no inter-pool serialization; per-cycle assignment table partitioned. Capacity envelope: N=50 / M=4L < 60s p95. Pre-launch measured-validation gate required.

**ADR backlog (architecture deferred decisions)**

- **AR-69:** ADR backlog generated from architecture + Sprint Change Proposal: Cloud provider final selection (ratify §5.1), IAM isolation mechanism (§2.10a), Edge/WAF selection contingent on legal review (§5.8a), Feature-flag tool selection (§Deferred Decisions), OTP fraud-policy thresholds (§2.2 force-re-OTP signals), Public-page composition framework (§Member-Responsive Web Deferral), Pool-spawn bulk-write primitive (§5.11), Bank statement normalization schema (5-bank common shape), Pool Engine snapshot format + hash-on-snapshot + retention alignment, Audit log mirror target + integrity-check execution environment, Reconciliation matcher mechanism (OQ-2).

### UX Design Requirements

> UX-DRs extracted from `ux-design-specification.md`. Each is an actionable design requirement with clear implementation scope. Component proposals are Tier-A (member-class), Tier-B (layout primitives), and Tier-C (journey-derived).

**Foundational stances + Phase-0 prerequisites (UX §0 + §Phase-0)**

- **UX-DR1: Module Shelf grief-context exclusion (state-machine-enforced).** Module Shelf (FR-65) suppressed in all account-frozen states (claim-filed-frozen, disbursed-frozen-readable, disabled-T+90, public-record-∞). Enforced by Account State Machine, not reviewer discretion.
- **UX-DR2: Claim-time DPDPA consent capture.** Nominee/family captures explicit DPDPA consent at claim-time for: (a) public contributor-list rendering of their case, (b) verifier-name publication on Sahyog Vivran, (c) In Memoriam inclusion. Default opt-in unacceptable; explicit consent + opt-out path required; private processing must not compromise disbursement.
- **UX-DR3: Friction-budget PR CI gate.** Every PR touching member-facing form/interaction adds `friction-budget.md` line declaring `payer: <persona>, protects: <subsystem>, event_type: <forced|optional>`. CI enforces.
- **UX-DR4: P0-1 fallback-handler-named launch gate.** Every Phase-1 loop node has a named, funded, on-rota `fallback_handler` role assigned with SLA + contact rota published before that loop ships.
- **UX-DR5: P0-2 empathy field-work gate.** 5 Shikshakamitra (Reena-class) conversations + 1 bereaved-spouse conversation in Vaishali district + ≥1 Hindi-using visually-impaired/low-vision member's interaction; ≥4 hours observation shadowing actual small-trust helpline operator. No nominee-facing surface, relative-as-deceased flow, or Helpline Operator console ships in v1 without these conversations + observation on record.
- **UX-DR6: P0-5 Native-Stack Validation Experiment.** ~2-week prototype on RN + Tamagui renders three named patterns (Yogdaan Bahi, Shradhanjali Sahyog Vivran, Panchayat Noticeboard) on three test devices (mid-range Snapdragon 4-series Android, older entry-level Android 2GB RAM, iPhone at target iOS minimum). Pass criteria P1–P6 (Devanagari rendering, UPI Intent integration, push notification reliability ≥95% / p95 ≤5s, offline cache, list performance 200+ entries at 60fps target / 30fps minimum, no blocking external dependencies). Substrate-dependent engineering does not begin without ratify decision.

**Design system + token layer (UX §6)**

- **UX-DR7: Custom design system on headless primitives.** Native: React Native + Tamagui. Web: Tailwind CSS + Radix UI. CI lints forbid Material Design imports (`react-native-paper`, `@mui/material`).
- **UX-DR8: `packages/tokens` hand-rolled TS module as v1 single source.** Web (Tailwind config) + native (Tamagui theme) import directly; per-tenant overrides via TS module merging. Style Dictionary migration trigger = 2nd Pariwar OR first non-TS consumer.
- **UX-DR9: Semantic token taxonomy (FM-14 governance).** Colors: `ink-primary`, `surface-base`, `surface-accent`, `rule-hairline`, `rule-heavy`, `stamp-mudra`, `status-pending` (yellow), `status-confirmed` (green), `status-mismatch` (warm umber, distinct from accent), `status-grey-takeover`. Type roles: `display-name`, `display-parichay`, `body-ledger`, `numeric-tabular`, `caption-stamp`. Spacing: `space-hairline`, `space-row`, `space-block`, `space-page-gutter`. Border: `border-hairline`, `border-rule`, `border-double-rule`, `border-funeral-frame`. **Shadows do not exist as tokens** (Tailwind utility removed; intentional).
- **UX-DR10: Typography roles + character commitment.** Display = serif Devanagari (default Tiro Devanagari Hindi). Body = sans Devanagari (default Noto Sans Devanagari). Tabular numerics = monospace Devanagari (default IBM Plex Mono Devanagari). Substitute candidates documented per role. Discipline: no mixed-numeral surfaces; Devanagari + Latin visually balanced at same hierarchy; right-aligned-on-decimal tabular numerics.
- **UX-DR11: Centralized i18n / locale utility (`packages/i18n/`).** Functions: `toHindiNumeral`, `toGregorianNumeral`, `formatCurrency`, `formatDate` (with stacked Hindi/Gregorian variant), `formatRelativeTime`, `pluralize`. CI lint detects inline formatting outside utility.
- **UX-DR12: Failure-mode hardening commitments.** FM-1 Tamagui escape valve via `@twt/native-primitives` adapter; FM-2 Devanagari validation gate + tiered escalation (mitigation → partial-surface fallback → substrate pivot last resort); FM-3 visual discipline enforcement (ESLint rules + custom Tailwind config removes `boxShadow` utilities + component-library gate); FM-4 token sync CI gate; FM-5 Devanagari-aware contrast validation; FM-6 component governance via PR review with written justification; FM-14 token governance.

**Tier-B layout-primitive components (UX §11)**

- **UX-DR13: `<ContributionListTable>` (public label: Sahyog List Table).** Primary public trust surface; desktop variant; 50k-row virtualization contract.
- **UX-DR14: `<ContributionListMobileRow>` (public label: Sahyog List Mobile Row).** Mobile adaptation; must pass Real Data Test on 360px viewport; 10k-row virtualization contract.
- **UX-DR15: `<NoticeboardStrip>` (public label: Panchayat Noticeboard).** Home-screen layout primitive for member home + admin home variants.
- **UX-DR16: `<PinnedNotice>`.** Noticeboard row primitive with left colored stub.
- **UX-DR17: `<MemorialRecord>` (public label: Shradhanjali Sahyog Vivran).** Per-claim memorial page composing bordered portrait, parichay, kinship lattice, contributor scroll.
- **UX-DR18: `<PortraitFrame>` (public label: Funeral Frame).** Black-bordered-white-inset portrait container; nested wrappers pattern; used in Shradhanjali, In Memoriam, Ravi-mode.
- **UX-DR19: `<KinshipLattice>`.** Kinship relationships visualization (admin Phase 1 + ceremonial polish Phase 4).
- **UX-DR20: `<StatCardStrip>`.** Aggregate-stats strip across admin + nominee surfaces.
- **UX-DR21: `<StatusPill>`.** Five-state indicator (yellow/green/red[umber]/grey/held); paired with text label per WCAG.
- **UX-DR22: `<HelplineConsoleShell>`.** Priya's intake console shell (Phase 1 early version; full version Phase 3).
- **UX-DR23: `<Text>` typography primitive.** With `role` variants replacing the typography trio per critique C4.

**Tier-C journey-derived custom components — Member-class (UX §11)**

- **UX-DR24: `<MemberStatusPanel>` (public label: Membership Status).** FR-12A eligibility surface; admin-facing variant Phase 1; member-facing variant Phase 3.
- **UX-DR25: `<ActiveContributionCard>` (public label: My Pool Card).** Sushil's home pool detail; tone gradient across 15-day window (Day 0-10 calm/factual, Day 11-13 factual-precise, Day 14-15 gently urgent never panicked); fixed-amount transition pattern (-3mo → -1mo → first cycle → normal).
- **UX-DR26: `<UPIIntentButton>`.** Single-tap UPI Intent launch; critical-category touch target (≥56pt).
- **UX-DR27: `<ContributionTimeline>`.** Member-side status visualization.
- **UX-DR28: `<SelfVerifySurface>`.** Yellow-stuck recovery surface.
- **UX-DR29: `<InviteShareSheet>`.** Viral acquisition share sheet (FR-87 v1-M promotion per UX §7); OS share-sheet integration (SMS/WhatsApp); inviter's name embedded in message + member identifier in deep link; v1 caps: ≤5 WhatsApp shares per share action, ≤100 SMS shares per member per day with friendly quota-met redirect.
- **UX-DR30: `<InviteeOnboardingShell>`.** Invitee onboarding shell with deep-link attribution capture.

**Tier-C journey-derived custom components — Claim intake (UX §11)**

- **UX-DR31: `<ClaimProxyFlowShell>` (public label: Ravi Mode Shell).** Bereaved-relative shell on deceased's phone; black-bordered photo treatment on home; soft consent; witnessed declaration of relationship; save-and-resume mandatory.
- **UX-DR32: `<HandoverTrustOTP>`.** Admin-triggered handover flow.
- **UX-DR33: `<ClaimDocumentUpload>` (public label: Death Certificate Upload).** OCR parity check surface (FR-38).
- **UX-DR34: `<NomineeDetailEditor>`.** Admin-side nominee maintenance.

**Tier-C journey-derived custom components — Nominee (UX §11)**

- **UX-DR35: `<NomineeConsole>`.** Sunita-side console; yellow/green/red/grey contributor states; bank statement uploads; date-overlap dedup (visible, never silent); ingestion-and-normalization sub-stage isolates parser fragility; staff-takeover by day N when nominee disengaged; save-and-resume mandatory; "fursat" cadence, never "complete your task."
- **UX-DR36: `<BankStatementUpload>`.** Sunita's daily upload surface; supports 5 bank formats (SBI/PNB/BoB/BoI + 1 Bihar cooperative); staff-fallback affordance ("Hum aapke liye padh lenge") on parser failure with 24-48h SLA.
- **UX-DR37: `<PoolProgressCard>`.** Daily-delta visualization.
- **UX-DR38: `<MemorialAuthorshipSurface>`.** Post-close authorship with Trustee review wiring.

**Tier-C journey-derived custom components — Operator (UX §11)**

- **UX-DR39: `<VerificationConsoleShell>`.** Anita's single-scroll surface; ~5s load with no N+1; design budget proportional to ₹50L-per-decision stakes. Mandatory surfaces: prior verifier comments (transcripts, not counts); peer-mesh responses with verifying member's brief annotation; ground inspection notes + photos; similar-case precedents (latest 3 + outcomes + rationale); one-tap structured reason-code on every decision; trustee-side audit UI ("show me all decisions Anita made last month with reason-code X"); cross-Pariwar scope handling — active scope unmistakable. 10k mobile / 50k desktop virtualization contract.
- **UX-DR40: `<VerificationDecisionStrip>`.** Sticky-bottom horizontal button row; primary leftmost; audit-trail-required (Reject) at far right with `<ReasonCodeDropdown>`. Keyboard shortcuts numbered 1-N; reason-code mandatory before Reject submits; Hold/Escalate paths have optional visible note field.
- **UX-DR41: `<IntakeDecisionStrip>`.** Priya intake decision surface.
- **UX-DR42: `<DocumentPreview>`.** Admin doc review.
- **UX-DR43: `<ReasonCodeDropdown>`.** Audit-trail-enforced rejection reason codes (categories agreed upfront by Trustee Panel, not free text).
- **UX-DR44: `<AuditTrailEntry>`.** System-property logging surfaced for admin review.
- **UX-DR45: `<MemberLookupForm>`.** Admin member-record search; keyboard-driven search submission, clearing, disambiguation-list navigation.
- **UX-DR46: `<ReadBackCard>`.** Priya read-back support.
- **UX-DR47: `<DocPathChooser>`.** Admin doc-path management.
- **UX-DR48: `<FieldWorkerDispatchScheduler>`.** Admin dispatch.

**Cross-cutting components (UX §11)**

- **UX-DR49: `<CallHelplineCTA>`.** Cross-cutting fallback CTA reachable from every user-facing component; `tel:` link opens native dialer; out-of-hours callback form is single-screen bottom-sheet; recovery-ladder ordering preserved (self-recovery first, then in-flow help, then helpline).
- **UX-DR50: `<SaveAndResumeAffordance>`.** Always visible on grief-paced flows (`<ClaimProxyFlowShell>`, `<NomineeConsole>`, `<BankStatementUpload>`, `<HelplineConsoleShell>`); auto-save on grief-paced flows; manual save on multi-step forms; resume via SMS/email deep link; never lose data on network drops (IndexedDB / AsyncStorage; sync on reconnect).
- **UX-DR51: `<LastUpdatedTimestamp>`.** Daily-delta visibility cross-cutting.

**UX consistency patterns (UX §12)**

- **UX-DR52: Pattern 1 — Button hierarchy.** Single primary action per surface; ≥44pt touch target (≥56pt for critical primary like `<UPIIntentButton>`); destructive cannot be primary on member surfaces.
- **UX-DR53: Pattern 2 — Confirmation modal discipline.** Only for irreversible actions; bottom-sheet on mobile; focus trapped + first focus on Cancel; ESC dismisses; never lose form state.
- **UX-DR54: Pattern 3 — Decision-strip pattern (operator).** Sticky bottom; primary leftmost; keyboard shortcuts 1-N; reason-code mandatory before Reject; audit-trail-aware undo window.
- **UX-DR55: Pattern 4 — Dignified validation.** Member-facing: three elements (what's wrong + what to do next + helpline fallback); no "Error:"/"Invalid"/"Failed"/"Forbidden" framing; no alarming red iconography. Operator-facing: precise technical wording permitted. Sample error copy table (Hindi + English) validates with P0-2 field work.
- **UX-DR56: Pattern 5 — Form save-and-resume.** Always-visible "Save and come back"; auto-save indicator; resume via SMS/email deep link; never block primary action.
- **UX-DR57: Pattern 6 — Bilingual input.** Accepts both scripts natively; no in-app script-toggle; numeric inputs Latin-only with dignified hint on wrong-script entry.
- **UX-DR58: Pattern 7 — Empty-state pattern.** Centered illustration/icon + Hindi + English copy + suggested action. Never generic "No data" / "No results."
- **UX-DR59: Pattern 8 — Loading-state pattern.** Skeleton-first for known structure; spinner only for true uncertainty; reduced-motion preference disables shimmer.
- **UX-DR60: Pattern 9 — Toast vs banner vs inline-message rules.** Toast = ephemeral confirmation, bottom-center mobile, bottom-right desktop. Banner = surface-wide context, top, dismissible unless blocking. Inline = field-level, adjacent. Never stack >2 toasts of same type.
- **UX-DR61: Pattern 10 — Search + filter.** Search responds quickly without per-keystroke spam; filter chips dismissible; "Showing X of Y · Updated [timestamp]" footer; bottom-sheet filter on mobile.
- **UX-DR62: Pattern 11 — Helpline fallback CTA placement (three-tier recovery ladder).** Self-recovery → in-flow help → helpline. Components surface options in this order; helpline is the third tier, not the only one.

**Responsive design & accessibility (UX §13)**

- **UX-DR63: Mobile-first under real field conditions.** 360px canonical mobile target. Below-canonical (sub-360px) degrades gracefully; recovery paths always reachable.
- **UX-DR64: Four breakpoints.** Mobile (canonical) 360-767; Tablet 768-1023; Desktop 1024-1279; Large desktop 1280+. Mobile-first media queries; tablet/desktop are progressive enhancements.
- **UX-DR65: Three touch-target categories.** Minimum (default), Comfortable (sustained-use surfaces), Critical (UPI Intent, Approve, Submit). Spacing between adjacent targets ≥8pt.
- **UX-DR66: Accessibility ≠ alternate experience.** No "normal app" + "accessibility app." Screen-reader, keyboard-only, high-contrast, reduced-motion users all use the same TWT, same surfaces, same flows, same data. Violations tracked as defects, not configurations.
- **UX-DR67: WCAG AA baseline (NFR-20).** Color contrast 4.5:1 normal text / 3:1 large text / 3:1 UI; color independence (status always paired with text label); keyboard navigation (every interactive element reachable, visible focus, logical tab order); screen-reader compatibility (semantic HTML/ARIA + live regions); touch-target sizing per categories; form labels (not just placeholder); skip links for operator surfaces; reduced-motion honored.
- **UX-DR68: TWT-specific accessibility considerations.** Hindi screen-reader (TalkBack Hindi) tested on canonical validation device per P0-2; Devanagari conjunct rendering validated (FM-2); operator zoom support to 150%; field-worker outdoor high-contrast toggle + offline-tolerant; OS-supported Hindi voice input on text fields; low-bandwidth resilience as accessibility commitment.
- **UX-DR69: Real Data Test gate.** Render Sahyog List + Yogdaan Bahi with 300+ real records exercising disambiguation surfaces, on desktop 1280px AND mobile 360px canonical validation device, throttled cellular + slow CPU. Behavioral success criteria: identify correct record, understand status at a glance, recover from mismatch. Gate before final palette + spacing values commit and before Phase-1 launch.
- **UX-DR70: Accessibility audit gate.** axe-core on every page in CI (failures block PR merge); manual TalkBack-Hindi + NVDA + VoiceOver per Tier-1 surface; keyboard-only completion per Tier-1 journey; color-blindness simulation (deuteranopia, protanopia); 150% zoom; equivalence test. Gate before Phase-1 launch.

**Visual + interaction discipline (UX §5, §6, §8)**

- **UX-DR71: Vocabulary discipline.** Member address: **सम्मानित साथी** / **colleague**, never "user"/"customer"/"donor". Deceased member = "Deceased Member" (canonical), "Late Teacher" forbidden in component spec.
- **UX-DR72: Pool identifier dual representation.** Canonical structured identifier `P-YYYY-MM-###` in data model + audit + regulatory; display shortform (letter codes A, B, C… for TWT-Bihar) only on member-facing surfaces; cross-references in audit trail and Trustee records use structured identifier.
- **UX-DR73: Numeral discipline (v4 tightening).** Operational components use Latin numerals; only memorial Devanagari prose (parts of `<MemorialRecord>`) permit Hindi numerals embedded in narrative copy.
- **UX-DR74: Account State Machine as UX surface.** States: `active → claim-filed-frozen → disbursed-frozen-readable → disabled-T+90 → public-record-∞`. Every screen reads `accountState` and renders accordingly. Formal transition table required. Five mandatory failure-mode test cases: phone-paperwork separation, duplicate filing, rejected-claim un-freeze, mid-cycle pool assignment when freeze fires, 90-day disable preserving nominee long-term receipts portal.
- **UX-DR75: Dual-path death-claim intake convergence (ICP).** Relative-as-deceased (app, deceased's phone+OTP) + helpline-mediated (phone) converge on single case object firing same account freeze. Dedup key + in-flight session visibility across channels + override semantics under race conditions specified.
- **UX-DR76: Out-of-band contribution policy.** Member sending money outside Intent flow: act honored as personal mutual aid; cannot count toward Pool collection; cannot be retroactively integrated; not in member's Yogdaan Bahi; staff facilitate dignified resolution via Madad (Helpline acknowledges + clarifies + adds private note + does not contact receiving family). Language: not "failing" the Pool Engine.
- **UX-DR77: Calendar-aware close-of-cycle timing.** Day 15 mechanical close; reconciliation tail 1-2 days normal, 5-7 days on Bihar holiday windows (Chhath Puja, Holi, Diwali, Eid, Republic Day, Independence Day). Sahyog Vivran auto-publish waits for matching to settle. Per-Pariwar holiday windows configurable.
- **UX-DR78: Measurement infrastructure for counter-success indicators.** Per-persona open-count histogram, contribution-timing distribution, status-check frequency tracked from launch; quarterly Operations Lead review against named bands. No streak counts, no daily-check-in optimization (anti-metrics).
- **UX-DR79: Pool Engine onboarding tutorial.** Phase-1 launch-blocker: first-time onboarding includes mandatory "How Pool Engine Works" moment — three screens explaining (a) contributions are pool-bound, (b) app pre-fills correct VPA so wrong-pool errors are structurally unlikely, (c) contributions sent outside the Intent flow are not integrated into the Pool ledger.

**Performance contracts (UX §11)**

- **UX-DR80: List virtualization platform requirement.** Long lists (Yogdaan Bahi 50-500; Shradhanjali contributor scroll 200-13,000+; Sahyog Drive archive; In Memoriam) render without jank on target devices via virtualization. Native: FlatList tuning. Web: TanStack Virtual / react-virtuoso / react-window (choice per architecture ADR). 10k mobile / 50k desktop virtualization contracts on Sahyog List components; Verification Console 10k mobile / 50k desktop.

### FR Coverage Map

> Verification: all 100 FRs + sub-suffix FRs (FR-1A, FR-12A, FR-43A, FR-58A, FR-58B, FR-58C) = 106 entries assigned to exactly one epic. Epic 0 carries no FRs (operational prereq).

| Epic | FRs covered |
|---|---|
| **Epic 0** — Pre-launch Operational Continuity & Phase-0 Gates | *(no FRs — discharges PRD §9.1.1 bus-factor mitigations + UX P0-1 through P0-5 launch gates)* |
| **Epic 1** — Platform Foundation, Multi-Tenancy, RBAC & Audit | FR-44, FR-45, FR-46, FR-47, FR-59, FR-60, FR-61, FR-62, FR-63, FR-88, FR-89, FR-90, FR-91, FR-92 |
| **Epic 2** — Niyamavali Publishing & Public Trust Identity | FR-7 (registry shape + amendment workflow + diff render — interpretation moves to Epic 4), FR-68, FR-69, FR-79, FR-80, FR-94, FR-97 |
| **Epic 3** — Member Identity & Lifecycle | FR-1, FR-1A, FR-2, FR-3, FR-4, FR-5, FR-6, FR-95, FR-96 |
| **Epic 4** — Niyamavali Rules Engine & Member Validity Service | FR-8, FR-9, FR-10, FR-11, FR-12, FR-12A |
| **Epic 5** — Three-Tier Communication Channels | FR-23, FR-70, FR-71, FR-72, FR-73 |
| **Epic 6** — Claim Filing, Peer Verification, Ground Inspection & Internal Appeal | FR-37, FR-38, FR-39, FR-40, FR-41, FR-42, FR-43, FR-43A |
| **Epic 7** — Pool Engine & Cycle Spawn | FR-13, FR-14, FR-15, FR-16, FR-17, FR-18, FR-19, FR-20 |
| **Epic 8** — Sushil's Contribution Loop (Yogdaan Bahi + My Pool + UPI Intent) | FR-21, FR-22, FR-24, FR-25, FR-26, FR-27, FR-28, FR-33, FR-34 |
| **Epic 9** — Reconciliation Engine (Nominee Console + Statement Intake + Matcher + Mismatch Triage) | FR-29, FR-30, FR-31, FR-32, FR-35, FR-36, FR-50 |
| **Epic 10** — Admin Operations Console (incl. Helpdesk first-class sub-epic) | FR-48, FR-49, FR-51, FR-52, FR-54, FR-55, FR-56, FR-57, FR-58, FR-58A, FR-58B, FR-58C |
| **Epic 11a** — Public Trust Identity Shell *(parallel to Epic 3)* | FR-74, FR-75, FR-93 |
| **Epic 11b** — Memorial + Sahyog Drive *(post-Epic 9, Phase 4)* | FR-76, FR-77, FR-78 |
| **Epic 12** — Module Marketplace | FR-64, FR-65, FR-66, FR-67 |
| **Epic 13** — Growth: Field-Worker Attribution & Member Invite Loop | FR-53, FR-81, FR-82, FR-83, FR-84, FR-85, FR-86, FR-87 |
| **Epic 14** — Disaster Handling, DPO Readiness & Future-Benefit Hooks | FR-98, FR-99, FR-100 |

**Count check:** 0 + 14 + 7 + 9 + 6 + 5 + 8 + 8 + 9 + 7 + 12 + 3 + 3 + 4 + 8 + 3 = **106**. ✓

## Architectural Freeze Boundaries

> **Step-3 governance boundary artifact.** This table governs what Step 3 stories can and cannot touch without escalation. The list is **representative, not exhaustive** — exhaustive property commitments live in `architecture.md`, exhaustive cloud-control commitments live in ADRs, and exhaustive policy commitments live in the PRD. The items below are the ones whose erosion would most damage the epic decomposition above. Any change to a Frozen item requires an ADR or trustee-ratified Sprint Change Proposal; ADR-deferred fluid items require an ADR before the consuming epic ships; implementation details and continuous polish iterate freely.

### Frozen — architectural properties

| # | Frozen decision | Erosion check / anchor |
|---|---|---|
| 1 | Pool Engine deterministic assignment model (`hash(member_id + cycle_id) % N`) | Property-based tests + replay in Epic 7; reproducible from `(member_id, cycle_id)` alone |
| 2 | Event-derived member lifecycle state (§1.14) — event log is source-of-truth; persisted state is optimization only | Sprint Change Proposal Item 3; Epics 3/7/8/9 derive state from events |
| 3 | PostgreSQL RLS multi-tenant isolation model | Adversarial cross-Pariwar read test in Epic 1 CI |
| 4 | Three-tier communication hierarchy (in-app push primary → WhatsApp Business dual-gated → SMS transactional fallback; Telegram mirror fire-and-forget) | AR-15; Sprint Change Proposal Item 2 |
| 5 | **Audit log mirror immutability property** — immutable, off-site, in separate IAM tenancy, replicated ≥ 6h | AR-9/10. *GCS Object Retention Lock is the v1 implementation, ADR-backed; the immutability + off-site + separate-tenancy property is architectural and holds across pivots.* |
| 6 | Claim dual-path ICP convergence model | AR-62; dedup-key + cross-channel-visibility + override semantics |
| 7 | Pool-bound contribution semantics | FR-16/17/18; wrong-pool deposits invalid, no refund, facilitated recovery only |
| 8 | Cache-safe public-shell + authenticated-fragment composition contract | AR-48; Sprint Change Proposal Item 12. **Foundation initialized in Epic 2 Story 2.5 (Niyamavali public render — first public surface); shell + matrix entries extended in Epic 11a (Member Directory + Public-vs-Private matrix population); per-claim authenticated-fragment registry in Epic 11b.** |
| 9 | RBAC permission-key + scope-dimension model | FR-44/45/46; 12 seeded roles; server-side enforcement (AR-26) |
| 10 | **Centralized i18n + tone-guide bilingual surface contract** — every member-visible string carries Hindi parity; English never primary on member surfaces | AR-59 + FR-68/69/80. *"Hindi-first posture" is PRD policy; the parity contract is architectural.* |
| 11 | **Member Validity Service freshness invariant ≤ 60s** | FR-12A; Sprint Change Proposal Item 5; per-cohort invalidation permitted with conservative all-members fallback when scope confidence insufficient |
| 12 | **`benefit_mechanism` discriminator enum (`pool` \| `reserve`) required on every v1 rule** | FR-7 + FR-100; schema-diff CI gate installed in Epic 1; enables Durghatana Sahayata v2 activation without v1 schema change |
| 13 | **DigiLocker integration behind provider-interface abstraction** | AR-43. *Provider implementation is fluid via feature flag (FR-2 + FR-58C); abstraction itself is frozen so a provider swap is a single-module change.* |
| 14 | **Niyamavali shape-vs-engine seam (Epic 2 ↔ Epic 4)** | Epic 2 owns registry shape (`pariwar_id`, version, effective date, structured payload, amendment + diff workflow); Epic 4 owns the rule-evaluation engine. *Engine logic leaking into Epic 2's registry, or registry shape forking per evaluation path, is a freeze violation.* |
| 15 | **FR-23 nudge seam (Epic 5 ↔ Epic 6/8)** | Epic 5 owns the channel primitive (alert payload, dispatcher, per-Pariwar WA config, opt-in webhook, fallback ladder); Epic 6 (claim notifications) and Epic 8 (contribution notifications) consume via `packages/contracts/`. *Trigger logic lives with the consumer; delivery lives with the channel primitive.* |

### Fluid — three sub-categories with different freeze implications

#### A. ADR-deferred substrate choices *(need an ADR before the consuming epic ships)*

| Item | Consuming epic | Note |
|---|---|---|
| Analytics tooling/vendor selection | Epic 1 observability + Epic 10 reports | Vendor open; data-export contract frozen by FR-58A |
| Feature-flag vendor/tool selection | Epic 10 (FR-58C) | *Capability bar* frozen per Sprint Change Proposal Item 9; vendor open |
| Observability vendor selection | Epic 1 + ongoing | AR-31 surface frozen; vendor open |
| Virtualization library final choice | Epic 8 (Yogdaan Bahi) + Epic 11b (50k/10k lists) | UX-DR80 platform requirement frozen; library open |

#### B. Implementation details *(iterate during dev; no ADR required)*

- Report rendering implementation details
- Exact admin dashboard layouts
- Fine-grained queue partition sizing

#### C. Continuous polish *(iterate continuously post-launch; never frozen)*

- Final visual palette tuning
- Push notification copy iteration *(tone guide stays; copy iterates)*
- Non-critical microinteraction polish

## Epic List

> Cross-cutting commitments that span multiple epics:
> - **Accessibility gate (Reena-class)** — UX-DR66/67/68 acceptance criteria are inherited by Epic 3 (Member Identity onboarding) and Epic 8 (Sushil's Contribution Loop). One audit, two epics consume.
> - **§1.14 event-log primitive** — lives in Epic 1 (`packages/events/`); consumed by Epic 3 (member lifecycle), Epic 6 (claim state), Epic 7 (pool state), Epic 8 (alert state), Epic 9 (reconciliation events). Persisted state is optimization only; source-of-truth is event history.
> - **Friction-budget PR CI gate (UX-DR3)** — installed in Epic 0/Epic 1; enforced on every PR thereafter.
> - **One-slice-one-surface story discipline** — each story modifies API OR admin UI OR mobile UI (contract-first via `packages/contracts/`); the next story consumes the previous story's contract. This bounds story file-churn for solo-build dev-agent context windows.
> - **Phase-0 prereq gates (P0-1, P0-3, P0-4, P0-5)** — gate *all* engineering, not just the epics that explicitly list them. P0-1 (fallback-handler ledger), P0-3 (engineer-month estimate vs. SM-1 reconciliation), P0-4 (legal counsel concurrent-review scope), and P0-5 (native-stack ratify) must close in Epic 0 before substrate work begins. P0-2 (empathy field work) gates Epics 3, 6, 8 specifically.
> - **PII scrape CI gate (FR-74)** — installed in Epic 1 as foundational CI; consumes the Public-vs-Private matrix from Epic 11 once codified. Installed early so leaks cannot land in Epics 2-10 before Epic 11 ships the matrix; Epic 11 evolves the matrix entries, the CI gate exists from day one.
> - **FR-100 forward-compat hooks CI (schema-diff + `benefit_mechanism` tag)** — installed in Epic 1 as foundational CI; executed continuously across Epics 2/3/7/8 that *touch* the hooks. Epic 14 closes the final verification + disaster-handling control surfaces; the day-one CI prevents late discovery of missing tags or unintended schema additions.

---

### Epic 0: Pre-launch Operational Continuity & Phase-0 Launch Gates

Operational prereq epic — discharges PRD §9.1.1 bus-factor mitigations + UX P0-1..P0-5 gates before Epic 1 merges. No FRs (operational). **15 stories** spanning continuity / empathy / governance / legal / validation / launch-gates. Full body and stories in §Epic 0 below.

---

### Epic 1: Platform Foundation, Multi-Tenancy, RBAC & Audit

The architectural substrate — Pariwar isolation, RBAC, tamper-evident audit log, admin authentication, edge protection. 14 FRs + 2 foundational CI gates (FR-74 PII scrape, FR-100 non-add + tag). **21 stories** spanning `[PRIMITIVE]` substrate, `[SURFACE]` (admin auth, provisioning, integrity-verification UI), and `[GOVERNANCE]` (4 CI gates). Full body and stories in §Epic 1 below.

---

### Epic 2: Niyamavali Publishing & Public Trust Identity

The trust becomes *publicly real* — Niyamavali registry shape, amendment-with-diff, public render with version diff, T&C version-pinning, consent registry primitive, bilingual i18n utility, tone-guide enforcement process. 7 FRs + AR-48 public Astro SSR shell **foundation initialized here**. **7 stories** spanning `[PRIMITIVE]` (i18n, registry shape, consent registry), `[SURFACE]` (admin amendment workflow, public Niyamavali render, T&C public page), and `[GOVERNANCE]` (tone-guide process). Full body and stories in §Epic 2 below.

---

### Epic 3: Member Identity & Lifecycle

Sushil signup + lock-in + renewal-with-grace + Life Events + voluntary withdrawal + DPDPA data export + RTBF anonymization. 9 FRs · three named demoable scenarios (signup / renewal / withdrawal-RTBF). **13 stories** spanning `[PRIMITIVE]` (lifecycle state machine, DigiLocker provider abstraction), `[SURFACE]` (mobile auth, KYC, nominee, medical disclosure, signup payment, lock-in widget, renewal, Life Events, withdrawal, data export), and `[CONSUMER]` (RTBF anonymization extends withdrawal). Inherits accessibility gate from Story 0.10 P0-2c. Full body and stories in §Epic 3 below.

---

### Epic 4: Niyamavali Rules Engine & Member Validity Service

The canonical "is this member valid right now?" answer. R7/R8/R5/R9/R11/R12 all evaluate from Epic 2's Niyamavali registry. FR-12A returns deterministic, idempotent, audit-logged payload with rule-by-rule provenance and `applicable_niyamavali_clauses[]` (via stable `clause_id`). **8 stories** spanning `[PRIMITIVE]` (rule engine), `[CONSUMER]` (R7, R8, R5/R9+R14, R12), `[SURFACE]` (Validity Service + `<MemberStatusPanel>`), and `[GOVERNANCE]` (per-cohort cache invalidation with conservative-recompute fallback). Full body and stories in §Epic 4 below.

---

### Epic 5: Three-Tier Communication Channels

Channel primitive only — structured `alert` payload + dispatcher + per-Pariwar WA config + opt-in webhook + fallback ladder. Trigger logic lives in Epic 6 + Epic 8 via FR-23 nudge seam (architectural freeze row 15). **9 stories** spanning `[PRIMITIVE]` (alert payload + dispatcher), `[CONSUMER]` (push, WA outbound, Telegram, SMS fallback), `[SURFACE]` (WA opt-in webhook handler, step-up OTP delivery), `[GOVERNANCE]` (cost-optimization, degraded-mode bridge). Full body and stories in §Epic 5 below.

---

### Epic 6: Claim Filing, Peer Verification, Ground Inspection & Internal Appeal

**Highest-stakes epic** (₹50L/decision). Dual-path intake → ICP convergence → OCR parity → peer mesh + ground inspection (both) → Anita's verifier console (₹50L design budget) → State Trustee freeze → R9 voting where applicable → 3-stage appeal flow with reversed-denial publish to Sahyog Vivran. **16 stories** spanning `[PRIMITIVE]` (claim case + ICP), `[CONSUMER]` (OCR, peer mesh, concealment-flag routing), `[SURFACE]` (Ravi-mode, helpline-mediated, ground inspection, nominee bank, verifier console, decision strip, shepherd, State Trustee approval, R9 voting, appeal). Full body and stories in §Epic 6 below.

---

### Epic 7: Pool Engine & Cycle Spawn

**Math heart of PRD §9.1.** Correctness is non-negotiable. Atomic cycle-freeze with saga decomposition, deterministic `hash(member_id + cycle_id) % N` assignment, property-based + replay tests, fixed-amount snapshot, pool-bound payment enforcement (wrong-pool invalid; facilitated recovery), under-funded cycle Pool-Reality framing, pre-launch measured-validation gate (N=50/M=4L<60s p95), onboarding tutorial. **10 stories** spanning `[PRIMITIVE]` (pool object + snapshot, naming, spawn saga, deterministic assignment, pool-bound enforcement, idempotency), `[CONSUMER]` (fixed-amount workflow), `[GOVERNANCE]` (Pool-Reality framing, validation gate), `[SURFACE]` (onboarding tutorial). Full body and stories in §Epic 7 below.

---

### Epic 8: Sushil's Contribution Loop (Yogdaan Bahi + My Pool + UPI Intent + Contribution Note)

**The defining experience SM-1 measures.** Sushil's surface. Yogdaan Bahi (passbook), My Pool card (home-screen anchor), UPI Intent (90-second loop), Contribution Note PDF (never "receipt"). FR-23 nudge seam *consumer*. Epic 8 closes at yellow pill — green-flip is Epic 9. **12 stories** spanning `[CONSUMER]` (alert state machine, contributor list, notification triggers, calendar timing), `[SURFACE]` (My Pool card, UPI flow, Yogdaan Bahi, PDF, helpline CTA, failure coach), `[GOVERNANCE]` (out-of-band contribution policy, 90s measurement instrumentation). Full body and stories in §Epic 8 below.

---

### Epic 9: Reconciliation Engine (Nominee Console + Statement Intake + Matcher + Mismatch Triage)

**Anita and Sunita's world.** Reconciliation pipeline + Nominee Console with "fursat" cadence + 5-bank parser allowlist (SBI/PNB/BoB/BoI/Bihar coop) + 50 golden files/bank + UTR matcher cron 6×/day + mismatch triage with screenshot upload + reconciliation review queue. **Yellow → green flip is the only path to confirmed status (Story 8.4 invariant consumer).** **12 stories** spanning `[PRIMITIVE]` (bank parser, matcher, StatusPill), `[CONSUMER]` (yellow→green flip, dual-account, retry reminders), `[SURFACE]` (Nominee Console, upload, mismatch surfaces, review queue, PoolProgressCard), `[GOVERNANCE]` (over-payment recovery). Full body and stories in §Epic 9 below.

---

### Epic 10: Admin Operations Console — News/Blog, Helpdesk (first-class sub-epic), Bulk Ops, Reports, Feature Flags, Moderation

Largest by mixed-concern surface area. **Helpdesk is architecturally first-class** (Sprint Change Proposal Item 11, AR-47 §3.5a) — own module, routing-policy registry, member-facing UI, cross-link integration points. **15 stories** spanning `[PRIMITIVE]` (helpdesk data model + routing policy, bulk ops framework, feature flags, custom fields JSONB), `[SURFACE]` (member ticket filing, helpline call-to-ticket, helpdesk admin console, news/blog, reports, banners, moderation, Trustee-Lite, fixed-amount setter, permission delegation, survey). Full body and stories in §Epic 10 below.

---

### Epic 11: Public Transparency Surfaces — split into 11a (early shell) + 11b (memorial + drive)

**Move 3 split rationale:** Epic 11 carries two demoable closures with very different dependency profiles. **11a (Public Trust Identity Shell)** depends only on Epics 1-3 and ships parallel to Epic 3, getting twt.org returning real content to search-result visitors months earlier and letting the FR-74 matrix evolve under real surfaces rather than being scaffolded against future ones. **11b (Memorial + Sahyog Drive)** depends on the full claim+pool+reconciliation chain and rightly holds the line for Phase 4 — a rushed Shradhanjali surface is worse than a delayed one (Sally's call). Sahyog Vivran still lives in 11b, not Epic 6.

---

#### Epic 11a: Public Trust Identity Shell (parallel to Epic 3)

Shell + tiered visibility matrix + Member Directory + obfuscation. **6 stories** spanning `[GOVERNANCE]` (4-tier matrix codification, obfuscation defense-in-depth), `[PRIMITIVE]` (Astro shell extension, NoticeboardStrip, PinnedNotice), `[SURFACE]` (Member Directory PII-shielded with anti-enumeration). Full body and stories in §Epic 11a below.

---

#### Epic 11b: Memorial + Sahyog Drive (post-Epic 9, Phase 4)

Sahyog Drive + Sahyog Vivran + In Memoriam + memorial components + Real Data Test gate. **Inherits Epic 11a institutional-transparency framing, 4-tier matrix, anti-enumeration patterns.** **8 stories.** Full body and stories in §Epic 11b below.

---

### Epic 12: Module Marketplace

Module manifest + admin targeting wizard + member shelf + grief-context structural suppression (state-machine-enforced via Story 3.1 `account-frozen` derived overlay) + lead-handoff transport (partners are downstream consumers, not state co-owners) + time-bombed lifecycle. **6 stories.** Full body and stories in §Epic 12 below.

---

### Epic 13: Growth — Field-Worker Attribution & Member Invite Loop

Vikram-class field workers + Sushil's invite loop. Phase B (≥1L members) commission flow deferred to v2; chain data captured in v1. **8 stories.** Full body and stories in §Epic 13 below.

---

### Epic 14: Disaster Handling, DPO Readiness & Future-Benefit Hooks (Durghatana Sahayata)

Disaster-window control surfaces + DPO readiness + FR-100 forward-compat verification. **7 stories.** Full body and stories in §Epic 14 below.

---

## Epic 0: Pre-launch Operational Continuity & Phase-0 Launch Gates

Discharges PRD §9.1.1 bus-factor mitigations and the UX spec's P0-1 through P0-5 prerequisites *before* Epic 1 merges. Solo-build is correctly understood as bus-factor-of-one; this epic makes the trust legally and operationally able to survive a single engineer's absence on day one.

**Deliverables (testable closure):**

- Runbooks for every operational task in Solo Builder's head (deploy, rollback, secret rotation, audit-log integrity verification, reconciliation manual-intervention, RBAC seed reset, multi-Pariwar provisioning) — signed off by Trustee Panel.
- Credential escrow with ≥2 trustees (sealed; opened only on trustee-quorum action); covers prod DB, Cloudflare admin, Dokploy admin, partner integrations, payment intent / banking, DigiLocker integration, DPDPA breach-reporting tooling.
- Code escrow — repo mirrored to ≥1 trustee-controlled location; auto-updated on every release-branch push.
- Degradation policy — written per-surface for "Solo Builder unavailable > 7 days" scenario; comms template prepared.
- Knowledge-transfer documentation — ADRs, Niyamavali → FR mapping, deployment topology, on-call playbook, third-party dependency inventory with renewal dates.
- Backup engineer arrangement — named contracted external engineer with read-access + retainer agreement (₹15-25k/month per A-13); Trustee Panel authorization recorded in `.decision-log.md`.
- **P0-1 fallback-handler ledger** — every Phase-1 loop node's `fallback_handler` role assigned, funded, on-rota, with SLA + contact rota published (UX-DR4).
- **P0-2 empathy field work** — 5 Shikshakamitra + 1 bereaved-spouse conversations in Vaishali district + ≥1 Hindi-using visually-impaired/low-vision member's interaction with TWT surfaces + ≥4 hours observation shadowing actual small-trust helpline operator (UX-DR5). **Must complete before Epic 3 (Reena onboarding), Epic 6 (Anita's verifier console), Epic 8 (Sushil's contribution loop).**
- **P0-3 spec-to-cadence reality check** — single-engineer-month estimate per loop + per Tier-N surface, reconciled against SM-1 (6-9 month target). 3-4× mismatch surfaced in PRD must be resolved via cut scope OR moved SM-1 OR contracted help. Owner: BigDev.
- **P0-4 legal counsel onboarding** — concurrent-review scope before §1 Trust Loops engineering work begins; reviews trust-posture copy, DPDPA consent flow, denial-appeal flow procedural fairness, Account State Machine transition table, dual-path claim authority-to-file evidentiary specification.
- **P0-5 native-stack validation experiment** — ~2-week prototype of three named patterns (Yogdaan Bahi, Shradhanjali Sahyog Vivran, Panchayat Noticeboard) on three test devices; pass criteria P1-P6 (UX-DR6). Substrate-dependent engineering does not begin without ratify decision.
- **Architectural launch-gate inventory** — all entries in architecture §Launch Gate Risks scheduled with named owner + closure criteria (per Sprint Change Proposal Item 17 + AR-49).

**FRs covered:** *None directly* — Epic 0 is an operational prereq epic. Discharges AR-49, AR-50, AR-66, AR-67, UX-DR3, UX-DR4, UX-DR5, UX-DR6.

**Demoable closure:** Trustee Panel reviews and signs off the operational-readiness ledger. P0-5 prototype produces ratify decision logged in `.decision-log.md`. Engineering substrate gate is open.

**Dependencies:** None. Epic 0 itself is a prerequisite.

**Story tag legend:** `GOV` governance/trustee/schedule · `OPS` operational artifacts · `LEGAL` legal counsel/compliance · `HUMAN` empathy/field-work/real-user · `CONTINUITY` bus-factor/escrow/KT · `VALIDATION` technical-prototype/ratify

### Story 0.1: Operational Runbooks Authored & Trustee-Signed `[OPS]`

As a Trustee Panel,
I want every operational task that today lives only in Solo Builder's head documented as a runbook,
So that any future engineer or contractor can perform deploy, rollback, secret rotation, audit-log integrity verification, reconciliation manual-intervention, RBAC seed reset, and multi-Pariwar provisioning without consulting Solo Builder.

**Acceptance Criteria:**

**Given** the operational-task inventory derived from architecture.md §Ops + the Niyamavali → FR mapping
**When** Solo Builder authors a runbook per task
**Then** every task has a runbook with: prerequisites, step-by-step procedure, rollback procedure, verification checks, contact escalation list
**And** each runbook is reviewed and signed off by ≥2 trustees in the operational-readiness ledger
**And** runbooks are stored in the trustee-accessible repo with version history

**Given** a non-Solo-Builder engineer follows a runbook
**When** they execute the operation under simulated bus-factor activation
**Then** the runbook is self-sufficient — no Solo Builder consultation required to complete the operation

### Story 0.2: Credential Escrow Established with Trustee Quorum Open `[CONTINUITY]`

As a Trustee Panel,
I want production credentials (prod DB, Cloudflare admin, Dokploy admin, partner integrations, payment intent / banking, DigiLocker integration, DPDPA breach-reporting tooling) sealed in escrow openable only by trustee-quorum action,
So that the trust can recover access if Solo Builder is unreachable for >7 days.

**Acceptance Criteria:**

**Given** the credential inventory of every production-affecting system
**When** credentials are sealed in escrow
**Then** each credential envelope is sealed and opening requires ≥2-trustee quorum
**And** escrow location is documented and known to all trustees
**And** a dry-run quorum-open is performed on a single non-load-bearing credential (e.g., a staging API key) and successfully re-sealed

**Given** Solo Builder is unreachable >7 days (table-top scenario)
**When** trustees execute the quorum-open procedure
**Then** the trust accesses every production system without Solo Builder consultation

### Story 0.3: Code Escrow Auto-Mirror Pipeline Live `[CONTINUITY]`

As a Trustee Panel,
I want the TWT repository auto-mirrored to ≥1 trustee-controlled location on every release-branch push,
So that the codebase survives if Solo Builder's primary repo access is lost.

**Acceptance Criteria:**

**Given** a trustee-controlled mirror destination is provisioned
**When** any commit lands on a release branch
**Then** the commit auto-replicates to the mirror within 10 minutes
**And** the mirror is read-access verified by ≥2 trustees
**And** a restoration drill is performed: starting from the mirror, a trustee-authorized engineer can build and deploy a non-production environment

**Given** the primary repo becomes inaccessible (scenario simulation)
**When** trustees switch to the mirror
**Then** development resumes from the mirror without data loss

### Story 0.4: Per-Surface Degradation Policy Authored `[CONTINUITY]`

As a Trustee Panel,
I want a written degradation policy per surface for the "Solo Builder unavailable >7 days" scenario,
So that members and nominees receive coherent communication and minimum-viable continuity when the system or its operator degrades.

**Acceptance Criteria:**

**Given** the member-facing + admin-facing surface inventory
**When** the degradation policy is authored
**Then** every surface has a documented degradation stance: which features stay live, which are gracefully suspended, what user-facing copy explains the situation
**And** comms templates (push, WA, SMS, email, public-page banner) are pre-written and marked "pending legal review" until Story 0.13 engagement activates
**And** the policy is signed off by ≥2 trustees

**Given** a 7-day-outage table-top exercise
**When** trustees walk through the scenario
**Then** every member-facing decision has a documented answer — no ad-hoc improvisation required

### Story 0.5: Knowledge-Transfer Documentation Pack Compiled `[CONTINUITY]`

As a Trustee Panel and any future engineer,
I want a complete knowledge-transfer pack — ADRs, Niyamavali → FR mapping, deployment topology, on-call playbook, third-party dependency inventory with renewal dates,
So that the trust's technical context is recoverable without Solo Builder.

**Acceptance Criteria:**

**Given** the existing planning artifacts (PRD, architecture, UX spec, ADRs, this epics doc)
**When** the KT pack is compiled
**Then** the pack contains: index of ADRs with current status, Niyamavali clause → FR mapping table, deployment topology diagram, on-call playbook covering incident triage + escalation paths, dependency inventory with vendor / contract / renewal-date / contact
**And** the pack is stored in the trustee-accessible repo
**And** the contracted backup engineer (Story 0.6) reads the pack cold and answers ≥80% of a standardized comprehension questionnaire

### Story 0.6: Backup Engineer Contracted with Trustee Authorization `[CONTINUITY]`

As a Trustee Panel,
I want a named external engineer under contract with read-access + ₹15-25k/month retainer per A-13,
So that the trust has a defined hand-off destination when Solo Builder is unavailable.

**Acceptance Criteria:**

**Given** trustee authorization recorded in `.decision-log.md`
**When** the backup engineer is contracted
**Then** a signed retainer agreement exists with ₹15-25k/month payment schedule, scope of work, NDA, response-time SLA
**And** the engineer has read-access to the repo, KT pack, and runbooks
**And** an onboarding session is conducted and logged in `.decision-log.md`

**Given** the activation scenario
**When** the backup engineer is activated
**Then** they successfully complete at least one non-production operational task using only the KT pack + runbooks within 48 hours of activation request

### Story 0.7: P0-1 Fallback-Handler Ledger Published with SLA + Rota `[OPS]`

As a member at any Phase-1 loop node where automation can fail,
I want a named fallback handler with SLA and contact rota at every such node,
So that no loop-node failure leaves me stranded without human help.

**Acceptance Criteria:**

**Given** the AR-61 "staff-fallback at every node" architectural commitment
**When** the fallback-handler ledger is authored
**Then** every Phase-1 loop node (claim filing, peer mesh, ground inspection, reconciliation, helpdesk, denial appeal, KYC fallback, UPI failure coach) has: assigned `fallback_handler` role, funded position or rota assignment, response-time SLA, published contact rota
**And** the ledger is published in the admin-accessible operations runbook
**And** the ledger is reviewed and signed by ≥2 trustees

**Given** a synthetic loop-node automation failure
**When** the fallback handler is paged via the published rota
**Then** the handler responds within the documented SLA

### Story 0.8: P0-2a Teacher Empathy Interviews Completed `[HUMAN]`

As Solo Builder designing for Sushil-class members,
I want 5 unstructured Shikshakamitra conversations in Vaishali district documented,
So that downstream design decisions in Epics 3 and 8 are grounded in lived experience, not assumption.

**Acceptance Criteria:**

**Given** 5 currently-serving Shikshakamitra in Vaishali district have given informed consent
**When** Solo Builder conducts the interviews
**Then** each interview is ≥45 minutes, conducted in Hindi, in the teacher's preferred location, with consent + recording (if agreed) or detailed notes
**And** synthesis identifies: financial-literacy baseline, mobile-device usage patterns, comfort with UPI, trust-source mapping (whom they consult about money), grief experience
**And** synthesis is filed in `_bmad-output/research/p0-2a-teacher-interviews.md`
**And** synthesis is reviewed by ≥1 trustee before Epic 3 substrate work begins

**Given** the synthesis identifies findings divergent from PRD/UX assumptions
**When** Solo Builder reviews divergences
**Then** any divergence is recorded as an open question and reconciled before Epic 3/8 design freezes

### Story 0.9: P0-2b Bereaved-Spouse Conversation Completed `[HUMAN]`

As Solo Builder designing for Ravi-mode and nominee surfaces,
I want a documented conversation with 1 bereaved spouse who has experienced a death-benefit claim process (TSCT or comparable),
So that the dignified-validation grammar (UX §12 Pattern 4) is validated against actual grief rather than imagined grief.

**Acceptance Criteria:**

**Given** ethical consent + trustee approval for the sensitive conversation
**When** the conversation is conducted
**Then** the conversation is ≥60 minutes, in Hindi, in a setting the spouse chooses, with explicit consent (not direct quotation unless re-confirmed)
**And** synthesis identifies: emotional pace tolerance, document-gathering experience, interaction with trust staff, what felt dignified vs. transactional, role of family/community in the claim
**And** synthesis is filed in `_bmad-output/research/p0-2b-bereaved-spouse.md`
**And** Sally's UX Pattern 4 dignified-validation grammar is explicitly evaluated against findings; any required revisions are recorded before Epic 6 (claim filing) design freezes

### Story 0.10: P0-2c VI/Low-Vision Member Accessibility Validation `[HUMAN]`

As Solo Builder designing Reena-class accessibility,
I want ≥1 Hindi-using visually-impaired or low-vision member's actual interaction with TWT surface prototypes documented,
So that UX-DR66/67/68 acceptance criteria are validated against real assistive-tech usage, not synthetic audit.

**Acceptance Criteria:**

**Given** a participant identified (via Bihar disability network, school-inclusion network, or trustee referral) with informed consent
**When** the validation session is conducted
**Then** the participant uses TWT prototype surfaces with their preferred assistive tech (screen reader, magnification, voice control) for ≥60 minutes across signup flow + My Pool card + Yogdaan Bahi flows
**And** observation notes capture: where they succeeded, where they got stuck, what assistive-tech behavior surprised the designer, what copy or interaction patterns broke
**And** findings are filed in `_bmad-output/research/p0-2c-vi-validation.md`
**And** UX-DR66/67/68 acceptance criteria are revised based on findings before Epic 3 + Epic 8 design freeze (accessibility gate)

### Story 0.11: P0-2d Operator Shadowing Completed `[HUMAN]`

As Solo Builder designing the helpdesk + helpline subsystem (Epic 10),
I want ≥4 hours observation shadowing an actual small-trust helpline operator,
So that Epic 10's helpdesk routing-policy registry, SLA semantics, and call-to-ticket flow are grounded in operator reality.

**Acceptance Criteria:**

**Given** access to a small-trust helpline (TSCT or analogous) with operator + caller consent
**When** Solo Builder shadows ≥4 hours across multiple shifts
**Then** observation notes capture: call category distribution, average handling time, common caller pain points, escalation patterns, what the operator wishes their tooling did, where the operator improvises around process gaps
**And** findings inform Epic 10 helpdesk story design — specifically routing-policy categories, SLA targets, and the helpline call-to-ticket flow (SM-1 demo beat C3)
**And** findings are filed in `_bmad-output/research/p0-2d-operator-shadowing.md`

### Story 0.12: P0-3 Spec-to-Cadence Reality Check Reconciled `[GOV]`

As Solo Builder and Trustee Panel,
I want a single-engineer-month estimate per loop node + per Tier-N surface reconciled against the SM-1 6-9 month target,
So that the 3-4× mismatch surfaced in PRD is resolved through cut scope OR moved SM-1 OR contracted help before Epic 1 substrate work commits.

**Acceptance Criteria:**

**Given** the Epic List from Step 2
**When** Solo Builder estimates effort per epic in engineer-months
**Then** total estimate is compared against the SM-1 6-9 month target
**And** if mismatch is >1.5×, a written reconciliation decision is recorded in `.decision-log.md` choosing one or more of: cut scope (which stories deferred), move SM-1 (new target with trustee ratification), contract help (which scope outsourced)
**And** the reconciliation decision is signed by ≥2 trustees
**And** the Epic List + sprint plan are updated to reflect the reconciliation

**Given** the reconciliation is in effect
**When** Step 4 final validation runs
**Then** the reconciled scope is what Step 4 validates against (not the original Epic List)

**Dev Notes (added 2026-06-01 per Story 0.12 author-commit):** Framework authored at `docs/spec-to-cadence-reconciliation/` per Decision 2026-06-01-012 (README + estimation-methodology + estimation-worksheet + per-loop-node-estimates × 8 + per-tier-surface-estimates × 3 + reconciliation-decision-framework + backfill-log). Tasks 7–11 are `_AWAITING EXTERNAL ACTION_` (Solo Builder substantive estimate authoring + Trustee Panel ≥2-trustee ratification + Epic List + sprint plan updates + Step 4 validation). AR-49 P0-3 row (architecture line 4779) + UX §Phase-0 P0-3 discharge pending Task 9 + Task 11 closure.

### Story 0.13: P0-4 Legal Counsel Concurrent-Review Engagement Signed `[LEGAL]`

As a Trustee Panel,
I want a signed engagement with legal counsel for concurrent review of trust-posture copy, DPDPA consent flow, denial-appeal procedural fairness, Account State Machine transition table, and dual-path claim authority-to-file evidentiary specification — before §1 Trust Loops engineering work begins,
So that legal-compliance risk doesn't surface late in implementation.

**Acceptance Criteria:**

**Given** a shortlist of qualified counsel with relevant practice (DPDPA, trust law, financial services)
**When** the engagement is signed
**Then** the engagement letter specifies: review scope per the above list, response SLA (e.g., 5-10 biz days per artifact), retainer or per-artifact pricing, conflict-of-interest disclosure, NDA
**And** the engagement is logged in `.decision-log.md` with trustee authorization
**And** the first review artifact (T&C draft for Epic 2) is submitted to counsel within 2 weeks of signing

**Given** counsel returns reviews on the artifacts listed in scope
**When** Epic 2/3/6 stories that touch those artifacts begin
**Then** the legal-review feedback is incorporated; remaining feedback is tracked as ongoing dependencies, not blockers on demoable closure

**Dev Notes (added 2026-06-02 per Story 0.13 author-commit):** Framework authored at `docs/legal-counsel-engagement/` per Decision 2026-06-02-013 (README + engagement-letter-template + review-scope-charter with 32-row cross-Story deferred-scope inventory + 13-row regulatory surface review + 6-row pre-launch checkpoint coverage + review-artifact-roster with 19 priority-ordered placeholder rows + per-artifact-return-roster + counsel-roster with shortlist criteria + engagement-ledger with 11 §-log sections). Tasks 7–11 are `_AWAITING EXTERNAL ACTION_` (Trustee Panel scope ratification + Solo Builder + Trustee Panel counsel shortlist + selection + named-counsel engagement-letter signature + NDA + COI disclosure + first-artifact submission within 2 weeks of signing + counsel returns within per-artifact 5-10 biz days SLA + Epic 2/3/6 integration + upstream Story cross-reference resolution per Story 0.4 comms-templates × 5 + Story 0.6 contract-template §6/§9/§10/§11 + Story 0.5 ADR slots × 5 + Story 0.2 DPO envelope + Story 0.5 third-party-dependency-inventory Section E × 7 + Story 0.7 denial-appeal node + Story 0.12 contract-help-path budget). UX §Phase-0 P0-4 + epics line 564 + 687 P0-4 launch-gate property + architecture §Launch Gate Risks subsidiary legal-counsel-naming rows at architecture lines 4785-4788 discharge pending Task 11 closure across AC-1 first-submission scope. **Architecture P0-N numbering divergence note:** Architecture line 4783 names "P0-4 Empty/Skeleton/Error Inventory" (UX deliverable) while epics + UX P0-4 = legal counsel onboarding; Story 0.13 discharges UX/epics P0-4, NOT architecture line 4783; flagged for Story 0.15 launch-gate inventory reconciliation. Story 0.13 constitutes the FIFTH Phase-0 portfolio distinct from bus-factor-of-one mitigation (Stories 0.1-0.6) + loop-node operational-responsiveness (Story 0.7) + empathy field-work (Stories 0.8-0.11) + spec-to-cadence-funding-reconciliation (Story 0.12).

### Story 0.14: P0-5 Native-Stack Validation Prototype + Ratify Decision Logged `[VALIDATION]`

As Solo Builder,
I want a ~2-week prototype of Yogdaan Bahi + Shradhanjali Sahyog Vivran + Panchayat Noticeboard patterns tested on three named devices against P1-P6 pass criteria,
So that the substrate (Expo / React Native vs. native) decision is made on measured evidence rather than aspiration, before any substrate-dependent engineering begins.

**Acceptance Criteria:**

**Given** three test devices procured (entry-level Android, mid-tier Android, iPhone SE-class)
**When** the prototype runs the three named patterns on all three devices under throttled cellular
**Then** each pattern's measurement matches the P1-P6 pass criteria (cold-start time, frame rate 60fps target / 30fps minimum, virtualized list scroll smoothness, push-notification reliability, UPI Intent round-trip, accessibility-tech compatibility)
**And** measurements are recorded with screenshots/video evidence in `_bmad-output/research/p0-5-native-stack-validation.md`
**And** a ratify (or pivot) decision is recorded in `.decision-log.md` with trustee acknowledgement

**Given** the ratify decision
**When** Epic 1 substrate stories begin
**Then** the substrate choice is the one ratified here; re-litigation requires a new ADR plus trustee-ratified justification

> **Dev Notes (added 2026-06-02 per Decision 2026-06-02-014):** Story 0.14 framework author-committed 2026-06-02 at `docs/native-stack-validation/` per Decision 2026-06-02-014 — README + experiment-protocol (UX spec §6 verbatim + per-pattern/device/criterion procedures + ~2-week timebox + FM-2 mitigation discipline + BigDev decision authority) + device-procurement-roster (3 placeholder rows at `procurement_status = pending-budget-ratification`; substantive `cost_estimate_inr` at Task 7 cross-coupled with Story 0.12 contract-help-path budget) + measurement-template (54-cell measurement matrix `device × pattern × criterion` pre-staged with `_PENDING-MEASUREMENT_` literal in every cell + `not-applicable-iOS-OS-level-different` P2 iPhone carve-out per UX spec line 818) + pass-criteria-evaluation-framework (all-must-hold per UX spec line 814 + more-protective-governs disposition forbids rounding-up sub-threshold measurements + verdict aggregation rule + WCAG 2.1 AA cross-coupling per UX spec line 816 FM-2 validation gate + silent-pass forbidden rule) + ratify-decision-template (§1-§8 schema with `<TO-BE-AUTHORED-AT-TASK-11>` placeholders + ≥1-trustee acknowledgement threshold per BigDev decision authority per UX spec line 845 distinct from prior Stories ≥2-trustee quorum + re-litigation discipline ≥2-trustee + new ADR per epics line 941) + pivot-evaluation-decision-tree (F1-F5 fail-criteria response paths verbatim from UX spec lines 830-843; F1 Devanagari → per-role fallback ladder Tiro/Yatra/Mukta + Noto/Hind/Mukta + Plex Mono/Sans+tnum per UX spec lines 712-714 + 1129; F2 UPI Intent → PWA-only stack via Android Chrome URL scheme; F3 push fail → augmented push FCM topic + SMS bridge OR PWA Web Push; F4 velocity fail → simpler substrate OR delayed SM-1 via Story 0.12 reconciliation; F5 community shift → hand-rolled native primitives via FM-1 adapter swap OR Flutter migration per FM-2) + engagement-ledger (11 §-log sections schema-only) + AC-named research artifact scaffolded at `_bmad-output/research/p0-5-native-stack-validation.md` per epics line 936 with §1-§11 schema + §5 54-cell matrix pre-staged + §6-§7 evidence sections with `_PENDING-EVIDENCE-CAPTURE_` placeholders + §8-§10 with `<TO-BE-AUTHORED-AT-TASK-11>` placeholders + §11 cross-link to Decision 2026-06-02-014 + evidence subdir at `_bmad-output/research/p0-5-native-stack-validation-evidence/` with per-device subfolders. Tasks 7-11 `_AWAITING EXTERNAL ACTION_` — Trustee Panel experiment-scope + device-procurement-budget ratification (Task 7 cross-coupled with Story 0.12) + Solo Builder three-device procurement (Task 8) + ~2-week Expo + RN + Tamagui prototype build under CNG workflow per architecture §4.5 + Tiro Devanagari Hindi + Noto Sans Devanagari + IBM Plex Mono Devanagari per UX spec lines 712-714 + RN Accessibility props per UX spec lines 1199-1201 + Tamagui/Radix accessibility wiring per UX spec lines 685-687 + MMKV persister + Expo Image + Expo Router + FlatList tuning OR FlashList per architecture §4.6 (Task 9) + measurement collection under throttled cellular + 54-cell matrix population + evidence capture (Task 10) + ratify-or-pivot decision + ≥1-trustee acknowledgement + ADR-NNNN-native-mobile-stack-ratify substantive content at `docs/knowledge-transfer/adr-index.md` line 52 + architecture line 4784 P0-5 row flip + architecture lines 150-152 amendment + Epic 1 substrate-work unblock + Story 0.10 P0-2c PRECONDITION-2 unblock (Task 11). Per [[feedback_closure_language_precision]]: framework-leg = **Closed by [edit]**; Tasks 7-11 legs = **Resolved via explicit deferral**.

### Story 0.15: Architectural Launch-Gate Inventory Scheduled with Owners `[GOV]`

As a Trustee Panel,
I want every entry in architecture §Launch Gate Risks (per AR-49) scheduled with named owner + closure criteria + target date,
So that no launch-gate risk surprises the trust late in Phase 1.

**Acceptance Criteria:**

**Given** the architecture §Launch Gate Risks section + Sprint Change Proposal Item 17
**When** the inventory is authored
**Then** every entry has: named owner (Solo Builder, specific trustee, or external contractor), closure criteria (objective, testable), target date, current status (`open`, `in-progress`, `closed`, `deferred-with-ADR`)
**And** inventory is signed off by ≥2 trustees
**And** inventory is reviewed in the standing trustee-panel meeting at least monthly until all entries close or defer-with-ADR

**Given** an entry closes
**When** the closure is recorded
**Then** evidence of closure is linked (the ADR, the test result, the signed-off runbook, etc.)
**And** any entry that misses its target date triggers an escalation review at the next trustee meeting

---

## Epic 1: Platform Foundation, Multi-Tenancy, RBAC & Audit

The architectural substrate — Pariwar isolation, role-based access, tamper-evident audit log, admin authentication, edge protection. The three uncompromisable subsystems' RBAC + multi-tenant isolation third (PRD §9.1) is built and frozen here, test-first. The §1.14 event-log primitive lives in `packages/events/` and becomes the foundation every downstream epic's domain state is *derived from* (per Sprint Change Proposal Item 3 — persisted state is optimization only; source of truth is event history).

**User Outcome:** Solo Builder bootstraps the Turborepo monorepo. A Pariwar exists at the database + auth + audit level. Admins authenticate via email + password + WebAuthn passkey + step-up OTP. Cloudflare + Bot Management + Turnstile gate all public traffic. Every privileged action emits a hash-chained audit line replicated every 6h to off-site Object-Retention-Locked Cloud Storage. Cross-tenant RLS isolation passes adversarial CI tests.

**FRs:** FR-44 (RBAC permission keys), FR-45 (scope dimensions), FR-46 (12 seeded roles), FR-47 (audit log + hash chain + off-site mirror), FR-59 (`pariwar_id` first-class + RLS), FR-60 (branding bundle), FR-61 (separate-app-per-Pariwar build), FR-62 (Dokploy auto-deploy + K8s migration path), FR-63 (Pariwar-Passport data model), FR-88 (Cloudflare + Bot Management + Turnstile), FR-89 (rate limiting), FR-90 (login wall), FR-91 (forced pagination), FR-92 (honeypot + noindex), **FR-74 CI gate** *(Public-vs-Private scrape-test infrastructure; consumes matrix entries owned by Epic 11; enforces from day one across all intermediate epics)*, **FR-100 CI gate** *(schema-diff + `benefit_mechanism` enum-tag tests; non-add verification of Durghatana Sahayata forward-compat hooks; full disaster-handling closure remains in Epic 14)*.

**Anchoring ARs:** AR-1 (Turborepo bootstrap — **Story 1**), AR-2/3 (Cloud SQL Postgres + RLS), AR-4 (Zod), AR-5 (pg-boss), AR-6 (drizzle-kit), AR-8 (`packages/events` immutability + event-log primitive — **substrate for §1.14, Epic 3 member state, Epic 7 pool state, Epic 9 reconciliation**), AR-9/10 (audit log + IAM Isolation Commitment §2.10a), AR-12 (PII encryption tiers + Cloud KMS HSM + Google Tink), AR-13 (Secret Manager), AR-14 (member state machine §1.14 *primitive only* — state transitions consumed in Epic 3), AR-22 (admin WebAuthn passkey), AR-25 (multi-Pariwar URL path scope), AR-26 (server-side RBAC enforcement), AR-27 (GCP `asia-south1` service map), AR-29 (CI/CD), AR-33 (edge-only ingress), AR-38 (REST + OpenAPI + Zod), AR-52 (Edge/WAF capability bar + pivot readiness), AR-57 (determinism & replay), AR-58 (idempotency keyed store), AR-60 (friction-budget PR CI gate installation).

**UX-DR anchors:** UX-DR7-UX-DR12 (design system foundation: tokens, typography, i18n utility, FM-1 to FM-14 hardening — *covered by Story 1.17*), UX-DR71 (vocabulary discipline — Story 1.17), UX-DR73 (numeral discipline — Story 1.17), UX-DR74 (Account State Machine framework — primitive, Story 1.3).

**Demoable closure:** Adversarial cross-Pariwar RLS read test passes (any leak is P0). Admin logs in via passkey + step-up OTP. Test audit-log entry persists to Postgres hot + Cloud Storage cold; integrity-check job verifies the chain; mirror lives in separate GCP project per IAM Isolation Commitment. Cloudflare front sits in front of an otherwise-unreachable backend. **Multi-Pariwar provisioning walkthrough (SM-1 demo beat C1):** Solo Builder demos provisioning a second Pariwar via the FR-61/FR-62 Dokploy auto-deploy flow with FR-60 branding bundle swap; second Pariwar serves traffic on its own URL path scope (AR-25) with independent rule set. **Trustee-facing audit-log integrity verification (SM-1 demo beat C11):** trustee runs one-click verification job from admin UI; hash chain validates; off-site mirror in separate GCP project (AR-9/10) confirmed; tamper-detection demo — synthetic tamper attempt is caught and surfaces a red audit-failure banner with the offending entry id.

**Dependencies:** Epic 0 (operational prereq) complete.

**Story label legend:** `[PRIMITIVE]` substrate building block consumed downstream · `[SURFACE]` UI or API surface a user touches · `[GOVERNANCE]` CI gate, policy, audit · `[CONSUMER]` wires primitives into running surfaces (unused in Epic 1; available for downstream).

### Story 1.1: Turborepo Monorepo Bootstrap `[PRIMITIVE]`

As Solo Builder,
I want a Turborepo monorepo bootstrapped with workspaces for `apps/api`, `apps/admin`, `apps/member`, `packages/contracts`, `packages/events`, `packages/ui`,
So that every subsequent story has a consistent build / lint / test / typecheck pipeline.

**Acceptance Criteria:**

**Given** Story 0.14's ratified substrate decision
**When** the Turborepo workspace is initialized
**Then** workspace structure matches AR-1's prescribed layout (apps/, packages/, infra/, config/)
**And** TypeScript strict mode is enabled at root tsconfig with inherited project configs
**And** `pnpm install`, `turbo build`, `turbo lint`, `turbo typecheck`, `turbo test` all complete on an empty repo
**And** CI pipeline runs the same commands on every PR

**Given** the bootstrap is complete
**When** a future story adds a new app or package
**Then** it inherits the build/lint/test pipeline without per-workspace duplication

### Story 1.2: Cloud SQL Postgres + Drizzle Migration Tooling `[PRIMITIVE]`

As Solo Builder,
I want a Cloud SQL Postgres instance provisioned in `asia-south1` with Drizzle ORM and drizzle-kit migration tooling,
So that every data model story has a single canonical place to author / version / apply migrations.

**Acceptance Criteria:**

**Given** GCP `asia-south1` is the architecturally-frozen primary region
**When** Cloud SQL Postgres is provisioned
**Then** the instance lives in `asia-south1` with automated backups + PITR enabled
**And** Drizzle schema authoring scaffolding lives in `packages/db` with drizzle-kit migrations
**And** `pnpm db:migrate` applies migrations idempotently against the dev DB
**And** the connection string is loaded from Cloud Secret Manager, not from env file

**Given** the DB is provisioned
**When** a Drizzle migration is authored and applied
**Then** schema-diff CI (Story 1.16c) verifies the change against v1 baseline schema constraints

### Story 1.3: `packages/events` Event Log Primitive (§1.14 Source-of-Truth) `[PRIMITIVE]`

As Solo Builder,
I want an event log primitive in `packages/events` enforcing §1.14 (event history is source-of-truth; persisted state is optimization only),
So that every downstream epic's domain state is event-derived and audit-reproducible by construction.

**Acceptance Criteria:**

**Given** Sprint Change Proposal Item 3's source-of-truth commitment
**When** `packages/events` is authored
**Then** the primitive exposes `appendEvent(streamId, eventType, payload, expectedVersion)` with optimistic concurrency, `loadEvents(streamId)`, `replayState(streamId, reducer)`
**And** events are immutable (append-only enforced via Postgres triggers)
**And** every event carries `event_id`, `stream_id`, `event_type`, `payload`, `event_version`, `occurred_at`, `actor_id`, `pariwar_id`
**And** the Account State Machine framework primitive (UX-DR74) lives here as a generic `StateMachine<S, E>` interface; concrete member-state lifecycle is added in Epic 3

**Given** an event stream
**When** state is replayed from events
**Then** the result is deterministic and idempotent across repeated replays

### Story 1.4: `packages/contracts` Zod + OpenAPI Contract Scaffolding `[PRIMITIVE]`

As Solo Builder,
I want `packages/contracts` exposing Zod schemas as canonical contract source-of-truth with OpenAPI generation,
So that every API surface in every downstream epic is contract-first and consumer epics compile against the same types.

**Acceptance Criteria:**

**Given** AR-4 + AR-38 commitments (Zod + REST + OpenAPI)
**When** `packages/contracts` is authored
**Then** Zod schemas are organized per domain (members, claims, pools, contributions, etc. — directories exist as placeholders even when empty)
**And** OpenAPI spec is generated from Zod schemas via a build step
**And** both `apps/api` (server validation) and `apps/admin` / `apps/member` (client types) import from this single package
**And** breaking schema changes are caught by a contract-diff CI step (placeholder until 1.16c lands)

**Given** a new endpoint contract is authored in Zod
**When** the build runs
**Then** OpenAPI spec, server validator, and client types all stay in sync without manual reconciliation

### Story 1.5: Cloud KMS HSM + Google Tink Envelope Encryption (PII Tiers) `[PRIMITIVE]`

As Solo Builder,
I want a PII encryption envelope using Cloud KMS HSM + Google Tink per AR-12 PII tier model,
So that every PII field landing in DB in subsequent epics is encrypted at rest by construction.

**Acceptance Criteria:**

**Given** AR-12 PII tier model + AR-13 Secret Manager pattern
**When** the encryption envelope is authored in `packages/crypto`
**Then** tier-1, tier-2, tier-3 PII keys exist in Cloud KMS HSM with appropriate IAM (per Isolation Commitment §2.10a)
**And** `encrypt(tier, plaintext)` and `decrypt(tier, ciphertext)` are exposed as Drizzle column transformers
**And** key rotation procedure is documented in the runbook (Story 0.1 inventory)
**And** Tink envelope encryption follows Google's recommended pattern

**Given** a Drizzle column annotated with a PII tier
**When** a row is written
**Then** plaintext never lands in DB; only ciphertext + KMS key reference

### Story 1.6: `pariwar_id` First-Class + RLS Adversarial Test `[PRIMITIVE]`

As any Pariwar admin,
I want my Pariwar's data structurally invisible to admins of other Pariwars, enforced via Postgres RLS keyed on `pariwar_id`,
So that a multi-tenant data leak is prevented at the database layer, not at the application layer.

**Acceptance Criteria:**

**Given** the architectural-freeze on PostgreSQL RLS multi-tenant isolation model (table row 3)
**When** `pariwar_id` is added as a first-class column to every Pariwar-scoped table
**Then** RLS policies enforce that every query reads/writes only rows matching the session's `pariwar_id`
**And** `pariwar_id` is set from the authenticated session, not from request body
**And** Drizzle migration patterns ensure new tables inherit RLS by default

**Given** an adversarial cross-Pariwar read test (Pariwar A admin attempts to read Pariwar B data)
**When** the test runs in CI
**Then** every cross-tenant read returns zero rows regardless of query shape
**And** any leak (even a single row) fails CI as a P0

### Story 1.7: Pariwar-Passport Data Model + Branding Bundle `[PRIMITIVE]`

As a Pariwar admin,
I want a Pariwar-Passport entity carrying the Pariwar's identity, configuration, and branding bundle,
So that per-Pariwar customization (display name, logos, colors, locale defaults) is registry-driven rather than hardcoded.

**Acceptance Criteria:**

**Given** FR-63 Pariwar-Passport + FR-60 branding bundle requirements
**When** the Pariwar-Passport data model is authored
**Then** the schema carries `pariwar_id`, `display_name_en`, `display_name_hi`, `legal_name`, `trust_registration_id`, `branding_bundle` (logo URLs, primary/secondary colors, optional accent), `locale_default` (`hi` | `en`), `created_at`, `created_by`
**And** the branding bundle is consumable by Epic 11a public Astro shell and admin UI chrome (Story 1.9 onwards)

**Given** a Pariwar's branding bundle is updated
**When** any rendering surface reads the bundle
**Then** the surface reflects the change within 60 seconds (cache-invalidation parallel to Validity Service freshness)

### Story 1.8: RBAC Permission-Keys + Scope-Dimensions + 12 Seeded Roles `[PRIMITIVE]`

As a Pariwar admin,
I want a server-enforced RBAC model with permission-keys (verb-on-resource), scope dimensions (national / state / district / Pariwar-wide / self), and the 12 seeded roles from FR-46,
So that every privileged action in every epic is authorized server-side via a single coherent model.

**Acceptance Criteria:**

**Given** FR-44 + FR-45 + FR-46 + AR-26 (server-side RBAC enforcement)
**When** the RBAC primitive is authored in `packages/rbac`
**Then** permission-keys follow `verb.resource` convention; scope dimensions are an enum `national | state | district | pariwar | self`
**And** the 12 seeded roles per FR-46 are defined declaratively with their permission-key × scope combinations
**And** the API layer exposes a `requirePermission(key, scope, resourceLocator)` middleware that fails-closed on any missing match

**Given** a request to a permission-gated endpoint
**When** the requester's role doesn't carry the required permission-key at the required scope
**Then** the request returns 403 with an audit log line (audit lands in Story 1.10)

### Story 1.9: Admin Authentication — Email/Password + WebAuthn Passkey + Step-Up OTP `[SURFACE]`

As a Pariwar admin,
I want to log into the admin app with email + password + WebAuthn passkey, with step-up OTP for sensitive actions,
So that admin access is phishing-resistant and high-stakes actions carry a second factor.

**Acceptance Criteria:**

**Given** AR-22 + AR-23 + AR-24 + FR-90 (login wall)
**When** the admin login flow is implemented
**Then** the first factor is email + password (Argon2id hash, peppered)
**And** the second factor is a WebAuthn passkey registered to the admin's device(s); max 2 trusted devices per admin
**And** refresh tokens are 90 days; access tokens are short-lived (≤ 15 min)
**And** step-up OTP fires on flagged sensitive actions (defined by the consuming endpoint via middleware annotation)

**Given** an admin attempts a step-up-gated action
**When** they have not completed step-up OTP in the current session window
**Then** the action prompts for step-up OTP; on success the elevated context expires after a short window (~5 min); on failure audit log records the failed attempt

### Story 1.10: Tamper-Evident Audit Log + Hash Chain + 6h Off-Site Mirror `[PRIMITIVE]`

As a Trustee Panel,
I want every privileged action to emit a tamper-evident audit log line with hash chaining, hot-persisted to Postgres and 6-hourly mirrored to a Cloud Storage Object-Retention-Locked bucket in a separate IAM tenancy,
So that no post-hoc modification of admin actions is possible without detection.

**Acceptance Criteria:**

**Given** FR-47 + AR-9/10 (audit log + hash chain + off-site mirror) + the architectural-freeze immutability property (table row 5)
**When** the audit log primitive is authored
**Then** every audit line carries `audit_id`, `pariwar_id`, `actor_id`, `actor_role`, `action`, `resource_locator`, `request_payload_hash`, `response_status`, `prev_audit_hash`, `audit_hash` (= hash of prev_audit_hash + this row's content), `recorded_at`
**And** writes are append-only enforced at DB layer (no UPDATE / DELETE on the audit table)
**And** a 6-hourly job replicates new audit lines to a Cloud Storage bucket with Object Retention Lock in a separate GCP project (per Isolation Commitment §2.10a)
**And** the mirror's destination project has no inbound IAM grants from the primary project; mirror credential is a one-way push

**Given** the audit log accumulates over time
**When** the integrity-check primitive (Story 1.11a) verifies the hash chain
**Then** any broken chain link is detected and the offending row identified

### Story 1.11a: Audit-Log Integrity Verification Primitive `[PRIMITIVE]`

As Solo Builder,
I want a background job that walks the audit log hash chain and verifies integrity end-to-end on a daily schedule and on-demand,
So that any tampering attempt is caught by automated detection, not by manual discovery during incident.

**Acceptance Criteria:**

**Given** the audit log + hash chain shipped in Story 1.10
**When** the integrity-verification primitive is authored
**Then** the job loads audit rows in chunks (e.g., 1000 at a time), verifies each `audit_hash` against `hash(prev_audit_hash + row_content)`, and continues until end-of-chain
**And** the job is invoked: (a) on cron at 02:00 daily, (b) on-demand via a server endpoint, (c) automatically after every 6h Cloud Storage mirror push
**And** the job result is persisted to a separate `audit_integrity_checks` table with `verified_at`, `start_audit_id`, `end_audit_id`, `chain_valid` (bool), `first_broken_row_id` (nullable), `verifier_actor`

**Given** the chain is intact
**When** the job completes
**Then** `chain_valid = true` and `first_broken_row_id = null`; result is published to the observability sink

**Given** the chain is broken (synthetic tamper test in CI)
**When** the job runs
**Then** `chain_valid = false`, `first_broken_row_id` points to the offending row, and an alert fires (alerting hook — vendor-fluid per freeze table)

### Story 1.11b: Trustee-Facing Audit-Log Integrity Verification UI `[SURFACE]`

As a Trustee Panel,
I want a one-click "Verify audit-log integrity" button in the admin UI that runs the integrity-verification job on-demand and surfaces results visibly,
So that I can prove to regulators / press / members at any moment that the audit chain has not been tampered with (SM-1 demo beat C11).

**Acceptance Criteria:**

**Given** Story 1.11a's on-demand endpoint
**When** the trustee admin UI surface is implemented
**Then** there is a "Verify audit-log integrity" page reachable from the admin chrome, visible only to roles carrying `audit.verify` permission (Story 1.8)
**And** the page shows last automated check (timestamp, range, result, verifier), a green/red status banner, and history of the last 30 checks
**And** clicking "Run verification now" invokes the on-demand endpoint, shows a progress indicator, and renders the result within ~10 seconds for a typical-size chain

**Given** a synthetic tamper attempt has succeeded (test scenario)
**When** the trustee clicks "Run verification now"
**Then** the page renders a **red audit-failure banner** showing failing row ID, the prior valid row ID, the tamper-suspect window timestamp, and the cold-mirror's last-good-state pointer
**And** the banner persists until manually acknowledged and an investigation ticket is opened

### Story 1.12: pg-boss Job Queue + Idempotency Keyed Store `[PRIMITIVE]`

As Solo Builder,
I want pg-boss installed as the canonical job queue + an idempotency keyed store primitive,
So that every queue consumer in downstream epics (cycle spawn, reconciliation matcher, channel dispatcher, integrity-check job) reuses one queue and one idempotency contract.

**Acceptance Criteria:**

**Given** AR-5 (pg-boss) + AR-58 (idempotency keyed store)
**When** pg-boss is installed and the idempotency primitive is authored
**Then** pg-boss runs co-located with the API DB (single Postgres) per AR-5
**And** the idempotency keyed store exposes `claim(key, ttl)` → `acquired | already_claimed`, `recordResult(key, result)`, `getResult(key)` for replay-safe consumer patterns
**And** queue worker registration and graceful-shutdown patterns are documented in the runbook

**Given** a downstream consumer (e.g., Epic 7 pool-spawn saga) uses the queue
**When** the same job is enqueued twice with the same idempotency key
**Then** only one execution runs and both callers see the same result

### Story 1.13: Cloudflare + Bot Management + Turnstile Edge Protection `[PRIMITIVE]`

As any visitor to a TWT-hosted surface,
I want Cloudflare with Bot Management + Turnstile gating all public traffic,
So that the backend is unreachable except through the edge and bot/abuse traffic is filtered before it reaches the app.

**Acceptance Criteria:**

**Given** FR-88 + AR-33 (edge-only ingress) + AR-52 (Edge/WAF capability bar + pivot readiness)
**When** Cloudflare is configured
**Then** Cloudflare proxies all public traffic; backend origin firewall rejects non-Cloudflare-originating IPs
**And** Cloudflare Bot Management is enabled with appropriate per-surface sensitivity
**And** Turnstile is wired into the public landing surface (Epic 11a) and authentication entry points (Story 1.9)

**Given** the architectural-freeze on Edge/WAF capability bar (Sprint Change Proposal Item 6 / AR-52)
**When** Cloudflare-specific features are used
**Then** they sit behind a `packages/edge` provider-interface abstraction so a pivot to a different edge vendor is a single-module change

### Story 1.14: Rate-Limiting + Login-Wall + Forced-Pagination + Honeypot/Noindex `[PRIMITIVE]`

As Solo Builder,
I want rate-limiting on every public/auth endpoint, login-wall on every authenticated surface, forced pagination on every list endpoint, and honeypot + noindex on admin surfaces,
So that abuse, scraping, enumeration, and discovery vectors are closed by default rather than per-endpoint.

**Acceptance Criteria:**

**Given** FR-89 + FR-90 + FR-91 + FR-92
**When** the policy enforcement layer is authored
**Then** rate-limiting is server-side enforced (not just edge-side) with per-IP + per-session + per-endpoint thresholds
**And** every authenticated endpoint requires a valid session (middleware fails closed)
**And** every list endpoint enforces server-side pagination with a capped page size; no endpoint returns unbounded result sets
**And** admin surfaces serve `X-Robots-Tag: noindex, nofollow` + honeypot routes (synthetic links bots follow, used as abuse signals)

**Given** abusive traffic patterns (synthetic test)
**When** the patterns hit the policy layer
**Then** rate-limits trip; the offending session/IP is throttled; audit log records the event

### Story 1.15: Dokploy Auto-Deploy Pipeline + Multi-Pariwar Provisioning (SM-1 C1) `[SURFACE]`

As Solo Builder + Trustee Panel,
I want a Dokploy auto-deploy pipeline triggered by release-branch pushes + a minimal admin UI for multi-Pariwar provisioning,
So that new Pariwars can be onboarded with a path-scoped URL + branding bundle in a single demo'able workflow (SM-1 demo beat C1).

**Acceptance Criteria:**

**Given** FR-61 (separate-app-per-Pariwar build) + FR-62 (Dokploy auto-deploy + K8s migration path) + AR-25 (multi-Pariwar URL path scope)
**When** the deploy pipeline is wired
**Then** any release-branch push triggers a Dokploy build + deploy; the deploy script reads target-Pariwar configuration from Pariwar-Passport (Story 1.7) and applies path-scoped routing
**And** the pipeline is documented in the runbook (Story 0.1) with rollback procedure

**Given** the admin UI for multi-Pariwar provisioning
**When** authored
**Then** the surface is **deliberately minimal** — scope is bounded to SM-1 operational provisioning controls only: (a) "Add Pariwar" form (display name EN/HI, legal name, trust reg ID, locale default, branding bundle upload, path-scope assignment), (b) "Trigger Dokploy build" action, (c) provisioning-status view. **Operational configuration that belongs in Epic 10 (admin operations console — bulk ops, feature flags, news/blog, helpdesk, reports, moderation) is NOT in scope here**; this UI is provisioning-only.
**And** access requires `pariwar.provision` permission at `national` scope (Story 1.8)

**Given** the SM-1 demo beat C1
**When** Solo Builder demos provisioning a second Pariwar on stage
**Then** the full workflow — provisioning form → Dokploy trigger → branding-bundle swap → path-scoped URL serving traffic — completes within ~10 minutes

### Story 1.16a: Friction-Budget PR CI Gate (UX-DR3) `[GOVERNANCE]`

As Solo Builder,
I want every PR run through a friction-budget CI gate per UX-DR3,
So that no incremental change silently degrades the member-facing loop performance budget.

**Acceptance Criteria:**

**Given** UX-DR3 friction-budget commitment + cross-cutting commitments inventory
**When** the friction-budget gate is implemented
**Then** the gate measures a defined set of friction-budget metrics (page-weight, JS bundle size for member app, critical-render-path timing on canonical device) against per-PR baselines
**And** PRs that exceed thresholds fail CI with a clear diff showing the regression
**And** thresholds are versioned in `friction-budget.yaml` at the repo root; threshold changes require a separate PR with rationale

**Given** a PR that improves friction-budget
**When** the gate runs
**Then** it passes and updates the baseline-of-record

### Story 1.16b: PII Scrape CI Gate (FR-74 Foundational) `[GOVERNANCE]`

As Solo Builder,
I want a PII scrape-test CI gate consuming the Public-vs-Private matrix from Epic 11a,
So that no public-surface PII leak can land in any intermediate epic before Epic 11 ships its full transparency surfaces.

**Acceptance Criteria:**

**Given** the FR-74 commitment in the cross-cutting commitments inventory + the Public-vs-Private matrix codified in Epic 11a
**When** the PII scrape gate is implemented
**Then** the gate consumes `public-vs-private-matrix.yaml` (lives in `packages/contracts/public-pages/`) — Epic 11a populates this file; Epic 1 only ships the gate that consumes it
**And** for each surface declared `Never Public`, the gate scrapes the rendered public output (or the API response shape) and asserts no matching PII field appears
**And** any leak fails CI; the offending surface and field are named in the failure output
**And** the gate runs against rendered surfaces in CI's test-environment public render

**Given** Epic 11a has not yet codified the full matrix
**When** the gate runs against an empty / minimal matrix
**Then** the gate is a no-op (passes); it becomes meaningful as Epic 11a populates the matrix

### Story 1.16c: Schema-Diff CI Gate (FR-100 Non-Add Guard) `[GOVERNANCE]`

As Solo Builder,
I want a schema-diff CI gate enforcing that v1 ships no `payout_destinations` table, column, endpoint, validator, or UI,
So that Durghatana Sahayata activation at v2 must be a greenfield addition rather than a column/index add to v1 tables (FR-100 forward-compat hooks discipline).

**Acceptance Criteria:**

**Given** FR-100 non-add commitment + Epic 14 closure framing
**When** the schema-diff gate is implemented
**Then** the gate compares every PR's Drizzle migration set against the v1 baseline and asserts: no table named `payout_destinations` is created; no column matching `payout_destination*` is added to any existing table; no API endpoint path matches `/payout-destinations*`; no Zod schema in `packages/contracts/` matches `*PayoutDestination*`
**And** any match fails CI with a clear pointer to the offending artifact
**And** the gate's pattern list is versioned in `fr-100-non-add.yaml` so future v2 development can explicitly allow these patterns

**Given** a PR adds an unrelated table (e.g., `member_addresses`)
**When** the gate runs
**Then** it passes — the gate is precision-scoped to FR-100 artifacts only

### Story 1.16d: `benefit_mechanism` Tag CI Gate (FR-100 Enum-Tag Guard) `[GOVERNANCE]`

As Solo Builder,
I want a CI gate enforcing that every Niyamavali rule landing in the registry (Epic 2) carries a `benefit_mechanism: 'pool' | 'reserve'` discriminator and that v1 rules only ever use `'pool'`,
So that Durghatana Sahayata's v2 `'reserve'` activation is forward-compatible from day one and accidentally-untagged rules cannot land.

**Acceptance Criteria:**

**Given** FR-7 + FR-100 commitment (`benefit_mechanism` enum required on every rule)
**When** the tag gate is implemented
**Then** the gate inspects rule fixtures, migrations, and seed data in CI and asserts: every rule record carries `benefit_mechanism`; the enum value is one of `'pool' | 'reserve'`; for v1 (controlled by a build flag `BENEFIT_MECHANISM_V1_ONLY`), only `'pool'` is permitted on inserts
**And** the gate runs on every PR that touches rule-related migrations or fixtures
**And** when v2 is ready (Epic 14 closure or later), the build flag flips and `'reserve'` becomes permitted

**Given** a PR adds a rule fixture without `benefit_mechanism`
**When** the gate runs
**Then** CI fails and names the offending rule

### Story 1.17: Design System Foundation — Tokens / Typography / Vocabulary / Numeral Hardening `[PRIMITIVE]`

As Solo Builder and every consumer-epic engineer,
I want `packages/ui` to ship a token registry (color, spacing, typography scales, semantic CSS layer) + FM-1..FM-14 forensic-microcopy rules + vocabulary register + numeral discipline before any member-visible surface is built,
So that UX-DR7-12, UX-DR71, UX-DR73 commitments are land-once / consume-everywhere rather than re-litigated per surface.

**Acceptance Criteria:**

**Given** UX-DR7-UX-DR12 (design system foundation), UX-DR71 (vocabulary discipline), UX-DR73 (numeral discipline) commitments
**When** `packages/ui` is authored
**Then** the package ships: (a) token registry — color palette with semantic aliases (`bg`, `surface`, `text`, `accent`, `danger`, `success`, `warning`, etc.), spacing scale, typography scale with Hindi + English faces; (b) FM-1..FM-14 forensic-microcopy rules encoded as a lint set runnable in CI; (c) vocabulary register naming canonical terminology ("Yogdaan Bahi" not "passbook", "Contribution Note" not "receipt", "Sahyog Vivran" not "report", etc.); (d) numeral discipline rules (Devanagari vs. Latin numerals per locale + per surface context); (e) semantic CSS class generator from tokens
**And** all of the above are documented with usage examples in `packages/ui/README.md`
**And** a placeholder consumer app builds successfully importing from `packages/ui`

**Given** a future story authors a new surface
**When** it imports tokens / types / lint rules from `packages/ui`
**Then** it inherits the design system without re-defining any primitive
**And** the FM-1..FM-14 lint set runs on the new surface's copy at PR time

---

## Epic 2: Niyamavali Publishing & Public Trust Identity

The trust becomes *publicly real*. Niyamavali (the rulebook) is drafted, versioned, and published on twt.org with version-diff. T&C is lawyer-review-tracked-but-not-gated and tied to Niyamavali version. Consent registry records member acceptance with timestamp. Bilingual i18n + tone-guide enforcement are wired across every member-facing surface from here forward. **AR-48 public Astro SSR shell foundation initialized here** (Story 2.5), extended in Epic 11a (Member Directory + matrix), per-claim fragments in Epic 11b.

**Note on the Niyamavali seam (per Winston):** Epic 2 owns the *registry shape* (FR-7 — `pariwar_id`, version, effective date, structured payload, amendment-with-diff workflow, audit-logged) and the *public render* (FR-79). Epic 2 does NOT own the rule-evaluation engine that interprets the payload — that lives in Epic 4. Members cannot yet be evaluated against rules; trustees can author and publish them.

**User Outcome:** Trustees can amend the Niyamavali (registry edit → diff document → audit log + member-notification scaffolding); the public Niyamavali page renders with version diff at twt.org. T&C is published, version-pinned to Niyamavali, and recoverable for any past acceptance via audit query. A non-member visiting the public site sees a trust that has a written rulebook, a clear T&C, and a respectful Hindi-first identity.

**FRs:** FR-7 (versioned per-Pariwar rule registry — registry shape + amendment workflow + diff document + audit-logged; evaluation engine deferred to Epic 4), FR-68 (bilingual content + i18n hooks), FR-69 (tone guide enforced via copy review), FR-79 (Niyamavali public page with version diff), FR-80 (Hindi-parity labels; surface-classification governs primary locale), FR-94 (T&C version-pinned to Niyamavali — Epic 2 ships the T&C surface + version-pin mechanism; **lawyer-review turnaround tracked as external dependency via Story 0.13, does not gate Epic 2 demoable closure**), FR-97 (consent registry — granular records, revocable).

**Anchoring ARs:** AR-46 (per-Pariwar configurability + extensibility registry), AR-48 (cross-surface composition contract — **public Astro SSR shell foundation initialized in Story 2.5**), AR-59 (i18n centralized utility — wired into every member-facing surface).

**UX-DR anchors:** UX-DR2 (claim-time DPDPA consent — consent registry primitive used later in Epic 6), UX-DR9 (semantic token taxonomy applied to public Niyamavali page), UX-DR11 (centralized i18n utility in use).

**Demoable closure:** Trustee uses admin UI to author a Niyamavali clause + amendment; diff renders correctly; publishes to public website; non-logged-in visitor reads the Niyamavali in Hindi or English; T&C version-pin mechanism validates against a placeholder T&C body. Audit log records the publish event. Lawyer-review of final T&C content lands per Story 0.13 schedule and is not a gate on Epic 2 closure.

**Dependencies:** Epic 1 (auth + audit + branding bundle + RBAC + idempotency + design system foundation). *Note: i18n utility ships here in Story 2.1, not Epic 1.*

**Story label legend:** `[PRIMITIVE]` substrate building block · `[SURFACE]` UI or API surface a user touches · `[GOVERNANCE]` CI gate, policy, audit, sign-off gate · `[CONSUMER]` wires primitives into running surfaces.

### Story 2.1: i18n Centralized Utility (`packages/i18n`) + Bilingual Surface Contract `[PRIMITIVE]`

As Solo Builder and every consumer epic that ships a member-facing surface,
I want a centralized i18n utility in `packages/i18n` enforcing the bilingual surface contract — member-visible surfaces default Hindi-primary; admin surfaces default English-primary; every member-visible string carries Hindi parity,
So that the architectural-freeze bilingual contract (table row 10) is enforced at the utility level, not re-litigated per surface.

**Acceptance Criteria:**

**Given** AR-59 + FR-68 + FR-80 + architectural-freeze row 10 (centralized i18n + tone-guide bilingual surface contract)
**When** `packages/i18n` is authored
**Then** the utility exposes `t(key, params, options)` resolver with locale + namespace support; `useLocale()` hook for client-side surfaces; `getLocale(request)` for server-side surfaces (resolves from auth session > Pariwar-Passport `locale_default` > browser `Accept-Language` > Hindi fallback)
**And** translation keys are organized per domain in `packages/i18n/locales/{hi,en}/{domain}.json`
**And** the build-time validator asserts: every key in `en/` has a Hindi parity entry in `hi/`; surfaces declared `member-facing` cannot ship a string missing Hindi; surfaces declared `admin-facing` may ship English-only
**And** the surface-classification convention is documented (`apps/member` defaults Hindi-first; `apps/admin` defaults English-first; consumer surfaces declare their classification on import)

**Given** a member-facing surface adds a new key only to `en/`
**When** CI runs the build-time validator
**Then** CI fails naming the missing Hindi parity entry

### Story 2.2: Tone Guide + Vocabulary Enforcement Process `[GOVERNANCE]`

As a Pariwar admin authoring member-visible copy,
I want a tone-guide document + copy-review checklist + publish sign-off gate that complements Story 1.17's FM-1..FM-14 lint set,
So that human-judgment dimensions of tone (warmth, dignity, register) are explicitly reviewed rather than assumed satisfied by automated lint.

**Acceptance Criteria:**

**Given** FR-69 (tone guide enforced via copy review) + Story 1.17's FM-1..FM-14 lint set
**When** the tone-guide artifact is authored
**Then** a published tone-guide document exists at `docs/tone-guide.md` covering: voice (warm, plain, dignified, never sales-y), register per surface (Yogdaan Bahi = dignified-respectful; Sahyog Vivran = honorific; admin warnings = factual-precise), prohibited frames (loss/scarcity framing on cycle-close per Pool-Reality #2), grief-context modulation rules
**And** the publish workflow for any member-visible copy (News/Blog, Niyamavali clause, T&C, push notification template, helpdesk macro) routes through a tone-review checklist that a non-author reviewer signs off on; sign-off is recorded in the audit log via Story 1.10
**And** the FM-1..FM-14 lint set (Story 1.17) is the *automated* enforcement floor; tone-review is the *human* check above it; both are required before publish

**Given** any member-visible copy is queued for publish
**When** publish is attempted without recorded tone-review sign-off
**Then** publish is blocked at the API layer; audit log records the blocked attempt

### Story 2.3: Niyamavali Rule Registry Data Model + Amendment-with-Diff Storage `[PRIMITIVE]`

As Solo Builder authoring the Niyamavali registry foundation,
I want a versioned per-Pariwar rule registry data model with **stable human-readable clause identifiers** and amendment-with-diff storage,
So that downstream rule references (Epic 4 engine, Epic 6 claim evaluation, member-facing surfaces, audit logs, regulator queries) resolve to stable clause IDs that survive amendment / version history cleanly.

**Acceptance Criteria:**

**Given** FR-7 + AR-46 + architectural-freeze row 12 (`benefit_mechanism` enum required per Story 1.16d CI gate) + row 14 (Niyamavali shape-vs-engine seam)
**When** the Niyamavali registry data model is authored
**Then** the schema carries: `clause_version_id` (UUID, primary key per row), `clause_id` (stable human-readable identifier — see format below), `pariwar_id`, `version` (monotonically increasing integer starting at 1 per `clause_id`), `effective_date`, `payload` (JSONB structured rule content), `benefit_mechanism` (enum `pool | reserve`, NOT NULL, enforced by Story 1.16d CI gate), `predecessor_clause_ids` (text[] — tracks splits / merges across amendments), `superseded_by_version` (nullable FK to next version of same `clause_id`), `deprecated_at` (nullable timestamp), `authored_by_actor`, `authored_at`, `audit_id` (FK to Story 1.10 audit line)
**And** the **`clause_id` format** is `niy.<section-slug>.<clause-slug>[.<subclause-slug>]` — lowercase kebab-with-dots; e.g., `niy.contribution-discipline.r7-a` (R7(A) restoration rule), `niy.ninety-percent-rule.r8` (R8), `niy.special-death.r9-suicide-murder` (R9 + Mar 2025 rule)
**And** `clause_id` is **allocated by trustee at clause-create time** (not auto-generated); validated for format + uniqueness per Pariwar; **immutable once assigned — never changes through amendment, deprecation, or version increment**
**And** allocation conflicts (attempted reuse or collision) are rejected by the API layer with a 409

**Given** a clause is amended
**When** the amendment is persisted
**Then** a new row is inserted with same `clause_id`, incremented `version`, new `payload`, fresh `clause_version_id`, populated `predecessor_clause_ids` (the prior version's `clause_version_id`), and the prior row's `superseded_by_version` is updated to point at the new row
**And** the amendment diff (computed as structured-payload diff between prior and new versions) is persisted as a separate `niyamavali_amendments` table entry linking `from_clause_version_id` → `to_clause_version_id` with a JSONB `diff_document`

**Given** a clause is split into multiple new clauses (one-to-many) or merged from multiple predecessors (many-to-one)
**When** the new clause(s) are persisted
**Then** `predecessor_clause_ids[]` carries one or more prior `clause_id` references; the lineage chain is queryable forward (which clauses descend from this one?) and backward (which clauses did this one originate from?) — this is the canonical "where did this rule come from?" query for audit + regulator review

**Given** a clause is deprecated (replaced by another `clause_id` or retired without successor)
**When** deprecation is persisted
**Then** `deprecated_at` is set on the latest version row; the `clause_id` is **NEVER reused** for a different clause; downstream references to the deprecated `clause_id` continue to resolve correctly (audit history preserved)

**Given** a downstream consumer (Epic 4 engine, Epic 6 verifier console, audit query, regulator export) references a clause
**When** the reference is resolved
**Then** the consumer must specify EITHER `clause_id` (resolves to the latest non-deprecated version effective at resolution time — "current rule") OR `clause_version_id` (resolves to that exact historical version, immutable — "rule as it was on date X"); both query patterns are first-class

### Story 2.4: Niyamavali Amendment Workflow Admin UI + Audit-Logged Publish `[SURFACE]`

As a Pariwar Admin or higher role,
I want an admin UI workflow to author + amend + publish Niyamavali clauses with diff preview + tone-review sign-off (Story 2.2) + audit logging (Story 1.10),
So that the registry shape commitments from Story 2.3 are exposed as a usable trustee workflow.

**Acceptance Criteria:**

**Given** Story 2.3's registry shape + Story 1.8 RBAC (`Pariwar Admin` or higher) + Story 1.10 audit log + Story 2.2's tone-review gate
**When** the admin UI workflow is authored
**Then** trustees with `niyamavali.amend` permission can: (a) create a new clause with `clause_id` allocation (validates format + uniqueness per Pariwar), (b) edit a clause draft (does not affect published version until published), (c) preview the diff between draft and current published version with both structured-payload diff and rendered-content diff, (d) submit for tone-review (routes to a non-author reviewer carrying `niyamavali.review` permission), (e) publish (only after tone-review sign-off + within RBAC scope)
**And** publish emits a single audit log line with full diff document + tone-reviewer attribution + `clause_id` + `clause_version_id`
**And** publish triggers a member-notification scaffolding hook (placeholder — Epic 5 consumes to fire `niyamavali.amended` push notifications to affected members)

**Given** a publish attempt without tone-review sign-off
**When** the publish endpoint is called
**Then** the request is rejected with a 409 indicating `tone-review-required`; UI surfaces the rejection clearly

### Story 2.5: Public Astro SSR Shell Foundation + Niyamavali Public Render with Version Diff `[SURFACE]`

As any non-member visitor to twt.org,
I want to read the Niyamavali in Hindi or English with version diff history,
So that "is this trust real?" returns a credible answer before I consider signing up — and the AR-48 public Astro SSR shell foundation is initialized here for downstream public surfaces (Epic 11a, Epic 11b) to extend.

**Acceptance Criteria:**

**Given** FR-79 + AR-48 (foundation initialized here per amended freeze table row 8) + UX-DR9 (semantic token taxonomy consumed from Story 1.17)
**When** the Public Astro SSR Shell foundation is authored
**Then** an Astro project lives in `apps/public` with: route-based SSR; cache-safe HTML output (no per-user PII can leak into cache); auth boundary at `apps/api/modules/public-pages/`; composition contract documented (which fragments are public-shell-rendered vs. authenticated-fragment — fragment registry initialized empty here; populated by Epic 11a and Epic 11b)
**And** the shell consumes Story 1.7's Pariwar-Passport branding bundle for branded chrome
**And** the shell consumes Story 2.1's i18n utility for Hindi/English toggle
**And** the shell consumes Story 1.17's `packages/ui` tokens + typography (UX-DR9)

**Given** the Niyamavali public page consumer
**When** authored
**Then** the page renders current effective clauses for the Pariwar (resolved via `clause_id` + effective-date filter on Story 2.3 registry); each clause displays title + `clause_id` (visible as a stable reference handle) + version + effective-date + structured-payload-rendered content; version selector reveals prior versions; diff selector renders any two-version structured-payload diff
**And** the page is fully server-rendered (no client-side hydration required for reading); Hindi/English toggle is a server roundtrip; the page works without JS
**And** Cloudflare edge cache TTL respects the cache-safe contract (page cacheable at edge; no PII / member-state leaks possible)

**Given** Cloudflare PII scrape CI gate (Story 1.16b) runs against this page
**When** the gate inspects rendered output
**Then** the matrix has no entries yet (Epic 11a populates it), so the gate is a no-op against this page initially — but the page is rendered in CI's test-environment public render so the gate can verify on every PR going forward

### Story 2.6: T&C Version-Pinning Mechanism + Public Render (Pending Legal Review per Story 0.13) `[SURFACE]`

As a Trustee Panel,
I want a T&C entity version-pinned to a specific Niyamavali version with public render at twt.org/terms, marked "pending legal review" until Story 0.13 engagement returns,
So that members can read the T&C and accept it at signup (consumer in Epic 3 via Story 2.7 consent registry), and historical T&C versions remain recoverable for any past acceptance.

**Acceptance Criteria:**

**Given** FR-94 + the Story 0.4 pending-legal-review pattern + Story 2.5's public Astro SSR shell
**When** the T&C version-pinning mechanism is authored
**Then** a `terms_and_conditions_versions` table carries: `tc_version_id`, `pariwar_id`, `version` (monotonically increasing per Pariwar), `body_markdown` (canonical content), `body_html_rendered` (precomputed for cache-safe SSR), `pinned_to_clause_version_ids` (text[] — list of Story 2.3 `clause_version_id`s that this T&C references), `effective_from`, `effective_until` (nullable), `legal_review_status` (`pending | under-review | reviewed-with-changes-required | approved | superseded`), `legal_reviewer_actor_id` (nullable; populated when `approved` per Story 0.13 engagement), `audit_id`
**And** the public T&C page at `twt.org/terms` renders the current `effective_from <= now < effective_until` version; when `legal_review_status` is `pending` or `under-review`, a banner reads "This T&C is provisional pending legal counsel review; revisions may follow before final publication"

**Given** legal counsel returns a review on a T&C draft via the Story 0.13 engagement
**When** the trustee marks the T&C as `approved`
**Then** `legal_reviewer_actor_id` is populated, the banner disappears from the public page, audit log records the approval transition
**And** the prior pending T&C is marked `superseded` and remains queryable for historical attestation

**Given** a member accepts a T&C at signup (Epic 3 consumer)
**When** acceptance is recorded
**Then** Story 2.7's consent registry stores the `tc_version_id` reference so historical proof of "which T&C did this member accept on which date" is recoverable for any past acceptance

### Story 2.7: Consent Registry — Granular, Revocable (UX-DR2 Primitive) `[PRIMITIVE]`

As Solo Builder authoring the consent primitive that Epic 6 (claim-time DPDPA consent) and Epic 3 (T&C acceptance + medical disclosure ack) will both consume,
I want a granular, revocable consent registry data model + API surface,
So that every consent transaction is independently auditable, revocable, and resolvable to a specific version of the artifact consented to.

**Acceptance Criteria:**

**Given** FR-97 + UX-DR2 (claim-time DPDPA consent primitive lives here, consumer in Epic 6) + AR-12 PII tier model
**When** the consent registry is authored
**Then** a `consent_records` table carries: `consent_id` (UUID), `subject_id` (member or pre-member applicant id), `pariwar_id`, `consent_type` (enum: `tc_acceptance | dpdpa_data_processing | dpdpa_data_sharing | marketing | medical_disclosure_ack | nominee_share_split | claim_time_dpdpa | ...`), `consent_artifact_ref` (free-form text — e.g., `tc_version_id`, `clause_version_id`, etc.), `granted_at`, `revoked_at` (nullable), `granted_via_actor` (enum: `member_self | staff_assisted | inherited`), `consent_payload` (JSONB — context including which checkbox text was shown, locale at time of consent, IP, user-agent if relevant), `audit_id` (FK to Story 1.10 audit line)
**And** the API exposes: `recordConsent(subject_id, type, artifact_ref, payload)`, `revokeConsent(consent_id, reason)`, `listConsents(subject_id, [filters])`, `consentExists(subject_id, type, valid_at_timestamp)` — the last is the canonical query for "did this member have valid X consent at time Y?"

**Given** a member revokes a previously-granted consent
**When** `revokeConsent` is called
**Then** `revoked_at` is set; the row is **NOT deleted** (historical proof preserved); a new audit log line records the revocation with reason; downstream consumers querying `consentExists(...)` at a current timestamp return false; querying at a pre-revocation timestamp return true

**Given** an Epic 6 claim-time DPDPA consent flow (future consumer)
**When** the flow records a member's claim-time DPDPA consent
**Then** Story 2.7's primitive is the only API touched; the consent is queryable from any subsequent audit context with full provenance (which checkbox text, what locale, what timestamp, was it revoked when)

---

## Epic 3: Member Identity & Lifecycle

Bihar teacher Sushil installs the app, picks Hindi, completes mobile + OTP, types eHRMS manually, runs DigiLocker KYC (or manual fallback → `pending-valid`), declares nominees + medical disclosure, pastes a Reference Code, pays ₹110 via UPI Intent, lands in `lock-in` with the clock running. From there: renewal with 3-month grace; Life Events (nominee, medical, address, transfer-in/out); voluntary withdrawal; DPDPA data export and RTBF anonymization.

**This epic consumes the §1.14 event-log primitive from Story 1.3.** Member state is *derived from* events emitted here (`signup.initiated`, `kyc.completed`, `vyawastha_shulk.paid`, `lock-in.entered`, `lock-in.expired`, `valid_through.reached`, `grace.entered`, `grace.expired`, `withdrawal.requested`, `rtbf.anonymized`); persisted member-state rows are optimization only. This makes Epic 7 (Pool Engine) audit-reproducibility free.

**Inherits accessibility gate from Story 0.10 P0-2c field work** (Reena-class onboarding empathy validates the dignified-validation grammar from UX §12 Pattern 4).

**User Outcome:** Sushil completes signup in a single app session — Hindi-default; DigiLocker pulls his Aadhaar photo, name, DoB; he enters eHRMS manually; declares two nominees (75/25 split, no nominee KYC, no nominee bank yet); enters his medical disclosure with explicit "concealment will deny claim" ack; pastes Vikram's 6-digit field-worker code; pays ₹110 via UPI Intent; sees the lock-in clock counting down. Annually, he renews ₹110 with a 3-month grace if he misses the date. He can update Life Events, withdraw voluntarily (12-month rejoin lock), export his data (ZIP), or exercise RTBF.

**FRs:** FR-1 (signup + mandatory ₹110), FR-1A (renewal + 3-month grace), FR-2 (DigiLocker KYC + manual fallback + future hard-mandatory flag), FR-3 (lock-in clock widget), FR-4 (multi-nominee 75/25 declaration only), FR-5 (Life Events incl. medical disclosure v1-M + IMA list), FR-6 (voluntary withdrawal + 12-month rejoin lock), FR-95 (data export ZIP), FR-96 (RTBF soft-delete + anonymize).

**Anchoring ARs:** AR-14 (member state machine §1.14 — *consumes* event-log primitive from Story 1.3), AR-21 (mobile + OTP via DLT-transactional / PE/OE), AR-23 (session: 90d refresh + 2 trusted devices), AR-24 (step-up OTP set), AR-43 (DigiLocker integration transport — isolated behind provider interface — freeze row 13), AR-67 (Vyawastha Shulk receipt indefinite retention — forward-compat for FR-100).

**UX-DR anchors:** UX-DR24 (`<MemberStatusPanel>` — member-facing FR-12A surface; data scaffolded here, canonical render in Epic 4), UX-DR50 (`<SaveAndResumeAffordance>` on Life Events grief-paced flows), UX-DR55 (Pattern 4 dignified validation — sample copy validated in Story 0.9), UX-DR56 (Pattern 5 form save-and-resume), UX-DR57 (Pattern 6 bilingual input), UX-DR66/67/68 (**accessibility gate inherited from Story 0.10 P0-2c**).

**Demoable closure (three named scenarios):**

1. **First-signup:** Sushil-class teacher completes signup end-to-end on the canonical validation device under throttled cellular — Hindi-default, DigiLocker pull (or manual fallback → `pending-valid`), eHRMS manual entry, two-nominee declaration with 75/25 split (no nominee KYC, no nominee bank yet), medical disclosure with explicit concealment-denial ack, Reference Code paste, ₹110 UPI Intent, lock-in clock running with `lock_in_days_at_join` snapshotted.
2. **Renewal-with-grace:** Reminder sequence fires at +30/+60/+75/+89; `vyawastha_shulk_status` payload validates per FR-1A; restoration after grace does NOT re-apply lock-in; death-during-grace eligibility holds, death-during-lapsed does not (R10).
3. **Withdrawal-with-RTBF:** Voluntary withdrawal forfeits ₹110, anonymizes contribution history to "an anonymous member" (RTBF per FR-96), blocks rejoin under same Aadhaar + eHRMS for 12 months; data export ZIP (FR-95) downloadable up to the withdrawal point.

**Dependencies:** Story 0.8/0.9/0.10 (P0-2a/b/c empathy + accessibility validation closed) · Epic 1 (substrate + event log + RBAC + idempotency + design system foundation) · Epic 2 (T&C version-pin, consent registry, Niyamavali registry for `clause_id` references).

**Story label legend:** `[PRIMITIVE]` substrate building block · `[SURFACE]` UI or API surface a user touches · `[GOVERNANCE]` CI gate, policy, audit, sign-off gate · `[CONSUMER]` wires primitives into running surfaces.

### Story 3.1: Member Lifecycle State Machine + Event Stream `[PRIMITIVE]`

As Solo Builder authoring the member lifecycle that downstream surfaces (signup, lock-in, renewal, withdrawal, validity service, claim filing) all consume,
I want a member lifecycle state machine + event stream that consumes Story 1.3's event-log primitive — where the persisted state column is *derived from* event replay and is never directly mutated,
So that the §1.14 source-of-truth commitment (architectural freeze row 2) is enforced by construction.

**Acceptance Criteria:**

**Given** Story 1.3's `packages/events` primitive + AR-14 + architectural-freeze row 2
**When** the member lifecycle state machine is authored in `packages/member-lifecycle`
**Then** the state machine declares states (`pending-kyc`, `pending-fee`, `pending-valid`, `lock-in`, `active`, `active-in-grace`, `lapsed-unpaid`, `withdrawn`, `anonymized`) and legal transitions per PRD §1.14 + FR-1A grace semantics
**And** every transition emits a named event on the member's event stream: `signup.initiated`, `kyc.completed`, `kyc.manual-fallback`, `nominees.declared`, `medical.disclosed`, `vyawastha_shulk.paid`, `lock-in.entered`, `lock-in.expired`, `valid_through.reached`, `grace.entered`, `grace.expired`, `withdrawal.requested`, `withdrawal.completed`, `rtbf.anonymized`

**Given** the state-mutation invariant (this story's load-bearing commitment)
**When** the persisted `member.state` column is examined
**Then** it is **derived from event replay only** — never directly UPDATEd by any code path
**And** a CI test asserts no code outside the event-replay reducer writes to `member.state`
**And** state replay is deterministic and idempotent (replaying a stream from event 1 to event N produces the same final state every time, on every machine)

**Given** any code path attempts to write to `member.state` outside the event-replay reducer (synthetic test)
**When** the write is attempted
**Then** the write is rejected at the DB layer via a Postgres trigger or RLS policy; the rejection emits an audit log line flagged as a P0 architectural violation

**Given** a downstream consumer (Epic 4 validity service, Epic 6 claim filing, Epic 12 module shelf suppression) needs member state as of a given timestamp
**When** the consumer calls `getMemberStateAt(member_id, timestamp)`
**Then** the state is computed by replaying events up to but not exceeding `timestamp` — the canonical "what was this member's state on date X?" surface

**Given** the `account-frozen` derived governance overlay state pattern (added per Epic 12 Story 12.4 dependency; load-bearing for Module Shelf suppression and future consumers)
**When** a `claim.intake.initiated` event exists for this member as the deceased subject (Story 6.1)
**Then** the lifecycle service exposes `account-frozen` as a **derived overlay state** evaluated alongside the primary lifecycle state — **NOT a directly mutable terminal state** in the member's state machine
**And** the overlay is event-derived: `claim.intake.initiated` (this member as deceased) → `account-frozen = true`; claim-case lifecycle resolution (e.g., `claim.settled`, `claim.denied-with-no-appeal-pending`, configurable policy) → overlay removed per policy
**And** **overlay evaluation is replay-safe and deterministic** — replaying the event stream produces identical overlay state at every point; consumers (Epic 12 Module Shelf suppression Story 12.4, future Sahyog Vivran rendering in Epic 11b, helpdesk routing in Epic 10, validity service in Epic 4) query the same overlay via `getMemberAccountOverlay(member_id, at_timestamp)` — no consumer re-implements claim-case-existence logic
**And** the architectural precision: `account-frozen` is a **derived governance overlay state emitted from claim-case lifecycle events rather than a directly mutable membership lifecycle terminal state**; the primary state machine (`pending-kyc`, `pending-fee`, ..., `withdrawn`, `anonymized`) is orthogonal to the overlay; both are queryable independently and together via the lifecycle service

### Story 3.2: Member Mobile + OTP Authentication `[SURFACE]`

As a teacher signing up or returning to the TWT app,
I want to authenticate via mobile number + OTP using DLT-transactional / PE/OE compliant SMS,
So that I can sign in without remembering a password and the SMS pipeline is regulator-compliant.

**Acceptance Criteria:**

**Given** AR-21 + AR-23 + AR-24
**When** the member authentication flow is implemented
**Then** the flow is: enter mobile → receive OTP via DLT-transactional SMS template → enter OTP → session established (refresh token 90 days, max 2 trusted devices)
**And** SMS template is registered under the DLT-transactional / PE/OE compliance regime (AR-56 commitment in Epic 0)
**And** rate-limit enforcement (Story 1.14) applies: max OTP requests per mobile per hour
**And** OTP delivery falls back to alternate channel (placeholder hook — Epic 5 will wire WA/voice fallback)

**Given** a member at a step-up-gated action (nominee change, withdrawal, etc.)
**When** the action is invoked
**Then** step-up OTP fires; success window expires after ~5 min; audit log records each send + consume

### Story 3.3a: DigiLocker Provider-Interface Abstraction `[PRIMITIVE]`

As Solo Builder authoring the KYC primitive that downstream stories (signup, future hard-mandatory feature flag) consume,
I want a DigiLocker integration sealed behind a provider-interface abstraction in `packages/digilocker`,
So that the architectural-freeze row 13 commitment is enforced — a future provider swap is a single-module change.

**Acceptance Criteria:**

**Given** AR-43 + architectural-freeze row 13
**When** `packages/digilocker` is authored
**Then** the package exposes a `KycProvider` interface with methods `initiate(member_id, intent)`, `verifyAndPullProfile(callback_payload)`, `getStatus(transaction_id)`; the DigiLocker implementation lives in `packages/digilocker/providers/digilocker.ts`
**And** the consumer side imports only the `KycProvider` type, never the DigiLocker concrete client; a CI test asserts no app code imports the DigiLocker SDK directly
**And** the pulled profile payload is mapped to a provider-neutral `KycProfile` shape (`aadhaar_masked_id`, `name`, `dob`, `photo_url`, `verification_strength`)
**And** error / failure modes are normalized into a provider-neutral `KycError` taxonomy (`provider_unavailable`, `user_consent_denied`, `verification_failed`, etc.)

**Given** a future provider swap (e.g., alternate KYC vendor)
**When** a new provider implementation lands in `packages/digilocker/providers/`
**Then** the feature flag (FR-58C) flips the active provider; no consumer code changes

### Story 3.3b: DigiLocker KYC Flow in Signup + Manual Fallback `[SURFACE]`

As a Sushil-class teacher signing up,
I want to complete KYC via DigiLocker (automatic Aadhaar profile pull) OR fall back to manual entry creating a `pending-valid` state for later trustee verification,
So that I can complete signup even if DigiLocker is unavailable or I prefer manual entry.

**Acceptance Criteria:**

**Given** FR-2 + Story 3.3a's `KycProvider` interface
**When** the signup KYC step is implemented
**Then** the member chooses either: (a) DigiLocker pull → consent flow → `verifyAndPullProfile` returns profile → member confirms → KYC complete (emits `kyc.completed`); or (b) Manual fallback → member types Aadhaar photo, name, DoB → submits → state advances to `pending-valid` (emits `kyc.manual-fallback`) awaiting trustee verification
**And** DigiLocker failures (provider unavailable, consent denied) automatically offer manual fallback with empathy copy ("DigiLocker is unavailable — you can enter your details manually and we'll verify them")
**And** future hard-mandatory DigiLocker flip is gated by feature flag (FR-58C); when flipped, manual fallback is hidden and a copy block explains why

**Given** the inherited accessibility gate from Story 0.10 P0-2c
**When** a VI/low-vision member uses the KYC flow with assistive tech
**Then** the entire flow is screen-reader-accessible; manual fallback fields have proper ARIA labels and per-field guidance

### Story 3.4: Nominee Declaration with 75/25 Split (No KYC, No Bank at Signup) `[SURFACE]`

As a member declaring nominees during signup or via Life Events,
I want to declare one or two nominees with a fixed 75/25 split when two are declared, providing nominee identity but NOT bank/IFSC and NOT requiring nominee KYC,
So that signup remains lightweight and bank-detail collection happens at claim time (Epic 6) when nominee identity is verified anyway.

**Acceptance Criteria:**

**Given** FR-4 (multi-nominee declaration with 75/25 split + R5(E))
**When** the nominee declaration flow is implemented
**Then** the member declares 1 or 2 nominees with fields per nominee: `nominee_name`, `relationship`, `mobile`, `address` (optional); when 2 nominees, the split is fixed 75/25 with no override
**And** the form explicitly does NOT request nominee Aadhaar / KYC documents at signup; copy reads "We'll verify nominee details only when a claim is filed"
**And** the form explicitly does NOT request nominee bank account / IFSC at signup; copy reads "Bank details will be collected from your nominee at the time of a claim"
**And** nominee declarations are emitted as `nominees.declared` events on the member's event stream (Story 3.1)

**Given** the member later updates nominees via Life Events (Story 3.9)
**When** the update is submitted
**Then** a new `nominees.declared` event is emitted (event-log is immutable; the latest event is the effective declaration); step-up OTP is required for the update

### Story 3.5: Medical Disclosure with IMA List + Concealment-Denial Ack `[SURFACE]`

As a member completing signup,
I want to disclose any IMA-listed pre-existing illnesses with an explicit acknowledgment that concealment can cause claim denial,
So that R14 concealment-penalty enforcement (FR-11, evaluated by Epic 4 Validity Service) has the consent + audit trail to enforce flag-for-State-Trustee-review rather than auto-deny.

**Acceptance Criteria:**

**Given** FR-5 + FR-11 + UX-DR55 Pattern 4 dignified-validation copy (validated against Story 0.9)
**When** the medical disclosure flow is implemented
**Then** the member is shown the canonical IMA list (curated, versioned) and selects any applicable conditions (multi-select); a free-text field collects additional context
**And** the consent block reads explicitly: "I understand that if I conceal an IMA-listed condition and my death is later linked to that condition, my nominees' claim may be denied or flagged for State Trustee review per Niyamavali clause `niy.concealment.r14`" — member checks the acknowledgment to proceed
**And** the disclosure + ack + IMA-list-version + acknowledgment-text-locale are persisted as `medical.disclosed` event + `consent_records` entry (Story 2.7) referencing the `clause_version_id` of `niy.concealment.r14`
**And** Life Events medical-disclosure-update (Story 3.9) follows the same pattern with a new event per update; concealment evaluation in Epic 4 walks the full disclosure history

### Story 3.6: Signup ₹110 Vyawastha Shulk via UPI Intent + Reference Code + Lock-In Entry `[SURFACE]`

As a Sushil-class teacher completing signup,
I want to pay the mandatory ₹110 Vyawastha Shulk via UPI Intent, capture a 6-digit Reference Code from my field-worker introducer (Vikram-class, Epic 13), and enter the lock-in state with the clock running,
So that signup completes in a single session and downstream lock-in / contribution / claim eligibility have the required entry conditions met.

**Acceptance Criteria:**

**Given** FR-1 + FR-82 (Reference Code at signup, member side) + AR-67
**When** the signup payment + lock-in entry flow is implemented
**Then** UPI Intent fires pre-filled with VPA, amount ₹110, `tn=signup-shulk-{member_id}`, `tr=signup-{member_id}-{nonce}`; member completes payment in their UPI app; returns to TWT and confirms
**And** the member can paste a 6-digit Reference Code; the code is validated against Epic 13's field-worker allocation registry; unknown codes are rejected with "Please ask your introducer for the correct code or skip if you don't have one"; skipping is permitted (Reference Code is not mandatory)
**And** the Vyawastha Shulk receipt is persisted with `paid_at`, `valid_through`, `amount`, `utr`, `payment_method` — indefinitely retained per AR-67 (forward-compat for FR-100)
**And** events emitted: `vyawastha_shulk.paid` (with receipt fields), `reference_code.captured` (with `attributed_to_fieldworker_id` if code valid)

**Given** the explicit boundary that successful Vyawastha Shulk payment alone does NOT activate membership (this story's load-bearing AC)
**When** the lifecycle state machine (Story 3.1) evaluates whether to transition to `lock-in`
**Then** ALL of the following must be satisfied for the `lock-in.entered` event to fire: (a) KYC completed OR `pending-valid` (Story 3.3b), (b) nominee declaration recorded (Story 3.4), (c) medical disclosure + concealment ack recorded (Story 3.5), (d) T&C acceptance recorded (Story 2.7 consent registry), (e) Vyawastha Shulk payment recorded (this story)
**And** if any of those is missing, the member remains in a pre-lock-in state with a clear UI signal of which step is outstanding; the `lock-in.entered` event is NOT emitted prematurely
**And** payment is recorded as a stand-alone receipt event even if other lifecycle steps are incomplete; the receipt persists indefinitely for audit / refund-rules / future-benefit-eligibility analysis
**And** when all five conditions are satisfied, `lock-in.entered` fires with `lock_in_days_at_join` snapshotted from the current Niyamavali lock-in policy (FR-8, resolved via clause `niy.lock-in.policy` at the moment of transition)

### Story 3.7: Lock-In Clock Widget on Home Screen (WI-13) `[SURFACE]`

As a member in the `lock-in` state on the home screen of TWT,
I want a topmost widget showing my lock-in countdown + rationale + unlock date with a tap-target into the Niyamavali clause explaining lock-in,
So that I understand why I cannot withdraw yet and when I will be eligible for claim coverage.

**Acceptance Criteria:**

**Given** FR-3 + Story 3.1 lifecycle state (`lock-in`) + Niyamavali clause `niy.lock-in.policy` (Epic 2 registry)
**When** the widget is implemented
**Then** the widget appears as the topmost element on the home screen ONLY for members in `lock-in` state; shows days remaining until unlock, the current lock-in policy clause reference (`clause_id`), and an unlock date formatted per locale
**And** the widget surfaces the rationale copy with a tap-target link to the Niyamavali public page (Story 2.5) deep-linked to the relevant `clause_id`
**And** when the lock-in expires (Story 3.1 emits `lock-in.expired`), the widget transitions to "My Pool" card on the next alert cycle entry (Epic 8 ActiveContributionCard consumer)

**Given** the inherited accessibility gate (Story 0.10 P0-2c)
**When** the widget renders for assistive-tech users
**Then** the countdown is announced with appropriate ARIA-live politeness; the tap-target is ≥ 44pt; Hindi-first parity contract enforced (Story 2.1)

### Story 3.8: Annual Renewal with 3-Month Grace + `vyawastha_shulk_status` Payload + Reminder Cadence `[SURFACE]`

As a member approaching the annual Vyawastha Shulk renewal date,
I want a reminder cadence (+30 / +60 / +75 / +89 days from renewal-due-date) and a renewal flow with 3-month grace period, where during grace `is_active` is preserved and restoration after grace does NOT re-apply lock-in,
So that I'm not penalized for a brief lapse and my contribution discipline (R7) is preserved across the renewal boundary.

**Acceptance Criteria:**

**Given** FR-1A + Story 3.1 lifecycle states (`active`, `active-in-grace`, `lapsed-unpaid`)
**When** the renewal cadence + flow are implemented
**Then** reminders fire at +30, +60, +75, +89 days past `valid_through` via Epic 5 channel dispatcher (subscribed via `packages/contracts/` per FR-23 nudge seam — Epic 5 owns delivery, Epic 3 owns trigger schedule)
**And** the renewal flow is identical to signup payment (Story 3.6 UPI Intent) but with `tn=renewal-shulk-{member_id}-{year}` and emits `vyawastha_shulk.renewed` event
**And** state transitions: `active` → `active-in-grace` at +1 day past `valid_through`; `active-in-grace` → `lapsed-unpaid` at +91 days past `valid_through`; renewal during grace returns state to `active` WITHOUT re-applying lock-in

**Given** Epic 4 Validity Service (FR-12A) needs renewal status
**When** it queries the lifecycle service
**Then** the canonical `vyawastha_shulk_status` payload returns `{ paid_through, days_until_lapse, in_renewal_grace, grace_remaining_days }` — this is the surface FR-12A consumes; freshness invariant ≤ 60s per architectural-freeze row 11

**Given** death-during-grace scenarios (R10)
**When** a claim is evaluated against a member who died during `active-in-grace`
**Then** eligibility holds per FR-1A; the `vyawastha_shulk_status` payload at time-of-death is what Epic 4 evaluates; death during `lapsed-unpaid` does not qualify

### Story 3.9: Life Events Panel (Nominee, Address, Transfer-In/Out, Medical Disclosure Update) `[SURFACE]`

As a member with life changes affecting my TWT record,
I want a Life Events panel to update my nominees, address, transfer-in/out status, or medical disclosure,
So that my record stays current and my nominees / contribution discipline / eligibility evaluations reflect reality.

**Acceptance Criteria:**

**Given** FR-5 + UX-DR50 (`<SaveAndResumeAffordance>`) + UX-DR55 Pattern 4 dignified-validation copy
**When** the Life Events panel is implemented
**Then** sub-types and their behaviors:
  - **Nominee updates** `[v1-S]`: re-runs Story 3.4 flow with step-up OTP; new `nominees.declared` event
  - **Address update** `[v1-S]`: simple form; new `address.updated` event with prior value preserved
  - **Transfer-in/out** `[v1-S]`: updates posting district / Pariwar; new `posting.updated` event
  - **Medical disclosure update** `[v1-M]`: re-runs Story 3.5 flow; new `medical.disclosed` event; concealment evaluation in Epic 4 walks the full disclosure history (not just the most recent); ack-required + audit-logged

**Given** UX-DR50 save-and-resume affordance + UX-DR55 Pattern 4 dignified-validation
**When** a grief-paced update is in progress (medical-disclosure-update specifically; nominee changes following a death in family)
**Then** the member can start an update, leave, and return without losing work
**And** the dignified-validation copy applies — validated against Story 0.9 findings — no aggressive prompting, no scarcity framing

**Given** any Life Event update
**When** persisted
**Then** the audit log records the change via Story 1.10; the event stream (Story 3.1) gets the appropriate event; step-up OTP gates nominee + medical updates

### Story 3.10: Voluntary Withdrawal Flow with ₹110 Forfeit + 12-Month Rejoin Lock `[SURFACE]`

As a member choosing to leave TWT voluntarily,
I want a withdrawal flow that forfeits the ₹110 Vyawastha Shulk, preserves my contribution history (anonymized via Story 3.12), and blocks rejoin under the same identity for 12 months,
So that voluntary exit is dignified, audit-preserved, and abuse-resistant.

**Acceptance Criteria:**

**Given** FR-6 + UX-DR55 Pattern 4 dignified-validation copy
**When** the withdrawal flow is implemented
**Then** the flow includes: (a) acknowledgment screen ("Withdrawing will forfeit your ₹110, retain contribution history anonymized, and prevent rejoin for 12 months under same Aadhaar + eHRMS — are you sure?"), (b) optional reason capture (dropdown + free-text), (c) step-up OTP, (d) final confirmation, (e) state transition to `withdrawn` via `withdrawal.completed` event
**And** Pattern 4 dignified-validation copy is applied (validated against Story 0.9): no aggressive retention attempts; the framing is "we understand; here's what happens"
**And** rejoin under same `aadhaar + ehrms` is blocked for 12 months; Story 3.6 signup blocks the attempt with a clear copy block ("This identity withdrew on {date}; rejoin is permitted on {date + 12 months}")

**Given** the withdrawal completes
**When** the consumer extension (Story 3.12 RTBF anonymization) runs
**Then** anonymization steps execute on the historical record; this story (3.10) closes at state = `withdrawn` with history intact and not-yet-anonymized

### Story 3.11: Data Export ZIP (DPDPA Member Right) `[SURFACE]`

As a member exercising my DPDPA data-portability right,
I want to download a ZIP containing all my data held by TWT (profile, contribution history, claim history if any, audit history of my actions, consent records, payment receipts, event stream),
So that I can take my data with me when I leave or whenever I want a copy.

**Acceptance Criteria:**

**Given** FR-95 + AR-12 PII tier model + DPDPA compliance commitment
**When** the data export flow is implemented
**Then** the member can request an export from profile settings; export generation runs as a pg-boss job (Story 1.12); takes up to several minutes for active members
**And** the ZIP contains: `profile.json` (member identity + nominees), `contribution_history.json`, `claim_history.json` (if any), `audit_history.json` (audit lines where this member is the subject), `consent_records.json` (Story 2.7), `payment_receipts.json` (all Vyawastha Shulk + contributions), `event_stream.json` (full event history per Story 3.1 — the canonical record)
**And** the export URL is one-time-use, time-limited (24h), and accessible only via authenticated session + step-up OTP

**Given** the export is downloaded
**When** the file is opened
**Then** contents are human-readable (JSON) and complete; PII fields are decrypted via Story 1.5 envelope on export generation (the member is the legitimate audience); audit log records the export action

### Story 3.12: RTBF Soft-Delete + Anonymization (extends Story 3.10) `[CONSUMER]`

As a member who has voluntarily withdrawn,
I want my personally-identifying data soft-deleted and replaced with "an anonymous member" markers in all references, while my contribution history is retained anonymized for pool-engine audit-reproducibility,
So that my DPDPA Right To Be Forgotten is honored while the trust's audit history remains intact.

**Acceptance Criteria:**

**Given** FR-96 + Story 3.10 `withdrawal.completed` + AR-12 + the §1.14 event-log immutability commitment
**When** the RTBF anonymization extends Story 3.10's withdrawal flow
**Then** anonymization applies to: (a) member identity fields (name, mobile, email, Aadhaar, eHRMS, address) — replaced with placeholder values or null in the persisted state table; (b) nominee records — names anonymized; (c) public-facing references (Sahyog Drive contributor lists, future Sahyog Vivran appearances) — display "an anonymous member"
**And** the event stream is **NOT modified** (events are immutable per architectural-freeze row 2); instead, an `rtbf.anonymized` event is **appended** to the stream marking the anonymization point with `anonymized_at` + `anonymization_actor`; downstream state replays after this event read the anonymized projection
**And** the audit log is NOT modified (immutability per Story 1.10); the audit trail remains queryable for regulatory / dispute reasons, but member-identity fields in audit lines after `rtbf.anonymized` are masked at query time
**And** contribution history (which pools, which amounts, which UTRs) is retained anonymized — the contributor identity is "anonymous" but the contribution is still part of the pool-engine reconciliation history

**Given** a public-facing surface (Sahyog Drive, Sahyog Vivran, Member Directory) renders contributor or member identity
**When** the surface encounters an anonymized member
**Then** "an anonymous member" is rendered in place of the name; no PII leaks; PII scrape CI (Story 1.16b) continues to pass

**Given** a future rejoin attempt under the same Aadhaar + eHRMS within 12 months of withdrawal
**When** Story 3.6 signup evaluates the identity
**Then** the rejoin block fires (per Story 3.10 AC) — anonymization does NOT bypass the 12-month rejoin lock

---

## Epic 4: Niyamavali Rules Engine & Member Validity Service

The canonical "is this member valid right now?" answer. The R7 contribution-discipline ladder, R8 90% rule, R5/R9 special-death cases, R11 concealment penalty, and retirement-coverage extension all evaluate from the Epic 2 registry — no hardcoded logic. FR-12A returns a deterministic, idempotent, audit-logged payload with rule-by-rule provenance and `applicable_niyamavali_clauses[]` (via stable `clause_id`). Cache reflects amendments + member-state changes within 60 seconds (Sprint Change Proposal Item 5).

**User Outcome:** Every admin surface and the member's own profile can ask the Validity Service "is this member valid for support if death today?" and get the canonical payload — p95 < 200ms at 4L scale. The R7/R8/R5/R9/R11 rules evaluate from the registry. Lock-in policy is trustee-adjustable; existing members carry `lock_in_days_at_join` snapshots (not retroactively re-locked).

**FRs:** FR-8 (lock-in policy + snapshot — engine-side via "snapshot resolution" pattern in Story 4.1), FR-9 (R7(A-G) contribution discipline), FR-10 (R8 90% rule + R8(A), R8(B)), FR-11 (R5/R9 special death + R14 concealment-flagged review — never auto-deny), FR-12 (retirement coverage extension), FR-12A (Member Validity Service — canonical payload + p95 < 200ms + freshness invariant ≤ 60s + per-cohort invalidation with conservative-recompute fallback).

**Anchoring ARs:** AR-7 (per-tenant JSONB custom fields for rule payload), AR-57 (determinism & replay — wired into Story 4.6 order-invariant), AR-65 (compound read models for operator surfaces — Story 4.7 admin variant), Sprint Change Proposal Item 5 (cache freshness invariant — Story 4.8).

**UX-DR anchors:** UX-DR24 (`<MemberStatusPanel>` — canonical render here, both admin variant and member-facing variant).

**Demoable closure:** Member-search by any admin (scope-respecting) returns Validity Service payload in ~5 seconds with FR-12A signals (lock-in, vyawastha_shulk, contribution_history, R7/R8 sub-clause state, medical_disclosure flags, retirement coverage). Replay test: same `(member_id, rule_registry_version)` produces identical output across two evaluations. **R14 concealment-flagged evaluation (SM-1 demo beat C7):** Validity Service evaluates a member with undeclared IMA-listed illness; returns canonical payload with `special_flags: [concealment_review_required]` and routes to State Trustee review queue — service produces a *flag*, never an auto-deny verdict.

**Dependencies:** Epic 1 (substrate + idempotency + audit + event log) · Epic 2 (Niyamavali registry shape + stable `clause_id`) · Epic 3 (member lifecycle state + `vyawastha_shulk_status` payload).

**Story label legend:** `[PRIMITIVE]` substrate building block · `[SURFACE]` UI or API surface a user touches · `[GOVERNANCE]` CI gate, policy, audit · `[CONSUMER]` wires primitives into running surfaces.

### Story 4.1: Rule Evaluation Engine Primitive (Niyamavali Clause Interpreter + Provenance) `[PRIMITIVE]`

As Solo Builder authoring the rule evaluation engine that downstream rules (R7, R8, R5/R9, R12) all consume,
I want a rule evaluation engine that interprets Niyamavali clauses (resolved by `clause_id` + effective-date OR exact `clause_version_id` per Story 2.3) and returns evaluation results with full per-clause provenance,
So that downstream rule evaluations are deterministic, replay-reproducible, and auditable to the exact rule version used.

**Acceptance Criteria:**

**Given** Story 2.3's Niyamavali registry shape + AR-7 (per-tenant JSONB custom fields) + AR-57 (determinism & replay) + architectural-freeze row 14 (Niyamavali shape-vs-engine seam)
**When** the rule evaluation engine is authored in `packages/niyamavali-engine`
**Then** the engine exposes `evaluate(rule_clause_id, context)` and `evaluateAt(rule_clause_id, context, evaluation_timestamp)` — the latter uses `getMemberStateAt(member_id, timestamp)` from Story 3.1 plus the Niyamavali version effective at that timestamp, for replay-correct historical evaluation
**And** the engine returns an `EvaluationResult` shape: `{ result, provenance: { clause_id, clause_version_id, payload_hash, evaluated_at, inputs_summary }, sub_clause_results[], reason_code }`
**And** the engine has **NO hardcoded rule logic** — every rule branch is interpreted from the Niyamavali clause `payload` JSONB; adding a new rule means adding a new clause to the registry, never changing engine code

**Given** the "snapshot resolution" pattern (FR-8 folded here per confirmation)
**When** evaluating a rule for an existing member whose `lock_in_days_at_join` was snapshotted at signup (Story 3.6)
**Then** the engine resolves the lock-in policy from the member's **snapshot**, NOT from the current Niyamavali clause version
**And** new graduations to a different lock-in policy do not retroactively re-lock existing members
**And** the same "snapshot resolution" pattern applies to any future versioned-policy rules — engine reads `lock_in_days_at_join` (or analogous snapshot fields) and resolves accordingly

**Given** Story 1.12 idempotency keyed store + AR-58
**When** the engine evaluates `(member_id, rule_clause_id, evaluation_timestamp)`
**Then** the result is cached by an idempotency key composed of those three plus member's state-at-timestamp hash and Niyamavali version hash; identical re-evaluations return cached results
**And** every evaluation is audit-logged via Story 1.10 with the full provenance

### Story 4.2: R7 Contribution Discipline Rules (R7(A-G) Restoration Ladder) `[CONSUMER]`

As the rule evaluation engine processing a member's contribution discipline evaluation,
I want R7(A) through R7(G) restoration rules implemented as Niyamavali clause payloads consumed by the engine primitive (Story 4.1),
So that contribution discipline evaluation is registry-driven and survives Niyamavali amendments.

**Acceptance Criteria:**

**Given** FR-9 + Story 4.1 engine + Story 2.3 Niyamavali registry
**When** R7(A) through R7(G) clauses are authored in the registry
**Then** clauses are allocated with stable IDs: `niy.contribution-discipline.r7-a`, `niy.contribution-discipline.r7-b`, ... through `niy.contribution-discipline.r7-g`; each clause's `payload` carries the restoration logic in structured JSONB (skip threshold, restoration count, time window, restoration cost)
**And** the engine evaluates each R7 sub-clause via Story 4.1's primitive against the member's contribution event history; evaluation result includes per-sub-clause provenance — which R7(x) applied, which `clause_version_id` was used, what the member's history was at evaluation time

**Given** property-based determinism test (AR-57)
**When** the same `(member_id, contribution_history, niyamavali_versions)` is evaluated twice
**Then** results are identical — same `reason_code`, same provenance, same `sub_clause_results` ordering (per Story 4.6 order invariant)

### Story 4.3: R8 90% Rule (with R8(A) Skip-Allowance, R8(B) Mid-Contribution Death) `[CONSUMER]`

As the rule evaluation engine processing a 90% rule evaluation,
I want R8 (illness-death-eligibility gate) plus R8(A) (1-skip-per-year allowance if prior 100%) and R8(B) (mid-contribution death) implemented as registry-driven clauses,
So that the 90% rule and its sub-clauses evaluate deterministically without hardcoded engine logic.

**Acceptance Criteria:**

**Given** FR-10 + Story 4.1 engine
**When** R8 clauses are authored in the registry
**Then** clauses are allocated: `niy.ninety-percent-rule.r8`, `niy.ninety-percent-rule.r8-a`, `niy.ninety-percent-rule.r8-b`; each payload carries the threshold and decision logic
**And** the result identifies whether R8 applies (≥10 contributions threshold), the 90% computation, whether R8(A) skip-allowance applies (1 skip/year if prior 100%), whether R8(B) mid-contribution death applies; each sub-clause result carries its own provenance
**And** R8 only applies to illness-death claims, not accidents — verified by the engine via context.death_classification

**Given** cross-rule interaction (R8 vs. R7 vs. accident-vs-illness classification)
**When** the engine evaluates a complete claim eligibility
**Then** all applicable rules are evaluated in deterministic order (per Story 4.6 invariant); provenance trace shows which rules fired in which order

### Story 4.4: R5/R9 Special Death Rules + R14 Concealment-Flagged Evaluation (SM-1 C7) `[CONSUMER]`

As the rule evaluation engine processing a special-death-scenario evaluation,
I want R5(C.2), R5(D), R5(E), R5(F), R9, R9(A), and the March-2025 suicide/murder rule + R14-adapted concealment-denial flag implemented as registry-driven clauses,
So that special-death claim evaluations route to State Trustee review (never auto-deny) and concealment-flagged cases surface as flags rather than verdicts (SM-1 demo beat C7).

**Acceptance Criteria:**

**Given** FR-11 + Story 4.1 engine
**When** the special death + concealment clauses are authored
**Then** clauses are allocated: R5 sub-clauses (`niy.special-death.r5-c-2`, `niy.special-death.r5-d`, `niy.special-death.r5-e`, `niy.special-death.r5-f`), R9 and R9(A) (`niy.special-death.r9`, `niy.special-death.r9-a`), the March-2025 suicide/murder rule (`niy.special-death.r9-suicide-murder-2025-03`), and R14 concealment (`niy.concealment.r14`); each carries its decision logic in structured JSONB

**Given** the SM-1 demo beat C7 commitment (R14 concealment-flagged evaluation)
**When** the engine evaluates a member with undeclared IMA-listed illness whose death is linked to that illness
**Then** the result is **NOT a deny verdict**; instead the result carries `special_flags: [concealment_review_required]`, references `clause_id: niy.concealment.r14`, and the consumer (Epic 6 claim filing) routes the case to State Trustee review queue rather than producing an auto-deny decision
**And** the provenance trace shows which medical-disclosure events were considered (full disclosure history per Story 3.9), which IMA-list versions were active at the time of each disclosure, and which condition was flagged

**Given** an R9 special-case evaluation (suicide, murder, etc.)
**When** the engine runs
**Then** the result routes the case to R9 voting (consumer in Epic 6); the result carries the R9 sub-clause that applies and the voting requirement metadata

### Story 4.5: FR-12 Retirement Coverage Extension Computation `[CONSUMER]`

As the rule evaluation engine processing retirement-coverage eligibility,
I want FR-12's "+1 year per 5 years of valid membership" logic computed on-the-fly from `joined_at` + `retired_at`,
So that retirement-extended members have their post-retirement coverage window correctly calculated.

**Acceptance Criteria:**

**Given** FR-12 + Story 4.1 engine
**When** the retirement coverage rule clause is authored
**Then** clause `niy.retirement-coverage.r12` carries the rule (≥5 years valid membership → +1 year post-retirement; +1 additional year per 5 additional years, so 15 years → +3 years) in structured JSONB
**And** the engine computes the coverage window on-the-fly from the member's `joined_at` (signup event), `retired_at` (Life Events `posting.updated` with retirement flag, or admin trustee-marked retirement event), and the rule's parameters
**And** the evaluation result identifies whether the member is currently within their post-retirement coverage window and how many days remain

**Given** a member who retired but has not yet exhausted the retirement coverage window
**When** Epic 4 Validity Service evaluates them
**Then** they are returned as eligible with `retirement_coverage_extension: { active: true, days_remaining, granted_years }` in the canonical payload

### Story 4.6: FR-12A Member Validity Service — Canonical Payload + p95 < 200ms + Rule Evaluation Order Determinism `[SURFACE]`

As any admin surface or member's own profile,
I want a Member Validity Service that returns the canonical "is this member valid right now?" payload deterministically, idempotently, with rule-by-rule provenance, p95 < 200ms at 4L scale,
So that every eligibility decision in the system reads from a single canonical source with replay-reproducible output.

**Acceptance Criteria:**

**Given** FR-12A + Sprint Change Proposal Item 5 + AR-65 + architectural-freeze row 11
**When** the Member Validity Service is implemented
**Then** the service exposes `getValidity(member_id)` and `getValidityAt(member_id, timestamp)` — both returning the canonical payload: `{ member_id, evaluated_at, lock_in_status, vyawastha_shulk_status (from Story 3.8), contribution_history_summary, medical_disclosure_flags, retirement_coverage, special_flags, applicable_niyamavali_clauses[] (ordered, each carrying clause_id + clause_version_id), provenance_trace[] (ordered), validity_payload_hash }`
**And** access is scope-respecting via Story 1.8 RBAC
**And** p95 < 200ms at 4L (400,000) member scale — measured under realistic load in CI / pre-launch validation

**Given** the **rule evaluation order determinism invariant** (this story's load-bearing commitment)
**When** the same `(member_id, rule_registry_version, member_state_hash)` is evaluated twice
**Then** the rule evaluation order is **deterministic and stable across replays** — same rules fire in the same order
**And** `applicable_niyamavali_clauses[]` ordering is stable across replays — never varies based on parallel execution, hash-map iteration order, async scheduling, or non-deterministic concurrency
**And** `provenance_trace[]` ordering is stable across replays — provenance entries appear in the same sequence
**And** `validity_payload_hash` is identical across replays — the canonical hash over the (ordered, deterministic) payload is reproducible
**And** a CI determinism-replay test runs the same evaluation 100 times across multiple threads and asserts byte-identical payload hashes for all 100 runs; **any variance fails CI as a P0 architectural violation**
**And** any future optimization (parallel rule execution, async rule evaluation, hash-map traversal in indeterminate order) **must preserve the determinism invariant** or be rejected at code review

**Given** Epic 6 verifier console + Epic 10 admin surfaces consuming the Validity Service
**When** they call the service in scope-respecting contexts
**Then** the payload is sufficient to render `<MemberStatusPanel>` (Story 4.7) without additional queries; compound read model (Story 4.7 admin variant) precomputes the ~5s admin-search load

### Story 4.7: `<MemberStatusPanel>` — Admin + Member-Facing Variants + Compound Read Model (~5s Admin Load) `[SURFACE]`

As an admin doing member-search OR as a member viewing my own status,
I want a `<MemberStatusPanel>` that renders the Validity Service payload with rule-by-rule provenance and human-readable signals,
So that admins see ~5s load on member-search at 4L scale and members see their own status with the same canonical data.

**Acceptance Criteria:**

**Given** UX-DR24 + AR-65 (compound read models) + Story 4.6 Validity Service
**When** the admin-facing variant is implemented
**Then** admin member-search (by name, mobile, Aadhaar masked, Pariwar ID, etc., scope-respecting) returns the Validity Service payload + a compound read model's denormalized projection (member identity + nominee summary + recent contribution events + recent claim events + state machine status) within p95 ~5s at 4L scale
**And** the panel renders signals in sections: (a) headline status, (b) Vyawastha Shulk status, (c) lock-in (with deep-link to policy `clause_id`), (d) contribution discipline (R7/R8 sub-clause state with provenance), (e) medical disclosure history + concealment flags, (f) retirement coverage if applicable, (g) special flags (`concealment_review_required` highlighted prominently for Epic 6 verifier console)

**Given** the member-facing variant
**When** rendered on the member's own profile
**Then** the same panel renders but: (a) member identity / Aadhaar / KYC details are not re-displayed; (b) provenance traces are simplified to "what rule applies to you" rather than admin-level audit-trace; (c) Hindi-first parity contract enforced per architectural-freeze row 10

**Given** the inherited accessibility gate (Story 0.10 P0-2c)
**When** the panel renders for assistive-tech users
**Then** the panel is semantically labeled, navigable in logical order, with appropriate ARIA roles and landmarks

### Story 4.8: Per-Cohort Cache Invalidation with Conservative-Recompute Fallback (≤ 60s Freshness Invariant) `[GOVERNANCE]`

As the Member Validity Service caching layer,
I want a per-cohort cache invalidation strategy with **explicit conservative-recompute fallback** — if cache freshness cannot be guaranteed within ≤60s, fall back to direct recomputation rather than serve potentially stale validity state,
So that trust-corrupting stale validity (contribution eligibility, claim validity, lock-in status, concealment flags) is structurally impossible under degraded cache conditions.

**Acceptance Criteria:**

**Given** Sprint Change Proposal Item 5 + architectural-freeze row 11 + FR-12A freshness invariant
**When** the caching layer is implemented for the Validity Service
**Then** cache key composition is `(member_id, member_state_hash, rule_registry_version, cohort_invalidation_epoch)`; per-cohort buckets are: (a) `pariwar_id × niyamavali_version` (invalidates when Niyamavali amendments publish), (b) `member_id × member_state_hash` (invalidates when member-state events change), (c) explicit invalidation broadcast (trustee-triggered "invalidate all" for emergency posture changes)
**And** any Niyamavali amendment publish (Story 2.4) triggers the affected cohort's invalidation broadcast within seconds, satisfying the ≤ 60s freshness invariant
**And** any member-state change (Story 3.1 event append) invalidates that member's per-member cohort entry

**Given** the **conservative-recompute fallback behavior** (this story's load-bearing commitment)
**When** the cache layer cannot guarantee freshness within the ≤60s invariant window — examples: (a) cohort invalidation broadcast delivery is delayed; (b) cohort-scope confidence is insufficient (e.g., a member-state change happened but its cohort attribution is ambiguous); (c) cache backend is degraded; (d) clock skew or system-state anomaly detected
**Then** the system **MUST fall back to direct recomputation** rather than serve potentially stale validity state — no cached value is returned; the request triggers a fresh evaluation through Story 4.6's Validity Service
**And** the fallback is logged for observability (every fallback is recorded with reason); a sustained fallback rate above a threshold (e.g., 5% over a 10-min window) fires an alert
**And** the operational stance is explicit and load-bearing: **stale validity is trust-corrupting in this system. We accept higher latency or higher recomputation load over serving cached values whose freshness cannot be guaranteed.**

**Given** an "all-members" emergency invalidation (e.g., a rule registry change with broad scope)
**When** the trustee triggers it
**Then** the cache is fully invalidated for the affected `pariwar_id × niyamavali_version` cohort; subsequent calls hit direct recomputation until the cache repopulates organically; performance degradation during the invalidation window is acceptable because the alternative (serving stale validity) is unacceptable

**Given** the freshness invariant assertion test
**When** integration tests run
**Then** a synthetic Niyamavali amendment + member-state change scenario is asserted: within ≤60s of the change, every Validity Service call must reflect the new state; any call returning stale state within that window fails the test
**And** a synthetic degraded-cache scenario is asserted: when the cache cannot guarantee freshness, every Validity Service call must fall back to direct recomputation; no cached value is returned

---

## Epic 5: Three-Tier Communication Channels

A single canonical `alert` payload renders cleanly across in-app push (primary, FCM + APNs), WhatsApp Business (dual-gated by admin toggle + member self-declared opt-in via user-initiated WA message — per Sprint Change Proposal Item 2 + architectural freeze row 4), Telegram mirror (fire-and-forget, locked v1-S), and SMS (transactional fallback when WA fails + Pariwar-degraded-mode cycle-open bridge). Time-critical templates always send through push + WA; cost-optimization suppresses redundant WA when the member already acted in-app within the staleness window.

**Note on the FR-23 nudge seam (architectural freeze row 15):** Epic 5 owns the *channel primitive* — the structured `alert` payload, the dispatcher, the per-Pariwar WA Business number config, the opt-in webhook, the fallback ladder. Epic 8 (Sushil's Contribution Loop) and Epic 6 (Claim) *consume* the dispatcher to fire their notification triggers (cycle-open, deadline-reminder, contribution-confirmed, contribution-mismatch, claim-status-change). The trigger contracts live in `packages/contracts/`; Epic 5 publishes them; Epic 6 and Epic 8 subscribe.

**User Outcome:** A test alert payload renders correctly across push, WhatsApp, Telegram, and SMS per their gates. Member completes the WA opt-in flow (user-initiated WA message to Pariwar's WA Business number → webhook match → opt-in ACTIVE + 24h Meta window opened) with full audit trail. Step-up OTP fires reliably with audit per send + per consume.

**FRs:** FR-23 (structured `alert` object → multi-channel render), FR-70 (multi-channel render from single alert object), FR-71 (in-app push primary — 7 categories), FR-72 (WhatsApp Business dual-gated `[v1-S]`), FR-73 (Telegram mirror `[v1-S, locked]`).

**Anchoring ARs:** AR-15 (three-tier channel hierarchy — freeze row 4), AR-16 (member WA opt-in flow + inbound webhook matching), AR-17 (per-Pariwar WA Business number + FCM project), AR-18 (in-app-engagement cost optimization with time-critical override), AR-19 (per-member SMS fallback after 3 retries × exp backoff), AR-20 (Pariwar-degraded-mode cycle-open SMS bridge), AR-40 (channel-provider abstraction + central dispatcher), AR-44 (webhook ingress persist + ack), AR-53 (WA Business API external dependency abstraction).

**Demoable closure:** End-to-end test sends a test `alert` payload; all four channels deliver per their gates. WA opt-in flow validates inbound-message matching; member sees opt-in ACTIVE in app settings; opt-in + revocation events independently audit-logged. Step-up OTP for a sensitive action delivers via SMS-DLT with audit log line per send + per consume.

**Dependencies:** Epic 1 (substrate + idempotency + audit + edge protection + RBAC) · Epic 3 (member identity for opt-in routing).

**Story label legend:** `[PRIMITIVE]` substrate building block · `[SURFACE]` UI or API surface a user touches · `[GOVERNANCE]` CI gate, policy, audit · `[CONSUMER]` wires primitives into running surfaces.

### Story 5.1: Structured `alert` Payload Schema + Channel-Provider Abstraction + Central Dispatcher `[PRIMITIVE]`

As Solo Builder authoring the channel primitive that downstream epics (Epic 6 claim notifications, Epic 8 contribution notifications) consume,
I want a structured `alert` payload schema in `packages/contracts/alerts`, a channel-provider abstraction in `packages/channels`, and a central dispatcher that takes an alert and fans out to enabled channels per the three-tier hierarchy,
So that the FR-23 nudge seam (architectural freeze row 15) is enforced by construction — Epic 6 / Epic 8 trigger logic publishes alerts, the dispatcher owns delivery.

**Acceptance Criteria:**

**Given** AR-15 + AR-40 + architectural freeze row 4 (three-tier hierarchy) + row 15 (FR-23 nudge seam)
**When** the alert payload + channel-provider abstraction + dispatcher are authored
**Then** the alert payload Zod schema in `packages/contracts/alerts` carries: `alert_id` (UUID), `pariwar_id`, `member_id`, `alert_category` (enum: `alert_published | deadline_reminder | contribution_confirmed | contribution_mismatch | claim_status_change | helpdesk_reply | module_new | step_up_otp | niyamavali_amended`), `time_critical` (boolean — overrides cost-optimization per AR-18), `provenance_refs` (e.g., `clause_id`, `claim_id`, `pool_id`, `audit_id` — traceability into source events), `payload_data` (typed per category via discriminated union), `created_at`, `created_by_actor`
**And** the channel-provider abstraction exposes a `ChannelProvider` interface with `send(rendered_message, target)` + `getStatus(message_id)`; concrete providers (FCM, APNs, WA Business, SMS-DLT, Telegram) live in `packages/channels/providers/`
**And** the central dispatcher exposes `dispatch(alert)` — fans out to enabled channels per the three-tier hierarchy; the dispatcher is **policy-agnostic** — cost-optimization (Story 5.7) and degraded-mode bridge (Story 5.8) wrap the dispatcher rather than live inside it

**Given** the **alert payload immutability after dispatch invariant** (this story's load-bearing commitment)
**When** an alert payload has been dispatched (or is mid-dispatch)
**Then** the payload becomes **immutable for that dispatch cycle** — no field of the original payload may be modified after `dispatch(alert)` is called
**And** channel-specific renderers may transform presentation format (e.g., format a push title differently from a WA UTILITY template, render an SMS in concise form) — **but must NOT mutate semantic payload meaning, provenance references, or alert classification** (the renderer's input is read-only)
**And** audit replay determinism holds: replaying a dispatch with the same `alert_id` produces byte-identical rendered messages per channel (the renderers are pure functions of the immutable payload); a CI test asserts this for every channel
**And** the immutability is enforced at the type-system level (TypeScript `Readonly<Alert>` enforcement) plus at the runtime layer (a freeze-after-dispatch guard); attempted mutations log audit lines as **P0 architectural violations**

**Given** Story 1.10's audit log
**When** an alert is dispatched
**Then** a single dispatch audit line records the alert payload + the list of channels attempted; each channel's send produces its own audit line with the rendered message hash + send status

### Story 5.2: In-App Push Channel (FCM + APNs) — Primary, 7 Categories `[CONSUMER]`

As any member or admin receiving time-critical notifications,
I want in-app push notifications via FCM (Android) + APNs (iOS) as the primary channel of the three-tier hierarchy, supporting 7 alert categories,
So that members receive immediate, free-to-deliver notifications without depending on WA or SMS for normal-priority traffic.

**Acceptance Criteria:**

**Given** FR-71 + AR-17 (per-Pariwar FCM project) + Story 5.1 dispatcher
**When** the in-app push channel is implemented
**Then** the channel supports the 7 alert categories from Story 5.1's enum; each category has its own renderer that maps the structured alert payload into a push notification with title + body + deep-link target
**And** per-Pariwar FCM project credentials are loaded via Cloud Secret Manager (Story 1.5 + AR-13); APNs uses Apple Push key tied to TWT app bundle ID
**And** member device tokens are registered on app open (Story 3.2 consumer); admin device tokens are registered on admin auth (Story 1.9 consumer)
**And** failures (token revoked, app uninstalled, FCM/APNs unavailable) are recorded; the dispatcher's fallback ladder advances to next channel per AR-19

**Given** the channel-provider abstraction (Story 5.1)
**When** the in-app push provider is invoked
**Then** the rendered message respects the alert payload's immutability invariant; the renderer is a pure function of the alert payload

### Story 5.3: WhatsApp Business API Integration Behind Provider Abstraction + Per-Pariwar Config `[CONSUMER]`

As any member who has opted into WhatsApp delivery (Story 5.4) for a Pariwar that has WA Business enabled,
I want notifications delivered via WhatsApp Business using a UTILITY template registered with Meta, per a per-Pariwar WA Business number configured by the trustee,
So that high-trust, dual-gated notifications reach me on the channel I already use daily.

**Acceptance Criteria:**

**Given** FR-72 + AR-17 + AR-53 (WA Business API external dependency abstraction) + Story 5.1 dispatcher
**When** the WA Business channel is implemented behind the provider abstraction (`packages/channels/providers/whatsapp-business.ts`)
**Then** the provider implements `ChannelProvider`; uses Meta's WA Business Cloud API endpoints; auth credentials per-Pariwar via Cloud Secret Manager
**And** Pariwar trustees configure their WA Business number + Meta-approved UTILITY templates per category via an admin UI surface (this story ships the config table + minimal admin form; full admin polish lives in Epic 10)
**And** the abstraction allows future Meta API changes or alternate WA Business providers to be a single-module change per AR-53

**Given** an alert dispatched to a member who is opted-in (Story 5.4 ACTIVE state) for a Pariwar with WA enabled
**When** the WA channel is selected by the dispatcher
**Then** the rendered UTILITY template message is sent via Meta's API with the alert payload's content; send status (delivered, read, failed, blocked) is captured from Meta webhook callbacks
**And** failure modes (template not approved, Meta API unavailable, member 24h window expired) trigger the dispatcher's fallback to SMS per AR-19

### Story 5.4: Member WA Opt-In via Inbound-Webhook Matching + Webhook Ingress Primitive `[SURFACE]`

As a member who wants to receive TWT notifications via WhatsApp,
I want to send a user-initiated WhatsApp message to my Pariwar's WA Business number, with my opt-in matched via inbound-webhook handler,
So that my consent to receive WA notifications is explicit, member-initiated, audit-logged, and independently revocable.

**Acceptance Criteria:**

**Given** FR-72 + AR-16 (member WA opt-in flow) + AR-44 (webhook ingress persist + ack) + architectural freeze row 4 (member self-declared WA opt-in)
**When** the WA opt-in flow is implemented
**Then** the member is shown a "Receive notifications via WhatsApp" toggle in app settings; tapping shows the Pariwar's WA Business number with a "Send Hello" deep-link that opens WA pre-filled with a verification phrase
**And** the inbound webhook ingress primitive (in `apps/api/modules/channel-webhooks/`) receives Meta's inbound-message webhook; **persists raw payload + acks within Meta's 5s timeout window** per AR-44; matches the inbound message to a pending opt-in by mobile number + verification phrase
**And** on match, the member's WA opt-in state advances to `ACTIVE`; the 24h Meta conversation window opens; member sees confirmation in app

**Given** the **opt-in reversibility + independent audit invariant** (this story's load-bearing commitment)
**When** an opt-in event OR an opt-out event occurs (member-initiated revocation from app, or Meta-side block / "STOP" message, or trustee admin action)
**Then** the event is **independently audit-logged** via Story 1.10 with all five fields: (a) `timestamp`, (b) `originating_channel` (`member_app | meta_webhook_inbound | meta_webhook_block | admin_action`), (c) `matched_member_identity` (linked `member_id` + verification phrase matched), (d) `current_consent_state_snapshot` (full opt-in state before AND after the transition: `PENDING | ACTIVE | REVOKED | BLOCKED_BY_META | EXPIRED_24H_WINDOW`), (e) `audit_id` linkage to the canonical hash chain
**And** opt-in records are persisted via Story 2.7's consent registry as `consent_type: whatsapp_opt_in` — the consent registry is the canonical "did this member have valid WA consent at time Y?" query surface
**And** the opt-in is **independently revocable** — member can revoke from app settings without affecting any other consent type (e.g., T&C acceptance, DPDPA consent); revocation immediately disables WA delivery for that member; future re-opt-in is permitted but requires a new user-initiated WA message (no inferred re-consent)

**Given** DPDPA posture + trustee defensibility + future compliance review
**When** any consent dispute or audit query arises
**Then** the full opt-in / revocation history for the member is queryable in chronological order with all five required fields per audit line; no inferred state — every transition has its own auditable event with the consent state snapshot before/after

### Story 5.5: Telegram Mirror Fire-and-Forget (Locked `[v1-S]`) `[CONSUMER]`

As a member who has chosen to mirror notifications to Telegram (admin-enabled per Pariwar; v1 locked behind feature flag),
I want fire-and-forget Telegram delivery in addition to my primary channels,
So that I can read notifications on Telegram if my Pariwar enables it, without Telegram becoming a primary delivery path.

**Acceptance Criteria:**

**Given** FR-73 (`[v1-S, locked]`) + Story 5.1 dispatcher + admin-controlled feature flag (FR-58C)
**When** the Telegram mirror channel is implemented
**Then** the provider implements `ChannelProvider`; Telegram bot per Pariwar; send is **fire-and-forget** — no delivery confirmation waited on; no fallback ladder fires on Telegram failure (it's a mirror, not a primary path)
**And** the channel is locked behind a feature flag per FR-58C; v1 ships disabled by default; admin can enable per-Pariwar
**And** member opt-in is via a Telegram bot `/start` interaction with a verification code from the app

**Given** the dispatcher fans out an alert
**When** Telegram is enabled and the member has the bot started
**Then** the Telegram channel is invoked; failures are logged but do not affect the primary channel ladder

### Story 5.6: SMS Transactional Fallback (DLT-transactional) + 3-Retry × Exp-Backoff `[CONSUMER]`

As any member whose primary channels (in-app push, WA) have failed for an alert,
I want a transactional SMS fallback delivered via DLT-transactional / PE/OE registered sender,
So that critical notifications still reach me even when modern channels are unavailable.

**Acceptance Criteria:**

**Given** AR-19 (per-member transactional SMS fallback after 3 retries × exp backoff) + AR-56 (DLT-transactional registration commitment, Story 0.1 runbook) + Story 5.1 dispatcher
**When** the SMS fallback is implemented
**Then** the SMS provider sends DLT-transactional templates registered with TRAI; templates are versioned and registered per category that supports SMS fallback
**And** the dispatcher's fallback ladder triggers SMS after: (a) in-app push fails 3 attempts with exponential backoff (e.g., 30s, 5m, 30m), OR (b) WA delivery fails per AR-19, OR (c) the member has no opted-in higher-tier channels
**And** SMS failure (carrier reject, invalid number, DLT template not approved) is logged; no further fallback below SMS in v1

**Given** Story 1.14 rate-limit enforcement
**When** SMS is invoked
**Then** per-member SMS rate-limits prevent floods; cost-optimization (Story 5.7) suppresses redundant SMS when member has already acted in-app within the staleness window

### Story 5.7: In-App-Engagement Cost Optimization with Time-Critical Override `[GOVERNANCE]`

As Solo Builder watching the WA/SMS delivery cost,
I want a cost-optimization policy layer wrapping the dispatcher that suppresses redundant WA / SMS delivery when the member has already engaged in-app within a recent staleness window — with explicit time-critical override that bypasses suppression,
So that delivery cost is minimized for routine notifications without sacrificing reach for time-critical alerts.

**Acceptance Criteria:**

**Given** AR-18 + Story 5.1 policy-agnostic dispatcher
**When** the cost-optimization policy is implemented as a wrapper around `dispatch(alert)`
**Then** the policy reads the member's recent in-app engagement (last app-open timestamp from session activity); if engagement is within the staleness window (e.g., 30 min) for the alert category, the policy suppresses WA and SMS delivery while still firing in-app push
**And** the staleness window is configurable per alert category (e.g., shorter for `deadline_reminder`, longer for `contribution_confirmed`)
**And** the **time-critical override** is honored: when `alert.time_critical = true` (set by the trigger logic in Epic 6 / Epic 8), the policy bypasses suppression and dispatches to all configured channels regardless of in-app engagement

**Given** an audit / cost-attribution query
**When** suppression decisions are reviewed
**Then** every suppression event is logged with the reason (member's last engagement timestamp + staleness window) so cost-attribution + behavioral analysis can examine whether the suppression policy is well-calibrated

### Story 5.8: Pariwar-Degraded-Mode Cycle-Open SMS Bridge `[GOVERNANCE]`

As a Pariwar undergoing a degraded-mode event (in-app push infrastructure down, WA Business API unavailable system-wide, or trustee-declared "treat all cycle-open as critical"),
I want a cycle-open SMS bridge that bypasses the normal cost-optimization layer and delivers cycle-open alerts to all eligible members via SMS,
So that no member misses a cycle-open alert during infrastructure degradation.

**Acceptance Criteria:**

**Given** AR-20 + Story 5.1 dispatcher + Story 5.7 cost-optimization
**When** the degraded-mode bridge is implemented
**Then** trustees with `pariwar.degraded_mode.declare` permission can declare degraded mode via admin UI; declaration records: `pariwar_id`, `mode` (e.g., `cycle_open_sms_bridge`), `effective_from`, `expires_at` (or manual revocation), `declared_by_actor`, `reason`
**And** while degraded mode is active, the dispatcher's cycle-open alerts (alert_category = `alert_published`) bypass the cost-optimization layer; SMS delivery fires for every eligible member regardless of in-app engagement
**And** degraded-mode events are audit-logged via Story 1.10; the trustee's declaration creates a visible banner in the admin UI

**Given** degraded mode is active
**When** a cycle-open alert fires
**Then** every eligible member receives the SMS regardless of channel-tier rules; cost impact is accepted as the trade-off for reach during degradation

### Story 5.9: Step-Up OTP Channel Delivery + Audit-Per-Send-Per-Consume `[SURFACE]`

As any admin or member at a step-up-OTP-gated action (Story 1.9 admin auth, Story 3.2 member auth),
I want the step-up OTP delivered via SMS-DLT-transactional with audit logging per send AND per consume,
So that the OTP delivery is regulator-compliant, audit-traceable, and the gating logic (which lives in the auth surfaces, not here) can rely on a clean primitive.

**Acceptance Criteria:**

**Given** AR-24 (step-up OTP set) + AR-56 (DLT-transactional) + Story 5.1 dispatcher + Story 5.6 SMS provider
**When** the step-up OTP delivery is implemented
**Then** the OTP send endpoint is a thin wrapper that takes `(actor_id, action_context, otp_ttl)` and dispatches an alert with category `step_up_otp` + `time_critical = true` (bypasses cost-optimization); the OTP is a 6-digit code with TTL ~5 min
**And** each send is audit-logged via Story 1.10 with: `audit_id`, `actor_id`, `action_context` (which action prompted step-up), `otp_hash` (NOT plaintext), `delivery_channel`, `delivery_status`, `sent_at`
**And** each consume (successful OTP verification) is audit-logged separately with: `audit_id`, `actor_id`, `action_context`, `otp_hash` (matches a previous send), `consumed_at`; failed verifications are also logged with `verification_result: failed`

**Given** the explicit scope: **delivery-only, not gating-logic**
**When** the gating decision is made (which actions require step-up — Story 1.9 admin auth + Story 3.2 member auth own this)
**Then** the gating surfaces call this story's delivery endpoint; the gating logic itself does not change with Epic 5 — Epic 5 only owns *how the OTP gets to the user* and *audit semantics for send/consume pairs*

---

## Epic 6: Claim Filing, Peer Verification, Ground Inspection & Internal Appeal

When a member dies, the bereaved family (or helpline-mediated path) files a claim. Both paths converge at a single case object via the dual-path ICP (UX-DR75). Death certificate OCR runs parity check. Peer mesh auto-pings 5 nearest members. Ground inspection is scheduled. A human shepherd (District Admin) is named on the claim and surfaces on the status page. The Trustee-Lite signals panel (FR-42) loads in ~5 seconds via compound read models. State Trustee approves at cycle freeze. Special cases route to R9 voting. Denials get a structured 3-stage internal appeal.

**Anita's verifier console gets explicit story-level visibility** (per Sally) — UX-DR39 is its own story (Story 6.10), with design budget proportional to ₹50L-per-decision stakes. Mandatory surfaces: prior verifier comments (transcripts, not counts); peer-mesh responses with verifying-member annotation; ground-inspection notes + photos; similar-case precedents (latest 3 + outcomes + rationale, scope-respecting); one-tap structured reason-code on every decision; trustee-side audit UI; cross-Pariwar scope handling — active scope unmistakable.

**User Outcome:** A nominee (often Ravi-mode, on the deceased's phone) or helpline-mediated path files a claim — both paths land in the same canonical case object via ICP convergence. Peer mesh + ground inspection both verify (NOT either/or per PRD §4.6). Anita opens the verifier console; signals panel loads in ~5s; she approves with one-tap reason-code + brief rationale. Denied claimants enter a 3-stage internal appeal (District Admin reviewer ≠ original; State Trustee panel vote; Trustee discretion). Reversed denials publish to Sahyog Vivran (Epic 11b). DPDPA consent captured at claim-time for contributor list / verifier names / In Memoriam.

**FRs:** FR-37 (claim filing + claim-time nominee bank #1 + #2), FR-38 (death cert OCR parity check), FR-39 (peer mesh 5 nearest — deterministic), FR-40 (ground inspection alongside peer mesh — both, not either), FR-41 (human shepherd `[v1-M]`), FR-42 (signals panel ~5s, no N+1), FR-43 (R9 special-case routing — registry-driven), FR-43A (internal 3-stage appeal `[v1-M]`).

**Anchoring ARs:** AR-61 (staff-fallback at every node — cross-cutting AC across stories), AR-62 (ICP — dedup + cross-channel + override), AR-65 (compound read models ~5s), Sprint Change Proposal Item 8 (FR-43A full implementation).

**Dependency boundary note:** Epic 6 must not depend on finalized public-memorial rendering from Epic 11. Claim verification, approval, appeal, and trustee decision workflows must remain independently operable before Sahyog Vivran publication surfaces are implemented. Reversed-denial emits a hook (Story 6.16); Epic 11b consumes.

**UX-DR anchors:** UX-DR2 → 6.9 · UX-DR31 + UX-DR32 → 6.2 · UX-DR33 → 6.2, 6.5 · UX-DR34 → 6.8 · **UX-DR39 → 6.10 (₹50L design budget)** · UX-DR40 → 6.11 · UX-DR41 → 6.4 · UX-DR42 → 6.5 · UX-DR43 + UX-DR44 → 6.11 · UX-DR45 + UX-DR46 → 6.3 · UX-DR47 → 6.5 · UX-DR75 → 6.4.

**Demoable closure:** Bereaved family files claim via Ravi-mode (app on deceased's phone) AND in parallel via helpline path; ICP deduplicates them to single canonical `claim_case_id`. OCR parity check runs on death cert. Peer mesh pings 5 nearest; ground inspection scheduled. Anita reviews on verifier console (~5s load); approves with reason-code; State Trustee freezes at cycle. A denial enters Stage 1 appeal with different reviewer; reversal emits hook for Sahyog Vivran publish. **R9 special-case voting walkthrough (SM-1 demo beat C8).** **Concealment-flagged claim path (SM-1 demo beat C7):** claim carrying `concealment_review_required` flag from Story 4.4 routes to State Trustee panel for explicit decision (never auto-denied).

**Dependencies:** Story 0.9 (bereaved-spouse) + Story 0.11 (operator shadowing) closed · Epic 1 (substrate + RBAC + audit + idempotency) · Epic 2 (Niyamavali registry, consent registry) · Epic 3 (member state, event log, nominee declarations) · Epic 4 (Validity Service signals + R14 concealment flag) · Epic 5 (channel dispatcher for claim-status-change).

**Story label legend:** `[PRIMITIVE]` substrate building block · `[SURFACE]` UI or API surface a user touches · `[GOVERNANCE]` CI gate, policy, audit · `[CONSUMER]` wires primitives into running surfaces.

**Cross-cutting AC across stories: AR-61 staff-fallback at every node.** Every claim-flow story (6.2, 6.3, 6.5, 6.6, 6.7, 6.10, 6.11, 6.12, 6.14, 6.16) carries a staff-fallback path per Story 0.7's fallback-handler ledger; the ledger is referenced rather than re-implemented per-story.

### Story 6.1: Claim Case Object Data Model + Claim State Machine `[PRIMITIVE]`

As Solo Builder authoring the claim case primitive that the entire Epic 6 flow consumes,
I want a claim case object data model + state machine that consumes Story 1.3's event log primitive — where claim state is derived from event replay,
So that the §1.14 source-of-truth commitment (architectural freeze row 2) is enforced for the highest-stakes flow in the system.

**Acceptance Criteria:**

**Given** Story 1.3's `packages/events` primitive + architectural-freeze row 2
**When** the claim case object + state machine are authored in `packages/claim-lifecycle`
**Then** the claim case schema carries: `claim_case_id` (UUID, canonical, immutable post-ICP per Story 6.4), `pariwar_id`, `deceased_member_id`, `claimant_actor_id`, `intake_channels` (set: `member_app | helpline | trustee_initiated`), `current_state`, `created_at`, `created_by_actor`
**And** the state machine declares states: `intake_pending`, `intake_converged`, `documents_pending`, `verification_in_progress`, `verifier_review`, `verifier_approved`, `state_trustee_freeze`, `state_trustee_approved`, `approved`, `denied`, `appeal_stage_1`, `appeal_stage_2`, `appeal_stage_3`, `reversed`, `settled`
**And** every transition emits a named event (`claim.intake.initiated`, `claim.intake.converged`, `claim.documents.received`, `claim.peer-mesh.pinged`, `claim.ground-inspection.scheduled`, `claim.verifier.reviewing`, `claim.verifier.approved`, `claim.verifier.denied`, `claim.state-trustee.frozen`, `claim.state-trustee.approved`, `claim.state-trustee.denied`, `claim.appeal.stage1.initiated`, `claim.appeal.stage1.reviewed`, ... etc.)

**Given** the state-mutation invariant (same pattern as Story 3.1)
**When** `claim_case.current_state` is examined
**Then** it is derived from event replay only — never directly UPDATEd; CI test asserts no code outside the event-replay reducer writes to it

**Given** Story 1.10 audit log
**When** any claim state transition occurs
**Then** an audit log line records the transition with full event metadata + `claim_case_id` + before/after state

### Story 6.2: Member App Claim Filing Flow (Ravi-mode: app on deceased's phone) `[SURFACE]`

As Ravi (bereaved family member opening TWT on the deceased member's phone),
I want to file a claim through the Ravi-mode flow with handover-trust OTP, identity confirmation, document upload, and nominee detail editing,
So that I can initiate the support process from the deceased's existing device without needing a new account.

**Acceptance Criteria:**

**Given** FR-37 + UX-DR31 `<ClaimProxyFlowShell>` + UX-DR32 `<HandoverTrustOTP>` + UX-DR33 `<ClaimDocumentUpload>` + UX-DR55 Pattern 4 dignified-validation (validated against Story 0.9)
**When** Ravi opens the app on the deceased's phone
**Then** the app detects the deceased's authenticated session and offers Ravi the proxy-flow shell with empathy copy: "Are you family of [member name]? We can guide you through filing a claim. We need to verify it's you."
**And** handover-trust OTP fires to nominees' declared mobiles (from Story 3.4); Ravi enters the OTP from his own phone to establish handover-trust
**And** Ravi confirms his relationship to the deceased; the flow emits `claim.intake.initiated` (Story 6.1) with `intake_channels: [member_app]`, `claimant_actor_id: ravi`
**And** Ravi uploads death certificate via `<ClaimDocumentUpload>` (Story 6.5 consumer); the OCR parity check runs as a background job
**And** Ravi edits nominee details if needed via `<NomineeDetailEditor>` (Story 6.8 consumer); pattern 4 dignified-validation copy applied throughout

**Given** AR-61 staff-fallback (cross-cutting)
**When** Ravi gets stuck at any step
**Then** a "Call us — we'll help" CTA is always one tap away; helpline operator picks up; helpline-mediated path (Story 6.3) can complete on Ravi's behalf; the two intakes converge at ICP (Story 6.4)

### Story 6.3: Helpline-Mediated Claim Filing Flow + Member Lookup + Read-Back `[SURFACE]`

As a helpline operator receiving a call from a bereaved family member who can't or won't use the app,
I want to file a claim on the member's behalf via admin UI with member lookup, read-back confirmation, and operator attribution,
So that families without smartphones can still access support.

**Acceptance Criteria:**

**Given** FR-37 + UX-DR45 `<MemberLookupForm>` + UX-DR46 `<ReadBackCard>` + Story 0.11 operator shadowing findings
**When** the helpline operator initiates a claim
**Then** the operator looks up the deceased member via `<MemberLookupForm>` (search by name, mobile, Aadhaar masked, Pariwar ID — scope-respecting via Story 1.8)
**And** the operator reads back identity confirmations via `<ReadBackCard>` — caller confirms verbally
**And** emits `claim.intake.initiated` with `intake_channels: [helpline]`, `claimant_actor_id: operator_acting_for_<caller_id>`, `operator_attribution: <operator_id>`
**And** the operator can route the case for verification or convert to a member-app handover (deep link for family to complete via Story 6.2)

**Given** AR-61 staff-fallback
**When** the operator encounters a non-standard scenario
**Then** they escalate to a supervisor; case held with `intake_pending`; supervisor resolution emits next event

### Story 6.4: Intake Convergence Point (ICP) — Dedup Key + Cross-Channel Visibility + Override Semantics `[PRIMITIVE]`

As Solo Builder authoring the convergence primitive,
I want an Intake Convergence Point that deduplicates intakes arriving from member-app + helpline paths and **establishes a single canonical `claim_case_id`** that all downstream flows reference,
So that audit / replay / publication / notification are unambiguous and no hidden secondary IDs persist after convergence.

**Acceptance Criteria:**

**Given** AR-62 (ICP — dedup + cross-channel + override) + UX-DR75 + UX-DR41 `<IntakeDecisionStrip>`
**When** the ICP primitive is authored
**Then** the ICP exposes `tryConverge(intake_attempt)` with a dedup key composed of `(pariwar_id, deceased_member_id, narrow time window e.g., ±30 days)`; duplicate intakes within the window are flagged for convergence
**And** the `<IntakeDecisionStrip>` admin UI surface shows pending intakes with potential matches; trustee or operator can confirm convergence (merge) or override (treat as separate cases)
**And** cross-channel visibility: when both paths exist within the dedup window, the ICP shell shows both to the resolving actor; both are linked under the canonical `claim_case_id`
**And** override semantics: explicit "do not converge" decisions are recorded with reason + actor + audit log line; future intakes do not re-attempt convergence with cases that were explicitly overridden apart

**Given** the **canonical case identity invariant** (this story's load-bearing commitment)
**When** intakes have converged through the ICP
**Then** all paths resolve to a **single canonical `claim_case_id`** — there is exactly one claim case object for the converged claim
**And** every downstream flow MUST reference the canonical `claim_case_id`, NOT channel-originating intake identifiers: verification (Stories 6.6/6.7/6.10/6.11), appeal (Story 6.16), audit (Story 1.10 entries reference `claim_case_id`), notification (Story 5.1 alerts carry `claim_case_id` in `provenance_refs`), publication (Epic 11b Sahyog Vivran references `claim_case_id`)
**And** channel-originating intake identifiers (e.g., temporary `intake_attempt_id` from member-app or helpline systems) are **discarded post-convergence** — no hidden secondary IDs persist; intake-attempt records are retained for audit but explicitly marked `superseded_by_claim_case_id: <canonical>` and never referenced by downstream flows
**And** a CI test asserts no downstream code path (verification, appeal, publication, notification) accepts a non-canonical intake identifier as a lookup key; all such code paths take `claim_case_id` only

**Given** an audit / regulator / dispute query
**When** the history of any converged claim is traced
**Then** the lineage is unambiguous: both intake attempts (with their channel-originating context) are recorded as pre-convergence events; the convergence transition is its own audit line; everything after references only the canonical `claim_case_id`

### Story 6.5: Death Certificate OCR Parity Check + Document Path Chooser `[CONSUMER]`

As any claim-filing flow (Story 6.2 Ravi-mode or Story 6.3 helpline),
I want death certificate OCR to extract identity fields and run a parity check against the deceased member's records,
So that mismatches are flagged for human review before verification proceeds and forgery / wrong-person submissions are caught early.

**Acceptance Criteria:**

**Given** FR-38 + UX-DR33 `<ClaimDocumentUpload>` + UX-DR42 `<DocumentPreview>` + UX-DR47 `<DocPathChooser>`
**When** a death certificate is uploaded
**Then** OCR extracts: deceased name, DoB, date of death, issuing authority, certificate number; values are normalized
**And** parity check compares OCR-extracted values against the deceased member's TWT record (Story 3.1 state); discrepancies (name mismatch beyond fuzzy tolerance, DoB mismatch, certificate date implausible) are flagged
**And** `<DocPathChooser>` lets the operator choose which document type is being uploaded (death cert vs. ground-inspection photo vs. hospital record); the OCR engine selects the appropriate parser
**And** OCR results + parity check outcome are persisted; `claim.documents.received` event emitted

**Given** an OCR mismatch
**When** detected
**Then** the case enters `documents_pending` state with a flag for verifier review; UI shows the original document via `<DocumentPreview>` alongside the OCR-extracted values + the deceased member's record for side-by-side comparison; verifier (Story 6.10) makes the final judgment

**Given** AR-61 staff-fallback
**When** OCR fails to parse or the parity check is ambiguous
**Then** the case routes to manual document review; OCR failure is logged but doesn't block the claim flow

### Story 6.6: Peer Mesh Deterministic 5-Nearest Selection + Ping `[CONSUMER]`

As the verification engine processing a claim,
I want a peer mesh that deterministically selects the 5 nearest members and pings them for verification,
So that peer-mesh selection is reproducible, audit-replayable, and non-manipulable.

**Acceptance Criteria:**

**Given** FR-39
**When** the peer mesh selection runs for a claim
**Then** the selection algorithm is deterministic: given `(deceased_member_id, claim_case_id, pariwar_members_at_claim_time_snapshot)`, the output 5 member IDs are reproducible by replay
**And** "nearest" is defined by a documented metric (same district + cohort + geographic distance or contribution-time-correlation); the metric is registry-driven, not hardcoded
**And** the 5 selected members are pinged via Story 5.1 dispatcher with category `peer_mesh_verification_request`; the message asks them to confirm "do you know this person and do you believe they have died?"
**And** responses are recorded as `claim.peer-mesh.responded` events; non-responses within a configurable window default to "no response" rather than "no"

**Given** a replay test
**When** the same selection inputs are provided
**Then** the same 5 member IDs are selected; results are byte-identical across replays

**Given** AR-61 staff-fallback
**When** fewer than 3 peer responses arrive within the window
**Then** the case falls back to ground-inspection-primary verification; operator is alerted to extend the window or skip peer-mesh with documented reason

### Story 6.7: Ground Inspection Scheduling + Notes + Photos `[SURFACE]`

As a District Admin or designated field worker conducting ground inspection,
I want a ground inspection workflow to schedule, record notes, and upload photos,
So that physical verification is captured alongside peer mesh (both, not either, per FR-40).

**Acceptance Criteria:**

**Given** FR-40 (peer mesh + ground inspection are both, not either)
**When** the ground inspection workflow is implemented
**Then** an admin with `claim.ground_inspection.conduct` permission can schedule an inspection: date, time, location, inspector identity, contact for family
**And** the inspector records notes (structured fields + free-text) + uploads photos (consume Story 6.5's `<ClaimDocumentUpload>` for the photo path)
**And** inspection records emit `claim.ground-inspection.scheduled` and `claim.ground-inspection.completed` events

**Given** the architectural commitment that peer-mesh + ground-inspection are **both**, not either
**When** verifier console (Story 6.10) evaluates the case
**Then** both signals are presented; absence of either is itself a signal; the verifier may still approve with only one signal but the absence is visible and documented

### Story 6.8: Claim-Time Nominee Bank Detail Collection (Dual Account) `[SURFACE]`

As a claim filer (Ravi-mode or helpline),
I want to provide both nominees' bank account details upfront — primary (#1) and secondary (#2) for the RBI UPI limit workaround,
So that disbursement is not blocked if the primary account has an issue.

**Acceptance Criteria:**

**Given** FR-37 (dual-account claim-time nominee bank collection) + UX-DR34 `<NomineeDetailEditor>`
**When** the nominee bank detail collection runs at claim-time
**Then** both nominees' bank details are collected: `account_holder_name`, `account_number`, `ifsc`, `bank_name` per nominee; tagged primary (#1) and secondary (#2)
**And** the editor validates IFSC format and bank-name autocomplete; pre-validation hits a bank-IFSC lookup (cached) before submission
**And** PII encryption (Story 1.5) applies to bank account fields per AR-12 tier model

**Given** the dual-account workaround (RBI UPI limit per-payee per-day)
**When** disbursement runs (consumer in Epic 9 reconciliation)
**Then** the first portion of the disbursement attempts via account #1; if it hits the limit or fails, account #2 is used for the remainder; both are recorded as separate transactions

### Story 6.9: Claim-Time DPDPA Consent (Consumer of Story 2.7) `[CONSUMER]`

As a claim filer,
I want explicit DPDPA consent at claim-time covering: (a) the trust's processing of deceased + claimant + nominee PII, (b) sharing of contributor list and verifier names on Sahyog Vivran (Epic 11b), (c) In Memoriam appearance,
So that public-transparency surfaces (Epic 11b) can publish lawfully and consent is recorded with full provenance.

**Acceptance Criteria:**

**Given** UX-DR2 + Story 2.7 consent registry
**When** the claim-time DPDPA consent flow is implemented
**Then** the flow presents three granular consent checkboxes: (a) `claim_time_dpdpa`, (b) `sahyog_vivran_publication`, (c) `in_memoriam_listing`
**And** each consent is independently recorded via Story 2.7 `recordConsent` with the locale + checkbox text + timestamp
**And** revocation of any of these (Story 2.7 `revokeConsent`) is honored — e.g., if a family later revokes Sahyog Vivran publication, the page is taken down (Epic 11b consumer)

### Story 6.10: Verifier Console Signals Panel ~5s Load + Cross-Pariwar Scope Handling (UX-DR39 — ₹50L Design Budget) `[SURFACE]`

As Anita (a verifier at the District Admin level) reviewing a claim case,
I want a signals panel that loads in ~5 seconds and surfaces every relevant signal — peer mesh responses, ground inspection notes/photos, OCR parity, Validity Service payload, concealment flags, prior case precedents — all on one screen with cross-Pariwar scope unmistakable,
So that I can make an informed decision in minutes rather than spending hours digging through linked records.

**Acceptance Criteria:**

**Given** FR-42 + AR-65 + UX-DR39 (`<VerificationConsoleShell>` ₹50L design budget) + Story 4.6 Validity Service + Story 0.11 operator shadowing findings
**When** the verifier console signals panel is implemented
**Then** the panel loads within p95 5s for a typical case at 4L-member-scale Pariwar; data is fetched from a compound read model that denormalizes claim + member + peer-mesh + ground-inspection + Validity Service + audit-history into one query
**And** the panel displays signals in clearly-labeled sections: (a) deceased member identity + Validity Service payload + concealment flags from Story 4.4, (b) OCR parity from Story 6.5 with `<DocumentPreview>`, (c) peer mesh responses with verifier annotations (transcripts, not just counts) per Story 6.6, (d) ground inspection notes + photos per Story 6.7, (e) prior verifier comments (full transcript history, not summaries), (f) similar-case precedents (latest 3 + outcomes + rationale, scope-respecting)
**And** **cross-Pariwar scope handling**: when Anita has access to multiple Pariwars, the active scope is displayed prominently in console chrome; switching scope is an explicit action with audit log line; signals from other Pariwars never leak into the active-scope view

**Given** the **signals are advisory, not auto-adjudicating invariant** (this story's load-bearing commitment)
**When** the verifier reviews the panel
**Then** the panel surfaces signals as **decision-support artifacts** for human judgment, never as automated decisions
**And** **final adjudication authority remains human and audit-attributable** — the verifier (or State Trustee at cycle freeze) makes the call; the panel never auto-approves or auto-denies based on any signal combination
**And** concealment flags (`special_flags: [concealment_review_required]` from Story 4.4), Validity Service payloads, peer signals, OCR mismatches, and combinations thereof are **assistive** — they highlight, recommend, and prioritize, but never decide
**And** every adjudication produces a decision strip entry (Story 6.11) with the human verifier's identity, reasoning, and reason-code — no decision lacks human attribution
**And** a CI test asserts that no API endpoint in the claim adjudication flow can be invoked with a "system-decided" actor identity; every approve/deny endpoint requires an authenticated human actor with the appropriate permission

**Given** AR-61 staff-fallback at every node
**When** the verifier encounters a case beyond their authority or expertise
**Then** they can escalate to a higher-scope verifier (District → State); the case state advances; escalation is audit-logged

### Story 6.11: Verification Decision Strip + Reason-Code Dropdown + Audit Trail Entry `[SURFACE]`

As Anita making a verification decision (approve / deny / escalate),
I want a Verification Decision Strip with one-tap reason-code dropdown + brief rationale text + audit trail entry,
So that every decision is fast, structured, attributable, and traceable for trustee review and future precedents.

**Acceptance Criteria:**

**Given** UX-DR40 `<VerificationDecisionStrip>` + UX-DR43 `<ReasonCodeDropdown>` + UX-DR44 `<AuditTrailEntry>` + Story 1.10 audit log
**When** the verifier makes a decision
**Then** the decision strip surfaces: (a) `<ReasonCodeDropdown>` with structured reason codes (e.g., `r5-d-natural-death`, `r8-90pct-met`, `concealment-flag-uphold`, `concealment-flag-override`, `r9-routed-to-voting`); (b) brief rationale free-text (max 500 chars); (c) "Approve" / "Deny" / "Escalate to State Trustee" buttons; (d) any required attestations
**And** the decision emits the corresponding event (Story 6.1: `claim.verifier.approved`, `claim.verifier.denied`, or `claim.verifier.escalated`) with the full decision payload + verifier identity
**And** a `<AuditTrailEntry>` immediately appears in the case's audit history; trustee-side audit UI ("show me all decisions Anita made last month with reason-code X") queries the audit log filtered by `actor_id + reason_code + time_range`

**Given** the verifier wants to revise an earlier decision (within an allowed window)
**When** revision is attempted
**Then** the revision creates a new decision event (immutability — Story 6.1 events are append-only); the old decision is `superseded`; the audit trail shows both with explicit linkage; revision requires step-up OTP (Story 5.9)

### Story 6.12: Human Shepherd Assignment + Member-Facing Visibility (FR-41 `[v1-M]`) `[SURFACE]`

As a bereaved family,
I want a named human shepherd (District Admin) assigned to my claim with their name + contact visible on the claim status page,
So that I have a human point of contact through the verification process, not just an opaque system.

**Acceptance Criteria:**

**Given** FR-41
**When** a claim enters `verification_in_progress` state
**Then** the assignment service routes the claim to a District Admin in scope (or another designated shepherd role); criteria: scope-respecting RBAC, current workload balancing, claim category
**And** the shepherd's name + role + contact are surfaced on the claim status page visible to the claimant; member receives a push notification via Story 5.1
**And** the shepherd has visibility into the case via verifier console (Story 6.10) but doesn't replace the verifier role

**Given** AR-61 staff-fallback
**When** the assigned shepherd is unavailable
**Then** the fallback shepherd from Story 0.7 ledger is paged; claim status page updates with new shepherd

### Story 6.13: State Trustee Cycle-Freeze Approval (Bulk-Approval Surface) `[SURFACE]`

As a State Trustee performing the cycle-freeze bulk approval action,
I want a bulk-approval UI that lists all verifier-approved + verifier-flagged cases for the upcoming cycle with full provenance,
So that I can freeze the cycle (triggering Epic 7 pool spawn) with a single trustee-attestable action.

**Acceptance Criteria:**

**Given** the cycle-freeze workflow (consumed by Epic 7 Pool Engine)
**When** the State Trustee opens the bulk-approval surface
**Then** the surface lists all `verifier_approved` and `verifier_flagged_for_state_trustee` cases pending this cycle; per-case: deceased member, verifier identity, reason-code, signals summary, concealment flags if any
**And** the trustee can approve individual cases (advance to `state_trustee_approved`), deny (advance to `denied` and trigger appeal eligibility per Story 6.16), or route to R9 voting (Story 6.14)
**And** the bulk-approval action requires step-up OTP per Story 5.9; emits `claim.state-trustee.frozen` event; triggers Epic 7 Pool Engine via `packages/contracts/pool-spawn-trigger`

### Story 6.14: R9 Special-Case Voting Walkthrough (SM-1 C8) `[SURFACE]`

As a State Trustee panel voting on an R9 special-case claim (suicide, murder, etc.),
I want a registry-driven voting UI that surfaces the R9 sub-clause that applies, the rule-version snapshot, and per-vote provenance,
So that R9 voting decisions are auditable to the exact rule + each trustee's vote.

**Acceptance Criteria:**

**Given** FR-43 + Story 4.4 R5/R9 rule clauses + SM-1 demo beat C8
**When** a case is routed to R9 voting (because Story 4.4's evaluation surfaced `r9-routed-to-voting` reason code)
**Then** the voting UI loads showing the case + the R9 sub-clause that applies (`niy.special-death.r9-suicide-murder-2025-03` or similar) with `clause_version_id` at routing time
**And** State Trustees with `claim.r9_vote` permission cast votes; each vote records: actor identity, vote (approve/deny), rationale text, timestamp; rule-version snapshot persists with the vote
**And** the panel's outcome (per the rule's voting requirements — majority, supermajority, unanimous) is computed and persisted as `claim.r9.outcome` event
**And** the audit trail shows each individual vote separately; trustee review surface can query "show me all R9 votes Trustee X cast in the last 6 months"

### Story 6.15: Concealment-Flagged Claim Path (SM-1 C7) — Consumer of Story 4.4 `[CONSUMER]`

As the claim flow processing a case with a concealment flag from Story 4.4,
I want the case to route to State Trustee review with the flag surfaced prominently rather than auto-deny,
So that the R14 concealment-penalty discipline (flag, never auto-deny) is preserved end-to-end through the claim flow.

**Acceptance Criteria:**

**Given** Story 4.4's `concealment_review_required` flag + SM-1 demo beat C7 + FR-11
**When** a claim case arrives where Validity Service evaluation surfaces `special_flags: [concealment_review_required]`
**Then** the case does NOT auto-deny; it routes to State Trustee review queue with the flag highlighted on the verifier console (Story 6.10 surfaces it prominently above the standard signals panel)
**And** the State Trustee panel decides explicitly — uphold (deny with reason-code `concealment-flag-upheld`) OR override (approve with reason-code `concealment-flag-override` and rationale)
**And** the panel decision records with: reason-code, rule-version snapshot of `niy.concealment.r14`, full panel attestation, audit log line
**And** the consumer pattern is: Story 4.4 emits the flag; Story 6.15 consumes by routing; Story 6.13 + 6.14 are the deciding surfaces

### Story 6.16: 3-Stage Claim-Denial Appeal Flow + Reversed-Denial → Sahyog Vivran Publish Hook (FR-43A) `[SURFACE]`

As a claimant whose claim was denied,
I want a structured 3-stage internal appeal process — Stage 1 (District Admin reviewer ≠ original) → Stage 2 (State Trustee panel vote) → Stage 3 (Trustee discretion) — with reversed denials emitting a publish hook for Sahyog Vivran,
So that procedural fairness is enforced and reversed claims are publicly transparent.

**Acceptance Criteria:**

**Given** FR-43A + Sprint Change Proposal Item 8 + Story 0.13 legal counsel review of procedural fairness
**When** the appeal flow is implemented
**Then** a denied claimant can initiate appeal within a configurable window (e.g., 60 days); the appeal advances to `appeal_stage_1`
**And** **Stage 1**: a District Admin reviewer who is **NOT the original verifier or original State Trustee decider** reviews the case; the system enforces this by `appeal.stage1.reviewer_id != claim.original_verifier_id AND != claim.original_state_trustee_decider_ids` at the API layer; Stage 1 outcome is approve-reverses-denial OR deny-advances-to-stage2
**And** **Stage 2**: a State Trustee panel votes (same panel-attestation pattern as Story 6.14); outcome is approve-reverses-denial OR deny-advances-to-stage3
**And** **Stage 3**: Trustee discretion — final, binding within the internal appeal system; outcome is approve-reverses-denial OR deny-final

**Given** any stage reverses the denial
**When** the reversal is recorded
**Then** state advances to `reversed`; a Sahyog Vivran publish hook fires — emits `claim.reversed` event with the canonical `claim_case_id` (per Story 6.4 invariant) for Epic 11b to consume; the publish surface in Epic 11b includes the reversal narrative
**And** the appeal flow is audit-logged at every stage with reviewer identity, decision, rationale; trustee-side audit UI can query "show me all appeal stage 1 decisions where reviewer = X"

**Given** Story 0.13 legal counsel review
**When** the appeal procedural-fairness specification is reviewed (pending-review pattern from Story 0.4)
**Then** any counsel-flagged procedural-fairness issues are addressed before the appeal flow goes live; legal review status is tracked separately

---

## Epic 7: Pool Engine & Cycle Spawn

At trustee bulk-approval (cycle freeze), the engine atomically spawns N pools per cycle, names them from a culture-rooted curated list (Mahabharata seed + extensions), assigns every active member deterministically (`hash(member_id + cycle_id) % N`), snapshots the `fixed_amount`, and emits all events. **Replay-verifiable, idempotent, partitioned for capacity.** Saga decomposition targets the < 60s p95 envelope at N=50 / M=4L. Pre-launch measured-validation gate (Sprint Change Proposal Item 15) must close before Phase 1.

**The Pool Engine math heart of PRD §9.1.** Correctness is non-negotiable — property-based tests on `hash(member_id + cycle_id) % N`; replay verification per cycle; cross-version snapshot replay.

**User Outcome:** At trustee-bulk-approval action, the engine atomically spawns N pools (one per approved claim), assigns every active member to exactly one pool, snapshots `fixed_amount` per pool. Pool sizes differ by ≤ 1. Replay: given the same `(cycle_id, members-at-freeze snapshot, N)`, the assignment reproduces exactly. Wrong-pool deposits (Epic 9) detected and treated as invalid; facilitated recovery via helpdesk only — no silent remap. Future `_daan` reuse: `support_category` discriminator on every pool; engine has no death-specific branches.

**FRs:** FR-13 (auto-spawn N pools + culture-rooted naming + letter codes), FR-14 (deterministic balanced assignment), FR-15 (fixed-amount per pool + 12-month notice + emergency adjustment), FR-16 (pool-bound payment enforcement — wrong-pool invalid, no refund, facilitated recovery), FR-17 (idempotent payment reference `tr=` per `(member_id, alert_id)`), FR-18 (amount-lock at UPI Intent), FR-19 (under-funded cycle Pool-Reality #1 + #2), FR-20 (engine parameterized for future `_daan` reuse + spawn capacity envelope).

**Anchoring ARs:** AR-11 (snapshot storage hot + Cloud Storage cold with Object Retention Lock), AR-57 (determinism & replay), AR-58 (idempotency keyed store), AR-68 (saga decomposition + measured-validation gate per Sprint Change Proposal Item 15).

**UX-DR anchors:** UX-DR72 (pool identifier dual representation) · UX-DR79 (Pool Engine onboarding tutorial — Phase-1 launch-blocker).

**Demoable closure:** Cycle freeze with 5 approved claims spawns 5 pools **atomically** (atomic invariant: all spawn artifacts commit or cycle remains unspawned + replay-safe); deterministic assignment across 50k synthetic members verified by replay; saga decomposition meets < 60s p95 at N=50 / M=4L in measured-validation gate; property-based test verifies hash stable across releases; under-funded cycle test produces close-of-cycle copy via Pool-Reality #2 framing — no shortfall narrative. Wrong-pool payment is rejected, facilitated-recovery surfaces helpdesk without silently remapping the payment or reassigning the member.

**Dependencies:** Epic 1 (substrate + event log + idempotency + queue) · Epic 3 (member state — active members at freeze) · Epic 4 (Validity Service — only valid members assigned) · Epic 6 (approved claims trigger freeze via Story 6.13).

**Story label legend:** `[PRIMITIVE]` substrate building block · `[SURFACE]` UI or API surface a user touches · `[GOVERNANCE]` CI gate, policy, audit · `[CONSUMER]` wires primitives into running surfaces.

### Story 7.1: Pool Object Data Model + Pool State Machine + Snapshot Storage + `support_category` Discriminator `[PRIMITIVE]`

As Solo Builder authoring the pool primitive that downstream stories consume,
I want a pool object data model + state machine consuming Story 1.3's event log + snapshot storage (hot Postgres + cold Cloud Storage with Object Retention Lock) + `support_category` discriminator on every pool,
So that pool state is event-derived, audit-replayable, immutable-cold-stored, and v2 `_daan` activation is forward-compatible from day one.

**Acceptance Criteria:**

**Given** Story 1.3 events + AR-11 + architectural-freeze row 5 + row 12
**When** the pool object + state machine + snapshot storage are authored in `packages/pool-lifecycle`
**Then** the pool schema carries: `pool_id` (UUID canonical), `pool_canonical_identifier` (`P-YYYY-MM-###`), `pariwar_id`, `cycle_id`, `pool_index` (0-based within cycle), `support_category` (enum: `death_support` for v1; `_daan_*` reserved for v2), `benefit_mechanism` (`pool | reserve` per Story 1.16d CI), `fixed_amount` (snapshotted at spawn), `nominee_bank_accounts` (refs to Story 6.8), `created_at`, `created_by_actor`, `audit_id`
**And** state machine declares states: `spawned`, `live`, `closed`, `settled`; every transition emits a named event (`pool.spawned`, `pool.opened-for-contributions`, `pool.closed`, `pool.settled`)
**And** snapshot storage: hot rows in Postgres; daily snapshot dump to Cloud Storage with **Object Retention Lock** in the IAM-isolated GCP project per Story 1.10's mirror pattern; snapshot includes full pool state + all member assignments at spawn moment

**Given** FR-20 + `support_category` discriminator
**When** the pool engine code is authored
**Then** the engine has **no death-specific branches** — every code path operates on `support_category` enum values, never on hardcoded `'death'` strings
**And** a CI test asserts engine code contains no string match on `'death'` or `'death_support'` outside the enum definition file; v2 `_daan` activation is a configuration change, not engine refactoring
**And** v1 inserts only `support_category: 'death_support'`

**Given** the state-mutation invariant (same as Story 3.1, 6.1)
**When** `pool.current_state` is examined
**Then** derived from event replay only — never directly UPDATEd; CI test asserts

### Story 7.2: Pool Naming Service (Culture-Rooted Curated List + Dual Identifier UX-DR72) `[PRIMITIVE]`

As any member viewing their assigned pool OR any admin auditing the pool engine,
I want pool names from a culture-rooted curated list (Mahabharata seed + extensions) AND dual identifier representation — canonical `P-YYYY-MM-###` for system audit, letter codes A/B/C... on member surfaces,
So that members see a dignified, recognizable name + simple letter code; system audit uses the canonical identifier; mapping is stable per cycle.

**Acceptance Criteria:**

**Given** FR-13 + UX-DR72
**When** the pool naming service is authored
**Then** a trustee-curated `pool_names` registry exists with **≥ 30 culture-rooted names pre-launch** (Mahabharata seed: "Arjuna's Pool", "Yudhishthira's Pool", "Krishna's Pool", "Bheema's Pool", "Karna's Pool", etc.); each name has `display_name_en`, `display_name_hi`, `cultural_lineage_note`, `position_in_ordered_list`
**And** at pool spawn (Story 7.3), next N names in the curated list are assigned in `position_in_ordered_list` order; ordering is deterministic + replay-reproducible
**And** **canonical identifier** `pool_canonical_identifier` follows `P-YYYY-MM-###` format (per-Pariwar cycle counter); used in audit logs, system queries, regulator exports, error messages
**And** **letter codes** A, B, C... derived from `pool_index` (0→A, 1→B, ..., 25→Z, 26→AA, ...); **shown on member surfaces only** (My Pool card, Yogdaan Bahi, Sahyog Drive contributor list)
**And** the dual representation is a documented stable mapping — never rename or remap mid-cycle

**Given** the curated list is exhausted (more pools than names)
**When** spawn attempts to use a name beyond the list
**Then** spawn fails with a clear error; trustee must extend the curated list (itself audit-logged)

### Story 7.3: Pool Spawn Saga — Parent → N Child Jobs + Atomic Cycle-Freeze Invariant `[PRIMITIVE]`

As Solo Builder authoring the pool spawn saga at cycle freeze,
I want a parent → N child-jobs saga decomposition that spawns N pools + assigns all active members + snapshots fixed amounts in an **atomic, replay-safe** manner,
So that the cycle either fully spawns or remains unspawned — no partial-state inconsistencies are possible.

**Acceptance Criteria:**

**Given** AR-68 + Sprint Change Proposal Item 15 + Story 1.12 pg-boss + Story 6.13 trustee bulk-approval
**When** the pool spawn saga is authored
**Then** the saga decomposes into: (a) parent job `cycle.spawn.parent(cycle_id, approved_claims)` — validates inputs, allocates N (one per approved claim), reserves N names from Story 7.2, allocates `pool_canonical_identifier` range; (b) N child jobs `cycle.spawn.child(cycle_id, pool_index, claim_id, fixed_amount_snapshot)` — creates pool, runs deterministic member assignment (Story 7.4), persists snapshot
**And** child jobs orchestrated via pg-boss with idempotency keys `(cycle_id, pool_index)`; parent marks `cycle.state = frozen` only after **all N children commit successfully**

**Given** the **atomic cycle-freeze invariant** (this story's load-bearing commitment)
**When** a spawn saga is in progress and any failure occurs (child crashes, DB connection lost, partial commit, idempotency-store inconsistency)
**Then** the cycle remains in an **unspawned but replay-safe state** — no partial pools become visible to consumers, no partial member assignments are queryable, no events are emitted that would commit the cycle as frozen
**And** the saga can be **retried from the same starting state** — child jobs are idempotent (Story 1.12 keyed store ensures `(cycle_id, pool_index)` produces the same pool on retry); a partial failure does not require manual cleanup
**And** **all spawn artifacts commit or none commit** — there is no observable state where, for example, 3 of 5 pools exist; consumers see either the previous cycle's state OR the new fully-spawned cycle, never an intermediate
**And** the freeze event `cycle.frozen` is emitted **exactly once**, at the moment the parent confirms all children committed; replaying the event stream before the freeze produces the unspawned state; replaying through the freeze produces the fully-spawned state

**Given** Sprint Change Proposal Item 15 capacity envelope
**When** the saga runs at envelope scale in Story 7.9 validation gate
**Then** p95 wall-clock from trustee bulk-approval click to `cycle.frozen` event emission is < 60s; failure under capacity load is a P0 launch-blocker

**Given** audit / regulator query about cycle-freeze atomicity
**When** cycle-freeze history is traced
**Then** audit log shows: parent-job-started, all N child-jobs-completed events, single `cycle.frozen` event; any failed attempt has corresponding `cycle.spawn.aborted` event with reason; no orphaned pool records exist

### Story 7.4: Deterministic Member-to-Pool Assignment + Property-Based + Replay Test Suite `[PRIMITIVE]`

As Solo Builder authoring the assignment algorithm,
I want a deterministic balanced member-to-pool assignment using `pool_index = hash(member_id + cycle_id) % N` with a property-based + replay test suite,
So that the math heart of PRD §9.1 is correct by construction and audit-replayable.

**Acceptance Criteria:**

**Given** FR-14 + AR-57 + architectural-freeze row 1
**When** the assignment algorithm is authored
**Then** the algorithm is `pool_index = hash(member_id + cycle_id) % N` where `hash` is a documented stable function (e.g., SHA-256-truncated-to-uint); the function is reproducible across releases (frozen via a version pin)
**And** assignment is computed only for `active` members at cycle-freeze (excludes `lock-in`, `lapsed`, `withdrawn`, `anonymized` — per Story 4.6 Validity Service at the freeze timestamp)
**And** pool sizes differ by ≤ 1; if hash distribution is not within tolerance, a balancing pass redistributes overflow

**Given** the property-based test suite (load-bearing AC)
**When** CI runs
**Then** property tests assert: (a) **Determinism** — for any `(member_id, cycle_id)`, assignment is identical across runs; (b) **Balanced** — for any `(active_members_set, N)`, pool sizes differ by ≤ 1; (c) **Reproducibility across releases** — hash function output byte-identical at the hash-version pin; (d) **Replay correctness** — same `(cycle_id, member-state-at-freeze, N)` produces identical assignments
**And** the suite runs against synthetic populations (10, 100, 1000, 10000, 50000 members); cross-version test compares hash output against frozen reference vectors

**Given** an audit / dispute / regulator query about an individual assignment
**When** questioned
**Then** the assignment is reproducible from `(member_id, cycle_id)` alone; audit log records `member_state_hash` at freeze + hash function version

### Story 7.5: Fixed-Amount Snapshot at Spawn + 12-Month Notice Workflow + Emergency Adjustment Override `[CONSUMER]`

As a Trustee Panel setting the fixed contribution amount per pool,
I want each pool's `fixed_amount` snapshotted at spawn + future changes announced ≥ 12 months in advance, with a documented emergency adjustment override path,
So that members can plan contributions reliably while the trust retains capacity for genuine emergencies.

**Acceptance Criteria:**

**Given** FR-15
**When** the fixed-amount workflow is authored
**Then** the trustee can set or schedule a `fixed_amount` change via admin UI; standard changes require `effective_from >= today + 365 days` (12-month notice); change is audit-logged + member-notification scaffolding emits via Story 5.1 dispatcher
**And** at spawn (Story 7.3 child job), each pool snapshots the `fixed_amount` effective at the cycle-freeze date; the snapshot is immutable for the life of the pool

**Given** the emergency adjustment override
**When** invoked
**Then** the override requires: (a) State Trustee panel attestation (similar to Story 6.14 R9 voting); (b) documented reason; (c) audit log line with full panel attestation; (d) member notification immediately via Story 5.1
**And** emergency overrides bypass the 12-month notice; the trail makes them unmistakable to regulators / members / future trustees; the override does NOT retroactively modify already-spawned pools — only future spawns

### Story 7.6: Pool-Bound Payment Enforcement (Wrong-Pool Rejected, No Refund, Facilitated Recovery) `[PRIMITIVE]`

As the contribution-receiving pipeline (consumer in Epic 9 reconciliation),
I want pool-bound payment enforcement — UPI Intent pre-fills the member's assigned pool VPA; deposits to non-assigned pools are recorded as invalid (`wrong-pool`); no refund automation; facilitated recovery via helpdesk only,
So that the deterministic assignment model is structurally preserved and no silent remapping breaks audit lineage.

**Acceptance Criteria:**

**Given** FR-16 + architectural-freeze row 7 (pool-bound contribution semantics) + Story 7.4 assignment + Story 6.8 nominee bank
**When** pool-bound enforcement is implemented
**Then** UPI Intent for a member-cycle is pre-filled with the assigned pool's VPA (resolved via Story 7.4); the VPA → pool mapping is unique per pool per cycle
**And** reconciliation (Epic 9) matches deposits against assigned pools; deposits arriving at a non-assigned pool's VPA from a member are recorded as **invalid `wrong-pool`** contributions
**And** the member is shown a clear in-app message: "We received your payment but it went to a different pool than your assigned one. We can't auto-move it. Tap 'Get help' to talk to our helpdesk." (UX-DR55 dignified copy)
**And** wrong-pool contributions are NOT refunded automatically; helpdesk-mediated recovery (Epic 10) handles off-band resolution

**Given** the **facilitated-recovery invariant** (this story's load-bearing commitment)
**When** a wrong-pool payment is processed for recovery
**Then** the recovery guidance + helpdesk-mediated resolution **must NOT silently remap or auto-reassign the payment** in ways that break deterministic assignment or audit lineage
**And** the system explicitly prevents these unsafe operations: (a) auto-moving the payment to the member's assigned pool (would misrepresent audit history — the payment was made to pool X; recording it under pool Y is a falsification); (b) auto-reassigning the member to the pool they paid into (would break determinism — assignment is `hash(member_id + cycle_id) % N`; retroactively changing it corrupts replay); (c) auto-creating a phantom contribution record in the assigned pool (would distort pool's actual collection state)
**And** the helpdesk operator's available actions are: (i) confirm the wrong-pool record as `invalid` with reason; (ii) facilitate a manual refund discussion off-band (logged, not automated); (iii) document family/member conversation; (iv) close the case with a documented outcome
**And** the helpdesk operator **cannot** change the original payment record, change the member's assignment, or move funds between pools through the system — these would require a separate trustee-attestable correction event (rare, audit-logged, signed by ≥ 2 trustees)
**And** a CI test asserts no API endpoint exists that takes a `(wrong-pool-payment, target-pool)` pair and modifies records; the only modifications allowed are state-on-the-wrong-pool-record itself (validity flag, helpdesk case linkage), not cross-pool data movement

**Given** audit / regulator review of wrong-pool cases
**When** queried
**Then** every wrong-pool payment + its facilitated recovery is traceable: original deposit (with the wrong pool's VPA), invalid-flag, helpdesk case linkage, resolution outcome; the deterministic assignment record for the member-cycle remains untouched

### Story 7.7: Idempotent Payment Reference + Amount-Lock at UPI Intent `[PRIMITIVE]`

As the contribution-receiving pipeline,
I want each payment reference (`tr=`) to be unique per `(member_id, alert_id)` + the UPI Intent amount to be pre-filled and locked,
So that repeated payments are idempotent (one valid contribution per alert) and amount-mismatches are rejected by reconciliation.

**Acceptance Criteria:**

**Given** FR-17 + FR-18 + Story 1.12 idempotency keyed store
**When** UPI Intent is fired for a contribution
**Then** the `tr=` is deterministically computed as `tr=contrib-{member_id}-{alert_id}-{nonce}` where the nonce is the same for repeated attempts within the alert (idempotency); a repeated payment with same `tr=` reconciles as the same contribution
**And** `am=` (amount) is pre-filled with the pool's `fixed_amount` (Story 7.5 snapshot); the UPI Intent UI is read-only on the amount field
**And** any deposit reconciled with `amount != fixed_amount` is recorded as invalid (`amount-mismatch`) — analogous to wrong-pool, NOT auto-corrected; facilitated recovery via helpdesk
**And** reconciliation (Epic 9) deduplicates by `tr=`: one valid contribution per (member, alert) regardless of repeated payment attempts

**Given** Story 1.12 idempotency keyed store
**When** a duplicate payment with same `tr=` arrives
**Then** the reconciler returns the previously-recorded outcome; no double-credit; audit log shows duplicate detected

### Story 7.8: Under-Funded Cycle Close-of-Cycle Template-Driven Framing (Pool-Reality #1 + #2) `[GOVERNANCE]`

As a Solo Builder authoring the close-of-cycle messaging policy,
I want under-funded cycle close-of-cycle copy to follow a template-driven framing that celebrates actual outcomes (Pool-Reality #1) and **disallows comparison-to-target framing** (Pool-Reality #2),
So that members and nominees experience cycle close as a moment of dignified solidarity, not shortfall narrative.

**Acceptance Criteria:**

**Given** FR-19 + architectural-freeze row 10 (Hindi-first bilingual surface contract)
**When** close-of-cycle messaging templates are authored
**Then** templates exist for each cycle outcome: (a) **fully-funded** — celebration copy naming contributor count + nominee family's amount received; (b) **under-funded Pool-Reality #1 celebration framing** — copy celebrating the actual amount delivered and contributor solidarity, without naming a "target" or "shortfall"; (c) **partial outcomes** — copy acknowledging actual without framing comparison
**And** **Pool-Reality #2 disallowance** is enforced: templates contain NO "we fell short of...", "X% achieved", "target missed", "needed more contributions", or analogous comparison-to-target framing — these phrasings are explicitly listed in the tone-guide (Story 2.2) as prohibited and lint-checked by Story 1.17 FM-1..FM-14 lint set
**And** templates are bilingual (Hindi + English parity per Story 2.1) + dignified-validation Pattern 4 (UX-DR55) — particularly important for under-funded cycles which often correlate with grief

**Given** a published close-of-cycle message that violates Pool-Reality #2
**When** the FM lint set or Story 2.2 tone-review process runs
**Then** the violation is caught at PR time OR tone-review time; publishing is blocked until copy is corrected

**Given** Sahyog Vivran publication (Epic 11b consumer)
**When** per-claim story renders close-of-cycle framing
**Then** Pool-Reality #2 framing applies — the page reads as celebration, not as shortfall

### Story 7.9: Pool Engine Pre-Launch Measured-Validation Gate (N=50 / M=4L < 60s p95) `[GOVERNANCE]`

As Solo Builder + Trustee Panel,
I want a pre-launch measured-validation gate that runs the Pool Engine at envelope capacity (N=50 / M=4L synthetic active members / < 60s p95 wall-clock) with documented evidence,
So that Phase 1 cannot launch without measured validation that the saga decomposition meets the capacity envelope.

**Acceptance Criteria:**

**Given** Sprint Change Proposal Item 15 + AR-68 + Story 7.3 saga
**When** the validation gate runs
**Then** a documented test scenario instantiates 4L synthetic active members (in a non-production Pariwar) and triggers a cycle-freeze with 50 approved claims; wall-clock from trustee-bulk-approval click to `cycle.frozen` event is measured
**And** p95 across ≥ 10 runs must be < 60s; results recorded in `_bmad-output/research/pool-engine-validation-gate.md` with screenshots/video evidence
**And** any p95 ≥ 60s fails the gate; remediation must precede Phase 1 launch (Trustee Panel signoff)

**Given** Story 0.15 launch-gate inventory + Sprint Change Proposal Item 17
**When** this gate is scheduled
**Then** it appears in the launch-gate inventory with named owner (Solo Builder) + closure criteria (p95 < 60s at envelope) + target date; once closed, the closure evidence is linked

### Story 7.10: Pool Engine Onboarding Tutorial (UX-DR79 Phase-1 Launch-Blocker — 3 Screens) `[SURFACE]`

As a new member entering the contribution loop for the first time,
I want a 3-screen onboarding tutorial that explains pool-bound semantics, the pool letter code, and the out-of-band contribution policy,
So that wrong-pool errors and confusion are minimized at first contribution.

**Acceptance Criteria:**

**Given** UX-DR79 (Phase-1 launch-blocker) + Story 0.10 P0-2c VI accessibility findings + Story 2.1 i18n + Story 1.17 design system
**When** the onboarding tutorial is implemented
**Then** the tutorial appears on the member's first entry into My Pool card (Epic 8 consumer); 3 screens with skip-and-confirm:
  - **Screen 1** "What is a pool?" — explains pool-bound semantics (each cycle, you're assigned to one pool by the system; your contribution helps one nominee family)
  - **Screen 2** "Your pool's letter code" — explains the letter code (e.g., "You're in Pool A") — shows the Mahabharata name + letter; explains canonical identifier exists for audit
  - **Screen 3** "If you accidentally pay outside the system" — out-of-band contribution policy (UX-DR76): direct-to-family gifts are honored dignifiedly; if you pay to a wrong pool, helpdesk helps facilitate recovery without breaking your assignment (links Story 7.6 facilitated-recovery invariant — gently framed)
**And** Hindi-first per Story 2.1; assistive-tech accessibility per Story 0.10
**And** tutorial completion recorded as a member-level event for analytics; skipping permitted; re-viewable from settings

**Given** the tutorial is a Phase-1 launch-blocker (UX-DR79)
**When** Phase 1 launch readiness is reviewed
**Then** the tutorial existing + verified-accessible is a closure criterion; without it, launch is blocked

---

## Epic 8: Sushil's Contribution Loop (Yogdaan Bahi + My Pool + UPI Intent + Contribution Note)

**The defining experience SM-1 measures.** This epic is *Sushil's surface* (per Sally). Yogdaan Bahi is the passbook he opens at a chai stall to feel proud. The My Pool card is the home-screen anchor for the 15-day cycle. The UPI Intent flow is the 90-second loop the brief commits to. The Contribution Note PDF is the artifact, never "receipt" or "invoice." Design budget is explicitly NOT shared with Epic 9's reconciliation engine.

**Inherits accessibility gate from Story 0.10 P0-2c** (Reena-class data-cost sensitivity, status anxiety, lower wrong-pool tolerance validated in field work).

**FR-23 nudge seam consumed here:** cycle-open push + 15-day tone-gradient deadline reminders + contribution-confirmed push — all fire via Epic 5 channel dispatcher. Epic 8 owns trigger logic + copy templates; Epic 5 owns delivery.

**FRs:** FR-21, FR-22, FR-24, FR-25, FR-26, FR-27, FR-28, FR-33, FR-34.

**Anchoring ARs:** AR-58 (idempotency for `tr=` — consumes Story 7.7) · AR-66 (disaster handling reads here for cycle-open behavior).

**UX-DR anchors:** UX-DR25 · UX-DR26 · UX-DR27 · UX-DR49 · UX-DR50 · UX-DR66/67/68 · UX-DR76 · UX-DR77 · UX-DR79 (already in Story 7.10) · UX-DR80.

**Demoable closure:** Sushil-class member completes the 90-second loop on canonical validation device under throttled cellular: push lands → opens app → My Pool card → tap → UPI Intent fires PhonePe → returns → pastes UTR → yellow pill renders. **Measurement fence (SM-1 demo beat B21):** TWT-portion ≤ 60s; UPI-app round-trip measured separately; total observed ≤ 90s. Yogdaan Bahi opens with virtualized list of 500 test entries at 60fps target / 30fps minimum on entry-level Android. Contribution Note PDF downloads with watermark + Niyamavali version embedded.

**Dependencies:** Story 0.8 (Sushil empathy) + Story 0.10 (accessibility) closed · Epic 1 (substrate + event log + design system) · Epic 3 (member state) · Epic 5 (channel dispatcher) · Epic 7 (pool spawn + idempotent `tr=` + amount-lock + Story 7.10 onboarding tutorial). **Epic 9 confirms contribution via reconciliation (yellow → green flip); Epic 8 closes at yellow pill — green flip is Epic 9's closure.** Reconciliation-confirmed state transition ownership belongs exclusively to Epic 9 to preserve implementation sequencing and prevent hidden cross-epic coupling.

**Story label legend:** `[PRIMITIVE]` · `[SURFACE]` · `[GOVERNANCE]` · `[CONSUMER]`.

### Story 8.1: Alert State Machine + Cycle-Open Trigger `[CONSUMER]`

As Solo Builder authoring the alert lifecycle for the contribution loop,
I want an alert state machine (`draft → frozen → published → live → closed → settled`) + cycle-open trigger consuming Epic 7's `cycle.frozen` event,
So that downstream contribution-loop surfaces (My Pool card, Yogdaan Bahi, contributor list) all read from a single canonical alert state.

**Acceptance Criteria:**

**Given** FR-22 + Epic 7's `cycle.frozen` event + Story 1.3 event-log primitive
**When** the alert state machine is authored in `packages/alert-lifecycle`
**Then** states are: `draft` (trustee preparing) → `frozen` (cycle-freeze emitted) → `published` (member-visible) → `live` (contributions accepted) → `closed` (no more contributions) → `settled` (Epic 9 reconciliation complete + disbursement)
**And** every transition emits a named event (`alert.frozen`, `alert.published`, `alert.live`, `alert.closed`, `alert.settled`); state is derived from event replay per the §1.14 invariant (same pattern as Story 3.1, 6.1, 7.1)
**And** the cycle-open trigger consumes `cycle.frozen` event and emits `alert.published` + dispatches the cycle-open notification via Story 8.8

**Given** AR-66 (disaster handling reads here)
**When** a Pariwar-degraded-mode declaration (Story 5.8) is active for cycle-open
**Then** the trigger logic reads the degraded-mode state and emits a `time_critical: true` alert payload; the alert path also enables the SMS bridge via Story 5.8

### Story 8.2: `<ActiveContributionCard>` My Pool Card + Progress Meter + 15-Day Tone Gradient `[SURFACE]`

As Sushil opening the TWT app during an active cycle,
I want a My Pool home-screen card showing the pool name + letter code + nominee first-name + amount + days remaining + progress meter — with a 15-day tone gradient that shifts language from calm to factual to gently urgent,
So that I receive contextual nudges without panic-framing or scarcity language.

**Acceptance Criteria:**

**Given** FR-21 + FR-26 + UX-DR25 (tone gradient) + Story 0.8 Sushil empathy findings + Story 1.17 design system + Story 7.2 dual identifier
**When** the My Pool card is implemented
**Then** the card appears as the topmost home-screen element ONLY for members in `active` state with an assigned pool in `live` alert state; shows: pool letter code (e.g., "Pool A") + Mahabharata-rooted pool name + nominee first-name + last-initial + fixed amount + days remaining + progress meter
**And** the **15-day tone gradient** is enforced by per-day-range copy templates: Day 0-10 calm ("Your pool is open — contribute when you can"), Day 11-13 factual-precise ("4 days remaining; pool has X contributions so far"), Day 14-15 gently urgent never panicked ("Last day — please contribute to support [nominee family]"); explicit prohibition of scarcity ("only 2 days left!") or panic ("URGENT") language enforced via Story 1.17 FM-1..FM-14 lint + Story 2.2 tone-review
**And** the fixed-amount transition pattern is shown: when the trustee schedules a fixed-amount change ≥ 12 months in advance (Story 7.5), the card displays the upcoming transition gently

**Given** the inherited accessibility gate (Story 0.10 P0-2c)
**When** the card renders for assistive-tech users
**Then** the card is semantically labeled; countdown announced with appropriate ARIA-live politeness; touch-targets ≥ 56pt (UX-DR26 for the embedded UPI button)

### Story 8.3: Real-Time Live Contributor List (FR-24) + Pending Contributors List (FR-25 `[v1-S]`) `[CONSUMER]`

As any pool member viewing the My Pool card or any visitor on Sahyog Drive (Epic 11b),
I want to see the real-time list of confirmed contributors (first-name + last-initial only) — separate from any pending-but-not-yet-confirmed contributors — with confirmation visibility deriving exclusively from Epic 9 reconciliation,
So that the published contributor list reflects only actually-confirmed contributions and never leaks unverified yellow-pill states as confirmed.

**Acceptance Criteria:**

**Given** FR-24 + FR-25 `[v1-S]` + Story 7.4 deterministic assignment + Story 9.x reconciliation event stream
**When** the contributor list is implemented
**Then** the live confirmed contributor list shows `first_name + last_initial` only (PII-shielded per Story 1.16b CI gate); the list updates in near-real-time on reconciliation-confirmed events
**And** the pending contributors list (FR-25 `[v1-S]`) shows count + percentage; member-identifying details are not shown on this list (privacy preservation for members who attested but not yet reconciled)
**And** lists are virtualized per UX-DR80 (50-500 entries Yogdaan Bahi; up to 10k on mobile Sahyog views)

**Given** the **reconciliation-confirmed-only visibility invariant** (this story's load-bearing commitment)
**When** the live contributor list is rendered on any surface (My Pool card, Sahyog Drive public, member-facing live pool view)
**Then** **contributor visibility derives exclusively from reconciliation-confirmed contribution state emitted by Epic 9** (`contribution.confirmed` events with green-pill state)
**And** **yellow-pill or self-attested states must NEVER appear as confirmed contributors** — UTR self-attestation alone does not promote a member to the confirmed contributor list
**And** the data model enforces this at the query layer: the confirmed-contributors view reads only from `contribution.confirmed` event-derived state; queries for the public contributor list cannot accept `pending | yellow | unconfirmed` states
**And** a CI test asserts no API endpoint surfaces a `yellow_pill` or `pending` contribution as a confirmed contributor; mixing the two states across any surface fails the test
**And** PII scrape CI (Story 1.16b) verifies the matrix entry for "live contributor list" surfaces only `reconciliation-confirmed first_name + last_initial`, never yellow-pill states

**Given** a member's contribution flips from yellow to green via Epic 9 reconciliation
**When** Epic 9 emits `contribution.confirmed`
**Then** the contributor appears on the live list within seconds (real-time update); the pending-list count decrements; the My Pool card progress meter increments

### Story 8.4: UPI Intent Flow + `<UPIIntentButton>` + UTR Self-Attestation + Yellow Pill `[SURFACE]`

As Sushil tapping "Pay via UPI" on the My Pool card,
I want a UPI Intent flow that pre-fills VPA + amount + `tr=` + `tn=`, opens my preferred UPI app, accepts my pasted UTR on return, and shows the yellow pill state,
So that I complete the contribution loop in seconds with idempotency + amount-lock + clear unconfirmed-but-attested status.

**Acceptance Criteria:**

**Given** FR-27 + FR-28 + UX-DR26 (`<UPIIntentButton>` ≥ 56pt) + Story 7.6 pool-bound VPA + Story 7.7 idempotent `tr=` + amount-lock
**When** the UPI Intent flow is implemented
**Then** tapping the `<UPIIntentButton>` (≥ 56pt touch-target) fires UPI Intent pre-filled with: `pa` (member's assigned pool VPA from Story 7.6), `am` (fixed amount from Story 7.7 amount-lock, read-only), `tr` (deterministic per `(member_id, alert_id)` from Story 7.7), `tn` (transaction note with pool letter + cycle ref)
**And** per-app guidance helps the member if they don't have a UPI app installed; failure path links Story 8.5 UPI failure coach
**And** on return from UPI app, the flow prompts the member to paste the UTR; UTR is validated for format; persisted as `contribution.utr-attested` event on the alert's event stream; the My Pool card transitions to yellow-pill state

**Given** the **UTR-attestation-is-member-claim-not-confirmation invariant** (this story's load-bearing commitment)
**When** UTR self-attestation is recorded
**Then** the persisted event represents a **member-declared payment claim only** — NOT a reconciliation-confirmed contribution, NOT fund receipt, NOT payout eligibility
**And** yellow pill state explicitly carries semantics: "you have told us you paid; we are still verifying with our bank statement reconciliation pipeline"; copy is clear and never implies confirmation
**And** downstream surfaces (live contributor list per Story 8.3, Sahyog Drive contributor count, member-facing dashboards, analytics aggregates) **must NOT** treat yellow pill as quasi-confirmed; **must NOT** count yellow toward "raised so far"; **must NOT** imply payment success
**And** until Epic 9 reconciliation completes (emitting `contribution.confirmed`), the contribution is in a pending-attested-only state; only `contribution.confirmed` events promote the contribution to confirmed status
**And** a CI test asserts: (a) no API surface promotes yellow to green without an Epic 9 `contribution.confirmed` event in the stream; (b) public contributor counts (My Pool card progress meter, Sahyog Drive) source from confirmed counts only; (c) UTR self-attestation events have an `attestation_only: true` flag at the schema level that downstream consumers must respect

**Given** the inherited accessibility gate (Story 0.10 P0-2c)
**When** the flow renders for assistive-tech users
**Then** UPI button ≥ 56pt; UTR paste field has clear ARIA label; yellow pill state announced with the explicit "pending reconciliation" semantics

### Story 8.5: UPI Failure Coach (FR-34 `[v1-S]`) `[SURFACE]`

As Sushil whose UPI payment failed (insufficient balance, wrong PIN, app crash, network issue),
I want a coach surface that diagnoses the failure mode + guides me to retry or seek helpline help,
So that I'm not stranded when UPI hiccups happen.

**Acceptance Criteria:**

**Given** FR-34 `[v1-S]`
**When** the UPI failure coach is implemented
**Then** when the member returns from a UPI app without pasting UTR (or pastes invalid UTR), the coach surface offers structured failure modes: insufficient balance, wrong PIN, app issue, network issue, other — with empathy copy per mode
**And** each mode offers next-step guidance: retry the UPI Intent (Story 8.4); switch to another UPI app; call helpline (Story 8.11); contact your bank
**And** failure events are logged anonymously for analytics tuning (no PII in failure logs)

### Story 8.6: Yogdaan Bahi `<ContributionTimeline>` + List Virtualization `[SURFACE]`

As Sushil at a chai stall opening his Yogdaan Bahi,
I want a visual contribution passbook showing my full contribution history with the pool name, cycle, amount, status, date — virtualized for performance,
So that I feel proud of my contributions and can show others my Yogdaan Bahi without lag.

**Acceptance Criteria:**

**Given** UX-DR27 (`<ContributionTimeline>` Yogdaan Bahi) + UX-DR80 (virtualization)
**When** the Yogdaan Bahi is implemented
**Then** the timeline lists each contribution with: cycle, pool letter + name, amount, status (yellow/green/red/grey), date, link to Contribution Note PDF (Story 8.7)
**And** the list is virtualized — opens with 500 test entries at 60fps target / 30fps minimum on entry-level Android (Story 0.10 canonical device); on mobile Sahyog views (Epic 11b), 10k entries with the same performance contract
**And** UX-DR50 save-and-resume affordance is supported if the user opens a Contribution Note while scrolling and returns

**Given** the dignified-respectful register (Story 2.2 tone guide)
**When** the timeline copy renders
**Then** it never frames contributions as "obligations" or "dues"; the language is "your support" — register-appropriate

### Story 8.7: Contribution Note PDF — Never "Receipt", Legal-Reviewed, Watermark + Niyamavali Version `[SURFACE]`

As Sushil after a confirmed contribution,
I want a downloadable Contribution Note PDF — never called "receipt" or "invoice" — with watermark + Niyamavali version reference + legal-reviewed copy,
So that I have an artifact that reflects the trust relationship rather than a transactional document.

**Acceptance Criteria:**

**Given** FR-33 (Contribution Note PDF — never "receipt"; legal-reviewed copy) + Story 0.13 legal-counsel engagement (pending-review pattern)
**When** the Contribution Note PDF generator is implemented
**Then** the PDF is titled "Yogdaan Pratigya" (Contribution Note) in Hindi + English; **explicitly NOT** "Receipt" or "Invoice"; lint set (Story 1.17 FM-1..FM-14) catches these prohibited terms
**And** the PDF embeds: member's first-name + last-initial, pool letter + cultural name, cycle ID, amount, date, UTR (when confirmed), `clause_version_id` reference to the relevant Niyamavali rules effective at contribution time
**And** the PDF carries a TWT watermark + per-Pariwar branding (Story 1.7); copy is reviewed by legal counsel per Story 0.13 engagement (pending-review pattern); PDF is regenerable for any past contribution

**Given** the member downloads the PDF
**When** rendered
**Then** Hindi-first parity (Story 2.1 surface contract); accessibility-compliant (tagged PDF for screen readers)

### Story 8.8: Contribution Loop Notification Triggers — Cycle-Open + Deadline-Reminder + Contribution-Confirmed `[CONSUMER]`

As Solo Builder authoring the trigger logic for the contribution loop notifications,
I want trigger logic that publishes alerts via Story 5.1 channel dispatcher for cycle-open + 15-day deadline-reminder cadence + contribution-confirmed events,
So that the FR-23 nudge seam is honored — Epic 8 owns triggers + copy, Epic 5 owns delivery.

**Acceptance Criteria:**

**Given** FR-23 nudge seam (architectural-freeze row 15) + Story 5.1 dispatcher + Story 8.1 alert state machine
**When** the notification triggers are implemented
**Then** **cycle-open trigger**: on `alert.published`, dispatches with category `alert_published`, `time_critical: true`, payload includes pool letter + nominee + amount; **15-day deadline-reminder cadence**: fires on Day 5 / Day 10 / Day 13 / Day 14 with copy matching the UX-DR25 tone gradient (calm / factual / gently urgent / last day); **contribution-confirmed trigger**: on Epic 9 `contribution.confirmed` event, dispatches with category `contribution_confirmed`
**And** copy templates live in `packages/contracts/alerts/contribution-loop-templates`; tone-review process (Story 2.2) applies before any template change ships
**And** all dispatches respect Story 5.1 alert payload immutability invariant; renderers in Epic 5 are pure functions of the immutable payload

### Story 8.9: Calendar-Aware Close-of-Cycle Timing (UX-DR77 — Bihar Holiday Windows) `[CONSUMER]`

As a member during a cycle whose default close date falls on a major Bihar holiday,
I want close-of-cycle timing to be calendar-aware — extending the close date past holiday windows when the default close lands during them,
So that I'm not pressured to contribute during Chhath Puja, Holi, or other locally-significant holidays.

**Acceptance Criteria:**

**Given** UX-DR77 (calendar-aware close-of-cycle timing — Bihar holiday windows)
**When** the timing logic is implemented
**Then** a `bihar_holiday_calendar` registry is maintained per-Pariwar with major holiday date ranges (Chhath Puja, Holi, Diwali, etc.); the calendar is trustee-curated and updated annually
**And** when a cycle's default close date (Day 15) lands within a holiday window, the close is extended to the first non-holiday day after the window; member notification reflects the extension with empathy copy
**And** the extension does NOT change the deterministic assignment or pool-bound semantics (Story 7.4, 7.6); only the time-window when contributions are accepted

### Story 8.10: Out-of-Band Contribution Policy (UX-DR76 — Direct-to-Family Gifts) `[GOVERNANCE]`

As Solo Builder authoring the trust's policy on out-of-band contributions,
I want a formal policy + member-facing copy framework that honors direct-to-family gifts dignifiedly without breaking pool-bound semantics or audit lineage,
So that members who choose to support a family directly are respected and the system doesn't pretend it controls their personal generosity.

**Acceptance Criteria:**

**Given** UX-DR76 (out-of-band contribution policy)
**When** the policy is authored
**Then** the policy document (in `docs/policies/out-of-band-contributions.md`) states: direct-to-family gifts are honored as personal acts of solidarity; the trust system does not track, audit, or reconcile them; the trust never claims credit for them in Sahyog Vivran or analytics
**And** member-facing copy in Story 7.10 onboarding tutorial Screen 3 + helpline scripts + Sahyog Vivran framing honor this policy — no "you should have gone through the app" framing
**And** the policy explicitly prevents these unsafe operations: (a) attributing out-of-band gifts to pool contribution stats; (b) compelling family members to retroactively route gifts through the app; (c) interpreting out-of-band gifts as "incomplete" or "irregular"

### Story 8.11: `<CallHelplineCTA>` Cross-Cutting Affordance (UX-DR49) `[SURFACE]`

As any member at any point in the contribution loop who needs human help,
I want a "Call helpline" affordance that is always one tap away — never more than 2 taps from any contribution-related surface,
So that human help is structurally accessible and AR-61 staff-fallback is honored at every node.

**Acceptance Criteria:**

**Given** UX-DR49 (`<CallHelplineCTA>` cross-cutting) + AR-61
**When** the affordance is implemented
**Then** the `<CallHelplineCTA>` appears on: My Pool card (Story 8.2), UPI failure coach (Story 8.5), Yogdaan Bahi (Story 8.6), Contribution Note PDF (Story 8.7), and every error / mismatch surface
**And** tapping the CTA initiates a call to the Pariwar's helpline number; the call is routed to Story 10.x helpdesk routing-policy registry
**And** the affordance is visually distinct + touch-target ≥ 56pt + accessible per Story 0.10 P0-2c

### Story 8.12: 90-Second TWT-Portion Loop Measurement Instrumentation (SM-1 Demo Beat B21) `[GOVERNANCE]`

As Solo Builder + Trustee Panel demonstrating SM-1 readiness,
I want measurement instrumentation that captures the TWT-portion of the 90-second contribution loop separately from the UPI-app round-trip portion,
So that the SM-1 demo beat B21 commitment (TWT-portion ≤ 60s; total observed ≤ 90s) is falsifiable on stage with measured evidence rather than aspiration.

**Acceptance Criteria:**

**Given** SM-1 demo beat B21 (per Reverse Engineering R6 refinement in Step 2)
**When** the measurement instrumentation is implemented
**Then** the instrumentation captures wall-clock timing on the canonical validation device under throttled cellular for: (a) app-open-to-My-Pool-render (Story 8.2), (b) tap-CTA-to-UPI-Intent-fire (Story 8.4), (c) return-from-UPI-app-to-UTR-paste-completion, (d) yellow-pill-render
**And** the **TWT-portion** sum of (a) + (b) + (d) plus the UI-side of (c) is measured separately from the **UPI-app round-trip portion** (which is the time between UPI Intent fire and return from UPI app — this is outside TWT's control and excluded from the TWT-portion budget)
**And** the budget commitment is explicit: TWT-portion ≤ 60s p95 on canonical validation device with cold cache; total observed loop ≤ 90s with the UPI-app round-trip included

**Given** pre-launch validation
**When** the measurement runs across ≥ 10 representative sessions on the canonical device under throttled cellular
**Then** results are recorded with screenshots/video evidence in `_bmad-output/research/contribution-loop-90s-validation.md`; p95 TWT-portion ≤ 60s passes the gate; any p95 ≥ 60s fails — remediation required before Phase 1 launch

**Given** Story 0.15 launch-gate inventory
**When** this gate is scheduled
**Then** it appears in the launch-gate inventory with named owner + closure criteria + target date

---

## Epic 9: Reconciliation Engine (Nominee Console + Statement Intake + Matcher + Mismatch Triage)

**Anita and Sunita's world** (per Sally). Reconciliation pipeline of PRD §9.1's uncompromisable subsystems. Cron-driven matcher runs 6×/day during live alerts. Sunita pushes daily bank statements (5-bank allowlist: SBI/PNB/BoB/BoI/Bihar coop; 50 golden files/bank). UTR primary match; amount + sender-VPA + timestamp secondary. Mismatches force screenshot upload and route to trustee review queue. **Yellow → green flip is the only path to confirmed status — Epic 9 is the canonical financial-truth authority.**

**FRs:** FR-29, FR-30, FR-31, FR-32, FR-35, FR-36, FR-50.

**Anchoring ARs:** AR-41 (5-bank parser allowlist + 50 golden files) · AR-44 (webhook ingress) · AR-45 (external-call resilience — cross-cutting AC) · AR-58 (idempotent matcher) · AR-69 (normalization schema + matcher mechanism ADRs).

**UX-DR anchors:** UX-DR21 (`<StatusPill>` 5-state) · UX-DR28 (`<SelfVerifySurface>` yellow-stuck recovery) · UX-DR35 (`<NomineeConsole>` — Sunita's surface; "fursat" cadence; staff-takeover) · UX-DR36 (`<BankStatementUpload>` + "Hum aapke liye padh lenge" fallback) · UX-DR37 (`<PoolProgressCard>`) · UX-DR50 (`<SaveAndResumeAffordance>`).

**Demoable closure:** Sunita uploads test statements for SBI/PNB/BoB/BoI/Bihar coop; parser normalizes; matcher confirms test UTRs within p95 < 4h. Sushil's My Pool card flips yellow → green via Story 9.5 `contribution.confirmed` event (canonical financial-truth authority). Mismatch test forces screenshot upload; routes to review queue; trustee confirms via Story 9.8 (also emits `contribution.confirmed`); member sees green pill. Monotonic-confirmation invariant: confirmation never silently reverts.

**Dependencies:** Epic 1 (substrate + event log + idempotency + queue) · Epic 3 (member state for contributor list) · Epic 6 (nominee bank accounts via Story 6.8) · Epic 7 (pool + idempotent `tr=` + Story 7.6 facilitated-recovery) · Epic 8 (UTR self-attestation via Story 8.4 yellow-pill state).

**Story label legend:** `[PRIMITIVE]` · `[SURFACE]` · `[GOVERNANCE]` · `[CONSUMER]`.

### Story 9.1: Nominee Console — Sunita's Surface + "Fursat" Cadence + Staff-Takeover by Day N `[SURFACE]`

As Sunita (a bereaved nominee performing daily bank statement reconciliation),
I want a Nominee Console that respects "fursat" cadence (grief-paced, unhurried) with staff-takeover available by day N when I disengage,
So that reconciliation duties never feel like a transactional grind during my grief.

**Acceptance Criteria:**

**Given** UX-DR35 + UX-DR55 Pattern 4 (validated against Story 0.9) + UX-DR50 save-and-resume
**When** the Nominee Console is implemented
**Then** the console shows: today's bank statement upload queue (Story 9.3), reconciliation status across pools (Story 9.6 `<StatusPill>` 5-state), confirmed contributors-so-far (Story 8.3), helpline CTA (Story 8.11), nominee-friendly progress copy
**And** UX-DR50 save-and-resume across every multi-step interaction
**And** staff-takeover trigger: when the nominee has not engaged for ≥ N days (configurable, default 7 days), the system flags the case for District Admin takeover; staff completes daily uploads from their side until the nominee re-engages

**Given** the **"fursat" cadence operational-posture invariant** (this story's load-bearing commitment)
**When** any future throughput optimization, KPI gamification, or workflow streamlining is considered for the Nominee Console
**Then** **throughput optimization must not erode nominee dignity or grief-paced workflow pacing**
**And** the following are explicitly prohibited: (a) gamification (streaks, badges, completion-percentage "achievements"); (b) urgency framing ("Sunita, you're behind on uploads — please act"); (c) auto-escalation that pressures the nominee before the staff-takeover threshold; (d) optimizations that prioritize matcher throughput over the nominee's emotional pace
**And** console copy is reviewed by Story 2.2 tone-review before any change ships; "fursat" register is documented in the tone guide with prohibited frames listed
**And** acceptable optimizations: less typing, better OCR, save-and-resume preservation, field prefilling on return — these reduce friction without rushing
**And** a periodic UX review (≥ once per release cycle) revisits console copy + interaction patterns to ensure "fursat" register is preserved; designer signs off

**Given** the inherited accessibility gate (Story 0.10) + Story 0.9 bereaved-spouse findings
**When** the console renders for assistive-tech users + grief-context contexts
**Then** screen-reader-accessible; grief-context copy validated against Story 0.9 findings

### Story 9.2: Bank Statement Intake Transport + 5-Bank Parser Allowlist + 50 Golden Files/Bank + Normalization Schema `[PRIMITIVE]`

As the reconciliation pipeline ingesting daily bank statements,
I want a parser supporting a 5-bank allowlist with 50 golden files per bank for regression + a normalized schema per AR-69 ADR,
So that bank statement parsing is scoped, regression-resistant, and produces a single canonical record shape regardless of source bank.

**Acceptance Criteria:**

**Given** FR-29 + AR-41 + AR-69 (normalization schema ADR) + AR-45 cross-cutting
**When** the parser is authored
**Then** v1 supports exactly 5 banks: SBI, PNB, BoB, BoI, and one Bihar cooperative (specific bank named in `bank_allowlist.yaml`); other banks rejected with clear message + helpdesk routing
**And** each bank parser has **50 golden test files** in CI fixtures (`packages/parsers/fixtures/<bank-code>/`); files cover edge cases: standard rows, transfers, refunds, charges, multi-day batches, encoding variants, partial rows
**And** the parser produces a canonical `BankStatementEntry` shape: `entry_id`, `bank_code`, `transaction_date`, `transaction_id_utr`, `sender_vpa`, `amount`, `description`, `entry_type` (`credit | debit | charge | reversal`), `running_balance`, `raw_row` (preserved for audit), `parser_version`
**And** any change to a bank's format triggers golden-file regeneration; CI fails if golden tests fail; new banks require trustee-attested admission to the allowlist (Story 7.5-style workflow)

**Given** AR-45 external-call resilience (cross-cutting)
**When** any external call is part of the intake pipeline
**Then** retry-with-backoff (3 retries × exp backoff); timeouts enforced; circuit-breaker prevents cascading failure; all failures audit-logged

### Story 9.3: `<BankStatementUpload>` + "Hum aapke liye padh lenge" Fallback `[SURFACE]`

As Sunita uploading her daily bank statement,
I want a forgiving upload surface that accepts PDF or CSV, gives immediate parse feedback, and offers "Hum aapke liye padh lenge" (we'll read it for you) on parse failure,
So that I'm never stranded with an unparseable statement.

**Acceptance Criteria:**

**Given** UX-DR36
**When** the upload surface is implemented
**Then** accepts PDF or CSV from the 5-bank allowlist; runs Story 9.2 parser inline; feedback within ~5s: parse-success summary OR parse-failure with explanation
**And** parse failure offers two paths: (a) retry with corrected format; (b) **"Hum aapke liye padh lenge"** — staff-mediated manual entry with 24-48h SLA; staff transcribes from the statement
**And** the fallback creates an audit-logged task in the District Admin queue with attribution; resolution feeds back into the matcher

### Story 9.4: UTR Matching Engine + Matcher Mechanism — Cron 6×/Day + Idempotent + Replayable + Monotonic-Confirmation Invariant `[PRIMITIVE]`

As Solo Builder authoring the reconciliation matcher,
I want a UTR matching engine running cron 6×/day during live alerts with idempotent matcher mechanism + replay-correct outputs + monotonic-confirmation invariant,
So that financial truth is computed deterministically, idempotently, and only ever moves forward (or with explicit audit trail).

**Acceptance Criteria:**

**Given** FR-30 + AR-58 + AR-69 OQ-2 (matcher mechanism ADR) + Story 1.12 idempotency + Story 8.4 attestation events + Story 9.2 bank statement entries
**When** the matcher is authored
**Then** the matcher runs as cron job 6×/day during live alerts (every 4 hours); idempotency key per match attempt: `(member_id, alert_id, bank_statement_entry_id)`
**And** the matching mechanism: (a) **primary match** — exact UTR match between Story 8.4 `contribution.utr-attested` event's `utr` field and Story 9.2 `BankStatementEntry.transaction_id_utr`; (b) **secondary verification** — amount equals pool's `fixed_amount` (Story 7.5) AND timestamp within reasonable window AND sender_vpa matches member-recorded payment VPA; (c) **on full match** — emits `contribution.confirmed` event (consumed by Story 9.5)
**And** the matcher is **replayable**: replaying the same `(bank_statement_entries, attestation_events)` set produces identical match outcomes; deterministic ordering (per Story 4.6 order-invariant pattern)

**Given** the **monotonic-confirmation invariant** (this story's load-bearing commitment)
**When** a contribution has been confirmed (Story 9.5 `contribution.confirmed` event emitted)
**Then** the confirmation **cannot silently revert** — no code path may un-confirm a contribution without an explicit compensating event
**And** the only path to "un-confirm" a previously-confirmed contribution is: (a) trustee-attested review-and-reverse decision (rare, audit-logged, requires step-up OTP via Story 5.9 + reason-code + State Trustee panel attestation similar to Story 6.14); (b) the review-and-reverse emits an explicit `contribution.confirmation.reversed` compensating event with full provenance (which trustees, what reason, what original confirmation it reverses)
**And** **silent reversion is structurally impossible**: the matcher cannot emit a "reversal" of a prior confirmation without going through the trustee review path; a CI test asserts no API endpoint can transition a contribution from `confirmed` back to `pending` or `unconfirmed` without an attested reversal event
**And** all confirmation events form a monotonic forward chain in the event log; replay produces the same monotonic chain; any silent attempts to mutate the chain (e.g., direct DB UPDATE on contribution status) fail at the DB layer via triggers (event-log immutability per Story 1.3)

**Given** Story 7.6 facilitated-recovery invariant
**When** the matcher encounters a wrong-pool payment
**Then** it does NOT silently remap; the wrong-pool record is preserved as invalid; mismatch detection (Story 9.7) routes it to review queue

### Story 9.5: Yellow → Green Pill Flip — `contribution.confirmed` as Canonical Financial Truth `[CONSUMER]`

As any surface consuming contribution status,
I want `contribution.confirmed` events from Story 9.4 matcher to be the **sole authoritative source of confirmed contribution truth**,
So that no surface can independently claim a contribution is "confirmed" by inferring from yellow pill, UTR attestation, or any other proxy.

**Acceptance Criteria:**

**Given** Story 9.4 matcher emits `contribution.confirmed` events when full match succeeds + Story 8.4 yellow-pill states
**When** the yellow → green flip is implemented
**Then** Story 9.4 emits `contribution.confirmed` with: `contribution_id`, `member_id`, `pool_id`, `alert_id`, `utr`, `confirmed_at`, `match_provenance` (which bank statement entry, idempotency key, matcher run); these events are append-only per Story 1.3
**And** the My Pool card (Story 8.2) transitions from yellow to green pill upon consuming `contribution.confirmed`; member receives push notification (Story 8.8 contribution-confirmed trigger)
**And** the live contributor list (Story 8.3) adds the member to the confirmed list

**Given** the **canonical financial-truth invariant** (this story's load-bearing commitment)
**When** any surface in the system queries "is this contribution confirmed?"
**Then** the **`contribution.confirmed` event (emitted by Story 9.4 matcher via this story) is the sole authority** — no other event type, no inferred status, no UTR-attestation alone, no pending-state, no yellow-pill state can serve as confirmation
**And** every downstream consumer (Story 8.3 contributor list, Story 9.12 PoolProgressCard, Sahyog Drive in Epic 11b, analytics aggregates in Epic 10, audit queries, regulatory exports) reads ONLY from the `contribution.confirmed` event-derived state
**And** a CI test asserts: (a) no API endpoint, no read model, no UI surface promotes any contribution to "confirmed" status without a corresponding `contribution.confirmed` event in the stream; (b) no analytics query counts yellow-pill or unconfirmed contributions toward "raised" / "confirmed" totals; (c) the canonical truth flows through Story 9.5 — alternate inference paths are structurally absent
**And** the canonical-truth boundary is documented in `architecture.md` as a load-bearing invariant; future stories needing "confirmed contribution" data must consume `contribution.confirmed` events, never reconstruct from inputs

**Given** the rare trustee-attested review-and-reverse path (Story 9.4 compensating event)
**When** a `contribution.confirmation.reversed` event lands
**Then** downstream surfaces correctly back out the confirmation; the My Pool card transitions back to a "held" pill state (Story 9.6 5-state) with member-visible audit reason; the contributor list removes the contributor

### Story 9.6: `<StatusPill>` 5-State Design System Component `[PRIMITIVE]`

As any surface displaying contribution status,
I want a `<StatusPill>` design system component implementing the 5-state taxonomy (yellow / green / red / grey / held) consistently across surfaces,
So that members see one visual language for contribution state regardless of surface.

**Acceptance Criteria:**

**Given** UX-DR21 + Story 1.17 `packages/ui` design system foundation
**When** `<StatusPill>` is authored as an extension of `packages/ui`
**Then** the component implements 5 states: (a) **yellow** — member self-attested via UTR but reconciliation hasn't matched yet (Story 8.4 yellow-pill); (b) **green** — Story 9.5 `contribution.confirmed` fired; (c) **red/umber** — mismatch detected (Story 9.7) requiring screenshot upload; (d) **grey** — no contribution yet (haven't attested); (e) **held** — confirmed contribution under trustee review-and-reverse (rare per Story 9.4 monotonic invariant)
**And** each state has documented copy, color tokens, icon, and ARIA label per Story 1.17; the 5 states cannot be silently extended without a design system PR
**And** semantic accessibility: pill is not color-only — text + icon + ARIA label all convey state to assistive tech

### Story 9.7: Mismatch Detection + Screenshot Upload + `<SelfVerifySurface>` Yellow-Stuck Recovery `[SURFACE]`

As Sushil whose yellow pill hasn't flipped to green within the expected window,
I want to upload a payment screenshot when matcher fails to confirm via UTR, and a self-verify recovery surface,
So that I have a path out of yellow-stuck states without depending purely on automated matching.

**Acceptance Criteria:**

**Given** FR-32 (screenshot upload mandatory only on mismatch — hidden in happy path) + UX-DR28
**When** the mismatch detection + recovery flow is implemented
**Then** the matcher (Story 9.4) emits a `contribution.mismatch-detected` event when: (a) UTR match fails despite attestation; (b) amount mismatch; (c) sender VPA mismatch; (d) no bank statement entry found within the expected window
**And** mismatch event triggers a push notification (via Story 8.8) + flips the member's pill from yellow to red/umber (Story 9.6); member is shown `<SelfVerifySurface>` with empathy copy explaining the mismatch
**And** screenshot upload is **mandatory only here** — hidden in happy path (per FR-32); member uploads PhonePe/GPay/PayTM screenshot showing the transaction; upload routes to reconciliation review queue (Story 9.8)
**And** Story 7.6 facilitated-recovery invariant applies: screenshot upload does NOT auto-confirm or silently remap; trustee review in Story 9.8 must resolve

### Story 9.8: Reconciliation Review Queue — Ordered by Alert-Deadline Proximity `[SURFACE]`

As a trustee or designated reconciliation reviewer,
I want a reconciliation review queue showing all mismatches + wrong-pool cases ordered by alert-deadline proximity,
So that I work the most time-sensitive cases first while preserving canonical financial-truth + facilitated-recovery invariants.

**Acceptance Criteria:**

**Given** FR-50 + Story 7.6 facilitated-recovery + Story 9.5 canonical financial-truth
**When** the review queue is implemented
**Then** the queue shows: mismatch cases (Story 9.7) + wrong-pool cases (Story 7.6) + screenshot uploads pending review; ordered by `alert_deadline_proximity` (closest deadline first)
**And** each case shows: member identity, attestation details, bank statement entries near the relevant date, screenshot if uploaded, contextual notes
**And** trustee actions: (a) confirm — emits `contribution.confirmed` event per Story 9.5 (the only confirmation path outside automated matcher); (b) reject — emits `contribution.invalid` event with reason-code; (c) facilitate-recovery — leaves case open with helpdesk routing per Story 7.6 (does NOT auto-remap or auto-confirm)
**And** all actions require step-up OTP (Story 5.9) + audit log line + reason-code

### Story 9.9: Dual Nominee Bank Accounts — RBI UPI Limit Workaround `[CONSUMER]`

As the disbursement layer (consumer of pool settlement),
I want dual nominee bank account support per the RBI UPI per-payee daily limit workaround,
So that disbursement isn't blocked when a single account hits the daily limit.

**Acceptance Criteria:**

**Given** FR-31 + Story 6.8 (claim-time dual nominee bank collection)
**When** disbursement is computed for a settled pool
**Then** if amount exceeds RBI UPI daily-per-payee limit, disbursement splits: first portion to nominee bank #1 up to limit; remainder to nominee bank #2; both linked to the same `pool_id + disbursement_id` audit chain
**And** if a single transaction fails, retry on the other nominee account; both accounts pre-validated at claim time per Story 6.8
**And** disbursement audit log records the full split + retry history

### Story 9.10: 4-Hour Retry Reminders `[CONSUMER]`

As Sushil whose UPI payment failed mid-cycle,
I want gentle 4-hour retry reminders that help me re-attempt the payment,
So that brief technical hiccups don't prevent my contribution.

**Acceptance Criteria:**

**Given** FR-35 `[v1-S]`
**When** the retry reminder is implemented
**Then** if a UPI Intent was fired (Story 8.4) but no UTR attestation arrived within ~4 hours, a single retry-reminder push (via Story 5.1 dispatcher with `category: deadline_reminder`, gentle copy) is sent
**And** the reminder is rate-limited per member; cost-optimization per Story 5.7 applies (suppressed if member has recent in-app engagement)

### Story 9.11: Over-Payment Facilitated Recovery `[GOVERNANCE]`

As a member who paid more than the fixed amount (rare),
I want over-payment recovery to be facilitated by helpdesk, never automated,
So that the canonical financial-truth + facilitated-recovery invariants are preserved.

**Acceptance Criteria:**

**Given** FR-36 `[v1-S]` + Story 7.6 facilitated-recovery + Story 9.5 canonical financial-truth
**When** the matcher (Story 9.4) detects an amount mismatch where actual > fixed
**Then** the over-payment is recorded as an `amount-mismatch (over)` invalid contribution; case routes to reconciliation review queue (Story 9.8)
**And** helpdesk operator + member discuss off-band: refund the difference, apply as next-cycle contribution credit (rare, requires trustee policy), or leave as donation; resolution audit-logged
**And** no automation moves the over-payment between pools or auto-credits the next cycle — every action is human-attested

### Story 9.12: `<PoolProgressCard>` Public/Member Surface `[SURFACE]`

As a member or visitor viewing pool progress,
I want a `<PoolProgressCard>` showing pool progress with confirmed-only counts (no yellow pill leakage),
So that the surface reflects financial truth per Story 9.5 canonical authority.

**Acceptance Criteria:**

**Given** UX-DR37 + Story 9.5 canonical financial truth + Story 8.3 reconciliation-confirmed-only visibility
**When** the `<PoolProgressCard>` is implemented in `packages/ui` (extends Story 1.17)
**Then** the card shows: pool letter + name (Story 7.2), confirmed contributor count (from `contribution.confirmed` events only), amount raised (confirmed amounts only), days remaining, fixed amount per contribution
**And** the card explicitly does NOT show: yellow-pill count, unconfirmed pending count, projected total based on attestations; these would violate Story 9.5 canonical authority + Story 8.3 visibility invariant
**And** the card consumes the same compound read model pattern as Story 4.7 admin surfaces — denormalized projection optimized for fast render

---

## Epic 10: Admin Operations Console — News/Blog, Helpdesk (first-class sub-epic), Bulk Ops, Reports, Feature Flags, Moderation

Trust staff and trustees do their daily ops work without WhatsApp chaos: publish news, run bulk operations, manage helpdesk tickets, pull reports, publish banners/popups, gate features per cohort, moderate members, set the fixed-amount with 12-month notice.

**Helpdesk first-class sub-epic (per Winston + Sprint Change Proposal Item 11):** FR-52 is architecturally distinct from telephony per §3.5a — own backend module, admin UI module, shared contracts, member-facing UI, routing-policy registry (rule-registry-driven), integration points (helpline call-to-ticket, claim cross-link, reconciliation cross-link, partner-module cross-link, validity-service read). Base ticketing substrate, SLA tracking, routing-policy registry, and member/admin surfaces must be independently demoable before downstream integrations are layered in.

**User Outcome:** Staff/trustees author News/Blog with audience scoping + scheduled publishing + per-post channel selection; helpdesk tickets route by category × scope with SLA tracking (24h first-response; 5/10 biz-day resolution); bulk ops support dry-run preview + per-item audit + scope-respecting + 5k-item-per-batch; reports render scope-respecting async exports; banners/popups manage with valid-from/until; feature flags gate per-cohort with audit + no-secret-flags + capability bar; member moderation audit-logged with reason codes.

**FRs:** FR-48 (permission delegation `[v1-S]`), FR-49 (bulk ops everywhere — dry-run + scope-respecting + audit per-item + 5k cap), FR-51 (News/Blog dual surface + author≠reviewer + scheduled publish + channel-per-post), **FR-52 (Helpdesk first-class subsystem)**, FR-54 (per-Pariwar custom fields JSONB), FR-55 (fixed-amount setter + 12mo announcement), FR-56 (member moderation), FR-57 (Trustee-Lite list + signals), FR-58 (survey/poll `[v1-S]`), FR-58A (reports & exports library), FR-58B (banner/popup manager), FR-58C (feature flags per cohort + capability bar).

**Anchoring ARs:** AR-31 (observability), AR-35 (operations runbook inventory), AR-46 (per-Pariwar configurability), **AR-47 (Helpdesk subsystem architecture §3.5a)**, AR-64 (feature-flag staged rollout).

**Cross-cutting consumption:** Epic 10 stories systematically consume Story 1.8 RBAC + Story 1.10 audit + Story 5.1 dispatcher + Story 1.9 admin auth + Story 1.16a-d CI gates.

**Demoable closure:** Trustee schedules a state-scoped News/Blog post; auto-publishes at scheduled time with audience-scoped rendering. Member files helpdesk ticket via member app; routing-policy routes to district admin scope; SLA timer starts; admin replies; member receives reply push. **Helpline call-to-ticket (SM-1 C3):** operator creates ticket on member's behalf with operator-name attribution. Bulk operation with dry-run preview applies to 100 members scope-respecting; error CSV downloadable. Feature flag flips DigiLocker hard-mandatory per Pariwar; canary cohort rolls; rollback on synthetic error spike (governance-boundary invariant verified — flag cannot bypass audit/consent/validity/RBAC).

**Dependencies:** Story 0.11 (operator shadowing) closed · Epic 1 (RBAC + audit + admin auth + CI gates) · Epic 3 (member state) · Epic 4 (Validity Service for ticket integration) · Epic 5 (channels for ticket reply push) · Epic 6 (claim cross-link) · Epic 9 (reconciliation cross-link).

**Story label legend:** `[PRIMITIVE]` · `[SURFACE]` · `[GOVERNANCE]` · `[CONSUMER]`.

### Story 10.1: Helpdesk Subsystem Data Model + Routing-Policy Registry `[PRIMITIVE]`

As Solo Builder authoring the first-class helpdesk subsystem,
I want the helpdesk data model + a registry-driven routing-policy primitive that deterministically routes tickets by category × scope,
So that routing decisions are reproducible, audit-replayable, and modifiable via policy registry (not engine code) per AR-47 §3.5a.

**Acceptance Criteria:**

**Given** FR-52 + AR-47 §3.5a + AR-46 per-Pariwar configurability registry
**When** the helpdesk subsystem is authored
**Then** modules exist at `apps/api/modules/helpdesk/`, `apps/admin/modules/helpdesk/`, `packages/contracts/helpdesk/`; member-facing UI integrates into `apps/member/modules/helpdesk/`
**And** ticket schema carries: `ticket_id`, `pariwar_id`, `subject_member_id` OR `subject_actor_id`, `category` (enum from registry), `subcategory` (registry-driven), `body`, `attachments[]`, `status` (open / in_progress / awaiting_member / resolved / closed), `routed_to_scope` (RBAC scope), `routed_to_actor_id` (nullable), `assigned_at`, `sla_first_response_due`, `sla_resolution_due`, `audit_id`, plus cross-link refs (`claim_case_id`, `pool_id`, `module_id`, `validity_lookup_id` — nullable per integration point)
**And** the routing-policy registry exposes: `(category, sub_category, member_scope_context) → (target_role, target_scope, sla_first_response, sla_resolution)` — entries are versioned + audit-logged per FR-7 / Story 2.3 pattern; categories include claim-related, contribution-related, KYC, technical, complaint, etc.

**Given** the **deterministic, audit-replayable routing-policy invariant** (this story's load-bearing commitment)
**When** a ticket is created with inputs `(category, sub_category, member_scope_context, routing-policy-version-at-creation)`
**Then** the routing decision is **deterministic** — same inputs produce same outputs every time across replays
**And** the routing decision is **audit-replayable** — the audit log records the inputs + the routing-policy version used + the resulting target role/scope; replaying the routing with the same inputs + same policy version produces identical routing
**And** policy registry changes are versioned: a routing-policy update creates a new version; existing tickets are NOT re-routed retroactively (they retain the routing under the policy version in force at ticket creation)
**And** a CI test asserts: same `(category, sub_category, member_scope_context)` produces same routing across replay runs; hash-map iteration order, async scheduling, or parallel execution cannot vary the routing outcome (analogous to Story 4.6 rule-order determinism)

**Given** Story 1.10 audit log
**When** any ticket is created or routed
**Then** an audit line records the routing decision with full inputs + policy version + outputs

### Story 10.2: Member-Facing Helpdesk Ticket Filing `[SURFACE]`

As a member needing trust support (claim question, contribution issue, KYC help, etc.),
I want to file a helpdesk ticket from the member app with category selection, free-text body, optional attachments, and visibility into status,
So that I have a structured path to help that doesn't require WhatsApp or phone.

**Acceptance Criteria:**

**Given** FR-52 + Story 10.1 helpdesk subsystem
**When** the member-facing ticket filing surface is implemented
**Then** the member selects a category (from registry — categories visible only when applicable to member context); enters subject + body; optionally attaches files; submits
**And** ticket creation calls Story 10.1's routing primitive; member sees routing target ("Your district admin will respond"); SLA timer is visible
**And** member inbox shows ticket status updates; replies surface via Story 5.1 dispatcher with category `helpdesk_reply`

**Given** UX-DR55 dignified copy + Story 0.11 operator shadowing findings
**When** the filing flow renders
**Then** category descriptions are member-friendly (Hindi-first per Story 2.1); attachment limits + file types are explicit; no jargon

### Story 10.3: Helpline Call-to-Ticket Operator Surface (SM-1 C3) `[SURFACE]`

As a helpdesk operator receiving an inbound call,
I want a surface to create a ticket on the member's behalf with member identification via FR-12A lookup + operator-name attribution + member-visible "we filed this for you" header,
So that callers without app access get the same structured support as app filers.

**Acceptance Criteria:**

**Given** SM-1 demo beat C3 + Story 10.1 routing-policy + Story 4.6 Validity Service lookup
**When** the operator surface is implemented
**Then** the operator identifies the member via Story 6.3-style `<MemberLookupForm>` (scope-respecting); selects category, captures member's stated issue verbally as the body; submits
**And** ticket is created with `created_via: helpline_call`, `operator_attribution: <operator_id>`, routing decision per Story 10.1
**And** the ticket appears in the member's app inbox with a "We filed this for you — Operator [Name]" header; reply round-trip works identically to member-initiated tickets

### Story 10.4: Helpdesk Admin Console + SLA Tracking + Cross-Link Integration `[SURFACE]`

As a District Admin or designated helpdesk responder,
I want a helpdesk admin console with SLA tracking + cross-link integration into claim / reconciliation / partner-module / validity-service contexts,
So that I can resolve tickets efficiently with full context from the rest of the system.

**Acceptance Criteria:**

**Given** FR-52 + AR-47 + Story 10.1 helpdesk subsystem
**When** the admin console is implemented
**Then** the console shows my queue (scope-respecting), per-ticket SLA timers (24h first-response; 5/10 biz-day resolution), severity, and cross-link badges (claim, reconciliation, partner-module, validity-service when applicable)
**And** cross-link integration: when a ticket carries a claim cross-link, the admin can navigate to Story 6.10 verifier console for that claim; reconciliation cross-link → Story 9.8 review queue case; partner-module cross-link → Story 12.x module lead; validity-service cross-link → Story 4.7 MemberStatusPanel
**And** SLA breaches surface alerts; SLA timers stop when status transitions to `awaiting_member` or `resolved`

### Story 10.5: News/Blog Dual Surface + Author ≠ Reviewer + Scheduled Publish + Channel-Per-Post `[SURFACE]`

As a Pariwar admin or trustee authoring member-facing announcements,
I want a News/Blog admin surface with audience scoping + author ≠ reviewer enforcement + scheduled publishing + per-post channel selection,
So that member-visible content goes through procedural-fairness review before publish and dispatches via the right channels.

**Acceptance Criteria:**

**Given** FR-51 + Story 2.2 tone-review process + Story 1.8 RBAC + Story 5.1 dispatcher
**When** the News/Blog admin surface is implemented
**Then** posts carry: `title`, `body_markdown`, `audience_scope` (`public | members-all | state | role | cohort`), `scheduled_publish_at`, `channels[]` (in_app | wa | sms | email — per-post selectable), `author_actor_id`, `reviewer_actor_id` (nullable until submitted), `status` (draft / submitted / approved / scheduled / published)
**And** the **author ≠ reviewer enforcement** is at the API layer: `submit_for_review(post_id, reviewer_id)` rejects with 403 if `reviewer_id == author_id`; similarly `approve(post_id)` rejects if approving actor is the author
**And** tone-review (Story 2.2) must record sign-off before approval; scheduled publishing fires the publish action at the scheduled time via pg-boss
**And** channel dispatch on publish: for each member in scope, dispatches via Story 5.1 with category `alert_published` (re-purposed for general announcements) on selected channels

### Story 10.6: Bulk Operations Framework — Dry-Run + Scope-Respecting + Audit Per-Item + 5k Cap + Dry-Run Parity Invariant `[PRIMITIVE]`

As Solo Builder authoring the bulk operations primitive that admin surfaces consume,
I want a bulk operations framework with dry-run preview + scope-respecting + audit-per-item + 5k-item-per-batch cap + dry-run parity invariant,
So that every bulk admin action is previewable + auditable + scope-safe + capacity-bounded.

**Acceptance Criteria:**

**Given** FR-49 + Story 1.8 RBAC + Story 1.10 audit
**When** the bulk operations framework is authored
**Then** the framework exposes `bulkExecute(operation_type, target_set, dry_run: boolean)` — supports operations like `bulk_send_notification`, `bulk_moderate`, `bulk_update_custom_field`, etc.
**And** dry-run preview returns: per-item evaluation result (would succeed / would fail / skipped with reason); aggregate counts; downloadable preview CSV
**And** scope-respecting: each item in the target set is RBAC-validated against the actor's scope (Story 1.8); items outside scope are skipped with explicit reason
**And** audit per-item: every executed item produces an audit log line via Story 1.10
**And** **5k-item-per-batch cap** is enforced at the API layer; larger sets must be split; if the operation exceeds 5k items it fails with a clear message + counts; this cap prevents accidental mega-operations
**And** error CSV is downloadable on completion (items that failed with reason)

**Given** the **dry-run parity invariant** (this story's load-bearing commitment)
**When** dry-run preview and execute run on the same target set
**Then** **dry-run preview and execute share identical evaluation semantics** — the same RBAC checks, the same operation logic, the same item-level outcomes
**And** the only acceptable divergence between preview and execute is **explicitly surfaced concurrent-state changes** that happened between preview-time and execute-time (e.g., a member's state changed, a permission was revoked, an item was deleted)
**And** any such divergence is surfaced explicitly to the operator: the execute result identifies items where the preview prediction diverged from the execute outcome + the reason (concurrent state change details)
**And** the implementation pattern: dry-run and execute share the same evaluator function — a CI test asserts byte-identical evaluator output for the same inputs at a fixed point in time
**And** silent divergence between preview and execute is structurally impossible: an item appearing to succeed in preview but quietly failing in execute (without surfacing the reason) fails the test

### Story 10.7: Reports & Exports Library — Async Generation + Scope-Respecting `[SURFACE]`

As a Pariwar admin or trustee needing data exports for reporting / audit / regulator submission,
I want a reports & exports library with async generation + scope-respecting output + standard formats (CSV, JSON),
So that I can pull data without crashing the system or leaking out-of-scope rows.

**Acceptance Criteria:**

**Given** FR-58A + Story 1.12 pg-boss + Story 1.8 RBAC
**When** the reports library is implemented
**Then** standard report templates exist (member roster, contribution history, claim outcomes, helpdesk stats, etc.); custom queries gated by RBAC
**And** report generation runs as a pg-boss job (async); large reports take minutes; member receives a notification when ready
**And** output is scope-respecting — every row is RBAC-validated; out-of-scope rows excluded
**And** export formats: CSV + JSON; downloadable URL is one-time-use, time-limited (24h), authenticated; PII fields are masked per AR-12 PII tier unless the requestor's RBAC scope permits

### Story 10.8: Feature Flags Per Cohort + Capability Bar + Governance-Boundary Invariant `[PRIMITIVE]`

As Solo Builder authoring the feature-flag primitive,
I want feature flags per cohort with a capability bar (Sprint Change Proposal Item 9) + governance-boundary invariant that flags cannot bypass frozen governance controls,
So that staged rollout is safe and architectural invariants are preserved across all flag states.

**Acceptance Criteria:**

**Given** FR-58C + AR-64 + Sprint Change Proposal Item 9 + architectural-freeze table
**When** the feature-flag primitive is authored
**Then** flags carry: `flag_key`, `pariwar_id` (or null for global), `cohort_definition` (rule expression evaluable against member context), `state` (`off | canary | rollout | full | rolled_back`), `audit_id`, `effective_from`, `effective_until`, `actor_who_flipped`
**And** the **capability bar** lists which behaviors are flag-toggleable (e.g., DigiLocker hard-mandatory, alternative KYC provider, beta UX patterns) — only behaviors in the capability bar are flag-controllable; "secret flags" are prohibited
**And** every flag change is audit-logged via Story 1.10; canary rollout supports synthetic-error-spike detection + automatic rollback
**And** flag evaluation is deterministic + cached per Story 4.8 pattern; staged rollout cadence is configurable

**Given** the **governance-boundary invariant** (this story's load-bearing commitment)
**When** any feature flag is defined or evaluated
**Then** **feature flags cannot bypass audit, consent, validity, RBAC, or any other frozen governance controls**
**And** explicitly prohibited flag-toggleable behaviors: (a) disabling audit logging for an action; (b) bypassing Story 2.7 consent checks; (c) overriding Validity Service eligibility decisions (Story 4.6); (d) escalating actor permissions beyond RBAC scope (Story 1.8); (e) altering any architectural freeze table row; (f) disabling Story 1.16a-d CI gates; (g) bypassing the canonical financial-truth invariant (Story 9.5) or any other load-bearing invariant
**And** a CI test asserts: the flag definitions are checked against an `governance_boundary.yaml` allowlist of flag-toggleable behaviors; any flag attempting to control a prohibited behavior fails the test
**And** the capability bar is itself a governance artifact — additions to the capability bar require trustee-attested PRs with explicit rationale; the bar cannot be silently expanded
**And** flag-evaluation code paths cannot disable surrounding audit logging — the audit log records the flag's state at evaluation time + the resulting branch

### Story 10.9: Banner/Popup Manager — Valid-From/Until + Dismiss `[SURFACE]`

As a Pariwar admin or trustee surfacing time-bounded communications (e.g., Niyamavali amendment notice, system maintenance window),
I want a banner/popup manager with valid-from/until + dismissible behavior,
So that timely messages reach members without permanent UI clutter.

**Acceptance Criteria:**

**Given** FR-58B + Story 5.1 channel dispatcher (banners are in-app, not channel-dispatched)
**When** the banner/popup manager is implemented
**Then** banners carry: `title`, `body`, `audience_scope`, `valid_from`, `valid_until`, `dismissible` (boolean), `severity` (info | warning | critical), `created_by_actor`
**And** member's app respects valid-from/until + per-member dismiss state; dismissed banners don't re-appear unless updated
**And** admin UI shows banner schedule + preview; tone-review (Story 2.2) applies for member-visible copy

### Story 10.10: Member Moderation — Suspend / Terminate / Restore + Reason Codes `[SURFACE]`

As a State Trustee with `member.moderate` permission,
I want to suspend, terminate, or restore members with structured reason codes + audit log,
So that abuse / fraud / regulatory issues can be addressed with full traceability.

**Acceptance Criteria:**

**Given** FR-56 + Story 1.8 RBAC + Story 1.10 audit + Story 3.1 lifecycle state machine
**When** the moderation surface is implemented
**Then** moderation actions emit events on the member's stream: `member.moderation.suspended`, `member.moderation.terminated`, `member.moderation.restored`; member state machine transitions accordingly
**And** structured reason codes are registry-driven (`fraud`, `concealment`, `regulator-action`, `voluntary-pending-review`, etc.); free-text rationale required + audit-logged
**And** step-up OTP required (Story 5.9); member receives notification per Story 5.1
**And** moderation actions respect the §1.14 event-derivation invariant — state changes flow through events, not direct UPDATEs

### Story 10.11: Trustee-Lite List + Signals `[SURFACE]`

As a Trustee at the Pariwar / State level,
I want a list + signals view (v1 alternative to Kanban) showing trustee-attention-required items across claim / appeal / R9 voting / concealment / moderation,
So that I can see at a glance what needs my attention without juggling multiple consoles.

**Acceptance Criteria:**

**Given** FR-57 + Story 4.7 MemberStatusPanel pattern (compound read model)
**When** the Trustee-Lite list + signals view is implemented
**Then** the view aggregates: pending State Trustee cycle-freeze approvals (Story 6.13), R9 voting queues (Story 6.14), 3-stage appeal cases at the trustee's scope (Story 6.16), concealment-flagged claims (Story 6.15), reconciliation review queue items (Story 9.8) at trustee's scope, moderation pending items (Story 10.10)
**And** items are sorted by deadline-proximity; per-item signals show category + age + severity + cross-link to the canonical surface for the item
**And** the surface is scope-respecting via Story 1.8

### Story 10.12: Per-Pariwar Custom Fields JSONB `[PRIMITIVE]`

As Solo Builder authoring extensibility for Pariwar-specific data needs,
I want a per-Pariwar custom-fields JSONB pattern (AR-46 registry-driven),
So that Pariwars can collect Pariwar-specific data without engine changes.

**Acceptance Criteria:**

**Given** FR-54 + AR-46 per-Pariwar configurability registry + AR-7 per-tenant JSONB
**When** the custom-fields pattern is authored
**Then** the `pariwar_custom_field_definitions` registry stores per-Pariwar JSONB schemas (e.g., a Pariwar can add an "alternate ID number" field to members); admin UI authors these per Pariwar
**And** member records carry a `custom_fields` JSONB column whose shape is validated against the Pariwar's registry at write time
**And** custom fields are NOT permitted to violate frozen governance (e.g., adding a `payout_destinations` field is rejected by Story 1.16c CI gate)

### Story 10.13: Fixed-Amount Setter Admin UI `[SURFACE]`

As a Trustee Panel using the admin UI to schedule a fixed-amount change,
I want a setter UI that consumes Story 7.5's 12-month notice workflow + emergency adjustment override,
So that the operation is admin-friendly and emits the right audit + notification flows.

**Acceptance Criteria:**

**Given** FR-55 + Story 7.5 (the workflow itself lives there)
**When** the setter admin UI is implemented
**Then** the UI lets trustees: (a) propose a fixed-amount change with `effective_from` (validated ≥ today + 365 days for standard changes); (b) trigger emergency override path with required attestations
**And** the UI shows current + scheduled values; audit trail of past changes; submitting fires Story 7.5's workflow
**And** scope-respecting via Story 1.8

### Story 10.14: Permission Delegation `[SURFACE]`

As a Pariwar admin delegating limited authority,
I want a permission-delegation surface to grant time-bounded permissions to another actor,
So that vacation coverage / role transitions / emergency handoffs work without permanent role changes.

**Acceptance Criteria:**

**Given** FR-48 `[v1-S]` + Story 1.8 RBAC
**When** the permission-delegation surface is implemented
**Then** an admin can delegate a subset of their permissions to another actor (within their own scope, never above); delegations carry: `delegator_actor_id`, `delegatee_actor_id`, `permission_keys[]`, `scope`, `valid_from`, `valid_until`, `reason`, `audit_id`
**And** delegations are time-bounded (max 90 days; configurable); audit-logged; revocable
**And** the delegatee's effective permissions at any moment = their own + active delegations; permission checks (Story 1.8) read both

### Story 10.15: Survey/Poll `[SURFACE]`

As a Pariwar admin or trustee gathering member input,
I want a survey/poll surface to author questions, scope the audience, collect responses,
So that member feedback flows into product / policy decisions structurally.

**Acceptance Criteria:**

**Given** FR-58 `[v1-S]`
**When** the survey/poll surface is implemented
**Then** the admin authors a survey with: title, questions (multiple choice / free text), audience scope, valid-from/until; member receives notification via Story 5.1 + answers in-app
**And** responses are scope-respecting; aggregate analytics surface in admin UI; raw PII-shielded
**And** simple v1; full analytics deferred to v2

---

## Epic 11a: Public Trust Identity Shell (parallel to Epic 3)

**Institutional transparency framing (load-bearing for Epic 11a + 11b):** TWT transparency emphasizes **operational and governance visibility** rather than unrestricted public exposure of member identities. Public trust is established through auditability, published rules, contribution transparency, and accountable governance — **NOT** mass exposure of personal data. This framing governs every visibility decision in Epic 11a + 11b.

**User Outcome:** A non-member visitor lands on twt.org from a search result and sees a *real trust*: branded shell with Hindi-default copy, public Niyamavali (Story 2.5), public T&C (Story 2.6), paginated Member Directory with tiered visibility (first-name + last-initial + district only at public tier), phone/email obfuscation on public surfaces. The 4-tier Public-vs-Private matrix is codified here per surface and consumed by Story 1.16b CI gate. Authenticated members see richer Member Directory (full name + district + block + school/office + pool participation) under anti-enumeration safeguards. Operator-restricted fields visible only to staff with appropriate RBAC.

**FRs:** FR-74 (4-tier visibility matrix codified per surface; CI gate runs in Epic 1) · FR-75 (Member Directory PII-shielded per tiered render scope) · FR-93 (phone/email obfuscation defense-in-depth on public surfaces only `[v1-S]`).

**Anchoring ARs:** AR-48 (cross-surface composition contract — foundation initialized in Story 2.5; extended here with Member Directory + 4-tier matrix population).

**UX-DR anchors:** UX-DR15 (`<NoticeboardStrip>`) · UX-DR16 (`<PinnedNotice>`).

**Demoable closure:** Public site renders branded shell + Hindi/English toggle + Niyamavali + T&C + paginated Member Directory with tiered visibility + obfuscated contact surfaces on public tier. Authenticated member sees richer directory under anti-enumeration safeguards. CI scrape-test passes for matrix entries codified so far. Search-result visitor experiences a real trust before claim/pool/reconciliation surfaces exist.

**Dependencies:** Epic 1 (substrate + Story 1.8 RBAC + Story 1.10 audit + Story 1.14 rate-limit + Story 1.16b PII scrape CI + Story 1.17 design system) · Epic 2 (Story 2.5 Astro shell foundation + Niyamavali + T&C) · Epic 3 (Member Directory data — name + district + block + school).

**Story label legend:** `[PRIMITIVE]` · `[SURFACE]` · `[GOVERNANCE]` · `[CONSUMER]`.

### Story 11a.1: 4-Tier Visibility Matrix Codified per Surface — Public-vs-Private Replacement `[GOVERNANCE]`

As Solo Builder authoring the foundational visibility-classification primitive,
I want a **tiered visibility matrix** (`public | authenticated_member | operator_restricted | never_exposed`) codified per surface and per renderable field, versioned in git, consumed by Story 1.16b CI gate, with search-engine indexing policy declared per surface,
So that every visibility decision in every Epic 11 surface (and downstream) reads from a single canonical classification — not from ad-hoc per-surface judgment.

**Acceptance Criteria:**

**Given** FR-74 + Story 1.16b PII scrape CI gate consumer + architectural-freeze table (FR-74 CI gate row)
**When** the visibility matrix is codified
**Then** the matrix file `public-vs-private-matrix.yaml` lives in `packages/contracts/public-pages/`; per-surface, per-field entries declare one of the **4 tiers**:
  - **`public`** — Internet-visible without authentication (anyone with the URL)
  - **`authenticated_member`** — Visible only to logged-in members (Story 1.9 admin auth or Story 3.2 member auth)
  - **`operator_restricted`** — Visible only to staff/trustees/admins with appropriate RBAC scope (Story 1.8)
  - **`never_exposed`** — Never rendered on any surface (e.g., Aadhaar, bank details by default; covered by PII tier encryption Story 1.5)
**And** the matrix is comprehensive across all v1 surfaces: Niyamavali page (Story 2.5), T&C (Story 2.6), Member Directory (Story 11a.3), future Sahyog Drive (Epic 11b), Sahyog Vivran per-claim (Epic 11b), In Memoriam (Epic 11b), any future public/authenticated surface
**And** matrix entries are **versioned in git** — additions, modifications, or visibility escalations (e.g., moving a field from `authenticated_member` → `public`) require **trustee-attested PR approval** with explicit rationale; PR template includes a "why is this visibility increase justified?" field; multiple trustee sign-offs required

**Given** the **tiered visibility classification invariant** (this story's load-bearing commitment, per user direction)
**When** any new field or surface is added to the system
**Then** **visibility classification is tiered rather than binary** — every renderable field and surface must declare one of the 4 tiers
**And** visibility escalation between tiers (e.g., `operator_restricted` → `authenticated_member` → `public`) requires trustee-attested matrix changes + CI validation
**And** the implementation pattern: the matrix is the **single canonical source of visibility truth** — surfaces query `getVisibility(surface_id, field_id, viewer_context)` and render accordingly; no surface may render a field at a higher tier than its matrix declaration
**And** a CI test (extending Story 1.16b) asserts: every API response + every rendered surface respects the matrix tier for the viewer's context; mixing tiers within a single surface render fails the test
**And** the philosophical commitment is documented: TWT's transparency model emphasizes **operational and governance visibility (auditability, published rules, contribution transparency, accountable governance)** — not unrestricted public exposure of member identities; the tier model encodes this commitment

**Given** the **search-engine indexing governance** (per user direction)
**When** any public surface is declared
**Then** the matrix entry includes a per-surface `search_indexing_policy` field with one of: `index | noindex | conditional`
**And** Member Directory pages default to `noindex` posture unless explicit trustee approval changes the policy; Niyamavali + T&C default to `index` (institutional content); per-claim Sahyog Vivran defaults to `noindex` (consent-gated)
**And** Cloudflare + Story 1.14 honeypot routes serve `X-Robots-Tag: noindex, nofollow` to enforce the per-surface policy; conflicts between server-side noindex and matrix declarations fail CI

**Given** any surface render under any viewer context
**When** Story 1.16b CI scrape-test runs
**Then** it consumes the matrix and verifies: (a) `never_exposed` fields appear on NO surface; (b) `operator_restricted` fields don't appear on member-authenticated or public renders; (c) `authenticated_member` fields don't appear on public renders; (d) `public` fields are renderable everywhere

### Story 11a.2: Public Astro SSR Shell Extension for Member Directory + Tiered Visibility Renderers `[PRIMITIVE]`

As Solo Builder extending the Story 2.5 Astro shell foundation,
I want the public Astro shell extended to support tiered visibility renderers + Member Directory routing + authenticated-fragment composition contract (which 11b will further extend with per-claim fragments),
So that Epic 11a surfaces consume the same shell foundation and the matrix-driven tier rendering is structurally consistent.

**Acceptance Criteria:**

**Given** Story 2.5 Astro SSR shell foundation + AR-48 composition contract + Story 11a.1 matrix
**When** the shell extension is authored
**Then** the shell exposes a tiered-rendering helper: `<MatrixField surface={...} field={...} viewerContext={...} />` that queries the matrix and renders the field at the appropriate tier (or omits it entirely if not visible at the viewer's tier)
**And** the authenticated-fragment composition pattern is established (foundation for 11b extension): public shell can include `<AuthenticatedFragment>` slots that render server-side when the viewer is authenticated, hydrating only the required data; cache-safe for unauthenticated viewers
**And** routes are added for Member Directory (`/members`) with pagination support; route handler reads the matrix to determine which tier the current viewer can see
**And** Cloudflare edge cache TTL respects the cache-safe contract — only `public`-tier rendered content is edge-cacheable; `authenticated_member` and `operator_restricted` content bypass edge cache

### Story 11a.3: Member Directory PII-Shielded — Tiered Render Scope + Anti-Enumeration Safeguards `[SURFACE]`

As any visitor to the Member Directory,
I want a paginated Member Directory rendered at my appropriate visibility tier with anti-enumeration safeguards + auditability for sensitive access patterns,
So that the directory supports institutional legitimacy and trust verification without becoming a social-network discovery tool, harvesting target, or social-graph mapping surface.

**Acceptance Criteria:**

**Given** FR-75 + Story 11a.1 matrix + Story 11a.2 shell extension + Story 1.14 rate-limiting + Story 1.10 audit
**When** the Member Directory is implemented
**Then** the **tiered render scope** is enforced per the matrix:

| Field | `public` tier | `authenticated_member` tier | `operator_restricted` tier |
|---|---|---|---|
| First-name + last-initial | ✓ | ✓ | ✓ |
| Full name | ✗ | ✓ | ✓ |
| District | ✓ | ✓ | ✓ |
| Block | ✗ | ✓ | ✓ |
| School / Office | ✗ | ✓ | ✓ |
| Member-status pill (limited: active / lock-in only — never PII) | ✓ (limited) | ✓ | ✓ |
| Pool participation | ✗ | ✓ | ✓ |
| Registration date | ✗ | Limited | ✓ |
| Mobile number | ✗ | ✗ (restricted/role-aware via operator escalation) | ✓ (role-aware) |
| Email | ✗ | ✗ | ✓ (role-aware) |
| Aadhaar | Never | Never | Never |
| Bank details | Never | Never | Never |
| Nominee details | Never | Never | Operator-restricted only |

**And** pagination is mandatory (Story 1.14 forced pagination); per-page cap; deep-pagination prohibited beyond a reasonable horizon

**Given** the **anti-enumeration safeguards invariant** (this story's load-bearing commitment, per user direction)
**When** authenticated members access the directory
**Then** **anti-enumeration protections include**:
  - **Query throttling** — per-member query rate limits (e.g., max N queries/min); excessive query rates trip throttling + audit log line
  - **Pagination caps** — page size capped (e.g., 25 entries/page); deep-pagination beyond a horizon (e.g., 200 pages) prohibited; cursor-based pagination with non-guessable cursors
  - **Audit logging for sensitive lookups** — high-volume lookups, repeated district-wide queries, member enumeration behavior all audit-logged via Story 1.10 with the viewer actor + query context
  - **Rate limiting** — additional per-IP + per-session rate limits beyond per-member; abuse-detected accounts trigger temporary suspension + trustee review
  - **Bulk-export prohibition** — bulk download / CSV export of member-directory data **PROHIBITED outside explicitly authorized operator workflows** (Story 10.7 reports library, scope-respecting + audit-logged); the directory UI offers no "download all" affordance to non-operator viewers
  - **Scraper/rate-limit controls even for authenticated users** — authenticated session does NOT bypass rate limits; per-session rate limits + scraper-detection heuristics apply

**And** sensitive authenticated-directory access patterns (high-volume lookups, repeated district-wide queries, member-enumeration behavior — defined as triggers in `directory-abuse-rules.yaml`) are **audit-visible and abuse-detectable**; operations team surfaces abuse signals in admin console

**Given** the **"member directory is legitimacy surface, not social graph" invariant** (this story's load-bearing commitment, per user direction)
**When** any future feature is considered for the Member Directory
**Then** the directory's **purpose is institutional legitimacy and trust verification** — NOT social-network discovery, relationship mapping, or unrestricted member exploration
**And** the following are **explicitly prohibited** as design directions: (a) friend-finder behavior (suggest connections, social graph proximity); (b) social graphing (visualization of member relationships, network maps); (c) engagement gamification (badges for "members met", "directory streaks"); (d) recommendation engines that surface "members you might know"; (e) features that incentivize repeated member-discovery sessions
**And** acceptable directions for evolution: better search/filter for legitimate trust-verification needs, accessibility improvements, performance optimization, additional tier-respecting fields with trustee-attested matrix updates
**And** new feature proposals for the Member Directory must explicitly answer "does this serve institutional legitimacy or trust verification?" — if the answer is "engagement" or "social discovery", the proposal is rejected at design time

**Given** the inherited accessibility gate (Story 0.10 P0-2c)
**When** the directory renders for assistive-tech users
**Then** semantic structure, ARIA labels, keyboard navigation all per Story 1.17 design system

### Story 11a.4: Phone/Email Obfuscation Defense-in-Depth — Public Surfaces Only `[GOVERNANCE]`

As Solo Builder authoring contact-information protection,
I want phone/email obfuscation on public surfaces only, with the explicit invariant that **obfuscation is defense-in-depth, never primary protection** — sensitive fields remain hidden by matrix-governed visibility classification first, obfuscation second,
So that the architecture's protection layering is clear: matrix governs visibility, obfuscation hardens public surfaces against scraping.

**Acceptance Criteria:**

**Given** FR-93 `[v1-S]` + Story 11a.1 matrix + Story 1.16b CI scrape-test
**When** the obfuscation defense-in-depth is implemented
**Then** on **public surfaces** that legitimately render phone/email (e.g., helpline contact, footer), all three protections apply: (a) no plain-text render in HTML source (image rendering OR JS-decoded display OR partial masking with helpdesk CTA); (b) CI scrape-test (Story 1.16b) detects naked phone/email patterns in public HTML render — failing CI on any leak; (c) honeypot scraper-detection routes serve fake contact data + flag scraping IPs for rate-limiting
**And** the obfuscation patterns are documented and consistent across public surfaces

**Given** the **obfuscation-as-defense-in-depth invariant** (this story's load-bearing commitment, per user direction)
**When** authenticated-member or operator-restricted surfaces render phone/email
**Then** **obfuscation does NOT substitute for matrix-governed visibility classification** — sensitive fields remain hidden by policy first, obfuscation second
**And** authenticated-member surfaces protecting phone/email rely on the **primary protection layers**: (a) Story 1.8 RBAC + scope; (b) Story 11a.1 visibility-tier matrix; (c) Story 1.14 rate limits; (d) Story 1.10 audit logging; (e) Story 10.6 query throttling; (f) abuse detection
**And** plain-text rendering of phone/email **IS permitted on authenticated-member surfaces** for legitimate operator workflows (e.g., a District Admin viewing a member's contact info to call them about a claim) — because matrix-governed RBAC has already gated the access; obfuscation would add no protection at that point
**And** the invariant prevents future engineering errors: obfuscating fields on authenticated surfaces while neglecting matrix entry / RBAC enforcement is **explicitly wrong** — protection must come from policy first

**Given** the architectural commitment is documented
**When** the protection-layering decision matrix is reviewed
**Then** the order is: (1) `never_exposed` fields are hidden by matrix; (2) `operator_restricted` fields require RBAC + audit + rate limits; (3) `authenticated_member` fields require auth + rate limits + audit; (4) `public` fields render visibly, with obfuscation as defense-in-depth where applicable

### Story 11a.5: `<NoticeboardStrip>` Foundational Layout Component `[PRIMITIVE]`

As any public or authenticated surface needing to display a strip of important notices,
I want a `<NoticeboardStrip>` design system component (extends Story 1.17) for rendering announcement strips,
So that announcement-rendering is consistent across surfaces.

**Acceptance Criteria:**

**Given** UX-DR15 + Story 1.17 design system foundation
**When** `<NoticeboardStrip>` is authored as an extension of `packages/ui`
**Then** the component renders a horizontal or vertical strip of notice items with: title, body, severity (info / warning / critical), dismissible state, link CTA
**And** the component consumes Story 10.9 banner/popup data; respects tier visibility (some notices public, others authenticated only)
**And** semantic accessibility per Story 1.17 design system

### Story 11a.6: `<PinnedNotice>` Component `[PRIMITIVE]`

As any surface needing to render a persistent pinned notice above the fold,
I want a `<PinnedNotice>` design system component for high-visibility persistent announcements,
So that critical communications stay visible until acknowledged.

**Acceptance Criteria:**

**Given** UX-DR16 + Story 1.17 design system foundation
**When** `<PinnedNotice>` is authored as an extension of `packages/ui`
**Then** the component renders a persistent pinned banner above the fold with: title, body, severity, dismiss-with-ack pattern (only acknowledged after explicit user action)
**And** the component respects Story 11a.1 matrix tier — public-tier pinned notices visible to all; authenticated-tier visible only to logged-in members
**And** semantic accessibility per Story 1.17 design system

---

## Epic 11b: Memorial + Sahyog Drive (post-Epic 9, Phase 4)

**Memorial in Phase 4 — Sally holding the line.** A rushed Shradhanjali surface is worse than a delayed one. Sahyog Vivran lives here. AR-48 final extension: per-claim authenticated-fragment registry.

**FRs:** FR-76, FR-77, FR-78.

**Anchoring ARs:** AR-48 (per-claim authenticated-fragment registry — final extension).

**UX-DR anchors:** UX-DR13, UX-DR14, UX-DR17, UX-DR18, UX-DR19, UX-DR20, UX-DR38, UX-DR69, UX-DR70.

**Inherits Epic 11a institutional-transparency framing + 4-tier matrix + anti-enumeration patterns.** Consent gating (Story 6.9 `sahyog_vivran_publication` + `in_memoriam_listing`) governs publication; revocation propagates within cache-safe window.

**Demoable closure:** Sahyog Drive Active + Archive renders publicly (search supports remembrance, not analytics); Sahyog Vivran per-claim publishes after reconciliation settles (financial truth from Epic 9 canonical events only); In Memoriam respectful + consent-revocable; family-authored memorial preserved-not-rewritten; Real Data Test + Accessibility audit gates pass.

**Dependencies:** Epic 11a (shell + 4-tier matrix + composition contract) · Story 0.9 closed · Epic 6 (claim approval + Story 6.16 reversed-denial hook + Story 6.9 consent) · Epic 7 (pool) · Epic 8 (contribution events) · Epic 9 (reconciliation settled + Story 9.5 canonical financial-truth events).

**Story label legend:** `[PRIMITIVE]` · `[SURFACE]` · `[GOVERNANCE]` · `[CONSUMER]`.

### Story 11b.1: Sahyog Drive Active + Archive — Searchable, Paginated, No Bulk Export + Remembrance-Not-Analytics Invariant `[SURFACE]`

As a non-member visitor or authenticated member browsing the trust's drive activity,
I want a Sahyog Drive Active + Archive page showing currently-live and historical pools — searchable + paginated + with explicit no-bulk-export + remembrance-focused framing,
So that the surface supports trust transparency and claim discoverability without becoming a leaderboard or contribution gamification platform.

**Acceptance Criteria:**

**Given** FR-76 + Story 11a.1 4-tier visibility matrix + Story 11a.3 anti-enumeration patterns
**When** Sahyog Drive Active + Archive is implemented
**Then** Active drive shows currently-live pools (closed but not yet settled); Archive shows historical settled pools; both surfaces are paginated with caps per Story 11a.3 (max page size, no deep-pagination beyond reasonable horizon)
**And** search supports finding pools by deceased member's name (matrix-tier respecting — public visitor sees first-name + last-initial; authenticated sees fuller per Story 11a.3 directory), district, date range
**And** per-pool entries show confirmed contribution count (canonical financial-truth from Story 9.5 only), pool name (Story 7.2 dual identifier), nominee family identifier (matrix-tier respecting), close-of-cycle framing (Pool-Reality #2 per Story 7.8 — no shortfall narrative)

**Given** the **"no bulk export" inheritance from Story 11a.3 anti-enumeration**
**When** any visitor accesses Sahyog Drive
**Then** no "download all" affordance exists; no CSV export at any tier; pagination caps + rate limits per Story 11a.3 apply identically; bulk export of any aggregate data is **available only via Story 10.7 operator-restricted reports library with audit-log line**
**And** scraper-detection heuristics apply (rapid pagination, deep crawl patterns, repeated query patterns) per Story 11a.3 patterns

**Given** the **"search supports remembrance, not analytics" invariant** (this story's load-bearing commitment, per user direction)
**When** any future feature is considered for Sahyog Drive search or archive
**Then** Sahyog Drive search and archive behaviors exist **to support remembrance, transparency, and claim discoverability** — NOT engagement optimization, contributor ranking, or social-performance gamification
**And** the following are **explicitly prohibited** as design directions: (a) contributor leaderboards (ranking members by amount given); (b) rankings (top contributors, frequent contributors, "supporter of the month"); (c) gamification (badges, streaks, "contribution achievements"); (d) social-performance metrics (most "supportive" district, public scoreboards); (e) popularity-style metrics (most-viewed memorial, trending pools)
**And** acceptable directions for evolution: better discoverability for legitimate trust verification, search by date/district for historical research, accessibility improvements, performance optimization
**And** new feature proposals for Sahyog Drive must explicitly answer: "does this serve remembrance / transparency / claim discoverability?" — if the answer is "engagement", "ranking", or "social performance", the proposal is rejected at design time
**And** the Archive's framing is consistent with Story 7.8 Pool-Reality #2: surfaces celebrate solidarity, not shortfall; no comparison-to-target framing in any aggregate

### Story 11b.2: ContributionList Components — Table (50k-row Desktop) + Mobile Row (10k Contract) `[PRIMITIVE]`

As any Sahyog Drive / Sahyog Vivran / member-facing surface displaying lists of confirmed contributors,
I want `<ContributionListTable>` (50k-row desktop) and `<ContributionListMobileRow>` (10k-row mobile) virtualized components extending Story 1.17,
So that performance contracts (60fps target / 30fps minimum on entry-level Android, scroll smoothness on 50k desktop rows) are honored across consumer surfaces.

**Acceptance Criteria:**

**Given** UX-DR13 + UX-DR14 + Story 1.17 design system + UX-DR80 virtualization platform requirement
**When** `<ContributionListTable>` and `<ContributionListMobileRow>` are authored as extensions of `packages/ui`
**Then** Table supports up to 50k rows desktop with virtualization; Mobile Row supports up to 10k rows on mobile with the same performance contract (60fps target / 30fps minimum on canonical entry-level Android per Story 0.10)
**And** lists render first-name + last-initial + Pool letter + status pill (Story 9.6) per the matrix tier — never plain phone/email per Story 11a.4 obfuscation
**And** confirmed contributors are pulled from Story 9.5 canonical `contribution.confirmed` event-derived view — never yellow-pill or attested-only states (per Story 8.3 + Story 9.5 invariants inheritance)

### Story 11b.3: Sahyog Vivran Per-Claim Story Surface + AR-48 Authenticated-Fragment Composition + Reversed-Denial Publish Hook Consumer + Financial-Truth-From-Canonical-Events Invariant `[SURFACE]`

As a non-member visitor (or authenticated member) viewing a closed pool's Sahyog Vivran,
I want a per-claim story surface that combines public cache-safe shell content (family story, verifier hyperlinks, contributor list, financial outcome) with authenticated-member fragment (nominee bank details during live pool only),
So that public transparency exists for trust legitimacy while member-only sensitive details are auth-gated, and financial truth derives exclusively from Epic 9 canonical events.

**Acceptance Criteria:**

**Given** FR-77 + Sprint Change Proposal Item 12 + Story 11a.2 Astro shell + Story 6.9 consent (`sahyog_vivran_publication`) + Story 6.16 reversed-denial hook
**When** Sahyog Vivran per-claim surface is implemented
**Then** the surface renders for any closed pool with `sahyog_vivran_publication` consent active (Story 2.7 `consentExists` check); URL structure: `/sahyog-vivran/{pool_canonical_identifier}`
**And** **public cache-safe shell content** (`public` tier per matrix): pool letter + Mahabharata name (Story 7.2), close-of-cycle framing (Pool-Reality #2 per Story 7.8), confirmed contributor count + amount raised (from Story 9.5 canonical events), family story (family-written per Story 11b.4, dignified-validation Pattern 4), verifier hyperlinks resolving to verifier profile pages (verifier identity at `authenticated_member` tier — public visitor sees role only, authenticated sees name + scope)
**And** **AR-48 final extension — per-claim authenticated-fragment registry**: when the pool is `live` (not yet settled), an authenticated-fragment slot renders nominee bank details (UX-DR42 `<DocumentPreview>` style) ONLY to logged-in members; public visitors see a placeholder ("Visible to members"); the fragment is server-rendered at request time for authenticated viewers + bypasses edge cache; cache-safe public shell stays edge-cached
**And** the In Memoriam-style memorial visual components (Story 11b.5: MemorialRecord + PortraitFrame + KinshipLattice) consume into this surface per the family-authored memorial content

**Given** the **financial-truth-from-canonical-events invariant** (this story's load-bearing commitment, per user direction)
**When** any Sahyog Vivran financial summary is rendered (contributor count, confirmed-contribution list, pool settlement status, amount raised, per-contributor entries)
**Then** **financial truth derives exclusively from Epic 9 canonical `contribution.confirmed` and settlement events** — Stories 9.5 + 9.4 monotonic-confirmation + canonical financial-truth invariants inherited
**And** public surfaces (and memorial surfaces specifically) **must NOT independently infer, estimate, or synthesize** contribution truth from attestation, partial states, yellow-pill, or any other proxy
**And** explicitly prohibited rendering patterns: (a) inferred totals from attestation events; (b) projected/estimated final amounts during a live cycle; (c) "X% confirmed so far" framing that exposes the gap between attested and confirmed; (d) synthesized confidence-interval-style "approximate" totals; (e) any aggregate that mixes confirmed and unconfirmed counts
**And** the rendering pattern: the surface queries Story 9.5's confirmed-contribution view + Story 7.1's pool settlement event stream; if Epic 9 hasn't emitted `contribution.confirmed` for a contribution, it does not appear; if the pool isn't `settled`, settlement totals don't render — the surface shows "Pool live — final outcome will appear after reconciliation settles" rather than estimating
**And** a CI test asserts: no API endpoint serving Sahyog Vivran data computes inferred financial state from non-canonical sources; financial summaries source exclusively from `contribution.confirmed` + `pool.settled` events

**Given** the **reversed-denial publish hook consumer** (Story 6.16 emission)
**When** Story 6.16 emits `claim.reversed` event for a previously-denied claim
**Then** the publish hook consumer routes the claim to Sahyog Vivran publication queue; the per-claim Sahyog Vivran surface includes a "Reversed by appeal" narrative with appeal-stage attribution + reversal date
**And** the appeal lineage is visible (deny → appeal stage → reversal); audit-logged via Story 1.10

**Given** the consent-gating invariant
**When** `sahyog_vivran_publication` consent is revoked (Story 2.7)
**Then** the Sahyog Vivran page is taken down within the cache-safe invalidation window (Cloudflare TTL + Story 4.8 conservative-recompute pattern); a "Page removed by family request" placeholder serves at the URL
**And** consent re-grant restores the page; full audit trail of consent transitions preserved per Story 2.7

### Story 11b.4: MemorialAuthorshipSurface — Family Writes the Story + Family-Authorship-Preserved Invariant `[SURFACE]`

As a bereaved family member writing the memorial story for the deceased,
I want a MemorialAuthorshipSurface that captures my voice + intent — moderated against harmful content but never algorithmically rewritten, summarized, embellished, or AI-generated,
So that my words for my loved one remain mine.

**Acceptance Criteria:**

**Given** UX-DR38 (`<MemorialAuthorshipSurface>`) + UX-DR55 Pattern 4 dignified-validation copy (validated against Story 0.9) + Story 11b.3 Sahyog Vivran consumer
**When** the MemorialAuthorshipSurface is implemented
**Then** the surface offers a multi-step authoring flow with Pattern 4 dignified pacing: (a) introduction and prompt ("Would you like to share a few words about [name]?"); (b) free-text composition with rich-text light formatting (paragraph, emphasis — no complex markup); (c) optional photo upload via Story 6.5 `<ClaimDocumentUpload>` pattern; (d) optional kinship details for Story 11b.5 `<KinshipLattice>`; (e) preview before publish
**And** UX-DR50 save-and-resume across the entire flow; the family can return over days — "fursat" register inherited from Epic 9 patterns
**And** content moderation by trustees occurs for harmful or policy-violating content only (e.g., personal attacks on third parties, false accusations, illegal content); flagged content surfaces in moderation queue per Story 10.10; tone-review (Story 2.2) applies for member-facing copy

**Given** the **"family authorship is preserved, not editorially rewritten" invariant** (this story's load-bearing commitment, per user direction)
**When** the memorial narrative is processed for publication
**Then** **memorial authorship preserves the family's submitted voice and intent**
**And** moderation may **remove** harmful or policy-violating content (with notification + appeal — referencing the family by a designated representative), but v1 does NOT: (a) algorithmically rewrite text; (b) summarize the narrative; (c) embellish with AI-generated additions; (d) auto-correct grammar/spelling beyond family explicit opt-in; (e) AI-generate or AI-fill any narrative content; (f) apply tone "improvements" to family-written voice
**And** acceptable moderation actions: redact specific harmful sentences with explicit notation; reject the submission entirely with reason; request specific changes via empathetic helpdesk conversation
**And** content storage preserves the family's submission verbatim (with moderation decisions audit-logged separately); a future reviewer can always reconstruct what the family originally wrote vs. what moderation removed
**And** if v2 ever introduces optional AI-assisted features (e.g., translation, voice-to-text), they must be **explicit opt-in by the family** and must not silently transform; v1 has no AI features in this flow

**Given** Story 0.9 bereaved-spouse findings + Pattern 4 dignified-validation
**When** the authorship flow renders for grief-paced sessions
**Then** the flow is unhurried; no "your draft is incomplete" pressure; no deadlines for memorial completion; family can choose to skip memorial authorship entirely (the Sahyog Vivran surface still renders with system-default factual content)

### Story 11b.5: Memorial Visual Components — MemorialRecord + PortraitFrame + KinshipLattice `[PRIMITIVE]`

As any Sahyog Vivran or In Memoriam surface displaying memorial content,
I want `<MemorialRecord>`, `<PortraitFrame>` (Funeral Frame), and `<KinshipLattice>` design system components extending Story 1.17,
So that memorial-surface rendering is consistent + dignified across consumer surfaces.

**Acceptance Criteria:**

**Given** UX-DR17 + UX-DR18 + UX-DR19 + Story 1.17 design system + Story 0.9 bereaved-spouse Pattern 4 dignified-validation findings
**When** the components are authored as extensions of `packages/ui`
**Then** `<MemorialRecord>` renders a single memorial entry: deceased member name + tier-appropriate identity, dates (birth-death), district, family-authored narrative excerpt (Story 11b.4), photo
**And** `<PortraitFrame>` renders the deceased member's photo (consent-gated; family-uploaded per Story 11b.4) in a dignified frame — culturally-appropriate Hindi-context visual treatment (validated against Story 0.9)
**And** `<KinshipLattice>` renders optional kinship relationships (parent / spouse / child / sibling of deceased) when family provides them in Story 11b.4 — visualization is respectful structural diagram, NOT social-network-style graph (inheriting Story 11a.3 legitimacy-not-social-graph invariant)
**And** all three components are matrix-tier respecting + Hindi-first per Story 2.1; accessibility per Story 0.10

### Story 11b.6: In Memoriam Roll + Consent-Governed-Revocable Invariant `[SURFACE]`

As any non-member visitor or member viewing the trust's In Memoriam,
I want a respectful roll listing of deceased members under consent-governed visibility,
So that the trust's institutional memorial honors deceased members while respecting family consent authority.

**Acceptance Criteria:**

**Given** FR-78 + Story 11a.1 matrix (`in_memoriam_listing` tier) + Story 6.9 `in_memoriam_listing` consent + Story 11b.5 memorial components
**When** In Memoriam is implemented
**Then** the surface lists deceased members for whom `in_memoriam_listing` consent is active (Story 2.7 `consentExists` check at render time); each entry uses `<MemorialRecord>` (Story 11b.5)
**And** entries display per the 4-tier matrix: public-tier visitors see deceased's first-name + last-initial + dates + district; authenticated members see fuller per Story 11a.3 directory pattern
**And** the surface is paginated + searchable (consistent with Story 11b.1 remembrance-not-analytics invariant — no leaderboards, no "most viewed", no engagement metrics)
**And** Pattern 4 dignified-validation copy applies; Hindi-first per Story 2.1; accessibility per Story 0.10

**Given** the **memorial-visibility-consent-governed-and-revocable invariant** (this story's load-bearing commitment, per user direction)
**When** family consent transitions occur
**Then** **In Memoriam visibility is governed by explicit publication consent and remains revocable**
**And** the visibility flow: family grants `in_memoriam_listing` consent at claim-time (Story 6.9) OR via the Life Events panel (Story 3.9 extension); the listing appears within the cache-safe window
**And** **consent withdrawal must remove the memorial listing within the cache-safe invalidation window** established for public-surface governance (Cloudflare TTL + Story 4.8 conservative-recompute pattern + Story 9.5-style canonical event)
**And** consent withdrawal is an explicit family-authored action (or family-representative on behalf via Story 10.10 moderation if family unavailable); withdrawal does not require justification; withdrawal is final-and-revertible (family can re-grant later)
**And** the audit chain preserves all consent transitions per Story 2.7; the trust does not retain memorial-listing data beyond consent (active or revoked) for public surfacing — Story 1.5 PII encryption + Story 3.12 RTBF patterns apply for retention boundaries
**And** if the deceased's family is multi-member (multiple nominees, kin), the system handles consent by the consenting party with audit attribution; conflicts surface to trustee moderation per Story 10.10

### Story 11b.7: StatCardStrip Component `[PRIMITIVE]`

As any Sahyog Drive / Sahyog Vivran / member dashboard surface displaying aggregate statistics,
I want a `<StatCardStrip>` design system component extending Story 1.17,
So that aggregate stats render consistently with canonical financial-truth (Story 9.5) and matrix-tier respect.

**Acceptance Criteria:**

**Given** UX-DR20 + Story 1.17 design system + Story 9.5 canonical financial-truth + Story 11a.1 matrix
**When** `<StatCardStrip>` is authored as an extension of `packages/ui`
**Then** the component renders a horizontal strip of stat cards: total pools spawned, total contributors (confirmed only, from Story 9.5), total amount raised (confirmed only), active pools count, etc.
**And** all stats derive from Story 9.5 canonical events; no yellow-pill or attested-only counts; no inferred or estimated totals during live cycles
**And** matrix-tier respecting: aggregate counts may be public; per-member breakdowns are tier-gated
**And** Hindi-first numeral formatting per Story 1.17 numeral discipline + Story 2.1

### Story 11b.8: Real Data Test Gate + Accessibility Audit Gate (Phase 4 Launch-Blockers) `[GOVERNANCE]`

As Solo Builder + Trustee Panel demonstrating Phase 4 launch readiness,
I want Real Data Test gate (UX-DR69: 300+ records on 360px under throttled cellular + slow CPU with behavioral success criteria) + Accessibility audit gate (UX-DR70) closed before Epic 11b publishes,
So that memorial / Sahyog Drive / In Memoriam surfaces pass measured validation rather than aspiration.

**Acceptance Criteria:**

**Given** UX-DR69 (Real Data Test gate) + UX-DR70 (accessibility audit gate)
**When** the gates run
**Then** **Real Data Test**: 300+ representative records (real or representative synthetic) render on 360px viewport under throttled cellular + slow CPU configured per Story 0.10 canonical device; behavioral success criteria validated by Sushil-class + Reena-class users: (a) identify a correct record; (b) understand the record's status; (c) recover from a mismatch / wrong record
**And** **Accessibility audit gate**: comprehensive audit per Story 0.10 P0-2c findings + Story 1.17 design system accessibility rules; screen-reader navigation works across the surfaces; ARIA landmarks + roles consistent; keyboard-only flows complete; assistive-tech tested with VI member-class participants
**And** results are recorded in `_bmad-output/research/epic-11b-validation-gates.md` with screenshots / video / participant transcripts; gates failing → remediation required before Epic 11b publishes
**And** the gates appear in Story 0.15 launch-gate inventory with named owners + closure criteria + target dates

---

## Epic 12: Module Marketplace

Members see their eligible-modules shelf below My Pool. Admin targets modules by Pariwar/scope/cohort with validity windows + slot caps. Time-bombed auto-archive. First partners: HDFC home loan, LIC term plan, health-camp pilot. **Suppressed in all account-frozen states (UX-DR1, Stance #1) — structurally absent on a deceased member's phone, not "empty" or "hidden".**

**User Outcome:** Reena sees LIC + HDFC + health-camp on her Module Shelf below My Pool; eligibility filter applies; she taps LIC, fills basic interest with consent, lead routes to partner with TWT attribution. Module auto-archives at `valid_until` or `slot_capacity == 0`. A nominee opening the deceased's phone post-claim sees Module Shelf **structurally absent** — enforced by Story 3.1 `account-frozen` derived overlay state (added per Epic 12 dependency), NOT reviewer discretion.

**FRs:** FR-64, FR-65, FR-66, FR-67.

**Anchoring ARs:** AR-42 (Module Marketplace lead-handoff transport).

**UX-DR anchors:** UX-DR1 (Module Shelf grief-context exclusion — state-machine-enforced via Story 3.1 derived overlay).

**Demoable closure:** Admin authors LIC module manifest with eligibility + scope filter + valid_until + slot_capacity; module appears on eligible members' shelves; Reena taps, submits lead, partner receives lead with attribution; slot decrements; auto-archive on valid_until. **Structural suppression test: account-frozen member (derived state via Story 3.1 from a claim case) opens app — Module Shelf is structurally absent (not rendered, not prefetched, not hydrated, not cached for presentation, not visually replaced with promotional placeholders).**

**Dependencies:** Epic 1 (substrate + RBAC + idempotency) · Epic 3 (member identity + Story 3.1 `account-frozen` derived overlay state — amended per Epic 12 dependency) · Epic 6 (Story 6.1 `claim.intake.initiated` event triggers overlay).

**Story label legend:** `[PRIMITIVE]` · `[SURFACE]` · `[GOVERNANCE]` · `[CONSUMER]`.

### Story 12.1: Module Manifest Schema + Module Lifecycle State Machine `[PRIMITIVE]`

As Solo Builder authoring the marketplace primitive,
I want a module manifest schema + lifecycle state machine consuming Story 1.3's event log primitive,
So that every module is event-derived, audit-replayable, and lifecycle-traceable.

**Acceptance Criteria:**

**Given** FR-64 + Story 1.3 event log + AR-42
**When** the module manifest + state machine are authored in `packages/marketplace`
**Then** module schema carries: `module_id` (UUID), `pariwar_id` (or null for cross-Pariwar), `partner_id`, `name_en`, `name_hi`, `description_en`, `description_hi`, `eligibility_filter` (rule expression evaluable against member context — age band, district, member status, etc.), `scope_filter` (Pariwar / state / district / role / cohort), `valid_from`, `valid_until`, `slot_capacity`, `slots_remaining`, `lead_handoff_url`, `lead_handoff_signing_key_ref` (Secret Manager ref per Story 1.5), `branding_bundle` (logo + colors), `state` (`draft | scheduled | active | archived`), `audit_id`
**And** state machine emits events: `module.authored`, `module.scheduled`, `module.activated`, `module.lead-submitted` (with member id + slot decrement), `module.archived` (with reason: `valid_until_reached | slot_capacity_exhausted | trustee_archived`)
**And** state is event-derived per Story 3.1, 6.1, 7.1 pattern; persisted state column never directly UPDATEd

### Story 12.2: Admin Module-Targeting Wizard `[SURFACE]`

As a Pariwar admin or trustee authoring a partner module,
I want a wizard that walks me through eligibility + scope + validity + slot capacity definition + partner integration setup,
So that module creation is structured + scope-respecting + audit-logged.

**Acceptance Criteria:**

**Given** FR-66 + Story 1.8 RBAC + Story 1.10 audit
**When** the targeting wizard is implemented
**Then** the wizard steps through: (a) partner identification + module name/description (Hindi + English per Story 2.1); (b) eligibility filter authoring with structured rule expression preview; (c) scope filter (national/state/district/role/cohort); (d) validity window (valid_from/until); (e) slot capacity; (f) partner integration setup (lead_handoff_url + signing key from Secret Manager — Story 1.5); (g) review + tone-review sign-off per Story 2.2; (h) publish
**And** scope is RBAC-enforced — admins can only author modules within their scope
**And** publish requires step-up OTP per Story 5.9; emits `module.activated` event

### Story 12.3: Member Module Shelf — Eligibility Filter + Scope Filter `[SURFACE]`

As Reena viewing my home screen below My Pool,
I want an eligibility-filtered + scope-filtered module shelf showing only modules I'm eligible for at my scope,
So that I see relevant partner offers without irrelevant noise.

**Acceptance Criteria:**

**Given** FR-65 + Story 12.1 module data + Story 1.7 Pariwar Passport + Story 3.1 member state
**When** the member module shelf is implemented
**Then** the shelf evaluates each active module's `eligibility_filter` against the member's context (age, district, status, etc.); the `scope_filter` against the member's Pariwar/scope; modules passing both are displayed
**And** the shelf is paginated; modules rank by partner-trustee-curated relevance (no algorithmic engagement-optimization ranking)
**And** tapping a module opens a brief interest form with explicit consent (Story 2.7 `recordConsent` for `module_lead_handoff` consent type); submission emits `module.lead-submitted` event consuming Story 12.5 transport

### Story 12.4: Grief-Context Module Shelf Suppression — State-Machine-Enforced + Structural-Not-Cosmetic Invariant `[GOVERNANCE]`

As a relative or nominee opening the deceased member's phone post-claim,
I want the Module Shelf **structurally absent** — never rendered, never prefetched, never visually replaced with promotional content — enforced by Story 3.1's `account-frozen` derived overlay state,
So that grief-context dignity is preserved at the architectural layer, not at reviewer discretion.

**Acceptance Criteria:**

**Given** UX-DR1 (Module Shelf grief-context exclusion — state-machine-enforced) + Story 3.1 `account-frozen` derived overlay state (added per Epic 12 dependency)
**When** the suppression mechanism is implemented
**Then** the member shelf consumer (Story 12.3) queries Story 3.1's `getMemberAccountOverlay(member_id)` before rendering; if overlay is `account-frozen = true`, the suppression activates
**And** suppression is **state-machine-derived** — triggered by `claim.intake.initiated` event for the member as deceased (Story 6.1); reversal of suppression happens via overlay-removal policy (e.g., `claim.settled` → overlay removed); no manual toggle bypasses the state-machine evaluation

**Given** the **structural-not-cosmetic suppression invariant** (this story's load-bearing commitment)
**When** the `account-frozen` overlay is active for a member
**Then** Marketplace suppression is **structural at the API and composition layer**
**And** the suppressed modules must NOT be: (a) **rendered** (no DOM elements representing the shelf or modules); (b) **prefetched** (no API calls retrieving module data); (c) **hydrated** (no client-side hydration of module data); (d) **cached for presentation** (no edge-cache or service-worker entry containing module data for the frozen member); (e) **visually replaced with promotional placeholders** ("Recommended modules unavailable" placeholders, "Coming soon" promotional cards, or similar UI nudges toward future engagement)
**And** the shelf is **structurally absent** in the DOM — not just `display: none` (CSS hidden), not "loaded but disabled", not "empty state placeholder" — it is as if the shelf component does not exist for this view
**And** a CI test asserts: for a `account-frozen` member view, no API call to module endpoints is made; the rendered DOM contains no module shelf elements; no placeholder content references modules; no partner branding appears anywhere on the surface
**And** the philosophy is documented: the trust does not market to grieving families; absence is the architectural commitment, not cosmetic concealment

### Story 12.5: Module Lead-Handoff Transport + Partners-as-Downstream-Consumers Invariant `[PRIMITIVE]`

As Solo Builder authoring the lead-handoff transport that connects TWT members' consented interest to partner systems,
I want a webhook-based transport with signed payloads + member-consented data + TWT attribution + idempotent delivery,
So that partner systems receive valid leads with provenance, and partner integration boundaries are preserved.

**Acceptance Criteria:**

**Given** AR-42 + Story 2.7 consent registry + Story 1.5 Secret Manager + Story 1.12 idempotency
**When** the lead-handoff transport is implemented
**Then** the transport delivers webhook to partner-configured `lead_handoff_url` with: signed payload (HMAC-SHA-256 with module's signing key from Secret Manager), member-consented data only (consent-checked via Story 2.7 at the moment of handoff — revocation between submission and handoff cancels the delivery), TWT attribution header (`X-TWT-Attribution: pariwar=<id>, module=<id>, lead_id=<uuid>`)
**And** the transport is idempotent via Story 1.12 keyed store (key = `lead_id`); retries on transient failure with exp backoff; permanent failure flagged for partner-relationship review
**And** every handoff is audit-logged via Story 1.10 with full payload reference + delivery status

**Given** the **partners-as-downstream-consumers-not-state-co-owners invariant** (this story's load-bearing commitment)
**When** partner system integrations are designed
**Then** partner integrations **consume explicitly consented lead-handoff events only** and **must NOT become authoritative sources of member lifecycle, validity, contribution, or claim-state truth**
**And** the boundary is enforced architecturally: (a) partner webhooks are **outbound only** (TWT → partner) — no partner webhook endpoints inbound to TWT exist for membership state; (b) any partner-provided data (e.g., lead-outcome confirmation, partner-account-status updates) is treated as **advisory information**, never authoritative; (c) partner integrations cannot register inbound APIs that update member lifecycle state, validity status, contribution status, or claim state
**And** explicitly prohibited integration patterns: (a) partner CRM bidirectional sync that updates TWT's member records; (b) partner-driven membership state changes (e.g., "LIC system says member is no longer eligible — auto-suspend"); (c) partner data overwriting TWT's canonical member fields; (d) partner systems becoming the source of truth for any TWT data
**And** acceptable integration patterns: outbound lead handoff (this story); partner-provided lead-outcome feedback recorded as informational only (advisory, not authoritative); partner branding and module metadata consumed inbound at module-authoring time only (Story 12.2 wizard)
**And** the philosophy is documented: TWT's canonical state authority is preserved; partner systems are CRM/sales consumers, not membership co-owners; this prevents partner-driven state drift, CRM synchronization creep, and governance erosion

### Story 12.6: Time-Bombed Module Lifecycle + Auto-Archive `[CONSUMER]`

As Solo Builder authoring the module-archive lifecycle,
I want time-bombed auto-archive triggered by `valid_until` reached OR `slot_capacity` exhausted,
So that modules don't linger on shelves past their valid window or after slot exhaustion.

**Acceptance Criteria:**

**Given** FR-67 + Story 1.12 pg-boss + Story 12.1 state machine
**When** the auto-archive mechanism is implemented
**Then** a pg-boss cron job runs daily evaluating active modules: (a) if `valid_until < now()`, archive with reason `valid_until_reached`; (b) if `slots_remaining == 0`, archive with reason `slot_capacity_exhausted`; (c) emit `module.archived` event with reason
**And** archived modules: (i) no longer appear on member shelves; (ii) past lead-handoffs remain queryable for audit; (iii) can be restored by trustee within a grace window (e.g., 7 days) with `module.restored` event
**And** archived state respects Story 9.5 / Story 11b.3 canonical-truth patterns: archived modules don't appear in member-facing aggregates as active; archived counts surface in admin analytics only (Story 10.7 reports library)

---

## Epic 13: Growth — Field-Worker Attribution & Member Invite Loop

Field workers (Vikram-class) have a mobile-first admin app with their 6-digit attribution code, attributed-members list with qualification states, and monthly commission pipeline (₹65/qualified acquisition = KYC + ₹110 + first valid contribution via Story 9.5 green-pill confirmation). Members can invite fellow teachers via OS share sheet (UX-DR29 promotes FR-87's `[v1-S]` share path to v1-M); adopter chain captured for Phase B activation.

**User Outcome:** Vikram opens field-worker app; sees his attribution code, his attributed members + qualification states, his pending commission. Sushil, after his first confirmed contribution, opens an invite share sheet with v1 caps + voluntary trust-sharing framing (no dark-pattern virality); invitee-onboarding shell captures adopter chain attribution at signup. Phase B (≥1L members) commission flow deferred to v2; chain data captured in v1.

**FRs:** FR-53, FR-81, FR-82 (field-worker side; member-side in Story 3.6), FR-83, FR-84, FR-85, FR-86, FR-87.

**Anchoring ARs:** AR-56 (TDS §194H + DLT-transactional reg — operationally committed in Story 0.1 runbook) · AR-67 (solo-build operational continuity).

**UX-DR anchors:** UX-DR29 · UX-DR30 · UX-DR48.

**Demoable closure:** Vikram registers as field worker; receives Pariwar-scoped 6-digit code; Sushil signs up using Vikram's code; Sushil completes KYC + ₹110 + first valid contribution (Story 9.5 confirmed); Vikram's commission pipeline reflects qualified acquisition (gated on green-pill, never yellow); monthly disbursement batch with TDS §194H deducted. Sushil invites Anand via share sheet (voluntary trust-sharing, v1 caps, no dark patterns); Anand opens deep link; signup captures adopter-chain attribution.

**Dependencies:** Epic 1 (substrate + RBAC) · Epic 3 (member identity + Story 3.6 Reference Code consumer) · Epic 5 (channel dispatcher) · Epic 8 (Story 8.4 attestation) · Epic 9 (Story 9.5 canonical green-pill confirmation gate).

**Story label legend:** `[PRIMITIVE]` · `[SURFACE]` · `[GOVERNANCE]` · `[CONSUMER]`.

### Story 13.1: Field Worker Identity + Lifecycle State Machine `[PRIMITIVE]`

As Solo Builder authoring the field-worker primitive,
I want a field-worker identity + lifecycle state machine consuming Story 1.3 event log,
So that field-worker state is event-derived + audit-replayable.

**Acceptance Criteria:**

**Given** FR-85 + Story 1.3 event log
**When** the field-worker primitive is authored in `packages/field-worker-lifecycle`
**Then** field worker schema carries: `field_worker_id`, `pariwar_id`, `name`, `mobile`, `kyc_status`, `attribution_code` (Pariwar-scoped 6-digit; FK to Story 13.2 codes table), `state` (`pending_kyc | active | suspended | terminated`), `created_at`, `audit_id`
**And** state transitions emit events: `field_worker.registered`, `field_worker.kyc-completed`, `field_worker.activated`, `field_worker.suspended`, `field_worker.reactivated`, `field_worker.terminated`
**And** state is event-derived per Story 3.1 pattern; persisted state column never directly UPDATEd

### Story 13.2: 6-Digit Attribution Code Generation Per Pariwar — Pariwar-Scoped Uniqueness Invariant `[PRIMITIVE]`

As Solo Builder authoring the attribution code allocation system,
I want a random 6-digit code generator with **Pariwar-scoped uniqueness** (not global uniqueness),
So that code allocation scales with multi-Pariwar growth without artificial collision pressure, while ensuring attribution always resolves via Pariwar context.

**Acceptance Criteria:**

**Given** FR-81 + FR-82 (field-worker side) + Story 3.6 member-side Reference Code consumer
**When** the attribution code allocation is implemented
**Then** the code allocator generates a random 6-digit code on field-worker registration; uniqueness is checked against existing active codes **within the same Pariwar only**; collisions retry up to a configurable threshold; permanent unallocation flagged for trustee review

**Given** the **Pariwar-scoped uniqueness invariant** (this story's load-bearing commitment, per user direction)
**When** attribution codes are allocated across the system
**Then** **attribution-code uniqueness is enforced within a Pariwar namespace rather than globally**
**And** **cross-Pariwar collisions are permissible** provided attribution resolution always includes Pariwar context
**And** the attribution-resolution API: `resolveAttribution(code, pariwar_id) → field_worker_id` — takes BOTH the code AND the Pariwar context; never accepts a code lookup without Pariwar context
**And** the architectural precision: codes are not globally unique; Story 3.6 signup must capture the Pariwar context alongside the Reference Code; if a member signs up in Pariwar A with code "123456", they are attributed to Pariwar A's field worker, not Pariwar B's field worker with the same code
**And** a CI test asserts: no API endpoint allows attribution-code lookup without Pariwar context; same `(code, pariwar_id)` pair always resolves to the same field worker; same code across different Pariwars resolves to different field workers

### Story 13.3: Field Worker Mobile-First Dispatch App + `<FieldWorkerDispatchScheduler>` `[SURFACE]`

As Vikram performing field-worker duties,
I want a mobile-first app showing my attribution code + attributed members + qualification states + dispatch scheduler,
So that I can work effectively without a desktop or back-office tools.

**Acceptance Criteria:**

**Given** FR-53 + UX-DR48 (`<FieldWorkerDispatchScheduler>`) + Story 13.1 lifecycle + Story 1.17 design system
**When** the mobile-first app is implemented
**Then** the app shows: my attribution code prominently (with copy / share affordance); attributed-members list with per-member qualification state (KYC complete / ₹110 paid / first contribution confirmed via Story 9.5); my pending + earned commission summary
**And** the dispatch scheduler `<FieldWorkerDispatchScheduler>` lets Vikram plan visits (dates, locations, expected outreach); records dispatch activity for analytics
**And** mobile-first means: optimized for entry-level Android per Story 0.10; offline-tolerant for in-field use; Hindi-first per Story 2.1

### Story 13.4: Attribution Analytics Dashboard `[SURFACE]`

As a Pariwar admin or trustee monitoring field-worker performance,
I want an attribution analytics dashboard showing field-worker pipeline + qualification rates + commission projections,
So that field-worker effectiveness is visible without exposing per-member PII inappropriately.

**Acceptance Criteria:**

**Given** FR-83 + Story 1.8 RBAC + Story 11a.1 4-tier visibility matrix
**When** the analytics dashboard is implemented
**Then** the dashboard shows scope-respecting (Story 1.8) views: field workers by Pariwar/district, attribution pipeline (registered → qualified), aggregate qualification rates, commission projections (this month, next month)
**And** dashboard data flows from Story 9.5 canonical event-derived qualification status — never inferred from attestation alone
**And** per-member detail respects matrix tier — analytics aggregates are operator-tier; drill-down to individual member requires `member.lookup` permission

### Story 13.5: Commission Payment Trigger — Qualified-Acquisition-Gated + TDS §194H Deduction `[CONSUMER]`

As the field-worker commission disbursement system,
I want a commission payment trigger gated on qualified acquisition (KYC + ₹110 + first valid contribution via Story 9.5 green-pill confirmation) + TDS §194H deduction per AR-56,
So that commissions disburse only after canonical financial-truth confirmation and tax compliance is honored.

**Acceptance Criteria:**

**Given** FR-84 + AR-56 (TDS §194H) + Story 9.5 canonical financial-truth + Story 0.1 DLT-transactional runbook
**When** the commission disbursement is implemented
**Then** **qualified acquisition** requires all three conditions confirmed via canonical events: (a) KYC complete (`kyc.completed` event from Story 3.3b); (b) ₹110 Vyawastha Shulk paid (`vyawastha_shulk.paid` from Story 3.6); (c) first valid contribution confirmed (`contribution.confirmed` from Story 9.5 — never yellow-pill, never attestation-only)
**And** monthly disbursement batch runs (configurable cadence); per-field-worker statement: qualified acquisitions × ₹65 - TDS deducted = net disbursement
**And** TDS §194H is deducted per applicable rate; PAN-based exemption rules respected; tax statement generated per-worker per fiscal year for tax filing
**And** disbursement is audit-logged via Story 1.10 with full per-acquisition lineage; field worker receives notification via Story 5.1 with statement attachment

**Given** Phase B (≥1L members) deferred per FR-87
**When** Phase B activation arrives in v2
**Then** the commission flow for adopter chains can extend this primitive; v1 commission flow is field-worker-only (Vikram-class), not member-invite-chain (Sushil-class)

### Story 13.6: Field Worker Anti-Fraud Throttling — Assistive-Not-Auto-Punitive Invariant `[GOVERNANCE]`

As Solo Builder authoring anti-fraud safeguards for the attribution system,
I want anti-fraud heuristics that generate review signals + throttling controls without independently terminating field-worker eligibility or commission rights,
So that legitimate field workers are not silently suppressed and all consequential decisions remain human-attributable.

**Acceptance Criteria:**

**Given** FR-86 `[v1-S]` + Story 10.10 moderation + Story 1.14 rate limiting
**When** anti-fraud throttling is implemented
**Then** heuristics flag suspicious patterns: same-IP signup bursts using the same attribution code; rapid-fire signups exceeding configurable thresholds; high signup-to-qualification ratio mismatches (many signups, few qualifications); flagged patterns generate review signals + soft throttling (rate-limit increases on the flagged code)
**And** flagged cases route to admin review queue via Story 10.10 moderation pipeline; reviewer can confirm fraud (terminate field worker), confirm legitimate-but-unusual (e.g., school-campus mass signup, dense locality), or document mixed findings

**Given** the **anti-fraud-heuristics-are-assistive-not-auto-punitive invariant** (this story's load-bearing commitment, per user direction)
**When** anti-fraud heuristics fire
**Then** **heuristics generate review signals and throttling controls but do not independently terminate field-worker eligibility, attribution lineage, or commission rights**
**And** **attributable administrative review** is required before any consequential action: (a) field-worker termination requires human reviewer + reason-code (analogous to Story 10.10 moderation pattern); (b) attribution-lineage rejection requires human review (cannot be auto-voided by heuristics); (c) commission rights withholding requires audit-attributable human decision
**And** explicitly prohibited heuristic actions: (a) silent field-worker termination based on heuristic alone; (b) silent member-attribution voiding; (c) automatic commission disqualification without human review; (d) blacklist propagation across Pariwars without explicit trustee decision
**And** acceptable heuristic actions: soft throttling (slow but don't stop attribution); flag for review; alert admin queue; record the signal for trustee analytics
**And** legitimate field workers in dense localities, shared-device environments, or school-campus signups are not silently suppressed; their cases route to human review where context is acknowledged
**And** the philosophy is documented: TWT's anti-fraud posture is human-governed + dignity-preserving + non-black-box; heuristics assist humans, never replace them

### Story 13.7: `<InviteShareSheet>` with v1 Caps + FR-87 v1-M Promotion + No-Dark-Pattern-Virality Invariant `[SURFACE]`

As Sushil after my first confirmed contribution,
I want an invite share sheet that helps me invite fellow teachers voluntarily, with v1 caps preventing spam pressure + explicit prohibition of dark-pattern virality mechanics,
So that invitation is voluntary trust-sharing, not coercive growth optimization.

**Acceptance Criteria:**

**Given** UX-DR29 (`<InviteShareSheet>` v1 caps) + FR-87 v1-M promotion
**When** the InviteShareSheet is implemented
**Then** Sushil can share via WhatsApp (≤ 5 shares per action) or SMS (≤ 100/day per member with quota-met redirect to "you've shared enough for today, thanks!"); deep-link embeds Sushil's name + member identifier
**And** the share copy is dignified: "Help your fellow teacher find TWT — invite if you think they'd find it useful"; never urgency-framed; never gamified
**And** invitee opens the deep link and is routed to Story 13.8 onboarding shell

**Given** the **no-dark-pattern-virality invariant** (this story's load-bearing commitment, per user direction)
**When** the invite surfaces are designed
**Then** **invite surfaces prioritize voluntary trust-sharing over viral amplification**
**And** v1 explicitly prohibits: (a) **auto-contact scraping** (no requesting member's contacts list, address book, or phone-book access); (b) **forced invite flows** (no "to continue you must invite N friends" gates); (c) **engagement streak mechanics** (no "you've shared X days in a row! Don't break your streak!" pressure); (d) **manipulative growth dark patterns** (e.g., dual-button "Invite" vs "Skip" with the Skip button visually-deprioritized, fake "5 friends invited you" social proof, urgency timers, FOMO framing)
**And** acceptable invite patterns: voluntary share affordance with clear quota cap; respectful copy; one-tap dismissal that doesn't penalize; no nag-pressure to invite more after dismissal; no leaderboards comparing invite counts among members
**And** the philosophy is documented: TWT's growth comes from authentic trust transmission, not engagement engineering

### Story 13.8: `<InviteeOnboardingShell>` + Adopter Chain Attribution (Chain Captured v1; Commission Flow v2) `[SURFACE]`

As an invitee (Anand) opening the deep link from Sushil,
I want a welcoming onboarding shell that captures Sushil's attribution chain at signup,
So that the trust knows my chain origin (for Phase B future activation) without misleading me about its purpose.

**Acceptance Criteria:**

**Given** UX-DR30 + FR-87 (adopter chain attribution v1-active; commission v2-deferred)
**When** the InviteeOnboardingShell is implemented
**Then** opening the deep link presents an empathy-framed onboarding shell explaining the trust briefly (per Story 0.8 Sushil empathy findings); the inviter's name is acknowledged ("Sushil thinks you might find TWT useful")
**And** at signup completion (Story 3.6), the adopter chain attribution is captured: `adopter_chain_inviter_id = Sushil's member_id`; the chain is preserved on the invitee's record + on the inviter's invite-history
**And** the chain can extend: Sushil invites Anand → Anand invites Pratima → Pratima invites Vinod; each link is recorded in the chain; the full chain is queryable

**Given** Phase B v2 deferral
**When** v1 ships
**Then** **chain data is captured + queryable v1**; **no commission disbursement on the chain in v1**; the architecture supports Phase B activation later (≥1L members threshold)
**And** AC explicitly confirms: v1 chain capture is active; v1 chain commission is NOT active; v2 development can add commission flow without back-edits to the chain schema

---

## Epic 14: Disaster Handling, DPO Readiness & Future-Benefit Hooks (Durghatana Sahayata)

When a mass-casualty event hits, trustees mark a disaster window; the alert engine throttles claim spawn over months; member-comms framing de-emphasizes urgency (without suspending governance); per-pool amount is NOT raised reactively. DPO + breach-reporting readiness lands at MeitY SDF threshold. Forward-compat hooks for Durghatana Sahayata are verified, not built.

**Why this epic exists at the end:** FR-100 hooks are *touched* across Epic 2 (registry tagging) and Epic 3 (receipt persistence); this final epic *verifies* them, lands the disaster-handling control surfaces, and discharges DPO operational readiness.

**User Outcome:** Trustee marks a disaster window in admin UI; alert engine throttles claim spawn; member-facing copy de-emphasizes urgency while preserving institutional continuity messaging. DPO appointment ratified pre-MeitY threshold; breach-reporting tooling rehearsed. Schema-diff test confirms v1 ships no `payout_destinations` artifacts. `benefit_mechanism` discriminator tagged on all v1 rules as `pool`; `reserve` enum value exists but tags no v1 rules. Vyawastha Shulk receipt back-prove query: for an arbitrary past date, the system reconstructs whether a given member was Vyawastha Shulk-paid via replay-derived historical proof.

**FRs:** FR-98, FR-99, FR-100.

**Anchoring ARs:** AR-66 (disaster handling — queue-rollover semantics + alert-engine throttling config + member-comms framing) · AR-69 (ADR backlog ratification — five capability bars acceptance-criteria-frozen).

**Demoable closure:** Trustee marks test disaster window (governance-throttling only — audit/consent/validity/reconciliation/adjudication unaffected); alert engine throttles claim spawn; member-comms framing reads de-emphasized urgency yet preserves factual clarity + eligibility visibility. DPO ratified in `.decision-log.md`. Schema-diff test against v1 baseline shows zero `payout_destinations` artifacts. `benefit_mechanism` discriminator tagged on all v1 rules as `pool`. Vyawastha Shulk receipt back-prove query reconstructs historical eligibility via replay-derived proof; deterministic and audit-verifiable.

**Dependencies:** Epic 1 (substrate + Story 1.16c schema-diff CI + Story 1.16d `benefit_mechanism` CI) · Epic 2 (registry tagging) · Epic 3 (receipt persistence per Story 3.6 + AR-67) · Epic 7 (alert engine throttling config) · Epic 8 (cycle-open framing consumer).

**Story label legend:** `[PRIMITIVE]` · `[SURFACE]` · `[GOVERNANCE]` · `[CONSUMER]`.

### Story 14.1: Disaster Window Trustee Declaration + Alert Engine Throttling Config + Governance-Throttling-Not-Policy-Suspension Invariant `[SURFACE]`

As a Trustee Panel responding to a mass-casualty event,
I want a disaster-window declaration surface + alert engine throttling configuration with the explicit invariant that disaster mode is governance-throttling, NOT policy suspension,
So that the trust can humanely pace response without ever silently suspending audit / consent / validity / reconciliation / claim governance.

**Acceptance Criteria:**

**Given** FR-98 + AR-66 (disaster handling — queue-rollover + throttling + framing)
**When** the disaster declaration surface is implemented
**Then** trustees with `disaster.declare` permission can declare a disaster window via admin UI: `pariwar_id`, `disaster_type`, `effective_from`, `expected_duration`, `throttling_config` (max N claims/month carried; remainder rolled forward via queue-rollover per AR-66), `declared_by_actor`, `reason`, `panel_attestation` (≥ 2 trustee signatures required, similar to Story 6.14 R9 voting pattern)
**And** declaration emits `disaster.declared` event; the alert engine consumes the throttling config; member-comms framing transitions per Story 14.2
**And** disaster windows are auditable via Story 1.10; the declaration is visible on admin chrome with prominent banner

**Given** the **governance-throttling-not-policy-suspension invariant** (this story's load-bearing commitment)
**When** a disaster window is active
**Then** disaster-mode declaration **modifies communication pacing, queue rollover semantics, and operational urgency framing only**
**And** **must NOT silently suspend**: (a) auditability — every action during disaster mode is audit-logged identically to non-disaster operation (Story 1.10); (b) contribution lineage — event log immutability per Story 1.3 persists; (c) reconciliation integrity — monotonic-confirmation + canonical financial-truth invariants per Stories 9.4, 9.5 still apply; (d) consent governance — Story 2.7 consent registry, Story 5.4 WA opt-in audit, Story 6.9 DPDPA consent all functional; (e) claim adjudication requirements — Story 6.10 signals-advisory, Story 6.16 appeal procedural-fairness, R9 voting per Story 6.14 — every claim adjudication still requires human attribution
**And** explicitly prohibited disaster-mode behaviors: (a) auto-approval of any claim "to clear the backlog"; (b) waiver of consent requirements "due to urgency"; (c) bypass of audit logging "for performance"; (d) suspension of Validity Service rule evaluation "to speed processing"; (e) silent disabling of Story 1.16b PII scrape CI or any architectural CI gate
**And** a CI test asserts: disaster-mode code paths cannot disable any audit/consent/validity/reconciliation/adjudication gate; the gates remain active under all disaster-mode conditions
**And** the philosophy is documented: TWT's institutional safeguards persist under operational stress; disaster mode adjusts pacing and framing, never the foundations

### Story 14.2: Disaster-Mode Member-Comms Framing — De-Emphasized Urgency + Preserving-Institutional-Continuity Invariant `[CONSUMER]`

As Sushil during an active disaster window,
I want member communications that reduce urgency pressure + contribution anxiety while preserving factual clarity + eligibility visibility + institutional continuity messaging,
So that I'm informed without being pressured during community grief.

**Acceptance Criteria:**

**Given** AR-66 (disaster-mode member-comms framing) + Story 14.1 disaster window declaration + Story 8.8 contribution loop notification consumer
**When** disaster-mode framing is implemented
**Then** when a disaster window is active, the alert dispatcher applies disaster-mode copy templates: cycle-open framing is de-emphasized ("Pool A is open for contributions whenever you can"); deadline-reminder cadence is softened or paused for the duration; close-of-cycle framing acknowledges the disaster context dignifiedly
**And** copy templates live in `packages/contracts/alerts/disaster-mode-templates`; tone-review process (Story 2.2) applies before any template change ships
**And** Story 5.7 cost-optimization persists during disaster mode (members already engaged in-app aren't double-pinged), but Story 5.8 degraded-mode bridge remains available for trustee declaration if infrastructure is also degraded

**Given** the **"de-emphasized urgency is not passive suppression" invariant** (this story's load-bearing commitment)
**When** disaster-mode framing is applied
**Then** **disaster-mode communication framing reduces urgency pressure and contribution anxiety while preserving factual clarity, eligibility visibility, and institutional continuity messaging**
**And** preserved during disaster mode: (a) **factual clarity** — pool status, contribution amount, deadlines (softened but visible), nominee identity per matrix tier all remain accurate and visible; (b) **eligibility visibility** — Validity Service signals continue to surface; member can check status anytime; (c) **institutional continuity messaging** — trust is functioning, claims are being processed (at the throttled cadence), reconciliation continues, the trust is here
**And** explicitly NOT acceptable during disaster mode: (a) silent suppression of cycle-open notifications (members still need to know pools exist); (b) hiding pool progress or eligibility from members; (c) framing that implies the trust has "paused" or "is unavailable" (it's throttled, not stopped); (d) silence that reads as abandonment
**And** the design philosophy: disaster mode lowers pressure, preserves clarity; members feel held, not abandoned; the trust's institutional presence is calibrated to grief context without silence

### Story 14.3: DPO + Breach-Reporting Operational Readiness (`[v1-S]`, MeitY SDF Threshold Activation) `[GOVERNANCE]`

As a Trustee Panel preparing for DPDPA compliance at scale,
I want DPO appointment + breach-reporting tooling rehearsed before TWT crosses the MeitY-notified threshold for Significant Data Fiduciary (SDF) status,
So that compliance activates at threshold without operational scramble.

**Acceptance Criteria:**

**Given** FR-99 `[v1-S]` + DPDPA Rules SDF threshold (MeitY-notified data-principal volume; v1 ships infrastructure-ready, activates at threshold notification)
**When** DPO + breach-reporting operational readiness is established
**Then** infrastructure ships v1: (a) DPO appointment process documented in Story 0.1 runbook with named-candidate criteria + trustee-attested appointment ceremony; (b) breach-reporting tooling exists in `apps/admin/modules/breach-reporting/` with structured incident-capture form (incident timeline, affected data principals, mitigation, regulator notification draft) + drafting templates; (c) breach-detection observability integrates with Story 1.10 audit log for tamper detection + Story 4.8 freshness invariant breach + Story 1.16b PII scrape failures (any leak is an incident)
**And** infrastructure is **rehearsed pre-threshold**: a tabletop exercise validates the breach-reporting flow end-to-end (synthetic incident → incident capture → mitigation steps → DPO ratification → regulator draft → trustee sign-off); rehearsal is logged in `.decision-log.md`
**And** **at MeitY SDF threshold activation**: DPO appointment ceremony completes within the regulator-notified window; trustee panel ratifies + records; breach-reporting tooling moves from `rehearsed` to `active` operational status

**Given** Story 0.15 launch-gate inventory
**When** SDF threshold approaches
**Then** the DPO + breach-reporting readiness is tracked as a launch-gate item; named owner + closure criteria + monitoring of data-principal count threshold

### Story 14.4: FR-100 Schema-Diff Verification — Continuous CI Gate Final Closure + Non-Additive Guard Invariant `[GOVERNANCE]`

As Solo Builder closing Epic 14's FR-100 verification commitment,
I want the schema-diff CI gate (Story 1.16c) verified as continuously passing across all v1 stories with explicit non-additive guard invariant,
So that FR-100 v1 non-add commitment is provably honored end-to-end.

**Acceptance Criteria:**

**Given** Story 1.16c schema-diff CI gate + FR-100 v1 non-add commitment
**When** Epic 14 verification runs
**Then** the schema-diff CI gate has run continuously on every PR across Epics 1-13; v1 baseline schema contains zero `payout_destinations` table, zero `payout_destination*` columns, zero `/payout-destinations*` API endpoints, zero `*PayoutDestination*` Zod schemas
**And** the final verification is recorded in `_bmad-output/research/fr-100-schema-diff-verification.md` with CI run history + final state proof

**Given** the **FR-100 verification gates are non-additive guards invariant** (this story + Story 14.5 jointly load-bearing per user direction)
**When** v2 Durghatana Sahayata development begins (post-v1 launch)
**Then** **FR-100 verification gates exist to ensure future benefit mechanisms can be introduced without retroactively mutating v1 canonical event schemas, replay semantics, or lifecycle invariants**
**And** explicitly: v2 `_daan` activation OR Durghatana Sahayata activation must be a **greenfield addition** — new entities + new endpoints + new clauses — never: (a) adding `payout_destinations` columns to v1 member/claim/pool tables; (b) adding `_daan_outcome` fields to v1 contribution events; (c) silently extending v1 schemas with "compatible" new columns that change replay semantics
**And** the architectural commitment is documented: v1 schemas are **frozen with respect to future-benefit additions**; v1 replay semantics remain identical post-v2 (Story 9.4 monotonic-confirmation, Story 7.4 deterministic assignment, Story 4.6 rule-order determinism all replay-stable across v2 evolution)
**And** the Story 1.16c CI gate continues to run post-v1 launch as a permanent governance gate; v2 development that needs to extend the gate's allowlist (e.g., `payout_destinations` becomes acceptable in v2 controlled scope) requires trustee-attested ADR + capability bar update per Story 14.7

### Story 14.5: FR-100 `benefit_mechanism` Tag Verification — Continuous CI Gate Final Closure `[GOVERNANCE]`

As Solo Builder closing Epic 14's FR-100 `benefit_mechanism` enum-tag verification commitment,
I want the `benefit_mechanism` tag CI gate (Story 1.16d) verified as continuously passing with v1 rules tagged only as `pool`,
So that the forward-compat `reserve` enum value is reserved-but-unused per v1 commitment.

**Acceptance Criteria:**

**Given** Story 1.16d `benefit_mechanism` tag CI gate + FR-7 + FR-100 v1 commitment
**When** Epic 14 verification runs
**Then** the `benefit_mechanism` tag gate has run continuously on every PR across Epic 2 + downstream consumers; **every v1 rule fixture/migration/seed carries `benefit_mechanism: 'pool'`**; the `reserve` enum value exists in the type definition but **tags zero v1 rules**
**And** the build flag `BENEFIT_MECHANISM_V1_ONLY` is set; only `'pool'` permitted on inserts; the flag flips at v2 / Durghatana Sahayata activation

**Given** the FR-100 non-additive guard invariant (jointly with Story 14.4)
**When** v2 introduces `reserve`-mechanism rules
**Then** the new `reserve` rules are **greenfield additions** to the Niyamavali registry per Story 2.3 — same registry shape, same `clause_id` allocation pattern, but new clauses with `benefit_mechanism: 'reserve'`; v1 `pool`-tagged rules remain untouched and replay-identical

### Story 14.6: FR-100 Vyawastha Shulk Receipt Back-Prove Query — Replay-Derived Historical Proof Invariant `[PRIMITIVE]`

As a future Durghatana Sahayata (v2) consumer needing accident-date eligibility evaluation,
I want a Vyawastha Shulk receipt back-prove query that reconstructs whether a member was Vyawastha Shulk-paid on an arbitrary past date via replay-derived historical proof,
So that future-benefit eligibility decisions are deterministic, audit-verifiable, and not subject to mutable retrospective annotation.

**Acceptance Criteria:**

**Given** FR-100 forward-compat + AR-67 (Vyawastha Shulk receipt indefinite retention) + Story 3.6 receipt persistence + Story 1.3 event log
**When** the back-prove query is implemented
**Then** the query `wasVyawasthaShulkPaidOn(member_id, target_date) → { paid: boolean, receipt_refs[], valid_through, proof_provenance }` returns deterministic results for any past `target_date`
**And** the result is computed by replaying the member's `vyawastha_shulk.paid` + `vyawastha_shulk.renewed` events through `target_date`; current state column is not the source — event log is

**Given** the **replay-derived-not-mutable-annotation invariant** (this story's load-bearing commitment, per user direction)
**When** historical eligibility is reconstructed
**Then** **back-prove eligibility queries derive from replay-safe historical contribution and receipt records rather than mutable retrospective annotations**
**And** **historical eligibility reconstruction must remain deterministic and audit-verifiable**
**And** explicitly prohibited: (a) retroactive annotation tables ("Vyawastha Shulk validity overrides" that mutate past determinations); (b) admin-mutable override flags on past receipts; (c) any path where two queries for the same `(member_id, target_date)` could return different results; (d) eligibility computations that draw from anything other than event-replay-derived state
**And** Story 1.3 event log immutability is the foundation: events are append-only; the back-prove query reads events and reduces; replay is byte-deterministic
**And** v2 Durghatana Sahayata accident-date eligibility consumers query this primitive directly; they receive replay-derived proof + provenance refs; no retroactive interpretation
**And** the test pattern: synthetic `(member_id, target_date)` test scenarios run 100 times; results are byte-identical across replays; any variance is a P0 architectural violation

### Story 14.7: AR-69 ADR Backlog Ratification — Five Capability Bars Acceptance-Criteria-Frozen `[GOVERNANCE]`

As Solo Builder + Trustee Panel closing AR-69's ADR backlog commitment,
I want acceptance-criteria-frozen ADRs for the five capability bars + pivot-readiness documentation,
So that v1 launches with explicit substrate-pivot pathways documented for the architectural decisions Sprint Change Proposal items deferred.

**Acceptance Criteria:**

**Given** AR-69 + Sprint Change Proposal Items 1-17 + architectural-freeze table
**When** the ADR backlog ratification runs
**Then** five capability bars are explicitly ADR-tracked with acceptance-criteria-frozen specifications:
  - **(a) Edge/WAF capability bar** — Cloudflare + Bot Management + Turnstile (Story 1.13); pivot-readiness ADR documents abstraction at `packages/edge` provider-interface per AR-52; Sprint Change Proposal Item 6 commitment
  - **(b) DigiLocker KYC provider abstraction** — Story 3.3a `packages/digilocker` provider-interface; pivot-readiness ADR documents `KycProvider` interface + feature-flag-gated provider swap per FR-58C
  - **(c) Feature-flag vendor** — Story 10.8 capability bar per Sprint Change Proposal Item 9; vendor selection deferred; capability bar ADR documents what's flag-toggleable + governance-boundary invariant + selection criteria for vendor
  - **(d) Observability vendor** — AR-31; vendor selection deferred; capability bar ADR documents observability surface requirements + log/metric/trace contract + selection criteria
  - **(e) Virtualization library** — UX-DR80 platform requirement (60fps/30fps target on entry-level Android, 50k desktop / 10k mobile lists); library selection deferred; capability bar ADR documents performance contract + accessibility requirements + selection criteria
**And** each ADR carries: current v1 implementation status, pivot-readiness pathway, decision deadline (when does the deferral close?), trustee-attestation requirements for the eventual selection
**And** the ADR backlog is reviewed in the standing trustee panel meeting at least monthly until all five close

**Given** Story 0.15 launch-gate inventory
**When** v1 launch readiness is reviewed
**Then** the ADR backlog closure status is a launch-gate item; v1 can launch with deferred-but-acceptance-criteria-frozen ADRs (substrate works under v1 implementations); each ADR's closure is tracked as a post-launch obligation

---

## Workflow Progress Tracker

**Step 3 (story creation) COMPLETE.** All 16 epics shipped with full per-story AC and architectural invariants wired throughout. Resumed 2026-05-28.

Progress summary:

- ✅ Epic 0 — 15 stories
- ✅ Epic 1 — 21 stories
- ✅ Epic 2 — 7 stories
- ✅ Epic 3 — 13 stories *(Story 3.1 amended with `account-frozen` derived governance overlay state per Epic 12 dependency)*
- ✅ Epic 4 — 8 stories (rule-order-determinism + conservative-recompute fallback)
- ✅ Epic 5 — 9 stories (payload-immutability-after-dispatch + opt-in reversibility-and-independent-audit)
- ✅ Epic 6 — 16 stories (canonical-case-identity + signals-advisory-not-adjudicating)
- ✅ Epic 7 — 10 stories (atomic cycle-freeze + facilitated-recovery)
- ✅ Epic 8 — 12 stories (reconciliation-confirmed-only-visibility + UTR-attestation-as-member-claim)
- ✅ Epic 9 — 12 stories (fursat-cadence operational-posture + monotonic-confirmation + canonical-financial-truth)
- ✅ Epic 10 — 15 stories (deterministic-audit-replayable-routing-policy + dry-run-parity + governance-boundary)
- ✅ Epic 11a — 6 stories (4-tier visibility matrix + institutional-transparency framing + anti-enumeration + legitimacy-not-social-graph + obfuscation-defense-in-depth)
- ✅ Epic 11b — 8 stories (remembrance-not-analytics + financial-truth-from-canonical-events + family-authorship-preserved + consent-governed-revocable)
- ✅ Epic 12 — 6 stories (structural-not-cosmetic suppression + partners-as-downstream-consumers)
- ✅ Epic 13 — 8 stories (Pariwar-scoped attribution-code uniqueness + no-dark-pattern-virality + anti-fraud-assistive-not-auto-punitive)
- ✅ Epic 14 — 7 stories (governance-throttling-not-policy-suspension + preserving-institutional-continuity + FR-100 non-additive-guard + replay-derived-historical-proof)

**Total: 173 stories across 16 epics + Story 3.1 amendment.**

**⏳ Step 4 final validation — next**

Frontmatter `stepsCompleted` will be updated to include `step-03-create-stories` only after Step 4 validation passes.

