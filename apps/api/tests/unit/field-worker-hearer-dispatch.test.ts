// Story 13.1f (AD9, code review round 2 R2C-2) — the appeal hearer dispatcher (`requireEndingAppealHearer`).
//
// No DB. Two groups:
//   (1) the REAL hooks, the REAL `holdsPermission`, the REAL dispatcher and a CAPTURING denial sink, over fake requests carrying
//       `scopeGrants` (what scope-resolution attaches). This is where the finding lives: with NO hearer to match (a lodge on a worker who
//       is not terminated) the old dispatcher ran the Panel's hook first for everyone and swallowed its error, so an AUTHORISED Pariwar
//       Admin left an `authz.denied` for the Panel's key in the security stream although nothing was denied.
//   (2) STUB hooks, for what a real hook cannot be made to do: throw an infrastructure error. The old `catch {}` swallowed it and let the
//       other hook decide.
// ⚠ The sink is the whole point of group (1): a test that only asserted "the request passed" would be green on the old code too.

import { rbac } from '@twt/domain';
import { AuthorizationDeniedError } from '@twt/domain';
import type { FastifyRequest, preHandlerHookHandler } from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import type { AuthAuditEvent, AuthAuditSink } from '../../src/audit/audit-sink.js';
import type { AppDeps } from '../../src/context.js';
import { FIELD_WORKER_HEAR_ENDING_APPEAL_AS_PANEL_KEY, FIELD_WORKER_HEAR_ENDING_APPEAL_KEY } from '../../src/modules/field-worker/ending-appeal-handlers.js';
import { endingAppealGateDistrict, requireEndingAppealHearer } from '../../src/modules/field-worker/gate.js';
import { holdsPermission, requirePermissionHook } from '../../src/modules/rbac/index.js';
import type { ScopeTx } from '../../src/types.js';

const ACTOR = '22222222-2222-2222-2222-222222222222';
const P = '11111111-1111-1111-1111-111111111111';

class CapturingSink implements AuthAuditSink {
  public readonly events: AuthAuditEvent[] = [];
  public emit(event: AuthAuditEvent): void {
    this.events.push(event);
  }
}
const keysDenied = (sink: CapturingSink) => sink.events.filter((e) => e.type === 'authz.denied').map((e) => (e.context as { permissionKey: string }).permissionKey);

const GRANTS = {
  pariwarAdmin: [{ pariwarId: P, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: P }],
  trustee: [{ pariwarId: P, role: 'trustee_panel', scopeDimension: 'pariwar', scopeValue: P }],
  districtAdminPatna: [{ pariwarId: P, role: 'district_admin', scopeDimension: 'district', scopeValue: 'Patna' }],
  // Review R3-23 — the shapes the equality test missed: a global super_admin (the cross-Pariwar branch of the grant check), a trustee who is
  // also a Pariwar Admin, and a District Admin of ANOTHER district.
  superAdmin: [{ pariwarId: P, role: 'super_admin', scopeDimension: 'global', scopeValue: null }],
  trusteeAndPariwarAdmin: [
    { pariwarId: P, role: 'trustee_panel', scopeDimension: 'pariwar', scopeValue: P },
    { pariwarId: P, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: P },
  ],
  districtAdminGaya: [{ pariwarId: P, role: 'district_admin', scopeDimension: 'district', scopeValue: 'Gaya' }],
} as const satisfies Record<string, rbac.EffectiveGrant[]>;

function fakeRequest(grants: readonly rbac.EffectiveGrant[], stash: { heardBy: 'pariwar_admin' | 'trustee_panel' | null | undefined; district: string | null }): FastifyRequest {
  return {
    requestContext: { actorId: ACTOR, traceId: 'trace-1' },
    scopeTx: { pariwarId: P, scopeSet: true } as unknown as ScopeTx,
    scopeGrants: grants,
    geoTree: null,
    endingAppealHeardBy: stash.heardBy,
    endingAppealGateDistrict: stash.district,
  } as unknown as FastifyRequest;
}

/** The three pieces the routes build, over a given sink — the SAME construction as `routes.ts`'s `hearHooks`. */
function realDispatcher(sink: CapturingSink): preHandlerHookHandler {
  const deps = { auditSink: sink, clock: () => new Date('2026-11-19T00:00:00.000Z') } as unknown as AppDeps;
  const opts = { dimension: 'district', resolveValue: endingAppealGateDistrict } as const;
  return requireEndingAppealHearer({
    pariwarAdmin: requirePermissionHook(deps, FIELD_WORKER_HEAR_ENDING_APPEAL_KEY, opts),
    panel: requirePermissionHook(deps, FIELD_WORKER_HEAR_ENDING_APPEAL_AS_PANEL_KEY, opts),
    holdsPanel: holdsPermission(FIELD_WORKER_HEAR_ENDING_APPEAL_AS_PANEL_KEY, opts),
  });
}
const run = (hook: preHandlerHookHandler, req: FastifyRequest): Promise<void> => (hook as unknown as (r: FastifyRequest) => Promise<void>)(req);

describe('the hearer dispatcher, over the REAL hooks (AD9, R2C-2)', () => {
  it('NO hearer + an authorised Pariwar Admin: passes through the Pariwar Admin key and records NO denial (the Panel key was never asked of them)', async () => {
    const sink = new CapturingSink();
    const req = fakeRequest(GRANTS.pariwarAdmin, { heardBy: null, district: 'Patna' });
    await run(realDispatcher(sink), req);
    expect(keysDenied(sink), 'an authorised officer left a denial in the security stream').toEqual([]);
    expect(Object.keys(req.authorizations ?? {})).toEqual([FIELD_WORKER_HEAR_ENDING_APPEAL_KEY]);
  });

  it('NO hearer + a trustee: passes through the PANEL key, no denial', async () => {
    const sink = new CapturingSink();
    const req = fakeRequest(GRANTS.trustee, { heardBy: null, district: 'Patna' });
    await run(realDispatcher(sink), req);
    expect(keysDenied(sink)).toEqual([]);
    expect(Object.keys(req.authorizations ?? {})).toEqual([FIELD_WORKER_HEAR_ENDING_APPEAL_AS_PANEL_KEY]);
  });

  it('NO hearer + an actor holding NEITHER key (a District Admin): ONE true denial, for the Pariwar Admin key - not a Panel denial AND a Pariwar Admin denial', async () => {
    const sink = new CapturingSink();
    const req = fakeRequest(GRANTS.districtAdminPatna, { heardBy: null, district: 'Patna' });
    await expect(run(realDispatcher(sink), req)).rejects.toBeInstanceOf(AuthorizationDeniedError);
    expect(keysDenied(sink)).toEqual([FIELD_WORKER_HEAR_ENDING_APPEAL_KEY]);
  });

  it('NO hearer + an unknown worker (NULL district): still fails closed - one denial, the Pariwar Admin key, for BOTH an officer and a trustee (the 403 is unchanged)', async () => {
    for (const grants of [GRANTS.pariwarAdmin, GRANTS.trustee]) {
      const sink = new CapturingSink();
      await expect(run(realDispatcher(sink), fakeRequest(grants, { heardBy: null, district: null }))).rejects.toBeInstanceOf(AuthorizationDeniedError);
      expect(keysDenied(sink)).toEqual([FIELD_WORKER_HEAR_ENDING_APPEAL_KEY]);
    }
  });

  it('a hearer IS fixed: the Panel-heard ending admits the trustee and refuses a Pariwar Admin; the Pariwar-Admin-heard one the reverse - each with ONE denial, for the key the ending requires', async () => {
    const cases = [
      { heardBy: 'trustee_panel', grants: GRANTS.trustee, denied: [] },
      { heardBy: 'trustee_panel', grants: GRANTS.pariwarAdmin, denied: [FIELD_WORKER_HEAR_ENDING_APPEAL_AS_PANEL_KEY] },
      { heardBy: 'pariwar_admin', grants: GRANTS.pariwarAdmin, denied: [] },
      { heardBy: 'pariwar_admin', grants: GRANTS.trustee, denied: [FIELD_WORKER_HEAR_ENDING_APPEAL_KEY] },
    ] as const;
    for (const c of cases) {
      const sink = new CapturingSink();
      const outcome = run(realDispatcher(sink), fakeRequest(c.grants, { heardBy: c.heardBy, district: 'Patna' }));
      if (c.denied.length === 0) await outcome;
      else await expect(outcome).rejects.toBeInstanceOf(AuthorizationDeniedError);
      expect(keysDenied(sink), `${c.heardBy} / ${c.grants[0].role}`).toEqual([...c.denied]);
    }
  });
});

describe('`holdsPermission` is the PURE twin of the hook (R2C-2)', () => {
  const opts = { dimension: 'district', resolveValue: endingAppealGateDistrict } as const;

  it('answers what the hook would, for every grant shape here and a NULL district too, and fires NO denial seam on a "no"', async () => {
    const answers = new Set<boolean>();
    for (const district of ['Patna', null] as const) {
      const stash = { heardBy: null, district };
      for (const key of [FIELD_WORKER_HEAR_ENDING_APPEAL_KEY, FIELD_WORKER_HEAR_ENDING_APPEAL_AS_PANEL_KEY]) {
        for (const [shape, grants] of Object.entries(GRANTS)) {
          const sink = new CapturingSink();
          const deps = { auditSink: sink, clock: () => new Date() } as unknown as AppDeps;
          const hookPasses = await run(requirePermissionHook(deps, key, opts), fakeRequest(grants, stash)).then(() => true, () => false);
          sink.events.length = 0;
          const holds = await holdsPermission(key, opts)(fakeRequest(grants, stash));
          expect(holds, `${key} / ${shape} / ${String(district)}`).toBe(hookPasses);
          expect(sink.events, 'the pure predicate fired a denial seam').toEqual([]);
          answers.add(holds);
        }
      }
    }
    expect([...answers].sort(), 'the table must hold both a "yes" and a "no" or it proves nothing').toEqual([false, true]);
  });

  it('R3-23: NO hearer + a super_admin and a trustee who is also a Pariwar Admin each pass through ONE hook with no denial', async () => {
    for (const grants of [GRANTS.superAdmin, GRANTS.trusteeAndPariwarAdmin]) {
      const sink = new CapturingSink();
      const req = fakeRequest(grants, { heardBy: null, district: 'Patna' });
      await run(realDispatcher(sink), req);
      expect(keysDenied(sink), grants[0].role).toEqual([]);
      expect(Object.keys(req.authorizations ?? {}), grants[0].role).toHaveLength(1);
    }
  });

  it('a request with no scope is a programming error (500), not a "no" - the same loud failure as the hook', async () => {
    const req = { requestContext: { actorId: ACTOR, traceId: 't' } } as unknown as FastifyRequest;
    await expect(holdsPermission(FIELD_WORKER_HEAR_ENDING_APPEAL_KEY, opts)(req)).rejects.toThrow(/without session \+ scope-resolution/);
  });

  it('grants that cannot be LOADED are an error, never a "no" (no scopeGrants and the scope not set)', async () => {
    const req = { requestContext: { actorId: ACTOR, traceId: 't' }, scopeTx: { pariwarId: P, scopeSet: false } } as unknown as FastifyRequest;
    await expect(holdsPermission(FIELD_WORKER_HEAR_ENDING_APPEAL_KEY, opts)(req)).rejects.toThrow(/refused to load grants/);
  });
});

describe('the dispatcher over STUB hooks: which one runs, and an error is never swallowed (R2C-2)', () => {
  function stubs(over: { holdsPanel?: boolean | Error; panel?: Error; pariwarAdmin?: Error } = {}) {
    const panel = vi.fn(async () => {
      if (over.panel) throw over.panel;
    });
    const pariwarAdmin = vi.fn(async () => {
      if (over.pariwarAdmin) throw over.pariwarAdmin;
    });
    const holdsPanel = vi.fn(async () => {
      if (over.holdsPanel instanceof Error) throw over.holdsPanel;
      return over.holdsPanel ?? false;
    });
    const dispatcher = requireEndingAppealHearer({ panel: panel as never, pariwarAdmin: pariwarAdmin as never, holdsPanel });
    return { panel, pariwarAdmin, holdsPanel, run: (heardBy: 'pariwar_admin' | 'trustee_panel' | null | undefined) => run(dispatcher, { endingAppealHeardBy: heardBy } as unknown as FastifyRequest) };
  }

  it('a fixed hearer runs ONE hook and never asks the predicate; no hearer (null OR absent) asks it once and runs ONE hook', async () => {
    const a = stubs();
    await a.run('trustee_panel');
    expect([a.panel.mock.calls.length, a.pariwarAdmin.mock.calls.length, a.holdsPanel.mock.calls.length]).toEqual([1, 0, 0]);
    const b = stubs();
    await b.run('pariwar_admin');
    expect([b.panel.mock.calls.length, b.pariwarAdmin.mock.calls.length, b.holdsPanel.mock.calls.length]).toEqual([0, 1, 0]);
    for (const none of [null, undefined] as const) {
      const holds = stubs({ holdsPanel: true });
      await holds.run(none);
      expect([holds.panel.mock.calls.length, holds.pariwarAdmin.mock.calls.length, holds.holdsPanel.mock.calls.length], `holds, ${String(none)}`).toEqual([1, 0, 1]);
      const holdsNot = stubs({ holdsPanel: false });
      await holdsNot.run(none);
      expect([holdsNot.panel.mock.calls.length, holdsNot.pariwarAdmin.mock.calls.length, holdsNot.holdsPanel.mock.calls.length], `does not hold, ${String(none)}`).toEqual([0, 1, 1]);
    }
  });

  it('an INFRASTRUCTURE error from the Panel hook is rethrown - the Pariwar Admin hook is NOT consulted to rescue the request', async () => {
    const infra = new Error('connection terminated unexpectedly');
    const s = stubs({ holdsPanel: true, panel: infra });
    await expect(s.run(null)).rejects.toBe(infra);
    expect(s.pariwarAdmin).not.toHaveBeenCalled();
  });

  it('an error from the predicate (the grants cannot be loaded) propagates and no hook runs', async () => {
    const infra = new Error('grants unavailable');
    const s = stubs({ holdsPanel: infra });
    await expect(s.run(null)).rejects.toBe(infra);
    expect([s.panel.mock.calls.length, s.pariwarAdmin.mock.calls.length]).toEqual([0, 0]);
  });

  it('the one true denial (an actor holding neither key) is the Pariwar Admin hook\'s error, thrown as is', async () => {
    const denial = new Error('denied');
    const s = stubs({ holdsPanel: false, pariwarAdmin: denial });
    await expect(s.run(null)).rejects.toBe(denial);
    expect(s.panel).not.toHaveBeenCalled();
  });
});
