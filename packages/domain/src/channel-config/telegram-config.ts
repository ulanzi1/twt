// Per-Pariwar Telegram Bot config accessors — Story 5.5 (Task 3; AC1/AC3).
//
// A transport-free PRIMITIVE: NO HTTP, NO Secret-Manager resolution, NO Telegram calls. The accessors persist
// + read the config row; the composition/webhook layers resolve the bot-token / webhook-secret NAMEs → values
// at send/verify time (never here). Runs its statements DIRECTLY on the passed (scoped) `Db`, so an admin
// caller is already inside its `SET LOCAL app.pariwar_id` tx (RLS enforces the tenant match). Mirrors
// wa-config.ts.
//
// ── The credential columns are NAME pointers, never values ─────────────────────────────────────────────
// `botTokenSecretName` / `webhookSecretTokenSecretName` are Secret-Manager NAMEs (pointers). These accessors
// read/write them as opaque text; they NEVER resolve, log, or audit the secret values (AI-4-3(c)). A NULL
// bot-token NAME ⇒ the channel resolves to the log-only fixture (opt-in-real).

import { eq } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { PariwarId, UserId } from '../ids/index.js';
import {
  type PariwarTelegramConfigRow,
  pariwarTelegramConfig,
} from '../schema/pariwar_telegram_config.js';

/** The writable fields of a Pariwar's Telegram config (the admin config-write DTO shape). */
export interface TelegramConfigUpsertInput {
  readonly pariwarId: PariwarId;
  readonly enabled: boolean;
  readonly botUsername: string | null;
  /** Secret-Manager NAME pointer (NOT the bot-token value). NULL ⇒ fixture. */
  readonly botTokenSecretName: string | null;
  /** Secret-Manager NAME pointer (NOT the secret-token value). NULL ⇒ webhook fails-closed. */
  readonly webhookSecretTokenSecretName: string | null;
  /** The admin actor writing the config (audit provenance). NULL = system/seed. */
  readonly updatedByActor: UserId | null;
}

/** Read a Pariwar's Telegram config singleton, or null when none exists (⇒ fixture). Tenant-scoped (RLS). */
export async function getTelegramConfig(
  db: Db,
  pariwarId: PariwarId,
): Promise<PariwarTelegramConfigRow | null> {
  const rows = await db
    .select()
    .from(pariwarTelegramConfig)
    .where(eq(pariwarTelegramConfig.pariwarId, pariwarId));
  return rows[0] ?? null;
}

/**
 * Upsert a Pariwar's Telegram config singleton (1:1 on pariwar_id). Latest-wins on conflict; bumps updated_at
 * (DB clock). Tenant-scoped (RLS + the pariwar_id key). Never persists a resolved token value — only the NAME
 * pointers the caller passes.
 */
export async function upsertTelegramConfig(db: Db, input: TelegramConfigUpsertInput): Promise<void> {
  await db
    .insert(pariwarTelegramConfig)
    .values({
      pariwarId: input.pariwarId,
      enabled: input.enabled,
      botUsername: input.botUsername,
      botTokenSecretName: input.botTokenSecretName,
      webhookSecretTokenSecretName: input.webhookSecretTokenSecretName,
      updatedByActor: input.updatedByActor,
    })
    .onConflictDoUpdate({
      target: pariwarTelegramConfig.pariwarId,
      set: {
        enabled: input.enabled,
        botUsername: input.botUsername,
        botTokenSecretName: input.botTokenSecretName,
        webhookSecretTokenSecretName: input.webhookSecretTokenSecretName,
        updatedByActor: input.updatedByActor,
        updatedAt: new Date(),
      },
    });
}
