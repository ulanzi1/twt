# `packages/contracts/src/partners/`

Transport-layer contracts for **partner integrations** — partner identity, partner JWT signing handoff per architecture §5.9 + §3.7, partner-facing module-marketplace surfaces, per-partner contract metadata.

## Landing Story

Substantive contracts authored at **Stories 12.x** — partner JWT signing key per-partner storage + Module Marketplace partner-facing surfaces per epics Epic 12. Partner JWT signing key storage lives in the high-sensitivity tier per architecture §5.9; the ADR for per-partner storage is `ADR-NNNN-partner-jwt-signing-key-storage` (Section G of `docs/knowledge-transfer/adr-index.md`).

## Discipline reminders

- **`.strict()` default.** Every `z.object({...})` MUST end with `.strict()` per architecture §Format patterns line 3824-3826. The `_common/strict.ts` runtime helper + the Story 1.16a friction-budget ESLint rule (deferred per `_bmad-output/implementation-artifacts/deferred-work.md` D6-1.4) jointly police drift.
- **Tenant scoping.** Partner endpoints are global-scoped (cross-Pariwar): `/api/v1/global/partners/...` per architecture §3.1 line 1799.
- **No type-shadowing.** Per architecture §Naming patterns line 3719-3723 + Top-10 anti-pattern #2: do NOT redeclare types in `apps/api/modules/partners/partners.types.ts` that shadow contracts here. Consume via `import type { Foo } from '@twt/contracts/partners'`.
