// The response shape both `/.well-known/` verification files share (Story 6.30, `2026-10-10-312` AL8).
//
// `200` + `Content-Type: application/json` + `Cache-Control: public, max-age=3600` with the body, or a
// plain `404` when the identity env is unset or invalid — ⛔ never a body that verifies the wrong app, ⛔
// never a redirect (Apple and Android both refuse one). ⚠ In production Astro serves a null-body 404 as the
// site's HTML 404 page (`404.astro`, `max-age=60`) — still a 404, which is all a verifier needs.
//
// ⚠ GATE SCOPE: the PII-scrape gate (`check-pii-scrape.ts`) collects ONLY `.astro` pages, so these two
// `.ts` endpoints are invisible to it — their own tests (`tests/well-known-endpoints.test.ts`) carry the
// "⛔ no member data" check, and the gap is a deferred-work item (ADR-0013's gate is its own change).

export function wellKnownJson(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

/**
 * The 404. When the variable is SET but does ⛔ not parse, a one-line warning names the variable and the file
 * (⛔ never the value): set-but-invalid otherwise looks exactly like unset, and Apple's CDN caches the 404 —
 * the operator's only signal (code review 2026-10-11).
 */
export function wellKnownNotFound(variable: string, raw: string | undefined, file: string): Response {
  if (raw !== undefined && raw.trim() !== '') {
    console.warn(`[app-links] ${variable} is set but does not parse — ${file} answers 404 until it is fixed`);
  }
  return new Response(null, { status: 404 });
}
