// `pariwar_wa_config` — the per-Pariwar WhatsApp Business config substrate (Story 5.3, Task 1; AC3).
//
// 1:1 with a Pariwar (mirrors pariwar_passport's singleton shape: `pariwar_id` is BOTH the primary key AND
// the tenant key the RLS write policy scopes on). Gates + parameterizes WA delivery: the FR-72 admin
// `enabled` toggle, the member-facing display number, Meta's `phone_number_id` / `waba_id` send addressing,
// the Secret-Manager NAME pointer to the per-Pariwar access token, and the pinned Graph API version.
//
// ── The credential is a NAME, not a value (AR-17, AI-4-3(c)) ───────────────────────────────────────────
// `access_token_secret_name` is a Secret-Manager NAME (a POINTER), never the token value — the composition
// layer resolves NAME → value via `resolveSecretValue` at send time and NEVER persists/logs/audits the
// resolved token. A NAME is not a secret, so this column is plain `text` (NOT piiColumn) — unlike
// member_device_tokens, whose token IS the secret. NULL ⇒ the channel resolves to the log-only fixture
// (the opt-in-real convention: turnstile/digilocker/kyc; and 5.2's fixture-push).
//
// ── RLS: standard inline tenant-isolation (0037/0025 shape), NOT pariwar_passport's carve-out ──────────
// WA config is NOT public identity — a Pariwar's Meta credentials/config must NOT be cross-tenant readable.
// So this follows the STANDARD inline tenant-isolated RLS (like member_device_tokens), NOT
// pariwar_passport's cross-tenant-READ carve-out (which exists only because branding is public). The RLS
// lives INLINE in migration 0038 (no separate *-rls.sql — the 0025/0037 pattern).
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS fields camelCase.

import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import type { PariwarId, UserId } from '../ids/index.js';

/** The Graph API version pinned by default — a Meta version bump is a CONFIG change, not a redeploy (AC3). */
export const DEFAULT_GRAPH_API_VERSION = 'v21.0' as const;

export const pariwarWaConfig = pgTable('pariwar_wa_config', {
  // Primary key AND tenant key. 1:1 with a Pariwar (the pariwar_passport singleton shape). NO
  // defaultRandom() — the pariwar_id is assigned by provisioning, never minted here.
  pariwarId: uuid('pariwar_id').$type<PariwarId>().primaryKey(),

  // The FR-72 admin toggle — the ADMIN half of the dual gate (member opt-in ACTIVE is Story 5.4's gate;
  // both are enforced by the DeliveryResolver, NOT the provider). Default false: a freshly-created config
  // row is OFF until the trustee explicitly enables WA delivery. `enabled=false` ⇒ fixture (log-only).
  enabled: boolean('enabled').notNull().default(false),

  // The human-readable WA Business number, member-facing — shown in the 5.4 opt-in "Send Hello" deep-link.
  // Nullable: a config row may exist (disabled) before the trustee has provisioned a number.
  displayPhoneNumber: text('display_phone_number'),

  // Meta's numeric phone-number id used in the send URL (POST /<phone_number_id>/messages). Nullable until
  // provisioned. Distinct from the display number (which is cosmetic).
  phoneNumberId: text('phone_number_id'),

  // WhatsApp Business Account id. Nullable until provisioned. Recorded for template-registry provenance.
  wabaId: text('waba_id'),

  // The Secret-Manager NAME (a POINTER) for the per-Pariwar Meta system-user access token — NEVER the
  // value. NULL ⇒ the channel resolves to the fixture (opt-in-real). Plain text: a NAME is not a secret.
  accessTokenSecretName: text('access_token_secret_name'),

  // The pinned Graph API version (e.g. v21.0). NOT NULL, defaulted — so a Meta version bump is a config
  // change, not a redeploy (AC3). The provider reads this into the send URL.
  graphApiVersion: text('graph_api_version').notNull().default(DEFAULT_GRAPH_API_VERSION),

  // ── Story 5.4 (Task 2) — inbound-webhook credential NAME pointers ─────────────────────────────────────
  // Both are Secret-Manager NAMEs (pointers), NEVER the secret value — the SAME AI-4-3(c) discipline
  // access_token_secret_name uses. Plain text (a NAME is not a secret); NULLABLE. The webhook ingress
  // primitive (apps/api/src/modules/channel-webhooks/) resolves NAME → value at request time and NEVER
  // persists/logs/audits the resolved value.

  // The NAME of the Meta APP SECRET used to verify inbound X-Hub-Signature-256 (HMAC-SHA256 over the RAW
  // request body). NULL ⇒ this Pariwar's webhook cannot be verified ⇒ the POST receiver rejects (fail-closed).
  appSecretSecretName: text('app_secret_secret_name'),

  // The NAME of the token echoed in Meta's GET subscription-verification challenge (`hub.verify_token`).
  // NULL ⇒ the GET challenge fails-closed (no subscription can be verified for this Pariwar).
  webhookVerifyTokenSecretName: text('webhook_verify_token_secret_name'),

  // The admin actor who last wrote this config (audit provenance). NULL = system/seed. FK-free at the
  // column layer (mirrors events_log.actor_id nullable-actor precedent); the audit line carries the actor.
  updatedByActor: uuid('updated_by_actor').$type<UserId>(),

  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export type PariwarWaConfigRow = typeof pariwarWaConfig.$inferSelect;
export type PariwarWaConfigInsert = typeof pariwarWaConfig.$inferInsert;
