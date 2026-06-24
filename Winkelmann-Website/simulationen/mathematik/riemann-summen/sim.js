// Riemann-Summen (Oberstufe, Integralanwendungen) — statisch: Schieberegler n und b.
// Beispielfunktion f(x) = x^2 auf [0, b]. Unter- und Obersumme rahmen den exakten
// Flaecheninhalt (das Integral b^3/3) ein; mit wachsendem n schrumpft die Luecke gegen 0.
// Analytische Pruefung: Riemann-Summen der Sim gegen die geschlossenen Summenformeln.

function f(x) { return x * x; }

function riemann(werte) {
  const n = Math.max(1, Math.round(werte.n ?? 8));
  const b = werte.b ?? 2;
  const dx = b / n;
  let U = 0, O = 0;
  for (let i = 0; i < n; i++) {
    U += f(i * dx) * dx;          // f waechst -> Minimum am linken Rand
    O += f((i + 1) * dx) * dx;    // Maximum am rechten Rand
  }
  return { n, b, dx, U, O, integral: b * b * b / 3 };
}

export const manifest = {
  id: "mathematik/riemann-summen",
  titel: "Riemann-Summen",
  modus: "statisch",
  raster: false,
  werkzeuge: false,
  parameter: [
    { id: "n", label: "Anzahl Rechtecke n", einheit: "", min: 1, max: 100, schritt: 1, start: 8 },
    { id: "b", label: "rechte Grenze b", einheit: "", min: 1, max: 4, schritt: 0.5, start: 2 }
  ],
  anzeigen: [
    { id: "U",   label: "Untersumme",       einheit: "", stellen: 3 },
    { id: "O",   label: "Obersumme",        einheit: "", stellen: 3 },
    { id: "I",   label: "exaktes Integral", einheit: "", stellen: 3 },
    { id: "diff",label: "Obersumme − Untersumme", einheit: "", stellen: 3 }
  ],
  presets: [
    { name: "grob (n = 4)",   werte: { n: 4, b: 2 } },
    { name: "fein (n = 40)",  werte: { n: 40, b: 2 } },
    { name: "sehr fein (100)",werte: { n: 100, b: 2 } }
  ],
  vorhersage: {
    frage: "Du vergrößerst die Anzahl der Rechtecke n immer weiter. Wie verhalten sich Unter- und Obersumme?",
    optionen: [
      "Beide nähern sich dem exakten Flächeninhalt — von unten bzw. von oben",
      "Die Untersumme wächst über das Integral hinaus",
      "Der Abstand zwischen beiden bleibt gleich groß"
    ],
    aufloesung: "Beide nähern sich dem exakten Flächeninhalt an: Die Untersumme bleibt stets darunter, die Obersumme stets darüber, und die Lücke (Obersumme − Untersumme) schrumpft mit wachsendem n gegen 0. Genau dieser Grenzwert ist das bestimmte Integral — hier ∫₀ᵇ x² dx = b³/3."
  },
  beobachtung: [
    "Starte mit n = 4 und lies Unter-, Obersumme und das exakte Integral ab. Das Integral liegt immer zwischen beiden.",
    "Schiebe n langsam hoch (Presets „fein“, „sehr fein“): Wie verändert sich „Obersumme − Untersumme“? Gegen welchen Wert läuft die Differenz?",
    "Stelle n = 1 ein: Jetzt siehst du die gröbste Schätzung — ein einziges Rechteck pro Summe. Wie weit liegen Unter- und Obersumme auseinander?",
    "Ändere die rechte Grenze b und prüfe das exakte Integral gegen die Formel b³/3 (z. B. b = 3 → 9)."
  ],
  modellgrenzen: "Beispiel mit f(x) = x² auf [0, b]; weil f hier monoton steigt, sitzt das Minimum jeweils links (Untersumme) und das Maximum rechts (Obersumme). Die Rechtecksummen sind stets nur Näherungen — den exakten Flächeninhalt liefert erst der Grenzwert n → ∞, also das Integral.",
  bilanz: {
    U: { label: "Untersumme", einheit: "", stellen: 5 },
    O: { label: "Obersumme",  einheit: "", stellen: 5 },
    integral: { label: "Integral b³/3", einheit: "", stellen: 5 }
  }
};

export function init() { return { t: 0 }; }
export function update() {}
export function istFertig() { return true; }

export function messwerte(z, werte) {
  const r = riemann(werte);
  return { U: r.U, O: r.O, I: r.integral, diff: r.O - r.U };
}

export function bilanz(z, werte) {
  const r = riemann(werte);
  return { U: r.U, O: r.O, integral: r.integral };
}

export function weltBereich(werte) {
  const b = werte.b ?? 2;
  return { xMin: -0.18 * b, xMax: b * 1.12, yMin: -0.12 * b * b, yMax: b * b * 1.14 };
}

export function zeichne({ ctx, welt, werte, stil }) {
  const r = riemann(werte);
  const { n, b, dx } = r;
  // Eigene, flaechenfuellende Abbildung (x und y unabhaengig skaliert) -> nutzt die ganze Breite
  const Bx = welt.breite, By = welt.hoehe;
  const padL = 50, padR = 26, padT = 22, padB = 38;
  const xmax = b * 1.08, ymax = b * b * 1.12;
  const MX = x => padL + (x / xmax) * (Bx - padL - padR);
  const MY = y => (By - padB) - (y / ymax) * (By - padT - padB);
  ctx.save();
  ctx.font = stil.schrift;

  // Achsen
  ctx.strokeStyle = stil.beschriftung; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(MX(0), MY(0)); ctx.lineTo(MX(xmax), MY(0));
  ctx.moveTo(MX(0), MY(0)); ctx.lineTo(MX(0), MY(ymax));
  ctx.stroke();
  ctx.fillStyle = stil.beschriftung; ctx.textAlign = "center"; ctx.textBaseline = "top";
  for (let xi = 1; xi <= b + 1e-9; xi++) {
    ctx.beginPath(); ctx.moveTo(MX(xi), MY(0) - 3); ctx.lineTo(MX(xi), MY(0) + 3); ctx.stroke();
    ctx.fillText(String(xi), MX(xi), MY(0) + 5);
  }
  ctx.fillText("x", MX(xmax), MY(0) + 5);
  ctx.textAlign = "right"; ctx.textBaseline = "middle";
  const yStep = b * b <= 4 ? 1 : (b * b <= 9 ? 2 : 4);
  for (let yi = yStep; yi <= b * b + 1e-9; yi += yStep) {
    ctx.beginPath(); ctx.moveTo(MX(0) - 3, MY(yi)); ctx.lineTo(MX(0) + 3, MY(yi)); ctx.stroke();
    ctx.fillText(String(yi), MX(0) - 6, MY(yi));
  }

  // Rechtecke: Untersumme (gefuellt) + Obersumme-Aufschlag (rot, halbtransparent)
  for (let i = 0; i < n; i++) {
    const x0 = i * dx, hU = f(x0), hO = f((i + 1) * dx);
    const xa = MX(x0), xb = MX(x0 + dx);
    ctx.fillStyle = farbeMitAlpha(stil.fehler, 0.22);
    ctx.fillRect(xa, MY(hO), xb - xa, MY(hU) - MY(hO));
    ctx.fillStyle = farbeMitAlpha(stil.akzent, 0.30);
    ctx.fillRect(xa, MY(hU), xb - xa, MY(0) - MY(hU));
    if (n <= 40) {
      ctx.lineWidth = 1;
      ctx.strokeStyle = farbeMitAlpha(stil.akzent, 0.6); ctx.strokeRect(xa, MY(hU), xb - xa, MY(0) - MY(hU));
      ctx.strokeStyle = farbeMitAlpha(stil.fehler, 0.5); ctx.strokeRect(xa, MY(hO), xb - xa, MY(hU) - MY(hO));
    }
  }

  // Kurve y = x^2
  ctx.strokeStyle = stil.text; ctx.lineWidth = stil.linienstaerke;
  ctx.beginPath();
  for (let sgt = 0; sgt <= 160; sgt++) {
    const x = xmax * sgt / 160, y = f(x);
    if (sgt === 0) ctx.moveTo(MX(x), MY(y)); else ctx.lineTo(MX(x), MY(y));
  }
  ctx.stroke();
  ctx.fillStyle = stil.text; ctx.textAlign = "left"; ctx.textBaseline = "bottom";
  ctx.fillText("y = x²", MX(b * 0.6) + 4, MY(f(b * 0.6)) - 4);

  // Legende (oben links, mit Hintergrund, klar neben der y-Achse)
  const lx = MX(0) + 16, ly = padT + 14, gross = stil.linienstaerke > 3;
  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.fillStyle = farbeMitAlpha(stil.flaeche, 0.86);
  ctx.fillRect(lx - 8, ly - 14, gross ? 320 : 250, gross ? 56 : 44);
  ctx.fillStyle = farbeMitAlpha(stil.akzent, 0.30); ctx.fillRect(lx, ly - 6, 14, 12);
  ctx.strokeStyle = farbeMitAlpha(stil.akzent, 0.6); ctx.lineWidth = 1; ctx.strokeRect(lx, ly - 6, 14, 12);
  ctx.fillStyle = stil.text; ctx.fillText("Untersumme", lx + 20, ly);
  const ly2 = ly + (gross ? 26 : 20);
  ctx.fillStyle = farbeMitAlpha(stil.fehler, 0.22); ctx.fillRect(lx, ly2 - 6, 14, 12);
  ctx.strokeStyle = farbeMitAlpha(stil.fehler, 0.5); ctx.strokeRect(lx, ly2 - 6, 14, 12);
  ctx.fillStyle = stil.text; ctx.fillText("Aufschlag bis zur Obersumme", lx + 20, ly2);

  ctx.restore();
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

// ---------- Prueffaelle (geschlossene Summenformeln fuer f(x)=x^2) ----------
// Untersumme = (b/n)^3 * (n-1)n(2n-1)/6 ; Obersumme = (b/n)^3 * n(n+1)(2n+1)/6 ; Integral = b^3/3
export const pruefFaelle = [
  { name: "b = 2, n = 4", parameter: { b: 2, n: 4 }, toleranzProzent: 0.1, soll: { U: 1.75, O: 3.75, integral: 2.66667 } },
  { name: "b = 3, n = 6", parameter: { b: 3, n: 6 }, toleranzProzent: 0.1, soll: { U: 6.875, O: 11.375, integral: 9 } },
  { name: "b = 2, n = 1 (grob)", parameter: { b: 2, n: 1 }, toleranzProzent: 0.1, soll: { U: 0, O: 8, integral: 2.66667 } },
  { name: "b = 4, n = 8", parameter: { b: 4, n: 8 }, toleranzProzent: 0.1, soll: { U: 17.5, O: 25.5, integral: 21.33333 } }
];
