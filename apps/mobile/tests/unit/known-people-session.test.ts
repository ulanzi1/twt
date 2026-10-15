// Story 6.36b (Task 4) — the people-who-know-me member caches are cleared with the others: the query cache (other
// members' registered names) on sign-in, sign-out and a terminated / rejected refresh; the names the member SAVED on this
// phone (MMKV `known-people.saved-names.v1`) on sign-out and a terminated / rejected refresh (`lib/session-context.tsx`).
// And ⛔ the contact list is a query or an MMKV entry: the find screen holds it in state only.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const MOBILE = join(__dirname, '..', '..')
const read = (f: string) => readFileSync(join(MOBILE, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

/** The body of `name(` … up to its first closing at the opening indent — enough for a source scan. */
function block(src: string, opener: RegExp): string {
  const m = opener.exec(src)
  if (!m) return ''
  return src.slice(m.index, m.index + 700)
}

describe('session-context clears the people-who-know-me caches', () => {
  const src = read('lib/session-context.tsx')

  it.each([
    ['a terminated refresh', /setTerminatedDuringRefreshHandler\(\(notice\) => \{/, true],
    ['a rejected refresh', /setRefreshRejectedHandler\(\(\) => \{/, true],
    ['sign-out', /async function signOut\(\)/, true],
    ['sign-in', /async function signIn\(/, false],
  ])('%s', (_label, opener, savedNamesToo) => {
    const body = block(src, opener)
    expect(body).toContain('clearKnownPeopleCache(queryClient)')
    if (savedNamesToo) expect(body).toContain('clearSavedNames()')
  })
})

describe('the contact list is held in memory only', () => {
  it('the find screen keeps contacts in component state — ⛔ MMKV, ⛔ useQuery', () => {
    const find = read('app/(life-events)/known-people-find.tsx')
    expect(find).not.toMatch(/mmkv|useQuery\(|setQueryData/)
    expect(find).toMatch(/useState<Phase>/)
    const contacts = read('lib/known-people-contacts.ts')
    expect(contacts).not.toMatch(/mmkv|setItem|console\./)
  })
})
