// Design-token consumption for the public shell (Story 2.5, AC1 / UX-DR9).
//
// The shell consumes Story 1.17's `@twt/tokens`. The package also ships a Tailwind
// v4 `@theme` artifact (`@twt/tokens/theme.css`), but that `@theme` block only takes
// effect through a Tailwind v4 pipeline. `apps/public` is an intentionally minimal-JS
// SSR surface with NO Tailwind pipeline (friction-budget discipline), so we render the
// SAME canonical token source (`color`/`font`/`space`/`border` from `@twt/tokens`)
// into a plain `:root { --token: value }` custom-property block the page styles
// reference via `var(--…)`. Token VALUES are identical to `theme.css` (one source);
// the variance is the consumption MECHANISM, documented in COMPOSITION-CONTRACT.md.
import { border, color, font, space } from '@twt/tokens';
import type { TokenGroup } from '@twt/tokens';

function group(tokens: TokenGroup, prefix: string): string {
  return Object.entries(tokens)
    .map(([name, value]) => `  ${prefix}${name}: ${value};`)
    .join('\n');
}

/**
 * The full design-token set as a deterministic `:root` custom-property block
 * (consumes `@twt/tokens` — the same source `theme.css` is generated from). Emitted
 * once into the shell `<head>`; the page's hand-written semantic CSS references it.
 */
export function rootTokenCss(): string {
  return [
    ':root {',
    group(color, '--color-'),
    group(font, '--font-'),
    group(space, '--'),
    group(border, '--'),
    '}',
  ].join('\n');
}
