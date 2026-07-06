// WhatsApp inbound-webhook ingress module — Story 5.4 (Task 4). The §3.11 persist-and-ack primitive: a
// per-Pariwar Meta webhook receiver (GET subscription challenge + POST verify-persist-ack). Registered inside
// an ENCAPSULATED Fastify scope so its raw-body content-type parser (needed for the X-Hub-Signature-256 HMAC)
// applies ONLY to these routes, leaving global JSON parsing untouched.

import type { FastifyInstance } from 'fastify';

import type { AppDeps } from '../../context.js';
import { registerChannelWebhookRoutes } from './routes.js';

export { registerChannelWebhookRoutes } from './routes.js';
export { verifyMetaSignature, META_SIGNATURE_HEADER } from './signature.js';
export { createChannelWebhookHandlers } from './handlers.js';

export function registerChannelWebhooksModule(app: FastifyInstance, deps: AppDeps): void {
  // Encapsulate so the raw-body content-type parser is scoped to the webhook routes only. The parent's
  // onRoute collector still fires for these routes (login-wall/pagination guards see them); the
  // request-context + origin hooks are inherited.
  void app.register(async (instance) => {
    registerChannelWebhookRoutes(instance, deps);
  });
}
