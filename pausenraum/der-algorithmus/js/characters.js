// characters.js — Character-Lookup und prozedurale SVG-Avatare.
// Keine externen Bilder — Avatare werden aus Index + Farbe generiert.

let CHAR_MAP = null;
let DYNAMIC_HOOK = null;

export function setCharacters(list) {
  CHAR_MAP = new Map();
  for (const c of list) CHAR_MAP.set(c.id, c);
}

// Anderer Modul (typischerweise main.js) kann eine Funktion registrieren, die
// den dynamischen Charakter-Zustand (Bio nach NPC-Arc) nachschiebt.
// Ohne Hook bleibt das Verhalten unverändert.
export function setDynamicHook(fn) {
  DYNAMIC_HOOK = typeof fn === 'function' ? fn : null;
}

export function getCharacter(id) {
  if (!CHAR_MAP) return null;
  const base = CHAR_MAP.get(id) || { id, name: id, handle: '@' + id, avatar: 0, bio: '' };
  if (!DYNAMIC_HOOK) return base;
  const overlay = DYNAMIC_HOOK(id, base);
  if (!overlay) return base;
  return { ...base, ...overlay };
}

/**
 * Generiert eine SVG-Avatar-Datenstruktur aus einem Integer.
 * Deterministisch: gleiche Zahl → gleicher Avatar.
 * Kombiniert unabhängige Merkmale (Hautton, Frisur, Brille,
 * Accessoires, Augen, Mund) zu vielfältigen Charakter-Portraits.
 */
export function avatarSvg(seed = 0) {
  // Knuth-Hash für bessere Streuung der Merkmale über den Seed.
  const h = (((seed | 0) + 1) * 2654435761) >>> 0;
  const pick = (n, mix) => Math.floor((((h ^ (mix * 2246822519)) >>> 0) / 4294967296) * n);

  const skinTones = [
    '#fde0c8', '#f7c9a4', '#eab892', '#d49e74', '#b57746',
    '#8d5a36', '#6a3f22', '#4a2c1a',
    '#a5d8ff', '#b8f2c9', '#f4b8e4'
  ];
  const hairColors = [
    '#1a1412', '#3d2418', '#6b3e22', '#a56b3a',
    '#d9a441', '#ead9a8', '#b8b8b8', '#ffffff',
    '#c83a5c', '#7a3aa5', '#3a7ac8', '#3ac8a5', '#e85a7a'
  ];
  const bgColors = [
    '#ff2e88', '#22d3ee', '#facc15', '#4ade80',
    '#a78bfa', '#fb7185', '#60a5fa', '#f97316',
    '#34d399', '#f472b6', '#e879f9', '#f43f5e'
  ];
  const shirtColors = [
    '#1f2937', '#ef4444', '#f59e0b', '#10b981',
    '#3b82f6', '#8b5cf6', '#ec4899', '#64748b',
    '#0ea5e9', '#a3e635'
  ];

  const skin   = skinTones[pick(skinTones.length, 1)];
  const hair   = hairColors[pick(hairColors.length, 2)];
  const bg     = bgColors[pick(bgColors.length, 3)];
  const shirt  = shirtColors[pick(shirtColors.length, 4)];
  const accent = bgColors[pick(bgColors.length, 11)];

  const hairStyle  = pick(10, 5);
  const eyeStyle   = pick(5, 6);
  const mouthStyle = pick(5, 7);
  const glasses    = pick(5, 8);   // 0/1 keine, 2 rund, 3 eckig, 4 Sonnenbrille
  const accessory  = pick(6, 9);   // 0 nichts, 1 Blush, 2 Ohrringe, 3 Muttermal, 4 Sommersprossen, 5 Nasenring
  const faceShape  = pick(3, 10);
  const browStyle  = pick(3, 12);

  // Hintergrund (farbiger „Portrait-Kreis")
  const bgCircle = `<circle cx="50" cy="50" r="50" fill="${bg}"/>`;

  // T-Shirt / Kragen
  const shirtSvg = `<path d="M 18 100 Q 22 84 36 82 Q 42 90 50 90 Q 58 90 64 82 Q 78 84 82 100 Z" fill="${shirt}"/>`;
  const neckSvg  = `<path d="M 44 76 Q 44 84 50 86 Q 56 84 56 76 Z" fill="${skin}"/>
    <path d="M 44 82 Q 50 86 56 82" stroke="#000" stroke-width="0.6" stroke-opacity="0.18" fill="none"/>`;

  // Kopfform
  let head;
  if (faceShape === 0) {
    head = `<ellipse cx="50" cy="52" rx="26" ry="30" fill="${skin}"/>`;
  } else if (faceShape === 1) {
    head = `<path d="M 24 46 Q 24 26 50 26 Q 76 26 76 46 Q 76 70 62 78 Q 50 84 38 78 Q 24 70 24 46 Z" fill="${skin}"/>`;
  } else {
    head = `<path d="M 26 44 Q 26 24 50 24 Q 74 24 74 44 L 74 60 Q 74 78 50 82 Q 26 78 26 60 Z" fill="${skin}"/>`;
  }
  // Kinn-Schatten für etwas Tiefe
  const shading = `<ellipse cx="50" cy="74" rx="14" ry="5" fill="#000" opacity="0.08"/>`;

  // Ohren (nur wenn Frisur sie nicht verdeckt)
  const earsVisible = ![1, 3, 4, 7].includes(hairStyle);
  const ears = earsVisible
    ? `<ellipse cx="23" cy="55" rx="3" ry="5" fill="${skin}"/>
       <ellipse cx="77" cy="55" rx="3" ry="5" fill="${skin}"/>`
    : '';

  // Frisuren / Kopfbedeckung
  let hairSvg = '';
  if (hairStyle === 0) {
    // Kurze, leicht strubbelige Frisur
    hairSvg = `<path d="M 24 48 Q 22 22 50 22 Q 78 22 76 48 Q 72 36 66 34 Q 58 28 50 30 Q 42 28 34 34 Q 28 36 24 48 Z" fill="${hair}"/>`;
  } else if (hairStyle === 1) {
    // Lange, gerade Haare (über die Ohren)
    hairSvg = `<path d="M 20 46 Q 20 22 50 22 Q 80 22 80 46 L 80 82 L 72 82 L 72 40 Q 50 30 28 40 L 28 82 L 20 82 Z" fill="${hair}"/>`;
  } else if (hairStyle === 2) {
    // Seitenscheitel
    hairSvg = `<path d="M 24 46 Q 24 22 50 22 Q 78 22 78 46 Q 70 36 54 38 Q 46 30 34 34 Q 28 38 24 46 Z" fill="${hair}"/>`;
  } else if (hairStyle === 3) {
    // Dutt / Zopf oben
    hairSvg = `<circle cx="50" cy="18" r="9" fill="${hair}"/>
      <path d="M 24 46 Q 24 24 50 24 Q 76 24 76 46 Q 68 36 50 36 Q 32 36 24 46 Z" fill="${hair}"/>`;
  } else if (hairStyle === 4) {
    // Afro / Lockenkopf
    hairSvg = `<circle cx="30" cy="36" r="11" fill="${hair}"/>
      <circle cx="42" cy="22" r="11" fill="${hair}"/>
      <circle cx="58" cy="22" r="11" fill="${hair}"/>
      <circle cx="70" cy="36" r="11" fill="${hair}"/>
      <circle cx="22" cy="50" r="9"  fill="${hair}"/>
      <circle cx="78" cy="50" r="9"  fill="${hair}"/>
      <circle cx="50" cy="18" r="10" fill="${hair}"/>`;
  } else if (hairStyle === 5) {
    // Pony (Bangs)
    hairSvg = `<path d="M 22 48 Q 22 22 50 22 Q 78 22 78 48 Q 64 38 50 44 Q 36 38 22 48 Z" fill="${hair}"/>`;
  } else if (hairStyle === 6) {
    // Mohawk / Undercut
    hairSvg = `<path d="M 42 14 L 58 14 Q 60 30 56 42 L 44 42 Q 40 30 42 14 Z" fill="${hair}"/>
      <path d="M 24 50 Q 28 46 36 46 M 64 46 Q 72 46 76 50" stroke="${hair}" stroke-width="3" stroke-linecap="round" fill="none"/>`;
  } else if (hairStyle === 7) {
    // Beanie / Mütze
    hairSvg = `<path d="M 22 46 Q 22 16 50 16 Q 78 16 78 46 L 78 50 L 22 50 Z" fill="${accent}"/>
      <rect x="22" y="48" width="56" height="5" fill="#000" opacity="0.25"/>
      <circle cx="50" cy="12" r="4" fill="${accent}"/>`;
  } else if (hairStyle === 8) {
    // Kahl / kurz rasiert
    hairSvg = `<path d="M 26 44 Q 28 30 50 30 Q 72 30 74 44" stroke="${hair}" stroke-width="1.5" fill="none" opacity="0.7"/>`;
  } else {
    // Pferdeschwanz hinter dem Kopf
    hairSvg = `<path d="M 24 46 Q 24 22 50 22 Q 76 22 76 46 Q 70 36 56 36 Q 50 28 44 36 Q 30 36 24 46 Z" fill="${hair}"/>
      <path d="M 76 42 Q 90 52 84 74 Q 80 66 76 58 Z" fill="${hair}"/>`;
  }

  // Augenbrauen
  const by = 46;
  let brows;
  if (browStyle === 0) {
    brows = `<path d="M 34 ${by} Q 40 ${by - 2} 46 ${by}" stroke="${hair}" stroke-width="2" stroke-linecap="round" fill="none"/>
      <path d="M 54 ${by} Q 60 ${by - 2} 66 ${by}" stroke="${hair}" stroke-width="2" stroke-linecap="round" fill="none"/>`;
  } else if (browStyle === 1) {
    brows = `<path d="M 34 ${by} L 46 ${by}" stroke="${hair}" stroke-width="2" stroke-linecap="round"/>
      <path d="M 54 ${by} L 66 ${by}" stroke="${hair}" stroke-width="2" stroke-linecap="round"/>`;
  } else {
    brows = `<path d="M 34 ${by + 1} Q 40 ${by - 3} 46 ${by - 1}" stroke="${hair}" stroke-width="2.2" stroke-linecap="round" fill="none"/>
      <path d="M 54 ${by - 1} Q 60 ${by - 3} 66 ${by + 1}" stroke="${hair}" stroke-width="2.2" stroke-linecap="round" fill="none"/>`;
  }

  // Augen
  const eyeY = 54;
  let eyes;
  if (eyeStyle === 0) {
    eyes = `<circle cx="40" cy="${eyeY}" r="2.2" fill="#1a1a1a"/>
            <circle cx="60" cy="${eyeY}" r="2.2" fill="#1a1a1a"/>`;
  } else if (eyeStyle === 1) {
    eyes = `<path d="M 36 ${eyeY} Q 40 ${eyeY - 3} 44 ${eyeY} Q 40 ${eyeY + 2} 36 ${eyeY} Z" fill="#1a1a1a"/>
            <path d="M 56 ${eyeY} Q 60 ${eyeY - 3} 64 ${eyeY} Q 60 ${eyeY + 2} 56 ${eyeY} Z" fill="#1a1a1a"/>`;
  } else if (eyeStyle === 2) {
    eyes = `<path d="M 36 ${eyeY} Q 40 ${eyeY - 3} 44 ${eyeY}" stroke="#1a1a1a" stroke-width="1.6" fill="none" stroke-linecap="round"/>
            <path d="M 56 ${eyeY} Q 60 ${eyeY - 3} 64 ${eyeY}" stroke="#1a1a1a" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
  } else if (eyeStyle === 3) {
    eyes = `<circle cx="40" cy="${eyeY}" r="3" fill="#1a1a1a"/>
            <circle cx="60" cy="${eyeY}" r="3" fill="#1a1a1a"/>
            <circle cx="41" cy="${eyeY - 1}" r="1" fill="#fff"/>
            <circle cx="61" cy="${eyeY - 1}" r="1" fill="#fff"/>`;
  } else {
    // Offene Augen mit Iris in Akzentfarbe
    eyes = `<ellipse cx="40" cy="${eyeY}" rx="3.2" ry="2.4" fill="#fff"/>
            <ellipse cx="60" cy="${eyeY}" rx="3.2" ry="2.4" fill="#fff"/>
            <circle cx="40" cy="${eyeY}" r="1.8" fill="${accent}"/>
            <circle cx="60" cy="${eyeY}" r="1.8" fill="${accent}"/>
            <circle cx="40.5" cy="${eyeY - 0.5}" r="0.6" fill="#fff"/>
            <circle cx="60.5" cy="${eyeY - 0.5}" r="0.6" fill="#fff"/>`;
  }

  // Brille / Sonnenbrille
  let glassesSvg = '';
  if (glasses === 2) {
    glassesSvg = `<circle cx="40" cy="${eyeY}" r="6" fill="none" stroke="#1a1a1a" stroke-width="1.4"/>
      <circle cx="60" cy="${eyeY}" r="6" fill="none" stroke="#1a1a1a" stroke-width="1.4"/>
      <line x1="46" y1="${eyeY}" x2="54" y2="${eyeY}" stroke="#1a1a1a" stroke-width="1.4"/>`;
  } else if (glasses === 3) {
    glassesSvg = `<rect x="33" y="${eyeY - 5}" width="14" height="10" rx="1.5" fill="none" stroke="#1a1a1a" stroke-width="1.4"/>
      <rect x="53" y="${eyeY - 5}" width="14" height="10" rx="1.5" fill="none" stroke="#1a1a1a" stroke-width="1.4"/>
      <line x1="47" y1="${eyeY}" x2="53" y2="${eyeY}" stroke="#1a1a1a" stroke-width="1.4"/>`;
  } else if (glasses === 4) {
    glassesSvg = `<rect x="32" y="${eyeY - 5}" width="16" height="10" rx="4" fill="#1a1a1a"/>
      <rect x="52" y="${eyeY - 5}" width="16" height="10" rx="4" fill="#1a1a1a"/>
      <line x1="48" y1="${eyeY}" x2="52" y2="${eyeY}" stroke="#1a1a1a" stroke-width="1.4"/>
      <rect x="35" y="${eyeY - 4}" width="4" height="3" rx="1" fill="#fff" opacity="0.35"/>
      <rect x="55" y="${eyeY - 4}" width="4" height="3" rx="1" fill="#fff" opacity="0.35"/>`;
  }

  // Nase (dezent)
  const nose = `<path d="M 50 56 Q 48 62 50 64 Q 52 62 50 56" fill="#000" opacity="0.08"/>`;

  // Mund
  const my = 70;
  let mouth;
  if (mouthStyle === 0) {
    mouth = `<path d="M 44 ${my} Q 50 ${my + 4} 56 ${my}" stroke="#4a2518" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
  } else if (mouthStyle === 1) {
    mouth = `<path d="M 42 ${my - 1} Q 50 ${my + 6} 58 ${my - 1} Q 50 ${my + 2} 42 ${my - 1} Z" fill="#c83a5c"/>
      <path d="M 42 ${my - 1} Q 50 ${my + 2} 58 ${my - 1}" stroke="#fff" stroke-width="0.8" fill="none" opacity="0.5"/>`;
  } else if (mouthStyle === 2) {
    mouth = `<line x1="46" y1="${my + 1}" x2="54" y2="${my + 1}" stroke="#4a2518" stroke-width="1.6" stroke-linecap="round"/>`;
  } else if (mouthStyle === 3) {
    mouth = `<path d="M 43 ${my - 1} Q 50 ${my + 7} 57 ${my - 1} Z" fill="#4a2518"/>
      <path d="M 45 ${my + 1} Q 50 ${my + 3} 55 ${my + 1}" stroke="#fff" stroke-width="1.2" fill="none" stroke-linecap="round"/>`;
  } else {
    mouth = `<path d="M 44 ${my + 1} Q 48 ${my - 1} 52 ${my + 1} Q 56 ${my - 1} 58 ${my + 1}" stroke="#4a2518" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
  }

  // Accessoires
  let acc = '';
  if (accessory === 1) {
    acc = `<ellipse cx="34" cy="66" rx="3" ry="2" fill="#ff7aa2" opacity="0.4"/>
      <ellipse cx="66" cy="66" rx="3" ry="2" fill="#ff7aa2" opacity="0.4"/>`;
  } else if (accessory === 2 && earsVisible) {
    acc = `<circle cx="23" cy="62" r="2" fill="${accent}"/>
      <circle cx="77" cy="62" r="2" fill="${accent}"/>`;
  } else if (accessory === 3) {
    acc = `<circle cx="42" cy="66" r="1" fill="#4a2518"/>`;
  } else if (accessory === 4) {
    acc = `<circle cx="38" cy="60" r="0.8" fill="#8d5a36" opacity="0.7"/>
      <circle cx="44" cy="62" r="0.8" fill="#8d5a36" opacity="0.7"/>
      <circle cx="56" cy="62" r="0.8" fill="#8d5a36" opacity="0.7"/>
      <circle cx="62" cy="60" r="0.8" fill="#8d5a36" opacity="0.7"/>`;
  } else if (accessory === 5) {
    acc = `<circle cx="46" cy="64" r="1.1" fill="none" stroke="#d9a441" stroke-width="0.8"/>`;
  }

  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    ${bgCircle}
    ${shirtSvg}
    ${neckSvg}
    ${ears}
    ${head}
    ${shading}
    ${hairSvg}
    ${brows}
    ${eyes}
    ${glassesSvg}
    ${nose}
    ${mouth}
    ${acc}
  </svg>`;
}

/* =====================================================================
   Post-Bilder: prozedurale, seed-basierte Motiv-Illustrationen.
   - FNV-1a-Hash über die Post-ID → mulberry32-PRNG: gleiche ID ergibt
     exakt dasselbe Bild (auch nach Reload), kein Math.random.
   - Je Motiv 2–3 Kompositions-Varianten, je Tag 2–3 Palettenvarianten.
   - Didaktischer Farb-Code: der Grundton pro Tag (politik-links blau,
     politik-rechts orange, klima grün, verschwoerung gelblich, hass rot …)
     bleibt erkennbar — wichtig für die Filterblasen-Wiedererkennung.
   - Keine <filter>/<image>-Elemente; alle defs-ids mit Post-Suffix.
   ===================================================================== */

// FNV-1a-Hash über einen String → 32-Bit-Seed.
function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// mulberry32 — kleiner deterministischer Pseudozufallsgenerator.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Zahl für SVG-Attribute formatieren: max. 1 Dezimale, nie NaN/-0.
function N(v) {
  if (!isFinite(v)) return '0';
  const r = Math.round(v * 10) / 10;
  return String(r === 0 ? 0 : r);
}

// --- Farb-Helfer: kleine HSL-Verschiebungen für Palettenvarianten ---
function hexToHsl(hex) {
  const v = parseInt(hex.slice(1), 16);
  const r = ((v >> 16) & 255) / 255, g = ((v >> 8) & 255) / 255, b = (v & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  let h = 0, s = 0;
  const d = max - min;
  if (d > 0.0001) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s * 100, l * 100];
}

function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(3, Math.min(95, l)) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const u = (q) => Math.round((q + m) * 255).toString(16).padStart(2, '0');
  return '#' + u(r) + u(g) + u(b);
}

function shiftColor(hex, dh, ds, dl) {
  const [h, s, l] = hexToHsl(hex);
  return hslToHex(h + dh, s + ds, l + dl);
}

// Tag-Grundfarben [dunkler Grund, Akzent, heller Ton] — didaktischer Code.
const TAG_PALETTES = {
  'politik-rechts': ['#3a1518', '#f97316', '#fde68a'],
  'politik-links':  ['#0c2855', '#60a5fa', '#dbeafe'],
  'politik-mitte':  ['#1a2233', '#94a3b8', '#e2e8f0'],
  'klima':          ['#093821', '#4ade80', '#dcfce7'],
  'gaming':         ['#1b1736', '#a78bfa', '#ede9fe'],
  'wissenschaft':   ['#0b2530', '#22d3ee', '#ccfbf1'],
  'verschwoerung':  ['#2a1133', '#fbbf24', '#fef3c7'],
  'feminismus':     ['#2a0b3c', '#ec4899', '#fce7f3'],
  'humor':          ['#2b2a0a', '#fde68a', '#fef9c3'],
  'lifestyle':      ['#1c1a2e', '#ff2e88', '#fce7f3'],
  'musik':          ['#142b26', '#2dd4bf', '#ccfbf1'],
  'sport':          ['#1a2a10', '#84cc16', '#ecfccb'],
  'hass':           ['#3a0b0d', '#f87171', '#fee2e2'],
  'anti-feminismus':['#1e1333', '#fb7185', '#ffe4e6'],
  'true-crime':     ['#101010', '#9ca3af', '#e5e7eb']
};

// 2–3 harmonische Palettenvarianten je Tag; Hue-Drehung klein halten,
// damit der Grundton (Filterblasen-Code) erkennbar bleibt.
function buildPalette(tag, rnd) {
  const base = TAG_PALETTES[tag] || ['#1a1d29', '#ff2e88', '#e8ebf3'];
  const [bg0, fg0, tone0] = base;
  const variant = Math.floor(rnd() * 3);
  const dh = rnd() * 12 - 6;
  let bgA, bgB;
  if (variant === 0) {
    bgA = shiftColor(bg0, dh, 4, 8 + rnd() * 5);
    bgB = shiftColor(bg0, -dh / 2, 2, -(2 + rnd() * 4));
  } else if (variant === 1) {
    bgA = shiftColor(bg0, dh, 9, 3 + rnd() * 3);
    bgB = shiftColor(bg0, dh, 5, -(5 + rnd() * 4));
  } else {
    bgA = shiftColor(bg0, dh, -5, 11 + rnd() * 4);
    bgB = shiftColor(bg0, dh, -2, -1 - rnd() * 2);
  }
  return {
    bgA, bgB,
    deep: shiftColor(bg0, dh / 2, 3, -3),
    fg:   shiftColor(fg0, rnd() * 10 - 5, 0, rnd() * 7 - 2),
    tone: shiftColor(tone0, rnd() * 8 - 4, 0, rnd() * 5 - 2),
    acc:  shiftColor(fg0, rnd() * 24 - 12, 4, 9 + rnd() * 5),
    lite: shiftColor(tone0, 0, -12, 13)
  };
}

/**
 * Erzeugt ein kontextbezogenes SVG-Motiv als Post-Bild (200×125).
 * Erkennt Stichwörter im Text, wählt Motiv + Komposition + Palette
 * deterministisch aus der Post-ID. Gleiche ID → gleiches Bild.
 */
export function memeSvg(postId, tags = [], text = '') {
  const pid = String(postId).replace(/[^\w-]/g, '') || 'x';
  const rnd = mulberry32(fnv1a(String(postId)));
  const C = buildPalette(tags && tags[0], rnd);
  const motif = detectMotif((text || '').toLowerCase(), tags || []);

  // Verlaufsrichtung seed-variiert
  const ang = rnd() * Math.PI * 2;
  const gx = Math.cos(ang) * 50, gy = Math.sin(ang) * 50;
  const defs = `<defs>
    <linearGradient id="bg-${pid}" x1="${N(50 - gx)}%" y1="${N(50 - gy)}%" x2="${N(50 + gx)}%" y2="${N(50 + gy)}%">
      <stop offset="0%" stop-color="${C.bgA}"/><stop offset="100%" stop-color="${C.bgB}"/>
    </linearGradient>
    <radialGradient id="gl-${pid}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${C.fg}" stop-opacity="0.3"/><stop offset="100%" stop-color="${C.fg}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="vg-${pid}" cx="50%" cy="46%" r="76%">
      <stop offset="62%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="0.3"/>
    </radialGradient>
  </defs>`;

  const deco = buildDeco(C, rnd, pid);
  const scene = renderMotif(motif, C, rnd, pid);
  const frame = buildFrame(C, rnd);

  return `<svg viewBox="0 0 200 125" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    ${defs}
    <rect width="200" height="125" fill="url(#bg-${pid})"/>
    ${deco}
    ${scene}
    <rect width="200" height="125" fill="url(#vg-${pid})"/>
    ${frame}
  </svg>`;
}

function detectMotif(t, tags) {
  if (/kaffee|filterkaffee|café|latte|kakao|tee /.test(t)) return 'coffee';
  if (/roboter|null-pointer|projektroboter|robot/.test(t)) return 'robot';
  if (/radweg|fahrrad|kreisverkehr/.test(t)) return 'bike';
  if (/mond|wolken|regen|sturm|fähren/.test(t)) return 'weather';
  if (/playlist|album|track|song |dj |karaoke|studio|set im |jazz|punk|gig/.test(t)) return 'music';
  if (/buch|autor|rezension|buchhandlung|thriller|dystopie|roman/.test(t)) return 'book';
  if (/deepfake|faktencheck|manipuliert|desinformation|bildersuche/.test(t)) return 'deepfake';
  if (/wahl|wahlergebnis|kandidat|stimme|ankreuzen|kumulieren/.test(t)) return 'ballot';
  if (/demo|protest|bürgerversammlung|fleetplatz|kundgebung|marktplatz/.test(t)) return 'protest';
  if (/gilde|patch|emote|queue|skin|ranked|platin|turnier/.test(t)) return 'gaming';
  if (/studie|universität|uni |korrelation|kausalität|physik|forschung|streuung/.test(t)) return 'science';
  if (/mainstream|zensur|verschwör|gelder|akten|umverteilung|recherche/.test(t)) return 'eye';
  if (/klimakrise|kohleausstieg|klimaziele/.test(t)) return 'earth';
  if (/timeline|scrollen|scrolle|followtrain|follower|algorithm/.test(t)) return 'phone';
  if (/shitstorm|viral|40k|tausend follower/.test(t)) return 'fire';
  if (/fußball|sonntag|altstadtturnier/.test(t)) return 'sport';
  if (/jahresrückblick|wrapped|funkel/.test(t)) return 'sparkle';
  if (/equal pay|zahlen sind|gehalt|statistik/.test(t)) return 'chart';
  if (/hass|angepöbelt|diskriminier|chatgruppe/.test(t)) return 'shield';
  if (/debatte|argument|fernsehen|diskutier/.test(t)) return 'speech';
  if (/zeitung|redaktion|kolumne/.test(t)) return 'news';
  // Neue Motive (nach den bestehenden Checks, vor den Tag-Fallbacks)
  if (/hafenlauf|joggen|gelaufen|laufschuh|marathon|rudern|rudert/.test(t)) return 'sport';
  if (/klausur|hausaufgab|stundenplan|schulhof|klasse 12|lernzettel|tafelbild|unterricht/.test(t)) return 'school';
  if (/katze|\bkater\b|\bhund\b|welpe|haustier|tierheim|miau/.test(t)) return 'pet';
  if (/kochabend|gekocht|kochen|rezept|pizza|mensa|lasagne|gebacken|backofen|kuchen/.test(t)) return 'food';
  if (/\bhafen\b|möwe|segel|leuchtturm|fleetbrücke|hafenbecken|hafenfest|fähranleger/.test(t)) return 'harbor';

  if (tags.includes('gaming'))       return 'gaming';
  if (tags.includes('musik'))        return 'music';
  if (tags.includes('klima'))        return 'earth';
  if (tags.includes('verschwoerung'))return 'eye';
  if (tags.includes('wissenschaft')) return 'science';
  if (tags.includes('feminismus') || tags.includes('anti-feminismus')) return 'protest';
  if (tags.includes('politik-rechts') || tags.includes('politik-links') || tags.includes('politik-mitte')) return 'ballot';
  if (tags.includes('true-crime'))   return 'news';
  if (tags.includes('sport'))        return 'sport';
  if (tags.includes('humor'))        return 'speech';
  if (tags.includes('lifestyle'))    return 'phone';
  return 'default';
}

// Dezente Hintergrund-Ebenen: Licht-Blobs, Punktraster, Streifen, Sterne.
function buildDeco(C, rnd, pid) {
  let out = '';
  const a = Math.floor(rnd() * 4);
  out += decoLayer(a, C, rnd, pid);
  if (rnd() < 0.55) out += decoLayer((a + 1 + Math.floor(rnd() * 3)) % 4, C, rnd, pid);
  return out;
}

function decoLayer(kind, C, rnd, pid) {
  const j = (lo, hi) => lo + rnd() * (hi - lo);
  let s = '';
  if (kind === 0) { // weiche Licht-Blobs
    for (let i = 0; i < 2; i++) {
      s += `<circle cx="${N(j(12, 188))}" cy="${N(j(10, 115))}" r="${N(j(22, 46))}" fill="url(#gl-${pid})" opacity="${N(j(0.5, 0.9))}"/>`;
    }
    return s;
  }
  if (kind === 1) { // Punktraster in einer Ecke
    const ox = rnd() < 0.5 ? j(10, 26) : j(146, 160), oy = rnd() < 0.5 ? j(10, 20) : j(88, 98);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
      s += `<circle cx="${N(ox + c * 9)}" cy="${N(oy + r * 9)}" r="1.3" fill="${C.tone}" opacity="0.3"/>`;
    }
    return s;
  }
  if (kind === 2) { // diagonale Lichtstreifen
    for (let i = 0; i < 2; i++) {
      const x = j(-20, 150);
      s += `<path d="M ${N(x)} 135 L ${N(x + j(40, 90))} -10" stroke="${C.lite}" stroke-width="${N(j(10, 26))}" opacity="${N(j(0.05, 0.1))}"/>`;
    }
    return s;
  }
  // Mini-Sterne im oberen Bereich
  for (let i = 0; i < 3; i++) {
    const x = j(14, 186), y = j(10, 56), r = j(2, 4), k = r * 0.35;
    s += `<path d="M ${N(x)} ${N(y - r)} L ${N(x + k)} ${N(y - k)} L ${N(x + r)} ${N(y)} L ${N(x + k)} ${N(y + k)} L ${N(x)} ${N(y + r)} L ${N(x - k)} ${N(y + k)} L ${N(x - r)} ${N(y)} L ${N(x - k)} ${N(y - k)} Z" fill="${C.tone}" opacity="${N(j(0.25, 0.5))}"/>`;
  }
  return s;
}

// Rahmen-Look: randlos · feine Doppellinie · Foto/Sticker-Kante.
function buildFrame(C, rnd) {
  const f = Math.floor(rnd() * 3);
  if (f === 0) return '';
  if (f === 1) {
    return `<rect x="4.5" y="4.5" width="191" height="116" fill="none" stroke="${C.tone}" stroke-width="1" opacity="0.45"/><rect x="8.5" y="8.5" width="183" height="108" fill="none" stroke="${C.tone}" stroke-width="0.6" opacity="0.25"/>`;
  }
  return `<rect x="5" y="5" width="190" height="115" rx="10" fill="none" stroke="${C.lite}" stroke-width="2.6" opacity="0.85"/><circle cx="185" cy="15" r="3" fill="${C.acc}" opacity="0.9"/>`;
}

// Motiv-Szenen: je Motiv 2–3 Kompositions-Varianten, seed-gewählt.
function renderMotif(m, C, rnd, pid) {
  const { fg, tone, deep, acc, lite } = C;
  const V = (n) => Math.floor(rnd() * n);
  const j = (lo, hi) => lo + rnd() * (hi - lo);
  // kleine Wiederverwendungs-Helfer
  const star4 = (x, y, r, fill, op) => {
    const k = r * 0.32;
    return `<path d="M ${N(x)} ${N(y - r)} L ${N(x + k)} ${N(y - k)} L ${N(x + r)} ${N(y)} L ${N(x + k)} ${N(y + k)} L ${N(x)} ${N(y + r)} L ${N(x - k)} ${N(y + k)} L ${N(x - r)} ${N(y)} L ${N(x - k)} ${N(y - k)} Z" fill="${fill}" opacity="${N(op)}"/>`;
  };
  const heart = (x, y, s, fill, op) => `<path d="M ${N(x)} ${N(y + s * 0.7)} C ${N(x - s)} ${N(y - s * 0.1)} ${N(x - s * 0.5)} ${N(y - s * 0.9)} ${N(x)} ${N(y - s * 0.25)} C ${N(x + s * 0.5)} ${N(y - s * 0.9)} ${N(x + s)} ${N(y - s * 0.1)} ${N(x)} ${N(y + s * 0.7)} Z" fill="${fill}" opacity="${N(op)}"/>`;
  const gull = (x, y, s) => `<path d="M ${N(x - s)} ${N(y)} Q ${N(x - s / 2)} ${N(y - s * 0.8)} ${N(x)} ${N(y)} Q ${N(x + s / 2)} ${N(y - s * 0.8)} ${N(x + s)} ${N(y)}" fill="none" stroke="${lite}" stroke-width="1.6" stroke-linecap="round" opacity="0.8"/>`;
  const steam = (x, y) => `<path d="M ${N(x)} ${N(y)} q ${N(j(-4, -2))} -7 0 -13 q ${N(j(2, 4))} -6 0 -12" fill="none" stroke="${lite}" stroke-width="2" stroke-linecap="round" opacity="${N(j(0.5, 0.8))}"/>`;
  const shadow = (cx, cy, rx) => `<ellipse cx="${N(cx)}" cy="${N(cy)}" rx="${N(rx)}" ry="4" fill="${deep}" opacity="0.4"/>`;
  const trophy = () => shadow(100, 104, 34)
    + `<path d="M 80 32 h 40 v 18 q 0 18 -20 18 q -20 0 -20 -18 z" fill="${tone}" stroke="${fg}" stroke-width="2.5"/>
    <path d="M 80 38 q -15 2 -11 14 q 3 9 13 8 M 120 38 q 15 2 11 14 q -3 9 -13 8" fill="none" stroke="${fg}" stroke-width="2.5"/>
    <rect x="95" y="68" width="10" height="11" fill="${fg}"/>
    <rect x="84" y="79" width="32" height="9" rx="2" fill="${fg}"/>
    <rect x="78" y="88" width="44" height="10" rx="3" fill="${tone}" stroke="${fg}" stroke-width="2"/>`;

  switch (m) {
    case 'coffee': {
      const v = V(3);
      if (v === 0) { // Tasse mit Untertasse und Dampf
        const x = j(88, 100);
        return shadow(x, 104, 46)
          + `<path d="M ${N(x - 32)} 52 h 64 v 30 q 0 16 -16 16 h -32 q -16 0 -16 -16 z" fill="${tone}" stroke="${fg}" stroke-width="2.5"/>
          <path d="M ${N(x + 32)} 58 q 16 1 16 12 q 0 11 -17 11" fill="none" stroke="${fg}" stroke-width="2.5"/>
          <ellipse cx="${N(x)}" cy="52" rx="32" ry="5" fill="${lite}"/>
          <ellipse cx="${N(x)}" cy="52" rx="24" ry="3.4" fill="${deep}"/>`
          + steam(x - 12, 42) + steam(x + 2, 40) + steam(x + 14, 42);
      }
      if (v === 1) { // To-go-Becher
        return shadow(100, 108, 30)
          + `<path d="M 83 45 L 117 45 L 112 105 L 88 105 Z" fill="${tone}" stroke="${fg}" stroke-width="2.5"/>
          <rect x="79" y="36" width="42" height="10" rx="3.5" fill="${fg}"/>
          <rect x="92" y="30" width="16" height="7" rx="2.5" fill="${fg}"/>
          <path d="M 84.5 63 L 115.5 63 L 113.8 84 L 86.2 84 Z" fill="${acc}" opacity="0.9"/>`
          + heart(100, 73, 7, lite, 0.95) + steam(100, 27);
      }
      // Kanne-Perspektive: Tasse von oben
      return `<circle cx="97" cy="64" r="40" fill="${lite}" opacity="0.9"/>
        <circle cx="97" cy="64" r="29" fill="${tone}" stroke="${fg}" stroke-width="2.5"/>
        <circle cx="97" cy="64" r="21" fill="${deep}"/>
        <path d="M 86 64 q 11 ${N(j(-10, -7))} 22 0 q -11 ${N(j(7, 10))} -22 0" fill="${acc}" opacity="0.55"/>
        <circle cx="${N(j(135, 139))}" cy="64" r="9" fill="none" stroke="${fg}" stroke-width="6"/>`
        + star4(j(40, 60), j(26, 42), 3.5, lite, 0.8);
    }
    case 'robot': {
      const v = V(3);
      if (v === 0) { // klassischer Kopf-Körper-Roboter
        const e = j(4, 6);
        return `<rect x="70" y="40" width="60" height="50" rx="${N(j(6, 14))}" fill="${tone}" stroke="${fg}" stroke-width="2.5"/>
          <circle cx="85" cy="58" r="${N(e)}" fill="${fg}"/><circle cx="115" cy="58" r="${N(e)}" fill="${fg}"/>
          <circle cx="86.5" cy="56.5" r="1.5" fill="${lite}"/><circle cx="116.5" cy="56.5" r="1.5" fill="${lite}"/>
          <rect x="88" y="73" width="24" height="5" rx="2.5" fill="${acc}"/>
          <line x1="100" y1="30" x2="100" y2="40" stroke="${fg}" stroke-width="2.5"/>
          <circle cx="100" cy="26" r="3.5" fill="${acc}"/>
          <rect x="54" y="52" width="16" height="7" rx="3" fill="${tone}" stroke="${fg}" stroke-width="2"/>
          <rect x="130" y="52" width="16" height="7" rx="3" fill="${tone}" stroke="${fg}" stroke-width="2"/>
          <rect x="82" y="92" width="10" height="13" rx="2" fill="${tone}" stroke="${fg}" stroke-width="2"/>
          <rect x="108" y="92" width="10" height="13" rx="2" fill="${tone}" stroke="${fg}" stroke-width="2"/>`;
      }
      if (v === 1) { // winkender Projekt-Roboterarm
        return shadow(92, 110, 40)
          + `<rect x="58" y="94" width="52" height="12" rx="4" fill="${tone}" stroke="${fg}" stroke-width="2.5"/>
          <line x1="84" y1="94" x2="96" y2="66" stroke="${fg}" stroke-width="5" stroke-linecap="round"/>
          <line x1="96" y1="66" x2="124" y2="52" stroke="${fg}" stroke-width="5" stroke-linecap="round"/>
          <circle cx="84" cy="94" r="5" fill="${acc}"/><circle cx="96" cy="66" r="5" fill="${acc}"/>
          <path d="M 124 52 l 10 -8 M 124 52 l 12 2" stroke="${fg}" stroke-width="4" stroke-linecap="round"/>
          <path d="M 138 34 q 6 6 4 14 M 146 30 q 8 8 6 19" fill="none" stroke="${lite}" stroke-width="2" stroke-linecap="round" opacity="0.7"/>`;
      }
      // Bot in Sprechblase
      return `<path d="M 52 26 h 96 q 14 0 14 14 v 38 q 0 14 -14 14 h -56 l -16 14 l 4 -14 h -14 q -14 0 -14 -14 v -38 q 0 -14 14 -14 z" fill="${tone}" stroke="${fg}" stroke-width="2.5"/>
        <rect x="80" y="44" width="40" height="30" rx="8" fill="${deep}"/>
        <circle cx="92" cy="58" r="4" fill="${acc}"/><circle cx="108" cy="58" r="4" fill="${acc}"/>
        <line x1="100" y1="36" x2="100" y2="44" stroke="${fg}" stroke-width="2.5"/><circle cx="100" cy="33" r="2.5" fill="${fg}"/>`;
    }
    case 'bike': {
      const v = V(2);
      if (v === 0) { // Fahrrad seitlich
        const r = j(17, 21);
        return shadow(100, 108, 60)
          + `<circle cx="62" cy="85" r="${N(r)}" fill="none" stroke="${fg}" stroke-width="3"/>
          <circle cx="138" cy="85" r="${N(r)}" fill="none" stroke="${fg}" stroke-width="3"/>
          <circle cx="62" cy="85" r="3.5" fill="${acc}"/><circle cx="138" cy="85" r="3.5" fill="${acc}"/>
          <path d="M 62 85 L 100 55 L 138 85 M 100 55 L 86 85 M 62 85 L 86 85 M 138 85 L 126 50 M 122 48 L 136 48 M 90 48 L 108 48" stroke="${fg}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
      }
      // Radweg-Schild
      return `<line x1="100" y1="80" x2="100" y2="112" stroke="${tone}" stroke-width="4"/>
        <rect x="68" y="18" width="64" height="64" rx="12" fill="${fg}" stroke="${lite}" stroke-width="2.5"/>
        <circle cx="86" cy="62" r="9" fill="none" stroke="${lite}" stroke-width="2.5"/>
        <circle cx="114" cy="62" r="9" fill="none" stroke="${lite}" stroke-width="2.5"/>
        <path d="M 86 62 L 96 44 L 108 44 L 114 62 M 96 44 L 104 62" stroke="${lite}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <path d="M 24 112 H 176" stroke="${tone}" stroke-width="2.5" stroke-dasharray="10 8" opacity="0.7"/>`;
    }
    case 'weather': {
      const v = V(3);
      if (v === 0) { // Wolke und Regen
        let rain = '';
        for (let i = 0; i < 5; i++) {
          rain += `<line x1="${N(72 + i * 15)}" y1="${N(j(62, 66))}" x2="${N(66 + i * 15)}" y2="${N(j(80, 92))}" stroke="${acc}" stroke-width="2.5" stroke-linecap="round" opacity="0.85"/>`;
        }
        return `<circle cx="82" cy="44" r="17" fill="${tone}"/><circle cx="104" cy="38" r="21" fill="${tone}"/><circle cx="124" cy="46" r="15" fill="${tone}"/>
          <rect x="68" y="44" width="70" height="14" rx="7" fill="${tone}"/>` + rain;
      }
      if (v === 1) { // Mondsichel und Sterne
        const mx = j(112, 130), my = j(46, 56);
        return star4(j(40, 70), j(22, 42), j(2.5, 4), lite, 0.9)
          + star4(j(44, 80), j(56, 76), j(2, 3.5), tone, 0.8)
          + star4(j(150, 176), j(78, 96), j(2, 3.5), lite, 0.7)
          + `<circle cx="${N(mx)}" cy="${N(my)}" r="26" fill="${lite}"/>
          <circle cx="${N(mx + 11)}" cy="${N(my - 7)}" r="23" fill="${deep}"/>
          <circle cx="${N(mx - 11)}" cy="${N(my + 8)}" r="3" fill="${tone}" opacity="0.7"/>
          <circle cx="${N(mx - 3)}" cy="${N(my + 16)}" r="2" fill="${tone}" opacity="0.6"/>`;
      }
      // Gewitter
      return `<circle cx="84" cy="42" r="18" fill="${tone}"/><circle cx="108" cy="36" r="22" fill="${tone}"/><circle cx="128" cy="44" r="15" fill="${tone}"/>
        <rect x="70" y="42" width="72" height="14" rx="7" fill="${tone}"/>
        <path d="M ${N(j(98, 106))} 58 L 88 78 L 100 78 L 90 102 L 116 74 L 103 74 L 112 58 Z" fill="${acc}"/>
        <line x1="70" y1="64" x2="62" y2="80" stroke="${fg}" stroke-width="2.5" stroke-linecap="round" opacity="0.8"/>
        <line x1="138" y1="64" x2="130" y2="80" stroke="${fg}" stroke-width="2.5" stroke-linecap="round" opacity="0.8"/>`;
    }
    case 'music': {
      const v = V(3);
      if (v === 0) { // Doppelnote mit Klangwellen
        const y = j(74, 84);
        return `<circle cx="68" cy="${N(y)}" r="9" fill="${fg}"/><circle cx="126" cy="${N(y - 10)}" r="9" fill="${fg}"/>
          <path d="M 76 ${N(y)} L 76 32 Q 105 22 134 24 L 134 ${N(y - 10)} M 76 42 Q 105 32 134 34" stroke="${fg}" stroke-width="4" fill="none"/>
          <path d="M 30 ${N(j(58, 76))} q 8 -12 16 0 q 8 12 16 0" fill="none" stroke="${tone}" stroke-width="2.5" stroke-linecap="round" opacity="0.8"/>
          <path d="M 146 ${N(j(82, 96))} q 7 -10 14 0 q 7 10 14 0" fill="none" stroke="${tone}" stroke-width="2.5" stroke-linecap="round" opacity="0.8"/>`
          + star4(j(150, 172), j(28, 44), 3, lite, 0.8);
      }
      if (v === 1) { // Vinyl mit Tonarm
        return `<circle cx="94" cy="63" r="42" fill="${deep}" stroke="${fg}" stroke-width="2.5"/>
          <circle cx="94" cy="63" r="32" fill="none" stroke="${tone}" stroke-width="1" opacity="0.4"/>
          <circle cx="94" cy="63" r="24" fill="none" stroke="${tone}" stroke-width="1" opacity="0.3"/>
          <circle cx="94" cy="63" r="13" fill="${acc}"/>
          <circle cx="94" cy="63" r="3" fill="${deep}"/>
          <line x1="162" y1="22" x2="136" y2="50" stroke="${tone}" stroke-width="3" stroke-linecap="round"/>
          <circle cx="164" cy="20" r="6" fill="${tone}"/>
          <circle cx="136" cy="52" r="4" fill="${fg}"/>`;
      }
      // Equalizer
      let bars = '';
      for (let i = 0; i < 7; i++) {
        const h = j(16, 56);
        bars += `<rect x="${N(48 + i * 16)}" y="${N(98 - h)}" width="10" height="${N(h)}" rx="4" fill="${i % 2 ? tone : fg}" opacity="${i % 2 ? '0.85' : '1'}"/>`;
      }
      return bars + `<line x1="42" y1="103" x2="162" y2="103" stroke="${tone}" stroke-width="2" opacity="0.6"/>`
        + star4(j(160, 176), j(22, 36), 3.5, lite, 0.85);
    }
    case 'book': {
      const v = V(2);
      if (v === 0) { // aufgeschlagenes Buch
        let lines = '';
        for (let i = 0; i < 4; i++) {
          lines += `<line x1="60" y1="${N(54 + i * 8)}" x2="${N(j(84, 92))}" y2="${N(54 + i * 8)}" stroke="${fg}" stroke-width="1.2" opacity="0.55"/><line x1="110" y1="${N(54 + i * 8)}" x2="${N(j(134, 142))}" y2="${N(54 + i * 8)}" stroke="${fg}" stroke-width="1.2" opacity="0.55"/>`;
        }
        return `<path d="M 100 40 Q 72 33 50 40 L 50 96 Q 72 89 100 96 Q 128 89 150 96 L 150 40 Q 128 33 100 40 Z" fill="${tone}" stroke="${fg}" stroke-width="2.5"/>
          <path d="M 100 40 L 100 96" stroke="${fg}" stroke-width="2"/>` + lines
          + star4(j(152, 170), j(22, 36), 3.5, lite, 0.9);
      }
      // Bücherstapel mit Lesezeichen
      const cols = [fg, acc, tone, fg];
      let stack = '', yy = 98;
      for (let i = 0; i < 4; i++) {
        const h = j(11, 15), w = j(76, 96), x = 100 - w / 2 + j(-5, 5);
        yy -= h;
        stack += `<rect x="${N(x)}" y="${N(yy)}" width="${N(w)}" height="${N(h)}" rx="2.5" fill="${cols[i]}" opacity="${N(0.75 + i * 0.08)}" stroke="${deep}" stroke-width="1"/>`;
      }
      return shadow(100, 102, 52) + stack
        + `<rect x="${N(j(88, 108))}" y="${N(yy - 7)}" width="5" height="13" fill="${lite}" opacity="0.9"/>`
        + star4(j(142, 162), j(26, 40), 3, lite, 0.8);
    }
    case 'deepfake': {
      const v = V(2);
      if (v === 0) { // Live-Stream mit Glitch
        return `<rect x="55" y="28" width="90" height="72" rx="4" fill="${tone}" stroke="${fg}" stroke-width="2.5"/>
          <circle cx="100" cy="58" r="17" fill="${fg}" opacity="0.6"/>
          <path d="M 74 88 q 26 -16 52 0" fill="none" stroke="${fg}" stroke-width="2.5"/>
          <text x="64" y="24" font-family="sans-serif" font-weight="900" font-size="10" fill="${fg}">&#9888; LIVE</text>
          <rect x="100" y="${N(j(42, 48))}" width="45" height="6" fill="${acc}" opacity="0.5"/>
          <rect x="55" y="${N(j(64, 70))}" width="40" height="5" fill="${acc}" opacity="0.45"/>
          <rect x="108" y="78" width="37" height="4" fill="${deep}" opacity="0.5"/>
          <path d="M 100 52 l -5 5 l 5 5 l 5 -5 z" fill="${deep}"/>`;
      }
      // Doppel-Gesicht mit Versatz
      return `<circle cx="92" cy="60" r="30" fill="${tone}"/>
        <path d="M 104 30 A 30 30 0 0 1 104 90 Z" fill="${acc}" transform="translate(${N(j(4, 9))} ${N(j(-4, 2))})" opacity="0.85"/>
        <circle cx="82" cy="54" r="3.5" fill="${deep}"/>
        <rect x="106" y="${N(j(50, 56))}" width="14" height="3.5" fill="${deep}" opacity="0.8"/>
        <path d="M 80 72 q 8 5 16 1" stroke="${deep}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <line x1="46" y1="${N(j(36, 44))}" x2="156" y2="${N(j(36, 44))}" stroke="${lite}" stroke-width="1.5" opacity="0.5"/>
        <line x1="46" y1="${N(j(76, 86))}" x2="156" y2="${N(j(76, 86))}" stroke="${lite}" stroke-width="1.5" opacity="0.5"/>`;
    }
    case 'ballot': {
      const v = V(3);
      if (v === 0) { // Wahlurne
        return shadow(100, 108, 50)
          + `<rect x="55" y="46" width="90" height="56" rx="3" fill="${tone}" stroke="${fg}" stroke-width="2.5"/>
          <line x1="55" y1="57" x2="145" y2="57" stroke="${fg}" stroke-width="1.5"/>
          <rect x="86" y="26" width="28" height="24" rx="2" fill="${fg}" transform="rotate(${N(j(-8, 8))} 100 38)"/>
          <line x1="100" y1="31" x2="100" y2="50" stroke="${lite}" stroke-width="2.5"/>
          <line x1="70" y1="70" x2="116" y2="70" stroke="${fg}" stroke-width="1.2" opacity="0.7"/>
          <line x1="70" y1="80" x2="116" y2="80" stroke="${fg}" stroke-width="1.2" opacity="0.7"/>
          <line x1="70" y1="90" x2="116" y2="90" stroke="${fg}" stroke-width="1.2" opacity="0.7"/>
          <path d="M 122 68 l 5 5 l 11 -15" stroke="${acc}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
      }
      if (v === 1) { // Stimmzettel mit Kreuz
        return `<g transform="rotate(${N(j(-6, 6))} 100 62)">
          <rect x="62" y="22" width="76" height="84" rx="3" fill="${lite}" stroke="${fg}" stroke-width="2"/>
          <line x1="72" y1="38" x2="110" y2="38" stroke="${deep}" stroke-width="2" opacity="0.7"/>
          <circle cx="124" cy="38" r="6" fill="none" stroke="${deep}" stroke-width="1.5"/>
          <line x1="72" y1="60" x2="110" y2="60" stroke="${deep}" stroke-width="2" opacity="0.7"/>
          <circle cx="124" cy="60" r="6" fill="none" stroke="${fg}" stroke-width="1.5"/>
          <path d="M 120 56 l 8 8 m 0 -8 l -8 8" stroke="${acc}" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="72" y1="82" x2="110" y2="82" stroke="${deep}" stroke-width="2" opacity="0.7"/>
          <circle cx="124" cy="82" r="6" fill="none" stroke="${deep}" stroke-width="1.5"/>
        </g>`;
      }
      // Ergebnis-Balken
      const ws = [j(70, 110), j(45, 80), j(25, 55)];
      const cs = [fg, acc, tone];
      let bars = '';
      for (let i = 0; i < 3; i++) {
        bars += `<rect x="48" y="${N(36 + i * 22)}" width="${N(ws[i])}" height="13" rx="6.5" fill="${cs[i]}" opacity="${i === 0 ? '1' : '0.8'}"/><circle cx="40" cy="${N(42.5 + i * 22)}" r="4" fill="${cs[i]}" opacity="0.9"/>`;
      }
      return bars + `<line x1="48" y1="30" x2="48" y2="98" stroke="${tone}" stroke-width="2" opacity="0.6"/>`
        + star4(48 + ws[0], 42.5, 4.5, lite, 0.95);
    }
    case 'protest': {
      const v = V(2);
      if (v === 0) { // zwei Demo-Schilder
        return `<g transform="rotate(${N(j(-6, -2))} 52 60)">
          <rect x="28" y="30" width="48" height="34" rx="3" fill="${tone}" stroke="${fg}" stroke-width="2.5"/>
          <line x1="52" y1="64" x2="52" y2="108" stroke="${fg}" stroke-width="3.5"/>
          <text x="52" y="52" font-family="sans-serif" font-weight="900" font-size="13" fill="${deep}" text-anchor="middle">JETZT</text>
        </g>
        <g transform="rotate(${N(j(2, 6))} 122 56)">
          <rect x="92" y="20" width="62" height="30" rx="3" fill="${fg}" stroke="${tone}" stroke-width="2"/>
          <line x1="122" y1="50" x2="122" y2="108" stroke="${fg}" stroke-width="3.5"/>
          <text x="123" y="40" font-family="sans-serif" font-weight="900" font-size="11" fill="${lite}" text-anchor="middle">GENUG</text>
        </g>`
          + star4(j(160, 180), j(70, 90), 3.5, tone, 0.7);
      }
      // Megafon mit Schallwellen
      return `<path d="M 56 56 L 96 40 L 96 84 L 56 68 Z" fill="${fg}"/>
        <rect x="42" y="54" width="16" height="16" rx="3" fill="${tone}" stroke="${fg}" stroke-width="2"/>
        <line x1="66" y1="70" x2="62" y2="92" stroke="${fg}" stroke-width="4" stroke-linecap="round"/>
        <path d="M 108 48 q 10 14 0 28 M 120 42 q 16 20 0 40 M 132 36 q 22 26 0 52" fill="none" stroke="${tone}" stroke-width="2.5" stroke-linecap="round" opacity="0.85"/>`
        + star4(j(152, 172), j(26, 40), j(3, 4.5), lite, 0.85);
    }
    case 'gaming': {
      const v = V(3);
      if (v === 0) { // Controller
        return `<rect x="38" y="48" width="124" height="52" rx="22" fill="${tone}" stroke="${fg}" stroke-width="2.5"/>
          <circle cx="64" cy="74" r="13" fill="${deep}" opacity="0.25"/>
          <path d="M 56 74 h 16 M 64 66 v 16" stroke="${fg}" stroke-width="3.5" stroke-linecap="round"/>
          <circle cx="136" cy="66" r="4.5" fill="${acc}"/><circle cx="148" cy="76" r="4.5" fill="${fg}"/>
          <circle cx="124" cy="76" r="4.5" fill="${fg}"/><circle cx="136" cy="86" r="4.5" fill="${acc}"/>
          <rect x="92" y="58" width="16" height="5" rx="2.5" fill="${fg}" opacity="0.6"/>`;
      }
      if (v === 1) { // Pixel-Sprite, symmetrisch seed-generiert
        const px = 10, ox = 100 - 3 * px, oy = 30;
        let cells = '';
        for (let r = 0; r < 5; r++) {
          for (let c = 0; c < 3; c++) {
            if (rnd() < 0.55) {
              const col = r < 2 ? acc : fg;
              cells += `<rect x="${N(ox + c * px)}" y="${N(oy + r * px)}" width="9" height="9" fill="${col}"/><rect x="${N(ox + (5 - c) * px)}" y="${N(oy + r * px)}" width="9" height="9" fill="${col}"/>`;
            }
          }
        }
        return cells + `<line x1="58" y1="94" x2="142" y2="94" stroke="${tone}" stroke-width="2.5" opacity="0.6"/>
          <rect x="97" y="100" width="6" height="10" fill="${tone}" opacity="0.8"/>`;
      }
      // Pokal (Ranked / Turnier)
      return trophy()
        + star4(100, 22, 5, lite, 0.95) + star4(j(58, 72), j(30, 44), 3, lite, 0.8) + star4(j(128, 144), j(28, 46), 3, lite, 0.8);
    }
    case 'science': {
      const v = V(3);
      if (v === 0) { // Atom
        const rot = j(0, 60);
        return `<circle cx="100" cy="62" r="10" fill="${fg}"/>
          <ellipse cx="100" cy="62" rx="46" ry="16" fill="none" stroke="${fg}" stroke-width="2.5" transform="rotate(${N(rot)} 100 62)"/>
          <ellipse cx="100" cy="62" rx="46" ry="16" fill="none" stroke="${tone}" stroke-width="2.5" transform="rotate(${N(rot + 60)} 100 62)"/>
          <ellipse cx="100" cy="62" rx="46" ry="16" fill="none" stroke="${acc}" stroke-width="2.5" transform="rotate(${N(rot + 120)} 100 62)"/>
          <circle cx="146" cy="62" r="3.5" fill="${tone}"/><circle cx="77" cy="86" r="3.5" fill="${acc}"/><circle cx="80" cy="38" r="3.5" fill="${lite}"/>`;
      }
      if (v === 1) { // Erlenmeyerkolben mit Blasen
        return shadow(100, 108, 34)
          + `<path d="M 92 30 h 16 v 24 l 22 40 q 4 10 -6 10 h -48 q -10 0 -6 -10 l 22 -40 z" fill="${tone}" stroke="${fg}" stroke-width="2.5"/>
          <path d="M 77.7 80 H 122.3 L 130 94 q 4 10 -6 10 h -48 q -10 0 -6 -10 z" fill="${acc}" opacity="0.85"/>
          <circle cx="${N(j(88, 96))}" cy="${N(j(86, 94))}" r="3" fill="${lite}" opacity="0.9"/>
          <circle cx="${N(j(102, 112))}" cy="${N(j(88, 96))}" r="2" fill="${lite}" opacity="0.8"/>
          <circle cx="${N(j(94, 106))}" cy="${N(j(64, 74))}" r="2.5" fill="${acc}" opacity="0.7"/>
          <rect x="88" y="26" width="24" height="6" rx="3" fill="${fg}"/>`;
      }
      // Teleskop und Mond
      const mx2 = j(140, 156), my2 = j(28, 40);
      return star4(j(40, 60), j(20, 36), 3, lite, 0.9) + star4(j(66, 88), j(14, 28), 2.5, tone, 0.8) + star4(j(36, 56), j(54, 72), 3, tone, 0.7)
        + `<circle cx="${N(mx2)}" cy="${N(my2)}" r="12" fill="${lite}" opacity="0.95"/>
        <circle cx="${N(mx2 - 4)}" cy="${N(my2 + 3)}" r="2.5" fill="${tone}" opacity="0.7"/>
        <rect x="58" y="52" width="56" height="16" rx="5" fill="${fg}" transform="rotate(-28 86 60)"/>
        <rect x="106" y="40" width="14" height="20" rx="4" fill="${acc}" transform="rotate(-28 113 50)"/>
        <line x1="86" y1="72" x2="70" y2="106" stroke="${tone}" stroke-width="3" stroke-linecap="round"/>
        <line x1="86" y1="72" x2="102" y2="106" stroke="${tone}" stroke-width="3" stroke-linecap="round"/>`;
    }
    case 'earth': {
      const v = V(2);
      if (v === 0) { // Globus
        return `<circle cx="100" cy="62" r="38" fill="${tone}"/>
          <path d="M 72 55 q 8 -7 17 -1 q 7 8 -3 13 q -11 3 -14 -6 z" fill="${fg}" opacity="0.8"/>
          <path d="M 104 72 q 13 -5 23 3 q 4 10 -8 13 q -16 1 -15 -9 z" fill="${fg}" opacity="0.8"/>
          <path d="M 94 36 q 8 -4 14 2 q -2 6 -10 4 z" fill="${fg}" opacity="0.7"/>
          <circle cx="100" cy="62" r="38" fill="none" stroke="${fg}" stroke-width="2.5"/>
          <path d="M 100 24 A 38 38 0 0 1 138 62" fill="none" stroke="${lite}" stroke-width="3" opacity="0.5"/>`
          + star4(j(40, 56), j(24, 40), 3, lite, 0.8) + star4(j(150, 168), j(80, 96), 3, tone, 0.7);
      }
      // Setzling mit Sonne
      const sx = j(146, 164), sy = j(26, 38);
      return `<path d="M 40 100 q 60 -16 120 0 l 0 12 l -120 0 z" fill="${deep}" opacity="0.7"/>
        <path d="M 100 98 q -2 -18 0 -30" stroke="${fg}" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path d="M 100 76 q -18 -2 -22 -18 q 18 -2 22 18 z" fill="${fg}"/>
        <path d="M 100 70 q 16 -4 18 -20 q -18 0 -18 20 z" fill="${acc}"/>
        <circle cx="${N(sx)}" cy="${N(sy)}" r="11" fill="${lite}" opacity="0.95"/>
        <path d="M ${N(sx - 19)} ${N(sy)} h 5 M ${N(sx + 14)} ${N(sy)} h 5 M ${N(sx)} ${N(sy - 19)} v 5 M ${N(sx)} ${N(sy + 14)} v 5" stroke="${lite}" stroke-width="2" stroke-linecap="round" opacity="0.8"/>`;
    }
    case 'eye': {
      const v = V(2);
      if (v === 0) { // Auge (symbolisch)
        const ir = j(16, 21);
        return `<path d="M 45 62 Q 100 ${N(j(24, 32))} 155 62 Q 100 ${N(j(92, 100))} 45 62 Z" fill="${tone}" stroke="${fg}" stroke-width="2.5"/>
          <circle cx="100" cy="62" r="${N(ir)}" fill="${fg}"/>
          <circle cx="100" cy="62" r="${N(ir * 0.45)}" fill="${deep}"/>
          <circle cx="95" cy="57" r="3" fill="${lite}"/>
          <path d="M 35 80 l 10 -10 M 165 80 l -10 -10 M 35 44 l 10 10 M 165 44 l -10 10" stroke="${fg}" stroke-width="2" opacity="0.7"/>`;
      }
      // Lupe über Dokument (Recherche, symbolisch)
      const lx = j(106, 124), ly = j(54, 66);
      return `<rect x="48" y="30" width="104" height="66" rx="4" fill="${tone}" opacity="0.95"/>
        <line x1="58" y1="44" x2="142" y2="44" stroke="${deep}" stroke-width="2" opacity="0.55"/>
        <line x1="58" y1="56" x2="136" y2="56" stroke="${deep}" stroke-width="2" opacity="0.55"/>
        <line x1="58" y1="68" x2="142" y2="68" stroke="${deep}" stroke-width="2" opacity="0.55"/>
        <line x1="58" y1="80" x2="124" y2="80" stroke="${deep}" stroke-width="2" opacity="0.55"/>
        <circle cx="${N(lx)}" cy="${N(ly)}" r="20" fill="${lite}" opacity="0.35"/>
        <circle cx="${N(lx)}" cy="${N(ly)}" r="20" fill="none" stroke="${fg}" stroke-width="3.5"/>
        <line x1="${N(lx + 14)}" y1="${N(ly + 14)}" x2="${N(lx + 30)}" y2="${N(ly + 30)}" stroke="${fg}" stroke-width="5" stroke-linecap="round"/>`;
    }
    case 'phone': {
      const v = V(3);
      if (v === 0) { // Feed-Karten auf dem Display
        let cards = '';
        for (let i = 0; i < 3; i++) {
          const y = 32 + i * 22;
          cards += `<rect x="83" y="${N(y)}" width="34" height="18" rx="3" fill="${tone}" opacity="0.92"/><circle cx="89" cy="${N(y + 5.5)}" r="2.5" fill="${acc}"/><line x1="94" y1="${N(y + 5)}" x2="${N(j(104, 112))}" y2="${N(y + 5)}" stroke="${deep}" stroke-width="1.6" opacity="0.7"/><line x1="87" y1="${N(y + 11)}" x2="${N(j(100, 112))}" y2="${N(y + 11)}" stroke="${deep}" stroke-width="1.4" opacity="0.5"/>`;
        }
        return `<rect x="75" y="16" width="50" height="94" rx="10" fill="${fg}"/>
          <rect x="80" y="24" width="40" height="76" rx="4" fill="${deep}"/>` + cards
          + `<circle cx="100" cy="105" r="2.5" fill="${tone}"/>`;
      }
      if (v === 1) { // Like-Flut
        let hearts = '';
        for (let i = 0; i < 5; i++) {
          hearts += heart(j(118, 162), j(20, 86), j(4, 9), i % 2 ? acc : lite, j(0.55, 0.95));
        }
        return `<rect x="58" y="22" width="48" height="90" rx="9" fill="${fg}" transform="rotate(-6 82 67)"/>
          <rect x="63" y="30" width="38" height="73" rx="4" fill="${deep}" transform="rotate(-6 82 67)"/>`
          + heart(82, 64, 10, lite, 1) + hearts;
      }
      // Doomscroll-Stapel
      return `<rect x="70" y="38" width="60" height="78" rx="7" fill="${deep}" opacity="0.45" transform="rotate(8 100 77)"/>
        <rect x="70" y="30" width="60" height="78" rx="7" fill="${deep}" opacity="0.7" transform="rotate(-5 100 69)"/>
        <rect x="70" y="20" width="60" height="80" rx="7" fill="${tone}" stroke="${fg}" stroke-width="2"/>
        <line x1="80" y1="38" x2="120" y2="38" stroke="${fg}" stroke-width="2.5"/>
        <line x1="80" y1="50" x2="${N(j(106, 118))}" y2="50" stroke="${fg}" stroke-width="1.5" opacity="0.6"/>
        <line x1="80" y1="60" x2="${N(j(104, 118))}" y2="60" stroke="${fg}" stroke-width="1.5" opacity="0.6"/>
        <line x1="80" y1="72" x2="${N(j(100, 116))}" y2="72" stroke="${fg}" stroke-width="1.5" opacity="0.6"/>
        <path d="M 100 84 v 8 m -4 -4 l 4 5 l 4 -5" stroke="${acc}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
    }
    case 'fire': {
      const v = V(2);
      if (v === 0) { // Flamme
        const iy = j(40, 50);
        return `<path d="M 100 18 Q 88 42 82 58 Q 72 52 76 72 Q 62 68 68 88 Q 74 108 100 108 Q 126 108 132 88 Q 138 68 124 72 Q 128 52 118 58 Q 112 42 100 18 Z" fill="${fg}"/>
          <path d="M 100 ${N(iy)} Q 94 60 90 72 Q 84 68 87 80 Q 84 92 100 94 Q 116 92 113 80 Q 116 68 110 72 Q 106 60 100 ${N(iy)} Z" fill="${acc}" opacity="0.9"/>
          <circle cx="100" cy="${N(j(82, 88))}" r="5" fill="${lite}" opacity="0.85"/>`
          + star4(j(46, 66), j(28, 50), 3, tone, 0.7) + star4(j(136, 158), j(34, 56), 3, tone, 0.7);
      }
      // Viral-Kurve mit Flammenspitze
      const y4 = j(26, 38);
      return `<line x1="36" y1="100" x2="170" y2="100" stroke="${tone}" stroke-width="2" opacity="0.6"/>
        <path d="M 40 96 L 70 ${N(j(80, 90))} L 96 ${N(j(70, 82))} L 120 ${N(j(48, 62))} L 148 ${N(y4)}" fill="none" stroke="${fg}" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M ${N(152)} ${N(y4 - 4)} q -8 6 -2 14 q 8 2 8 -6 q 6 -8 -6 -8 z" fill="${acc}"/>`
        + star4(j(50, 80), j(40, 66), 3, tone, 0.7) + star4(j(120, 140), j(24, 40), 3.5, lite, 0.85);
    }
    case 'sport': {
      const v = V(3);
      if (v === 0) { // Fußball
        return shadow(100, 102, 36)
          + `<circle cx="100" cy="62" r="32" fill="${lite}" stroke="${fg}" stroke-width="2.5"/>
          <polygon points="100,46 114,56 109,72 91,72 86,56" fill="${fg}"/>
          <path d="M 100 46 L 100 32 M 86 56 L 72 50 M 114 56 L 128 50 M 91 72 L 83 88 M 109 72 L 117 88" stroke="${fg}" stroke-width="2.5"/>
          <path d="M ${N(j(140, 152))} ${N(j(30, 42))} q 10 2 12 12" stroke="${tone}" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.7"/>`;
      }
      if (v === 1) { // Stoppuhr (Lauf-Training)
        const a = j(0, 6.3);
        return `<line x1="100" y1="26" x2="100" y2="34" stroke="${fg}" stroke-width="4"/>
          <rect x="92" y="20" width="16" height="7" rx="2" fill="${fg}"/>
          <circle cx="100" cy="66" r="33" fill="${tone}" stroke="${fg}" stroke-width="3"/>
          <circle cx="100" cy="66" r="26" fill="${lite}" opacity="0.6"/>
          <path d="M 100 45 v 6 M 100 81 v 6 M 79 66 h 6 M 115 66 h 6" stroke="${deep}" stroke-width="2"/>
          <line x1="100" y1="66" x2="${N(100 + 17 * Math.cos(a))}" y2="${N(66 + 17 * Math.sin(a))}" stroke="${acc}" stroke-width="3" stroke-linecap="round"/>
          <circle cx="100" cy="66" r="3" fill="${acc}"/>
          <path d="M 48 52 h 14 M 42 64 h 14 M 48 76 h 14" stroke="${tone}" stroke-width="2.5" stroke-linecap="round" opacity="0.7"/>`;
      }
      // Pokal mit Konfetti
      let conf = '';
      for (let i = 0; i < 6; i++) {
        const x = j(34, 166), y = j(14, 56);
        conf += `<rect x="${N(x)}" y="${N(y)}" width="5" height="8" rx="1" fill="${[fg, acc, tone, lite][i % 4]}" opacity="0.85" transform="rotate(${N(j(-50, 50))} ${N(x)} ${N(y)})"/>`;
      }
      return trophy() + conf;
    }
    case 'sparkle': {
      const v = V(2);
      if (v === 0) { // Sternen-Komposition
        let s = '';
        const fills = [fg, tone, lite, acc];
        for (let i = 0; i < 5; i++) {
          s += star4(j(24, 176), j(18, 100), j(3, 11), fills[i % 4], j(0.6, 1));
        }
        return s + `<circle cx="${N(j(30, 60))}" cy="${N(j(80, 100))}" r="3" fill="${tone}" opacity="0.8"/><circle cx="${N(j(150, 180))}" cy="${N(j(20, 44))}" r="2.5" fill="${lite}" opacity="0.8"/>`;
      }
      // Wrapped-Geschenk
      return shadow(100, 108, 36)
        + `<rect x="70" y="52" width="60" height="50" rx="5" fill="${fg}"/>
        <rect x="70" y="46" width="60" height="14" rx="4" fill="${acc}"/>
        <rect x="95" y="46" width="10" height="56" fill="${lite}" opacity="0.9"/>
        <path d="M 100 46 q -14 -16 -22 -6 q -2 8 10 8 z M 100 46 q 14 -16 22 -6 q 2 8 -10 8 z" fill="${acc}" stroke="${lite}" stroke-width="1.5"/>`
        + star4(j(48, 64), j(28, 44), 4, lite, 0.9) + star4(j(136, 158), j(22, 40), 5, tone, 0.9) + star4(j(150, 172), j(58, 76), 3, lite, 0.8);
    }
    case 'chart': {
      const v = V(3);
      if (v === 0) { // Balkendiagramm
        let bars = '';
        for (let i = 0; i < 4; i++) {
          const h = j(20, 58);
          bars += `<rect x="${N(56 + i * 26)}" y="${N(100 - h)}" width="17" height="${N(h)}" rx="2.5" fill="${i % 2 ? tone : fg}" opacity="${N(0.7 + (i % 3) * 0.15)}"/>`;
        }
        return `<line x1="44" y1="100" x2="164" y2="100" stroke="${tone}" stroke-width="2.5"/>
          <line x1="44" y1="26" x2="44" y2="100" stroke="${tone}" stroke-width="2.5"/>` + bars;
      }
      if (v === 1) { // Linien-Diagramm
        const ys = [j(78, 90), j(60, 76), j(64, 84), j(40, 56), j(26, 40)];
        let path = `M 52 ${N(ys[0])}`, dots = '';
        for (let i = 1; i < 5; i++) path += ` L ${N(52 + i * 26)} ${N(ys[i])}`;
        for (let i = 0; i < 5; i++) dots += `<circle cx="${N(52 + i * 26)}" cy="${N(ys[i])}" r="3.5" fill="${i === 4 ? acc : tone}"/>`;
        return `<line x1="44" y1="100" x2="164" y2="100" stroke="${tone}" stroke-width="2.5"/>
          <line x1="44" y1="24" x2="44" y2="100" stroke="${tone}" stroke-width="2.5"/>
          <path d="${path}" fill="none" stroke="${fg}" stroke-width="3" stroke-linecap="round"/>` + dots;
      }
      // Donut-Diagramm mit Legende
      const pct = j(0.3, 0.72), circ = 188.5;
      return `<circle cx="88" cy="62" r="30" fill="none" stroke="${tone}" stroke-width="14" opacity="0.5"/>
        <circle cx="88" cy="62" r="30" fill="none" stroke="${fg}" stroke-width="14" stroke-dasharray="${N(pct * circ)} ${N(circ)}" transform="rotate(-90 88 62)"/>
        <circle cx="142" cy="46" r="4" fill="${fg}"/><rect x="150" y="43" width="22" height="6" rx="3" fill="${tone}" opacity="0.7"/>
        <circle cx="142" cy="64" r="4" fill="${tone}"/><rect x="150" y="61" width="15" height="6" rx="3" fill="${tone}" opacity="0.5"/>
        <circle cx="142" cy="82" r="4" fill="${acc}"/><rect x="150" y="79" width="18" height="6" rx="3" fill="${tone}" opacity="0.5"/>`;
    }
    case 'shield': {
      const v = V(2);
      const sh = `M 100 20 L 58 36 L 58 68 Q 58 96 100 110 Q 142 96 142 68 L 142 36 Z`;
      if (v === 0) { // Schild mit Haken
        return `<path d="${sh}" fill="${tone}" stroke="${fg}" stroke-width="2.5"/>
          <path d="M 100 26 L 64 40 L 64 68 Q 64 92 100 104" fill="none" stroke="${lite}" stroke-width="2" opacity="0.5"/>
          <path d="M 84 62 l 11 13 l 24 -28" stroke="${fg}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
      }
      // Schild mit Herz (Solidarität)
      return `<path d="${sh}" fill="${fg}"/>
        <path d="M 100 26 L 64 40 L 64 68 Q 64 92 100 104 Q 136 92 136 68 L 136 40 Z" fill="${tone}" opacity="0.25"/>`
        + heart(100, 64, 17, lite, 0.95);
    }
    case 'speech': {
      const v = V(3);
      if (v === 0) { // Dialog: zwei Blasen
        return `<path d="M 34 30 L 106 30 Q 122 30 122 46 L 122 66 Q 122 82 106 82 L 64 82 L 44 96 L 50 82 L 34 82 Q 24 82 24 68 L 24 46 Q 24 30 34 30 Z" fill="${tone}" stroke="${fg}" stroke-width="2.5"/>
          <circle cx="55" cy="56" r="4" fill="${fg}"/><circle cx="73" cy="56" r="4" fill="${fg}"/><circle cx="91" cy="56" r="4" fill="${fg}"/>
          <path d="M 136 46 L 174 46 Q 182 46 182 54 L 182 72 Q 182 80 174 80 L 158 80 L 142 92 L 148 80 L 136 80 Q 128 80 128 72 L 128 54 Q 128 46 136 46 Z" fill="${fg}"/>
          <line x1="140" y1="58" x2="170" y2="58" stroke="${lite}" stroke-width="2" opacity="0.8"/>
          <line x1="140" y1="68" x2="162" y2="68" stroke="${lite}" stroke-width="2" opacity="0.8"/>`;
      }
      if (v === 1) { // hitzige Blase mit Zickzack
        return `<path d="M 50 28 L 142 28 Q 158 28 158 44 L 158 70 Q 158 86 142 86 L 92 86 L 70 102 L 78 86 L 50 86 Q 40 86 40 70 L 40 44 Q 40 28 50 28 Z" fill="${tone}" stroke="${fg}" stroke-width="2.5"/>
          <path d="M 60 64 l 12 -14 l 8 9 l 12 -16 l 9 10 l 13 -13" fill="none" stroke="${acc}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M 166 30 l 6 -8 M 172 40 l 9 -4 M 174 52 l 9 1" stroke="${fg}" stroke-width="2.5" stroke-linecap="round"/>`;
      }
      // Thread-Kaskade: drei Blasen
      return `<path d="M 36 24 h 64 q 10 0 10 10 v 14 q 0 10 -10 10 h -46 l -12 9 l 3 -9 h -9 q -10 0 -10 -10 v -14 q 0 -10 10 -10 z" fill="${fg}"/>
        <path d="M 78 60 h 58 q 9 0 9 9 v 12 q 0 9 -9 9 h -42 l -11 8 l 3 -8 h -8 q -9 0 -9 -9 v -12 q 0 -9 9 -9 z" fill="${tone}"/>
        <path d="M 120 94 h 44 q 8 0 8 8 v 8 q 0 8 -8 8 h -30 l -10 7 l 3 -7 h -7 q -8 0 -8 -8 v -8 q 0 -8 8 -8 z" fill="${acc}" opacity="0.9"/>
        <circle cx="56" cy="41" r="3" fill="${lite}"/><circle cx="68" cy="41" r="3" fill="${lite}"/><circle cx="80" cy="41" r="3" fill="${lite}"/>
        <line x1="88" y1="75" x2="${N(j(116, 130))}" y2="75" stroke="${deep}" stroke-width="2" opacity="0.6"/>`;
    }
    case 'news': {
      const v = V(2);
      if (v === 0) { // Zeitungsraster
        return `<rect x="40" y="28" width="120" height="72" rx="3" fill="${tone}" stroke="${fg}" stroke-width="2.5"/>
          <rect x="48" y="36" width="104" height="13" fill="${fg}"/>
          <line x1="48" y1="58" x2="100" y2="58" stroke="${deep}" stroke-width="1.6" opacity="0.7"/>
          <line x1="48" y1="65" x2="96" y2="65" stroke="${deep}" stroke-width="1.6" opacity="0.7"/>
          <line x1="48" y1="72" x2="100" y2="72" stroke="${deep}" stroke-width="1.6" opacity="0.7"/>
          <line x1="48" y1="79" x2="92" y2="79" stroke="${deep}" stroke-width="1.6" opacity="0.7"/>
          <line x1="48" y1="86" x2="98" y2="86" stroke="${deep}" stroke-width="1.6" opacity="0.7"/>
          <rect x="108" y="56" width="44" height="34" rx="2" fill="${fg}" opacity="0.3"/>
          <circle cx="130" cy="73" r="${N(j(7, 10))}" fill="${fg}"/>`;
      }
      // Nachrichten-Monitor mit Bauchbinde
      return `<rect x="48" y="24" width="104" height="68" rx="6" fill="${deep}" stroke="${fg}" stroke-width="2.5"/>
        <circle cx="${N(j(86, 114))}" cy="50" r="13" fill="${tone}" opacity="0.85"/>
        <rect x="48" y="74" width="104" height="18" fill="${fg}"/>
        <rect x="54" y="78" width="${N(j(40, 64))}" height="4" rx="2" fill="${lite}"/>
        <rect x="54" y="85" width="${N(j(26, 48))}" height="3" rx="1.5" fill="${lite}" opacity="0.7"/>
        <line x1="84" y1="100" x2="116" y2="100" stroke="${fg}" stroke-width="3"/>
        <line x1="100" y1="92" x2="100" y2="100" stroke="${fg}" stroke-width="3"/>`;
    }
    case 'school': {
      const v = V(2);
      if (v === 0) { // Heft mit Stift
        let lines = '';
        for (let i = 0; i < 5; i++) {
          lines += `<line x1="74" y1="${N(46 + i * 11)}" x2="${N(j(118, 134))}" y2="${N(46 + i * 11)}" stroke="${deep}" stroke-width="1.8" opacity="0.6"/>`;
        }
        return `<g transform="rotate(${N(j(-5, 5))} 100 64)">
          <rect x="62" y="30" width="80" height="72" rx="4" fill="${lite}" stroke="${fg}" stroke-width="2"/>
          <line x1="70" y1="30" x2="70" y2="102" stroke="${acc}" stroke-width="2" opacity="0.8"/>` + lines + `</g>
        <g transform="rotate(${N(j(30, 50))} 150 80)">
          <rect x="143" y="48" width="13" height="50" rx="2" fill="${fg}"/>
          <path d="M 143 98 L 149.5 112 L 156 98 Z" fill="${tone}"/>
          <rect x="143" y="42" width="13" height="7" fill="${acc}"/>
        </g>`;
      }
      // Tafel mit Kreide-Skizze
      return `<rect x="46" y="26" width="108" height="70" rx="4" fill="${deep}" stroke="${tone}" stroke-width="3"/>
        <path d="M 58 44 q 18 ${N(j(-10, -4))} 36 0 q 18 ${N(j(4, 10))} 36 0" fill="none" stroke="${lite}" stroke-width="2" stroke-linecap="round" opacity="0.85"/>
        <circle cx="${N(j(70, 86))}" cy="${N(j(62, 72))}" r="9" fill="none" stroke="${acc}" stroke-width="2"/>
        <path d="M 104 ${N(j(60, 68))} h 28 m -8 -8 l 8 8 l -8 8" fill="none" stroke="${lite}" stroke-width="2" stroke-linecap="round"/>
        <line x1="58" y1="84" x2="${N(j(96, 124))}" y2="84" stroke="${lite}" stroke-width="2" opacity="0.6"/>
        <rect x="86" y="98" width="28" height="5" rx="2" fill="${tone}"/>
        <rect x="118" y="99" width="12" height="4" rx="2" fill="${acc}"/>`;
    }
    case 'pet': {
      const v = V(2);
      if (v === 0) { // Katzenkopf mit Schnurrhaaren
        return `<path d="M 70 46 L 76 22 L 94 38 Z" fill="${fg}"/>
          <path d="M 130 46 L 124 22 L 106 38 Z" fill="${fg}"/>
          <path d="M 74 42 L 78 30 L 88 38 Z" fill="${acc}"/>
          <path d="M 126 42 L 122 30 L 112 38 Z" fill="${acc}"/>
          <circle cx="100" cy="64" r="34" fill="${fg}"/>
          <path d="M 88 60 q 4 ${N(j(-6, -3))} 8 0 M 104 60 q 4 ${N(j(-6, -3))} 8 0" stroke="${deep}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
          <path d="M 100 68 l -3 -4 h 6 z" fill="${acc}"/>
          <path d="M 96 72 q 4 4 8 0" stroke="${deep}" stroke-width="2" fill="none" stroke-linecap="round"/>
          <path d="M 64 64 l -18 ${N(j(-6, -2))} M 64 70 l -18 ${N(j(2, 6))} M 136 64 l 18 ${N(j(-6, -2))} M 136 70 l 18 ${N(j(2, 6))}" stroke="${tone}" stroke-width="1.8" stroke-linecap="round" opacity="0.9"/>`;
      }
      // Pfotenspur mit Herz
      let paws = '';
      const baseAngle = j(-15, 15);
      for (let i = 0; i < 3; i++) {
        const x = 56 + i * 36 + j(-4, 4), y = 88 - i * 22 + j(-4, 4), s = j(0.85, 1.15);
        paws += `<g transform="rotate(${N(baseAngle + i * 8)} ${N(x)} ${N(y)})"><ellipse cx="${N(x)}" cy="${N(y)}" rx="${N(8 * s)}" ry="${N(6.5 * s)}" fill="${fg}"/><circle cx="${N(x - 7 * s)}" cy="${N(y - 8 * s)}" r="${N(2.8 * s)}" fill="${fg}"/><circle cx="${N(x - 2 * s)}" cy="${N(y - 10.5 * s)}" r="${N(2.8 * s)}" fill="${fg}"/><circle cx="${N(x + 3.5 * s)}" cy="${N(y - 9.5 * s)}" r="${N(2.8 * s)}" fill="${fg}"/><circle cx="${N(x + 8 * s)}" cy="${N(y - 6 * s)}" r="${N(2.4 * s)}" fill="${fg}"/></g>`;
      }
      return paws + heart(j(140, 164), j(30, 50), j(6, 9), acc, 0.9);
    }
    case 'food': {
      const v = V(2);
      if (v === 0) { // Teller von oben mit Besteck
        return `<circle cx="100" cy="63" r="40" fill="${lite}"/>
          <circle cx="100" cy="63" r="31" fill="${tone}"/>
          <path d="M ${N(j(82, 88))} ${N(j(52, 58))} q 14 -10 26 -1 q 10 9 -2 17 q -16 8 -24 -2 q -4 -8 0 -14 z" fill="${acc}"/>
          <circle cx="${N(j(90, 96))}" cy="${N(j(56, 62))}" r="3" fill="${lite}" opacity="0.8"/>
          <circle cx="${N(j(104, 112))}" cy="${N(j(64, 70))}" r="2.5" fill="${deep}" opacity="0.5"/>
          <path d="M 31 38 v 14 M 36 38 v 14 M 41 38 v 14 M 31 52 h 10 M 36 52 v 34" stroke="${fg}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
          <path d="M 164 38 q -7 16 0 30 l 0 18" stroke="${fg}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
      }
      // dampfender Kochtopf
      return shadow(100, 106, 42)
        + `<rect x="64" y="56" width="72" height="42" rx="6" fill="${tone}" stroke="${fg}" stroke-width="2.5"/>
        <path d="M 64 66 q -10 0 -10 8 M 136 66 q 10 0 10 8" fill="none" stroke="${fg}" stroke-width="2.5" stroke-linecap="round"/>
        <rect x="60" y="48" width="80" height="9" rx="4.5" fill="${fg}"/>
        <circle cx="100" cy="44" r="4" fill="${fg}"/>
        <line x1="72" y1="78" x2="128" y2="78" stroke="${fg}" stroke-width="1.5" opacity="0.4"/>`
        + steam(86, 42) + steam(100, 38) + steam(114, 42);
    }
    case 'harbor': {
      const v = V(2);
      const wy = j(96, 102);
      const waves = `<path d="M 24 ${N(wy)} q 11 -7 22 0 t 22 0 t 22 0 t 22 0 t 22 0 t 22 0" fill="none" stroke="${tone}" stroke-width="2.5" stroke-linecap="round" opacity="0.8"/>`;
      if (v === 0) { // Segelboot mit Möwen
        return waves
          + `<path d="M 70 88 L 134 88 L 122 100 L 82 100 Z" fill="${fg}"/>
          <line x1="101" y1="88" x2="101" y2="32" stroke="${fg}" stroke-width="3"/>
          <path d="M 101 34 L 101 82 L 66 82 Z" fill="${lite}" opacity="0.95"/>
          <path d="M 107 40 L 107 82 L 136 82 Z" fill="${acc}" opacity="0.9"/>
          <path d="M 101 32 l 12 4 l -12 4 z" fill="${acc}"/>`
          + gull(j(36, 60), j(24, 42), j(5, 8)) + gull(j(140, 168), j(20, 38), j(4, 7));
      }
      // Leuchtturm mit Lichtkegeln
      return waves
        + `<path d="M 88 98 L 94 40 L 110 40 L 116 98 Z" fill="${lite}"/>
        <path d="M 90.5 76 L 113.5 76 L 115 88 L 89 88 Z" fill="${fg}"/>
        <path d="M 92.5 54 L 111.5 54 L 113 66 L 91 66 Z" fill="${fg}"/>
        <rect x="92" y="28" width="20" height="13" rx="2" fill="${deep}"/>
        <circle cx="102" cy="34" r="4.5" fill="${acc}"/>
        <path d="M 92 34 L 54 ${N(j(20, 30))} L 54 ${N(j(38, 48))} Z" fill="${lite}" opacity="0.3"/>
        <path d="M 112 34 L 150 ${N(j(18, 28))} L 150 ${N(j(36, 46))} Z" fill="${lite}" opacity="0.3"/>
        <path d="M 84 98 h 36" stroke="${deep}" stroke-width="3"/>`
        + gull(j(36, 64), j(26, 46), j(4, 7));
    }
    default: {
      const v = V(3);
      if (v === 0) { // überlappende Kreise
        return `<circle cx="${N(j(54, 86))}" cy="${N(j(40, 64))}" r="${N(j(22, 34))}" fill="${fg}" opacity="0.5"/>
          <circle cx="${N(j(116, 150))}" cy="${N(j(58, 84))}" r="${N(j(16, 26))}" fill="${tone}" opacity="0.6"/>
          <circle cx="${N(j(88, 116))}" cy="${N(j(46, 72))}" r="${N(j(8, 14))}" fill="${acc}" opacity="0.8"/>
          <path d="M 36 ${N(j(88, 98))} q 64 ${N(j(-22, -10))} 128 0" stroke="${lite}" stroke-width="2.5" fill="none" opacity="0.6"/>`;
      }
      if (v === 1) { // konzentrische Ringe
        const cx = j(84, 116), cy = j(52, 72);
        return `<circle cx="${N(cx)}" cy="${N(cy)}" r="40" fill="none" stroke="${tone}" stroke-width="2.5" opacity="0.5"/>
          <circle cx="${N(cx)}" cy="${N(cy)}" r="28" fill="none" stroke="${fg}" stroke-width="2.5" opacity="0.7"/>
          <circle cx="${N(cx)}" cy="${N(cy)}" r="16" fill="none" stroke="${acc}" stroke-width="2.5" opacity="0.85"/>
          <circle cx="${N(cx)}" cy="${N(cy)}" r="6" fill="${lite}"/>`
          + star4(j(30, 56), j(24, 44), 3.5, tone, 0.8) + star4(j(146, 172), j(76, 96), 3, lite, 0.7);
      }
      // Dreieck-Komposition
      return `<path d="M ${N(j(56, 76))} 96 L 100 ${N(j(26, 40))} L ${N(j(124, 144))} 96 Z" fill="none" stroke="${fg}" stroke-width="3" stroke-linejoin="round" opacity="0.85"/>
        <circle cx="100" cy="${N(j(60, 76))}" r="${N(j(10, 16))}" fill="${acc}" opacity="0.75"/>
        <line x1="40" y1="104" x2="160" y2="104" stroke="${tone}" stroke-width="2.5" opacity="0.6"/>`
        + star4(j(140, 166), j(24, 40), 4, lite, 0.8);
    }
  }
}
