// The banner lane → noticeboard notice adapter — Story 11a.5 (Task 3; AC3 / Decision 2026-08-22-152 D1(a)
// + D7(a)). PURE and RN-free, so the mobile harness can unit-test it (the `components/banners/copy.ts`
// precedent — the pure-Vitest mobile setup has no component-mount renderer).
//
// ── ONE query, ONE winner (D7(a)) ───────────────────────────────────────────────────────────────────
// The noticeboard reads the SAME `useMemberBannersQuery` / `MEMBER_BANNERS_QUERY_KEY` the ambient
// `<BannerHost>` reads: one fetch, one cache, one MMKV entry, one SERVER-RESOLVED winner — ⛔ no second
// request and ⛔ no divergence. This module only reshapes that winner; it re-derives NO precedence.
//
// ── At most ONE (Trap 2 / AC2) ──────────────────────────────────────────────────────────────────────
// `MemberBannerListResponse` carries `{ banner, popup }` — at most one of each. Only the `banner` lane
// feeds the noticeboard: the `popup` lane is a MODAL OVERLAY, not a strip row, and folding it in here
// would put a modal's content in a list. This function's signature takes one nullable banner and returns
// one nullable notice; there is no list anywhere on the path.

import type { MemberBannerResponse } from '@twt/contracts'
import type { NoticeboardBannerNoticeInput } from '@twt/ui'

import { selectBannerCopy } from '../banners/copy'

/**
 * ⭐ The audience this surface declares for a banner that arrived through the AUTHENTICATED member read.
 *
 * `MemberBannerResponse` deliberately carries no `audience_scope` — a member surface has no business
 * knowing which internal cohort a banner was aimed at, and the server has ALREADY applied the audience
 * predicate before answering. So the tier filter still needs an audience, and the honest one to declare is
 * the MORE RESTRICTIVE of the possibilities: a banner delivered through an authenticated, session-scoped
 * read is at minimum members-scope on the public-vs-authenticated axis. Declaring `members-all` can only
 * ever HIDE a notice from a signed-out viewer that a `public` declaration would have shown — which is the
 * fail-closed direction (AC5), and is moot on this surface today because the member app has no
 * signed-out render.
 *
 * ⛔ Do NOT "fix" this by widening `MemberBannerResponse` to carry `audience_scope`: that is a 10.9 DTO
 * change, and the member surface deliberately does not carry it.
 */
export const MEMBER_READ_AUDIENCE = 'members-all'

/**
 * Reshape the server-resolved banner winner into the presenter's at-most-one notice slot, with copy
 * selected Hindi-first at the display boundary (`selectBannerCopy` — the presenter holds no bilingual
 * logic, per Trap 1).
 *
 * Returns `null` when there is no banner, or when the banner has NO usable copy in either language — a
 * blank row on a quiet noticeboard is worse than no row.
 */
export function toNoticeboardBannerNotice(
  banner: MemberBannerResponse | null | undefined,
  locale: string,
): NoticeboardBannerNoticeInput | null {
  if (!banner) return null

  const { title, body } = selectBannerCopy(banner, locale)
  if (title === '' && body === '') return null

  return {
    id: banner.banner_id,
    title,
    // The epic's `body` and UX :1817's `meta line` are ONE field on the row descriptor. An empty string
    // becomes `null` so the render shows no second line rather than an empty one.
    body: body === '' ? null : body,
    severity: banner.severity,
    dismissible: banner.dismissible,
    audience: MEMBER_READ_AUDIENCE,
    // The EXCLUSIVE window end, so an MMKV-persisted banner cannot outlive its own window on the device.
    validUntil: new Date(banner.valid_until),
  }
}
