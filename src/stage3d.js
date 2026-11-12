import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { EDITIONS, DEFAULT_EDITION } from './stage/editions.js';
import { loadAssets, artImage, makeCanvas, paintWall, paintTeamTV, paintDeskPanel, paintDeskMonitor, paintLectern } from './stage/textures.js';

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

/* Texture de bruit raccordable (grain de matière : rugosité, marbrure, traces) */
function noiseTex(size, lo, hi, freq, seed, streaks = 0) {
  const c = makeCanvas(size, size), x = c.getContext('2d'), img = x.createImageData(size, size);
  const h = (i, j, p) => { let n = ((i % p + p) % p) * 374761393 + ((j % p + p) % p) * 668265263 + seed * 1442695; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  const vn = (u, v, p) => { const i = Math.floor(u), j = Math.floor(v), a = u - i, b = v - j, sa = a * a * (3 - 2 * a), sb = b * b * (3 - 2 * b); return (h(i, j, p) * (1 - sa) + h(i + 1, j, p) * sa) * (1 - sb) + (h(i, j + 1, p) * (1 - sa) + h(i + 1, j + 1, p) * sa) * sb; };
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const u = i / size, v = j / size;
    let n = vn(u * freq, v * freq, freq) * 0.5 + vn(u * freq * 2, v * freq * 2, freq * 2) * 0.27 + vn(u * freq * 4, v * freq * 4, freq * 4) * 0.15 + vn(u * freq * 16, v * freq * 16, freq * 16) * 0.08;
    const g = Math.round((lo + (hi - lo) * n) * 255), k = (j * size + i) * 4;
    img.data[k] = img.data[k + 1] = img.data[k + 2] = g; img.data[k + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  if (streaks) { // traces de roulettes / frottements
    x.lineCap = 'round';
    for (let i = 0; i < streaks; i++) {
      const r = (k) => h(i, k, 9999);
      x.strokeStyle = `rgba(${r(1) > 0.5 ? '255,255,255' : '0,0,0'},${0.03 + r(2) * 0.05})`; x.lineWidth = 1 + r(3) * 3;
      x.beginPath(); const sx = r(4) * size, sy = r(5) * size; x.moveTo(sx, sy);
      x.quadraticCurveTo(sx + (r(6) - 0.5) * size * 0.5, sy + (r(7) - 0.5) * size * 0.5, sx + (r(8) - 0.5) * size * 0.7, sy + (r(9) - 0.5) * size * 0.7); x.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
/* Rideau de scène : plan plissé */
function curtainGeo(w, h) {
  const g = new THREE.PlaneGeometry(w, h, Math.round(w * 22), 1), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, Math.sin(x * 7.3) * 0.07 + Math.sin(x * 17.1 + 1.3) * 0.03 + Math.sin(x * 2.1) * 0.05); }
  g.computeVertexNormals(); return g;
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
  RectAreaLightUniformsLib.init();
  // version allégée (sans reflets plans ni occlusion ambiante) sur mobile / tactile
  const lite = matchMedia('(max-width: 760px), (pointer: coarse)').matches;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#030304');
  const pmrem = new THREE.PMREMGenerator(renderer);
  // l'environnement de départ sert à capturer le plateau, qui devient ensuite sa propre source de reflets
  const baseEnv = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = baseEnv; scene.environmentIntensity = 0.3;
  const cubeRT = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType });
  const cubeCam = new THREE.CubeCamera(0.1, 60, cubeRT); cubeCam.position.set(0, 1.3, 1.2); cubeCam.layers.enable(1);
  // boîte à lumière du gril, visible uniquement dans les reflets (calque 1)
  const softbox = new THREE.Mesh(new THREE.PlaneGeometry(13, 11), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.8, 0.8, 0.85) }));
  softbox.rotation.x = Math.PI / 2; softbox.position.set(0, 6.5, 1.5); softbox.layers.set(1); scene.add(softbox);
  let bakedEnv = null, mirror = null;
  function bakeEnv() {
    scene.environment = baseEnv; scene.environmentIntensity = 0.3; if (mirror) mirror.visible = false;
    cubeCam.update(renderer, scene); if (mirror) mirror.visible = true;
    const rtEnv = pmrem.fromCubemap(cubeRT.texture); bakedEnv?.dispose(); bakedEnv = rtEnv;
    scene.environment = rtEnv.texture; scene.environmentIntensity = 1;
  }

  const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 80);
  const HOME = { pos: new THREE.Vector3(0, 2.2, 8.3), target: new THREE.Vector3(0, 1.2, -2.4) };
  const cam = { pos: HOME.pos.clone(), target: HOME.target.clone() };

  /* ---------- Matériaux ---------- */
  const M = {
    shell: new THREE.MeshPhysicalMaterial({ color: '#efeeeb', roughness: 1, clearcoat: 0.35, clearcoatRoughness: 0.22 }),
    floor: new THREE.MeshStandardMaterial({ color: '#cbc6bd', roughness: 1, metalness: 0.0, envMapIntensity: lite ? 0.9 : 0.35 }),
    curtain: new THREE.MeshStandardMaterial({ color: '#09090b', roughness: 0.95, envMapIntensity: 0.05, side: THREE.DoubleSide }),
    rubber: new THREE.MeshStandardMaterial({ color: '#0a0a0b', roughness: 0.7 }),
    seam: new THREE.MeshStandardMaterial({ color: '#8f8f8c', roughness: 0.8 }),
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
  // profilé acrylique rétro-éclairé : [face diffusante, chant plus saturé]
  const acrylic = () => new THREE.MeshPhysicalMaterial({ color: '#cfd6de', roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.15, emissive: '#ffffff' });
  const led = { L: [acrylic(), acrylic()], R: [acrylic(), acrylic()], RT: [acrylic(), acrylic()], coolL: [acrylic(), acrylic()], coolR: [acrylic(), acrylic()] };
  // grain de matière
  const grain = { shell: noiseTex(256, 0.26, 0.4, 6, 3), floorR: noiseTex(512, 0.2, 0.46, 5, 11, 40), floorC: noiseTex(512, 0.9, 1, 4, 17, 26) };
  grain.shell.repeat.set(3, 3); M.shell.roughnessMap = grain.shell;
  for (const t of [grain.floorR, grain.floorC]) { t.repeat.set(7, 6); t.anisotropy = maxAniso; }
  grain.floorC.colorSpace = THREE.SRGBColorSpace; M.floor.roughnessMap = grain.floorR; M.floor.map = grain.floorC;

  const world = new THREE.Group(); scene.add(world);
  const shadow = (m, cast = true, recv = true) => { m.castShadow = cast; m.receiveShadow = recv; return m; };
  const mesh = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m; };

  /* ---------- Lumières ---------- */
  const hemi = new THREE.HemisphereLight('#ffffff', '#6f6c74', 0.16); scene.add(hemi);
  const rectLights = [];
  const key = new THREE.DirectionalLight('#fff4e8', 0.95);
  key.position.set(1.5, 9, 6); key.target.position.set(0, 0, -1); scene.add(key, key.target);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 6; key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
  Object.assign(key.shadow.camera, { left: -8, right: 8, top: 8, bottom: -6, near: 1, far: 24 });
  const glow = {
    A1: new THREE.PointLight('#4fb9ea', 16, 10, 2), A2: new THREE.PointLight('#4fb9ea', 12, 9, 2),
    B1: new THREE.PointLight('#f4573b', 10, 8, 2), wall: new THREE.PointLight('#ffffff', 4, 9, 2),
  };
  glow.A1.position.set(-5.4, 1.1, 0.6); glow.A2.position.set(5.4, 1.1, 0.8); glow.B1.position.set(4.2, 1.5, -1.9); glow.wall.position.set(0, 2.2, -3.2);
  scene.add(...Object.values(glow));

  /* ---------- Sol, rideaux ---------- */
  const floor = shadow(mesh(new THREE.PlaneGeometry(26, 22), M.floor, 0, 0, 1), false); floor.rotation.x = -Math.PI / 2; world.add(floor);
  world.add(mesh(curtainGeo(26, 9), M.curtain, 0, 4.5, -5.75));
  for (const sd of [-1, 1]) { const w = mesh(curtainGeo(22, 9), M.curtain, sd * 8.2, 4.5, 1); w.rotation.y = -sd * Math.PI / 2; world.add(w); }
  // reflet plan flouté du plateau dans le sol (fresnel + grain)
  if (!lite) {
    mirror = new Reflector(new THREE.PlaneGeometry(26, 22), {
      textureWidth: 1024, textureHeight: 512, multisample: 0, clipBias: 0.003,
      shader: {
        uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, tNoise: { value: grain.floorR } },
        vertexShader: `uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vW;
          void main() { vUv = textureMatrix * vec4(position, 1.0); vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `uniform sampler2D tDiffuse; uniform sampler2D tNoise; varying vec4 vUv; varying vec3 vW;
          void main() {
            vec3 V = normalize(cameraPosition - vW);
            float n = texture2D(tNoise, vW.xz * 0.27).r;
            float fres = 0.05 + 0.95 * pow(1.0 - clamp(V.y, 0.0, 1.0), 4.5);
            vec4 uv = vUv; uv.xy += (n - 0.33) * 0.03 * uv.w;
            vec3 r = textureProj(tDiffuse, uv, 2.2 + n * 3.0).rgb * 0.5 + textureProj(tDiffuse, uv, 4.2).rgb * 0.5;
            gl_FragColor = vec4(r, clamp(fres * (1.3 - n * 1.5), 0.0, 0.6));
          }`,
      },
    });
    const mrt = mirror.getRenderTarget(); mrt.texture.generateMipmaps = true; mrt.texture.minFilter = THREE.LinearMipmapLinearFilter;
    mirror.material.transparent = true; mirror.material.depthWrite = false;
    mirror.rotation.x = -Math.PI / 2; mirror.position.set(0, 0.002, 1); mirror.renderOrder = 1; world.add(mirror);
  }
  // ombres de contact (occlusion douce sous les éléments posés au sol)
  const blobTex = (() => {
    const c = makeCanvas(256, 256), x = c.getContext('2d');
    x.filter = 'blur(26px)'; x.fillStyle = '#000'; x.beginPath(); x.roundRect(62, 62, 132, 132, 30); x.fill();
    return new THREE.CanvasTexture(c);
  })();
  const contact = (w, d, x, z, ry = 0, o = 0.6) => {
    const m = mesh(new THREE.PlaneGeometry(w * 1.94 + 0.25, d * 1.94 + 0.7), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, opacity: o, depthWrite: false, color: '#000' }), x, 0.004, z);
    m.rotation.set(-Math.PI / 2, 0, ry); m.renderOrder = 2; world.add(m); return m;
  };
  // câbles au sol
  const cable = (pts, r = 0.011) => world.add(shadow(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, r, z))), 48, r, 6), M.rubber)));
  cable([[-2.3, 0.2], [-3.4, -0.4], [-4.6, 0.1], [-5.6, -0.6], [-7.6, -0.9]]);
  cable([[3.0, 1.2], [3.6, 0.2], [4.9, 0.3], [5.7, -0.7], [7.6, -1.1]]);
  cable([[3.2, 1.25], [3.9, 0.5], [4.7, 0.9], [6.2, 0.2], [7.6, 0.3]], 0.008);
  cable([[0.3, -2.5], [0.9, -3.1], [0.5, -3.6], [1.2, -3.95]], 0.009);
  // gril technique : tubes et projecteurs éteints
  for (const z of [-2.6, 0.6, 3.6]) { const p = mesh(new THREE.CylinderGeometry(0.025, 0.025, 16, 8), M.black, 0, 4.75, z); p.rotation.z = Math.PI / 2; world.add(p); }
  for (const x of [-5, -1.7, 1.7, 5]) { const p = mesh(new THREE.CylinderGeometry(0.025, 0.025, 10, 8), M.black, x, 4.8, 0.5); p.rotation.x = Math.PI / 2; world.add(p); }
  for (const [x, z, ry] of [[-4.2, -2.6, 0.5], [-1.2, -2.6, 0.1], [1.4, -2.6, -0.1], [4.3, -2.6, -0.5], [-2.8, 0.6, 0.3], [2.6, 0.6, -0.3]]) {
    const g = new THREE.Group(); g.position.set(x, 4.5, z); g.rotation.set(0.9, ry, 0);
    g.add(mesh(new THREE.BoxGeometry(0.22, 0.26, 0.3), M.black), mesh(new THREE.BoxGeometry(0.3, 0.02, 0.02), M.black, 0, 0.16, 0));
    const lens = mesh(new THREE.CircleGeometry(0.08, 20), new THREE.MeshStandardMaterial({ color: '#20232a', roughness: 0.1, metalness: 0.8 }), 0, 0, 0.151); g.add(lens);
    world.add(g);
  }

  /* ---------- Textures d'écran ---------- */
  const mkTex = (w, h) => { const c = makeCanvas(w, h), t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso; return { c, t }; };
  const T = {
    wall: mkTex(2048, 1152), tvA: mkTex(1024, 576), tvB: mkTex(1024, 576),
    deskA: mkTex(2048, 600), deskB: mkTex(2048, 600), monitor: mkTex(1024, 576), lectern: mkTex(1536, 1024),
  };
  const glass = (tex, rough = 0.18) => new THREE.MeshPhysicalMaterial({ color: '#000', roughness: rough, metalness: 0, emissive: '#fff', emissiveMap: tex, emissiveIntensity: 1, clearcoat: 1, clearcoatRoughness: 0.05 });

  /* ---------- Éléments interactifs ---------- */
  const pickables = [], actionMats = {}; // action -> matériaux à éclaircir au survol
  // grp : écran piloté par la transition d'édition (allumage / extinction) ; base : intensité nominale
  const register = (action, m, mat, grp = null, base = 1) => { m.userData.action = action; pickables.push(m); if (mat) (actionMats[action] ||= []).push({ mat, grp, base }); };
  // décors propres à une édition : 'classic' (pupitres à moniteur, 2026) ou 'printed' (façades imprimées, 2025)
  const sets = { classic: [], printed: [] };

  /* ---------- Mur LED + estrade ---------- */
  const WALL = { w: 5.9, h: 3.32, y: 2.0, z: -4.75 };
  {
    const mat = new THREE.MeshBasicMaterial({ map: T.wall.t });
    const face = mesh(new THREE.PlaneGeometry(WALL.w, WALL.h), mat, 0, WALL.y, WALL.z); world.add(face); register('trailer', face, mat, 'wall');
    world.add(mesh(new THREE.BoxGeometry(WALL.w + 0.12, WALL.h + 0.12, 0.2), M.black, 0, WALL.y, WALL.z - 0.11));
    const wl = new THREE.RectAreaLight('#b9c6ff', 1.6, WALL.w, WALL.h); wl.position.set(0, WALL.y, WALL.z + 0.05); wl.rotation.y = Math.PI; world.add(wl); rectLights.push(wl);
    world.add(shadow(mesh(new THREE.BoxGeometry(7.4, 0.32, 1.3), M.shell, 0, 0.16, WALL.z - 0.1)));
    world.add(shadow(mesh(new THREE.BoxGeometry(7.9, 0.16, 1.7), M.shell, 0, 0.08, WALL.z)));
  }

  /* ---------- Rampes LED au plafond ---------- */
  const bar = (len, x, y, z, ry = 0, rz = 0) => {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.set(0, ry, rz);
    g.add(mesh(new THREE.BoxGeometry(len, 0.07, 0.16), M.ledWhite), mesh(new THREE.BoxGeometry(len + 0.04, 0.1, 0.2), M.black, 0, 0.085, 0));
    const l = new THREE.RectAreaLight('#f4f7ff', 11, len, 0.3); l.rotation.x = -Math.PI / 2; l.position.y = -0.04; g.add(l); rectLights.push(l);
    for (const dx of [-len * 0.35, len * 0.35]) g.add(mesh(new THREE.CylinderGeometry(0.004, 0.004, 1.2, 4), M.black, dx, 0.7, 0));
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
  place(portal(3.3, 1.55, led.L), -5.75, 1.9, 1.15);
  place(portal(0.95, 2.5, led.L, { r: 0.2 }), -4.55, -1.35, 0.55);
  place(portal(2.25, 1.45, led.coolL, { r: 0.22 }), -3.45, -2.85, 0.2);
  // droite (le portique vertical prend la couleur de l'équipe B)
  place(portal(3.3, 1.55, led.R), 5.75, 1.9, -1.15);
  place(portal(0.95, 2.5, led.RT, { r: 0.2 }), 4.55, -1.35, -0.55);
  place(portal(2.25, 1.45, led.coolR, { r: 0.22 }), 3.45, -2.85, -0.2);

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
    // joints d'assemblage de la coque
    for (const x of [0, -L / 2 + R, L / 2 - R]) {
      g.add(mesh(new THREE.BoxGeometry(0.005, 0.003, D - 0.02), M.seam, x, 0.1 + H + 0.0005, 0), mesh(new THREE.BoxGeometry(0.005, t, 0.003), M.seam, x, 0.1 + H - t / 2, D / 2), mesh(new THREE.BoxGeometry(0.005, t, 0.003), M.seam, x, 0.1 + t / 2, D / 2));
    }
    // sur le plateau : feuille, stylo, télécommande
    const top = 0.1 + H;
    g.add(mesh(new THREE.BoxGeometry(0.3, 0.004, 0.21), M.paper, 0.15, top + 0.003, 0.02));
    g.add(mesh(new THREE.BoxGeometry(0.16, 0.022, 0.045), M.black, -0.12, top + 0.012, 0.05));
    register('team' + side, panel, panelMat); register('team' + side, mon, monMat, 'desk' + side);
    g.traverse((o) => { if (o.isMesh && !o.userData.action) register('team' + side, o); });
    return g;
  }
  const deskA = place(teamDesk('A'), -2.85, 0.9, 1.05), deskB = place(teamDesk('B'), 2.85, 0.9, -1.05);
  sets.classic.push(deskA, deskB, contact(3.5, 0.74, -2.85, 0.9, 1.05, 0.75), contact(3.5, 0.74, 2.85, 0.9, -1.05, 0.75), contact(1.86, 0.56, 0, -2.35, 0, 0.7));
  contact(7.9, 1.7, 0, -4.75, 0, 0.5);
  for (const sd of [-1, 1]) {
    contact(0.95, 0.62, sd * 4.15, 0.5, sd * -0.8, 0.55); contact(0.85, 0.5, sd * 3.05, -3.55, 0, 0.6);
    contact(3.3, 0.24, sd * 5.75, 1.9, sd * -1.15, 0.6); contact(0.95, 0.24, sd * 4.55, -1.35, sd * -0.55, 0.6); contact(2.25, 0.24, sd * 3.45, -2.85, sd * -0.2, 0.6);
  }

  /* ---------- Écrans d'équipe sur pied ---------- */
  function teamTV(side) {
    const g = new THREE.Group(), w = 1.75, h = w * 9 / 16, y = 2.0;
    g.add(shadow(mesh(new THREE.BoxGeometry(0.95, 0.04, 0.62), M.black, 0, 0.02, -0.1)));
    g.add(shadow(mesh(new THREE.BoxGeometry(0.16, y, 0.09), M.grey, 0, y / 2, -0.12)));
    g.add(shadow(mesh(new THREE.BoxGeometry(w + 0.04, h + 0.04, 0.06), M.bezel, 0, y, 0)));
    const mat = glass(T['tv' + side].t, 0.32), face = mesh(new THREE.PlaneGeometry(w, h), mat, 0, y, 0.031); g.add(face);
    register('team' + side, face, mat, 'tv' + side);
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
    register('summary', face, mat, 'lectern');
    lectern.traverse((o) => { if (o.isMesh && !o.userData.action) register('summary', o); });
    place(lectern, 0, -2.35, 0); sets.classic.push(lectern);
  }

  /* ---------- Décor « façades imprimées » (édition 2025) ---------- */
  const artTex = {};
  const art = (k) => artTex[k] ||= Object.assign(new THREE.Texture(), { colorSpace: THREE.SRGBColorSpace, anisotropy: maxAniso });
  function printedDesk(key, action, L, H, plinthW, withMonitor = false) {
    const g = new THREE.Group(), D = 0.7, R = 0.15, t = 0.036, base = 0.12, cy = base + H / 2;
    const inner = (p) => rrPath(p, L - 2 * t, H - 2 * t, R - t * 0.7);
    g.add(shadow(mesh(ringGeo((p) => rrPath(p, L, H, R), inner, D), M.shell, 0, cy, 0)));
    const mat = new THREE.MeshStandardMaterial({ map: art(key), emissive: '#ffffff', emissiveMap: art(key), emissiveIntensity: 0.45, roughness: 0.42, envMapIntensity: 0.7 });
    const face = mesh(panelGeo(inner, L - 2 * t, H - 2 * t), mat, 0, cy, D / 2 - 0.022); g.add(face);
    const bk = mesh(panelGeo(inner, L - 2 * t, H - 2 * t), M.greyDark, 0, cy, -D / 2 + 0.05); bk.rotation.y = Math.PI; g.add(bk);
    g.add(shadow(mesh(new THREE.BoxGeometry(plinthW, base, D * 0.8), M.shell, 0, base / 2, 0)));
    g.add(mesh(new THREE.BoxGeometry(0.005, 0.003, D - 0.02), M.seam, 0, base + H + 0.0005, 0));
    g.add(mesh(new THREE.BoxGeometry(0.3, 0.004, 0.21), M.paper, 0.15, base + H + 0.003, 0.02), mesh(new THREE.BoxGeometry(0.16, 0.022, 0.045), M.black, -0.12, base + H + 0.012, 0.05));
    register(action, face, mat, key, 0.45);
    if (withMonitor) { // télé encastrée au centre de la façade
      const mw = 1.42, mh = 0.8, mz = D / 2 - 0.022;
      g.add(mesh(new THREE.BoxGeometry(mw + 0.05, mh + 0.05, 0.05), M.bezel, 0, cy, mz + 0.026));
      const monMat = glass(T.monitor.t), mon = mesh(new THREE.PlaneGeometry(mw, mh), monMat, 0, cy, mz + 0.053); g.add(mon);
      register(action, mon, monMat, key);
    }
    g.traverse((o) => { if (o.isMesh && !o.userData.action) register(action, o); });
    return g;
  }
  sets.printed.push(
    place(printedDesk('deskA', 'teamA', 2.8, 1.01, 2.6, true), -2.85, 0.9, 1.05), place(printedDesk('deskB', 'teamB', 2.8, 1.01, 2.6, true), 2.85, 0.9, -1.05),
    place(printedDesk('lectern', 'summary', 1.44, 1.01, 1.1), 0, -2.35, 0),
    contact(2.8, 0.7, -2.85, 0.9, 1.05, 0.75), contact(2.8, 0.7, 2.85, 0.9, -1.05, 0.75), contact(1.44, 0.7, 0, -2.35, 0, 0.7),
  );

  /* ---------- Alimentation du plateau : lumières (room) et écrans (pw), animées pendant les transitions ---------- */
  let room = 1;
  const pw = { wall: 1, lectern: 1, tvA: 1, tvB: 1, deskA: 1, deskB: 1 }, hl = {}; // hl : intensité de survol lissée par action
  const dimmable = [hemi, key, ...Object.values(glow), ...rectLights].map((l) => ({ l, base: l.intensity }));
  const ledMats = Object.values(led).flat(), ledWhiteBase = M.ledWhite.color.clone();
  function applyPower() {
    for (const d of dimmable) d.l.intensity = d.base * room;
    for (const m of ledMats) m.emissiveIntensity = room;
    M.ledWhite.color.copy(ledWhiteBase).multiplyScalar(0.03 + 0.97 * room);
    if (bakedEnv) scene.environmentIntensity = 0.1 + 0.9 * room;
    for (const k in actionMats) for (const { mat, grp, base } of actionMats[k]) {
      const v = (grp ? pw[grp] : 1) * (1 + (hl[k] || 0) * 0.45);
      if (mat.emissiveMap) mat.emissiveIntensity = base * v; else mat.color.setScalar(v);
    }
  }
  /* Transition d'édition : extinction, changement de décor dans le noir, rallumage échelonné des écrans puis des lumières */
  let trans = null;
  const ON_DELAY = { wall: 0.05, lectern: 0.22, tvA: 0.34, tvB: 0.44, deskA: 0.54, deskB: 0.62 };
  const clamp01 = (x) => Math.min(1, Math.max(0, x)), smooth = (x) => x * x * (3 - 2 * x);
  const flicker = (x) => (x <= 0 ? 0 : x < 0.4 ? (Math.random() > 0.45 ? 0.25 + Math.random() * 0.6 : 0.04) : smooth(clamp01((x - 0.4) / 0.6)) * 0.3 + 0.7);
  function stepTransition(now) {
    if (!trans) return 0;
    if (!trans.swapped) {
      const k = clamp01((now - trans.t0) / 380);
      room = 1 - smooth(k); for (const g in pw) pw[g] = k > 0.55 ? 0 : flicker(1 - k * 1.2);
      if (k >= 1) { room = 0; for (const g in pw) pw[g] = 0; edition = trans.to; applyEdition(); trans.swapped = true; trans.t1 = performance.now(); }
      return k * 0.5;
    }
    const u = (now - trans.t1) / 1000;
    for (const g in pw) pw[g] = flicker((u - ON_DELAY[g]) / 0.42);
    room = smooth(clamp01((u - 0.3) / 0.95));
    if (u > 1.3) { room = 1; for (const g in pw) pw[g] = 1; trans = null; return 0; }
    return 0.5 + (u / 1.3) * 0.5;
  }

  /* ---------- Édition : repeint les écrans et reteinte les LEDs ---------- */
  let edition = DEFAULT_EDITION;
  const col = new THREE.Color();
  function applyEdition() {
    const ed = EDITIONS[edition];
    paintWall(T.wall.c, ed); paintTeamTV(T.tvA.c, ed, 'A'); paintTeamTV(T.tvB.c, ed, 'B');
    paintDeskPanel(T.deskA.c, ed, 'A'); paintDeskPanel(T.deskB.c, ed, 'B'); paintDeskMonitor(T.monitor.c, ed); paintLectern(T.lectern.c, ed);
    for (const k in T) T[k].t.needsUpdate = true;
    const setName = ed.set || 'classic';
    for (const k in sets) for (const o of sets[k]) o.visible = k === setName;
    if (ed.art) for (const k of ['deskA', 'deskB', 'lectern']) { const im = artImage(ed.art[k]); if (im) { art(k).image = im; art(k).needsUpdate = true; } }
    const tint = (pair, hex, wFace, wSide, k) => {
      pair[0].emissive.set(hex).lerp(col.set('#ffffff'), wFace).multiplyScalar(k);
      pair[1].emissive.set(hex).lerp(col.set('#ffffff'), wSide).multiplyScalar(k * 1.3);
    };
    // par défaut les portiques des deux côtés prennent la couleur A, sauf le portique vertical droit (B)
    const right = ed.leds?.right === 'B' ? ed.teamB.color : ed.teamA.color;
    tint(led.L, ed.teamA.color, 0.42, 0.06, 0.9); tint(led.R, right, 0.42, 0.06, 0.9); tint(led.RT, ed.teamB.color, 0.32, 0.03, 0.95);
    tint(led.coolL, ed.teamA.color, 0.78, 0.45, 0.85); tint(led.coolR, right, 0.78, 0.45, 0.85);
    glow.A1.color.set(ed.teamA.color); glow.A2.color.set(right); glow.B1.color.set(ed.teamB.color);
    // l'environnement de reflets se capture plateau allumé
    const keep = [room, { ...pw }]; room = 1; for (const k in pw) pw[k] = 1; applyPower(); bakeEnv();
    room = keep[0]; Object.assign(pw, keep[1]); applyPower();
  }

  /* ---------- Rendu : bloom sur les LEDs ---------- */
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.22, 0.55, 1.12); composer.addPass(bloom);
  composer.addPass(new OutputPass());
  // objectif : légère aberration chromatique, vignettage, grain
  const lens = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, time: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float time; varying vec2 vUv;
      float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233)) + time) * 43758.5453); }
      void main() {
        vec2 d = vUv - 0.5; float r2 = dot(d, d); vec2 o = d * r2 * 0.011;
        vec3 c = vec3(texture2D(tDiffuse, vUv - o).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv + o).b);
        c *= 1.0 - r2 * 0.5;
        c += (h(gl_FragCoord.xy) - 0.5) * 0.04 * (1.0 - 0.5 * dot(c, vec3(0.333)));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  composer.addPass(lens);

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
    const shown = (o) => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
    const hit = ray.intersectObjects(pickables, false).find((h) => shown(h.object)), name = hit ? hit.object.userData.action : null;
    if (name === hovered) return;
    hovered = name; canvas.style.cursor = name ? 'pointer' : ''; onHover?.(name);
  }
  let extHover = null;

  /* ---------- Hotspots HTML projetés ---------- */
  tvA.updateMatrixWorld(); tvB.updateMatrixWorld();
  const HS = {
    trailer: V(0, WALL.y + 0.98, WALL.z + 0.05),
    teamA: tvA.localToWorld(V(0, 1.55, 0.05)), teamB: tvB.localToWorld(V(0, 1.55, 0.05)),
    summary: V(0, 0.06, -1.75),
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
    const tp = stepTransition(now), kick = Math.sin(tp * Math.PI) * 0.35; // léger recul de caméra pendant la transition
    const f = 1 - Math.exp(-dt * 3.2), amp = focus === 'home' ? 1 : 0.35;
    fx += (mx * amp - fx) * f; fy += (my * amp - fy) * f;
    intro += (0 - intro) * (1 - Math.exp(-dt * 1.6));
    const back = focus === 'home' ? pullBack : pullBack * 0.4;
    camera.position.set(cam.pos.x + fx * 0.62, cam.pos.y + fy * 0.2 + intro * 0.35, cam.pos.z + back + intro * 1.6 + kick);
    look.set(cam.target.x + fx * 0.12, cam.target.y + fy * 0.05, cam.target.z); camera.lookAt(look);

    if (needPick) pick();
    const active = hovered || extHover;
    for (const k in actionMats) hl[k] = (hl[k] || 0) + ((active === k ? 1 : 0) - (hl[k] || 0)) * (1 - Math.exp(-dt * 10));
    applyPower();
    projectHotspots();
    lens.uniforms.time.value = (now * 0.001) % 10;
    composer.render();
  }

  loadAssets(Object.values(EDITIONS).flatMap((e) => Object.values(e.art || {}))).then(() => {
    applyEdition(); trans = { swapped: true, t1: performance.now() + 250 }; room = 0; for (const g in pw) pw[g] = 0; // allumage du plateau à l'arrivée
    ready = true; last = performance.now(); requestAnimationFrame(frame);
    requestAnimationFrame(() => onReady?.());
  });

  return {
    setEdition(y) {
      if (!EDITIONS[y]) return;
      if (!ready) { edition = +y; return; }
      if (+y === (trans && !trans.swapped ? trans.to : edition)) return;
      trans = { t0: performance.now(), to: +y, swapped: false };
    },
    view,
    hover(name) { extHover = name; },
    onClick(fn) { clickFn = fn; },
    onInteract(fn) { interactFn = fn; },
    dispose() { running = false; pmrem.dispose(); renderer.dispose(); },
    get edition() { return edition; },
  };
}
