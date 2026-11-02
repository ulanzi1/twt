// A v4 UUID that is safe to mint outside a secure context (Story 6.22 code review 2026-11-02, RC6).
//
// ⚠⛔ `crypto.randomUUID` is SECURE-CONTEXT-GATED: over plain `http://` on a LAN or staging host it is `undefined` (the incident
// `newIdempotencyKey` in `hooks.ts` records). `crypto.getRandomValues` is NOT gated, so a UUID is built from it when
// `randomUUID` is missing. Needed where the SERVER validates the shape (`z.string().uuid()` — the fraud investigation's step and
// finding ids), which `newIdempotencyKey`'s `dt-…` fallback would fail. ⛔ Call it from an event handler or on first use, ⛔ from a
// render path: a throw there takes down the whole route.

export function newUuid(): string {
  const c: Crypto | undefined = globalThis.crypto;
  if (typeof c?.randomUUID === 'function') return c.randomUUID();
  const b = new Uint8Array(16);
  if (typeof c?.getRandomValues === 'function') c.getRandomValues(b);
  else for (let i = 0; i < b.length; i += 1) b[i] = Math.floor(Math.random() * 256); // ⛔ not cryptographic; unique per attempt is all that is needed
  b[6] = (b[6]! & 0x0f) | 0x40; // version 4
  b[8] = (b[8]! & 0x3f) | 0x80; // variant 10xx
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
