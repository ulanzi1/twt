// Cross-link navigation derivation for the helpdesk responder console (Story 10.4, Task 7; AC5).
//
// PURE + framework-free (unit-testable). A ticket carries four nullable cross-link refs; each non-null
// ref renders a badge + a navigation affordance into the rest of the admin app. NO v1 create path
// populates these, so this is built DEFENSIVELY + unit-tested against synthetic cross-linked rows — it
// lights up for free the first time a producer sets a ref.
//
// Nav targets that EXIST today: claim → the verifier console (Story 6.10), reconciliation/pool → the
// reconciliation review queue (Story 9.8), validity → member search (Story 4.7 member-status). The
// partner-module target does NOT exist yet (Epic 12 unbuilt) → the badge renders, the nav is a
// documented seam (`href: null` → the shell renders it disabled/pending).

import type { HelpdeskCrossLinkRefs } from '@twt/contracts';

export interface CrossLinkNav {
  kind: 'claim' | 'reconciliation' | 'validity' | 'partner_module';
  label: string;
  /** The in-app href, or `null` when the nav target is a documented seam (partner-module → Epic 12). */
  href: string | null;
}

/** Derive the cross-link nav affordances for a ticket's refs (order: claim, reconciliation, validity,
 *  partner-module). Only non-null refs produce an entry. */
export function crossLinkNavs(pariwarId: string, cross: HelpdeskCrossLinkRefs): CrossLinkNav[] {
  const navs: CrossLinkNav[] = [];
  const p = encodeURIComponent(pariwarId);
  if (cross.claim_case_id) {
    navs.push({ kind: 'claim', label: 'Claim', href: `/p/${p}/claims/${encodeURIComponent(cross.claim_case_id)}/verify` });
  }
  if (cross.pool_id) {
    // Reconciliation review is a per-Pariwar queue (Story 9.8) — no per-case path segment in v1.
    navs.push({ kind: 'reconciliation', label: 'Reconciliation', href: `/p/${p}/reconciliation-review` });
  }
  if (cross.validity_lookup_id) {
    navs.push({ kind: 'validity', label: 'Member status', href: `/p/${p}/members` });
  }
  if (cross.module_id) {
    // Epic 12 partner modules are unbuilt — the badge renders, the nav target is a documented seam.
    navs.push({ kind: 'partner_module', label: 'Partner module', href: null });
  }
  return navs;
}
