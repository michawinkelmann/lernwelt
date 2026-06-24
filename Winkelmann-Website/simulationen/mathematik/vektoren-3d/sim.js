// Vektoren im Raum (3D) — zwei Vektoren im R³ anschaulich machen (Oberstufe / Analytische
// Geometrie). Modus „statisch“: an den sieben Reglern die Komponenten der beiden Vektoren
// v1 = (ax, ay, az) und v2 = (bx, by, bz) einstellen → Betrag (Länge) beider Vektoren und
// der Winkel zwischen ihnen werden sofort exakt berechnet und das räumliche Bild neu
// gezeichnet. Der Regler „azimut“ dreht die Ansicht um die senkrechte Achse, sodass der
// räumliche Eindruck (Tiefe) durch Drehen sichtbar wird.
//
// Modell (exakt, von der Projektion unabhängig — das sind die berechneten Größen):
//   Betrag         |v|     = √(vx² + vy² + vz²)
//   Skalarprodukt  v1 · v2 = ax·bx + ay·by + az·bz
//   Winkel φ:      cos φ   = (v1 · v2) / (|v1| · |v2|),   φ = arccos(…) · 180/π  (in Grad)
// Bei |v1| = 0 oder |v2| = 0 ist der Winkel nicht definiert → es wird 0 zurückgegeben.
//
// Projektion (NUR für die Darstellung, drehbar über azimut): feste Elevation θ = 30°
// (sin θ ≈ 0,5; cos θ ≈ 0,866), Azimut φ_az aus dem Regler. Ein Raumpunkt (x, y, z) wird
// erst auf zwei Bildachsen abgebildet
//   bx2 = x·cos φ_az − y·sin φ_az
//   by2 = (x·sin φ_az + y·cos φ_az)·sin θ − z·cos θ
// und dann auf den Bildschirm gelegt (px nach rechts, py nach unten). Diese Parallel-
// projektion verzerrt keine Längen entlang einer Richtung, hat aber keine Perspektive.

import { formatZahl } from "../../../assets/js/sim/welt.js";

const GRAD = 180 / Math.PI;
const THETA = 30 * Math.PI / 180;       // feste Elevation der Ansicht
const SIN_THETA = Math.sin(THETA);       // ≈ 0,5
const COS_THETA = Math.cos(THETA);       // ≈ 0,866

export const manifest = {
  id: "mathematik/vektoren-3d",
  titel: "Vektoren im Raum (3D)",
  modus: "statisch",
  raster: false,     // eigene 3D-Projektion statt des ebenen Karo-Rasters
  werkzeuge: false,  // Lineal/Winkelmesser wären auf der Projektion irreführend
  parameter: [
    { id: "ax", label: "v₁: x-Komponente aₓ", einheit: "", min: -5, max: 5, schritt: 1, start: 3 },
    { id: "ay", label: "v₁: y-Komponente a_y", einheit: "", min: -5, max: 5, schritt: 1, start: 0 },
    { id: "az", label: "v₁: z-Komponente a_z", einheit: "", min: -5, max: 5, schritt: 1, start: 4 },
    { id: "bx", label: "v₂: x-Komponente bₓ", einheit: "", min: -5, max: 5, schritt: 1, start: 0 },
    { id: "by", label: "v₂: y-Komponente b_y", einheit: "", min: -5, max: 5, schritt: 1, start: 4 },
    { id: "bz", label: "v₂: z-Komponente b_z", einheit: "", min: -5, max: 5, schritt: 1, start: 0 },
    { id: "azimut", label: "Ansicht drehen (Azimut)", einheit: "°", min: 0, max: 360, schritt: 15, start: 30 }
  ],
  anzeigen: [
    { id: "laenge1", label: "Länge |v₁| = √(aₓ² + a_y² + a_z²)", einheit: "", stellen: 2 },
    { id: "laenge2", label: "Länge |v₂| = √(bₓ² + b_y² + b_z²)", einheit: "", stellen: 2 },
    { id: "winkel",  label: "Winkel φ zwischen v₁ und v₂",       einheit: "°", stellen: 1 }
  ],
  presets: [
    { name: "senkrecht",  werte: { ax: 3, ay: 0, az: 4, bx: 0, by: 5, bz: 0, azimut: 30 } },
    { name: "parallel",   werte: { ax: 1, ay: 2, az: 2, bx: 2, by: 4, bz: 4, azimut: 30 } },
    { name: "beliebig",   werte: { ax: 4, ay: 1, az: 2, bx: -2, by: 3, bz: 3, azimut: 45 } }
  ],
  vorhersage: {
    frage: "Zwei Vektoren stehen senkrecht aufeinander (Winkel 90°). Was gilt dann für ihr Skalarprodukt v₁ · v₂?",
    optionen: [
      "Das Skalarprodukt ist 0",
      "Das Skalarprodukt ist 1",
      "Das Skalarprodukt ist so groß wie das Produkt der Längen"
    ],
    aufloesung: "Das Skalarprodukt ist 0. Wegen v₁ · v₂ = |v₁|·|v₂|·cos φ und cos 90° = 0 wird das Produkt null, sobald die Vektoren senkrecht zueinander stehen (und keiner der Nullvektor ist). Umgekehrt gilt: Ist das Skalarprodukt zweier von null verschiedener Vektoren gleich 0, so stehen sie senkrecht aufeinander. Stelle das Preset „senkrecht“ ein: v₁ = (3, 0, 4), v₂ = (0, 5, 0) — das Skalarprodukt ist 3·0 + 0·5 + 4·0 = 0, der angezeigte Winkel ist 90°."
  },
  beobachtung: [
    "Räumlicher Eindruck: Ändere nur den Regler „Ansicht drehen (Azimut)“ und lass die Vektoren unverändert. Die Längen und der Winkel ändern sich NICHT — nur die Blickrichtung dreht sich. So erkennst du, welcher Vektor weiter „vorn“ oder „hinten“ liegt. Warum bleiben Länge und Winkel beim Drehen gleich?",
    "Betrag aus den Komponenten: Stelle v₁ = (3, 0, 4) ein (aₓ = 3, a_y = 0, a_z = 4). Rechne von Hand: √(3² + 0² + 4²) = √25 = 5. Vergleiche mit der Anzeige |v₁|. Probiere weitere Tripel und prüfe deine Rechnung.",
    "Senkrecht ⇔ Skalarprodukt 0: Stelle v₂ so ein, dass aₓ·bₓ + a_y·b_y + a_z·b_z = 0 wird (z. B. v₁ = (3, 0, 4), v₂ = (0, 5, 0) oder v₂ = (4, 0, −3)). Welchen Winkel zeigt die Anzeige jeweils?",
    "Parallel und antiparallel: Setze v₂ = v₁ (gleiche Komponenten) — der Winkel ist 0°. Setze dann jede Komponente von v₂ auf das Negative von v₁ (z. B. v₁ = (2, 0, 0), v₂ = (−3, 0, 0)) — der Winkel ist 180°. Vektoren mit Winkel 0° zeigen in dieselbe Richtung, mit 180° in genau entgegengesetzte."
  ],
  modellgrenzen: "Die Darstellung ist eine Parallelprojektion (Schrägbild) ohne Perspektive: Entferntere Vektoren werden nicht kleiner, parallele Raumkanten bleiben im Bild parallel. Sie dient nur der Anschauung und ersetzt keine echte räumliche Tiefe. Die berechneten Größen — Länge und Winkel — sind dagegen exakt und vom gewählten Blickwinkel (Azimut) völlig unabhängig.",
  bilanz: {
    laenge1: { label: "Länge |v₁|", einheit: "", stellen: 4 },
    laenge2: { label: "Länge |v₂|", einheit: "", stellen: 4 },
    winkel:  { label: "Winkel φ zwischen v₁ und v₂", einheit: "°", stellen: 4 }
  }
};

// ---------- Modell (exakte 3D-Größen, projektionsunabhängig) ----------

// Betrag (Länge) eines Vektors
function betrag(x, y, z) {
  return Math.sqrt(x * x + y * y + z * z);
}

// Skalarprodukt zweier Vektoren
function skalarprodukt(p) {
  return p.ax * p.bx + p.ay * p.by + p.az * p.bz;
}

// Winkel zwischen v1 und v2 in Grad; bei einem Nullvektor undefiniert → 0
function winkelGrad(p) {
  const l1 = betrag(p.ax, p.ay, p.az);
  const l2 = betrag(p.bx, p.by, p.bz);
  if (l1 === 0 || l2 === 0) return 0;
  let cos = skalarprodukt(p) / (l1 * l2);
  // Rundungsfehler abfangen, damit arccos definiert bleibt
  if (cos > 1) cos = 1;
  if (cos < -1) cos = -1;
  return Math.acos(cos) * GRAD;
}

export function init(p) {
  return {
    t: 0,
    laenge1: betrag(p.ax, p.ay, p.az),
    laenge2: betrag(p.bx, p.by, p.bz),
    winkel: winkelGrad(p),
    skalar: skalarprodukt(p)
  };
}

export function update() { /* statisch: nichts zu tun */ }

export function messwerte(z) {
  return { laenge1: z.laenge1, laenge2: z.laenge2, winkel: z.winkel };
}

export function istFertig() { return true; }

export function bilanz(z) {
  return { laenge1: z.laenge1, laenge2: z.laenge2, winkel: z.winkel };
}

// ---------- Sichtbarer Weltausschnitt ----------
// Fix und symmetrisch um den Ursprung. Wir bilden 3D selbst über welt.breite/welt.hoehe
// ab (eigene Projektion in zeichne), daher ist dieser Bereich nur ein neutraler Rahmen,
// damit die Engine einen gültigen Maßstab hat. Die Achsen reichen bis ±5 (Reglergrenzen).
export function weltBereich() {
  return { xMin: -6, xMax: 6, yMin: -6, yMax: 6 };
}

// ---------- Darstellung (eigene 3D-Parallelprojektion) ----------

// Hex/rgb-Farbe der Tokens mit Alpha versehen
function farbeMitAlpha(farbe, alpha) {
  if (farbe.startsWith("#")) {
    let h = farbe.slice(1);
    if (h.length === 3) h = h.split("").map(c => c + c).join("");
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  const m = farbe.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  if (m) return `rgba(${m[1]},${m[2]},${m[3]},${alpha})`;
  return farbe;
}

// Fachfarbe Mathematik aus den Design-Tokens (Fallback: Akzentfarbe der Engine)
function matheFarbe(stil) {
  if (typeof document === "undefined") return stil.akzent;
  const wert = getComputedStyle(document.documentElement).getPropertyValue("--mathe").trim();
  return wert || stil.akzent;
}

// Zahl ohne überflüssige Nachkommastellen: 6 → „6“, 2,5 → „2,5“, −1 → „−1“
function zahl(wert) {
  if (Math.abs(wert - Math.round(wert)) < 1e-9) return formatZahl(wert, 0);
  if (Math.abs(10 * wert - Math.round(10 * wert)) < 1e-9) return formatZahl(wert, 1);
  return formatZahl(wert, 2);
}

// Tripel (x, y, z) → Bildschirmkoordinaten (px, py). skala/mitte aus dem Canvas.
function projiziere(x, y, z, phiAz, mitteX, mitteY, skala) {
  const c = Math.cos(phiAz), s = Math.sin(phiAz);
  const bx2 = x * c - y * s;
  const by2 = (x * s + y * c) * SIN_THETA - z * COS_THETA;
  return [mitteX + bx2 * skala, mitteY + by2 * skala];
}

// Pfeil zwischen zwei Bildschirmpunkten mit Spitze
function pfeilBild(ctx, x0, y0, x1, y1, farbe, breite) {
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  ctx.strokeStyle = farbe;
  ctx.fillStyle = farbe;
  ctx.lineWidth = breite;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  if (len < 1e-6) {
    ctx.beginPath();
    ctx.arc(x0, y0, breite * 1.6, 0, 2 * Math.PI);
    ctx.fill();
    return;
  }
  const ux = dx / len, uy = dy / len;
  const sp = Math.max(10, breite * 4);
  const w = 0.5;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - sp * (ux * Math.cos(w) - uy * Math.sin(w)),
             y1 - sp * (uy * Math.cos(w) + ux * Math.sin(w)));
  ctx.lineTo(x1 - sp * (ux * Math.cos(-w) - uy * Math.sin(-w)),
             y1 - sp * (uy * Math.cos(-w) + ux * Math.sin(-w)));
  ctx.closePath();
  ctx.fill();
}

export function zeichne({ ctx, welt, zustand: z, werte: p, stil }) {
  const mathe = matheFarbe(stil);
  const akzent = stil.akzent;
  const zweite = stil.fehler;   // zweite, gut unterscheidbare Farbe für v₂
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // Mittelpunkt und Maßstab der eigenen Projektion aus den Canvas-Maßen ableiten
  const B = welt.breite, H = welt.hoehe;
  const mitteX = B * 0.5;
  const mitteY = H * 0.52;            // etwas nach unten, damit oben Text Platz hat
  const ACHSE = 5;                    // Achsenlänge in Welteinheiten (Reglergrenze)
  // Maßstab so wählen, dass die Achsen sicher ins Bild passen (mit Rand)
  const skala = Math.min(B, H) / (2 * (ACHSE + 1.5));
  const phiAz = (p.azimut * Math.PI / 180);

  const proj = (x, y, z2) => projiziere(x, y, z2, phiAz, mitteX, mitteY, skala);

  // --- Bodengitter in der xy-Ebene (z = 0) als blasse räumliche Orientierung ---
  ctx.save();
  ctx.strokeStyle = farbeMitAlpha(stil.beschriftung, 0.25);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let g = -ACHSE; g <= ACHSE; g++) {
    let a = proj(g, -ACHSE, 0), b = proj(g, ACHSE, 0);
    ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
    a = proj(-ACHSE, g, 0); b = proj(ACHSE, g, 0);
    ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
  }
  ctx.stroke();
  ctx.restore();

  // --- Koordinatenachsen x, y, z (negativer Teil blass, positiver kräftig) ---
  const ursprung = proj(0, 0, 0);
  const achsen = [
    { e: [ACHSE, 0, 0], name: "x" },
    { e: [0, ACHSE, 0], name: "y" },
    { e: [0, 0, ACHSE], name: "z" }
  ];
  ctx.save();
  // negative Achsenhälften gestrichelt und blass
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = farbeMitAlpha(stil.beschriftung, 0.6);
  ctx.lineWidth = 1.2;
  achsen.forEach(a => {
    const n = proj(-a.e[0], -a.e[1], -a.e[2]);
    ctx.beginPath();
    ctx.moveTo(ursprung[0], ursprung[1]);
    ctx.lineTo(n[0], n[1]);
    ctx.stroke();
  });
  ctx.setLineDash([]);
  // positive Achsenhälften als Pfeile
  ctx.strokeStyle = stil.beschriftung;
  achsen.forEach(a => {
    const e = proj(a.e[0], a.e[1], a.e[2]);
    pfeilBild(ctx, ursprung[0], ursprung[1], e[0], e[1], stil.beschriftung, 1.4);
  });
  // Achsenbeschriftung
  ctx.fillStyle = stil.beschriftung;
  ctx.font = "700 " + Math.max(13, (parseFloat(stil.schrift) || 12) + 2) + "px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  achsen.forEach(a => {
    const e = proj(a.e[0] * 1.12, a.e[1] * 1.12, a.e[2] * 1.12);
    ctx.fillText(a.name, e[0], e[1]);
  });
  ctx.restore();

  // --- Hilfslinien (Lot auf die xy-Ebene) für beide Vektoren ---
  function lot(vx, vy, vz, farbe) {
    if (Math.abs(vz) < 1e-9) return;
    const spitze = proj(vx, vy, vz);
    const fuss = proj(vx, vy, 0);
    ctx.save();
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = farbeMitAlpha(farbe, 0.5);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(spitze[0], spitze[1]);
    ctx.lineTo(fuss[0], fuss[1]);
    // und vom Fußpunkt zum Ursprung über die Ebene
    ctx.lineTo(ursprung[0], ursprung[1]);
    ctx.stroke();
    ctx.restore();
  }
  lot(p.ax, p.ay, p.az, akzent);
  lot(p.bx, p.by, p.bz, zweite);

  // --- Winkelbogen zwischen v₁ und v₂ (kleiner Bogen in der von beiden aufgespannten Lage) ---
  const l1 = z.laenge1, l2 = z.laenge2;
  if (l1 > 1e-9 && l2 > 1e-9 && z.winkel > 0.5 && z.winkel < 179.5) {
    // Punkte auf beiden Vektoren in gleichem (kleinem) Abstand vom Ursprung,
    // dazwischen ein paar Zwischenpunkte durch lineare Interpolation der Richtungen
    const r = Math.min(l1, l2) * 0.32;
    const e1 = [p.ax / l1, p.ay / l1, p.az / l1];
    const e2 = [p.bx / l2, p.by / l2, p.bz / l2];
    ctx.save();
    ctx.strokeStyle = farbeMitAlpha(mathe, 0.9);
    ctx.lineWidth = stil.linienstaerke;
    ctx.beginPath();
    const N = 24;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      // Richtung interpolieren und auf Länge r normieren (näherungsweiser Bogen)
      let dx = e1[0] * (1 - t) + e2[0] * t;
      let dy = e1[1] * (1 - t) + e2[1] * t;
      let dz = e1[2] * (1 - t) + e2[2] * t;
      const ln = Math.hypot(dx, dy, dz) || 1;
      dx = dx / ln * r; dy = dy / ln * r; dz = dz / ln * r;
      const q = proj(dx, dy, dz);
      if (i === 0) ctx.moveTo(q[0], q[1]); else ctx.lineTo(q[0], q[1]);
    }
    ctx.stroke();
    ctx.restore();
  }

  // --- Die beiden Vektoren als kräftige Pfeile vom Ursprung ---
  const breite = stil.linienstaerke + 1;
  const v1 = proj(p.ax, p.ay, p.az);
  const v2 = proj(p.bx, p.by, p.bz);
  // Reihenfolge nach „Tiefe“ (größere by2 zeichnen wir später → liegt optisch vorn)
  pfeilBild(ctx, ursprung[0], ursprung[1], v1[0], v1[1], akzent, breite);
  pfeilBild(ctx, ursprung[0], ursprung[1], v2[0], v2[1], zweite, breite);

  // --- Vektor-Beschriftung an den Pfeilspitzen ---
  ctx.font = "700 " + Math.max(13, (parseFloat(stil.schrift) || 12) + 2) + "px sans-serif";
  ctx.textBaseline = "middle";
  function vLabel(bild, text, farbe) {
    ctx.fillStyle = farbe;
    ctx.textAlign = "left";
    ctx.fillText(text, bild[0] + 8, bild[1] - 8);
  }
  if (Math.hypot(p.ax, p.ay, p.az) > 1e-9) vLabel(v1, "v₁", akzent);
  if (Math.hypot(p.bx, p.by, p.bz) > 1e-9) vLabel(v2, "v₂", zweite);

  // --- Textblock oben links: Komponenten, Längen, Skalarprodukt, Winkel ---
  const basis = Math.max(12, parseFloat(stil.schrift) || 12);
  let xT = 12, yT = 14 + basis;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  ctx.font = "700 " + (basis + 1) + "px sans-serif";
  ctx.fillStyle = akzent;
  ctx.fillText("v₁ = (" + zahl(p.ax) + " | " + zahl(p.ay) + " | " + zahl(p.az) + ")   |v₁| = " + zahl(z.laenge1), xT, yT);
  yT += basis + 7;
  ctx.fillStyle = zweite;
  ctx.fillText("v₂ = (" + zahl(p.bx) + " | " + zahl(p.by) + " | " + zahl(p.bz) + ")   |v₂| = " + zahl(z.laenge2), xT, yT);
  yT += basis + 9;

  ctx.font = (basis) + "px sans-serif";
  ctx.fillStyle = stil.text;
  ctx.fillText("v₁ · v₂ = " + zahl(z.skalar), xT, yT);
  yT += basis + 6;

  ctx.font = "700 " + (basis + 2) + "px sans-serif";
  const l1roh = z.laenge1, l2roh = z.laenge2;
  if (l1roh < 1e-9 || l2roh < 1e-9) {
    ctx.fillStyle = stil.beschriftung;
    ctx.fillText("Winkel nicht definiert (ein Vektor ist der Nullvektor)", xT, yT);
  } else {
    ctx.fillStyle = stil.text;
    ctx.fillText("Winkel φ = " + formatZahl(z.winkel, 1) + "°", xT, yT);
    // didaktischer Zusatzhinweis bei besonderen Lagen
    yT += basis + 6;
    ctx.font = "700 " + (basis) + "px sans-serif";
    if (Math.abs(z.skalar) < 1e-9) {
      ctx.fillStyle = mathe;
      ctx.fillText("→ Skalarprodukt 0: v₁ und v₂ stehen senkrecht aufeinander (90°)", xT, yT);
    } else if (z.winkel < 0.5) {
      ctx.fillStyle = mathe;
      ctx.fillText("→ Winkel 0°: v₁ und v₂ sind parallel (gleiche Richtung)", xT, yT);
    } else if (z.winkel > 179.5) {
      ctx.fillStyle = mathe;
      ctx.fillText("→ Winkel 180°: v₁ und v₂ sind antiparallel (entgegengesetzt)", xT, yT);
    }
  }
}

// ---------- Prüffälle ----------
// Soll-Werte analytisch (projektionsunabhängige 3D-Größen):
//   |v| = √(vx²+vy²+vz²) ; cos φ = (v1·v2)/(|v1|·|v2|) ; φ in Grad.
// (toleranzProzent 1; bei Soll = 0 prüft die Validierung absolut.)

export const pruefFaelle = [
  {
    name: "senkrecht: (3,0,4) und (0,5,0)",
    parameter: { ax: 3, ay: 0, az: 4, bx: 0, by: 5, bz: 0, azimut: 30 },
    toleranzProzent: 1,
    soll: { laenge1: 5, laenge2: 5, winkel: 90 }
  },
  {
    name: "gleich: (1,2,2) und (1,2,2)",
    parameter: { ax: 1, ay: 2, az: 2, bx: 1, by: 2, bz: 2, azimut: 30 },
    toleranzProzent: 1,
    soll: { laenge1: 3, laenge2: 3, winkel: 0 }
  },
  {
    name: "45°: (1,0,0) und (1,1,0)",
    parameter: { ax: 1, ay: 0, az: 0, bx: 1, by: 1, bz: 0, azimut: 30 },
    toleranzProzent: 1,
    soll: { winkel: 45 }
  },
  {
    name: "180°: (2,0,0) und (-3,0,0)",
    parameter: { ax: 2, ay: 0, az: 0, bx: -3, by: 0, bz: 0, azimut: 30 },
    toleranzProzent: 1,
    soll: { winkel: 180 }
  }
];
