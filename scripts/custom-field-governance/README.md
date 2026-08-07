# `custom-field-governance` gate — Story 10.12 (AC3, layer 3)

`pnpm custom-field:check` · unit tests `pnpm custom-field:test`

Per-Pariwar custom fields let a tenant admin add a field the engine then honours, without a migration
and without a release. This gate is one third of the fence around that freedom.

---

## ⚠ What this gate does NOT prove — read this first

**Custom-field definitions are database rows, authored at runtime by tenant admins.** This gate cannot
read them and does not pretend to. It proves nothing about whether a forbidden definition exists in
any tenant database.

A CI gate that needed a live tenant database would not be a CI gate. So this one asserts only what is
provable from committed source, and the runtime prohibition lives in two other layers.

## The three layers (AC3)

| # | Layer | Where | What it catches |
|---|---|---|---|
| 1 | **Runtime fence** | `packages/domain/src/custom-fields/frozen-governance.ts` | Every publish through the sanctioned writer. Normalizes the key (case-fold, `-`/`.`/whitespace → `_`) so `Payout-Destinations` and `payout.destination` cannot launder a forbidden name. |
| 2 | **DB mirror** | `pariwar_custom_field_definitions_frozen_key_ck` (migration 0095) | A writer that never goes through the app layer at all. Per migration 0088's doctrine: *"an app-layer rule with no DB mirror is a rule that holds only for the callers who happen to go through the app layer."* |
| 3 | **CI — this gate** | `scripts/custom-field-governance/` | Drift between the denylist and the FR-100 registry; a second INSERT site that would bypass layer 1 entirely; a second `members.custom_fields` write site that would bypass AC5/AC6's validation and limits entirely. |

None of the three is sufficient alone. Layer 1 protects one code path. Layer 2 protects the table but
carries only the `payout_destination*` family (a CHECK rich enough to encode the whole denylist would
be a rule engine in DDL). Layer 3 protects layers 1 and 2 from being quietly de-scoped.

## The three legs

### Leg (a) — denylist ⊇ `fr-100-non-add.yaml`'s `forbidden_column`

Asserts that every column prefix the FR-100 non-add registry forbids is covered by a **prefix-mode**
entry in `CUSTOM_FIELD_FORBIDDEN_KEY_PATTERNS`.

This is the drift guard. When v2 adds a pattern to `fr-100-non-add.yaml` and nobody mirrors it into
the custom-field fence, the newly-frozen name stays authorable as a JSONB key. Leg (a) fails instead.

A **segment-mode** entry does not count as coverage even when its text matches: the two modes accept
different key sets (`payout_destinations` matches `payout_destination` in prefix mode and not in
segment mode), so accepting one would report coverage of a rule the runtime does not enforce.

### Leg (b) — sole writer ⟵ load-bearing

Asserts that `insert(pariwarCustomFieldDefinitions)` appears **only** in
`packages/domain/src/custom-fields/registry.ts`. AST-detected, in the `member-state-invariant` /
`access-wrapper` house style — the table name in a comment or a string literal never matches.

Layer 1 runs inside the writer. A second INSERT site anywhere else in the repo bypasses the fence, the
PII-tier guard and the cardinality bound in one move, while every existing test stays green.

**Known soft spot, recorded rather than hidden:** files under a `tests/` or `__tests__/` directory, and
any `*.test.ts` / `*.spec.ts`, are excluded from leg (b) (and leg (c), below). Live-DB specs must be
able to plant a row directly — that is how the revert-sanity tests in
`packages/domain/tests/integration/custom-fields/` prove layers 1 and 2 have teeth. A production write
laundered through such a path would not be reported.

**Alias resolution.** Both leg (b) and leg (c) resolve LOCAL renames — `import { X as y }` and
`const { X: y } = schema` — back to the original export before matching, mirroring the
`governance-boundary` gate's precedented "named symbol incl. aliases" route
(`gate-inventory.md:37`). A scanner that only matched an argument's own literal text would miss
`import { pariwarCustomFieldDefinitions as cf } from '@twt/domain'; db.insert(cf)`.

### Leg (c) — the `members.custom_fields` sole writer [Review][Patch]

Asserts that `update(members).set({ customFields })` appears **only** in
`packages/domain/src/custom-fields/member-write.ts`. Same AST-detected shape as leg (b), reusing the
same alias-resolution helper.

AC6 states "the writer is the sole `update(members).set({ customFields })` call site in the repo,
asserted by AC3's source-scan leg" — but at story author-commit no scan ever checked this; leg (b) only
ever matched `insert(pariwarCustomFieldDefinitions)`. This leg supplies the mechanization the AC's own
text assumed already existed. A second write site would bypass in-force resolution, the AC5 limits, and
the strict unknown-key rejection all at once, while every existing test stayed green.

## Revert-sanity

`lib.test.ts` plants a violation for every detection route and asserts it is caught: an fr-100 pattern
with no covering entry, a segment-mode entry masquerading as coverage, an empty denylist, five shapes of
out-of-module INSERT for leg (b) (`db.insert(t)`, bare `insert(t)`, `schema.t`, an import-aliased
binding, a destructuring-aliased binding, and multiple sites in one file), and the same alias shapes for
leg (c)'s `update(members).set({ customFields })`. A gate that cannot be made to fail has no teeth.

## When this gate fails

- **Leg (a)** — add the new fr-100 pattern to `CUSTOM_FIELD_FORBIDDEN_KEY_PATTERNS` in
  `packages/domain/src/custom-fields/frozen-governance.ts`, in `prefix` mode.
- **Leg (b)** — route the write through `customFields.publishDefinitionVersion`. Do **not** widen
  `WRITER_ALLOWLIST`; adding a path is the one edit that makes the fence optional for that file, and
  it needs the same review a governance change would.
- **Leg (c)** — route the write through `customFields.setMemberCustomFields`. Do **not** widen
  `MEMBER_WRITER_ALLOWLIST` for the same reason.
