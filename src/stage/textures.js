/* Contenus des écrans du plateau, dessinés sur canvas (une texture par écran, repeinte à chaque édition). */

const BASE = import.meta.env.BASE_URL + 'assets/';
const FONT = '"Space Grotesk", "Helvetica Neue", Arial, sans-serif';
const BLACK = '#0c0c0e';

const assets = {};
function loadImg(file) {
  return new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = BASE + file; });
}
/* Logos exportés de Figma, forcés en blanc */
function whiten(img) {
  if (!img) return null;
  const c = document.createElement('canvas'); c.width = img.width * 4; c.height = img.height * 4;
  const x = c.getContext('2d'); x.drawImage(img, 0, 0, c.width, c.height);
  x.globalCompositeOperation = 'source-in'; x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
  return c;
}
export async function loadAssets() {
  const [mici26, challenge, celltrion] = await Promise.all(['65192.svg', '0c29f.svg', '0954c.svg'].map(loadImg));
  Object.assign(assets, { mici26: whiten(mici26), challenge: whiten(challenge), celltrion: whiten(celltrion) });
  await Promise.all([`500 40px ${FONT}`, `700 40px ${FONT}`].map((f) => document.fonts?.load(f).catch(() => {})));
}

export function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

/* ---------- bruit ---------- */
function hash(x, y, s) { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vnoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, s) { return vnoise(x, y, s) * 0.55 + vnoise(x * 2.1, y * 2.1, s + 7) * 0.3 + vnoise(x * 4.3, y * 4.3, s + 13) * 0.15; }

/* Trame "dither" : carrés pleins, carrés moyens, points et croix selon un champ de bruit.
   mask(nx, ny) -> 0..1 module la densité. */
function dither(ctx, x0, y0, w, h, color, { seed = 1, cell = 12, scale = 3.2, bias = 0, mask } = {}) {
  ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip();
  ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, cell * 0.14);
  const cols = Math.ceil(w / cell), rows = Math.ceil(h / cell), asp = w / h;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const nx = i / cols, ny = j / rows;
    let v = fbm(nx * scale * asp, ny * scale, seed) + bias;
    if (mask) v = v * mask(nx, ny) + (mask(nx, ny) - 1) * 0.25;
    const x = x0 + i * cell, y = y0 + j * cell, r = hash(i, j, seed + 3);
    const sq = (k) => { const s = cell * k; ctx.fillRect(x + (cell - s) / 2, y + (cell - s) / 2, s, s); };
    const xs = () => { const a = cell * 0.2, b = cell * 0.8; ctx.beginPath(); ctx.moveTo(x + a, y + a); ctx.lineTo(x + b, y + b); ctx.moveTo(x + b, y + a); ctx.lineTo(x + a, y + b); ctx.stroke(); };
    if (v > 0.7) ctx.fillRect(x, y, cell + 0.5, cell + 0.5);
    else if (v > 0.6) sq(r > 0.25 ? 0.82 : 0.5);
    else if (v > 0.53) { if (r > 0.45) sq(0.62); else xs(); }
    else if (v > 0.47) { if (r > 0.6) sq(0.4); else if (r > 0.25) xs(); else sq(0.22); }
    else if (v > 0.42 && r > 0.55) sq(0.2);
  }
  ctx.restore();
}

/* Logo d'édition : SVG officiel pour 2026, sinon lettrage pixellisé "MICI<aa>" */
function pixelWord(text, h) {
  const ph = 15, c = makeCanvas(140, ph + 2), x = c.getContext('2d');
  x.font = `italic 900 ${ph + 3}px "Arial Black", Arial, sans-serif`; x.textBaseline = 'alphabetic'; x.fillStyle = '#fff';
  const tw = Math.ceil(x.measureText(text).width) + 2; x.fillText(text, 1, ph);
  const d = x.getImageData(0, 0, tw, ph + 2).data, k = h / (ph + 2), o = makeCanvas(Math.ceil(tw * k), Math.ceil(h)), ox = o.getContext('2d');
  ox.fillStyle = '#fff';
  for (let j = 0; j < ph + 2; j++) for (let i = 0; i < tw; i++) if (d[(j * tw + i) * 4 + 3] > 110) ox.fillRect(i * k, j * k, k + 0.6, k + 0.6);
  return o;
}
const wordCache = {};
function drawLogo(ctx, cx, cy, w, ed) {
  const yy = String(ed.year).slice(2);
  let top = yy === '26' ? assets.mici26 : null;
  if (!top) top = wordCache[yy] ||= pixelWord('MICI' + yy, 120);
  const th = w * top.height / top.width;
  const ch = assets.challenge, cw = w * 0.985, chh = ch ? cw * ch.height / ch.width : 0, gap = w * 0.035;
  const y = cy - (th + gap + chh) / 2;
  ctx.drawImage(top, cx - w / 2, y, w, th);
  if (ch) ctx.drawImage(ch, cx - cw / 2, y + th + gap, cw, chh);
  else { ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = `700 ${w * 0.16}px Georgia, serif`; ctx.fillText('CHALLENGE', cx, y + th + gap + w * 0.14); }
}
function drawCelltrion(ctx, cx, cy, w) {
  const im = assets.celltrion; if (!im) return;
  const h = w * im.height / im.width; ctx.drawImage(im, cx - w / 2, cy - h / 2, w, h);
}
function cross(ctx, x, y, s) { ctx.beginPath(); ctx.moveTo(x - s, y - s); ctx.lineTo(x + s, y + s); ctx.moveTo(x + s, y - s); ctx.lineTo(x - s, y + s); ctx.stroke(); }
function glowStroke(ctx, color, lw, path) {
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = color;
  ctx.shadowColor = color; ctx.shadowBlur = lw * 1.2; ctx.globalAlpha = 0.55; ctx.lineWidth = lw * 1.25; path(); ctx.stroke();
  ctx.shadowBlur = lw * 0.3; ctx.globalAlpha = 1; ctx.lineWidth = lw; path(); ctx.stroke();
  ctx.restore();
}

/* ---------- Mur LED du fond ---------- */
export function paintWall(c, ed) {
  const x = c.getContext('2d'), W = c.width, H = c.height, u = W / 2048;
  x.fillStyle = BLACK; x.fillRect(0, 0, W, H);
  const A = ed.teamA.color, B = ed.teamB.color;
  glowStroke(x, A, 64 * u, () => { x.beginPath(); x.moveTo(960 * u, 140 * u); x.bezierCurveTo(900 * u, 20 * u, 1300 * u, 10 * u, 2080 * u, -40 * u); });
  glowStroke(x, A, 64 * u, () => { x.beginPath(); x.moveTo(1010 * u, 208 * u); x.bezierCurveTo(1300 * u, 240 * u, 1700 * u, 150 * u, 2100 * u, 70 * u); });
  glowStroke(x, A, 60 * u, () => { x.beginPath(); x.moveTo(-60 * u, 250 * u); x.lineTo(110 * u, 250 * u); });
  glowStroke(x, B, 64 * u, () => { x.beginPath(); x.moveTo(2100 * u, 470 * u); x.bezierCurveTo(1900 * u, 520 * u, 1840 * u, 620 * u, 1870 * u, 700 * u); x.bezierCurveTo(1900 * u, 780 * u, 2000 * u, 790 * u, 2100 * u, 780 * u); });
  glowStroke(x, B, 58 * u, () => { x.beginPath(); x.moveTo(-60 * u, 1080 * u); x.lineTo(560 * u, 1085 * u); });
  // cadre fin + repères
  x.strokeStyle = 'rgba(255,255,255,.8)'; x.lineWidth = 2.5 * u;
  const fx = 120 * u, fy = 135 * u, fw = W - 270 * u, fh = H - 235 * u;
  x.strokeRect(fx, fy, fw, fh);
  x.fillStyle = '#fff';
  for (const [px, py] of [[fx, fy], [fx + fw, fy], [fx, fy + fh], [fx + fw, fy + fh]]) {
    x.beginPath(); const s = 11 * u;
    x.moveTo(px, py - s); x.quadraticCurveTo(px, py, px + s, py); x.quadraticCurveTo(px, py, px, py + s); x.quadraticCurveTo(px, py, px - s, py); x.quadraticCurveTo(px, py, px, py - s); x.fill();
  }
  drawLogo(x, W / 2, H * 0.53, 470 * u, ed);
  // joints des dalles LED
  x.fillStyle = 'rgba(0,0,0,.28)';
  for (let i = 1; i < 12; i++) x.fillRect(Math.round(i * W / 12), 0, 1.5 * u, H);
  for (let j = 1; j < 7; j++) x.fillRect(0, Math.round(j * H / 7), W, 1.5 * u);
}

/* ---------- Écrans d'équipe ---------- */
export function paintTeamTV(c, ed, side) {
  const x = c.getContext('2d'), W = c.width, H = c.height, u = W / 1024, team = side === 'A' ? ed.teamA : ed.teamB;
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1d1e22'); g.addColorStop(1, '#141518');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  drawLogo(x, W / 2, 62 * u, 78 * u, ed);
  x.textBaseline = 'middle'; x.font = `500 ${92 * u}px ${FONT}`;
  const a = team.label + ' ', wa = x.measureText(a).width, wb = x.measureText(team.tag).width, sx = (W - wa - wb) / 2;
  x.textAlign = 'left'; x.fillStyle = '#eceeed'; x.fillText(a, sx, 205 * u);
  x.fillStyle = team.color; x.fillText(team.tag, sx + wa, 205 * u);
  // trame en bas d'écran
  if (side === 'A') {
    dither(x, 130 * u, 400 * u, 764 * u, 176 * u, team.color, { seed: 5, cell: 9 * u, scale: 2.4, bias: 0.12, mask: (nx, ny) => Math.min(1, Math.sin(nx * Math.PI) * 1.6) * Math.min(1, 0.5 + ny) });
    x.fillStyle = team.color; // pointillés en V
    for (let i = 0; i < 16; i++) for (const s of [-1, 1]) x.fillRect(W / 2 + s * (10 + i * 11) * u, (410 - i * 8.5) * u, 3.4 * u, 3.4 * u);
  } else {
    dither(x, 0, 380 * u, W, 196 * u, team.color, { seed: 21, cell: 9 * u, scale: 2.2, bias: 0.1, mask: (nx, ny) => Math.min(1, 0.35 + ny * 0.9) });
  }
}

/* ---------- Façade des pupitres (trame + cartouches) ---------- */
export function paintDeskPanel(c, ed, side) {
  const x = c.getContext('2d'), W = c.width, H = c.height, team = side === 'A' ? ed.teamA : ed.teamB;
  x.fillStyle = '#0f0f11'; x.fillRect(0, 0, W, H);
  dither(x, 0, 0, W, H, team.color, { seed: side === 'A' ? 11 : 31, cell: H / 40, scale: 2.6, bias: 0.07 });
  const cw = W * 0.105, ch = H * 0.62, cy = (H - ch) / 2, cxs = [W * 0.085, W * 0.915];
  const [logoX, teamX] = side === 'A' ? cxs : [cxs[1], cxs[0]];
  x.fillStyle = BLACK;
  for (const cx of cxs) x.fillRect(cx - cw / 2, cy, cw, ch);
  // cartouche logo × Celltrion
  drawLogo(x, logoX, cy + ch * 0.2, cw * 0.72, ed);
  x.strokeStyle = 'rgba(255,255,255,.75)'; x.lineWidth = H * 0.004; cross(x, logoX, cy + ch * 0.5, H * 0.012);
  drawCelltrion(x, logoX, cy + ch * 0.8, cw * 0.74);
  // cartouche équipe
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `600 ${H * 0.062}px ${FONT}`;
  x.fillStyle = '#eceeed'; x.fillText(team.label, teamX, cy + ch * 0.44);
  x.fillStyle = team.color; x.fillText(team.tag, teamX, cy + ch * 0.56);
}

/* ---------- Moniteur encastré dans les pupitres ---------- */
export function paintDeskMonitor(c, ed) {
  const x = c.getContext('2d'), W = c.width, H = c.height, u = W / 1024;
  x.fillStyle = '#101114'; x.fillRect(0, 0, W, H);
  x.globalAlpha = 0.5;
  glowStroke(x, ed.teamA.color, 16 * u, () => { x.beginPath(); x.moveTo(-20 * u, 300 * u); x.bezierCurveTo(200 * u, 180 * u, 380 * u, 120 * u, 520 * u, -20 * u); });
  glowStroke(x, ed.teamB.color, 16 * u, () => { x.beginPath(); x.moveTo(1040 * u, 250 * u); x.bezierCurveTo(820 * u, 380 * u, 700 * u, 470 * u, 600 * u, 600 * u); });
  x.globalAlpha = 1; x.fillStyle = 'rgba(12,12,15,.55)'; x.fillRect(0, 0, W, H);
  drawLogo(x, W / 2, 150 * u, 300 * u, ed);
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#eceeed';
  x.font = `500 ${34 * u}px ${FONT}`; x.fillText(ed.theme, W / 2, 285 * u);
  x.fillStyle = 'rgba(236,238,237,.7)'; x.font = `500 ${24 * u}px ${FONT}`; x.fillText('En ligne', W / 2, 370 * u);
  x.fillStyle = '#eceeed'; x.font = `600 ${40 * u}px ${FONT}`; x.fillText(ed.date.toUpperCase(), W / 2, 425 * u);
  x.fillStyle = 'rgba(236,238,237,.85)'; x.font = `500 ${28 * u}px ${FONT}`; x.fillText(ed.time, W / 2, 480 * u);
}

/* ---------- Pupitre central ---------- */
export function paintLectern(c, ed) {
  const x = c.getContext('2d'), W = c.width, H = c.height;
  x.fillStyle = BLACK; x.fillRect(0, 0, W, H);
  const edge = (nx) => Math.max(0, 1 - nx * 1.15);
  dither(x, 0, 0, W * 0.2, H, ed.teamA.color, { seed: 41, cell: H / 46, scale: 3, bias: 0.2, mask: (nx) => edge(nx) });
  dither(x, W * 0.8, 0, W * 0.2, H, ed.teamB.color, { seed: 43, cell: H / 46, scale: 3, bias: 0.2, mask: (nx) => edge(1 - nx) });
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#f1f2f0';
  let fs = H * 0.15; x.font = `500 ${fs}px ${FONT}`;
  const mw = Math.max(...ed.lectern.map((l) => x.measureText(l).width));
  if (mw > W * 0.56) { fs *= (W * 0.56) / mw; x.font = `500 ${fs}px ${FONT}`; }
  ed.lectern.forEach((l, i) => x.fillText(l, W / 2, H * 0.44 + (i - (ed.lectern.length - 1) / 2) * fs * 1.08));
  drawLogo(x, W * 0.41, H * 0.875, W * 0.085, ed);
  x.strokeStyle = 'rgba(255,255,255,.7)'; x.lineWidth = H * 0.003; cross(x, W * 0.5, H * 0.875, H * 0.009);
  drawCelltrion(x, W * 0.59, H * 0.875, W * 0.1);
}
