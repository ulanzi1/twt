// member-drive-list handler wiring — DB-free unit test.
//
// [Review][Patch] — code review of 11b-15-member-drive-list-fourth-tab (2026-09-09): the route's own
// doc-block insists a read failure must 5xx rather than silently degrade to `items: []` (AC6's three
// DISTINCT states depend on the error branch being genuinely reachable), and the story's Dev Agent
// Record calls this "teeth proven, not merely green" — but every test added by the story asserted
// `statusCode === 200`. Nothing forced a genuine failure and checked the promise actually rejects
// (which is what turns into the route's 5xx at the Fastify layer). This file closes that gap, mirrors
// `active-contribution-card.test.ts`'s mocked-`@twt/domain` pattern (the sibling handler in the same
// module) rather than standing up a live-DB + KMS harness for a handler-wiring assertion, and also
// pins the two DELIBERATE exceptions to that rule: a per-field KYC decrypt failure degrades ONE field
// (not the page), and a domain row that violates `satisfiesMemberDriveLiveRowPairing` is treated as a
// genuine (not per-field) failure.

import { MEMBER_DRIVE_LIST_LIMIT_MAX } from '@twt/contracts'
import type { FastifyRequest } from 'fastify'
import { describe, expect, it, vi } from 'vitest'

import type { AppDeps } from '../../src/context.js'

const listMemberPariwarDrives = vi.fn()
const countMemberPariwarDrives = vi.fn()
const poolLetterCode = vi.fn()
const resolvePublicNamePresentationMode = vi.fn().mockResolvedValue('full_name')

vi.mock('@twt/domain', async (importActual) => {
  const actual = await importActual<typeof import('@twt/domain')>()
  return {
    ...actual,
    pool: { ...actual.pool, listMemberPariwarDrives, countMemberPariwarDrives, poolLetterCode },
    kyc: { ...actual.kyc, resolvePublicNamePresentationMode },
  }
})

const decryptKycField = vi.fn()
vi.mock('../../src/modules/kyc/kyc-crypto.js', () => ({ decryptKycField }))

const openScopeTx = vi.fn()
const closeScopeTx = vi.fn()
vi.mock('../../src/modules/multi-tenant/scope-tx.js', () => ({ openScopeTx, closeScopeTx }))

const { createMemberPoolHandlers } = await import('../../src/modules/member-pool/handlers.js')
// ⚠ DYNAMIC, ⛔ NOT a static top-level import: `@twt/domain` is mocked above, and a static import of
// a mocked module is hoisted ahead of the `const listMemberPariwarDrives = vi.fn()` declarations,
// which throws (`Cannot access 'listMemberPariwarDrives' before initialization`) when the mock
// factory runs. The mocked factory forwards `MEMBER_DRIVE_LIST_PAGE_SIZE_CAP` unchanged (`...actual.pool`),
// so this still reads the REAL constant.
const { pool: poolDomainActual } = await import('@twt/domain')

const PARIWAR_ID = '11111111-1111-1111-1111-111111111111'
const MEMBER_ID = '22222222-2222-2222-2222-222222222222'
const POOL_ID = '55555555-5555-5555-5555-555555555555'

function fakeRequest(): FastifyRequest {
  return {
    requestContext: { actorId: MEMBER_ID, pariwarId: PARIWAR_ID, traceId: 't' },
    query: {},
    log: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
  } as unknown as FastifyRequest
}

function deps(): AppDeps {
  return {
    clock: () => new Date('2026-09-09T00:00:00Z'),
    auditSink: { emit: vi.fn() },
    encryption: {},
  } as unknown as AppDeps
}

function wireScopeTx(): void {
  openScopeTx.mockResolvedValue({ tx: {}, client: {}, pariwarId: PARIWAR_ID })
  closeScopeTx.mockResolvedValue(undefined)
}

/** ONE domain row, shaped as `listMemberPariwarDrives` returns it — every field a legitimate `live` row carries. */
function liveRow(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    poolId: POOL_ID,
    poolIndex: 0,
    poolCanonicalIdentifier: 'P-2026-09-001',
    publicToken: 'OPAQUE-TOKEN-1',
    status: 'live',
    driveClosedAt: null,
    district: 'Patna',
    confirmedContributionCount: 3,
    confirmedPercentage: 50,
    driveTargetInr: null,
    amountRaisedInr: 1500,
    fundingOutcome: null,
    nomineeAccountHolderNameCiphertext: null,
    deceasedNameCiphertext: 'ct-name',
    ...overrides,
  }
}

describe('driveList — DELIBERATELY NOT FAIL-SOFT, and the exception is narrower than the rule', () => {
  it('⛔ a genuine domain-read failure PROPAGATES — the promise REJECTS, which is what 5xxs at the Fastify layer', async () => {
    // ⚠⛔ THIS IS THE FAILURE PATH THE STORY CALLS LOAD-BEARING, AND NOTHING PROVED IT BEFORE THIS
    // TEST. A failed `listMemberPariwarDrives` (a DB blip, a query error) must NOT be swallowed into
    // `items: []` — that would make AC6's error state unreachable by construction.
    vi.clearAllMocks()
    wireScopeTx()
    listMemberPariwarDrives.mockRejectedValue(new Error('simulated DB failure'))
    countMemberPariwarDrives.mockResolvedValue(0)

    const h = createMemberPoolHandlers(deps())
    await expect(h.driveList(fakeRequest())).rejects.toThrow('simulated DB failure')
    // [Review][Patch] — code review of 11b-15 (2026-09-09), SECOND pass: confirms the mocked
    // `@twt/domain` accessor is what the production code path actually calls, ⛔ not merely that
    // SOMETHING rejected — a refactor that changed how `handlers.ts` reaches this accessor could
    // otherwise leave this test exercising an unrelated failure and still passing.
    expect(listMemberPariwarDrives).toHaveBeenCalledTimes(1)
  })

  it('⭐ a SINGLE field decrypt failure degrades ONLY that field — the row survives, the page does NOT 5xx', async () => {
    // ⭐ The narrower, deliberate exception this route's doc-block names: the deceased name is omitted,
    // ⛔ never the row, and the request resolves normally.
    vi.clearAllMocks()
    wireScopeTx()
    listMemberPariwarDrives.mockResolvedValue([liveRow()])
    countMemberPariwarDrives.mockResolvedValue(1)
    poolLetterCode.mockReturnValue('A')
    decryptKycField.mockRejectedValue(new Error('simulated KMS failure'))

    const h = createMemberPoolHandlers(deps())
    const res = await h.driveList(fakeRequest())
    expect(res.items).toHaveLength(1)
    expect(res.items[0]?.deceasedMemberName).toBeNull()
    expect(decryptKycField).toHaveBeenCalledWith('ct-name', PARIWAR_ID, expect.anything())
  })

  it('⭐⭐ [Review][Patch] a NOMINEE-name decrypt failure ALSO degrades only that field — the SAME exception, the OTHER ciphertext', async () => {
    // ⚠⛔ Before this test only the DECEASED-name decrypt failure path was exercised, despite the
    // diff's own claim that both decrypts "ride the SAME bounded map" with identical catch-and-degrade
    // behaviour. This drives a row with a nominee ciphertext PRESENT and the deceased-name ciphertext
    // ABSENT, so the one `decryptKycField` call that fires is unambiguously the nominee one.
    vi.clearAllMocks()
    wireScopeTx()
    listMemberPariwarDrives.mockResolvedValue([
      liveRow({ deceasedNameCiphertext: null, nomineeAccountHolderNameCiphertext: 'ct-nominee' }),
    ])
    countMemberPariwarDrives.mockResolvedValue(1)
    poolLetterCode.mockReturnValue('A')
    decryptKycField.mockRejectedValue(new Error('simulated KMS failure'))

    const h = createMemberPoolHandlers(deps())
    const res = await h.driveList(fakeRequest())
    expect(res.items).toHaveLength(1)
    expect(res.items[0]?.deceasedMemberName).toBeNull()
    expect(res.items[0]?.nomineeName).toBeNull()
    expect(decryptKycField).toHaveBeenCalledWith('ct-nominee', PARIWAR_ID, expect.anything())
  })

  it('⛔⛔ [Review][Patch] a row violating `satisfiesMemberDriveLiveRowPairing` throws — the STRUCTURAL guard added by this review', async () => {
    // ⚠⛔ AC3's floor rests on `confirmedPercentage`/`driveTargetInr` being populated on a `live` row
    // and null/absent everywhere else. Before this patch nothing enforced that before a row reached
    // the wire; this is the guard added in `resolveDriveList`, and this test proves it actually fires.
    vi.clearAllMocks()
    wireScopeTx()
    // A `closed` row carrying a non-null `confirmedPercentage` — the exact shape the public wire may
    // NEVER carry off-Live (`2026-09-08-207` cl.1).
    listMemberPariwarDrives.mockResolvedValue([liveRow({ status: 'closed', confirmedPercentage: 50 })])
    countMemberPariwarDrives.mockResolvedValue(1)
    poolLetterCode.mockReturnValue('A')
    decryptKycField.mockResolvedValue('Rajesh Sharma')

    const h = createMemberPoolHandlers(deps())
    await expect(h.driveList(fakeRequest())).rejects.toThrow(/satisfiesMemberDriveLiveRowPairing/)
    // [Review][Patch] — code review of 11b-15 (2026-09-09), SECOND pass: the guard was moved BEFORE
    // the KYC decrypts (an efficiency fix, same pass) — proves it, rather than merely proving the
    // request eventually rejects. A malformed row should never pay for a KMS round-trip it's about
    // to reject anyway.
    expect(decryptKycField).not.toHaveBeenCalled()
  })

  it('⭐⭐ [Review][Patch] the MIRROR pairing violation — a `live` row with a NULL `confirmedPercentage` — also throws', async () => {
    // ⚠⛔ Before this test only ONE direction of the two-way pairing invariant was exercised (a
    // non-live row carrying a live-only value). `satisfiesMemberDriveLiveRowPairing` requires the
    // OPPOSITE too: a `live` row MUST carry a numeric `confirmedPercentage` — a bug in that half of
    // the predicate would have gone undetected by the suite before this test existed.
    vi.clearAllMocks()
    wireScopeTx()
    listMemberPariwarDrives.mockResolvedValue([liveRow({ confirmedPercentage: null })])
    countMemberPariwarDrives.mockResolvedValue(1)
    poolLetterCode.mockReturnValue('A')
    decryptKycField.mockResolvedValue('Rajesh Sharma')

    const h = createMemberPoolHandlers(deps())
    await expect(h.driveList(fakeRequest())).rejects.toThrow(/satisfiesMemberDriveLiveRowPairing/)
  })
})

describe('⭐⭐ [Review][Patch] code review of 11b-15 (2026-09-09) — the LOCKSTEP TEST the contract\'s own doc-block claims exists', () => {
  // ⚠⛔ `@twt/contracts/src/contributions/member-drive-list.ts`'s doc-block for
  // `MEMBER_DRIVE_LIST_LIMIT_MAX` states: "the numbers happen to coincide with the domain accessor's
  // `MEMBER_DRIVE_LIST_PAGE_SIZE_CAP` — and they MUST... two enforcements of one bound, and a
  // LOCKSTEP TEST PINS THEM TOGETHER" — but no test anywhere asserted that equality. ⭐ `@twt/domain`
  // may ⛔ not import `@twt/contracts` (a turbo cycle), so this cannot live in `packages/domain`'s own
  // tests; `apps/api` is the one place that already imports both.
  it('⛔ the contract`s page-size ceiling and the domain`s clamp cap are ONE bound, not two', () => {
    expect(MEMBER_DRIVE_LIST_LIMIT_MAX).toBe(poolDomainActual.MEMBER_DRIVE_LIST_PAGE_SIZE_CAP)
  })
})
