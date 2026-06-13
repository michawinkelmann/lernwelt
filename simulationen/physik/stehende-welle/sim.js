// Stehende Welle — Überlagerung zweier gegenläufiger harmonischer Wellen auf einem
// Seil der Länge L = 4 m mit festem Ende bei x = 0 (Wand links).
//
// Modell (SI-Einheiten): Die zur Wand (nach links) laufende Welle
//   y2(x,t) = −A·sin(ωt + kx)
// wird am festen Ende mit Phasensprung π reflektiert (ein Berg kommt als Tal
// zurück) und läuft als
//   y1(x,t) = +A·sin(ωt − kx)
// nach rechts. Kontrolle am festen Ende: y1(0,t) + y2(0,t) = A·sin(ωt) − A·sin(ωt) = 0 —
// bei x = 0 liegt also zu jedem Zeitpunkt ein Knoten, wie es die Wand erzwingt.
// Die Summe folgt aus dem Additionstheorem sin a − sin b = 2·cos((a+b)/2)·sin((a−b)/2)
// mit a = ωt − kx und b = ωt + kx:
//   y(x,t) = y1 + y2 = −2A · cos(ωt) · sin(kx)
// Orts- und Zeitanteil sind entkoppelt: sin(kx) legt das ortsfeste Muster fest
// (Knoten bei x = n·λ/2, dazwischen Bäuche mit Amplitude 2A), cos(ωt) den
// gemeinsamen Takt aller Punkte. Dabei gilt ω = 2π·f, k = 2π/λ, λ = c/f, T = 1/f.
// Der Zustand ist rein analytisch (nur die Modellzeit läuft) — gezeigt wird der
// eingeschwungene Zustand; y1, y2 und die Summe werden direkt aus den Formeln
// gezeichnet. Nach T_ENDE = 12 s endet ein Durchlauf (Bilanz + Headless-Ende).

const L = 4;        // Seillänge in m (feste Darstellungsgröße)
const T_ENDE = 12;  // Laufzeit in s; danach zeigt die Bilanz die Kenngrößen

function wellenlaenge(p) {
  return p.c / p.f; // λ = c/f
}

// Knoten liegen bei x = n·λ/2 innerhalb [0; L], inklusive festes Ende x = 0:
// Anzahl = floor(L / (λ/2)) + 1 (das Epsilon fängt Gleitkommareste ab)
function knotenZahl(p) {
  return Math.floor(L / (wellenlaenge(p) / 2) + 1e-9) + 1;
}

export const manifest = {
  id: "physik/stehende-welle",
  titel: "Stehende Welle",
  modus: "kontinuierlich",
  dt: 1 / 240,
  tMax: 15,
  welt: { xMin: -0.25, xMax: 4.25, yMin: -0.85, yMax: 0.85 },
  parameter: [
    { id: "amp", label: "Amplitude",                   einheit: "cm",  min: 5,   max: 30, schritt: 1,   start: 20 },
    { id: "f",   label: "Frequenz",                    einheit: "Hz",  min: 0.5, max: 3,  schritt: 0.1, start: 1 },
    { id: "c",   label: "Ausbreitungsgeschwindigkeit", einheit: "m/s", min: 1,   max: 4,  schritt: 0.5, start: 2 }
  ],
  anzeigen: [
    { id: "t",             label: "Zeit",                einheit: "s", stellen: 2 },
    { id: "lambda",        label: "Wellenlänge λ",       einheit: "m", stellen: 2 },
    { id: "T",             label: "Periodendauer",       einheit: "s", stellen: 2 },
    { id: "knotenabstand", label: "Knotenabstand λ/2",   einheit: "m", stellen: 2 },
    { id: "anzKnoten",     label: "Knoten auf dem Seil", einheit: "",  stellen: 0 }
  ],
  presets: [
    { name: "Grundbild",    werte: { amp: 20, f: 1,   c: 2 } },
    { name: "kurze Wellen", werte: { amp: 20, f: 2,   c: 2 } },
    { name: "lange Wellen", werte: { amp: 20, f: 0.5, c: 3 } }
  ],
  vorhersage: {
    frage: "Zwei gegenläufige Wellen überlagern sich — kann dabei etwas dauerhaft STILLstehen?",
    optionen: [
      "Nein — das Seil bewegt sich überall, nur eben unregelmäßiger als bei einer einzelnen Welle",
      "Ja — einzelne Punkte stehen dauerhaft still, dazwischen schwingt das Seil besonders stark",
      "Ja — das ganze Seil kommt zur Ruhe, weil sich die Wellen überall gegenseitig auslöschen"
    ],
    aufloesung: "Die zweite Antwort stimmt. An den Knoten heben sich die beiden Gegenläufer zu jedem Zeitpunkt exakt auf — diese Punkte bleiben dauerhaft in Ruhe, und zwar im festen Abstand λ/2. Genau dazwischen liegen die Bäuche: Dort treffen die Wellen im Gleichtakt ein, das Seil schwingt mit der doppelten Amplitude 2A. Vollständig zur Ruhe (dritte Antwort) kommt das Seil nie — die Energie der Wellen verschwindet nicht, sie steckt abwechselnd in Auslenkung und Bewegung."
  },
  beobachtung: [
    "Zähle die markierten Knoten auf dem Seil und miss ihren Abstand mit dem Lineal oder am Meterraster nach. Vergleiche mit der Anzeige „Knotenabstand λ/2“ und rechne nach: λ = c/f — beim „Grundbild“ also λ = 2 m und Knotenabstand 1 m.",
    "Verdopple die Frequenz bei gleicher Ausbreitungsgeschwindigkeit (Preset „kurze Wellen“): Die Wellenlänge halbiert sich. Was passiert mit der Zahl der Knoten? Sage es erst voraus, zähle dann nach — und prüfe zum Schluss das Preset „lange Wellen“.",
    "Passe den Moment ab, in dem das Seil ganz gerade ist (Tempo 0,25× und Einzelschritt helfen). Verschwunden ist die Welle dann nicht — wo steckt da die Bewegung? Beobachte direkt danach: In diesem Augenblick sind alle Punkte gerade mit maximaler Geschwindigkeit unterwegs.",
    "Suche die Bäuche: An welchen Stellen schwingt das Seil mit der doppelten Amplitude 2A? Vergleiche mit der hauchzarten Einhüllenden und miss nach: Die Bäuche liegen genau in der Mitte zwischen zwei Knoten — vom Knoten zum nächsten Bauch ist es λ/4."
  ],
  modellgrenzen: "Gezeigt wird der eingeschwungene Zustand: Beide Teilwellen erfüllen das Seil von Anfang an in voller Länge. Die Reflexion am festen Ende ist ideal — Phasensprung ohne jeden Energieverlust, keine Dämpfung; das rechte Seilende denkt man sich vom Erreger geführt, nur das linke Ende ist fest. Einschwingvorgänge und die Resonanzbedingung eines beidseitig eingespannten Seils (nur passende Frequenzen ergeben dort stabile stehende Wellen) bildet das Modell nicht ab.",
  bilanz: {
    lambda:        { label: "Wellenlänge λ",       einheit: "m", stellen: 2 },
    T:             { label: "Periodendauer T",     einheit: "s", stellen: 2 },
    knotenabstand: { label: "Knotenabstand λ/2",   einheit: "m", stellen: 2 },
    anzKnoten:     { label: "Knoten auf dem Seil", einheit: "",  stellen: 0 }
  }
};

export function init() {
  return { t: 0, fertig: false };
}

// Die Überlagerung ist analytisch bekannt — der Zeitschritt bewegt nur die
// Modellzeit. Der letzte Teilschritt wird exakt auf T_ENDE gekappt.
export function update(z, p, dt) {
  if (z.fertig) return;
  z.t += dt;
  if (z.t >= T_ENDE - 1e-9) {
    z.t = T_ENDE;
    z.fertig = true;
  }
}

export function messwerte(z, p) {
  const lambda = wellenlaenge(p);
  return {
    t: z.t,
    lambda,
    T: 1 / p.f,
    knotenabstand: lambda / 2,
    anzKnoten: knotenZahl(p)
  };
}

export function istFertig(z) { return z.fertig; }

// Bilanz = ortsfeste Kenngrößen der stehenden Welle (zeitunabhängig, deterministisch)
export function bilanz(z, p) {
  const lambda = wellenlaenge(p);
  return {
    lambda,
    T: 1 / p.f,
    knotenabstand: lambda / 2,
    anzKnoten: knotenZahl(p)
  };
}

// Kurve y(x) als Polylinie über die Seillänge zeichnen (N gleichmäßige Stützstellen)
function zeichneKurve(ctx, welt, fn) {
  const N = 400;
  ctx.beginPath();
  for (let i = 0; i <= N; i++) {
    const x = L * i / N;
    if (i === 0) ctx.moveTo(welt.px(x), welt.py(fn(x)));
    else ctx.lineTo(welt.px(x), welt.py(fn(x)));
  }
  ctx.stroke();
}

export function zeichne({ ctx, welt, zustand: z, werte: p, stil }) {
  const A = p.amp / 100;               // Amplitude: cm → m
  const lambda = wellenlaenge(p);
  const k = 2 * Math.PI / lambda;
  const wt = 2 * Math.PI * p.f * z.t;  // ω·t
  const halb = lambda / 2;
  const knotenRadius = Math.max(3.5, stil.linienstaerke + 1.5);
  // Fachfarbe für die Summenkurve (Fallback: Seitenakzent)
  const farbeSumme = (getComputedStyle(document.documentElement).getPropertyValue("--physik") || "").trim() || stil.akzent;

  const y1 = x => A * Math.sin(wt - k * x);   // reflektierte Welle, läuft nach rechts
  const y2 = x => -A * Math.sin(wt + k * x);  // hinlaufende Welle, läuft nach links zur Wand

  ctx.save();
  ctx.font = stil.schrift;

  // Ruhelage des Seils
  ctx.strokeStyle = stil.beschriftung;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 5]);
  ctx.beginPath();
  ctx.moveTo(welt.px(0), welt.py(0));
  ctx.lineTo(welt.px(L), welt.py(0));
  ctx.stroke();
  ctx.setLineDash([]);

  // Einhüllende ±2A·sin(kx): hauchzarte Grenzkurven, innerhalb derer das Seil schwingt
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = stil.beschriftung;
  ctx.lineWidth = 1;
  zeichneKurve(ctx, welt, x => 2 * A * Math.sin(k * x));
  zeichneKurve(ctx, welt, x => -2 * A * Math.sin(k * x));
  ctx.restore();

  // Teilwellen dünn und gestrichelt (zwei unterschiedliche Strichmuster)
  ctx.strokeStyle = stil.beschriftung;
  ctx.lineWidth = 1;
  ctx.setLineDash([7, 5]);
  zeichneKurve(ctx, welt, y1);
  ctx.setLineDash([2, 4]);
  zeichneKurve(ctx, welt, y2);
  ctx.setLineDash([]);

  // Summe y1 + y2 = stehende Welle: kräftig in der Fachfarbe
  ctx.strokeStyle = farbeSumme;
  ctx.lineWidth = stil.linienstaerke + 1;
  ctx.lineJoin = "round";
  zeichneKurve(ctx, welt, x => y1(x) + y2(x));

  // Knotenpunkte markieren: x = n·λ/2 (inklusive festes Ende x = 0)
  ctx.fillStyle = stil.text;
  const anzahl = knotenZahl(p);
  for (let n = 0; n < anzahl; n++) {
    const xK = Math.min(L, n * halb);
    ctx.beginPath();
    ctx.arc(welt.px(xK), welt.py(0), knotenRadius, 0, 2 * Math.PI);
    ctx.fill();
  }

  // Festes Ende: Wand mit Schraffur bei x = 0
  const wandHoehe = 0.8;
  ctx.strokeStyle = stil.text;
  ctx.lineWidth = stil.linienstaerke;
  ctx.beginPath();
  ctx.moveTo(welt.px(0), welt.py(-wandHoehe));
  ctx.lineTo(welt.px(0), welt.py(wandHoehe));
  ctx.stroke();
  ctx.strokeStyle = stil.beschriftung;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let yW = -wandHoehe + 0.02; yW <= wandHoehe - 0.1; yW += 0.12) {
    ctx.moveTo(welt.px(0), welt.py(yW));
    ctx.lineTo(welt.px(-0.11), welt.py(yW + 0.08));
  }
  ctx.stroke();
  ctx.fillStyle = stil.beschriftung;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("festes Ende", welt.px(0.06), welt.py(-0.74));

  // Legende oben links (Pixelkoordinaten, unabhängig vom Weltmaßstab)
  const zeilenhoehe = stil.linienstaerke >= 4 ? 24 : 17;
  const lx = welt.px(welt.bereich.xMin) + 8;
  let ly = 14;
  const eintraege = [
    { muster: [2, 4], farbe: stil.beschriftung, staerke: 1,                      text: "Welle nach links (zur Wand)" },
    { muster: [7, 5], farbe: stil.beschriftung, staerke: 1,                      text: "reflektierte Welle nach rechts" },
    { muster: [],     farbe: farbeSumme,        staerke: stil.linienstaerke + 1, text: "Summe: stehende Welle" }
  ];
  eintraege.forEach(e => {
    ctx.strokeStyle = e.farbe;
    ctx.lineWidth = e.staerke;
    ctx.setLineDash(e.muster);
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(lx + 34, ly);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = stil.text;
    ctx.fillText(e.text, lx + 42, ly);
    ly += zeilenhoehe;
  });
  ctx.fillStyle = stil.text;
  ctx.beginPath();
  ctx.arc(lx + 17, ly, knotenRadius, 0, 2 * Math.PI);
  ctx.fill();
  ctx.fillText("Knoten (bleiben in Ruhe)", lx + 42, ly);

  ctx.restore();
}

// ---------- Prüffälle (analytisch: λ = c/f, T = 1/f, Knoten bei x = n·λ/2) ----------
// anzKnoten = floor(L / (λ/2)) + 1 mit L = 4 m, das feste Ende x = 0 zählt mit.

export const pruefFaelle = [
  {
    name: "Grundbild: f = 1 Hz, c = 2 m/s → λ = 2 m",
    parameter: { amp: 20, f: 1, c: 2 },
    toleranzProzent: 0.5,
    soll: { lambda: 2, T: 1, knotenabstand: 1, anzKnoten: 5 }
  },
  {
    name: "Kurze Wellen: f = 2 Hz, c = 2 m/s → λ = 1 m",
    parameter: { amp: 20, f: 2, c: 2 },
    toleranzProzent: 0.5,
    soll: { lambda: 1, knotenabstand: 0.5, anzKnoten: 9 }
  },
  {
    name: "Lange Wellen: f = 0,5 Hz, c = 3 m/s → λ = 6 m",
    parameter: { amp: 20, f: 0.5, c: 3 },
    toleranzProzent: 0.5,
    soll: { lambda: 6, knotenabstand: 3, anzKnoten: 2 }
  }
];
