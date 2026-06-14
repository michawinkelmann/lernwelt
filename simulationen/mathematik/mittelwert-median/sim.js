// Mittelwert und Median (Mathematik, Statistik, Klasse 7/8) — statisch:
// Fünf Datenwerte x1..x5 auf einem Zahlenstrahl von 0 bis 30.
//   Mittelwert (arithmetisch) = (x1 + x2 + x3 + x4 + x5) / 5
//   Median = mittlerer Wert der SORTIERTEN Liste (der 3. von 5)
// Lernziel: Ein einzelner Ausreißer zieht den Mittelwert stark, den Median kaum.
// Analytische Prüfung: Mittelwert und Median gegen von Hand bekannte Werte.

// ---------- Modell ----------

// Die fünf Werte als Array einsammeln (in Eingabereihenfolge x1..x5)
function werteListe(werte) {
  return [werte.wert1, werte.wert2, werte.wert3, werte.wert4, werte.wert5].map(w => w ?? 0);
}

// Mittelwert und Median berechnen. Median = 3. Wert der aufsteigend sortierten Liste.
function kennzahlen(werte) {
  const xs = werteListe(werte);
  const summe = xs.reduce((a, b) => a + b, 0);
  const mittelwert = summe / xs.length;            // 5 Werte
  const sortiert = [...xs].sort((a, b) => a - b);  // aufsteigend
  const median = sortiert[2];                       // mittlerer von fünf (Index 2)
  return { xs, sortiert, summe, mittelwert, median };
}

export const manifest = {
  id: "mathematik/mittelwert-median",
  titel: "Mittelwert und Median",
  modus: "statisch",
  raster: false,    // eigene Abbildung: ein Zahlenstrahl statt Meter-Karoraster
  werkzeuge: false, // Lineal/Winkelmesser helfen hier nicht weiter
  parameter: [
    { id: "wert1", label: "Wert x₁", einheit: "", min: 0, max: 30, schritt: 1, start: 4 },
    { id: "wert2", label: "Wert x₂", einheit: "", min: 0, max: 30, schritt: 1, start: 6 },
    { id: "wert3", label: "Wert x₃", einheit: "", min: 0, max: 30, schritt: 1, start: 7 },
    { id: "wert4", label: "Wert x₄", einheit: "", min: 0, max: 30, schritt: 1, start: 9 },
    { id: "wert5", label: "Wert x₅", einheit: "", min: 0, max: 30, schritt: 1, start: 12 }
  ],
  anzeigen: [
    { id: "mittelwert", label: "Mittelwert (arithmetisch)", einheit: "", stellen: 2 },
    { id: "median",     label: "Median (mittlerer Wert)",   einheit: "", stellen: 1 },
    { id: "summe",      label: "Summe der Werte",           einheit: "", stellen: 0 },
    { id: "spanne",     label: "Spannweite (max − min)",    einheit: "", stellen: 0 }
  ],
  presets: [
    { name: "symmetrisch",   werte: { wert1: 4, wert2: 6, wert3: 7, wert4: 8, wert5: 10 } },
    { name: "mit Ausreißer", werte: { wert1: 3, wert2: 4, wert3: 5, wert4: 6, wert5: 28 } },
    { name: "alle gleich",   werte: { wert1: 7, wert2: 7, wert3: 7, wert4: 7, wert5: 7 } }
  ],
  vorhersage: {
    frage: "Vier Werte liegen dicht beieinander. Jetzt kommt ein fünfter, sehr großer Ausreißer dazu. Was ändert sich stärker — Mittelwert oder Median?",
    optionen: [
      "Der Mittelwert ändert sich stärker",
      "Der Median ändert sich stärker",
      "Beide ändern sich gleich stark"
    ],
    aufloesung: "Der Mittelwert ändert sich stärker. In den Mittelwert geht jeder Wert mit seinem vollen Betrag ein — ein großer Ausreißer zieht ihn deutlich nach oben. Der Median dagegen ist nur der mittlere Wert der sortierten Liste; er beachtet die Ränge, nicht die Beträge. Solange der Ausreißer ganz außen liegt, bleibt der mittlere Wert fast unverändert. Deshalb sagt man: Der Median ist robust gegenüber Ausreißern, der Mittelwert nicht."
  },
  beobachtung: [
    "Verschiebe die fünf Werte und beobachte beide Marken auf dem Zahlenstrahl. Liegen Mittelwert und Median immer an derselben Stelle? Wann fallen sie auseinander?",
    "Baue einen Ausreißer ein: Lass x₁ bis x₄ klein und schiebe x₅ ganz nach rechts auf 30 (Preset „mit Ausreißer“). Wie weit wandert der Mittelwert? Wie weit der Median?",
    "Vergleiche die beiden Kennzahlen: Bei welcher Verteilung ist der Mittelwert größer als der Median, bei welcher kleiner? Hängt das davon ab, auf welcher Seite der Ausreißer sitzt?",
    "Stelle alle fünf Werte gleich groß ein (Preset „alle gleich“). Was zeigen Mittelwert und Median jetzt — und warum sind sie identisch?"
  ],
  modellgrenzen: "Hier sind es genau fünf Werte, also eine ungerade Anzahl: Der Median ist dann der mittlere (der 3.) Wert der sortierten Liste. Bei einer geraden Anzahl von Werten nimmt man stattdessen das Mittel der beiden mittleren Werte — dieser Fall kommt hier nicht vor. Die Werte sind außerdem auf ganze Zahlen von 0 bis 30 beschränkt.",
  bilanz: {
    mittelwert: { label: "Mittelwert", einheit: "", stellen: 2 },
    median:     { label: "Median",     einheit: "", stellen: 1 }
  }
};

// ---------- Engine-Schnittstelle (statisch: nur rechnen und zeichnen) ----------

export function init() { return { t: 0 }; }
export function update() {}
export function istFertig() { return true; }

export function messwerte(z, werte) {
  const k = kennzahlen(werte);
  const min = k.sortiert[0], max = k.sortiert[k.sortiert.length - 1];
  return { mittelwert: k.mittelwert, median: k.median, summe: k.summe, spanne: max - min };
}

export function bilanz(z, werte) {
  const k = kennzahlen(werte);
  return { mittelwert: k.mittelwert, median: k.median };
}

// Zahlenstrahl 0..30 (y nur als schmaler Streifen für die Marken genutzt)
export function weltBereich() {
  return { xMin: 0, xMax: 30, yMin: 0, yMax: 10 };
}

// ---------- Eigene Abbildung: Zahlenstrahl mit Datenpunkten und zwei Marken ----------

export function zeichne({ ctx, welt, werte, stil }) {
  const k = kennzahlen(werte);
  const Bx = welt.breite, By = welt.hoehe;

  // Eigene, breitenfüllende Abbildung des Zahlenstrahls (nur x relevant)
  const padL = 30, padR = 30;
  const xmin = 0, xmax = 30;
  const MX = x => padL + ((x - xmin) / (xmax - xmin)) * (Bx - padL - padR);

  // Höhenaufbau: oben Datenpunkte als Säulen, darunter die Achse, darunter die Marken
  const achseY = By * 0.60;                 // y-Position des Zahlenstrahls
  const saeuleBasis = achseY;               // Säulen stehen auf der Achse
  const saeuleMax = By * 0.14;              // y der höchsten Säulenspitze
  const markeUnten = By * 0.92;             // unterer Rand für die Marken-Beschriftung

  ctx.save();
  ctx.font = stil.schrift;
  const gross = stil.linienstaerke > 3;

  // --- Achse (Zahlenstrahl) mit Teilstrichen und Beschriftung 0,5,10,...,30 ---
  ctx.strokeStyle = stil.text;
  ctx.lineWidth = Math.max(1.5, stil.linienstaerke - 0.5);
  ctx.beginPath();
  ctx.moveTo(MX(xmin), achseY);
  ctx.lineTo(MX(xmax) + 8, achseY);
  ctx.stroke();
  // kleiner Pfeil am rechten Ende
  ctx.beginPath();
  ctx.moveTo(MX(xmax) + 8, achseY);
  ctx.lineTo(MX(xmax) + 2, achseY - 4);
  ctx.lineTo(MX(xmax) + 2, achseY + 4);
  ctx.closePath();
  ctx.fillStyle = stil.text;
  ctx.fill();

  ctx.strokeStyle = stil.beschriftung;
  ctx.fillStyle = stil.beschriftung;
  ctx.lineWidth = 1;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (let x = 0; x <= 30 + 1e-9; x += 1) {
    const gross5 = x % 5 === 0;
    const h = gross5 ? 7 : 4;
    ctx.beginPath();
    ctx.moveTo(MX(x), achseY - h);
    ctx.lineTo(MX(x), achseY + h);
    ctx.stroke();
    if (gross5) ctx.fillText(String(x), MX(x), achseY + 10);
  }

  // --- Datenpunkte als Säulen mit Wert-Beschriftung ---
  // Gleiche Werte versetzen, damit ihre Säulen nebeneinander sichtbar bleiben.
  const zaehler = {};
  const punkte = k.xs.map((x, i) => {
    const stufe = (zaehler[x] = (zaehler[x] || 0) + 1) - 1; // 0,1,2,... bei Dopplungen
    return { x, i, stufe };
  });
  const maxStufe = Math.max(0, ...punkte.map(p => p.stufe));
  const saeuleBreite = gross ? 12 : 9;

  punkte.forEach(p => {
    const px = MX(p.x);
    // gestapelte Höhe: jede gleiche Ausprägung legt einen weiteren Block obendrauf
    const hUnten = saeuleBasis - p.stufe * ((saeuleBasis - saeuleMax) / (maxStufe + 1));
    const hOben = saeuleBasis - (p.stufe + 1) * ((saeuleBasis - saeuleMax) / (maxStufe + 1));
    // Säule
    ctx.fillStyle = farbeMitAlpha(stil.text, 0.16);
    ctx.fillRect(px - saeuleBreite / 2, hOben, saeuleBreite, hUnten - hOben - 2);
    ctx.strokeStyle = farbeMitAlpha(stil.text, 0.55);
    ctx.lineWidth = 1;
    ctx.strokeRect(px - saeuleBreite / 2, hOben, saeuleBreite, hUnten - hOben - 2);
    // Datenpunkt (Kreis) auf der Säulenspitze
    ctx.beginPath();
    ctx.arc(px, hOben, gross ? 5 : 4, 0, 2 * Math.PI);
    ctx.fillStyle = stil.text;
    ctx.fill();
    // Wert-Beschriftung über dem obersten Punkt nur einmal je Position
    if (p.stufe === maxStufeAn(p.x, punkte)) {
      ctx.fillStyle = stil.text;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(String(p.x), px, hOben - (gross ? 9 : 7));
    }
  });

  // --- Marken: Mittelwert (akzent) und Median (ok) ---
  // Beide als senkrechte Linie von der Achse nach unten + Dreiecks-Zeiger + Beschriftung.
  const mwX = MX(k.mittelwert);
  const medX = MX(k.median);

  // Wenn beide Marken dicht beieinander liegen, Beschriftungen vertikal staffeln,
  // damit sie sich nicht überlappen.
  const nah = Math.abs(mwX - medX) < (gross ? 90 : 70);
  const yMW = achseY + 26;
  const yMed = nah ? achseY + 26 + (gross ? 30 : 24) : achseY + 26;

  zeichneMarke(ctx, stil, mwX, achseY, yMW, markeUnten, stil.akzent,
    "Mittelwert", formatDe(k.mittelwert, 2), gross, true);
  zeichneMarke(ctx, stil, medX, achseY, yMed, markeUnten, stil.ok,
    "Median", formatDe(k.median, 1), gross, !nah);

  // --- Legende oben links ---
  const lx = MX(0) + 4, ly = By * 0.05 + 8;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = farbeMitAlpha(stil.flaeche, 0.85);
  ctx.fillRect(lx - 6, ly - 14, gross ? 250 : 200, gross ? 56 : 44);
  // Mittelwert-Eintrag
  ctx.strokeStyle = stil.akzent;
  ctx.lineWidth = gross ? 4 : 3;
  ctx.beginPath(); ctx.moveTo(lx, ly - 4); ctx.lineTo(lx + 18, ly - 4); ctx.stroke();
  ctx.fillStyle = stil.text;
  ctx.fillText("Mittelwert", lx + 26, ly - 4);
  // Median-Eintrag
  const ly2 = ly + (gross ? 26 : 20);
  ctx.strokeStyle = stil.ok;
  ctx.beginPath(); ctx.moveTo(lx, ly2 - 4); ctx.lineTo(lx + 18, ly2 - 4); ctx.stroke();
  ctx.fillStyle = stil.text;
  ctx.fillText("Median", lx + 26, ly2 - 4);

  ctx.restore();
}

// höchste Stufe (oberster Block) an einer x-Position bestimmen
function maxStufeAn(x, punkte) {
  let m = 0;
  punkte.forEach(p => { if (p.x === x && p.stufe > m) m = p.stufe; });
  return m;
}

// Eine beschriftete Marke (senkrechte Linie + Dreieck + Text) zeichnen
function zeichneMarke(ctx, stil, x, achseY, textY, unten, farbe, name, wertText, gross, textLinks) {
  ctx.save();
  // senkrechte Linie von der Achse nach unten
  ctx.strokeStyle = farbe;
  ctx.lineWidth = gross ? 4 : 3;
  ctx.beginPath();
  ctx.moveTo(x, achseY - (gross ? 14 : 10));
  ctx.lineTo(x, textY + 2);
  ctx.stroke();
  // Dreiecks-Zeiger, der von oben auf die Achse zeigt
  ctx.beginPath();
  const s = gross ? 9 : 7;
  ctx.moveTo(x, achseY - (gross ? 14 : 10));
  ctx.lineTo(x - s, achseY - (gross ? 14 : 10) - s);
  ctx.lineTo(x + s, achseY - (gross ? 14 : 10) - s);
  ctx.closePath();
  ctx.fillStyle = farbe;
  ctx.fill();
  // Beschriftung mit Name und Wert
  ctx.fillStyle = farbe;
  ctx.textBaseline = "middle";
  ctx.font = (gross ? "bold 16px " : "bold 12px ") + "sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(name + " " + wertText, x, textY + (gross ? 12 : 10));
  ctx.restore();
}

// Deutsche Dezimaldarstellung mit fester Stellenzahl (z. B. 5,00 / 4,0)
function formatDe(wert, stellen) {
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

// ---------- Prüffälle (von Hand bekannte Mittelwerte und Mediane) ----------
// Median = 3. Wert der aufsteigend sortierten Liste; Mittelwert = Summe / 5.
export const pruefFaelle = [
  { name: "2,4,4,6,9", parameter: { wert1: 2, wert2: 4, wert3: 4, wert4: 6, wert5: 9 },
    toleranzProzent: 1, soll: { mittelwert: 5, median: 4 } },
  { name: "Ausreißer 1,2,3,4,30", parameter: { wert1: 1, wert2: 2, wert3: 3, wert4: 4, wert5: 30 },
    toleranzProzent: 1, soll: { mittelwert: 8, median: 3 } },
  { name: "alle gleich (5,5,5,5,5)", parameter: { wert1: 5, wert2: 5, wert3: 5, wert4: 5, wert5: 5 },
    toleranzProzent: 1, soll: { mittelwert: 5, median: 5 } }
];
