// Story 3.15d (DL4, AC 6) — the WRITE SITES of the code form's error line (`components/notifications/use-wa-code.ts`), pinned by
// SOURCE, comments stripped first (a mention in a comment is ⛔ a write). Presence pins in the shape of
// `nominee-screen-draft-pins.test.ts`: they show that every write that sets `line` also bumps `lineCount` — the counter the one
// effect in `WaCodeEntry.tsx` keys on — so an error line is spoken once per time it is SET. They show ⛔ that the line is spoken:
// that is leg (g) of `wa-code-entry-render.test.ts`, which executes one row per site. THE TWO ARE A PAIR: a new writer adds its row
// THERE and its count HERE.
//
// Why a source pin and not an ESLint fence: the repo has ⛔ `no-restricted-syntax`, the `:has()` selector it would need is
// unproven on this ESLint, a later flat-config entry for the same rule REPLACES an earlier one's options, and the 3.15b fence has
// ⛔ unit test of its own — a positive control would be new tooling. The type of `patch` (below) is the first line of defence:
// `tsc` bars `patch({ line: … })` as an object literal; this pin covers what `tsc` cannot (a non-fresh object variable, a literal
// that forgets its bump, a reverted type).
//
// ⚠ Blind spots, accepted (DL4): the pin is FORMATTING-DEPENDENT (Prettier is not enforced; it reads `line:` and `lineCount:` as
// written), and blind to a `line` set by SHORTHAND (`{ ...s, line }` — `setLine`'s own body) or by a literal built in a variable.
// The `sendCount` / `waitCount` bumps have no such pin (the same shape could carry one — a follow-up, not owed).
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const NEW_WRITER =
  'a new error-line writer is a new decision: add its row to leg (g) of `wa-code-entry-render.test.ts` AND to this pin (the counts below)'

const source = readFileSync(resolve(__dirname, '../../components/notifications/use-wa-code.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|\s)\/\/.*$/gm, '$1') // a line comment starts at a word boundary — ⛔ inside a string such as a URL

const hookAt = source.indexOf('export function useWaCode(')
// The hook is the last export; everything from its head on is its body (a renamed head would widen this to the whole file and
// loosen every count below — hence the assertion).
const hook = source.slice(hookAt)

/** The text between a call's `(` and its matching `)` — across lines, through nested parentheses. `from` is the call's `(`. */
function argsAt(text: string, open: number): string {
  let depth = 0
  for (let i = open; i < text.length; i += 1) {
    const ch = text[i]
    if (ch === '(') depth += 1
    if (ch === ')' && (depth -= 1) === 0) return text.slice(open + 1, i)
  }
  throw new Error('an unbalanced call')
}

/** The arguments of every `name(` call in the hook body (the `const name = useCallback(` definition is ⛔ a call of `name`). */
const callsOf = (name: string): string[] => [...hook.matchAll(new RegExp(`\\b${name}\\(`, 'g'))].map((m) => argsAt(hook, m.index! + name.length))

describe('use-wa-code.ts — every write that sets `line` bumps `lineCount` (the error line is spoken once per SET)', () => {
  it('the pin reads the hook body', () => {
    expect(hookAt, 'the hook moved or was renamed — fix the marker, ⛔ loosen the pin').toBeGreaterThan(-1)
    expect(hook.length).toBeGreaterThan(2000)
  })

  it('`patch`\'s declared parameter type cannot name `line` or `lineCount` — a revert of the type narrowing fails here, ⛔ only in `tsc`', () => {
    expect(source, NEW_WRITER).toContain("const patch = useCallback((next: Partial<Omit<WaCodeState, 'line' | 'lineCount'>>) =>")
  })

  it('`patch(` is called with ⛔ `line` / `lineCount` — a non-fresh object variable would slip past the type', () => {
    const calls = callsOf('patch')
    expect(calls.length, 'patch( is called in the hook body').toBeGreaterThan(0)
    for (const args of calls) expect(args, `${NEW_WRITER}: patch(${args})`).not.toMatch(/\bline(Count)?\b/)
  })

  it('NINE `setLine(` calls — each one bumps through the helper', () => {
    expect(callsOf('setLine'), NEW_WRITER).toHaveLength(9)
  })

  it('FIVE hand-written `setState(` literals carry `line:` — each ALSO carries a `lineCount:` that is incremented', () => {
    const literals = [...hook.matchAll(/\bsetState\(/g)].map((m) => argsAt(hook, m.index! + 'setState'.length)).filter((args) => /\bline:/.test(args))
    // two expression-bodied `(s) => ({ … })` and three block-bodied `(s) => { const told…; return { … } }` — ⛔ match only the
    // quoted arrow shape (it counts 2 and is red on day one): the argument text is what is read, whatever wraps it
    expect(literals, NEW_WRITER).toHaveLength(5)
    const values = literals.map((args) => {
      const m = /\blineCount:\s*([^,\n}]+)/.exec(args)
      expect(m, `${NEW_WRITER}: a literal with \`line:\` and ⛔ \`lineCount:\` — ${args.slice(0, 120)}`).not.toBeNull()
      return m![1]!.trim()
    })
    // `code_resend_too_soon` bumps only when the member is NEWLY told (its news is the wait, spoken on `waitCount`): the ONE named
    // conditional form. Every other literal bumps unconditionally — a bare `lineCount: s.lineCount` (present, ⛔ incremented) fails.
    const conditional = 'told ? s.lineCount + 1 : s.lineCount'
    expect(values.filter((v) => v === conditional), NEW_WRITER).toHaveLength(1)
    expect(values.filter((v) => v === 's.lineCount + 1'), NEW_WRITER).toHaveLength(4)
  })
})
