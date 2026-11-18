import { describe, it, expect } from 'vitest';
import * as g from '../src/game';

const trapCount = (b: g.Board) => b.cells.filter((c) => g.isTrap(c.kind)).length;

describe('levelSpec', () => {
  it('grandit et reste jouable', () => {
    expect(g.levelSpec(1)).toEqual({ cols: 3, rows: 3, traps: 1 });
    for (let l = 1; l <= 40; l++) {
      const s = g.levelSpec(l);
      expect(s.cols).toBeLessThanOrEqual(6);
      expect(s.traps).toBeGreaterThanOrEqual(1);
      expect(s.traps).toBeLessThan(s.cols * s.rows);
      expect(s.traps / (s.cols * s.rows)).toBeLessThanOrEqual(0.3);
    }
    expect(g.levelSpec(30).traps).toBeGreaterThan(g.levelSpec(2).traps);
  });
});

describe('plateau', () => {
  it('le premier coup est sûr, à 0 voisin piégé, et le nombre de pièges est respecté', () => {
    for (let seed = 1; seed < 60; seed++) {
      const s = g.newGame();
      s.board = g.newBoard(6);
      const first = seed % s.board.cells.length;
      const r = g.dig(s, first, g.seeded(seed));
      expect(r.type).toBe('safe');
      expect(trapCount(s.board)).toBe(s.board.trapCount);
      expect(s.board.cells[first]!.n).toBe(0);
    }
  });
  it('les indices comptent les pièges voisins', () => {
    const s = g.newGame(); s.board = g.newBoard(6);
    g.dig(s, 0, g.seeded(7));
    s.board.cells.forEach((c, i) => {
      expect(c.n).toBe(g.neighbors(i, s.board.cols, s.board.rows).filter((j) => g.isTrap(s.board.cells[j]!.kind)).length);
    });
  });
  it('voisines : coin 3, bord 5, centre 8', () => {
    expect(g.neighbors(0, 4, 4)).toHaveLength(3);
    expect(g.neighbors(1, 4, 4)).toHaveLength(5);
    expect(g.neighbors(5, 4, 4)).toHaveLength(8);
  });
});

describe('creuser', () => {
  function trapIndex(s: g.State) { return s.board.cells.findIndex((c) => g.isTrap(c.kind)); }
  it('un piège coûte une vie et casse la série', () => {
    const s = g.newGame(); s.board = g.newBoard(4);
    g.dig(s, 0, g.seeded(3));
    s.combo = 5;
    const t = trapIndex(s);
    const r = g.dig(s, t, g.seeded(1));
    expect(r.type).toBe('trap');
    expect(s.lives).toBe(g.START_LIVES - 1);
    expect(s.combo).toBe(0);
  });
  it('plus de vie : fin de partie, plus rien ne se creuse', () => {
    const s = g.newGame(); s.board = g.newBoard(6);
    g.dig(s, 0, g.seeded(5));
    s.lives = 1;
    const r = g.dig(s, trapIndex(s), g.seeded(1));
    expect(r.over).toBe(true);
    expect(s.over).toBe(true);
    const other = s.board.cells.findIndex((c) => !c.open && !g.isTrap(c.kind));
    expect(g.dig(s, other, g.seeded(1)).type).toBe('ignored');
  });
  it('case déjà ouverte ou drapeau : ignoré', () => {
    const s = g.newGame(); s.board = g.newBoard(6);
    g.dig(s, 0, g.seeded(9));
    expect(g.dig(s, 0, g.seeded(9)).type).toBe('ignored');
    const i = s.board.cells.findIndex((c) => !c.open);
    g.toggleFlag(s, i);
    expect(g.dig(s, i, g.seeded(9)).type).toBe('ignored');
    expect(g.toggleFlag(s, i)).toBe(true);
    expect(s.board.cells[i]!.flag).toBe(false);
  });
  it('le multiplicateur de série monte par paliers et plafonne à 5', () => {
    expect([0, 2, 3, 6, 9, 12, 99].map(g.multiplier)).toEqual([1, 1, 2, 3, 4, 5, 5]);
  });
  it('une manche se termine en ouvrant toutes les cases sûres, avec bonus et grille suivante', () => {
    const s = g.newGame();
    const rng = g.seeded(11);
    let done = false;
    for (let i = 0; i < s.board.cells.length && !done; i++) {
      if (s.board.placed && (s.board.cells[i]!.open || g.isTrap(s.board.cells[i]!.kind))) continue;
      done = g.dig(s, i, rng).cleared;
    }
    expect(done).toBe(true);
    expect(g.cleared(s.board)).toBe(true);
    const before = s.score;
    const bonus = g.nextLevel(s);
    expect(bonus).toBeGreaterThan(0);
    expect(s.score).toBe(before + bonus);
    expect(s.lvl).toBe(2);
    expect(s.board.cols).toBe(4);
  });
});

describe('flair', () => {
  it('pose un drapeau sur un piège caché, une seule fois par charge', () => {
    const s = g.newGame(); s.board = g.newBoard(6);
    expect(g.sniff(s, g.seeded(1))).toBe(-1);
    g.dig(s, 0, g.seeded(2));
    const i = g.sniff(s, g.seeded(1));
    expect(g.isTrap(s.board.cells[i]!.kind)).toBe(true);
    expect(s.board.cells[i]!.flag).toBe(true);
    expect(s.sniffs).toBe(0);
    expect(g.sniff(s, g.seeded(1))).toBe(-1);
  });
});
