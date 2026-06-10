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
export const Cursor = z.string().min(1);
export type Cursor = z.output<typeof Cursor>;

/** Default public-surface pagination query (FR-91 max 50). */
export const PaginationQuery = z
  .object({
    cursor: z.string().min(1).optional(),
    limit: z.number().int().positive().max(50).optional(),
  })
  .strict();
export type PaginationQuery = z.output<typeof PaginationQuery>;

/**
 * Generic paginated-response wrapper. Use at downstream Stories' list contracts:
 *   const MembersPage = paginatedResponse(Member);
 */
export function paginatedResponse<T extends z.ZodTypeAny>(item: T) {
  return z
    .object({
      items: z.array(item),
      nextCursor: z.string().min(1).nullable(),
      hasMore: z.boolean(),
    })
    .strict();
}
