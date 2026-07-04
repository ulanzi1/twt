// Fastify application factory (AC-5).
//
// `buildServer(deps)` returns a fully-`ready()` Fastify instance bound to an
// injected `AppDeps` (config + pool + KMS + audit/step-up/turnstile seams +
// clock). Exported for tests — `fastify.inject` drives it in-process without a
// port (no supertest, per Task 8). The boot guard (index.ts) wires production
// deps and calls `listen`.
//
// Registration order is load-bearing:
//   1. Zod validator/serializer compilers (so route schemas validate).
//   2. Error handler (maps every throw to the ErrorResponse envelope).
//   3. request-context onRequest hook (traceId + ALS + encryption context) FIRST.
//   4. cookie → session → csrf (session needs cookie; csrf needs session).
//   5. rate-limit, swagger.
//   6. origin/referer onRequest hook (after session-load; defense-in-depth).
//   7. routes: health (Task 1), then the admin-auth module (Task 4).

import Fastify, { type FastifyInstance } from 'fastify';

import type { AppDeps } from './context.js';
import { registerHealthRoutes } from './health.js';
import { errorMappingHandler } from './middleware/error-mapping/index.js';
import { requestContextHook } from './middleware/request-context/index.js';
import { registerAuditLogModule } from './modules/audit-log/index.js';
import { registerAdminAuthModule } from './modules/auth/admin/index.js';
import { registerMemberAuthModule } from './modules/auth/member/index.js';
import { registerKycModule } from './modules/kyc/index.js';
import { registerLifeEventsModule } from './modules/life-events/index.js';
import { registerMedicalModule } from './modules/medical/index.js';
import { registerMemberHomeModule } from './modules/member-home/index.js';
import { registerMemberValidityModule } from './modules/member-validity/index.js';
import { registerMemberTermsModule } from './modules/terms/index.js';
import { registerNomineeModule } from './modules/nominee/index.js';
import { registerVyawasthaShulkModule } from './modules/vyawastha-shulk/index.js';
import { registerMultiTenant } from './modules/multi-tenant/index.js';
import { registerPariwarProvisioningModule } from './modules/pariwar-provisioning/index.js';
import { registerRulesModule } from './modules/rules/index.js';
import { registerTermsModule } from './modules/terms-and-conditions/index.js';
import { registerDataExportModule } from './modules/data-export/index.js';
import { registerRtbfModule } from './modules/rtbf/index.js';
import { registerWithdrawalModule } from './modules/withdrawal/index.js';
import { registerCookie } from './plugins/cookie/index.js';
import { registerCsrf, originCheckHook } from './plugins/csrf-protection/index.js';
import { registerRateLimit } from './plugins/rate-limit/index.js';
import { registerMemberJwt } from './plugins/jwt/index.js';
import { registerHoneypot, registerSecurityHeaders } from './plugins/security-headers/index.js';
import { registerSession } from './plugins/session/index.js';
import { registerSwagger } from './plugins/swagger/index.js';
import { registerZodOpenapi } from './plugins/zod-openapi/index.js';
import { collectRoutes } from './route-registry.js';

export async function buildServer(deps: AppDeps): Promise<FastifyInstance> {
  const app = Fastify({
    // Quiet in tests; structured logs otherwise. The raw-logger ban + audit-log
    // wrapper land at Story 1.10 (deferred lint TODO in eslint-config-twt).
    logger: deps.config.nodeEnv === 'test' ? false : { level: process.env['LOG_LEVEL'] ?? 'info' },
    // Trust the proxy hop (Cloud Run / Dokploy) so request.ip + origin are accurate.
    trustProxy: true,
    // The session cookie + CSRF flows need the body; cap it defensively.
    bodyLimit: 1_048_576,
  });

  registerZodOpenapi(app);
  app.setErrorHandler(errorMappingHandler);

  // Record every route into the registry FIRST so the AC-2 login-wall + AC-3
  // forced-pagination guards can introspect the full table (Story 1.14).
  collectRoutes(app);

  // X-Robots-Tag: noindex, nofollow on every response (FR-92). onSend runs late, so
  // registering the hook here covers all routes declared below.
  registerSecurityHeaders(app);

  // Unmatched routes get the same ErrorResponse envelope (the global onRequest
  // hooks have already set request.requestContext, so traceId is present).
  app.setNotFoundHandler((request, reply) => {
    const requestId = request.requestContext?.traceId ?? 'unknown';
    void reply.status(404).send({
      error: { code: 'request.not_found', message: 'Not found', request_id: requestId },
    });
  });

  // request-context FIRST so traceId + ALS + encryption context exist for all hooks.
  app.addHook('onRequest', requestContextHook(deps));

  await registerCookie(app);
  await registerSession(app, deps);
  await registerCsrf(app);
  await registerRateLimit(app, deps);
  // Member (mobile) JWT — access-token + signup-continuation signing/verification
  // (Story 3.2). Independent of @fastify/session; adds no automatic auth (the member
  // routes call the member-session guard explicitly).
  await registerMemberJwt(app, deps);
  await registerSwagger(app);

  // Defense-in-depth Origin/Referer check on state-changing requests.
  app.addHook('onRequest', originCheckHook(deps));

  registerHealthRoutes(app, deps);
  registerMultiTenant(app, deps);
  registerAdminAuthModule(app, deps);
  // Story 3.2 — member mobile+OTP auth surface (token-bearer; the first non-admin
  // authenticated surface). Public OTP/refresh/select + member-session-gated step-up.
  registerMemberAuthModule(app, deps);
  // Story 3.3b — member KYC signup surface (DigiLocker pull + manual fallback). Drives the
  // Story 3.1 lifecycle (member.kyc_completed / member.kyc_manual_fallback) + consumes the
  // 3.3a KycProvider seam. Member-session-gated, except the PUBLIC state-correlated callback.
  registerKycModule(app, deps);
  // Story 3.4 — member nominee-declaration signup surface (1–2 nominees, server-derived
  // 75/25 split, Tier-1 encrypted; emits member.nominees_declared, a non-transition marker).
  // Member-session-gated; NO step-up at signup (Life Events update + step-up is Story 3.9).
  registerNomineeModule(app, deps);
  // Story 3.5 — member medical-disclosure signup surface (0..N IMA conditions + concealment-
  // denial ack, Tier-1 encrypted, APPEND-ONLY history; records a consent via the audit-or-throw
  // chain + emits member.medical_disclosed, a non-transition marker). Member-session-gated; NO
  // step-up at signup (Life Events update + step-up is Story 3.9).
  registerMedicalModule(app, deps);
  // Story 3.6a — member-facing T&C read/accept signup surface (the SECOND consent-registry
  // consumer; records a tc_acceptance consent via the audit-or-throw chain). Member-session-gated;
  // distinct from the trustee terms-and-conditions authoring module above.
  registerMemberTermsModule(app, deps);
  // Story 3.6b — member signup ₹110 Vyawastha Shulk surface (UPI Intent + UTR self-attest →
  // AR-67 receipt always; the FIRST production member.vyawastha_shulk_paid + member.lock_in_entered
  // caller, emitted ONLY when the 5-condition lock-in gate passes). Member-session-gated.
  registerVyawasthaShulkModule(app, deps);
  // Story 3.7 — member home-screen lock-in clock widget read surface (GET /member/lock-in-status; the
  // read seam over the 3.6b member.lock_in_entered marker — countdown + clause ref + unlock date).
  // Member-session-gated; NO write path / event / schema change.
  registerMemberHomeModule(app, deps);
  // Story 4.7 — FR-12A member-validity read surfaces: member-self (GET /member/validity; redacted, not
  // audited) + admin (GET /p/:pariwarId/admin/members/:memberId/validity; scope-gated, audited) + the
  // AR-65 admin member-search (POST …/admin/members/search over member_search_projection). Redaction +
  // audit stay in @twt/validity-service; this module maps service payload → wire DTO.
  registerMemberValidityModule(app, deps);
  // Story 3.9 — member Life Events panel surface (FR-5): update nominees / address / transfer-in-out
  // / medical disclosure. Nominee + medical REUSE the 3.4/3.5 declare/submit services behind a member
  // step-up gate ('nominee_change' / 'medical_change'); address + posting are NEW append-only writes
  // (NO step-up) emitting the two non-transition markers member.address_updated / member.posting_updated.
  registerLifeEventsModule(app, deps);
  // Story 3.10 — member voluntary-withdrawal surface (FR-6): step-up-gated confirm ('withdrawal'
  // context) → member.withdrawal_completed transition to `withdrawn` (₹110 forfeited; 12-month rejoin
  // lock written; history retained until Story 3.12 anonymizes). Signup rejoin-lock enforcement lives
  // in the member-auth signup handler (a pre-scope cross-tenant read), not here.
  registerWithdrawalModule(app, deps);
  // Story 3.11 — member DPDPA data-export surface (FR-95): request (session) + status-poll (session) +
  // one-time, 24h, step-up-gated ('data_export' context) ZIP download stream. The FIRST api-side queue
  // producer (enqueues DATA_EXPORT_BUILD via deps.dataExportQueue); the build/vacuum workers are apps/jobs.
  registerDataExportModule(app, deps);
  // Story 3.12 — member RTBF anonymization surface (FR-96 / DPDPA Right-To-Be-Forgotten): step-up-gated
  // confirm ('rtbf' context) → member.rtbf_anonymized transition to `anonymized` + field-level PII
  // anonymization (the inverse of the 3.11 data-export assemble). SOFT-DELETE — the member row + event
  // stream + contribution/payment/consent history are retained; only PII fields are overwritten/nulled;
  // mobile_blind_index is retained so the 3.10 12-month rejoin lock keeps firing.
  registerRtbfModule(app, deps);
  // Story 1.11a — global on-demand audit-integrity verification endpoint.
  registerAuditLogModule(app, deps);
  // Story 1.15 — global multi-Pariwar provisioning surface (pariwar.provision gate).
  registerPariwarProvisioningModule(app, deps);
  // Story 2.4 — Niyamavali amendment workflow (tenant-scoped; the first consumer of
  // the Story 2.2 tone-review publish gate).
  registerRulesModule(app, deps);
  // Story 2.6 — T&C version registry trustee write surface (tenant-scoped;
  // audit-or-throw create + approve, gated on tc.publish / tc.approve).
  registerTermsModule(app, deps);
  // Story 1.14 — honeypot trap routes (emit abuse.honeypot on a hit; hidden).
  registerHoneypot(app, deps);

  await app.ready();
  return app;
}
