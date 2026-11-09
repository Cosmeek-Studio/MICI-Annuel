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
- Glisser pour orbiter, molette pour zoomer, parallaxe douce au survol ; dérive lente au repos.
- Onglets **EDITION 2023 → 2026** : changent l'univers (écrans, lumières, logo).
- Hotspots : **Lancer le teaser** (zoom sur l'écran central, `Échap` pour fermer), **Découvrir l'univers**, **Résumé du débat** (défilement vers les sections).
- Repli automatique sur le rendu statique si WebGL est indisponible.

## Structure
- `index.html` : sections (hero, concept, cover 2026, expérience, Celltrion, archives filtrables, FAQ, liste d'envoi, footer)
- `src/stage3d.js` : scène three.js
- `src/style.css` : tokens Figma (couleurs, rayons, typo TT Fors → fallback sans-serif)
- `public/assets/` : images/SVG exportés de Figma

> Police « TT Fors VF Trial » non incluse : à ajouter via `@font-face` (fallback Figtree/Helvetica).
