import { describe, it, expect } from 'vitest';
import * as g from '../src/game';

/** Clics SÛRS d'un joueur parfait (il ne se trompe jamais) pour finir le niveau, après un premier clic en `first`, en jouant le vrai moteur `dig`. */
function perfectClicks(lvl: number, first: number, seed: number): { total: number; trapsOnBoard: number; cleared: boolean } {
  const s = g.newLevel(lvl);
  const rng = g.seeded(seed);
  let total = 0;
  const r = g.dig(s, first, rng);
  if (r.type !== 'safe') return { total: -1, trapsOnBoard: 0, cleared: false };
  total++;
  while (!g.cleared(s.board)) {
    const rest = s.board.cells.map((c, i) => ({ c, i })).filter(({ c }) => !c.gone && !c.open && !g.isTrap(c.kind));
    const pick = rest.find(({ c }) => c.n === 0) ?? rest[0]!;
    const d = g.dig(s, pick.i, rng);
    expect(d.type).toBe('safe');
    total++;
  }
  return { total, trapsOnBoard: s.board.cells.filter((c) => g.isTrap(c.kind)).length, cleared: true };
}

const SEEDS = [1, 7, 42];

describe('100 niveaux', () => {
  it('il y a au moins 100 niveaux, formes valides, grilles de 6 colonnes au plus', () => {
    expect(g.MAX_LEVEL).toBeGreaterThanOrEqual(100);
    for (let l = 1; l <= g.MAX_LEVEL; l++) {
      const s = g.levelSpec(l);
      expect(s.cols).toBeLessThanOrEqual(6);
      expect(s.cells - s.traps).toBeGreaterThanOrEqual(8);
      expect(s.traps).toBeGreaterThanOrEqual(3);
      expect(s.minAfter).toBeGreaterThanOrEqual(3);
    }
  });

  it('difficulté progressive : cases et part de pièges ne baissent pas d\'un monde au suivant', () => {
    const avg = (w: number, f: (l: ReturnType<typeof g.levelSpec>) => number) => {
      let t = 0;
      for (let k = 1; k <= 10; k++) t += f(g.levelSpec(w * 10 + k));
      return t / 10;
    };
    for (let w = 1; w < 10; w++) {
      expect(avg(w, (s) => s.cells)).toBeGreaterThanOrEqual(avg(w - 1, (s) => s.cells));
      expect(avg(w, (s) => s.traps / s.cells)).toBeGreaterThanOrEqual(avg(w - 1, (s) => s.traps / s.cells) - 0.02);
    }
  });

  it('introduction progressive : bombes seules, puis pièces, ours, gemmes, flaques', () => {
    expect(g.levelSpec(10)).toMatchObject({ trapKinds: ['bomb'], coinRate: 0 });
    expect(g.levelSpec(11).coinRate).toBeGreaterThan(0);
    expect(g.levelSpec(20).trapKinds).toEqual(['bomb']);
    expect(g.levelSpec(21).trapKinds).toEqual(['bomb', 'bear']);
    expect(g.levelSpec(30).gemShare).toBe(0);
    expect(g.levelSpec(31).gemShare).toBeGreaterThan(0);
    expect(g.levelSpec(40).trapKinds).not.toContain('water');
    expect(g.levelSpec(41).trapKinds).toContain('water');
  });

  it('CHAQUE niveau : jamais fini en moins de N clics, quelle que soit la case de départ (toutes les cases, 3 tirages)', () => {
    for (let l = 1; l <= g.MAX_LEVEL; l++) {
      const spec = g.levelSpec(l);
      const need = Math.max(3, spec.minAfter) + 1; // clics au total, premier compris : au moins 3 APRÈS le premier
      const probe = g.newLevel(l).board;
      const live = probe.cells.map((c, i) => (c.gone ? -1 : i)).filter((i) => i >= 0);
      let worst = Infinity;
      for (const first of live) for (const seed of SEEDS) {
        const r = perfectClicks(l, first, seed * 1000 + l);
        expect(r.cleared).toBe(true);
        worst = Math.min(worst, r.total);
        if (r.total < need) throw new Error(`Niveau ${l} (${spec.shape.id}) : fini en ${r.total} clics depuis la case ${first} (tirage ${seed}), il en faut au moins ${need}`);
      }
      expect(worst).toBeGreaterThanOrEqual(need);
    }
  });

  it('le test détecte un niveau trop facile : une grille sans piège se finit en 1 clic', () => {
    const s = g.newLevel(1);
    s.board.trapCount = 0;
    s.board.minAfter = 0;
    s.board.trapKinds = ['bomb'];
    g.dig(s, 0, g.seeded(1));
    expect(g.cleared(s.board)).toBe(true);
  });
});
