// Story 13.1 (QE18 (c), AC9) — `requirePermissionHook` STORES the verified authorization its gate produced on
// `request.authorizations[key]`, on a FRESH object per request. No DB: a fake request carrying `scopeTx` / `scopeGrants`
// (what scope-resolution attaches), the REAL hook and the REAL domain check. The hook lives in `apps/api`, which
// `packages/domain/tests` cannot import — so this is its own test (the domain side is `tests/rbac/check.test.ts`).

import { rbac, AuthorizationDeniedError } from '@twt/domain';
import type { FastifyRequest } from 'fastify';
import { describe, expect, it } from 'vitest';

import type { AuthAuditEvent, AuthAuditSink } from '../../src/audit/audit-sink.js';
import type { AppDeps } from '../../src/context.js';
import { requirePermissionHook } from '../../src/modules/rbac/index.js';
import type { ScopeTx } from '../../src/types.js';

const ACTOR = '22222222-2222-2222-2222-222222222222';
const P = '11111111-1111-1111-1111-111111111111';
const GRANT_ID = '33333333-3333-4333-8333-333333333333';

class CapturingSink implements AuthAuditSink {
  public readonly events: AuthAuditEvent[] = [];
  public emit(event: AuthAuditEvent): void {
    this.events.push(event);
  }
}

function deps(sink: AuthAuditSink): AppDeps {
  return { auditSink: sink, clock: () => new Date('2026-11-03T00:00:00.000Z') } as unknown as AppDeps;
}

function fakeRequest(grants: rbac.EffectiveGrant[], body: unknown): FastifyRequest {
  return {
    requestContext: { actorId: ACTOR, traceId: 'trace-1' },
    scopeTx: { pariwarId: P, scopeSet: true } as unknown as ScopeTx,
    scopeGrants: grants,
    geoTree: null,
    body,
  } as unknown as FastifyRequest;
}

function run(hook: ReturnType<typeof requirePermissionHook>, req: FastifyRequest): Promise<void> {
  return (hook as unknown as (request: FastifyRequest) => Promise<void>)(req);
}

const districtGate = (sink: AuthAuditSink) =>
  requirePermissionHook(deps(sink), 'field_worker.register', {
    dimension: 'district',
    resolveValue: (r) => {
      const d = (r.body as { district?: unknown } | undefined)?.district;
      return typeof d === 'string' ? d : null;
    },
  });

describe('requirePermissionHook stores the verified authorization (Story 13.1, QE18 (c))', () => {
  it('on ALLOW: request.authorizations[key] is the VERIFIED result of THIS gate (key, role, grant id, the body target, the actor)', async () => {
    const sink = new CapturingSink();
    const req = fakeRequest(
      [{ pariwarId: P, role: 'district_admin', scopeDimension: 'district', scopeValue: 'Patna', grantId: GRANT_ID }],
      { district: 'Patna' },
    );
    await run(districtGate(sink), req);
    const stored = req.authorizations?.['field_worker.register'];
    expect(rbac.isVerifiedAuthorization(stored)).toBe(true);
    expect(stored).toEqual({
      permissionKey: 'field_worker.register',
      role: 'district_admin',
      pariwarId: P,
      actorId: ACTOR,
      grant: { dimension: 'district', value: 'Patna', grantId: GRANT_ID },
      target: { dimension: 'district', value: 'Patna' },
      catalogVersion: rbac.PERMISSION_CATALOG_VERSION,
    });
    expect(sink.events).toEqual([]);
  });

  it('a FRESH object per request — two requests never share `authorizations`', async () => {
    const sink = new CapturingSink();
    const grants: rbac.EffectiveGrant[] = [{ pariwarId: P, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: P }];
    const a = fakeRequest(grants, { district: 'Patna' });
    const b = fakeRequest(grants, { district: 'Gaya' });
    const gate = districtGate(sink);
    await run(gate, a);
    await run(gate, b);
    expect(a.authorizations).not.toBe(b.authorizations);
    expect(a.authorizations?.['field_worker.register']?.target.value).toBe('Patna');
    expect(b.authorizations?.['field_worker.register']?.target.value).toBe('Gaya');
  });

  it('two gates on one request keep BOTH results, keyed by permission key', async () => {
    const sink = new CapturingSink();
    const req = fakeRequest(
      [{ pariwarId: P, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: P }],
      { district: 'Patna' },
    );
    await run(districtGate(sink), req);
    await run(requirePermissionHook(deps(sink), 'module.manage'), req);
    expect(Object.keys(req.authorizations ?? {}).sort()).toEqual(['field_worker.register', 'module.manage']);
    expect(req.authorizations?.['module.manage']?.target).toEqual({ dimension: 'pariwar', value: P });
  });

  it('on DENY: throws AuthorizationDeniedError, fires the audit seam, and stores NOTHING', async () => {
    const sink = new CapturingSink();
    const req = fakeRequest(
      [{ pariwarId: P, role: 'district_admin', scopeDimension: 'district', scopeValue: 'Patna', grantId: GRANT_ID }],
      { district: 'Gaya' },
    );
    await expect(run(districtGate(sink), req)).rejects.toBeInstanceOf(AuthorizationDeniedError);
    expect(req.authorizations).toBeUndefined();
    expect(sink.events.map((e) => e.type)).toContain('authz.denied');
  });

  it('a non-string body district resolves to null and fails CLOSED (TR12) — even for a pariwar_admin', async () => {
    const sink = new CapturingSink();
    const req = fakeRequest([{ pariwarId: P, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: P }], { district: 42 });
    await expect(run(districtGate(sink), req)).rejects.toBeInstanceOf(AuthorizationDeniedError);
    expect(req.authorizations).toBeUndefined();
  });
});
