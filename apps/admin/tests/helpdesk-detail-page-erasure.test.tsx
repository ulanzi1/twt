// `<HelpdeskDetailPage>` — the erasure refusal, THROUGH THE PAGE (Story 6.38; AC10, DL11; code review round 2, patch 7).
//
// `helpdesk-responder-console.test.tsx` covers `erasureErrorText` (a pure function) and the Shell with the sentence handed in as
// a prop. Neither runs the PAGE, where the mutation's error is turned into the Shell's `dataRightsError`: reverting that leg to
// `messageOf(...)` — the server's raw English — or moving it behind the export leg left both green. This renders the page with
// the real hooks and a mocked API client:
//   · a 409 `rtbf.death_reported` from the erasure shows the panel's own sentence, ⛔ the server's message;
//   · the erasure leg comes BEFORE a stale export-build error in the chain (DL11) — a build that failed earlier must ⛔ hide the
//     death-reported refusal.
// ⚠ Deliberately NOT pinned: that a stale ERASURE error masks a LATER failure — that is the existing sticky-`isError` behaviour
// of every leg (recorded in `deferred-work.md`), ⛔ a decision of this story.

import { DPDPA_DATA_RIGHTS_SUBCATEGORY, type HelpdeskAdminTicketDetailResponse } from '@twt/contracts';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as api from '../src/api/client.js';
import { HelpdeskDetailPage } from '../src/modules/helpdesk/HelpdeskDetailPage.js';
import { renderWithClient } from './_helpers.js';

const PARIWAR = '11111111-1111-1111-1111-111111111111';
const TICKET = '22222222-2222-2222-2222-222222222222';
const MEMBER = '44444444-4444-4444-4444-444444444444';

const SENTENCE =
  'This member’s data cannot be erased: a claim has been filed for their death. The person they nominated may see the record and ask for corrections. This stays so even if the claim is closed or refused; only a finding that the member is alive lifts it, and then the usual erasure rules apply.';
const SERVER_MESSAGE = "Erasure is refused: a claim has been filed for this member's death";

const timer = { due_at: '2026-08-04T06:00:00.000Z', running: true, breached: false, ms_remaining: 3_600_000 };
const TICKET_DETAIL = {
  ticket_id: TICKET,
  category: 'dpdpa',
  sub_category: DPDPA_DATA_RIGHTS_SUBCATEGORY,
  subject: 'Please erase my data',
  current_state: 'in_progress',
  created_via: 'member_app',
  routed_to_role: 'pariwar_admin',
  routed_to_scope: { dimension: 'pariwar', value: PARIWAR },
  sla_first_response: timer,
  sla_resolution: timer,
  severity: 'on_track',
  cross_links: { claim_case_id: null, pool_id: null, module_id: null, validity_lookup_id: null },
  created_at: '2026-08-03T06:00:00.000Z',
  updated_at: '2026-08-03T06:00:00.000Z',
  subject_member_id: MEMBER,
  subject_actor_id: null,
  body: 'Please erase my data.',
  attachments: [],
  thread: [{ kind: 'opening', author: 'member', body: 'Please erase my data.', occurred_at: '2026-08-03T06:00:00.000Z' }],
  operator_attribution: null,
  routing_policy_version: 1,
  assigned_at: '2026-08-03T06:00:00.000Z',
  member_scope_context: { pariwar_id: PARIWAR, state: null, district: null, block: null, subject_member_id: MEMBER },
  member_staff_mediation_requested_at: null,
} as unknown as HelpdeskAdminTicketDetailResponse;

vi.mock('../src/api/client.js', async () => {
  const actual = await vi.importActual<typeof import('../src/api/client.js')>('../src/api/client.js');
  return {
    ...actual,
    getHelpdeskTicket: vi.fn(async () => TICKET_DETAIL),
    getActiveDataRightsExport: vi.fn(async () => ({ export_id: null })),
    buildOffPortalExport: vi.fn(),
    fulfilOffPortalErasure: vi.fn(),
  };
});

async function renderPanel() {
  const user = userEvent.setup();
  renderWithClient(<HelpdeskDetailPage pariwarId={PARIWAR} ticketId={TICKET} />);
  await screen.findByTestId('helpdesk-datarights-erasure');
  return user;
}

async function refuseErasure(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.click(screen.getByTestId('helpdesk-datarights-erasure-confirm'));
  await user.click(screen.getByTestId('helpdesk-datarights-erasure'));
}

describe('<HelpdeskDetailPage> — the erasure refused once a death is reported (Story 6.38, AC10)', () => {
  // A queued `mockRejectedValueOnce` that a failing test never consumed must ⛔ leak into the next test (code review round 3).
  beforeEach(() => {
    vi.mocked(api.buildOffPortalExport).mockReset();
    vi.mocked(api.fulfilOffPortalErasure).mockReset();
  });

  it('⭐ a 409 rtbf.death_reported shows the panel\'s own sentence in the alert — ⛔ the server\'s raw message', async () => {
    vi.mocked(api.fulfilOffPortalErasure).mockRejectedValueOnce(new api.ApiError(409, 'rtbf.death_reported', SERVER_MESSAGE));
    const user = await renderPanel();
    await refuseErasure(user);

    const alert = await screen.findByText(SENTENCE);
    expect(alert).toHaveAttribute('role', 'alert');
    expect(document.body.textContent).not.toContain(SERVER_MESSAGE);
  });

  it('⭐ DL11 — the erasure leg is BEFORE a stale export-build error: the refusal is not hidden by an earlier failed build', async () => {
    vi.mocked(api.buildOffPortalExport).mockRejectedValueOnce(new Error('The export could not be built'));
    vi.mocked(api.fulfilOffPortalErasure).mockRejectedValueOnce(new api.ApiError(409, 'rtbf.death_reported', SERVER_MESSAGE));
    const user = await renderPanel();

    // Control: a failed build, on its own, IS what the alert shows — so the sentence below can only be the erasure leg winning.
    await user.click(screen.getByTestId('helpdesk-datarights-build-export'));
    expect(await screen.findByText('The export could not be built')).toHaveAttribute('role', 'alert');

    await refuseErasure(user);
    expect(await screen.findByText(SENTENCE)).toHaveAttribute('role', 'alert');
    expect(screen.queryByText('The export could not be built')).not.toBeInTheDocument();
  });
});
