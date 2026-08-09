// The MISSED-CYCLE section — Story 10.27 (Task 5; AC1/AC2/AC4/AC6; D1/D3/D4/D5).
//
// ⚖ WHAT THIS SECTION SAYS, AND WHAT IT MUST NEVER SAY.
// It reports what the RECORD contains: "our records hold no matched contribution for this cycle". It
// does NOT say the member missed anything, and it CANNOT say why. Of the three causes the
// commissioning decision names, two are structurally unrecorded and the third — a member sending
// money straight to a bereaved family, the cadre's chanda tradition — is FENCED against ever being
// recorded (`docs/policies/out-of-band-contributions.md` stance 4 + the no-ingest-path fence). So the
// state is EPISTEMIC, not causal (D1). That is not a weaker answer than a cause label: it is an
// HONEST one, and the policy this surface is bound by already demands exactly this register —
// "statements about what the machine can do, never about the worth of what the member did".
//
// ── ⛔ ABSENT, NOT EMPTY (AC4) ───────────────────────────────────────────────────────────────────
// Zero entries renders `null`. No section, no header, no "0", no reassurance line. A member who has
// missed nothing must not be shown a missed-cycle affordance at all — an empty state saying "no
// missed cycles" introduces the very frame this surface exists to avoid, and a running count is a
// scoreboard. `[]` is ALSO what absent projection coverage returns (D5): with no projection the
// record supports no statement in either direction, so the surface makes none. The two are
// deliberately indistinguishable here.
//
// ── ⛔ RENDERED OUTSIDE ANY FlatList, IN BOTH BRANCHES OF THE PASSBOOK ───────────────────────────
// New-Arch (Fabric) red-boxes a FlatList crossing empty→populated in place
// ([[project_fabric_flatlist_empty_populated_crash]]), so this section is a plain mapped YStack in
// the passbook's stable region — never a list item, header or footer. And it renders in the
// zero-attested-rows branch too: a member who has attested NOTHING but has a missed cycle is this
// story's primary population, and a literal reading of "a section in the populated list" would have
// shown them nothing at all.
//
// ── The R7(G) route (AC6) ────────────────────────────────────────────────────────────────────────
// The assertion surface ALREADY EXISTS (Story 10.26) and is CONSUMED here, not rebuilt: one
// `<PersonalEventAssertion>` per row, handed THAT row's cycle UUID. Per-row instantiation rather
// than a navigation, because the membership screen's existing instance carries no cycle context and
// stays exactly as it is. ⚖ Filing one changes nothing — not the member's state, not their validity,
// not these rows (ratified Niyamavali §3.1). The surface says so before the member commits.
//
// Numeral discipline (UX line 1127): cycle ref, pool code and canonical identifier are Gregorian +
// Latin numerals, tabular. Every visible string is an i18n KEY (Hindi-first).

import { useT } from '@twt/i18n/react'
import type { MissedCycleEntry } from '@twt/contracts'
import { StyleSheet } from 'react-native'
import { Text, XStack, YStack } from 'tamagui'

import { PersonalEventAssertion } from '../member-status/PersonalEventAssertion'
import { shouldRenderMissedCycles } from './missed-cycles'

const NS = { namespace: 'contribution' } as const

export interface MissedCycleSectionProps {
  /** The server's `missedCycles` collection — its OWN array, never folded into the passbook rows (D3). */
  entries: readonly MissedCycleEntry[] | undefined
  /** The member's own Pariwar, from the session context — forwarded to the 10.26 assertion flow. */
  pariwarId?: string | undefined
  /** Opens the Helpdesk (Madad) — the surface with real humans on it. */
  onOpenHelpdesk?: (() => void) | undefined
}

export function MissedCycleSection({ entries, pariwarId, onOpenHelpdesk }: MissedCycleSectionProps) {
  const t = useT()

  // ⛔ AC4 — the absent/empty decision, made by a PURE predicate so it is assertable without a
  // renderer (see `missed-cycles.ts`). Returning `null` is the whole point; do not "improve" this
  // into an empty state.
  if (!shouldRenderMissedCycles(entries)) return null
  const rows = entries ?? []

  return (
    <YStack
      px={12}
      py={12}
      gap="$2"
      borderTopWidth={1}
      borderTopColor="$borderColor"
      bg="$background"
      testID="missed-cycle-section"
      accessibilityLabel={t('missed_cycle.section_a11y', undefined, NS)}
    >
      <Text fontFamily="$body" fontSize="$3" fontWeight="600" color="$color" accessibilityRole="header">
        {t('missed_cycle.section_title', undefined, NS)}
      </Text>

      {/* The register, stated once for the section rather than repeated per row: what the record
          holds, that records may be partial, that nothing here is settled, and where a human is. */}
      <Text fontFamily="$body" fontSize="$2" color="$colorPress" accessibilityRole="text">
        {t('missed_cycle.section_note', undefined, NS)}
      </Text>

      {rows.map((entry) => (
        <YStack key={entry.cycleId} gap="$1" py={8} borderTopWidth={StyleSheet.hairlineWidth} borderTopColor="$borderColor">
          <XStack
            items="center"
            gap={6}
            accessible
            accessibilityRole="text"
            accessibilityLabel={t(
              'missed_cycle.entry_a11y',
              {
                cycle: entry.cycleRef,
                pool: entry.poolLetterCode,
                reference: entry.poolCanonicalIdentifier,
              },
              NS,
            )}
          >
            <Text fontFamily="$tabular" fontSize="$2" color="$color" style={styles.tabularNums}>
              {t('missed_cycle.cycle_label', { cycle: entry.cycleRef }, NS)}
            </Text>
            <Text fontFamily="$tabular" fontSize="$2" color="$colorPress" style={styles.tabularNums}>
              {t('missed_cycle.pool_label', { pool: entry.poolLetterCode }, NS)}
            </Text>
          </XStack>

          {/* ⛔ AC2 — the EPISTEMIC state label. NOT a <StatusPill>: the five tones describe an
              ATTESTED contribution, and reusing `grey` here would collapse "you told us you paid and
              we haven't matched it" into "we have no record of a contribution from you". Rendered as
              text with its own a11y statement, never as colour alone. */}
          <Text fontFamily="$body" fontSize="$2" color="$colorPress" accessibilityLabel={t('missed_cycle.state_a11y', undefined, NS)}>
            {t('missed_cycle.state_label', undefined, NS)}
          </Text>

          {/* The Madad / support reference the member can read out on a call. */}
          <Text fontFamily="$tabular" fontSize="$1" color="$colorPress" style={styles.tabularNums}>
            {t('missed_cycle.reference_label', { reference: entry.poolCanonicalIdentifier }, NS)}
          </Text>

          {/* ⛔ AC6/D4 — the 10.26 assertion flow, CONSUMED not rebuilt, with THIS row's cycle UUID.
              `cycleId` is the UUID; the display `cycleRef` above never reaches the request. */}
          <PersonalEventAssertion
            pariwarId={pariwarId}
            cycleId={entry.cycleId}
            onOpenHelpdesk={onOpenHelpdesk}
          />
        </YStack>
      ))}
    </YStack>
  )
}

const styles = StyleSheet.create({
  tabularNums: {
    fontVariant: ['tabular-nums'],
  },
})
