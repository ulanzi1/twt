// Story 3.15b — shared test helpers for announcements sent through `lib/announce.ts`. On Android a repeat of the same text
// is SENT with trailing U+00A0 no-break spaces (V4); a leg that counts repeats counts by the WORDS (`bare`) and checks the
// repeat's text differs from the first. A unit test shows only what is SENT, never what TalkBack speaks.

// Built, ⛔ typed ([[project_unicode_escapes_written_raw]]).
export const NBSP = String.fromCharCode(0xa0)

const TRAILING_NBSP = new RegExp(`${NBSP}+$`)

/** The words of a sent announcement: the text with its trailing no-break spaces removed. */
export const bare = (s: unknown): string => String(s).replace(TRAILING_NBSP, '')

/** Every sent text (in order) whose words are `text`, from a mock's `calls`. */
export const sentAs = (calls: ReadonlyArray<ReadonlyArray<unknown>>, text: string): string[] =>
  calls.map(([s]) => String(s)).filter((s) => bare(s) === text)
