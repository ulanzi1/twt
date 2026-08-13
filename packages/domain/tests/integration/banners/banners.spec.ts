// banners + banner_dismissals accessors — live-DB (Story 10.9, Task 2 / AC1–AC6, AC9).
//
// Exercises the mutable-status workflow (Decision 1): create/update/publish/retract with the
// pre-write legality guard, the tone-review gate at publish, the Decision 5 content-hash branch
// (window-only edit ⇒ no bump; copy edit ⇒ fresh non-author sign-off + `revision` bump), the DB
// CHECK constraints (the AC4 undismissable-popup teeth + the empty-window teeth), the derived-state
// admin list (membership-not-counts + tenant isolation), and — the one this file exists for — the
// member visible-banner read: the LEFT JOIN suppression predicate, the re-surface-after-revision
// case, and CROSS-MEMBER isolation (two members, different dismissal state, in the same Pariwar).
//
// ⚠ The cross-member test is the guard against [[project_epic6_drizzle_correlated_subquery_bug]]:
// a correlation that collapsed into a tautology would suppress the banner for BOTH members (or
// neither), and no DB-free unit test could catch it.
//
// RLS-in-tests (Story 1.6): seed as the Docker superuser (RLS bypassed), then `enterAppScope`
// (SET LOCAL ROLE twt_app + scope) to exercise the accessors under tenant scope. afterEach ROLLBACK.

import { describe, expect, it } from 'vitest';

import {
  createDraft,
  getBanner,
  getDismissal,
  listBannersForPariwar,
  listLiveBannersForPariwar,
  listVisibleBannersForMember,
  publish,
  recordDismissal,
  listMemberBannerCandidates,
  retract,
  updateBanner,
} from '../../../src/banners/index.js';
import {
  BannerNotFoundError,
  BannerPopupMustBeDismissibleError,
  BannerStateError,
  BannerWindowInvalidError,
} from '../../../src/banners/errors.js';
import type { CreateBannerDraftInput } from '../../../src/banners/write.js';
import { ToneReviewRequiredError } from '../../../src/tone-review/errors.js';
import { bannerId as toBannerId, type MemberId, type PariwarId, type UserId } from '../../../src/ids/index.js';
import { banners as bannersTable } from '../../../src/schema/banners.js';
import { hasDatabase, getTx, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope, seedMember, seedMemberPosting } from '../_helpers.js';
import { createGeoTreeVersion, loadGeoTree } from '../../../src/geo-tree/index.js';
import type { GeoTreeNodeJson } from '../../../src/schema/geo_tree_versions.js';

/**
 * Which DB constraint did this write violate? Drizzle WRAPS the pg error ("Failed query: …"), so the
 * constraint name lives on `err.cause`, not on `err.message` — the same `err.cause.code` shape the
 * 23505 savepoint-retry path relies on. Asserting on the NAME (not merely "it threw") is what makes
 * these the revert-sanity teeth for the two CHECKs: drop a CHECK from migration 0090 and the write
 * succeeds, so the assertion fails rather than passing on some unrelated error.
 */
function violatedConstraint(err: unknown): string | undefined {
  const cause = (err as { cause?: { constraint?: string } } | undefined)?.cause;
  return cause?.constraint;
}

async function expectConstraintViolation(promise: Promise<unknown>, constraint: string): Promise<void> {
  await expect(promise).rejects.toSatisfy(
    (err: unknown) => violatedConstraint(err) === constraint,
    `expected the write to violate the ${constraint} CHECK`,
  );
}

// Bihar ⊃ {Patna}; UP ⊃ {Lucknow}. Two states so "reaches the right member" is a real
// discrimination, not merely "reaches everyone in the only state there is" (Story 1.19).
const GEO_TREE: GeoTreeNodeJson[] = [
  { dimension: 'state', value: 'Bihar', parent_dimension: null, parent_value: null },
  { dimension: 'state', value: 'UP', parent_dimension: null, parent_value: null },
  { dimension: 'district', value: 'Patna', parent_dimension: 'state', parent_value: 'Bihar' },
  { dimension: 'district', value: 'Lucknow', parent_dimension: 'state', parent_value: 'UP' },
];

const AUTHOR = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' as UserId;
const OTHER_ADMIN = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' as UserId;

const FROM = new Date('2026-08-01T00:00:00.000Z');
const UNTIL = new Date('2026-08-08T00:00:00.000Z');
const MID = new Date('2026-08-04T12:00:00.000Z');
const BEFORE = new Date('2026-07-01T00:00:00.000Z');
const AFTER = new Date('2026-09-01T00:00:00.000Z');
// ⚠ Posting seeds pin `created_at` EXPLICITLY. `seedMemberPosting` defaults it to the REAL wall
// clock (`_helpers.ts:515`), while the member read is bounded by the PINNED instant `MID`
// (2026-08-04) — so the default would put every seeded posting in the FUTURE relative to the query
// and silently empty the geo audience. That is the DATE-BOMB class: it fails on a DATE, not a diff
// ([[project_known_livedb_test_failures]] #12).
const POSTED = new Date('2026-07-15T00:00:00.000Z');

function draftInput(pariwarId: PariwarId, o: Partial<CreateBannerDraftInput> = {}): CreateBannerDraftInput {
  return {
    pariwarId,
    title: 'Maintenance window',
    body: 'The app is unavailable 02:00–03:00 IST.',
    titleHi: 'रखरखाव अवधि',
    bodyHi: 'ऐप 02:00–03:00 IST तक उपलब्ध नहीं रहेगा।',
    audienceScope: 'members-all',
    audienceScopeValue: null,
    validFrom: FROM,
    validUntil: UNTIL,
    displayMode: 'banner',
    dismissible: true,
    displayOncePerMember: false,
    severity: 'info',
    createdByActorId: AUTHOR,
    ...o,
  };
}

/** Create + publish in one step (publishing needs a NON-author actor — the tone gate). */
async function publishedBanner(
  tx: Parameters<typeof createDraft>[0],
  pariwarId: PariwarId,
  o: Partial<CreateBannerDraftInput> = {},
) {
  const draft = await createDraft(tx, draftInput(pariwarId, o));
  const { row } = await publish(tx, pariwarId, draft.bannerId, OTHER_ADMIN, MID);
  return row;
}

describe.skipIf(!hasDatabase)('banners — lifecycle + guards', () => {
  setupLiveDb();

  it('createDraft → getBanner round-trips at status=draft, revision=1', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const created = await createDraft(tx, draftInput(PARIWAR_A));
    expect(created.status).toBe('draft');
    expect(created.revision).toBe(1);
    expect(created.publishedAt).toBeNull();
    expect(created.retractedAt).toBeNull();

    const loaded = await getBanner(tx, PARIWAR_A, created.bannerId);
    expect(loaded?.bannerId).toBe(created.bannerId);
    expect(loaded?.createdByActorId).toBe(AUTHOR);
  });

  it('getBanner returns null for another tenant’s banner; getBannerOrThrow-backed writes 404', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const created = await createDraft(tx, draftInput(PARIWAR_A));
    // A well-formed id that does not exist in this tenant.
    const ghost = toBannerId('99999999-9999-4999-8999-999999999999');
    expect(await getBanner(tx, PARIWAR_A, ghost)).toBeNull();
    await expect(retract(tx, PARIWAR_A, ghost, MID)).rejects.toBeInstanceOf(BannerNotFoundError);
    expect(created.pariwarId).toBe(PARIWAR_A);
  });

  it('publish: draft→published, sets published_at + persists the tone sign-off', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const draft = await createDraft(tx, draftInput(PARIWAR_A));
    const { row, signoff } = await publish(tx, PARIWAR_A, draft.bannerId, OTHER_ADMIN, MID);

    expect(row.status).toBe('published');
    expect(row.publishedAt?.toISOString()).toBe(MID.toISOString());
    expect(row.toneSignoffReviewedBy).toBe(OTHER_ADMIN);
    expect(row.toneSignoffContentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(signoff.resourceLocator).toBe(`banner:${draft.bannerId}`);
    // The persisted hash IS the sign-off's hash — the binding is real, not decorative.
    expect(row.toneSignoffContentHash).toBe(signoff.contentHash);
  });

  it('publish DENIES when the publisher is the AUTHOR (the gate’s own non-author invariant)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const draft = await createDraft(tx, draftInput(PARIWAR_A));
    await expect(publish(tx, PARIWAR_A, draft.bannerId, AUTHOR, MID)).rejects.toBeInstanceOf(
      ToneReviewRequiredError,
    );
    // Status UNCHANGED — a denied publish writes nothing.
    expect((await getBanner(tx, PARIWAR_A, draft.bannerId))?.status).toBe('draft');
  });

  it('publish requires ALL FOUR copy fields (a missing Hindi field is a 422, not a silent publish)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const draft = await createDraft(tx, draftInput(PARIWAR_A, { bodyHi: null }));
    await expect(publish(tx, PARIWAR_A, draft.bannerId, OTHER_ADMIN, MID)).rejects.toThrow(
      /requires Hindi \+ English copy/i,
    );
    expect((await getBanner(tx, PARIWAR_A, draft.bannerId))?.status).toBe('draft');
  });

  it('rejects an ILLEGAL transition PRE-WRITE (a no-op never becomes a success)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const row = await publishedBanner(tx, PARIWAR_A);
    // Re-publish a published banner → 409 (nextBannerStatus said no).
    await expect(publish(tx, PARIWAR_A, row.bannerId, OTHER_ADMIN, MID)).rejects.toBeInstanceOf(BannerStateError);

    const retracted = await retract(tx, PARIWAR_A, row.bannerId, MID);
    expect(retracted.status).toBe('retracted');
    expect(retracted.retractedAt?.toISOString()).toBe(MID.toISOString());
    // Retracted is terminal — every further action 409s and nothing changes.
    await expect(retract(tx, PARIWAR_A, row.bannerId, MID)).rejects.toBeInstanceOf(BannerStateError);
    await expect(publish(tx, PARIWAR_A, row.bannerId, OTHER_ADMIN, MID)).rejects.toBeInstanceOf(BannerStateError);
    await expect(
      updateBanner(tx, PARIWAR_A, row.bannerId, { severity: 'critical' }, OTHER_ADMIN, MID),
    ).rejects.toBeInstanceOf(BannerStateError);
    expect((await getBanner(tx, PARIWAR_A, row.bannerId))?.severity).toBe('info');
  });

  it('retract is legal from DRAFT too (the discard path)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const draft = await createDraft(tx, draftInput(PARIWAR_A));
    expect((await retract(tx, PARIWAR_A, draft.bannerId, MID)).status).toBe('retracted');
  });
});

describe.skipIf(!hasDatabase)('banners — the structural invariants (AC2, AC4)', () => {
  setupLiveDb();

  it('the DOMAIN rejects an undismissable popup with a typed 422', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await expect(
      createDraft(tx, draftInput(PARIWAR_A, { displayMode: 'popup', dismissible: false })),
    ).rejects.toBeInstanceOf(BannerPopupMustBeDismissibleError);
  });

  it('the DB CHECK rejects an undismissable popup even when the domain guard is bypassed', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    // A RAW insert — exactly what a future write path (or a psql session) could attempt. The
    // `banners_popup_must_be_dismissible` CHECK is the teeth; remove it from 0090 and this passes.
    await expectConstraintViolation(
      tx.insert(bannersTable).values({
        pariwarId: PARIWAR_A,
        title: 't',
        body: 'b',
        titleHi: 'त',
        bodyHi: 'ब',
        audienceScope: 'members-all',
        validFrom: FROM,
        validUntil: UNTIL,
        displayMode: 'popup',
        dismissible: false,
        severity: 'critical',
        status: 'published',
        createdByActorId: AUTHOR,
      }),
      'banners_popup_must_be_dismissible',
    );
  });

  it('a NON-dismissible BANNER is permitted (UX Pattern 9 — a blocking system state)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const row = await createDraft(tx, draftInput(PARIWAR_A, { displayMode: 'banner', dismissible: false }));
    expect(row.dismissible).toBe(false);
  });

  it('the DOMAIN rejects an empty window; the DB CHECK rejects it on a raw write', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await expect(createDraft(tx, draftInput(PARIWAR_A, { validUntil: FROM }))).rejects.toBeInstanceOf(
      BannerWindowInvalidError,
    );
    await expectConstraintViolation(
      tx.insert(bannersTable).values({
        pariwarId: PARIWAR_A,
        audienceScope: 'members-all',
        validFrom: FROM,
        validUntil: BEFORE,
        displayMode: 'banner',
        dismissible: true,
        severity: 'info',
        status: 'draft',
        createdByActorId: AUTHOR,
      }),
      'banners_window_non_empty',
    );
  });

  it('the DB CHECK rejects revision <= 0 on a raw write (revision starts at 1, never 0)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    // A RAW insert with revision=0 — the scenario `banners.revision`'s "never 0" header comment
    // warns about. `banners_revision_positive` mirrors `banner_dismissals_revision_positive`.
    await expectConstraintViolation(
      tx.insert(bannersTable).values({
        pariwarId: PARIWAR_A,
        audienceScope: 'members-all',
        validFrom: FROM,
        validUntil: UNTIL,
        displayMode: 'banner',
        dismissible: true,
        severity: 'info',
        revision: 0,
        status: 'draft',
        createdByActorId: AUTHOR,
      }),
      'banners_revision_positive',
    );
  });

  it('a patch that would CREATE an undismissable popup is rejected on the MERGED row', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    // Starts as a non-dismissible BANNER (legal); flipping only display_mode would make it illegal.
    const draft = await createDraft(tx, draftInput(PARIWAR_A, { displayMode: 'banner', dismissible: false }));
    await expect(
      updateBanner(tx, PARIWAR_A, draft.bannerId, { displayMode: 'popup' }, AUTHOR, MID),
    ).rejects.toBeInstanceOf(BannerPopupMustBeDismissibleError);
  });
});

describe.skipIf(!hasDatabase)('updateBanner — the Decision 5 content-hash branch', () => {
  setupLiveDb();

  it('a WINDOW-ONLY edit on a published banner: no revision bump, no re-review, sign-off intact', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const published = await publishedBanner(tx, PARIWAR_A);
    const hashBefore = published.toneSignoffContentHash;

    // Note the actor is the AUTHOR — a non-copy edit needs no non-author reviewer.
    const { row, revised, signoff } = await updateBanner(
      tx,
      PARIWAR_A,
      published.bannerId,
      { validUntil: new Date('2026-08-20T00:00:00.000Z'), displayOncePerMember: true },
      AUTHOR,
      MID,
    );
    expect(revised).toBe(false);
    expect(signoff).toBeNull();
    expect(row.revision).toBe(1);
    expect(row.toneSignoffContentHash).toBe(hashBefore);
    expect(row.validUntil.toISOString()).toBe('2026-08-20T00:00:00.000Z');
    expect(row.displayOncePerMember).toBe(true);
  });

  it('a COPY edit on a published banner by a NON-author: revision bumped + a FRESH sign-off', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const published = await publishedBanner(tx, PARIWAR_A);
    const hashBefore = published.toneSignoffContentHash;

    const { row, revised, signoff } = await updateBanner(
      tx,
      PARIWAR_A,
      published.bannerId,
      { body: 'The app is unavailable 02:00–04:00 IST.' },
      OTHER_ADMIN,
      MID,
    );
    expect(revised).toBe(true);
    expect(row.revision).toBe(2);
    expect(row.toneSignoffContentHash).not.toBe(hashBefore);
    expect(row.toneSignoffContentHash).toBe(signoff?.contentHash);
    expect(row.toneSignoffReviewedBy).toBe(OTHER_ADMIN);
  });

  it('a COPY edit on a published banner by its OWN AUTHOR is DENIED by the gate (409), nothing written', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const published = await publishedBanner(tx, PARIWAR_A);
    await expect(
      updateBanner(tx, PARIWAR_A, published.bannerId, { title: 'Sneaky retitle' }, AUTHOR, MID),
    ).rejects.toBeInstanceOf(ToneReviewRequiredError);

    const after = await getBanner(tx, PARIWAR_A, published.bannerId);
    expect(after?.title).toBe('Maintenance window');
    expect(after?.revision).toBe(1);
  });

  it('a COPY edit on a DRAFT is free — no review, no bump (a draft has no sign-off and no viewers)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const draft = await createDraft(tx, draftInput(PARIWAR_A));
    const { row, revised } = await updateBanner(
      tx,
      PARIWAR_A,
      draft.bannerId,
      { title: 'Reworded', titleHi: 'नया शीर्षक' },
      AUTHOR,
      MID,
    );
    expect(revised).toBe(false);
    expect(row.revision).toBe(1);
    expect(row.title).toBe('Reworded');
  });

  it('a revision may not BLANK a required copy field (the publish-time rule still binds)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const published = await publishedBanner(tx, PARIWAR_A);
    await expect(
      updateBanner(tx, PARIWAR_A, published.bannerId, { bodyHi: null }, OTHER_ADMIN, MID),
    ).rejects.toThrow(/requires Hindi \+ English copy/i);
  });
});

describe.skipIf(!hasDatabase)('listBannersForPariwar — the DERIVED display-state filter (AC1)', () => {
  setupLiveDb();

  it('filters by each derived state and stays tenant-scoped (membership, not counts)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);

    const draft = await createDraft(tx, draftInput(PARIWAR_A));
    const live = await publishedBanner(tx, PARIWAR_A);
    const future = await publishedBanner(tx, PARIWAR_A, {
      validFrom: new Date('2026-09-10T00:00:00.000Z'),
      validUntil: new Date('2026-09-20T00:00:00.000Z'),
    });
    const past = await publishedBanner(tx, PARIWAR_A, {
      validFrom: new Date('2026-06-01T00:00:00.000Z'),
      validUntil: new Date('2026-06-08T00:00:00.000Z'),
    });
    const pulled = await retract(tx, PARIWAR_A, (await publishedBanner(tx, PARIWAR_A)).bannerId, MID);

    const idsOf = async (displayState: Parameters<typeof listBannersForPariwar>[3] extends undefined ? never : NonNullable<Parameters<typeof listBannersForPariwar>[3]>['displayState']) =>
      (await listBannersForPariwar(tx, PARIWAR_A, MID, { displayState })).map((b) => b.bannerId);

    expect(await idsOf('draft')).toContain(draft.bannerId);
    expect(await idsOf('live')).toContain(live.bannerId);
    expect(await idsOf('live')).not.toContain(future.bannerId);
    expect(await idsOf('scheduled')).toContain(future.bannerId);
    expect(await idsOf('expired')).toContain(past.bannerId);
    expect(await idsOf('retracted')).toContain(pulled.bannerId);
    // An unfiltered list sees them all.
    const all = (await listBannersForPariwar(tx, PARIWAR_A, MID, { limit: 200 })).map((b) => b.bannerId);
    for (const b of [draft, live, future, past, pulled]) expect(all).toContain(b.bannerId);
  });

  it('does not leak another tenant’s banners', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const mine = await createDraft(tx, draftInput(PARIWAR_A));
    const rows = await listBannersForPariwar(tx, PARIWAR_B as PariwarId, MID, { limit: 200 });
    expect(rows.map((b) => b.bannerId)).not.toContain(mine.bannerId);
  });

  it('paginates via limit/offset', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await createDraft(tx, draftInput(PARIWAR_A));
    await createDraft(tx, draftInput(PARIWAR_A));
    const page = await listBannersForPariwar(tx, PARIWAR_A, MID, { displayState: 'draft', limit: 1 });
    expect(page).toHaveLength(1);
  });
});

describe.skipIf(!hasDatabase)('the MEMBER visible-banner read (AC3) — dismissal suppression + cross-member isolation', () => {
  setupLiveDb();

  it('a live, members-all banner is visible to a member who has not dismissed it', async () => {
    const { tx, client } = getTx();
    const memberId = (await seedMember(tx, PARIWAR_A)) as MemberId;
    await enterAppScope(client, PARIWAR_A);
    const live = await publishedBanner(tx, PARIWAR_A);

    const visible = await listVisibleBannersForMember(tx, PARIWAR_A, memberId, MID);
    expect(visible.map((b) => b.bannerId)).toContain(live.bannerId);
  });

  it('the window bounds visibility with NOTHING running (before / after are both empty)', async () => {
    const { tx, client } = getTx();
    const memberId = (await seedMember(tx, PARIWAR_A)) as MemberId;
    await enterAppScope(client, PARIWAR_A);
    const live = await publishedBanner(tx, PARIWAR_A);

    expect((await listVisibleBannersForMember(tx, PARIWAR_A, memberId, BEFORE)).map((b) => b.bannerId)).not.toContain(
      live.bannerId,
    );
    expect((await listVisibleBannersForMember(tx, PARIWAR_A, memberId, AFTER)).map((b) => b.bannerId)).not.toContain(
      live.bannerId,
    );
    // Exactly at valid_from it IS visible; exactly at valid_until it is NOT (the pinned conventions).
    expect((await listVisibleBannersForMember(tx, PARIWAR_A, memberId, FROM)).map((b) => b.bannerId)).toContain(
      live.bannerId,
    );
    expect((await listVisibleBannersForMember(tx, PARIWAR_A, memberId, UNTIL)).map((b) => b.bannerId)).not.toContain(
      live.bannerId,
    );
  });

  it('a draft and a retracted banner are never member-visible even mid-window', async () => {
    const { tx, client } = getTx();
    const memberId = (await seedMember(tx, PARIWAR_A)) as MemberId;
    await enterAppScope(client, PARIWAR_A);
    const draft = await createDraft(tx, draftInput(PARIWAR_A));
    const pulled = await retract(tx, PARIWAR_A, (await publishedBanner(tx, PARIWAR_A)).bannerId, MID);

    const ids = (await listVisibleBannersForMember(tx, PARIWAR_A, memberId, MID)).map((b) => b.bannerId);
    expect(ids).not.toContain(draft.bannerId);
    expect(ids).not.toContain(pulled.bannerId);
  });

  it('a dismissal suppresses the banner for THAT member and NOBODY ELSE (the LEFT-JOIN correlation)', async () => {
    const { tx, client } = getTx();
    const alice = (await seedMember(tx, PARIWAR_A)) as MemberId;
    const bob = (await seedMember(tx, PARIWAR_A)) as MemberId;
    await enterAppScope(client, PARIWAR_A);
    const live = await publishedBanner(tx, PARIWAR_A);

    await recordDismissal(tx, {
      pariwarId: PARIWAR_A,
      bannerId: live.bannerId,
      memberId: alice,
      kind: 'dismissed',
      now: MID,
    });

    const aliceSees = (await listVisibleBannersForMember(tx, PARIWAR_A, alice, MID)).map((b) => b.bannerId);
    const bobSees = (await listVisibleBannersForMember(tx, PARIWAR_A, bob, MID)).map((b) => b.bannerId);
    expect(aliceSees).not.toContain(live.bannerId);
    expect(bobSees).toContain(live.bannerId);
  });

  it('a COPY REVISION re-surfaces the banner for a member who had dismissed the prior revision', async () => {
    const { tx, client } = getTx();
    const alice = (await seedMember(tx, PARIWAR_A)) as MemberId;
    await enterAppScope(client, PARIWAR_A);
    const live = await publishedBanner(tx, PARIWAR_A);

    await recordDismissal(tx, {
      pariwarId: PARIWAR_A,
      bannerId: live.bannerId,
      memberId: alice,
      kind: 'dismissed',
      now: MID,
    });
    expect((await listVisibleBannersForMember(tx, PARIWAR_A, alice, MID)).map((b) => b.bannerId)).not.toContain(
      live.bannerId,
    );

    // A pure WINDOW extension must NOT bring it back…
    await updateBanner(tx, PARIWAR_A, live.bannerId, { validUntil: AFTER }, AUTHOR, MID);
    expect((await listVisibleBannersForMember(tx, PARIWAR_A, alice, MID)).map((b) => b.bannerId)).not.toContain(
      live.bannerId,
    );

    // …but a COPY revision must.
    const { row } = await updateBanner(tx, PARIWAR_A, live.bannerId, { body: 'Now 02:00–05:00 IST.' }, OTHER_ADMIN, MID);
    expect(row.revision).toBe(2);
    expect((await listVisibleBannersForMember(tx, PARIWAR_A, alice, MID)).map((b) => b.bannerId)).toContain(
      live.bannerId,
    );
  });

  it('recordDismissal is IDEMPOTENT — a replay is a clean no-op, one row, monotone revision', async () => {
    const { tx, client } = getTx();
    const alice = (await seedMember(tx, PARIWAR_A)) as MemberId;
    await enterAppScope(client, PARIWAR_A);
    const live = await publishedBanner(tx, PARIWAR_A);
    const args = { pariwarId: PARIWAR_A, bannerId: live.bannerId, memberId: alice, now: MID };

    const first = await recordDismissal(tx, { ...args, kind: 'dismissed' });
    const replay = await recordDismissal(tx, { ...args, kind: 'dismissed' });
    expect(replay.dismissedRevision).toBe(first.dismissedRevision);
    expect(await getDismissal(tx, PARIWAR_A, live.bannerId, alice)).not.toBeNull();

    // After a revision, the SAME upsert advances the recorded revision…
    await updateBanner(tx, PARIWAR_A, live.bannerId, { body: 'Revised.' }, OTHER_ADMIN, MID);
    const advanced = await recordDismissal(tx, { ...args, kind: 'dismissed' });
    expect(advanced.dismissedRevision).toBe(2);
    expect((await listVisibleBannersForMember(tx, PARIWAR_A, alice, MID)).map((b) => b.bannerId)).not.toContain(
      live.bannerId,
    );
  });

  it('records `shown` for a display-once banner and suppresses it identically', async () => {
    const { tx, client } = getTx();
    const alice = (await seedMember(tx, PARIWAR_A)) as MemberId;
    await enterAppScope(client, PARIWAR_A);
    const live = await publishedBanner(tx, PARIWAR_A, {
      displayMode: 'popup',
      dismissible: true,
      displayOncePerMember: true,
    });

    const row = await recordDismissal(tx, {
      pariwarId: PARIWAR_A,
      bannerId: live.bannerId,
      memberId: alice,
      kind: 'shown',
      now: MID,
    });
    expect(row.dismissalKind).toBe('shown');
    expect((await listVisibleBannersForMember(tx, PARIWAR_A, alice, MID)).map((b) => b.bannerId)).not.toContain(
      live.bannerId,
    );
  });

  it('a dismiss for a banner that does not exist in this tenant is a 404, not a phantom row', async () => {
    const { tx, client } = getTx();
    const alice = (await seedMember(tx, PARIWAR_A)) as MemberId;
    await enterAppScope(client, PARIWAR_A);
    await expect(
      recordDismissal(tx, {
        pariwarId: PARIWAR_A,
        bannerId: toBannerId('99999999-9999-4999-8999-999999999999'),
        memberId: alice,
        kind: 'dismissed',
        now: MID,
      }),
    ).rejects.toBeInstanceOf(BannerNotFoundError);
  });
});

// The CANDIDATE set is where this package's responsibility ends: precedence lives in
// `@twt/contracts` (one implementation, shared with the admin console — see read.ts's header), and
// the end-to-end resolved pair is asserted in the apps/api E2E spec. What is pinned here is the
// AUDIENCE predicate's effect on the candidate set (Decision 4), which is domain-owned.
describe.skipIf(!hasDatabase)('listMemberBannerCandidates — the audience predicate (Decision 4)', () => {
  setupLiveDb();

  it('returns every eligible live banner across BOTH display modes (precedence is applied above)', async () => {
    const { tx, client } = getTx();
    const alice = (await seedMember(tx, PARIWAR_A)) as MemberId;
    await enterAppScope(client, PARIWAR_A);

    const infoStrip = await publishedBanner(tx, PARIWAR_A, { severity: 'info', displayMode: 'banner' });
    const criticalStrip = await publishedBanner(tx, PARIWAR_A, { severity: 'critical', displayMode: 'banner' });
    const criticalModal = await publishedBanner(tx, PARIWAR_A, {
      severity: 'critical',
      displayMode: 'popup',
      dismissible: true,
    });

    const ids = (await listMemberBannerCandidates(tx, PARIWAR_A, alice, MID, { info: () => {} })).map(
      (b) => b.bannerId,
    );
    for (const b of [infoStrip, criticalStrip, criticalModal]) expect(ids).toContain(b.bannerId);
  });

  it('a `public`-audience banner IS a candidate for a member (the 10.9 polarity, inverted from 10.5)', async () => {
    const { tx, client } = getTx();
    const alice = (await seedMember(tx, PARIWAR_A)) as MemberId;
    await enterAppScope(client, PARIWAR_A);
    const pub = await publishedBanner(tx, PARIWAR_A, { audienceScope: 'public' });
    const ids = (await listMemberBannerCandidates(tx, PARIWAR_A, alice, MID, { info: () => {} })).map(
      (b) => b.bannerId,
    );
    expect(ids).toContain(pub.bannerId);
  });

  // ⭐ THE END-TO-END GEO CASE (Story 1.19 AC3). Two members in DIFFERENT districts under ONE tree,
  // one `state` banner — EXACTLY ONE of them sees it. This is the minimum shape that distinguishes a
  // working geo lift from "the arm returns true for everyone" AND from "the arm is still unwired".
  it('a `state`-audience banner reaches the member IN that state, and only them', async () => {
    const { tx, client } = getTx();
    const inPatna = (await seedMember(tx, PARIWAR_A)) as MemberId;
    const inLucknow = (await seedMember(tx, PARIWAR_A)) as MemberId;
    await seedMemberPosting(tx, PARIWAR_A, inPatna, 'Patna', { createdAt: POSTED });
    await seedMemberPosting(tx, PARIWAR_A, inLucknow, 'Lucknow', { createdAt: POSTED });
    await enterAppScope(client, PARIWAR_A);
    await createGeoTreeVersion(tx, { pariwarId: PARIWAR_A, nodes: GEO_TREE, effectiveAt: BEFORE });
    const tree = await loadGeoTree(tx, PARIWAR_A, MID);

    const biharBanner = await publishedBanner(tx, PARIWAR_A, {
      audienceScope: 'state',
      audienceScopeValue: 'Bihar',
    });

    const seenBy = async (m: MemberId) =>
      (await listMemberBannerCandidates(tx, PARIWAR_A, m, MID, { info: () => {} }, tree)).map(
        (b) => b.bannerId,
      );

    expect(await seenBy(inPatna)).toContain(biharBanner.bannerId);
    expect(await seenBy(inLucknow)).not.toContain(biharBanner.bannerId);

    // …and the raw window/dismissal read sees it for BOTH — proving the split is the audience
    // predicate's doing, not an accidental window or suppression miss.
    for (const m of [inPatna, inLucknow]) {
      expect((await listVisibleBannersForMember(tx, PARIWAR_A, m, MID)).map((b) => b.bannerId)).toContain(
        biharBanner.bannerId,
      );
    }
  });

  // ⛔ FAIL-CLOSED — the member with no geo is in NO state audience, never in all of them.
  it('a member with NO posting row does NOT see a `state` banner', async () => {
    const { tx, client } = getTx();
    const nowhere = (await seedMember(tx, PARIWAR_A)) as MemberId;
    await enterAppScope(client, PARIWAR_A);
    await createGeoTreeVersion(tx, { pariwarId: PARIWAR_A, nodes: GEO_TREE, effectiveAt: BEFORE });
    const tree = await loadGeoTree(tx, PARIWAR_A, MID);

    const biharBanner = await publishedBanner(tx, PARIWAR_A, {
      audienceScope: 'state',
      audienceScopeValue: 'Bihar',
    });
    const ids = (
      await listMemberBannerCandidates(tx, PARIWAR_A, nowhere, MID, { info: () => {} }, tree)
    ).map((b) => b.bannerId);
    expect(ids).not.toContain(biharBanner.bannerId);
  });

  // AC2: no tree ⇒ the arm denies EXACTLY as it did before this story. This is what makes the
  // change safe to land for every Pariwar that has published nothing.
  it('with NO published tree, a `state` banner is visible to nobody — today’s behaviour', async () => {
    const { tx, client } = getTx();
    const inPatna = (await seedMember(tx, PARIWAR_A)) as MemberId;
    await seedMemberPosting(tx, PARIWAR_A, inPatna, 'Patna', { createdAt: POSTED });
    await enterAppScope(client, PARIWAR_A);
    const tree = await loadGeoTree(tx, PARIWAR_A, MID);
    expect(tree).toBeNull(); // the REASON, asserted rather than assumed

    const biharBanner = await publishedBanner(tx, PARIWAR_A, {
      audienceScope: 'state',
      audienceScopeValue: 'Bihar',
    });
    const ids = (
      await listMemberBannerCandidates(tx, PARIWAR_A, inPatna, MID, { info: () => {} }, tree)
    ).map((b) => b.bannerId);
    expect(ids).not.toContain(biharBanner.bannerId);
  });

  // ⛔ `role`/`cohort` are NOT the same case as `state` — asserted PER ARM. A fully-resolved member
  // geo changes nothing for them, because there is no attribute to resolve against at all.
  it('a `cohort`-audience banner is a candidate for NOBODY — even with geo fully resolved', async () => {
    const { tx, client } = getTx();
    const alice = (await seedMember(tx, PARIWAR_A)) as MemberId;
    await seedMemberPosting(tx, PARIWAR_A, alice, 'Patna', { createdAt: POSTED });
    await enterAppScope(client, PARIWAR_A);
    await createGeoTreeVersion(tx, { pariwarId: PARIWAR_A, nodes: GEO_TREE, effectiveAt: BEFORE });
    const tree = await loadGeoTree(tx, PARIWAR_A, MID);

    const seamOnly = await publishedBanner(tx, PARIWAR_A, {
      audienceScope: 'cohort',
      audienceScopeValue: 'lock-in-2026',
    });
    // Alice's geo resolves FULLY here (Patna ∈ Bihar) and it still makes no difference — there is
    // no member `cohort` attribute at any layer for the predicate to consult.
    const ids = (
      await listMemberBannerCandidates(tx, PARIWAR_A, alice, MID, { info: () => {} }, tree)
    ).map((b) => b.bannerId);
    expect(ids).not.toContain(seamOnly.bannerId);
    // …but the raw window/dismissal read DOES see it — proving the exclusion is the audience
    // predicate's doing, not an accidental window or suppression miss.
    expect((await listVisibleBannersForMember(tx, PARIWAR_A, alice, MID)).map((b) => b.bannerId)).toContain(
      seamOnly.bannerId,
    );
  });

  it('listLiveBannersForPariwar feeds the admin visibility verdict with the live set only', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const live = await publishedBanner(tx, PARIWAR_A);
    const draft = await createDraft(tx, draftInput(PARIWAR_A));
    const ids = (await listLiveBannersForPariwar(tx, PARIWAR_A, MID)).map((b) => b.bannerId);
    expect(ids).toContain(live.bannerId);
    expect(ids).not.toContain(draft.bannerId);
  });
});
