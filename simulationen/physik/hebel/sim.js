// Hebel und Drehmoment — Balkenwaage auf einem Dreiecks-Ständer: links und rechts
// greift je eine Kraft an einem einstellbaren Hebelarm an. Das Modell vergleicht
// die Drehmomente M = F · a (in N·cm); im Gleichgewicht gilt das Hebelgesetz
// F1 · a1 = F2 · a2. Modus „statisch“: Parameter ändern → sofort neu rechnen und
// zeichnen, keine Zeitschleife (istFertig liefert sofort true, update ist leer).
// Der Kippwinkel ist eine rein symbolische Anzeige (auf ±12° geklemmt) — keine
// Schwingungsdynamik.

import { formatZahl } from "../../../assets/js/sim/welt.js";

export const manifest = {
  id: "physik/hebel",
  titel: "Hebel und Drehmoment",
  modus: "statisch",
  raster: false,     // eigene dezente Skala am Balken statt Koordinatenraster
  werkzeuge: false,  // Weltkoordinaten sind hier cm — das Lineal würde fälschlich „m“ melden
  parameter: [
    { id: "a1", label: "Hebelarm links",  einheit: "cm", min: 5, max: 50, schritt: 1,   start: 30 },
    { id: "f1", label: "Kraft links",     einheit: "N",  min: 1, max: 20, schritt: 0.5, start: 4 },
    { id: "a2", label: "Hebelarm rechts", einheit: "cm", min: 5, max: 50, schritt: 1,   start: 20 },
    { id: "f2", label: "Kraft rechts",    einheit: "N",  min: 1, max: 20, schritt: 0.5, start: 6 }
  ],
  anzeigen: [
    { id: "m1",  label: "Drehmoment links",           einheit: "N·cm", stellen: 1 },
    { id: "m2",  label: "Drehmoment rechts",          einheit: "N·cm", stellen: 1 },
    { id: "f2g", label: "F rechts für Gleichgewicht", einheit: "N",    stellen: 2 },
    { id: "gleichgewicht", label: "im Gleichgewicht? (1 = ja)", einheit: "", stellen: 0 }
  ],
  presets: [
    { name: "Gleichgewicht",          werte: { a1: 30, f1: 4,  a2: 20, f2: 6 } },
    { name: "Erwachsener gegen Kind", werte: { a1: 10, f1: 12, a2: 40, f2: 3 } },
    { name: "kippt rechts",           werte: { a1: 40, f1: 5,  a2: 25, f2: 10 } }
  ],
  vorhersage: {
    frage: "Ein leichtes Kind ganz außen gegen einen schweren Erwachsenen ganz innen — wer drückt die Wippe runter?",
    optionen: [
      "Der Erwachsene — er drückt mit der viel größeren Kraft",
      "Das Kind — es sitzt viel weiter vom Drehpunkt entfernt",
      "Das entscheidet nicht die Kraft allein — es kann sogar Gleichgewicht herrschen"
    ],
    aufloesung: "Die Kraft allein entscheidet nicht: Es zählt das Produkt aus Kraft und Hebelarm — das Drehmoment M = F · a. Im Preset „Erwachsener gegen Kind“ gilt 12 N · 10 cm = 120 N·cm = 3 N · 40 cm: Die Wippe bleibt im Gleichgewicht! Rückt das Kind noch weiter nach außen oder der Erwachsene weiter nach innen, drückt sogar das Kind seine Seite nach unten."
  },
  beobachtung: [
    "Stelle das Preset „Erwachsener gegen Kind“ ein: Wer gewinnt — und mit welchem Produkt F · a kannst du es vorhersagen? Vergleiche die beiden Drehmomente in den Messwerten.",
    "Halte links alles fest und verdopple rechts den Hebelarm (zum Beispiel von 20 cm auf 40 cm): Auf welchen Wert darfst du die Kraft rechts senken, ohne dass die Wippe kippt? Die Anzeige „F rechts für Gleichgewicht“ hilft beim Prüfen.",
    "Finde drei verschiedene Gleichgewichts-Kombinationen, bei denen auf beiden Seiten M = 120 N·cm wirkt (eine kennst du schon: 4 N · 30 cm). Was haben alle gemeinsam?",
    "„Kraft sparen heißt Weg zahlen“: Wo am Hebel braucht man die kleinste Kraft, um die andere Seite zu halten — nah am Drehpunkt oder ganz außen? Schiebe a₂ ans Maximum und beobachte die Gleichgewichtskraft."
  ],
  modellgrenzen: "Masseloser, starrer Balken; beide Kräfte wirken senkrecht zum Balken; reine Statik — die Wippe schwingt nicht, der Kippwinkel ist nur eine symbolische Anzeige (auf ±12° begrenzt). Echte Wippen haben Eigengewicht, Reibung im Drehpunkt und schwingen nach.",
  bilanz: {
    m1:  { label: "Drehmoment links",           einheit: "N·cm", stellen: 1 },
    m2:  { label: "Drehmoment rechts",          einheit: "N·cm", stellen: 1 },
    f2g: { label: "F rechts für Gleichgewicht", einheit: "N",    stellen: 2 },
    gleichgewicht: { label: "im Gleichgewicht? (1 = ja)", einheit: "", stellen: 0 }
  },
  welt: { xMin: -62, xMax: 62, yMin: -50, yMax: 26 } // Weltkoordinaten in cm
};

// ---------- Modell (rein algebraisch, keine Zeitabhängigkeit) ----------

function klemme(wert, min, max) { return Math.min(max, Math.max(min, wert)); }

function rechne(p) {
  const m1 = p.f1 * p.a1;            // Drehmoment links:  M₁ = F₁ · a₁ (N·cm)
  const m2 = p.f2 * p.a2;            // Drehmoment rechts: M₂ = F₂ · a₂ (N·cm)
  const f2g = (p.f1 * p.a1) / p.a2;  // Kraft rechts, die Gleichgewicht herstellt
  const gleichgewicht = Math.abs(m1 - m2) < 0.01 ? 1 : 0;
  // Kippwinkel nur für die Darstellung: rechtes Übergewicht senkt die rechte Seite
  const winkel = klemme((m2 - m1) / 10, -12, 12); // in Grad
  return { m1, m2, f2g, gleichgewicht, winkel };
}

export function init(p) {
  return { t: 0, ...rechne(p) };
}

export function update() { /* statisch: nichts zu tun */ }

export function messwerte(z) {
  return { m1: z.m1, m2: z.m2, f2g: z.f2g, gleichgewicht: z.gleichgewicht };
}

export function istFertig() { return true; }

export function bilanz(z) {
  return { m1: z.m1, m2: z.m2, f2g: z.f2g, gleichgewicht: z.gleichgewicht };
}

// ---------- Zeichnen: Balkenwaage mit Kraftpfeilen, Maßlinien und Status ----------

const BALKEN_HALB = 55;   // halbe Balkenlänge in cm (Hebelarme reichen bis 50 cm)
const BALKEN_DICKE = 2.4; // Balkendicke in cm
const CM_JE_N = 1.5;      // Pfeillänge: 1 N entspricht 1,5 cm Weltlänge

// Punkt auf dem gedrehten Balken bei vorzeichenbehaftetem Abstand s vom Drehpunkt
// (s > 0: rechte Seite). w ist der Kippwinkel in rad, positiv = rechte Seite sinkt.
function balkenPunkt(s, w) {
  return { x: s * Math.cos(w), y: -s * Math.sin(w) };
}

// Dezimalstellen für Kraft-/Momentwerte: ganze Zahlen ohne Nachkommastelle
function stellen(wert) { return Number.isInteger(wert) ? 0 : 1; }

function linie(ctx, welt, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(welt.px(x1), welt.py(y1));
  ctx.lineTo(welt.px(x2), welt.py(y2));
  ctx.stroke();
}

function beschrifte(ctx, welt, text, x, y, ausrichten = "center", grundlinie = "middle") {
  ctx.textAlign = ausrichten;
  ctx.textBaseline = grundlinie;
  ctx.fillText(text, welt.px(x), welt.py(y));
}

// Kraftpfeil senkrecht nach unten ab dem Aufhängepunkt, Länge proportional zu F
function kraftpfeil(ctx, welt, stil, x, y, kraft, text, seite) {
  const yStart = y - BALKEN_DICKE / 2;       // unterhalb des Balkens ansetzen
  const ySpitze = yStart - CM_JE_N * kraft;  // Pfeilspitze in Weltkoordinaten
  const g = 6 + stil.linienstaerke;          // Spitzengröße in Pixeln
  ctx.strokeStyle = stil.akzent;
  ctx.fillStyle = stil.akzent;
  ctx.lineWidth = stil.linienstaerke + 1;
  ctx.lineCap = "butt";
  ctx.beginPath();
  ctx.moveTo(welt.px(x), welt.py(yStart));
  ctx.lineTo(welt.px(x), Math.max(welt.py(yStart), welt.py(ySpitze) - g));
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(welt.px(x), welt.py(ySpitze));
  ctx.lineTo(welt.px(x) - 0.8 * g, welt.py(ySpitze) - g);
  ctx.lineTo(welt.px(x) + 0.8 * g, welt.py(ySpitze) - g);
  ctx.closePath();
  ctx.fill();
  // Beschriftung neben dem Pfeil („4 N“ usw.), vom Drehpunkt weg nach außen
  beschrifte(ctx, welt, text, x + seite * 2.2, (yStart + ySpitze) / 2, seite < 0 ? "right" : "left");
}

// Maßlinie parallel zum Balken, senkrecht darunter versetzt — dreht sich mit
function masslinie(ctx, welt, stil, w, s1, s2, text) {
  const nx = -Math.sin(w), ny = -Math.cos(w); // Einheitsvektor senkrecht unter den Balken
  const abstand = 5.5, halberStrich = 1.3;
  const a = balkenPunkt(s1, w), b = balkenPunkt(s2, w);
  const pa = { x: a.x + abstand * nx, y: a.y + abstand * ny };
  const pb = { x: b.x + abstand * nx, y: b.y + abstand * ny };
  ctx.strokeStyle = stil.beschriftung;
  ctx.lineWidth = 1;
  linie(ctx, welt, pa.x, pa.y, pb.x, pb.y);
  [pa, pb].forEach(p => linie(ctx, welt, p.x - halberStrich * nx, p.y - halberStrich * ny, p.x + halberStrich * nx, p.y + halberStrich * ny));
  ctx.fillStyle = stil.beschriftung;
  beschrifte(ctx, welt, text, (pa.x + pb.x) / 2 + 3.4 * nx, (pa.y + pb.y) / 2 + 3.4 * ny);
}

export function zeichne({ ctx, welt, zustand: z, werte: p, stil }) {
  const w = z.winkel * Math.PI / 180; // positiv: rechte Seite sinkt
  const klein = welt.massstab < 3.4;  // schmale Bildschirme: kompaktere Schrift
  const basis = parseFloat(stil.schrift) || 12;
  const schrift = (klein ? Math.max(9, basis - 2) : basis) + "px sans-serif";
  const fett = "bold " + schrift;
  const statusSchrift = "bold " + (klein ? basis + 1 : basis + 3) + "px sans-serif";

  // Boden mit Schraffur und Dreiecks-Ständer; der Drehpunkt liegt im Ursprung
  ctx.strokeStyle = stil.beschriftung;
  ctx.lineWidth = 1.5;
  linie(ctx, welt, -30, -26, 30, -26);
  ctx.lineWidth = 1;
  for (let x = -27; x <= 27; x += 6) linie(ctx, welt, x, -26, x - 3, -29.5);
  ctx.beginPath();
  ctx.moveTo(welt.px(0), welt.py(-BALKEN_DICKE / 2));
  ctx.lineTo(welt.px(-7), welt.py(-26));
  ctx.lineTo(welt.px(7), welt.py(-26));
  ctx.closePath();
  ctx.fillStyle = stil.hauch;
  ctx.fill();
  ctx.strokeStyle = stil.text;
  ctx.lineWidth = stil.linienstaerke;
  ctx.stroke();

  // Balken, um den Kippwinkel gedreht — Endpunkte exakt über sin/cos
  const linksEnde = balkenPunkt(-BALKEN_HALB, w);
  const rechtsEnde = balkenPunkt(BALKEN_HALB, w);
  ctx.strokeStyle = stil.text;
  ctx.lineCap = "butt";
  ctx.lineWidth = Math.max(3, welt.laenge(BALKEN_DICKE));
  linie(ctx, welt, linksEnde.x, linksEnde.y, rechtsEnde.x, rechtsEnde.y);

  // Dezente Skala: helle Striche alle 10 cm quer über den Balken
  const quer = { x: Math.sin(w), y: Math.cos(w) }; // senkrecht zum Balken, nach oben
  ctx.strokeStyle = stil.flaeche;
  ctx.lineWidth = 1;
  for (let s = -50; s <= 50; s += 10) {
    if (s === 0) continue;
    const q = balkenPunkt(s, w);
    const t = BALKEN_DICKE / 2;
    linie(ctx, welt, q.x - t * quer.x, q.y - t * quer.y, q.x + t * quer.x, q.y + t * quer.y);
  }

  // Maßlinien unter dem Balken: Hebelarme a₁ und a₂ (drehen sich mit)
  ctx.font = schrift;
  masslinie(ctx, welt, stil, w, -p.a1, 0, "a₁ = " + formatZahl(p.a1, 0) + " cm");
  masslinie(ctx, welt, stil, w, 0, p.a2, "a₂ = " + formatZahl(p.a2, 0) + " cm");

  // Aufhängepunkte und Kraftpfeile (senkrecht nach unten, Länge ∝ F)
  const pktLinks = balkenPunkt(-p.a1, w);
  const pktRechts = balkenPunkt(p.a2, w);
  ctx.font = fett;
  kraftpfeil(ctx, welt, stil, pktLinks.x, pktLinks.y, p.f1, "F₁ = " + formatZahl(p.f1, stellen(p.f1)) + " N", -1);
  kraftpfeil(ctx, welt, stil, pktRechts.x, pktRechts.y, p.f2, "F₂ = " + formatZahl(p.f2, stellen(p.f2)) + " N", 1);
  [pktLinks, pktRechts].forEach(q => {
    ctx.beginPath();
    ctx.arc(welt.px(q.x), welt.py(q.y), Math.max(2.5, welt.laenge(0.7)), 0, 2 * Math.PI);
    ctx.fillStyle = stil.akzent;
    ctx.fill();
  });

  // Drehpunkt-Markierung (über dem Balken gezeichnet)
  ctx.beginPath();
  ctx.arc(welt.px(0), welt.py(0), Math.max(3, welt.laenge(0.9)), 0, 2 * Math.PI);
  ctx.fillStyle = stil.flaeche;
  ctx.fill();
  ctx.strokeStyle = stil.text;
  ctx.lineWidth = stil.linienstaerke;
  ctx.stroke();

  // Die beiden Produkte F · a — die Kernidee des Hebelgesetzes
  ctx.font = schrift;
  ctx.fillStyle = stil.text;
  beschrifte(ctx, welt, "M₁ = F₁ · a₁ = " + formatZahl(z.m1, stellen(z.m1)) + " N·cm", -31, 15.5);
  beschrifte(ctx, welt, "M₂ = F₂ · a₂ = " + formatZahl(z.m2, stellen(z.m2)) + " N·cm", 31, 15.5);

  // Statustext: nie nur Farbe — der Text selbst benennt das Ergebnis
  ctx.font = statusSchrift;
  if (z.gleichgewicht === 1) {
    ctx.fillStyle = stil.ok;
    beschrifte(ctx, welt, "Gleichgewicht ✓", 0, 21.5);
  } else {
    ctx.fillStyle = stil.fehler;
    beschrifte(ctx, welt, z.m2 > z.m1 ? "kippt nach rechts" : "kippt nach links", 0, 21.5);
  }
}

// ---------- Prüffälle (analytisch bekannte Lösungen) ----------

export const pruefFaelle = [
  {
    name: "Gleichgewicht: 4 N · 30 cm = 6 N · 20 cm",
    parameter: { a1: 30, f1: 4, a2: 20, f2: 6 },
    toleranzProzent: 0.2,
    soll: { m1: 120, m2: 120, gleichgewicht: 1, f2g: 6 }
  },
  {
    name: "Linkes Übergewicht: 5 N · 40 cm gegen 4 N · 25 cm",
    parameter: { a1: 40, f1: 5, a2: 25, f2: 4 },
    toleranzProzent: 0.2,
    soll: { m1: 200, m2: 100, f2g: 8, gleichgewicht: 0 }
  },
  {
    name: "Kraft gespart: 2 N · 50 cm = 10 N · 10 cm",
    parameter: { a1: 50, f1: 2, a2: 10, f2: 10 },
    toleranzProzent: 0.2,
    soll: { m1: 100, m2: 100, gleichgewicht: 1 }
  }
];
