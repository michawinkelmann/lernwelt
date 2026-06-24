// Sekante und Tangente — vom Differenzenquotienten zur Ableitung an f(x) = 0,5·x².
// Modus „statisch": Parameter ändern → sofort neu rechnen und zeichnen.
// Exakte Algebra statt Numerik: (f(x₀+h) − f(x₀)) / h = x₀ + h/2 und f′(x₀) = x₀ —
// Sekanten-, Tangentensteigung und ihr Unterschied (h/2) sind damit rundungsfrei.

import { formatZahl } from "../../../assets/js/sim/welt.js";

// Die feste Beispielfunktion — geformt wie der Bogen einer Skater-Rampe
function f(x) { return 0.5 * x * x; }

export const manifest = {
  id: "mathematik/sekante-tangente",
  titel: "Sekante und Tangente: h läuft gegen 0",
  modus: "statisch",
  parameter: [
    { id: "x0", label: "Stelle x₀",      einheit: "", min: -3,   max: 3, schritt: 0.5,  start: 1 },
    { id: "h",  label: "Schrittweite h", einheit: "", min: 0.01, max: 3, schritt: 0.01, start: 1 }
  ],
  anzeigen: [
    { id: "sekante",   label: "Sekantensteigung",         einheit: "", stellen: 4 },
    { id: "tangente",  label: "Tangentensteigung f′(x₀)", einheit: "", stellen: 4 },
    { id: "differenz", label: "Unterschied",              einheit: "", stellen: 4 },
    { id: "fx0",       label: "f(x₀)",                    einheit: "", stellen: 2 }
  ],
  presets: [
    { name: "Startbild",     werte: { x0: 1,  h: 1 } },
    { name: "h fast 0",      werte: { x0: 1,  h: 0.05 } },
    { name: "andere Stelle", werte: { x0: -2, h: 0.5 } }
  ],
  vorhersage: {
    frage: "Q rutscht immer näher an P heran — was passiert mit der Sekante?",
    optionen: ["Sie kippt in die Lage der Tangente", "Sie wird immer steiler", "Sie verschwindet, weil P und Q zusammenfallen"],
    aufloesung: "Die Sekante kippt in die Tangente: Ihre Steigung ist hier exakt x₀ + h/2 und rückt mit kleiner werdendem h beliebig nah an die Tangentensteigung x₀ heran. Verschwinden kann sie nicht — solange h > 0 ist, sind P und Q zwei verschiedene Punkte, und der Differenzenquotient ist eine ganz gewöhnliche Steigung."
  },
  beobachtung: [
    "Halte x₀ = 1 fest und verkleinere h schrittweise: 1 → 0,5 → 0,1 → 0,01. Notiere jeweils die Sekantensteigung — auf welchen Wert steuern die Zahlen zu?",
    "Die Anzeige „Unterschied“ (Sekanten- minus Tangentensteigung) zeigt immer genau h/2. Prüfe das an mehreren Einstellungen und erkläre es mit dem Differenzenquotienten: Für f(x) = 0,5·x² ist die Sekantensteigung exakt x₀ + h/2.",
    "Wandere bei festem kleinem h (z. B. 0,05) mit x₀ durch den ganzen Bereich: Lies jeweils f′(x₀) ab und entdecke die Regel f′(x₀) = x₀.",
    "Warum darf h nie genau 0 sein — und warum stört das den Grenzwert nicht? Tipp: Wodurch würde bei h = 0 geteilt?"
  ],
  modellgrenzen: "Eine feste Beispielfunktion f(x) = 0,5·x², und der Regler endet bei h = 0,01: Den Grenzübergang h → 0 zeigt die Simulation nur näherungsweise — der Grenzwert selbst bleibt Kopfarbeit, genau wie bei den Grenzprozessen aus Klasse 10.",
  bilanz: {
    sekante:   { label: "Sekantensteigung",         einheit: "", stellen: 4 },
    tangente:  { label: "Tangentensteigung f′(x₀)", einheit: "", stellen: 4 },
    differenz: { label: "Unterschied",              einheit: "", stellen: 4 },
    fx0:       { label: "f(x₀)",                    einheit: "", stellen: 2 }
  }
};

// Sichtbereich: Standard −4 … 4 (Parabel bis f(±4) = 8); liegt Q weiter rechts
// oder höher, wächst der Ausschnitt mit, damit Q sichtbar bleibt.
export function weltBereich(p) {
  const xQ = p.x0 + p.h;
  return {
    xMin: -4,
    xMax: Math.max(4, xQ + 0.5),
    yMin: -1.2,
    yMax: Math.max(8.2, f(xQ) + 0.8)
  };
}

export function init(p) {
  return {
    t: 0,
    sekante: p.x0 + p.h / 2,   // exakt gekürzter Differenzenquotient (f(x₀+h) − f(x₀)) / h
    tangente: p.x0,            // f′(x₀) = x₀ für f(x) = 0,5·x²
    differenz: p.h / 2,        // Sekanten- minus Tangentensteigung
    fx0: f(p.x0),
    fxQ: f(p.x0 + p.h)
  };
}

export function update() { /* statisch: nichts zu tun */ }

export function messwerte(z) {
  return { sekante: z.sekante, tangente: z.tangente, differenz: z.differenz, fx0: z.fx0 };
}

export function istFertig() { return true; }

export function bilanz(z) {
  return { sekante: z.sekante, tangente: z.tangente, differenz: z.differenz, fx0: z.fx0 };
}

export function zeichne({ ctx, welt, werte: p, zustand: z, stil }) {
  const b = welt.bereich;
  const xP = p.x0, yP = z.fx0;
  const xQ = p.x0 + p.h, yQ = z.fxQ;

  // Koordinatenachsen durch den Ursprung (wie Funktionsplotter)
  ctx.strokeStyle = stil.text;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(welt.px(b.xMin), welt.py(0)); ctx.lineTo(welt.px(b.xMax), welt.py(0));
  ctx.moveTo(welt.px(0), welt.py(b.yMin)); ctx.lineTo(welt.px(0), welt.py(b.yMax));
  ctx.stroke();
  ctx.fillStyle = stil.text;
  ctx.font = stil.schrift;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("x", welt.px(b.xMax) - 12, welt.py(0) - 6);
  ctx.fillText("y", welt.px(0) + 6, welt.py(b.yMax) + 14);

  // Geometrie nur innerhalb des Koordinatenbereichs zeichnen (Geraden laufen sonst in den Rand)
  ctx.save();
  ctx.beginPath();
  ctx.rect(welt.px(b.xMin), welt.py(b.yMax), welt.laenge(b.xMax - b.xMin), welt.laenge(b.yMax - b.yMin));
  ctx.clip();

  // Parabel f(x) = 0,5·x²
  ctx.strokeStyle = stil.text;
  ctx.lineWidth = stil.linienstaerke + 1;
  ctx.beginPath();
  const schritt = (b.xMax - b.xMin) / 400;
  for (let x = b.xMin; x <= b.xMax + 1e-9; x += schritt) {
    if (x === b.xMin) ctx.moveTo(welt.px(x), welt.py(f(x)));
    else ctx.lineTo(welt.px(x), welt.py(f(x)));
  }
  ctx.stroke();

  // Steigungsdreieck: senkrechter Rest gestrichelt (Zähler des Differenzenquotienten) …
  ctx.strokeStyle = stil.beschriftung;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(welt.px(xQ), welt.py(yP));
  ctx.lineTo(welt.px(xQ), welt.py(yQ));
  ctx.stroke();
  ctx.setLineDash([]);

  // … und die waagerechte h-Strecke zwischen P und Q als Klammer mit Endstrichen (Nenner h)
  ctx.strokeStyle = stil.text;
  ctx.beginPath();
  ctx.moveTo(welt.px(xP), welt.py(yP)); ctx.lineTo(welt.px(xQ), welt.py(yP));
  ctx.moveTo(welt.px(xP), welt.py(yP) - 5); ctx.lineTo(welt.px(xP), welt.py(yP) + 5);
  ctx.moveTo(welt.px(xQ), welt.py(yP) - 5); ctx.lineTo(welt.px(xQ), welt.py(yP) + 5);
  ctx.stroke();

  // Sekante: volle Gerade durch P und Q
  ctx.strokeStyle = stil.akzent;
  ctx.lineWidth = stil.linienstaerke + 1;
  ctx.beginPath();
  ctx.moveTo(welt.px(b.xMin), welt.py(yP + z.sekante * (b.xMin - xP)));
  ctx.lineTo(welt.px(b.xMax), welt.py(yP + z.sekante * (b.xMax - xP)));
  ctx.stroke();

  // Tangente in P, gestrichelt — bei kleinem h legt sich die Sekante sichtbar auf sie
  ctx.strokeStyle = stil.ok;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(welt.px(b.xMin), welt.py(yP + z.tangente * (b.xMin - xP)));
  ctx.lineTo(welt.px(b.xMax), welt.py(yP + z.tangente * (b.xMax - xP)));
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Label „h = …" mittig unter der h-Strecke; nah an der x-Achse darunter ausweichen
  ctx.fillStyle = stil.text;
  ctx.font = stil.schrift;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  let hLabelY = welt.py(yP) + 8;
  if (welt.py(0) - welt.py(yP) < 22) hLabelY = welt.py(0) + 6;
  ctx.fillText("h = " + formatZahl(p.h, 2), welt.px(xP + p.h / 2), hLabelY);

  // Punkte P(x₀|f(x₀)) und Q(x₀+h|f(x₀+h)) markieren und beschriften
  ctx.lineWidth = 2;
  [[xP, yP, "P", -1], [xQ, yQ, "Q", 1]].forEach(([x, y, name, seite]) => {
    ctx.beginPath();
    ctx.arc(welt.px(x), welt.py(y), 5, 0, 2 * Math.PI);
    ctx.fillStyle = stil.flaeche;
    ctx.fill();
    ctx.strokeStyle = stil.text;
    ctx.stroke();
    ctx.fillStyle = stil.text;
    ctx.font = "bold " + stil.schrift;
    ctx.textAlign = seite < 0 ? "right" : "left";
    ctx.textBaseline = "bottom";
    ctx.fillText(name, welt.px(x) + seite * 9, welt.py(y) - 7);
  });

  // Mini-Legende mit den aktuellen Steigungswerten (oben, außerhalb der Kurve)
  const zeilenHoehe = stil.schrift.startsWith("16") ? 24 : 19;
  const lx = welt.px(-2);
  let ly = welt.py(b.yMax) + 16;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.font = "bold " + stil.schrift;
  ctx.fillStyle = stil.text;
  ctx.fillText("f(x) = 0,5·x²", lx, ly);
  ctx.font = stil.schrift;
  ctx.lineWidth = stil.linienstaerke + 1;
  ly += zeilenHoehe;
  ctx.strokeStyle = stil.akzent;
  ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + 24, ly); ctx.stroke();
  ctx.fillStyle = stil.akzent;
  ctx.fillText("Sekante: m = " + formatZahl(z.sekante, 4), lx + 30, ly);
  ly += zeilenHoehe;
  ctx.strokeStyle = stil.ok;
  ctx.setLineDash([6, 4]);
  ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + 24, ly); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = stil.ok;
  ctx.fillText("Tangente: f′(x₀) = " + formatZahl(z.tangente, 4), lx + 30, ly);
}

// ---------- Prüffälle (Steigungen analytisch: Sekante x₀ + h/2, Tangente x₀) ----------

export const pruefFaelle = [
  {
    name: "x₀ = 1, h = 1 (Startbild)",
    parameter: { x0: 1, h: 1 },
    toleranzProzent: 0.2,
    soll: { sekante: 1.5, tangente: 1, differenz: 0.5 }
  },
  {
    name: "x₀ = 1, h = 0,01 (h fast 0)",
    parameter: { x0: 1, h: 0.01 },
    toleranzProzent: 0.2,
    soll: { sekante: 1.005 }
  },
  {
    name: "x₀ = −2, h = 0,5",
    parameter: { x0: -2, h: 0.5 },
    toleranzProzent: 0.2,
    soll: { sekante: -1.75, tangente: -2 }
  }
];
