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
// ⚠ SUPERSEDED 2026-09-19 by Story 11b.21 / `-222` (`#decision-2026-09-19-224` D2): each row is now
// `{ name: string | null }` — the MODE-RESOLVED name (`-189` cl.3: a member sees ⛔ never less than the
// public page), or `null` where a name cannot be shown (the client renders the ruled placeholder). The
// "no status / no ciphertext / no phone / no bank" teeth above are UNCHANGED; `firstName`/`lastInitial`
// are now rejected decoys too.
//
// ── PII-shielded to PUBLIC tier from the start (AC1/AC2, Story 1.16b) ───────────────────────────────────
// Only each confirmed contributor's OWN `firstName + lastInitial` crosses the wire — never full names,
// never phone/bank/nominee data, never Tier-1 ciphertext. The shape is public-tier by design so the
// downstream Sahyog Vivran public render (Epic 11b) reuses it unchanged; the PII-matrix ENTRY itself is
// deferred to Story 11a.1's trustee-attested population (D11) — this shape is its reference.
// ⚠ SUPERSEDED 2026-09-19 by Story 11b.21 / `-222`: *"never full names"* no longer holds for this member
// surface. The row carries the name in the form the Pariwar's stored `public_name_presentation_mode`
// resolves to — the SAME form the public Sahyog Vivran page shows (`-189` cl.3, `-181`). ⛔ Still never
// phone/bank/nominee data, ⛔ never ciphertext.
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
 *
 * ⚠ SUPERSEDED 2026-09-19 by Story 11b.21 / `-222` (`#decision-2026-09-19-224` D2) — the row is now
 * `{ name }`, mirroring `PublicSahyogVivranContributor`:
 *  · `name: string` — the MODE-RESOLVED name, the same form the public page shows for that stored name
 *    and mode (full name under `full_name`; `Firstname L.` under `shielded_name`; a mononym shown).
 *  · `name: null` — a confirmed contributor whose name cannot be shown. ⭐ The row is KEPT in the
 *    producer's position (`-222` cl.1) and ⛔ NOTHING says why (`-222` cl.2): erasure, the sentinel, no
 *    profile, a failed decrypt and an empty-after-normalise name are byte-identical.
 * ⛔ No cause field, ⛔ no row key (`-177` cl.3), ⛔ no copy on the wire — the placeholder word
 * resolves at render. Still one row KIND on the wire (`-169` cl.8, wire half).
 */
export const ConfirmedContributorRow = z
  .object({
    name: z.string().min(1).nullable(),
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
 *   · `confirmed` — the reconciliation-confirmed contributor rows (first-name + last-initial). ⭐ LIVE since
 *                   ⚠ SUPERSEDED 2026-09-19 (Story 11b.21): rows are `{ name: string | null }`, one per
 *                   confirmed contributor, in producer order — ⛔ none is dropped.
 *                   Stories 9.4/9.5 — the Epic-9 matcher is the producer (`reconciliation/matcher-write.ts`
 *                   → `appendConfirmedContribution`), so an empty list means "nobody confirmed YET",
 *                   ⛔ never "the producer does not exist". NO status field.
 *                   ⚠⛔ THIS LINE SAID *"unbuilt — D2"* UNTIL STORY 11b.3, WHICH IS THE FENCE'S NAMED
 *                   CONSUMER (`2026-09-01-171` cl.1). It was false since 9.4/9.5 and it CONTRADICTED THIS
 *                   FILE'S OWN HEADER seven lines up, which already said *"this list is live, not
 *                   structurally empty"*. ⭐ It is fixed HERE and only here: Story 11b.2b's AC9 fenced it
 *                   against being tidied IN PASSING, and 11b.3 is the story that would otherwise re-derive
 *                   *"the list is structurally empty"* from it. ⛔ The REST of the stale-comment family is
 *                   deliberately NOT swept — that is scope creep, and each member keeps its own fallback
 *                   trigger ([[project_epic9_confirmed_producer_is_live]]).
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
