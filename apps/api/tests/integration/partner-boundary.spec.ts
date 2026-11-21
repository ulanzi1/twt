// Story 12.5 — the partner-boundary fence, rule (a): ⛔ INBOUND PARTNER PATH (Decision `2026-11-21-483` QE15 (a); I4; AC10). Hermetic — no DB.
//
// Epic 12.5's boundary AC: partner webhooks are OUTBOUND ONLY, and partner integrations "cannot register inbound APIs that update member
// lifecycle state, validity status, contribution status, or claim state". Walk the REAL route table (`getCollectedRoutes` — the
// login-wall.spec.ts precedent, so a path built at runtime is seen): every BODY-ACCEPTING route (POST / PUT / PATCH / DELETE) whose URL
// names a partner or a lead outcome MUST carry the admin or the member session guard. A matching route without one is an inbound
// partner path, and fails. 12.2's admin registry (`POST …/modules/partners`) passes because it is session-guarded; 12.3's member lead
// route will pass the same way. A PLANTED unguarded route on a fresh instance proves the leg bites.
// ⚠ `hasSessionGuard` is COPIED from login-wall.spec.ts with its two guard symbols (it is not exported there). ⚠ The fence's semantic
// limit is its README's (scripts/partner-boundary-invariant/README.md): a partner feed reaching TWT some other way is ADR-0046's review
// question, ⛔ this spec's.

import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';

import { MEMBER_SESSION_GUARD } from '../../src/modules/auth/shared/member-session-guard.js';
import { ADMIN_SESSION_GUARD } from '../../src/modules/auth/shared/session-guard.js';
import { collectRoutes, getCollectedRoutes, type CollectedRoute } from '../../src/route-registry.js';
import { createTestApp, teardown } from './_setup.js';

/** The URL shapes that name a partner or a lead outcome (QE15 (a)). */
const INBOUND_PARTNER_URL = /partner|lead-outcome|lead_outcome|module-lead/i;
const BODY_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Copied from login-wall.spec.ts: guarded ⇔ the admin-session OR the member-session guard is among the preHandlers. */
function hasSessionGuard(preHandlers: readonly unknown[]): boolean {
  return preHandlers.some(
    (h) =>
      typeof h === 'function' &&
      ((h as unknown as Record<symbol, unknown>)[ADMIN_SESSION_GUARD] === true ||
        (h as unknown as Record<symbol, unknown>)[MEMBER_SESSION_GUARD] === true),
  );
}

/** The routes that WOULD be partner-facing, split by whether a session guard walls them. */
function partnerShaped(routes: readonly CollectedRoute[]): { readonly guarded: string[]; readonly inbound: string[] } {
  const guarded: string[] = [];
  const inbound: string[] = [];
  for (const r of routes) {
    if (!BODY_METHODS.has(r.method) || !INBOUND_PARTNER_URL.test(r.url)) continue;
    (hasSessionGuard(r.preHandlers) ? guarded : inbound).push(`${r.method} ${r.url}`);
  }
  return { guarded, inbound };
}

describe('partner boundary — rule (a): ⛔ inbound partner route (hermetic)', () => {
  it('on the REAL route table, every partner-shaped body route is session-guarded — and the scan is not vacuous', async () => {
    const t = await createTestApp();
    try {
      const { guarded, inbound } = partnerShaped(getCollectedRoutes(t.app));
      expect(inbound).toEqual([]);
      // Not vacuous: 12.2's admin partner registry is partner-shaped, and is seen (and guarded).
      expect(guarded).toContain('POST /api/v1/p/:pariwarId/modules/partners');
    } finally {
      await teardown(t);
    }
  });

  it('BITES: a planted UNGUARDED partner callback is an inbound partner path; the guarded twin is not', async () => {
    const app = Fastify();
    collectRoutes(app);
    const guard = Object.assign(async (): Promise<void> => undefined, { [ADMIN_SESSION_GUARD]: true });
    app.post('/api/v1/partners/:partnerId/lead-outcome', async () => ({ ok: true }));
    app.put('/api/v1/p/:pariwarId/module-lead/:leadId/status', async () => ({ ok: true }));
    app.post('/api/v1/p/:pariwarId/modules/partners', { preHandler: [guard] }, async () => ({ ok: true }));
    app.get('/api/v1/partners/:partnerId', async () => ({ ok: true })); // GET carries no body: out of scope
    await app.ready();
    try {
      const { guarded, inbound } = partnerShaped(getCollectedRoutes(app));
      expect(inbound.sort()).toEqual(['POST /api/v1/partners/:partnerId/lead-outcome', 'PUT /api/v1/p/:pariwarId/module-lead/:leadId/status'].sort());
      expect(guarded).toEqual(['POST /api/v1/p/:pariwarId/modules/partners']);
    } finally {
      await app.close();
    }
  });
});
