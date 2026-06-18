// Funktionsplotter — quadratische Funktionen in Scheitelpunktform f(x) = a·(x − d)² + e.
// Modus „statisch": Parameter ändern → sofort neu rechnen und zeichnen.
// Scheitelpunkt und Nullstellen werden live berechnet und markiert.

import { formatZahl } from "../../../assets/js/sim/welt.js";

export const manifest = {
  id: "mathematik/funktionsplotter",
  titel: "Funktionsplotter: Scheitelpunktform",
  modus: "statisch",
  parameter: [
    { id: "a", label: "Streckfaktor a",   einheit: "", min: -3, max: 3, schritt: 0.1, start: 1 },
    { id: "d", label: "Verschiebung d",   einheit: "", min: -6, max: 6, schritt: 0.5, start: 0 },
    { id: "e", label: "Verschiebung e",   einheit: "", min: -6, max: 6, schritt: 0.5, start: 0 }
  ],
  anzeigen: [
    { id: "xs", label: "Scheitel x_S",   einheit: "", stellen: 1 },
    { id: "ys", label: "Scheitel y_S",   einheit: "", stellen: 1 },
    { id: "n",  label: "Nullstellen",    einheit: "", stellen: 0 },
    { id: "x1", label: "Nullstelle x₁",  einheit: "", stellen: 2 },
    { id: "x2", label: "Nullstelle x₂",  einheit: "", stellen: 2 }
  ],
  presets: [
    { name: "Normalparabel",        werte: { a: 1, d: 0, e: 0 } },
    { name: "Nach unten geöffnet",  werte: { a: -1, d: 0, e: 4 } },
    { name: "Gestaucht",            werte: { a: 0.3, d: -2, e: -4 } },
    { name: "Keine Nullstellen",    werte: { a: 2, d: 1, e: 3 } }
  ],
  vorhersage: {
    frage: "Der Graph von f(x) = (x − d)² wird mit d = 3 gezeichnet. Wohin verschiebt sich die Normalparabel?",
    optionen: ["3 nach rechts", "3 nach links", "3 nach oben"],
    aufloesung: "3 nach rechts — obwohl im Term „− 3“ steht! Der Scheitel liegt dort, wo die Klammer null wird: x = 3. Das Minuszeichen in der Klammer verschiebt also nach rechts."
  },
  beobachtung: [
    "Ziehe a von 1 langsam nach −1. Was passiert bei a = 0 — und warum ist das keine Parabel mehr?",
    "Wähle |a| < 1 und |a| > 1. Wie wirkt a auf die Form des Graphen?",
    "Stelle e so ein, dass der Graph genau eine Nullstelle hat. Wo liegt dann der Scheitel?",
    "Finde drei verschiedene Einstellungen mit den Nullstellen x₁ = −1 und x₂ = 3. Was haben sie gemeinsam?"
  ],
  modellgrenzen: "Dargestellt wird der Ausschnitt −8 ≤ x ≤ 8, −8 ≤ y ≤ 8. Bei a = 0 entsteht die konstante Funktion f(x) = e (keine Parabel).",
  bilanz: {
    scheitelX:        { label: "Scheitel x_S", einheit: "", stellen: 2 },
    scheitelY:        { label: "Scheitel y_S", einheit: "", stellen: 2 },
    anzahlNullstellen:{ label: "Nullstellen",  einheit: "", stellen: 0 },
    nullstelle1:      { label: "x₁",           einheit: "", stellen: 4 },
    nullstelle2:      { label: "x₂",           einheit: "", stellen: 4 }
  },
  welt: { xMin: -8, xMax: 8, yMin: -8, yMax: 8 }
};

function rechne(p) {
  const erg = { xs: p.d, ys: p.e, n: NaN, x1: NaN, x2: NaN };
  if (Math.abs(p.a) < 1e-12) return erg; // konstante Funktion
  const radikand = -p.e / p.a;
  if (radikand > 1e-12) {
    erg.n = 2;
    erg.x1 = p.d - Math.sqrt(radikand);
    erg.x2 = p.d + Math.sqrt(radikand);
  } else if (radikand > -1e-12) {
    erg.n = 1;
    erg.x1 = p.d;
  } else {
    erg.n = 0;
  }
  return erg;
}

export function init(p) {
  return { t: 0, ...rechne(p) };
}

export function update() { /* statisch: nichts zu tun */ }

export function messwerte(z) {
  return { xs: z.xs, ys: z.ys, n: z.n, x1: z.x1, x2: z.x2 };
}

export function istFertig() { return true; }

export function bilanz(z) {
  const b = { scheitelX: z.xs, scheitelY: z.ys, anzahlNullstellen: isNaN(z.n) ? -1 : z.n };
  if (!isNaN(z.x1)) b.nullstelle1 = z.x1;
  if (!isNaN(z.x2)) b.nullstelle2 = z.x2;
  return b;
}

export function zeichne({ ctx, welt, werte: p, zustand: z, stil }) {
  const b = welt.bereich;

  // Koordinatenachsen durch den Ursprung
  ctx.strokeStyle = stil.text;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(welt.px(b.xMin), welt.py(0)); ctx.lineTo(welt.px(b.xMax), welt.py(0));
  ctx.moveTo(welt.px(0), welt.py(b.yMin)); ctx.lineTo(welt.px(0), welt.py(b.yMax));
  ctx.stroke();
  ctx.fillStyle = stil.text;
  ctx.font = stil.schrift;
  ctx.textAlign = "left";
  ctx.fillText("x", welt.px(b.xMax) - 12, welt.py(0) - 6);
  ctx.fillText("y", welt.px(0) + 6, welt.py(b.yMax) + 14);

  // Funktionsgraph
  ctx.strokeStyle = stil.akzent;
  ctx.lineWidth = stil.linienstaerke + 1;
  ctx.beginPath();
  let begonnen = false;
  const schritt = (b.xMax - b.xMin) / 400;
  for (let x = b.xMin; x <= b.xMax + 1e-9; x += schritt) {
    const y = p.a * (x - p.d) ** 2 + p.e;
    if (y < b.yMin - 2 || y > b.yMax + 2) { begonnen = false; continue; }
    if (!begonnen) { ctx.moveTo(welt.px(x), welt.py(y)); begonnen = true; }
    else ctx.lineTo(welt.px(x), welt.py(y));
  }
  ctx.stroke();

  // Scheitelpunkt markieren
  ctx.fillStyle = stil.ok;
  ctx.beginPath();
  ctx.arc(welt.px(z.xs), welt.py(z.ys), 6, 0, 2 * Math.PI);
  ctx.fill();
  ctx.textAlign = z.xs > 4 ? "right" : "left";
  ctx.fillText(`S(${formatZahl(z.xs, 1)} | ${formatZahl(z.ys, 1)})`, welt.px(z.xs) + (z.xs > 4 ? -10 : 10), welt.py(z.ys) - 10);

  // Nullstellen markieren
  ctx.fillStyle = stil.fehler;
  [z.x1, z.x2].forEach(x => {
    if (isNaN(x) || x < b.xMin || x > b.xMax) return;
    ctx.beginPath();
    ctx.arc(welt.px(x), welt.py(0), 5, 0, 2 * Math.PI);
    ctx.fill();
  });

  // Funktionsterm als Überschrift im Graphen
  const aT = formatZahl(p.a, 1);
  const dT = p.d === 0 ? "x" : `(x ${p.d > 0 ? "−" : "+"} ${formatZahl(Math.abs(p.d), 1)})`;
  const eT = p.e === 0 ? "" : ` ${p.e > 0 ? "+" : "−"} ${formatZahl(Math.abs(p.e), 1)}`;
  ctx.fillStyle = stil.text;
  ctx.font = "bold " + stil.schrift;
  ctx.textAlign = "left";
  ctx.fillText(`f(x) = ${aT}·${dT}²${eT}`, welt.px(b.xMin) + 8, welt.py(b.yMax) + 18);
}

// ---------- Prüffälle (Scheitel und Nullstellen analytisch) ----------

export const pruefFaelle = [
  {
    name: "a = 1, d = 2, e = −3",
    parameter: { a: 1, d: 2, e: -3 },
    toleranzProzent: 0.1,
    soll: { scheitelX: 2, scheitelY: -3, anzahlNullstellen: 2, nullstelle1: 0.26795, nullstelle2: 3.73205 }
  },
  {
    name: "a = −0,5, d = −1, e = 2",
    parameter: { a: -0.5, d: -1, e: 2 },
    toleranzProzent: 0.1,
    soll: { scheitelX: -1, scheitelY: 2, anzahlNullstellen: 2, nullstelle1: -3, nullstelle2: 1 }
  },
  {
    name: "a = 2, d = 1, e = 3 (keine Nullstellen)",
    parameter: { a: 2, d: 1, e: 3 },
    toleranzProzent: 0.1,
    soll: { scheitelX: 1, scheitelY: 3, anzahlNullstellen: 0 }
  }
];
