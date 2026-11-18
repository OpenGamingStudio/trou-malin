const SUFFIX = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

/** Entier avec espace fine insécable (U+00A0) entre les milliers (1 200). */
function group(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
}

/**
 * Nombre entier lisible, jamais de virgule : 842, 1 200, 12K, 1 900K, 12M…
 * Moins de 10 000 : entier complet ; ensuite abrégé (K, M, B…) au plus grand palier qui garde au moins 2 chiffres.
 * L'arrondi est le plus proche.
 */
export function fmt(n: number, _lang: string = 'fr'): string {
  if (Number.isNaN(n)) return '0';
  if (!isFinite(n)) return n < 0 ? '-∞' : '∞';
  if (n < 0) return '-' + fmt(-n);
  const r = Math.round(n);
  if (r < 10000) return group(r);
  let tier = Math.min(Math.floor(Math.log10(r) / 3), SUFFIX.length - 1);
  if (tier > 0 && r / Math.pow(1000, tier) < 10) tier--;
  const coef = Math.floor(r / Math.pow(1000, tier));
  if (coef >= 1e12) return group(999999999999) + SUFFIX[tier] + '+'; // au-delà : plafond d'affichage, jamais de notation scientifique
  return group(coef) + SUFFIX[tier];
}

/** Pourcentage de bonus, entier : +25 % (fr) / +25% (en). */
export function fmtPct(p: number, lang: string = 'fr'): string {
  return '+' + fmt(Math.round(p)) + (lang === 'fr' ? ' %' : '%');
}

export function fmtDuration(sec: number, lang: string = 'fr'): string {
  const s = Math.round(sec);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  const hh = lang === 'fr' ? ' h ' : 'h ';
  if (h > 0) return `${h}${hh}${m} min`;
  if (m > 0) return `${m} min ${s % 60} s`;
  return `${s} s`;
}
