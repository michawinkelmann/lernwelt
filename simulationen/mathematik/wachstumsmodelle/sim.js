// Wachstumsmodelle: exponentiell vs. logistisch (Oberstufe / Sek I Vergleich) — statisch.
// Beide Modelle starten beim selben Bestand N0 und wachsen mit derselben Rate k. Das
// exponentielle Modell N_exp(t) = N0·e^(k·t) wächst unbegrenzt; das logistische Modell
//   N_log(t) = K / (1 + ((K − N0)/N0)·e^(−k·t))
// nähert sich für große t der Kapazität (Sättigungsgrenze) K und hat einen Wendepunkt
// bei der halben Kapazität K/2. Schieberegler: N0, k, K.
// Analytische Prüfung: Modellwerte der Sim bei t = 5 gegen die geschlossenen Formeln.

// Exponentielles Wachstum
function nExp(N0, k, t) {
  return N0 * Math.exp(k * t);
}

// Logistisches Wachstum (Sättigung bei K)
function nLog(N0, k, K, t) {
  return K / (1 + ((K - N0) / N0) * Math.exp(-k * t));
}

const T_MAX = 12; // betrachteter Zeitbereich 0 … 12

function modell(werte) {
  const N0 = Math.max(1, werte.N0 ?? 1);
  const k = Math.max(0, werte.k ?? 0.5);
  const K = Math.max(1, werte.K ?? 100);
  return {
    N0, k, K,
    N_exp_t5: nExp(N0, k, 5),
    N_log_t5: nLog(N0, k, K, 5),
    grenzwert: K
  };
}

export const manifest = {
  id: "mathematik/wachstumsmodelle",
  titel: "Wachstumsmodelle: exponentiell vs. logistisch",
  modus: "statisch",
  raster: false,
  werkzeuge: false,
  parameter: [
    { id: "N0", label: "Startbestand N₀", einheit: "", min: 1, max: 50, schritt: 1, start: 1 },
    { id: "k", label: "Wachstumsrate k", einheit: "1/Zeit", min: 0, max: 1, schritt: 0.05, start: 0.5 },
    { id: "K", label: "Kapazität K (Sättigungsgrenze)", einheit: "", min: 20, max: 500, schritt: 10, start: 100 }
  ],
  anzeigen: [
    { id: "N_exp_t5", label: "exponentiell bei t = 5", einheit: "", stellen: 1 },
    { id: "N_log_t5", label: "logistisch bei t = 5",   einheit: "", stellen: 1 },
    { id: "grenzwert", label: "Grenzwert (logistisch)", einheit: "", stellen: 1 }
  ],
  presets: [
    { name: "Bakterien (exponentiell)",   werte: { N0: 1, k: 0.8, K: 500 } },
    { name: "Population (logistisch)",    werte: { N0: 5, k: 0.5, K: 100 } },
    { name: "kein Wachstum (k = 0)",      werte: { N0: 20, k: 0, K: 100 } }
  ],
  vorhersage: {
    frage: "Beide Modelle starten beim selben Bestand und wachsen zunächst gleich schnell. Was unterscheidet das logistische vom exponentiellen Wachstum auf lange Sicht?",
    optionen: [
      "Das logistische Wachstum sättigt sich bei der Kapazität K, das exponentielle wächst unbegrenzt weiter",
      "Beide wachsen unbegrenzt, das logistische nur etwas langsamer",
      "Das logistische überholt das exponentielle Wachstum nach einiger Zeit"
    ],
    aufloesung: "Anfangs sind beide Kurven kaum zu unterscheiden. Das exponentielle Modell N_exp(t) = N₀·e^(k·t) wächst jedoch unbegrenzt immer steiler. Das logistische Modell bremst sich selbst aus: Je näher der Bestand der Kapazität K kommt, desto langsamer wächst er — die Kurve nähert sich der gestrichelten Sättigungslinie K an, ohne sie zu überschreiten. Ihr Wendepunkt (steilster Anstieg) liegt genau bei der halben Kapazität K/2."
  },
  beobachtung: [
    "Erhöhe die Wachstumsrate k: Beide Kurven werden steiler und steigen früher an. Beim logistischen Modell wird die Sättigung schneller erreicht — die Höhe der Sättigungslinie bleibt aber dieselbe.",
    "Verändere die Kapazität K: Beobachte, wie sich nur beim logistischen Modell die Höhe ändert, bei der sich die Kurve einpendelt. Die gestrichelte Linie wandert mit K mit.",
    "Vergleiche beide Kurven für kleine t (links): Sie liegen fast übereinander. Erst später trennen sie sich deutlich — das exponentielle wächst über K hinaus aus dem Bild heraus.",
    "Such beim logistischen Modell den Wendepunkt: Dort wechselt die Kurve von Links- in Rechtskrümmung. Er liegt auf halber Sättigungshöhe, also bei N = K/2 — lies den K-Wert ab und prüfe es."
  ],
  modellgrenzen: "Beide Modelle sind idealisierte, glatte Kurven. Reale Bestände (Bakterien, Tiere, Menschen) schwanken durch Zufall, Jahreszeiten, Krankheiten oder Nahrung und folgen den Formeln nur näherungsweise. Exponentielles Wachstum ist höchstens kurzfristig realistisch — auf Dauer setzt jede begrenzte Umwelt eine Kapazität, sodass logistisches Wachstum oft das bessere Modell ist.",
  bilanz: {
    N_exp_t5: { label: "exponentiell bei t = 5", einheit: "", stellen: 3 },
    N_log_t5: { label: "logistisch bei t = 5",   einheit: "", stellen: 3 },
    grenzwert: { label: "Grenzwert (= K)",        einheit: "", stellen: 1 }
  }
};

export function init() { return { t: 0 }; }
export function update() {}
export function istFertig() { return true; }

export function messwerte(z, werte) {
  const m = modell(werte);
  return { N_exp_t5: m.N_exp_t5, N_log_t5: m.N_log_t5, grenzwert: m.grenzwert };
}

export function bilanz(z, werte) {
  const N0 = Math.max(1, werte.N0 ?? 1);
  const k = Math.max(0, werte.k ?? 0.5);
  const K = Math.max(1, werte.K ?? 100);
  return {
    N_exp_t5: N0 * Math.exp(5 * k),
    N_log_t5: K / (1 + ((K - N0) / N0) * Math.exp(-5 * k)),
    grenzwert: K
  };
}

export function weltBereich(werte) {
  const K = Math.max(1, werte.K ?? 100);
  return { xMin: 0, xMax: T_MAX, yMin: 0, yMax: K * 1.15 };
}

export function zeichne({ ctx, welt, werte, stil }) {
  const m = modell(werte);
  const { N0, k, K } = m;
  // Eigene, flächenfüllende Abbildung (x und y unabhängig skaliert) — nutzt die ganze Fläche
  const Bx = welt.breite, By = welt.hoehe;
  const padL = 52, padR = 24, padT = 22, padB = 38;
  const xmax = T_MAX;
  const ymax = K * 1.14;             // etwas über der Kapazität, damit K-Linie sichtbar bleibt
  const MX = x => padL + (x / xmax) * (Bx - padL - padR);
  const MY = y => (By - padB) - (Math.min(y, ymax) / ymax) * (By - padT - padB);
  ctx.save();
  ctx.font = stil.schrift;

  // Achsen
  ctx.strokeStyle = stil.beschriftung; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(MX(0), MY(0)); ctx.lineTo(MX(xmax), MY(0));
  ctx.moveTo(MX(0), MY(0)); ctx.lineTo(MX(0), MY(ymax));
  ctx.stroke();

  // x-Ticks (t = 2,4,6,8,10,12)
  ctx.fillStyle = stil.beschriftung; ctx.textAlign = "center"; ctx.textBaseline = "top";
  for (let xi = 2; xi <= xmax + 1e-9; xi += 2) {
    ctx.beginPath(); ctx.moveTo(MX(xi), MY(0) - 3); ctx.lineTo(MX(xi), MY(0) + 3); ctx.stroke();
    ctx.fillText(String(xi), MX(xi), MY(0) + 5);
  }
  ctx.textAlign = "left"; ctx.fillText("t", MX(xmax) - 2, MY(0) + 5);

  // y-Ticks: schöne Schrittweite passend zur Kapazität
  ctx.textAlign = "right"; ctx.textBaseline = "middle";
  const yStep = schoenerSchritt(K);
  for (let yi = yStep; yi <= ymax - yStep * 0.4; yi += yStep) {
    ctx.beginPath(); ctx.moveTo(MX(0) - 3, MY(yi)); ctx.lineTo(MX(0) + 3, MY(yi)); ctx.stroke();
    ctx.fillStyle = stil.beschriftung;
    ctx.fillText(String(Math.round(yi)), MX(0) - 6, MY(yi));
  }
  // y-Achsentitel
  ctx.save();
  ctx.translate(MX(0) - 40, (MY(0) + MY(ymax)) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = stil.beschriftung; ctx.fillText("N (Bestand)", 0, 0);
  ctx.restore();

  // Kapazitätslinie K (gestrichelt)
  ctx.save();
  ctx.setLineDash([7, 5]);
  ctx.strokeStyle = farbeMitAlpha(stil.text, 0.55); ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(MX(0), MY(K)); ctx.lineTo(MX(xmax), MY(K)); ctx.stroke();
  ctx.restore();
  ctx.fillStyle = farbeMitAlpha(stil.text, 0.8); ctx.textAlign = "right"; ctx.textBaseline = "bottom";
  ctx.fillText("Kapazität K = " + Math.round(K), MX(xmax) - 2, MY(K) - 3);

  // Kurve exponentiell (Akzentfarbe)
  zeichneKurve(ctx, MX, MY, xmax, ymax, t => nExp(N0, k, t), stil.akzent, stil.linienstaerke);
  // Kurve logistisch (Fehler-/Kontrastfarbe — kräftig, klar unterscheidbar)
  zeichneKurve(ctx, MX, MY, xmax, ymax, t => nLog(N0, k, K, t), stil.fehler, stil.linienstaerke);

  // Wendepunkt des logistischen Modells (bei N = K/2), nur wenn er im Bild liegt
  if (k > 1e-6 && K / 2 > N0) {
    const tw = Math.log((K - N0) / N0) / k; // N_log(tw) = K/2
    if (tw >= 0 && tw <= xmax) {
      const px = MX(tw), py = MY(K / 2);
      ctx.fillStyle = stil.fehler;
      ctx.beginPath(); ctx.arc(px, py, stil.linienstaerke > 3 ? 6 : 4, 0, 2 * Math.PI); ctx.fill();
      ctx.strokeStyle = farbeMitAlpha(stil.flaeche, 0.9); ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = farbeMitAlpha(stil.text, 0.85); ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillText("Wendepunkt (K/2)", px + 8, py + 4);
    }
  }

  // Legende (oben links, mit Hintergrund)
  const gross = stil.linienstaerke > 3;
  const lx = MX(0) + 14, ly = MY(ymax) + 14;
  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.fillStyle = farbeMitAlpha(stil.flaeche, 0.86);
  ctx.fillRect(lx - 8, ly - 14, gross ? 270 : 210, gross ? 56 : 44);
  // exponentiell
  ctx.strokeStyle = stil.akzent; ctx.lineWidth = stil.linienstaerke;
  ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + 22, ly); ctx.stroke();
  ctx.fillStyle = stil.text; ctx.fillText("exponentiell  N₀·e^(k·t)", lx + 30, ly);
  // logistisch
  const ly2 = ly + (gross ? 26 : 20);
  ctx.strokeStyle = stil.fehler; ctx.lineWidth = stil.linienstaerke;
  ctx.beginPath(); ctx.moveTo(lx, ly2); ctx.lineTo(lx + 22, ly2); ctx.stroke();
  ctx.fillStyle = stil.text; ctx.fillText("logistisch  (Sättigung K)", lx + 30, ly2);

  ctx.restore();
}

// Eine Funktionskurve zeichnen; oberhalb von ymax wird abgeschnitten (Linie läuft oben raus)
function zeichneKurve(ctx, MX, MY, xmax, ymax, fn, farbe, breite) {
  ctx.save();
  ctx.strokeStyle = farbe; ctx.lineWidth = breite;
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  ctx.beginPath();
  const N = 240;
  let begonnen = false;
  for (let i = 0; i <= N; i++) {
    const x = xmax * i / N;
    const y = fn(x);
    const px = MX(x), py = MY(y);
    if (!begonnen) { ctx.moveTo(px, py); begonnen = true; } else { ctx.lineTo(px, py); }
    if (y > ymax) break; // Kurve verlässt oben das Bild — hier abbrechen
  }
  ctx.stroke();
  ctx.restore();
}

// Schöne y-Schrittweite (etwa 5 Ticks) für Kapazitäten 20 … 500
function schoenerSchritt(K) {
  const roh = K / 5;
  const zehner = Math.pow(10, Math.floor(Math.log10(roh)));
  for (const f of [1, 2, 5, 10]) if (roh <= f * zehner) return f * zehner;
  return 10 * zehner;
}

// Hex/rgb-Farbe der Tokens mit Alpha versehen (Tokens sind hex oder rgb())
function farbeMitAlpha(farbe, alpha) {
  if (farbe.startsWith("#")) {
    let h = farbe.slice(1);
    if (h.length === 3) h = h.split("").map(c => c + c).join("");
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  const mm = farbe.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  if (mm) return `rgba(${mm[1]},${mm[2]},${mm[3]},${alpha})`;
  return farbe;
}

// ---------- Prüffälle (geschlossene Wachstumsformeln, ausgewertet bei t = 5) ----------
export const pruefFaelle = [
  { name: "N₀=1, k=0,5, K=100",  parameter: { N0: 1, k: 0.5, K: 100 }, toleranzProzent: 1, soll: { N_exp_t5: 12.1825, N_log_t5: 10.957, grenzwert: 100 } },
  { name: "N₀=10, k=0,2, K=200", parameter: { N0: 10, k: 0.2, K: 200 }, toleranzProzent: 1, soll: { N_exp_t5: 27.183, N_log_t5: 25.03, grenzwert: 200 } },
  { name: "N₀=5, k=0, K=50 (kein Wachstum)", parameter: { N0: 5, k: 0, K: 50 }, toleranzProzent: 1, soll: { N_exp_t5: 5, N_log_t5: 5, grenzwert: 50 } }
];
