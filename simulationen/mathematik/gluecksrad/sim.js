// Glücksrad — relative Häufigkeit trifft Wahrscheinlichkeit (Mathematik, Klasse 7).
// Jeder Schritt führt „proSchritt“ Zufallsdrehungen aus (Math.random() < P ⇒ Treffer).
// Links dreht das Rad: Der feste Zeiger oben zeigt nach jedem Schritt den zuletzt
// gedrehten Sektor. Rechts wächst die zackige Kurve der relativen Häufigkeit — und
// pendelt sich nach dem Gesetz der großen Zahlen in der Nähe von P ein.
// Obergrenze 2000 Drehungen je Durchlauf, damit auch Headless-Läufe sicher enden.

import { formatZahl } from "../../../assets/js/sim/welt.js";

const MAX_DREHUNGEN = 2000; // Obergrenze je Durchlauf
const KURVE_MAX = 5000;     // Deckel für den Kurvenpuffer (reicht für alle Drehungen)

export const manifest = {
  id: "mathematik/gluecksrad",
  titel: "Glücksrad: relative Häufigkeit",
  modus: "schrittweise",
  tMax: 1e6,
  raster: false,    // eigene Darstellung (Rad + Diagramm) statt Meter-Karoraster
  werkzeuge: false, // Lineal/Winkelmesser helfen hier nicht weiter
  welt: { xMin: 0, xMax: 16, yMin: 0, yMax: 8.4 },
  parameter: [
    { id: "felder",     label: "Anzahl Felder",        einheit: "", min: 4, max: 12,  schritt: 1, start: 10 },
    { id: "gewinn",     label: "davon Gewinnfelder",   einheit: "", min: 1, max: 11,  schritt: 1, start: 3 },
    { id: "proSchritt", label: "Drehungen je Schritt", einheit: "", min: 1, max: 100, schritt: 1, start: 10 }
  ],
  anzeigen: [
    { id: "drehungen",  label: "Drehungen",              einheit: "", stellen: 0 },
    { id: "treffer",    label: "Treffer",                einheit: "", stellen: 0 },
    { id: "relH",       label: "relative Häufigkeit h",  einheit: "", stellen: 3 },
    { id: "pTheorie",   label: "P (theoretisch)",        einheit: "", stellen: 3 },
    { id: "abweichung", label: "Abstand |h − P|",        einheit: "", stellen: 3 }
  ],
  presets: [
    { name: "3 von 10",               werte: { felder: 10, gewinn: 3, proSchritt: 10 } },
    { name: "1 von 6 (Würfel-Sechs)", werte: { felder: 6,  gewinn: 1, proSchritt: 10 } },
    { name: "Einzeldrehung",          werte: { felder: 10, gewinn: 3, proSchritt: 1 } }
  ],
  vorhersage: {
    frage: "Du hast fünfmal hintereinander verloren. Ist ein Gewinn bei der nächsten Drehung jetzt wahrscheinlicher?",
    optionen: ["Ja — ein Gewinn ist jetzt überfällig", "Nein — die Chance bleibt genau gleich", "Kommt darauf an, wie lang die Pechsträhne war"],
    aufloesung: "Die Chance bleibt genau gleich: Das Rad hat kein Gedächtnis. Bei jeder Drehung gilt aufs Neue P = Gewinnfelder geteilt durch Felder — egal, was vorher passiert ist. Eine Pechsträhne wird nicht „ausgeglichen“; sie verliert nur an Gewicht, weil immer mehr Drehungen dazukommen. Genau das zeigt die Kurve rechts."
  },
  beobachtung: [
    "Drehe das Rad mit „Weiter“ genau 10-mal. Wie weit liegt die relative Häufigkeit h von P weg? Lass dann die Automatik bis 1000 Drehungen laufen: Was macht der Abstand |h − P|?",
    "Stelle 6 Felder mit 1 Gewinnfeld ein (Preset „1 von 6“). Das ist die Chance auf eine Sechs beim Würfeln. Vergleiche die Kurve mit eurem Würfelexperiment aus dem Unterricht.",
    "Suche in der Kurve eine „Pechsträhne“, in der h eine Weile unter P liegt. Ändert die Strähne etwas an der Anzeige „P (theoretisch)“? Warum nicht?",
    "Drücke „Zurücksetzen“ und lass die Simulation mit denselben Einstellungen noch einmal laufen. Warum sieht die Kurve am Anfang ganz anders aus — und landet trotzdem wieder in der Nähe von P?"
  ],
  modellgrenzen: "Der Computer dreht mit Pseudozufallszahlen — sie verhalten sich wie Zufall, werden aber berechnet. Jede Drehung ist unabhängig von allen vorherigen, und das Rad ist fair: Jedes Feld kommt gleich wahrscheinlich dran. Ein Durchlauf endet nach 2000 Drehungen.",
  bilanz: {
    drehungen:  { label: "Drehungen",             einheit: "", stellen: 0 },
    treffer:    { label: "Treffer",               einheit: "", stellen: 0 },
    relH:       { label: "relative Häufigkeit h", einheit: "", stellen: 3 },
    pTheorie:   { label: "P (theoretisch)",       einheit: "", stellen: 3 },
    abweichung: { label: "Abstand |h − P|",       einheit: "", stellen: 3 }
  }
};

// ---------- Modell ----------

// Gewinnfelder werden auf höchstens felder − 1 geklemmt: Ein Rad, bei dem jedes
// Feld gewinnt, wäre kein Zufallsversuch mehr (und der Regler erlaubt bis 11).
function effektiv(p) {
  const felder = Math.round(p.felder);
  const gewinn = Math.min(Math.round(p.gewinn), felder - 1);
  return { felder, gewinn, pTheorie: gewinn / felder };
}

// Gewinnfelder gleichmäßig über das Rad verteilen (wie bei einem echten Glücksrad).
// Die Teleskopsumme garantiert: genau „gewinn“ der „felder“ Sektoren sind Gewinnfelder.
function istGewinnSektor(i, felder, gewinn) {
  return Math.floor((i + 1) * gewinn / felder) > Math.floor(i * gewinn / felder);
}

function sektorListen(felder, gewinn) {
  const gewinnIdx = [], nietenIdx = [];
  for (let i = 0; i < felder; i++) {
    (istGewinnSektor(i, felder, gewinn) ? gewinnIdx : nietenIdx).push(i);
  }
  return { gewinnIdx, nietenIdx };
}

export function init() {
  return {
    t: 0,                // Schrittzähler für die Engine
    drehungen: 0,
    treffer: 0,
    letzterSektor: -1,   // Sektor unter dem Zeiger (−1 = noch nicht gedreht)
    letzterTreffer: false,
    kurve: []            // relative Häufigkeit nach jeder einzelnen Drehung
  };
}

// Ein Schritt = proSchritt Zufallsdrehungen (dt wird im Schrittmodus nicht gebraucht)
export function update(z, p) {
  if (z.drehungen >= MAX_DREHUNGEN) return;
  const e = effektiv(p);
  const listen = sektorListen(e.felder, e.gewinn);
  const anzahl = Math.min(Math.round(p.proSchritt), MAX_DREHUNGEN - z.drehungen);
  for (let i = 0; i < anzahl; i++) {
    const getroffen = Math.random() < e.pTheorie;
    z.drehungen++;
    if (getroffen) z.treffer++;
    z.letzterTreffer = getroffen;
    // Für die Anzeige einen passenden Sektor auslosen (Gewinn- oder Nietenfeld)
    const liste = getroffen ? listen.gewinnIdx : listen.nietenIdx;
    z.letzterSektor = liste[Math.floor(Math.random() * liste.length)];
    if (z.kurve.length < KURVE_MAX) z.kurve.push(z.treffer / z.drehungen);
  }
  z.t++;
}

export function istFertig(z) { return z.drehungen >= MAX_DREHUNGEN; }

export function messwerte(z, p) {
  const e = effektiv(p);
  const relH = z.drehungen > 0 ? z.treffer / z.drehungen : NaN; // vor der 1. Drehung: „–“
  return {
    drehungen: z.drehungen,
    treffer: z.treffer,
    relH,
    pTheorie: e.pTheorie,
    abweichung: z.drehungen > 0 ? Math.abs(relH - e.pTheorie) : NaN
  };
}

export function bilanz(z, p) {
  const e = effektiv(p);
  const relH = z.drehungen > 0 ? z.treffer / z.drehungen : 0;
  return {
    drehungen: z.drehungen,
    treffer: z.treffer,
    relH,
    pTheorie: e.pTheorie,
    abweichung: Math.abs(relH - e.pTheorie)
  };
}

// ---------- Darstellung: links das Rad, rechts das Häufigkeits-Diagramm ----------

// Farbtoken lesen, die der Engine-Stil nicht enthält (läuft nur im Browser)
function leseToken(name, ersatz) {
  if (typeof document === "undefined") return ersatz;
  const wert = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return wert || ersatz;
}

// „Schöne“ Obergrenze der Drehungs-Achse, wächst mit dem Versuch
function achsenMax(drehungen) {
  const stufen = [20, 50, 100, 200, 500, 1000, 2000];
  for (const m of stufen) { if (drehungen <= m) return m; }
  return MAX_DREHUNGEN;
}

export function zeichne({ ctx, welt, zustand: z, werte: p, stil }) {
  const e = effektiv(p);
  const farbeMathe = leseToken("--mathe", stil.akzent);
  const farbeLinie = leseToken("--linie", stil.beschriftung);
  const duenn = Math.max(1.5, stil.linienstaerke * 0.75);
  const fontPx = parseFloat(stil.schrift) || 12;
  const zeilenH = fontPx + 6;

  // ---- Glücksrad (links) ----
  const cx = welt.px(3.7), cy = welt.py(4.7), r = welt.laenge(3.1);
  const phi = 2 * Math.PI / e.felder;
  // Das Rad ist so gedreht, dass der zuletzt gedrehte Sektor mittig unter dem Zeiger steht
  const zeigerSektor = z.letzterSektor >= 0 ? z.letzterSektor : 0;
  const rot = -Math.PI / 2 - (zeigerSektor + 0.5) * phi;
  for (let i = 0; i < e.felder; i++) {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, rot + i * phi, rot + (i + 1) * phi);
    ctx.closePath();
    ctx.fillStyle = istGewinnSektor(i, e.felder, e.gewinn) ? farbeMathe : stil.flaeche;
    ctx.fill();
    ctx.strokeStyle = farbeLinie;
    ctx.lineWidth = duenn;
    ctx.stroke();
  }
  ctx.beginPath();                                  // Außenring
  ctx.arc(cx, cy, r, 0, 2 * Math.PI);
  ctx.strokeStyle = stil.beschriftung;
  ctx.lineWidth = duenn;
  ctx.stroke();
  ctx.beginPath();                                  // Nabe
  ctx.arc(cx, cy, Math.max(3, r * 0.05), 0, 2 * Math.PI);
  ctx.fillStyle = stil.text;
  ctx.fill();
  ctx.beginPath();                                  // fester Zeiger oben
  ctx.moveTo(cx, cy - r + r * 0.18);
  ctx.lineTo(cx - r * 0.1, cy - r - r * 0.08);
  ctx.lineTo(cx + r * 0.1, cy - r - r * 0.08);
  ctx.closePath();
  ctx.fill();

  // Textzeilen unter dem Rad (Ergebnis nicht nur über Farbe: ✓/✗ plus Wortlaut)
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  let infoY = cy + r + 8;
  if (z.drehungen === 0) {
    ctx.fillStyle = stil.beschriftung;
    ctx.font = stil.schrift;
    ctx.fillText("Noch keine Drehung — drücke „Weiter“ oder „Automatik“.", cx, infoY);
  } else if (istFertig(z)) {
    ctx.fillStyle = stil.text;
    ctx.font = "bold " + stil.schrift;
    ctx.fillText("2000 Drehungen erreicht — „Zurücksetzen“ startet neu.", cx, infoY);
  } else {
    ctx.fillStyle = z.letzterTreffer ? stil.ok : stil.beschriftung;
    ctx.font = "bold " + stil.schrift;
    ctx.fillText(z.letzterTreffer ? "Letzte Drehung: Gewinn ✓" : "Letzte Drehung: Niete ✗", cx, infoY);
  }
  infoY += zeilenH;
  ctx.fillStyle = stil.text;
  ctx.font = stil.schrift;
  ctx.fillText(formatZahl(e.gewinn, 0) + " von " + formatZahl(e.felder, 0) +
    " Feldern gewinnen: P = " + formatZahl(e.pTheorie, 2), cx, infoY);
  if (Math.round(p.gewinn) > e.gewinn) {
    infoY += zeilenH;
    ctx.fillStyle = stil.beschriftung;
    ctx.fillText("(höchstens " + formatZahl(e.felder - 1, 0) + " Gewinnfelder bei " +
      formatZahl(e.felder, 0) + " Feldern)", cx, infoY);
  }

  // ---- Diagramm (rechts): relative Häufigkeit über der Drehungszahl, y fest 0–1 ----
  const gx0 = welt.px(8.1), gx1 = welt.px(15.6);
  const gy0 = welt.py(7.6), gy1 = welt.py(1.6);   // gy0 = oben, gy1 = unten
  const xMax = achsenMax(z.drehungen);
  const X = d => gx0 + (d / xMax) * (gx1 - gx0);
  const Y = h => gy1 - h * (gy1 - gy0);

  ctx.strokeStyle = stil.raster;                   // Hilfslinien bei 0,5 und Achsenmitte
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(gx0, Y(0.5)); ctx.lineTo(gx1, Y(0.5));
  ctx.moveTo(X(xMax / 2), gy1); ctx.lineTo(X(xMax / 2), gy0);
  ctx.stroke();

  ctx.strokeStyle = stil.text;                     // Achsen
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(gx0, gy0); ctx.lineTo(gx0, gy1); ctx.lineTo(gx1, gy1);
  ctx.stroke();

  ctx.fillStyle = stil.beschriftung;               // Achsenbeschriftung
  ctx.font = stil.schrift;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillText("1", gx0 - 6, Y(1));
  ctx.fillText("0,5", gx0 - 6, Y(0.5));
  ctx.fillText("0", gx0 - 6, Y(0));
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("0", X(0), gy1 + 6);
  ctx.fillText(formatZahl(xMax / 2, 0), X(xMax / 2), gy1 + 6);
  ctx.fillText(formatZahl(xMax, 0), X(xMax), gy1 + 6);
  ctx.textAlign = "left";
  ctx.fillText("relative Häufigkeit h", gx0, gy0 - zeilenH);
  ctx.textAlign = "right";
  ctx.fillText("Drehungen", gx1, gy1 + 6 + zeilenH);

  // Gestrichelte Linie bei der theoretischen Wahrscheinlichkeit P + Beschriftung
  const yP = Y(e.pTheorie);
  ctx.save();
  ctx.strokeStyle = farbeMathe;
  ctx.globalAlpha = 0.7;
  ctx.setLineDash([7, 5]);
  ctx.lineWidth = duenn;
  ctx.beginPath();
  ctx.moveTo(gx0, yP); ctx.lineTo(gx1, yP);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = farbeMathe;
  ctx.font = "bold " + stil.schrift;
  ctx.textAlign = "right";
  ctx.textBaseline = e.pTheorie > 0.8 ? "top" : "bottom";
  ctx.fillText("P = " + formatZahl(e.pTheorie, 2), gx1 - 4, e.pTheorie > 0.8 ? yP + 4 : yP - 4);

  // Zackige Kurve: relative Häufigkeit nach jeder Drehung, Endpunkt markiert
  if (z.kurve.length > 0) {
    ctx.strokeStyle = farbeMathe;
    ctx.lineWidth = stil.linienstaerke;
    ctx.lineJoin = "round";
    ctx.beginPath();
    z.kurve.forEach((h, k) => {
      const x = X(k + 1), y = Y(h);
      if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(X(z.kurve.length), Y(z.kurve[z.kurve.length - 1]), Math.max(3, stil.linienstaerke + 1), 0, 2 * Math.PI);
    ctx.fillStyle = farbeMathe;
    ctx.fill();
  }
}

// ---------- Prüffälle ----------
// Nur deterministische Größen im Soll: P = gewinn/felder ist analytisch bekannt.
// Treffer und relative Häufigkeit sind Zufallswerte und werden bewusst NICHT geprüft.
// Headless läuft bis istFertig (2000 Drehungen); mit proSchritt = 50 sind das 40 Schritte.

export const pruefFaelle = [
  {
    name: "10 Felder, 3 Gewinnfelder (P = 0,3)",
    parameter: { felder: 10, gewinn: 3, proSchritt: 50 },
    toleranzProzent: 0.2,
    soll: { pTheorie: 0.3 }
  },
  {
    name: "6 Felder, 1 Gewinnfeld (Würfel-Sechs, P = 1/6)",
    parameter: { felder: 6, gewinn: 1, proSchritt: 50 },
    toleranzProzent: 0.2,
    soll: { pTheorie: 0.16667 }
  },
  {
    name: "8 Felder, 4 Gewinnfelder (P = 0,5)",
    parameter: { felder: 8, gewinn: 4, proSchritt: 50 },
    toleranzProzent: 0.2,
    soll: { pTheorie: 0.5 }
  }
];
