// Trustee WhatsApp Business config handlers — Story 5.3 (Task 4; AC4, AC7).
//
// Four thin handlers over the `@twt/domain` channelConfig accessors, on the scoped admin chain
// [requireAdminSession, scopeResolutionHook, requirePermissionHook(pariwar.configure_channels)] (the
// member-validity precedent). The route chain already enforced the session + scope + permission; each
// handler uses the RLS-scoped `request.scopeTx.tx` for reads/writes and `deps.servicePool` for the audit
// line. Writes are AUDITED via the Story 1.10 hash-chain writer.
//
// ── Credential discipline (AI-4-3(c)) ──────────────────────────────────────────────────────────────────
// `accessTokenSecretName` is a Secret-Manager NAME (a POINTER) — safe to store, round-trip, and audit. The
// RESOLVED token value NEVER appears in this module (the composition layer resolves it at send time). The
// audit request-hash is computed over NON-secret config fields only.

import { createHash } from 'node:crypto';

import { audit, canonicalJsonStringify, channelConfig, ids, schema, type Db } from '@twt/domain';
import type {
  TelegramConfigResponse,
  TelegramConfigUpsertRequest,
  WaConfigResponse,
  WaConfigUpsertRequest,
  WaTemplateDto,
  WaTemplateUpsertRequest,
  WaTemplatesResponse,
} from '@twt/contracts';
import type { FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { ConflictError } from '../../http-errors.js';

/** The `pariwar.configure_channels` key (Story 5.3, catalog v5) — the WA config WRITE gate. */
const PARIWAR_CONFIGURE_CHANNELS_KEY = 'pariwar.configure_channels';

export function createChannelConfigHandlers(deps: AppDeps) {
  /** Read the scope-resolved tx + actor, or throw (the route chain guarantees both are present). */
  function scopeCtx(request: FastifyRequest): { tx: Db; pariwarIdStr: string; actorId: string } {
    const scopeTx = request.scopeTx;
    const actorId = request.requestContext.actorId;
    if (!scopeTx || !actorId) {
      throw new Error('[channel-config] handler ran without session + scope-resolution');
    }
    return { tx: scopeTx.tx, pariwarIdStr: scopeTx.pariwarId, actorId };
  }

  return {
    PARIWAR_CONFIGURE_CHANNELS_KEY,

    /** GET the WA config singleton (zero-config defaults when no row exists yet). */
    async getWaConfig(request: FastifyRequest): Promise<WaConfigResponse> {
      const { tx, pariwarIdStr } = scopeCtx(request);
      const row = await channelConfig.getWaConfig(tx, ids.pariwarId(pariwarIdStr));
      if (!row) {
        return {
          configured: false,
          config: {
            enabled: false,
            displayPhoneNumber: null,
            phoneNumberId: null,
            wabaId: null,
            accessTokenSecretName: null,
            graphApiVersion: schema.DEFAULT_GRAPH_API_VERSION,
            appSecretSecretName: null,
            webhookVerifyTokenSecretName: null,
          },
        };
      }
      return {
        configured: true,
        config: {
          enabled: row.enabled,
          displayPhoneNumber: row.displayPhoneNumber,
          phoneNumberId: row.phoneNumberId,
          wabaId: row.wabaId,
          accessTokenSecretName: row.accessTokenSecretName,
          graphApiVersion: row.graphApiVersion,
          appSecretSecretName: row.appSecretSecretName,
          webhookVerifyTokenSecretName: row.webhookVerifyTokenSecretName,
        },
      };
    },

    /** PUT the WA config singleton (upsert + audit, compensated on failure per ADR-0030). NEVER audits a
     *  token value (the NAME is a pointer). */
    async putWaConfig(request: FastifyRequest): Promise<WaConfigResponse> {
      const { tx, pariwarIdStr, actorId } = scopeCtx(request);
      const body = request.body as WaConfigUpsertRequest;
      const pariwarId = ids.pariwarId(pariwarIdStr);

      return audit.withCompensatingAudit(deps.servicePool, {
        // Audit over NON-secret config fields only (the credential NAME is a safe pointer; the resolved
        // token never appears here). No token value ever reaches the audit hash.
        auditIntent: {
          pariwarId: pariwarIdStr,
          actorId,
          actorRole: null,
          action: 'pariwar.wa_config_update',
          resourceLocator: `pariwar/${pariwarIdStr}/channel-config/whatsapp`,
          requestPayloadHash: createHash('sha256')
            .update(
              canonicalJsonStringify({
                pariwar_id: pariwarIdStr,
                enabled: body.enabled,
                display_phone_number: body.displayPhoneNumber,
                phone_number_id: body.phoneNumberId,
                waba_id: body.wabaId,
                // NAME pointers only — the resolved secret values NEVER reach the audit hash (AI-4-3(c)).
                access_token_secret_name: body.accessTokenSecretName,
                graph_api_version: body.graphApiVersion,
                app_secret_secret_name: body.appSecretSecretName,
                webhook_verify_token_secret_name: body.webhookVerifyTokenSecretName,
              }),
              'utf8',
            )
            .digest('hex'),
          traceId: request.requestContext.traceId ?? null,
        },
        mutate: async () => {
          await channelConfig.upsertWaConfig(tx, {
            pariwarId,
            enabled: body.enabled,
            displayPhoneNumber: body.displayPhoneNumber,
            phoneNumberId: body.phoneNumberId,
            wabaId: body.wabaId,
            accessTokenSecretName: body.accessTokenSecretName,
            graphApiVersion: body.graphApiVersion,
            appSecretSecretName: body.appSecretSecretName,
            webhookVerifyTokenSecretName: body.webhookVerifyTokenSecretName,
            updatedByActor: ids.userId(actorId),
          });

          return {
            configured: true,
            config: {
              enabled: body.enabled,
              displayPhoneNumber: body.displayPhoneNumber,
              phoneNumberId: body.phoneNumberId,
              wabaId: body.wabaId,
              accessTokenSecretName: body.accessTokenSecretName,
              graphApiVersion: body.graphApiVersion,
              appSecretSecretName: body.appSecretSecretName,
              webhookVerifyTokenSecretName: body.webhookVerifyTokenSecretName,
            },
          };
        },
      });
    },

    /** GET the full per-category UTILITY template mapping. */
    async getWaTemplates(request: FastifyRequest): Promise<WaTemplatesResponse> {
      const { tx, pariwarIdStr } = scopeCtx(request);
      const rows = await channelConfig.listWaTemplates(tx, ids.pariwarId(pariwarIdStr));
      const templates: WaTemplateDto[] = rows.map((r) => ({
        alertCategory: r.alertCategory as WaTemplateDto['alertCategory'],
        templateName: r.templateName,
        languageCode: r.languageCode,
        approvalStatus: r.approvalStatus as WaTemplateDto['approvalStatus'],
      }));
      return { templates };
    },

    /** PUT one category's template mapping (upsert + audit, compensated on failure per ADR-0030). */
    async putWaTemplate(request: FastifyRequest): Promise<WaTemplateDto> {
      const { tx, pariwarIdStr, actorId } = scopeCtx(request);
      const body = request.body as WaTemplateUpsertRequest;
      const pariwarId = ids.pariwarId(pariwarIdStr);

      // pariwar_wa_templates.pariwar_id is a NOT-NULL FK to pariwar_wa_config — fail with a clean 409
      // instead of letting the insert hit an opaque Postgres FK violation (the config form must be saved
      // first; the admin UI does not otherwise enforce that ordering). Checked BEFORE the audit-or-mutate
      // section — a missing config is not an audited event.
      const config = await channelConfig.getWaConfig(tx, pariwarId);
      if (!config) {
        throw new ConflictError(
          'The WhatsApp Business config must be saved before a template mapping can be added',
          'channel_config.wa_config_missing',
        );
      }

      return audit.withCompensatingAudit(deps.servicePool, {
        auditIntent: {
          pariwarId: pariwarIdStr,
          actorId,
          actorRole: null,
          action: 'pariwar.wa_template_update',
          resourceLocator: `pariwar/${pariwarIdStr}/channel-config/whatsapp/templates/${body.alertCategory}`,
          requestPayloadHash: createHash('sha256')
            .update(
              canonicalJsonStringify({
                pariwar_id: pariwarIdStr,
                alert_category: body.alertCategory,
                template_name: body.templateName,
                language_code: body.languageCode,
                approval_status: body.approvalStatus,
              }),
              'utf8',
            )
            .digest('hex'),
          traceId: request.requestContext.traceId ?? null,
        },
        mutate: async () => {
          await channelConfig.upsertWaTemplate(tx, pariwarId, body.alertCategory, {
            templateName: body.templateName,
            languageCode: body.languageCode,
            approvalStatus: body.approvalStatus,
          });

          return {
            alertCategory: body.alertCategory,
            templateName: body.templateName,
            languageCode: body.languageCode,
            approvalStatus: body.approvalStatus,
          };
        },
      });
    },

    // ── Story 5.5 — trustee Telegram Bot config (GET + PUT) ───────────────────────────────────────────

    /** GET the Telegram config singleton (zero-config defaults when no row exists yet). */
    async getTelegramConfig(request: FastifyRequest): Promise<TelegramConfigResponse> {
      const { tx, pariwarIdStr } = scopeCtx(request);
      const row = await channelConfig.getTelegramConfig(tx, ids.pariwarId(pariwarIdStr));
      if (!row) {
        return {
          configured: false,
          config: {
            enabled: false,
            botUsername: null,
            botTokenSecretName: null,
            webhookSecretTokenSecretName: null,
          },
        };
      }
      return {
        configured: true,
        config: {
          enabled: row.enabled,
          botUsername: row.botUsername,
          botTokenSecretName: row.botTokenSecretName,
          webhookSecretTokenSecretName: row.webhookSecretTokenSecretName,
        },
      };
    },

    /** PUT the Telegram config singleton (upsert + audit, compensated on failure per ADR-0030). NEVER
     *  audits a token value (the NAME is a pointer). */
    async putTelegramConfig(request: FastifyRequest): Promise<TelegramConfigResponse> {
      const { tx, pariwarIdStr, actorId } = scopeCtx(request);
      const body = request.body as TelegramConfigUpsertRequest;
      const pariwarId = ids.pariwarId(pariwarIdStr);

      return audit.withCompensatingAudit(deps.servicePool, {
        // Audit over NON-secret config fields only (the credential NAMEs are safe pointers; the resolved
        // token never appears here). No token value ever reaches the audit hash (AI-4-3(c)).
        auditIntent: {
          pariwarId: pariwarIdStr,
          actorId,
          actorRole: null,
          action: 'pariwar.telegram_config_update',
          resourceLocator: `pariwar/${pariwarIdStr}/channel-config/telegram`,
          requestPayloadHash: createHash('sha256')
            .update(
              canonicalJsonStringify({
                pariwar_id: pariwarIdStr,
                enabled: body.enabled,
                bot_username: body.botUsername,
                // NAME pointers only — the resolved secret values NEVER reach the audit hash (AI-4-3(c)).
                bot_token_secret_name: body.botTokenSecretName,
                webhook_secret_token_secret_name: body.webhookSecretTokenSecretName,
              }),
              'utf8',
            )
            .digest('hex'),
          traceId: request.requestContext.traceId ?? null,
        },
        mutate: async () => {
          await channelConfig.upsertTelegramConfig(tx, {
            pariwarId,
            enabled: body.enabled,
            botUsername: body.botUsername,
            botTokenSecretName: body.botTokenSecretName,
            webhookSecretTokenSecretName: body.webhookSecretTokenSecretName,
            updatedByActor: ids.userId(actorId),
          });

          return {
            configured: true,
            config: {
              enabled: body.enabled,
              botUsername: body.botUsername,
              botTokenSecretName: body.botTokenSecretName,
              webhookSecretTokenSecretName: body.webhookSecretTokenSecretName,
            },
          };
        },
      });
    },
  };
}
