// packages/contracts/src/rules/index.ts
//
// Barrel for the Niyamavali rule-registry transport contracts (Story 1.16d). At
// v1 this holds only the forward-compat `benefit_mechanism` discriminator
// (FR-7 / FR-100 Hook 1); Epic 2's Story 2.3 lands the `clause_versions` registry
// shapes here. Re-exported from the package root (packages/contracts/src/index.ts)
// so consumers import the `BenefitMechanism` enum from `@twt/contracts`.

export * from './benefit-mechanism.js';
// Story 2.3 — Niyamavali registry transport contracts (clause/version DTO,
// amendment/diff DTO, affected-member-scope declaration, AC7 resolution query).
// Story 2.4 ADDS the amendment-workflow endpoint DTOs (create/amend/update draft,
// draft response, tone-review sign-off, diff-preview, publish) — the FIRST
// niyamavali endpoints, so these DO register via `.openapi()` in emit-openapi.ts and
// `openapi/v1.yaml` changes (expected). The lockstep tests live in tests/rules.test.ts.
export * from './clause.js';
