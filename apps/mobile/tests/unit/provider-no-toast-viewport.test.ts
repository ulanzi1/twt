// TalkBack device session 2026-10-27 (T3) — the Tamagui starter's toast is GONE from the app's Provider. Nothing ever showed a
// toast, and its empty `ToastViewport` (default label "Notifications ({hotkey})") put an English "Notifications (F8)" in every
// screen's reading order: TalkBack landed on it after the memorial Send. Nothing executes the Provider here (it carries the
// persisted query cache and the Tamagui config), so this is a PRESENCE pin on its source, comments stripped first (a mention in a
// comment is ⛔ an import) — the `nominee-screen-draft-pins.test.ts` kind. The device re-check is the proof that it is silent.
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const source = readFileSync(resolve(__dirname, '../../components/Provider.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  .replace(/(^|\s)\/\/.*$/gm, '$1')

describe('T3 — ⛔ toast viewport in the app Provider', () => {
  it('the Provider imports ⛔ @tamagui/toast and renders ⛔ ToastProvider / ToastViewport', () => {
    expect(source).not.toMatch(/@tamagui\/toast/)
    expect(source).not.toMatch(/<Toast(Provider|Viewport)\b/)
  })

  it('the starter demo (CurrentToast / ToastControl) is deleted', () => {
    expect(existsSync(resolve(__dirname, '../../components/CurrentToast.tsx'))).toBe(false)
  })
})
