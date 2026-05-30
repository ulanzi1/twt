---
title: Brainstorm → PRD Reconciliation Report
created: 2026-05-22
source: _bmad-output/brainstorming/brainstorming-session-2026-05-20-1609.md
target: _bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md
companion: _bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/addendum.md
---

# Reconciliation: Brainstorm vs PRD (TWT, 2026-05-22)

Purpose: identify items present in the brainstorm session (13 themes, ~27 locked decisions, ~90 v1-M items, 18-step critical path, ~25 killed/deferred items, 8 open questions, BigDev corrections) that the PRD or addendum did not carry forward.

PRD structure does not have to mirror the brainstorm — but every v1-M item, locked decision, BigDev correction, killed item, and open question must have a traceable home (PRD FR, §5 Non-Goals, §13 Open Questions, addendum RA table, addendum TSCT-divergence table, or .decision-log.md).

---

## A. Carried Forward (Strong)

### Locked Decisions Table (27 rows)
- **L1 Brand TWT (working name):** §0 header note + OQ-1 + §9.5.
- **L2 Bihar first state:** §1, §2.8, §6.2, §12 Phase 2.
- **L3 Hindi+English at launch:** §3 Glossary + FR-68 + §5 Non-Goals + NFR localization integrity.
- **L4 Mobile-first:** §1, NFR perf budgets (Snapdragon 4-series mid-range).
- **L5 ₹110 mandatory Vyawastha Shulk:** FR-1, FR-1A, addendum §2 TSCT-divergence row 1.
- **L6 Fixed amount ₹310-400 over 12+ months:** FR-15, addendum §3.
- **L7 Mahabharata pool naming:** FR-13, glossary; (loosened to "culture-rooted, extensible" — see §C below).
- **L8 One alert/month:** FR-22, glossary, addendum TSCT-divergence row.
- **L9 15-day window:** FR-22 closed=Day15, glossary, addendum row.
- **L10 N pools = approved claims:** FR-13.
- **L11 Deterministic balanced assignment hash:** FR-14.
- **L12 75/25 multi-nominee split:** FR-4, glossary R5(E), addendum §5.
- **L13 UPI Intent only, no gateway for trust:** FR-27, §5 Non-Goals, §1 vision.
- **L14 Member self-attests UTR; nominee push statement:** FR-28, FR-29, FR-30.
- **L15 No refunds:** FR-6, FR-96.
- **L16 12-month rejoin lock:** FR-6, FR-96.
- **L17 Facilitator, not guarantor; no judicial challenge:** FR-94, §4.14, §1.
- **L18 Transparency public/private split:** FR-74 matrix.
- **L19 Crowdfunding Phase 2/3:** §5 Non-Goals, FR-67 Out-of-scope, glossary.
- **L20 Phase A paid field workers / Phase B Adopt-a-Colleague:** §4.12 description + FR-81 through FR-87.
- **L21 HDFC + LIC first partners:** §4.9, FR-66, OQ-4, §11.
- **L22 Telegram mirror:** FR-23, FR-73, glossary, addendum TSCT divergence.
- **L23 Disaster handling (stretch, never panic):** FR-98.
- **L24 Retirement +1yr per 5yr:** FR-12.
- **L25 Multi-Pariwar from day 1 / separate app per Pariwar:** §4.8 + FR-59 to FR-63.
- **L26 GitHub→Dokploy deploy:** FR-62 (+ K8s graduation path).
- **L27 NSCT non-competitive posture:** §9.4, §1.

### v1-M items (strongly carried)
- Theme 1: FR-1 (KYC + ₹110 + eHRMS manual + profile + state-agnostic ID + nominee-no-KYC + Pariwar-Passport data model + lock-in clock).
- Theme 2 Pool Engine v1-M items all covered FR-13 through FR-20, including SC-13 _daan parameterization and Pool-Reality #1/#2.
- Theme 3 Alert state machine + My Pool + structured alert object + live contributor list: FR-21, FR-22, FR-23, FR-24.
- Theme 4: FR-27 to FR-33 cover UPI Intent, idempotent tr=, amount-lock, UTR self-attest, nominee-pushed statement, matcher, dual accounts.
- Theme 5: FR-37 to FR-43 cover claim-time bank entry, OCR parity, peer mesh + ground inspection (both), public verifier names, signals banner, medical-pause integration, transfer-pending fallback, suicide/murder exclusion (FR-11).
- Theme 6 dense list: FR-44 (RBAC keys), FR-45 (scope), FR-46 (12 default roles), FR-47 (audit log 7yr), FR-49 (bulk ops), FR-50 (reconciliation review queue), FR-51 (News/Blog dual-surface + scheduling + audience scoping + comments disabled), FR-52 (helpdesk), FR-53 (field-worker dispatch), FR-54 (JSON custom fields), FR-55 (trustee fixed-amount setter), FR-56 (moderation), FR-57 (Trustee-Lite).
- Theme 7: FR-64 to FR-67 (manifest + shelf + targeting + time-bomb).
- Theme 8: FR-68 to FR-73 (bilingual, tone guide, multi-channel render, in-app push, WhatsApp, Telegram mirror).
- Theme 9: FR-74 (P/P matrix), FR-75 Directory, FR-76 Sahyog active+archive, FR-77 Vivran, FR-78 In Memoriam, FR-79 Niyamavali public diff, FR-80 English-first labels.
- Theme 10: FR-81 to FR-85, FR-87 (6-digit code, Reference Code field, attribution dashboard, qualified-acquisition gating, lifecycle, adopter chain capture).
- Theme 11: FR-59 (pariwar_id), FR-60 (branding bundle), FR-61 (N-build), FR-62 (Dokploy), FR-63 (Pariwar-Passport data).
- Theme 12: FR-7 (registry), FR-8 (lock-in ramp), FR-9 (R7 sub-clauses), FR-10 (R8/R8A/R8B), FR-11 (R5/R9/Mar2025 exclusion), FR-12 (retirement), FR-94 (T&C), FR-95-FR-97 (DPDPA export/RTBF/consent), FR-98 (disaster).
- Theme 13: FR-88 to FR-92 (Cloudflare/Bot/Turnstile, rate limits, login wall, forced pagination, no bulk export, honeypot, noindex).

### BigDev corrections (all carried)
- Nominee bank at claim-time, not signup: FR-4 consequences + FR-37 explicit policy.
- Ground inspection AND peer mesh — both, not either: §4.6 description + FR-40.
- Pool naming = Mahabharata characters with letter backward-compat: FR-13 (with extensibility note).

### Critical path engineering sequence
- PRD §4 Features order: Identity → Niyamavali → Pool Engine → Alert → Payment/Recon → Claim → Admin → Multi-Pariwar → Module → Comms → Public → Growth → Security → Trust/Compliance. Matches brainstorm 18-step sequence closely. See §F for detail.

### Killed items (carried in §5 Non-Goals or addendum RA)
- Public trust ledger / "what your ₹110 bought" / partner commission disclosure: §5 Non-Goals, RA-1, RA-2, RA-3.
- UPI Autopay for ₹110 renewal: RA-4.
- WhatsApp-only signup: RA-5.
- Public-to-nominee direct donation: §5 Non-Goals + RA-6.
- Math-Health dashboard: RA-7.
- SC-1 through SC-21 various: RA-8 to RA-22.
- Pool-Sys #3 mid-alert reassignment: RA-8.
- Self-Svc #2 DigiLocker for nominee changes: RA-23 + FR-4 codified.
- WI-18 lapsed re-engagement: RA-24.
- WI-20 dispute SLA enforcement: RA-25.
- Full Kanban claim board for v1: RA-26, §5 Non-Goals.
- Account Aggregator reconciliation for v1: RA-27, §5 Non-Goals.
- Kinship-network seeding as primary: RA-28.

### Open Questions (carried with traceability)
- OQ-1 (Naming) — PRD OQ-1.
- OQ-2 (NSCT positioning) — PRD §9.4 + OQ-10.
- OQ-3 (Pool scope per Pariwar) — PRD OQ-9.
- OQ-4 (First partner deal terms) — PRD OQ-4.
- OQ-5 (Bihar field-worker recruitment plan) — PRD OQ-5.
- OQ-6 (₹110 fee grace handling) — PRD OQ-6 RESOLVED + FR-1A.
- OQ-7 (DPO appointment + privacy policy) — PRD OQ-7.
- OQ-8 (App naming on stores) — folded into PRD OQ-1.

---

## B. Carried Forward (Weak — partial capture, flavor lost)

### B-1. Pool-Reality #2 close-of-cycle celebration messaging
**Brainstorm Theme 2:** "Pool-Reality #2 — close-of-cycle celebration messaging (no shortfall narrative) — Member impact framing." Listed as v1-M.
**PRD:** FR-19 mentions "Cycle-close messaging celebrates actual outcome" in one line. No FR for the messaging template, no copy guideline, no surface in §4.10 communication.
**Gap-flavor:** A capability exists; the *practice* (deliberate framing that avoids shortfall narrative) is not codified anywhere a downstream writer would find it.
**Severity:** Medium. **Recommended location:** Expand FR-19 OR add FR in §4.10 Tone Guide referencing settle-state copy framing.

### B-2. UPI failure heatmap for admin (WI-33)
**Brainstorm Theme 4:** v2 item.
**PRD:** Not mentioned in §4.5 v2 deferrals or §6.2.
**Severity:** Low (v2). **Location:** Add to §6.2 Out of Scope list.

### B-3. Public verifier names with profile hyperlinks
**Brainstorm Theme 5:** v1-M explicit ("social accountability").
**PRD:** FR-39 mentions "Verifier names are published with profile links" — present. FR-77 says "verifier names (hyperlinks to verifier profiles for logged-in members)." Brainstorm doesn't restrict to logged-in — appears public. Profile-link visibility scope has been narrowed in PRD without log entry.
**Severity:** Medium (scope tightening — see §H).

### B-4. SMS fallback for non-app users
**Brainstorm Theme 8:** v1-S item.
**PRD:** §4.10 explicitly drops SMS from v1 ("SMS dropped from v1") and §5 Non-Goals. This is a v1-S → killed transition without addendum RA entry.
**Severity:** Medium (silent drop). **Location:** Add to addendum RA table; or convert to explicit "Killed for v1, defer to v2" entry. See §G.

### B-5. Survey/poll feature (Theme 6 v1-S; brainstorm critical-path step 11)
**PRD:** FR-58 present and `[v1-S]`-tagged. Critical path lists it as a dedicated step. PRD does not explicitly note that it's also a TSCT divergence (replaces ad-hoc RSVP/quorum collection).
**Severity:** Low. Carried.

### B-6. Backup/restore visibility (super-admin) — Theme 6 v1-S
**PRD:** Not in any FR. NFR §8 mentions backups exist; visibility surface absent.
**Severity:** Medium. **Location:** Add to §4.7 or §6.2 v1-S list.

### B-7. API tokens for trusted integrations — Theme 6 v1-S; Theme 13 v1-S
**PRD:** Not in any FR; not in §6.2.
**Severity:** Medium. **Location:** §4.7 admin FR `[v1-S]`.

### B-8. WhatsApp-based verification for non-app users (Verify-Mesh #3, Theme 5 v2)
**PRD:** Not mentioned in §4.6 Out of Scope or §6.2.
**Severity:** Low (v2). **Location:** §6.2.

### B-9. Multi-channel parity from single alert object — also Theme 8 v1-M
**PRD:** FR-23 + FR-70. Strong.
**Severity:** None — carried.

### B-10. Trustee/founder voice+video attachments to alerts (WI-38, Theme 3 v2)
**PRD:** Not mentioned in §6.2 or §4.4 deferrals.
**Severity:** Low. **Location:** §6.2.

### B-11. Live progress with district breakdown (Alert-Lifecycle #1, Theme 3 v2)
**PRD:** Not mentioned.
**Severity:** Low. **Location:** §6.2.

### B-12. Post-alert educational nudge (Alert-Lifecycle #3, Theme 3 v2)
**PRD:** Not mentioned.
**Severity:** Low. **Location:** §6.2.

### B-13. Per-alert heatmap with district drill-down (Open-Books #2, Theme 9 v2)
**PRD:** Not mentioned.
**Severity:** Low. **Location:** §6.2.

### B-14. State-health dashboard (WI-23, Theme 6 v2)
**PRD:** §6.2 mentions "State-health dashboard" once in v2 list. Carried.
**Severity:** None.

### B-15. Founder/trustee voice/video attachments to alerts (WI-38)
Duplicate of B-10.

### B-16. Central-cadre national pool exception (KV/JNV/Sainik) — WI-35, Theme 1 v2
**PRD:** Not mentioned anywhere.
**Severity:** Low (v2) but unusual omission given eligibility-category list in FR-1 enumerates cadres.
**Location:** §6.2.

### B-17. Classroom QR badge (WI-12, Theme 1 v2)
**PRD:** Not mentioned.
**Severity:** Low. **Location:** §6.2.

### B-18. Transfer-in handshake (WI-36, Theme 1 v2)
**PRD:** FR-5 mentions "Two-sided trustee verify on transfer-in (new state's block admin reaches out within 7 days [v2])." Carried as inline v2 reference.
**Severity:** None — carried.

---

## C. Gaps — brainstorm items absent from PRD/addendum

### C-1. **Pool naming policy loosening (Mahabharata-only → "culture-rooted curated list, extensible")**
**Brainstorm:** Theme 2 v1-M: "Pool naming = Mahabharata characters (SC-9) — letters retained for backward compat." Locked decision L7.
**PRD/addendum:** FR-13 loosens this to "trustee-curated, ordered list of culture-rooted names" with Mahabharata as the "seed set" and explicit extensibility to "Ramayana, classical Indian poets, regional figures, per-Pariwar curation." Addendum row 9 also confirms. The brainstorm locked Mahabharata only.
**Severity:** Medium — this is a divergence from a locked decision. The decision-provenance row in addendum says "user-review-driven loosening" — that provenance exists but is not in `.decision-log.md` per the brainstorm-vs-PRD diff. OQ-12 captures the operational consequence.
**Recommended location:** Explicit entry in `.decision-log.md` flagging the loosening rationale.

### C-2. **Lock-in policy changed from TSCT 12-month flat → 30-day starting, member-count-ramp**
**Brainstorm Theme 12:** "Lock-in periods (general death = 12mo from Mar 2025) + reactivation logic (R7A-G) — Per TSCT." Carried as v1-M.
**PRD:** FR-8 introduces "TWT launches at 30-day (1-month) general-death lock-in" with a member-count-driven ramp. This is a substantial TSCT divergence; addendum §2 captures it (row 2). Rationale logged.
**Severity:** Medium — divergence is documented, but the brainstorm "v1-M = carry verbatim per TSCT" is not preserved. Decision-log entry recommended.
**Recommended location:** `.decision-log.md`.

### C-3. **Medical disclosure list = IMA reference**
**Brainstorm Theme 1 / Theme 5:** "Medical pause workflow (Self-Svc #3, WI-28)" — v1-S. Implies medical-pause is a workflow, not a disclosure list.
**PRD:** FR-5 promotes medical disclosure to **v1-M** and introduces IMA-list disclosure with concealment-denial penalty (FR-11). This is **new material** not in the brainstorm. Material extension of scope.
**Severity:** High — scope addition without log entry. This may be a discovered requirement during PRD authoring but should be flagged.
**Recommended location:** `.decision-log.md` and consider whether this is a stretch beyond brainstorm-locked scope.

### C-4. **FR-1A annual renewal with 3-month grace (from second renewal onwards)**
**Brainstorm:** OQ-6 "₹110 fee model — confirm mandatory ... decide handling for first-month grace." Open question.
**PRD:** FR-1A introduces full grace policy. OQ-6 marked "RESOLVED 2026-05-22." This is correctly handled — the resolution is logged and the FR reflects it.
**Severity:** None. Carried as a resolved OQ with PRD-side provenance.

### C-5. **K8s migration runbook (FR-62 graduation path)**
**Brainstorm Theme 11:** "Dokploy CI/CD auto-deploy from GitHub — v1-M." Brainstorm does not specify K8s.
**PRD:** FR-62 adds K8s migration trigger/runbook commitment (A-12). This is forward-looking discipline.
**Severity:** Low — forward-looking extension, doesn't change v1 scope.

### C-6. **Trustee panel + trust staff persona (§2.6 Quinary Persona)**
**Brainstorm:** Trust posture is mentioned (facilitator-not-guarantor). The trustee panel structure (≥3 trustees + several staff) is NOT detailed in the brainstorm. The brainstorm refers only to "trustee" / "core team."
**PRD:** §2.6 fleshes out the personas. §11 enumerates ownership.
**Severity:** None — gap-fill, not divergence.

### C-7. **TRAI/SMS dependency dropping** (Theme 8 SMS = v1-S in brainstorm → killed in PRD)
**Brainstorm:** SMS fallback for non-app users = v1-S.
**PRD:** §4.10 + §5 Non-Goals: "SMS dropped from v1. Killed because of cost and TRAI dependency."
**Severity:** Medium — silent demotion from v1-S to killed without addendum RA-table entry.
**Recommended location:** Add row to addendum §1 RA table.

### C-8. **Niyamavali full reference (TSCT R1-R15)**
**Brainstorm:** Theme 12 "Rule registry — versioned, per-Pariwar" + sub-rules. Less specified.
**PRD/addendum:** Addendum §5 enumerates R1-R15 with v1 status. Strong carry + extension.
**Severity:** None — strong carry.

### C-9. **Watermarking on Contribution Note PDFs (donor ID embedded)**
**Brainstorm Theme 13:** v1-S.
**PRD:** FR-33 "watermark with donor ID embedded for traceability `[v1-S]`." Carried.
**Severity:** None.

### C-10. **Behavioral monitoring + scraper alerting / CAPTCHA on heavy search / WAF + TLS fingerprinting** (Theme 13 v1-S items)
**PRD:** §4.13 FR-88 mentions Cloudflare Bot Management + Turnstile (covers some). WAF + TLS fingerprinting not explicit. CAPTCHA on heavy search not explicit. Behavioral monitoring + scraper alerting not explicit.
**Severity:** Medium — three v1-S items implicit-only. Could be folded into existing FRs.
**Recommended location:** Expand FR-88 or FR-89 consequences; or add to §6.2.

### C-11. **Onboarding model Phase B "Adopter badge tiers" detail (Seedling/Sapling/Grove/Forest/Banyan)**
**Brainstorm Theme 10:** v2 item, very specific naming.
**PRD:** §6.2 mentions "Adopter badge tiers (Seedling/Sapling/Grove/Forest/Banyan) — v2 (activates Phase B)." Carried verbatim.
**Severity:** None.

### C-12. **Personalized invite deep-links + WhatsApp share (Adopt #3)**
**Brainstorm Theme 10:** v1-S.
**PRD:** §4.12 Out of Scope: "Personalized invite deep links + WhatsApp share `[v1-S]`." Carried.
**Severity:** None.

### C-13. **"Trustee fixed-amount setter + announcement workflow" — the ₹400→₹430 mechanism**
**Brainstorm Theme 6:** v1-M.
**PRD:** FR-55 explicit, plus UJ-6 illustration. Strong carry.
**Severity:** None.

### C-14. **Eligibility-category list (basic teacher, secondary teacher, Shikshakamitra, instructor, fourth-grade staff, clerical, BEO, DIET lecturer, higher-ed faculty)**
**Brainstorm:** Not explicitly enumerated. Mentioned cadre concept.
**PRD:** FR-1 enumerates. Gap-fill (good).
**Severity:** None.

### C-15. **Naming finalization OQ — "Shikshak Parivar" vs "TWT"**
**Brainstorm OQ-1 + OQ-8 (app naming on stores):**
**PRD:** OQ-1 + §9.5 + §0 header. Carried.
**Severity:** None.

### C-16. **First-time signup mandatory-upfront resolution**
Already addressed in FR-1A. **None.**

### C-17. **Niyamavali consultation survey ahead of lock-in graduations (Notes for PM in §4.2)**
**Brainstorm:** Not explicitly mentioned.
**PRD:** Author note. **Severity:** None — author addition.

### C-18. **Member Validity Service (FR-12A)**
**Brainstorm:** Not explicitly named. The capability is implied via signals panel (WI-39) + member self-visibility JTBD.
**PRD:** FR-12A is a major new architectural FR introduced during PRD authoring. Reasonable derivation but should have provenance.
**Severity:** Low — derivation, but worth a `.decision-log.md` entry.

### C-19. **Niyamavali content has separate Hindi/English versions; both versioned**
**Brainstorm:** Theme 8 "Hindi + English bilingual at launch — v1-M."
**PRD:** FR-68 + NFR localization integrity. Carried.
**Severity:** None.

### C-20. **Member self-visibility of own validity / "I want to know my status without having to ask anyone"**
**Brainstorm:** Not explicit as JTBD.
**PRD:** §2.7 Reena JTBD + FR-12A.
**Severity:** None — gap-fill.

---

## D. v1-M items NOT visible in PRD §6.1 In Scope (itemized)

§6.1 is a high-level summary. The following v1-M items from the brainstorm are not explicitly enumerated in §6.1 even though they appear as FRs in §4:

- **Trustee fixed-amount setter + announcement workflow** (Theme 6 v1-M) — FR-55 exists but §6.1 only mentions it under "trustee fixed-amount setter" — *carried weakly*.
- **Bulk claim approval at cycle freeze** (Theme 6 v1-M) — FR-49 (general bulk ops) + FR-13 references this implicitly. §6.1 says "bulk operations." Carried weakly.
- **Member contribution reconciliation review queue** — FR-50 + §6.1 reconciliation review queue. Carried.
- **Member moderation (suspend, terminate, restore)** — FR-56 + §6.1 mention. Carried.
- **Trustee-Lite list+signals panel** — FR-57 + §6.1 mention. Carried.
- **Feature flags per cohort (ADM-14)** — Theme 6 v1-M. **Not in PRD §4.7 or §6.1.** Gap.
- **Banner / popup manager (ADM-13)** — Theme 6 v1-M. **Not in PRD §4.7 or §6.1.** Gap.
- **Reports & exports library (ADM-12)** — Theme 6 v1-M. **Not in PRD §4.7 or §6.1.** Gap.
- **Real-time per-pool live donor list (member-facing)** — Theme 3 v1-M. FR-24 carries. §6.1 says "real-time contributor list." Carried.
- **Pool-Reality #1 under-funded cycle handling** — FR-19. Carried.
- **Pool-Reality #2 close-of-cycle celebration messaging** — FR-19 trailing sentence. Weakly carried.
- **Engine parameterized for future _daan reuse (SC-13)** — FR-20. Carried.

### Itemized gaps in §6.1:
1. **ADM-12 Reports & exports library** — completely missing from §4.7 and §6.1. Severity HIGH (this is a v1-M ops surface — trustees self-serve reports).
2. **ADM-13 Banner/popup manager** — completely missing from §4.7 and §6.1. Severity MEDIUM.
3. **ADM-14 Feature flags per cohort** — completely missing from §4.7 and §6.1. Severity MEDIUM (referenced indirectly in FR-2 DigiLocker mandatory flip).
4. **Verifier-mesh tie-in (5 verifiers pre-assigned to nominee's pool, SC-5)** — Theme 2 v2 item. Not in §6.2. Severity LOW.

---

## E. Rejected/Killed items NOT in §5 Non-Goals or addendum RA table

Cross-checked the brainstorm's ~25 killed/deferred items against PRD §5 + addendum §1 RA table:

- All major SC-1 through SC-21 explicit kills are in addendum §1.
- WI-17 UPI Autopay → RA-4. ✓
- WI-22 WhatsApp-only signup → RA-5. ✓
- WI-43/44 public-to-nominee donation → RA-6. ✓
- WI-47 Math-Health dashboard → RA-7. ✓
- Self-Svc #2 → RA-23. ✓
- WI-18 lapsed re-engagement → RA-24. ✓
- WI-20 dispute SLA enforcement → RA-25. ✓
- Full Kanban claim board v1 → RA-26. ✓
- Account Aggregator for v1 → RA-27. ✓
- Kinship-network seeding → RA-28. ✓

**Gaps:**
1. **SMS fallback** — brainstorm Theme 8 v1-S; PRD kills it ("SMS dropped from v1, cost and TRAI dependency"). **No addendum RA entry.** Should be added.
2. **Public donor → nominee direct path** — present as RA-6; PRD also has §5 Non-Goals entry. ✓
3. Brainstorm OQ-6 marked "RESOLVED" in PRD — well-handled.
4. **R10(A) "no parallel teacher-org office-bearing"** — in addendum §5 Niyamavali table only; not a feature, but worth confirming this rule's surfacing path (likely T&C, which FR-94 covers).

---

## F. Critical-path engineering sequence reflection

Brainstorm 18-step sequence vs PRD §4 ordering:

| Brainstorm step | PRD location | Match |
|---|---|---|
| 1. Schema (pariwar_id) | §4.8 / FR-59 (positioned mid-PRD, not first) | Match by content, ordering inverted because schema is foundational not feature |
| 2. Auth + KYC + DigiLocker + Profile | §4.1 FR-1, FR-2 | ✓ |
| 3. Rule registry + Lock-in/90%/reactivation | §4.2 FR-7 through FR-12A | ✓ |
| 4. Pool Engine | §4.3 FR-13 to FR-20 | ✓ |
| 5. Alert state machine + 15-day + My Pool | §4.4 FR-21 to FR-26 | ✓ |
| 6. Claim flow + Verifier mesh + Trustee-Lite | §4.6 FR-37 to FR-43 | ✓ (order: Claim is §4.6, AFTER Payment §4.5 — minor inversion from brainstorm) |
| 7. UPI Intent + UTR self-attestation | §4.5 FR-27 to FR-28 | ✓ |
| 8. Nominee statement intake + UTR matching | §4.5 FR-29 to FR-32 | ✓ |
| 9. Admin UI core: RBAC + Audit + News + Bulk + Helpdesk | §4.7 | ✓ |
| 10. Field-worker attribution + Adopter chain | §4.12 | ✓ (positioned after Admin) |
| 11. Survey/poll | FR-58 (in §4.7) | ✓ |
| 12. Module Marketplace foundation | §4.9 | ✓ |
| 13. Communication multi-channel | §4.10 | ✓ |
| 14. DPDPA compliance | §4.14 FR-95-FR-97 | ✓ |
| 15. Public pages | §4.11 | ✓ |
| 16. Security (Cloudflare, anti-scrape) | §4.13 | ✓ |
| 17. First 2-3 partner modules | §4.9 description + OQ-4 | ✓ |
| 18. Tone-guide + copy review | §4.10 FR-69 | ✓ |

**Reflection:** PRD §4 ordering reorders steps 5 and 6 (Payment §4.5 comes before Claim §4.6 in PRD, brainstorm has Claim step 6 before Payment step 7-8). This is presentational and does not change implementation ordering. PRD §4 intro statement explicitly says "Reorder for downstream consumers — engineering sequence is not implementation gate, it's prioritization."

**Conclusion:** Critical-path is faithfully carried. The 18 brainstorm steps map cleanly. The §9.1 "three uncompromisable subsystems" (Pool Engine / Reconciliation / RBAC+multi-tenant) matches brainstorm "Top three engineering risks." The brainstorm's "18-26 weeks with 4-6 person team" estimate is explicitly contradicted in §9.1 ("does not match the build profile — solo build") — handled.

---

## G. Open Questions in brainstorm vs PRD §13

| Brainstorm OQ | PRD location | Status |
|---|---|---|
| 1. Naming finalization (TWT vs Shikshak Parivar) | OQ-1 + §9.5 + §0 | ✓ Resolved-pending |
| 2. NSCT positioning | §9.4 + OQ-10 | ✓ |
| 3. Pool scope per Pariwar | OQ-9 | ✓ |
| 4. First partner deal terms (HDFC, LIC) | OQ-4 | ✓ |
| 5. Bihar field-worker recruitment plan | OQ-5 | ✓ |
| 6. ₹110 fee model + grace handling | OQ-6 RESOLVED + FR-1A | ✓ |
| 7. DPO appointment + privacy policy | OQ-7 | ✓ |
| 8. App naming on stores | Folded into OQ-1 + §9.5 | ✓ |

**Additional OQs introduced in PRD:**
- OQ-11 Phase-0 simulated-drill legal viability (PRD-introduced, derived from §12 Phase 1 plan).
- OQ-12 Curated pool-name list ≥30 names (PRD-introduced, derived from FR-13 loosening — see C-1).
- OQ-13 IMA serious-illness list source (PRD-introduced, derived from FR-5 medical disclosure addition — see C-3).
- OQ-14 Lock-in graduation triggers (PRD-introduced, derived from FR-8 — see C-2).
- OQ-15 Trust staff hiring plan (PRD-introduced, derived from §2.6 Quinary Persona — see C-6).

**Note:** All brainstorm OQs are carried or resolved with provenance. PRD-introduced OQs are derived from PRD-side scope additions (which are flagged in §C above).

---

## H. PRD divergences from brainstorm without log entry (audit)

Items where PRD deviates from a brainstorm decision and `.decision-log.md` entry is recommended:

1. **C-1 Pool naming loosening from Mahabharata-only to extensible culture-rooted list.** Addendum §7 provenance row mentions "user-review-driven loosening" but no `.decision-log.md` entry inferable from PRD content.
2. **C-2 Lock-in policy reduced from 12-month (TSCT) to 30-day starting + ramp.** Addendum §2 carries the rationale (and §7 provenance). Worth dedicated decision-log entry given material scope change.
3. **C-3 Medical disclosure added as v1-M (was Self-Svc #3 v1-S in brainstorm) AND IMA-list reference + concealment-denial penalty.** Material scope addition. Needs decision-log entry. **HIGH severity.**
4. **B-3 Verifier-name profile-link visibility narrowed to logged-in members** (FR-77) vs brainstorm "public verifier names with profile hyperlinks." Either deliberate scope narrowing or unintentional. Needs clarification.
5. **B-4 / C-7 SMS demoted v1-S → killed v1.** Needs addendum RA-table row.
6. **C-18 Member Validity Service (FR-12A) — net-new architectural FR.** Derivation reasonable but worth a log entry as a PRD-time enrichment.
7. **K8s migration trigger (FR-62 / A-12) — net-new forward-looking commitment.** Not a brainstorm item; benign addition.

---

## I. Summary table

| Category | Count | Notes |
|---|---|---|
| Locked decisions (27) carried strong | 27 | All present in PRD or addendum |
| v1-M items strongly carried | ~85 of ~90 | Strong fidelity |
| v1-M items weakly carried or missing | ~5 | ADM-12, ADM-13, ADM-14, Pool-Reality #2 messaging surface, verifier-name visibility scope |
| Killed items in §5 or addendum RA | ~24 of ~25 | SMS demotion not in RA table |
| BigDev corrections carried | 3 of 3 | Strong |
| Brainstorm OQs carried | 8 of 8 | All carried or resolved |
| PRD-introduced OQs derived from scope additions | 5 | OQ-11 through OQ-15 |
| PRD divergences needing decision-log entry | 6 | High priority: C-3 medical disclosure addition |

---

*End of reconciliation report.*
