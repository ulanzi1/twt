// Story 11b.4 (AC2 / AC13, R20) — what EVERY memorial screen shows when it has no view to draw: the member GET failed
// (`retry: false`) or answered `{ memorial: null }` (a deep link or a restored screen after the drive closed). It used to
// return `null` inside a `headerShown: false` stack — no message, no retry, no exit. Now: the sticky header (the way out),
// one gentle line, a retry, and the helpline (Pattern 4: what happened · what to do · the helpline).
//
// ⚠ Rendered in a ScrollView, ⛔ never as the empty state of a list (Fabric crashes on a FlatList that flips between empty
// and populated). While the query is still loading the line says so (never a spinner with no words, never progress language).
// Two variants of the line. `writing` (write, photo, preview) says what the family wrote is safe on this phone — true there,
// the draft lives on the phone and the screen has just read it. `outcome` makes NO claim about the phone: it is for every
// screen where the draft state is UNKNOWN or the draft is already CLEARED — the outcome (after a Send the draft is cleared
// and the words are with the Trust) and the intro (its draft key needs the very view that failed to load).
// W7 — "loading" is shown while the FIRST load is pending (`loading`, the caller's `isPending`) or while a fetch the family
// ASKED for (a Retry tap) is in flight, whatever the last result was (an error or `{ memorial: null }`): a LOCAL flag, set on
// the tap and cleared when that fetch settles — TanStack v5's `refetch()` leaves `isPending` false and moves `isFetching` on
// every background refetch too, so neither can tell a Retry from a background refetch (which must not flicker the line).
// Retry is disabled meanwhile (a second tap would cancel and restart the GET). The flag is also released after
// {@link MEMORIAL_VIEW_RETRY_BOUND_MS} (a refetch can JOIN a hung fetch — a Retry must not stay disabled for ever).
// X4 — the FIRST load is bounded too: a fetch that is running when this component MOUNTS (the first load, `isPending`; or a
// mount refetch after a cached ERROR — `isError && isFetching` at mount, when `isPending` is already false) shows "loading",
// with no Retry, until it settles or the same bound passes; then the missing line and an active Retry (a GET that never
// settles must not leave the family on "loading" for ever). Only a fetch running AT MOUNT counts — a background refetch that
// starts later still does not flip the line (W7); and a cached `{ memorial: null }` keeps its line and Retry while it is
// refetched (V11 — the caller passes `fetching` only after an error).
// X7 (family 13 (d)) — the loading line a Retry TAP brings is SPOKEN on iOS too (its live region speaks it on Android); the
// first load is not (the screen reader reads the screen on arrival).

import { useEffect, useRef, useState } from 'react'
import { ScrollView } from 'react-native'
import { Button, Paragraph, YStack } from 'tamagui'

import { CallHelplineCTA } from '../common/CallHelplineCTA'
import { useMemorialT } from '../../lib/memorial-i18n'
import { MemorialHeader } from './MemorialHeader'
import { useMemorialAnnounce } from './useMemorialAnnounce'

/** W7 — the longest a Retry tap shows "loading" (and keeps Retry disabled) when its fetch never settles. */
export const MEMORIAL_VIEW_RETRY_BOUND_MS = 20_000

export function MemorialViewMissing({
  loading: firstLoad,
  fetching = false,
  onRetry,
  variant = 'writing',
}: {
  /** The FIRST load is still pending (the caller's `isPending`). */
  loading: boolean
  /**
   * `isError && isFetching` from the caller — read only for the fetch running AT MOUNT (X4: a mount refetch after a cached
   * error); a background refetch that starts later moves it too and must not flip the line (W7).
   */
  fetching?: boolean
  /** Refetch the view; the returned promise settling ends the Retry's "loading". */
  onRetry: () => unknown
  variant?: 'writing' | 'outcome'
}): React.ReactElement {
  const t = useMemorialT()
  // X4 — a fetch running when this component mounted (the first load, or a mount refetch after a cached error) …
  const [mountFetch, setMountFetch] = useState(firstLoad || fetching)
  useEffect(() => {
    if (!firstLoad && !fetching) setMountFetch(false) // … ends when it settles …
  }, [firstLoad, fetching])
  const [waitedOut, setWaitedOut] = useState(false)
  useEffect(() => {
    if (!mountFetch) return
    const timer = setTimeout(() => setWaitedOut(true), MEMORIAL_VIEW_RETRY_BOUND_MS) // … or when the bound passes
    return () => clearTimeout(timer)
  }, [mountFetch])
  const initialLoad = mountFetch && !waitedOut
  const [retrying, setRetrying] = useState(false)
  // The guard itself is a ref: two taps before the re-render must not both start a fetch.
  const retryingNow = useRef(false)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const retry = (): void => {
    if (retryingNow.current) return
    retryingNow.current = true
    setRetrying(true)
    let timer: ReturnType<typeof setTimeout> | undefined
    const bound = new Promise<void>((resolve) => {
      timer = setTimeout(resolve, MEMORIAL_VIEW_RETRY_BOUND_MS)
    })
    let fetching: Promise<unknown>
    try {
      fetching = Promise.resolve(onRetry()) // called at the tap (synchronously), as before
    } catch {
      fetching = Promise.resolve()
    }
    void Promise.race([fetching, bound])
      .catch(() => undefined)
      .then(() => {
        if (timer !== undefined) clearTimeout(timer)
        retryingNow.current = false
        if (mounted.current) setRetrying(false)
      })
  }
  const loading = initialLoad || retrying
  const missing = variant === 'outcome' ? t('view_missing.body_outcome') : t('view_missing.body')
  const line = loading ? t('view_missing.loading') : missing
  // The line is a live region (Android); iOS is told here. The first load is not announced (it is read on arrival); the
  // loading line a Retry TAP brings is (X7 — a calm status, `polite`). Once the view is missing for good it is an error the
  // family must act on (retry or call): the plan's `assertive`.
  const lineLive = useMemorialAnnounce(initialLoad ? null : line, { hasLiveRegion: true, kind: loading ? 'status' : 'error' })
  return (
    <YStack flex={1}>
      <MemorialHeader showSaved={false} />
      <ScrollView>
        <YStack px="$4" py="$4" gap="$4" testID="memorial-view-missing">
          <Paragraph accessibilityLiveRegion={lineLive} testID="memorial-view-missing-line">
            {line}
          </Paragraph>
          {initialLoad ? null : (
            // W7 — during a Retry the button stays where it is (focus is not lost) but is disabled until the fetch settles.
            <Button style={{ minHeight: 44 }} accessibilityRole="button" testID="memorial-view-missing-retry" disabled={retrying} onPress={retry}>
              {t('view_missing.retry')}
            </Button>
          )}
          <CallHelplineCTA />
        </YStack>
      </ScrollView>
    </YStack>
  )
}
