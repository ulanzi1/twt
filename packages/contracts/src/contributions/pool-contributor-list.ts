// packages/contracts/src/contributions/pool-contributor-list.ts
//
// The Live Contributor List read DTO (Story 8.3, Task 2). The response shape for
// `GET /api/v1/member/pool-contributors` — the read seam that drives the `<PoolContributorList>`
// member-facing live-pool view (the sibling of 8.2's `<ActiveContributionCard>`, extended from the
// aggregate progress meter to the NAMED confirmed-contributor rows). Presentation only: it reads
// `contribution.confirmed` event-derived state (produced by the Epic 9 matcher since Story 9.4 — this list
// is live, not structurally empty) and renders it; it NEVER confirms, promotes, or mutates contribution
// state (those land Epic 9 — see README).
//
// ── Contracts discipline ──────────────────────────────────────────────────────────────────────────────
// A contracts SOURCE file MUST NOT import `@twt/domain` (the browser-bundle rule). Plain `string`/`number`
// only. ALL objects `.strict()` (the contributions/ directory README discipline). Consumed via
// `import type … from '@twt/contracts'` in the SDK + the apps/api handler — NO type-shadowing.
//
// ── The confirmed-only invariant, encoded as a SHAPE (AC1/AC4, load-bearing) ────────────────────────────
// `confirmed` carries ONLY the reconciliation-confirmed contributors, each `{ firstName, lastInitial }`.
// There is DELIBERATELY NO `status` / `yellow` / `attested` / `utr` / `pending`-member-identity field
// anywhere in this shape, and NO ciphertext / full-name / phone / bank field. Adding any of them is the
// one change this contract exists to forbid — the `.strict()` shape test (contracts/tests) rejects them
// as decoy teeth ([[feedback_gate_scope_semantic_coverage]]). Yellow (Story 8.4) is intent, not confirmed
// money, and is STRUCTURALLY unable to reach this list (epics.md:2911-2915).
//
// ── PII-shielded to PUBLIC tier from the start (AC1/AC2, Story 1.16b) ───────────────────────────────────
// Only each confirmed contributor's OWN `firstName + lastInitial` crosses the wire — never full names,
// never phone/bank/nominee data, never Tier-1 ciphertext. The shape is public-tier by design so the
// downstream Sahyog Vivran public render (Epic 11b) reuses it unchanged; the PII-matrix ENTRY itself is
// deferred to Story 11a.1's trustee-attested population (D11) — this shape is its reference.
//
// ── Pending is AGGREGATE ONLY (AC2 / FR-25, privacy-hardened over the PRD — D3) ─────────────────────────
// `pending` carries ONLY `{ count, percentage }` — NO names, NO identifiers, NO per-member rows. The
// peer-accountability signal is aggregate, never a public "who hasn't paid" shame list. `count` =
// `rosterSize − confirmedCount` (from the pool snapshot roster + the confirmed read), NOT attested-derived.

import { z } from 'zod';

/**
 * A single confirmed contributor row (AC1/AC2) — the PII-shielded `firstName + lastInitial` of a member
 * whose contribution reconciliation has CONFIRMED (green-pill). No status field: a row's mere presence
 * means confirmed (the confirmed-only invariant is that the list contains nothing else).
 */
export const ConfirmedContributorRow = z
  .object({
    firstName: z.string().min(1),
    // The last-name INITIAL only (PII shield — never the full surname). `.max(16)` defensively bounds a
    // single grapheme cluster (a Devanagari conjunct + vowel signs can exceed a few UTF-16 code units);
    // empty when the name is a single token (no surname to initialize) — never a full-name leak. Mirrors
    // the 8.2 `deceasedLastInitial` bound (same `splitFirstNameLastInitial` producer, name.ts).
    lastInitial: z.string().max(16),
  })
  .strict();
export type ConfirmedContributorRow = z.output<typeof ConfirmedContributorRow>;

/**
 * The AGGREGATE pending signal (AC2 / D3) — count + integer percentage, NO member-identifying detail.
 * `count` = `rosterSize − confirmedCount` (≥0); `percentage` is a Latin integer 0–100 (0 for an empty
 * roster). There is DELIBERATELY no per-member array — pending is an aggregate, never a shame list.
 */
export const PendingContributorsAggregate = z
  .object({
    count: z.number().int().nonnegative(),
    percentage: z.number().int().min(0).max(100),
  })
  .strict();
export type PendingContributorsAggregate = z.output<typeof PendingContributorsAggregate>;

/**
 * The pool identity block (mirrors the 8.2 card's identity fields).
 *   · `letterCode`          — the member-facing shortform letter ("F" → "Pool F"); the launch fallback.
 *   · `name`                — the curated Mahabharata-rooted name when configured; `null` otherwise.
 *   · `canonicalIdentifier` — the audit/system identifier `P-YYYY-MM-###` (a11y / support reference).
 */
export const PoolContributorListPoolIdentity = z
  .object({
    letterCode: z.string().min(1),
    name: z.string().min(1).nullable(),
    canonicalIdentifier: z.string().min(1),
  })
  .strict();
export type PoolContributorListPoolIdentity = z.output<typeof PoolContributorListPoolIdentity>;

/**
 * The fully-resolved contributor-list model (AC1/AC2). Present ONLY when the authenticated member is
 * `active` AND assigned to a pool whose cycle's alert is `live`.
 *
 *   · `pool`      — the pool identity (letter code / curated name / canonical id).
 *   · `confirmed` — the reconciliation-confirmed contributor rows (first-name + last-initial). Legitimately
 *                   `[]` today (Epic 9's `contribution.confirmed` producer is unbuilt — D2). NO status field.
 *   · `pending`   — the AGGREGATE pending signal (count + percentage) — NO per-member identity (D3).
 */
export const AssignedPoolContributorList = z
  .object({
    assigned: z.literal(true),
    pool: PoolContributorListPoolIdentity,
    confirmed: z.array(ConfirmedContributorRow),
    pending: PendingContributorsAggregate,
  })
  .strict();
export type AssignedPoolContributorList = z.output<typeof AssignedPoolContributorList>;

/**
 * The first-class ABSENCE signal (AC1): not `active`, no assigned pool, no `live` alert, or a fail-soft
 * degrade. The client renders the surface empty/self-suppressed (the 8.2 `{ assigned:false }` posture).
 */
export const UnassignedPoolContributorList = z.object({ assigned: z.literal(false) }).strict();
export type UnassignedPoolContributorList = z.output<typeof UnassignedPoolContributorList>;

/**
 * `GET /api/v1/member/pool-contributors` response — the discriminated union on `assigned`. The client
 * guards with `if (!data.assigned) return null` (the `member-pool` self-suppression posture).
 */
export const PoolContributorListResponse = z.discriminatedUnion('assigned', [
  AssignedPoolContributorList,
  UnassignedPoolContributorList,
]);
export type PoolContributorListResponse = z.output<typeof PoolContributorListResponse>;
