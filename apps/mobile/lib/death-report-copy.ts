// Story 6.38 (DL18, DL19; `2026-10-31-424` Q2 (a) A, Q2 (b) A) — once a claim is filed for the member's death, the account
// can ⛔ withdraw the membership and can ⛔ change the record directly (address, workplace, the suggested-workplace answer,
// the medical declaration): the API answers a 409 and the screen says so calmly — ⛔ the raw server English. PURE (zero
// imports) so the real-`t()` test resolves every key in BOTH locales in node ([[feedback_stub_must_call_not_transcribe]]).
// The keys live in the `common` namespace (the withdrawal and Life Events screens' own); the workplace screens resolve them
// there too — the `workplace` namespace names ⛔ death or claim. The Hindi was reviewed by BigDev on 2026-10-31.

/** The withdrawal route's refusal (`apps/api/src/modules/withdrawal/handlers.ts`). */
export const WITHDRAWAL_DEATH_REPORTED_CODE = 'withdrawal.death_reported'
/** The Life Events guard's refusal — address, workplace, the suggested-workplace answer. */
export const LIFE_EVENTS_DEATH_REPORTED_CODE = 'life_events.death_reported'
/** The medical declaration's refusal. */
export const MEDICAL_DEATH_REPORTED_CODE = 'medical.death_reported'

export const DEATH_REPORTED_COPY = {
  withdrawal: 'withdrawal.error_death_reported',
  lifeEvents: 'lifeEvents.error_death_reported',
} as const

function codeOf(err: unknown): unknown {
  return err !== null && typeof err === 'object' ? (err as { code?: unknown }).code : undefined
}

/** A failed withdrawal → its `common` copy key: the death-reported line, else the screen's generic one. */
export function withdrawalErrorKey(err: unknown): string {
  return codeOf(err) === WITHDRAWAL_DEATH_REPORTED_CODE ? DEATH_REPORTED_COPY.withdrawal : 'withdrawal.error_generic'
}

/** A failed Life Events write → the death-reported `common` key, or `null` (the caller keeps its own refusal words). */
export function lifeEventsDeathReportedKey(err: unknown): string | null {
  const code = codeOf(err)
  return code === LIFE_EVENTS_DEATH_REPORTED_CODE || code === MEDICAL_DEATH_REPORTED_CODE ? DEATH_REPORTED_COPY.lifeEvents : null
}
