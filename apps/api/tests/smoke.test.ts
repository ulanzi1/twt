import { describe, expect, it } from 'vitest';
import * as mod from '../src/index';

describe('@twt/api', () => {
  it('imports the workspace entry', () => {
    expect(mod).toBeTruthy();
  });
});
