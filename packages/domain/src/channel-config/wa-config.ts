// Per-Pariwar WhatsApp Business config accessors — Story 5.3 (Task 1; AC3).
//
// A transport-free PRIMITIVE: NO HTTP, NO Secret-Manager resolution, NO Meta calls. The accessors persist
// + read the config/template rows; the composition layer resolves the access-token NAME → value at send
// time (never here). Runs its statements DIRECTLY on the passed (scoped) `Db`, so an admin caller is
// already inside its `SET LOCAL app.pariwar_id` tx (RLS enforces the tenant match) — the member_device_token
// accessor precedent.
//
// ── The credential column is a NAME pointer, never a value ─────────────────────────────────────────────
// `accessTokenSecretName` is a Secret-Manager NAME (a pointer). These accessors read/write it as opaque
// text; they NEVER resolve, log, or audit the token value (AI-4-3(c)). NULL ⇒ the channel resolves to the
// log-only fixture (opt-in-real).

import { and, eq } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { PariwarId, UserId } from '../ids/index.js';
import {
  type PariwarWaConfigRow,
  pariwarWaConfig,
} from '../schema/pariwar_wa_config.js';
import {
  type PariwarWaTemplateRow,
  type WaTemplateApprovalStatus,
  pariwarWaTemplates,
} from '../schema/pariwar_wa_templates.js';

/** The writable fields of a Pariwar's WA config (the admin config-write DTO shape). */
export interface WaConfigUpsertInput {
  readonly pariwarId: PariwarId;
  readonly enabled: boolean;
  readonly displayPhoneNumber: string | null;
  readonly phoneNumberId: string | null;
  readonly wabaId: string | null;
  /** Secret-Manager NAME pointer (NOT the token value). NULL ⇒ fixture. */
  readonly accessTokenSecretName: string | null;
  readonly graphApiVersion: string;
  /** Story 5.4 — NAME of the Meta app secret for X-Hub-Signature-256 verification (NOT the value). NULL ⇒ reject. */
  readonly appSecretSecretName: string | null;
  /** Story 5.4 — NAME of the GET-challenge verify token (NOT the value). NULL ⇒ challenge fails-closed. */
  readonly webhookVerifyTokenSecretName: string | null;
  /** The admin actor writing the config (audit provenance). NULL = system/seed. */
  readonly updatedByActor: UserId | null;
}

/** One per-category template mapping to upsert. */
export interface WaTemplateUpsertInput {
  readonly templateName: string;
  readonly languageCode: string;
  readonly approvalStatus: WaTemplateApprovalStatus;
}

/** The single approved template for a category — the resolveApprovedTemplate result (or null ⇒ ineligible). */
export interface ApprovedWaTemplate {
  readonly templateName: string;
  readonly languageCode: string;
}

/** Read a Pariwar's WA config singleton, or null when none exists (⇒ fixture). Tenant-scoped (RLS). */
export async function getWaConfig(db: Db, pariwarId: PariwarId): Promise<PariwarWaConfigRow | null> {
  const rows = await db.select().from(pariwarWaConfig).where(eq(pariwarWaConfig.pariwarId, pariwarId));
  return rows[0] ?? null;
}

/**
 * Upsert a Pariwar's WA config singleton (1:1 on pariwar_id). Latest-wins on conflict; bumps updated_at
 * (DB clock). Tenant-scoped (RLS + the pariwar_id key). Never persists the resolved token value — only the
 * NAME pointer the caller passes.
 */
export async function upsertWaConfig(db: Db, input: WaConfigUpsertInput): Promise<void> {
  await db
    .insert(pariwarWaConfig)
    .values({
      pariwarId: input.pariwarId,
      enabled: input.enabled,
      displayPhoneNumber: input.displayPhoneNumber,
      phoneNumberId: input.phoneNumberId,
      wabaId: input.wabaId,
      accessTokenSecretName: input.accessTokenSecretName,
      graphApiVersion: input.graphApiVersion,
      appSecretSecretName: input.appSecretSecretName,
      webhookVerifyTokenSecretName: input.webhookVerifyTokenSecretName,
      updatedByActor: input.updatedByActor,
    })
    .onConflictDoUpdate({
      target: pariwarWaConfig.pariwarId,
      set: {
        enabled: input.enabled,
        displayPhoneNumber: input.displayPhoneNumber,
        phoneNumberId: input.phoneNumberId,
        wabaId: input.wabaId,
        accessTokenSecretName: input.accessTokenSecretName,
        graphApiVersion: input.graphApiVersion,
        appSecretSecretName: input.appSecretSecretName,
        webhookVerifyTokenSecretName: input.webhookVerifyTokenSecretName,
        updatedByActor: input.updatedByActor,
        updatedAt: new Date(),
      },
    });
}

/**
 * Reverse-lookup a Pariwar's WA config by Meta's `phone_number_id` (Story 5.4, Task 2) — the async webhook
 * worker needs Pariwar-from-phone_number_id when correlating a persisted status callback. The trust-
 * establishing signature-verification path uses the URL `:pariwarId` (NOT this — the payload must not be
 * trusted to select the verification key); this backs status-callback correlation + cross-checks AFTER the
 * event is already verified + persisted. Runs on the passed (service or scoped) `Db`. Returns null when no
 * config carries that phone_number_id.
 */
export async function getWaConfigByPhoneNumberId(
  db: Db,
  phoneNumberId: string,
): Promise<PariwarWaConfigRow | null> {
  const rows = await db
    .select()
    .from(pariwarWaConfig)
    .where(eq(pariwarWaConfig.phoneNumberId, phoneNumberId))
    .limit(1);
  return rows[0] ?? null;
}

/** List all per-category template mappings for a Pariwar (the admin read + delivery listing). Tenant-scoped. */
export async function listWaTemplates(db: Db, pariwarId: PariwarId): Promise<PariwarWaTemplateRow[]> {
  return db.select().from(pariwarWaTemplates).where(eq(pariwarWaTemplates.pariwarId, pariwarId));
}

/**
 * Upsert one per-category template mapping (latest-wins on the (pariwar_id, alert_category) unique key).
 * Bumps updated_at. Tenant-scoped. `alertCategory` is the raw enum value string (the contract validates it).
 */
export async function upsertWaTemplate(
  db: Db,
  pariwarId: PariwarId,
  alertCategory: string,
  input: WaTemplateUpsertInput,
): Promise<void> {
  await db
    .insert(pariwarWaTemplates)
    .values({
      pariwarId,
      alertCategory,
      templateName: input.templateName,
      languageCode: input.languageCode,
      approvalStatus: input.approvalStatus,
    })
    .onConflictDoUpdate({
      target: [pariwarWaTemplates.pariwarId, pariwarWaTemplates.alertCategory],
      set: {
        templateName: input.templateName,
        languageCode: input.languageCode,
        approvalStatus: input.approvalStatus,
        updatedAt: new Date(),
      },
    });
}

/**
 * Resolve the single APPROVED template for a (pariwar, category), or null when none is approved (⇒ the
 * category is NOT WA-eligible — the delivery seam skips WA). Only `approval_status = 'approved'` qualifies;
 * a pending/rejected/paused row returns null. Backed by the (pariwar_id, alert_category, approval_status)
 * index. Tenant-scoped.
 */
export async function resolveApprovedTemplate(
  db: Db,
  pariwarId: PariwarId,
  alertCategory: string,
): Promise<ApprovedWaTemplate | null> {
  const rows = await db
    .select({ templateName: pariwarWaTemplates.templateName, languageCode: pariwarWaTemplates.languageCode })
    .from(pariwarWaTemplates)
    .where(
      and(
        eq(pariwarWaTemplates.pariwarId, pariwarId),
        eq(pariwarWaTemplates.alertCategory, alertCategory),
        eq(pariwarWaTemplates.approvalStatus, 'approved'),
      ),
    );
  return rows[0] ?? null;
}
