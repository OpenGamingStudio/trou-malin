import { describe, it, expect } from 'vitest';
import { parseBest, parseOpts, mergeBest } from '../src/save';
import { fmt } from '../src/format';

describe('sauvegarde', () => {
  it('lecture défensive', () => {
    expect(parseBest(null)).toEqual({ score: 0, lvl: 0, combo: 0 });
    expect(parseBest('{pas du json')).toEqual({ score: 0, lvl: 0, combo: 0 });
    expect(parseBest('{"score":"x","lvl":-4,"combo":12.7}')).toEqual({ score: 0, lvl: 0, combo: 12 });
    expect(parseBest('{"score":1234,"lvl":5,"combo":9}')).toEqual({ score: 1234, lvl: 5, combo: 9 });
    expect(parseOpts('{"sound":false}').sound).toBe(false);
    expect(parseOpts('nope').sound).toBe(true);
  });
  it('meilleur score : record seulement si dépassé', () => {
    const p = { score: 100, lvl: 3, combo: 5 };
    expect(mergeBest(p, 50, 4, 2)).toEqual({ best: { score: 100, lvl: 4, combo: 5 }, record: false });
    expect(mergeBest(p, 150, 2, 9).record).toBe(true);
  });
  it('nombres sans virgule', () => {
    expect(fmt(12000)).toBe('12K');
    expect(fmt(950)).toBe('950');
    expect(fmt(1500000)).toBe('1\u00a0500K');
  });
});
