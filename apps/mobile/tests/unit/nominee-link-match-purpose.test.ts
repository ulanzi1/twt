// Story 6.36e (NE3 / V12; `2026-10-24-396` Q2 A; code review 2026-10-24) — the contact-match call for a NOMINEE mark carries
// `purpose: 'nominee_link'`. It is the ONLY thing that makes the server's audit line say the second purpose the Panel ruled
// (`contact_match_nominee`, ⛔ 6.36b's `contact_match`) — and no mobile test executes the find screen, so dropping the argument
// kept every test green. Two pins: the wrapper passes it, and the find screen calls the wrapper (⛔ the bare client).
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { KnownPeopleContactMatchRequest } from '@twt/contracts'
import { describe, expect, it, vi } from 'vitest'

const { contactMatches } = vi.hoisted(() => ({ contactMatches: vi.fn(async () => ({ matched: [0] })) }))
vi.mock('../../lib/known-people-api', () => ({ knownPeopleApi: { contactMatches } }))
vi.mock('../../lib/session', () => ({ getAccessToken: async () => 'token' }))

import { matchContactsForNominee, NOMINEE_LINK_MATCH_PURPOSE } from '../../lib/nominee-links-api'

describe('the nominee contact match names its purpose', () => {
  it('the wrapper sends `purpose: "nominee_link"` with the numbers — a purpose the server\'s contract accepts', async () => {
    await matchContactsForNominee(['+919876500001', '+919876500002'])
    expect(contactMatches).toHaveBeenCalledTimes(1)
    expect(contactMatches).toHaveBeenCalledWith(['+919876500001', '+919876500002'], 'nominee_link')
    expect(NOMINEE_LINK_MATCH_PURPOSE).toBe('nominee_link')
    expect(KnownPeopleContactMatchRequest.safeParse({ numbers: ['+919876500001'], purpose: NOMINEE_LINK_MATCH_PURPOSE }).success).toBe(true)
  })

  it('the find screen calls the WRAPPER — ⛔ the bare 6.36b client, which would log the nominee use under 6.36b\'s purpose', () => {
    // COMMENTS stripped first (as `peer-request-link.test.ts` does): a mention in a comment is ⛔ a call
    const source = readFileSync(resolve(__dirname, '../../app/(life-events)/nominee-link-find.tsx'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
    expect(source).toMatch(/matchContactsForNominee\(/)
    expect(source).not.toMatch(/knownPeopleApi/)
    expect(source).not.toMatch(/\.contactMatches\(/)
  })
})
