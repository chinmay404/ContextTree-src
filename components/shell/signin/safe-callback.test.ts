import { safeCallback } from './safe-callback';

describe('safeCallback', () => {
  it('keeps same-site paths', () => {
    expect(safeCallback('/b/x')).toBe('/b/x');
    expect(safeCallback('/boards?x=1')).toBe('/boards?x=1');
  });
  it('rejects anything that could leave the site', () => {
    expect(safeCallback('//evil.com')).toBe('/boards');
    expect(safeCallback('https://evil.com')).toBe('/boards');
    expect(safeCallback('/\\evil')).toBe('/boards');
    expect(safeCallback('javascript:alert(1)')).toBe('/boards');
  });
  it('falls back to /boards', () => {
    expect(safeCallback(null)).toBe('/boards');
    expect(safeCallback('')).toBe('/boards');
  });
});
