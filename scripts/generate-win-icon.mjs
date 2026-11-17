import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const BUILD_DIR = path.resolve(process.cwd(), 'build');

function makeCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
}

const CRC_TABLE = makeCrcTable();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePNG(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0; // filter none
    rgba.copy(raw, rowStart + 1, y * stride, (y + 1) * stride);
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * Generates an uncompressed 32-bit BGRA DIB entry for maximum NSIS / Windows Explorer compatibility.
 */
function encodeBmpDIB(width, height, rgba) {
  const headerSize = 40;
  const xorSize = width * height * 4;
  const andRowBytes = Math.ceil(width / 32) * 4;
  const andSize = andRowBytes * height;

  const buf = Buffer.alloc(headerSize + xorSize + andSize);
  buf.writeUInt32LE(headerSize, 0); // biSize
  buf.writeInt32LE(width, 4); // biWidth
  buf.writeInt32LE(height * 2, 8); // biHeight (XOR + AND)
  buf.writeUInt16LE(1, 12); // biPlanes
  buf.writeUInt16LE(32, 14); // biBitCount
  buf.writeUInt32LE(0, 16); // BI_RGB
  buf.writeUInt32LE(xorSize + andSize, 20);

  // Bottom-up BGRA scanlines
  let offset = headerSize;
  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      buf[offset++] = rgba[idx + 2]; // B
      buf[offset++] = rgba[idx + 1]; // G
      buf[offset++] = rgba[idx];     // R
      buf[offset++] = rgba[idx + 3]; // A
    }
  }

  // AND mask (0 = use alpha channel)
  for (let y = height - 1; y >= 0; y--) {
    for (let byteIdx = 0; byteIdx < andRowBytes; byteIdx++) {
      let maskByte = 0;
      for (let bit = 0; bit < 8; bit++) {
        const x = byteIdx * 8 + bit;
        if (x < width) {
          const alpha = rgba[(y * width + x) * 4 + 3];
          if (alpha < 12) {
            maskByte |= 1 << (7 - bit);
          }
        }
      }
      buf[offset++] = maskByte;
    }
  }

  return buf;
}

function clampByte(n) {
  return n < 0 ? 0 : n > 255 ? 255 : Math.round(n);
}

function mixPixel(rgba, idx, r, g, b, a) {
  const alpha = a / 255;
  const inv = 1 - alpha;
  rgba[idx] = clampByte(r * alpha + rgba[idx] * inv);
  rgba[idx + 1] = clampByte(g * alpha + rgba[idx + 1] * inv);
  rgba[idx + 2] = clampByte(b * alpha + rgba[idx + 2] * inv);
  rgba[idx + 3] = clampByte(Math.max(rgba[idx + 3], a));
}

function renderRoyalCrestRGBA(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;
  const radius = size * 0.44;
  const corner = size * 0.14;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = Math.abs(x - cx);
      const dy = Math.abs(y - cy);

      // Rounded-square SDF for obsidian casino plaque
      const qx = Math.max(dx - (radius - corner), 0);
      const qy = Math.max(dy - (radius - corner), 0);
      const boxDist = Math.hypot(qx, qy) + Math.min(Math.max(dx - (radius - corner), dy - (radius - corner)), 0) - corner;

      if (boxDist <= 1.2) {
        const aa = Math.max(0, Math.min(1, 1.0 - boxDist));
        // Subtle radial velvet emerald-to-obsidian glow
        const distNorm = Math.min(1, Math.hypot(x - cx, y - cy) / (size * 0.52));
        const bgR = 8 + (1 - distNorm) * 10;
        const bgG = 12 + (1 - distNorm) * 28;
        const bgB = 16 + (1 - distNorm) * 20;

        rgba[idx] = clampByte(bgR);
        rgba[idx + 1] = clampByte(bgG);
        rgba[idx + 2] = clampByte(bgB);
        rgba[idx + 3] = clampByte(255 * aa);

        // Outer champagne gold chamfered frame
        const rimDist = Math.abs(boxDist + size * 0.032);
        if (rimDist < size * 0.015) {
          const rimAlpha = Math.max(0, 1 - rimDist / (size * 0.015));
          mixPixel(rgba, idx, 212, 175, 55, Math.round(240 * rimAlpha * aa));
        }
      }

      // Outer diamond crest (L1 / Manhattan distance)
      const manhattan = (dx + dy) / size;
      const outerDiamond = Math.abs(manhattan - 0.305);
      if (outerDiamond < 0.016) {
        const alpha = Math.max(0, 1 - outerDiamond / 0.016);
        const sheen = 1 - Math.abs(x - y) / size;
        const r = 212 + sheen * 34;
        const g = 175 + sheen * 54;
        const b = 55 + sheen * 116;
        mixPixel(rgba, idx, r, g, b, Math.round(255 * alpha));
      }

      // Inner filigree diamond
      const innerDiamond = Math.abs(manhattan - 0.215);
      if (innerDiamond < 0.0085) {
        const alpha = Math.max(0, 1 - innerDiamond / 0.0085);
        mixPixel(rgba, idx, 243, 229, 171, Math.round(205 * alpha));
      }

      // Central jewel diamond
      if (manhattan < 0.095) {
        const edge = Math.min(1, (0.095 - manhattan) / 0.014);
        const facet = x <= cx && y <= cy ? 1 : 0.72;
        mixPixel(
          rgba,
          idx,
          clampByte(243 * facet + 20),
          clampByte(229 * facet + 12),
          clampByte(171 * facet),
          Math.round(255 * edge),
        );
      }

      // Four cardinal crown pips
      const pipDist = Math.min(
        Math.hypot(x - cx, y - (cy - size * 0.365)),
        Math.hypot(x - cx, y - (cy + size * 0.365)),
        Math.hypot(x - (cx - size * 0.365), y - cy),
        Math.hypot(x - (cx + size * 0.365), y - cy),
      );
      if (pipDist < size * 0.022) {
        const edge = Math.min(1, (size * 0.022 - pipDist) / (size * 0.008));
        mixPixel(rgba, idx, 243, 229, 171, Math.round(240 * edge));
      }
    }
  }

  return rgba;
}

function buildMultiEntryICO(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Icon type
  header.writeUInt16LE(entries.length, 4);

  const dirBuffers = [];
  let dataOffset = 6 + entries.length * 16;

  for (const entry of entries) {
    const dir = Buffer.alloc(16);
    dir[0] = entry.size >= 256 ? 0 : entry.size;
    dir[1] = entry.size >= 256 ? 0 : entry.size;
    dir[2] = 0;
    dir[3] = 0;
    dir.writeUInt16LE(1, 4); // Planes
    dir.writeUInt16LE(32, 6); // BPP
    dir.writeUInt32LE(entry.data.length, 8);
    dir.writeUInt32LE(dataOffset, 12);
    dirBuffers.push(dir);
    dataOffset += entry.data.length;
  }

  return Buffer.concat([header, ...dirBuffers, ...entries.map((e) => e.data)]);
}

function main() {
  fs.mkdirSync(BUILD_DIR, { recursive: true });

  const rgba256 = renderRoyalCrestRGBA(256);
  const rgba48 = renderRoyalCrestRGBA(48);

  const png256 = encodePNG(256, 256, rgba256);
  const dib48 = encodeBmpDIB(48, 48, rgba48);

  const icoBuffer = buildMultiEntryICO([
    { size: 48, data: dib48 },
    { size: 256, data: png256 },
  ]);

  const pngOut = path.join(BUILD_DIR, 'icon.png');
  const icoOut = path.join(BUILD_DIR, 'icon.ico');

  fs.writeFileSync(pngOut, png256);
  fs.writeFileSync(icoOut, icoBuffer);

  console.log(`Generated ${path.relative(process.cwd(), pngOut)} (${png256.length} bytes)`);
  console.log(`Generated ${path.relative(process.cwd(), icoOut)} (${icoBuffer.length} bytes, 48px DIB + 256px PNG)`);
}

main();
