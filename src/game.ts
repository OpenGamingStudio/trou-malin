/** Logique pure de Trou Malin (aucun DOM) : plateau, indices de proximité, vies, combo, score. */

export type Trap = 'bomb' | 'bear' | 'water';
export type Loot = 'coin' | 'gem';
export type Kind = 'empty' | Loot | Trap;

export const TRAPS: Trap[] = ['bomb', 'bear', 'water'];
export const START_LIVES = 3;
export const MAX_LIVES = 5;
export const POINTS = { empty: 2, coin: 10, gem: 50 } as const;

export interface Cell {
  kind: Kind;
  open: boolean;
  flag: boolean;
  /** Nombre de pièges parmi les 8 voisines. */
  n: number;
}

export interface Level {
  cols: number;
  rows: number;
  traps: number;
}

/** Difficulté : la grille grandit (3x3 à 6x6) et la part de pièges augmente jusqu'à environ 28 %. */
export function levelSpec(lvl: number): Level {
  const l = Math.max(1, Math.floor(lvl));
  const size = Math.min(6, 3 + Math.floor(l / 2));
  const cells = size * size;
  const ratio = Math.min(0.28, 0.12 + 0.02 * l);
  const traps = Math.min(cells - 9 > 0 ? cells - 9 : 1, Math.max(1, Math.round(cells * ratio)));
  return { cols: size, rows: size, traps };
}

export type Rng = () => number;

/** Petit générateur déterministe (mulberry32), pour les tests. */
export function seeded(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function neighbors(i: number, cols: number, rows: number): number[] {
  const x = i % cols, y = Math.floor(i / cols), out: number[] = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (!dx && !dy) continue;
    const nx = x + dx, ny = y + dy;
    if (nx >= 0 && ny >= 0 && nx < cols && ny < rows) out.push(ny * cols + nx);
  }
  return out;
}

export function multiplier(combo: number): number {
  return Math.min(5, 1 + Math.floor(combo / 3));
}

export interface Board {
  lvl: number;
  cols: number;
  rows: number;
  trapCount: number;
  cells: Cell[];
  placed: boolean;
}

export function newBoard(lvl: number): Board {
  const s = levelSpec(lvl);
  const cells: Cell[] = Array.from({ length: s.cols * s.rows }, () => ({ kind: 'empty' as Kind, open: false, flag: false, n: 0 }));
  return { lvl, cols: s.cols, rows: s.rows, trapCount: s.traps, cells, placed: false };
}

/** Pose pièges et trésors après le premier coup de pelle : la case creusée et ses voisines sont toujours sûres. */
export function place(b: Board, first: number, rng: Rng): void {
  const safe = new Set([first, ...neighbors(first, b.cols, b.rows)]);
  let pool = b.cells.map((_, i) => i).filter((i) => !safe.has(i));
  if (pool.length < b.trapCount) pool = b.cells.map((_, i) => i).filter((i) => i !== first);
  const shuffle = <T,>(a: T[]) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j]!, a[i]!]; } return a; };
  shuffle(pool);
  const traps = Math.min(b.trapCount, pool.length);
  for (let k = 0; k < traps; k++) b.cells[pool[k]!]!.kind = TRAPS[Math.floor(rng() * TRAPS.length)]!;
  for (let i = 0; i < b.cells.length; i++) {
    const c = b.cells[i]!;
    c.n = neighbors(i, b.cols, b.rows).filter((j) => TRAPS.includes(b.cells[j]!.kind as Trap)).length;
    if (c.kind === 'empty' && rng() < 0.4) c.kind = rng() < 0.22 ? 'gem' : 'coin';
  }
  b.placed = true;
}

export const isTrap = (k: Kind): k is Trap => k === 'bomb' || k === 'bear' || k === 'water';
export const safeLeft = (b: Board) => b.cells.filter((c) => !isTrap(c.kind) && !c.open).length;
export const cleared = (b: Board) => b.placed && safeLeft(b) === 0;

export interface State {
  lvl: number;
  lives: number;
  score: number;
  combo: number;
  bestCombo: number;
  sniffs: number;
  board: Board;
  over: boolean;
}

export function newGame(): State {
  return { lvl: 1, lives: START_LIVES, score: 0, combo: 0, bestCombo: 0, sniffs: 1, board: newBoard(1), over: false };
}

export interface DigResult {
  /** 'ignored' : case déjà ouverte, drapeau posé ou partie finie. */
  type: 'ignored' | 'safe' | 'trap';
  index: number;
  kind: Kind;
  gained: number;
  /** Cases ouvertes par propagation (indice 0), sans compter la case creusée. */
  cascade: number[];
  cleared: boolean;
  over: boolean;
}

/** Creuse une case : gain × multiplicateur de série, ou perte d'une vie sur un piège. */
export function dig(s: State, i: number, rng: Rng): DigResult {
  const b = s.board, c = b.cells[i];
  const none: DigResult = { type: 'ignored', index: i, kind: 'empty', gained: 0, cascade: [], cleared: false, over: false };
  if (!c || c.open || c.flag || s.over) return none;
  if (!b.placed) place(b, i, rng);
  c.open = true;
  if (isTrap(c.kind)) {
    s.lives--;
    s.combo = 0;
    if (s.lives <= 0) s.over = true;
    return { type: 'trap', index: i, kind: c.kind, gained: 0, cascade: [], cleared: false, over: s.over };
  }
  const base = c.kind === 'empty' ? POINTS.empty : POINTS[c.kind];
  s.combo++;
  s.bestCombo = Math.max(s.bestCombo, s.combo);
  let gained = base * multiplier(s.combo);
  const cascade: number[] = [];
  if (c.n === 0) {
    const q = [i];
    while (q.length) {
      const cur = q.pop()!;
      for (const j of neighbors(cur, b.cols, b.rows)) {
        const d = b.cells[j]!;
        if (d.open || d.flag || isTrap(d.kind)) continue;
        d.open = true;
        cascade.push(j);
        gained += d.kind === 'empty' ? POINTS.empty : POINTS[d.kind];
        if (d.n === 0) q.push(j);
      }
    }
  }
  s.score += gained;
  return { type: 'safe', index: i, kind: c.kind, gained, cascade, cleared: cleared(b), over: false };
}

export function toggleFlag(s: State, i: number): boolean {
  const c = s.board.cells[i];
  if (!c || c.open || s.over) return false;
  c.flag = !c.flag;
  return true;
}

/** Flair : la taupe désigne un piège caché (posé en drapeau). Renvoie l'index, ou -1. */
export function sniff(s: State, rng: Rng): number {
  const b = s.board;
  if (s.sniffs <= 0 || !b.placed || s.over) return -1;
  const hidden = b.cells.map((c, i) => (isTrap(c.kind) && !c.open && !c.flag ? i : -1)).filter((i) => i >= 0);
  if (!hidden.length) return -1;
  const i = hidden[Math.floor(rng() * hidden.length)]!;
  b.cells[i]!.flag = true;
  s.sniffs--;
  return i;
}

/** Manche gagnée : bonus, vie offerte tous les 3 niveaux, grille suivante. Renvoie le bonus. */
export function nextLevel(s: State): number {
  const bonus = 50 * s.lvl + 25 * s.lives;
  s.score += bonus;
  s.lvl++;
  if (s.lvl % 3 === 1 && s.lives < MAX_LIVES) s.lives++;
  s.sniffs = Math.min(3, s.sniffs + 1);
  s.board = newBoard(s.lvl);
  return bonus;
}

