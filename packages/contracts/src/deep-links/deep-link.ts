// packages/contracts/src/deep-links/deep-link.ts
//
// The deep-link URI grammar — Story 5.2 (AC4). The substantive contract the scaffold README reserved
// (architecture L4555-4556 + Sprint Change Proposal Item 12): canonical URL formation for cross-frontend
// deep links (mobile ↔ public ↔ admin). Story 5.2 lands the grammar and populates it into PUSH payloads;
// the mobile-side landing/routing (expo-router `linking`, the 3-layer arrival checks of architecture §4.7)
// is a LATER story — a v1 push deep-link is unopenable dead data until that consumer exists (recorded as
// an open item in the Story 5.2 Dev Agent Record).
//
// ── Purity / determinism (AC4, AC6) ───────────────────────────────────────────────────────────────────
// `deepLinkTargetForAlert` + `formatDeepLink` are PURE functions of the immutable payload — NO clock, NO
// randomness, NO I/O — so the push renderer that derives a deep-link stays byte-identical on replay (the
// determinism gate extends over it). The target is derived from `alert_category` + `payload_data` (the ids
// that actually exist today: `claim_id`, `pool_id`, `ticket_id`, `module_id`; `alert_published`'s
// payload_data carries no content id so its target is the `alert_id`) — NOT `provenance_refs`, whose
// fields are all optional + unpopulated until Epic 6/8 producers land.
//
// ── OpenAPI posture ───────────────────────────────────────────────────────────────────────────────────
// Internal render seam, NOT an HTTP endpoint → NO `.openapi()` registration (same posture as `alerts/`).
// `openapi/v1.yaml` stays byte-identical for this grammar.
//
// ── Subpath note (mirrors kyc/audit/rbac) ─────────────────────────────────────────────────────────────
// The README says `import … from '@twt/contracts/deep-links'` — that subpath is NOT wired (no `exports`
// map on the package). Consumers import from the `@twt/contracts` barrel. The anti-shadowing rule that
// matters (README #2) is: apps/api MUST NOT redeclare these types — consume them, don't copy them.

import { z } from 'zod';

import { UuidString } from '../_common/primitives.js';
import type { Alert } from '../alerts/alert.js';

/** The custom URI scheme for TWT in-app deep links. */
export const DEEP_LINK_SCHEME = 'twt';

/**
 * The per-category resource segment. Tenant-scoped resources land under `twt://p/<pariwar_id>/<resource>`,
 * mirroring the HTTP `/api/v1/p/<pariwar_id>/…` grammar (README "Tenant scoping"). A closed enum so a new
 * resource is a deliberate grammar change (`.strict()` discipline).
 */
export const DeepLinkResource = z.enum([
  'announcements',
  'renewals',
  'contributions',
  'claims',
  'tickets',
  'modules',
]);
export type DeepLinkResource = z.output<typeof DeepLinkResource>;

/**
 * A canonical deep-link target — the grammar's `.strict()` shape. `resourceId` is `null` for an id-less
 * target (e.g. the renewals landing, which has no content id in its payload). Tenant-scoped: `pariwarId`
 * binds the link to the Pariwar the push was sent from (a multi-Pariwar member's device token is per
 * Pariwar, so the link is self-contained and never resolves against the wrong tenant).
 */
export const DeepLinkTarget = z
  .object({
    pariwarId: UuidString,
    resource: DeepLinkResource,
    resourceId: z.string().min(1).nullable(),
  })
  .strict();
export type DeepLinkTarget = z.output<typeof DeepLinkTarget>;

/** Build the canonical URI string from a target (deterministic + pure). URI-encode every path segment —
 * `pariwarId` and `resourceId` are otherwise-untrusted-shaped strings by the time they reach this function,
 * and an unencoded `/` (or other reserved character) would corrupt the URI's segment structure. */
export function formatDeepLink(target: DeepLinkTarget): string {
  const base = `${DEEP_LINK_SCHEME}://p/${encodeURIComponent(target.pariwarId)}/${target.resource}`;
  return target.resourceId === null ? base : `${base}/${encodeURIComponent(target.resourceId)}`;
}

/**
 * Derive the deep-link target for an alert (pure). Exhaustive over ALL 9 `alert_category` values:
 *   · The 7 FR-71 push categories map to a bespoke resource/id (announcements | renewals | contributions |
 *     claims | tickets | modules).
 *   · `niyamavali_amended` reaches push as a BROADCAST (epics L1486) via the GENERAL announcement path —
 *     it is NOT an 8th FR-71 category, so it targets `announcements/:alert_id` like `alert_published`
 *     (see Dev Notes "Push category eligibility"). It carries a dotted `clause_id`, not a resource UUID,
 *     so the announcement feed entry is the correct landing.
 *   · `step_up_otp` is NOT push-eligible (SMS transport, Story 5.9) → returns `null` (no deep-link).
 */
export function deepLinkTargetForAlert(alert: Alert): DeepLinkTarget | null {
  const pariwarId = alert.pariwar_id;
  switch (alert.alert_category) {
    case 'alert_published':
    case 'niyamavali_amended':
      // No content-specific id in the payload → the announcement/feed entry is the target.
      return { pariwarId, resource: 'announcements', resourceId: alert.alert_id };
    case 'deadline_reminder':
      // Story 9.10: the pending-match RETRY reminder rides this SAME category but carries the member's
      // own `pool_id` — route it to the member's own contribution surface, not a fresh pay prompt. The
      // day-5/10/13/14 cadence reminders carry no `pool_id` and fall through to the renewals landing,
      // UNCHANGED.
      if (alert.payload_data.pool_id) {
        return { pariwarId, resource: 'contributions', resourceId: alert.payload_data.pool_id };
      }
      return { pariwarId, resource: 'renewals', resourceId: null };
    case 'contribution_confirmed':
    case 'contribution_mismatch':
      // A missing pool_id at runtime (despite the type saying required) must fail safely to `null` —
      // never emit a `.../contributions/undefined` URI.
      if (!alert.payload_data.pool_id) return null;
      return { pariwarId, resource: 'contributions', resourceId: alert.payload_data.pool_id };
    case 'claim_status_change':
      if (!alert.payload_data.claim_id) return null;
      return { pariwarId, resource: 'claims', resourceId: alert.payload_data.claim_id };
    case 'helpdesk_reply':
      if (!alert.payload_data.ticket_id) return null;
      return { pariwarId, resource: 'tickets', resourceId: alert.payload_data.ticket_id };
    case 'module_new':
      if (!alert.payload_data.module_id) return null;
      return { pariwarId, resource: 'modules', resourceId: alert.payload_data.module_id };
    case 'step_up_otp':
      return null;
  }
}

/**
 * Parse a canonical deep-link URI back into a target, or `null` if it does not match the grammar. The
 * mobile-side landing parser (a later story) validates arrivals with this; shipped now so the grammar has
 * a single round-trippable source of truth (`formatDeepLink(parseDeepLink(u)!) === u`).
 */
export function parseDeepLink(uri: string): DeepLinkTarget | null {
  const prefix = `${DEEP_LINK_SCHEME}://p/`;
  if (!uri.startsWith(prefix)) return null;
  const rest = uri.slice(prefix.length);
  const segments = rest.split('/');
  // Expect [pariwarId, resource] or [pariwarId, resource, resourceId].
  if (segments.length < 2 || segments.length > 3) return null;
  const [pariwarId, resource, resourceId] = segments;
  const parsed = DeepLinkTarget.safeParse({
    pariwarId,
    resource,
    resourceId: resourceId ?? null,
  });
  return parsed.success ? parsed.data : null;
}
