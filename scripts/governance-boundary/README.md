# `governance-boundary` gate

**Story 10.8 (FR-58C, AC5/AC6) — Category A repo-global invariant gate.**

Makes the feature-flag **governance boundary** mechanized rather than documented: a feature flag must
never be able to bypass audit, consent, validity, RBAC, the canonical-financial-truth fence, a CI
gate, or any architectural freeze-table row.

```bash
pnpm governance-boundary:test    # the scanners' own unit tests (incl. the negative controls)
pnpm governance-boundary:check   # the gate itself
```

## Why this gate exists

A feature flag is, by construction, a mechanism for changing production behaviour **without a code
review**. That is what makes it useful for the FR-2 DigiLocker cutover — and what makes it the most
attractive available route around every governance control this system has. Documenting "don't do
that" is not a control. This gate is the control.

## The two legs, and which one is load-bearing

| Leg | What it asserts | Weight |
|---|---|---|
| **(a) Conformance** | The domain flag registry (`FLAG_DEFAULTS`) and the capability bar (`governance_boundary.yaml`) admit **exactly** the same flag keys, in both directions, and the bar's `count` agrees with its entry total. | Bookkeeping |
| **(b) Source scan** | **No feature-flag evaluation is named inside a governance module.** | ⟵ **The invariant** |

> ⚠ **A green leg (a) proves nothing on its own.** It checks that the list of flags matches the list
> of flags. It is green from the moment it lands and it stays green while somebody adds a flag read
> inside the RBAC module. Leg (b) is the half that carries the invariant.
>
> If leg (b) ever becomes inconvenient, the correct response is to stop putting flag reads in
> governance modules — **not** to narrow the scan. A governance module that needs flag-conditioned
> behaviour needs a code change and a review. That is the entire point.

## What leg (b) guarantees — and what it does not

Stated precisely, because an overstated guarantee is worse than a modest one: a reader who believes
the gate covers more than it does stops looking.

**Guaranteed.** No *direct* flag read inside a governance module, and no single-hop *named* one.
Every syntactic route by which a file can name the evaluation surface is closed — see the five routes
below. A violation cannot be committed by accident, by a copy-paste, or by a casual edit, and CI
fails loudly when one is.

**Not guaranteed.** *Transitive* reachability. The scanner parses each file in isolation; it resolves
no module specifiers and follows no import edges. A governance module that imports an
innocent-looking helper which itself imports the evaluator is **not** detected:

```ts
// packages/domain/src/flag-shim.ts   ← not a prohibited root, never scanned
export { evaluateFlag as decide } from './feature-flags/evaluate.js';

// packages/domain/src/rbac/permissions.ts   ← prohibited root
import { decide } from '../flag-shim.js';   // specifier innocent, symbol not banned
```

Catching that requires full module-graph resolution, which this gate deliberately does not do (a TS
program with monorepo path mapping, meaningfully slower, with false-positive risk on barrel files).
**This is a real limit, not a bug** — a determined author can route around a per-file scanner, and no
static check of this shape changes that. What the gate buys is that the boundary cannot erode
silently or by accident, which is how it actually erodes.

## How leg (b) detects violations

AST-based (TypeScript compiler API), so a symbol name in a comment or string literal never matches.
**Five independent routes**, because any single one is trivially side-stepped:

1. **Module specifier** — `import … from '../feature-flags/evaluate.js'`, `@twt/domain/feature-flags`,
   plus dynamic `import()` and `require()`. A non-literal specifier is flagged too: it cannot be
   statically cleared, so it is not statically cleared.
2. **Named symbol** — a named/default/namespace import of the evaluation surface
   (`evaluateFlag`, `resolveFlagAudited`, `flagVersionInForce`, …) or of the `featureFlags`
   namespace, **from any module**. This catches `import { featureFlags } from '@twt/domain'`, whose
   specifier is entirely innocent-looking. Aliases (`{ evaluateFlag as decide }`) are resolved to the
   original exported name.
3. **Property access** — any `featureFlags.<member>` expression, including bracket/computed access.
   This catches `import * as domain from '@twt/domain'; domain.featureFlags.evaluateFlag(...)`, which
   names neither a banned specifier nor a banned import binding anywhere in the file.
4. **Namespace re-export** — `export * as featureFlags from '…'`, which re-publishes the whole banned
   namespace from inside a prohibited root under a fully innocent specifier. *(Added Review Pass 2 —
   the `NamespaceExport` clause shape is not a `NamedExports`, so route 2 never saw it.)*
5. **Destructuring** — a banned symbol pulled out of any expression by an object binding pattern,
   including the aliased form. *(Added Review Pass 2 — `const { evaluateFlag } = await
   import('@twt/domain')` defeated routes 1, 2 and 3 simultaneously: the specifier is literal and
   innocent, the node is a `VariableStatement` rather than an import declaration, and the call site is
   a bare `CallExpression` rather than a property access.)*

Routes 2–5 are why this gate has **semantic coverage** rather than being a specifier blacklist that
any `import * as` defeats.

## Two ways this gate could pass vacuously — both now fail instead

A governance gate's worst state is a green run that proved nothing, because it is indistinguishable
from success. Two such states were reachable and are now failures *(Review Pass 2)*:

- **A prohibited root that does not resolve.** Previously the file walker returned silently for a
  missing directory and the root printed `✓ … clean (0 file(s))`. A module rename or a typo in the
  YAML disabled the load-bearing leg for that root, permanently, with a checkmark reporting it.
- **A scan that reads zero files overall.** There is now an explicit coverage floor.

## Scanned roots

Read from the capability bar's own `prohibited` list, so the scanned surface and the documented
prohibitions **cannot drift apart**. Currently:

| Root | Prohibition |
|---|---|
| `packages/domain/src/audit` | (a) never disable audit logging |
| `packages/domain/src/rbac` | (d) never escalate RBAC |
| `packages/domain/src/consent` | (b) never bypass Story 2.7 / DPDPA consent |
| `packages/validity-service/src` | (c) never override Validity Service eligibility |
| `packages/domain/src/contribution` | (g) never bypass the canonical-financial-truth fence |
| `scripts` | (f) never disable a CI gate |

These are **enforcement roots** — the production modules that actually decide things — never the test
files that assert about them. `packages/domain/src/contribution/` (where `CONFIRMED_EVENT_TYPE` and
the confirmed-truth reads live) is the root for prohibition (g), **not**
`packages/domain/tests/contribution/canonical-financial-truth.test.ts`: a test file has no
enforcement logic to bypass, so scanning it would be a vacuous gate.

Prohibition **(e)** — "never alter an architectural freeze-table row" — has no import to scan for;
the violation is in what the bar *claims* a flag may toggle. It is enforced at **admission** instead:
`parseCapabilityBar` rejects an `allow` entry naming a frozen behaviour, citing the freeze row
(`epics.md:510-543`).

## The one allowlisted location

`scripts/governance-boundary/` — this gate itself. It lives under `scripts/`, a prohibited root, yet
must read the registry to check conformance. Same shape as `kyc-provider-boundary`'s
provider-directory allowlist: the one component that legitimately holds the thing is the one
enforcing the rule about it. The gate imports only the **bar parser** and the **key list**, never the
evaluator, and every other file under `scripts/` is still scanned.

## Adding a flag-toggleable behaviour

See the admission workflow documented in the header of `governance_boundary.yaml`. In short: trustee
attestation + an `allow` entry with `{ kind, artifact, rationale, adr }` + a `count` bump **in the
same commit** + a matching `FLAG_DEFAULTS` key with a named owner and a dead-by date. The gate
asserts registry ≡ allowlist in both directions, so neither half can move alone.

## Teeth

`lib.test.ts` carries **revert-sanity negative controls** for both legs — a planted violation for
each of the three leg-(b) detection routes independently, plus unlisted-flag / orphaned-entry /
count-mismatch controls for leg (a). A gate that cannot be made to fail has no teeth, and a
governance gate that silently stopped detecting anything would be worse than no gate: the green check
would actively certify an invariant nobody is enforcing.

Both legs were additionally proven **live** during Story 10.8 development, against real files:
planting `domain.featureFlags` in `packages/domain/src/rbac/permissions.ts` failed the gate with
exit 1 and printed prohibition (d); adding an orphaned bar entry failed it with exit 1 on the `count`
cross-check.

## Design notes

- **Invariant scan, not a git-diff** (mirrors `kyc-provider-boundary` / `member-state-invariant` /
  `schema-diff`; no `fetch-depth: 0`). The v1 baseline permits zero flag reads inside a governance
  module *ever*, so the gate asserts zero exist — a whole-state scan can neither miss a violation
  added earlier on the branch nor wrongly pass one already merged.
- **A malformed bar throws loudly** rather than degrading to "no entries". A silently-empty bar would
  make *both* legs pass vacuously: leg (a) would compare against an empty allowlist, and leg (b)
  would scan no roots at all. `parseCapabilityBar` also refuses a bar with an empty `prohibited` list
  for exactly that reason.
