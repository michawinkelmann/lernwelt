// Binomische Formel als Flächenpuzzle — die erste binomische Formel (a + b)² zum
// Anfassen (Mathematik, Klasse 8 / Algebra). Modus „statisch“: an den Reglern a und b
// die Seitenlängen einstellen → das große Quadrat mit der Seitenlänge (a + b) wird
// sofort neu in seine vier Teilflächen zerlegt und gezeichnet. So wird sichtbar,
// woher das oft vergessene Mittelstück 2ab kommt.
//
// Modell (exakt):
//   (a + b)² = a² + 2·a·b + b²
// Das Quadrat mit der Kantenlänge (a + b) zerfällt in vier rechteckige Teile:
//   a²        — oben links   (Quadrat mit Seite a)
//   a·b       — oben rechts  (Rechteck a hoch, b breit)
//   a·b       — unten links  (Rechteck b hoch, a breit)
//   b²        — unten rechts (Quadrat mit Seite b)
// Die beiden a·b-Rechtecke sind flächengleich; zusammen ergeben sie 2·a·b. Die Summe
// aller vier Teilflächen ist genau die Gesamtfläche (a + b)² des großen Quadrats.

import { formatZahl } from "../../../assets/js/sim/welt.js";

export const manifest = {
  id: "mathematik/binomische-formeln",
  titel: "Binomische Formel als Flächenpuzzle",
  modus: "statisch",
  raster: false,     // eigene Figur mit Längen a, b (ohne Meter-Karoraster)
  werkzeuge: false,  // Lineal/Winkelmesser nicht nötig; alle Werte stehen in der Anzeige
  parameter: [
    { id: "a", label: "Seitenlänge a", einheit: "", min: 1, max: 6, schritt: 0.5, start: 3 },
    { id: "b", label: "Seitenlänge b", einheit: "", min: 1, max: 6, schritt: 0.5, start: 2 }
  ],
  anzeigen: [
    { id: "gesamt", label: "Gesamtfläche (a + b)²", einheit: "", stellen: 2 },
    { id: "a2",     label: "Teilfläche a²",         einheit: "", stellen: 2 },
    { id: "ab2",    label: "Teilfläche 2·a·b",      einheit: "", stellen: 2 },
    { id: "b2",     label: "Teilfläche b²",         einheit: "", stellen: 2 }
  ],
  presets: [
    { name: "a = 3, b = 2",   werte: { a: 3, b: 2 } },
    { name: "Gleich groß a = b", werte: { a: 3, b: 3 } },
    { name: "b sehr klein",   werte: { a: 5, b: 1 } }
  ],
  vorhersage: {
    frage: "Ist (a + b)² dasselbe wie a² + b²?",
    optionen: [
      "Ja, man darf das Quadrat auf jeden Summanden einzeln anwenden",
      "Nein, es fehlt ein Mittelstück",
      "Nur, wenn a und b gleich groß sind"
    ],
    aufloesung: "Nein — das ist der häufigste Fehler beim Ausmultiplizieren. Es gilt (a + b)² = a² + 2·a·b + b². Zwischen a² und b² liegen noch die beiden gleich großen Rechtecke a·b, zusammen also das Mittelstück 2·a·b. Im Bild sieht man das sofort: a² und b² füllen nur die beiden Ecken auf der Diagonalen; ohne die beiden a·b-Rechtecke bliebe das große Quadrat unvollständig. Stelle z. B. a = 3 und b = 2 ein: (a + b)² = 25, aber a² + b² = 9 + 4 = 13 — es fehlen genau 2·a·b = 12."
  },
  beobachtung: [
    "Verändere a und b mit den Reglern und beobachte, wie sich die vier Teilflächen ändern. Welche Teile wachsen, wenn du nur a vergrößerst? Welche, wenn du nur b vergrößerst?",
    "Schau dir die beiden gleich gefärbten Rechtecke an: Beide haben die Fläche a·b. Warum tauchen sie zweimal auf — und warum heißt das Mittelglied deshalb 2·a·b und nicht nur a·b?",
    "Stelle den Spezialfall a = b ein (Preset „Gleich groß“). Aus den vier Teilen werden vier gleich große Quadrate. Welcher Bruchteil der Gesamtfläche ist dann das Mittelstück 2·a·b? (Tipp: Vergleiche 2·a·b mit (a + b)² für a = b.)",
    "Addiere im Kopf die vier angezeigten Teilflächen a² + 2·a·b + b² und vergleiche die Summe mit der angezeigten Gesamtfläche (a + b)². Stimmt es für jede Einstellung von a und b?"
  ],
  modellgrenzen: "Gezeigt wird nur die erste binomische Formel (a + b)² mit positiven Seitenlängen a und b — als Flächenbild lassen sich nur positive Längen darstellen. Die zweite Formel (a − b)² und die dritte (a + b)·(a − b) folgen demselben Flächengedanken (Wegnehmen statt Hinzufügen), werden hier aber nicht gezeigt. Das Bild veranschaulicht die Formel, ersetzt aber nicht den algebraischen Beweis durch Ausmultiplizieren.",
  bilanz: {
    gesamt: { label: "Gesamtfläche (a + b)²", einheit: "", stellen: 4 },
    a2:     { label: "a²",                    einheit: "", stellen: 4 },
    ab2:    { label: "2·a·b",                 einheit: "", stellen: 4 },
    b2:     { label: "b²",                    einheit: "", stellen: 4 }
  }
};

// ---------- Modell (exakte erste binomische Formel) ----------

function rechne(p) {
  const a2 = p.a * p.a;
  const b2 = p.b * p.b;
  const ab2 = 2 * p.a * p.b;
  const gesamt = (p.a + p.b) * (p.a + p.b);
  return { a2, b2, ab2, gesamt };
}

export function init(p) {
  return { t: 0, ...rechne(p) };
}

export function update() { /* statisch: nichts zu tun */ }

export function messwerte(z) {
  return { gesamt: z.gesamt, a2: z.a2, ab2: z.ab2, b2: z.b2 };
}

export function istFertig() { return true; }

export function bilanz(z) {
  // Soll-Bilanz: gesamt = (a + b)², a2 = a², ab2 = 2·a·b, b2 = b²
  return { gesamt: z.gesamt, a2: z.a2, ab2: z.ab2, b2: z.b2 };
}

// ---------- Sichtbarer Weltausschnitt ----------
// Quadrat liegt mit der Ecke unten links im Ursprung und reicht bis (a+b | a+b).
// Darunter bleibt ein Streifen frei für die lebende Gleichung. x und y werden über
// welt.px/py gleichmaßstäblich abgebildet, das Quadrat bleibt also wirklich quadratisch.
function platzGleichung(p) {
  return Math.max(2.0, 0.22 * (p.a + p.b));
}

export function weltBereich(p) {
  const s = p.a + p.b;
  const rand = 0.6;
  return {
    xMin: -rand,
    xMax: s + rand,
    yMin: -platzGleichung(p),
    yMax: s + rand
  };
}

// ---------- Darstellung ----------

// Fachfarbe Mathematik aus den Design-Tokens (Fallback: Akzentfarbe der Engine)
function matheFarbe(stil) {
  if (typeof document === "undefined") return stil.akzent;
  const wert = getComputedStyle(document.documentElement).getPropertyValue("--mathe").trim();
  return wert || stil.akzent;
}

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

// Zahl ohne überflüssige Nachkommastellen: 9 → „9“, 2,5 → „2,5“, 6,25 → „6,25“
function zahl(wert) {
  if (Math.abs(wert - Math.round(wert)) < 1e-9) return formatZahl(wert, 0);
  if (Math.abs(10 * wert - Math.round(10 * wert)) < 1e-9) return formatZahl(wert, 1);
  return formatZahl(wert, 2);
}

// Gefülltes Rechteck in Weltkoordinaten: untere linke Ecke (x|y), Breite w, Höhe h.
function rechteck(ctx, welt, x, y, w, h) {
  const X = welt.px(x), Y = welt.py(y + h);          // py wächst nach unten → obere Kante
  const W = welt.laenge(w), H = welt.laenge(h);
  ctx.beginPath();
  ctx.rect(X, Y, W, H);
}

// Eine Teilfläche füllen, umranden und (wenn Platz ist) zwei Zeilen mittig beschriften:
// obere Zeile der Term (z. B. „a · b“), untere Zeile der Zahlenwert (z. B. „6“).
function teilflaeche(ctx, welt, x, y, w, h, farbe, alpha, term, wert, stil) {
  rechteck(ctx, welt, x, y, w, h);
  ctx.fillStyle = farbeMitAlpha(farbe, alpha);
  ctx.fill();
  ctx.strokeStyle = farbe;
  ctx.lineWidth = stil.linienstaerke;
  ctx.stroke();

  const wPx = welt.laenge(w), hPx = welt.laenge(h);
  const kleinerePx = Math.min(wPx, hPx);
  const basis = parseFloat(stil.schrift) || 12;
  const groesse = Math.max(9, Math.min(basis + 6, kleinerePx * 0.28));
  const X = welt.px(x + w / 2), Y = welt.py(y + h / 2);
  ctx.fillStyle = stil.text;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const wertText = zahl(wert);
  // Nur beschriften, wenn der Term hineinpasst; sonst nur der Zahlenwert; sonst nichts.
  ctx.font = "700 " + groesse + "px sans-serif";
  if (ctx.measureText(term).width <= wPx * 0.9 && hPx > groesse * 2.4) {
    ctx.fillText(term, X, Y - groesse * 0.72);
    ctx.font = groesse + "px sans-serif";
    ctx.fillText(wertText, X, Y + groesse * 0.72);
  } else {
    const klein = Math.max(8, Math.min(groesse, kleinerePx * 0.5));
    ctx.font = "700 " + klein + "px sans-serif";
    if (ctx.measureText(wertText).width <= wPx * 0.9 && hPx > klein * 1.3) {
      ctx.fillText(wertText, X, Y);
    }
  }
}

// Maßangabe (Klammer + Beschriftung) entlang einer Quadratkante.
function randMass(ctx, welt, x0, y0, x1, y1, text, farbe, stil, seite) {
  const basis = parseFloat(stil.schrift) || 12;
  const groesse = Math.max(10, basis + 1);
  const Xa = welt.px(x0), Ya = welt.py(y0);
  const Xb = welt.px(x1), Yb = welt.py(y1);
  ctx.strokeStyle = farbe;
  ctx.lineWidth = Math.max(1, stil.linienstaerke - 0.5);
  ctx.beginPath();
  ctx.moveTo(Xa, Ya);
  ctx.lineTo(Xb, Yb);
  ctx.stroke();
  // kleine Endmarken senkrecht zur Maßlinie
  const dx = Xb - Xa, dy = Yb - Ya, len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len, m = 5;
  ctx.beginPath();
  ctx.moveTo(Xa - nx * m, Ya - ny * m); ctx.lineTo(Xa + nx * m, Ya + ny * m);
  ctx.moveTo(Xb - nx * m, Yb - ny * m); ctx.lineTo(Xb + nx * m, Yb + ny * m);
  ctx.stroke();
  // Beschriftung mittig, leicht nach außen versetzt
  ctx.fillStyle = farbe;
  ctx.font = "700 " + groesse + "px sans-serif";
  const Xm = (Xa + Xb) / 2, Ym = (Ya + Yb) / 2;
  if (seite === "unten") {
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillText(text, Xm, Ym + 8);
  } else { // "links"
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    ctx.fillText(text, Xm - 8, Ym);
  }
}

export function zeichne({ ctx, welt, zustand: z, werte: p, stil }) {
  const a = p.a, b = p.b, s = a + b;
  const mathe = matheFarbe(stil);
  ctx.lineJoin = "round";
  ctx.lineCap = "butt";

  // Drei Farben: a²/b² in Fachblau (zwei Helligkeiten), die beiden a·b-Rechtecke in Rot.
  // Quadrat-Layout (untere linke Ecke der Teile, Breite, Höhe):
  //   a²        : (0   | b)   a × a   — oben links
  //   a·b oben  : (a   | b)   b × a   — oben rechts (Breite b, Höhe a)
  //   a·b unten : (0   | 0)   a × b   — unten links (Breite a, Höhe b)
  //   b²        : (a   | 0)   b × b   — unten rechts
  teilflaeche(ctx, welt, 0, b, a, a, mathe,       0.32, "a²",    z.a2,  stil);  // a² oben links
  teilflaeche(ctx, welt, a, b, b, a, stil.fehler, 0.22, "a · b", a * b, stil);  // a·b oben rechts
  teilflaeche(ctx, welt, 0, 0, a, b, stil.fehler, 0.22, "a · b", a * b, stil);  // a·b unten links
  teilflaeche(ctx, welt, a, 0, b, b, mathe,       0.16, "b²",    z.b2,  stil);  // b² unten rechts

  // Großes Quadrat (a + b)² kräftig umranden, damit das Ganze als Einheit erkennbar ist.
  rechteck(ctx, welt, 0, 0, s, s);
  ctx.strokeStyle = stil.text;
  ctx.lineWidth = stil.linienstaerke + 1;
  ctx.stroke();

  // Maßangaben an den Rändern: untere Kante a | b, linke Kante a | b.
  randMass(ctx, welt, 0, 0, a, 0, "a", stil.akzent, stil, "unten");      // unten: a
  randMass(ctx, welt, a, 0, s, 0, "b", stil.akzent, stil, "unten");      // unten: b
  randMass(ctx, welt, 0, b, 0, s, "a", stil.akzent, stil, "links");      // links: a (oberer Teil)
  randMass(ctx, welt, 0, 0, 0, b, "b", stil.akzent, stil, "links");      // links: b (unterer Teil)

  // Hinweis auf die Gesamt-Seitenlänge (a + b) oben über dem Quadrat.
  const basis = parseFloat(stil.schrift) || 12;
  ctx.fillStyle = stil.beschriftung;
  ctx.font = Math.max(10, basis) + "px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText("Seitenlänge a + b = " + zahl(s), welt.px(s / 2), welt.py(s) - 6);

  // Lebende Gleichung unter der Figur: erst die Formel, dann mit Zahlenwerten.
  const platz = platzGleichung(p);
  const xMitte = welt.px(s / 2);
  const gross = Math.max(basis + 3, Math.min(24, welt.laenge(0.85)));
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillStyle = stil.beschriftung;
  ctx.font = Math.round(gross * 0.74) + "px sans-serif";
  ctx.fillText("(a + b)² = a² + 2·a·b + b²", xMitte, welt.py(-platz * 0.3));

  const gleichung = "(" + zahl(a) + " + " + zahl(b) + ")² = "
    + zahl(z.a2) + " + " + zahl(z.ab2) + " + " + zahl(z.b2)
    + " = " + zahl(z.gesamt);
  ctx.fillStyle = stil.text;
  ctx.font = "700 " + gross + "px sans-serif";
  ctx.fillText(gleichung, xMitte, welt.py(-platz * 0.72));
}

// ---------- Prüffälle ----------
// Soll-Werte analytisch über (a + b)² = a² + 2·a·b + b²:
//   a=3,b=2 → gesamt 25, a² 9, 2ab 12, b² 4   (9 + 12 + 4 = 25 = 5²)
//   a=5,b=1 → gesamt 36, a² 25, 2ab 10, b² 1  (25 + 10 + 1 = 36 = 6²)
//   a=4,b=4 → gesamt 64, a² 16, 2ab 32, b² 16 (16 + 32 + 16 = 64 = 8²)
// (toleranzProzent 1)

export const pruefFaelle = [
  {
    name: "a = 3, b = 2",
    parameter: { a: 3, b: 2 },
    toleranzProzent: 1,
    soll: { gesamt: 25, a2: 9, ab2: 12, b2: 4 }
  },
  {
    name: "a = 5, b = 1",
    parameter: { a: 5, b: 1 },
    toleranzProzent: 1,
    soll: { gesamt: 36, a2: 25, ab2: 10, b2: 1 }
  },
  {
    name: "a = 4, b = 4",
    parameter: { a: 4, b: 4 },
    toleranzProzent: 1,
    soll: { gesamt: 64, a2: 16, ab2: 32, b2: 16 }
  }
];
