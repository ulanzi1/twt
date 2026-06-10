# `packages/contracts/src/alerts/`

Transport-layer contracts for the **alert lifecycle** surface — alert creation, dispatch fanout across channels (push / SMS / WA / email / public banner), acknowledgement, suppression.

## Landing Story

Substantive contracts authored at **Stories 8.1 / 8.2 / 8.3+** — alert creation + dispatcher + per-channel render contracts per epics Epic 8. Alert state machine derives from event replay via the `@twt/events` `StateMachine<S, E>` primitive (Story 1.3 substrate); per-channel render contracts cross-link `docs/degradation-policy/comms-templates/`.

## Discipline reminders

- **`.strict()` default.** Every `z.object({...})` MUST end with `.strict()` per architecture §Format patterns line 3824-3826. The `_common/strict.ts` runtime helper + the Story 1.16a friction-budget ESLint rule (deferred per `_bmad-output/implementation-artifacts/deferred-work.md` D6-1.4) jointly police drift.
- **Tenant scoping.** Alert endpoints are tenant-scoped: `/api/v1/p/<pariwar_id>/alerts/...` per architecture §3.1 line 1798.
- **No type-shadowing.** Per architecture §Naming patterns line 3719-3723 + Top-10 anti-pattern #2: do NOT redeclare types in `apps/api/modules/alerts/alerts.types.ts` that shadow contracts here. Consume via `import type { Foo } from '@twt/contracts/alerts'`.
