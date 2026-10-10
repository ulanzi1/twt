// Story 6.30 AC6 — the page/matrix lockstep (`2026-10-10-312` AL11, `-315` C7): every `APP_LINK_PATHS` entry has
// its OWN fallback page under `src/pages/` AND a PII-matrix entry declared `noindex`, `edge_cacheable` and
// `fields: []` — so a new app-link path cannot ship a link whose browser fallback is the site's 404 (or an
// undeclared page).

import { existsSync } from 'node:fs';
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
