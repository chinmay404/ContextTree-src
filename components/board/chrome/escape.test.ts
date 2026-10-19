import { pushEscape, runEscape } from './escape';

describe('escape stack', () => {
  it('runs the newest handler only, then the one below once it is gone', () => {
    const calls: string[] = [];
    const offA = pushEscape(() => calls.push('a'));
    const offB = pushEscape(() => calls.push('b'));
    expect(runEscape()).toBe(true); expect(calls).toEqual(['b']);
    offB(); expect(runEscape()).toBe(true); expect(calls).toEqual(['b', 'a']);
    offA(); expect(runEscape()).toBe(false);
  });
  it('removing a handler twice is harmless', () => {
    const off = pushEscape(() => {}); off(); off(); expect(runEscape()).toBe(false);
  });
});
