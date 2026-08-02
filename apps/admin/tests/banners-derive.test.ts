// Banner console PURE derivations (Story 10.9, Task 6). No React, no network.
//
// The AC5 VISIBILITY VERDICT is the substance here. Two properties matter and both are asserted:
//   1. the verdict AGREES with the shared resolver — because it IS the shared resolver, spliced;
//   2. it speaks in consequences ("this banner will never be seen while X is live"), names the
//      deciding rule, and gives the earliest instant the draft could become visible.

import type { BannerResponse } from '@twt/contracts';
import { resolveVisibleBanners } from '@twt/contracts';
import { describe, expect, it } from 'vitest';

import {
  UNSAVED_DRAFT_ID,
  bannerErrorGuidance,
  canPublish,
  canRetract,
  displayStateLabel,
  forcesDismissible,
  isEditable,
  isTargetableAudience,
  previewClasses,
  visibilityVerdict,
  type DraftCandidate,
} from '../src/modules/banners/derive.js';

const NOW = new Date('2026-08-04T12:00:00.000Z');
const FROM = new Date('2026-08-01T00:00:00.000Z');
const UNTIL = new Date('2026-08-08T00:00:00.000Z');

function live(over: Partial<BannerResponse>): BannerResponse {
  return {
    banner_id: '22222222-2222-2222-2222-222222222222',
    pariwar_id: '11111111-1111-1111-1111-111111111111',
    title: 'Maintenance window',
    body: 'Down 02:00–03:00.',
    title_hi: 'रखरखाव',
    body_hi: 'बंद',
    audience_scope: 'members-all',
    audience_scope_value: null,
    valid_from: FROM.toISOString(),
    valid_until: UNTIL.toISOString(),
    display_mode: 'banner',
    dismissible: true,
    display_once_per_member: false,
    severity: 'info',
    revision: 1,
    status: 'published',
    display_state: 'live',
    created_by_actor_id: '33333333-3333-3333-3333-333333333333',
    tone_signoff_content_hash: null,
    tone_signoff_reviewed_at: null,
    tone_signoff_reviewed_by: null,
    published_at: FROM.toISOString(),
    retracted_at: null,
    created_at: FROM.toISOString(),
    updated_at: FROM.toISOString(),
    ...over,
  } as BannerResponse;
}

function draft(over: Partial<DraftCandidate> = {}): DraftCandidate {
  return {
    bannerId: UNSAVED_DRAFT_ID,
    title: 'Rule update',
    severity: 'warning',
    displayMode: 'banner',
    validFrom: FROM,
    validUntil: UNTIL,
    ...over,
  };
}

describe('status affordances mirror the domain legality reducer', () => {
  it('only a draft may be published', () => {
    expect(canPublish('draft')).toBe(true);
    expect(canPublish('published')).toBe(false);
    expect(canPublish('retracted')).toBe(false);
  });

  it('a draft or a published banner may be retracted; a retracted one may not', () => {
    expect(canRetract('draft')).toBe(true);
    expect(canRetract('published')).toBe(true);
    expect(canRetract('retracted')).toBe(false);
  });

  it('a retracted banner is not editable (terminal)', () => {
    expect(isEditable('draft')).toBe(true);
    expect(isEditable('published')).toBe(true);
    expect(isEditable('retracted')).toBe(false);
  });

  it('labels every derived display state', () => {
    expect(displayStateLabel('live')).toBe('Live now');
    expect(displayStateLabel('scheduled')).toBe('Scheduled');
    expect(displayStateLabel('expired')).toBe('Expired');
  });
});

describe('AC4 — the popup forces dismissible in the UI', () => {
  it('a popup forces it; a banner does not', () => {
    expect(forcesDismissible('popup')).toBe(true);
    expect(forcesDismissible('banner')).toBe(false);
  });
});

describe('Decision 4 — the "not yet targetable" indicator', () => {
  it('members-all and public are targetable; state/role/cohort are not', () => {
    expect(isTargetableAudience('members-all')).toBe(true);
    expect(isTargetableAudience('public')).toBe(true);
    for (const s of ['state', 'role', 'cohort']) expect(isTargetableAudience(s)).toBe(false);
  });
});

describe('the preview visually distinguishes scheduled from live', () => {
  it('live is solid; scheduled is dashed + muted (the confusable pair)', () => {
    const liveClasses = previewClasses('critical', 'live');
    const scheduledClasses = previewClasses('critical', 'scheduled');
    expect(liveClasses).not.toBe(scheduledClasses);
    expect(scheduledClasses).toContain('border-dashed');
    expect(scheduledClasses).toContain('opacity-70');
    expect(liveClasses).not.toContain('border-dashed');
  });

  it('uses only status tokens that exist in the @twt/tokens registry', () => {
    // A token that is not in the registry renders as NOTHING — a silently unstyled banner. Pin the
    // real names so a rename in the registry breaks a test rather than the console's appearance.
    const known = /status-(fail-(bg|border|fg)|pending|held|muted-bg)/;
    for (const severity of ['critical', 'warning', 'info']) {
      for (const state of ['live', 'scheduled'] as const) {
        const classes = previewClasses(severity, state);
        for (const token of classes.match(/status-[a-z-]+/g) ?? []) {
          expect(token).toMatch(known);
        }
      }
    }
  });
});

describe('AC5 — the visibility verdict', () => {
  it('is null when nothing else of the same mode is live (no overlap, no warning)', () => {
    expect(visibilityVerdict(draft(), [], NOW)).toBeNull();
    // A live POPUP does not compete with a draft BANNER — independent lanes.
    expect(visibilityVerdict(draft({ displayMode: 'banner' }), [live({ display_mode: 'popup' })], NOW)).toBeNull();
  });

  it('reports the draft HIDDEN behind a more severe incumbent, with the consequence in words', () => {
    const incumbent = live({
      banner_id: 'aaaa1111-1111-1111-1111-111111111111',
      title: 'Maintenance window',
      severity: 'critical',
    });
    const v = visibilityVerdict(draft({ severity: 'warning', title: 'Rule update' }), [incumbent], NOW);
    expect(v).not.toBeNull();
    expect(v!.draftHidden).toBe(true);
    expect(v!.rows).toEqual([
      { label: 'Current winner', severity: 'critical', title: 'Maintenance window', verdict: 'Visible' },
      { label: 'This draft', severity: 'warning', title: 'Rule update', verdict: 'Hidden' },
    ]);
    expect(v!.consequence).toBe('This banner will never be seen while “Maintenance window” is live.');
    expect(v!.decidingRule).toMatch(/severity decides first/i);
  });

  it('reports the draft VISIBLE when it outranks the incumbent, with no warning', () => {
    const incumbent = live({ banner_id: 'aaaa1111-1111-1111-1111-111111111111', severity: 'info' });
    const v = visibilityVerdict(draft({ severity: 'critical' }), [incumbent], NOW);
    expect(v!.draftHidden).toBe(false);
    expect(v!.rows[1]).toMatchObject({ label: 'This draft', verdict: 'Visible' });
    expect(v!.rows[0]).toMatchObject({ label: 'Current winner', verdict: 'Hidden' });
    expect(v!.consequence).toBeNull();
  });

  it('names RECENCY as the deciding rule at equal severity', () => {
    const incumbent = live({
      banner_id: 'aaaa1111-1111-1111-1111-111111111111',
      severity: 'warning',
      valid_from: new Date('2026-08-03T00:00:00.000Z').toISOString(),
    });
    const v = visibilityVerdict(draft({ severity: 'warning', validFrom: FROM }), [incumbent], NOW);
    expect(v!.draftHidden).toBe(true);
    expect(v!.decidingRule).toMatch(/more recently activated/i);
  });

  it('names the ID TIEBREAK when severity and start time both tie', () => {
    const incumbent = live({ banner_id: '11111111-1111-1111-1111-111111111111', severity: 'warning' });
    const v = visibilityVerdict(
      draft({ bannerId: UNSAVED_DRAFT_ID, severity: 'warning', validFrom: FROM }),
      [incumbent],
      NOW,
    );
    expect(v!.draftHidden).toBe(true);
    expect(v!.decidingRule).toMatch(/lower banner id/i);
  });

  it('gives the earliest instant the losing draft would become visible (the incumbent’s end)', () => {
    const incumbentEnds = new Date('2026-08-06T00:00:00.000Z');
    const incumbent = live({
      banner_id: 'aaaa1111-1111-1111-1111-111111111111',
      severity: 'critical',
      valid_until: incumbentEnds.toISOString(),
    });
    const v = visibilityVerdict(draft({ severity: 'info', validUntil: UNTIL }), [incumbent], NOW);
    expect(v!.visibleFrom).toBe(incumbentEnds.toISOString());
  });

  it('reports NEVER visible when the incumbent outlives the draft’s own window', () => {
    const incumbent = live({
      banner_id: 'aaaa1111-1111-1111-1111-111111111111',
      severity: 'critical',
      valid_until: new Date('2026-09-01T00:00:00.000Z').toISOString(),
    });
    const v = visibilityVerdict(draft({ severity: 'info', validUntil: UNTIL }), [incumbent], NOW);
    expect(v!.draftHidden).toBe(true);
    expect(v!.visibleFrom).toBeNull();
  });

  it('AGREES with the shared resolver — it IS the resolver, not a second comparison', () => {
    const incumbent = live({ banner_id: 'aaaa1111-1111-1111-1111-111111111111', severity: 'critical' });
    const d = draft({ severity: 'warning' });
    const v = visibilityVerdict(d, [incumbent], NOW);

    // Independently run the SAME resolver over the same spliced set and check the winner matches
    // the verdict's "Visible" row. If the console ever grew its own comparison, this diverges.
    const resolved = resolveVisibleBanners(
      [
        {
          bannerId: incumbent.banner_id,
          severity: incumbent.severity,
          displayMode: incumbent.display_mode,
          validFrom: new Date(incumbent.valid_from),
          validUntil: new Date(incumbent.valid_until),
          status: 'published',
        },
        { ...d, status: 'published' as const },
      ],
      NOW,
    );
    const visibleRow = v!.rows.find((r) => r.verdict === 'Visible')!;
    const expectedTitle = resolved.banner?.bannerId === d.bannerId ? d.title : incumbent.title;
    expect(visibleRow.title).toBe(expectedTitle);
  });

  it('a state/role/cohort-scoped incumbent (visible to NOBODY per Decision 4) never wins the verdict', () => {
    // A ghost banner: stored, published, "live" by window — but isMemberInBannerAudience resolves it
    // to visible-to-nobody. It must not be able to hide a real draft, no matter its severity.
    const ghost = live({
      banner_id: 'aaaa1111-1111-1111-1111-111111111111',
      severity: 'critical',
      audience_scope: 'state',
      audience_scope_value: 'Bihar',
    });
    expect(visibilityVerdict(draft({ severity: 'info' }), [ghost], NOW)).toBeNull();
  });

  it('public and members-all DO still compete with each other — both are "every member" today', () => {
    const incumbent = live({
      banner_id: 'aaaa1111-1111-1111-1111-111111111111',
      severity: 'critical',
      audience_scope: 'public',
    });
    const v = visibilityVerdict(draft({ severity: 'info' }), [incumbent], NOW);
    expect(v).not.toBeNull();
    expect(v!.draftHidden).toBe(true);
  });

  it('a draft that is NOT in its own window yet still gets a verdict against the live set', () => {
    // The verdict answers "if I published this now" — a future window means the draft is not live,
    // so it cannot win, and the admin should see exactly that.
    const incumbent = live({ banner_id: 'aaaa1111-1111-1111-1111-111111111111', severity: 'info' });
    const v = visibilityVerdict(
      draft({
        severity: 'critical',
        validFrom: new Date('2026-09-01T00:00:00.000Z'),
        validUntil: new Date('2026-09-08T00:00:00.000Z'),
      }),
      [incumbent],
      NOW,
    );
    expect(v!.draftHidden).toBe(true);
  });
});

describe('bannerErrorGuidance', () => {
  it('turns each server error code into an actionable sentence', () => {
    expect(bannerErrorGuidance('banner.popup_must_be_dismissible')).toMatch(/always be dismissible/i);
    expect(bannerErrorGuidance('banner.bilingual_required')).toMatch(/Hindi/i);
    expect(bannerErrorGuidance('banner.window_invalid')).toMatch(/later than/i);
    expect(bannerErrorGuidance('tone_review.required')).toMatch(/another admin/i);
    expect(bannerErrorGuidance('something.else')).toBeNull();
  });
});
