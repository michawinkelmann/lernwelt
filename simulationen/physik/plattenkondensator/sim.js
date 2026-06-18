// Plattenkondensator — Ablenkung eines Elektrons im homogenen Querfeld.
// Modell: konstante Kraft nur zwischen den Platten (Randfelder vernachlässigt),
// Verlet-Form (bei konstanter Kraft exakt), Schirmauftreffen per Interpolation.
// Zeitskala: Nanosekunden — die Engine läuft mit Zeitraffung (manifest.zeitRaffung).

const EM = 1.75882e11;   // spezifische Ladung e/m des Elektrons in C/kg
const L = 0.08;          // Plattenlänge in m (fest)
const S = 0.12;          // Abstand Plattenende → Schirm in m (fest)
const X_SCHIRM = L + S;

export const manifest = {
  id: "physik/plattenkondensator",
  titel: "Plattenkondensator: Ablenkung von Elektronen",
  modus: "kontinuierlich",
  dt: 5e-12,
  tMax: 1e-6,
  zeitRaffung: 2e-9,      // 2 ns Modellzeit pro Echtzeitsekunde (bei Tempo 1×)
  schrittweite: 2.5e-10,  // Einzelschritt: 0,25 ns
  parameter: [
    { id: "ub", label: "Beschleunigungsspannung U₀", einheit: "V",  min: 500, max: 5000, schritt: 50,  start: 2000 },
    { id: "ua", label: "Ablenkspannung Uₐ",          einheit: "V",  min: -300, max: 300, schritt: 10,  start: 100 },
    { id: "d",  label: "Plattenabstand d",                einheit: "cm", min: 2,    max: 10,  schritt: 0.5, start: 4 }
  ],
  anzeigen: [
    { id: "t", label: "Zeit",            einheit: "ns",   stellen: 2, faktor: 1e9 },
    { id: "x", label: "Weite",           einheit: "cm",   stellen: 1, faktor: 100 },
    { id: "y", label: "Ablenkung",       einheit: "mm",   stellen: 2, faktor: 1000 },
    { id: "v", label: "Geschwindigkeit", einheit: "km/s", stellen: 0, faktor: 1e-3 }
  ],
  diagramme: [
    { x: "x", y: "y", titel: "Bahnkurve y(x)" },
    { x: "t", y: "y", titel: "Ablenkung über Zeit" }
  ],
  presets: [
    { name: "Standard",          werte: { ub: 2000, ua: 100,  d: 4 } },
    { name: "Starke Ablenkung",  werte: { ub: 1000, ua: 200,  d: 5 } },
    { name: "Negative Spannung", werte: { ub: 4000, ua: -150, d: 3 } }
  ],
  vorhersage: {
    frage: "Du verdoppelst die Beschleunigungsspannung U₀ (alles andere bleibt gleich). Was passiert mit der Ablenkung am Schirm?",
    optionen: ["Sie halbiert sich", "Sie bleibt gleich", "Sie verdoppelt sich"],
    aufloesung: "Sie halbiert sich: Schnellere Elektronen verbringen weniger Zeit im Feld, die Querbeschleunigung wirkt kürzer. Es gilt y ∝ Uₐ/(U₀·d) — die Elektronenmasse kürzt sich vollständig heraus!"
  },
  beobachtung: [
    "Verdopple die Ablenkspannung Uₐ. Ist die Ablenkung am Schirm proportional zu Uₐ? Miss nach!",
    "Halte Uₐ fest und miss die Schirmablenkung für U₀ = 1000, 2000, 4000 V. Welcher Zusammenhang zeigt sich?",
    "Halbiere den Plattenabstand d. Warum wächst die Ablenkung, obwohl die Spannung gleich bleibt?",
    "Finde Einstellungen, bei denen das Elektron die Platte trifft. Wovon hängt das ab?"
  ],
  modellgrenzen: "Homogenes Feld nur zwischen den Platten (Randfelder vernachlässigt), Elektron als Punktladung, keine Gravitation, nicht-relativistische Rechnung. Positive Ablenkspannung lenkt das Elektron nach oben ab. Plattenlänge 8 cm und Schirmabstand 12 cm sind fest.",
  bilanz: {
    ablenkung: { label: "Ablenkung am Schirm", einheit: "mm", stellen: 2, faktor: 1000 },
    winkel:    { label: "Ablenkwinkel",        einheit: "°",  stellen: 2 },
    flugzeit:  { label: "Flugzeit",            einheit: "ns", stellen: 2, faktor: 1e9 }
  }
};

export function init(p) {
  const v0 = Math.sqrt(2 * EM * p.ub);
  return {
    t: 0, x: 0, y: 0,
    vx: v0, vy: 0,
    spur: [[0, 0]],
    fertig: false, plattenkontakt: false,
    ablenkung: 0, winkel: 0, flugzeit: 0
  };
}

// Teilschritt mit konstanter Beschleunigung (Verlet-Form: exakt)
function teilSchritt(z, ay, dauer) {
  const vyAlt = z.vy;
  z.vy += ay * dauer;
  z.y += (vyAlt + z.vy) / 2 * dauer;
  z.x += z.vx * dauer;
  z.t += dauer;
}

export function update(z, p, dt) {
  if (z.fertig) return;
  const dM = p.d / 100;
  const xAlt = z.x, yAlt = z.y;
  const ay = EM * p.ua / dM;
  // Liegt die Plattenkante x = L im Schritt, wird er dort exakt geteilt —
  // dadurch ist das Ergebnis unabhängig von der Schrittweite korrekt.
  const xNeu = z.x + z.vx * dt;
  if (z.x < L && xNeu > L) {
    const tau = (L - z.x) / z.vx;
    teilSchritt(z, ay, tau);
    teilSchritt(z, 0, dt - tau);
  } else {
    teilSchritt(z, z.x < L ? ay : 0, dt);
  }

  // Plattenkontakt?
  if (z.x <= L && Math.abs(z.y) >= dM / 2) {
    z.y = Math.sign(z.y) * dM / 2;
    abschliessen(z);
    return;
  }
  // Schirm erreicht? (vx konstant → exakte Interpolation)
  if (z.x >= X_SCHIRM) {
    const anteil = (X_SCHIRM - xAlt) / (z.x - xAlt);
    z.t = z.t - dt + anteil * dt;
    z.y = yAlt + (z.y - yAlt) * anteil;
    z.x = X_SCHIRM;
    abschliessen(z);
    return;
  }
  if (z.spur.length < 4000) z.spur.push([z.x, z.y]);
}

function abschliessen(z) {
  z.fertig = true;
  z.ablenkung = z.y;
  z.winkel = Math.atan2(z.vy, z.vx) * 180 / Math.PI;
  z.flugzeit = z.t;
  z.spur.push([z.x, z.y]);
}

export function messwerte(z) {
  return { t: z.t, x: z.x, y: z.y, v: Math.hypot(z.vx, z.vy) };
}

export function istFertig(z) { return z.fertig; }

export function bilanz(z) {
  return { ablenkung: z.ablenkung, winkel: z.winkel, flugzeit: z.flugzeit };
}

export function weltBereich(p) {
  const halb = Math.max((p.d / 100) / 2 * 1.5, 0.02);
  return { xMin: -0.018, xMax: X_SCHIRM + 0.012, yMin: -halb, yMax: halb };
}

export function zeichne({ ctx, welt, zustand: z, werte: p, stil }) {
  const dM = p.d / 100;
  const dicke = 0.004;

  // Elektronenkanone (angedeutet)
  ctx.fillStyle = stil.beschriftung;
  ctx.fillRect(welt.px(-0.016), welt.py(0) - 6, welt.laenge(0.014), 12);

  // Platten mit Polarität (positive U_a: obere Platte +)
  ctx.fillStyle = stil.text;
  ctx.fillRect(welt.px(0), welt.py(dM / 2 + dicke), welt.laenge(L), welt.laenge(dicke));
  ctx.fillRect(welt.px(0), welt.py(-dM / 2), welt.laenge(L), welt.laenge(dicke));
  if (p.ua !== 0) {
    ctx.font = stil.schrift;
    ctx.fillStyle = stil.akzent;
    ctx.textAlign = "center";
    ctx.fillText(p.ua > 0 ? "+" : "−", welt.px(L / 2), welt.py(dM / 2 + dicke) - 6);
    ctx.fillText(p.ua > 0 ? "−" : "+", welt.px(L / 2), welt.py(-dM / 2) + welt.laenge(dicke) + 14);
    // Feldlinien (Richtung: von + nach −)
    ctx.strokeStyle = stil.beschriftung;
    ctx.lineWidth = 1;
    for (const fx of [0.2, 0.4, 0.6, 0.8]) {
      const xPix = welt.px(fx * L);
      const von = p.ua > 0 ? welt.py(dM / 2) : welt.py(-dM / 2);
      const nach = p.ua > 0 ? welt.py(-dM / 2) : welt.py(dM / 2);
      ctx.beginPath(); ctx.moveTo(xPix, von); ctx.lineTo(xPix, nach); ctx.stroke();
      const richtung = Math.sign(nach - von);
      ctx.beginPath();
      ctx.moveTo(xPix, (von + nach) / 2 + 5 * richtung);
      ctx.lineTo(xPix - 4, (von + nach) / 2 - 3 * richtung);
      ctx.lineTo(xPix + 4, (von + nach) / 2 - 3 * richtung);
      ctx.closePath(); ctx.fill();
    }
  }

  // Schirm
  ctx.strokeStyle = stil.text;
  ctx.lineWidth = stil.linienstaerke + 1;
  ctx.beginPath();
  ctx.moveTo(welt.px(X_SCHIRM), welt.py(welt.bereich.yMin * 0.9));
  ctx.lineTo(welt.px(X_SCHIRM), welt.py(welt.bereich.yMax * 0.9));
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

  // Elektron + Auftreffpunkt
  ctx.fillStyle = stil.akzent;
  ctx.beginPath();
  ctx.arc(welt.px(z.x), welt.py(z.y), Math.max(4, stil.linienstaerke * 2.5), 0, 2 * Math.PI);
  ctx.fill();
  if (z.fertig) {
    ctx.fillStyle = z.plattenkontakt ? stil.fehler : stil.ok;
    ctx.beginPath();
    ctx.arc(welt.px(z.x), welt.py(z.y), Math.max(6, stil.linienstaerke * 3), 0, 2 * Math.PI);
    ctx.stroke();
    if (Math.abs(z.x - X_SCHIRM) < 1e-9) {
      ctx.font = stil.schrift;
      ctx.textAlign = "left";
      ctx.fillStyle = stil.ok;
      ctx.fillText("Auftreffpunkt", welt.px(X_SCHIRM) + 6, welt.py(z.y));
    }
  }
}

// ---------- Prüffälle ----------
// Analytisch (e/m kürzt sich): y_Schirm = U_a·L·(L/2 + s) / (2·U_0·d)
// tan(θ) = U_a·L / (2·U_0·d),  t = (L+s)/v0 mit v0 = √(2·(e/m)·U_0)

export const pruefFaelle = [
  {
    name: "U₀ = 2000 V, Uₐ = 100 V, d = 4 cm",
    parameter: { ub: 2000, ua: 100, d: 4 },
    toleranzProzent: 0.5,
    soll: { ablenkung: 8.0e-3, winkel: 2.8624, flugzeit: 7.5403e-9 }
  },
  {
    name: "U₀ = 1000 V, Uₐ = 200 V, d = 5 cm",
    parameter: { ub: 1000, ua: 200, d: 5 },
    toleranzProzent: 0.5,
    soll: { ablenkung: 25.6e-3, winkel: 9.0903, flugzeit: 1.06636e-8 }
  },
  {
    name: "U₀ = 4000 V, Uₐ = −150 V, d = 3 cm",
    parameter: { ub: 4000, ua: -150, d: 3 },
    toleranzProzent: 0.5,
    soll: { ablenkung: -8.0e-3, winkel: -2.8624, flugzeit: 5.3318e-9 }
  }
];
