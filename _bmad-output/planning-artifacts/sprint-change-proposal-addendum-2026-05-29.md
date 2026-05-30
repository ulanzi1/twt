# Sprint Change Proposal — Addendum (2026-05-29)

**Date:** 2026-05-29
**Author:** BigDev (post-Implementation-Readiness spot-check)
**Status:** Applied 2026-05-29 — all three edits (16A, 18A, 18B, F1A) closed by [edit] in target artifacts. See §7 disposition table.
**Scope:** Three pre-Phase-4 doc-hygiene + architecture-property corrections surfaced by the 2026-05-28 Implementation Readiness Assessment and the follow-up architecture spot-check.
**Parent:** [`sprint-change-proposal-2026-05-27.md`](./sprint-change-proposal-2026-05-27.md) — same three-doc discipline (PRD/Architecture/ADR boundary); this addendum extends rather than supersedes.

**Apply verification (2026-05-29):**
- EDIT 16A — `architecture.md` §1.7 closing paragraph: NEW text in place (verified ~lines 966–984). **Closed by [edit].**
- EDIT 18A — `architecture.md` new §2.7a "Transport encryption — TLS 1.3+ pinned at three hop classes": inserted between §2.7 and §2.8 at line 1535. **Closed by [edit].**
- EDIT 18B — `architecture.md` line 42 NFR property summary: cross-links to §2.7 and §2.7a in place. **Closed by [edit].**
- EDIT F1A — `ux-design-specification.md` Appendix A: inserted at line 2757 with A.1–A.5 fully populated (no "…" placeholders remain). **Closed by [edit].**

---

## 1. Issue Summary

The 2026-05-28 Implementation Readiness Assessment cleared PRD + Architecture + Epics + UX for Phase 4. Three non-blocking findings were filed for resolution before sprint planning begins:

| # | Finding | Source | Edit cost |
|---|---|---|---|
| 16 | Architecture §1.7 frames JSONB system-integrity limits as engineer-controlled (`no Pariwar admin can override`). Mis-locates the boundary between architectural commitment (existence of limits) and Trustee-Panel policy (specific numeric values). | Architecture spot-check Item 16 | ~15 min |
| 18 | TLS 1.3+ appears only once in the architecture (line 42 property summary). Not a named freeze entry. Not pinned distinctly at edge / internal-hop / external-integration boundaries. Not substrate-pivot-safe (must survive Dokploy→K8s, Cloudflare→self-hosted WAF). | Architecture spot-check Item 18 | ~30 min |
| F1 | UX spec promised "PRD FR ↔ Trust Loop" cross-reference appendix is missing. UX §9 uses loop-local FR numbering (e.g., Journey 1: `FR-7 = Sahyog assignment`) that does not match PRD's global FR-N (PRD `FR-7 = Versioned per-Pariwar rule registry`). Epics doc bridges informally; appendix closes the auditability gap. | IR Report Finding 1 | ~30 min |

**Combined effort:** ~75 minutes of focused editing. None blocks Phase 4. Filed as a single addendum to preserve provenance with the parent SCP.

**Triggering principle (reaffirmed from parent SCP):** TWT's three-doc discipline — **PRD owns business policy** (eligibility, cadence, consequences); **architecture owns structural semantics** (state, transitions, events, *properties*); **ADRs own implementation specifics** (vendor controls, cipher suites, numeric thresholds). Items 16 and 18 are textbook applications of this discipline. F1 is doc hygiene against an explicit prior commitment.

---

## 2. Impact Analysis

### Affected artifacts

| Artifact | Edits | Notes |
|---|---|---|
| `architecture.md` | 1 in-place edit to §1.7 (final paragraph); 1 new subsection §2.7a inserted between §2.7 and §2.8 | Item 16 + Item 18 |
| `ux-design-specification.md` | 1 new appendix section appended at end-of-file | Finding 1 |

### Code / implementation impact

| Area | Impact |
|---|---|
| **JSONB custom-field limits** | None at code level — values remain in `packages/domain/` as constants. What changes is the *governance authority* over those numeric values, which becomes Trustee-Panel-reviewable rather than engineer-discretionary. No table changes, no API changes. |
| **Transport encryption** | None at code level — TLS 1.3+ was already the assumed posture and is named in NFR-15. What changes is the *architectural classification* — TLS 1.3+ becomes a frozen property at three named hop classes, with a corresponding ADR slot for cipher suites / mutual-auth choices / cert pinning specifics. |
| **UX FR appendix** | None at code level — purely a traceability artifact for downstream agents (story authors, test designers, auditors) navigating between UX journeys and PRD FRs. |

### Sequencing

These edits land **before** `bmad-sprint-planning`. Items 16 and 18 are property-level architecture commitments that downstream stories will reference; Finding 1 is a traceability surface that test design and story creation will consume. Applying them now keeps the IR report's "ready for Phase 4" verdict accurate.

### Carry-forward to Phase 4

- The 9 deferred ADRs tracked under AR-69 remain on the watch list; first sprint that touches each closes it. Unchanged by this addendum.
- Epic 0 closure remains a gate before Story 1.1; Story 0.14 (P0-5 native-stack validation) gates substrate engineering. Unchanged by this addendum.

---

## 3. Recommended Approach

**Path forward: Direct Adjustment.** Apply all three edits in place; bundle as a single PR alongside the 2026-05-27 SCP application work (or as a follow-up PR if that work has already merged). No rollback or scope reduction required.

**Rationale:**
- All three edits are documentation-level — no implementation work needs revision.
- The TLS edit ratifies a property that was already assumed in NFR-15 and Cloudflare/edge §5.8a discussions; making it a named frozen entry costs ~30 minutes and prevents a sub-decade-class retrofit.
- The JSONB framing edit aligns §1.7 with the architecture-vs-PRD boundary that the parent SCP established — internally consistent and substrate-portable.
- The UX appendix closes a commitment made in the UX spec's own §0.x discipline statement (line 44: *"an appendix 'PRD FR ↔ Trust Loop' cross-reference table"*).

---

## 4. Detailed Change Proposals

> All edits below are property-driven and substrate-portable per the architecture-vs-ADR boundary discipline. OLD text is verbatim from current docs; NEW text is the proposed replacement.

---

### Item 16 — JSONB system-integrity limits: existence vs values

**Defect:** Architecture §1.7's closing paragraph reads:

> *These limits live in `packages/domain/` as global constants; no Pariwar admin can override. Defense against a buggy or malicious tenant.*

This text conflates two distinct commitments:

1. **The existence and class of system-integrity limits** — payload size, nesting depth, GIN index growth ceiling — which IS architecturally frozen as a defense-in-depth property of the JSONB substrate.
2. **The specific numeric values** of those limits — which is operational policy. A future Pariwar (e.g., a hypothetical Rail Parivar with different document-density requirements) could legitimately need different values without re-opening architecture.

The current text frames limits as engineer-only (`no Pariwar admin can override`), implicitly removing Trustee Panel oversight authority over policy-class values. This mis-locates the boundary.

**Resolution:** Replace the closing paragraph of §1.7 with text that (a) freezes the existence of limits as architectural, (b) classifies numeric values as Trustee-Panel-reviewable operational policy, and (c) preserves the defense-against-buggy-tenant guarantee through governance rather than engineer-only mechanism.

---

**EDIT 16A — Architecture §1.7 closing paragraph (lines 965–972)**

```
OLD:
**System-level JSONB hard limits.** Independent of per-Pariwar custom-field policy, the
system enforces:
- Maximum JSON payload size per column write.
- Maximum nesting depth.
- Per-Pariwar GIN index growth ceiling with alarm + write-rate limit when approached.

These limits live in `packages/domain/` as global constants; no Pariwar admin can
override. Defense against a buggy or malicious tenant.

NEW:
**System-level JSONB hard limits.** Independent of per-Pariwar custom-field policy, the
system enforces three classes of hard limit:
- Maximum JSON payload size per column write.
- Maximum nesting depth.
- Per-Pariwar GIN index growth ceiling with alarm + write-rate limit when approached.

**The existence of these three limit classes is architecturally frozen** — every JSONB
write path is subject to all three; no code path bypasses them. This is the
defense-in-depth substrate against a buggy or malicious tenant and survives any
future cloud / substrate pivot.

**The specific numeric values** for each limit class are **operational policy under
Trustee-Panel review**, not architectural commitments. Values live in
`packages/domain/` as named constants (single source of truth, version-controlled,
change-audited) and are revisable on Trustee-Panel authority when a Pariwar's
legitimate document profile requires it. No per-Pariwar admin can override values
at runtime; value changes flow through the Trustee-Panel review path that governs
other system-integrity policy. Specific current values + the review/escalation
procedure are committed in an ADR.
```

---

### Item 18 — TLS 1.3+ as a frozen architectural property pinned at three hop classes

**Defect:** TLS 1.3+ appears in architecture.md only at line 42 as a one-line NFR property bullet ("Security: PII AES-256 at rest; TLS 1.3+; cross-tenant isolation P0; tamper-evident audit log"). It is:

- NOT named as a frozen architectural commitment in §1 Architectural Commitments or any Category 2 subsection.
- NOT pinned distinctly at the three hop classes (edge / internal-hop / external-integration) — silently treating "TLS" as monolithic invites substrate-conditional weakening (e.g., a substrate pivot from Cloudflare to a self-hosted WAF could quietly drop TLS 1.3+ at the edge if no property anchor exists).
- NOT substrate-pivot-safe — must survive Dokploy → K8s migration, Cloudflare → self-hosted WAF substitution, and Cloud SQL → self-managed Postgres if ever needed.

NFR-15 in the epics doc declares TLS 1.3+. Architecture must mirror it as a frozen property at the structural level. Specific cipher suites, mutual-auth choices, certificate pinning policy, and TLS-cert rotation cadence remain ADR territory (implementation specifics, vendor controls).

**Resolution:** Insert a new subsection §2.7a "Transport encryption — TLS 1.3+ pinned at three hop classes" immediately after §2.7 (PII encryption at rest) and before §2.8 (DigiLocker). Follows the §2.10a property-style template established in the parent SCP. Pairs the at-rest commitment (§2.7) with the in-transit commitment (§2.7a) symmetrically.

Also: a one-line cross-reference is added to the line 42 NFR summary pointing to §2.7a so the NFR property bullet and the architectural commitment are bidirectionally linked.

---

**EDIT 18A — NEW Architecture §2.7a "Transport encryption — TLS 1.3+ pinned at three hop classes"**

Insert after §2.7, before §2.8.

```
#### 2.7a Transport encryption — TLS 1.3+ pinned at three hop classes

§2.7 commits PII encryption *at rest*. §2.7a commits transport encryption — the
in-transit counterpart — as a frozen architectural property, pinned distinctly at
three hop classes so substrate pivots cannot silently weaken it.

**Frozen property: TLS 1.3+ at every network hop where TWT data crosses a trust
boundary.** No TLS 1.2 fallback. No `cleartext` exception. The property holds
substrate-by-substrate; a pivot of any underlying substrate does not relax it.

**Three pinned hop classes:**

1. **Edge hop — client ↔ TWT-controlled edge.** All traffic from member apps,
   admin browsers, public-website visitors, helpline operators, and field-worker
   devices to TWT's edge (currently Cloudflare per §5.8a; substitutable per the
   §5.8a pivot-readiness commitment) terminates TLS 1.3+. Substrate pivot
   requirement: any replacement edge (self-hosted WAF, K8s ingress, alternate
   CDN) must terminate TLS 1.3+; downgrade is a launch-blocker.

2. **Internal-hop — edge ↔ origin and origin ↔ Postgres / object storage /
   internal services.** Traffic between TWT's edge and the API origin, between
   the API and Cloud SQL, between the API and Cloud Storage, and between
   internal services (when workers split per §2.9) is TLS 1.3+. Within-VPC
   traffic is no exception; the property holds end-to-end regardless of whether
   the substrate provides "automatic in-VPC encryption" — TWT does not rely on
   substrate-provided privacy as a substitute for application-pinned TLS.

3. **External-integration hop — TWT ↔ third-party APIs.** Outbound calls to
   DigiLocker (§2.8), payment-rail systems (UPI Intent handoff is OS-level and
   out of scope; backend webhook ingress is in scope per §3.11), bank
   statement intake transports (§3.6), FCM/APNs (§3.3), and any future
   external integration are TLS 1.3+ with server certificate verification. No
   integration that requires TLS 1.2 or weaker is permitted; substitution to
   a compliant provider is the resolution path.

**ADR territory (deferred):**
- Specific cipher suite allowlist and ordering.
- Mutual-TLS (mTLS) policy at the internal-hop class — currently called out as
  an option in §2.9 service-to-service auth; the choice is taken at split-trigger
  time per §2.9 and the ADR records the mTLS decision then.
- Certificate pinning policy at the client (native member-app) — pin / no-pin /
  certificate-transparency-only is deferred to an ADR alongside the OS-platform
  cert-pinning library choice.
- TLS-cert rotation cadence and automation (Let's Encrypt / ACM-equivalent /
  manual) — Category 5 operational territory.
- Substrate-specific TLS terminator configuration (Cloudflare TLS profile,
  K8s ingress TLS settings, etc.).

**Substrate-pivot safety:**
Every ADR that records substrate choice for any hop must reaffirm TLS 1.3+
at that hop. The architectural property does not flex; only its
implementation mechanism does. Reviewers of substrate-pivot proposals are
required to verify TLS 1.3+ posture is preserved at the affected hop classes
before approval.

**Verification:**
- CI gate: integration test asserts TLS 1.3+ at the edge for every published
  endpoint.
- Quarterly attestation: external scan + internal config audit confirm TLS
  1.3+ at all three hop classes; result archived in audit log.
- Substrate-pivot review: TLS 1.3+ posture verification is a named
  pre-promotion gate in the substrate-pivot runbook.
```

---

**EDIT 18B — Architecture line 42 (NFR property summary) — cross-link to §2.7a**

```
OLD:
- Security: PII AES-256 at rest; TLS 1.3+; cross-tenant isolation P0; tamper-evident audit
  log.

NEW:
- Security: PII AES-256 at rest (see §2.7); TLS 1.3+ pinned at edge / internal-hop /
  external-integration hop classes (see §2.7a); cross-tenant isolation P0;
  tamper-evident audit log.
```

---

### Finding 1 — UX↔PRD FR cross-reference appendix

**Defect:** UX spec line 44 commits an appendix "PRD FR ↔ Trust Loop" cross-reference table. The appendix was never authored. Meanwhile, UX §9 (User Journey Flows, line 1367) uses a loop-local FR numbering scheme that does **not** match PRD's global FR-N. Examples:

| UX local FR (in §9) | UX meaning | PRD global FR (same number) | PRD meaning |
|---|---|---|---|
| FR-7 | Sahyog assignment (Journey 1) | FR-7 | Versioned per-Pariwar rule registry |
| FR-8 | UPI Intent payment (Journey 1) | FR-8 | Lock-in policy ramp |
| FR-9 | SIE reconciliation (Journey 1) | FR-9 | (PRD §4 numbering) |
| FR-12 | Claim intake (Journey 2) | FR-12 | (PRD §4 numbering — distinct from UX §9 usage) |
| FR-13 | Death cert upload (Journey 2) | FR-13 | (PRD §4 numbering) |
| FR-14 | Nominee handover (Journey 2) | FR-14 | (PRD §4 numbering) |
| FR-19 | Close-of-cycle celebration | FR-19 | (matches in most places — coincidental) |

Story authors, test designers, and auditors reading UX §9 cannot reliably resolve "FR-7" to the right PRD requirement without external context. The epics doc bridges informally but does not substitute for an explicit map.

**Resolution:** Append a new appendix to the UX spec — **Appendix A: PRD FR ↔ Trust Loop cross-reference** — with three parts:

1. **Numbering convention statement** — declares that all FR-N references inside UX §1–§9 are loop-local unless prefixed `PRD FR-N`; the appendix is the canonical map.
2. **Mapping table** — every UX-local FR-N cited anywhere in §9 (Journeys 1–6) and §1 (Trust Loops, where the "Realizes FR-X" annotation appears) mapped to its PRD FR-N (and inversely, every PRD FR referenced by a UX surface mapped to the Trust Loop / Journey that realizes it).
3. **Deferral note for UJ-5/6/7/8 surfaces** — explicitly records that admin / public / field-worker surfaces (PRD UJ-5, UJ-6, UJ-7, UJ-8) are committed at component-spec granularity (UX §10–§11) rather than at dedicated journey-diagram granularity. This converts the IR Report's Finding 2 (missing journey diagrams) from a silent gap into a stated deferral.

The appendix is appended at the end-of-file after the existing final section. No edits to §1–§13 prose are required; the numbering-convention statement at the appendix head retroactively legitimizes the existing loop-local usage.

---

**EDIT F1A — NEW UX spec Appendix A (appended after final existing section)**

```
## Appendix A — PRD FR ↔ Trust Loop cross-reference

**Status:** Committed per UX spec §0.x discipline statement (line 44) — closes
the auditability gap between UX loop-local FR numbering and PRD's global FR-N.

### Numbering convention

All `FR-N` references within UX §1 (Trust Loops) and UX §9 (User Journey Flows)
are **loop-local** unless explicitly prefixed `PRD FR-N`. Loop-local numbers
index UX-spec internal grouping (one number per trust-loop primitive) and do
NOT correspond to PRD §4 global FR-N. Future agents resolving an FR reference
in UX §1 or §9 must consult this appendix; references in other sections
(§2–§8, §10–§13) follow PRD global numbering directly.

### Mapping table — UX local → PRD global

| UX §9 cite | UX meaning | PRD FR-N | PRD meaning |
|---|---|---|---|
| FR-7 (Journey 1) | Sahyog (pool) assignment | PRD FR-… | … |
| FR-8 (Journey 1) | UPI Intent payment | PRD FR-… | … |
| FR-9 (Journey 1) | SIE reconciliation | PRD FR-… | … |
| FR-12 (Journey 2) | Claim intake | PRD FR-… | … |
| FR-13 (Journey 2) | Death cert upload | PRD FR-… | … |
| FR-14 (Journey 2) | Nominee handover | PRD FR-… | … |
| FR-19 | Close-of-cycle celebration | PRD FR-19 | (coincidental match — verify per-cite) |
| … | (one row per loop-local FR cite in §1 and §9) | … | … |

*(Table rows to be populated by mechanical pass through §1 and §9 against the
canonical PRD FR list at apply-time.)*

### Inverse mapping — PRD FR → UX surface

| PRD FR-N | Realized in UX | Section / Journey |
|---|---|---|
| PRD FR-1 (signup + Vyawastha Shulk) | UJ-1 surface | — see §1 onboarding loop |
| … | (one row per PRD FR with a UX surface; PRD FRs without a UX surface noted as "non-UX-bearing") | … |

### UX coverage of PRD User Journeys

| PRD UJ | UX coverage | Notes |
|---|---|---|
| UJ-1 (member signup → first sahyog) | UX §9 Journey 1 (Sushil) | Full dedicated diagram |
| UJ-2 (claim filing on deceased's phone) | UX §9 Journey 2 (Ravi-mode) | Full dedicated diagram |
| UJ-3 (helpline-mediated claim) | UX §9 Journey 3 (Priya path) | Full dedicated diagram |
| UJ-4 (nominee reconciliation) | UX §9 Journey 4 (Sunita) | Full dedicated diagram |
| UJ-5 (admin verification queue) | UX §9 Journey 5 (Anita) + §11 component specs | Diagram + component-level coverage |
| UJ-6 (public-website visitor) | UX §11 component specs (Sahyog List, Niyamavali public, Shradhanjali, Member Directory) | **Deferred to component-level**; no dedicated journey diagram |
| UJ-7 (field-worker dispatch / on-site verification) | UX §11 component specs (FieldWorkerDispatchScheduler, intake decision strips) | **Deferred to component-level**; no dedicated journey diagram |
| UJ-8 (trustee panel — Niyamavali amendment, voting, audit-of-Anita) | UX §11 component specs (Tier-2 trustee tooling inventory at §11) | **Deferred to component-level**; no dedicated journey diagram |
| UJ-9 (viral acquisition / invite a fellow teacher) | UX §9 Journey 6 + §1 secondary growth loop | Full dedicated diagram |
| UJ-10 (… per PRD enumeration) | (per PRD UJ-10 surface) | (per realization at apply-time) |

**Deferral rationale (UJ-5 admin component-level / UJ-6 public / UJ-7
field-worker / UJ-8 trustee):** these surfaces are operator-class or
public-class flows whose UX risk concentrates in component composition
(decision strips, queue triage, lookup forms, public list rendering) rather
than in journey-grammar novelty. Component-level specs in §11 commit
sufficient grammar for downstream build; journey diagrams would be cosmetic
and add maintenance cost without proportional clarity gain. If usability
testing under §13 surfaces surface-level grammar issues for any of these UJs,
a dedicated journey diagram is added then.

### Maintenance discipline

When a new FR is added to PRD or a new loop is added to UX §1/§9, this
appendix is updated as part of the same change. CI need not enforce; the
discipline is editorial.
```

---

## 5. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| The §1.7 JSONB edit changes governance authority over numeric values. If Trustee-Panel review process for these values doesn't exist yet, the framing is aspirational. | Acceptable. The Trustee-Panel review process exists for analogous policy classes (FR-15 fixed amount, FR-8 lock-in policy). Reusing the same process is a one-line ADR commitment; no new governance machinery required. |
| The §2.7a TLS commitment adds a CI gate ("integration test asserts TLS 1.3+ at the edge") and a quarterly attestation. Both have ongoing operational cost. | Both are low-cost: TLS posture check is a single curl + cipher-list parse; quarterly attestation is a 30-minute scan-plus-log task. Cost is bounded; cost of *not* having the property anchor is unbounded (silent substrate downgrade). |
| The UX appendix mapping table will need ~30 minutes of mechanical population at apply-time. The table stubs above use `…` placeholders. | Acceptable. The structural commitment lands now; the mechanical population happens during apply. The table can also be regenerated from a script if FR-cite count grows. |
| The deferral note for UJ-5/6/7/8 is a permanent record that some surfaces don't get dedicated journey diagrams. A future reviewer might re-open this. | Acceptable. The deferral note explicitly carves the door open: "If usability testing under §13 surfaces surface-level grammar issues … a dedicated journey diagram is added then." Re-opening is anticipated, not surprising. |

---

## 6. Apply Order

1. Apply EDIT 16A to `architecture.md` §1.7.
2. Apply EDIT 18A (new §2.7a) and EDIT 18B (line 42 cross-link) to `architecture.md`.
3. Apply EDIT F1A (Appendix A) to `ux-design-specification.md`, populating mapping-table rows from a mechanical pass over UX §1 and §9 against the canonical PRD FR-N list.
4. Verify: re-read §1.7, §2.7a, line 42, and UX Appendix A; confirm internal cross-references resolve.
5. Update `implementation-readiness-report-2026-05-28.md` (or add a 2026-05-29 supplement) noting that findings 1, 16, and 18 are closed.
6. Proceed to `bmad-testarch-test-design` (risk-based test plan informs sprint sequencing).
7. Then `bmad-sprint-planning`.

---

## 7. Disposition of IR Report Findings After Apply

Three states are distinguished:

- **Closed by [edit]** — the gap no longer exists; the artifact was authored.
- **Resolved via explicit deferral** — the gap still exists, but it is now *intentional*; the rationale is recorded; revisit conditions are stated. Nothing was built or diagrammed.
- **Not addressed** — reviewed and skipped by this addendum; revisit elsewhere.

| Finding | Disposition |
|---|---|
| Finding 1 (UX↔PRD FR appendix) | **Closed** by EDIT F1A — appendix authored with populated mapping tables. |
| Finding 2 (UJ-5/6/7/8 missing journey diagrams) | **Resolved via explicit deferral** — see EDIT F1A's UX coverage table for the deferral note and revisit condition (§13 usability testing surfacing surface-level grammar issues triggers per-UJ diagram authoring). The gap is unchanged; what changed is that it is now intentional, with rationale visible to future reviewers. Nothing was diagrammed. |
| Finding 3 (Epic 1 narrative reframe) | **Not addressed.** Optional cosmetic; revisit at Epic 1 retrospective. |
| Architecture Item 16 (JSONB limits framing) | **Closed** by EDIT 16A — §1.7 closing paragraph rewritten in place. |
| Architecture Item 18 (TLS 1.3+ pinning) | **Closed** by EDIT 18A (new §2.7a) and EDIT 18B (line 42 cross-link). |
| AR-69 9 deferred ADRs | **Unchanged.** Tracked as first-sprint-encounter ADRs per parent SCP; not in scope for this addendum. |
