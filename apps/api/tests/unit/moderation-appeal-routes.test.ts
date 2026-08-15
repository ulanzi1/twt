// Story 10.22 (AC5, AC7) — the appeal routes' GATE SHAPES, and the flag-on reachability proof.
//
// Niyamavali §8.8 (Decision `2026-08-15-121`).
//
// ⚠ WHY A ROUTE-SHAPE TEST AND NOT AN E2E. AC7 requires proof that a terminated member can reach the
// appeal **with `termination_access_block` ENABLED** — i.e. holding NO session at all. An E2E for
// that would have to stand up the flag registry, a terminated member, a refused login and an operator
// session, and it would still only prove that one wiring works today. The load-bearing property is
// STRUCTURAL and is what this file pins: **the off-portal route's preHandler chain contains no member
// session guard at all**, so nothing about the member's session state can gate it. A route that never
// asks for a member session cannot be broken by the member not having one.
//
// ⛔ Testing only the flag-OFF world tests the world this story exists to make survivable.

import type { FastifyInstance } from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import { registerModerationAppealRoutes } from '../../src/modules/member-moderation-appeals/routes.js';

type Registered = {
  method: string;
  url: string;
  preHandlerNames: string[];
};

/**
 * A recording stand-in for the Fastify instance. Every hook factory is stubbed to return a NAMED
 * function, so the assertions below read the actual preHandler CHAIN each route was registered with —
 * not a re-derivation of it.
 */
function captureRoutes(): { app: FastifyInstance; routes: Registered[]; deps: unknown } {
  const routes: Registered[] = [];
  const record = (method: string) => (url: string, opts: Record<string, unknown>) => {
    const pre = (opts.preHandler ?? []) as Array<{ name?: string }>;
    routes.push({
      method,
      url,
      preHandlerNames: pre.map((h) => h.name ?? 'anonymous'),
    });
  };
  const typed = { post: record('post'), get: record('get') };
  const app = { withTypeProvider: () => typed } as unknown as FastifyInstance;

  const deps = {
    config: { writeRateMax: 10 },
    // Each factory returns a distinctly-named function so the chain is readable.
    __hooks: true,
  };
  return { app, routes, deps };
}

// The hook factories are module-level imports inside routes.ts, so they are stubbed at module scope.
vi.mock('../../src/modules/auth/shared/member-session-guard.js', () => ({
  requireMemberSession: () =>
    Object.defineProperty(() => undefined, 'name', { value: 'requireMemberSession' }),
}));
vi.mock('../../src/modules/auth/shared/session-guard.js', () => ({
  requireAdminSession: () =>
    Object.defineProperty(() => undefined, 'name', { value: 'requireAdminSession' }),
}));
vi.mock('../../src/middleware/scope-resolution/index.js', () => ({
  scopeResolutionHook: () =>
    Object.defineProperty(() => undefined, 'name', { value: 'scopeResolutionHook' }),
}));
vi.mock('../../src/modules/rbac/index.js', () => ({
  requirePermissionHook: (_deps: unknown, key: string) =>
    Object.defineProperty(() => undefined, 'name', { value: `requirePermission:${key}` }),
}));
vi.mock('../../src/modules/step-up/gate.js', () => ({
  requireStepUp: (_deps: unknown, ctx: string) =>
    Object.defineProperty(() => undefined, 'name', { value: `requireStepUp:${ctx}` }),
}));
vi.mock('../../src/modules/member-moderation-appeals/handlers.js', () => ({
  createModerationAppealHandlers: () => ({
    fileFromPortal: () => undefined,
    fileOffPortal: () => undefined,
    memberContext: () => undefined,
    list: () => undefined,
    detail: () => undefined,
    decide: () => undefined,
  }),
}));

function routesOf(): Registered[] {
  const { app, routes, deps } = captureRoutes();
  registerModerationAppealRoutes(app, deps as never);
  return routes;
}

const find = (routes: Registered[], method: string, url: string): Registered => {
  const r = routes.find((x) => x.method === method && x.url === url);
  if (!r) throw new Error(`route not registered: ${method.toUpperCase()} ${url}`);
  return r;
};

describe('Story 10.22 — the moderation-appeal route gates', () => {
  const P = '/api/v1/p/:pariwarId';

  it('registers all six routes', () => {
    const routes = routesOf();
    expect(routes.map((r) => `${r.method} ${r.url}`).sort()).toEqual(
      [
        `get ${P}/member/moderation/appeals`,
        `get ${P}/moderation/appeals`,
        `get ${P}/moderation/appeals/:appealId`,
        `post ${P}/member/moderation/appeals`,
        `post ${P}/moderation/appeals/:appealId/decide`,
        `post ${P}/moderation/appeals/off-portal`,
      ].sort(),
    );
  });

  // ── ⭐ AC7 — THE FLAG-ON REACHABILITY PROOF ────────────────────────────────────────────────────
  it('⭐ the OFF-PORTAL arm has NO member-session guard — so a terminated member with no session reaches it', () => {
    // §8.8: "the right to appeal does not depend on the access that termination removes."
    // With `termination_access_block` ENABLED a terminated member cannot obtain a session at all.
    // ⛔ If a member-session guard ever appears in this chain, the appeal becomes unreachable to
    // exactly the member who most needs it — and nothing else in the suite would notice.
    const r = find(routesOf(), 'post', `${P}/moderation/appeals/off-portal`);
    expect(r.preHandlerNames).not.toContain('requireMemberSession');
  });

  it('⭐ the OFF-PORTAL arm gates on `helpdesk.create` — ⛔ NOT `member.data_rights`, ⛔ NOT `member.moderate`', () => {
    // ⛔ NOT `member.data_rights`: filing an appeal is not executing a DPDPA right, and Story 10.21
    // minted that key precisely to separate FILING from EXECUTING.
    // ⛔ NOT `member.moderate`: that would let the authority that sanctions a member also file the
    // member's appeal against the sanction.
    const r = find(routesOf(), 'post', `${P}/moderation/appeals/off-portal`);
    expect(r.preHandlerNames).toContain('requirePermission:helpdesk.create');
    expect(r.preHandlerNames).not.toContain('requirePermission:member.data_rights');
    expect(r.preHandlerNames).not.toContain('requirePermission:member.moderate');
  });

  it('the IN-PORTAL arm is member-session gated and carries NO admin hooks', () => {
    const r = find(routesOf(), 'post', `${P}/member/moderation/appeals`);
    expect(r.preHandlerNames).toEqual(['requireMemberSession']);
  });

  it('the member CONTEXT read is member-session gated', () => {
    const r = find(routesOf(), 'get', `${P}/member/moderation/appeals`);
    expect(r.preHandlerNames).toEqual(['requireMemberSession']);
  });

  // ── AC5 — the adjudication chain ─────────────────────────────────────────────────────────────
  it('⭐ the DETERMINATION runs the full four-hook chain PLUS a DISTINCT step-up context', () => {
    // ⛔ `member.moderate` cannot express this: `pariwar_admin` and `trustee_panel` both hold it, so a
    // check on it cannot distinguish the appellate authority from the one that decided.
    const r = find(routesOf(), 'post', `${P}/moderation/appeals/:appealId/decide`);
    expect(r.preHandlerNames).toEqual([
      'requireAdminSession',
      'scopeResolutionHook',
      'requirePermission:member.decide_moderation_appeal',
      'requireStepUp:member_moderation_appeal',
    ]);
    // ⛔ An elevation minted for the DPDPA context must never satisfy this gate.
    expect(r.preHandlerNames).not.toContain('requireStepUp:member_data_rights');
  });

  it('the adjudication QUEUE and DETAIL reads gate on the same Panel-only key', () => {
    const routes = routesOf();
    for (const url of [`${P}/moderation/appeals`, `${P}/moderation/appeals/:appealId`]) {
      const r = find(routes, 'get', url);
      expect(r.preHandlerNames).toEqual([
        'requireAdminSession',
        'scopeResolutionHook',
        'requirePermission:member.decide_moderation_appeal',
      ]);
    }
  });

  it('⚠ `off-portal` is registered BEFORE `:appealId`, so the literal is not read as an id', () => {
    const routes = routesOf();
    const offPortal = routes.findIndex((r) => r.url === `${P}/moderation/appeals/off-portal`);
    const byId = routes.findIndex((r) => r.url === `${P}/moderation/appeals/:appealId`);
    expect(offPortal).toBeGreaterThanOrEqual(0);
    expect(byId).toBeGreaterThanOrEqual(0);
    expect(offPortal).toBeLessThan(byId);
  });
});
