# `dlt-typed-variables` gate

A precision CI gate enforcing **Story 6.34 AC6** (TV7 — `2026-10-10-313`, rules per `2026-10-12-322` C2): every SMS
template we register on DLT declares a TRAI type for each of its variables, so a variable can ⛔ ship untyped.

TRAI's Direction of 18 Nov 2025 requires every variable of every SMS content template to be tagged with its type
(numeric, alphanumeric, url, urlott, cbn, email — Annexure-I). The PE registers on **STPL's SmartPing** portal, where
the template TEXT keeps the untyped marker `{#var#}` and each variable's type is picked, in order, in a separate
tagging section. So the types live BESIDE the text — each registry entry's `slots`, checked by
`checkDltTemplateShape` (`packages/channels/src/dlt-variables.ts`) in that registry's unit test — and this gate keeps
templates inside those registries.

- **lib.ts** — the pure line scanner (`scanDltText`, `checkScanCoverage`) and `REGISTRY_FILES`. Unit-tested with its
  negative controls in `lib.test.ts`.
- **check.ts** — entrypoint: scans the TRACKED `.ts` / `.tsx` files under `apps/*/src/**` and `packages/*/src/**`
  and the sheets `docs/launch-gate-inventory/*.md`; exits 1 naming file + line + rule.

```
pnpm dlt-typed-variables:test    # vitest run scripts/dlt-typed-variables (teeth)
pnpm dlt-typed-variables:check   # tsx scripts/dlt-typed-variables/check.ts
```

## The rules

- **(i)** ⛔ a braced tag other than `{#var#}` inside REGISTERED text — the sheets' template table rows (`| <n> | …`)
  and the CODE lines of the registry files. Prose, headings, bullets and comment lines are ⛔ scanned: by house rule
  (the TYPE SPELLING RULE) they write a type WITHOUT braces — "numeric", or the bare hash form.
- **(ii)** the literal `{#var#}` only in a `REGISTRY_FILES` file.
- **(iii)** the identifier `DLT_VAR` and the literal `sms.dlt.template_id.` only in a `REGISTRY_FILES` file (+
  `apps/api/src/deps.ts`, allowlisted for its startup error string). Comments count — ⚠ so a doc comment in a
  non-registry file must not name them either (`@twt/channels`' barrel uses `export *` for this reason).
- **Coverage** — the scan fails if it read ZERO source files or ZERO sheets, or if any `REGISTRY_FILES` path is ⛔ in
  the scanned set (a renamed registry, or a glob that matches nothing, can ⛔ silently drop out).

SHAPE (slot count, ≤ 3 variables, adjacency, ≥ 30 % fixed) is the registry unit tests' job, ⛔ this gate's.

## Adding a template

1. Put it in an existing registry, or create a registry module whose unit test runs `checkDltTemplateShape` over every
   entry, and add the module to `REGISTRY_FILES` in the same change.
2. ⚠ **`git add` a new registry file before running the check** — the gate reads TRACKED files only, so an untracked
   registry fails the coverage check.
3. Add its row to `docs/launch-gate-inventory/dlt-template-requests-6-19.md`: config key, the types to select in order,
   the MSG91 `##name##` form.

## Scope

INVARIANT SCAN of the tracked tree — not a git-diff (mirror `kyc-provider-boundary`; NO `fetch-depth: 0`). Runs in
`scripts/ci-local.sh` AND `.github/workflows/ci.yml`; `docs/launch-gate-inventory/` is in `.githooks/pre-push`'s
`GATE_INPUTS`, so a docs-only push that touches a sheet still runs `ci:local`.
