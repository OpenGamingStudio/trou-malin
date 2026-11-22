# Changelog

## 2.2.0

- Compte OpenGamingStudio facultatif : pseudo + code de récupération (sans e-mail), la progression se sauvegarde toute seule et se retrouve sur tous les appareils ; en cas de conflit, le joueur choisit la sauvegarde à garder. Le jeu reste jouable sans compte (bibliothèque `account.js`, dépôt account-api).

## 2.1.1

- Forme « Carré » corrigée (5x5, elle dessinait une étoile) ; test d'unicité des formes ; le niveau 100 est le grand bloc (48 cases), chaque forme sert.
- Cases toujours >= 44 px : le plateau défile si l'écran est trop petit.
- Échap n'ouvre plus la pause pendant l'animation de fin ; son iOS repris au clic ; perdre pendant le tuto garde l'étape ; plateau sans rôle grid orphelin ; une fois les 100 niveaux finis, l'accueil propose « Choisir un niveau ».

## 2.1.0

- 100 niveaux jouables en 10 mondes de 10 (Prairie, Verger, Potager, Colline, Forêt, Rivière, Falaise, Grotte, Mine, Cœur de terre). 18 formes de grille, de 16 à 48 cases, de plus en plus grandes ; part de pièges de 14 % à 27 %.
- Introduction progressive : bombes seules (monde 1), pièces (niveau 11), pièges à ours (21), gemmes (31), flaques (41). La fiche de niveau annonce chaque nouveauté.
- Fini les niveaux gagnés en un clic : la pose des pièges, faite après le premier coup (toujours sûr), est retentée jusqu'à ce que le niveau demande au moins 3 clics après le premier, davantage pour les grandes grilles (3 + 1 par 12 cases).
- Test automatisé sur les 100 niveaux : depuis chaque case de départ possible et plusieurs tirages, un joueur parfait ne finit jamais un niveau en moins de clics que le minimum exigé.
- Carte des niveaux par mondes : bandeaux de monde, étoiles gagnées par monde, flèches pour passer d'un monde à l'autre, niveaux verrouillés.

## 2.0.1

- Correctif du tuto : activer le bouton Drapeau à l'étape drapeau ne bloque plus l'étape « creuse la case qui brille ». Sur la case ciblée, l'action attendue (creuser ou drapeau) l'emporte sur le mode ; le mode drapeau se désactive après l'étape drapeau.

## 2.0.0

- Carte des niveaux façon jeu de bonbons : chemin sinueux numéroté, niveaux terminés avec étoiles, niveau courant mis en avant, suivants verrouillés, défilement vertical, progression sauvegardée sur l'appareil.
- Un niveau = une grille, 3 vies, des étoiles : 1 = niveau terminé, 2 = au moins 50 % du maximum du niveau, 3 = au moins 75 %. Barre d'objectifs sous le score.
- Grilles en 12 formes (carré, croix, losange, zigzag, étoile, cœur, anneau, grande croix, taupe...) : les cases hors forme n'existent pas, les chiffres comptent les voisines existantes.
- Lisibilité : le chiffre est toujours centré, même taille, même police ; pièce ou gemme = petit badge dans le coin (fond teinté), jamais à la place du chiffre. Couleur du chiffre par valeur.
- Règles dites dans le jeu : pièces (+10) et gemmes (+50) comptent dans le score et les étoiles ; légende « Comment jouer » ; série comptée en cases ouvertes (x2 dès 4, jusqu'à x5).
- Mini tuto pas à pas au niveau 1 (creuser, chiffre, drapeau, trésors, pièges et vies), passable et rejouable.
- Refonte de l'interface : accueil, menu pause, fiche de niveau, écrans de victoire et de défaite, transitions, boutons d'outils.

## 1.1.0

- Palette et taupe « Plein soleil » de Taupe Tycoon 2.6 (même mascotte dans les deux jeux), ombre sous les éléments.
- Icônes d'application propres à Trou Malin (taupe sortant d'un monticule, drapeau).
- Décor en aplats (ciel, soleil, nuages, herbe) ; plateau jusqu'à 560 px sur grand écran.
- Badge de série lisible : « Série 2 », multiplicateur affiché seulement au-dessus de x1.
- Compression gzip (js, css, svg, json) ; CREDITS.md.

## 1.0.0
- Première version : grille de monticules, trésors (pièces, gemmes) et pièges (bombe, piège à ours, flaque).
- Indice de proximité façon démineur, propagation sur les cases à 0, premier coup toujours sûr.
- Série de bons coups (multiplicateur jusqu'à ×5), 3 vies, Flair de la taupe, drapeaux (mode ou appui long).
- Manches de plus en plus grandes (3×3 à 6×6), meilleur score local, sons synthétisés, PWA.
