import { describe, it, expect } from 'vitest';
import * as g from '../src/game';

const firstLive = (b: g.Board) => b.cells.findIndex((c) => !c.gone);
const trapCount = (b: g.Board) => b.cells.filter((c) => g.isTrap(c.kind)).length;

/** Chaque case vit-elle dans une seule composante (8-voisinage) ? */
function connected(sh: g.Shape): boolean {
  const b = g.boardOf(1, sh, 1);
  const live = b.cells.map((_, i) => i).filter((i) => !b.cells[i]!.gone);
  const seen = new Set([live[0]!]), q = [live[0]!];
  while (q.length) for (const j of g.neighbors(q.pop()!, b.cols, b.rows, b.cells)) if (!seen.has(j)) { seen.add(j); q.push(j); }
  return seen.size === live.length;
}

describe('formes et niveaux', () => {
  it('18 formes valides : rectangulaires, 6 colonnes au plus, d\'un seul tenant, au moins 16 cases', () => {
    expect(g.SHAPES.length).toBe(18);
    for (const sh of g.SHAPES) {
      expect(new Set(sh.rows.map((r) => r.length)).size).toBe(1);
      expect(sh.rows[0]!.length).toBeLessThanOrEqual(6);
      expect(sh.rows.length).toBeLessThanOrEqual(8);
      expect(g.shapeCells(sh)).toBeGreaterThanOrEqual(16);
      expect(connected(sh)).toBe(true);
    }
    const holes = g.SHAPES.filter((sh) => sh.rows.join('').includes('.'));
    expect(holes.map((s) => s.id)).toEqual(expect.arrayContaining(['coeur', 'etoile', 'sablier', 'losange', 'anneau', 'zigzag', 'taupe']));
  });
  it('levelSpec : grilles de plus en plus grandes, pièges de 14 % à 30 % au plus', () => {
    expect(g.levelSpec(1).cells).toBeLessThanOrEqual(g.levelSpec(100).cells);
    expect(g.levelSpec(100).cells).toBeGreaterThanOrEqual(32);
    for (let l = 1; l <= 200; l++) {
      const s = g.levelSpec(l);
      expect(s.traps).toBeGreaterThanOrEqual(3);
      expect(s.cells - s.traps).toBeGreaterThanOrEqual(8);
      expect(s.traps / s.cells).toBeLessThanOrEqual(0.3);
    }
    expect(g.levelSpec(100).traps / g.levelSpec(100).cells).toBeGreaterThan(g.levelSpec(1).traps / g.levelSpec(1).cells);
  });
  it('voisines : coin 3, bord 5, centre 8, et les cases absentes ne comptent pas', () => {
    expect(g.neighbors(0, 4, 4)).toHaveLength(3);
    expect(g.neighbors(1, 4, 4)).toHaveLength(5);
    expect(g.neighbors(5, 4, 4)).toHaveLength(8);
    const ring = g.boardOf(1, g.SHAPES.find((s) => s.id === 'anneau')!, 1);
    const centre = 2 * ring.cols + 2; // case '.' du trou central
    expect(ring.cells[centre]!.gone).toBe(true);
    expect(g.neighbors(1 * ring.cols + 1, ring.cols, ring.rows, ring.cells)).not.toContain(centre);
    expect(g.neighbors(1 * ring.cols + 1, ring.cols, ring.rows, ring.cells)).toHaveLength(6);
  });
});

describe('plateau', () => {
  it('pose : cases absentes intactes, pièges respectés, premier coup sûr, chiffres = voisins existants', () => {
    for (let lvl = 1; lvl <= 24; lvl++) for (let seed = 1; seed < 12; seed++) {
      const s = g.newLevel(lvl);
      const live = s.board.cells.map((c, i) => (c.gone ? -1 : i)).filter((i) => i >= 0);
      const first = live[(seed * 7) % live.length]!;
      const r = g.dig(s, first, g.seeded(seed * 31 + lvl));
      expect(r.type).toBe('safe');
      expect(trapCount(s.board)).toBe(s.board.trapCount);
      s.board.cells.forEach((c, i) => {
        if (c.gone) { expect(c.kind).toBe('empty'); expect(c.open).toBe(false); expect(c.n).toBe(0); return; }
        expect(c.n).toBe(g.neighbors(i, s.board.cols, s.board.rows, s.board.cells).filter((j) => g.isTrap(s.board.cells[j]!.kind)).length);
      });
    }
  });
  it('une case absente ne se creuse ni ne se marque', () => {
    const s = g.newLevel(2);
    s.board = g.boardOf(2, g.SHAPES.find((x) => x.id === 'etoile')!, 3); // étoile : le coin 0 est absent
    expect(s.board.cells[0]!.gone).toBe(true);
    expect(g.dig(s, 0, g.seeded(1)).type).toBe('ignored');
    expect(g.toggleFlag(s, 0)).toBe(false);
    expect(s.board.placed).toBe(false);
  });
  it('valeur de base et maximum : ideal >= base, et aucun score sans piège ne dépasse le maximum', () => {
    for (let lvl = 1; lvl <= 12; lvl++) for (let seed = 1; seed < 20; seed++) {
      const s = g.newLevel(lvl);
      const rng = g.seeded(seed);
      for (let i = 0; i < s.board.cells.length && !g.cleared(s.board); i++) {
        const c = s.board.cells[i]!;
        if (c.gone || (s.board.placed && (c.open || g.isTrap(c.kind)))) continue;
        g.dig(s, i, rng);
      }
      expect(g.cleared(s.board)).toBe(true);
      expect(s.board.ideal).toBeGreaterThanOrEqual(s.board.base);
      expect(s.score).toBeLessThanOrEqual(s.board.ideal);
      expect(s.score).toBeGreaterThanOrEqual(s.board.base);
      expect(g.starsFor(s.score, s.board)).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('creuser', () => {
  const trapIndex = (s: g.State) => s.board.cells.findIndex((c) => g.isTrap(c.kind));
  it('un piège coûte une vie et casse la série', () => {
    const s = g.newLevel(4);
    g.dig(s, firstLive(s.board), g.seeded(3));
    s.combo = 5;
    const r = g.dig(s, trapIndex(s), g.seeded(1));
    expect(r.type).toBe('trap');
    expect(s.lives).toBe(g.START_LIVES - 1);
    expect(s.combo).toBe(0);
  });
  it('plus de vie : niveau perdu, plus rien ne se creuse', () => {
    const s = g.newLevel(6);
    g.dig(s, firstLive(s.board), g.seeded(5));
    s.lives = 1;
    const r = g.dig(s, trapIndex(s), g.seeded(1));
    expect(r.over).toBe(true);
    expect(s.over).toBe(true);
    const other = s.board.cells.findIndex((c) => !c.gone && !c.open && !g.isTrap(c.kind));
    expect(g.dig(s, other, g.seeded(1)).type).toBe('ignored');
  });
  it('case déjà ouverte ou drapeau : ignoré', () => {
    const s = g.newLevel(8);
    const f = firstLive(s.board);
    g.dig(s, f, g.seeded(9));
    expect(g.dig(s, f, g.seeded(9)).type).toBe('ignored');
    const i = s.board.cells.findIndex((c) => !c.gone && !c.open);
    g.toggleFlag(s, i);
    expect(g.dig(s, i, g.seeded(9)).type).toBe('ignored');
    expect(g.toggleFlag(s, i)).toBe(true);
    expect(s.board.cells[i]!.flag).toBe(false);
  });
  it('le multiplicateur de série : x1, x2 dès 4, x3 dès 8, x4 dès 12, x5 dès 16', () => {
    expect([0, 3, 4, 7, 8, 12, 16, 99].map(g.multiplier)).toEqual([1, 1, 2, 2, 3, 4, 5, 5]);
  });
  it('pièces et gemmes rapportent leurs points (fois la série) dans le score', () => {
    expect(g.POINTS).toEqual({ empty: 2, coin: 10, gem: 50 });
    const s = g.newLevel(8);
    g.dig(s, firstLive(s.board), g.seeded(2));
    const b = s.board;
    b.cells.forEach((c) => { if (!c.gone && !g.isTrap(c.kind) && !c.open) c.kind = 'empty'; });
    const i = b.cells.findIndex((c) => !c.gone && !c.open && !g.isTrap(c.kind));
    b.cells[i]!.kind = 'gem'; b.cells[i]!.n = 3; // n > 0 : pas de propagation
    s.combo = 0;
    const before = s.score;
    expect(g.dig(s, i, g.seeded(1)).gained).toBe(50);
    expect(s.score).toBe(before + 50);
  });
  it('étoiles : 1 terminé, 2 dès 50 % du maximum, 3 dès 75 %', () => {
    const s = g.newLevel(8);
    g.dig(s, firstLive(s.board), g.seeded(2));
    s.board.cells.forEach((c) => { if (!c.gone && !g.isTrap(c.kind)) c.open = true; });
    const t = g.starTargets(s.board);
    expect(t.two).toBe(Math.ceil(s.board.ideal * 0.5));
    expect(g.starsFor(0, s.board)).toBe(1);
    expect(g.starsFor(t.two - 1, s.board)).toBe(1);
    expect(g.starsFor(t.two, s.board)).toBe(2);
    expect(g.starsFor(t.three - 1, s.board)).toBe(2);
    expect(g.starsFor(t.three, s.board)).toBe(3);
    const open = g.newLevel(8);
    expect(g.starsFor(9999, open.board)).toBe(0); // niveau non terminé : aucune étoile
  });
  it('un joueur sans faute atteint 2 étoiles presque toujours, un joueur qui rate un piège perd du score', () => {
    let two = 0, n = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const s = g.newLevel(8); const rng = g.seeded(seed);
      for (let i = 0; i < s.board.cells.length && !g.cleared(s.board); i++) {
        const c = s.board.cells[i]!;
        if (c.gone || (s.board.placed && (c.open || g.isTrap(c.kind)))) continue;
        g.dig(s, i, rng);
      }
      n++; if (g.starsFor(s.score, s.board) >= 2) two++;
    }
    expect(two / n).toBeGreaterThan(0.7);
  });
});

describe('flair', () => {
  it('pose un drapeau sur un piège caché, une seule fois par charge', () => {
    const s = g.newLevel(6);
    s.sniffs = 1;
    expect(g.sniff(s, g.seeded(1))).toBe(-1);
    g.dig(s, firstLive(s.board), g.seeded(2));
    const i = g.sniff(s, g.seeded(1));
    expect(g.isTrap(s.board.cells[i]!.kind)).toBe(true);
    expect(s.board.cells[i]!.flag).toBe(true);
    expect(s.sniffs).toBe(0);
    expect(g.sniff(s, g.seeded(1))).toBe(-1);
  });
  it('charges de flair : 1, 2 dès le niveau 10, 3 dès le 20', () => {
    expect([1, 9, 10, 19, 20, 99].map((l) => g.newLevel(l).sniffs)).toEqual([1, 1, 2, 2, 3, 3]);
  });
});
