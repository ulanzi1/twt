// The 13 seeded role bundles (FR-46) — Story 1.8 substrate (AC-3); `trustee_panel`
// added by Story 10.18.
//
// ⚠ PROVISIONAL PENDING OQ-3. The Trustee Panel confirms/revises the seeded role set
// + their permission bundles pre-launch (OQ-3 "Blocks: RBAC seed in production").
// This includes `trustee_panel`: Decision `2026-08-10-096` clause 4 ruled that the
// thirteenth role needs no separate OQ-3 act and ships PROVISIONAL on the same
// footing as the other twelve, which this header already declares for the set.
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
 * The 13 seeded role names (FR-46). Stored as `snake_case` strings — these are the
 * `role` value in `role_grants` (a plain `text` column, NOT a pgEnum, precisely so
 * OQ-3 can revise the set without an enum migration; see ADR-0008). The union is a
 * compile-time aid; the DB column trusts the seed/admin layer.
 *
 * ⚠ ORDER IS LOAD-BEARING. `packages/contracts/tests/rbac.test.ts` asserts
 * `SeededRoleSchema.options` **toEqual** `defaultRoleBundles.map(b => b.role)` — an
 * order-exact array comparison. A new role must be appended in the SAME index
 * position in all three places: this union, `defaultRoleBundles`, and the contracts
 * `SeededRoleSchema` enum.
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
  | 'helpline_operator'
  | 'trustee_panel';

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
// ⚠ DEPRECATED at Story 10.18 — SUCCESSOR: `member.moderate` (MEMBER_MODERATE below).
// The key stays enforceable and all four grants below are honoured; NO NEW GRANT may be added.
// Machine-readable via `DEPRECATED_PERMISSION_KEYS` / `isDeprecatedKey()` in permissions.ts, and
// pinned by the holder-set gate in tests/rbac/roles.test.ts. Removal is a separate, later bump.
const MEMBER_SUSPEND = permissionKey('member.suspend');
const MEMBER_MODERATE = permissionKey('member.moderate');
/** Story 10.19 — restore-from-TERMINATED, held by `trustee_panel` ALONE (Niyamavali §8.4). */
const MEMBER_RESTORE_TERMINATED = permissionKey('member.restore_terminated');
const MEMBER_MODERATION_APPEAL_DECIDE = permissionKey('member.decide_moderation_appeal');
// Story 10.21 — the off-portal DPDPA data-rights FULFILMENT key (pariwar-dimension). Filing a request
// (`helpdesk.create`) and EXECUTING it on a member with no session are different authorities, so this is
// a distinct key held by `pariwar_admin` ONLY. ⛔ NOT `helpline_operator` (files, does not execute),
// ⛔ NOT `district_admin` / `state_trustee` (rank-order blocked in both directions — scope.ts §RANK-ORDER).
const MEMBER_DATA_RIGHTS = permissionKey('member.data_rights');
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
// state_trustee-facing surface, gated on pariwar_admin-as-Trustee-Lite; direct state_trustee gating is
// RANK-ORDER BLOCKED (scope.ts §RANK-ORDER — no resolver can lift it).)
const CYCLE_FREEZE = permissionKey('cycle.freeze');
// Story 6.14 (D-B) — the R9 special-case panel-voting WRITE key (pariwar-dimension; ALSO the panel-membership
// eligibility credential — assertPanelAuthorized requires every panel actor to hold it). Same Trustee-Lite
// posture as cycle.freeze; direct state_trustee gating RANK-ORDER BLOCKED (scope.ts §RANK-ORDER — no resolver can lift it).
const CLAIM_R9_VOTE = permissionKey('claim.r9_vote');
// Story 6.16 — the internal 3-stage appeal keys. Stage-1 reviewer (district-dimension; the claim.verify
// precedent); Stage-2 panel voter (pariwar-dimension; ALSO the panel-membership eligibility credential, the
// claim.r9_vote precedent); Stage-3 Trustee discretion (pariwar-dimension, RESOLVED v1). Same Trustee-Lite
// posture — direct state_trustee gating for the pariwar keys is RANK-ORDER BLOCKED (scope.ts §RANK-ORDER — no resolver can lift it).
const CLAIM_APPEAL_REVIEW = permissionKey('claim.appeal_review');
const CLAIM_APPEAL_VOTE = permissionKey('claim.appeal_vote');
const CLAIM_APPEAL_FINAL = permissionKey('claim.appeal_final');
// Story 7.5 (FR-15) — the fixed-amount schedule keys (both pariwar-dimension; the cycle.freeze / claim.r9_vote
// pariwar-wide precedent). `pool.fixed_amount_set` = the standard (90-day-notice) change; `…_emergency` =
// the emergency override (ALSO step-up-gated at the route). Same Trustee-Lite posture — direct state_trustee
// gating is RANK-ORDER BLOCKED (scope.ts §RANK-ORDER — no resolver can lift it).
const POOL_FIXED_AMOUNT_SET = permissionKey('pool.fixed_amount_set');
const POOL_FIXED_AMOUNT_EMERGENCY = permissionKey('pool.fixed_amount_emergency');
// Story 9.8 (FR-50) — the reconciliation review-queue READ + four action WRITEs gate (pariwar-dimension;
// the cycle.freeze / claim.r9_vote pariwar-wide precedent). Each action is ALSO step-up-gated at the route.
// Granted to pariwar_admin (Trustee-Lite) + finance_officer (the "designated reconciliation reviewer");
// super_admin auto-derives. Direct state_trustee gating RANK-ORDER BLOCKED (scope.ts §RANK-ORDER — no resolver can lift it).
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
// Story 10.7 (FR-58A) — the reports-library member-roster-EXPORT READ key (district-CAPABLE; the FIRST
// non-deferred district-dimension read key). Gates the member_roster report template. Granted to
// district_admin (checked at `dimension: 'district'` against the actor's OWN district — an exact-node
// match the `district` scopeCeiling makes meaningful, NO geo-tree needed) + pariwar_admin (pariwar scope
// sees the whole tenant); super_admin auto-derives. DISTINCT from member.view_validity (roster export ≠
// single-member validity view — the 4.6 read-key-separation precedent). The other two v1 report templates
// REUSE audit.export (audit-log) + reconciliation.review (contribution-rate) — no umbrella key (Decision 6).
const MEMBER_EXPORT_ROSTER = permissionKey('member.export_roster');
// Story 10.8 (FR-58C) — the feature-flag INVENTORY READ key (pariwar-dimension; the helpdesk.create /
// news.manage precedent). Granted to pariwar_admin (prd.md:892: "flag inventory is visible to Pariwar Admin
// role and above") + auditor (read-only oversight — an auditor who cannot see which flags are live cannot
// audit a flag-gated behaviour change); super_admin auto-derives. district_admin DEFERRED (a district-ceiling
// grant can't satisfy a pariwar check — the HELPDESK_* / NEWS_MANAGE precedent). DELIBERATELY BROADER than
// FEATURE_FLAG_FLIP — that asymmetry IS the FR-58C "no secret flags" transparency property.
//
// ⚠ state_trustee is ALSO deliberately excluded, for the SAME structural reason as district_admin and not
// as an oversight (Review Pass 2 — the exclusion was tested but undocumented, which reads as an accident on
// the one role whose name most obviously satisfies "Pariwar Admin AND ABOVE"). Its `scopeCeiling` is
// 'state', which is BROADER than 'pariwar' — and geo-scope containment is asymmetric: a grant at a
// different ceiling than the gate's dimension never satisfies it, in EITHER direction. A state-ceiling
// grant on a pariwar-dimension key is an INERT capability — the role would appear authorised in the
// catalog and be silently denied at every call site, which is the trap 10.3/10.4/10.7 documented.
// ACCEPTANCE CONDITION for granting it: a geo-tree scope RESOLVER able to expand a state ceiling into the
// set of pariwars beneath it (the same resolver the district_admin deferral waits on).
const FEATURE_FLAG_VIEW = permissionKey('feature_flag.view');
// Story 10.8 (FR-58C) — the feature-flag FLIP WRITE key (pariwar-dimension). Granted to pariwar_admin ONLY
// (+ super_admin auto) — NOT auditor: read-only oversight must never carry a production-behaviour-changing
// authority. NARROWER than FEATURE_FLAG_VIEW by design (Decision 7 — one umbrella `feature_flag.manage` key
// would collapse "everyone who can see" into "everyone who can flip"). Every flip carries a REQUIRED bounded
// rationale + a §1.5 hash-chain audit line. NOT step-up-gated. district_admin DEFERRED (same inert-grant reason).
const FEATURE_FLAG_FLIP = permissionKey('feature_flag.flip');
// Story 10.9 (FR-58B) — the Banner/Popup admin key (pariwar-dimension; the helpdesk.create / news.manage /
// feature_flag.* pariwar-wide precedent — a banner is Pariwar-scoped and the tenant IS the target,
// resolvable TODAY with no geo-tree). ONE key, not a view/manage split: unlike FEATURE_FLAG_VIEW/FLIP there
// is no transparency property forcing the read to be broader than the write, so a split would be capability
// surface with no requirement behind it (the NEWS_MANAGE one-key posture). Gates every admin banner route:
// list / create / update / publish / retract / detail. Granted to pariwar_admin (the same content-authoring
// authority that holds NEWS_MANAGE) + super_admin (auto). district_admin DEFERRED (a district-ceiling grant
// can't satisfy a pariwar check — the HELPDESK_* / NEWS_MANAGE / FEATURE_FLAG_* precedent; granting it would
// seed an INERT capability). state_trustee excluded for the SAME structural reason (its 'state' ceiling is
// BROADER than 'pariwar', and containment is asymmetric in EITHER direction — see the FEATURE_FLAG_VIEW note).
// NOT step-up-gated (a banner publish is not freeze-firing / not in AR-24).
//
// ⚠ KNOWN, PO-RATIFIED CONSEQUENCE of the single grant: publishing is tone-review-gated and the gate is
// default-deny on reviewedBy === authoredBy, so a SINGLE-ADMIN Pariwar cannot publish a banner (nobody else
// can be the non-author reviewer). This is the identical consequence 10.5's review recorded and the PO
// deferred on 2026-07-30 (media_comms deliberately kept dormant). It is a deferral with precedent, not a bug
// — do NOT "fix" it by weakening the gate or minting a second role grant.
// ACCEPTANCE CONDITION for district_admin: a banner gains a server-derived district AND the gate moves to
// `dimension: 'district'` — never by widening a pariwar gate to a role that cannot satisfy it.
const BANNER_MANAGE = permissionKey('banner.manage');
// Story 10.15 (FR-58) — the Survey/Poll admin key (pariwar-dimension; the helpdesk.create /
// news.manage / feature_flag.* / banner.manage pariwar-wide precedent — a survey is a per-TENANT
// record, the tenant IS the target, resolvable TODAY with no geo-tree). Granted to pariwar_admin ONLY
// (+ super_admin auto).
//
// ONE key, the NEWS_MANAGE/BANNER_MANAGE shape rather than the FEATURE_FLAG_VIEW/FLIP one: nothing in
// FR-58 makes a survey inventory or its results something a role must be able to READ without being
// able to author one, so there is no transparency property to split on.
//
// ⚠ district_admin is DEFERRED and state_trustee excluded, both for containment asymmetry rather than
// judgement: a `district` ceiling can never satisfy a pariwar-dimension check (scopeContains denies a
// target broader than the grant, and the ceiling check forbids a district_admin holding a
// pariwar-scoped grant), and a `state` ceiling fails the same check from the other side. Either grant
// would be INERT — present in the catalog and silently denied at every call site
// ([[project_rbac_geo_scope_containment]]). ⛔ No inert grant is seeded.
// NOT step-up-gated (a survey publish is not freeze-firing / not in AR-24).
//
// ⚠ KNOWN, PO-RATIFIED CONSEQUENCE of the single grant, inherited unchanged from 10.5/10.9: publishing
// is tone-review-gated and the gate is default-deny on reviewedBy === authoredBy, so a SINGLE-ADMIN
// Pariwar cannot publish a survey (nobody else can be the non-author reviewer). A deferral with
// precedent (PO, 2026-07-30), not a bug — ⛔ do NOT "fix" it by weakening the gate or minting a second
// role grant.
// ACCEPTANCE CONDITION for district_admin: a survey gains a server-derived district AND the gate moves
// to `dimension: 'district'` — never by widening a pariwar gate to a role that cannot satisfy it.
const SURVEY_MANAGE = permissionKey('survey.manage');
// Story 10.12 (FR-54) — the per-Pariwar custom-field DEFINITION READ key (pariwar-dimension; the
// helpdesk.create / news.manage / feature_flag.* / banner.manage pariwar-wide precedent — a custom-field
// definition is a per-TENANT record, the tenant IS the target, resolvable TODAY with no geo-tree).
// Granted to pariwar_admin + auditor (+ super_admin auto).
//
// ⚠ TWO KEYS, NOT ONE, AND THE SPLIT IS THE POINT — the 10.8 doctrine, verbatim: "If these ever collapse
// to one key, the transparency property goes with it." A definition set is the tenant's DATA CONTRACT:
// what a Pariwar collects about its members, and at what declared PII tier. Anyone auditing that must be
// able to READ it without holding the authority to CHANGE it. This is the FEATURE_FLAG_VIEW/FLIP shape,
// not the NEWS_MANAGE/BANNER_MANAGE one-key shape, because here — unlike a banner — there IS a
// transparency property forcing the read broader than the write.
const PARIWAR_VIEW_CUSTOM_FIELDS = permissionKey('pariwar.view_custom_fields');
// Story 10.12 (FR-54) — the per-Pariwar custom-field WRITE key (pariwar-dimension). Gates definition
// publish/retire AND the member value write. Granted to pariwar_admin ONLY (+ super_admin auto) — NOT
// auditor: read-only oversight must never carry the authority to change the tenant's data contract.
// NARROWER than PARIWAR_VIEW_CUSTOM_FIELDS by design.
//
// ⚠ district_admin is NOT granted, and that is the re-learned Story 10.3 finding rather than an omission:
// a `district`-ceiling grant can NEVER satisfy a pariwar-dimension check (containment is asymmetric —
// scopeContains denies a target broader than the grant, and the ceiling check forbids a district_admin
// from holding a pariwar-scoped grant), so the grant would be an INERT capability that appears in the
// catalog and is silently denied at every call site ([[project_rbac_geo_scope_containment]]).
// state_trustee is excluded for the SAME structural reason in the other direction: its 'state' ceiling is
// BROADER than 'pariwar', and a grant at a different ceiling than the gate's dimension never satisfies it.
// NOT step-up-gated (a definition publish is not freeze-firing / not in AR-24); accountability is the
// frozen-governance fence + the §1.5 audit line + the append-only registry row.
// ACCEPTANCE CONDITION for either role: a definition gains a server-derived district AND the gate moves to
// `dimension: 'district'` — never by widening a pariwar gate to a role that cannot satisfy it.
const PARIWAR_MANAGE_CUSTOM_FIELDS = permissionKey('pariwar.manage_custom_fields');
// Story 11b.13 (Decision `2026-09-06-203`) — the per-Pariwar DRIVE TARGET write key
// (pariwar-dimension). Granted to pariwar_admin (+ super_admin auto) per `2026-09-04-190` cl.7(a).
//
// ⭐⭐ AND THE SIBLING KEY `pariwar.manage_drive_target_visibility` IS DELIBERATELY ABSENT FROM THIS
// FILE. It is `super_admin` ONLY, and `super_admin`'s bundle is `PERMISSION_CATALOG.keys` — it
// AUTO-DERIVES every catalog key the moment one is declared. ⇒ a super_admin-only key appears in
// the catalog and NEVER in a bundle here; a grep for `manage_nominee_bank_masking` or
// `manage_public_name_presentation` in this file returns nothing, for exactly this reason.
// ⛔ Do not "complete the pair" by adding a const for it — there is no bundle for it to join, and
// the only bundle that would take it is the one that already has it.
//
// ⛔ NOT district_admin / state_trustee — inert in both directions
// ([[project_rbac_geo_scope_containment]]): a `district` ceiling can never satisfy a
// pariwar-dimension check, and a `state` ceiling is broader than the gate's dimension.
const PARIWAR_MANAGE_DRIVE_TARGET = permissionKey('pariwar.manage_drive_target');

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
      // ⚠ DEPRECATED (Story 10.18) — SUCCESSOR: `member.moderate`. Grant HONOURED, not removed; no NEW grant.
      MEMBER_SUSPEND,
      MEMBER_MODERATE,
      // Story 10.21 — off-portal DPDPA fulfilment. `pariwar_admin` is the ONLY seeded holder.
      // ⭐ Escalation 10 is RULED (Decision `2026-08-14-109` clause 7): NO DPDPA action inherently
      // requires Trustee Panel authority, so AC-R3 closed with a recorded disposition and no code.
      // ⛔ Do not add `trustee_panel` here — the exclusion is SETTLED ("ruled: not required"), not
      // provisional; see the key's own note in permissions.ts and the assertion in roles.test.ts.
      MEMBER_DATA_RIGHTS,
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
      // pariwar_admin acting as Trustee-Lite; direct state_trustee gating is RANK-ORDER BLOCKED (scope.ts §RANK-ORDER — no resolver can lift it)
      // — a `state`-ceiling grant can NEVER satisfy a pariwar check, see permissions.ts. No inert
      // state_trustee grant is seeded.
      CYCLE_FREEZE,
      // Story 6.14 (D-B) — the R9 special-case panel-voting key. A PARIWAR-WIDE bulk-adjudication surface
      // (checked at `dimension: 'pariwar'`), the exact cycle.freeze ceiling rationale (a `pariwar`-ceiling-
      // or-broader role). v1 actor = pariwar_admin-as-Trustee-Lite; direct state_trustee gating is
      // RANK-ORDER BLOCKED (scope.ts §RANK-ORDER — no resolver can lift it), see permissions.ts. No inert state_trustee grant is seeded.
      CLAIM_R9_VOTE,
      // Story 6.16 — the Stage-2 State-Trustee appeal panel-voting key + the Stage-3 Trustee discretion key.
      // Both PARIWAR-WIDE bulk-adjudication surfaces (checked at `dimension: 'pariwar'`), the exact
      // cycle.freeze / claim.r9_vote ceiling rationale. v1 actor = pariwar_admin-as-Trustee-Lite; direct
      // state_trustee gating RANK-ORDER BLOCKED (scope.ts §RANK-ORDER — no resolver can lift it). claim.appeal_vote is ALSO the panel-membership eligibility
      // credential (openAppealPanel's assertPanelAuthorized). No inert state_trustee grant is seeded.
      CLAIM_APPEAL_VOTE,
      CLAIM_APPEAL_FINAL,
      // Story 7.5 (FR-15) — the fixed-amount schedule keys. Both PARIWAR-WIDE policy surfaces (checked at
      // `dimension: 'pariwar'` = scopeTx.pariwarId), the exact cycle.freeze / claim.r9_vote ceiling rationale
      // (a `pariwar`-ceiling-or-broader role). The emergency route is ADDITIONALLY step-up-gated (governance
      // posture equivalent to R9 WITHOUT the R9 voting lifecycle). v1 actor = pariwar_admin-as-Trustee-Lite;
      // direct state_trustee gating RANK-ORDER BLOCKED (scope.ts §RANK-ORDER — no resolver can lift it). No inert state_trustee grant is seeded.
      POOL_FIXED_AMOUNT_SET,
      POOL_FIXED_AMOUNT_EMERGENCY,
      // Story 9.8 (FR-50) — the reconciliation review-queue key. A PARIWAR-WIDE adjudication surface
      // (checked at `dimension: 'pariwar'` = scopeTx.pariwarId), the exact cycle.freeze / claim.r9_vote
      // ceiling rationale (a `pariwar`-ceiling-or-broader role). Each action is ADDITIONALLY step-up-gated.
      // v1 actor = pariwar_admin-as-Trustee-Lite; direct state_trustee gating RANK-ORDER BLOCKED (scope.ts §RANK-ORDER — no resolver can lift it). No
      // inert state_trustee grant is seeded.
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
      // Story 10.7 — the reports-library member-roster-EXPORT key (district-CAPABLE, held here at pariwar
      // scope). A `pariwar` grant resolves to pariwar-wide scope, so the roster report sees the whole tenant
      // (no district narrowing — RLS tenant-isolates underneath). The tenant's administrative read authority.
      MEMBER_EXPORT_ROSTER,
      // Story 10.8 (FR-58C) — the feature-flag inventory READ + the FLIP write (pariwar-dimension).
      // pariwar_admin is the "Pariwar Admin role and above" prd.md:892 names for inventory visibility, and
      // the tenant's governance authority for staged rollout. A `pariwar` scopeCeiling satisfies both checks.
      // Holding BOTH here is correct; the view/flip split matters at auditor, which holds only the former.
      FEATURE_FLAG_VIEW,
      FEATURE_FLAG_FLIP,
      // Story 10.9 (FR-58B) — the Banner/Popup admin key (pariwar-dimension). The SOLE non-super_admin
      // holder: the tenant's content-authoring authority, exactly as for NEWS_MANAGE. A `pariwar`
      // scopeCeiling satisfies the pariwar-dimension check; district_admin/state_trustee cannot (inert).
      BANNER_MANAGE,
      // Story 10.15 (FR-58) — the Survey/Poll admin key (pariwar-dimension). The SOLE non-super_admin
      // holder: the tenant's content-authoring authority, exactly as for NEWS_MANAGE and BANNER_MANAGE.
      // A `pariwar` scopeCeiling satisfies the pariwar-dimension check; district_admin/state_trustee
      // cannot (inert in either direction — see the SURVEY_MANAGE note above).
      SURVEY_MANAGE,
      // Story 10.12 (FR-54) — the per-Pariwar custom-field READ + WRITE keys (pariwar-dimension).
      // pariwar_admin is the SOLE non-super_admin holder of the write: authoring the tenant's own data
      // shape is the tenant administrator's authority by definition. Holding BOTH here is correct; the
      // view/manage split matters at auditor, which holds only the former.
      PARIWAR_VIEW_CUSTOM_FIELDS,
      PARIWAR_MANAGE_CUSTOM_FIELDS,
      // Story 11b.13 (`2026-09-04-190` cl.7(a), minted at Decision `2026-09-06-203`) — the
      // per-Pariwar DRIVE TARGET write key (pariwar-dimension). pariwar_admin is the role the Panel
      // named: the person who knows what a drive in their Pariwar needs to raise. A `pariwar`
      // scopeCeiling satisfies the pariwar-dimension check.
      // ⭐ Holding this does NOT carry the REVEAL — `pariwar.manage_drive_target_visibility` is a
      // SEPARATE key held by super_admin ONLY, and it is absent from this bundle BY RULING
      // (cl.7(c)), not by omission. ⛔ Adding it here would collapse an authority split the catalog
      // exists to make visible.
      PARIWAR_MANAGE_DRIVE_TARGET,
    ],
    scopeCeiling: 'pariwar',
  },
  {
    role: 'state_trustee',
    // Story 2.6 — the "Trustee Panel" approves T&C versions (tc.approve). Story 4.6 —
    // reads FR-12A validity + is the ONLY role that sees the pending_concealment_flag
    // (gated by role/scope in the validity service, NOT a second permission key).
    // ⚠ DEPRECATED (Story 10.18) — SUCCESSOR: `member.moderate`. Grant HONOURED, not removed; no NEW grant.
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
      // ⚠ DEPRECATED (Story 10.18) — SUCCESSOR: `member.moderate`. Grant HONOURED, not removed; no NEW grant.
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
      // Story 10.7 — the reports-library member-roster-EXPORT key. Checked at `dimension: 'district'`
      // against the actor's OWN resolved district (an exact-node match the `district` scopeCeiling makes
      // meaningful); the report query narrows `WHERE district = <actor.district>` (Decision 3). This is
      // the first district-narrowable read key that is NOT deferred — no geo-tree resolver is needed for
      // an exact-node self-district match.
      MEMBER_EXPORT_ROSTER,
    ],
    scopeCeiling: 'district',
  },
  {
    role: 'block_admin',
    // ✅ SHIPPED at Story 6.17 — block_admin HOLDS `claim.conduct_ground_inspection` (Decision
    // `2026-08-13-104`). This block used to explain why the grant was WITHHELD; it now explains why
    // it works, because the rank-order half of that explanation is still true and still load-bearing.
    //
    // ⛔ RANK ORDER (FAMILY A) — NO RESOLVER EVER LIFTED IT, AND NONE DOES NOW. Story 6.7 deferred
    // this gap to Story 1.18's geo-tree resolver as "Family B: same-tree ancestry, target strictly
    // narrower". ⭐ THAT PREMISE WAS INVERTED, and Story 1.18 found it while implementing the
    // resolver: the parent district is not narrower, it is the PARENT, hence BROADER. GEO_RANK is
    // state 2 < district 3 < block 4 (lower = broader), so a {block} grant (gRank 4) against a
    // {district} target (tRank 3) is denied by `tRank < gRank` at scope.ts — BEFORE any resolver
    // runs. The alternative (a district-scoped grant to a block admin) fails the other line:
    // scopeWithinCeiling('district','block') is a pure CEILING_RANK compare with no resolver
    // parameter → 3 >= 4 → false. Both denial paths are resolver-free. See scope.ts §RANK-ORDER.
    // ⇒ RE-CLASSIFIED as Family A at Story 1.18 (Decision 2026-08-12-102), and it stays Family A.
    // ⛔ The old ACCEPTANCE CONDITION ("enable when the authorization layer can resolve a block grant
    // through verified block→district ancestry") was REMOVED, not reworded, at Story 1.18 — it
    // promised something this model can never do. ⛔ Do not resurrect it.
    //
    // ✅ WHAT ACTUALLY SHIPPED — a different GATE, not a resolver, and not a lifted pin. Story 6.17
    // added a NULLABLE `block` to `claim_ground_inspections` and made the authorization DIMENSION a
    // property of the ROW: a block-tagged assignment is checked at `dimension: 'block'`, which
    // authorizes BOTH FR-40 actors — block_admin by EXACT-NODE match (gRank === tRank → value
    // compare), and district_admin by district→block ANCESTRY (gRank 3 < tRank 4 → the resolver,
    // which can only ever narrow, which is the direction this points). A row with `block == null`
    // is still checked at `dimension: 'district'`, byte-identically to Story 6.7.
    // ⛔ `scopeCeiling` STAYS 'block'. No district-scoped grant is ever issued to a block admin —
    // that would violate the ceiling and is exactly what AC2 forbids.
    // ⛔ NO FALLBACK (D6): a block-tagged row in a Pariwar with no resolvable tree DENIES the
    // ancestry path. Absence must deny, never widen.
    // ⛔ `claim.override_ground_inspection` is deliberately NOT held here (D8) — the D6 supervisor
    // override is a pariwar-ceiling authority ABOVE the inspector; a block admin acts only as the
    // assigned inspector. The omission is a ruling, not an oversight.
    // (check.test.ts still pins the rank-order assertion, unmodified: a BLOCK grant can NEVER
    // satisfy a DISTRICT-dimension check. Story 6.17 routed around that pin; it did not lift it.)
    // ⚠ DEPRECATED (Story 10.18) — SUCCESSOR: `member.moderate`. Grant HONOURED, not removed; no NEW grant.
    permissions: [MEMBER_SUSPEND, MEMBER_VIEW_VALIDITY, CLAIM_CONDUCT_GROUND_INSPECTION],
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
    // NOT state_trustee (D3a — a state-ceiling grant could not satisfy a district check without a
    // resolver proving state→district ancestry). ✅ RESOLVED at Story 1.18: the resolver exists
    // (ADR-0038), so a state-held grant reaches a district target wherever the Pariwar has published
    // a tree carrying that edge. ⛔ No grant changed here — reachability moved, role composition did
    // not, and a Pariwar with no published tree behaves exactly as before.
    //
    // ── ⚠ MEMBER_MODERATE IS AN INERT GRANT. DELIBERATE DEFERRAL, NOT AN OVERSIGHT. (Story 10.18, AC8) ──
    // This role holds `member.moderate` at a `district` ceiling, but the ONLY route gating that key
    // checks `{ dimension: 'pariwar' }` (`apps/api/src/modules/member-moderation/routes.ts`). So
    // `scopeWithinCeiling('pariwar','district')` is `1 >= 3` → **false**: the grant confers NOTHING
    // today, and no `verifier` can moderate a member. ⛔ This is RANK-ORDER BLOCKED, not pending a
    // resolver (`scope.ts` §RANK-ORDER) — it is the same INERT/false capability Story 10.3's review
    // identified and refused to seed, except here it was already seeded before that lesson landed.
    //
    // RULED, NOT ASSUMED: Story 10.18 routed this to the Trustee Panel as **Q7** and the Panel ruled
    // **option (a) — retain, as a deliberate deferral** (Decision `2026-08-10-096` clause 7). Removal
    // was the alternative and was NOT taken: it changes who may moderate, which is a governance act,
    // and it is the less reversible direction. The grant therefore stays, documented as inert rather
    // than quietly left to look effective.
    //
    // ACCEPTANCE CONDITION (the shipped 10.3/10.4 form): this grant becomes meaningful only if a
    // moderation target gains a server-derived district AND the gate moves to `dimension: 'district'`
    // — NEVER by widening the pariwar gate to a role whose ceiling cannot satisfy it.
    //
    // PINNED BY A PAIR, because either alone is insufficient:
    //   · `tests/rbac/check.test.ts` — the scope algebra, via a SYNTHETIC bundle, so the proof is
    //     catalog-INDEPENDENT (it holds whether or not this grant exists).
    //   · `tests/rbac/roles.test.ts` — the catalog-DEPENDENT half, asserting this grant is still here.
    //     Removing the key below must fail THERE; the synthetic pin would not notice.
    permissions: [MEMBER_MODERATE, MEMBER_VIEW_VALIDITY, CLAIM_VERIFY],
    scopeCeiling: 'district',
  },
  {
    role: 'auditor',
    // The cross-cutting read role (FR-47 / Story 1.11b gates the verify UI on
    // audit.verify). Story 4.6 — reads FR-12A validity as part of the audit read surface.
    // Story 10.8 — FEATURE_FLAG_VIEW (read-only) joins the audit read surface: a flag flip changes
    // production behaviour, so an auditor who cannot see which flags are live cannot audit a
    // flag-gated behaviour change. FEATURE_FLAG_FLIP is deliberately NOT here — read-only oversight
    // must not carry a production-behaviour-changing authority (Decision 7's view/flip split).
    // Story 10.12 — PARIWAR_VIEW_CUSTOM_FIELDS (read-only) joins the same read surface for the same
    // reason: a Pariwar-authored custom field is runtime-declared data collection, and an auditor who
    // cannot read the definitions cannot check what a tenant collects or what PII tier it declared.
    // PARIWAR_MANAGE_CUSTOM_FIELDS is deliberately NOT here — the read/write split is the point.
    permissions: [
      AUDIT_EXPORT,
      AUDIT_VERIFY,
      MEMBER_VIEW_VALIDITY,
      FEATURE_FLAG_VIEW,
      PARIWAR_VIEW_CUSTOM_FIELDS,
    ],
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
  {
    role: 'trustee_panel',
    // Story 10.18 — the THIRTEENTH seeded role, and the first added since Story 1.8.
    // ⚠ PROVISIONAL (Q4, defaulted per Decision `2026-08-10-096` clause 4) — ships on the same
    // provisional footing as the other twelve (see file header, `roles.ts:1-9`). Not a silent
    // approval; a Panel ruling on Q4 supersedes this footing when it lands.
    //
    // The body: the Trustee Panel constituted by Niyamavali §8.7, ratified by Decision
    // `2026-08-10-096`. §8.7 adopts the existing §1.3 "Trustee Panel (Core Team)" and extends its
    // scope from Part 9 to Part 8, so this is not a new body — it is the body the governing
    // instrument already named, now expressible in the capability model. Before this role existed
    // there was no way to distinguish a Panel act from a `pariwar_admin` act, and every exclusivity
    // `.decision-log.md` asserts was enforced by convention alone.
    //
    // ── Why `scopeCeiling: 'pariwar'` — THE RANK ORDERING, not a missing resolver ─────────────────
    // A `state`/`district`/`block`-ceiling grant can NEVER satisfy the `pariwar`-dimension check at
    // `member-moderation/routes.ts:135`, and no geo-tree resolver would change that:
    //   · `scopeWithinCeiling` (scope.ts:113-118) reads CEILING_RANK (scope.ts:64-67 — `{...GEO_RANK,
    //     self: 5}`) and is a PURE NUMERIC COMPARE with NO resolver parameter: `1 >= 2` → false.
    //   · `scopeContains` denies independently at scope.ts:232 (`if (tRank < gRank) return false;`),
    //     which is GEO_RANK-based (scope.ts:56-61), also BEFORE any resolver is consulted.
    // ⚠ Supplying a geo-tree resolver would NOT have solved this. The constraint is the ordering,
    // not the absence — so this ceiling is NOT a workaround for the unbuilt resolver, and must not
    // be re-read as one when that resolver lands (Story 1.18). `global` is rejected for the opposite
    // reason: it would make the Panel cross-tenant, contradicting multi-Pariwar isolation.
    //
    // Permission: the EXISTING `member.moderate` key. No new key is minted — the catalog's key count
    // is unchanged at 40; only PERMISSION_CATALOG_VERSION moves (29 → 30), because a seeded role is a
    // capability-model change a consumer caching authorization decisions should see.
    //
    // ⚠ Panel authority under Part 8 is CONCURRENT, not exclusive (§8.7; Decision `2026-08-10-096`
    // clause 3). `pariwar_admin` retains `member.moderate` above, and §8.2's State-Trustee-confirmed
    // concealment flag and §8.3's Trustee discretion are likewise unaffected. Do NOT read this bundle
    // as displacing them.
    // ⭐ Story 10.19 adds `member.restore_terminated`, and this bundle is its ONLY holder. That
    // exclusivity is the mechanism behind Niyamavali §8.4's "Restoration from termination is an act
    // of the Trustee Panel" (Q1 option (a), Decision `2026-08-10-097` clause 1) — before it, a
    // `pariwar_admin` and a Panel member were indistinguishable at the restore call site.
    // ⛔ Do NOT grant this key to any other role without a Panel decision: doing so would return
    // restore-from-terminated to the single-actor path the ratified §8.4 text forecloses, and the
    // instrument would then say something the system does not do.
    // ⚠ It does NOT make Panel authority exclusive anywhere else — `member.moderate` stays shared
    // and §8.2/§8.3 are untouched (Decision `2026-08-10-096` clause 3's concurrency ruling stands).
    // ⭐ Story 10.22 adds `member.decide_moderation_appeal`, and this bundle is its ONLY holder.
    // Niyamavali §8.8 (Decision `2026-08-15-121` clauses 2 and 14): the appeal is heard by the
    // Trustee Panel, and a SEPARATE key expresses that authority because `member.moderate` is shared
    // with `pariwar_admin` and so cannot distinguish the appellate authority from the deciding one.
    // ⛔ Do NOT grant this key to any other role without a Panel decision — doing so would return the
    // moderation appeal to the indistinguishability Story 10.18 existed to end, at the one call site
    // where the separation IS the mechanism.
    // ⛔ And do NOT grant it to `state_trustee` or `district_admin`: by the rank ordering documented
    // above, a `state`/`district`-ceiling grant can never satisfy the `pariwar`-dimension check, so
    // the grant would be INERT ON ARRIVAL rather than merely unwise.
    // ⚠ Holding the key is NOT sufficient to decide any given appeal. §8.8's different-individual
    // requirement is enforced separately, server-side, inside the scope transaction, as a typed 409 —
    // a Panel member who imposed the act (or contributed a ground it rests on) holds this key and is
    // still refused THAT case.
    // ⭐ Story 10.13 adds `pool.fixed_amount_set` + `pool.fixed_amount_emergency`, and this bundle is
    // NOT their only holder — `pariwar_admin` retains both, above. Decision `2026-08-16-123` clause 1.
    // The Trust Deed vests the power to fix the per-Pool amount in the BOARD — Clause 10(b) ("a fixed
    // per-Pool amount determined by the Board") and Clause 20(c) ("open Pools, fix per-Pool amounts") —
    // and Niyamavali §4.2 repeats it ("set by the Board for stated periods of not less than 12
    // months"). Story 7.5 shipped both keys on `pariwar_admin` ALONE, and a `pariwar_admin` is not the
    // Board: the same indistinguishability Story 10.18 existed to end, one epic later, at a different
    // surface.
    // ⚠ THIS GRANT IS NOT IMPLIED BY 10.18 AND WAS NOT AUTHOR-DEFAULTED. §8.7 constitutes the Panel as
    // "the Board of Trustees acting in a MODERATION capacity"; amount-fixing is a DIFFERENT capacity,
    // so it was ruled on its own facts.
    // ⚠ CONCURRENT, NOT EXCLUSIVE — the §8.7 posture (Decision `2026-08-10-096` clause 3), and the
    // FIRST grant to this bundle that is not exclusive to it. ⛔ Do NOT read the `member.restore_terminated`
    // / `member.decide_moderation_appeal` "do not grant this key elsewhere" notes above as covering
    // these two: for THOSE keys exclusivity IS the ratified mechanism, and for THESE it is expressly not.
    // ⚠ `pool.fixed_amount_emergency` is ALSO the emergency attesting-panel MEMBERSHIP eligibility
    // credential (Decision `2026-08-16-123` clause 2, Q2.1 option (a)) — the `claim.r9_vote` /
    // `claim.appeal_vote` precedent (see the key declarations above). `assertFixedAmountPanelAuthorized`
    // requires every attesting panel actor to hold it at this Pariwar. ⛔ Removing this key from a role
    // therefore shrinks the ELIGIBLE-ATTESTOR DIRECTORY as well as the write gate — two consequences,
    // one edit.
    // ⛔ And do NOT grant either key to `state_trustee` or `district_admin`: by the rank ordering
    // documented above, a `state`/`district`-ceiling grant can never satisfy the `pariwar`-dimension
    // check, so the grant would be INERT ON ARRIVAL rather than merely unwise. ⚠ Note this bites twice
    // here — an inert grant would also make the holder appear in no eligible-attestor directory, so the
    // surface would offer a trustee the system can never accept.
    // ⚠ Holding the key is NOT sufficient to attest any given override: it proves CAPABILITY, never
    // ASSENT. Only the SUBMITTING actor is authenticated and step-up gated; nothing proves a listed
    // attestor consented. FR-15's "multi-trustee approval" therefore remains PARTIALLY implemented
    // (Decision `2026-08-16-123` clause 14) — do not read this grant as closing it.
    permissions: [
      MEMBER_MODERATE,
      MEMBER_RESTORE_TERMINATED,
      MEMBER_MODERATION_APPEAL_DECIDE,
      POOL_FIXED_AMOUNT_SET,
      POOL_FIXED_AMOUNT_EMERGENCY,
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
