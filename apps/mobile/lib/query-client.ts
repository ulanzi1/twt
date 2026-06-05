import { QueryClient } from '@tanstack/react-query'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { mmkvStorage } from './mmkv'

// QueryClient sized for the P0-5 prototype's P4 offline-cache measurement.
// Conservative staleTime + generous gcTime per the prototype's discipline
// of "cached data visible even after cold-restart-while-offline".

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cached data is considered fresh for 1 hour — supports P4 cold-restart
      // measurement where the app re-mounts and pulls from cache without
      // re-fetching.
      staleTime: 1000 * 60 * 60,  // 1h
      // Garbage-collected after 7 days unused. P4 measurement runs within
      // a single day so gcTime doesn't bite the measurement window.
      gcTime: 1000 * 60 * 60 * 24 * 7,  // 7d
      // Retry once on failure — keeps offline cold-start fast (no retry storm)
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
})

// Sync-storage persister backed by MMKV per architecture §4.5
export const persister = createSyncStoragePersister({
  storage: mmkvStorage,
  key: 'twt-p0-5-cache',
  // Throttle persistence writes; default 1000ms is fine for the prototype.
  // Production may want to tune this per architecture line 2591 MMKV-write-discipline.
  throttleTime: 1000,
})
