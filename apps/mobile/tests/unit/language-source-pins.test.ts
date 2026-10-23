// Story 6.35 (AC6, AC7; LS3, LS5, LS6 (a); T4, T5) — source pins for what cannot be unit-called:
//   · the three member-data clear paths in `lib/session-context.tsx` (`signOut` and the two refresh handlers) leave BOTH
//     language keys — a phone setting, kept on sign-out (the `known-people-session.test.ts` brace-matched block shape);
//   · the reconciliation is ONE effect keyed on the member + ONE app-level `AppState` listener;
//   · the root layout reads the stored language SYNCHRONOUSLY into `initialLocale` (T4 — ⛔ in an effect);
//   · the home entry routes to `/(settings)/language`, the screen file exists, and the entry sits directly above
//     `NotificationSettingsEntry` (the `wa-signup-step-render` PREV / NEXT shape — `tsc` accepts any two-segment `Href`,
//     [[project_mobile_typed_routes_worktree]], so only this test catches a wrong route);
//   · ⛔ `[t]` dependency in the files this story adds or edits (T5).

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const MOBILE = join(__dirname, '..', '..')
const raw = (f: string) => readFileSync(join(MOBILE, f), 'utf8')
const read = (f: string) => raw(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

/** The body of the block the opener starts — from its FIRST `{` to the brace that closes it (brace-matched). */
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

const LANGUAGE_KEY_REFS = /app-language|APP_LANGUAGE|clearAppLanguage|removeItem\(/

describe('session-context keeps the language keys on every member-data clear (AC6; LS3)', () => {
  const src = read('lib/session-context.tsx')

  it.each([
    ['a terminated refresh', /setTerminatedDuringRefreshHandler\(\(notice\) => \{/],
    ['a rejected refresh', /setRefreshRejectedHandler\(\(\) => \{/],
    ['sign-out', /async function signOut\(\)/],
  ])('%s clears member data but ⛔ either language key', (_label, opener) => {
    const body = block(src, opener)
    expect(body).toContain('clearKnownPeopleCache(queryClient)') // the right block (a positive control)
    expect(body).not.toMatch(LANGUAGE_KEY_REFS)
  })

  it('⛔ module in the session layer removes a language key (only `syncAppLanguage` drops a pending record — its own rule)', () => {
    expect(src).not.toMatch(/app-language\.(pending\.)?v1/)
    expect(raw('lib/app-language.ts')).not.toMatch(/clearAll\(/)
  })

  it('ONE effect keyed on the member calls syncAppLanguage, and ONE app-level AppState listener resyncs from a ref', () => {
    expect(src.match(/syncAppLanguage\(/g)).toHaveLength(2)
    expect(src.match(/AppState\.addEventListener\(/g)).toHaveLength(1)
    expect(src).toMatch(/useEffect\(\(\) => \{\s*memberIdRef\.current = memberId[\s\S]*?\}, \[memberId, setLocale\]\)/)
    const listener = block(src, /AppState\.addEventListener\('change', \(state\) => \{/)
    expect(listener).toContain("if (state !== 'active') return")
    expect(listener).toContain('memberIdRef.current')
  })
})

describe('the root layout reads the stored language synchronously (T4)', () => {
  it('`initialLocale={readStoredLanguage() ?? undefined}` on the LocaleProvider, ⛔ in an effect', () => {
    const src = read('app/_layout.tsx')
    expect(src).toContain('<LocaleProvider initialLocale={readStoredLanguage() ?? undefined}>')
    for (const effect of src.matchAll(/useEffect\(\(\) => \{/g)) {
      expect(block(src.slice(effect.index), /useEffect\(\(\) => \{/)).not.toContain('readStoredLanguage')
    }
  })
})

describe('the home entry routes to the language screen (AC7; LS6 (a))', () => {
  it('LanguageSettingsEntry pushes `/(settings)/language` and the screen file exists', () => {
    expect(read('components/settings/LanguageSettingsEntry.tsx')).toContain("router.push('/(settings)/language')")
    expect(existsSync(join(MOBILE, 'app', '(settings)', 'language.tsx'))).toBe(true)
  })

  it('the home tab mounts it directly above NotificationSettingsEntry', () => {
    const src = raw('app/(tabs)/index.tsx').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    expect(src).toMatch(/<LanguageSettingsEntry \/>\s*<NotificationSettingsEntry \/>/)
  })
})

describe('⛔ `[t]` dependency in the files this story adds or edits (T5)', () => {
  it.each([
    'app/(settings)/language.tsx',
    'components/settings/LanguageSettingsEntry.tsx',
    'lib/app-language.ts',
    'app/(auth)/login.tsx',
    'app/(claim)/contact.tsx',
    'app/_layout.tsx',
    'lib/session-context.tsx',
    'app/(tabs)/index.tsx',
  ])('%s', (file) => {
    for (const deps of read(file).matchAll(/\},\s*\[([^\]]*)\]\s*\)/g)) {
      expect(deps[1]!.split(',').map((d) => d.trim()), `${file}: [${deps[1]}]`).not.toContain('t')
    }
  })
})
