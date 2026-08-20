// packages/contracts/src/_common/pagination.ts
//
// Cursor-based pagination per architecture §3.2 line 1836-1846.
// Cursor is opaque at the contracts layer (architecture line 1844-1846: scope
// = tenant + resource + ordering + expiry; signing mechanism is implementation
// ADR territory). Wire shape = { items, nextCursor, hasMore } per §Format
// patterns line 3801-3802.
//
// Page-size cap per FR-91 = 50 for public surfaces; authenticated admin
// queries override at the route level. This default schema captures the
// public-facing posture; admin routes pass a `limit: z.number().int().positive().max(<N>)`
// override at their own contract authoring time.

import { z } from 'zod';

/** Opaque pagination cursor (URL-safe; not inspected at the contracts layer). */
export const Cursor = z.string().min(1).regex(/\S/, 'cursor must not be blank');
export type Cursor = z.output<typeof Cursor>;

/**
 * Page-size cap per FR-91 for public surfaces. The single source of truth — every
 * public-surface pagination consumer (this schema, `apps/public`'s own forced-pagination
 * module) imports THIS constant rather than re-declaring `50`, so the cap cannot drift
 * into two different "the FR-91 cap".
 */
export const PUBLIC_SURFACE_PAGE_SIZE_CAP = 50;

/** Default public-surface pagination query (FR-91 max 50). */
export const PaginationQuery = z
  .object({
    cursor: Cursor.optional(),
    limit: z.number().int().positive().max(PUBLIC_SURFACE_PAGE_SIZE_CAP).optional(),
  })
  .strict();
export type PaginationQuery = z.output<typeof PaginationQuery>;

/**
 * Generic paginated-response wrapper. Use at downstream Stories' list contracts:
 *   const MembersPage = paginatedResponse(Member);
 *
 * In OpenAPI contexts, callers MUST annotate the result before registering:
 *   registry.registerComponent('schemas', 'MembersPage', MembersPage.openapi('MembersPage'));
 * Failure to annotate causes the generator to inline the full schema at every
 * reference site rather than emitting a $ref.
 */
export function paginatedResponse<T extends z.ZodTypeAny>(item: T) {
  return z
    .object({
      items: z.array(item),
      nextCursor: Cursor.nullable(),
      hasMore: z.boolean(),
    })
    .strict();
}
