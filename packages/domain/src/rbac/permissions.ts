// Permission-key type + versioned catalog — Story 1.8 substrate (AC-1).
//
// KEY-FORMAT RECONCILIATION. Permission keys follow the `<resource>.<action>`
// convention — `claim.approve`, `member.suspend`, `pariwar.provision`,
// `audit.export`, `audit.verify`. This is the canonical form per architecture
// §2.6 L1479 and EVERY concrete key in the artifacts. It RECONCILES the epic's
// literal `verb.resource` wording (epics.md L1127), which is backwards relative
// to all grounded examples — the epic's token-ORDER is the error; the concept (a
// verb acting on a resource) is preserved. Ratified in ADR-0008 +
// Decision 2026-06-11-044 + a correct-course note against epics.md L1127.
//
// ⚠ DO NOT confuse permission keys (imperative verb — what a role MAY do) with
// EVENT names (past-tense — what HAPPENED: `claim.approved`, `member.suspended`,
// `alert.published`, `niyamavali.amended`). Event names are `packages/events`
// territory (the eventsLog.event_type column); permission keys live here.
//
// The catalog is VERSIONED and APPEND-ONLY / extensible. Most resources' endpoints
// land in later epics (claims keys at Epic 6, members at Epic 3, pools at Epic 7,
// audit at 1.10/1.11) — the catalog grows per-epic; it is NOT exhaustive at 1.8.
// Seed EXACTLY the keys the artifacts reference; do NOT manufacture keys for
// resources whose endpoints don't exist (that would create dead/wrong keys
// downstream code must reconcile).

import type { Brand } from '../ids/index.js';

/**
 * A validated permission key of the canonical `<resource>.<action>` shape:
 * lowercase, exactly one dot, `[a-z_]+` on each side. Branded (compile-time
 * phantom property, mirroring `packages/domain/src/ids/`) so a raw string can
 * never be silently passed where a validated `PermissionKey` is expected. At
 * runtime a `PermissionKey` IS a plain string.
 */
export type PermissionKey = Brand<'PermissionKey'>;

/**
 * The canonical `<resource>.<action>` matcher: lowercase letters/underscores,
 * a single dot, no leading/trailing/double dots. Mirrors the `_common/errors.ts`
 * `<domain>.<action>` namespacing convention and the contracts-layer regex
 * (packages/contracts/src/rbac/permissions.ts) — keep the two in lockstep.
 */
export const PERMISSION_KEY_REGEX = /^[a-z_]+\.[a-z_]+$/;

/** Thrown when the permission-key smart constructor receives a malformed string. */
export class InvalidPermissionKeyError extends Error {
  public readonly name = 'InvalidPermissionKeyError';
  public constructor(public readonly received: string) {
    super(
      `[rbac] permission key must match <resource>.<action> ` +
        `(${PERMISSION_KEY_REGEX.source}); received ${JSON.stringify(received)}`,
    );
  }
}

/**
 * Smart constructor: validates the `<resource>.<action>` shape and returns a
 * branded `PermissionKey`, throwing `InvalidPermissionKeyError` on failure
 * (mirrors `uuidBrand` / `InvalidBrandedIdError` in `ids/index.ts`). Membership
 * in `PERMISSION_CATALOG` is a SEPARATE check (`isCatalogKey`) — this validates
 * shape only, so downstream stories can construct their own keys before adding
 * them to the catalog.
 */
export function permissionKey(value: string): PermissionKey {
  if (!PERMISSION_KEY_REGEX.test(value)) {
    throw new InvalidPermissionKeyError(value);
  }
  return value as PermissionKey;
}

/**
 * Catalog version. Bumped when keys are added/removed (append-only in practice —
 * the catalog grows per-epic). Downstream consumers may pin/assert a minimum.
 * Bumped 1 → 2 at Story 2.6 (added `tc.publish` + `tc.approve`).
 * Bumped 2 → 3 at Story 4.6 (added `member.view_validity` — the FR-12A Member
 * Validity read key; the reuse-check confirmed no existing `member.*` key signals a
 * READ: `member.suspend`/`member.moderate` are both WRITE actions).
 * Bumped 3 → 4 at Story 4.8 code review (added `validity.invalidate_cache` — the
 * emergency "invalidate all" action is a WRITE distinct from the READ-only
 * `member.view_validity` it was provisionally gated on; reusing a read key for a
 * tenant-wide mutating action let any validity-reading role trigger it).
 * Bumped 4 → 5 at Story 5.3 (added `pariwar.configure_channels` — the FR-72
 * per-Pariwar WhatsApp Business config write, a PARIWAR-WIDE config action gating
 * the WA config/template admin endpoints; granted to `pariwar_admin` (+ super_admin),
 * exactly like `validity.invalidate_cache` — a `pariwar`-ceiling-or-broader role).
 * Bumped 5 → 6 at Story 5.8 (added `pariwar.declare_degraded_mode` — the AR-20
 * degraded-mode declaration WRITE gating the declare/revoke admin endpoints; a
 * PARIWAR-WIDE governance action granted to `pariwar_admin` (+ super_admin), same
 * ceiling rationale as `pariwar.configure_channels`. KEY-FORMAT RECONCILIATION: the
 * epic AC's two-dot `pariwar.degraded_mode.declare` VIOLATES PERMISSION_KEY_REGEX;
 * the single-dot `pariwar.declare_degraded_mode` (ADR-0008 <resource>.<action>) is
 * the correct key. The two-dot form survives only as the audit ACTION, whose regex
 * permits multiple dots).
 * Bumped 6 → 7 at Story 6.3 (added `claim.file` — the helpline/operator claim-INTAKE WRITE
 * key gating the freeze-firing `POST …/admin/claims/intake`. Distinct from `claim.approve`
 * (the verifier/trustee APPROVAL action, Story 6.10/6.11): a role that may FILE a claim on a
 * caller's behalf is not necessarily one that may APPROVE it. Granted to `helpline_operator`
 * (+ super_admin, which derives the full catalog); the trustee-initiated filing path is later).
 */
export const PERMISSION_CATALOG_VERSION = 7 as const;

/**
 * The grounded v1 seed keys (architecture + epic + PRD references only — see file
 * header). Deliberately sparse: most resources' endpoints land in later epics, so
 * their keys are added by the owning story. `as const` preserves the literal
 * union for type-level reasoning.
 */
export const SEED_PERMISSION_KEYS = [
  'claim.approve',
  // Story 6.3 — the helpline/operator claim-INTAKE WRITE key. Gates the freeze-firing
  // POST /p/:pariwarId/admin/claims/intake (the operator files a claim on a bereaved
  // caller's behalf). Distinct from `claim.approve` (verifier/trustee APPROVAL, 6.10/6.11):
  // filing an intake ≠ approving the claim. Granted to `helpline_operator` (+ super_admin).
  'claim.file',
  'member.suspend',
  'member.moderate',
  // Story 4.6 — the FR-12A Member Validity READ key. Distinct from the write-oriented
  // `member.suspend`/`member.moderate` (a caller that may READ a member's validity is not
  // necessarily one that may suspend/moderate them, and vice-versa). Granted to the
  // read-capable FR-46 roles in roles.ts; the member's own self-call is authorized via the
  // `self` scope dimension, not this key.
  'member.view_validity',
  // Story 4.8 code review — the emergency "invalidate all" WRITE action (POST
  // .../admin/validity-cache/invalidate-all). Distinct from the READ-only
  // `member.view_validity` it was provisionally gated on. Granted to `pariwar_admin`
  // (+ super_admin) — a PARIWAR-WIDE action needs a `pariwar`-ceiling-or-broader
  // role; `state_trustee`'s narrower `state` ceiling cannot satisfy it regardless.
  'validity.invalidate_cache',
  // Story 5.3 — the FR-72 per-Pariwar WhatsApp Business config WRITE (POST/PUT the WA number, toggle,
  // credential NAME, and per-category template mapping). A PARIWAR-WIDE config action → granted to
  // `pariwar_admin` (+ super_admin), the exact `validity.invalidate_cache` posture (a `pariwar`-ceiling-
  // or-broader role; `state_trustee`'s narrower `state` ceiling cannot satisfy it).
  'pariwar.configure_channels',
  // Story 5.8 — the AR-20 degraded-mode declaration WRITE (POST declare / revoke the cycle-open SMS bridge).
  // A PARIWAR-WIDE governance action → granted to `pariwar_admin` (+ super_admin), the exact
  // `pariwar.configure_channels` posture (a `pariwar`-ceiling-or-broader role; `state_trustee`'s narrower
  // `state` ceiling cannot satisfy it). ⚠ The epic AC's two-dot `pariwar.degraded_mode.declare` VIOLATES
  // PERMISSION_KEY_REGEX — this single-dot `<resource>.<action>` form (ADR-0008) is correct; the two-dot
  // form survives only as the audit ACTION (`pariwar.degraded_mode.declared`).
  'pariwar.declare_degraded_mode',
  'pariwar.amend_rule',
  'pariwar.provision',
  'niyamavali.amend',
  'niyamavali.review',
  // Story 2.6 — T&C version registry (the create + approve trustee endpoints DO
  // exist, so these keys are grounded, not speculative).
  'tc.publish',
  'tc.approve',
  'audit.export',
  'audit.verify',
] as const;

/** The literal union of the v1 seed keys (extends per-epic as keys are added). */
export type SeedPermissionKey = (typeof SEED_PERMISSION_KEYS)[number];

/**
 * The versioned, append-only permission-key registry. A single coherent catalog
 * (AC-1) keyed by `catalogVersion`; `keys` is the validated, deduplicated set.
 * GROWS PER-EPIC — adding a resource's keys is a one-line append in the owning
 * story (no schema migration; this is pure-domain metadata).
 */
export interface PermissionCatalog {
  readonly catalogVersion: number;
  readonly keys: readonly PermissionKey[];
}

/** The catalog — the 16 grounded keys, each validated through the constructor. */
export const PERMISSION_CATALOG: PermissionCatalog = {
  catalogVersion: PERMISSION_CATALOG_VERSION,
  keys: SEED_PERMISSION_KEYS.map(permissionKey),
};

/** O(1) membership set over the catalog keys (used by the fail-closed guard). */
const CATALOG_KEY_SET: ReadonlySet<string> = new Set(PERMISSION_CATALOG.keys);

/**
 * Is `key` an enumerated catalog key? The fail-closed guard (`check.ts`) treats a
 * non-catalog key as UNKNOWN → deny. Accepts a raw string so callers needn't
 * pre-validate; a malformed string is simply not in the set → `false`.
 */
export function isCatalogKey(key: string): key is PermissionKey {
  return CATALOG_KEY_SET.has(key);
}
