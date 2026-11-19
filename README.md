# Trou Malin

Une taupe doit creuser au **bon endroit**. Chaque monticule cache un trésor (pièce, gemme), rien du tout, ou un **piège** (bombe, piège à ours, flaque). Le chiffre d'une case creusée indique combien de pièges se trouvent dans les 8 cases voisines, comme au démineur.

Jouable dans le navigateur, au doigt ou à la souris : <https://trou-malin.opengamingstudio.com>

## Règles
- **Carte des niveaux** : un chemin sinueux de niveaux numérotés, étoiles gagnées, niveau suivant verrouillé tant que le précédent n'est pas réussi. Progression gardée dans le navigateur (`localStorage`).
- **Formes variées** : cœur, étoile, croix, losange, anneau, zigzag, taupe… Les cases absentes ne comptent pas : un chiffre compte les pièges des voisines existantes.
- Touche un monticule pour creuser. Le premier coup est toujours sûr. Le chiffre indique les pièges voisins (jusqu'à 8).
- Un piège coûte une vie (3 par niveau) et casse la série.
- **Points** : case vide 2, pièce 10, gemme 50, multipliés par la série (×2 dès 4 cases sûres d'affilée, ×3 dès 8, ×4 dès 12, ×5 dès 16).
- **Étoiles** : 1 = niveau réussi, 2 = au moins 50 % du score idéal, 3 = au moins 75 %.
- **Drapeau** : bouton « Drapeau » ou appui long (clic droit). **Flair** : la taupe désigne un piège caché.
- **Mini tuto** pas à pas au niveau 1 (passable), rejouable depuis le menu.

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
