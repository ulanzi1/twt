import { createMMKV } from 'react-native-mmkv'

// MMKV instance for P0-5 P4 offline-cache measurement per architecture
// §4.5 lines 2577-2592 (JSI-based + synchronous + ~10-30× faster than
// AsyncStorage at scale).
//
// Single instance shared across the prototype. Namespaced under
// `twt-p0-5` so future Epic 1 Story 1.1 substrate work re-scaffolds
// from a clean namespace.
//
// react-native-mmkv v4 API: `createMMKV(config)` factory; the old
// `new MMKV()` constructor pattern was removed in v4.

export const mmkv = createMMKV({
  id: 'twt-p0-5',
})

// Sync-storage adapter satisfying TanStack Query's SyncStorage shape:
//   getItem: (key) => string | null
//   setItem: (key, value) => void
//   removeItem: (key) => void
//
// MMKV's getString returns `string | undefined`; we normalize undefined → null
// to match the SyncStorage contract.
// MMKV v4 uses `remove(key)` (returns boolean); v3 used `delete(key)`.
export const mmkvStorage = {
  getItem: (key: string): string | null => mmkv.getString(key) ?? null,
  setItem: (key: string, value: string): void => mmkv.set(key, value),
  removeItem: (key: string): void => {
    mmkv.remove(key)
  },
}
