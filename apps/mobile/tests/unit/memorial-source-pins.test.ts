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

  it('the Send hook\'s refetch also sets gcTime: 0', () => {
    expect(stripComments(read('apps/mobile/lib/use-memorial-send.ts'))).toMatch(/fetchQuery\(\{[^}]*gcTime: 0/)
  })

  it('⛔ memorial screen uses useStepUpGate (it texts the SESSION member — the deceased)', () => {
    for (const f of ['preview', 'outcome', 'write', 'photo', 'index']) {
      expect(stripComments(read(`apps/mobile/app/(memorial)/${f}.tsx`))).not.toMatch(/useStepUpGate/)
    }
    expect(stripComments(read('apps/mobile/lib/use-memorial-send.ts'))).not.toMatch(/useStepUpGate/)
  })
})
