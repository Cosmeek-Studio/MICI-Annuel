import '@fontsource/barlow-condensed/700.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/space-grotesk/700.css';
import { EDITIONS, DEFAULT_EDITION } from './stage/editions.js';
import { initSliders } from './slider.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ---------- Bandeau / nav ---------- */
const ticker = $('#ticker');
// bandeau fermé : la nav et la page remontent d'autant
$('#tickerClose').addEventListener('click', () => { ticker.classList.add('is-hidden'); document.documentElement.classList.add('no-ticker'); });
$('#navLogo').addEventListener('click', (e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); closeAll(); });

/* ---------- Hero 3D ---------- */
const canvas = $('#stage3d');
const hs = Object.fromEntries($$('.hotspot').map((el) => [el.dataset.action, el]));
const hint = $('#hint');
const panel = $('#stagePanel'), panelBody = $('#panelBody');
const teaser = $('#teaser'), teaserFrame = $('#teaserFrame');
let stage = null, open = null, year = DEFAULT_EDITION;

function setHotspots(pos) {
  for (const [k, el] of Object.entries(hs)) {
    const p = pos[k]; if (!p) continue;
    el.style.left = p.x + 'px'; el.style.top = p.y + 'px';
    el.classList.toggle('is-on', p.visible && !open);
  }
}

// Le moteur 3D (three.js) est chargé à part : la page s'affiche et répond sans l'attendre.
import('./stage3d.js').then(({ createStage }) => {
  stage = createStage(canvas, {
    edition: year,
    onReady: () => canvas.classList.add('is-ready'),
    onHotspots: setHotspots,
    onHover: (name) => { for (const [k, el] of Object.entries(hs)) el.classList.toggle('is-hover', k === name); },
  });
  stage.onInteract(() => hint.classList.add('is-hidden'));
  stage.onClick((name) => act(name));
  if (open) stage.view(open);
}).catch((err) => {
  console.warn('WebGL indisponible, affichage du rendu statique.', err);
  Object.values(hs).forEach((el) => (el.hidden = true));
  hint.hidden = true;
});

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ASSETS = import.meta.env.BASE_URL + 'assets/';
function teamHTML(ed, team) {
  // Avec portraits (2026) : vignettes de la maquette, légende encadrée ; sinon liste à initiales.
  if (team.speakers.every((s) => s.photo)) {
    return `<h3 class="team__title">L’équipe <span style="color:${team.color}">${esc(team.tag || team.label)}</span></h3>
    <p class="body">MICI Challenge ${ed.year} — ${esc(ed.theme)}</p>
    <ul class="team">${team.speakers.map((s) => `<li><img src="${ASSETS + esc(s.photo)}" alt="" width="400" height="400" /><div><b>${esc(s.name)}</b><span>${esc(s.role)}</span>${s.city ? `<small>${esc(s.city)}</small>` : ''}</div></li>`).join('')}</ul>`;
  }
  return `<span class="pill" style="background:${team.color}">${esc(team.label)} ${esc(team.tag)}</span>
    <h3>Les intervenants</h3>
    <p class="body">MICI Challenge ${ed.year} — ${esc(ed.theme)}</p>
    <ul class="speakers">${team.speakers.map((s) => `<li><span class="speakers__avatar" style="background:${team.color}">${esc(s.name.split(' ').map((w) => w[0]).slice(0, 2).join(''))}</span><div><b>${esc(s.name)}</b><small>${esc(s.role)}</small></div></li>`).join('')}</ul>`;
}
function debatesHTML(list) {
  if (!list?.length) return '';
  return `<h4 class="debates__title">Rappel des débats</h4>
    <ol class="debates">${list.map((d, i) => `<li><span class="debates__num">${String(i + 1).padStart(2, '0')}</span><div><b>${esc(d.q)}</b><p>${esc(d.a)}</p></div></li>`).join('')}</ol>`;
}
function summaryHTML(ed) {
  return `<span class="pill pill--orange">Édition ${ed.year}</span>
    <h3>${esc(ed.theme)}</h3>
    <p class="body stage-panel__meta">${esc(ed.date)} · ${esc(ed.time)}</p>
    <p class="body">${esc(ed.summary)}</p>${debatesHTML(ed.debates)}
    <a class="chip chip--lime" href="#archive">VOIR LES ARCHIVES <i>↗</i></a>`;
}
function teaserHTML(ed) {
  const src = ed.teaser;
  if (!src) return `<div class="teaser__empty"><b>MICI Challenge ${ed.year}</b><span>Le best-of de cette édition sera bientôt disponible.</span></div>`;
  if (/\.(mp4|webm)(\?|$)/i.test(src)) return `<video src="${esc(src)}" controls autoplay playsinline></video>`;
  return `<iframe src="${esc(src)}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen title="Best-of MICI Challenge ${ed.year}"></iframe>`;
}

function act(name) {
  const ed = EDITIONS[year];
  if (open === name) return;
  closeAll(false);
  open = name; hint.classList.add('is-hidden'); stage?.view(name);
  if (name === 'teaser') { teaserFrame.innerHTML = teaserHTML(ed); teaser.hidden = false; requestAnimationFrame(() => teaser.classList.add('is-open')); $('#teaserClose').focus(); return; }
  panelBody.innerHTML = name === 'summary' ? summaryHTML(ed) : teamHTML(ed, name === 'teamA' ? ed.teamA : ed.teamB);
  panel.dataset.side = name === 'teamB' ? 'left' : 'right';
  const team = name === 'teamA' ? ed.teamA : name === 'teamB' ? ed.teamB : null;
  panel.classList.toggle('stage-panel--wide', name === 'summary' && !!ed.debates?.length);
  panel.classList.toggle('stage-panel--team', !!team?.speakers.every((s) => s.photo));
  panel.hidden = false; requestAnimationFrame(() => panel.classList.add('is-open'));
}
function closeAll(goHome = true) {
  if (!open) return; open = null;
  panel.classList.remove('is-open'); panel.hidden = true;
  teaser.classList.remove('is-open'); teaser.hidden = true; teaserFrame.innerHTML = '';
  if (goHome) stage?.view('home');
}
for (const [k, el] of Object.entries(hs)) {
  el.addEventListener('click', () => act(k));
  el.addEventListener('pointerenter', () => stage?.hover(k));
  el.addEventListener('pointerleave', () => stage?.hover(null));
}
$('#panelClose').addEventListener('click', () => closeAll());
$('#teaserClose').addEventListener('click', () => closeAll());
teaser.addEventListener('click', (e) => { if (e.target === teaser) closeAll(); });
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
tabs.forEach((t) => {
  t.addEventListener('click', () => setEdition(t.dataset.edition));
  // les visuels d'une édition sont préchargés dès que son onglet est survolé ou ciblé
  for (const ev of ['pointerenter', 'focus']) t.addEventListener(ev, () => stage?.preload(t.dataset.edition));
});
addEventListener('resize', () => setEdition(year));
document.fonts?.ready.then(() => setEdition(year));
setEdition(year);

/* ---------- Galerie : filtres + colonnes rééquilibrées ---------- */
// Aucun filtre actif : tout est affiché, dans la disposition de la maquette.
// Un ou plusieurs filtres actifs : seules les cartes correspondantes restent,
// redistribuées dans les colonnes (la plus courte d'abord) pour ne pas laisser de trous.
const grid = $('#archiveGrid');
initSliders(grid); // cartes à plusieurs images : le carrousel reste attaché à sa carte quand elle change de colonne
const cols = $$('.col', grid);
const cards = $$('.card', grid);
const filters = $$('.pill--filter');
cards.forEach((c) => { c._col = cols.indexOf(c.parentElement); c._row = [...c.parentElement.children].indexOf(c); });
const reading = [...cards].sort((a, b) => a._row - b._row || a._col - b._col);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const colCount = () => getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length;
let lastCols = colCount();

function layoutGallery(animate) {
  const on = filters.filter((f) => f.classList.contains('is-on')).map((f) => f.dataset.filter);
  const n = Math.min(colCount(), cols.length);
  const shown = reading.filter((c) => !on.length || c.dataset.type.split(' ').some((t) => on.includes(t)));
  cards.forEach((c) => { c.classList.toggle('is-hidden', !shown.includes(c)); c.classList.remove('is-entering'); });
  if (!on.length && n === cols.length) {
    [...cards].sort((a, b) => a._col - b._col || a._row - b._row).forEach((c) => cols[c._col].appendChild(c));
  } else {
    cols.forEach((col) => col.replaceChildren());
    const gap = parseFloat(getComputedStyle(cols[0]).rowGap) || 0;
    const h = Array(n).fill(0);
    shown.forEach((c) => {
      const i = h.indexOf(Math.min(...h));
      cols[i].appendChild(c);
      h[i] += c.offsetHeight + gap;
    });
    cards.filter((c) => !shown.includes(c)).forEach((c) => cols[0].appendChild(c));
  }
  if (animate && !reduced) {
    shown.forEach((c, i) => { c.style.setProperty('--d', Math.min(i, 8) * 45 + 'ms'); void c.offsetWidth; c.classList.add('is-entering'); });
  }
}
let switching;
filters.forEach((f) => f.addEventListener('click', () => {
  const on = f.classList.toggle('is-on');
  f.setAttribute('aria-pressed', on);
  clearTimeout(switching);
  if (reduced) { layoutGallery(false); return; }
  grid.classList.add('is-switching');
  switching = setTimeout(() => { layoutGallery(true); grid.classList.remove('is-switching'); }, 200);
}));
addEventListener('resize', () => { const n = colCount(); if (n !== lastCols) { lastCols = n; layoutGallery(false); } });
if (lastCols !== cols.length) layoutGallery(false);

/* ---------- FAQ ---------- */
const items = $$('.acc__item');
const setOpen = (it, open) => { it.classList.toggle('is-open', open); $('.acc__q', it).setAttribute('aria-expanded', open); };
items.forEach((it) => {
  setOpen(it, it.classList.contains('is-open'));
  $('.acc__q', it).addEventListener('click', () => {
    const open = it.classList.contains('is-open');
    items.forEach((o) => setOpen(o, false));
    if (!open) setOpen(it, true);
  });
});

/* ---------- Newsletter ---------- */
const form = $('#newsletter'), email = $('#email'), msg = $('#nlMsg');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
  email.classList.toggle('is-error', !ok);
  msg.textContent = ok ? 'Merci ! Vous serez averti du lancement de la prochaine édition.' : 'Merci de saisir une adresse mail valide.';
  if (ok) form.reset();
});

/* ---------- Apparitions au scroll ---------- */
// Titres : découpés en mots, chacun glisse derrière un masque. Le reste du texte monte en fondu.
function splitWords(el) {
  let i = 0;
  const walk = (node) => {
    [...node.childNodes].forEach((ch) => {
      if (ch.nodeType === 1) { walk(ch); return; }
      if (ch.nodeType !== 3 || !ch.textContent.trim()) return;
      const frag = document.createDocumentFragment();
      ch.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.append(' '); return; }
        const w = document.createElement('span'), inner = document.createElement('span');
        w.className = 'w';
        inner.textContent = part;
        inner.style.setProperty('--i', i++);
        w.append(inner);
        frag.append(w);
      });
      ch.replaceWith(frag);
    });
  };
  walk(el);
}
$$('main h2').forEach((el) => { el.dataset.anim = 'words'; splitWords(el); });
$$('main .pill:not(.pill--filter), main .body, main .card h3, main .loc, main a.chip, .scroll-line .chip, .newsletter, .archive__filters, .acc__item, .footer__card, .footer__legal')
  .filter((el) => !el.closest('.acc__a'))
  .forEach((el) => { el.dataset.anim = 'up'; });

const io = new IntersectionObserver((entries) => {
  // Les éléments qui entrent ensemble sont décalés dans l'ordre de lecture.
  const seen = entries.filter((e) => e.isIntersecting)
    .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left);
  let i = 0;
  seen.forEach((e) => {
    const el = e.target;
    if (el.dataset.anim) el.style.setProperty('--d', Math.min(i++, 7) * 70 + 'ms');
    el.classList.add('is-in');
    io.unobserve(el);
  });
}, { threshold: 0.1 }); // pas de marge basse : la dernière ligne du footer doit pouvoir entrer dans la zone observée
$$('.reveal, [data-anim]').forEach((el) => io.observe(el));

/* ---------- Parallaxe de la carte « édition 2026 » ---------- */
const coverBg = $('.cover__bg');
addEventListener('scroll', () => {
  const r = coverBg.parentElement.getBoundingClientRect();
  if (r.bottom > 0 && r.top < innerHeight) coverBg.style.transform = `translateY(${(r.top / innerHeight) * -24}px)`;
}, { passive: true });
