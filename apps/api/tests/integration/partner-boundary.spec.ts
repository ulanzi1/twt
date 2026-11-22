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
// ⭐ Code review 2026-11-22 (patch 8): the word pattern alone missed the repo's OWN shapes — every inbound webhook here is named for its
// provider (`/webhooks/<provider>/…`), and a marketplace route is `/modules/:moduleId/…`. So (1) the pattern also names the marketplace
// lead shape, and (2) the body-accepting `/webhooks/` routes are PINNED to an exact list: a new inbound webhook fails here until it is
// added by name — and a partner's is never added (ADR-0046's review question).
// ⚠ What this spec does NOT see (round 2 of that review): an inbound path under another spelling than the ones named above; a GET that
// carries data in its query string (only body-accepting methods are judged); a session-guarded route fed by a partner's export. Each
// is ADR-0046's review question at the story that adds it.

import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';

import { MEMBER_SESSION_GUARD } from '../../src/modules/auth/shared/member-session-guard.js';
import { ADMIN_SESSION_GUARD } from '../../src/modules/auth/shared/session-guard.js';
import { collectRoutes, getCollectedRoutes, type CollectedRoute } from '../../src/route-registry.js';
import { createTestApp, teardown } from './_setup.js';

/** The URL shapes that name a partner or a lead outcome (QE15 (a)). */
// Round 3: a LEAD segment anywhere (`/leads/`, `/lead-status`, `/leadback`, `/lead_x`) — ⛔ `/leaderboard`, `/leadership`.
const INBOUND_PARTNER_URL = /partner|lead-outcome|lead_outcome|module-lead|\/leads?(back|[-_][a-z_-]*)?(\/|$)/i;
/** The URL shapes of an inbound delivery ingress: `/webhooks/`, and the other spellings (code review 2026-11-22, round 2). */
const INGRESS_URL = /\/(webhooks?|hooks?|callbacks?)(\/|$)/i;
/**
 * EVERY body-accepting ingress-shaped route ({@link INGRESS_URL}) — each a channel PROVIDER's delivery ingress, public by design (login-wall.spec.ts's
 * `PUBLIC_ALLOWLIST` holds the reason for each). ⛔ A partner's callback is never added here: partners are downstream consumers.
 */
const KNOWN_INBOUND_WEBHOOKS: readonly string[] = [
  // The DigiLocker OAuth callback (Story 3.3b) — a KYC PROVIDER's ingress, public by design (login-wall.spec.ts holds its reason); seen once
  // the pin took the `/callback` spelling too (code review 2026-11-22, round 2).
  'POST /api/v1/kyc/callback',
  'POST /api/v1/webhooks/msg91/sms-reports',
  'POST /api/v1/webhooks/telegram/:pariwarId',
  'POST /api/v1/webhooks/whatsapp/:pariwarId',
];
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
    if (!BODY_METHODS.has(r.method.toUpperCase()) || !INBOUND_PARTNER_URL.test(r.url)) continue;
    (hasSessionGuard(r.preHandlers) ? guarded : inbound).push(`${r.method.toUpperCase()} ${r.url}`);
  }
  return { guarded, inbound };
}

/** Every body-accepting ingress-shaped route (`/webhooks/`, `/webhook/`, `/hooks/`, `/callback(s)/`), as `METHOD url`, sorted. */
function inboundWebhooks(routes: readonly CollectedRoute[]): string[] {
  return routes
    .filter((r) => BODY_METHODS.has(r.method.toUpperCase()) && INGRESS_URL.test(r.url))
    .map((r) => `${r.method.toUpperCase()} ${r.url}`)
    .sort();
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

  it('on the REAL route table, the inbound webhooks are EXACTLY the known provider ingresses — a new one must be named here', async () => {
    const t = await createTestApp();
    try {
      expect(inboundWebhooks(getCollectedRoutes(t.app))).toEqual([...KNOWN_INBOUND_WEBHOOKS].sort());
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
    app.post('/api/v1/p/:pariwarId/modules/:moduleId/leads/:leadId/outcome', async () => ({ ok: true })); // the marketplace shape
    app.post('/api/v1/webhooks/acme-insurer/lead-status', async () => ({ ok: true })); // the webhook shape: no partner word in it
    // Round 2 (code review 2026-11-22): a lead-WORD route under a module, and the other ingress spellings.
    app.post('/api/v1/p/:pariwarId/modules/:moduleId/lead-status', async () => ({ ok: true }));
    app.post('/api/v1/webhook/acme-insurer/leads', async () => ({ ok: true }));
    app.post('/api/v1/hooks/acme-insurer', async () => ({ ok: true }));
    app.post('/api/v1/hook/acme-insurer', async () => ({ ok: true }));
    // Round 3: a lead route outside `/modules/`, and two NON-lead words that must not match.
    app.post('/api/v1/leads/:leadId/status', async () => ({ ok: true }));
    app.post('/api/v1/p/:pariwarId/modules/:moduleId/leaderboard', async () => ({ ok: true }));
    app.post('/api/v1/p/:pariwarId/leadership', async () => ({ ok: true }));
    app.patch('/api/v1/callbacks/acme-insurer/status', async () => ({ ok: true }));
    app.get('/api/v1/partners/:partnerId', async () => ({ ok: true })); // GET carries no body: out of scope
    await app.ready();
    try {
      const { guarded, inbound } = partnerShaped(getCollectedRoutes(app));
      expect(inbound.sort()).toEqual(
        [
          'POST /api/v1/partners/:partnerId/lead-outcome',
          'PUT /api/v1/p/:pariwarId/module-lead/:leadId/status',
          'POST /api/v1/p/:pariwarId/modules/:moduleId/leads/:leadId/outcome',
          'POST /api/v1/p/:pariwarId/modules/:moduleId/lead-status',
          'POST /api/v1/leads/:leadId/status',
          // Round 3: these two webhooks now carry a lead SEGMENT, so the lead pattern sees them as well as the pin.
          'POST /api/v1/webhook/acme-insurer/leads',
          'POST /api/v1/webhooks/acme-insurer/lead-status',
        ].sort(),
      );
      // A provider-named callback with no lead or partner word (`/hooks/acme-insurer`) — the webhook PIN is what catches it.
      expect(inboundWebhooks(getCollectedRoutes(app)).filter((w) => !KNOWN_INBOUND_WEBHOOKS.includes(w))).toEqual(
        [
          'POST /api/v1/webhooks/acme-insurer/lead-status',
          'POST /api/v1/webhook/acme-insurer/leads',
          'POST /api/v1/hooks/acme-insurer',
          'POST /api/v1/hook/acme-insurer',
          'PATCH /api/v1/callbacks/acme-insurer/status',
        ].sort(),
      );
      expect(guarded).toEqual(['POST /api/v1/p/:pariwarId/modules/partners']);
    } finally {
      await app.close();
    }
  });
});
