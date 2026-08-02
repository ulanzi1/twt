// Banner write-path accessors — Story 10.9 (AC1, AC3, AC4, AC6; Decisions 1 + 5).
//
// The mutable-content workflow (Decision 1): a PLAIN `status` column transitioned in the caller's
// scoped tx, NOT event-derived-state. Every function here runs DIRECTLY on the passed `db` (the
// caller's scope tx) — never opening its own transaction (the news-blog/drafts.ts contract). RLS
// scope is transaction-scoped; the explicit `pariwarId` predicate (alongside RLS) is defense-in-depth
// and matches the `(pariwar_id, status, valid_from)` index.
//
// ── The four guards every write runs through ─────────────────────────────────────────────────
//   1. `nextBannerStatus` legality (status.ts) — an illegal (status, action) → BannerStateError 409,
//      raised BEFORE any write.
//   2. popup ⇒ dismissible (AC4) — BannerPopupMustBeDismissibleError 422. Mirrored by the
//      `banners_popup_must_be_dismissible` DB CHECK, so it holds even on a raw SQL write.
//   3. `valid_until > valid_from` (AC2) — BannerWindowInvalidError 422. Mirrored by the
//      `banners_window_non_empty` DB CHECK.
//   4. tone-review (AC6) — `publish`, and the COPY-REVISION arm of `updateBanner`, build a
//      `ToneReviewSignoff` and inject it into the shipped pure `evaluateToneReviewGate`; a deny is
//      the shipped `ToneReviewRequiredError` (409). The gate is ALREADY default-deny on
//      `reviewedBy === authoredBy`, so there is deliberately NO second author≠reviewer identity
//      check here (10.5 needed one only because it also had a reviewer-ASSIGNMENT step; 10.9 has no
//      `submitted` state and no assigned reviewer).
//
// ── Decision 5: the CONTENT HASH decides whether a re-review + a `revision` bump are required ──
// One `updateBanner`, not two endpoints with a hand-drawn line between "copy" and "not copy":
//   · hash UNCHANGED (extending `valid_until`, flipping `display_once_per_member`, …) → apply, NO
//     re-review, NO `revision` bump — every existing dismissal stands.
//   · hash CHANGED on a `published` banner → require a FRESH non-author sign-off (gate → 409
//     without one), bump `revision`, and every prior dismissal stops suppressing (AC3's "unless
//     updated" becomes mechanical rather than judgemental).
//   · hash CHANGED on a `draft` → free; a draft has no sign-off yet and no member has seen it.
//
// The AUDIT of each transition (Story 1.10) is the CONSUMER's job (the apps/api handler), as is the
// `tone_review.signoff` audit-sink emission — this module owns only the durable row state (the
// news-blog / niyamavali domain/api split).

import { createHash } from 'node:crypto';

import { and, eq, inArray, sql } from 'drizzle-orm';

import { canonicalJsonStringify } from '../canonical-json.js';
import type { Db } from '../db.js';
import type { BannerId, MemberId, PariwarId, UserId } from '../ids/index.js';
import {
  type BannerAudienceScope,
  type BannerDismissalKind,
  type BannerDismissalRow,
  type BannerDisplayMode,
  type BannerRow,
  type BannerSeverity,
  type BannerStatus,
  bannerDismissals,
  banners,
} from '../schema/banners.js';
import { ToneReviewRequiredError } from '../tone-review/errors.js';
import { type ToneReviewSignoff, evaluateToneReviewGate } from '../tone-review/gate.js';
import {
  BannerBilingualRequiredError,
  BannerPopupMustBeDismissibleError,
  BannerStateError,
  BannerWindowInvalidError,
} from './errors.js';
import { getBannerOrThrow } from './read.js';
import { nextBannerStatus } from './status.js';

// ── pure helpers (exported for unit tests + the apps/api audit line) ────────────

/**
 * The resource locator a banner's tone-review sign-off is bound to (`banner:<bannerId>`) — the
 * `newsResourceLocator` / `draftResourceLocator` analogue. Keyed to the BANNER so the gate's
 * resource-bound invariant matches the publish target.
 */
export function bannerResourceLocator(bannerId: BannerId | string): string {
  return `banner:${bannerId}`;
}

/** The four member-visible copy fields — the ONLY inputs to the content hash. */
export interface BannerCopy {
  title: string | null;
  body: string | null;
  titleHi: string | null;
  bodyHi: string | null;
}

/**
 * The canonical content hash binding a tone-review sign-off to the EXACT reviewed copy: SHA-256 hex
 * of the RFC-8785 canonical JSON of `{title, body, title_hi, body_hi}` (the `newsContentHash` /
 * `draftContentHash` discipline — a hash in the sign-off, NEVER the raw copy).
 *
 * This is also the Decision 5 REVISION ORACLE: an edit that changes any of the four changes the
 * hash, which (on a published banner) both invalidates the prior sign-off AND bumps `revision`,
 * re-surfacing the banner for every member who had dismissed it. An edit that changes none of them
 * — extending the window, toggling display-once — leaves the hash, the sign-off and every dismissal
 * exactly where they were.
 */
export function bannerContentHash(copy: BannerCopy): string {
  const canonical = canonicalJsonStringify({
    title: copy.title ?? null,
    body: copy.body ?? null,
    title_hi: copy.titleHi ?? null,
    body_hi: copy.bodyHi ?? null,
  });
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

/** Which of the four required copy fields (if any) are absent or blank. */
export function missingBannerCopyFields(copy: BannerCopy): string[] {
  const missing: string[] = [];
  if (!copy.title || copy.title.trim() === '') missing.push('title');
  if (!copy.body || copy.body.trim() === '') missing.push('body');
  if (!copy.titleHi || copy.titleHi.trim() === '') missing.push('title_hi');
  if (!copy.bodyHi || copy.bodyHi.trim() === '') missing.push('body_hi');
  return missing;
}

/**
 * AC6: all four copy fields must be non-empty at publish (FR-58B/FR-68 Hindi + English variants).
 * Unlike 10.5's scope-conditional rule this applies to EVERY audience scope — a banner is
 * member-facing chrome with no "internal" variant. PURE + exported for unit tests.
 */
export function assertBannerCopyComplete(bannerId: string, copy: BannerCopy): void {
  const missing = missingBannerCopyFields(copy);
  if (missing.length > 0) throw new BannerBilingualRequiredError(bannerId, missing);
}

/**
 * AC4 "no member trapped": a popup is ALWAYS dismissible. A non-dismissible `banner` is permitted
 * (UX Pattern 9 — a blocking system state). PURE + exported for unit tests.
 */
export function assertPopupDismissible(
  bannerId: string | null,
  displayMode: BannerDisplayMode,
  dismissible: boolean,
): void {
  if (displayMode === 'popup' && !dismissible) {
    throw new BannerPopupMustBeDismissibleError(bannerId);
  }
}

/** AC2: the visibility window must be non-empty (`valid_until > valid_from`). PURE. */
export function assertWindowValid(bannerId: string | null, validFrom: Date, validUntil: Date): void {
  if (validUntil.getTime() <= validFrom.getTime()) {
    throw new BannerWindowInvalidError(bannerId, validFrom.toISOString(), validUntil.toISOString());
  }
}

// ── create / edit ──────────────────────────────────────────────────────────────

export interface CreateBannerDraftInput {
  pariwarId: PariwarId;
  title?: string | null;
  body?: string | null;
  titleHi?: string | null;
  bodyHi?: string | null;
  audienceScope: BannerAudienceScope;
  audienceScopeValue?: string | null;
  validFrom: Date;
  validUntil: Date;
  displayMode: BannerDisplayMode;
  dismissible: boolean;
  displayOncePerMember?: boolean;
  severity: BannerSeverity;
  /** The authoring actor (NOT NULL — a banner is always human-authored; the gate's `authoredBy`). */
  createdByActorId: UserId;
}

/**
 * Create a banner at `status='draft'`, `revision=1`. Copy may be incomplete on a draft (the
 * bilingual requirement bites at PUBLISH); the window + popup-dismissible invariants bite here.
 */
export async function createDraft(db: Db, input: CreateBannerDraftInput): Promise<BannerRow> {
  assertWindowValid(null, input.validFrom, input.validUntil);
  assertPopupDismissible(null, input.displayMode, input.dismissible);

  const inserted = await db
    .insert(banners)
    .values({
      pariwarId: input.pariwarId,
      title: input.title ?? null,
      body: input.body ?? null,
      titleHi: input.titleHi ?? null,
      bodyHi: input.bodyHi ?? null,
      audienceScope: input.audienceScope,
      audienceScopeValue: input.audienceScopeValue ?? null,
      validFrom: input.validFrom,
      validUntil: input.validUntil,
      displayMode: input.displayMode,
      dismissible: input.dismissible,
      displayOncePerMember: input.displayOncePerMember ?? false,
      severity: input.severity,
      revision: 1,
      status: 'draft',
      createdByActorId: input.createdByActorId,
    })
    .returning();
  const row = inserted[0];
  if (!row) throw new Error('[banners createDraft] insert returned no row — check session scope');
  return row;
}

export interface UpdateBannerPatch {
  title?: string | null;
  body?: string | null;
  titleHi?: string | null;
  bodyHi?: string | null;
  audienceScope?: BannerAudienceScope;
  audienceScopeValue?: string | null;
  validFrom?: Date;
  validUntil?: Date;
  displayMode?: BannerDisplayMode;
  dismissible?: boolean;
  displayOncePerMember?: boolean;
  severity?: BannerSeverity;
}

export interface UpdateBannerResult {
  row: BannerRow;
  /**
   * True when the member-visible copy hash changed on a PUBLISHED banner: `revision` was bumped and
   * every prior dismissal has stopped suppressing (AC3). The handler audits this as `banner.revised`
   * rather than `banner.updated`.
   */
  revised: boolean;
  /** The fresh sign-off recorded on a revision (the handler emits `tone_review.signoff` from it). */
  signoff: ToneReviewSignoff | null;
}

/**
 * The ONE unified edit (Decision 5). See the file header for the content-hash branch.
 *
 * `actorId` is the acting admin. On the revision arm it becomes the sign-off's `reviewedBy`, so a
 * copy edit to a PUBLISHED banner must be made by someone other than its author — the same
 * non-author property that gates publish, applied to the moment the copy changes. On the
 * no-hash-change arm and on drafts, `actorId` is not consulted for authorization.
 *
 * A `retracted` banner is terminal and rejects every edit (409).
 */
export async function updateBanner(
  db: Db,
  pariwarId: PariwarId,
  bannerId: BannerId,
  patch: UpdateBannerPatch,
  actorId: UserId,
  now: Date,
): Promise<UpdateBannerResult> {
  const banner = await getBannerOrThrow(db, pariwarId, bannerId);
  if (banner.status === 'retracted') {
    throw new BannerStateError(bannerId, banner.status, 'a retracted banner is terminal and cannot be edited');
  }

  // The row as it WOULD be — every invariant is asserted against the merged result, not the patch,
  // so flipping `display_mode` to `popup` on a row that is already `dismissible=false` is caught.
  const merged = {
    title: patch.title !== undefined ? patch.title : banner.title,
    body: patch.body !== undefined ? patch.body : banner.body,
    titleHi: patch.titleHi !== undefined ? patch.titleHi : banner.titleHi,
    bodyHi: patch.bodyHi !== undefined ? patch.bodyHi : banner.bodyHi,
    validFrom: patch.validFrom ?? banner.validFrom,
    validUntil: patch.validUntil ?? banner.validUntil,
    displayMode: patch.displayMode ?? banner.displayMode,
    dismissible: patch.dismissible ?? banner.dismissible,
  };
  assertWindowValid(bannerId, merged.validFrom, merged.validUntil);
  assertPopupDismissible(bannerId, merged.displayMode, merged.dismissible);

  const previousHash = bannerContentHash(banner);
  const nextHash = bannerContentHash(merged);
  const copyChanged = previousHash !== nextHash;
  // A copy change only re-binds the sign-off + invalidates dismissals once the banner has actually
  // been seen — i.e. once it is published. On a draft, copy edits are free.
  const requiresReview = copyChanged && banner.status === 'published';

  let signoff: ToneReviewSignoff | null = null;
  if (requiresReview) {
    const resourceLocator = bannerResourceLocator(bannerId);
    signoff = { reviewedBy: actorId, resourceLocator, contentHash: nextHash, reviewedAt: now };
    const gate = evaluateToneReviewGate({ signoff, authoredBy: banner.createdByActorId, resourceLocator });
    if (!gate.allowed) throw new ToneReviewRequiredError(gate.denial);
    // A published banner whose copy changes must also still satisfy the publish-time copy rule —
    // a revision may not blank out the Hindi variant that publishing required.
    assertBannerCopyComplete(bannerId, merged);
  }

  const updated = await db
    .update(banners)
    .set({
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.body !== undefined ? { body: patch.body } : {}),
      ...(patch.titleHi !== undefined ? { titleHi: patch.titleHi } : {}),
      ...(patch.bodyHi !== undefined ? { bodyHi: patch.bodyHi } : {}),
      ...(patch.audienceScope !== undefined ? { audienceScope: patch.audienceScope } : {}),
      ...(patch.audienceScopeValue !== undefined ? { audienceScopeValue: patch.audienceScopeValue } : {}),
      ...(patch.validFrom !== undefined ? { validFrom: patch.validFrom } : {}),
      ...(patch.validUntil !== undefined ? { validUntil: patch.validUntil } : {}),
      ...(patch.displayMode !== undefined ? { displayMode: patch.displayMode } : {}),
      ...(patch.dismissible !== undefined ? { dismissible: patch.dismissible } : {}),
      ...(patch.displayOncePerMember !== undefined ? { displayOncePerMember: patch.displayOncePerMember } : {}),
      ...(patch.severity !== undefined ? { severity: patch.severity } : {}),
      // The Decision 5 revision bump — ONLY on a published copy change.
      ...(requiresReview
        ? {
            revision: banner.revision + 1,
            toneSignoffContentHash: nextHash,
            toneSignoffReviewedAt: now,
            toneSignoffReviewedBy: actorId,
          }
        : {}),
      updatedAt: now,
    })
    // Conditional on the status read above — a concurrent publish/retract matches no row and 409s
    // rather than silently applying an edit against a state that no longer holds.
    .where(and(eq(banners.pariwarId, pariwarId), eq(banners.bannerId, bannerId), eq(banners.status, banner.status)))
    .returning();
  const row = updated[0];
  if (!row) {
    throw new BannerStateError(bannerId, banner.status, 'banner changed state before the edit could be applied');
  }
  return { row, revised: requiresReview, signoff };
}

// ── lifecycle transitions ────────────────────────────────────────────────────────

export interface PublishBannerResult {
  row: BannerRow;
  /** The recorded sign-off (the handler emits the `tone_review.signoff` audit line from this). */
  signoff: ToneReviewSignoff;
}

/**
 * Publish a draft (`draft → published`), setting `published_at` and persisting the tone-review
 * sign-off. Fail-closed, in order:
 *   1. legality (`draft → published`) → BannerStateError 409;
 *   2. all four copy fields present (AC6) → BannerBilingualRequiredError 422;
 *   3. popup ⇒ dismissible + a non-empty window (defensive re-assert — a row could predate a guard);
 *   4. build a `ToneReviewSignoff` (reviewedBy = the publishing actor, resourceLocator =
 *      `banner:<id>`, contentHash of the four copy fields) and inject it into the shipped gate; a
 *      deny → ToneReviewRequiredError 409 with the status UNCHANGED.
 *
 * ⚠ KNOWN, PO-RATIFIED CONSEQUENCE: because the gate is default-deny on `reviewedBy === authoredBy`
 * and `banner.manage` is granted to `pariwar_admin` only, a SINGLE-ADMIN Pariwar cannot publish a
 * banner (nobody else can be the non-author reviewer). This is the identical consequence Story
 * 10.5's review recorded and the PO deferred on 2026-07-30. It is a deferral with precedent, not a
 * bug — do NOT "fix" it by weakening the gate or minting a second role grant.
 */
export async function publish(
  db: Db,
  pariwarId: PariwarId,
  bannerId: BannerId,
  actorId: UserId,
  now: Date,
): Promise<PublishBannerResult> {
  const banner = await getBannerOrThrow(db, pariwarId, bannerId);
  if (nextBannerStatus(banner.status, 'publish') === null) {
    throw new BannerStateError(bannerId, banner.status, 'only a draft may be published');
  }
  assertBannerCopyComplete(bannerId, banner);
  assertPopupDismissible(bannerId, banner.displayMode, banner.dismissible);
  assertWindowValid(bannerId, banner.validFrom, banner.validUntil);

  const resourceLocator = bannerResourceLocator(bannerId);
  const contentHash = bannerContentHash(banner);
  const signoff: ToneReviewSignoff = { reviewedBy: actorId, resourceLocator, contentHash, reviewedAt: now };
  const gate = evaluateToneReviewGate({ signoff, authoredBy: banner.createdByActorId, resourceLocator });
  if (!gate.allowed) throw new ToneReviewRequiredError(gate.denial);

  const updated = await db
    .update(banners)
    .set({
      status: 'published',
      publishedAt: now,
      toneSignoffContentHash: contentHash,
      toneSignoffReviewedAt: now,
      toneSignoffReviewedBy: actorId,
      updatedAt: now,
    })
    .where(and(eq(banners.pariwarId, pariwarId), eq(banners.bannerId, bannerId), eq(banners.status, 'draft')))
    .returning();
  const row = updated[0];
  if (!row) {
    throw new BannerStateError(bannerId, banner.status, 'banner changed state before publish could be applied');
  }
  return { row, signoff };
}

/**
 * Retract a banner (`draft → retracted` as a DISCARD, or `published → retracted` to pull it down),
 * setting `retracted_at`. Terminal: a retracted banner is never member-visible again regardless of
 * its window, and `nextBannerStatus` offers no way back.
 */
export async function retract(
  db: Db,
  pariwarId: PariwarId,
  bannerId: BannerId,
  now: Date,
): Promise<BannerRow> {
  const banner = await getBannerOrThrow(db, pariwarId, bannerId);
  if (nextBannerStatus(banner.status, 'retract') === null) {
    throw new BannerStateError(bannerId, banner.status, 'only a draft or a published banner may be retracted');
  }
  const updated = await db
    .update(banners)
    .set({ status: 'retracted', retractedAt: now, updatedAt: now })
    .where(
      and(
        eq(banners.pariwarId, pariwarId),
        eq(banners.bannerId, bannerId),
        inArray(banners.status, ['draft', 'published'] satisfies BannerStatus[]),
      ),
    )
    .returning();
  const row = updated[0];
  if (!row) {
    throw new BannerStateError(bannerId, banner.status, 'banner changed state before retract could be applied');
  }
  return row;
}

// ── per-member dismissal (AC3) ───────────────────────────────────────────────────

export interface RecordDismissalInput {
  pariwarId: PariwarId;
  bannerId: BannerId;
  memberId: MemberId;
  /** `dismissed` = the member acted; `shown` = the automatic display-once acknowledgement. */
  kind: BannerDismissalKind;
  now: Date;
}

/**
 * Record a member's acknowledgement of a banner — the durable, cross-device, server-side state AC3
 * requires (never MMKV: a reinstall or a second device must not resurrect a dismissed banner).
 *
 * The acted-on `revision` is read SERVER-SIDE from the banner row; it is never client-supplied, so a
 * client cannot suppress a future revision it has not seen. A missing banner is a 404 via
 * `getBannerOrThrow`.
 *
 * IDEMPOTENT by construction: an upsert on the `(pariwar_id, banner_id, member_id)` composite PK, so
 * a replayed dismiss is a clean no-op returning success — never a 500, never a duplicate row.
 * `dismissed_revision` takes `GREATEST(existing, incoming)` so a replayed STALE write (an old
 * request arriving after a newer acknowledgement) can never un-suppress a banner. `dismissal_kind`/
 * `dismissed_at` follow the SAME monotonic ordering (only overwritten when the incoming write is not
 * older than the stored one) so a reordered/delayed automatic `shown` cannot overwrite a later,
 * explicit `dismissed` — both kinds suppress identically, so this only protects the provenance value.
 *
 * Only callable against a `published` banner — a draft or retracted banner was never actually shown
 * to a member, so there is nothing to acknowledge.
 */
export async function recordDismissal(db: Db, input: RecordDismissalInput): Promise<BannerDismissalRow> {
  const banner = await getBannerOrThrow(db, input.pariwarId, input.bannerId);
  if (banner.status !== 'published') {
    throw new BannerStateError(input.bannerId, banner.status, 'only a published banner can be dismissed');
  }

  const upserted = await db
    .insert(bannerDismissals)
    .values({
      pariwarId: input.pariwarId,
      bannerId: input.bannerId,
      memberId: input.memberId,
      dismissedRevision: banner.revision,
      dismissalKind: input.kind,
      dismissedAt: input.now,
    })
    .onConflictDoUpdate({
      target: [bannerDismissals.pariwarId, bannerDismissals.bannerId, bannerDismissals.memberId],
      set: {
        dismissedRevision: sql`GREATEST(${bannerDismissals.dismissedRevision}, excluded.dismissed_revision)`,
        dismissalKind: sql`CASE WHEN excluded.dismissed_at >= ${bannerDismissals.dismissedAt} THEN excluded.dismissal_kind ELSE ${bannerDismissals.dismissalKind} END`,
        dismissedAt: sql`GREATEST(${bannerDismissals.dismissedAt}, excluded.dismissed_at)`,
      },
    })
    .returning();
  const row = upserted[0];
  if (!row) throw new Error('[banners recordDismissal] upsert returned no row — check session scope');
  return row;
}
