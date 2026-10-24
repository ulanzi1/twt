// Story 11b.4 (MA3 / AC3) — the memorial draft lives ONLY on this phone: saved on every change, cleared only on a landed
// Send or *start again*, KEPT on sign-out, the photo stored as a FILE NAME rebuilt through `Paths.document`, and the
// Send's Idempotency-Key kept until any 2xx and dropped ONLY by an edit of the content (R6) — ⛔ no clock judges it (Y).

import { beforeEach, describe, expect, it, vi } from 'vitest'

const mock = vi.hoisted(() => ({
  store: new Map<string, string>(),
  failWrites: false,
  files: new Set<string>(),
  documentDir: 'file:///data/app-v1/Documents',
}))

vi.mock('../../lib/mmkv', () => ({
  mmkvStorage: {
    getItem: (k: string) => mock.store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (mock.failWrites) throw new Error('storage full')
      mock.store.set(k, v)
    },
    removeItem: (k: string) => {
      mock.store.delete(k)
    },
  },
}))

vi.mock('expo-file-system', () => {
  class File {
    public readonly uri: string
    public constructor(dirOrUri: string | { uri: string }, name?: string) {
      const base = typeof dirOrUri === 'string' ? dirOrUri : dirOrUri.uri
      this.uri = name === undefined ? base : `${base}/${name}`
    }
    public get exists(): boolean {
      return mock.files.has(this.uri)
    }
    public copy(dest: File): void {
      if (!mock.files.has(this.uri)) throw new Error('source missing')
      mock.files.add(dest.uri)
    }
    public delete(): void {
      mock.files.delete(this.uri)
    }
  }
  return {
    File,
    Paths: {
      get document() {
        return { uri: mock.documentDir }
      },
    },
  }
})

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  clearMemorialDraft,
  copyMemorialPhoto,
  dropMemorialSendKey,
  loadMemorialDraft,
  memorialDraftHasContent,
  memorialDraftKey,
  memorialPhotoUri,
  memorialSendKey,
  memorialSendLanded,
  saveMemorialDraft,
} from '../../lib/memorial-draft'

beforeEach(() => {
  mock.store.clear()
  mock.files.clear()
  mock.documentDir = 'file:///data/app-v1/Documents'
  mock.failWrites = false
})

describe('the memorial draft (MA3)', () => {
  it('the key carries the member and the drive', () => {
    expect(memorialDraftKey('m-1', 'pool-9')).toBe('memorial-draft:v1:m-1:pool-9')
  })

  it('saves on EVERY change, merging', () => {
    saveMemorialDraft('m', 'd', { body: 'मा' })
    saveMemorialDraft('m', 'd', { body: 'माँ' })
    saveMemorialDraft('m', 'd', { altText: 'फ़ोटो' })
    expect(loadMemorialDraft('m', 'd')).toEqual({ body: 'माँ', altText: 'फ़ोटो' })
    expect(memorialDraftHasContent(loadMemorialDraft('m', 'd'))).toBe(true)
    expect(memorialDraftHasContent({})).toBe(false)
  })

  it('is KEPT on sign-out — ⛔ memorial key in MEMBER_DRAFT_SCREEN_KEYS (the sign-out purge list — a source pin)', () => {
    const here = path.dirname(fileURLToPath(import.meta.url))
    const src = readFileSync(path.join(here, '../../components/life-events/draft-store.ts'), 'utf8')
    const list = /const MEMBER_DRAFT_SCREEN_KEYS = \[([^\]]*)\]/.exec(src)?.[1]
    expect(list).toBeDefined()
    expect(list).not.toMatch(/memorial/)
  })

  it('start again (clear) removes the draft AND its photo copy', () => {
    mock.files.add('file:///picker/tmp/1.jpg')
    const name = copyMemorialPhoto('file:///picker/tmp/1.jpg', 'image/jpeg')!
    saveMemorialDraft('m', 'd', { body: 'x', photoFileName: name })
    clearMemorialDraft('m', 'd')
    expect(loadMemorialDraft('m', 'd')).toEqual({})
    expect(mock.files.has(`${mock.documentDir}/${name}`)).toBe(false)
  })

  it('stores a relative FILE NAME and rebuilds the path from Paths.document (the iOS container path may change)', () => {
    mock.files.add('file:///picker/tmp/2.png')
    const name = copyMemorialPhoto('file:///picker/tmp/2.png', 'image/png')!
    expect(name).not.toContain('/')
    expect(name.endsWith('.png')).toBe(true)
    expect(memorialPhotoUri(name)).toBe(`${mock.documentDir}/${name}`)
    // An app update moves the container: the copy moves with it; the saved NAME still resolves.
    mock.files.delete(`${mock.documentDir}/${name}`)
    mock.documentDir = 'file:///data/app-v2/Documents'
    mock.files.add(`${mock.documentDir}/${name}`)
    expect(memorialPhotoUri(name)).toBe(`${mock.documentDir}/${name}`)
  })

  it('a missing photo file degrades to "no photo" (null), ⛔ an error', () => {
    expect(memorialPhotoUri('memorial-photo-gone.jpg')).toBeNull()
    expect(memorialPhotoUri(undefined)).toBeNull()
  })

  it('the Idempotency-Key is minted ONCE per Send attempt and KEPT until cleared', () => {
    const first = memorialSendKey('m', 'd')
    const again = memorialSendKey('m', 'd')
    expect(again).toEqual(first)
    expect(first.stored).toBe(true)
    dropMemorialSendKey('m', 'd', first.idempotencyKey)
    const fresh = memorialSendKey('m', 'd')
    expect(fresh.idempotencyKey).not.toBe(first.idempotencyKey)
  })

  // R6 — the server replays the FIRST result for a key whatever the payload, so a key kept across an EDIT would discard the
  // edited words. Any change to the words / alt text / photo / keep-previous choice drops the key; no change keeps it (so the
  // AC3 retry — same words, same key — still replays instead of creating a second version).
  describe('R6 — the kept Idempotency-Key and EDITS', () => {
    it('an edit of the words after a kept key ⇒ the next Send mints a NEW key (and the edit is kept)', () => {
      saveMemorialDraft('m', 'd', { body: 'पहले शब्द' })
      const first = memorialSendKey('m', 'd')
      saveMemorialDraft('m', 'd', { body: 'पहले शब्द, और कुछ' })
      expect(loadMemorialDraft('m', 'd').pending).toBeUndefined()
      expect(loadMemorialDraft('m', 'd').body).toBe('पहले शब्द, और कुछ')
      const second = memorialSendKey('m', 'd')
      expect(second.idempotencyKey).not.toBe(first.idempotencyKey)
      // … and THAT key is kept in turn (a retry of the edited Send replays it).
      expect(memorialSendKey('m', 'd')).toEqual(second)
    })

    it('NO content change ⇒ the key is reused (the AC3 retry still works)', () => {
      saveMemorialDraft('m', 'd', { body: 'शब्द', altText: 'फ़ोटो' })
      const first = memorialSendKey('m', 'd')
      // The same words saved again (a re-render, "Start from what I sent" onto identical text, the preview re-reading).
      saveMemorialDraft('m', 'd', { body: 'शब्द' })
      saveMemorialDraft('m', 'd', { body: 'शब्द', altText: 'फ़ोटो' })
      // Absent and false/empty are the SAME content (the photo screen's "continue without a photo" patch).
      saveMemorialDraft('m', 'd', { keepPreviousPhoto: false, photoFileName: undefined, photoMime: undefined })
      expect(memorialSendKey('m', 'd')).toEqual(first)
      expect(loadMemorialDraft('m', 'd').pending).toEqual({ idempotencyKey: first.idempotencyKey })
    })

    it.each<[string, Parameters<typeof saveMemorialDraft>[2]]>([
      ['the alt text', { altText: 'दूसरा विवरण' }],
      ['the picked photo', { photoFileName: 'memorial-photo-new.jpg', photoMime: 'image/jpeg' }],
      ['the keep-previous-photo choice', { keepPreviousPhoto: true }],
    ])('an edit of %s drops the key too', (_what, patch) => {
      saveMemorialDraft('m', 'd', { body: 'शब्द', altText: 'फ़ोटो' })
      const first = memorialSendKey('m', 'd')
      saveMemorialDraft('m', 'd', patch)
      expect(loadMemorialDraft('m', 'd').pending).toBeUndefined()
      expect(memorialSendKey('m', 'd').idempotencyKey).not.toBe(first.idempotencyKey)
    })

    it('removing the photo drops the key; so does clearing the words', () => {
      saveMemorialDraft('m', 'd', { body: 'शब्द', photoFileName: 'p.jpg', photoMime: 'image/png' })
      memorialSendKey('m', 'd')
      saveMemorialDraft('m', 'd', { photoFileName: undefined, photoMime: undefined })
      expect(loadMemorialDraft('m', 'd').pending).toBeUndefined()
      memorialSendKey('m', 'd')
      saveMemorialDraft('m', 'd', { body: '' })
      expect(loadMemorialDraft('m', 'd').pending).toBeUndefined()
    })

    it('a patch that carries the SAME `pending` back with unchanged content keeps it (a spread of the whole draft)', () => {
      saveMemorialDraft('m', 'd', { body: 'शब्द' })
      const first = memorialSendKey('m', 'd')
      saveMemorialDraft('m', 'd', { ...loadMemorialDraft('m', 'd'), keepPreviousPhoto: false })
      expect(loadMemorialDraft('m', 'd').pending).toEqual({ idempotencyKey: first.idempotencyKey })
    })

    it('minting a key never drops the content it was minted for', () => {
      saveMemorialDraft('m', 'd', { body: 'शब्द', altText: 'फ़ोटो', photoFileName: 'p.jpg', photoMime: 'image/jpeg', keepPreviousPhoto: false })
      const k = memorialSendKey('m', 'd')
      expect(loadMemorialDraft('m', 'd')).toEqual({ body: 'शब्द', altText: 'फ़ोटो', photoFileName: 'p.jpg', photoMime: 'image/jpeg', keepPreviousPhoto: false, pending: { idempotencyKey: k.idempotencyKey } })
    })
  })

  // Z2 — "landed" compares KEYS: the latest version's own stored key against the key kept here (⛔ submission ids, which a
  // stale cached view could misread — an earlier version read as this Send would clear unsent words).
  it('on resume (the intro): the latest version carries the KEPT key ⇒ the Send landed; any other key, or none, ⇒ not', () => {
    const pending = { idempotencyKey: 'k-kept' }
    expect(memorialSendLanded(pending, 'k-kept')).toBe(true)
    expect(memorialSendLanded(pending, 'k-another-send')).toBe(false) // an earlier version (or another phone's)
    expect(memorialSendLanded(pending, null)).toBe(false) // nothing sent, or a version from before 0183
    // An older build's record (the submission id beside the key) is read tolerantly: only the key counts.
    const old = { idempotencyKey: 'k-kept', latestSubmissionIdAtSend: 's-1' } as unknown as Parameters<typeof memorialSendLanded>[0]
    expect(memorialSendLanded(old, 'k-kept')).toBe(true)
    expect(memorialSendLanded(old, 'k-other')).toBe(false)
    // A record with no usable key never "lands" (⛔ `'' === ''`, ⛔ `undefined === undefined`).
    expect(memorialSendLanded({ idempotencyKey: '' }, '')).toBe(false)
    expect(memorialSendLanded({} as unknown as Parameters<typeof memorialSendLanded>[0], null)).toBe(false)
  })

  // Y — the server keeps the key on the submission row and replays it at ANY age: the phone keeps no time on it.
  describe('Y — ⛔ no clock on the kept key', () => {
    it('a minted key is just the key — no mint or post time, and (Z2) no submission id beside it', () => {
      const k = memorialSendKey('m', 'd')
      expect(Object.keys(k).sort()).toEqual(['idempotencyKey', 'stored'])
      expect(loadMemorialDraft('m', 'd').pending).toEqual({ idempotencyKey: k.idempotencyKey })
    })

    it('a kept key is reused however long ago it was minted (a Preview left open for days still replays)', () => {
      const k = memorialSendKey('m', 'd')
      const later = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 30 * 24 * 60 * 60 * 1000)
      try {
        expect(memorialSendKey('m', 'd')).toEqual(k)
      } finally {
        later.mockRestore()
      }
    })

    it('a draft saved by an OLDER build (mint / post times on its key) is read tolerantly: the SAME key, the extra fields ignored', () => {
      const old = { idempotencyKey: 'k-old', latestSubmissionIdAtSend: 's-1', mintedAt: 1, firstPostedAt: 2, lastPostedAt: 3 }
      mock.store.set(memorialDraftKey('m', 'd'), JSON.stringify({ body: 'शब्द', pending: old }))
      expect(memorialSendKey('m', 'd')).toEqual({ idempotencyKey: 'k-old', stored: true })
      expect(loadMemorialDraft('m', 'd').body).toBe('शब्द')
      // … and an edit still drops it (R6), extra fields and all.
      saveMemorialDraft('m', 'd', { body: 'नए शब्द' })
      expect(loadMemorialDraft('m', 'd').pending).toBeUndefined()
    })

    it('a stored key with no usable key string is replaced by a fresh one (never sent under an empty header)', () => {
      mock.store.set(memorialDraftKey('m', 'd'), JSON.stringify({ body: 'शब्द', pending: { latestSubmissionIdAtSend: 's-1' } }))
      const k = memorialSendKey('m', 'd')
      expect(typeof k.idempotencyKey).toBe('string')
      expect(k.idempotencyKey).not.toBe('')
      expect(loadMemorialDraft('m', 'd').pending).toEqual({ idempotencyKey: k.idempotencyKey })
    })
  })

  it('W6 (c) — dropMemorialSendKey drops ONLY the key it is given: a draft that now holds another key keeps it', () => {
    saveMemorialDraft('m', 'd', { body: 'शब्द' })
    const k = memorialSendKey('m', 'd')
    dropMemorialSendKey('m', 'd', 'k-someone-else')
    expect(loadMemorialDraft('m', 'd').pending).toEqual({ idempotencyKey: k.idempotencyKey })
    dropMemorialSendKey('m', 'd', k.idempotencyKey)
    expect(loadMemorialDraft('m', 'd')).toEqual({ body: 'शब्द' })
  })

  // Z3 — a key whose SAVE failed (full storage) must not be forgotten: the caller is told (`stored: false`) and holds it, and
  // hands it back so it is used (and saved again) before another is minted.
  describe('Z3 — a key minted while the storage refuses writes', () => {
    it('is reported as NOT stored, and the draft holds no key', () => {
      saveMemorialDraft('m', 'd', { body: 'शब्द' })
      mock.failWrites = true
      const k = memorialSendKey('m', 'd')
      expect(k.stored).toBe(false)
      expect(k.idempotencyKey).toMatch(/\S/)
      expect(loadMemorialDraft('m', 'd').pending).toBeUndefined()
    })

    it('the held key handed back is REUSED (⛔ a new mint) — still unsaved, and saved once the storage takes writes again', () => {
      saveMemorialDraft('m', 'd', { body: 'शब्द' })
      mock.failWrites = true
      const first = memorialSendKey('m', 'd')
      expect(memorialSendKey('m', 'd', first.idempotencyKey)).toEqual({ idempotencyKey: first.idempotencyKey, stored: false })
      // without it, a second mint would be ANOTHER key — the duplicate Z3 closes
      expect(memorialSendKey('m', 'd').idempotencyKey).not.toBe(first.idempotencyKey)
      mock.failWrites = false
      expect(memorialSendKey('m', 'd', first.idempotencyKey)).toEqual({ idempotencyKey: first.idempotencyKey, stored: true })
      expect(loadMemorialDraft('m', 'd').pending).toEqual({ idempotencyKey: first.idempotencyKey })
    })

    it('a key already KEPT in the draft wins over a held one (the draft is the record)', () => {
      saveMemorialDraft('m', 'd', { body: 'शब्द' })
      const kept = memorialSendKey('m', 'd')
      expect(memorialSendKey('m', 'd', 'k-held')).toEqual(kept)
    })
  })

  // V9 (a) — the screens need to know when the storage refused the write.
  it('V9 (a) — a save reports whether it reached the storage (and still returns the merged draft)', () => {
    expect(saveMemorialDraft('m', 'd', { body: 'शब्द' })).toEqual({ draft: { body: 'शब्द' }, saved: true })
    mock.failWrites = true
    expect(saveMemorialDraft('m', 'd', { body: 'नए शब्द' })).toEqual({ draft: { body: 'नए शब्द' }, saved: false })
    mock.failWrites = false
    expect(loadMemorialDraft('m', 'd')).toEqual({ body: 'शब्द' })
  })
})
