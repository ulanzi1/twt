import { defaultConfig } from '@tamagui/config/v5'
import { createFont, createTamagui } from 'tamagui'

// Devanagari font roles per UX spec lines 712-714 + 1108-1114.
//
// Tiro Devanagari Hindi → "$heading" role (display: memorial names, claim titles, ceremonial copy).
//   Single weight (400) — Google Fonts publishes only Regular + Italic for Tiro.
//   UX spec line 1108 specifies weight 500 for display; only 400 available → FM-2 caveat
//   (recorded in engagement-ledger §5 Day 2 entry). Substitute candidates per UX spec line 712:
//   Yatra One, Mukta Mahee.
//
// Noto Sans Devanagari → "$body" role (body, nav, buttons, forms).
//   Two weights loaded: 400 Regular + 500 Medium.
//
// IBM Plex Sans Devanagari → "$tabular" role (FM-2 substitute for IBM Plex Mono Devanagari
//   per UX spec line 714 explicit fallback — IBM Plex publishes no Mono Devanagari variant).
//   Tabular features (tnum) applied per-component via fontFeatureSettings on Text style.
//   Two weights loaded: 400 + 500.

const sharedSize = { 1: 11, 2: 12, 3: 13, 4: 14, 5: 16, 6: 18, 7: 20, 8: 24, 9: 28, 10: 36, 11: 48, 12: 64 }
const sharedLineHeight = { 1: 14, 2: 16, 3: 18, 4: 20, 5: 22, 6: 25, 7: 28, 8: 32, 9: 36, 10: 44, 11: 56, 12: 72 }
const sharedLetterSpacing = { 1: 0, 2: 0, 3: 0 }

const headingDevanagari = createFont({
  family: 'TiroDevanagariHindi_400Regular',
  size: { ...sharedSize, 13: 72, 14: 88, 15: 104, 16: 128 },
  lineHeight: { ...sharedLineHeight, 13: 80, 14: 96, 15: 112, 16: 136 },
  weight: { 1: '400', 2: '400', 3: '400', 4: '400', 5: '400', 6: '400', 7: '400', 8: '400' },
  letterSpacing: sharedLetterSpacing,
  face: {
    400: { normal: 'TiroDevanagariHindi_400Regular' },
  },
})

const bodyDevanagari = createFont({
  family: 'NotoSansDevanagari_400Regular',
  size: sharedSize,
  lineHeight: sharedLineHeight,
  weight: { 1: '400', 2: '400', 3: '400', 4: '400', 5: '400', 6: '500', 7: '500', 8: '500' },
  letterSpacing: sharedLetterSpacing,
  face: {
    400: { normal: 'NotoSansDevanagari_400Regular' },
    500: { normal: 'NotoSansDevanagari_500Medium' },
  },
})

const tabularDevanagari = createFont({
  family: 'IBMPlexSansDevanagari_400Regular',
  size: sharedSize,
  lineHeight: sharedLineHeight,
  weight: { 1: '400', 2: '400', 3: '400', 4: '400', 5: '500', 6: '500' },
  letterSpacing: sharedLetterSpacing,
  face: {
    400: { normal: 'IBMPlexSansDevanagari_400Regular' },
    500: { normal: 'IBMPlexSansDevanagari_500Medium' },
  },
})

const customConfig = {
  ...defaultConfig,
  fonts: {
    ...defaultConfig.fonts,
    heading: headingDevanagari,
    body: bodyDevanagari,
    tabular: tabularDevanagari,
  },
}

export const config = createTamagui(customConfig)

export default config

export type Conf = typeof config

declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}
}
