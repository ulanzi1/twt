// WhatsApp inbound-webhook ingress routes — Story 5.4 (Task 4; AC2).
//
// Registered inside an ENCAPSULATED Fastify scope (index.ts) so the raw-body content-type parser applies to
// ONLY these routes (the HMAC must be computed over the EXACT bytes Meta sent — Fastify's default JSON parser
// re-serializes, changing the bytes; see Dev Notes "Raw-body capture"). The global JSON parsing is untouched.
//
// ── login-wall exemption (Story 1.14) ──────────────────────────────────────────────────────────────────
// NEITHER route carries a session guard — Meta is unauthenticated (the verify-token / signature IS the auth).
// Both are on the login-wall PUBLIC allowlist (tests/integration/login-wall.spec.ts). CSRF: this is a
// machine-to-machine POST with no cookie — NOT under app.csrfProtection (logout-only per the 1.11a review);
// the origin/referer hook allows a no-Origin request (server-to-server), so it is not blocked.

import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';
import { createChannelWebhookHandlers } from './handlers.js';

const WEBHOOK_TAG = 'channel-webhooks';

/** The raw request body Buffer stashed by the scoped content-type parser. */
interface WithRawBody {
  rawBody?: Buffer;
}

export function registerChannelWebhookRoutes(instance: FastifyInstance, deps: AppDeps): void {
  const h = createChannelWebhookHandlers(deps);

  // Capture the RAW bytes for the HMAC while still handing the handler a body. Scoped to THIS instance only
  // (index.ts encapsulates it) so global JSON parsing is unaffected. parseAs 'buffer' → request.body is the
  // Buffer; the handler reads request.rawBody for the signature + JSON.parses it after verification.
  instance.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (req, body, done) => {
      (req as unknown as WithRawBody).rawBody = body as Buffer;
      done(null, body);
    },
  );

  // GET subscription-verification challenge (public; verify-token is the auth). Hidden from the OpenAPI
  // surface (a Meta-facing operational endpoint, not a first-party API).
  instance.get(
    '/api/v1/webhooks/whatsapp/:pariwarId',
    { schema: { hide: true, tags: [WEBHOOK_TAG] } },
    h.verifyChallenge,
  );

  // POST inbound receiver (public; signature is the auth). Persist + ack within 5s; hidden from OpenAPI.
  instance.post(
    '/api/v1/webhooks/whatsapp/:pariwarId',
    { schema: { hide: true, tags: [WEBHOOK_TAG] } },
    h.receive,
  );

  // POST Telegram inbound receiver (public; the X-Telegram-Bot-Api-Secret-Token header is the auth). Telegram
  // is POST-only — NO GET challenge (unlike Meta). Verify the secret token (constant-time) → persist the raw
  // update → ack 200 fast; hidden from OpenAPI (a Telegram-facing operational endpoint).
  instance.post(
    '/api/v1/webhooks/telegram/:pariwarId',
    { schema: { hide: true, tags: [WEBHOOK_TAG] } },
    h.receiveTelegram,
  );
}
