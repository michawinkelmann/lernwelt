// Baumdiagramm und Vierfeldertafel — zweistufiges Zufallsexperiment (Mathematik, Stochastik).
// Erste Stufe: A bzw. ¬A mit P(A)=p, P(¬A)=1−p. Zweite Stufe (bedingt): B bzw. ¬B mit
// P(B|A)=q1, P(B|¬A)=q2. Die Pfadregel liefert die Wahrscheinlichkeit eines Ergebnisses
// als Produkt der Wahrscheinlichkeiten entlang seiner Äste:
//   P(A∩B)   = p · q1
//   P(A∩¬B)  = p · (1−q1)
//   P(¬A∩B)  = (1−p) · q2
//   P(¬A∩¬B) = (1−p) · (1−q2)
// Die Summe aller vier Pfade ist immer 1 (Kontrolle). Dieselben vier Werte stehen in der
// Vierfeldertafel; ihre Randsummen sind die Wahrscheinlichkeiten der einzelnen Ereignisse.
// Statischer Modus: Schieberegler ändern → sofort neu rechnen und zeichnen.

import { formatZahl } from "../../../assets/js/sim/welt.js";

// ---------- Modell: die vier Pfadwahrscheinlichkeiten aus p, q1, q2 ----------
function pfade(werte) {
  const p = werte.p ?? 0.5;
  const q1 = werte.q1 ?? 0.8;
  const q2 = werte.q2 ?? 0.3;
  const pAB = p * q1;
  const pAnB = p * (1 - q1);
  const pnAB = (1 - p) * q2;
  const pnAnB = (1 - p) * (1 - q2);
  return {
    p, q1, q2,
    pAB, pAnB, pnAB, pnAnB,
    summe: pAB + pAnB + pnAB + pnAnB
  };
}

export const manifest = {
  id: "mathematik/baumdiagramm",
  titel: "Baumdiagramm und Vierfeldertafel",
  modus: "statisch",
  raster: false,    // eigene Abbildung (Baum + Tafel), kein Meter-Karoraster
  werkzeuge: false, // Lineal/Winkelmesser helfen hier nicht weiter
  parameter: [
    { id: "p",  label: "P(A)",     einheit: "", min: 0, max: 1, schritt: 0.1, start: 0.5 },
    { id: "q1", label: "P(B|A)",   einheit: "", min: 0, max: 1, schritt: 0.1, start: 0.8 },
    { id: "q2", label: "P(B|¬A)",  einheit: "", min: 0, max: 1, schritt: 0.1, start: 0.3 }
  ],
  anzeigen: [
    { id: "pAB",   label: "P(A ∩ B)",   einheit: "", stellen: 2 },
    { id: "pAnB",  label: "P(A ∩ ¬B)",  einheit: "", stellen: 2 },
    { id: "pnAB",  label: "P(¬A ∩ B)",  einheit: "", stellen: 2 },
    { id: "pnAnB", label: "P(¬A ∩ ¬B)", einheit: "", stellen: 2 }
  ],
  presets: [
    { name: "Standard (0,5 · 0,8 / 0,3)", werte: { p: 0.5, q1: 0.8, q2: 0.3 } },
    { name: "unabhängig (q1 = q2)",        werte: { p: 0.6, q1: 0.5, q2: 0.5 } },
    { name: "Test mit Fehlern",            werte: { p: 0.2, q1: 0.9, q2: 0.1 } }
  ],
  vorhersage: {
    frage: "Wie berechnet man die Wahrscheinlichkeit eines einzelnen Pfades im Baumdiagramm?",
    optionen: [
      "Die Wahrscheinlichkeiten entlang des Pfades multiplizieren",
      "Die Wahrscheinlichkeiten entlang des Pfades addieren",
      "Die größte Wahrscheinlichkeit auf dem Pfad nehmen"
    ],
    aufloesung: "Man multipliziert die Wahrscheinlichkeiten entlang des Pfades — das ist die 1. Pfadregel. Beispiel: P(A ∩ B) = P(A) · P(B|A) = p · q1. Addiert wird erst, wenn man mehrere Pfade zu einem Ereignis zusammenfasst (2. Pfadregel), z. B. P(B) = p · q1 + (1−p) · q2. Die Summe aller vier Pfade ergibt immer 1."
  },
  beobachtung: [
    "Pfadregel: Lies an einem Blatt des Baums die beiden Astwahrscheinlichkeiten ab und multipliziere sie im Kopf. Stimmt dein Ergebnis mit der angezeigten Pfadwahrscheinlichkeit überein?",
    "Summe = 1: Addiere die vier Werte an den Blättern (oder die vier inneren Felder der Tafel). Verschiebe danach p, q1 und q2 beliebig — die Summe bleibt immer genau 1. Warum muss das so sein?",
    "Tafel ↔ Baum: Suche zu jedem inneren Feld der Vierfeldertafel den passenden Pfad im Baum. Welche Randsumme der Tafel entspricht P(A), welche P(B)?",
    "Bedingte Wahrscheinlichkeit: Stelle q1 und q2 zuerst gleich groß ein (A und B unabhängig). Mache sie dann sehr verschieden. Wie verändern sich dadurch die vier Pfadwahrscheinlichkeiten — und die Randsumme P(B)?"
  ],
  modellgrenzen: "Das Modell zeigt ein zweistufiges Zufallsexperiment mit genau zwei Ausgängen je Stufe (A/¬A, dann B/¬B). Alle Wahrscheinlichkeiten liegen zwischen 0 und 1. Mehr Stufen oder mehr als zwei Ausgänge pro Stufe lassen sich so nicht darstellen.",
  bilanz: {
    pAB:   { label: "P(A ∩ B)",   einheit: "", stellen: 4 },
    pAnB:  { label: "P(A ∩ ¬B)",  einheit: "", stellen: 4 },
    pnAB:  { label: "P(¬A ∩ B)",  einheit: "", stellen: 4 },
    pnAnB: { label: "P(¬A ∩ ¬B)", einheit: "", stellen: 4 },
    summe: { label: "Summe aller Pfade", einheit: "", stellen: 4 }
  }
};

// ---------- Engine-Vertrag (statisch) ----------
export function init() { return { t: 0 }; }
export function update() {}
export function istFertig() { return true; }

export function messwerte(z, werte) {
  const r = pfade(werte);
  return { pAB: r.pAB, pAnB: r.pAnB, pnAB: r.pnAB, pnAnB: r.pnAnB };
}

export function bilanz(z, werte) {
  const r = pfade(werte);
  return { pAB: r.pAB, pAnB: r.pAnB, pnAB: r.pnAB, pnAnB: r.pnAnB, summe: r.summe };
}

// Welt nur formal; gezeichnet wird über welt.breite/hoehe in eigener Abbildung.
export function weltBereich() {
  return { xMin: 0, xMax: 10, yMin: 0, yMax: 10 };
}

// ---------- Zeichnung: links Baumdiagramm, rechts Vierfeldertafel ----------
export function zeichne({ ctx, welt, werte, stil }) {
  const r = pfade(werte);
  const B = welt.breite, H = welt.hoehe;
  ctx.save();
  ctx.font = stil.schrift;
  ctx.lineJoin = "round";

  // Bei schmalen Ansichten (Handy) untereinander statt nebeneinander
  const schmal = B < 560;
  if (schmal) {
    const baumH = H * 0.56;
    zeichneBaum(ctx, stil, r, 6, 4, B - 12, baumH - 8);
    zeichneTafel(ctx, stil, r, 6, baumH + 4, B - 12, H - baumH - 8);
  } else {
    const baumB = B * 0.56;
    zeichneBaum(ctx, stil, r, 4, 4, baumB - 8, H - 8);
    zeichneTafel(ctx, stil, r, baumB + 6, 6, B - baumB - 12, H - 12);
  }
  ctx.restore();
}

// p auf 2 Nachkommastellen, deutsche Schreibweise (0,80)
function z2(v) { return formatZahl(v, 2); }

// ---------- Baumdiagramm in Rechteck (x,y,b,h) ----------
function zeichneBaum(ctx, stil, r, x, y, b, h) {
  const padT = 26, padB = 14;
  const oy = y + padT;            // oberer nutzbarer Rand (unter der Überschrift)
  const uh = h - padT - padB;     // nutzbare Höhe

  // Knotenpositionen: Wurzel links mittig, 1. Stufe (2 Knoten), Blätter (4 Knoten)
  const xWurzel = x + b * 0.06;
  const xStufe1 = x + b * 0.42;
  const xBlatt  = x + b * 0.74;
  const yWurzel = oy + uh * 0.5;
  const yA  = oy + uh * 0.22;     // A (oben)
  const ynA = oy + uh * 0.78;     // ¬A (unten)
  // Blätter um die jeweilige Stufe-1-Höhe gruppiert
  const yAB   = oy + uh * 0.08;
  const yAnB  = oy + uh * 0.36;
  const ynAB  = oy + uh * 0.64;
  const ynAnB = oy + uh * 0.92;

  // Überschrift
  ctx.fillStyle = stil.text;
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.font = ueberschriftFont(stil);
  ctx.fillText("Baumdiagramm", x, y + 16);
  ctx.font = stil.schrift;

  // ---- Äste der 1. Stufe ----
  ast(ctx, stil, xWurzel, yWurzel, xStufe1, yA,  "P(A) = " + z2(r.p),       "ob");
  ast(ctx, stil, xWurzel, yWurzel, xStufe1, ynA, "P(¬A) = " + z2(1 - r.p),  "un");

  // ---- Äste der 2. Stufe ----
  ast(ctx, stil, xStufe1, yA,  xBlatt, yAB,   "P(B|A) = " + z2(r.q1),       "ob");
  ast(ctx, stil, xStufe1, yA,  xBlatt, yAnB,  "P(¬B|A) = " + z2(1 - r.q1),  "un");
  ast(ctx, stil, xStufe1, ynA, xBlatt, ynAB,  "P(B|¬A) = " + z2(r.q2),      "ob");
  ast(ctx, stil, xStufe1, ynA, xBlatt, ynAnB, "P(¬B|¬A) = " + z2(1 - r.q2), "un");

  // ---- Knoten ----
  knoten(ctx, stil, xWurzel, yWurzel, "", stil.beschriftung);
  knoten(ctx, stil, xStufe1, yA,  "A",  stil.akzent);
  knoten(ctx, stil, xStufe1, ynA, "¬A", stil.akzent);
  knoten(ctx, stil, xBlatt, yAB,   "B",  stil.text);
  knoten(ctx, stil, xBlatt, yAnB,  "¬B", stil.text);
  knoten(ctx, stil, xBlatt, ynAB,  "B",  stil.text);
  knoten(ctx, stil, xBlatt, ynAnB, "¬B", stil.text);

  // ---- Pfadwahrscheinlichkeiten an den Blättern (rechts) ----
  const bx = xBlatt + 16;
  blatt(ctx, stil, bx, yAB,   "= " + z2(r.pAB),   r.pAB);
  blatt(ctx, stil, bx, yAnB,  "= " + z2(r.pAnB),  r.pAnB);
  blatt(ctx, stil, bx, ynAB,  "= " + z2(r.pnAB),  r.pnAB);
  blatt(ctx, stil, bx, ynAnB, "= " + z2(r.pnAnB), r.pnAnB);

  // Kontroll-Summe unter dem Baum
  ctx.fillStyle = stil.beschriftung;
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.fillText("Summe aller Pfade = " + z2(r.summe), x, y + h - 2);
}

function ueberschriftFont(stil) {
  // gleiche Familie/Größe wie stil.schrift, aber fett
  return "600 " + stil.schrift;
}

// Ast als Linie mit Beschriftung in der Mitte (etwas oberhalb/unterhalb versetzt)
function ast(ctx, stil, x1, y1, x2, y2, text, lage) {
  ctx.strokeStyle = stil.beschriftung;
  ctx.lineWidth = Math.max(1, stil.linienstaerke - 1);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  ctx.fillStyle = stil.text;
  ctx.textAlign = "center";
  ctx.textBaseline = lage === "ob" ? "bottom" : "top";
  const dy = lage === "ob" ? -3 : 3;
  // dezenter Hintergrund, damit die Beschriftung den Ast nicht überlagert
  const m = ctx.measureText(text);
  const tw = m.width + 6, th = 14;
  ctx.fillStyle = farbeMitAlpha(stil.flaeche, 0.82);
  ctx.fillRect(mx - tw / 2, my + dy - (lage === "ob" ? th : 0), tw, th);
  ctx.fillStyle = stil.text;
  ctx.fillText(text, mx, my + dy);
}

// Knoten als kleiner Kreis mit Beschriftung
function knoten(ctx, stil, x, y, text, farbe) {
  ctx.beginPath();
  ctx.arc(x, y, text ? 4 : 3, 0, 2 * Math.PI);
  ctx.fillStyle = text ? farbeMitAlpha(stil.flaeche, 1) : stil.beschriftung;
  ctx.fill();
  ctx.lineWidth = Math.max(1, stil.linienstaerke - 1);
  ctx.strokeStyle = farbe;
  ctx.stroke();
  if (text) {
    ctx.fillStyle = farbe;
    ctx.font = ueberschriftFont(stil);
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(text, x, y - 6);
    ctx.font = stil.schrift;
  }
}

// Pfadwahrscheinlichkeit am Blatt; bei 0 dezent grau
function blatt(ctx, stil, x, y, text, wert) {
  ctx.fillStyle = wert < 1e-9 ? stil.beschriftung : stil.akzent;
  ctx.font = ueberschriftFont(stil);
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
  ctx.font = stil.schrift;
}

// ---------- Vierfeldertafel in Rechteck (x,y,b,h) ----------
function zeichneTafel(ctx, stil, r, x, y, b, h) {
  // Überschrift
  ctx.fillStyle = stil.text;
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.font = ueberschriftFont(stil);
  ctx.fillText("Vierfeldertafel", x, y + 16);
  ctx.font = stil.schrift;

  const oy = y + 26;
  const tafelH = h - 26;
  // 3 Spalten (Kopf, B, ¬B, Σ) -> 4 Spalten; 3 Zeilen (Kopf, A, ¬A, Σ) -> 4 Zeilen
  const spalten = 4, zeilen = 4;
  const cw = b / spalten;
  const ch = tafelH / zeilen;

  // Randsummen
  const zeileA  = r.pAB + r.pAnB;     // = p
  const zeilenA = r.pnAB + r.pnAnB;   // = 1−p
  const spalteB  = r.pAB + r.pnAB;    // = P(B)
  const spaltenB = r.pAnB + r.pnAnB;  // = P(¬B)

  // Zellen-Inhalte
  const inhalt = [
    ["",   "B",      "¬B",     "Σ"],
    ["A",  z2(r.pAB),  z2(r.pAnB),  z2(zeileA)],
    ["¬A", z2(r.pnAB), z2(r.pnAnB), z2(zeilenA)],
    ["Σ",  z2(spalteB), z2(spaltenB), z2(r.summe)]
  ];

  // Hintergründe: Kopfzeile/-spalte hauch, Randsummen-Zeile/-Spalte leicht getönt
  for (let zi = 0; zi < zeilen; zi++) {
    for (let si = 0; si < spalten; si++) {
      const cx = x + si * cw, cy = oy + zi * ch;
      let bg = null;
      if (zi === 0 || si === 0) bg = stil.hauch;            // Kopf
      if (zi === zeilen - 1 || si === spalten - 1) bg = farbeMitAlpha(stil.akzent, 0.10); // Randsummen
      if ((zi === 0 && si === 0)) bg = stil.hauch;
      if ((zi === zeilen - 1 && si === spalten - 1)) bg = farbeMitAlpha(stil.akzent, 0.20); // Summe=1
      if (bg) { ctx.fillStyle = bg; ctx.fillRect(cx, cy, cw, ch); }
    }
  }

  // Gitterlinien
  ctx.strokeStyle = stil.beschriftung;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let si = 0; si <= spalten; si++) {
    ctx.moveTo(x + si * cw, oy);
    ctx.lineTo(x + si * cw, oy + tafelH);
  }
  for (let zi = 0; zi <= zeilen; zi++) {
    ctx.moveTo(x, oy + zi * ch);
    ctx.lineTo(x + b, oy + zi * ch);
  }
  ctx.stroke();

  // Texte
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let zi = 0; zi < zeilen; zi++) {
    for (let si = 0; si < spalten; si++) {
      const cx = x + si * cw + cw / 2, cy = oy + zi * ch + ch / 2;
      const kopf = (zi === 0 || si === 0);
      const rand = (zi === zeilen - 1 || si === spalten - 1);
      ctx.fillStyle = kopf ? stil.text : (rand ? stil.akzent : stil.text);
      ctx.font = (kopf || rand) ? ueberschriftFont(stil) : stil.schrift;
      ctx.fillText(inhalt[zi][si], cx, cy);
    }
  }
  ctx.font = stil.schrift;
}

// Hex/rgb-Farbe der Tokens mit Alpha versehen (Tokens sind hex oder rgb())
function farbeMitAlpha(farbe, alpha) {
  if (!farbe) return `rgba(255,255,255,${alpha})`;
  if (farbe.startsWith("#")) {
    let hx = farbe.slice(1);
    if (hx.length === 3) hx = hx.split("").map(c => c + c).join("");
    const rr = parseInt(hx.slice(0, 2), 16), gg = parseInt(hx.slice(2, 4), 16), bb = parseInt(hx.slice(4, 6), 16);
    return `rgba(${rr},${gg},${bb},${alpha})`;
  }
  const m = farbe.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  if (m) return `rgba(${m[1]},${m[2]},${m[3]},${alpha})`;
  return farbe;
}

// ---------- Prüffälle (Produkte entlang der Äste; Summe stets 1) ----------
export const pruefFaelle = [
  { name: "p=0,5 · q1=0,8 · q2=0,3", parameter: { p: 0.5, q1: 0.8, q2: 0.3 }, toleranzProzent: 1,
    soll: { pAB: 0.4, pAnB: 0.1, pnAB: 0.15, pnAnB: 0.35, summe: 1 } },
  { name: "p=0,2 · q1=0,5 · q2=0,5", parameter: { p: 0.2, q1: 0.5, q2: 0.5 }, toleranzProzent: 1,
    soll: { pAB: 0.1, pAnB: 0.1, pnAB: 0.4, pnAnB: 0.4, summe: 1 } },
  { name: "p=1 · q1=0,7 · q2=0,4", parameter: { p: 1, q1: 0.7, q2: 0.4 }, toleranzProzent: 1,
    soll: { pAB: 0.7, pAnB: 0.3, pnAB: 0, pnAnB: 0, summe: 1 } }
];
