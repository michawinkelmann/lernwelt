// Radioaktiver Zerfall — stochastisches Kern-Ensemble plus Theoriekurve.
// Jeder noch vorhandene Kern zerfällt im Zeitschritt dt mit der exakten
// Wahrscheinlichkeit p = 1 − 2^(−dt/T½) (keine λ·dt-Näherung); parallel wird
// stets die Theoriekurve N(t) = N₀ · 2^(−t/T½) mitgeführt. Ein Lauf dauert
// fest 4 Halbwertszeiten; der letzte Zeitschritt wird exakt auf t = 4·T½
// gekappt. Links zerfällt ein Punktraster (jeder Punkt ein Kern), rechts
// entsteht das N-t-Diagramm mit Zufalls- und Theoriekurve samt gestrichelten
// Halbwertszeit-Markierungen bei T½, 2·T½ und 3·T½.

import { formatZahl } from "../../../assets/js/sim/welt.js";

export const manifest = {
  id: "physik/zerfall",
  titel: "Radioaktiver Zerfall",
  modus: "kontinuierlich",
  dt: 1 / 60,    // 60 Modellschritte je Sekunde — glatt genug, Puffer reicht für 4 · 20 s
  tMax: 90,      // Sicherheitsgrenze für den Headless-Lauf (Maximum: 4 · 20 s = 80 s)
  raster: false,     // ein Meter-Karo wäre hier sinnlos
  werkzeuge: false,  // Lineal/Winkelmesser messen Längen in m — hier ohne Bedeutung
  parameter: [
    { id: "n0",    label: "Anzahl Kerne zu Beginn", einheit: "",  min: 50, max: 2000, schritt: 50,  start: 400 },
    { id: "thalb", label: "Halbwertszeit",          einheit: "s", min: 1,  max: 20,   schritt: 0.5, start: 5 }
  ],
  anzeigen: [
    { id: "t",                 label: "Zeit",                einheit: "s",     stellen: 2 },
    { id: "nRest",             label: "Restkerne (Zufall)",  einheit: "Kerne", stellen: 0 },
    { id: "nTheorie",          label: "Restkerne (Theorie)", einheit: "Kerne", stellen: 1 },
    { id: "aktivitaetTheorie", label: "Aktivität (Theorie)", einheit: "1/s",   stellen: 2 }
  ],
  diagramme: [
    { x: "t", y: "nRest",    titel: "Zufall: Restkerne über Zeit (N-t-Diagramm)" },
    { x: "t", y: "nTheorie", titel: "Theorie: N(t) = N₀ · 2^(−t/T½)" }
  ],
  presets: [
    { name: "Würfel-Experiment",     werte: { n0: 100,  thalb: 3.8 } },
    { name: "Iod-131 (1 s ≙ 1 Tag)", werte: { n0: 800,  thalb: 8 } },
    { name: "Großes Ensemble",       werte: { n0: 2000, thalb: 5 } }
  ],
  vorhersage: {
    frage: "Nach einer Halbwertszeit ist die Hälfte der Kerne zerfallen. Ist nach zwei Halbwertszeiten alles weg?",
    optionen: [
      "Ja — zweimal die Hälfte, dann ist nichts mehr übrig",
      "Nein — es ist noch ein Viertel übrig, denn es halbiert sich immer wieder",
      "Nein — es bleibt für immer genau die Hälfte übrig"
    ],
    aufloesung: "Antwort B ist richtig. In jeder Halbwertszeit zerfällt die Hälfte des jeweils noch vorhandenen Bestands — nicht noch einmal die Hälfte des Anfangsbestands. Nach T½ ist also die Hälfte übrig, nach 2·T½ ein Viertel, nach 3·T½ ein Achtel und nach 4·T½ ein Sechzehntel. Die Theoriekurve erreicht die Null nie exakt; im Zufallsexperiment zerfällt der letzte Kern irgendwann — wann genau, ist purer Zufall."
  },
  beobachtung: [
    "Stelle N₀ = 50 ein und starte mehrmals hintereinander (Zurücksetzen → Start). Vergleiche dann mit N₀ = 2000: Bei welcher Anzahl liegt die zackige Zufallskurve näher an der glatten Theoriekurve? Das ist das Gesetz der großen Zahlen.",
    "Lies die Halbwertszeit am Graphen ab: Bestimme den Zeitpunkt, zu dem genau die Hälfte von N₀ übrig ist, und vergleiche mit dem eingestellten T½ — die gestrichelten Markierungen helfen dabei.",
    "Wie viele Halbwertszeiten dauert es, bis weniger als 10 % der Kerne übrig sind? Beobachte die Anzeige „Restkerne“: Nach 3·T½ sind noch 12,5 % da, nach 4·T½ nur noch 6,25 % — die 10-%-Grenze fällt also zwischen 3 und 4 Halbwertszeiten.",
    "Vergleiche während des Laufs die Anzeigen „Restkerne (Theorie)“ und „Aktivität (Theorie)“: Beide halbieren sich im selben Takt. Erkläre, warum die Aktivität (Zerfälle pro Sekunde) proportional zur Restmenge ist."
  ],
  modellgrenzen: "Keine Zerfallsreihen: Tochterkerne gelten als stabil und werden nicht weiterverfolgt. Der Zufall stammt aus dem Zufallszahlengenerator des Rechners, nicht aus echter Quantenphysik — das statistische Verhalten ist aber dasselbe. Und die Sekunden stehen stellvertretend für beliebige Zeiteinheiten: Echte Halbwertszeiten reichen von Sekundenbruchteilen bis zu Milliarden Jahren.",
  bilanz: {
    nRest:             { label: "Restkerne (Zufall)",  einheit: "Kerne", stellen: 0 },
    nTheorie:          { label: "Restkerne (Theorie)", einheit: "Kerne", stellen: 1 },
    aktivitaetTheorie: { label: "Aktivität (Theorie)", einheit: "1/s",   stellen: 2 }
  }
};

// ---------- Modell (rechnet nur mit t, T½ und Zählern — keine Darstellung) ----------

export function init(p) {
  const anzahl = Math.max(1, Math.round(p.n0)); // Ensemblegröße, ganzzahlig
  return {
    t: 0,
    anzahl,
    nRest: anzahl,
    zerfallen: new Array(anzahl).fill(false), // Punktraster: welcher Kern ist schon zerfallen?
    verlauf: [[0, anzahl]],                   // [t, nRest] — Verlaufspuffer der Zufallskurve
    fertig: false
  };
}

export function update(z, p, dt) {
  if (z.fertig) return;
  const tEnde = 4 * p.thalb;
  let schritt = dt;
  let letzter = false;
  // letzten Teilschritt exakt auf 4·T½ kürzen
  if (z.t + schritt >= tEnde) { schritt = tEnde - z.t; letzter = true; }
  if (schritt > 0) {
    // exakte Zerfallswahrscheinlichkeit für diesen (ggf. gekürzten) Schritt
    const pZerfall = 1 - Math.pow(2, -schritt / p.thalb);
    let rest = z.nRest;
    for (let i = 0; i < z.zerfallen.length; i++) {
      if (!z.zerfallen[i] && Math.random() < pZerfall) { z.zerfallen[i] = true; rest--; }
    }
    z.nRest = rest;
  }
  z.t += schritt;
  if (z.verlauf.length < 12000) z.verlauf.push([z.t, z.nRest]);
  if (letzter || z.t >= tEnde - 1e-9) { z.t = tEnde; z.fertig = true; }
}

// Theoriewert N(t) = N₀ · 2^(−t/T½)
function theorieWert(z, p) { return z.anzahl * Math.pow(2, -z.t / p.thalb); }

export function messwerte(z, p) {
  const nTheorie = theorieWert(z, p);
  return { t: z.t, nRest: z.nRest, nTheorie, aktivitaetTheorie: Math.LN2 / p.thalb * nTheorie };
}

export function istFertig(z) { return z.fertig; }

export function bilanz(z, p) {
  const nTheorie = theorieWert(z, p);
  return { nRest: z.nRest, nTheorie, aktivitaetTheorie: Math.LN2 / p.thalb * nTheorie };
}

// ---------- Darstellung (wird nur im Browser aufgerufen) ----------

// Fachfarbe --physik aus den Design-Tokens; Rückfall auf die Akzentfarbe
function fachFarbe(stil) {
  if (typeof document !== "undefined") {
    const wert = getComputedStyle(document.documentElement).getPropertyValue("--physik").trim();
    if (wert) return wert;
  }
  return stil.akzent;
}

export function zeichne({ ctx, welt, zustand: z, werte: p, stil }) {
  const breite = welt.breite, hoehe = welt.hoehe;
  const farbeKern = fachFarbe(stil);
  const tEnde = 4 * p.thalb;

  // Aufteilung: links Punktraster, rechts N-t-Diagramm
  const gx = 12, gy = 30, gb = Math.max(90, breite * 0.36), gh = hoehe - gy - 38;
  const dx = gx + gb + 48, dy = 26, db = breite - dx - 14, dh = hoehe - dy - 42;

  ctx.font = stil.schrift;

  // --- Punktraster: jeder Punkt ein Kern ---
  const spalten = Math.max(1, Math.round(Math.sqrt(z.anzahl * gb / gh)));
  const zeilen = Math.ceil(z.anzahl / spalten);
  const zellB = gb / spalten, zellH = gh / zeilen;
  const radius = Math.max(1.1, Math.min(zellB, zellH) * 0.34);
  const punktX = i => gx + (i % spalten + 0.5) * zellB;
  const punktY = i => gy + (Math.floor(i / spalten) + 0.5) * zellH;

  ctx.fillStyle = stil.beschriftung;  // zerfallene Kerne: blass
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  for (let i = 0; i < z.anzahl; i++) {
    if (!z.zerfallen[i]) continue;
    ctx.moveTo(punktX(i) + radius, punktY(i));
    ctx.arc(punktX(i), punktY(i), radius, 0, 2 * Math.PI);
  }
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = farbeKern;          // verbliebene Kerne: kräftig
  ctx.beginPath();
  for (let i = 0; i < z.anzahl; i++) {
    if (z.zerfallen[i]) continue;
    ctx.moveTo(punktX(i) + radius, punktY(i));
    ctx.arc(punktX(i), punktY(i), radius, 0, 2 * Math.PI);
  }
  ctx.fill();

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = stil.text;
  ctx.fillText("noch " + formatZahl(z.nRest, 0) + " von " + formatZahl(z.anzahl, 0) + " Kernen", gx, gy - 9);
  ctx.fillStyle = stil.beschriftung;
  ctx.fillText("jeder Punkt = ein Kern", gx, hoehe - 14);

  // --- N-t-Diagramm: Achsen ---
  ctx.strokeStyle = stil.beschriftung;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(dx, dy);
  ctx.lineTo(dx, dy + dh);
  ctx.lineTo(dx + db, dy + dh);
  ctx.stroke();
  ctx.fillStyle = stil.beschriftung;
  ctx.fillText("Kerne N", dx + 4, dy - 9);

  const px = t => dx + (t / tEnde) * db;
  const py = n => dy + dh - (n / z.anzahl) * dh;

  // Halbierungsniveaus N₀, N₀/2, N₀/4, N₀/8 (waagerecht, dezent gestrichelt)
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.setLineDash([3, 5]);
  ctx.strokeStyle = stil.raster;
  for (let k = 0; k <= 3; k++) {
    const niveau = z.anzahl / Math.pow(2, k);
    if (k > 0) {
      ctx.beginPath();
      ctx.moveTo(dx, py(niveau));
      ctx.lineTo(dx + db, py(niveau));
      ctx.stroke();
    }
    ctx.fillStyle = stil.beschriftung;
    ctx.fillText(formatZahl(niveau, 0), dx - 5, py(niveau));
  }
  ctx.fillText("0", dx - 5, py(0));

  // Halbwertszeit-Markierungen: gestrichelte Hilfslinien bei T½, 2·T½, 3·T½
  ctx.strokeStyle = stil.beschriftung;
  ctx.setLineDash([5, 4]);
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (let k = 1; k <= 3; k++) {
    ctx.beginPath();
    ctx.moveTo(px(k * p.thalb), dy);
    ctx.lineTo(px(k * p.thalb), dy + dh);
    ctx.stroke();
    ctx.fillText(k + "·T½", px(k * p.thalb), dy + dh + 6);
  }
  ctx.setLineDash([]);
  ctx.fillText("0", px(0), dy + dh + 6);
  ctx.textAlign = "right";
  ctx.fillText(formatZahl(tEnde, Number.isInteger(tEnde) ? 0 : 1) + " s", dx + db, dy + dh + 6);

  // Theoriekurve N(t) = N₀ · 2^(−t/T½) — glatt, bis zur aktuellen Zeit
  if (z.t > 0) {
    ctx.strokeStyle = stil.text;
    ctx.lineWidth = Math.max(1.5, stil.linienstaerke - 1);
    ctx.beginPath();
    const schritte = 120;
    for (let i = 0; i <= schritte; i++) {
      const t = z.t * i / schritte;
      const y = py(z.anzahl * Math.pow(2, -t / p.thalb));
      if (i === 0) ctx.moveTo(px(t), y); else ctx.lineTo(px(t), y);
    }
    ctx.stroke();
  }

  // Zufallskurve aus dem Verlaufspuffer — zackig
  ctx.strokeStyle = farbeKern;
  ctx.lineWidth = stil.linienstaerke;
  ctx.beginPath();
  for (let i = 0; i < z.verlauf.length; i++) {
    const punkt = z.verlauf[i];
    if (i === 0) ctx.moveTo(px(punkt[0]), py(punkt[1])); else ctx.lineTo(px(punkt[0]), py(punkt[1]));
  }
  ctx.stroke();

  // aktueller Messpunkt
  ctx.fillStyle = farbeKern;
  ctx.beginPath();
  ctx.arc(px(z.t), py(z.nRest), Math.max(3, stil.linienstaerke + 1), 0, 2 * Math.PI);
  ctx.fill();

  // Legende oben rechts im Diagramm
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const eintraege = [
    ["Zufall", farbeKern, stil.linienstaerke],
    ["Theorie", stil.text, Math.max(1.5, stil.linienstaerke - 1)]
  ];
  const textBreite = Math.max(ctx.measureText(eintraege[0][0]).width, ctx.measureText(eintraege[1][0]).width);
  const lx = dx + db - textBreite - 34;
  let ly = dy + 10;
  for (const [name, farbe, staerke] of eintraege) {
    ctx.strokeStyle = farbe;
    ctx.lineWidth = staerke;
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(lx + 24, ly);
    ctx.stroke();
    ctx.fillStyle = stil.text;
    ctx.fillText(name, lx + 30, ly);
    ly += 18;
  }
}

// ---------- Prüffälle (nur deterministische Theorie-Größen; nach 4·T½ gilt
// exakt N = N₀/16 und A = ln2/T½ · N — die stochastische Größe nRest wird
// bewusst nicht geprüft) ----------

export const pruefFaelle = [
  {
    name: "Standard: N₀ = 400, T½ = 5 s → nach 4·T½ noch N₀/16 = 25",
    parameter: { n0: 400, thalb: 5 },
    toleranzProzent: 0.5,
    soll: { nTheorie: 25, aktivitaetTheorie: 3.4657 }
  },
  {
    name: "Iod-131-Preset: N₀ = 800, T½ = 8 s → noch 50",
    parameter: { n0: 800, thalb: 8 },
    toleranzProzent: 0.5,
    soll: { nTheorie: 50, aktivitaetTheorie: 4.3322 }
  },
  {
    name: "Schnell und groß: N₀ = 1600, T½ = 4 s → noch 100",
    parameter: { n0: 1600, thalb: 4 },
    toleranzProzent: 0.5,
    soll: { nTheorie: 100, aktivitaetTheorie: 17.3287 }
  }
];
