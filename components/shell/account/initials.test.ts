import { initials } from './initials';

describe('initials', () => {
  it('two words give two letters', () => {
    expect(initials('Sam Rivera', 'sam@example.com')).toBe('SR');
    expect(initials('  ada   king lovelace ', 'a@example.com')).toBe('AL');
  });
  it('one word gives one letter', () => {
    expect(initials('cher', 'c@example.com')).toBe('C');
  });
  it('falls back to the email', () => {
    expect(initials(null, 'zed@example.com')).toBe('Z');
    expect(initials('', 'zed@example.com')).toBe('Z');
    expect(initials(undefined, '')).toBe('?');
  });
  it('handles accents and skips symbols and emoji', () => {
    expect(initials('Élodie Ñandú', 'x@y.z')).toBe('ÉÑ');
    expect(initials('🙂 Sam', 'x@y.z')).toBe('S');
    expect(initials('🙂', 'q@y.z')).toBe('Q');
  });
});
