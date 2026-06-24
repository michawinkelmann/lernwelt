// Schaltkreis-Vergleich — dieselbe Quelle U und dieselben Widerstände R1, R2:
// links als Reihenschaltung, rechts als Parallelschaltung, alle Größen live.
// Modus „statisch": Parameter ändern → sofort neu rechnen und zeichnen,
// keine Zeitschleife (istFertig liefert sofort true, update ist leer).
// Die Liniendicke der Leitungen zeigt die Stromstärke (normiert auf 1,5 A).

import { formatZahl } from "../../../assets/js/sim/welt.js";

export const manifest = {
  id: "physik/schaltkreis-vergleich",
  titel: "Reihe oder parallel? Zwei Widerstände im Vergleich",
  modus: "statisch",
  raster: false,      // Schaltbild statt Koordinatenraster
  werkzeuge: false,   // Lineal/Winkelmesser ergeben am Schaltbild keinen Sinn
  parameter: [
    { id: "U",  label: "Spannung",       einheit: "V", min: 1, max: 24,  schritt: 1, start: 12 },
    { id: "R1", label: "Widerstand R₁",  einheit: "Ω", min: 5, max: 200, schritt: 5, start: 20 },
    { id: "R2", label: "Widerstand R₂",  einheit: "Ω", min: 5, max: 200, schritt: 5, start: 40 }
  ],
  anzeigen: [
    { id: "I_r", label: "I (Reihe)",           einheit: "A", stellen: 3 },
    { id: "U1",  label: "U₁ (Reihe)",          einheit: "V", stellen: 2 },
    { id: "U2",  label: "U₂ (Reihe)",          einheit: "V", stellen: 2 },
    { id: "I_p", label: "I gesamt (parallel)", einheit: "A", stellen: 3 },
    { id: "I1",  label: "I₁ (parallel)",       einheit: "A", stellen: 3 },
    { id: "I2",  label: "I₂ (parallel)",       einheit: "A", stellen: 3 }
  ],
  presets: [
    { name: "Standard",            werte: { U: 12, R1: 20, R2: 40 } },
    { name: "Gleiche Widerstände", werte: { U: 12, R1: 50, R2: 50 } },
    { name: "Sehr ungleich",       werte: { U: 12, R1: 10, R2: 200 } },
    { name: "Klingeltrafo",        werte: { U: 8,  R1: 20, R2: 20 } }
  ],
  vorhersage: {
    frage: "R₂ wird viel größer gemacht (200 Ω). Was passiert mit dem Gesamtstrom — einmal in der Reihen-, einmal in der Parallelschaltung?",
    optionen: [
      "In beiden Schaltungen sinkt der Gesamtstrom stark",
      "Reihe: sinkt stark — parallel: bleibt fast gleich",
      "Reihe: bleibt fast gleich — parallel: sinkt stark"
    ],
    aufloesung: "Reihe: sinkt stark — parallel: bleibt fast gleich. In der Reihenschaltung wächst R_ges = R₁ + R₂ kräftig, also wird I = U/R_ges deutlich kleiner. In der Parallelschaltung fließt durch Zweig 1 unverändert I₁ = U/R₁ — nur der ohnehin kleine Zweigstrom I₂ schrumpft, der Gesamtstrom ändert sich kaum."
  },
  beobachtung: [
    "Berechne aus den Anzeigen den Gesamtwiderstand der Parallelschaltung (R_ges = U geteilt durch I gesamt) — oder lies ihn über dem Schaltbild ab. Wann ist er genau halb so groß wie R₁? Probiere das Preset „Gleiche Widerstände“.",
    "Prüfe in der Reihenschaltung: Ergibt U₁ + U₂ bei jeder Einstellung genau die Quellenspannung U?",
    "Prüfe in der Parallelschaltung: Ergibt I₁ + I₂ genau den Gesamtstrom?",
    "Achte auf die Liniendicke der Leitungen: Warum ist der Gesamtstrom der Parallelschaltung bei gleichen Bauteilen immer größer als der der Reihenschaltung?"
  ],
  modellgrenzen: "Ideale Spannungsquelle ohne Innenwiderstand, ohmsche (temperaturunabhängige) Widerstände, Zuleitungen widerstandsfrei. Reale Quellen brechen bei großen Strömen leicht ein, heiße Bauteile ändern ihren Widerstand.",
  bilanz: {
    rges_reihe:    { label: "R_ges (Reihe)",    einheit: "Ω", stellen: 1 },
    rges_parallel: { label: "R_ges (parallel)", einheit: "Ω", stellen: 2 },
    i_reihe:       { label: "I (Reihe)",        einheit: "A", stellen: 4 },
    i_parallel:    { label: "I (parallel)",     einheit: "A", stellen: 4 }
  },
  welt: { xMin: 0, xMax: 10, yMin: 0, yMax: 5 }
};

// ---------- Modell (rein algebraisch, keine Zeitabhängigkeit) ----------

function rechne(p) {
  const rgReihe = p.R1 + p.R2;            // Reihe: Widerstände addieren sich
  const iReihe = p.U / rgReihe;           // ein Stromweg: I = U / R_ges
  const u1 = iReihe * p.R1;               // Teilspannungen U = R · I
  const u2 = iReihe * p.R2;
  const rgParallel = (p.R1 * p.R2) / (p.R1 + p.R2); // Produkt durch Summe
  const i1 = p.U / p.R1;                  // volle Quellenspannung an jedem Zweig
  const i2 = p.U / p.R2;
  const iParallel = i1 + i2;              // Knotenregel: Zweigströme addieren sich
  return { rgReihe, iReihe, u1, u2, rgParallel, i1, i2, iParallel };
}

export function init(p) {
  return { t: 0, ...rechne(p) };
}

export function update() { /* statisch: nichts zu tun */ }

export function messwerte(z) {
  return { I_r: z.iReihe, U1: z.u1, U2: z.u2, I_p: z.iParallel, I1: z.i1, I2: z.i2 };
}

export function istFertig() { return true; }

export function bilanz(z) {
  return { rges_reihe: z.rgReihe, rges_parallel: z.rgParallel, i_reihe: z.iReihe, i_parallel: z.iParallel };
}

// ---------- Zeichnen: zwei Schaltbilder nebeneinander (DIN-Symbole) ----------

// Liniendicke der Leitung: dicker = mehr Strom, Skala normiert auf 1,5 A
function leitungsDicke(stil, strom) {
  const anteil = Math.min(Math.abs(strom), 1.5) / 1.5;
  return stil.linienstaerke + 6 * anteil;
}

// Leitungszug in Weltkoordinaten, Dicke nach Stromstärke
function leitung(ctx, welt, stil, strom, punkte) {
  ctx.strokeStyle = stil.text;
  ctx.lineWidth = leitungsDicke(stil, strom);
  ctx.lineCap = "butt";
  ctx.lineJoin = "round";
  ctx.beginPath();
  punkte.forEach(([x, y], i) => {
    if (i === 0) ctx.moveTo(welt.px(x), welt.py(y));
    else ctx.lineTo(welt.px(x), welt.py(y));
  });
  ctx.stroke();
}

// DIN-Symbol Widerstand: Rechteck (deckt die darunterliegende Leitung ab)
function zeichneWiderstand(ctx, welt, stil, cx, cy, senkrecht) {
  const b = senkrecht ? 0.42 : 0.9;
  const h = senkrecht ? 0.85 : 0.42;
  ctx.fillStyle = stil.flaeche;
  ctx.strokeStyle = stil.akzent;
  ctx.lineWidth = stil.linienstaerke;
  const x = welt.px(cx - b / 2), y = welt.py(cy + h / 2);
  ctx.fillRect(x, y, welt.laenge(b), welt.laenge(h));
  ctx.strokeRect(x, y, welt.laenge(b), welt.laenge(h));
}

// DIN-Symbol Quelle: lange dünne Linie (Pluspol) + kurze dicke Linie (Minuspol)
function zeichneQuelle(ctx, welt, stil, cx, cy, senkrechteLeitung) {
  ctx.strokeStyle = stil.text;
  ctx.lineCap = "butt";
  const lang = 0.38, kurz = 0.16;
  if (senkrechteLeitung) {
    // Quelle in senkrechter Leitung: Polstriche waagerecht, Pluspol oben
    ctx.lineWidth = stil.linienstaerke;
    ctx.beginPath();
    ctx.moveTo(welt.px(cx - lang), welt.py(cy + 0.16));
    ctx.lineTo(welt.px(cx + lang), welt.py(cy + 0.16));
    ctx.stroke();
    ctx.lineWidth = stil.linienstaerke * 3;
    ctx.beginPath();
    ctx.moveTo(welt.px(cx - kurz), welt.py(cy - 0.16));
    ctx.lineTo(welt.px(cx + kurz), welt.py(cy - 0.16));
    ctx.stroke();
  } else {
    // Quelle in waagerechter Leitung: Polstriche senkrecht, Pluspol links
    ctx.lineWidth = stil.linienstaerke;
    ctx.beginPath();
    ctx.moveTo(welt.px(cx - 0.16), welt.py(cy - lang));
    ctx.lineTo(welt.px(cx - 0.16), welt.py(cy + lang));
    ctx.stroke();
    ctx.lineWidth = stil.linienstaerke * 3;
    ctx.beginPath();
    ctx.moveTo(welt.px(cx + 0.16), welt.py(cy - kurz));
    ctx.lineTo(welt.px(cx + 0.16), welt.py(cy + kurz));
    ctx.stroke();
  }
}

// Strompfeil (kleines Dreieck) auf der Leitung
function zeichnePfeil(ctx, welt, stil, x, y, richtung) {
  const px = welt.px(x), py = welt.py(y), g = 6 + stil.linienstaerke;
  ctx.fillStyle = stil.akzent;
  ctx.beginPath();
  if (richtung === "rechts") {
    ctx.moveTo(px + g, py); ctx.lineTo(px - g, py - 0.8 * g); ctx.lineTo(px - g, py + 0.8 * g);
  } else if (richtung === "oben") {
    ctx.moveTo(px, py - g); ctx.lineTo(px - 0.8 * g, py + g); ctx.lineTo(px + 0.8 * g, py + g);
  } else { // "unten"
    ctx.moveTo(px, py + g); ctx.lineTo(px - 0.8 * g, py - g); ctx.lineTo(px + 0.8 * g, py - g);
  }
  ctx.closePath();
  ctx.fill();
}

// Beschriftung in Weltkoordinaten
function beschrifte(ctx, welt, text, x, y, ausrichten = "center", grundlinie = "middle") {
  ctx.textAlign = ausrichten;
  ctx.textBaseline = grundlinie;
  ctx.fillText(text, welt.px(x), welt.py(y));
}

export function zeichne({ ctx, welt, zustand: z, werte: p, stil }) {
  const klein = welt.massstab < 45; // schmale Bildschirme: kompaktere Schrift
  const schrift = klein ? "10px sans-serif" : stil.schrift;
  const fett = "bold " + schrift;

  // ===== Reihenschaltung (links): ein Stromweg, alles vom selben Strom durchflossen =====
  leitung(ctx, welt, stil, z.iReihe, [
    [2.44, 1.0], [0.7, 1.0], [0.7, 3.6], [4.5, 3.6], [4.5, 1.0], [2.76, 1.0]
  ]);
  zeichneQuelle(ctx, welt, stil, 2.6, 1.0, false);
  zeichneWiderstand(ctx, welt, stil, 1.55, 3.6, false);
  zeichneWiderstand(ctx, welt, stil, 3.65, 3.6, false);
  zeichnePfeil(ctx, welt, stil, 0.7, 2.45, "oben");

  ctx.font = fett;
  ctx.fillStyle = stil.text;
  beschrifte(ctx, welt, "Reihenschaltung", 2.6, 4.72);
  beschrifte(ctx, welt, "R_ges = " + formatZahl(z.rgReihe, 1) + " Ω", 2.6, 4.3);

  ctx.font = schrift;
  ctx.fillStyle = stil.text;
  beschrifte(ctx, welt, "R₁ = " + formatZahl(p.R1, 0) + " Ω", 1.55, 3.13);
  beschrifte(ctx, welt, "U₁ = " + formatZahl(z.u1, 2) + " V", 1.55, 2.78);
  beschrifte(ctx, welt, "R₂ = " + formatZahl(p.R2, 0) + " Ω", 3.65, 3.13);
  beschrifte(ctx, welt, "U₂ = " + formatZahl(z.u2, 2) + " V", 3.65, 2.78);
  beschrifte(ctx, welt, "U = " + formatZahl(p.U, 0) + " V", 2.6, 0.45);
  ctx.fillStyle = stil.akzent;
  beschrifte(ctx, welt, "I = " + formatZahl(z.iReihe, 3) + " A", 0.88, 2.45, "left");

  // ===== Parallelschaltung (rechts): zwei Zweige, Strom teilt sich am Knoten =====
  // Hauptleitung von der Quelle zum ersten Knoten (führt den Gesamtstrom)
  leitung(ctx, welt, stil, z.iParallel, [[5.8, 2.46], [5.8, 3.6], [7.7, 3.6]]);
  leitung(ctx, welt, stil, z.iParallel, [[7.7, 1.0], [5.8, 1.0], [5.8, 2.14]]);
  // Zweig 1 (R₁) und Zweig 2 (R₂)
  leitung(ctx, welt, stil, z.i1, [[7.7, 3.6], [7.7, 1.0]]);
  leitung(ctx, welt, stil, z.i2, [[7.7, 3.6], [9.6, 3.6], [9.6, 1.0], [7.7, 1.0]]);
  zeichneQuelle(ctx, welt, stil, 5.8, 2.3, true);
  zeichneWiderstand(ctx, welt, stil, 7.7, 2.3, true);
  zeichneWiderstand(ctx, welt, stil, 9.6, 2.3, true);

  // Knoten als Punkte markieren
  ctx.fillStyle = stil.text;
  [[7.7, 3.6], [7.7, 1.0]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(welt.px(x), welt.py(y), leitungsDicke(stil, z.iParallel) / 2 + 2.5, 0, 2 * Math.PI);
    ctx.fill();
  });

  zeichnePfeil(ctx, welt, stil, 6.6, 3.6, "rechts");
  zeichnePfeil(ctx, welt, stil, 7.7, 3.27, "unten");
  zeichnePfeil(ctx, welt, stil, 9.6, 3.27, "unten");

  ctx.font = fett;
  ctx.fillStyle = stil.text;
  beschrifte(ctx, welt, "Parallelschaltung", 7.7, 4.72);
  beschrifte(ctx, welt, "R_ges = " + formatZahl(z.rgParallel, 2) + " Ω", 7.7, 4.3);

  ctx.font = schrift;
  ctx.fillStyle = stil.text;
  beschrifte(ctx, welt, "R₁ = " + formatZahl(p.R1, 0) + " Ω", 7.7, 1.5);
  beschrifte(ctx, welt, "R₂ = " + formatZahl(p.R2, 0) + " Ω", 9.6, 1.5);
  beschrifte(ctx, welt, "U = " + formatZahl(p.U, 0) + " V", 5.8, 0.45);
  ctx.fillStyle = stil.akzent;
  beschrifte(ctx, welt, "I = " + formatZahl(z.iParallel, 3) + " A", 6.6, 3.85, "center", "bottom");
  beschrifte(ctx, welt, "I₁ = " + formatZahl(z.i1, 3) + " A", 7.52, 3.27, "right");
  beschrifte(ctx, welt, "I₂ = " + formatZahl(z.i2, 3) + " A", 9.42, 2.95, "right");
}

// ---------- Prüffälle (analytisch bekannte Lösungen) ----------

export const pruefFaelle = [
  {
    name: "Standard: U = 12 V, R₁ = 20 Ω, R₂ = 40 Ω",
    parameter: { U: 12, R1: 20, R2: 40 },
    toleranzProzent: 0.2,
    soll: { rges_reihe: 60, rges_parallel: 13.3333, i_reihe: 0.2, i_parallel: 0.9 }
  },
  {
    name: "Gleiche Widerstände: U = 12 V, R₁ = R₂ = 50 Ω",
    parameter: { U: 12, R1: 50, R2: 50 },
    toleranzProzent: 0.2,
    soll: { rges_reihe: 100, rges_parallel: 25, i_reihe: 0.12, i_parallel: 0.48 }
  },
  {
    name: "Sehr ungleich: U = 24 V, R₁ = 10 Ω, R₂ = 200 Ω",
    parameter: { U: 24, R1: 10, R2: 200 },
    toleranzProzent: 0.2,
    soll: { rges_reihe: 210, rges_parallel: 9.5238, i_reihe: 0.114286, i_parallel: 2.52 }
  }
];
