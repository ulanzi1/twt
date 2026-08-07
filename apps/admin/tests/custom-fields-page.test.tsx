// CustomFieldsPage component/interaction tests (Story 10.12, Task 7; AC8/AC9).
//
// ⚠ RENDER TESTS, NOT VIEW-MODEL TESTS. Story 10.10's second review pass found AC prose that reached
// nobody because the tests asserted a view-model and never the render — the copy existed in a
// function no user could see. So every assertion below goes through the actual DOM: if the Hindi
// note, the `indexed` disclaimer or the retirement confirmation stops being rendered, these fail.
//
// The four things worth pinning here are the ones where a plausible "improvement" would break a
// commitment:
//   · the type list is FIXED (an eighth option means someone widened the vocabulary in the UI);
//   · both labels are REQUIRED, and the page says WHY before the operator hits the error (AC9);
//   · `indexed` says plainly that it does nothing by itself (story D5);
//   · Retire is confirm-and-submit and calls the PUBLISH endpoint with `retired_at` (AC1/AC7).

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CustomFieldDefinitionsResponse } from '@twt/contracts';
import { CustomFieldsPage } from '../src/modules/custom-fields/CustomFieldsPage.js';
import { CustomFieldsGateView } from '../src/routes/CustomFieldsRoute.js';
import { renderWithClient } from './_helpers.js';

const PARIWAR = '11111111-1111-1111-1111-111111111111';

type Version = CustomFieldDefinitionsResponse['in_force'][number];

function version(over: Partial<Version> = {}): Version {
  return {
    id: '22222222-2222-2222-2222-222222222222',
    host_entity: 'member',
    field_key: 'school_block_code',
    version: 1,
    definition: {
      field_key: 'school_block_code',
      label_en: 'School block code',
      label_hi: 'विद्यालय प्रखंड कोड',
      field_type: 'string',
      max_length: 32,
      pii_tier: 3,
      required: false,
      indexed: false,
    },
    effective_at: '2026-08-06T00:00:00.000Z',
    retired_at: null,
    authored_by_actor: '33333333-3333-3333-3333-333333333333',
    actor_display: 'Sunita Devi',
    superseded_by_version: null,
    created_at: '2026-08-06T00:00:00.000Z',
    ...over,
  } as Version;
}

const client = vi.hoisted(() => ({
  listCustomFieldDefinitions: vi.fn(),
  publishCustomFieldDefinition: vi.fn(),
}));

vi.mock('../src/api/client.js', async (orig) => {
  const actual = await orig<typeof import('../src/api/client.js')>();
  return { ...actual, ...client };
});

// ⚠ Without this, a call recorded by one test satisfies the next test's "was never called"
// assertion — so the cancel-path test ("Keep it" sends nothing) passed only because it ran after a
// test that DID send, and would have gone on passing had cancel started firing a request.
beforeEach(() => {
  vi.clearAllMocks();
});

function renderPage(over: Partial<CustomFieldDefinitionsResponse> = {}): void {
  client.listCustomFieldDefinitions.mockResolvedValue({
    host_entity: 'member',
    definition_set_version: 'abc123',
    in_force: [],
    history: [],
    has_more: false,
    ...over,
  });
  renderWithClient(<CustomFieldsPage pariwarId={PARIWAR} />);
}

describe('CustomFieldsPage — the type allowlist is FIXED (AC2)', () => {
  it('⚠ offers EXACTLY the seven declared types, and no free-text alternative', async () => {
    // A fixed list is what keeps a custom field a bounded declarative form rather than an expression
    // language. An eighth option here means someone widened the vocabulary in the UI, where it is
    // least likely to be reviewed as a governance change.
    renderPage();
    const select = await screen.findByLabelText(/^type$/i);
    const offered = Array.from(select.querySelectorAll('option')).map((o) => o.value).sort();
    expect(offered).toEqual([
      'boolean',
      'date',
      'decimal',
      'enum',
      'integer',
      'string',
      'string_array',
    ]);
  });

  it('reveals the choices input only for `enum`, and warns that choices can never be removed', async () => {
    renderPage();
    expect(screen.queryByLabelText(/choices/i)).toBeNull();
    await userEvent.selectOptions(await screen.findByLabelText(/^type$/i), 'enum');
    expect(await screen.findByLabelText(/choices/i)).toBeTruthy();
    expect(screen.getByText(/never removed/i)).toBeTruthy();
  });
});

describe('CustomFieldsPage — Hindi parity is required, and the page says WHY (AC9)', () => {
  it('⚠ RENDERS the reason, in the tone-guide register, BEFORE the operator hits the error', async () => {
    // The 10.10 lesson: AC prose that lives only in a view-model reaches nobody. This asserts the
    // DOM. And it asserts the REASON, not just the requirement — "members read Hindi first" is a
    // commitment being explained, not a form rule being enforced.
    renderPage();
    const note = await screen.findByText(/members read hindi first/i);
    expect(note).toBeTruthy();
    expect(note.textContent).toMatch(/cannot be changed/i);
  });

  it('marks BOTH label inputs required', async () => {
    renderPage();
    expect((await screen.findByLabelText(/label \(english\)/i)).hasAttribute('required')).toBe(true);
    expect((await screen.findByLabelText(/label \(hindi\)/i)).hasAttribute('required')).toBe(true);
  });

  it('renders the Hindi label of a live field with lang="hi"', async () => {
    renderPage({ in_force: [version()] });
    const hindi = await screen.findByText('विद्यालय प्रखंड कोड');
    expect(hindi.getAttribute('lang')).toBe('hi');
  });
});

describe('CustomFieldsPage — `indexed` is a REQUEST, and says so (story D5)', () => {
  it('⚠ states plainly that ticking it changes nothing by itself', async () => {
    // The most dangerous shape this story could take is one where a tenant admin's form submission
    // causes DDL. It does not — and an operator who believed otherwise would be worse off than one
    // never offered the control, so the disclaimer is load-bearing copy.
    renderPage();
    expect(await screen.findByText(/does not change anything by itself/i)).toBeTruthy();
  });
});

describe('CustomFieldsPage — Retire is confirm-and-submit, and is a PUBLISH with retired_at (AC1/AC7)', () => {
  it('asks for confirmation before retiring, and explains what retirement does', async () => {
    renderPage({ in_force: [version()] });
    await userEvent.click(await screen.findByRole('button', { name: /^retire$/i }));
    // The confirmation states the actual semantics: stored values survive, new entries stop.
    expect(await screen.findByText(/keep what they have already entered/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /confirm retire/i })).toBeTruthy();
    // Nothing has been sent yet — a one-click destroy would be the wrong shape for a governance act.
    expect(client.publishCustomFieldDefinition).not.toHaveBeenCalled();
  });

  it('⚠ on confirm, calls the PUBLISH endpoint with a top-level `retired_at` — never a delete', async () => {
    client.publishCustomFieldDefinition.mockResolvedValue({
      version: version({ version: 2, retired_at: '2026-08-06T10:00:00.000Z' }),
    });
    renderPage({ in_force: [version()] });
    await userEvent.click(await screen.findByRole('button', { name: /^retire$/i }));
    await userEvent.click(await screen.findByRole('button', { name: /confirm retire/i }));

    await waitFor(() => {
      expect(client.publishCustomFieldDefinition).toHaveBeenCalled();
    });
    const [, hostEntity, fieldKey, body] = client.publishCustomFieldDefinition.mock.calls[0]!;
    expect(hostEntity).toBe('member');
    expect(fieldKey).toBe('school_block_code');
    // `retired_at` is a SIBLING of `definition`, never a key inside it: the retired version's body
    // must stay byte-identical to the body its stored values were written under.
    expect(body.retired_at).toBeTruthy();
    expect(body.definition.retired_at).toBeUndefined();
    expect(body.definition).toEqual(version().definition);
  });

  it('“Keep it” cancels without sending anything', async () => {
    renderPage({ in_force: [version()] });
    await userEvent.click(await screen.findByRole('button', { name: /^retire$/i }));
    await userEvent.click(await screen.findByRole('button', { name: /keep it/i }));
    expect(await screen.findByRole('button', { name: /^retire$/i })).toBeTruthy();
    expect(client.publishCustomFieldDefinition).not.toHaveBeenCalled();
  });
});

describe('CustomFieldsPage — retired fields show in HISTORY, not in the live list (AC8)', () => {
  it('separates the two lists, and marks which history rows are live', async () => {
    const live = version();
    const retired = version({
      id: '44444444-4444-4444-4444-444444444444',
      field_key: 'cadre_grade',
      version: 2,
      retired_at: '2026-07-01T00:00:00.000Z',
      definition: { ...version().definition, field_key: 'cadre_grade', label_en: 'Cadre grade' },
    });
    renderPage({ in_force: [live], history: [live, retired] });

    expect(await screen.findByText(/live fields \(1\)/i)).toBeTruthy();
    expect(screen.getByText(/all versions \(2\)/i)).toBeTruthy();
    // The retirement date renders, so a reader can see WHEN a field stopped accepting entries.
    expect(screen.getByText('2026-07-01')).toBeTruthy();
  });

  it('surfaces `has_more` rather than silently truncating the provenance list', async () => {
    // The 10.8 Review-Pass-2 lesson: a clipped history is indistinguishable from a complete one.
    renderPage({ in_force: [version()], history: [version()], has_more: true });
    expect(await screen.findByText(/more history than fits here/i)).toBeTruthy();
  });
});

describe('CustomFieldsPage — governance refusals reach the operator verbatim (AC3/AC4)', () => {
  it('⚠ passes a frozen-governance rejection through UNCHANGED, naming the control', async () => {
    // Paraphrasing this to "invalid field key" would invite the author to try variations until
    // something sticks — which is exactly how a fence gets walked around.
    const { ApiError } = await import('../src/api/client.js');
    client.publishCustomFieldDefinition.mockRejectedValue(
      new ApiError(
        400,
        'custom_field.frozen_governance_key',
        "custom field key 'payout_destinations' collides with the frozen governance control 'payout_destination' — the FR-100 non-add registry",
      ),
    );
    renderPage();

    await userEvent.type(await screen.findByLabelText(/field key/i), 'payout_destinations');
    await userEvent.type(screen.getByLabelText(/label \(english\)/i), 'Payout');
    await userEvent.type(screen.getByLabelText(/label \(hindi\)/i), 'भुगतान');
    await userEvent.click(screen.getByRole('button', { name: /publish field/i }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/frozen governance control/i);
    expect(alert.textContent).toMatch(/FR-100/);
  });

  it('explains a 403 on the WRITE as a permission problem, not a generic failure', async () => {
    const { ApiError } = await import('../src/api/client.js');
    client.publishCustomFieldDefinition.mockRejectedValue(new ApiError(403, 'rbac.denied', 'Forbidden'));
    renderPage();

    await userEvent.type(await screen.findByLabelText(/field key/i), 'ward_number');
    await userEvent.type(screen.getByLabelText(/label \(english\)/i), 'Ward');
    await userEvent.type(screen.getByLabelText(/label \(hindi\)/i), 'वार्ड');
    await userEvent.click(screen.getByRole('button', { name: /publish field/i }));

    expect((await screen.findByRole('alert')).textContent).toMatch(/pariwar\.manage_custom_fields/);
  });

  it('distinguishes a 403 on the READ from an outage', async () => {
    // An auditor lacking the view key must be told so, not shown "could not load".
    const { ApiError } = await import('../src/api/client.js');
    client.listCustomFieldDefinitions.mockRejectedValue(new ApiError(403, 'rbac.denied', 'Forbidden'));
    renderWithClient(<CustomFieldsPage pariwarId={PARIWAR} />);
    expect((await screen.findByRole('alert')).textContent).toMatch(/pariwar\.view_custom_fields/);
  });
});

describe('CustomFieldsGateView — the session gate is a session gate, nothing more', () => {
  it.each([
    ['loading', /checking your session/i],
    ['error', /redirecting to sign in/i],
  ] as const)('renders the %s state', (status, pattern) => {
    renderWithClient(<CustomFieldsGateView status={status}>{<p>child</p>}</CustomFieldsGateView>);
    expect(screen.getByText(pattern)).toBeTruthy();
    expect(screen.queryByText('child')).toBeNull();
  });

  it('renders children on success — there is NO client-side capability hiding', () => {
    // The real boundary is the server guard chain. An auditor sees the page and gets a 403 on
    // submit; hiding the form would misrepresent what exists (the 10.8 doctrine).
    renderWithClient(<CustomFieldsGateView status="success">{<p>child</p>}</CustomFieldsGateView>);
    expect(screen.getByText('child')).toBeTruthy();
  });
});
