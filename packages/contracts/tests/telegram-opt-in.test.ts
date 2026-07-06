// Member Telegram opt-in contract tests — Story 5.5 (Task 1/11).
//
// (1) lockstep: the domain `telegram_opt_in_state` pgEnum and the contracts `TelegramOptInStateSchema`
//     z.enum must declare the SAME values. `@twt/domain` cannot import `@twt/contracts` (turbo cycle), so the
//     literals are duplicated; THIS test (contracts → domain is legal) is the anti-drift guard (the
//     consent_type precedent).
// (2) DTO behaviour (strict, valid parse, reject unknown key, reject out-of-enum state).

import { schema } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import { assertStrict } from '../src/_common/strict.js';
import {
  RevokeTelegramOptInResponse,
  TelegramOptInRequestResponse,
  TelegramOptInStateSchema,
  TelegramOptInStatusResponse,
} from '../src/telegram-opt-in/index.js';

describe('Telegram opt-in lockstep (contracts ↔ domain)', () => {
  it('domain telegram_opt_in_state enumValues === contracts TelegramOptInStateSchema.options', () => {
    expect([...schema.telegramOptInStateEnum.enumValues].sort()).toEqual(
      [...TelegramOptInStateSchema.options].sort(),
    );
  });

  it('telegram_opt_in_state declares exactly the five lifecycle states (no 24h window)', () => {
    expect([...TelegramOptInStateSchema.options].sort()).toEqual([
      'ACTIVE',
      'BLOCKED',
      'EXPIRED',
      'PENDING',
      'REVOKED',
    ]);
  });
});

describe('Telegram opt-in DTOs (strict + shapes)', () => {
  it('all opt-in DTOs are .strict()', () => {
    assertStrict(TelegramOptInRequestResponse);
    assertStrict(TelegramOptInStatusResponse);
    assertStrict(RevokeTelegramOptInResponse);
  });

  it('TelegramOptInRequestResponse parses a valid PENDING mint', () => {
    const parsed = TelegramOptInRequestResponse.parse({
      state: 'PENDING',
      deepLink: 'https://t.me/twt_pariwar_bot?start=TWT-7K2F9QXR',
    });
    expect(parsed.state).toBe('PENDING');
  });

  it('TelegramOptInStatusResponse parses a null (never-opted-in) state', () => {
    const parsed = TelegramOptInStatusResponse.parse({
      available: true,
      state: null,
      deepLink: null,
    });
    expect(parsed.state).toBeNull();
  });

  it('rejects an out-of-enum opt-in state', () => {
    expect(
      TelegramOptInStatusResponse.safeParse({
        available: true,
        state: 'EXPIRED_24H_WINDOW',
        deepLink: null,
      }).success,
    ).toBe(false);
  });
});
