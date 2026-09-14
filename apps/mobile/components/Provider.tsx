import { useColorScheme } from 'react-native'
import { TamaguiProvider, type TamaguiProviderProps } from 'tamagui'
import { ToastProvider, ToastViewport } from '@tamagui/toast'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { CurrentToast } from './CurrentToast'
import { config } from '../tamagui.config'
import { persister, queryClient } from '../lib/query-client'

export function Provider({
  children,
  ...rest
}: Omit<TamaguiProviderProps, 'config' | 'defaultTheme'>) {
  const colorScheme = useColorScheme()

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60 * 24 * 7,
        // ⚠⛔⛔ **`gcTime: 0` ALONE DOES ⛔ NOT KEEP A RESPONSE OUT OF MMKV — THIS IS WHAT MAKES IT DO SO.**
        // ⭐ Review finding, 2026-09-14 (Story 11b.17 Group C). `defaultShouldDehydrateQuery` is
        // `status === 'success'` and consults `gcTime` **NOWHERE**, so a query that is MOUNTED and
        // SUCCESSFUL is dehydrated within the `throttleTime` window regardless of its `gcTime`.
        // `gcTime: 0` evicts ⛔ only once the query goes INACTIVE on unmount — i.e. it shortens the
        // window, it does ⛔ not close it. ⚠⛔ And on relaunch `hydrate()` rebuilds an absent query from
        // `getDefaultOptions().hydrate?.queries`, so the hook's `gcTime: 0` is ⛔ **NOT** carried and the
        // restored copy inherits the 7-day client default — ⛔ strictly worse than the original.
        // ⇒ ⭐ **`gcTime: 0` IS READ HERE AS AN EXPLICIT *"⛔ NEVER PERSIST THIS"* MARKER.**
        // ⚠⛔ This is a NARROW, opt-in exclusion. It does ⛔ **NOT** close `deferred-work.md`'s repo-wide
        // persisted-query-cache item (member keys are ⛔ not scoped by `memberId`/`pariwarId` and ⛔ no
        // sign-out path purges the cache) — ⛔ do ⛔ not read it as doing so
        // ([[feedback_closure_language_precision]]).
        dehydrateOptions: {
          shouldDehydrateQuery: (query) =>
            query.state.status === 'success' && query.options.gcTime !== 0,
        },
      }}
    >
      <TamaguiProvider
        config={config}
        defaultTheme={colorScheme === 'dark' ? 'dark' : 'light'}
        {...rest}
      >
        <ToastProvider
          swipeDirection="horizontal"
          duration={6000}
          native={[
            // uncomment the next line to do native toasts on mobile. NOTE: it'll require you making a dev build and won't work with Expo Go
            // 'mobile'
          ]}
        >
          {children}
          <CurrentToast />
          <ToastViewport top="$8" left={0} right={0} />
        </ToastProvider>
      </TamaguiProvider>
    </PersistQueryClientProvider>
  )
}
