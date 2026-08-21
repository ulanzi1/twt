// DirectoryPublicationPage component/interaction tests (Story 10.30, Task 7; AC3, AC5).
//
// The console half of the LAUNCH GATE Decision `2026-08-21-147` cl.1 placed on the public Member
// Directory. What is pinned here, and why each case exists:
//   · the AC5 propagation disclosure is STANDING — present in EVERY state, ⛔ not only after a
//     successful flip. A conditional disclosure satisfies the letter of "the page discloses it" while
//     failing its whole purpose, which is that the operator reads it BEFORE acting.
//   · BOTH directions are reachable from the page (`setDirectoryPublicationEnabled` is symmetric by
//     construction; a UI that only offers one of them silently un-does that).
//   · `configured: false` renders as its own explicit statement — an unconfigured Pariwar and a
//     deliberately re-enabled one both show `enabled: true` and are different facts.
//   · a 403 surfaces as a readable page error and ⛔ does NOT hide the form (Trap 3 — there is no
//     client-side capability check, and there must not be one).
//   · the client's disable-until-non-empty is a COURTESY. It is asserted here as UI behaviour, and
//     the live-DB spec separately proves the server rejects a whitespace rationale with a 400 — the
//     real boundary.

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DirectoryPublicationStatusResponse } from '@twt/contracts';
import { ApiError } from '../src/api/client.js';
import { DirectoryPublicationPage } from '../src/modules/directory-publication/DirectoryPublicationPage.js';
import { renderWithClient } from './_helpers.js';

const PARIWAR = '11111111-1111-1111-1111-111111111111';

function status(
  over: Partial<DirectoryPublicationStatusResponse> = {},
): DirectoryPublicationStatusResponse {
  return {
    enabled: true,
    configured: false,
    changedByDisplay: null,
    rationale: null,
    updatedAt: null,
    ...over,
  };
}

const client = vi.hoisted(() => ({
  getDirectoryPublicationStatus: vi.fn(),
  setDirectoryPublicationStatus: vi.fn(),
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

function renderPage(current: DirectoryPublicationStatusResponse): void {
  client.getDirectoryPublicationStatus.mockResolvedValue(current);
  renderWithClient(<DirectoryPublicationPage pariwarId={PARIWAR} />);
}

describe('DirectoryPublicationPage — the AC5 non-immediacy disclosure is STANDING', () => {
  it('⭐ renders the propagation notice on a PUBLISHED Pariwar, before any action is taken', async () => {
    renderPage(status({ enabled: true, configured: true, changedByDisplay: 'Asha Verma', rationale: 'r', updatedAt: '2026-08-21T10:00:00.000Z' }));
    const notice = await screen.findByTestId('directory-publication-propagation-notice');
    expect(notice.textContent).toMatch(/s-maxage=300/);
    expect(notice.textContent).toMatch(/five-minute|five minutes/i);
  });

  it('renders it on an UNPUBLISHED Pariwar too', async () => {
    renderPage(status({ enabled: false, configured: true, changedByDisplay: 'Asha Verma', rationale: 'pulled', updatedAt: '2026-08-21T10:00:00.000Z' }));
    expect(await screen.findByTestId('directory-publication-propagation-notice')).toBeTruthy();
  });

  // ⛔ The regression that matters: a disclosure rendered only inside the success branch would pass a
  // naive "the page discloses it" check while the operator never sees it before acting.
  it('⛔ renders it while the status is still LOADING — it is not gated on any data or outcome', () => {
    client.getDirectoryPublicationStatus.mockReturnValue(new Promise(() => {}));
    renderWithClient(<DirectoryPublicationPage pariwarId={PARIWAR} />);
    expect(screen.getByTestId('directory-publication-propagation-notice')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toMatch(/loading/i);
  });

  it('⛔ renders it even when the status read FAILED', async () => {
    client.getDirectoryPublicationStatus.mockRejectedValue(new ApiError(500, 'internal.error', 'boom'));
    renderWithClient(<DirectoryPublicationPage pariwarId={PARIWAR} />);
    await screen.findByTestId('directory-publication-status-error');
    expect(screen.getByTestId('directory-publication-propagation-notice')).toBeTruthy();
  });
});

describe('DirectoryPublicationPage — current state', () => {
  it('shows the last-changed actor, rationale and timestamp for a CONFIGURED Pariwar', async () => {
    renderPage(
      status({
        enabled: false,
        configured: true,
        changedByDisplay: 'Asha Verma',
        rationale: 'Pulled pending a privacy review.',
        updatedAt: '2026-08-21T10:00:00.000Z',
      }),
    );
    expect((await screen.findByTestId('directory-publication-state')).textContent).toMatch(/not published/i);
    expect(screen.getByTestId('directory-publication-changed-by').textContent).toBe('Asha Verma');
    expect(screen.getByTestId('directory-publication-rationale-shown').textContent).toBe(
      'Pulled pending a privacy review.',
    );
    expect(screen.getByTestId('directory-publication-changed-at').textContent).not.toBe('—');
  });

  // ⭐ `configured: false` is its OWN statement. Both this and a deliberately re-enabled Pariwar
  // report `enabled: true`; the operator is told which one they are looking at.
  it('⭐ distinguishes an UNCONFIGURED Pariwar from a deliberately re-enabled one', async () => {
    renderPage(status({ enabled: true, configured: false }));
    expect(await screen.findByTestId('directory-publication-unconfigured')).toBeTruthy();
    expect(screen.queryByTestId('directory-publication-changed-by')).toBeNull();
  });

  it('a re-enabled Pariwar shows its attribution, NOT the unconfigured line', async () => {
    renderPage(
      status({ enabled: true, configured: true, changedByDisplay: 'Asha Verma', rationale: 'Review cleared.', updatedAt: '2026-08-21T10:00:00.000Z' }),
    );
    expect(await screen.findByTestId('directory-publication-changed-by')).toBeTruthy();
    expect(screen.queryByTestId('directory-publication-unconfigured')).toBeNull();
  });
});

describe('DirectoryPublicationPage — the flip form (BOTH directions)', () => {
  it('from PUBLISHED, the submit offers to WITHHOLD and sends enabled:false', async () => {
    renderPage(status({ enabled: true, configured: false }));
    client.setDirectoryPublicationStatus.mockResolvedValue(
      status({ enabled: false, configured: true, changedByDisplay: 'Asha Verma', rationale: 'pulled', updatedAt: '2026-08-21T10:00:00.000Z' }),
    );

    const submit = await screen.findByTestId('directory-publication-submit');
    expect(submit.textContent).toMatch(/withhold/i);
    await userEvent.type(screen.getByTestId('directory-publication-rationale'), 'Pulled at the Pariwar request.');
    await userEvent.click(submit);

    await waitFor(() => expect(client.setDirectoryPublicationStatus).toHaveBeenCalled());
    expect(client.setDirectoryPublicationStatus).toHaveBeenCalledWith(PARIWAR, {
      enabled: false,
      rationale: 'Pulled at the Pariwar request.',
    });
  });

  // ⭐ The reverse. `setDirectoryPublicationEnabled` moves in BOTH directions by construction; a page
  // that only offered the disable would silently strip half the mechanism.
  it('⭐ from UNPUBLISHED, the submit offers to PUBLISH and sends enabled:true', async () => {
    renderPage(status({ enabled: false, configured: true, changedByDisplay: 'Asha Verma', rationale: 'pulled', updatedAt: '2026-08-21T10:00:00.000Z' }));
    client.setDirectoryPublicationStatus.mockResolvedValue(status({ enabled: true, configured: true, changedByDisplay: 'Asha Verma', rationale: 'cleared', updatedAt: '2026-08-21T11:00:00.000Z' }));

    const submit = await screen.findByTestId('directory-publication-submit');
    expect(submit.textContent).toMatch(/publish/i);
    await userEvent.type(screen.getByTestId('directory-publication-rationale'), 'Privacy review cleared.');
    await userEvent.click(submit);

    await waitFor(() => expect(client.setDirectoryPublicationStatus).toHaveBeenCalled());
    expect(client.setDirectoryPublicationStatus).toHaveBeenCalledWith(PARIWAR, {
      enabled: true,
      rationale: 'Privacy review cleared.',
    });
  });

  it('⛔ NEVER sends a changedByDisplay on the wire (Trap 2 — it is server-resolved)', async () => {
    renderPage(status({ enabled: true, configured: false }));
    client.setDirectoryPublicationStatus.mockResolvedValue(status({ enabled: false, configured: true }));

    await userEvent.type(await screen.findByTestId('directory-publication-rationale'), 'r');
    await userEvent.click(screen.getByTestId('directory-publication-submit'));

    await waitFor(() => expect(client.setDirectoryPublicationStatus).toHaveBeenCalled());
    const [, body] = client.setDirectoryPublicationStatus.mock.calls[0] as [string, Record<string, unknown>];
    expect(Object.keys(body).sort()).toEqual(['enabled', 'rationale']);
  });

  it('disables submit until a rationale is entered (a COURTESY — the server is the real gate)', async () => {
    renderPage(status({ enabled: true, configured: false }));
    const submit = (await screen.findByTestId('directory-publication-submit')) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);

    await userEvent.type(screen.getByTestId('directory-publication-rationale'), 'a reason');
    await waitFor(() => expect(submit.disabled).toBe(false));
  });

  it('keeps submit disabled for a WHITESPACE-only rationale', async () => {
    renderPage(status({ enabled: true, configured: false }));
    const submit = (await screen.findByTestId('directory-publication-submit')) as HTMLButtonElement;
    await userEvent.type(screen.getByTestId('directory-publication-rationale'), '   ');
    expect(submit.disabled).toBe(true);
    expect(client.setDirectoryPublicationStatus).not.toHaveBeenCalled();
  });

  it('on success, says the change is saved WITHOUT claiming the public pages have caught up', async () => {
    renderPage(status({ enabled: true, configured: false }));
    client.setDirectoryPublicationStatus.mockResolvedValue(status({ enabled: false, configured: true }));

    await userEvent.type(await screen.findByTestId('directory-publication-rationale'), 'r');
    await userEvent.click(screen.getByTestId('directory-publication-submit'));

    const saved = await screen.findByTestId('directory-publication-saved');
    expect(saved.textContent).toMatch(/saved/i);
    expect(saved.textContent).toMatch(/catch up|expire/i);
  });
});

describe('DirectoryPublicationPage — permission denial (Trap 3)', () => {
  // ⛔ There is NO client-side capability check, and there must not be one:
  // pariwar.manage_directory_publication is a PARIWAR-dimension grant that never appears in the
  // session's global grant set, so a client gate would deny everyone including super_admin.
  it('⛔ surfaces the server 403 as a readable error and does NOT hide the form', async () => {
    renderPage(status({ enabled: true, configured: false }));
    client.setDirectoryPublicationStatus.mockRejectedValue(
      new ApiError(403, 'rbac.permission_denied', 'Forbidden'),
    );

    await userEvent.type(await screen.findByTestId('directory-publication-rationale'), 'r');
    await userEvent.click(screen.getByTestId('directory-publication-submit'));

    const err = await screen.findByTestId('directory-publication-submit-error');
    expect(err.textContent).toMatch(/super administrator/i);
    // The form is still on the page — the server decided, not the client.
    expect(screen.getByTestId('directory-publication-submit')).toBeTruthy();
  });

  it('surfaces a 403 on the STATUS read as a readable page error', async () => {
    client.getDirectoryPublicationStatus.mockRejectedValue(
      new ApiError(403, 'rbac.permission_denied', 'Forbidden'),
    );
    renderWithClient(<DirectoryPublicationPage pariwarId={PARIWAR} />);
    const err = await screen.findByTestId('directory-publication-status-error');
    expect(err.textContent).toMatch(/super administrator/i);
  });
});
