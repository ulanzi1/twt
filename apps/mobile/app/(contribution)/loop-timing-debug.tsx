// 90-second loop timing — DEBUG-ONLY inspection/export screen (Story 8.12, Task 2; AC1/AC3-capture-side).
//
// GOVERNANCE / debug-gated: this is the off-device data-pull affordance for the ≥10-session field run
// (half (2), owner BigDev). It lists the recorded per-session breakdowns and offers a "Share JSON" action
// so the raw numeric sessions can be pulled off-device and fed to the Task 4 off-device p95 aggregation.
//
// It is NOT a member surface: guarded by the SAME `loopTimingEnabled()` flag as the store (production
// member builds render the calm "not available" state), and NOTHING on any normal navigation links to it —
// Sushil never sees a stopwatch (D6). RN screens have no mount harness in this repo (the 8.4/8.13 posture)
// → verified by typecheck + lint; the load-bearing logic (breakdown math + store) is unit-tested elsewhere.

import { useCallback, useEffect, useState } from 'react'
import { ScrollView, Share } from 'react-native'
import { Button, H2, Paragraph, Text, View, YStack } from 'tamagui'

import type { LoopBreakdown } from '../../lib/loop-timing'
import {
  clearSessions,
  exportSessionsJson,
  listSessions,
  loopTimingEnabled,
} from '../../lib/loop-timing-store'

/** ms → seconds with 1dp, or an em-dash for a null (incomplete) segment. */
function secs(ms: number | null): string {
  return ms === null ? '—' : `${(ms / 1000).toFixed(1)}s`
}

export default function LoopTimingDebugScreen() {
  const [rows, setRows] = useState<LoopBreakdown[]>([])

  const refresh = useCallback(() => {
    setRows(listSessions())
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Debug flag off (every production member build) → render the inert placeholder, never the tool.
  if (!loopTimingEnabled()) {
    return (
      <View flex={1} items="center" justify="center" p="$4">
        <Paragraph>Loop timing is not available in this build.</Paragraph>
      </View>
    )
  }

  const complete = rows.filter((r) => r.complete)

  async function onShare(): Promise<void> {
    await Share.share({ message: exportSessionsJson() }).catch(() => {
      // Non-fatal — the debug share is best-effort.
    })
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      <YStack gap="$3">
        <H2>Loop timing (debug)</H2>
        <Text>
          {rows.length} session(s) · {complete.length} complete. TWT-portion excludes the UPI round-trip and
          member think-time.
        </Text>

        {rows.map((r, i) => (
          <View key={i} borderTopWidth={1} borderColor="$borderColor" py="$2">
            <Text fontFamily="$tabular">
              #{i + 1} {r.complete ? '✓' : '(incomplete)'} · TWT {secs(r.twtPortionMs)} · total{' '}
              {secs(r.totalMs)}
            </Text>
            <Text fontFamily="$tabular" color="$colorPress" fontSize="$2">
              a {secs(r.segA_ms)} · think {secs(r.memberThinkMs)} · b {secs(r.segB_ms)} · round-trip{' '}
              {secs(r.upiRoundTripMs)} · c-ui {secs(r.segCui_ms)} · d {secs(r.segD_ms)}
            </Text>
          </View>
        ))}

        <Button height={48} onPress={() => void onShare()} disabled={rows.length === 0}>
          Share JSON
        </Button>
        <Button
          height={48}
          chromeless
          onPress={() => {
            clearSessions()
            refresh()
          }}
        >
          Clear
        </Button>
      </YStack>
    </ScrollView>
  )
}
