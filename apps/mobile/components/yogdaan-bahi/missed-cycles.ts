// The missed-cycle section's PURE decisions — Story 10.27 (AC4, AC6; D1, D4).
//
// The mobile harness is pure-Vitest with no RN renderer (the status-pill-render.test.ts /
// helpline-cta-presence.test.ts precedent), so anything expressed only inside JSX can be guarded by a
// source scan and nothing stronger. The two decisions this story is most likely to get silently wrong
// are therefore hoisted OUT of the component and into plain functions, where a test can assert
// BEHAVIOUR rather than the presence of a substring:
//
//   1. ABSENT vs EMPTY (AC4). Zero missed cycles must render NOTHING — no section, no header, no "0",
//      no reassurance line. An empty state saying "no missed cycles" introduces the frame this whole
//      surface exists to avoid, and a running count is a scoreboard.
//   2. WHICH `cycleRef` (D4). Two different fields in this codebase are called `cycleRef`: the
//      passbook's DISPLAY string (a freeze month) and `PersonalEventAssertionRequest`'s UUID. Sending
//      the display string where the UUID belongs is a Zod rejection at best and corrupted provenance
//      at worst. The request builder below is the ONE place that mapping happens.
//
// ⚖ Nothing here interprets, ranks, scores, or explains a missed cycle. The entries are EPISTEMIC —
// they report what the record contains, never what the member did (D1) — and no cause is available to
// label them with even if a future author wanted one (out-of-band stance 4 + the no-ingest-path fence).

import type { MissedCycleEntry, PersonalEventAssertionRequest, PersonalEventKind } from '@twt/contracts'

/**
 * Does the missed-cycle section render at all?
 *
 * ⛔ The ONLY affirmative answer is "there is at least one entry". `[]` means ABSENT, never an empty
 * state — and note that `[]` is what the server returns in TWO different situations: the member has
 * missed nothing, AND the Pariwar has no projection coverage so the record supports no statement in
 * either direction (D5). Both must render identically silent, which is exactly why this predicate
 * cannot distinguish them and must never be extended to try.
 */
export function shouldRenderMissedCycles(entries: readonly MissedCycleEntry[] | undefined): boolean {
  return (entries?.length ?? 0) > 0
}

/**
 * Build the R7(G) personal-event assertion request for ONE missed cycle — the D4 mapping, in one place.
 *
 * ⛔ `cycleRef` on the OUTGOING request is the cycle's **UUID** (`entry.cycleId`), NOT the entry's own
 * display `cycleRef` (a freeze month like `2026-05`). Same field name, different type, different job.
 * Pinned by test; if you are reading this because that test went red, you have swapped the two.
 *
 * ⚖ The assertion still carries NO consequence of its own (ratified Niyamavali §3.1) and NO free text
 * (D3): the shape below is `kind` + provenance and nothing else. The member id is resolved from the
 * session server-side, and `Idempotency-Key` + Turnstile ride HEADERS, not this body.
 */
export function personalEventRequestForCycle(
  entry: MissedCycleEntry,
  kind: PersonalEventKind,
): PersonalEventAssertionRequest {
  return { kind, cycleRef: entry.cycleId }
}
