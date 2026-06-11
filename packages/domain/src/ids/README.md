# src/ids/

**LANDED at Story 1.7** — Branded ID types landed with Pariwar-Passport
(architecture §Naming patterns line 3700-3708).

TypeScript branded-type wrappers (`type PariwarId = string & { readonly __brand: 'PariwarId' }`)
live here so domain IDs cannot be accidentally interchanged. `index.ts` exports
`PariwarId` (consumed by `pariwar_passport`) plus the architecture-named
cross-cutting set (`MemberId`, `ClaimId`, `PoolId`, `AlertId`, `ContributionId`),
each with a UUID-validating smart constructor (`pariwarId(s)`, `memberId(s)`, …)
reusing the single exported `UUID_REGEX` from `../db.ts`. The brand is
compile-time only — no runtime wrapper. The enforcing ESLint rule (`*Id` string
types must be branded) is **Story 1.16a**, not built here.
