// `2026-10-27-409` — the member claim client's `getMemberName()`: GET …/member/claims/member-name with the member bearer, the
// response STRICT-parsed (a name or null; ⛔ an extra field).

import { describe, expect, it } from 'vitest'

import { createMemberClaimClient } from '../src/index'

function fakeFetch(responses: { status: number; body: unknown }[]) {
  const calls: { url: string; method: string; headers: Record<string, string> }[] = []
  const impl = (async (url: string, init: RequestInit) => {
    calls.push({ url, method: init.method ?? 'GET', headers: init.headers as Record<string, string> })
    const r = responses.shift()!
    return new Response(JSON.stringify(r.body), { status: r.status, headers: { 'content-type': 'application/json' } })
  }) as unknown as typeof fetch
  return { calls, impl }
}

describe('createMemberClaimClient — getMemberName (`2026-10-27-409`)', () => {
  it('GET …/member/claims/member-name with the bearer; a name, then null, parsed', async () => {
    const { calls, impl } = fakeFetch([
      { status: 200, body: { name: 'Shanti Devi' } },
      { status: 200, body: { name: null } },
    ])
    const c = createMemberClaimClient({ baseUrl: 'https://api.test', getAccessToken: () => 'tok', fetchImpl: impl })
    expect(await c.getMemberName()).toEqual({ name: 'Shanti Devi' })
    expect(await c.getMemberName()).toEqual({ name: null })
    expect(calls.map((x) => `${x.method} ${x.url}`)).toEqual([
      'GET https://api.test/api/v1/member/claims/member-name',
      'GET https://api.test/api/v1/member/claims/member-name',
    ])
    for (const call of calls) expect(call.headers['authorization']).toBe('Bearer tok')
  })

  it('a body with any other field is refused (strict)', async () => {
    const { impl } = fakeFetch([{ status: 200, body: { name: 'Shanti Devi', memberId: 'm' } }])
    const c = createMemberClaimClient({ baseUrl: 'https://api.test', getAccessToken: () => 'tok', fetchImpl: impl })
    await expect(c.getMemberName()).rejects.toThrow()
  })
})
