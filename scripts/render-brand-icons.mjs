// Renders public/logo.svg into the PNG icons used by the favicon, iOS and the PWA manifest.
// Usage: node scripts/render-brand-icons.mjs [--preview out.png]
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const root = path.resolve(import.meta.dirname, '..');
const pub = path.join(root, 'public');
const svg = fs.readFileSync(path.join(pub, 'logo.svg'), 'utf8');
// Maskable/iOS icons are cropped by the OS, so they use a full-bleed square with the mark inside the safe zone.
const fullBleed = svg.replace(/rx="15"/g, 'rx="0"').replace('<path ', '<g transform="translate(32 32) scale(.78) translate(-32 -32)"><path ').replace('</svg>', '').replace(/(<circle[^>]*\/>)/, '$1</g>') + '</svg>';

const targets = [
  ['icon-192.png', 192, svg],
  ['icon-512.png', 512, svg],
  ['icon-maskable-192.png', 192, fullBleed],
  ['icon-maskable-512.png', 512, fullBleed],
  ['apple-touch-icon.png', 180, fullBleed],
  ['favicon-32.png', 32, svg],
];

const browser = await chromium.launch();
const page = await browser.newPage();
const preview = process.argv.indexOf('--preview');
if (preview > -1) {
  const sizes = [16, 32, 48, 96, 192];
  const tile = (s, src, bg) => `<div style="background:${bg};padding:12px;display:inline-flex;gap:14px;align-items:end">${sizes.map(n => `<img width="${n}" height="${n}" src="data:image/svg+xml;base64,${Buffer.from(src).toString('base64')}">`).join('')}</div>`;
  await page.setContent(`<body style="margin:0">${tile(0, svg, '#fff')}<br>${tile(0, svg, '#0f1115')}<br>${tile(0, fullBleed, '#888')}</body>`);
  await page.locator('body').screenshot({ path: process.argv[preview + 1], omitBackground: false });
} else {
  for (const [name, size, src] of targets) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<html><body style="margin:0;background:transparent"><img style="display:block;width:${size}px;height:${size}px" src="data:image/svg+xml;base64,${Buffer.from(src).toString('base64')}"></body></html>`);
    await page.screenshot({ path: path.join(pub, name), omitBackground: true });
    console.log('wrote', name);
  }
}
await browser.close();
