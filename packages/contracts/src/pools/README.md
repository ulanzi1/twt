# `packages/contracts/src/pools/`

Transport-layer contracts for the **Pool Engine** — pool object data model, pool spawn + freeze + close lifecycle, snapshot integrity surface, per-Pariwar pool inventory.

## Landing Story

Substantive contracts authored at **Stories 7.1 / 7.2 / 7.3+** — pool object data model + spawn/freeze/close state machine + snapshot-storage surface per epics Epic 7. The pool state machine derives from event replay via the `@twt/events` `StateMachine<S, E>` primitive (Story 1.3 substrate); snapshot integrity hashes use `canonicalJsonStringify` from `@twt/events` per ADR-0004.

## Discipline reminders

- **`.strict()` default.** Every `z.object({...})` MUST end with `.strict()` per architecture §Format patterns line 3824-3826. The `_common/strict.ts` runtime helper + the Story 1.16a friction-budget ESLint rule (deferred per `_bmad-output/implementation-artifacts/deferred-work.md` D6-1.4) jointly police drift.
- **Tenant scoping.** Pool endpoints are tenant-scoped: `/api/v1/p/<pariwar_id>/pools/...` per architecture §3.1 line 1798.
- **No type-shadowing.** Per architecture §Naming patterns line 3719-3723 + Top-10 anti-pattern #2: do NOT redeclare types in `apps/api/modules/pools/pools.types.ts` that shadow contracts here. Consume via `import type { Foo } from '@twt/contracts/pools'`.
