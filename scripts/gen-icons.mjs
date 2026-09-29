// Generates the PWA icons (a small sunflower) as PNGs without any image dependency.
// Usage: node scripts/gen-icons.mjs
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};
const png = (size, rgba) => {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const BG = hex('#fbe4ea');
const PETAL = hex('#f6c65b');
const PETAL_EDGE = hex('#e9a83a');
const CORE = hex('#7a4a35');

/** `scale` shrinks the artwork (maskable icons keep it inside the 80% safe zone). */
function render(size, { scale = 1, round = false } = {}) {
  const out = Buffer.alloc(size * size * 4);
  const SS = 3;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const acc = [0, 0, 0, 0];
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = ((x + (sx + 0.5) / SS) / size - 0.5) / scale;
          const v = ((y + (sy + 0.5) / SS) / size - 0.5) / scale;
          const r = Math.hypot(u, v);
          let px = [...BG, 255];
          if (round && Math.hypot((x + 0.5) / size - 0.5, (y + 0.5) / size - 0.5) > 0.5) px = [0, 0, 0, 0];
          else {
            const ang = Math.atan2(v, u);
            const petals = 0.3 + 0.075 * Math.cos(ang * 12);
            if (r < 0.17) px = [...CORE, 255];
            else if (r < petals) px = [...(r > petals - 0.02 ? PETAL_EDGE : PETAL), 255];
          }
          for (let i = 0; i < 4; i++) acc[i] += px[i];
        }
      }
      const o = (y * size + x) * 4;
      for (let i = 0; i < 4; i++) out[o + i] = Math.round(acc[i] / (SS * SS));
    }
  }
  return png(size, out);
}

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon-192.png', render(192, { scale: 0.95 }));
writeFileSync('public/icons/icon-512.png', render(512, { scale: 0.95 }));
writeFileSync('public/icons/maskable-512.png', render(512, { scale: 0.7 }));
writeFileSync('public/icons/apple-touch-icon.png', render(180, { scale: 0.8 }));
console.log('icons written to public/icons');
