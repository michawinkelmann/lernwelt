// Logik-Gatter-Baukasten (Informatik) — boolesche Verknuepfungen begreifen.
// Modus „statisch", per Klick bedienbar: zwei Eingaenge A und B als Schalter, ein waehlbares
// Gatter, ein Ausgang Q als Lampe. Werte sind streng 0 oder 1. Daneben steht die vollstaendige
// Wahrheitstabelle des gewaehlten Gatters; die aktuell eingestellte Zeile ist hervorgehoben.
// Keine Zeitentwicklung: Der Zustand wird per Klick gesetzt (zeiger), die Prueffaelle setzen ihn
// ueber init(werte) fuer den Headless-Lauf — ganz ohne Klicks.

// ---------- Gatter-Definitionen ----------
// Reihenfolge entspricht der Aufgabenstellung: 0=UND, 1=ODER, 2=NICHT, 3=XOR, 4=NAND, 5=NOR.
const GATTER = [
  { id: 0, name: "UND",   kurz: "AND",  einEingang: false, formel: "Q = A · B (1 nur, wenn A=1 UND B=1)" },
  { id: 1, name: "ODER",  kurz: "OR",   einEingang: false, formel: "Q = A ∨ B (1, wenn mindestens einer 1 ist)" },
  { id: 2, name: "NICHT", kurz: "NOT",  einEingang: true,  formel: "Q = ¬A (nur A zählt; B wird ignoriert)" },
  { id: 3, name: "XOR",   kurz: "XOR",  einEingang: false, formel: "Q = 1, wenn A ≠ B (genau einer ist 1)" },
  { id: 4, name: "NAND",  kurz: "NAND", einEingang: false, formel: "Q = ¬(A · B)  (NICHT-UND)" },
  { id: 5, name: "NOR",   kurz: "NOR",  einEingang: false, formel: "Q = ¬(A ∨ B)  (NICHT-ODER)" }
];

// ---------- Modell: Ausgang aus A, B und Gatter (rein, in Node lauffaehig) ----------
// Liefert immer 0 oder 1.
export function ausgang(A, B, g) {
  const a = A ? 1 : 0;
  const b = B ? 1 : 0;
  switch (g) {
    case 0: return (a && b) ? 1 : 0;            // UND
    case 1: return (a || b) ? 1 : 0;            // ODER
    case 2: return a ? 0 : 1;                    // NICHT A (B ignoriert)
    case 3: return (a !== b) ? 1 : 0;           // XOR (genau einer)
    case 4: return (a && b) ? 0 : 1;            // NAND = NICHT(A UND B)
    case 5: return (a || b) ? 0 : 1;            // NOR  = NICHT(A ODER B)
    default: return 0;
  }
}

// Wahrheitstabelle eines Gatters als Zeilenliste {A,B,Q}. Beim NICHT-Gatter nur die zwei
// A-Zeilen (B ist bedeutungslos).
function wahrheitstabelle(g) {
  if (GATTER[g].einEingang) {
    return [
      { A: 0, B: null, Q: ausgang(0, 0, g) },
      { A: 1, B: null, Q: ausgang(1, 0, g) }
    ];
  }
  const zeilen = [];
  for (const A of [0, 1]) for (const B of [0, 1]) zeilen.push({ A, B, Q: ausgang(A, B, g) });
  return zeilen;
}

export const manifest = {
  id: "informatik/logik-gatter",
  titel: "Logik-Gatter-Baukasten",
  modus: "statisch",
  raster: false,
  werkzeuge: false,
  parameter: [],
  anzeigen: [
    { id: "A", label: "Eingang A", einheit: "", stellen: 0 },
    { id: "B", label: "Eingang B", einheit: "", stellen: 0 },
    { id: "Q", label: "Ausgang Q", einheit: "", stellen: 0 }
  ],
  presets: [
    { name: "UND (A=1, B=1)",  werte: { inputA: 1, inputB: 1, gatter: 0 } },
    { name: "XOR (A=1, B=0)",  werte: { inputA: 1, inputB: 0, gatter: 3 } },
    { name: "NOR (A=0, B=0)",  werte: { inputA: 0, inputB: 0, gatter: 5 } }
  ],
  vorhersage: {
    frage: "Beim UND-Gatter: Wann leuchtet die Lampe am Ausgang Q?",
    optionen: ["Wenn mindestens ein Eingang 1 ist", "Nur wenn beide Eingänge 1 sind", "Immer, außer beide sind 0"],
    aufloesung: "Nur wenn beide Eingänge 1 sind. Das UND-Gatter rechnet Q = A · B: Schon eine einzige 0 macht das Produkt 0, also bleibt die Lampe dunkel. Erst A=1 UND B=1 ergeben Q=1. Probiere alle vier Kombinationen durch und vergleiche danach mit dem ODER-Gatter, bei dem bereits eine einzige 1 genügt."
  },
  beobachtung: [
    "Stelle das UND-Gatter ein und probiere nacheinander alle vier Eingangskombinationen (00, 01, 10, 11) durch. In welcher einzigen Zeile leuchtet die Lampe? Vergleiche jedes Mal mit der hervorgehobenen Zeile der Wahrheitstabelle.",
    "Wechsle zwischen UND und ODER, ohne die Eingänge zu ändern. Bei welchen Eingaben unterscheiden sich die beiden Gatter — und bei welchen liefern sie dasselbe Ergebnis?",
    "Stelle NAND ein und vergleiche es Zeile für Zeile mit UND. Was fällt dir auf? Überzeuge dich, dass NAND genau das Gegenteil von UND ist („NICHT-UND“). Prüfe denselben Zusammenhang anschließend für NOR und ODER.",
    "Beim XOR-Gatter: Schalte A und B so, dass die Lampe leuchtet. Wann genau ist Q=1? Formuliere die Regel „XOR ist 1, wenn …“ in eigenen Worten und teste sie an allen vier Zeilen."
  ],
  modellgrenzen: "Idealisierte Schaltlogik: Werte sind exakt 0 oder 1, das Gatter schaltet ohne Laufzeiten, Verzögerungen oder Störungen sofort um. Echte Bauteile brauchen winzige Schaltzeiten und arbeiten mit Spannungspegeln statt reinen Zahlen. Hier gibt es genau ein Gatter mit zwei Eingängen (beim NICHT-Gatter nur einen). Ausblick: Schaltet man mehrere Gatter hintereinander, lassen sich größere Schaltungen bauen — etwa ein Halbaddierer aus einem XOR- und einem UND-Gatter, der zwei Bits addiert (Summe und Übertrag).",
  bilanz: {
    ausgang: { label: "Ausgang Q", einheit: "", stellen: 0 }
  },
  welt: { xMin: 0, xMax: 16, yMin: 0, yMax: 9 }
};

// ---------- feste Geometrie (Welt-Einheiten 0..16 x 0..9), von zeichne() und zeiger() geteilt ----------
const GEO = {
  schalterA: { x: 2.0, y: 6.4, hit: { x0: 1.0, x1: 3.4, y0: 5.5, y1: 7.3 } },
  schalterB: { x: 2.0, y: 3.4, hit: { x0: 1.0, x1: 3.4, y0: 2.5, y1: 4.3 } },
  gatter:    { x: 6.6, y: 4.9, b: 2.6, h: 2.6, hit: { x0: 5.1, x1: 8.3, y0: 3.3, y1: 6.5 } },
  lampe:     { x: 10.9, y: 4.9 },
  // Knopfreihe zur Gatterwahl (unten), ein Feld je Gatter
  knoepfe:   { y0: 0.4, y1: 1.5, x0: 1.0, breite: 2.3, luecke: 0.18 },
  // Wahrheitstabelle rechts
  tabelle:   { x: 12.3, yKopf: 8.2, zeilenH: 0.95, spaltenA: 12.9, spaltenB: 14.0, spaltenQ: 15.1, breite: 3.4 }
};

function knopfRect(i) {
  const k = GEO.knoepfe;
  const x0 = k.x0 + i * (k.breite + k.luecke);
  return { x0, x1: x0 + k.breite, y0: k.y0, y1: k.y1 };
}

export function init(p) {
  return {
    t: 0,
    inputA: (p.inputA ?? 0) >= 0.5 ? 1 : 0,
    inputB: (p.inputB ?? 0) >= 0.5 ? 1 : 0,
    gatter: Math.min(5, Math.max(0, Math.round(p.gatter ?? 0)))
  };
}

export function update() { /* statisch: keine Zeitentwicklung */ }
export function istFertig() { return true; }

export function messwerte(z) {
  return { A: z.inputA, B: z.inputB, Q: ausgang(z.inputA, z.inputB, z.gatter) };
}

export function bilanz(z) {
  return { ausgang: ausgang(z.inputA, z.inputB, z.gatter) };
}

export function weltBereich() {
  return { xMin: 0, xMax: 16, yMin: 0, yMax: 9 };
}

// ---------- Zeiger: Klick auf Schalter A/B, Gatter-Symbol oder Knopfreihe ----------
function inRect(x, y, r) { return x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1; }

export function zeiger({ x, y, zustand: z }) {
  // Schalter A / B umschalten
  if (inRect(x, y, GEO.schalterA.hit)) { z.inputA = z.inputA ? 0 : 1; return true; }
  if (inRect(x, y, GEO.schalterB.hit)) { z.inputB = z.inputB ? 0 : 1; return true; }
  // Klick auf eine der Gatter-Knoepfe -> direkt dieses Gatter
  for (let i = 0; i < GATTER.length; i++) {
    if (inRect(x, y, knopfRect(i))) {
      if (z.gatter !== i) { z.gatter = i; return true; }
      return false;
    }
  }
  // Klick auf das Gatter-Symbol -> naechstes Gatter durchschalten (0..5)
  if (inRect(x, y, GEO.gatter.hit)) { z.gatter = (z.gatter + 1) % GATTER.length; return true; }
  return false;
}

// ---------- Zeichnen ----------
export function zeichne({ ctx, welt, zustand: z, stil }) {
  const g = GATTER[z.gatter];
  const A = z.inputA, B = z.inputB;
  const Bwirkt = !g.einEingang;          // beim NICHT-Gatter ist B bedeutungslos
  const Q = ausgang(A, B, z.gatter);
  const W = (m) => welt.laenge(m);
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.font = stil.schrift;

  const anFarbe = stil.ok;               // 1 / an -> gruen

  // --- Leitungen von den Schaltern zum Gatter ---
  const leitung = (x1, y1, x2, y2, an) => {
    ctx.strokeStyle = an ? anFarbe : stil.beschriftung;
    ctx.lineWidth = an ? stil.linienstaerke + 1.5 : stil.linienstaerke;
    ctx.beginPath(); ctx.moveTo(welt.px(x1), welt.py(y1)); ctx.lineTo(welt.px(x2), welt.py(y2)); ctx.stroke();
  };
  const gx0 = GEO.gatter.x - GEO.gatter.b / 2;
  const gx1 = GEO.gatter.x + GEO.gatter.b / 2;
  // Eingang A: waagerecht bis kurz vor Gatter, dann (bei zwei Eingaengen) leicht nach unten
  const yA = g.einEingang ? GEO.gatter.y : GEO.gatter.y + 0.7;
  const yB = GEO.gatter.y - 0.7;
  leitung(GEO.schalterA.x + 0.95, GEO.schalterA.y, 4.3, GEO.schalterA.y, A === 1);
  leitung(4.3, GEO.schalterA.y, 4.3, yA, A === 1);
  leitung(4.3, yA, gx0, yA, A === 1);
  if (Bwirkt) {
    leitung(GEO.schalterB.x + 0.95, GEO.schalterB.y, 4.3, GEO.schalterB.y, B === 1);
    leitung(4.3, GEO.schalterB.y, 4.3, yB, B === 1);
    leitung(4.3, yB, gx0, yB, B === 1);
  }
  // Ausgang Gatter -> Lampe
  leitung(gx1, GEO.gatter.y, GEO.lampe.x - 0.7, GEO.gatter.y, Q === 1);

  // --- Schalter A und B ---
  zeichneSchalter(ctx, welt, GEO.schalterA, "A", A, stil, W, anFarbe);
  if (Bwirkt) {
    zeichneSchalter(ctx, welt, GEO.schalterB, "B", B, stil, W, anFarbe);
  } else {
    // B ausgegraut darstellen (wird ignoriert)
    zeichneSchalter(ctx, welt, GEO.schalterB, "B", B, stil, W, anFarbe, true);
    ctx.fillStyle = stil.beschriftung; ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.font = stil.schrift;
    ctx.fillText("(wird ignoriert)", welt.px(GEO.schalterB.x), welt.py(GEO.schalterB.y - 1.05));
  }

  // --- Gatter-Symbol (Rechteck mit Name) ---
  const aktivIn = (A === 1) || (Bwirkt && B === 1);
  ctx.fillStyle = stil.flaeche;
  ctx.strokeStyle = stil.text;
  ctx.lineWidth = stil.linienstaerke + 1;
  ctx.beginPath();
  ctx.rect(welt.px(gx0), welt.py(GEO.gatter.y + GEO.gatter.h / 2), W(GEO.gatter.b), W(GEO.gatter.h));
  ctx.fill(); ctx.stroke();
  // Anschlusspunkte am Gatter
  ctx.fillStyle = stil.text;
  const punkt = (px, py) => { ctx.beginPath(); ctx.arc(px, py, Math.max(2.5, W(0.07)), 0, 2 * Math.PI); ctx.fill(); };
  punkt(welt.px(gx0), welt.py(yA));
  if (Bwirkt) punkt(welt.px(gx0), welt.py(yB));
  punkt(welt.px(gx1), welt.py(GEO.gatter.y));
  // Gatter-Name
  ctx.fillStyle = stil.text; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = (stil.linienstaerke > 3 ? "bold 22px" : "bold 16px") + " sans-serif";
  ctx.fillText(g.name, welt.px(GEO.gatter.x), welt.py(GEO.gatter.y + 0.25));
  ctx.font = stil.schrift;
  ctx.fillStyle = stil.beschriftung;
  ctx.fillText("(" + g.kurz + ")", welt.px(GEO.gatter.x), welt.py(GEO.gatter.y - 0.45));
  // Hinweis ueber dem Gatter
  ctx.textBaseline = "bottom";
  ctx.fillText("Gatter antippen → wechseln", welt.px(GEO.gatter.x), welt.py(GEO.gatter.y + GEO.gatter.h / 2 + 0.65));

  // --- Ausgang Q als Lampe ---
  lampe(ctx, welt, GEO.lampe.x, GEO.lampe.y, Q, "Q", stil, W);

  // --- Formelzeile unter dem Gatter ---
  ctx.fillStyle = stil.text; ctx.textAlign = "center"; ctx.textBaseline = "top";
  ctx.font = (stil.linienstaerke > 3 ? "bold 16px" : "bold 13px") + " sans-serif";
  ctx.fillText(g.formel, welt.px(6.6), welt.py(2.3));
  ctx.font = stil.schrift;
  ctx.fillStyle = (Q === 1) ? stil.ok : stil.beschriftung;
  ctx.fillText("Aktuell:  A = " + A + (Bwirkt ? ("   B = " + B) : "   (B egal)") + "   →   Q = " + Q, welt.px(6.6), welt.py(1.5));

  // --- Knopfreihe zur Gatterwahl ---
  ctx.textBaseline = "middle";
  for (let i = 0; i < GATTER.length; i++) {
    const r = knopfRect(i);
    const aktiv = z.gatter === i;
    ctx.fillStyle = aktiv ? stil.akzent : stil.flaeche;
    ctx.strokeStyle = aktiv ? stil.akzent : stil.beschriftung;
    ctx.lineWidth = stil.linienstaerke;
    ctx.beginPath();
    ctx.rect(welt.px(r.x0), welt.py(r.y1), W(r.x1 - r.x0), W(r.y1 - r.y0));
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = aktiv ? stil.flaeche : stil.text;
    ctx.textAlign = "center";
    ctx.fillText(GATTER[i].name, welt.px((r.x0 + r.x1) / 2), welt.py((r.y0 + r.y1) / 2));
  }

  // --- Wahrheitstabelle (rechts) ---
  zeichneTabelle(ctx, welt, z, stil, W);

  ctx.restore();
}

// Schalter: Kippschalter mit Beschriftung; an=1 leuchtet gruen, aus=0 grau
function zeichneSchalter(ctx, welt, geo, name, wert, stil, W, anFarbe, ausgegraut = false) {
  const px = welt.px(geo.x), py = welt.py(geo.y);
  const an = wert === 1 && !ausgegraut;
  const grundFarbe = ausgegraut ? stil.hauch : stil.flaeche;
  // Gehaeuse
  ctx.fillStyle = an ? anFarbe : grundFarbe;
  ctx.strokeStyle = ausgegraut ? stil.beschriftung : stil.text;
  ctx.lineWidth = stil.linienstaerke;
  ctx.beginPath();
  ctx.rect(welt.px(geo.x - 0.85), welt.py(geo.y + 0.55), W(1.7), W(1.1));
  ctx.fill(); ctx.stroke();
  // Wert gross in der Mitte
  ctx.fillStyle = an ? stil.flaeche : (ausgegraut ? stil.beschriftung : stil.text);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = (stil.linienstaerke > 3 ? "bold 22px" : "bold 17px") + " sans-serif";
  ctx.fillText(String(wert), px, py);
  // Beschriftung links daneben (Eingangsname)
  ctx.font = (stil.linienstaerke > 3 ? "bold 20px" : "bold 15px") + " sans-serif";
  ctx.fillStyle = ausgegraut ? stil.beschriftung : stil.text;
  ctx.textAlign = "right";
  ctx.fillText(name, welt.px(geo.x - 1.05), py);
  // Hinweistext darunter
  ctx.font = stil.schrift;
  ctx.fillStyle = stil.beschriftung;
  ctx.textAlign = "center"; ctx.textBaseline = "top";
  ctx.fillText(ausgegraut ? "" : (an ? "an (1)" : "aus (0)"), px, welt.py(geo.y - 0.6));
  ctx.fillText("antippen", px, welt.py(geo.y - 0.95));
}

// Lampe am Ausgang: Q=1 leuchtet, Q=0 dunkel
function lampe(ctx, welt, cx, cy, an, name, stil, W) {
  const px = welt.px(cx), py = welt.py(cy), r = W(0.78);
  if (an === 1) {
    const farbe = "#ffc21f";
    ctx.save(); ctx.shadowColor = farbe; ctx.shadowBlur = stil.linienstaerke > 3 ? 30 : 18;
    ctx.fillStyle = farbe; ctx.beginPath(); ctx.arc(px, py, r, 0, 2 * Math.PI); ctx.fill(); ctx.restore();
  } else {
    ctx.fillStyle = stil.flaeche; ctx.beginPath(); ctx.arc(px, py, r, 0, 2 * Math.PI); ctx.fill();
  }
  ctx.strokeStyle = stil.text; ctx.lineWidth = stil.linienstaerke;
  ctx.beginPath(); ctx.arc(px, py, r, 0, 2 * Math.PI); ctx.stroke();
  // Gluehwendel
  ctx.beginPath();
  ctx.moveTo(px - r * 0.55, py + r * 0.1);
  ctx.lineTo(px - r * 0.2, py - r * 0.45); ctx.lineTo(px + r * 0.2, py + r * 0.45); ctx.lineTo(px + r * 0.55, py - r * 0.1);
  ctx.stroke();
  // Sockel
  ctx.fillStyle = stil.text;
  ctx.beginPath(); ctx.arc(px - r * 0.5, py + r, Math.max(2.5, W(0.07)), 0, 2 * Math.PI); ctx.fill();
  ctx.beginPath(); ctx.arc(px + r * 0.5, py + r, Math.max(2.5, W(0.07)), 0, 2 * Math.PI); ctx.fill();
  // Beschriftung
  ctx.fillStyle = (an === 1) ? stil.ok : stil.beschriftung;
  ctx.textAlign = "center"; ctx.textBaseline = "top";
  ctx.font = (stil.linienstaerke > 3 ? "bold 20px" : "bold 15px") + " sans-serif";
  ctx.fillText(name + " = " + an, px, welt.py(cy - 1.0));
  ctx.font = stil.schrift;
  ctx.fillStyle = stil.beschriftung;
  ctx.fillText(an === 1 ? "leuchtet" : "dunkel", px, welt.py(cy - 1.45));
}

// Wahrheitstabelle des aktuellen Gatters; die zur Eingabe passende Zeile wird hervorgehoben.
function zeichneTabelle(ctx, welt, z, stil, W) {
  const g = GATTER[z.gatter];
  const zeilen = wahrheitstabelle(z.gatter);
  const T = GEO.tabelle;
  const Bspalte = !g.einEingang;
  const linkeKante = T.x;
  const rechteKante = T.x + T.breite;
  // Titel
  ctx.fillStyle = stil.text; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
  ctx.font = (stil.linienstaerke > 3 ? "bold 16px" : "bold 13px") + " sans-serif";
  ctx.fillText("Wahrheitstabelle: " + g.name, welt.px((linkeKante + rechteKante) / 2), welt.py(T.yKopf + 0.55));
  ctx.font = stil.schrift;

  // Kopfzeile
  const yKopf = T.yKopf;
  ctx.fillStyle = stil.hauch;
  ctx.fillRect(welt.px(linkeKante), welt.py(yKopf + T.zeilenH / 2), W(T.breite), W(T.zeilenH));
  ctx.fillStyle = stil.text; ctx.textBaseline = "middle"; ctx.textAlign = "center";
  ctx.font = (stil.linienstaerke > 3 ? "bold 16px" : "bold 13px") + " sans-serif";
  ctx.fillText("A", welt.px(T.spaltenA), welt.py(yKopf));
  if (Bspalte) ctx.fillText("B", welt.px(T.spaltenB), welt.py(yKopf));
  ctx.fillText("Q", welt.px(T.spaltenQ), welt.py(yKopf));
  ctx.font = stil.schrift;

  // Datenzeilen
  for (let i = 0; i < zeilen.length; i++) {
    const zr = zeilen[i];
    const yMitte = yKopf - (i + 1) * T.zeilenH;
    const passt = (zr.A === z.inputA) && (!Bspalte || zr.B === z.inputB);
    if (passt) {
      ctx.fillStyle = stil.akzent;
      ctx.globalAlpha = 0.18;
      ctx.fillRect(welt.px(linkeKante), welt.py(yMitte + T.zeilenH / 2), W(T.breite), W(T.zeilenH));
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = (passt ? (stil.linienstaerke > 3 ? "bold 17px" : "bold 14px") : (stil.linienstaerke > 3 ? "16px" : "13px")) + " sans-serif";
    ctx.fillStyle = passt ? stil.akzent : stil.text;
    ctx.fillText(String(zr.A), welt.px(T.spaltenA), welt.py(yMitte));
    if (Bspalte) ctx.fillText(String(zr.B), welt.px(T.spaltenB), welt.py(yMitte));
    // Q-Wert: 1 gruen hervorheben
    ctx.fillStyle = zr.Q === 1 ? stil.ok : (passt ? stil.akzent : stil.text);
    ctx.fillText(String(zr.Q), welt.px(T.spaltenQ), welt.py(yMitte));
  }
  ctx.font = stil.schrift;

  // Rahmenlinien
  ctx.strokeStyle = stil.beschriftung; ctx.lineWidth = 1;
  const unten = yKopf - zeilen.length * T.zeilenH - T.zeilenH / 2;
  const oben = yKopf + T.zeilenH / 2;
  ctx.beginPath();
  // aeussere Box
  ctx.rect(welt.px(linkeKante), welt.py(oben), W(T.breite), W(oben - unten));
  // Trennlinie unter Kopf
  ctx.moveTo(welt.px(linkeKante), welt.py(yKopf - T.zeilenH / 2));
  ctx.lineTo(welt.px(rechteKante), welt.py(yKopf - T.zeilenH / 2));
  // senkrechte Spaltentrenner
  const t1 = Bspalte ? (T.spaltenA + T.spaltenB) / 2 : (T.spaltenA + T.spaltenQ) / 2;
  ctx.moveTo(welt.px(t1), welt.py(oben)); ctx.lineTo(welt.px(t1), welt.py(unten));
  if (Bspalte) {
    const t2 = (T.spaltenB + T.spaltenQ) / 2;
    ctx.moveTo(welt.px(t2), welt.py(oben)); ctx.lineTo(welt.px(t2), welt.py(unten));
  }
  ctx.stroke();

  // Hinweis unter der Tabelle
  ctx.fillStyle = stil.beschriftung; ctx.textAlign = "center"; ctx.textBaseline = "top";
  ctx.fillText("Aktuelle Zeile hervorgehoben", welt.px((linkeKante + rechteKante) / 2), welt.py(unten - 0.15));
}

// ---------- Prueffaelle (analytisch: boolesche Logik; bei soll 0 absolut geprueft) ----------
export const pruefFaelle = [
  { name: "UND: 1 · 1 = 1",            parameter: { inputA: 1, inputB: 1, gatter: 0 }, toleranzProzent: 1, soll: { ausgang: 1 } },
  { name: "UND: 1 · 0 = 0",            parameter: { inputA: 1, inputB: 0, gatter: 0 }, toleranzProzent: 1, soll: { ausgang: 0 } },
  { name: "ODER: 0 ∨ 0 = 0",           parameter: { inputA: 0, inputB: 0, gatter: 1 }, toleranzProzent: 1, soll: { ausgang: 0 } },
  { name: "XOR: 1 und 1 → 0 (gleich)", parameter: { inputA: 1, inputB: 1, gatter: 3 }, toleranzProzent: 1, soll: { ausgang: 0 } },
  { name: "XOR: 1 und 0 → 1 (verschieden)", parameter: { inputA: 1, inputB: 0, gatter: 3 }, toleranzProzent: 1, soll: { ausgang: 1 } },
  { name: "NAND: ¬(1 · 1) = 0",   parameter: { inputA: 1, inputB: 1, gatter: 4 }, toleranzProzent: 1, soll: { ausgang: 0 } },
  { name: "NICHT A: ¬1 = 0 (B egal)",  parameter: { inputA: 1, inputB: 0, gatter: 2 }, toleranzProzent: 1, soll: { ausgang: 0 } }
];
