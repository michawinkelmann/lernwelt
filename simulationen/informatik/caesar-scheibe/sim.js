// Caesar-Scheibe — zwei konzentrische Buchstabenringe: außen das feste Klartext-
// Alphabet, innen das um k Positionen gedrehte Geheimtext-Alphabet. Ein wählbares
// Übungswort wird live verschlüsselt: Geheimwert = (Klarwert + k) mod 26 mit A=0 … Z=25.
// Modus „statisch": Parameter ändern → sofort neu rechnen und zeichnen
// (istFertig liefert sofort true, update ist leer — wie beim Funktionsplotter).

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
// Feste Übungswörter — der Parameter „wort" wählt per Nummer 0–4
const WOERTER = ["HALLO", "GEHEIM", "SCHULE", "PAUSE", "CAESAR"];
const SEKTOR = 2 * Math.PI / 26; // Winkel eines Buchstabenfelds

export const manifest = {
  id: "informatik/caesar-scheibe",
  titel: "Caesar-Scheibe",
  modus: "statisch",
  raster: false,     // Buchstabenscheibe statt Koordinatenraster (wie Schaltkreis-Vergleich)
  werkzeuge: false,  // Lineal/Winkelmesser ergeben an der Scheibe keinen Sinn
  parameter: [
    { id: "k",    label: "Verschiebung",   einheit: "", min: 0, max: 25, schritt: 1, start: 3 },
    { id: "wort", label: "Übungswort-Nr.", einheit: "", min: 0, max: 4,  schritt: 1, start: 0 }
  ],
  anzeigen: [
    { id: "laenge",       label: "Wortlänge",                 einheit: "", stellen: 0 },
    { id: "summe_klar",   label: "Summe Klartext (A=0…Z=25)", einheit: "", stellen: 0 },
    { id: "summe_geheim", label: "Summe Geheimtext",          einheit: "", stellen: 0 }
  ],
  presets: [
    { name: "Caesars Original (k=3)", werte: { k: 3,  wort: 4 } },
    { name: "ROT13",                  werte: { k: 13, wort: 1 } },
    { name: "Keine Verschiebung",     werte: { k: 0,  wort: 0 } },
    { name: "Maximal",                werte: { k: 25, wort: 2 } }
  ],
  vorhersage: {
    frage: "Ein Geheimtext wurde mit k = 3 erzeugt. Mit welcher Einstellung der Scheibe entschlüsselst du ihn?",
    optionen: [
      "Scheibe auf k = 3 lassen und rückwärts ablesen: innen → außen",
      "Geheimtext mit k = 3 einfach noch einmal verschlüsseln",
      "k = 23 einstellen und ganz normal vorwärts verschlüsseln"
    ],
    aufloesung: "Zwei Wege führen zum Ziel: Bei k = 3 liest du einfach rückwärts — Geheimbuchstabe innen suchen, Klarbuchstabe außen ablesen. Oder du verschlüsselst den Geheimtext vorwärts mit k = 23, denn 3 + 23 = 26 ist eine volle Runde der Scheibe — jeder Buchstabe landet wieder am Start. Nur das nochmalige Verschlüsseln mit k = 3 hilft nicht: Es verschiebt insgesamt um 6."
  },
  beobachtung: [
    "Stelle k = 13 ein und verschlüssle GEHEIM (Wort 1). Verschlüssle das Ergebnis in Gedanken gleich noch einmal mit k = 13 — was fällt auf, und warum? (Tipp: 13 + 13 = 26)",
    "Warum ist k = 0 keine Verschlüsselung? Und was würde eine Scheibe mit k = 26 tun, wenn der Regler so weit ginge?",
    "Wähle HALLO mit k = 3: Die Geheimtext-Summe ist genau 15 größer als die Klartext-Summe. Erkläre die 15 — und finde eine Einstellung, bei der die Regel „Summe wächst um Wortlänge mal k“ nicht mehr stimmt. Woran liegt das?",
    "Verschlüssle SCHULE mit k = 25 und schau auf die Scheibe: Welche Buchstaben springen „über das Z“ zurück an den Alphabetanfang?"
  ],
  modellgrenzen: "Die Scheibe kennt nur die 26 Großbuchstaben A–Z — keine Umlaute, Ziffern, Satz- oder Leerzeichen; echte Nachrichten müssten erst entsprechend vereinfacht werden. Wie man Caesar ohne bekannten Schlüssel knackt (Häufigkeitsanalyse), erklärt die Themenseite „Verschlüsselung“.",
  bilanz: {
    summe_klar:   { label: "Summe Klartext",   einheit: "", stellen: 0 },
    summe_geheim: { label: "Summe Geheimtext", einheit: "", stellen: 0 },
    laenge:       { label: "Wortlänge",        einheit: "", stellen: 0 }
  },
  welt: { xMin: -1.2, xMax: 1.2, yMin: -1.2, yMax: 1.2 } // fest quadratisch, Scheibe + Textzeilen
};

// ---------- Modell (rein arithmetisch, keine Zeitabhängigkeit) ----------

function verschluessele(klar, k) {
  let geheim = "";
  let summeKlar = 0, summeGeheim = 0;
  for (const zeichen of klar) {
    const wert = ALPHABET.indexOf(zeichen);  // Klarwert A=0 … Z=25
    const neu = (wert + k) % 26;             // Verschieben mit Sprung „über das Z"
    geheim += ALPHABET[neu];
    summeKlar += wert;
    summeGeheim += neu;
  }
  return { geheim, summeKlar, summeGeheim };
}

export function init(p) {
  const k = Math.round(p.k);
  const klar = WOERTER[Math.max(0, Math.min(WOERTER.length - 1, Math.round(p.wort)))];
  const erg = verschluessele(klar, k);
  return {
    t: 0, k, klar,
    geheim: erg.geheim,
    laenge: klar.length,
    summeKlar: erg.summeKlar,
    summeGeheim: erg.summeGeheim
  };
}

export function update() { /* statisch: nichts zu tun */ }

export function messwerte(z) {
  return { laenge: z.laenge, summe_klar: z.summeKlar, summe_geheim: z.summeGeheim };
}

export function istFertig() { return true; }

export function bilanz(z) {
  return { summe_klar: z.summeKlar, summe_geheim: z.summeGeheim, laenge: z.laenge };
}

// ---------- Zeichnen: Scheibe mit zwei Buchstabenringen + Wortzuordnung ----------

// Sektor-Mittelwinkel des Buchstabens mit Index i: A oben (12 Uhr), Alphabet im Uhrzeigersinn
function winkel(i) { return -Math.PI / 2 + i * SEKTOR; }

// Pfad eines Ringsektors (zwischen Radius r1 und r2) um den Mittelwinkel a
function sektorPfad(ctx, cx, cy, r1, r2, a) {
  ctx.beginPath();
  ctx.arc(cx, cy, r2, a - SEKTOR / 2, a + SEKTOR / 2);
  ctx.arc(cx, cy, r1, a + SEKTOR / 2, a - SEKTOR / 2, true);
  ctx.closePath();
}

export function zeichne({ ctx, welt, zustand: z, stil }) {
  const cx = welt.breite / 2;          // horizontal zentriert (in Pixeln)
  const cy = welt.py(0.22);            // Scheibenmitte leicht oberhalb, unten Platz für Text
  const L = w => welt.laenge(w);       // Weltlänge → Pixel
  const rA1 = L(0.72), rA2 = L(0.95);  // äußerer Ring: festes Klartext-Alphabet
  const rI1 = L(0.46), rI2 = L(0.69);  // innerer Ring: um k gedrehtes Geheimtext-Alphabet
  const rBuchstA = (rA1 + rA2) / 2;
  const rBuchstI = (rI1 + rI2) / 2;
  const klarIndizes = [...new Set([...z.klar].map(b => ALPHABET.indexOf(b)))];

  // Ringflächen: Bänder leicht getönt, Zwischenraum und Mitte in Flächenfarbe
  ctx.fillStyle = stil.hauch;
  ctx.beginPath(); ctx.arc(cx, cy, rA2, 0, 2 * Math.PI); ctx.fill();
  ctx.fillStyle = stil.flaeche;
  ctx.beginPath(); ctx.arc(cx, cy, rA1, 0, 2 * Math.PI); ctx.fill();
  ctx.fillStyle = stil.hauch;
  ctx.beginPath(); ctx.arc(cx, cy, rI2, 0, 2 * Math.PI); ctx.fill();
  ctx.fillStyle = stil.flaeche;
  ctx.beginPath(); ctx.arc(cx, cy, rI1, 0, 2 * Math.PI); ctx.fill();

  // Buchstaben des Übungsworts farbig markieren: außen Klartext, innen Geheimtext
  ctx.globalAlpha = 0.2;
  klarIndizes.forEach(v => {
    ctx.fillStyle = stil.akzent;
    sektorPfad(ctx, cx, cy, rA1, rA2, winkel(v)); ctx.fill();
    ctx.fillStyle = stil.ok;
    sektorPfad(ctx, cx, cy, rI1, rI2, winkel(v)); ctx.fill();
  });
  ctx.globalAlpha = 1;

  // Sektorgrenzen beider Ringe
  ctx.strokeStyle = stil.raster;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < 26; i++) {
    const a = winkel(i) - SEKTOR / 2;
    const c = Math.cos(a), s = Math.sin(a);
    ctx.moveTo(cx + rA1 * c, cy + rA1 * s); ctx.lineTo(cx + rA2 * c, cy + rA2 * s);
    ctx.moveTo(cx + rI1 * c, cy + rI1 * s); ctx.lineTo(cx + rI2 * c, cy + rI2 * s);
  }
  ctx.stroke();

  // Ringkonturen
  ctx.strokeStyle = stil.beschriftung;
  [rA2, rA1, rI2, rI1].forEach(r => {
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI); ctx.stroke();
  });

  // Buchstaben: außen fest, innen um k Positionen gedreht
  // (an der Winkelposition des Klarbuchstabens i steht innen ALPHABET[(i + k) % 26])
  const fontA = Math.max(9, Math.round(L(0.125)));
  const fontI = Math.max(8, Math.round(L(0.115)));
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < 26; i++) {
    const a = winkel(i);
    const c = Math.cos(a), s = Math.sin(a);
    const markiert = klarIndizes.includes(i);
    ctx.fillStyle = markiert ? stil.akzent : stil.text;
    ctx.font = (markiert ? "bold " : "") + fontA + "px sans-serif";
    ctx.fillText(ALPHABET[i], cx + rBuchstA * c, cy + rBuchstA * s);
    ctx.fillStyle = markiert ? stil.ok : stil.text;
    ctx.font = (markiert ? "bold " : "") + fontI + "px sans-serif";
    ctx.fillText(ALPHABET[(i + z.k) % 26], cx + rBuchstI * c, cy + rBuchstI * s);
  }

  // Ableselinie für den ersten Buchstaben des Worts: von außen (Klar) nach innen (Geheim)
  const aErster = winkel(ALPHABET.indexOf(z.klar[0]));
  const cE = Math.cos(aErster), sE = Math.sin(aErster);
  const rVon = rBuchstA - L(0.075), rBis = rBuchstI + L(0.075);
  ctx.strokeStyle = stil.text;
  ctx.lineWidth = stil.linienstaerke;
  ctx.beginPath();
  ctx.moveTo(cx + rVon * cE, cy + rVon * sE);
  ctx.lineTo(cx + rBis * cE, cy + rBis * sE);
  ctx.stroke();
  // Pfeilspitze am inneren Ende (zeigt zum Geheimbuchstaben)
  const spitze = L(0.045);
  const ax = cx + rBis * cE, ay = cy + rBis * sE;       // Pfeilspitze
  const bx = cx + (rBis + spitze) * cE, by = cy + (rBis + spitze) * sE; // Schaftpunkt dahinter
  const qx = -(ay - by), qy = ax - bx;                  // Querrichtung
  ctx.fillStyle = stil.text;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx + qx * 0.6, by + qy * 0.6);
  ctx.lineTo(bx - qx * 0.6, by - qy * 0.6);
  ctx.closePath();
  ctx.fill();

  // Scheibenmitte: aktueller Schlüssel + Grundzuordnung
  ctx.textAlign = "center";
  ctx.fillStyle = stil.text;
  ctx.font = "bold " + Math.max(12, Math.round(L(0.18))) + "px sans-serif";
  ctx.fillText("k = " + z.k, cx, cy - L(0.06));
  ctx.fillStyle = stil.beschriftung;
  ctx.font = Math.max(9, Math.round(L(0.1))) + "px sans-serif";
  ctx.fillText("A→" + ALPHABET[z.k % 26], cx, cy + L(0.12));

  // Legende oben links (Farben nie als einzige Information: Position benennt die Ringe)
  const schriftPx = parseInt(stil.schrift, 10) || 12;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = stil.schrift;
  ctx.fillStyle = stil.akzent;
  ctx.fillText("außen: Klartext", 8, 6);
  ctx.fillStyle = stil.ok;
  ctx.fillText("innen: Geheimtext", 8, 6 + Math.round(schriftPx * 1.4));

  // Übungswort groß unter der Scheibe: KLAR → GEHEIM (Monospace, dreiteilig eingefärbt)
  const yWoerter = welt.py(-0.95);
  const yPaare = welt.py(-1.12);
  const mono = "px ui-monospace, Consolas, monospace";
  ctx.textBaseline = "middle";
  ctx.font = "bold " + Math.max(14, Math.round(L(0.17))) + mono;
  const pfeilText = " → ";
  const wKlar = ctx.measureText(z.klar).width;
  const wPfeil = ctx.measureText(pfeilText).width;
  const wGeheim = ctx.measureText(z.geheim).width;
  let x = cx - (wKlar + wPfeil + wGeheim) / 2;
  ctx.textAlign = "left";
  ctx.fillStyle = stil.akzent;       ctx.fillText(z.klar, x, yWoerter);     x += wKlar;
  ctx.fillStyle = stil.beschriftung; ctx.fillText(pfeilText, x, yWoerter);  x += wPfeil;
  ctx.fillStyle = stil.ok;           ctx.fillText(z.geheim, x, yWoerter);

  // Buchstabenpaare KLAR→GEHEIM darunter
  const paare = [...z.klar].map((b, i) => b + "→" + z.geheim[i]).join("  ");
  ctx.textAlign = "center";
  ctx.fillStyle = stil.text;
  ctx.font = Math.max(10, Math.round(L(0.1))) + mono;
  ctx.fillText(paare, cx, yPaare);
}

// ---------- Prüffälle (Summen von Hand bzw. per Skript nachgerechnet) ----------
// Theorie: summe_geheim = summe_klar + laenge·k − 26·(Anzahl der Sprünge über das Z)

export const pruefFaelle = [
  {
    // HALLO → KDOOR: 43 + 5·3 = 58, kein Sprung über das Z
    name: "HALLO mit k = 3 (→ KDOOR)",
    parameter: { k: 3, wort: 0 },
    toleranzProzent: 0.1,
    soll: { laenge: 5, summe_klar: 43, summe_geheim: 58 }
  },
  {
    // GEHEIM → TRURVZ: 41 + 6·13 = 119, kein Sprung über das Z
    name: "GEHEIM mit k = 13, ROT13 (→ TRURVZ)",
    parameter: { k: 13, wort: 1 },
    toleranzProzent: 0.1,
    soll: { laenge: 6, summe_klar: 41, summe_geheim: 119 }
  },
  {
    // SCHULE → RBGTKD: 62 + 6·25 − 6·26 = 56 — alle 6 Buchstaben springen über das Z (mod-26-Test)
    name: "SCHULE mit k = 25 (→ RBGTKD)",
    parameter: { k: 25, wort: 2 },
    toleranzProzent: 0.1,
    soll: { laenge: 6, summe_klar: 62, summe_geheim: 56 }
  }
];
