import { keyStatusLine } from './status-line';
import { emptyStatusMap } from './key-store';
import type { KeyState, KeyStatusMap, ProviderId } from './status-types';

function with_(entries: [ProviderId, KeyState | null][]): KeyStatusMap {
  const m = emptyStatusMap();
  for (const [p, status] of entries) m[p] = { ...m[p], configured: true, status };
  return m;
}

describe('keyStatusLine', () => {
  it('null means still checking', () => {
    expect(keyStatusLine(null)).toEqual({ text: 'Checking…', tone: 'stale' });
  });
  it('no keys', () => {
    expect(keyStatusLine(emptyStatusMap())).toEqual({ text: 'No keys yet', tone: 'stale' });
  });
  it('counts working keys (ok and unchecked) out of seven', () => {
    expect(keyStatusLine(with_([['google', 'ok'], ['groq', 'unchecked']]))).toEqual({ text: '2 of 7 working', tone: 'ready' });
  });
  it('a rejected key wins, singular and plural', () => {
    expect(keyStatusLine(with_([['google', 'ok'], ['groq', 'rejected']]))).toEqual({ text: '1 key rejected', tone: 'failed' });
    expect(keyStatusLine(with_([['mistral', 'rejected'], ['groq', 'rejected']]))).toEqual({ text: '2 keys rejected', tone: 'failed' });
  });
});
