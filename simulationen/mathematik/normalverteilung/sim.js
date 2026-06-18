// Normalverteilung (Oberstufe, Stochastik) — statisch: Schieberegler mu, sigma, a, b.
// Dichte f(x) = 1/(sigma*sqrt(2pi)) * exp(-(x-mu)^2/(2 sigma^2)). Die schraffierte
// Flaeche zwischen a und b ist die Wahrscheinlichkeit P(a<=X<=b) = Phi((b-mu)/sigma)
// - Phi((a-mu)/sigma). Die sigma-Regeln 68,3% / 95,4% / 99,7% sind als Marken eingezeichnet.
// Pruefung: P(a<=X<=b) der Sim gegen Phi-Werte (Standardnormal-Verteilungsfunktion).

const WURZEL_2PI = Math.sqrt(2 * Math.PI);

// Fehlerfunktion erf(x), numerisch nach Abramowitz-Stegun 7.1.26 (Fehler < 1.5e-7)
function erf(x) {
  const vorzeichen = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-ax * ax);
  return vorzeichen * y;
}

// Standardnormal-Verteilungsfunktion Phi(z) = 1/2 (1 + erf(z/sqrt(2)))
function Phi(z) {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

// Dichte der Normalverteilung N(mu, sigma^2)
function dichte(x, mu, sigma) {
  const z = (x - mu) / sigma;
  return Math.exp(-0.5 * z * z) / (sigma * WURZEL_2PI);
}

// Kennzahlen aus den aktuellen Reglerwerten
function rechne(werte) {
  const mu = werte.mu ?? 10;
  const sigma = Math.max(0.0001, werte.sigma ?? 2);
  const a = werte.a ?? 8;
  const b = werte.b ?? 12;
  const lo = Math.min(a, b), hi = Math.max(a, b); // Reihenfolge egal: P>=0
  const P_ab = Phi((hi - mu) / sigma) - Phi((lo - mu) / sigma);
  const peak = 1 / (sigma * WURZEL_2PI);
  return { mu, sigma, a, b, lo, hi, P_ab, peak };
}

export const manifest = {
  id: "mathematik/normalverteilung",
  titel: "Normalverteilung",
  modus: "statisch",
  raster: false,
  werkzeuge: false,
  parameter: [
    { id: "mu",    label: "Mittelwert μ",          einheit: "", min: 0,    max: 20, schritt: 0.5, start: 10 },
    { id: "sigma", label: "Standardabweichung σ",  einheit: "", min: 0.5,  max: 5,  schritt: 0.5, start: 2 },
    { id: "a",     label: "untere Grenze a",            einheit: "", min: -5,   max: 25, schritt: 0.5, start: 8 },
    { id: "b",     label: "obere Grenze b",             einheit: "", min: -5,   max: 25, schritt: 0.5, start: 12 }
  ],
  anzeigen: [
    { id: "P_ab", label: "P(a ≤ X ≤ b)",          einheit: "", stellen: 4 },
    { id: "peak", label: "Maximalwert der Dichte",          einheit: "", stellen: 4 }
  ],
  presets: [
    { name: "Standardnormal (μ=0, σ=1)", werte: { mu: 0,  sigma: 1, a: -1, b: 1 } },
    { name: "±1σ (≈68%)",            werte: { mu: 10, sigma: 2, a: 8, b: 12 } },
    { name: "±2σ (≈95%)",            werte: { mu: 10, sigma: 2, a: 6, b: 14 } }
  ],
  vorhersage: {
    frage: "Wie viel Prozent aller Werte liegen ungefähr innerhalb einer Standardabweichung um den Mittelwert, also zwischen μ−σ und μ+σ?",
    optionen: [
      "ungefähr 68 %",
      "genau 50 %",
      "ungefähr 95 %"
    ],
    aufloesung: "Es sind rund 68,3 %. Das ist die erste der drei »sigma-Regeln«: Im Bereich μ±1σ liegen etwa 68,3 % der Werte, in μ±2σ etwa 95,4 % und in μ±3σ etwa 99,7 %. Stelle a = μ−σ und b = μ+σ ein und lies P(a≤X≤b) ab — fast unabhängig von μ und σ erscheint immer derselbe Wert."
  },
  beobachtung: [
    "Vergrößere σ (Standardabweichung): Die Glocke wird breiter und flacher, der Maximalwert sinkt. Die Gesamtfläche unter der Kurve bleibt aber immer genau 1.",
    "Ändere nur μ (Mittelwert): Die Kurve verschiebt sich als Ganzes nach links oder rechts, ihre Form bleibt gleich — μ ist der Symmetriepunkt.",
    "Prüfe die drei sigma-Regeln: Stelle a, b nacheinander auf μ±1σ, μ±2σ, μ±3σ und vergleiche P(a≤X≤b) mit den Marken 68,3 % / 95,4 % / 99,7 % im Bild.",
    "Schiebe a und b enger zusammen: Je schmaler das Intervall, desto kleiner wird die Wahrscheinlichkeit P(a≤X≤b). Für a = b ist die Wahrscheinlichkeit 0."
  ],
  modellgrenzen: "Die Normalverteilung ist eine stetige Verteilung: Wahrscheinlichkeiten sind immer Flächen unter der Dichtekurve (kein Einzelwert hat eine Wahrscheinlichkeit > 0), die Gesamtfläche ist exakt 1. Reale Messdaten sind oft nur näherungsweise normalverteilt; die Kurve reicht theoretisch unendlich weit nach beiden Seiten.",
  bilanz: {
    P_ab: { label: "P(a ≤ X ≤ b)",       einheit: "", stellen: 4 },
    peak: { label: "Maximalwert der Dichte",       einheit: "", stellen: 4 }
  }
};

export function init() { return { t: 0 }; }
export function update() {}
export function istFertig() { return true; }

export function messwerte(z, werte) {
  const r = rechne(werte);
  return { P_ab: r.P_ab, peak: r.peak };
}

export function bilanz(z, werte) {
  const r = rechne(werte);
  return { P_ab: r.P_ab, peak: r.peak };
}

// Sichtbarer x-Bereich: mu +/- 4 sigma (deckt > 99,99 % der Flaeche ab)
export function weltBereich(werte) {
  const mu = werte.mu ?? 10;
  const sigma = Math.max(0.0001, werte.sigma ?? 2);
  return { xMin: mu - 4 * sigma, xMax: mu + 4 * sigma, yMin: 0, yMax: 1 };
}

export function zeichne({ ctx, welt, werte, stil }) {
  const r = rechne(werte);
  const { mu, sigma, lo, hi } = r;
  const xMin = mu - 4 * sigma, xMax = mu + 4 * sigma;
  const yMax = r.peak * 1.18; // etwas Luft ueber dem Scheitel

  // Eigene, flaechenfuellende Abbildung (x und y unabhaengig skaliert) -> nutzt die ganze Breite
  const Bx = welt.breite, By = welt.hoehe;
  const padL = 46, padR = 22, padT = 26, padB = 40;
  const MX = x => padL + ((x - xMin) / (xMax - xMin)) * (Bx - padL - padR);
  const MY = y => (By - padB) - (y / yMax) * (By - padT - padB);

  ctx.save();
  ctx.font = stil.schrift;
  ctx.lineJoin = "round";

  // ----- gefuellte Wahrscheinlichkeitsflaeche zwischen a und b -----
  if (hi > lo) {
    ctx.beginPath();
    ctx.moveTo(MX(lo), MY(0));
    const schritte = 200;
    for (let i = 0; i <= schritte; i++) {
      const x = lo + (hi - lo) * i / schritte;
      ctx.lineTo(MX(x), MY(dichte(x, mu, sigma)));
    }
    ctx.lineTo(MX(hi), MY(0));
    ctx.closePath();
    ctx.fillStyle = farbeMitAlpha(stil.akzent, 0.28);
    ctx.fill();
  }

  // ----- sigma-Marken (mu +/- 1,2,3 sigma) mit Flaechenanteilen -----
  const regeln = [
    { k: 1, anteil: "68,3 %" },
    { k: 2, anteil: "95,4 %" },
    { k: 3, anteil: "99,7 %" }
  ];
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  regeln.forEach(({ k, anteil }) => {
    [mu - k * sigma, mu + k * sigma].forEach(xs => {
      if (xs < xMin || xs > xMax) return;
      const yk = dichte(xs, mu, sigma);
      ctx.strokeStyle = farbeMitAlpha(stil.beschriftung, 0.55);
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(MX(xs), MY(0));
      ctx.lineTo(MX(xs), MY(yk));
      ctx.stroke();
      ctx.setLineDash([]);
    });
    // Beschriftung des Flaechenanteils mittig (in Hoehe der jeweiligen sigma-Stufe)
    const xRechts = mu + k * sigma;
    if (xRechts <= xMax) {
      const yBeschr = dichte(mu, mu, sigma) * (0.62 - 0.16 * (k - 1));
      ctx.fillStyle = stil.beschriftung;
      ctx.fillText("±" + k + "σ → " + anteil, MX(mu), MY(yBeschr));
    }
  });

  // ----- mu-Linie (Symmetrieachse) -----
  ctx.strokeStyle = farbeMitAlpha(stil.text, 0.55);
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(MX(mu), MY(0));
  ctx.lineTo(MX(mu), MY(r.peak));
  ctx.stroke();
  ctx.setLineDash([]);

  // ----- Glockenkurve f(x) -----
  ctx.strokeStyle = stil.text;
  ctx.lineWidth = stil.linienstaerke;
  ctx.beginPath();
  const kurvenSchritte = 260;
  for (let i = 0; i <= kurvenSchritte; i++) {
    const x = xMin + (xMax - xMin) * i / kurvenSchritte;
    const y = dichte(x, mu, sigma);
    if (i === 0) ctx.moveTo(MX(x), MY(y)); else ctx.lineTo(MX(x), MY(y));
  }
  ctx.stroke();

  // ----- Achsen -----
  ctx.strokeStyle = stil.beschriftung;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(MX(xMin), MY(0)); ctx.lineTo(MX(xMax), MY(0)); // x-Achse
  ctx.stroke();

  // x-Achsen-Ticks bei mu und mu +/- k sigma
  ctx.fillStyle = stil.beschriftung;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const tickStellen = sigma < 1 ? 1 : 0;
  for (let k = -3; k <= 3; k++) {
    const xs = mu + k * sigma;
    if (xs < xMin - 1e-9 || xs > xMax + 1e-9) continue;
    ctx.beginPath();
    ctx.moveTo(MX(xs), MY(0) - 3);
    ctx.lineTo(MX(xs), MY(0) + 3);
    ctx.stroke();
    const beschr = k === 0 ? "μ" : formatDe(xs, tickStellen);
    ctx.fillText(beschr, MX(xs), MY(0) + 6);
  }
  ctx.textAlign = "left";
  ctx.fillText("x", MX(xMax) - 2, MY(0) + 6);

  // ----- a- und b-Marken (senkrecht, in Akzentfarbe) -----
  [{ x: lo, t: "a" }, { x: hi, t: "b" }].forEach(({ x, t }) => {
    if (x < xMin - 1e-9 || x > xMax + 1e-9) return;
    ctx.strokeStyle = stil.akzent;
    ctx.lineWidth = stil.linienstaerke;
    ctx.beginPath();
    ctx.moveTo(MX(x), MY(0));
    ctx.lineTo(MX(x), MY(dichte(x, mu, sigma)));
    ctx.stroke();
    ctx.fillStyle = stil.akzent;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(t, MX(x), MY(dichte(x, mu, sigma)) - 3);
  });

  // ----- grosser P-Wert (oben) -----
  const gross = stil.linienstaerke > 3;
  ctx.fillStyle = stil.akzent;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = (gross ? "bold 22px " : "bold 17px ") + "sans-serif";
  ctx.fillText("P(a ≤ X ≤ b) = " + formatDe(r.P_ab, 4), padL + 4, padT - 16);

  ctx.restore();
}

// Deutsche Dezimaldarstellung (Komma) fuer Achsen- und Wertbeschriftung
function formatDe(wert, stellen) {
  if (!isFinite(wert)) return "–";
  return wert.toLocaleString("de-DE", { minimumFractionDigits: stellen, maximumFractionDigits: stellen });
}

// Hex/rgb-Farbe der Tokens mit Alpha versehen (Tokens sind hex oder rgb())
function farbeMitAlpha(farbe, alpha) {
  if (farbe.startsWith("#")) {
    let h = farbe.slice(1);
    if (h.length === 3) h = h.split("").map(c => c + c).join("");
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  const m = farbe.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  if (m) return `rgba(${m[1]},${m[2]},${m[3]},${alpha})`;
  return farbe;
}

// ---------- Prueffaelle (Phi-genau, sigma-Regeln) ----------
export const pruefFaelle = [
  { name: "Standardnormal, ±1σ",  parameter: { mu: 0,  sigma: 1, a: -1,    b: 1    }, toleranzProzent: 0.5, soll: { P_ab: 0.6827 } },
  { name: "Standardnormal, ±2σ",  parameter: { mu: 0,  sigma: 1, a: -2,    b: 2    }, toleranzProzent: 0.5, soll: { P_ab: 0.9545 } },
  { name: "N(10,2), ±1σ",         parameter: { mu: 10, sigma: 2, a: 8,     b: 12   }, toleranzProzent: 0.5, soll: { P_ab: 0.6827 } },
  { name: "95-%-Intervall (±1,96)",    parameter: { mu: 0,  sigma: 1, a: -1.96, b: 1.96 }, toleranzProzent: 0.5, soll: { P_ab: 0.95 } }
];
