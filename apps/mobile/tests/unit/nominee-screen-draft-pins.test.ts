// Story 6.36e (fix-diff review, round 3, 2026-10-24) — what the NOMINEES SCREEN does with a draft and with the line that says
// what a pick did. Nothing executes this screen (it carries the step-up gate, the draft store, the router and three queries), so
// these are PRESENCE pins on its source, with comments stripped first (a mention in a comment is ⛔ a call) — the same kind of pin
// as `nominee-link-match-purpose.test.ts`. They prove the wiring is there; ⛔ that it behaves on a phone (a screen reader and the
// layout still need a device — [[feedback_record_unattested_no_backfill]]). The behaviour of what they point at is executed:
// `redactForDraft` in `nominee-links-logic.test.ts`, the form in `nominee-form-link-render.test.ts`.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const source = readFileSync(resolve(__dirname, '../../app/(life-events)/nominees.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|\s)\/\/.*$/gm, '$1') // a line comment starts at a word boundary — ⛔ inside a string such as a URL

/** The text between a call's `(` and its matching `)` — across lines, through nested parentheses and strings. */
function argsOf(from: number): string {
  let depth = 0
  for (let i = source.indexOf('(', from); i < source.length; i += 1) {
    const ch = source[i]
    if (ch === '(') depth += 1
    if (ch === ')' && (depth -= 1) === 0) return source.slice(source.indexOf('(', from) + 1, i)
  }
  throw new Error('an unbalanced call')
}

describe('the nominees screen stores a REDACTED draft (checklist family 6 — another member\'s name must not reach the phone\'s storage)', () => {
  const starts = [...source.matchAll(/\bsaveDraft\(/g)].map((m) => m.index!)

  it('there are two writers of the draft — the keyed form\'s remount and every form edit — and BOTH store `redactForDraft(…)`', () => {
    expect(starts).toHaveLength(2) // a third writer is a new decision: it must be added here, with its redaction
    for (const at of starts) {
      const args = argsOf(at)
      expect(args, args).toMatch(/\bredactForDraft\(/)
      expect(args, args).not.toMatch(/,\s*(forms|latestForms\.current)\s*$/) // the raw slots are ⛔ the last argument
    }
  })

  it('a draft is ⛔ written any other way (the store\'s `saveDraft` is the only writer imported)', () => {
    expect(source).not.toMatch(/mmkvStorage|setItem\(/)
  })
})

describe('the pick line (what the pick did) — round 3', () => {
  it('stores the NAME and is translated where it is RENDERED — ⛔ text frozen in the language of the moment', () => {
    expect(source).toMatch(/useState<\{ name: string \| null; seq: number \} \| null>/)
    expect(source).toMatch(/lt\('form\.marked', \{ name: pickNotice\.name \}\)/)
    expect(source).not.toMatch(/setPickNotice\(\{ text:/)
  })

  it('every remount clears it first (a stale reload, *Continue draft*) — a pick sets it AFTER; it sits inside the screen\'s gutter', () => {
    const head = source.indexOf('function remountWith')
    expect(head).toBeGreaterThan(-1)
    expect(source.slice(head)).toMatch(/function remountWith\(forms: NomineeFormEntry\[\]\): void \{\s*setPickNotice\(null\)/)
    const from = source.indexOf('const applied = applyPick')
    const to = source.indexOf('}, [initialForms, links.data])')
    expect(from).toBeGreaterThan(-1) // a renamed marker would widen the slice to the whole file and loosen every assertion below
    expect(to).toBeGreaterThan(from)
    const pick = source.slice(from, to)
    expect(pick.indexOf('remountWith(applied)')).toBeGreaterThan(-1)
    expect(pick.indexOf('setPickNotice({ name:')).toBeGreaterThan(pick.indexOf('remountWith(applied)'))
    expect(source).toMatch(/<YStack px="\$6" pt="\$4">\s*<AnnouncedText key=\{pickNotice\.seq\}/)
  })
})
