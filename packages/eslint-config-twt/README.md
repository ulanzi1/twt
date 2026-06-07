# @twt/eslint-config-twt

Per architecture §Consolidated ESLint-rule inventory (architecture lines 3980-3984), this package is the **canonical home** for all CI-enforced lint rules in the TWT monorepo. The single source of truth — additions, deprecations, and quarterly retirement review all happen here.

This README is the inventory itself.

## §1 Inventory (active rules at HEAD)

| Rule key | Source | Severity | What it catches |
|---|---|---|---|
| `js.configs.recommended` | `@eslint/js` | error | ESLint built-in baseline (no-undef, no-unused-vars, etc.) |
| `typescript-eslint.configs.recommended` | `typescript-eslint` | error | TS baseline (no-explicit-any warns, etc.) |
| `eslint-config-prettier` | `eslint-config-prettier` | suppress | Disables formatting rules that conflict with Prettier (Prettier owns them) |
| `no-restricted-imports` (relative cross-package paths) | local | error | Cross-workspace imports must use the package name (`@twt/events`), not relative paths (`../../packages/events`) per architecture §Cross-workspace imports use the package name (architecture lines 3779-3781) |

## §2 Pending rules (TODO — activated per surface they govern)

Each pending rule cites the Story or surface that will activate it. Rules are intentionally inert at PR-1; the architecture commits the rule + the eventual landing site, not the present-tense enforcement.

| Rule | Activates in | Architecture authority |
|---|---|---|
| Ban raw `logger.error` (require audit-log wrapper) | Story 1.10 | architecture §Top-10 anti-patterns (architecture lines 4074-4090) |
| Ban `Date.now()` + `new Date()` in business-logic packages; require clock injection | Stories that introduce business logic packages | architecture essential-pattern row (architecture line 3618) + §Top-10 anti-patterns |
| Ban `as any` + `as unknown as T` outside test fixtures | Any Story that lands TypeScript code | architecture §Top-10 anti-patterns (architecture lines 4085-4086) |
| Ban cross-store Zustand imports | Any Story that lands Zustand stores | architecture state-management essential-pattern |
| Ban camelCase in raw SQL strings (snake_case at DB boundary) | Stories that introduce raw SQL | architecture §Naming patterns |
| Ban type-shadowing of `packages/contracts/` exports | Story 1.4 + downstream | architecture §Branding mandatory on first PR for new IDs (architecture lines 3706-3708) + §Type-shadowing essential-pattern |
| Gateway-SDK dependency-lint rule (block direct gateway-SDK imports from non-crowdfunding modules) | Phase-2/3 crowdfunding module materializes | architecture §Crowdfunding Boundary Rule (architecture lines 458-477) |
| kebab-case file names + PascalCase component file names | Optional baseline (likely via `eslint-plugin-unicorn` or custom) | architecture §Naming patterns |

## §3 Rule lifecycle (additions, deprecations, retirements)

- **Adding a rule**: any PR that lands the surface a TODO rule governs MUST also flip the rule from TODO comment to active enforcement and append a row to §1. Cross-link the activating Story.
- **Deprecating a rule**: when a rule's underlying constraint is captured by a stronger structural change (e.g., type system enforces what the rule used to flag), file a PR moving the row to §4 + recording the deprecation rationale.
- **Retiring a rule**: §4 rows that are unused at the next quarterly review can be deleted per §5 cadence.

## §4 Deprecated rules (kept for historical reference)

*(none at PR-1 — populated as rules earn retirement)*

## §5 Cadence (quarterly review)

Per architecture §Cumulative friction budget reviewed quarterly (architecture line 4015), the quarterly cadence also governs lint-rule retirement. The Solo Builder + reviewing Trustees walk this inventory once per quarter and:

- Inspect each §1 row for false-positive volume; downgrade to warn or move to §4 if appropriate.
- Inspect each §2 TODO row; if the surface it governs has landed since the last review, the Story-PR-author owes the activation patch.
- Inspect each §4 row; remove rows that are no longer load-bearing.
- Document the review outcome in this README's git history (commit message + Conventional Commits scope `packages/eslint-config-twt`).

## §6 Prettier configuration

The Prettier config lives at `/prettier.config.js` (repo root). Substantive choices:

| Option | Value | Rationale |
|---|---|---|
| `printWidth` | 100 | Architecture-conventional |
| `singleQuote` | true | Architecture-conventional |
| `trailingComma` | `all` | Reduces diff noise on list mutations |
| `semi` | true | Architecture-conventional |
| `tabWidth` | 2 | Architecture-conventional |
| `useTabs` | false | Architecture-conventional |
| `arrowParens` | `always` | Less ambiguity in single-arg arrows |
| `endOfLine` | `lf` | Cross-platform consistency |

Changes to Prettier config update this section + bump the relevant rule activations in §1 / §2 if alignment with Prettier suppresses an ESLint rule.

## §7 Cross-references

- architecture §Essential patterns (architecture lines 3608-3619) — the Day-1 onboarding table that lint rules enforce.
- architecture §Top-10 architectural anti-patterns (architecture lines 4074-4090) — the substantive lint-rule TODO list.
- architecture §Naming patterns — kebab-case + PascalCase + SCREAMING_SNAKE_CASE conventions.
- architecture §Communication patterns — `logger.error` wrapper + clock-injection conventions.
- architecture §Process patterns — Conventional Commits + PR-template-prompts conventions.
- `commitlint.config.js` (repo root) — Conventional Commits scope vocabulary.
- `.github/pull_request_template.md` — six committed PR-template prompts.
