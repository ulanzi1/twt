// WhatsApp inbound-webhook ingress handlers — Story 5.4 (Task 4; AC2).
//
// The §3.11 persist-and-ack-within-5s primitive. Per-Pariwar path so the app secret is known from the URL
// BEFORE the body is trusted (the Dev Notes "Per-Pariwar webhook path" decision). NO business logic here —
// NO matching, NO consent write, NO audit, NO external call. Verify the signature → persist the raw payload
// → ACK 200. The async worker (apps/jobs) does everything else.
//
// ── Fail-closed (AI-4-3(a)/(b)) ────────────────────────────────────────────────────────────────────────
// A bad/absent GET verify-token or POST signature fails CLOSED (403, minimal body) and persists nothing. The
// resolved app-secret / verify-token VALUES never leave this handler (AI-4-3(c)); only the NAME pointers are
// stored on the config row.

import { channelConfig, ids, smsDelivery, telegramOptIn, waOptIn, type Db } from '@twt/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { ForbiddenError } from '../../http-errors.js';
import { closeScopeTx, openScopeTx, runGlobalAppTx } from '../multi-tenant/scope-tx.js';
import { parseSmsReportBody, projectSmsReports } from './msg91-sms-reports.js';
import { META_SIGNATURE_HEADER, timingSafeEqualString, verifyMetaSignature } from './signature.js';

/** The header Telegram signs inbound webhook updates with (the per-Pariwar secret token; constant-time compare). */
export const TELEGRAM_SECRET_TOKEN_HEADER = 'x-telegram-bot-api-secret-token';

/** The raw request body Buffer the scoped content-type parser captured (routes.ts). */
interface WithRawBody {
  rawBody?: Buffer;
}

interface PariwarParams {
  pariwarId: string;
}

export function createChannelWebhookHandlers(deps: AppDeps) {
  /** Read the per-Pariwar WA config on a scoped tx (the app secret / verify-token NAMEs live here). */
  async function readConfigScoped(
    pariwarIdStr: string,
  ): Promise<{ appSecretName: string | null; verifyTokenName: string | null } | null> {
    const scopeTx = await openScopeTx(deps, pariwarIdStr);
    let ok = false;
    try {
      const row = await channelConfig.getWaConfig(scopeTx.tx as Db, ids.pariwarId(pariwarIdStr));
      ok = true;
      if (!row) return null;
      return {
        appSecretName: row.appSecretSecretName,
        verifyTokenName: row.webhookVerifyTokenSecretName,
      };
    } finally {
      await closeScopeTx(scopeTx, ok);
    }
  }

  return {
    /**
     * GET /api/v1/webhooks/whatsapp/:pariwarId — Meta subscription verification. On `hub.mode=subscribe` AND
     * a matching `hub.verify_token`, echo the bare `hub.challenge` (plain text, 200). Else fail closed (403).
     * NO session guard — Meta is unauthenticated; the verify-token IS the auth.
     */
    async verifyChallenge(request: FastifyRequest, reply: FastifyReply): Promise<void> {
      const { pariwarId: pariwarIdStr } = request.params as PariwarParams;
      const q = request.query as Record<string, string | undefined>;
      const mode = q['hub.mode'];
      const token = q['hub.verify_token'];
      const challenge = q['hub.challenge'];

      const config = await readConfigScoped(pariwarIdStr);
      if (!config || !config.verifyTokenName) {
        // No config / no verify-token NAME ⇒ fail closed (no subscription can be verified for this Pariwar).
        throw new ForbiddenError('subscription verification failed', 'webhook.challenge_rejected');
      }
      const expectedToken = await deps.resolveChannelSecret(config.verifyTokenName);
      if (mode !== 'subscribe' || !token || !timingSafeEqualString(token, expectedToken) || challenge === undefined) {
        throw new ForbiddenError('subscription verification failed', 'webhook.challenge_rejected');
      }
      // Meta requires the BARE challenge string echoed (plain text, not JSON).
      await reply.status(200).type('text/plain').send(challenge);
    },

    /**
     * POST /api/v1/webhooks/whatsapp/:pariwarId — verify signature → persist raw payload → ACK 200. NO
     * matching / consent / audit / external call (that is the worker's job). p99 well under Meta's 5s.
     */
    async receive(request: FastifyRequest, reply: FastifyReply): Promise<void> {
      const { pariwarId: pariwarIdStr } = request.params as PariwarParams;
      const rawBody = (request as unknown as WithRawBody).rawBody;
      if (!rawBody) {
        // The scoped parser always sets rawBody for this route — its absence is a wiring bug, fail closed.
        throw new ForbiddenError('signature verification failed', 'webhook.signature_rejected');
      }

      const config = await readConfigScoped(pariwarIdStr);
      if (!config || !config.appSecretName) {
        // No config / no app-secret NAME ⇒ cannot verify ⇒ fail closed (persist nothing).
        throw new ForbiddenError('signature verification failed', 'webhook.signature_rejected');
      }
      const appSecret = await deps.resolveChannelSecret(config.appSecretName);
      const signature = request.headers[META_SIGNATURE_HEADER];
      const signatureHeader = Array.isArray(signature) ? signature[0] : signature;
      if (!verifyMetaSignature(rawBody, signatureHeader, appSecret)) {
        // Invalid/absent signature → fail closed, persist NOTHING.
        throw new ForbiddenError('signature verification failed', 'webhook.signature_rejected');
      }

      // Verified. Parse the raw JSON (Meta always sends valid JSON) + persist on the scoped tx. NO downstream.
      let payload: unknown;
      try {
        payload = JSON.parse(rawBody.toString('utf8'));
      } catch {
        // A verified-but-unparseable body should never happen; reject rather than persist garbage.
        throw new ForbiddenError('signature verification failed', 'webhook.signature_rejected');
      }

      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        await waOptIn.persistInboundWebhookEvent(scopeTx.tx as Db, {
          pariwarId: ids.pariwarId(pariwarIdStr),
          rawPayload: payload,
          signatureVerified: true,
        });
        ok = true;
      } finally {
        await closeScopeTx(scopeTx, ok);
      }

      // Minimal ACK (Meta only needs a 200 within ~5s).
      await reply.status(200).send({ received: true });
    },

    /**
     * POST /api/v1/webhooks/telegram/:pariwarId — verify the secret token → persist the raw update → ACK 200.
     * NO matching / consent / audit / external call (that is the worker's job). Telegram is POST-only (NO GET
     * challenge, unlike Meta). The trust key (the per-Pariwar secret token NAME) is known from the URL path
     * BEFORE the body is trusted; the header compare is constant-time; fail closed (persist nothing) on a
     * mismatch/missing config.
     */
    async receiveTelegram(request: FastifyRequest, reply: FastifyReply): Promise<void> {
      const { pariwarId: pariwarIdStr } = request.params as PariwarParams;

      const config = await readTelegramConfigScoped(pariwarIdStr);
      if (!config || !config.webhookSecretTokenName) {
        // No config / no secret-token NAME ⇒ cannot verify ⇒ fail closed (persist nothing).
        throw new ForbiddenError('secret-token verification failed', 'webhook.signature_rejected');
      }
      const expectedToken = await deps.resolveChannelSecret(config.webhookSecretTokenName);
      const provided = request.headers[TELEGRAM_SECRET_TOKEN_HEADER];
      const providedToken = Array.isArray(provided) ? provided[0] : provided;
      if (!providedToken || !timingSafeEqualString(providedToken, expectedToken)) {
        // Invalid/absent secret token → fail closed, persist NOTHING.
        throw new ForbiddenError('secret-token verification failed', 'webhook.signature_rejected');
      }

      // Verified. The scoped content-type parser captured the raw bytes (parseAs 'buffer'); parse the JSON
      // (Telegram always sends valid JSON) + persist on the scoped tx. NO downstream.
      const rawBody = (request as unknown as WithRawBody).rawBody;
      let payload: unknown;
      try {
        payload = rawBody ? JSON.parse(rawBody.toString('utf8')) : request.body;
      } catch {
        // A verified-but-unparseable body should never happen; reject rather than persist garbage.
        throw new ForbiddenError('secret-token verification failed', 'webhook.signature_rejected');
      }

      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        await telegramOptIn.persistInboundWebhookEvent(scopeTx.tx as Db, {
          pariwarId: ids.pariwarId(pariwarIdStr),
          rawPayload: payload,
          signatureVerified: true,
        });
        ok = true;
      } finally {
        await closeScopeTx(scopeTx, ok);
      }

      // Minimal ACK (Telegram retries on a non-2xx; a fast 200 clears the update).
      await reply.status(200).send({ received: true });
    },

    /**
     * POST /api/v1/webhooks/msg91/sms-reports — Story 6.37b (DR1, DR2, DR10; I3–I5; ADR-0042). MSG91's delivery
     * reports: verify the static header token → persist DR2's projection → ACK 200 (§3.11's persist-then-ack). ⛔
     * correlation, ⛔ KMS, ⛔ Secret Manager (the tokens were resolved at boot — `deps.smsReportWebhook`), ⛔ an outbound
     * call. MSG91 has ⛔ signature (F4) — the header token IS the auth (ADR-0042's deviation from step 1).
     * ⚠ I5 / T13 — the header is read as an INLINE literal and compared by two DIRECT `timingSafeEqualString` calls, the
     * shape the AI-5-1 gate recognises as a verification context (a boot-resolved token under any other name, or a compare
     * inside an arrow, would leave a `===` regression un-flagged). An array-valued header (`app.inject` only — Node joins
     * repeats with ", ") is refused.
     * Once authenticated, EVERY body answers 200 (a 4xx counts toward MSG91's auto-pause — F6): an unusable one with ⛔
     * row and ONE `sms_report.unusable_body` line; reports with ⛔ usable request id are dropped with ONE
     * `sms_report.bad_request_id` line (the count). ⛔ The body, ⛔ a parse error, ⛔ a number in any line (I3).
     */
    async receiveMsg91SmsReports(request: FastifyRequest, reply: FastifyReply): Promise<void> {
      const auth = deps.smsReportWebhook;
      const provided = request.headers['x-twt-msg91-secret-token'];
      let verified = false;
      if (typeof provided === 'string' && auth.current !== null) {
        if (timingSafeEqualString(provided, auth.current)) verified = true;
        else if (auth.next !== null && timingSafeEqualString(provided, auth.next)) verified = true;
      }
      if (!verified) {
        // A disabled webhook, an absent / wrong / repeated token ⇒ fail closed, persist NOTHING.
        throw new ForbiddenError('secret-token verification failed', 'webhook.signature_rejected');
      }

      const body = parseSmsReportBody(request.body);
      if (body.kind === 'unusable') {
        request.log.error({ alarm: 'sms_report.unusable_body' }, 'sms report webhook: an unusable body (⛔ stored)');
        await reply.status(200).send({ received: true });
        return;
      }
      const { rows, badRequestIds } = projectSmsReports(body.items);
      if (badRequestIds > 0) {
        request.log.error({ alarm: 'sms_report.bad_request_id', count: badRequestIds }, 'sms report webhook: reports without a usable request id (⛔ stored)');
      }
      if (rows.length > 0) {
        // ONE global transaction as twt_app; a failed COMMIT is RETHROWN ⇒ 5xx (MSG91 retries) — ⛔ a 200 for a lost write.
        await runGlobalAppTx(deps.pool, (client) => smsDelivery.persistSmsDeliveryReports(client, rows));
      }
      await reply.status(200).send({ received: true });
    },
  };

  /** Read the per-Pariwar Telegram config on a scoped tx (the webhook secret-token NAME lives here). */
  async function readTelegramConfigScoped(
    pariwarIdStr: string,
  ): Promise<{ webhookSecretTokenName: string | null } | null> {
    const scopeTx = await openScopeTx(deps, pariwarIdStr);
    let ok = false;
    try {
      const row = await channelConfig.getTelegramConfig(scopeTx.tx as Db, ids.pariwarId(pariwarIdStr));
      ok = true;
      if (!row) return null;
      return { webhookSecretTokenName: row.webhookSecretTokenSecretName };
    } finally {
      await closeScopeTx(scopeTx, ok);
    }
  }
}
