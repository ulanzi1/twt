# `scripts/microcopy/` — the forensic-microcopy / vocabulary / numeral CI gate (Story 1.17)

The CI gate for the **design-system foundation's microcopy discipline** — Story 1.17
deliverables **(b)** FM-14 token-governance (magic-number) + **(c)** vocabulary register
(UX-DR71) + **(d)** numeral discipline (UX-DR73 / amendment A2). It enforces that
member-visible copy uses the **canonical terminology**, never pressures (scarcity /
panic / Pool-Reality comparison-to-target), keeps **operational numerals Latin**, and
that component code uses **token references, not magic-number color literals**.

Every finding names the **offending file + line + the canonical replacement** — the
`benefit-mechanism` "name the offender" contract.

Authority: UX-DR71 (vocabulary, epics L471/L1374) · UX-DR73 + amendment A2 (numerals,
UX spec L1119-1127/L1303) · epics L2782/L2883/L2984 (tone prohibitions) · UX spec
L788-793 (FM-14 token governance). ADR: `docs/adr/ADR-0016-design-system-foundation-microcopy-gate.md`.

> **Name reconciliation (the FM-1..FM-14 label collision).** The epic calls deliverable
> (b) the "FM-1..FM-14 forensic-microcopy rules," but the UX spec's `FM-N` are **seven
> Failure-Mode HARDENING commitments** for the token/component system (FM-1 Tamagui
> escape valve · FM-2 Devanagari validation · FM-3 visual discipline · FM-4 token-sync
> CI · FM-5 contrast · FM-6 component governance · FM-14 token governance), **not** 14
> microcopy rules. There is no enumerated list of 14 "forensic-microcopy" rules in the
> planning artifacts. This gate is the concrete realization of the **automatable** subset
> — vocabulary (c) + numerals (d) + the FM-14 #2 magic-number check — named `microcopy`
> [Decision 1, LOCKED]. The non-automatable FMs are documented elsewhere, not faked:
> FM-2/FM-5 are P0-2 device-validation outputs; FM-6 is a PR-review process; FM-1 is the
> native-stack Tamagui adapter (out of scope here). See ADR-0016 for the full mapping.

## Files

- `check.ts` — entrypoint (impure: glob + fs read + `process.exit`). Run via `pnpm microcopy:check`.
- `lib.ts` — pure, importable core (config parse + the four checks + allow-list). Unit-tested.
- `lib.test.ts` — fixture-driven unit tests. Run via `pnpm microcopy:test`.
- `../../microcopy.yaml` — the versioned config (repo root): the vocabulary register, tone
  prohibitions, numeral rules, magic-number toggle, scan scope, and the allow-list.

## The four checks — which have teeth NOW, which are forward-compat

| #   | Check                          | Teeth at v1?                                                       | Scope at v1                           |
| --- | ------------------------------ | ------------------------------------------------------------------ | ------------------------------------- |
| b   | **Magic-number color literal** | **TEETH NOW** (hex / rgb / hsl in `apps/admin` `.tsx/.ts`)         | `scope.code_globs` (admin slice)      |
| c   | **Vocabulary register**        | **TEETH NOW** for the 4 nouns; member-address terms forward-compat | code now; full register on copy later |
| —   | **Tone prohibitions**          | **TEETH NOW** (scarcity / panic / Pool-Reality)                    | `scope.code_globs` (admin slice)      |
| d   | **Numeral discipline (A2)**    | forward-compat (admin has no Devanagari / inline format)           | code + copy; bites on member surfaces |

**v1 enforcement footprint [Decision 2, LOCKED].** Forward-compat is the primary goal,
but the gate is **not entirely no-op**: it scans a bounded, allow-listed `apps/admin`
slice (`scope.code_globs`) so the **FM-14 magic-number check** and the **active
vocabulary/tone checks** have real teeth on day one over live React components. The
**broad member-surface** vocabulary register (the member-address terms `user` /
`customer` / `donor` / `Late Teacher`, scanned only in `scope.copy_globs`) and the
**numeral checks** stay forward-compat until member surfaces land (Epic 2+) —
`scope.copy_globs` is empty at v1. Teeth grow **surface-by-surface, data-driven, with no
gate code change** (the `benefit-mechanism` / `pii-scrape` precedent).

**Why color-only for FM-14 at v1.** Color is the token facet with **committed** values
(the subsumed admin status palette), so flagging hardcoded colors is actionable now. The
spacing / border / font **px-literal** facet is forward-compat: those token values are
**placeholder until P0-2**, so demanding their replacement now would be incoherent — it
tightens when P0-2 commits real px values.

**Why member-address terms are copy-scope-only.** `user` is a ubiquitous code identifier
(`userId`, `useUser`, …); scanning admin `.ts/.tsx` for it would be a false-positive
storm. The four unambiguous **nouns** (`passbook` / `receipt` / `invoice` / `report`) are
not code identifiers in the admin slice (verified green on introduction), so they bite
both scopes; the member-address terms bite member copy only (`copy_globs`, Epic 2+).

## Calibrated to green-on-introduction (green-with-teeth)

The gate **passes on the introducing PR while being non-vacuous** (the `benefit-mechanism`
bar). Real admin findings were fixed in-story; only **genuine non-applicables** sit on the
allow-list, each with a reason:

- the **Pariwar brand-color form defaults** (`brandingBundle.*_color` in `AddPariwarForm.tsx`)
  — tenant **DATA** submitted to the API, not design-system styling;
- the internal **`passbook row`** CSS pattern name (UX spec L1156) — a code identifier;
- the **`Yogdaan Bahi (passbook)`** documentation gloss — pairs the canonical term with
  its English referent.

Teeth are proven end-to-end (a probe with a `#abc123` literal + a `receipt` + a Devanagari
numeral → exit 1 naming each file:line; removed → exit 0).

## Precision-scoping IS the self-green invariant

The prohibited terms / Devanagari digits / color literals appear across the epics,
UX spec, this gate's own `lib.test.ts` fixtures, and `microcopy.yaml` itself. **None of
those are member copy.** The gate reads **only** the declared `scope.code_globs` /
`scope.copy_globs` — it **never** globs the repo root / `_bmad-output/**` / `docs/**` /
every `**/*.md` / `sprint-status.yaml` / its own `scripts/microcopy/**` / `microcopy.yaml`.
Self-green is **designed in via scope**, not luck.

## Mechanism — repo-root script, NOT a turbo task; invariant scan, NOT a git-diff

The gate is **repo-global** (a root `microcopy.yaml` + a cross-app copy/component scan), so
it cannot be a per-package turbo task — it lives at the repo root in `scripts/microcopy/`
(alongside `scripts/schema-diff/` + `scripts/benefit-mechanism/`), wired as a dedicated
`microcopy` job in `.github/workflows/ci.yml` plus the root `microcopy:check` /
`microcopy:test` scripts. `scripts/` is **not** a pnpm workspace, so the CI job runs
`pnpm microcopy:test` explicitly before `pnpm microcopy:check`; there is **no `turbo.json`
entry**. It is an **invariant scan of current state**, not a git-diff against a PR base ref
⇒ **NO `fetch-depth: 0`** (mirrors `schema-diff` / `benefit-mechanism`, **not**
`friction-budget`).

## Running locally

```sh
pnpm microcopy:test   # unit tests (pure engine: 4 checks + allow-list + strict config parse)
pnpm microcopy:check  # the gate (green-with-teeth over the apps/admin slice)
```
