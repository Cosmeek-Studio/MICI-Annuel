import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/* Palettes par édition : fond d'écran, accents lumineux */
export const EDITIONS = {
  2023: { bg: ['#3b2a8a', '#8f6bd6', '#d9c3ff'], accent: '#a78bfa', rim: '#7c5cff', ring: '#ffb066' },
  2024: { bg: ['#6a63d8', '#a9a4f0', '#e3dcff'], accent: '#b9a4ff', rim: '#8a6bff', ring: '#ffb066' },
  2025: { bg: ['#0f6b78', '#43c5c9', '#c9fbf0'], accent: '#53ffbd', rim: '#2bd3b0', ring: '#ffd27a' },
  2026: { bg: ['#9c2b4f', '#ff6a5c', '#ffd9b8'], accent: '#ff8d6b', rim: '#ff5a7a', ring: '#ffe08a' },
};

function mulberry(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/* Texture d'écran : bokeh + "anticorps" symétrique */
function drawScreen(ctx, w, h, pal, seed = 1, t = 0) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, pal.bg[0]); g.addColorStop(0.55, pal.bg[1]); g.addColorStop(1, pal.bg[2]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  const rnd = mulberry(seed);
  for (let i = 0; i < 26; i++) {
    const x = rnd() * w, y = rnd() * h, r = 12 + rnd() * 50;
    const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  }
  // Molécule symétrique (en forme de Y inversé) faite de blobs
  ctx.save(); ctx.translate(w / 2, h / 2); ctx.globalCompositeOperation = 'lighter';
  const r2 = mulberry(seed * 7 + 3);
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 160; i++) {
      const k = i / 160, ang = -0.5 + k * 1.2;
      const x = side * (30 + Math.cos(ang) * k * w * 0.26 + (r2() - 0.5) * 40);
      const y = Math.sin(ang * 2) * h * 0.28 * (0.4 + k) + (r2() - 0.5) * 40 + Math.sin(t * 1.2 + i * 0.1) * 2;
      const rr = 6 + r2() * 20;
      const gr = ctx.createRadialGradient(x, y, 0, x, y, rr);
      gr.addColorStop(0, 'rgba(255,255,255,.22)'); gr.addColorStop(0.5, pal.accent + '55'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, rr, 0, 7); ctx.fill();
    }
  }
  ctx.restore();
}

function screenCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

export function createStage(canvas, { onReady, onHotspots } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#2b2b2f');
  scene.fog = new THREE.Fog('#2b2b2f', 22, 40);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const HOME = { pos: new THREE.Vector3(0, 3.7, 17.5), target: new THREE.Vector3(0, 1.75, -1.2) };
  camera.position.copy(HOME.pos);

  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(HOME.target);
  controls.enableDamping = true; controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.minDistance = 7; controls.maxDistance = 24;
  controls.minPolarAngle = 0.95; controls.maxPolarAngle = 1.6;
  controls.minAzimuthAngle = -0.75; controls.maxAzimuthAngle = 0.75;
  controls.zoomSpeed = 0.6; controls.rotateSpeed = 0.5;
  controls.update();

  // --- Matériaux ---
  const M = {
    floor: new THREE.MeshStandardMaterial({ color: '#6c6c7c', roughness: 0.45, metalness: 0.1 }),
    stageEdge: new THREE.MeshStandardMaterial({ color: '#16161a', roughness: 0.6 }),
    wall: new THREE.MeshStandardMaterial({ color: '#2a2a30', roughness: 0.85 }),
    slat: new THREE.MeshStandardMaterial({ color: '#2a2a2f', roughness: 0.7, metalness: 0.1 }),
    truss: new THREE.MeshStandardMaterial({ color: '#d9dce3', roughness: 0.32, metalness: 0.85 }),
    black: new THREE.MeshStandardMaterial({ color: '#0e0e11', roughness: 0.5, metalness: 0.3 }),
    desk: new THREE.MeshStandardMaterial({ color: '#b9bcc4', roughness: 0.4, metalness: 0.4 }),
    deskTop: new THREE.MeshStandardMaterial({ color: '#d4d6dc', roughness: 0.3, metalness: 0.2 }),
    stool: new THREE.MeshStandardMaterial({ color: '#2a2a30', roughness: 0.5, metalness: 0.4 }),
    chrome: new THREE.MeshStandardMaterial({ color: '#c8ccd4', roughness: 0.2, metalness: 1 }),
  };
  const accentMat = new THREE.MeshBasicMaterial({ color: '#8a6bff', toneMapped: false });
  const ringMat = new THREE.MeshBasicMaterial({ color: '#ffb066', toneMapped: false });
  const tubeMat = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false });

  const world = new THREE.Group(); scene.add(world);

  // --- Lumières ---
  scene.add(new THREE.HemisphereLight('#b3acdf', '#2a2a33', 1.5));
  const key = new THREE.DirectionalLight('#ffffff', 1.1);
  key.position.set(4, 10, 10); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -9, right: 9, top: 7, bottom: -7, near: 1, far: 30 });
  key.shadow.bias = -0.0005; scene.add(key);
  const glowL = new THREE.PointLight('#8a6bff', 7, 9, 1.8); glowL.position.set(-4.2, 1.6, 1.4); scene.add(glowL);
  const glowR = glowL.clone(); glowR.position.x = 4.2; scene.add(glowR);
  const glowC = new THREE.PointLight('#b9a4ff', 12, 12, 1.5); glowC.position.set(0, 2.2, 0.5); scene.add(glowC);
  const ringL = new THREE.PointLight('#ffb066', 5, 6, 1.8); ringL.position.set(-3.2, 2.8, -2.2); scene.add(ringL);
  const ringR = ringL.clone(); ringR.position.x = 3.2; scene.add(ringR);

  // --- Plateau (sol) ---
  const FW = 15, FD = 10;
  const floorTex = (() => {
    const c = screenCanvas(512, 512), x = c.getContext('2d');
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, 512, 512);
    x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 3; x.strokeRect(0, 0, 512, 512);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(FW / 2.5, FD / 2.5);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
  })();
  M.floor.map = floorTex;
  const floor = new THREE.Mesh(new THREE.BoxGeometry(FW, 0.5, FD), [M.stageEdge, M.stageEdge, M.floor, M.stageEdge, M.stageEdge, M.stageEdge]);
  floor.position.set(0, -0.25, 0); floor.receiveShadow = true; world.add(floor);
  const lip = new THREE.Mesh(new THREE.BoxGeometry(FW + 0.3, 0.12, 0.3), M.black); lip.position.set(0, 0.0, FD / 2 + 0.1); world.add(lip);

  // --- Murs : fond lamellé + côtés ---
  const BZ = -FD / 2 + 0.6;
  const back = new THREE.Mesh(new THREE.BoxGeometry(FW - 2.4, 6, 0.2), M.wall); back.position.set(0, 3, BZ - 0.1); back.receiveShadow = true; world.add(back);
  const slats = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 5.8, 0.14), M.slat, 56);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 56; i++) { dummy.position.set(-6.2 + i * 0.225, 2.95, BZ + 0.05); dummy.updateMatrix(); slats.setMatrixAt(i, dummy.matrix); }
  slats.castShadow = true; slats.receiveShadow = true; world.add(slats);
  for (const s of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.25, 6.2, FD - 0.6), M.wall);
    wall.position.set(s * (FW / 2 - 0.7), 3.1, 0.3); wall.receiveShadow = true; world.add(wall);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 6.2, FD - 0.6), M.slat); rail.position.set(s * (FW / 2 - 0.84), 3.1, 0.3); world.add(rail);
  }
  // bandeau lumineux au-dessus de l'écran central
  const strip = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.04, 0.04), accentMat); strip.position.set(0, 4.05, BZ + 0.2); world.add(strip);

  // --- Fermes (truss) ---
  function truss(len, axis = 'x', size = 0.32) {
    const g = new THREE.Group(); const hs = size / 2;
    const chordGeo = new THREE.CylinderGeometry(0.028, 0.028, len, 6);
    for (const [a, b] of [[hs, hs], [-hs, hs], [hs, -hs], [-hs, -hs]]) {
      const c = new THREE.Mesh(chordGeo, M.truss); c.position.set(0, a, b); c.rotation.z = Math.PI / 2; c.castShadow = true; g.add(c);
    }
    const n = Math.round(len / size / 1.1), step = len / n;
    const braceGeo = new THREE.CylinderGeometry(0.014, 0.014, 1, 4);
    const addBrace = (p1, p2) => {
      const d = new THREE.Vector3().subVectors(p2, p1), m = new THREE.Mesh(braceGeo, M.truss);
      m.scale.y = d.length(); m.position.copy(p1).addScaledVector(d, 0.5);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); g.add(m);
    };
    for (let i = 0; i < n; i++) {
      const x0 = -len / 2 + i * step, x1 = x0 + step, up = i % 2 === 0;
      addBrace(new THREE.Vector3(x0, up ? -hs : hs, hs), new THREE.Vector3(x1, up ? hs : -hs, hs));
      addBrace(new THREE.Vector3(x0, up ? -hs : hs, -hs), new THREE.Vector3(x1, up ? hs : -hs, -hs));
      addBrace(new THREE.Vector3(x0, hs, up ? -hs : hs), new THREE.Vector3(x1, hs, up ? hs : -hs));
      addBrace(new THREE.Vector3(x0, -hs, up ? -hs : hs), new THREE.Vector3(x1, -hs, up ? hs : -hs));
    }
    if (axis === 'y') g.rotation.z = Math.PI / 2;
    return g;
  }
  const beam = truss(14.4, 'x', 0.34); beam.position.set(0, 4.85, BZ + 1.4); world.add(beam);
  for (const s of [-1, 1]) {
    const col = truss(4.7, 'y', 0.34); col.position.set(s * 5.2, 2.35, BZ + 1.4); world.add(col);
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.9), M.black); base.position.set(s * 5.2, 0.03, BZ + 1.4); world.add(base);
    // tour avec anneau lumineux
    const tower = truss(2.4, 'y', 0.26); tower.position.set(s * 3.1, 1.2, BZ + 1.7); world.add(tower);
    const tb = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.06, 0.7), M.black); tb.position.set(s * 3.1, 0.03, BZ + 1.7); world.add(tb);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.05, 12, 48), ringMat); ring.position.set(s * 3.1, 3.05, BZ + 1.6); ring.userData.isRing = true; world.add(ring);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.4, 40), new THREE.MeshBasicMaterial({ color: '#ffe3c2', toneMapped: false, transparent: true, opacity: 0.85 }));
    disc.position.set(s * 3.1, 3.05, BZ + 1.62); world.add(disc);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.2, 16), M.black); cap.rotation.x = Math.PI / 2; cap.position.set(s * 3.1, 3.05, BZ + 1.5); world.add(cap);
  }

  // --- Projecteurs motorisés + faisceaux ---
  const beams = [];
  const lightPos = [-5.3, -3.2, -1.2, 0, 1.4, 3.1, 5.3];
  lightPos.forEach((x, i) => {
    const head = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.34, 0.4), M.black); body.castShadow = true;
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.11, 16), accentMat.clone()); lens.rotation.x = Math.PI / 2; lens.position.y = -0.171;
    head.add(body, lens);
    head.position.set(x, 4.45, BZ + 1.4); world.add(head);
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.9, 6, 24, 1, true),
      new THREE.MeshBasicMaterial({ color: '#b9a4ff', transparent: true, opacity: 0.045, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false }),
    );
    cone.geometry.translate(0, -3, 0); cone.position.copy(head.position).y -= 0.2; cone.rotation.x = 0.35; world.add(cone);
    beams.push({ cone, lens, phase: i * 0.9, baseX: cone.rotation.x });
  });

  // --- Écrans ---
  const screens = {};
  function makeScreen(name, w, h, pos, rotY, seed) {
    const canvas2 = screenCanvas(1024, Math.round(1024 * h / w)), ctx = canvas2.getContext('2d');
    const tex = new THREE.CanvasTexture(canvas2); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const grp = new THREE.Group(); grp.position.copy(pos); grp.rotation.y = rotY;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, h + 0.1, 0.1), M.black); frame.castShadow = true; grp.add(frame);
    const mat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); face.position.z = 0.056; face.userData.screen = name; grp.add(face);
    // support
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, pos.y - h / 2, 0.1), M.black); leg.position.set(0, -(h / 2 + (pos.y - h / 2) / 2), -0.15); grp.add(leg);
    world.add(grp);
    screens[name] = { grp, canvas: canvas2, ctx, tex, seed, face, mat, w, h };
    return screens[name];
  }
  makeScreen('center', 4.6, 2.6, new THREE.Vector3(0, 2.35, BZ + 0.55), 0, 3);
  makeScreen('left', 2.7, 1.62, new THREE.Vector3(-5.4, 2.15, BZ + 2.5), 0.42, 5);
  makeScreen('right', 2.7, 1.62, new THREE.Vector3(5.4, 2.15, BZ + 2.5), -0.42, 9);

  let edition = 2024, teaserOn = false;
  function paintScreens(t = 0) {
    const pal = EDITIONS[edition];
    for (const s of Object.values(screens)) {
      const { ctx, canvas: c } = s;
      drawScreen(ctx, c.width, c.height, pal, s.seed, t);
      if (s === screens.center && teaserOn) {
        ctx.fillStyle = 'rgba(10,8,30,.55)'; ctx.fillRect(0, 0, c.width, c.height);
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
        ctx.font = '800 130px "Helvetica Neue", Arial, sans-serif'; ctx.fillText('MICI', c.width / 2 - 150, c.height / 2 - 10);
        ctx.font = '700 40px "Helvetica Neue", Arial, sans-serif'; ctx.fillText('CHALLENGE', c.width / 2 + 160, c.height / 2 - 62);
        ctx.font = '800 82px "Helvetica Neue", Arial, sans-serif'; ctx.fillText(String(edition), c.width / 2 + 160, c.height / 2 + 5);
        ctx.font = '500 34px "Helvetica Neue", Arial, sans-serif';
        const msg = edition === 2026 ? '« L’IA au cœur des débats »' : 'Les idées se rencontrent. Les points de vue se challengent.';
        ctx.fillText(msg, c.width / 2, c.height / 2 + 100);
        const p = (Math.sin(t * 2) + 1) / 2;
        ctx.fillStyle = `rgba(191,255,77,${0.5 + p * 0.5})`; ctx.fillRect(c.width / 2 - 120, c.height / 2 + 130, 240 * (0.2 + p * 0.8), 6);
      }
      s.tex.needsUpdate = true;
    }
    // teinte lumière / accents
    accentMat.color.set(pal.rim); ringMat.color.set(pal.ring);
    glowL.color.set(pal.rim); glowR.color.set(pal.rim); glowC.color.set(pal.accent); ringL.color.set(pal.ring); ringR.color.set(pal.ring);
    for (const b of beams) { b.cone.material.color.set(pal.accent); b.lens.material.color.set(pal.accent); }
    for (const d of deskGlows) d.material.color.set(d.userData.alt ? '#53ffbd' : pal.rim);
  }

  // --- Pupitres ---
  const deskGlows = [];
  function logoTex(text = 'MICI CHALLENGE') {
    const c = screenCanvas(512, 256), x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 512, 256); g.addColorStop(0, '#1b3fd1'); g.addColorStop(1, '#2b53ff');
    x.fillStyle = g; x.fillRect(0, 0, 512, 256);
    x.fillStyle = '#fff'; x.textAlign = 'left'; x.font = '900 70px "Helvetica Neue", Arial'; x.fillText('MICI', 40, 130);
    x.font = '700 26px "Helvetica Neue", Arial'; x.fillText('CHALLENGE', 40, 168);
    x.fillStyle = 'rgba(255,255,255,.6)'; x.font = '500 18px "Helvetica Neue", Arial'; x.fillText('Celltrion Healthcare', 40, 206);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const deskLogo = logoTex();
  function desk(len, depth, pos, rotY, alt) {
    const g = new THREE.Group(); g.position.copy(pos); g.rotation.y = rotY;
    const top = new THREE.Mesh(new THREE.BoxGeometry(depth, 0.07, len), M.deskTop); top.position.y = 1.02; top.castShadow = top.receiveShadow = true; g.add(top);
    const body = new THREE.Mesh(new THREE.BoxGeometry(depth * 0.86, 0.95, len * 0.94), M.desk); body.position.y = 0.5; body.castShadow = true; g.add(body);
    const base = new THREE.Mesh(new THREE.BoxGeometry(depth * 1.05, 0.06, len * 1.02), M.black); base.position.y = 0.04; g.add(base);
    const glow = new THREE.Mesh(new THREE.BoxGeometry(depth * 1.08, 0.035, len * 1.05), accentMat.clone()); glow.position.y = 0.1; glow.userData.alt = alt; deskGlows.push(glow); g.add(glow);
    // écran logo sur la face intérieure
    const lg = new THREE.Mesh(new THREE.PlaneGeometry(len * 0.82, 0.78), new THREE.MeshBasicMaterial({ map: deskLogo, toneMapped: false }));
    lg.position.set(0, 0.55, 0); lg.userData.deskLogo = true; g.add(lg);
    return g;
  }
  // pupitre central (face caméra)
  const cd = desk(2.4, 0.8, new THREE.Vector3(0, 0, BZ + 2.4), 0, false);
  cd.rotation.y = Math.PI / 2; // long axis sur x
  // écran logo placé à l'avant : remplacer le plan
  cd.children.find(c => c.userData.deskLogo).rotation.y = -Math.PI / 2; cd.children.find(c => c.userData.deskLogo).position.set(-0.41, 0.55, 0);
  world.add(cd);
  // micros
  function mics(group, len, n = 3) {
    for (let i = 0; i < n; i++) {
      const z = -len / 2 + (i + 0.5) * (len / n);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 8), M.black); m.position.set(0.1, 1.17, z); group.add(m);
      const paper = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.005, 0.2), new THREE.MeshStandardMaterial({ color: '#f3f3f3', roughness: 0.9 })); paper.position.set(-0.05, 1.06, z); group.add(paper);
    }
  }
  mics(cd, 0.0001, 0);
  for (const dx of [-0.8, 0, 0.8]) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 8), M.black); m.position.set(dx, 1.17, -0.1); cd.add(m);
  }

  // pupitres latéraux
  const sideDesks = [];
  for (const s of [-1, 1]) {
    const d = desk(2.7, 0.8, new THREE.Vector3(s * 4.5, 0, 0.7), s * 0.28, s === -1);
    // face logo tournée vers l'intérieur
    const lg = d.children.find(c => c.userData.deskLogo); lg.rotation.y = s === -1 ? Math.PI / 2 : -Math.PI / 2; lg.position.x = s === -1 ? 0.41 : -0.41;
    mics(d, 2.7, 3);
    world.add(d); sideDesks.push(d);
    // tabourets (côté extérieur)
    for (let i = 0; i < 3; i++) {
      const st = new THREE.Group();
      const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 20), M.stool); seat.position.y = 0.72; seat.castShadow = true;
      const back2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.34, 0.04), M.stool); back2.position.set(s * 0.18, 0.95, 0); back2.rotation.y = Math.PI / 2;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 8), M.chrome); post.position.y = 0.36;
      const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.014, 8, 24), M.chrome); ring2.rotation.x = Math.PI / 2; ring2.position.y = 0.25;
      const bs = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.04, 20), M.chrome); bs.position.y = 0.02;
      st.add(seat, back2, post, ring2, bs);
      st.position.set(s * 0.95, 0, -1.0 + i * 1.0); d.add(st);
    }
  }
  // tubes LED
  for (const [x, z] of [[-1.9, BZ + 2.3], [1.9, BZ + 2.3], [-6.3, BZ + 3.6], [6.3, BZ + 3.6]]) {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.7, 8), tubeMat); tube.position.set(x, 0.95, z); world.add(tube);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 12), M.black); foot.position.set(x, 0.015, z); world.add(foot);
  }

  // --- Poussière en suspension (ambiance) ---
  const dustN = 160, dustGeo = new THREE.BufferGeometry(), dp = new Float32Array(dustN * 3);
  for (let i = 0; i < dustN; i++) { dp[i * 3] = (Math.random() - 0.5) * 12; dp[i * 3 + 1] = Math.random() * 5; dp[i * 3 + 2] = (Math.random() - 0.5) * 8; }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: '#e8e0ff', size: 0.025, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
  world.add(dust);

  // --- Interaction : survol & clic ---
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(-9, -9);
  let hovered = null, mx = 0, my = 0, parX = 0, parY = 0;
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    mx = ptr.x; my = ptr.y;
  });
  canvas.addEventListener('pointerleave', () => { ptr.set(-9, -9); mx = my = 0; });
  let downAt = null;
  canvas.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; idleUntil = performance.now() + 5000; onInteract?.(); });
  canvas.addEventListener('pointerup', (e) => {
    if (!downAt) return; const moved = Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]); downAt = null;
    if (moved < 6 && hovered) handlers.click?.(hovered);
  });
  let onInteract = null, idleUntil = 0;
  const handlers = {};

  // --- Caméra : transitions ---
  let fly = null;
  function flyTo(pos, target, ms = 1400) {
    fly = { t0: performance.now(), ms, p0: camera.position.clone(), t0v: controls.target.clone(), p1: pos.clone(), t1: target.clone() };
    controls.enabled = false;
  }
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const views = {
    home: () => flyTo(HOME.pos, HOME.target),
    center: () => flyTo(new THREE.Vector3(0, 2.5, 6.4), new THREE.Vector3(0, 2.3, BZ)),
    left: () => flyTo(new THREE.Vector3(-3.2, 2.2, 4.6), new THREE.Vector3(-5.4, 2.1, BZ + 2.5)),
    right: () => flyTo(new THREE.Vector3(3.2, 2.2, 4.6), new THREE.Vector3(5.4, 2.1, BZ + 2.5)),
  };

  // --- Hotspots HTML projetés ---
  const hsPoints = {
    teaser: () => screens.center.grp.position.clone().add(new THREE.Vector3(0, 0, 0.2)),
    universe: () => screens.left.grp.position.clone().add(new THREE.Vector3(0, -0.15, 0.2)),
    summary: () => screens.right.grp.position.clone().add(new THREE.Vector3(0, -0.15, 0.2)),
  };
  const v = new THREE.Vector3();
  function projectHotspots() {
    const rect = canvas.getBoundingClientRect(), out = {};
    for (const [k, fn] of Object.entries(hsPoints)) {
      v.copy(fn()); world.localToWorld(v); v.project(camera);
      out[k] = { x: (v.x * 0.5 + 0.5) * rect.width, y: (-v.y * 0.5 + 0.5) * rect.height, visible: v.z < 1 };
    }
    onHotspots?.(out);
  }

  // --- Resize ---
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    // cadrer toute la scène sur écrans étroits
    camera.fov = w / h < 1.2 ? 30 + (1.2 - w / h) * 36 : 30; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas); resize();

  // --- Boucle ---
  const clock = new THREE.Clock(); let running = true, visible = true, lastTeaserPaint = 0, first = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 }).observe(canvas);
  paintScreens();

  function frame() {
    requestAnimationFrame(frame);
    if (!running || !visible) return;
    const t = clock.getElapsedTime(), now = performance.now();
    // transition caméra
    if (fly) {
      const k = Math.min(1, (now - fly.t0) / fly.ms), e = ease(k);
      camera.position.lerpVectors(fly.p0, fly.p1, e); controls.target.lerpVectors(fly.t0v, fly.t1, e);
      if (k >= 1) { fly = null; controls.enabled = true; }
    }
    // dérive douce au repos (uniquement vue d'accueil)
    if (!fly && now > idleUntil && !teaserOn && controls.enabled) {
      const off = Math.sin(t * 0.25) * 0.0016; // rotation lente autour de la cible
      const dx = camera.position.x - controls.target.x, dz = camera.position.z - controls.target.z;
      const c = Math.cos(off), s = Math.sin(off);
      camera.position.x = controls.target.x + dx * c - dz * s; camera.position.z = controls.target.z + dx * s + dz * c;
    }
    controls.update();
    // parallaxe douce du décor
    parX += (mx * 0.035 - parX) * 0.05; parY += (my * 0.012 - parY) * 0.05;
    world.rotation.y = parX; world.rotation.x = -parY * 0.4;

    // anim lumières
    for (const b of beams) {
      b.cone.rotation.x = b.baseX + Math.sin(t * 0.7 + b.phase) * 0.12; b.cone.rotation.z = Math.sin(t * 0.5 + b.phase * 1.7) * 0.1;
      b.cone.material.opacity = 0.035 + (Math.sin(t * 1.3 + b.phase) + 1) * 0.012;
    }
    world.children.forEach((o) => { if (o.userData.isRing) o.material.color.set(EDITIONS[edition].ring).multiplyScalar(0.85 + Math.sin(t * 2) * 0.15); });
    const pts = dust.geometry.attributes.position; for (let i = 0; i < dustN; i++) { pts.array[i * 3 + 1] += 0.0015; if (pts.array[i * 3 + 1] > 5) pts.array[i * 3 + 1] = 0; } pts.needsUpdate = true;

    // survol des écrans
    ray.setFromCamera(ptr, camera);
    const hit = ray.intersectObjects(Object.values(screens).map((s) => s.face), false)[0];
    const name = hit ? hit.object.userData.screen : null;
    if (name !== hovered) {
      hovered = name; canvas.style.cursor = name ? 'pointer' : '';
      for (const [k, s] of Object.entries(screens)) s.mat.color.setScalar(k === name ? 1.18 : 1);
    }
    if (teaserOn && t - lastTeaserPaint > 1 / 24) { lastTeaserPaint = t; paintScreens(t); }

    projectHotspots();
    renderer.render(scene, camera);
    if (first) { first = false; onReady?.(); }
  }
  requestAnimationFrame(frame);

  return {
    setEdition(y) { edition = +y; paintScreens(clock.getElapsedTime()); },
    setTeaser(on) { teaserOn = on; paintScreens(clock.getElapsedTime()); },
    view(name) { views[name]?.(); },
    onClick(fn) { handlers.click = fn; },
    onInteract(fn) { onInteract = fn; },
    dispose() { running = false; renderer.dispose(); },
    get edition() { return edition; },
  };
}
