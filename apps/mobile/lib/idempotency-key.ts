// A fresh `Idempotency-Key` per NEW save — shared (Story 6.36a moved it here from `lib/peer-request.ts`, where Story 6.27a
// wrote it, once a second caller needed it: the workplace save, `components/workplace/WorkplacePicker.tsx`). A retry of the
// SAME save reuses its key; the server then replays the original result instead of writing twice.

/**
 * A fresh Idempotency-Key per NEW save (a retry of the same save reuses its key). A CSPRNG first (`crypto.randomUUID`,
 * Hermes via expo-crypto's polyfill — the repo's `usePersonalEventAssertion` pattern), then `getRandomValues`;
 * `Math.random` only where neither exists (second-pass review S37).
 */
export function newIdempotencyKey(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string; getRandomValues?: (a: Uint8Array) => Uint8Array } }).crypto
  if (typeof c?.randomUUID === 'function') return c.randomUUID()
  const bytes = new Uint8Array(16)
  if (typeof c?.getRandomValues === 'function') c.getRandomValues(bytes)
  else for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256)
  bytes[6] = (bytes[6]! & 0x0f) | 0x40
  bytes[8] = (bytes[8]! & 0x3f) | 0x80
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
