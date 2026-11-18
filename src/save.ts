export const BEST_KEY = 'trou-malin-best';
export const OPTS_KEY = 'trou-malin-opts';

export interface Best { score: number; lvl: number; combo: number }
export interface Options { sound: boolean }

const int = (v: unknown, max = 1e12): number => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(max, Math.floor(v))) : 0);

/** Lecture défensive : toute valeur inattendue (JSON cassé, types faux) retombe sur zéro. */
export function parseBest(raw: string | null): Best {
  try {
    const o = JSON.parse(raw ?? '{}') as Record<string, unknown>;
    return { score: int(o.score), lvl: int(o.lvl, 9999), combo: int(o.combo, 99999) };
  } catch { return { score: 0, lvl: 0, combo: 0 }; }
}
export function parseOpts(raw: string | null): Options {
  try { return { sound: (JSON.parse(raw ?? '{}') as { sound?: unknown }).sound !== false }; } catch { return { sound: true }; }
}

export const loadBest = (): Best => { try { return parseBest(localStorage.getItem(BEST_KEY)); } catch { return parseBest(null); } };
export const loadOpts = (): Options => { try { return parseOpts(localStorage.getItem(OPTS_KEY)); } catch { return parseOpts(null); } };
export function saveBest(b: Best) { try { localStorage.setItem(BEST_KEY, JSON.stringify(b)); } catch { /* stockage plein ou bloqué */ } }
export function saveOpts(o: Options) { try { localStorage.setItem(OPTS_KEY, JSON.stringify(o)); } catch { /* idem */ } }

/** Fusionne une partie terminée dans le meilleur : renvoie le nouveau meilleur et si le score est un record. */
export function mergeBest(prev: Best, score: number, lvl: number, combo: number): { best: Best; record: boolean } {
  return { best: { score: Math.max(prev.score, score), lvl: Math.max(prev.lvl, lvl), combo: Math.max(prev.combo, combo) }, record: score > prev.score };
}
