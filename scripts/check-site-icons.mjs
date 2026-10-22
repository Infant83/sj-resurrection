import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, relative, sep } from 'node:path';
import { inflateSync } from 'node:zlib';
import { parseHTML } from 'linkedom';

// Run after `npm run build`. Check the deployed files, not only source tags.
const root = fileURLToPath(new URL('../', import.meta.url));
const dist = resolve(root, 'dist');
const base = new URL('https://infant83.github.io/sj-resurrection/');
const prefix = 'icons/sunjin-healing-20261022';
const asset = (path) => new URL(path, base).pathname;
const manifestUrl = new URL('site.webmanifest', base);
const manifest = JSON.parse(readFileSync(resolve(dist, 'site.webmanifest'), 'utf8'));
assert.equal(manifest.name, 'Sunjin UpRising');
assert.equal(manifest.short_name, 'Sunjin UpRising');
assert.equal(manifest.theme_color, '#143f35');
assert.equal(manifest.display, 'browser');
for (const member of ['id', 'start_url', 'scope']) {
  assert.equal(new URL(manifest[member], manifestUrl).href, base.href, member);
}
assert.equal(manifest.icons.length, 2);
for (const size of [192, 512]) {
  const icon = manifest.icons.find((entry) => entry.sizes === `${size}x${size}`);
  assert(icon, `Manifest icon ${size} is missing`);
  assert.equal(icon.type, 'image/png');
  assert(icon.purpose.split(' ').includes('any'));
  assert.equal(new URL(icon.src, manifestUrl).pathname, asset(`${prefix}-${size}.png`));
}

function paeth(a, b, c) {
  const p = a + b - c;
  const da = Math.abs(p - a), db = Math.abs(p - b), dc = Math.abs(p - c);
  return da <= db && da <= dc ? a : db <= dc ? b : c;
}

function checkPng(path, size) {
  const bytes = readFileSync(path);
  assert(bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), 'PNG signature');
  assert.equal(bytes.toString('ascii', 12, 16), 'IHDR');
  assert.equal(bytes.readUInt32BE(16), size, 'PNG width');
  assert.equal(bytes.readUInt32BE(20), size, 'PNG height');
  assert.equal(bytes[24], 8, 'PNG bit depth');
  assert([2, 6].includes(bytes[25]), 'Icon must use RGB or RGBA');
  assert.equal(bytes[28], 0, 'PNG must not be interlaced');
  const chunks = [];
  for (let offset = 8; offset < bytes.length;) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    if (type === 'IDAT') chunks.push(bytes.subarray(offset + 8, offset + 8 + length));
    assert.notEqual(type, 'tRNS', 'RGB icon must not declare transparent pixels');
    offset += length + 12;
  }
  const channels = bytes[25] === 6 ? 4 : 3;
  const stride = size * channels;
  const data = inflateSync(Buffer.concat(chunks));
  assert.equal(data.length, size * (stride + 1));
  const pixels = Buffer.alloc(size * stride);
  for (let y = 0; y < size; y++) {
    const filter = data[y * (stride + 1)];
    assert(filter <= 4, 'PNG scanline filter');
    for (let x = 0; x < stride; x++) {
      const index = y * stride + x;
      const a = x >= channels ? pixels[index - channels] : 0;
      const b = y > 0 ? pixels[index - stride] : 0;
      const c = y > 0 && x >= channels ? pixels[index - stride - channels] : 0;
      const predictor = [0, a, b, Math.floor((a + b) / 2), paeth(a, b, c)][filter];
      pixels[index] = (data[y * (stride + 1) + 1 + x] + predictor) & 255;
    }
  }
  if (channels === 4) {
    for (let i = 3; i < pixels.length; i += 4) assert.equal(pixels[i], 255, 'Every icon pixel must be opaque');
  }
}

for (const size of [32, 180, 192, 512]) checkPng(resolve(dist, `${prefix}-${size}.png`), size);
const svg = readFileSync(resolve(dist, `${prefix}.svg`), 'utf8');
assert.match(svg, /viewBox="0 0 512 512"/);
assert.doesNotMatch(svg, /<script|<foreignObject|\son\w+=|(?:href|src)="https?:/i);

const pages = readdirSync(dist, { recursive: true }).filter((path) => path.endsWith('.html'));
assert(pages.length > 0, 'Build the site before checking icons');
for (const page of pages) {
  const { document } = parseHTML(readFileSync(resolve(dist, page), 'utf8'));
  const head = document.head;
  assert.equal(head.querySelector('meta[name="theme-color"]')?.getAttribute('content'), '#143f35', page);
  assert.equal(head.querySelector('meta[name="apple-mobile-web-app-title"]')?.getAttribute('content'), 'Sunjin UpRising', page);
  const touch = head.querySelector('link[rel="apple-touch-icon"]');
  assert.equal(touch?.getAttribute('sizes'), '180x180', page);
  assert.equal(touch?.getAttribute('href'), asset(`${prefix}-180.png`), page);
  assert.equal(head.querySelector('link[rel="manifest"]')?.getAttribute('href'), manifestUrl.pathname, page);
  for (const [type, size, suffix] of [['image/svg+xml', 'any', '.svg'], ['image/png', '32x32', '-32.png']]) {
    const link = [...head.querySelectorAll('link[rel="icon"]')].find((entry) => entry.getAttribute('type') === type);
    assert.equal(link?.getAttribute('sizes'), size, page);
    assert.equal(link?.getAttribute('href'), asset(prefix + suffix), page);
  }
  for (const link of head.querySelectorAll('link[rel="icon"],link[rel="apple-touch-icon"],link[rel="manifest"]')) {
    const href = link.getAttribute('href');
    const pageUrl = new URL(relative(dist, resolve(dist, page)).split(sep).join('/'), base);
    const url = new URL(href, pageUrl);
    assert.equal(url.origin, base.origin, page);
    assert(url.pathname.startsWith(base.pathname), page);
    assert(readFileSync(resolve(dist, url.pathname.slice(base.pathname.length))).length > 0, page);
  }
}
console.log(`Site icon checks passed: ${pages.length} pages, 4 opaque PNG sizes, SVG and scoped manifest.`);
