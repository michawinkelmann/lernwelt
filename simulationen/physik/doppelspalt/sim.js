// Interferenz am Doppelspalt — kohärentes, monochromatisches Licht an zwei Spalten:
// oben das Schirmbild als Farbband (Helligkeit ∝ Intensität, Farbton näherungsweise
// aus der Wellenlänge), darunter die Intensitätskurve I(x) mit der gestrichelten
// Einzelspalt-Einhüllenden. Modus „statisch": Parameter ändern → sofort neu zeichnen.
// Modell (Fraunhofer-Näherung, Schirm fern):
//   α(x) = arctan(x/e),  I(x) = cos²(π·g·sinα/λ) · sinc²(π·b·sinα/λ),  sinc(z) = sin(z)/z.
// Gerechnet wird ausschließlich in SI-Einheiten (m); die Regler liefern nm/mm/m.

import { formatZahl, schoeneSchrittweite } from "../../../assets/js/sim/welt.js";

export const manifest = {
  id: "physik/doppelspalt",
  titel: "Interferenz am Doppelspalt",
  modus: "statisch",
  raster: false,     // eigenes Schirmbild samt mm-Achse statt Koordinatenraster
  werkzeuge: false,  // Weltkoordinate ist hier mm — das Lineal (misst in m) wäre irreführend
  parameter: [
    { id: "lambda", label: "Wellenlänge λ",   einheit: "nm", min: 380,  max: 750,  schritt: 5,    start: 633 },
    { id: "g",      label: "Spaltabstand g",  einheit: "mm", min: 0.10, max: 1.00, schritt: 0.05, start: 0.25 },
    { id: "e",      label: "Schirmabstand e", einheit: "m",  min: 0.5,  max: 3,    schritt: 0.1,  start: 1.5 },
    { id: "b",      label: "Spaltbreite b",   einheit: "mm", min: 0.02, max: 0.20, schritt: 0.01, start: 0.05 }
  ],
  anzeigen: [
    { id: "dStreifen",    label: "Streifenabstand Δa",      einheit: "mm", stellen: 3, faktor: 1000 },
    { id: "a1",           label: "1. Maximum exakt",        einheit: "mm", stellen: 3, faktor: 1000 },
    { id: "einhuellMin1", label: "1. Einhüllenden-Minimum", einheit: "mm", stellen: 2, faktor: 1000 },
    { id: "alphaG",       label: "Beugungswinkel 1. Max.",  einheit: "°",  stellen: 3, faktor: 180 / Math.PI }
  ],
  presets: [
    { name: "He-Ne-Laser",       werte: { lambda: 633, g: 0.25, e: 1.5, b: 0.05 } },
    { name: "Blauer Laser",      werte: { lambda: 450, g: 0.25, e: 1.5, b: 0.05 } },
    { name: "Enger Doppelspalt", werte: { lambda: 633, g: 0.10, e: 1.5, b: 0.05 } }
  ],
  vorhersage: {
    frage: "Der Spaltabstand g wird verdoppelt (z. B. von 0,25 mm auf 0,50 mm) — rücken die hellen Streifen auf dem Schirm auseinander oder zusammen?",
    optionen: [
      "Sie rücken auseinander",
      "Sie rücken zusammen",
      "Der Streifenabstand bleibt gleich"
    ],
    aufloesung: "Sie rücken zusammen. Im Streifenabstand Δa = λ·e/g steht g im Nenner: doppelter Spaltabstand → halber Streifenabstand. Je enger die beiden Spalte beieinander liegen, desto breiter wird das Muster — darum braucht man für gut sichtbare Streifen winzige Spaltabstände."
  },
  beobachtung: [
    "Stelle die Wellenlänge von Rot (633 nm) auf Blau (450 nm) und notiere den Streifenabstand Δa vorher und nachher. Passt das Verhältnis der beiden Werte zum Verhältnis der Wellenlängen?",
    "Miss den Streifenabstand direkt am Schirmbild: Lies an der x-Achse ab, wo zwei benachbarte Maxima liegen (die Markierungen bei ±Δa helfen), und vergleiche mit λ·e/g — den Wert liefert die Anzeige „Streifenabstand Δa“.",
    "Verkleinere die Spaltbreite b Schritt für Schritt: Was passiert mit der gestrichelten Einhüllenden — und warum verschwinden manche Doppelspalt-Maxima, obwohl ihre Maximabedingung g·sinα = k·λ erfüllt ist?",
    "Stelle g = 5·b ein (z. B. g = 0,25 mm und b = 0,05 mm): Welches Doppelspalt-Maximum fällt genau in das erste Minimum der Einhüllenden? Begründe mit den beiden Bedingungen — Maxima bei g·sinα = k·λ, Einzelspalt-Minima bei b·sinα = k·λ."
  ],
  modellgrenzen: "Fraunhofer-Näherung: Der Schirm ist weit entfernt (e ≫ g, b), gerechnet wird mit parallelen Strahlen. Das Licht ist ideal kohärent und monochromatisch (Laser). Die Intensität ist relativ — auf das Hauptmaximum normiert; reale Helligkeiten, Spaltunebenheiten und die Beugung quer zur Spaltrichtung bleiben außen vor.",
  bilanz: {
    dStreifen:    { label: "Streifenabstand Δa",      einheit: "mm", stellen: 3 },
    a1:           { label: "1. Maximum exakt",        einheit: "mm", stellen: 3 },
    einhuellMin1: { label: "1. Einhüllenden-Minimum", einheit: "mm", stellen: 2 }
  }
};

// ---------- Modell (rein algebraisch, keine Zeitabhängigkeit) ----------

const NM = 1e-9, MM = 1e-3;

// sinc(z) = sin(z)/z mit stetiger Fortsetzung sinc(0) = 1
export function sinc(z) {
  return Math.abs(z) < 1e-12 ? 1 : Math.sin(z) / z;
}

// Kenngrößen in SI aus den Reglerwerten (λ in nm, g und b in mm, e in m)
function kenngroessen(p) {
  const lambda = p.lambda * NM, g = p.g * MM, b = p.b * MM, e = p.e;
  const alpha1 = Math.asin(Math.min(1, lambda / g)); // Beugungswinkel des 1. Maximums
  const alphaB = Math.asin(Math.min(1, lambda / b)); // Winkel des 1. Einhüllenden-Minimums
  return {
    lambda, g, b, e,
    dStreifen: lambda * e / g,          // Streifenabstand in Kleinwinkelnäherung
    a1: e * Math.tan(alpha1),           // Ort des 1. Maximums, exakt: e·tan(arcsin(λ/g))
    einhuellMin1: e * Math.tan(alphaB), // Ort des 1. Einhüllenden-Minimums, exakt
    alpha1
  };
}

// Einzelspalt-Einhüllende sinc²(π·b·sinα/λ) am Schirmort x (in m)
export function einhuellende(x, z) {
  const sinAlpha = Math.sin(Math.atan(x / z.e));
  return sinc(Math.PI * z.b * sinAlpha / z.lambda) ** 2;
}

// Relative Intensität am Schirmort x (in m): Doppelspalt-Faktor × Einhüllende
export function intensitaet(x, z) {
  const sinAlpha = Math.sin(Math.atan(x / z.e));
  return Math.cos(Math.PI * z.g * sinAlpha / z.lambda) ** 2 * einhuellende(x, z);
}

export function init(p) {
  return { t: 0, ...kenngroessen(p) };
}

export function update() { /* statisch: nichts zu tun */ }

export function istFertig() { return true; }

export function messwerte(z) {
  // SI-Werte; die Umrechnung in mm bzw. Grad übernimmt der Anzeigen-Faktor im Manifest
  return { dStreifen: z.dStreifen, a1: z.a1, einhuellMin1: z.einhuellMin1, alphaG: z.alpha1 };
}

export function bilanz(z) {
  // Für die Validierung direkt in mm — wie die Sollwerte der Prüffälle
  return { dStreifen: z.dStreifen / MM, a1: z.a1 / MM, einhuellMin1: z.einhuellMin1 / MM };
}

// ---------- Weltausschnitt ----------
// x ist die Schirmkoordinate in mm, symmetrisch um 0. Halbbreite ≈ 1,2·einhüllMin1,
// geklemmt: mindestens 2 mm und 1,6·Δa (damit die ±Δa-Markierungen sichtbar bleiben),
// höchstens 130 mm. Die y-Richtung wird nicht im Weltmaßstab genutzt (Pixel-Layout in
// zeichne); der winzige y-Bereich sorgt dafür, dass der Maßstab allein der Breite folgt.
export function weltBereich(werte, zustand) {
  const z = zustand && zustand.dStreifen ? zustand : kenngroessen(werte);
  const xM = Math.min(130, Math.max(2, 1.2 * z.einhuellMin1 / MM, 1.6 * z.dStreifen / MM));
  return { xMin: -xM, xMax: xM, yMin: 0, yMax: 1e-6 };
}

// ---------- Darstellung ----------

// Farbton (HSL-Hue) näherungsweise aus der Wellenlänge in nm — wie die Spektren der
// Themenseiten die einzige Farbe, die nicht aus den Design-Tokens stammt.
function farbton(lambdaNm) {
  if (lambdaNm < 440) return 270 - 30 * (lambdaNm - 380) / 60; // Violett → Blau
  if (lambdaNm < 490) return 240 - 60 * (lambdaNm - 440) / 50; // Blau → Cyan
  if (lambdaNm < 510) return 180 - 60 * (lambdaNm - 490) / 20; // Cyan → Grün
  if (lambdaNm < 580) return 120 - 60 * (lambdaNm - 510) / 70; // Grün → Gelb
  if (lambdaNm < 645) return 60 - 60 * (lambdaNm - 580) / 65;  // Gelb → Rot
  return 0;                                                    // Rot
}

export function zeichne({ ctx, welt, zustand: z, werte: p, stil }) {
  const xM = welt.bereich.xMax;                  // halbe Schirmbreite in mm
  const links = welt.px(-xM), rechts = welt.px(xM);
  const hoehe = welt.hoehe;

  // Pixel-Layout: Farbband oben, Intensitätskurve darunter, x-Achse am unteren Rand
  const bandOben = 22;
  const bandHoehe = Math.max(30, Math.round(hoehe * 0.16));
  const bandUnten = bandOben + bandHoehe;
  const achseY = hoehe - 30;
  const kurveOben = bandUnten + 40;
  const kurveHoehe = Math.max(40, achseY - kurveOben);

  const hue = farbton(p.lambda);
  // Pixelspalte → Weltkoordinate (mm) → Schirmort (m) → relative Intensität
  const iAnPixel = px => intensitaet(welt.weltX(px) * MM, z);

  ctx.save();
  ctx.font = stil.schrift;

  // --- Schirmbild als Farbband: Helligkeit ∝ I(x), Farbton aus λ ---
  for (let x = Math.floor(links); x <= Math.ceil(rechts); x++) {
    // drei Teilabtastungen je Pixelspalte gegen Treppeneffekte bei sehr feinen Streifen
    const i = (iAnPixel(x + 0.17) + iAnPixel(x + 0.5) + iAnPixel(x + 0.83)) / 3;
    ctx.fillStyle = `hsl(${hue.toFixed(1)}, 100%, ${(52 * i).toFixed(2)}%)`;
    ctx.fillRect(x, bandOben, 1, bandHoehe);
  }
  ctx.strokeStyle = stil.beschriftung;
  ctx.lineWidth = 1;
  ctx.strokeRect(links, bandOben, rechts - links, bandHoehe);
  ctx.fillStyle = stil.beschriftung;
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  ctx.fillText("Schirmbild", links, bandOben - 4);

  // --- x-Achse in mm, symmetrisch um 0, mit feinem Raster im Kurvenbereich ---
  const schritt = schoeneSchrittweite(2 * xM, 8);
  const dezimalen = schritt < 1 ? 1 : 0;
  ctx.strokeStyle = stil.raster;
  ctx.beginPath();
  for (let x = Math.ceil(-xM / schritt) * schritt; x <= xM + 1e-9; x += schritt) {
    ctx.moveTo(welt.px(x), kurveOben - 12);
    ctx.lineTo(welt.px(x), achseY);
  }
  ctx.stroke();
  ctx.strokeStyle = stil.text;
  ctx.beginPath();
  ctx.moveTo(links, achseY);
  ctx.lineTo(rechts, achseY);
  for (let x = Math.ceil(-xM / schritt) * schritt; x <= xM + 1e-9; x += schritt) {
    ctx.moveTo(welt.px(x), achseY);
    ctx.lineTo(welt.px(x), achseY + 5);
  }
  ctx.stroke();
  ctx.fillStyle = stil.beschriftung;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (let x = Math.ceil(-xM / schritt) * schritt; x <= xM + 1e-9; x += schritt) {
    ctx.fillText(formatZahl(x, dezimalen), welt.px(x), achseY + 8);
  }
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText("x in mm", rechts, achseY - 5);
  ctx.textAlign = "left";
  ctx.fillText("relative Intensität I(x)", links, kurveOben - 16);

  // --- Einhüllende (Einzelspaltbeugung), gestrichelt ---
  ctx.strokeStyle = stil.beschriftung;
  ctx.lineWidth = Math.max(1.5, stil.linienstaerke - 0.5);
  ctx.setLineDash([7, 5]);
  ctx.beginPath();
  for (let x = links; x <= rechts; x += 2) {
    const y = achseY - einhuellende(welt.weltX(x) * MM, z) * kurveHoehe;
    if (x === links) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // --- Intensitätskurve I(x) ---
  ctx.strokeStyle = stil.akzent;
  ctx.lineWidth = stil.linienstaerke;
  ctx.lineJoin = "round";
  ctx.beginPath();
  for (let x = links; x <= rechts; x += 0.5) {
    const y = achseY - iAnPixel(x) * kurveHoehe;
    if (x === links) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // --- Markierungen bei ±Δa (Streifenabstand in Kleinwinkelnäherung) ---
  const dAmm = z.dStreifen / MM;
  ctx.strokeStyle = stil.ok;
  ctx.fillStyle = stil.ok;
  ctx.lineWidth = Math.max(1.5, stil.linienstaerke - 0.5);
  ctx.setLineDash([3, 4]);
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  [[-dAmm, "−Δa"], [dAmm, "+Δa"]].forEach(([xw, text]) => {
    const xs = welt.px(xw);
    ctx.beginPath();
    ctx.moveTo(xs, bandOben);
    ctx.lineTo(xs, achseY);
    ctx.stroke();
    ctx.fillText(text, xs, bandUnten + 6);
  });
  ctx.setLineDash([]);
  ctx.restore();
}

// ---------- Prüffälle (analytisch bekannte Lösungen; Orte in mm) ----------
// dStreifen = λ·e/g · 1000,  a1 = e·tan(arcsin(λ/g)) · 1000,  einhuellMin1 = e·tan(arcsin(λ/b)) · 1000

export const pruefFaelle = [
  {
    name: "He-Ne-Laser: λ = 633 nm, g = 0,25 mm, e = 1,5 m, b = 0,05 mm",
    parameter: { lambda: 633, g: 0.25, e: 1.5, b: 0.05 },
    toleranzProzent: 0.5,
    soll: { dStreifen: 3.798, a1: 3.798, einhuellMin1: 18.99 }
  },
  {
    name: "Blauer Laser, weiter Spaltabstand: λ = 450 nm, g = 0,5 mm, e = 2 m",
    parameter: { lambda: 450, g: 0.5, e: 2, b: 0.05 },
    toleranzProzent: 0.5,
    soll: { dStreifen: 1.8 }
  },
  {
    name: "Doppelte Spaltbreite: λ = 633 nm, g = 0,25 mm, e = 1,5 m, b = 0,1 mm",
    parameter: { lambda: 633, g: 0.25, e: 1.5, b: 0.1 },
    toleranzProzent: 0.5,
    soll: { einhuellMin1: 9.495 }
  }
];
