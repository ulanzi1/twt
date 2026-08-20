// packages/contracts/src/public-pages/directory.ts
//
// The PUBLIC Member Directory transport DTO — Story 11a.3 (Task 3; AC1, AC6).
//
// The wire shape for `GET /api/v1/p/:pariwarId/public-pages/member-directory`: the one
// collection-returning route behind the unauthenticated `/members` page. `apps/public` SSR calls
// it server-side; ⛔ no browser calls it directly, and ⛔ nothing about it is a member API.
//
// ── ⭐ WHAT THIS SHAPE DELIBERATELY DOES NOT CARRY ───────────────────────────────────────────────
// ⛔ NO `member_id`. ⛔ No ciphertext. ⛔ No mobile, email, address, block, school, designation,
// pool participation or registration date. ⛔ No raw lifecycle-state value beyond the two ruled
// pill labels. The response carries EXACTLY the three fields classified `public` for the
// `member-directory` surface in `public-vs-private-matrix.yaml` — `member_name`, `district`,
// `member_status` — and nothing else, because a public JSON route that over-returns is a leak the
// HTML tier-leak gate structurally cannot see (it scans rendered HTML, not this payload).
//
// ⛔ AND THERE IS NO PER-MEMBER IDENTIFIER BY DESIGN. A stable public id would be a member-detail
// permalink waiting to be built and an enumeration primitive in its own right (`2026-08-20-143`
// clause 2: the controls that actually bound enumeration are the page ceiling, the page-size cap,
// the rate limit and `noindex`). FR-75's *"noindex on member detail pages"* has no page to bind to,
// and this story does not create one.
//
// ⛔ NO EXPORT AFFORDANCE. No `format`, no `csv`, no `all` — FR-91 forbids bulk export from the
// public side, and `.strict()` below is what makes `?format=csv` a 400 rather than an ignored
// parameter.
//
// ── Contracts discipline ────────────────────────────────────────────────────────────────────────
// ⛔ A contracts SOURCE file must not import `@twt/domain` (the browser-bundle rule — the domain
// barrel re-exports `encryption` → `node:async_hooks`), so the status enum is a LOCAL wire-enum,
// value-aligned with the ruled pill labels rather than imported from the lifecycle tuple.

import { z } from 'zod';

import { PUBLIC_SURFACE_PAGE_SIZE_CAP } from '../_common/pagination.js';

/**
 * ⭐ THE DEEP-PAGINATION HORIZON — the ceiling `2026-08-20-143` clause 2 (D2(a)) commits to adding.
 *
 * Offset paging is KEPT (a cursor over a deterministic `member_id` ordering is an offset in
 * disguise and removes no enumeration primitive), so the ceiling is what actually bounds the walk:
 * at the 50-row cap, page 200 is row 10,000 — far past any legitimate reader of a directory and
 * comfortably past the largest plausible Pariwar, while still refusing an unbounded crawl.
 *
 * ⛔ Raising this is an anti-enumeration change and needs its own ruling, exactly like the page-size
 * cap. ⛔ And it must stay equal to `apps/public`'s own horizon — two surfaces with two horizons is
 * the drift the shared constant exists to prevent, and it is asserted by test in BOTH packages.
 */
export const PUBLIC_DIRECTORY_PAGE_HORIZON = 200;

/**
 * The ruled public status pill. TWO labels, and ⛔ exactly two.
 *
 * `2026-08-20-143` clause 3 (D3(a)) admits lifecycle ∈ `{active, active-in-grace, lock-in}`; the
 * epic's own field row declares the pill *"active / lock-in only"*, so `active-in-grace` presents
 * as `active` — a grace period is an internal billing state and ⛔ publishing it to the internet
 * would tell a stranger that a member is late on a payment.
 *
 * ⚠ `lock-in` DOES publish a member's waiting status to anyone on the internet. That consequence is
 * ⛔ described by no Niyamavali clause and is an OPEN finding raised to the Trustee Panel
 * (`2026-08-20-143` clause 8) — recorded here because this enum is where it becomes wire-visible.
 */
export const PublicDirectoryMemberStatus = z.enum(['active', 'lock-in']);
export type PublicDirectoryMemberStatus = z.output<typeof PublicDirectoryMemberStatus>;

/** One rendered directory row. ⛔ Three fields, all matrix-classified `public`. */
export const PublicDirectoryEntry = z
  .object({
    /**
     * The member's name IN THE PARIWAR'S CONFIGURED PRESENTATION FORM — ⛔ never unconditionally
     * the full legal name. Resolved server-side through `resolvePublicMemberName`, so a Pariwar
     * that switches to `shielded_name` changes this value with NO code change (`2026-08-19-136`
     * cl.1). ⚠ Tier-1 in origin; published here under the ONE ruled `tier1_public_exception`.
     */
    name: z.string().min(1),
    /** Latest posting district, RAW. `null` when the member has no posting row. */
    district: z.string().min(1).nullable(),
    status: PublicDirectoryMemberStatus,
  })
  .strict();
export type PublicDirectoryEntry = z.output<typeof PublicDirectoryEntry>;

/**
 * The query. ⛔ `.strict()` — an unknown parameter is a 400, not an ignored one. That is what makes
 * `?format=csv`, `?fields=mobile` and `?all=1` refusals rather than no-ops.
 *
 * ⚠ `limit` carries `.max(PUBLIC_SURFACE_PAGE_SIZE_CAP)` so Story 1.14's forced-pagination guard —
 * which walks the committed OpenAPI surface — SEES a bound on this route. That is the second,
 * independent FR-91 enforcement `2026-08-20-143` clause 1 names as a benefit of putting the read
 * here rather than on `apps/public`, which that guard is structurally outside of.
 */
export const PublicDirectoryQuery = z
  .object({
    page: z.coerce.number().int().positive().max(PUBLIC_DIRECTORY_PAGE_HORIZON).optional(),
    limit: z.coerce.number().int().positive().max(PUBLIC_SURFACE_PAGE_SIZE_CAP).optional(),
  })
  .strict();
export type PublicDirectoryQuery = z.output<typeof PublicDirectoryQuery>;

/**
 * The response.
 *
 * ⚠ `total` is the count of members the ROSTER admits — ⛔ not a promise about how many rows
 * rendered. A row whose decrypted name is unresolvable is dropped after the count is taken, so a
 * page may be shorter than `total` implies. The honest "next" link is derived from `total`, which
 * is strictly better than inferring "there is a next page" from a full-page result.
 */
export const PublicDirectoryResponse = z
  .object({
    /**
     * ⭐ NAMED `items`, AND THAT IS LOAD-BEARING, ⛔ not a style choice. Story 1.14's
     * forced-pagination guard walks the committed OpenAPI surface and recognises a collection GET
     * by a top-level array OR a `{ items: [] }` shape — literally that key. Calling this `entries`
     * would leave the route INVISIBLE to the guard while AC1's claim of "a second, independent
     * FR-91 enforcement on this data path" stayed in the comments, false. ⛔ Do not rename it.
     */
    items: z.array(PublicDirectoryEntry),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().nonnegative(),
  })
  .strict();
export type PublicDirectoryResponse = z.output<typeof PublicDirectoryResponse>;
