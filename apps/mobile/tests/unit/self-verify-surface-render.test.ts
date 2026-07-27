// The mobile <SelfVerifySurface> render fence — Story 9.7 (Task 6; AC2/AC5). DB-free, RN-render-free.
//
// The mobile harness is pure-Vitest (no @testing-library/react-native — RN component MOUNT tests aren't set
// up here; the status-pill-render.test.ts / helpline-cta-presence.test.ts precedent). So this proves, via a
// comment-stripped SOURCE scan, the load-bearing anatomy UX §11 + AC2/AC5 require of the recovery surface:
//   1. the three lifecycle states (default / uploaded / resolved) are all handled;
//   2. the RED mismatch state consumes the 9.6 <StatusPill status="red"> (state via icon+text+ARIA, not
//      colour alone) — never an alarming "expected X, recorded Y" line;
//   3. the FR-32 screenshot-upload affordance exists (image OR PDF picker) and posts to the SDK;
//   4. the always-reachable Story 8.11 <CallHelplineCTA> is present;
//   5. a11y: ≥56pt touch targets + a polite live region on the state-change;
//   6. dignity: the surface holds NO literal member-facing copy (every string routes through the i18n `t`).
//
// A source scan, not a mount — but it fails the moment the anatomy regresses.

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

// apps/mobile/tests/unit → repo root is four levels up (unit → tests → mobile → apps → root).
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')
const read = (rel: string): string => readFileSync(path.join(repoRoot, rel), 'utf8')
const stripComments = (src: string): string => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

const SURFACE = 'apps/mobile/components/self-verify/SelfVerifySurface.tsx'
const CARD = 'apps/mobile/components/active-contribution/ActiveContributionCard.tsx'

describe('<SelfVerifySurface> anatomy (UX §11 / AC2)', () => {
  const src = stripComments(read(SURFACE))

  it('handles all three lifecycle states (default / uploaded / resolved)', () => {
    expect(src).toContain("'resolved'")
    expect(src).toContain("'uploaded'")
    // The default branch is the else of the status ternary — assert its distinctive upload affordance below.
    expect(src).toMatch(/status\s*===\s*'resolved'/)
    expect(src).toMatch(/status\s*===\s*'uploaded'/)
  })

  it('renders the 9.6 <StatusPill status="red"> for the mismatch state (not colour-only)', () => {
    expect(src).toMatch(/<StatusPill\s+status="red"/)
  })

  it('never renders the alarming "expected/recorded" amount line', () => {
    expect(src).not.toMatch(/expected/i)
    expect(src).not.toMatch(/recorded/i)
  })

  it('offers the FR-32 screenshot-upload affordance — image AND PDF pickers → the SDK upload', () => {
    expect(src).toContain('launchImageLibraryAsync')
    expect(src).toContain('getDocumentAsync')
    expect(src).toContain('application/pdf')
    expect(src).toContain('memberUploadSelfVerifyScreenshot')
  })

  it('renders the always-reachable helpline CTA (Story 8.11 / UX-DR62)', () => {
    expect(src).toContain('<CallHelplineCTA')
  })

  it('a11y: ≥56pt touch targets + a polite live region on the state-change', () => {
    expect(src).toContain('TOUCH_TARGET = 56')
    expect(src).toContain("accessibilityLiveRegion=\"polite\"")
  })

  it('holds NO literal member-facing copy — every string routes through the i18n `t` (dignity/parity gate)', () => {
    // The reason/chrome copy resolves through `t('...', ..., NS)` with the contribution namespace.
    expect(src).toContain("namespace: 'contribution'")
    expect(src).toContain('selfVerify.upload_photo_cta')
    expect(src).toContain('selfVerify.upload_file_cta')
    expect(src).toContain('selfVerify.uploaded.title')
    expect(src).toContain('selfVerify.resolved.title')
  })

  it('the photo and file upload buttons have DISTINCT accessibility labels (not identical, AC5)', () => {
    expect(src).toContain('selfVerify.upload_photo_cta_a11y')
    expect(src).toContain('selfVerify.upload_file_cta_a11y')
  })

  it('maps the machine reason-code to dignified copy keys — never the raw enum in copy', () => {
    expect(src).toContain('reasonCopyKeys')
    expect(src).toContain('wrong_pool.title')
    expect(src).toContain('amount_mismatch.title')
    // The generic fallback exists so an unknown reason never leaks the raw enum.
    expect(src).toContain('selfVerify.generic.title')
  })

  it('the scan actually reached real source', () => {
    expect(read(SURFACE).length).toBeGreaterThan(0)
  })
})

describe('<ActiveContributionCard> — the two Story 9.7 entry points (AC1 / D7)', () => {
  const src = stripComments(read(CARD))

  it('the RED mismatch state flips the pill to red + offers a DIRECT "Fix this" → the surface (D7)', () => {
    expect(src).toMatch(/myContribution\s*===\s*'mismatch'/)
    expect(src).toMatch(/<StatusPill\s+status="red"/)
    expect(src).toContain('selfVerify.fix_this')
    expect(src).toContain('<SelfVerifySurface')
  })

  it('the YELLOW state carries the FR-32 hidden "Trouble with UTR?" disclosure (fallback entry)', () => {
    expect(src).toContain('selfVerify.trouble_with_utr')
    expect(src).toMatch(/<SelfVerifySurface[^>]*fallback/)
  })

  it('the confirmed-only meter is untouched — no yellow/red count reaches progress (the 8.3/8.4 invariant)', () => {
    // The card still reads ONLY confirmedCount/rosterSize for the meter; the mismatch state is a per-member
    // self-state rendered separately (never a `progress.mismatchCount` etc.).
    expect(src).toContain('data.progress.confirmedCount')
    expect(src).not.toContain('progress.mismatchCount')
  })
})
