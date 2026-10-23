// Story 6.35 (Task 2.1; AC2) — the member app-language contract: `.strict()` and the two-value locale, both ways.
import { describe, expect, it } from 'vitest';
import { OpenAPIRegistry, OpenApiGeneratorV31, extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { MemberLanguageLocale, MemberLanguageResponse, MemberLanguageSetRequest } from '../src/index.js';

extendZodWithOpenApi(z);

describe('Story 6.35 — MemberLanguage contracts', () => {
  it('the locale is exactly hi / en (value-aligned with the `locale` pg enum)', () => {
    expect(MemberLanguageLocale.options).toEqual(['hi', 'en']);
    expect(MemberLanguageLocale.safeParse('fr').success).toBe(false);
  });

  it('the PUT body takes ONE key, `locale` — an extra key or `fr` is refused', () => {
    expect(MemberLanguageSetRequest.parse({ locale: 'en' })).toEqual({ locale: 'en' });
    expect(MemberLanguageSetRequest.safeParse({ locale: 'fr' }).success).toBe(false);
    expect(MemberLanguageSetRequest.safeParse({ locale: 'en', memberId: 'x' }).success).toBe(false);
    expect(MemberLanguageSetRequest.safeParse({}).success).toBe(false);
  });

  it('the response: `chosenLocale` nullable, `pariwarDefaultLocale` required, ⛔ extra key', () => {
    expect(MemberLanguageResponse.parse({ chosenLocale: null, pariwarDefaultLocale: 'hi' })).toEqual({ chosenLocale: null, pariwarDefaultLocale: 'hi' });
    expect(MemberLanguageResponse.safeParse({ chosenLocale: 'en', pariwarDefaultLocale: 'hi', setAt: 'x' }).success).toBe(false);
    expect(MemberLanguageResponse.safeParse({ chosenLocale: 'en' }).success).toBe(false);
    expect(MemberLanguageResponse.safeParse({ chosenLocale: 'fr', pariwarDefaultLocale: 'hi' }).success).toBe(false);
  });

  it('OpenAPI admits null only for the chosen locale, matching the runtime response', () => {
    const registry = new OpenAPIRegistry();
    registry.register('MemberLanguageResponse', MemberLanguageResponse);
    const doc = new OpenApiGeneratorV31(registry.definitions).generateDocument({
      openapi: '3.1.0', info: { title: 'Member language', version: '1' },
    });
    expect(doc.components?.schemas?.MemberLanguageResponse).toMatchObject({
      properties: {
        chosenLocale: { anyOf: expect.arrayContaining([{ type: 'string', enum: ['hi', 'en'] }, { type: 'null' }]) },
        pariwarDefaultLocale: { type: 'string', enum: ['hi', 'en'] },
      },
    });
  });
});
