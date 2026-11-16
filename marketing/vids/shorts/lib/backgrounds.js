// Backgrounds for the shorts. Extracted from the sketches: site (toon), office (comic), kitchen (flat), night office (paper).
import { clouds, rr } from "/stage.js";
const INK = "#1a1a1f";
function siteBg(c, E, t, gy) {
  const { W, H, V } = E; const g = c.createLinearGradient(0, 0, 0, gy); g.addColorStop(0, "#74c8ff"); g.addColorStop(1, "#e4f6ff"); c.fillStyle = g; c.fillRect(-40, -40, W + 80, H + 80);
  // sun
  c.fillStyle = "#ffe27a"; c.strokeStyle = INK; c.lineWidth = 7; c.beginPath(); c.arc(W * 0.84, V ? H * 0.12 : H * 0.17, V ? 80 : 64, 0, 7); c.fill(); c.stroke();
  clouds(c, W, H, t, V ? H * 0.2 : H * 0.12);
  // far skyline
  c.fillStyle = "#a9c4e0"; for (let i = 0; i < 9; i++) { const bx = i * (W / 8) - 30, bh = 160 + ((i * 97) % 140); c.fillRect(bx, gy - bh - 20, W / 8 - 12, bh + 20); }
  // crane
  const cx = V ? W * 0.9 : W * 0.93; c.strokeStyle = INK; c.lineWidth = 7; c.fillStyle = "#ffb000"; c.fillRect(cx - 16, gy - (V ? 640 : 560), 32, (V ? 640 : 560)); c.strokeRect(cx - 16, gy - (V ? 640 : 560), 32, (V ? 640 : 560)); const ty = gy - (V ? 640 : 560); c.fillRect(cx - 330, ty, 400, 26); c.strokeRect(cx - 330, ty, 400, 26); const sw = Math.sin(t * 0.8) * 14; c.beginPath(); c.moveTo(cx - 280, ty + 26); c.lineTo(cx - 280 + sw, ty + 170); c.stroke(); c.fillStyle = "#ddd"; c.fillRect(cx - 300 + sw, ty + 170, 40, 26); c.strokeRect(cx - 300 + sw, ty + 170, 40, 26);
  // house frame
  const hx = V ? W * 0.5 : W * 0.5, hw = V ? 620 : 640, hh = V ? 360 : 380, base = gy - 6; c.strokeStyle = INK; c.lineWidth = 7; c.fillStyle = "#e2b678";
  c.fillRect(hx - hw / 2, base - hh, hw, 26); c.strokeRect(hx - hw / 2, base - hh, hw, 26);
  for (let i = 0; i <= 10; i++) { const x = hx - hw / 2 + i * (hw / 10); c.fillRect(x - 11, base - hh + 26, 22, hh - 26); c.strokeRect(x - 11, base - hh + 26, 22, hh - 26); }
  c.beginPath(); c.moveTo(hx - hw / 2 - 20, base - hh); c.lineTo(hx, base - hh - 170); c.lineTo(hx + hw / 2 + 20, base - hh); c.stroke(); c.beginPath(); c.moveTo(hx, base - hh - 170); c.lineTo(hx, base - hh); c.moveTo(hx - hw / 4, base - hh - 85); c.lineTo(hx - hw / 4, base - hh); c.moveTo(hx + hw / 4, base - hh - 85); c.lineTo(hx + hw / 4, base - hh); c.stroke();
  // ground
  c.fillStyle = "#6bbf59"; c.fillRect(-40, gy - 8, W + 80, 40); c.strokeRect(-40, gy - 8, W + 80, 40); c.fillStyle = "#c89a5e"; c.fillRect(-40, gy + 32, W + 80, H); c.fillStyle = "rgba(90,50,10,0.18)"; for (let i = 0; i < 40; i++) { c.beginPath(); c.ellipse((i * 211) % W, gy + 60 + ((i * 131) % (H - gy - 80)), 22, 8, 0, 0, 7); c.fill(); }
  // cones and lumber in the foreground
  const cone = (x, y, s) => { c.fillStyle = "#ff7a1c"; c.beginPath(); c.moveTo(x - 30 * s, y); c.lineTo(x + 30 * s, y); c.lineTo(x + 9 * s, y - 80 * s); c.lineTo(x - 9 * s, y - 80 * s); c.closePath(); c.fill(); c.stroke(); c.fillStyle = "#fff"; c.fillRect(x - 20 * s, y - 52 * s, 40 * s, 13 * s); c.strokeRect(x - 20 * s, y - 52 * s, 40 * s, 13 * s); c.fillStyle = "#e8620f"; c.fillRect(x - 38 * s, y, 76 * s, 12 * s); c.strokeRect(x - 38 * s, y, 76 * s, 12 * s); };
  cone(W * 0.04, gy + 100, 1.1); cone(W * 0.97, gy + 120, 1); c.fillStyle = "#d9a86a"; for (let i = 0; i < 4; i++) { c.fillRect(W * 0.62, gy + 70 + i * 22, 190, 20); c.strokeRect(W * 0.62, gy + 70 + i * 22, 190, 20); }
}
function officeBg(c, E, t, gy) {
  const { W, H, V } = E; c.fillStyle = "#ffe4ef"; c.fillRect(-20, -20, W + 40, H + 40);
  // halftone dots, pop-art style
  c.fillStyle = "rgba(255,90,150,0.22)"; for (let y = 0; y < gy; y += 38) for (let x = ((y / 38) % 2) * 19; x < W; x += 38) { const r = 3 + 8 * (1 - y / gy); c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }
  // sign and frames
  const sw = V ? 860 : 760, sh = V ? 230 : 190, sx = W / 2 - sw / 2, sy = V ? H * 0.045 : H * 0.05; c.fillStyle = "#F5C400"; rr(c, sx, sy, sw, sh, 22); c.fill(); c.strokeStyle = INK; c.lineWidth = 9; c.stroke(); c.fillStyle = INK; c.textAlign = "center"; c.textBaseline = "middle"; c.font = `800 ${V ? 112 : 92}px 'Barlow Condensed', sans-serif`; c.fillText("FRONT OFFICE", W / 2, sy + sh * 0.36); c.font = `800 ${V ? 64 : 52}px 'Barlow Condensed', sans-serif`; c.fillText("QUOTES  ·  INVOICES", W / 2, sy + sh * 0.74);
  const fy = V ? H * 0.3 : H * 0.34; for (const [fx, col] of [[W * 0.09, "#6fb7ff"], [W * 0.91, "#8fe3a0"]]) { c.fillStyle = col; rr(c, fx - 70, fy, 140, 180, 8); c.fill(); c.stroke(); c.fillStyle = "#fff"; c.fillRect(fx - 46, fy + 24, 92, 12); c.fillRect(fx - 46, fy + 52, 70, 12); c.fillRect(fx - 46, fy + 80, 82, 12); }
  // plant
  c.fillStyle = "#c25b3b"; c.beginPath(); c.moveTo(W * 0.93 - 36, gy - 90); c.lineTo(W * 0.93 + 36, gy - 90); c.lineTo(W * 0.93 + 26, gy); c.lineTo(W * 0.93 - 26, gy); c.closePath(); c.fill(); c.stroke(); c.fillStyle = "#3fa24a"; for (let i = 0; i < 5; i++) { c.beginPath(); c.ellipse(W * 0.93 + (i - 2) * 20, gy - 150 - Math.abs(i - 2) * -14, 20, 62, (i - 2) * 0.35, 0, 7); c.fill(); c.stroke(); }
  c.fillStyle = "#a8c6e6"; c.fillRect(-20, gy - 6, W + 40, H); c.strokeStyle = INK; c.lineWidth = 8; c.beginPath(); c.moveTo(-20, gy - 6); c.lineTo(W + 20, gy - 6); c.stroke();
}
function kitchenBg(c, E, t, gy) {
  const { W, H, V } = E; c.fillStyle = "#e9f4f6"; c.fillRect(-20, -20, W + 40, H + 40);
  // teal and white checker backsplash
  const ts = V ? 120 : 100, by = V ? H * 0.34 : H * 0.28; for (let y = by; y < gy; y += ts) for (let x = 0; x < W; x += ts) { c.fillStyle = (((x / ts) | 0) + ((y / ts) | 0)) % 2 ? "#bfe3e8" : "#e9f6f8"; c.fillRect(x, y, ts, ts); }
  // top wall + neon sign
  c.fillStyle = "#2a8f9c"; c.fillRect(-20, -20, W + 40, by + 20); const sw = V ? 840 : 760, sh = V ? 150 : 120, sx = W / 2 - sw / 2, sy = V ? H * 0.05 : H * 0.045; c.fillStyle = "#17353c"; rr(c, sx, sy, sw, sh, 24); c.fill(); const glow = 0.8 + 0.2 * Math.sin(t * 3); c.shadowColor = "#F5C400"; c.shadowBlur = 30 * glow; c.fillStyle = "#F5C400"; c.font = `800 ${V ? 88 : 72}px 'Barlow Condensed', sans-serif`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(window.__sign || "COOKING WITH CONSTRA", W / 2, sy + sh / 2 + 4); c.shadowBlur = 0;
  // hanging pans and a shelf of jars
  c.strokeStyle = "#17353c"; c.lineWidth = 6; for (let i = 0; i < 4; i++) { const px = (V ? 120 : 160) + i * (V ? 250 : 190) + (i > 1 ? (V ? 220 : 560) : 0), py = by + 40; c.beginPath(); c.moveTo(px, by - 6); c.lineTo(px, py); c.stroke(); c.fillStyle = ["#4a5568", "#c95c3b", "#4a5568", "#e0a02b"][i]; c.beginPath(); c.arc(px, py + 52, 46, 0, 7); c.fill(); c.fillStyle = "rgba(255,255,255,0.18)"; c.beginPath(); c.arc(px - 14, py + 40, 16, 0, 7); c.fill(); }
  c.fillStyle = "#c98f5a"; c.fillRect(W * 0.04, by + 210, W * 0.28, 14); for (let i = 0; i < 4; i++) { c.fillStyle = ["#e0301e", "#F5C400", "#6bbf59", "#ffffff"][i]; rr(c, W * 0.06 + i * 62, by + 150, 46, 60, 8); c.fill(); }
  // studio floor
  c.fillStyle = "#cdd8dd"; c.fillRect(-20, gy - 6, W + 40, H);
}
function nightBg(c, E, t, gy) {
  const { W, H, V } = E; const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#1c2a4a"); g.addColorStop(1, "#35476b"); c.fillStyle = g; c.fillRect(-40, -40, W + 80, H + 80);
  c.shadowColor = "rgba(0,0,10,0.4)"; c.shadowOffsetX = 5; c.shadowOffsetY = 8;
  // window with the moon and a paper skyline
  const wx = V ? W * 0.5 : W * 0.5, wy = V ? H * 0.14 : H * 0.1, ww = V ? 620 : 560, wh = V ? 420 : 330; c.fillStyle = "#0f1a35"; rr(c, wx - ww / 2, wy, ww, wh, 16); c.fill(); c.shadowColor = "transparent";
  c.save(); rr(c, wx - ww / 2, wy, ww, wh, 16); c.clip(); c.fillStyle = "#f3e8b8"; c.beginPath(); c.arc(wx + ww * 0.22, wy + wh * 0.3, 70, 0, 7); c.fill(); c.fillStyle = "#0b1630"; for (let i = 0; i < 9; i++) { const bh = 90 + ((i * 53) % 130); c.fillRect(wx - ww / 2 + i * (ww / 8.5), wy + wh - bh, ww / 9.5, bh); } c.fillStyle = "rgba(255,225,120,0.8)"; for (let i = 0; i < 24; i++) c.fillRect(wx - ww / 2 + 14 + (i * 43) % (ww - 30), wy + wh - 30 - ((i * 37) % 120), 7, 9); for (let i = 0; i < 16; i++) { c.fillStyle = "rgba(255,255,255,0.75)"; c.fillRect(wx - ww / 2 + (i * 71) % ww, wy + 12 + (i * 29) % 140, 3, 3); } c.restore();
  c.strokeStyle = "#e8d9b0"; c.lineWidth = 12; rr(c, wx - ww / 2, wy, ww, wh, 16); c.stroke(); c.beginPath(); c.moveTo(wx, wy); c.lineTo(wx, wy + wh); c.moveTo(wx - ww / 2, wy + wh * 0.5); c.lineTo(wx + ww / 2, wy + wh * 0.5); c.stroke();
  // wall clock showing nine
  const cx = V ? W * 0.14 : W * 0.12, cy = V ? H * 0.3 : H * 0.22; c.shadowColor = "rgba(0,0,10,0.4)"; c.shadowOffsetX = 4; c.shadowOffsetY = 6; c.fillStyle = "#f4ead0"; c.beginPath(); c.arc(cx, cy, 70, 0, 7); c.fill(); c.shadowColor = "transparent"; c.strokeStyle = "#3b2a1a"; c.lineWidth = 6; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx - 44, cy); c.moveTo(cx, cy); c.lineTo(cx, cy - 56); c.stroke(); c.fillStyle = "#3b2a1a"; c.beginPath(); c.arc(cx, cy, 7, 0, 7); c.fill();
  // floor: layered cardboard
  c.shadowColor = "rgba(0,0,10,0.4)"; c.shadowOffsetY = -6; c.fillStyle = "#6b4a2e"; c.fillRect(-40, gy - 10, W + 80, H); c.shadowColor = "transparent"; c.fillStyle = "#8a6240"; c.fillRect(-40, gy + 40, W + 80, H);
  // desk on the left with a lamp and paper piles
  const dx = V ? W * 0.02 : W * 0.02, dw = V ? 420 : 380; c.shadowColor = "rgba(0,0,10,0.45)"; c.shadowOffsetX = 6; c.shadowOffsetY = 8; c.fillStyle = "#b8864f"; c.fillRect(dx, gy - 150, dw, 28); c.fillStyle = "#9a6d3b"; c.fillRect(dx + 20, gy - 122, dw - 40, 130); c.shadowColor = "transparent";
  for (let i = 0; i < 5; i++) { c.fillStyle = i % 2 ? "#f6f2e4" : "#efe9d6"; c.save(); c.translate(dx + 80 + i * 55, gy - 158 - i * 4); c.rotate((i - 2) * 0.05); c.fillRect(-34, -14, 68, 14); c.restore(); }
  c.strokeStyle = "#2a2a2a"; c.lineWidth = 8; c.beginPath(); c.moveTo(dx + dw - 70, gy - 150); c.lineTo(dx + dw - 70, gy - 230); c.lineTo(dx + dw - 20, gy - 270); c.stroke(); c.fillStyle = "#F5C400"; c.beginPath(); c.moveTo(dx + dw - 50, gy - 290); c.lineTo(dx + dw + 20, gy - 250); c.lineTo(dx + dw - 6, gy - 220); c.lineTo(dx + dw - 76, gy - 262); c.closePath(); c.fill();
  const lg = c.createRadialGradient(dx + dw - 10, gy - 220, 10, dx + dw - 10, gy - 160, 280); lg.addColorStop(0, "rgba(255,232,150,0.5)"); lg.addColorStop(1, "rgba(255,232,150,0)"); c.fillStyle = lg; c.fillRect(dx - 100, gy - 460, dw + 500, 620);
}

export const BG = { site: siteBg, office: officeBg, kitchen: kitchenBg, night: nightBg };
