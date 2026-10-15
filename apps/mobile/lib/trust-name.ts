// The Trust's display name, FROM CONFIG ONLY (Story 6.36b; 6.36a I12) — `EXPO_PUBLIC_TRUST_NAME`, the SAME variable
// `app.config.ts` reads for the native contacts-permission text. The legal name is under registration, so it is ⛔ never
// written into the app or its copy. `null` when not configured — the copy then uses its `*_no_name` wording.
// ⚠ Expo inlines `process.env.EXPO_PUBLIC_*` only when read by this LITERAL name.

export function configuredTrustName(): string | null {
  const value = process.env.EXPO_PUBLIC_TRUST_NAME?.trim()
  return value ? value : null
}
