import { useCallback, useState } from 'react'
import { Pressable, StyleSheet } from 'react-native'
import { Text, View, XStack, YStack } from 'tamagui'
import {
  getPushToken,
  requestPushPermission,
  scheduleTestBatch,
  scheduleTestNotification,
  type PermissionState,
  type PushTokenResult,
} from '../../lib/push-notifications'

// P3 push-notification diagnostic panel for Task 10 measurement evidence.
// Lives at the bottom of the Panchayat tab — operator can trigger
// permission request + token retrieval + test-batch dispatch from a
// stable surface.
//
// This panel is prototype-only diagnostics; production removes it
// (notifications wire to architecture §3.3 dispatcher via expo-server-sdk
// from a backend, not from user-triggered UI).

type State = {
  permission: PermissionState | null
  token: PushTokenResult | null
  scheduledIds: string[]
  log: string[]
}

const INITIAL: State = {
  permission: null,
  token: null,
  scheduledIds: [],
  log: [],
}

export function P3DiagnosticPanel() {
  const [state, setState] = useState<State>(INITIAL)

  const append = useCallback((line: string) => {
    setState((s) => ({ ...s, log: [...s.log.slice(-9), `${time()} ${line}`] }))
  }, [])

  const handleRequestPermission = useCallback(async () => {
    append('Requesting push permission…')
    const permission = await requestPushPermission()
    setState((s) => ({ ...s, permission }))
    append(`Permission: ${describePermission(permission)}`)
  }, [append])

  const handleGetToken = useCallback(async () => {
    append('Fetching push token…')
    const token = await getPushToken()
    setState((s) => ({ ...s, token }))
    append(`Token: ${describeToken(token)}`)
  }, [append])

  const handleScheduleOne = useCallback(async () => {
    append('Scheduling 1 local notification in 5s…')
    const id = await scheduleTestNotification(5)
    setState((s) => ({ ...s, scheduledIds: [...s.scheduledIds, id] }))
    append(`Scheduled id: ${id.slice(0, 8)}…`)
  }, [append])

  const handleScheduleBatch = useCallback(async () => {
    append('Scheduling batch of 5 notifications (1s apart)…')
    const ids = await scheduleTestBatch(5, 1)
    setState((s) => ({ ...s, scheduledIds: [...s.scheduledIds, ...ids] }))
    append(`Batch scheduled: ${ids.length} ids`)
  }, [append])

  return (
    <YStack
      px={16}
      py={16}
      gap="$2"
      borderTopWidth={StyleSheet.hairlineWidth}
      borderTopColor="$borderColor"
      bg="$backgroundHover"
    >
      <Text fontFamily="$body" fontSize="$2" color="$colorPress" letterSpacing={2}>
        P3 push diagnostic
      </Text>

      <XStack flexWrap="wrap" gap="$2">
        <DiagButton label="Request permission" onPress={handleRequestPermission} />
        <DiagButton label="Get token" onPress={handleGetToken} />
        <DiagButton label="Schedule 1" onPress={handleScheduleOne} />
        <DiagButton label="Schedule batch 5" onPress={handleScheduleBatch} />
      </XStack>

      {state.permission && (
        <Text fontFamily="$body" fontSize="$1" color="$colorPress">
          Permission: {describePermission(state.permission)}
        </Text>
      )}
      {state.token && (
        <Text
          fontFamily="$tabular"
          fontSize="$1"
          color="$colorPress"
          style={styles.tabularNums}
          numberOfLines={2}
        >
          Token: {describeToken(state.token)}
        </Text>
      )}
      {state.scheduledIds.length > 0 && (
        <Text fontFamily="$body" fontSize="$1" color="$colorPress">
          Scheduled this session: {state.scheduledIds.length}
        </Text>
      )}

      {state.log.length > 0 && (
        <YStack
          bg="$background"
          p={8}
          gap={2}
          mt="$1"
        >
          {state.log.map((line, i) => (
            <Text
              key={`${i}-${line.slice(0, 16)}`}
              fontFamily="$tabular"
              fontSize="$1"
              color="$colorPress"
              style={styles.tabularNums}
            >
              {line}
            </Text>
          ))}
        </YStack>
      )}
    </YStack>
  )
}

function DiagButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View
        px={10}
        py={6}
        borderWidth={1}
        borderColor="$borderColor"
        bg="$background"
      >
        <Text fontFamily="$body" fontSize="$2" color="$color">
          {label}
        </Text>
      </View>
    </Pressable>
  )
}

function describePermission(p: PermissionState): string {
  switch (p.kind) {
    case 'granted':
      return 'granted'
    case 'denied':
      return `denied (canRetry=${p.canRetry})`
    case 'undetermined':
      return 'undetermined'
    case 'unsupported':
      return `unsupported: ${p.reason}`
  }
}

function describeToken(t: PushTokenResult): string {
  switch (t.kind) {
    case 'expo':
      return `expo: ${t.token}`
    case 'device':
      return `device (${t.platform}): ${t.token}`
    case 'unavailable':
      return `unavailable: ${t.reason}`
  }
}

function time(): string {
  return new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

const styles = StyleSheet.create({
  tabularNums: {
    fontVariant: ['tabular-nums'],
  },
})
