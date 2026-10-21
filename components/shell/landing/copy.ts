import { V3_KEY_PROVIDERS } from '@/lib/byok';
import { PROVIDER_NAME } from '@/components/board/lib/catalog';

/** TODO(owner): replace with the real contact address. Used by the hosted waitlist link and the footer. */
export const PLACEHOLDER_CONTACT_EMAIL = 'chinmay@contexttree.tech';
export const HOSTED_WAITLIST_MAILTO = `mailto:${PLACEHOLDER_CONTACT_EMAIL}?subject=Context%20Tree%20hosted`;

const names = V3_KEY_PROVIDERS.map((p) => PROVIDER_NAME[p]);

/** "Anthropic, OpenAI, Google, Groq, DeepSeek, Mistral or Moonshot" */
const orList = `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`;
export const keylineText = (): string => `Bring a key from ${orList}. Every branch can use a different one.`;

export const COPY = {
  nav: {
    links: [
      { label: 'How it works', href: '#how' },
      { label: 'Pricing', href: '#pricing' },
      { label: "Founder's note", href: '#founder' },
    ],
    signIn: { label: 'Sign in', href: '/auth/signin' },
    start: { label: 'Start a board', short: 'Start', href: '/boards' },
  },
  hero: {
    pain: { before: 'Forty messages in, the chat has ', bold: 'forgotten the PDF', after: ' you gave it.' },
    h1: 'Give every question its own desk.',
    body: {
      before: 'Pin PDFs, links and notes beside a question. ',
      bold: "Its chat reads what's on that desk and nothing else.",
      after: ' Branch to ask it another way — every branch remembers the question it grew from.',
    },
    primary: { label: "Start a board — it's free", href: '/boards' },
    secondary: { label: 'See how it works', href: '#how' },
    micro: ['Runs in your browser', 'Free with your own API key', 'No card'],
  },
  how: {
    eyebrow: 'How it works',
    h2: "What a board does that a chat window can't.",
    features: [
      { key: 'desks', tab: 'Desks', h3: "What's on the desk is what the chat reads.", p: 'Drop a PDF, a link or a note beside a question and that chat reads those — nothing from the other desks — so answers stay on topic and each question sends fewer tokens.' },
      { key: 'branches', tab: 'Branches', h3: 'Branch from any answer.', p: 'Ask the same desk a different question, or add one source and see what changes. The string thickens toward the question it grew from.' },
      { key: 'focus', tab: 'Focus', h3: 'Open any card big.', p: 'Long answers get a full page, with the questions that led there on the left. Esc puts you back on the board.' },
      { key: 'models', tab: 'Your keys', h3: 'Ask the next question on another AI.', p: 'Each branch picks its own model — Claude, GPT, Gemini and more — and the desk and the trail come with it. You pay the provider directly; we add nothing on top.' },
    ],
  },
  proof: {
    tab: 'What people say',
    h3: 'This desk is empty on purpose.',
    p: 'Context Tree V3 is new. When the first people using it have something to say, their words get pinned here — with their names and their permission. No logo wall until there’s something true to put on it.',
  },
  founder: {
    eyebrow: "Founder's note",
    h2: 'Why this exists.',
    side: 'One person builds Context Tree. This is the note pinned to the first board.',
    meta: 'Note · Founder',
    paragraphs: [
      "I started this in 2025 because my best questions kept getting lost. I'd ask something good, the chat would wander, and forty messages later the model had half-forgotten the paper I'd given it at the start.",
      'I wanted a board instead of a scroll. Each question gets a desk. Whatever sits on the desk is what that chat reads. When I want a second angle I branch, and the branch remembers where it came from.',
      "It runs in your browser and it's free with your own API keys, because I'd rather you pay the people who make the models than pay me a markup. If something breaks or feels wrong, write to me. I read every message.",
    ],
    sig: "[Founder's name]",
    sigNote: '· building Context Tree',
  },
  pricing: {
    eyebrow: 'Pricing',
    h2: 'Free while you bring your own keys.',
    free: {
      name: 'Free',
      amount: '€0',
      amountNote: 'for as long as you use your own keys',
      lead: 'Everything on the board. You pay each AI provider for what you use, at their price.',
      items: [
        'Unlimited boards, up to 50 cards on each',
        `Seven providers: ${names.join(', ')}`,
        'PDFs, documents, links and notes as sources',
      ],
      cta: { label: 'Start a board', href: '/boards' },
    },
    hosted: {
      name: 'Hosted',
      chip: 'Coming soon',
      amount: 'No keys needed',
      lead: "Models included, for people who'd rather not manage API keys. Priced when it's ready — not before.",
      items: ['Everything in Free', 'Video and audio reading', 'Share a board with a link'],
      cta: { label: "Tell me when it's ready", href: HOSTED_WAITLIST_MAILTO },
    },
  },
  faq: [
    { q: 'Do I need an API key?', a: 'Yes, for now. Paste one from any of the seven providers in Settings; it takes about a minute. You can add more later.' },
    { q: 'Where is my key kept?', a: "Encrypted on our server. It's never sent back to your browser after you save it, and you can remove it at any time." },
    { q: 'Do I have to install anything?', a: 'No. Context Tree runs in your browser, on any computer you sign in from.' },
  ],
  footer: {
    tagline: 'Think in branches. Keep your sources in sight.',
    links: [
      { label: "Founder's note", href: '#founder' },
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
      { label: 'Contact', href: `mailto:${PLACEHOLDER_CONTACT_EMAIL}` },
    ],
    year: '© 2026',
  },
} as const;
