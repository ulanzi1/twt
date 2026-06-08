import { describe, expect, it } from 'vitest';
import * as mod from '../src/index';

describe('@twt/public', () => {
  it('imports the workspace entry', () => {
    expect(mod).toBeTruthy();
  });
});
