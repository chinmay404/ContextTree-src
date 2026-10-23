/** Where to go after sign-in. Only same-site paths pass; everything else lands on /boards. */
export function safeCallback(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return '/boards';
  return raw;
}
