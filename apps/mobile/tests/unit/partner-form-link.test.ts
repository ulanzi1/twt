// Story 12.5b (Task 8; AC6, AC7; `2026-11-22-489` QE15; I3, I6; TR19) — the partner's-own-page opener.
//
// `openPartnerForm` calls `Linking.openURL` ONCE with EXACTLY its input (`===` — ⛔ a rewrite, ⛔ an appended query: I3) and
// returns 'failed' when that throws. A static FENCE reads the file: ⛔ `expo-web-browser` / `react-native-webview` / `WebBrowser`
// anywhere in it (both are one autocomplete away — `expo-web-browser` IS a dependency of this app, TR19), ⛔ `canOpenURL`, and its
// only import is `react-native`'s `Linking`.

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { beforeEach, describe, expect, it, vi } from 'vitest'

const openURL = vi.fn()
vi.mock('react-native', () => ({ Linking: { openURL: (u: string) => openURL(u) } }))

const { openPartnerForm } = await import('../../lib/partner-form-link.js')

const here = dirname(fileURLToPath(import.meta.url))
const SOURCE = readFileSync(join(here, '../../lib/partner-form-link.ts'), 'utf8')
/** The file's code with its comments removed (the header names the forbidden modules on purpose). */
const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

beforeEach(() => {
  openURL.mockReset()
})

describe('openPartnerForm (AC6, AC7)', () => {
  it('passes EXACTLY its input to Linking.openURL, once — ⛔ rewritten, ⛔ a query appended', async () => {
    openURL.mockResolvedValue(undefined)
    const url = 'https://partner.example/apply?offer=twt-bihar-lic'
    expect(await openPartnerForm(url)).toBe('opened')
    expect(openURL).toHaveBeenCalledTimes(1)
    expect(openURL.mock.calls[0]![0]).toBe(url) // the SAME string, byte for byte
  })

  it("returns 'failed' when openURL throws — and does not try again", async () => {
    openURL.mockRejectedValue(new Error('no handler'))
    expect(await openPartnerForm('https://partner.example/apply')).toBe('failed')
    expect(openURL).toHaveBeenCalledTimes(1)
  })
})

describe('the opener fence (I6, TR19)', () => {
  it('the fence is NON-VACUOUS: it sees the real call', () => {
    expect(CODE).toContain('Linking.openURL(url)')
  })

  it('⛔ expo-web-browser, ⛔ react-native-webview, ⛔ WebBrowser anywhere in the code; ⛔ canOpenURL', () => {
    for (const banned of ['expo-web-browser', 'react-native-webview', 'WebBrowser', 'WebView', 'canOpenURL']) {
      expect(CODE).not.toContain(banned)
    }
  })

  it("its ONLY import is react-native's Linking (a plain string in — ⛔ @twt/domain, TR18)", () => {
    const imports = [...CODE.matchAll(/^\s*import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/gm)].map((m) => [m[1]!.trim(), m[2]!])
    expect(imports).toEqual([['{ Linking }', 'react-native']])
    expect(CODE).not.toMatch(/require\(|import\(/)
  })
})
