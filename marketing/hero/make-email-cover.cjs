// Builds the cover that tops every Constra email → public/site/email-cover.jpg
// (1040 x 300, shown at 520 wide so it stays sharp on phones). From the repo root:
//   node marketing/hero/make-email-cover.cjs
const sharp = require("sharp");
const path = require("path");
const ROOT = path.resolve(__dirname, "../..");

(async () => {
  const W = 1040, H = 300;
  // the golden-hour render, cropped to the tower and the sky above it
  const sky = await sharp(`${ROOT}/public/hero/dusk-poster-w.webp`)
    .resize(W, Math.round(W * 9 / 16), { fit: "cover" })
    .extract({ left: 0, top: 150, width: W, height: H })
    .toBuffer();

  const mark = await sharp(`${ROOT}/public/site/email-logo.png`).resize(70, 70).toBuffer();

  const overlay = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <linearGradient id="g" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stop-color="#0b0a14" stop-opacity=".92"/>
        <stop offset=".55" stop-color="#0b0a14" stop-opacity=".55"/>
        <stop offset="1" stop-color="#0b0a14" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="v" x1="0" x2="0" y1="0" y2="1">
        <stop offset=".6" stop-color="#0b0a14" stop-opacity="0"/>
        <stop offset="1" stop-color="#0b0a14" stop-opacity=".55"/>
      </linearGradient>
      <pattern id="tape" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
        <rect width="20" height="40" fill="#F5C400"/><rect x="20" width="20" height="40" fill="#151617"/>
      </pattern>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#g)"/>
    <rect width="${W}" height="${H}" fill="url(#v)"/>
    <text x="56" y="168" font-family="Arial Black, Impact, Arial, sans-serif" font-weight="900" font-size="74" letter-spacing="3" fill="#ffffff">CONSTRA</text>
    <text x="58" y="208" font-family="Arial, Helvetica, sans-serif" font-size="25" letter-spacing="1.5" fill="#F5E9B8">Field management for construction crews</text>
    <rect x="58" y="226" width="84" height="6" fill="#F5C400"/>
    <rect y="${H - 16}" width="${W}" height="16" fill="url(#tape)"/>
  </svg>`;

  await sharp(sky)
    .composite([{ input: Buffer.from(overlay), left: 0, top: 0 }, { input: mark, left: 56, top: 30 }])
    .flatten({ background: "#151617" })
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(`${ROOT}/public/site/email-cover.jpg`);
  console.log("wrote public/site/email-cover.jpg");
})();
