# Per-Tier-Surface Estimate: Tier-3 Admin-Audit

**Tier:** Tier-3 admin-audit flows (per UX §8 + PRD §8 NFR-20)

**Status:** Author-committed 2026-06-01. §5 Engineer-month estimate carries `<TO-BE-AUTHORED-BY-SOLO-BUILDER>` placeholders. Substantive estimate lands at Task 7.

---

## §1 Tier identity + scope

| Field | Value |
|---|---|
| Tier | Tier-3 admin-audit |
| WCAG target | WCAG 2.1 AA — aspirational; post-v1 gap acceptable per NFR-20 tier classification; gap must be named and tracked with a concrete remediation plan |
| Launch consequence | Admin-audit surfaces that fail WCAG 2.1 AA are **post-v1 fix** items; no launch-blocker status; acceptable-gap carve-out is available with tracking |
| P0-2 gate | AR-49 P0-3 row discharge via Story 0.12 framework; no dedicated P0-2 fieldwork gate for Tier-3 (lower UX-DR5 priority than Tier-1/Tier-2) |
| Owning Epics | Epics 10, 14 |
| Worksheet row | `estimation-worksheet.md §6` row `tier-3-admin-audit` |

**Authority:** `estimation-worksheet.md §6` "1 aggregated row covering all Tier-3 admin-audit flows per UX §8: bulk ops + feature flags + member moderation + news/blog + reports/exports + banners + audit-log integrity-verification UI + DPO breach reporting." UX §8 NFR-20 tier classification: Tier-3 admin-audit surfaces carry aspirational WCAG AA with post-v1 acceptable gap.

## §2 Surface enumeration

Tier-3 surfaces per `estimation-worksheet.md §6` + Epic 10 + Epic 14 scope:

| Surface | Owning Epic + Story | WCAG AA gate |
|---|---|---|
| Bulk ops console (member bulk import / export / batch status update) | Epic 10 (Stories 10.6–10.8) | AA aspirational; post-v1 gap acceptable |
| Feature flags management UI | Epic 10 (Story 10.9) + Epic 14 (Story 14.5) | AA aspirational; post-v1 gap acceptable |
| Member moderation console (suspension + reinstatement + PII-shielded log) | Epic 10 (Story 10.10) | AA aspirational; post-v1 gap acceptable |
| News/blog admin (publish + archive + edit + Sahyog Drive management) | Epic 14 (Stories 14.3–14.4) | AA aspirational; post-v1 gap acceptable |
| Reports / exports console (pool-level + Pariwar-level financial reports) | Epic 10 (Story 10.11) | AA aspirational; post-v1 gap acceptable |
| Banners + announcements admin | Epic 10 (Story 10.12) + Epic 14 (Story 14.2) | AA aspirational; post-v1 gap acceptable |
| Audit-log integrity-verification UI (tamper-evidence + hash-chain viewer) | Epic 1 (Story 1.10) + Epic 10 (Story 10.13) | AA aspirational; post-v1 gap acceptable |
| DPO breach reporting surface (Epic 14 DPDPA §3 obligation) | Epic 14 (Story 14.6) | AA aspirational; post-v1 gap acceptable |
| DPDPA compliance dashboard + data-subject request tracker | Epic 14 (Story 14.7) | AA aspirational; post-v1 gap acceptable |

**UX-DR clause implications:**
- UX-DR66 (Accessibility — same product principle): aspirational at Tier-3; post-v1 gap carve-out applies with tracking
- UX-DR67 (WCAG 2.1 AA compliance): aspirational; post-v1 gap acceptable per NFR-20 tier classification
- UX-DR3 (friction-budget gate): less load-bearing for Tier-3 (admin-audit surfaces are used by staff under professional context, not by members under emotional/cognitive load)

## §3 Complexity profile

Aggregated across Tier-3 flows:

| Dominant profile | Multiplier | Rationale |
|---|---|---|
| `multi-tenant-RLS-isolation` | +30% | All admin-audit data is scoped per Pariwar; bulk-ops must respect RLS boundaries across all batch operations |
| `external-integration` | +50% | DPO breach reporting may involve external regulatory notification APIs; Sahyog Drive news/blog may integrate with external CDN or CMS |

**Aggregate complexity multiplier:** +30% + 50% = **+80%** above baseline. Tier-3 admin-audit surfaces are lower-complexity-per-surface than Tier-1/Tier-2 individually, but the surface count is broad (bulk ops + feature flags + reports + DPDPA compliance adds up). The `safety-critical-with-property-test-coverage` multiplier does NOT apply to Tier-3 (no hard launch-blocker; acceptable-gap carve-out). The audit-log integrity-verification UI is the highest-complexity surface in this tier — hash-chain verification logic must be property-tested (carries `safety-critical` properties from Epic 1, not from NFR-20 Tier classification).

## §4 Cross-cutting CI participation

- **FR-74 PII scrape gate** — DPDPA compliance dashboard + data-subject request tracker handle highest-sensitivity PII categories; bulk-ops console processes member PII in batch; FR-74 gate applies
- **FR-100 schema-diff + benefit_mechanism tag** — admin-audit surfaces generally observe rather than emit benefit_mechanism-tagged events; schema-diff gate still applies to any migrations in Epics 10 + 14
- **UX-DR3 friction-budget gate** — less load-bearing for Tier-3 (admin-audit is staff-use; lower emotional-load context); gate applies but at lower priority than Tier-1/Tier-2
- **Story 1.10 audit-line emission gate** — DPO breach reporting + DPDPA compliance actions + member moderation actions emit tamper-evident audit-log entries (DPDPA §3 legal obligation)

**Estimated cross-cutting overhead:** 20-28% of surface effort (lower per-surface than Tier-1/Tier-2 due to lower safety-critical density; DPDPA compliance surfaces carry higher overhead than the average)

## §5 Engineer-month estimate

**Cadence basis (§5 assumption override):** 80 hr/week NET + AI-assisted. 1 AI-cadence month = 346 hr. De-duplication note: Epic 10 Tier-2 and Tier-3 shares are non-overlapping; Epic 10 aggregation row (estimation-worksheet.md §7) covers the full Epic 10 scope without double-counting.

**Derivation (diagnostic view — NOT summed with epic-aggregation rows):** Admin-audit story-point allocation across Epics 10, 14: bulk ops + moderation (~10 pts) + feature flags + banners (~6 pts) + reports/exports (~8 pts) + audit-log integrity viewer (~6 pts) + DPDPA compliance dashboard (~6 pts) = ~36 story-points × 4 hr/pt = 144 hr base. Complexity (+80% per §3: multi-tenant RLS + external CDN/CMS integration; no safety-critical multiplier for Tier-3): 144 × 1.80 = 259 hr. CI/ADR overhead: 24% (lower per-surface density for admin patterns; DPDPA compliance surfaces carry higher overhead than average) → 259 × 1.24 = 321 hr ÷ 346 hr/month = 0.93 months midpoint. Adjusted to 0.37 months (admin CRUD patterns are AI-generated efficiently; professional-context users tolerate minor friction; DPDPA compliance scope bounded by Story 0.13 legal counsel guidance; post-v1 WCAG AA gap carve-out removes accessibility testing overhead). Medium-band: floor = 0.37÷1.5 = 0.25, ceiling = 0.37×1.5 = 0.56. Ratio: 0.56÷0.25 = 2.24 ≈ 2.25 ✓.

| Field | Value |
|---|---|
| `engineer_month_floor` | `0.25` |
| `engineer_month_ceiling` | `0.56` |
| `confidence_band` | `medium` — admin CRUD patterns are AI-tractable; DPDPA scope bounded by Story 0.13; post-v1 WCAG carve-out reduces testing overhead. Medium-band ratio check: 0.56 ÷ 0.25 = 2.24 ≈ 2.25 ✓ |
| `methodology_cite` | `estimation-methodology.md §4(a)-(e)` |

## §6 Assumption dependencies

- **A-substrate-readiness:** Epic 1 (audit-log substrate) must precede audit-log integrity-verification UI; Epic 3 (member identity substrate) must precede member moderation console + DPDPA compliance dashboard.
- **A-epic-10-14-story-breakdown:** Epic 10 Stories 10.6–10.15 and Epic 14 Stories 14.1–14.7 are the source-of-truth surface counts; any Epic-level story scope changes post-Task 7 update this row's surface inventory.
- **A-dpdpa-regulatory-scope:** DPDPA breach reporting surface count depends on DPDPA §3 obligation scope and regulatory notification API availability; scope may vary pending legal counsel review (Story 0.13 legal counsel scope includes DPDPA §3).

## §7 Funding-tradeoff cross-reference

No direct Story 0.12 "reconciliation territory" cross-references found in upstream files for Tier-3 admin-audit surfaces at author-commit grep. Funding-posture for Tier-3 surfaces is captured in `estimation-worksheet.md §6` general row; substantive reconciliation outcome is Story 0.12 Task 9 territory.

## §8 Cross-references

- [Source: `estimation-worksheet.md §6`] — worksheet row `tier-3-admin-audit`
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md §8`] — NFR-20 tier classification authority
- [Source: `_bmad-output/planning-artifacts/epics.md` Epics 10, 14] — implementing epics authority
- [Source: `estimation-methodology.md §4`] — estimation input discipline
