// Schattenwerfer — Schattenlänge per Strahlensatz; mit zwei Lampen Kern- und Halbschatten.
// Modus „statisch“: Parameter ändern → sofort neu rechnen und zeichnen.
// Seitenansicht in Metern: Lampe(n) bei x = ∓dQ/2 in Höhe hQ, Stab bei x = a (Fuß am Boden),
// Boden bei y = 0. Randstrahl von der Lampe (xq | hQ) über die Stabspitze (a | hS) trifft
// den Boden bei  xe = xq + (a − xq) · hQ / (hQ − hS)   — Strahlensatz, nur gültig für hS < hQ.
// Ist der Stab mindestens so hoch wie die Lampe, erreicht der Randstrahl den Boden nie:
// Der Schatten endet nicht (∞) — die Werte werden dann auf NaN gesetzt (Anzeige „–“).

export const manifest = {
  id: "physik/schattenwerfer",
  titel: "Schattenwerfer: Schattenlänge, Kern- und Halbschatten",
  modus: "statisch",
  parameter: [
    { id: "hQ", label: "Lampenhöhe",              einheit: "m", min: 0.5, max: 3,   schritt: 0.1, start: 2 },
    { id: "a",  label: "Abstand Lampe–Stab",      einheit: "m", min: 0.5, max: 4,   schritt: 0.1, start: 2 },
    { id: "hS", label: "Stabhöhe",                einheit: "m", min: 0.1, max: 1.8, schritt: 0.1, start: 1 },
    { id: "dQ", label: "Abstand der zwei Lampen", einheit: "m", min: 0,   max: 1,   schritt: 0.1, start: 0 }
  ],
  anzeigen: [
    { id: "schattenende", label: "Schattenende",        einheit: "m", stellen: 2 },
    { id: "kern",         label: "Kernschatten-Länge",  einheit: "m", stellen: 2 },
    { id: "halb",         label: "Halbschatten-Zusatz", einheit: "m", stellen: 2 }
  ],
  presets: [
    { name: "Eine Lampe",                  werte: { hQ: 2, a: 2, hS: 1, dQ: 0 } },
    { name: "Lampe hoch",                  werte: { hQ: 3 } },
    { name: "Zwei Lampen",                 werte: { dQ: 0.8 } },
    { name: "Stab fast so hoch wie Lampe", werte: { hS: 1.7, hQ: 2 } }
  ],
  vorhersage: {
    frage: "Die Lampe wird höher gehängt — der Stab bleibt, wo er ist. Was passiert mit seinem Schatten?",
    optionen: ["Er wird länger", "Er wird kürzer", "Er bleibt gleich lang"],
    aufloesung: "Er wird kürzer! Von einer hohen Lampe fällt das Licht steiler über die Stabspitze, der Randstrahl trifft schon dicht hinter dem Stab auf den Boden. Genauso ist es draußen: Mittags steht die Sonne hoch — kurze Schatten. Abends steht sie tief — lange Schatten."
  },
  beobachtung: [
    "Stelle das Preset „Eine Lampe“ ein und lies die Kernschatten-Länge ab. Prüfe mit dem Lineal-Werkzeug nach: Ist der Schatten auf dem Boden wirklich so lang?",
    "Doppelter Stab → doppelter Schatten? Stelle die Stabhöhe erst auf 0,5 m, dann auf 1 m und notiere beide Schattenlängen. Stimmt die Vermutung?",
    "Verdopple stattdessen den Abstand Lampe–Stab (zum Beispiel von 1,5 m auf 3 m). Was macht die Schattenlänge jetzt?",
    "Ziehe den Abstand der zwei Lampen langsam von 0 auf 1 m. Beschreibe, wie Kernschatten und Halbschatten entstehen und sich verändern."
  ],
  modellgrenzen: "Punktförmige Lichtquellen, unendlich dünner Stab, ebener Boden — alles in der 2D-Seitenansicht. Ist der Stab so hoch wie die Lampe oder höher (hS ≥ hQ), läuft der Randstrahl nicht mehr nach unten: Der Schatten endet nie. Die Anzeigen zeigen dann „–“ (gemeint ist ∞).",
  bilanz: {
    kern_laenge:      { label: "Kernschatten-Länge",   einheit: "m", stellen: 3 },
    halb_zusatz:      { label: "Halbschatten-Zusatz",  einheit: "m", stellen: 3 },
    schattenende_max: { label: "Schattenende (max.)",  einheit: "m", stellen: 3 }
  }
  // Kein fester Weltausschnitt: weltBereich() unten passt sich der Schattenlänge an.
};

// Strahlensatz: x-Koordinate, an der der Randstrahl der Lampe (xq | hQ) den Boden trifft.
// Für hS ≥ hQ gibt es keinen Bodentreffpunkt → NaN („Schatten endet nie“).
function schattenEnde(xq, p) {
  if (p.hS >= p.hQ - 1e-9) return NaN;
  return xq + (p.a - xq) * p.hQ / (p.hQ - p.hS);
}

// Beide Schattenenden und die daraus folgenden Längen berechnen.
// Die rechte (stabnähere) Lampe wirft den kürzeren Schatten → sie begrenzt den Kernschatten;
// die linke (fernere) Lampe wirft den längeren Schatten → bis dorthin reicht der Halbschatten.
function rechne(p) {
  const xeRechts = schattenEnde(+p.dQ / 2, p);
  const xeLinks  = schattenEnde(-p.dQ / 2, p);
  return {
    xeRechts,
    xeLinks,
    kern: xeRechts - p.a,        // bei dQ = 0 die gewöhnliche Schattenlänge L
    halb: xeLinks - xeRechts,    // bei dQ = 0 exakt 0
    unendlich: !isFinite(xeLinks)
  };
}

export function init(p) {
  return { t: 0, ...rechne(p) };
}

export function update() { /* statisch: nichts zu tun */ }

export function messwerte(z) {
  return { schattenende: z.xeLinks, kern: z.kern, halb: z.halb };
}

export function istFertig() { return true; }

export function bilanz(z) {
  return { kern_laenge: z.kern, halb_zusatz: z.halb, schattenende_max: z.xeLinks };
}

// Weltausschnitt dynamisch: rechts immer genug Platz für das längste Schattenende.
export function weltBereich(werte, zustand) {
  const xe = zustand && isFinite(zustand.xeLinks) ? zustand.xeLinks : 0;
  return { xMin: -1, xMax: Math.max(6, xe + 0.5), yMin: 0, yMax: 3.2 };
}

// Endpunkt eines Randstrahls für die Zeichnung: normalerweise der Bodentreffpunkt,
// im ∞-Fall (hS ≥ hQ) der Schnitt mit dem rechten bzw. oberen Bildrand.
function strahlEnde(xq, p, bereich) {
  const xe = schattenEnde(xq, p);
  if (isFinite(xe)) return { x: xe, y: 0 };
  const dx = p.a - xq;
  const dy = p.hS - p.hQ; // ≥ 0: Strahl läuft waagerecht oder steigt
  if (dx <= 1e-9) return { x: xq, y: bereich.yMax };
  const yAmRand = p.hQ + (bereich.xMax - xq) / dx * dy;
  if (yAmRand <= bereich.yMax) return { x: bereich.xMax, y: yAmRand };
  const t = (bereich.yMax - p.hQ) / dy;
  return { x: xq + t * dx, y: bereich.yMax };
}

export function zeichne({ ctx, welt, werte: p, zustand: z, stil }) {
  const b = welt.bereich;
  const beamer = stil.linienstaerke >= 4;
  const bandH = beamer ? 12 : 8;       // Pixelhöhe der Schattenbänder auf dem Boden
  const rowGap = beamer ? 24 : 18;
  const yBoden = welt.py(0);
  const lampen = p.dQ > 0
    ? [{ x: -p.dQ / 2, name: "Lampe 1" }, { x: +p.dQ / 2, name: "Lampe 2" }]
    : [{ x: 0, name: "Lampe" }];

  // --- Schattenbereiche auf dem Boden (zuerst, alles Weitere liegt darüber) ---
  ctx.save();
  ctx.fillStyle = stil.text;
  if (z.unendlich) {
    ctx.globalAlpha = 0.5;
    ctx.fillRect(welt.px(p.a), yBoden - bandH, welt.px(b.xMax) - welt.px(p.a), bandH);
  } else {
    ctx.globalAlpha = 0.5;  // Kernschatten kräftig
    ctx.fillRect(welt.px(p.a), yBoden - bandH, Math.max(0, welt.px(z.xeRechts) - welt.px(p.a)), bandH);
    if (z.halb > 1e-9) {
      ctx.globalAlpha = 0.18; // Halbschatten halbtransparent
      ctx.fillRect(welt.px(z.xeRechts), yBoden - bandH, welt.px(z.xeLinks) - welt.px(z.xeRechts), bandH);
    }
  }
  ctx.restore();

  // --- Randstrahlen: von jeder Lampe über die Stabspitze bis zum Boden (gestrichelt) ---
  ctx.save();
  ctx.strokeStyle = stil.akzent;
  ctx.lineWidth = stil.linienstaerke;
  ctx.setLineDash([7, 5]);
  lampen.forEach(l => {
    const ende = strahlEnde(l.x, p, b);
    ctx.beginPath();
    ctx.moveTo(welt.px(l.x), welt.py(p.hQ));
    ctx.lineTo(welt.px(ende.x), welt.py(ende.y));
    ctx.stroke();
  });
  ctx.restore();

  // --- Boden ---
  ctx.strokeStyle = stil.text;
  ctx.lineWidth = stil.linienstaerke;
  ctx.beginPath();
  ctx.moveTo(welt.px(b.xMin), yBoden);
  ctx.lineTo(welt.px(b.xMax), yBoden);
  ctx.stroke();

  // --- Stab ---
  ctx.strokeStyle = stil.text;
  ctx.lineWidth = stil.linienstaerke + 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(welt.px(p.a), yBoden);
  ctx.lineTo(welt.px(p.a), welt.py(p.hS));
  ctx.stroke();
  ctx.lineCap = "butt";
  ctx.fillStyle = stil.text;
  ctx.font = stil.schrift;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("Stab", welt.px(p.a) + 8, welt.py(p.hS / 2));

  // --- Lampe(n): Kreis mit kleinen Strahlen-Ticks und Beschriftung ---
  lampen.forEach((l, i) => {
    const lx = welt.px(l.x);
    const ly = welt.py(p.hQ);
    ctx.fillStyle = stil.akzent;
    ctx.beginPath();
    ctx.arc(lx, ly, beamer ? 9 : 7, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = stil.akzent;
    ctx.lineWidth = Math.max(1.5, stil.linienstaerke - 1);
    [[0, -1], [-1, 0], [-0.7, -0.7], [-0.7, 0.7]].forEach(([rx, ry]) => {
      ctx.beginPath();
      ctx.moveTo(lx + rx * 11, ly + ry * 11);
      ctx.lineTo(lx + rx * 17, ly + ry * 17);
      ctx.stroke();
    });
    // Lampe 1 oberhalb, Lampe 2 unterhalb beschriften (bei kleinem dQ keine Überlappung)
    ctx.fillStyle = stil.text;
    ctx.textAlign = "center";
    ctx.fillText(l.name, lx, ly + (i === 1 ? +1 : -1) * (beamer ? 30 : 24));
  });

  // --- Beschriftung der Schattenbereiche (nie nur Farbe!) ---
  ctx.fillStyle = stil.text;
  ctx.textBaseline = "alphabetic";
  if (z.unendlich) {
    ctx.font = "bold " + stil.schrift;
    ctx.textAlign = "left";
    ctx.fillText("Schatten endet nie (∞)", welt.px(p.a) + 10, yBoden - bandH - 6);
    ctx.fillStyle = stil.fehler;
    ctx.font = stil.schrift;
    ctx.fillText("Der Stab ist mindestens so hoch wie die Lampe:", welt.px(b.xMin) + 8, welt.py(b.yMax) + 16);
    ctx.fillText("Kein Randstrahl erreicht den Boden — der Schatten endet nie.", welt.px(b.xMin) + 8, welt.py(b.yMax) + 16 + rowGap);
  } else {
    ctx.font = stil.schrift;
    ctx.textAlign = "center";
    if (z.kern > 0.02) {
      ctx.fillText(p.dQ > 0 ? "Kernschatten" : "Schatten",
        (welt.px(p.a) + welt.px(z.xeRechts)) / 2, yBoden - bandH - 6);
    }
    if (z.halb > 1e-9) {
      const xm = (welt.px(z.xeRechts) + welt.px(z.xeLinks)) / 2;
      ctx.fillText("Halbschatten", xm, yBoden - bandH - 6 - rowGap);
      ctx.strokeStyle = stil.beschriftung;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(xm, yBoden - bandH - rowGap - 2);
      ctx.lineTo(xm, yBoden - bandH / 2);
      ctx.stroke();
    }
  }
}

// ---------- Prüffälle (Strahlensatz, analytisch exakt nachgerechnet) ----------
// xe = xq + (a − xq) · hQ / (hQ − hS)
// Fall 1: xq = 0:    xe = 2 · 2/1 = 4      → Kern 2,0 · Halb 0 · Ende 4,0
// Fall 2: xq = 0:    xe = 2 · 3/2 = 3      → Kern 1,0 · Halb 0 · Ende 3,0
// Fall 3: xq = ±0,4: rechts 0,4 + 1,6 · 2 = 3,6 · links −0,4 + 2,4 · 2 = 4,4
//                                           → Kern 1,6 · Halb 0,8 · Ende 4,4

export const pruefFaelle = [
  {
    name: "Eine Lampe: hQ = 2 m, a = 2 m, hS = 1 m",
    parameter: { hQ: 2, a: 2, hS: 1, dQ: 0 },
    toleranzProzent: 0.2,
    soll: { kern_laenge: 2.0, halb_zusatz: 0, schattenende_max: 4.0 }
  },
  {
    name: "Lampe höher: hQ = 3 m, a = 2 m, hS = 1 m",
    parameter: { hQ: 3, a: 2, hS: 1, dQ: 0 },
    toleranzProzent: 0.2,
    soll: { kern_laenge: 1.0, halb_zusatz: 0, schattenende_max: 3.0 }
  },
  {
    name: "Zwei Lampen: hQ = 2 m, a = 2 m, hS = 1 m, dQ = 0,8 m",
    parameter: { hQ: 2, a: 2, hS: 1, dQ: 0.8 },
    toleranzProzent: 0.2,
    soll: { kern_laenge: 1.6, halb_zusatz: 0.8, schattenende_max: 4.4 }
  }
];
