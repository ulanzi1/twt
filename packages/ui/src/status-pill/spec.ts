// The `<StatusPill>` spec — Story 9.6 (Task 1; D1 LOCKED). The SINGLE source of the 5-state →
// {tone, colorTokenRole, iconName, labelKey, a11yLabelKey} mapping, keyed on the canonical
// `@twt/contracts` `ContributionStatus` union via `satisfies Record<ContributionStatus, …>`.
//
// ── The compile half of the "cannot be silently extended" gate (AC2) ────────────────────────────────
// `satisfies Record<ContributionStatus, …>` means this object IS the wire taxonomy, not a re-declared
// copy: adding a 6th contract state breaks the `@twt/ui` build here (a missing key), and removing one is
// caught by the lockstep unit test (presenter.test.ts). Extending the taxonomy therefore REQUIRES a
// deliberate PR touching the contract enum + this spec + the copy + the token together — no accidental
// widening. The taxonomy/derivation/precedence themselves are FROZEN (Story 8.6 + 9.5) — this file only
// says how each frozen state LOOKS; it never re-derives or re-orders anything.

import type { ContributionStatus } from '@twt/contracts';

import { statusPillA11yLabelKey, statusPillLabelKey } from './i18n-keys.js';
import type { StatusPillSpec } from './view-model.js';

/**
 * The 5 states, each with its documented tone + `@twt/tokens` role + semantic icon + copy keys. Meanings
 * are verbatim from the frozen contract/domain doc comments (`ContributionStatus` /
 * `deriveContributionStatus`); reuse them — do NOT reinvent.
 */
export const STATUS_PILL_SPEC = {
  // yellow — attested via UTR, reconciliation hasn't matched yet (Story 8.4; the only tone live today).
  yellow: {
    tone: 'pending',
    colorTokenRole: 'status-pending',
    iconName: 'clock',
    labelKey: statusPillLabelKey('yellow'),
    a11yLabelKey: statusPillA11yLabelKey('yellow'),
  },
  // green — `contribution.confirmed` fired (Story 9.5 canonical financial truth; पुष्ट).
  green: {
    tone: 'confirmed',
    colorTokenRole: 'status-confirmed',
    iconName: 'check-circle',
    labelKey: statusPillLabelKey('green'),
    a11yLabelKey: statusPillA11yLabelKey('green'),
  },
  // red — reconciliation mismatch (`contribution.reconciliation-mismatch`, Story 9.4 matcher — LIVE in
  // prod, cron-emitted 6×/day). Warm-UMBER, NOT warm-red (UX :1087-1094 — a mismatch must not swamp the
  // passbook with the ceremonial warm-red accent).
  red: {
    tone: 'mismatch',
    colorTokenRole: 'status-mismatch',
    iconName: 'alert-triangle',
    labelKey: statusPillLabelKey('red'),
    a11yLabelKey: statusPillA11yLabelKey('red'),
  },
  // grey — no verdict; on-record, cycle closed unreconciled (NEUTRAL, never a "you missed"/shame state).
  grey: {
    tone: 'neutral',
    colorTokenRole: 'status-grey-takeover',
    iconName: 'circle',
    labelKey: statusPillLabelKey('grey'),
    a11yLabelKey: statusPillA11yLabelKey('grey'),
  },
  // held — a confirmed contribution under trustee review-and-reverse (Story 9.5; rare per the 9.4
  // monotonic invariant). Dignified/subdued, distinct from grey — the NEW `status-held` token.
  held: {
    tone: 'held',
    colorTokenRole: 'status-held',
    iconName: 'pause-circle',
    labelKey: statusPillLabelKey('held'),
    a11yLabelKey: statusPillA11yLabelKey('held'),
  },
} as const satisfies Record<ContributionStatus, StatusPillSpec>;
