import { describe, it, expect } from 'vitest';
import { parseProgress, parseOpts, mergeLevel, unlocked, totalStars } from '../src/save';
import { fmt } from '../src/format';

describe('sauvegarde', () => {
  it('lecture défensive de la progression', () => {
    expect(parseProgress(null)).toEqual({ levels: {}, tuto: false });
    expect(parseProgress('{pas du json')).toEqual({ levels: {}, tuto: false });
    expect(parseProgress('{"levels":{"1":{"stars":9,"score":12.7},"x":{"stars":1},"0":{"stars":1},"2":{"stars":0},"3":"a","1000":{"stars":1}},"tuto":true}'))
      .toEqual({ levels: { 1: { stars: 3, score: 12 } }, tuto: true });
    expect(parseProgress('[]').levels).toEqual({});
    expect(parseOpts('{"sound":false}').sound).toBe(false);
    expect(parseOpts('nope').sound).toBe(true);
  });
  it('niveaux débloqués dans l\'ordre, étoiles et meilleurs scores gardés', () => {
    const p = parseProgress(null);
    expect(unlocked(p)).toBe(1);
    expect(mergeLevel(p, 1, 2, 100)).toEqual({ better: true, first: true });
    expect(unlocked(p)).toBe(2);
    expect(mergeLevel(p, 1, 1, 300)).toEqual({ better: false, first: false });
    expect(p.levels[1]).toEqual({ stars: 2, score: 300 });
    expect(mergeLevel(p, 1, 3, 50).better).toBe(true);
    expect(p.levels[1]).toEqual({ stars: 3, score: 300 });
    mergeLevel(p, 3, 1, 10); // trou : le niveau 3 est terminé mais le 2 non
    expect(unlocked(p)).toBe(2);
    expect(totalStars(p)).toBe(4);
  });
  it('nombres sans virgule', () => {
    expect(fmt(12000)).toBe('12K');
    expect(fmt(950)).toBe('950');
    expect(fmt(1500000)).toBe('1 500K');
  });
});

import { levelsDone } from '../src/save';
describe('fin du jeu', () => {
  it('levelsDone vrai seulement quand le niveau 100 est fait', () => {
    expect(levelsDone({ tuto: true, levels: {} } as never)).toBe(false);
    expect(levelsDone({ tuto: true, levels: { 100: { stars: 1, score: 1 } } } as never)).toBe(true);
  });
});
