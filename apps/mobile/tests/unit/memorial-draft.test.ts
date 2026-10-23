// Story 11b.4 (MA3 / AC3) — the memorial draft lives ONLY on this phone: saved on every change, cleared only on a landed
// Send or *start again*, KEPT on sign-out, the photo stored as a FILE NAME rebuilt through `Paths.document`, and the
// Send's Idempotency-Key kept until any 2xx (with the refetch that tells a landed Send from an in-flight one).

import { beforeEach, describe, expect, it, vi } from 'vitest'

const mock = vi.hoisted(() => ({
  store: new Map<string, string>(),
  files: new Set<string>(),
  documentDir: 'file:///data/app-v1/Documents',
}))

vi.mock('../../lib/mmkv', () => ({
  mmkvStorage: {
    getItem: (k: string) => mock.store.get(k) ?? null,
    setItem: (k: string, v: string) => {
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
    const first = memorialSendKey('m', 'd', 'sub-1')
    const again = memorialSendKey('m', 'd', 'sub-2')
    expect(again).toEqual(first)
    expect(first.latestSubmissionIdAtSend).toBe('sub-1')
    dropMemorialSendKey('m', 'd')
    const fresh = memorialSendKey('m', 'd', 'sub-2')
    expect(fresh.idempotencyKey).not.toBe(first.idempotencyKey)
  })

  it('on resume / idempotency_in_progress: a NEWER latest submission ⇒ the Send landed; else a fresh key', () => {
    const pending = { idempotencyKey: 'k', latestSubmissionIdAtSend: 'sub-1' }
    expect(memorialSendLanded(pending, 'sub-2')).toBe(true)
    expect(memorialSendLanded(pending, 'sub-1')).toBe(false)
    expect(memorialSendLanded({ idempotencyKey: 'k', latestSubmissionIdAtSend: null }, null)).toBe(false)
    expect(memorialSendLanded({ idempotencyKey: 'k', latestSubmissionIdAtSend: null }, 'sub-1')).toBe(true)
  })
})
