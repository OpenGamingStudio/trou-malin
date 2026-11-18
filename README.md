# Trou Malin

Une taupe doit creuser au **bon endroit**. Chaque monticule cache un trésor (pièce, gemme), rien du tout, ou un **piège** (bombe, piège à ours, flaque). Le chiffre d'une case creusée indique combien de pièges se trouvent dans les 8 cases voisines, comme au démineur.

Jouable dans le navigateur, au doigt ou à la souris : <https://trou-malin.opengamingstudio.com>

## Règles
- Touche un monticule pour creuser. Le premier coup est toujours sûr.
- Un piège coûte une vie (3 au départ) et casse la série. Une vie de plus tous les 3 niveaux.
- Les bons coups d'affilée font monter le multiplicateur de série (jusqu'à ×5).
- Ouvre toutes les cases sûres pour réussir la manche : la grille suivante est plus grande et plus piégée.
- **Drapeau** : bouton « Drapeau » ou appui long (clic droit) pour marquer un piège supposé.
- **Flair** : la taupe désigne un piège caché (une charge au départ, une de plus par manche, 3 au plus).
- Le meilleur score est gardé dans le navigateur (`localStorage`).

## Développement
```
npm ci
npm run dev        # serveur de développement
npm test           # tests (vitest)
npm run build      # tsc + vite build -> dist/
```
Vite, TypeScript, Tailwind. Direction artistique reprise de [Taupe Tycoon](https://github.com/OpenGamingStudio/taupe-tycoon) : aplats, contours encre épais avec ombre portée, police Fredoka auto-hébergée, aucun dégradé. Les sons sont synthétisés (Web Audio), les images sont des SVG dessinés dans `src/art.ts`.

Déploiement : `Dockerfile` (build Node, puis nginx sur le port 80). `index.html` et `sw.js` sont servis en `no-cache`.

## Licence
MIT, voir `LICENSE`.
