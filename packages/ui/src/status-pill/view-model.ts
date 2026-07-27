// The `<StatusPill>` view-model — Story 9.6 (Task 1; D4-A `member-status` precedent). The
// framework-agnostic render contract every surface's pill shares (apps/mobile RN today; the PDF
// note-template resolves the SAME `@twt/tokens` role by name; a web variant is ready-seamed for Story
// 9.8). Produced by the strictly-pure presenter (presenter.ts): NO react/react-native, NO copy, NO
// palette — only structured values + a `@twt/tokens` role NAME + i18n KEYS the render layer resolves.
// This is the ONE source of the 5-state → {tone, colorTokenRole, iconName, labelKey, a11yLabelKey}
// mapping, so no two surfaces can drift on how a contribution status looks.

import type { ContributionStatus } from '@twt/contracts';

/**
 * The semantic tone a render layer maps to its own palette — NOT a colour value, and NOT eligibility
 * (the status IS the derived answer, from `deriveContributionStatus`). One tone per state, 1:1 with
 * `ContributionStatus`:
 *   · pending   — yellow; attested / told-us-they-paid, still verifying.
 *   · confirmed — green; reconciliation-confirmed (`पुष्ट`).
 *   · mismatch  — red/warm-UMBER (NOT warm-red — that is reserved for the ceremonial stamp, UX :1094).
 *   · neutral   — grey; on record, cycle closed with no verdict (NEVER a shame state).
 *   · held      — trustee-frozen, under review (dignified/subdued, distinct from neutral).
 */
export type StatusPillTone = 'pending' | 'confirmed' | 'mismatch' | 'neutral' | 'held';

/**
 * The semantic icon NAME (the a11y-load-bearing shape — distinct per state; D5). The exact lucide glyph
 * is re-pickable in the render adapter WITHOUT touching this contract:
 *   clock · check-circle · alert-triangle · circle · pause-circle.
 */
export type StatusPillIconName =
  | 'clock'
  | 'check-circle'
  | 'alert-triangle'
  | 'circle'
  | 'pause-circle';

/**
 * The per-state render contract. `colorTokenRole` is the `@twt/tokens` `color` role NAME (a string like
 * `'status-pending'`), never a hex — the presenter stays framework-agnostic (it is consumed by both the
 * RN-Tamagui and the web/PDF `@twt/tokens` worlds) and the render layer resolves the actual value
 * (FM-14 #2 — no magic-number colours in component code).
 */
export interface StatusPillSpec {
  tone: StatusPillTone;
  /** The `@twt/tokens` `color` role name the render layer resolves (e.g. `'status-held'`). */
  colorTokenRole: string;
  iconName: StatusPillIconName;
  /** i18n KEY for the visible label (resolved by the render layer; `common` namespace). */
  labelKey: string;
  /** i18n KEY for the ARIA label — full-prose, distinct from the terse visible label (AC3). */
  a11yLabelKey: string;
}

/** The complete view-model: the input status echoed back + its resolved spec. */
export interface StatusPillViewModel extends StatusPillSpec {
  status: ContributionStatus;
}
