// Linearer Funktionenplotter — Geraden f(x) = m·x + b mit Steigungsdreieck.
// Modus „statisch": Parameter ändern → sofort neu rechnen und zeichnen.
// f(1), f(2), Nullstelle und Proportionalitäts-Check werden live berechnet.

import { formatZahl } from "../../../assets/js/sim/welt.js";

export const manifest = {
  id: "mathematik/linearer-plotter",
  titel: "Linearer Funktionenplotter",
  modus: "statisch",
  raster: false,     // eigenes 1er-Gitter statt Meter-Karoraster (das „m" dort wäre hier irreführend)
  werkzeuge: false,  // Lineal/Winkelmesser messen in Metern — hier ohne Bedeutung
  parameter: [
    { id: "m", label: "Steigung m",          einheit: "", min: -3, max: 3, schritt: 0.1, start: 1 },
    { id: "b", label: "y-Achsenabschnitt b", einheit: "", min: -5, max: 5, schritt: 0.5, start: 1 }
  ],
  anzeigen: [
    { id: "f1",           label: "f(1)",                   einheit: "", stellen: 2 },
    { id: "f2",           label: "f(2)",                   einheit: "", stellen: 2 },
    { id: "nullstelle",   label: "Nullstelle",             einheit: "", stellen: 2 },
    { id: "proportional", label: "proportional? (1 = ja)", einheit: "", stellen: 0 }
  ],
  presets: [
    { name: "Ursprungsgerade", werte: { m: 1.5, b: 0 } },
    { name: "Fallende Gerade", werte: { m: -0.5, b: 2 } },
    { name: "Klassiker",       werte: { m: 1, b: 1 } }
  ],
  vorhersage: {
    frage: "Was ändert sich am Graphen, wenn nur b größer wird — und was, wenn nur m?",
    optionen: [
      "b verschiebt die Gerade parallel, m macht sie steiler",
      "b macht die Gerade steiler, m verschiebt sie parallel",
      "Beide verschieben die Gerade nur nach oben"
    ],
    aufloesung: "Wächst nur b, wandert die ganze Gerade parallel nach oben — jeder Punkt rückt um denselben Betrag hoch, die Steilheit bleibt gleich. Wächst nur m, dreht sich die Gerade um ihren Schnittpunkt mit der y-Achse (0 | b) und wird steiler."
  },
  beobachtung: [
    "Lies das Steigungsdreieck ab: 1 nach rechts — wie viel geht es nach oben? Ändere m und beobachte, wie das Dreieck mitwächst.",
    "Verschiebe nur b: Die Gerade wandert parallel. Warum ändert sich die Steigung dabei nicht?",
    "Stelle m negativ ein. Was bedeutet das für den Verlauf der Geraden — und in welche Richtung zeigt jetzt das Steigungsdreieck?",
    "Stelle b = 0 ein: Jetzt ist f proportional. Prüfe die Quotientengleichheit y/x an zwei Punkten, z. B. mit den Anzeigen f(1) und f(2)."
  ],
  modellgrenzen: "Dargestellt wird nur der Ausschnitt −6 ≤ x ≤ 6 und −6 ≤ y ≤ 6; m und b rasten im Schrittraster der Regler (0,1 bzw. 0,5).",
  bilanz: {
    f1:           { label: "f(1)",                   einheit: "", stellen: 2 },
    f2:           { label: "f(2)",                   einheit: "", stellen: 2 },
    nullstelle:   { label: "Nullstelle x₀",          einheit: "", stellen: 2 },
    proportional: { label: "proportional? (1 = ja)", einheit: "", stellen: 0 }
  },
  welt: { xMin: -6, xMax: 6, yMin: -6, yMax: 6 }
};

// Kennwerte der Geraden f(x) = m·x + b analytisch bestimmen
function rechne(p) {
  const erg = {
    f1: p.m * 1 + p.b,
    f2: p.m * 2 + p.b,
    nullstelle: NaN, // waagerechte Gerade (m = 0): keine bzw. unendlich viele Nullstellen → Anzeige „–"
    proportional: Math.abs(p.b) < 1e-9 ? 1 : 0
  };
  if (Math.abs(p.m) >= 1e-9) erg.nullstelle = -p.b / p.m;
  return erg;
}

export function init(p) {
  return { t: 0, ...rechne(p) };
}

export function update() { /* statisch: nichts zu tun */ }

export function messwerte(z) {
  return { f1: z.f1, f2: z.f2, nullstelle: z.nullstelle, proportional: z.proportional };
}

export function istFertig() { return true; }

export function bilanz(z) {
  const b = { f1: z.f1, f2: z.f2, proportional: z.proportional };
  if (isFinite(z.nullstelle)) b.nullstelle = z.nullstelle; // Konvention wie funktionsplotter: NaN-Werte weglassen
  return b;
}

// Farbtoken lesen, die der Engine-Stil nicht enthält (läuft nur im Browser)
function leseToken(name, ersatz) {
  if (typeof document === "undefined") return ersatz;
  const wert = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return wert || ersatz;
}

// Funktionsterm hübsch formatieren, z. B. „f(x) = −0,5·x + 2,0"
function termText(p) {
  const bT = p.b === 0 ? "" : ` ${p.b > 0 ? "+" : "−"} ${formatZahl(Math.abs(p.b), 1)}`;
  return `f(x) = ${formatZahl(p.m, 1)}·x${bT}`;
}

export function zeichne({ ctx, welt, werte: p, zustand: z, stil }) {
  const b = welt.bereich;
  const farbeGerade = leseToken("--mathe", stil.akzent);

  // Gitter im 1er-Raster (Kästchen zählen fürs Steigungsdreieck)
  ctx.strokeStyle = stil.raster;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = Math.ceil(b.xMin); x <= b.xMax; x++) {
    ctx.moveTo(welt.px(x), welt.py(b.yMin));
    ctx.lineTo(welt.px(x), welt.py(b.yMax));
  }
  for (let y = Math.ceil(b.yMin); y <= b.yMax; y++) {
    ctx.moveTo(welt.px(b.xMin), welt.py(y));
    ctx.lineTo(welt.px(b.xMax), welt.py(y));
  }
  ctx.stroke();

  // Koordinatenachsen durch den Ursprung, mit Pfeilspitzen
  ctx.strokeStyle = stil.text;
  ctx.fillStyle = stil.text;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(welt.px(b.xMin), welt.py(0)); ctx.lineTo(welt.px(b.xMax), welt.py(0));
  ctx.moveTo(welt.px(0), welt.py(b.yMin)); ctx.lineTo(welt.px(0), welt.py(b.yMax));
  ctx.stroke();
  ctx.beginPath(); // Pfeil der x-Achse
  ctx.moveTo(welt.px(b.xMax) + 9, welt.py(0));
  ctx.lineTo(welt.px(b.xMax) - 2, welt.py(0) - 4.5);
  ctx.lineTo(welt.px(b.xMax) - 2, welt.py(0) + 4.5);
  ctx.closePath(); ctx.fill();
  ctx.beginPath(); // Pfeil der y-Achse
  ctx.moveTo(welt.px(0), welt.py(b.yMax) - 9);
  ctx.lineTo(welt.px(0) - 4.5, welt.py(b.yMax) + 2);
  ctx.lineTo(welt.px(0) + 4.5, welt.py(b.yMax) + 2);
  ctx.closePath(); ctx.fill();
  ctx.font = stil.schrift;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("x", welt.px(b.xMax) + 4, welt.py(0) + 16);
  ctx.fillText("y", welt.px(0) + 8, welt.py(b.yMax) - 2);
  // Achsenzahlen (ganze Zahlen, 0 ausgelassen)
  ctx.fillStyle = stil.beschriftung;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (let x = Math.ceil(b.xMin); x <= b.xMax; x++) {
    if (x !== 0) ctx.fillText(formatZahl(x, 0), welt.px(x), welt.py(0) + 5);
  }
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let y = Math.ceil(b.yMin); y <= b.yMax; y++) {
    if (y !== 0) ctx.fillText(formatZahl(y, 0), welt.px(0) - 5, welt.py(y));
  }

  // Gerade f(x) = m·x + b — kräftig in der Fachfarbe, exakt auf den Ausschnitt zugeschnitten
  let xA = b.xMin, xB = b.xMax;
  if (Math.abs(p.m) > 1e-12) {
    const xBeiYMin = (b.yMin - p.b) / p.m;
    const xBeiYMax = (b.yMax - p.b) / p.m;
    xA = Math.max(xA, Math.min(xBeiYMin, xBeiYMax));
    xB = Math.min(xB, Math.max(xBeiYMin, xBeiYMax));
  }
  if (xA <= xB && p.b + p.m * xA <= b.yMax + 1e-9 && p.b + p.m * xA >= b.yMin - 1e-9) {
    ctx.strokeStyle = farbeGerade;
    ctx.lineWidth = stil.linienstaerke + 1;
    ctx.beginPath();
    ctx.moveTo(welt.px(xA), welt.py(p.m * xA + p.b));
    ctx.lineTo(welt.px(xB), welt.py(p.m * xB + p.b));
    ctx.stroke();
  }

  // Steigungsdreieck ab (0 | b): 1 nach rechts, m nach oben/unten — in Akzentfarbe
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = stil.akzent;
  ctx.beginPath();
  ctx.moveTo(welt.px(0), welt.py(p.b));
  ctx.lineTo(welt.px(1), welt.py(p.b));
  ctx.lineTo(welt.px(1), welt.py(p.b + p.m));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = stil.akzent;
  ctx.fillStyle = stil.akzent;
  ctx.lineWidth = stil.linienstaerke;
  ctx.beginPath(); // beide Katheten, die Hypotenuse ist die Gerade selbst
  ctx.moveTo(welt.px(0), welt.py(p.b));
  ctx.lineTo(welt.px(1), welt.py(p.b));
  ctx.lineTo(welt.px(1), welt.py(p.b + p.m));
  ctx.stroke();
  ctx.font = "bold " + stil.schrift;
  ctx.textAlign = "center";
  ctx.textBaseline = p.m >= 0 ? "top" : "bottom"; // „1" außerhalb des Dreiecks beschriften
  ctx.fillText("1", welt.px(0.5), welt.py(p.b) + (p.m >= 0 ? 4 : -4));
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(`m = ${formatZahl(p.m, 1)}`, welt.px(1) + 6, welt.py(p.b + p.m / 2));

  // y-Achsenabschnitt b markieren
  ctx.fillStyle = stil.ok;
  ctx.beginPath();
  ctx.arc(welt.px(0), welt.py(p.b), 5, 0, 2 * Math.PI);
  ctx.fill();
  ctx.font = "bold " + stil.schrift;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillText(`b = ${formatZahl(p.b, 1)}`, welt.px(0) - 8, welt.py(p.b) - 12);

  // Nullstelle als Punkt mit Beschriftung (falls im Bild)
  if (isFinite(z.nullstelle) && z.nullstelle >= b.xMin && z.nullstelle <= b.xMax) {
    ctx.fillStyle = stil.fehler;
    ctx.beginPath();
    ctx.arc(welt.px(z.nullstelle), welt.py(0), 5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.font = stil.schrift;
    const linksrum = z.nullstelle > b.xMax - 2;
    ctx.textAlign = linksrum ? "right" : "left";
    ctx.textBaseline = "bottom";
    ctx.fillText(`x₀ = ${formatZahl(z.nullstelle, 2)}`, welt.px(z.nullstelle) + (linksrum ? -8 : 8), welt.py(0) - 8);
  }

  // Funktionsterm als Überschrift im Graphen
  ctx.fillStyle = stil.text;
  ctx.font = "bold " + stil.schrift;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(termText(p), welt.px(b.xMin) + 8, welt.py(b.yMax) + 18);
}

// ---------- Prüffälle (f(1), f(2), Nullstelle und Proportionalität analytisch) ----------

export const pruefFaelle = [
  {
    name: "m = 1, b = 1 (Klassiker)",
    parameter: { m: 1, b: 1 },
    toleranzProzent: 0.2,
    soll: { f1: 2, nullstelle: -1, proportional: 0 }
  },
  {
    name: "m = −0,5, b = 2 (fallende Gerade)",
    parameter: { m: -0.5, b: 2 },
    toleranzProzent: 0.2,
    soll: { f1: 1.5, nullstelle: 4 }
  },
  {
    name: "m = 1,5, b = 0 (Ursprungsgerade)",
    parameter: { m: 1.5, b: 0 },
    toleranzProzent: 0.2,
    soll: { proportional: 1, f2: 3 }
  }
];
