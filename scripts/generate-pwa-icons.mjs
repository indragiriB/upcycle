// Membuat ikon PWA PNG dari bentuk logo UPCYCLE tanpa dependensi tambahan.
// Jalankan: node scripts/generate-pwa-icons.mjs
//
// Logo digambar secara vektor (cincin hijau, panah, dan segitiga gelap) lalu
// dirasterisasi dengan supersampling agar tepinya halus di semua ukuran.
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outputDir = join(root, 'public');

const GREEN = [34, 197, 94];
const DARK = [17, 17, 17];
const WHITE = [255, 255, 255];

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let index = 0; index < buffer.length; index += 1) {
    crc = CRC_TABLE[(crc ^ buffer[index]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, checksum]);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    signature,
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function pointInTriangle(px, py, [ax, ay], [bx, by], [cx, cy]) {
  const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by);
  const d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy);
  const d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay);
  const hasNegative = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPositive = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNegative && hasPositive);
}

// Logo asli berada pada viewBox 56 x 64. Koordinat di bawah memakai sistem
// yang sama lalu diskalakan ke ukuran ikon.
const VIEW_WIDTH = 56;
const VIEW_HEIGHT = 64;
const CENTER = { x: 28, y: 32 };
const RING_RADIUS = 20;
const RING_WIDTH = 6;
const ARC_START = -45;
const ARC_END = 225;

const ARROW = [
  [19.52, 12.2],
  [17.4, 22.81],
  [8.91, 14.33],
];

const TRIANGLE = [
  [28, 21],
  [37.5, 40],
  [18.5, 40],
];

const DEG = Math.PI / 180;

function sampleColor(x, y) {
  // Koordinat input dalam piksel ikon; ubah ke ruang viewBox.
  if (pointInTriangle(x, y, ...TRIANGLE)) {
    return [...DARK, 255];
  }

  if (pointInTriangle(x, y, ...ARROW)) {
    return [...GREEN, 255];
  }

  const dx = x - CENTER.x;
  const dy = y - CENTER.y;
  const distance = Math.hypot(dx, dy);
  if (
    distance >= RING_RADIUS - RING_WIDTH / 2 &&
    distance <= RING_RADIUS + RING_WIDTH / 2
  ) {
    let angle = (Math.atan2(dy, dx) / DEG + 360) % 360;
    if (angle >= 315) angle -= 360; // -45..0
    if (angle >= ARC_START && angle <= ARC_END) {
      return [...GREEN, 255];
    }
  }

  return null;
}

function render(size, { background = WHITE, scale = 0.78 } = {}) {
  const rgba = Buffer.alloc(size * size * 4);
  const samples = 4;
  const logoWidth = size * scale;
  const logoHeight = (logoWidth * VIEW_HEIGHT) / VIEW_WIDTH;
  const offsetX = (size - logoWidth) / 2;
  const offsetY = (size - logoHeight) / 2;

  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      let r = background[0];
      let g = background[1];
      let b = background[2];
      let hits = 0;
      let tint = null;

      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const x =
            ((px + (sx + 0.5) / samples - offsetX) / logoWidth) * VIEW_WIDTH;
          const y =
            ((py + (sy + 0.5) / samples - offsetY) / logoHeight) * VIEW_HEIGHT;
          const color = sampleColor(x, y);
          if (color) {
            hits += 1;
            tint = color;
          }
        }
      }

      if (tint && hits > 0) {
        const alpha = hits / (samples * samples);
        r = tint[0] * alpha + r * (1 - alpha);
        g = tint[1] * alpha + g * (1 - alpha);
        b = tint[2] * alpha + b * (1 - alpha);
      }

      const index = (py * size + px) * 4;
      rgba[index] = Math.round(r);
      rgba[index + 1] = Math.round(g);
      rgba[index + 2] = Math.round(b);
      rgba[index + 3] = 255;
    }
  }

  return encodePng(size, size, rgba);
}

mkdirSync(outputDir, { recursive: true });

const targets = [
  { file: 'icon-192.png', size: 192, options: {} },
  { file: 'icon-512.png', size: 512, options: {} },
  { file: 'icon-maskable-512.png', size: 512, options: { scale: 0.62 } },
  { file: 'apple-touch-icon.png', size: 180, options: {} },
];

for (const target of targets) {
  const png = render(target.size, target.options);
  writeFileSync(join(outputDir, target.file), png);
  console.log(`✓ public/${target.file} (${target.size}×${target.size})`);
}
