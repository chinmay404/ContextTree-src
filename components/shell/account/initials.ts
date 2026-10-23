const firstLetter = (word: string): string => /\p{L}/u.exec(word)?.[0] ?? '';

/** "Sam Rivera" gives "SR", "cher" gives "C", no name gives the first letter of the email. */
export function initials(name: string | null | undefined, email: string): string {
  const letters = (name ?? '').trim().split(/\s+/).map(firstLetter).filter(Boolean);
  if (letters.length >= 2) return (letters[0] + letters[letters.length - 1]).toUpperCase();
  if (letters.length === 1) return letters[0].toUpperCase();
  return firstLetter(email).toUpperCase() || '?';
}
