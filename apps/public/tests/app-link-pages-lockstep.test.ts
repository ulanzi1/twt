// Story 6.30 AC6 — the page/matrix lockstep (`2026-10-10-312` AL11, `-315` C7): every `APP_LINK_PATHS` entry has
// its OWN fallback page under `src/pages/` AND a PII-matrix entry declared `noindex`, `edge_cacheable` and
// `fields: []` — so a new app-link path cannot ship a link whose browser fallback is the site's 404 (or an
// undeclared page).

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { APP_LINK_PATH_LIST } from '@twt/contracts';

import { RUNTIME_MATRIX } from '../src/lib/matrix.server.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const PAGES = path.join(here, '../src/pages');

describe('each app-link path has a fallback page and a matrix entry', () => {
  it.each([...APP_LINK_PATH_LIST])('%s', (appLinkPath) => {
    expect(existsSync(path.join(PAGES, `${appLinkPath.slice(1)}.astro`))).toBe(true);
    const entries = RUNTIME_MATRIX.surfaces.filter((surface) => surface.route === appLinkPath);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ search_indexing_policy: 'noindex', cache_policy: 'edge_cacheable', fields: [] });
  });
});

describe('the Traefik router serves each app-link path EXACTLY (infra/dokploy/compose.yaml — AL9)', () => {
  const compose = readFileSync(path.join(here, '../../../infra/dokploy/compose.yaml'), 'utf8');
  const rule = /traefik\.http\.routers\.twt-public-app-links\.rule=(.*)"/.exec(compose)?.[1] ?? '';

  it('the router exists, with the two files and /_astro/', () => {
    expect(rule).toContain('Path(`/.well-known/apple-app-site-association`)');
    expect(rule).toContain('Path(`/.well-known/assetlinks.json`)');
    expect(rule).toContain('PathPrefix(`/_astro/`)');
  });

  it.each([...APP_LINK_PATH_LIST])('%s has an exact Path(...)', (appLinkPath) => {
    expect(rule).toContain(`Path(\`${appLinkPath}\`)`);
    expect(rule).not.toContain(`PathPrefix(\`${appLinkPath}`);
  });

  it('⛔ never PathPrefix(`/.well-known/`)', () => {
    expect(rule).not.toContain('PathPrefix(`/.well-known');
  });
});
