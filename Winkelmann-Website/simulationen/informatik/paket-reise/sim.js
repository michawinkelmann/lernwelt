// Paket-Reise durchs Netz — ein Datenpaket wandert in einem festen Router-Netz
// Hop für Hop vom Laptop (L) zum Server (S). Schrittmodus: Jeder Schritt ist genau
// ein Hop entlang des kürzesten Wegs (Breitensuche). Fällt ein Router aus
// (Parameter „ausfall“), wird die Route in init() neu gesucht — das Netz ist
// vermascht und findet einen Umweg: die Grundidee des Internets.

import { formatZahl } from "../../../assets/js/sim/welt.js";

// ---------- Festes Netz ----------
// Positionen in Weltkoordinaten (0..10 × 0..6); art steuert nur das Symbol.

const KNOTEN = {
  L:  { x: 0.8, y: 3,   art: "laptop", name: "Laptop" },
  H:  { x: 2.2, y: 3,   art: "router", name: "Heimrouter" },
  R1: { x: 4,   y: 4.8, art: "router", name: "" },
  R2: { x: 4,   y: 1.2, art: "router", name: "" },
  R3: { x: 6,   y: 3,   art: "router", name: "" },
  R4: { x: 7.5, y: 4.8, art: "router", name: "" },
  R5: { x: 7.5, y: 1.2, art: "router", name: "" },
  S:  { x: 9.2, y: 3,   art: "server", name: "Server" }
};

// Kanten in FESTER Reihenfolge — sie legt die Tie-Break-Regel der Wegsuche fest (s. u.).
const KANTEN = [
  ["L", "H"],
  ["H", "R1"], ["H", "R2"],
  ["R1", "R3"], ["R2", "R3"],
  ["R3", "R4"], ["R3", "R5"],
  ["R4", "S"], ["R5", "S"],
  ["R1", "R4"], ["R2", "R5"]
];

export const manifest = {
  id: "informatik/paket-reise",
  titel: "Paket-Reise durchs Netz",
  modus: "schrittweise",
  tMax: 1e6,
  raster: false,
  werkzeuge: false,
  welt: { xMin: 0, xMax: 10, yMin: 0, yMax: 6 },
  parameter: [
    { id: "ausfall", label: "Ausgefallener Router (0 = keiner)", einheit: "", min: 0, max: 5, schritt: 1, start: 0 }
  ],
  anzeigen: [
    { id: "hop",         label: "Hops bisher",          einheit: "", stellen: 0 },
    { id: "verbleibend", label: "Hops bis zum Ziel",    einheit: "", stellen: 0 },
    { id: "routerzahl",  label: "Router auf der Route", einheit: "", stellen: 0 }
  ],
  presets: [
    { name: "Alles in Betrieb", werte: { ausfall: 0 } },
    { name: "R3 fällt aus",     werte: { ausfall: 3 } },
    { name: "R1 fällt aus",     werte: { ausfall: 1 } }
  ],
  vorhersage: {
    frage: "Router R3 (der zentrale) fällt aus. Kommt das Datenpaket trotzdem vom Laptop zum Server?",
    optionen: ["Ja — das Netz findet einen anderen Weg", "Nein — ohne die Mitte geht nichts mehr", "Nur, wenn der Server die Daten neu anfordert"],
    aufloesung: "Ja, das Paket kommt an: Es weicht über die Direktverbindungen R1–R4 (oben) bzw. R2–R5 (unten) aus. Das Netz ist vermascht — zwischen Laptop und Server gibt es mehrere Wege. Genau das ist die Grundidee des Internets: Fällt eine Station aus, übernehmen die anderen Routen."
  },
  beobachtung: [
    "Starte ohne Ausfall und klicke dich mit „Weiter“ durch: Über welche Router läuft das Paket, und wie viele Hops braucht es bis zum Server? Vergleiche mit der Anzeige „Hops bisher“.",
    "Lass R1 ausfallen (Regler auf 1): Welche Route nimmt das Paket jetzt — und braucht es dafür mehr Hops als vorher?",
    "Teste alle Werte von 1 bis 5: Gibt es einen Router, dessen Ausfall den Server unerreichbar macht? Prüfe am Ende die Bilanz „Ziel erreichbar“ — und überlege, warum das Netz so robust ist.",
    "R3 liegt genau in der Mitte des Netzes — trotzdem taucht er in der Standardroute nicht auf. Zähle die Hops eines Wegs über R3 nach und erkläre das."
  ],
  modellgrenzen: "Stark vereinfachtes Netz mit 6 Routern und fester Topologie. Im echten Internet vermitteln Millionen Router, Routen folgen dynamischen Metriken (Auslastung, Kosten, Verträge) statt reiner Hop-Zahl — und Pakete desselben Downloads können unterschiedliche Wege nehmen.",
  bilanz: {
    hops_gesamt:      { label: "Hops gesamt",              einheit: "", stellen: 0 },
    router_auf_route: { label: "Router auf der Route",     einheit: "", stellen: 0 },
    erreichbar:       { label: "Ziel erreichbar (1 = ja)", einheit: "", stellen: 0 }
  }
};

// ---------- Wegsuche ----------
// Kürzester Weg (wenigste Hops) von L nach S per Breitensuche; der gesperrte Knoten
// wird ausgelassen. Tie-Break-Regel bei mehreren gleich kurzen Wegen: Die
// Nachbarlisten entstehen in der festen KANTEN-Reihenfolge oben und werden in genau
// dieser Reihenfolge besucht — wer einen Knoten zuerst entdeckt, bleibt sein
// Vorgänger. Beispiel: H entdeckt R1 vor R2 (Kante H–R1 steht vor H–R2 in der
// Liste), darum läuft die Standardroute oben über R1 und R4 und nicht unten über
// R2 und R5, obwohl beide Wege 4 Hops lang sind.
function kuerzesterWeg(gesperrt) {
  const nachbarn = {};
  Object.keys(KNOTEN).forEach(id => { nachbarn[id] = []; });
  KANTEN.forEach(([a, b]) => { nachbarn[a].push(b); nachbarn[b].push(a); });
  const vorgaenger = { L: null };
  const schlange = ["L"];
  while (schlange.length) {
    const knoten = schlange.shift();
    if (knoten === "S") break;
    for (const n of nachbarn[knoten]) {
      if (n === gesperrt || n in vorgaenger) continue;
      vorgaenger[n] = knoten;
      schlange.push(n);
    }
  }
  if (!("S" in vorgaenger)) return null;
  const weg = [];
  for (let k = "S"; k !== null; k = vorgaenger[k]) weg.unshift(k);
  return weg;
}

// ---------- Schnittstelle zur Engine ----------

export function init(p) {
  const ausfall = Math.round(p.ausfall);
  const gesperrt = ausfall >= 1 ? "R" + ausfall : null;
  const weg = kuerzesterWeg(gesperrt);
  return {
    t: 0,                  // Schrittzähler (für Engine und Messreihe)
    gesperrt,              // z. B. "R3" oder null
    weg,                   // z. B. ["L","H","R1","R4","S"]; null = kein Weg
    position: 0,           // Index des Knotens, auf dem das Paket gerade sitzt
    fertig: weg === null   // ohne Weg gibt es nichts zu laufen
  };
}

// Ein Schritt = ein Hop: Das Paket rückt zum nächsten Knoten der Route vor.
export function update(z) {
  if (z.fertig) return;
  z.position++;
  z.t++;
  if (z.position >= z.weg.length - 1) z.fertig = true;
}

export function messwerte(z) {
  const hops = z.weg ? z.weg.length - 1 : 0;
  return {
    hop: z.weg ? z.position : 0,
    verbleibend: z.weg ? hops - z.position : 0,
    routerzahl: z.weg ? z.weg.length - 2 : 0
  };
}

export function istFertig(z) { return z.fertig; }

export function bilanz(z) {
  return {
    hops_gesamt: z.weg ? z.weg.length - 1 : 0,
    router_auf_route: z.weg ? z.weg.length - 2 : 0, // Zwischenstationen ohne L und S
    erreichbar: z.weg ? 1 : 0
  };
}

// ---------- Darstellung ----------

// Einfache Canvas-Symbole: Laptop (Bildschirm + Tastatur), Router (Kästchen mit
// zwei Antennen), Server (Turm mit Einschüben). Kurzname unter jedem Knoten.
function zeichneKnoten(ctx, welt, stil, id, z) {
  const k = KNOTEN[id];
  const x = welt.px(k.x), y = welt.py(k.y);
  const r = welt.laenge(0.38);
  const wegIndex = z.weg ? z.weg.indexOf(id) : -1;
  const besucht = wegIndex > -1 && wegIndex <= z.position;
  const ausgefallen = id === z.gesperrt;
  ctx.lineWidth = stil.linienstaerke;
  ctx.strokeStyle = ausgefallen ? stil.fehler : (besucht ? stil.ok : stil.text);
  ctx.fillStyle = stil.hauch;

  if (k.art === "laptop") {
    // Bildschirm und flache Tastaturleiste
    ctx.fillRect(x - r * 0.85, y - r * 1.1, r * 1.7, r * 1.2);
    ctx.strokeRect(x - r * 0.85, y - r * 1.1, r * 1.7, r * 1.2);
    ctx.fillRect(x - r * 1.15, y + r * 0.1, r * 2.3, r * 0.45);
    ctx.strokeRect(x - r * 1.15, y + r * 0.1, r * 2.3, r * 0.45);
  } else if (k.art === "server") {
    // Turm mit drei Einschüben
    ctx.fillRect(x - r * 0.75, y - r * 1.35, r * 1.5, r * 2.7);
    ctx.strokeRect(x - r * 0.75, y - r * 1.35, r * 1.5, r * 2.7);
    ctx.beginPath();
    [-0.75, 0, 0.75].forEach(dy => {
      ctx.moveTo(x - r * 0.45, y + r * dy);
      ctx.lineTo(x + r * 0.45, y + r * dy);
    });
    ctx.stroke();
  } else {
    // Router: Kästchen mit zwei Antennen
    ctx.beginPath();
    ctx.moveTo(x - r * 0.45, y - r * 0.5); ctx.lineTo(x - r * 0.45, y - r * 1.25);
    ctx.moveTo(x + r * 0.45, y - r * 0.5); ctx.lineTo(x + r * 0.45, y - r * 1.25);
    ctx.stroke();
    ctx.fillRect(x - r, y - r * 0.5, r * 2, r * 1.1);
    ctx.strokeRect(x - r, y - r * 0.5, r * 2, r * 1.1);
  }

  // Beschriftung: Kurzname fett, Klartextname (falls vorhanden) leise darunter
  ctx.fillStyle = ausgefallen ? stil.fehler : stil.text;
  ctx.font = "bold " + stil.schrift;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(id, x, y + r * 1.55);
  if (k.name) {
    ctx.fillStyle = stil.beschriftung;
    ctx.font = stil.schrift;
    ctx.fillText(k.name, x, y + r * 2.5);
  }

  // Bereits besuchte Stationen bekommen ein Häkchen (nie nur Farbe)
  if (besucht && !ausgefallen) {
    ctx.fillStyle = stil.ok;
    ctx.font = "bold " + stil.schrift;
    ctx.fillText("✓", x + r * 1.45, y - r * 1.25);
  }

  // Ausgefallener Router: dick durchgekreuzt (✗) plus Wortmarke — Symbol zusätzlich zur Farbe
  if (ausgefallen) {
    ctx.strokeStyle = stil.fehler;
    ctx.lineWidth = stil.linienstaerke * 2;
    ctx.beginPath();
    ctx.moveTo(x - r * 1.2, y - r * 1.2); ctx.lineTo(x + r * 1.2, y + r * 1.2);
    ctx.moveTo(x - r * 1.2, y + r * 1.2); ctx.lineTo(x + r * 1.2, y - r * 1.2);
    ctx.stroke();
    ctx.fillStyle = stil.fehler;
    ctx.font = stil.schrift;
    ctx.fillText("ausgefallen", x, y + r * 2.5);
  }
}

export function zeichne({ ctx, welt, zustand: z, stil }) {
  const weg = z.weg || [];

  // Liegt die Kante a–b auf der Route? Liefert den Hop-Index, sonst -1.
  const routenIndex = (a, b) => {
    for (let i = 0; i + 1 < weg.length; i++) {
      if ((weg[i] === a && weg[i + 1] === b) || (weg[i] === b && weg[i + 1] === a)) return i;
    }
    return -1;
  };

  ctx.save();
  ctx.lineCap = "round";

  // 1) Grundnetz: alle Leitungen dünn und durchgezogen
  ctx.strokeStyle = stil.beschriftung;
  ctx.lineWidth = Math.max(1, stil.linienstaerke / 2);
  KANTEN.forEach(([a, b]) => {
    if (routenIndex(a, b) >= 0) return; // Routenkanten folgen gleich dicker
    const ka = KNOTEN[a], kb = KNOTEN[b];
    ctx.beginPath();
    ctx.moveTo(welt.px(ka.x), welt.py(ka.y));
    ctx.lineTo(welt.px(kb.x), welt.py(kb.y));
    ctx.stroke();
  });

  // 2) Aktuelle Route dick hervorgehoben — nie nur über Farbe: Vor dem Paket
  //    liegende Hops sind dick GESTRICHELT (Akzent), zurückgelegte dick
  //    DURCHGEZOGEN (Grün). Beides unterscheidet sich vom dünnen Grundnetz.
  for (let i = 0; i + 1 < weg.length; i++) {
    const ka = KNOTEN[weg[i]], kb = KNOTEN[weg[i + 1]];
    const zurueckgelegt = i < z.position;
    ctx.strokeStyle = zurueckgelegt ? stil.ok : stil.akzent;
    ctx.lineWidth = stil.linienstaerke * 2;
    ctx.setLineDash(zurueckgelegt ? [] : [9, 7]);
    ctx.beginPath();
    ctx.moveTo(welt.px(ka.x), welt.py(ka.y));
    ctx.lineTo(welt.px(kb.x), welt.py(kb.y));
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // 3) Knoten über den Leitungen
  Object.keys(KNOTEN).forEach(id => zeichneKnoten(ctx, welt, stil, id, z));

  // 4) Das Paket: gefülltes Quadrat auf dem aktuellen Knoten
  if (weg.length) {
    const k = KNOTEN[weg[Math.min(z.position, weg.length - 1)]];
    const s = welt.laenge(0.24);
    ctx.fillStyle = stil.akzent;
    ctx.strokeStyle = stil.flaeche;
    ctx.lineWidth = stil.linienstaerke;
    ctx.fillRect(welt.px(k.x) - s, welt.py(k.y) - s, 2 * s, 2 * s);
    ctx.strokeRect(welt.px(k.x) - s, welt.py(k.y) - s, 2 * s, 2 * s);
  }

  // 5) Statuszeile im Canvas (gut für den Beamer)
  ctx.fillStyle = stil.text;
  ctx.font = "bold " + stil.schrift;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  let meldung;
  if (!weg.length) {
    meldung = "Kein Weg zum Server — das Netz ist an dieser Stelle unterbrochen.";
  } else if (z.fertig) {
    meldung = `Angekommen! ${formatZahl(weg.length - 1, 0)} Hops vom Laptop zum Server.`;
  } else {
    meldung = `Hop ${formatZahl(z.position, 0)} von ${formatZahl(weg.length - 1, 0)} — das Paket ist bei ${weg[z.position]}`;
  }
  if (z.gesperrt) meldung += ` · ${z.gesperrt} ist ausgefallen ✗`;
  ctx.fillText(meldung, welt.px(0) + 4, welt.py(welt.bereich.yMax) + 16);
  ctx.restore();
}

// ---------- Prüffälle ----------
// Referenzrouten unabhängig mit einer Python-Breitensuche auf exakt diesem Graphen
// (gleiche Kantenreihenfolge, gleiche Tie-Break-Regel) vorberechnet:
//   ausfall=0 → L–H–R1–R4–S · ausfall=3 → L–H–R1–R4–S (R3 liegt gar nicht auf der
//   Standardroute) · ausfall=1 → L–H–R2–R5–S. Jeweils 4 Hops, 3 Router, erreichbar.

export const pruefFaelle = [
  {
    name: "Ohne Ausfall: Route L–H–R1–R4–S",
    parameter: { ausfall: 0 },
    toleranzProzent: 0.1,
    soll: { hops_gesamt: 4, router_auf_route: 3, erreichbar: 1 }
  },
  {
    name: "R3 ausgefallen: Route L–H–R1–R4–S bleibt bestehen",
    parameter: { ausfall: 3 },
    toleranzProzent: 0.1,
    soll: { hops_gesamt: 4, router_auf_route: 3, erreichbar: 1 }
  },
  {
    name: "R1 ausgefallen: Ausweichroute L–H–R2–R5–S",
    parameter: { ausfall: 1 },
    toleranzProzent: 0.1,
    soll: { hops_gesamt: 4, router_auf_route: 3, erreichbar: 1 }
  }
];
