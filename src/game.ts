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
  /** Nombre de pièges parmi les voisines EXISTANTES (jusqu'à 8). */
  n: number;
  /** Case absente de la forme du niveau : ni affichée, ni voisine, ni jouable. */
  gone: boolean;
}

export interface Shape {
  id: string;
  name: string;
  /** '#' = case, '.' = vide. Toutes les lignes ont la même largeur (6 au plus : cibles de 44 px à 320 px). */
  rows: string[];
}

export const SHAPES: Shape[] = [
  { id: 'carre3', name: 'Carré', rows: ['###', '###', '###'] },
  { id: 'croix', name: 'Croix', rows: ['..#..', '..#..', '#####', '..#..', '..#..'] },
  { id: 'losange', name: 'Losange', rows: ['..#..', '.###.', '#####', '.###.', '..#..'] },
  { id: 'carre4', name: 'Carré', rows: ['####', '####', '####', '####'] },
  { id: 'zigzag', name: 'Zigzag', rows: ['######', '...###', '..###.', '.###..', '######'] },
  { id: 'etoile', name: 'Étoile', rows: ['..#..', '.###.', '#####', '.###.', '##.##'] },
  { id: 'coeur', name: 'Cœur', rows: ['.##.##', '######', '######', '.####.', '..##..'] },
  { id: 'anneau', name: 'Anneau', rows: ['.####.', '######', '##..##', '##..##', '######', '.####.'] },
  { id: 'croix-large', name: 'Grande croix', rows: ['..##..', '..##..', '######', '######', '..##..', '..##..'] },
  { id: 'taupe', name: 'Taupe', rows: ['##..##', '######', '######', '######', '.####.', '..##..'] },
  { id: 'carre5', name: 'Carré', rows: ['#####', '#####', '#####', '#####', '#####'] },
  { id: 'carre6', name: 'Grand carré', rows: ['######', '######', '######', '######', '######', '######'] },
];

export const MAX_LEVEL = 999;
export const shapeCells = (sh: Shape): number => sh.rows.join('').split('#').length - 1;

export interface Level {
  shape: Shape;
  cols: number;
  rows: number;
  /** Nombre de cases de la forme. */
  cells: number;
  traps: number;
}

/** Niveau n : la forme tourne sur 12 modèles, la part de pièges monte de 12 % à 28 % (plafond atteint au niveau 14). */
export function levelSpec(lvl: number): Level {
  const l = Math.min(MAX_LEVEL, Math.max(1, Math.floor(lvl)));
  const shape = SHAPES[(l - 1) % SHAPES.length]!;
  const cells = shapeCells(shape);
  const ratio = Math.min(0.28, 0.12 + 0.012 * l);
  const traps = Math.max(1, Math.min(cells - 4, Math.floor(cells * 0.3), Math.round(cells * ratio)));
  return { shape, cols: shape.rows[0]!.length, rows: shape.rows.length, cells, traps };
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

/** Voisines existantes (8 au plus) : les cases absentes de la forme (`gone`) ne comptent pas. */
export function neighbors(i: number, cols: number, rows: number, cells?: { gone: boolean }[]): number[] {
  const x = i % cols, y = Math.floor(i / cols), out: number[] = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (!dx && !dy) continue;
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
    const j = ny * cols + nx;
    if (cells && cells[j]!.gone) continue;
    out.push(j);
  }
  return out;
}

/** Série = cases sûres ouvertes d'affilée (propagation comprise) : x1, x2 dès 4, x3 dès 8, x4 dès 12, x5 dès 16. */
export function multiplier(combo: number): number {
  return Math.min(5, 1 + Math.floor(combo / 4));
}

export interface Board {
  lvl: number;
  shape: Shape;
  cols: number;
  rows: number;
  trapCount: number;
  cells: Cell[];
  placed: boolean;
  /** Valeur de base du niveau : somme des points (sans série) de toutes les cases sûres. Connue dès la pose. */
  base: number;
  /** Score maximum possible sans aucun piège touché (les plus grosses cases à la fin, au plus fort multiplicateur). */
  ideal: number;
}

const blankCell = (gone: boolean): Cell => ({ kind: 'empty', open: false, flag: false, n: 0, gone });

export function boardOf(lvl: number, shape: Shape, traps: number): Board {
  const cols = shape.rows[0]!.length, rows = shape.rows.length;
  const cells = shape.rows.join('').split('').map((ch) => blankCell(ch !== '#'));
  return { lvl, shape, cols, rows, trapCount: traps, cells, placed: false, base: 0, ideal: 0 };
}

export function newBoard(lvl: number): Board {
  const s = levelSpec(lvl);
  return boardOf(lvl, s.shape, s.traps);
}

const baseOf = (k: Kind): number => (k === 'coin' ? POINTS.coin : k === 'gem' ? POINTS.gem : POINTS.empty);

function finish(b: Board): void {
  for (let i = 0; i < b.cells.length; i++) {
    const c = b.cells[i]!;
    if (c.gone) continue;
    c.n = neighbors(i, b.cols, b.rows, b.cells).filter((j) => TRAPS.includes(b.cells[j]!.kind as Trap)).length;
  }
  const vals = b.cells.filter((c) => !c.gone && !isTrap(c.kind)).map((c) => baseOf(c.kind)).sort((x, y) => x - y);
  b.base = vals.reduce((a, v) => a + v, 0);
  b.ideal = vals.reduce((a, v, k) => a + v * multiplier(k + 1), 0);
  b.placed = true;
}

/** Pose pièges et trésors après le premier coup de pelle : la case creusée et ses voisines sont toujours sûres. */
export function place(b: Board, first: number, rng: Rng): void {
  const live = b.cells.map((_, i) => i).filter((i) => !b.cells[i]!.gone);
  const safe = new Set([first, ...neighbors(first, b.cols, b.rows, b.cells)]);
  let pool = live.filter((i) => !safe.has(i));
  if (pool.length < b.trapCount) pool = live.filter((i) => i !== first);
  const shuffle = <T,>(a: T[]) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j]!, a[i]!]; } return a; };
  shuffle(pool);
  const traps = Math.min(b.trapCount, pool.length);
  for (let k = 0; k < traps; k++) b.cells[pool[k]!]!.kind = TRAPS[Math.floor(rng() * TRAPS.length)]!;
  for (const i of live) {
    const c = b.cells[i]!;
    if (c.kind === 'empty' && rng() < 0.4) c.kind = rng() < 0.22 ? 'gem' : 'coin';
  }
  finish(b);
}

/** Plateau du tuto : carré 4x4 fixe (pièges en 6 et 13, pièce en 11, gemme en 15). */
export const TUTO = { first: 0, read: 5, flag: 6, coin: 11, gem: 15, trap2: 13 } as const;
export function tutoBoard(): Board {
  const b = boardOf(0, { id: 'tuto', name: 'Tuto', rows: ['####', '####', '####', '####'] }, 2);
  b.cells[TUTO.flag]!.kind = 'bomb';
  b.cells[TUTO.trap2]!.kind = 'bear';
  b.cells[TUTO.coin]!.kind = 'coin';
  b.cells[TUTO.gem]!.kind = 'gem';
  finish(b);
  return b;
}

export function isTrap(k: Kind): k is Trap { return k === 'bomb' || k === 'bear' || k === 'water'; }
export const safeLeft = (b: Board) => b.cells.filter((c) => !c.gone && !isTrap(c.kind) && !c.open).length;
export const cleared = (b: Board) => b.placed && safeLeft(b) === 0;

/** Étoiles : 1 = niveau terminé ; 2 = score >= 50 % du maximum du niveau ; 3 = score >= 75 % du maximum. */
export const STAR2 = 0.5;
export const STAR3 = 0.75;
export const starTargets = (b: Board) => ({ two: Math.ceil(b.ideal * STAR2), three: Math.ceil(b.ideal * STAR3) });
export function starsFor(score: number, b: Board): number {
  if (!cleared(b)) return 0;
  const t = starTargets(b);
  return score >= t.three ? 3 : score >= t.two ? 2 : 1;
}

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

/** Un niveau = 3 vies, score à zéro, un Flair (deux dès le niveau 10, trois dès le 20). */
export function newLevel(lvl: number): State {
  const l = Math.min(MAX_LEVEL, Math.max(1, Math.floor(lvl)));
  return { lvl: l, lives: START_LIVES, score: 0, combo: 0, bestCombo: 0, sniffs: Math.min(3, 1 + Math.floor(l / 10)), board: newBoard(l), over: false };
}
export function newTuto(): State {
  return { lvl: 0, lives: START_LIVES, score: 0, combo: 0, bestCombo: 0, sniffs: 1, board: tutoBoard(), over: false };
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

/** Creuse une case : points de la case ET de la propagation, chaque case fois le multiplicateur de série à son ouverture, ou perte d'une vie sur un piège. */
export function dig(s: State, i: number, rng: Rng): DigResult {
  const b = s.board, c = b.cells[i];
  const none: DigResult = { type: 'ignored', index: i, kind: 'empty', gained: 0, cascade: [], cleared: false, over: false };
  if (!c || c.gone || c.open || c.flag || s.over) return none;
  if (!b.placed) place(b, i, rng);
  c.open = true;
  if (isTrap(c.kind)) {
    s.lives--;
    s.combo = 0;
    if (s.lives <= 0) s.over = true;
    return { type: 'trap', index: i, kind: c.kind, gained: 0, cascade: [], cleared: false, over: s.over };
  }
  let gained = 0;
  const take = (k: Kind) => { s.combo++; s.bestCombo = Math.max(s.bestCombo, s.combo); gained += baseOf(k) * multiplier(s.combo); };
  take(c.kind);
  const cascade: number[] = [];
  if (c.n === 0) {
    const q = [i];
    while (q.length) {
      const cur = q.pop()!;
      for (const j of neighbors(cur, b.cols, b.rows, b.cells)) {
        const d = b.cells[j]!;
        if (d.open || d.flag || isTrap(d.kind)) continue;
        d.open = true;
        cascade.push(j);
        take(d.kind);
        if (d.n === 0) q.push(j);
      }
    }
  }
  s.score += gained;
  return { type: 'safe', index: i, kind: c.kind, gained, cascade, cleared: cleared(b), over: false };
}

export function toggleFlag(s: State, i: number): boolean {
  const c = s.board.cells[i];
  if (!c || c.gone || c.open || s.over) return false;
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
