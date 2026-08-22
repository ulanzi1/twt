// Security-headers + honeypot (Story 1.14, AC-4 — FR-92) — hermetic, no DB.
//
//   - X-Robots-Tag: noindex, nofollow on EVERY response (200s, 404s, errors).
//   - Honeypot trap routes return a benign 200 and emit an `abuse.honeypot` audit
//     signal; they are hidden from the committed OpenAPI surface.

import { describe, expect, it } from 'vitest';

import {
  HONEYPOT_PATHS,
  X_ROBOTS_TAG_VALUE,
} from '../../src/plugins/security-headers/index.js';
import { createTestApp, teardown } from './_setup.js';

describe('X-Robots-Tag noindex header (AC-4, hermetic — no DB)', () => {
  it('stamps X-Robots-Tag: noindex, nofollow on a normal 200 response', async () => {
    const t = await createTestApp();
    try {
      const res = await t.app.inject({ method: 'GET', url: '/api/v1/_meta/health' });
      expect(res.statusCode).toBe(200);
      expect(res.headers['x-robots-tag']).toBe(X_ROBOTS_TAG_VALUE);
      expect(X_ROBOTS_TAG_VALUE).toBe('noindex, nofollow');
    } finally {
      await teardown(t);
    }
  });

  it('stamps the header on a 404 too (every response, including crawlable error pages)', async () => {
    const t = await createTestApp();
    try {
      const res = await t.app.inject({ method: 'GET', url: '/api/v1/does-not-exist' });
      expect(res.statusCode).toBe(404);
      expect(res.headers['x-robots-tag']).toBe(X_ROBOTS_TAG_VALUE);
    } finally {
      await teardown(t);
    }
  });
});

describe('Honeypot traps (AC-4, hermetic — no DB)', () => {
  it('a honeypot hit returns a benign 200 and emits an abuse.honeypot audit line', async () => {
    const t = await createTestApp();
    try {
      const res = await t.app.inject({
        method: 'GET',
        url: '/wp-login.php',
        headers: { 'user-agent': 'evil-scanner/1.0' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json<{ status: string }>().status).toBe('ok');

      const hits = t.auditSink.ofType('abuse.honeypot');
      expect(hits).toHaveLength(1);
      const ctx = hits[0]?.context as { ip?: string; path?: string; method?: string; userAgent?: string };
      expect(ctx.path).toBe('/wp-login.php');
      expect(ctx.method).toBe('GET');
      expect(ctx.userAgent).toBe('evil-scanner/1.0');
      expect(typeof ctx.ip).toBe('string');
    } finally {
      await teardown(t);
    }
  });

  it('every declared honeypot path is a live trap (each emits exactly one signal)', async () => {
    const t = await createTestApp();
    try {
      for (const path of HONEYPOT_PATHS) {
        const res = await t.app.inject({ method: 'GET', url: path });
        expect(res.statusCode).toBe(200);
      }
      expect(t.auditSink.ofType('abuse.honeypot')).toHaveLength(HONEYPOT_PATHS.length);
    } finally {
      await teardown(t);
    }
  });

  it('honeypot routes are hidden from the committed OpenAPI surface', async () => {
    const t = await createTestApp();
    try {
      const doc = t.app.swagger() as { paths: Record<string, unknown> };
      for (const path of HONEYPOT_PATHS) {
        expect(doc.paths[path]).toBeUndefined();
      }
    } finally {
      await teardown(t);
    }
  });

  // ── Story 11a.4 (AC4 + AC7): the contact-harvesting bait family, PINNED BY NAME
  //
  // ⭐ WHY A NAMED LIST HERE, WHEN EVERY OTHER ASSERTION IN THIS FILE DERIVES:
  // the derived assertions above are vacuous AGAINST DELETION by construction. Both
  // the loop and `toHaveLength(HONEYPOT_PATHS.length)` read the SAME array, so
  // removing a path changes both sides at once and the suite stays green. That is
  // genuinely useful for "declared but not registered" — and it can ⛔ NEVER catch a
  // path being deleted. Story 11a.4's revert-sanity leg found this by RUNNING the
  // revert (delete a bait path → the count assertion did ⛔ NOT go red), which is
  // exactly the "vacuous by construction" defect class Decision 2026-08-21-145
  // recorded for the /members AC10 control.
  //
  // ⛔ This is NOT the hand-maintained parallel list the module doc forbids. That
  // warning is about the login-wall ALLOWLIST, which must keep deriving so ADDING a
  // path needs no edit. This is an anti-regression PIN on the five paths Story 11a.4
  // is accountable for: adding a bait path still needs ⛔ no edit here; deleting one
  // of THESE five is a deliberate scope reversal and ⭐ SHOULD force a red test and a
  // conscious edit.
  it('the Story 11a.4 contact-harvesting bait family is present and live (deletion-proof)', async () => {
    const CONTACT_BAIT = [
      '/staff-directory.csv',
      '/contacts.json',
      '/member-contacts.xlsx',
      '/members/export',
      '/api/v1/members/emails',
    ] as const;

    // Pinned MEMBERSHIP: this is the half that survives a deletion from HONEYPOT_PATHS.
    for (const path of CONTACT_BAIT) {
      expect(HONEYPOT_PATHS).toContain(path);
    }

    // …and each is actually wired, not merely declared.
    const t = await createTestApp();
    try {
      for (const path of CONTACT_BAIT) {
        const res = await t.app.inject({ method: 'GET', url: path });
        expect(res.statusCode).toBe(200);
        // ⛔ D4 = (a): the bare benign body, ⛔ NEVER a fake contact payload. A
        // fabricated phone/email here would trip this project's own naked-PII
        // discipline if it ever reached a scanned render.
        expect(res.json()).toEqual({ status: 'ok' });
      }
      expect(t.auditSink.ofType('abuse.honeypot')).toHaveLength(CONTACT_BAIT.length);
    } finally {
      await teardown(t);
    }
  });
});
