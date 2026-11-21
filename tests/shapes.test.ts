import { describe, it, expect } from 'vitest';
import * as g from '../src/game';

describe('formes', () => {
  it('chaque forme a un dessin unique', () => {
    const keys = g.SHAPES.map((s) => s.rows.join('/'));
    expect(new Set(keys).size).toBe(keys.length);
  });
  it('lignes de même largeur', () => {
    for (const s of g.SHAPES) for (const r of s.rows) expect(r.length).toBe(s.rows[0]!.length);
  });
  it('chaque forme sert au moins un niveau', () => {
    const used = new Set<string>();
    for (let l = 1; l <= g.MAX_LEVEL; l++) used.add(g.levelSpec(l).shape.id);
    expect([...used].sort()).toEqual(g.SHAPES.map((s) => s.id).sort());
  });
});
