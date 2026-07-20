# `packages/contracts/src/contributions/`

Transport-layer contracts for the **contribution + UPI Intent + reconciliation** surface — contribution intent, UPI deep-link generation, contribution record, reconciliation matching surface, bank-statement upload triage.

## Landing Story

**Story 8.2** lands first: a **read-model** response shape (`ActiveContributionCardResponse`) for the My Pool home-screen card — presentation only, no write/intent contracts. It reads existing event-derived state (alerts, pool assignment, confirmed-contribution count); it does not model the contribution lifecycle itself.

Substantive *write/intent* contracts authored at **Stories 9.1 / 9.2 / 9.4+** — contribution lifecycle + UPI Intent surface + bank-statement intake + UTR matching engine per epics Epic 9. Contribution state machine derives from event replay via the `@twt/events` `StateMachine<S, E>` primitive (Story 1.3 substrate); bank-parser contracts cross-link `packages/bank-parsers/` (Story 9.2).

## Discipline reminders

- **`.strict()` default.** Every `z.object({...})` MUST end with `.strict()` per architecture §Format patterns line 3824-3826. The `_common/strict.ts` runtime helper + the Story 1.16a friction-budget ESLint rule (deferred per `_bmad-output/implementation-artifacts/deferred-work.md` D6-1.4) jointly police drift.
- **Tenant scoping.** Contribution endpoints are tenant-scoped: `/api/v1/p/<pariwar_id>/contributions/...` per architecture §3.1 line 1798.
- **No type-shadowing.** Per architecture §Naming patterns line 3719-3723 + Top-10 anti-pattern #2: do NOT redeclare types in `apps/api/modules/contributions/contributions.types.ts` that shadow contracts here. Consume via `import type { Foo } from '@twt/contracts/contributions'`.
