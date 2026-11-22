import { describe, it, expect } from 'vitest';
import { toState, fromState, isEmptyState, describeState } from '../src/account';

describe('compte : état synchronisé', () => {
  const p = { levels: { 1: { stars: 3, score: 120 }, 2: { stars: 1, score: 50 } }, tuto: true };
  it('aller-retour sans perte', () => expect(fromState(toState(p))).toEqual(p));
  it('ignore les données invalides du serveur', () => {
    expect(fromState(null)).toEqual({ levels: {}, tuto: false });
    expect(fromState({ progress: { levels: { 999: { stars: 3, score: 1 }, 1: { stars: 9, score: -4 }, x: 1 }, tuto: 'oui' } })).toEqual({ levels: { 1: { stars: 3, score: 0 } }, tuto: false });
  });
  it('vide ou non', () => {
    expect(isEmptyState(toState({ levels: {}, tuto: false }))).toBe(true);
    expect(isEmptyState(toState(p))).toBe(false);
  });
  it('résumé en français, sans virgule', () => {
    expect(describeState(toState(p))).toBe('2 niveaux terminés, 4 étoiles');
    expect(describeState(toState({ levels: { 1: { stars: 1, score: 1 } }, tuto: false }))).toBe('1 niveau terminé, 1 étoile');
    expect(describeState(null)).toBe('Aucun niveau terminé');
  });
});
