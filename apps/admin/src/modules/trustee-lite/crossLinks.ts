// Cross-link navigation for the Trustee-Lite worklist — Story 10.11 (Task 5; AC7).
//
// PURE + framework-free (unit-testable). Every row cross-links to the surface where the trustee
// actually acts, so the aggregator stays an INDEX and never becomes a second place to act. Modelled
// on the shipped `modules/helpdesk/crossLinks.ts` contract: a target that does not exist returns
// `href: null` and the shell renders it disabled — it never throws.
//
// ── The moderation + violator links open the member record COLD (AC4/AC7) ─────────────────────
// No reason code, no action, no query parameter that could pre-fill the moderation form. This is the
// structural half of "detection only": a link that arrived carrying `?action=suspend&reason=r7` would
// be a recommendation regardless of how carefully the surrounding copy was worded. The trustee opens
// the member's record and decides there, with the full record in front of them.

import type { TrusteeCrossLinkKind, TrusteeSignalRow } from '@twt/contracts';

export interface TrusteeCrossLink {
  kind: TrusteeCrossLinkKind;
  label: string;
  /** The in-app href, or `null` when the target does not exist (rendered disabled, never thrown). */
  href: string | null;
}

/** Human labels for each target surface — descriptive of the DESTINATION, never of what to do there. */
const LABELS: Record<TrusteeCrossLinkKind, string> = {
  cycle_freeze: 'Cycle freeze queue',
  r9_voting: 'R9 voting',
  claim_verify: 'Claim verification',
  reconciliation_review: 'Reconciliation review',
  member_record: 'Member record',
};

/**
 * Derive the cross-link for one signal row (AC7).
 *
 * `claim_verify` is the only per-RESOURCE route and therefore the only one that can be missing a
 * target: a row whose `claim_case_id` is null has nowhere claim-scoped to go, so it returns
 * `href: null` rather than fabricating a path with an empty segment.
 */
export function trusteeCrossLink(
  pariwarId: string,
  row: Pick<TrusteeSignalRow, 'cross_link_kind' | 'claim_case_id'>,
): TrusteeCrossLink {
  const p = encodeURIComponent(pariwarId);
  const kind = row.cross_link_kind;
  const label = LABELS[kind];

  switch (kind) {
    case 'cycle_freeze':
      return { kind, label, href: `/p/${p}/cycle-freeze` };
    case 'r9_voting':
      return { kind, label, href: `/p/${p}/r9-voting` };
    case 'claim_verify':
      return {
        kind,
        label,
        href: row.claim_case_id ? `/p/${p}/claims/${encodeURIComponent(row.claim_case_id)}/verify` : null,
      };
    case 'reconciliation_review':
      // The reconciliation review queue is per-Pariwar (Story 9.8) — no per-case path segment in v1.
      return { kind, label, href: `/p/${p}/reconciliation-review` };
    case 'member_record':
      // COLD (AC4): member search, with NO reason code, NO action and NO pre-selecting parameter.
      return { kind, label, href: `/p/${p}/members` };
    default: {
      // Unreachable under the current `TrusteeCrossLinkKind` union, but this module's own contract
      // (see file header) is "a target that does not exist returns `href: null`... it never throws" —
      // an unrecognized kind (e.g. client/server deploy skew) must honor that, not fall through to an
      // implicit `undefined` (review finding, 2026-08-05).
      const unrecognized = kind as string;
      return { kind: unrecognized as TrusteeCrossLinkKind, label: unrecognized, href: null };
    }
  }
}
