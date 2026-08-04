// The contribution-during-suspension disclosure — Story 10.16 (Task 3; AC1 + AC4 + AC5 + AC6).
//
// The block a member being asked to contribute WITHOUT coverage sees BEFORE they can act. It says all
// three things AC1 requires, in this order:
//   (a) what the payment DOES        — it counts toward restoring standing;
//   (b) what it does NOT buy         — no beneficiary entitlement for a death during the suspension;
//   (c) how many contributions remain in the restoration package — subject to AC4's honest-absence rule.
//
// ── It is a DISCLOSURE, not a warning ───────────────────────────────────────────────────────────────
// AC5 forbids any framing that characterises the member's suspension as a moral failing, and AC6
// requires the meaning to live in the WORDS, not in a colour. So this renders in the neutral border /
// body treatment of the sibling `summary` panels on this screen — deliberately NOT the `$red10`
// alert treatment used for a decrypt failure or an invalid UTR. Cause is attributed ONLY through the
// trustee-recorded reason label; this component authors no accusation of its own.
//
// Module-level (never render-nested) — the `FieldRow` / `ChooseOtherAccountButton` convention at
// `pay.tsx:64-90`, so it never remounts on a parent re-render.

import type { ContributionDisclosureViewModel } from '@twt/ui'
import {
  DISCLOSURE_GET_HELP_KEY,
  DISCLOSURE_REASON_LINE_KEY,
  RESTORATION_PACKAGE_REMAINING_KEY,
  RESTORATION_PACKAGE_UNAVAILABLE_KEY,
} from '@twt/ui'
import type { BoundTranslate } from '@twt/i18n'
import { Paragraph, Text, YStack } from 'tamagui'

import { CallHelplineCTA } from '../common/CallHelplineCTA'

const NS = { namespace: 'contribution' } as const

export interface SuspensionDisclosureProps {
  /** The pure `@twt/ui` derivation's output. The caller renders nothing when it is `null`. */
  vm: ContributionDisclosureViewModel
  /** The locale-bound `t` from the screen's `useT()` — this component resolves KEYS, never copy. */
  t: BoundTranslate
}

export function SuspensionDisclosure({ vm, t }: SuspensionDisclosureProps): React.ReactElement {
  // AC4 — the count is FIRST-CLASS ABSENT today, never `0` and never silently omitted. The `ok` arm is
  // declared and unreachable until the Story 10.24 contribution-fact producer lands; when it does, this
  // renders the count with NO change to the (a)/(b) copy keys or to `pay.tsx`. The numerals interpolate
  // as Latin operational numerals (amendment-A2) — `t` does no Devanagari numeral conversion here.
  // Destructured so the discriminated union narrows in both arms below.
  const restoration = vm.restorationPackage

  return (
    <YStack
      gap="$2"
      borderColor="$borderColor"
      borderWidth={1}
      rounded="$4"
      p="$3"
      // AC6 — announced, and announced POLITELY: this is context the member needs before acting, not an
      // interruption. A disclosure a screen-reader user never hears is the same failure as one below the
      // fold, so the whole block carries a single full-prose label rather than relying on the reader
      // stitching four separate <Text> nodes together. `accessible` is what actually collapses the
      // subtree into that one element — without it, `accessibilityLabel` alone does not stop a screen
      // reader from also discovering and reading each inner <Text>/<Paragraph> node separately.
      accessible
      accessibilityRole="summary"
      accessibilityLiveRegion="polite"
      accessibilityLabel={t(vm.a11yLabelKey, undefined, NS)}
      testID="contribution-suspension-disclosure"
    >
      <Text fontFamily="$body" fontWeight="600" fontSize="$4" color="$color">
        {t(vm.titleKey, undefined, NS)}
      </Text>

      {/* AC5 — the ONLY cause this copy attributes: the trustee-recorded reason code, rendered as its
          catalogued LABEL from the `common` catalog (never the raw code). `{reason}` is REQUIRED — `t()`
          throws on a missing interpolation param — so it is resolved first and always passed. */}
      {vm.reasonLabelKey !== null ? (
        <Paragraph fontSize="$3" color="$colorPress">
          {t(DISCLOSURE_REASON_LINE_KEY, { reason: t(vm.reasonLabelKey) }, NS)}
        </Paragraph>
      ) : null}

      {/* (a) what the payment DOES. */}
      <Paragraph fontSize="$3" color="$color">
        {t(vm.whatItDoesKey, undefined, NS)}
      </Paragraph>

      {/* (b) what it does NOT buy — the load-bearing half. Never suppressed by (c)'s absence (AC4). */}
      <Paragraph fontSize="$3" color="$color">
        {t(vm.whatItDoesNotBuyKey, undefined, NS)}
      </Paragraph>

      {/* (c) the restoration count. */}
      {restoration.status === 'package_unavailable' ? (
        <YStack gap="$1">
          <Paragraph fontSize="$3" color="$colorPress">
            {t(RESTORATION_PACKAGE_UNAVAILABLE_KEY, undefined, NS)}
          </Paragraph>
          <CallHelplineCTA label={t(DISCLOSURE_GET_HELP_KEY, undefined, NS)} />
        </YStack>
      ) : (
        <Paragraph fontFamily="$tabular" fontSize="$3" color="$color">
          {t(
            RESTORATION_PACKAGE_REMAINING_KEY,
            {
              remaining: String(restoration.remaining),
              required: String(restoration.required),
            },
            NS,
          )}
        </Paragraph>
      )}
    </YStack>
  )
}
