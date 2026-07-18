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
 * The canonical `<resource>.<action>` matcher: lowercase letters/DIGITS/underscores,
 * a single dot, no leading/trailing/double dots. Mirrors the `_common/errors.ts`
 * `<domain>.<action>` namespacing convention and the contracts-layer regex
 * (packages/contracts/src/rbac/permissions.ts) — keep the two in lockstep.
 *
 * ⚠ Story 6.14 WIDENED this to allow DIGITS (`[a-z0-9_]`, was `[a-z_]`). The R9
 * panel-voting key `claim.r9_vote` (D-B/AC6) carries a rule number (`r9`) that the
 * original letters-only pattern rejected — the FIRST permission key to reference a
 * numbered niyamavali rule. Digits were always legal in the ADJACENT vocabularies
 * (reason codes like `r9_special_case`, clause ids like `niy.special-death.r9`), so
 * this closes an accidental gap rather than loosening a deliberate constraint. Case,
 * the single-dot shape, and the no-leading/trailing/double-dot rules are unchanged.
 */
export const PERMISSION_KEY_REGEX = /^[a-z0-9_]+\.[a-z0-9_]+$/;

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
 * Bumped 7 → 9 at Story 6.7 (added TWO keys for the ground-inspection admin surface — FR-40):
 * `claim.conduct_ground_inspection` (the schedule/findings/complete/photo/refusal action) and
 * `claim.override_ground_inspection` (the D6 supervisor override — act on an assignment you are
 * NOT the assigned inspector of; granted to `pariwar_admin` (+ super_admin)). KEY-FORMAT
 * RECONCILIATION mirrors Story 5.8's `pariwar.declare_degraded_mode`: the epic AC's two-dot
 * `claim.ground_inspection.conduct` VIOLATES PERMISSION_KEY_REGEX; the single-dot
 * `<resource>.<action>` form (ADR-0008) is correct.
 *
 * ── D1 RECONCILIATION — block_admin DEFERRED (v1: district_admin only) ─────────
 * PRD FR-40 names block- AND district-level admins as ground-inspection actors. In the current
 * RBAC model, however, ground-inspection assignments are authorized at `dimension: 'district'`,
 * while `block_admin` has `scopeCeiling: 'block'`. A block-scoped grant cannot satisfy a
 * district-scoped resource check (a block is narrower than a district → the district target is
 * "broader than the grant" → deny, scope.ts), and granting district scope would VIOLATE the role
 * ceiling. No geo-tree resolver currently exists to prove block→parent-district ancestry
 * (`denyDeeperGeoResolver`, until Epic 3). Therefore v1 grants `claim.conduct_ground_inspection`
 * to `district_admin` ONLY; block_admin scheduling is deferred until the Epic-3 geo-tree resolver
 * supports ancestry-aware authorization. NO inert block_admin grant is seeded.
 * ACCEPTANCE CONDITION: block_admin support may be enabled only when the authorization layer can
 * resolve a block grant through verified block→district ancestry while preserving the role's
 * `scopeCeiling: 'block'` — enabling it must require no district-scoped grant to the block admin.
 *
 * `field_worker` is likewise DEFERRED to Epic 12 (its `self` scopeCeiling + the dispatch/
 * assignment substrate that would let a field worker act on an arbitrary claim land there).
 *
 * Bumped 9 → 11 at Story 6.8 code review (added TWO keys, replacing an initial `claim.file`
 * reuse): `claim.manage_nominee_bank` (the tier-1 ordinary bank-account collection/edit action,
 * spanning `intake_converged` through `verifier_review`) and `claim.correct_nominee_bank` (the D3
 * tier-2 post-approval correction at `verifier_approved` — audited, reason-required). The initial
 * implementation gated BOTH actions on the pre-existing `claim.file` intake-filing key; review
 * found this a semantic-scope mismatch (`claim.file`'s own doc comment scopes it to "the
 * freeze-firing POST …/admin/claims/intake" — a single one-time action, not a multi-state
 * collection window plus a distinct post-approval correction), and inconsistent with THIS epic's
 * own precedent: Story 6.7 minted two new keys for its two new claim-admin actions rather than
 * reusing `claim.file`. Mirrors the 6.7 `claim.conduct_ground_inspection` /
 * `claim.override_ground_inspection` split — one key for the routine action, one for the
 * escalated/supervisory action — see roles.ts for the grant rationale.
 */
// Bumped 11 → 12 at Story 6.9 (added ONE key): `claim.manage_dpdpa_consent` (the claim-time DPDPA
// consent REVOCATION action — a later withdrawal/management action, semantically NOT filing). The
// RECORD path reuses `claim.file` (consent capture is part of intake), so no key for it; only the
// REVOKE path mints a dedicated key, exactly the 6.8 lesson that replaced a `claim.file` reuse for a
// distinct management action with its own semantically-scoped key. Granted to `helpline_operator` +
// `pariwar_admin` (mirroring the `claim.manage_nominee_bank` grant shape) — see roles.ts.
// Bumped 12 → 13 at Story 6.10 (added ONE key): `claim.verify` — the verifier-console READ key gating
// the bounded compound read-model route (GET …/admin/claims/:claimCaseId/verifier-console). A READ key,
// DISTINCT from the pre-existing `claim.approve` WRITE (the 6.11 adjudication action): a role that may
// READ a claim's signals to verify standing is not necessarily one that may APPROVE it (the 4.6
// `member.view_validity` read-key precedent + the 6.7/6.8/6.9 "don't reuse a write key for a distinct
// action" lesson). Checked at `dimension: 'district'` against the deceased member's server-derived
// posting district. Granted to `district_admin` + `verifier` (both `district` ceiling; derives to
// `super_admin`). NOT `state_trustee` (D3a — a `state`-ceiling grant cannot satisfy a district-dimension
// check under the deny-deeper geo resolver until Epic 3; State-Trustee district-console access is
// deferred, the exact 6.7 block_admin precedent). See roles.ts for the grant rationale.
// Bumped 13 → 14 at Story 6.12 (added ONE key): `claim.assign_shepherd` — the R6 MANUAL shepherd
// reassignment WRITE key gating `POST …/admin/claims/:claimCaseId/shepherd/reassign`. FR-41 requires an
// ordinary administrative reassignment/correction path that the AR-61 automatic fallback alone does not
// provide. Checked at `dimension: 'district'` against the deceased member's SERVER-DERIVED posting
// district (the 6.10/6.11 pattern). DISTINCT from `claim.approve` + `claim.verify` (being able to route
// the family's contact ≠ adjudicating the ₹50L claim — AC6; the "don't reuse a write key for a distinct
// action" lesson). Granted to `district_admin` + `pariwar_admin` + `super_admin` (see roles.ts).
// Bumped 14 → 15 at Story 6.13 (added ONE key): `cycle.freeze` — the State-Trustee cycle-freeze
// (bulk-approval) WRITE key gating the FIRST state_trustee-facing surface (GET/POST
// …/admin/cycle-freeze/{pending,decision,commit}). A PARIWAR-WIDE bulk action (the freeze commits the
// Pariwar's pending cycle) → checked at `dimension: 'pariwar'` (value = scopeTx.pariwarId, resolvable
// TODAY — the validity.invalidate_cache / pariwar.configure_channels pariwar-wide-key precedent), granted
// to `pariwar_admin` + `super_admin`.
// ── D-B RECONCILIATION — direct `state_trustee` authorization DEFERRED to Epic 3 ───────────────
// The story's actor is the "State Trustee", but a `state`-ceiling role CANNOT satisfy a `pariwar`-dimension
// check (`scopeWithinCeiling('pariwar','state')` is false) NOR hold a `pariwar` grant, and there is no
// Pariwar→state geo data pre-Epic-3 (no `pariwars` base table with a state column; the geo tree is Epic 3).
// So v1 gates on `pariwar_admin` acting as Trustee-Lite; direct `state_trustee` gating is DEFERRED to the
// Epic-3 geo-tree resolver — the EXACT 6.7 block_admin + 6.10 state_trustee deferral precedent. This is a
// DELIBERATE deferral, NOT an oversight (the 6.12 review lesson: a deliberate authz deferral must read as
// deliberate). NO inert state_trustee grant is seeded. ACCEPTANCE CONDITION: direct state_trustee gating
// may be enabled only when the authorization layer can resolve a state grant through verified
// state→Pariwar containment while preserving the role's `scopeCeiling: 'state'`.
// Bumped 15 → 16 at Story 6.14 (D-B; added ONE key): `claim.r9_vote` — the R9 special-case panel-voting
// WRITE key gating the R9 voting surface (GET/POST …/admin/r9-voting/*). Checked at `dimension: 'pariwar'`
// (value = scopeTx.pariwarId — the cycle.freeze / validity.invalidate_cache pariwar-wide-key precedent; NO
// server-derived district). Granted to `pariwar_admin` + `super_admin`. Direct `state_trustee` authorization
// is DEFERRED to the Epic-3 geo-tree resolver (a `state`-ceiling grant cannot satisfy a pariwar-dimension
// check pre-Epic-3 — the 6.13 D-B / 6.7 block_admin deferral precedent); v1 actor = pariwar_admin-as-
// Trustee-Lite. A DELIBERATE deferral, documented so it never reads as an oversight. NO inert state_trustee
// grant is seeded. The FINALIZE route is ADDITIONALLY step-up-gated (`r9_finalize`) — a route concern, not a
// permission key. The panel-membership eligibility check (every panel actor must hold THIS key) is the
// domain write-path's `assertPanelAuthorized`, distinct from the requester's own route gate.
// Bumped 16 → 19 at Story 6.16 (the LAST story of Epic 6; added THREE keys for the internal 3-stage appeal):
// `claim.appeal_review` — the Stage-1 District-Admin reviewer WRITE key. Gates
// `POST …/admin/claims/:claimCaseId/appeal/stage1`. Checked at `dimension: 'district'` against the deceased
// member's SERVER-DERIVED posting district (the 6.10/6.11/6.12 verifier-decision precedent). Granted to
// `district_admin` (+ super_admin). The D-D reviewer-conflict (reviewer ≠ original verifier/state-trustee/R9
// voter) is enforced in the domain write-path + the handler — a SEPARATE concern from this route gate.
// `claim.appeal_vote` — the Stage-2 State-Trustee panel-voting WRITE key. Gates
// `POST …/admin/claims/:claimCaseId/appeal/stage2/{open,vote,finalize,cancel}`. Checked at
// `dimension: 'pariwar'` (value = scopeTx.pariwarId — the claim.r9_vote / cycle.freeze pariwar-wide-key
// precedent). Granted to `pariwar_admin` (+ super_admin). Also the panel-membership eligibility credential:
// openAppealPanel validates EVERY panel member holds it @ pariwar (assertPanelAuthorized). The FINALIZE route
// ADDS an `appeal_stage2_finalize` step-up (a route concern, not a key).
// `claim.appeal_final` — the Stage-3 Trustee discretion WRITE key. Gates
// `POST …/admin/claims/:claimCaseId/appeal/stage3`. Checked at `dimension: 'pariwar'` (RESOLVED, v1 — a
// global-scope Trustee escalation is a future extension). Granted to `pariwar_admin` (+ super_admin). The
// DECIDE route is step-up-gated (`appeal_stage3_decide`). Direct `state_trustee` gating for the pariwar-
// dimension keys is DEFERRED to the Epic-3 geo-tree resolver (the 6.13/6.14 Trustee-Lite precedent); v1 actor
// = pariwar_admin-as-Trustee-Lite. NO inert state_trustee grant is seeded. The member-facing INITIATE route
// needs NO admin key — it is a claimant-or-operator action (member session, or an operator with the helpline
// capability under AR-61).
// Bumped 19 → 21 at Story 7.5 (added TWO keys for the FR-15 fixed-amount schedule surface):
// `pool.fixed_amount_set` — the STANDARD (12-month-notice) fixed-amount change WRITE key. Gates
// `GET/POST …/admin/pool-fixed-amount` + `POST …/admin/pool-fixed-amount/schedule`. Checked at
// `dimension: 'pariwar'` (value = scopeTx.pariwarId — the cycle.freeze / claim.r9_vote pariwar-wide-key
// precedent; the fixed amount is a PARIWAR-WIDE policy). Granted to `pariwar_admin` (+ super_admin).
// `pool.fixed_amount_emergency` — the EMERGENCY adjustment override WRITE key. Gates
// `POST …/admin/pool-fixed-amount/emergency` (ADDITIONALLY step-up-gated at the route — governance posture
// equivalent to R9: step-up + recorded trustee attestation + auditability, WITHOUT the R9 voting lifecycle).
// Also `dimension: 'pariwar'`; granted to `pariwar_admin` (+ super_admin). v1 actor = pariwar_admin-as-
// Trustee-Lite; direct `state_trustee` gating DEFERRED to the Epic-3 geo-tree resolver (the 6.13/6.14
// Trustee-Lite precedent — a `state`-ceiling grant cannot satisfy a pariwar-dimension check pre-Epic-3). NO
// inert state_trustee grant is seeded. A DELIBERATE deferral, documented so it never reads as an oversight.
export const PERMISSION_CATALOG_VERSION = 21 as const;

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
  // Story 6.7 — the FR-40 ground-inspection ACTION key. Gates the admin
  // schedule/reschedule/findings/complete/refusal/photo endpoints (checked at
  // `dimension: 'district'` against the assignment's OWN stored district). Granted to
  // `district_admin` ONLY in v1 (block_admin DEFERRED — see the D1-reconciliation note above:
  // a block-scoped grant cannot satisfy a district-dimension check). ⚠ The epic AC's two-dot
  // `claim.ground_inspection.conduct` VIOLATES PERMISSION_KEY_REGEX — this single-dot
  // `<resource>.<action>` form (ADR-0008) is correct, the exact 5.8
  // `pariwar.declare_degraded_mode` reconciliation. `field_worker` grant deferred to Epic 12.
  'claim.conduct_ground_inspection',
  // Story 6.7 — the D6 supervisor-OVERRIDE key. Lets a holder author evidence
  // (complete/findings/photo/refusal) on a ground-inspection assignment they are NOT the
  // assigned inspector of, checked at the assignment's district when acting_actor ≠
  // inspector_actor_id. Never implicit, never "any district admin". Granted to
  // `pariwar_admin` (+ super_admin) — a supervisor above the district inspector.
  'claim.override_ground_inspection',
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
  // Story 6.8 code review — the tier-1 ordinary nominee-bank collection/edit ACTION key (replaces
  // an initial `claim.file` reuse — see the PERMISSION_CATALOG_VERSION 9→11 note above). Gates the
  // helpline `POST`/`GET …/admin/claims/:claimCaseId/nominee-bank` routes. Granted to
  // `helpline_operator` (+ super_admin).
  'claim.manage_nominee_bank',
  // Story 6.8 code review — the D3 tier-2 post-approval CORRECTION key (verifier_approved window,
  // reason-required, audited). A distinct, more-privileged action from ordinary collection — the
  // 6.7 conduct/override split precedent. Checked INSIDE the handler (not the route preHandler,
  // since the tier is only knowable after reading the claim's locked state) — mirrors
  // `claim.override_ground_inspection`'s `resolveInspectorOverride` pattern in
  // claims.ground-inspection.handlers.ts. Granted to `helpline_operator` (unchanged capability —
  // the original `claim.file` reuse let any claim.file holder correct) AND `pariwar_admin` (a
  // supervisor-escalation grant, same rationale as claim.override_ground_inspection; a pure
  // pariwar_admin still cannot reach the route without ALSO holding a manage-nominee-bank grant).
  'claim.correct_nominee_bank',
  // Story 6.9 (D5a) — the claim-time DPDPA consent REVOCATION action key. Gates the helpline
  // `POST …/admin/claims/:claimCaseId/dpdpa-consent/revoke` route. Distinct from `claim.file` (which
  // gates the RECORD path, since consent capture IS part of filing): a revocation is a LATER
  // withdrawal/management action performed by an operator who is not filing anything — reusing
  // `claim.file` would reproduce the exact semantic-scope mismatch the 6.8 review corrected. Granted
  // to `helpline_operator` + `pariwar_admin` (the `claim.correct_nominee_bank` /
  // `claim.override_ground_inspection` grant shape — NOT the helpline_operator-only
  // `claim.manage_nominee_bank` shape).
  'claim.manage_dpdpa_consent',
  // Story 6.10 — the verifier-console READ key. Gates the bounded compound read-model route
  // GET …/admin/claims/:claimCaseId/verifier-console (checked at `dimension: 'district'` against the
  // deceased member's SERVER-DERIVED latest posting district — the client never submits the authz
  // district). Distinct from `claim.approve` (the 6.11 WRITE): reading a claim's signals to verify
  // standing ≠ approving it (the 4.6 `member.view_validity` read-key precedent). Granted to
  // `district_admin` + `verifier` ONLY (+ derived `super_admin`) — NOT `state_trustee` (D3a: a
  // `state`-ceiling grant cannot satisfy a district-dimension check until the Epic-3 geo-tree resolver;
  // the exact 6.7 block_admin deferral). See roles.ts.
  'claim.verify',
  // Story 6.12 (R6) — the MANUAL shepherd reassignment WRITE key. Gates
  // `POST …/admin/claims/:claimCaseId/shepherd/reassign` (checked at `dimension: 'district'` against the
  // deceased member's SERVER-DERIVED posting district — the client never submits the authz district).
  // DISTINCT from `claim.approve` + `claim.verify`: being assigned/able-to-reassign the family's human
  // contact grants NO adjudication power (AC6) — the 6.10/6.11 read/write-key-separation lesson. The
  // automatic assignment (AC1) + AR-61 fallback (AC4) are `actor: 'system'` and need no key; only the
  // human-initiated correction path does. Granted to `district_admin` + `pariwar_admin` + `super_admin`.
  'claim.assign_shepherd',
  // Story 6.13 (D-B) — the State-Trustee cycle-freeze (bulk-approval) WRITE key. Gates the FIRST
  // state_trustee-facing surface (GET/POST …/admin/cycle-freeze/{pending,decision,commit}). Checked at
  // `dimension: 'pariwar'` (value = scopeTx.pariwarId — the validity.invalidate_cache /
  // pariwar.configure_channels pariwar-wide-key precedent; NO server-derived district). Granted to
  // `pariwar_admin` + `super_admin`. Direct `state_trustee` authorization is DEFERRED to the Epic-3
  // geo-tree resolver (see the version-bump note above — a `state`-ceiling grant cannot satisfy a
  // pariwar-dimension check pre-Epic-3; the 6.7/6.10 deferral precedent). v1 actor = pariwar_admin-as-
  // Trustee-Lite. A DELIBERATE deferral, documented so it never reads as an oversight.
  'cycle.freeze',
  // Story 6.14 (D-B) — the R9 special-case panel-voting WRITE key. Gates the R9 voting surface
  // (GET/POST …/admin/r9-voting/{queue,:claimCaseId,open,vote,finalize,cancel,votes-by-trustee}). Checked at
  // `dimension: 'pariwar'` (value = scopeTx.pariwarId — the cycle.freeze pariwar-wide-key precedent; NO
  // server-derived district). Granted to `pariwar_admin` + `super_admin`. Direct `state_trustee` gating is
  // DEFERRED to Epic 3 (the 6.13 D-B Trustee-Lite precedent). This key is ALSO the panel-membership
  // eligibility credential: openR9VotingSession validates EVERY panel_actor_ids member holds it @ pariwar
  // (assertPanelAuthorized). The finalize route ADDS an r9_finalize step-up (a route concern, not a key).
  'claim.r9_vote',
  // Story 6.16 — the Stage-1 District-Admin appeal-reviewer WRITE key. Gates
  // POST …/admin/claims/:claimCaseId/appeal/stage1 (checked at `dimension: 'district'` against the deceased
  // member's SERVER-DERIVED posting district — the 6.10/6.11/6.12 precedent). Granted to `district_admin`
  // (+ super_admin). The D-D reviewer-conflict exclusion (reviewer ≠ original decider) is a domain/handler
  // concern, distinct from this route gate.
  'claim.appeal_review',
  // Story 6.16 — the Stage-2 State-Trustee appeal panel-voting WRITE key. Gates
  // POST …/admin/claims/:claimCaseId/appeal/stage2/{open,vote,finalize,cancel} (checked at
  // `dimension: 'pariwar'` — the claim.r9_vote precedent). Granted to `pariwar_admin` (+ super_admin). Also
  // the panel-membership eligibility credential (openAppealPanel's assertPanelAuthorized). Finalize ADDS an
  // `appeal_stage2_finalize` step-up (a route concern).
  'claim.appeal_vote',
  // Story 6.16 — the Stage-3 Trustee discretion (final) WRITE key. Gates
  // POST …/admin/claims/:claimCaseId/appeal/stage3 (checked at `dimension: 'pariwar'` — RESOLVED v1; a
  // global-scope escalation is a future extension). Granted to `pariwar_admin` (+ super_admin). The route is
  // step-up-gated (`appeal_stage3_decide`). Direct state_trustee gating deferred to Epic 3 (Trustee-Lite).
  'claim.appeal_final',
  // Story 7.5 (FR-15) — the STANDARD (12-month-notice) fixed-amount change WRITE key. Gates
  // GET/POST …/admin/pool-fixed-amount + POST …/admin/pool-fixed-amount/schedule. Checked at
  // `dimension: 'pariwar'` (value = scopeTx.pariwarId — the cycle.freeze / claim.r9_vote pariwar-wide-key
  // precedent; the fixed amount is a Pariwar-wide policy). Granted to `pariwar_admin` (+ super_admin).
  'pool.fixed_amount_set',
  // Story 7.5 (FR-15) — the EMERGENCY adjustment override WRITE key. Gates
  // POST …/admin/pool-fixed-amount/emergency (ADDITIONALLY step-up-gated at the route — governance posture
  // equivalent to R9 WITHOUT the R9 voting lifecycle). Also `dimension: 'pariwar'`. Granted to `pariwar_admin`
  // (+ super_admin). Direct state_trustee gating deferred to Epic 3 (Trustee-Lite; see the version-bump note).
  'pool.fixed_amount_emergency',
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

/** The catalog — the grounded seed keys, each validated through the constructor. */
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
