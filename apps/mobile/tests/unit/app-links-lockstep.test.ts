// Story 6.30 AC3 — the four-way lockstep (`2026-10-10-312` AL2, Invariant 4): the ONE path list as the JSON
// file (loaded the way app.config.ts loads it — `require()` BY PACKAGE NAME from apps/mobile), the
// TypeScript view in @twt/contracts, the app config's resolved Android intent filters, and the AASA
// components — all list the SAME paths. It lives here because contracts cannot import the app config.

import { createRequire } from 'node:module'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { APP_LINK_PATHS, APP_LINK_PATH_LIST, buildAppleAppSiteAssociation } from '@twt/contracts'

import { resolveAppConfig } from '../../app.config'

const requireFromMobile = createRequire(join(__dirname, '..', '..', 'package.json'))

describe('the app-link paths — JSON ↔ TS view ↔ intent filters ↔ AASA', () => {
  const json = requireFromMobile('@twt/contracts/src/app-links/app-link-paths.json') as Record<string, string>
  const fromJson = Object.values(json).sort()

  it('the JSON resolves by package name from apps/mobile (plain Node resolution)', () => {
    expect(fromJson.length).toBeGreaterThan(0)
  })

  it('the TS view lists the same paths', () => {
    expect({ ...APP_LINK_PATHS }).toEqual(json)
    expect([...APP_LINK_PATH_LIST].sort()).toEqual(fromJson)
  })

  it("the production config's intent filters list the same paths, exactly", () => {
    const config = resolveAppConfig({
      APP_VARIANT: 'production',
      APP_IDENTITY_NAME: 'Fixture App',
      APP_IDENTITY_SCHEME: 'fixtureapp',
      APP_IDENTITY_IOS_BUNDLE_ID: 'org.example.fixture',
      APP_IDENTITY_ANDROID_PACKAGE: 'org.example.fixture',
      APP_LINKS_HOST: 'links.example.org',
    })
    const data = (config.android?.intentFilters ?? []).flatMap((filter) => (Array.isArray(filter.data) ? filter.data : [filter.data]))
    expect(data.map((entry) => entry?.path).sort()).toEqual(fromJson)
    expect(data.every((entry) => entry?.pathPrefix === undefined && entry?.pathPattern === undefined)).toBe(true)
  })

  it('the AASA components list the same paths', () => {
    const body = buildAppleAppSiteAssociation([{ iosAppId: 'ABCDE12345.org.example.fixture' }])
    expect(body.applinks.details[0]!.components.map((component) => component['/']).sort()).toEqual(fromJson)
  })
})
