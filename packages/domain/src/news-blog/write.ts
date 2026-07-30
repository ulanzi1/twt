// News/Blog write-path accessors — Story 10.5 (AC1–AC5, AC7).
//
// The mutable-content workflow (Load-Bearing Decision 1): a PLAIN `status` column transitioned in
// the caller's scoped tx, NOT event-derived-state. Every function here runs DIRECTLY on the passed
// `db` (the caller's scope tx) — never opening its own transaction (the niyamavali drafts.ts
// contract). RLS scope is transaction-scoped; the explicit `pariwarId` predicate (alongside RLS) is
// defense-in-depth + matches the `(pariwar_id, status)` index.
//
// ── The status transitions are guarded THREE ways ────────────────────────────────────────────
//   1. `nextPostStatus` legality (status.ts) — an illegal (status, action) → NewsPostStateError 409.
//   2. author≠reviewer identity (AC2) — reviewer/approver == author → NewsPostAuthorReviewerError 403.
//   3. tone-review gate (AC3) — `approve` builds + injects a ToneReviewSignoff; a deny → the shipped
//      ToneReviewRequiredError (409). The sign-off is content-bound (contentHash of the reviewed
//      body): an edit-after-approval invalidates it (updateDraft clears the hash + resets to draft).
//
// The AUDIT of each transition (Story 1.10) is the CONSUMER's job (apps/api handler), as is the
// tone_review.signoff audit-sink emission — this module owns only the durable row state (the
// niyamavali domain/api split: domain records the which-artifact columns, apps/api emits the lines).

import { createHash } from 'node:crypto';

import { and, eq, inArray } from 'drizzle-orm';

import { canonicalJsonStringify } from '../canonical-json.js';
import type { Db } from '../db.js';
import type { NewsPostId, PariwarId, UserId } from '../ids/index.js';
import {
  type NewsAudienceScope,
  type NewsChannel,
  type NewsPostRow,
  type NewsPostStatus,
  newsPosts,
} from '../schema/news_posts.js';
import { type ToneReviewSignoff, evaluateToneReviewGate } from '../tone-review/gate.js';
import { ToneReviewRequiredError } from '../tone-review/errors.js';
import {
  NewsPostAuthorReviewerError,
  NewsPostBilingualRequiredError,
  NewsPostScheduleInPastError,
  NewsPostStateError,
} from './errors.js';
import { getPostOrThrow } from './read.js';
import { nextPostStatus } from './status.js';

/** The audience scopes that REQUIRE bilingual (hi+en) copy at submit/approve (FR-51, AC7). */
const BILINGUAL_REQUIRED_SCOPES: ReadonlySet<NewsAudienceScope> = new Set(['public', 'members-all']);

/**
 * The resource locator a post's tone-review sign-off is bound to (`news:post:<postId>`) — the
 * niyamavali `draftResourceLocator` analogue. Keyed to the POST so the gate's resource-bound check
 * matches the approval target.
 */
export function newsResourceLocator(postId: NewsPostId | string): string {
  return `news:post:${postId}`;
}

/**
 * The canonical content hash binding a tone-review sign-off to the EXACT reviewed copy: SHA-256 hex
 * of the RFC-8785 canonical JSON of `{ body_markdown, body_markdown_hi }` (the drafts.ts
 * `draftContentHash` discipline — the reviewed body, never the raw copy in the sign-off). An edit
 * that changes either body changes the hash, invalidating a prior sign-off.
 */
export function newsContentHash(post: Pick<NewsPostRow, 'bodyMarkdown' | 'bodyMarkdownHi'>): string {
  const canonical = canonicalJsonStringify({
    body_markdown: post.bodyMarkdown,
    body_markdown_hi: post.bodyMarkdownHi ?? null,
  });
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

/** Which required bilingual fields (if any) are missing for a scope that needs them. */
function missingBilingualFields(post: Pick<NewsPostRow, 'titleHi' | 'bodyMarkdownHi'>): string[] {
  const missing: string[] = [];
  if (!post.titleHi || post.titleHi.trim() === '') missing.push('title_hi');
  if (!post.bodyMarkdownHi || post.bodyMarkdownHi.trim() === '') missing.push('body_markdown_hi');
  return missing;
}

/**
 * Assert a post carries the required bilingual copy for its scope, or throw
 * NewsPostBilingualRequiredError (422). A no-op for `state`/`role`/`cohort` (Hindi optional there).
 * PURE + exported for unit tests.
 */
export function assertBilingualForScope(
  post: { postId: string; audienceScope: NewsAudienceScope } & Pick<NewsPostRow, 'titleHi' | 'bodyMarkdownHi'>,
): void {
  if (!BILINGUAL_REQUIRED_SCOPES.has(post.audienceScope)) return;
  const missing = missingBilingualFields(post);
  if (missing.length > 0) {
    throw new NewsPostBilingualRequiredError(post.postId, post.audienceScope, missing);
  }
}

// ── create / edit ──────────────────────────────────────────────────────────────

export interface CreateDraftInput {
  pariwarId: PariwarId;
  title: string;
  bodyMarkdown: string;
  titleHi?: string | null;
  bodyMarkdownHi?: string | null;
  audienceScope: NewsAudienceScope;
  audienceScopeValue?: string | null;
  channels: NewsChannel[];
  scheduledPublishAt?: Date | null;
  /** The actor authoring the draft (NOT NULL — a post is always human-authored). */
  authorActorId: UserId;
}

/** Create a new post at `status='draft'`. */
export async function createDraft(db: Db, input: CreateDraftInput): Promise<NewsPostRow> {
  const inserted = await db
    .insert(newsPosts)
    .values({
      pariwarId: input.pariwarId,
      title: input.title,
      bodyMarkdown: input.bodyMarkdown,
      titleHi: input.titleHi ?? null,
      bodyMarkdownHi: input.bodyMarkdownHi ?? null,
      audienceScope: input.audienceScope,
      audienceScopeValue: input.audienceScopeValue ?? null,
      channels: input.channels,
      scheduledPublishAt: input.scheduledPublishAt ?? null,
      status: 'draft',
      authorActorId: input.authorActorId,
    })
    .returning();
  const row = inserted[0];
  if (!row) throw new Error('[news createDraft] insert returned no row — check session scope');
  return row;
}

export interface UpdateDraftPatch {
  title?: string;
  bodyMarkdown?: string;
  titleHi?: string | null;
  bodyMarkdownHi?: string | null;
  audienceScope?: NewsAudienceScope;
  audienceScopeValue?: string | null;
  channels?: NewsChannel[];
  scheduledPublishAt?: Date | null;
}

/**
 * Edit a post — allowed ONLY while `status === 'draft'` (AC1: a submitted/approved post is
 * edit-locked). Rejects a non-draft edit with NewsPostStateError (409) BEFORE any write. Any body
 * change would invalidate a prior sign-off, but a draft has none yet (sign-off is recorded at
 * approve), so no sign-off columns are cleared here — the edit-lock makes that unreachable.
 */
export async function updateDraft(
  db: Db,
  pariwarId: PariwarId,
  postId: NewsPostId,
  patch: UpdateDraftPatch,
): Promise<NewsPostRow> {
  const post = await getPostOrThrow(db, pariwarId, postId);
  if (post.status !== 'draft') {
    throw new NewsPostStateError(postId, post.status, 'only a draft may be edited (edit-locked once submitted)');
  }

  const updated = await db
    .update(newsPosts)
    .set({
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.bodyMarkdown !== undefined ? { bodyMarkdown: patch.bodyMarkdown } : {}),
      ...(patch.titleHi !== undefined ? { titleHi: patch.titleHi } : {}),
      ...(patch.bodyMarkdownHi !== undefined ? { bodyMarkdownHi: patch.bodyMarkdownHi } : {}),
      ...(patch.audienceScope !== undefined ? { audienceScope: patch.audienceScope } : {}),
      ...(patch.audienceScopeValue !== undefined ? { audienceScopeValue: patch.audienceScopeValue } : {}),
      ...(patch.channels !== undefined ? { channels: patch.channels } : {}),
      ...(patch.scheduledPublishAt !== undefined ? { scheduledPublishAt: patch.scheduledPublishAt } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(newsPosts.pariwarId, pariwarId), eq(newsPosts.postId, postId), eq(newsPosts.status, 'draft')))
    .returning();
  const row = updated[0];
  if (!row) {
    throw new NewsPostStateError(postId, post.status, 'post changed state before the edit could be applied');
  }
  return row;
}

// ── lifecycle transitions ────────────────────────────────────────────────────────

/**
 * Submit a draft for review (`draft → submitted`). Records `reviewer_actor_id`. Rejects
 * `reviewerId === author_actor_id` with NewsPostAuthorReviewerError (403, AC2). Enforces the
 * bilingual requirement for public/members-all (AC7 — a missing Hindi field → 422). Illegal from a
 * non-draft status (nextPostStatus) → NewsPostStateError (409).
 */
export async function submitForReview(
  db: Db,
  pariwarId: PariwarId,
  postId: NewsPostId,
  reviewerId: UserId,
): Promise<NewsPostRow> {
  const post = await getPostOrThrow(db, pariwarId, postId);
  if (nextPostStatus(post.status, 'submit') === null) {
    throw new NewsPostStateError(postId, post.status, 'only a draft may be submitted for review');
  }
  if (post.authorActorId === reviewerId) {
    throw new NewsPostAuthorReviewerError(postId, reviewerId, 'the author cannot be the reviewer (author ≠ reviewer)');
  }
  assertBilingualForScope(post);

  const updated = await db
    .update(newsPosts)
    .set({ status: 'submitted', reviewerActorId: reviewerId, updatedAt: new Date() })
    .where(and(eq(newsPosts.pariwarId, pariwarId), eq(newsPosts.postId, postId), eq(newsPosts.status, 'draft')))
    .returning();
  const row = updated[0];
  if (!row) {
    throw new NewsPostStateError(postId, post.status, 'post changed state before submit could be applied');
  }
  return row;
}

export interface ApproveResult {
  row: NewsPostRow;
  /** The recorded sign-off (the handler emits the `tone_review.signoff` audit line from this). */
  signoff: ToneReviewSignoff;
}

/**
 * Approve a submitted post (`submitted → approved`), recording the non-author reviewer's tone-review
 * sign-off (AC3). Steps, fail-closed:
 *   1. legality (submitted → approved) → NewsPostStateError 409;
 *   2. author≠approver identity (AC2) → NewsPostAuthorReviewerError 403;
 *   2b. reviewer-lock: only the actor recorded as `reviewer_actor_id` at submit may approve (any
 *      other `news.manage` holder is rejected) → NewsPostAuthorReviewerError 403;
 *   3. bilingual re-check (AC7) → NewsPostBilingualRequiredError 422;
 *   4. build a ToneReviewSignoff (reviewedBy=approver, resourceLocator=news:post:<id>, contentHash
 *      of the reviewed body) and inject it into `evaluateToneReviewGate`; a deny → ToneReviewRequired
 *      Error 409 (the shipped gate is the authority — this is the fail-closed backstop, since the
 *      author≠approver 403 above already excludes the "author-authored sign-off" arm);
 *   5. persist the sign-off (contentHash + reviewedAt) + `status=approved`.
 * Returns the row + the sign-off so the handler can emit the audit line via the ToneReviewAuditSink.
 */
export async function approve(
  db: Db,
  pariwarId: PariwarId,
  postId: NewsPostId,
  approverActorId: UserId,
  now: Date,
): Promise<ApproveResult> {
  const post = await getPostOrThrow(db, pariwarId, postId);
  if (nextPostStatus(post.status, 'approve') === null) {
    throw new NewsPostStateError(postId, post.status, 'only a submitted post may be approved');
  }
  if (post.authorActorId === approverActorId) {
    throw new NewsPostAuthorReviewerError(postId, approverActorId, 'the author cannot approve their own post (author ≠ approver)');
  }
  if (post.reviewerActorId !== approverActorId) {
    throw new NewsPostAuthorReviewerError(
      postId,
      approverActorId,
      'only the assigned reviewer may approve this post',
    );
  }
  assertBilingualForScope(post);

  const resourceLocator = newsResourceLocator(postId);
  const contentHash = newsContentHash(post);
  const signoff: ToneReviewSignoff = {
    reviewedBy: approverActorId,
    resourceLocator,
    contentHash,
    reviewedAt: now,
  };
  const gate = evaluateToneReviewGate({ signoff, authoredBy: post.authorActorId, resourceLocator });
  if (!gate.allowed) {
    throw new ToneReviewRequiredError(gate.denial);
  }

  const updated = await db
    .update(newsPosts)
    .set({
      status: 'approved',
      toneSignoffContentHash: contentHash,
      toneSignoffReviewedAt: now,
      updatedAt: new Date(),
    })
    .where(and(eq(newsPosts.pariwarId, pariwarId), eq(newsPosts.postId, postId), eq(newsPosts.status, 'submitted')))
    .returning();
  const row = updated[0];
  if (!row) {
    throw new NewsPostStateError(postId, post.status, 'post changed state before approve could be applied');
  }
  return { row, signoff };
}

/**
 * Schedule an approved post (`approved → scheduled`), setting `scheduled_publish_at`. The API enqueues
 * the pg-boss delayed job (Task 5); this only moves the row. Illegal from a non-approved status → 409.
 * `at` must be strictly after `now` — a past/now timestamp would fire the delayed job near-immediately,
 * silently behaving like an immediate publish while labeled "scheduled" → NewsPostScheduleInPastError 422.
 */
export async function schedule(
  db: Db,
  pariwarId: PariwarId,
  postId: NewsPostId,
  at: Date,
  now: Date,
): Promise<NewsPostRow> {
  const post = await getPostOrThrow(db, pariwarId, postId);
  if (nextPostStatus(post.status, 'schedule') === null) {
    throw new NewsPostStateError(postId, post.status, 'only an approved post may be scheduled');
  }
  if (at.getTime() <= now.getTime()) {
    throw new NewsPostScheduleInPastError(postId, at.toISOString(), now.toISOString());
  }
  const updated = await db
    .update(newsPosts)
    .set({ status: 'scheduled', scheduledPublishAt: at, updatedAt: new Date() })
    .where(and(eq(newsPosts.pariwarId, pariwarId), eq(newsPosts.postId, postId), eq(newsPosts.status, 'approved')))
    .returning();
  const row = updated[0];
  if (!row) {
    throw new NewsPostStateError(postId, post.status, 'post changed state before schedule could be applied');
  }
  return row;
}

/**
 * Publish a post (`approved → published` immediate, OR `scheduled → published` at worker fire time),
 * setting `published_at`. The caller (apps/api immediate publish, or the pg-boss worker) resolves the
 * audience + fans out AFTER this returns. Illegal from any other status → NewsPostStateError 409 —
 * the worker's idempotent no-op is achieved by re-checking `status === 'scheduled'` BEFORE calling
 * this (an already-published post — the only reachable non-`scheduled` state a delayed job can find
 * post-redelivery, since there is no unschedule/cancel transition — is skipped, never reaching here).
 */
export async function publish(
  db: Db,
  pariwarId: PariwarId,
  postId: NewsPostId,
  now: Date,
): Promise<NewsPostRow> {
  const post = await getPostOrThrow(db, pariwarId, postId);
  if (nextPostStatus(post.status, 'publish') === null) {
    throw new NewsPostStateError(postId, post.status, 'only an approved or scheduled post may be published');
  }
  // Conditional on the two publishable from-states — a concurrent transition (or an already-
  // published post) matches no row and 409s rather than double-publishing.
  const updated = await db
    .update(newsPosts)
    .set({ status: 'published', publishedAt: now, updatedAt: new Date() })
    .where(
      and(
        eq(newsPosts.pariwarId, pariwarId),
        eq(newsPosts.postId, postId),
        inArray(newsPosts.status, ['approved', 'scheduled'] satisfies NewsPostStatus[]),
      ),
    )
    .returning();
  const row = updated[0];
  if (!row) {
    throw new NewsPostStateError(postId, post.status, 'post changed state before publish could be applied');
  }
  return row;
}
