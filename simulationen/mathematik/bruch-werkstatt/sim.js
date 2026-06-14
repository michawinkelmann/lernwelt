// Bruch-Werkstatt — statisch: zwei Brueche addieren, kuerzen und vergleichen.
// Lernende stellen Zaehler und Nenner zweier Brueche ueber Schieberegler ein und sehen
// die beiden Brueche als gefuellte Balken, ihren Dezimalwert und die gekuerzte Summe.
//
// Modell (rein algebraisch, keine Zeitentwicklung):
//   Bruch 1 = z1/n1, Bruch 2 = z2/n2 (alle ganzzahlig, positiv).
//   Dezimalwerte:  wert1 = z1/n1, wert2 = z2/n2.
//   Summe roh:     zr = z1*n2 + z2*n1, nr = n1*n2  (Hauptnenner n1*n2).
//   Kuerzen:       g = ggT(zr, nr) -> sz = zr/g, sn = nr/g  (gekuerzte Summe sz/sn).
//
// Modus "statisch": init(p) baut den kompletten Zustand aus den Parametern, istFertig()
// liefert sofort true, update() ist leer. Die Prueffaelle laufen dadurch ohne Klicks:
// die Engine setzt die Parameter, init uebernimmt sie, bilanz(z, p) rechnet das Ergebnis.

import { formatZahl } from "../../../assets/js/sim/welt.js";

// Groesster gemeinsamer Teiler (euklidischer Algorithmus), immer >= 1.
function ggT(a, b) {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b) { const r = a % b; a = b; b = r; }
  return a || 1;
}

// ---------- Modell (rein, in Node lauffaehig) ----------
// Liefert alle abgeleiteten Groessen. Akzeptiert sowohl die Parameter (zaehler1, nenner1, ...)
// als auch den von init() gebauten Zustand (z1, n1, z2, n2) -- so rechnen messwerte() und
// bilanz() korrekt, egal ob die Engine den Zustand oder die Parameter uebergibt.
function rechne(p) {
  const z1 = Math.round(p.zaehler1 ?? p.z1 ?? 1);
  const n1 = Math.max(1, Math.round(p.nenner1 ?? p.n1 ?? 2));
  const z2 = Math.round(p.zaehler2 ?? p.z2 ?? 1);
  const n2 = Math.max(1, Math.round(p.nenner2 ?? p.n2 ?? 3));
  const wert1 = z1 / n1;
  const wert2 = z2 / n2;
  const zr = z1 * n2 + z2 * n1;   // Zaehler der Summe ueber dem Hauptnenner n1*n2
  const nr = n1 * n2;             // gemeinsamer Nenner (Produkt der Nenner)
  const g = ggT(zr, nr);         // mit dem ggT vollstaendig kuerzen
  const sz = zr / g;
  const sn = nr / g;
  return { z1, n1, z2, n2, wert1, wert2, zr, nr, sz, sn, summe: wert1 + wert2 };
}

export const manifest = {
  id: "mathematik/bruch-werkstatt",
  titel: "Bruch-Werkstatt",
  modus: "statisch",
  raster: false,      // eigene Balkendarstellung statt Koordinatenraster
  werkzeuge: false,   // Lineal/Winkelmesser ergeben hier keinen Sinn
  parameter: [
    { id: "zaehler1", label: "Zähler von Bruch 1",  einheit: "", min: 1, max: 11, schritt: 1, start: 1 },
    { id: "nenner1",  label: "Nenner von Bruch 1",  einheit: "", min: 2, max: 12, schritt: 1, start: 2 },
    { id: "zaehler2", label: "Zähler von Bruch 2",  einheit: "", min: 1, max: 11, schritt: 1, start: 1 },
    { id: "nenner2",  label: "Nenner von Bruch 2",  einheit: "", min: 2, max: 12, schritt: 1, start: 3 }
  ],
  anzeigen: [
    { id: "wert1",         label: "Bruch 1 als Dezimalzahl", einheit: "", stellen: 3 },
    { id: "wert2",         label: "Bruch 2 als Dezimalzahl", einheit: "", stellen: 3 },
    { id: "summe_dezimal", label: "Summe als Dezimalzahl",   einheit: "", stellen: 3 }
  ],
  presets: [
    { name: "1/2 + 1/3 (Hauptnenner)", werte: { zaehler1: 1, nenner1: 2, zaehler2: 1, nenner2: 3 } },
    { name: "1/4 + 1/4 (kürzen zu 1/2)", werte: { zaehler1: 1, nenner1: 4, zaehler2: 1, nenner2: 4 } },
    { name: "2/3 + 1/6 (gleicher Nenner)", werte: { zaehler1: 2, nenner1: 3, zaehler2: 1, nenner2: 6 } }
  ],
  vorhersage: {
    frage: "Wie viel ist 1/2 + 1/3? Manche rechnen einfach „Zähler plus Zähler, Nenner plus Nenner“ und kommen auf 2/5. Stimmt das?",
    optionen: [
      "Ja, 1/2 + 1/3 = 2/5 — man addiert oben und unten getrennt",
      "Nein, man braucht erst einen gemeinsamen Nenner; das Ergebnis ist 5/6",
      "Nein, das Ergebnis ist 2/6, also 1/3"
    ],
    aufloesung: "Brüche darf man nicht einfach „oben plus oben, unten plus unten“ addieren. Man bringt sie zuerst auf einen gemeinsamen Nenner (Hauptnenner). Für 1/2 und 1/3 ist das die 6: 1/2 = 3/6 und 1/3 = 2/6. Erst dann darf man die Zähler addieren: 3/6 + 2/6 = 5/6. Probe mit Dezimalzahlen: 0,5 + 0,333… = 0,833… = 5/6. (2/5 wäre nur 0,4 — viel zu wenig.)"
  },
  beobachtung: [
    "Stelle zwei Brüche mit GLEICHEM Nenner ein (z. B. 2/6 und 1/6). Beobachte: Bei gleichem Nenner werden nur die Zähler addiert, der Nenner bleibt stehen. Welche Summe zeigt die Werkstatt an?",
    "Wähle zwei Brüche mit UNGLEICHEN Nennern (z. B. 1/2 und 1/3). Hier braucht man einen gemeinsamen Nenner. Die Werkstatt rechnet automatisch mit dem Hauptnenner n₁·n₂ — vergleiche das Ergebnis mit deiner eigenen Rechnung.",
    "Stelle 1/4 + 1/4 ein. Die rohe Summe wäre 2/4 — die Werkstatt zeigt aber 1/2. Warum? Sie kürzt mit dem größten gemeinsamen Teiler. Finde weitere Beispiele, bei denen sich die Summe kürzen lässt (z. B. 1/6 + 1/6).",
    "Vergleiche die beiden Brüche: Welcher ist größer? Achte auf die Balkenlänge UND auf die Dezimalwerte. Der längere Balken gehört zum größeren Bruch — der kleinere Bruch wird mit dem Zeichen < markiert."
  ],
  modellgrenzen: "Die Werkstatt arbeitet nur mit positiven, echten Eingaben (Zähler und Nenner sind ganze Zahlen, der Nenner ist mindestens 2). Negative Brüche, gemischte Zahlen (wie 1½) und der Nenner 0 kommen hier nicht vor. Als gemeinsamer Nenner wird stets das Produkt n₁·n₂ benutzt; das ist immer ein gemeinsamer Nenner, aber nicht zwingend der kleinste (das Endergebnis wird jedoch vollständig gekürzt und ist damit eindeutig).",
  bilanz: {
    sz:    { label: "Zähler der gekürzten Summe", einheit: "", stellen: 0 },
    sn:    { label: "Nenner der gekürzten Summe", einheit: "", stellen: 0 },
    wert1: { label: "Bruch 1 als Dezimalzahl",    einheit: "", stellen: 4 },
    wert2: { label: "Bruch 2 als Dezimalzahl",    einheit: "", stellen: 4 }
  }
};

// init: kompletter Zustand aus den Parametern (auch fuer den Headless-Lauf der Prueffaelle)
export function init(p) {
  const r = rechne(p);
  return { t: 0, z1: r.z1, n1: r.n1, z2: r.z2, n2: r.n2 };
}

export function update() { /* statisch: keine Zeitentwicklung */ }
export function istFertig() { return true; }

export function messwerte(z) {
  const r = rechne(z);
  return { wert1: r.wert1, wert2: r.wert2, summe_dezimal: r.summe };
}

export function bilanz(z) {
  const r = rechne(z);
  return { sz: r.sz, sn: r.sn, wert1: r.wert1, wert2: r.wert2 };
}

// Feste, von der Balkendarstellung unabhaengige Weltflaeche (wir zeichnen ohnehin in Pixeln).
export function weltBereich() {
  return { xMin: 0, xMax: 10, yMin: 0, yMax: 10 };
}

// ---------- Zeichnen: drei gefuellte Balken (Bruch 1, Bruch 2, Summe) ----------
// Eigene, flaechenfuellende Darstellung in Canvas-Pixeln. Jeder Balken ist in seinen Nenner
// gleiche Teile geteilt; der Zaehler-Anteil ist in der Akzentfarbe gefuellt. Daneben steht
// der Bruch als selbst gezeichnete Bruchdarstellung (Zaehler / Bruchstrich / Nenner).

// Selbst gezeichneter Bruch: Zaehler ueber waagerechtem Strich ueber Nenner.
// (cx, cy) ist die Mitte; gibt die belegte Breite zurueck.
function zeichneBruch(ctx, stil, cx, cy, zaehler, nenner, gross) {
  const fs = gross ? 26 : 18;
  ctx.save();
  ctx.font = "600 " + fs + "px sans-serif";
  ctx.textAlign = "center";
  const tZ = String(zaehler), tN = String(nenner);
  const breite = Math.max(ctx.measureText(tZ).width, ctx.measureText(tN).width);
  const halb = breite / 2 + 4;
  const versatz = fs * 0.62;
  ctx.fillStyle = stil.text;
  ctx.textBaseline = "bottom";
  ctx.fillText(tZ, cx, cy - 3);            // Zaehler oben
  ctx.textBaseline = "top";
  ctx.fillText(tN, cx, cy + 3);            // Nenner unten
  ctx.strokeStyle = stil.text;             // Bruchstrich
  ctx.lineWidth = gross ? 2.5 : 1.8;
  ctx.beginPath();
  ctx.moveTo(cx - halb, cy);
  ctx.lineTo(cx + halb, cy);
  ctx.stroke();
  ctx.restore();
  return 2 * halb;
}

// Ein in "nenner" Teile geteilter Balken; davon "zaehler" Teile in "fuellung" gefuellt.
function zeichneBalken(ctx, stil, x, y, b, h, zaehler, nenner, fuellung, hervorheben) {
  const teil = b / nenner;
  const gefuellt = Math.min(zaehler, nenner);  // mehr als der ganze Balken wird gekappt
  // Gefuellte Teile
  ctx.fillStyle = fuellung;
  ctx.fillRect(x, y, teil * gefuellt, h);
  // Ueberstand (Zaehler groesser als Nenner -> > 1): zweite Reihe als Hinweis andeuten
  if (zaehler > nenner) {
    const rest = zaehler - nenner;
    ctx.fillStyle = farbeMitAlpha(fuellung, 0.5);
    ctx.fillRect(x, y, teil * Math.min(rest, nenner), h);
  }
  // Teilungslinien
  ctx.strokeStyle = farbeMitAlpha(stil.flaeche, 0.9);
  ctx.lineWidth = 1;
  for (let i = 1; i < nenner; i++) {
    ctx.beginPath();
    ctx.moveTo(x + teil * i, y);
    ctx.lineTo(x + teil * i, y + h);
    ctx.stroke();
  }
  // Rahmen (bei Hervorhebung dicker und in Akzentfarbe)
  ctx.strokeStyle = hervorheben ? stil.akzent : stil.beschriftung;
  ctx.lineWidth = hervorheben ? stil.linienstaerke + 1 : 1.5;
  ctx.strokeRect(x, y, b, h);
}

export function zeichne({ ctx, welt, zustand: z, stil }) {
  const r = rechne(z);
  const gross = stil.linienstaerke > 3;          // Beamer-Modus -> groessere Schrift
  const B = welt.breite, H = welt.hoehe;
  ctx.save();
  ctx.font = stil.schrift;

  // Layout: drei Zeilen (Bruch 1, Bruch 2, Summe). Links Platz fuer die Bruchschrift,
  // rechts der Balken. Maße in Pixeln, an die Canvasgroesse angepasst.
  const padL = 16, padR = 16, padT = 14, padB = 14;
  const labelB = Math.min(96, B * 0.22);         // Spalte links fuer die Bruchdarstellung
  const balkenX = padL + labelB + 12;
  const balkenB = Math.max(80, B - balkenX - padR - 46);  // rechts etwas Platz fuer Markierung
  const nutzH = H - padT - padB;
  const zeilenH = Math.min(nutzH / 3, gross ? 96 : 78);
  const balkenH = Math.min(zeilenH * 0.5, gross ? 46 : 38);
  // Drei vertikale Mittellinien der Zeilen
  const y1 = padT + zeilenH * 0.5;
  const y2 = padT + zeilenH * 1.5;
  const y3 = padT + zeilenH * 2.5;

  // Welcher Bruch ist groesser? (fuer die Vergleichsmarkierung in den oberen zwei Zeilen)
  const eps = 1e-9;
  const b1Groesser = r.wert1 > r.wert2 + eps;
  const b2Groesser = r.wert2 > r.wert1 + eps;

  // ----- Zeile 1: Bruch 1 -----
  zeichneBruch(ctx, stil, padL + labelB / 2, y1, r.z1, r.n1, gross);
  zeichneBalken(ctx, stil, balkenX, y1 - balkenH / 2, balkenB, balkenH, r.z1, r.n1, stil.akzent, b1Groesser);

  // ----- Zeile 2: Bruch 2 -----
  zeichneBruch(ctx, stil, padL + labelB / 2, y2, r.z2, r.n2, gross);
  zeichneBalken(ctx, stil, balkenX, y2 - balkenH / 2, balkenB, balkenH, r.z2, r.n2, stil.akzent, b2Groesser);

  // Vergleichsmarkierung rechts neben den ersten beiden Balken: groesser/kleiner/gleich.
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = (gross ? "bold 22px" : "bold 16px") + " sans-serif";
  const markX = balkenX + balkenB + 12;
  if (b1Groesser) {
    ctx.fillStyle = stil.akzent; ctx.fillText("größer", markX, y1);
    ctx.fillStyle = stil.beschriftung; ctx.font = (gross ? "20px" : "14px") + " sans-serif";
    ctx.fillText("Bruch 1 > Bruch 2", markX, y2);
  } else if (b2Groesser) {
    ctx.fillStyle = stil.beschriftung; ctx.font = (gross ? "20px" : "14px") + " sans-serif";
    ctx.fillText("Bruch 1 < Bruch 2", markX, y1);
    ctx.fillStyle = stil.akzent; ctx.font = (gross ? "bold 22px" : "bold 16px") + " sans-serif";
    ctx.fillText("größer", markX, y2);
  } else {
    ctx.fillStyle = stil.ok; ctx.fillText("gleich groß", markX, (y1 + y2) / 2);
  }
  ctx.font = stil.schrift;

  // ----- Trennlinie (Summenstrich) zwischen Zeile 2 und Zeile 3 -----
  const trennY = padT + zeilenH * 2;
  ctx.strokeStyle = stil.beschriftung;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(padL, trennY);
  ctx.lineTo(B - padR, trennY);
  ctx.stroke();
  ctx.fillStyle = stil.beschriftung;
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  ctx.font = (gross ? "16px" : "12px") + " sans-serif";
  ctx.fillText("Summe (gekürzt):", padL, trennY - 4);
  ctx.font = stil.schrift;

  // ----- Zeile 3: gekuerzte Summe sz/sn -----
  // "= " vor dem Bruch, dann die selbst gezeichnete Bruchdarstellung der gekuerzten Summe.
  ctx.fillStyle = stil.ok;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.font = (gross ? "bold 26px" : "bold 18px") + " sans-serif";
  ctx.fillText("=", padL + labelB / 2 - 26, y3);
  ctx.font = stil.schrift;
  // Summenbruch in Akzent-/OK-Farbe gezeichnet
  zeichneBruchFarbig(ctx, stil, padL + labelB / 2 + 6, y3, r.sz, r.sn, gross, stil.ok);
  // Summenbalken: Anteil sz/sn (kann > 1 sein, dann wird gekappt + Ueberstandshinweis)
  zeichneBalken(ctx, stil, balkenX, y3 - balkenH / 2, balkenB, balkenH, r.sz, r.sn, stil.ok, false);
  // Falls die Summe groesser als 1 ist (echt unecht), Hinweis rechts.
  if (r.sz > r.sn) {
    ctx.fillStyle = stil.beschriftung;
    ctx.textAlign = "left";
    ctx.font = (gross ? "16px" : "11px") + " sans-serif";
    ctx.fillText("> 1 (Balken voll)", balkenX + balkenB + 12, y3);
  }

  ctx.restore();
}

// Wie zeichneBruch, aber Zaehler/Nenner/Strich in einer waehlbaren Farbe.
function zeichneBruchFarbig(ctx, stil, cx, cy, zaehler, nenner, gross, farbe) {
  const fs = gross ? 26 : 18;
  ctx.save();
  ctx.font = "600 " + fs + "px sans-serif";
  ctx.textAlign = "center";
  const tZ = String(zaehler), tN = String(nenner);
  const breite = Math.max(ctx.measureText(tZ).width, ctx.measureText(tN).width);
  const halb = breite / 2 + 4;
  ctx.fillStyle = farbe;
  ctx.textBaseline = "bottom";
  ctx.fillText(tZ, cx, cy - 3);
  ctx.textBaseline = "top";
  ctx.fillText(tN, cx, cy + 3);
  ctx.strokeStyle = farbe;
  ctx.lineWidth = gross ? 2.5 : 1.8;
  ctx.beginPath();
  ctx.moveTo(cx - halb, cy);
  ctx.lineTo(cx + halb, cy);
  ctx.stroke();
  ctx.restore();
  return 2 * halb;
}

// Hex/rgb-Farbe der Tokens mit Alpha versehen (Tokens sind hex oder rgb()).
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

// ---------- Prueffaelle (analytisch verifiziert) ----------
// Fall1: 1/2 + 1/3 = 3/6 + 2/6 = 5/6 (bereits gekuerzt); wert1=0,5; wert2=0,3333...
// Fall2: 1/4 + 1/4 = 2/4 = 1/2 (mit ggT=2 gekuerzt).
// Fall3: 2/3 + 1/6 = 4/6 + 1/6 = 5/6 (bereits gekuerzt).
export const pruefFaelle = [
  {
    name: "1/2 + 1/3 = 5/6",
    parameter: { zaehler1: 1, nenner1: 2, zaehler2: 1, nenner2: 3 },
    toleranzProzent: 1,
    soll: { sz: 5, sn: 6, wert1: 0.5, wert2: 0.3333 }
  },
  {
    name: "1/4 + 1/4 = 1/2 (gekürzt)",
    parameter: { zaehler1: 1, nenner1: 4, zaehler2: 1, nenner2: 4 },
    toleranzProzent: 1,
    soll: { sz: 1, sn: 2 }
  },
  {
    name: "2/3 + 1/6 = 5/6",
    parameter: { zaehler1: 2, nenner1: 3, zaehler2: 1, nenner2: 6 },
    toleranzProzent: 1,
    soll: { sz: 5, sn: 6 }
  }
];
