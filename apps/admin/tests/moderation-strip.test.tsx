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
    // Story 10.20 (AC8) — ADDITIVE alongside `legal_actions`, never a filter on it.
    termination_available_at: null,
    entries: [],
    has_more: false,
    ...over,
  };
}

/**
 * A test-fixture mirror of the server's frozen registry (`GET …/moderation/reason-codes`) — the
 * presentational `<ModerationStrip>`/`<ModerationHistory>` take it as a prop now (review follow-up:
 * they used to read a hand-duplicated `i18n-en.ts` map instead of a server source).
 */
const REASON_CODES: ReasonCodeMetaDto[] = [
  { code: 'r7-contribution-discipline', applies_to: ['suspend', 'terminate'], niyamavali_ref: 'R7', label: 'Contribution discipline (R7)' , ordinarily_results_in: 'suspend' },
  { code: 'r14-forgery', applies_to: ['suspend', 'terminate'], niyamavali_ref: 'R14', label: 'Forgery or falsified documents (R14)' , ordinarily_results_in: 'suspend' },
  { code: 'r10a-parallel-org-office', applies_to: ['suspend', 'terminate'], niyamavali_ref: 'R10(A)', label: 'Office held in a parallel organisation (R10(A))' , ordinarily_results_in: 'suspend' },
  { code: 'concealment-confirmed', applies_to: ['suspend', 'terminate'], niyamavali_ref: 'FR-11', label: 'Concealment confirmed by State Trustee (FR-11)' , ordinarily_results_in: 'suspend' },
  { code: 'helpdesk-escalated-abuse', applies_to: ['suspend', 'terminate'], niyamavali_ref: 'FR-56', label: 'Abuse escalated from the helpdesk' , ordinarily_results_in: 'suspend' },
  { code: 'regulator-action', applies_to: ['suspend', 'terminate'], niyamavali_ref: 'FR-56', label: 'Regulatory or statutory action' , ordinarily_results_in: 'suspend' },
  { code: 'voluntary-pending-review', applies_to: ['suspend', 'terminate'], niyamavali_ref: 'FR-56', label: 'Voluntary pause pending review' , ordinarily_results_in: 'suspend' },
  { code: 'rule-clearance', applies_to: ['restore'], niyamavali_ref: 'R7(A)', label: 'Rule cleared — three consecutive contributions (R7(A))' , ordinarily_results_in: null },
  { code: 'trustee-discretion', applies_to: ['restore'], niyamavali_ref: 'R5(D)/R10(D)', label: 'Trustee discretion (R5(D)/R10(D))' , ordinarily_results_in: null },
  { code: 'moderation-error', applies_to: ['restore'], niyamavali_ref: 'FR-56', label: 'Moderation recorded in error' , ordinarily_results_in: null },
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
    // ⚠ Story 10.20 (AC6): a termination now carries the two-part escalation justification, so the
    // modal is unreachable without it. This test is about the CONSEQUENCE COPY, so the parts are
    // supplied as fixture rather than being what it asserts.
    fireEvent.change(screen.getByTestId('moderation-escalation-inadequacy'), {
      target: { value: 'Suspension would not protect the Trust because the misused access remains live.' },
    });
    fireEvent.change(screen.getByTestId('moderation-escalation-proportionality'), {
      target: { value: 'Termination fits the conduct: the forgery was deliberate and repeated.' },
    });
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
    // Story 10.20 (AC9/AC4) — every action carries its primary ground and its evidence references.
    grounds: [
      {
        ground_id: '55555555-5555-4555-8555-555555555555',
        code: 'r14-forgery' as const,
        is_primary: true,
        has_note: false,
        evidence_refs: [],
        supersedes_ground_id: null,
        superseded: false,
        added_by: '33333333-3333-4333-8333-333333333333',
        added_by_display: 'A. Trustee',
        added_at: '2026-08-02T00:00:00.000Z',
      },
    ],
    evidence_refs: [],
    r7a_restorations_used_snapshot: null,
    dwell_policy_version: null,
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


// ── Story 10.20 (AC6, AC4, AC10, AC12) — RENDER tests, not view-model tests ─────────────────────
//
// ⚠ THE TEST LAYER IS THE POINT HERE. `epics.md:3729` records the finding against Story 10.10:
// *"AC9's prose reached nobody because tests asserted the view-model and never the render"*. The
// two-part escalation test is only real if the FORM makes the parts separately answerable, so these
// assertions go through the rendered DOM.

describe('the two-part escalation justification (AC6) — asserted through the RENDER', () => {
  const codes = REASON_CODES;

  function renderTerminable(over: Partial<ModerationHistoryResponse> = {}) {
    return render(
      <ModerationStrip
        moderation={moderation({ current_status: 'suspended', legal_actions: ['terminate', 'restore'], ...over })}
        reasonCodes={codes}
        onSubmit={vi.fn()}
      />,
    );
  }

  it('⭐ renders TWO separate controls, and NO copy-across affordance between them', () => {
    renderTerminable();
    fireEvent.click(screen.getByTestId('moderation-action-terminate'));

    const a = screen.getByTestId('moderation-escalation-inadequacy');
    const b = screen.getByTestId('moderation-escalation-proportionality');
    // ⛔ Two DISTINCT elements with distinct ids — not one control, not a nested object.
    expect(a).not.toBe(b);
    expect(a.id).not.toBe(b.id);

    // ⛔ NO COPY-ACROSS: typing into (b) must leave (a) untouched, and no control offers to copy.
    fireEvent.change(b, { target: { value: 'Termination fits the conduct because the forgery was deliberate.' } });
    expect((a as HTMLTextAreaElement).value).toBe('');
    const strip = screen.getByTestId('moderation-strip');
    expect(strip.textContent ?? '').not.toMatch(/same as|copy|use above/i);
  });

  it('⛔ neither escalation control is rendered for a SUSPEND or a RESTORE', () => {
    render(
      <ModerationStrip
        moderation={moderation({ legal_actions: ['suspend'] })}
        reasonCodes={codes}
        onSubmit={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId('moderation-action-suspend'));
    expect(screen.queryByTestId('moderation-escalation')).toBeNull();
    expect(screen.queryByTestId('moderation-evidence')).toBeNull();
  });

  it('refuses a termination where part (a) merely RESTATES part (b)', () => {
    renderTerminable();
    fireEvent.click(screen.getByTestId('moderation-action-terminate'));
    fireEvent.change(screen.getByTestId('moderation-reason-code'), { target: { value: 'r14-forgery' } });
    fireEvent.change(screen.getByTestId('moderation-rationale'), { target: { value: 'Terminated by the Panel.' } });

    const restated = 'Termination fits the conduct because the forgery was deliberate and repeated.';
    fireEvent.change(screen.getByTestId('moderation-escalation-inadequacy'), { target: { value: restated } });
    fireEvent.change(screen.getByTestId('moderation-escalation-proportionality'), { target: { value: restated } });
    fireEvent.click(screen.getByTestId('moderation-submit'));

    // No confirmation modal — the request never leaves the client.
    expect(screen.queryByTestId('moderation-confirm-modal')).toBeNull();
    expect(screen.getByRole('alert').textContent).toContain('Part (a)');
  });

  it('refuses a termination missing either part, and one below the substance floor', () => {
    renderTerminable();
    fireEvent.click(screen.getByTestId('moderation-action-terminate'));
    fireEvent.change(screen.getByTestId('moderation-reason-code'), { target: { value: 'r14-forgery' } });
    fireEvent.change(screen.getByTestId('moderation-rationale'), { target: { value: 'Terminated by the Panel.' } });
    fireEvent.change(screen.getByTestId('moderation-escalation-inadequacy'), { target: { value: 'Suspension is not enough here because the access remains live.' } });
    fireEvent.click(screen.getByTestId('moderation-submit'));
    expect(screen.queryByTestId('moderation-confirm-modal')).toBeNull();

    // Present but too short — a floor exists to reject "n/a", not to judge reasoning.
    fireEvent.change(screen.getByTestId('moderation-escalation-proportionality'), { target: { value: 'n/a' } });
    fireEvent.click(screen.getByTestId('moderation-submit'));
    expect(screen.queryByTestId('moderation-confirm-modal')).toBeNull();
    expect(screen.getByRole('alert').textContent).toContain('40 characters');
  });
});

describe('evidence references (AC4) — structurally not a free-text box', () => {
  it('⛔ renders NO free-text evidence field; each row is a bounded kind + a restricted ref', () => {
    render(
      <ModerationStrip
        moderation={moderation({ current_status: 'suspended', legal_actions: ['terminate'] })}
        reasonCodes={REASON_CODES}
        onSubmit={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId('moderation-action-terminate'));
    fireEvent.click(screen.getByTestId('moderation-evidence-add'));

    // A SELECT for the kind — the vocabulary is bounded, so prose cannot be chosen.
    const kind = screen.getByTestId('moderation-evidence-kind-0') as HTMLSelectElement;
    expect(kind.tagName).toBe('SELECT');
    // An INPUT (not a textarea) for the ref — and prose in it is refused below.
    const ref = screen.getByTestId('moderation-evidence-ref-0') as HTMLInputElement;
    expect(ref.tagName).toBe('INPUT');
  });

  it('refuses a prose reference — REJECTED, never truncated to a prefix of the prose', () => {
    render(
      <ModerationStrip
        moderation={moderation({ current_status: 'suspended', legal_actions: ['terminate'] })}
        reasonCodes={REASON_CODES}
        onSubmit={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId('moderation-action-terminate'));
    fireEvent.change(screen.getByTestId('moderation-reason-code'), { target: { value: 'r14-forgery' } });
    fireEvent.change(screen.getByTestId('moderation-rationale'), { target: { value: 'Terminated by the Panel.' } });
    fireEvent.change(screen.getByTestId('moderation-escalation-inadequacy'), { target: { value: 'Suspension would not protect the Trust because the misused access remains live.' } });
    fireEvent.change(screen.getByTestId('moderation-escalation-proportionality'), { target: { value: 'Termination fits the conduct: the forgery was deliberate and repeated.' } });
    fireEvent.click(screen.getByTestId('moderation-evidence-add'));
    fireEvent.change(screen.getByTestId('moderation-evidence-ref-0'), { target: { value: 'the member admitted it' } });
    fireEvent.click(screen.getByTestId('moderation-submit'));

    expect(screen.queryByTestId('moderation-confirm-modal')).toBeNull();
    // ⛔ The typed value is NOT silently trimmed to the part before the first space.
    expect((screen.getByTestId('moderation-evidence-ref-0') as HTMLInputElement).value).toBe(
      'the member admitted it',
    );
  });
});

describe('the RULED console shape during the dwell (AC8/AC12, Q4.2)', () => {
  const DURING_DWELL = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString();

  function renderDuringDwell() {
    return render(
      <ModerationStrip
        moderation={moderation({
          current_status: 'suspended',
          legal_actions: ['terminate', 'restore'],
          termination_available_at: DURING_DWELL,
        })}
        reasonCodes={REASON_CODES}
        onSubmit={vi.fn()}
      />,
    );
  }

  it('⛔ the Terminate control stays VISIBLE AND ENABLED — it is NOT disabled until day 7', () => {
    renderDuringDwell();
    const btn = screen.getByTestId('moderation-action-terminate') as HTMLButtonElement;
    // The Panel ruled a THIRD shape, neither of the two the routing note offered: enabled, gated by
    // re-confirmation. `legal_actions` is not rewritten merely because the dwell exists.
    expect(btn.disabled).toBe(false);
  });

  it('⭐ the confirmation NAMES the open dwell and the immediate route, and requires the reason', () => {
    renderDuringDwell();
    fireEvent.click(screen.getByTestId('moderation-action-terminate'));
    fireEvent.change(screen.getByTestId('moderation-reason-code'), { target: { value: 'r14-forgery' } });
    fireEvent.change(screen.getByTestId('moderation-rationale'), { target: { value: 'Terminated by the Panel.' } });
    fireEvent.change(screen.getByTestId('moderation-escalation-inadequacy'), { target: { value: 'Suspension would not protect the Trust because the misused access remains live.' } });
    fireEvent.change(screen.getByTestId('moderation-escalation-proportionality'), { target: { value: 'Termination fits the conduct: the forgery was deliberate and repeated.' } });
    fireEvent.click(screen.getByTestId('moderation-submit'));

    const warning = screen.getByTestId('moderation-dwell-warning');
    // ⛔ NOT a generic "are you sure" — it states (i) the dwell is open and (ii) the route taken.
    expect(warning.textContent).toContain('seven-day dwell is still open');
    expect(warning.textContent).toMatch(/immediate-termination exception/i);
    // ⛔ The dialog obtains INFORMED INTENT; it does not grant authority.
    expect(warning.textContent).toMatch(/server decides/i);
    // And the instant is rendered where it is actually decision-relevant.
    expect(warning.textContent).toContain(new Date(DURING_DWELL).toLocaleString());

    // Confirming without a recorded reason is refused at the dialog.
    fireEvent.click(screen.getByTestId('moderation-confirm-submit'));
    expect(screen.getByTestId('moderation-confirm-error')).toBeTruthy();
  });

  it('renders NO dwell warning once the ordinary path has opened', () => {
    render(
      <ModerationStrip
        moderation={moderation({
          current_status: 'suspended',
          legal_actions: ['terminate'],
          termination_available_at: null,
        })}
        reasonCodes={REASON_CODES}
        onSubmit={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId('moderation-action-terminate'));
    fireEvent.change(screen.getByTestId('moderation-reason-code'), { target: { value: 'r14-forgery' } });
    fireEvent.change(screen.getByTestId('moderation-rationale'), { target: { value: 'Terminated by the Panel.' } });
    fireEvent.change(screen.getByTestId('moderation-escalation-inadequacy'), { target: { value: 'Suspension would not protect the Trust because the misused access remains live.' } });
    fireEvent.change(screen.getByTestId('moderation-escalation-proportionality'), { target: { value: 'Termination fits the conduct: the forgery was deliberate and repeated.' } });
    fireEvent.click(screen.getByTestId('moderation-submit'));
    expect(screen.getByTestId('moderation-confirm-modal')).toBeTruthy();
    expect(screen.queryByTestId('moderation-dwell-warning')).toBeNull();
  });
});

describe('ordinarilyResultsIn guidance (AC10)', () => {
  it('renders guidance for a moderation ground — as TEXT, never as a pre-selected action', () => {
    render(
      <ModerationStrip
        moderation={moderation({ legal_actions: ['suspend'] })}
        reasonCodes={REASON_CODES}
        onSubmit={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId('moderation-action-suspend'));
    fireEvent.change(screen.getByTestId('moderation-reason-code'), { target: { value: 'r14-forgery' } });
    expect(screen.getByTestId('moderation-reason-guidance').textContent).toContain('Ordinarily results in');
    // ⛔ Guidance must not MOVE the decision: the chosen action is still the one the operator picked.
    expect((screen.getByTestId('moderation-action-suspend') as HTMLButtonElement).getAttribute('aria-pressed')).toBe('true');
  });

  it('⛔ renders NOTHING for a restore ground — not "n/a", not an empty chip', () => {
    render(
      <ModerationStrip
        moderation={moderation({ current_status: 'suspended', legal_actions: ['restore'] })}
        reasonCodes={REASON_CODES}
        onSubmit={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId('moderation-action-restore'));
    fireEvent.change(screen.getByTestId('moderation-reason-code'), { target: { value: 'moderation-error' } });
    // `null` is the RATIFIED answer for a restore ground — a code that justifies no sanction carries
    // no sanction guidance — and the UI says nothing rather than inventing a placeholder.
    expect(screen.queryByTestId('moderation-reason-guidance')).toBeNull();
  });
});

describe('the Decision Note rename (AC12)', () => {
  it('the surface says "Decision Note", never "rationale"', () => {
    render(
      <ModerationStrip
        moderation={moderation({ legal_actions: ['suspend'] })}
        reasonCodes={REASON_CODES}
        onSubmit={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId('moderation-action-suspend'));
    const strip = screen.getByTestId('moderation-strip');
    expect(strip.textContent).toContain('Decision Note');
    // A UI still saying "rationale" would describe a field that no longer exists.
    expect(strip.textContent ?? '').not.toMatch(/rationale/i);
  });
});
