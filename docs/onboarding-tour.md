# TWT day-1 reading list

Per architecture §Onboarding artifacts (architecture lines 4046-4057), this file lists the canonical-example pointers a new contributor reads on day one. The list at PR-1 reserves the structure with placeholders; canonical examples fill in as the surfaces they exemplify land in downstream Epic 1 / 7 / 8 stories.

## Read these to learn how TWT is built

1. **One canonical `service.ts`** — TBD (lands with the Claim creation feature per architecture §Golden example feature, architecture lines 3642-3655 — Epic 7 / Epic 8 territory).
2. **One canonical `repo.ts`** — TBD (same feature).
3. **One canonical `handler.ts`** — TBD (same feature).
4. **One canonical Zustand store** — TBD (mobile member surface).
5. **One canonical feature test** — TBD (Claim creation integration test).
6. **One canonical `packages/contracts/` schema** — TBD (Story 1.4).
7. **One canonical ADR** — TBD (Stories 1.2-1.17 will populate ADRs per architecture §Implementation Handoff PR-2 sequence).
8. **One canonical runbook** — see `docs/runbooks/` (Story 0.1 authored the initial pack).

## Companion reading

- `docs/adr/` — Architecture Decision Records (substantive ADRs land in PR-2 work; the directory is reserved at PR-1).
- `docs/runbooks/` — Phase-0 operational runbooks (Story 0.1 authored).
- `docs/escrow/` — Credential + code escrow framework (Stories 0.2 + 0.3 authored).
- `docs/degradation-policy/` — Per-surface degradation policy (Story 0.4 authored).
- `docs/knowledge-transfer/` — KT pack with ADR index (Story 0.5 authored).
- `docs/backup-engineer/` — Backup-engineer scope-of-work (Story 0.6 authored).
- `docs/fallback-handler-ledger/` — Fallback-handler rota + SLAs (Story 0.7 authored).
- `docs/spec-to-cadence-reconciliation/` — Spec-to-cadence funding reconciliation (Story 0.12 authored).
- `docs/legal-counsel-engagement/` — Legal counsel concurrent-review engagement (Story 0.13 authored).
- `docs/native-stack-validation/` — Native-stack experiment + ratify-or-pivot framework (Story 0.14 authored).
- `docs/launch-gate-inventory/` — Architectural launch-gate inventory + monthly cadence (Story 0.15 authored).
- `docs/policies/` — Standing product/member policies (Story 8.10 authored). Currently: the UX-DR76 out-of-band contribution policy, which is load-bearing for anyone touching contribution ingest — it commits the trust to having **no** data path for direct-to-family gifts, and names the fences that keep it that way.

## When to update this file

When a downstream story lands a **canonical example** of any of the eight named patterns above, that story's PR also updates this file to swap the `TBD` for a concrete link. The day-1 reading list is a moving index; the slot names are stable, the link targets fill in.
