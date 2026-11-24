import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extraProducts } from '../data/extra-products.js';

const outputDir = fileURLToPath(new URL('../../../client/public/products/', import.meta.url));
fs.mkdirSync(outputDir, { recursive: true });

const palettes = {
  Electronics: ['#1f3a5f', '#4a90e2'],
  Fashion: ['#5b3f36', '#c98f76'],
  'Home & Living': ['#3f5b4a', '#9dc4a6'],
  Beauty: ['#6b4160', '#d6a6c8'],
  Sports: ['#2f4f5f', '#6fa8bf'],
  Books: ['#4b3d2a', '#b99a6b'],
};

const escapeXml = (value) => String(value).replace(/[<>&"']/g, (char) => ({
  '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;',
}[char]));

function wrapTitle(title) {
  const words = title.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > 24 && current) { lines.push(current); current = word; }
    else current = next;
  }
  if (current) lines.push(current);
  return lines.slice(0, 2);
}

function icon(category) {
  switch (category) {
    case 'Electronics':
      return '<circle cx="400" cy="360" r="96" fill="rgba(255,255,255,.55)"/><circle cx="400" cy="360" r="54" fill="rgba(255,255,255,.9)"/><rect x="330" y="470" width="140" height="12" rx="6" fill="rgba(255,255,255,.45)"/>';
    case 'Fashion':
      return '<path d="M330 420 L400 300 L470 420" fill="none" stroke="rgba(255,255,255,.8)" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/><rect x="300" y="420" width="200" height="120" rx="28" fill="rgba(255,255,255,.35)"/>';
    case 'Home & Living':
      return '<path d="M300 430 L400 320 L500 430" fill="none" stroke="rgba(255,255,255,.8)" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/><rect x="325" y="425" width="150" height="120" rx="18" fill="rgba(255,255,255,.35)"/>';
    case 'Beauty':
      return '<path d="M400 285 C355 350 330 390 330 430 C330 480 360 510 400 510 C440 510 470 480 470 430 C470 390 445 350 400 285 Z" fill="rgba(255,255,255,.55)"/>';
    case 'Sports':
      return '<circle cx="360" cy="400" r="82" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="20"/><circle cx="440" cy="400" r="82" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="20"/>';
    default:
      return '<rect x="315" y="310" width="170" height="215" rx="14" fill="rgba(255,255,255,.5)"/><rect x="295" y="335" width="170" height="215" rx="14" fill="rgba(255,255,255,.28)"/>';
  }
}

function svgFor(product, index) {
  const [dark, light] = palettes[product.category];
  const lines = wrapTitle(product.title).map((line, i) =>
    `<text x="56" y="${648 + i * 48}" font-family="Arial, sans-serif" font-size="40" font-weight="600" fill="#ffffff">${escapeXml(line)}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" role="img" aria-label="${escapeXml(product.title)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${dark}"/>
      <stop offset="1" stop-color="${light}"/>
    </linearGradient>
  </defs>
  <rect width="800" height="800" fill="url(#bg)"/>
  <circle cx="400" cy="360" r="230" fill="rgba(255,255,255,.10)"/>
  ${icon(product.category)}
  <text x="56" y="80" font-family="Arial, sans-serif" font-size="22" letter-spacing="4" fill="rgba(255,255,255,.85)">MARKETLY / ${escapeXml(product.category.toUpperCase())}</text>
  ${lines}
  <text x="56" y="760" font-family="Arial, sans-serif" font-size="18" fill="rgba(255,255,255,.75)">${escapeXml(product.sku)}</text>
  <text x="744" y="760" text-anchor="end" font-family="Arial, sans-serif" font-size="18" fill="rgba(255,255,255,.75)">${String(index + 1).padStart(2, '0')}</text>
</svg>
`;
}

extraProducts.forEach((product, index) => {
  fs.writeFileSync(path.join(outputDir, `${product.slug}.svg`), svgFor(product, index), 'utf8');
});

console.log(`Generated ${extraProducts.length} local product placeholders in ${outputDir}`);
