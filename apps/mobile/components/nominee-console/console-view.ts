// Nominee Console — the PURE view-decision logic (Story 9.1, Task 1/3).
//
// The mobile app has NO component-render test harness (vitest.config.ts: node-testable PURE logic only),
// so the console's render decisions are factored HERE as pure functions the shell renders from and the
// unit tests pin directly (the pool-onboarding-gate / tone-gradient precedent). The `<NomineeConsole>`
// component stays a thin projection of these — self-suppress, grey-takeover, and the composed active view.
//
// Server-authoritative (the 8.2/8.3 posture): the client resolves NOTHING about nominee-hood or takeover
// eligibility — it only maps the already-decided `NomineeConsoleResponse` to a view descriptor.

import type { NomineeConsoleResponse } from '@twt/contracts'

/**
 * The view the console renders, derived PURELY from the server response.
 *   · `suppressed` — not a validated nominee with an active pool (or no data yet) → the component renders null
 *                    (the 8.3 `ViewContributorsEntry` self-suppress discipline — no drift between the entry
 *                    affordance and its destination).
 *   · `console`    — a validated nominee with a live pool. `staffTakeover` toggles the grey "staff is
 *                    helping" state (AC3, neutral "on record", never blame) atop the composed surfaces.
 */
export type NomineeConsoleView =
  | { readonly kind: 'suppressed' }
  | {
      readonly kind: 'console'
      /** True ⇒ render the grey staff-takeover state (the nominee has disengaged ≥ N days). */
      readonly staffTakeover: boolean
      readonly pool: { readonly letterCode: string; readonly name: string | null; readonly canonicalIdentifier: string }
      readonly daysSinceEngagement: number
      readonly poolOpenAtIso: string
      readonly lastUpdatedIso: string
    }

/**
 * Map the server response (or `undefined` while the first fetch is in flight / on error) to the view
 * descriptor. `undefined`/`{ isNominee:false }` both suppress — the console never shows a cold frame to a
 * non-nominee, and never an error wall (fail-soft, the 8.3 posture).
 */
export function resolveNomineeConsoleView(
  data: NomineeConsoleResponse | undefined,
): NomineeConsoleView {
  if (!data || !data.isNominee) {
    return { kind: 'suppressed' }
  }
  return {
    kind: 'console',
    staffTakeover: data.takeover.eligible,
    pool: data.pool,
    daysSinceEngagement: data.takeover.daysSinceEngagement,
    poolOpenAtIso: data.poolOpenAtIso,
    lastUpdatedIso: data.lastUpdatedIso,
  }
}

/** True when the console must self-suppress to null (not a validated nominee with an active pool). */
export function isConsoleSuppressed(data: NomineeConsoleResponse | undefined): boolean {
  return resolveNomineeConsoleView(data).kind === 'suppressed'
}

/** True when the grey staff-takeover state should render (the nominee has disengaged ≥ N days). */
export function isStaffTakeoverActive(data: NomineeConsoleResponse | undefined): boolean {
  const view = resolveNomineeConsoleView(data)
  return view.kind === 'console' && view.staffTakeover
}

/**
 * Format the daily-delta "last updated" instant for display (UX spec L1560/L1700). Latin numerals + a
 * FIXED `Asia/Kolkata` (IST) short form — never the device's local timezone (Review fix: two nominees on
 * devices set to different timezones, or a misconfigured device clock, must not see different "last
 * updated" times for the same server instant; matches the app's Gregorian/IST display discipline
 * elsewhere). Returns `''` for an unparseable value (the caller omits the line).
 */
export function formatLastUpdated(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d)
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return `${part('day')}-${part('month')} ${part('hour')}:${part('minute')}`
}
