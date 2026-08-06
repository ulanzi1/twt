// The contribution-during-suspension disclosure i18n KEY catalogue — Story 10.16 (Task 1/2; the
// `member-status/i18n-keys.ts` shape). The presenter emits KEYS (never resolved copy); each has a
// bilingual (Hindi-authored + en parity) entry in `@twt/i18n` under the ALREADY-REGISTERED
// `contribution` namespace as `suspension_disclosure.*` — flat dotted keys, the `upi_intent.*` sibling
// convention (D5). Kept in sync BY VALUE with `packages/i18n/locales/{en,hi}/contribution.json`.
//
// NOT in `common.json` under `memberStatus.*`: that namespace belongs to `<MemberStatusPanel>`, and
// AC1 is explicit that this disclosure is a PAYMENT-SURFACE concern, not a status-panel one.
//
// ── One exception, deliberately: the reason LABEL ───────────────────────────────────────────────────
// `moderationReasonLabelKey` is RE-EXPORTED from the member-status catalogue rather than forked. The
// reason-code label protocol (`memberStatus.moderationReason.<code>`, resolved in the DEFAULT `common`
// namespace) is already the one source of truth for rendering a trustee-recorded reason as a human
// label, and AC5 makes that label the ONLY cause this copy may attribute. Forking it would let the two
// surfaces drift into describing the same recorded reason differently to the same member.

export { moderationReasonLabelKey, parseModerationFlag } from '../member-status/i18n-keys.js';

/** The `@twt/i18n` namespace every key in this catalogue resolves in (the `upi_intent.*` sibling). */
export const CONTRIBUTION_DISCLOSURE_NAMESPACE = 'contribution';

/**
 * The `suspension` arm's copy key set (AC2 — a DISTINCT set per arm). The strings state the member's
 * position factually and carry no accusatory construction of their own (AC5); cause is attributed
 * ONLY through the separately-resolved reason label.
 */
export const SUSPENSION_DISCLOSURE_KEYS = {
  title: 'suspension_disclosure.title',
  whatItDoes: 'suspension_disclosure.what_it_does',
  whatItDoesNotBuy: 'suspension_disclosure.what_it_does_not_buy',
  a11yLabel: 'suspension_disclosure.a11y',
} as const;

/**
 * The `restoration_lock_in` arm's copy key set (AC2). STRUCTURALLY COMPLETE, NOT IN FORCE — Story
 * 10.23's overlay is the only thing that can select this arm. The keys exist and are translated NOW
 * precisely so 10.23 lights the arm up with ZERO copy and ZERO render changes.
 */
export const RESTORATION_LOCK_IN_DISCLOSURE_KEYS = {
  title: 'suspension_disclosure.lock_in.title',
  whatItDoes: 'suspension_disclosure.lock_in.what_it_does',
  whatItDoesNotBuy: 'suspension_disclosure.lock_in.what_it_does_not_buy',
  a11yLabel: 'suspension_disclosure.lock_in.a11y',
} as const;

/**
 * AC4's honest absence — the calm sentence for `package_unavailable`. Zero interpolation params (D5:
 * `t()` THROWS on a missing param, the Story 10.10 trap that turned a fallback branch into a crashing
 * dead branch). It neither implies the member has no restoration path nor that they have completed
 * one; the render layer pairs it with `<CallHelplineCTA>`.
 */
export const RESTORATION_PACKAGE_UNAVAILABLE_KEY = 'suspension_disclosure.package_unavailable';

/**
 * The count line — LIVE since Story 10.25, alongside the `ok` view-model arm it renders. Interpolates
 * `{remaining}` / `{required}` as Latin operational numerals at the render boundary.
 *
 * ⚖ It shipped in `en` AND `hi` under Story 10.16 precisely so the producer's arrival would be a DATA
 * change and not a copy change — and it was: Story 10.25 lit this arm without authoring a word here.
 */
export const RESTORATION_PACKAGE_REMAINING_KEY = 'suspension_disclosure.package_remaining';

/**
 * Story 10.25 (AC4 / D4) — the honest line for a restoration package that is NOT measured in
 * consecutive contributions, or for a member in no restoration path at all.
 *
 * R7(D)/(E)/(F) — the majority of what is activated today — prescribe `lock_in_months` +
 * `catch_up_required` / `complete_all` and carry no `consecutive_required`, so there is no count to
 * show those members. Leaving them on {@link RESTORATION_PACKAGE_UNAVAILABLE_KEY} after 10.25 shipped
 * would tell them "we cannot yet tell you" about a producer that HAS shipped and simply does not
 * measure their package that way.
 *
 * Zero interpolation params, on the same D5 discipline as the unavailable line (`t()` THROWS on a
 * missing param — the Story 10.10 trap that turned a fallback branch into a crashing dead branch). It
 * states a fact about the INSTRUMENT, never about the member: 10.16's AC5 forbids copy that
 * characterises the member's standing as a moral failing, and "not measured as a number of
 * contributions" attributes nothing to them.
 */
export const RESTORATION_PACKAGE_NO_CONSECUTIVE_REQUIREMENT_KEY =
  'suspension_disclosure.package_no_consecutive_requirement';

/**
 * The reason-attribution line — interpolates `{reason}`, which the render layer resolves from
 * `reasonLabelKey` FIRST and passes in, exactly as `app/(membership)/index.tsx:72-77` does. This is
 * the ONE interpolated key in the block, and the param is always supplied (AC5 / D5).
 */
export const DISCLOSURE_REASON_LINE_KEY = 'suspension_disclosure.reason_line';

/** The helpline affordance's label, in the disclosure's own register (AC4). */
export const DISCLOSURE_GET_HELP_KEY = 'suspension_disclosure.get_help';
