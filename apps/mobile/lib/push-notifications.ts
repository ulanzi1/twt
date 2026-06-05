import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

// Push notification scaffolding per architecture §3.3 + §3.4 dispatcher
// commitments (FCM Android + APNs iOS) for P0-5 P3 measurement.
//
// Full P3 measurement (≥95% delivery + ≤5s p95 latency per UX spec line 824)
// requires:
//   - Firebase project + google-services.json in apps/mobile/  (Android FCM)
//   - APNs key from Apple Developer Program account  (iOS APNs)
//   - expo-server-sdk on a backend to dispatch via ExpoPushTokens
//
// At Day 8 prototype scope: local-notification path validated end-to-end
// (request permission → get token → schedule local notification → fire).
// Remote-FCM/APNs delivery path stubbed pending Apple Developer Program
// enrollment (Day 10) + Firebase project setup.

// Notification handler — shows notification when received in foreground.
// Default behavior is to suppress foreground notifications, which makes
// P3 measurement harder to observe. Show them always for the prototype.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
})

export type PermissionState =
  | { kind: 'granted' }
  | { kind: 'denied'; canRetry: boolean }
  | { kind: 'undetermined' }
  | { kind: 'unsupported'; reason: string }

export type PushTokenResult =
  | { kind: 'expo'; token: string }
  | { kind: 'device'; token: string; platform: 'android' | 'ios' }
  | { kind: 'unavailable'; reason: string }

// expo-notifications 56.0.15 has a broken d.ts re-export — its
// PermissionResponse import from 'expo' is unresolved, so TypeScript
// can't see the status/granted/canAskAgain fields. Runtime API is
// correct. Cast through this canonical shape.
type CanonicalPermissionResult = {
  status: 'granted' | 'denied' | 'undetermined'
  granted: boolean
  canAskAgain: boolean
}

/**
 * Request notification permission from the OS. iOS shows the system prompt
 * the first time; Android < 13 returns granted by default; Android 13+
 * requires POST_NOTIFICATIONS runtime permission.
 */
export async function requestPushPermission(): Promise<PermissionState> {
  if (!Device.isDevice) {
    return {
      kind: 'unsupported',
      reason: 'Push notifications require a physical device — simulator/emulator unsupported',
    }
  }

  const existing = (await Notifications.getPermissionsAsync()) as unknown as CanonicalPermissionResult
  if (existing.status === 'granted') {
    return { kind: 'granted' }
  }
  if (existing.status === 'denied' && !existing.canAskAgain) {
    return { kind: 'denied', canRetry: false }
  }

  const requested = (await Notifications.requestPermissionsAsync()) as unknown as CanonicalPermissionResult
  if (requested.status === 'granted') {
    return { kind: 'granted' }
  }
  if (requested.status === 'denied') {
    return { kind: 'denied', canRetry: requested.canAskAgain ?? false }
  }
  return { kind: 'undetermined' }
}

/**
 * Fetch the Expo push token if available, falling back to the platform's
 * native device token if Expo's token cannot be obtained (no projectId in
 * dev / no Firebase config / etc).
 *
 * For Task 10 P3 measurement, this token is what a backend (or test rig)
 * dispatches to via expo-server-sdk or directly via FCM/APNs.
 */
export async function getPushToken(): Promise<PushTokenResult> {
  if (!Device.isDevice) {
    return {
      kind: 'unavailable',
      reason: 'Push tokens require a physical device',
    }
  }

  const permission = await requestPushPermission()
  if (permission.kind !== 'granted') {
    return {
      kind: 'unavailable',
      reason: `Permission ${permission.kind}`,
    }
  }

  try {
    // Expo push token path — works when projectId is configured in app.json
    // extra.eas.projectId. For the prototype without an EAS project, this
    // returns an error and we fall back to device token.
    const expoToken = await Notifications.getExpoPushTokenAsync()
    return { kind: 'expo', token: expoToken.data }
  } catch {
    // Fall back to platform device token (raw FCM token on Android,
    // APNs device token on iOS).
    try {
      const deviceToken = await Notifications.getDevicePushTokenAsync()
      return {
        kind: 'device',
        token: deviceToken.data,
        platform: Platform.OS === 'android' ? 'android' : 'ios',
      }
    } catch (err) {
      return {
        kind: 'unavailable',
        reason: err instanceof Error ? err.message : String(err),
      }
    }
  }
}

/**
 * Schedule a local notification to fire after `delaySeconds` seconds.
 * Useful for P3 partial validation: tests the notification render path
 * + foreground/background handling without requiring server dispatch.
 *
 * Returns the notification ID (can be used to cancel before firing).
 */
export async function scheduleTestNotification(delaySeconds = 5): Promise<string> {
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'TWT P0-5 Test Notification',
      body: `Scheduled at ${new Date().toLocaleTimeString('en-IN')} — fires in ${delaySeconds}s`,
      data: { source: 'p0-5-test-batch' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: delaySeconds,
    },
  })
  return id
}

/**
 * Schedule N local notifications spaced `gapSeconds` apart for batch
 * delivery-rate measurement at Task 10 P3.
 */
export async function scheduleTestBatch(
  count: number,
  gapSeconds = 1,
): Promise<string[]> {
  const ids: string[] = []
  for (let i = 0; i < count; i++) {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `TWT Batch ${i + 1}/${count}`,
        body: `Batch test notification ${i + 1} of ${count}`,
        data: { source: 'p0-5-test-batch', batchIndex: i, batchSize: count },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 1 + i * gapSeconds,
      },
    })
    ids.push(id)
  }
  return ids
}
