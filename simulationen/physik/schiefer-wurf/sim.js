// Schiefer Wurf — Referenz-Simulation der Engine.
// Modell: Punktmasse ohne Luftwiderstand; Zeitschritt in Verlet-Form (Geschwindigkeits-
// Mittelwert) — bei konstantem g exakt. Landung per Interpolation des letzten Schritts.

export const manifest = {
  id: "physik/schiefer-wurf",
  titel: "Schiefer Wurf",
  modus: "kontinuierlich",
  dt: 1 / 240,
  tMax: 60,
  werkzeuge: ["lineal", "winkel"],   // Winkelmesser sinnvoll: Abwurfwinkel an der Bahn nachmessen
  parameter: [
    { id: "v0",    label: "Startgeschwindigkeit", einheit: "m/s",  min: 1, max: 30, schritt: 0.5,  start: 12 },
    { id: "alpha", label: "Abwurfwinkel",         einheit: "°",    min: 0, max: 90, schritt: 1,    start: 45 },
    { id: "g",     label: "Ortsfaktor",           einheit: "m/s²", min: 1, max: 25, schritt: 0.01, start: 9.81 }
  ],
  anzeigen: [
    { id: "t", label: "Zeit",            einheit: "s",   stellen: 2 },
    { id: "x", label: "Weite",           einheit: "m",   stellen: 2 },
    { id: "y", label: "Höhe",            einheit: "m",   stellen: 2 },
    { id: "v", label: "Geschwindigkeit", einheit: "m/s", stellen: 2 }
  ],
  diagramme: [
    { x: "t", y: "y", titel: "Höhe über Zeit" },
    { x: "t", y: "v", titel: "Geschwindigkeit über Zeit" }
  ],
  presets: [
    { name: "Erde",            werte: { g: 9.81 } },
    { name: "Mond (g = 1,62)", werte: { g: 1.62 } },
    { name: "Mars (g = 3,71)", werte: { g: 3.71 } },
    { name: "Weitschuss",      werte: { v0: 25, alpha: 40, g: 9.81 } }
  ],
  vorhersage: {
    frage: "Der Abwurfwinkel wird von 45° auf 60° erhöht (gleiche Startgeschwindigkeit). Was passiert mit der Wurfweite?",
    optionen: ["Sie wird größer", "Sie wird kleiner", "Sie bleibt (fast) gleich"],
    aufloesung: "Bei 45° ist die Wurfweite maximal (ohne Luftwiderstand). Bei 60° fliegt der Körper höher, aber weniger weit — die Weite wird kleiner. Probiere auch 30°: Wegen sin(2·30°) = sin(2·60°) ist die Weite dort genauso groß wie bei 60°!"
  },
  beobachtung: [
    "Bei welchem Abwurfwinkel wird die Wurfweite maximal? Miss mehrere Winkel und notiere die Weiten.",
    "Verdopple die Startgeschwindigkeit (z. B. 10 → 20 m/s). Was passiert mit der Wurfweite — verdoppelt sie sich?",
    "Stelle den Mond-Preset ein. Um welchen Faktor ändern sich Wurfweite und Flugzeit gegenüber der Erde?",
    "Vergleiche die Diagramme: Woran erkennst du im v-t-Diagramm den höchsten Punkt der Flugbahn?"
  ],
  modellgrenzen: "Punktmasse ohne Luftwiderstand; Abwurf auf Bodenhöhe. Reale Würfe (Ball, Kugelstoß) weichen besonders bei hohen Geschwindigkeiten ab.",
  bilanz: {
    wurfweite: { label: "Wurfweite",   einheit: "m", stellen: 2 },
    flugzeit:  { label: "Flugzeit",    einheit: "s", stellen: 2 },
    maxhoehe:  { label: "max. Höhe",   einheit: "m", stellen: 2 }
  }
};

export function init(p) {
  const winkel = p.alpha * Math.PI / 180;
  return {
    t: 0, x: 0, y: 0,
    vx: p.v0 * Math.cos(winkel),
    vy: p.v0 * Math.sin(winkel),
    spur: [[0, 0]],
    maxhoehe: 0,
    fertig: p.alpha <= 0,        // flacher „Wurf“ entlang des Bodens endet sofort
    wurfweite: 0, flugzeit: 0
  };
}

// Verlet-Form: neue Geschwindigkeit, Ort mit gemitteltem v — bei konstantem g exakt
export function update(z, p, dt) {
  if (z.fertig) return;
  const vyAlt = z.vy;
  z.vy -= p.g * dt;
  z.x += z.vx * dt;
  const yAlt = z.y;
  z.y += (vyAlt + z.vy) / 2 * dt; // Geschwindigkeits-Mittelwert: exakt bei konstantem g
  z.t += dt;
  if (z.y > z.maxhoehe) z.maxhoehe = z.y;

  if (z.y <= 0 && z.t > dt) {
    // Landung: linearen Anteil des letzten Schritts zurückrechnen
    const anteil = yAlt / (yAlt - z.y); // 0..1 innerhalb des Schritts
    z.flugzeit = z.t - dt + anteil * dt;
    z.wurfweite = z.x - z.vx * dt + anteil * z.vx * dt;
    z.x = z.wurfweite;
    z.y = 0;
    z.vy = vyAlt - p.g * anteil * dt;
    z.t = z.flugzeit;
    z.fertig = true;
  }
  if (z.spur.length < 4000) z.spur.push([z.x, z.y]);
}

export function messwerte(z) {
  return { t: z.t, x: z.x, y: z.y, v: Math.hypot(z.vx, z.vy) };
}

export function istFertig(z) { return z.fertig; }

export function bilanz(z) {
  return { wurfweite: z.wurfweite, flugzeit: z.flugzeit, maxhoehe: z.maxhoehe };
}

// Weltbereich passend zur theoretischen Weite/Höhe der aktuellen Parameter
export function weltBereich(p) {
  const winkel = p.alpha * Math.PI / 180;
  const weite = Math.max(2, p.v0 * p.v0 * Math.sin(2 * winkel) / p.g);
  const hoehe = Math.max(1.5, p.v0 * p.v0 * Math.sin(winkel) ** 2 / (2 * p.g));
  return { xMin: 0, xMax: weite * 1.08, yMin: 0, yMax: hoehe * 1.25 };
}

export function zeichne({ ctx, welt, zustand: z, stil }) {
  // Boden
  ctx.strokeStyle = stil.text;
  ctx.lineWidth = stil.linienstaerke;
  ctx.beginPath();
  ctx.moveTo(welt.px(welt.bereich.xMin), welt.py(0));
  ctx.lineTo(welt.px(welt.bereich.xMax), welt.py(0));
  ctx.stroke();

  // Flugbahn (Spur)
  if (z.spur.length > 1) {
    ctx.strokeStyle = stil.akzent;
    ctx.lineWidth = stil.linienstaerke;
    ctx.setLineDash([2, 6]);
    ctx.beginPath();
    z.spur.forEach(([x, y], i) => { i ? ctx.lineTo(welt.px(x), welt.py(y)) : ctx.moveTo(welt.px(x), welt.py(y)); });
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Geschwindigkeitspfeil
  const laengeFaktor = 0.25; // Sekunden „Vorschau“
  pfeil(ctx, welt.px(z.x), welt.py(z.y), welt.px(z.x + z.vx * laengeFaktor), welt.py(z.y + z.vy * laengeFaktor), stil.ok, stil.linienstaerke);

  // Wurfkörper
  ctx.fillStyle = stil.akzent;
  ctx.beginPath();
  ctx.arc(welt.px(z.x), welt.py(z.y), Math.max(5, stil.linienstaerke * 3), 0, 2 * Math.PI);
  ctx.fill();
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

// ---------- Prüffälle (analytisch bekannte Lösungen, Pflicht vor status: online) ----------
// W = v0²·sin(2α)/g, T = 2·v0·sin(α)/g, H = v0²·sin²(α)/(2g)

export const pruefFaelle = [
  {
    name: "Erde: v0 = 10 m/s, α = 45°",
    parameter: { v0: 10, alpha: 45, g: 9.81 },
    toleranzProzent: 0.5,
    soll: { wurfweite: 10.1937, flugzeit: 1.4416, maxhoehe: 2.5484 }
  },
  {
    name: "Erde: v0 = 20 m/s, α = 30°",
    parameter: { v0: 20, alpha: 30, g: 9.81 },
    toleranzProzent: 0.5,
    soll: { wurfweite: 35.3116, flugzeit: 2.0387, maxhoehe: 5.0968 }
  },
  {
    name: "Mond: v0 = 10 m/s, α = 45°",
    parameter: { v0: 10, alpha: 45, g: 1.62 },
    toleranzProzent: 0.5,
    soll: { wurfweite: 61.7284, flugzeit: 8.7298, maxhoehe: 15.4321 }
  }
];
