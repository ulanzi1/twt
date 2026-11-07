// The field-worker routes — Story 13.1 (Task 7; QE9; AC8) and Story 13.1a (Tasks 6–8; AD4, AD5).
//
//   · POST …/p/:pariwarId/field-workers   → register a worker and allocate their attribution code (201 — ⛔ the code, QE22)
//   Story 13.1a (AD5 — `/districts` is registered BEFORE `/:fieldWorkerId`: a static segment beats a parametric one in
//   find-my-way, and the UUID param schema could never match `districts` anyway — TR14):
//   · GET  …/field-workers/districts                     → the recorded districts (session + scope; ⛔ key)
//   · GET  …/field-workers                               → a keyset page (`field_worker.view`, AD4 b — `district` or `pariwar`)
//   · GET  …/field-workers/:fieldWorkerId                → one worker's identity (`field_worker.view`, AD4 a)
//   · POST …/field-workers/:fieldWorkerId/approve        → approve (`field_worker.approve`, AD4 a)
//   · GET  …/field-workers/:fieldWorkerId/code           → the code, by hand (`field_worker.read_code`, AD4 a)
//   Story 13.1c (AD6) — the lifecycle acts and the log, each on the same per-worker chain with ITS key:
//   · POST …/field-workers/:fieldWorkerId/move           → a direct move (`field_worker.move` — pariwar_admin)
//   · POST …/field-workers/:fieldWorkerId/suspend        → suspend (`field_worker.suspend`)
//   · POST …/field-workers/:fieldWorkerId/reactivate     → reactivate (`field_worker.reactivate`; the body is `{}`)
//   · POST …/field-workers/:fieldWorkerId/terminate      → end (`field_worker.terminate`)
//   · GET  …/field-workers/:fieldWorkerId/log            → the worker's log (`field_worker.read_log`; the named `read` rate limit)
//   A per-worker route's target is the worker's CURRENT district, stashed by `loadFieldWorkerGateDistrict` (`gate.ts`); an unknown
//   worker, another Pariwar's or one outside the grant is the SAME 403. The three decrypting / code GETs carry the named `read`
//   rate limit (each decrypt is a KMS call; each code read an audit line).
//
// The route IS the security control: an authenticated HUMAN admin session (`requireAdminSession`) → the scope hook (zero
// grants in this Pariwar ⇒ 404, so tenants cannot be probed) → `field_worker.register` at `dimension: 'district'`, the target
// being the BODY's `district` (QE9, TR12): `resolveValue` is SYNCHRONOUS (it reads the already-validated body, never the
// database) and returns `null` — which fails CLOSED — for anything but a string; a District Admin's grant matches by EXACT
// bytes (its own district only), a Pariwar Admin's covers any district of its Pariwar (the fill-in, `-441`). The gate stores
// its VERIFIED result on `request.authorizations['field_worker.register']` (QE18) — the handler passes that object on.
// The body is validated (400 `request.validation`) BEFORE the hooks run; the content rules are the handler's (422). The route
// declares its 201 response schema (the forced-pagination gate examines only routes that do).
// 13.1's lost-201 residual (its TR11) is answered by 13.1a's list: a registration whose 201 was lost shows in `pending_kyc`.

import {
  ApproveFieldWorkerRequest,
  ApproveFieldWorkerResponse,
  FieldWorkerCodeResponse,
  FieldWorkerDistrictsResponse,
  FieldWorkerLifecycleResult,
  FieldWorkerLog,
  FieldWorkerLogQuery,
  FieldWorkerIdentityResponse,
  FieldWorkerListQuery,
  FieldWorkerListResponse,
  FieldWorkerParams,
  MoveFieldWorkerRequest,
  ReactivateFieldWorkerRequest,
  RegisterFieldWorkerRequest,
  RegisterFieldWorkerResponse,
  SuspendFieldWorkerRequest,
  TerminateFieldWorkerRequest,
} from '@twt/contracts';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { namedRateLimits } from '../../plugins/rate-limit/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { requirePermissionHook } from '../rbac/index.js';
import { FIELD_WORKER_APPROVE_KEY, createFieldWorkerApprovalHandlers } from './approval-handlers.js';
import { fieldWorkerGateDistrict, listGateDimension, listGateValue, loadFieldWorkerGateDistrict } from './gate.js';
import { FIELD_WORKER_REGISTER_KEY, createFieldWorkerHandlers } from './handlers.js';
import {
  FIELD_WORKER_MOVE_KEY,
  FIELD_WORKER_REACTIVATE_KEY,
  FIELD_WORKER_SUSPEND_KEY,
  FIELD_WORKER_TERMINATE_KEY,
  createFieldWorkerLifecycleHandlers,
} from './lifecycle-handlers.js';
import { FIELD_WORKER_READ_LOG_KEY, createFieldWorkerLogHandlers } from './log-handlers.js';
import { FIELD_WORKER_READ_CODE_KEY, FIELD_WORKER_VIEW_KEY, createFieldWorkerReadHandlers } from './read-handlers.js';

const TAG = 'field-workers';

const PariwarParam = z.object({ pariwarId: z.string().uuid() }).strict();

/** The gate's target: the body's REPORTING district, verbatim — `null` (deny) for anything that is not a string (TR12). */
export function registrationDistrict(request: FastifyRequest): string | null {
  const district = (request.body as { district?: unknown } | undefined)?.district;
  return typeof district === 'string' ? district : null;
}

export function registerFieldWorkerRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createFieldWorkerHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.post(
    '/api/v1/p/:pariwarId/field-workers',
    {
      schema: { params: PariwarParam, body: RegisterFieldWorkerRequest, response: { 201: RegisterFieldWorkerResponse }, tags: [TAG] },
      preHandler: [
        requireAdminSession(deps),
        scopeResolutionHook(deps),
        requirePermissionHook(deps, FIELD_WORKER_REGISTER_KEY, { dimension: 'district', resolveValue: registrationDistrict }),
      ],
    },
    h.register,
  );

  // ── Story 13.1a ──
  const approval = createFieldWorkerApprovalHandlers(deps);
  const reads = createFieldWorkerReadHandlers(deps);
  // Called HERE, inside the registrar (13.1a TR10 — 13.1's handler unit test imports this module without `deps.config`).
  const limits = namedRateLimits(deps);
  const session = requireAdminSession(deps);
  const scope = scopeResolutionHook(deps);
  const loadWorker = loadFieldWorkerGateDistrict();
  const perWorker = (key: string) => [
    session,
    scope,
    loadWorker,
    requirePermissionHook(deps, key, { dimension: 'district', resolveValue: fieldWorkerGateDistrict }),
  ];

  // DELIBERATE (checklist family 9): NO permission key on this route — a session plus a grant in this Pariwar is the whole gate.
  // WHY: it returns only the Pariwar's recorded district NAMES (curated labels: the geo tree's district nodes, or the listed
  // workplace districts — never member-typed text), which the register screen's picker needs before the officer has chosen
  // anything a key could gate on (AD4(c), AC8, decision `-446` item 4). No worker, mobile or count is in the response, so there
  // is nothing to audit or withhold. RE-EXAMINE when: (a) the response gains a per-district count or anything about a worker;
  // (b) a role whose holders must not see the district list gets a grant in a Pariwar (the floor is "any grant here", so it
  // admits every role — Story 13.3 gives the field-worker role a Pariwar grant); (c) a district name can be member-typed.
  r.get(
    '/api/v1/p/:pariwarId/field-workers/districts',
    {
      schema: { params: PariwarParam, response: { 200: FieldWorkerDistrictsResponse }, tags: [TAG] },
      preHandler: [session, scope],
    },
    reads.districts,
  );

  r.get(
    '/api/v1/p/:pariwarId/field-workers',
    {
      schema: { params: PariwarParam, querystring: FieldWorkerListQuery, response: { 200: FieldWorkerListResponse }, tags: [TAG] },
      config: { rateLimit: limits.read },
      preHandler: [
        session,
        scope,
        requirePermissionHook(deps, FIELD_WORKER_VIEW_KEY, { resolveDimension: listGateDimension, resolveValue: listGateValue }),
      ],
    },
    reads.list,
  );

  r.get(
    '/api/v1/p/:pariwarId/field-workers/:fieldWorkerId',
    {
      schema: { params: FieldWorkerParams, response: { 200: FieldWorkerIdentityResponse }, tags: [TAG] },
      config: { rateLimit: limits.read },
      preHandler: perWorker(FIELD_WORKER_VIEW_KEY),
    },
    reads.identity,
  );

  r.post(
    '/api/v1/p/:pariwarId/field-workers/:fieldWorkerId/approve',
    {
      schema: { params: FieldWorkerParams, body: ApproveFieldWorkerRequest, response: { 200: ApproveFieldWorkerResponse }, tags: [TAG] },
      preHandler: perWorker(FIELD_WORKER_APPROVE_KEY),
    },
    approval.approve,
  );

  r.get(
    '/api/v1/p/:pariwarId/field-workers/:fieldWorkerId/code',
    {
      schema: { params: FieldWorkerParams, response: { 200: FieldWorkerCodeResponse }, tags: [TAG] },
      config: { rateLimit: limits.read },
      preHandler: perWorker(FIELD_WORKER_READ_CODE_KEY),
    },
    reads.readCode,
  );

  // ── Story 13.1c (AD6) — the lifecycle acts and the log. The bodies are validated (400 `request.validation`) BEFORE the hooks run:
  // a reason outside the act's own list never reaches the domain (its 422 `reason_invalid` stays mapped but unreachable here). ──
  const lifecycle = createFieldWorkerLifecycleHandlers(deps);
  const logs = createFieldWorkerLogHandlers();
  r.post(
    '/api/v1/p/:pariwarId/field-workers/:fieldWorkerId/move',
    {
      schema: { params: FieldWorkerParams, body: MoveFieldWorkerRequest, response: { 200: FieldWorkerLifecycleResult }, tags: [TAG] },
      preHandler: perWorker(FIELD_WORKER_MOVE_KEY),
    },
    lifecycle.move,
  );
  r.post(
    '/api/v1/p/:pariwarId/field-workers/:fieldWorkerId/suspend',
    {
      schema: { params: FieldWorkerParams, body: SuspendFieldWorkerRequest, response: { 200: FieldWorkerLifecycleResult }, tags: [TAG] },
      preHandler: perWorker(FIELD_WORKER_SUSPEND_KEY),
    },
    lifecycle.suspend,
  );
  r.post(
    '/api/v1/p/:pariwarId/field-workers/:fieldWorkerId/reactivate',
    {
      schema: { params: FieldWorkerParams, body: ReactivateFieldWorkerRequest, response: { 200: FieldWorkerLifecycleResult }, tags: [TAG] },
      preHandler: perWorker(FIELD_WORKER_REACTIVATE_KEY),
    },
    lifecycle.reactivate,
  );
  r.post(
    '/api/v1/p/:pariwarId/field-workers/:fieldWorkerId/terminate',
    {
      schema: { params: FieldWorkerParams, body: TerminateFieldWorkerRequest, response: { 200: FieldWorkerLifecycleResult }, tags: [TAG] },
      preHandler: perWorker(FIELD_WORKER_TERMINATE_KEY),
    },
    lifecycle.terminate,
  );

  r.get(
    '/api/v1/p/:pariwarId/field-workers/:fieldWorkerId/log',
    {
      schema: { params: FieldWorkerParams, querystring: FieldWorkerLogQuery, response: { 200: FieldWorkerLog }, tags: [TAG] },
      config: { rateLimit: limits.read },
      preHandler: perWorker(FIELD_WORKER_READ_LOG_KEY),
    },
    logs.log,
  );
}
