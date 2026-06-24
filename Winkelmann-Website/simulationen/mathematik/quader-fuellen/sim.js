// Quader füllen — die Volumenformel V = l · b · h zum Anfassen (Mathematik, Klasse 6).
// Ein Quader (l × b × h in cm) wird mit Einheitswürfeln (je 1 cm³) gefüllt.
// Ein Schritt legt genau EINE Reihe aus l Würfeln; der Reihen-Index idx bestimmt
// die Position: Schicht z = ⌊idx / b⌋, Reihe y = idx mod b. So wächst der Quader
// Reihe für Reihe und Schicht für Schicht — und am Ende steht die Formel.
// Darstellung: Kabinettprojektion (Schrägbild), hinten-nach-vorne gezeichnet (Painter).

import { formatZahl } from "../../../assets/js/sim/welt.js";

export const manifest = {
  id: "mathematik/quader-fuellen",
  titel: "Quader füllen: V = l · b · h",
  modus: "schrittweise",
  tMax: 1e6,
  raster: false,      // eigenes Schrägbild statt Meter-Karoraster
  werkzeuge: false,   // Lineal/Winkelmesser ergeben im Schrägbild keinen Sinn
  parameter: [
    { id: "l", label: "Länge l",  einheit: "cm", min: 1, max: 10, schritt: 1, start: 4 },
    { id: "b", label: "Breite b", einheit: "cm", min: 1, max: 8,  schritt: 1, start: 3 },
    { id: "h", label: "Höhe h",   einheit: "cm", min: 1, max: 6,  schritt: 1, start: 2 }
  ],
  anzeigen: [
    { id: "wuerfel", label: "Würfel bisher",    einheit: "", stellen: 0 },
    { id: "reihen",  label: "Reihen bisher",    einheit: "", stellen: 0 },
    { id: "schicht", label: "Aktuelle Schicht", einheit: "", stellen: 0 }
  ],
  presets: [
    { name: "Beispiel 4·3·2",       werte: { l: 4,  b: 3, h: 2 } },
    { name: "Würfel 5·5·5",         werte: { l: 5,  b: 5, h: 5 } },
    { name: "Lange Stange 10·1·1",  werte: { l: 10, b: 1, h: 1 } },
    { name: "Großer Quader 10·8·6", werte: { l: 10, b: 8, h: 6 } }
  ],
  vorhersage: {
    frage: "Die Höhe wird verdoppelt: Aus dem Quader 4·3·2 wird 4·3·4. Wie ändert sich die Anzahl der Würfel?",
    optionen: ["Sie verdoppelt sich", "Sie vervierfacht sich", "Sie bleibt gleich"],
    aufloesung: "Sie verdoppelt sich: 4·3·2 = 24 Würfel, 4·3·4 = 48 Würfel. Jede Schicht hat weiterhin l · b = 4 · 3 = 12 Würfel — die doppelte Höhe bedeutet einfach doppelt so viele Schichten. Das Volumen ist also proportional zur Höhe: V = l · b · h."
  },
  beobachtung: [
    "Zähle die Würfel einer fertigen Schicht. Wie hängt diese Zahl mit l · b zusammen?",
    "Finde drei verschieden geformte Quader, die aus genau 24 Würfeln bestehen. Tipp: Welche drei Zahlen ergeben malgenommen 24?",
    "Stelle die „lange Stange“ 10·1·1 ein und danach den Würfel 5·5·5. Welcher Körper besteht aus mehr Würfeln — obwohl seine Kanten kürzer sind?",
    "Beobachte die Anzeige „Würfel bisher“ beim Klicken auf „Weiter“: Um wie viel wächst sie bei jedem Schritt? Warum genau um diese Zahl?"
  ],
  modellgrenzen: "Nur ganzzahlige Kantenlängen — jeder Einheitswürfel ist 1 cm³ groß. Bei „krummen“ Längen wie 3,5 cm kann man die Würfel nicht mehr einfach zählen; dann braucht man die Formel V = l · b · h.",
  bilanz: {
    volumen:      { label: "Volumen V = l · b · h", einheit: "cm³", stellen: 0 },
    grundflaeche: { label: "Grundfläche l · b",     einheit: "cm²", stellen: 0 },
    schichten:    { label: "Schichten (= h)",       einheit: "",    stellen: 0 }
  }
};

// ---------- Modell ----------

function reihenGesamt(p) { return Math.round(p.b) * Math.round(p.h); }

export function init() {
  return { t: 0, gelegteReihen: 0 };
}

// Ein Schritt = eine Reihe aus l Würfeln legen (dt wird im Schrittmodus nicht gebraucht)
export function update(z, p) {
  if (z.gelegteReihen >= reihenGesamt(p)) return;
  z.gelegteReihen++;
  z.t++;
}

export function istFertig(z, p) { return z.gelegteReihen >= reihenGesamt(p); }

export function messwerte(z, p) {
  const l = Math.round(p.l), b = Math.round(p.b), h = Math.round(p.h);
  return {
    wuerfel: z.gelegteReihen * l,
    reihen: z.gelegteReihen,
    // Schicht, in der gerade gebaut wird (1-basiert); am Ende = h
    schicht: Math.min(h, Math.floor(z.gelegteReihen / b) + 1)
  };
}

// Bilanz nach dem Füllen. Das Volumen wird bewusst aus dem Zähl-Zustand abgeleitet
// (gelegte Reihen · l Würfel je Reihe) — so prüfen die Prüffälle wirklich den
// Füllprozess und nicht nur die Formel. Voll gefüllt gilt: b·h Reihen · l = l·b·h.
export function bilanz(z, p) {
  const l = Math.round(p.l), b = Math.round(p.b);
  return {
    volumen: z.gelegteReihen * l,              // in cm³ (1 Würfel = 1 cm³)
    grundflaeche: l * b,                       // in cm²
    schichten: Math.ceil(z.gelegteReihen / b)  // begonnene Schichten; voll = h
  };
}

// ---------- Darstellung: Kabinettprojektion ----------

const TIEFE_FAKTOR = 0.35;                 // Verkürzung der Tiefenkanten im Schrägbild
const KX = TIEFE_FAKTOR * Math.SQRT1_2;    // Tiefenversatz je cm: · cos 45°
const KY = TIEFE_FAKTOR * Math.SQRT1_2;    // Tiefenversatz je cm: · sin 45°
const FORMEL_BREITE = 7;                   // Platz rechts für den Formelblock (Welteinheiten)

// Projektion: Modellpunkt (x längs l, Szene-Tiefe s nach hinten, z Höhe) → Weltkoordinaten
function projX(x, s) { return x + KX * s; }
function projY(z, s) { return z + KY * s; }

export function weltBereich(p) {
  const l = Math.round(p.l), b = Math.round(p.b), h = Math.round(p.h);
  return {
    xMin: -0.4,
    xMax: l + KX * b + FORMEL_BREITE,
    yMin: -0.5,
    yMax: h + KY * b + 0.7
  };
}

function pfad(ctx, welt, punkte) {
  ctx.beginPath();
  punkte.forEach((pt, i) => {
    const X = welt.px(pt[0]), Y = welt.py(pt[1]);
    if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
  });
  ctx.closePath();
}

// Ziel-Quader als gestricheltes Drahtgitter (alle 12 Kanten), liegt hinter den Würfeln
function zeichneDrahtgitter(ctx, welt, l, b, h, stil) {
  const ecken = [[0, 0], [l, 0], [l, h], [0, h]];
  ctx.save();
  ctx.strokeStyle = stil.beschriftung;
  ctx.lineWidth = Math.max(1, stil.linienstaerke / 2);
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  [0, b].forEach(s => {                      // vorderes und hinteres Rechteck
    ecken.forEach((e, i) => {
      const X = welt.px(projX(e[0], s)), Y = welt.py(projY(e[1], s));
      if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
    });
    ctx.closePath();
  });
  ecken.forEach(e => {                       // vier Tiefenkanten
    ctx.moveTo(welt.px(projX(e[0], 0)), welt.py(projY(e[1], 0)));
    ctx.lineTo(welt.px(projX(e[0], b)), welt.py(projY(e[1], b)));
  });
  ctx.stroke();
  ctx.restore();
}

// Ein Einheitswürfel bei (x, s, z); s = Szene-Tiefe seiner Vorderseite (0 = ganz vorn).
// Drei sichtbare Flächen als Parallelogramm-Kacheln mit abgestufter Deckkraft
// (oben hell, rechts dunkel), Kanten in stil.text — so wirkt das Schrägbild plastisch.
function zeichneWuerfel(ctx, welt, x, s, z, fuellung, kante, staerke) {
  const flaechen = [
    { alpha: 0.5,  punkte: [[projX(x, s), projY(z + 1, s)], [projX(x + 1, s), projY(z + 1, s)], [projX(x + 1, s + 1), projY(z + 1, s + 1)], [projX(x, s + 1), projY(z + 1, s + 1)]] },
    { alpha: 1.0,  punkte: [[projX(x + 1, s), projY(z, s)], [projX(x + 1, s + 1), projY(z, s + 1)], [projX(x + 1, s + 1), projY(z + 1, s + 1)], [projX(x + 1, s), projY(z + 1, s)]] },
    { alpha: 0.78, punkte: [[projX(x, s), projY(z, s)], [projX(x + 1, s), projY(z, s)], [projX(x + 1, s), projY(z + 1, s)], [projX(x, s), projY(z + 1, s)]] }
  ];
  ctx.lineJoin = "round";
  ctx.lineWidth = staerke;
  ctx.strokeStyle = kante;
  ctx.fillStyle = fuellung;
  flaechen.forEach(f => {
    pfad(ctx, welt, f.punkte);
    ctx.globalAlpha = f.alpha;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.stroke();
  });
}

export function zeichne({ ctx, welt, zustand: z, werte: p, stil }) {
  const l = Math.round(p.l), b = Math.round(p.b), h = Math.round(p.h);
  const fertig = z.gelegteReihen >= b * h;
  const aktSchicht = Math.min(h, Math.floor(z.gelegteReihen / b) + 1); // 1-basiert
  const kantenStaerke = Math.max(1, stil.linienstaerke / 2);

  zeichneDrahtgitter(ctx, welt, l, b, h, stil);

  // Gefüllte Reihen hinten-nach-vorne zeichnen (Painter), je Reihe unten-nach-oben.
  // Modell-Reihe y = 0 liegt hinten an der Rückwand; neue Reihen kommen nach vorn.
  for (let y = 0; y < b; y++) {
    const s = b - 1 - y;                       // Szene-Tiefe der Reihe (0 = ganz vorn)
    for (let zz = 0; zz < h; zz++) {
      const idx = zz * b + y;                  // Reihen-Index: Schicht zz, Reihe y
      if (idx >= z.gelegteReihen) continue;    // Reihe noch nicht gelegt
      const istAktSchicht = !fertig && zz === aktSchicht - 1;  // aktuelle Schicht hervorheben
      const istLetzte = idx === z.gelegteReihen - 1;           // zuletzt gelegte Reihe betonen
      for (let x = 0; x < l; x++) {
        zeichneWuerfel(ctx, welt, x, s, zz,
          istAktSchicht ? stil.ok : stil.akzent, stil.text,
          istLetzte ? stil.linienstaerke : kantenStaerke);
      }
    }
  }

  // Formelblock rechts daneben — mit Live-Zahlen; Schriftgröße folgt dem Maßstab
  const basis = parseFloat(stil.schrift) || 12;
  const fontGr = Math.max(basis - 1, Math.min(22, welt.laenge(0.55)));
  const zeilenH = Math.round(fontGr * 1.4);
  const tx = welt.px(l + KX * b + 0.7);
  let ty = Math.max(fontGr + 8, Math.min(welt.py(welt.bereich.yMax) + fontGr, welt.hoehe - 5.5 * zeilenH - 8));
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = stil.text;
  ctx.font = "bold " + fontGr + "px sans-serif";
  ctx.fillText("V = l · b · h", tx, ty);
  ty += zeilenH;
  ctx.font = fontGr + "px sans-serif";
  ctx.fillText("V = " + formatZahl(l, 0) + " · " + formatZahl(b, 0) + " · " + formatZahl(h, 0), tx, ty);
  ty += zeilenH;
  ctx.font = "bold " + fontGr + "px sans-serif";
  ctx.fillText("V = " + formatZahl(l * b * h, 0) + " cm³", tx, ty);
  ty += Math.round(zeilenH * 1.4);
  ctx.font = fontGr + "px sans-serif";
  ctx.fillStyle = fertig ? stil.ok : stil.text;
  ctx.fillText("Würfel: " + formatZahl(z.gelegteReihen * l, 0) + " von " + formatZahl(l * b * h, 0), tx, ty);
  ty += zeilenH;
  ctx.fillText(fertig ? "Der Quader ist voll!" : "Schicht: " + formatZahl(aktSchicht, 0) + " von " + formatZahl(h, 0), tx, ty);
}

// ---------- Prüffälle ----------
// Soll-Werte analytisch: V = l·b·h, Grundfläche = l·b, Schichten = h.
// Die Ist-Werte entstehen durch echtes Reihen-Zählen im Headless-Lauf.

export const pruefFaelle = [
  {
    name: "Beispiel 4·3·2",
    parameter: { l: 4, b: 3, h: 2 },
    toleranzProzent: 0.1,
    soll: { volumen: 24, grundflaeche: 12, schichten: 2 }
  },
  {
    name: "Großer Quader 10·8·6",
    parameter: { l: 10, b: 8, h: 6 },
    toleranzProzent: 0.1,
    soll: { volumen: 480, grundflaeche: 80, schichten: 6 }
  },
  {
    name: "Stange 5·1·1",
    parameter: { l: 5, b: 1, h: 1 },
    toleranzProzent: 0.1,
    soll: { volumen: 5, grundflaeche: 5, schichten: 1 }
  }
];
