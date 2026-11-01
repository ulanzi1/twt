// The admin MODULE surface's handlers — Story 12.2 (`2026-11-01-433`; Task 5.2; the route table in `routes.ts`).
//
// The FIRST production caller of the Story 12.1 module primitive: author a partner offer as an immutable `draft`, register
// partners, publish (a NON-author, step-up), withdraw, and the reads behind the wizard / detail / list pages.
//
// ── READS ride the scope hook's transaction (`request.scopeTx`) ────────────────────────────────────────
// ── WRITES: the questionnaire `tenantWrite` SHAPE with the memorial COMMIT PLACEMENT (I2) ─────────────────
//   `requireIdempotencyKey` → `releaseHookTx` (commit + detach the hook's READ tx — TR1) → `withIdempotency` (claim; a
//   replay returns the RECORDED result; a failure RELEASES the key) → mint the id(s) (QE13 — INSIDE the claim, so a replay
//   returns the same id) → `openScopeTx` (bare BEGIN = READ COMMITTED; `SET LOCAL ROLE twt_app`) → `try` IMMEDIATELY
//   (TR22 — a pre-check refusal outside it would leak a pooled client holding an open transaction) → the QE18 PRE-CHECKS
//   on that SAME transaction (⛔ audit line on a refusal — TR4) → `audit.withCompensatingAudit(servicePool, …)` whose
//   `mutate` runs the 12.1 command(s) on `scopeTx.client` (TR2) and ENDS with `await closeScopeTx(scopeTx, true)` — the
//   COMMIT inside `mutate`, so a failed COMMIT writes the `_rolled_back` line → `finally { closeScopeTx(scopeTx, false) }`
//   (a no-op once closed) → outer `catch` → `mapModuleError`. ⛔ Statement on `scopeTx` after the in-`mutate` COMMIT.
//   `recordToneReviewSignoff` and the idempotency `recordResult` run AFTER the wrapper returns.
//   ⛔ `displayOf` (the questionnaire twin's fail-closed display-name read): the module commands take ⛔ display name.
//   ⚠ Accepted residual (QE13): an ambiguous COMMIT, or a `recordResult` failure after COMMIT, releases the key and the
//   retry creates a second draft — harmless (a draft reaches nobody); the memorial read-back shape is ⛔ copied. It is NOT
//   harmless for the other three writes (12.2 review RP16 / deferred RD3): a PUBLISH retried after that window answers 409
//   `module.not_draft` for a publish that happened, and the `tone_review.signoff` line (emitted after `tenantWrite` returns)
//   is never written — the durable publication row survives; a WITHDRAW retry answers 409 `module.illegal_transition`; a
//   PARTNER CREATE retry mints a new id and answers 409 `module_partner.name_taken` for a partner that was registered
//   (12.2 review RB8). The key is left claimed with ⛔ result — so a same-key retry, on ANY of the four writes, is 409
//   `module.idempotency_in_progress` ("wait a moment") until the 24 h TTL — when the single, swallowed `release` also
//   fails, AND when the API process dies between the key's claim and its settle (`recordResult` / `release`; RB8). The
//   `takeOver` remedy stays RD3's owner's.
//
// ── Actors (QE14) ──────────────────────────────────────────────────────────────────────────────────────
// Every write is `actor: 'operator'`, `actorId` = the session's `users` id. `trustee_archived` under `operator` is legal.
//
// ⛔ A member is reached by nothing here (I8). ⛔ Copy, a URL or a secret name in an audit line, a log or an error message.

import { createHash, randomUUID } from 'node:crypto';

import {
  AuthorModuleRequest,
  CreateModulePartnerRequest,
  ModuleDetailResponse,
  ModuleListQuery,
  ModuleListResponse,
  ModulePartnerListQuery,
  ModulePartnerListResponse,
  ModulePartnerResponse,
  ModuleScopeOptionsResponse,
  PublishModuleRequest,
  type AuthorModuleResponse,
  type PublishModuleResponse,
  type WithdrawModuleResponse,
} from '@twt/contracts';
import {
  audit,
  canonicalJsonStringify,
  idempotency,
  ids,
  marketplace,
  schema,
  toneReview,
  type Db,
} from '@twt/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { ApiError, BadRequestError, ConflictError, UnauthorizedError } from '../../http-errors.js';
import type { ScopeTx } from '../../types.js';
import { getDisplayName } from '../auth/admin/admin-auth.repo.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';
import { recordToneReviewSignoff } from '../tone-review/index.js';
import { mapModuleError, type ModuleOperation } from './errors.js';

const IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60;

const toPariwarId = ids.pariwarId;
const toModuleId = ids.moduleId;
const toPartnerId = ids.partnerId;

/** Shown where an admin's display name is not recorded — NEVER a 500 (AC8). */
export const UNNAMED_ADMIN_LABEL = 'An admin (name not recorded)';

/** QE8 — 12.2 writes the all-null branding bundle (⛔ logo upload, ⛔ accent colour). */
const EMPTY_BRANDING_BUNDLE = { version: 1, logo_object_key: null, accent_color_hex: null } as const;

type ModuleRow = schema.MarketplaceModule;

// TOTAL (12.2 review RP10): the shape can be an admin's raw, not yet domain-validated body, and the canonical encoder throws
// on a non-finite number (`1e999` parses to Infinity and passes `z.number()`) or an absurdly deep nesting. A throw here
// happens while the audit-intent arguments are built — a 500 with no audit line where the domain's own parse answers 422 —
// so an unencodable shape hashes to a fixed marker instead and the domain gets to refuse it.
function payloadHash(shape: Record<string, unknown>): string {
  let canonical: string;
  try {
    canonical = canonicalJsonStringify(shape);
  } catch {
    canonical = canonicalJsonStringify({ unhashable: true });
  }
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

function iso(d: Date): string {
  return d.toISOString();
}

// A publication tick as STORED (12.2 review RB1): the response states what the row holds, never a hard-coded `true`. The
// row's CHECKs make a false tick unstorable, so a false one here is a broken invariant — a 500, never a `true` it did not read.
function storedTick(value: boolean, column: string): true {
  if (value !== true) throw new Error(`[marketplace] a publication row holds ${column} = ${String(value)} — its CHECK should forbid it`);
  return value;
}

function toSummary(m: ModuleRow): z.input<typeof ModuleListResponse>['items'][number] {
  return {
    module_id: m.moduleId,
    partner_id: m.partnerId,
    name_en: m.nameEn,
    name_hi: m.nameHi,
    current_state: m.currentState,
    archive_reason: m.archiveReason,
    valid_from: iso(m.validFrom),
    valid_until: iso(m.validUntil),
    slot_capacity: m.slotCapacity,
    slots_remaining: m.slotsRemaining,
    created_at: iso(m.createdAt),
  };
}

function toPartnerResponse(p: schema.MarketplacePartner): z.input<typeof ModulePartnerResponse> {
  return {
    partner_id: p.partnerId,
    display_name_en: p.displayNameEn,
    display_name_hi: p.displayNameHi,
    created_at: iso(p.createdAt),
  };
}

export function createMarketplaceHandlers(deps: AppDeps) {
  const idempotencyStore = idempotency.createKeyedStore(deps.pool);

  function readCtx(request: FastifyRequest): { pariwarId: string; actorId: string; tx: Db } {
    const scopeTx = request.scopeTx;
    const actorId = request.requestContext.actorId;
    if (!scopeTx || !actorId) throw new UnauthorizedError('Authentication required', 'auth.session_required');
    return { pariwarId: scopeTx.pariwarId, actorId, tx: scopeTx.tx };
  }

  function requireIdempotencyKey(request: FastifyRequest): string {
    const raw = request.headers['idempotency-key'];
    const key = typeof raw === 'string' ? raw.trim() : '';
    if (key === '' || key.length > 200) throw new BadRequestError('An Idempotency-Key header is required', 'module.idempotency_key_required');
    return key;
  }

  /** The scope-resolution hook's READ transaction ends BEFORE the write opens its own (the questionnaire twin's copy). */
  async function releaseHookTx(request: FastifyRequest): Promise<void> {
    const hookTx = request.scopeTx;
    if (!hookTx?.scopeSet) return;
    hookTx.scopeSet = false;
    await closeScopeTx(hookTx, true).catch(() => undefined);
    // Detached, so nothing later in this request can reach a client that is back in the pool.
    request.scopeTx = undefined;
  }

  /** Claim the key; a replay returns the RECORDED response; a claim with ⛔ result yet is 409 in progress. */
  async function withIdempotency<T>(idemKey: string, run: () => Promise<T>): Promise<T> {
    const outcome = await idempotencyStore.claim(idemKey, IDEMPOTENCY_TTL_SECONDS);
    if (outcome === 'already_claimed') {
      const stored = await idempotencyStore.getResult(idemKey);
      if (stored !== null) return stored as T;
      throw new ConflictError('A request with this Idempotency-Key is already in progress — please wait and retry', 'module.idempotency_in_progress');
    }
    let settled = false;
    try {
      const out = await run();
      await idempotencyStore.recordResult(idemKey, (out ?? { done: true }) as unknown as Record<string, unknown>);
      settled = true;
      return out;
    } finally {
      if (!settled) await idempotencyStore.release(idemKey).catch(() => undefined);
    }
  }

  interface WriteCtx {
    readonly scopeTx: ScopeTx;
    readonly pariwarId: string;
    readonly actorId: string;
    readonly traceId: string | null;
  }

  /**
   * A tenant write (I2): claim → its own scope transaction → `run` (pre-checks, then `audited`) → ROLLBACK if `run` did
   * not COMMIT. `namespace` builds the key's prefix (QE13 — the store is global, so tenant operations are namespaced).
   */
  async function tenantWrite<T>(
    request: FastifyRequest,
    op: ModuleOperation,
    namespace: (pariwarId: string, actorId: string) => string,
    run: (ctx: WriteCtx) => Promise<T>,
  ): Promise<T> {
    const scopeTx0 = request.scopeTx;
    const actorId = request.requestContext.actorId;
    if (!scopeTx0 || !actorId) throw new UnauthorizedError('Authentication required', 'auth.session_required');
    const pariwarId = scopeTx0.pariwarId;
    const traceId = request.requestContext.traceId ?? null;
    const key = requireIdempotencyKey(request);
    await releaseHookTx(request);
    return withIdempotency(`${namespace(pariwarId, actorId)}:${key}`, async () => {
      const scopeTx = await openScopeTx(deps, pariwarId);
      try {
        return await run({ scopeTx, pariwarId, actorId, traceId });
      } catch (err) {
        return mapModuleError(err, op);
      } finally {
        await closeScopeTx(scopeTx, false); // a no-op once `audited` committed
      }
    });
  }

  /** The audit pairing around the mutation, COMMITTING inside `mutate` (I2 — the memorial placement). */
  async function audited<T>(
    ctx: WriteCtx,
    intent: { action: string; resourceLocator: string; hashShape: Record<string, unknown> },
    mutate: (auditId: string) => Promise<T>,
  ): Promise<T> {
    return audit.withCompensatingAudit(deps.servicePool, {
      auditIntent: {
        pariwarId: ctx.pariwarId,
        actorId: ctx.actorId,
        actorRole: null,
        action: intent.action,
        resourceLocator: intent.resourceLocator,
        requestPayloadHash: payloadHash(intent.hashShape),
        traceId: ctx.traceId,
      },
      mutate: async ({ auditId }) => {
        const out = await mutate(auditId);
        await closeScopeTx(ctx.scopeTx, true); // COMMIT — inside `mutate`, so a failed COMMIT writes the compensating line
        return out;
      },
    });
  }

  async function displayNameOrLabel(actorId: string | null): Promise<string> {
    if (actorId === null) return UNNAMED_ADMIN_LABEL;
    return (await getDisplayName(deps.pool, actorId)) ?? UNNAMED_ADMIN_LABEL;
  }

  // ── Reads ─────────────────────────────────────────────────────────────────────────────────────────────

  async function list(request: FastifyRequest) {
    const { pariwarId, tx } = readCtx(request);
    const q = request.query as z.output<typeof ModuleListQuery>;
    let after: marketplace.ModuleListCursor | undefined;
    try {
      // STRICT decode in JS BEFORE any SQL (QE16 as amended) — a malformed cursor is 400, ⛔ a 500 (TR19).
      after = q.cursor === undefined ? undefined : marketplace.decodeModuleCursor(q.cursor);
    } catch (err) {
      return mapModuleError(err, 'read');
    }
    const page = await marketplace.pageModulesForPariwar(tx, toPariwarId(pariwarId), {
      ...(q.state !== undefined ? { state: q.state } : {}),
      ...(q.limit !== undefined ? { limit: q.limit } : {}),
      ...(after !== undefined ? { after } : {}),
    });
    return { items: page.items.map(toSummary), next_cursor: page.nextCursor } satisfies z.input<typeof ModuleListResponse>;
  }

  async function get(request: FastifyRequest) {
    const { pariwarId, actorId, tx } = readCtx(request);
    const pid = toPariwarId(pariwarId);
    const mid = toModuleId((request.params as { moduleId: string }).moduleId);
    const m = await marketplace.getModule(tx, pid, mid);
    if (m === null) throw new ApiError(404, 'module.not_found', 'This offer was not found');
    const [partner, authorId, publication, leadCount] = await Promise.all([
      marketplace.getPartner(tx, pid, m.partnerId),
      marketplace.getModuleAuthorActorId(tx, pid, mid),
      marketplace.getModulePublication(tx, pid, mid),
      marketplace.countModuleLeads(tx, pid, mid),
    ]);
    // The FK guarantees a same-Pariwar partner; a missing one is a broken invariant.
    if (partner === null) throw new Error(`[marketplace] module ${mid} names a partner this Pariwar does not hold`);
    const [authorDisplay, reviewerDisplay] = await Promise.all([
      displayNameOrLabel(authorId),
      publication === null ? Promise.resolve(null) : displayNameOrLabel(publication.reviewedByActorId),
    ]);
    const body: z.input<typeof ModuleDetailResponse> = {
      module_id: m.moduleId,
      pariwar_id: m.pariwarId,
      partner_id: m.partnerId,
      partner_display_name_en: partner.displayNameEn,
      partner_display_name_hi: partner.displayNameHi,
      name_en: m.nameEn,
      name_hi: m.nameHi,
      description_en: m.descriptionEn,
      description_hi: m.descriptionHi,
      eligibility_filter: m.eligibilityFilter,
      scope_filter: m.scopeFilter,
      valid_from: iso(m.validFrom),
      valid_until: iso(m.validUntil),
      slot_capacity: m.slotCapacity,
      slots_remaining: m.slotsRemaining,
      lead_handoff_url: m.leadHandoffUrl,
      lead_handoff_signing_key_secret_name: m.leadHandoffSigningKeySecretName,
      branding_bundle: {
        version: 1,
        logo_object_key: (m.brandingBundle.logo_object_key as string | null | undefined) ?? null,
        // `?? null` like its sibling (12.2 review RB2): a stored bundle without the key reads as null, never a strict-DTO 500.
        accent_color_hex: (m.brandingBundle.accent_color_hex as string | null | undefined) ?? null,
      },
      current_state: m.currentState,
      archive_reason: m.archiveReason,
      created_at: iso(m.createdAt),
      updated_at: iso(m.updatedAt),
      author_display_name: authorDisplay,
      // Fails CLOSED: an unknown author reads as the viewer's own, so the UI never offers Publish for it (QE9).
      authored_by_viewer: authorId === null || authorId === actorId,
      publication:
        publication === null
          ? null
          : {
              published_event_type: publication.publishedEventType,
              reviewer_display_name: reviewerDisplay ?? UNNAMED_ADMIN_LABEL,
              reviewed_at: iso(publication.reviewedAt),
              hindi_reviewed: storedTick(publication.hindiReviewed, 'hindi_reviewed'),
              partner_agreement_confirmed: storedTick(publication.partnerAgreementConfirmed, 'partner_agreement_confirmed'),
              tone_signoff_content_hash: publication.toneSignoffContentHash,
            },
      lead_count: leadCount,
    };
    return body;
  }

  async function scopeOptions(request: FastifyRequest) {
    const { pariwarId, tx } = readCtx(request);
    // `deps.clock()` — the clock the scope hook loaded its tree with (QE5).
    const o = await marketplace.listModuleScopeOptions(tx, toPariwarId(pariwarId), deps.clock());
    const opt = (x: marketplace.ModuleScopeOption) => ({
      value: x.value,
      state: x.state,
      usable: x.usable,
      unusable_reason: x.unusableReason,
    });
    return {
      geo_tree_version: o.geoTreeVersion,
      states: o.states.map(opt),
      districts: o.districts.map(opt),
      district_source: o.districtSource,
      districts_truncated: o.districtsTruncated,
    } satisfies z.input<typeof ModuleScopeOptionsResponse>;
  }

  async function listPartners(request: FastifyRequest) {
    const { pariwarId, tx } = readCtx(request);
    const q = request.query as z.output<typeof ModulePartnerListQuery>;
    const rows = await marketplace.listPartnersForPariwar(tx, toPariwarId(pariwarId), {
      ...(q.limit !== undefined ? { limit: q.limit } : {}),
    });
    return { items: rows.map(toPartnerResponse) } satisfies z.input<typeof ModulePartnerListResponse>;
  }

  // ── Writes ────────────────────────────────────────────────────────────────────────────────────────────

  async function createPartner(request: FastifyRequest, reply: FastifyReply) {
    const body = request.body as z.output<typeof CreateModulePartnerRequest>;
    const out = await tenantWrite(
      request,
      'partner',
      (p, a) => `module_partner.create:${p}:${a}`,
      async (ctx) => {
        // PRE-CHECK (QE18): the PURE name parse, BEFORE the wrapper — a refused name writes ⛔ audit line.
        const names = marketplace.parsePartnerDisplayNames({
          displayNameEn: body.display_name_en,
          displayNameHi: body.display_name_hi,
        });
        const partnerId = toPartnerId(randomUUID());
        return audited(
          ctx,
          {
            action: 'module_partner.created',
            resourceLocator: marketplace.partnerResourceLocator(partnerId),
            hashShape: { display_name_en: names.displayNameEn, display_name_hi: names.displayNameHi },
          },
          async (auditId) =>
            toPartnerResponse(
              await marketplace.createPartner(ctx.scopeTx.client, {
                ...names,
                pariwarId: toPariwarId(ctx.pariwarId),
                partnerId,
                actorId: ctx.actorId,
                auditId,
              }),
            ),
        );
      },
    );
    return reply.code(201).send(out);
  }

  async function author(request: FastifyRequest, reply: FastifyReply) {
    const body = request.body as z.output<typeof AuthorModuleRequest>;
    const out = await tenantWrite(
      request,
      'author',
      (p, a) => `module.author:${p}:${a}`,
      async (ctx): Promise<AuthorModuleResponse> => {
        const pid = toPariwarId(ctx.pariwarId);
        const db = ctx.scopeTx.tx;
        // PRE-CHECKS on the WRITE transaction (QE18) — ⛔ audit line on a refusal.
        // (1) The partner is registered in THIS Pariwar (the DTO already guaranteed a UUID — TR19).
        if ((await marketplace.getPartner(db, pid, toPartnerId(body.partner_id))) === null) {
          throw new marketplace.ModulePartnerUnknownError(body.partner_id);
        }
        // (2) C11 (QE5): only a WELL-FORMED filter is checked here; a malformed one is left to the manifest parse
        // inside the wrapper (422 `module.manifest_invalid`). `at` = this transaction's DB `now()` (TR3).
        const scope = marketplace.ScopeFilterV1Schema.safeParse(body.scope_filter);
        if (scope.success) {
          const now = await ctx.scopeTx.client.query<{ now: Date }>('SELECT now() AS now');
          await marketplace.assertScopeValuesRecorded(db, pid, scope.data, now.rows[0]!.now);
        }
        const moduleId = toModuleId(randomUUID());
        const manifest: Record<string, unknown> = { ...body, branding_bundle: EMPTY_BRANDING_BUNDLE };
        return audited(
          ctx,
          { action: 'module.authored', resourceLocator: marketplace.moduleResourceLocator(moduleId), hashShape: manifest },
          async (auditId) => {
            await marketplace.authorModule(ctx.scopeTx.client, {
              pariwarId: pid,
              moduleId,
              auditId,
              actor: 'operator',
              actorId: ctx.actorId,
              manifest,
            });
            return { module_id: moduleId, state: 'draft' };
          },
        );
      },
    );
    return reply.code(201).send(out);
  }

  async function publish(request: FastifyRequest) {
    const mid = toModuleId((request.params as { moduleId: string }).moduleId);
    const ticks = request.body as z.output<typeof PublishModuleRequest>;
    const locator = marketplace.moduleResourceLocator(mid);
    let signoff: { reviewedBy: string; contentHash: string; pariwarId: string; traceId: string | null } | null = null;
    const out = await tenantWrite(
      request,
      'publish',
      (p, a) => `module.publish:${p}:${a}:${mid}`,
      async (ctx): Promise<PublishModuleResponse> => {
        const pid = toPariwarId(ctx.pariwarId);
        const db = ctx.scopeTx.tx;
        // PRE-READ on the WRITE transaction (TR3): it and the command see the SAME `now()`, so the schedule / activate
        // choice cannot drift. ⛔ Lock here — the command takes it.
        const nowRes = await ctx.scopeTx.client.query<{ now: Date }>('SELECT now() AS now');
        const now = nowRes.rows[0]!.now;
        const m = await marketplace.getModule(db, pid, mid);
        if (m === null) throw new marketplace.ModuleGenesisMissingError(mid); // another Pariwar's id, or unknown → 404
        if (m.currentState !== 'draft') throw new ApiError(409, 'module.not_draft', 'Only a draft can be published');
        if (now.getTime() >= m.validUntil.getTime()) {
          throw new ApiError(409, 'module.window_ended', 'The offer window has already ended');
        }
        // The tone gate (Story 2.2 / ADR-0019 invariant (b)): the publisher is NEVER the author (QE9, I4).
        const authorId = await marketplace.getModuleAuthorActorId(db, pid, mid);
        const partner = await marketplace.getPartner(db, pid, m.partnerId);
        if (partner === null) throw new Error(`[marketplace] module ${mid} names a partner this Pariwar does not hold`);
        const contentHash = marketplace.moduleToneContentHash(m, partner);
        const gate =
          authorId === null
            ? null // TR21: `reviewedBy === null` is never true, so the pure gate alone would let a null author through
            : toneReview.evaluateToneReviewGate({
                signoff: { reviewedBy: ctx.actorId, resourceLocator: locator, contentHash },
                authoredBy: authorId,
                resourceLocator: locator,
              });
        if (gate === null || !gate.allowed) {
          const denial: toneReview.ToneReviewDenial =
            gate === null
              ? { reason: 'signoff-missing', resourceLocator: locator, authoredBy: 'unknown', reviewedBy: null }
              : gate.denial;
          // `pariwarId` passed EXPLICITLY — the hook's `request.scopeTx` is gone after `releaseHookTx`.
          deps.toneReviewAuditSink.emit({
            type: 'tone_review.publish_blocked',
            actorId: ctx.actorId,
            pariwarId: ctx.pariwarId,
            ...(ctx.traceId !== null ? { traceId: ctx.traceId } : {}),
            resourceLocator: locator,
            context: {
              reason: gate === null ? 'author-unknown' : denial.reason,
              authoredBy: authorId,
              reviewedBy: ctx.actorId,
            },
            at: deps.clock(),
          });
          throw new toneReview.ToneReviewRequiredError(denial);
        }
        // QE7 (A): a future start SCHEDULES (the 5-minute sweep activates it); otherwise it goes live now.
        const publishedEventType = now.getTime() < m.validFrom.getTime() ? 'module.scheduled' : 'module.activated';
        const result = await audited(
          ctx,
          {
            action: publishedEventType, // the audit action equals the event type (12.1 QE3)
            resourceLocator: locator,
            hashShape: { module_id: mid, content_hash: contentHash, ...ticks },
          },
          async (auditId): Promise<PublishModuleResponse> => {
            const base = { pariwarId: pid, moduleId: mid, auditId, actor: 'operator' as const, actorId: ctx.actorId };
            if (publishedEventType === 'module.scheduled') await marketplace.scheduleModule(ctx.scopeTx.client, base);
            else await marketplace.activateModule(ctx.scopeTx.client, base);
            await marketplace.recordModulePublication(ctx.scopeTx.client, {
              module: m,
              publishedEventType,
              reviewedBy: ctx.actorId,
              hindiReviewed: true,
              partnerAgreementConfirmed: true,
              contentHash,
              auditId,
            });
            return {
              module_id: mid,
              state: publishedEventType === 'module.scheduled' ? 'scheduled' : 'active',
              published_event_type: publishedEventType,
            };
          },
        );
        signoff = { reviewedBy: ctx.actorId, contentHash, pariwarId: ctx.pariwarId, traceId: ctx.traceId };
        return result;
      },
    );
    // AFTER the wrapper returned and the transaction COMMITTED (I2): the success line. A replay records ⛔ second one.
    if (signoff !== null) {
      const s: { reviewedBy: string; contentHash: string; pariwarId: string; traceId: string | null } = signoff;
      recordToneReviewSignoff(deps, {
        reviewedBy: s.reviewedBy,
        resourceLocator: locator,
        contentHash: s.contentHash,
        pariwarId: s.pariwarId,
        ...(s.traceId !== null ? { traceId: s.traceId } : {}),
      });
    }
    return out;
  }

  async function withdraw(request: FastifyRequest) {
    const mid = toModuleId((request.params as { moduleId: string }).moduleId);
    return tenantWrite(
      request,
      'withdraw',
      (p, a) => `module.withdraw:${p}:${a}:${mid}`,
      async (ctx): Promise<WithdrawModuleResponse> =>
        audited(
          ctx,
          { action: 'module.archived', resourceLocator: marketplace.moduleResourceLocator(mid), hashShape: { module_id: mid } },
          async (auditId) => {
            // Any `module.manage` holder — the author included; ⛔ step-up (QE10, the banner `retract` precedent).
            await marketplace.archiveModule(ctx.scopeTx.client, {
              pariwarId: toPariwarId(ctx.pariwarId),
              moduleId: mid,
              auditId,
              actor: 'operator',
              actorId: ctx.actorId,
              reason: 'trustee_archived',
            });
            return { module_id: mid, state: 'archived' };
          },
        ),
    );
  }

  return { list, get, scopeOptions, listPartners, createPartner, author, publish, withdraw };
}
