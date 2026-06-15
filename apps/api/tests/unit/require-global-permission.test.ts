// Unit tests for the Story 1.15 `requireGlobalPermission` primitive (AC-1a).
//
// The global-scope sibling of `requirePermissionHook`. Because it loads grants
// from `deps.servicePool` (BYPASSRLS, all tenants) rather than a scope tx, we can
// exercise the full allow/deny matrix with a fake pool — no DB needed. The
// integration suite (provisioning + audit-retrofit specs) covers the 401/403 wire
// path end-to-end; this nails the pure decision logic + the programming-error guard.

import type { FastifyRequest } from 'fastify';
import type pg from 'pg';
import { describe, expect, it } from 'vitest';

import type { AuthAuditEvent, AuthAuditSink } from '../../src/audit/audit-sink.js';
import type { AppDeps } from '../../src/context.js';
import { requireGlobalPermission } from '../../src/modules/rbac/index.js';

const ACTOR = '22222222-2222-2222-2222-222222222222';
const A_PARIWAR = '11111111-1111-1111-1111-111111111111';

interface RoleGrantRow {
  pariwar_id: string;
  role: string;
  scope_dimension: string;
  scope_value: string | null;
}

class CapturingSink implements AuthAuditSink {
  public readonly events: AuthAuditEvent[] = [];
  public emit(event: AuthAuditEvent): void {
    this.events.push(event);
  }
}

function fakeDeps(rows: RoleGrantRow[], sink: AuthAuditSink): { deps: AppDeps; poolCalls: () => number } {
  let calls = 0;
  const servicePool = {
    query: async () => {
      calls += 1;
      return { rows };
    },
  } as unknown as pg.Pool;
  const deps = {
    servicePool,
    auditSink: sink,
    clock: () => new Date('2026-06-15T00:00:00.000Z'),
  } as unknown as AppDeps;
  return { deps, poolCalls: () => calls };
}

function fakeRequest(actorId: string | undefined): FastifyRequest {
  return {
    requestContext: { actorId, traceId: 'trace-1' },
  } as unknown as FastifyRequest;
}

/**
 * Invoke a `preHandlerHookHandler` with just a request. The Fastify type union
 * declares the 3-arg (request, reply, done) form; our hooks are the async
 * 1-arg form, so cast to call them directly without a fake reply/done.
 */
function run(hook: ReturnType<typeof requireGlobalPermission>, req: FastifyRequest): Promise<void> {
  return (hook as unknown as (request: FastifyRequest) => Promise<void>)(req);
}

describe('requireGlobalPermission (Story 1.15, AC-1a)', () => {
  it('ALLOWS a super_admin holding the key at global scope', async () => {
    const sink = new CapturingSink();
    const { deps } = fakeDeps(
      [{ pariwar_id: A_PARIWAR, role: 'super_admin', scope_dimension: 'global', scope_value: null }],
      sink,
    );
    const hook = requireGlobalPermission(deps, 'pariwar.provision');
    await expect(run(hook, fakeRequest(ACTOR))).resolves.toBeUndefined();
    expect(sink.events).toHaveLength(0); // no authz.denied on allow
  });

  it('DENIES (403) a pariwar-scoped-only admin — global filter rejects the tenant grant', async () => {
    const sink = new CapturingSink();
    const { deps } = fakeDeps(
      [{ pariwar_id: A_PARIWAR, role: 'pariwar_admin', scope_dimension: 'pariwar', scope_value: A_PARIWAR }],
      sink,
    );
    const hook = requireGlobalPermission(deps, 'pariwar.provision');
    await expect(run(hook, fakeRequest(ACTOR))).rejects.toThrow();
    // The audit seam fired with a null pariwarId + the right key (global denial).
    expect(sink.events).toHaveLength(1);
    expect(sink.events[0]!.type).toBe('authz.denied');
    expect(sink.events[0]!.pariwarId).toBeNull();
    expect((sink.events[0]!.context as { permissionKey: string }).permissionKey).toBe('pariwar.provision');
  });

  it('DENIES an unknown role (no bundle → fail-closed), even at global scope', async () => {
    const sink = new CapturingSink();
    const { deps } = fakeDeps(
      [{ pariwar_id: A_PARIWAR, role: 'not_a_real_role', scope_dimension: 'global', scope_value: null }],
      sink,
    );
    const hook = requireGlobalPermission(deps, 'pariwar.provision');
    await expect(run(hook, fakeRequest(ACTOR))).rejects.toThrow();
    expect(sink.events).toHaveLength(1);
    expect(sink.events[0]!.type).toBe('authz.denied');
  });

  it('FAILS LOUD (500-path, no grant query) when actorId is absent — programming error', async () => {
    const sink = new CapturingSink();
    const { deps, poolCalls } = fakeDeps([], sink);
    const hook = requireGlobalPermission(deps, 'pariwar.provision');
    await expect(run(hook, fakeRequest(undefined))).rejects.toThrow(/without an admin session/);
    expect(poolCalls()).toBe(0); // never reached the grant load
    expect(sink.events).toHaveLength(0); // not an authz denial — a misconfiguration
  });

  it('enforces the SAME gate for audit.verify (AC-1b retrofit key)', async () => {
    const sink = new CapturingSink();
    const allow = fakeDeps(
      [{ pariwar_id: A_PARIWAR, role: 'super_admin', scope_dimension: 'global', scope_value: null }],
      sink,
    );
    await expect(
      run(requireGlobalPermission(allow.deps, 'audit.verify'), fakeRequest(ACTOR)),
    ).resolves.toBeUndefined();

    const denySink = new CapturingSink();
    const deny = fakeDeps(
      [{ pariwar_id: A_PARIWAR, role: 'auditor', scope_dimension: 'pariwar', scope_value: A_PARIWAR }],
      denySink,
    );
    await expect(
      run(requireGlobalPermission(deny.deps, 'audit.verify'), fakeRequest(ACTOR)),
    ).rejects.toThrow();
  });
});
