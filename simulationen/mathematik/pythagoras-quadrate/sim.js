// Pythagoras: Quadrate an den Seiten — das Flächenargument a² + b² = c² zum Anfassen
// (Mathematik, Klasse 9). Modus „statisch“: Parameter ändern → sofort neu rechnen
// und zeichnen. Das rechtwinklige Dreieck liegt mit dem rechten Winkel bei C = (0|0)
// unten links; über jeder Seite sitzt das aufgesetzte Quadrat. Das Hypotenusenquadrat
// liegt schräg und wird über den Einheitsnormalenvektor der Hypotenuse exakt
// konstruiert. Unter der Figur steht die lebende Gleichung mit den aktuellen Werten.

import { formatZahl } from "../../../assets/js/sim/welt.js";

export const manifest = {
  id: "mathematik/pythagoras-quadrate",
  titel: "Pythagoras: Quadrate an den Seiten",
  modus: "statisch",
  raster: false,     // eigene Figur in cm statt Meter-Karoraster
  werkzeuge: false,  // Lineal/Winkelmesser messen in Metern — hier sind alle Längen in cm
  parameter: [
    { id: "a", label: "Kathete a", einheit: "cm", min: 1, max: 8, schritt: 0.5, start: 3 },
    { id: "b", label: "Kathete b", einheit: "cm", min: 1, max: 8, schritt: 0.5, start: 4 }
  ],
  anzeigen: [
    { id: "aQuadrat", label: "a²",           einheit: "cm²", stellen: 2 },
    { id: "bQuadrat", label: "b²",           einheit: "cm²", stellen: 2 },
    { id: "summe",    label: "a² + b²",      einheit: "cm²", stellen: 2 },
    { id: "c",        label: "Hypotenuse c", einheit: "cm",  stellen: 3 },
    { id: "cQuadrat", label: "c²",           einheit: "cm²", stellen: 2 }
  ],
  presets: [
    { name: "3-4-5",           werte: { a: 3, b: 4 } },
    { name: "Gleichschenklig", werte: { a: 4, b: 4 } },
    { name: "Flach",           werte: { a: 2, b: 7 } }
  ],
  vorhersage: {
    frage: "a und b werden beide verdoppelt — wächst c auf das Doppelte oder auf das Vierfache?",
    optionen: ["Auf das Doppelte", "Auf das Vierfache", "Etwas dazwischen"],
    aufloesung: "Auf das Doppelte: c = √((2a)² + (2b)²) = √(4 · (a² + b²)) = 2 · √(a² + b²). Die Quadratflächen vervierfachen sich zwar, aber die Seitenlänge c wächst nur mit der Wurzel daraus. Prüfe es selbst: Aus dem 3-4-5-Dreieck wird das 6-8-10-Dreieck."
  },
  beobachtung: [
    "Prüfe am 3-4-5-Dreieck: a² + b² = c² — und finde mit den Reglern ein weiteres ganzzahliges Tripel. Tipp: Verdopple beide Katheten (6-8-10!).",
    "Stelle a = b (Preset „Gleichschenklig“) und vergleiche c mit a: Zeige c = a · √2 ≈ a · 1,414 — das ist genau die Diagonale im Quadrat.",
    "Stimmt die Gleichung auch bei „schiefen“ Werten wie a = 2,5? Vergleiche die Anzeige a² + b² mit c².",
    "Warum ist c immer kürzer als a + b, aber länger als jede einzelne Kathete? Begründe am Dreieck (der Weg über die Ecke ist ein Umweg!) und an den Quadratflächen."
  ],
  modellgrenzen: "Der rechte Winkel ist hier fest eingebaut — der Satz des Pythagoras gilt nur im rechtwinkligen Dreieck. In jedem anderen Dreieck geht die Flächenbilanz schief; nach der Umkehrung des Satzes ist a² + b² = c² deshalb sogar ein Test auf Rechtwinkligkeit. Alle Längen in cm, alle Flächen in cm².",
  bilanz: {
    aQuadrat: { label: "a²",           einheit: "cm²", stellen: 2 },
    bQuadrat: { label: "b²",           einheit: "cm²", stellen: 2 },
    summe:    { label: "a² + b²",      einheit: "cm²", stellen: 2 },
    c:        { label: "Hypotenuse c", einheit: "cm",  stellen: 3 },
    cQuadrat: { label: "c²",           einheit: "cm²", stellen: 2 }
  }
};

// ---------- Modell ----------

function rechne(p) {
  const aQuadrat = p.a * p.a;
  const bQuadrat = p.b * p.b;
  const summe = aQuadrat + bQuadrat;
  const c = Math.sqrt(summe);
  return { aQuadrat, bQuadrat, summe, c, cQuadrat: c * c };
}

export function init(p) {
  return { t: 0, ...rechne(p) };
}

export function update() { /* statisch: nichts zu tun */ }

export function messwerte(z) {
  return { aQuadrat: z.aQuadrat, bQuadrat: z.bQuadrat, summe: z.summe, c: z.c, cQuadrat: z.cQuadrat };
}

export function istFertig() { return true; }

export function bilanz(z) {
  return { aQuadrat: z.aQuadrat, bQuadrat: z.bQuadrat, summe: z.summe, c: z.c, cQuadrat: z.cQuadrat };
}

// ---------- Geometrie ----------
// Eckpunkte des Dreiecks: C = (0|0) rechter Winkel, B = (a|0), A = (0|b).
// Die Kathetenquadrate klappen nach unten bzw. nach links aus dem Dreieck heraus.
// Hypotenusenquadrat: Der Richtungsvektor der Hypotenuse ist (a|−b)/c, der vom
// Dreieck wegzeigende Einheitsnormalenvektor also n = (b/c | a/c). Die vier Ecken
// sind A, B, B + c·n und A + c·n — für a = 3, b = 4: (0|4), (3|0), (7|3), (4|7).

export function quadratEcken(a, b) {
  const c = Math.hypot(a, b);
  const nx = b / c, ny = a / c;
  return {
    quadA: [[0, 0], [a, 0], [a, -a], [0, -a]],   // Quadrat über Kathete a (unter dem Dreieck)
    quadB: [[0, 0], [0, b], [-b, b], [-b, 0]],   // Quadrat über Kathete b (links vom Dreieck)
    quadC: [[0, b], [a, 0], [a + c * nx, c * ny], [c * nx, b + c * ny]] // schräg über c
  };
}

// Platz unter der Figur für die lebende Gleichung (in Welteinheiten = cm)
function platzGleichung(p) {
  return Math.max(1.8, 0.18 * (p.a + p.b));
}

// Sichtbarer Weltausschnitt: alle drei Quadrate plus der Gleichungsstreifen darunter.
// Wird bei jeder Parameteränderung neu berechnet, damit die Figur immer ganz sichtbar ist.
export function weltBereich(p) {
  const rand = 0.5;
  return {
    xMin: -p.b - rand,
    xMax: p.a + p.b + rand,
    yMin: -p.a - platzGleichung(p),
    yMax: p.a + p.b + rand
  };
}

// ---------- Darstellung ----------

function pfad(ctx, welt, punkte) {
  ctx.beginPath();
  punkte.forEach((q, i) => {
    const X = welt.px(q[0]), Y = welt.py(q[1]);
    if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
  });
  ctx.closePath();
}

// Fachfarbe Mathematik aus den Design-Tokens (Fallback: Akzentfarbe der Engine)
function matheFarbe(stil) {
  if (typeof document === "undefined") return stil.akzent;
  const wert = getComputedStyle(document.documentElement).getPropertyValue("--mathe").trim();
  return wert || stil.akzent;
}

// Zahl ohne überflüssige Nachkommastellen: 9 → „9“, 2,5 → „2,5“, 5,385 → „5,39“
function zahl(wert) {
  if (Math.abs(wert - Math.round(wert)) < 1e-9) return formatZahl(wert, 0);
  if (Math.abs(10 * wert - Math.round(10 * wert)) < 1e-9) return formatZahl(wert, 1);
  return formatZahl(wert, 2);
}

// Seitenlänge und Fläche mittig ins Quadrat schreiben; wird das Quadrat zu klein,
// bleibt nur der Flächenwert (die Zuordnung steht dann in der Gleichung darunter).
function beschrifteQuadrat(ctx, welt, mitte, seite, name, farbe, stil) {
  const kantePx = welt.laenge(seite);
  const basis = parseFloat(stil.schrift) || 12;
  const groesse = Math.max(10, Math.min(basis + 6, kantePx * 0.17));
  const flaechenText = name + "² = " + zahl(seite * seite) + " cm²";
  const X = welt.px(mitte[0]), Y = welt.py(mitte[1]);
  ctx.fillStyle = farbe;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "700 " + groesse + "px sans-serif";
  if (ctx.measureText(flaechenText).width <= kantePx * 0.94) {
    ctx.font = groesse + "px sans-serif";
    ctx.fillText(name + " = " + zahl(seite) + " cm", X, Y - groesse * 0.75);
    ctx.font = "700 " + groesse + "px sans-serif";
    ctx.fillText(flaechenText, X, Y + groesse * 0.75);
  } else {
    const klein = Math.max(9, Math.min(groesse, kantePx * 0.42));
    ctx.font = "700 " + klein + "px sans-serif";
    const nurWert = zahl(seite * seite);
    if (ctx.measureText(nurWert).width <= kantePx * 0.94) ctx.fillText(nurWert, X, Y);
  }
}

export function zeichne({ ctx, welt, zustand: z, werte: p, stil }) {
  const a = p.a, b = p.b;
  const mathe = matheFarbe(stil);
  const ecken = quadratEcken(a, b);
  ctx.lineJoin = "round";

  // Kathetenquadrate: zwei Helligkeiten derselben Fachfarbe
  ctx.strokeStyle = mathe;
  ctx.fillStyle = mathe;
  ctx.lineWidth = stil.linienstaerke;
  pfad(ctx, welt, ecken.quadA);
  ctx.globalAlpha = 0.32; ctx.fill(); ctx.globalAlpha = 1;
  ctx.stroke();
  pfad(ctx, welt, ecken.quadB);
  ctx.globalAlpha = 0.16; ctx.fill(); ctx.globalAlpha = 1;
  ctx.stroke();

  // Hypotenusenquadrat: liegt schräg an der Hypotenuse, betonte Akzent-Umrandung
  pfad(ctx, welt, ecken.quadC);
  ctx.fillStyle = stil.akzent;
  ctx.globalAlpha = 0.07; ctx.fill(); ctx.globalAlpha = 1;
  ctx.strokeStyle = stil.akzent;
  ctx.lineWidth = stil.linienstaerke + 1;
  ctx.stroke();

  // Dreieck obenauf, damit seine Kanten kräftig sichtbar bleiben
  pfad(ctx, welt, [[0, 0], [a, 0], [0, b]]);
  ctx.fillStyle = stil.flaeche;
  ctx.fill();
  ctx.strokeStyle = stil.text;
  ctx.lineWidth = stil.linienstaerke;
  ctx.stroke();

  // Winkelquadrat-Symbol mit Punkt am rechten Winkel bei C = (0|0)
  const w = Math.min(0.5, 0.28 * Math.min(a, b));
  ctx.strokeStyle = stil.text;
  ctx.lineWidth = Math.max(1, stil.linienstaerke / 2);
  ctx.beginPath();
  ctx.moveTo(welt.px(w), welt.py(0));
  ctx.lineTo(welt.px(w), welt.py(w));
  ctx.lineTo(welt.px(0), welt.py(w));
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(welt.px(w * 0.42), welt.py(w * 0.42), Math.max(1.5, welt.laenge(w) * 0.1), 0, 2 * Math.PI);
  ctx.fillStyle = stil.text;
  ctx.fill();

  // Flächen in die Quadrate schreiben — Mittelpunkte: (a/2|−a/2), (−b/2|b/2)
  // und für das Hypotenusenquadrat ((a+b)/2 | (a+b)/2)
  beschrifteQuadrat(ctx, welt, [a / 2, -a / 2], a, "a", mathe, stil);
  beschrifteQuadrat(ctx, welt, [-b / 2, b / 2], b, "b", mathe, stil);
  beschrifteQuadrat(ctx, welt, [(a + b) / 2, (a + b) / 2], z.c, "c", stil.akzent, stil);

  // Lebende Gleichung unter der Figur: „9 + 16 = 25 ✓“
  const platz = platzGleichung(p);
  const xMitte = welt.px(a / 2);
  const basis = parseFloat(stil.schrift) || 12;
  const gross = Math.max(basis + 3, Math.min(24, welt.laenge(0.95)));
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = stil.beschriftung;
  ctx.font = Math.round(gross * 0.72) + "px sans-serif";
  ctx.fillText("a² + b² = c²", xMitte, welt.py(-a - platz * 0.34));
  const gleichung = zahl(z.aQuadrat) + " + " + zahl(z.bQuadrat) + " = " + zahl(z.cQuadrat);
  ctx.font = "700 " + gross + "px sans-serif";
  const breite = ctx.measureText(gleichung).width;
  const yGleichung = welt.py(-a - platz * 0.74);
  ctx.textAlign = "left";
  ctx.fillStyle = stil.text;
  ctx.fillText(gleichung, xMitte - breite / 2, yGleichung);
  ctx.fillStyle = stil.ok;
  ctx.fillText(" ✓", xMitte + breite / 2, yGleichung);
}

// ---------- Prüffälle ----------
// Soll-Werte analytisch: c = √(a² + b²), Summe der Kathetenquadrate = c².

export const pruefFaelle = [
  {
    name: "3-4-5-Dreieck",
    parameter: { a: 3, b: 4 },
    toleranzProzent: 0.2,
    soll: { c: 5, summe: 25, cQuadrat: 25 }
  },
  {
    name: "Verdoppelt: 6-8-10",
    parameter: { a: 6, b: 8 },
    toleranzProzent: 0.2,
    soll: { c: 10, cQuadrat: 100 }
  },
  {
    name: "Schiefe Werte: a = 2, b = 5",
    parameter: { a: 2, b: 5 },
    toleranzProzent: 0.2,
    soll: { c: 5.385, summe: 29 }
  }
];
