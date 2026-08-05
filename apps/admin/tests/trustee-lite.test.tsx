// Trustee-Lite admin surface tests — Story 10.11 (Task 7; AC4/AC7/AC9).
//
// Pure tests (no router / query context — the shell takes everything as props). The focus is the
// three properties that would be silently wrong if only "does it render" were tested:
//   · ALL FOUR section states render DISTINGUISHABLY, and "empty" is never collapsed into
//     "not permitted" or "detection unavailable" (AC9);
//   · the cross-link hrefs resolve to the live routes, and the moderation / violator links open the
//     member record COLD — no reason code, no action, no pre-filling query parameter (AC4/AC7);
//   · an undated row renders an EXPLICIT "no deadline" affordance, never a blank cell (AC2).

import type { TrusteeLiteResponse, TrusteeSignalRow, ViolatorFlagsSection } from '@twt/contracts';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { trusteeCrossLink } from '../src/modules/trustee-lite/crossLinks.js';
import { producerLabel, resolveEn } from '../src/modules/trustee-lite/i18n-en.js';
import { TrusteeLiteShell } from '../src/modules/trustee-lite/TrusteeLiteShell.js';

const PARIWAR = '11111111-1111-1111-1111-111111111111';
const CLAIM = '33333333-3333-3333-3333-333333333333';
const MEMBER = '44444444-4444-4444-4444-444444444444';
const POOL = '55555555-5555-5555-5555-555555555555';

const row = (over: Partial<TrusteeSignalRow> = {}): TrusteeSignalRow => ({
  category: 'reconciliation',
  source_key: 'mismatch:pool-a:member-a',
  resource_id: POOL,
  claim_case_id: null,
  label: 'mismatch · amount_mismatch',
  age_ms: 172_800_000,
  raised_at: '2026-08-03T12:00:00.000Z',
  deadline_at: '2026-08-10T12:00:00.000Z',
  severity: 'on_track',
  cross_link_kind: 'reconciliation_review',
  ...over,
});

const response = (over: Partial<TrusteeLiteResponse> = {}): TrusteeLiteResponse => ({
  evaluated_at: '2026-08-05T12:00:00.000Z',
  ...over,
});

function renderShell(data: TrusteeLiteResponse, onNavigate = vi.fn()) {
  render(
    <TrusteeLiteShell pariwarId={PARIWAR} data={data} loading={false} onNavigate={onNavigate} />,
  );
  return onNavigate;
}

// ── AC7 — cross-links ────────────────────────────────────────────────────────────────────────

describe('trusteeCrossLink — every category maps to its live route (AC7)', () => {
  it('maps each cross-link kind to the shipped route', () => {
    const p = `/p/${PARIWAR}`;
    expect(trusteeCrossLink(PARIWAR, { cross_link_kind: 'cycle_freeze', claim_case_id: null }).href).toBe(
      `${p}/cycle-freeze`,
    );
    expect(trusteeCrossLink(PARIWAR, { cross_link_kind: 'r9_voting', claim_case_id: null }).href).toBe(
      `${p}/r9-voting`,
    );
    expect(trusteeCrossLink(PARIWAR, { cross_link_kind: 'claim_verify', claim_case_id: CLAIM }).href).toBe(
      `${p}/claims/${CLAIM}/verify`,
    );
    expect(
      trusteeCrossLink(PARIWAR, { cross_link_kind: 'reconciliation_review', claim_case_id: null }).href,
    ).toBe(`${p}/reconciliation-review`);
    expect(trusteeCrossLink(PARIWAR, { cross_link_kind: 'member_record', claim_case_id: null }).href).toBe(
      `${p}/members`,
    );
  });

  it('returns href: null (never a throw, never a path with an empty segment) for a claim-less claim link', () => {
    const link = trusteeCrossLink(PARIWAR, { cross_link_kind: 'claim_verify', claim_case_id: null });
    expect(link.href).toBeNull();
    expect(link.label).toBeTruthy();
  });

  it('AC4 — the moderation link opens the member record COLD: no reason code, no action, no query', () => {
    const href = trusteeCrossLink(PARIWAR, { cross_link_kind: 'member_record', claim_case_id: null }).href!;
    expect(href).not.toContain('?');
    expect(href).not.toMatch(/action|reason|suspend|terminate|moderat/i);
    expect(href).toBe(`/p/${PARIWAR}/members`);
  });

  it('encodes path segments (a hostile id cannot break out of the path)', () => {
    const link = trusteeCrossLink('a/b', { cross_link_kind: 'claim_verify', claim_case_id: 'c/d' });
    expect(link.href).toBe('/p/a%2Fb/claims/c%2Fd/verify');
  });

  it("an unrecognized cross_link_kind (e.g. client/server deploy skew) never throws — href: null (review finding, 2026-08-05)", () => {
    const unrecognized = 'not_a_real_kind' as unknown as Parameters<typeof trusteeCrossLink>[1]['cross_link_kind'];
    const link = trusteeCrossLink(PARIWAR, { cross_link_kind: unrecognized, claim_case_id: null });
    expect(link.href).toBeNull();
  });
});

// ── AC9 — the four section states ────────────────────────────────────────────────────────────

describe('the four section states render distinguishably (AC9)', () => {
  it('POPULATED — rows render inside the list', () => {
    renderShell(response({ reconciliation: [row()] }));
    const section = screen.getByTestId('trustee-section-reconciliation');
    expect(section.getAttribute('data-state')).toBe('populated');
    expect(within(section).getByTestId('trustee-row-mismatch:pool-a:member-a')).toBeTruthy();
  });

  it('GENUINELY EMPTY — a present-but-empty section says nothing is waiting', () => {
    renderShell(response({ reconciliation: [] }));
    const section = screen.getByTestId('trustee-section-reconciliation');
    expect(section.getAttribute('data-state')).toBe('empty');
    expect(within(section).getByText(resolveEn('trustee.state.empty'))).toBeTruthy();
  });

  it('NOT PERMITTED — an ABSENT section says so, and does NOT say "nothing is waiting"', () => {
    // The load-bearing distinction: telling a trustee "there are no R9 cases" when the truth is
    // "you cannot see R9 cases" is a scope leak dressed as reassurance.
    renderShell(response({}));
    const section = screen.getByTestId('trustee-section-r9_voting');
    expect(section.getAttribute('data-state')).toBe('not-permitted');
    expect(within(section).getByText(resolveEn('trustee.state.notPermitted'))).toBeTruthy();
    expect(within(section).queryByText(resolveEn('trustee.state.empty'))).toBeNull();
  });

  it('the empty and not-permitted renderings are NEVER the same text', () => {
    expect(resolveEn('trustee.state.empty')).not.toBe(resolveEn('trustee.state.notPermitted'));
  });

  it('DETECTION UNAVAILABLE — the violator section names the missing producer and shows no member list', () => {
    const unavailable: ViolatorFlagsSection = { status: 'detection_unavailable', producer: 'story-10-24' };
    renderShell(response({ violator_flags: unavailable }));
    const section = screen.getByTestId('trustee-section-violator_flag');
    expect(section.getAttribute('data-state')).toBe('detection-unavailable');
    const body = within(section).getByTestId('trustee-violator-unavailable-body').textContent ?? '';
    // It must NAME what is missing, and must NOT echo the raw internal sentinel.
    expect(body).toContain('Story 10.24');
    expect(body).not.toContain('story-10-24');
    // And it must not read as an all-clear.
    expect(within(section).queryByText(resolveEn('trustee.violator.empty'))).toBeNull();
  });

  it('an unavailable section is rendered DIFFERENTLY from an ok-but-empty one', () => {
    const { unmount } = render(
      <TrusteeLiteShell
        pariwarId={PARIWAR}
        data={response({ violator_flags: { status: 'detection_unavailable', producer: 'story-10-24' } })}
        loading={false}
        onNavigate={vi.fn()}
      />,
    );
    const gapText = screen.getByTestId('trustee-section-violator_flag').textContent;
    unmount();

    render(
      <TrusteeLiteShell
        pariwarId={PARIWAR}
        data={response({ violator_flags: { status: 'ok', members: [] } })}
        loading={false}
        onNavigate={vi.fn()}
      />,
    );
    const emptySection = screen.getByTestId('trustee-section-violator_flag');
    expect(emptySection.getAttribute('data-state')).toBe('empty');
    expect(emptySection.textContent).not.toBe(gapText);
  });

  it('an unrecognized producer sentinel falls through to the raw value rather than being hidden', () => {
    expect(producerLabel('some-future-story')).toBe('some-future-story');
    expect(producerLabel('story-10-24')).toContain('Story 10.24');
  });

  it('LOADING and ERROR render OUTSIDE every list (no section mounts)', () => {
    const { unmount } = render(
      <TrusteeLiteShell pariwarId={PARIWAR} loading={true} onNavigate={vi.fn()} />,
    );
    expect(screen.getByTestId('trustee-loading')).toBeTruthy();
    expect(screen.queryByTestId('trustee-section-reconciliation')).toBeNull();
    unmount();

    render(<TrusteeLiteShell pariwarId={PARIWAR} loading={false} error="boom" onNavigate={vi.fn()} />);
    expect(screen.getByTestId('trustee-error').textContent).toContain('boom');
    expect(screen.queryByTestId('trustee-section-reconciliation')).toBeNull();
  });
});

// ── AC2 — the undated affordance + the visible tier boundary ─────────────────────────────────

describe('undated rows are explicit, not blank (AC2/AC9)', () => {
  it('renders the "no deadline" affordance rather than an empty cell', () => {
    renderShell(
      response({ cycle_freeze: [row({ category: 'cycle_freeze', deadline_at: null, severity: null, age_ms: null })] }),
    );
    const cell = screen.getByTestId('trustee-deadline');
    expect(cell.textContent).toBe(resolveEn('trustee.deadline.none'));
    expect(cell.textContent!.trim().length).toBeGreaterThan(0);
  });

  it('renders "start time not on record" for a row whose source carries no instant', () => {
    renderShell(response({ cycle_freeze: [row({ category: 'cycle_freeze', deadline_at: null, age_ms: null })] }));
    expect(screen.getByTestId('trustee-age').textContent).toBe(resolveEn('trustee.age.unknown'));
  });

  it('renders a visible divider at the dated → undated boundary so the two-tier order is legible', () => {
    renderShell(
      response({
        reconciliation: [
          row({ source_key: 'dated-1' }),
          row({ source_key: 'undated-1', deadline_at: null, severity: null }),
        ],
      }),
    );
    expect(screen.getByTestId('trustee-undated-divider-reconciliation')).toBeTruthy();
  });

  it('does NOT render the divider when every row is undated (nothing to separate)', () => {
    renderShell(
      response({
        cycle_freeze: [
          row({ category: 'cycle_freeze', source_key: 'u1', deadline_at: null, severity: null }),
          row({ category: 'cycle_freeze', source_key: 'u2', deadline_at: null, severity: null }),
        ],
      }),
    );
    expect(screen.queryByTestId('trustee-undated-divider-cycle_freeze')).toBeNull();
  });

  it('renders an em-dash for a null severity, never a reassuring band', () => {
    renderShell(response({ moderation: [row({ category: 'moderation', deadline_at: null, severity: null })] }));
    const cell = screen.getByTestId('trustee-severity');
    expect(cell.textContent).toBe(resolveEn('trustee.severity.none'));
    expect(cell.textContent).not.toContain(resolveEn('trustee.severity.on_track'));
  });
});

// ── Navigation ───────────────────────────────────────────────────────────────────────────────

describe('cross-link navigation (AC7)', () => {
  it('clicking a row link navigates to the derived href', () => {
    const onNavigate = renderShell(response({ reconciliation: [row()] }));
    fireEvent.click(screen.getByTestId('trustee-link-mismatch:pool-a:member-a'));
    expect(onNavigate).toHaveBeenCalledWith(`/p/${PARIWAR}/reconciliation-review`);
  });

  it('a row with no link target renders a DISABLED affordance, not a button', () => {
    renderShell(
      response({
        concealment: [row({ category: 'concealment', source_key: 'no-target', cross_link_kind: 'claim_verify', claim_case_id: null })],
      }),
    );
    expect(screen.queryByTestId('trustee-link-no-target')).toBeNull();
  });

  it('a violator member links COLD to the member record', () => {
    const onNavigate = renderShell(
      response({
        violator_flags: {
          status: 'ok',
          members: [
            {
              member_id: MEMBER,
              flags: [
                {
                  clause_id: 'niy.contribution-discipline.r7-f',
                  clause_label: 'r7_restoration_required · rule.gap',
                  facts_establishing: [{ key: 'contribution.months_since_last', value: 7 }],
                  holding_since: null,
                },
              ],
            },
          ],
        },
      }),
    );
    fireEvent.click(screen.getByTestId(`trustee-violator-link-${MEMBER}`));
    expect(onNavigate).toHaveBeenCalledWith(`/p/${PARIWAR}/members`);
    // Cold: the navigation carries no action and no reason code.
    expect(onNavigate.mock.calls[0]![0]).not.toContain('?');
  });

  it('a violator flag with no established onset says so explicitly', () => {
    renderShell(
      response({
        violator_flags: {
          status: 'ok',
          members: [
            {
              member_id: MEMBER,
              flags: [
                {
                  clause_id: 'niy.contribution-discipline.r7-a',
                  clause_label: 'r7_restoration_required · rule.x',
                  facts_establishing: [],
                  holding_since: null,
                },
              ],
            },
          ],
        },
      }),
    );
    const card = screen.getByTestId(`trustee-violator-${MEMBER}`);
    expect(card.textContent).toContain(resolveEn('trustee.violator.holdingSince.unknown'));
    expect(card.textContent).toContain(resolveEn('trustee.violator.facts.none'));
  });
});

// ── AC5 — the copy carries no advice ─────────────────────────────────────────────────────────

describe('the rendered surface carries no verb of advice (AC5)', () => {
  it('no section heading, state or violator string reads as a recommendation', () => {
    // A render-level backstop to the microcopy gate: the gate scans the SOURCE, this asserts the
    // RESOLVED output a trustee actually reads.
    const keys = [
      'trustee.title',
      'trustee.subtitle',
      'trustee.section.moderation',
      'trustee.section.violator_flag',
      'trustee.state.empty',
      'trustee.state.notPermitted',
      'trustee.violator.intro',
      'trustee.violator.empty',
      'trustee.violator.unavailable.title',
      'trustee.violator.unavailable.body',
      'trustee.severity.breached',
    ];
    for (const key of keys) {
      const text = resolveEn(key);
      expect(text, `${key} must not resolve to its own key`).not.toBe(key);
      expect(text, `${key} carries an advice verb`).not.toMatch(
        /should be (suspend|terminat|remov)|action required|overdue for review|needs? action|recommend|requires? your action/i,
      );
    }
  });
});
