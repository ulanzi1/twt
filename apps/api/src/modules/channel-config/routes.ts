// Trustee WhatsApp Business config routes — Story 5.3 (Task 4; AC4, AC7).
//
// The scoped admin chain [requireAdminSession, scopeResolutionHook, requirePermissionHook(
// pariwar.configure_channels)] (the member-validity precedent). Scope-resolution sets request.scopeTx +
// request.scopeGrants; the permission hook fail-closes on deny (401 no session, 403 no permission — never a
// silent config write; AI-4-3(b)). All four routes register in openapi/v1.yaml (the EXPECTED diff).

import { TelegramConfigResponse, TelegramConfigUpsertRequest, WaConfigResponse, WaConfigUpsertRequest, WaTemplateDto, WaTemplateUpsertRequest, WaTemplatesResponse } from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { scopeResolutionHook } from '../../middleware/scope-resolution/index.js';
import { requireAdminSession } from '../auth/shared/session-guard.js';
import { requirePermissionHook } from '../rbac/index.js';
import { createChannelConfigHandlers } from './handlers.js';

const CHANNEL_CONFIG_TAG = 'channel-config';

const PariwarParam = z.object({ pariwarId: z.string().uuid() }).strict();

export function registerChannelConfigRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createChannelConfigHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const adminSession = requireAdminSession(deps);
  const scope = scopeResolutionHook(deps);
  const configureChannels = requirePermissionHook(deps, h.PARIWAR_CONFIGURE_CHANNELS_KEY);
  const chain = [adminSession, scope, configureChannels];

  // ── WA config singleton (GET + PUT) ──────────────────────────────────────────────────────────────
  r.get(
    '/api/v1/p/:pariwarId/admin/channel-config/whatsapp',
    {
      schema: { params: PariwarParam, response: { 200: WaConfigResponse }, tags: [CHANNEL_CONFIG_TAG] },
      preHandler: chain,
    },
    h.getWaConfig,
  );
  r.put(
    '/api/v1/p/:pariwarId/admin/channel-config/whatsapp',
    {
      schema: {
        params: PariwarParam,
        body: WaConfigUpsertRequest,
        response: { 200: WaConfigResponse },
        tags: [CHANNEL_CONFIG_TAG],
      },
      preHandler: chain,
    },
    h.putWaConfig,
  );

  // ── Per-category UTILITY template mapping (GET + PUT) ─────────────────────────────────────────────
  r.get(
    '/api/v1/p/:pariwarId/admin/channel-config/whatsapp/templates',
    {
      schema: { params: PariwarParam, response: { 200: WaTemplatesResponse }, tags: [CHANNEL_CONFIG_TAG] },
      preHandler: chain,
    },
    h.getWaTemplates,
  );
  r.put(
    '/api/v1/p/:pariwarId/admin/channel-config/whatsapp/templates',
    {
      schema: {
        params: PariwarParam,
        body: WaTemplateUpsertRequest,
        response: { 200: WaTemplateDto },
        tags: [CHANNEL_CONFIG_TAG],
      },
      preHandler: chain,
    },
    h.putWaTemplate,
  );

  // ── Story 5.5 — Telegram config singleton (GET + PUT) ────────────────────────────────────────────
  r.get(
    '/api/v1/p/:pariwarId/admin/channel-config/telegram',
    {
      schema: { params: PariwarParam, response: { 200: TelegramConfigResponse }, tags: [CHANNEL_CONFIG_TAG] },
      preHandler: chain,
    },
    h.getTelegramConfig,
  );
  r.put(
    '/api/v1/p/:pariwarId/admin/channel-config/telegram',
    {
      schema: {
        params: PariwarParam,
        body: TelegramConfigUpsertRequest,
        response: { 200: TelegramConfigResponse },
        tags: [CHANNEL_CONFIG_TAG],
      },
      preHandler: chain,
    },
    h.putTelegramConfig,
  );
}
