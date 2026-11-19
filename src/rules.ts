import { POINTS, START_LIVES, STAR2, STAR3 } from './game';

const pc = (x: number) => `${Math.round(x * 100)} %`;

/** Règles affichées dans le jeu (tuto, légende, fiche de niveau) : construites depuis les constantes réelles du moteur. */
export const RULE = {
  dig: 'Touche un monticule pour le creuser.',
  number: 'Le chiffre d\'une case creusée compte les pièges cachés dans les cases voisines (8 au plus ; les cases hors de la forme ne comptent pas).',
  flag: 'Drapeau : appui long sur un monticule (ou bouton Drapeau puis touche) pour marquer un piège suspect.',
  traps: `Bombe, piège à ours ou flaque : −1 vie. Tu as ${START_LIVES} vies par niveau ; à zéro, le niveau est perdu.`,
  points: `Case vide : +${POINTS.empty} points. Pièce : +${POINTS.coin}. Gemme : +${POINTS.gem}.`,
  loot: 'Pièces et gemmes sont des points en plus : elles comptent dans le score du niveau, donc dans tes étoiles. Un petit badge dans le coin de la case les montre, le chiffre ne bouge jamais.',
  series: 'Série : chaque case sûre ouverte d\'affilée (propagation comprise) fait monter le multiplicateur : ×2 dès 4 cases, ×3 dès 8, ×4 dès 12, ×5 dès 16. Un piège le remet à ×1. Il s\'applique à tous les points, trésors compris.',
  stars: `Étoiles : 1 étoile = niveau terminé. 2 étoiles = score d'au moins ${pc(STAR2)} du maximum du niveau. 3 étoiles = au moins ${pc(STAR3)}. Le maximum est le score d'un niveau sans piège, série au plus haut ; les objectifs en points s'affichent sous le score.`,
  flair: 'Flair : la taupe flaire un piège caché et pose un drapeau dessus (1 par niveau, 2 dès le niveau 10, 3 dès le niveau 20).',
} as const;
