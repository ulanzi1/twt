// The contribution-during-suspension disclosure presenter — Story 10.16 (Task 1; AC1/AC2/AC4).
//
// STRICTLY PURE (the `status-pill` / `pool-progress` sibling discipline): `(payload) → view-model | null`
// and NOTHING else. NO react/react-native, NO API call, NO DB read, NO clock, NO permission check, NO
// side-effecting i18n lookup (it emits KEYS; the render layer resolves them). Same input → same output.
//
// ── Deliberately NOT in `member-status/presenter.ts` (D2a) ──────────────────────────────────────────
// That file is the `<MemberStatusPanel>` presenter. AC1 says this disclosure is a PAYMENT-SURFACE
// concern and not a status-panel one, and AC3 pins `deriveHeadlineState` BYTE-UNCHANGED. Keeping the
// derivation in its own sibling module is the cheapest way to make "unchanged" verifiable — a diff on
// that file is a review finding. What IS reused is the flag protocol (`parseModerationFlag`) and the
// reason-label protocol (`moderationReasonLabelKey`), imported rather than re-derived.
//
// ── The rule is the requirement; the flag is only today's transport (AC1) ───────────────────────────
// The acceptance criterion is: *the disclosure is shown whenever the member is under a suspension that
// still permits contribution.* It is NOT "the member has a `suspended_per_` flag". The flag is how that
// condition crosses the wire TODAY. Story 10.17 adds a field to this same payload and Story 10.20 may
// add more, so the predicate below is named for the RULE and the flag parsing is hidden INSIDE it — a
// reader must be able to see the business rule without decoding a flag prefix, and the detector can be
// swapped without touching this AC.

import type { MemberValidityPayloadDto } from '@twt/contracts';

import {
  RESTORATION_LOCK_IN_DISCLOSURE_KEYS,
  SUSPENSION_DISCLOSURE_KEYS,
  moderationReasonLabelKey,
  parseModerationFlag,
} from './i18n-keys.js';
import type {
  ContributionDisclosureViewModel,
  RestorationPackageState,
} from './view-model.js';

/**
 * AC4 / D1-B — the ONLY `restorationPackage` value reachable today. The `contribution.*` fact producer
 * does not exist, so there is no honest source for "how many contributions remain in the restoration
 * package". Deriving one HERE from `listMemberContributionHistory` or an ad-hoc `events_log` scan is
 * the explicitly REJECTED branch D1-C: that read anchors on `contribution.utr-attested` (a member
 * CLAIM, not a confirmation) and caps at 500 rows, and it would derive R7 facts outside the rule
 * engine ([[project_engine_never_infers_contribution_facts]]). Named-producer degradation is this
 * codebase's own repeated discipline (`CONTRIBUTION_UNAVAILABLE`, `ContributionHistoryUnavailable`,
 * the Story 10.11 violator-flag arm).
 */
const RESTORATION_PACKAGE_UNAVAILABLE: RestorationPackageState = {
  status: 'package_unavailable',
  producer: 'story-10-24',
};

/**
 * The Story-10.23 restoration-discipline lock-in overlay signal, as it will cross the wire.
 *
 * `specialFlags` is the substrate's established extension point for a member-visible standing that has
 * no dedicated DTO field — it is exactly how Story 10.10's moderation standing arrived on this
 * `.strict()` payload. Story 10.23 OWNS the wire name; if it ships a different one, THIS CONSTANT is
 * the only line that changes (the copy keys, the view-model shape and `pay.tsx` do not — AC2).
 *
 * Nothing emits it today, so the arm is structurally complete and simply not in force.
 */
const RESTORATION_LOCK_IN_FLAG = 'restoration_lock_in';

/**
 * **The rule (AC1).** Is the member under a suspension that STILL PERMITS CONTRIBUTION?
 *
 * A `terminated` member is under moderation but is NOT permitted to contribute — Story 10.17's roster
 * predicate excludes them — so the condition is FALSE for them and no disclosure is owed. This is
 * precisely why the predicate is written against the rule rather than against the transport: a
 * detector spelled "has a moderation flag" would get termination wrong and show a terminated member a
 * disclosure about restoring standing they cannot restore.
 *
 * Exported because it is the business rule, and a reader (or a later story swapping the detector)
 * should be able to find and test it by name.
 */
export function isUnderContributionPermittingSuspension(
  payload: MemberValidityPayloadDto,
): boolean {
  // ── the detection mechanism, not the requirement ──────────────────────────────────────────────
  // Today the standing crosses the wire as the Story 10.10 moderation special flag. `parseModerationFlag`
  // is the ONE parser for that protocol (imported, never re-derived), and it already resolves
  // `terminated` ahead of `suspended` — so `=== 'suspended'` is exactly "suspended and not terminated".
  return parseModerationFlag(payload.specialFlags)?.status === 'suspended';
}

/**
 * **The rule (AC2).** Is the member under the restoration-discipline lock-in — the Story 10.23
 * instrument under which a member contributes without coverage while re-earning standing?
 *
 * This reads the 10.23 overlay signal and NOTHING ELSE. It deliberately does NOT consult
 * `payload.lockInStatus` (D3): that is the JOIN lock-in, it is join-scoped by name and semantics
 * (`daysAtJoin` / `unlockDate`), and a member in the `lock-in` lifecycle state is `isValid: true` —
 * `VALID_STATES` at validity-service `payload.ts:56-60` is `['lock-in', 'active', 'active-in-grace']`.
 * That member IS covered. Substituting the join lock-in here would tell a COVERED member that their
 * contribution creates no beneficiary entitlement — a false statement to a member about their own
 * coverage, which is the exact harm this whole story exists to prevent, inflicted on a different
 * member. The absence of the producer is read honestly: the arm is simply not in force.
 *
 * A `terminated` member is excluded here too, mirroring `isUnderContributionPermittingSuspension`:
 * a terminated member is not permitted to contribute under ANY instrument (Story 10.17's roster
 * predicate excludes them entirely), so this arm must not fire for them even if a future producer
 * (Story 10.23) ever emits the lock-in flag alongside a stale or co-occurring termination flag.
 */
export function isUnderRestorationDisciplineLockIn(
  payload: MemberValidityPayloadDto,
): boolean {
  if (parseModerationFlag(payload.specialFlags)?.status === 'terminated') {
    return false;
  }
  return payload.specialFlags.includes(RESTORATION_LOCK_IN_FLAG);
}

/**
 * Derive the contribution disclosure a payment surface owes this member, or `null` when none is owed.
 *
 * `null` is the overwhelmingly common answer: an unmoderated member sees ZERO change on `/pay`.
 *
 * Arm precedence: an in-force suspension is reported ahead of the restoration lock-in. The two are
 * successive instruments (a restoration lock-in follows a RESTORED standing, so they are not expected
 * to co-occur); if they ever did, the member's currently-in-force standing is the suspension, and that
 * is what they are owed a disclosure about.
 *
 * NOTE for whoever extends this: there is no per-reason-code branching here and there must not be
 * (AC5). Every recorded reason produces an IDENTICAL view-model apart from `reasonLabelKey` — a
 * recorded reason may be purely procedural (`voluntary-pending-review`, `regulator-action`), and
 * "special copy for the serious codes" is how this disclosure would acquire an accusation the trustee
 * never recorded. A unit test pins it.
 */
export function deriveContributionDisclosure(
  payload: MemberValidityPayloadDto,
): ContributionDisclosureViewModel | null {
  if (isUnderContributionPermittingSuspension(payload)) {
    const moderation = parseModerationFlag(payload.specialFlags);
    return {
      instrument: 'suspension',
      titleKey: SUSPENSION_DISCLOSURE_KEYS.title,
      whatItDoesKey: SUSPENSION_DISCLOSURE_KEYS.whatItDoes,
      whatItDoesNotBuyKey: SUSPENSION_DISCLOSURE_KEYS.whatItDoesNotBuy,
      restorationPackage: RESTORATION_PACKAGE_UNAVAILABLE,
      // The ONLY cause this disclosure attributes (AC5) — the trustee-recorded code, rendered as its
      // catalogued label. `moderation` is non-null here by construction of the predicate above.
      reasonLabelKey:
        moderation === null ? null : moderationReasonLabelKey(moderation.reasonCode),
      a11yLabelKey: SUSPENSION_DISCLOSURE_KEYS.a11yLabel,
    };
  }

  if (isUnderRestorationDisciplineLockIn(payload)) {
    return {
      instrument: 'restoration_lock_in',
      titleKey: RESTORATION_LOCK_IN_DISCLOSURE_KEYS.title,
      whatItDoesKey: RESTORATION_LOCK_IN_DISCLOSURE_KEYS.whatItDoes,
      whatItDoesNotBuyKey: RESTORATION_LOCK_IN_DISCLOSURE_KEYS.whatItDoesNotBuy,
      restorationPackage: RESTORATION_PACKAGE_UNAVAILABLE,
      // The lock-in instrument carries no trustee reason code of its own — it is a consequence of the
      // restoration discipline, not a fresh finding. `null`, not a fabricated attribution.
      reasonLabelKey: null,
      a11yLabelKey: RESTORATION_LOCK_IN_DISCLOSURE_KEYS.a11yLabel,
    };
  }

  return null;
}
