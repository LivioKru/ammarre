/* Generates the AMMARRE product drawings.
   Rope is built strand by strand: a chevron braid walked along a sampled path,
   shaded by each arm's position in screen space so light always falls from above.
   No text lives in these files - labels are HTML, so they stay selectable. */

const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'assets');

/* ---------- colour helpers ---------- */

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (c) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => toHex(hex(a).map((v, i) => v + (hex(b)[i] - v) * t));

/* deterministic noise so every rebuild draws the same rope */
function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- path samplers ---------- */

function sampleEllipse({ cx, cy, rx, ry, tStart, tEnd, step }) {
  const pts = [];
  let t = tStart;
  let guard = 0;
  while (t <= tEnd && guard++ < 20000) {
    const dx = -rx * Math.sin(t);
    const dy = ry * Math.cos(t);
    const len = Math.hypot(dx, dy);
    pts.push({
      x: cx + rx * Math.cos(t), y: cy + ry * Math.sin(t),
      tx: dx / len, ty: dy / len, nx: -dy / len, ny: dx / len,
    });
    t += step / len;
  }
  return pts;
}

function sampleLine({ x1, y1, x2, y2, step }) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const tx = (x2 - x1) / len, ty = (y2 - y1) / len;
  const pts = [];
  for (let d = 0; d <= len; d += step) {
    pts.push({ x: x1 + tx * d, y: y1 + ty * d, tx, ty, nx: -ty, ny: tx });
  }
  return pts;
}

/* ---------- the rope ---------- */

const n = (v) => Math.round(v * 100) / 100;

function polyline(pts, off = 0) {
  return pts.map((p, i) => `${i ? 'L' : 'M'}${n(p.x + p.nx * off)} ${n(p.y + p.ny * off)}`).join('');
}

/*  pal: { base, light, dark, fleck }  */
function rope(pts, pal, opts = {}) {
  const w = opts.w || 30;
  const hw = w / 2;
  const pitch = opts.pitch || 2;      // samples between braid ridges
  const seed = opts.seed || 7;
  const rand = rng(seed);
  const out = [];

  // solid core, so the braid never shows the paper through its gaps
  out.push(`<path d="${polyline(pts)}" fill="none" stroke="${mix(pal.base, pal.dark, 0.3)}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`);

  // braid: two arms per ridge, meeting at the rope's centre line ahead
  const arms = [];
  for (let i = 0; i < pts.length - pitch - 1; i += pitch) {
    const p = pts[i];
    const apex = pts[i + pitch];
    const fleck = rand() < 0.13;
    const jitter = 0.88 + rand() * 0.24;
    for (const side of [1, -1]) {
      const ex = p.x + p.nx * hw * side * 0.99;
      const ey = p.y + p.ny * hw * side * 0.99;
      const my = (ey + apex.y) / 2;
      // light from above: an arm sitting higher than the rope's centre catches it
      const f = Math.max(-1, Math.min(1, (p.y - my) / hw));
      let c = f > 0 ? mix(pal.base, pal.light, (0.34 + f * 0.5) * jitter) : mix(pal.base, pal.dark, (0.1 - f * 0.5) * jitter);
      if (fleck && side > 0) c = mix(c, pal.fleck, 0.72);
      if (fleck && side < 0) c = mix(c, pal.fleck, 0.4);
      arms.push(`<path d="M${n(ex)} ${n(ey)}Q${n(p.x + p.tx * hw * 0.1 + p.nx * hw * side * 0.52)} ${n(p.y + p.ty * hw * 0.1 + p.ny * hw * side * 0.52)} ${n(apex.x)} ${n(apex.y)}" stroke="${c}"/>`);
    }
  }
  out.push(`<g fill="none" stroke-width="${n(w * 0.15)}" stroke-linecap="round">${arms.join('')}</g>`);

  // cylinder: darken both rims so the rope reads as round
  out.push(`<path d="${polyline(pts, hw - 1.2)}" fill="none" stroke="${pal.dark}" stroke-width="2.6" stroke-linecap="round" opacity=".42"/>`);
  out.push(`<path d="${polyline(pts, -(hw - 1.2))}" fill="none" stroke="${pal.dark}" stroke-width="2.6" stroke-linecap="round" opacity=".42"/>`);
  return out.join('');
}

/* ---------- brushed steel ---------- */

function steelDefs(id = 'steel') {
  const brush = [];
  const rand = rng(31);
  for (let i = 0; i < 26; i++) {
    const y = 2 + rand() * 96;
    brush.push(`<line x1="0" y1="${n(y)}" x2="100" y2="${n(y)}" stroke="${rand() > 0.5 ? '#ffffff' : '#5d666b'}" stroke-width="${n(0.4 + rand() * 0.7)}" opacity="${n(0.14 + rand() * 0.2)}"/>`);
  }
  return `
  <linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#848b8f"/><stop offset=".2" stop-color="#c4c9cb"/>
    <stop offset=".4" stop-color="#d9dcdd"/><stop offset=".58" stop-color="#a4aaad"/>
    <stop offset=".8" stop-color="#bcc1c3"/><stop offset="1" stop-color="#787f84"/>
  </linearGradient>
  <linearGradient id="${id}-v" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#787f84"/><stop offset=".22" stop-color="#ccd1d3"/>
    <stop offset=".5" stop-color="#9aa1a5"/><stop offset=".78" stop-color="#d2d6d8"/>
    <stop offset="1" stop-color="#7d848a"/>
  </linearGradient>
  <pattern id="${id}-brush" width="100" height="100" patternUnits="userSpaceOnUse">${brush.join('')}</pattern>`;
}

/* A marine shackle lying along the rope: bow opening right, pin closing it. */
function shackle(cx, cy, halfW, scale = 1) {
  const bar = 11 * scale, armY = 21 * scale;
  const bowX = cx - halfW + bar;
  const pinX = cx + halfW - 13 * scale;
  const bow = `M${n(pinX)} ${n(cy - armY)}H${n(bowX + armY)}A${n(armY)} ${n(armY)} 0 0 0 ${n(bowX + armY)} ${n(cy + armY)}H${n(pinX)}`;
  const ear = (dy) => `<circle cx="${n(pinX)}" cy="${n(cy + dy)}" r="${n(bar * 0.82)}" fill="url(#steel)"/>`;
  return `
  <g>
    <path d="${bow}" fill="none" stroke="#2f3538" stroke-width="${n(bar + 2.5)}" stroke-linecap="round" opacity=".4"/>
    <path d="${bow}" fill="none" stroke="url(#steel)" stroke-width="${n(bar)}" stroke-linecap="round"/>
    <path d="${bow}" fill="none" stroke="url(#steel-brush)" stroke-width="${n(bar)}" stroke-linecap="round" opacity=".5"/>
    <g transform="translate(0 ${n(-bar * 0.24)})"><path d="${bow}" fill="none" stroke="#ffffff" stroke-width="${n(bar * 0.26)}" stroke-linecap="round" opacity=".26"/></g>
    ${ear(-armY)}${ear(armY)}
    <rect x="${n(pinX - bar * 0.42)}" y="${n(cy - armY - bar * 1.05)}" width="${n(bar * 0.84)}" height="${n(armY * 2 + bar * 2.1)}" rx="${n(bar * 0.42)}" fill="url(#steel-v)"/>
    <rect x="${n(pinX - bar * 0.9)}" y="${n(cy - armY - bar * 1.5)}" width="${n(bar * 1.8)}" height="${n(bar * 0.78)}" rx="${n(bar * 0.3)}" fill="url(#steel-v)"/>
    <line x1="${n(pinX - bar * 0.18)}" y1="${n(cy - armY - bar * 0.5)}" x2="${n(pinX - bar * 0.18)}" y2="${n(cy + armY + bar * 0.5)}" stroke="#fff" stroke-width="${n(bar * 0.14)}" opacity=".5"/>
  </g>`;
}

/* steel collar where the rope is whipped into the clasp */
function ferrule(p, ropeW) {
  const a = (Math.atan2(p.ty, p.tx) * 180) / Math.PI;
  const h = ropeW + 3.5;
  return `<g transform="translate(${n(p.x)} ${n(p.y)}) rotate(${n(a)})">
    <rect x="-13" y="${n(-h / 2)}" width="26" height="${n(h)}" rx="5.5" fill="url(#steel)"/>
    <rect x="-13" y="${n(-h / 2)}" width="26" height="${n(h)}" rx="5.5" fill="url(#steel-brush)" opacity=".55"/>
    <line x1="-6" y1="${n(-h / 2 + 2.5)}" x2="-6" y2="${n(h / 2 - 2.5)}" stroke="#5d666b" stroke-width="1" opacity=".5"/>
    <line x1="6" y1="${n(-h / 2 + 2.5)}" x2="6" y2="${n(h / 2 - 2.5)}" stroke="#5d666b" stroke-width="1" opacity=".5"/>
  </g>`;
}

/* ---------- the piece, double-wrapped ---------- */

function bracelet(pal, seed) {
  const W = 1000, H = 860;
  const cx = 500, ropeW = 35;
  const gapHalf = 62;

  const front = { cx, cy: 512, rx: 288, ry: 196 };
  const back = { cx: cx - 5, cy: 462, rx: 281, ry: 190 };

  const gh = (g) => Math.asin(gapHalf / g.rx);
  const ptsFor = (g) => sampleEllipse({
    ...g, tStart: -Math.PI / 2 + gh(g), tEnd: -Math.PI / 2 + 2 * Math.PI - gh(g), step: 3,
  });

  const dim = (p) => ({
    base: mix(p.base, '#2a2f31', 0.3), light: mix(p.light, '#2a2f31', 0.3),
    dark: mix(p.dark, '#000000', 0.1), fleck: p.fleck,
  });

  const fPts = ptsFor(front);
  const bPts = sampleEllipse({ ...back, tStart: -Math.PI / 2, tEnd: -Math.PI / 2 + 2 * Math.PI + 0.02, step: 3 });
  const end = (pts, which) => (which === 'a' ? pts[0] : pts[pts.length - 1]);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="152 254 696 534" role="img">
  <defs>
    ${steelDefs()}
    <radialGradient id="contact" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#3b3f3c" stop-opacity=".3"/>
      <stop offset=".55" stop-color="#3b3f3c" stop-opacity=".13"/>
      <stop offset="1" stop-color="#3b3f3c" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <ellipse cx="${cx}" cy="734" rx="312" ry="34" fill="url(#contact)"/>
  <g>${rope(bPts, dim(pal), { w: ropeW - 1.5, seed: seed + 91 })}</g>
  <g>${rope(fPts, pal, { w: ropeW, seed })}${ferrule(end(fPts, 'a'), ropeW)}${ferrule(end(fPts, 'b'), ropeW)}${shackle(front.cx, front.cy - front.ry, gapHalf)}</g>
</svg>`;
}

/* ---------- exploded construction drawing ---------- */

function anatomy(pal) {
  const W = 1000, y = 150, ropeW = 34;

  const left = sampleLine({ x1: 150, y1: y, x2: 392, y2: y, step: 4 });
  const right = sampleLine({ x1: 608, y1: y, x2: 1070, y2: y, step: 4 });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 78 ${W} 144" role="img">
  <defs>${steelDefs()}</defs>
  <g>
    <path d="M-10 ${y}H206" stroke="${mix(pal.dark, '#000', 0.2)}" stroke-width="14" stroke-linecap="round"/>
    <path d="M-10 ${n(y - 3.4)}H200" stroke="${mix(pal.light, '#fff', 0.15)}" stroke-width="3.4" stroke-linecap="round" opacity=".55"/>
    <path d="M-10 ${n(y + 3.6)}H200" stroke="#000" stroke-width="2.6" stroke-linecap="round" opacity=".18"/>
  </g>
  <g>${rope(right, pal, { w: ropeW, seed: 12 })}${ferrule(right[0], ropeW)}</g>
  <g>${rope(left, pal, { w: ropeW, seed: 5 })}${ferrule(left[left.length - 1], ropeW)}</g>
  ${shackle(500, y, 108, 1.5)}
</svg>`;
}

/* ---------- clasp study ---------- */

function claspStudy(pal) {
  const W = 900, H = 420, y = 230;
  const pts = sampleLine({ x1: -20, y1: y, x2: 292, y2: y, step: 4 });
  const pts2 = sampleLine({ x1: 608, y1: y, x2: 920, y2: y, step: 4 });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 130 ${W} 232" role="img">
  <defs>${steelDefs()}
    <radialGradient id="contact" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#3b3f3c" stop-opacity=".26"/><stop offset="1" stop-color="#3b3f3c" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <ellipse cx="450" cy="334" rx="330" ry="34" fill="url(#contact)"/>
  <g>${rope(pts, pal, { w: 52, pitch: 3, seed: 3 })}${ferrule(pts[pts.length - 1], 52)}</g>
  <g>${rope(pts2, pal, { w: 52, pitch: 3, seed: 8 })}${ferrule(pts2[0], 52)}</g>
  ${shackle(450, y, 158, 2.5)}
</svg>`;
}

/* ---------- build ---------- */

const MODELS = {
  'silver-current': { base: '#c5c7c3', light: '#eceeeb', dark: '#767a78', fleck: '#3a3f41' },
  'deep-water': { base: '#1d3947', light: '#43697d', dark: '#081319', fleck: '#0a1a22' },
  'after-tide': { base: '#5a1e23', light: '#8b3239', dark: '#22090c', fleck: '#1a0608' },
};

let seed = 4;
for (const [name, pal] of Object.entries(MODELS)) {
  fs.writeFileSync(path.join(OUT, `${name}.svg`), bracelet(pal, (seed += 17)));
}
fs.writeFileSync(path.join(OUT, 'anatomy.svg'), anatomy(MODELS['silver-current']));
fs.writeFileSync(path.join(OUT, 'clasp.svg'), claspStudy(MODELS['silver-current']));
console.log('drawn:', fs.readdirSync(OUT).join(' '));
