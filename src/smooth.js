// Défilement doux (Lenis), réglé léger : la molette glisse un peu, sans effet de « flottement ».
// Désactivé si l'utilisateur préfère réduire les animations ; le tactile garde le défilement natif.
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

export const lenis = matchMedia('(prefers-reduced-motion: reduce)').matches
  ? null
  : new Lenis({ lerp: 0.12, autoRaf: true }); // lerp : 0,1 = défaut Lenis ; plus haut = plus direct

// La hauteur de page bouge après le premier rendu (polices, images) : on la remesure une fois tout chargé.
if (lenis) addEventListener('load', () => lenis.resize());

// Liens internes (#ancre) : animés par Lenis, en respectant scroll-margin / scroll-padding.
// Le saut natif est bloqué pour ne pas contrarier l'animation ; l'URL garde l'ancre.
if (lenis) {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const target = a.hash.length > 1 && document.getElementById(decodeURIComponent(a.hash.slice(1)));
    if (!target) return;
    e.preventDefault();
    lenis.resize(); // hauteur de page à jour (polices, images, galerie filtrée) avant de viser la cible
    lenis.scrollTo(target);
    history.pushState(null, '', a.hash);
  });
}

export function scrollToTop() {
  if (lenis) lenis.scrollTo(0);
  else window.scrollTo({ top: 0, behavior: 'smooth' });
}
