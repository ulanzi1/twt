// FR-91 forced pagination for `apps/public` — Story 11a.2 (Task 4; AC2).
//
// ── ⛔ READ THIS FIRST: STORY 1.14 DOES NOT COVER THIS SURFACE ───────────────
// It is tempting to assume forced pagination is already handled — Story 1.14 shipped
// a forced-pagination guard and FR-91 is an old requirement. ⛔ VERIFIED FALSE at
// commit 66ae30d. The 1.14 guard (`apps/api/tests/integration/forced-pagination.spec.ts`)
// has two halves and BOTH are scoped to `apps/api`: the behavioural half hits Fastify
// routes, and the structural half *"walk[s] the committed OpenAPI surface"*.
// `apps/public` Astro routes emit no OpenAPI and are reached by NEITHER. Before this
// module, a `/members?page=all` on the public shell was entirely unpoliced.
//
// ⇒ On this surface, FR-91 is exactly as real as this file. It is mechanized, not
// conventional, so the next public list route reuses the cap instead of inventing one.
//
// ── ⛔ NO SILENT CLAMP ──────────────────────────────────────────────────────
// An out-of-range request is REJECTED with a decidable reason, ⛔ never quietly
// coerced to a default. A silent clamp teaches the caller nothing and hides the
// probe: `?limit=100000` answered with 25 rows looks to a scraper exactly like a
// sparse dataset, and looks to the operator exactly like ordinary traffic. The
// rejection is the signal.
//
// PURE: no fs, no db, no env, no clock.
import { PUBLIC_SURFACE_PAGE_SIZE_CAP } from '@twt/contracts';

/**
 * Maximum rows a public list surface will serve in one response.
 *
 * ⭐ 50 is not a new number — it IS `PUBLIC_SURFACE_PAGE_SIZE_CAP`, imported directly
 * from `packages/contracts/src/_common/pagination.ts` rather than re-declared, so the
 * two surfaces cannot drift into two different "the FR-91 cap".
 *
 * ⛔ Raising it is an FR-91 change and needs its own ruling: the cap is the whole
 * anti-bulk-extraction property, not a performance tuning knob.
 */
export const PUBLIC_PAGE_SIZE_MAX = PUBLIC_SURFACE_PAGE_SIZE_CAP;

/** Rows served when the caller does not ask for a specific page size. */
export const PUBLIC_PAGE_SIZE_DEFAULT = 25;

/** Why a page request was refused. Machine-decidable; the copy lives in i18n. */
export type PaginationRejectionReason =
  | 'unbounded_requested'
  | 'limit_above_cap'
  | 'page_not_a_positive_integer'
  | 'limit_not_a_positive_integer';

export interface PaginationRejection {
  ok: false;
  /** The query parameter at fault — so the 400 state can name it without guessing. */
  param: 'page' | 'limit';
  reason: PaginationRejectionReason;
  /** Developer/log-facing. ⛔ Not user copy — user copy is i18n'd at the page. */
  message: string;
}

export interface PaginationAccepted {
  ok: true;
  /** 1-based, as it appears in the URL and in the pagination links. */
  page: number;
  limit: number;
  /** Convenience for the read layer; derived, never parsed. */
  offset: number;
}

export type PaginationResult = PaginationAccepted | PaginationRejection;

/**
 * The sentinel values FR-91 names explicitly. Matched case-insensitively because
 * `?page=ALL` is the same probe as `?page=all`, and a bypass that turns on caps-lock
 * is not a bypass anyone should have to think about twice.
 */
// ⚠ `0` and `-1` are deliberately NOT here even though `-1` is a common "unbounded"
// idiom. They are rejected one check later as `*_not_a_positive_integer`, which is
// the TRUE reason — and a rejection that names the wrong reason is a rejection a
// future reader will eventually "fix" in the wrong direction.
const UNBOUNDED_SENTINELS = new Set(['all', 'any', 'none', 'max', 'unlimited', '*']);

/** Strict positive-integer parse: ⛔ rejects `1.5`, `1e3`, `0x10`, ` 1 `, `1abc`, `+1`. */
function parsePositiveInt(raw: string): number | null {
  if (!/^[1-9][0-9]*$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isSafeInteger(n) ? n : null;
}

/**
 * Parse a public list surface's page params, or refuse.
 *
 * Accepts anything with a `get(name)` — `URLSearchParams` in the page, a plain map
 * in tests. Absent params take the defaults; ⛔ present-but-invalid ones are never
 * treated as absent, which is the coercion this function exists to refuse.
 */
export function parsePageParams(params: {
  get(name: string): string | null;
}): PaginationResult {
  const rawPage = params.get('page');
  const rawLimit = params.get('limit');

  for (const [param, raw] of [
    ['page', rawPage],
    ['limit', rawLimit],
  ] as const) {
    if (raw !== null && UNBOUNDED_SENTINELS.has(raw.trim().toLowerCase())) {
      return {
        ok: false,
        param,
        reason: 'unbounded_requested',
        message:
          `FR-91 — "?${param}=${raw}" asks for an unbounded result set. Public list surfaces ` +
          `serve at most ${PUBLIC_PAGE_SIZE_MAX} rows per request and there is no "all" page. ` +
          `⛔ The request is refused, not clamped.`,
      };
    }
  }

  let page = 1;
  if (rawPage !== null) {
    const parsed = parsePositiveInt(rawPage);
    if (parsed === null) {
      return {
        ok: false,
        param: 'page',
        reason: 'page_not_a_positive_integer',
        message:
          `"?page=${rawPage}" is not a positive integer. Pages are 1-based whole numbers; ` +
          `⛔ a malformed page is refused rather than coerced to page 1.`,
      };
    }
    page = parsed;
  }

  let limit = PUBLIC_PAGE_SIZE_DEFAULT;
  if (rawLimit !== null) {
    const parsed = parsePositiveInt(rawLimit);
    if (parsed === null) {
      return {
        ok: false,
        param: 'limit',
        reason: 'limit_not_a_positive_integer',
        message:
          `"?limit=${rawLimit}" is not a positive integer. ⛔ Refused rather than coerced ` +
          `to the default page size.`,
      };
    }
    if (parsed > PUBLIC_PAGE_SIZE_MAX) {
      return {
        ok: false,
        param: 'limit',
        reason: 'limit_above_cap',
        message:
          `FR-91 — "?limit=${parsed}" exceeds the public page-size cap of ` +
          `${PUBLIC_PAGE_SIZE_MAX}. ⛔ Refused, not clamped: answering an over-cap request ` +
          `with a capped page hides the probe.`,
      };
    }
    limit = parsed;
  }

  return { ok: true, page, limit, offset: (page - 1) * limit };
}

/**
 * Build the href for a page number, preserving every OTHER query param (`lang`
 * above all — the shell's language toggle is a server roundtrip, and pagination
 * links that dropped it would silently reset the reader's language).
 *
 * Returns a relative href so the links work under any host. ⛔ Pagination controls
 * are REAL LINKS: the shell's works-with-JS-disabled posture (Story 2.5 AC3) is not
 * relaxed by this story, so a page change must be a plain GET.
 */
export function pageHref(route: string, current: URLSearchParams, page: number): string {
  const next = new URLSearchParams(current);
  if (page <= 1) next.delete('page');
  else next.set('page', String(page));
  const qs = next.toString();
  return qs === '' ? route : `${route}?${qs}`;
}

/**
 * ⛔ THERE IS NO BULK-EXPORT AFFORDANCE, AND THERE MUST NOT BE ONE.
 *
 * FR-91: *"Bulk export disabled on member directory and Sahyog archive from
 * public-side."* No "download all", no CSV link, no `?format=csv`, no
 * `?limit=<total>` escape hatch. The authorized export path is Story 10.7's
 * scope-respecting, audit-logged reports library — which is authenticated, records
 * who exported what, and re-resolves scope at build time. A public CSV link would
 * have none of those properties while looking like a convenience.
 *
 * This constant exists to be cited in review, ⛔ not to be read at runtime.
 */
export const PUBLIC_BULK_EXPORT_IS_FORBIDDEN = true as const;
