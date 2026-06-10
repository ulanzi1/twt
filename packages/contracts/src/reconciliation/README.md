# `packages/contracts/src/reconciliation/`

Transport-layer contracts for the **reconciliation** subsystem — bank statement upload, parser normalization output, UTR matching surface, reconciliation triage UI, manual-intervention sub-flow per OQ-2.

## Landing Story

Substantive contracts authored at **Stories 9.2 / 9.4** — bank-statement intake + 5-bank parser allowlist + UTR matching engine per epics Epic 9. Bank-parser normalization output schema is committed at `ADR-NNNN-bank-statement-normalization-schema` (Section A row 14 of `docs/knowledge-transfer/adr-index.md`).

## Discipline reminders

- **`.strict()` default.** Every `z.object({...})` MUST end with `.strict()` per architecture §Format patterns line 3824-3826. The `_common/strict.ts` runtime helper + the Story 1.16a friction-budget ESLint rule (deferred per `_bmad-output/implementation-artifacts/deferred-work.md` D6-1.4) jointly police drift.
- **Tenant scoping.** Reconciliation endpoints are tenant-scoped: `/api/v1/p/<pariwar_id>/reconciliation/...` per architecture §3.1 line 1798.
- **No type-shadowing.** Per architecture §Naming patterns line 3719-3723 + Top-10 anti-pattern #2: do NOT redeclare types in `apps/api/modules/reconciliation/reconciliation.types.ts` that shadow contracts here. Consume via `import type { Foo } from '@twt/contracts/reconciliation'`.
