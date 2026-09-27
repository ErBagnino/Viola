// Source of truth for the app icon.
//
// Concept: a viola (the flower Viola is named after) whose five petals are
// heart outlines meeting in the centre — red line-art on black, with a
// white Y2K sparkle star, the same visual language as the reference icon
// Viola loves (black canvas, bright elegant red line symbol, white stars).

export const ICON_RED = "#DA0E14";
export const ICON_RED_DARK = "#8E0A0E";
export const ICON_BG = "#000000";

// Heart outline with its tip at (0,0), lobes pointing up (negative y).
// `s` = overall height.
function heartPath(s, wr = 0.62) {
  const w = s * wr;
  return [
    `M 0 0`,
    `C ${-w * 0.35} ${-s * 0.28}, ${-w} ${-s * 0.52}, ${-w * 0.78} ${-s * 0.84}`,
    `C ${-w * 0.6} ${-s * 1.08}, ${-w * 0.14} ${-s * 1.06}, 0 ${-s * 0.8}`,
    `C ${w * 0.14} ${-s * 1.06}, ${w * 0.6} ${-s * 1.08}, ${w * 0.78} ${-s * 0.84}`,
    `C ${w} ${-s * 0.52}, ${w * 0.35} ${-s * 0.28}, 0 0`,
    "Z",
  ].join(" ");
}

// 4-point sparkle star (curved sides), centred on (0,0), radius r.
function sparklePath(r) {
  const k = r * 0.22;
  return [
    `M 0 ${-r}`,
    `C ${k} ${-k}, ${k} ${-k}, ${r} 0`,
    `C ${k} ${k}, ${k} ${k}, 0 ${r}`,
    `C ${-k} ${k}, ${-k} ${k}, ${-r} 0`,
    `C ${-k} ${-k}, ${-k} ${-k}, 0 ${-r}`,
    "Z",
  ].join(" ");
}

// Classic 5-point star, centred, outer radius R.
function starPath(R, inner = 0.45) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? R : R * inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(Math.cos(a) * r).toFixed(2)} ${(Math.sin(a) * r).toFixed(2)}`);
  }
  return `M ${pts.join(" L ")} Z`;
}

/**
 * @param {object} o
 * @param {number} [o.size=1024] canvas size
 * @param {number} [o.scale=1] symbol scale (maskable icons use < 1)
 * @param {boolean} [o.stars=true] include the sparkle accents
 * @param {boolean} [o.background=true] paint the black canvas
 * @param {number} [o.stroke] stroke width override (canvas units at 1024)
 * @param {number} [o.radius=0] canvas corner radius
 */
export function iconSvg({ size = 1024, scale = 1, stars = true, background = true, stroke, radius = 0, heartSize = 280, heartWidth = 0.58, offset = 88 } = {}) {
  const S = 1024;
  const sw = stroke ?? 38;
  const heart = heartPath(heartSize, heartWidth);
  const petals = [0, 72, 144, 216, 288]
    .map((deg) => `<path d="${heart}" transform="rotate(${deg}) translate(0 ${-offset})" />`)
    .join("");

  const accents = stars
    ? `
    <g transform="translate(772 238) rotate(-14)">
      <path d="${starPath(104, 0.46)}" fill="#FFFFFF" stroke="${ICON_RED}" stroke-width="22" stroke-linejoin="round" paint-order="stroke" />
      <path d="${starPath(104, 0.46)}" fill="none" stroke="#000" stroke-width="6" stroke-linejoin="round" transform="scale(0.62)" />
    </g>
    <g transform="translate(214 812)">
      <path d="${sparklePath(64)}" fill="#FFFFFF" stroke="#000" stroke-width="8" stroke-linejoin="round" />
    </g>
    <g transform="translate(300 904)">
      <path d="${sparklePath(32)}" fill="#FFFFFF" stroke="#000" stroke-width="6" stroke-linejoin="round" />
    </g>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${size}" height="${size}">
  ${background ? `<rect width="${S}" height="${S}" rx="${radius}" fill="${ICON_BG}" />` : ""}
  <g transform="translate(512 526) scale(${scale}) translate(-512 -526)">
    <g transform="translate(512 526)" fill="none" stroke="${ICON_RED}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round">
      ${petals}
      <path d="${heartPath(62, 0.62)}" transform="translate(0 30)" fill="${ICON_RED}" stroke-width="${sw * 0.4}" />
    </g>
    ${accents}
  </g>
</svg>`;
}
