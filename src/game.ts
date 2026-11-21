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

const SHAPE_LIST: Shape[] = [
  { id: 'carre4', name: 'Carré', rows: ['####', '####', '####', '####'] },
  { id: 'etoile', name: 'Étoile', rows: ['..##..', '.####.', '######', '.####.', '##..##'] },
  { id: 'croix-large', name: 'Grande croix', rows: ['..##..', '..##..', '######', '######', '..##..', '..##..'] },
  { id: 'sablier', name: 'Sablier', rows: ['#####', '.###.', '..#..', '..#..', '.###.', '#####'] },
  { id: 'zigzag', name: 'Zigzag', rows: ['######', '...###', '..###.', '.###..', '######'] },
  { id: 'escalier', name: 'Escalier', rows: ['#.....', '##....', '###...', '####..', '#####.', '######'] },
  { id: 'coeur', name: 'Cœur', rows: ['.##.##', '######', '######', '.####.', '..##..'] },
  { id: 'losange', name: 'Losange', rows: ['..#..', '.###.', '#####', '#####', '#####', '.###.', '..#..'] },
  { id: 'carre5', name: 'Carré', rows: ['#####', '#####', '#####', '#####', '#####'] },
  { id: 'anneau', name: 'Anneau', rows: ['.####.', '######', '##..##', '##..##', '######', '.####.'] },
  { id: 'taupe', name: 'Taupe', rows: ['##..##', '######', '######', '######', '.####.', '..##..'] },
  { id: 'pont', name: 'Pont', rows: ['######', '######', '##..##', '##..##', '######', '######'] },
  { id: 'croix-haute', name: 'Croix haute', rows: ['..##..', '..##..', '######', '######', '######', '######', '..##..', '..##..'] },
  { id: 'fenetre', name: 'Fenêtre', rows: ['######', '#.##.#', '######', '######', '#.##.#', '######'] },
  { id: 'diamant', name: 'Diamant', rows: ['..##..', '.####.', '######', '######', '######', '######', '.####.', '..##..'] },
  { id: 'carre6', name: 'Grand carré', rows: ['######', '######', '######', '######', '######', '######'] },
  { id: 'tour', name: 'Tour', rows: ['######', '######', '######', '######', '######', '######', '######'] },
  { id: 'bloc', name: 'Grand bloc', rows: ['######', '######', '######', '######', '######', '######', '######', '######'] },
];
export const shapeCells = (sh: Shape): number => sh.rows.join('').split('#').length - 1;
/** Formes rangées par nombre de cases croissant : plus le niveau monte, plus la grille est grande. */
export const SHAPES: Shape[] = [...SHAPE_LIST].sort((a, b) => shapeCells(a) - shapeCells(b));

/** 100 niveaux jouables, en 10 mondes de 10. */
export const MAX_LEVEL = 100;
export const WORLD_SIZE = 10;
export const WORLDS = ['Prairie', 'Verger', 'Potager', 'Colline', 'Forêt', 'Rivière', 'Falaise', 'Grotte', 'Mine', 'Cœur de terre'] as const;
export const worldOf = (lvl: number): number => Math.min(WORLDS.length - 1, Math.floor((Math.max(1, lvl) - 1) / WORLD_SIZE));

export interface Level {
  shape: Shape;
  cols: number;
  rows: number;
  /** Nombre de cases de la forme. */
  cells: number;
  traps: number;
  /** Types de pièges présents (introduits un par un). */
  trapKinds: Trap[];
  /** Part de cases sûres portant une pièce (0 = aucune) et part de ces trésors qui sont des gemmes. */
  coinRate: number;
  gemShare: number;
  /** Nombre de clics sûrs qu'il faut faire APRÈS le premier coup pour finir le niveau (au moins 3). */
  minAfter: number;
  /** Nouveauté du niveau (premier niveau où elle apparaît), sinon ''. */
  intro: string;
}

/** Clics (après le premier) qu'un niveau de `cells` cases exige au minimum : 3, puis plus pour les grandes grilles. */
export const minAfterFor = (cells: number): number => 3 + Math.floor(cells / 12);

/** Introductions : monde 1 bombes seules ; 2 pièces ; 3 pièges à ours ; 4 gemmes ; 5 flaques. */
const INTROS: Record<number, string> = {
  1: 'Les bombes', 11: 'Les pièces', 21: 'Les pièges à ours', 31: 'Les gemmes', 41: 'Les flaques',
};

/** Niveau n (1 à 100) : forme de plus en plus grande, part de pièges de 14 % à 27 %, pièges et trésors introduits par monde. */
export function levelSpec(lvl: number): Level {
  const l = Math.min(MAX_LEVEL, Math.max(1, Math.floor(lvl)));
  const n = SHAPES.length;
  // le niveau final est toujours le plus grand bloc ; avant, la forme monte avec un petit décalage pour varier
  const idx = l === MAX_LEVEL ? n - 1 : Math.min(n - 1, Math.floor(((l - 1) * (n - 6)) / (MAX_LEVEL - 1)) + (((l - 1) * 5) % 6));
  const shape = SHAPES[idx]!;
  const cells = shapeCells(shape);
  const ratio = 0.14 + (0.13 * (l - 1)) / (MAX_LEVEL - 1);
  const traps = Math.max(3, Math.min(Math.floor(cells * 0.3), Math.round(cells * ratio)));
  const trapKinds: Trap[] = l > 40 ? ['bomb', 'bear', 'water'] : l > 20 ? ['bomb', 'bear'] : ['bomb'];
  const coinRate = l <= 10 ? 0 : 0.25 + Math.min(0.2, (l - 11) * 0.003);
  const gemShare = l <= 30 ? 0 : 0.15 + Math.min(0.15, (l - 31) * 0.002);
  return { shape, cols: shape.rows[0]!.length, rows: shape.rows.length, cells, traps, trapKinds, coinRate, gemShare, minAfter: minAfterFor(cells), intro: INTROS[l] ?? '' };
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
  trapKinds: Trap[];
  coinRate: number;
  gemShare: number;
  /** Clics sûrs exigés après le premier coup (la pose retente jusqu'à l'obtenir). */
  minAfter: number;
  cells: Cell[];
  placed: boolean;
  /** Valeur de base du niveau : somme des points (sans série) de toutes les cases sûres. Connue dès la pose. */
  base: number;
  /** Score maximum possible sans aucun piège touché (les plus grosses cases à la fin, au plus fort multiplicateur). */
  ideal: number;
}

const blankCell = (gone: boolean): Cell => ({ kind: 'empty', open: false, flag: false, n: 0, gone });

export interface BoardOpts { trapKinds?: Trap[]; coinRate?: number; gemShare?: number; minAfter?: number }

export function boardOf(lvl: number, shape: Shape, traps: number, o: BoardOpts = {}): Board {
  const cols = shape.rows[0]!.length, rows = shape.rows.length;
  const cells = shape.rows.join('').split('').map((ch) => blankCell(ch !== '#'));
  return { lvl, shape, cols, rows, trapCount: traps, trapKinds: o.trapKinds ?? TRAPS, coinRate: o.coinRate ?? 0.4, gemShare: o.gemShare ?? 0.22, minAfter: o.minAfter ?? 0, cells, placed: false, base: 0, ideal: 0 };
}

export function newBoard(lvl: number): Board {
  const s = levelSpec(lvl);
  return boardOf(lvl, s.shape, s.traps, s);
}

const baseOf = (k: Kind): number => (k === 'coin' ? POINTS.coin : k === 'gem' ? POINTS.gem : POINTS.empty);

function countN(b: Board): void {
  for (let i = 0; i < b.cells.length; i++) {
    const c = b.cells[i]!;
    if (c.gone) continue;
    c.n = neighbors(i, b.cols, b.rows, b.cells).filter((j) => isTrap(b.cells[j]!.kind)).length;
  }
}

function finish(b: Board): void {
  countN(b);
  const vals = b.cells.filter((c) => !c.gone && !isTrap(c.kind)).map((c) => baseOf(c.kind)).sort((x, y) => x - y);
  b.base = vals.reduce((a, v) => a + v, 0);
  b.ideal = vals.reduce((a, v, k) => a + v * multiplier(k + 1), 0);
  b.placed = true;
}

/**
 * Nombre minimal de clics pour ouvrir toutes les cases sûres (chiffres `n` à jour, aucun drapeau) :
 * une composante de cases à 0 = 1 clic (la propagation ouvre aussi ses bords), plus chaque case chiffrée sans voisine à 0.
 */
export function clicksToClear(b: Board): number {
  const seen = new Set<number>(), covered = new Set<number>();
  let clicks = 0;
  for (let i = 0; i < b.cells.length; i++) {
    const c = b.cells[i]!;
    if (c.gone || isTrap(c.kind) || c.n !== 0 || seen.has(i)) continue;
    clicks++;
    seen.add(i);
    const q = [i];
    while (q.length) {
      const cur = q.pop()!;
      covered.add(cur);
      for (const j of neighbors(cur, b.cols, b.rows, b.cells)) {
        covered.add(j);
        if (!seen.has(j) && b.cells[j]!.n === 0 && !isTrap(b.cells[j]!.kind)) { seen.add(j); q.push(j); }
      }
    }
  }
  for (let i = 0; i < b.cells.length; i++) {
    const c = b.cells[i]!;
    if (!c.gone && !isTrap(c.kind) && !covered.has(i)) clicks++;
  }
  return clicks;
}

/**
 * Pose pièges et trésors après le premier coup de pelle : la case creusée et ses voisines sont toujours sûres.
 * La disposition est retentée (pièges déplacés un à un) jusqu'à ce que le niveau exige au moins `minAfter` clics après le premier :
 * aucune grande cascade ne finit le niveau d'un coup.
 */
export function place(b: Board, first: number, rng: Rng): void {
  const live = b.cells.map((_, i) => i).filter((i) => !b.cells[i]!.gone);
  const safe = new Set([first, ...neighbors(first, b.cols, b.rows, b.cells)]);
  let pool = live.filter((i) => !safe.has(i));
  if (pool.length < b.trapCount) pool = live.filter((i) => i !== first);
  const shuffle = <T,>(a: T[]) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j]!, a[i]!]; } return a; };
  shuffle(pool);
  const count = Math.min(b.trapCount, pool.length);
  const kinds = b.trapKinds.length ? b.trapKinds : TRAPS;
  const at = pool.slice(0, count), free = pool.slice(count);
  const mark = () => { for (const i of pool) b.cells[i]!.kind = 'empty'; at.forEach((i, k) => { b.cells[i]!.kind = kinds[k % kinds.length]!; }); countN(b); };
  mark();
  let best = clicksToClear(b), bestAt = at.slice();
  const want = b.minAfter + 1;
  for (let step = 0; step < 600 && best < want && free.length; step++) {
    const k = Math.floor(rng() * at.length), f = Math.floor(rng() * free.length);
    [at[k], free[f]] = [free[f]!, at[k]!];
    mark();
    const c = clicksToClear(b);
    if (c >= best) { best = c; bestAt = at.slice(); } else { [at[k], free[f]] = [free[f]!, at[k]!]; }
  }
  at.splice(0, at.length, ...bestAt);
  mark();
  shuffle(at).forEach((i, k) => { b.cells[i]!.kind = kinds[k % kinds.length]!; });
  for (const i of live) {
    const c = b.cells[i]!;
    if (c.kind === 'empty' && b.coinRate > 0 && rng() < b.coinRate) c.kind = rng() < b.gemShare ? 'gem' : 'coin';
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
