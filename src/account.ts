import { parseProgress, totalStars, type Progress } from './save';

/** Ce qui part sur le compte : la progression seulement (le son reste un réglage de l'appareil). */
export const toState = (p: Progress): { progress: Progress } => ({ progress: p });
/** Lecture défensive d'une sauvegarde venue du serveur : tout ce qui est inattendu est ignoré. */
export const fromState = (s: unknown): Progress => parseProgress(JSON.stringify((s as { progress?: unknown } | null)?.progress ?? {}));
export const isEmptyState = (s: unknown): boolean => { const p = fromState(s); return Object.keys(p.levels).length === 0 && !p.tuto; };
export function describeState(s: unknown): string {
  const p = fromState(s), n = Object.keys(p.levels).length;
  return n === 0 ? 'Aucun niveau terminé' : `${n} niveau${n > 1 ? 'x' : ''} terminé${n > 1 ? 's' : ''}, ${totalStars(p)} étoile${totalStars(p) > 1 ? 's' : ''}`;
}
