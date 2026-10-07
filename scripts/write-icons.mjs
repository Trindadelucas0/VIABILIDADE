import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

function crc32(buffer) {
  let crc = ~0;
  for (let i = 0; i < buffer.length; i += 1) {
    crc ^= buffer[i];
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return ~crc >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, checksum]);
}

function distance(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = dx * dx + dy * dy;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / length));
  const x = x1 + t * dx;
  const y = y1 + t * dy;
  return Math.hypot(px - x, py - y);
}

function png(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const thickness = size * 0.075;
  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x += 1) {
      const margin = size * 0.12;
      const inside = x >= margin && x < size - margin && y >= margin && y < size - margin;
      const nx = x / size;
      const ny = y / size;
      const onMark =
        distance(nx, ny, 0.28, 0.32, 0.5, 0.72) < thickness / size ||
        distance(nx, ny, 0.5, 0.72, 0.72, 0.32) < thickness / size;
      const index = row + 1 + x * 4;
      if (inside && onMark) {
        raw[index] = 255;
        raw[index + 1] = 255;
        raw[index + 2] = 255;
      } else if (inside) {
        raw[index] = 11;
        raw[index + 1] = 58;
        raw[index + 2] = 130;
      } else {
        raw[index] = 243;
        raw[index + 1] = 245;
        raw[index + 2] = 248;
      }
      raw[index + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const dir = path.resolve("public/icons");
mkdirSync(dir, { recursive: true });
writeFileSync(path.join(dir, "icon-192.png"), png(192));
writeFileSync(path.join(dir, "icon-512.png"), png(512));
writeFileSync(path.resolve("src/app/icon.png"), png(192));
