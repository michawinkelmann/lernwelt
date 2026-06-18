// Einheitskreis und Sinuskurve — vom drehenden Punkt zur Welle (Mathematik, Klasse 10).
// Modus „statisch": Parameter ändern → sofort neu rechnen und zeichnen.
// Links dreht ein Punkt P auf dem Einheitskreis (Winkel α, auch über 360° hinaus),
// rechts entsteht die Kurve f(x) = a · sin(b · x); die dezente Referenzkurve sin(x)
// macht die Wirkung von a und b sichtbar. Die gestrichelte Höhenlinie überträgt die
// y-Koordinate von P in das Gradsystem — der klassische „Abroll"-Effekt.

import { formatZahl } from "../../../assets/js/sim/welt.js";

export const manifest = {
  id: "mathematik/einheitskreis-sinus",
  titel: "Einheitskreis und Sinuskurve",
  modus: "statisch",
  raster: false,     // eigenes Grad-Raster statt Meter-Karoraster
  werkzeuge: false,  // Lineal/Winkelmesser messen in Metern — hier ohne Bedeutung
  parameter: [
    { id: "winkel", label: "Winkel α",    einheit: "°", min: 0,   max: 720, schritt: 1,   start: 50 },
    { id: "a",      label: "Amplitude a", einheit: "",  min: 0.5, max: 3,   schritt: 0.1, start: 1 },
    { id: "b",      label: "Faktor b",    einheit: "",  min: 0.5, max: 3,   schritt: 0.5, start: 1 }
  ],
  anzeigen: [
    { id: "sinWert",    label: "sin(α)",               einheit: "",  stellen: 3 },
    { id: "funkWert",   label: "a · sin(b·α)",         einheit: "",  stellen: 3 },
    { id: "periode",    label: "Periode",              einheit: "°", stellen: 1 },
    { id: "hochpunktX", label: "erster Hochpunkt bei", einheit: "°", stellen: 1 }
  ],
  presets: [
    { name: "Reiner Sinus",      werte: { winkel: 50, a: 1, b: 1 } },
    { name: "Doppelte Frequenz", werte: { winkel: 45, a: 1, b: 2 } },
    { name: "Riesenrad-Form",    werte: { winkel: 90, a: 2, b: 0.5 } }
  ],
  vorhersage: {
    frage: "b wird verdoppelt — wird die Kurve höher oder enger?",
    optionen: ["Höher", "Enger", "Höher und enger"],
    aufloesung: "Enger! Der Faktor b steckt im Argument des Sinus und staucht die Kurve nur in x-Richtung: Die Periode schrumpft von 360° auf 360°/2 = 180°, zwischen 0° und 360° passen jetzt zwei volle Wellen. Die Höhe der Kurve (Amplitude) regelt allein der Faktor a vor dem Sinus — sie bleibt unverändert."
  },
  beobachtung: [
    "Stelle a = 1 und b = 1 und lies sin(α) für 30°, 90° und 150° ab. Was fällt dir beim Vergleich von 30° und 150° auf — und wo liegen die beiden Punkte auf dem Kreis?",
    "Stelle a = 2: Was ändert sich an der Kurve, was bleibt gleich? Beobachte dabei auch die farbige Strecke am Einheitskreis.",
    "Stelle b = 2: Wo liegt der erste Hochpunkt — und wie passt das zur angezeigten Periode?",
    "Drehe den Winkel über 360° hinaus: Warum wiederholen sich die Sinuswerte? Verfolge dazu den Punkt auf dem Kreis."
  ],
  modellgrenzen: "Winkel werden in Grad gemessen (das Bogenmaß folgt in der Oberstufe), und die Darstellung ist auf 0° bis 720° begrenzt — die Sinuskurve selbst läuft in beide Richtungen unendlich weiter.",
  bilanz: {
    sinWert:    { label: "sin(α)",               einheit: "",  stellen: 3 },
    funkWert:   { label: "a · sin(b·α)",         einheit: "",  stellen: 3 },
    periode:    { label: "Periode",              einheit: "°", stellen: 1 },
    hochpunktX: { label: "erster Hochpunkt bei", einheit: "°", stellen: 1 }
  },
  welt: { xMin: -3.7, xMax: 8.4, yMin: -3.4, yMax: 3.4 }
};

// ---------- Modell ----------

const GRAD = Math.PI / 180;

function rechne(p) {
  return {
    sinWert:    Math.sin(p.winkel * GRAD),         // y-Koordinate des Kreispunkts
    cosWert:    Math.cos(p.winkel * GRAD),         // x-Koordinate (nur für die Zeichnung)
    funkWert:   p.a * Math.sin(p.b * p.winkel * GRAD),
    periode:    360 / p.b,
    hochpunktX: 90 / p.b
  };
}

export function init(p) {
  return { t: 0, ...rechne(p) };
}

export function update() { /* statisch: nichts zu tun */ }

export function messwerte(z) {
  return { sinWert: z.sinWert, funkWert: z.funkWert, periode: z.periode, hochpunktX: z.hochpunktX };
}

export function istFertig() { return true; }

export function bilanz(z) {
  return { sinWert: z.sinWert, funkWert: z.funkWert, periode: z.periode, hochpunktX: z.hochpunktX };
}

// ---------- Darstellung ----------
// Geometrie: Einheitskreis um (KX|0) mit festem Radius 1; rechts das Gradsystem,
// 90° entsprechen 1 Welteinheit (0° … 720° → x = 0 … 8). Beide Tafeln teilen sich
// die y-Skala, damit die gestrichelte Höhenlinie wirklich „auf gleicher Höhe" liegt.

const KX = -2.45;                 // Mittelpunkt des Einheitskreises
const X720 = 8;                   // Weltkoordinate von 720°
const gradZuX = g => g / 90;

// Kräftige Mathe-Farbe der Seite (Fallback: Akzentfarbe aus dem Stil)
function matheFarbe(stil) {
  const wert = getComputedStyle(document.documentElement).getPropertyValue("--mathe").trim();
  return wert || stil.akzent;
}

// Kleine Pfeilspitze ans Achsenende (richtung in rad, 0 = nach rechts)
function pfeil(ctx, x, y, richtung) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(richtung);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-9, -4.5);
  ctx.lineTo(-9, 4.5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Sinuskurve y = a·sin(b·x) von 0° bis 720° (Stützstellen alle 1,5°)
function kurve(ctx, welt, a, b) {
  ctx.beginPath();
  for (let g = 0; g <= 720; g += 1.5) {
    const x = welt.px(gradZuX(g));
    const y = welt.py(a * Math.sin(b * g * GRAD));
    if (g === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function funktionsTerm(p) {
  return "f(x) = " + formatZahl(p.a, 1) + " · sin(" + formatZahl(p.b, 1) + " · x)";
}

export function zeichne({ ctx, welt, zustand: z, werte: p, stil }) {
  const mathe = matheFarbe(stil);
  const xP = KX + z.cosWert;       // x-Position des Kreispunkts P (Weltkoordinaten)
  const xA = gradZuX(p.winkel);    // aktueller Winkel im Gradsystem

  ctx.save();
  ctx.font = stil.schrift;

  // ---- Gradsystem: Gitter bei 90°-Schritten und y = ±1 ----
  ctx.strokeStyle = stil.raster;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let g = 90; g <= 720; g += 90) {
    ctx.moveTo(welt.px(gradZuX(g)), welt.py(-3.05));
    ctx.lineTo(welt.px(gradZuX(g)), welt.py(3.05));
  }
  [1, -1].forEach(y => {
    ctx.moveTo(welt.px(0), welt.py(y));
    ctx.lineTo(welt.px(X720), welt.py(y));
  });
  ctx.stroke();

  // ---- Achsen mit Pfeilen, Strichen und Beschriftung ----
  ctx.strokeStyle = stil.text;
  ctx.fillStyle = stil.text;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(welt.px(0), welt.py(0));
  ctx.lineTo(welt.px(8.22), welt.py(0));
  ctx.moveTo(welt.px(0), welt.py(-3.05));
  ctx.lineTo(welt.px(0), welt.py(3.22));
  [2, 3, -2, -3].forEach(y => {           // ±1 haben bereits Gitterlinien
    ctx.moveTo(welt.px(0) - 4, welt.py(y));
    ctx.lineTo(welt.px(0) + 4, welt.py(y));
  });
  ctx.stroke();
  pfeil(ctx, welt.px(8.22), welt.py(0), 0);
  pfeil(ctx, welt.px(0), welt.py(3.22), -Math.PI / 2);

  ctx.fillStyle = stil.beschriftung;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText("x in °", welt.px(8.3), welt.py(0) - 6);
  ctx.textAlign = "left";
  ctx.fillText("y", welt.px(0) + 8, welt.py(3.05));
  const schrittGrad = welt.laenge(1) >= 34 ? 90 : 180;   // bei wenig Platz nur alle 180°
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (let g = 0; g <= 720; g += schrittGrad) {
    ctx.fillText(g + "°", welt.px(gradZuX(g)), welt.py(-3.05) + 5);
  }
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  [1, 2, 3, -1, -2, -3].forEach(y => {
    ctx.fillText(formatZahl(y, 0), welt.px(0) - 7, welt.py(y));
  });

  // ---- Kurven: sin(x) dezent als Referenz, a·sin(b·x) kräftig ----
  ctx.strokeStyle = stil.beschriftung;
  ctx.lineWidth = Math.max(1.25, stil.linienstaerke - 1);
  kurve(ctx, welt, 1, 1);
  ctx.strokeStyle = mathe;
  ctx.lineWidth = stil.linienstaerke + 1;
  kurve(ctx, welt, p.a, p.b);

  ctx.fillStyle = stil.beschriftung;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText("sin(x)", welt.px(gradZuX(450)), welt.py(1.08));
  ctx.fillStyle = mathe;
  ctx.font = "bold " + stil.schrift;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(funktionsTerm(p), welt.px(0.1), welt.py(3.17));
  ctx.font = stil.schrift;

  // ---- Abroll-Verbindung: Höhenlinie vom Kreis zur Kurve, Lot auf die x-Achse ----
  ctx.strokeStyle = stil.akzent;
  ctx.lineWidth = Math.max(1.5, stil.linienstaerke - 0.5);
  ctx.setLineDash([7, 5]);
  ctx.beginPath();
  ctx.moveTo(welt.px(xP), welt.py(z.sinWert));
  ctx.lineTo(welt.px(xA), welt.py(z.sinWert));
  ctx.moveTo(welt.px(xA), welt.py(0));
  ctx.lineTo(welt.px(xA), welt.py(z.funkWert));
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = stil.akzent;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText("sin(α)", welt.px(-0.72), welt.py(z.sinWert) - 4);

  // Referenzpunkt (α | sin α) auf der dezenten Kurve (hohl)
  ctx.beginPath();
  ctx.arc(welt.px(xA), welt.py(z.sinWert), 3.5, 0, 2 * Math.PI);
  ctx.fillStyle = stil.flaeche;
  ctx.fill();
  ctx.strokeStyle = stil.beschriftung;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // ---- Einheitskreis ----
  ctx.strokeStyle = stil.beschriftung;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(welt.px(KX - 1.28), welt.py(0));
  ctx.lineTo(welt.px(KX + 1.28), welt.py(0));
  ctx.moveTo(welt.px(KX), welt.py(-1.28));
  ctx.lineTo(welt.px(KX), welt.py(1.28));
  ctx.stroke();
  ctx.fillStyle = stil.beschriftung;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("1", welt.px(KX + 1), welt.py(0) + 5);
  ctx.fillText("−1", welt.px(KX - 1), welt.py(0) + 5);

  ctx.beginPath();
  ctx.arc(welt.px(KX), welt.py(0), welt.laenge(1), 0, 2 * Math.PI);
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = mathe;
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = mathe;
  ctx.lineWidth = stil.linienstaerke;
  ctx.stroke();

  // Winkelbogen — über 360° hinaus läuft der Punkt einfach weiter um
  const alphaEff = ((p.winkel % 360) + 360) % 360;
  if (alphaEff > 1) {
    ctx.strokeStyle = stil.akzent;
    ctx.lineWidth = Math.max(2, stil.linienstaerke - 1);
    ctx.beginPath();
    ctx.arc(welt.px(KX), welt.py(0), welt.laenge(0.32), 0, -alphaEff * GRAD, true);
    ctx.stroke();
  }
  ctx.fillStyle = stil.akzent;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const halb = Math.max(alphaEff / 2, 12) * GRAD;
  ctx.fillText("α", welt.px(KX + 0.55 * Math.cos(halb)), welt.py(0.55 * Math.sin(halb)));
  ctx.font = "bold " + stil.schrift;
  ctx.fillText("α = " + formatZahl(p.winkel, 0) + "°", welt.px(KX), welt.py(1.72));
  ctx.font = stil.schrift;
  ctx.fillStyle = stil.beschriftung;
  ctx.fillText("Einheitskreis (r = 1)", welt.px(KX), welt.py(-1.62));

  // Radius zum Kreispunkt P und farbige y-Strecke (= sin α)
  ctx.strokeStyle = mathe;
  ctx.lineWidth = stil.linienstaerke;
  ctx.beginPath();
  ctx.moveTo(welt.px(KX), welt.py(0));
  ctx.lineTo(welt.px(xP), welt.py(z.sinWert));
  ctx.stroke();
  ctx.strokeStyle = stil.akzent;
  ctx.lineWidth = stil.linienstaerke + 2.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(welt.px(xP), welt.py(0));
  ctx.lineTo(welt.px(xP), welt.py(z.sinWert));
  ctx.stroke();
  ctx.lineCap = "butt";

  // Punkt P mit Namen (Beschriftung wandert außen mit)
  ctx.fillStyle = stil.akzent;
  ctx.beginPath();
  ctx.arc(welt.px(xP), welt.py(z.sinWert), stil.linienstaerke + 3, 0, 2 * Math.PI);
  ctx.fill();
  ctx.fillStyle = stil.text;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("P", welt.px(xP) + 13 * z.cosWert, welt.py(z.sinWert) - 13 * z.sinWert);

  // ---- aktueller Punkt (winkel | funkWert) auf der Hauptkurve ----
  ctx.fillStyle = mathe;
  ctx.beginPath();
  ctx.arc(welt.px(xA), welt.py(z.funkWert), stil.linienstaerke + 3.5, 0, 2 * Math.PI);
  ctx.fill();
  ctx.fillStyle = stil.text;
  ctx.font = "bold " + stil.schrift;
  ctx.textAlign = p.winkel > 580 ? "right" : "left";
  ctx.textBaseline = "middle";
  ctx.fillText("(" + formatZahl(p.winkel, 0) + "° | " + formatZahl(z.funkWert, 2) + ")",
    welt.px(xA) + (p.winkel > 580 ? -10 : 10), welt.py(z.funkWert) + (z.funkWert >= 0 ? -14 : 14));

  ctx.restore();
}

// ---------- Prüffälle (analytisch bekannte Sinuswerte) ----------

export const pruefFaelle = [
  {
    name: "α = 30°, a = 1, b = 1 (sin 30° = 0,5)",
    parameter: { winkel: 30, a: 1, b: 1 },
    toleranzProzent: 0.2,
    soll: { sinWert: 0.5, funkWert: 0.5, periode: 360 }
  },
  {
    name: "α = 45°, a = 2, b = 2 (2 · sin 90° = 2)",
    parameter: { winkel: 45, a: 2, b: 2 },
    toleranzProzent: 0.2,
    soll: { funkWert: 2, hochpunktX: 45 }
  },
  {
    name: "α = 270°, a = 1, b = 3 (sin 810° = sin 90° = 1)",
    parameter: { winkel: 270, a: 1, b: 3 },
    toleranzProzent: 0.2,
    soll: { funkWert: 1, periode: 120 }
  }
];
