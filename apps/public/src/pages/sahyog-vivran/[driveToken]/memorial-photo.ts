// `/sahyog-vivran/[driveToken]/memorial-photo` — the family memorial's photo on its Sahyog Vivran page (Story 11b.4a, MP4 / MP5;
// `2026-10-23-391` item 2). A server-rendered ENDPOINT (`output: 'server'` — ⛔ no `prerender`).
//
// ⭐ A PROXY of the API's photo route, which re-checks the page's predicate on EVERY request (the memorial switch, the publication
// kill switch, the shown version, the Trust's photo decision, erasure) — so a take-down reaches the photo too (Trap 2: ⛔ never a
// signed URL inside an edge-cached page). ⭐ It forwards ⛔ no query string and ⛔ no request header but `X-Forwarded-For` (the
// page's `Astro.clientAddress` rule), and BUILDS ITS OWN response headers — ⛔ never the upstream ones (Trap 9).
// ⭐ Every refusal is an EMPTY 404 with the page's cache posture — byte-identical whatever the reason (an unknown token, a
// take-down, a photo left out). An upstream FAULT is ⛔ not a 404: 503 + `Retry-After` + `no-store`, the page's outage rule.
// ⚠⛔ THIS ENDPOINT'S ONLY GUARDS ARE ITS OWN TESTS: `scripts/sahyog-vivran-financial-truth` scans it only because it is listed in
// `SCAN_FILES` BY HAND (its directory scan is ⛔ not recursive), and the pii-scrape route coverage loads `.astro` files only
// (`packages/contracts/scripts/check-pii-scrape.ts`) ⇒ `tests/memorial-photo-endpoint.test.ts` is the header check.

import type { APIRoute } from 'astro';

import { buildForwardedFor, fetchSahyogVivranMemorialPhoto } from '../../../lib/sahyog-vivran.server.js';

const CACHEABLE = 'public, max-age=60, s-maxage=300';

export const GET: APIRoute = async ({ params, clientAddress }) => {
  const result = await fetchSahyogVivranMemorialPhoto({
    driveToken: params.driveToken ?? '',
    forwardedFor: buildForwardedFor(clientAddress),
  });
  if (result.ok) {
    return new Response(result.bytes, {
      status: 200,
      headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': CACHEABLE, 'X-Content-Type-Options': 'nosniff' },
    });
  }
  if (result.reason === 'not_found') {
    return new Response(null, { status: 404, headers: { 'Cache-Control': CACHEABLE } });
  }
  return new Response(null, { status: 503, headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' } });
};
