// packages/contracts/src/nominee-console/nominee-console.ts
//
// The Nominee Console read DTO (Story 9.1, Task 1/3). The response shape for
// `GET /api/v1/member/nominee-console` — the server-authoritative read that drives Sunita's
// `<NomineeConsole>` surface (the FIRST Epic-9 surface). Presentation only: it resolves the gate
// ("am I a validated nominee with an active pool?"), the pool identity, and the staff-takeover verdict.
// It NEVER parses a statement, NEVER runs the matcher, NEVER flips a pill — those are Stories 9.2/9.4/9.5.
//
// ── Contracts discipline ──────────────────────────────────────────────────────────────────────────────
// A contracts SOURCE file MUST NOT import `@twt/domain` (the browser-bundle rule) — plain `string`/`number`
// /`boolean` only. ALL objects `.strict()`. Consumed via `import type … from '@twt/contracts'` in the SDK
// + the apps/api handler — NO type-shadowing.
//
// ── The gate is a SHAPE (AC1) — the console self-suppresses on `{ isNominee:false }` ────────────────────
// The discriminated union on `isNominee` mirrors the 8.3 `{ assigned }` posture: the client guards with
// `if (!data.isNominee) return null`. Present ONLY for a signed-in validated nominee with an ACTIVE
// (`live`) pool; every other case — not a nominee, no live pool, a fail-soft degrade — is `{ isNominee:false }`.
//
// ── The takeover verdict is server-computed (AC3) ───────────────────────────────────────────────────────
// `takeover.eligible` / `takeover.daysSinceEngagement` come from the PURE `computeStaffTakeover` derivation
// (@twt/domain nomineeConsole), run server-side over `poolOpenAt` (resolved off the
// `pool.opened_for_contributions` event) with `lastEngagedAt=null` while the Story 9.3 engagement writer is
// unbuilt. The client renders the grey "staff is helping" state on `eligible`, never resolving eligibility itself.
//
// ── What is DELIBERATELY absent (the honest-seam invariant) ─────────────────────────────────────────────
// NO upload-queue field (Story 9.3), NO per-pool reconciliation-status/pill field (Story 9.6), NO confirmed-
// contributor rows (composed from the SEPARATE 8.3 `/pool-contributors` read, not duplicated here), NO
// statement/UTR/matcher data. Adding any of them here is the drift this shape's `.strict()` forbids until
// the owning story lands. The console renders those slots as first-class `{available:false}` placeholders.

import { z } from 'zod';

/**
 * The pool identity block (mirrors the 8.2/8.3 identity fields).
 *   · `letterCode`          — the member-facing shortform letter ("F" → "Pool F"); the launch fallback.
 *   · `name`                — the curated Mahabharata-rooted name when configured; `null` otherwise.
 *   · `canonicalIdentifier` — the audit/system identifier `P-YYYY-MM-###` (a11y / support reference).
 */
export const NomineeConsolePoolIdentity = z
  .object({
    letterCode: z.string().min(1),
    name: z.string().min(1).nullable(),
    canonicalIdentifier: z.string().min(1),
  })
  .strict();
export type NomineeConsolePoolIdentity = z.output<typeof NomineeConsolePoolIdentity>;

/**
 * The staff-takeover-by-day-N verdict (AC3) — the presentation projection of the domain
 * `computeStaffTakeover` derivation. `eligible` drives the grey "staff is helping" console state (strictly
 * neutral, never blame); `daysSinceEngagement` is the whole-days figure the console may surface for context.
 * NO `lastEngagedAt`/`threshold`/raw-clock field crosses the wire — the verdict is server-authoritative.
 */
export const NomineeConsoleTakeover = z
  .object({
    eligible: z.boolean(),
    daysSinceEngagement: z.number().int().nonnegative(),
  })
  .strict();
export type NomineeConsoleTakeover = z.output<typeof NomineeConsoleTakeover>;

/**
 * The fully-resolved nominee-console model (AC1/AC3). Present ONLY when the authenticated member is a
 * validated nominee with an ACTIVE (`live`) pool.
 *
 *   · `pool`          — the pool identity (letter code / curated name / canonical id) for the console header.
 *   · `takeover`      — the staff-takeover verdict (drives the grey state).
 *   · `poolOpenAtIso` — when the pool opened for contributions (ISO-8601); the day-N clock origin / a11y ref.
 *   · `lastUpdatedIso`— the server read instant (ISO-8601) — the daily-delta "last updated" timestamp the
 *                       console shows (UX spec L1560/L1700 — the pool fill updates after each upload, and
 *                       the console surfaces when it was last refreshed; NOT real-time — the 8.3 D6 posture).
 */
export const ValidatedNomineeConsole = z
  .object({
    isNominee: z.literal(true),
    pool: NomineeConsolePoolIdentity,
    takeover: NomineeConsoleTakeover,
    poolOpenAtIso: z.string().datetime(),
    lastUpdatedIso: z.string().datetime(),
  })
  .strict();
export type ValidatedNomineeConsole = z.output<typeof ValidatedNomineeConsole>;

/**
 * The first-class ABSENCE signal (AC1): not a validated nominee, no active pool, or a fail-soft degrade.
 * The client renders the surface self-suppressed to null (the 8.3 `{ assigned:false }` posture).
 */
export const NonNomineeConsole = z.object({ isNominee: z.literal(false) }).strict();
export type NonNomineeConsole = z.output<typeof NonNomineeConsole>;

/**
 * `GET /api/v1/member/nominee-console` response — the discriminated union on `isNominee`. The client
 * guards with `if (!data.isNominee) return null` (the `member-pool` self-suppression posture).
 */
export const NomineeConsoleResponse = z.discriminatedUnion('isNominee', [
  ValidatedNomineeConsole,
  NonNomineeConsole,
]);
export type NomineeConsoleResponse = z.output<typeof NomineeConsoleResponse>;
