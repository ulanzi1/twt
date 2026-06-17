// @twt/tokens — the shared design-system token registry (Story 1.17).
//
// The single source of design tokens for every TWT surface (architecture §4.1:
// `tokens` is a SHARED-layer package; consumers must not re-define primitives —
// AC5 land-once / consume-everywhere). Web consumers additionally `@import` the
// generated Tailwind v4 `@theme` artifact `@twt/tokens/theme.css` (AC2).
//
// See README.md for: the typography role-faces + FM-2 substitution policy, the
// numeral-discipline (A2 operational-vs-ceremonial split), the vocabulary register,
// the FM-14 governance rules, and the staged-tokens (hand-rolled-TS → Style
// Dictionary) migration trigger.

export { color, font, space, border, tokens } from './tokens.js';
export type { TokenGroup } from './tokens.js';
export { renderThemeCss } from './theme.js';
