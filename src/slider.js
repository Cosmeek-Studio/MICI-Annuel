/* ---------- Carrousel des cartes de la galerie ----------
   Balisage attendu (une carte = un .media) :
   <figure class="media media--sq slider" data-slider aria-label="…">
     <div class="slider__track"><img …><img …>…</div>
   </figure>
   L'indicateur .dots est généré ici (point actif en barre). Glisser au doigt ou à la souris,
   flèches ←/→, Début/Fin au clavier, clic sur un point. Le carrousel vit dans la carte :
   la redistribution des colonnes au filtrage déplace l'élément sans le recréer, l'état est conservé. */

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function initSlider(root) {
  const track = root.querySelector('.slider__track');
  const slides = track ? [...track.children] : [];
  if (slides.length < 2) return null;
  const n = slides.length;
  let index = 0;

  root.tabIndex = 0;
  root.setAttribute('role', 'region');
  root.setAttribute('aria-roledescription', 'carrousel');
  if (!root.hasAttribute('aria-label')) root.setAttribute('aria-label', 'Galerie d’images');
  slides.forEach((s, k) => { s.setAttribute('draggable', 'false'); s.setAttribute('aria-label', `${k + 1} sur ${n}`); });

  const dots = document.createElement('div');
  dots.className = 'dots';
  const btns = slides.map((_, k) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.tabIndex = -1; // le carrousel lui-même prend le focus ; les points restent cliquables
    b.setAttribute('aria-label', `Afficher l’image ${k + 1} sur ${n}`);
    b.addEventListener('click', (e) => { e.stopPropagation(); go(k); });
    dots.append(b);
    return b;
  });
  const status = document.createElement('span');
  status.className = 'sr-only';
  status.setAttribute('aria-live', 'polite');
  root.append(dots, status);

  function place(dx = 0) {
    track.style.transform = `translate3d(calc(${-index * 100}% + ${dx}px), 0, 0)`;
  }
  function go(k, announce = true) {
    index = clamp(k, 0, n - 1);
    place();
    slides.forEach((s, j) => s.setAttribute('aria-hidden', j !== index));
    btns.forEach((b, j) => { b.classList.toggle('bar', j === index); b.setAttribute('aria-current', j === index); });
    if (announce) status.textContent = `Image ${index + 1} sur ${n}`;
  }

  root.addEventListener('keydown', (e) => {
    const k = { ArrowLeft: index - 1, ArrowRight: index + 1, Home: 0, End: n - 1 }[e.key];
    if (k === undefined) return;
    e.preventDefault();
    go(k);
  });

  // Glisser : le geste n'est pris en charge qu'une fois clairement horizontal,
  // sinon le défilement vertical de la page reste au navigateur (touch-action: pan-y).
  let drag = null;
  root.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest('.dots')) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), on: false };
  });
  root.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.on) {
      if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) { drag = null; return; }
      if (Math.abs(dx) < 6) return;
      drag.on = true;
      root.setPointerCapture(e.pointerId);
      root.classList.add('is-dragging');
    }
    // résistance aux extrémités
    const edge = (index === 0 && dx > 0) || (index === n - 1 && dx < 0);
    place(edge ? dx * 0.3 : dx);
  });
  const end = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag; drag = null;
    if (!d.on) return;
    root.classList.remove('is-dragging');
    const dx = e.clientX - d.x, v = dx / Math.max(1, performance.now() - d.t);
    const far = Math.abs(dx) > root.clientWidth * 0.18 || Math.abs(v) > 0.45;
    go(e.type === 'pointerup' && far ? index - Math.sign(dx) : index);
  };
  root.addEventListener('pointerup', end);
  root.addEventListener('pointercancel', end);
  // au toucher, l'image cède sa capture implicite au carrousel : seul l'abandon par le carrousel compte
  root.addEventListener('lostpointercapture', (e) => { if (e.target === root) end(e); });

  // Les images suivantes sont hors champ (translation) : on les charge dès que la carte approche.
  const io = new IntersectionObserver((entries) => {
    if (!entries.some((en) => en.isIntersecting)) return;
    track.querySelectorAll('img[loading="lazy"]').forEach((im) => (im.loading = 'eager'));
    io.disconnect();
  }, { rootMargin: '300px' });
  io.observe(root);

  go(0, false);
  return { go, get index() { return index; } };
}

export const initSliders = (scope = document) => [...scope.querySelectorAll('[data-slider]')].map(initSlider).filter(Boolean);
