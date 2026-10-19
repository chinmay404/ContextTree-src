// @vitest-environment node
import { icon, iconSvg } from './icons';

describe('icon without a DOM', () => {
  it('renders on the server, same shape as lucide', () => {
    expect(typeof document).toBe('undefined');
    expect(iconSvg('play')).toBe('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"></polygon></svg>');
    expect(icon('x', '#fff', 12)).toContain('--s:12px');
  });
});
