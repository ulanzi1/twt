// News/Blog publish worker — Story 10.5 (Task 5; AC4, AC5).
//
// TWO layers:
//   (1) PURE — buildNewsAlert reuses the shipped `alert_published` category verbatim ({title, body});
//       deriveNewsAlertId is a deterministic UUIDv5 (idempotent across redeliveries); the push body is
//       truncated. No DB.
//   (2) LIVE-DB (:5433) — runNewsPublish: the scheduled path transitions `scheduled → published` then
//       fans out; the idempotent no-op arms (a non-scheduled post under `scheduled` mode; a non-published
//       post under `immediate` mode; a missing post) short-circuit BEFORE any fan-out. A FRESH random
//       pariwarId is used so `members-all` resolves to the EMPTY set (no crypto needed — the fan-out
//       reuse is exercised with an empty audience; the member-facing crypto path is the 8.8 suite's job).

import { randomUUID } from 'node:crypto';

import { createAuditPort, createRenderedMessageHash } from '@twt/channels';
import { createDb, encryption, ids, newsBlog, schema, withPariwarScope, type CreatedDb } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { ContributionNotifyDeps } from '../src/scheduler/contribution-notify.js';
import { buildNewsAlert, deriveNewsAlertId, runNewsPublish } from '../src/scheduler/news-publish.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);

const AUTHOR = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const REVIEWER = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const NOW = new Date('2026-08-01T00:00:00Z');

function fakePost(overrides: Partial<schema.NewsPostRow> = {}): schema.NewsPostRow {
  return {
    postId: '11111111-1111-1111-1111-111111111111',
    pariwarId: '22222222-2222-2222-2222-222222222222',
    title: 'Big News',
    bodyMarkdown: '# hello world',
    titleHi: null,
    bodyMarkdownHi: null,
    audienceScope: 'members-all',
    audienceScopeValue: null,
    channels: ['push'],
    scheduledPublishAt: null,
    status: 'published',
    authorActorId: AUTHOR,
    reviewerActorId: REVIEWER,
    toneSignoffContentHash: null,
    toneSignoffReviewedAt: null,
    publishedAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  } as schema.NewsPostRow;
}

describe('buildNewsAlert + deriveNewsAlertId (pure)', () => {
  it('builds a valid alert_published Alert with the post title/body', () => {
    const alert = buildNewsAlert(fakePost(), 'cccccccc-cccc-cccc-cccc-cccccccccccc', NOW);
    expect(alert.alert_category).toBe('alert_published');
    expect(alert.member_id).toBe('cccccccc-cccc-cccc-cccc-cccccccccccc');
    expect(alert.time_critical).toBe(false);
    if (alert.alert_category === 'alert_published') {
      expect(alert.payload_data.title).toBe('Big News');
      expect(alert.payload_data.body).toBe('# hello world');
    }
  });

  it('derives a deterministic UUIDv5 alert id from the post id', () => {
    const a = deriveNewsAlertId('11111111-1111-1111-1111-111111111111');
    const b = deriveNewsAlertId('11111111-1111-1111-1111-111111111111');
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(deriveNewsAlertId('other')).not.toBe(a);
  });

  it('truncates a long push body with an ellipsis', () => {
    const long = 'x'.repeat(500);
    const alert = buildNewsAlert(fakePost({ bodyMarkdown: long }), 'cccccccc-cccc-cccc-cccc-cccccccccccc', NOW);
    if (alert.alert_category === 'alert_published') {
      expect(alert.payload_data.body.length).toBeLessThanOrEqual(240);
      expect(alert.payload_data.body.endsWith('…')).toBe(true);
    }
  });
});

// Test-only fake KMS (the contribution-notify-live.test.ts precedent) — deterministic fixed key
// material, never a real KMS call. Needed only for the ONE real-member-audience test below; every
// other test in this file uses a fresh random pariwarId specifically to get an EMPTY audience, so the
// crypto/audit/hash fields are never touched there.
const FAKE_KMS = encryption.createFakeKmsProvider({
  kekBytes: new Uint8Array(32).fill(7),
  hmacKeyBytes: new Uint8Array(32).fill(9),
});
const FAKE_HMAC_KEY_REF: encryption.KmsKeyRef = { resourceName: 'fake/news-publish-test-hmac' };

describe.skipIf(!hasDatabase)('runNewsPublish (live-DB :5433)', () => {
  let created: CreatedDb;
  let notify: ContributionNotifyDeps;
  let fullNotify: ContributionNotifyDeps;

  beforeAll(() => {
    created = createDb(DATABASE_URL!, { ssl: false });
    // A minimal notify deps: only `.pool` is exercised (a FRESH pariwar ⇒ empty members-all audience ⇒
    // the fan-out iterates zero members ⇒ the crypto/audit/hash fields are never touched). The full
    // member-crypto fan-out is the Story 8.8 live suite's coverage, not re-proven here.
    notify = { pool: created.pool, serviceDb: created.db } as unknown as ContributionNotifyDeps;
    // A FULLY populated deps bundle (real fake-KMS field crypto + a real audit port + a real rendered-
    // message hash) — used by the ONE test that seeds a real member row and exercises the actual
    // `resolveMemberDeliveryContext` → `fanOutAlert` path against a non-empty audience (AC8: "the
    // publish path builds + fans out the alert_published alert (fixture-level) to a members-all
    // audience" — previously untested; every other case here used an empty audience by construction).
    fullNotify = {
      pool: created.pool,
      serviceDb: created.db,
      encryption: { kms: FAKE_KMS, kekRef: FAKE_HMAC_KEY_REF, hmacKeyRef: FAKE_HMAC_KEY_REF },
      audit: createAuditPort(created.pool),
      hashRendered: createRenderedMessageHash({ kms: FAKE_KMS, hmacKeyRef: FAKE_HMAC_KEY_REF }),
    };
  });

  afterAll(async () => {
    await created.pool.end();
  });

  /** Insert one real `active` members row directly (the `packages/domain/tests/integration/_helpers.ts`
   *  `seedMember` pattern, self-contained here rather than a cross-package test import). */
  async function seedActiveMember(pariwarId: string): Promise<string> {
    const memberId = randomUUID();
    await withPariwarScope(created.pool, pariwarId, (db) =>
      db.insert(schema.members).values({
        memberId: ids.memberId(memberId),
        pariwarId: ids.pariwarId(pariwarId),
        state: 'active',
        stateEventVersion: 1,
      }),
    );
    return memberId;
  }

  async function seedPost(pariwarId: string, driveTo: 'scheduled' | 'approved' | 'published'): Promise<string> {
    return withPariwarScope(created.pool, pariwarId, async (db) => {
      const draft = await newsBlog.createDraft(db, {
        pariwarId: pariwarId as schema.NewsPostRow['pariwarId'],
        title: 'T',
        bodyMarkdown: 'B',
        titleHi: 'श',
        bodyMarkdownHi: 'ब',
        audienceScope: 'members-all',
        channels: ['push'],
        authorActorId: AUTHOR as schema.NewsPostRow['authorActorId'],
      });
      await newsBlog.submitForReview(db, draft.pariwarId, draft.postId, REVIEWER as schema.NewsPostRow['authorActorId']);
      await newsBlog.approve(db, draft.pariwarId, draft.postId, REVIEWER as schema.NewsPostRow['authorActorId'], NOW);
      if (driveTo === 'approved') return draft.postId;
      if (driveTo === 'scheduled') {
        await newsBlog.schedule(db, draft.pariwarId, draft.postId, new Date('2026-08-05T00:00:00Z'), NOW);
        return draft.postId;
      }
      await newsBlog.publish(db, draft.pariwarId, draft.postId, NOW);
      return draft.postId;
    });
  }

  it('scheduled: transitions scheduled → published then fans out (empty audience)', async () => {
    const p = randomUUID();
    const postId = await seedPost(p, 'scheduled');
    const res = await runNewsPublish({ notify }, { postId, mode: 'scheduled' }, p);
    expect(res.published).toBe(true);
    expect(res.memberCount).toBe(0); // fresh pariwar → no members
    const after = await withPariwarScope(created.pool, p, (db) =>
      newsBlog.getPost(db, p as schema.NewsPostRow['pariwarId'], postId as schema.NewsPostRow['postId']),
    );
    expect(after?.status).toBe('published');
    expect(after?.publishedAt).not.toBeNull();
  });

  it('scheduled mode on a NON-scheduled (draft/approved) post is an idempotent no-op', async () => {
    const p = randomUUID();
    const postId = await seedPost(p, 'approved'); // still approved, not scheduled
    const res = await runNewsPublish({ notify }, { postId, mode: 'scheduled' }, p);
    expect(res.published).toBe(false);
    expect(res.reason).toBe('not-scheduled');
  });

  it('immediate mode on a NON-published (approved) post is an idempotent no-op', async () => {
    const p = randomUUID();
    const postId = await seedPost(p, 'approved');
    const res = await runNewsPublish({ notify }, { postId, mode: 'immediate' }, p);
    expect(res.published).toBe(false);
    expect(res.reason).toBe('not-published');
  });

  it('immediate mode on a published post fans out (empty audience)', async () => {
    const p = randomUUID();
    const postId = await seedPost(p, 'published');
    const res = await runNewsPublish({ notify }, { postId, mode: 'immediate' }, p);
    expect(res.published).toBe(true);
    expect(res.memberCount).toBe(0);
  });

  it('AC8: publishes to a REAL non-empty members-all audience — resolves + builds + attempts fan-out for a seeded active member', async () => {
    const p = randomUUID();
    const memberId = await seedActiveMember(p);
    const postId = await seedPost(p, 'scheduled');
    const res = await runNewsPublish({ notify: fullNotify }, { postId, mode: 'scheduled' }, p);
    expect(res.published).toBe(true);
    // ONE seeded member for a brand-new, non-shared pariwarId — an exact count is safe here (not the
    // accumulating-shared-fixture case [[project_live_db_test_gotchas]] warns about).
    expect(res.memberCount).toBe(1);
    const after = await withPariwarScope(created.pool, p, (db) =>
      newsBlog.getPost(db, p as schema.NewsPostRow['pariwarId'], postId as schema.NewsPostRow['postId']),
    );
    expect(after?.status).toBe('published');
    // The member has no registered device/contact, so the fixture-level fan-out attempt naturally
    // resolves to `skipped_no_target` on every channel — the ATTEMPT (audience resolution + the
    // per-member resolveMemberDeliveryContext/fanOutAlert path, previously entirely untested) is what
    // this test proves, not a real delivery. An UNDELIVERED member's idempotency claim is released
    // (not recorded), so a later re-run safely re-attempts it rather than leaving it stuck forever.
    const rerun = await runNewsPublish({ notify: fullNotify }, { postId, mode: 'scheduled' }, p);
    expect(rerun.published).toBe(true);
    expect(rerun.memberCount).toBe(1); // audience resolution is unaffected by the prior (released) claim
    void memberId; // seeded for FK/membership purposes only — its value isn't separately asserted
  });

  it('a missing post is a clean not-found no-op', async () => {
    const p = randomUUID();
    const res = await runNewsPublish({ notify }, { postId: randomUUID(), mode: 'scheduled' }, p);
    expect(res.published).toBe(false);
    expect(res.reason).toBe('not-found');
  });
});
