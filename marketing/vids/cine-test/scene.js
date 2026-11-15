import * as THREE from "three";
import { createHuman } from "/cine/human.js";
import { buildWorld } from "/cine/world.js";
import { createPost } from "/cine/post.js";
let R, scene, cam, glc, H3 = [], W3, P, key;
export default {
  endHold: 1, voices: { Mac: {} },
  async init(E) {
    glc = document.createElement("canvas"); glc.width = E.W; glc.height = E.H;
    R = new THREE.WebGLRenderer({ canvas: glc, antialias: false, preserveDrawingBuffer: true }); R.setPixelRatio(1); R.setSize(E.W, E.H, false); R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 0.95;
    scene = new THREE.Scene(); cam = new THREE.PerspectiveCamera(34, E.W / E.H, 0.1, 900);
    W3 = buildWorld(scene, R);
    H3 = [createHuman({ skin: "#e8b98a", shirt: "#f2f2f2", sleeve: "#f2f2f2", pants: "#1f2a44", hat: "#f4f4f4", hair: "#3a2519", stache: true, eye: "#4a3a2a" }), createHuman({ skin: "#f3c9a5", shirt: "#c2336b", pants: "#2b2f3a", vest: "#F5C400", hat: "#F5C400", hair: "#7a3b1d", hairStyle: "ponytail", glove: "#2a2a2d", eye: "#3a5a7a" }), createHuman({ skin: "#9c6a46", shirt: "#444b57", pants: "#5b4a3a", vest: "#ff7a1c", hat: "#ff7a1c", hair: "#1d1410", beard: true, build: 1.08, eye: "#2a1a10" })];
    H3.forEach((h) => scene.add(h.root)); key = new THREE.SpotLight("#ffe2c8", 8, 0, 0.7, 0.9, 2); scene.add(key, key.target);
    P = createPost(R, scene, cam, E.W, E.H);
  },
  draw(t, c, E) {
    W3.update(t);
    H3.forEach((h, i) => h.set({ x: (i - 1) * 1.25, z: 1.5, ry: -0.2 * (i - 1) + 0.15, t, ph: t * 5, amt: 1, mouth: i === 0 ? 0.5 + 0.5 * Math.sin(t * 9) : 0, mood: ["happy", "smug", "angry"][i], blink: 0 }));
    const shots = [[[0.4, 1.0, 7.5], [0, 1.2, 0], 34, 6.5], [[-0.5, 1.58, 3.0], [0.0, 1.58, 1.5], 26, 1.6], [[2.2, 5.5, 14], [0, 2.5, -4], 38, 14]];
    const s = shots[Math.min(2, Math.floor(t / 1.0))]; cam.position.set(...s[0]); cam.lookAt(...s[1]); cam.fov = s[2]; cam.updateProjectionMatrix(); key.position.copy(cam.position).add(new THREE.Vector3(0.6, 0.4, 0)); { const d = key.position.distanceTo(new THREE.Vector3(...s[1])); key.intensity = Math.min(60, 0.9 * d * d); } key.target.position.set(s[1][0], s[1][1], s[1][2]);
    P.render(t, { focus: s[3] }); c.drawImage(glc, 0, 0);
  },
  audio() {},
};
