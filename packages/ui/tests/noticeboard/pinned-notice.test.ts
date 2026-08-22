// The `<PinnedNotice>` row gate — Story 11a.6 (Task 2; AC2/AC4/AC5/AC6). DB-free, mock-free, render-free
// (the row presenter is `input → view-model` and nothing else — the 11a.5 `presenter.test.ts` register).
//
// [[feedback_gate_scope_semantic_coverage]]: this is MEANINGFUL coverage of the rules the story exists to
// pin, not a green scan. It asserts:
//   (a) ⭐ THE AC5 SHAPE PROOF — the row presenter's input surface admits NO viewer / audience /
//       authentication / tier key. A descriptor only reaches the row AFTER `isVisibleToViewer` has passed
//       it, so a row-level filter could only ever DISAGREE with the strip presenter. The `presenter.test.ts`
//       anti-widening precedent, applied to the second presenter in the module.
//   (b) BOTH ratified states (`default` / `dismissed`, UX `:1818`) are reachable AND distinct, and the
//       `dismissed` state is ANNOUNCED — not carried by emphasis alone.
//   (c) the dismiss affordance is a PRESENTER PROPERTY: absent when `dismissible: false` (a legal,
//       reachable case — `packages/domain/src/banners/errors.ts:84-86`) AND absent once acknowledged, so
//       it cannot be double-fired.
//   (d) ⭐ THE LABEL IS COMPOSED FROM NON-EMPTY PARTS — the routed empty-title defect (code review of
//       story-11a.5, item 4) closes HERE, in the pure layer: no leading separator, no empty part, and
//       ⛔ never by tightening `toNoticeboardBannerNotice`'s guard (that adapter belongs to the banner
//       lane; the label defect belongs to the row).
//   (e) UX `:1820` — the CATEGORY reaches the LABEL (not only a hint), and title + meta are announced as
//       ONE unit; and
//   (f) ⭐ the `black ≠ memorial` correction Story 11a.5 won SURVIVES into the successor label keys
//       (`black` is a SCHEDULED MEETING under §1819, ⛔ not bereavement).
//
// ⛔ `presenter.test.ts` is NOT amended by this story (Decision 2026-08-22-153, D5(a)): the strip's three
// CONTRACT fences hold because the recommended design adds NO descriptor field.

import { describe, expect, it } from 'vitest';

import {
  NOTICEBOARD_CATEGORY_LABEL_KEYS,
  NOTICEBOARD_ROW_DISMISSED_A11Y_KEY,
  NOTICEBOARD_ROW_DISMISS_A11Y_KEY,
  PINNED_NOTICE_A11Y_SEPARATOR,
  derivePinnedNoticeViewModel,
} from '../../src/noticeboard/index.js';
import type {
  NoticeCategory,
  NoticeboardRowDescriptor,
  PinnedNoticeInput,
  PinnedNoticeLabelPart,
  PinnedNoticeViewModel,
} from '../../src/noticeboard/index.js';

function row(over: Partial<NoticeboardRowDescriptor> = {}): NoticeboardRowDescriptor {
  return {
    id: 'banner-1',
    category: 'ink',
    title: 'रखरखाव अवधि',
    meta: 'ऐप 02:00–03:00 IST तक उपलब्ध नहीं रहेगा।',
    dismissible: true,
    ...over,
  };
}

function input(over: Partial<PinnedNoticeInput> = {}): PinnedNoticeInput {
  return { row: row(), acknowledged: false, ...over };
}

/** The label as the render layer will assemble it — key parts stand in for their resolved copy. */
function label(vm: PinnedNoticeViewModel): string {
  return vm.labelParts
    .map((part: PinnedNoticeLabelPart) => (part.kind === 'key' ? `<${part.key}>` : part.text))
    .join(PINNED_NOTICE_A11Y_SEPARATOR);
}

// ─── (a) ⭐ THE AC5 SHAPE PROOF — the tier rule is NOT re-implemented in the row ──────────────────

describe('⭐ the row presenter takes NO viewer, audience, authentication or tier input (AC5)', () => {
  // The 11a.5 anti-widening precedent (`presenter.test.ts:245-250`), applied to the row. A descriptor
  // only reaches this presenter AFTER the strip's `isVisibleToViewer` has passed it; a second visibility
  // taxonomy here could only ever disagree with the first, which is the failure AC5 exists to prevent.
  const INPUT_KEYS: Record<keyof PinnedNoticeInput, true> = {
    row: true,
    acknowledged: true,
  };

  it('the INPUT has EXACTLY two keys', () => {
    expect(Object.keys(INPUT_KEYS).sort()).toEqual(['acknowledged', 'row']);
  });

  it('⛔ NONE of them is a viewer / audience / tier / auth operand', () => {
    for (const key of Object.keys(INPUT_KEYS)) {
      expect(/viewer|audience|tier|auth|signedin|public|member/i.test(key), key).toBe(false);
    }
  });

  it('⛔ the ROW DESCRIPTOR it consumes carries no audience either — the filter ran upstream', () => {
    for (const key of Object.keys(row())) {
      expect(/viewer|audience|tier|auth|visib/i.test(key), key).toBe(false);
    }
  });

  it('⛔ emits NO visibility verdict of its own — a row that arrives here is already visible', () => {
    const vm = derivePinnedNoticeViewModel(input());
    for (const key of Object.keys(vm)) {
      expect(/visible|hidden|audience|tier/i.test(key), key).toBe(false);
    }
  });
});

// ─── (b) both ratified states, reachable and distinct (UX `:1818`) ────────────────────────────────

describe('the two ratified states are reachable and DISTINCT (UX `:1818`, D4(a))', () => {
  it('an unacknowledged row is `default`', () => {
    expect(derivePinnedNoticeViewModel(input()).state).toBe('default');
  });

  it('an acknowledged row is `dismissed` — the RATIFIED faded state, ⛔ not removal', () => {
    expect(derivePinnedNoticeViewModel(input({ acknowledged: true })).state).toBe('dismissed');
  });

  it('the two view-models are not equal — the state is a real property, not a no-op', () => {
    expect(derivePinnedNoticeViewModel(input())).not.toEqual(
      derivePinnedNoticeViewModel(input({ acknowledged: true })),
    );
  });

  it('⭐ `dismissed` is ANNOUNCED — ⛔ never conveyed by emphasis alone', () => {
    // The `BannerHost.tsx:62-64` / `tokens.ts:35-36` rule: colour and emphasis are never the sole channel.
    const vm = derivePinnedNoticeViewModel(input({ acknowledged: true }));
    expect(vm.labelParts).toContainEqual({ kind: 'key', key: NOTICEBOARD_ROW_DISMISSED_A11Y_KEY });
    expect(derivePinnedNoticeViewModel(input()).labelParts).not.toContainEqual({
      kind: 'key',
      key: NOTICEBOARD_ROW_DISMISSED_A11Y_KEY,
    });
  });

  it('⛔ decides NO opacity, colour or hex — emphasis is the render layer’s (D6(a) of `-152`)', () => {
    const vm = derivePinnedNoticeViewModel(input({ acknowledged: true }));
    expect(JSON.stringify(vm)).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    for (const key of Object.keys(vm)) {
      expect(/opacity|colour|color|hex|token/i.test(key), key).toBe(false);
    }
  });
});

// ─── (c) the dismiss affordance is a PRESENTER PROPERTY (AC3 / AC4) ──────────────────────────────

describe('the dismiss affordance is derived, ⛔ never an inline JSX condition (AC3/AC4)', () => {
  it('a dismissible, unacknowledged row offers ONE labelled affordance', () => {
    const vm = derivePinnedNoticeViewModel(input());
    expect(vm.dismiss).toEqual({ labelKey: NOTICEBOARD_ROW_DISMISS_A11Y_KEY });
  });

  it('⛔ `dismissible: false` yields NO affordance — a legal, REACHABLE case', () => {
    // `packages/domain/src/banners/errors.ts:84-86`: a non-dismissible `banner` is legal (only a POPUP
    // must be dismissible — a domain 422 + a DB CHECK). ⛔ Not a theoretical branch.
    expect(derivePinnedNoticeViewModel(input({ row: row({ dismissible: false }) })).dismiss).toBeNull();
  });

  it('⛔ an ALREADY-acknowledged row yields NO affordance — it cannot be double-fired', () => {
    expect(derivePinnedNoticeViewModel(input({ acknowledged: true })).dismiss).toBeNull();
  });

  it('⛔ carries no handler, mutation, endpoint or revision — the SCREEN owns those (D5(a))', () => {
    const vm = derivePinnedNoticeViewModel(input()) as unknown as Record<string, unknown>;
    for (const speculative of ['onDismiss', 'dismissalKey', 'revision', 'bannerId', 'mutate', 'url']) {
      expect(speculative in vm, speculative).toBe(false);
    }
    expect(typeof vm.dismiss).toBe('object');
    expect(JSON.stringify(vm)).not.toMatch(/\/api\/|mutation|endpoint/i);
  });
});

// ─── (d) ⭐ the label composes from NON-EMPTY parts — the routed empty-title defect closes here ────

describe('⭐ the a11y label is composed from NON-EMPTY parts (AC6; CR-of-11a.5 item 4)', () => {
  it('⛔ an EMPTY title produces NO leading separator and NO empty part', () => {
    // The shipped defect: `PinnedItem.tsx:36`'s `` `${title}. ${meta}` `` read as ". <meta>" for a
    // legacy banner with an empty title. Closed by composing from non-empty parts — ⛔ NOT by tightening
    // `toNoticeboardBannerNotice`'s `title === '' && body === ''` guard, which belongs to the banner lane.
    const vm = derivePinnedNoticeViewModel(input({ row: row({ title: '' }) }));
    const text = label(vm);
    expect(text.startsWith(PINNED_NOTICE_A11Y_SEPARATOR)).toBe(false);
    expect(text).not.toContain(`${PINNED_NOTICE_A11Y_SEPARATOR}${PINNED_NOTICE_A11Y_SEPARATOR}`);
    for (const part of vm.labelParts) {
      expect(part.kind === 'key' ? part.key : part.text).not.toBe('');
    }
  });

  it('a WHITESPACE-ONLY title is treated as absent too', () => {
    const vm = derivePinnedNoticeViewModel(input({ row: row({ title: '   ' }) }));
    expect(vm.labelParts.some((p) => p.kind === 'text' && p.text.trim() === '')).toBe(false);
    expect(vm.title).toBeNull();
  });

  it('⭐ and the blank VISIBLE line goes with it — an empty title renders no title line', () => {
    // The same routed finding's second half: the visible title line rendered blank above the meta line.
    // Nulling it in the presenter keeps the render layer from having to decide.
    expect(derivePinnedNoticeViewModel(input({ row: row({ title: '' }) })).title).toBeNull();
    expect(derivePinnedNoticeViewModel(input()).title).toBe('रखरखाव अवधि');
  });

  it('a row with NO meta line composes without one — ⛔ no trailing separator', () => {
    const text = label(derivePinnedNoticeViewModel(input({ row: row({ meta: null }) })));
    expect(text.endsWith(PINNED_NOTICE_A11Y_SEPARATOR.trimEnd())).toBe(false);
    expect(text).toBe(`<${NOTICEBOARD_CATEGORY_LABEL_KEYS.ink}>${PINNED_NOTICE_A11Y_SEPARATOR}रखरखाव अवधि`);
  });

  it('⛔ a row with neither title nor meta still announces its CATEGORY — never an empty label', () => {
    const vm = derivePinnedNoticeViewModel(input({ row: row({ title: '', meta: null }) }));
    expect(vm.labelParts).toEqual([{ kind: 'key', key: NOTICEBOARD_CATEGORY_LABEL_KEYS.ink }]);
  });
});

// ─── (e) UX `:1820` — category in the LABEL, title + meta as ONE unit ─────────────────────────────

describe('⭐ UX `:1820` — the category reaches the LABEL and the row reads as ONE unit (AC6)', () => {
  it('the CATEGORY leads the label, as a KEY — ⛔ never resolved copy in the presenter', () => {
    const parts = derivePinnedNoticeViewModel(input({ row: row({ category: 'green' }) })).labelParts;
    expect(parts[0]).toEqual({ kind: 'key', key: NOTICEBOARD_CATEGORY_LABEL_KEYS.green });
  });

  it('EVERY §1819 category has a label key — exhaustive, ⛔ no unlabelled row', () => {
    for (const category of ['terracotta', 'green', 'black', 'ink'] as const) {
      const parts = derivePinnedNoticeViewModel(input({ row: row({ category }) })).labelParts;
      expect(parts[0]).toEqual({ kind: 'key', key: NOTICEBOARD_CATEGORY_LABEL_KEYS[category] });
    }
    expect(Object.keys(NOTICEBOARD_CATEGORY_LABEL_KEYS)).toEqual([
      'terracotta',
      'green',
      'black',
      'ink',
    ]);
  });

  it('title and meta are ONE unit — both in a single ordered label, ⛔ not two stops', () => {
    const vm = derivePinnedNoticeViewModel(input());
    expect(label(vm)).toBe(
      [`<${NOTICEBOARD_CATEGORY_LABEL_KEYS.ink}>`, vm.title, vm.meta].join(
        PINNED_NOTICE_A11Y_SEPARATOR,
      ),
    );
  });

  it('⭐ `saffron` is DEAD in this presenter too — the §1819 vocabulary only', () => {
    const categories: readonly NoticeCategory[] = ['terracotta', 'green', 'black', 'ink'];
    expect(JSON.stringify(NOTICEBOARD_CATEGORY_LABEL_KEYS)).not.toContain('saffron');
    for (const category of categories) {
      expect(JSON.stringify(derivePinnedNoticeViewModel(input({ row: row({ category }) })))).not.toContain(
        'saffron',
      );
    }
  });

  it('⭐ the `black ≠ memorial` correction SURVIVES into the successor key (Trap 3)', () => {
    // Story 11a.5 won this: §491 `black` meant BEREAVEMENT, §1819 `black` means SCHEDULED MEETING, so the
    // prototype's "memorial" hint was WRONG rather than merely re-keyed. D6(a) retires the `open_detail_*`
    // hint keys — ⛔ that half of the guarantee is not negotiable and is re-asserted on the new key here.
    // (The resolved COPY is asserted against the real `t()` in the mobile harness; this pins the KEY.)
    expect(NOTICEBOARD_CATEGORY_LABEL_KEYS.black).not.toMatch(/memorial|bereave|shok/i);
    expect(JSON.stringify(NOTICEBOARD_CATEGORY_LABEL_KEYS)).not.toMatch(/open_detail/);
  });
});

// ─── (f) purity — the AC2 properties a reader must be able to check cheaply ───────────────────────

describe('the row presenter is PURE (AC2)', () => {
  it('same input → same output, twice', () => {
    expect(derivePinnedNoticeViewModel(input())).toEqual(derivePinnedNoticeViewModel(input()));
  });

  it('⛔ does NOT mutate its input', () => {
    const before = input();
    const snapshot = JSON.stringify(before);
    derivePinnedNoticeViewModel(before);
    expect(JSON.stringify(before)).toBe(snapshot);
  });

  it('⛔ takes NO clock — the strip presenter owns the window, the row owns none of it', () => {
    expect(derivePinnedNoticeViewModel.length).toBe(1);
  });

  it('emits only structured values and i18n KEYS — ⛔ no resolved chrome copy', () => {
    // The one place free text is legal is `title` / `meta`, which are OPERATOR-AUTHORED DATA.
    const vm = derivePinnedNoticeViewModel(input({ acknowledged: true }));
    const chrome = vm.labelParts.filter((p) => p.kind === 'key');
    expect(chrome.length).toBeGreaterThan(0);
    for (const part of chrome) {
      expect(part.kind === 'key' && /^[a-z0-9_]+$/.test(part.key)).toBe(true);
    }
  });
});
