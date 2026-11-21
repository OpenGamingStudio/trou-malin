import { MAX_LEVEL } from './game';

export const PROGRESS_KEY = 'trou-malin-progress';
export const OPTS_KEY = 'trou-malin-opts';

export interface LevelRec { stars: number; score: number }
export interface Progress { levels: Record<number, LevelRec>; tuto: boolean }
export interface Options { sound: boolean }

const int = (v: unknown, max: number): number => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(max, Math.floor(v))) : 0);

/** Lecture défensive : toute valeur inattendue (JSON cassé, types faux, niveau hors bornes) est ignorée. */
export function parseProgress(raw: string | null): Progress {
  const out: Progress = { levels: {}, tuto: false };
  try {
    const o = JSON.parse(raw ?? '{}') as { levels?: unknown; tuto?: unknown };
    out.tuto = o.tuto === true;
    if (o.levels && typeof o.levels === 'object') {
      for (const [k, v] of Object.entries(o.levels as Record<string, unknown>)) {
        const lvl = Number(k);
        if (!Number.isInteger(lvl) || lvl < 1 || lvl > MAX_LEVEL || !v || typeof v !== 'object') continue;
        const r = v as { stars?: unknown; score?: unknown };
        const stars = int(r.stars, 3);
        if (stars < 1) continue;
        out.levels[lvl] = { stars, score: int(r.score, 1e12) };
      }
    }
  } catch { /* JSON cassé : progression vide */ }
  return out;
}
export function parseOpts(raw: string | null): Options {
  try { return { sound: (JSON.parse(raw ?? '{}') as { sound?: unknown }).sound !== false }; } catch { return { sound: true }; }
}

/** Premier niveau non terminé (les niveaux se débloquent dans l'ordre) ; 1 à MAX_LEVEL. */
export function unlocked(p: Progress): number {
  let n = 1;
  while (p.levels[n] && n < MAX_LEVEL) n++;
  return n;
}
/** Les 100 niveaux sont tous terminés. */
export const levelsDone = (p: Progress): boolean => !!p.levels[MAX_LEVEL];
export const totalStars = (p: Progress): number => Object.values(p.levels).reduce((a, r) => a + r.stars, 0);

/** Enregistre un niveau gagné en gardant le meilleur (étoiles et score). Renvoie si les étoiles progressent. */
export function mergeLevel(p: Progress, lvl: number, stars: number, score: number): { better: boolean; first: boolean } {
  const prev = p.levels[lvl];
  p.levels[lvl] = { stars: Math.max(prev?.stars ?? 0, stars), score: Math.max(prev?.score ?? 0, score) };
  return { better: !prev || stars > prev.stars, first: !prev };
}

export const loadProgress = (): Progress => { try { return parseProgress(localStorage.getItem(PROGRESS_KEY)); } catch { return parseProgress(null); } };
export const loadOpts = (): Options => { try { return parseOpts(localStorage.getItem(OPTS_KEY)); } catch { return parseOpts(null); } };
export function saveProgress(p: Progress) { try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)); } catch { /* stockage plein ou bloqué */ } }
export function saveOpts(o: Options) { try { localStorage.setItem(OPTS_KEY, JSON.stringify(o)); } catch { /* idem */ } }
