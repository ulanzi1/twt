// Story 3.15b (DL2, DL3) — make a REPEATED announcement differ from the one before it, on Android only. PURE: it does
// not import `react-native` (the vitest setup file imports this module before each test file's `vi.mock` — DL6).
//
// Why (deferred-work V4): TalkBack does not speak an announcement whose text equals one it was already sent. RN 0.83's
// Android `announceForAccessibility` (`AccessibilityInfoModule.kt`) sends a bare `TYPE_ANNOUNCEMENT` whose ONLY content is
// the text, so two identical announcements cannot be told apart and the second is silent; a different text right after is
// spoken. The remedy (Story 3.15a review P1, shown on the emulator): each send of the same text after its first carries
// one more trailing U+00A0 NO-BREAK SPACE. BigDev heard the repeats with speech ON as the plain sentence (3.15b Task 1).
//
// The rule is PER TEXT for the whole session — ⛔ "only if equal to the last one": whether TalkBack compares with the
// last announcement only or with a longer history is not known, and per-text is safe either way. Cost: a text's first
// send on a later screen may carry spaces left from an earlier one (invisible, and silent), and the map grows by one
// entry per distinct text (a few hundred strings at most in a session).
//
// Android only (DL2): VoiceOver was never seen to drop a repeat, so iOS gets the text unchanged.
//
// A unit test shows only what is SENT, never what TalkBack speaks ([[project_talkback_drops_identical_announcement]]).

// Built, never typed: a typed U+00A0 lands on disk as a raw invisible character.
const NBSP = String.fromCharCode(0xa0)

const sent = new Map<string, number>()

/** The text to send for this announcement: on Android the n-th send (from 0) of the same text gets n trailing NBSPs. */
export function distinctAnnouncement(text: string, platform: string): string {
  if (platform !== 'android') return text
  const n = sent.get(text) ?? 0
  sent.set(text, n + 1)
  return text + NBSP.repeat(n)
}

/** Forget every count (the vitest setup file calls this before each test — DL6). */
export function resetAnnouncementRepeats(): void {
  sent.clear()
}
