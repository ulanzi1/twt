// Admin `<ModerationStrip>` interaction tests — Story 10.10 (Task 8; AC9, AC10).
//
// Pure render of the presentational strip (no router/query context — it takes the moderation
// response as a prop). Asserts the four things a reviewer is most likely to regress:
//   1. button enablement comes from the SERVER's `legal_actions` (never a client-side copy of the
//      legality rules) — above all, terminate is unavailable on an unmoderated member;
//   2. the reason-code dropdown is filtered by `appliesTo`;
//   3. the rationale is mandatory on EVERY action;
//   4. the confirmation modal obeys UX Pattern 2 — first focus on Cancel, ESC dismisses, and an
//      EXPLICIT consequence statement.

import type { ModerationHistoryResponse, ReasonCodeMetaDto } from '@twt/contracts';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  ModerationHistory,
  ModerationStrip,
  reasonCodesFor,
} from '../src/modules/member-status/ModerationStrip.js';

function moderation(over: Partial<ModerationHistoryResponse> = {}): ModerationHistoryResponse {
  return {
    member_id: '11111111-1111-4111-8111-111111111111',
    current_status: 'none',
    current_reason_code: null,
    since: null,
    legal_actions: ['suspend'],
    entries: [],
    ...over,
  };
}

/**
 * A test-fixture mirror of the server's frozen registry (`GET …/moderation/reason-codes`) — the
 * presentational `<ModerationStrip>`/`<ModerationHistory>` take it as a prop now (review follow-up:
 * they used to read a hand-duplicated `i18n-en.ts` map instead of a server source).
 */
const REASON_CODES: ReasonCodeMetaDto[] = [
  { code: 'r7-contribution-discipline', applies_to: ['suspend', 'terminate'], niyamavali_ref: 'R7', label: 'Contribution discipline (R7)' },
  { code: 'r14-forgery', applies_to: ['suspend', 'terminate'], niyamavali_ref: 'R14', label: 'Forgery or falsified documents (R14)' },
  { code: 'r10a-parallel-org-office', applies_to: ['suspend', 'terminate'], niyamavali_ref: 'R10(A)', label: 'Office held in a parallel organisation (R10(A))' },
  { code: 'concealment-confirmed', applies_to: ['suspend', 'terminate'], niyamavali_ref: 'FR-11', label: 'Concealment confirmed by State Trustee (FR-11)' },
  { code: 'helpdesk-escalated-abuse', applies_to: ['suspend', 'terminate'], niyamavali_ref: 'FR-56', label: 'Abuse escalated from the helpdesk' },
  { code: 'regulator-action', applies_to: ['suspend', 'terminate'], niyamavali_ref: 'FR-56', label: 'Regulatory or statutory action' },
  { code: 'voluntary-pending-review', applies_to: ['suspend', 'terminate'], niyamavali_ref: 'FR-56', label: 'Voluntary pause pending review' },
  { code: 'rule-clearance', applies_to: ['restore'], niyamavali_ref: 'R7(A)', label: 'Rule cleared — three consecutive contributions (R7(A))' },
  { code: 'trustee-discretion', applies_to: ['restore'], niyamavali_ref: 'R5(D)/R10(D)', label: 'Trustee discretion (R5(D)/R10(D))' },
  { code: 'moderation-error', applies_to: ['restore'], niyamavali_ref: 'FR-56', label: 'Moderation recorded in error' },
];

const noop = async (): Promise<void> => undefined;

describe('reasonCodesFor — the appliesTo filter (AC3/AC9)', () => {
  it('offers only MODERATION codes for suspend and terminate', () => {
    for (const action of ['suspend', 'terminate'] as const) {
      const codes = reasonCodesFor(action, REASON_CODES);
      expect(codes).toContain('r14-forgery');
      expect(codes).not.toContain('moderation-error');
      expect(codes).not.toContain('rule-clearance');
    }
  });

  it('offers only RESTORE codes for restore', () => {
    const codes = reasonCodesFor('restore', REASON_CODES);
    expect(codes).toEqual(['rule-clearance', 'trustee-discretion', 'moderation-error']);
  });
});

describe('button enablement is SERVER-driven (Decision 2)', () => {
  it('an UNMODERATED member: suspend enabled, terminate + restore DISABLED', () => {
    render(<ModerationStrip moderation={moderation()} reasonCodes={REASON_CODES} onSubmit={noop} />);
    expect(screen.getByTestId('moderation-action-suspend')).toBeEnabled();
    // The load-bearing one: FR-56 routes termination THROUGH suspension, so the harshest action can
    // never be a single click.
    expect(screen.getByTestId('moderation-action-terminate')).toBeDisabled();
    expect(screen.getByTestId('moderation-action-restore')).toBeDisabled();
  });

  it('a SUSPENDED member: terminate + restore enabled, suspend DISABLED (no silent re-suspend)', () => {
    render(
      <ModerationStrip
        moderation={moderation({
          current_status: 'suspended',
          current_reason_code: 'r7-contribution-discipline',
          since: '2026-08-01T00:00:00.000Z',
          legal_actions: ['terminate', 'restore'],
        })}
        reasonCodes={REASON_CODES}
        onSubmit={noop}
      />,
    );
    expect(screen.getByTestId('moderation-action-suspend')).toBeDisabled();
    expect(screen.getByTestId('moderation-action-terminate')).toBeEnabled();
    expect(screen.getByTestId('moderation-action-restore')).toBeEnabled();
  });

  it('a TERMINATED member: only restore is available', () => {
    render(
      <ModerationStrip
        moderation={moderation({
          current_status: 'terminated',
          current_reason_code: 'r14-forgery',
          legal_actions: ['restore'],
        })}
        reasonCodes={REASON_CODES}
        onSubmit={noop}
      />,
    );
    expect(screen.getByTestId('moderation-action-suspend')).toBeDisabled();
    expect(screen.getByTestId('moderation-action-terminate')).toBeDisabled();
    expect(screen.getByTestId('moderation-action-restore')).toBeEnabled();
  });

  it('renders the current standing with a LABEL, never the raw reason code', () => {
    render(
      <ModerationStrip
        moderation={moderation({
          current_status: 'suspended',
          current_reason_code: 'r14-forgery',
          legal_actions: ['terminate', 'restore'],
        })}
        reasonCodes={REASON_CODES}
        onSubmit={noop}
      />,
    );
    const badge = screen.getByTestId('moderation-current-status');
    expect(badge.textContent).toContain('Forgery or falsified documents (R14)');
    expect(badge.textContent).not.toContain('r14-forgery');
  });
});

describe('the form: filtered dropdown + a MANDATORY rationale (AC3)', () => {
  it('the dropdown offers only codes valid for the chosen action', () => {
    render(<ModerationStrip moderation={moderation()} reasonCodes={REASON_CODES} onSubmit={noop} />);
    fireEvent.click(screen.getByTestId('moderation-action-suspend'));
    const select = screen.getByTestId('moderation-reason-code');
    const values = within(select)
      .getAllByRole('option')
      .map((o) => (o as HTMLOptionElement).value)
      .filter((v) => v !== '');
    expect(values).toContain('r14-forgery');
    expect(values).not.toContain('moderation-error');
  });

  it('blocks submit with NO reason code', () => {
    const onSubmit = vi.fn(noop);
    render(<ModerationStrip moderation={moderation()} reasonCodes={REASON_CODES} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByTestId('moderation-action-suspend'));
    fireEvent.click(screen.getByTestId('moderation-submit'));
    expect(screen.getByTestId('moderation-reason-error')).toBeInTheDocument();
    expect(screen.queryByTestId('moderation-confirm-modal')).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('blocks submit with a code but NO rationale — required on EVERY action, not only "other"', () => {
    const onSubmit = vi.fn(noop);
    render(<ModerationStrip moderation={moderation()} reasonCodes={REASON_CODES} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByTestId('moderation-action-suspend'));
    fireEvent.change(screen.getByTestId('moderation-reason-code'), {
      target: { value: 'r14-forgery' },
    });
    fireEvent.click(screen.getByTestId('moderation-submit'));
    expect(screen.getByTestId('moderation-rationale-error')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('blocks submit on a WHITESPACE-ONLY rationale', () => {
    const onSubmit = vi.fn(noop);
    render(<ModerationStrip moderation={moderation()} reasonCodes={REASON_CODES} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByTestId('moderation-action-suspend'));
    fireEvent.change(screen.getByTestId('moderation-reason-code'), {
      target: { value: 'r14-forgery' },
    });
    fireEvent.change(screen.getByTestId('moderation-rationale'), { target: { value: '   \n  ' } });
    fireEvent.click(screen.getByTestId('moderation-submit'));
    expect(screen.getByTestId('moderation-rationale-error')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('CLEARS an incompatible reason code when the action changes', () => {
    render(
      <ModerationStrip
        moderation={moderation({
          current_status: 'suspended',
          legal_actions: ['terminate', 'restore'],
        })}
        reasonCodes={REASON_CODES}
        onSubmit={noop}
      />,
    );
    fireEvent.click(screen.getByTestId('moderation-action-terminate'));
    fireEvent.change(screen.getByTestId('moderation-reason-code'), {
      target: { value: 'r14-forgery' },
    });
    // Switching to restore must drop the now-invalid moderation code rather than silently carrying
    // it into a request the server would 422.
    fireEvent.click(screen.getByTestId('moderation-action-restore'));
    expect((screen.getByTestId('moderation-reason-code') as HTMLSelectElement).value).toBe('');
  });
});

describe('the confirmation modal — UX Pattern 2', () => {
  function openModal(): void {
    fireEvent.click(screen.getByTestId('moderation-action-suspend'));
    fireEvent.change(screen.getByTestId('moderation-reason-code'), {
      target: { value: 'r14-forgery' },
    });
    fireEvent.change(screen.getByTestId('moderation-rationale'), {
      target: { value: 'Documents confirmed forged.' },
    });
    fireEvent.click(screen.getByTestId('moderation-submit'));
  }

  it('opens on a VALID submit and does not write until Confirm', () => {
    const onSubmit = vi.fn(noop);
    render(<ModerationStrip moderation={moderation()} reasonCodes={REASON_CODES} onSubmit={onSubmit} />);
    openModal();
    expect(screen.getByTestId('moderation-confirm-modal')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('puts FIRST FOCUS on Cancel — a reflexive Enter must land on the harmless choice', () => {
    render(<ModerationStrip moderation={moderation()} reasonCodes={REASON_CODES} onSubmit={noop} />);
    openModal();
    expect(document.activeElement).toBe(screen.getByTestId('moderation-confirm-cancel'));
  });

  it('dismisses on ESC without writing', () => {
    const onSubmit = vi.fn(noop);
    render(<ModerationStrip moderation={moderation()} reasonCodes={REASON_CODES} onSubmit={onSubmit} />);
    openModal();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('moderation-confirm-modal')).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('dismisses on Cancel without writing', () => {
    const onSubmit = vi.fn(noop);
    render(<ModerationStrip moderation={moderation()} reasonCodes={REASON_CODES} onSubmit={onSubmit} />);
    openModal();
    fireEvent.click(screen.getByTestId('moderation-confirm-cancel'));
    expect(screen.queryByTestId('moderation-confirm-modal')).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('states the EXPLICIT consequence, not a generic "are you sure?"', () => {
    render(<ModerationStrip moderation={moderation()} reasonCodes={REASON_CODES} onSubmit={noop} />);
    openModal();
    const consequence = screen.getByTestId('moderation-confirm-consequence').textContent ?? '';
    expect(consequence).toMatch(/signed out/i);
    expect(consequence).toMatch(/covered for support/i);
    expect(consequence).not.toMatch(/are you sure/i);
  });

  it('the TERMINATE consequence names the 12-month rejoin lock (FR-56 → FR-6)', () => {
    render(
      <ModerationStrip
        moderation={moderation({ current_status: 'suspended', legal_actions: ['terminate', 'restore'] })}
        reasonCodes={REASON_CODES}
        onSubmit={noop}
      />,
    );
    fireEvent.click(screen.getByTestId('moderation-action-terminate'));
    fireEvent.change(screen.getByTestId('moderation-reason-code'), {
      target: { value: 'r14-forgery' },
    });
    fireEvent.change(screen.getByTestId('moderation-rationale'), { target: { value: 'Confirmed.' } });
    fireEvent.click(screen.getByTestId('moderation-submit'));
    expect(screen.getByTestId('moderation-confirm-consequence').textContent).toMatch(/12 months/i);
  });

  it('Confirm submits the action, code and TRIMMED rationale', async () => {
    const onSubmit = vi.fn(noop);
    render(<ModerationStrip moderation={moderation()} reasonCodes={REASON_CODES} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByTestId('moderation-action-suspend'));
    fireEvent.change(screen.getByTestId('moderation-reason-code'), {
      target: { value: 'r14-forgery' },
    });
    fireEvent.change(screen.getByTestId('moderation-rationale'), {
      target: { value: '  Documents confirmed forged.  ' },
    });
    fireEvent.click(screen.getByTestId('moderation-submit'));
    // `confirm` awaits onSubmit then setStates — wrap so React flushes inside act().
    await act(async () => {
      fireEvent.click(screen.getByTestId('moderation-confirm-submit'));
    });
    expect(onSubmit).toHaveBeenCalledWith({
      action: 'suspend',
      reasonCode: 'r14-forgery',
      rationale: 'Documents confirmed forged.',
    });
  });
});

describe('<ModerationHistory> — the read-only audit trail (AC9)', () => {
  const entry = {
    moderation_action_id: '22222222-2222-4222-8222-222222222222',
    action: 'suspend' as const,
    reason_code: 'r14-forgery' as const,
    actor_id: '33333333-3333-4333-8333-333333333333',
    actor_display: 'A. Trustee',
    rejoin_permitted_at: null,
    acted_at: '2026-08-02T00:00:00.000Z',
  };

  it('renders action · reason LABEL · actor_display', () => {
    render(<ModerationHistory entries={[entry]} reasonCodes={REASON_CODES} />);
    const list = screen.getByTestId('moderation-history');
    expect(list.textContent).toContain('Suspended');
    expect(list.textContent).toContain('Forgery or falsified documents (R14)');
    expect(list.textContent).toContain('A. Trustee');
  });

  it('NEVER renders a rationale or ciphertext — the DTO does not even carry it', () => {
    render(<ModerationHistory entries={[entry]} reasonCodes={REASON_CODES} />);
    const text = screen.getByTestId('moderation-history').textContent ?? '';
    expect(text).not.toMatch(/rationale/i);
    expect(text).not.toMatch(/enc:v1/);
  });

  it('shows the rejoin-permitted date on a termination row', () => {
    render(
      <ModerationHistory
        entries={[
          {
            ...entry,
            action: 'terminate',
            rejoin_permitted_at: '2027-08-02T00:00:00.000Z',
          },
        ]}
        reasonCodes={REASON_CODES}
      />,
    );
    expect(screen.getByTestId('moderation-history').textContent).toMatch(/rejoin permitted/i);
  });

  it('renders an explicit empty state, never a blank list', () => {
    render(<ModerationHistory entries={[]} reasonCodes={REASON_CODES} />);
    expect(screen.getByTestId('moderation-history-empty')).toBeInTheDocument();
  });
});
