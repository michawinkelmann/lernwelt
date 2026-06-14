// Lineares Gleichungssystem grafisch loesen — zwei lineare Gleichungen in zwei Variablen
// als zwei Geraden in der Ebene (Sek I, Algebra). Modus „statisch“: an den Reglern die
// Steigungen m1, m2 und die y-Achsenabschnitte b1, b2 einstellen → die beiden Geraden und
// ihr Schnittpunkt werden sofort neu gerechnet und gezeichnet. Der Schnittpunkt ist die
// Loesung des LGS.
//
// Modell (exakt): zwei Geraden
//   g1: y = m1 * x + b1
//   g2: y = m2 * x + b2
// Der Schnittpunkt loest beide Gleichungen zugleich, also das LGS. Fallunterscheidung:
//   m1 != m2  → genau ein Schnittpunkt; x_s = (b2 - b1) / (m1 - m2), y_s = m1 * x_s + b1
//               (typ = 0: genau eine Loesung)
//   m1 == m2 und b1 == b2 → die Geraden sind identisch (typ = 2: unendlich viele Loesungen)
//   m1 == m2 und b1 != b2 → die Geraden sind parallel (typ = 1: keine Loesung)

import { formatZahl } from "../../../assets/js/sim/welt.js";

// Vergleich zweier Gleitkommawerte mit kleiner Toleranz (Regler-Schrittweite 0,5 → unkritisch)
const GLEICH = 1e-9;

export const manifest = {
  id: "mathematik/lineare-gleichungssysteme",
  titel: "Lineares Gleichungssystem grafisch lösen",
  modus: "statisch",
  raster: false,    // eigenes Gitter mit Achsen ohne physikalische Einheit
  werkzeuge: false, // Werte stehen in der Anzeige; Lineal/Winkelmesser nicht nötig
  parameter: [
    { id: "m1", label: "Steigung m₁ (Gerade 1)",         einheit: "", min: -3, max: 3, schritt: 0.5, start: 1 },
    { id: "b1", label: "y-Achsenabschnitt b₁ (Gerade 1)", einheit: "", min: -5, max: 5, schritt: 0.5, start: 0 },
    { id: "m2", label: "Steigung m₂ (Gerade 2)",         einheit: "", min: -3, max: 3, schritt: 0.5, start: -1 },
    { id: "b2", label: "y-Achsenabschnitt b₂ (Gerade 2)", einheit: "", min: -5, max: 5, schritt: 0.5, start: 4 }
  ],
  anzeigen: [
    { id: "x_s", label: "Lösung x (Schnittpunkt)", einheit: "", stellen: 2 },
    { id: "y_s", label: "Lösung y (Schnittpunkt)", einheit: "", stellen: 2 }
  ],
  presets: [
    { name: "Eine Lösung",        werte: { m1: 1,  b1: 0, m2: -1, b2: 4 } },
    { name: "Keine (parallel)",   werte: { m1: 2,  b1: 1, m2: 2,  b2: 5 } },
    { name: "Unendlich (gleich)", werte: { m1: 1,  b1: 0, m2: 1,  b2: 0 } }
  ],
  vorhersage: {
    frage: "Zwei Geraden haben die gleiche Steigung, aber verschiedene y-Achsenabschnitte. Wie viele Lösungen hat das zugehörige Gleichungssystem?",
    optionen: [
      "Genau eine Lösung",
      "Keine Lösung — die Geraden sind parallel",
      "Unendlich viele Lösungen"
    ],
    aufloesung: "Keine Lösung. Geraden mit gleicher Steigung verlaufen parallel; bei verschiedenen y-Achsenabschnitten schneiden sie sich nie, es gibt also keinen gemeinsamen Punkt und damit keine Lösung. Nur wenn auch die y-Achsenabschnitte gleich sind, fallen die Geraden zusammen (unendlich viele Lösungen). Stelle das Preset „Keine (parallel)“ ein und sieh es dir an."
  },
  beobachtung: [
    "Eine Lösung: Stelle verschiedene Steigungen ein (z. B. m₁ = 1, m₂ = −1). Die Geraden schneiden sich in genau einem Punkt. Lies seine Koordinaten ab — das ist die Lösung (x, y) des Gleichungssystems. Vergleiche mit der Anzeige.",
    "Keine Lösung: Setze m₁ = m₂, aber b₁ ≠ b₂ (z. B. m₁ = m₂ = 2, b₁ = 1, b₂ = 5). Die Geraden sind parallel und schneiden sich nie. Das System hat keine Lösung.",
    "Unendlich viele Lösungen: Setze m₁ = m₂ und b₁ = b₂. Beide Geraden liegen exakt aufeinander — jeder Punkt der Geraden ist eine Lösung.",
    "Steigung und Abschnitt verändern: Lass eine Gerade fest und schiebe die andere (b verändern) oder kippe sie (m verändern). Beobachte, wie der Schnittpunkt wandert. Wann liegt er genau auf der y-Achse (x = 0)?"
  ],
  modellgrenzen: "Dargestellt sind nur zwei lineare Gleichungen mit zwei Variablen x und y. Senkrechte Geraden (x = const) lassen sich mit der Form y = m·x + b nicht erzeugen. Das grafische Ablesen ist bei flach kreuzenden Geraden ungenau — rechnerisch (Gleichsetzen, Einsetzen) erhält man den exakten Schnittpunkt.",
  bilanz: {
    x_s: { label: "Lösung x", einheit: "", stellen: 4 },
    y_s: { label: "Lösung y", einheit: "", stellen: 4 },
    typ: { label: "Lösungstyp (0 = eine, 1 = keine, 2 = unendlich)", einheit: "", stellen: 0 }
  }
};

// ---------- Modell (exakte Loesung des LGS) ----------

// Schnittpunkt / Loesungstyp aus den vier Parametern bestimmen.
// typ: 0 = genau eine Loesung, 1 = keine Loesung (parallel), 2 = unendlich viele (identisch)
function loese(p) {
  if (Math.abs(p.m1 - p.m2) < GLEICH) {
    // gleiche Steigung → parallel oder identisch
    if (Math.abs(p.b1 - p.b2) < GLEICH) return { typ: 2, x_s: 0, y_s: 0 };
    return { typ: 1, x_s: 0, y_s: 0 };
  }
  const x_s = (p.b2 - p.b1) / (p.m1 - p.m2);
  const y_s = p.m1 * x_s + p.b1;
  return { typ: 0, x_s, y_s };
}

export function init(p) {
  const l = loese(p);
  return { t: 0, typ: l.typ, x_s: l.x_s, y_s: l.y_s };
}

export function update() { /* statisch: nichts zu tun */ }

export function messwerte(z) {
  // Bei typ != 0 gibt es keinen eindeutigen Schnittpunkt → 0 (Anzeige weist per Hinweis darauf hin)
  if (z.typ !== 0) return { x_s: 0, y_s: 0 };
  return { x_s: z.x_s, y_s: z.y_s };
}

export function istFertig() { return true; }

export function bilanz(z) {
  if (z.typ !== 0) return { x_s: 0, y_s: 0, typ: z.typ };
  return { x_s: z.x_s, y_s: z.y_s, typ: z.typ };
}

// ---------- Sichtbarer Weltausschnitt ----------
// Symmetrisch um den Ursprung, damit x und y gleich skaliert sind (welt.px/py bilden
// gleichmaßstaeblich ab).
export function weltBereich() {
  return { xMin: -8, xMax: 8, yMin: -8, yMax: 8 };
}

// ---------- Darstellung ----------

// Fachfarbe Mathematik aus den Design-Tokens (Fallback: Akzentfarbe der Engine)
function matheFarbe(stil) {
  if (typeof document === "undefined") return stil.akzent;
  const wert = getComputedStyle(document.documentElement).getPropertyValue("--mathe").trim();
  return wert || stil.akzent;
}

// Zahl ohne ueberfluessige Nachkommastellen: 6 → „6“, 2,5 → „2,5“, −1 → „−1“
function zahl(wert) {
  if (Math.abs(wert - Math.round(wert)) < 1e-9) return formatZahl(wert, 0);
  if (Math.abs(10 * wert - Math.round(10 * wert)) < 1e-9) return formatZahl(wert, 1);
  return formatZahl(wert, 2);
}

// Gleichungs-Label „y = m·x + b“ kompakt und lesbar zusammensetzen
function gleichungsText(name, m, b) {
  let s = name + ": y = ";
  // Steigungsterm
  if (Math.abs(m) < 1e-9) s += "0";
  else if (Math.abs(m - 1) < 1e-9) s += "x";
  else if (Math.abs(m + 1) < 1e-9) s += "−x";
  else s += zahl(m) + "·x";
  // Abschnittsterm
  if (Math.abs(b) >= 1e-9 && Math.abs(m) >= 1e-9) {
    s += (b > 0 ? " + " : " − ") + zahl(Math.abs(b));
  } else if (Math.abs(b) >= 1e-9) {
    // m == 0: y = b (ohne fuehrendes „0 +“)
    s = name + ": y = " + zahl(b);
  }
  return s;
}

export function zeichne({ ctx, welt, zustand: z, werte: p, stil }) {
  const mathe = matheFarbe(stil);
  const farbe1 = stil.akzent;   // Gerade 1: Akzentblau
  const farbe2 = stil.fehler;   // Gerade 2: Kontrastfarbe (zweite Linienfarbe)
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const GB = welt.bereich;

  // --- Eigenes Koordinatengitter + Achsen (ohne Einheit) ---
  ctx.save();
  ctx.strokeStyle = stil.raster; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let gx = Math.ceil(GB.xMin); gx <= GB.xMax; gx++) { ctx.moveTo(welt.px(gx), welt.py(GB.yMin)); ctx.lineTo(welt.px(gx), welt.py(GB.yMax)); }
  for (let gy = Math.ceil(GB.yMin); gy <= GB.yMax; gy++) { ctx.moveTo(welt.px(GB.xMin), welt.py(gy)); ctx.lineTo(welt.px(GB.xMax), welt.py(gy)); }
  ctx.stroke();
  // Achsen kraeftiger
  ctx.strokeStyle = stil.beschriftung; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(welt.px(GB.xMin), welt.py(0)); ctx.lineTo(welt.px(GB.xMax), welt.py(0));
  ctx.moveTo(welt.px(0), welt.py(GB.yMin)); ctx.lineTo(welt.px(0), welt.py(GB.yMax));
  ctx.stroke();
  // Achsenbeschriftung (Zahlen an den ganzzahligen Ticks)
  ctx.fillStyle = stil.beschriftung; ctx.font = stil.schrift;
  ctx.textAlign = "center"; ctx.textBaseline = "top";
  for (let gx = Math.ceil(GB.xMin); gx <= GB.xMax; gx += 2) { if (gx !== 0) ctx.fillText(String(gx), welt.px(gx), welt.py(0) + 4); }
  ctx.textAlign = "right"; ctx.textBaseline = "middle";
  for (let gy = Math.ceil(GB.yMin); gy <= GB.yMax; gy += 2) { if (gy !== 0) ctx.fillText(String(gy), welt.px(0) - 5, welt.py(gy)); }
  // Achsen-Namen x und y
  ctx.fillStyle = stil.beschriftung; ctx.textAlign = "right"; ctx.textBaseline = "bottom";
  ctx.fillText("x", welt.px(GB.xMax) - 4, welt.py(0) - 4);
  ctx.textAlign = "left"; ctx.textBaseline = "top";
  ctx.fillText("y", welt.px(0) + 6, welt.py(GB.yMax) + 2);
  ctx.restore();

  // --- Hilfsfunktion: eine Gerade y = m·x + b ueber die volle Breite zeichnen ---
  function zeichneGerade(m, b, farbe) {
    const y0 = m * GB.xMin + b;
    const y1 = m * GB.xMax + b;
    ctx.strokeStyle = farbe;
    ctx.lineWidth = stil.linienstaerke;
    ctx.beginPath();
    ctx.moveTo(welt.px(GB.xMin), welt.py(y0));
    ctx.lineTo(welt.px(GB.xMax), welt.py(y1));
    ctx.stroke();
  }

  // Bei identischen Geraden (typ 2) liegen sie aufeinander: Gerade 2 gestrichelt zeichnen,
  // damit beide Farben erkennbar bleiben.
  zeichneGerade(p.m1, p.b1, farbe1);
  if (z.typ === 2) {
    ctx.save();
    ctx.setLineDash([8, 6]);
    zeichneGerade(p.m2, p.b2, farbe2);
    ctx.restore();
  } else {
    zeichneGerade(p.m2, p.b2, farbe2);
  }

  // --- Gleichungs-Labels neben den Geraden (am rechten Rand) ---
  const basis = parseFloat(stil.schrift) || 12;
  const lblGroesse = Math.max(11, basis + 1);
  ctx.font = "700 " + lblGroesse + "px sans-serif";
  ctx.textBaseline = "middle";
  function geradenLabel(m, b, farbe, text) {
    // Position knapp innerhalb des rechten Randes auf Hoehe der Geraden
    const xPos = GB.xMax - 0.3;
    let yPos = m * xPos + b;
    yPos = Math.max(GB.yMin + 0.4, Math.min(GB.yMax - 0.4, yPos));
    ctx.fillStyle = farbe;
    ctx.textAlign = "right";
    ctx.fillText(text, welt.px(xPos), welt.py(yPos));
  }
  geradenLabel(p.m1, p.b1, farbe1, gleichungsText("g₁", p.m1, p.b1));
  // bei identisch das zweite Label leicht versetzt, sonst ueberdeckt es g1
  geradenLabel(p.m2, p.b2, farbe2, gleichungsText("g₂", p.m2, p.b2));

  // --- Schnittpunkt markieren (nur bei genau einer Loesung) ---
  if (z.typ === 0 && z.x_s >= GB.xMin && z.x_s <= GB.xMax && z.y_s >= GB.yMin && z.y_s <= GB.yMax) {
    const X = welt.px(z.x_s), Y = welt.py(z.y_s);
    // Hilfslinien zum Punkt (gestrichelt)
    ctx.save();
    ctx.strokeStyle = stil.beschriftung;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(welt.px(z.x_s), welt.py(0)); ctx.lineTo(X, Y);
    ctx.moveTo(welt.px(0), welt.py(z.y_s)); ctx.lineTo(X, Y);
    ctx.stroke();
    ctx.restore();
    // Punkt
    ctx.fillStyle = mathe;
    ctx.strokeStyle = stil.flaeche;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(X, Y, Math.max(5, stil.linienstaerke + 3), 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    // Koordinaten-Beschriftung am Punkt
    ctx.font = "700 " + (lblGroesse + 1) + "px sans-serif";
    ctx.fillStyle = stil.text;
    ctx.textAlign = z.x_s <= GB.xMax - 2 ? "left" : "right";
    ctx.textBaseline = "bottom";
    const dx = z.x_s <= GB.xMax - 2 ? 10 : -10;
    ctx.fillText("S(" + zahl(z.x_s) + " | " + zahl(z.y_s) + ")", X + dx, Y - 8);
  }

  // --- Textblock unten links: Lage / Anzahl der Loesungen ---
  const xText = 12;
  let yText = welt.hoehe - 12;
  const klein = Math.max(11, basis);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  if (z.typ === 1) {
    ctx.font = "700 " + (klein + 1) + "px sans-serif";
    ctx.fillStyle = stil.fehler;
    ctx.fillText("Parallele Geraden — keine Lösung", xText, yText);
  } else if (z.typ === 2) {
    ctx.font = "700 " + (klein + 1) + "px sans-serif";
    ctx.fillStyle = mathe;
    ctx.fillText("Identische Geraden — unendlich viele Lösungen", xText, yText);
  } else {
    ctx.font = "700 " + (klein + 1) + "px sans-serif";
    ctx.fillStyle = stil.text;
    ctx.fillText("Schnittpunkt S(" + zahl(z.x_s) + " | " + zahl(z.y_s) + ") — genau eine Lösung", xText, yText);
  }
}

// ---------- Prueffaelle ----------
// Soll-Werte analytisch: x_s = (b2 - b1) / (m1 - m2), y_s = m1 * x_s + b1.
// typ exakt; bei x_s/y_s = 0 prueft die Validierung absolut, sonst toleranzProzent 1.

export const pruefFaelle = [
  {
    name: "Eine Lösung: g1 y=x, g2 y=−x+4",
    parameter: { m1: 1, b1: 0, m2: -1, b2: 4 },
    toleranzProzent: 1,
    soll: { x_s: 2, y_s: 2, typ: 0 }
  },
  {
    name: "Keine Lösung (parallel): m1=m2=2, b1=1, b2=5",
    parameter: { m1: 2, b1: 1, m2: 2, b2: 5 },
    toleranzProzent: 1,
    soll: { typ: 1 }
  },
  {
    name: "Unendlich viele (identisch): g1 = g2 = x",
    parameter: { m1: 1, b1: 0, m2: 1, b2: 0 },
    toleranzProzent: 1,
    soll: { typ: 2 }
  },
  {
    name: "Eine Lösung: g1 y=0,5x+1, g2 y=−x+4",
    parameter: { m1: 0.5, b1: 1, m2: -1, b2: 4 },
    toleranzProzent: 1,
    soll: { x_s: 2, y_s: 2, typ: 0 }
  }
];
