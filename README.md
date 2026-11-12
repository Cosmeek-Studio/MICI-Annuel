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
- Éléments cliquables (décor ou étiquettes) : **mur LED** → trailer, **écrans / pupitres d'équipe** → intervenants, **pupitre central** → résumé de l'édition. `Échap` pour fermer.
- Onglets **EDITION 2023 → 2026** : le plateau s'éteint, change de décor dans le noir, puis les écrans et les lumières se rallument en cascade.
- Deux décors : `classic` (2026, pupitres à moniteur encastré, écrans dessinés en code) et `printed` (2025, façades imprimées sur socle, visuels fournis dans `public/assets/editions/<année>/`).
- Repli automatique sur le rendu statique si WebGL est indisponible.

### Contenus à renseigner
`src/stage/editions.js` : par édition, thème, date, couleurs et intitulés des équipes, intervenants, résumé et `trailer` (URL `.mp4`/`.webm` ou lien d'intégration YouTube/Vimeo), plus `set`, `art` (visuels) et `leds` pour le décor. Les éditions 2025 et 2026 reprennent la DA réelle ; 2023 et 2024 sont provisoires.

## Structure
- `index.html` : sections (hero, concept, cover 2026, expérience, Celltrion, archives filtrables, FAQ, liste d'envoi, footer)
- `src/stage3d.js` : scène three.js (géométrie, lumières, caméra, interactions)
- `src/stage/textures.js` : contenu des écrans dessiné sur canvas (trames, logos, textes)
- `src/stage/editions.js` : données par édition
- `src/style.css` : tokens Figma (couleurs, rayons, typo TT Fors → fallback sans-serif)
- `public/assets/` : images/SVG exportés de Figma

> Police « TT Fors VF Trial » non incluse : à ajouter via `@font-face` (fallback Figtree/Helvetica).
