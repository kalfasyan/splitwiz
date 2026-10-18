import { describe, expect, it } from 'vitest';
import { pushProblem } from './pushProblem';

describe('pushProblem', () => {
  it('points Brave users at the setting that actually blocks them', () => {
    expect(pushProblem('subscribe', true)).toContain('Use Google services for push messaging');
    expect(pushProblem('permission-denied', true)).toContain('Site settings > Notifications');
  });

  it('does not blame the phone settings for a dismissed prompt', () => {
    expect(pushProblem('permission-dismissed', false)).toContain('Tap Turn on again');
  });

  it('includes the browser error when registration fails elsewhere', () => {
    expect(pushProblem('subscribe', false, 'push service error')).toContain('(push service error)');
  });
});
