// Matrix als Abbildung — lineare Abbildung der Ebene zum Anfassen (Oberstufe / Lineare
// Algebra). Modus „statisch“: an den Reglern a, b, c, d die Matrix M = [[a, b], [c, d]]
// einstellen → das Bild der Figur und der Basisvektoren wird sofort neu gerechnet und
// gezeichnet. Eine kleine „F“-Figur macht Drehung und Spiegelung sichtbar; die
// Determinante det(M) = a·d − b·c erscheint als Flächen-Skalierungsfaktor.
//
// Modell (exakt): ein Punkt (x, y) wird abgebildet auf
//   (x', y') = (a·x + b·y, c·x + d·y).
// Die Spalten von M sind die Bilder der Basisvektoren: e1 = (1,0) → (a, c),
// e2 = (0,1) → (b, d). Die Determinante gibt den (vorzeichenbehafteten) Flächenfaktor an:
// Fläche des Bildes = |det| · Fläche des Originals; det < 0 bedeutet gespiegelte
// Orientierung, det = 0 drückt alles auf eine Linie oder einen Punkt zusammen.

import { formatZahl } from "../../../assets/js/sim/welt.js";

export const manifest = {
  id: "mathematik/matrix-abbildung",
  titel: "Matrix als Abbildung",
  modus: "statisch",
  raster: false,     // eigenes Gitter ohne Einheit (abstrakte Ebene, kein "m")
  werkzeuge: false,  // Lineal/Winkelmesser nicht nötig; Werte stehen in der Anzeige
  parameter: [
    { id: "a", label: "a (oben links)",  einheit: "", min: -3, max: 3, schritt: 0.5, start: 1 },
    { id: "b", label: "b (oben rechts)", einheit: "", min: -3, max: 3, schritt: 0.5, start: 0 },
    { id: "c", label: "c (unten links)", einheit: "", min: -3, max: 3, schritt: 0.5, start: 0 },
    { id: "d", label: "d (unten rechts)",einheit: "", min: -3, max: 3, schritt: 0.5, start: 1 }
  ],
  anzeigen: [
    { id: "det",     label: "Determinante det(M) = a·d − b·c", einheit: "",   stellen: 2 },
    { id: "flaeche", label: "Fläche des Bild-Einheitsquadrats |det|", einheit: "FE", stellen: 2 }
  ],
  presets: [
    { name: "Drehung 90°",          werte: { a: 0, b: -1, c: 1, d: 0 } },
    { name: "Scherung",             werte: { a: 1, b: 1, c: 0, d: 1 } },
    { name: "Spiegelung (x-Achse)", werte: { a: 1, b: 0, c: 0, d: -1 } }
  ],
  vorhersage: {
    frage: "Die Matrix M = [[0, −1], [1, 0]] — was macht sie mit einer Figur in der Ebene?",
    optionen: [
      "Sie dreht die Figur um 90° um den Ursprung",
      "Sie spiegelt die Figur an der x-Achse",
      "Sie streckt die Figur auf das Doppelte"
    ],
    aufloesung: "Sie dreht um 90° (gegen den Uhrzeigersinn) um den Ursprung: e1 = (1,0) wird auf (0,1) abgebildet, e2 = (0,1) auf (−1,0). Die Determinante ist det = 0·0 − (−1)·1 = 1 — Flächen und Form bleiben erhalten, nur die Lage dreht sich. Stelle das Preset „Drehung 90°“ ein und sieh es dir an."
  },
  beobachtung: [
    "Diagonalmatrix: Stelle b = 0 und c = 0 und ändere nur a und d. Die Figur wird in x-Richtung um den Faktor a und in y-Richtung um den Faktor d gestreckt (oder gestaucht). Vergleiche die Determinante a·d mit der angezeigten Fläche.",
    "Scherung: Setze a = 1, c = 0, d = 1 und erhöhe b von 0 auf 1, 2, 3. Die Figur „kippt“ seitlich, aber die Determinante bleibt 1 — die Fläche ändert sich nicht. Warum?",
    "Drehung: Probiere das Preset „Drehung 90°“ und dann [[−1, 0], [0, −1]] (a = −1, d = −1). Welche Drehwinkel erkennst du? Die Determinante bleibt jeweils 1.",
    "Vorzeichen und Null: Stelle d = −1 (Spiegelung) — die Determinante wird negativ, die Orientierung der Figur kippt (das „F“ erscheint spiegelverkehrt). Setze dann b = 2, d = 2 bei a = 1, c = 1, sodass det = 0 wird: Die ganze Ebene wird auf eine Gerade zusammengedrückt."
  ],
  modellgrenzen: "Dargestellt sind nur lineare Abbildungen der Ebene: Geraden bleiben Geraden, der Ursprung bleibt immer fest. Verschiebungen (Translationen) sind damit nicht möglich — dafür bräuchte man einen zusätzlichen Verschiebungsvektor (affine Abbildung). Längen und Winkel bleiben nur bei besonderen Matrizen (Drehungen, Spiegelungen) erhalten.",
  bilanz: {
    det:  { label: "Determinante det(M)",  einheit: "", stellen: 4 },
    p11x: { label: "Bild von (1,1): x' = a + b", einheit: "", stellen: 4 },
    p11y: { label: "Bild von (1,1): y' = c + d", einheit: "", stellen: 4 }
  }
};

// ---------- Modell (exakte lineare Abbildung im R²) ----------

// Bildpunkt von (x, y) unter M = [[a, b], [c, d]]
function abbilden(p, x, y) {
  return [p.a * x + p.b * y, p.c * x + p.d * y];
}

function determinante(p) {
  return p.a * p.d - p.b * p.c;
}

export function init(p) {
  const det = determinante(p);
  return { t: 0, det, flaeche: Math.abs(det) };
}

export function update() { /* statisch: nichts zu tun */ }

export function messwerte(z) {
  return { det: z.det, flaeche: z.flaeche };
}

export function istFertig() { return true; }

export function bilanz(z, p) {
  // p11 = Bild des Punktes (1,1) = (a + b, c + d); det = a·d − b·c
  return { det: z.det, p11x: p.a + p.b, p11y: p.c + p.d };
}

// ---------- Sichtbarer Weltausschnitt ----------
// Symmetrisch um den Ursprung, damit x und y gleich skaliert sind (welt.px/py bilden
// gleichmaßstäblich ab). Der Ausschnitt wächst mit der „Reichweite“ der Matrix, damit
// das Bild der Figur und die Basisvektoren auch bei großen Einträgen sichtbar bleiben.
export function weltBereich(p) {
  const reich = Math.max(1, Math.abs(p.a), Math.abs(p.b), Math.abs(p.c), Math.abs(p.d));
  const r = Math.min(8, Math.max(4, reich + 2.5));
  return { xMin: -r, xMax: r, yMin: -r, yMax: r };
}

// ---------- Darstellung ----------

// Die Original-Figur: ein „F“ aus Streckenzügen im Einheitsquadrat-Bereich [0,1]×[0,1.4].
// Asymmetrisch in beide Richtungen, damit Drehung UND Spiegelung eindeutig erkennbar sind.
// Jeder Eintrag ist ein Polygonzug aus Punkten (x, y) in Weltkoordinaten.
const FIGUR = [
  // Umriss-/Grundquadrat als blasse Orientierung wird separat gezeichnet (siehe unten)
  [[0, 0], [0, 1.4]],          // senkrechter Balken des F
  [[0, 1.4], [1, 1.4]],        // oberer Querbalken
  [[0, 0.7], [0.7, 0.7]]       // mittlerer Querbalken
];

// Eckpunkte des Original-Einheitsquadrats [0,1]² (für die Flächen-Veranschaulichung)
const QUADRAT = [[0, 0], [1, 0], [1, 1], [0, 1]];

// Hex/rgb-Farbe der Tokens mit Alpha versehen (Tokens sind hex oder rgb())
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

// Polygonzug in Weltkoordinaten als Linie zeichnen
function linie(ctx, welt, punkte) {
  ctx.beginPath();
  punkte.forEach((q, i) => {
    const X = welt.px(q[0]), Y = welt.py(q[1]);
    if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
  });
  ctx.stroke();
}

// Geschlossenes Polygon (Fläche) in Weltkoordinaten
function flaeche(ctx, welt, punkte) {
  ctx.beginPath();
  punkte.forEach((q, i) => {
    const X = welt.px(q[0]), Y = welt.py(q[1]);
    if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
  });
  ctx.closePath();
}

// Pfeil von Welt-Punkt (0,0) nach (wx, wy) mit Spitze
function pfeil(ctx, welt, wx, wy, farbe, breite) {
  const x0 = welt.px(0), y0 = welt.py(0);
  const x1 = welt.px(wx), y1 = welt.py(wy);
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
    // Nullvektor: nur ein kleiner Punkt am Ursprung
    ctx.beginPath();
    ctx.arc(x0, y0, breite * 1.6, 0, 2 * Math.PI);
    ctx.fill();
    return;
  }
  // Pfeilspitze
  const ux = dx / len, uy = dy / len;
  const sp = Math.max(9, breite * 4);
  const winkel = 0.5;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - sp * (ux * Math.cos(winkel) - uy * Math.sin(winkel)),
             y1 - sp * (uy * Math.cos(winkel) + ux * Math.sin(winkel)));
  ctx.lineTo(x1 - sp * (ux * Math.cos(-winkel) - uy * Math.sin(-winkel)),
             y1 - sp * (uy * Math.cos(-winkel) + ux * Math.sin(-winkel)));
  ctx.closePath();
  ctx.fill();
}

export function zeichne({ ctx, welt, zustand: z, werte: p, stil }) {
  const mathe = matheFarbe(stil);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // --- Eigenes Koordinatengitter + Achsen (ohne Einheit, da abstrakte Ebene) ---
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

  // --- Original blass: Einheitsquadrat + F-Figur (graue Orientierung) ---
  ctx.strokeStyle = stil.beschriftung;
  ctx.fillStyle = farbeMitAlpha(stil.beschriftung, 0.10);
  ctx.lineWidth = 1;
  flaeche(ctx, welt, QUADRAT);
  ctx.fill();
  ctx.setLineDash([4, 4]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineWidth = Math.max(2, stil.linienstaerke - 0.5);
  ctx.strokeStyle = farbeMitAlpha(stil.beschriftung, 0.75);
  FIGUR.forEach(zug => linie(ctx, welt, zug));

  // --- Bild farbig: abgebildetes Einheitsquadrat (gefüllt) + abgebildete F-Figur ---
  const bildQuadrat = QUADRAT.map(q => abbilden(p, q[0], q[1]));
  flaeche(ctx, welt, bildQuadrat);
  ctx.fillStyle = farbeMitAlpha(mathe, z.det < 0 ? 0.14 : 0.26); // gespiegelt: dezenter
  ctx.fill();
  ctx.strokeStyle = mathe;
  ctx.lineWidth = stil.linienstaerke;
  // Bei det = 0 ist das „Quadrat“ zu einer Strecke entartet — Umriss trotzdem zeichnen
  ctx.stroke();

  ctx.strokeStyle = stil.akzent;
  ctx.lineWidth = stil.linienstaerke + 1;
  FIGUR.forEach(zug => {
    const bild = zug.map(q => abbilden(p, q[0], q[1]));
    linie(ctx, welt, bild);
  });

  // --- Abgebildete Basisvektoren e1 → (a, c) und e2 → (b, d) als Pfeile ---
  const breite = stil.linienstaerke + 0.5;
  // e1-Bild (a, c): kräftiges Akzentblau
  pfeil(ctx, welt, p.a, p.c, stil.akzent, breite);
  // e2-Bild (b, d): Kontrastfarbe (Fehler-/Warnrot der Tokens, hier nur als zweite Farbe)
  pfeil(ctx, welt, p.b, p.d, stil.fehler, breite);

  // Pfeil-Beschriftung (Bild der Basisvektoren)
  const basis = parseFloat(stil.schrift) || 12;
  const beschr = Math.max(11, basis + 1);
  ctx.font = "700 " + beschr + "px sans-serif";
  ctx.textBaseline = "middle";
  function pfeilLabel(wx, wy, text, farbe) {
    if (Math.hypot(wx, wy) < 1e-6) return;
    const X = welt.px(wx), Y = welt.py(wy);
    const len = Math.hypot(wx, wy);
    const ox = (wx / len) * 0 + 8 * Math.sign(wx || 1);
    ctx.fillStyle = farbe;
    ctx.textAlign = wx >= 0 ? "left" : "right";
    ctx.fillText(text, X + (wx >= 0 ? 8 : -8), Y - 8);
  }
  pfeilLabel(p.a, p.c, "e₁′", stil.akzent);  // e1'
  pfeilLabel(p.b, p.d, "e₂′", stil.fehler);  // e2'

  // --- Textblock unten links: Matrix, Determinante, Hinweise ---
  const xText = 12;
  let yText = welt.hoehe - 12;
  const klein = Math.max(11, basis);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  // Hinweis bei besonderen Determinanten
  if (Math.abs(z.det) < 1e-9) {
    ctx.font = "700 " + (klein + 1) + "px sans-serif";
    ctx.fillStyle = stil.fehler;
    ctx.fillText("det = 0: auf eine Gerade zusammengedrückt", xText, yText);
    yText -= klein + 8;
  } else if (z.det < 0) {
    ctx.font = "700 " + (klein + 1) + "px sans-serif";
    ctx.fillStyle = stil.fehler;
    ctx.fillText("Orientierung gespiegelt (det < 0)", xText, yText);
    yText -= klein + 8;
  }

  // Determinante / Fläche als Text
  ctx.font = "700 " + (klein + 2) + "px sans-serif";
  ctx.fillStyle = stil.text;
  const detText = "det(M) = " + zahl(z.det) + "   →   Fläche = " + zahl(Math.abs(z.det));
  ctx.fillText(detText, xText, yText);
  yText -= klein + 10;

  // Matrix M = [[a, b], [c, d]] kompakt
  ctx.font = klein + "px sans-serif";
  ctx.fillStyle = stil.beschriftung;
  ctx.fillText("M = [ " + zahl(p.a) + "  " + zahl(p.b) + " ;  " + zahl(p.c) + "  " + zahl(p.d) + " ]", xText, yText);
}

// Zahl ohne überflüssige Nachkommastellen: 6 → „6“, 2,5 → „2,5“, −1 → „−1“
function zahl(wert) {
  let s;
  if (Math.abs(wert - Math.round(wert)) < 1e-9) s = formatZahl(wert, 0);
  else if (Math.abs(10 * wert - Math.round(10 * wert)) < 1e-9) s = formatZahl(wert, 1);
  else s = formatZahl(wert, 2);
  return s;
}

// ---------- Prüffälle ----------
// Soll-Werte analytisch: det = a·d − b·c ; Bild von (1,1) = (a + b, c + d).
// (toleranzProzent 1; bei Soll = 0 prüft die Validierung absolut.)

export const pruefFaelle = [
  {
    name: "Streckung [[2,0],[0,3]]",
    parameter: { a: 2, b: 0, c: 0, d: 3 },
    toleranzProzent: 1,
    soll: { det: 6, p11x: 2, p11y: 3 }
  },
  {
    name: "Scherung [[1,1],[0,1]]",
    parameter: { a: 1, b: 1, c: 0, d: 1 },
    toleranzProzent: 1,
    soll: { det: 1, p11x: 2, p11y: 1 }
  },
  {
    name: "Drehung 90° [[0,-1],[1,0]]",
    parameter: { a: 0, b: -1, c: 1, d: 0 },
    toleranzProzent: 1,
    soll: { det: 1, p11x: -1, p11y: 1 }
  },
  {
    name: "Spiegelung x-Achse [[1,0],[0,-1]]",
    parameter: { a: 1, b: 0, c: 0, d: -1 },
    toleranzProzent: 1,
    soll: { det: -1, p11x: 1, p11y: -1 }
  }
];
