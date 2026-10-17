// Story 6.30 AC7 — the STRICT route-map test (`2026-10-10-312` AL16, corrected by `-315` C8). It reads the
// route tree under `apps/mobile/app/` (the `sahyog-vivran-entry.test.ts` precedent) and:
//   (i)   FAILS when an `APP_LINK_PATHS` entry has ⛔ no route (`<path>.tsx` or `<path>/index.tsx`, route
//         groups stripped, `_layout` ignored);
//   (ii)  FAILS when two files claim the same app-link path (⛔ not tree-wide — same-path pairs exist
//         elsewhere: `/medical`, `/nominees`, `/payment`);
//   (iii) PINS the ROOT-LEVEL dynamic routes to exactly the two that exist today — so ⛔ no story adds a
//         third root catch-all (a `(group)/[x].tsx` is `/:x` — a route group is ⛔ not a URL segment).

import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { APP_LINK_PATH_LIST } from '@twt/contracts'

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../app')

/** Every route file, as its path relative to `app/`. */
function routeFiles(dir = APP, rel = ''): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const abs = path.join(dir, name)
    const relName = rel === '' ? name : `${rel}/${name}`
    if (statSync(abs).isDirectory()) out.push(...routeFiles(abs, relName))
    else if (/\.tsx?$/.test(name)) out.push(relName)
  }
  return out
}

/** The URL path a route file serves: groups stripped, `index` collapsed; `null` for a layout / special file. */
function urlOf(rel: string): string | null {
  const segments = rel.replace(/\.tsx?$/, '').split('/')
  const last = segments[segments.length - 1]!
  if (last === '_layout' || last.startsWith('+')) return null
  const visible = segments.filter((segment) => !/^\(.+\)$/.test(segment))
  if (visible[visible.length - 1] === 'index') visible.pop()
  return `/${visible.join('/')}`
}

const ROUTES = routeFiles().map((file) => ({ file, url: urlOf(file) }))

describe('(i) every app-link path has its own route', () => {
  it.each([...APP_LINK_PATH_LIST])('%s has a route file', (appLinkPath) => {
    expect(ROUTES.filter((route) => route.url === appLinkPath).map((route) => route.file)).not.toEqual([])
  })

  it('the /peer-request route is the 6.30 shell in its own group', () => {
    expect(ROUTES.filter((route) => route.url === '/peer-request').map((route) => route.file)).toEqual([
      '(peer-request)/peer-request.tsx',
    ])
  })
})

describe('(ii) ⛔ two files never claim the same app-link path', () => {
  it.each([...APP_LINK_PATH_LIST])('%s is claimed by exactly one file', (appLinkPath) => {
    expect(ROUTES.filter((route) => route.url === appLinkPath)).toHaveLength(1)
  })
})

describe('(iii) the root-level dynamic routes are pinned', () => {
  it('exactly (helpdesk)/[ticketId] and (polls)/[surveyId] — ⛔ no third root catch-all', () => {
    const rootDynamic = ROUTES.filter((route) => route.url !== null && /^\/\[[^/]+\]$/.test(route.url)).map(
      (route) => route.file.replace(/\.tsx?$/, ''),
    )
    expect(rootDynamic.sort()).toEqual(['(helpdesk)/[ticketId]', '(polls)/[surveyId]'])
  })

  it('⛔ no catch-all ([...x]) route anywhere', () => {
    expect(ROUTES.filter((route) => route.file.includes('[...'))).toEqual([])
  })
})

describe('the shell is thin and the root Stack declares its group', () => {
  const strip = (src: string): string => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
  const shell = strip(readFileSync(path.join(APP, '(peer-request)/peer-request.tsx'), 'utf8'))
  const slot = strip(
    readFileSync(path.join(APP, '../components/peer-request/PeerRequestSlot.tsx'), 'utf8'),
  )
  const root = strip(readFileSync(path.join(APP, '_layout.tsx'), 'utf8'))

  it('parses c through parseAppLinkCode and renders the slot for any c', () => {
    expect(shell).toContain('parseAppLinkCode(useLocalSearchParams())')
    expect(shell).toContain('<PeerRequestSlot code={code} />')
  })

  // ⭐ RE-SCOPED by Story 6.27a (Task 5, re-pin 2026-10-12) — ⛔ deleted: 6.27a FILLED the slot, so the slot now reaches the
  // API (through its children); the SHELL stays API-free, and the slot makes ⛔ no call before the session has loaded.
  it('⛔ no API import, ⛔ no fetch, ⛔ no query in the shell', () => {
    expect(shell).not.toMatch(/member-api|api-client|useQuery|useMutation|fetch\(|console\./)
  })

  it('Story 6.27a — the slot makes ⛔ no call before the session has loaded (it gates on useSession itself)', () => {
    expect(slot).toContain('const { session, isLoading } = useSession()')
    expect(slot).toContain('const pariwarId = isLoading ? undefined : session?.pariwarId')
    // ⭐ Story 6.27c — the loading branch is the pure `peerRequestSlotView` (an undefined pariwarId ⇒ `loading`, pinned in
    // `peer-request.test.ts`), rendered first.
    expect(slot).toMatch(/view\.kind === 'loading' \?/)
    // the slot calls the API ONLY through its hooks (Story 6.27c — the by-link hook among them) — never directly; the hooks'
    // queries are `enabled` only once a pariwarId is a string (the by-link one also needs a code — `peer-request-link.test.ts`)
    expect(slot).not.toMatch(/member-api|api-client|useQuery|useMutation|fetch\(|console\./)
    const queries = strip(readFileSync(path.join(APP, '../components/peer-request/usePeerRequestQueries.ts'), 'utf8'))
    // Story 6.27c — 2 → 3: the by-link resolver joins the list and the detail, gated the same way.
    expect(queries.match(/useQuery\(/g)).toHaveLength(3)
    expect(queries.match(/enabled: typeof pariwarId === 'string'/g)).toHaveLength(3)
  })

  it('Story 6.27a — the header: the slot HIDES the inner Stack\'s header (the in-screen pages carry their own Back)', () => {
    expect(slot).toMatch(/<Stack\.Screen options=\{\{ headerShown: false \}\} \/>/)
  })

  it('the root Stack declares (peer-request) with headerShown: false', () => {
    expect(root).toMatch(/<Stack\.Screen\s+name="\(peer-request\)"\s+options=\{\{\s*headerShown: false,?\s*\}\}/)
  })
})
