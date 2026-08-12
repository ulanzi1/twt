// Member-moderation admin routes — Story 10.10 (Task 5; AC2, AC4, AC9).
//
// SEVEN scope-gated admin routes — the trustee moderation surface:
//   · POST …/p/:pariwarId/members/:memberId/moderation/suspend    → none → suspended
//   · POST …/p/:pariwarId/members/:memberId/moderation/terminate  → suspended → terminated ONLY
//   · POST …/p/:pariwarId/members/:memberId/moderation/restore    → suspended|terminated → none
//   · GET  …/p/:pariwarId/members/:memberId/moderation            → standing + history (AC9)
//   · GET  …/p/:pariwarId/members/:memberId/moderation/:id/rationale → decrypt ONE rationale (review follow-up)
//   · GET  …/p/:pariwarId/moderation/members                      → the moderated list (Decision 9)
//   · GET  …/p/:pariwarId/moderation/reason-codes                 → the frozen registry (review follow-up)
//
// ── RBAC: the EXISTING `member.moderate` key. NO new key, NO catalog bump ────────────────────────
// `member.moderate` is already in the v1 seed catalog (`permissions.ts:428`) and granted to
// `pariwar_admin` (`roles.ts:255`) and — since Story 10.18 — `trustee_panel`.
// ⚠ Line pins and the version corrected by Story 10.18: this block previously read
// "`permissions.ts:368`", "`roles.ts:209`" and "`PERMISSION_CATALOG_VERSION` STAYS 28". Story 10.10
// added no key so *its own* delta was zero, but the version has since moved and is **30** (Story 10.18
// bumped 29 → 30 for a ROLE, not a key — the catalog version is no longer a proxy for key count).
// Do not invent a key to keep the chain going.
//
// ⚠ THE FINDING (Decision 4) — THIS STORY'S OWN PROTAGONIST CANNOT PASS THIS GATE.
// `epics.md:3540` casts a STATE TRUSTEE as the actor. But `state_trustee` holds `member.suspend`,
// NOT `member.moderate` — and its `scopeCeiling: 'state'` can NEVER satisfy a `pariwar`-dimension
// check: `scopeWithinCeiling('pariwar','state')` is `1 >= 2` → false (`rbac/scope.ts:56-79`), and
// containment denies a target broader than the grant (`scope.ts:188-197`). Granting
// `member.moderate` to `state_trustee` would seed an INERT capability — the
// [[project_rbac_geo_scope_containment]] asymmetry that 10.3/10.4/10.5/10.8/10.9 each deferred,
// except this time it lands on the NAMED ACTOR.
// → v1 holder was `pariwar_admin` (+ `super_admin`, auto-derived); `state_trustee` and
//   `district_admin` were DEFERRED. This shipped with its epic's protagonist unable to act, and that
//   was a CAPABILITY-MODEL FINDING TO ESCALATE, not a defect to paper over.
//
// ── ✅ ANSWERED BY STORY 10.18. The deferral recorded above is now discharged. ─────────────────────
// The escalation was correct and its answer is NOT a geo-tree resolver — it never could have been.
// A `state`-ceiling grant failing a `pariwar`-dimension check is RANK-ORDER BLOCKED (see
// `packages/domain/src/rbac/scope.ts` §RANK-ORDER): `scopeWithinCeiling` is a pure numeric compare
// with no resolver parameter, and `scopeContains` denies independently before any resolver runs.
// **No org tree, however complete, would have lifted it.** The comment above correctly diagnosed the
// mechanism and then mis-assigned the fix — the exact misdiagnosis Story 10.18's Family-A sweep exists
// to correct, and this site is its worked example.
//
// THE ANSWER: the actor was never a `state_trustee`. It is the **Trustee Panel** — constituted by
// Niyamavali §8.7 and ratified in Decision `2026-08-10-096` — seeded as `trustee_panel` with a
// **`pariwar` scopeCeiling**, which satisfies this gate by construction. `epics.md:3540` was corrected
// to name the Trustee Panel as the actor.
// ⚠ `state_trustee` and `district_admin` remain non-holders, PERMANENTLY on present ranks, not pending
// anything. `verifier` holds `member.moderate` at a `district` ceiling and is therefore INERT here —
// a deliberate deferral with an acceptance condition (Decision `2026-08-10-096` clause 7), pinned in
// `roles.test.ts`. Panel authority is CONCURRENT, not exclusive (clause 3): `pariwar_admin` keeps the
// key and §8.2/§8.3's other authorities are unaffected.
// *Rejected:* gating on `member.suspend` — held by `state_trustee` + `district_admin`, whose
//   ceilings fail the same pariwar check, so it is a SECOND inert path. `member.suspend` is left
//   untouched and is now effectively superseded.
// *Rejected:* moving the gate to `dimension: 'state'` — there is no geo-tree resolver, and
//   `members` carries no geography (`members.state` is the LIFECYCLE column; district lives in
//   `member_postings`), so a state-dimension target is unresolvable today.
//
// ── STEP-UP: the FIRST Epic-10 story that IS gated (Decision 5) ──────────────────────────────────
// AR-24's list (`epics.md:291`) does not name member moderation, and 10.3/10.4/10.5/10.8/10.9 each
// recorded "NOT step-up-gated". But `epics.md:3550` requires it explicitly, and suspension is
// adjacent to AR-24's "staff privilege escalation" in consequence. THREE DISTINCT action contexts,
// so an elevation minted for a RESTORE can never be spent on a TERMINATION (the 9.8 four-context
// precedent). The hook is placed AFTER the permission hook — "so an unauthorized actor never
// reaches step-up" (the stated invariant in `claims.cycle-freeze.routes.ts:17`).
//
// Each route inlines the human-actor chain explicitly — the literal-array style the 6.13/6.14/9.8
// routes use, so a reader (and any future static scan) sees the full chain at the call site rather
// than behind a shared/spread variable.
//
// ⚠ CORRECTION (review follow-up): this file is NOT scanned by the human-actor CI gate today.
// `scripts/claim-adjudication-human-actor-invariant/check.ts` carries a HARD-CODED `COVERAGE_SET`
// of six Epic-6 claims route files, and neither this file nor the 9.8 file cited above is in it.
// The inline style is therefore a convention held by review, not by a gate — do not read it as
// enforced. Extending that gate's scope is a deliberate act with its own cost ([[project_access_
// wrapper_gate_pending_scope]]: a scan-scope extension is only complete when an invariant gains
// MEANINGFUL semantic coverage of the new surface, not when the scan merely runs green over it),
// so it is left to a story that can carry the revert-sanity proof rather than bolted on here.

import {
  AppendModerationGroundRequest,
  AppendModerationGroundResponse,
  ModerateMemberRequest,
  ModeratedMembersListResponse,
  ModerationActionResponse,
  ModerationHistoryResponse,
  ModerationRationaleResponse,
  ReasonCodesListResponse,
} from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { requirePermissionHook } from '../rbac/index.js';
import { requireStepUp } from '../step-up/gate.js';
import { createMemberModerationHandlers } from './handlers.js';

const TAG = 'member-moderation';

/** The EXISTING v1-seed moderation key. NOT a new key — the catalog stays at v28 (Decision 4). */
const MEMBER_MODERATE_KEY = 'member.moderate';

/**
 * Distinct step-up action contexts — an elevation for one action never satisfies another (AC4).
 * There is no central action-context registry; a free-form module const is the shipped convention
 * (`pool-fixed-amount/index.ts:46`), following the 9.8 four-context precedent.
 */
const STEP_UP_SUSPEND = 'member_moderation_suspend';
const STEP_UP_TERMINATE = 'member_moderation_terminate';
const STEP_UP_RESTORE = 'member_moderation_restore';
/**
 * Story 10.20 (AC9) — the FOURTH context. An elevation minted for a restore can never be spent on
 * appending a finding, and vice versa: recording a new ground against a member is its own
 * consequential act, not a footnote to whichever action the operator most recently elevated for.
 */
const STEP_UP_APPEND_GROUND = 'member_moderation_append_ground';

const PariwarParam = z.object({ pariwarId: z.string().uuid() }).strict();
const MemberParam = z
  .object({ pariwarId: z.string().uuid(), memberId: z.string().uuid() })
  .strict();
/** The rationale read's params. The grounds route shares this shape exactly — aliased, not
 *  re-declared, so the two can never drift apart. */
const RationaleParam = z
  .object({ pariwarId: z.string().uuid(), memberId: z.string().uuid(), moderationActionId: z.string().uuid() })
  .strict();
const GroundParam = RationaleParam;
const ListQuery = z
  .object({
    limit: z.coerce.number().int().positive().max(200).optional(),
    offset: z.coerce.number().int().nonnegative().optional(),
  })
  .strict();

export function registerMemberModerationRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createMemberModerationHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const adminSession = requireAdminSession(deps);
  const scope = scopeResolutionHook(deps);
  // member.moderate at dimension:'pariwar' (EXPLICIT — the target IS the tenant; resolveValue
  // defaults to scopeTx.pariwarId, the reconciliation.review / banner.manage precedent). No district
  // dimension: `members` carries no geography, and a district-ceiling grant could never satisfy a
  // pariwar check anyway (see the header finding).
  const requireModerate = requirePermissionHook(deps, MEMBER_MODERATE_KEY, { dimension: 'pariwar' });

  // AC2/AC4 — suspend. `none → suspended`; any other current standing is a typed 409 pre-write.
  r.post(
    '/api/v1/p/:pariwarId/members/:memberId/moderation/suspend',
    {
      schema: {
        params: MemberParam,
        body: ModerateMemberRequest,
        response: { 200: ModerationActionResponse },
        tags: [TAG],
      },
      preHandler: [adminSession, scope, requireModerate, requireStepUp(deps, STEP_UP_SUSPEND)],
    },
    h.suspend,
  );

  // AC2/AC4 — terminate. Legal ONLY from `suspended` (Decision 2): the harshest, rejoin-locking
  // action requires a deliberate two-step and can never be a single click.
  r.post(
    '/api/v1/p/:pariwarId/members/:memberId/moderation/terminate',
    {
      schema: {
        params: MemberParam,
        body: ModerateMemberRequest,
        response: { 200: ModerationActionResponse },
        tags: [TAG],
      },
      preHandler: [adminSession, scope, requireModerate, requireStepUp(deps, STEP_UP_TERMINATE)],
    },
    h.terminate,
  );

  // AC2/AC4 — restore. `suspended | terminated → none`; also CLEARS the FR-6 rejoin lock, because
  // the signup guard reads the CURRENT standing rather than the existence of a historical terminate.
  r.post(
    '/api/v1/p/:pariwarId/members/:memberId/moderation/restore',
    {
      schema: {
        params: MemberParam,
        body: ModerateMemberRequest,
        response: { 200: ModerationActionResponse },
        tags: [TAG],
      },
      preHandler: [adminSession, scope, requireModerate, requireStepUp(deps, STEP_UP_RESTORE)],
    },
    h.restore,
  );

  // AC9 — the member's current standing + moderation history. A READ: no step-up (AR-24 gates
  // consequential WRITES; requiring an OTP to look at a history would train admins to elevate
  // reflexively, which is precisely what makes step-up worthless on the actions that matter).
  r.get(
    '/api/v1/p/:pariwarId/members/:memberId/moderation',
    {
      schema: {
        params: MemberParam,
        // The audit trail is PAGINATED (review follow-up). It previously took no querystring and
        // silently returned the newest 50 with no `has_more`, so a contested member's ORIGINAL
        // decision — the one most likely under dispute — simply vanished off the end.
        querystring: ListQuery,
        response: { 200: ModerationHistoryResponse },
        tags: [TAG],
      },
      preHandler: [adminSession, scope, requireModerate],
    },
    h.history,
  );

  // AC9 (WS-E) — append a SUPPORTING ground to an existing decision. A WRITE, so it is step-up
  // gated like the three actions; ⛔ the PRIMARY ground is not reachable from here (it is written in
  // the action's own transaction and is structurally immutable thereafter).
  r.post(
    '/api/v1/p/:pariwarId/members/:memberId/moderation/:moderationActionId/grounds',
    {
      schema: {
        params: GroundParam,
        body: AppendModerationGroundRequest,
        response: { 200: AppendModerationGroundResponse },
        tags: [TAG],
      },
      preHandler: [adminSession, scope, requireModerate, requireStepUp(deps, STEP_UP_APPEND_GROUND)],
    },
    h.appendGround,
  );

  // Review follow-up — decrypt ONE rationale on demand. A READ, same posture as `history` above: no
  // step-up (AR-24 gates consequential WRITES, not looking at one already-committed decision's
  // reasoning). Gated on the SAME `member.moderate` key — there is no separate "view rationale"
  // capability, matching every other field on this surface.
  r.get(
    '/api/v1/p/:pariwarId/members/:memberId/moderation/:moderationActionId/rationale',
    {
      schema: { params: RationaleParam, response: { 200: ModerationRationaleResponse }, tags: [TAG] },
      preHandler: [adminSession, scope, requireModerate],
    },
    h.rationale,
  );

  // Decision 9 — the Pariwar-wide moderated-members list (what Story 10.11 consumes).
  r.get(
    '/api/v1/p/:pariwarId/moderation/members',
    {
      schema: {
        params: PariwarParam,
        querystring: ListQuery,
        response: { 200: ModeratedMembersListResponse },
        tags: [TAG],
      },
      preHandler: [adminSession, scope, requireModerate],
    },
    h.listModerated,
  );

  // Review follow-up — the full frozen reason-code registry (`appliesTo` + `label`), so the admin
  // dropdown reads the SAME source the server's 422 enforces instead of hand-duplicating it by
  // value. No DB, no pagination (Decision 3).
  r.get(
    '/api/v1/p/:pariwarId/moderation/reason-codes',
    {
      schema: { params: PariwarParam, response: { 200: ReasonCodesListResponse }, tags: [TAG] },
      preHandler: [adminSession, scope, requireModerate],
    },
    h.reasonCodes,
  );
}
