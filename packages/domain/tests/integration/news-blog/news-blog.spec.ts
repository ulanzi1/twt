// news_posts accessors + workflow + audience — live-DB (Story 10.5, Task 8 / AC1–AC5, AC7).
//
// Exercises the mutable-status workflow (Decision 1): create/edit (draft-only edit-lock), the
// author≠reviewer identity rejections (submit + approve), the tone-review-gate integration at
// approve (sign-off recorded + content-bound), schedule/publish transitions, the paginated
// status-filtered list (membership-not-counts + tenant isolation), the public read, and
// resolveAudienceMemberIds (members-all = active/in-grace, public/seam = empty).
//
// RLS-in-tests (Story 1.6): seed as the Docker superuser (RLS bypassed), then `enterAppScope`
// (SET LOCAL ROLE twt_app + scope) to exercise the accessors under tenant scope. afterEach ROLLBACK.

import { describe, expect, it } from 'vitest';

import {
  approve,
  createDraft,
  getPost,
  listPostsForPariwar,
  listPublishedPublicPosts,
  publish,
  resolveAudienceMemberIds,
  schedule,
  submitForReview,
  updateDraft,
} from '../../../src/news-blog/index.js';
import {
  NewsPostAuthorReviewerError,
  NewsPostBilingualRequiredError,
  NewsPostStateError,
} from '../../../src/news-blog/errors.js';
import type { CreateDraftInput } from '../../../src/news-blog/write.js';
import type { PariwarId, UserId } from '../../../src/ids/index.js';
import { hasDatabase, getTx, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope, seedMember } from '../_helpers.js';

const AUTHOR = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' as UserId;
const REVIEWER = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' as UserId;
const NOW = new Date('2026-08-01T00:00:00Z');

function draftInput(pariwarId: PariwarId, overrides: Partial<CreateDraftInput> = {}): CreateDraftInput {
  return {
    pariwarId,
    title: 'Welcome',
    bodyMarkdown: '# hello',
    titleHi: 'स्वागत',
    bodyMarkdownHi: '# नमस्ते',
    audienceScope: 'members-all',
    audienceScopeValue: null,
    channels: ['push', 'sms'],
    scheduledPublishAt: null,
    authorActorId: AUTHOR,
    ...overrides,
  };
}

describe.skipIf(!hasDatabase)('news_posts workflow + audience', () => {
  setupLiveDb();

  it('createDraft → getPost round-trips at status=draft with channels', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const created = await createDraft(tx, draftInput(PARIWAR_A));
    expect(created.status).toBe('draft');
    expect(created.channels).toEqual(['push', 'sms']);
    const loaded = await getPost(tx, PARIWAR_A, created.postId);
    expect(loaded?.postId).toBe(created.postId);
    expect(loaded?.authorActorId).toBe(AUTHOR);
  });

  it('updateDraft edits a draft but rejects editing a submitted (edit-locked) post', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const d = await createDraft(tx, draftInput(PARIWAR_A));
    const edited = await updateDraft(tx, PARIWAR_A, d.postId, { title: 'Updated' });
    expect(edited.title).toBe('Updated');

    await submitForReview(tx, PARIWAR_A, d.postId, REVIEWER);
    await expect(updateDraft(tx, PARIWAR_A, d.postId, { title: 'nope' })).rejects.toBeInstanceOf(
      NewsPostStateError,
    );
  });

  it('submitForReview: draft→submitted, records reviewer, rejects reviewer===author (403)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const d = await createDraft(tx, draftInput(PARIWAR_A));
    await expect(submitForReview(tx, PARIWAR_A, d.postId, AUTHOR)).rejects.toBeInstanceOf(
      NewsPostAuthorReviewerError,
    );
    const submitted = await submitForReview(tx, PARIWAR_A, d.postId, REVIEWER);
    expect(submitted.status).toBe('submitted');
    expect(submitted.reviewerActorId).toBe(REVIEWER);
  });

  it('submitForReview enforces bilingual copy for public/members-all (422)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const d = await createDraft(tx, draftInput(PARIWAR_A, { audienceScope: 'public', titleHi: null }));
    await expect(submitForReview(tx, PARIWAR_A, d.postId, REVIEWER)).rejects.toBeInstanceOf(
      NewsPostBilingualRequiredError,
    );
    // state scope does NOT require hi
    const s = await createDraft(
      tx,
      draftInput(PARIWAR_A, { audienceScope: 'state', audienceScopeValue: 'BR', titleHi: null, bodyMarkdownHi: null }),
    );
    const ok = await submitForReview(tx, PARIWAR_A, s.postId, REVIEWER);
    expect(ok.status).toBe('submitted');
  });

  it('submitForReview is illegal from a non-draft status (409)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const d = await createDraft(tx, draftInput(PARIWAR_A));
    await submitForReview(tx, PARIWAR_A, d.postId, REVIEWER);
    await expect(submitForReview(tx, PARIWAR_A, d.postId, REVIEWER)).rejects.toBeInstanceOf(
      NewsPostStateError,
    );
  });

  it('approve: submitted→approved, records the sign-off; rejects approver===author (403)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const d = await createDraft(tx, draftInput(PARIWAR_A));
    await submitForReview(tx, PARIWAR_A, d.postId, REVIEWER);

    await expect(approve(tx, PARIWAR_A, d.postId, AUTHOR, NOW)).rejects.toBeInstanceOf(
      NewsPostAuthorReviewerError,
    );

    const { row, signoff } = await approve(tx, PARIWAR_A, d.postId, REVIEWER, NOW);
    expect(row.status).toBe('approved');
    expect(row.toneSignoffContentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(signoff.reviewedBy).toBe(REVIEWER);
    expect(signoff.resourceLocator).toBe(`news:post:${d.postId}`);
    expect(signoff.contentHash).toBe(row.toneSignoffContentHash);
  });

  it('approve is illegal on a draft (never submitted) — 409, no ToneReviewRequired leak', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const d = await createDraft(tx, draftInput(PARIWAR_A));
    await expect(approve(tx, PARIWAR_A, d.postId, REVIEWER, NOW)).rejects.toBeInstanceOf(
      NewsPostStateError,
    );
  });

  it('schedule then publish transitions set the timestamps', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const d = await createDraft(tx, draftInput(PARIWAR_A));
    await submitForReview(tx, PARIWAR_A, d.postId, REVIEWER);
    await approve(tx, PARIWAR_A, d.postId, REVIEWER, NOW);

    const at = new Date('2026-08-05T09:00:00Z');
    const scheduled = await schedule(tx, PARIWAR_A, d.postId, at, NOW);
    expect(scheduled.status).toBe('scheduled');
    expect(scheduled.scheduledPublishAt?.toISOString()).toBe(at.toISOString());

    const published = await publish(tx, PARIWAR_A, d.postId, NOW);
    expect(published.status).toBe('published');
    expect(published.publishedAt?.toISOString()).toBe(NOW.toISOString());
  });

  it('immediate publish: approved→published directly', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const d = await createDraft(tx, draftInput(PARIWAR_A));
    await submitForReview(tx, PARIWAR_A, d.postId, REVIEWER);
    await approve(tx, PARIWAR_A, d.postId, REVIEWER, NOW);
    const published = await publish(tx, PARIWAR_A, d.postId, NOW);
    expect(published.status).toBe('published');
    // re-publishing a published post is illegal
    await expect(publish(tx, PARIWAR_A, d.postId, NOW)).rejects.toBeInstanceOf(NewsPostStateError);
  });

  it('listPostsForPariwar: status filter + tenant isolation (membership, not counts)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const draft = await createDraft(tx, draftInput(PARIWAR_A, { title: 'A-draft' }));
    const toSubmit = await createDraft(tx, draftInput(PARIWAR_A, { title: 'A-submitted' }));
    await submitForReview(tx, PARIWAR_A, toSubmit.postId, REVIEWER);

    const all = await listPostsForPariwar(tx, PARIWAR_A, { limit: 100 });
    const ids = all.map((p) => p.postId);
    expect(ids).toContain(draft.postId);
    expect(ids).toContain(toSubmit.postId);

    const submittedOnly = await listPostsForPariwar(tx, PARIWAR_A, { status: 'submitted', limit: 100 });
    expect(submittedOnly.map((p) => p.postId)).toContain(toSubmit.postId);
    expect(submittedOnly.map((p) => p.postId)).not.toContain(draft.postId);

    // Tenant B sees none of A's posts.
    await enterAppScope(client, PARIWAR_B);
    const bView = await listPostsForPariwar(tx, PARIWAR_B, { limit: 100 });
    expect(bView.map((p) => p.postId)).not.toContain(draft.postId);
  });

  it('listPublishedPublicPosts returns only published public posts', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    // a published public post
    const pub = await createDraft(tx, draftInput(PARIWAR_A, { audienceScope: 'public', title: 'Public news' }));
    await submitForReview(tx, PARIWAR_A, pub.postId, REVIEWER);
    await approve(tx, PARIWAR_A, pub.postId, REVIEWER, NOW);
    await publish(tx, PARIWAR_A, pub.postId, NOW);
    // a published members-all post (should NOT appear on the public surface)
    const mem = await createDraft(tx, draftInput(PARIWAR_A, { audienceScope: 'members-all', title: 'Members news' }));
    await submitForReview(tx, PARIWAR_A, mem.postId, REVIEWER);
    await approve(tx, PARIWAR_A, mem.postId, REVIEWER, NOW);
    await publish(tx, PARIWAR_A, mem.postId, NOW);

    const publicList = await listPublishedPublicPosts(tx, PARIWAR_A, { limit: 100 });
    const ids = publicList.map((p) => p.postId);
    expect(ids).toContain(pub.postId);
    expect(ids).not.toContain(mem.postId);
  });

  it('resolveAudienceMemberIds: members-all = active/in-grace; public/seam = empty', async () => {
    const { tx, client } = getTx();
    // seed as superuser BEFORE entering scope
    const active = await seedMember(tx, PARIWAR_A, { state: 'active' });
    const grace = await seedMember(tx, PARIWAR_A, { state: 'active-in-grace' });
    const pending = await seedMember(tx, PARIWAR_A, { state: 'pending-kyc' });
    const lapsed = await seedMember(tx, PARIWAR_A, { state: 'lapsed-unpaid' });
    const otherTenant = await seedMember(tx, PARIWAR_B, { state: 'active' }); // other tenant

    await enterAppScope(client, PARIWAR_A);
    const membersAll = await resolveAudienceMemberIds(tx, PARIWAR_A, 'members-all', null);
    // Assert MEMBERSHIP, not counts — the shared test DB accumulates committed member rows
    // ([[project_live_db_test_gotchas]]). The reachable states are IN; the unreachable + the
    // other tenant's member are OUT.
    expect(membersAll).toContain(active);
    expect(membersAll).toContain(grace);
    expect(membersAll).not.toContain(pending);
    expect(membersAll).not.toContain(lapsed);
    expect(membersAll).not.toContain(otherTenant);

    expect(await resolveAudienceMemberIds(tx, PARIWAR_A, 'public', null)).toEqual([]);
    expect(await resolveAudienceMemberIds(tx, PARIWAR_A, 'state', 'BR')).toEqual([]);
    expect(await resolveAudienceMemberIds(tx, PARIWAR_A, 'role', 'x')).toEqual([]);
    expect(await resolveAudienceMemberIds(tx, PARIWAR_A, 'cohort', 'y')).toEqual([]);
  });

  it('a stale/edited body invalidates the sign-off hash comparison (content-binding)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const d = await createDraft(tx, draftInput(PARIWAR_A));
    await submitForReview(tx, PARIWAR_A, d.postId, REVIEWER);
    const { row } = await approve(tx, PARIWAR_A, d.postId, REVIEWER, NOW);
    // the recorded hash binds to the reviewed body — a different body would hash differently
    const { newsContentHash } = await import('../../../src/news-blog/write.js');
    expect(row.toneSignoffContentHash).toBe(newsContentHash(row));
    expect(row.toneSignoffContentHash).not.toBe(newsContentHash({ ...row, bodyMarkdown: 'changed' }));
  });
});
