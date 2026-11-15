// A golden-hour build site for the cinematic spots: gradient sky with a low sun, a city skyline with lit windows, palms, a framed house, scaffolding, crane, cones, barriers,
// a pickup truck, street lamps, a neon sign, drifting dust. Everything procedural, no external assets.
import * as THREE from "three";

const cv = (w, h, fn) => { const c = document.createElement("canvas"); c.width = w; c.height = h; fn(c.getContext("2d"), w, h); return c; };
const rnd = (s) => () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
const tex = (c, rep, srgb = true) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } return t; };

export function buildWorld(scene, renderer, opts = {}) {
  const W = { updaters: [] };
  const R = rnd(11);
  // ── sky dome ──
  const sunDir = new THREE.Vector3(-0.55, 0.16, -0.82).normalize();
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { sun: { value: sunDir }, time: { value: 0 } },
    vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }",
    fragmentShader: `varying vec3 vP; uniform vec3 sun; uniform float time;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
      float fbm(vec2 p){ float a=.5, s=0.; for(int i=0;i<5;i++){ s+=a*noise(p); p*=2.03; a*=.5; } return s; }
      void main(){
        vec3 d = normalize(vP); float h = clamp(d.y, -0.2, 1.);
        vec3 top = vec3(0.07,0.06,0.28), mid = vec3(0.76,0.24,0.46), low = vec3(1.0,0.56,0.22), hz = vec3(1.0,0.78,0.42);
        vec3 col = mix(hz, low, smoothstep(0., .08, h)); col = mix(col, mid, smoothstep(.05, .36, h)); col = mix(col, top, smoothstep(.3, .95, h));
        float s = max(dot(d, normalize(sun)), 0.);
        col += vec3(1.,.72,.38) * pow(s, 14.) * .55 + vec3(1.,.9,.7) * pow(s, 220.) * 6.;
        // streaky clouds lit from below
        vec2 uv = d.xz / (d.y + 0.35) * 1.6 + vec2(time*0.004, 0.);
        float cl = smoothstep(.5, .86, fbm(uv*vec2(1.2,3.2)));
        vec3 cc = mix(vec3(0.95,0.42,0.38), vec3(1.0,0.76,0.5), pow(s,2.)); col = mix(col, cc, cl * smoothstep(0.02,0.2,h) * (1.-smoothstep(.5,.9,h)) * .75);
        // stars high up
        float st = step(.9965, hash(floor(d.xz/ (d.y+1.2) * 220.))) * smoothstep(.55,.9,h); col += vec3(st) * .8;
        gl_FragColor = vec4(col, 1.);
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 48, 32), skyMat); sky.frustumCulled = false; scene.add(sky);
  W.sky = sky; W.sunDir = sunDir;
  scene.fog = new THREE.FogExp2(new THREE.Color("#c4607a"), 0.0042);
  // environment reflections from the sky
  { const pm = new THREE.PMREMGenerator(renderer), es = new THREE.Scene(); es.add(new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), skyMat)); scene.environment = pm.fromScene(es, 0.02).texture; scene.environmentIntensity = 0.55; }
  // sun and fill
  const sun = new THREE.DirectionalLight("#ffa860", 6.5); sun.position.copy(sunDir).multiplyScalar(40); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 14, bottom: -8, near: 1, far: 90 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; scene.add(sun); scene.add(sun.target);
  scene.add(new THREE.HemisphereLight("#d890c0", "#2a2040", 0.5));
  const fill = new THREE.DirectionalLight("#7fa6ff", 0.9); fill.position.set(10, 6, 14); scene.add(fill);
  W.sun = sun;

  // ── ground: asphalt road with markings, dirt yard, sidewalks ──
  const asph = tex(cv(1024, 1024, (g, w, h) => { g.fillStyle = "#4a4650"; g.fillRect(0, 0, w, h); const r = rnd(5); for (let i = 0; i < 26000; i++) { const v = 60 + r() * 50; g.fillStyle = `rgba(${v},${v - 4},${v + 4},0.5)`; g.fillRect(r() * w, r() * h, 2, 2); } g.strokeStyle = "rgba(10,10,14,0.5)"; g.lineWidth = 2; for (let i = 0; i < 10; i++) { g.beginPath(); let x = r() * w, y = r() * h; g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (r() - 0.5) * 120; y += (r() - 0.5) * 120; g.lineTo(x, y); } g.stroke(); } }), [24, 24]);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshStandardMaterial({ map: asph, roughness: 0.62, metalness: 0.08, color: "#9a949c" })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  // dirt yard under the build
  const dirtT = tex(cv(512, 512, (g, w, h) => { g.fillStyle = "#a07a52"; g.fillRect(0, 0, w, h); const r = rnd(9); for (let i = 0; i < 14000; i++) { const v = 90 + r() * 70; g.fillStyle = `rgba(${v + 30},${v},${v - 40},0.45)`; g.fillRect(r() * w, r() * h, 3, 3); } }), [5, 5]);
  const dirt = new THREE.Mesh(new THREE.PlaneGeometry(26, 14), new THREE.MeshStandardMaterial({ map: dirtT, roughness: 0.95 })); dirt.rotation.x = -Math.PI / 2; dirt.position.set(0, 0.012, -4); dirt.receiveShadow = true; scene.add(dirt);
  // road lines
  const lineM = new THREE.MeshStandardMaterial({ color: "#e8c53a", roughness: 0.6 }); for (let i = -30; i < 30; i++) { const l = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.14), lineM); l.rotation.x = -Math.PI / 2; l.position.set(i * 3.2, 0.014, 9.5); l.receiveShadow = true; scene.add(l); }
  const edgeM = new THREE.MeshStandardMaterial({ color: "#d8d8dc", roughness: 0.6 }); for (const z of [6.2, 12.8]) { const l = new THREE.Mesh(new THREE.PlaneGeometry(200, 0.14), edgeM); l.rotation.x = -Math.PI / 2; l.position.set(0, 0.014, z); scene.add(l); }
  const walk = new THREE.Mesh(new THREE.BoxGeometry(200, 0.14, 2.2), new THREE.MeshStandardMaterial({ color: "#8d8791", roughness: 0.8 })); walk.position.set(0, 0.07, 4.9); walk.receiveShadow = true; scene.add(walk);

  // ── skyline with lit windows ──
  { const winT = tex(cv(256, 512, (g, w, h) => { g.fillStyle = "#0b0a1a"; g.fillRect(0, 0, w, h); const r = rnd(21); for (let y = 8; y < h - 8; y += 14) for (let x = 8; x < w - 8; x += 12) { if (r() > 0.5) { g.fillStyle = ["#ffd27a", "#ffe9b0", "#ff8ab8", "#8ad0ff"][(r() * 4) | 0]; g.globalAlpha = 0.5 + r() * 0.5; g.fillRect(x, y, 7, 8); g.globalAlpha = 1; } } }));
    for (let i = 0; i < 46; i++) { const w = 9 + R() * 14, h = 30 + R() * 70 * (i % 6 === 0 ? 2 : 1), d = 8 + R() * 8, x = -240 + i * 10.6 + R() * 5, z = -150 - R() * 80; const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: "#1b1735", map: winT.clone(), emissive: "#ffffff", emissiveIntensity: 1.6, roughness: 0.3, metalness: 0.5 })); m.material.map.needsUpdate = true; m.material.map.repeat.set(w / 14, h / 28); m.material.emissiveMap = m.material.map; m.position.set(x, h / 2, z); scene.add(m); if (i % 6 === 0) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 8), new THREE.MeshBasicMaterial({ color: "#ff3030" })); l.position.set(x, h + 1.2, z); scene.add(l); W.updaters.push((t) => { l.visible = Math.sin(t * 3 + x) > -0.2; }); } } }

  // ── framed house ──
  const pine = tex(cv(256, 256, (g, w, h) => { g.fillStyle = "#d9ab6a"; g.fillRect(0, 0, w, h); const r = rnd(33); for (let i = 0; i < 90; i++) { g.strokeStyle = `rgba(120,80,30,${0.1 + r() * 0.2})`; g.lineWidth = 1 + r() * 2; g.beginPath(); const y = r() * h; g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + (r() - 0.5) * 16, w * 0.7, y + (r() - 0.5) * 16, w, y + (r() - 0.5) * 10); g.stroke(); } }));
  const wood = new THREE.MeshStandardMaterial({ map: pine, roughness: 0.78 }), house = new THREE.Group(); house.position.set(0, 0, -6.5); scene.add(house);
  const box = (w, h, d, x, y, z, m = wood, parent = house) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; parent.add(b); return b; };
  box(9.2, 0.3, 6.2, 0, 0.15, 0, new THREE.MeshStandardMaterial({ color: "#b9b4ac", roughness: 0.9 }));
  for (let i = 0; i <= 22; i++) { const x = -4.4 + i * 0.4; box(0.09, 3.0, 0.14, x, 1.8, 2.9); box(0.09, 3.0, 0.14, x, 1.8, -2.9); }
  for (let i = 0; i <= 14; i++) { const z = -2.9 + i * 0.414; box(0.14, 3.0, 0.09, -4.4, 1.8, z); box(0.14, 3.0, 0.09, 4.4, 1.8, z); }
  box(9.0, 0.1, 0.16, 0, 3.35, 2.9); box(9.0, 0.1, 0.16, 0, 3.35, -2.9); box(0.16, 0.1, 5.8, -4.4, 3.35, 0); box(0.16, 0.1, 5.8, 4.4, 3.35, 0);
  for (let i = 0; i < 6; i++) { const x = -4.2 + i * 1.68; for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.14, 3.7), wood); r.position.set(x, 4.15, s * 1.45); r.rotation.x = -s * 0.46; r.castShadow = true; house.add(r); } box(0.09, 1.7, 0.09, x, 3.7, 0); }
  box(9.2, 0.12, 0.14, 0, 4.98, 0);
  // plywood sheathing partly installed, with a doorway
  const ply = new THREE.MeshStandardMaterial({ color: "#c9a06a", roughness: 0.85 }); box(2.8, 3.0, 0.05, -3.0, 1.8, 2.95, ply); box(2.0, 3.0, 0.05, 3.4, 1.8, 2.95, ply);
  // ── scaffolding on the left ──
  const steel = new THREE.MeshStandardMaterial({ color: "#9aa3ad", roughness: 0.4, metalness: 0.85 }); const sc = new THREE.Group(); sc.position.set(-7.4, 0, -4.2); scene.add(sc);
  const pipe = (x, y, z, len, axis) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, len, 8), steel); c.position.set(x, y, z); if (axis === "x") c.rotation.z = Math.PI / 2; if (axis === "z") c.rotation.x = Math.PI / 2; c.castShadow = true; sc.add(c); };
  for (let lvl = 0; lvl < 3; lvl++) { for (const x of [0, 2.4]) for (const z of [0, 1.4]) pipe(x, 1.5 + lvl * 3 - 1.5 + 1.5, z, 3.0, "y"); pipe(1.2, lvl * 1.9 + 0.9, 0, 2.4, "x"); pipe(1.2, lvl * 1.9 + 0.9, 1.4, 2.4, "x"); pipe(0, lvl * 1.9 + 0.9, 0.7, 1.4, "z"); pipe(2.4, lvl * 1.9 + 0.9, 0.7, 1.4, "z"); box(2.4, 0.05, 1.4, 1.2, lvl * 1.9 + 0.93, 0.7, wood, sc); }
  // ── crane ──
  const crane = new THREE.Group(); crane.position.set(17, 0, -12); scene.add(crane); const cy = new THREE.MeshStandardMaterial({ color: "#f0a62a", roughness: 0.5, metalness: 0.3 });
  for (let i = 0; i < 18; i++) { for (const [x, z] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.4, 0.1), cy); b.position.set(x, 0.7 + i * 1.4, z); b.castShadow = true; crane.add(b); } const h = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 0.06), cy); h.position.set(0, 1.4 * i + 1.4, 0.5); crane.add(h); }
  const jib = new THREE.Group(); jib.position.set(0, 26, 0); crane.add(jib); const jb = new THREE.Mesh(new THREE.BoxGeometry(28, 0.7, 0.7), cy); jb.position.set(-8, 0, 0); jb.castShadow = true; jib.add(jb); const cw = new THREE.Mesh(new THREE.BoxGeometry(3, 1.6, 1.4), new THREE.MeshStandardMaterial({ color: "#555" })); cw.position.set(8, -0.4, 0); jib.add(cw); const hook = new THREE.Mesh(new THREE.BoxGeometry(0.15, 5, 0.15), steel); hook.position.set(-14, -2.8, 0); jib.add(hook); const rl = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), new THREE.MeshBasicMaterial({ color: "#ff3030" })); rl.position.set(0, 1.2, 0); jib.add(rl);
  W.updaters.push((t) => { jib.rotation.y = -0.35 + Math.sin(t * 0.08) * 0.04; rl.visible = Math.sin(t * 3) > -0.2; });

  // ── cones, barriers, lumber, sawhorses ──
  const coneG = new THREE.ConeGeometry(0.17, 0.62, 20), coneM = new THREE.MeshStandardMaterial({ color: "#ff6a1a", roughness: 0.5 }), stripeM = new THREE.MeshStandardMaterial({ color: "#f4f4f4", roughness: 0.5 });
  const cone = (x, z) => { const g = new THREE.Group(); const c = new THREE.Mesh(coneG, coneM); c.position.y = 0.31; c.castShadow = true; g.add(c); const s = new THREE.Mesh(new THREE.CylinderGeometry(0.098, 0.12, 0.09, 20), stripeM); s.position.y = 0.34; g.add(s); const b = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 0.4), coneM); b.position.y = 0.02; g.add(b); g.position.set(x, 0, z); scene.add(g); };
  [[-5, 3.2], [-3.6, 3.4], [-1.2, 3.7], [2.6, 3.6], [5.3, 3.3], [7.2, 2.6], [-8.8, 1.2]].forEach(([x, z]) => cone(x, z));
  const jer = new THREE.MeshStandardMaterial({ color: "#d9d3c8", roughness: 0.9 }); for (const x of [-9.5, -7, 8, 10.5]) { const b = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.85, 0.5), jer); b.position.set(x, 0.43, 3.8); b.castShadow = b.receiveShadow = true; scene.add(b); const st = new THREE.Mesh(new THREE.BoxGeometry(2.21, 0.12, 0.51), new THREE.MeshStandardMaterial({ color: "#ff6a1a" })); st.position.set(x, 0.6, 3.8); scene.add(st); }
  for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) { const l = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.1, 0.24), wood); l.position.set(7.4, 0.06 + j * 0.11, -2 + i * 0.28); l.castShadow = true; scene.add(l); }
  // ── pickup truck ──
  const truck = new THREE.Group(); truck.position.set(11.5, 0, 0.6); truck.rotation.y = -0.5; scene.add(truck); const tp = new THREE.MeshPhysicalMaterial({ color: "#c2392b", roughness: 0.28, metalness: 0.45, clearcoat: 0.8, clearcoatRoughness: 0.2 }), tm = (g, x, y, z, m = tp) => { const b = new THREE.Mesh(g, m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; truck.add(b); return b; };
  tm(new THREE.BoxGeometry(2.0, 0.62, 1.0), 1.2, 0.75, 0); tm(new THREE.BoxGeometry(1.4, 0.2, 1.0), -1.4, 0.5, 0); tm(new THREE.BoxGeometry(1.1, 0.62, 0.9), 0.6, 1.3, 0, new THREE.MeshPhysicalMaterial({ color: "#c2392b", roughness: 0.3, metalness: 0.4, clearcoat: 0.8 })); tm(new THREE.BoxGeometry(1.0, 0.45, 0.92), 0.62, 1.3, 0, new THREE.MeshStandardMaterial({ color: "#10141c", roughness: 0.1, metalness: 0.8 }));
  tm(new THREE.BoxGeometry(1.7, 0.5, 1.02), -0.9, 0.78, 0); for (const [x, z] of [[1.2, 0.5], [1.2, -0.5], [-1.2, 0.5], [-1.2, -0.5]]) { const w = tm(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 22), x, 0.34, z, new THREE.MeshStandardMaterial({ color: "#16161a", roughness: 0.8 })); w.rotation.x = Math.PI / 2; }
  for (const z of [0.38, -0.38]) tm(new THREE.BoxGeometry(0.05, 0.14, 0.2), 2.2, 0.82, z, new THREE.MeshStandardMaterial({ color: "#fff6d0", emissive: "#ffe9a0", emissiveIntensity: 3 }));
  // ── palms along the road ──
  const leaf = tex(cv(256, 64, (g, w, h) => { g.clearRect(0, 0, w, h); const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, "#2d6b34"); gr.addColorStop(1, "#8fcf5a"); g.fillStyle = gr; g.beginPath(); g.moveTo(0, h / 2); for (let i = 0; i <= 20; i++) { const x = i / 20 * w, y = h / 2 - (Math.sin(i / 20 * Math.PI) * h * 0.45) * (i % 2 ? 0.7 : 1); g.lineTo(x, y); } for (let i = 20; i >= 0; i--) { const x = i / 20 * w, y = h / 2 + (Math.sin(i / 20 * Math.PI) * h * 0.45) * (i % 2 ? 0.7 : 1); g.lineTo(x, y); } g.closePath(); g.fill(); g.strokeStyle = "rgba(20,60,20,0.8)"; g.lineWidth = 2; g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke(); }));
  const leafM = new THREE.MeshStandardMaterial({ map: leaf, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.6, transparent: false }), trunkM = new THREE.MeshStandardMaterial({ color: "#6a5240", roughness: 0.9 });
  const palms = [];
  const palm = (x, z, h, lean) => { const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g); let px = 0, py = 0; const seg = 8; for (let i = 0; i < seg; i++) { const l = h / seg, c = new THREE.Mesh(new THREE.CylinderGeometry(0.2 - i * 0.012, 0.22 - i * 0.012, l * 1.08, 10), trunkM); const ang = lean * (i / seg); c.position.set(px + Math.sin(ang) * l * 0.5, py + l * 0.5, 0); c.rotation.z = -ang; c.castShadow = true; g.add(c); px += Math.sin(ang) * l; py += Math.cos(ang) * l; }
    const crown = new THREE.Group(); crown.position.set(px, py, 0); g.add(crown); for (let i = 0; i < 11; i++) { const f = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.75, 8, 1), leafM); const pa = f.geometry.attributes.position; for (let k = 0; k < pa.count; k++) { const u = (pa.getX(k) + 1.8) / 3.6; pa.setZ(k, -Math.pow(u, 1.6) * 1.3); } f.geometry.computeVertexNormals(); f.position.x = 0; const a = i / 11 * Math.PI * 2; const holder = new THREE.Group(); holder.rotation.y = a; f.position.x = 1.8; f.rotation.z = 0.15 + (i % 3) * 0.12; f.rotation.x = -Math.PI / 2 * 0.0; f.castShadow = true; holder.add(f); crown.add(holder); }
    palms.push({ crown, ph: x }); };
  for (let i = -6; i <= 6; i++) { if (Math.abs(i) < 2) continue; palm(i * 5.2 + (i % 2) * 0.6, 5.2 + (i % 2) * 0.3, 7 + (i % 3) * 1.4, (i % 2 ? 0.25 : -0.2)); }
  W.updaters.push((t) => { for (const p of palms) { p.crown.rotation.z = Math.sin(t * 0.9 + p.ph) * 0.025; p.crown.rotation.x = Math.cos(t * 0.7 + p.ph) * 0.02; } });

  // ── street lamps and a neon sign ──
  const lampM = new THREE.MeshStandardMaterial({ color: "#2a2a30", roughness: 0.5, metalness: 0.6 }), bulb = new THREE.MeshStandardMaterial({ color: "#fff2c8", emissive: "#ffd78a", emissiveIntensity: 5 });
  for (const x of [-12, -4, 4, 12, 20, -20]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 6.2, 10), lampM); p.position.set(x, 3.1, 5.9); p.castShadow = true; scene.add(p); const a = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.06), lampM); a.position.set(x, 6.1, 5.4); scene.add(a); const h = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.25), bulb); h.position.set(x, 6.0, 4.8); scene.add(h); if (Math.abs(x) < 15) { const pl = new THREE.PointLight("#ffcf8a", 6, 12, 2); pl.position.set(x, 5.8, 4.8); scene.add(pl); } }
  const signC = (txt, sub) => tex(cv(1024, 512, (g, w, h) => { g.fillStyle = "#101018"; g.fillRect(0, 0, w, h); g.strokeStyle = "#ff3d9a"; g.lineWidth = 10; g.shadowColor = "#ff3d9a"; g.shadowBlur = 30; g.strokeRect(30, 30, w - 60, h - 60); g.fillStyle = "#ffd23a"; g.shadowColor = "#ffb000"; g.font = "800 230px 'Barlow Condensed', sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(txt, w / 2, h * 0.42); g.fillStyle = "#6cf3ff"; g.shadowColor = "#00e0ff"; g.font = "700 74px 'Barlow Condensed', sans-serif"; g.fillText(sub, w / 2, h * 0.8); }));
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 2.8), new THREE.MeshStandardMaterial({ map: signC("CONSTRA", "RUN THE JOB, NOT THE PAPERWORK"), emissive: "#ffffff", emissiveMap: signC("CONSTRA", "RUN THE JOB, NOT THE PAPERWORK"), emissiveIntensity: 1.4, roughness: 0.4 })); sign.position.set(5.6, 3.6, -3.3); sign.rotation.y = -0.35; scene.add(sign); for (const dx of [-2.6, 2.6]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.6, 0.12), lampM); p.position.set(5.6 + dx * Math.cos(0.35), 1.8, -3.3 + dx * 0.34 * 0.0); p.castShadow = true; scene.add(p); }
  W.sign = sign; W.updaters.push((t) => { sign.material.emissiveIntensity = 1.35 + Math.sin(t * 7) * 0.05 + (Math.sin(t * 31) > 0.97 ? -0.4 : 0); });
  // ── drifting dust in the light ──
  { const n = 420, g = new THREE.BufferGeometry(), a = new Float32Array(n * 3), s = rnd(77); for (let i = 0; i < n; i++) { a[i * 3] = (s() - 0.5) * 26; a[i * 3 + 1] = s() * 7; a[i * 3 + 2] = (s() - 0.5) * 18 + 2; } g.setAttribute("position", new THREE.BufferAttribute(a, 3)); const dust = new THREE.Points(g, new THREE.PointsMaterial({ color: "#ffd9a0", size: 0.035, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })); scene.add(dust); W.updaters.push((t) => { dust.position.set(Math.sin(t * 0.2) * 0.6, 0, Math.cos(t * 0.17) * 0.5); }); }
  W.update = (t) => { skyMat.uniforms.time.value = t; for (const f of W.updaters) f(t); };
  W.marks = { house };
  return W;
}
