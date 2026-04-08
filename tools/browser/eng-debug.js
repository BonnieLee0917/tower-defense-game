#!/usr/bin/env node
/**
 * Engineering Debug Script — Haaland
 * 
 * Checks: console errors, 404 resources, JS exceptions, asset load status, FPS baseline
 * 
 * Usage: node tools/browser/eng-debug.js [url]
 * Default URL: https://towerstorm.xiaomengli.online
 */

const puppeteer = require('/usr/lib/node_modules/puppeteer');
const fs = require('fs');
const path = require('path');

const URL = process.argv[2] || 'https://towerstorm.xiaomengli.online';
const SCREENSHOT_DIR = path.join(__dirname, '../../screenshots');
const WAIT_MS = 8000; // wait for Phaser to boot + preload

(async () => {
  if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  // Collectors
  const consoleErrors = [];
  const networkErrors = [];
  const jsExceptions = [];
  const loadedAssets = { ok: 0, fail: 0, details: [] };

  // Console listener
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // JS exception listener
  page.on('pageerror', (err) => {
    jsExceptions.push(err.message || String(err));
  });

  // Network listener — track asset loads
  page.on('requestfinished', (req) => {
    const url = req.url();
    const resp = req.response();
    const status = resp ? resp.status() : 0;
    if (url.match(/\.(png|jpg|json|js|css|mp3|ogg|wav)(\?|$)/i)) {
      if (status >= 400) {
        loadedAssets.fail++;
        loadedAssets.details.push({ url, status, result: 'FAIL' });
        networkErrors.push(`${status} ${url}`);
      } else {
        loadedAssets.ok++;
      }
    }
  });

  page.on('requestfailed', (req) => {
    const url = req.url();
    const reason = req.failure()?.errorText || 'unknown';
    if (url.match(/\.(png|jpg|json|js|css|mp3|ogg|wav)(\?|$)/i)) {
      loadedAssets.fail++;
      loadedAssets.details.push({ url, reason, result: 'FAIL' });
      networkErrors.push(`FAILED ${url} (${reason})`);
    }
  });

  console.log(`\n🔍 Engineering Debug — ${URL}\n`);
  console.log('Loading page...');

  try {
    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
  } catch (e) {
    console.error(`❌ Page load failed: ${e.message}`);
    await browser.close();
    process.exit(1);
  }

  // Wait for Phaser to initialize
  console.log(`Waiting ${WAIT_MS / 1000}s for game boot...\n`);
  await new Promise((r) => setTimeout(r, WAIT_MS));

  // Try to get FPS from Phaser
  let fps = null;
  try {
    fps = await page.evaluate(() => {
      // @ts-ignore
      const game = window.game || (window.Phaser && window.Phaser.GAMES && window.Phaser.GAMES[0]);
      if (game && game.loop) {
        return Math.round(game.loop.actualFps);
      }
      return null;
    });
  } catch (_) { /* ignore */ }

  // Screenshot
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const screenshotPath = path.join(SCREENSHOT_DIR, `eng-debug-${timestamp}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: false });

  // Report
  console.log('═══════════════════════════════════════');
  console.log('  ENGINEERING DEBUG REPORT');
  console.log('═══════════════════════════════════════\n');

  // Assets
  console.log(`📦 Assets: ${loadedAssets.ok} loaded OK, ${loadedAssets.fail} failed`);
  if (loadedAssets.fail > 0) {
    loadedAssets.details.filter(d => d.result === 'FAIL').forEach(d => {
      console.log(`   ❌ ${d.status || d.reason} — ${d.url}`);
    });
  }

  // Console errors
  console.log(`\n🖥️  Console errors: ${consoleErrors.length}`);
  consoleErrors.forEach(e => console.log(`   ❌ ${e}`));

  // JS exceptions
  console.log(`\n💥 JS exceptions: ${jsExceptions.length}`);
  jsExceptions.forEach(e => console.log(`   ❌ ${e}`));

  // Network errors
  console.log(`\n🌐 Network errors: ${networkErrors.length}`);
  networkErrors.forEach(e => console.log(`   ❌ ${e}`));

  // FPS
  if (fps !== null) {
    const fpsIcon = fps >= 55 ? '✅' : fps >= 30 ? '⚠️' : '❌';
    console.log(`\n🎮 FPS: ${fps} ${fpsIcon}`);
  } else {
    console.log('\n🎮 FPS: could not read (game object not exposed)');
  }

  // Screenshot
  console.log(`\n📸 Screenshot: ${screenshotPath}`);

  // Summary
  const issues = consoleErrors.length + jsExceptions.length + loadedAssets.fail;
  console.log('\n═══════════════════════════════════════');
  if (issues === 0) {
    console.log('  ✅ ALL CLEAR — no errors detected');
  } else {
    console.log(`  ⚠️  ${issues} issue(s) found`);
  }
  console.log('═══════════════════════════════════════\n');

  await browser.close();
  process.exit(issues > 0 ? 1 : 0);
})();
