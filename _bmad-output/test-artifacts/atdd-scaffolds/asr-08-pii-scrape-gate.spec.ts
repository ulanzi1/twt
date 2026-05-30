/**
 * ASR-8 — PII shielding scrape gate: public surfaces never expose Tier-1 PII.
 *
 * Target story: Story 1.16b (PII Scrape CI Gate — FR-74 Foundational)
 * Target final location: apps/public/e2e/security/pii-scrape.spec.ts
 *                       + apps/api/__tests__/security/pii-allowlist.spec.ts
 * Risks burned down: SEC-2, BUS-7 (SM-C5 hard zero), AR-48 cache safety
 *
 * RED-PHASE STATUS: test.skip(). Activation blocked on:
 *   - Story 11a.1 Public Astro SSR shell
 *   - Story 11a.2 Tiered visibility renderers
 *   - PII allowlist single source of truth (Epic 1 infra)
 *
 * Lane: PR (CI gate — fast).
 *
 * Execution:  pnpm playwright test --grep "@P0 @PII"
 */

import { test, expect } from '@playwright/test';
import { TIER1_PII_TOKEN_ALLOWLIST_FORBIDDEN } from '../_fixtures/test-data';

// Registry of every public route the scrape gate covers. As Story 11a/11b
// adds routes, add them here — coverage is by exhaustive enumeration.
const PUBLIC_ROUTES = [
  '/p/bihar/public',
  '/p/bihar/public/niyamavali',
  '/p/bihar/public/niyamavali/diff/v1.0.0/v1.1.0',
  '/p/bihar/public/sahyog',
  '/p/bihar/public/sahyog/alert-78',
  '/p/bihar/public/sahyog/alert-78/pool-karna',
  '/p/bihar/public/sahyog/archive',
  '/p/bihar/public/in-memoriam',
  '/p/bihar/public/members', // PII-shielded directory
  '/p/bihar/public/about',
  '/p/bihar/public/contact',
] as const;

test.describe('@P0 @PII @Security public-surface scrape gate', () => {
  for (const route of PUBLIC_ROUTES) {
    test.skip(`route ${route} contains zero Tier-1 PII tokens`, async ({ page }) => {
      await page.goto(route);
      const html = (await page.content()).toLowerCase();

      for (const token of TIER1_PII_TOKEN_ALLOWLIST_FORBIDDEN) {
        // Token check is *forbidden-substring*: no Tier-1 PII field name should
        // appear in the public HTML. If a label like "mobile" is needed,
        // it must be hardened (e.g., used only in member-only fragments).
        expect(html, `Tier-1 token "${token}" leaked in ${route}`).not.toContain(token);
      }
    });
  }

  test.skip('SSR shell (AR-48) for Sahyog Vivran contains zero PII; authenticated fragment hydrates post-auth', async ({
    page,
    request,
  }) => {
    // Hit the raw SSR HTML directly (no JS hydration), which is what gets cached.
    const ssr = await request.get('/p/bihar/public/sahyog/alert-78/pool-karna', {
      headers: { 'x-render-mode': 'ssr-only' },
    });
    const ssrHtml = (await ssr.text()).toLowerCase();

    for (const token of TIER1_PII_TOKEN_ALLOWLIST_FORBIDDEN) {
      expect(ssrHtml, `SSR shell contains Tier-1 token "${token}"`).not.toContain(token);
    }

    // Nominee bank fragment is an authenticated fragment (per AR-48 registry).
    // It must NOT be present in the SSR HTML — only hydrated client-side after auth.
    expect(ssrHtml).not.toContain('data-fragment="nominee-bank"');
  });

  test.skip('forced pagination: ?page=all and ?per_page=10000 are rejected', async ({ request }) => {
    const reject1 = await request.get('/p/bihar/public/members?page=all');
    expect(reject1.status()).toBeGreaterThanOrEqual(400);
    const reject2 = await request.get('/p/bihar/public/members?per_page=10000');
    expect(reject2.status()).toBeGreaterThanOrEqual(400);

    // Valid request returns at most MAX_PAGE_SIZE items.
    const ok = await request.get('/p/bihar/public/members?page=1&per_page=50');
    expect(ok.ok()).toBe(true);
    const body = await ok.json();
    expect(body.members.length).toBeLessThanOrEqual(50);
  });

  test.skip('member-detail public page has noindex meta + honeypot', async ({ page }) => {
    await page.goto('/p/bihar/public/members/m-public-001');
    const robots = await page
      .locator('meta[name="robots"]')
      .getAttribute('content');
    expect(robots).toMatch(/noindex/i);
    expect(robots).toMatch(/nofollow/i);

    // Honeypot field — present but visually hidden; non-empty submit ⇒ bot.
    const honeypot = page.locator('[data-testid="honeypot-field"]');
    await expect(honeypot).toBeAttached();
  });
});
