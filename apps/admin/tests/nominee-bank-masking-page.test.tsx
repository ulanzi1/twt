// MaskingSchedulePage component/interaction tests (Story 11b.3a, Task 5; AC5, AC6).
//
// The console half of `2026-08-28-160` cl.10(b)-(d)'s knob. What is pinned here, and why each case
// exists:
//   · the AC6 propagation disclosure is STANDING — present in EVERY state, ⛔ not only after a
//     successful change. A conditional disclosure satisfies the letter of "the page discloses it"
//     while failing its whole purpose, which is that the operator reads it BEFORE acting — and here
//     the thing being served stale is a FULL ACCOUNT NUMBER.
//   · ALL THREE ruled settings are reachable, and `0` is ⛔ not "unset": cl.10(b) forbids treating
//     immediate masking as the code's assumption, and a falsy check on a day count is exactly how
//     that would happen by accident.
//   · `configured: false` renders as its OWN explicit statement — under `D8-default` FAIL-OPEN
//     (`2026-09-02-179` cl.1) it means the complete details stay visible, and an operator must not
//     read silence as safety.
//   · `permanent` says it covers the ACTIVE campaign — the terminal rung (`2026-09-02-183` cl.4).
//   · a 403 surfaces as a readable page error naming the RULING, and ⛔ does NOT hide the form
//     (there is no client-side capability check, and there must not be one).

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { NomineeBankMaskingScheduleResponse } from '@twt/contracts';
import { ApiError } from '../src/api/client.js';
import { MaskingSchedulePage } from '../src/modules/nominee-bank-masking/MaskingSchedulePage.js';
import { renderWithClient } from './_helpers.js';

const PARIWAR = '11111111-1111-1111-1111-111111111111';

function schedule(
  over: Partial<NomineeBankMaskingScheduleResponse> = {},
): NomineeBankMaskingScheduleResponse {
  return {
    setting: null,
    configured: false,
    effectiveFrom: null,
    changedByDisplay: null,
    rationale: null,
    version: null,
    ...over,
  };
}

const client = vi.hoisted(() => ({
  getNomineeBankMaskingSchedule: vi.fn(),
  setNomineeBankMaskingSchedule: vi.fn(),
}));

vi.mock('../src/api/client.js', async (orig) => {
  const actual = await orig<typeof import('../src/api/client.js')>();
  return { ...actual, ...client };
});

// ⛔ The mocks are module-scoped, so a `not.toHaveBeenCalled()` assertion would otherwise see calls
// made by an EARLIER test and fail for the wrong reason (or, worse, pass for the wrong reason).
beforeEach(() => {
  vi.clearAllMocks();
});

function renderPage(current: NomineeBankMaskingScheduleResponse): void {
  client.getNomineeBankMaskingSchedule.mockResolvedValue(current);
  renderWithClient(<MaskingSchedulePage pariwarId={PARIWAR} />);
}

describe('MaskingSchedulePage — the AC6 non-immediacy disclosure is STANDING', () => {
  it('⭐ renders the propagation notice before any action is taken, and it names the floor', async () => {
    renderPage(schedule({ setting: { mode: 'permanent' }, configured: true, version: 1 }));
    const notice = await screen.findByTestId('nominee-bank-masking-propagation-notice');
    expect(notice.textContent).toMatch(/s-maxage=300/);
    expect(notice.textContent).toMatch(/five-minute|five minutes/i);
    // ⭐ AND IT NAMES WHAT IS SERVED STALE. On this control that is the whole difference from the
    // sibling kill switch: an operator must know the number itself is still going out.
    expect(notice.textContent).toMatch(/account number/i);
  });

  // ⛔ The regression that matters: a disclosure rendered only inside the success branch would pass a
  // naive "the page discloses it" check while the operator never sees it before acting.
  it('⛔ renders it while the schedule is still LOADING — not gated on any data or outcome', () => {
    client.getNomineeBankMaskingSchedule.mockReturnValue(new Promise(() => {}));
    renderWithClient(<MaskingSchedulePage pariwarId={PARIWAR} />);
    expect(screen.getByTestId('nominee-bank-masking-propagation-notice')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toMatch(/loading/i);
  });

  it('⛔ renders it even when the schedule read FAILED', async () => {
    client.getNomineeBankMaskingSchedule.mockRejectedValue(
      new ApiError(500, 'internal.error', 'boom'),
    );
    renderWithClient(<MaskingSchedulePage pariwarId={PARIWAR} />);
    await screen.findByTestId('nominee-bank-masking-status-error');
    expect(screen.getByTestId('nominee-bank-masking-propagation-notice')).toBeTruthy();
  });
});

describe('MaskingSchedulePage — the state an operator is shown', () => {
  it('⭐⭐ `configured: false` says the details STAY VISIBLE — ⛔ silence is not safety', async () => {
    // `D8-default` FAIL-OPEN (`2026-09-02-179` cl.1). ⚠⛔ Its cost is part of the ruling: authority is
    // CENTRAL, so a Pariwar cannot set its own window ⇒ this governs EVERY Pariwar until the Trust
    // acts. An operator must be able to read that off the page.
    renderPage(schedule());
    const el = await screen.findByTestId('nominee-bank-masking-unconfigured');
    expect(el.textContent).toMatch(/stay visible/i);
    // ⛔ And it says nobody CHOSE it — an unconfigured Pariwar and a deliberate choice are different
    // facts, and conflating them is how a default gets mistaken for a decision.
    expect(el.textContent).toMatch(/Nobody has chosen this/i);
  });

  it('⭐ `after_days: 0` gets its OWN sentence — ⛔ never "stay visible for 0 days"', async () => {
    renderPage(
      schedule({ setting: { mode: 'after_days', maskAfterDays: 0 }, configured: true, version: 3 }),
    );
    const el = await screen.findByTestId('nominee-bank-masking-setting');
    expect(el.textContent).toMatch(/as soon as a drive closes/i);
    expect(el.textContent).not.toMatch(/0 days/);
  });

  it('⭐ `after_days: N` interpolates the day count', async () => {
    renderPage(
      schedule({ setting: { mode: 'after_days', maskAfterDays: 30 }, configured: true, version: 4 }),
    );
    const el = await screen.findByTestId('nominee-bank-masking-setting');
    expect(el.textContent).toMatch(/30 days/);
    // ⛔ The token must be SUBSTITUTED, ⛔ not left as a brace — the 11a.2 `{{max}}` defect class.
    expect(el.textContent).not.toMatch(/[{}]/);
  });

  it('⭐⭐ `permanent` says it covers the ACTIVE campaign — the terminal rung', async () => {
    // ⚠⛔ AN AUTHORING READING (`2026-09-02-183` cl.4), ⛔ not a Panel ruling — which is exactly why
    // the copy must be explicit: an operator choosing it has to know it also hides the details while
    // a drive is still collecting. ⛔ Do not soften this to "after a drive closes".
    renderPage(schedule({ setting: { mode: 'permanent' }, configured: true, version: 5 }));
    const el = await screen.findByTestId('nominee-bank-masking-setting');
    expect(el.textContent).toMatch(/at all times/i);
    expect(el.textContent).toMatch(/still collecting/i);
  });

  it('shows WHO changed it, WHEN it came into force, WHY, and the version', async () => {
    renderPage(
      schedule({
        setting: { mode: 'after_days', maskAfterDays: 30 },
        configured: true,
        changedByDisplay: 'Asha Verma',
        rationale: 'Board resolution of 12 September',
        effectiveFrom: '2026-09-01T10:00:00.000Z',
        version: 2,
      }),
    );
    expect((await screen.findByTestId('nominee-bank-masking-changed-by')).textContent).toBe('Asha Verma');
    expect(screen.getByTestId('nominee-bank-masking-rationale-shown').textContent).toMatch(/Board resolution/);
    expect(screen.getByTestId('nominee-bank-masking-version').textContent).toBe('2');
  });
});

describe('MaskingSchedulePage — the change form', () => {
  it('⭐⭐ ALL THREE ruled settings are reachable, and `0` submits as a REAL value', async () => {
    // ⛔⛔ THE REGRESSION THIS GUARDS: a falsy check on the day count would turn the STRICTEST day
    // setting into "no setting", which under FAIL-OPEN publishes a full account number. cl.10(b)
    // forbids the code assuming immediate masking; `0` must travel as the number 0.
    const user = userEvent.setup();
    client.setNomineeBankMaskingSchedule.mockResolvedValue(
      schedule({ setting: { mode: 'after_days', maskAfterDays: 0 }, configured: true, version: 1 }),
    );
    renderPage(schedule());
    await screen.findByTestId('nominee-bank-masking-submit');

    await user.type(screen.getByTestId('nominee-bank-masking-rationale'), 'Board resolution');
    await user.click(screen.getByTestId('nominee-bank-masking-submit'));

    await waitFor(() => expect(client.setNomineeBankMaskingSchedule).toHaveBeenCalledTimes(1));
    expect(client.setNomineeBankMaskingSchedule.mock.calls[0]![1]).toEqual({
      setting: { mode: 'after_days', maskAfterDays: 0 },
      rationale: 'Board resolution',
    });
  });

  it('⭐ submits `permanent` when that mode is chosen — ⛔ and no day count rides along', async () => {
    const user = userEvent.setup();
    client.setNomineeBankMaskingSchedule.mockResolvedValue(
      schedule({ setting: { mode: 'permanent' }, configured: true, version: 1 }),
    );
    renderPage(schedule());
    await screen.findByTestId('nominee-bank-masking-submit');

    await user.click(screen.getByTestId('nominee-bank-masking-mode-permanent'));
    await user.type(screen.getByTestId('nominee-bank-masking-rationale'), 'Board resolution');
    await user.click(screen.getByTestId('nominee-bank-masking-submit'));

    await waitFor(() => expect(client.setNomineeBankMaskingSchedule).toHaveBeenCalledTimes(1));
    // ⛔ The union's `permanent` arm carries NO `maskAfterDays` — a stray one would fail `.strict()`
    // at the API, but sending it at all means the form is not modelling the ruled shape.
    expect(client.setNomineeBankMaskingSchedule.mock.calls[0]![1]).toEqual({
      setting: { mode: 'permanent' },
      rationale: 'Board resolution',
    });
  });

  it('⭐ submits an N-day window', async () => {
    const user = userEvent.setup();
    client.setNomineeBankMaskingSchedule.mockResolvedValue(
      schedule({ setting: { mode: 'after_days', maskAfterDays: 30 }, configured: true, version: 1 }),
    );
    renderPage(schedule());
    await screen.findByTestId('nominee-bank-masking-submit');

    await user.clear(screen.getByTestId('nominee-bank-masking-days'));
    await user.type(screen.getByTestId('nominee-bank-masking-days'), '30');
    await user.type(screen.getByTestId('nominee-bank-masking-rationale'), 'Board resolution');
    await user.click(screen.getByTestId('nominee-bank-masking-submit'));

    await waitFor(() => expect(client.setNomineeBankMaskingSchedule).toHaveBeenCalledTimes(1));
    expect(client.setNomineeBankMaskingSchedule.mock.calls[0]![1]).toEqual({
      setting: { mode: 'after_days', maskAfterDays: 30 },
      rationale: 'Board resolution',
    });
  });

  it('⛔ a BLANK day field does NOT submit as 0 — it is refused', async () => {
    // ⚠ `Number('')` is 0, so a coercing read would silently submit the strictest setting under the
    // guise of a default. ⛔ The one thing this control must never do by accident.
    const user = userEvent.setup();
    renderPage(schedule());
    await screen.findByTestId('nominee-bank-masking-submit');

    await user.clear(screen.getByTestId('nominee-bank-masking-days'));
    await user.type(screen.getByTestId('nominee-bank-masking-rationale'), 'Board resolution');
    expect(screen.getByTestId('nominee-bank-masking-submit')).toHaveProperty('disabled', true);
    await user.click(screen.getByTestId('nominee-bank-masking-submit'));
    expect(client.setNomineeBankMaskingSchedule).not.toHaveBeenCalled();
  });

  it('⛔ a day count above the data-sanity ceiling is refused', async () => {
    const user = userEvent.setup();
    renderPage(schedule());
    await screen.findByTestId('nominee-bank-masking-submit');

    await user.clear(screen.getByTestId('nominee-bank-masking-days'));
    await user.type(screen.getByTestId('nominee-bank-masking-days'), '999999999');
    await user.type(screen.getByTestId('nominee-bank-masking-rationale'), 'Board resolution');
    expect(screen.getByTestId('nominee-bank-masking-submit')).toHaveProperty('disabled', true);
    expect(client.setNomineeBankMaskingSchedule).not.toHaveBeenCalled();
  });

  it('⛔ a 403 shows the RULING, and ⛔ does NOT hide the form', async () => {
    // ⚠ There is no client-side capability check and there must not be one — the grant is
    // pariwar-dimension and never appears in the session's global set. ⭐ And the copy names the
    // ruling rather than the permission: "you lack a permission" invites a catalog edit, and
    // "the Panel ruled this is held centrally" does not.
    const user = userEvent.setup();
    client.setNomineeBankMaskingSchedule.mockRejectedValue(
      new ApiError(403, 'forbidden', 'nope'),
    );
    renderPage(schedule());
    await screen.findByTestId('nominee-bank-masking-submit');

    await user.type(screen.getByTestId('nominee-bank-masking-rationale'), 'Board resolution');
    await user.click(screen.getByTestId('nominee-bank-masking-submit'));

    const err = await screen.findByTestId('nominee-bank-masking-submit-error');
    expect(err.textContent).toMatch(/super administrator/i);
    expect(err.textContent).toMatch(/centrally/i);
    expect(screen.getByTestId('nominee-bank-masking-submit')).toBeTruthy();
  });

  it('⭐ the success line names the CATCH-UP GAP rather than papering over it', async () => {
    const user = userEvent.setup();
    client.setNomineeBankMaskingSchedule.mockResolvedValue(
      schedule({ setting: { mode: 'permanent' }, configured: true, version: 1 }),
    );
    renderPage(schedule());
    await screen.findByTestId('nominee-bank-masking-submit');

    await user.click(screen.getByTestId('nominee-bank-masking-mode-permanent'));
    await user.type(screen.getByTestId('nominee-bank-masking-rationale'), 'Board resolution');
    await user.click(screen.getByTestId('nominee-bank-masking-submit'));

    const saved = await screen.findByTestId('nominee-bank-masking-saved');
    expect(saved.textContent).toMatch(/catch up/i);
    // ⛔ The rationale field is CLEARED, so a prior submit's text cannot be silently resubmitted as
    // the justification for a DIFFERENT setting on the very next click.
    expect(screen.getByTestId('nominee-bank-masking-rationale')).toHaveProperty('value', '');
  });
});
