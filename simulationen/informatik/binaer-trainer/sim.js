// Binär-Trainer — vorzeichenlose 8-Bit-Zahlen (1 Byte) erkunden.
// Modus „statisch", direkt bedienbar: Auf eine Bit-Karte TIPPEN schaltet das Bit um (0 ↔ 1).
// Dezimalwert, gesetzte Stellenwerte und Summenformel werden sofort neu berechnet.

export const manifest = {
  id: "informatik/binaer-trainer",
  titel: "Binär-Trainer: 8 Bit",
  modus: "statisch",
  raster: false,
  werkzeuge: false,
  parameter: [],                 // keine Slider — die Bits werden direkt angetippt
  anzeigen: [
    { id: "dezimal", label: "Dezimalwert",   einheit: "", stellen: 0 },
    { id: "einsen",  label: "gesetzte Bits", einheit: "", stellen: 0 }
  ],
  presets: [
    { name: "Elf (Beispiel von der Themenseite)", werte: { b7: 0, b6: 0, b5: 0, b4: 0, b3: 1, b2: 0, b1: 1, b0: 1 } },
    { name: "Alle an: Maximum",    werte: { b7: 1, b6: 1, b5: 1, b4: 1, b3: 1, b2: 1, b1: 1, b0: 1 } },
    { name: "Nur das höchste Bit", werte: { b7: 1, b6: 0, b5: 0, b4: 0, b3: 0, b2: 0, b1: 0, b0: 0 } },
    { name: "Zweierpotenz 16",     werte: { b7: 0, b6: 0, b5: 0, b4: 1, b3: 0, b2: 0, b1: 0, b0: 0 } }
  ],
  vorhersage: {
    frage: "Alle 8 Bits stehen auf 1. Welcher Dezimalwert entsteht?",
    optionen: ["255", "256", "128"],
    aufloesung: "255, denn 128 + 64 + 32 + 16 + 8 + 4 + 2 + 1 = 255 = 2⁸ − 1. Warum nicht 256? Mit 8 Bit gibt es zwar 2⁸ = 256 verschiedene Bitmuster — aber die Zählung beginnt bei 0, deshalb ist die größte Zahl um 1 kleiner als 2⁸. Für die 256 selbst bräuchte man ein neuntes Bit."
  },
  beobachtung: [
    "Stelle die Zahl 100 ein, indem du die passenden Bits antippst. Welche brauchst du? Tipp: Beginne mit dem größten Stellenwert, der noch in die Zahl passt.",
    "Stelle 00000101 (= 5) ein und schiebe gedanklich alle Bits eine Position nach links (00001010). Was macht das mit dem Dezimalwert? Prüfe es durch Antippen.",
    "Schalte nacheinander immer genau ein Bit an (erst Bit 0, dann Bit 1, …): Welche Zahlenfolge entsteht, und wie hängt jeder Wert mit dem vorigen zusammen?",
    "Wie viele verschiedene Zahlen sind mit 8 Bit möglich? Bestimme die kleinste und die größte einstellbare Zahl und begründe damit deine Antwort."
  ],
  modellgrenzen: "Vorzeichenlose 8-Bit-Zahlen (1 Byte): ganze Zahlen von 0 bis 255. Negative Zahlen (Zweierkomplement) und größere Zahlbereiche kommen später.",
  bilanz: {
    dezimal: { label: "Dezimalwert",   einheit: "", stellen: 0 },
    einsen:  { label: "gesetzte Bits", einheit: "", stellen: 0 }
  },
  welt: { xMin: 0, xMax: 10, yMin: 0, yMax: 5 }
};

// Geometrie der Bit-Karten (von zeichne UND zeiger genutzt)
const KARTE = { breite: 1.0, abstand: 0.15, yU: 2.1, yO: 3.8 };
function kartenX0() { return (10 - (8 * KARTE.breite + 7 * KARTE.abstand)) / 2; }

// Reglerwerte/Preset-Werte → Bitliste [b7 … b0]
function leseBits(p) {
  return [7, 6, 5, 4, 3, 2, 1, 0].map(i => (p["b" + i] >= 0.5 ? 1 : 0));
}
function neuBerechnen(z) {
  z.summanden = z.bits.map((b, i) => b * 2 ** (7 - i)).filter(w => w > 0);
  z.dezimal = z.summanden.reduce((s, w) => s + w, 0);
  z.einsen = z.bits.reduce((s, b) => s + b, 0);
}

export function init(p) {
  const hatBits = [7, 6, 5, 4, 3, 2, 1, 0].some(i => p["b" + i] !== undefined);
  const bits = hatBits ? leseBits(p) : [0, 0, 0, 0, 1, 0, 1, 1]; // Start: 11 als Beispiel
  const z = { t: 0, bits };
  neuBerechnen(z);
  return z;
}

export function update() { /* statisch: nichts zu tun */ }
export function messwerte(z) { return { dezimal: z.dezimal, einsen: z.einsen }; }
export function istFertig() { return true; }
export function bilanz(z) { return { dezimal: z.dezimal, einsen: z.einsen }; }

// Klick/Tipp auf eine Bit-Karte schaltet das Bit um
export function zeiger({ x, y, zustand: z }) {
  if (y < KARTE.yU || y > KARTE.yO) return false;
  const x0 = kartenX0();
  for (let i = 0; i < 8; i++) {
    const xL = x0 + i * (KARTE.breite + KARTE.abstand);
    if (x >= xL && x <= xL + KARTE.breite) {
      z.bits[i] = z.bits[i] ? 0 : 1;
      neuBerechnen(z);
      return true;
    }
  }
  return false;
}

const HOCH = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷"];

export function zeichne({ ctx, welt, zustand: z, stil }) {
  const { breite, abstand, yU, yO } = KARTE;
  const x0 = kartenX0();
  const kBreite = welt.laenge(breite);
  const kHoehe = welt.laenge(yO - yU);
  const schrift = (einheiten, minPx) => Math.max(minPx, Math.round(welt.laenge(einheiten)));
  ctx.textAlign = "center";

  // Hinweis oben: direkt antippen
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = stil.beschriftung;
  ctx.font = `${schrift(0.32, 11)}px sans-serif`;
  ctx.fillText("Tippe ein Bit an, um es umzuschalten (0 ↔ 1)", welt.px(5), welt.py(4.78));

  for (let i = 0; i < 8; i++) {
    const bitNr = 7 - i;
    const bit = z.bits[i];
    const xL = x0 + i * (breite + abstand);
    const xM = welt.px(xL + breite / 2);

    // Stellenwert über der Karte
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = stil.beschriftung;
    ctx.font = `${schrift(0.26, 9)}px sans-serif`;
    ctx.fillText("2" + HOCH[bitNr], xM, welt.py(4.4));
    ctx.fillStyle = stil.text;
    ctx.font = `bold ${schrift(0.32, 10)}px sans-serif`;
    ctx.fillText(String(2 ** bitNr), xM, welt.py(4.0));

    // Karte: gesetzte Bits gefüllt (Akzent) + dickerer Rahmen
    ctx.fillStyle = bit ? stil.akzent : stil.hauch;
    ctx.fillRect(welt.px(xL), welt.py(yO), kBreite, kHoehe);
    ctx.strokeStyle = bit ? stil.text : stil.beschriftung;
    ctx.lineWidth = bit ? stil.linienstaerke + 2 : 1;
    ctx.strokeRect(welt.px(xL), welt.py(yO), kBreite, kHoehe);

    // Bit-Ziffer groß in der Kartenmitte
    ctx.textBaseline = "middle";
    ctx.fillStyle = bit ? stil.flaeche : stil.text;
    ctx.font = `bold ${schrift(0.85, 16)}px sans-serif`;
    ctx.fillText(String(bit), xM, welt.py((yU + yO) / 2));

    // Bit-Nummer unter der Karte
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = stil.beschriftung;
    ctx.font = `${schrift(0.24, 9)}px sans-serif`;
    ctx.fillText("Bit " + bitNr, xM, welt.py(1.7));
  }

  // Summenformel + Binärstring
  ctx.textBaseline = "middle";
  ctx.fillStyle = stil.text;
  ctx.font = `bold ${schrift(0.42, 12)}px sans-serif`;
  const formel = z.summanden.length ? z.summanden.join(" + ") + " = " + z.dezimal : "Kein Bit gesetzt — Wert 0";
  ctx.fillText(formel, welt.px(5), welt.py(1.1));
  ctx.fillStyle = stil.akzent;
  ctx.font = `${schrift(0.34, 11)}px ui-monospace, Consolas, monospace`;
  ctx.fillText(z.bits.join("") + "₂", welt.px(5), welt.py(0.45));
}

// ---------- Prüffälle (Stellenwertsumme analytisch bekannt) ----------
export const pruefFaelle = [
  { name: "00001011 (Bits 3, 1, 0)", parameter: { b7: 0, b6: 0, b5: 0, b4: 0, b3: 1, b2: 0, b1: 1, b0: 1 }, toleranzProzent: 0.1, soll: { dezimal: 11, einsen: 3 } },
  { name: "11111111 (alle Bits gesetzt)", parameter: { b7: 1, b6: 1, b5: 1, b4: 1, b3: 1, b2: 1, b1: 1, b0: 1 }, toleranzProzent: 0.1, soll: { dezimal: 255, einsen: 8 } },
  { name: "10000000 (nur das höchste Bit)", parameter: { b7: 1, b6: 0, b5: 0, b4: 0, b3: 0, b2: 0, b1: 0, b0: 0 }, toleranzProzent: 0.1, soll: { dezimal: 128, einsen: 1 } }
];
