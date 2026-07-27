import { useT } from '@twt/i18n/react'
import {
  deriveStatusPillViewModel,
  type StatusPillIconName,
  type StatusPillTone,
} from '@twt/ui'
import type { ContributionStatus } from '@twt/contracts'
import {
  AlertTriangle,
  CheckCircle,
  Circle,
  Clock,
  PauseCircle,
} from '@tamagui/lucide-icons-2'
import { StyleSheet } from 'react-native'
import { Text, XStack } from 'tamagui'

// <StatusPill> — the ONE reusable 5-state contribution-status chip (Story 9.6; AC1/AC3/AC4).
//
// It consumes the framework-agnostic presenter `deriveStatusPillViewModel(status)` from @twt/ui (the
// single source of the 5-state → {tone, colorTokenRole, iconName, labelKey, a11yLabelKey} mapping, keyed
// on the FROZEN @twt/contracts `ContributionStatus`). This file is the mobile RENDER layer: it bridges
// the presenter's semantic `tone`/`iconName` → the Tamagui palette + lucide glyphs, and it is the ONLY
// place that mapping lives (FM-14 #2 — colours come from a design-token authority, never a magic literal).
//
// ── Not color-only (AC3) ─────────────────────────────────────────────────────────────────────────────
// Every pill renders text + icon + ARIA label simultaneously; colour is supplementary. The whole chip is
// one screen-reader unit (`accessible` + role=text + the full-prose a11y label). The 5 icons are mutually
// distinct (the a11y-load-bearing shape — the @twt/ui gate asserts distinctness), so the state is legible
// without colour.

/** The contribution i18n copy lives in the `common` namespace as `statusPill.*` (D2 — memberStatus.* precedent). */

/** The lucide glyph component type (derived from a glyph so no transitive `@tamagui/helpers-icon` import). */
type IconComponent = typeof Clock

/**
 * The mobile-palette bridge — the ONLY place tone → Tamagui theme token lives. The good yellow/green/
 * orange/gray triples are carried over verbatim from the pre-9.6 `YogdaanBahiRow.STATUS_TONE`; `mismatch`
 * keeps the warm-UMBER `$orange` (NOT warm-red — UX :1087-1094, a mismatch must not swamp the passbook).
 * `held` is a REAL distinct tone now (no more stopgap-blue): Tamagui has no slate-indigo scale, so `$purple`
 * is the closest dignified cool-neutral that reads "under review" and is visually distinct from both grey
 * and the removed stopgap-blue — aligned to the `@twt/tokens` `status-held` intent (the canonical hex
 * authority the PDF note-template resolves directly).
 */
const TONE_TOKENS = {
  pending: { bg: '$yellow4', border: '$yellow8', color: '$yellow11' },
  confirmed: { bg: '$green4', border: '$green8', color: '$green11' },
  mismatch: { bg: '$orange4', border: '$orange8', color: '$orange11' },
  neutral: { bg: '$gray4', border: '$gray8', color: '$gray11' },
  held: { bg: '$purple4', border: '$purple8', color: '$purple11' },
} as const satisfies Record<StatusPillTone, { bg: string; border: string; color: string }>

/** The presenter's semantic icon name → the lucide glyph. Re-pickable here without touching @twt/ui (D5). */
const ICONS = {
  clock: Clock,
  'check-circle': CheckCircle,
  'alert-triangle': AlertTriangle,
  circle: Circle,
  'pause-circle': PauseCircle,
} as const satisfies Record<StatusPillIconName, IconComponent>

type StatusPillSize = 'tiny' | 'default' | 'large'

/** Size variants (UX §11): tiny = inline in tables (the passbook row), default = standalone, large = detail. */
const SIZE_STYLES = {
  // tiny — kept visually identical to the pre-9.6 passbook pill (px 6 / py 1 / fontSize $1 / rounded $2)
  // so the 56pt YogdaanBahiRow height is unchanged; the small icon is additive within the fixed row.
  tiny: { icon: 12, fontSize: '$1' as const, px: 6, py: 1, gap: 3, rounded: '$2' as const },
  default: { icon: 16, fontSize: '$2' as const, px: 8, py: 4, gap: 5, rounded: '$3' as const },
  large: { icon: 20, fontSize: '$4' as const, px: 12, py: 6, gap: 6, rounded: '$4' as const },
} as const satisfies Record<StatusPillSize, unknown>

type Props = {
  status: ContributionStatus
  size?: StatusPillSize
  /**
   * When true, the pill announces itself as a `polite` live region. Off by default (a pill inside an
   * already-announced row must NOT double-announce — the YogdaanBahiRow posture); the My-Pool card opts
   * IN to preserve its pre-9.6 attested-state live announcement (see ActiveContributionCard).
   */
  live?: boolean
}

export function StatusPill({ status, size = 'default', live = false }: Props) {
  const t = useT()
  const vm = deriveStatusPillViewModel(status)
  const tone = TONE_TOKENS[vm.tone]
  const Icon = ICONS[vm.iconName]
  const s = SIZE_STYLES[size]

  return (
    <XStack
      items="center"
      gap={s.gap}
      bg={tone.bg}
      borderColor={tone.border}
      borderWidth={StyleSheet.hairlineWidth}
      rounded={s.rounded}
      px={s.px}
      py={s.py}
      self="flex-start"
      accessible
      accessibilityRole="text"
      accessibilityLabel={t(vm.a11yLabelKey)}
      {...(live ? { accessibilityLiveRegion: 'polite' as const } : {})}
    >
      <Icon size={s.icon} color={tone.color} />
      <Text fontFamily="$body" fontSize={s.fontSize} color={tone.color}>
        {t(vm.labelKey)}
      </Text>
    </XStack>
  )
}
