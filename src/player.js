/* Lecteur vidéo du best-of : contrôles sur mesure à la place de ceux du navigateur.
   mountPlayer(conteneur, { src, year, theme }) renvoie une fonction qui démonte le lecteur. */

const ICONS = {
  play: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11a.5.5 0 0 0 .76.43l9-5.5a.5.5 0 0 0 0-.86l-9-5.5A.5.5 0 0 0 4 2.5Z"/></svg>',
  pause: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="2" width="3.5" height="12" rx=".75"/><rect x="9.5" y="2" width="3.5" height="12" rx=".75"/></svg>',
  replay: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.5a5.5 5.5 0 1 1-5.33 6.88.75.75 0 1 1 1.45-.38A4 4 0 1 0 8 4h-.5v1.6a.4.4 0 0 1-.66.3L4.2 3.6a.4.4 0 0 1 0-.6L6.84.7a.4.4 0 0 1 .66.3v1.5H8Z"/></svg>',
  sound: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6h2.5L8 3v10L4.5 10H2a.5.5 0 0 1-.5-.5v-3A.5.5 0 0 1 2 6Z"/><path d="M10.5 5.5a3.5 3.5 0 0 1 0 5M12.5 3.5a6.3 6.3 0 0 1 0 9" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
  muted: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6h2.5L8 3v10L4.5 10H2a.5.5 0 0 1-.5-.5v-3A.5.5 0 0 1 2 6Z"/><path d="m10.5 6 4 4m0-4-4 4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
  expand: '<svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10"/></svg>',
  shrink: '<svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2.5V6H2.5M13.5 6H10V2.5M10 13.5V10h3.5M2.5 10H6v3.5"/></svg>',
};

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (t) => { if (!isFinite(t)) return '0:00'; t = Math.max(0, Math.floor(t)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };

export function mountPlayer(root, { src, year, theme }) {
  root.innerHTML = `
    <div class="player is-paused">
      <video src="${esc(src)}" playsinline preload="metadata"></video>
      <div class="player__shade"></div>
      <div class="player__head">
        <span class="player__tag">BEST-OF · ÉDITION ${esc(year)}</span>
        <b class="player__title">${esc(theme)}</b>
      </div>
      <span class="player__spinner" aria-hidden="true"></span>
      <button class="player__big" type="button"><i>${ICONS.play}</i><span class="player__bigLabel">LECTURE</span><span class="player__bigTime"></span></button>
      <div class="player__bar">
        <button class="player__btn" data-k="toggle" type="button" aria-label="Lecture">${ICONS.play}</button>
        <span class="player__time" data-k="cur">0:00</span>
        <div class="player__track" role="slider" tabindex="0" aria-label="Position dans la vidéo" aria-valuemin="0" aria-valuemax="0" aria-valuenow="0">
          <span class="player__rail"><i class="player__buf"></i><i class="player__fill"></i></span>
          <i class="player__thumb"></i>
          <span class="player__tip">0:00</span>
        </div>
        <span class="player__time player__time--dur" data-k="dur">0:00</span>
        <button class="player__btn" data-k="mute" type="button" aria-label="Couper le son">${ICONS.sound}</button>
        <button class="player__btn" data-k="fs" type="button" aria-label="Plein écran">${ICONS.expand}</button>
      </div>
    </div>`;

  const el = root.firstElementChild;
  const v = el.querySelector('video');
  const q = (s) => el.querySelector(s);
  const big = q('.player__big'), bigIcon = big.querySelector('i'), bigLabel = q('.player__bigLabel'), bigTime = q('.player__bigTime');
  const btnToggle = q('[data-k="toggle"]'), btnMute = q('[data-k="mute"]'), btnFs = q('[data-k="fs"]');
  const cur = q('[data-k="cur"]'), dur = q('[data-k="dur"]');
  const track = q('.player__track'), fill = q('.player__fill'), buf = q('.player__buf'), thumb = q('.player__thumb'), tip = q('.player__tip');
  const ac = new AbortController(); const on = (t, ev, fn, o) => t.addEventListener(ev, fn, { signal: ac.signal, ...o });

  const toggle = () => (v.paused || v.ended ? v.play().catch(() => {}) : v.pause());
  const seek = (t) => { if (isFinite(v.duration)) v.currentTime = Math.min(v.duration, Math.max(0, t)); };
  const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
  const fullscreen = () => {
    if (fsEl()) return (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    if (el.requestFullscreen) return el.requestFullscreen().catch(() => {});
    if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
    v.webkitEnterFullscreen?.(); // iPhone : seul le plein écran natif de la vidéo est disponible
  };

  // ---- état ----
  function paint() {
    const playing = !v.paused && !v.ended;
    el.classList.toggle('is-paused', !playing);
    el.classList.toggle('is-ended', v.ended);
    btnToggle.innerHTML = playing ? ICONS.pause : ICONS.play;
    btnToggle.setAttribute('aria-label', playing ? 'Pause' : 'Lecture');
    bigIcon.innerHTML = v.ended ? ICONS.replay : ICONS.play;
    bigLabel.textContent = v.ended ? 'REVOIR' : v.currentTime > 0.5 ? 'REPRENDRE' : 'LECTURE';
    big.setAttribute('aria-label', bigLabel.textContent.toLowerCase());
    if (playing) wake(); else showControls();
  }
  function progress() {
    const d = v.duration || 0, p = d ? v.currentTime / d : 0;
    fill.style.transform = `scaleX(${p})`; thumb.style.left = `${p * 100}%`;
    cur.textContent = fmt(v.currentTime);
    track.setAttribute('aria-valuenow', Math.floor(v.currentTime)); track.setAttribute('aria-valuetext', `${fmt(v.currentTime)} sur ${fmt(d)}`);
  }
  function buffered() {
    const d = v.duration; if (!d || !v.buffered.length) return;
    buf.style.transform = `scaleX(${v.buffered.end(v.buffered.length - 1) / d})`;
  }
  function meta() {
    dur.textContent = fmt(v.duration); bigTime.textContent = fmt(v.duration);
    track.setAttribute('aria-valuemax', Math.floor(v.duration)); progress();
  }
  function sound() {
    const m = v.muted || v.volume === 0;
    btnMute.innerHTML = m ? ICONS.muted : ICONS.sound;
    btnMute.setAttribute('aria-label', m ? 'Activer le son' : 'Couper le son');
  }

  // ---- masquage des contrôles pendant la lecture ----
  let idle = 0;
  function showControls() { clearTimeout(idle); el.classList.remove('is-idle'); }
  function wake() {
    showControls();
    if (!v.paused && !el.matches(':has(.player__bar:hover), :has(.player__track.is-drag)')) idle = setTimeout(() => el.classList.add('is-idle'), 2500);
  }

  // ---- barre de progression ----
  const ratio = (e) => { const r = track.getBoundingClientRect(); return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)); };
  const hover = (e) => { const p = ratio(e); tip.textContent = fmt(p * (v.duration || 0)); tip.style.left = `${p * 100}%`; };
  on(track, 'pointerdown', (e) => {
    track.setPointerCapture(e.pointerId); track.classList.add('is-drag');
    const was = !v.paused; v.pause(); seek(ratio(e) * v.duration); hover(e);
    const move = (ev) => { seek(ratio(ev) * v.duration); hover(ev); progress(); };
    const up = () => { track.classList.remove('is-drag'); track.blur(); /* pas d'anneau de focus après un clic */ track.removeEventListener('pointermove', move); if (was) v.play().catch(() => {}); wake(); };
    track.addEventListener('pointermove', move); track.addEventListener('pointerup', up, { once: true }); track.addEventListener('pointercancel', up, { once: true });
  });
  on(track, 'pointermove', hover);
  on(track, 'keydown', (e) => {
    const step = { ArrowLeft: -5, ArrowRight: 5, PageDown: -30, PageUp: 30 }[e.key];
    if (step) { e.preventDefault(); e.stopPropagation(); seek(v.currentTime + step); }
    if (e.key === 'Home') { e.preventDefault(); seek(0); }
    if (e.key === 'End') { e.preventDefault(); seek(v.duration); }
  });

  // ---- boutons et gestes ----
  on(big, 'click', toggle);
  on(btnToggle, 'click', toggle);
  on(btnMute, 'click', () => { v.muted = !v.muted; });
  on(btnFs, 'click', fullscreen);
  let clickT = 0;
  on(v, 'click', () => { clearTimeout(clickT); clickT = setTimeout(toggle, 220); }); // simple clic : lecture/pause
  on(v, 'dblclick', () => { clearTimeout(clickT); fullscreen(); }); // double clic : plein écran
  on(el, 'pointermove', wake);
  on(el, 'pointerleave', () => { if (!v.paused) { clearTimeout(idle); el.classList.add('is-idle'); } });
  on(document, 'fullscreenchange', () => { const f = fsEl() === el; el.classList.toggle('is-fs', f); btnFs.innerHTML = f ? ICONS.shrink : ICONS.expand; btnFs.setAttribute('aria-label', f ? 'Quitter le plein écran' : 'Plein écran'); });
  on(document, 'keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase(), onButton = e.target.closest?.('button');
    if ((k === ' ' && !onButton) || k === 'k') { e.preventDefault(); toggle(); }
    else if (k === 'arrowleft' || k === 'j') { e.preventDefault(); seek(v.currentTime - (k === 'j' ? 10 : 5)); }
    else if (k === 'arrowright' || k === 'l') { e.preventDefault(); seek(v.currentTime + (k === 'l' ? 10 : 5)); }
    else if (k === 'm') v.muted = !v.muted;
    else if (k === 'f') fullscreen();
    else return;
    wake();
  });

  // ---- vidéo ----
  on(v, 'play', paint); on(v, 'pause', paint); on(v, 'ended', paint);
  on(v, 'timeupdate', progress); on(v, 'seeking', progress);
  on(v, 'progress', buffered); on(v, 'loadedmetadata', meta); on(v, 'durationchange', meta);
  on(v, 'volumechange', sound);
  on(v, 'waiting', () => el.classList.add('is-loading'));
  for (const ev of ['playing', 'canplay', 'seeked']) on(v, ev, () => el.classList.remove('is-loading'));
  on(v, 'error', () => { el.classList.add('is-error'); bigLabel.textContent = 'VIDÉO INDISPONIBLE'; bigTime.textContent = ''; });

  paint(); sound();
  // le lecteur s'ouvre après un clic : la lecture avec le son est autorisée ; sinon le bouton « Lecture » reste affiché
  v.play().catch(() => paint());

  return () => {
    ac.abort(); clearTimeout(idle); clearTimeout(clickT);
    if (fsEl() === el) (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
    v.pause(); v.removeAttribute('src'); v.load(); // coupe le téléchargement en cours
  };
}
