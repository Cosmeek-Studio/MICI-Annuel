import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/space-grotesk/700.css';
import { createStage } from './stage3d.js';
import { EDITIONS, DEFAULT_EDITION } from './stage/editions.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ---------- Bandeau / nav ---------- */
const ticker = $('#ticker');
$('#tickerClose').addEventListener('click', () => ticker.classList.add('is-hidden'));
const back = $('#backToStage');
back.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); closeAll(); });
addEventListener('scroll', () => back.classList.toggle('is-visible', scrollY > innerHeight * 0.6), { passive: true });

/* ---------- Hero 3D ---------- */
const canvas = $('#stage3d');
const hs = Object.fromEntries($$('.hotspot').map((el) => [el.dataset.action, el]));
const hint = $('#hint');
const panel = $('#stagePanel'), panelBody = $('#panelBody');
const trailer = $('#trailer'), trailerFrame = $('#trailerFrame');
let stage = null, open = null, year = DEFAULT_EDITION;

function setHotspots(pos) {
  for (const [k, el] of Object.entries(hs)) {
    const p = pos[k]; if (!p) continue;
    el.style.left = p.x + 'px'; el.style.top = p.y + 'px';
    el.classList.toggle('is-on', p.visible && !open);
  }
}

try {
  stage = createStage(canvas, {
    onReady: () => canvas.classList.add('is-ready'),
    onHotspots: setHotspots,
    onHover: (name) => { for (const [k, el] of Object.entries(hs)) el.classList.toggle('is-hover', k === name); },
  });
  stage.onInteract(() => hint.classList.add('is-hidden'));
  stage.onClick((name) => act(name));
} catch (err) {
  console.warn('WebGL indisponible, affichage du rendu statique.', err);
  Object.values(hs).forEach((el) => (el.hidden = true));
  hint.hidden = true;
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function teamHTML(ed, team) {
  return `<span class="pill" style="background:${team.color}">${esc(team.label)} ${esc(team.tag)}</span>
    <h3>Les intervenants</h3>
    <p class="body">MICI Challenge ${ed.year} — ${esc(ed.theme)}</p>
    <ul class="speakers">${team.speakers.map((s) => `<li><span class="speakers__avatar" style="background:${team.color}">${esc(s.name.split(' ').map((w) => w[0]).slice(0, 2).join(''))}</span><div><b>${esc(s.name)}</b><small>${esc(s.role)}</small></div></li>`).join('')}</ul>`;
}
function summaryHTML(ed) {
  return `<span class="pill pill--orange">Édition ${ed.year}</span>
    <h3>${esc(ed.theme)}</h3>
    <p class="body stage-panel__meta">${esc(ed.date)} · ${esc(ed.time)}</p>
    <p class="body">${esc(ed.summary)}</p>
    <a class="chip chip--lime" href="#archive">VOIR LES ARCHIVES <i>↗</i></a>`;
}
function trailerHTML(ed) {
  const src = ed.trailer;
  if (!src) return `<div class="trailer__empty"><b>MICI Challenge ${ed.year}</b><span>Le trailer de cette édition sera bientôt disponible.</span></div>`;
  if (/\.(mp4|webm)(\?|$)/i.test(src)) return `<video src="${esc(src)}" controls autoplay playsinline></video>`;
  return `<iframe src="${esc(src)}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen title="Trailer MICI Challenge ${ed.year}"></iframe>`;
}

function act(name) {
  const ed = EDITIONS[year];
  if (open === name) return;
  closeAll(false);
  open = name; hint.classList.add('is-hidden'); stage?.view(name);
  if (name === 'trailer') { trailerFrame.innerHTML = trailerHTML(ed); trailer.hidden = false; requestAnimationFrame(() => trailer.classList.add('is-open')); $('#trailerClose').focus(); return; }
  panelBody.innerHTML = name === 'summary' ? summaryHTML(ed) : teamHTML(ed, name === 'teamA' ? ed.teamA : ed.teamB);
  panel.dataset.side = name === 'teamB' ? 'left' : 'right';
  panel.hidden = false; requestAnimationFrame(() => panel.classList.add('is-open'));
}
function closeAll(goHome = true) {
  if (!open) return; open = null;
  panel.classList.remove('is-open'); panel.hidden = true;
  trailer.classList.remove('is-open'); trailer.hidden = true; trailerFrame.innerHTML = '';
  if (goHome) stage?.view('home');
}
for (const [k, el] of Object.entries(hs)) {
  el.addEventListener('click', () => act(k));
  el.addEventListener('pointerenter', () => stage?.hover(k));
  el.addEventListener('pointerleave', () => stage?.hover(null));
}
$('#panelClose').addEventListener('click', () => closeAll());
$('#trailerClose').addEventListener('click', () => closeAll());
trailer.addEventListener('click', (e) => { if (e.target === trailer) closeAll(); });
panelBody.addEventListener('click', (e) => { if (e.target.closest('a')) closeAll(); });
addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAll(); });

/* ---------- Onglets d'éditions ---------- */
const tabs = $$('.chip--edition');
const prog = $('#editionsProgress');
function setEdition(y) {
  if (String(y) !== String(year)) closeAll();
  year = +y;
  tabs.forEach((t) => { const on = t.dataset.edition === String(y); t.classList.toggle('is-active', on); t.setAttribute('aria-selected', on); });
  const el = tabs.find((t) => t.dataset.edition === String(y)), box = el.parentElement.getBoundingClientRect(), r = el.getBoundingClientRect();
  // halo centré sur l'onglet actif, débordant de chaque côté sans dépasser la ligne
  const gap = tabs.length > 1 ? (box.width - tabs.reduce((w, t) => w + t.offsetWidth, 0)) / (tabs.length - 1) : 0;
  const halo = Math.max(12, Math.min(56, gap * 0.6)), l = Math.max(0, r.left - box.left - halo), rt = Math.min(box.width, r.right - box.left + halo);
  prog.style.setProperty('--halo', halo + 'px'); prog.style.left = l + 'px'; prog.style.width = rt - l + 'px';
  stage?.setEdition(y);
}
tabs.forEach((t) => t.addEventListener('click', () => setEdition(t.dataset.edition)));
addEventListener('resize', () => setEdition(year));
document.fonts?.ready.then(() => setEdition(year));
setEdition(year);

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
