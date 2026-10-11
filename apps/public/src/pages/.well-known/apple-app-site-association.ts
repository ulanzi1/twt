// `/.well-known/apple-app-site-association` — iOS Universal Links (Story 6.30, `2026-10-10-312` AL8).
//
// A server-rendered ENDPOINT, ⛔ never prerendered and ⛔ never a file in `public/`: a static file goes
// through `send`, which types this extension-less name `application/octet-stream`, and Apple silently
// ignores a file that is ⛔ not `application/json`. The env is read INSIDE `GET` (⛔ not at module load), so
// setting `APP_LINKS_IOS_APP_IDS` on the running service takes effect without a rebuild.
// Body: `applinks.details[].appIDs` from `APP_LINKS_IOS_APP_IDS` (a comma list of `<TEAMID>.<bundleId>`),
// `components` = one `{"/": path}` per app-link path. Unset / invalid ⇒ 404.

import type { APIRoute } from 'astro';

import { buildAppleAppSiteAssociation, parseIosAppIdsEnv } from '@twt/contracts';

import { wellKnownJson, wellKnownNotFound } from '../../lib/well-known.server.js';

export const GET: APIRoute = () => {
  const raw = process.env.APP_LINKS_IOS_APP_IDS;
  const apps = parseIosAppIdsEnv(raw);
  return apps === null
    ? wellKnownNotFound('APP_LINKS_IOS_APP_IDS', raw, '/.well-known/apple-app-site-association')
    : wellKnownJson(buildAppleAppSiteAssociation(apps));
};
