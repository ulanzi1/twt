// The Trust's channel post — the ONE builder of its words (Story 5.14, Task 2; `2026-10-29-417` FS6 (a), FS8 (a), FS15 (a); `-416`;
// AC4, AC7). A PURE function: the job (which posts the text) and the API (which rebuilds it for the admin's copy into the WhatsApp
// Channel) both call it, so the two can never say different things.
//
// ⭐ One BILINGUAL post (FS8 (a)): Hindi, a blank line, English — plain text (⛔ `parse_mode`, ⛔ links — T10). The words are BigDev's
// (approved, the Hindi reviewed — `-417` FS8), in the `contribution` namespace, `channel_post.*`.
// ⭐ I4 — the input has NO member field: a pool opening carries its pool label and the deceased member's name (the family the pool
// supports — `-416`), a last day carries its date. ⛔ Anything about one member is ever posted.
// ⭐ F17 — `t` is a PARAMETER with a LOCAL structural type: `@twt/contracts` does not depend on `@twt/i18n` (it is a devDependency for
// the tests only); the type matches `BoundTranslate` (`packages/i18n/src/resolver.ts`) without importing it.

/** The translate shape the builder needs — structurally `BoundTranslate` (`@twt/i18n`), ⛔ imported (F17). */
export type AnnouncementTranslate = (
  key: string,
  params?: Record<string, string | number>,
  options?: { locale?: 'hi' | 'en'; namespace?: string },
) => string;

/** Which variant of the pool-open words posts (FS6 (a)). */
export type AnnouncementPostNameMode = 'full_name' | 'none';

/**
 * ⭐ FS6 (a), RULED by `2026-10-29-416` (Trustee-ratified, DR + KB): *"option A, full name"* — the pool-open post names the deceased
 * member in the FULL name. `'none'` stays built (a later ruling is a one-line flip + its pin test). In `'full_name'` the job decrypts
 * the stored name and passes the mode `'full_name'` to `resolvePoolIdentity` — ⛔ a presentation-mode read; in `'none'` NOTHING is read
 * or decrypted (I5). ⚠ A test pins this value to `-416`.
 */
export const ANNOUNCEMENT_POST_NAME_MODE: AnnouncementPostNameMode = 'full_name';

/** The i18n namespace and keys of the post (`contribution.json`). */
export const ANNOUNCEMENT_POST_I18N_NAMESPACE = 'contribution';
export const ANNOUNCEMENT_POST_KEYS = {
  poolOpenNamed: 'channel_post.pool_open.named',
  poolOpenUnnamed: 'channel_post.pool_open.unnamed',
  lastDay: 'channel_post.last_day',
} as const;

/**
 * What a post is built from — ⛔ a member field (I4; a `@ts-expect-error` test proves one is refused). `deceasedName` is the whole
 * stored name in `'full_name'` mode (never truncated — I5) and is IGNORED in `'none'` mode.
 */
export type AnnouncementPostInput =
  | { readonly occasion: 'pool_open'; readonly poolLabel: string; readonly deceasedName: string | null }
  | { readonly occasion: 'last_day'; readonly lastDate: string };

/**
 * Build the post's text: Hindi, a blank line, English. In `'full_name'` mode a pool opening REQUIRES the name — a missing one is the
 * caller's `refused:identity_unavailable` (I5), so the builder throws rather than post an unnamed variant.
 */
export function buildAnnouncementPost(
  t: AnnouncementTranslate,
  input: AnnouncementPostInput,
  mode: AnnouncementPostNameMode = ANNOUNCEMENT_POST_NAME_MODE,
): string {
  const render = (locale: 'hi' | 'en'): string => {
    const options = { locale, namespace: ANNOUNCEMENT_POST_I18N_NAMESPACE };
    if (input.occasion === 'last_day') return t(ANNOUNCEMENT_POST_KEYS.lastDay, { date: input.lastDate }, options);
    if (mode === 'none') return t(ANNOUNCEMENT_POST_KEYS.poolOpenUnnamed, { pool: input.poolLabel }, options);
    if (input.deceasedName === null || input.deceasedName.trim() === '') {
      throw new Error('buildAnnouncementPost: full_name mode needs the deceased member\'s name (the caller refuses identity_unavailable)');
    }
    return t(ANNOUNCEMENT_POST_KEYS.poolOpenNamed, { pool: input.poolLabel, deceasedName: input.deceasedName }, options);
  };
  return `${render('hi')}\n\n${render('en')}`;
}
