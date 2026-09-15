// ⭐⭐ THE ONE PLACE THE `sahyog-vivran` ROUTE'S APPLICABLE CONTROL SET IS WRITTEN — Story 11b.11
// (AC5), mechanizing what had been PROSE IN THREE FILES.
//
// ⛔⛔ WHY THIS MODULE EXISTS, STATED SO IT IS ⛔ NOT "SIMPLIFIED" BACK INTO COMMENTS.
// **D11(a)** (`2026-09-02-176`) ruled this route states its APPLICABLE control set. Until 11b.11
// that set was a bullet list in `routes.ts`, a second bullet list in
// `apps/api/tests/integration/login-wall.spec.ts`, and a COUNT in
// `packages/contracts/public-pages/public-vs-private-matrix.yaml` — with ⛔ no constant, ⛔ no test
// and ⛔ no lint rule tying them together. They were kept in step ⛔ only by a reviewer counting
// bullet points by eye, **which is exactly how they drifted:**
//   · `routes.ts`'s header said **FIVE**, and its own route-site comment said **FOUR**.
//   · the matrix YAML said `noindex` was *"control 3 of the THREE this route states"* — a different
//     COUNT *and* a different ORDINAL from `routes.ts`, which numbered `X-Robots-Tag` as **4**.
// ⇒ three authoritative documents, three different answers, on the file a future reviewer trusts.
// ⭐ The list below is now the source; the two prose sites cite it and the YAML no longer states a
// number at all. `login-wall.spec.ts` asserts its length and its composition.
//
// ⚠⛔⛔ **AND THE RECOUNT IS HONEST ABOUT WHICH ENTRIES ACTUALLY DEFEND ANYTHING.** The old lists
// counted five items as "controls". Netting out:
//   · `X-Robots-Tag: noindex, nofollow` is a crawler **HINT** — archivers and scrapers ignore it.
//   · *"the absence of any DETAIL or EXPORT affordance"* is irrelevant to a direct GET.
//   · the bounded, projected **Tier-1 read** is the DECRYPT ITSELF — the thing being defended, ⛔ not
//     a defence of it.
// ⇒ before Story 11b.10 shipped the opaque address, **ONE** control stood between an anonymous
// caller and Tier-1 data. Counting three non-controls as controls MANUFACTURED a false
// defence-in-depth. ⭐ Each entry below therefore carries an explicit `kind`, and ⛔ nothing here may
// be described as a control unless it is one.
//
// ⛔ THE ENUMERATION HALF IS **CLOSED** AND ⛔ MUST NOT BE RE-RAISED: `2026-09-03-184` **(B)**
// (Trustee-ratified) ruled the address unguessable and Story **11b.10** shipped the opaque
// `publicToken`. ⭐ What survives from that finding is only the counting defect, fixed here.
//
// ⚠ NONE of this changes a ruled control. ⛔ `limits.search` is UNCHANGED (tightening or loosening it
// is **A DECISION** — `2026-09-02-183` cl.5), and ⛔ `D8-default` FAIL-OPEN (`2026-09-02-179` cl.1)
// is UNCHANGED. This module RECORDS the set; it does ⛔ not set it.

/**
 * One entry in the route's applicable set.
 *
 * ⚠⛔ `kind` is the load-bearing field. `'control'` means it stands between an anonymous caller and
 * the data; `'posture'` means it is correct and retained but defends ⛔ nothing on a direct GET.
 * ⛔ Do ⛔ not promote a `'posture'` to a `'control'` to make a count look better — that is the exact
 * act this module exists to prevent.
 */
export interface SahyogVivranApplicableControl {
  /** The numbered item in `routes.ts`'s header list this corresponds to. */
  readonly ordinal: number;
  readonly id: string;
  readonly kind: 'control' | 'posture';
  readonly summary: string;
}

/**
 * ⭐ THE APPLICABLE SET for `GET /api/v1/p/:pariwarId/public-pages/sahyog-vivran/:driveToken`.
 *
 * ⛔ Controls **2** (`PUBLIC_SURFACE_PAGE_SIZE_CAP`) and **3** (`PUBLIC_DIRECTORY_PAGE_HORIZON`) are
 * ⛔ ABSENT and that is structural, ⛔ not an exemption: a single-item GET has ⛔ no `limit` and ⛔ no
 * `page` for them to bind to. ⚠⛔ **THE ABSENCE HAS AN EXPIRY** — Story **11b.3b** adds the
 * contributor list, which makes this route PAGINATED and RESTORES BOTH. ⇒ 11b.3b adds two entries
 * HERE, in its own commit, and the length assertion in `login-wall.spec.ts` moves with them.
 *
 * ⭐⭐ **THE EXPIRY HAS FIRED — 2026-09-15, Story 11b.3b (Task 3, AC4). ⛔ THE PARAGRAPH ABOVE IS KEPT
 * AS THE RECORD** ([[feedback_supersede_never_reinterpret]]). The contributor list ships, the route
 * is PAGINATED, and **both controls are RESTORED BELOW as ordinals 2 and 3** — in the same commit as
 * the pagination, with `login-wall.spec.ts` and `routes.ts` moved with them, exactly as the expiry
 * required. ⇒ ⭐ the set is **SEVEN**.
 * ⚠⛔ **SEVEN, ⛔ NOT THE "SIX" `login-wall.spec.ts` PREDICTED.** That prediction was written when the
 * set held four; 11b.10 then added ordinal 7 (the unguessable address) without re-doing the
 * arithmetic. ⭐ 5 + 2 = 7 — ⛔ the count is DERIVED from the list, ⛔ never carried forward as a word.
 * ⚠ And 11b.3b **EXTENDS** what 11b.3a wrote rather than replacing it: 11b.3a restored PII-BEARING,
 * 11b.3b restores PAGINATED. ⛔ Neither may drop the other's property.
 */
export const SAHYOG_VIVRAN_APPLICABLE_CONTROLS: readonly SahyogVivranApplicableControl[] = [
  {
    ordinal: 1,
    id: 'rate_limit_search_tier',
    kind: 'control',
    summary:
      'The named SEARCH rate-limit tier, UNMODIFIED, keyed on the forwarded visitor address. ' +
      'A real bound on an anonymous caller. ⛔ Not a tuning knob in either direction.',
  },
  {
    ordinal: 2,
    id: 'page_size_cap',
    kind: 'control',
    summary:
      '⭐ RESTORED at Story 11b.3b (Task 3, AC4): `PUBLIC_SURFACE_PAGE_SIZE_CAP` (50) bounds the ' +
      'contributor page. ⛔ A real bound on an anonymous caller — it caps how many FULL LEGAL NAMES ' +
      'one request yields AND how many Tier-1 decrypts it costs, which are the same number here. ' +
      '⚠ Enforced by `.max()` on the `.strict()` query schema, so an out-of-range `limit` is a 400 ' +
      '— and Story 1.14\'s forced-pagination guard SEES that bound on the live swagger document. ' +
      '⛔ Raising it is an FR-91 ruling, ⛔ not a performance knob.',
  },
  {
    ordinal: 3,
    id: 'deep_page_horizon',
    kind: 'control',
    summary:
      '⭐ RESTORED at Story 11b.3b (Task 3, AC4): `PUBLIC_DIRECTORY_PAGE_HORIZON` (200) bounds how ' +
      'DEEP the contributor list can be walked, closing the `?page=999999999` gap 11a.3 closed on ' +
      'the directory. ⛔ A real bound: with the cap above, page 200 is row 10,000. ' +
      '⚠ It also closes the companion offset-precision gap — `(page-1)*limit` stays inside the ' +
      'safe-integer range by construction. ⛔ Raising it is an anti-enumeration ruling.',
  },
  {
    ordinal: 4,
    id: 'noindex',
    kind: 'posture',
    summary:
      '`X-Robots-Tag: noindex, nofollow` plus `noindex` on the page. ⭐ Correct posture and RETAINED ' +
      '— ⚠ but a crawler HINT: archivers and scrapers ignore it, so it defends nothing on a direct GET.',
  },
  {
    ordinal: 5,
    id: 'no_detail_or_export_affordance',
    kind: 'posture',
    summary:
      'No onward DETAIL or EXPORT affordance — no list, no sibling links, no `format`/`csv`. ' +
      '⚠⛔ AMENDED at Story 11b.3b (Task 3): this read "an EMPTY `.strict()` query schema making ' +
      'every query parameter a 400", and the schema is ⛔ no longer empty — it takes `page` and ' +
      '`limit` (controls 2 and 3 above). ⭐ THE PROPERTY IS UNCHANGED: it is still `.strict()`, so ' +
      '`?format=csv`, `?all=1` and `?sort=amount` are still a 400, and ⛔ two BOUNDED paging ' +
      'parameters are ⛔ not an export affordance. ⛔ ⛔ No `sort` and ⛔ no `filter`: the contributor ' +
      'ordering is RULED, and a caller-chosen ordering over a list of names is a leaderboard ' +
      'control in the query string. ⭐ Correct and RETAINED — ⚠ but irrelevant to a caller who ' +
      'already holds the address.',
  },
  {
    ordinal: 6,
    id: 'server_side_tier1_decrypt',
    kind: 'posture',
    summary:
      'The bounded, projected Tier-1 read: decrypted SERVER-SIDE here and ⛔ never by `apps/public` ' +
      '(the KEK is shared across EVERY Tier-1 field class — `2026-08-20-143` cl.1). ⭐ A real and ' +
      'load-bearing boundary property — ⚠ but it is the DECRYPT ITSELF, ⛔ not a defence against ' +
      'the anonymous caller this list is about. ⚠⛔ AMENDED BY STORY 11b.11: `2026-09-04-190` cl.1 ' +
      'and `2026-09-04-191` cl.1 withdrew five of the six nominee-bank values, so the fan-out is now ' +
      'AT MOST TWO values per page (one field × at most two EQUAL accounts) and ⛔ no masking ' +
      'projection is applied — the route is ⛔ no longer PII-bearing IN THE NOMINEE-BANK SENSE, ' +
      "⚠ though it still decrypts the nominee name and still carries 11b.3b's deceased-member exposure.",
  },
  {
    ordinal: 7,
    id: 'unguessable_public_address',
    kind: 'control',
    summary:
      'The opaque 128-bit CSPRNG `publicToken` (Story 11b.10, `2026-09-03-184` (B), ' +
      'Trustee-ratified). A drive URL can ⛔ no longer be CONSTRUCTED from the sequence, and a wrong ' +
      'token answers a BYTE-IDENTICAL 404. ⛔ It bounds DISCOVERY, ⛔ not AUTHORISATION. ' +
      '⚠ And ⛔ NOT FOR EVERY STATE (`2026-09-04-186`): `closed`/`settled` drives are LISTED with a ' +
      'per-row link, so their address is published by ruling and this bounds only `live` drives.',
  },
] as const;
