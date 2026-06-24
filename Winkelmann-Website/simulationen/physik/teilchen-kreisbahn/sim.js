// Elektron auf Kreisbahn (Fadenstrahlrohr) — Lorentzkraft als Zentripetalkraft.
// Modell: homogenes B-Feld senkrecht zur Zeichenebene (×: in die Ebene hinein),
// Elektron startet bei (0 | r) und fliegt in +x-Richtung. Die Lorentzkraft
// F = e·v·B zeigt stets zum Zentrum (0 | 0) — Umlauf im Uhrzeigersinn.
// Der Zustand wird EXAKT auf der analytischen Kreisbahn geführt (Winkel ω·t um
// das Zentrum, ω = e·B/mₑ): kein numerischer Drift, beliebig viele Umläufe stabil.
// Zeitskala Nanosekunden — die Engine läuft mit Zeitlupe (manifest.zeitRaffung).

const M_ELEKTRON = 9.109e-31; // Elektronenmasse in kg
const E_LADUNG = 1.602e-19;   // Elementarladung in C
const T_MAX = 2e-7;           // Obergrenze Modellzeit in s (200 ns)

export const manifest = {
  id: "physik/teilchen-kreisbahn",
  titel: "Elektron auf Kreisbahn (Fadenstrahlrohr)",
  modus: "kontinuierlich",
  dt: 2e-11,            // Modell-Zeitschritt: 0,02 ns
  tMax: T_MAX,
  zeitRaffung: 5e-9,    // Zeitlupe: 5 ns Modellzeit pro Echtzeitsekunde (bei Tempo 1×)
  schrittweite: 5e-10,  // Einzelschritt: 0,5 ns
  raster: false,        // eigene Felddarstellung (×-Symbole + Maßstabsbalken) statt Meter-Raster
  parameter: [
    { id: "v6", label: "Geschwindigkeit", einheit: "10⁶ m/s", min: 1,   max: 30, schritt: 0.5, start: 10 },
    { id: "B",  label: "Flussdichte",     einheit: "mT",      min: 0.5, max: 20, schritt: 0.5, start: 2 }
  ],
  anzeigen: [
    { id: "t",      label: "Zeit",                  einheit: "ns",      stellen: 1, faktor: 1e9 },
    { id: "winkel", label: "zurückgelegter Winkel", einheit: "°",       stellen: 0, faktor: 180 / Math.PI },
    { id: "radius", label: "Bahnradius",            einheit: "cm",      stellen: 2, faktor: 100 },
    { id: "v",      label: "Geschwindigkeit",       einheit: "10⁶ m/s", stellen: 1, faktor: 1e-6 },
    { id: "x_pos",  label: "x-Position",            einheit: "cm",      stellen: 2, faktor: 100 },
    { id: "y_pos",  label: "y-Position",            einheit: "cm",      stellen: 2, faktor: 100 }
  ],
  diagramme: [
    { x: "t", y: "x_pos", titel: "x-Position über Zeit" },
    { x: "t", y: "y_pos", titel: "y-Position über Zeit" }
  ],
  presets: [
    { name: "Fadenstrahlrohr (Standard)", werte: { v6: 10, B: 2 } },
    { name: "Stärkeres Feld",             werte: { v6: 10, B: 8 } },
    { name: "Schnelles Elektron",         werte: { v6: 25, B: 2 } }
  ],
  vorhersage: {
    frage: "Die Flussdichte B wird verdoppelt (gleiche Geschwindigkeit). Was passiert mit dem Radius der Kreisbahn?",
    optionen: ["Er halbiert sich", "Er verdoppelt sich", "Er bleibt gleich"],
    aufloesung: "Er halbiert sich: Aus r = mₑ·v/(e·B) folgt r ∝ 1/B. Doppelte Flussdichte bedeutet doppelte Lorentzkraft bei gleichem Tempo — die Bahn wird enger. Prüfe nach: B = 2 mT ergibt r ≈ 2,84 cm, B = 4 mT nur noch r ≈ 1,42 cm."
  },
  beobachtung: [
    "Verdopple die Geschwindigkeit von 10 auf 20 · 10⁶ m/s (B fest). Lies den Bahnradius ab: Verdoppelt er sich? Prüfe mit r = mₑ·v/(e·B) nach.",
    "Verdopple stattdessen die Flussdichte (Geschwindigkeit fest). Wie ändert sich der Radius jetzt?",
    "Vergleiche die Umlaufdauer (Bilanz nach drei Umläufen) für v = 10 und v = 25 · 10⁶ m/s bei gleichem B. Überrascht? Rechne T = 2π·mₑ/(e·B) nach — v kommt darin gar nicht vor!",
    "Schau auf die Diagramme: x- und y-Position schwingen sinusförmig. Woran liest du dort die Umlaufdauer ab?"
  ],
  modellgrenzen: "Klassische, nicht-relativistische Rechnung — bei 30 · 10⁶ m/s ist v/c ≈ 0,1, der relativistische Fehler bleibt unter 1 %. Das Feld ist exakt homogen, das Rohr ideal leer; im echten Fadenstrahlrohr bremst das Restgas, das die Bahn sichtbar macht, die Elektronen allmählich ab. Gravitation ist vernachlässigt (um viele Größenordnungen kleiner als die Lorentzkraft).",
  bilanz: { // Werte kommen aus bilanz() bereits in diesen Einheiten an
    radius:      { label: "Bahnradius",     einheit: "cm",  stellen: 2 },
    umlaufdauer: { label: "Umlaufdauer",    einheit: "ns",  stellen: 2 },
    frequenz:    { label: "Umlauffrequenz", einheit: "MHz", stellen: 1 }
  }
};

export function init(p) {
  const v = p.v6 * 1e6;                        // m/s
  const B = p.B * 1e-3;                        // T
  const omega = E_LADUNG * B / M_ELEKTRON;     // Kreisfrequenz in rad/s
  const r = M_ELEKTRON * v / (E_LADUNG * B);   // Bahnradius in m
  return {
    t: 0, winkel: 0,                           // zurückgelegter Bahnwinkel in rad
    v, omega, r,
    x: 0, y: r, vx: v, vy: 0,                  // Start oben auf der Bahn, Flug nach rechts
    spur: [[0, r]]
  };
}

// Exakte Kreisführung: Position und Geschwindigkeit folgen dem analytischen Winkel —
// kein Aufsummieren von Ortsfehlern, |v| und r bleiben maschinengenau konstant.
export function update(z, p, dt) {
  z.t += dt;
  z.winkel += z.omega * dt;
  const phi = Math.PI / 2 - z.winkel;          // Positionswinkel um das Zentrum (0|0)
  z.x = z.r * Math.cos(phi);
  z.y = z.r * Math.sin(phi);
  z.vx = z.v * Math.sin(phi);                  // Tangente, Umlauf im Uhrzeigersinn
  z.vy = -z.v * Math.cos(phi);
  if (z.spur.length < 4000) z.spur.push([z.x, z.y]);
}

export function messwerte(z) {
  return { t: z.t, winkel: z.winkel, radius: z.r, v: z.v, x_pos: z.x, y_pos: z.y };
}

// Fertig nach drei vollen Umläufen — oder am Zeitlimit (sehr schwaches Feld)
export function istFertig(z) {
  return z.winkel >= 6 * Math.PI - 1e-9 || z.t >= T_MAX - 1e-15;
}

// Bilanz direkt in Anzeigeeinheiten (cm, ns, MHz) — so vergleicht auch validierung.html
export function bilanz(z) {
  const T = 2 * Math.PI / z.omega;             // Umlaufdauer in s
  return { radius: z.r * 100, umlaufdauer: T * 1e9, frequenz: 1 / (T * 1e6) };
}

// Quadratischer Ausschnitt, Zentrum (0|0) mittig, Rand 1,3·r
export function weltBereich(p) {
  const r = M_ELEKTRON * (p.v6 * 1e6) / (E_LADUNG * (p.B * 1e-3));
  const halb = 1.3 * r;
  return { xMin: -halb, xMax: halb, yMin: -halb, yMax: halb };
}

// „Schöne" Balkenlänge für den Maßstab: 1, 2 oder 5 mal Zehnerpotenz (≈ Viertel der Spanne)
function schoeneLaenge(spanne) {
  const roh = spanne / 4;
  const zehner = Math.pow(10, Math.floor(Math.log10(roh)));
  for (const f of [1, 2, 5, 10]) {
    if (roh <= f * zehner) return f * zehner;
  }
  return 10 * zehner;
}

function pfeil(ctx, x1, y1, x2, y2, farbe, staerke) {
  const dx = x2 - x1, dy = y2 - y1;
  const laenge = Math.hypot(dx, dy);
  if (laenge < 8) return;
  ctx.strokeStyle = farbe;
  ctx.fillStyle = farbe;
  ctx.lineWidth = staerke;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  const w = Math.atan2(dy, dx), k = 8 + staerke * 2;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - k * Math.cos(w - 0.45), y2 - k * Math.sin(w - 0.45));
  ctx.lineTo(x2 - k * Math.cos(w + 0.45), y2 - k * Math.sin(w + 0.45));
  ctx.closePath();
  ctx.fill();
}

export function zeichne({ ctx, welt, zustand: z, stil }) {
  const b = welt.bereich;
  const spanne = b.xMax - b.xMin;

  // Feldsymbole: ×-Raster = homogenes B-Feld in die Zeichenebene hinein
  const schritt = spanne / 7;
  const gr = Math.max(3, welt.laenge(schritt) * 0.11);
  ctx.save();
  ctx.strokeStyle = stil.beschriftung;
  ctx.lineWidth = Math.max(1, stil.linienstaerke - 1);
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  for (let i = 0; i < 7; i++) {
    for (let j = 0; j < 7; j++) {
      const px = welt.px(b.xMin + (i + 0.5) * schritt);
      const py = welt.py(b.yMin + (j + 0.5) * schritt);
      ctx.moveTo(px - gr, py - gr); ctx.lineTo(px + gr, py + gr);
      ctx.moveTo(px + gr, py - gr); ctx.lineTo(px - gr, py + gr);
    }
  }
  ctx.stroke();
  ctx.restore();

  ctx.font = stil.schrift;
  ctx.fillStyle = stil.beschriftung;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("× = Magnetfeld B in die Zeichenebene hinein", welt.px(b.xMin) + 6, welt.py(b.yMax) + 6);

  // Maßstabsbalken unten links (das Meter-Raster ist abgeschaltet)
  const balkenCm = schoeneLaenge(spanne * 100);
  const bx = welt.px(b.xMin) + 10;
  const by = welt.py(b.yMin) - 14;
  const bl = welt.laenge(balkenCm / 100);
  ctx.strokeStyle = stil.text;
  ctx.lineWidth = stil.linienstaerke;
  ctx.beginPath();
  ctx.moveTo(bx, by); ctx.lineTo(bx + bl, by);
  ctx.moveTo(bx, by - 5); ctx.lineTo(bx, by + 5);
  ctx.moveTo(bx + bl, by - 5); ctx.lineTo(bx + bl, by + 5);
  ctx.stroke();
  ctx.fillStyle = stil.text;
  ctx.textBaseline = "middle";
  ctx.fillText(String(balkenCm).replace(".", ",") + " cm", bx + bl + 8, by);

  // Zentrum M markieren + gestrichelte Radiuslinie zum Elektron
  const zx = welt.px(0), zy = welt.py(0);
  ctx.strokeStyle = stil.text;
  ctx.lineWidth = stil.linienstaerke;
  ctx.beginPath();
  ctx.moveTo(zx - 6, zy); ctx.lineTo(zx + 6, zy);
  ctx.moveTo(zx, zy - 6); ctx.lineTo(zx, zy + 6);
  ctx.stroke();
  ctx.fillStyle = stil.text;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("M", zx + 7, zy + 5);

  ctx.strokeStyle = stil.beschriftung;
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 5]);
  ctx.beginPath();
  ctx.moveTo(zx, zy);
  ctx.lineTo(welt.px(z.x), welt.py(z.y));
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = stil.beschriftung;
  ctx.textBaseline = "middle";
  ctx.fillText("r", welt.px(z.x * 0.5) + 6, welt.py(z.y * 0.5) - 8);

  // Startpunkt (kleiner offener Kreis oben auf der Bahn)
  ctx.strokeStyle = stil.beschriftung;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(welt.px(0), welt.py(z.r), 4, 0, 2 * Math.PI);
  ctx.stroke();

  // Bahnspur
  if (z.spur.length > 1) {
    ctx.strokeStyle = stil.akzent;
    ctx.lineWidth = stil.linienstaerke;
    ctx.setLineDash([2, 6]);
    ctx.beginPath();
    z.spur.forEach(([x, y], i) => { i ? ctx.lineTo(welt.px(x), welt.py(y)) : ctx.moveTo(welt.px(x), welt.py(y)); });
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Kraftpfeil F (Lorentzkraft, zeigt zum Zentrum) und Geschwindigkeitspfeil v (Tangente)
  const ex = welt.px(z.x), ey = welt.py(z.y);
  pfeil(ctx, ex, ey, welt.px(z.x * 0.62), welt.py(z.y * 0.62), stil.fehler, stil.linienstaerke);
  ctx.fillStyle = stil.fehler;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("F", welt.px(z.x * 0.76) + 8, welt.py(z.y * 0.76) + 8);

  const vl = 0.5 * z.r / z.v; // Pfeillänge 0,5·r in Weltkoordinaten
  const vxEnde = z.x + z.vx * vl, vyEnde = z.y + z.vy * vl;
  pfeil(ctx, ex, ey, welt.px(vxEnde), welt.py(vyEnde), stil.ok, stil.linienstaerke);
  ctx.fillStyle = stil.ok;
  ctx.fillText("v", welt.px(vxEnde) + 8, welt.py(vyEnde) - 8);

  // Elektron
  ctx.fillStyle = stil.akzent;
  ctx.beginPath();
  ctx.arc(ex, ey, Math.max(5, stil.linienstaerke * 2.5), 0, 2 * Math.PI);
  ctx.fill();
  ctx.fillStyle = stil.text;
  ctx.fillText("e⁻", ex + 9, ey - 12);
}

// ---------- Prüffälle (analytisch: r = mₑ·v/(e·B), T = 2π·mₑ/(e·B), f = 1/T) ----------
// Sollwerte in Bilanz-Einheiten (cm, ns, MHz), gerechnet mit mₑ = 9,109e-31 kg,
// e = 1,602e-19 C — auf 4 signifikante Stellen gerundet.

export const pruefFaelle = [
  {
    name: "v = 10·10⁶ m/s, B = 2 mT (Standard)",
    parameter: { v6: 10, B: 2 },
    toleranzProzent: 0.5,
    soll: { radius: 2.843, umlaufdauer: 17.86, frequenz: 55.98 }
  },
  {
    name: "v = 10·10⁶ m/s, B = 8 mT (starkes Feld)",
    parameter: { v6: 10, B: 8 },
    toleranzProzent: 0.5,
    soll: { radius: 0.7108, umlaufdauer: 4.466, frequenz: 223.9 }
  },
  {
    name: "v = 25·10⁶ m/s, B = 2 mT (T unabhängig von v)",
    parameter: { v6: 25, B: 2 },
    toleranzProzent: 0.5,
    soll: { radius: 7.108, umlaufdauer: 17.86, frequenz: 55.98 }
  }
];
