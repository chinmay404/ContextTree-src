import { describe, expect, it } from 'vitest';
import { keyboardInset } from './touch-gestures';

describe('keyboardInset', () => {
  it('measures what the keyboard covers', () => {
    expect(keyboardInset(1180, { height: 780, offsetTop: 0 })).toBe(400);
  });

  it('counts a viewport pushed up by the system', () => {
    expect(keyboardInset(1180, { height: 780, offsetTop: 100 })).toBe(300);
  });

  it('ignores a browser bar moving, which is not a keyboard', () => {
    expect(keyboardInset(1180, { height: 1130, offsetTop: 0 })).toBe(0);
  });

  it('is zero with nothing to measure', () => {
    expect(keyboardInset(1180, null)).toBe(0);
  });
});
