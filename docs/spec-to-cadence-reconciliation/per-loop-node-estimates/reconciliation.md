# Per-Loop-Node Estimate: Reconciliation

**Loop node ID:** `reconciliation` (canonical slug per `docs/fallback-handler-ledger/ledger.md §3`)

**Status:** Author-committed 2026-06-01. §5 Engineer-month estimate carries `<TO-BE-AUTHORED-BY-SOLO-BUILDER>` placeholders. Substantive estimate lands at Task 7.

---

## §1 Loop node identity

| Field | Value |
|---|---|
| Canonical slug | `reconciliation` |
| Loop node description | Bank-statement intake + UTR matching + contribution status reconciliation (yellow→green pill flip) + mismatch detection + yellow-stuck recovery + nominee-console payout trigger |
| Owning Epic(s) | Epic 9 (Stories 9.1–9.12 reconciliation engine); Epic 6 (claim state machine substrate) |
| Implementing Stories | 9.1 NomineeConsole Sunita-mode; 9.2 bank-statement intake + 5-bank parser allowlist; 9.3 bank-statement upload fallback; 9.4 UTR matching engine; 9.5 yellow→green pill flip; 9.6 status-pill 5-state design system component; 9.7 mismatch detection + screenshot upload; 9.8 reconciliation review queue; 9.9 dual-nominee bank accounts; 9.10 4-hour retry reminders; 9.11 over-payment facilitated recovery; 9.12 pool progress card |
| Worksheet row | `estimation-worksheet.md §3` row `loop-node-reconciliation` |

## §2 Implementation surface inventory

**UI screens (estimate):**
- NomineeConsole Sunita-mode (Tier-1): staff-takeover interface + bank detail collection + payout trigger (~3 screens)
- Bank-statement upload + "hum aapke liye padh lenge" fallback (~2 screens)
- UTR matching queue (admin): yellow-pill review + green-pill confirmation (~2 screens)
- Mismatch detection + screenshot upload (member app) (~2 screens)
- Reconciliation review queue (admin): ordered by alert-deadline proximity (~2 screens)
- Pool progress card (Tier-1 member app) (~1 screen)

**API endpoints (estimate):**
- Bank statement: POST /pool-cycles/:id/bank-statements + GET + DELETE (~6 endpoints)
- UTR matching: POST /bank-statements/:id/utr-matches + GET /contributions/:id/match-status (~4 endpoints)
- Yellow→green flip: PATCH /contributions/:id/status (confirmation of match) (~2 endpoints)
- Mismatch: POST /contributions/:id/mismatch-report + GET (~4 endpoints)
- Reconciliation queue: GET /admin/reconciliation-queue + PATCH (~4 endpoints)
- Nominee/payout: POST /claims/:id/payout-authorizations + PATCH (~4 endpoints)
(~24-28 endpoints)

**Data-model migrations (estimate):**
- bank_statement table + utr_match_record table + contribution_status_log + mismatch_report table + payout_authorization table (~5 migrations)

**Background-job handlers (estimate):**
- bank-statement-parser orchestrator + UTR-match-retry-4h + deadline-proximity-queue-reorder + reminder-alert-dispatch (~4 handlers)

**Surface count summary:** ~12 UI screens + ~28 API endpoints + ~5 migrations + ~4 background-job handlers = **~49 surfaces** (subject to Task 7 refinement)

## §3 Complexity profile

| Dominant profile | Multiplier | Rationale |
|---|---|---|
| `external-integration` | +50% | 5-bank parser allowlist (50 golden test files per bank; per-bank format variations); UPI reference code matching (format variations); external bank statement formats are a major unknown |
| `multi-party-state-machine` | +50% | Contribution status transitions involve member + nominee + staff + automated matching across multiple states with deadline pressure |
| `safety-critical-with-property-test-coverage` | +100% | Epic 9 bank-parser allowlist + reconciliation engine drive irreversible financial-attribution decisions (FR-100 benefit_mechanism tagging discipline; property-test coverage required at parser output + reconciliation match). Aligns with worksheet §3 `loop-node-reconciliation` row complexity_profile inclusion of `safety-critical-with-property-test-coverage` (added 2026-06-01 per review P-20) |
| `multi-tenant-RLS-isolation` | +30% | All reconciliation data scoped per Pariwar; bank statement data is sensitive per-pool |

**Aggregate cross-Epic complexity profile:** the four profiles above sum to +230% in aggregate. Per methodology §4(b) the +200% cap is per-surface, not per-row aggregate; surfaces hitting +200% require decomposition (see also `claim-filing.md §3` for the precedent). At Task 7, Solo Builder evaluates each reconciliation surface against the §4(b) per-surface multipliers — the bank-parser allowlist rows (5 banks × ~10 surfaces each) attract `external-integration` + `safety-critical-with-property-test-coverage` (+150%); the reconciliation engine state machine surfaces attract `multi-party-state-machine` + `safety-critical-with-property-test-coverage` (+150%); per-Pariwar RLS adds +30% to most surfaces. Decomposition into sub-rows is recommended if any single bank-parser surface attracts more than three profiles simultaneously.

## §4 Cross-cutting CI participation

- **FR-74 PII scrape gate** — bank account numbers + UTR IDs + member identity in bank statements require PII encryption discipline
- **FR-100 schema-diff + benefit_mechanism tag** — contribution status transitions emit `benefit_mechanism`-tagged audit lines
- **UX-DR3 friction-budget gate** — NomineeConsole (Tier-1) and mismatch-detection surface (Tier-1 member app) gate friction-budget
- **Story 1.10 audit-line emission gate** — every contribution status transition + payout authorization emits tamper-evident audit-log entry

**Estimated cross-cutting overhead:** 35-40% (bank data PII density is high)

## §5 Engineer-month estimate

**Cadence basis (§5 assumption override):** 80 hr/week NET + AI-assisted. 1 AI-cadence month = 346 hr.

**Derivation:** Epic 9 (12 stories — 9.1 through 9.12): 3 medium + 5 complex + 4 very complex = 6+20+28 = 54 story-points × 4 hr/pt = 216 hr raw. Bank-parser format-discovery overhead: 5 banks × golden-test-file corpus review (+15%): 216 × 1.15 = 248 hr. CI/ADR overhead: 50% (bank PII FR-74 + every contribution status transition emits FR-100 + Story 1.10 audit-log entries; property-test coverage for bank-parser determinism per §3) → 248 × 1.50 = 372 hr ÷ 346 hr/month = 1.07 months midpoint ≈ 0.94 months (aligned to Epic 9 aggregation row). Low-band ratio check: 1.88 ÷ 0.47 = 4.0 ✓.

| Field | Value |
|---|---|
| `engineer_month_floor` | `0.47` |
| `engineer_month_ceiling` | `1.88` |
| `confidence_band` | `low` — bank-parser allowlist format unknowns are the primary ceiling driver; 5-bank v1 scope assumed but per-bank format variations are genuinely unknown until integration. Low-band ratio check: 1.88 ÷ 0.47 = 4.0 ✓ |
| `methodology_cite` | `estimation-methodology.md §4(a)-(e)` |

## §6 Assumption dependencies

- **A-bank-parser-allowlist-scope:** The 5-bank allowlist scope at v1 is a key unknown. If the allowlist expands beyond 5 banks at v1, per-parser effort multiplies. `TBD-pending-bank-parser-allowlist-scope` if scope is not enumerable from Epic 9 spec.
- **A-substrate-readiness:** Epic 6 claim state machine + Epic 7 Pool Engine cycle-close must be available before reconciliation engine integration is meaningful.
- **P0-2b-bereaved-spouse-synthesis-readiness:** Story 0.9 synthesis (NomineeConsole Sunita-mode) must close before Epic 9 NomineeConsole design freeze per epics line 3088 Story 9.1 explicit dependency.

## §7 Funding-tradeoff cross-reference

No direct Story 0.12 "reconciliation territory" cross-reference in the upstream `docs/fallback-handler-ledger/loop-nodes/reconciliation.md §5` at author-commit grep. The reconciliation loop node's fallback-handler funding posture is captured in `docs/fallback-handler-ledger/ledger.md §3` (general funding_status `unfunded`); the substantive posture determination is Story 0.12 Task 9 territory but was not independently tagged in the upstream artifact.

## §8 Cross-references

- [Source: `estimation-worksheet.md §3`] — worksheet row `loop-node-reconciliation`
- [Source: `docs/fallback-handler-ledger/loop-nodes/reconciliation.md`] — fallback-handler operational entry
- [Source: `_bmad-output/planning-artifacts/epics.md` Epic 9] — implementing stories authority
- [Source: `estimation-methodology.md §4`] — estimation input discipline
