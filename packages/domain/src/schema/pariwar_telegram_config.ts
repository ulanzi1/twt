// `pariwar_telegram_config` — the per-Pariwar Telegram Bot config substrate (Story 5.5, Task 2; AC1/AC3).
//
// 1:1 with a Pariwar (mirrors pariwar_wa_config's singleton shape: `pariwar_id` is BOTH the primary key AND
// the tenant key the RLS write policy scopes on). Gates + parameterizes Telegram delivery: the FR-58C v1
// `enabled` toggle (the "feature flag" — the full per-cohort flag engine is Epic 10; v1 realizes the lock as
// this per-Pariwar boolean, default false — see the Story 5.5 "FR-58C substitution" Dev Note), the
// member-facing bot username (for the `t.me/<bot>?start=` deep-link), and the Secret-Manager NAME pointers to
// the bot token + the webhook secret-token.
//
// ── The credential is a NAME, not a value (AR-17, AI-4-3(c)) ───────────────────────────────────────────
// `bot_token_secret_name` / `webhook_secret_token_secret_name` are Secret-Manager NAMEs (POINTERS), never the
// secret values — the composition/webhook layers resolve NAME → value at send/verify time and NEVER
// persist/log/audit the resolved value. A NAME is not a secret, so both columns are plain `text` (NOT
// piiColumn). NULL bot_token_secret_name ⇒ the channel resolves to the log-only fixture (the opt-in-real
// convention). NULL webhook_secret_token_secret_name ⇒ the webhook receiver fails-closed.
//
// ── RLS: standard inline tenant-isolation (0037/0038 shape), NOT pariwar_passport's carve-out ──────────
// Telegram config is NOT public identity — a Pariwar's bot credentials must NOT be cross-tenant readable. So
// this follows STANDARD inline tenant-isolated RLS (like pariwar_wa_config), NOT pariwar_passport's
// cross-tenant-READ carve-out. The RLS lives INLINE in migration 0045 (no separate *-rls.sql).
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS fields camelCase.

import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import type { PariwarId, UserId } from '../ids/index.js';

export const pariwarTelegramConfig = pgTable('pariwar_telegram_config', {
  // Primary key AND tenant key. 1:1 with a Pariwar (the pariwar_wa_config singleton shape). NO
  // defaultRandom() — the pariwar_id is assigned by provisioning, never minted here.
  pariwarId: uuid('pariwar_id').$type<PariwarId>().primaryKey(),

  // The FR-58C v1 flag — the ADMIN gate this story ships (the member opt-in ACTIVE is the second half of the
  // dual gate; both are enforced by the composition resolver, NOT the provider). Default false: v1 ships
  // DISABLED by default; a trustee enables it per-Pariwar. `enabled=false` ⇒ fixture (log-only).
  enabled: boolean('enabled').notNull().default(false),

  // The member-facing bot username used in the opt-in deep-link (`https://t.me/<bot_username>?start=<code>`).
  // Nullable: a config row may exist (disabled) before the trustee has provisioned a bot.
  botUsername: text('bot_username'),

  // The Secret-Manager NAME (a POINTER) for the per-Pariwar Telegram bot token — NEVER the value. NULL ⇒ the
  // channel resolves to the fixture (opt-in-real). Plain text: a NAME is not a secret.
  botTokenSecretName: text('bot_token_secret_name'),

  // The Secret-Manager NAME (a POINTER) for the `X-Telegram-Bot-Api-Secret-Token` value the webhook receiver
  // constant-time compares against — NEVER the value. NULL ⇒ the webhook receiver fails-closed (no update can
  // be verified for this Pariwar).
  webhookSecretTokenSecretName: text('webhook_secret_token_secret_name'),

  // The admin actor who last wrote this config (audit provenance). NULL = system/seed. FK-free at the column
  // layer (mirrors pariwar_wa_config.updated_by_actor); the audit line carries the actor.
  updatedByActor: uuid('updated_by_actor').$type<UserId>(),

  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export type PariwarTelegramConfigRow = typeof pariwarTelegramConfig.$inferSelect;
export type PariwarTelegramConfigInsert = typeof pariwarTelegramConfig.$inferInsert;
