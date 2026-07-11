import { describe, expect, it } from 'vitest';

import { evaluateAdjudicationRoute, scanAdjudicationRoutes, scanRouteRegistrations } from './lib.js';

// The known-bad + known-good fixtures are embedded INLINE here (the exact claim-state-invariant /
// claim-canonical-id-invariant precedent — NOT a separate fixture file). They prove the gate's teeth
// before Story 6.11's approve/deny/escalate endpoints exist.

const COVERED = ['verifier-console', 'approve', 'deny', 'escalate'];

/** A CONFORMANT adjudication route (the shape claims.verifier-console.routes.ts ships). */
const GOOD_ROUTE = `
  export function register(app, deps) {
    const r = app.withTypeProvider();
    const adminSession = requireAdminSession(deps);
    const scope = scopeResolutionHook(deps);
    const requireVerify = requirePermissionHook(deps, 'claim.verify', { dimension: 'district', resolveValue });
    r.get('/api/v1/p/:pariwarId/admin/claims/:claimCaseId/verifier-console',
      { schema: {}, preHandler: [adminSession, scope, resolveDistrict, requireVerify] },
      h.getVerifierConsole);
  }
`;

describe('scanAdjudicationRoutes — human-actor invariant gate teeth', () => {
  // ── SELF-GREEN: the real 6.10 shape must pass ──────────────────────────────────

  it('PASSES the conformant [adminSession, scope, requirePermissionHook] chain', () => {
    const { findings, matchedPaths } = scanAdjudicationRoutes('verifier-console.routes.ts', GOOD_ROUTE, COVERED);
    expect(matchedPaths).toHaveLength(1);
    expect(findings).toHaveLength(0);
  });

  // ── KNOWN-BAD fixtures (the teeth) ─────────────────────────────────────────────

  it('FLAGS an adjudication route MISSING the permission hook', () => {
    const src = `
      export function register(app, deps) {
        const r = app.withTypeProvider();
        const adminSession = requireAdminSession(deps);
        const scope = scopeResolutionHook(deps);
        r.post('/api/v1/p/:pariwarId/admin/claims/:claimCaseId/approve',
          { preHandler: [adminSession, scope] }, h.approve);
      }`;
    const { findings } = scanAdjudicationRoutes('decision.routes.ts', src, COVERED);
    expect(findings.some((f) => /missing the PERMISSION hook/.test(f.detail))).toBe(true);
  });

  it('FLAGS an adjudication route MISSING the admin session guard', () => {
    const src = `
      export function register(app, deps) {
        const r = app.withTypeProvider();
        const scope = scopeResolutionHook(deps);
        const requireApprove = requirePermissionHook(deps, 'claim.approve', {});
        r.post('/api/v1/p/:pariwarId/admin/claims/:claimCaseId/deny',
          { preHandler: [scope, requireApprove] }, h.deny);
      }`;
    const { findings } = scanAdjudicationRoutes('decision.routes.ts', src, COVERED);
    expect(findings.some((f) => /missing the admin SESSION guard/.test(f.detail))).toBe(true);
  });

  it('FLAGS a forbidden non-human actor hook (a system/service principal) on an adjudication route', () => {
    const src = `
      export function register(app, deps) {
        const r = app.withTypeProvider();
        const adminSession = requireAdminSession(deps);
        const scope = scopeResolutionHook(deps);
        const requireApprove = requirePermissionHook(deps, 'claim.approve', {});
        const systemActor = requireSystemActor(deps);
        r.post('/api/v1/p/:pariwarId/admin/claims/:claimCaseId/escalate',
          { preHandler: [adminSession, scope, requireApprove, systemActor] }, h.escalate);
      }`;
    const { findings } = scanAdjudicationRoutes('decision.routes.ts', src, COVERED);
    expect(findings.some((f) => /forbidden non-human actor hook/.test(f.detail))).toBe(true);
  });

  it('FLAGS an adjudication route with NO preHandler chain at all', () => {
    const src = `
      export function register(app) {
        const r = app.withTypeProvider();
        r.post('/api/v1/p/:pariwarId/admin/claims/:claimCaseId/approve', { schema: {} }, h.approve);
      }`;
    const { findings } = scanAdjudicationRoutes('decision.routes.ts', src, COVERED);
    expect(findings.some((f) => /NO preHandler chain/.test(f.detail))).toBe(true);
  });

  it('resolves the hook category through a directly-called factory in the array (inline requirePermissionHook)', () => {
    const src = `
      export function register(app, deps) {
        const r = app.withTypeProvider();
        const adminSession = requireAdminSession(deps);
        const scope = scopeResolutionHook(deps);
        r.get('/api/v1/p/:pariwarId/admin/claims/:claimCaseId/verifier-console',
          { preHandler: [adminSession, scope, requirePermissionHook(deps, 'claim.verify', {})] }, h.read);
      }`;
    const { findings } = scanAdjudicationRoutes('verifier-console.routes.ts', src, COVERED);
    expect(findings).toHaveLength(0);
  });

  it('does NOT credit a disguised machine-actor hook merely named `require*` as the permission hook (code review 2026-07-11)', () => {
    const src = `
      export function register(app, deps) {
        const r = app.withTypeProvider();
        const adminSession = requireAdminSession(deps);
        const scope = scopeResolutionHook(deps);
        const requireWorkerToken = someMachineGuard(deps);
        r.post('/api/v1/p/:pariwarId/admin/claims/:claimCaseId/approve',
          { preHandler: [adminSession, scope, requireWorkerToken] }, h.approve);
      }`;
    const { findings } = scanAdjudicationRoutes('decision.routes.ts', src, COVERED);
    expect(findings.some((f) => /missing the PERMISSION hook/.test(f.detail))).toBe(true);
  });

  it('FLAGS a spread element in the preHandler array as unresolved rather than silently passing (code review 2026-07-11)', () => {
    const src = `
      export function register(app, deps) {
        const r = app.withTypeProvider();
        const adminSession = requireAdminSession(deps);
        const scope = scopeResolutionHook(deps);
        const requireApprove = requirePermissionHook(deps, 'claim.approve', {});
        r.post('/api/v1/p/:pariwarId/admin/claims/:claimCaseId/deny',
          { preHandler: [adminSession, scope, ...maybeHiddenHooks, requireApprove] }, h.deny);
      }`;
    const { findings } = scanAdjudicationRoutes('decision.routes.ts', src, COVERED);
    expect(findings.some((f) => /could not be statically classified/.test(f.detail))).toBe(true);
  });

  // ── Scoping: a NON-covered route in the same file is not an adjudication route ──

  it('IGNORES a non-adjudication route (path not in the coverage set) even if it lacks a permission hook', () => {
    const src = `
      export function register(app, deps) {
        const r = app.withTypeProvider();
        const adminSession = requireAdminSession(deps);
        r.get('/api/v1/p/:pariwarId/admin/health', { preHandler: [adminSession] }, h.health);
      }`;
    const { findings, matchedPaths } = scanAdjudicationRoutes('health.routes.ts', src, COVERED);
    expect(matchedPaths).toHaveLength(0);
    expect(findings).toHaveLength(0);
  });

  it('does NOT match a token inside a comment or unrelated string', () => {
    const src = `
      // this file has no approve/deny/escalate route; requirePermissionHook is mentioned in prose only
      export const NOTE = 'verifier-console is read-only';
      export function register(app) { app.get('/api/v1/p/:pariwarId/admin/other', {}, h.other); }`;
    const { findings, matchedPaths } = scanAdjudicationRoutes('notes.ts', src, COVERED);
    expect(matchedPaths).toHaveLength(0);
    expect(findings).toHaveLength(0);
  });
});

describe('scanRouteRegistrations + evaluateAdjudicationRoute — units', () => {
  it('classifies the three human-actor hooks from local const bindings', () => {
    const regs = scanRouteRegistrations('r.ts', GOOD_ROUTE);
    expect(regs).toHaveLength(1);
    expect(regs[0]!.hooks).toEqual({ session: true, scope: true, permission: true });
    expect(regs[0]!.forbidden).toHaveLength(0);
    expect(evaluateAdjudicationRoute('r.ts', regs[0]!)).toHaveLength(0);
  });
});
