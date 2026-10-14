// Story 6.27d (Task 4.3; R5, R4a; AC6) — the inspector's discrepancy as STAFF see it, inside `<PeerMeshView>` (the ONE view
// behind the verifier console and the later approvers' `<NeighboursAnswersPanel>`): which questions the inspector was
// shown as differing, the family's re-told answer labelled "Recorded after the difference was shown" WITH its author, an
// `unavailable` note's words (⛔ a blank), a question with ⛔ note yet, and an empty block rendering ⛔ at all.

import type { PeerMeshTranscript } from '@twt/contracts';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PeerMeshView } from '../src/modules/claim-verification/PeerMeshView.js';

const transcript = (inspectionDiscrepancies: PeerMeshTranscript['inspectionDiscrepancies']): PeerMeshTranscript => ({
  selectionId: 's',
  distinctResponderCount: 1,
  pingedMemberIds: ['m1'],
  responses: [],
  verifierAnnotations: { status: 'not_available_yet' },
  outcome: 'sufficient',
  windowExpiresAt: '2026-10-15T00:00:00.000Z',
  pings: [],
  inspectionDiscrepancies,
});

describe('<PeerMeshView> — Story 6.27d, the inspector\'s discrepancy block', () => {
  it('renders each shown question with its note, the story label, the author and the time; `unavailable` and missing notes say so', () => {
    render(
      <PeerMeshView
        transcript={transcript([
          {
            groundInspectionId: 'gi-1',
            completedAt: '2026-10-12T06:00:00.000Z',
            shownAt: '2026-10-12T06:00:01.000Z',
            questionKeys: ['has_died', 'death_date'],
            notes: [{ questionKey: 'has_died', note: 'They said he died at home.', notedAt: '2026-10-12T06:05:00.000Z', authorDisplay: 'Anita Sharma' }],
          },
          {
            groundInspectionId: 'gi-2',
            completedAt: '2026-10-13T06:00:00.000Z',
            shownAt: '2026-10-13T06:00:01.000Z',
            questionKeys: ['death_date'],
            notes: [{ questionKey: 'death_date', note: { status: 'unavailable' }, notedAt: '2026-10-13T06:05:00.000Z', authorDisplay: 'Supervisor Two' }],
          },
          { groundInspectionId: 'gi-3', completedAt: '2026-10-14T06:00:00.000Z', shownAt: '2026-10-14T06:00:01.000Z', questionKeys: [], notes: [] },
        ])}
      />,
    );
    const block = screen.getByTestId('peer-mesh-inspection-discrepancies');
    const [first, second, third] = within(block).getAllByTestId('peer-mesh-inspection-discrepancy');
    const hasDied = within(first!).getByTestId('peer-mesh-inspection-discrepancy-has_died');
    expect(hasDied).toHaveTextContent('Whether the member has died');
    expect(hasDied).toHaveTextContent('Recorded after the difference was shown');
    expect(hasDied).toHaveTextContent('They said he died at home.');
    expect(hasDied).toHaveTextContent('Anita Sharma');
    expect(within(first!).getByTestId('peer-mesh-inspection-discrepancy-death_date')).toHaveTextContent('No note recorded');
    expect(within(second!).getByTestId('peer-mesh-inspection-discrepancy-death_date')).toHaveTextContent('This note could not be shown');
    expect(second).toHaveTextContent('Supervisor Two');
    expect(third).toHaveTextContent('No difference from the neighbours was shown to the inspector.');
  });

  it('an EMPTY block renders ⛔ section at all', () => {
    render(<PeerMeshView transcript={transcript([])} />);
    expect(screen.queryByTestId('peer-mesh-inspection-discrepancies')).toBeNull();
  });
});
