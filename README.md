# MICI Annuel

Maquette web du MICI Challenge (Figma « MICI Annuelle », nœud `2121:30`).
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
- Éléments cliquables (décor ou étiquettes) : **mur LED** → teaser, **écrans / pupitres d'équipe** → intervenants, **pupitre central** → résumé de l'édition. `Échap` pour fermer.
- Onglets **EDITION 2022 → 2026** : le plateau s'éteint, change de décor dans le noir, puis les écrans et les lumières se rallument en cascade.
- Deux décors : `classic` (2026, pupitres à moniteur encastré, écrans dessinés en code) et `printed` (2025, façades imprimées sur socle, visuels fournis dans `public/assets/editions/<année>/`).
- Repli automatique sur le rendu statique si WebGL est indisponible.
- Performances : three.js est chargé dans un fichier séparé, après la page. Le plateau n'est redessiné que lorsqu'il change (caméra, survol, transition) ; au repos, seul le grain de l'image est animé. Les ombres sont calculées une fois par décor, et les visuels d'une édition ne sont téléchargés qu'à son affichage (préchargés au survol de son onglet). Visuels d'écran : inutile de dépasser 1024 × 576 px pour les télés et moniteurs, 2048 px de large pour le mur et les façades.

### Contenus à renseigner
`src/stage/editions.js` : par édition, thème, date, couleurs et intitulés des équipes, intervenants, résumé et `teaser` (URL `.mp4`/`.webm` ou lien d'intégration YouTube/Vimeo), plus `set`, `art` (visuels) et `leds` pour le décor. Les éditions 2025 et 2026 reprennent la DA réelle ; 2022 à 2024 sont provisoires.

## Structure
- `index.html` : sections (hero, concept, cover 2026, expérience, Celltrion, archives filtrables, FAQ, liste d'envoi, footer)
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

> Police « TT Fors VF Trial » non incluse : à ajouter via `@font-face` (fallback Figtree/Helvetica).
