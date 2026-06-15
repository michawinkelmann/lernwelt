// Symmetrie-Werkstatt — zwei Symmetriearten der Ebene zum Anfassen (Geometrie, Sek I).
// Modus "statisch": an den Reglern stellst du ein, was gezeigt wird, und das Bild wird
// sofort neu gerechnet und gezeichnet. Zwei Modi (Regler "Modus"):
//
//   Modus 0 — ACHSENSPIEGELUNG: Eine asymmetrische "L"-Figur wird an einer SENKRECHTEN
//   Spiegelachse x = s gespiegelt. Jeder Punkt (x, y) wird auf (2s − x, y) abgebildet:
//   die y-Koordinate bleibt, die x-Koordinate klappt an der Achse um. Der Abstand eines
//   Punktes zur Achse ist genauso groß wie der Abstand des Bildpunktes zur Achse, und die
//   Verbindungsstrecke Punkt—Bildpunkt steht senkrecht auf der Achse.
//
//   Modus 1 — DREHSYMMETRIE / REGELMÄSSIGES VIELECK: Ein regelmäßiges n-Eck (Mittelpunkt
//   im Ursprung) wird mit allen seinen Symmetrieachsen gezeichnet. Ein regelmäßiges n-Eck
//   hat genau n Spiegelachsen (Symmetrieachsen) und ist drehsymmetrisch der Ordnung n:
//   Dreht man es um den Drehwinkel 360°/n um den Mittelpunkt, fällt es auf sich selbst.
//
// Modell (exakt):
//   Spiegelung an x = s:  (x, y) → (2s − x, y).
//   Regelmäßiges n-Eck:   n Symmetrieachsen, Drehwinkel = 360°/n.
//   Fester Referenz-Testpunkt für die Spiegelung: P = (3, 2) → P' = (2s − 3, 2).

import { formatZahl } from "../../../assets/js/sim/welt.js";

export const manifest = {
  id: "mathematik/symmetrie-werkstatt",
  titel: "Symmetrie-Werkstatt",
  modus: "statisch",
  raster: false,     // eigenes Gitter mit Achsenkreuz (abstrakte Ebene, kein "m")
  werkzeuge: false,  // Werte stehen in der Anzeige; Lineal/Winkelmesser nicht nötig
  parameter: [
    { id: "modus",   label: "Modus", typ: "auswahl", optionen: [{ wert: 0, label: "Spiegelung" }, { wert: 1, label: "n-Eck" }], min: 0, max: 1, schritt: 1, start: 0 },
    { id: "achse_s", label: "Spiegelachse x = s (nur Modus 0)",   einheit: "", min: -3, max: 3, schritt: 0.5, start: 0 },
    { id: "ecken_n", label: "Eckenzahl n des Vielecks (nur Modus 1)", einheit: "", min: 3, max: 8, schritt: 1, start: 5 }
  ],
  anzeigen: [
    { id: "bild_x",     label: "Modus 0 · Bild von P=(3|2): x′ = 2s − 3", einheit: "", stellen: 2 },
    { id: "bild_y",     label: "Modus 0 · Bild von P=(3|2): y′",          einheit: "", stellen: 2 },
    { id: "achsen",     label: "Modus 1 · Anzahl Symmetrieachsen",        einheit: "", stellen: 0 },
    { id: "drehwinkel", label: "Modus 1 · kleinster Drehwinkel 360°/n",   einheit: "°", stellen: 1 }
  ],
  presets: [
    { name: "Spiegelung an y-Achse (s = 0)", werte: { modus: 0, achse_s: 0 } },
    { name: "Quadrat (4 Achsen)",            werte: { modus: 1, ecken_n: 4 } },
    { name: "Regelmäßiges Sechseck",         werte: { modus: 1, ecken_n: 6 } }
  ],
  vorhersage: {
    frage: "Wie viele Spiegelachsen (Symmetrieachsen) hat ein Quadrat?",
    optionen: [
      "2 Achsen",
      "4 Achsen",
      "Unendlich viele"
    ],
    aufloesung: "Ein Quadrat hat genau 4 Symmetrieachsen: zwei durch die Seitenmitten (waagerecht und senkrecht) und zwei durch die gegenüberliegenden Ecken (die Diagonalen). Allgemein hat ein regelmäßiges n-Eck genau n Symmetrieachsen. Unendlich viele Achsen hat nur der Kreis. Stelle das Preset „Quadrat (4 Achsen)“ ein und zähle nach."
  },
  beobachtung: [
    "Modus 0 (Spiegelung): Verschiebe die Spiegelachse mit dem Regler „x = s“. Wohin wandert das Spiegelbild, wenn die Achse nach rechts rückt? Bleibt die Höhe (y-Koordinate) der Bildpunkte gleich?",
    "Modus 0: Wähle einen Eckpunkt der Figur. Miss (mit dem Gitter) den Abstand vom Punkt zur Achse und den Abstand von der Achse zum Bildpunkt. Was stellst du fest? Wie liegt die Verbindungsstrecke zur Achse?",
    "Modus 1 (n-Eck): Erhöhe die Eckenzahl n von 3 auf 8. Wie hängt die Anzahl der Symmetrieachsen mit n zusammen? Wie verändert sich der kleinste Drehwinkel 360°/n?",
    "Modus 1: Vergleiche ein n-Eck mit gerader Eckenzahl (z. B. n = 6) und eines mit ungerader (z. B. n = 5). Wo verlaufen die Achsen jeweils — durch Ecken, durch Seitenmitten oder durch beides?"
  ],
  modellgrenzen: "Modus 0 zeigt nur Spiegelungen an einer SENKRECHTEN Achse x = s — schräge oder waagerechte Spiegelachsen sind hier nicht einstellbar. Modus 1 betrachtet nur REGELMÄSSIGE Vielecke (alle Seiten und Winkel gleich); unregelmäßige Figuren haben in der Regel weniger oder keine Symmetrieachsen. Ein Kreis (Grenzfall n → ∞) hätte unendlich viele Achsen.",
  bilanz: {
    bild_x:     { label: "Bild von P=(3|2): x′ = 2s − 3", einheit: "", stellen: 4 },
    bild_y:     { label: "Bild von P=(3|2): y′",          einheit: "", stellen: 4 },
    achsen:     { label: "Anzahl Symmetrieachsen des n-Ecks", einheit: "", stellen: 0 },
    drehwinkel: { label: "kleinster Drehwinkel 360°/n",   einheit: "°", stellen: 4 }
  }
};

// ---------- Modell ----------

// Referenz-Testpunkt für die Spiegelung (fest)
const P_TEST = { x: 3, y: 2 };

// Spiegelung eines Punktes (x, y) an der senkrechten Achse x = s  ->  (2s − x, y)
function spiegelPunkt(s, x, y) {
  return [2 * s - x, y];
}

export function init(p) {
  const modus = Math.round(p.modus);
  const s = p.achse_s;
  const n = Math.round(p.ecken_n);
  const [bx, by] = spiegelPunkt(s, P_TEST.x, P_TEST.y);
  return {
    t: 0,
    modus,
    s,
    n,
    bild_x: bx,
    bild_y: by,
    achsen: n,
    drehwinkel: 360 / n
  };
}

export function update() { /* statisch: nichts zu rechnen */ }

export function messwerte(z) {
  return {
    bild_x: z.bild_x,
    bild_y: z.bild_y,
    achsen: z.achsen,
    drehwinkel: z.drehwinkel
  };
}

export function istFertig() { return true; }

export function bilanz(z, p) {
  const s = p.achse_s;
  const n = Math.round(p.ecken_n);
  const [bx, by] = spiegelPunkt(s, P_TEST.x, P_TEST.y);
  return { bild_x: bx, bild_y: by, achsen: n, drehwinkel: 360 / n };
}

// ---------- Sichtbarer Weltausschnitt (fix, symmetrisch) ----------
export function weltBereich() {
  return { xMin: -6, xMax: 6, yMin: -5, yMax: 5 };
}

// ---------- Darstellung ----------

// Fachfarbe Mathematik aus den Design-Tokens (Fallback: Akzentfarbe der Engine)
function matheFarbe(stil) {
  if (typeof document === "undefined") return stil.akzent;
  const wert = getComputedStyle(document.documentElement).getPropertyValue("--mathe").trim();
  return wert || stil.akzent;
}

// Hex/rgb-Farbe mit Alpha versehen
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

// Geschlossenes Polygon (gefüllte Figur) aus Welt-Punkten zeichnen
function polygonPfad(ctx, welt, punkte) {
  ctx.beginPath();
  punkte.forEach((q, i) => {
    const X = welt.px(q[0]), Y = welt.py(q[1]);
    if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
  });
  ctx.closePath();
}

// Eigenes Koordinatengitter + Achsenkreuz (ohne Einheit "m")
function zeichneGitter(ctx, welt, stil) {
  const GB = welt.bereich;
  ctx.save();
  ctx.strokeStyle = stil.raster; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let gx = Math.ceil(GB.xMin); gx <= GB.xMax; gx++) { ctx.moveTo(welt.px(gx), welt.py(GB.yMin)); ctx.lineTo(welt.px(gx), welt.py(GB.yMax)); }
  for (let gy = Math.ceil(GB.yMin); gy <= GB.yMax; gy++) { ctx.moveTo(welt.px(GB.xMin), welt.py(gy)); ctx.lineTo(welt.px(GB.xMax), welt.py(gy)); }
  ctx.stroke();
  ctx.strokeStyle = stil.beschriftung; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(welt.px(GB.xMin), welt.py(0)); ctx.lineTo(welt.px(GB.xMax), welt.py(0));
  ctx.moveTo(welt.px(0), welt.py(GB.yMin)); ctx.lineTo(welt.px(0), welt.py(GB.yMax));
  ctx.stroke();
  ctx.fillStyle = stil.beschriftung; ctx.font = stil.schrift;
  ctx.textAlign = "center"; ctx.textBaseline = "top";
  for (let gx = Math.ceil(GB.xMin); gx <= GB.xMax; gx++) { if (gx !== 0) ctx.fillText(String(gx), welt.px(gx), welt.py(0) + 4); }
  ctx.textAlign = "right"; ctx.textBaseline = "middle";
  for (let gy = Math.ceil(GB.yMin); gy <= GB.yMax; gy++) { if (gy !== 0) ctx.fillText(String(gy), welt.px(0) - 5, welt.py(gy)); }
  ctx.restore();
}

// Punktmarker mit Beschriftung
function markiere(ctx, welt, x, y, text, farbe, rechts) {
  const X = welt.px(x), Y = welt.py(y);
  ctx.fillStyle = farbe;
  ctx.beginPath();
  ctx.arc(X, Y, 4, 0, 2 * Math.PI);
  ctx.fill();
  if (text) {
    ctx.font = "700 13px sans-serif";
    ctx.textBaseline = "bottom";
    ctx.textAlign = rechts ? "left" : "right";
    ctx.fillText(text, X + (rechts ? 8 : -8), Y - 6);
  }
}

// Die asymmetrische "L"-Figur (Original) als geschlossener Polygonzug rechts der y-Achse.
// Asymmetrisch in beide Richtungen, damit die Spiegelung eindeutig sichtbar wird.
const L_FIGUR = [
  [1, 0], [3, 0], [3, 1], [2, 1], [2, 3], [1, 3]
];

function zeichneModusSpiegelung(ctx, welt, z, stil, mathe) {
  const s = z.s;
  const GB = welt.bereich;

  // --- Senkrechte Spiegelachse x = s (gestrichelt) ---
  ctx.save();
  ctx.strokeStyle = stil.fehler;
  ctx.lineWidth = stil.linienstaerke;
  ctx.setLineDash([7, 5]);
  ctx.beginPath();
  ctx.moveTo(welt.px(s), welt.py(GB.yMin));
  ctx.lineTo(welt.px(s), welt.py(GB.yMax));
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = stil.fehler;
  ctx.font = "700 13px sans-serif";
  ctx.textAlign = "left"; ctx.textBaseline = "top";
  ctx.fillText("Spiegelachse x = " + zahl(s), welt.px(s) + 6, welt.py(GB.yMax) + 4);
  ctx.restore();

  // --- Verbindungslinien Punkt <-> Bildpunkt (senkrecht zur Achse, gleicher Abstand) ---
  ctx.save();
  ctx.strokeStyle = farbeMitAlpha(stil.beschriftung, 0.7);
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 3]);
  ctx.beginPath();
  L_FIGUR.forEach(q => {
    const [bx, by] = spiegelPunkt(s, q[0], q[1]);
    ctx.moveTo(welt.px(q[0]), welt.py(q[1]));
    ctx.lineTo(welt.px(bx), welt.py(by));
  });
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // --- Original-Figur (grau, gestrichelter Umriss, blass gefüllt) ---
  ctx.save();
  polygonPfad(ctx, welt, L_FIGUR);
  ctx.fillStyle = farbeMitAlpha(stil.beschriftung, 0.12);
  ctx.fill();
  ctx.strokeStyle = farbeMitAlpha(stil.beschriftung, 0.85);
  ctx.lineWidth = Math.max(2, stil.linienstaerke);
  ctx.setLineDash([5, 4]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // --- Spiegelbild (farbig, gefüllt) ---
  const bildFigur = L_FIGUR.map(q => spiegelPunkt(s, q[0], q[1]));
  ctx.save();
  polygonPfad(ctx, welt, bildFigur);
  ctx.fillStyle = farbeMitAlpha(mathe, 0.26);
  ctx.fill();
  ctx.strokeStyle = mathe;
  ctx.lineWidth = stil.linienstaerke + 0.5;
  ctx.stroke();
  ctx.restore();

  // --- Referenz-Testpunkt P und sein Bild P' hervorheben ---
  markiere(ctx, welt, P_TEST.x, P_TEST.y, "P (3|2)", stil.text, true);
  markiere(ctx, welt, z.bild_x, z.bild_y, "P′ (" + zahl(z.bild_x) + "|" + zahl(z.bild_y) + ")", stil.akzent, z.bild_x >= s);

  // --- Erklärtext unten links ---
  ctx.save();
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.font = "700 13px sans-serif";
  ctx.fillStyle = stil.text;
  ctx.fillText("Spiegelung an x = s:  (x | y) → (2s − x | y)", 12, welt.hoehe - 14);
  ctx.restore();
}

function zeichneModusVieleck(ctx, welt, z, stil, mathe) {
  const n = z.n;
  // Radius so wählen, dass das n-Eck gut in den Ausschnitt {-6..6, -5..5} passt
  const r = 3.6;
  // Ecken: erste Ecke oben (Winkel 90°), dann gleichmäßig im Gegenuhrzeigersinn
  const ecken = [];
  for (let k = 0; k < n; k++) {
    const phi = Math.PI / 2 + k * (2 * Math.PI / n);
    ecken.push([r * Math.cos(phi), r * Math.sin(phi)]);
  }

  // --- n Symmetrieachsen (durch den Mittelpunkt) zeichnen ---
  // Für gerades n: n/2 Achsen durch gegenüberliegende Ecken + n/2 durch gegenüberliegende
  //   Seitenmitten = zusammen n Achsen.
  // Für ungerades n: n Achsen, jede durch eine Ecke und die Mitte der gegenüberliegenden
  //   Seite.
  // Einheitlich erzeugbar: n Geraden mit Richtungswinkeln 90° + k·(180°/n), k = 0..n−1.
  const lang = 4.6; // halbe Achsenlänge in Weltkoordinaten
  ctx.save();
  ctx.strokeStyle = farbeMitAlpha(stil.fehler, 0.8);
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  for (let k = 0; k < n; k++) {
    const a = Math.PI / 2 + k * (Math.PI / n);
    const dx = Math.cos(a), dy = Math.sin(a);
    ctx.moveTo(welt.px(-lang * dx), welt.py(-lang * dy));
    ctx.lineTo(welt.px(lang * dx), welt.py(lang * dy));
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // --- Regelmäßiges n-Eck (farbig, gefüllt) ---
  ctx.save();
  polygonPfad(ctx, welt, ecken);
  ctx.fillStyle = farbeMitAlpha(mathe, 0.20);
  ctx.fill();
  ctx.strokeStyle = mathe;
  ctx.lineWidth = stil.linienstaerke + 0.5;
  ctx.lineJoin = "round";
  ctx.stroke();
  // Eckpunkte markieren
  ctx.fillStyle = mathe;
  ecken.forEach(e => {
    ctx.beginPath();
    ctx.arc(welt.px(e[0]), welt.py(e[1]), 3.5, 0, 2 * Math.PI);
    ctx.fill();
  });
  ctx.restore();

  // --- Mittelpunkt + Drehwinkel-Bogen veranschaulichen ---
  const cx = welt.px(0), cy = welt.py(0);
  ctx.save();
  ctx.fillStyle = stil.text;
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, 2 * Math.PI);
  ctx.fill();
  // Drehwinkel-Bogen zwischen den ersten beiden Ecken (Mittelpunktswinkel = 360°/n)
  const rPix = welt.laenge(1.3);
  const a0 = Math.PI / 2;
  const a1 = Math.PI / 2 + 2 * Math.PI / n;
  ctx.strokeStyle = stil.akzent;
  ctx.lineWidth = stil.linienstaerke;
  ctx.beginPath();
  // Canvas-Winkel: y zeigt nach unten -> Vorzeichen der Winkel umkehren
  ctx.arc(cx, cy, rPix, -a0, -a1, true);
  ctx.stroke();
  ctx.restore();

  // --- Beschriftung Achsenzahl + Drehwinkel ---
  ctx.save();
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.font = "700 13px sans-serif";
  ctx.fillStyle = stil.text;
  ctx.fillText("Regelmäßiges " + n + "-Eck", 12, welt.hoehe - 36);
  ctx.fillStyle = stil.fehler;
  ctx.fillText(n + " Symmetrieachsen", 12, welt.hoehe - 20);
  ctx.fillStyle = stil.akzent;
  ctx.fillText("Drehwinkel 360°/" + n + " = " + zahl(360 / n) + "°", 12, welt.hoehe - 4);
  ctx.restore();
}

export function zeichne({ ctx, welt, zustand: z, stil }) {
  const mathe = matheFarbe(stil);
  ctx.lineCap = "round";
  zeichneGitter(ctx, welt, stil);
  if (z.modus === 0) zeichneModusSpiegelung(ctx, welt, z, stil, mathe);
  else zeichneModusVieleck(ctx, welt, z, stil, mathe);
}

// Zahl ohne überflüssige Nachkommastellen: 6 → „6", 2,5 → „2,5", −1 → „−1"
function zahl(wert) {
  let s;
  if (Math.abs(wert - Math.round(wert)) < 1e-9) s = formatZahl(wert, 0);
  else if (Math.abs(10 * wert - Math.round(10 * wert)) < 1e-9) s = formatZahl(wert, 1);
  else s = formatZahl(wert, 2);
  return s;
}

// ---------- Prüffälle ----------
// Soll-Werte analytisch:
//   Spiegelung von P=(3,2) an x=s ergibt (2s−3, 2).
//   Regelmäßiges n-Eck hat n Symmetrieachsen und Drehwinkel 360°/n.
// (toleranzProzent 1; bei Soll = 0 prüft die Validierung absolut.)

export const pruefFaelle = [
  {
    name: "Spiegelung an x = 0",
    parameter: { modus: 0, achse_s: 0 },
    toleranzProzent: 1,
    soll: { bild_x: -3, bild_y: 2 }
  },
  {
    name: "Spiegelung an x = 2",
    parameter: { modus: 0, achse_s: 2 },
    toleranzProzent: 1,
    soll: { bild_x: 1, bild_y: 2 }
  },
  {
    name: "Quadrat (n = 4)",
    parameter: { modus: 1, ecken_n: 4 },
    toleranzProzent: 1,
    soll: { achsen: 4, drehwinkel: 90 }
  },
  {
    name: "Sechseck (n = 6)",
    parameter: { modus: 1, ecken_n: 6 },
    toleranzProzent: 1,
    soll: { achsen: 6, drehwinkel: 60 }
  }
];
