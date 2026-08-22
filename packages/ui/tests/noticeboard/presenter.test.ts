// The `<NoticeboardStrip>` load-bearing gate — Story 11a.5 (Task 2; AC1/AC2/AC5/AC6). DB-free, mock-free,
// render-free (the presenter is `(input, now) → view-model` and nothing else — the 9.6/9.12 precedent).
// [[feedback_gate_scope_semantic_coverage]]: this is MEANINGFUL coverage of the rules the story exists to
// pin, not a green scan. It asserts:
//   (a) SECTION ORDER is the presenter's property, in the ratified anatomy order (AC1);
//   (b) ALL FOUR ratified states are reachable AND pairwise distinct (`default`/`loading`/`empty`/
//       `refreshing`), with `loading` carrying the ratified skeleton anatomy — not a blank, not a spinner;
//   (c) ⭐ the pinned-EMPTY case yields a COPY KEY while a NO-PRODUCER section yields SILENCE — asserted as
//       NOT equal, because merging them is the exact failure AC1 splits them to prevent;
//   (d) ⭐ ANTI-WIDENING — the INPUT surface has EXACTLY three keys and admits NO banner list (Trap 2/AC2);
//   (e) the ROW DESCRIPTOR carries EXACTLY the reconciled field set — no `severity`, no `link CTA`, no
//       speculative field (AC6);
//   (f) ⭐ the TIER FILTER over 10.9's `audience_scope` vocabulary, including FAIL-CLOSED on an unknown
//       audience and on the `role`/`cohort` un-targetable seam (AC5); and
//   (g) the injected-`now` window boundary, EXCLUSIVE at `validUntil` (the 10.9 convention).

import { describe, expect, it } from 'vitest';

import {
  NOTICEBOARD_LOADING_SKELETON_ROWS,
  NOTICEBOARD_MASTHEAD_TITLE_KEY,
  NOTICEBOARD_NEXT_MEETING_HEADER_KEY,
  NOTICEBOARD_PINNED_EMPTY_KEY,
  NOTICEBOARD_PINNED_HEADER_KEY,
  NOTICEBOARD_RECENT_CLOSINGS_HEADER_KEY,
  deriveNoticeboardViewModel,
} from '../../src/noticeboard/index.js';
import type {
  NoticeboardBannerNoticeInput,
  NoticeboardRowDescriptor,
  NoticeboardSection,
  NoticeboardSectionId,
  NoticeboardSkeleton,
  NoticeboardStripInput,
  NoticeboardStripViewModel,
  NoticeboardViewer,
} from '../../src/noticeboard/index.js';

const NOW = new Date('2026-08-22T10:00:00.000Z');
const MEMBER: NoticeboardViewer = { isAuthenticated: true };
const SIGNED_OUT: NoticeboardViewer = { isAuthenticated: false };

function banner(
  over: Partial<NoticeboardBannerNoticeInput> = {},
): NoticeboardBannerNoticeInput {
  return {
    id: 'banner-1',
    title: 'रखरखाव अवधि',
    body: 'ऐप 02:00–03:00 IST तक उपलब्ध नहीं रहेगा।',
    severity: 'info',
    dismissible: true,
    audience: 'members-all',
    validUntil: new Date('2026-08-23T00:00:00.000Z'),
    ...over,
  };
}

function input(over: Partial<NoticeboardStripInput> = {}): NoticeboardStripInput {
  return { status: 'ready', viewer: MEMBER, bannerNotice: banner(), ...over };
}

const sectionById = (vm: NoticeboardStripViewModel, id: NoticeboardSectionId): NoticeboardSection => {
  const found = vm.sections.find((s) => s.id === id);
  if (!found) throw new Error(`section '${id}' is missing from the view-model`);
  return found;
};

describe('section order is a property of the PRESENTER, never of a screen JSX ordering (AC1)', () => {
  it('emits the six ratified sections in the UX `:1806` / `:491` anatomy order', () => {
    const vm = deriveNoticeboardViewModel(input(), NOW);
    expect(vm.sections.map((s) => s.id)).toEqual([
      'masthead',
      'stats',
      'pinned',
      'polls',
      'recent-closings',
      'next-meeting',
    ]);
  });

  it('keeps that order across EVERY load status — order is anatomy, not a function of content', () => {
    for (const status of ['ready', 'loading', 'refreshing'] as const) {
      const vm = deriveNoticeboardViewModel(input({ status }), NOW);
      expect(vm.sections.map((s) => s.id)).toEqual([
        'masthead',
        'stats',
        'pinned',
        'polls',
        'recent-closings',
        'next-meeting',
      ]);
    }
  });

  it('carries the header KEY (never resolved copy) for each section the anatomy gives a header', () => {
    const vm = deriveNoticeboardViewModel(input(), NOW);
    expect(sectionById(vm, 'masthead').headerKey).toBe(NOTICEBOARD_MASTHEAD_TITLE_KEY);
    expect(sectionById(vm, 'pinned').headerKey).toBe(NOTICEBOARD_PINNED_HEADER_KEY);
    expect(sectionById(vm, 'recent-closings').headerKey).toBe(NOTICEBOARD_RECENT_CLOSINGS_HEADER_KEY);
    expect(sectionById(vm, 'next-meeting').headerKey).toBe(NOTICEBOARD_NEXT_MEETING_HEADER_KEY);
    // The two sections the ratified anatomy gives NO header.
    expect(sectionById(vm, 'stats').headerKey).toBeNull();
    expect(sectionById(vm, 'polls').headerKey).toBeNull();
  });

  it('leaves `<PollsEntry>` DELEGATED — Story 10.15 owns its content and its own emptiness', () => {
    // The presenter owns the polls section's POSITION and nothing else: an ADDITION to the noticeboard,
    // never a restructuring of it. If this ever became `rows`/`silent`, 10.15's behaviour would have moved.
    for (const status of ['ready', 'loading', 'refreshing'] as const) {
      expect(sectionById(deriveNoticeboardViewModel(input({ status }), NOW), 'polls').render).toEqual({
        kind: 'delegated',
      });
    }
  });
});

describe('ALL FOUR ratified states are reachable and DISTINCT (UX `:1808`, AC1)', () => {
  it('`default` — a read that completed with at least one row', () => {
    expect(deriveNoticeboardViewModel(input(), NOW).state).toBe('default');
  });

  it('`empty` — a read that completed with nothing to show', () => {
    expect(deriveNoticeboardViewModel(input({ bannerNotice: null }), NOW).state).toBe('empty');
  });

  it('`loading` — a REAL state carrying the ratified skeleton anatomy, NOT a blank and NOT a spinner', () => {
    const vm = deriveNoticeboardViewModel(input({ status: 'loading' }), NOW);
    expect(vm.state).toBe('loading');
    // "top + first 2 notices skeleton": the masthead section is present as chrome…
    expect(sectionById(vm, 'masthead').render).toEqual({ kind: 'chrome' });
    // …and the skeleton row count is declared by the presenter, never invented by a screen.
    expect(vm.skeleton).toEqual<NoticeboardSkeleton>({ noticeRows: NOTICEBOARD_LOADING_SKELETON_ROWS });
    expect(NOTICEBOARD_LOADING_SKELETON_ROWS).toBe(2);
  });

  it('`refreshing` is DISTINCT from `loading` — content is on screen and STAYS there', () => {
    const refreshing = deriveNoticeboardViewModel(input({ status: 'refreshing' }), NOW);
    const loading = deriveNoticeboardViewModel(input({ status: 'loading' }), NOW);
    expect(refreshing.state).toBe('refreshing');
    expect(refreshing.state).not.toBe(loading.state);
    // The content difference, not just the label: refreshing keeps the row, loading has no rows yet.
    expect(sectionById(refreshing, 'pinned').render).toEqual({
      kind: 'rows',
      rows: [expect.objectContaining({ id: 'banner-1' })],
    });
    expect(sectionById(loading, 'pinned').render).toEqual({ kind: 'silent' });
    expect(refreshing.skeleton).toBeNull();
  });

  it('carries a skeleton IFF the state is `loading`', () => {
    for (const status of ['ready', 'refreshing'] as const) {
      expect(deriveNoticeboardViewModel(input({ status }), NOW).skeleton).toBeNull();
    }
  });

  it('⛔ does NOT assert the ratified empty copy while the first read is still in flight', () => {
    // Saying "No pinned notices" during `loading` would tell a member the Pariwar has pinned nothing when
    // the truth is that we have not looked yet.
    const loading = deriveNoticeboardViewModel(input({ bannerNotice: null, status: 'loading' }), NOW);
    expect(loading.state).toBe('loading');
    expect(sectionById(loading, 'pinned').render).toEqual({ kind: 'silent' });
  });

  it('the four states are pairwise distinct labels', () => {
    const states = [
      deriveNoticeboardViewModel(input(), NOW).state,
      deriveNoticeboardViewModel(input({ bannerNotice: null }), NOW).state,
      deriveNoticeboardViewModel(input({ status: 'loading' }), NOW).state,
      deriveNoticeboardViewModel(input({ status: 'refreshing' }), NOW).state,
    ];
    expect(new Set(states).size).toBe(4);
  });
});

describe('⭐ EMPTY-WITH-COPY vs SILENT — two different cases that must never be merged (AC1)', () => {
  it('the pinned section, whose source is REAL and empty, yields the RATIFIED COPY KEY', () => {
    const vm = deriveNoticeboardViewModel(input({ bannerNotice: null }), NOW);
    expect(sectionById(vm, 'pinned').render).toEqual({
      kind: 'empty-with-copy',
      copyKey: NOTICEBOARD_PINNED_EMPTY_KEY,
    });
  });

  it('sections with NO PRODUCER yield SILENCE — and never borrow the pinned section copy (AC4)', () => {
    const vm = deriveNoticeboardViewModel(input({ bannerNotice: null }), NOW);
    for (const id of ['stats', 'recent-closings', 'next-meeting'] as const) {
      expect(sectionById(vm, id).render).toEqual({ kind: 'silent' });
    }
  });

  it('⛔ the two are NOT assert-equal — "the Pariwar pinned nothing" ≠ "no read model was built"', () => {
    const vm = deriveNoticeboardViewModel(input({ bannerNotice: null }), NOW);
    const pinned = sectionById(vm, 'pinned').render;
    const noProducer = sectionById(vm, 'recent-closings').render;
    expect(pinned).not.toEqual(noProducer);
    expect(pinned.kind).not.toBe(noProducer.kind);
    // The copy key exists on exactly one of them.
    expect('copyKey' in pinned).toBe(true);
    expect('copyKey' in noProducer).toBe(false);
  });

  it('the no-producer sections stay silent even when the banner lane HAS content', () => {
    // A populated pinned section must not make an unbuilt read model look populated.
    const vm = deriveNoticeboardViewModel(input(), NOW);
    expect(sectionById(vm, 'recent-closings').render).toEqual({ kind: 'silent' });
    expect(sectionById(vm, 'stats').render).toEqual({ kind: 'silent' });
  });
});

describe('⭐ ANTI-WIDENING — the banner lane is singular BY SHAPE (Trap 2 / AC2)', () => {
  // The compile-half teeth (the Story 9.12 Task-3b precedent): an exhaustive key map over
  // `keyof NoticeboardStripInput`. Adding a `bannerNotices` / `banners` / `notices` ARRAY field to the input
  // breaks this literal (an excess key), and removing a real key breaks it (a missing key). Widening the
  // 10.9 member read to return a list is the single most damaging change this story could make — it would
  // break FR-58B, Decision 3, the total comparator and the shuffled-input determinism test — so the input
  // is shaped to make it impossible to do by accident.
  const INPUT_KEYS: Record<keyof NoticeboardStripInput, true> = {
    status: true,
    viewer: true,
    bannerNotice: true,
  };

  const BANNER_NOTICE_KEYS: Record<keyof NoticeboardBannerNoticeInput, true> = {
    id: true,
    title: true,
    body: true,
    severity: true,
    dismissible: true,
    audience: true,
    validUntil: true,
  };

  it('the INPUT has EXACTLY three keys, and NONE of them is a banner LIST', () => {
    expect(Object.keys(INPUT_KEYS).sort()).toEqual(['bannerNotice', 'status', 'viewer']);
    for (const key of Object.keys(INPUT_KEYS)) {
      expect(/notices$|banners$|list$|items$/i.test(key)).toBe(false);
    }
  });

  it('the banner slot is a SINGLE object or null — never an array', () => {
    const withBanner = input();
    expect(Array.isArray(withBanner.bannerNotice)).toBe(false);
    expect(input({ bannerNotice: null }).bannerNotice).toBeNull();
    expect(Object.keys(BANNER_NOTICE_KEYS).length).toBe(7);
  });

  it('the banner lane can contribute AT MOST ONE row to the pinned section', () => {
    const render = sectionById(deriveNoticeboardViewModel(input(), NOW), 'pinned').render;
    expect(render.kind).toBe('rows');
    if (render.kind !== 'rows') throw new Error('unreachable');
    expect(render.rows).toHaveLength(1);
  });

  it('re-derives NO precedence — the input carries no ordering operand at all', () => {
    // There is nothing to order WITHIN the banner source (it is one row), and nothing in the input names a
    // severity order, a valid_from, or a banner_id tiebreak — the three keys of 10.9's total comparator.
    for (const key of Object.keys(BANNER_NOTICE_KEYS)) {
      expect(/^validFrom$|order|precedence|rank/i.test(key)).toBe(false);
    }
  });
});

describe('⭐ the ROW DESCRIPTOR is exactly the reconciled field set (AC6)', () => {
  // Epic 11a.5 AC names: title · body · severity · dismissible · link CTA.
  // ux-design-specification.md:1817 names: 4pt colored left-stub · title · meta line.
  // The reconciliation is stated in the type's doc comment and pinned here.
  const ROW_KEYS: Record<keyof NoticeboardRowDescriptor, true> = {
    id: true,
    category: true,
    title: true,
    meta: true,
    dismissible: true,
  };

  const row = (): NoticeboardRowDescriptor => {
    const render = sectionById(deriveNoticeboardViewModel(input(), NOW), 'pinned').render;
    if (render.kind !== 'rows') throw new Error('expected rows');
    return render.rows[0]!;
  };

  it('emits EXACTLY the five reconciled fields at runtime', () => {
    expect(Object.keys(row()).sort()).toEqual(Object.keys(ROW_KEYS).sort());
  });

  it('⛔ carries NO `severity` — D2(a) maps it INTO `category`, it is not a second axis', () => {
    expect('severity' in row()).toBe(false);
  });

  it('⛔ carries NO link CTA — §1817 has no CTA slot and nothing renders one; it is ROUTED', () => {
    const r = row() as unknown as Record<string, unknown>;
    for (const speculative of ['cta', 'ctaKey', 'href', 'link', 'linkHref', 'body']) {
      expect(speculative in r).toBe(false);
    }
  });

  it('reconciles the epic `body` and §1817 `meta line` as ONE field, `meta`', () => {
    expect(row().meta).toBe('ऐप 02:00–03:00 IST तक उपलब्ध नहीं रहेगा।');
    // …and a banner with no body yields a row with no meta line, not an empty string.
    const noBody = deriveNoticeboardViewModel(input({ bannerNotice: banner({ body: null }) }), NOW);
    const render = sectionById(noBody, 'pinned').render;
    if (render.kind !== 'rows') throw new Error('expected rows');
    expect(render.rows[0]!.meta).toBeNull();
  });

  it('`dismissible` is a FLAG and nothing else — no mutation, no handler, no ack path', () => {
    expect(row().dismissible).toBe(true);
    const notDismissible = deriveNoticeboardViewModel(
      input({ bannerNotice: banner({ dismissible: false }) }),
      NOW,
    );
    const render = sectionById(notDismissible, 'pinned').render;
    if (render.kind !== 'rows') throw new Error('expected rows');
    expect(render.rows[0]!.dismissible).toBe(false);
    // The descriptor exposes no way to ACT on it — that is Story 11a.6's.
    expect(Object.keys(row()).some((k) => /dismiss/i.test(k) && k !== 'dismissible')).toBe(false);
  });

  it('emits the D2(a) §1819 category vocabulary — ⛔ `saffron` is DEAD', () => {
    expect(['terracotta', 'green', 'black', 'ink']).toContain(row().category);
    expect(JSON.stringify(row())).not.toContain('saffron');
  });

  it('maps EVERY 10.9 severity into a category — no severity yields an unstyled row', () => {
    for (const severity of ['info', 'warning', 'critical'] as const) {
      const vm = deriveNoticeboardViewModel(input({ bannerNotice: banner({ severity }) }), NOW);
      const render = sectionById(vm, 'pinned').render;
      if (render.kind !== 'rows') throw new Error('expected rows');
      expect(['terracotta', 'green', 'black', 'ink']).toContain(render.rows[0]!.category);
    }
  });

  it('carries operator-authored copy as DATA, never a catalog key', () => {
    // Notice CONTENT is not catalog copy (AC3) — the title is the operator's string, verbatim.
    expect(row().title).toBe('रखरखाव अवधि');
  });
});

describe('⭐ the TIER FILTER — a pure predicate over 10.9 `audience_scope`, FAIL-CLOSED (AC5)', () => {
  const pinnedRowCount = (i: NoticeboardStripInput): number => {
    const render = sectionById(deriveNoticeboardViewModel(i, NOW), 'pinned').render;
    return render.kind === 'rows' ? render.rows.length : 0;
  };

  it('a `public` notice is visible to a signed-out visitor AND to a member', () => {
    expect(pinnedRowCount(input({ viewer: SIGNED_OUT, bannerNotice: banner({ audience: 'public' }) }))).toBe(1);
    expect(pinnedRowCount(input({ viewer: MEMBER, bannerNotice: banner({ audience: 'public' }) }))).toBe(1);
  });

  it('`members-all` and `state` are visible to a member and HIDDEN from a signed-out visitor', () => {
    for (const audience of ['members-all', 'state'] as const) {
      expect(pinnedRowCount(input({ viewer: MEMBER, bannerNotice: banner({ audience }) }))).toBe(1);
      expect(pinnedRowCount(input({ viewer: SIGNED_OUT, bannerNotice: banner({ audience }) }))).toBe(0);
    }
  });

  it('⛔ FAILS CLOSED on the `role` / `cohort` un-targetable seam — hidden from EVERYONE', () => {
    // `enums.ts:52-55`: there is no member `role` or `cohort` attribute at any layer and no story owns one.
    // A notice aimed at an audience nothing can resolve is shown to no one, never to all.
    for (const audience of ['role', 'cohort'] as const) {
      expect(pinnedRowCount(input({ viewer: MEMBER, bannerNotice: banner({ audience }) }))).toBe(0);
      expect(pinnedRowCount(input({ viewer: SIGNED_OUT, bannerNotice: banner({ audience }) }))).toBe(0);
    }
  });

  it('⛔ FAILS CLOSED on an UNKNOWN audience — never "visible to all"', () => {
    for (const audience of ['', 'everyone', 'all', 'MEMBERS-ALL', 'district', 'public ', 'null']) {
      expect(
        pinnedRowCount(input({ viewer: MEMBER, bannerNotice: banner({ audience }) })),
        `audience '${audience}' must fail closed`,
      ).toBe(0);
    }
  });

  it('a filtered-out notice leaves the section EMPTY-WITH-COPY, not silent', () => {
    // The source is real and did produce something; this viewer is just not in its audience. That is the
    // "the Pariwar has pinned nothing FOR YOU" case, which is information — not the no-producer case.
    const vm = deriveNoticeboardViewModel(
      input({ viewer: SIGNED_OUT, bannerNotice: banner({ audience: 'members-all' }) }),
      NOW,
    );
    expect(vm.state).toBe('empty');
    expect(sectionById(vm, 'pinned').render).toEqual({
      kind: 'empty-with-copy',
      copyKey: NOTICEBOARD_PINNED_EMPTY_KEY,
    });
  });

  it('⛔ does NOT re-resolve geography — `state` is judged on the tier axis only', () => {
    // The member read (Story 1.19) already compared the member's `member_postings` district against the
    // banner's `audience_scope_value`. There is no district/geo operand in this input at all, so this
    // presenter structurally cannot second-guess that resolution.
    const keys = Object.keys(input({ bannerNotice: banner({ audience: 'state' }) }).bannerNotice!);
    expect(keys.some((k) => /district|state_value|scopeValue|geo|posting/i.test(k))).toBe(false);
  });
});

describe('the injected `now` — EXCLUSIVE at `validUntil` (the 10.9 boundary convention)', () => {
  const until = new Date('2026-08-23T00:00:00.000Z');
  const at = (now: Date): number => {
    const render = sectionById(
      deriveNoticeboardViewModel(input({ bannerNotice: banner({ validUntil: until }) }), now),
      'pinned',
    ).render;
    return render.kind === 'rows' ? render.rows.length : 0;
  };

  it('renders one millisecond BEFORE `validUntil`', () => {
    expect(at(new Date(until.getTime() - 1))).toBe(1);
  });

  it('⛔ is already expired AT exactly `validUntil` (`valid_until` is EXCLUSIVE)', () => {
    expect(at(until)).toBe(0);
  });

  it('is expired after `validUntil`', () => {
    expect(at(new Date(until.getTime() + 1))).toBe(0);
  });

  it('is PURE — the same `(input, now)` yields a deeply equal view-model every time', () => {
    expect(deriveNoticeboardViewModel(input(), NOW)).toEqual(deriveNoticeboardViewModel(input(), NOW));
  });

  it('reads `now` from the ARGUMENT, not the clock — a fixed past `now` still renders', () => {
    // If the module reached for `new Date()` internally this would go empty, since `until` is in 2026 but
    // the assertion below pins behaviour at an arbitrary injected instant unrelated to the test runtime.
    expect(at(new Date('2020-01-01T00:00:00.000Z'))).toBe(1);
  });
});
