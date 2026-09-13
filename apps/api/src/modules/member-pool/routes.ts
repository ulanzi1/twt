// My Pool home-card read routes — Story 8.2 (Task 2). The committed Epic-8 My Pool API surface.
//
// ONE route under /api/v1/member (member-session-gated, token-bearer like the member-home lock-in
// read): GET /active-contribution drives the topmost home-screen <ActiveContributionCard>.
// Session-guarded → automatically covered by the Story 1.14 login-wall CI gate; NOT added to the
// public allowlist (it is NOT public).

import {
  ActiveContributionCardResponse,
  ContributionHistoryResponse,
  MemberDriveDetailParams,
  MemberDriveDetailResponse,
  MemberDriveListQuery,
  MemberDriveListResponse,
  PoolContributorListResponse,
} from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { perMemberKey, type RouteRateLimit } from '../../plugins/rate-limit/index.js';
import { requireMemberSession } from '../auth/shared/member-session-guard.js';
import { createMemberPoolHandlers } from './handlers.js';

const MEMBER_POOL_TAG = 'member-pool';

/**
 * The Contribution-Note render limit (Story 8.7, Task 4 / D9). Far stricter than the generic read
 * ceiling because a PDF render is orders of magnitude more expensive than any other member read in
 * this app — a member legitimately opens a handful of Notes in a sitting, never dozens per minute.
 * Per-MEMBER-keyed (`perMemberKey`, not `perSessionKey` — members are token-bearer and never populate
 * `request.session`), so it is a per-member cost bound, not a per-IP one; `hook: 'preHandler'` runs the
 * check after `requireMemberSession` so `request.requestContext.actorId` is already set. `onExceeded` +
 * `errorResponseBuilder` are inherited from the global rate-limit registration.
 */
const CONTRIBUTION_NOTE_RATE: RouteRateLimit = {
  max: 10,
  timeWindow: '1 minute',
  keyGenerator: perMemberKey,
  hook: 'preHandler',
};

export function registerMemberPoolRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createMemberPoolHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const memberSession = requireMemberSession(deps);

  r.get(
    '/api/v1/member/active-contribution',
    {
      schema: { response: { 200: ActiveContributionCardResponse }, tags: [MEMBER_POOL_TAG] },
      preHandler: [memberSession],
    },
    h.activeContribution,
  );

  // Story 8.3 — the Live Contributor List read (confirmed rows + aggregate pending). Session-guarded →
  // auto-covered by the Story 1.14 login-wall CI gate; NOT public (Epic 11b owns the public Sahyog Vivran render).
  r.get(
    '/api/v1/member/pool-contributors',
    {
      schema: { response: { 200: PoolContributorListResponse }, tags: [MEMBER_POOL_TAG] },
      preHandler: [memberSession],
    },
    h.poolContributors,
  );

  // Story 8.6 — the Yogdaan Bahi contribution-history read (the member's OWN self-view, FR-12A). Session-
  // guarded → auto-covered by the Story 1.14 login-wall CI gate; NOT public (it is a member self-view).
  r.get(
    '/api/v1/member/contribution-history',
    {
      schema: { response: { 200: ContributionHistoryResponse }, tags: [MEMBER_POOL_TAG] },
      preHandler: [memberSession],
    },
    h.contributionHistory,
  );

  // Story 8.7 — the Yogdaan Pratigya (Contribution Note) PDF for ONE of the member's OWN contributions.
  // Session-guarded → auto-covered by the Story 1.14 login-wall CI gate; NOT public.
  //
  // Two things differ from its siblings and both are deliberate:
  //   · NO response schema — the body is `application/pdf` BYTES, not JSON. The path is documented by
  //     hand in the OpenAPI emitter (the Note has no JSON response shape to generate from).
  //   · A DEDICATED, STRICTER rate limit (not `named.read`): this is the only member endpoint in the
  //     app that spawns a browser render, which makes it the cheapest DoS surface here. The limit is
  //     per-member-keyed (`perMemberKey`, not the admin-only `perSessionKey`), and inherits the global
  //     audit emit + the ErrorResponse envelope on the 429.
  r.get(
    '/api/v1/member/contribution-note/:contributionId',
    {
      // `params` mirrors the hand-authored OpenAPI request schema (emit-openapi.ts) exactly, so the
      // enforced route matches the documented contract instead of relying on the handler's unchecked
      // `request.params as {...}` cast to reject a malformed id.
      schema: { params: z.object({ contributionId: z.string().min(1) }), tags: [MEMBER_POOL_TAG] },
      preHandler: [memberSession],
      config: { rateLimit: CONTRIBUTION_NOTE_RATE },
    },
    h.contributionNote,
  );

  // ⭐⭐ Story 11b.15 — the MEMBER'S DRIVE LIST, the fourth tab's read. Every Sahyog Drive in the
  // member's OWN Pariwar at `live` · `closed` · `settled`, paginated. Session-guarded → auto-covered
  // by the Story 1.14 login-wall CI gate; ⛔ NOT public (Epic 11b owns the public Sahyog index, and
  // this list deliberately shows a member MORE than that index does — `2026-09-04-189` cl.3).
  //
  // ⚠⛔⛔ **IT IS THE FIRST MEMBER ROUTE IN THIS MODULE THAT PAGINATES, AND THERE WAS ⛔ NO
  // MEMBER-SIDE PRECEDENT TO COPY.** Its four siblings above take ⛔ no user-controlled limit —
  // `contribution/read.ts:154,325` say so in terms. ⇒ the shape is copied from the **PUBLIC Sahyog
  // Drive** route (⭐ the same surface AC3 measures this one against): `page` + `limit` on the
  // query contract here, and `.limit(clampLimit(...)).offset(...)` in the domain accessor.
  // ⭐ TWO INDEPENDENT ENFORCEMENTS, deliberately: the schema's `.max()` is what Story 1.14's
  // forced-pagination guard SEES on the live in-process swagger document; `clampLimit` is what
  // actually bounds the SQL. ⛔ Neither alone is sufficient — a schema bound is invisible to the
  // `domain-accessor-invariants` gate, and a domain clamp is invisible to the FR-91 guard.
  r.get(
    '/api/v1/member/drive-list',
    {
      schema: {
        querystring: MemberDriveListQuery,
        response: { 200: MemberDriveListResponse },
        tags: [MEMBER_POOL_TAG],
      },
      preHandler: [memberSession],
    },
    h.driveList,
  );

  // ⭐⭐ Story 11b.17 — **THE MEMBER'S VIEW OF ONE DRIVE.** Everything the PUBLIC Sahyog Vivran page
  // carries for that drive, ⭐ PLUS the nominee's complete, UNMASKED banking coordinates — which the
  // public page, since story A (`11b-11`), carries ⛔ NONE of. `2026-09-04-190` **cl.3** as scoped by
  // **`-199`**: any authenticated member, any drive in their **OWN** Pariwar. Session-guarded →
  // auto-covered by the Story 1.14 login-wall CI gate; ⛔ NOT public.
  //
  // ⚠⛔⛔ **ADDRESSED BY THE OPAQUE PUBLIC TOKEN AND BY ⛔ NOTHING ELSE** (`2026-09-03-184` **(B)**,
  // Trustee-ratified). ⛔⛔ DO ⛔ NOT ADD AN `OR` ARM FOR `pool_canonical_identifier`, ⛔ not for old
  // links and ⛔ not "for operators": `P-YYYY-MM-###`'s sequence is a MONOTONIC per-(pariwar, month)
  // counter, so a read accepting EITHER form has ⛔ not closed the walk — it has added a lock beside an
  // open door. ⚠ On THIS surface the walk would reach FIVE decrypted Tier-1 fields × TWO accounts.
  // ⚠ The rate-limit remedy this surface was once criticised for lacking was **EXPRESSLY REFUSED** by
  // the Panel (*"the rate-limit tier is NOT changed"*, `-184`) ⇒ ⛔ do ⛔ not add one on that ground;
  // ⭐ what protects it is **authentication + session scope**, and enumeration BY A MEMBER is what
  // **D1(a) GRANTS**.
  //
  // ⚠⛔⛔ **THERE IS DELIBERATELY ⛔ NO `:pariwarId` PARAMETER, AND ADDING ONE WOULD BE THE DEFECT**
  // (family 12). ⭐ The scope comes from `request.requestContext.pariwarId` — the SESSION **IS** the
  // access control (`-199`'s *"member-surface access controls"* qualifier) — and it rides alongside
  // an explicit `pariwar_id` predicate in the domain read plus RLS **FORCE** on
  // `claim_nominee_bank_accounts`. ⇒ another Pariwar's drive is ⛔ **not addressable** and lands on a
  // **404**, ⛔ never a 403 (which is itself an enumeration oracle) and ⛔ never a 200 with absent keys.
  //
  // ⚠ `params` is the CONTRACT's own schema — the enforced route then matches the documented contract
  // instead of relying on the handler's unchecked `request.params as {…}` cast to reject a malformed
  // address (the `contribution-note/:contributionId` precedent above).
  // ⚠ ⛔ NO pagination and ⛔ no `limit` — this read is SINGLE-ROW by a unique key, so Story 1.14's
  // forced-pagination guard has nothing to see and the domain accessor owes ⛔ no `clampLimit`.
  r.get(
    '/api/v1/member/drive-detail/:driveToken',
    {
      schema: {
        params: MemberDriveDetailParams,
        response: { 200: MemberDriveDetailResponse },
        tags: [MEMBER_POOL_TAG],
      },
      preHandler: [memberSession],
    },
    h.driveDetail,
  );
}
