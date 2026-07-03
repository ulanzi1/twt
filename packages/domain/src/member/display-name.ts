// Display-time member-name resolver seam — Story 3.12 (Task 4; AC2, AC3).
//
// Architecture §2.12 (lines 1756-1759): audit lines + any public surface reference a member by their
// STABLE `member_id` (a foreign-key reference, NOT a denormalized name); the displayed name is resolved
// at DISPLAY time from the live member table. So RTBF anonymization needs NO audit/history mutation —
// "masking" is simply this resolver rendering "an anonymous member" once the member's state is
// `anonymized`. This is the single seam every display path routes a (state, name) pair through.
//
// ── SCOPE-HONEST DEFER (AC3) ───────────────────────────────────────────────────────────────────────
// At Epic 3 there is NO real member-backed contributor read to wire this into — the public contributor
// surfaces (Sahyog Drive contributor lists, Shraddhanjali Sahyog Vivran) are SAMPLE-DATA only
// (apps/mobile `ContributorRow` / `ShradhanjaliSahyogVivran` import from `./sample-data`). This file is
// therefore the SEAM only; wiring it into a real contributor/member read is a forward-compat DEFER
// (Epic 6/8 territory — recorded in deferred-work.md, mirroring the data-export empty-placeholder
// discipline). Do NOT read this as "a public surface is anonymized" — no real member-backed read exists
// yet. The seam + its unit test guarantee the anonymized→"an anonymous member" mapping is correct the
// moment a real read is wired through it.

import { type MemberLifecycleState } from './state.js';

/**
 * The i18n key the display layer renders for an `anonymized` member. The bilingual (en/hi) string lives
 * in `@twt/i18n` (`packages/i18n/locales/{en,hi}/common.json`) — domain holds only the stable key so it
 * stays free of copy + locale concerns. Kept in sync BY VALUE with the i18n `common.json` entry.
 */
export const ANONYMOUS_MEMBER_I18N_KEY = 'member.anonymousMember';

/**
 * The resolved display identity for a member reference. A discriminated union so a display path cannot
 * accidentally render a raw name for an anonymized member, and cannot silently swallow a missing name:
 *   · `name`      — a concrete name string to render.
 *   · `unknown`   — no name available for this non-anonymized member (e.g. pending-KYC, or a future
 *                   contributor-read JOIN miss). The caller renders a locale-appropriate placeholder.
 *   · `anonymized`— RTBF: render the i18n key in the active locale ("an anonymous member").
 */
export type MemberDisplayName =
  | { readonly kind: 'name'; readonly value: string }
  | { readonly kind: 'unknown' }
  | { readonly kind: 'anonymized'; readonly i18nKey: typeof ANONYMOUS_MEMBER_I18N_KEY };

/**
 * Resolve how a member reference should be displayed. An `anonymized` member (RTBF, Story 3.12) ALWAYS
 * resolves to the anonymized marker regardless of any residual `name` passed in — a defense-in-depth
 * guard so a stale name join can never leak past an anonymization. Every other state resolves to the
 * provided name. Pure + DB-free (unit-testable; the display layer supplies the (state, name) pair).
 */
export function resolveMemberDisplayName(params: {
  readonly state: MemberLifecycleState;
  readonly name: string | null;
}): MemberDisplayName {
  if (params.state === 'anonymized') {
    return { kind: 'anonymized', i18nKey: ANONYMOUS_MEMBER_I18N_KEY };
  }
  if (params.name === null) {
    return { kind: 'unknown' };
  }
  return { kind: 'name', value: params.name };
}
