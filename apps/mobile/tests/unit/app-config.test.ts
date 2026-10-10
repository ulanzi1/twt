// Story 6.30 AC3 — the app config as a pure function of the env (`2026-10-10-312` AL1 / AL7, `-315` C1,
// `-316` E1), and the `eas.json` lockstep: each build profile's `env.APP_VARIANT` equals its name.
// ⚠ This file imports app.config.ts THROUGH VITE, which would also resolve a TypeScript import from
// @twt/contracts — the real Expo loader is exercised by the `expo-config` CI job
// (scripts/check-app-config.mjs), ⛔ not here.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { APP_IDENTITY_ENV, APP_VARIANTS, resolveAppConfig } from '../../app.config'

const MOBILE = join(__dirname, '..', '..')
const FIXTURE = JSON.parse(readFileSync(join(MOBILE, 'tests/fixtures/app-config-prototype.json'), 'utf8'))
const IDENTITY = {
  APP_IDENTITY_NAME: 'Fixture App',
  APP_IDENTITY_SCHEME: 'fixtureapp',
  APP_IDENTITY_IOS_BUNDLE_ID: 'org.example.fixture',
  APP_IDENTITY_ANDROID_PACKAGE: 'org.example.fixture',
}

/** The fields the prototype fixture fixes, from a resolved config. */
function identityOf(config: ReturnType<typeof resolveAppConfig>) {
  return {
    name: config.name,
    slug: config.slug,
    scheme: config.scheme,
    bundleIdentifier: config.ios?.bundleIdentifier,
    package: config.android?.package,
  }
}

describe('app.config — non-production variants keep the prototype', () => {
  it.each([[{}], [{ APP_VARIANT: '' }], [{ APP_VARIANT: 'development' }], [{ APP_VARIANT: 'preview' }]])(
    'env %j ⇒ the prototype identity and no link settings',
    (env) => {
      const config = resolveAppConfig(env)
      expect(identityOf(config)).toEqual({
        name: FIXTURE.name,
        slug: FIXTURE.slug,
        scheme: FIXTURE.scheme,
        bundleIdentifier: FIXTURE.ios.bundleIdentifier,
        package: FIXTURE.android.package,
      })
      expect(config.android?.intentFilters).toBeUndefined()
      expect(config.ios?.associatedDomains).toBeUndefined()
    },
  )

  it('ignores APP_IDENTITY_* and APP_LINKS_HOST outside production', () => {
    const config = resolveAppConfig({ APP_VARIANT: 'preview', ...IDENTITY, APP_LINKS_HOST: 'links.example.org' })
    expect(config.name).toBe(FIXTURE.name)
    expect(config.android?.intentFilters).toBeUndefined()
  })

  it('every static field equals the fixture (the resolved-config fields Expo adds aside)', () => {
    const config = JSON.parse(JSON.stringify(resolveAppConfig({}))) as Record<string, unknown>
    const fixtureStatic = { ...FIXTURE }
    for (const added of ['sdkVersion', 'platforms', 'extra']) delete fixtureStatic[added]
    expect(config).toEqual(fixtureStatic)
  })
})

describe('app.config — production', () => {
  it('throws without APP_IDENTITY_* — ⛔ never a silent prototype production build', () => {
    expect(() => resolveAppConfig({ APP_VARIANT: 'production' })).toThrow(/APP_IDENTITY_NAME/)
  })

  it.each(APP_IDENTITY_ENV)('throws when %s alone is missing or blank', (name) => {
    expect(() => resolveAppConfig({ APP_VARIANT: 'production', ...IDENTITY, [name]: undefined })).toThrow(name)
    expect(() => resolveAppConfig({ APP_VARIANT: 'production', ...IDENTITY, [name]: '  ' })).toThrow(name)
  })

  it('takes the identity from APP_IDENTITY_*; slug stays ONE value', () => {
    const config = resolveAppConfig({ APP_VARIANT: 'production', ...IDENTITY })
    expect(identityOf(config)).toEqual({
      name: 'Fixture App',
      slug: FIXTURE.slug,
      scheme: 'fixtureapp',
      bundleIdentifier: 'org.example.fixture',
      package: 'org.example.fixture',
    })
  })

  it('without APP_LINKS_HOST ⇒ no link settings', () => {
    const config = resolveAppConfig({ APP_VARIANT: 'production', ...IDENTITY })
    expect(config.android?.intentFilters).toBeUndefined()
    expect(config.ios?.associatedDomains).toBeUndefined()
  })

  it('with APP_LINKS_HOST ⇒ one autoVerify filter, EXACT paths (⛔ never pathPrefix), applinks:<host> only', () => {
    const config = resolveAppConfig({ APP_VARIANT: 'production', ...IDENTITY, APP_LINKS_HOST: 'links.example.org' })
    expect(config.android?.intentFilters).toEqual([
      {
        action: 'VIEW',
        autoVerify: true,
        data: [{ scheme: 'https', host: 'links.example.org', path: '/peer-request' }],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ])
    expect(JSON.stringify(config.android?.intentFilters)).not.toContain('pathPrefix')
    expect(config.ios?.associatedDomains).toEqual(['applinks:links.example.org'])
    expect(JSON.stringify(config)).not.toContain('mode=developer')
  })

  it.each(['https://links.example.org', 'links.example.org/', 'Links.Example.org', 'links.example.org:443', 'localhost'])(
    'refuses APP_LINKS_HOST=%s (a bare lower-case host only)',
    (host) => {
      expect(() => resolveAppConfig({ APP_VARIANT: 'production', ...IDENTITY, APP_LINKS_HOST: host })).toThrow(/APP_LINKS_HOST/)
    },
  )

  it('carries no extra.eas.projectId until the EAS project exists (`-316` E1)', () => {
    expect(resolveAppConfig({ APP_VARIANT: 'production', ...IDENTITY }).extra?.eas).toBeUndefined()
  })
})

describe('app.config — the variant', () => {
  it('throws on an unknown APP_VARIANT (a typo must not fall back to the prototype)', () => {
    expect(() => resolveAppConfig({ APP_VARIANT: 'prod' })).toThrow(/APP_VARIANT/)
  })

  it('never keys on EAS_BUILD_PROFILE (the local EAS CLI never sees it — F2c)', () => {
    expect(resolveAppConfig({ EAS_BUILD_PROFILE: 'production' }).name).toBe(FIXTURE.name)
    const source = readFileSync(join(MOBILE, 'app.config.ts'), 'utf8')
    expect(source.replace(/^\s*\/\/.*$/gm, '')).not.toContain('EAS_BUILD_PROFILE')
  })
})

describe('eas.json ↔ the variants', () => {
  const eas = JSON.parse(readFileSync(join(MOBILE, 'eas.json'), 'utf8')) as {
    build: Record<string, { env?: Record<string, string> }>
  }

  it('each build profile sets env.APP_VARIANT to its own name', () => {
    expect(Object.keys(eas.build).sort()).toEqual([...APP_VARIANTS].sort())
    for (const [profile, settings] of Object.entries(eas.build)) {
      expect(settings.env?.APP_VARIANT).toBe(profile)
    }
  })

  it('holds ⛔ no placeholder identity values (Trap 3 — Row 29 (a) fills them)', () => {
    for (const settings of Object.values(eas.build)) {
      for (const name of Object.keys(settings.env ?? {})) {
        expect(name.startsWith('APP_IDENTITY_')).toBe(false)
      }
    }
  })
})
