"use client";

import { useEffect, useRef } from "react";
import type * as T from "three";

// A low-poly job site rendered with three.js: a steel-frame building whose next level goes up
// over one "day", a working tower crane, a geofence ring and the crew clocking in and out.
// `progress` (0..1, 6:30 AM to 5:30 PM) drives everything so the DOM overlay can stay in sync.

export const LOOP_SECONDS = 32;
const HOLD_SECONDS = 3;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

type Props = {
  playing: boolean;
  /** Start position when the scene mounts paused (e.g. reduced motion) */
  initialProgress?: number;
  /** 0 = wide establishing shot, 1 = settled working shot. Driven by scroll. */
  reveal?: number;
  onProgress?: (p: number) => void;
  onReady?: (ok: boolean) => void;
};

export default function SiteScene({ playing, initialProgress = 0, reveal = 1, onProgress, onReady }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playingRef = useRef(playing);
  const revealRef = useRef(reveal);
  const progressCb = useRef(onProgress);
  const readyCb = useRef(onReady);

  useEffect(() => { playingRef.current = playing; }, [playing]);
  useEffect(() => { revealRef.current = reveal; }, [reveal]);
  useEffect(() => { progressCb.current = onProgress; readyCb.current = onReady; }, [onProgress, onReady]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let settled = false;
    let cleanup = () => {};
    // A chunk that never arrives (flaky connection, blocked CDN) leaves the import pending
    // forever, so give up after a while and let the caller show its fallback.
    const giveUp = setTimeout(() => {
      if (!settled && !disposed) { settled = true; readyCb.current?.(false); }
    }, 12000);
    const settle = (ok: boolean) => {
      if (settled || disposed) return;
      settled = true;
      clearTimeout(giveUp);
      readyCb.current?.(ok);
    };

    // Only pull in three.js once the section is close to the viewport
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      import("three").then((THREE) => {
        if (disposed) return;
        try {
          cleanup = build(THREE, host);
          settle(true);
        } catch {
          settle(false);
        }
      }).catch(() => settle(false));
    }, { rootMargin: "300px" });
    io.observe(host);

    function build(THREE: typeof T, el: HTMLDivElement) {
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      // Filmic response keeps the midday sun from blowing out the concrete and holds
      // detail in the shadowed bays, which is most of what reads as "real" here.
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.35;
      el.appendChild(renderer.domElement);
      renderer.domElement.setAttribute("aria-hidden", "true");

      const scene = new THREE.Scene();
      const NIGHT = new THREE.Color("#151617");
      scene.background = NIGHT.clone();
      scene.fog = new THREE.Fog(NIGHT.clone(), 48, 100);

      const camera = new THREE.PerspectiveCamera(34, 1, 0.5, 200);

      // A room environment gives every surface something to reflect. Without it, steel
      // reads as flat grey paint no matter how the roughness is tuned.
      let pmrem: T.PMREMGenerator | null = null;
      import("three/examples/jsm/environments/RoomEnvironment.js")
        .then(({ RoomEnvironment }) => {
          if (disposed) return;
          pmrem = new THREE.PMREMGenerator(renderer);
          scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
          scene.environmentIntensity = 0.35;
        })
        .catch(() => { /* lighting still works without it */ });

      // ── Materials ─────────────────────────────────────────────────────────
      /** Grainy tile used to break up large flat surfaces (gravel pad, dirt). */
      function grainTexture(base: string, speck: string, density: number, size = 256) {
        const c = document.createElement("canvas");
        c.width = c.height = size;
        const g = c.getContext("2d");
        if (!g) return null;
        g.fillStyle = base;
        g.fillRect(0, 0, size, size);
        for (let i = 0; i < density; i++) {
          const r = Math.random() * 2.2 + 0.4;
          g.globalAlpha = 0.05 + Math.random() * 0.22;
          g.fillStyle = Math.random() > 0.5 ? speck : "#000000";
          g.beginPath();
          g.arc(Math.random() * size, Math.random() * size, r, 0, Math.PI * 2);
          g.fill();
        }
        const tex = new THREE.CanvasTexture(c);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
        return tex;
      }

      const padTex = grainTexture("#4A4C4E", "#8A8C8E", 2600);
      const dirtTex = grainTexture("#26282A", "#3C3E40", 1800);
      if (padTex) padTex.repeat.set(10, 7);
      if (dirtTex) dirtTex.repeat.set(26, 26);

      const std = (color: string, extra: Partial<T.MeshStandardMaterialParameters> = {}) =>
        new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05, ...extra });
      const M = {
        ground: std(dirtTex ? "#FFFFFF" : "#26282A", { roughness: 1, map: dirtTex ?? undefined }),
        pad: std(padTex ? "#FFFFFF" : "#4A4C4E", { roughness: 0.95, map: padTex ?? undefined }),
        // Cured concrete: rough, slightly warm, no shine
        concrete: std("#BDB9B1", { roughness: 0.92, metalness: 0 }),
        // Wet pour is darker and still damp enough to catch a little light
        freshConcrete: std("#8A8781", { roughness: 0.55, metalness: 0 }),
        steel: std("#8A9199", { metalness: 0.85, roughness: 0.42 }),
        hv: std("#F5C400", { roughness: 0.45, metalness: 0.1 }),
        hvDark: std("#C99F00", { roughness: 0.5, metalness: 0.1 }),
        ink: std("#1E2022", { roughness: 0.7, metalness: 0.2 }),
        trailer: std("#DEDCD7", { roughness: 0.6, metalness: 0.05 }),
        glass: std("#43535F", { transparent: true, opacity: 0.4, roughness: 0.08, metalness: 0.9 }),
        skin: std("#C68E63", { roughness: 0.75 }),
        hat: std("#F5F4F1", { roughness: 0.35 }),
        load: std("#9C4A2E", { roughness: 0.8 }),
        pallet: std("#8B6B43", { roughness: 0.95 }),
        rebar: std("#6E5B4B", { metalness: 0.7, roughness: 0.65 }),
        mesh: std("#9AA0A6", { metalness: 0.8, roughness: 0.5 }),
        cone: std("#E2561F", { roughness: 0.6 }),
        pin: new THREE.MeshStandardMaterial({ color: "#2EAA62", emissive: "#1E7A45", emissiveIntensity: 0.9, roughness: 0.4 }),
      };
      const geos: T.BufferGeometry[] = [];
      const box = (w: number, h: number, d: number) => { const g = new THREE.BoxGeometry(w, h, d); geos.push(g); return g; };
      const mesh = (g: T.BufferGeometry, m: T.Material, x = 0, y = 0, z = 0, cast = true) => {
        const o = new THREE.Mesh(g, m);
        o.position.set(x, y, z);
        o.castShadow = cast;
        o.receiveShadow = true;
        return o;
      };

      // ── Lights ────────────────────────────────────────────────────────────
      const hemi = new THREE.HemisphereLight("#BBD4EC", "#3A3028", 0.55);
      scene.add(hemi);
      const sun = new THREE.DirectionalLight("#FFF6E8", 2.6);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 26, bottom: -24, near: 1, far: 90 });
      sun.shadow.bias = -0.0006;
      sun.shadow.normalBias = 0.02;
      sun.shadow.radius = 2.5;
      scene.add(sun, sun.target);
      // Cool bounce from the open sky on the shaded side, so dark faces aren't dead black
      const bounce = new THREE.DirectionalLight("#9FB8D6", 0.35);
      bounce.position.set(-18, 8, -16);
      scene.add(bounce);

      // ── Ground + site ─────────────────────────────────────────────────────
      const ground = mesh(new THREE.PlaneGeometry(200, 200), M.ground, 0, 0, 0, false);
      geos.push(ground.geometry);
      ground.rotation.x = -Math.PI / 2;
      scene.add(ground);
      scene.add(mesh(box(30, 0.12, 22), M.pad, 0, 0.06, 0, false));

      const grid = new THREE.GridHelper(30, 15, "#3A3D40", "#2A2C2E");
      grid.position.y = 0.13;
      (grid.material as T.Material).transparent = true;
      (grid.material as T.Material).opacity = 0.6;
      scene.add(grid);

      // ── Building: 3 finished levels, level 4 goes up during the day ───────
      const XS = [-4.8, -2.4, 0, 2.4, 4.8];
      const ZS = [-2.8, 0, 2.8];
      const FLOOR = 2.6;
      const building = new THREE.Group();
      scene.add(building);
      const colGeo = box(0.32, FLOOR, 0.32);
      const slabGeo = box(10.4, 0.24, 6.4);
      for (let lvl = 0; lvl < 3; lvl++) {
        for (const x of XS) for (const z of ZS) building.add(mesh(colGeo, M.steel, x, lvl * FLOOR + FLOOR / 2 + 0.12, z));
        const slab = mesh(slabGeo, M.concrete.clone(), 0, (lvl + 1) * FLOOR + 0.12, 0);
        (slab.material as T.MeshStandardMaterial).color.offsetHSL(0, 0, (lvl - 1) * 0.012);
        building.add(slab);
        if (lvl < 2) {
          // Glazing on the finished floors
          const gz = box(9.6, FLOOR - 0.3, 0.06);
          building.add(mesh(gz, M.glass, 0, lvl * FLOOR + FLOOR / 2 + 0.2, 3.15, false));
          building.add(mesh(gz, M.glass, 0, lvl * FLOOR + FLOOR / 2 + 0.2, -3.15, false));
        }
      }
      building.add(mesh(slabGeo, M.concrete, 0, 0.12, 0));
      // Hi-vis edge protection on the working deck
      const railGeo = box(10.4, 0.07, 0.07);
      const railSideGeo = box(0.07, 0.07, 6.4);
      const deckY = 3 * FLOOR + 0.24;
      for (const h of [0.5, 1.0]) {
        building.add(mesh(railGeo, M.hv, 0, deckY + h, 3.2, false));
        building.add(mesh(railGeo, M.hv, 0, deckY + h, -3.2, false));
        building.add(mesh(railSideGeo, M.hv, 5.2, deckY + h, 0, false));
        building.add(mesh(railSideGeo, M.hv, -5.2, deckY + h, 0, false));
      }
      // Level 4 columns (rise one by one) and the deck pour (spreads across)
      const newCols: T.Mesh[] = [];
      for (const x of XS) for (const z of ZS) {
        const c = mesh(colGeo, M.steel, x, 0, z);
        c.visible = false;
        newCols.push(c);
        building.add(c);
      }
      const pour = mesh(slabGeo, M.freshConcrete, 0, 4 * FLOOR + 0.12, 0);
      pour.visible = false;
      building.add(pour);

      // Rebar mat on the working deck — the grid you actually see before a pour
      const rebarGroup = new THREE.Group();
      building.add(rebarGroup);
      const rebarGeoX = box(10.2, 0.06, 0.06);
      const rebarGeoZ = box(0.06, 0.06, 6.2);
      for (let z = -3; z <= 3; z += 0.75) rebarGroup.add(mesh(rebarGeoX, M.rebar, 0, deckY + 0.14, z, false));
      for (let x = -5; x <= 5; x += 0.75) rebarGroup.add(mesh(rebarGeoZ, M.rebar, x, deckY + 0.2, 0, false));

      // Scaffolding up one elevation
      const scaff = new THREE.Group();
      scene.add(scaff);
      const poleGeo = box(0.12, 3 * FLOOR + 0.6, 0.12);
      const ledgerGeo = box(2.4, 0.09, 0.09);
      const plankGeo = box(2.4, 0.08, 1.1);
      for (let i = 0; i < 5; i++) {
        const x = -5.4 + i * 2.4;
        scaff.add(mesh(poleGeo, M.mesh, x, (3 * FLOOR + 0.6) / 2, 3.9));
        scaff.add(mesh(poleGeo, M.mesh, x, (3 * FLOOR + 0.6) / 2, 4.9));
      }
      for (let lvl = 1; lvl <= 3; lvl++) {
        const y = lvl * FLOOR;
        for (let i = 0; i < 4; i++) {
          const x = -4.2 + i * 2.4;
          scaff.add(mesh(ledgerGeo, M.mesh, x, y, 3.9, false));
          scaff.add(mesh(ledgerGeo, M.mesh, x, y, 4.9, false));
          scaff.add(mesh(plankGeo, M.pallet, x, y + 0.1, 4.4));
        }
      }

      // Mesh fence panels around the pad, with the hi-vis rail that reads at a distance
      const fenceGroup = new THREE.Group();
      scene.add(fenceGroup);
      const panelGeo = box(3.4, 2, 0.05);
      const fencePostGeo = box(0.1, 2.1, 0.1);
      const fenceMatPanel = new THREE.MeshStandardMaterial({ color: "#8E959C", metalness: 0.75, roughness: 0.55, transparent: true, opacity: 0.32 });
      const fenceLine = (x0: number, z0: number, x1: number, z1: number) => {
        const len = Math.hypot(x1 - x0, z1 - z0);
        const n = Math.max(1, Math.round(len / 3.5));
        const ang = Math.atan2(z1 - z0, x1 - x0);
        for (let i = 0; i < n; i++) {
          const t = (i + 0.5) / n;
          const px = x0 + (x1 - x0) * t, pz = z0 + (z1 - z0) * t;
          const panel = mesh(panelGeo, fenceMatPanel, px, 1, pz, false);
          panel.rotation.y = -ang;
          fenceGroup.add(panel);
          const post = mesh(fencePostGeo, M.mesh, x0 + (x1 - x0) * (i / n), 1.05, z0 + (z1 - z0) * (i / n));
          fenceGroup.add(post);
        }
      };
      fenceLine(-13, 9.5, 13, 9.5);
      fenceLine(-13, -9.5, -13, 9.5);
      fenceLine(13, -9.5, 13, 4);

      // Cones along the haul route
      const coneGeo = new THREE.ConeGeometry(0.28, 0.7, 12); geos.push(coneGeo);
      const coneBaseGeo = box(0.6, 0.06, 0.6);
      for (const [cx, cz] of [[6.5, 7.5], [8.5, 7.1], [10.5, 6.7], [-8.5, 7.6]]) {
        scene.add(mesh(coneGeo, M.cone, cx, 0.45, cz));
        scene.add(mesh(coneBaseGeo, M.ink, cx, 0.1, cz, false));
      }

      // ── Tower crane ───────────────────────────────────────────────────────
      const crane = new THREE.Group();
      crane.position.set(-9.5, 0, -6.5);
      scene.add(crane);
      const MAST = 17;
      crane.add(mesh(box(2.2, 0.6, 2.2), M.ink, 0, 0.3, 0));
      crane.add(mesh(box(0.9, MAST, 0.9), M.hv, 0, MAST / 2, 0));
      // Lattice impression: dark bands up the mast
      const bandGeo = box(0.95, 0.08, 0.95);
      for (let y = 1; y < MAST; y += 1.1) crane.add(mesh(bandGeo, M.hvDark, 0, y, 0, false));
      const slew = new THREE.Group();
      slew.position.y = MAST;
      crane.add(slew);
      slew.add(mesh(box(1.4, 1.1, 1.4), M.ink, 0, 0.55, 0));
      slew.add(mesh(box(17, 0.5, 0.6), M.hv, 5.5, 1.3, 0));
      slew.add(mesh(box(2, 1, 1.1), M.ink, -2.6, 0.8, 0));
      slew.add(mesh(box(0.5, 2.4, 0.5), M.hv, 0, 2.3, 0));
      const trolley = mesh(box(0.7, 0.3, 0.7), M.ink, 8, 0.9, 0, false);
      slew.add(trolley);
      const cableGeo = box(0.05, 1, 0.05);
      const cable = mesh(cableGeo, M.ink, 0, 0, 0, false);
      trolley.add(cable);
      const load = mesh(box(2.6, 0.32, 0.5), M.load, 0, 0, 0);
      trolley.add(load);

      // ── Site trailer + material pallets ───────────────────────────────────
      scene.add(mesh(box(5.5, 2.3, 2.4), M.trailer, 9.5, 1.3, -7.5));
      scene.add(mesh(box(0.9, 1.7, 0.08), M.ink, 8.4, 1.0, -6.27, false));
      scene.add(mesh(box(5.6, 0.12, 2.5), M.ink, 9.5, 2.5, -7.5, false));
      const palGeo = box(1.2, 0.5, 1.2);
      [[-10.5, 5.5], [-9, 6.8], [-10.8, 7.2], [11.5, -5.5]].forEach(([x, z]) => scene.add(mesh(palGeo, M.pallet, x, 0.37, z)));

      // ── Geofence ──────────────────────────────────────────────────────────
      const FENCE_R = 13.5;
      const fenceMat = new THREE.MeshBasicMaterial({ color: "#F5C400", transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
      const fence = new THREE.Mesh(new THREE.RingGeometry(FENCE_R - 0.12, FENCE_R, 96), fenceMat);
      geos.push(fence.geometry);
      fence.rotation.x = -Math.PI / 2;
      fence.position.y = 0.16;
      scene.add(fence);
      const pulseMat = fenceMat.clone();
      const pulse = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 96), pulseMat);
      geos.push(pulse.geometry);
      pulse.rotation.x = -Math.PI / 2;
      pulse.position.y = 0.17;
      scene.add(pulse);

      // ── The app, on site ──────────────────────────────────────────────────
      // Screen plays the real screen recording, so what glows here is the product itself.
      const phoneRig = new THREE.Group();
      phoneRig.position.set(10.9, 0, 5.9);
      scene.add(phoneRig);

      const phoneVideo = document.createElement("video");
      phoneVideo.src = "/site/app-demo.webm";
      phoneVideo.loop = true;
      phoneVideo.muted = true;
      phoneVideo.playsInline = true;
      phoneVideo.preload = "auto";
      phoneVideo.crossOrigin = "anonymous";
      const screenTex = new THREE.VideoTexture(phoneVideo);
      screenTex.colorSpace = THREE.SRGBColorSpace;
      void phoneVideo.play().catch(() => { /* a still frame is fine if autoplay is refused */ });

      // Stand it on a lumber stack so it reads as left on site, not floating
      phoneRig.add(mesh(box(3.4, 0.55, 2.6), M.pallet, 0, 0.275, 0));
      const PH = 5.2, PW = 2.55, PD = 0.26;
      const body = mesh(box(PW, PH, PD), M.ink, 0, 0.55 + PH / 2, 0);
      phoneRig.add(body);
      const screenMat = new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false });
      const screen = new THREE.Mesh(box(PW - 0.22, PH - 0.3, 0.02), screenMat);
      screen.position.set(0, 0.55 + PH / 2, PD / 2 + 0.012);
      phoneRig.add(screen);
      // The screen throws a little light the way a real one does at dusk
      const screenGlow = new THREE.PointLight("#CFE4FF", 6, 14, 2);
      screenGlow.position.set(0, 0.55 + PH / 2, PD / 2 + 1.6);
      phoneRig.add(screenGlow);

      // ── Crew ──────────────────────────────────────────────────────────────
      const bodyGeo = new THREE.CapsuleGeometry(0.26, 0.6, 3, 8); geos.push(bodyGeo);
      const headGeo = new THREE.SphereGeometry(0.2, 10, 8); geos.push(headGeo);
      const hatGeo = new THREE.SphereGeometry(0.24, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2); geos.push(hatGeo);
      const pinGeo = new THREE.ConeGeometry(0.22, 0.5, 10); geos.push(pinGeo);
      const pinBallGeo = new THREE.SphereGeometry(0.26, 12, 10); geos.push(pinBallGeo);
      const GATE = new THREE.Vector3(15, 0, 9);
      const crewSpots: [number, number, number][] = [
        // x, z, clock-in progress
        [-2.5, 4.6, 0.04], [1.8, 4.9, 0.06], [6.8, 1.0, 0.08], [-7.2, 2.4, 0.1], [7.6, 4.2, 0.12], [-6.2, -5.4, 0.15],
      ];
      const crew = crewSpots.map(([x, z, tIn], i) => {
        const g = new THREE.Group();
        g.add(mesh(bodyGeo, i % 3 === 2 ? M.hvDark : M.hv, 0, 0.56, 0));
        g.add(mesh(headGeo, M.skin, 0, 1.3, 0));
        g.add(mesh(hatGeo, i === 0 ? M.hv : M.hat, 0, 1.38, 0));
        const pin = new THREE.Group();
        const cone = mesh(pinGeo, M.pin, 0, 0, 0, false);
        cone.rotation.x = Math.PI;
        pin.add(cone);
        pin.add(mesh(pinBallGeo, M.pin, 0, 0.32, 0, false));
        pin.position.y = 2.4;
        g.add(pin);
        g.visible = false;
        scene.add(g);
        return { g, pin, spot: new THREE.Vector3(x, 0.12, z), tIn, tOut: 0.9 + i * 0.012, phase: i * 1.7 };
      });

      // ── Photo flash (11:20) ───────────────────────────────────────────────
      const flash = new THREE.PointLight("#FFFFFF", 0, 14, 2);
      flash.position.set(2, deckY + 1.6, 3.6);
      scene.add(flash);

      // ── Sizing ────────────────────────────────────────────────────────────
      let narrow = false;
      const resize = () => {
        const w = el.clientWidth || 1, h = el.clientHeight || 1;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        // Pull back on narrow screens so the whole site stays in frame
        narrow = w < 640;
        camera.fov = narrow ? 40 : 34;
        camera.updateProjectionMatrix();
      };
      const ro = new ResizeObserver(resize);
      ro.observe(el);
      resize();

      // ── Pointer parallax ──────────────────────────────────────────────────
      let px = 0, py = 0, tx = 0, ty = 0;
      const onMove = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
        ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
      };
      const onLeave = () => { tx = 0; ty = 0; };
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerleave", onLeave);

      // ── Visibility: only animate on screen and in a visible tab ───────────
      let onScreen = true;
      const vis = new IntersectionObserver((es) => { onScreen = es.some((e) => e.isIntersecting); });
      vis.observe(el);

      const warm = new THREE.Color("#FFB070"), white = new THREE.Color("#FFFFFF");
      const sky0 = new THREE.Color("#171621"), sky1 = new THREE.Color("#2B3647");

      let t = initialProgress * LOOP_SECONDS;
      let orbit = 0.65;
      let last = performance.now();
      let lastP = -1;
      let raf = 0;
      if (process.env.NODE_ENV !== "production") (window as unknown as { __siteSeek?: (p: number) => void }).__siteSeek = (v: number) => { t = v * LOOP_SECONDS; };

      const apply = (p: number) => {
        // Sun crosses the sky; warm at the ends of the day
        const sunA = Math.PI * (0.08 + 0.84 * p);
        sun.position.set(Math.cos(sunA) * 30, Math.sin(sunA) * 24 + 4, 12);
        const edge = 1 - Math.sin(Math.PI * p);
        sun.color.copy(white).lerp(warm, edge * 0.8);
        sun.intensity = 2.4 + 1.6 * (1 - edge);
        hemi.intensity = 0.5 + 0.5 * (1 - edge);
        (scene.background as T.Color).copy(sky0).lerp(sky1, 1 - edge);
        (scene.fog as T.Fog).color.copy(scene.background as T.Color);

        // Level 4 columns rise one at a time (9:00 to 12:00)
        newCols.forEach((c, i) => {
          const s = smooth(0.24 + i * 0.016, 0.3 + i * 0.016, p);
          c.visible = s > 0.001;
          c.scale.y = Math.max(s, 0.001);
          c.position.y = deckY + (FLOOR * s) / 2;
        });
        // Deck pour spreads across (1:30 to 3:00)
        const ps = smooth(0.62, 0.78, p);
        rebarGroup.visible = ps < 0.999;
        pour.visible = ps > 0.001;
        pour.scale.set(Math.max(ps, 0.001), 1, 1);
        pour.position.x = -5.2 + 5.2 * ps;
        (pour.material as T.MeshStandardMaterial).color.set(ps >= 1 ? "#B1ADA5" : "#8E8B85");

        // Crane: swings steel in from the laydown area while the columns go up
        const swing = smooth(0.14, 0.24, p) - smooth(0.5, 0.58, p);
        slew.rotation.y = -0.35 - 1.05 * swing + Math.sin(p * 9) * 0.05;
        trolley.position.x = 7 + 2.5 * swing;
        const drop = 3 + 6 * (1 - swing);
        cable.scale.y = drop;
        cable.position.y = -drop / 2;
        load.position.y = -drop - 0.2;
        load.visible = p > 0.1 && p < 0.56;

        // Flash for the inspection photo
        flash.intensity = 60 * Math.max(0, 1 - Math.abs(p - 0.44) * 60);
      };

      const frame = (now: number) => {
        raf = requestAnimationFrame(frame);
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        if (!onScreen || document.hidden) {
          if (!phoneVideo.paused) phoneVideo.pause();
          return;
        }
        if (phoneVideo.paused && playingRef.current) void phoneVideo.play().catch(() => {});

        if (playingRef.current) {
          t += dt;
          orbit += dt * 0.045;
          if (t > LOOP_SECONDS + HOLD_SECONDS) t = 0;
        }
        const p = clamp01(t / LOOP_SECONDS);

        px += (tx - px) * 0.05;
        py += (ty - py) * 0.05;
        const a = orbit + px * 0.35;
        // Wide and high at the start of the section, settling in as it scrolls up
        const rv = clamp01(revealRef.current);
        const eased = 1 - Math.pow(1 - rv, 3);
        const R = (narrow ? 37 : 42) + (1 - eased) * 46;
        const H = (narrow ? 19 : 21) - py * 5 + (1 - eased) * 30;
        camera.position.set(Math.cos(a) * R, H, Math.sin(a) * R);
        camera.lookAt(0, 6.5 - (1 - eased) * 2, 0);
        // A touch of dolly-zoom: the frame tightens as the camera closes in
        const targetFov = (narrow ? 40 : 34) + (1 - eased) * 10;
        if (Math.abs(camera.fov - targetFov) > 0.01) { camera.fov = targetFov; camera.updateProjectionMatrix(); }

        // Turn the phone to the camera so the screen is never edge-on
        phoneRig.rotation.y = Math.atan2(
          camera.position.x - phoneRig.position.x,
          camera.position.z - phoneRig.position.z,
        );

        apply(p);

        // Crew walk in from the gate, work, walk out
        crew.forEach((c, i) => {
          const arrive = smooth(c.tIn - 0.035, c.tIn, p);
          const leave = smooth(c.tOut, c.tOut + 0.035, p);
          const here = arrive * (1 - leave);
          c.g.visible = p > c.tIn - 0.035 && p < c.tOut + 0.035;
          const wander = here * 0.5;
          c.g.position.lerpVectors(GATE, c.spot, here);
          c.g.position.x += Math.sin(now / 900 + c.phase) * wander;
          c.g.position.z += Math.cos(now / 1100 + c.phase) * wander * 0.6;
          c.g.rotation.y = Math.atan2(c.spot.x - GATE.x, c.spot.z - GATE.z) + (here > 0.98 ? Math.sin(now / 700 + i) * 0.6 : 0);
          // Pin pops in when the clock-in is verified
          const pinS = here > 0.95 ? Math.min(1, (p - c.tIn) * 40) : 0;
          c.pin.scale.setScalar(Math.max(pinS, 0.001));
          c.pin.position.y = 2.4 + Math.sin(now / 400 + c.phase) * 0.12;
          c.pin.rotation.y = now / 600;
        });

        // Geofence pulse while anyone is on site
        const live = p > 0.03 && p < 0.95;
        const k = (now / 2200) % 1;
        pulse.scale.setScalar(1 + k * (FENCE_R - 1));
        pulseMat.opacity = live ? 0.5 * (1 - k) : 0;
        fenceMat.opacity = live ? 0.55 : 0.25;

        renderer.render(scene, camera);
        if (Math.abs(p - lastP) > 0.001) { lastP = p; progressCb.current?.(p); }
      };
      apply(clamp01(t / LOOP_SECONDS));
      progressCb.current?.(clamp01(t / LOOP_SECONDS));
      raf = requestAnimationFrame(frame);

      return () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        vis.disconnect();
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerleave", onLeave);
        geos.forEach((g) => g.dispose());
        grid.geometry.dispose();
        (grid.material as T.Material).dispose();
        Object.values(M).forEach((m) => m.dispose());
        fenceMat.dispose();
        pulseMat.dispose();
        phoneVideo.pause();
        phoneVideo.removeAttribute("src");
        phoneVideo.load();
        screenTex.dispose();
        screenMat.dispose();
        padTex?.dispose();
        dirtTex?.dispose();
        pmrem?.dispose();
        scene.environment = null;
        renderer.dispose();
        renderer.domElement.remove();
      };
    }

    return () => {
      disposed = true;
      clearTimeout(giveUp);
      io.disconnect();
      cleanup();
    };
  // initialProgress is only read on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={hostRef} className="lp-scene" />;
}
