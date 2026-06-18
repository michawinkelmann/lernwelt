// Bewegter Leiter im Magnetfeld (Leiterschaukel) — Bewegungsinduktion beim
// Durchqueren einer begrenzten Feldzone. Modell: Ein Leiterstab (Länge l) gleitet
// mit konstanter Geschwindigkeit v auf Schienen; die homogene Feldzone reicht von
// x = 0 bis x = L_FELD = 1 m (B senkrecht zur Leiterebene, in die Zeichenebene).
// Vom Leiterkreis eingeschlossene Feld-Fläche A = l·x (für 0 ≤ x ≤ L_FELD, danach
// konstant l·L_FELD), Fluss Φ = B·A. Betrag der Induktionsspannung |U_ind| = B·l·v,
// solange der Stab in der Feldzone ist, sonst 0 — Vorzeichen und Polung
// (lenzsche Regel) behandelt die Themenseite.

const L_FELD = 1;      // Breite der Feldzone in m (fest)
const X_START = -0.3;  // Startposition des Stabs (Anlauf vor der Feldzone)
const X_ENDE = 1.3;    // Endposition des Stabs (Auslauf hinter der Feldzone)

export const manifest = {
  id: "physik/leiterschaukel",
  titel: "Bewegter Leiter im Magnetfeld",
  modus: "kontinuierlich",
  dt: 1 / 240,
  tMax: 30,
  schrittweite: 0.05,
  parameter: [
    { id: "B", label: "Flussdichte",     einheit: "T",   min: 0.1, max: 1,   schritt: 0.05, start: 0.5 },
    { id: "l", label: "Leiterlänge",     einheit: "m",   min: 0.1, max: 0.5, schritt: 0.05, start: 0.2 },
    { id: "v", label: "Geschwindigkeit", einheit: "m/s", min: 0.1, max: 2,   schritt: 0.1,  start: 1 }
  ],
  anzeigen: [
    { id: "t",   label: "Zeit",     einheit: "s",   stellen: 2 },
    { id: "x",   label: "Position", einheit: "m",   stellen: 2 },
    { id: "phi", label: "Fluss Φ",  einheit: "mWb", stellen: 2, faktor: 1000 },
    { id: "u",   label: "U_ind",    einheit: "mV",  stellen: 1, faktor: 1000 }
  ],
  diagramme: [
    { x: "t", y: "phi", titel: "Fluss Φ über der Zeit" },
    { x: "t", y: "u",   titel: "Induktionsspannung über der Zeit" }
  ],
  presets: [
    { name: "Standard",                 werte: { B: 0.5, l: 0.2, v: 1 } },
    { name: "Doppelte Geschwindigkeit", werte: { B: 0.5, l: 0.2, v: 2 } },
    { name: "Starkes Feld",             werte: { B: 1,   l: 0.2, v: 1 } },
    { name: "Langsam",                  werte: { B: 0.5, l: 0.2, v: 0.2 } }
  ],
  vorhersage: {
    frage: "Die Geschwindigkeit v wird verdoppelt. Was passiert mit der Induktionsspannung U_ind — und mit der Zeit, die der Stab in der Feldzone verbringt?",
    optionen: [
      "U_ind verdoppelt sich, die Zeit halbiert sich",
      "U_ind bleibt gleich, nur die Zeit halbiert sich",
      "Beides verdoppelt sich"
    ],
    aufloesung: "U_ind = B·l·v verdoppelt sich, die Zeit in der Feldzone (1 m geteilt durch v) halbiert sich. Das Produkt aus beidem — die Fläche unter dem U-t-Graphen, der „Spannungsstoß“ — bleibt dabei exakt gleich: Sie ist die gesamte Flussänderung ΔΦ = B·l·1 m, und die hängt nicht von v ab."
  },
  beobachtung: [
    "Starte das Preset „Standard“ und verfolge das U-t-Diagramm: Wann springt die Spannung hoch, wann fällt sie auf null zurück? Vergleiche mit der Position des Stabs auf der Zeichenfläche.",
    "Vergleiche „Standard“ und „Doppelte Geschwindigkeit“: Das Rechteck im U-t-Diagramm wird doppelt so hoch, aber nur halb so breit. Schätze jeweils die Fläche unter dem Graphen (Höhe mal Breite) ab — ist sie gleich? Diese Fläche heißt Spannungsstoß und ist genau ΔΦ = Φ_max.",
    "Prüfe die Formel U = B·l·v: Stelle drei verschiedene Kombinationen ein und vergleiche den angezeigten Wert mit deiner Rechnung (Achtung: Anzeige in mV).",
    "Betrachte das Φ-t-Diagramm: Warum wächst der Fluss linear an, solange der Stab in der Feldzone ist, und bleibt danach konstant? Wo „steckt“ die Spannung in diesem Graphen? (Tipp: Steigung)"
  ],
  modellgrenzen: "Scharf begrenzte, homogene Feldzone (reale Felder fallen am Rand allmählich ab). Angezeigt wird der Betrag der Spannung — Vorzeichen und Polung (lenzsche Regel) erklärt die Themenseite. Der Kreis ist widerstandsfrei und ohne Stromfluss, daher keine Rückwirkung (Bremskraft) auf den Stab.",
  bilanz: {
    u_im_feld:    { label: "U in der Feldzone",    einheit: "mV",  stellen: 1 },
    durchquerung: { label: "Zeit in der Feldzone", einheit: "s",   stellen: 2 },
    phi_max:      { label: "Φ maximal",            einheit: "mWb", stellen: 1 }
  }
};

export function init() {
  return {
    t: 0,
    x: X_START,
    phiMax: 0,        // größter erreichter Fluss (SI: Wb)
    uMax: 0,          // Spannungsbetrag in der Feldzone (SI: V)
    tEintritt: null,  // Zeitpunkt des Eintritts in die Feldzone (interpoliert)
    tAustritt: null   // Zeitpunkt des Austritts aus der Feldzone (interpoliert)
  };
}

// Gleichförmige Bewegung; Ein- und Austrittszeit werden innerhalb des Schritts
// linear zurückgerechnet — bei konstantem v exakt.
export function update(z, p, dt) {
  const xAlt = z.x;
  z.x += p.v * dt;
  z.t += dt;
  if (xAlt < 0 && z.x >= 0 && z.tEintritt === null) z.tEintritt = z.t - z.x / p.v;
  if (xAlt < L_FELD && z.x >= L_FELD && z.tAustritt === null) z.tAustritt = z.t - (z.x - L_FELD) / p.v;
  const phi = fluss(z, p);
  if (phi > z.phiMax) z.phiMax = phi;
  const u = spannung(z, p);
  if (u > z.uMax) z.uMax = u;
}

// Fluss Φ = B·A mit der eingeschlossenen Feld-Fläche A = l·x (auf die Feldzone begrenzt)
function fluss(z, p) {
  const xImFeld = Math.min(Math.max(z.x, 0), L_FELD);
  return p.B * p.l * xImFeld;
}

// Betrag der Induktionsspannung: B·l·v, solange der Stab in der Feldzone ist
function spannung(z, p) {
  return (z.x > 0 && z.x < L_FELD) ? p.B * p.l * p.v : 0;
}

export function messwerte(z, p) {
  return { t: z.t, x: z.x, phi: fluss(z, p), u: spannung(z, p) };
}

export function istFertig(z) { return z.x >= X_ENDE; }

// Bilanz direkt in Anzeigeeinheiten (mV, s, mWb) — passend zu den Prüffällen
export function bilanz(z) {
  return {
    u_im_feld: z.uMax * 1000,
    durchquerung: (z.tAustritt ?? z.t) - (z.tEintritt ?? 0),
    phi_max: z.phiMax * 1000
  };
}

// Fester Weltausschnitt: Anlauf, Feldzone (0…1 m) und Auslauf, Höhe passend zu l
export function weltBereich() {
  return { xMin: -0.4, xMax: 1.4, yMin: 0, yMax: 0.6 };
}

export function zeichne({ ctx, welt, zustand: z, werte: p, stil }) {
  const yUnten = 0.06;          // untere Schiene (Welt-y in m)
  const yOben = yUnten + p.l;   // obere Schiene
  const feldUnten = 0.01, feldOben = 0.58;

  // Feldzone: homogenes B-Feld in die Zeichenebene (×-Symbole), gestrichelt umrandet
  ctx.save();
  ctx.fillStyle = stil.hauch;
  ctx.fillRect(welt.px(0), welt.py(feldOben), welt.laenge(L_FELD), welt.laenge(feldOben - feldUnten));
  ctx.strokeStyle = stil.beschriftung;
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 4]);
  ctx.strokeRect(welt.px(0), welt.py(feldOben), welt.laenge(L_FELD), welt.laenge(feldOben - feldUnten));
  ctx.setLineDash([]);
  ctx.fillStyle = stil.beschriftung;
  ctx.font = stil.schrift;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let fx = 0.07; fx < L_FELD; fx += 0.155) {
    for (let fy = feldUnten + 0.05; fy < feldOben - 0.02; fy += 0.14) {
      ctx.fillText("×", welt.px(fx), welt.py(fy));
    }
  }
  ctx.fillStyle = stil.text;
  ctx.textBaseline = "bottom";
  ctx.fillText("Feldzone: B in die Ebene (1 m breit)", welt.px(0.5), welt.py(feldOben) - 4);
  ctx.restore();

  // Eingeschlossene Feld-Fläche A = l·x: schraffiert zwischen den Schienen
  const xA = Math.min(Math.max(z.x, 0), L_FELD);
  if (xA > 0) {
    const links = welt.px(0), rechts = welt.px(xA);
    const oben = welt.py(yOben), unten = welt.py(yUnten);
    ctx.save();
    ctx.beginPath();
    ctx.rect(links, oben, rechts - links, unten - oben);
    ctx.clip();
    ctx.fillStyle = stil.akzent;
    ctx.globalAlpha = 0.15;
    ctx.fillRect(links, oben, rechts - links, unten - oben);
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = stil.akzent;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let s = links - (unten - oben); s < rechts; s += 9) {
      ctx.moveTo(s, unten);
      ctx.lineTo(s + (unten - oben), oben);
    }
    ctx.stroke();
    ctx.restore();
    if (rechts - links > 52 && unten - oben > 16) {
      ctx.fillStyle = stil.akzent;
      ctx.font = stil.schrift;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("A = l·x", (links + rechts) / 2, (oben + unten) / 2);
    }
  }

  // Schienen mit linkem Abschluss
  ctx.strokeStyle = stil.text;
  ctx.lineWidth = stil.linienstaerke;
  ctx.beginPath();
  ctx.moveTo(welt.px(-0.35), welt.py(yUnten));
  ctx.lineTo(welt.px(1.35), welt.py(yUnten));
  ctx.moveTo(welt.px(-0.35), welt.py(yOben));
  ctx.lineTo(welt.px(1.35), welt.py(yOben));
  ctx.moveTo(welt.px(-0.35), welt.py(yUnten));
  ctx.lineTo(welt.px(-0.35), welt.py(yOben));
  ctx.stroke();

  // Spannungsmesser im linken Abschluss
  const vmX = welt.px(-0.35), vmY = welt.py((yUnten + yOben) / 2);
  ctx.fillStyle = stil.flaeche;
  ctx.beginPath();
  ctx.arc(vmX, vmY, 10, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = stil.text;
  ctx.font = stil.schrift;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("V", vmX, vmY);

  // Leiterstab (dick, farbig), ragt leicht über die Schienen hinaus
  ctx.strokeStyle = stil.fehler;
  ctx.lineWidth = Math.max(6, stil.linienstaerke * 3);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(welt.px(z.x), welt.py(Math.max(0, yUnten - 0.015)));
  ctx.lineTo(welt.px(z.x), welt.py(yOben + 0.015));
  ctx.stroke();
  ctx.lineCap = "butt";

  // Bewegungspfeil (Länge wächst mit v); am Ziel angekommen entfällt er
  if (z.x < X_ENDE) {
    const yMitte = (yUnten + yOben) / 2;
    const pfeilLaenge = 0.08 + 0.05 * p.v;
    pfeil(ctx, welt.px(z.x + 0.03), welt.py(yMitte), welt.px(z.x + 0.03 + pfeilLaenge), welt.py(yMitte), stil.ok, stil.linienstaerke);
    ctx.fillStyle = stil.ok;
    ctx.font = stil.schrift;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText("v", welt.px(z.x + 0.03 + pfeilLaenge / 2), welt.py(yMitte) - 6);
  }
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
// |U| = B·l·v (hier in mV), T = L_FELD/v, Φ_max = B·l·L_FELD (hier in mWb)

export const pruefFaelle = [
  {
    name: "Standard: B = 0,5 T, l = 0,2 m, v = 1 m/s",
    parameter: { B: 0.5, l: 0.2, v: 1 },
    toleranzProzent: 0.5,
    soll: { u_im_feld: 100, durchquerung: 1.0, phi_max: 100 }
  },
  {
    name: "Starkes Feld, langer Stab: B = 1 T, l = 0,5 m, v = 0,5 m/s",
    parameter: { B: 1, l: 0.5, v: 0.5 },
    toleranzProzent: 0.5,
    soll: { u_im_feld: 250, durchquerung: 2.0, phi_max: 500 }
  },
  {
    name: "Schwaches Feld, schnell: B = 0,2 T, l = 0,3 m, v = 2 m/s",
    parameter: { B: 0.2, l: 0.3, v: 2 },
    toleranzProzent: 0.5,
    soll: { u_im_feld: 120, durchquerung: 0.5, phi_max: 60 }
  }
];
