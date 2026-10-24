// Story 6.36e (AC5, NE6) — the `nominee_link` namespace through the REAL `t()` (⛔ a hand-built labels fixture —
// [[feedback_stub_must_call_not_transcribe]]):
//   · registered (both locales — `catalog.ts`) and classified member-facing (`classification.json` — Hindi parity enforced);
//   · every key resolves in en AND hi with its parameters supplied, leaving ⛔ stray brace; a parameterised key THROWS
//     without its parameter;
//   · the English quoted in the story (NE6 / AC5) is FINAL — pinned verbatim;
//   · the Trust's name is a PARAMETER (⛔ written — the legal name is pending).

import { describe, expect, it } from 'vitest';

import { KNOWN_NAMESPACES, classifyNamespace, getCatalog, t } from '../src/index.js';

const NS = 'nominee_link';
const PARAMS: Record<string, Record<string, string | number>> = {
  'form.marked': { name: 'Meena K.' },
  'label.confirmed': { name: 'Meena K.' },
  'edit.question': { name: 'Meena K.' },
  'note.body': { trust_name: 'Example Trust' },
  'find.matches_count': { count: 2 },
  'find.pick_a11y': { name: 'Meena K.' },
  'request.question': { name: 'Asha D.' },
  'request.will_see': { name: 'Asha D.' },
  'request.consequence': { name: 'Asha D.' },
};

describe('nominee_link copy (real t())', () => {
  it('is registered and member-facing', () => {
    expect(KNOWN_NAMESPACES).toContain(NS);
    expect(getCatalog('en', NS)).toBeDefined();
    expect(getCatalog('hi', NS)).toBeDefined();
    expect(classifyNamespace(NS)).toBe('member-facing');
  });

  it('every key resolves in en AND hi with its parameters — ⛔ a stray brace, ⛔ an empty string', () => {
    const keys = Object.keys(getCatalog('en', NS)!).filter((k) => !k.startsWith('$comment'));
    expect(keys.length).toBeGreaterThan(50);
    expect(Object.keys(getCatalog('hi', NS)!).filter((k) => !k.startsWith('$comment')).sort()).toEqual([...keys].sort());
    for (const locale of ['en', 'hi'] as const) {
      for (const key of keys) {
        const out = t(key, PARAMS[key], { locale, namespace: NS });
        expect(out.trim(), `${locale}:${key}`).not.toBe('');
        expect(out, `${locale}:${key}`).not.toMatch(/[{}]/);
      }
    }
  });

  it('every parameterised key THROWS without its parameter', () => {
    for (const key of Object.keys(PARAMS)) expect(() => t(key, undefined, { locale: 'en', namespace: NS })).toThrow();
  });

  it('the story\'s English, verbatim (NE6 / AC5 — FINAL)', () => {
    const en = (key: string) => t(key, PARAMS[key], { locale: 'en', namespace: NS });
    expect(en('form.find')).toBe('Is this nominee a TWT member? Find them in your contacts');
    expect(en('form.why')).toBe('If they sign in with a different number from the one above, this still keeps them out of the people asked about your death.');
    expect(en('request.question')).toBe('Asha D. has named you as their nominee in TWT and marked you as a member. Is that you?');
    expect(en('request.will_see')).toBe('Asha D. will see your answer.');
    expect(en('request.consequence')).toBe("While this stands, you will not be asked about Asha D.'s death.");
    expect(en('request.yes')).toBe("Yes, that's me");
    expect(en('request.no')).toBe("No, that's not me");
    expect(en('label.asked')).toBe('Asked');
    expect(en('label.confirmed')).toBe('Confirmed — Meena K.');
    expect(en('label.not_me')).toBe('Said it is not them');
    expect(en('label.not_me_note')).toBe('The mark still counts until you remove it or pick again.');
    expect(en('edit.question')).toBe('Is this still Meena K.?');
    expect(en('edit.keep')).toBe('Keep the mark');
    expect(en('edit.remove')).toBe('Remove it');
    expect(en('form.remove')).toBe('Remove mark');
    expect(en('find.no_matches')).toBe('None of your contacts is a member — the number you gave above is still checked.');
  });

  it('WCAG 2.5.3 — the pick button\'s accessible name BEGINS with its visible text (the saved name)', () => {
    for (const locale of ['en', 'hi'] as const) expect(t('find.pick_a11y', { name: 'Meena K.' }, { locale, namespace: NS }).startsWith('Meena K.')).toBe(true);
  });

  it('⛔ the Trust\'s name is written in the copy — it is a parameter; the find notice names ITS purpose (⛔ 6.36b\'s colleagues)', () => {
    for (const locale of ['en', 'hi'] as const) {
      const json = JSON.stringify(getCatalog(locale, NS));
      expect(json).toContain('{trust_name}');
      expect(json).not.toMatch(/Welfare Trust|Shikshak Parivar|शिक्षक परिवार/);
    }
    expect(t('note.body', PARAMS['note.body'], { locale: 'en', namespace: NS })).toContain('to check whether your nominee is a TWT member'.replace(/^to/, 'To'));
    expect(t('note.body', PARAMS['note.body'], { locale: 'en', namespace: NS })).not.toMatch(/colleague/i);
  });
});
