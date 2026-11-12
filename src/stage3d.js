import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { EDITIONS, DEFAULT_EDITION } from './stage/editions.js';
import { loadAssets, makeCanvas, paintWall, paintTeamTV, paintDeskPanel, paintDeskMonitor, paintLectern } from './stage/textures.js';

/* ---------- Géométries utilitaires ---------- */
function rrPath(p, w, h, r) {
  const x = -w / 2, y = -h / 2;
  p.moveTo(x + r, y); p.lineTo(x + w - r, y); p.absarc(x + w - r, y + r, r, -Math.PI / 2, 0);
  p.lineTo(x + w, y + h - r); p.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2);
  p.lineTo(x + r, y + h); p.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
  p.lineTo(x, y + r); p.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
  return p;
}
function octPath(p, w, h, c) {
  const x = w / 2, y = h / 2;
  p.moveTo(-x + c, -y); p.lineTo(x - c, -y); p.lineTo(x, -y + c); p.lineTo(x, y - c);
  p.lineTo(x - c, y); p.lineTo(-x + c, y); p.lineTo(-x, y - c); p.lineTo(-x, -y + c); p.closePath();
  return p;
}
/* Anneau extrudé (coque creuse), centré sur z */
function ringGeo(outer, inner, depth, bevel = 0.012) {
  const s = outer(new THREE.Shape()); s.holes.push(inner(new THREE.Path()));
  const g = new THREE.ExtrudeGeometry(s, { depth: depth - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 14 });
  g.translate(0, 0, -(depth - bevel * 2) / 2); return g;
}
/* Panneau plat avec UV 0..1 sur sa boîte englobante */
function panelGeo(path, w, h) {
  const g = new THREE.ShapeGeometry(path(new THREE.Shape()), 14), p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + 0.5, p.getY(i) / h + 0.5);
  return g;
}

export function createStage(canvas, { onReady, onHotspots, onHover } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#030304');
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.32;

  const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 80);
  const HOME = { pos: new THREE.Vector3(0, 2.2, 8.3), target: new THREE.Vector3(0, 1.2, -2.4) };
  const cam = { pos: HOME.pos.clone(), target: HOME.target.clone() };

  /* ---------- Matériaux ---------- */
  const M = {
    shell: new THREE.MeshPhysicalMaterial({ color: '#ecebe8', roughness: 0.34, clearcoat: 0.25, clearcoatRoughness: 0.35 }),
    floor: new THREE.MeshStandardMaterial({ color: '#cfcac2', roughness: 0.36, metalness: 0.0, envMapIntensity: 0.9 }),
    curtain: new THREE.MeshStandardMaterial({ color: '#060607', roughness: 1, envMapIntensity: 0 }),
    black: new THREE.MeshStandardMaterial({ color: '#0b0b0d', roughness: 0.45, metalness: 0.2 }),
    bezel: new THREE.MeshStandardMaterial({ color: '#070708', roughness: 0.3, metalness: 0.5 }),
    grey: new THREE.MeshStandardMaterial({ color: '#8d9198', roughness: 0.7 }),
    greyDark: new THREE.MeshStandardMaterial({ color: '#3a3c42', roughness: 0.8 }),
    metal: new THREE.MeshStandardMaterial({ color: '#9a9da3', roughness: 0.35, metalness: 0.9 }),
    ptz: new THREE.MeshPhysicalMaterial({ color: '#e9e9e6', roughness: 0.3, clearcoat: 0.4 }),
    paper: new THREE.MeshStandardMaterial({ color: '#f4f4f1', roughness: 0.9 }),
    ledWhite: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.75, 1.75, 1.8) }),
    frameFill: new THREE.MeshStandardMaterial({ color: '#2b2c31', roughness: 0.5, transparent: true, opacity: 0.82 }),
  };
  // LEDs teintées par l'édition : A = côté gauche, B = accent côté droit
  const led = { A: new THREE.MeshBasicMaterial(), B: new THREE.MeshBasicMaterial(), cool: new THREE.MeshBasicMaterial() };

  const world = new THREE.Group(); scene.add(world);
  const shadow = (m, cast = true, recv = true) => { m.castShadow = cast; m.receiveShadow = recv; return m; };
  const mesh = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m; };

  /* ---------- Lumières ---------- */
  scene.add(new THREE.HemisphereLight('#ffffff', '#77747c', 0.4));
  const key = new THREE.DirectionalLight('#fff6ec', 1.35);
  key.position.set(1.5, 9, 6); key.target.position.set(0, 0, -1); scene.add(key, key.target);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 6; key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
  Object.assign(key.shadow.camera, { left: -8, right: 8, top: 8, bottom: -6, near: 1, far: 24 });
  const glow = {
    A1: new THREE.PointLight('#4fb9ea', 26, 10, 2), A2: new THREE.PointLight('#4fb9ea', 20, 9, 2),
    B1: new THREE.PointLight('#f4573b', 14, 8, 2), wall: new THREE.PointLight('#ffffff', 10, 9, 2),
  };
  glow.A1.position.set(-5.4, 1.1, 0.6); glow.A2.position.set(5.4, 1.1, 0.8); glow.B1.position.set(4.2, 1.5, -1.9); glow.wall.position.set(0, 2.2, -3.2);
  scene.add(...Object.values(glow));

  /* ---------- Sol, rideaux ---------- */
  const floor = shadow(mesh(new THREE.PlaneGeometry(26, 22), M.floor, 0, 0, 1), false); floor.rotation.x = -Math.PI / 2; world.add(floor);
  const foldTex = (() => {
    const c = makeCanvas(512, 8), x = c.getContext('2d');
    for (let i = 0; i < 512; i++) { const v = 150 + Math.sin(i * 0.2) * 60 + Math.sin(i * 0.07 + 1) * 40; x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(i, 0, 1, 8); }
    const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.repeat.set(5, 1); return t;
  })();
  M.curtain.bumpMap = foldTex; M.curtain.bumpScale = 4;
  const back = mesh(new THREE.PlaneGeometry(26, 9), M.curtain, 0, 4.5, -5.7); world.add(back);
  for (const s of [-1, 1]) { const w = mesh(new THREE.PlaneGeometry(22, 9), M.curtain, s * 8.2, 4.5, 1); w.rotation.y = -s * Math.PI / 2; world.add(w); }

  /* ---------- Textures d'écran ---------- */
  const mkTex = (w, h) => { const c = makeCanvas(w, h), t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso; return { c, t }; };
  const T = {
    wall: mkTex(2048, 1152), tvA: mkTex(1024, 576), tvB: mkTex(1024, 576),
    deskA: mkTex(2048, 600), deskB: mkTex(2048, 600), monitor: mkTex(1024, 576), lectern: mkTex(1536, 1024),
  };
  const glass = (tex, rough = 0.18) => new THREE.MeshPhysicalMaterial({ color: '#000', roughness: rough, metalness: 0, emissive: '#fff', emissiveMap: tex, emissiveIntensity: 1, clearcoat: 1, clearcoatRoughness: 0.05 });

  /* ---------- Éléments interactifs ---------- */
  const pickables = [], actionMats = {}; // action -> matériaux à éclaircir au survol
  const register = (action, m, mat) => { m.userData.action = action; pickables.push(m); if (mat) (actionMats[action] ||= []).push(mat); };

  /* ---------- Mur LED + estrade ---------- */
  const WALL = { w: 5.9, h: 3.32, y: 2.0, z: -4.75 };
  {
    const mat = new THREE.MeshBasicMaterial({ map: T.wall.t });
    const face = mesh(new THREE.PlaneGeometry(WALL.w, WALL.h), mat, 0, WALL.y, WALL.z); world.add(face); register('trailer', face, mat);
    world.add(mesh(new THREE.BoxGeometry(WALL.w + 0.12, WALL.h + 0.12, 0.2), M.black, 0, WALL.y, WALL.z - 0.11));
    world.add(shadow(mesh(new THREE.BoxGeometry(7.4, 0.32, 1.3), M.shell, 0, 0.16, WALL.z - 0.1)));
    world.add(shadow(mesh(new THREE.BoxGeometry(7.9, 0.16, 1.7), M.shell, 0, 0.08, WALL.z)));
  }

  /* ---------- Rampes LED au plafond ---------- */
  const bar = (len, x, y, z, ry = 0, rz = 0) => {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.set(0, ry, rz);
    g.add(mesh(new THREE.BoxGeometry(len, 0.07, 0.16), M.ledWhite), mesh(new THREE.BoxGeometry(len + 0.04, 0.1, 0.2), M.black, 0, 0.085, 0));
    world.add(g);
  };
  bar(6.0, 0, 4.0, -4.1);
  for (const s of [-1, 1]) bar(5.2, s * 3.25, 4.0, -0.9, s * (Math.PI / 2 - 0.1), 0);

  /* ---------- Doubles cadres lumineux suspendus ---------- */
  for (const s of [-1, 1]) {
    const g = new THREE.Group(); g.position.set(s * 4.0, 2.7, -3.7); g.rotation.y = -s * 0.12;
    const W = 1.12, H = 0.66, R = 0.17, t = 0.075;
    const geo = ringGeo((p) => rrPath(p, W, H, R), (p) => rrPath(p, W - 2 * t, H - 2 * t, R - t * 0.7), 0.09, 0.008);
    const fill = panelGeo((p) => rrPath(p, W - 2 * t, H - 2 * t, R - t * 0.7), W, H);
    [[-s * 0.2, -0.2, 0.06], [s * 0.2, 0.2, -0.06]].forEach(([x, y, z]) => {
      g.add(mesh(geo, M.ledWhite, x, y, z), mesh(fill, M.frameFill, x, y, z));
      for (const dx of [-0.35, 0.35]) g.add(mesh(new THREE.CylinderGeometry(0.004, 0.004, 3, 4), M.black, x + dx, y + H / 2 + 1.5, z));
    });
    world.add(g);
  }

  /* ---------- Portiques LED latéraux ---------- */
  function portal(w, h, mat, { r = 0.24, t = 0.1, d = 0.24, fill = M.grey } = {}) {
    const g = new THREE.Group();
    const inner = (p) => rrPath(p, w - 2 * t, h - 2 * t, Math.max(0.04, r - t * 0.7));
    const ring = mesh(ringGeo((p) => rrPath(p, w, h, r), inner, d, 0.02), mat, 0, h / 2, 0);
    const pan = shadow(mesh(panelGeo(inner, w, h), fill, 0, h / 2, -0.02)); pan.material.side = THREE.DoubleSide;
    g.add(ring, pan); return g;
  }
  const place = (o, x, z, ry, y = 0) => { o.position.set(x, y, z); o.rotation.y = ry; world.add(o); return o; };
  // gauche
  place(portal(3.3, 1.55, led.A), -5.75, 1.9, 1.15);
  place(portal(0.95, 2.5, led.A, { r: 0.2 }), -4.55, -1.35, 0.55);
  place(portal(2.25, 1.45, led.cool, { r: 0.22 }), -3.45, -2.85, 0.2);
  // droite (le portique vertical prend la couleur de l'équipe B)
  place(portal(3.3, 1.55, led.A), 5.75, 1.9, -1.15);
  place(portal(0.95, 2.5, led.B, { r: 0.2 }), 4.55, -1.35, -0.55);
  place(portal(2.25, 1.45, led.cool, { r: 0.22 }), 3.45, -2.85, -0.2);

  /* ---------- Caméras PTZ sur colonne ---------- */
  function ptz() {
    const g = new THREE.Group();
    g.add(shadow(mesh(new THREE.CylinderGeometry(0.085, 0.095, 0.07, 24), M.ptz, 0, 0.035, 0)));
    g.add(shadow(mesh(new THREE.BoxGeometry(0.05, 0.16, 0.14), M.ptz, 0.09, 0.14, 0)), shadow(mesh(new THREE.BoxGeometry(0.05, 0.16, 0.14), M.ptz, -0.09, 0.14, 0)));
    const head = shadow(mesh(new THREE.SphereGeometry(0.085, 24, 16), M.ptz, 0, 0.17, 0)); head.scale.set(0.85, 1, 1.15); g.add(head);
    const lens = mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.06, 20), M.bezel, 0, 0.17, 0.09); lens.rotation.x = Math.PI / 2; g.add(lens);
    return g;
  }
  for (const s of [-1, 1]) {
    const g = new THREE.Group(); g.position.set(s * 3.05, 0, -3.55); g.rotation.y = -s * 0.25;
    g.add(shadow(mesh(new THREE.BoxGeometry(0.85, 1.62, 0.5), M.grey, 0, 0.81, 0)));
    for (const dx of [-0.2, 0.2]) { const c = ptz(); c.position.set(dx, 1.62, 0.02); c.rotation.y = -s * 0.2; g.add(c); }
    world.add(g);
  }

  /* ---------- Pupitres d'équipe ---------- */
  function teamDesk(side) {
    const g = new THREE.Group(), L = 3.5, H = 1.02, D = 0.74, R = 0.3, t = 0.075, cy = 0.1 + H / 2;
    const inner = (p) => rrPath(p, L - 2 * t, H - 2 * t, R - t * 0.6);
    g.add(shadow(mesh(ringGeo((p) => rrPath(p, L, H, R), inner, D), M.shell, 0, cy, 0)));
    const panelMat = new THREE.MeshStandardMaterial({ map: T['desk' + side].t, roughness: 0.55, envMapIntensity: 0.5 });
    const panel = mesh(panelGeo(inner, L - 2 * t, H - 2 * t), panelMat, 0, cy, D / 2 - 0.11); g.add(panel);
    const backP = mesh(panelGeo(inner, L - 2 * t, H - 2 * t), M.greyDark, 0, cy, -D / 2 + 0.06); backP.rotation.y = Math.PI; g.add(backP);
    // moniteur encastré
    const mw = 1.42, mh = 0.8, mz = D / 2 - 0.11;
    g.add(mesh(new THREE.BoxGeometry(mw + 0.05, mh + 0.05, 0.05), M.bezel, 0, cy, mz + 0.026));
    const monMat = glass(T.monitor.t), mon = mesh(new THREE.PlaneGeometry(mw, mh), monMat, 0, cy, mz + 0.053); g.add(mon);
    // roulettes
    for (const x of [-1.35, -0.45, 0.45, 1.35]) for (const z of [-0.22, 0.22]) {
      const w = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.04, 14), M.black, x, 0.045, z); w.rotation.x = Math.PI / 2; g.add(w);
      g.add(mesh(new THREE.BoxGeometry(0.05, 0.03, 0.05), M.metal, x, 0.1, z));
    }
    // sur le plateau : feuille, stylo, télécommande
    const top = 0.1 + H;
    g.add(mesh(new THREE.BoxGeometry(0.3, 0.004, 0.21), M.paper, 0.15, top + 0.003, 0.02));
    g.add(mesh(new THREE.BoxGeometry(0.16, 0.022, 0.045), M.black, -0.12, top + 0.012, 0.05));
    register('team' + side, panel, panelMat); register('team' + side, mon, monMat);
    g.traverse((o) => { if (o.isMesh && !o.userData.action) register('team' + side, o); });
    return g;
  }
  const deskA = place(teamDesk('A'), -2.85, 0.9, 1.05), deskB = place(teamDesk('B'), 2.85, 0.9, -1.05);

  /* ---------- Écrans d'équipe sur pied ---------- */
  function teamTV(side) {
    const g = new THREE.Group(), w = 1.75, h = w * 9 / 16, y = 2.0;
    g.add(shadow(mesh(new THREE.BoxGeometry(0.95, 0.04, 0.62), M.black, 0, 0.02, -0.1)));
    g.add(shadow(mesh(new THREE.BoxGeometry(0.16, y, 0.09), M.grey, 0, y / 2, -0.12)));
    g.add(shadow(mesh(new THREE.BoxGeometry(w + 0.04, h + 0.04, 0.06), M.bezel, 0, y, 0)));
    const mat = glass(T['tv' + side].t, 0.32), face = mesh(new THREE.PlaneGeometry(w, h), mat, 0, y, 0.031); g.add(face);
    register('team' + side, face, mat);
    return g;
  }
  const tvA = place(teamTV('A'), -4.15, 0.55, 0.8), tvB = place(teamTV('B'), 4.15, 0.55, -0.8);

  /* ---------- Pupitre central ---------- */
  const lectern = new THREE.Group();
  {
    const W = 1.86, H = 1.26, C = 0.3, t = 0.07, D = 0.56, cy = 0.16 + H / 2;
    const inner = (p) => octPath(p, W - 2 * t, H - 2 * t, C - t * 0.42);
    lectern.add(shadow(mesh(ringGeo((p) => octPath(p, W, H, C), inner, D), M.shell, 0, cy, 0)));
    const mat = glass(T.lectern.t, 0.3), face = mesh(panelGeo(inner, W - 2 * t, H - 2 * t), mat, 0, cy, D / 2 - 0.05); lectern.add(face);
    const bk = mesh(panelGeo(inner, W - 2 * t, H - 2 * t), M.greyDark, 0, cy, -D / 2 + 0.05); bk.rotation.y = Math.PI; lectern.add(bk);
    for (const x of [-0.5, 0.5]) lectern.add(shadow(mesh(new THREE.BoxGeometry(0.07, 0.18, D * 0.9), M.shell, x, 0.09, 0)));
    lectern.add(mesh(new THREE.BoxGeometry(0.16, 0.022, 0.045), M.black, 0.05, 0.16 + H + 0.012, 0.05));
    register('summary', face, mat);
    lectern.traverse((o) => { if (o.isMesh && !o.userData.action) register('summary', o); });
    place(lectern, 0, -2.35, 0);
  }

  /* ---------- Édition : repeint les écrans et reteinte les LEDs ---------- */
  let edition = DEFAULT_EDITION;
  const col = new THREE.Color();
  function applyEdition() {
    const ed = EDITIONS[edition];
    paintWall(T.wall.c, ed); paintTeamTV(T.tvA.c, ed, 'A'); paintTeamTV(T.tvB.c, ed, 'B');
    paintDeskPanel(T.deskA.c, ed, 'A'); paintDeskPanel(T.deskB.c, ed, 'B'); paintDeskMonitor(T.monitor.c, ed); paintLectern(T.lectern.c, ed);
    for (const k in T) T[k].t.needsUpdate = true;
    led.A.color.set(ed.teamA.color).lerp(col.set('#ffffff'), 0.22).multiplyScalar(1.55);
    led.B.color.set(ed.teamB.color).lerp(col.set('#ffffff'), 0.12).multiplyScalar(1.6);
    led.cool.color.set(ed.teamA.color).lerp(col.set('#ffffff'), 0.62).multiplyScalar(1.45);
    glow.A1.color.set(ed.teamA.color); glow.A2.color.set(ed.teamA.color); glow.B1.color.set(ed.teamB.color);
  }

  /* ---------- Rendu : bloom sur les LEDs ---------- */
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.22, 0.55, 1.12); composer.addPass(bloom);
  composer.addPass(new OutputPass());

  /* ---------- Cadrage ---------- */
  const BASE_FOV = 44, REF_ASPECT = 1.75;
  let pullBack = 0;
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
    const pr = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(pr); renderer.setSize(w, h, false); composer.setPixelRatio(pr); composer.setSize(w, h);
    const a = w / h; camera.aspect = a;
    // garder le champ horizontal sur les écrans étroits, puis reculer
    const hHalf = Math.tan(THREE.MathUtils.degToRad(BASE_FOV / 2)) * REF_ASPECT;
    const want = THREE.MathUtils.radToDeg(2 * Math.atan(hHalf / Math.min(a, REF_ASPECT)));
    camera.fov = Math.min(want, 66); pullBack = Math.max(0, (want - 66) * 0.035);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas); resize();

  /* ---------- Vues (focus sur un élément) ---------- */
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const VIEWS = {
    home: HOME,
    trailer: { pos: V(0, 1.85, 3.4), target: V(0, 1.95, WALL.z) },
    teamA: { pos: V(-0.2, 1.55, 5.0), target: V(-3.4, 1.15, 0.7) },
    teamB: { pos: V(0.2, 1.55, 5.0), target: V(3.4, 1.15, 0.7) },
    summary: { pos: V(0, 1.25, 1.9), target: V(0, 0.85, -2.35) },
  };
  let fly = null, focus = 'home';
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  function view(name, ms = 1300) {
    const v = VIEWS[name] || HOME; focus = VIEWS[name] ? name : 'home';
    fly = { t0: performance.now(), ms, p0: cam.pos.clone(), q0: cam.target.clone(), p1: v.pos, q1: v.target };
  }

  /* ---------- Pointeur : suivi caméra, survol, clic ---------- */
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(-9, -9);
  let mx = 0, my = 0, fx = 0, fy = 0, hovered = null, needPick = false, downAt = null, clickFn = null, interactFn = null;
  const setPtr = (e) => {
    const r = canvas.getBoundingClientRect();
    ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); needPick = true;
  };
  // le suivi écoute la fenêtre : la caméra continue de bouger au-dessus des boutons du hero
  addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const r = canvas.getBoundingClientRect(); if (e.clientY > r.bottom || e.clientY < r.top) return;
    mx = THREE.MathUtils.clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1); my = THREE.MathUtils.clamp(-((e.clientY - r.top) / r.height) * 2 + 1, -1, 1);
  }, { passive: true });
  canvas.addEventListener('pointermove', setPtr);
  canvas.addEventListener('pointerleave', () => { ptr.set(-9, -9); needPick = true; });
  canvas.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; setPtr(e); interactFn?.(); });
  canvas.addEventListener('pointerup', (e) => {
    if (!downAt) return; const moved = Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]); downAt = null;
    if (moved > 8) return; setPtr(e); pick(); if (hovered) clickFn?.(hovered);
    if (e.pointerType === 'touch') { ptr.set(-9, -9); needPick = true; }
  });
  function pick() {
    needPick = false; ray.setFromCamera(ptr, camera);
    const hit = ray.intersectObjects(pickables, false)[0], name = hit ? hit.object.userData.action : null;
    if (name === hovered) return;
    hovered = name; canvas.style.cursor = name ? 'pointer' : ''; onHover?.(name);
  }
  const hl = {}; // action -> intensité de survol lissée
  let extHover = null;

  /* ---------- Hotspots HTML projetés ---------- */
  tvA.updateMatrixWorld(); tvB.updateMatrixWorld();
  const HS = {
    trailer: V(0, WALL.y + 0.98, WALL.z + 0.05),
    teamA: tvA.localToWorld(V(0, 1.55, 0.05)), teamB: tvB.localToWorld(V(0, 1.55, 0.05)),
    summary: V(0, 0.48, -2.0),
  };
  const v3 = new THREE.Vector3();
  function projectHotspots() {
    const w = canvas.clientWidth, h = canvas.clientHeight, out = {};
    for (const k in HS) { v3.copy(HS[k]).project(camera); out[k] = { x: (v3.x * 0.5 + 0.5) * w, y: (-v3.y * 0.5 + 0.5) * h, visible: v3.z < 1 && Math.abs(v3.x) < 1.05 }; }
    onHotspots?.(out);
  }

  /* ---------- Boucle ---------- */
  let running = true, visible = true, ready = false, last = performance.now(), intro = 1;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 }).observe(canvas);
  const look = new THREE.Vector3();

  function frame(now) {
    if (!running) return; requestAnimationFrame(frame);
    if (!visible || !ready) { last = now; return; }
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (fly) {
      const k = Math.min(1, (now - fly.t0) / fly.ms), e = ease(k);
      cam.pos.lerpVectors(fly.p0, fly.p1, e); cam.target.lerpVectors(fly.q0, fly.q1, e); if (k >= 1) fly = null;
    }
    // la caméra suit légèrement le curseur
    const f = 1 - Math.exp(-dt * 3.2), amp = focus === 'home' ? 1 : 0.35;
    fx += (mx * amp - fx) * f; fy += (my * amp - fy) * f;
    intro += (0 - intro) * (1 - Math.exp(-dt * 1.6));
    const back = focus === 'home' ? pullBack : pullBack * 0.4;
    camera.position.set(cam.pos.x + fx * 0.62, cam.pos.y + fy * 0.2 + intro * 0.35, cam.pos.z + back + intro * 1.6);
    look.set(cam.target.x + fx * 0.12, cam.target.y + fy * 0.05, cam.target.z); camera.lookAt(look);

    if (needPick) pick();
    const active = hovered || extHover;
    for (const k in actionMats) {
      hl[k] = (hl[k] || 0) + ((active === k ? 1 : 0) - (hl[k] || 0)) * (1 - Math.exp(-dt * 10));
      for (const m of actionMats[k]) { if (m.emissiveMap) m.emissiveIntensity = 1 + hl[k] * 0.45; else m.color.setScalar(1 + hl[k] * 0.45); }
    }
    projectHotspots();
    composer.render();
  }

  loadAssets().then(() => {
    applyEdition(); ready = true; last = performance.now(); requestAnimationFrame(frame);
    requestAnimationFrame(() => onReady?.());
  });

  return {
    setEdition(y) { if (!EDITIONS[y]) return; edition = +y; if (ready) applyEdition(); },
    view,
    hover(name) { extHover = name; },
    onClick(fn) { clickFn = fn; },
    onInteract(fn) { interactFn = fn; },
    dispose() { running = false; pmrem.dispose(); renderer.dispose(); },
    get edition() { return edition; },
  };
}
