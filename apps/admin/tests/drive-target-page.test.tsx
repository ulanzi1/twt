// DriveTargetPage component/interaction tests (Story 11b.13, Task 5; AC3, AC4, AC5).
//
// The console half of `2026-09-04-190` cl.7. What is pinned here, and why each case exists:
//   · ⭐⭐ THE "SHOWN TO NOBODY" DISCLOSURE IS STANDING — present in EVERY state, ⛔ not only after a
//     save. It is the ONLY thing that can correct an operator who assumes the figure they type
//     becomes visible, because ⛔ NOTHING renders the target (Trap 3): there is no page anywhere
//     that would contradict them.
//   · ⭐⭐ A `pariwar_admin` — i.e. a 403 on the VISIBILITY read — sees ⛔ NO reveal switches AND
//     ⛔ NO error. AC5's *"visible only to a super_admin"*, satisfied by the SERVER's answer. ⛔ A
//     page error here would tell a Pariwar Admin the page is broken when it is working as ruled.
//   · ⭐ A `super_admin` sees both switches, and the ONE forbidden combination is refused in the
//     form (`2026-09-04-189` cl.3), ⛔ one-way — members-without-public is never refused.
//   · `configured: false` renders as its OWN explicit statement, for both resources — an unset
//     target and a small one are different facts, and Story 11b.14 renders NO bar for the first.
//   · ⭐⭐ THE FORM SENDS `expectedVersion` — the version ON SCREEN, ⛔ never `null` when a target
//     exists (`2026-09-05-201` cl.4). That is the control's entire point from its one caller.
//   · The version conflict gets its OWN copy, ⛔ not the generic "may not have been saved" — the
//     change was definitively NOT saved, and the advice is to reload and reconsider.
//   · `0` is refused by the form, ⛔ not submitted: it is a division by zero for the meter.

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DriveTargetResponse, DriveTargetVisibilityResponse } from '@twt/contracts';
import { ApiError } from '../src/api/client.js';
import { DriveTargetPage } from '../src/modules/drive-target/DriveTargetPage.js';
import { renderWithClient } from './_helpers.js';

const PARIWAR = '11111111-1111-1111-1111-111111111111';

function target(over: Partial<DriveTargetResponse> = {}): DriveTargetResponse {
  return {
    targetInr: null,
    configured: false,
    effectiveFrom: null,
    changedByDisplay: null,
    rationale: null,
    version: null,
    ...over,
  };
}

function visibility(
  over: Partial<DriveTargetVisibilityResponse> = {},
): DriveTargetVisibilityResponse {
  return {
    visibility: { revealToMembers: false, revealToPublic: false },
    configured: false,
    changedByDisplay: null,
    rationale: null,
    updatedAt: null,
    ...over,
  };
}

const client = vi.hoisted(() => ({
  getDriveTarget: vi.fn(),
  setDriveTarget: vi.fn(),
  getDriveTargetVisibility: vi.fn(),
  setDriveTargetVisibility: vi.fn(),
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

/** The common case: a Pariwar Admin — the target read succeeds, the visibility read 403s. */
function asPariwarAdmin(t: DriveTargetResponse = target()): void {
  client.getDriveTarget.mockResolvedValue(t);
  client.getDriveTargetVisibility.mockRejectedValue(
    new ApiError(403, 'rbac.permission_denied', 'Forbidden'),
  );
}

/** A Super Admin — both reads succeed. */
function asSuperAdmin(
  t: DriveTargetResponse = target(),
  v: DriveTargetVisibilityResponse = visibility(),
): void {
  client.getDriveTarget.mockResolvedValue(t);
  client.getDriveTargetVisibility.mockResolvedValue(v);
}

describe('DriveTargetPage', () => {
  it('⭐⭐ renders the "shown to nobody" disclosure in the UNCONFIGURED state', async () => {
    asPariwarAdmin();
    renderWithClient(<DriveTargetPage pariwarId={PARIWAR} />);
    const notice = await screen.findByTestId('drive-target-hidden-notice');
    expect(notice.textContent).toMatch(/not shown to anyone/i);
    expect(notice.textContent).toMatch(/never the same thing as revealing/i);
  });

  it('⭐⭐ …and in the CONFIGURED state too — it is STANDING copy, ⛔ not a success message', async () => {
    // ⚠ A disclosure that appears only after a save satisfies the letter of "the page discloses it"
    // while failing its whole purpose, which is that the operator reads it BEFORE acting.
    asPariwarAdmin(
      target({ targetInr: 500_000, configured: true, version: 3, changedByDisplay: 'Asha Verma' }),
    );
    renderWithClient(<DriveTargetPage pariwarId={PARIWAR} />);
    expect((await screen.findByTestId('drive-target-hidden-notice')).textContent).toMatch(
      /not shown to anyone/i,
    );
    expect((await screen.findByTestId('drive-target-amount-shown')).textContent).toContain(
      '5,00,000',
    );
  });

  it('states `configured: false` EXPLICITLY — ⛔ never a blank field the operator must interpret', async () => {
    asPariwarAdmin();
    renderWithClient(<DriveTargetPage pariwarId={PARIWAR} />);
    const unset = await screen.findByTestId('drive-target-unconfigured');
    expect(unset.textContent).toMatch(/no target has ever been recorded/i);
  });

  it('⭐⭐ a `pariwar_admin` (403 on the visibility read) sees NO reveal switches AND NO error', async () => {
    asPariwarAdmin(target({ targetInr: 500_000, configured: true, version: 1 }));
    renderWithClient(<DriveTargetPage pariwarId={PARIWAR} />);
    // The target half renders normally…
    await screen.findByTestId('drive-target-amount-shown');
    // …and the reveal half is simply ABSENT. ⛔ AC5 satisfied by the SERVER's answer, ⛔ never by a
    // client-side role check (which could not work: both keys are pariwar-dimension and never appear
    // in the session's global grant set).
    await waitFor(() => {
      expect(screen.queryByTestId('drive-target-reveal-members')).toBeNull();
    });
    // ⛔⛔ AND NO PAGE ERROR. A 403 here is an ORDINARY outcome; rendering it as an error would tell
    // a Pariwar Admin the page is broken when it is working exactly as `-190` cl.7(c) rules.
    expect(screen.queryByTestId('drive-target-reveal-error')).toBeNull();
    expect(screen.queryByTestId('drive-target-status-error')).toBeNull();
  });

  it('⭐ a `super_admin` sees BOTH switches, independently', async () => {
    asSuperAdmin(
      target({ targetInr: 500_000, configured: true, version: 1 }),
      visibility({
        visibility: { revealToMembers: true, revealToPublic: false },
        configured: true,
        changedByDisplay: 'Kalpana Bharti',
        updatedAt: '2026-09-06T00:00:00.000Z',
      }),
    );
    renderWithClient(<DriveTargetPage pariwarId={PARIWAR} />);
    const members = (await screen.findByTestId('drive-target-reveal-members')) as HTMLInputElement;
    const publicly = (await screen.findByTestId('drive-target-reveal-public')) as HTMLInputElement;
    // ⭐ The form opens on the TRUTH, ⛔ not on a constant.
    expect(members.checked).toBe(true);
    expect(publicly.checked).toBe(false);
  });

  it('⭐⭐ REFUSES public-revealed-while-member-hidden in the form (⛔ one-way)', async () => {
    asSuperAdmin(target({ targetInr: 500_000, configured: true, version: 1 }), visibility());
    renderWithClient(<DriveTargetPage pariwarId={PARIWAR} />);
    const publicly = await screen.findByTestId('drive-target-reveal-public');
    await userEvent.click(publicly);

    expect((await screen.findByTestId('drive-target-reveal-order-error')).textContent).toMatch(
      /cannot be public while it is hidden from members/i,
    );
    const submit = (await screen.findByTestId('drive-target-reveal-submit')) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    // ⚠ The client guard is a COURTESY; the boundary is the domain refusal AND a DB CHECK. This
    // asserts the courtesy exists, ⛔ not that it is the enforcement.
    expect(client.setDriveTargetVisibility).not.toHaveBeenCalled();
  });

  it('⭐ …and members-WITHOUT-public is allowed — the ordering is ONE-WAY', async () => {
    asSuperAdmin(target({ targetInr: 500_000, configured: true, version: 1 }), visibility());
    client.setDriveTargetVisibility.mockResolvedValue(
      visibility({ visibility: { revealToMembers: true, revealToPublic: false }, configured: true }),
    );
    renderWithClient(<DriveTargetPage pariwarId={PARIWAR} />);
    await userEvent.click(await screen.findByTestId('drive-target-reveal-members'));
    await userEvent.type(
      await screen.findByTestId('drive-target-reveal-rationale'),
      'Members may see it.',
    );
    await userEvent.click(await screen.findByTestId('drive-target-reveal-submit'));

    await waitFor(() => {
      expect(client.setDriveTargetVisibility).toHaveBeenCalledWith(PARIWAR, {
        visibility: { revealToMembers: true, revealToPublic: false },
        rationale: 'Members may see it.',
      });
    });
  });

  it('⭐⭐ the target form sends `expectedVersion` — the version ON SCREEN, ⛔ never null', async () => {
    // ⛔⛔ `2026-09-05-201` cl.4's control from its ONE caller. Defaulting this to `null` when a
    // target exists is precisely the stale write the guard refuses, and would defeat the control.
    asPariwarAdmin(target({ targetInr: 500_000, configured: true, version: 7 }));
    client.setDriveTarget.mockResolvedValue(
      target({ targetInr: 750_000, configured: true, version: 8 }),
    );
    renderWithClient(<DriveTargetPage pariwarId={PARIWAR} />);

    const amount = await screen.findByTestId('drive-target-amount');
    await userEvent.clear(amount);
    await userEvent.type(amount, '750000');
    await userEvent.type(await screen.findByTestId('drive-target-rationale'), 'Board resolution.');
    await userEvent.click(await screen.findByTestId('drive-target-submit'));

    await waitFor(() => {
      expect(client.setDriveTarget).toHaveBeenCalledWith(PARIWAR, {
        targetInr: 750_000,
        rationale: 'Board resolution.',
        expectedVersion: 7,
      });
    });
  });

  it('sends `expectedVersion: null` on the FIRST write — a REAL value, ⛔ not an omission', async () => {
    asPariwarAdmin(target());
    client.setDriveTarget.mockResolvedValue(
      target({ targetInr: 500_000, configured: true, version: 1 }),
    );
    renderWithClient(<DriveTargetPage pariwarId={PARIWAR} />);

    await userEvent.type(await screen.findByTestId('drive-target-amount'), '500000');
    await userEvent.type(await screen.findByTestId('drive-target-rationale'), 'First target.');
    await userEvent.click(await screen.findByTestId('drive-target-submit'));

    await waitFor(() => {
      expect(client.setDriveTarget).toHaveBeenCalledWith(PARIWAR, {
        targetInr: 500_000,
        rationale: 'First target.',
        expectedVersion: null,
      });
    });
  });

  it('⭐⭐ REFUSES `0` in the form — ⛔ it is not "unset", it is a division by zero', async () => {
    asPariwarAdmin(target());
    renderWithClient(<DriveTargetPage pariwarId={PARIWAR} />);
    await userEvent.type(await screen.findByTestId('drive-target-amount'), '0');
    await userEvent.type(await screen.findByTestId('drive-target-rationale'), 'Zero target.');

    const submit = (await screen.findByTestId('drive-target-submit')) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    expect(client.setDriveTarget).not.toHaveBeenCalled();
  });

  it('⭐ a VERSION CONFLICT gets its own copy, ⛔ not the generic "may not have been saved"', async () => {
    // ⚠ TWO different 409s share a status and must NOT share copy. This one was definitively NOT
    // saved — and it was refused precisely so it would not quietly undo somebody else's change.
    asPariwarAdmin(target({ targetInr: 500_000, configured: true, version: 1 }));
    client.setDriveTarget.mockRejectedValue(
      new ApiError(409, 'pariwar.drive_target_version_conflict', 'conflict'),
    );
    renderWithClient(<DriveTargetPage pariwarId={PARIWAR} />);

    const amount = await screen.findByTestId('drive-target-amount');
    await userEvent.clear(amount);
    await userEvent.type(amount, '600000');
    await userEvent.type(await screen.findByTestId('drive-target-rationale'), 'Racing.');
    await userEvent.click(await screen.findByTestId('drive-target-submit'));

    const err = await screen.findByTestId('drive-target-submit-error');
    expect(err.textContent).toMatch(/somebody else changed the target/i);
    expect(err.textContent).not.toMatch(/may not have been saved/i);
  });

  it('the OTHER 409 (no display name) keeps its own copy — same status, different fact', async () => {
    asPariwarAdmin(target({ targetInr: 500_000, configured: true, version: 1 }));
    client.setDriveTarget.mockRejectedValue(
      new ApiError(409, 'admin.display_name_missing', 'no display name'),
    );
    renderWithClient(<DriveTargetPage pariwarId={PARIWAR} />);

    const amount = await screen.findByTestId('drive-target-amount');
    await userEvent.clear(amount);
    await userEvent.type(amount, '600000');
    await userEvent.type(await screen.findByTestId('drive-target-rationale'), 'Attempt.');
    await userEvent.click(await screen.findByTestId('drive-target-submit'));

    expect((await screen.findByTestId('drive-target-submit-error')).textContent).toMatch(
      /no display name set/i,
    );
  });

  it('⭐ the reveal form says NOTHING DISPLAYS THIS YET — so a reveal that shows nothing is not read as a failure', async () => {
    asSuperAdmin(target({ targetInr: 500_000, configured: true, version: 1 }), visibility());
    renderWithClient(<DriveTargetPage pariwarId={PARIWAR} />);
    expect((await screen.findByTestId('drive-target-reveal-no-consumer')).textContent).toMatch(
      /no page displays this target yet/i,
    );
  });

  it('a 403 on the TARGET read surfaces as a readable page error naming the ruling', async () => {
    client.getDriveTarget.mockRejectedValue(
      new ApiError(403, 'rbac.permission_denied', 'Forbidden'),
    );
    client.getDriveTargetVisibility.mockRejectedValue(
      new ApiError(403, 'rbac.permission_denied', 'Forbidden'),
    );
    renderWithClient(<DriveTargetPage pariwarId={PARIWAR} />);
    const err = await screen.findByTestId('drive-target-status-error');
    // ⭐ Copy that names the RULING — "you lack a permission" invites a catalog edit; "the Trustee
    // Panel ruled that revealing is held centrally" does not.
    expect(err.textContent).toMatch(/Trustee Panel ruled/i);
  });
});
