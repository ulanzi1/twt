<!--
PR template — six committed initial-scope prompts per architecture
§PR-template initial scope (architecture lines 4026-4029). Per architecture
§PR-template review budget (architecture lines 4021-4024), adding past these
six requires retiring one or merging categories.
-->

## Summary

<!-- 1-3 bullets: what changed + why -->

## Acceptance / story link

<!-- Story key or AC numbers this PR closes; link the story file under _bmad-output/implementation-artifacts/ -->

## Initial-scope checklist (architecture §PR-template initial scope)

- [ ] **Type-shadowing check** — no new types redefine names already exported by `packages/contracts/` or other shared packages.
- [ ] **Branded-ID check** — any new ID introduced is branded (per architecture §Branding mandatory on first PR for new IDs, architecture lines 3706-3708).
- [ ] **Friction-budget declaration** — change stays within its surface's friction budget; any member-facing form/interaction friction is declared in `friction-budget.md` (payer + protects + event_type) and metric ceilings in `friction-budget.yaml` hold (per UX Stance #2 + architecture §AR-60; enforced by the `friction-budget` CI gate, Story 1.16a).
- [ ] **Accessibility-impact note** — change preserves or improves accessibility (RN Accessibility props for mobile; ARIA + semantic HTML for web).
- [ ] **Performance-impact note** — change preserves or improves performance budgets (P5 measurement criteria for mobile; budget docs for web/api).
- [ ] **Security-impact note** — change does not introduce DPDPA / FR-43A / RLS / audit-log regressions; no new secrets-handling paths uncovered by Cloud KMS envelope encryption; no PII renders above its tier in the FR-74 Public-vs-Private matrix on any public surface (enforced by the `pii-scrape` CI gate, Story 1.16b).

## Test plan

<!-- Bulleted markdown checklist of how the change was verified -->

- [ ] `pnpm turbo run lint` green
- [ ] `pnpm turbo run typecheck` green
- [ ] `pnpm turbo run test` green
- [ ] `pnpm turbo run build` green
- [ ] _(other surface-specific checks)_
