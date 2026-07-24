// Push device-token registration handlers — Story 5.2 (Task 4; AC3, AC7).
//
// Two caller-facing registration SURFACES + the delivery-resolver seam:
//   · registerMember — POST /api/v1/member/device-tokens (requireMemberSession, Story 3.2 app-open consumer)
//   · registerAdmin  — POST /api/v1/admin/device-tokens  (requireAdminSession, Story 1.9 admin-auth consumer)
//   · resolvePushTargets — the composition seam the (future) live dispatch reads active tokens through.
//
// ── Fail-closed (AI-4-3(a)/(b)) ────────────────────────────────────────────────────────────────────────
// Both endpoints are behind their session guard, and each handler re-narrows the request context: an
// absent member/admin identity throws 401 (never a silent register). The guard is the independent
// caller-auth; the ctx re-narrow is defense-in-depth.
//
// ── Tier-1 PII (AI-4-3(c)) + isolated best-effort audit (AI-4-3(d)) ────────────────────────────────────
// The token is encrypted + blind-indexed in the app layer (device-token-crypto.ts) before the accessor
// sees it; the audit line's `requestPayloadHash` is the blind-index HMAC — NEVER the raw token / sha256.
// The audit write runs on the BYPASSRLS `servicePool` AFTER the scope tx commits (never the caller's tx —
// writeAuditEntry commits its own advisory-locked tx) and is best-effort: a broken audit path logs, it
// never fails the registration.
//
// ── Admin scope ────────────────────────────────────────────────────────────────────────────────────────
// Admin identity is GLOBAL (Reconciliation R2) — no `app.pariwar_id`. Admin tokens key on the
// ADMIN_GLOBAL_NAMESPACE nil-UUID sentinel (the admin-identity family's convention) for BOTH the scope tx
// and the encryption context, so RLS + crypto apply uniformly.

import type {
  DeviceTokenPlatform,
  DeviceTokenRegisterRequest,
  DeviceTokenRegisterResponse,
} from '@twt/contracts';
import type { SendTarget } from '@twt/channels';
import { audit, deviceToken, ids, notifications, schema } from '@twt/domain';
import type { FastifyRequest } from 'fastify';

/** The owning-principal kinds — re-exported from `@twt/domain`'s schema, the single source of truth. */
type DeviceTokenPrincipalType = schema.DeviceTokenPrincipalType;

import { ADMIN_GLOBAL_NAMESPACE, type AppDeps } from '../../context.js';
import { UnauthorizedError } from '../../http-errors.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';
import type { ScopeTx } from '../../types.js';
import { deviceTokenBlindIndex, encryptDeviceToken } from './device-token-crypto.js';

interface RegisterParams {
  readonly pariwarIdStr: string;
  readonly principalType: DeviceTokenPrincipalType;
  readonly principalId: string;
  /** Set for member principals (= principalId, for RTBF cascade); null for admin. */
  readonly memberIdStr: string | null;
  readonly platform: DeviceTokenPlatform;
  readonly token: string;
  readonly auditAction: string;
}

export function createDeviceTokenHandlers(deps: AppDeps) {
  const enc = deps.encryption;

  /** The shared register core: encrypt + blind-index the token, upsert active (rebuild), audit best-effort. */
  async function register(
    request: FastifyRequest,
    params: RegisterParams,
  ): Promise<DeviceTokenRegisterResponse> {
    const tokenCiphertext = await encryptDeviceToken(params.token, params.pariwarIdStr, enc);
    const tokenBlindIndex = await deviceTokenBlindIndex(params.token, params.pariwarIdStr, enc);

    const scopeTx = await openScopeTx(deps, params.pariwarIdStr);
    let ok = false;
    try {
      await deviceToken.upsertActiveToken(scopeTx.tx, {
        pariwarId: ids.pariwarId(params.pariwarIdStr),
        principalType: params.principalType,
        principalId: params.principalId,
        memberId: params.memberIdStr ? ids.memberId(params.memberIdStr) : null,
        platform: params.platform,
        tokenCiphertext,
        tokenBlindIndex,
      });
      ok = true;
    } finally {
      await closeScopeTx(scopeTx, ok);
    }

    // Isolated best-effort audit AFTER commit — the blind index (HMAC) is the hash, never the raw token.
    await writeRegistrationAudit(deps, request, {
      pariwarIdStr: params.pariwarIdStr,
      actorId: params.principalId,
      action: params.auditAction,
      principalType: params.principalType,
      platform: params.platform,
      tokenBlindIndex,
    });

    return { status: 'registered', platform: params.platform };
  }

  return {
    /** POST /api/v1/member/device-tokens — register the member's device token (app open). */
    async registerMember(request: FastifyRequest): Promise<DeviceTokenRegisterResponse> {
      const body = request.body as DeviceTokenRegisterRequest;
      const memberIdStr = request.requestContext.actorId;
      const pariwarIdStr = request.requestContext.pariwarId;
      if (!memberIdStr || !pariwarIdStr) {
        throw new UnauthorizedError('Authentication required', 'auth.session_required');
      }
      return register(request, {
        pariwarIdStr,
        principalType: 'member',
        principalId: memberIdStr,
        memberIdStr,
        platform: body.platform,
        token: body.token,
        auditAction: 'member.device_token_register',
      });
    },

    /** POST /api/v1/admin/device-tokens — register the admin's device token (admin auth). */
    async registerAdmin(request: FastifyRequest): Promise<DeviceTokenRegisterResponse> {
      const body = request.body as DeviceTokenRegisterRequest;
      const adminIdStr = request.requestContext.actorId;
      if (!adminIdStr) {
        throw new UnauthorizedError('Authentication required', 'auth.session_required');
      }
      return register(request, {
        // Admin identity is global — key on the nil-UUID admin-global namespace.
        pariwarIdStr: ADMIN_GLOBAL_NAMESPACE,
        principalType: 'admin',
        principalId: adminIdStr,
        memberIdStr: null, // an admin is not a member row — no RTBF cascade FK
        platform: body.platform,
        token: body.token,
        auditAction: 'admin.device_token_register',
      });
    },
  };
}

/**
 * Resolve a principal's active push `SendTarget`s (the delivery seam). Reads the active tokens, decrypts
 * each under the SAME (pariwarId, field-class) context they were written under, and sets `platform` so
 * `selectProvider` routes fcm-vs-apns. Decryption happens at the composition layer, never inside
 * `dispatch` / the provider.
 *
 * ── RELOCATED to @twt/domain by Story 8.8 (Task 1) — this is now a thin adapter ────────────────────────
 * The read moved VERBATIM to `packages/domain/src/notifications/delivery.ts` so `apps/jobs` (the stack's
 * FIRST live `dispatch()` fan-out) can call it — apps/jobs cannot import apps/api. This wrapper keeps the
 * apps/api signature (`AppDeps` + `ScopeTx`) so no apps/api call site changed; it only unwraps the bundle.
 * `DeliveryTarget` is the structural twin of `SendTarget` (domain cannot import `@twt/channels` — that
 * edge would be a cycle), so the return value satisfies `SendTarget[]` by structural typing.
 *
 * ── v1 seam note (recorded in the Story 5.2 Dev Agent Record; RESOLVED by Story 8.8) ──────────────────
 * A member can have MANY active tokens (multiple devices) — this returns them all, while the frozen 5.1
 * `DeliveryResolver` returns ONE `SendTarget` per channel. Story 8.8 resolves that in the COMPOSITION
 * (`apps/jobs/src/scheduler/contribution-notify.ts` iterates the device targets on the push rung and
 * treats the rung as `sent` if ANY device accepted) — the frozen `DeliveryResolver`/`dispatch` are unchanged.
 */
export async function resolvePushTargets(
  deps: AppDeps,
  scopeTx: ScopeTx,
  pariwarIdStr: string,
  principalType: DeviceTokenPrincipalType,
  principalId: string,
): Promise<SendTarget[]> {
  return notifications.resolvePushTargets(
    scopeTx.tx,
    deps.encryption,
    pariwarIdStr,
    principalType,
    principalId,
  );
}

interface RegistrationAuditFields {
  readonly pariwarIdStr: string;
  readonly actorId: string;
  readonly action: string;
  readonly principalType: DeviceTokenPrincipalType;
  readonly platform: DeviceTokenPlatform;
  readonly tokenBlindIndex: string;
}

/** Best-effort isolated audit write (AI-4-3(c)/(d)) — HMAC as the hash, never the raw token; never throws. */
async function writeRegistrationAudit(
  deps: AppDeps,
  request: FastifyRequest,
  fields: RegistrationAuditFields,
): Promise<void> {
  try {
    await audit.writeAuditEntry(deps.servicePool, {
      pariwarId: fields.pariwarIdStr,
      actorId: fields.actorId,
      actorRole: null,
      action: fields.action,
      resourceLocator: `device_token;principal=${fields.principalType};platform=${fields.platform}`,
      requestPayloadHash: fields.tokenBlindIndex, // 64-hex HMAC blind index (AC7(c) — never raw token)
      responseStatus: 200,
      traceId: request.requestContext.traceId ?? null,
    });
  } catch (err) {
    // A broken audit path never fails registration (AI-4-3(d)).
    request.log.error({ err, action: fields.action }, '[device-token] audit write failed');
  }
}
