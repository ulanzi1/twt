// Story 11b.4 (Task 6.1 / AC1) — source pins the type-checker cannot give in a worktree with ⛔ `apps/mobile/.expo/types`
// (⛔ typed Href check — [[project_mobile_typed_routes_worktree]]): the entry route, its place on home, the route group's
// registration, and ⭐ `gcTime: 0` on EVERY memorial query (the persisted MMKV cache must never hold the family's words).

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')
const read = (rel: string): string => readFileSync(path.join(repoRoot, rel), 'utf8')
const stripComments = (src: string): string => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\/.*$/gm, '')

describe('the memorial entry and route group', () => {
  it('<MemorialEntry /> pushes the (memorial) group', () => {
    expect(stripComments(read('apps/mobile/components/memorial-authorship/MemorialEntry.tsx'))).toContain("router.push('/(memorial)')")
  })

  it('home mounts <MemorialEntry /> right after <ClaimProxyFlowEntry /> — in code, ⛔ a comment', () => {
    const src = stripComments(read('apps/mobile/app/(tabs)/index.tsx'))
    expect(src).toMatch(/<ClaimProxyFlowEntry \/>[\s{}]*<MemorialEntry \/>/)
  })

  it('the root Stack registers (memorial) with headerShown: false', () => {
    const src = stripComments(read('apps/mobile/app/_layout.tsx'))
    expect(src).toMatch(/name="\(memorial\)"\s*options=\{\{\s*headerShown: false,?\s*\}\}/)
  })

  it('⛔ the Shradhanjali P0-5 tab is ⛔ the entry (it renders sample data)', () => {
    expect(read('apps/mobile/app/(tabs)/shradhanjali.tsx')).not.toMatch(/memorial-authorship|\(memorial\)/)
  })
})

describe('⭐ every memorial query is kept out of the persisted cache (AC1)', () => {
  it('each useQuery in the memorial hooks sets gcTime: 0 and staleTime: 0', () => {
    const src = stripComments(read('apps/mobile/components/memorial-authorship/useMemorialQueries.ts'))
    const queries = src.split('useQuery<').slice(1)
    expect(queries.length).toBe(2)
    for (const q of queries) {
      const body = q.slice(0, q.indexOf('})'))
      expect(body).toMatch(/gcTime: 0/)
      expect(body).toMatch(/staleTime: 0/)
    }
  })

  // Y — the Send no longer refetches the view itself (no pre-send / 409 refetch). Should a fetch come back, it must be kept
  // out of the persisted cache too: every `fetchQuery(` in the hook sets `gcTime: 0` (vacuous while there is none).
  it('any fetchQuery in the Send hook sets gcTime: 0', () => {
    const src = stripComments(read('apps/mobile/lib/use-memorial-send.ts'))
    const calls = src.split('fetchQuery(').slice(1)
    for (const c of calls) expect(c.slice(0, c.indexOf('})'))).toMatch(/gcTime: 0/)
  })

  it('⛔ memorial screen uses useStepUpGate (it texts the SESSION member — the deceased)', () => {
    for (const f of ['preview', 'outcome', 'write', 'photo', 'index']) {
      expect(stripComments(read(`apps/mobile/app/(memorial)/${f}.tsx`))).not.toMatch(/useStepUpGate/)
    }
    expect(stripComments(read('apps/mobile/lib/use-memorial-send.ts'))).not.toMatch(/useStepUpGate/)
  })
})

describe('R20 — the screens never go blank, and never read the saved draft before the view exists', () => {
  const SCREENS = ['index', 'write', 'photo', 'preview', 'outcome']

  it('no memorial screen returns null for a missing view or session — each renders <MemorialViewMissing />', () => {
    for (const f of SCREENS) {
      const src = stripComments(read(`apps/mobile/app/(memorial)/${f}.tsx`))
      expect(src, f).not.toMatch(/return null/)
      expect(src, f).toMatch(/<MemorialViewMissing\b/)
    }
  })

  it('write and photo load the saved draft in an EFFECT, never in a useState initializer (a cold mount has no view yet)', () => {
    for (const f of ['write', 'photo']) {
      const src = stripComments(read(`apps/mobile/app/(memorial)/${f}.tsx`))
      expect(src, f).not.toMatch(/useState[^\n]*loadMemorialDraft/)
      expect(src, f).toMatch(/useEffect\(\(\) => \{[^}]*loadMemorialDraft/)
    }
  })
})

// Y (BigDev 2026-10-24, "simplify" + "key on the row") — the T3 claim-TTL pin and the W2 elevation-window pin are gone with
// the constants they pinned: the Send's key and the handover machine no longer read a clock at all. This pin keeps it so.
describe('Y — ⛔ no clock decides the Send key or the handover code', () => {
  it.each(['apps/mobile/lib/use-memorial-send.ts', 'apps/mobile/lib/memorial-draft.ts', 'apps/mobile/lib/handover-gate.ts'])('%s reads no clock and sets no timer', (f) => {
    const src = stripComments(read(f))
    expect(src).not.toMatch(/Date\.now|new Date\(|performance\.now|setTimeout|setInterval/)
    expect(src).not.toMatch(/mintedAt|firstPostedAt|lastPostedAt|TTL_MS|ELEVATION_MS|BOUND_MS/)
  })

  // Z5 — the effect also notes when THIS request's send settled (`settle(…)`), still keyed on the counter ALONE.
  it('the SMS effect is keyed on the machine\'s request counter, ⛔ never on otp.send (rebuilt every render)', () => {
    const src = stripComments(read('apps/mobile/lib/use-memorial-send.ts'))
    expect(src).toMatch(/useEffect\(\(\) => \{\s*if \(codeRequests > 0\) void settle\(otp\.send\(\), [^\n]*\)\s*\}, \[codeRequests\]\)/)
    expect(src.match(/otp\.send\(/g)).toHaveLength(1) // the ONE place an SMS is asked for
  })

  // Z0 (A) — the wait before "Send a new code" lives in the PANEL (a component timer), so the three files above stay clock-free.
  it('the resend wait is a timer in HandoverCodePanel, cleared on change', () => {
    const src = stripComments(read('apps/mobile/components/memorial-authorship/HandoverCodePanel.tsx'))
    expect(src).toMatch(/setTimeout\(/)
    expect(src).toMatch(/clearTimeout\(/)
  })
})

describe('T6 — write and photo re-read the saved draft on FOCUS (a stale screen in the stack cannot save over a newer draft)', () => {
  it.each(['write', 'photo'])('%s: a useFocusEffect reads loadMemorialDraft', (f) => {
    const src = stripComments(read(`apps/mobile/app/(memorial)/${f}.tsx`))
    expect(src).toMatch(/useFocusEffect\(\s*useCallback\(\(\) => \{[\s\S]{0,300}?loadMemorialDraft/)
  })
})

describe('T12 (b) — the outcome reads the photo\'s reason from ONE source (the view), ⛔ through the presenter', () => {
  it('outcome.tsx passes no photo reason to reconstructMemorial, and renders view.photoLeftOut.reason', () => {
    const src = stripComments(read('apps/mobile/app/(memorial)/outcome.tsx'))
    expect(src).not.toMatch(/photoLeftOutReason/)
    expect(src).toMatch(/reason\(view\.photoLeftOut\.reason\)/)
  })
})
