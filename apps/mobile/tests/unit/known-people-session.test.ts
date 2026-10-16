// Story 6.36b (Task 4) — the people-who-know-me member caches are cleared with the others: the query cache (other
// members' registered names) on sign-in, sign-out and a terminated / rejected refresh; the names the member SAVED on this
// phone (MMKV `known-people.saved-names.v1`) on sign-out and a terminated / rejected refresh (`lib/session-context.tsx`).
// And ⛔ the contact list is a query or an MMKV entry: the find screen holds it in state only.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const MOBILE = join(__dirname, '..', '..')
const read = (f: string) => readFileSync(join(MOBILE, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

/**
 * The body of the block the opener starts — from its FIRST `{` to the brace that closes it (brace-matched). ⭐ A fixed
 * 700-character window reached into the NEXT handler, so deleting a handler's own clears still passed on its neighbour's
 * calls (review round 2, P13).
 */
function block(src: string, opener: RegExp): string {
  const m = opener.exec(src)
  if (!m) return ''
  const open = src.indexOf('{', m.index + m[0].length - 1)
  if (open < 0) return ''
  let depth = 0
  for (let i = open; i < src.length; i += 1) {
    if (src[i] === '{') depth += 1
    else if (src[i] === '}') {
      depth -= 1
      if (depth === 0) return src.slice(open, i + 1)
    }
  }
  return ''
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
    else expect(body).not.toContain('clearSavedNames()')
  })

  // Fix-review (Story 6.36c) — the dismissal store is now namespaced per account (`lib/home-card-dismissals.ts`), so a
  // real account SWITCH is already isolated without an explicit clear. Only sign-out (where the account is reliably
  // known) still clears it, for privacy/cleanup on a shared device; the two refresh handlers register once at mount
  // and cannot reliably name the account that just got signed out, so they no longer call it at all.
  it('Story 6.36c — sign-out still clears the home cards’ dismissals', () => {
    expect(block(src, /async function signOut\(\)/)).toContain('clearHomeCardDismissals(')
  })

  // Code review round 2 — the two IN-MEMORY 6.36c stores (module-level, so they outlived a sign-out for the rest of the
  // app process): the suggestion card's session-only "Not now" and the confirm question's shared Idempotency-Keys.
  // What each clear DOES is executed in `home-prompt-cards-render.test.ts` / `suggestion-answer-key-cache.test.ts`.
  it('code review round 2 — sign-out also clears the session-only suggestion dismissals and the answer-key cache', () => {
    const signOut = block(src, /async function signOut\(\)/)
    expect(signOut).toContain('clearSessionSuggestionDismissals()')
    expect(signOut).toContain('clearAnswerKeys()')
  })

  it.each([
    ['a terminated refresh', /setTerminatedDuringRefreshHandler\(\(notice\) => \{/],
    ['a rejected refresh', /setRefreshRejectedHandler\(\(\) => \{/],
    ['sign-in', /async function signIn\(/],
  ])('Story 6.36c fix-review — %s no longer clears the home cards’ dismissals', (_label, opener) => {
    expect(block(src, opener)).not.toContain('clearHomeCardDismissals(')
  })

  it('the block reader stops at its own closing brace (a positive control — ⛔ the next handler)', () => {
    const two = 'a(() => {\n  one()\n})\nb(() => {\n  two()\n})'
    expect(block(two, /a\(\(\) => \{/)).toBe('{\n  one()\n}')
    expect(block(two, /a\(\(\) => \{/)).not.toContain('two()')
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
