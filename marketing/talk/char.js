// "Mac", a 3D animated foreman built from code (no models, no assets): a hard hat, hi-vis vest,
// an expressive face and a mouth that is rebuilt every frame from the voice. Runs in the browser.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const UP = V(0, 1, 0);

export function createMac(canvas, W, H, layout) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.32;

  // framing: the head's centre sits at layout.head (fractions of the frame)
  const camera = new THREE.PerspectiveCamera(36, W / H, 0.1, 100);
  const visH = layout.visibleHeight;
  camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(visH / 2 / 11));
  camera.updateProjectionMatrix();
  const lookY = visH * (0.5 - layout.head[1]);
  const lookX = -(layout.head[0] - 0.5) * visH * (W / H);
  camera.position.set(lookX, lookY, 11);
  camera.lookAt(lookX, lookY, 0);

  // light: golden hour from the front-left, warm rim behind, a cool kick from the other side
  scene.add(new THREE.HemisphereLight("#a9b8ff", "#7a4a2a", 0.42));
  const key = new THREE.DirectionalLight("#ffd7a0", 3.1);
  key.position.set(-4, 4, 7); key.target.position.set(0, -0.5, 0); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 4;
  Object.assign(key.shadow.camera, { left: -4, right: 4, top: 5, bottom: -5, near: 1, far: 22 });
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight("#ff9d45", 2.4); rim.position.set(5, 2.5, -4); scene.add(rim);
  const kick = new THREE.DirectionalLight("#6f8cff", 1.1); kick.position.set(-5, 1, -3); scene.add(kick);
  const fill = new THREE.DirectionalLight("#ffe9d2", 0.6); fill.position.set(4, -1, 6); scene.add(fill);

  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0, ...o });
  const skin = std("#e2a47b", { roughness: 0.55 });
  const skinDark = std("#c98660", { roughness: 0.6 });
  const hair = std("#35261d", { roughness: 0.85 });
  const shirt = std("#33404f", { roughness: 0.85 });
  const vest = std("#ff6a13", { roughness: 0.62 });
  const silver = std("#d9dde2", { roughness: 0.25, metalness: 0.6, emissive: "#8a8f96", emissiveIntensity: 0.35 });
  const hatMat = new THREE.MeshPhysicalMaterial({ color: "#f5c400", roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.2 });
  const white = std("#f6f3ee", { roughness: 0.3 });

  const mesh = (geo, mat, parent, shadow = true) => { const m = new THREE.Mesh(geo, mat); m.castShadow = shadow; m.receiveShadow = shadow; parent.add(m); return m; };
  const sphere = (r, mat, parent, sx = 1, sy = 1, sz = 1, x = 0, y = 0, z = 0) => { const m = mesh(new THREE.SphereGeometry(r, 40, 28), mat, parent); m.scale.set(sx, sy, sz); m.position.set(x, y, z); return m; };
  const limb = (parent, mat, r) => { const m = mesh(new THREE.CapsuleGeometry(r, 1, 10, 20), mat, parent); return m; };
  const place = (m, a, b) => { const d = b.clone().sub(a), len = d.length(); m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(UP, d.normalize()); m.scale.set(1, Math.max(0.01, len), 1); };

  const root = new THREE.Group(); scene.add(root);
  const body = new THREE.Group(); root.add(body);

  // ── torso, vest, neck ──
  const torso = sphere(1, shirt, body, 2.3, 2.2, 1.2, 0, -3.95, 0);
  const vestShell = mesh(new THREE.SphereGeometry(1, 56, 36, 0, Math.PI * 2, 0.5, Math.PI - 0.5), vest, body);
  vestShell.scale.set(2.36, 2.26, 1.26); vestShell.position.set(0, -3.95, 0); vestShell.material.side = THREE.DoubleSide;
  for (const s of [-1, 1]) {
    const strip = mesh(new THREE.SphereGeometry(1, 4, 40, Math.PI / 2 + s * 0.52 - 0.07, 0.14, 0.62, 1.7), silver, body, false);
    strip.scale.set(2.375, 2.275, 1.275); strip.position.set(0, -3.95, 0);
  }
  const band = mesh(new THREE.TorusGeometry(1, 0.055, 10, 80), silver, body, false);
  band.rotation.x = Math.PI / 2; band.scale.set(2.3, 1.18, 1.22); band.position.set(0, -4.55, 0);
  const neck = mesh(new THREE.CylinderGeometry(0.52, 0.6, 1.1, 32), skinDark, body); neck.position.set(0, -1.15, 0);
  const collar = mesh(new THREE.TorusGeometry(0.66, 0.14, 12, 40), shirt, body); collar.rotation.x = Math.PI / 2; collar.position.set(0, -1.62, 0.02); collar.scale.set(1, 1, 0.85);
  for (const s of [-1, 1]) sphere(0.66, shirt, body, 1, 0.95, 1, s * 1.82, -2.45, 0);

  // ── arms: two-bone IK so the hand can go where it's asked ──
  const A = 2.15, B = 2.05;
  const arms = [-1, 1].map((s) => {
    const g = new THREE.Group(); root.add(g);
    const up = limb(g, shirt, 0.5), lo = limb(g, shirt, 0.42);
    const elbow = sphere(0.46, shirt, g);
    const hand = new THREE.Group(); g.add(hand);
    sphere(0.4, skin, hand, 1, 1.05, 0.62);
    for (let i = 0; i < 4; i++) { const f = limb(hand, skin, 0.105); f.scale.set(1, 0.5, 1); f.position.set(-0.27 + i * 0.18, 0.5, 0); f.rotation.z = (i - 1.5) * -0.07; }
    const th = limb(hand, skin, 0.115); th.scale.set(1, 0.4, 1); th.position.set(-0.46 * s, 0.1, 0.05); th.rotation.z = 0.9 * s;
    return { s, g, up, lo, elbow, hand, shoulder: V(s * 1.85, -2.5, 0) };
  });
  function pose(arm, target, pole) {
    const S = arm.shoulder, d = target.clone().sub(S); let dist = d.length();
    const maxR = A + B - 0.02; if (dist > maxR) { d.setLength(maxR); dist = maxR; }
    const dir = d.clone().normalize();
    const x = (A * A - B * B + dist * dist) / (2 * dist), h = Math.sqrt(Math.max(0, A * A - x * x));
    const pl = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();
    const E = S.clone().add(dir.clone().multiplyScalar(x)).add(pl.multiplyScalar(h));
    const T = S.clone().add(d);
    place(arm.up, S, E); place(arm.lo, E, T); arm.elbow.position.copy(E); arm.hand.position.copy(T);
  }

  // ── head ──
  const head = new THREE.Group(); head.position.set(0, 0, 0); root.add(head);
  const skullGeo = new THREE.SphereGeometry(1, 72, 56);
  { // a rounder skull with a firm jaw
    const p = skullGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      if (y < 0) { const k = Math.pow(-y, 1.4); x *= 1 - 0.2 * k; z *= 1 - 0.1 * k; y *= 1.04; }
      p.setXYZ(i, x, y * 1.08, z * 0.98);
    }
    skullGeo.computeVertexNormals();
  }
  mesh(skullGeo, skin, head);
  const stubble = mesh(new THREE.SphereGeometry(1.012, 48, 36, 0, Math.PI * 2, 2.0, 1.1), std("#3a2a21", { transparent: true, opacity: 0.13, roughness: 1 }), head, false);
  stubble.scale.set(0.98, 1.1, 0.99);
  for (const s of [-1, 1]) {
    sphere(0.22, skinDark, head, 0.5, 1, 0.8, s * 1.0, -0.06, 0.0);
    sphere(0.12, hair, head, 0.5, 1.5, 0.9, s * 0.96, 0.02, 0.2);
  }
  sphere(0.21, skin, head, 0.95, 1.02, 1.06, 0, -0.14, 0.9);
  for (const s of [-1, 1]) {
    const blush = sphere(0.2, std("#e87d6e", { transparent: true, opacity: 0.28, roughness: 1 }), head, 1.2, 0.8, 0.3, s * 0.56, -0.26, 0.72); blush.castShadow = false;
  }

  // eyes
  const eyes = [-1, 1].map((s) => {
    const g = new THREE.Group(); g.position.set(s * 0.37, 0.13, 0.76); head.add(g);
    const ball = new THREE.Group(); g.add(ball);
    sphere(0.205, white, ball);
    const iris = sphere(0.115, std("#5a3a22", { roughness: 0.25 }), ball, 1, 1, 0.5, 0, 0, 0.185);
    sphere(0.06, std("#0c0a09", { roughness: 0.2 }), ball, 1, 1, 0.5, 0, 0, 0.2);
    sphere(0.032, std("#ffffff", { roughness: 0.1, emissive: "#ffffff", emissiveIntensity: 0.8 }), ball, 1, 1, 1, 0.05, 0.055, 0.21).castShadow = false;
    const lid = mesh(new THREE.SphereGeometry(0.218, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), skin, g);
    const brow = mesh(new THREE.CapsuleGeometry(0.066, 0.3, 6, 14), hair, head);
    brow.rotation.z = Math.PI / 2; brow.position.set(s * 0.4, 0.5, 0.82);
    return { s, g, ball, lid, brow };
  });

  // mustache
  for (const s of [-1, 1]) { const m = sphere(0.15, hair, head, 1.45, 0.5, 0.65, s * 0.19, -0.325, 0.905); m.rotation.z = s * -0.22; m.castShadow = false; }

  // the mouth: strips rebuilt every frame from the voice
  const N = 28;
  const mouthGroup = new THREE.Group(); mouthGroup.position.set(0, -0.56, 0.86); mouthGroup.rotation.x = 0.46; head.add(mouthGroup);
  function strip(color, offset) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 2 * 3), 3));
    { const nm = new Float32Array(N * 2 * 3); for (let i = 0; i < N * 2; i++) nm[i * 3 + 2] = 1; geo.setAttribute("normal", new THREE.BufferAttribute(nm, 3)); }
    const idx = []; for (let i = 0; i < N - 1; i++) { const a = i * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, b, c, b, d, c); }
    geo.setIndex(idx);
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.5, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -offset, polygonOffsetUnits: -offset }));
    m.frustumCulled = false; mouthGroup.add(m); return m;
  }
  const lips = strip("#c2605a", 1), cavity = strip("#3a0f14", 2), teeth = strip("#fbf8f1", 3), tongue = strip("#e0707f", 3);
  function writeStrip(m, topFn, botFn, from, to, zOff) {
    const p = m.geometry.attributes.position;
    for (let i = 0; i < N; i++) {
      const u = lerp(from, to, i / (N - 1));
      const [x, yt] = topFn(u), [, yb] = botFn(u);
      const z = zOff - 0.55 * x * x;
      p.setXYZ(i * 2, x, yt, z); p.setXYZ(i * 2 + 1, x, yb, z);
    }
    p.needsUpdate = true;
  }
  function setMouth(open, round, smile, wide) {
    open = clamp(open); const w = lerp(0.46, 0.27, round) + wide * 0.05;
    const c = smile * 0.075 - open * 0.015;
    const base = (u) => c * u * u;
    const oh = open * 0.34, ih = Math.max(0.012, oh);
    const cavTop = (u) => [u * w, base(u) + 0.012 * open * (1 - u * u)];
    const cavBot = (u) => [u * w, base(u) - ih * Math.pow(Math.max(0, 1 - u * u), 0.85)];
    const lipTop = (u) => [u * w * 1.06, cavTop(u)[1] + 0.07 * (1 - 0.3 * u * u)];
    const lipBot = (u) => [u * w * 1.06, cavBot(u)[1] - 0.08 * (1 - 0.3 * u * u)];
    writeStrip(lips, lipTop, lipBot, -1, 1, 0.0);
    writeStrip(cavity, cavTop, cavBot, -1, 1, 0.006);
    const th = Math.min(open * 0.3, 0.13) + (wide > 0.5 ? 0.02 : 0);
    writeStrip(teeth, cavTop, (u) => [u * w * 0.82, cavTop(u)[1] - th], -0.82, 0.82, 0.014);
    const tg = Math.min(open * 0.16, 0.075);
    writeStrip(tongue, (u) => [u * w * 0.55, cavBot(u)[1] + tg], cavBot, -0.55, 0.55, 0.014);
  }

  // hard hat
  const hat = new THREE.Group(); hat.position.set(0, 0.58, 0); head.add(hat);
  const dome = mesh(new THREE.SphereGeometry(1.13, 64, 40, 0, Math.PI * 2, 0, Math.PI / 2), hatMat, hat); dome.scale.set(1.0, 0.86, 1.08);
  const ridge = mesh(new THREE.TorusGeometry(0.62, 0.09, 12, 48, Math.PI), hatMat, hat); ridge.rotation.y = Math.PI / 2; ridge.scale.set(1.0, 1.35, 1); ridge.position.set(0, 0.0, 0);
  const rimRing = mesh(new THREE.TorusGeometry(1.1, 0.06, 12, 80), hatMat, hat); rimRing.rotation.x = Math.PI / 2; rimRing.scale.set(1.0, 1.08, 1);
  const visor = mesh(new THREE.CylinderGeometry(1.2, 1.26, 0.09, 48, 1, false, Math.PI * 0.5 - 1.15, 2.3), hatMat, hat);
  visor.scale.set(1, 1, 1.2); visor.position.set(0, -0.02, 0.1);
  const emblem = sphere(0.2, std("#151617", { roughness: 0.5 }), hat, 1, 1, 0.12, 0, 0.42, 1.2); emblem.rotation.x = -0.35;
  const emblemMark = sphere(0.11, std("#f5c400"), hat, 1, 1, 0.12, 0, 0.42, 1.222); emblemMark.rotation.x = -0.35;

  // fixed props for the animation
  const gaze = { x: 0, y: 0 };
  let lastMouth = null;

  /** p: {mouth:{open,round,smile,wide}, brow, browTilt, nod, tilt, turn, blink, breathe, lookX, lookY, gesture:{amt,x,y,z,swing}} */
  function update(p) {
    const m = p.mouth; setMouth(m.open, m.round, m.smile, m.wide); lastMouth = m;
    head.rotation.set(p.nod, p.turn, p.tilt);
    head.position.y = 0.0;
    root.position.set(p.bodyX ?? 0, p.bodyY ?? 0, 0);
    body.scale.set(1 + p.breathe * 0.012, 1 + p.breathe * 0.02, 1 + p.breathe * 0.012);
    torso.rotation.y = p.turn * 0.3; vestShell.rotation.y = p.turn * 0.3;
    for (const e of eyes) {
      e.ball.rotation.set(-p.lookY * 0.35, p.lookX * 0.45, 0);
      e.ball.scale.y = lerp(1, 0.12, p.blink);
      e.lid.rotation.x = lerp(-1.0 - p.lidOpen * 0.35, 1.5, p.blink);
      e.brow.position.y = 0.48 + p.brow * 0.09 + (e.s === 1 ? p.browR : 0) * 0.05;
      e.brow.rotation.z = Math.PI / 2 + e.s * (-0.05 - p.browTilt * 0.25) * -1;
    }
    // arms: the talking hand comes up and sways; the other rests
    const g = p.gesture;
    const restR = V(2.1, -5.6, 0.5), restL = V(-2.1, -5.6, 0.5);
    const talk = V(1.5 + g.x * 0.9, -3.6 + g.y * 0.9, 1.5 + g.z);
    pose(arms[1], restR.clone().lerp(talk, g.amt), V(1, -0.3, -0.5));
    pose(arms[0], restL, V(-1, -0.3, -0.5));
    arms[1].hand.rotation.set(-0.15 * g.amt, 0.2 * g.amt, g.swing * 0.5);
    arms[0].hand.rotation.set(0, 0, 0);
    renderer.render(scene, camera);
  }

  return { update, renderer, canvas };
}
