import { seedBoard } from '../api/mock/seed';
import type { Board, Card, SourceData } from '../api/types';
import { MODELS, defaultChatData, modelInfo, personaLabel, PERSONAS } from './catalog';
import {
  ancestors, canPlug, descendants, famOf, graphOf, hasAnswer, kids, membersOf, nameOf, qNum, sourcesOf, subtree, tokensOf, tubeW, wireKey,
} from './graph';

const board = (): Board => seedBoard().board;
const g = graphOf(board());

it('numbers questions like the prototype', () => {
  expect(['main', 'side', 'second', 'deep'].map((id) => qNum(g, id))).toEqual(['Q1', 'Q1.1', 'Q1.2', 'Q1.2.1']);
});

it('canPlug follows the prototype rules', () => {
  expect(canPlug(g, 'side', 'chat', 'second')).toBe(true);
  expect(canPlug(g, 'main', 'chat', 'deep')).toBe(false); // ancestor
  expect(canPlug(g, 'deep', 'chat', 'main')).toBe(false); // descendant
  expect(canPlug(g, 'side', 'chat', 'deep')).toBe(false); // already strung
  expect(canPlug(g, 'side', 'chat', 'side')).toBe(false);
  expect(canPlug(g, 'pdf', 'src', 'main')).toBe(false); // on its desk
  expect(canPlug(g, 'csv', 'src', 'deep')).toBe(false); // already wired
  expect(canPlug(g, 'podcast', 'src', 'side')).toBe(true);
});

it('tube width grows with the subtree', () => {
  expect(tubeW(g, 'second')).toBeGreaterThan(tubeW(g, 'deep'));
  expect(tubeW(g, 'deep')).toBe(4);
  expect(subtree(g, 'main')).toBe(4);
});

it('pile family follows its members', () => {
  expect(famOf(g, g.cards.get('interviews')!)).toBe('docs'); // 3 pdf + 1 doc, same family
  const b = board();
  b.cards.find((c) => c.id === 'interviews_1')!.sourceType = 'web';
  expect(famOf(graphOf(b), b.cards.find((c) => c.id === 'interviews')!)).toBe('mixed');
});

it('sourcesOf hides pile members', () => {
  expect(sourcesOf(g).map((c) => c.id)).not.toContain('interviews_1');
  expect(sourcesOf(g)).toHaveLength(8);
  expect(membersOf(g, 'interviews')).toHaveLength(4);
});

it('walks lineage', () => {
  expect(ancestors(g, 'deep').map((c) => c.id)).toEqual(['second', 'main']);
  expect(descendants(g, 'main').map((c) => c.id)).toEqual(['side', 'second', 'deep']);
  expect(kids(g, 'main').map((c) => c.id)).toEqual(['side', 'second']);
});

it('names, wire keys, tokens and answers', () => {
  expect(nameOf(g, g.cards.get('deep')!)).toBe('Q1.2.1 answer');
  expect(nameOf(g, g.cards.get('note')!)).toBe('Costs ≈ $0.40 per active user a m…');
  expect(nameOf(g, g.cards.get('pdf')!)).toBe('Pricing survey 2025');
  expect(wireKey(g.edges.get('e_seed_csv_deep')!)).toBe('s|csv|deep');
  expect(wireKey(g.edges.get('e_seed_side_deep')!)).toBe('a|side|deep');
  expect(tokensOf(g, g.cards.get('main')!)).toBe(420);
  expect(tokensOf(g, g.cards.get('video')!)).toBe(0); // soon
  expect(tokensOf(g, g.cards.get('pdf')!)).toBe(Math.round('Our main benchmark. Trust it over blog posts.'.length / 4) + 2 * 450 + 200);
  expect(hasAnswer(g.cards.get('main')!)).toBe(true);
  expect(hasAnswer({ messageCount: 0, lastMessage: null } as Card)).toBe(false);
});

it('catalog helpers', () => {
  expect(defaultChatData('Q').model).toBe('openai/gpt-5-mini');
  expect(defaultChatData('Q', 'x').model).toBe('x');
  expect(modelInfo(MODELS.gemini.engineId)).toEqual({ key: 'gemini', label: 'Gemini', name: 'Gemini 3 Flash', color: '#2A86C4' });
  expect(modelInfo('acme/foo-bar')).toEqual({ key: null, label: 'foo-bar', name: 'foo-bar', color: '#6E6585' });
  expect(personaLabel('none')).toBeNull();
  expect(personaLabel('custom')).toBe('Custom');
  expect(personaLabel('skeptic')).toBe('Skeptic');
  expect(PERSONAS.none.text).toBe('');
});

it('seed excerpts keep contract shape', () => {
  const ex = (g.cards.get('pdf')!.data as SourceData).excerpts!;
  expect(ex[0]).toEqual({ loc: 'p. 3', text: 'Solo-dev tools cluster between $8 and $20.', on: true });
});
