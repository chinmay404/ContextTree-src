const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

/** `<prefix>_<Date.now() base36>_<6 random [a-z0-9]>` per the contract. */
export function newId(prefix: 'b' | 'c' | 'e', now: () => number = Date.now, rand: () => number = Math.random): string {
  let tail = '';
  for (let i = 0; i < 6; i++) tail += ALPHABET[Math.min(35, Math.floor(rand() * 36))];
  return `${prefix}_${now().toString(36)}_${tail}`;
}

/** Message ids as V2 genId(); stored as `<id>_u` / `<id>_a`. */
export function genMessageId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
