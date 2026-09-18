// The Sahyog Vivran page's QUERY and PAGING-LINK rules — Story 11b.3b (Task 3, AC4).
//
// ⭐ Extracted from `pages/sahyog-vivran/[driveToken].astro` on 2026-09-18 (fourth review pass) so
// the rules are TESTABLE. Four of them were fixes from the second and adversarial passes, each
// described in the story as "proven by MUTATION", and ⛔ none had a committed test: an `.astro`
// frontmatter has no harness in this app. ⇒ ⭐ the page calls these and holds ⛔ no paging logic of
// its own. ⛔ Do ⛔ not re-inline them.
//
// ⚠ PURE: no `Astro`, no fetch, no clock. The page passes `Astro.url.searchParams` in and the
// RESPONSE's `page`/`limit`/`total` in; nothing here reads the request.

import { PUBLIC_PAGE_HORIZON, type PaginationResult } from './pagination.js';

/**
 * ⛔⛔ NO `sort`, ⛔ no `order`, ⛔ no `filter`: the contributor ordering is RULED (earliest live
 * confirmation) and a caller may ⛔ not choose it — a sort parameter over a list of names is a
 * leaderboard control in the query string, and 11b.1 AC5 forbids ranking outright.
 * ⛔ `lang` is allowed: it is the locale selector `PublicShell` reads, ⛔ not a filter.
 */
export const SAHYOG_VIVRAN_ALLOWED_QUERY_PARAMS: ReadonlySet<string> = new Set([
  'page',
  'limit',
  'lang',
]);

/**
 * ⭐ The visitor's query params, CLEANED as this surface rules — the input the page hands to
 * `parsePageParams`.
 *
 *  · ⚠⛔ **AN UNKNOWN PARAM IS ⛔ IGNORED, ⛔ NEVER A 404** (second pass, 2026-09-16) — a share sheet
 *    appends `?fbclid=…` / `?utm_source=…`, and refusing it served *"nothing to show"* for a LIVE
 *    drive. ⭐ Ignoring costs the anti-enumeration property nothing: an ignored key renders the SAME
 *    page the bare URL does, so it distinguishes nothing (`2026-09-03-184` (B)).
 *  · ⚠⛔ **AN EMPTY `page` / `limit` IS ABSENT, ⛔ not a refusal** (adversarial review, 2026-09-17) —
 *    the same shared-link defect, not covered by the first fix.
 *
 * ⚠⛔ **`parsePageParams` IS CALLED BY THE PAGE, ⛔ NOT HERE** (sixth review pass, 2026-09-18). The
 * `pii-scrape` gate's FR-91 binding leg requires the paginated page's OWN source to call it; the fourth
 * pass moved the call into this module and `ci:local` went RED. ⛔ Do ⛔ not move it back in here.
 */
export function cleanSahyogVivranParams(searchParams: URLSearchParams): URLSearchParams {
  const allowedParams = new URLSearchParams(searchParams);
  for (const k of [...allowedParams.keys()]) {
    if (!SAHYOG_VIVRAN_ALLOWED_QUERY_PARAMS.has(k)) allowedParams.delete(k);
  }
  for (const k of ['page', 'limit']) {
    if (allowedParams.get(k) === '') allowedParams.delete(k);
  }
  return allowedParams;
}

/**
 * The `limit` to FORWARD upstream — `undefined` unless the visitor actually supplied one.
 * ⚠⛔ `parsePageParams` ALWAYS returns a limit (default **25**); forwarding it unconditionally made
 * the API's own default (**50**) unreachable and split a 26–50-contributor drive across two pages —
 * the split the handler's rationale REFUSES (Review finding, 2026-09-16 second pass).
 */
export function sahyogVivranForwardLimit(
  allowedParams: URLSearchParams,
  paging: PaginationResult,
): number | undefined {
  return paging.ok && allowedParams.has('limit') ? paging.limit : undefined;
}

/**
 * ⭐ Which page "Previous" and "Next" point at, from the RESPONSE's own `page`/`limit`/`total` —
 * ⛔ never re-parsed from the query (the upstream applies its own defaults). `null` = no link.
 *
 *  · ⚠⛔ **"Next" IS CLAMPED BY THE HORIZON, ⛔ not by `total` alone** (second pass, 2026-09-16):
 *    `page` is `.max(PUBLIC_PAGE_HORIZON)` upstream and a refused page is this surface's 404, so an
 *    unclamped link turned a control THIS PAGE rendered into *"this drive does not exist"*.
 *  · ⭐ `total` is the SET SIZE, so the last page is computed from it — ⛔ never from `items.length`.
 *  · ⚠ **PAST THE END, "Previous" goes to the LAST REAL page** (fourth pass, 2026-09-18) — `?page=150`
 *    on a ten-row drive is valid under the horizon and returns an empty page; `page - 1` is ALSO
 *    empty, so reaching a real row took ~149 hops.
 */
export function sahyogVivranPagingTargets(served: {
  readonly page: number;
  readonly limit: number;
  readonly total: number;
}): { readonly previous: number | null; readonly next: number | null } {
  const { page, limit, total } = served;
  const lastRealPage =
    limit > 0 ? Math.max(1, Math.min(PUBLIC_PAGE_HORIZON, Math.ceil(total / limit))) : 1;
  const previous = page > 1 ? (page > lastRealPage ? lastRealPage : page - 1) : null;
  const next = limit > 0 && page < PUBLIC_PAGE_HORIZON && page * limit < total ? page + 1 : null;
  return { previous, next };
}
