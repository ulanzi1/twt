# `packages/contracts/src/audit/`

Transport-layer contracts for the **audit log** surface — audit-log entry shape, hash-chain verification result, integrity-check job report, trustee-facing audit-log read surface.

## Landing Story

Substantive contracts authored at **Stories 1.10 / 1.11a / 1.11b** — tamper-evident audit log + integrity verification primitive + trustee-facing integrity verification UI per epics Epic 1. Hash-chain consumers use `canonicalJsonStringify` from `@twt/events` per ADR-0004. The transport shape for `events_log` rows (consumed at Stories 1.10 + 1.11b) lives at `_common/event-log-contract.ts` (authored at Story 1.4 as the demonstration case for the contract-↔-domain type-assignability test).

## Discipline reminders

- **`.strict()` default.** Every `z.object({...})` MUST end with `.strict()` per architecture §Format patterns line 3824-3826. The `_common/strict.ts` runtime helper + the Story 1.16a friction-budget ESLint rule (deferred per `_bmad-output/implementation-artifacts/deferred-work.md` D6-1.4) jointly police drift.
- **Tenant scoping.** Audit-log endpoints are tenant-scoped: `/api/v1/p/<pariwar_id>/audit/...` per architecture §3.1 line 1798. Trustee cross-Pariwar audit-read surface uses `/api/v1/global/audit/...`.
- **No type-shadowing.** Per architecture §Naming patterns line 3719-3723 + Top-10 anti-pattern #2: do NOT redeclare types in `apps/api/modules/audit/audit.types.ts` that shadow contracts here. Consume via `import type { Foo } from '@twt/contracts/audit'`.
