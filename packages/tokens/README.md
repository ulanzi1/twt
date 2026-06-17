# `@twt/tokens` — the shared design-system token registry

The **single source of design tokens** for every TWT surface (Story 1.17, UX-DR7–UX-DR12).
Per architecture §4.1, `tokens` is a **shared-layer** package: consumers **inherit** the
design system by importing from here and **never re-define a primitive** (AC5 land-once /
consume-everywhere). It is framework-neutral TS, so both the **Tailwind v4 `@theme`** web
artifact and a future **Tamagui** native theme (FM-1) consume the same constants.

> **Not `packages/ui`.** The epic says "`packages/ui` ships a token registry," but the
> architecture commits the boundary: tokens live in `@twt/tokens` (shared layer);
> `packages/ui` is reserved for **TWT-data-shape composed components** (Sahyog List,
> Yogdaan Bahi) under the **second-consumer promotion rule**, which is unmet today — so
> `packages/ui` stays a stub.

## Usage

### TS consumers — import the constants

```ts
import { color, font, space, border, tokens, renderThemeCss } from '@twt/tokens';

color['ink-primary']; // '#1a1a1a'
font['numeric-tabular']; // "'IBM Plex Mono Devanagari', 'IBM Plex Mono', ui-monospace, monospace"
space['space-row']; // '8px'  (placeholder until P0-2)
border['border-hairline']; // '1px'
```

### Web (Tailwind v4) consumers — `@import` the generated `@theme`

Tailwind v4 is configured **CSS-first** (there is no `tailwind.config.*`). Import the
generated artifact after Tailwind itself; the design tokens become CSS variables +
utilities (`bg-*`, `text-*`, `border-*`, `font-*`):

```css
@import 'tailwindcss';
@import '@twt/tokens/theme.css';
```

`apps/admin` is the live web consumer (the AC4 placeholder consumer): it imports the
generated `@theme` and its status-banner utilities (`bg-status-ok-bg`, `text-status-fail-fg`,
…) resolve from the subsumed admin status palette (see **Subsumption** below).

## Token groups

| Group    | CSS var prefix | Tokens                                                                                                                                                                                                                                                                                                                                                                           |
| -------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `color`  | `--color-*`    | §8 semantic role aliases (`ink-primary`, `surface-base`, `surface-accent`, `rule-hairline`, `rule-heavy`, `stamp-mudra`, `status-pending`, `status-confirmed`, `status-mismatch`, `status-grey-takeover`) + general aliases (`bg`/`surface`/`text`/`accent`/`danger`/`success`/`warning`) + the **firm** admin status palette (`status-ok-*`, `status-fail-*`, `status-muted-*`) |
| `font`   | `--font-*`     | the five UX-DR9 type-role tokens (`display-name`, `display-parichay`, `body-ledger`, `numeric-tabular`, `caption-stamp`)                                                                                                                                                                                                                                                         |
| `space`  | `--space-*`    | the four UX-DR9 named tokens (`space-hairline`, `space-row`, `space-block`, `space-page-gutter`) — a **discrete named set**, not a numeric scale                                                                                                                                                                                                                                 |
| `border` | `--border-*`   | `border-hairline`, `border-rule`, `border-double-rule`, `border-funeral-frame` — **no shadow token** (FM-3: separation is hairline-based)                                                                                                                                                                                                                                        |

Every token name expresses a **semantic role**, never an arbitrary index (FM-14 #1 — no
`color-1`); every group carries a purpose comment (FM-14 #3). See `src/tokens.ts`.

### Values policy — what is firm vs placeholder

Per-member-surface **color / spacing / border pixel values are P0-2 prototype validation
TARGETS, not v1 commitments** (FM-5). What v1 commits is the **semantic structure + the
names + the AA-contrast discipline**. Two exceptions are **firm**: the **admin status
palette** (subsumed, AA-contrast, carried over byte-for-byte) and the **1px hairline**
primitives.

## Typography role-faces + FM-2 substitution policy

| Role               | Canonical face                | Latin pairing            |
| ------------------ | ----------------------------- | ------------------------ |
| `display-name`     | Tiro Devanagari Hindi (serif) | Georgia, serif           |
| `display-parichay` | Tiro Devanagari Hindi (serif) | Georgia, serif           |
| `body-ledger`      | Noto Sans Devanagari (sans)   | Inter, system-ui         |
| `caption-stamp`    | Noto Sans Devanagari (sans)   | Inter, system-ui         |
| `numeric-tabular`  | IBM Plex Mono Devanagari      | IBM Plex Mono, monospace |

**FM-2 substitution policy.** This package commits the **role → face mapping** + a
documented substitution policy, **not** a frozen per-device fallback ladder — the
per-role per-device ladder is a **P0-2 device-validation output** (empirical, FM-2). Each
token already carries a **Latin pairing** so mixed Devanagari/Latin strings render
coherently. **Font loading/bundling is the consuming surface's job**, not this package's
(this package only names the faces). Type-scale **sizes** are likewise placeholder until
P0-2.

## Numeral discipline — amendment A2 (operational vs ceremonial)

- **Operational register = Gregorian dates + Latin numerals.** Sahyog List, Yogdaan Bahi
  date + amount columns, search/filter, UTR/reference codes, all data tables, member
  directory, **and the Panchayat Noticeboard incl. FR-19 celebration framing**
  (₹ 45,88,000 / 14,800 / dates all Latin).
- **Ceremonial = Hindi numerals (०१२३४५६७८९) permitted, narrowly.** Reserved
  **exclusively for memorial Devanagari prose on the Shradhanjali surface** (e.g.
  "३४ वर्षों की सेवा"). **Standalone counts/amounts/dates render Latin even on memorial
  pages** ("14,800 सहयोगियों", "₹ 45,88,000", "Born: 1962 · Passed: 2026").
- **Never mixed at the same hierarchy level** within one row/label/stat-value.
- The earlier carve-outs (Hindi numerals on Yogdaan Bahi date columns; FR-19 pinned-notice
  framing) are **closed** — A2 is the authority.

The **numeral runtime utilities** (`toHindiNumeral` / `toGregorianNumeral` /
`formatCurrency`) are **`packages/i18n`, Story 2.1 — NOT this package, NOT Epic 1**. Story
1.17 ships the numeral **discipline** (the rules + the `scripts/microcopy/` lint that
enforces them), not the conversion functions.

## Vocabulary register (UX-DR71)

Canonical terminology the `scripts/microcopy/` gate enforces on member-visible copy:

- `passbook` → **Yogdaan Bahi** · `receipt` / `invoice` → **Contribution Note** (a.k.a.
  Yogdaan Pratigya) · `report` → **Sahyog Vivran**
- member address: `user` / `customer` / `donor` → **colleague** / **सम्मानित साथी**
- deceased member: `Late Teacher` → **Deceased Member**
- tone prohibitions: scarcity ("only N days left"), panic ("URGENT"), and **Pool-Reality
  comparison-to-target** framing ("fell short", "X% achieved", "target missed").

## FM-14 token-governance rules

1. **Semantic role naming** — names express role, never an index (no `color-1`).
2. **No magic numbers in component code** — CI-lintable; enforced by the
   `scripts/microcopy/` magic-number color check (the px/spacing facet tightens at P0-2).
3. **Additions require a justifying comment** — every token group is commented.
4. **Deprecate before removal** — a removed token is first deprecated; compiled outputs
   retain deprecated tokens with warnings during the migration window.

## Subsumption — admin's inline `@theme` (DD-1 / D4-1.11b)

Story 1.17 is the **extraction trigger** for the admin design tokens (the DD-1 deferral
said "until a 2nd admin surface needs the same atoms" — this story supersedes that with
the design-system foundation). The previously-inline `apps/admin/src/styles.css` `@theme`
status palette moved **into** `@twt/tokens` unchanged (same names, same AA-contrast values
— **no visual/contrast regression** to the §4.10 integrity banners), and admin now
**consumes** the generated `@theme`.

## Generated artifact + FM-4 sync discipline

`src/theme.css` is **generated** from the TS source — do **not** edit it by hand. The TS
source is canonical; the compiled `@theme` is tracked alongside it (FM-4).

```sh
pnpm --filter @twt/tokens tokens:generate-theme          # regenerate src/theme.css from src/tokens.ts
pnpm --filter @twt/tokens tokens:check-theme-determinism # FM-4: assert committed == regenerated (CI gate)
```

The `tokens-theme-check` CI job runs the determinism check; it fails the build if
`src/theme.css` drifts from the source.

## Staged-tokens decision (do NOT introduce Style Dictionary now)

v1 is a **hand-rolled TS module** by decision. **Style Dictionary migration triggers
only** at (a) **second-Pariwar provisioning** or (b) the **first non-TS consumer** — do
**not** add it now (adding it before there is a consumer is the "scaffolding with no
consumer" trap the UX spec warns against, OQ-UX-14). When a trigger fires, the TS registry
becomes the Style Dictionary source-of-truth and the generators emit per-platform outputs.
