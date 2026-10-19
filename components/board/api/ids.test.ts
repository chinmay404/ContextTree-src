import { genMessageId, newId } from './ids';

it('makes contract-shaped ids', () => {
  expect(newId('c', () => 1700000000000, () => 0.5)).toMatch(/^c_[0-9a-z]+_[0-9a-z]{6}$/);
  expect(newId('e')).toMatch(/^e_/);
  expect(new Set(Array.from({ length: 500 }, () => newId('c'))).size).toBe(500);
});

it('makes V2-style message ids', () => {
  expect(genMessageId()).toMatch(/^[0-9a-z]+$/);
});
