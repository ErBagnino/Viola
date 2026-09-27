#!/usr/bin/env node
// Generates every icon / splash asset from the single SVG source in
// scripts/icon-svg.mjs. Run with: npm run icons
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { iconSvg, ICON_BG, ICON_RED } from "./icon-svg.mjs";

const root = path.resolve(import.meta.dirname, "..");
const pub = (...p) => path.join(root, "public", ...p);
const app = (...p) => path.join(root, "src", "app", ...p);

async function png(svg, size, file) {
  await sharp(Buffer.from(svg), { density: 300 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(file);
}

// Bold single heart used for the tiniest favicon (16px) where the flower
// would turn into a blob.
function tinyHeartSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="${ICON_BG}"/>
  <path d="M32 54 C 12 40, 6 30, 9 20 C 12 10, 26 9, 32 19 C 38 9, 52 10, 55 20 C 58 30, 52 40, 32 54 Z" fill="${ICON_RED}"/>
</svg>`;
}

// Minimal ICO encoder: PNG payloads are valid ICO entries on every modern OS.
function buildIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const entries = [];
  let offset = 6 + images.length * 16;
  for (const { size, data } of images) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt8(0, 2);
    e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    entries.push(e);
  }
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

// iPhone portrait splash screens (device px) + their media queries.
const SPLASH = [
  { w: 1320, h: 2868, dw: 440, dh: 956, r: 3 }, // 16 Pro Max
  { w: 1206, h: 2622, dw: 402, dh: 874, r: 3 }, // 16 Pro
  { w: 1290, h: 2796, dw: 430, dh: 932, r: 3 }, // 14/15 Pro Max, 15/16 Plus
  { w: 1179, h: 2556, dw: 393, dh: 852, r: 3 }, // 14/15 Pro, 15/16
  { w: 1284, h: 2778, dw: 428, dh: 926, r: 3 }, // 12/13 Pro Max, 14 Plus
  { w: 1170, h: 2532, dw: 390, dh: 844, r: 3 }, // 12/13/14
  { w: 1125, h: 2436, dw: 375, dh: 812, r: 3 }, // X/XS/11 Pro/mini
  { w: 1242, h: 2688, dw: 414, dh: 896, r: 3 }, // XS Max/11 Pro Max
  { w: 828, h: 1792, dw: 414, dh: 896, r: 2 }, // XR/11
  { w: 750, h: 1334, dw: 375, dh: 667, r: 2 }, // SE 2/3, 8
];

async function main() {
  await mkdir(pub("icons"), { recursive: true });
  await mkdir(pub("splash"), { recursive: true });

  const full = iconSvg({});
  // Vector master (used as SVG favicon in modern browsers)
  await writeFile(app("icon.svg"), iconSvg({ stars: true, radius: 180 }));
  await writeFile(pub("icons", "icon.svg"), full);

  // PWA icons (purpose "any"): full-bleed black square, symbol ~75%
  await png(full, 192, pub("icons", "icon-192.png"));
  await png(full, 512, pub("icons", "icon-512.png"));
  // Maskable: symbol inside the 80% safe circle
  const maskable = iconSvg({ scale: 0.72 });
  await png(maskable, 192, pub("icons", "maskable-192.png"));
  await png(maskable, 512, pub("icons", "maskable-512.png"));
  // Apple touch icon: opaque, square (iOS applies its own rounded mask)
  await png(full, 180, app("apple-icon.png"));
  await png(full, 180, pub("apple-touch-icon.png"));

  // favicon.ico (16 = bold heart, 32/48 = simplified flower, no stars)
  const flowerSmall = iconSvg({ stars: false, stroke: 58, radius: 160 });
  const ico = buildIco([
    { size: 16, data: await sharp(Buffer.from(tinyHeartSvg())).resize(16, 16).png().toBuffer() },
    { size: 32, data: await sharp(Buffer.from(flowerSmall), { density: 300 }).resize(32, 32).png().toBuffer() },
    { size: 48, data: await sharp(Buffer.from(flowerSmall), { density: 300 }).resize(48, 48).png().toBuffer() },
  ]);
  await writeFile(app("favicon.ico"), ico);

  // Notification badge (monochrome white heart on transparent, Android)
  await sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M32 54 C 12 40, 6 30, 9 20 C 12 10, 26 9, 32 19 C 38 9, 52 10, 55 20 C 58 30, 52 40, 32 54 Z" fill="#fff"/></svg>`,
    ),
  )
    .resize(96, 96)
    .png()
    .toFile(pub("icons", "badge-96.png"));

  // iOS startup images: black canvas + centred symbol (no text)
  const symbol = iconSvg({ background: false });
  for (const s of SPLASH) {
    const size = Math.round(Math.min(s.w, s.h) * 0.46);
    const mark = await sharp(Buffer.from(symbol), { density: 300 }).resize(size, size).png().toBuffer();
    await sharp({ create: { width: s.w, height: s.h, channels: 4, background: ICON_BG } })
      .composite([{ input: mark, left: Math.round((s.w - size) / 2), top: Math.round((s.h - size) / 2 - s.h * 0.04) }])
      .png({ compressionLevel: 9 })
      .toFile(pub("splash", `splash-${s.w}x${s.h}.png`));
  }

  const links = SPLASH.map(
    (s) =>
      `{ url: "/splash/splash-${s.w}x${s.h}.png", media: "(device-width: ${s.dw}px) and (device-height: ${s.dh}px) and (-webkit-device-pixel-ratio: ${s.r}) and (orientation: portrait)" }`,
  ).join(",\n  ");
  await writeFile(
    path.join(root, "src", "features", "pwa", "splash-screens.ts"),
    `// Generated by scripts/generate-icons.mjs — do not edit by hand.\nexport const splashScreens = [\n  ${links},\n];\n`,
  );

  console.log("Icons generated ✓");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
