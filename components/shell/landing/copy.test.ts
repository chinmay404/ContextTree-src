import { PROVIDER_NAME } from '@/components/board/lib/catalog';
import { COPY, HOSTED_WAITLIST_MAILTO, PLACEHOLDER_CONTACT_EMAIL, keylineText } from './copy';

const all = JSON.stringify(COPY) + keylineText();

describe('landing copy', () => {
  it('makes no export or Markdown claim', () => {
    for (const bad of ['Markdown', 'Export', 'export', 'Unlimited boards, desks']) expect(all).not.toContain(bad);
  });

  it('the keyline names all seven providers', () => {
    const line = keylineText();
    for (const name of Object.values(PROVIDER_NAME)) expect(line).toContain(name);
    expect(Object.values(PROVIDER_NAME)).toHaveLength(7);
  });

  it('the founder note is signed with a placeholder', () => {
    expect(COPY.founder.sig).toBe("[Founder's name]");
  });

  it('says free and bring your own keys', () => {
    expect(all).toContain('Free with your own API key');
    expect(COPY.pricing.free.items).toContain('Unlimited boards, up to 50 cards on each');
    expect(COPY.pricing.free.items.some((i) => i.startsWith('Seven providers: Anthropic, OpenAI, Google, Groq, DeepSeek, Mistral, Moonshot'))).toBe(true);
  });

  it('the hosted button is a mailto to the named placeholder address', () => {
    expect(HOSTED_WAITLIST_MAILTO).toBe(`mailto:${PLACEHOLDER_CONTACT_EMAIL}?subject=Context%20Tree%20hosted`);
    expect(COPY.pricing.hosted.cta.href).toBe(HOSTED_WAITLIST_MAILTO);
  });

  it('keeps the nav and CTAs', () => {
    expect(COPY.nav.links.map((l) => l.href)).toEqual(['#how', '#pricing', '#founder']);
    expect(COPY.nav.signIn.href).toBe('/auth/signin');
    expect(COPY.hero.primary.href).toBe('/boards');
    expect(COPY.hero.secondary.href).toBe('#how');
  });
});
