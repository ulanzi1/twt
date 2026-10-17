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

/**
 * Story 6.37b (DR1, DR9, DR10; ADR-0042) — MSG91's SMS delivery-report webhook, in its OWN encapsulated scope (index.ts):
 * every inherited content-type parser is removed and ONE `'*'` parser hands the handler the raw Buffer for ANY content
 * type (or `undefined` with ⛔ body), so ⛔ request is a 415 / 400 BEFORE the token check — a 4xx counts toward MSG91's
 * auto-pause (F6). The handler parses JSON itself (I3 — the parse error quotes the body). Its own per-IP limit REPLACES
 * the global 300 / min for this route (DR9 — PROVISIONAL; the key is the spoofable `request.ip`, ADR-0042's residual).
 * Public (the header token is the auth) — on the login-wall PUBLIC allowlist; hidden from OpenAPI.
 */
export function registerMsg91SmsReportRoute(instance: FastifyInstance, deps: AppDeps): void {
  const h = createChannelWebhookHandlers(deps);
  instance.removeAllContentTypeParsers();
  instance.addContentTypeParser('*', { parseAs: 'buffer' }, (_req, body, done) => {
    done(null, body);
  });
  instance.post(
    '/api/v1/webhooks/msg91/sms-reports',
    {
      schema: { hide: true, tags: [WEBHOOK_TAG] },
      config: { rateLimit: { max: deps.config.smsReportWebhook.rateMax, timeWindow: '1 minute' } },
    },
    h.receiveMsg91SmsReports,
  );
}
