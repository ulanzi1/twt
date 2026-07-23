// Contribution Note (Yogdaan Pratigya) handler + template — DB-free unit test (Story 8.7, Task 4).
//
// Mocked `@twt/domain` (the contribution-history.test.ts pattern) + the DETERMINISTIC FAKE renderer,
// so the whole suite runs with no database, no KMS and no browser. The fake records the HTML it was
// handed, which is what makes the load-bearing AC3 assertions possible here rather than in a PDF-
// internals test.
//
// The checks, in order of how much they matter:
//   1. THE OVER-CLAIM GUARD (AC3 / D3(b), non-optional): a `yellow` Note is DOWNLOADABLE and contains
//      NO UTR, NO सत्यापित stamp, and none of the confirmation-implying strings — while a `green` Note
//      contains both. This is the proof that availability and contents are governed independently.
//   2. THE SCOPE GUARD (AC7 / D9): another member's `contributionId` → 404. A PDF is a far worse leak
//      than a list row, so this is asserted directly rather than inferred from the read's scoping.
//   3. The member-session gate (401), resolved before any tx opens.
//   4. Not fail-soft: a render failure propagates (never a blank 200 body); an unknown id 404s.
//   5. AC4: the Niyamavali version resolves AS-OF the contribution instant, and its absence renders
//      the honest string — never a fabricated or defaulted version.
//   6. AC1: the `Content-Disposition` filename carries no prohibited transactional term.
//   7. D3(a): `noteAvailable` on the passbook is a RESOLVABILITY predicate with no status term.

import { createFakeContributionNotePdfRenderer } from '@twt/platform-adapters';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppDeps } from '../../src/context.js';

const getMemberAttestedContribution = vi.fn();
const getPoolContributionContext = vi.fn();
const getCycleFreezeCommittedAt = vi.fn();
const reserveNames = vi.fn();
const getClaimCase = vi.fn();
const getMemberKycProfile = vi.fn();
const resolveByClauseId = vi.fn();
const getPariwarPassport = vi.fn();

vi.mock('@twt/domain', async (importActual) => {
  const actual = await importActual<typeof import('@twt/domain')>();
  return {
    ...actual,
    pool: { ...actual.pool, getPoolContributionContext, getCycleFreezeCommittedAt, reserveNames },
    contribution: { ...actual.contribution, getMemberAttestedContribution },
    claim: { ...actual.claim, getClaimCase },
    kyc: { ...actual.kyc, getMemberKycProfile },
    niyamavali: { ...actual.niyamavali, resolveByClauseId },
    passport: { ...actual.passport, getPariwarPassport },
  };
});

const decryptKycField = vi.fn();
vi.mock('../../src/modules/kyc/kyc-crypto.js', () => ({ decryptKycField }));

const openScopeTx = vi.fn();
const closeScopeTx = vi.fn();
vi.mock('../../src/modules/multi-tenant/scope-tx.js', () => ({ openScopeTx, closeScopeTx }));

const { createMemberPoolHandlers } = await import('../../src/modules/member-pool/handlers.js');

const PARIWAR_ID = '11111111-1111-1111-1111-111111111111';
const MEMBER_ID = '22222222-2222-2222-2222-222222222222';
const CYCLE_ID = '33333333-3333-3333-3333-333333333333';
const POOL_ID = '44444444-4444-4444-4444-444444444444';
const CLAIM_CASE_ID = '55555555-5555-5555-5555-555555555555';
const DECEASED_ID = '66666666-6666-6666-6666-666666666666';
const ALERT_ID = '77777777-7777-7777-7777-777777777777';
const CONTRIBUTION_ID = 'evt-own-1';
const OTHER_MEMBERS_CONTRIBUTION_ID = 'evt-someone-elses-1';
const ATTESTED_AT = new Date('2026-06-20T10:15:00.000Z');
const UTR = '123456789012';

/**
 * Strings that would make a shareable non-green Note CLAIM a settled payment (AC3).
 *
 * Note what is deliberately NOT here: the bare token `पुष्ट` ("confirmed"). The honest yellow copy
 * says "यह अभी पुष्ट नहीं है" — "this is NOT yet confirmed" — so a bare-substring ban on the word
 * would forbid the very denial the AC requires. The list holds AFFIRMATIVE confirmation phrases only,
 * and the yellow test additionally asserts the denial IS present.
 */
const CONFIRMATION_IMPLYING = [
  'सत्यापित', // the verification stamp — green-only
  'पुष्ट हो चुका', // "has been confirmed"
  'Verified',
  'Confirmed',
  'thank you for your payment',
  UTR,
];

/**
 * The rendered HTML minus the inlined base64 font blobs.
 *
 * EVERY content assertion runs against this. The template inlines two ~220 KB TTFs as data URIs, and
 * an arbitrary base64 blob contains essentially every short substring by chance — asserting
 * `html.includes('v0')` or `!html.includes('Sharma')` against the raw document would produce silent
 * false results. Stripping the blobs makes the assertions actually about the artifact's content.
 */
function visible(html: string): string {
  return html.replace(/data:font\/ttf;base64,[A-Za-z0-9+/=]+/g, 'data:font/ttf;base64,<stripped>');
}

function fakeRequest(overrides?: { actorId?: string | undefined; contributionId?: string }): FastifyRequest {
  return {
    requestContext: {
      traceId: 'trace-1',
      actorId: overrides && 'actorId' in overrides ? overrides.actorId : MEMBER_ID,
      pariwarId: PARIWAR_ID,
    },
    params: { contributionId: overrides?.contributionId ?? CONTRIBUTION_ID },
    log: { warn: vi.fn(), error: vi.fn() },
  } as unknown as FastifyRequest;
}

/** A reply double that records what the handler set + sent. */
function fakeReply() {
  const headers: Record<string, string> = {};
  const state: { contentType?: string; body?: Buffer } = {};
  const reply = {
    type(value: string) {
      state.contentType = value;
      return reply;
    },
    header(name: string, value: string) {
      headers[name] = value;
      return reply;
    },
    async send(body: Buffer) {
      state.body = body;
    },
  };
  return { reply: reply as unknown as FastifyReply, headers, state };
}

let renderer: ReturnType<typeof createFakeContributionNotePdfRenderer>;

function baseDeps(): AppDeps {
  return {
    clock: () => new Date('2026-07-23T09:00:00.000Z'),
    encryption: {},
    contributionNotePdfRenderer: renderer,
  } as unknown as AppDeps;
}

beforeEach(() => {
  vi.clearAllMocks();
  renderer = createFakeContributionNotePdfRenderer();
  openScopeTx.mockResolvedValue({ client: {}, tx: {}, pariwarId: PARIWAR_ID, scopeSet: true });
  closeScopeTx.mockResolvedValue(undefined);

  getPoolContributionContext.mockResolvedValue({
    cycleId: CYCLE_ID,
    claimCaseId: CLAIM_CASE_ID,
    poolIndex: 0,
    poolCanonicalIdentifier: 'P-2026-06-001',
    fixedAmount: 500,
    poolCount: 1,
  });
  getCycleFreezeCommittedAt.mockResolvedValue(new Date('2026-06-10T00:00:00.000Z'));
  getClaimCase.mockResolvedValue({ deceasedMemberId: DECEASED_ID });
  // The deceased family's name AND the contributing member's own name both come through this pair.
  getMemberKycProfile.mockImplementation(async (_tx: unknown, _p: unknown, id: string) =>
    id === DECEASED_ID ? { nameCiphertext: 'enc:v1:deceased' } : { nameCiphertext: 'enc:v1:member' },
  );
  decryptKycField.mockImplementation(async (ciphertext: string) =>
    ciphertext === 'enc:v1:deceased' ? 'Rajesh Sharma' : 'Sushil Kumar',
  );
  reserveNames.mockResolvedValue([]); // opted out → letter-code fallback
  resolveByClauseId.mockResolvedValue(null); // the launch-tenant reality (AC4 honest absence)
  getPariwarPassport.mockResolvedValue({
    displayNameHi: 'टीचर्स वेलफेयर ट्रस्ट',
    displayNameEn: 'Teachers Welfare Trust',
    brandingBundle: { logo_url: '', primary_color: '#1f4e5f', secondary_color: '#c9a227' },
  });
});

/**
 * Wire the caller's OWN attested contribution (id `CONTRIBUTION_ID`) in the given status. Mirrors
 * `getMemberAttestedContribution`'s real targeted-lookup semantics: it resolves ONLY when asked for
 * `CONTRIBUTION_ID` — any other id (e.g. `OTHER_MEMBERS_CONTRIBUTION_ID`) resolves `null`, exactly like
 * the real member-scoped equality lookup, so the scope-guard test below stays honest.
 */
function wireOwnHistory(status: 'yellow' | 'green' | 'red' | 'grey'): void {
  getMemberAttestedContribution.mockImplementation(
    async (_tx: unknown, args: { readonly contributionId: string }) =>
      args.contributionId === CONTRIBUTION_ID
        ? {
            contributionId: CONTRIBUTION_ID,
            alertId: ALERT_ID,
            poolId: POOL_ID,
            attestedAt: ATTESTED_AT,
            utr: UTR,
            status,
          }
        : null,
  );
}

/** Run the handler and return the recorded render + reply state. */
async function generateNote(request = fakeRequest()) {
  const { reply, headers, state } = fakeReply();
  const handlers = createMemberPoolHandlers(baseDeps());
  await handlers.contributionNote(request, reply);
  const rendered = renderer.renders[0];
  if (!rendered) throw new Error('expected the renderer to have been called');
  return { html: visible(rendered.html), rawHtml: rendered.html, opts: rendered.opts, headers, state };
}

// ─── 1. THE OVER-CLAIM GUARD — the load-bearing invariant (AC3 / D3(b)) ──────────────────────────

describe('AC3 — a shareable artifact never over-claims (the load-bearing invariant)', () => {
  it('a YELLOW Note is downloadable and contains NO UTR, NO सत्यापित stamp, and no confirmation-implying string', async () => {
    wireOwnHistory('yellow');
    const { html, state } = await generateNote();

    // It IS generated — availability is not status-gated (D3(a)).
    expect(state.body?.length).toBeGreaterThan(0);
    expect(state.contentType).toBe('application/pdf');

    for (const forbidden of CONFIRMATION_IMPLYING) {
      expect(html.includes(forbidden), `a yellow Note must not contain "${forbidden}"`).toBe(false);
    }
    // It says the honest thing instead — including the explicit DENIAL of confirmation.
    expect(html).toContain('मिलान शेष');
    expect(html).toContain('Verification pending');
    expect(html).toContain('यह अभी पुष्ट नहीं है');
    expect(html).toContain('it is not confirmed yet');
    // The payment REFERENCE is still there — it is the member's own attempt, and asserts no settlement.
    expect(html).toContain('भुगतान संदर्भ');
  });

  it('a GREEN Note carries the UTR AND the सत्यापित stamp (epics.md:2990 — "UTR (when confirmed)")', async () => {
    wireOwnHistory('green');
    const { html } = await generateNote();
    expect(html).toContain(UTR);
    expect(html).toContain('सत्यापित');
    expect(html).toContain('पुष्ट');
  });

  it('RED and GREY Notes are generated, carry no UTR/stamp, and grey stays strictly neutral (8.6 D3)', async () => {
    for (const status of ['red', 'grey'] as const) {
      renderer = createFakeContributionNotePdfRenderer();
      wireOwnHistory(status);
      const { html } = await generateNote();
      for (const forbidden of CONFIRMATION_IMPLYING) {
        expect(html.includes(forbidden), `a ${status} Note must not contain "${forbidden}"`).toBe(false);
      }
      if (status === 'grey') {
        // "On record" — never "missed" / "failed" / "voided" (the ratified neutral framing).
        expect(html).toContain('दर्ज');
        expect(html).toContain('On record');
        for (const shaming of ['missed', 'failed', 'voided', 'Missed', 'Failed', 'default']) {
          expect(html.includes(shaming), `a grey Note must not say "${shaming}"`).toBe(false);
        }
      }
    }
  });

  it('the three status-varying elements track the SAME status the domain derived (no second derivation)', async () => {
    // The handler never inspects alert state / confirmed events itself — it renders what the history
    // read gave it. Feeding a status the "wrong" way round proves the template is a pure function of it.
    wireOwnHistory('green');
    const { html: green } = await generateNote();
    renderer = createFakeContributionNotePdfRenderer();
    wireOwnHistory('yellow');
    const { html: yellow } = await generateNote();
    expect(green.includes('सत्यापित')).toBe(true);
    expect(yellow.includes('सत्यापित')).toBe(false);
  });
});

// ─── 2. THE SCOPE GUARD (AC7 / D9) ───────────────────────────────────────────────────────────────

describe('AC7/D9 — the endpoint is hard-scoped to the caller’s own contributions', () => {
  it('another member’s contributionId → 404, never another member’s Note', async () => {
    // The member-scoped lookup matches ONLY the caller's own contributionId, so the other member's id
    // simply does not resolve — ownership is structural, not a check that could be forgotten.
    wireOwnHistory('yellow');
    const handlers = createMemberPoolHandlers(baseDeps());
    const { reply } = fakeReply();
    await expect(
      handlers.contributionNote(fakeRequest({ contributionId: OTHER_MEMBERS_CONTRIBUTION_ID }), reply),
    ).rejects.toMatchObject({ code: 'contribution_note.not_found', statusCode: 404 });
    // Nothing was rendered — no bytes for a Note that is not the caller's.
    expect(renderer.renders).toHaveLength(0);
  });

  it('an unknown contributionId → the SAME 404 (indistinguishable — never confirms another id exists)', async () => {
    getMemberAttestedContribution.mockResolvedValue(null);
    const handlers = createMemberPoolHandlers(baseDeps());
    const { reply } = fakeReply();
    await expect(handlers.contributionNote(fakeRequest(), reply)).rejects.toMatchObject({
      code: 'contribution_note.not_found',
    });
  });

  it('member-session gate: no actor → 401, resolved before any tx opens', async () => {
    const handlers = createMemberPoolHandlers(baseDeps());
    const { reply } = fakeReply();
    await expect(handlers.contributionNote(fakeRequest({ actorId: undefined }), reply)).rejects.toMatchObject({
      code: 'auth.session_required',
    });
    expect(openScopeTx).not.toHaveBeenCalled();
  });
});

// ─── 3. NOT fail-soft — never a blank or partial artifact ────────────────────────────────────────

describe('Task 4 — the Note is deliberately NOT fail-soft (a defective artifact is worse than none)', () => {
  it('a render failure propagates as an error rather than an empty 200 body', async () => {
    wireOwnHistory('yellow');
    renderer.failWith(new Error('chromium died'));
    const handlers = createMemberPoolHandlers(baseDeps());
    const { reply, state } = fakeReply();
    await expect(handlers.contributionNote(fakeRequest(), reply)).rejects.toThrow('chromium died');
    expect(state.body).toBeUndefined();
  });

  it('an unresolvable pool identity → 404, NOT a Note with a blank family name', async () => {
    wireOwnHistory('yellow');
    getPoolContributionContext.mockResolvedValue(null);
    const handlers = createMemberPoolHandlers(baseDeps());
    const { reply } = fakeReply();
    await expect(handlers.contributionNote(fakeRequest(), reply)).rejects.toMatchObject({
      code: 'contribution_note.not_found',
    });
  });
});

// ─── 4. AC4 — the Niyamavali version, as-of the contribution instant or honestly absent ──────────

describe('AC4 — the Niyamavali version is resolved AS-OF the contribution instant, or honestly absent', () => {
  it('resolves with asOf = the contribution’s attestedAt, never now()', async () => {
    wireOwnHistory('yellow');
    await generateNote();
    expect(resolveByClauseId).toHaveBeenCalledTimes(1);
    const [, pariwarArg, clauseArg, asOfArg] = resolveByClauseId.mock.calls[0] as unknown[];
    expect(pariwarArg).toBe(PARIWAR_ID);
    expect(clauseArg).toBe('niy.contribution-discipline.r7');
    expect(asOfArg).toEqual(ATTESTED_AT);
  });

  it('no published clause → the HONEST ABSENCE, never a fabricated or defaulted version string', async () => {
    wireOwnHistory('yellow');
    const { html } = await generateNote();
    expect(html).toContain('अभी प्रकाशित नहीं');
    expect(html).toContain('Not yet published');
    // The one failure mode this AC exists to forbid.
    for (const fabricated of ['v1 ·', 'v0 ·', 'version 1', 'draft']) {
      expect(html.includes(fabricated), `must not fabricate "${fabricated}"`).toBe(false);
    }
  });

  it('a published clause version is cited with its clause_version_id (the wiring is complete today)', async () => {
    wireOwnHistory('yellow');
    resolveByClauseId.mockResolvedValue({
      clauseId: 'niy.contribution-discipline.r7',
      clauseVersionId: '99999999-9999-9999-9999-999999999999',
      version: 3,
    });
    const { html } = await generateNote();
    expect(html).toContain('v3');
    expect(html).toContain('99999999-9999-9999-9999-999999999999');
    expect(html.includes('Not yet published')).toBe(false);
  });
});

// ─── 5. AC1 / AC5 — naming, identifier discipline, PII ───────────────────────────────────────────

describe('AC1/AC5 — the artifact’s naming, watermark and PII discipline', () => {
  it('the Content-Disposition filename carries no prohibited transactional term', async () => {
    wireOwnHistory('yellow');
    const { headers } = await generateNote();
    const disposition = headers['content-disposition'] ?? '';
    expect(disposition).toContain('yogdaan-pratigya-');
    for (const prohibited of ['receipt', 'invoice', 'रसीद', 'बिल']) {
      expect(disposition.toLowerCase().includes(prohibited), `filename must not contain ${prohibited}`).toBe(
        false,
      );
    }
    expect(headers['cache-control']).toBe('no-store');
  });

  it('the PDF title is the Yogdaan Pratigya, never a transactional noun', async () => {
    wireOwnHistory('yellow');
    const { opts } = await generateNote();
    expect(opts.title).toContain('योगदान प्रतिज्ञा');
    for (const prohibited of ['Receipt', 'Invoice', 'receipt', 'invoice']) {
      expect(opts.title.includes(prohibited)).toBe(false);
    }
  });

  it('the member watermark is a derived non-reversible mark — never the raw member id', async () => {
    wireOwnHistory('yellow');
    const { html } = await generateNote();
    expect(html).toMatch(/TWT-[0-9A-F]{8}/);
    expect(html.includes(MEMBER_ID), 'the raw member id must never appear on the artifact').toBe(false);
  });

  it('only first-name + last-initial appear — no full surname for either the member or the family', async () => {
    wireOwnHistory('yellow');
    const { html } = await generateNote();
    expect(html).toContain('Rajesh S');
    expect(html).toContain('Sushil K');
    expect(html.includes('Sharma')).toBe(false);
    expect(html.includes('Kumar')).toBe(false);
  });

  it('branding degrades PER FIELD — an unset logo does not cost the Pariwar its colours', async () => {
    wireOwnHistory('yellow');
    const { html } = await generateNote();
    expect(html).toContain('#1f4e5f');
    expect(html.includes('<img')).toBe(false); // no logo_url set → no logo element, colours intact
  });
});

// ─── 6. AC7 — regenerable, stateless ─────────────────────────────────────────────────────────────

describe('AC7 — the Note is regenerated on demand and persisted nowhere', () => {
  it('two renders of the same contribution produce identical HTML apart from the generation instant', async () => {
    wireOwnHistory('green');
    const first = await generateNote();
    const second = await generateNote();
    // Same clock in this test, so the two are byte-identical; the ONLY field that could differ is
    // `generatedAt`, which is stamped from deps.clock().
    expect(second.rawHtml).toEqual(first.rawHtml);
    expect(html_without_generated(first.rawHtml)).toEqual(html_without_generated(second.rawHtml));
  });
});

/** Strip the generation timestamp so the comparison isolates "everything else is deterministic". */
function html_without_generated(html: string): string {
  return html.replace(/\d{4}-\d{2}-\d{2}T[\d:.]+Z/g, '<instant>');
}
