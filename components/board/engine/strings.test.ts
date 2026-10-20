import { describe, expect, it } from 'vitest';
import { stringD, stringTarget } from './strings';

describe('strings', () => {
  it('the midpoint sags by 8 + 6% of the length', () => { expect(stringTarget([0, 0], [100, 0])).toEqual([50, 14]); });
  it('the path runs from a to b', () => {
    const d = stringD([0, 0], [100, 0], 1, -1, [50, 14]);
    expect(d.startsWith('M0.0,0.0')).toBe(true); expect(d.endsWith('100.0,0.0')).toBe(true);
  });
  it('the control reach is 14 + 28% of the horizontal run, capped at 70', () => {
    expect(stringD([0, 0], [100, 0], 1, -1, [50, 14])).toBe('M0.0,0.0 C42.0,0.0 ' + (50 - (58 - 42) * .22).toFixed(1) + ',14.0 50.0,14.0 S58.0,0.0 100.0,0.0');
  });
});
