# `packages/contracts/src/modules/`

Transport-layer contracts for the **Module Marketplace** — module manifest schema, module lifecycle state machine, lead handoff per AR-42, in-Pariwar module install + activate + retire flows.

## Landing Story

Substantive contracts authored at **Stories 12.1 / 12.2 / 12.4+** — module manifest schema + module lifecycle state machine + grief-context module-shelf suppression per epics Epic 12. The module manifest schema gates the Crowdfunding boundary commitment per architecture §3.7 + §3.13.

## Discipline reminders

- **`.strict()` default.** Every `z.object({...})` MUST end with `.strict()` per architecture §Format patterns line 3824-3826. The `_common/strict.ts` runtime helper + the Story 1.16a friction-budget ESLint rule (deferred per `_bmad-output/implementation-artifacts/deferred-work.md` D6-1.4) jointly police drift.
- **Tenant scoping.** Module endpoints are tenant-scoped: `/api/v1/p/<pariwar_id>/modules/...` per architecture §3.1 line 1798. Global module catalog surface uses `/api/v1/global/modules/...`.
- **No type-shadowing.** Per architecture §Naming patterns line 3719-3723 + Top-10 anti-pattern #2: do NOT redeclare types in `apps/api/modules/modules/modules.types.ts` that shadow contracts here. Consume via `import type { Foo } from '@twt/contracts/modules'`.
