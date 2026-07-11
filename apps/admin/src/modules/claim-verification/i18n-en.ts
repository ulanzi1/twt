// Module-local English copy for the verifier console (Story 6.10) — the ground-inspection / helpline
// precedent: console chrome copy lives HERE, NOT in @twt/i18n runtime keys, so the i18n-parity gate
// stays untouched (this admin surface is English-facing; there is no member-app locale parity to hold).

export const verifierConsoleEn = {
  shell: {
    title: 'Verifier console',
    claimLabel: 'Claim',
    memberLabel: 'Deceased member',
    stateLabel: 'Claim state',
    readOnlyBadge: 'Read-only',
    decisionSlotEmpty: 'Decision controls are not available on this screen.',
    skipToDecision: 'Skip to decision',
  },
  scope: {
    activeLabel: 'Active Pariwar',
    switchLabel: 'Switch Pariwar',
    switchHelp: 'Switching clears the current claim and opens the selected Pariwar.',
  },
  sections: {
    identity: 'Deceased member & validity',
    concealment: 'Concealment review',
    documents: 'Document parity (OCR)',
    peerMesh: 'Peer-mesh responses',
    groundInspection: 'Ground inspection',
    priorComments: 'Prior verifier comments',
    precedents: 'Recent in-scope precedents',
  },
  states: {
    empty: 'No records yet.',
    unavailable: 'Temporarily unavailable — this signal could not be loaded. Try again shortly.',
    notAvailableYet: 'Not available yet — this signal is provided by a later release.',
    loading: 'Loading signals…',
    forbidden: "You don't have access to this claim from your current scope — try switching Pariwar, or contact your administrator.",
  },
  concealment: {
    flagged: 'Flagged for concealment review',
    notFlagged: 'No concealment flag',
    notEvaluated: 'Concealment review not yet evaluated',
    indicatorOnly: 'Presence indicator only — full detail is reviewed by the State Trustee.',
  },
  validity: {
    validityLabel: 'Validity',
    valid: 'Valid',
    invalid: 'Not valid',
    standingLabel: 'Standing',
    active: 'Active',
    inactive: 'Not active',
    specialFlags: 'Special flags',
  },
  identity: {
    dateOfBirthLabel: 'Date of birth',
  },
  peerMesh: {
    responders: 'Distinct responders',
    pinged: 'Pinged peers',
    noResponseNote: 'A non-response is an absence — it is never counted as a denial.',
    confirmed: 'Confirmed',
    denied: 'Denied',
    unknown: 'Unknown',
    annotationsNotAvailableYet: 'Verifier annotations — not available yet; this signal is provided by a later release.',
  },
} as const;

export type VerifierConsoleCopy = typeof verifierConsoleEn;
