import { TUTO, POINTS } from './game';
import { RULE } from './rules';

export interface Step {
  text: string;
  /** Case à toucher (mise en avant) ; sans case, l'étape se valide avec « Compris ». */
  cell?: number;
  act: 'dig' | 'flag' | 'ok' | 'free';
}

/** Mini tuto du niveau 1, pas à pas sur un plateau fixe (4x4, pièges en 6 et 13, pièce en 11, gemme en 15). */
export const STEPS: Step[] = [
  { text: 'Touche le monticule qui brille pour le creuser.', cell: TUTO.first, act: 'dig' },
  { text: 'Voilà un chiffre ! Il compte les pièges cachés dans les cases voisines. Ce 1 : un piège tout près.', cell: TUTO.read, act: 'ok' },
  { text: 'Un piège est sûr ? Pose un drapeau : appui long, ou bouton Drapeau puis touche. Essaie sur la case qui brille.', cell: TUTO.flag, act: 'flag' },
  { text: `Une pièce ! +${POINTS.coin} points, qui comptent dans ton score et tes étoiles. Creuse la case qui brille.`, cell: TUTO.coin, act: 'dig' },
  { text: `Et une gemme, +${POINTS.gem} points ! Le chiffre reste au centre, le trésor est le petit badge du coin. Creuse-la.`, cell: TUTO.gem, act: 'dig' },
  { text: RULE.traps + ' Le Flair de la taupe peut t\'en montrer un.', act: 'ok' },
  { text: 'À toi ! Creuse toutes les cases sans piège pour finir.', act: 'free' },
];
