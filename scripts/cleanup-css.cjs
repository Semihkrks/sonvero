const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, '..', 'src', 'styles', 'main.css');
const content = fs.readFileSync(cssPath, 'utf8');

// Find the responsive section marker
const responsiveMarker = '/* \u2500\u2500 Responsive \u2500\u2500 */';
const idx = content.indexOf(responsiveMarker);

if (idx === -1) {
  console.log('Responsive marker not found, trying alt...');
  process.exit(1);
}

// Keep everything before the responsive section
let keep = content.substring(0, idx).trimEnd();

// Find Cari styles (they are between the two @media blocks - non-mobile styles)
const cariMarker = '/* CARI PAGE STYLES */';
const cariIdx = content.indexOf(cariMarker);
const bottomNavMarker = '.mobile-bottom-nav {';
const bottomNavIdx = content.indexOf(bottomNavMarker);

if (cariIdx > 0 && bottomNavIdx > cariIdx) {
  const cariStyles = content.substring(cariIdx, bottomNavIdx).trimEnd();
  keep = keep + '\n\n' + cariStyles + '\n';
  console.log('Cari styles preserved');
} else {
  keep = keep + '\n';
  console.log('No Cari styles found or they are elsewhere');
}

fs.writeFileSync(cssPath, keep, 'utf8');
console.log('Done! File size:', fs.statSync(cssPath).size, 'bytes');
