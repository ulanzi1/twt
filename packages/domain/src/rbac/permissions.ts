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
 * ── ✅ D1 RECONCILIATION — SHIPPED at Story 6.17. block_admin HOLDS the conduct key. ───────────
 * PRD FR-40 names block- AND district-level admins as ground-inspection actors. Story 6.7 shipped
 * `district_admin` ONLY and recorded `block_admin` DEFERRED. That deferral was MISCLASSIFIED, and
 * this block records both halves of the correction: why no resolver was ever going to fix it, and
 * what actually did.
 *
 * ── ⛔ THIS IS RANK ORDER (FAMILY A). NO RESOLVER EVER LIFTED IT, AND NONE DOES NOW. ────────────
 * This block previously said the gap was DEFERRED to Story 1.18's geo-tree resolver, "which a
 * resolver GENUINELY fixes: block→parent-district is same-tree ancestry with the target strictly
 * narrower." ⭐ THAT PREMISE WAS INVERTED, and Story 1.18 found it while implementing the resolver:
 * the parent district is not narrower, it is the PARENT, hence BROADER. Traced:
 *
 *   GEO_RANK: state 2 < district 3 < block 4   (lower = BROADER)
 *   grant {block,'Block-1'} → gRank 4;  target {district,'Patna'} → tRank 3
 *   scope.ts `if (tRank < gRank) return false`  →  3 < 4  →  DENIED, before any resolver runs.
 *
 * And the alternative — issuing a district-scoped grant to a block admin — fails the OTHER line:
 * `scopeWithinCeiling('district','block')` reads CEILING_RANK and is a pure numeric compare with no
 * resolver parameter at all → 3 >= 4 → false. Both denial paths are resolver-free. A resolver
 * answers "is X beneath Y" and can only ever NARROW; this needs the opposite. See `scope.ts`
 * §RANK-ORDER for the canonical explanation.
 *
 * ⇒ RE-CLASSIFIED as Family A at Story 1.18 (Decision `2026-08-12-102`), and it STAYS Family A.
 * The rank-order pin in `check.test.ts` is unmodified and still passes. Story 6.17 ROUTED AROUND
 * it; it did not lift it.
 *
 * ── ✅ WHAT ACTUALLY SHIPPED: a different GATE, not a resolver (Story 6.17) ─────────────────────
 * `claim_ground_inspections` gained a NULLABLE `block` column (migration `0102`) and the
 * authorization DIMENSION became a property of the ROW (Decision `2026-08-13-104`, D2):
 *   · `block != null` → the conduct key is checked at `dimension: 'block'`, which authorizes BOTH
 *     actors — `block_admin` by EXACT-NODE match (`gRank === tRank` → value compare) and
 *     `district_admin` by district→block ANCESTRY (`gRank 3 < tRank 4` → the Story 1.18 resolver).
 *   · `block == null` → checked at `dimension: 'district'`, byte-identically to Story 6.7.
 * ⛔ NOT an unconditional block gate: that would make every pre-6.17 row unreachable AND revoke
 * `district_admin` in every Pariwar with no published tree — which, with no writer surface anywhere
 * in the repo and no code default geography (ADR-0038), is every Pariwar.
 * ⛔ NOT an OR of two checks: strictly wider than either gate, and it would deliver the ancestry
 * outcome while deleting the ancestry mechanism.
 * ⛔ NO FALLBACK when the tree is absent (D6) — absence must DENY, never widen.
 * ⛔ `block_admin`'s `scopeCeiling` stays `'block'`; no district-scoped grant is ever issued to it.
 * ⛔ `claim.override_ground_inspection` is NOT extended to `block_admin` (D8) — the D6 supervisor
 * override is a pariwar-ceiling authority ABOVE the inspector, and re-gating the CONDUCT key says
 * nothing about it.
 *
 * ⛔ The old ACCEPTANCE CONDITION — "enable block_admin when the authorization layer can resolve a
 * block grant through verified block→district ancestry" — was REMOVED, not merely reworded, at
 * Story 1.18: it promised something this model cannot do at any point in the future, and a
 * condition that can never be met is worse than no condition, because it reads as pending work
 * forever. ⛔ Do not resurrect it.
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
// check WITHOUT a geo resolver). ✅ RESOLVED at Story 1.18: `state`→`district` IS same-tree ancestry
// with the target strictly narrower, and the resolver that answers it now EXISTS
// (`geoTree.createGeoTreeResolver` over a published `geo_tree_versions` document, ADR-0038). A
// `state_trustee` grant reaches a district-dimension check ⇔ its Pariwar has published a tree
// placing that district beneath that state. ⛔ NOTE WHAT DID NOT CHANGE: no grant was added and no
// key was re-keyed — `state_trustee` still is not granted this key. The resolver changed what a
// state-held grant CAN reach, not who holds what. A Pariwar with no published tree behaves exactly
// as before. See roles.ts for the grant rationale.
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
// ── D-B RECONCILIATION — direct `state_trustee` authorization is RANK-ORDER BLOCKED ─────────────
// The story's actor is the "State Trustee", but a `state`-ceiling role CANNOT satisfy a `pariwar`-dimension
// check (`scopeWithinCeiling('pariwar','state')` is false) NOR hold a `pariwar` grant, and there is no
// Pariwar→state geo data. So v1 gates on `pariwar_admin` acting as Trustee-Lite.
// ⛔ RANK-ORDER BLOCK (scope.ts §RANK-ORDER) — no geo-tree resolver can lift this: `pariwar` is BROADER than `state`
// (CEILING_RANK 1 vs 2), so a state-ceiling grant is asking to act ABOVE its own ceiling. This was
// previously written as 'DEFERRED to the Epic-3 geo-tree resolver' — a promise Epic 3 could never have
// kept. Corrected by Story 10.18. NO inert state_trustee grant is seeded.
// ⛔ THE REAL CONDITION is not a resolver: it is a pariwar-ceiling actor. Story 10.18 supplies one —
// `trustee_panel` (Niyamavali §8.7, Decision `2026-08-10-096`) — for moderation. A state_trustee could
// only gate these keys if its `scopeCeiling` itself changed, which is freeze row 9 and needs an ADR.
// Bumped 15 → 16 at Story 6.14 (D-B; added ONE key): `claim.r9_vote` — the R9 special-case panel-voting
// WRITE key gating the R9 voting surface (GET/POST …/admin/r9-voting/*). Checked at `dimension: 'pariwar'`
// (value = scopeTx.pariwarId — the cycle.freeze / validity.invalidate_cache pariwar-wide-key precedent; NO
// server-derived district). Granted to `pariwar_admin` + `super_admin`. Direct `state_trustee` authorization
// is ⛔ RANK-ORDER BLOCK (scope.ts §RANK-ORDER) — no geo-tree resolver can lift this (a `state`-ceiling grant can never satisfy a
// pariwar-dimension check — `scopeWithinCeiling` is a pure numeric compare); v1 actor = pariwar_admin-as-
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
// dimension keys is ⛔ RANK-ORDER BLOCK (scope.ts §RANK-ORDER) — no geo-tree resolver can lift this (the 6.13/6.14 Trustee-Lite precedent); v1 actor
// = pariwar_admin-as-Trustee-Lite. NO inert state_trustee grant is seeded. The member-facing INITIATE route
// needs NO admin key — it is a claimant-or-operator action (member session, or an operator with the helpline
// capability under AR-61).
// Bumped 19 → 21 at Story 7.5 (added TWO keys for the FR-15 fixed-amount schedule surface):
// `pool.fixed_amount_set` — the STANDARD (90-day-notice) fixed-amount change WRITE key. Gates
// `GET/POST …/admin/pool-fixed-amount` + `POST …/admin/pool-fixed-amount/schedule`. Checked at
// `dimension: 'pariwar'` (value = scopeTx.pariwarId — the cycle.freeze / claim.r9_vote pariwar-wide-key
// precedent; the fixed amount is a PARIWAR-WIDE policy). Granted to `pariwar_admin` (+ super_admin).
// `pool.fixed_amount_emergency` — the EMERGENCY adjustment override WRITE key. Gates
// `POST …/admin/pool-fixed-amount/emergency` (ADDITIONALLY step-up-gated at the route — governance posture
// equivalent to R9: step-up + recorded trustee attestation + auditability, WITHOUT the R9 voting lifecycle).
// Also `dimension: 'pariwar'`; granted to `pariwar_admin` (+ super_admin). v1 actor = pariwar_admin-as-
// Trustee-Lite; direct `state_trustee` gating is ⛔ RANK-ORDER BLOCK (scope.ts §RANK-ORDER) — no geo-tree resolver can lift this
// (the 6.13/6.14 Trustee-Lite precedent — a `state`-ceiling grant can never satisfy a pariwar check). NO
// inert state_trustee grant is seeded. A DELIBERATE deferral, documented so it never reads as an oversight.
// Bumped 21 → 22 at Story 9.8 (added ONE key for the reconciliation review queue — the trustee
// ADJUDICATION surface): `reconciliation.review` — the READ + four action WRITEs (confirm/reject/
// facilitate-recovery/review-and-reverse) gate. Gates `GET/POST …/admin/reconciliation-review/*`. Checked
// at `dimension: 'pariwar'` (value = scopeTx.pariwarId — the cycle.freeze / claim.r9_vote pariwar-wide-key
// precedent; a reconciliation review queue is PARIWAR-WIDE, not district-derived — unlike the 6.10 verifier
// console, there is NO server-derived district). Granted to `pariwar_admin` (Trustee-Lite) + `super_admin`
// (auto-derived) + `finance_officer` (the FR-50 "designated reconciliation reviewer"). Direct
// `state_trustee` authorization is ⛔ RANK-ORDER BLOCK (scope.ts §RANK-ORDER) — no geo-tree resolver can lift this (a `state`-ceiling grant
// can never satisfy a pariwar-dimension check; the 6.13/6.14 Trustee-Lite precedent). NO inert
// state_trustee grant is seeded. A DELIBERATE deferral, documented so it never reads as an oversight. Each
// action is ADDITIONALLY step-up-gated at the route (distinct action contexts) — a route concern, not a key.
// Bumped 22 → 23 at Story 10.3 (added ONE key): `helpdesk.create` — the helpdesk ticket-create WRITE key
// gating the EXISTING 10.1 create route (POST …/p/:pariwarId/helpdesk/tickets, the operator call-to-ticket
// surface). Closes the RBAC gap 10.1's chunk-4 review and 10.2's Dev Notes explicitly re-deferred to
// "Story 10.3/10.4 — whichever touches that route next" (10.3 touches it). Checked at `dimension: 'pariwar'`
// (value = scopeTx.pariwarId — the reconciliation.review / cycle.freeze pariwar-wide-key precedent; a
// helpdesk ticket is Pariwar-scoped and the tenant IS the target, resolvable TODAY with no geo-tree, unlike
// the district-derived claim.verify). Granted to `helpline_operator` (the SM-1 C3 actor) + `pariwar_admin`
// (both `pariwar` ceiling); `super_admin` auto-derives. `district_admin` is DEFERRED — a `district`-ceiling
// grant can NEVER satisfy a pariwar-dimension check (scopeContains denies a target broader than the grant;
// the ceiling check also forbids a district_admin from holding a pariwar-scoped grant), so granting it would
// seed an INERT/false capability — the exact [[project_rbac_geo_scope_containment]] asymmetry the
// state_trustee-at-pariwar deferrals already encode (cycle.freeze/reconciliation.review). NOT step-up-gated —
// helpdesk create is NOT a freeze-firing action and is NOT in the AR-24 step-up list (unlike the 6.3 claim
// intake). This is the FIRST helpdesk key (the roles.ts "Helpdesk keys land Epic 10" comment made true).
// Bumped 23 → 24 at Story 10.4 (added ONE key): `helpdesk.respond` — the helpdesk responder-console
// READ + all transition/reply route gate (the queue read, the admin detail, pick-up/reply/resolve).
// Gates `GET/POST …/p/:pariwarId/helpdesk/{queue,tickets/:ticketId,tickets/:ticketId/{pick-up,reply,resolve}}`.
// DISTINCT from 10.3's `helpdesk.create` (filing ≠ responding — a role that may file a ticket on a caller's
// behalf is not necessarily one that RESPONDS to the Pariwar's queue; the 6.10/6.11 read/write key-separation
// lesson). Checked at `dimension: 'pariwar'` (value = scopeTx.pariwarId — the helpdesk.create /
// reconciliation.review / cycle.freeze pariwar-wide-key precedent; a helpdesk ticket is Pariwar-scoped, the
// tenant IS the target, resolvable TODAY with no geo-tree). Granted to the roles the DEFAULT routing policy
// routes tickets to (registry.ts DEFAULT_ROUTING_POLICY): `helpline_operator`, `finance_officer`, `it_cell`,
// `pariwar_admin` (all `pariwar` ceiling); `super_admin` auto-derives. `district_admin` is DEFERRED — a
// `district`-ceiling grant can NEVER satisfy a pariwar-dimension check (scopeContains denies a target broader
// than the grant; the ceiling check also forbids a district_admin from holding a pariwar-scoped grant), so
// granting it would seed an INERT/false capability — the EXACT [[project_rbac_geo_scope_containment]] asymmetry
// 10.3's `helpdesk.create` deferral already encodes. NO inert district_admin grant is seeded. NOT step-up-gated
// (helpdesk responding is NOT freeze-firing / not in AR-24 — the 10.3 helpdesk.create rule stands). The SECOND
// helpdesk key. ACCEPTANCE CONDITION: district_admin helpdesk-respond may be enabled only if a helpdesk ticket
// gains a server-derived district AND the gate moves to `dimension: 'district'` — not by widening a pariwar gate.
// Bumped 24 → 25 at Story 10.5 (added ONE key): `news.manage` — the News/Blog admin WRITE + READ gate. Gates
// every admin news route (GET/POST/PATCH …/p/:pariwarId/news[/…] — list/create/update/submit/approve/schedule/
// publish + detail). Checked at `dimension: 'pariwar'` (value = scopeTx.pariwarId — the helpdesk.create /
// reconciliation.review / cycle.freeze pariwar-wide-key precedent; a News/Blog post is Pariwar-scoped and the
// tenant IS the target, resolvable TODAY with no geo-tree). ONE key (not a split author/review pair): BOTH the
// author and the reviewer hold it, and the author≠reviewer fairness rule is an IDENTITY check at the API layer
// (Decision 2), NOT a capability tier. Granted to `pariwar_admin` (the tenant's content-authoring authority) +
// `super_admin` (auto-derived). `media_comms` is NOT granted in v1 (PO-confirmed 2026-07-30: pariwar_admin only;
// media_comms stays dormant until a follow-up grant). `district_admin` is DEFERRED — a `district`-ceiling grant
// can NEVER satisfy a pariwar-dimension check (scopeContains denies a target broader than the grant; the ceiling
// check also forbids a district_admin from holding a pariwar-scoped grant), so granting it would seed an
// INERT/false capability — the EXACT [[project_rbac_geo_scope_containment]] asymmetry 10.3/10.4's helpdesk keys
// already encode. NO inert district_admin grant is seeded. NOT step-up-gated (news publish is NOT freeze-firing /
// not in AR-24). The public read surface (apps/public) is UNAUTHENTICATED (FR-74) and never touches this key.
// ACCEPTANCE CONDITION: district_admin news-manage may be enabled only if a post gains a server-derived district
// AND the gate moves to `dimension: 'district'` — not by widening a pariwar gate to a role that cannot satisfy it.
// Bumped 25 → 26 at Story 10.7 (added ONE key): `member.export_roster` — the reports-library member-roster-EXPORT
// READ key (Decision 6). Gates the member-roster report template (a Tier-3-clear + masked-Aadhaar CSV/JSON export).
// DISTINCT from the single-member `member.view_validity` view (exporting a district's-worth of masked roster rows is
// a distinct read authority from viewing one member's validity — the 4.6 read-key-separation precedent). This is a
// district-CAPABLE key: granted to `district_admin` (checked at `dimension: 'district'` against the actor's OWN
// district — an exact-node match the `district` scopeCeiling makes meaningful; NO geo-tree needed, so NOT DEFERRED
// unlike the pariwar-dimension helpdesk/news keys) + `pariwar_admin` (a pariwar grant sees the whole tenant) +
// `super_admin` (auto). This is what makes the reports library's district scope-narrowing (Decision 3) demonstrable.
// The other two v1 seed templates REUSE existing keys (audit_log_query → `audit.export`; contribution_rate_by_district
// → `reconciliation.review`) — no umbrella `reports.generate` key (Decision 6). The DEFERRED `reports.view_pii`-class
// decrypt-if-permitted capability (Decision 2 seam) is NOT minted here — v1 masks, so no PII-decrypt key exists yet.
// Bumped 26 → 27 at Story 10.8 (added TWO keys): `feature_flag.view` + `feature_flag.flip` — the FR-58C
// feature-flag inventory READ and the flag-FLIP WRITE (Decision 7). TWO keys, deliberately NOT one
// `feature_flag.manage` umbrella: prd.md:892 requires the inventory be visible to "Pariwar Admin role and
// above" — a TRANSPARENCY property ("no secret flags") — while flipping a flag is a GOVERNANCE AUTHORITY.
// The visibility requirement is deliberately BROADER than the write requirement, and a single umbrella key
// would collapse "everyone who can see" into "everyone who can flip", destroying exactly the property
// FR-58C names. So: `feature_flag.view` → pariwar_admin + auditor (read-only oversight is the auditor's whole
// role, and an auditor who cannot see which flags are live cannot audit a flag-gated behaviour change);
// `feature_flag.flip` → pariwar_admin only. super_admin auto-derives both.
// BOTH are `dimension: 'pariwar'` (value = scopeTx.pariwarId — the helpdesk.create / news.manage precedent):
// a flag override is a per-TENANT record, and the global catalog rows are a service-pool/seed path that no
// tenant-scoped grant reaches at all. district_admin DEFERRED for BOTH — a district-ceiling grant can never
// satisfy a pariwar-dimension check, so granting it would seed an INERT/false capability (the
// [[project_rbac_geo_scope_containment]] asymmetry that 10.3 / 10.4 / 10.5's pariwar-dimension keys already
// encode; contrast 10.7's `member.export_roster`, which is district-DIMENSION and therefore genuinely
// district-capable). ACCEPTANCE CONDITION: district_admin feature-flag access may be enabled only if a flag
// override gains a server-derived district scope AND the gate moves to `dimension: 'district'` — never by
// widening a pariwar gate to a role that cannot satisfy it. NOT step-up-gated (a flag flip is not
// freeze-firing / not in AR-24); its accountability comes from the mandatory `rationale` + the §1.5
// hash-chain audit line on every flip (AC3), not from re-authentication.
// Bumped 27 → 28 at Story 10.9 (added ONE key): `banner.manage` — the FR-58B Banner/Popup admin WRITE +
// READ gate. Gates every admin banner route (GET/POST/PATCH …/p/:pariwarId/banners[/…] — list/create/
// update/publish/retract + detail). Checked at `dimension: 'pariwar'` (value = scopeTx.pariwarId — the
// helpdesk.create / news.manage / feature_flag.* pariwar-wide-key precedent; a banner is Pariwar-scoped
// and the tenant IS the target, resolvable TODAY with no geo-tree). ONE key, not a `banner.view`/
// `banner.manage` split: UNLIKE 10.8's flags there is no transparency property forcing the read to be
// broader than the write (nothing in FR-58B says a banner inventory must be visible to a role that may
// not author one), so a split would be capability surface with no requirement behind it — the 10.5
// one-key posture, not the 10.8 two-key one. Granted to `pariwar_admin` (the tenant's content-authoring
// authority, the same holder as `news.manage`) + `super_admin` (auto-derived). `district_admin` is
// DEFERRED — a `district`-ceiling grant can NEVER satisfy a pariwar-dimension check (scopeContains
// denies a target broader than the grant; the ceiling check also forbids a district_admin from holding
// a pariwar-scoped grant), so granting it would seed an INERT/false capability — the EXACT
// [[project_rbac_geo_scope_containment]] asymmetry 10.3 / 10.4 / 10.5 / 10.8's pariwar-dimension keys
// already encode (contrast 10.7's `member.export_roster`, which is district-DIMENSION and therefore
// genuinely district-capable). NO inert district_admin grant is seeded. NOT step-up-gated (publishing a
// banner is NOT freeze-firing and is NOT in the AR-24 step-up list; its accountability is the mandatory
// non-author tone-review sign-off + the §1.5 audit line on every create/edit/publish/retract).
// The MEMBER routes (`GET/POST …/p/:pariwarId/member/banners[…]`) deliberately touch NO key at all —
// they are `requireMemberSession`-gated with the member JWT as the tenancy authority (the 10.2
// member-helpdesk precedent), so a member never needs, and can never hold, an RBAC grant.
// ACCEPTANCE CONDITION: district_admin banner-manage may be enabled only if a banner gains a
// server-derived district AND the gate moves to `dimension: 'district'` — never by widening a pariwar
// gate to a role that cannot satisfy it.
// Bumped 28 → 29 at Story 10.12 (added TWO keys): `pariwar.view_custom_fields` +
// `pariwar.manage_custom_fields` — the FR-54 per-Pariwar custom-field definition READ and the
// publish/retire WRITE (+ the member value read/write). Gates every route under
// …/p/:pariwarId/custom-fields. They join the existing `pariwar.*` family (pariwar.configure_channels /
// declare_degraded_mode / amend_rule / provision) because what is being configured IS the Pariwar's own
// data shape — not a member, a claim or a pool.
// TWO keys, deliberately NOT one `pariwar.manage_custom_fields` umbrella — the 10.8 doctrine applies
// with full force: "⚠ THE READ/WRITE KEY SPLIT IS THE POINT … If these ever collapse to one key, the
// transparency property goes with it." A custom-field definition set is the tenant's DATA CONTRACT:
// anyone auditing what a Pariwar collects about its members must be able to READ the definitions
// without holding the authority to change them. So: `pariwar.view_custom_fields` → pariwar_admin +
// auditor (a Pariwar-authored field is exactly the kind of runtime-declared data collection an auditor
// exists to see, and one whose PII tier they must be able to check); `pariwar.manage_custom_fields` →
// pariwar_admin only. super_admin auto-derives both.
// BOTH are `dimension: 'pariwar'` (value = scopeTx.pariwarId — the helpdesk.create / news.manage /
// feature_flag.* / banner.manage pariwar-wide-key precedent): a custom-field definition is a per-TENANT
// record, the tenant IS the target, and it is resolvable TODAY with no geo-tree.
// ⚠ `district_admin` is NOT granted, and this is the re-learned finding, not an omission. A
// `district`-ceiling grant can NEVER satisfy a pariwar-dimension check (scopeContains denies a target
// broader than the grant; the ceiling check also forbids a district_admin from holding a pariwar-scoped
// grant), so granting it would seed an INERT/false capability — the exact
// [[project_rbac_geo_scope_containment]] asymmetry recorded at Story 10.3 and re-encoded at 10.4 / 10.5 /
// 10.8 / 10.9. `state_trustee` is excluded for the SAME structural reason in the other direction (its
// 'state' ceiling is BROADER than 'pariwar', and containment is asymmetric in EITHER direction).
// NOT step-up-gated (publishing a field definition is not freeze-firing and is not in the AR-24 list);
// accountability is the §1.5 hash-chain audit line on every publish/retire plus the append-only
// registry row itself, which is a stronger record than a re-authentication prompt.
// ACCEPTANCE CONDITION for district_admin: a custom-field definition gains a server-derived district AND
// the gate moves to `dimension: 'district'` — never by widening a pariwar gate to a role that cannot
// satisfy it.
// ── Bumped 29 → 30 at Story 10.18 (added ZERO keys) ──────────────────────────────────────────────
// ⚠ THIS IS A DELIBERATE DEVIATION FROM EVERY PRIOR BUMP IN THIS CHANGELOG, and it is recorded as a
// deviation rather than taken silently. All 29 prior bumps MINTED A PERMISSION KEY. This one mints a
// ROLE — `trustee_panel`, the 13th seeded bundle (Story 10.18, Niyamavali §8.7, Decision
// `2026-08-10-096`) — and reuses the existing `member.moderate` key. **`PERMISSION_CATALOG.keys` stays
// at 40**, and `permissions.test.ts`'s `toHaveLength(40)` is unchanged; if that number ever moves in
// this story, a key was minted and the story has exceeded its scope.
// WHY BUMP AT ALL, when no key changed: the catalog version is the version of the CAPABILITY MODEL, not
// a count of keys. A consumer caching authorization decisions keyed on `catalogVersion` must see the
// model move when a new role can hold an existing key — otherwise a `trustee_panel` grant resolves
// against a cache built when no such role existed. `epics.md`'s instruction ("the catalog bumps … with
// the seeded role") is unconditional and does not condition the bump on a key being minted.
// ⚠ The consequence a later reader must not mis-derive: **catalog version is no longer a proxy for key
// count.** Before 10.18 the two moved together, so `version - 1 ≈ keys` was accidentally close enough to
// look like an invariant. It is not one, and from here the two diverge permanently.
// NO new key, NO new handle, NO route change, NO migration (`role_grants.role` is plain `text`, not a
// pgEnum, precisely so the seeded set can change without one).
// Bumped 30 → 31 at Story 10.19 (added `member.restore_terminated` — restoring a TERMINATED member
// is an act of the Trustee Panel under Niyamavali §8.4, ratified as Q1 option (a) in Decision
// `2026-08-10-097` clause 1). This bump is a RETURN TO THE NORMAL SHAPE after 10.18's deliberate
// deviation above: it mints a key, so `PERMISSION_CATALOG.keys` moves 40 → 41 and
// `permissions.test.ts`'s length assertion moves with it. The reuse-check that ruled out
// `member.moderate` is recorded at the key itself.
// ── Bumped 31 → 32 at Story 6.17 (added ZERO keys) ───────────────────────────────────────────────
// The SECOND bump in this changelog that mints no permission key — and it applies, verbatim, the
// rule 10.18 wrote down above: **the catalog version is the version of the CAPABILITY MODEL, not a
// count of keys. A consumer caching authorization decisions keyed on `catalogVersion` must see the
// model move WHEN A NEW ROLE CAN HOLD AN EXISTING KEY** — otherwise a `block_admin` conduct grant
// resolves against a cache built when no such holder existed. Story 6.17 grants the EXISTING
// `claim.conduct_ground_inspection` key to the EXISTING `block_admin` role (Decision
// `2026-08-13-104`, D5), so the model moves and the key set does not.
// ⛔ **`PERMISSION_CATALOG.keys` stays at 41**, and `permissions.test.ts`'s `toHaveLength(41)` is
// unchanged; if that number moves in this story, a key was minted and the story exceeded its scope.
// ⚠ SUPERSEDED AS A STANDING RULE BY STORY 10.21 ([[feedback_supersede_never_reinterpret]] — superseded
// in place, not deleted). The sentence above was **Story 6.17's own scope bound**, correct for 6.17 and
// never a standing invariant of this catalog. Story 10.21 mints `member.data_rights`, so the count moves
// 41 → 42 legitimately. Read the line above as historical: it constrained 6.17, and it constrains nothing
// after it.
// ⛔ NO new key, NO new role, NO route addition, NO migration to `role_grants` (`role` is plain
// `text`). The migration this story DOES carry (`0102`) adds a column to `claim_ground_inspections`
// — a RESOURCE attribute, not a capability one.
// ── Bumped 32 → 33 at Story 10.21 (added ONE key) ────────────────────────────────────────────────
// `member.data_rights` — the off-portal DPDPA FULFILMENT key (Niyamavali §8.4's "identity-verified
// administrative process"). A RETURN TO THE NORMAL SHAPE after 6.17's key-less bump: it mints a key, so
// `PERMISSION_CATALOG.keys` moves 41 → 42 and `permissions.test.ts`'s length assertion moves with it.
// ⚠ This is the bump that supersedes 6.17's "stays at 41" scope note above.
// ── Bumped 33 → 34 at Story 10.22 (added ONE key) ────────────────────────────────────────────────
// `member.decide_moderation_appeal` — DECIDING a moderation appeal under Niyamavali §8.8 (Decision
// `2026-08-15-121` clause 14). Mints a key, so `PERMISSION_CATALOG.keys` moves 42 → 43 and
// `permissions.test.ts`'s length assertion moves with it.
// ⚠ Catalog version is NOT a proxy for key count — 10.18 and 6.17 both bumped while minting zero keys.
// Move the length assertion only when a key is actually minted, as it is here.
// ── Bumped 34 → 35 at Story 10.13 (added ZERO keys) ─────────────────────────────────────────────
// `trustee_panel`, an EXISTING role, gains the EXISTING `pool.fixed_amount_set` +
// `pool.fixed_amount_emergency` keys (Decision `2026-08-16-123` clause 1 — the Deed vests amount-fixing
// in the BOARD, Cl. 10(b)/20(c) + Niyamavali §4.2, and Story 7.5 shipped it on `pariwar_admin` alone).
// So the CAPABILITY MODEL moves and the key set does not: `PERMISSION_CATALOG.keys` stays at 43 and
// `permissions.test.ts`'s `toHaveLength(43)` is UNCHANGED. This is the THIRD application of that rule
// (10.18 minted a role and no key; 6.17 gave an existing role an existing key) — and the third proof
// that catalog version is not a proxy for key count.
// ⚠ `pariwar_admin` RETAINS both keys — concurrent, not exclusive (§8.7). This is the first
// `trustee_panel` grant that is NOT exclusive to that bundle; see roles.ts for why that distinction
// is load-bearing against the 10.19/10.22 notes.
// ⛔ NO new key, NO new role, NO migration. `pool.fixed_amount_emergency` additionally becomes the
// emergency attesting-panel eligibility credential (clause 2) — a consumer of the key, not a change to it.
// ── Bumped 35 → 36 at Story 10.15 (added ONE key: 43 → 44) ─────────────────────────────────────
// `survey.manage` — the FR-58 Survey/Poll admin WRITE + READ gate. Gates every admin survey route
// (GET/POST/PATCH …/p/:pariwarId/surveys[/…] — list/create/update/publish/close + detail + the
// aggregate + the free-text read). Checked at `dimension: 'pariwar'` (value = scopeTx.pariwarId — the
// helpdesk.create / news.manage / feature_flag.* / banner.manage pariwar-wide-key precedent; a survey
// is Pariwar-scoped, the tenant IS the target, and it is resolvable TODAY with no geo-tree).
// ⭐ BOTH NUMBERS SAID EXPLICITLY, because catalog version is NOT a proxy for key count (10.18, 6.17
// and 10.13 each bumped the version while minting ZERO keys): the version moves 35 → 36 AND
// `PERMISSION_CATALOG.keys` moves 43 → 44, so `permissions.test.ts`'s length assertion moves too.
// ONE key, not a `survey.view`/`survey.manage` split: UNLIKE 10.8's flags there is no transparency
// property forcing the read broader than the write — nothing in FR-58 says a survey inventory or its
// results must be visible to a role that may not author one. A split would be capability surface with
// no requirement behind it (the 10.5/10.9 one-key posture, not the 10.8 two-key one).
// ⚠ The read this key gates includes the AGGREGATE and the UNATTRIBUTED FREE TEXT. That is not a
// widening: the free-text projection carries no member id, no row id and no ordinal (Story 10.15
// LBD-3), so holding this key confers no ability to learn who said what. If a "who answered" view is
// ever wanted it is a NEW key on a NEW story with a DPDPA consent question attached — ⛔ never a
// widening of this one.
// Granted to `pariwar_admin` (the tenant's content-authoring authority, the same holder as
// `news.manage` and `banner.manage`) + `super_admin` (auto-derived). `state_trustee` is excluded for
// the containment asymmetry in the other direction. `district_admin` is DEFERRED — a
// `district`-ceiling grant can NEVER satisfy a pariwar-dimension check (scopeContains denies a target
// broader than the grant; the ceiling check also forbids a district_admin from holding a
// pariwar-scoped grant), so granting it would seed an INERT/false capability — the EXACT
// [[project_rbac_geo_scope_containment]] asymmetry 10.3 / 10.4 / 10.5 / 10.8 / 10.9's
// pariwar-dimension keys already encode. NO inert district_admin grant is seeded.
// NOT step-up-gated (publishing a survey is NOT freeze-firing and is NOT in the AR-24 step-up list;
// its accountability is the mandatory non-author tone-review sign-off + the §1.5 hash-chain audit line
// on every create/edit/publish/close, plus a `survey.responses_viewed` line on every free-text read).
// The MEMBER routes (`GET/POST …/p/:pariwarId/member/surveys[…]`) deliberately touch NO key at all —
// they are `requireMemberSession`-gated with the member JWT as the tenancy authority (the 10.2
// member-helpdesk / 10.9 member-banner precedent), so a member never needs, and can never hold, an
// RBAC grant to answer a survey.
// ACCEPTANCE CONDITION: district_admin survey-manage may be enabled only if a survey gains a
// server-derived district AND the gate moves to `dimension: 'district'` — never by widening a pariwar
// gate to a role that cannot satisfy it.
// ── Bumped 36 → 37 at Story 11a.1 (added ONE key: 44 → 45) ──────────────────────────────────────
// `pariwar.manage_public_name_presentation` — the per-Pariwar PUBLIC-NAME PRESENTATION MODE write
// key (`full_name` | `shielded_name`). Checked at `dimension: 'pariwar'` (value = scopeTx.pariwarId
// — the helpdesk.create / news.manage / feature_flag.* / banner.manage / survey.manage precedent).
//
// ⭐ THE INTERESTING PART IS WHO DOES **NOT** HOLD IT: `pariwar_admin` is DELIBERATELY EXCLUDED,
// and that exclusion is the ruling rather than an oversight. Every other pariwar-dimension content
// key in this catalog (news.manage, banner.manage, survey.manage, pariwar.manage_custom_fields)
// names `pariwar_admin` as its sole non-super_admin holder, because those are the tenant's own
// content and its own data shape. This one is not: Decision `2026-08-19-136` cl.3 states that
// changing the public name form is a GOVERNED ACT, ⛔ "not a casual Pariwar-Admin toggle" — the
// authority that ruled full names would be published is the Trustee Panel, so the authority to
// change that form is theirs too. `super_admin` (which carries the whole catalog) is therefore the
// ONLY holder, mirroring `2026-08-19-133` cl.2's reservation of directory-attribute creation and
// material redefinition to Super Admin / the Trustee Panel.
// ⛔ Granting this to pariwar_admin "for symmetry" with the other content keys would reverse a
// ratified ruling by way of a catalog edit. It requires its own Panel decision, not a tidy-up.
//
// `district_admin` DEFERRED and `state_trustee` excluded for the usual structural reason, in both
// directions: a `district` ceiling can never satisfy a pariwar-dimension check, and a `state`
// ceiling is broader than the gate's dimension — either grant would be INERT
// ([[project_rbac_geo_scope_containment]]).
// NOT step-up-gated. Accountability is the REQUIRED rationale + actor + display snapshot on the
// config row and the §1.5 hash-chain audit line (kyc/presentation-policy.ts refuses a write
// carrying neither). ⛔ No self-serve admin toggle UI ships in Story 11a.1.
// The PUBLIC read (apps/public, unauthenticated) touches NO key — it reads the resolved mode to
// render a name, exactly as it reads any other public config.
// ACCEPTANCE CONDITION for pariwar_admin: a Panel ruling superseding `-136` cl.3. ⛔ Never a
// consistency argument from the neighbouring keys.
// ── Bumped 37 → 38 at Decision 2026-08-21-145 cl.5 — added ONE key: 45 → 46 ─────────
// `pariwar.manage_directory_publication` — the per-Pariwar DIRECTORY-PUBLICATION kill switch write
// key. Checked at `dimension: 'pariwar'` (value = scopeTx.pariwarId — the
// pariwar.manage_public_name_presentation precedent, same mechanism, same reasoning).
// ⭐ Granted to `super_admin` ONLY — this is a legal/privacy kill switch tied to DPDPA review
// status (`-136` cl.5, still open) and a Niyamavali amendment still in draft, not a tenant content
// preference. NOT step-up-gated; accountability is the required rationale + actor + display
// snapshot + §1.5 audit line, which the write path refuses to skip. The unauthenticated public
// read touches NO key. district_admin / state_trustee excluded (inert in both directions, the
// usual [[project_rbac_geo_scope_containment]] reason).
// ⭐ THE ADMIN UI SHIPS AT STORY 10.30 (Decision `2026-08-21-148`): a super_admin reads and flips
// this switch from `/p/$pariwarId/directory-publication`, both directions, with a required
// rationale — ⛔ no database access, which `2026-08-21-147` cl.1(c) withdrew as an acceptable answer.
// ⛔⛔ AND THE SWITCH IS **STILL NOT AN OPERATIONAL CONTROL** — Decision `2026-08-21-146` cl.5
// (Trustee-ratified). ⚠ Read that as its own sentence: what changed is that a UI now EXISTS; what
// did ⛔ NOT change is the switch's status. The "therefore" that once joined them is the part that
// broke. That status turns on the ≥2-trustee ratification launch-gate Row 17 requires — ⛔ NOT on
// the UI existing — and until that Decision lands the row stays `open` and the public Member
// Directory ⛔ may not go live. ⛔ Direct database manipulation still MUST NOT be described as
// normal manual operation. ⚠ This is a DIRECTIVE, ⛔ not the "ungated by UI, mirroring 11a.1's
// posture" framing that stood here — 11a.1's posture was not ruled on; this one was.
// ── Bumped 38 → 39 at Story 11b.3a / Decision 2026-09-02-183 cl.1-3 — added ONE key: 46 → 47 ──
// `pariwar.manage_nominee_bank_masking` — the per-Pariwar NOMINEE-BANK MASKING SCHEDULE write key.
// Checked at `dimension: 'pariwar'` (value = scopeTx.pariwarId — the
// pariwar.manage_public_name_presentation / pariwar.manage_directory_publication precedent, same
// mechanism, same reasoning).
//
// ⭐ Granted to `super_admin` ONLY, and that is a RULING rather than an authoring choice.
// `2026-09-02-178` (Trustee Panel, Dhiraj Rahul + Kalpana Bharti): `2026-08-28-160` cl.10(b)'s
// *"Trust-Admin controlled, per Pariwar"* spoke to **AUTHORITY** and means the **TRUST**, ⛔ NOT a
// Pariwar Admin. `2026-08-19-136` cl.3's two-axis separation is FOLLOWED, ⛔ not departed from: the
// knob is **per-Pariwar in SCOPE, central in AUTHORITY** — exactly like the public-name control, so
// the two are now ALIGNED rather than divergent.
// ⛔⛔ `pariwar_admin` is **FORECLOSED**. Granting it "for symmetry" with the neighbouring
// pariwar-dimension content keys is precisely the *"reverse a ratified ruling by way of a catalog
// edit"* move the presentation key's own note warns about — it would need its own Panel decision.
// ⛔ NOT district_admin / state_trustee — inert in both directions (a district ceiling cannot satisfy
// a pariwar check; a state ceiling is broader than the gate) [[project_rbac_geo_scope_containment]].
//
// ⚠⛔ A NEW KEY, ⛔ NOT AN OVERLOAD OF `pariwar.manage_public_name_presentation` — `2026-09-02-183`
// cl.1. The two are the same CLASS under the same AUTHORITY (`-178` cl.2) but are DIFFERENT GOVERNED
// ACTS: the form a member's name takes on a public page, versus how long a family's bank account
// number stays visible after a drive closes. One key meaning two unrelated things is the drift a
// catalog exists to prevent, and that key's doc-block forbids widening it "for symmetry".
// ⭐ They CROSS-REFERENCE (see the note above this one) — that is the correct relationship.
//
// NOT step-up-gated. Accountability is the REQUIRED rationale + actor + display snapshot on the
// schedule row + the §1.5 hash-chain audit line, which
// `packages/domain/src/claim/nominee-bank-masking-policy.ts` refuses to skip. The UNAUTHENTICATED
// public read (apps/public → apps/api) touches NO key: it resolves the effective window to decide a
// projection, exactly as it reads any other public config.
// ⭐ THE ADMIN UI SHIPS WITH THE KEY, at `/p/$pariwarId/nominee-bank-masking` (Story 11b.3a AC5) —
// ⚠ the project's FIRST self-serve presentation-toggle UI (11a.1 shipped none, by design).
// ⚠⛔ AND A CHANGE IS ⛔ NOT IMMEDIATE: the public page is edge-cacheable at `s-maxage=300`, so the
// previous projection — which may be a FULL ACCOUNT NUMBER — keeps being served from every warm PoP
// for up to five minutes. ⛔ Direct SQL is NOT the operational fallback.
// ACCEPTANCE CONDITION for pariwar_admin: a Panel ruling superseding `2026-09-02-178`. ⛔ Never a
// consistency argument from the neighbouring keys.
export const PERMISSION_CATALOG_VERSION = 39 as const;

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
  // ⚠ DEPRECATED at Story 10.18 — SUCCESSOR: `member.moderate`. NOT REMOVED.
  // The key STAYS enforceable and all four existing grants are honoured; removal is a separate,
  // later catalog bump taken only once no live grant references it (no story owns that yet — see
  // the deprecation block below). It is checked by ZERO production call sites today: the moderation
  // routes gate on `member.moderate`. Machine-readable via `DEPRECATED_PERMISSION_KEYS` /
  // `isDeprecatedKey()` below — a comment cannot fail CI, and AC6 requires an assertion.
  'member.suspend',
  'member.moderate',
  // Story 10.19 — restoring a TERMINATED member, which Niyamavali §8.4 makes an act of the Trustee
  // Panel and not the ordinary §8.3 "Trustee discretion" by which a SUSPENDED member is restored.
  // Ratified as Q1 option (a), Decision `2026-08-10-097` clause 1 — the discharge of a question on
  // its SECOND deposit.
  //
  // ── The reuse-check, recorded because this catalog requires one ────────────────────────────────
  // `member.moderate` CANNOT express this: `pariwar_admin` and `trustee_panel` both hold it
  // (roles.ts:255, :591), which is exactly the indistinguishability Story 10.18 existed to end. A
  // check on it would pass for either holder, so the Panel-exclusivity §8.4 now states would be
  // enforced by convention alone — the condition 10.18 closed, reopened one story later.
  // `member.suspend` is DEPRECATED and points at `member.moderate`. No other `member.*` key names a
  // restoration authority. ⇒ a new key is the only faithful expression.
  //
  // ⚠ EXCLUSIVITY IS THE POINT, and it is narrow. This gates ONLY `restore` FROM `terminated`.
  // Restoring a SUSPENDED member stays on the single-actor `member.moderate` path — §8.3 is
  // untouched, and Panel authority under Part 8 remains CONCURRENT everywhere else (§8.7; Decision
  // `2026-08-10-096` clause 3). Widening this key's check site would silently convert a concurrent
  // authority into an exclusive one across all of Part 8.
  'member.restore_terminated',
  // Story 10.22 — DECIDING a moderation appeal under Niyamavali §8.8, ratified by Decision
  // `2026-08-15-121` clause 14 (Q8 option (a): "create a separate permission for deciding moderation
  // appeals"). ⚠ The Panel ruled THAT a key be minted, not WHICH — this NAME is `[Author-committed]`
  // (`2026-08-15-121` clause 18).
  // ⚠ The routing note proposed `member.moderation_appeal.decide`. That name is INVALID under this
  // catalog's own shape rule: `PERMISSION_KEY_REGEX` (`^[a-z0-9_]+\.[a-z0-9_]+$`) admits exactly ONE
  // dot, so `permissionKey()` throws on a three-segment key. Corrected to the `<resource>.<verb>_<object>`
  // shape `member.restore_terminated` already uses. Recorded rather than silently swapped, because the
  // note's name is quoted in a committed governance artifact.
  //
  // ── The reuse-check, recorded because this catalog requires one ────────────────────────────────
  // `member.moderate` CANNOT express this, and the reason is the whole point of §8.8: it is held by
  // `pariwar_admin` (roles.ts:262) AND `trustee_panel` (roles.ts:636), so a check on it cannot
  // distinguish the APPELLATE authority from the authority that DECIDED. That is precisely the
  // indistinguishability Story 10.18 existed to end, and reusing it here would reopen it at the one
  // call site where the separation is the entire mechanism.
  // `verifier` (roles.ts:519) also holds `member.moderate`, but as a documented, deliberately-INERT
  // grant (`district` ceiling; Decision `2026-08-10-096` clause 7) — it could not satisfy a
  // `pariwar`-dimension check either, so it is not an alternative.
  // `member.restore_terminated` is the wrong key in the other direction: it gates PERFORMING a
  // restore, and §8.8 makes an allowed appeal DIRECT one rather than perform it. Gating the appeal on
  // it would merge the two acts the ruling separates.
  // `member.suspend` is DEPRECATED and points at `member.moderate`. ⇒ a new key is the only faithful
  // expression.
  //
  // ⛔ `state_trustee` and `district_admin` CANNOT hold this key, and not by oversight: GEO_RANK
  // (scope.ts:59-70) makes `pariwar` = 1 broader than `state` = 2, and `scopeWithinCeiling` is a PURE
  // NUMERIC COMPARE with no resolver parameter, so `1 >= 2` is false. A grant to either would be
  // INERT ON ARRIVAL — the Story 10.3 lesson. Story 1.18's resolver has landed and does not change
  // this; the constraint is the ordering, not the absence.
  'member.decide_moderation_appeal',
  // Story 10.21 — the off-portal DPDPA data-rights FULFILMENT key. Gates the identity-verified
  // administrative process Niyamavali §8.4 requires for a member whose authenticated access has ended:
  // building the access/portability artifact off-session, and executing erasure, on a member with NO
  // session. Checked at `dimension: 'pariwar'` (a data-rights request is Pariwar-scoped and the tenant IS
  // the target — the `helpdesk.create` / `helpdesk.respond` pariwar-wide-key precedent).
  //
  // ── The separation this key EXISTS to express (AC3) ────────────────────────────────────────────────
  // Filing a data-rights request and EXECUTING it on a member with no session are different authorities.
  // Intake rides the existing `helpdesk.create` (Story 10.3), which `helpline_operator` holds.
  // ⛔ `helpline_operator` is deliberately NOT granted this key: the operator FILES but does not EXECUTE.
  //
  // ⛔ `district_admin` is NOT granted — a district-ceiling grant cannot satisfy a `pariwar`-dimension
  // check. This is the ALREADY-RULED containment result recorded for `helpdesk.respond`
  // ([[project_rbac_geo_scope_containment]]), not an oversight. Do not "fix" it.
  // ⛔ `state_trustee` is NOT granted, for the SAME structural reason in the other direction (its `state`
  // ceiling is BROADER than `pariwar`, and containment is asymmetric in EITHER direction).
  // ⛔ No `dpo` role is minted. FR-99 activates at the MeitY threshold and DPO appointment is OQ-7 (open);
  // minting a bundle for an unconstituted body seeds an INERT capability (the Story 10.18 lesson). The
  // DPO is the intended future holder of this key — recorded here as a comment, not as a bundle.
  //
  // ⭐ SETTLED — Decision `2026-08-14-109` clause 7 RULED Escalation 10 (raised by `2026-08-14-107`):
  // *"NO DPDPA ACTION INHERENTLY REQUIRES TRUSTEE PANEL AUTHORITY"* — not access, not portability, not
  // correction, and not erasure of a terminated member; its adjacency to the Panel-exclusive
  // `member.restore_terminated` does not carry Panel exclusivity across. Story 10.21's AC-R3 closed
  // with a recorded disposition and NO code changes.
  // ⛔ Do NOT grant this key to `trustee_panel` — the exclusion is now RULED ("ruled: not required"),
  // not pending a ruling, and reversing it would require SUPERSEDING `109`
  // ([[feedback_supersede_never_reinterpret]]). The Trustee Panel holds governance authority and no
  // operational queue: `trustee_panel` (roles.ts) holds no helpdesk capability at all.
  // STEP-UP: gated behind a DISTINCT step-up context (`DATA_RIGHTS_STEP_UP_CONTEXT`), so no other
  // elevation satisfies it and vice-versa.
  'member.data_rights',
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
  // `state`-ceiling grant could not satisfy a district-dimension check without a resolver proving
  // state→district ancestry). ✅ RESOLVED at Story 1.18 — that resolver now exists (ADR-0038), so a
  // state-held grant reaches a district target wherever the Pariwar has published a tree containing
  // that edge. ⛔ Still no `state_trustee` grant for this key: the resolver changed reachability, not
  // role composition. ⚠ The 6.7 block_admin case was NOT the same deferral and is NOT resolved by
  // this — it is rank order (see the `claim.conduct_ground_inspection` block above). See roles.ts.
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
  // `pariwar_admin` + `super_admin`. Direct `state_trustee` authorization is RANK-ORDER BLOCKED (scope.ts
  // geo-tree resolver (see the version-bump note above — a `state`-ceiling grant cannot satisfy a
  // §RANK-ORDER — no resolver can lift it; the 6.7/6.10 precedent). v1 actor = pariwar_admin-as-
  // Trustee-Lite. A DELIBERATE deferral, documented so it never reads as an oversight.
  'cycle.freeze',
  // Story 6.14 (D-B) — the R9 special-case panel-voting WRITE key. Gates the R9 voting surface
  // (GET/POST …/admin/r9-voting/{queue,:claimCaseId,open,vote,finalize,cancel,votes-by-trustee}). Checked at
  // `dimension: 'pariwar'` (value = scopeTx.pariwarId — the cycle.freeze pariwar-wide-key precedent; NO
  // server-derived district). Granted to `pariwar_admin` + `super_admin`. Direct `state_trustee` gating is
  // RANK-ORDER BLOCKED, scope.ts §RANK-ORDER (the 6.13 D-B precedent). This key is ALSO the panel-membership
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
  // step-up-gated (`appeal_stage3_decide`). Direct state_trustee gating RANK-ORDER BLOCKED (§RANK-ORDER).
  'claim.appeal_final',
  // Story 7.5 (FR-15) — the STANDARD (90-day-notice) fixed-amount change WRITE key. Gates
  // GET/POST …/admin/pool-fixed-amount + POST …/admin/pool-fixed-amount/schedule. Checked at
  // `dimension: 'pariwar'` (value = scopeTx.pariwarId — the cycle.freeze / claim.r9_vote pariwar-wide-key
  // precedent; the fixed amount is a Pariwar-wide policy). Granted to `pariwar_admin` (+ super_admin).
  'pool.fixed_amount_set',
  // Story 7.5 (FR-15) — the EMERGENCY adjustment override WRITE key. Gates
  // POST …/admin/pool-fixed-amount/emergency (ADDITIONALLY step-up-gated at the route — governance posture
  // equivalent to R9 WITHOUT the R9 voting lifecycle). Also `dimension: 'pariwar'`. Granted to `pariwar_admin`
  // (+ super_admin). Direct state_trustee gating RANK-ORDER BLOCKED (scope.ts §RANK-ORDER; see the bump note).
  'pool.fixed_amount_emergency',
  // Story 9.8 (FR-50) — the reconciliation review-queue READ + four action WRITEs (confirm/reject/
  // facilitate-recovery/review-and-reverse) gate. Gates GET/POST …/admin/reconciliation-review/* (the queue,
  // the case detail, and the four action routes). Checked at `dimension: 'pariwar'` (value = scopeTx.pariwarId
  // — the cycle.freeze / claim.r9_vote pariwar-wide-key precedent; the review queue is Pariwar-wide, NOT
  // district-derived). Granted to `pariwar_admin` (Trustee-Lite) + `finance_officer` (the "designated
  // reconciliation reviewer") + super_admin (auto-derived). Direct `state_trustee` gating RANK-ORDER BLOCKED
  // (Trustee-Lite; see the version-bump note). Each action is ADDITIONALLY step-up-gated (a route concern).
  'reconciliation.review',
  // Story 10.3 (SM-1 C3) — the helpdesk ticket-create WRITE key. Gates the EXISTING 10.1 create route
  // (POST …/p/:pariwarId/helpdesk/tickets — the operator call-to-ticket surface), closing the RBAC gap
  // 10.1's chunk-4 review and 10.2's Dev Notes re-deferred here. Checked at `dimension: 'pariwar'` (value =
  // scopeTx.pariwarId — the reconciliation.review / cycle.freeze pariwar-wide-key precedent; the helpdesk
  // ticket is Pariwar-scoped, the tenant IS the target, resolvable TODAY with no geo-tree). Granted to
  // `helpline_operator` (the SM-1 C3 actor) + `pariwar_admin` (both `pariwar` ceiling); super_admin
  // auto-derives. `district_admin` is DEFERRED (a district-ceiling grant can't satisfy a pariwar check —
  // an inert grant; see the version-bump note + roles.ts). The FIRST helpdesk key. NOT step-up-gated.
  'helpdesk.create',
  // Story 10.4 — the helpdesk RESPONDER-console READ + transition/reply gate (the queue, the admin detail,
  // pick-up/reply/resolve). Gates GET/POST …/p/:pariwarId/helpdesk/{queue,tickets/:ticketId,…}. Checked at
  // `dimension: 'pariwar'` (value = scopeTx.pariwarId — the helpdesk.create precedent). DISTINCT from
  // helpdesk.create (filing ≠ responding). Granted to the default-policy target roles: helpline_operator +
  // finance_officer + it_cell + pariwar_admin (all `pariwar` ceiling); super_admin auto-derives.
  // district_admin DEFERRED (a district-ceiling grant can't satisfy a pariwar check — an inert grant; see the
  // version-bump note + roles.ts). The SECOND helpdesk key. NOT step-up-gated.
  'helpdesk.respond',
  // Story 10.5 (FR-51) — the News/Blog admin WRITE + READ gate (list/create/update/submit/approve/schedule/
  // publish + detail). Checked at `dimension: 'pariwar'` (value = scopeTx.pariwarId — the helpdesk.create /
  // reconciliation.review pariwar-wide-key precedent). ONE key (Decision 2): both author and reviewer hold it;
  // the author≠reviewer rule is an IDENTITY check at the API, not a capability split. Granted to `pariwar_admin`
  // (+ super_admin auto). media_comms NOT granted in v1 (PO-confirmed pariwar_admin-only). district_admin DEFERRED
  // (a district-ceiling grant can't satisfy a pariwar check — inert; see the version-bump note + roles.ts). NOT
  // step-up-gated. The public read (apps/public) is unauthenticated and never touches this key.
  'news.manage',
  // Story 10.7 (FR-58A) — the reports-library member-roster-EXPORT READ key. Gates the member_roster report
  // template (a Tier-3-clear + masked-Aadhaar roster CSV/JSON). Checked at `dimension: 'district'` against the
  // actor's OWN resolved scope (an exact-node match — the `district` scopeCeiling makes it meaningful with NO
  // geo-tree). DISTINCT from `member.view_validity` (exporting a district roster ≠ viewing one member's validity;
  // the 4.6 read-key-separation precedent). Granted to `district_admin` (district scope → sees their district) +
  // `pariwar_admin` (pariwar scope → sees the whole tenant); super_admin auto-derives. The FIRST truly district-
  // capable read key that is NOT deferred (contrast the pariwar-dimension helpdesk/news keys whose district_admin
  // grant would be inert). The other two v1 templates REUSE `audit.export` (audit-log) + `reconciliation.review`
  // (contribution-rate) — no umbrella key (Decision 6).
  'member.export_roster',
  // Story 10.8 (FR-58C) — the feature-flag INVENTORY READ key. Gates GET /api/v1/global/feature-flags
  // (catalog) + GET /api/v1/p/:pariwarId/feature-flags (this tenant's effective flags with global-vs-override
  // provenance) + the flag version history. Checked at `dimension: 'pariwar'` (value = scopeTx.pariwarId — the
  // helpdesk.create / news.manage precedent). Granted to `pariwar_admin` (prd.md:892: "flag inventory is
  // visible to Pariwar Admin role and above") + `auditor` (read-only oversight — an auditor who cannot see
  // which flags are live cannot audit a flag-gated behaviour change); super_admin auto-derives. district_admin
  // DEFERRED (a district-ceiling grant can't satisfy a pariwar check — inert; see the version-bump note +
  // roles.ts). DELIBERATELY BROADER than feature_flag.flip — that asymmetry IS the "no secret flags" property.
  'feature_flag.view',
  // Story 10.8 (FR-58C) — the feature-flag FLIP WRITE key. Gates POST …/p/:pariwarId/feature-flags/:flagKey/
  // versions (create a new immutable version row: state change / cohort change / rollback). Checked at
  // `dimension: 'pariwar'`. Granted to `pariwar_admin` ONLY (+ super_admin auto) — NOT auditor: read-only
  // oversight must not carry a production-behaviour-changing authority. NARROWER than feature_flag.view by
  // design (Decision 7). Every flip carries a REQUIRED bounded `rationale` + a §1.5 hash-chain audit line
  // (AC3). NOT step-up-gated. district_admin DEFERRED for the same inert-grant reason.
  'feature_flag.flip',
  // Story 10.9 (FR-58B) — the Banner/Popup admin WRITE + READ key. Gates every admin banner route
  // (GET/POST/PATCH …/p/:pariwarId/banners[/…] — list/create/update/publish/retract + detail). Checked at
  // `dimension: 'pariwar'` (value = scopeTx.pariwarId — the helpdesk.create / news.manage / feature_flag.*
  // precedent). ONE key, not a view/manage split: unlike 10.8's flags there is no transparency property
  // forcing the read broader than the write (the 10.5 one-key posture). Granted to `pariwar_admin` (the same
  // content-authoring authority that holds news.manage); super_admin auto-derives. district_admin DEFERRED (a
  // district-ceiling grant can't satisfy a pariwar check — inert; see the version-bump note + roles.ts). NOT
  // step-up-gated; accountability is the non-author tone-review sign-off + the §1.5 audit line. The MEMBER
  // banner routes touch NO key — they are member-session-gated (the 10.2 precedent).
  'banner.manage',
  // Story 10.15 (FR-58) — the Survey/Poll admin WRITE + READ key. Gates every admin survey route
  // (GET/POST/PATCH …/p/:pariwarId/surveys[/…] — list/create/update/publish/close + detail, plus the
  // aggregate and the unattributed free-text read). Checked at `dimension: 'pariwar'` (value =
  // scopeTx.pariwarId — the helpdesk.create / news.manage / feature_flag.* / banner.manage precedent).
  // ONE key, not a view/manage split: unlike 10.8's flags there is no transparency property forcing the
  // read broader than the write (the 10.5/10.9 one-key posture). ⚠ The gated read includes the results,
  // but that is NOT a widening — the free-text projection carries no member id, no row id and no
  // ordinal, so this key confers no ability to learn who said what. Granted to `pariwar_admin` (the same
  // content-authoring authority that holds news.manage + banner.manage); super_admin auto-derives.
  // district_admin DEFERRED and state_trustee excluded (a district-ceiling grant can't satisfy a pariwar
  // check, and a pariwar target can't be reached from a broader ceiling — inert either way; see the
  // version-bump note + roles.ts). NOT step-up-gated; accountability is the non-author tone-review
  // sign-off + the §1.5 audit line. ⚠ A survey is ADVISORY and has no governance effect — this key
  // authorises ASKING a question, never deciding anything by the answers. The MEMBER survey routes touch
  // NO key at all — they are member-session-gated (the 10.2 / 10.9 precedent).
  'survey.manage',
  // Story 10.12 (FR-54) — the per-Pariwar custom-field DEFINITION READ key. Gates
  // GET …/p/:pariwarId/custom-fields/definitions (in-force + history) and
  // GET …/p/:pariwarId/custom-fields/members/:memberId/values. Checked at `dimension: 'pariwar'` (value
  // = scopeTx.pariwarId — the helpdesk.create / news.manage / feature_flag.* / banner.manage precedent).
  // Granted to `pariwar_admin` + `auditor` — a Pariwar-authored field is runtime-declared data
  // collection, and an auditor who cannot read the definitions cannot check what a tenant collects or
  // what PII tier it declared. super_admin auto-derives. DELIBERATELY BROADER than
  // pariwar.manage_custom_fields (the 10.8 read/write-split doctrine). district_admin DEFERRED (a
  // district-ceiling grant can't satisfy a pariwar check — inert; see the version-bump note + roles.ts).
  'pariwar.view_custom_fields',
  // Story 10.12 (FR-54) — the per-Pariwar custom-field WRITE key. Gates
  // POST …/p/:pariwarId/custom-fields/definitions/:hostEntity/:fieldKey/versions (publish OR retire —
  // one route, because retirement IS a version) and
  // PUT …/p/:pariwarId/custom-fields/members/:memberId/values. Checked at `dimension: 'pariwar'`.
  // Granted to `pariwar_admin` ONLY (+ super_admin auto) — NOT auditor: read-only oversight must never
  // carry the authority to change the tenant's data contract. NARROWER than pariwar.view_custom_fields
  // by design. Every publish runs the frozen-governance fence + the PII-tier gate and carries a §1.5
  // hash-chain audit line. NOT step-up-gated. district_admin DEFERRED for the same inert-grant reason.
  'pariwar.manage_custom_fields',
  // Story 11a.1 (FR-74 / FR-75) — the per-Pariwar PUBLIC-NAME PRESENTATION MODE write key. Gates the
  // `full_name` ⇄ `shielded_name` flip that governs how every member's name renders on the
  // unauthenticated public Member Directory. Checked at `dimension: 'pariwar'` (value =
  // scopeTx.pariwarId — the news.manage / banner.manage / survey.manage precedent).
  // ⭐ Granted to `super_admin` ONLY — ⛔ NOT `pariwar_admin`, which holds every other pariwar-
  // dimension content key. Decision `2026-08-19-136` cl.3: this is a GOVERNED ACT, "not a casual
  // Pariwar-Admin toggle"; the Trustee Panel ruled that full names are published, so the authority
  // to change that form sits with them. See the version-bump note above — the exclusion IS the
  // ruling, and re-granting it "for symmetry" would reverse a ratified decision by catalog edit.
  // district_admin DEFERRED / state_trustee excluded (inert in both directions). NOT step-up-gated;
  // accountability is the required rationale + actor + display snapshot + §1.5 audit line. The
  // unauthenticated public read touches NO key.
  'pariwar.manage_public_name_presentation',
  // Code review, Story 11a.3 (2026-08-21, D3) — the per-Pariwar DIRECTORY-PUBLICATION kill switch
  // write key. Checked at `dimension: 'pariwar'`, mirroring the presentation key immediately
  // above. Granted to `super_admin` ONLY — see the version-bump note above for the ruling.
  'pariwar.manage_directory_publication',
  // Story 11b.3a (2026-09-02, D8(i) at Decision `2026-09-02-183`) — the per-Pariwar NOMINEE-BANK
  // MASKING SCHEDULE write key. Checked at `dimension: 'pariwar'`, mirroring the two keys immediately
  // above. Granted to `super_admin` ONLY — `2026-09-02-178` ruled `2026-08-28-160` cl.10(b)'s
  // "Trust-Admin controlled" speaks to AUTHORITY and means the Trust; `pariwar_admin` is FORECLOSED.
  // ⭐ A NEW key, ⛔ not an overload of `pariwar.manage_public_name_presentation` — same class, same
  // authority, DIFFERENT governed act. See the version-bump note above for the full reasoning.
  'pariwar.manage_nominee_bank_masking',
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

// ── DEPRECATION (Story 10.18) ─────────────────────────────────────────────────────────────────────
// ⚠ THIS STORY INVENTS THIS CONVENTION. Before 10.18 there was no way to mark a permission key
// deprecated: `SEED_PERMISSION_KEYS` is a flat `as const` tuple of bare string literals with all
// semantics in `//` comments, `PermissionCatalog` is `{ catalogVersion, keys }`, and `RoleBundle` is
// `{ role, permissions, scopeCeiling }`. There was nowhere to hang a flag.
//
// WHY A SIBLING TUPLE rather than restructuring the keys into objects: `SEED_PERMISSION_KEYS` being a
// flat literal tuple is load-bearing — `SeedPermissionKey` derives from it, `PERMISSION_CATALOG.keys`
// maps over it, `permissions.test.ts` compares against it, and the contracts `PermissionCatalogSchema`
// mirrors its shape. Turning it into an object array would break all four. This addition is purely
// additive and breaks nothing.
//
// WHY MACHINE-READABLE: `epics.md:3741-3743` asks for BOTH a declaration-site note AND "a CI assertion
// [that] fails if a new grant appears". A comment satisfies the first and cannot satisfy the second.
// The holder-set gate in `tests/rbac/roles.test.ts` reads this tuple.
//
// ⛔ DEPRECATED ≠ REMOVED. A deprecated key stays in the catalog, stays enforceable, and its existing
// grants stay honoured. Deprecation forbids only NEW grants. Removal is a separate, later catalog bump.

/**
 * Catalog keys that are deprecated in favour of a successor. The key remains in
 * `SEED_PERMISSION_KEYS` and `PERMISSION_CATALOG` — this marks intent, not absence.
 *
 * ⚠ Adding a key here does NOT remove it, does NOT revoke existing grants, and does NOT stop it being
 * enforced. It records that no NEW grant should be added, and gives CI something to assert over.
 */
export const DEPRECATED_PERMISSION_KEYS = [
  // Story 10.18 — superseded by `member.moderate`, the key the moderation routes actually gate on
  // (`apps/api/src/modules/member-moderation/routes.ts`). `member.suspend` has ZERO production call
  // sites and predates the moderation surface; its four grants are honoured but frozen.
  'member.suspend',
] as const satisfies readonly SeedPermissionKey[];

/** The literal union of deprecated keys. */
export type DeprecatedPermissionKey = (typeof DEPRECATED_PERMISSION_KEYS)[number];

/** The successor each deprecated key defers to. Every deprecated key MUST name one. */
export const DEPRECATED_KEY_SUCCESSOR: Readonly<Record<DeprecatedPermissionKey, SeedPermissionKey>> = {
  'member.suspend': 'member.moderate',
};

const DEPRECATED_KEY_SET: ReadonlySet<string> = new Set(DEPRECATED_PERMISSION_KEYS);

/**
 * Is `key` a deprecated catalog key? Accepts a raw string so callers needn't pre-validate.
 *
 * ⚠ This is NOT an authorization predicate and must never gate a check — a deprecated key is still
 * enforceable, and treating `isDeprecatedKey(k)` as "deny" would silently revoke live grants. It exists
 * for CI assertions, tooling, and admin-surface affordances (e.g. hiding a key from a grant picker).
 */
export function isDeprecatedKey(key: string): key is DeprecatedPermissionKey {
  return DEPRECATED_KEY_SET.has(key);
}
