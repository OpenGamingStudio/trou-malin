import { describe, it, expect } from 'vitest';
import * as g from '../src/game';
import { STEPS, tutoAction } from '../src/tuto';
import { RULE } from '../src/rules';

describe('tuto', () => {
  it('le plateau fixe suit le script : creuser, lire un 1, drapeau sur le piège, pièce, gemme, fin', () => {
    const s = g.newTuto();
    const b = s.board;
    expect(b.placed).toBe(true);
    expect(g.isTrap(b.cells[g.TUTO.flag]!.kind)).toBe(true);
    expect(b.cells[g.TUTO.coin]!.kind).toBe('coin');
    expect(b.cells[g.TUTO.gem]!.kind).toBe('gem');
    const r = g.dig(s, g.TUTO.first, g.seeded(1));
    expect(r.type).toBe('safe');
    expect(r.cleared).toBe(false);
    expect(b.cells[g.TUTO.read]!.open).toBe(true);
    expect(b.cells[g.TUTO.read]!.n).toBe(1);
    expect(b.cells[g.TUTO.coin]!.open).toBe(false);
    expect(b.cells[g.TUTO.gem]!.open).toBe(false);
    expect(g.toggleFlag(s, g.TUTO.flag)).toBe(true);
    expect(g.dig(s, g.TUTO.coin, g.seeded(1)).type).toBe('safe');
    expect(g.dig(s, g.TUTO.gem, g.seeded(1)).type).toBe('safe');
    for (let i = 0; i < b.cells.length; i++) if (!g.isTrap(b.cells[i]!.kind) && !b.cells[i]!.open) g.dig(s, i, g.seeded(1));
    expect(g.cleared(b)).toBe(true);
    expect(s.lives).toBe(g.START_LIVES);
  });
  it('les étapes visent des cases existantes et finissent par « libre »', () => {
    const b = g.tutoBoard();
    for (const st of STEPS) if (st.cell !== undefined) expect(b.cells[st.cell]).toBeDefined();
    expect(STEPS[STEPS.length - 1]!.act).toBe('free');
    expect(STEPS.map((s) => s.act)).toEqual(expect.arrayContaining(['dig', 'flag', 'ok']));
    expect(STEPS.some((s) => s.text.includes(`+${g.POINTS.coin}`))).toBe(true);
    expect(STEPS.some((s) => s.text.includes(`+${g.POINTS.gem}`))).toBe(true);
  });
});

describe('règles affichées', () => {
  it('disent les vrais points, vies et seuils d\'étoiles', () => {
    expect(RULE.points).toContain(`+${g.POINTS.coin}`);
    expect(RULE.points).toContain(`+${g.POINTS.gem}`);
    expect(RULE.points).toContain(`+${g.POINTS.empty}`);
    expect(RULE.loot).toMatch(/score du niveau/);
    expect(RULE.loot).toMatch(/étoiles/);
    expect(RULE.traps).toContain(String(g.START_LIVES));
    expect(RULE.stars).toContain(`${g.STAR2 * 100} %`);
    expect(RULE.stars).toContain(`${g.STAR3 * 100} %`);
    for (let k = 1; k <= 4; k++) expect(RULE.series).toContain(`×${k + 1} dès ${k * 4}`);
  });
  it('aucun nombre à virgule dans les textes', () => {
    for (const t of [...Object.values(RULE), ...STEPS.map((s) => s.text)]) expect(t).not.toMatch(/\d[.,]\d/);
  });
  it('tuto complet en mode drapeau actif : la pièce se creuse, le drapeau aussi en mode pelle', () => {
    const s = g.newTuto();
    let flagMode = true; // le joueur a activé le bouton Drapeau
    const rng = g.seeded(1);
    let i = 0;
    const tap = (cell: number, long = false) => {
      const step = STEPS[i]!;
      const a = tutoAction(step, cell, flagMode, long);
      if (step.act === 'ok' || step.act === 'free' || step.cell !== cell || step.act !== a) return false;
      if (a === 'dig') g.dig(s, cell, rng); else g.toggleFlag(s, cell);
      i++;
      return true;
    };
    expect(tap(g.TUTO.first)).toBe(true); // étape dig malgré flagMode
    i++; // « Compris »
    expect(tap(g.TUTO.flag)).toBe(true); // drapeau en mode drapeau
    expect(tap(g.TUTO.coin)).toBe(true); // pièce creusée même si flagMode reste actif
    expect(s.board.cells[g.TUTO.coin]!.open).toBe(true);
    flagMode = false;
    expect(tutoAction(STEPS[2], g.TUTO.flag, false, false)).toBe('flag'); // mode pelle sur étape drapeau
    expect(tutoAction(STEPS[2], g.TUTO.flag, false, true)).toBe('flag'); // appui long
    expect(tutoAction(STEPS[3], g.TUTO.coin, true, true)).toBe('dig');
    expect(tutoAction(undefined, 3, true, false)).toBe('flag');
    expect(tutoAction(undefined, 3, false, false)).toBe('dig');
  });
});
