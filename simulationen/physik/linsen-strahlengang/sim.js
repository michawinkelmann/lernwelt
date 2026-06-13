// Sammellinse: Bildkonstruktion — die drei Konstruktionsstrahlen an der dünnen Linse.
// Modus „statisch“: Parameter ändern → sofort neu rechnen und zeichnen.
// Seitenansicht in Zentimetern: Linse in der Mittelebene x = 0, optische Achse y = 0,
// Gegenstand als aufrechter Pfeil bei x = −g (Fuß auf der Achse), Brennpunkte bei x = ±f.
// Linsengleichung (für Klasse 6 nur Zugabe — die Konstruktion steht im Vordergrund):
//   b = f·g / (g − f),  Vergrößerung V = |b| / g,  Bildgröße hB = hG·V
//   g > f → b > 0: reelles, umgekehrtes Bild rechts der Linse
//   g < f → b < 0: virtuelles, aufrechtes, vergrößertes Bild auf der Gegenstandsseite (Lupe!)
//   g = f → kein Bild: die Strahlen verlassen die Linse parallel (Werte NaN → Anzeige „–“)

export const manifest = {
  id: "physik/linsen-strahlengang",
  titel: "Sammellinse: Bildkonstruktion",
  modus: "statisch",
  raster: false,     // Welt rechnet in cm — das Meter-Raster der Engine passt hier nicht
  werkzeuge: false,  // Lineal/Winkelmesser melden Meter und wären in der cm-Welt irreführend
  parameter: [
    { id: "g",  label: "Abstand Gegenstand–Linse", einheit: "cm", min: 5, max: 40, schritt: 1,   start: 20 },
    { id: "f",  label: "Brennweite",               einheit: "cm", min: 3, max: 15, schritt: 1,   start: 8 },
    { id: "hG", label: "Größe des Gegenstands",    einheit: "cm", min: 1, max: 5,  schritt: 0.5, start: 3 }
  ],
  anzeigen: [
    { id: "b",     label: "Bildweite",              einheit: "cm", stellen: 1 },
    { id: "v",     label: "Vergrößerung",           einheit: "",   stellen: 2 },
    { id: "hB",    label: "Bildgröße",              einheit: "cm", stellen: 1 },
    { id: "reell", label: "reelles Bild? (1 = ja)", einheit: "",   stellen: 0 }
  ],
  presets: [
    { name: "Normalfall",        werte: { g: 20, f: 8, hG: 3 } },
    { name: "Gegenstand bei 2F", werte: { g: 16, f: 8, hG: 3 } },
    { name: "Lupe",              werte: { g: 5,  f: 8, hG: 3 } }
  ],
  vorhersage: {
    frage: "Du schiebst den Gegenstand näher an die Linse heran — wird das Bild größer oder kleiner?",
    optionen: ["Das Bild wird größer", "Das Bild wird kleiner", "Es bleibt gleich groß"],
    aufloesung: "Das Bild wird größer! Solange der Gegenstand weiter von der Linse entfernt ist als der Brennpunkt, wächst das Bild beim Heranschieben — und es rückt gleichzeitig immer weiter von der Linse weg. Schiebst du den Gegenstand sogar näher heran als den Brennpunkt, wird die Linse zur Lupe: Das Bild ist dann aufrecht, vergrößert und nur scheinbar."
  },
  beobachtung: [
    "Stelle g = 16 cm ein (Brennweite f = 8 cm) — der Gegenstand steht dann genau beim Punkt 2F. Vergleiche Bild und Gegenstand: Wie groß ist das Bild, und wo liegt es?",
    "Schiebe den Gegenstand von ganz weit weg (g = 40 cm) langsam Richtung Brennpunkt. Beobachte die Anzeigen: Was machen Bildweite und Bildgröße dabei?",
    "Gehe näher an die Linse heran, als die Brennweite ist (zum Beispiel g = 5 cm bei f = 8 cm). Jetzt wird die Linse zur Lupe: Was ist am Bild jetzt alles anders als vorher?",
    "Stelle den Gegenstand genau in den Brennpunkt (g = f, zum Beispiel beide auf 8 cm). Schau dir die Strahlen rechts von der Linse genau an: Warum entsteht gar kein Bild?"
  ],
  modellgrenzen: "Dünne, ideale Linse: Alle Strahlen knicken in einer einzigen Ebene (Mittelebene), gezeichnet sind nur die drei Konstruktionsstrahlen. Echte Linsen sind dick und haben Rand- und Farbfehler. Steht der Gegenstand genau im Brennpunkt (g = f), verlassen die Strahlen die Linse parallel — es entsteht kein Bild, die Anzeigen zeigen „–“.",
  bilanz: {
    b:     { label: "Bildweite",              einheit: "cm", stellen: 2 },
    v:     { label: "Vergrößerung",           einheit: "",   stellen: 3 },
    hB:    { label: "Bildgröße",              einheit: "cm", stellen: 2 },
    reell: { label: "reelles Bild? (1 = ja)", einheit: "",   stellen: 0 }
  }
};

// Linsengleichung auswerten; g = f wird numerisch abgefangen (NaN → Anzeige „–“).
export function rechne(p) {
  if (Math.abs(p.g - p.f) < 1e-9) {
    return { b: NaN, v: NaN, hB: NaN, reell: NaN, keinBild: true };
  }
  const b = p.f * p.g / (p.g - p.f);
  const v = Math.abs(b) / p.g;
  return { b, v, hB: p.hG * v, reell: b > 0 ? 1 : 0, keinBild: false };
}

export function init(p) {
  return { t: 0, ...rechne(p) };
}

export function update() { /* statisch: nichts zu tun */ }

export function messwerte(z) {
  return { b: z.b, v: z.v, hB: z.hB, reell: z.reell };
}

export function istFertig() { return true; }

export function bilanz(z) {
  return { b: z.b, v: z.v, hB: z.hB, reell: z.reell };
}

// Die drei Konstruktionsstrahlen, jeweils als Knickpunkt auf der Linsenebene (x = 0)
// plus Steigung des auslaufenden Strahls. Start ist die Gegenstandsspitze P = (−g | hG).
//   Parallelstrahl:    kommt parallel zur Achse an → läuft hinter der Linse durch F (rechts)
//   Mittelpunktstrahl: geht ungeknickt durch die Linsenmitte
//   Brennstrahl:       kommt über F (links) → läuft hinter der Linse parallel zur Achse
// Knickpunkt des Brennstrahls: y = hG·f/(f − g) — für g = f existiert er nicht (Division durch 0).
// Alle drei Geraden schneiden sich rechnerisch in (b | −hB) bzw. ihre rückwärtigen
// Verlängerungen in (b | +hB) — das prüft der Geometrie-Test in der Validierung nach.
export function konstruktionsStrahlen(p) {
  const strahlen = [
    { name: "Parallelstrahl",    knickY: p.hG, steigung: -p.hG / p.f },
    { name: "Mittelpunktstrahl", knickY: 0,    steigung: -p.hG / p.g }
  ];
  if (Math.abs(p.g - p.f) > 1e-9) {
    strahlen.push({ name: "Brennstrahl", knickY: p.hG * p.f / (p.f - p.g), steigung: 0 });
  }
  return strahlen;
}

// Halbe Höhe der Linsenebene: muss alle Knickpunkte (±hB, hG) überdecken.
function halbeLinsenhoehe(p, z) {
  const hB = z && isFinite(z.hB) ? z.hB : 0;
  return 1.15 * Math.max(p.hG, hB, 2);
}

// Weltausschnitt dynamisch: Gegenstand, beide 2F-Punkte und (falls vorhanden) das Bild
// samt Bildgröße einschließen; y symmetrisch um die optische Achse.
export function weltBereich(p, z) {
  const H = halbeLinsenhoehe(p, z);
  let xMin = Math.min(-p.g, -2 * p.f);
  let xMax = 2 * p.f;
  if (z && isFinite(z.b)) {
    if (z.b > 0) xMax = Math.max(xMax, z.b);
    else xMin = Math.min(xMin, z.b);
  }
  const padX = 0.06 * (xMax - xMin) + 1.5;
  const padY = 0.2 * H + 0.8;
  return { xMin: xMin - padX, xMax: xMax + padX, yMin: -H - padY, yMax: H + padY };
}

// Gefüllte Pfeilspitze am Punkt (x|y), Richtung als Winkel in Pixelkoordinaten
function pfeilSpitze(ctx, x, y, winkel, groesse) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - groesse * Math.cos(winkel - 0.42), y - groesse * Math.sin(winkel - 0.42));
  ctx.lineTo(x - groesse * Math.cos(winkel + 0.42), y - groesse * Math.sin(winkel + 0.42));
  ctx.closePath();
  ctx.fill();
}

// Auslaufenden Strahl (Knickpunkt auf der Linsenebene, Steigung m) bis zum Weltrand verfolgen
function strahlBisRand(knickY, m, bereich) {
  let x = bereich.xMax;
  let y = knickY + m * x;
  if (m !== 0 && y < bereich.yMin) { x = (bereich.yMin - knickY) / m; y = bereich.yMin; }
  else if (m !== 0 && y > bereich.yMax) { x = (bereich.yMax - knickY) / m; y = bereich.yMax; }
  return { x, y };
}

export function zeichne({ ctx, welt, werte: p, zustand: z, stil }) {
  const b = welt.bereich;
  const beamer = stil.linienstaerke >= 4;
  const spitze = beamer ? 13 : 9;
  const zeile = beamer ? 26 : 19;
  const yAchse = welt.py(0);
  const strahlen = konstruktionsStrahlen(p);
  const farben = [stil.akzent, stil.ok, stil.fehler]; // Parallel-, Mittelpunkts-, Brennstrahl
  const H = halbeLinsenhoehe(p, z);

  ctx.save();
  ctx.font = stil.schrift;

  // --- Optische Achse ---
  ctx.strokeStyle = stil.text;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(welt.px(b.xMin), yAchse);
  ctx.lineTo(welt.px(b.xMax), yAchse);
  ctx.stroke();

  // --- Brennpunkte F und 2F auf beiden Seiten markieren ---
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  [[-2, "2F"], [-1, "F"], [1, "F"], [2, "2F"]].forEach(([k, name]) => {
    const x = welt.px(k * p.f);
    ctx.strokeStyle = stil.text;
    ctx.lineWidth = stil.linienstaerke;
    ctx.beginPath();
    ctx.moveTo(x, yAchse - 5);
    ctx.lineTo(x, yAchse + 5);
    ctx.stroke();
    ctx.fillStyle = stil.text;
    ctx.fillText(name, x, yAchse + 8);
  });

  // --- Konstruktionsstrahlen: ankommend ab Gegenstandsspitze, dann auslaufend ---
  const pxP = welt.px(-p.g), pyP = welt.py(p.hG); // Gegenstandsspitze P
  strahlen.forEach((s, i) => {
    ctx.strokeStyle = farben[i];
    ctx.fillStyle = farben[i];
    ctx.lineWidth = stil.linienstaerke;
    ctx.setLineDash([]);
    const pxK = welt.px(0), pyK = welt.py(s.knickY);
    // Lupe: gepunktete Hilfslinie von F (links) zur Spitze — daher kommt der Brennstrahl
    if (s.name === "Brennstrahl" && z.reell === 0) {
      ctx.setLineDash([2, 5]);
      ctx.beginPath(); ctx.moveTo(welt.px(-p.f), yAchse); ctx.lineTo(pxP, pyP); ctx.stroke();
      ctx.setLineDash([]);
    }
    // ankommender Teil mit Richtungspfeil in der Mitte
    ctx.beginPath(); ctx.moveTo(pxP, pyP); ctx.lineTo(pxK, pyK); ctx.stroke();
    pfeilSpitze(ctx, (pxP + pxK) / 2, (pyP + pyK) / 2, Math.atan2(pyK - pyP, pxK - pxP), spitze - 2);
    // auslaufender Teil bis zum Weltrand
    const ende = strahlBisRand(s.knickY, s.steigung, b);
    ctx.beginPath(); ctx.moveTo(pxK, pyK); ctx.lineTo(welt.px(ende.x), welt.py(ende.y)); ctx.stroke();
    // virtuelles Bild: rückwärtige Verlängerung gepunktet bis zum Schnittpunkt (b | hB)
    if (z.reell === 0) {
      ctx.setLineDash([2, 5]);
      ctx.beginPath(); ctx.moveTo(pxK, pyK); ctx.lineTo(welt.px(z.b), welt.py(z.hB)); ctx.stroke();
      ctx.setLineDash([]);
    }
  });

  // --- Linse: schmale Glas-Ellipse + Doppelpfeil-Symbol der dünnen Sammellinse ---
  const pxL = welt.px(0);
  const pyOben = welt.py(H), pyUnten = welt.py(-H);
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = stil.akzent;
  ctx.beginPath();
  ctx.ellipse(pxL, yAchse, beamer ? 14 : 10, (pyUnten - pyOben) / 2, 0, 0, 2 * Math.PI);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = stil.text;
  ctx.fillStyle = stil.text;
  ctx.lineWidth = stil.linienstaerke;
  ctx.beginPath(); ctx.moveTo(pxL, pyOben); ctx.lineTo(pxL, pyUnten); ctx.stroke();
  pfeilSpitze(ctx, pxL, pyOben, -Math.PI / 2, spitze);
  pfeilSpitze(ctx, pxL, pyUnten, Math.PI / 2, spitze);
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText("Linse", pxL, pyOben - 6);

  // --- Gegenstand G: aufrechter Pfeil bei x = −g ---
  ctx.strokeStyle = stil.text;
  ctx.fillStyle = stil.text;
  ctx.lineWidth = stil.linienstaerke + 1;
  ctx.beginPath(); ctx.moveTo(pxP, yAchse); ctx.lineTo(pxP, pyP); ctx.stroke();
  pfeilSpitze(ctx, pxP, pyP, -Math.PI / 2, spitze);
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText("G", pxP, pyP - spitze - 2);

  // --- Bild B am Schnittpunkt der Strahlen (reell: umgekehrt; virtuell: aufrecht, gestrichelt) ---
  if (!z.keinBild) {
    const pxB = welt.px(z.b);
    const pyB = welt.py(z.reell === 1 ? -z.hB : z.hB);
    ctx.lineWidth = stil.linienstaerke + 1;
    if (z.reell === 0) ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(pxB, yAchse); ctx.lineTo(pxB, pyB); ctx.stroke();
    ctx.setLineDash([]);
    pfeilSpitze(ctx, pxB, pyB, z.reell === 1 ? Math.PI / 2 : -Math.PI / 2, spitze);
    ctx.beginPath(); ctx.arc(pxB, pyB, beamer ? 5 : 3.5, 0, 2 * Math.PI); ctx.fill(); // Schnittpunkt
    ctx.textAlign = "center";
    ctx.textBaseline = z.reell === 1 ? "top" : "bottom";
    ctx.fillText("B", pxB, pyB + (z.reell === 1 ? spitze + 2 : -spitze - 2));
  }

  // --- Status und Legende (nie nur Farbe: immer auch Text) ---
  let yText = beamer ? 20 : 16;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = "bold " + stil.schrift;
  ctx.fillStyle = stil.text;
  const status = z.keinBild
    ? "Kein Bild (g = f)"
    : (z.reell === 1 ? "Bild: reell + umgekehrt" : "Bild: virtuell + aufrecht (Lupe!)");
  const erklaerung = z.keinBild
    ? "Die Strahlen laufen hinter der Linse parallel."
    : (z.reell === 1 ? "Man könnte es auf einem Schirm auffangen." : "Nur scheinbar — wie das Spiegelbild.");
  ctx.fillText(status, 8, yText);
  ctx.font = stil.schrift;
  ctx.fillStyle = stil.beschriftung;
  yText += zeile;
  ctx.fillText(erklaerung, 8, yText);
  ["Parallelstrahl", "Mittelpunktstrahl", "Brennstrahl"].forEach((name, i) => {
    if (i >= strahlen.length) return; // bei g = f gibt es keinen Brennstrahl
    yText += zeile;
    ctx.strokeStyle = farben[i];
    ctx.lineWidth = stil.linienstaerke;
    ctx.beginPath(); ctx.moveTo(8, yText); ctx.lineTo(36, yText); ctx.stroke();
    ctx.fillStyle = stil.text;
    ctx.fillText(name, 42, yText);
  });

  ctx.restore();
}

// ---------- Prüffälle (Linsengleichung, analytisch exakt nachgerechnet) ----------
// b = f·g/(g − f), V = |b|/g, hB = hG·V
// Fall 1: b = 8·20/12 = 13,333 cm,   V = 0,6667 → reelles, verkleinertes Bild
// Fall 2: b = 8·12/4 = 24 cm,        V = 2, hB = 6 cm (g zwischen F und 2F → vergrößert)
// Fall 3: b = 8·5/(−3) = −13,333 cm, V = 2,6667 → virtuelles Bild (Lupe)

export const pruefFaelle = [
  {
    name: "Normalfall: g = 20 cm, f = 8 cm",
    parameter: { g: 20, f: 8, hG: 3 },
    toleranzProzent: 0.3,
    soll: { b: 13.33, v: 0.667, reell: 1 }
  },
  {
    name: "Zwischen F und 2F: g = 12 cm, f = 8 cm",
    parameter: { g: 12, f: 8, hG: 3 },
    toleranzProzent: 0.3,
    soll: { b: 24, v: 2, hB: 6 }
  },
  {
    name: "Lupe: g = 5 cm, f = 8 cm (g < f)",
    parameter: { g: 5, f: 8, hG: 3 },
    toleranzProzent: 0.3,
    soll: { b: -13.33, v: 2.667, reell: 0 }
  }
];
