// The 12 seeded role bundles (FR-46) — Story 1.8 substrate (AC-3).
//
// ⚠ PROVISIONAL PENDING OQ-3. The Trustee Panel confirms/revises the 12-role set
// + their permission bundles pre-launch (OQ-3 "Blocks: RBAC seed in production").
// These bundles are the recommended v1 starting point — NOT immutable constants.
// FR-44 requires Super-Admin editability; the `rbac-seed-reset` runbook requires a
// deterministic, re-runnable seed. So the bundles are exposed as DATA
// (`defaultRoleBundles` + `seedRoles()`), never frozen behind a hard-coded gate
// the admin path (Story 1.9+) can never edit.
//
// The matrix is intentionally SPARSE — most permissions don't exist yet (the
// catalog grows per-epic). Empty/sparse rows are CORRECT at 1.8; do NOT pad them
// with invented keys to look complete. Each row = `{ role, permissions, scopeCeiling }`
// where every permission key MUST exist in PERMISSION_CATALOG (a unit test asserts
// referential integrity — tests/rbac/roles.test.ts).

import {
  PERMISSION_CATALOG,
  permissionKey,
  type PermissionKey,
} from './permissions.js';
import type { ScopeDimension } from './scope.js';

/**
 * The 12 seeded role names (FR-46). Stored as `snake_case` strings — these are the
 * `role` value in `role_grants` (a plain `text` column, NOT a pgEnum, precisely so
 * OQ-3 can revise the set without an enum migration; see ADR-0008). The union is a
 * compile-time aid; the DB column trusts the seed/admin layer.
 */
export type SeededRole =
  | 'super_admin'
  | 'pariwar_admin'
  | 'state_trustee'
  | 'district_admin'
  | 'block_admin'
  | 'finance_officer'
  | 'it_cell'
  | 'media_comms'
  | 'field_worker'
  | 'verifier'
  | 'auditor'
  | 'helpline_operator';

/** A declarative role bundle: its permission-key set + its scope ceiling. */
export interface RoleBundle {
  readonly role: SeededRole;
  readonly permissions: readonly PermissionKey[];
  /** The broadest scope the role may be granted at (the role's ceiling). */
  readonly scopeCeiling: ScopeDimension;
}

// Local key handles, validated through the smart constructor so a typo here is a
// load-time throw, not a silent dead key. (Referential integrity to the catalog
// is additionally asserted by tests/rbac/roles.test.ts.)
const CLAIM_APPROVE = permissionKey('claim.approve');
// Story 6.3 — the helpline/operator claim-INTAKE key (distinct from CLAIM_APPROVE).
const CLAIM_FILE = permissionKey('claim.file');
// Story 6.7 — the FR-40 ground-inspection ACTION key + the D6 supervisor-OVERRIDE key.
const CLAIM_CONDUCT_GROUND_INSPECTION = permissionKey('claim.conduct_ground_inspection');
const CLAIM_OVERRIDE_GROUND_INSPECTION = permissionKey('claim.override_ground_inspection');
const MEMBER_SUSPEND = permissionKey('member.suspend');
const MEMBER_MODERATE = permissionKey('member.moderate');
const MEMBER_VIEW_VALIDITY = permissionKey('member.view_validity');
const VALIDITY_INVALIDATE_CACHE = permissionKey('validity.invalidate_cache');
const PARIWAR_CONFIGURE_CHANNELS = permissionKey('pariwar.configure_channels');
const PARIWAR_DECLARE_DEGRADED_MODE = permissionKey('pariwar.declare_degraded_mode');
const PARIWAR_AMEND_RULE = permissionKey('pariwar.amend_rule');
const PARIWAR_PROVISION = permissionKey('pariwar.provision');
const NIYAMAVALI_AMEND = permissionKey('niyamavali.amend');
const NIYAMAVALI_REVIEW = permissionKey('niyamavali.review');
const TC_PUBLISH = permissionKey('tc.publish');
const TC_APPROVE = permissionKey('tc.approve');
const AUDIT_EXPORT = permissionKey('audit.export');
const AUDIT_VERIFY = permissionKey('audit.verify');
// Story 6.8 code review — the nominee-bank tier-1 (ordinary) + tier-2 (correction) keys,
// replacing an initial CLAIM_FILE reuse (see permissions.ts's version-bump note).
const CLAIM_MANAGE_NOMINEE_BANK = permissionKey('claim.manage_nominee_bank');
const CLAIM_CORRECT_NOMINEE_BANK = permissionKey('claim.correct_nominee_bank');
// Story 6.9 (D5a) — the claim-time DPDPA consent REVOCATION key (the RECORD path reuses claim.file).
const CLAIM_MANAGE_DPDPA_CONSENT = permissionKey('claim.manage_dpdpa_consent');
// Story 6.10 — the verifier-console READ key (district-dimension; distinct from the claim.approve WRITE).
const CLAIM_VERIFY = permissionKey('claim.verify');
// Story 6.12 (R6) — the MANUAL shepherd reassignment WRITE key (district-dimension; distinct from
// claim.approve/claim.verify — routing the family's contact grants no adjudication power, AC6).
const CLAIM_ASSIGN_SHEPHERD = permissionKey('claim.assign_shepherd');
// Story 6.13 (D-B) — the State-Trustee cycle-freeze (bulk-approval) WRITE key (pariwar-dimension; the FIRST
// state_trustee-facing surface, gated on pariwar_admin-as-Trustee-Lite pending the Epic-3 geo-tree resolver).
const CYCLE_FREEZE = permissionKey('cycle.freeze');
// Story 6.14 (D-B) — the R9 special-case panel-voting WRITE key (pariwar-dimension; ALSO the panel-membership
// eligibility credential — assertPanelAuthorized requires every panel actor to hold it). Same Trustee-Lite
// posture as cycle.freeze; direct state_trustee gating deferred to Epic 3.
const CLAIM_R9_VOTE = permissionKey('claim.r9_vote');
// Story 6.16 — the internal 3-stage appeal keys. Stage-1 reviewer (district-dimension; the claim.verify
// precedent); Stage-2 panel voter (pariwar-dimension; ALSO the panel-membership eligibility credential, the
// claim.r9_vote precedent); Stage-3 Trustee discretion (pariwar-dimension, RESOLVED v1). Same Trustee-Lite
// posture — direct state_trustee gating for the pariwar keys deferred to Epic 3.
const CLAIM_APPEAL_REVIEW = permissionKey('claim.appeal_review');
const CLAIM_APPEAL_VOTE = permissionKey('claim.appeal_vote');
const CLAIM_APPEAL_FINAL = permissionKey('claim.appeal_final');
// Story 7.5 (FR-15) — the fixed-amount schedule keys (both pariwar-dimension; the cycle.freeze / claim.r9_vote
// pariwar-wide precedent). `pool.fixed_amount_set` = the standard (12-month-notice) change; `…_emergency` =
// the emergency override (ALSO step-up-gated at the route). Same Trustee-Lite posture — direct state_trustee
// gating deferred to Epic 3.
const POOL_FIXED_AMOUNT_SET = permissionKey('pool.fixed_amount_set');
const POOL_FIXED_AMOUNT_EMERGENCY = permissionKey('pool.fixed_amount_emergency');
// Story 9.8 (FR-50) — the reconciliation review-queue READ + four action WRITEs gate (pariwar-dimension;
// the cycle.freeze / claim.r9_vote pariwar-wide precedent). Each action is ALSO step-up-gated at the route.
// Granted to pariwar_admin (Trustee-Lite) + finance_officer (the "designated reconciliation reviewer");
// super_admin auto-derives. Direct state_trustee gating deferred to Epic 3.
const RECONCILIATION_REVIEW = permissionKey('reconciliation.review');
// Story 10.3 (SM-1 C3) — the helpdesk ticket-create WRITE key (pariwar-dimension; the reconciliation.review /
// cycle.freeze pariwar-wide precedent — the tenant IS the target, resolvable TODAY with no geo-tree). The
// FIRST helpdesk key. Gates the EXISTING 10.1 create route (the operator call-to-ticket surface). Granted to
// helpline_operator (the SM-1 C3 actor) + district_admin + pariwar_admin; super_admin auto-derives. NOT
// step-up-gated (helpdesk create isn't freeze-firing / not in AR-24 — unlike the 6.3 claim intake).
const HELPDESK_CREATE = permissionKey('helpdesk.create');
// Story 10.4 — the helpdesk RESPONDER-console READ + transition/reply key (pariwar-dimension; the
// helpdesk.create / reconciliation.review pariwar-wide precedent). The SECOND helpdesk key. Gates the queue
// read + the admin detail + pick-up/reply/resolve. DISTINCT from HELPDESK_CREATE (filing ≠ responding).
// Granted to the roles the DEFAULT routing policy routes tickets to — helpline_operator + finance_officer +
// it_cell + pariwar_admin (all `pariwar` ceiling); super_admin auto-derives. district_admin DEFERRED (a
// district-ceiling grant can't satisfy a pariwar check — the HELPDESK_CREATE / state_trustee-at-pariwar
// precedent). NOT step-up-gated (helpdesk responding isn't freeze-firing / not in AR-24).
const HELPDESK_RESPOND = permissionKey('helpdesk.respond');
// Story 10.5 (FR-51) — the News/Blog admin key (pariwar-dimension; the helpdesk.create / reconciliation.review
// pariwar-wide precedent). ONE key (Decision 2): both author and reviewer hold it; author≠reviewer is an
// IDENTITY check at the API, not a capability split. Gates every admin news route. Granted to pariwar_admin
// (the tenant's content-authoring authority) + super_admin (auto). media_comms NOT granted in v1 (PO-confirmed
// pariwar_admin-only; media_comms stays dormant). district_admin DEFERRED (a district-ceiling grant can't
// satisfy a pariwar check — the HELPDESK_* / state_trustee-at-pariwar precedent). NOT step-up-gated.
const NEWS_MANAGE = permissionKey('news.manage');

/**
 * The recommended v1 role→permission matrix (provisional pending OQ-3). Roles from
 * FR-46; keys from the v1 catalog; scope = the role's ceiling. Super Admin is the
 * only `global` (cross-Pariwar) role and carries the full catalog.
 */
export const defaultRoleBundles: readonly RoleBundle[] = [
  {
    role: 'super_admin',
    // The only global role: cross-Pariwar, every catalog key. Deriving from the
    // catalog (not a hand-copied list) keeps Super Admin exhaustive as the catalog
    // grows per-epic.
    permissions: PERMISSION_CATALOG.keys,
    scopeCeiling: 'global',
  },
  {
    role: 'pariwar_admin',
    // Story 4.8 code review — the emergency cache "invalidate all" WRITE (AC3) is a PARIWAR-WIDE action
    // (the route's permission check runs at `pariwar` scope dimension), so only a role whose scopeCeiling
    // is `pariwar` or broader can ever satisfy it (`scopeWithinCeiling` fail-closes any narrower-ceiling
    // role, e.g. `state_trustee` at `state`, regardless of what grant row exists for it) — pariwar_admin
    // is this system's pariwar-wide administrative authority, so it (+ super_admin, which carries the full
    // catalog) is the correct holder, not `state_trustee`.
    permissions: [
      PARIWAR_AMEND_RULE,
      MEMBER_SUSPEND,
      MEMBER_MODERATE,
      // Story 4.6 — reads the FR-12A Member Validity payload (admin surfaces).
      MEMBER_VIEW_VALIDITY,
      VALIDITY_INVALIDATE_CACHE,
      // Story 5.3 — the FR-72 per-Pariwar WhatsApp Business config write (a pariwar-wide config action,
      // same ceiling rationale as validity.invalidate_cache).
      PARIWAR_CONFIGURE_CHANNELS,
      // Story 5.8 — the AR-20 degraded-mode declaration write (a pariwar-wide governance action; the AC's
      // "trustees" resolves to pariwar_admin here — state_trustee's `state` ceiling cannot hold a
      // `pariwar`-scoped grant, same rationale as pariwar.configure_channels / validity.invalidate_cache).
      PARIWAR_DECLARE_DEGRADED_MODE,
      CLAIM_APPROVE,
      // Story 6.7 — the D6 supervisor override for ground inspection (author evidence on an
      // assignment you are not the assigned inspector of). A supervisory `pariwar`-ceiling
      // authority above the district inspector; checked at the assignment's district.
      CLAIM_OVERRIDE_GROUND_INSPECTION,
      // Story 6.8 code review — the D3 tier-2 nominee-bank correction escalation (the
      // claim.override_ground_inspection rationale: a supervisor above the routine helpline
      // operator). Checked inside the handler once the claim is confirmed to be in the
      // post-approval correction window; a pure pariwar_admin still cannot reach the route without
      // ALSO holding a claim.manage_nominee_bank grant (this role does not carry that key).
      CLAIM_CORRECT_NOMINEE_BANK,
      // Story 6.9 (D5a) — the DPDPA consent revocation key (a later consent-management action). A
      // supervisor-escalation grant alongside helpline_operator — the claim.correct_nominee_bank /
      // claim.override_ground_inspection shape (both roles hold it), NOT the helpline_operator-only
      // claim.manage_nominee_bank shape.
      CLAIM_MANAGE_DPDPA_CONSENT,
      // Story 6.12 (R6) — the manual shepherd reassignment key (a supervisor-escalation correction path,
      // the claim.correct_nominee_bank / claim.override_ground_inspection shape). Checked at the deceased's
      // server-derived district; grants no adjudication power (AC6).
      CLAIM_ASSIGN_SHEPHERD,
      // Story 6.13 (D-B) — the State-Trustee cycle-freeze (bulk-approval) key. A PARIWAR-WIDE bulk action
      // (checked at `dimension: 'pariwar'` = scopeTx.pariwarId), the exact validity.invalidate_cache /
      // pariwar.configure_channels ceiling rationale (a `pariwar`-ceiling-or-broader role). v1 actor =
      // pariwar_admin acting as Trustee-Lite; direct state_trustee gating is DEFERRED to Epic 3 (see
      // permissions.ts — a `state`-ceiling grant cannot satisfy a pariwar check pre-Epic-3). No inert
      // state_trustee grant is seeded.
      CYCLE_FREEZE,
      // Story 6.14 (D-B) — the R9 special-case panel-voting key. A PARIWAR-WIDE bulk-adjudication surface
      // (checked at `dimension: 'pariwar'`), the exact cycle.freeze ceiling rationale (a `pariwar`-ceiling-
      // or-broader role). v1 actor = pariwar_admin-as-Trustee-Lite; direct state_trustee gating DEFERRED to
      // Epic 3 (see permissions.ts). No inert state_trustee grant is seeded.
      CLAIM_R9_VOTE,
      // Story 6.16 — the Stage-2 State-Trustee appeal panel-voting key + the Stage-3 Trustee discretion key.
      // Both PARIWAR-WIDE bulk-adjudication surfaces (checked at `dimension: 'pariwar'`), the exact
      // cycle.freeze / claim.r9_vote ceiling rationale. v1 actor = pariwar_admin-as-Trustee-Lite; direct
      // state_trustee gating DEFERRED to Epic 3. claim.appeal_vote is ALSO the panel-membership eligibility
      // credential (openAppealPanel's assertPanelAuthorized). No inert state_trustee grant is seeded.
      CLAIM_APPEAL_VOTE,
      CLAIM_APPEAL_FINAL,
      // Story 7.5 (FR-15) — the fixed-amount schedule keys. Both PARIWAR-WIDE policy surfaces (checked at
      // `dimension: 'pariwar'` = scopeTx.pariwarId), the exact cycle.freeze / claim.r9_vote ceiling rationale
      // (a `pariwar`-ceiling-or-broader role). The emergency route is ADDITIONALLY step-up-gated (governance
      // posture equivalent to R9 WITHOUT the R9 voting lifecycle). v1 actor = pariwar_admin-as-Trustee-Lite;
      // direct state_trustee gating DEFERRED to Epic 3. No inert state_trustee grant is seeded.
      POOL_FIXED_AMOUNT_SET,
      POOL_FIXED_AMOUNT_EMERGENCY,
      // Story 9.8 (FR-50) — the reconciliation review-queue key. A PARIWAR-WIDE adjudication surface
      // (checked at `dimension: 'pariwar'` = scopeTx.pariwarId), the exact cycle.freeze / claim.r9_vote
      // ceiling rationale (a `pariwar`-ceiling-or-broader role). Each action is ADDITIONALLY step-up-gated.
      // v1 actor = pariwar_admin-as-Trustee-Lite; direct state_trustee gating DEFERRED to Epic 3. No inert
      // state_trustee grant is seeded.
      RECONCILIATION_REVIEW,
      // Story 10.3 (SM-1 C3) — the helpdesk ticket-create key (pariwar-dimension; the reconciliation.review /
      // cycle.freeze pariwar-wide precedent). pariwar_admin is the tenant's administrative authority and can
      // file a helpdesk ticket on a member's behalf; a `pariwar` scopeCeiling satisfies the pariwar check.
      HELPDESK_CREATE,
      // Story 10.4 — the helpdesk responder-console key (pariwar-dimension). pariwar_admin is the default
      // routing target for `niyamavali-question` + `complaint` and the tenant's administrative authority; it
      // responds to the queue. The `pariwar` scopeCeiling satisfies the pariwar check.
      HELPDESK_RESPOND,
      // Story 10.5 (FR-51) — the News/Blog admin key (pariwar-dimension). pariwar_admin is the tenant's
      // content-authoring authority; a `pariwar` scopeCeiling satisfies the pariwar check. ONE key: this role's
      // members author AND review posts, and the author≠reviewer identity check (not a capability tier) forbids
      // the SAME person doing both (Decision 2). media_comms is NOT granted in v1 (PO-confirmed pariwar_admin-only).
      NEWS_MANAGE,
      NIYAMAVALI_AMEND,
      NIYAMAVALI_REVIEW,
      // Story 2.6 — the Pariwar admin authors + approves T&C versions.
      TC_PUBLISH,
      TC_APPROVE,
    ],
    scopeCeiling: 'pariwar',
  },
  {
    role: 'state_trustee',
    // Story 2.6 — the "Trustee Panel" approves T&C versions (tc.approve). Story 4.6 —
    // reads FR-12A validity + is the ONLY role that sees the pending_concealment_flag
    // (gated by role/scope in the validity service, NOT a second permission key).
    permissions: [CLAIM_APPROVE, MEMBER_SUSPEND, MEMBER_VIEW_VALIDITY, NIYAMAVALI_REVIEW, TC_APPROVE],
    scopeCeiling: 'state',
  },
  {
    role: 'district_admin',
    // Story 6.7 — the FR-40 ground-inspection ACTION key (schedule/findings/complete/photo/
    // refusal), checked at `dimension: 'district'` against the assignment's own district; a
    // `district` scopeCeiling is exactly what makes that gate meaningful (an exact-node match
    // authorizes an assignment in the same district). See the D1-reconciliation note in
    // permissions.ts for why block_admin is DEFERRED (a block grant cannot satisfy a district check).
    permissions: [
      CLAIM_APPROVE,
      MEMBER_SUSPEND,
      MEMBER_VIEW_VALIDITY,
      CLAIM_CONDUCT_GROUND_INSPECTION,
      // Story 6.10 — the verifier-console READ key (Anita). Checked at `dimension: 'district'` against
      // the deceased member's server-derived posting district; the `district` scopeCeiling makes that
      // exact-node gate meaningful. Distinct from the CLAIM_APPROVE write above (6.11 owns the verdict).
      CLAIM_VERIFY,
      // Story 6.12 (R6) — the manual shepherd reassignment key. The District Admin IS the shepherd (D-C),
      // so they administer the assignment; checked at `dimension: 'district'` against the deceased's
      // server-derived posting district. Grants no adjudication power (AC6) — orthogonal to CLAIM_APPROVE.
      CLAIM_ASSIGN_SHEPHERD,
      // Story 6.16 — the Stage-1 District-Admin appeal-reviewer key. Checked at `dimension: 'district'`
      // against the deceased member's server-derived posting district (the claim.verify precedent); the
      // `district` scopeCeiling makes that exact-node gate meaningful. The D-D reviewer-conflict (reviewer ≠
      // original decider) is enforced in the domain write-path + handler, ORTHOGONAL to this route gate.
      CLAIM_APPEAL_REVIEW,
    ],
    scopeCeiling: 'district',
  },
  {
    role: 'block_admin',
    // Story 6.7 D1 RECONCILIATION — block_admin ground-inspection scheduling is DEFERRED (NOT
    // granted). PRD FR-40 names block- and district-level admins as ground-inspection actors, but
    // ground-inspection assignments authorize at `dimension: 'district'` while block_admin has
    // `scopeCeiling: 'block'`: a block-scoped grant cannot satisfy a district-scoped resource check
    // (a block is NARROWER than a district → the district target is "broader than the grant" → deny),
    // and granting district scope would VIOLATE the block ceiling. No geo-tree resolver exists yet to
    // prove block→parent-district ancestry (denyDeeperGeoResolver, until Epic 3). So NO inert conduct
    // grant is seeded here. ACCEPTANCE CONDITION: block_admin support may be enabled only when the
    // authorization layer can resolve a block grant through verified block→district ancestry while
    // preserving the role's `scopeCeiling: 'block'` — and enabling it must require no district-scoped
    // grant to the block administrator. (See check.test.ts for the explicit block-grant-fails-district
    // assertion that pins this behaviour.)
    permissions: [MEMBER_SUSPEND, MEMBER_VIEW_VALIDITY],
    scopeCeiling: 'block',
  },
  {
    role: 'finance_officer',
    // Story 9.8 (FR-50) — the "designated reconciliation reviewer". The reconciliation review-queue key
    // (pariwar-dimension; the `pariwar` scopeCeiling satisfies it), the first grant this role carries.
    // Other finance keys land later; this is the FR-50 reviewer capability, not an adjudication grant.
    // Story 10.4 — HELPDESK_RESPOND: the default routing target for `utr-mismatch` tickets is
    // finance_officer, so it responds to the helpdesk queue (pariwar-dimension; the `pariwar` ceiling satisfies it).
    permissions: [RECONCILIATION_REVIEW, HELPDESK_RESPOND],
    scopeCeiling: 'pariwar',
  },
  {
    role: 'it_cell',
    // Story 10.4 — HELPDESK_RESPOND: the default routing target for `partner-module-issue` tickets is
    // it_cell, so it responds to the helpdesk queue (pariwar-dimension; the `pariwar` ceiling satisfies it).
    permissions: [PARIWAR_PROVISION, HELPDESK_RESPOND],
    scopeCeiling: 'pariwar',
  },
  {
    role: 'media_comms',
    // News/blog keys land Epic 1.x/10 — seed empty at v1.
    permissions: [],
    scopeCeiling: 'pariwar',
  },
  {
    role: 'field_worker',
    // Dispatch keys land Epic 12; scope `self` = `field_worker_self` (FR-53).
    permissions: [],
    scopeCeiling: 'self',
  },
  {
    role: 'verifier',
    // Story 4.6 — the verifier console (Epic 6) reads FR-12A validity to verify standing.
    // Story 6.10 — CLAIM_VERIFY: the verifier-console read key. A `district` ceiling makes the
    // district-dimension gate meaningful (exact-node match on the deceased's posting district).
    // NOT state_trustee (D3a — a state-ceiling grant cannot satisfy a district check until Epic 3).
    permissions: [MEMBER_MODERATE, MEMBER_VIEW_VALIDITY, CLAIM_VERIFY],
    scopeCeiling: 'district',
  },
  {
    role: 'auditor',
    // The cross-cutting read role (FR-47 / Story 1.11b gates the verify UI on
    // audit.verify). Story 4.6 — reads FR-12A validity as part of the audit read surface.
    permissions: [AUDIT_EXPORT, AUDIT_VERIFY, MEMBER_VIEW_VALIDITY],
    scopeCeiling: 'pariwar',
  },
  {
    role: 'helpline_operator',
    // Story 10.3 (SM-1 C3) — HELPDESK_CREATE lands here: the FIRST helpdesk key, closing the gap
    // 10.1/10.2 re-deferred. The helpline operator IS the SM-1 C3 call-to-ticket actor — they file a
    // helpdesk ticket on a caller's behalf via the existing 10.1 create route. A `pariwar` scopeCeiling
    // satisfies the pariwar-dimension gate. (This makes the "Helpdesk keys land Epic 10" note below true.)
    // NOT step-up-gated (helpdesk create isn't freeze-firing / not in AR-24 — unlike the 6.3 claim intake).
    // ── district_admin DEFERRED (the state_trustee-at-pariwar precedent) ──────────────────────────────
    // Story 10.3 grants HELPDESK_CREATE to pariwar_admin + helpline_operator (both `pariwar` ceiling) +
    // super_admin (auto). district_admin is DELIBERATELY NOT granted: HELPDESK_CREATE is checked at
    // `dimension: 'pariwar'` (there is no server-derived district for a helpdesk ticket, so a district gate
    // is impossible), and a `district`-ceiling grant can NEVER satisfy a pariwar-dimension check
    // (scopeContains denies a target broader than the grant; a district_admin also cannot hold a
    // pariwar-scoped grant — the ceiling check rejects it). Granting it would seed an INERT/false capability
    // — the exact [[project_rbac_geo_scope_containment]] asymmetry the state_trustee-at-pariwar deferrals
    // (cycle.freeze/claim.r9_vote/reconciliation.review) already encode. NO inert district_admin grant is
    // seeded. ACCEPTANCE CONDITION: district_admin helpdesk-create may be enabled only if a helpdesk ticket
    // gains a server-derived district AND the gate moves to `dimension: 'district'` — not by widening a
    // pariwar gate to a role that cannot satisfy it.
    //
    // Helpdesk keys land Epic 10 — but the helpline reads a caller's member validity to
    // assist them (Story 4.6, FR-12A "consistent across admin and member apps") AND, from
    // Story 6.3, FILES a claim on a bereaved caller's behalf (the freeze-firing helpline
    // intake, gated on the operator's own admin step-up). `claim.file` is the intake key,
    // distinct from `claim.approve` (verifier/trustee approval) which this role does NOT hold.
    //
    // Story 6.8 code review — CLAIM_MANAGE_NOMINEE_BANK (tier-1 ordinary bank collection/edit) +
    // CLAIM_CORRECT_NOMINEE_BANK (tier-2 post-approval correction) REPLACE an initial CLAIM_FILE
    // reuse for these two actions (CLAIM_FILE itself stays — it still gates the intake route).
    // helpline_operator keeps BOTH new keys: this preserves the exact pre-review functional
    // capability (any claim.file-holding operator could always do both actions before), while
    // giving each action its own semantically-scoped key.
    // Story 6.9 (D5a) — the operator records consent at intake (via CLAIM_FILE) and honors a later
    // family revocation request (CLAIM_MANAGE_DPDPA_CONSENT — the revoke path's dedicated key).
    permissions: [
      MEMBER_VIEW_VALIDITY,
      CLAIM_FILE,
      CLAIM_MANAGE_NOMINEE_BANK,
      CLAIM_CORRECT_NOMINEE_BANK,
      CLAIM_MANAGE_DPDPA_CONSENT,
      // Story 10.3 (SM-1 C3) — the helpdesk ticket-create key (the operator files on a caller's behalf).
      HELPDESK_CREATE,
      // Story 10.4 — the helpdesk responder-console key. helpline_operator is the default routing target for
      // MOST v1 categories (kyc-trouble/payment-failed/claim-status/profile-update/other), so it is the primary
      // responder; a `pariwar` scopeCeiling satisfies the pariwar-dimension check. Filing (HELPDESK_CREATE) +
      // responding (HELPDESK_RESPOND) are distinct keys — the operator holds both.
      HELPDESK_RESPOND,
    ],
    scopeCeiling: 'pariwar',
  },
];

/**
 * The deterministic, idempotent seed (AC-3). Returns a fresh deep copy of
 * `defaultRoleBundles` every call — re-applying it is a no-op against any store
 * keyed by `role` (the admin path at Story 1.9+ and the `rbac-seed-reset` runbook
 * both rely on this re-runnability). Returning a copy (not the frozen module
 * constant) is deliberate: the caller may mutate its result before persisting
 * (FR-44 Super-Admin editability) without corrupting the canonical default.
 */
export function seedRoles(): RoleBundle[] {
  return defaultRoleBundles.map((b) => ({
    role: b.role,
    permissions: [...b.permissions],
    scopeCeiling: b.scopeCeiling,
  }));
}

/** Index `defaultRoleBundles` by role name for O(1) lookup in the guard. */
const BUNDLE_BY_ROLE: ReadonlyMap<string, RoleBundle> = new Map(
  defaultRoleBundles.map((b) => [b.role, b]),
);

/**
 * Resolve a role name to its default bundle, or `undefined` for an unknown role.
 * The fail-closed guard treats an unknown role as carrying NO permissions (deny).
 * Accepts a raw string (the `role_grants.role` column is plain text).
 */
export function bundleForRole(role: string): RoleBundle | undefined {
  return BUNDLE_BY_ROLE.get(role);
}
