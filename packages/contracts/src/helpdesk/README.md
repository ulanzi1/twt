# `packages/contracts/src/helpdesk/`

Transport-layer contracts for the **Helpdesk** first-class subsystem per AR-47 + FR-52 — ticket create + update + escalate + close, attachment surface, operator console transport surface, call-to-ticket bridge per Persona #7.

## Landing Story

Substantive contracts authored at **Stories 10.x** — helpdesk ticket model + helpline operator surface + telephony integration per epics Epic 10. Telephony integration ADR is `ADR-NNNN-telephony-integration-helpline` (Section A row 27) + `ADR-NNNN-telephony-provider-final` (Section B row 8).

## Discipline reminders

- **`.strict()` default.** Every `z.object({...})` MUST end with `.strict()` per architecture §Format patterns line 3824-3826. The `_common/strict.ts` runtime helper + the Story 1.16a friction-budget ESLint rule (deferred per `_bmad-output/implementation-artifacts/deferred-work.md` D6-1.4) jointly police drift.
- **Tenant scoping.** Helpdesk endpoints are tenant-scoped: `/api/v1/p/<pariwar_id>/helpdesk/...` per architecture §3.1 line 1798.
- **No type-shadowing.** Per architecture §Naming patterns line 3719-3723 + Top-10 anti-pattern #2: do NOT redeclare types in `apps/api/modules/helpdesk/helpdesk.types.ts` that shadow contracts here. Consume via `import type { Foo } from '@twt/contracts/helpdesk'`.
