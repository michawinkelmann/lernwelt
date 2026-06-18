// Energiefluss und Wirkungsgrad — statisch-interaktiv als Sankey-Flussdiagramm.
// Lernende sehen, wie sich die zugefuehrte Energie eines Geraetes in einen nutzbaren
// Teil (Nutzenergie) und einen Verlustteil (meist Waerme) aufspaltet. Der Wirkungsgrad
// eta gibt an, welcher Anteil der zugefuehrten Energie als Nutzenergie herauskommt.
//
// Modell (rein algebraisch, ein einziger Umwandlungsschritt, keine Zeitentwicklung):
//   E_nutz    = (eta / 100) * E_zu          nutzbare Energie
//   E_verlust = E_zu - E_nutz = (1 - eta/100) * E_zu   Verlustenergie (Waerme)
//   eta in Prozent (%).
// Es gilt immer die Energieerhaltung: E_nutz + E_verlust = E_zu.
//
// Modus "statisch": init(p) baut den kompletten Zustand aus den Parametern, istFertig()
// liefert sofort true, update() ist leer. Die Prueffaelle laufen dadurch ohne Klicks:
// die Engine setzt die Parameter, init uebernimmt sie, bilanz(z, p) rechnet das Ergebnis.

import { formatZahl } from "../../../assets/js/sim/welt.js";

// ---------- Modell (rein, in Node lauffaehig) ----------
// Liefert alle abgeleiteten Groessen aus dem Zustand z = {E_zu, wirkungsgrad}.
function analyse(z) {
  const eta = z.wirkungsgrad;            // Wirkungsgrad in %
  const E_nutz = (eta / 100) * z.E_zu;   // nutzbarer Anteil
  const E_verlust = z.E_zu - E_nutz;     // Rest geht (meist als Waerme) verloren
  return { eta, E_nutz, E_verlust, E_zu: z.E_zu };
}

export const manifest = {
  id: "physik/energiefluss",
  titel: "Energiefluss und Wirkungsgrad",
  modus: "statisch",
  raster: false,      // Sankey-Flussdiagramm statt Koordinatenraster
  werkzeuge: false,   // Lineal/Winkelmesser ergeben am Flussdiagramm keinen Sinn
  parameter: [
    { id: "E_zu",         label: "Zugeführte Energie Eₖ", einheit: "J", min: 100, max: 1000, schritt: 50, start: 100 },
    { id: "wirkungsgrad", label: "Wirkungsgrad η",         einheit: "%", min: 5,   max: 95,   schritt: 5,  start: 30 }
  ],
  anzeigen: [
    { id: "E_nutz",    label: "Nutzenergie Eₙ", einheit: "J", stellen: 0 },
    { id: "E_verlust", label: "Verlust (Wärme)",    einheit: "J", stellen: 0 },
    { id: "eta",       label: "Wirkungsgrad η", einheit: "%", stellen: 0 }
  ],
  presets: [
    { name: "Glühlampe (η ≈ 5 %)",   werte: { E_zu: 100, wirkungsgrad: 5 } },
    { name: "LED-Lampe (η ≈ 30 %)",   werte: { E_zu: 100, wirkungsgrad: 30 } },
    { name: "Elektromotor (η ≈ 90 %)", werte: { E_zu: 200, wirkungsgrad: 90 } }
  ],
  vorhersage: {
    frage: "Eine alte Glühlampe hat einen Wirkungsgrad von nur etwa 5 %. Wohin geht der weitaus größte Teil der zugeführten elektrischen Energie?",
    optionen: [
      "Er geht als Wärme verloren – die Lampe wird heiß",
      "Er wird vollständig in Licht umgewandelt",
      "Er verschwindet einfach – Energie geht dabei verloren"
    ],
    aufloesung: "Bei einer Glühlampe werden nur rund 5 % der zugeführten elektrischen Energie in sichtbares Licht (die Nutzenergie) umgewandelt. Die übrigen rund 95 % werden als Wärme an die Umgebung abgegeben – deshalb wird eine Glühlampe so heiß. Energie geht dabei nicht verloren: Sie bleibt erhalten (E_nutz + E_verlust = E_zu), wird aber zum großen Teil entwertet, also in eine wenig nutzbare Form (Wärme) umgewandelt. Eine LED schafft denselben Lichteffekt mit viel weniger zugeführter Energie, weil ihr Wirkungsgrad höher ist."
  },
  beobachtung: [
    "Stelle Eₖ fest ein (z. B. 100 J) und ziehe den Wirkungsgrad η langsam von 5 % auf 95 %. Beobachte die Breite der beiden Ströme rechts: Wird η größer, so wird der grüne Nutzstrom breiter und der rote Verluststrom schmaler.",
    "Lies bei mehreren Einstellungen die beiden Werte ab und addiere sie: Nutzenergie + Verlust ergibt stets genau die zugeführte Energie Eₖ. Das ist die Energieerhaltung – Energie geht nie verloren, sie wird nur umgewandelt.",
    "Vergleiche die drei Voreinstellungen Glühlampe (η = 5 %), LED (η = 30 %) und Elektromotor (η = 90 %). Bei welchem Gerät ist der Verluststrom am breitesten, bei welchem am schmalsten? Ordne die drei nach ihrem Wirkungsgrad.",
    "Verdopple bei gleichem Wirkungsgrad die zugeführte Energie Eₖ (z. B. von 100 J auf 200 J). Wie verändern sich Nutzenergie und Verlust? Beide verdoppeln sich, der Wirkungsgrad (das Verhältnis) bleibt gleich."
  ],
  modellgrenzen: "Stark vereinfacht: Hier wird nur ein einziger Umwandlungsschritt betrachtet. Reale Energieketten sind meist mehrstufig (z. B. Kraftwerk → Leitung → Gerät), und jeder Schritt hat seinen eigenen Wirkungsgrad; der Gesamtwirkungsgrad ist dann das Produkt der einzelnen. Der Verlust ist hier komplett als Wärme angesetzt – real können auch Schall oder Reibung beitragen. Wichtig: Energie geht physikalisch nie verloren (Energieerhaltung); sie wird nur entwertet, also in eine schlechter nutzbare Form umgewandelt.",
  bilanz: {
    E_nutz:    { label: "Nutzenergie Eₙ", einheit: "J", stellen: 0 },
    E_verlust: { label: "Verlust (Wärme)",    einheit: "J", stellen: 0 },
    eta:       { label: "Wirkungsgrad η", einheit: "%", stellen: 0 }
  }
};

// init: kompletter Zustand aus den Parametern (auch fuer den Headless-Lauf der Prueffaelle)
export function init(p) {
  return {
    t: 0,
    E_zu: p.E_zu ?? 100,
    wirkungsgrad: p.wirkungsgrad ?? 30
  };
}

export function update() { /* statisch: keine Zeitentwicklung */ }
export function istFertig() { return true; }

export function messwerte(z) {
  const a = analyse(z);
  return { E_nutz: a.E_nutz, E_verlust: a.E_verlust, eta: a.eta };
}

export function bilanz(z) {
  const a = analyse(z);
  return { E_nutz: a.E_nutz, E_verlust: a.E_verlust, eta: a.eta };
}

export function weltBereich() {
  return { xMin: 0, xMax: 12, yMin: 0, yMax: 8 };
}

// ---------- Zeichnen: Sankey-Flussdiagramm ----------
// Breiter Eingangsstrom links (Breite proportional zu E_zu), in der Mitte ein Geraete-
// Symbol, rechts teilt sich der Strom in einen gruenen Nutzstrom (Breite ~ E_nutz) und
// einen roten Verluststrom (Breite ~ E_verlust). Alle Breiten teilen sich denselben
// Massstab, damit die Energieerhaltung (gruen + rot = Eingang) sichtbar bleibt.

// Hilfsfunktion: gefuelltes Band (Pfad) zeichnen
function fuelleBand(ctx, punkte, farbe, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = farbe;
  ctx.beginPath();
  punkte.forEach(([x, y], i) => { if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Pfeilspitze nach rechts an Position (xSpitze, yMitte) mit halber Bandhoehe hh
function pfeilSpitze(ctx, xSpitze, yMitte, hh, laenge, farbe, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = farbe;
  ctx.beginPath();
  ctx.moveTo(xSpitze - laenge, yMitte - hh);
  ctx.lineTo(xSpitze, yMitte);
  ctx.lineTo(xSpitze - laenge, yMitte + hh);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function zeichne({ ctx, welt, zustand: z, stil }) {
  const a = analyse(z);
  const beamer = stil.linienstaerke > 3;
  ctx.save();
  ctx.lineJoin = "round";

  // --- Massstab fuer die Strombreiten: groesster moeglicher Eingang (E_zu max) -> maxPx ---
  // So ist die Darstellung ueber alle Einstellungen hinweg vergleichbar.
  const eMax = manifest.parameter[0].max;          // 1000 J
  const maxBreitePx = welt.laenge(4.6);            // Hoehe des breitesten Bandes in Pixeln
  const minBreitePx = beamer ? 5 : 3;              // Mindestdicke, damit duenne Stroeme sichtbar bleiben
  const skala = px => Math.max(minBreitePx, (px / eMax) * maxBreitePx);

  const hZu  = skala(a.E_zu);
  const hNu  = a.E_nutz > 0 ? skala(a.E_nutz) : 0;
  const hVe  = a.E_verlust > 0 ? skala(a.E_verlust) : 0;

  // --- horizontale Geometrie (in Pixeln) ---
  const xLinks   = welt.px(0.4);
  const xGeraetL = welt.px(4.6);
  const xGeraetR = welt.px(7.4);
  const xRechts  = welt.px(11.4);
  const yMitte   = welt.py(4.2);                   // Hoehe des Eingangsstroms
  const pfeilLen = welt.laenge(0.5);

  // ===== Eingangsstrom (links -> Geraet), Breite ~ E_zu =====
  fuelleBand(ctx, [
    [xLinks, yMitte - hZu / 2],
    [xGeraetL, yMitte - hZu / 2],
    [xGeraetL, yMitte + hZu / 2],
    [xLinks, yMitte + hZu / 2]
  ], stil.akzent, 0.85);

  // ===== Geraete-Symbol in der Mitte (Kasten) =====
  const kasten = { x: xGeraetL, y: welt.py(6.4), b: xGeraetR - xGeraetL, h: welt.laenge(4.4) };
  ctx.fillStyle = stil.flaeche;
  ctx.strokeStyle = stil.text;
  ctx.lineWidth = stil.linienstaerke;
  ctx.fillRect(kasten.x, kasten.y, kasten.b, kasten.h);
  ctx.strokeRect(kasten.x, kasten.y, kasten.b, kasten.h);
  ctx.fillStyle = stil.text;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = (beamer ? "bold 20px" : "bold 14px") + " sans-serif";
  ctx.fillText("Gerät", (xGeraetL + xGeraetR) / 2, welt.py(4.55));
  ctx.font = (beamer ? "16px" : "11px") + " sans-serif";
  ctx.fillStyle = stil.beschriftung;
  ctx.fillText("Energie-", (xGeraetL + xGeraetR) / 2, welt.py(3.95));
  ctx.fillText("wandler", (xGeraetL + xGeraetR) / 2, welt.py(3.55));

  // ===== Ausgaenge: Nutzstrom (oben, gruen) und Verluststrom (unten, rot) =====
  // Vertikale Lage der beiden Baender am Geraete-Ausgang: gestapelt, oben Nutz, unten Verlust.
  const lueckePx = welt.laenge(0.5);               // kleine Luecke zwischen den beiden Stroemen
  const stapel   = hNu + hVe + lueckePx;
  const yNuOben  = yMitte - stapel / 2;            // Oberkante Nutzband
  const yNuMitte = yNuOben + hNu / 2;
  const yVeOben  = yNuOben + hNu + lueckePx;       // Oberkante Verlustband
  const yVeMitte = yVeOben + hVe / 2;

  // Nutzstrom (gruen): vom Geraete-Ausgang nach rechts, mit Pfeilspitze
  if (hNu > 0) {
    fuelleBand(ctx, [
      [xGeraetR, yNuMitte - hNu / 2],
      [xRechts - pfeilLen, yNuMitte - hNu / 2],
      [xRechts - pfeilLen, yNuMitte + hNu / 2],
      [xGeraetR, yNuMitte + hNu / 2]
    ], stil.ok, 0.9);
    pfeilSpitze(ctx, xRechts, yNuMitte, hNu / 2 + welt.laenge(0.25), pfeilLen, stil.ok, 0.9);
  }
  // Verluststrom (rot): vom Geraete-Ausgang nach rechts, mit Pfeilspitze
  if (hVe > 0) {
    fuelleBand(ctx, [
      [xGeraetR, yVeMitte - hVe / 2],
      [xRechts - pfeilLen, yVeMitte - hVe / 2],
      [xRechts - pfeilLen, yVeMitte + hVe / 2],
      [xGeraetR, yVeMitte + hVe / 2]
    ], stil.fehler, 0.9);
    pfeilSpitze(ctx, xRechts, yVeMitte, hVe / 2 + welt.laenge(0.25), pfeilLen, stil.fehler, 0.9);
  }

  // ===== Beschriftungen =====
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  ctx.font = (beamer ? "bold 18px" : "bold 13px") + " sans-serif";

  // Eingang: Beschriftung ober-/unterhalb des Eingangsbands (links)
  ctx.textAlign = "left";
  ctx.fillStyle = stil.akzent;
  ctx.fillText("zugeführt", xLinks, yMitte - hZu / 2 - welt.laenge(0.18));
  ctx.font = (beamer ? "16px" : "12px") + " sans-serif";
  ctx.textBaseline = "top";
  ctx.fillText("E_zu = " + formatZahl(a.E_zu, 0) + " J", xLinks, yMitte + hZu / 2 + welt.laenge(0.18));

  // Nutzstrom: kombiniertes Label OBERHALB des gruenen Bands (frei von der Pfeilspitze)
  ctx.textAlign = "left";
  ctx.fillStyle = stil.ok;
  ctx.font = (beamer ? "bold 17px" : "bold 12px") + " sans-serif";
  ctx.textBaseline = "bottom";
  ctx.fillText("Nutzenergie:  E_nutz = " + formatZahl(a.E_nutz, 0) + " J", xGeraetR + welt.laenge(0.2), yNuOben - welt.laenge(0.15));

  // Verluststrom: kombiniertes Label UNTERHALB des roten Bands
  ctx.fillStyle = stil.fehler;
  ctx.font = (beamer ? "bold 17px" : "bold 12px") + " sans-serif";
  ctx.textBaseline = "top";
  ctx.fillText("Verlust (Wärme):  E_verlust = " + formatZahl(a.E_verlust, 0) + " J", xGeraetR + welt.laenge(0.2), yVeMitte + hVe / 2 + welt.laenge(0.15));

  // ===== Grosser Wirkungsgrad-Prozentwert (oben mittig) =====
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = stil.text;
  ctx.font = (beamer ? "bold 40px" : "bold 28px") + " sans-serif";
  ctx.fillText("η = " + formatZahl(a.eta, 0) + " %", welt.px(6), welt.py(7.5));
  ctx.font = (beamer ? "15px" : "11px") + " sans-serif";
  ctx.fillStyle = stil.beschriftung;
  ctx.fillText("Wirkungsgrad: Anteil der zugeführten Energie, der nutzbar wird", welt.px(6), welt.py(6.85));

  ctx.restore();
}

// ---------- Prueffaelle (Arithmetik, analytisch verifiziert) ----------
// Fall1: E_zu=100, eta=30 -> E_nutz=30, E_verlust=70.
// Fall2: E_zu=200, eta=90 -> E_nutz=180, E_verlust=20.
// Fall3: E_zu=500, eta=5  -> E_nutz=25,  E_verlust=475.
export const pruefFaelle = [
  {
    name: "Eₖ = 100 J, η = 30 %",
    parameter: { E_zu: 100, wirkungsgrad: 30 },
    toleranzProzent: 1,
    soll: { E_nutz: 30, E_verlust: 70, eta: 30 }
  },
  {
    name: "Eₖ = 200 J, η = 90 %",
    parameter: { E_zu: 200, wirkungsgrad: 90 },
    toleranzProzent: 1,
    soll: { E_nutz: 180, E_verlust: 20, eta: 90 }
  },
  {
    name: "Eₖ = 500 J, η = 5 %",
    parameter: { E_zu: 500, wirkungsgrad: 5 },
    toleranzProzent: 1,
    soll: { E_nutz: 25, E_verlust: 475, eta: 5 }
  }
];
