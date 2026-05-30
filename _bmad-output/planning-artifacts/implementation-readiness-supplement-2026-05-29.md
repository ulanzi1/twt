---
project: TWT
date: 2026-05-29
supplementTo: implementation-readiness-report-2026-05-28.md
appliesChange: sprint-change-proposal-addendum-2026-05-29.md
stepsCompleted:
  - apply-edit-16A
  - apply-edit-18A
  - apply-edit-18B
  - apply-edit-F1A
  - verify-cross-references
  - record-disposition
artifactsModified:
  architecture:
    - _bmad-output/planning-artifacts/architecture.md (§1.7 closing paragraph; new §2.7a; line 42 NFR summary)
  ux:
    - _bmad-output/planning-artifacts/ux-design-specification.md (new Appendix A — A.1 through A.5)
  governance:
    - _bmad-output/planning-artifacts/sprint-change-proposal-addendum-2026-05-29.md (Status banner; per-edit apply verification block)
---

# Implementation Readiness Supplement — 2026-05-29

**Parent report:** [`implementation-readiness-report-2026-05-28.md`](./implementation-readiness-report-2026-05-28.md)
**Triggering change:** [`sprint-change-proposal-addendum-2026-05-29.md`](./sprint-change-proposal-addendum-2026-05-29.md)
**Purpose:** Record disposition of the five findings tracked by the 2026-05-28 IR report (Minor Findings 1, 2, 3 + Architecture Spot-Check Items 16, 18) after the 2026-05-29 addendum's edits were applied. The 2026-05-28 snapshot is preserved as-of-its-date; this supplement records the post-apply state and the updated readiness verdict.

---

## 1. Disposition Summary

Closure language follows the three-state convention named in the addendum §7 and in the project's standing discipline:

- **Closed by [edit]** — the gap no longer exists; the artifact was authored.
- **Resolved via explicit deferral** — the gap remains, but it is now *intentional*; rationale + revisit condition are recorded in-artifact.
- **Not addressed** — reviewed and skipped by this round; revisit elsewhere.

| Finding | 2026-05-28 wording (summary) | 2026-05-29 disposition | Closure evidence |
|---|---|---|---|
| **Minor Finding 1** | UX spec promised "PRD FR ↔ Trust Loop" cross-reference appendix is missing | **Closed by [edit]** — EDIT F1A | `ux-design-specification.md` Appendix A (line 2757); A.1 numbering convention + A.2 mapping table (UX §9 loop-local → PRD global) + A.3 inverse mapping (PRD UJ → UX coverage) + A.5 maintenance discipline, all populated (no `…` placeholders). |
| **Minor Finding 2** | PRD UJ-5 / UJ-6 / UJ-7 / UJ-8 lack dedicated UX journey diagrams | **Resolved via explicit deferral** — EDIT F1A §A.3 + §A.4 | `ux-design-specification.md` Appendix A §A.3 marks each affected UJ as *"Component-level; resolved via explicit deferral — see §A.4"*; §A.4 records the rationale (operator-class / public-class surfaces whose UX risk concentrates in component composition rather than journey-grammar novelty) and the revisit condition (§13 usability testing surfacing surface-level grammar issues triggers per-UJ diagram authoring). Nothing was diagrammed; what changed is that the gap is now intentional, with rationale visible to future reviewers. |
| **Minor Finding 3** | Epic 1 narrative framing is borderline-technical (infrastructure-first) | **Not addressed** | Optional cosmetic only; story-level user-value is already present (Stories 1.6, 1.10, 1.11b). Revisit at Epic 1 retrospective per addendum §7. |
| **Architecture Spot-Check Item 16** | §1.7 JSONB system-integrity limits framed as engineer-controlled; mis-locates the architectural-commitment vs Trustee-Panel-policy boundary | **Closed by [edit]** — EDIT 16A | `architecture.md` §1.7 closing paragraph (~lines 966–984) rewritten: the *existence* of the three limit classes (payload size, nesting depth, GIN growth ceiling) is now declared architecturally frozen; the *specific numeric values* are declared operational policy under Trustee-Panel review; values live in `packages/domain/` as named constants and are revisable on Trustee-Panel authority (cf. FR-15 fixed-amount, FR-8 lock-in policy). Specific current values + the review/escalation procedure are committed in an ADR (deferred ADR slot). |
| **Architecture Spot-Check Item 18** | TLS 1.3+ appears only at line 42 as a one-line NFR summary; not a named freeze entry; not pinned distinctly at edge / internal-hop / external-integration | **Closed by [edit]** — EDITs 18A + 18B | `architecture.md` new §2.7a "Transport encryption — TLS 1.3+ pinned at three hop classes" (inserted between §2.7 and §2.8, line 1535) commits TLS 1.3+ as a frozen property at all three hop classes with substrate-pivot-safety language and a deferred-to-ADR list (cipher suites, mTLS at internal-hop, cert pinning at client, rotation cadence, substrate-specific TLS terminator config). Line 42 NFR property summary now cross-links bidirectionally: *"PII AES-256 at rest (see §2.7); TLS 1.3+ pinned at edge / internal-hop / external-integration hop classes (see §2.7a)."* |

**Net:** Three findings closed by [edit], one resolved via explicit deferral, one not addressed.

---

## 2. Three-Doc Discipline Reaffirmation

All three closed-by-edit items conform to the project's three-doc discipline (cf. parent SCP, addendum §1 triggering principle):

- **PRD owns business policy** — eligibility, cadence, consequences.
- **Architecture owns structural semantics** — state, transitions, events, *properties*.
- **ADRs own implementation specifics** — vendor controls, cipher suites, numeric thresholds.

Per-edit attribution:

| Edit | Architecture commitment (property) | ADR-territory residue |
|---|---|---|
| EDIT 16A | Existence of three system-integrity limit classes is frozen at every JSONB write path | Specific numeric values + the Trustee-Panel review/escalation procedure |
| EDIT 18A | TLS 1.3+ at edge / internal-hop / external-integration is frozen across substrate pivots | Cipher suite allowlist + ordering; mTLS at internal-hop; client cert pinning; TLS-cert rotation cadence; substrate-specific TLS terminator configuration |
| EDIT 18B | Architectural property is bidirectionally cross-linked from NFR-15's line-42 summary | — |
| EDIT F1A | Translation layer between UX §9 loop-local FR-N and PRD global FR-N is committed; UJ coverage form is committed per-UJ | — |

No new ADR was authored in this supplement; the deferred ADR slots are tracked under AR-69 (9 deferred ADRs) and resolve as the first sprint that touches each closes it. Addendum §7 explicitly carries this forward as **Unchanged**.

---

## 3. Re-Verification Pass

Each in-place edit was re-read post-apply to confirm internal cross-references resolve. Results:

| Cross-reference | Source | Target | Resolves |
|---|---|---|---|
| Line 42 → §2.7 | `architecture.md` line 42 (NFR property summary) | `architecture.md` §2.7 PII encryption at rest (line 1498) | ✓ |
| Line 42 → §2.7a | `architecture.md` line 42 (NFR property summary) | `architecture.md` §2.7a Transport encryption (line 1535) | ✓ |
| §2.7a → §5.8a edge | `architecture.md` §2.7a hop-class 1 | `architecture.md` §5.8a Cloudflare + pivot-readiness | ✓ |
| §2.7a → §2.8 DigiLocker | `architecture.md` §2.7a hop-class 3 | `architecture.md` §2.8 DigiLocker integration (line 1600) | ✓ |
| §2.7a → §2.9 service-to-service | `architecture.md` §2.7a hop-class 2 + ADR-territory mTLS bullet | `architecture.md` §2.9 (workers split + mTLS deferral) | ✓ |
| §2.7a → §3.6, §3.3, §3.11 | `architecture.md` §2.7a hop-class 3 | bank statement intake; FCM/APNs; webhook ingress | ✓ |
| §2.7a → NFR-15 | `architecture.md` §2.7a Cross-references block | `epics.md` NFR-15 (in-transit TLS 1.3+ at edge + internal hops) | ✓ |
| §1.7 → FR-15, FR-8 | `architecture.md` §1.7 closing paragraph | PRD FR-15 fixed-amount; PRD FR-8 lock-in policy (review-path analogues) | ✓ |
| UX Appendix A → addendum | `ux-design-specification.md` Appendix A status line | `sprint-change-proposal-addendum-2026-05-29.md` EDIT F1A | ✓ |
| UX Appendix A §A.2 → PRD FR-N | mapping table rows | PRD §4 canonical FR-N list | ✓ (FR-14, FR-17, FR-18, FR-19, FR-27, FR-28, FR-29, FR-30, FR-37, FR-38, FR-39, FR-40, FR-41, FR-47, FR-50, FR-77, FR-78, FR-82, FR-87 all cited; coincidental-match note recorded for FR-19; name-collision note recorded for UX §9 FR-15 vs PRD FR-15) |
| UX Appendix A §A.3 → PRD UJ-N | inverse mapping rows | PRD §3.2 UJ-1…UJ-10 enumeration | ✓ |

**Verdict on cross-references:** All in-file cross-references resolve. No dangling links introduced by the four edits.

---

## 4. Carry-Forward and Watch List

Items intentionally not modified by this supplement, tracked forward to Phase 4:

| Item | Origin | Watch condition |
|---|---|---|
| 9 deferred ADRs (AR-69) | Parent SCP 2026-05-27 | First sprint that touches each ADR scope closes it; no scheduled batch. |
| Epic 0 closure gate before Story 1.1 | `epics.md` epic dependency tree | Standard Phase-4 sequencing gate; unchanged by this round. |
| Story 0.14 (P0-5 native-stack validation) | `epics.md` Epic 0 | Gates substrate engineering per AR-49 substrate-conditional commitments. |
| UJ-5 / UJ-6 / UJ-7 / UJ-8 / UJ-10 journey-diagram revisit | UX Appendix A §A.4 | §13 usability testing surfacing surface-level grammar issues triggers per-UJ diagram authoring. |
| UJ-1 (signup) journey-diagram revisit | UX Appendix A §A.4 UJ-1 note | First-time-signup usability testing surfacing a need triggers diagram authoring. |
| Epic 1 narrative reframing (Minor Finding 3) | 2026-05-28 IR report | Revisit at Epic 1 retrospective. |
| §2.7a ADR-territory items (cipher suites, mTLS, cert pinning, rotation, terminator config) | New §2.7a deferred list | Each ADR is authored at first encounter in the relevant sprint (substrate selection, service split, client cert work, ops automation). |
| §1.7 JSONB limit values + Trustee-Panel review procedure | EDIT 16A "committed in an ADR" | ADR authored at first sprint touching the named-constants file or the Trustee-Panel policy surface (Story 10.12 candidate per IR-2026-05-28 Item 16 recommendation). |

---

## 5. Updated Readiness Verdict

**CLEAR for Phase 4 sprint planning.**

The 2026-05-28 verdict was *"READY for Phase 4 implementation, with two minor documentation-hygiene follow-ups and one cross-document architectural-detail spot-check."* As of 2026-05-29:

- The two minor documentation-hygiene follow-ups (Finding 1 + Finding 2) are resolved — one **closed by [edit]** (Finding 1: UX Appendix A authored), one **resolved via explicit deferral** (Finding 2: UJ-5/6/7/8 + UJ-10 component-level coverage with stated revisit condition).
- The cross-document architectural-detail spot-check (Items 16 + 18) is **closed by [edit]** on both items — §1.7 JSONB property/value boundary rewritten; §2.7a TLS 1.3+ pinned at three hop classes inserted with substrate-pivot-safe property language and ADR-territory deferral list; line 42 NFR cross-linked.
- The optional cosmetic finding (Finding 3 — Epic 1 narrative) is **not addressed**; deferred to Epic 1 retrospective; non-blocking.

No new findings were surfaced by the 2026-05-29 apply pass.

---

## 6. Recommended Next Steps

Per addendum §6 apply order, the remaining steps are:

1. **`bmad-testarch-test-design`** — risk-based test plan; informs sprint sequencing by identifying highest-risk stories first.
2. **`bmad-sprint-planning`** — generates the sprint status the implementation loop (Create Story → Dev Story → Code Review → Retrospective) will consume.

Optional companions before or alongside sprint planning:

- **`bmad-testarch-framework`** — initialize Playwright or Cypress scaffold (Phase 4 substrate setup).
- **`bmad-testarch-ci`** — wire the quality pipeline; the §2.7a CI gate (*"integration test asserts TLS 1.3+ at the edge for every published endpoint"*) lands here naturally.

---

## 7. Provenance

| Step | Actor | Date |
|---|---|---|
| 2026-05-28 IR report authored | BMad Implementation Readiness skill, invoked by BigDev | 2026-05-28 |
| Architecture spot-check on deferred Items 16 + 18 appended to IR report | BigDev | 2026-05-29 |
| Addendum SCP authored (EDITs 16A, 18A, 18B, F1A) | BigDev | 2026-05-29 |
| EDITs applied to `architecture.md` and `ux-design-specification.md` | BigDev | 2026-05-29 |
| Addendum Status banner updated to "Applied 2026-05-29" with per-edit verification block | BigDev | 2026-05-29 |
| This supplement authored | BigDev | 2026-05-29 |

**Supplement file:** `_bmad-output/planning-artifacts/implementation-readiness-supplement-2026-05-29.md`.
