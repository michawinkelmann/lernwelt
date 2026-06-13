// Binär-Trainer — vorzeichenlose 8-Bit-Zahlen (1 Byte) erkunden.
// Modus „statisch": Acht Bit-Schalter (Regler links = 0, rechts = 1) — Dezimalwert,
// gesetzte Stellenwerte und Summenformel werden bei jeder Änderung sofort neu berechnet.

export const manifest = {
  id: "informatik/binaer-trainer",
  titel: "Binär-Trainer: 8 Bit",
  modus: "statisch",
  raster: false,
  werkzeuge: false,
  parameter: [
    { id: "b7", label: "Bit 7 (128)", einheit: "", min: 0, max: 1, schritt: 1, start: 0 },
    { id: "b6", label: "Bit 6 (64)",  einheit: "", min: 0, max: 1, schritt: 1, start: 0 },
    { id: "b5", label: "Bit 5 (32)",  einheit: "", min: 0, max: 1, schritt: 1, start: 0 },
    { id: "b4", label: "Bit 4 (16)",  einheit: "", min: 0, max: 1, schritt: 1, start: 0 },
    { id: "b3", label: "Bit 3 (8)",   einheit: "", min: 0, max: 1, schritt: 1, start: 1 },
    { id: "b2", label: "Bit 2 (4)",   einheit: "", min: 0, max: 1, schritt: 1, start: 0 },
    { id: "b1", label: "Bit 1 (2)",   einheit: "", min: 0, max: 1, schritt: 1, start: 1 },
    { id: "b0", label: "Bit 0 (1)",   einheit: "", min: 0, max: 1, schritt: 1, start: 1 }
  ],
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
    "Stelle die Zahl 100 ein. Welche Bits brauchst du? Tipp: Beginne mit dem größten Stellenwert, der noch in die Zahl passt.",
    "Vergleiche 00000101 (= 5) und 00001010: Alle Bits rücken eine Position nach links. Was macht das mit dem Dezimalwert? Prüfe deine Vermutung an einem weiteren Beispiel.",
    "Schalte nacheinander immer genau ein Bit an (Bit 0, dann Bit 1, …): Welche Zahlenfolge entsteht, und wie hängt jeder Wert mit dem vorigen zusammen?",
    "Wie viele verschiedene Zahlen sind mit 8 Bit möglich? Bestimme die kleinste und die größte einstellbare Zahl und begründe damit deine Antwort."
  ],
  modellgrenzen: "Vorzeichenlose 8-Bit-Zahlen (1 Byte): ganze Zahlen von 0 bis 255. Negative Zahlen (Zweierkomplement) und größere Zahlbereiche kommen später.",
  bilanz: {
    dezimal: { label: "Dezimalwert",   einheit: "", stellen: 0 },
    einsen:  { label: "gesetzte Bits", einheit: "", stellen: 0 }
  },
  welt: { xMin: 0, xMax: 10, yMin: 0, yMax: 5 }
};

// Reglerwerte → Bitliste [b7 … b0]; Hash-Werte können Fließkomma sein, daher Schwelle 0,5
function leseBits(p) {
  return [7, 6, 5, 4, 3, 2, 1, 0].map(i => (p["b" + i] >= 0.5 ? 1 : 0));
}

export function init(p) {
  const bits = leseBits(p);
  const summanden = bits.map((b, i) => b * 2 ** (7 - i)).filter(w => w > 0);
  return {
    t: 0,
    bits,                                          // [Bit 7 … Bit 0], links das höchstwertige
    summanden,                                     // gesetzte Stellenwerte absteigend, z. B. [8, 2, 1]
    dezimal: summanden.reduce((s, w) => s + w, 0),
    einsen: bits.reduce((s, b) => s + b, 0)
  };
}

export function update() { /* statisch: nichts zu tun */ }

export function messwerte(z) {
  return { dezimal: z.dezimal, einsen: z.einsen };
}

export function istFertig() { return true; }

export function bilanz(z) {
  return { dezimal: z.dezimal, einsen: z.einsen };
}

// Hochgestellte Exponenten für die Stellenwert-Beschriftung 2⁰ … 2⁷
const HOCH = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷"];

export function zeichne({ ctx, welt, zustand: z, stil }) {
  // Acht Bit-Karten nebeneinander; Welt fest 0..10 × 0..5 (siehe manifest.welt)
  const breite = 1.0, abstand = 0.15;
  const x0 = (10 - (8 * breite + 7 * abstand)) / 2;
  const yU = 2.1, yO = 3.8;                        // Unter-/Oberkante der Karten
  const kBreite = welt.laenge(breite);
  const kHoehe = welt.laenge(yO - yU);
  // Schriftgrößen skalieren mit der Weltgröße, mit Untergrenze für schmale Handys
  const schrift = (einheiten, minPx) => Math.max(minPx, Math.round(welt.laenge(einheiten)));

  ctx.textAlign = "center";

  for (let i = 0; i < 8; i++) {
    const bitNr = 7 - i;                           // links steht Bit 7
    const bit = z.bits[i];
    const xL = x0 + i * (breite + abstand);
    const xM = welt.px(xL + breite / 2);           // Kartenmitte in Pixeln

    // Karte: gesetzte Bits gefüllt (Akzent) UND mit dickerem Rahmen — nie nur Farbe
    ctx.fillStyle = bit ? stil.akzent : stil.hauch;
    ctx.fillRect(welt.px(xL), welt.py(yO), kBreite, kHoehe);
    ctx.strokeStyle = bit ? stil.text : stil.beschriftung;
    ctx.lineWidth = bit ? stil.linienstaerke + 2 : 1;
    ctx.strokeRect(welt.px(xL), welt.py(yO), kBreite, kHoehe);

    // Stellenwert über der Karte: klein die Zweierpotenz, darunter ihr Wert
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = stil.beschriftung;
    ctx.font = `${schrift(0.26, 9)}px sans-serif`;
    ctx.fillText("2" + HOCH[bitNr], xM, welt.py(4.55));
    ctx.fillStyle = stil.text;
    ctx.font = `bold ${schrift(0.32, 10)}px sans-serif`;
    ctx.fillText(String(2 ** bitNr), xM, welt.py(4.05));

    // Bit-Ziffer groß in der Kartenmitte — die 0/1 ist das farbunabhängige Signal
    ctx.textBaseline = "middle";
    ctx.fillStyle = bit ? stil.flaeche : stil.text;
    ctx.font = `bold ${schrift(0.85, 16)}px sans-serif`;
    ctx.fillText(String(bit), xM, welt.py((yU + yO) / 2));

    // Bit-Nummer unter der Karte (Zuordnung zu den Reglern)
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = stil.beschriftung;
    ctx.font = `${schrift(0.24, 9)}px sans-serif`;
    ctx.fillText("Bit " + bitNr, xM, welt.py(1.7));
  }

  // Summenformel nur mit den gesetzten Stellenwerten, darunter der Binärstring
  ctx.textBaseline = "middle";
  ctx.fillStyle = stil.text;
  ctx.font = `bold ${schrift(0.42, 12)}px sans-serif`;
  const formel = z.summanden.length
    ? z.summanden.join(" + ") + " = " + z.dezimal
    : "Kein Bit gesetzt — Wert 0";
  ctx.fillText(formel, welt.px(5), welt.py(1.1));

  ctx.fillStyle = stil.akzent;
  ctx.font = `${schrift(0.34, 11)}px ui-monospace, Consolas, monospace`;
  ctx.fillText(z.bits.join("") + "₂", welt.px(5), welt.py(0.45));
}

// ---------- Prüffälle (Stellenwertsumme analytisch bekannt) ----------

export const pruefFaelle = [
  {
    name: "00001011 (Bits 3, 1, 0)",
    parameter: { b7: 0, b6: 0, b5: 0, b4: 0, b3: 1, b2: 0, b1: 1, b0: 1 },
    toleranzProzent: 0.1,
    soll: { dezimal: 11, einsen: 3 }
  },
  {
    name: "11111111 (alle Bits gesetzt)",
    parameter: { b7: 1, b6: 1, b5: 1, b4: 1, b3: 1, b2: 1, b1: 1, b0: 1 },
    toleranzProzent: 0.1,
    soll: { dezimal: 255, einsen: 8 }
  },
  {
    name: "10000000 (nur das höchste Bit)",
    parameter: { b7: 1, b6: 0, b5: 0, b4: 0, b3: 0, b2: 0, b1: 0, b0: 0 },
    toleranzProzent: 0.1,
    soll: { dezimal: 128, einsen: 1 }
  }
];
