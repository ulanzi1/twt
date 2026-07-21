# `packages/contracts/src/contributions/`

Transport-layer contracts for the **contribution + UPI Intent + reconciliation** surface — contribution intent, UPI deep-link generation, contribution record, reconciliation matching surface, bank-statement upload triage.

## Landing Story

**Story 8.2** lands first: a **read-model** response shape (`ActiveContributionCardResponse`) for the My Pool home-screen card — presentation only, no write/intent contracts. It reads existing event-derived state (alerts, pool assignment, confirmed-contribution count); it does not model the contribution lifecycle itself.

**Story 8.3** adds the Live Contributor List read model (`PoolContributorListResponse`) — confirmed-only, PII-shielded.

**Story 8.4** lands the **UPI Intent write surface** (`upi-intent.ts`): the server-authoritative `intent` request/response (a discriminated union — `{ available: true, upiUrl, tr, amountInr, vpa, account }` or the first-class `{ available: false, reason }` fail-soft) + the UTR self-attestation `attest` request/response (the member-scoped yellow `myContribution: 'attested'` state; NO aggregate/confirmed count). Yellow is a member CLAIM, not confirmed money.

The **confirmation/matcher-side** contracts remain at **Stories 9.1 / 9.2 / 9.4+** — the `contribution.confirmed` (green) surface + bank-statement intake + the UTR matching engine per epics Epic 9. Contribution CONFIRMATION derives from event replay; bank-parser contracts cross-link `packages/bank-parsers/` (Story 9.2). 8.4 owns the ATTESTATION (yellow) side only; Epic 9 owns the CONFIRMATION (green) side.

## Discipline reminders

- **`.strict()` default.** Every `z.object({...})` MUST end with `.strict()` per architecture §Format patterns line 3824-3826. The `_common/strict.ts` runtime helper + the Story 1.16a friction-budget ESLint rule (deferred per `_bmad-output/implementation-artifacts/deferred-work.md` D6-1.4) jointly police drift.
- **Tenant scoping.** Contribution endpoints are tenant-scoped: `/api/v1/p/<pariwar_id>/contributions/...` per architecture §3.1 line 1798.
- **No type-shadowing.** Per architecture §Naming patterns line 3719-3723 + Top-10 anti-pattern #2: do NOT redeclare types in `apps/api/modules/contributions/contributions.types.ts` that shadow contracts here. Consume via `import type { Foo } from '@twt/contracts/contributions'`.
