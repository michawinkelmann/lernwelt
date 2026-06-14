// Energieniveaus und Spektrallinien (Wasserstoff) — statisch-interaktiv: Lernende wählen
// zwei Energieniveaus n_hoch und n_tief des Wasserstoffatoms (Bohr-Modell). Beim Übergang
// des Elektrons vom höheren auf das tiefere Niveau wird ein Lichtteilchen (Photon)
// ausgesandt. Die Sim zeigt das Energieniveau-Schema, den Übergangspfeil, die Photonenergie
// ΔE und die Wellenlänge λ — und färbt die Spektrallinie physikalisch, wenn sie im
// sichtbaren Bereich liegt (Balmer-Serie, n_tief = 2).
//
// Modell (Bohr-Modell des Wasserstoffatoms, rein algebraisch, keine Zeitentwicklung):
//   Energieniveaus:  E_n = −13,6 eV / n²            (n = 1, 2, 3, …)
//   Übergangsenergie (Emission, n_hoch -> n_tief):
//     ΔE = 13,6 eV · (1/n_tief² − 1/n_hoch²)
//   damit ΔE ≥ 0 ist, wird mit nlow = min(n_hoch, n_tief) und nhigh = max(...) gerechnet:
//     ΔE = 13,6 eV · (1/nlow² − 1/nhigh²)
//   Wellenlänge:     λ = 1240 eV·nm / ΔE            (λ in nm; 1240 eV·nm ≈ h·c)
//   Bei n_hoch == n_tief gibt es keinen Übergang: ΔE = 0 und λ = 0.
//
// Modus „statisch“: init(p) baut den kompletten Zustand aus den Parametern, istFertig()
// liefert sofort true, update() ist leer. Die Prüffälle laufen dadurch ohne Animation:
// die Engine setzt die Parameter, init übernimmt sie, bilanz(z, p) rechnet das Ergebnis.

import { formatZahl } from "../../../assets/js/sim/welt.js";

// ---------- Modell (rein, in Node lauffähig) ----------

const E_RY = 13.6;       // Rydberg-Energie in eV (Betrag der Grundzustandsenergie)
const HC = 1240;         // h·c in eV·nm (Näherung)

// Energieniveau E_n in eV (negativ, gebundener Zustand)
function energie(n) {
  return -E_RY / (n * n);
}

// Übergangsenergie und Wellenlänge aus den beiden Niveaus.
// Liefert {nlow, nhigh, deltaE, lambda} — deltaE ≥ 0, bei gleichem Niveau 0.
function uebergang(nHoch, nTief) {
  const nlow = Math.min(nHoch, nTief);
  const nhigh = Math.max(nHoch, nTief);
  const deltaE = nlow === nhigh
    ? 0
    : E_RY * (1 / (nlow * nlow) - 1 / (nhigh * nhigh));
  const lambda = deltaE > 0 ? HC / deltaE : 0;
  return { nlow, nhigh, deltaE, lambda };
}

// Spektralfarbe einer Wellenlänge im sichtbaren Bereich (ca. 380–750 nm).
// Außerhalb (UV/IR) -> null. Vereinfachte, didaktisch brauchbare Zuordnung.
function spektralFarbe(lambda) {
  if (lambda < 380 || lambda > 750) return null;
  if (lambda < 430) return "#7a3fe0";   // violett
  if (lambda < 490) return "#2f6fe0";   // blau / blaugrün
  if (lambda < 560) return "#2faa3a";   // grün
  if (lambda < 590) return "#e0c020";   // gelb
  if (lambda < 640) return "#e08020";   // orange
  return "#e0322a";                      // rot
}

export const manifest = {
  id: "physik/atomhuelle",
  titel: "Energieniveaus und Spektrallinien (Wasserstoff)",
  modus: "statisch",
  raster: false,        // Energieniveau-Schema statt Koordinatenraster
  werkzeuge: false,     // Lineal/Winkelmesser ergeben am Niveauschema keinen Sinn
  parameter: [
    { id: "n_hoch", label: "Oberes Niveau n (Start des Übergangs)", einheit: "", min: 2, max: 6, schritt: 1, start: 3 },
    { id: "n_tief", label: "Unteres Niveau n (Ziel des Übergangs)", einheit: "", min: 1, max: 5, schritt: 1, start: 2 }
  ],
  anzeigen: [
    { id: "deltaE",    label: "Photonenergie ΔE", einheit: "eV", stellen: 2 },
    { id: "lambda_nm", label: "Wellenlänge λ",    einheit: "nm", stellen: 0 }
  ],
  presets: [
    { name: "H-α (n=3→2, rot)",      werte: { n_hoch: 3, n_tief: 2 } },
    { name: "H-β (n=4→2, blaugrün)", werte: { n_hoch: 4, n_tief: 2 } },
    { name: "Lyman (n=2→1, UV)",     werte: { n_hoch: 2, n_tief: 1 } }
  ],
  vorhersage: {
    frage: "Beim Übergang von n = 3 auf n = 2 sendet Wasserstoff rotes Licht aus. Was erwartest du beim Übergang von n = 4 auf n = 2?",
    optionen: [
      "Kürzere Wellenlänge (blaugrünes Licht), weil der Energiesprung größer ist",
      "Längere Wellenlänge (tiefrotes Licht), weil der Sprung weiter ist",
      "Gleiche Farbe wie bei n = 3 → 2, das Ziel ist ja dasselbe"
    ],
    aufloesung: "Kürzere Wellenlänge, blaugrünes Licht. Das Ziel (n = 2) ist gleich, aber n = 4 liegt energetisch höher als n = 3. Der Sprung n = 4 → 2 setzt deshalb mehr Energie frei als n = 3 → 2. Größere Photonenergie ΔE bedeutet wegen λ = 1240 eV·nm / ΔE eine kürzere Wellenlänge — das Licht verschiebt sich von Rot (656 nm, H-α) zu Blaugrün (486 nm, H-β)."
  },
  beobachtung: [
    "Stelle das untere Niveau fest auf n_tief = 2 (Balmer-Serie) und probiere für das obere Niveau nacheinander n = 3, 4, 5, 6 durch. Notiere jedes Mal die Wellenlänge λ. Alle diese Linien liegen im sichtbaren Bereich — das ist das sichtbare Linienspektrum des Wasserstoffs.",
    "Bleibe in der Balmer-Serie (n_tief = 2): Je größer der Energiesprung ΔE wird (also je höher das obere Niveau liegt), desto kürzer wird die Wellenlänge λ. Größerer Sprung → kürzere Wellenlänge → die Farbe wandert von Rot über Blaugrün nach Violett.",
    "Stelle jetzt n_tief = 1 ein (Lyman-Serie). Lies die Wellenlängen ab: Sie sind viel kürzer als 380 nm — diese Linien liegen im Ultravioletten und sind für das Auge unsichtbar. Der Sprung bis ganz nach unten (n = 1) gibt am meisten Energie ab.",
    "Schau dir die waagerechten Niveaulinien im Diagramm an: Nach oben hin (große n) rücken sie immer dichter zusammen und nähern sich der Linie E = 0. Deshalb werden auch die Energiesprünge zwischen benachbarten hohen Niveaus immer kleiner."
  ],
  modellgrenzen: "Es gilt das Bohr-Modell des Wasserstoffatoms (ein Elektron, ein Proton). Gezeigt wird nur die Emission (Aussendung) von Licht beim Sprung nach unten; die Absorption (Aufnahme) läuft umgekehrt. Reale Atome mit mehreren Elektronen sind deutlich komplexer (Feinstruktur, weitere Niveaus, Linienaufspaltung). Der Wert 1240 eV·nm ist eine gerundete Näherung für das Produkt h·c.",
  bilanz: {
    deltaE:    { label: "Photonenergie ΔE", einheit: "eV", stellen: 2 },
    lambda_nm: { label: "Wellenlänge λ",    einheit: "nm", stellen: 0 }
  }
};

// init: kompletter Zustand aus den Parametern (auch für den Headless-Lauf der Prüffälle)
export function init(p) {
  return {
    t: 0,
    n_hoch: Math.round(p.n_hoch ?? 3),
    n_tief: Math.round(p.n_tief ?? 2)
  };
}

export function update() { /* statisch: keine Zeitentwicklung */ }
export function istFertig() { return true; }

export function messwerte(z) {
  const u = uebergang(z.n_hoch, z.n_tief);
  return { deltaE: u.deltaE, lambda_nm: u.lambda };
}

export function bilanz(z) {
  const nh = z.n_hoch, nt = z.n_tief;
  const deltaE = nh === nt ? 0 : E_RY * (1 / Math.min(nh, nt) ** 2 - 1 / Math.max(nh, nt) ** 2);
  const lambda_nm = deltaE > 0 ? HC / deltaE : 0;
  return { deltaE, lambda_nm };
}

// Welt: x von 0..10 (links Niveauschema, rechts Photon), y von 0..10.
export function weltBereich() {
  return { xMin: 0, xMax: 10, yMin: 0, yMax: 10 };
}

// ---------- Zeichnen: Energieniveau-Diagramm + Übergangspfeil + Photon ----------

// Bildschirm-y eines Energiewertes E (in eV, negativ) im Diagrammbereich.
// E reicht von E_RY (−13,6 eV, n=1) bis 0 (n=∞). Wir bilden das auf yUnten..yOben ab,
// sodass n=1 ganz unten und E=0 oben liegt.
function yVonEnergie(E, yUnten, yOben) {
  const anteil = (E - (-E_RY)) / (0 - (-E_RY)); // 0 bei E=−13,6 ; 1 bei E=0
  return yUnten + anteil * (yOben - yUnten);
}

export function zeichne({ ctx, welt, zustand: z, stil }) {
  const u = uebergang(z.n_hoch, z.n_tief);
  const kleinSchrift = stil.linienstaerke > 3 ? "16px sans-serif" : "12px sans-serif";
  const fettSchrift = stil.linienstaerke > 3 ? "bold 18px sans-serif" : "bold 14px sans-serif";

  // --- Diagrammbereich (linke Seite) ---
  const xAchse = 1.6;          // senkrechte Energieachse
  const xLinieL = 1.6;         // linker Anfang der Niveaulinien
  const xLinieR = 6.0;         // rechtes Ende der Niveaulinien
  const yUnten = 1.2;          // Bildschirmhöhe für n=1 (E=−13,6 eV)
  const yOben = 9.0;           // Bildschirmhöhe für E=0
  const nMax = 6;

  ctx.save();
  ctx.lineCap = "butt";
  ctx.lineJoin = "round";

  // Energieachse
  ctx.strokeStyle = stil.beschriftung;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(welt.px(xAchse), welt.py(yUnten - 0.3));
  ctx.lineTo(welt.px(xAchse), welt.py(yOben + 0.3));
  ctx.stroke();
  ctx.fillStyle = stil.beschriftung;
  ctx.font = kleinSchrift;
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  ctx.fillText("E in eV", welt.px(xAchse) + 4, welt.py(yOben + 0.3));

  // Ionisationsgrenze E = 0 (gestrichelt)
  const y0 = yVonEnergie(0, yUnten, yOben);
  ctx.strokeStyle = stil.beschriftung;
  ctx.setLineDash([4, 4]);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(welt.px(xLinieL), welt.py(y0));
  ctx.lineTo(welt.px(xLinieR + 0.4), welt.py(y0));
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = stil.beschriftung;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = kleinSchrift;
  ctx.fillText("0  (Ionisation)", welt.px(xLinieR + 0.5), welt.py(y0));

  // Niveaulinien n = 1..nMax
  const yNiveau = {};
  for (let n = 1; n <= nMax; n++) {
    const E = energie(n);
    const y = yVonEnergie(E, yUnten, yOben);
    yNiveau[n] = y;
    const betont = (n === u.nlow || n === u.nhigh);
    ctx.strokeStyle = betont ? stil.akzent : stil.text;
    ctx.lineWidth = betont ? stil.linienstaerke + 1 : Math.max(1, stil.linienstaerke - 1);
    ctx.beginPath();
    ctx.moveTo(welt.px(xLinieL), welt.py(y));
    ctx.lineTo(welt.px(xLinieR), welt.py(y));
    ctx.stroke();
    // Beschriftung nur fuer n<=3 und die beiden aktiven Niveaus (hohe n liegen zu dicht)
    if (n <= 3 || betont) {
      ctx.fillStyle = betont ? stil.akzent : stil.beschriftung;
      ctx.font = betont ? fettSchrift : kleinSchrift;
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText("n=" + n, welt.px(xLinieL) - 6, welt.py(y));
      ctx.fillStyle = stil.beschriftung;
      ctx.font = kleinSchrift;
      ctx.textAlign = "left";
      ctx.fillText(formatZahl(E, 2) + " eV", welt.px(xLinieR) + 0.5 * welt.massstab, welt.py(y));
    } else {
      // hohe Niveaus nur knapp mit n kennzeichnen
      ctx.fillStyle = stil.beschriftung; ctx.font = kleinSchrift; ctx.textAlign = "right"; ctx.textBaseline = "middle";
      ctx.fillText("n=" + n, welt.px(xLinieL) - 6, welt.py(y));
    }
  }

  // --- Übergangspfeil (vom höheren zum tieferen Niveau) ---
  if (u.deltaE > 0) {
    const xPfeil = (xLinieL + xLinieR) / 2;
    const yStart = yNiveau[u.nhigh];   // oben
    const yEnd = yNiveau[u.nlow];      // unten
    pfeilNachUnten(ctx, welt, stil, xPfeil, yStart, yEnd, stil.fehler);
    // ΔE-Beschriftung am Pfeil
    ctx.fillStyle = stil.fehler;
    ctx.font = fettSchrift;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("ΔE = " + formatZahl(u.deltaE, 2) + " eV",
      welt.px(xPfeil) + 0.25 * welt.massstab, welt.py((yStart + yEnd) / 2));
  } else {
    // kein Übergang
    ctx.fillStyle = stil.beschriftung;
    ctx.font = kleinSchrift;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Kein Übergang (n_hoch = n_tief)", welt.px((xLinieL + xLinieR) / 2), welt.py((yUnten + yOben) / 2));
  }

  // --- Photon / Spektrallinie (rechte Seite) ---
  zeichnePhoton(ctx, welt, stil, u, kleinSchrift, fettSchrift);

  ctx.restore();
}

// Pfeil von (x, yOben) nach (x, yUnten) — also nach unten, mit Pfeilspitze unten.
function pfeilNachUnten(ctx, welt, stil, x, yOben, yUnten, farbe) {
  const px = welt.px(x);
  const pyO = welt.py(yOben);
  const pyU = welt.py(yUnten);
  ctx.strokeStyle = farbe;
  ctx.fillStyle = farbe;
  ctx.lineWidth = stil.linienstaerke + 1;
  ctx.beginPath();
  ctx.moveTo(px, pyO);
  ctx.lineTo(px, pyU);
  ctx.stroke();
  // Pfeilspitze (zeigt nach unten)
  const s = Math.max(7, welt.laenge(0.22));
  ctx.beginPath();
  ctx.moveTo(px, pyU);
  ctx.lineTo(px - s * 0.6, pyU - s);
  ctx.lineTo(px + s * 0.6, pyU - s);
  ctx.closePath();
  ctx.fill();
}

// Photon rechts: Wellenzug, Wellenlänge, und — falls sichtbar — Farbbalken in Spektralfarbe.
function zeichnePhoton(ctx, welt, stil, u, kleinSchrift, fettSchrift) {
  const xMitte = 8.3;
  const yMitte = 5.2;
  const farbe = u.deltaE > 0 ? spektralFarbe(u.lambda) : null;
  const sichtbar = farbe !== null;
  const photonFarbe = farbe || stil.text;

  // Überschrift
  ctx.fillStyle = stil.text;
  ctx.font = fettSchrift;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("Ausgesandtes Photon", welt.px(xMitte), welt.py(6.7));

  if (u.deltaE <= 0) {
    ctx.fillStyle = stil.beschriftung;
    ctx.font = kleinSchrift;
    ctx.textBaseline = "middle";
    ctx.fillText("—", welt.px(xMitte), welt.py(yMitte));
    return;
  }

  // Wellenzug (sinusförmig) als Symbol für das Lichtteilchen
  const x0 = welt.px(7.0);
  const x1 = welt.px(9.6);
  const ym = welt.py(yMitte);
  const amp = welt.laenge(0.55);
  // Wellenlänge im Bild: kürzere λ -> mehr Wellenzüge (didaktisch, nicht maßstäblich)
  const perioden = Math.max(2, Math.min(8, Math.round(900 / Math.max(80, u.lambda))));
  ctx.strokeStyle = photonFarbe;
  ctx.lineWidth = stil.linienstaerke + 1;
  ctx.beginPath();
  const schritte = 120;
  for (let i = 0; i <= schritte; i++) {
    const t = i / schritte;
    const x = x0 + t * (x1 - x0);
    const y = ym - amp * Math.sin(t * perioden * 2 * Math.PI);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  // Pfeilspitze rechts am Wellenzug (Ausbreitungsrichtung)
  const s = Math.max(7, welt.laenge(0.2));
  ctx.fillStyle = photonFarbe;
  ctx.beginPath();
  ctx.moveTo(x1 + s, ym);
  ctx.lineTo(x1 - s * 0.2, ym - s * 0.7);
  ctx.lineTo(x1 - s * 0.2, ym + s * 0.7);
  ctx.closePath();
  ctx.fill();

  // Wellenlänge λ als Zahl
  ctx.fillStyle = stil.text;
  ctx.font = fettSchrift;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("λ = " + formatZahl(u.lambda, 0) + " nm", welt.px(xMitte), welt.py(yMitte) - 1.0 * welt.massstab);

  // Farbbalken + Beschriftung: sichtbar oder UV/IR
  const balkenY = welt.py(3.0);
  const balkenH = welt.laenge(0.7);
  const balkenX = welt.px(7.0);
  const balkenB = welt.laenge(2.6);
  if (sichtbar) {
    ctx.fillStyle = farbe;
    ctx.fillRect(balkenX, balkenY, balkenB, balkenH);
    ctx.strokeStyle = stil.text;
    ctx.lineWidth = 1;
    ctx.strokeRect(balkenX, balkenY, balkenB, balkenH);
    ctx.fillStyle = stil.beschriftung;
    ctx.font = kleinSchrift;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("sichtbares Licht", welt.px(xMitte), balkenY + balkenH + 6);
  } else {
    // UV (zu kurz) oder IR (zu lang)
    const bereich = u.lambda < 380 ? "ultraviolett (unsichtbar)" : "infrarot (unsichtbar)";
    ctx.fillStyle = stil.hauch;
    ctx.fillRect(balkenX, balkenY, balkenB, balkenH);
    ctx.strokeStyle = stil.beschriftung;
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 1;
    ctx.strokeRect(balkenX, balkenY, balkenB, balkenH);
    ctx.setLineDash([]);
    ctx.fillStyle = stil.beschriftung;
    ctx.font = kleinSchrift;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(bereich, welt.px(xMitte), balkenY + balkenH / 2);
  }
}

// ---------- Prüffälle (Bohr-Modell, analytisch verifiziert) ----------
// Fall1: H-α, n=3→2: ΔE = 13,6·(1/4 − 1/9) = 13,6·0,138889 = 1,889 eV; λ = 1240/1,889 = 656 nm (rot).
// Fall2: Lyman, n=2→1: ΔE = 13,6·(1/1 − 1/4) = 13,6·0,75 = 10,2 eV; λ = 1240/10,2 = 122 nm (UV).
// Fall3: H-β, n=4→2: ΔE = 13,6·(1/4 − 1/16) = 13,6·0,1875 = 2,55 eV; λ = 1240/2,55 = 486 nm (blaugrün).
export const pruefFaelle = [
  {
    name: "H-α: Übergang n = 3 → 2 (rot)",
    parameter: { n_hoch: 3, n_tief: 2 },
    toleranzProzent: 1,
    soll: { deltaE: 1.889, lambda_nm: 656 }
  },
  {
    name: "Lyman: Übergang n = 2 → 1 (UV)",
    parameter: { n_hoch: 2, n_tief: 1 },
    toleranzProzent: 1,
    soll: { deltaE: 10.2, lambda_nm: 122 }
  },
  {
    name: "H-β: Übergang n = 4 → 2 (blaugrün)",
    parameter: { n_hoch: 4, n_tief: 2 },
    toleranzProzent: 1,
    soll: { deltaE: 2.55, lambda_nm: 486 }
  }
];
