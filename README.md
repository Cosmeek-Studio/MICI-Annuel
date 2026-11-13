# MICI Annuel

Maquette web du MICI Challenge (Figma « MICI Annuelle », page de référence : nœud `2148:2`).
Le hero est un **rendu 3D interactif du plateau** (three.js, scène procédurale inspirée du rendu de référence).

## Lancer

```bash
npm install
npm run dev     # développement
npm run build   # production -> dist/
```

## Hero 3D
Reproduction du plateau réel (mur LED, pupitres d'équipe, pupitre central, écrans sur pied, portiques et cadres LED, caméras PTZ), entièrement procédurale en three.js : aucun fichier 3D à charger.
- La caméra suit légèrement le curseur (pas d'orbite).
- Éléments cliquables (décor ou étiquettes) : **mur LED** → best-of (« VOIR LE BEST-OF »), **écrans / pupitres d'équipe** → intervenants, **pupitre central** → résumé de l'édition. `Échap` pour fermer.
- Onglets **EDITION 2022 → 2026** : le plateau s'éteint, change de décor dans le noir, puis les écrans et les lumières se rallument en cascade.
- Deux décors : `classic` (2026, pupitres à moniteur encastré, écrans dessinés en code) et `printed` (2025, façades imprimées sur socle, visuels fournis dans `public/assets/editions/<année>/`).
- Repli automatique sur le rendu statique si WebGL est indisponible.
- Performances : three.js est chargé dans un fichier séparé, après la page. Le plateau n'est redessiné que lorsqu'il change (caméra, survol, transition) ; au repos, seul le grain de l'image est animé. Les ombres sont calculées une fois par décor, et les visuels d'une édition ne sont téléchargés qu'à son affichage (préchargés au survol de son onglet). Visuels d'écran : inutile de dépasser 1024 × 576 px pour les télés et moniteurs, 2048 px de large pour le mur et les façades.

### Contenus à renseigner
`src/stage/editions.js` : par édition, thème, date, couleurs et intitulés des équipes, intervenants, résumé, `debates` (facultatif : liste `{ q, a }` affichée sous le résumé en « Rappel des débats », question et conclusion) et `teaser` (vidéo du best-of : URL `.mp4`/`.webm` ou lien d'intégration YouTube/Vimeo), plus `set`, `art` (visuels) et `leds` pour le décor. Les éditions 2025 et 2026 reprennent la DA réelle ; 2022 à 2024 sont provisoires.

Intervenants : `{ name, role, city?, photo? }`. Quand tous les intervenants d’une équipe ont un `photo` (chemin sous `public/assets/`), le panneau affiche les portraits légendés de la maquette (4 de front sur desktop, 2 sur mobile) ; sinon, une liste à initiales. L’édition 2026 a ses équipes réelles (#1.1 : Vuitton, Laharie, Boschetti, Buisson ; #2.2 : Bouhnik, Roblin, Fumery, Nachury), portraits dans `public/assets/editions/2026/speakers/` (nœud Figma `2151:1218`).

## Structure
- `index.html` : sections (hero, concept, cover 2026, expérience, Celltrion, prochaine édition / liste d’envoi `#inscription`, archives filtrables, FAQ, footer)
- `src/stage3d.js` : scène three.js (géométrie, lumières, caméra, interactions)
- `src/stage/textures.js` : contenu des écrans dessiné sur canvas (trames, logos, textes)
- `src/stage/editions.js` : données par édition
- `src/slider.js` : carrousel des cartes de la galerie (voir ci-dessous)
- `src/style.css` : tokens Figma (couleurs, rayons, typo TT Fors → fallback sans-serif)
- `public/assets/` : images/SVG exportés de Figma

## Galerie
Filtres par `data-type` (`edition`, `speaker`, `photo`, combinables), cartes redistribuées dans les colonnes au filtrage (`src/main.js`, section « Galerie »).
Carte à plusieurs images : remplacer l'image du `.media` par un carrousel, l'indicateur `.dots` est généré automatiquement.

```html
<figure class="media media--sq slider" data-slider aria-label="Photos de l’édition 2025">
  <div class="slider__track">
    <img src="/assets/xxx.webp" alt="" loading="lazy" />
    <img src="/assets/yyy.webp" alt="" loading="lazy" />
  </div>
</figure>
```
Glisser (doigt ou souris), flèches ←/→ et Début/Fin au clavier, clic sur un point ; transition coupée si `prefers-reduced-motion`.

Carrousels en place : « Retour en image sur le MICI Challenge 2023 » (`retour-2023-1…4.webp`, nœud Figma `2151:1180`) et « Retour en image sur l’édition 2025 » (`retour-2025-1…6.webp`, nœud `2151:1188`).

Formats d’image des cartes : `.media--sm` (340 × 272), `.media--mid` (340 × 249), `.media--wide` (340 × 191), `.media--sq`, `.media--tall` (340 × 425).

> Police « TT Fors VF Trial » non incluse : à ajouter via `@font-face` (fallback Figtree/Helvetica).
