import { describe, expect, it } from 'vitest';
import * as mod from '../src/index';
import { EVENT_TYPE_REGISTRY } from '../src/registry';

describe('@twt/events', () => {
  it('imports the workspace entry', () => {
    expect(mod).toBeTruthy();
  });

  it('registers the Story 9.7 self-verify screenshot-upload event with its schema', () => {
    const entry = EVENT_TYPE_REGISTRY['reconciliation.self-verify-screenshot-uploaded'];
    expect(entry).toBeDefined();
    expect(entry.type).toBe('reconciliation.self-verify-screenshot-uploaded');
    expect(entry.schema).toBeDefined();
  });

  it('registers the Story 9.8 trustee reject verdict event with its schema', () => {
    const entry = EVENT_TYPE_REGISTRY['reconciliation.contribution-rejected'];
    expect(entry).toBeDefined();
    expect(entry.type).toBe('reconciliation.contribution-rejected');
    expect(entry.schema).toBeDefined();
  });
});
