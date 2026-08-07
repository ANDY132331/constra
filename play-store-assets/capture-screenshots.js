// Capture all Play Store screenshots as PNG files
// Run with: node capture-screenshots.js
// Requires: npx playwright install chromium (first time only)

const { chromium } = require('playwright');
const path = require('path');

const ASSETS_DIR = __dirname;

const PHONE_FILES = [
  'phone1-dashboard',
  'phone2-clockin',
  'phone3-messages',
  'phone4-invoices',
  'phone5-projects',
  'phone6-clockedin',
  'phone7-reports',
  'phone8-crew',
];

const TABLET_FILES = [
  { name: 'tablet7-landscape',  width: 960,  height: 600 },
  { name: 'tablet7-projects',   width: 960,  height: 600 },
  { name: 'tablet10-landscape', width: 1280, height: 800 },
  { name: 'tablet10-reports',   width: 1280, height: 800 },
];

const FEATURE = { name: 'constra-feature-graphic', width: 1024, height: 500, dpr: 2 };

async function capture() {
  console.log('Launching Chromium…');
  const browser = await chromium.launch();

  // ── Phone screenshots (390×844 @ DPR 3 → 1170×2532) ──────────────────────
  console.log('\n📱 Capturing phone screenshots…');
  for (const name of PHONE_FILES) {
    const htmlPath = path.join(ASSETS_DIR, `${name}.html`);
    const outPath  = path.join(ASSETS_DIR, `${name}.png`);

    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
    });
    const page = await context.newPage();
    await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`);
    await page.waitForTimeout(400); // let CSS settle
    await page.screenshot({ path: outPath, fullPage: false });
    await context.close();
    console.log(`  ✓ ${name}.png  (1170×2532)`);
  }

  // ── Tablet screenshots (@DPR 2) ───────────────────────────────────────────
  console.log('\n📟 Capturing tablet screenshots…');
  for (const { name, width, height } of TABLET_FILES) {
    const htmlPath = path.join(ASSETS_DIR, `${name}.html`);
    const outPath  = path.join(ASSETS_DIR, `${name}.png`);

    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`);
    await page.waitForTimeout(400);
    await page.screenshot({ path: outPath, fullPage: false });
    await context.close();
    console.log(`  ✓ ${name}.png  (${width * 2}×${height * 2})`);
  }

  // ── Feature graphic (1024×500 @ DPR 2 → 2048×1000) ──────────────────────
  if (require('fs').existsSync(path.join(ASSETS_DIR, `${FEATURE.name}.html`))) {
    console.log('\n🖼  Capturing feature graphic…');
    const htmlPath = path.join(ASSETS_DIR, `${FEATURE.name}.html`);
    const outPath  = path.join(ASSETS_DIR, `${FEATURE.name}.png`);
    const context = await browser.newContext({
      viewport: { width: FEATURE.width, height: FEATURE.height },
      deviceScaleFactor: FEATURE.dpr,
    });
    const page = await context.newPage();
    await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`);
    await page.waitForTimeout(400);
    await page.screenshot({ path: outPath, fullPage: false });
    await context.close();
    console.log(`  ✓ ${FEATURE.name}.png  (2048×1000)`);
  }

  await browser.close();
  console.log('\n✅ All screenshots saved to play-store-assets/');
}

capture().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
