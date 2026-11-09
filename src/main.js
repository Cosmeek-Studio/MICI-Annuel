import { createStage } from './stage3d.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ---------- Bandeau / nav ---------- */
const ticker = $('#ticker');
$('#tickerClose').addEventListener('click', () => ticker.classList.add('is-hidden'));
const back = $('#backToStage');
back.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); stage?.view('home'); });
addEventListener('scroll', () => back.classList.toggle('is-visible', scrollY > innerHeight * 0.6), { passive: true });

/* ---------- Hero 3D ---------- */
const canvas = $('#stage3d');
const hs = { teaser: $('#hsTeaser'), universe: $('#hsUniverse'), summary: $('#hsSummary') };
const hint = $('#hint');
const closeBtn = $('#teaserClose');
let stage = null, teaser = false;

function setHotspots(pos) {
  for (const [k, el] of Object.entries(hs)) {
    const p = pos[k]; if (!p) continue;
    el.style.left = p.x + 'px'; el.style.top = p.y + 'px';
    el.classList.toggle('is-on', p.visible && !teaser);
  }
}

try {
  stage = createStage(canvas, {
    onReady: () => canvas.classList.add('is-ready'),
    onHotspots: setHotspots,
  });
  stage.onInteract(() => hint.classList.add('is-hidden'));
  stage.onClick((name) => {
    if (name === 'center') startTeaser();
    else if (name === 'left') goUniverse();
    else if (name === 'right') goSummary();
  });
} catch (err) {
  console.warn('WebGL indisponible, affichage du rendu statique.', err);
  Object.values(hs).forEach((el) => (el.hidden = true));
  hint.hidden = true;
}

function startTeaser() { if (!stage || teaser) return; teaser = true; stage.setTeaser(true); stage.view('center'); closeBtn.hidden = false; hint.classList.add('is-hidden'); }
function stopTeaser() { teaser = false; stage?.setTeaser(false); stage?.view('home'); closeBtn.hidden = true; }
function goUniverse() { document.getElementById('concept').scrollIntoView({ behavior: 'smooth' }); }
function goSummary() { document.getElementById('archive').scrollIntoView({ behavior: 'smooth' }); }
hs.teaser.addEventListener('click', startTeaser);
hs.universe.addEventListener('click', goUniverse);
hs.summary.addEventListener('click', goSummary);
closeBtn.addEventListener('click', stopTeaser);
addEventListener('keydown', (e) => { if (e.key === 'Escape' && teaser) stopTeaser(); });

/* ---------- Onglets d'éditions ---------- */
const tabs = $$('.chip--edition');
const prog = $('#editionsProgress');
function setEdition(year) {
  tabs.forEach((t) => { const on = t.dataset.edition === String(year); t.classList.toggle('is-active', on); t.setAttribute('aria-selected', on); });
  const i = tabs.findIndex((t) => t.dataset.edition === String(year));
  const el = tabs[i], box = el.parentElement.getBoundingClientRect(), r = el.getBoundingClientRect();
  prog.style.width = r.left - box.left + r.width / 2 + 'px';
  $('#logoYear').textContent = year;
  stage?.setEdition(year);
}
tabs.forEach((t) => t.addEventListener('click', () => setEdition(t.dataset.edition)));
addEventListener('resize', () => setEdition($('.chip--edition.is-active').dataset.edition));
document.fonts?.ready.then(() => setEdition($('.chip--edition.is-active').dataset.edition));
setEdition(2024);

/* ---------- Filtres d'archives ---------- */
const filters = $$('.pill--filter');
function applyFilters() {
  const on = new Set(filters.filter((f) => f.classList.contains('is-on')).map((f) => f.dataset.filter));
  $$('#archiveGrid .card').forEach((c) => c.classList.toggle('is-hidden', !c.dataset.type.split(' ').some((t) => on.has(t))));
}
filters.forEach((f) => f.addEventListener('click', () => { f.classList.toggle('is-on'); applyFilters(); }));

/* ---------- FAQ ---------- */
$$('.acc__item').forEach((it) => $('.acc__q', it).addEventListener('click', () => {
  const open = it.classList.contains('is-open');
  $$('.acc__item').forEach((o) => o.classList.remove('is-open'));
  if (!open) it.classList.add('is-open');
}));

/* ---------- Newsletter ---------- */
const form = $('#newsletter'), email = $('#email'), msg = $('#nlMsg');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
  email.classList.toggle('is-error', !ok);
  msg.textContent = ok ? 'Merci ! Vous serez averti du lancement de la prochaine édition.' : 'Merci de saisir une adresse mail valide.';
  if (ok) form.reset();
});

/* ---------- Révélations au scroll + parallaxe cover ---------- */
const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { threshold: 0.12 });
$$('.reveal').forEach((el) => io.observe(el));
const coverBg = $('.cover__bg');
addEventListener('scroll', () => {
  const r = coverBg.parentElement.getBoundingClientRect();
  if (r.bottom > 0 && r.top < innerHeight) coverBg.style.transform = `translateY(${(r.top / innerHeight) * -30}px)`;
}, { passive: true });
