// Generator: Induktionsspannung — Wechselspannungserzeugung durch Drehung einer
// Leiterschleife im homogenen Magnetfeld. Modell (SI-Einheiten, exakt-analytisch):
// Eine Leiterschleife mit N Windungen und Fläche A dreht sich mit der
// Winkelgeschwindigkeit ω = 2π·f in einem homogenen Magnetfeld B. Der von der
// Schleife eingeschlossene magnetische Fluss ist
//   Φ(t) = N·B·A·cos(ω·t)
// (maximal, wenn die Schleifenebene senkrecht zu B steht, also φ = ω·t = 0).
// Die Induktionsspannung folgt aus dem Induktionsgesetz U = −dΦ/dt:
//   U(t) = N·B·A·ω·sin(ω·t)
// mit der Scheitelspannung  U₀ = N·B·A·ω = N·B·A·2π·f.
// WICHTIG: U und Φ werden in jedem Schritt DIREKT aus diesen Formeln berechnet —
// es wird nichts numerisch integriert. update() erhöht nur die Zeit t und damit den
// Drehwinkel φ = ω·t. So bleiben die Werte exakt (kein Drift, kein Verfahrensfehler).

// Feste Geometrie der Zeichnung (Weltkoordinaten in willkürlichen Längeneinheiten,
// nur zur Darstellung — die Physik steckt allein in den Parametern oben).
const FELD_X0 = -1.55;   // linker Rand der Feldzone
const FELD_X1 = 0.55;    // rechter Rand der Feldzone
const FELD_Y0 = -1.05;   // unterer Rand der Feldzone
const FELD_Y1 = 1.05;    // oberer Rand der Feldzone
const ACHSE_X = -0.5;    // x-Mittelpunkt der Drehachse / Schleife
const SCHLEIFE_R = 0.78; // Radius der gezeichneten Leiterschleife
const KURVE_X0 = 0.95;   // Beginn des U(t)-Mitschriebs
const KURVE_X1 = 2.75;   // Ende des U(t)-Mitschriebs
const KURVE_BREITE_T = 2.0; // im Mitschrieb dargestellte Zeitspanne (s)

function omega(p) { return 2 * Math.PI * p.frequenz; }

// Scheitelspannung U₀ = N·B·A·2π·f (SI: V)
function scheitelspannung(p) {
  return p.N * p.B * p.flaeche * omega(p);
}

export const manifest = {
  id: "physik/generator",
  titel: "Generator: Induktionsspannung",
  modus: "kontinuierlich",
  dt: 1 / 240,
  tMax: 8,
  schrittweite: 0.02,
  parameter: [
    { id: "N",        label: "Windungszahl N",      einheit: "",   min: 10,    max: 400,  schritt: 10,    start: 100 },
    { id: "B",        label: "Flussdichte B",       einheit: "T",  min: 0.05,  max: 0.4,  schritt: 0.05,  start: 0.2 },
    { id: "flaeche",  label: "Schleifenfläche A",   einheit: "m²", min: 0.005, max: 0.05, schritt: 0.005, start: 0.02 },
    { id: "frequenz", label: "Drehfrequenz f",      einheit: "Hz", min: 0.5,   max: 4,    schritt: 0.5,   start: 1 }
  ],
  anzeigen: [
    { id: "t",   label: "Zeit",                       einheit: "s",  stellen: 2 },
    { id: "U",   label: "Induktionsspannung U",       einheit: "V",  stellen: 3 },
    { id: "U0",  label: "Scheitelspannung U₀",        einheit: "V",  stellen: 3 },
    { id: "Phi", label: "Magnetischer Fluss Φ",       einheit: "Wb", stellen: 4 },
    { id: "f",   label: "Drehfrequenz",               einheit: "Hz", stellen: 1 }
  ],
  diagramme: [
    { x: "t", y: "U", titel: "Induktionsspannung U(t)" }
  ],
  presets: [
    { name: "Standard",            werte: { N: 100, B: 0.2,  flaeche: 0.02,  frequenz: 1 } },
    { name: "Schnelle Drehung",    werte: { N: 100, B: 0.2,  flaeche: 0.02,  frequenz: 2 } },
    { name: "Starkes Feld",        werte: { N: 200, B: 0.4,  flaeche: 0.03,  frequenz: 1 } }
  ],
  vorhersage: {
    frage: "Was passiert mit der Scheitelspannung U₀, wenn sich die Drehfrequenz f verdoppelt (alles andere bleibt gleich)?",
    optionen: [
      "Sie bleibt gleich — nur die Schwingung wird schneller",
      "Sie verdoppelt sich",
      "Sie vervierfacht sich"
    ],
    aufloesung: "Sie verdoppelt sich. In U₀ = N·B·A·2π·f steckt f linear: doppelte Drehfrequenz → doppelte Scheitelspannung. Zugleich wird die Schwingung doppelt so schnell (halbe Periodendauer T = 1/f). Beim echten Fahrraddynamo merkt man das deutlich — je schneller man fährt, desto heller leuchtet die Lampe."
  },
  beobachtung: [
    "Variiere die Windungszahl N (z. B. von 100 auf 200): Beobachte, wie sich die Scheitelspannung U₀ und die Höhe der U(t)-Kurve verhalten. U₀ ist proportional zu N.",
    "Verändere nur die Flussdichte B (Preset „Starkes Feld“ vergleichen): Auch B geht linear in U₀ ein — stärkeres Feld bedeutet höhere Spannung, die Frequenz der Schwingung bleibt aber unverändert.",
    "Ändere die Schleifenfläche A: Eine größere Fläche schließt mehr Feldlinien ein (größerer Fluss Φ) und liefert eine größere Scheitelspannung U₀ ~ A.",
    "Vergleiche die Phasenlage von U und Φ in der Messwertanzeige: Wenn der Fluss Φ gerade null ist (Schleifenebene parallel zu B), ist die Spannung U betragsmäßig am größten — und umgekehrt. U eilt dem Fluss um eine Viertelperiode voraus, weil U die (negative) Änderungsrate von Φ ist."
  ],
  modellgrenzen: "Idealisiertes Modell: streng homogenes Magnetfeld, exakt konstante Drehfrequenz, kein Innenwiderstand der Spule und keine angeschlossene Last (kein Strom, also keine Rückwirkung durch die lenzsche Regel). Reibung und Lagerverluste fehlen ebenso wie der Eisenkern realer Generatoren. Umgekehrt betrieben — Strom hineinschicken statt Spannung abgreifen — wird aus dem Generator ein Elektromotor (gleiche Bauteile, umgekehrte Energierichtung).",
  bilanz: {
    U0:   { label: "Scheitelspannung U₀ (Formel)", einheit: "V", stellen: 4 },
    umax: { label: "größte gemessene |U|",         einheit: "V", stellen: 4 }
  }
};

export function init(p) {
  return {
    t: 0,
    umax: 0,                 // größter bisher erreichter Spannungsbetrag (SI: V)
    spur: [[0, 0]]           // [t, U] für den Mitschrieb auf der Zeichenfläche (U startet bei sin(0)=0)
  };
}

// update erhöht nur die Zeit (und damit den Drehwinkel φ = ω·t). U und Φ werden
// nicht integriert, sondern bei Bedarf analytisch aus der Formel gelesen.
export function update(z, p, dt) {
  z.t += dt;
  const U = p.N * p.B * p.flaeche * omega(p) * Math.sin(omega(p) * z.t);
  if (Math.abs(U) > z.umax) z.umax = Math.abs(U);
  z.spur.push([z.t, U]);
  // Spur auf das aktuelle Sichtfenster begrenzen (nur die letzten ~KURVE_BREITE_T s)
  const tMin = z.t - KURVE_BREITE_T;
  while (z.spur.length > 2 && z.spur[1][0] < tMin) z.spur.shift();
  if (z.spur.length > 6000) z.spur.shift();
}

export function messwerte(z, p) {
  const w = omega(p);
  const U = p.N * p.B * p.flaeche * w * Math.sin(w * z.t);
  const Phi = p.N * p.B * p.flaeche * Math.cos(w * z.t);
  return {
    t: z.t,
    U,
    U0: scheitelspannung(p),
    Phi,
    f: p.frequenz
  };
}

// Generator läuft endlos (Wechselspannung) — kein natürliches Ende.
export function istFertig() { return false; }

// Bilanz: analytische Scheitelspannung U₀ aus der Formel und der größte tatsächlich
// gemessene Spannungsbetrag umax. umax ≈ U₀ bestätigt, dass die Simulation den
// Scheitel der Sinuskurve erreicht (Selbstkontrolle für die Prüffälle).
export function bilanz(z, p) {
  return {
    U0: scheitelspannung(p),
    umax: z.umax
  };
}

// Fester Weltausschnitt: links Feldzone mit Schleife, rechts der U(t)-Mitschrieb.
export function weltBereich() {
  return { xMin: -1.75, xMax: 2.9, yMin: -1.25, yMax: 1.3 };
}

export function zeichne({ ctx, welt, zustand: z, werte: p, stil }) {
  const w = omega(p);
  const phi = w * z.t;                 // aktueller Drehwinkel der Schleife
  const U = p.N * p.B * p.flaeche * w * Math.sin(phi);
  const U0 = scheitelspannung(p) || 1e-9;

  ctx.save();
  ctx.font = stil.schrift;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // ---------- Homogenes Magnetfeld: parallele Pfeile von N (links) nach S (rechts) ----------
  // Feld zeigt waagerecht nach rechts; oben/unten sitzen die Polschuhe N und S.
  const reihen = 5;
  ctx.strokeStyle = stil.beschriftung;
  ctx.fillStyle = stil.beschriftung;
  ctx.lineWidth = 1;
  for (let i = 0; i < reihen; i++) {
    const fy = FELD_Y0 + (FELD_Y1 - FELD_Y0) * (i + 0.5) / reihen;
    feldpfeil(ctx, welt, FELD_X0 + 0.08, fy, FELD_X1 - 0.08, fy, stil);
  }
  // Polschuhe (Balken) ober- und unterhalb der Feldzone
  ctx.fillStyle = stil.hauch;
  ctx.strokeStyle = stil.beschriftung;
  ctx.lineWidth = stil.linienstaerke;
  rechteck(ctx, welt, FELD_X0, FELD_Y1, FELD_X1, FELD_Y1 + 0.22);
  rechteck(ctx, welt, FELD_X0, FELD_Y0 - 0.22, FELD_X1, FELD_Y0);
  ctx.fillStyle = stil.text;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = stil.schrift.replace(/\d+px/, m => (parseInt(m) + 4) + "px");
  ctx.fillText("N", welt.px((FELD_X0 + FELD_X1) / 2), welt.py(FELD_Y1 + 0.11));
  ctx.fillText("S", welt.px((FELD_X0 + FELD_X1) / 2), welt.py(FELD_Y0 - 0.11));
  ctx.font = stil.schrift;
  ctx.fillStyle = stil.beschriftung;
  ctx.textBaseline = "bottom";
  ctx.fillText("Magnetfeld B", welt.px(FELD_X0 + 0.62), welt.py(FELD_Y0 - 0.30));

  // ---------- Drehachse ----------
  ctx.strokeStyle = stil.beschriftung;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(welt.px(ACHSE_X), welt.py(FELD_Y0 - 0.22));
  ctx.lineTo(welt.px(ACHSE_X), welt.py(FELD_Y1 + 0.22));
  ctx.stroke();
  ctx.setLineDash([]);

  // ---------- Rotierende Leiterschleife ----------
  // Die Schleife dreht sich um die senkrechte Achse. In der Aufsicht erscheint sie
  // als Ellipse, deren waagerechte Halbachse mit cos(φ) "atmet" (perspektivische
  // Verkürzung); die Schleifenebene steht senkrecht zu B, wenn φ = 0 (Φ maximal).
  const cx = welt.px(ACHSE_X);
  const cyW = (FELD_Y0 + FELD_Y1) / 2;       // Schleifenmitte (Welt-y)
  const cy = welt.py(cyW);
  const ry = welt.laenge(SCHLEIFE_R);        // senkrechte Halbachse (konstant)
  const rx = welt.laenge(SCHLEIFE_R) * Math.cos(phi); // waagerechte Halbachse (Projektion)
  // hintere und vordere Schleifenseite getrennt zeichnen (Räumlichkeit)
  ctx.lineWidth = stil.linienstaerke + 1;
  // hintere Hälfte (gestrichelt, "hinter" der Achse)
  ctx.strokeStyle = stil.beschriftung;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.ellipse(cx, cy, Math.abs(rx), ry, 0, -Math.PI / 2, Math.PI / 2, Math.sin(phi) < 0);
  ctx.stroke();
  ctx.setLineDash([]);
  // vordere Hälfte (durchgezogen, in Akzentfarbe)
  ctx.strokeStyle = stil.akzent;
  ctx.beginPath();
  ctx.ellipse(cx, cy, Math.abs(rx), ry, 0, Math.PI / 2, -Math.PI / 2, Math.sin(phi) < 0);
  ctx.stroke();
  // Leiterstücke oben/unten als kleine Punkte markieren (die "aktiven" Leiter)
  ctx.fillStyle = stil.akzent;
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(cx, welt.py(cyW + sgn * SCHLEIFE_R), Math.max(3, stil.linienstaerke + 1), 0, 2 * Math.PI);
    ctx.fill();
  }

  // ---------- Geschwindigkeits-/Bewegungspfeile an den Leitern ----------
  // Die obere und untere Schleifenseite bewegen sich tangential; ihre Geschwindigkeit
  // in Feldrichtung (waagerecht) ist ~ sin(φ) — genau dort ist die Induktion maximal.
  const vquer = Math.sin(phi);                // waagerechte Geschwindigkeitskomponente (normiert)
  if (Math.abs(vquer) > 0.04) {
    const pf = 0.34 * Math.sign(vquer);
    // oben bewegt sich entgegengesetzt zu unten (Schleife dreht starr)
    bewegungspfeil(ctx, welt, ACHSE_X, cyW + SCHLEIFE_R,  pf, stil);
    bewegungspfeil(ctx, welt, ACHSE_X, cyW - SCHLEIFE_R, -pf, stil);
  }

  // ---------- Zeiger (Momentanwert U) ----------
  // Kleiner Zeiger oben rechts in der Feldzone, der mit der Schleife mitläuft und auf
  // einer Skala den aktuellen Spannungsbetrag anzeigt (rein illustrativ).

  // ---------- U(t)-Mitschrieb (mitlaufende Sinuskurve) ----------
  const yKurve = (FELD_Y0 + FELD_Y1) / 2;     // Nulllinie der Kurve (Welt-y)
  const ampPx = welt.laenge(0.92);            // Pixel-Amplitude der Kurvendarstellung
  const tFenster0 = Math.max(0, z.t - KURVE_BREITE_T);
  const tFenster1 = Math.max(KURVE_BREITE_T, z.t);
  const kurveX = t => welt.px(KURVE_X0 + (KURVE_X1 - KURVE_X0) * (t - tFenster0) / (tFenster1 - tFenster0));
  const kurveY = u => welt.py(yKurve) - (u / U0) * ampPx;

  // Achsen des Mitschriebs
  ctx.strokeStyle = stil.beschriftung;
  ctx.lineWidth = 1;
  ctx.beginPath();
  // Nulllinie (t-Achse)
  ctx.moveTo(welt.px(KURVE_X0), welt.py(yKurve));
  ctx.lineTo(welt.px(KURVE_X1) + 6, welt.py(yKurve));
  // U-Achse links
  ctx.moveTo(welt.px(KURVE_X0), kurveY(U0));
  ctx.lineTo(welt.px(KURVE_X0), kurveY(-U0));
  ctx.stroke();
  // kleine Pfeilspitzen an den Achsen
  pfeilspitze(ctx, welt.px(KURVE_X1) + 6, welt.py(yKurve), 0, stil.beschriftung);
  pfeilspitze(ctx, welt.px(KURVE_X0), kurveY(U0), -Math.PI / 2, stil.beschriftung);
  ctx.fillStyle = stil.beschriftung;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("U", welt.px(KURVE_X0) + 6, kurveY(U0) - 2);
  ctx.textBaseline = "top";
  ctx.fillText("t", welt.px(KURVE_X1) + 2, welt.py(yKurve) + 4);
  // Marken für +U₀ und −U₀
  ctx.setLineDash([3, 3]);
  ctx.strokeStyle = stil.hauch;
  ctx.beginPath();
  ctx.moveTo(welt.px(KURVE_X0), kurveY(U0));  ctx.lineTo(welt.px(KURVE_X1), kurveY(U0));
  ctx.moveTo(welt.px(KURVE_X0), kurveY(-U0)); ctx.lineTo(welt.px(KURVE_X1), kurveY(-U0));
  ctx.stroke();
  ctx.setLineDash([]);

  // Spur (gemessener Verlauf), auf das Fenster begrenzt
  if (z.spur.length > 1) {
    ctx.strokeStyle = stil.akzent;
    ctx.lineWidth = stil.linienstaerke;
    ctx.beginPath();
    let begonnen = false;
    for (const [ti, ui] of z.spur) {
      if (ti < tFenster0 - 1e-9) continue;
      const sx = kurveX(ti), sy = kurveY(ui);
      if (!begonnen) { ctx.moveTo(sx, sy); begonnen = true; } else ctx.lineTo(sx, sy);
    }
    ctx.stroke();
    // Laufpunkt am aktuellen Ende
    ctx.fillStyle = stil.akzent;
    ctx.beginPath();
    ctx.arc(kurveX(z.t), kurveY(U), Math.max(3, stil.linienstaerke + 1), 0, 2 * Math.PI);
    ctx.fill();
  }

  // Verbindungslinie: aktueller Spannungswert der Schleife → Laufpunkt der Kurve
  // (zeigt anschaulich, wie der Momentanwert in den Graphen "eingetragen" wird)
  ctx.strokeStyle = stil.hauch;
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 3]);
  ctx.beginPath();
  ctx.moveTo(cx, welt.py(cyW) - (U / U0) * ampPx);
  ctx.lineTo(kurveX(z.t), kurveY(U));
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.restore();
}

// Waagerechter Feldpfeil (homogenes Feld) in Weltkoordinaten.
function feldpfeil(ctx, welt, x1, y, x2, y2, stil) {
  const px1 = welt.px(x1), px2 = welt.px(x2), py = welt.py(y);
  ctx.beginPath();
  ctx.moveTo(px1, py);
  ctx.lineTo(px2, py);
  ctx.stroke();
  pfeilspitze(ctx, px2, py, 0, ctx.strokeStyle);
}

// Tangentialer Bewegungspfeil an einem Leiterstück (waagerecht, Länge ~ Geschwindigkeit).
function bewegungspfeil(ctx, welt, x, y, dxWelt, stil) {
  const px1 = welt.px(x), py = welt.py(y), px2 = welt.px(x + dxWelt);
  ctx.save();
  ctx.strokeStyle = stil.fehler;
  ctx.fillStyle = stil.fehler;
  ctx.lineWidth = stil.linienstaerke;
  ctx.beginPath();
  ctx.moveTo(px1, py);
  ctx.lineTo(px2, py);
  ctx.stroke();
  pfeilspitze(ctx, px2, py, dxWelt >= 0 ? 0 : Math.PI, stil.fehler);
  ctx.restore();
}

// Pfeilspitze an (x,y), Ausrichtung über Winkel w (0 = nach rechts).
function pfeilspitze(ctx, x, y, w, farbe) {
  const k = 7;
  ctx.save();
  ctx.fillStyle = farbe;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - k * Math.cos(w - 0.4), y - k * Math.sin(w - 0.4));
  ctx.lineTo(x - k * Math.cos(w + 0.4), y - k * Math.sin(w + 0.4));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Gefülltes Rechteck (mit Rand) aus zwei Welt-Eckpunkten.
function rechteck(ctx, welt, x0, y0, x1, y1) {
  const px = welt.px(x0), py = welt.py(Math.max(y0, y1));
  const b = welt.laenge(Math.abs(x1 - x0)), h = welt.laenge(Math.abs(y1 - y0));
  ctx.beginPath();
  ctx.rect(px, py, b, h);
  ctx.fill();
  ctx.stroke();
}

// ---------- Prüffälle (analytisch bekannte Lösungen, Pflicht vor status: online) ----------
// U₀ = N·B·A·2π·f. Da U und Φ analytisch berechnet werden, ist U₀ exakt; umax muss
// nach hinreichend langem Lauf den Scheitel der Sinuskurve erreichen (umax ≈ U₀).
//   Fall 1: 100·0,2·0,02·2π·1   = 0,4·2π   = 2,5133 V
//   Fall 2: 200·0,1·0,01·2π·2   = 0,4·2π   = 2,5133 V
//   Fall 3: 50·0,4·0,05·2π·0,5  = 1,0·π    = 3,1416 V

export const pruefFaelle = [
  {
    name: "Standard: N = 100, B = 0,2 T, A = 0,02 m², f = 1 Hz",
    parameter: { N: 100, B: 0.2, flaeche: 0.02, frequenz: 1 },
    toleranzProzent: 2,
    soll: { U0: 2.5133, umax: 2.5133 }
  },
  {
    name: "Mehr Windungen, schnellere Drehung: N = 200, B = 0,1 T, A = 0,01 m², f = 2 Hz",
    parameter: { N: 200, B: 0.1, flaeche: 0.01, frequenz: 2 },
    toleranzProzent: 2,
    soll: { U0: 2.5133, umax: 2.5133 }
  },
  {
    name: "Starkes Feld, große Fläche, langsam: N = 50, B = 0,4 T, A = 0,05 m², f = 0,5 Hz",
    parameter: { N: 50, B: 0.4, flaeche: 0.05, frequenz: 0.5 },
    toleranzProzent: 2,
    soll: { U0: 3.1416, umax: 3.1416 }
  }
];
