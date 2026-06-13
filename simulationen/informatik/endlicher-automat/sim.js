// Endlicher Automat: Wörter prüfen — DEA-Wortprüfung im Schrittmodus.
// Drei fest verdrahtete deterministische Automaten über dem Alphabet {a, b}
// lesen eines von sechs festen Wörtern Zeichen für Zeichen; ein Engine-Schritt
// konsumiert genau ein Zeichen. Oben das Wortband mit Lesekopf, darunter der
// Zustandsgraf des gewählten Automaten (Layout pro Automat fest verdrahtet);
// am Wortende erscheint groß „AKZEPTIERT ✓“ bzw. „ABGELEHNT ✗“ — Text und
// Symbol, nie nur Farbe.

import { formatZahl } from "../../../assets/js/sim/welt.js";

// ---------- Feste Wortliste (Nr. 1–6) ----------

const WOERTER = ["abab", "aabb", "bbab", "ba", "aaa", "abba"];

// ---------- Feste Automaten (Index 0–2 = Automat 1–3) ----------
// delta[zustandsIndex][zeichen] = Index des Folgezustands; akzeptierend = Indizes
// mit Doppelkreis. zustaende und kanten enthalten das fest verdrahtete Layout in
// Weltkoordinaten (0–10 × 0–7,2): pfad = Bezier-Stützpunkte (3 Punkte = quadratisch,
// 4 Punkte = kubisch), Anfangs- und Endpunkt liegen auf den Kreisen, die Pfeilspitze
// sitzt am Endpunkt; schleife = Selbstübergang als Bogen über dem Zustand.

const AUTOMATEN = [
  {
    name: "A1",
    beschreibung: "A1 akzeptiert genau die Wörter mit gerader Anzahl a.",
    start: 0,
    akzeptierend: [0],
    delta: [{ a: 1, b: 0 }, { a: 0, b: 1 }],
    zustaende: [{ id: "Z0", x: 3.4, y: 3.0 }, { id: "Z1", x: 6.6, y: 3.0 }],
    kanten: [
      { schleife: 0, zeichen: "b" },
      { schleife: 1, zeichen: "b" },
      { zeichen: "a", pfad: [[3.85, 3.32], [5.0, 3.82], [6.15, 3.32]], label: [5.0, 3.74], lage: "ueber" },
      { zeichen: "a", pfad: [[6.15, 2.68], [5.0, 2.18], [3.85, 2.68]], label: [5.0, 2.26], lage: "unter" }
    ]
  },
  {
    name: "A2",
    beschreibung: "A2 akzeptiert genau die Wörter, die auf ab enden.",
    start: 0,
    akzeptierend: [2],
    delta: [{ a: 1, b: 0 }, { a: 1, b: 2 }, { a: 1, b: 0 }],
    zustaende: [{ id: "Z0", x: 2.1, y: 3.0 }, { id: "Z1", x: 5.0, y: 3.0 }, { id: "Z2", x: 7.9, y: 3.0 }],
    kanten: [
      { schleife: 0, zeichen: "b" },
      { schleife: 1, zeichen: "a" },
      { zeichen: "a", pfad: [[2.55, 3.32], [3.55, 3.82], [4.55, 3.32]], label: [3.55, 3.74], lage: "ueber" },
      { zeichen: "b", pfad: [[5.45, 3.32], [6.45, 3.82], [7.45, 3.32]], label: [6.45, 3.74], lage: "ueber" },
      { zeichen: "a", pfad: [[7.45, 2.68], [6.45, 2.28], [5.45, 2.68]], label: [6.45, 2.34], lage: "unter" },
      { zeichen: "b", pfad: [[8.25, 2.58], [8.6, 1.55], [3.2, 1.55], [2.24, 2.47]], label: [5.65, 1.95], lage: "ueber" }
    ]
  },
  {
    name: "A3",
    beschreibung: "A3 akzeptiert genau die Wörter, die aa enthalten.",
    start: 0,
    akzeptierend: [2],
    delta: [{ a: 1, b: 0 }, { a: 2, b: 0 }, { a: 2, b: 2 }],
    zustaende: [{ id: "Z0", x: 2.1, y: 3.0 }, { id: "Z1", x: 5.0, y: 3.0 }, { id: "Z2", x: 7.9, y: 3.0 }],
    kanten: [
      { schleife: 0, zeichen: "b" },
      { schleife: 2, zeichen: "a, b" },
      { zeichen: "a", pfad: [[2.55, 3.32], [3.55, 3.82], [4.55, 3.32]], label: [3.55, 3.74], lage: "ueber" },
      { zeichen: "a", pfad: [[5.45, 3.32], [6.45, 3.82], [7.45, 3.32]], label: [6.45, 3.74], lage: "ueber" },
      { zeichen: "b", pfad: [[4.55, 2.68], [3.55, 2.2], [2.55, 2.68]], label: [3.55, 2.28], lage: "unter" }
    ]
  }
];

export const manifest = {
  id: "informatik/endlicher-automat",
  titel: "Endlicher Automat: Wörter prüfen",
  modus: "schrittweise",
  tMax: 1e6,
  raster: false,
  werkzeuge: false,
  welt: { xMin: 0, xMax: 10, yMin: 0, yMax: 7.2 },
  parameter: [
    { id: "automat", label: "Automat (1–3)",  einheit: "", min: 1, max: 3, schritt: 1, start: 1 },
    { id: "wort",    label: "Wort (Nr. 1–6)", einheit: "", min: 1, max: 6, schritt: 1, start: 1 }
  ],
  anzeigen: [
    { id: "position",   label: "gelesene Zeichen",    einheit: "", stellen: 0 },
    { id: "zustandNr",  label: "aktueller Zustand",   einheit: "", stellen: 0 },
    { id: "akzeptiert", label: "akzeptiert (1 = ja)", einheit: "", stellen: 0 }
  ],
  presets: [
    { name: "A1 prüft abab", werte: { automat: 1, wort: 1 } },
    { name: "A2 prüft bbab", werte: { automat: 2, wort: 3 } },
    { name: "A3 prüft aaa",  werte: { automat: 3, wort: 5 } }
  ],
  vorhersage: {
    frage: "Der Automat hat keinerlei Gedächtnis außer seinem Zustand — reicht das, um „endet auf ab“ zu erkennen?",
    optionen: ["Ja — drei Zustände genügen", "Nein — er müsste sich das ganze Wort merken", "Nur bei kurzen Wörtern"],
    aufloesung: "Ja, drei Zustände genügen: Der Zustand speichert genau das, worauf es für „endet auf ab“ ankommt — Z0 „zuletzt kein brauchbarer Anfang“, Z1 „zuletzt ein a“, Z2 „zuletzt ab“. Alles davor darf der Automat vergessen. Prüfe es mit Automat A2: Egal wie lang das Wort ist, der Zustand am Wortende entscheidet."
  },
  beobachtung: [
    "Verfolge das Wort abab durch Automat A1 (Preset „A1 prüft abab“) und führe Buch über die Zustände: Notiere vor jedem Klick auf „Weiter →“, wo der Automat steht, und prüfe deine Liste am Wortende.",
    "Finde unter den sechs Wörtern alle, die Automat A2 („endet auf ab“) akzeptiert. Triff erst für jedes Wort eine Vorhersage, dann teste sie.",
    "Warum kommt Automat A3 aus Z2 nie wieder heraus? Sieh dir die Pfeile an Z2 an (eine „Falle“) — und erkläre, warum das für „enthält aa“ genau richtig ist.",
    "Wie viele Zustände bräuchte ein Automat für „endet auf aab“? Überlege, was er sich über das zuletzt Gelesene merken muss."
  ],
  modellgrenzen: "Deterministischer endlicher Automat: pro Zustand und Zeichen genau ein Übergang, festes Alphabet {a, b}, feste Wortliste mit sechs Wörtern. Eigene Wörter und Automaten entwirfst du in den Übungsaufgaben zum Thema.",
  bilanz: {
    akzeptiert: { label: "akzeptiert (1 = ja)", einheit: "", stellen: 0 },
    position:   { label: "gelesene Zeichen",    einheit: "", stellen: 0 },
    zustandNr:  { label: "Endzustand (Nr.)",    einheit: "", stellen: 0 }
  }
};

// ---------- Schnittstelle zur Engine ----------

function automatVon(p) {
  const nr = Math.min(3, Math.max(1, Math.round(p.automat ?? 1)));
  return AUTOMATEN[nr - 1];
}

function wortVon(p) {
  const nr = Math.min(6, Math.max(1, Math.round(p.wort ?? 1)));
  return WOERTER[nr - 1];
}

export function init(p) {
  const a = automatVon(p);
  return {
    t: 0,                       // Schrittzähler für Engine und Messreihe
    position: 0,                // Anzahl bereits gelesener Zeichen
    aktuellerZustand: a.start,  // Index in zustaende/delta
    fertig: wortVon(p).length === 0
  };
}

// Ein Schritt = genau ein Zeichen konsumieren; fertig, wenn das Wort abgearbeitet ist
export function update(z, p) {
  if (z.fertig) return;
  const a = automatVon(p);
  const w = wortVon(p);
  z.aktuellerZustand = a.delta[z.aktuellerZustand][w[z.position]];
  z.position++;
  z.t++;
  if (z.position >= w.length) z.fertig = true;
}

// „akzeptiert“ zeigt während des Lesens: Wäre das Wort jetzt zu Ende — ja/nein?
// Verbindlich ist erst der Wert am Wortende.
export function messwerte(z, p) {
  const a = automatVon(p);
  return {
    position: z.position,
    zustandNr: z.aktuellerZustand,
    akzeptiert: a.akzeptierend.includes(z.aktuellerZustand) ? 1 : 0
  };
}

export function istFertig(z) { return z.fertig; }

export function bilanz(z, p) {
  const a = automatVon(p);
  return {
    akzeptiert: a.akzeptierend.includes(z.aktuellerZustand) ? 1 : 0,
    position: z.position,
    zustandNr: z.aktuellerZustand
  };
}

// ---------- Darstellung ----------

// Farbtoken lesen, die der Engine-Stil nicht enthält (läuft nur im Browser)
function leseToken(name, ersatz) {
  if (typeof document === "undefined") return ersatz;
  const wert = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return wert || ersatz;
}

// Gefüllte Pfeilspitze am Punkt (x, y) mit Ausrichtung winkel (Pixelkoordinaten)
function pfeilspitze(ctx, x, y, winkel, groesse, farbe) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(winkel);
  ctx.fillStyle = farbe;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-groesse, -groesse * 0.45);
  ctx.lineTo(-groesse, groesse * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Übergangspfeil entlang fester Bezier-Stützpunkte plus Zeichen-Beschriftung
function zeichneKante(ctx, welt, stil, kante, infoFarbe, basis) {
  const p = kante.pfad.map(([x, y]) => [welt.px(x), welt.py(y)]);
  ctx.strokeStyle = stil.text;
  ctx.lineWidth = Math.max(1.5, stil.linienstaerke);
  ctx.beginPath();
  ctx.moveTo(p[0][0], p[0][1]);
  if (p.length === 3) ctx.quadraticCurveTo(p[1][0], p[1][1], p[2][0], p[2][1]);
  else ctx.bezierCurveTo(p[1][0], p[1][1], p[2][0], p[2][1], p[3][0], p[3][1]);
  ctx.stroke();
  const ende = p[p.length - 1], vor = p[p.length - 2];
  pfeilspitze(ctx, ende[0], ende[1], Math.atan2(ende[1] - vor[1], ende[0] - vor[0]),
    4 + 2.5 * stil.linienstaerke, stil.text);
  ctx.fillStyle = infoFarbe;
  ctx.font = "italic bold " + (basis + 2) + "px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = kante.lage === "unter" ? "top" : "bottom";
  ctx.fillText(kante.zeichen, welt.px(kante.label[0]), welt.py(kante.label[1]));
}

// Selbstübergang: Schleife über dem Zustand, Pfeilspitze rechts oben am Kreis
function zeichneSchleife(ctx, welt, stil, zust, zeichen, infoFarbe, basis) {
  const k = [
    [zust.x - 0.34, zust.y + 0.43],
    [zust.x - 0.62, zust.y + 1.45],
    [zust.x + 0.62, zust.y + 1.45],
    [zust.x + 0.34, zust.y + 0.43]
  ].map(([x, y]) => [welt.px(x), welt.py(y)]);
  ctx.strokeStyle = stil.text;
  ctx.lineWidth = Math.max(1.5, stil.linienstaerke);
  ctx.beginPath();
  ctx.moveTo(k[0][0], k[0][1]);
  ctx.bezierCurveTo(k[1][0], k[1][1], k[2][0], k[2][1], k[3][0], k[3][1]);
  ctx.stroke();
  pfeilspitze(ctx, k[3][0], k[3][1], Math.atan2(k[3][1] - k[2][1], k[3][0] - k[2][0]),
    4 + 2.5 * stil.linienstaerke, stil.text);
  ctx.fillStyle = infoFarbe;
  ctx.font = "italic bold " + (basis + 2) + "px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText(zeichen, welt.px(zust.x), welt.py(zust.y + 1.32));
}

// Zustandskreis: Doppelkreis = akzeptierend, aktueller Zustand gefüllt (var(--info))
function zeichneZustand(ctx, welt, stil, zust, istAktuell, istAkzeptierend, infoFarbe, basis) {
  const x = welt.px(zust.x), y = welt.py(zust.y), r = welt.laenge(0.55);
  ctx.lineWidth = stil.linienstaerke + 0.5;
  ctx.fillStyle = istAktuell ? infoFarbe : stil.hauch;
  ctx.strokeStyle = infoFarbe;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();
  if (istAkzeptierend) {
    ctx.strokeStyle = istAktuell ? stil.flaeche : infoFarbe;
    ctx.lineWidth = Math.max(1.5, stil.linienstaerke - 0.5);
    ctx.beginPath();
    ctx.arc(x, y, r - Math.max(4, r * 0.18), 0, 2 * Math.PI);
    ctx.stroke();
  }
  ctx.fillStyle = istAktuell ? stil.flaeche : stil.text;
  ctx.font = "bold " + (basis + 2) + "px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(zust.id, x, y);
}

// Startpfeil von außen auf den Startzustand
function zeichneStartpfeil(ctx, welt, stil, zust, basis) {
  const y = welt.py(zust.y);
  const x1 = welt.px(zust.x - 1.7), x2 = welt.px(zust.x - 0.62);
  ctx.strokeStyle = stil.text;
  ctx.lineWidth = Math.max(1.5, stil.linienstaerke);
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  pfeilspitze(ctx, x2, y, 0, 4 + 2.5 * stil.linienstaerke, stil.text);
  ctx.fillStyle = stil.beschriftung;
  ctx.font = basis + "px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText("Start", welt.px(zust.x - 1.16), welt.py(zust.y + 0.12));
}

export function zeichne({ ctx, welt, zustand: z, werte: p, stil }) {
  const a = automatVon(p);
  const w = wortVon(p);
  const wortNr = Math.min(6, Math.max(1, Math.round(p.wort ?? 1)));
  const infoFarbe = leseToken("--info", stil.akzent);
  const basis = parseInt(stil.schrift, 10) || 12;
  const n = w.length;

  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // 1) Wortband oben: ein Kästchen je Zeichen, gelesene gefüllt, Lesekopf darunter
  const bandStart = 5 - (n - 0.15) / 2;
  ctx.fillStyle = stil.beschriftung;
  ctx.font = basis + "px sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillText("Wort " + formatZahl(wortNr, 0) + ":", welt.px(bandStart - 0.25), welt.py(6.4));
  for (let i = 0; i < n; i++) {
    const gelesen = i < z.position;
    ctx.fillStyle = gelesen ? infoFarbe : stil.hauch;
    ctx.strokeStyle = gelesen ? infoFarbe : stil.text;
    ctx.lineWidth = Math.max(1.5, stil.linienstaerke * 0.75);
    ctx.fillRect(welt.px(bandStart + i), welt.py(6.85), welt.laenge(0.85), welt.laenge(0.9));
    ctx.strokeRect(welt.px(bandStart + i), welt.py(6.85), welt.laenge(0.85), welt.laenge(0.9));
    ctx.fillStyle = gelesen ? stil.flaeche : stil.text;
    ctx.font = "bold " + (basis + 6) + "px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(w[i], welt.px(bandStart + i + 0.425), welt.py(6.4));
  }
  if (!z.fertig) {
    // Lesekopf-Pfeil zeigt auf das nächste zu lesende Zeichen
    const kx = welt.px(bandStart + z.position + 0.425);
    ctx.strokeStyle = stil.text;
    ctx.lineWidth = Math.max(1.5, stil.linienstaerke);
    ctx.beginPath();
    ctx.moveTo(kx, welt.py(5.45));
    ctx.lineTo(kx, welt.py(5.85));
    ctx.stroke();
    pfeilspitze(ctx, kx, welt.py(5.92), -Math.PI / 2, 4 + 2.5 * stil.linienstaerke, stil.text);
    ctx.fillStyle = stil.beschriftung;
    ctx.font = basis + "px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("Lesekopf", kx + welt.laenge(0.2), welt.py(5.62));
  }

  // 2) Zustandsgraf des gewählten Automaten
  zeichneStartpfeil(ctx, welt, stil, a.zustaende[a.start], basis);
  a.kanten.forEach(kante => {
    if (kante.schleife !== undefined) {
      zeichneSchleife(ctx, welt, stil, a.zustaende[kante.schleife], kante.zeichen, infoFarbe, basis);
    } else {
      zeichneKante(ctx, welt, stil, kante, infoFarbe, basis);
    }
  });
  a.zustaende.forEach((zust, i) => {
    zeichneZustand(ctx, welt, stil, zust, i === z.aktuellerZustand, a.akzeptierend.includes(i), infoFarbe, basis);
  });

  // 3) Beschreibung des Automaten als Satz
  ctx.fillStyle = stil.text;
  ctx.font = (basis + 1) + "px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(a.beschreibung, welt.px(5), welt.py(1.05));

  // 4) Statuszeile bzw. großes Endergebnis (Text + Symbol, nie nur Farbe)
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  if (z.fertig) {
    const ok = a.akzeptierend.includes(z.aktuellerZustand);
    ctx.fillStyle = ok ? stil.ok : stil.fehler;
    ctx.font = "bold " + (basis * 2) + "px sans-serif";
    ctx.fillText(ok ? "AKZEPTIERT ✓" : "ABGELEHNT ✗", welt.px(5), welt.py(0.3));
  } else {
    ctx.fillStyle = stil.text;
    ctx.font = "bold " + (basis + 1) + "px sans-serif";
    ctx.fillText(formatZahl(z.position, 0) + " von " + formatZahl(n, 0) + " Zeichen gelesen · Zustand "
      + a.zustaende[z.aktuellerZustand].id, welt.px(5), welt.py(0.3));
  }
  ctx.restore();
}

// ---------- Prüffälle ----------
// Von Hand am Zustandsdiagramm nachvollzogen (Zustandsfolge in Klammern):
//   A1, abab: Z0 -a→ Z1 -b→ Z1 -a→ Z0 -b→ Z0   → Ende Z0 (akzeptierend), 4 Zeichen
//   A1, aaa:  Z0 -a→ Z1 -a→ Z0 -a→ Z1          → Ende Z1 (nicht akzeptierend), 3 Zeichen
//   A2, bbab: Z0 -b→ Z0 -b→ Z0 -a→ Z1 -b→ Z2   → Ende Z2 (akzeptierend), 4 Zeichen
//   A3, abba: Z0 -a→ Z1 -b→ Z0 -b→ Z0 -a→ Z1   → Ende Z1 (nicht akzeptierend), 4 Zeichen

export const pruefFaelle = [
  {
    name: "A1 (gerade Anzahl a) akzeptiert abab",
    parameter: { automat: 1, wort: 1 },
    toleranzProzent: 0,
    soll: { akzeptiert: 1, position: 4 }
  },
  {
    name: "A1 lehnt aaa ab (drei a sind ungerade)",
    parameter: { automat: 1, wort: 5 },
    toleranzProzent: 0,
    soll: { akzeptiert: 0, position: 3 }
  },
  {
    name: "A2 (endet auf ab) akzeptiert bbab",
    parameter: { automat: 2, wort: 3 },
    toleranzProzent: 0,
    soll: { akzeptiert: 1, position: 4 }
  },
  {
    name: "A3 (enthält aa) lehnt abba ab",
    parameter: { automat: 3, wort: 6 },
    toleranzProzent: 0,
    soll: { akzeptiert: 0, position: 4 }
  }
];
